<?php
class Http {static function error($message,$code=400){throw new RuntimeException($message,$code);}}
class Db {
  static $insert=[];
  static function one($sql,$args=[]){
    if(strpos($sql,'can_be_substitute')!==false)return ['can_be_substitute'=>$GLOBALS['substituteStaff']??0,'zone_name'=>$GLOBALS['zoneName']??''];
    return ['Field'=>'substitute_user_id'];
  }
  static function run($sql,$args=[]){}
  static function insert($sql,$args=[]){self::$insert=$args;return 1;}
}
class Push {static function send(...$args){} static function notify(...$args){}}
function _ensure_requests_table(){}
function _req_policy_options($uid,$required=true){return ['leave_require_substitute'=>$GLOBALS['requireSub']??true];}
function _req_approver($uid){return 99;}
function _leave_blocked_in_range($from,$to){return null;}
function _substitute_availability($id,$from,$to){$GLOBALS['checked_sub']=$id;return ['available'=>true];}
function j_to_ts($date){return strtotime('2026-10-22');}
function route($method,$path,$fn,...$options){$GLOBALS['submit']=$fn;}
function check($ok,$message){if(!$ok)throw new LogicException($message);}
$source=file_get_contents(__DIR__.'/../lib/routes.php');
$a=strpos($source,'function _req_leave_substitute_required(');$b=strpos($source,'function _req_policy_date(',$a);eval(substr($source,$a,$b-$a));
$a=strpos($source,'function _req_substitute_eligible(');$b=strpos($source,'function _req_apply_approval_effects(',$a);eval(substr($source,$a,$b-$a));
$a=strpos($source,"route('POST', '/api/my/requests'");$b=strpos($source,"route('GET', '/api/my/requests'",$a);eval(substr($source,$a,$b-$a));
foreach(['annual','sick','mission','overtime','manual'] as $type)foreach(['daily','hourly'] as $unit){
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
// A designated substitute must be able to request daily leave with no replacement.
$GLOBALS['substituteStaff']=1;
$GLOBALS['zoneName']='مرکزی';
$GLOBALS['requireSub']=true;
$GLOBALS['submit']([],['type'=>'annual','unit'=>'daily','from_jdate'=>'1405-07-30','to_jdate'=>'1405-07-30'],['id'=>12]);
check(Db::$insert[17]===null,'substitute employee must not be forced to name another substitute');
// Exception: entry-gateway and Samen zones always need a replacement.
foreach(['مبادی ورودی','خطوط ثامن','ثامن'] as $zone){
  $GLOBALS['zoneName']=$zone;
  try{$GLOBALS['submit']([],['type'=>'annual','unit'=>'daily','from_jdate'=>'1405-07-30','to_jdate'=>'1405-07-30'],['id'=>12]);
    throw new LogicException('regional annual leave accepted with no replacement: '.$zone);
  }catch(RuntimeException $e){check($e->getCode()===422,'regional replacement enforced: '.$zone);}
}
$GLOBALS['zoneName']='مرکزی';
$GLOBALS['substituteStaff']=0;
$GLOBALS['requireSub']=false;
$GLOBALS['submit']([],['type'=>'annual','unit'=>'daily','from_jdate'=>'1405-07-30','to_jdate'=>'1405-07-30'],['id'=>12]);
check(Db::$insert[17]===null,'daily annual substitute remains optional when policy requirement is off');
echo "PASS actual request submission with policy requirement enabled: substitute only for daily annual leave; mission/hourly/sick/overtime/manual pass without one\n";
