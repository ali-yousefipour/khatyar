<?php
// Run: php php/tests/zone_chart_sync_test.php
class Http {public static function error($message,$code){throw new RuntimeException($message,$code);}}
class Db {
 public static function run($sql,$args=[]){return null;}
 public static function all($sql,$args=[]){
  if(str_contains($sql,'FROM zones'))return [
   ['id'=>1,'name'=>'منطقه مادر','parent_id'=>null],
   ['id'=>2,'name'=>'زیرمنطقه','parent_id'=>1],
   ['id'=>3,'name'=>'نامرتبط','parent_id'=>null]];
  if(str_contains($sql,'FROM zone_leadership'))return [];
  if(str_contains($sql,'SELECT id FROM users'))return array_map(fn($u)=>['id'=>$u['id']],self::users());
  if(str_contains($sql,'FROM users u'))return self::users();
  throw new RuntimeException('Unexpected query '.$sql);
 }
 private static function users(){
  return [
   ['id'=>10,'first_name'=>'سربازرس','zone_id'=>1,'is_active'=>1,'role_title'=>'سربازرس'],
   ['id'=>11,'first_name'=>'بازرس یک','zone_id'=>2,'is_active'=>1,'role_title'=>'بازرس'],
   ['id'=>12,'first_name'=>'بازرس دو','zone_id'=>2,'is_active'=>1,'role_title'=>'بازرس مقیم'],
   ['id'=>13,'first_name'=>'اپراتور','zone_id'=>2,'is_active'=>1,'role_title'=>'اپراتور'],
   ['id'=>14,'first_name'=>'ناظر','zone_id'=>2,'is_active'=>1,'role_title'=>'ناظر خط'],
   ['id'=>15,'first_name'=>'غریبه','zone_id'=>3,'is_active'=>1,'role_title'=>'اپراتور']
  ];
 }
}
require_once __DIR__.'/../lib/ZoneChartSync.php';
$result=ZoneChartSync::snapshot(1);
if($result['staff_count']!==5||$result['included_subregions']!==1)throw new RuntimeException('Regional scope mismatch');
function parentsOf($edges,$id){$out=[];foreach($edges as $edge)if((int)$edge['user_id']===$id)$out[]=(int)$edge['manager_id'];sort($out);return $out;}
if(parentsOf($result['edges'],13)!==[11,12]||parentsOf($result['edges'],14)!==[11,12])throw new RuntimeException('Staff must report to both inspectors');
if(parentsOf($result['edges'],11)!==[10]||parentsOf($result['edges'],12)!==[10])throw new RuntimeException('Both inspectors must report to the parent senior');
if(parentsOf($result['edges'],15)!==[])throw new RuntimeException('Unrelated region leaked');
if(ZoneChartSync::snapshot(2)['staff_count']!==4)throw new RuntimeException('Subregion scope invalid');
try{ZoneChartSync::snapshot(999);throw new RuntimeException('Missing zone accepted');}catch(RuntimeException $e){if($e->getCode()!==404)throw $e;}
echo "PASS region chart synchronization: two inspectors, parent senior, descendant scope, isolation, missing zone\n";
