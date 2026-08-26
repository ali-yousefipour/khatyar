<?php
// Khatyar — Bale inbound webhook. پاسخ باید همیشه JSON و سریع باشد.
ini_set('display_errors','0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$APP=dirname(__DIR__); $PHP=dirname($APP);
require_once $PHP.'/lib/Db.php';
require_once $PHP.'/lib/Bale.php';
require_once $PHP.'/lib/MessengerBots.php';
$CONFIG=require $PHP.'/config.php';

function bw_out($x,$s=200){http_response_code($s);echo json_encode($x,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;}
$c=BaleBot::config();
$secret=trim((string)($c['webhook_secret']??''));
$key=trim((string)($_GET['key']??''));
$header=trim((string)($_SERVER['HTTP_X_BALE_BOT_API_SECRET_TOKEN']??''));
if($secret!=='' && !hash_equals($secret,$key!==''?$key:$header)) bw_out(['ok'=>false,'error'=>'forbidden'],403);

$raw=file_get_contents('php://input');
if(trim($raw)==='') bw_out(['ok'=>true,'ignored'=>true]);
$msg=json_decode($raw,true);
if(!is_array($msg)) bw_out(['ok'=>false,'error'=>'invalid_json'],400);
try{
  $result=BaleBot::processMessage($msg);
  bw_out(['ok'=>true,'processed'=>true,'result'=>$result]);
}catch(Throwable $e){
  try{Db::run("INSERT INTO bale_bot_events(chat_id,event_type,input_text,payload_json,created_at) VALUES(?,?,?,?,NOW())",[$msg['message']['chat']['id']??null,'webhook_error',$msg['message']['text']??null,json_encode(['error'=>$e->getMessage(),'update'=>$msg],JSON_UNESCAPED_UNICODE)]);}catch(Throwable $_){}
  bw_out(['ok'=>false,'error'=>'processing_failed'],500);
}
