<?php
date_default_timezone_set('Asia/Tehran');
class Http { static function error($message,$code) { throw new RuntimeException($message,$code); } }
class Db {
  static $columns=2;
  static $start='1405-07-02';
  static $end='1405-07-03';
  static $writes=[];
  static $queries=[];
  static function one($sql,$params=[]) {
    self::$queries[]=$sql;
    return str_contains($sql,'information_schema')?['n'=>self::$columns]:['employment_start_date'=>self::$start,'employment_end_date'=>self::$end];
  }
  static function run($sql,$params=[]) { self::$writes[]=[$sql,$params]; }
  static function all($sql,$params=[]) { self::$queries[]=$sql; return []; }
}
class ShiftCalc {
  static function normJdate($value) { return $value?str_replace('/','-',$value):null; }
  static function isFriday($date) { return false; }
}
require_once __DIR__.'/../lib/IranCalendar.php';
$routesSource=file_get_contents(__DIR__.'/../lib/routes.php');
$start=strpos($routesSource,'function gregorian_to_jalali(');
$end=strpos($routesSource,'function j_to_ts(',$start);
eval(substr($routesSource,$start,$end-$start));
$source=file_get_contents(__DIR__.'/../app/index.php');
$marker="static function(\$params,\$body,\$user) use (\$originalHandler,\$routeMethod,\$routePath) {";
$start=strpos($source,$marker);
$end=strpos($source,"\n  };",$start);
$originalCalls=0;
$originalHandler=function() use (&$originalCalls) { $originalCalls++; return ['ok'=>true]; };
$routeMethod='PUT'; $routePath='/api/admin/users/{id}';
$handler=eval('return '.substr($source,$start,$end-$start)."\n};");
function check($condition,$message) { if (!$condition) throw new LogicException($message); }
foreach ([['employment_start_date'=>'1405-07-31'],['employment_end_date'=>'1405-07-01'],['employment_start_date'=>'not-a-date']] as $body) {
  try { $handler(['id'=>1],$body,[]); throw new LogicException('Invalid employment date accepted'); }
  catch (RuntimeException $error) { check($error->getCode()===422,'Expected validation failure'); }
}
check($originalCalls===0 && Db::$writes===[],'Invalid dates must not partially modify user profile');
Db::$columns=0;
try { $handler(['id'=>1],['employment_start_date'=>'1405-07-02'],[]); throw new LogicException('Missing migration accepted'); }
catch (RuntimeException $error) { check($error->getCode()===503,'Missing columns must be explicit'); }
check($originalCalls===0,'Missing migration must not modify profile');
Db::$columns=2;
$handler(['id'=>1],['employment_start_date'=>'1405/07/02','employment_end_date'=>'1405-07-03'],[]);
check($originalCalls===1 && Db::$writes[0][1]===['1405-07-02','1405-07-03',1],'Valid inclusive range must persist normalized dates');
$GLOBALS['frozen']=false;
function _frozen_attendance_report($id,$from,$to) { return $GLOBALS['frozen']?['frozen'=>true]:null; }
function _attendance_report($id,$from,$to) {
  $days=[];
  foreach (['1405/07/01','1405/07/02','1405/07/03','1405/07/04'] as $date) $days[]=['jdate'=>$date,'worked'=>'08:00','expected'=>'08:00','shortage'=>'08:00','gps_inactive_minutes'=>60,'absent'=>1,'punches'=>[['id'=>99]]];
  return ['days'=>$days];
}
function _active_user_shift_assignment($id,$date) { return null; }
function _attendance_adjusted_overtime($id,$date) { return 0; }
require __DIR__.'/../app/api/admin-attendance-report-owned.php';
$report=attendance_report_owned_by_entry_date(1,'1405-07-01','1405-07-04');
foreach ([0,3] as $index) {
  $day=$report['days'][$index];
  check($day['outside_employment_period'] && $day['worked']==='00:00' && $day['expected']==='00:00' && $day['shortage']==='00:00','Outside employment metrics must be zero');
  check($day['absent']===0 && $day['gps_inactive_minutes']===0 && $day['punches'][0]['id']===99,'No artificial absence/GPS penalties; preserve audit punches');
}
check(empty($report['days'][1]['outside_employment_period']) && empty($report['days'][2]['outside_employment_period']),'Employment start/end boundaries must be inclusive');
$GLOBALS['frozen']=true; Db::$queries=[];
check(attendance_report_owned_by_entry_date(1,'1405-07-01','1405-07-04')===['frozen'=>true] && Db::$queries===[],'Frozen reports must remain unchanged by live employment dates');
echo "PASS employment period: validation before profile mutation, missing migration, Jalali month length, normalized save, canonical report boundaries, preserved punches and frozen history\n";
