<?php
date_default_timezone_set('Asia/Tehran');
$source=file_get_contents(__DIR__.'/../lib/routes.php');
$start=strpos($source,'function gregorian_to_jalali(');
$end=strpos($source,'function j_to_ts(',$start);
eval(substr($source,$start,$end-$start));
require_once (getenv('SHIFT_CALC_SOURCE')?:__DIR__.'/../lib/ShiftCalc.php');
function same($label,$expected,$actual){
  if($actual!==$expected)throw new RuntimeException($label.': '.json_encode($actual));
  echo "PASS $label\n";
}
$date='1405-07-25';
[$year,$month,$day]=jalali_to_gregorian(1405,7,25);
$base=sprintf('%04d-%02d-%02d ',$year,$month,$day);
$shift=['type'=>'advanced','daily_ot_cap'=>120,'night_calc'=>1];
$segments=[['s'=>'09:00','e'=>'17:00']];
$sessions=[['in'=>strtotime($base.'10:00'),'out'=>strtotime($base.'18:00')]];
$unassigned=ShiftCalc::dayWork(null,$date,null,$sessions,false);
same('unassigned calculation cannot create overtime',0,$unassigned['overtime']);
same('unassigned calculation has no expected duty',0,$unassigned['expected']);
same('unassigned calculation retains actual presence',480,$unassigned['worked']);
foreach([['ot_end'=>60],['ot_end'=>60,'ot_begin'=>0],['ot_end'=>60,'ot_begin'=>null]] as $config){
  $result=ShiftCalc::dayWork($shift,$date,['segments'=>$segments,'day_config'=>$config+['duty_min'=>480]],$sessions,false);
  same('end window independent of begin configuration',60,$result['overtime']);
}
$result=ShiftCalc::dayWork($shift,$date,['segments'=>$segments,'day_config'=>['ot_begin'=>60,'duty_min'=>480]],[['in'=>strtotime($base.'08:00'),'out'=>strtotime($base.'16:00')]],false);
same('begin-only window',60,$result['overtime']);
$result=ShiftCalc::dayWork($shift+['unused'=>0],$date,['segments'=>$segments,'day_config'=>['ot_end'=>60,'daily_ot'=>20,'duty_min'=>480]],$sessions,false);
same('configured daily cap still applies',20,$result['overtime']);
$result=ShiftCalc::dayWork($shift,$date,['segments'=>$segments,'day_config'=>['duty_min'=>480]],$sessions,false);
same('no windows retains base calculation',0,$result['overtime']);
$result=ShiftCalc::dayWork($shift,$date,['segments'=>[['s'=>'09:00','e'=>'12:00'],['s'=>'13:00','e'=>'17:00']],'day_config'=>['ot_begin'=>120,'ot_end'=>120,'duty_min'=>420]],[['in'=>strtotime($base.'12:15'),'out'=>strtotime($base.'12:45')]],false);
same('overlapping begin/end windows count actual time once',30,$result['overtime']);
$dayRow=['segments'=>[],'day_config'=>['type'=>'floating','traffic_start'=>'09:00','traffic_end'=>'17:00']];
same('floating calendar rejects outside traffic',false,ShiftCalc::checkThreshold($shift,$date,$dayRow,strtotime($base.'20:00'),'in')['ok']);
same('floating calendar accepts inside traffic',true,ShiftCalc::checkThreshold($shift,$date,$dayRow,strtotime($base.'10:00'),'in')['ok']);
$dayRow['day_config']['traffic_start']='22:00';$dayRow['day_config']['traffic_end']='06:00';
same('overnight traffic accepts after midnight',true,ShiftCalc::checkThreshold($shift,$date,$dayRow,strtotime($base.'02:00'),'out')['ok']);
same('overnight traffic rejects daytime',false,ShiftCalc::checkThreshold($shift,$date,$dayRow,strtotime($base.'10:00'),'in')['ok']);
same('unrestricted floating stays unrestricted',true,ShiftCalc::checkThreshold(['type'=>'floating'],$date,null,strtotime($base.'20:00'),'in')['ok']);
// Automatic Friday work must include the entire valid attendance interval, not 8h.
foreach ([['1405-07-10','09:00','21:00',720],['1405-07-17','10:00','21:00',660]] as $case) {
  [$jy,$jm,$jd]=array_map('intval',explode('-',$case[0]));
  [$gy,$gm,$gd]=jalali_to_gregorian($jy,$jm,$jd);
  $datePrefix=sprintf('%04d-%02d-%02d ',$gy,$gm,$gd);
  $friday=ShiftCalc::dayWork(['type'=>'auto','auto_expected_min'=>453,'auto_ot_cap_min'=>27],$case[0],null,
    [['in'=>strtotime($datePrefix.$case[1]),'out'=>strtotime($datePrefix.$case[2])]],false);
  same('automatic Friday full worked '.$case[0],$case[3],$friday['friday_work']);
  same('automatic Friday full overtime '.$case[0],$case[3],$friday['friday_overtime']);
  same('automatic Friday total overtime '.$case[0],$case[3],$friday['total_overtime']);
  same('automatic Friday no duty '.$case[0],0,$friday['expected']);
}
class Db {
  static $substitute=true;
  static $explicit=null;
  static $byUser=[];
  static $dayRow=null;
  static $auto=['from_jdate'=>'1404-01-01','to_jdate'=>'1404-01-31'];
  static function all($query,$params=[]){if(isset(self::$byUser[$params[0]??0]))return self::$byUser[$params[0]];return self::$explicit?[self::$explicit]:[];}
  static function one($query,$params=[]){
    if(str_contains($query,'substitute_assignments'))return self::$substitute?['absent_user_id'=>2,'request_id'=>3]:null;
    if(str_contains($query,'shift_id=0'))return self::$auto;
    return null;
  }
}
function _auto_shift_for_user($userId){return ['type'=>'auto','title'=>'automatic','id'=>0];}
$start=strpos($source,'function _active_user_shift_assignment(');
$end=strpos($source,'function _shift_day_row(',$start);
eval(substr($source,$start,$end-$start));
same('substitute cannot inherit expired automatic shift',null,_active_user_shift_assignment(1,$date));
Db::$auto=['from_jdate'=>'1405-08-01','to_jdate'=>null];
same('substitute cannot inherit future automatic shift',null,_active_user_shift_assignment(1,$date));
Db::$auto=['from_jdate'=>$date,'to_jdate'=>$date];
same('substitute inherits inclusive effective date',true,(bool)_active_user_shift_assignment(1,$date)['is_substitute_shift']);
Db::$byUser=[2=>[['id'=>17,'shift_id'=>17,'type'=>'advanced','title'=>'شیفت درخواست‌کننده','from_jdate'=>$date,'to_jdate'=>$date]],1=>[['id'=>23,'shift_id'=>23,'type'=>'rotating','title'=>'شیفت اصلی جایگزین','from_jdate'=>null,'to_jdate'=>null]]];
same('substitute uses requesters effective shift',17,_active_user_shift_assignment(1,$date)['shift_id']);
same('inherited shift retains absent user identity',2,_active_user_shift_assignment(1,$date)['absent_user_id']);
Db::$substitute=false;
same('outside active replacement own shift remains',23,_active_user_shift_assignment(1,$date)['shift_id']);
Db::$byUser=[];
Db::$substitute=false;Db::$auto=null;
same('no assignment means no automatic shift',null,_active_user_shift_assignment(1,$date));
Db::$auto=['from_jdate'=>'1404-01-01','to_jdate'=>'1404-01-31'];
same('own expired automatic shift is inactive',null,_active_user_shift_assignment(1,$date));
Db::$auto=['from_jdate'=>null,'to_jdate'=>null];
same('explicit indefinite automatic shift is active','auto',_active_user_shift_assignment(1,$date)['type']);
class Http {static function error($message,$status){throw new RuntimeException($message,$status);}}
function _shift_day_row($shiftId,$date){return Db::$dayRow;}
$start=strpos($source,'function _attendance_checkin_traffic(');
$end=strpos($source,'// ثبت ورود',$start);
eval(substr($source,$start,$end-$start));
Db::$explicit=['id'=>4,'shift_id'=>4,'type'=>'advanced','from_jdate'=>null,'to_jdate'=>null];
Db::$dayRow=['day_config'=>['type'=>'floating','traffic_start'=>'09:00','traffic_end'=>'17:00']];
try{
  _attendance_checkin_traffic(1,$base.'20:00');
  throw new RuntimeException('Outside check-in was accepted');
}catch(Throwable $error){same('actual check-in rejects outside calendar window',422,$error->getCode());}
same('actual check-in accepts inside window',null,_attendance_checkin_traffic(1,$base.'10:00'));
Db::$dayRow=['day_config'=>[]];
same('check-in without configured window unchanged',null,_attendance_checkin_traffic(1,$base.'20:00'));
Db::$explicit=null;Db::$auto=null;
same('unassigned raw presence is not blocked',null,_attendance_checkin_traffic(1,$base.'20:00'));
$checkinStart=strpos($source,"route('POST', '/api/my/checkin',");
$checkinEnd=strpos($source,"route('POST', '/api/my/checkout',",$checkinStart);
same('check-in route invokes calendar guard',true,str_contains(substr($source,$checkinStart,$checkinEnd-$checkinStart),'_attendance_checkin_traffic((int)$u[\'id\'],$eventAt)'));
foreach(['routes.php','../app/api/daily-performance-gps-separate.php','../app/api/admin-attendance-report.php'] as $file){
  $code=file_get_contents(__DIR__.'/../lib/'.$file);
  same('no implicit fallback in '.$file,0,preg_match('/_active_user_shift_assignment\([^;\n]+\)\s*\?:\s*_auto_shift_for_user/',$code));
}
