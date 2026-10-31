<?php
// Isolated regression test: selected session IDs only, validation and transaction rollback.
const ADMIN = 3;
class Http { public static function error($message,$code=400) { throw new RuntimeException($message,$code); } }
class FakePdo {
  public bool $active=false;
  private array $before=[];
  public function beginTransaction() { $this->before=Db::$sessions;$this->active=true; }
  public function inTransaction() { return $this->active; }
  public function commit() { $this->active=false; }
  public function rollBack() { Db::$sessions=$this->before;$this->active=false; Db::$rolledBack=true; }
}
class FakeStatement { public function __construct(private int $count) {} public function rowCount() { return $this->count; } }
class Db {
  public static array $sessions=[1=>null,2=>null,3=>null];
  public static array $log=[];
  public static bool $rolledBack=false;
  public static bool $failLog=false;
  private static ?FakePdo $connection=null;
  public static function pdo() { return self::$connection??=new FakePdo(); }
  public static function run($sql,$params=[]) {
    if (str_starts_with($sql,'UPDATE user_sessions')) {
      $count=0;
      foreach ($params as $id) if (array_key_exists($id,self::$sessions) && self::$sessions[$id]===null) { self::$sessions[$id]='revoked'; $count++; }
      return new FakeStatement($count);
    }
    if (str_contains($sql,'INSERT INTO activity_logs')) {
      if (self::$failLog) throw new RuntimeException('audit failed');
      self::$log[]=$params;
      return new FakeStatement(1);
    }
    throw new RuntimeException('Unexpected SQL');
  }
}
$routes=[];
function route($method,$path,$handler,...$options) { $GLOBALS['routes'][$method.' '.$path]=[$handler,$options]; }
$source=file_get_contents(__DIR__.'/../lib/routes.php');
$start=strpos($source,"route('POST','/api/admin/active-sessions/revoke'");
$end=strpos($source,'/* ================= اقلام تحویلی',$start);
if ($start===false || $end===false) throw new RuntimeException('Bulk route not found');
eval(substr($source,$start,$end-$start));
[$handler,$options]=$routes['POST /api/admin/active-sessions/revoke'];
if (($options[1]??null)!==ADMIN) throw new RuntimeException('Administrator permission must be enforced');
$check=function($condition,$message){if(!$condition)throw new RuntimeException($message);};
$reject=function($ids)use($handler,$check){try{$handler([],['session_ids'=>$ids],['id'=>9]);}catch(RuntimeException $e){$check($e->getCode()===400,'Unexpected validation status');return;}throw new RuntimeException('Invalid IDs were accepted');};
$reject([]);$reject([0]);$reject(['abc']);$reject([1.2]);$reject(array_fill(0,501,1));
$result=$handler([],['session_ids'=>[1,'1',3]],['id'=>9]);
$check($result['revoked_count']===2,'Only two distinct sessions should be revoked');
$check(Db::$sessions[2]===null,'Unselected session must remain active');
$check(count(Db::$log)===1,'Audit log required');
$check($handler([],['session_ids'=>[1]],['id'=>9])['revoked_count']===0,'Repeat operation must be idempotent');
Db::$failLog=true;
try{$handler([],['session_ids'=>[2]],['id'=>9]);throw new RuntimeException('Expected audit failure');}
catch(RuntimeException $e){$check($e->getMessage()==='audit failed','Unexpected error');}
$check(Db::$rolledBack&&Db::$sessions[2]===null,'Audit failure must roll back revocation');
echo "PASS: bulk session IDs, validation, permissions, audit, idempotency and rollback\n";
