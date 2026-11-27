<?php
class Http {
  static function error($message, $status) { throw new RuntimeException($message, $status); }
}
class Db {
  static $existing = null;
  static $writes = [];
  static $failWrite = false;
  static $sessionActive = true;
  static $randomDailyCount = 0;
  static function one($query, $params=[]) {
    if(str_contains($query,'information_schema.COLUMNS'))return ['COLUMN_NAME'=>$params[0]??'selfie_path'];
    if(str_contains($query,'GET_LOCK('))return ['acquired'=>1];
    if(str_contains($query,'RELEASE_LOCK('))return ['released'=>1];
    if(str_contains($query,'FROM app_settings'))return ['value'=>json_encode(['enabled'=>true,'random_enabled'=>false,'slots'=>[$GLOBALS['testSlot']],'window_minutes'=>3])];
    if(str_contains($query,'LEFT(request_id,6)'))return ['n'=>self::$randomDailyCount];
    if(str_contains($query,'FROM staff_attendance'))return self::$sessionActive
      ?['id'=>31,'check_in'=>isset($GLOBALS['randomSessionStart'])?(new DateTimeImmutable('@'.$GLOBALS['randomSessionStart']))->setTimezone(new DateTimeZone('Asia/Tehran'))->format('Y-m-d H:i:s'):null,'check_out'=>null]:null;
    if(str_contains($query,'FROM presence_checks')&&isset(self::$existing['request_id'])&&self::$existing['request_id']!==($params[1]??''))return null;
    return self::$existing;
  }
  static function all($query, $params=[]) {
    if(str_contains($query,'information_schema.COLUMNS'))return [
      ['COLUMN_NAME'=>'id'],['COLUMN_NAME'=>'selfie_path'],['COLUMN_NAME'=>'vehicles_photo_path'],['COLUMN_NAME'=>'request_id']
    ];
    return [];
  }
  static function run($query, $params) { if(self::$failWrite)throw new RuntimeException('database offline');self::$writes[] = $params; }
  static function insert($query, $params) { if(self::$failWrite)throw new RuntimeException('database offline');self::$writes[] = $params; return 12; }
}
class Media {
  static $results = [];
  static $deleted = [];
  static function saveBase64($data, $type, $width, $quality) { return array_shift(self::$results); }
  static function delete($path) { self::$deleted[] = $path; }
}

require_once __DIR__.'/../lib/PresenceChallengeGuard.php';
$source = file_get_contents(__DIR__.'/../lib/routes.php');
$schemaStart = strpos($source, 'function _presence_photo_columns_ready()');
$schemaEnd = strpos($source, '// ثبت صحت‌سنجی: سلفی + عکس خودروها + موقعیت', $schemaStart);
if($schemaStart===false || $schemaEnd===false)throw new RuntimeException('Photo schema preflight missing');
eval(substr($source,$schemaStart,$schemaEnd-$schemaStart));
$start = strpos($source, "route('POST', '/api/my/presence-check', ");
if ($start === false) throw new RuntimeException('Presence route not found');
$start += strlen("route('POST', '/api/my/presence-check', ");
$end = strpos($source, "\n});", $start);
if ($end === false) throw new RuntimeException('Presence route end not found');
$handler = eval('return '.substr($source, $start, $end - $start)."\n};");
$capturedTs=time()-40;
$day=(new DateTimeImmutable('@'.$capturedTs))->setTimezone(new DateTimeZone('Asia/Tehran'))->format('Y-m-d');
$GLOBALS['testSlot']=(new DateTimeImmutable('@'.$capturedTs))->setTimezone(new DateTimeZone('Asia/Tehran'))->format('H:i');
$body=['slot'=>$GLOBALS['testSlot'],'request_id'=>$day.'_'.$GLOBALS['testSlot'],
 'captured_at'=>date('c',$capturedTs),'selfie'=>'data:image/jpeg;base64,selfie',
 'vehicles_photo'=>'data:image/jpeg;base64,vehicles'];

