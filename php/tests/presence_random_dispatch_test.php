<?php
// Exercise the REAL presence cron handler with an isolated in-memory database.
class Http {static function error($message,$code=400){throw new RuntimeException($message,$code);}}
class Db {
  static $rows=[];static $notices=[];static $scheduleCalls=0;
  static $fences=[];static $sentChecks=[];static $immediate=[];
  static function one($sql,$params=[]){
    if(str_contains($sql,'FROM geofences'))return ['n'=>count(array_filter(self::$fences,fn($g)=>in_array($g['line_id']??0,$params,true)))];
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
    if(str_contains($sql,'SELECT id,data,created_at FROM notifications')){
      if($params[0]!==21)throw new RuntimeException('History must be scoped to recipient');
      return $GLOBALS['historyNotifications'];
    }
    if(str_contains($sql,'FROM presence_checks') && str_contains($sql,'captured_at')){
      if($params[0]!==21)throw new RuntimeException('Completions must be scoped to recipient');
      return $GLOBALS['historyChecks'];
    }
    if(str_contains($sql,'SELECT data,created_at FROM notifications')){
      if($params[0]!==21)throw new RuntimeException('Immediate requests must be scoped to recipient');
      return self::$immediate;
    }
    if(str_contains($sql,'FROM staff_attendance sa'))return self::$rows;
    if(str_contains($sql,'FROM user_lines'))return [['line_id'=>1]];
    if(str_contains($sql,'FROM geofences'))return str_contains($sql,'WHERE line_id IN')?array_values(array_filter(self::$fences,fn($g)=>in_array($g['line_id']??0,$params,true))):self::$fences;
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
const PRESENCE_RANDOM_DAILY_LIMIT=6;
function _presence_random_limited_schedule($items){return array_slice($items,0,PRESENCE_RANDOM_DAILY_LIMIT);}
function _presence_random_daily_sent_count($uid){return count(array_filter(Db::$notices,static fn($n)=>$n['uid']===$uid));}
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
assertPresence($r['ok']===true&&$r['sent']===0,'Random cron must not send server notifications');
assertPresence(Db::$scheduleCalls===0,'Cron must not generate random schedules');
assertPresence(count(Db::$notices)===0,'Random notifications are local only');
$r=$GLOBALS['presenceCron']([],[],null);
assertPresence($r['sent']===0,'Cron retry must not resend the same request');
assertPresence(count(Db::$notices)===0,'Server must never send random notifications');
echo "PASS presence random cron disabled: device owns the schedule\n";

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
Db::$fences=[['id'=>1,'line_id'=>1,'type'=>'circle','center_lat'=>$lat,'center_lng'=>$lng,'radius_m'=>100,'polygon'=>null]];
_presence_outside_lines_bale_alert(1,21,$lat,$lng,'12:00');
_presence_outside_lines_bale_alert(2,21,$lat+149/111195,$lng,'12:00');
assertPresence(BaleBot::$messages===[],'Circle inside or 49 m outside must not notify');
_presence_outside_lines_bale_alert(3,21,$lat+151/111195,$lng,'12:00');
assertPresence(BaleBot::$messages===[],'Leaving one station radius alone must not falsely notify management');
Db::$fences[]=['id'=>2,'line_id'=>2,'type'=>'circle','center_lat'=>$lat+400/111195,'center_lng'=>$lng,'radius_m'=>100,'polygon'=>null];
_presence_outside_lines_bale_alert(3,21,$lat+400/111195,$lng,'12:00');
_presence_outside_lines_bale_alert(3,21,$lat+400/111195,$lng,'12:00');
assertPresence(count(BaleBot::$messages)===1 && str_contains(BaleBot::$messages[0],'خیابان آزمون') && str_contains(BaleBot::$messages[0],'google.com/maps'),'A confirmed different line must notify once with street and map');
Db::$fences=[['id'=>3,'line_id'=>1,'type'=>'polygon','center_lat'=>null,'center_lng'=>null,'radius_m'=>null,
  'polygon'=>json_encode([[$lat,$lng],[$lat,$lng+.002],[$lat+.002,$lng+.002],[$lat+.002,$lng]])]];
_presence_outside_lines_bale_alert(4,21,$lat-.00044,$lng+.001,'12:00');
assertPresence(count(BaleBot::$messages)===1,'Polygon within 50 m of its edge must not notify');
$streetUnavailable=true;
_presence_outside_lines_bale_alert(5,21,$lat-.00046,$lng+.001,'12:00');
assertPresence(count(BaleBot::$messages)===1,'Outside a polygon without proof of a different line must not notify');
Db::$fences[]=['id'=>4,'line_id'=>2,'type'=>'circle','center_lat'=>$lat-.004,'center_lng'=>$lng+.001,'radius_m'=>100,'polygon'=>null];
_presence_outside_lines_bale_alert(6,21,$lat-.004,$lng+.001,'12:00');
assertPresence(count(BaleBot::$messages)===2 && !str_contains(BaleBot::$messages[1],'خیابان') && str_contains(BaleBot::$messages[1],'google.com/maps'),'Confirmed other-line alert still works without street lookup');
echo "PASS Bale geofence tolerance, street text, fallback and duplicate suppression\n";

$a=strpos($source,"route('GET', '/api/my/presence-config', ");
$b=strpos($source,"\n});",$a);
eval(substr($source,$a,$b-$a+4));
$now=time();
foreach (['expired'=>$now-61,'active'=>$now-10] as $id=>$ts) {
  Db::$immediate[]=['data'=>json_encode(['type'=>'presence_check','immediate'=>true,'request_id'=>$id,'ts'=>$ts]),'created_at'=>date('Y-m-d H:i:s',$ts)];
}
$config=$presenceCron([],[],['id'=>21]);
assertPresence(!$config['required'] && array_column($config['immediate_requests'],'request_id')===['active'],
  'An off-shift recipient must get the active immediate request only');
echo "PASS off-shift immediate request recovery and expiry\n";

$a=strpos($source,"route('GET', '/api/my/presence-checks/today', ");
$b=strpos($source,"\n});",$a);
eval(substr($source,$a,$b-$a+4));
$historyNotifications=[];
foreach([['done','12:00',$now-120],['missed','11:00',$now-120],['pending','12:01',$now]] as [$id,$slot,$ts]){
  $historyNotifications[]=['id'=>$id,'data'=>json_encode(['type'=>'presence_check','slot'=>$slot,'request_id'=>$id,'ts'=>$ts]),'created_at'=>date('Y-m-d H:i:s',$ts)];
}
$historyChecks=[['slot'=>'12:00','captured_at'=>date('Y-m-d H:i:s',$now-110)]];
$history=$presenceCron([],[],['id'=>21]);
assertPresence(array_column($history['items'],'status')===['done','missed','pending'],'Today history must distinguish completed, missed and active requests: '.json_encode($history['items']));
echo "PASS today presence history statuses\n";
$historyNotifications=[
 ['id'=>1,'data'=>json_encode(['type'=>'presence_check','slot'=>'12:30','request_id'=>'imm-a','ts'=>$now-120]),'created_at'=>date('Y-m-d H:i:s',$now-120)],
 ['id'=>2,'data'=>json_encode(['type'=>'presence_check','slot'=>'12:30','request_id'=>'imm-b','ts'=>$now-120]),'created_at'=>date('Y-m-d H:i:s',$now-120)]
];
$historyChecks=[['slot'=>'12:30','request_id'=>'imm-a','captured_at'=>date('Y-m-d H:i:s',$now-110)]];
$separate=$presenceCron([],[],['id'=>21]);
$statuses=array_column($separate['items'],'status','id');
assertPresence(($statuses['imm-a']??'')==='done'&&($statuses['imm-b']??'')==='missed',
 'A single photo from one immediate challenge must not complete a different same-minute challenge');
echo "PASS presence request identity keeps two immediate checks in one slot independent\n";
$historyChecks=[['slot'=>'12:30','captured_at'=>date('Y-m-d H:i:s',$now-110)]];
$ambiguous=$presenceCron([],[],['id'=>21]);
assertPresence(!in_array('done',array_column($ambiguous['items'],'status'),true),
 'A legacy slot-only photo must not be assigned to one of two simultaneous challenges');
echo "PASS ambiguous legacy same-slot photos are not falsely attributed\n";
