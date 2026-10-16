<?php
class Http {static function error($message,$code){throw new RuntimeException($message,$code);}}
class LeaderTransaction {
  private $snapshot=null;
  function beginTransaction(){$this->snapshot=Db::$leaders;}
  function commit(){$this->snapshot=null;}
  function inTransaction(){return $this->snapshot!==null;}
  function rollBack(){Db::$leaders=$this->snapshot;$this->snapshot=null;}
}
class Db {
  static $leaders=[];static $users=[];static $connection;static $fail=false;
  static function pdo(){return self::$connection??(self::$connection=new LeaderTransaction());}
  static function run($sql,$parameters=[]){if(str_starts_with($sql,'INSERT INTO')){if(self::$fail)throw new RuntimeException('write failure');self::$leaders[$parameters[0]]=['zone_id'=>$parameters[0],'senior_user_id'=>$parameters[1],'inspector_ids'=>$parameters[2],'updated_by'=>$parameters[3]];}}
  static function all($sql){return str_contains($sql,'FROM users')?self::$users:array_values(self::$leaders);}
  static function one($sql,$parameters){return $parameters[0]===1?['id'=>1]:null;}
}
require __DIR__.'/../lib/OrgChart.php';
$count=0;
function verify($condition,$message){global $count;$count++;if(!$condition)throw new RuntimeException($message);}
function rejected($callback,$code){try{$callback();}catch(RuntimeException $error){verify($error->getCode()===$code,'unexpected status');return;}throw new RuntimeException('expected rejection');}
Db::$users=[['id'=>10,'is_active'=>1,'role_title'=>'سربازرس'],['id'=>11,'is_active'=>1,'role_title'=>'بازرس مقیم'],['id'=>12,'is_active'=>1,'role_title'=>'بازرس گشت موتوری'],['id'=>13,'is_active'=>1,'role_title'=>'گشت موتوری'],['id'=>14,'is_active'=>0,'role_title'=>'بازرس'],['id'=>15,'is_active'=>1,'role_title'=>'سربازرس ارشد']];
$before=Db::$users;$result=OrgChart::saveZoneLeaders(1,'10',['11',12,11],99);
verify($result['inspector_ids']===[11,12],'deduplicated inspectors');verify(Db::$leaders[1]['updated_by']===99,'actor recorded');verify(Db::$users===$before,'no personnel mutation');
$zones=OrgChart::withZoneLeaders([['id'=>1],['id'=>2]]);verify($zones[0]['senior_user_id']===10 && $zones[0]['inspector_ids']===[11,12],'metadata enrichment');verify($zones[1]['senior_user_id']===null && $zones[1]['inspector_ids']===[],'legacy zones default');
foreach([[15,[]],[11,[]],[999,[]],[10,[13]],[10,[14]],[10,[999]],[10,['bad']],[10,'bad']] as [$senior,$inspectors]){rejected(fn()=>OrgChart::saveZoneLeaders(1,$senior,$inspectors,99),422);verify(Db::$leaders[1]['senior_user_id']===10,'failed save retains assignment');}
rejected(fn()=>OrgChart::saveZoneLeaders(2,10,[],99),404);
Db::$fail=true;try{OrgChart::saveZoneLeaders(1,null,[],99);}catch(RuntimeException $error){verify($error->getMessage()==='write failure','write failure propagated');}verify(Db::$leaders[1]['inspector_ids']==='[11,12]','rollback retains responsibility');Db::$fail=false;
OrgChart::saveZoneLeaders(1,null,[],99);verify(Db::$leaders[1]['senior_user_id']===null && Db::$leaders[1]['inspector_ids']==='[]','clear returns to default');
$source=file_get_contents(__DIR__.'/../lib/routes.php');verify(str_contains($source,"'/api/admin/zones/{id}/leaders'") && str_contains($source,"\$u['id']);},false,ADMIN)"),'admin-only save contract');
echo 'Zone leadership: '.$count.' assertions passed'.PHP_EOL;
