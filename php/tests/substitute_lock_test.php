<?php
declare(strict_types=1);
class Http {static function error($message,$code=400){throw new RuntimeException($message,$code);}}
class Db {
 static bool $available=false;static bool $held=false;static int $writes=0;
 static function one($sql,$args=[]){
  if(str_contains($sql,'GET_LOCK')){if(self::$available){self::$held=true;return ['ok'=>1];}return ['ok'=>0];}
  if(str_contains($sql,'RELEASE_LOCK')){self::$held=false;return ['ok'=>1];}
  if(str_contains($sql,'can_be_substitute=1'))return ['id'=>2];
  return null;
 }
}
$monthLocked=false;
function _final_work_month($year,$month){return $GLOBALS['monthLocked']?['jy'=>$year,'jm'=>$month]:null;}
function route($m,$p,$fn,...$extra){global $routes;$routes[]=['m'=>$m,'p'=>$p,'fn'=>$fn];}
$fail=false;
$routes=[['m'=>'POST','p'=>'/api/my/requests','fn'=>static function()use(&$fail){if(!Db::$held)throw new LogicException('write outside lock');if($fail)throw new LogicException('rollback');Db::$writes++;return ['ok'=>true];}]];
require __DIR__.'/../lib/LeaveSubstituteCoverage.php';
LeaveSubstituteCoverage::register($routes);
$handler=$routes[0]['fn'];$body=['type'=>'annual','unit'=>'daily','from_jdate'=>'1405-09-10','to_jdate'=>'1405-09-10','substitute_user_id'=>2];
try{$handler([],$body,['id'=>1]);throw new LogicException('lock failure accepted');}catch(RuntimeException $e){if($e->getCode()!==409)throw $e;}
if(Db::$writes!==0||Db::$held)throw new LogicException('failed lock mutated data');
echo "PASS failed advisory lock returns 409 before writes\n";
Db::$available=true;$handler([],$body,['id'=>1]);
if(Db::$writes!==1||Db::$held)throw new LogicException('lock lifecycle invalid');
echo "PASS successful registration holds lock through write then releases\n";
$fail=true;
try{$handler([],$body,['id'=>1]);throw new RuntimeException('expected failure');}catch(LogicException $e){if($e->getMessage()!=='rollback')throw $e;}
if(Db::$writes!==1||Db::$held)throw new LogicException('exception retained lock or mutated data');
echo "PASS write failure releases advisory lock\n";

$fail=false;$monthLocked=true;
try{$handler([],$body,['id'=>1]);throw new LogicException('finalized month accepted');}catch(RuntimeException $e){if($e->getCode()!==409)throw $e;}
if(Db::$writes!==1||Db::$held)throw new LogicException('locked month mutated data');
echo "PASS finalized month rejects replacement before writes
";