foreach ([null, ['id'=>7]] as $existing) {
  foreach ([[null, 'vehicles.jpg'], ['selfie.jpg', null], [null, null], ['selfie.jpg', 'vehicles.jpg']] as $results) {
    Db::$existing = $existing;
    Db::$writes = [];
    Db::$failWrite = false;
    Media::$results = $results;
    Media::$deleted = [];
    $success = $results[0] !== null && $results[1] !== null;
    try {
      $response = $handler([], $body, ['id'=>1]);
      if (!$success || !$response['ok'] || count(Db::$writes) !== 1) throw new LogicException('Unexpected success or missing database write');
      if ($response['id'] !== ($existing ? 7 : 12)) throw new LogicException('Wrong record id');
    } catch (RuntimeException $error) {
      if ($success || $error->getCode() !== 503 || Db::$writes !== []) throw $error;
      $expected = $results[0] ? array_values(array_filter($results)) : [];
      if (Media::$deleted !== $expected) throw new LogicException('Partially saved photos were not cleaned up');
    }
  }
}
// Failed INSERT/UPDATE must clean *both* new files and leave the old row intact.
foreach ([null,['id'=>7]] as $existing) {
  Db::$existing=$existing;Db::$failWrite=true;Db::$writes=[];
  Media::$results=['selfie-retry.jpg','vehicles-retry.jpg'];Media::$deleted=[];
  try {
    $handler([], $body, ['id'=>1]);
    throw new LogicException('Database write failure accepted');
  }catch(RuntimeException $error){
    if($error->getCode()!==503)throw $error;
    if(Media::$deleted!==['selfie-retry.jpg','vehicles-retry.jpg'])throw new LogicException('Both uploaded photos must be cleaned after DB failure');
    if(Db::$writes!==[])throw new LogicException('Failed write should not be acknowledged');
  }
}
Db::$failWrite=false;
Db::$existing=['id'=>7,'request_id'=>$body['request_id'],
 'selfie_path'=>'existing-selfie.jpg','vehicles_photo_path'=>'existing-vehicles.jpg'];
Db::$writes=[];Media::$deleted=[];Media::$results=['unused-selfie.jpg','unused-vehicles.jpg'];
$duplicate=$handler([],$body,['id'=>1]);
if(empty($duplicate['duplicate'])||(int)$duplicate['id']!==7||
   Db::$writes!==[]||Media::$deleted!==[]||count(Media::$results)!==2)
    throw new LogicException('Idempotent retry changed an existing verified image record');
Db::$existing=['id'=>7,'request_id'=>'another-immediate-request',
 'selfie_path'=>'other-selfie.jpg','vehicles_photo_path'=>'other-vehicles.jpg'];
Db::$writes=[];Media::$deleted=[];Media::$results=['new-selfie.jpg','new-vehicles.jpg'];
$other=$handler([],$body,['id'=>1]);
if(empty($other['ok'])||!empty($other['duplicate'])||(int)$other['id']!==12||
   count(Db::$writes)!==1)throw new LogicException('Distinct challenges in the same slot were merged');
Db::$existing=null;Db::$writes=[];
Db::$sessionActive=false;
Media::$results=['selfie.jpg','vehicles.jpg'];Media::$deleted=[];Db::$writes=[];
try {
  $handler([], $body, ['id'=>1]);
  throw new LogicException('Presence without attendance was accepted');
}catch(RuntimeException $error){
  if($error->getCode()!==422 || Db::$writes!==[] || Media::$deleted!==[])
    throw $error;
}
Db::$sessionActive=true;
$randomStart=time()-3600;
$randomAt=time()-95;
$GLOBALS['randomSessionStart']=$randomStart;
$randomTime=(new DateTimeImmutable('@'.$randomAt))->setTimezone(new DateTimeZone('Asia/Tehran'))->format('H:i');
$randomBody=[...$body,'slot'=>$randomTime,'request_id'=>'local_1_'.$randomStart.'_'.$randomAt,'random'=>true];
Db::$randomDailyCount=6;Db::$writes=[];Media::$deleted=[];Media::$results=['random-1.jpg','random-2.jpg'];
try{
  $handler([],$randomBody,['id'=>1]);
  throw new LogicException('Seventh random challenge accepted in the same day');
}catch(RuntimeException $error){
  if($error->getCode()!==422||Db::$writes!==[]||Media::$deleted!==[]||count(Media::$results)!==2)
    throw $error;
}
Db::$randomDailyCount=0;
echo "PASS random presence six-per-day cap enforced before storing images\\n";
echo "PASS presence insert/update: both photos required, failed saves rejected, partial files cleaned up\n";
