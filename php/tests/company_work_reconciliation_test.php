<?php
const ADMIN=3;function route(...$args){}
require_once __DIR__.'/../lib/CompanyWork.php';
class Tx {public $active=false,$saved;function beginTransaction(){$this->active=true;$this->saved=[Db::$batches,Db::$state];}function inTransaction(){return $this->active;}function commit(){$this->active=false;}function rollBack(){[Db::$batches,Db::$state]=$this->saved;$this->active=false;}}
class Db {
 static $attendance=[],$batches=[],$state=null,$source,$users=[],$final,$writes=[],$fail=false,$lock=1,$released=false,$tx;
 static function pdo(){return self::$tx??=new Tx;}
 static function one($q,$p=[]){if(str_contains($q,'GET_LOCK'))return ['acquired'=>self::$lock];if(str_contains($q,'RELEASE_LOCK')){self::$released=true;return ['released'=>1];}if(str_contains($q,'company_work_reconciliation_state'))return ['batch_id'=>self::$state];if(str_contains($q,'FROM company_work_reconciliations'))return self::$batches[$p[0]]??null;if(str_contains($q,'FROM company_work_sources'))return self::$source;throw new LogicException($q);}
 static function all($q,$p=[]){if(str_contains($q,'FROM staff_attendance'))return self::$attendance;if(str_contains($q,'FROM users'))return self::$users;throw new LogicException($q);}
 static function insert($q,$p){self::$writes[]=$q;$id=count(self::$batches)+1;self::$batches[$id]=array_combine(['jy','jm','source_id','source_name','source_hash','backup_json','backup_hash','plan_json','reason','created_by'],$p)+['id'=>$id,'reverted_at'=>null];return $id;}
 static function run($q,$p=[]){self::$writes[]=$q;if(str_starts_with($q,'INSERT INTO company_work_reconciliation_state')){if(self::$fail)throw new RuntimeException('state failed');self::$state=$p[2];}elseif(str_starts_with($q,'UPDATE company_work_reconciliation_state'))self::$state=null;elseif(str_starts_with($q,'UPDATE company_work_reconciliations'))self::$batches[$p[2]]['reverted_at']='2026-10-23';}
}
function _final_work_month($y,$m){return Db::$final;}
function _work_snapshot_decode($v){return json_decode($v,true,512,JSON_THROW_ON_ERROR);}
function yes($label,$v){if(!$v)throw new LogicException('FAIL '.$label);echo "PASS $label\n";}
function denied($label,$code,$fn){try{$fn();}catch(PayrollError $e){yes($label,$e->getCode()===$code);return;}throw new LogicException('Unexpected success '.$label);}
$sourceRow=['first_name'=>'کاربر','last_name'=>'نمونه','personnel_code'=>'0005','role'=>'ناظر','friday_hours'=>2.25,'holiday_hours'=>1.000277778,'overtime_hours'=>4.5];
Db::$users=[['id'=>1,'first_name'=>'کاربر','last_name'=>'نمونه','personnel_code'=>'0005']];
Db::$source=['id'=>8,'jy'=>1405,'jm'=>7,'file_name'=>'سازمان.xlsx','sha256'=>str_repeat('a',64),'rows_json'=>CompanyWork::json([$sourceRow])];
$monthly=[['user_id'=>1,'name'=>'کاربر نمونه','regular_overtime'=>120,'mission_min'=>60,'shortage'=>30,'holiday'=>30,'friday'=>60]];
$days=[];for($i=1;$i<=30;$i++)$days[]=['jdate'=>sprintf('1405/07/%02d',$i),'worked'=>$i<=3?'08:00':'00:00','is_holiday'=>in_array($i,[3,4],true)];
$daily=[1=>['user'=>['name'=>'کاربر نمونه'],'days'=>$days]];
Db::$final=['monthly_json'=>CompanyWork::json($monthly),'daily_json'=>CompanyWork::json($daily),'finalized_at'=>'2026-10-22 12:00:00'];$original=Db::$final;
$p=CompanyWork::reconciliationPreview(8);$r=$p['plan']['rows'][0];
yes('canonical organization baseline includes mission minus shortage',$r['actual_seconds']['overtime']===150*60);
yes('all payable categories equal organization values',$r['payable_seconds']===$r['organization_seconds']&&!$p['plan']['has_errors']);
foreach(['overtime','holiday','friday'] as $k){$parts=array_column(array_column($r['days'],'incentive_seconds'),$k);yes('exact calendar sum '.$k,array_sum($parts)===$r['incentive_seconds'][$k]);}
foreach($r['days'] as $d){$fri=CompanyWork::date($d['jdate'])->format('w')==='5';yes('Friday allocation only on Fridays',!$d['incentive_seconds']['friday']||$fri);yes('holiday allocation excludes Fridays',!$d['incentive_seconds']['holiday']||(!$fri&&substr($d['jdate'],-2)==='04'));yes('regular overtime excludes holidays and Fridays',!$d['incentive_seconds']['overtime']||(!$fri&&substr($d['jdate'],-2)!=='04'));}
$bad=$sourceRow;$bad['holiday_hours']=0;$out=CompanyWork::reconciliationPlan([array_merge($bad,['user_id'=>1])],$monthly,$daily,1405,7);yes('lower organization value creates signed financial adjustment',!$out['has_errors']&&$out['rows'][0]['incentive_seconds']['holiday']===-1800&&$out['rows'][0]['payable_seconds']['holiday']===0);
$unknown=$daily;unset($unknown[1]['days'][0]['is_holiday']);yes('unknown frozen holiday calendar rejected',CompanyWork::reconciliationPlan([array_merge($sourceRow,['user_id'=>1])],$monthly,$unknown,1405,7)['has_errors']);
$missing=$daily;array_pop($missing[1]['days']);yes('partial frozen month blocked',CompanyWork::reconciliationPlan([array_merge($sourceRow,['user_id'=>1])],$monthly,$missing,1405,7)['has_errors']);
$none=$daily;foreach($none[1]['days'] as &$d)$d['worked']='00:00';unset($d);$zero=CompanyWork::reconciliationPlan([array_merge($sourceRow,['user_id'=>1])],$monthly,$none,1405,7);yes('no attendance fabricated for incentive-only allocation',!$zero['has_errors']&&!array_filter($zero['rows'][0]['days'],fn($d)=>$d['worked']!=='00:00'));
$officePeople=[['id'=>1,'role_title'=>'نیروی اداری مقیم سازمان','zone_name'=>'سازمان تاکسیرانی']];
$officePlan=CompanyWork::reconciliationPlan([array_merge($sourceRow,['user_id'=>1])],$monthly,$daily,1405,7,$officePeople,'role',[1]);$officeRow=$officePlan['rows'][0];
yes('office schedule uses explicit role group only',$officeRow['office_group']&&$officeRow['office_schedule_days']>0);
foreach($officeRow['days'] as $d)if($d['organization_schedule']){if(CompanyWork::date($d['jdate'])->format('w')==='5'||substr($d['jdate'],-2)==='04'||$d['organization_schedule']!==['from'=>'07:00','to'=>'14:33','minutes'=>453,'source'=>'organization_approved_schedule'])throw new LogicException('invalid office day');}
yes('office times exactly 07:00 to 14:33 on ordinary days',true);
$zonePlan=CompanyWork::reconciliationPlan([array_merge($sourceRow,['user_id'=>1])],$monthly,$daily,1405,7,$officePeople,'zone');yes('role name never broadens a zone-scoped group',!$zonePlan['rows'][0]['office_group']&&$zonePlan['rows'][0]['office_schedule_days']===0);
foreach(['overtime','holiday','friday'] as $k)yes('daily payable total equals full organization '.$k,array_sum(array_column(array_column($officeRow['days'],'payable_seconds'),$k))===$officeRow['organization_seconds'][$k]);
$missingPerson=[['id'=>2,'role_title'=>'نیروی اداری مقیم سازمان','zone_name'=>'اداری','employment_start_date'=>'1405-07-15']];
$missingPlan=CompanyWork::reconciliationPlan([array_merge($sourceRow,['user_id'=>2,'holiday_hours'=>0])],$monthly,$daily,1405,7,$missingPerson,'role');$missingRow=$missingPlan['rows'][0];
yes('missing frozen person can use organization-backed payable basis',!$missingPlan['has_errors']&&$missingRow['actual_seconds']['overtime']===null&&$missingRow['payable_seconds']===$missingRow['organization_seconds']&&count($missingRow['warnings'])>0);
yes('approved schedule excludes days before hiring',!array_filter($missingRow['days'],fn($d)=>$d['jdate']<'1405-07-15')&&count($missingRow['days'])===16);
yes('unknown original attendance is not claimed as a measured punch',!array_filter($missingRow['days'],fn($d)=>$d['worked']!==null));
denied('stale preview cannot commit',409,fn()=>CompanyWork::reconciliationApply(8,str_repeat('b',64),'مصوبه سازمان',7));
$saved=CompanyWork::reconciliationApply(8,$p['token'],'مصوبه سازمان',7);yes('atomic backup before activation',Db::$state===1&&Db::$batches[1]['backup_hash']===hash('sha256',Db::$batches[1]['backup_json']));
yes('full original snapshot preserved',json_decode(Db::$batches[1]['backup_json'],true)['daily_json']===$original['daily_json']&&Db::$final===$original);
$p2=CompanyWork::reconciliationPreview(8);denied('one active batch per month',409,fn()=>CompanyWork::reconciliationApply(8,$p2['token'],'مصوبه دوم',7));
CompanyWork::reconciliationRevert(1,'برگشت به مبنای اصلی',7);yes('revert deactivates without deleting archive',Db::$state===null&&Db::$batches[1]['reverted_at']!==null&&Db::$final===$original);
denied('repeated revert rejected',409,fn()=>CompanyWork::reconciliationRevert(1,'برگشت تکراری',7));
Db::$fail=true;$p3=CompanyWork::reconciliationPreview(8);try{CompanyWork::reconciliationApply(8,$p3['token'],'آزمون شکست',7);throw new LogicException('expected failure');}catch(RuntimeException $e){yes('state failure rolls backup insertion back',$e->getMessage()==='state failed'&&count(Db::$batches)===1&&Db::$state===null);}
yes('locks released on failures',Db::$released);yes('no changes to attendance, missions or original finalization',!array_filter(Db::$writes,fn($q)=>preg_match('/^(UPDATE|DELETE|INSERT INTO) (staff_attendance|requests|finalized_work_months)\b/',$q)));
Db::$lock=0;denied('concurrent month processing blocked',409,fn()=>CompanyWork::reconciliationApply(8,$p3['token'],'قفل همزمان',7));
echo "Company reconciliation tests passed\n";

