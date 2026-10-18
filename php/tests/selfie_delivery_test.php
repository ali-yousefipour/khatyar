<?php
class Http {
  static function error($message,$status) { throw new RuntimeException($message,$status); }
}
class SelfieTransaction {
  public $active=false;
  public $committed=false;
  public $rolledBack=false;
  function beginTransaction() { $this->active=true; }
  function commit() { $this->active=false; $this->committed=true; }
  function rollBack() { $this->active=false; $this->rolledBack=true; }
  function inTransaction() { return $this->active; }
}
class Db {
  static $target;
  static $existing;
  static $transaction;
  static $queries=[];
  static $failInsert=false;
  static function pdo() { return self::$transaction; }
  static function one($sql,$params=[]) {
    self::$queries[]=[$sql,$params];
    return str_contains($sql,'FOR UPDATE')?self::$target:self::$existing;
  }
  static function insert($sql,$params=[]) {
    self::$queries[]=[$sql,$params];
    if (self::$failInsert) throw new RuntimeException('Synthetic insert failure');
    return 12;
  }
  static function run($sql,$params=[]) { self::$queries[]=[$sql,$params]; }
}
class Media {
  static $path='uploads/covert/test.jpg';
  static $deleted=[];
  static function saveBase64($photo,$type,$width,$quality) { return self::$path; }
  static function delete($path) { self::$deleted[]=$path; }
}
$source=file_get_contents(__DIR__.'/../lib/routes.php');
function selfieHandler($method,$path) {
  global $source;
  $marker="route('$method', '$path', ";
  $start=strpos($source,$marker);
  if ($start===false) throw new LogicException('Missing route '.$path);
  $start+=strlen($marker);
  $end=strpos($source,"\n});",$start);
  return eval('return '.substr($source,$start,$end-$start)."\n};");
}
function check($condition,$message) { if (!$condition) throw new LogicException($message); }
$upload=selfieHandler('POST','/api/my/covert-selfie');
foreach (['request_id','command_id'] as $field) {
  foreach (['success','retry','invalid-image','database-failure','other-user','expired'] as $scenario) {
    if ($field==='command_id' && $scenario==='expired') continue;
    Db::$transaction=new SelfieTransaction();
    Db::$queries=[];
    Db::$target=$scenario==='other-user'?null:['id'=>7,'expires_at'=>date('Y-m-d H:i:s',time()+($scenario==='expired'?-600:600))];
    Db::$existing=$scenario==='retry'?['id'=>11]:null;
    Db::$failInsert=$scenario==='database-failure';
    Media::$path=$scenario==='invalid-image'?null:'uploads/covert/test.jpg';
    Media::$deleted=[];
    try {
      $result=$upload([],['photo'=>'data:image/jpeg;base64,test',$field=>7],['id'=>3]);
      check(in_array($scenario,['success','retry'],true),'Unexpected upload success: '.$scenario);
      check($result['ok'] && $result['id']===($scenario==='retry'?11:12),'Wrong persisted result');
      check(Db::$transaction->committed,'Success must commit');
    } catch (RuntimeException $error) {
      check(!in_array($scenario,['success','retry'],true),'Unexpected failure');
      check(Db::$transaction->rolledBack,'Failure must roll back');
      check(Media::$deleted===($scenario==='database-failure'?['uploads/covert/test.jpg']:[]),'Orphan image cleanup');
    }
    $writes=array_filter(Db::$queries,fn($query)=>str_starts_with($query[0],'UPDATE'));
    check(count($writes)===($scenario==='success'?1:0),'Only durable new uploads acknowledge delivery');
    if ($scenario==='retry') check(count(array_filter(Db::$queries,fn($query)=>str_starts_with($query[0],'INSERT')))===0,'Retry must not insert another image');
  }
}
Db::$queries=[]; Db::$existing=null;
try { selfieHandler('POST','/api/my/covert-selfie-request/{id}/fulfill')(['id'=>7],[],['id'=>3]); throw new LogicException('Premature fulfillment accepted'); }
catch (RuntimeException $error) { check($error->getCode()===409,'Premature acknowledgment must fail'); }
check(count(Db::$queries)===1 && str_contains(Db::$queries[0][0],'user_id=? AND reason=?'),'Fulfillment must verify image ownership and correlation');
$pollStart=strpos($source,"route('GET', '/api/my/selfie-commands'");
$pollEnd=strpos($source,"}, false);",$pollStart);
$poll=substr($source,$pollStart,$pollEnd-$pollStart);
check(!str_contains($poll,'UPDATE'),'Polling cannot consume commands');
check(str_contains($poll,"reason<>'screenshot'"),'Selfie polling excludes screenshots');
check(str_contains($source,"cs.reason=CONCAT('sr:',csr.id)"),'Group requests need per-person completion');
echo "PASS selfie delivery: 11 upload scenarios, durable acknowledgment, rollback/cleanup, retry, ownership, group isolation and read-only polling\n";
