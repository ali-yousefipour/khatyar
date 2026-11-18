<?php
// Production routing and policy handlers, with isolated transactional data.
class Http {static function error($message,$code=400){throw new RuntimeException($message,$code);}}
class TestStatement {function __construct(private int $count){}function rowCount(){return $this->count;}}
class TestTransaction {
  private $snapshot=null;
  function beginTransaction(){$this->snapshot=[Db::$users,Db::$policies,Db::$requests];}
  function inTransaction(){return $this->snapshot!==null;}
  function commit(){$this->snapshot=null;}
  function rollBack(){[Db::$users,Db::$policies,Db::$requests]=$this->snapshot;$this->snapshot=null;}
}
class Db {
  static $users=[],$policies=[],$requests=[],$failTransfer=false,$db;
  static function pdo(){return self::$db??=new TestTransaction();}
  static function one($sql,$args=[]){
    if(str_contains($sql,'SHOW TABLES'))return ['requests'=>'requests'];
    if(str_contains($sql,'FROM requests WHERE id='))return self::$requests[(int)$args[0]]??null;
    if(str_contains($sql,'FROM work_policies WHERE id=')){$row=self::$policies[(int)$args[0]]??null;return str_contains($sql,'AND is_active=1')&&empty($row['is_active'])?null:$row;}
    if(str_contains($sql,'FROM users WHERE id=')){$row=self::$users[(int)$args[0]]??null;return str_contains($sql,'AND is_active=1')&&empty($row['is_active'])?null:$row;}
    throw new RuntimeException('Unexpected query: '.$sql);
  }
  static function all($sql,$args=[]){
    if(str_contains($sql,'FROM work_policies')){
      $rows=array_values(array_filter(self::$policies,fn($p)=>!empty($p['is_active'])));
      if(str_contains($sql,'JOIN users'))$rows=array_values(array_filter($rows,fn($p)=>(int)$p['id']===(int)(self::$users[(int)$args[0]]['work_policy_id']??0)));
      return $rows;
    }
    throw new RuntimeException('Unexpected query: '.$sql);
  }
  static function run($sql,$a=[]){
    if(str_starts_with($sql,'UPDATE work_policies')){self::$policies[(int)$a[5]]=['id'=>(int)$a[5],'title'=>$a[0],'description'=>$a[1],'apply_time_limit_on_approve'=>$a[2],'config'=>$a[3],'is_active'=>$a[4]];return new TestStatement(1);}
    if(str_starts_with($sql,'UPDATE users SET work_policy_id')){self::$users[(int)$a[1]]['work_policy_id']=(int)$a[0];return new TestStatement(1);}
    if(str_starts_with($sql,'UPDATE requests r JOIN users')){
      if(self::$failTransfer)throw new RuntimeException('Synthetic transfer failure');
      $count=0;foreach(self::$requests as &$r){
        if($r['status']==='pending'&&(int)(self::$users[$r['user_id']]['work_policy_id']??0)===(int)$a[1]&&(int)($r['pending_on']??0)!==(int)$a[2]&&(!isset($a[3])||(int)$r['user_id']===(int)$a[3])){$r['pending_on']=(int)$a[0];$count++;}
      }unset($r);return new TestStatement($count);
    }
    if(str_starts_with($sql,'UPDATE requests SET pending_on=')){
      $id=(int)$a[1];$r=&self::$requests[$id];
      if($r['status']!=='pending'||$r['pending_on']!==$a[2])return new TestStatement(0);
      $r['pending_on']=(int)$a[0];return new TestStatement(1);
    }
    throw new RuntimeException('Unexpected write: '.$sql);
  }
}
function check($ok,$why){if(!$ok)throw new RuntimeException($why);}
function _ensure_work_policies(){}
function _req_is_root_admin($user){return false;}
function _req_hierarchy_managers($owner){return [44];}
const ADMIN=3;
$handlers=[];function route($method,$path,$fn,...$rest){global $handlers;$handlers[$method.' '.$path]=$fn;}
$source=file_get_contents($argv[1]??(__DIR__.'/../lib/routes.php'));
function loadFunction($name){global $source;$start=strpos($source,'function '.$name.'(');check($start!==false,'Missing '.$name);$text='';$depth=0;$opened=false;
 foreach(token_get_all('<?php '.substr($source,$start)) as $token){if(is_array($token)){if($token[0]!==T_OPEN_TAG)$text.=$token[1];continue;}$text.=$token;if($token==='{'){$depth++;$opened=true;}if($token==='}'){$depth--;if($opened&&$depth===0)break;}}$text=str_replace('__DIR__',var_export(realpath(__DIR__.'/../lib'),true),$text);eval($text);
}
foreach(['_req_active_work_policy','_req_policy_options','_req_zone_chain','_req_specific_approver','_req_transfer_pending_policy','_req_sync_specific_policy_requests','_req_refresh_specific_request','_req_approver','_req_current_pending_target','_req_next_zone_reviewer'] as $name)loadFunction($name);
foreach([['POST','/api/admin/work-policies'],['POST','/api/admin/work-policies/{id}/assign'],['POST','/api/requests/{id}/decide'],['POST','/api/admin/requests/{id}/decision']] as [$method,$path]){
 $start=strpos($source,"route('$method', '$path',");$end=strpos($source,"\n});",$start);$adminEnd=strpos($source,"\n}, false, ADMIN);",$start);if($adminEnd!==false&&($end===false||$adminEnd<$end))$end=$adminEnd+strlen("\n}, false, ADMIN);");else $end+=strlen("\n});");eval(substr($source,$start,$end-$start));
}
$config=['request_options'=>['approval_mode'=>'hierarchical']];
Db::$users=[7=>['id'=>7,'is_active'=>1,'zone_id'=>999,'work_policy_id'=>9],8=>['id'=>8,'is_active'=>1,'zone_id'=>0,'work_policy_id'=>10],37=>['id'=>37,'is_active'=>1],38=>['id'=>38,'is_active'=>1],44=>['id'=>44,'is_active'=>1]];
Db::$policies=[9=>['id'=>9,'config'=>json_encode($config),'is_active'=>1],10=>['id'=>10,'config'=>json_encode($config),'is_active'=>1]];
for($i=1;$i<=1005;$i++)Db::$requests[$i]=['id'=>$i,'user_id'=>7,'status'=>'pending','pending_on'=>$i===1?null:44,'approver_id'=>99];
Db::$requests[2001]=['id'=>2001,'user_id'=>7,'status'=>'approved','pending_on'=>null,'approver_id'=>44];
Db::$requests[2002]=['id'=>2002,'user_id'=>7,'status'=>'rejected','pending_on'=>null,'approver_id'=>44];
Db::$requests[2003]=['id'=>2003,'user_id'=>8,'status'=>'pending','pending_on'=>44,'approver_id'=>null];
$save=$handlers['POST /api/admin/work-policies'];
$payload=['id'=>9,'title'=>'Test','config'=>['request_options'=>['approval_mode'=>'specific','approver_id'=>37]],'is_active'=>1];
$result=$save([],$payload,[]);
check($result['reassigned_pending']===1005,'All old pending requests, including orphaned and >1000, must move');
check(Db::$requests[1005]['pending_on']===37&&Db::$requests[1005]['approver_id']===99,'Previous completed stage must survive reassignment');
check(Db::$requests[2001]['status']==='approved'&&Db::$requests[2002]['status']==='rejected'&&Db::$requests[2003]['pending_on']===44,'Final decisions and other policies must remain unchanged');
check(_req_approver(7)===37,'New request must use fixed person even with unconfigured zone');
check(_req_zone_chain(7)===null&&_req_next_zone_reviewer(7,37)===null,'Fixed approval must not forward to a regional chief/head');
check(_req_current_pending_target(Db::$requests[1005])===37,'Previous hierarchy stage cannot override the fixed person');
check($save([],$payload,[])['reassigned_pending']===0,'Repeated save must be idempotent');
$payload['config']['request_options']['approver_id']=38;
check($save([],$payload,[])['reassigned_pending']===1005,'Changing fixed reviewer moves pending requests again');
$before=Db::$policies;Db::$failTransfer=true;$payload['config']['request_options']['approver_id']=37;
try{$save([],$payload,[]);throw new LogicException('Failure accepted');}catch(RuntimeException $error){check($error->getMessage()==='Synthetic transfer failure','Unexpected transaction error');}
check(Db::$policies===$before&&Db::$requests[1]['pending_on']===38&&!Db::pdo()->inTransaction(),'Policy and transfers must roll back together');Db::$failTransfer=false;
$payload['config']['request_options']['approver_id']=999;
try{$save([],$payload,[]);throw new LogicException('Invalid recipient accepted');}catch(RuntimeException $error){check($error->getCode()===422,'Invalid reviewer must be rejected');}
check(Db::$policies===$before,'Rejected policy must not change stored routing');
Db::$users[37]['is_active']=0;$payload['config']['request_options']['approver_id']=37;
try{$save([],$payload,[]);throw new LogicException('Inactive recipient accepted');}catch(RuntimeException $error){check($error->getCode()===422,'Inactive reviewer must be rejected');}
Db::$users[37]['is_active']=1;
$assigned=$handlers['POST /api/admin/work-policies/{id}/assign'](['id'=>9],['user_ids'=>[8]],[]);
check($assigned['reassigned_pending']===1&&Db::$requests[2003]['pending_on']===38,'Assigning fixed policy moves previous requests');
Db::$requests[1]['pending_on']=44;Db::$requests[2003]['pending_on']=44;
check(_req_sync_specific_policy_requests(null,7)===1&&Db::$requests[2003]['pending_on']===44,'Owner refresh must not repair another user');
check(_req_sync_specific_policy_requests(38)===1&&Db::$requests[1]['pending_on']===38,'New reviewer can recover legacy requests outside their region');
Db::$requests[1]['pending_on']=44;
foreach(['/api/requests/{id}/decide','/api/admin/requests/{id}/decision'] as $path){
 Db::$requests[1]['pending_on']=44;
 try{$handlers['POST '.$path](['id'=>1],['decision'=>'approve','status'=>'approved'],['id'=>44]);throw new LogicException('Stale reviewer accepted');}catch(RuntimeException $error){check($error->getCode()===403,'Stale reviewer must lose decision permission');}
 check(Db::$requests[1]['pending_on']===38&&Db::$requests[1]['status']==='pending','Stale decision repairs routing without approving');
}
Db::$users[8]['work_policy_id']=10;
check(_req_approver(8)===44,'Hierarchical policies retain their existing path');
echo "PASS fixed-policy routing: new requests, 1005 pending stages, other-policy/final-history isolation, reassignment, lazy repair, stale reviewer denial and atomic rollback\n";
