<?php
class Http {static function error($message,$code=400){throw new RuntimeException($message,$code);}}
class Db {
  static $insert=[];
  static function pdo(){return new class {function beginTransaction(){} function commit(){} function inTransaction(){return false;} function rollBack(){}};}
  static function one($sql,$args=[]){
    if(strpos($sql,'leave_requires_substitute')!==false)return ['leave_requires_substitute'=>$GLOBALS['regionRequired']??0,'role_level'=>$GLOBALS['roleLevel']??7,'can_be_substitute'=>$GLOBALS['canBeSubstitute']??0];
    return ['Field'=>'substitute_user_id'];
  }
  static function all($sql,$args=[]){if(str_contains($sql,'FROM staff_attendance'))return [];if(str_contains($sql,'FROM users u LEFT JOIN roles'))return [['id'=>7,'name'=>'جایگزین'],['id'=>12,'name'=>'درخواست‌کننده']];throw new LogicException('Unexpected read: '.$sql);}
  static function run($sql,$args=[]){}
  static function insert($sql,$args=[]){self::$insert=$args;return 1;}
}
require_once __DIR__.'/../lib/LeaveSubstituteCoverage.php';
class Push {static function send(...$args){} static function notify(...$args){}}
function _ensure_requests_table(){}
function _manual_provisional_schema(){}
function _manual_provisional_apply($body,$requestId,$userId){return null;}
function _req_policy_options($uid,$required=true){return ['leave_require_substitute'=>$GLOBALS['requireSub']??true];}
function _zone_leave_requirement_storage(){}
function _req_approver($uid){return 99;}
function _leave_blocked_in_range($from,$to){return null;}
function _substitute_availability($id,$from,$to){$GLOBALS['checked_sub']=$id;return ['available'=>true];}
function _req_policy_date($date){return new DateTimeImmutable('2026-10-22',new DateTimeZone('Asia/Tehran'));}
function j_to_ts($date){return strtotime('2026-10-22');}
function route($method,$path,$fn,...$options){$GLOBALS['submit']=$fn;}
function check($ok,$message){if(!$ok)throw new LogicException($message);}
$source=file_get_contents(__DIR__.'/../lib/routes.php');
$a=strpos($source,'function _req_leave_substitute_required(');$b=strpos($source,'function _req_policy_date(',$a);eval(substr($source,$a,$b-$a));
$a=strpos($source,'function _req_substitute_eligible(');$b=strpos($source,'function _req_apply_approval_effects(',$a);eval(substr($source,$a,$b-$a));
$a=strpos($source,'function _req_reject_attendance_overlap(');$b=strpos($source,'function _req_reject_overlap(',$a);eval(substr($source,$a,$b-$a));
$a=strpos($source,"route('POST', '/api/my/requests'");$b=strpos($source,"route('GET', '/api/my/requests'",$a);eval(substr($source,$a,$b-$a));
foreach(range(1,6) as $level){
  $GLOBALS['roleLevel']=$level;
  $GLOBALS['regionRequired']=1;
  check(!_req_leave_substitute_required(12),'level '.$level.' must be exempt even in a required region');
  $GLOBALS['submit']([],['type'=>'annual','unit'=>'daily','from_jdate'=>'1405-07-30','to_jdate'=>'1405-07-30'],['id'=>12]);
  check(Db::$insert[17]===null,'level '.$level.' must submit daily annual leave without a substitute');
}
$GLOBALS['roleLevel']=7;
$GLOBALS['canBeSubstitute']=1;
check(!_req_leave_substitute_required(12),'designated substitute exempt in required region');
$GLOBALS['submit']([],['type'=>'annual','unit'=>'daily','from_jdate'=>'1405-07-30','to_jdate'=>'1405-07-30'],['id'=>12]);
check(Db::$insert[17]===null,'designated substitute may submit without replacement');
$GLOBALS['canBeSubstitute']=0;
check(_req_leave_substitute_required(12),'level 7 must follow the required region');
foreach(['annual','sick','mission','overtime','manual'] as $type)foreach(['daily','hourly'] as $unit){
  $GLOBALS['regionRequired']=1;
  $body=['type'=>$type,'unit'=>$unit,'from_jdate'=>'1405-07-30','to_jdate'=>'1405-07-30','the_date'=>'1405-07-30','from_time'=>'06:00','to_time'=>'08:00','in_time'=>'06:00','out_time'=>'08:00'];
  if($type==='annual'&&$unit==='daily'){
    try{$GLOBALS['submit']([],$body,['id'=>12]);throw new LogicException('daily annual leave accepted without required substitute');}catch(RuntimeException $e){check($e->getCode()===422,'expected required-substitute error');}
    $body['substitute_user_id']=7;$GLOBALS['checked_sub']=null;$GLOBALS['submit']([],$body,['id'=>12]);
    check(Db::$insert[17]===7&&$GLOBALS['checked_sub']===7,'daily annual substitute is stored and checked');
  }else{
    $GLOBALS['checked_sub']=null;$GLOBALS['submit']([],$body,['id'=>12]);check(Db::$insert[17]===null,'unrelated request does not require substitute: '.$type.'/'.$unit);
    $body['substitute_user_id']=7;$GLOBALS['submit']([],$body,['id'=>12]);check(Db::$insert[17]===null&&$GLOBALS['checked_sub']===null,'legacy extra substitute ignored: '.$type.'/'.$unit);
  }
}
// No region flag means no mandatory replacement, regardless of old policy or staff role.
$GLOBALS['regionRequired']=0;
$GLOBALS['requireSub']=true;
$GLOBALS['submit']([],['type'=>'annual','unit'=>'daily','from_jdate'=>'1405-07-30','to_jdate'=>'1405-07-30'],['id'=>12]);
check(Db::$insert[17]===null,'disabled region does not require replacement');
$GLOBALS['regionRequired']=1;
$GLOBALS['requireSub']=false;
try{$GLOBALS['submit']([],['type'=>'annual','unit'=>'daily','from_jdate'=>'1405-07-30','to_jdate'=>'1405-07-30'],['id'=>12]);throw new LogicException('enabled region accepted without replacement');}
catch(RuntimeException $e){check($e->getCode()===422,'enabled region requires replacement regardless of old policy');}
$GLOBALS['regionRequired']=0;
$GLOBALS['submit']([],['type'=>'annual','unit'=>'daily','from_jdate'=>'1405-07-30','to_jdate'=>'1405-07-30'],['id'=>12]);
check(Db::$insert[17]===null,'daily annual substitute remains optional when policy requirement is off');
echo "PASS per-region requirement only for daily annual leave; other request types unaffected\n";
