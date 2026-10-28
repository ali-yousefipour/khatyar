<?php
// Exercise the REAL presence cron handler with an isolated in-memory database.
class Http {static function error($message,$code=400){throw new RuntimeException($message,$code);}}
class Db {
  static $rows=[];static $notices=[];static $scheduleCalls=0;
  static function one($sql,$params=[]){
    if(str_contains($sql,"'cron_key'"))return ['value'=>'"test-secret"'];
    if(str_contains($sql,"'presence_check'"))return ['value'=>'{"enabled":true,"server_push":true,"random_enabled":true,"window_minutes":2}'];
    if(str_contains($sql,'FROM notifications')) {
      foreach(self::$notices as $n)if($n['uid']===$params[0]&&str_contains($n['data'],trim((string)$params[1],'%')))return ['id'=>1];
      return null;
    }
    return null;
  }
  static function all($sql,$params=[]){if(str_contains($sql,'FROM staff_attendance sa'))return self::$rows;return [];}
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
