<?php
date_default_timezone_set('Asia/Tehran');
class Http {static function error($message,$code=400){throw new RuntimeException($message,$code);}}
class FakeConnection {
  public $active=false,$commits=0,$rollbacks=0;
  function beginTransaction(){$this->active=true;}
  function commit(){$this->active=false;$this->commits++;}
  function inTransaction(){return $this->active;}
  function rollBack(){$this->active=false;$this->rollbacks++;}
}
class Db {
  static $request,$writes=[],$failAttendance=false,$changed=1,$open=null,$pdo;
  static function pdo(){return self::$pdo??=new FakeConnection;}
  static function one($sql,$params=[]){
    if(str_contains($sql,'FROM substitute_assignments'))return null;
    if(str_contains($sql,'FROM staff_attendance'))return self::$open;
    if(str_contains($sql,'FROM requests'))return self::$request;
    throw new LogicException($sql);
  }
  static function run($sql,$params=[]){
    if(self::$failAttendance&&str_contains($sql,'INSERT INTO staff_attendance'))throw new RuntimeException('simulated storage failure');
    self::$writes[]=[$sql,$params];return new class {function rowCount(){return Db::$changed;}};
  }
}
class Push {static function send(...$args){}}
function _req_notify_sms(...$args){}
function _db_table_exists_safe($name){return true;}
function check($ok,$label){if(!$ok)throw new LogicException($label);}
function denied($fn,$code){try{$fn();}catch(RuntimeException $e){check($e->getCode()===$code,'wrong error: '.$e->getMessage());return;}throw new LogicException('unexpected success');}
$source=file_get_contents(__DIR__.'/../lib/routes.php');
$a=strpos($source,'function _req_policy_date(');$b=strpos($source,'// Recompute durations',$a);
eval(str_replace('__DIR__',var_export(dirname(__DIR__).'/lib',true),substr($source,$a,$b-$a)));
$a=strpos($source,'function _req_prepare_approval_storage(');$b=strpos($source,'// گزارش درخواست‌ها برای ادمین',$a);eval(substr($source,$a,$b-$a));
[$where,$args]=_req_report_filter(['from'=>'2026-10-01','to'=>'2026-10-22','type'=>'unpaid','status'=>'canceled','q'=>"O'Reilly"]);
check(str_contains($where,'r.created_at<?'),'inclusive end date uses next midnight');
check(in_array('2026-10-23 00:00:00',$args,true),'end date boundary');
check(!str_contains($where,"O'Reilly"),'search stays parameterized');
foreach([['from'=>'2026-02-30'],['from'=>'2026-10-22','to'=>'2026-10-01'],['status'=>'bad']] as $bad)denied(fn()=>_req_report_filter($bad),422);
check(_req_report_csv_cell('=1+1')==="'=1+1",'CSV formula escaped');
check(_req_report_csv_cell('متن عادی')==='متن عادی','CSV normal text unchanged');
const ADMIN=1;$handlers=[];
function route($method,$path,$fn,...$options){global $handlers;$handlers[$method.$path]=$fn;}
$a=strpos($source,"route('POST', '/api/admin/requests/{id}/decision'");$b=strpos($source,'// Install after',$a);eval(substr($source,$a,$b-$a));
$decide=$handlers['POST/api/admin/requests/{id}/decision'];
Db::$request=['id'=>3,'user_id'=>12,'status'=>'pending','type'=>'manual','the_date'=>'1405-07-30','in_time'=>'23:00','out_time'=>'02:00'];
$decide(['id'=>3],['status'=>'approved'],['id'=>1]);
$attendance=array_values(array_filter(Db::$writes,fn($x)=>str_contains($x[0],'INSERT INTO staff_attendance')));
check(count($attendance)===1,'admin approval creates attendance');
check(strtotime($attendance[0][1][2])-strtotime($attendance[0][1][1])===10800,'overnight exit is next day');
check(Db::pdo()->commits===1,'decision committed');
check(str_contains(Db::$writes[0][0],'pending_on=NULL'),'completed decision clears inbox');
Db::$failAttendance=true;try{$decide(['id'=>3],['status'=>'approved'],['id'=>1]);}catch(RuntimeException $e){}
check(Db::pdo()->rollbacks===1,'attendance error rolls decision back');Db::$failAttendance=false;
Db::$changed=0;denied(fn()=>$decide(['id'=>3],['status'=>'approved'],['id'=>1]),409);check(Db::pdo()->rollbacks===2,'concurrent decision rolls back');Db::$changed=1;
Db::$request['status']='approved';denied(fn()=>$decide(['id'=>3],['status'=>'approved'],['id'=>1]),409);
Db::$request['status']='pending';Db::$request['in_time']='25:99';denied(fn()=>$decide(['id'=>3],['status'=>'approved'],['id'=>1]),422);
Db::$request['status']='pending';Db::$request['in_time']=null;denied(fn()=>$decide(['id'=>3],['status'=>'approved'],['id'=>1]),422);
Db::$open=['id'=>8];$decide(['id'=>3],['status'=>'approved'],['id'=>1]);check(str_contains(end(Db::$writes)[0],'UPDATE staff_attendance'),'out-only request closes open attendance');
Db::$writes=[];_req_apply_approval_effects(['type'=>'annual','user_id'=>12,'substitute_user_id'=>7,'from_jdate'=>'1405-07-30','to_jdate'=>'1405-08-01','the_date'=>null],3);
check(str_contains(Db::$writes[0][0],'INSERT INTO substitute_assignments'),'admin approval creates substitute assignment');
$a=strpos($source,"route('DELETE', '/api/admin/requests/{id}'");$b=strpos($source,'// خروجی اکسل گزارش',$a);eval(substr($source,$a,$b-$a));Db::$writes=[];
$handlers['DELETE/api/admin/requests/{id}'](['id'=>3],[],['id'=>1]);check(str_contains(Db::$writes[0][0],"status='canceled'"),'delete releases substitute');
echo "PASS request report: filter boundaries, parameterization, atomic approval, concurrency, overnight/out-only attendance, substitute and delete cleanup\n";
