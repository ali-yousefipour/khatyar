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
  static $request,$report=null,$routeOwner=null,$failReply=false,$writes=[],$failAttendance=false,$changed=1,$open=null,$pdo,$subConflict=false,$failRelease=false;
  static function pdo(){return self::$pdo??=new FakeConnection;}
  static function all($sql,$params=[]){
    if(str_contains($sql,'FROM request_edit_history') || str_contains($sql,'FROM request_approval_steps'))return [];
    if(str_contains($sql,'FROM users u WHERE'))return [['id'=>$params[0],'name'=>'نیروی اصلی آزمون'],['id'=>$params[1],'name'=>'مدیر آزمون']];
    throw new LogicException($sql);
  }
  static function one($sql,$params=[]){
    if(str_contains($sql,'FROM users'))return ['id'=>$params[0],'name'=>'جایگزین آزمون'];
    if(str_contains($sql,'FROM substitute_assignments'))return str_contains($sql,'sa.request_id<>?')&&self::$subConflict?['id'=>99]:null;
    if(str_contains($sql,'FROM manual_attendance_provisional'))return null;
    if(str_contains($sql,'FROM staff_attendance'))return self::$open;
    if(str_contains($sql,'FROM reports WHERE id='))return self::$report;
    if(str_contains($sql,'FROM report_routes WHERE report_id='))return self::$routeOwner===null?null:['to_user_id'=>self::$routeOwner];
    if(str_contains($sql,'FROM requests'))return self::$request;
    throw new LogicException($sql);
  }
  static function insert($sql,$params=[]){self::run($sql,$params);return 77;}
  static function run($sql,$params=[]){
    if(self::$failRelease&&str_contains($sql,'INSERT INTO notifications'))throw new RuntimeException('simulated release notification failure');
    if(self::$failAttendance&&str_contains($sql,'INSERT INTO staff_attendance'))throw new RuntimeException('simulated storage failure');
    if(self::$failReply&&str_contains($sql,'INSERT INTO report_routes'))throw new RuntimeException('simulated reply storage failure');
    if(str_contains($sql,'request_approval_steps'))return new class {function rowCount(){return 1;}};
    self::$writes[]=[$sql,$params];return new class {function rowCount(){return Db::$changed;}};
  }
}
class Push {static array $sent=[];static function send(...$args){self::$sent[]=$args;}}
function _req_notify_sms(...$args){}
function _report_audit(...$args){}
function _db_table_exists_safe($name){return true;}

