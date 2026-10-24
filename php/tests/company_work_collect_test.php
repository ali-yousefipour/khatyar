<?php
date_default_timezone_set('Asia/Tehran');const ADMIN=3;function route(...$args){}
class Db {
  static $users=[],$requests=[],$inserted=[];static $officeBatch=null;static $account='0000123456',$fail=false,$field=true;
  static function all($sql,$params=[]){
    if(str_contains($sql,'FROM users'))return self::$users;
    if(str_contains($sql,'custom_field_values'))return [['user_id'=>1,'value'=>self::$account]];
    if(str_contains($sql,'FROM requests'))return self::$requests;
    if(str_contains($sql,'staff_attendance'))return [];
    throw new RuntimeException('Unexpected query');
  }
  static function one($sql,$params=[]){if(str_contains($sql,'company_work_reconciliation_state'))return self::$officeBatch;if(str_contains($sql,'custom_fields'))return self::$field?['id'=>5,'label'=>'شماره حساب']:null;throw new RuntimeException('Unexpected query');}
  static function insert($sql,$params=[]){if(self::$fail)throw new RuntimeException('synthetic archive failure');self::$inserted[]=[$sql,$params];return 9;}
}
class Seniority {static $value=730;static function listRows(){return ['rows'=>[['id'=>1,'seniority_days'=>self::$value]]];}}
function _shift_rotation_report($y,$m){return ['source'=>'live','rows'=>[]];}
function _shift_rotation_rows($users,$punches,$start,$end){$GLOBALS['rotation_used']=[$users[0]['id'],$start->format('Y-m-d'),$end->format('Y-m-d')];return [['user_id'=>1,'morning'=>10.5,'afternoon'=>9.5,'night'=>2,'missing_source'=>false]];}
function attendance_report_owned_by_entry_date($uid,$from,$to){
  $GLOBALS['attendance_calls'][]=[$uid,$from,$to];$days=[];
  for($n=1;$n<=30;$n++)$days[]=['jdate'=>sprintf('1405-07-%02d',$n),'absent'=>in_array($n,[1,20],true)?1:0,'night'=>$n===20?'02:30':'00:00'];
  return ['days'=>$days];
}
function _db_table_exists_safe($table){return Db::$officeBatch!==null;}
require_once __DIR__.'/../lib/CompanyWork.php';
class IsolatedCollectedCompanyWork extends CompanyWork {static $dir;static function directory(){return self::$dir;}}
function yes($label,$value){if(!$value)throw new RuntimeException('FAIL '.$label);echo "PASS $label\n";}
Db::$users=[['id'=>1,'first_name'=>'کاربر','last_name'=>'نمونه','personnel_code'=>'0005','national_code'=>'0012345678','username'=>'0012345678','marital_status'=>'متاهل','children_count'=>2,'employment_start_date'=>'1405/07/15','employment_end_date'=>null]];
Db::$requests=[['type'=>'annual','unit'=>'daily','from_jdate'=>'1405/07/15','to_jdate'=>'1405/07/17'],['type'=>'annual','unit'=>'hourly','the_date'=>'1405/07/18','from_time'=>'08:00','to_time'=>'15:33']];
$row=['source_row'=>4,'first_name'=>'کاربر','last_name'=>'نمونه','personnel_code'=>'0005','role'=>'سمت اعلامی سازمان','friday_hours'=>7.5,'holiday_hours'=>2,'overtime_hours'=>12.75];
$source=['id'=>8,'jy'=>1405,'jm'=>7,'rows_json'=>CompanyWork::json([$row])];
$out=CompanyWork::collect($source,5);$r=$out['rows'][0];
yes('combined company inputs are complete',!$out['has_errors']);
yes('organization role and approved hours remain authoritative',$r['role']==='سمت اعلامی سازمان'&&$r['overtime_hours']===12.75);
yes('bank account and national identity come from database',$r['account']==='0000123456'&&$r['national_code']==='0012345678');
yes('seniority days, demographics and rotation joined',$r['seniority_days']===730&&$r['children']===2&&$r['morning']===10.5);
yes('canonical attendance called with exact Jalali period',$GLOBALS['attendance_calls'][0]===[1,'1405/07/01','1405/07/30']);
yes('inactive personnel use existing rotation classifier',$GLOBALS['rotation_used'][0]===1);
yes('new hire absences and 453-minute leave combined',$r['days']===16&&$r['absence_days']===1&&$r['leave_days']==4&&$r['night_hours']===2.5);
$root=sys_get_temp_dir().'/company-collect-'.bin2hex(random_bytes(6));mkdir($root,0700);IsolatedCollectedCompanyWork::$dir=$root;
try{
  $generated=IsolatedCollectedCompanyWork::generate($source,5,1);yes('successful generation persists file and snapshot',$generated['generated']&&$generated['id']===9&&count(glob($root.'/*.xlsx'))===1);
  $saved=Db::$inserted[0][1];$snapshot=json_decode($saved[5],true);yes('archive snapshot stores exact values and account source',$snapshot['rows'][0]['account']==='0000123456'&&$snapshot['account_field']['id']===5);
  $file=glob($root.'/*.xlsx')[0];$hash=hash_file('sha256',$file);Db::$account='123456789';yes('later database edits cannot alter archived file',hash_file('sha256',$file)===$hash);
  Seniority::$value=null;$blocked=IsolatedCollectedCompanyWork::generate($source,5,1);yes('missing seniority blocks export instead of zero',$blocked['generated']===false&&count(glob($root.'/*.xlsx'))===1&&str_contains(implode(' ',$blocked['snapshot']['rows'][0]['errors']),'سنوات'));
  Seniority::$value=730;Db::$users[0]['last_name']='ناسازگار';$blocked=IsolatedCollectedCompanyWork::generate($source,5,1);yes('generation rechecks current personnel identity',$blocked['generated']===false&&count(Db::$inserted)===1);
  Db::$users[0]['last_name']='نمونه';Db::$fail=true;try{IsolatedCollectedCompanyWork::generate($source,5,1);throw new RuntimeException('expected failure');}catch(RuntimeException $e){yes('failed generation insert removes newly written file',$e->getMessage()==='synthetic archive failure'&&count(glob($root.'/*.xlsx'))===1);}
  Db::$field=false;try{CompanyWork::collect($source,99);throw new RuntimeException('expected invalid account field');}catch(PayrollError $e){yes('unknown account field rejected',$e->getCode()===422);}
}finally{foreach(glob($root.'/*') as $file)unlink($file);rmdir($root);}
echo "Company work collection and generation tests passed\n";

