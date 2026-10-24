<?php
class Db {
  static $received=false,$telemetry=false,$netTable=true,$sql='';
  static function one($sql,$params=[]){if(str_starts_with($sql,'SHOW TABLES'))return self::$netTable?['Tables_in_db'=>'user_net_state']:null;return self::$received?['Field'=>'received_at']:null;}
  static function all($sql,$params=[]){if(str_starts_with($sql,'SHOW COLUMNS'))return self::$telemetry ? array_map(static fn($name)=>['Field'=>$name],['ip_country','vpn_on','battery_level','battery_charging','last_ip','via_gsm']) : []; self::$sql=$sql;return [];}
  static function run($sql,$params=[]){throw new LogicException('Read path must not change schema');}
}
$source=file_get_contents(__DIR__.'/../lib/routes.php');
$helperStart=strpos($source,'function _live_location_sql(');$helperEnd=strpos($source,"route('GET', '/api/locations/live'",$helperStart);
eval(substr($source,$helperStart,$helperEnd-$helperStart));
$marker="route('GET', '/api/locations/live', ";$start=strpos($source,$marker)+strlen($marker);$end=strpos($source,'}, false, ADMIN);',$start);
$handler=eval('return '.substr($source,$start,$end-$start).'};');
function check($condition,$message){if(!$condition)throw new LogicException($message);}
foreach([false,true] as $received){foreach([false,true] as $shift){foreach([false,true] as $telemetry){foreach([false,true] as $netTable){
  Db::$netTable=$netTable;
  Db::$telemetry=$telemetry;
  Db::$received=$received;$_GET=$shift?['shift_only'=>1]:[];$handler([],[],['id'=>1]);
  check(!str_contains(Db::$sql,'GROUP BY'),'Live query must not group the full ping history');
  check(str_contains(Db::$sql,'last_ping.user_id=u.id'),'Latest point lookup must be scoped to one user');
  check(str_contains(Db::$sql,'MAX(last_ping.id)'),'Current ping should use server insertion sequence without a per-user filesort');
  check(!str_contains(Db::$sql,'ORDER BY'),'Live query should not sort all of a user\'s pings');
  check(str_contains(Db::$sql,'lp.received_at')===$received,'Legacy databases must not reference absent received_at');
  check(str_contains(Db::$sql,'WHERE EXISTS')===$shift,'Shift filter must not duplicate users');
  foreach([' AS received_at',' AS online',' AS secs_ago',' AS via_gsm',' AS vpn_on',' AS battery_level',' AS battery_charging',' AS last_ip'] as $field)check(str_contains(Db::$sql,$field),'Preserve response field '.$field);
  check(str_contains(Db::$sql,'lp.via_gsm')===$telemetry,'Optional GSM telemetry column should only be referenced when present');
  check(str_contains(Db::$sql,'ns.vpn_on')===($telemetry&&$netTable),'Optional VPN telemetry column should only be referenced when present');
  check(str_contains(Db::$sql,'LEFT JOIN user_net_state')===$netTable,'Network state join must match deployed schema');
}}}}
echo "PASS live map query: legacy/current timestamp schema, per-user latest point, deterministic ties, shift isolation and response fields\n";

// Presence must never aggregate the complete ping history for every refresh.
$presenceMarker="route('GET', '/api/admin/presence', ";
$presenceStart=strpos($source,$presenceMarker)+strlen($presenceMarker);
$presenceEnd=strpos($source,'}, false, ADMIN);',$presenceStart);
check($presenceStart>=strlen($presenceMarker) && $presenceEnd!==false,'Presence handler must exist');
$presenceHandler=eval('return '.substr($source,$presenceStart,$presenceEnd-$presenceStart).'};');
$presenceHandler([],[],['id'=>1]);
check(!str_contains(Db::$sql,'GROUP BY'),'Presence must not aggregate the full ping history');
check(str_contains(Db::$sql,'lp1.user_id=u.id'),'Presence latest point must be user-scoped');
check(str_contains(Db::$sql,'MAX(lp1.id)'),'Presence must use indexed insertion sequence');
check(!str_contains(Db::$sql,'ORDER BY lp1.captured_at'),'Presence must not filesort each user history');
echo "PASS presence query: bounded per-user latest ping lookup\n";
