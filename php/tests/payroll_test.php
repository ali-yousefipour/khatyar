<?php
define('ADMIN',3);
$routes=[];
function route($method,$path,$callback,$public=false,$level=99){global $routes;$routes[$path][$method]=[$callback,$public,$level];}
function _user_app_item_allowed($user,$key){return $user['allowed']??true;}
class Http {static function error($message,$status){throw new PayrollError($message,$status);}}
class PayrollTestTransaction {
  public $active=false;public $rolledBack=false;public $committed=false;public $snapshot;
  function beginTransaction(){$this->active=true;$this->snapshot=[Db::$period,Db::$inserted];}
  function commit(){$this->active=false;$this->committed=true;}
  function rollBack(){$this->active=false;$this->rolledBack=true;[Db::$period,Db::$inserted]=$this->snapshot;}
  function inTransaction(){return $this->active;}
}
class Db {
  static $queries=[];static $transaction;static $period=['id'=>1,'batch_id'=>5,'revision'=>2];static $row=['id'=>8,'batch_id'=>5,'user_id'=>null];static $duplicate=false;static $users=[];static $inserted=[];static $failInsert=false;
  static function pdo(){return self::$transaction??(self::$transaction=new PayrollTestTransaction());}
  static function run($sql,$parameters=[]){self::$queries[]=[$sql,$parameters];if(str_contains($sql,'UPDATE payroll_periods SET batch_id')){self::$period['batch_id']=$parameters[0];self::$period['revision']=$parameters[1];}}
  static function all($sql,$parameters=[]){self::$queries[]=[$sql,$parameters];return str_contains($sql,'FROM users')?self::$users:[];}
  static function one($sql,$parameters=[]){self::$queries[]=[$sql,$parameters];if(str_contains($sql,'SELECT COUNT'))return ['count'=>0,'total_net'=>'0','pending'=>0];if(str_contains($sql,'SELECT p.*')||str_contains($sql,'SELECT * FROM payroll_periods'))return self::$period;if(str_contains($sql,'SELECT * FROM payroll_rows'))return self::$row;if(str_contains($sql,'SELECT id FROM users'))return ['id'=>9];if(str_contains($sql,'SELECT id FROM payroll_rows'))return self::$duplicate?['id'=>10]:null;return null;}
  static function insert($sql,$parameters=[]){if(self::$failInsert && str_contains($sql,'INSERT INTO payroll_rows'))throw new RuntimeException('synthetic database failure');self::$inserted[]=[$sql,$parameters];return count(self::$inserted)+100;}
}
require __DIR__.'/../lib/Payroll.php';
$assertions=0;
function check($condition,$message){global $assertions;$assertions++;if(!$condition)throw new Exception($message);}
function fails($callback,$code){try{$callback();}catch(PayrollError $error){check($error->getCode()===$code,'unexpected error code '.$error->getCode());return;}throw new Exception('Expected failure');}
function workbook($path,$options=[]){
  $top=['ردیف','نام','نام خانوادگی','شماره پرسنلی','کد ملی','شماره حساب','سمت','روز کارکرد','','','','','دستمزد','','','حقوق ماهیانه','ضریب حق تاهل','حق تاهل','حق اولاد','','جمعه کاری','','تعطیل کاری','','شب کاری','','درصد نوبت کاری','مبلغ نوبت کاری','اضافه کار','','حق بن و مسکن','','','متفرقه','جمع حقوق و مزایا','کسورات','','','خالص پرداختی','عیدی پاداش','سنوات','بیمه سهم کارفرما','کل مبلغ نیروی انسانی'];
  $bottom=array_fill(0,43,'');
  foreach([7=>'روز کارکرد کل',8=>'مرخصی',9=>'غیبت',10=>'استعلاجی',11=>'روز کارکرد موثر',12=>'دستمزد  روزانه',13=>'مزد سنوات',14=>'مزد شغل',16=>'صفر مجرد - یک متاهل',17=>'مبلغ (ريال)',18=>'تعداد فرزند',19=>'مبلغ کل( ریال)',20=>'میزان ساعت',21=>'مبلغ کل( ریال)',22=>'میزان ساعت',23=>'مبلغ کل( ریال)',24=>'ساعت',25=>'مبلغ کل( ریال)',27=>'مبلغ',28=>'میزان ساعت',29=>'مبلغ کل( ریال)',30=>'حق مسکن',31=>'حق بن',32=>'مبلغ (ریال)',35=>'مساعده/سایر کسورات',36=>'بیمه تامین اجتماعی',37=>'مالیات'] as $index=>$value)$bottom[$index]=$value;
  if(!empty($options['wrong_header']))$top[38]='ستون جابجا';
  $person=array_fill(0,43,'0');$person[0]='1';$person[1]='آزمایشی';$person[2]='کاربر';$person[3]='05001';$person[4]='123456789';$person[5]='001234567890123';$person[6]='اپراتور';$person[34]='1000.123456';$person[35]='100';$person[36]='50';$person[37]='25';$person[38]=$options['net']??'825.123456';$person[24]='';
  if(!empty($options['invalid_number']))$person[35]='=SUM(A1)';
  $rows=[['لیست حقوق شهریور ماه 1405 پرسنل'],$top,$bottom,$person];
  if(!empty($options['duplicate'])){$person[0]='2';$rows[]=$person;}
  $rows[]=['جمع کل'];
  $xml='<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';
  foreach($rows as $rowIndex=>$row){$xml.='<row r="'.($rowIndex+1).'">';foreach($row as $index=>$value){$number=$index+1;$column='';while($number>0){$number--;$column=chr(65+$number%26).$column;$number=intdiv($number,26);}$xml.='<c r="'.$column.($rowIndex+1).'" t="inlineStr"><is><t>'.htmlspecialchars($value,ENT_XML1|ENT_QUOTES,'UTF-8').'</t></is></c>';}$xml.='</row>';}
  $xml.='</sheetData></worksheet>';
  if(!empty($options['uncached_formula']))$xml=str_replace('<c r="Y4" t="inlineStr"><is><t></t></is></c>','<c r="Y4"><f>1+1</f></c>',$xml);
  if(!empty($options['entity']))$xml='<!DOCTYPE worksheet [<!ENTITY x SYSTEM "file:///none">]>'.$xml;
  if(!empty($options['truncated']))$xml=substr($xml,0,-30);
  $zip=new ZipArchive();$zip->open($path,ZipArchive::CREATE|ZipArchive::OVERWRITE);$zip->addFromString('xl/worksheets/sheet1.xml',$xml);$zip->close();
}
$path=tempnam(sys_get_temp_dir(),'payroll-test-');
try{
  workbook($path);$rows=Payroll::parse($path,1405,6);
  check(count($rows)===1,'summary row must not import');
  check($rows[0]['data']['national_code']==='0123456789','national code leading zero');
  check($rows[0]['data']['account']==='001234567890123','account leading zeros');
  check($rows[0]['data']['net']==='825.123456','company decimals must be preserved');
  check($rows[0]['data']['night_hours']===null,'blank is not zero');
  check($rows[0]['warnings']===[],'reconciled row');
  fails(fn()=>Payroll::parse($path,1405,7),422);fails(fn()=>Payroll::parse($path,1405,13),422);
  foreach([['wrong_header'=>true],['duplicate'=>true],['invalid_number'=>true],['entity'=>true],['uncached_formula'=>true],['truncated'=>true]] as $option){workbook($path,$option);fails(fn()=>Payroll::parse($path,1405,6),422);}
  workbook($path,['net'=>'800']);check(count(Payroll::parse($path,1405,6)[0]['warnings'])===1,'mismatch needs warning');
  $user=['id'=>9,'username'=>'0123456789','national_code'=>'0123456789','personnel_code'=>'5001'];
  check(Payroll::matchRows($rows,[$user])[0]['user_id']===9,'two identities same user');
  $conflict=$user;$conflict['national_code']='0987654321';check(Payroll::matchRows($rows,[$conflict])[0]['match_status']==='conflict','personnel match cannot override conflicting national');
  $other=$user;$other['id']=10;$other['personnel_code']='7777';check(Payroll::matchRows($rows,[$user,$other])[0]['user_id']===null,'ambiguous national must remain private');
  check(Payroll::matchRows($rows,[])[0]['user_id']===null,'no name matching');
  $noPersonnel=$rows;$noPersonnel[0]['data']['personnel_code']='0';check(Payroll::matchRows($noPersonnel,[$user])[0]['user_id']===9,'zero personnel is missing not conflict');
  $GLOBALS['CONFIG']=['jwt_secret'=>'synthetic-test-secret'];$token=Payroll::fingerprint(1405,6,'hash',1,$rows);check($token!==Payroll::fingerprint(1405,6,'hash',2,$rows),'revision invalidates preview');
  check($token!==Payroll::fingerprint(1405,7,'hash',1,$rows),'period-bound preview');
  Db::$users=[$user];
  $preview=Payroll::applyImport($rows,'filehash','synthetic.xlsx',1405,6,false,'',false,1);
  check($preview['matched']===1 && $preview['revision']===2,'preview authoritative matching and revision');
  fails(fn()=>Payroll::applyImport($rows,'filehash','synthetic.xlsx',1405,6,true,$preview['token'],false,1),409);
  $saved=Payroll::applyImport($rows,'filehash','synthetic.xlsx',1405,6,true,$preview['token'],true,1);
  check($saved['count']===1 && $saved['revision']===3,'confirmed monthly replacement');
  check(count(Db::$inserted)===2,'one batch and one row');
  check(Db::$inserted[1][1][2]===9 && Db::$inserted[1][1][8]==='825.123456','stored user and source net');
  fails(fn()=>Payroll::applyImport($rows,'filehash','synthetic.xlsx',1405,6,true,$preview['token'],true,1),409);
  $preview=Payroll::applyImport($rows,'filehash','synthetic.xlsx',1405,6,false,'',false,1);
  Db::$users=[];fails(fn()=>Payroll::applyImport($rows,'filehash','synthetic.xlsx',1405,6,true,$preview['token'],true,1),409);Db::$users=[$user];
  Db::$failInsert=true;
  try{Payroll::applyImport($rows,'filehash','synthetic.xlsx',1405,6,true,$preview['token'],true,1);throw new Exception('failure not propagated');}catch(RuntimeException $error){check($error->getMessage()==='synthetic database failure','database failure propagated');}
  check(Db::$period['revision']===3 && count(Db::$inserted)===2 && Db::$transaction->rolledBack,'failed import is atomic');Db::$failInsert=false;
  Db::$period=['id'=>1,'batch_id'=>5,'revision'=>2];
  Payroll::listing(['user_id'=>999,'q'=>'someone','page'=>2],9);
  $list=array_values(array_filter(Db::$queries,fn($query)=>str_contains($query[0],'ORDER BY p.period_jy')))[0];
  check($list[1]===[9],'self cannot request another user');check(str_contains($list[0],'LIMIT 50 OFFSET 50'),'pagination');
  fails(fn()=>Payroll::detail(5,9),404);$query=end(Db::$queries);check($query[1]===[5,9] && str_contains($query[0],'r.user_id=?'),'detail ownership');
  Payroll::map(8,9,1);check(Db::$transaction->committed,'mapping commits');
  Db::$transaction=new PayrollTestTransaction();Db::$duplicate=true;fails(fn()=>Payroll::map(8,9,1),409);check(Db::$transaction->rolledBack,'mapping conflict rolls back');Db::$duplicate=false;
  Db::$period['batch_id']=6;fails(fn()=>Payroll::map(8,9,1),409);Db::$period['batch_id']=5;
  fails(fn()=>Payroll::map(8,-1,1),422);
  foreach(['/api/admin/payroll','/api/admin/payroll/import','/api/admin/payroll/{id}','/api/admin/payroll/{id}/match'] as $endpoint)foreach($routes[$endpoint] as $definition)check($definition[1]===false && $definition[2]===ADMIN,'admin-only API');
  foreach(['/api/my/payroll','/api/my/payroll/{id}'] as $endpoint){$definition=$routes[$endpoint]['GET'];check($definition[1]===false,'my API requires authentication');fails(fn()=>$definition[0](['id'=>1],[],['id'=>9,'allowed'=>false]),403);}
  echo 'Payroll: '.$assertions.' assertions passed'.PHP_EOL;
}finally{unlink($path);}
