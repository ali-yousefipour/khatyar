<?php
/**
 * Webhook مستقل ربات بله با پشتیبانی از «آخرین گزارش دریافتی».
 * این endpoint برای هاست اشتراکی طراحی شده و از همان BaleBot فعلی استفاده می‌کند.
 */
$ROOT = dirname(__DIR__);
require $ROOT.'/lib/Db.php';
require $ROOT.'/lib/Http.php';
require $ROOT.'/lib/Bale.php';
require $ROOT.'/lib/BaleReportTools.php';

$raw = file_get_contents('php://input');
$msg = json_decode($raw, true);
if (!is_array($msg)) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'invalid_json']); exit; }

$chatId = $msg['message']['chat']['id'] ?? $msg['chat']['id'] ?? null;
$text = trim((string)($msg['message']['text'] ?? $msg['text'] ?? ''));
if (!$chatId) { echo json_encode(['ok'=>true,'ignored'=>true]); exit; }

try {
  BaleReportTools::ensureTables();
  $special = ['آخرین گزارش دریافتی','آخرین گزارش','گزارش آخر','آخرین گزارش من'];
  if (in_array($text, $special, true)) {
    $cfg = BaleBot::config();
    $token = trim((string)($cfg['token'] ?? ''));
    if ($token === '') throw new RuntimeException('bale_token_missing');
    $base = rtrim((string)($cfg['api_base'] ?? 'https://tapi.bale.ai'), '/');
    $reportText = BaleReportTools::text($chatId);
    $payload = ['chat_id'=>(string)$chatId,'text'=>$reportText,'reply_markup'=>[
      'keyboard'=>[
        [['text'=>'آخرین گزارش دریافتی']],
        [['text'=>'ثبت‌نام'],['text'=>'اطلاعات من']],
        [['text'=>'راهنما'],['text'=>'قطع اتصال']]
      ],'resize_keyboard'=>true,'one_time_keyboard'=>false
    ]];
    $ch = curl_init($base.'/bot'.$token.'/sendMessage');
    curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_POST=>true,CURLOPT_HTTPHEADER=>['Content-Type: application/json; charset=utf-8'],CURLOPT_POSTFIELDS=>json_encode($payload,JSON_UNESCAPED_UNICODE),CURLOPT_CONNECTTIMEOUT=>8,CURLOPT_TIMEOUT=>15]);
    $out = curl_exec($ch); $err = curl_error($ch); curl_close($ch);
    if ($out === false) throw new RuntimeException($err ?: 'send_failed');
    echo json_encode(['ok'=>true,'action'=>'latest_report'],JSON_UNESCAPED_UNICODE); exit;
  }

  // برای سایر پیام‌ها رفتار فعلی ربات حفظ می‌شود.
  $message = $msg['message'] ?? $msg;
  echo json_encode(BaleBot::processMessage($message),JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
  http_response_code(200);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE);
}
