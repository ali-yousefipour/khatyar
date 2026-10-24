<?php
/** CLI adapter for existing background API handlers; no HTTP endpoint or public key exposure. */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('forbidden'); }
$tasks = [
  'presence-alert'=>['GET','/api/cron/presence-alert'],
  'delivery-queue'=>['POST','/api/cron/delivery-queue/process'],
  'system-health'=>['POST','/api/cron/system-health-probe'],
];
$task=$argv[1]??'';
if ($task!=='--check' && !isset($tasks[$task])) { fwrite(STDERR,"Use presence-alert, delivery-queue, system-health or --check\n"); exit(2); }
date_default_timezone_set('Asia/Tehran');
$ROOT=dirname(__DIR__);
foreach(['Db','Jwt','Http','Push','Sms','Bale','MessengerBots','ShiftCalc','Media','XlsxWriter','Backup','DeliveryQueue'] as $dependency) require_once "$ROOT/lib/$dependency.php";
$CONFIG=require "$ROOT/config.php";$GLOBALS['CONFIG']=$CONFIG;
$GLOBALS['background_cron_handlers']=[];
function route($method,$path,$callback,$public=false,$minLevel=99) {
  $allowed=['GET /api/cron/presence-alert','POST /api/cron/delivery-queue/process','POST /api/cron/system-health-probe'];
  $id=$method.' '.$path;if(in_array($id,$allowed,true))$GLOBALS['background_cron_handlers'][$id]=$callback;
}
require_once "$ROOT/lib/routes.php";
foreach($tasks as [$method,$path]) if(!isset($GLOBALS['background_cron_handlers'][$method.' '.$path])) { fwrite(STDERR,"Background handler missing\n");exit(1); }
if($task==='--check'){echo "Background handlers available: presence-alert, delivery-queue, system-health\n";exit(0);}
$lock='khatyar-background:'.$task;$locked=false;$ok=false;
try {
  $locked=(int)(Db::one('SELECT GET_LOCK(?,0) acquired',[$lock])['acquired']??0)===1;
  if(!$locked){echo json_encode(['ok'=>true,'task'=>$task,'skipped'=>'already_running'])."\n";exit(0);}
  $row=Db::one("SELECT value FROM app_settings WHERE `key`='cron_key'");
  $key=$row?json_decode($row['value'],true):null;
  if(!is_string($key)||$key==='')$key=getenv('CRON_KEY')?:'';
  if($key==='')throw new RuntimeException('Set cron_key before scheduling background tasks');
  [$method,$path]=$tasks[$task];$_SERVER['REQUEST_METHOD']=$method;$_SERVER['REQUEST_URI']=$path;$_GET=['key'=>$key];
  $result=($GLOBALS['background_cron_handlers'][$method.' '.$path])([],['key'=>$key,'limit'=>50],null);
  $ok=is_array($result)&&(!array_key_exists('ok',$result)||$result['ok']===true);
  if(isset($result['processed']['ok'])&&!$result['processed']['ok'])$ok=false;
  _cronlog_record($task,$ok?'ok':'error',$ok?'Background handler completed':'Background handler reported failure',true);
  echo json_encode(['ok'=>$ok,'task'=>$task,'at'=>date('c')])."\n";
} catch(Throwable $e) {
  // Never print a DB exception or the cron key into email/output.
  error_log('background_cron_failed task='.$task.' exception='.get_class($e));
  try{_cronlog_record($task,'error','Background handler failed; inspect private PHP error log',true);}catch(Throwable $ignored){}
  fwrite(STDERR,"Background handler failed; inspect private PHP error log\n");
} finally { if($locked)Db::one('SELECT RELEASE_LOCK(?) released',[$lock]); }
exit($ok?0:1);
