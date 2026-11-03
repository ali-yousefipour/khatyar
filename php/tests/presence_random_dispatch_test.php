<?php
// Exercise the REAL presence cron handler with an isolated in-memory database.
class Http {static function error($message,$code=400){throw new RuntimeException($message,$code);}}
class Db {
  static $rows=[];static $notices=[];static $scheduleCalls=0;
  static $fences=[];static $sentChecks=[];
  static function one($sql,$params=[]){
    if(str_contains($sql,'FROM geofences'))return ['n'=>count(self::$fences)];
    if(str_contains($sql,'SELECT first_name,last_name'))return ['first_name'=>'کاربر','last_name'=>'آزمون'];
    if(str_contains($sql,"'cron_key'"))return ['value'=>'"test-secret"'];
    if(str_contains($sql,"'presence_check'"))return ['value'=>'{"enabled":true,"server_push":true,"random_enabled":true,"window_minutes":2}'];
    if(str_contains($sql,'FROM notifications')) {
      foreach(self::$notices as $n)if($n['uid']===$params[0]&&str_contains($n['data'],trim((string)$params[1],'%')))return ['id'=>1];
      return null;
    }
    return null;
  }
  static function all($sql,$params=[]){
    if(str_contains($sql,'FROM staff_attendance sa'))return self::$rows;
    if(str_contains($sql,'FROM user_lines'))return [['line_id'=>1]];
    if(str_contains($sql,'FROM geofences'))return self::$fences;
    if(str_contains($sql,'JOIN roles'))return [['id'=>9]];
    return [];
  }
  static function run($sql,$params=[]){}
  static function exec($sql,$params=[]){
    if(isset(self::$sentChecks[$params[0]]))return 0;
    self::$sentChecks[$params[0]]=true;
    return 1;
  }
}
class Push {
  static function notify($ids,$title,$body,$data){
    foreach($ids as $uid)Db::$notices[]=['uid'=>$uid,'data'=>json_encode($data,JSON_UNESCAPED_UNICODE),'id'=>$data['request_id']??null];
  }
}
function _presence_random_schedule_enabled($c){return !empty($c['enabled'])&&!empty($c['random_enabled']);}
function _ensure_presence_random_schedule_schema(){}
function _presence_today_jdate(){return '1405-08-06';}
function _presence_is_required_for_user($uid,$cfg,$required,$jdate=null,$ts=null){return $required;}
function _presence_random_schedule_for_attendance($uid,$id,$checkin,$cfg){
  Db::$scheduleCalls++;
  return [['ts'=>time()-15,'slot'=>date('H:i'),'window_minutes'=>2]];
}
function route($m,$p,$fn,...$options){$GLOBALS['presenceCron']=$fn;}
function assertPresence($condition,$reason){if(!$condition)throw new RuntimeException($reason);}
$source=file_get_contents(__DIR__.'/../lib/routes.php');
$a=strpos($source,"route('GET', '/api/cron/presence-alert', ");
$b=strpos($source,"\n}, true);",$a);
if($a===false||$b===false)throw new RuntimeException('Cron handler missing');
eval(substr($source,$a,$b-$a+strlen("\n}, true);")));
$_GET=['key'=>'test-secret'];
$now=time();
Db::$rows=[
 ['user_id'=>21,'attendance_id'=>100,'check_in'=>date('Y-m-d H:i:s',$now-3600),
  'schedule_json'=>json_encode([
    ['ts'=>$now-40,'slot'=>date('H:i',$now-40),'window_minutes'=>2],
    ['ts'=>$now-20,'slot'=>date('H:i',$now-20),'window_minutes'=>2]
  ])],
 ['user_id'=>22,'attendance_id'=>101,'check_in'=>date('Y-m-d H:i:s',$now-3600),'schedule_json'=>null],
];
$r=$GLOBALS['presenceCron']([],[],null);
assertPresence($r['ok']===true&&$r['sent']===3,'Each scheduled request and newly initialized user must receive a notification');
assertPresence(Db::$scheduleCalls===1,'Cron generates missing schedules for a checked-in user');
assertPresence(count(array_unique(array_column(Db::$notices,'id')))==3,'Each request has its own stable ID');
$r=$GLOBALS['presenceCron']([],[],null);
assertPresence($r['sent']===0,'Cron retry must not resend the same request');
assertPresence(count(Db::$notices)===3,'Duplicate notifications were generated');
echo "PASS presence random cron: server-side generation, distinct per-slot requests, idempotent retries\n";

// Use real circle/polygon geometry and intercept Bale delivery and geocoding.
class BaleBot {
  static $messages=[];
  static function sendToUserIds($ids,$title,$body,$item,$data){self::$messages[]=$body;}
}
function presence_reverse_geocode($lat,$lng){
  if ($GLOBALS['streetUnavailable']??false) throw new RuntimeException('offline geocoder');
  return ['street'=>'خیابان آزمون'];
}
$a=strpos($source,'function _presence_outside_lines_bale_alert(');
$b=strpos($source,"route('POST', '/api/my/presence-check'",$a);
eval(substr($source,$a,$b-$a));
$a=strpos($source,'function _haversine_m(');
$b=strpos($source,'function _nearest_station(',$a);
eval(substr($source,$a,$b-$a));
$lat=36.0; $lng=59.0;
Db::$fences=[['type'=>'circle','center_lat'=>$lat,'center_lng'=>$lng,'radius_m'=>100,'polygon'=>null]];
_presence_outside_lines_bale_alert(1,21,$lat,$lng,'12:00');
_presence_outside_lines_bale_alert(2,21,$lat+149/111195,$lng,'12:00');
assertPresence(BaleBot::$messages===[],'Circle inside or 49 m outside must not notify');
_presence_outside_lines_bale_alert(3,21,$lat+151/111195,$lng,'12:00');
_presence_outside_lines_bale_alert(3,21,$lat+151/111195,$lng,'12:00');
assertPresence(count(BaleBot::$messages)===1 && str_contains(BaleBot::$messages[0],'خیابان آزمون') && str_contains(BaleBot::$messages[0],'google.com/maps'),'Outside circle must notify once with street and map');
Db::$fences=[['type'=>'polygon','center_lat'=>null,'center_lng'=>null,'radius_m'=>null,
  'polygon'=>json_encode([[$lat,$lng],[$lat,$lng+.002],[$lat+.002,$lng+.002],[$lat+.002,$lng]])]];
_presence_outside_lines_bale_alert(4,21,$lat-.00044,$lng+.001,'12:00');
assertPresence(count(BaleBot::$messages)===1,'Polygon within 50 m of its edge must not notify');
$streetUnavailable=true;
_presence_outside_lines_bale_alert(5,21,$lat-.00046,$lng+.001,'12:00');
assertPresence(count(BaleBot::$messages)===2 && !str_contains(BaleBot::$messages[1],'خیابان') && str_contains(BaleBot::$messages[1],'google.com/maps'),'Outside polygon still notifies when street lookup fails');
echo "PASS Bale geofence tolerance, street text, fallback and duplicate suppression\n";
