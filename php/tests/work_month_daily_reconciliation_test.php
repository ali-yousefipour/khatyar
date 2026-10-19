<?php
// Isolated regression for monthly rollup vs attendance detail rows.
date_default_timezone_set('Asia/Tehran');
class ShiftCalc { static function normJdate($v) { return str_replace('/','-',trim((string)$v)); } }
$source=file_get_contents(__DIR__.'/../lib/routes.php');
$start=strpos($source,'function _work_month_daily_attendance_totals(');
$end=strpos($source,"\n// گزارش تجمیعی کارکرد ماهانه", $start);
if($start===false || $end===false) throw new RuntimeException('Monthly rollup helper was not found');
eval(substr($source,$start,$end-$start));
function eq($name,$want,$got){if($want!==$got)throw new RuntimeException("$name: expected ".json_encode($want)." actual ".json_encode($got));echo "PASS $name\n";}
$report=['days'=>[
 ['jdate'=>'1405/07/01','expected'=>'05:00','in_shift'=>'05:00','shortage'=>'00:00','worked'=>'09:54','punches'=>[['id'=>1]]],
 ['jdate'=>'1405/07/02','expected'=>'05:00','in_shift'=>'05:00','shortage'=>'00:00','punches'=>[['id'=>2]]],
 ['jdate'=>'1405/07/03','expected'=>'00:00','in_shift'=>'00:00','shortage'=>'00:00','punches'=>[['id'=>3]]],
]];
$tot=_work_month_daily_attendance_totals($report,3);
eq('no phantom monthly shortage',0,$tot['shortage']);
eq('monthly duty',600,$tot['expected']);
eq('monthly within-shift',600,$tot['in_shift']);
$report['days'][1]['shortage']='۰۱:۲۰';
$report['days'][1]['in_shift']='03:40';
$tot=_work_month_daily_attendance_totals($report,3);
eq('real shortage preserved',80,$tot['shortage']);
$report['days'][1]=['jdate'=>'1405/07/02','expected'=>'05:00','in_shift'=>'00:00','shortage'=>'05:00','punches'=>[],'annual_leave'=>'02:00'];
$tot=_work_month_daily_attendance_totals($report,3);
eq('partial leave only remaining absence',180,$tot['absent_min']);
eq('absence not double counted as shortage',0,$tot['shortage']);
$report['days'][2]['is_future']=true;
eq('future day excluded',600,_work_month_daily_attendance_totals($report,3)['expected']);
eq('truncated day range cannot silently reconcile',null,_work_month_daily_attendance_totals($report,4));
echo "All monthly attendance rollup tests passed.\n";
