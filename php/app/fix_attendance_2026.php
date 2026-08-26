<?php
$__root = realpath(__DIR__ . '/../');
if (!$__root) $__root = dirname(__DIR__);
if (is_file($__root . '/.installed') && getenv('ALLOW_MAINTENANCE') !== '1') { http_response_code(403); exit('Maintenance scripts are disabled.'); }

// اسکریپت یک‌بارمصرف تعمیر پایگاه‌داده: افزودن ستون‌های گم‌شدهٔ جدول attendances
// و ایندکس جدول reports. بعد از اجرای موفق، این فایل را از روی سرور حذف کنید.
header('Content-Type: text/html; charset=utf-8');
require __DIR__ . '/../lib/Db.php';

function out($msg, $ok = true) {
  $color = $ok ? 'green' : 'red';
  echo "<div style='color:$color;font-family:monospace'>" . htmlspecialchars($msg) . "</div>";
}

echo "<h2>تعمیر جدول attendances و reports</h2>";

try {
  $pdo = Db::pdo();
  out('اتصال به دیتابیس برقرار شد.');
} catch (\Throwable $e) {
  out('اتصال به دیتابیس ناموفق بود: ' . $e->getMessage(), false);
  exit;
}

function ensureColumn($table, $col, $ddl) {
  try {
    $exists = Db::one("SHOW COLUMNS FROM `$table` WHERE Field=?", [$col]);
    if ($exists) { out("ستون $col در جدول $table از قبل وجود دارد."); return; }
    Db::run("ALTER TABLE `$table` ADD COLUMN $ddl");
    out("ستون $col با موفقیت به جدول $table اضافه شد.");
  } catch (\Throwable $e) {
    out("خطا هنگام افزودن ستون $col به $table: " . $e->getMessage(), false);
  }
}

function ensureIndex($table, $indexName, $ddl) {
  try {
    $exists = Db::one("SHOW INDEX FROM `$table` WHERE Key_name=?", [$indexName]);
    if ($exists) { out("ایندکس $indexName در جدول $table از قبل وجود دارد."); return; }
    Db::run("ALTER TABLE `$table` ADD INDEX $indexName $ddl");
    out("ایندکس $indexName با موفقیت به جدول $table اضافه شد.");
  } catch (\Throwable $e) {
    out("خطا هنگام افزودن ایندکس $indexName به $table: " . $e->getMessage(), false);
  }
}

// جدول attendances (رفع خطای «ثبت حضور»)
try {
  $t = Db::one("SHOW TABLES LIKE 'attendances'");
  if (!$t) { out('جدول attendances اصلا وجود ندارد! لطفاً db/mysql_schema.sql را اجرا کنید.', false); }
  else {
    ensureColumn('attendances', 'created_at', "`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
    ensureColumn('attendances', 'exit_at', "`exit_at` DATETIME NULL");
    ensureIndex('attendances', 'idx_att', "(driver_id, created_at)");
  }
} catch (\Throwable $e) { out('خطای غیرمنتظره: ' . $e->getMessage(), false); }

// جدول reports (رفع کندی ثبت گزارش)
try {
  $t = Db::one("SHOW TABLES LIKE 'reports'");
  if ($t) ensureIndex('reports', 'idx_reports_sender_created', "(sender_id, created_at)");
} catch (\Throwable $e) { out('خطای غیرمنتظره روی reports: ' . $e->getMessage(), false); }

echo "<hr><p>اگر همهٔ خطوط بالا سبز هستند، مشکل برطرف شده. حالا این فایل (fix_attendance_2026.php) را از سرور حذف کنید.</p>";