Db::$fail=false;Db::$field=true;Db::$account='0000123456';Seniority::$value=730;
$approvedDays=[];for($n=1;$n<=30;$n++)$approvedDays[]=['jdate'=>sprintf('1405-07-%02d',$n),'organization_schedule'=>$n>=15?['from'=>'07:00','to'=>'14:33','minutes'=>453,'source'=>'organization_approved_schedule']:null];
Db::$officeBatch=['id'=>88,'source_id'=>8,'plan_json'=>CompanyWork::json(['rows'=>[['user_id'=>1,'office_group'=>true,'office_schedule_days'=>16,'office_schedule_minutes'=>16*453,'days'=>$approvedDays]]])];
$payable=CompanyWork::collect($source,5);yes('company output uses active approved schedule for absence',!$payable['has_errors']&&$payable['rows'][0]['recorded_absence_days']===1&&$payable['rows'][0]['absence_days']===0&&$payable['rows'][0]['covered_absence_days']===1&&$payable['rows'][0]['organization_basis']['batch_id']===88);
try{CompanyWork::collect(array_replace($source,['id'=>99]),5);throw new LogicException('expected source mismatch');}catch(PayrollError $e){yes('office basis cannot leak into another source file',$e->getCode()===409);}

$unselected=json_decode(Db::$officeBatch['plan_json'],true);$unselected['rows'][0]['office_schedule_days']=0;Db::$officeBatch['plan_json']=CompanyWork::json($unselected);$unchanged=CompanyWork::collect($source,5);yes('unselected office member keeps original payable absence',$unchanged['rows'][0]['absence_days']===1&&!isset($unchanged['rows'][0]['organization_basis']));
