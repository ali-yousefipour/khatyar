<?php
/** Webhook ربات بله با پشتیبانی از گزینه «آخرین گزارش دریافتی». */
$ROOT = dirname(__DIR__);
require $ROOT.'/lib/Db.php';
require $ROOT.'/lib/Http.php';
require $ROOT.'/lib/Bale.php';
require $ROOT.'/lib/BaleReportTools.php';

function bale_webhook_send($chatId,$text,$keyboard) {
  $cfg=BaleBot::config(); $token=trim((string)($cfg['token']??''));
  if($token==='') throw new RuntimeException('bale_token_missing');
  $base=rtrim((string)($cfg['api_base']??'https://tapi.bale.ai'),'/');
  $payload=['chat_id'=>(string)$chatId,'text'=>(string)$text,'reply_markup'=>['keyboard'=>$keyboard,'resize_keyboard'=>true,'one_time_keyboard'=>false]];
  $ch=curl_init($base.'/bot'.$token.'/sendMessage');
  curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_POST=>true,CURLOPT_HTTPHEADER=>['Content-Type: application/json; charset=utf-8'],CURLOPT_POSTFIELDS=>json_encode($payload,JSON_UNESCAPED_UNICODE),CURLOPT_CONNECTTIMEOUT=>8,CURLOPT_TIMEOUT=>15]);
  $out=curl_exec($ch); $err=curl_error($ch); curl_close($ch);
  if($out===false) throw new RuntimeException($err?:'send_failed');
  return json_decode($out,true) ?: ['ok'=>true];
}

$raw=file_get_contents('php://input'); $msg=json_decode($raw,true);
if(!is_array($msg)){http_response_code(400);echo json_encode(['ok'=>false,'error'=>'invalid_json']);exit;}
$chatId=$msg['message']['chat']['id']??$msg['chat']['id']??null;
$text=trim((string)($msg['message']['text']??$msg['text']??''));
if(!$chatId){echo json_encode(['ok'=>true,'ignored'=>true]);exit;}

try {
  BaleReportTools::ensureTables();
  $menu=[
    [['text'=>'آخرین گزارش دریافتی']],
    [['text'=>'ثبت‌نام'],['text'=>'اطلاعات من']],
    [['text'=>'راهنما'],['text'=>'قطع اتصال']]
  ];
  $special=['آخرین گزارش دریافتی','آخرین گزارش','گزارش آخر','آخرین گزارش من'];
  if(in_array($text,$special,true)) {
    $report=BaleReportTools::text($chatId);
    bale_webhook_send($chatId,$report,$menu);
    echo json_encode(['ok'=>true,'action'=>'latest_report'],JSON_UNESCAPED_UNICODE); exit;
  }
  if(in_array($text,['/start','start','شروع','/menu','منو','بازگشت'],true)) {
    bale_webhook_send($chatId,'منوی ربات سامانه تاکسیرانی',$menu);
    echo json_encode(['ok'=>true,'action'=>'menu'],JSON_UNESCAPED_UNICODE); exit;
  }
  // سایر پیام‌ها دقیقاً به منطق فعلی BaleBot واگذار می‌شوند.
  $message=$msg['message']??$msg;
  $result=BaleBot::processMessage($message);
  echo json_encode($result,JSON_UNESCAPED_UNICODE);
} catch(Throwable $e) {
  http_response_code(200);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE);
}
