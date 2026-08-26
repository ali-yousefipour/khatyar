<?php
$__root = realpath(__DIR__ . '/../');
if (!$__root) $__root = dirname(__DIR__);
if (is_file($__root . '/.installed') && getenv('ALLOW_MAINTENANCE') !== '1') { http_response_code(403); exit('Maintenance scripts are disabled.'); }

/**
 * اسکریپت مهاجرت تصاویر: انتقال تصاویر base64 موجود در دیتابیس به فایل فیزیکی.
 * تصاویر را از ستون‌های *_data خوانده، فشرده و در public/uploads ذخیره می‌کند،
 * سپس مسیر را در ستون *_path می‌نویسد و در صورت موفقیت، *_data را خالی می‌کند.
 *
 * اجرا از خط فرمان (پیشنهادی):
 *   php /home/h301194/.../public/migrate_images.php
 *
 * یا از مرورگر با کلید (اگر CLI ندارید):
 *   https://app.yousefipour.ir/migrate_images.php?key=КЛЮЧ&limit=200
 *   (КЛЮЧ همان cron_key است؛ هر بار اجرا limit رکورد را مهاجرت می‌کند تا timeout نشود)
 *
 * ⚠ قبل از اجرا حتماً از دیتابیس بکاپ بگیرید.
 * ⚠ این اسکریپت idempotent است: فقط رکوردهایی که هنوز path ندارند را مهاجرت می‌کند.
 *   می‌توانید چند بار اجرا کنید تا همهٔ تصاویر منتقل شوند.
 */

@set_time_limit(0);
@ini_set('memory_limit', '768M');

$ROOT = __DIR__ . '/..';
require "$ROOT/lib/Db.php";
require "$ROOT/lib/Media.php";
$CONFIG = require "$ROOT/config.php";
$GLOBALS['CONFIG'] = $CONFIG;

$isCli = (php_sapi_name() === 'cli');
if (!$isCli) {
  header('Content-Type: application/json; charset=UTF-8');
  $ck = Db::one("SELECT value FROM app_settings WHERE `key`='cron_key'");
  $cronKey = $ck ? json_decode($ck['value'], true) : '';
  $given = $_GET['key'] ?? '';
  if (!$cronKey) {
    http_response_code(403);
    echo json_encode([
      'error' => 'کلید امنیتی (cron_key) روی این سامانه تنظیم نشده است.',
      'راهنما' => 'یا این اسکریپت را از خط فرمان (SSH) بدون کلید اجرا کنید: php migrate_images.php — یا ابتدا در جدول app_settings یک ردیف با key=cron_key و value یک عبارت دلخواه (مثلاً "mysecret123" با علامت نقل‌قول، چون JSON است) بسازید، سپس همان مقدار را در ?key= بگذارید.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
  }
  if ($given !== $cronKey) {
    http_response_code(403);
    echo json_encode([
      'error' => 'کلید واردشده با cron_key سامانه مطابقت ندارد.',
      'راهنما' => 'مقدار واقعی cron_key را از جدول app_settings (ردیف key=cron_key) بردارید و دقیقاً در ?key= بگذارید. عبارت КЛЮЧ در راهنما فقط یک نمونه بود، نه کلید واقعی.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
  }
}

// تعداد رکورد در هر اجرا (برای جلوگیری از timeout در حالت وب)
$limit = $isCli ? 100000 : max(20, min(500, (int)($_GET['limit'] ?? 150)));

$report = [];

/**
 * مهاجرت یک جدول:
 * $table, $dataCol (ستون base64), $pathCol (ستون مقصد), $type (زیرپوشه), $idCol
 */
function migrate_table($table, $dataCol, $pathCol, $type, $maxW, $q, $limit, &$report) {
  $done = 0; $fail = 0;
  try {
    $rows = Db::all("SELECT id, `$dataCol` AS d FROM `$table`
      WHERE `$dataCol` IS NOT NULL AND `$dataCol` <> '' AND (`$pathCol` IS NULL OR `$pathCol` = '')
      LIMIT $limit");
  } catch (\Throwable $e) {
    $report[$table] = 'skip: ' . $e->getMessage();
    return;
  }
  foreach ($rows as $r) {
    $path = Media::saveBase64($r['d'], $type, $maxW, $q);
    if ($path) {
      Db::run("UPDATE `$table` SET `$pathCol`=?, `$dataCol`=NULL WHERE id=?", [$path, $r['id']]);
      $done++;
    } else { $fail++; }
  }
  $report[$table] = ['migrated' => $done, 'failed' => $fail, 'remaining_in_batch' => count($rows) === $limit ? 'بیشتر هست' : 'تمام شد'];
}

// جداول و ستون‌ها (همان نگاشت معماری)
migrate_table('reports', 'attachment_data', 'attachment_path', 'reports', 1280, 70, $limit, $report);
migrate_table('notices', 'attachment_data', 'attachment_path', 'notices', 1280, 70, $limit, $report);
migrate_table('checklist_submissions', 'photo_data', 'photo_path', 'checklists', 1280, 70, $limit, $report);
migrate_table('official_visits', 'photo_data', 'photo_path', 'visits', 1280, 70, $limit, $report);
migrate_table('covert_selfies', 'photo_data', 'photo_path', 'covert', 960, 65, $limit, $report);
migrate_table('users', 'photo', 'photo_path', 'users', 600, 75, $limit, $report);
migrate_table('messages', 'attachment_data', 'attachment_path', 'messages', 1280, 70, $limit, $report);
// presence_checks دو ستون تصویر دارد
migrate_table('presence_checks', 'selfie', 'selfie_path', 'presence', 960, 65, $limit, $report);
migrate_table('presence_checks', 'vehicles_photo', 'vehicles_photo_path', 'presence', 1280, 68, $limit, $report);

$out = ['ok' => true, 'at' => date('c'), 'report' => $report,
        'note' => 'اگر «بیشتر هست» دیدید، اسکریپت را دوباره اجرا کنید تا همه منتقل شوند.'];
if ($isCli) {
  fwrite(STDOUT, json_encode($out, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n");
} else {
  echo json_encode($out, JSON_UNESCAPED_UNICODE);
}
