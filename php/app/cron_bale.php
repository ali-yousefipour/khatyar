<?php
/**
 * Cron اختصاصی بله.
 * پیشنهاد cPanel: */5 * * * * php /path/to/php/app/cron_bale.php
 * اجرای مستقیم HTTP نیز با cron_key امکان‌پذیر است.
 */
$ROOT = dirname(__DIR__);
require $ROOT.'/lib/Db.php';
require $ROOT.'/lib/Http.php';
require $ROOT.'/lib/Bale.php';
require $ROOT.'/lib/BaleReportTools.php';

$isCli = php_sapi_name() === 'cli';
if (!$isCli) {
  $row = Db::one("SELECT value FROM app_settings WHERE `key`='cron_key'");
  $key = $row ? json_decode($row['value'], true) : '';
  if (!$key || ($_GET['key'] ?? '') !== $key) { http_response_code(403); exit('forbidden'); }
  header('Content-Type: application/json; charset=UTF-8');
}

$log = ['started_at'=>date('c'),'ok'=>true];
try {
  BaleBot::ensureProTables();
  BaleReportTools::ensureTables();

  // پاکسازی نشست‌ها و رویدادهای قدیمی تا جدول‌های ربات بی‌دلیل رشد نکنند.
  try { $log['sessions_deleted'] = (int)Db::run("DELETE FROM bale_chat_sessions WHERE updated_at < DATE_SUB(NOW(), INTERVAL 7 DAY)"); } catch (Throwable $e) { $log['sessions_deleted']=0; }
  try { $log['events_deleted'] = (int)Db::run("DELETE FROM bale_bot_events WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)"); } catch (Throwable $e) { $log['events_deleted']=0; }
  try { $log['last_report_cache_deleted'] = (int)Db::run("DELETE FROM bale_last_report_cache WHERE updated_at < DATE_SUB(NOW(), INTERVAL 180 DAY)"); } catch (Throwable $e) { $log['last_report_cache_deleted']=0; }

  // اگر ارسال قبلی در صف ثبت شده باشد، تلاش مجدد محدود و کنترل‌شده انجام می‌شود.
  $retried = 0;
  try {
    $rows = Db::all("SELECT id,chat_id,body FROM bale_message_log WHERE status='failed' AND chat_id IS NOT NULL AND body IS NOT NULL AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) ORDER BY id ASC LIMIT 25");
    foreach ($rows as $r) {
      $res = BaleBot::sendMessage($r['chat_id'], $r['body'], ['target_type'=>'bale_cron_retry','target_id'=>$r['id']]);
      if (!empty($res['ok'])) { $retried++; try { Db::run("UPDATE bale_message_log SET status='sent',response=? WHERE id=?",[json_encode($res,JSON_UNESCAPED_UNICODE),$r['id']]); } catch(Throwable $e){} }
    }
  } catch (Throwable $e) { $log['retry_error']=$e->getMessage(); }
  $log['failed_messages_retried']=$retried;
} catch (Throwable $e) {
  $log['ok']=false; $log['error']=$e->getMessage();
}
$log['finished_at']=date('c');
echo json_encode($log,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT);