function check($ok,$label){if(!$ok)throw new LogicException($label);}
function denied($fn,$code){try{$fn();}catch(RuntimeException $e){check($e->getCode()===$code,'wrong error: '.$e->getMessage());return;}throw new LogicException('unexpected success');}
$source=file_get_contents(__DIR__.'/../lib/routes.php');
$a=strpos($source,'function _req_policy_date(');$b=strpos($source,'// Recompute durations',$a);
eval(str_replace('__DIR__',var_export(dirname(__DIR__).'/lib',true),substr($source,$a,$b-$a)));
$a=strpos($source,'function gregorian_to_jalali(');$b=strpos($source,'function j_to_ts(',$a);eval(substr($source,$a,$b-$a));
$a=strpos($source,'function _req_policy_span(');$b=strpos($source,'function _req_validate_work_policy(',$a);eval(substr($source,$a,$b-$a));
$a=strpos($source,'function _req_prepare_approval_storage(');$b=strpos($source,'// گزارش درخواست‌ها برای ادمین',$a);eval(substr($source,$a,$b-$a));
$a=strpos($source,'function _req_approval_steps_ensure(');$b=strpos($source,"route('POST', '/api/my/requests'",$a);eval(substr($source,$a,$b-$a));
[$where,$args]=_req_report_filter(['from'=>'2026-10-01','to'=>'2026-10-22','type'=>'unpaid','status'=>'canceled','q'=>"O'Reilly"]);
check(str_contains($where,'r.created_at<?'),'inclusive end date uses next midnight');
check(in_array('2026-10-23 00:00:00',$args,true),'end date boundary');
check(!str_contains($where,"O'Reilly"),'search stays parameterized');
foreach([['from'=>'2026-02-30'],['from'=>'2026-10-22','to'=>'2026-10-01'],['status'=>'bad']] as $bad)denied(fn()=>_req_report_filter($bad),422);
check(_req_report_csv_cell('=1+1')==="'=1+1",'CSV formula escaped');
check(_req_report_csv_cell('متن عادی')==='متن عادی','CSV normal text unchanged');
$leave=['type'=>'annual','unit'=>'daily','from_jdate'=>'1405-07-30','to_jdate'=>'1405-08-02','status'=>'approved'];
$hourly=['type'=>'annual','unit'=>'hourly','the_date'=>'1405-07-30','from_time'=>'08:00','to_time'=>'10:00','status'=>'approved'];
$future=['type'=>'annual','unit'=>'daily','from_jdate'=>'1405-08-05','to_jdate'=>'1405-08-05','status'=>'approved'];
$usage=_req_leave_usage_through([$leave,$leave,$hourly,$future,$hourly+['ignored'=>true]],['annual_hourly'=>['left_month'=>12,'left_year'=>180,'pending_year'=>2,'used_year'=>42]],'1405-07-30');
check($usage['types']['annual']['used_hours_year']===10.0,'usage through today clips multiday leave and excludes future/duplicate rows');
check($usage['types']['annual']['remaining_hours_year']===180,'remaining quota comes from assigned policy balance');
check($usage['types']['annual']['future_approved_hours_year']===32.0,'future approved quota shown separately');
const ADMIN=1;$handlers=[];
function route($method,$path,$fn,...$options){global $handlers;$handlers[$method.$path]=$fn;$GLOBALS['routeOptions'][$method.$path]=$options;}
$a=strpos($source,"route('POST', '/api/admin/requests/{id}/decision'");$b=strpos($source,'// Install after',$a);eval(substr($source,$a,$b-$a));
$decide=$handlers['POST/api/admin/requests/{id}/decision'];
Db::$request=['id'=>3,'user_id'=>12,'status'=>'pending','type'=>'manual','the_date'=>'1405-07-30','in_time'=>'23:00','out_time'=>'02:00'];
$director=['id'=>1,'username'=>'admin','role_title'=>'مدیر کل'];
$decide(['id'=>3],['status'=>'approved'],$director);
$attendance=array_values(array_filter(Db::$writes,fn($x)=>str_contains($x[0],'INSERT INTO staff_attendance')));
check(count($attendance)===1,'admin approval creates attendance');
check(strtotime($attendance[0][1][2])-strtotime($attendance[0][1][1])===10800,'overnight exit is next day');
check(Db::pdo()->commits===1,'decision committed');
check(count(array_filter(Db::$writes,fn($w)=>str_starts_with($w[0],'UPDATE requests SET')&&str_contains($w[0],'pending_on=NULL')))===1,'completed decision clears inbox');
Db::$failAttendance=true;try{$decide(['id'=>3],['status'=>'approved'],$director);}catch(RuntimeException $e){}
check(Db::pdo()->rollbacks===1,'attendance error rolls decision back');Db::$failAttendance=false;
Db::$changed=0;denied(fn()=>$decide(['id'=>3],['status'=>'approved'],$director),409);check(Db::pdo()->rollbacks===2,'concurrent decision rolls back');Db::$changed=1;
Db::$request['status']='approved';denied(fn()=>$decide(['id'=>3],['status'=>'approved'],$director),409);
Db::$request['status']='rejected';$decide(['id'=>3],['status'=>'approved'],$director);
check(array_values(array_filter(Db::$writes,fn($w)=>str_contains($w[0],'pending_on=NULL')))[count(array_filter(Db::$writes,fn($w)=>str_contains($w[0],'pending_on=NULL')))-1][1][4]==='rejected','reapproval compares original rejected status atomically');
Db::$request['status']='pending';Db::$request['in_time']='25:99';denied(fn()=>$decide(['id'=>3],['status'=>'approved'],$director),422);
Db::$request['status']='pending';Db::$request['in_time']=null;denied(fn()=>$decide(['id'=>3],['status'=>'approved'],$director),422);
Db::$open=['id'=>8];$decide(['id'=>3],['status'=>'approved'],$director);check(count(array_filter(Db::$writes,fn($w)=>str_contains($w[0],'UPDATE staff_attendance')))>0,'out-only request closes open attendance');
Db::$writes=[];_req_apply_approval_effects(['type'=>'annual','user_id'=>12,'substitute_user_id'=>7,'from_jdate'=>'1405-07-30','to_jdate'=>'1405-08-01','the_date'=>null],3);
check(str_contains(Db::$writes[0][0],'INSERT INTO substitute_assignments'),'admin approval creates substitute assignment');
Db::$subConflict=true;denied(fn()=>_req_apply_approval_effects(['type'=>'annual','user_id'=>12,'substitute_user_id'=>7,'from_jdate'=>'1405-07-30','to_jdate'=>'1405-08-01','the_date'=>null],3),409);Db::$subConflict=false;
denied(fn()=>_req_apply_approval_effects(['type'=>'annual','user_id'=>12,'substitute_user_id'=>12],3),422);
foreach([['mission','daily'],['mission','hourly'],['annual','hourly'],['sick','daily'],['sick','hourly'],['overtime','hourly']] as [$type,$unit]){
  Db::$writes=[];$legacy=['type'=>$type,'unit'=>$unit,'user_id'=>12,'substitute_user_id'=>7,'from_jdate'=>'1405-07-30','to_jdate'=>'1405-07-30','the_date'=>'1405-07-30'];
  _req_prepare_approval_storage($legacy);_req_apply_approval_effects($legacy,3);
  check(Db::$writes===[],'non-daily-annual legacy substitute cannot create assignments: '.$type.'/'.$unit);
}
$a=strpos($source,"route('GET', '/api/admin/requests/{id}/detail'");$b=strpos($source,"route('GET', '/api/admin/requests/{id}/leave-context'",$a);eval(substr($source,$a,$b-$a));
check($GLOBALS['routeOptions']['GET/api/admin/requests/{id}/detail']===[false,ADMIN],'details remain admin-only');
Db::$request=['id'=>3,'type'=>'manual','selfie_data'=>'data:image/jpeg;base64,ZmFrZQ=='];
$detail=$handlers['GET/api/admin/requests/{id}/detail'](['id'=>3],[],$director);check($detail['selfie_data']===Db::$request['selfie_data'],'details include stored manual selfie');
Db::$request=null;denied(fn()=>$handlers['GET/api/admin/requests/{id}/detail'](['id'=>99],[],$director),404);
Db::$request=['id'=>3,'type'=>'annual','status'=>'approved'];
$a=strpos($source,"route('DELETE', '/api/admin/requests/{id}'");$b=strpos($source,'// خروجی اکسل گزارش',$a);eval(substr($source,$a,$b-$a));Db::$writes=[];
$handlers['DELETE/api/admin/requests/{id}'](['id'=>3],[],$director);check(count(array_filter(Db::$writes,fn($w)=>str_contains($w[0],"UPDATE substitute_assignments SET status='canceled'")))===1 && count(array_filter(Db::$writes,fn($w)=>str_contains($w[0],'DELETE FROM requests')))===1,'delete releases substitute and removes request');

