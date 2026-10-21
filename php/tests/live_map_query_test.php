<?php
class Db {
  static $received=false,$sql='';
  static function one($sql,$params=[]){return self::$received?['Field'=>'received_at']:null;}
  static function all($sql,$params=[]){if(str_starts_with($sql,'SHOW COLUMNS'))return [['Field'=>'ip_country']];self::$sql=$sql;return [];}
  static function run($sql,$params=[]){throw new LogicException('Read path must not change schema');}
}
$source=file_get_contents(__DIR__.'/../lib/routes.php');
$helperStart=strpos($source,'function _live_location_sql(');$helperEnd=strpos($source,"route('GET', '/api/locations/live'",$helperStart);
eval(substr($source,$helperStart,$helperEnd-$helperStart));
$marker="route('GET', '/api/locations/live', ";$start=strpos($source,$marker)+strlen($marker);$end=strpos($source,'}, false, ADMIN);',$start);
$handler=eval('return '.substr($source,$start,$end-$start).'};');
function check($condition,$message){if(!$condition)throw new LogicException($message);}
foreach([false,true] as $received){foreach([false,true] as $shift){
  Db::$received=$received;$_GET=$shift?['shift_only'=>1]:[];$handler([],[],['id'=>1]);
  check(!str_contains(Db::$sql,'GROUP BY'),'Live query must not group the full ping history');
  check(str_contains(Db::$sql,'last_ping.user_id=u.id'),'Latest point lookup must be scoped to one user');
  check(str_contains(Db::$sql,'last_ping.id DESC LIMIT 1'),'Equal timestamps need a deterministic tie-breaker');
  check(str_contains(Db::$sql,'lp.received_at')===$received,'Legacy databases must not reference absent received_at');
  check(str_contains(Db::$sql,'WHERE EXISTS')===$shift,'Shift filter must not duplicate users');
  foreach([' AS received_at',' AS online',' AS secs_ago'] as $field)check(str_contains(Db::$sql,$field),'Preserve response field '.$field);
}}
echo "PASS live map query: legacy/current timestamp schema, per-user latest point, deterministic ties, shift isolation and response fields\n";
