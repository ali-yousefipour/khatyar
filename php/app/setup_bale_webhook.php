<?php
/**
 * تنظیم webhook ربات بله روی endpoint جدید.
 * CLI: php setup_bale_webhook.php https://example.com/php/public/bale-webhook.php
 * یا HTTP با cron_key: ?url=...&key=...
 */
$ROOT=dirname(__DIR__);
require $ROOT.'/lib/Db.php';
require $ROOT.'/lib/Bale.php';

$isCli=php_sapi_name()==='cli';
$url=$isCli?($argv[1]??''):($_GET['url']??'');
if(!$isCli){$r=Db::one("SELECT value FROM app_settings WHERE `key`='cron_key'");$key=$r?json_decode($r['value'],true):'';if(!$key||($_GET['key']??'')!==$key){http_response_code(403);exit('forbidden');}}
$url=trim((string)$url);
if(!preg_match('~^https://~i',$url)){http_response_code(400);exit('https webhook url is required');}
$res=BaleBot::request('setWebhook',['url'=>$url],false);
header('Content-Type: application/json; charset=UTF-8');
echo json_encode(['ok'=>!empty($res['ok']),'webhook_url'=>$url,'response'=>$res],JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT);
