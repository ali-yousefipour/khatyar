<?php
const ADMIN = 3;
class Http {
  static function error($message, $status) { throw new RuntimeException($message,$status); }
}
class ZoneConnection {
  public $snapshot = null;
  function beginTransaction() { $this->snapshot = [Db::$zones,Db::$users]; }
  function commit() { $this->snapshot = null; }
  function inTransaction() { return $this->snapshot !== null; }
  function rollBack() { [Db::$zones,Db::$users] = $this->snapshot; $this->snapshot = null; }
}
class Db {
  static $zones;
  static $users;
  static $connection;
  static $failDelete = false;
  static function pdo() { return self::$connection; }
  static function one($query,$params) { return self::$zones[(int)$params[0]] ?? null; }
  static function insert($query,$params) { self::$zones[3] = ['id'=>3,'name'=>$params[0],'parent_id'=>$params[1]]; return 3; }
  static function run($query,$params) {
    if (strpos($query,'UPDATE users')===0) {
      foreach (self::$users as &$user) if ($user['zone_id']==$params[0]) $user['zone_id']=null;
      unset($user);
    } elseif (strpos($query,'UPDATE zones SET parent_id')===0) {
      foreach (self::$zones as &$zone) if ($zone['parent_id']==$params[0]) $zone['parent_id']=null;
      unset($zone);
    } elseif (strpos($query,'UPDATE zones SET name')===0) {
      self::$zones[(int)$params[1]]['name']=$params[0];
    } elseif (strpos($query,'DELETE FROM zones')===0) {
      if (self::$failDelete) throw new RuntimeException('Database failure');
      unset(self::$zones[(int)$params[0]]);
    } else throw new LogicException('Unexpected query');
  }
}
$handlers = [];
function route($method,$path,$handler,$public=false,$level=null) {
  global $handlers;
  if ($public || $level !== ADMIN) throw new RuntimeException('Zone mutations must require admin access');
  $handlers[$method] = $handler;
}
$source = file_get_contents(__DIR__.'/../lib/routes.php');
foreach (['POST'=>'/api/admin/zones','PUT'=>'/api/admin/zones/{id}','DELETE'=>'/api/admin/zones/{id}'] as $method=>$path) {
  $start=strpos($source,"route('$method', '$path', ");
  if ($start===false) throw new RuntimeException('Zone endpoint missing');
  $end=strpos($source,"\n}, false, ADMIN);",$start);
  if ($end===false) throw new RuntimeException('Zone endpoint end missing');
  eval(substr($source,$start,$end-$start)."\n}, false, ADMIN);");
}
Db::$connection = new ZoneConnection();
Db::$zones = [1=>['id'=>1,'name'=>'منطقه یک','parent_id'=>null],2=>['id'=>2,'name'=>'منطقه دو','parent_id'=>1]];
Db::$users = [['id'=>10,'zone_id'=>1],['id'=>11,'zone_id'=>2]];
foreach (['POST','PUT'] as $method) {
  foreach (['',str_repeat('م',151)] as $name) {
    try { $handlers[$method](['id'=>1],['name'=>$name],[]); throw new LogicException('Invalid name accepted'); }
    catch (RuntimeException $error) { if ($error->getCode()!==422) throw $error; }
  }
}
$created=$handlers['POST']([],['name'=>'  منطقه سه  '],[]);
if ($created['name']!=='منطقه سه') throw new RuntimeException('Name not trimmed');
$handlers['PUT'](['id'=>1],['name'=>'نام جدید'],[]);
if (Db::$zones[1]['name']!=='نام جدید' || Db::$users[0]['zone_id']!==1) throw new RuntimeException('Rename changed zone membership');
$before=[Db::$zones,Db::$users];
Db::$failDelete=true;
try { $handlers['DELETE'](['id'=>1],[],[]); throw new LogicException('Failure not propagated'); }
catch (RuntimeException $error) { if ($error->getMessage()!=='Database failure') throw $error; }
if ([Db::$zones,Db::$users]!==$before || Db::$connection->inTransaction()) throw new RuntimeException('Failed delete did not roll back');
Db::$failDelete=false;
$handlers['DELETE'](['id'=>1],[],[]);
if (isset(Db::$zones[1]) || count(Db::$users)!==2 || Db::$users[0]['zone_id']!==null || Db::$users[1]['zone_id']!==2 || Db::$zones[2]['parent_id']!==null) throw new RuntimeException('Delete did not preserve users or detach references');
foreach (['PUT','DELETE'] as $method) {
  try { $handlers[$method](['id'=>99],['name'=>'missing'],[]); throw new LogicException('Missing zone accepted'); }
  catch (RuntimeException $error) { if ($error->getCode()!==404) throw $error; }
}
if (Db::$connection->inTransaction()) throw new RuntimeException('Transaction left open');
echo "PASS zone CRUD: admin-only mutations, name validation, stable membership on rename, preserved users, detached child regions, missing IDs and rollback on delete failure\n";
