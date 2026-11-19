<?php
// Regression: confirmed device-off evidence must respect administrator waivers
// without deleting the underlying user_activity records.
date_default_timezone_set('Asia/Tehran');
require_once __DIR__.'/../lib/GpsWorkIntervals.php';
require_once __DIR__.'/../lib/InternetWorkIntervals.php';

class Db {
  public static array $gpsWaivers=[];
  public static array $internetWaivers=[];
  public static array $events=[];
  public static function one($sql,$args=[]) {
    if(str_contains($sql,'security_exempt'))return ['security_exempt'=>0];
    if(str_contains($sql,'internet_work_required'))return ['value'=>'true'];
    throw new RuntimeException('Unexpected single-row query: '.$sql);
  }
  public static function all($sql,$args=[]) {
    if(str_contains($sql,'FROM gps_work_waivers'))return self::$gpsWaivers;
    if(str_contains($sql,'FROM internet_work_waivers'))return self::$internetWaivers;
    if(str_contains($sql,'FROM user_activity'))return self::$events;
    throw new RuntimeException('Unexpected multi-row query: '.$sql);
  }
  public static function run($sql,$args=[]) { return null; }
}
function same($title,$expected,$actual) {
  if($expected!==$actual)throw new RuntimeException($title.' expected '.json_encode($expected).' got '.json_encode($actual));
  echo 'PASS '.$title.PHP_EOL;
}
$start=strtotime('2026-11-15 10:00:00');
Db::$gpsWaivers=[['start_at'=>'2026-11-15 10:10:00','end_at'=>'2026-11-15 10:40:00']];
same('GPS waiver excludes exactly its covered minutes',[
  [$start,$start+600],[$start+2400,$start+3600],
],gps_work_effective_intervals(41,[[$start,$start+3600]]));
same('GPS no-waiver does not lose minutes',[[$start,$start+3600]],(function(){
  Db::$gpsWaivers=[];
  return gps_work_effective_intervals(41,[[$GLOBALS['start'],$GLOBALS['start']+3600]]);
})());
Db::$events=[
  ['kind'=>'offline','at'=>'2026-11-15 10:00:00'],
  ['kind'=>'online','at'=>'2026-11-15 11:01:00'],
];
$session=[['check_in'=>'2026-11-15 10:00:00','check_out'=>'2026-11-15 11:00:00']];
same('legacy internet offline is counted after recovery',60,array_sum(array_column(internet_work_daily_details(41,$session),'minutes')));
Db::$internetWaivers=[['start_at'=>'2026-11-15 10:00:00','end_at'=>'2026-11-15 11:00:00']];
same('waived internet outage has zero effective minutes',0,array_sum(array_column(internet_work_daily_details(41,$session),'minutes')));
Db::$internetWaivers=[['start_at'=>'2026-11-15 10:10:00','end_at'=>'2026-11-15 10:40:00']];
same('partial internet waiver excludes only covered minutes',30,array_sum(array_column(internet_work_daily_details(41,$session),'minutes')));
Db::$internetWaivers=[];
same('removed internet waiver restores confirmed minutes',60,array_sum(array_column(internet_work_daily_details(41,$session),'minutes')));
echo "PASS device-off waiver regressions\n";
