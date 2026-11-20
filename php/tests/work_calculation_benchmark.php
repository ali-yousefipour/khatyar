<?php
declare(strict_types=1);
// Exercise real shift calculations and monthly reconciliation using synthetic fixtures.
date_default_timezone_set('Asia/Tehran');
$source=file_get_contents(__DIR__.'/../lib/routes.php');
$start=strpos($source,'function gregorian_to_jalali(');
$end=strpos($source,'function j_to_ts(',$start);
if($start===false||$end===false)throw new RuntimeException('Calendar helpers missing');
eval(substr($source,$start,$end-$start));
require_once __DIR__.'/../lib/ShiftCalc.php';
$start=strpos($source,'function _work_month_daily_attendance_totals(');
$end=strpos($source,"\n// گزارش تجمیعی کارکرد ماهانه",$start);
if($start===false||$end===false)throw new RuntimeException('Monthly rollup helper missing');
eval(substr($source,$start,$end-$start));
$days=[];
for($d=1;$d<=30;$d++){
    $j=sprintf('1405-07-%02d',$d);
    [$y,$m,$day]=jalali_to_gregorian(1405,7,$d);
    $prefix=sprintf('%04d-%02d-%02d ',$y,$m,$day);
    $days[]=[$j,[['in'=>strtotime($prefix.'09:00'),'out'=>strtotime($prefix.'17:00')]]];
}
$shift=['type'=>'advanced','daily_ot_cap'=>120,'night_calc'=>1];
$dayRow=['segments'=>[['s'=>'09:00','e'=>'17:00']],'day_config'=>['duty_min'=>480]];
$sample=ShiftCalc::dayWork($shift,$days[0][0],$dayRow,$days[0][1],false);
if($sample['worked']!==480)throw new RuntimeException('Unexpected shift fixture');
$start=hrtime(true);
$checksum=0;
for($u=0;$u<500;$u++){
    foreach($days as [$j,$sessions]){
        $result=ShiftCalc::dayWork($shift,$j,$dayRow,$sessions,false);
        if($result['worked']!==480)throw new RuntimeException('Work duration changed');
        $checksum+=$result['worked'];
    }
}
$shiftMs=(hrtime(true)-$start)/1e6;
if($checksum!==7200000)throw new RuntimeException('Shift checksum mismatch');
$report=['days'=>array_map(static fn($day)=>['jdate'=>$day[0],'expected'=>'08:00','in_shift'=>'08:00','shortage'=>'00:00','worked'=>'08:00','punches'=>[['id'=>1]]],$days)];
$start=hrtime(true);
for($u=0;$u<500;$u++){
    $tot=_work_month_daily_attendance_totals($report,30);
    if($tot===null||$tot['expected']!==14400||$tot['in_shift']!==14400||$tot['shortage']!==0)throw new RuntimeException('Monthly totals changed');
}
echo json_encode(['synthetic_users'=>500,'shift_days'=>15000,'shift_ms'=>round($shiftMs,2),'monthly_rollup_ms'=>round((hrtime(true)-$start)/1e6,2),'peak_bytes'=>memory_get_peak_usage(true)],JSON_THROW_ON_ERROR).PHP_EOL;
