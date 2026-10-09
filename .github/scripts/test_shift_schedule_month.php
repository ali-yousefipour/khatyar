<?php
declare(strict_types=1);
date_default_timezone_set('UTC');

$path = dirname(__DIR__, 2) . '/php/lib/routes.php';
$source = file_get_contents($path);
$fnStart = strpos($source, 'function jalali_to_gregorian(');
$fnEnd = strpos("\nfunction j_to_ts(", $source, $fnStart);
if ($fnStart === false || $fnEnd === false) throw new RuntimeException('Could not extract production Jalali converter');
eval(substr($source, $fnStart, $fnEnd-$fnStart));

function monthDayCount(int $jy, int $jm): int {
  $nextY=$jy; $nextM=$jm+1;
  if($nextM>12){$nextM=1;$nextY++;}
  [$gy,$gm,$gd]=jalali_to_gregorian($jy,$jm,1);
  [$ny,$nm,$nd]=jalali_to_gregorian($nextY,$nextM,1);
  $start=mktime(12,0,0,(int)$gm,(int)$gd,(int)$gy);
  $next=mktime(12,0,0,(int)$nm,(int)$nd,(int)$ny);
  return (int)round(($next-$start)/86400);
}
$expected = [[1405,6,31],[1405,7,30],[1405,8,30],[1405,12,29],[1406,1,31]];
foreach($expected as [$y,$m,$want]){
  $got=monthDayCount($y,$m);
  if($got!==$want) throw new RuntimeException("Jalali month {$y}/{$m}: expected {$want} days, got {$got}");
  echo "PASS Jalali month {$y}/{$m}: {$got} days\n";
}
$start=strpos($source, "route('GET', '/api/my/shift-schedule'");
$end=strpos("\nroute('GET', '/api/my/work-summary'", $source, $start);
if($start===false||$end===false)throw new RuntimeException('Shift schedule route not found');
$route=substr($source,$start,$end-$start);
if(strpos($route,'mktime(12,0,0,...jalali_to_gregorian')!==false)throw new RuntimeException('Broken mktime argument spread remains');
foreach(["'shift_title'=>$dayShift['title']??''","'is_no_shift'=>$noShift","MONTH_START_MKTIME_ORDER_FIX"] as $needle){
  if(strpos($route,$needle)===false)throw new RuntimeException("Missing shift schedule fix marker: {$needle}");
}
echo "PASS shift route uses correct Gregorian mktime order and per-day assignment data\n";