require_once __DIR__.'/../lib/LeaveSubstituteCoverage.php';
Db::$request=['id'=>3,'type'=>'annual','unit'=>'daily','status'=>'approved','user_id'=>12,'substitute_user_id'=>7,'from_jdate'=>'1405-09-01','to_jdate'=>'1405-09-01'];
Db::$writes=[];Push::$sent=[];
$priorCommits=Db::pdo()->commits;
$handlers['DELETE/api/admin/requests/{id}'](['id'=>3],[],$director);
check(Db::pdo()->commits===$priorCommits+1,'approved substitute deletion committed');
check(count(array_filter(Db::$writes,fn($w)=>str_contains($w[0],'INSERT INTO notifications')&&$w[1][0]===7))===1,'release notice persisted to old substitute');
check(count(array_filter(Push::$sent,fn($w)=>$w[0]===[7]&&$w[1]==='آزاد شدن رزرو جایگزینی'))===1,'old substitute receives release only after deletion commit');
Push::$sent=[];Db::$writes=[];Db::$failRelease=true;$priorRollbacks=Db::pdo()->rollbacks;
try{$handlers['DELETE/api/admin/requests/{id}'](['id'=>3],[],$director);throw new LogicException('failed notice did not rollback request deletion');}
catch(RuntimeException $e){check($e->getMessage()==='simulated release notification failure'&&Db::pdo()->rollbacks===$priorRollbacks+1&&Push::$sent===[],'release persistence failure rolls back deletion without push');}
Db::$failRelease=false;

// Real report action handler: reply must atomically return ownership to sender.
$a=strpos($source,"route('POST', '/api/reports/{id}/action'");
$b=strpos($source,"\n});",$a);
check($a!==false && $b!==false,'reply action route available');
eval(substr($source,$a,$b-$a+4));
$reportAction=$handlers['POST/api/reports/{id}/action'];
Db::$report=['id'=>41,'sender_id'=>17,'subject'=>'Test report'];
Db::$routeOwner=29;
Db::$writes=[];Db::$failReply=false;
$beforeCommits=Db::pdo()->commits;
$response=$reportAction(['id'=>41],['action'=>'reply','note'=>'Reply text'],['id'=>29]);
check(!empty($response['ok'])&&!empty($response['routed'])&&(int)$response['to_user_id']===17,'reply handoff acknowledged with original sender');
$routes=array_values(array_filter(Db::$writes,fn($x)=>str_contains($x[0],'INSERT INTO report_routes')));
check(count($routes)===1 && $routes[0][1]===[41,17,'Reply text',29], 'reply routes to sender, not current reviewer');
check(count(array_filter(Db::$writes,fn($x)=>str_contains($x[0],"status='answered'")))===1,'report status is answered');
check(Db::pdo()->commits===$beforeCommits+1,'route and status commit together');
$previousWrites=count(Db::$writes);
$previousRollbacks=Db::pdo()->rollbacks;
Db::$routeOwner=77;
denied(fn()=>$reportAction(['id'=>41],['action'=>'reply','note'=>'stale'],['id'=>29]),409);
check(count(Db::$writes)===$previousWrites && Db::pdo()->rollbacks===$previousRollbacks+1,'old owner cannot reply or modify handoff');
Db::$routeOwner=29;Db::$failReply=true;
denied(fn()=>$reportAction(['id'=>41],['action'=>'reply','note'=>'failure'],['id'=>29]),500);
check(Db::pdo()->rollbacks===$previousRollbacks+2,'database failure rolls back reply');
Db::$failReply=false;
echo "PASS request report: filter boundaries, parameterization, atomic approval, concurrency, overnight/out-only attendance, substitute and delete cleanup\n";
