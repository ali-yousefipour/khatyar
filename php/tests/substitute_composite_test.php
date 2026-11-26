<?php
declare(strict_types=1);
date_default_timezone_set('Asia/Tehran');
require __DIR__.'/../lib/LeaveSubstituteCoverage.php';
require __DIR__.'/../lib/ShiftCalc.php';
$source=file_get_contents(__DIR__.'/../lib/routes.php');
$a=strpos($source,'function gregorian_to_jalali(');$b=strpos($source,'function j_to_ts(',$a);eval(substr($source,$a,$b-$a));
$assignmentTableExists=true;
function _db_table_exists_safe($name){return $GLOBALS['assignmentTableExists'];}
class Db {
 static array $requests=[];static array $assignments=[];static array $hourly=[];static bool $ownDuty=false;static bool $ownAdjacent=false;static bool $explicitDuty=false;
 static function all($sql,$args=[]){
  if(str_contains($sql,'FROM user_shifts us')&&$args[0]===9&&!self::$ownDuty)return [];
  if(str_contains($sql,'FROM user_shifts us'))return [['shift_id'=>$args[0],'id'=>$args[0],'type'=>'advanced','title'=>'shift','is_active'=>1,'overtime_cap_min'=>$args[0]===4?60:30]];
  if(str_contains($sql,"FROM requests WHERE user_id=? AND status='approved' AND unit='hourly'"))return self::$hourly;
  if(str_contains($sql,'FROM requests WHERE substitute_user_id'))return array_values(array_filter(self::$requests,fn($r)=>$r['id']!==$args[1]));
  if(str_contains($sql,'FROM substitute_assignments sa'))return self::$assignments;
  throw new LogicException($sql);
 }
}
function _shift_day_row($id,$date){
 if($id<0)return LeaveSubstituteCoverage::syntheticDay($id,$date);
 if($id===9&&Db::$ownAdjacent)return ['segments'=>[['s'=>'00:00','e'=>'06:00']],'day_config'=>[]];
 return ['segments'=>[['s'=>$id===1?'06:00':($id===2?'14:00':'12:00'),'e'=>$id===1?'14:00':'22:00']],'day_config'=>Db::$explicitDuty?['duty_min'=>480]:[]];
}
function ok($test,$label){if(!$test)throw new RuntimeException($label);echo 'PASS '.$label."\n";}
$a=['id'=>1,'user_id'=>1,'from_jdate'=>'1405-09-10','to_jdate'=>'1405-09-10'];
$b=['id'=>2,'user_id'=>2,'from_jdate'=>'1405-09-10','to_jdate'=>'1405-09-10'];
$c=['id'=>3,'user_id'=>3,'from_jdate'=>'1405-09-10','to_jdate'=>'1405-09-10'];
ok(LeaveSubstituteCoverage::compatibleRequests($a,$b),'adjacent matching-policy requests compatible');
ok(!LeaveSubstituteCoverage::compatibleRequests($a,$c),'overlap rejected');
Db::$requests=[$b];
ok(LeaveSubstituteCoverage::preciseConflict(9,$a)===null,'adjacency allowed by shared guard');
Db::$requests=[$c];
ok(LeaveSubstituteCoverage::preciseConflict(9,$a)!==null,'overlap rejected by shared guard');
Db::$assignments=[['request_id'=>1,'absent_user_id'=>1],['request_id'=>2,'absent_user_id'=>2]];
$composite=LeaveSubstituteCoverage::composite(9,'1405-09-10');
ok($composite['shift_id']<0,'composite synthetic identity');
$row=LeaveSubstituteCoverage::syntheticDay($composite['shift_id'],'1405-09-10');
ok(count($row['segments'])===2,'both source segments retained');
ok($row['segments'][1]['request_id']===2,'source request preserved');
ok(ShiftCalc::expectedMinutes($composite,'1405-09-10',$row)===960,'composite duty includes both shifts');

$day=ShiftCalc::dayWork($composite,'1405-09-10',$row,[['in'=>strtotime('2026-12-01 06:00:00'),'out'=>strtotime('2026-12-01 22:00:00')]],false);
ok($day['expected']===960,'dayWork expects both shifts');
ok($day['shortage']===0,'continuous attendance covers adjacent shifts without shortage');

Db::$requests=[];Db::$ownDuty=true;
ok(LeaveSubstituteCoverage::preciseConflict(9,$a)!==null,'own permanent duty overlap rejected');
Db::$ownDuty=false;
Db::$hourly=[['id'=>80,'from_jdate'=>'1405-09-10','to_jdate'=>'1405-09-10','from_time'=>'14:00','to_time'=>'15:00']];
ok(LeaveSubstituteCoverage::preciseConflict(9,$a)===null,'adjacent hourly absence does not block morning');
Db::$hourly[0]['from_time']='13:59';
ok(LeaveSubstituteCoverage::preciseConflict(9,$a)!==null,'overlapping hourly absence rejected');
$d=array_replace($b,['user_id'=>4]);
ok(!LeaveSubstituteCoverage::compatibleRequests($a,$d),'different financial policies fail closed');

Db::$hourly=[];Db::$requests=[];Db::$ownDuty=true;Db::$ownAdjacent=true;
ok(LeaveSubstituteCoverage::preciseConflict(9,$a)===null,'matching adjacent own duty can coexist');
Db::$assignments=[['request_id'=>1,'absent_user_id'=>1]];
$combined=LeaveSubstituteCoverage::composite(9,'1405-09-10');
$row=LeaveSubstituteCoverage::syntheticDay($combined['shift_id'],'1405-09-10');
ok(count($row['segments'])===2,'single replacement and own duty both preserved');
ok(ShiftCalc::expectedMinutes($combined,'1405-09-10',$row)===840,'own six hours plus cover eight hours expected');

$assignmentTableExists=false;
ok(LeaveSubstituteCoverage::composite(9,'1405-09-10')===null,'legacy missing assignment table skips composite');

$assignmentTableExists=true;Db::$ownDuty=false;Db::$explicitDuty=true;
Db::$assignments=[['request_id'=>1,'absent_user_id'=>1],['request_id'=>2,'absent_user_id'=>2]];
$combined=LeaveSubstituteCoverage::composite(9,'1405-09-10');
$row=LeaveSubstituteCoverage::syntheticDay($combined['shift_id'],'1405-09-10');
ok($row['day_config']['duty_min']===960,'explicit duty is summed per independent assignment');
ok(ShiftCalc::expectedMinutes($combined,'1405-09-10',$row)===960,'explicit advanced duty includes both shifts');

$start=strpos($source,'function _active_user_shift_assignment_uncached(');
$end=strpos($source,'function _shift_day_row(',$start);
eval(substr($source,$start,$end-$start));
$runtime=_active_user_shift_assignment_uncached(9,'1405-09-10');
ok($runtime['shift_id']<0,'runtime effective assignment selects composite');
$runtimeDay=_shift_day_row($runtime['shift_id'],'1405-09-10');
ok(count($runtimeDay['segments'])===2,'runtime day row retains both assignments');
$result=ShiftCalc::dayWork($runtime,'1405-09-10',$runtimeDay,[['in'=>strtotime('2026-12-01 06:00:00'),'out'=>strtotime('2026-12-01 22:00:00')]],false);
ok($result['expected']===960&&$result['shortage']===0,'runtime composite dayWork preserves complete financial duty');
