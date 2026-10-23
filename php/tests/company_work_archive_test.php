<?php
date_default_timezone_set('Asia/Tehran');const ADMIN=3;
$definitions=[];
function route($method,$path,$callback,$public=false,$level=99){$GLOBALS['definitions'][$path][$method]=[$callback,$public,$level];}
class Http {static function error($message,$status){throw new RuntimeException($message,$status);}}
function _monthly_work_report_need($user){if(empty($user['allowed']))Http::error('forbidden',403);}
class Db {
  static $calls=[];static $fail=false;static $old=null;
  static function run($sql,$params=[]){self::$calls[]=$sql;}
  static function all($sql,$params=[]){self::$calls[]=$sql;return [];}
  static function one($sql,$params=[]){self::$calls[]=$sql;return str_contains($sql,'sha256=?')?self::$old:null;}
  static function insert($sql,$params=[]){self::$calls[]=$sql;if(self::$fail)throw new RuntimeException('synthetic write failure');return 4;}
}
require_once __DIR__.'/../lib/company_work_routes.php';
class IsolatedCompanyWork extends CompanyWork {static $dir;static function directory(){return self::$dir;}}
function yes($label,$value){if(!$value)throw new RuntimeException('FAIL '.$label);echo "PASS $label\n";}
foreach($definitions as $path=>$methods)if(str_starts_with($path,'/api/admin/company-work'))foreach($methods as [$fn,$public,$level]){
  yes('private admin route '.$path,!$public&&$level===ADMIN);
  $before=count(Db::$calls);try{$fn(['id'=>999],[],['id'=>1,'allowed'=>false]);throw new RuntimeException('expected forbidden');}catch(RuntimeException $e){yes('permission checked before schema/data',$e->getCode()===403&&count(Db::$calls)===$before);}
}
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
