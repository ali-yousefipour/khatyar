<?php
date_default_timezone_set('Asia/Tehran');const ADMIN=3;
$definitions=[];
function route($method,$path,$callback,$public=false,$level=99){$GLOBALS['definitions'][$path][$method]=[$callback,$public,$level];}
class Http {static function error($message,$status){throw new RuntimeException($message,$status);}}
function _monthly_work_report_need($user){if(empty($user['allowed']))Http::error('forbidden',403);}
class Db {
  static $calls=[];static $fail=false;static $old=null;static $archive=null;static $deleted=false;
  static function run($sql,$params=[]){self::$calls[]=$sql;if(str_starts_with($sql,'INSERT INTO company_work_deleted'))self::$deleted=true;if(str_starts_with($sql,'DELETE FROM company_work_deleted'))self::$deleted=false;}
  static function all($sql,$params=[]){self::$calls[]=$sql;return [];}
  static function one($sql,$params=[]){self::$calls[]=$sql;if(str_contains($sql,'LEFT JOIN company_work_deleted'))return self::$archive?array_replace(self::$archive,['deleted_at'=>self::$deleted?'2026-10-23 12:00:00':null]):null;return str_contains($sql,'sha256=?')?self::$old:null;}
  static function insert($sql,$params=[]){self::$calls[]=$sql;if(self::$fail)throw new RuntimeException('synthetic write failure');return 4;}
}
require_once __DIR__.'/../lib/company_work_routes.php';
class IsolatedCompanyWork extends CompanyWork {static $dir;static function directory(){return self::$dir;}}
function yes($label,$value){if(!$value)throw new RuntimeException('FAIL '.$label);echo "PASS $label\n";}
foreach($definitions as $path=>$methods)if(str_starts_with($path,'/api/admin/company-work'))foreach($methods as [$fn,$public,$level]){
  yes('private admin route '.$path,!$public&&$level===ADMIN);
  $before=count(Db::$calls);try{$fn(['id'=>999],[],['id'=>1,'allowed'=>false]);throw new RuntimeException('expected forbidden');}catch(RuntimeException $e){yes('permission checked before schema/data',$e->getCode()===403&&count(Db::$calls)===$before);}
}
Db::$archive=['id'=>4,'storage_key'=>str_repeat('a',32)];
CompanyWork::archiveChange('sources',4,7);yes('deletion marks archive without erasing file or source',Db::$deleted&&!array_filter(Db::$calls,fn($q)=>str_starts_with($q,'DELETE FROM company_work_sources')));
try{CompanyWork::source(4);throw new LogicException('expected hidden');}catch(PayrollError $e){yes('deleted source blocked from downloads and generation',$e->getCode()===409);}
CompanyWork::archiveChange('sources',4,7,true);yes('restore preserves archive ID',!Db::$deleted&&CompanyWork::source(4)['id']===4);
CompanyWork::archiveChange('files',4,7);yes('company versions deletable independently',Db::$deleted);CompanyWork::archiveChange('files',4,7,true);
try{CompanyWork::archiveChange('users',4,7);throw new LogicException('expected invalid kind');}catch(PayrollError $e){yes('table names cannot be injected',$e->getCode()===422);}
Db::$archive=null;try{CompanyWork::archiveChange('files',999,7);throw new LogicException('expected missing');}catch(PayrollError $e){yes('missing archive rejected',$e->getCode()===404);}
// Real ZIP source from the synthetic parser fixture; no operational DB or input files.
require __DIR__.'/company_work_fixture.php';
$root=sys_get_temp_dir().'/company-work-'.bin2hex(random_bytes(6));mkdir($root,0700);IsolatedCompanyWork::$dir=$root;$input=$root.'/source.xlsx';
try{
  syntheticOrganization($input);$original=hash_file('sha256',$input);
  $preview=IsolatedCompanyWork::import($input,'sample.xlsx',1405,7,1,false);yes('preview does not save archive',count(glob($root.'/*.xlsx'))===1&&!isset($preview['id']));
  $saved=IsolatedCompanyWork::import($input,'sample.xlsx',1405,7,1,true);yes('archive saved once',$saved['id']===4&&count(glob($root.'/*.xlsx'))===2);
  $files=glob($root.'/*.xlsx');$copy=array_values(array_filter($files,fn($p)=>$p!==$input))[0];yes('original organization file preserved byte for byte',hash_file('sha256',$copy)===$original);
  Db::$old=['id'=>4];$again=IsolatedCompanyWork::import($input,'sample.xlsx',1405,7,1,true);yes('same period/hash is idempotent',$again['duplicate']&&count(glob($root.'/*.xlsx'))===2);
  Db::$old=null;Db::$fail=true;try{IsolatedCompanyWork::import($input,'sample.xlsx',1405,7,1,true);throw new RuntimeException('expected failure');}catch(RuntimeException $e){yes('failed insert leaves no orphan file',$e->getMessage()==='synthetic write failure'&&count(glob($root.'/*.xlsx'))===2);}
  yes('no attendance, requests, user or seniority mutations',!array_filter(Db::$calls,fn($sql)=>preg_match('/^(?:UPDATE|DELETE|INSERT INTO) (?:users|requests|staff_attendance|personnel_seniority)\b/i',$sql)));
  try{IsolatedCompanyWork::path('../outside');throw new RuntimeException('expected invalid key');}catch(RuntimeException $e){yes('archive path traversal rejected',$e->getMessage()==='Invalid archive key');}
}finally{foreach(glob($root.'/*') as $file)unlink($file);rmdir($root);}
echo "Company work archive tests passed\n";
