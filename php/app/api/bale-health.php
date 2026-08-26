<?php
// Khatyar — Bale diagnostics/setup. فقط برای مدیر سامانه.
// Trigger marker: report-bot-e2e integration.
ini_set('display_errors','0'); error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store');
$APP=dirname(__DIR__); $PHP=dirname($APP);
require_once $PHP.'/lib/Db.php'; require_once $PHP.'/lib/Jwt.php'; require_once $PHP.'/lib/Bale.php';
$CONFIG=require $PHP.'/config.php';
function bh_out($x,$s=200){http_response_code($s);echo json_encode($x,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;}
function bh_admin(){global $CONFIG;$h=$_SERVER['HTTP_AUTHORIZATION']??'';if(!preg_match('/Bearer\s+(.+)/i',$h,$m))bh_out(['ok'=>false,'error'=>'unauthorized'],401);$p=Jwt::verify(trim($m[1]),$CONFIG['jwt_secret']);if(!$p)bh_out(['ok'=>false,'error'=>'invalid_token'],401);$u=Db::one("SELECT id,level,is_active FROM users WHERE id=?",[$p['sub']]);if(!$u||!(int)$u['is_active']||((int)($u['level']??0)<3))bh_out(['ok'=>false,'error'=>'forbidden'],403);return $u;}
bh_admin();
$c=BaleBot::config();
if(!$c['token'])bh_out(['ok'=>false,'error'=>'bale_token_not_configured','enabled'=>$c['enabled']],422);
$op=trim((string)($_GET['op']??'diagnose'));
if($op==='set-webhook'){
  $base=rtrim((string)($CONFIG['public_url']??''),'/'); if($base==='')$base='https://app.yousefipour.ir';
  $url=$base.'/api/bale-webhook.php';
  if(!empty($c['webhook_secret']))$url.='?key='.rawurlencode($c['webhook_secret']);
  $r=BaleBot::request('setWebhook',['url'=>$url],false);
  bh_out(['ok'=>!empty($r['ok']),'operation'=>'setWebhook','url'=>$url,'response'=>$r]);
}
if($op==='delete-webhook'){
  $r=BaleBot::request('deleteWebhook',[],false); bh_out(['ok'=>!empty($r['ok']),'operation'=>'deleteWebhook','response'=>$r]);
}
$me=BaleBot::request('getMe',[],false);
$wh=BaleBot::request('getWebhookInfo',[],false);
bh_out(['ok'=>!empty($me['ok']) && !empty($wh['ok']),'enabled'=>$c['enabled'],'has_token'=>true,'api_base'=>$c['api_base'],'getMe'=>$me,'webhook'=>$wh,'webhook_endpoint'=>'https://app.yousefipour.ir/api/bale-webhook.php']);
