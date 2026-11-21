<?php
declare(strict_types=1);
/** No-database regression for dedicated complaint-only account boundaries. */
class Http {
 public static function error($message,$status=400):void {throw new RuntimeException((string)$message,(int)$status);}
}
class Db {
 public static ?array $operator=[
  'id'=>7,'username'=>'complaint.agent','display_name'=>'کاربر ویژه شکایات',
  'can_receive'=>1,'can_report'=>0,'is_active'=>1,'token_version'=>3
 ];
 public static function one(string $sql,array $params=[]):?array {
  if(str_contains($sql,'FROM school_complaint_accounts')) {
   return (int)($params[0]??0)===7?self::$operator:null;
  }
  return null;
 }
}
function route(...$arguments):void {}
function sc_text($value,$limit,$required=true):string {
 $s=trim((string)$value);
 if(strlen($s)>$limit||($required&&$s===''))Http::error('invalid',422);
 return $s;
}
require dirname(__DIR__).'/lib/school_complaint_accounts.php';
function check(bool $value,string $message):void {if(!$value)throw new RuntimeException($message);}
function rejected(callable $fn,int $status):void {
 try{$fn();}catch(RuntimeException $e){check($e->getCode()===$status,'Unexpected HTTP status');return;}
 throw new RuntimeException('Request should have been denied');
}
check(sc_operator_id(7)===-7,'Operators must use distinct negative identifiers');
check(sc_identity_active(-7),'Active isolated account should resolve');
check(!sc_identity_active(-999),'Unknown account cannot resolve');
$payload=['t'=>'sc','scope'=>'school-complaints','dt'=>'web','sub'=>-7,'v'=>3];
$operator=sc_operator_auth($payload);
check($operator['sc_only']===true && $operator['id']===-7,'Operator must remain restricted');
check($operator['role_id']===0 && $operator['is_admin']===0,'Scoped identity cannot inherit staff or administrator role');
check($operator['sc_receive']===true && $operator['sc_report']===false,'Privileges come from isolated account');
rejected(static fn()=>sc_operator_auth([...$payload,'t'=>'a']),401);
rejected(static fn()=>sc_operator_auth([...$payload,'scope'=>'admin']),401);
rejected(static fn()=>sc_operator_auth([...$payload,'sub'=>7]),401);
rejected(static fn()=>sc_operator_auth([...$payload,'v'=>2]),401);
Db::$operator['is_active']=0;
rejected(static fn()=>sc_operator_auth($payload),401);
rejected(static fn()=>sc_operator_password('123456'),422);
$index=file_get_contents(dirname(__DIR__).'/app/index.php');
check(str_contains($index,"strpos(\$path,'/api/school-complaints/') !== 0"),'Index must scope complaint JWT to complaint-only routes');
check(str_contains($index,"empty(\$user['sc_only'])"),'Organizational audit must not insert orphan account IDs');
$accounts=file_get_contents(dirname(__DIR__).'/lib/school_complaint_accounts.php');
check(!str_contains($accounts,'INSERT INTO users'),'Dedicated users must never enter organizational users');
$schema=file_get_contents(dirname(__DIR__).'/migrations/2026_11_21_school_complaint_accounts.sql');
check(!preg_match('/(?:INSERT|ALTER|UPDATE)\s+(?:INTO\s+)?(?:users|roles|zones|user_managers)\b/i',$schema),'Migration must not touch personnel or hierarchy');
echo "Isolated school complaint operator authorization checks passed\n";
