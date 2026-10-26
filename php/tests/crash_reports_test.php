<?php
class Http {static function error($message,$status){throw new RuntimeException($message,$status);}}
class Db {
  static $rows=[],$calls=[],$count=0;
  static function run($sql,$args=[]){self::$calls[]=[$sql,$args];if(str_starts_with($sql,'INSERT INTO'))self::$rows[$args[0].':'.$args[1]]=['id'=>count(self::$rows)+1,'json'=>$args[2]];}
  static function one($sql,$args=[]){self::$calls[]=[$sql,$args];return str_contains($sql,'COUNT(*)')?['n'=>self::$count]:(self::$rows[$args[0].':'.$args[1]]??null);}
}
function route($method,$path,$handler,...$options){$GLOBALS['route']=[$method,$path,$handler,$options];}
$source=file_get_contents(__DIR__.'/../lib/routes.php');$start=strpos($source,'// BEGIN CLIENT CRASH REPORTS');$end=strpos($source,'// END CLIENT CRASH REPORTS',$start);eval(substr($source,$start,$end-$start));
function check($ok,$why){if(!$ok)throw new LogicException($why);}
function reject($body,$status){try{CrashReports::save($body,['id'=>1]);throw new LogicException('accepted invalid body');}catch(RuntimeException $e){check($e->getCode()===$status,'unexpected error code');}}
$body=['id'=>'CR-1234','message'=>'failed Bearer SECRET access_token=TOKEN password="PASSWORD"','stack'=>'stack','user_id'=>99,'last_api'=>['headers'=>['Authorization'=>'SECRET']]];
$result=CrashReports::save($body,['id'=>17]);check($result['ok']&&$result['id']===1,'acknowledgement');$stored=json_decode(Db::$rows['17:CR-1234']['json'],true);check(!isset($stored['user_id'])&&!isset($stored['last_api']),'raw sensitive fields excluded');foreach(['SECRET','TOKEN','PASSWORD'] as $secret)check(!str_contains($stored['message'],$secret),'secret not redacted');
$again=CrashReports::save($body,['id'=>17]);check($again['duplicate']&&count(Db::$rows)===1,'idempotent retry');CrashReports::save($body,['id'=>18]);check(count(Db::$rows)===2,'ids scoped to session');
reject(['id'=>'bad/id','message'=>'a'],422);reject(['id'=>'empty','message'=>''],422);reject(['id'=>'large','message'=>str_repeat('x',66000)],413);Db::$count=30;reject(['id'=>'limit','message'=>'a'],429);
check($GLOBALS['route'][0]==='POST'&&$GLOBALS['route'][1]==='/api/crash-reports'&&$GLOBALS['route'][3]===[],'default authenticated route');
echo "PASS crash reports: authenticated contract, session ownership, duplicate retry, whitelist, credential redaction, size validation and rate threshold\n";
