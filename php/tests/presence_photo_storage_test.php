<?php
class Http {
  static function error($message, $status) { throw new RuntimeException($message, $status); }
}
class Db {
  static $existing = null;
  static $writes = [];
  static $failWrite = false;
  static function one($query, $params=[]) {
    if(str_contains($query,'information_schema.COLUMNS'))return ['COLUMN_NAME'=>$params[0]??'selfie_path'];
    return self::$existing;
  }
  static function all($query, $params=[]) {
    if(str_contains($query,'information_schema.COLUMNS'))return [
      ['COLUMN_NAME'=>'id'],['COLUMN_NAME'=>'selfie_path'],['COLUMN_NAME'=>'vehicles_photo_path']
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
$body = ['slot'=>'10:30', 'selfie'=>'data:image/jpeg;base64,selfie', 'vehicles_photo'=>'data:image/jpeg;base64,vehicles'];

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
echo "PASS presence insert/update: both photos required, failed saves rejected, partial files cleaned up\n";
