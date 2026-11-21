<?php
/** In-memory school complaint lifecycle / endpoint authorization regression.
 * php php/tools/test_school_complaint_workflow.php
 */
declare(strict_types=1);
date_default_timezone_set('Asia/Tehran');
class Http {
 public static function error($message,$status=400):void {throw new RuntimeException((string)$message,(int)$status);}
}
class FakePDO {
 private bool $active=false;
 public function beginTransaction():void {$this->active=true;}
 public function inTransaction():bool {return $this->active;}
 public function rollBack():void {$this->active=false;}
 public function commit():void {$this->active=false;}
}
class Db {
 public static array $case;
 public static array $events=[];
 public static FakePDO $pdo;
 public static function pdo():FakePDO{return self::$pdo;}
 public static function one(string $query,array $params=[]):?array {
  if(str_contains($query,'school_complaint_settings'))return ['config'=>json_encode(['receivers'=>[21],'reviewer'=>31,'supervisor'=>41,'require_supervisor'=>true,'review_hours'=>24,'supervisor_hours'=>24])];
  if(str_contains($query,'FROM app_settings'))return ['value'=>json_encode(['10'=>['schoolcomplaints']])];
  if(str_contains($query,'SELECT * FROM school_complaints WHERE id='))return (int)($params[0]??0)===(int)self::$case['id']?self::$case:null;
  if(str_contains($query,'FROM school_complaint_events WHERE complaint_id=? AND actor_id=?')){
   foreach(self::$events as $e)if($e['actor_id']===$params[1])return ['id'=>$e['id']];
   return null;
  }
  if(str_contains($query,"action='escalate'")){
   foreach(array_reverse(self::$events) as $e)if($e['action']==='escalate')return ['actor_id'=>$e['actor_id']];
   return null;
  }
  if(str_contains($query,'FROM users WHERE id='))return in_array((int)($params[0]??0),[21,31,41],true)?['id'=>$params[0]]:null;
  if(str_contains($query,'CONCAT_WS'))return ['name'=>'مسئول'];
  return null;
 }
 public static function run(string $query,array $params=[]):void {
  if(str_contains($query,"SET status='in_progress'"))self::$case['status']='in_progress';
  elseif(str_contains($query,"SET status='answered'"))self::$case['status']='answered';
  elseif(str_contains($query,"SET status='escalated'")){self::$case['status']='escalated';self::$case['assigned_to']=self::$case['supervisor_id'];self::$case['due_at']=$params[0];}
  elseif(str_contains($query,"SET status='returned'")){self::$case['status']='returned';self::$case['assigned_to']=$params[0];self::$case['due_at']=$params[1];}
  elseif(str_contains($query,"SET status='closed'")){self::$case['status']='closed';self::$case['closed_at']=date('Y-m-d H:i:s');}
  elseif(str_contains($query,'INSERT INTO school_complaint_events')){
   self::$events[]=['id'=>count(self::$events)+1,'actor_id'=>(int)$params[1],'action'=>$params[2],'body'=>$params[3]];
  }
 }
}
$routes=[];
function route($method,$path,$handler,$public=false,$level=99):void {global $routes;$routes[$method.' '.$path]=$handler;}
Db::$pdo=new FakePDO();
Db::$case=['id'=>112,'created_by'=>21,'assigned_to'=>31,'supervisor_id'=>41,'status'=>'pending','school_snapshot'=>'{}','company_snapshot'=>'{}','created_at'=>date('Y-m-d H:i:s'),'closed_at'=>null,'due_at'=>date('Y-m-d H:i:s',time()+86400),'review_hours'=>24,'supervisor_hours'=>24];
require dirname(__DIR__).'/lib/school_complaints_routes.php';
function check($ok,string $message):void {if(!$ok)throw new RuntimeException($message);}
$endpoint=$routes['POST /api/school-complaints/{id}/action']??null;
check(is_callable($endpoint),'Action route missing');
$as=static fn(int $uid):array=>['id'=>$uid,'role_id'=>10,'is_admin'=>false];
$call=static function($who,$action,$message='عملیات آزمایشی')use($endpoint,$as){return $endpoint(['id'=>112],['action'=>$action,'body'=>$message],$as($who));};
$reject=static function($fn,int $status){try{$fn();}catch(RuntimeException $e){check($e->getCode()===$status,'Expected '.$status.', got '.$e->getCode());return;}throw new RuntimeException('Expected rejected operation');};
$reject(static fn()=>$call(55,'start'),403);
$reject(static fn()=>$call(21,'close'),409);
$call(31,'start','');
check(Db::$case['status']==='in_progress','Start failed');
$call(31,'reply');
check(Db::$case['status']==='answered','Reply failed');
$reject(static fn()=>$call(31,'close'),409);
$call(31,'escalate');
check(Db::$case['assigned_to']===41&&Db::$case['status']==='escalated','Escalation failed');
$reject(static fn()=>$call(31,'note'),409);
$call(41,'return');
check(Db::$case['assigned_to']===31&&Db::$case['status']==='returned','Return failed');
$call(31,'start','');
$call(31,'reply');
$call(31,'escalate');
$call(41,'close');
check(Db::$case['status']==='closed'&&!empty(Db::$case['closed_at']),'Close failed');
$reject(static fn()=>$call(41,'note'),409);
check(count(Db::$events)===8,'Unexpected event count: '.count(Db::$events));
check(!Db::$pdo->inTransaction(),'Transaction was left open');
echo "School complaint workflow tests passed\n";
