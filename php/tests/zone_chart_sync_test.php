<?php
// Run: php php/tests/zone_chart_sync_test.php
class Http {public static function error($message,$code){throw new RuntimeException($message,$code);}}
class FakeConnection {
 private $snapshot=null;
 public function beginTransaction(){$this->snapshot=[Db::$links,Db::$primary];}
 public function inTransaction(){return $this->snapshot!==null;}
 public function commit(){$this->snapshot=null;}
 public function rollBack(){[Db::$links,Db::$primary]=$this->snapshot;$this->snapshot=null;}
}
class Db {
 public static $leadership=[];
 public static $links=[];
 public static $primary=[];
 public static $failWrite=false;
 public static $connection;
 public static function pdo(){return self::$connection??=new FakeConnection();}
 public static function run($sql,$args=[]){
  if(str_starts_with($sql,'CREATE TABLE IF NOT EXISTS zone_leadership'))return;
  if(str_starts_with($sql,'DELETE FROM user_managers')){self::$links[(int)$args[0]]=[];return;}
  if(str_starts_with($sql,'INSERT INTO user_managers')){
   if(self::$failWrite)throw new RuntimeException('Simulated SQL failure');
   self::$links[(int)$args[0]][]=(int)$args[1];return;
  }
  if(str_starts_with($sql,'UPDATE users SET manager_id=')){self::$primary[(int)$args[1]]=$args[0];return;}
  throw new LogicException('Unexpected update '.$sql);
 }
 public static function all($sql,$args=[]){
  if(str_contains($sql,'FROM zones'))return [
   ['id'=>1,'name'=>'منطقه مادر','parent_id'=>null],
   ['id'=>2,'name'=>'زیرمنطقه','parent_id'=>1],
   ['id'=>3,'name'=>'نامرتبط','parent_id'=>null]];
  if(str_contains($sql,'FROM zone_leadership'))return self::$leadership;
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
   ['id'=>15,'first_name'=>'غریبه','zone_id'=>3,'is_active'=>1,'role_title'=>'اپراتور'],
   ['id'=>16,'first_name'=>'بازرس مامور','zone_id'=>3,'is_active'=>1,'role_title'=>'بازرس']
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
// Persist the exact graph consumed by the saved chart, not only the regional preview.
Db::$links=[15=>[99],13=>[99]];Db::$primary=[15=>99,13=>99];
$saved=ZoneChartSync::synchronize(1);
if(($saved['persisted']??false)!==true||$saved['saved_relations']<4)throw new RuntimeException('Sync did not save');
sort(Db::$links[13]);sort(Db::$links[14]);
if(Db::$links[13]!==[11,12]||Db::$links[14]!==[11,12])throw new RuntimeException('Multi-inspector links not persisted');
if(Db::$links[11]!==[10]||Db::$links[12]!==[10])throw new RuntimeException('Senior links not persisted');
if(Db::$primary[13]!==11||Db::$links[15]!==[99]||Db::$primary[15]!==99)throw new RuntimeException('Primary manager or unrelated zone changed');
$before=[Db::$links,Db::$primary];
Db::$failWrite=true;
try{ZoneChartSync::synchronize(1);throw new RuntimeException('Write error ignored');}
catch(RuntimeException $e){if($e->getMessage()!=='Simulated SQL failure')throw $e;}
Db::$failWrite=false;
if([Db::$links,Db::$primary]!==$before||Db::pdo()->inTransaction())throw new RuntimeException('Transactional rollback failed');
// Designated inspectors can serve a subregion without changing their home zone.
Db::$leadership=[
 ['zone_id'=>1,'senior_user_id'=>10,'inspector_ids'=>'[]'],
 ['zone_id'=>2,'senior_user_id'=>null,'inspector_ids'=>'[11,16]']
];
Db::$links[16]=[99];Db::$primary[16]=99;
$cross=ZoneChartSync::snapshot(1);
if(!in_array(16,$cross['responsible_leader_ids'],true)||parentsOf($cross['edges'],13)!==[11,16]||parentsOf($cross['edges'],16)!==[10])
  throw new RuntimeException('Cross-zone inspector missing from regional hierarchy');
$crossSaved=ZoneChartSync::synchronize(1);
sort(Db::$links[13]);sort(Db::$links[14]);sort(Db::$links[16]);
if(Db::$links[13]!==[11,16]||Db::$links[14]!==[11,16]||Db::$links[16]!==[10,99]||Db::$primary[16]!==99)
  throw new RuntimeException('Cross-zone supervisor synchronization lost existing or new relations');
echo "PASS region chart synchronization: two inspectors, parent senior, descendant scope, isolation, missing zone\n";
