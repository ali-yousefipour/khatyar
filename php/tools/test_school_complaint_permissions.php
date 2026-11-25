<?php
/**
 * No-database permission and workflow regression tests.
 * php php/tools/test_school_complaint_permissions.php
 */
declare(strict_types=1);
date_default_timezone_set('Asia/Tehran');
class Http {
 public static function error($message, $status=400): void {
  throw new RuntimeException((string)$message, (int)$status);
 }
}
class Db {
 public static array $config=[
  'receivers'=>[21],'reviewer'=>31,'supervisor'=>41,'reporters'=>[51],
  'review_hours'=>24,'supervisor_hours'=>24,'require_supervisor'=>true,
 ];
 public static array $roles=['10'=>['schoolcomplaints']];
 public static array $case=[];
 public static function all(string $sql,array $args=[]): array { return []; }
 public static function one(string $sql,array $args=[]): ?array {
  if(str_contains($sql,'FROM school_complaint_settings'))return ['config'=>json_encode(self::$config)];
  if(str_contains($sql,'FROM app_settings'))return ['value'=>json_encode(self::$roles)];
  if(str_contains($sql,'SELECT * FROM school_complaints WHERE id='))return ((int)($args[0]??0)===(int)(self::$case['id']??0))?self::$case:null;
  if(str_contains($sql,'FROM school_complaint_events WHERE complaint_id='))return null;
  if(str_contains($sql,'CONCAT_WS'))return ['name'=>'مسئول آزمایشی'];
  return null;
 }
}
function route($method,$path,$callback,$public=false,$level=99):void {}
require dirname(__DIR__).'/lib/school_complaints_routes.php';
function ok($condition,string $message): void {if(!$condition)throw new RuntimeException($message);}
function denied(callable $test,int $status): void {
 try{$test();}catch(RuntimeException $e){ok($e->getCode()===$status,'Expected '.$status.' got '.$e->getCode());return;}
 throw new RuntimeException('Expected denial '.$status);
}
$person=static fn(int $id,int $role=99,bool $admin=false):array=>['id'=>$id,'role_id'=>$role,'is_admin'=>$admin?1:0];
ok(!sc_access($person(55))['allowed'],'Unassigned user denied');
ok(sc_access($person(55,10))['allowed'],'Role-based viewer');
ok(!sc_access($person(55,10))['receive'],'Role viewer cannot register');
ok(sc_access($person(21))['receive'],'Configured receiver can register');
ok(sc_access($person(31))['review'],'Reviewer can access');
ok(sc_access($person(41))['supervisor'],'Supervisor can access');
ok(sc_access($person(51))['report'],'Explicit reporter can report');
ok(!sc_access($person(55,10))['report'],'Module-only role cannot browse every case');
ok(!sc_access($person(51))['receive'],'Reporter cannot register a complaint');
ok(sc_access($person(1,99,true))['admin'],'Admin can manage');
denied(static fn()=>sc_need($person(55),'allowed'),403);
denied(static fn()=>sc_need($person(55,10),'receive'),403);
$created=(new DateTimeImmutable('now'))->format('Y-m-d H:i:s');
Db::$case=[
 'id'=>123,'created_by'=>21,'assigned_to'=>31,'supervisor_id'=>41,
 'status'=>'pending','school_snapshot'=>'{"name":"مدرسه نمونه"}',
 'company_snapshot'=>'{"name":"شرکت نمونه"}',
 'created_at'=>$created,'closed_at'=>null,'due_at'=>(new DateTimeImmutable('+24 hours'))->format('Y-m-d H:i:s'),
 'review_hours'=>24,'supervisor_hours'=>24,
];
denied(static fn()=>sc_case(123,$person(55,10)),403);
ok(sc_case(123,$person(21))['can_attach'],'Creator can attach before closing');
ok(sc_case(123,$person(21))['can_edit_reception'],'Creator with receive permission may correct reception');
ok(!sc_case(123,$person(51))['can_edit_reception'],'Reporter cannot correct reception');
ok(sc_case(123,$person(31))['can_act'],'Assigned reviewer can act');
ok(!sc_case(123,$person(41))['can_act'],'Supervisor cannot act until assigned');
ok(sc_case(123,$person(1,99,true))['id']===123,'Admin can view');
ok(sc_case(123,$person(51))['id']===123,'Configured reporter can view unrelated case');
ok(!sc_case(123,$person(51))['can_act'],'Reporter cannot change an unassigned case');
ok(!sc_case(123,$person(51))['can_attach'],'Reporter cannot attach to unrelated case');
$pending=sc_allowed_actions(Db::$case,$person(31));
ok(in_array('start',$pending,true),'Pending can start');
ok(in_array('escalate',$pending,true),'Pending can escalate');
ok(!in_array('close',$pending,true),'Supervisor approval required');
Db::$case['status']='escalated';Db::$case['assigned_to']=41;
$supervisor=sc_allowed_actions(Db::$case,$person(41));
ok(in_array('close',$supervisor,true),'Supervisor may close escalated');
ok(in_array('return',$supervisor,true),'Supervisor may return escalated');
ok(sc_case(123,$person(21))['id']===123,'Creator retains case visibility');
Db::$case['status']='closed';Db::$case['closed_at']=$created;
ok(sc_allowed_actions(Db::$case,$person(41))===[],'Closed case has no actions');
ok(!sc_case(123,$person(21))['can_attach'],'Closed attachment denied');
Db::$config['require_supervisor']=false;Db::$case['status']='pending';Db::$case['assigned_to']=31;
ok(!in_array('close',sc_allowed_actions(Db::$case,$person(31)),true),'Unanswered case cannot close');
Db::$case['status']='answered';
ok(in_array('close',sc_allowed_actions(Db::$case,$person(31)),true),'Closure allowed without mandatory approval');
echo "School complaint permission and workflow checks passed\n";
