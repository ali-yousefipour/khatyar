<?php
// Regression: a reporting request must read a deployed finalized-work table
// even when shared-host SQL credentials do not grant CREATE TABLE.
class Db {
  public static $createAttempts=0,$readAttempts=0,$selects=0;
  public static function run($sql,$args=[]){
    self::$createAttempts++;
    throw new RuntimeException('CREATE TABLE permission denied');
  }
  public static function one($sql,$args=[]){
    if(str_contains($sql,'LIMIT 1')){self::$readAttempts++;return ['jy'=>1405];}
    if(str_contains($sql,'WHERE jy=?')){self::$selects++;return ['jy'=>$args[0],'jm'=>$args[1]];}
    throw new RuntimeException('Unexpected query '.$sql);
  }
}
$src=file_get_contents(__DIR__.'/../lib/routes.php');
$start=strpos($src,'function _final_work_month(');
$end=strpos($src,'function _work_snapshot_decode(',$start);
if($start===false||$end===false)throw new RuntimeException('Cannot locate finalized work helper');
eval(substr($src,$start,$end-$start));
$first=_final_work_month(1405,8);
$second=_final_work_month(1405,7);
if($first['jy']!==1405||$first['jm']!==8||$second['jm']!==7||Db::$createAttempts!==1||Db::$readAttempts!==1||Db::$selects!==2)
  throw new RuntimeException('Existing finalized work archive must remain readable on restricted hosting');
echo "PASS finalized work read-only access with denied CREATE, once-only preflight and repeated month lookups\n";