Db::$lock=1;Db::$fail=false;Db::$users[0]['role_title']='نیروی اداری مقیم سازمان';
$base=CompanyWork::reconciliationPreview(8,'role');
yes('candidate not selected automatically',$base['candidates'][0]['eligible']&&$base['plan']['rows'][0]['office_schedule_days']===0);
$chosen=CompanyWork::selectOfficeCandidates($base['plan'],$base['candidates'],[1]);
yes('explicit selection applies office program',$chosen['rows'][0]['office_schedule_days']>0&&$chosen['selected_user_ids']===[1]);
yes('empty checklist leaves everyone unchanged',CompanyWork::selectOfficeCandidates($base['plan'],$base['candidates'],[])['rows'][0]['office_schedule_days']===0);
denied('unknown personnel cannot be injected',422,fn()=>CompanyWork::selectOfficeCandidates($base['plan'],$base['candidates'],[999]));
foreach([['id'=>5,'user_id'=>1,'check_in'=>'2026-10-01 07:00:00','check_out'=>null],['id'=>6,'user_id'=>1,'check_in'=>null,'check_out'=>'2026-10-01 14:33:00']] as $event){Db::$attendance=[$event];$changed=CompanyWork::reconciliationPreview(8,'role');yes('any entry or exit excludes candidate',!$changed['candidates']);denied('new attendance invalidates approval',409,fn()=>CompanyWork::reconciliationApply(8,$base['token'],'تایید مدیر',7,'role',[1]));}
Db::$attendance=[];$savedSelection=CompanyWork::reconciliationApply(8,$base['token'],'تایید مدیر',7,'role',[1]);$stored=json_decode(Db::$batches[$savedSelection['id']]['plan_json'],true);yes('selection retained in immutable archive',$stored['selected_user_ids']===[1]&&$stored['rows'][0]['office_schedule_days']>0);
