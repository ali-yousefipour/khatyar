<?php
require_once __DIR__.'/../lib/ShiftCalc.php';
$source=file_get_contents(__DIR__.'/../lib/routes.php');
date_default_timezone_set('Asia/Tehran');
$calendarStart=strpos($source,'function gregorian_to_jalali(');
$calendarEnd=strpos($source,'function j_to_ts(',$calendarStart);
eval(substr($source,$calendarStart,$calendarEnd-$calendarStart));
$start=strpos($source,'function _work_organization_period(');
$end=strpos($source,'function _work_forecast_rows(',$start);
if($start===false||$end===false)throw new RuntimeException('Period helper missing');
eval(substr($source,$start,$end-$start));
function verifyPeriod($a,$b){if($a!==$b)throw new RuntimeException(json_encode([$a,$b]));}
$clock=new DateTimeImmutable('2026-11-20 00:15:00',new DateTimeZone('Asia/Tehran'));
[$y,$m,$d]=gregorian_to_jalali(2026,11,20);
[$py,$pm,$pd]=gregorian_to_jalali(2026,11,19);
$today=sprintf('%04d-%02d-%02d',$y,$m,$d);$prior=sprintf('%04d-%02d-%02d',$py,$pm,$pd);
$p=_work_organization_period($y,$m,$clock);
verifyPeriod($p['actual_end'],$prior);verifyPeriod($p['forecast_start'],$today);
$first=_work_organization_period($y,$m,new DateTimeImmutable(date('Y-m-d',ShiftCalc::jdateToTs($p['first'])).' 12:00:00',new DateTimeZone('Asia/Tehran')));
if($first['actual_end']>=$first['first'])throw new RuntimeException('First day must have no actuals');
$future=_work_organization_period($y,$m+1,$clock);
verifyPeriod($future['forecast_start'],$future['first']);
if($future['actual_end']>=$future['first'])throw new RuntimeException('Future month must have no actuals');
$past=_work_organization_period($y,$m-1,$clock);
verifyPeriod($past['actual_end'],$past['end']);
if($past['forecast_start']<=$past['end'])throw new RuntimeException('Past month must have no forecast');
verifyPeriod(_work_organization_period($y,$m,$clock->setTimezone(new DateTimeZone('UTC'))),$p);
echo "PASS organization Tehran cutoff and actual/forecast separation\n";

verifyPeriod(_work_forecast_fraction(480,120),0.75);
verifyPeriod(_work_forecast_fraction(480,480),0.0);
verifyPeriod(_work_forecast_fraction(480,0),1.0);

$workingDate=$prior;
foreach([453,360,300,0] as $duty){
    verifyPeriod(_work_leave_daily_duty(['type'=>'auto','auto_expected_min'=>$duty],$workingDate),$duty);
    verifyPeriod(_work_leave_daily_duty(['type'=>'floating','float_minutes'=>$duty],$workingDate),$duty);
}
verifyPeriod(_work_leave_daily_duty(['type'=>'auto','auto_expected_min'=>453],$today),0);
verifyPeriod(_work_leave_daily_duty(null,$workingDate),0);
verifyPeriod(_work_leave_daily_duty(['type'=>'auto','auto_expected_min'=>453],$workingDate,['is_off'=>1]),0);
verifyPeriod(_work_forecast_fraction(360,120),1-120/360);
verifyPeriod(_work_forecast_fraction(300,300),0.0);
echo "PASS shift-specific daily leave duty and hourly forecast\n";

$cycle=['type'=>'rotating','advanced'=>['rotation'=>['cycle_start_jdate'=>'1405-08-01']]];
verifyPeriod(_work_operator_rotation_percentage(_work_operator_cycle_kinds($cycle)),'15');
$cycle['advanced']['rotation']['cycle']=[
 ['days'=>7,'segments'=>[['s'=>'07:00','e'=>'15:00']]],
 ['days'=>7,'segments'=>[['s'=>'15:00','e'=>'23:00']]],
];
verifyPeriod(_work_operator_rotation_percentage(_work_operator_cycle_kinds($cycle)),'10');
verifyPeriod(_work_operator_rotation_percentage(_work_operator_shift_kinds([['s'=>'07:00','e'=>'15:00'],['s'=>'15:00','e'=>'23:00']])),'10');
verifyPeriod(_work_operator_rotation_percentage(_work_operator_shift_kinds([['s'=>'07:00','e'=>'15:00']])),'');
verifyPeriod(_work_operator_rotation_percentage(['morning'=>true,'afternoon'=>true,'unknown'=>true]),'');

foreach(['نیروی صدور پروانه','رئیس اداره بازرسی','معاونت بازرسی','مدیر کل','نماینده اجرایی'] as $role)verifyPeriod(_work_organization_excluded_role($role),true);
verifyPeriod(_work_organization_excluded_role('بازرس مقیم'),false);
