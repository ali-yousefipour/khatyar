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
