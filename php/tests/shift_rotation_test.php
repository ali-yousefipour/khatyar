<?php
date_default_timezone_set('Asia/Tehran');
set_error_handler(static function($severity,$message,$file,$line){throw new ErrorException($message,0,$severity,$file,$line);});
class Http {static function error($message,$code=400){throw new RuntimeException($message,$code);}}
const ADMIN=3;
$routes=[];
function route($method,$path,$handler,$public=false,$level=99){$GLOBALS['routes'][$path]=compact('method','handler','public','level');}
$allowed=true;
function _monthly_work_report_need($user){if(!$GLOBALS['allowed'])Http::error('Denied',403);}
$final=null;$people=[['id'=>1,'first_name'=>'کاربر','last_name'=>'نمونه','national_code'=>'0012345678','personnel_code'=>'0007'],['id'=>2,'first_name'=>'بدون تردد','last_name'=>'','username'=>'0099999999','personnel_code'=>'0008']];
function _final_work_month($y,$m){return $GLOBALS['final'];}
function _work_snapshot_decode($json){return json_decode($json,true,512,JSON_THROW_ON_ERROR);}
function _work_month_people(){return $GLOBALS['people'];}
class Db {
  static $rows=[],$queries=[];
  static function all($sql,$params=[]){self::$queries[]=[$sql,$params];return self::$rows;}
}
$source=file_get_contents(__DIR__.'/../lib/routes.php');
$start=strpos($source,'function gregorian_to_jalali(');$end=strpos($source,'function j_to_ts(',$start);
eval(substr($source,$start,$end-$start));
$start=strpos($source,'function _shift_rotation_stamp(');$end=strpos($source,'// ==================== گزارش تردد پرسنل',$start);
if($start===false||$end===false)throw new LogicException('Rotation functions missing');
eval(str_replace('__DIR__',var_export(dirname(__DIR__).'/lib',true),substr($source,$start,$end-$start)));
require_once __DIR__.'/../lib/XlsxWriter.php';
function check($ok,$message){if(!$ok)throw new LogicException($message);}
function closeTo($value,$expected,$message){check(abs($value-$expected)<0.0000001,$message);}
function punch($time,$id,$date='2026-09-23',$out=null){return ['user_id'=>1,'attendance_id'=>$id,'check_in'=>$date.' '.$time,'check_out'=>$out];}
$a=new DateTimeImmutable('2026-09-23 00:00:00',new DateTimeZone('Asia/Tehran'));$b=$a->modify('+30 days');
$r=_shift_rotation_rows($people,[punch('05:00:00',1),punch('10:00:00',2),punch('14:00:00',3)],$a,$b);
closeTo($r[0]['morning'],0.5,'morning/afternoon split');closeTo($r[0]['afternoon'],0.5,'afternoon split');
check($r[0]['matched_days']===1&&$r[1]['morning']===0,'one day counted once; zero-attendance person retained');
check($r[0]['open_sessions']===3,'entry-only records classified and flagged');
foreach(['04:59:59'=>'outside','05:00:00'=>'morning','11:00:59'=>'morning','11:01:00'=>'outside','13:59:59'=>'outside','14:00:00'=>'afternoon','18:00:59'=>'afternoon','18:01:00'=>'outside','20:59:59'=>'outside','21:00:00'=>'night','23:00:59'=>'night','23:01:00'=>'outside'] as $time=>$kind){
  $row=_shift_rotation_rows($people,[punch($time,1)],$a,$b)[0];
  check($kind==='outside'?$row['outside_days']===1:$row[$kind]===1,'inclusive minute boundary '.$time);
}
$row=_shift_rotation_rows($people,[punch('06:00:00',1),punch('15:00:00',2),punch('22:00:00',3)],$a,$b)[0];
foreach(['morning','afternoon','night'] as $key)closeTo($row[$key],1/3,'three-shift share '.$key);
$row=_shift_rotation_rows($people,[punch('22:00:00',1,'2026-09-23','2026-09-24 06:00:00')],$a,$b)[0];
check($row['night']===1&&$row['morning']===0&&$row['open_sessions']===0,'night belongs only to entry day');
$row=_shift_rotation_rows($people,[punch('06:00:00',1),punch('06:00:00',1),punch('12:00:00',2)],$a,$b)[0];
check($row['morning']===1&&$row['outside_days']===1&&$row['open_sessions']===2,'duplicate IDs ignored; outside entry does not dilute classified day');
$row=_shift_rotation_rows($people,[punch('06:00:00',1,'2026-09-22'),punch('06:00:00',2,'2026-10-23'),punch('not-a-time',3)],$a,$b)[0];
check($row['matched_days']===0,'half-open month bounds and malformed entries');
Db::$rows=[punch('06:00:00',1),punch('15:00:00',2)];Db::$queries=[];
$report=_shift_rotation_report(1405,7);
check(count(Db::$queries)===1&&Db::$queries[0][1]===['2026-09-23 00:00:00','2026-10-23 00:00:00'],'one bounded batch attendance query');
check(str_contains(Db::$queries[0][0],'u.is_active=1'),'live report only active personnel');
check($report['source']==='live'&&$report['totals']['matched_days']===1&&count($report['rows'])===2,'live report totals');
check($report['rows'][0]['national_code']==='0012345678'&&$report['rows'][0]['personnel_code']==='0007','identity strings retained');
_shift_rotation_report(1403,12);
check(end(Db::$queries)[1]===['2025-02-19 00:00:00','2025-03-21 00:00:00'],'leap Esfand range');
foreach([[1299,1],[1405,0],[1405,13]] as [$year,$month]){try{_shift_rotation_report($year,$month);throw new LogicException('invalid period accepted');}catch(RuntimeException $e){check($e->getCode()===422,'period validation');}}
$frozen=['user'=>['name'=>'نام تاریخی','pcode'=>'0011'],'days'=>[['jdate'=>'1405/07/01','punches'=>[['id'=>70,'in_full'=>'2026-09-23 22:00:00','out_full'=>'2026-09-24 06:00:00']]]]];
$final=['monthly_json'=>'[]','daily_json'=>json_encode([1=>$frozen])];Db::$queries=[];
$stored=_shift_rotation_report(1405,7);
check(Db::$queries===[]&&$stored['source']==='finalized'&&$stored['rows'][0]['night']===1,'frozen report cannot query live punches');
check($stored['rows'][0]['name']==='نام تاریخی'&&$stored['rows'][0]['national_code']===''&&$stored['rows'][0]['personnel_code']==='0011','historical identities cannot use current users');
$final=['monthly_json'=>json_encode([['user_id'=>1,'name'=>'ناقص']]),'daily_json'=>'[]'];
$missing=_shift_rotation_report(1405,7);
check($missing['rows'][0]['morning']===null&&$missing['missing_source_count']===1,'missing old snapshot is not fabricated as zero');
foreach($routes as $path=>$route){check(!$route['public']&&$route['level']===ADMIN,'report/export remain admin-only');}
$allowed=false;
foreach($routes as $route){try{$route['handler']([],[],[]);throw new LogicException('permission bypass');}catch(RuntimeException $e){check($e->getCode()===403,'monthlyworkreport permission');}}
if(($argv[1]??'')==='--xlsx'){
  $report['rows'][1]['name']='=HYPERLINK("https://example.invalid")';
  _shift_rotation_xlsx($report);
}
echo "PASS shift rotation: boundaries, daily shares, overnight, raw/frozen sources, identity, periods, permissions\n";
