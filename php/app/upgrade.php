<?php
/**
 * upgrade.php
 * ارتقای تجمیعی دیتابیس سامانه مدیریت خطوط تاکسیرانی
 *
 * از این نسخه به بعد، به‌روزرسانی‌های دیتابیس در فایل‌های جداگانه قرار نمی‌گیرند
 * و همه تغییرات لازم در همین فایل به‌صورت idempotent اجرا می‌شوند.
 *
 * روش اجرا:
 *  1) فایل را در مسیر php/public/upgrade.php نگه دارید.
 *  2) در مرورگر اجرا کنید:
 *     https://YOUR-DOMAIN/upgrade.php?key=UPGRADE_KEY
 *  3) UPGRADE_KEY را در app_settings یا config.php تنظیم کنید؛ در صورت نبود، مقدار پیش‌فرض
 *     فقط برای نصب اولیه پذیرفته می‌شود.
 */
set_time_limit(0);
header('Content-Type: application/json; charset=utf-8');

$ROOT = __DIR__ . '/..';

// محافظ اصلی: پس از نصب سامانه (وجود .installed)، این اسکریپت به‌صورت پیش‌فرض
// غیرفعال است — دقیقاً مثل fix_attendance_2026.php / migrate_images.php /
// setup-libs.php. قبلاً تنها محافظ همان کلید upgrade_key بود که اگر تنظیم
// نشده بود (مقدار پیش‌فرض change-this-upgrade-key)، عملاً هیچ محافظتی وجود
// نداشت و upgrade.php برای همه روی اینترنت بدون کلید در دسترس بود.
// برای اجرا: قبل از باز کردن این آدرس، متغیر محیطی ALLOW_MAINTENANCE=1 را
// (مثلاً موقتاً در .env) تنظیم کنید، اجرا را انجام دهید، سپس آن را بردارید.
if (is_file($ROOT . '/.installed') && getenv('ALLOW_MAINTENANCE') !== '1') {
  http_response_code(403);
  echo json_encode(['ok'=>false,'error'=>'اجرای اسکریپت‌های ارتقا غیرفعال است. برای اجرا، ALLOW_MAINTENANCE=1 را موقتاً در .env تنظیم کنید.'], JSON_UNESCAPED_UNICODE);
  exit;
}

require_once "$ROOT/lib/Db.php";

$config = require "$ROOT/config.php";
$key = $_GET['key'] ?? $_POST['key'] ?? '';
$expected = $config['upgrade_key'] ?? getenv('UPGRADE_KEY') ?: 'change-this-upgrade-key';
// اگر کلید سفارشی تنظیم شده باشد، همچنان باید دقیقاً مطابقت داشته باشد
// (لایهٔ محافظتی دوم، مستقل از قفل ALLOW_MAINTENANCE بالا).
if ($expected !== 'change-this-upgrade-key' && $expected !== '' && !hash_equals((string)$expected, (string)$key)) {
  http_response_code(403);
  echo json_encode(['ok'=>false,'error'=>'کلید ارتقا نامعتبر است'], JSON_UNESCAPED_UNICODE);
  exit;
}

$log = [];
function out($msg){ global $log; $log[] = $msg; }
function q($sql, $params=[]){
  try { Db::run($sql, $params); return true; }
  catch (Throwable $e) { out('WARN: '.$e->getMessage().' :: '.preg_replace('/\s+/', ' ', substr($sql,0,180))); return false; }
}
function table_exists($table){
  try { return (bool)Db::one("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?", [$table]); }
  catch (Throwable $e) { return false; }
}
function col_exists($table,$col){
  try { return (bool)Db::one("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?", [$table,$col]); }
  catch (Throwable $e) { return false; }
}
function idx_exists($table,$idx){
  try { return (bool)Db::one("SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME=?", [$table,$idx]); }
  catch (Throwable $e) { return false; }
}
function add_col($table,$col,$def){
  if (table_exists($table) && !col_exists($table,$col)) q("ALTER TABLE `$table` ADD COLUMN `$col` $def");
}
function add_idx($table,$idx,$cols){
  if (table_exists($table) && !idx_exists($table,$idx)) q("ALTER TABLE `$table` ADD INDEX `$idx` ($cols)");
}
function setting($key,$value){
  q("CREATE TABLE IF NOT EXISTS app_settings (`key` VARCHAR(191) PRIMARY KEY, `value` JSON NULL, updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

  // v217: تکمیل موتور برنامه بازدید و پوشش خط
  q("CREATE TABLE IF NOT EXISTS mission_visit_sessions (id BIGINT AUTO_INCREMENT PRIMARY KEY,user_id INT NOT NULL,line_id INT NOT NULL,role_mode VARCHAR(40) NOT NULL,started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,finished_at DATETIME NULL,start_lat DECIMAL(10,7) NULL,start_lng DECIMAL(10,7) NULL,finish_lat DECIMAL(10,7) NULL,finish_lng DECIMAL(10,7) NULL,start_photo_path VARCHAR(500) NULL,finish_photo_path VARCHAR(500) NULL,start_accuracy DECIMAL(8,2) NULL,finish_accuracy DECIMAL(8,2) NULL,start_provider VARCHAR(30) NULL,finish_provider VARCHAR(30) NULL,report_text TEXT NULL,actual_present_count INT NULL,checked_count INT NOT NULL DEFAULT 0,attendance_count INT NOT NULL DEFAULT 0,notice_count INT NOT NULL DEFAULT 0,coverage_percent DECIMAL(6,2) NOT NULL DEFAULT 0,status VARCHAR(30) NOT NULL DEFAULT 'in_progress',validated TINYINT(1) NOT NULL DEFAULT 0,validation_percent DECIMAL(6,2) NOT NULL DEFAULT 0,validation_details LONGTEXT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,KEY idx_mvs_user_started(user_id,started_at),KEY idx_mvs_line_started(line_id,started_at),KEY idx_mvs_day_status(user_id,line_id,started_at,status)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  add_col('mission_visit_sessions','start_photo_path','VARCHAR(500) NULL'); add_col('mission_visit_sessions','finish_photo_path','VARCHAR(500) NULL');
  add_col('mission_visit_sessions','start_accuracy','DECIMAL(8,2) NULL'); add_col('mission_visit_sessions','finish_accuracy','DECIMAL(8,2) NULL');
  add_col('mission_visit_sessions','start_provider','VARCHAR(30) NULL'); add_col('mission_visit_sessions','finish_provider','VARCHAR(30) NULL');
  add_col('mission_visit_sessions','checked_count','INT NOT NULL DEFAULT 0'); add_col('mission_visit_sessions','attendance_count','INT NOT NULL DEFAULT 0'); add_col('mission_visit_sessions','notice_count','INT NOT NULL DEFAULT 0'); add_col('mission_visit_sessions','coverage_percent','DECIMAL(6,2) NOT NULL DEFAULT 0');
  add_idx('mission_visit_sessions','idx_mvs_day_status','user_id,line_id,started_at,status');
  q("INSERT INTO app_settings(`key`,`value`) VALUES(?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)", [$key,json_encode($value,JSON_UNESCAPED_UNICODE)]);
}
function setting_default($key,$value){
  q("CREATE TABLE IF NOT EXISTS app_settings (`key` VARCHAR(191) PRIMARY KEY, `value` JSON NULL, updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  q("INSERT IGNORE INTO app_settings(`key`,`value`) VALUES(?,?)", [$key,json_encode($value,JSON_UNESCAPED_UNICODE)]);
}

try {
  q("CREATE TABLE IF NOT EXISTS app_settings (`key` VARCHAR(191) PRIMARY KEY, `value` JSON NULL, updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  // پیش‌فرض آرشیو بی‌سیم: ۲۴ ساعت. اگر تنظیم جدید وجود نداشته باشد، مقدار قبلی روزانه به ۲۴ ساعت مهاجرت می‌شود.
  setting_default('radio_archive_retention_hours', 24);
  q("INSERT IGNORE INTO app_settings(`key`,`value`) VALUES('radio_archive_retention_hours',24)");
  q("UPDATE app_settings SET value='24' WHERE `key`='radio_archive_retention_hours' AND (value IS NULL OR value='')");

  // v218: یکپارچه‌سازی پرونده خودرو/موتورسیکلت و تاریخچه مستقل چک‌لیست
  q("CREATE TABLE IF NOT EXISTS personnel_vehicle_assets (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,user_id BIGINT UNSIGNED NOT NULL,asset_type ENUM('car','motorcycle') NOT NULL,plate_part_right VARCHAR(3) NULL,plate_letter VARCHAR(2) NULL,plate_part_left VARCHAR(2) NULL,plate_iran VARCHAR(2) NULL,motorcycle_plate_top VARCHAR(3) NULL,motorcycle_plate_bottom VARCHAR(5) NULL,vehicle_type VARCHAR(30) NULL,fuel_type VARCHAR(20) NULL,color VARCHAR(50) NULL,model_year SMALLINT NULL,chassis_number VARCHAR(80) NULL,engine_number VARCHAR(80) NULL,vin VARCHAR(80) NULL,motorcycle_usage VARCHAR(20) NULL,motorcycle_system VARCHAR(80) NULL,motorcycle_type VARCHAR(80) NULL,cylinders TINYINT NULL,license_number VARCHAR(80) NULL,license_issue_date VARCHAR(10) NULL,license_expiry_date VARCHAR(10) NULL,insurance_number VARCHAR(100) NULL,insurance_company VARCHAR(150) NULL,insurance_issue_date VARCHAR(10) NULL,insurance_expiry_date VARCHAR(10) NULL,technical_inspection_number VARCHAR(100) NULL,technical_inspection_issue_date VARCHAR(10) NULL,technical_inspection_expiry_date VARCHAR(10) NULL,fixed_beacon TINYINT(1) NULL,mobile_beacon TINYINT(1) NULL,heating_ok TINYINT(1) NULL,cooling_ok TINYINT(1) NULL,amplifier TINYINT(1) NULL,status ENUM('draft','pending','verified','needs_correction') NOT NULL DEFAULT 'pending',verified_by BIGINT UNSIGNED NULL,verified_at DATETIME NULL,checklist_note TEXT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY(id),UNIQUE KEY uq_personnel_asset_user_type(user_id,asset_type),KEY idx_personnel_asset_user(user_id),KEY idx_personnel_asset_status(status),KEY idx_personnel_asset_verified_by(verified_by),KEY idx_personnel_asset_updated(updated_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  q("CREATE TABLE IF NOT EXISTS personnel_vehicle_asset_photos (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,asset_id BIGINT UNSIGNED NOT NULL,photo_key VARCHAR(60) NOT NULL,data_uri LONGTEXT NOT NULL,crop_json TEXT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY(id),UNIQUE KEY uq_asset_photo(asset_id,photo_key),KEY idx_asset_photo_asset(asset_id),KEY idx_asset_photo_key(photo_key)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  q("CREATE TABLE IF NOT EXISTS personnel_vehicle_asset_checks (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,asset_id BIGINT UNSIGNED NOT NULL,checker_id BIGINT UNSIGNED NOT NULL,check_key VARCHAR(80) NOT NULL,check_value TINYINT(1) NOT NULL DEFAULT 0,note VARCHAR(500) NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY(id),UNIQUE KEY uq_asset_check(asset_id,checker_id,check_key),KEY idx_asset_check_asset(asset_id),KEY idx_asset_check_checker(checker_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  q("CREATE TABLE IF NOT EXISTS personnel_vehicle_checklist_history (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,asset_id BIGINT UNSIGNED NOT NULL,checker_id BIGINT UNSIGNED NOT NULL,result ENUM('verified','needs_correction') NOT NULL,note TEXT NULL,checks_json LONGTEXT NULL,checked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(id),KEY idx_pvch_asset(asset_id),KEY idx_pvch_checker(checker_id),KEY idx_pvch_checked_at(checked_at),KEY idx_pvch_asset_time(asset_id,checked_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  add_col('personnel_vehicle_checklist_history','checks_json','LONGTEXT NULL AFTER note');
  add_idx('personnel_vehicle_checklist_history','idx_pvch_asset_time','asset_id,checked_at');

  // نسخه جاری
  setting('site_version', '1.3.99');
  setting('app_version', '1.3.99');
  setting('db_upgrade_version', 'v218-personnel-vehicle-consolidation');


  // v182 / Phase 4: پایش سلامت دستگاه‌های موبایل
  q("CREATE TABLE IF NOT EXISTS mobile_device_health (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id BIGINT NOT NULL, device_key VARCHAR(191) NOT NULL, app_version VARCHAR(40) NULL, build_version VARCHAR(40) NULL, android_sdk INT NULL, manufacturer VARCHAR(100) NULL, model_name VARCHAR(150) NULL, device_name VARCHAR(150) NULL, app_state VARCHAR(30) NULL, reason VARCHAR(40) NULL, battery_level SMALLINT NULL, battery_state SMALLINT NULL, low_power_mode TINYINT(1) NOT NULL DEFAULT 0, network_connected TINYINT(1) NOT NULL DEFAULT 0, internet_reachable TINYINT(1) NOT NULL DEFAULT 0, network_type VARCHAR(40) NULL, local_ip VARCHAR(64) NULL, total_memory_bytes BIGINT NULL, free_disk_bytes BIGINT NULL, total_disk_bytes BIGINT NULL, api_ok TINYINT(1) NOT NULL DEFAULT 0, api_latency_ms INT NULL, api_status INT NULL, monitor_uptime_seconds INT NULL, captured_at DATETIME NOT NULL, received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, raw_payload JSON NULL, UNIQUE KEY uq_mdh_user_device_time(user_id,device_key,captured_at), INDEX idx_mdh_user_time(user_id,captured_at), INDEX idx_mdh_health(api_ok,network_connected,captured_at), INDEX idx_mdh_version(app_version,android_sdk,captured_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  q("CREATE TABLE IF NOT EXISTS mobile_device_health_latest (
    user_id BIGINT NOT NULL, device_key VARCHAR(191) NOT NULL, health_id BIGINT NULL, app_version VARCHAR(40) NULL, android_sdk INT NULL, manufacturer VARCHAR(100) NULL, model_name VARCHAR(150) NULL, battery_level SMALLINT NULL, free_disk_bytes BIGINT NULL, api_ok TINYINT(1) NOT NULL DEFAULT 0, api_latency_ms INT NULL, network_connected TINYINT(1) NOT NULL DEFAULT 0, internet_reachable TINYINT(1) NOT NULL DEFAULT 0, app_state VARCHAR(30) NULL, captured_at DATETIME NOT NULL, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY(user_id,device_key), INDEX idx_mdhl_time(captured_at), INDEX idx_mdhl_alert(api_ok,network_connected,battery_level,captured_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

  setting_default('plate_ocr_enabled', true);
  setting_default('plate_ocr_mode', 'server_model_then_fallback');
  setting_default('plate_ocr_min_confidence', 75);
  setting_default('plate_ocr_require_confirm', true);
  setting_default('plate_ocr_save_samples', true);
  setting_default('plate_ocr_fixed_letter', 'ت');
  setting_default('plate_ocr_region_code', '12');
  setting_default('plate_ocr_crop_width', 980);
  setting_default('plate_ocr_crop_quality', 82);
  setting_default('plate_ocr_min_training_samples', 10);
  setting_default('cloud_ocr_enabled', false);
  setting_default('cloud_ocr_provider', 'google_vision');
  setting_default('cloud_ocr_api_key', '');
  setting_default('cloud_ocr_endpoint', '');
  setting_default('cloud_ocr_connect_timeout', 8);
  setting_default('cloud_ocr_timeout', 20);




  // نمونه‌های آموزشی OCR پلاک تاکسی ۱۲/ت
  q("CREATE TABLE IF NOT EXISTS plate_scan_samples (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    vehicle_id INT NULL,
    original_image_path VARCHAR(255) NULL,
    crop_image_path VARCHAR(255) NULL,
    detected_plate VARCHAR(30) NULL,
    corrected_plate VARCHAR(30) NOT NULL,
    detected_digits_2 VARCHAR(2) NULL,
    detected_digits_3 VARCHAR(3) NULL,
    corrected_digits_2 VARCHAR(2) NULL,
    corrected_digits_3 VARCHAR(3) NULL,
    fixed_letter VARCHAR(5) NOT NULL DEFAULT 'ت',
    region_code VARCHAR(5) NOT NULL DEFAULT '12',
    confidence DECIMAL(5,2) NULL,
    ocr_source VARCHAR(80) NULL,
    raw_text TEXT NULL,
    status ENUM('verified','pending','rejected') NOT NULL DEFAULT 'verified',
    review_note TEXT NULL,
    reviewed_by INT NULL,
    reviewed_at DATETIME NULL,
    exported_at DATETIME NULL,
    client_time DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pss_plate(corrected_plate),
    INDEX idx_pss_user_time(user_id,created_at),
    INDEX idx_pss_vehicle(vehicle_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  add_idx('plate_scan_samples','idx_pss_plate','corrected_plate');
  add_idx('plate_scan_samples','idx_pss_user_time','user_id,created_at');
  add_idx('plate_scan_samples','idx_pss_vehicle','vehicle_id');
  add_col('plate_scan_samples','user_id','INT NULL');
  add_col('plate_scan_samples','vehicle_id','INT NULL');
  add_col('plate_scan_samples','original_image_path','VARCHAR(255) NULL');
  add_col('plate_scan_samples','crop_image_path','VARCHAR(255) NULL');
  add_col('plate_scan_samples','detected_plate','VARCHAR(30) NULL');
  add_col('plate_scan_samples','corrected_plate','VARCHAR(30) NULL');
  add_col('plate_scan_samples','detected_digits_2','VARCHAR(2) NULL');
  add_col('plate_scan_samples','detected_digits_3','VARCHAR(3) NULL');
  add_col('plate_scan_samples','corrected_digits_2','VARCHAR(2) NULL');
  add_col('plate_scan_samples','corrected_digits_3','VARCHAR(3) NULL');
  add_col('plate_scan_samples','fixed_letter',"VARCHAR(5) NOT NULL DEFAULT 'ت'");
  add_col('plate_scan_samples','region_code',"VARCHAR(5) NOT NULL DEFAULT '12'");
  add_col('plate_scan_samples','confidence','DECIMAL(5,2) NULL');
  add_col('plate_scan_samples','ocr_source','VARCHAR(80) NULL');
  add_col('plate_scan_samples','raw_text','TEXT NULL');
  add_col('plate_scan_samples','status',"VARCHAR(20) NOT NULL DEFAULT 'pending'");
  add_col('plate_scan_samples','review_note','TEXT NULL');
  add_col('plate_scan_samples','reviewed_by','INT NULL');
  add_col('plate_scan_samples','reviewed_at','DATETIME NULL');
  add_col('plate_scan_samples','exported_at','DATETIME NULL');
  add_idx('plate_scan_samples','idx_pss_status_time','status,created_at');
  add_idx('plate_scan_samples','idx_pss_reviewed','reviewed_by,reviewed_at');

  // آموزش مدل OCR مبتنی بر Python از سامانه حذف شده (تشخیص پلاک به‌طور کامل
  // روی گوشی با ML Kit انجام می‌شود). جدول plate_model_runs که ممکن است از
  // اجرای قبلی این اسکریپت روی سرور ساخته شده باشد، اینجا پاک‌سازی می‌شود.
  q("DROP TABLE IF EXISTS plate_model_runs");

  // جدول‌های پایه اعلان، صف پیام و سلامت
  q("CREATE TABLE IF NOT EXISTS delivery_queue (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    channel VARCHAR(20) NOT NULL,
    target_type VARCHAR(30) NULL,
    target_id BIGINT NULL,
    to_value VARCHAR(191) NULL,
    title VARCHAR(255) NULL,
    body TEXT NULL,
    payload JSON NULL,
    status ENUM('pending','processing','sent','failed','cancelled') NOT NULL DEFAULT 'pending',
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    next_attempt_at DATETIME NULL,
    last_error TEXT NULL,
    sent_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_delivery_status_next (status,next_attempt_at),
    INDEX idx_delivery_target (target_type,target_id),
    INDEX idx_delivery_channel (channel)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

  q("CREATE TABLE IF NOT EXISTS system_health_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    level VARCHAR(20) NOT NULL DEFAULT 'info',
    source VARCHAR(80) NULL,
    message TEXT NULL,
    context JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_health_level_time(level,created_at),
    INDEX idx_health_source_time(source,created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

  // Rule Engine سمت‌ها
  q("CREATE TABLE IF NOT EXISTS role_work_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_key VARCHAR(80) NOT NULL UNIQUE,
    title VARCHAR(120) NULL,
    duty_minutes INT NOT NULL DEFAULT 453,
    overtime_limit_minutes INT NOT NULL DEFAULT 27,
    surplus_after_minutes INT NOT NULL DEFAULT 480,
    night_start TIME NOT NULL DEFAULT '22:00:00',
    night_end TIME NOT NULL DEFAULT '06:00:00',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  $rules = [
    ['operator','اپراتور',453,27,480],
    ['line_chief','رئیس خط',453,27,480],
    ['inspector','بازرس',453,147,600],
    ['senior_inspector','سربازرس',453,147,600],
    ['chief_inspector','سربازرس ارشد',453,147,600],
    ['office','نیروی اداری',453,240,693],
    ['default','پیش‌فرض',453,27,480],
  ];
  foreach ($rules as $r) q("INSERT IGNORE INTO role_work_rules(role_key,title,duty_minutes,overtime_limit_minutes,surplus_after_minutes) VALUES(?,?,?,?,?)", $r);

  // تعطیلات و لاگ آفلاین
  q("CREATE TABLE IF NOT EXISTS holidays (
    id INT AUTO_INCREMENT PRIMARY KEY,
    jdate VARCHAR(10) NOT NULL UNIQUE,
    title VARCHAR(191) NULL,
    source VARCHAR(80) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_holidays_jdate(jdate)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

  q("CREATE TABLE IF NOT EXISTS offline_sync_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NULL,
    device_id VARCHAR(120) NULL,
    item_type VARCHAR(50) NULL,
    client_uuid VARCHAR(120) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'received',
    payload JSON NULL,
    response JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_offline_item (user_id, client_uuid),
    INDEX idx_offline_user_time(user_id,created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

  // تکمیل جدول‌های گزارش
  q("CREATE TABLE IF NOT EXISTS report_audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    report_id BIGINT NOT NULL,
    actor_id BIGINT NULL,
    action VARCHAR(50) NOT NULL,
    note TEXT NULL,
    meta JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_report_audit_report(report_id,created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

  q("CREATE TABLE IF NOT EXISTS report_attachments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    report_id BIGINT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NULL,
    mime_type VARCHAR(100) NULL,
    size_bytes BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_report_attachments_report(report_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

  q("CREATE TABLE IF NOT EXISTS report_deletions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    report_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    reason TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_report_deletion_user(report_id,user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

  if (table_exists('reports')) {
    add_col('reports','priority',"VARCHAR(20) NOT NULL DEFAULT 'normal'");
    add_col('reports','deleted_at',"DATETIME NULL");
    add_col('reports','updated_at',"DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP");
    add_idx('reports','idx_reports_sender_created','sender_id,created_at');
    add_idx('reports','idx_reports_status_created','status,created_at');
  }

  // تکمیل جدول حضور و کارکرد
  if (table_exists('user_attendance')) {
    add_col('user_attendance','auto_shift_type',"VARCHAR(30) NULL");
    add_col('user_attendance','duty_minutes',"INT NOT NULL DEFAULT 0");
    add_col('user_attendance','overtime_minutes',"INT NOT NULL DEFAULT 0");
    add_col('user_attendance','surplus_minutes',"INT NOT NULL DEFAULT 0");
    add_col('user_attendance','night_minutes',"INT NOT NULL DEFAULT 0");
    add_col('user_attendance','friday_minutes',"INT NOT NULL DEFAULT 0");
    add_col('user_attendance','holiday_minutes',"INT NOT NULL DEFAULT 0");
    add_col('user_attendance','reject_reason',"TEXT NULL");
    add_idx('user_attendance','idx_user_att_user_time','user_id,checkin_at,checkout_at');
    add_idx('user_attendance','idx_user_att_line_time','line_id,checkin_at');
  }
  if (table_exists('attendances')) {
    add_idx('attendances','idx_att_user_date','user_id,attendance_date');
    if (col_exists('attendances','driver_id')) add_idx('attendances','idx_att_driver_date','driver_id,attendance_date');
  }

  // فاز ۷.۲: تبدیل کنترل‌شدهٔ مازاد حضور به اضافه‌کار توسط مدیر و گزارش درست شیفت‌های عبوری از نیمه‌شب
  q("CREATE TABLE IF NOT EXISTS attendance_ot_adjustments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    jdate VARCHAR(10) NOT NULL,
    minutes INT NOT NULL DEFAULT 0,
    reason TEXT NULL,
    approved_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_att_adj (user_id,jdate),
    INDEX idx_att_adj_user (user_id,jdate)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  if (table_exists('staff_attendance')) {
    add_col('staff_attendance','calc_json',"JSON NULL");
    add_col('staff_attendance','handover_id',"INT NULL");
    add_idx('staff_attendance','idx_staff_att_user_in_out','user_id,check_in,check_out');
  }
  setting('phase7_part2_features', ['overnight_split'=>true,'friday_holiday_daily'=>true,'surplus_convert_ui'=>true]);

  // ربات بله
  q("CREATE TABLE IF NOT EXISTS bale_subscribers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    chat_id VARCHAR(120) NOT NULL UNIQUE,
    bale_user_id VARCHAR(120) NULL,
    mobile VARCHAR(20) NULL,
    user_id BIGINT NULL,
    driver_id BIGINT NULL,
    display_name VARCHAR(191) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    last_seen_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_bale_mobile(mobile),
    INDEX idx_bale_user(user_id),
    INDEX idx_bale_driver(driver_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

  q("CREATE TABLE IF NOT EXISTS bale_message_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    target_type VARCHAR(30) NULL,
    target_id BIGINT NULL,
    chat_id VARCHAR(120) NULL,
    body TEXT NULL,
    status VARCHAR(20) NULL,
    response JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_bale_msg_target(target_type,target_id),
    INDEX idx_bale_msg_status(status,created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");


  // Phase 7.11: ربات حرفه‌ای بله، منو، پاسخ سفارشی و فرم‌های ثبت‌نام
  q("CREATE TABLE IF NOT EXISTS bale_menu_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(120) NOT NULL,
    action_type VARCHAR(30) NOT NULL DEFAULT 'message',
    action_payload TEXT NULL,
    form_id BIGINT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,
    INDEX idx_bale_menu_active(is_active,sort_order)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  q("CREATE TABLE IF NOT EXISTS bale_custom_replies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    trigger_text VARCHAR(191) NOT NULL,
    match_type ENUM('exact','contains','starts_with') NOT NULL DEFAULT 'exact',
    response_text TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,
    INDEX idx_bale_reply_active(is_active,sort_order)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  q("CREATE TABLE IF NOT EXISTS bale_forms (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(160) NOT NULL,
    slug VARCHAR(100) NULL,
    description TEXT NULL,
    require_national_code TINYINT(1) NOT NULL DEFAULT 1,
    auto_prefill_driver TINYINT(1) NOT NULL DEFAULT 1,
    success_message TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,
    INDEX idx_bale_form_active(is_active,sort_order)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  q("CREATE TABLE IF NOT EXISTS bale_form_fields (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    form_id BIGINT NOT NULL,
    field_key VARCHAR(80) NOT NULL,
    label VARCHAR(160) NOT NULL,
    field_type VARCHAR(30) NOT NULL DEFAULT 'text',
    is_required TINYINT(1) NOT NULL DEFAULT 0,
    prefill_source VARCHAR(80) NULL,
    options_json JSON NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_bale_field(form_id,field_key),
    INDEX idx_bale_field_form(form_id,sort_order)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  q("CREATE TABLE IF NOT EXISTS bale_chat_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    chat_id VARCHAR(120) NOT NULL UNIQUE,
    action VARCHAR(40) NOT NULL,
    step VARCHAR(80) NULL,
    form_id BIGINT NULL,
    payload_json JSON NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_bale_session_action(action,updated_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  q("CREATE TABLE IF NOT EXISTS bale_form_submissions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    form_id BIGINT NOT NULL,
    chat_id VARCHAR(120) NOT NULL,
    subscriber_id BIGINT NULL,
    user_id BIGINT NULL,
    driver_id BIGINT NULL,
    national_code VARCHAR(20) NULL,
    mobile VARCHAR(20) NULL,
    data_json JSON NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    reviewed_by BIGINT NULL,
    reviewed_at DATETIME NULL,
    review_note TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_bale_sub_form(form_id,created_at),
    INDEX idx_bale_sub_status(status,created_at),
    INDEX idx_bale_sub_driver(driver_id),
    INDEX idx_bale_sub_user(user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  q("CREATE TABLE IF NOT EXISTS bale_bot_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    chat_id VARCHAR(120) NULL,
    event_type VARCHAR(60) NOT NULL,
    input_text TEXT NULL,
    payload_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_bale_event_type(event_type,created_at),
    INDEX idx_bale_event_chat(chat_id,created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  setting('phase7_part11_features', ['bale_menu'=>true,'custom_replies'=>true,'bale_forms'=>true,'driver_prefill'=>true,'bale_sessions'=>true]);

  // Phase 7.12 — یکسان‌سازی ربات‌های بله، تلگرام و ایتا
  q("CREATE TABLE IF NOT EXISTS messenger_subscribers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    platform VARCHAR(30) NOT NULL,
    chat_id VARCHAR(120) NOT NULL,
    platform_user_id VARCHAR(120) NULL,
    mobile VARCHAR(20) NULL,
    user_id BIGINT NULL,
    driver_id BIGINT NULL,
    display_name VARCHAR(191) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    last_seen_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,
    UNIQUE KEY uq_messenger_chat(platform,chat_id),
    INDEX idx_messenger_mobile(platform,mobile),
    INDEX idx_messenger_user(platform,user_id),
    INDEX idx_messenger_driver(platform,driver_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  q("CREATE TABLE IF NOT EXISTS messenger_message_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    platform VARCHAR(30) NOT NULL,
    target_type VARCHAR(60) NULL,
    target_id BIGINT NULL,
    chat_id VARCHAR(120) NULL,
    body TEXT NULL,
    status VARCHAR(30) NOT NULL,
    response JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_messenger_msg_platform(platform,created_at),
    INDEX idx_messenger_msg_target(platform,target_type,target_id),
    INDEX idx_messenger_msg_status(platform,status,created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  q("CREATE TABLE IF NOT EXISTS messenger_chat_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    platform VARCHAR(30) NOT NULL,
    chat_id VARCHAR(120) NOT NULL,
    action VARCHAR(40) NOT NULL,
    step VARCHAR(80) NULL,
    form_id BIGINT NULL,
    payload_json JSON NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_messenger_session(platform,chat_id),
    INDEX idx_messenger_session_action(platform,action,updated_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  q("CREATE TABLE IF NOT EXISTS messenger_form_submissions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    platform VARCHAR(30) NOT NULL,
    form_id BIGINT NOT NULL,
    chat_id VARCHAR(120) NOT NULL,
    subscriber_id BIGINT NULL,
    user_id BIGINT NULL,
    driver_id BIGINT NULL,
    national_code VARCHAR(20) NULL,
    mobile VARCHAR(20) NULL,
    data_json JSON NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    reviewed_by BIGINT NULL,
    reviewed_at DATETIME NULL,
    review_note TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_messenger_sub_platform(platform,created_at),
    INDEX idx_messenger_sub_form(platform,form_id,created_at),
    INDEX idx_messenger_sub_status(platform,status,created_at),
    INDEX idx_messenger_sub_driver(platform,driver_id),
    INDEX idx_messenger_sub_user(platform,user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  q("CREATE TABLE IF NOT EXISTS messenger_bot_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    platform VARCHAR(30) NOT NULL,
    chat_id VARCHAR(120) NULL,
    event_type VARCHAR(60) NOT NULL,
    input_text TEXT NULL,
    payload_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_messenger_event_platform(platform,created_at),
    INDEX idx_messenger_event_type(platform,event_type,created_at),
    INDEX idx_messenger_event_chat(platform,chat_id,created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  setting_default('telegram_api_base', 'https://api.telegram.org');
  setting_default('telegram_api_mode', 'bot_token_method');
  setting_default('telegram_enabled_items', ['messages'=>true,'birthday'=>true,'attendance'=>true,'bills'=>true,'warnings'=>true,'bot_forms'=>true,'custom_replies'=>true]);
  setting_default('eitaa_api_base', 'https://eitaayar.ir/api');
  setting_default('eitaa_api_mode', 'token_method');
  setting_default('eitaa_enabled_items', ['messages'=>true,'birthday'=>true,'attendance'=>true,'bills'=>true,'warnings'=>true,'bot_forms'=>true,'custom_replies'=>true]);
  setting('phase7_part12_features', ['telegram_bot'=>true,'eitaa_bot'=>true,'shared_bot_menu'=>true,'shared_custom_replies'=>true,'shared_forms'=>true,'platform_webhooks'=>true,'messenger_hub'=>true]);


  // فیش حقوقی
  q("CREATE TABLE IF NOT EXISTS salary_slips (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    jmonth VARCHAR(7) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    original_name VARCHAR(255) NULL,
    uploaded_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_salary_user_month(user_id,jmonth)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");



  // Phase 6: Monitoring, holiday import, mobile diagnostics and delivery dead-letter
  q("CREATE TABLE IF NOT EXISTS system_health_checks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    check_key VARCHAR(80) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ok',
    message TEXT NULL,
    meta JSON NULL,
    checked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_health_check_key_time(check_key,checked_at),
    INDEX idx_health_check_status(status,checked_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

  q("CREATE TABLE IF NOT EXISTS mobile_error_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NULL,
    device_id VARCHAR(120) NULL,
    app_version VARCHAR(40) NULL,
    screen VARCHAR(80) NULL,
    message TEXT NULL,
    stack MEDIUMTEXT NULL,
    extra JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_mobile_error_user_time(user_id,created_at),
    INDEX idx_mobile_error_app(app_version,created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

  q("CREATE TABLE IF NOT EXISTS delivery_dead_letters (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    original_queue_id BIGINT NULL,
    channel VARCHAR(20) NULL,
    target_type VARCHAR(30) NULL,
    target_id BIGINT NULL,
    to_value VARCHAR(191) NULL,
    title VARCHAR(255) NULL,
    body TEXT NULL,
    payload JSON NULL,
    attempts INT NOT NULL DEFAULT 0,
    last_error TEXT NULL,
    failed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dead_channel_time(channel,failed_at),
    INDEX idx_dead_target(target_type,target_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

  q("CREATE TABLE IF NOT EXISTS api_cache (
    cache_key VARCHAR(191) PRIMARY KEY,
    cache_value MEDIUMTEXT NULL,
    expires_at DATETIME NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_api_cache_exp(expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

  setting('phase6_features', ['holiday_import'=>true,'delivery_dead_letter'=>true,'mobile_error_logs'=>true,'health_v2'=>true]);



  // Phase 7 Part 3: complete auto-shift rule controls and attendance reject diagnostics
  q("CREATE TABLE IF NOT EXISTS attendance_reject_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    line_id BIGINT NULL,
    method VARCHAR(30) NULL,
    lat DECIMAL(10,7) NULL,
    lng DECIMAL(10,7) NULL,
    accuracy_m DECIMAL(10,2) NULL,
    reason TEXT NULL,
    meta JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_arl_user_time(user_id,created_at),
    INDEX idx_arl_line_time(line_id,created_at),
    INDEX idx_arl_created(created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

  if (table_exists('role_work_rules')) {
    add_col('role_work_rules','auto_shift_enabled',"TINYINT(1) NOT NULL DEFAULT 1");
    add_col('role_work_rules','checkin_any_time',"TINYINT(1) NOT NULL DEFAULT 1");
    add_col('role_work_rules','allowed_checkin_from',"TIME NULL");
    add_col('role_work_rules','allowed_checkin_to',"TIME NULL");
    add_col('role_work_rules','warn_before_overtime_cap_minutes',"INT NOT NULL DEFAULT 15");
    add_col('role_work_rules','require_checkout_after_cap',"TINYINT(1) NOT NULL DEFAULT 0");
    add_col('role_work_rules','night_calc',"TINYINT(1) NOT NULL DEFAULT 1");
    add_col('role_work_rules','friday_calc',"TINYINT(1) NOT NULL DEFAULT 1");
    add_col('role_work_rules','holiday_calc',"TINYINT(1) NOT NULL DEFAULT 1");
    add_col('role_work_rules','description',"TEXT NULL");
  }
  setting('phase7_part3_features', ['auto_shift_rules_admin'=>true,'attendance_reject_logs'=>true,'checkin_window_control'=>true]);



  // Phase 7 Part 4: offline sync processing and attendance reliability
  q("CREATE TABLE IF NOT EXISTS offline_sync_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NULL,
    device_id VARCHAR(120) NULL,
    item_type VARCHAR(80) NULL,
    client_uuid VARCHAR(120) NOT NULL,
    source_path VARCHAR(191) NULL,
    payload JSON NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'received',
    error TEXT NULL,
    server_result JSON NULL,
    processed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_offline_item (user_id, client_uuid),
    INDEX idx_offline_user_time(user_id,created_at),
    INDEX idx_offline_status_time(status,created_at),
    INDEX idx_offline_path_time(source_path,created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  if (table_exists('offline_sync_logs')) {
    add_col('offline_sync_logs','source_path',"VARCHAR(191) NULL");
    add_col('offline_sync_logs','error',"TEXT NULL");
    add_col('offline_sync_logs','server_result',"JSON NULL");
    add_col('offline_sync_logs','processed_at',"DATETIME NULL");
    add_idx('offline_sync_logs','idx_offline_status_time','status,created_at');
    add_idx('offline_sync_logs','idx_offline_path_time','source_path,created_at');
  }
  if (table_exists('staff_attendance')) {
    add_col('staff_attendance','client_uuid',"VARCHAR(120) NULL");
    add_col('staff_attendance','offline_synced',"TINYINT(1) NOT NULL DEFAULT 0");
    add_col('staff_attendance','client_check_in',"DATETIME NULL");
    add_col('staff_attendance','client_check_out',"DATETIME NULL");
    add_idx('staff_attendance','idx_staff_att_client_uuid','client_uuid');
    add_idx('staff_attendance','idx_staff_att_offline','offline_synced,check_in');
  }
  setting('phase7_part4_features', ['offline_sync_processing'=>true,'offline_checkin_checkout'=>true,'offline_locations'=>true,'admin_offline_logs'=>true]);

  // وضعیت اجرای ارتقا
  q("INSERT INTO system_health_logs(level,source,message,context) VALUES('info','upgrade','upgrade.php executed',?)",
    [json_encode(['site_version'=>110,'app_version'=>'1.1.0','time'=>date('c')], JSON_UNESCAPED_UNICODE)]);


  // Phase 7.5 — Offline conflict resolution upgrade
  add_col('offline_sync_logs','resolved_by',"BIGINT NULL");
  add_col('offline_sync_logs','resolved_at',"DATETIME NULL");
  add_col('offline_sync_logs','resolution_note',"TEXT NULL");
  add_col('offline_sync_logs','conflict_reason',"TEXT NULL");
  add_idx('offline_sync_logs','idx_offline_resolved','resolved_at,resolved_by');
  q("CREATE TABLE IF NOT EXISTS offline_sync_audit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    offline_sync_id BIGINT NOT NULL,
    actor_id BIGINT NULL,
    action VARCHAR(40) NOT NULL,
    note TEXT NULL,
    before_status VARCHAR(30) NULL,
    after_status VARCHAR(30) NULL,
    meta JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_osa_sync(offline_sync_id,created_at),
    INDEX idx_osa_actor(actor_id,created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");



  // Phase 7.7 — Shift scheduling finalization and auto-shift hardening
  if (table_exists('role_work_rules')) {
    add_col('role_work_rules','include_friday_in_duty',"TINYINT(1) NOT NULL DEFAULT 0");
    add_col('role_work_rules','include_holiday_in_duty',"TINYINT(1) NOT NULL DEFAULT 0");
    add_col('role_work_rules','max_open_session_minutes',"INT NOT NULL DEFAULT 960");
    add_col('role_work_rules','auto_close_enabled',"TINYINT(1) NOT NULL DEFAULT 0");
    add_col('role_work_rules','auto_close_after_minutes',"INT NOT NULL DEFAULT 0");
    add_col('role_work_rules','checkout_grace_minutes',"INT NOT NULL DEFAULT 15");
  }
  q("CREATE TABLE IF NOT EXISTS user_work_rule_overrides (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    title VARCHAR(160) NULL,
    duty_minutes INT NULL,
    overtime_limit_minutes INT NULL,
    surplus_after_minutes INT NULL,
    night_start TIME NULL,
    night_end TIME NULL,
    auto_shift_enabled TINYINT(1) NULL,
    checkin_any_time TINYINT(1) NULL,
    allowed_checkin_from TIME NULL,
    allowed_checkin_to TIME NULL,
    warn_before_overtime_cap_minutes INT NULL,
    require_checkout_after_cap TINYINT(1) NULL,
    night_calc TINYINT(1) NULL,
    friday_calc TINYINT(1) NULL,
    holiday_calc TINYINT(1) NULL,
    include_friday_in_duty TINYINT(1) NULL,
    include_holiday_in_duty TINYINT(1) NULL,
    max_open_session_minutes INT NULL,
    auto_close_enabled TINYINT(1) NULL,
    auto_close_after_minutes INT NULL,
    checkout_grace_minutes INT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_uwro_user(user_id,is_active)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  q("CREATE TABLE IF NOT EXISTS shift_assignment_audit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    shift_id INT NULL,
    from_jdate VARCHAR(10) NULL,
    to_jdate VARCHAR(10) NULL,
    action VARCHAR(30) NOT NULL,
    actor_id INT NULL,
    note TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_saa_user_time(user_id,created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  q("CREATE TABLE IF NOT EXISTS attendance_recalculate_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    from_jdate VARCHAR(10) NULL,
    to_jdate VARCHAR(10) NULL,
    rows_count INT NOT NULL DEFAULT 0,
    actor_id INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_recalc_user_time(user_id,created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  setting('phase7_part7_features', ['user_rule_overrides'=>true,'assignment_overlap_guard'=>true,'attendance_recalculate'=>true,'auto_close_open_sessions'=>true]);


  // Phase 7.8 — Client event time preservation for offline/online submissions
  add_col('staff_attendance','client_check_in',"DATETIME NULL");
  add_col('staff_attendance','client_check_out',"DATETIME NULL");
  add_col('staff_attendance','offline_synced',"TINYINT(1) NOT NULL DEFAULT 0");
  add_col('staff_attendance','client_uuid',"VARCHAR(120) NULL");
  add_idx('staff_attendance','idx_staff_att_client_uuid','client_uuid');
  add_idx('staff_attendance','idx_staff_att_user_checkin','user_id, check_in');
  add_idx('official_visits','idx_ov_recorded_time','recorded_by, created_at');
  add_idx('welfare_grants','idx_wg_granted_time','granted_by, created_at');
  add_idx('cultural_activities','idx_ca_recorded_time','recorded_by, created_at');
  add_idx('reports','idx_reports_sender_created','sender_id, created_at');
  setting('phase7_part8_features', ['client_event_time'=>true,'offline_official_visits'=>true,'welfare_date_fix'=>true,'offline_queue_partial_ack'=>true]);


  // Phase 7.13 — Complete system health dashboard
  q("CREATE TABLE IF NOT EXISTS system_health_checks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    check_key VARCHAR(80) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ok',
    message TEXT NULL,
    meta JSON NULL,
    checked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_health_check_key_time(check_key,checked_at),
    INDEX idx_health_check_status(status,checked_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  q("CREATE TABLE IF NOT EXISTS system_health_incidents (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    check_key VARCHAR(80) NOT NULL,
    status VARCHAR(20) NOT NULL,
    title VARCHAR(191) NULL,
    message TEXT NULL,
    meta JSON NULL,
    first_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME NULL,
    resolved_by BIGINT NULL,
    resolution_note TEXT NULL,
    INDEX idx_shi_key_status(check_key,status,last_seen_at),
    INDEX idx_shi_resolved(resolved_at,last_seen_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  q("INSERT INTO system_health_logs(level,source,message,context) VALUES('info','upgrade','phase7 part13 health dashboard installed',?)",
    [json_encode(['site_version'=>110,'app_version'=>'1.1.0','time'=>date('c')], JSON_UNESCAPED_UNICODE)]);
  setting('phase7_part13_features', ['health_dashboard_full'=>true,'queue_monitor'=>true,'messenger_monitor'=>true,'offline_monitor'=>true,'ocr_monitor'=>true,'cron_probe'=>true]);

  q("INSERT INTO system_health_logs(level,source,message,context) VALUES('info','upgrade','phase7 part14 browser babel removed and production panel bundle installed',?)",
    [json_encode(['site_version'=>110,'app_version'=>'1.1.0','time'=>date('c'),'bundle'=>'assets/panel.bundle.js'], JSON_UNESCAPED_UNICODE)]);
  setting('phase7_part14_features', ['browser_babel_removed'=>true,'text_babel_removed'=>true,'panel_bundle_js'=>true,'panel_bundle_css'=>true,'runtime_jsx_removed'=>true]);
  setting('phase7_part15_features', ['mysql_import_sql'=>true,'safe_mysql_indexes'=>true,'plate_ocr_settings_panel'=>true,'plate_ocr_defaults'=>true]);
  setting('station_enter_notify', ['enabled'=>false,'mode'=>'hierarchy','subject_mode'=>'all']);
  setting('attendance_checkin_notify', ['enabled'=>false,'mode'=>'hierarchy','subject_mode'=>'all']);
  setting('attendance_checkout_notify', ['enabled'=>false,'mode'=>'hierarchy','subject_mode'=>'all']);


  // Phase 7 Part 52 — Company document request backend and payment settings
  q("CREATE TABLE IF NOT EXISTS company_request_types (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    title VARCHAR(191) NOT NULL,
    price BIGINT NOT NULL DEFAULT 0,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    deadline_days INT NOT NULL DEFAULT 7,
    description TEXT NULL,
    required_fields JSON NULL,
    required_documents JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  q("CREATE TABLE IF NOT EXISTS company_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tracking_code VARCHAR(40) NOT NULL UNIQUE,
    request_type_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT NULL,
    driver_id BIGINT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'draft',
    amount BIGINT NOT NULL DEFAULT 0,
    payment_method VARCHAR(30) NULL,
    payment_status VARCHAR(30) NOT NULL DEFAULT 'unpaid',
    form_data JSON NULL,
    description TEXT NULL,
    assigned_to BIGINT NULL,
    reviewed_by BIGINT NULL,
    reviewed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company_req_user(user_id,created_at),
    INDEX idx_company_req_status(status,created_at),
    INDEX idx_company_req_type(request_type_id,created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  q("CREATE TABLE IF NOT EXISTS company_request_files (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    request_id BIGINT UNSIGNED NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    crop_meta JSON NULL,
    uploaded_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_company_req_files(request_id,document_type)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  q("CREATE TABLE IF NOT EXISTS company_request_payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    request_id BIGINT UNSIGNED NOT NULL,
    method VARCHAR(30) NOT NULL,
    amount BIGINT NOT NULL DEFAULT 0,
    currency VARCHAR(8) NOT NULL DEFAULT 'IRR',
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    transaction_id VARCHAR(191) NULL,
    provider_transaction_id VARCHAR(191) NULL,
    tracking_code VARCHAR(191) NULL,
    receipt_file_path VARCHAR(500) NULL,
    payer_note TEXT NULL,
    raw_payload JSON NULL,
    verified_by BIGINT NULL,
    verified_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company_payment_request(request_id,created_at),
    INDEX idx_company_payment_status(status,created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  q("CREATE TABLE IF NOT EXISTS company_request_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    request_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT NULL,
    action VARCHAR(80) NOT NULL,
    description TEXT NULL,
    meta JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_company_logs_request(request_id,created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  q("CREATE TABLE IF NOT EXISTS company_request_settings (
    setting_key VARCHAR(120) PRIMARY KEY,
    setting_value JSON NULL,
    updated_by BIGINT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

  $companyTypes = [
    ['technical_inspection_fix','اصلاح و پیوست معاینه فنی',0,['certificate_serial','start_date','end_date'],['technical_inspection']],
    ['insurance_fix','اصلاح و پیوست بیمه نامه',0,['insurance_unique_code','start_date','end_date'],['insurance_policy']],
    ['taxi_license_renewal','تمدید پروانه تاکسیرانی',0,[],['national_card','birth_certificate_page_1','birth_certificate_page_2','residence_document','driver_license_front','driver_license_back','portrait_photo']],
    ['operation_license_renewal','تمدید پروانه بهره برداری',0,[],['vehicle_card_front','vehicle_card_back','driver_license_front','driver_license_back','insurance_policy','technical_inspection']]
  ];
  foreach($companyTypes as $t){
    q("INSERT INTO company_request_types(code,title,price,enabled,deadline_days,required_fields,required_documents) VALUES(?,?,?,1,7,?,?) ON DUPLICATE KEY UPDATE title=VALUES(title),required_fields=VALUES(required_fields),required_documents=VALUES(required_documents)",[$t[0],$t[1],$t[2],json_encode($t[3],JSON_UNESCAPED_UNICODE),json_encode($t[4],JSON_UNESCAPED_UNICODE)]);
  }
  $companyDefaults = [
    'payment_mode'=>'both','card_bank'=>'','card_number'=>'','card_sheba'=>'','card_owner'=>'','card_description'=>'',
    'bale_payment_enabled'=>false,'bale_provider_token'=>'','bale_invoice_photo_url'=>'','merchant_name'=>'خطیار',
    'max_upload_mb'=>12,'quality_min_score'=>55,'quality_good_score'=>70,'quality_review_score'=>45,'quality_min_width'=>1200,'quality_min_height'=>800,'quality_enforce'=>false,'processed_max_width'=>2200,'processed_jpeg_quality'=>88,'allowed_mime_types'=>['image/jpeg','image/png','image/webp','application/pdf']
  ];
  foreach($companyDefaults as $k=>$v){ q("INSERT IGNORE INTO company_request_settings(setting_key,setting_value) VALUES(?,?)",[$k,json_encode($v,JSON_UNESCAPED_UNICODE)]); }
  setting('phase7_part52_features', ['company_request_phase1'=>true,'tariffs'=>true,'card_payment_settings'=>true,'bale_wallet_settings'=>true,'request_audit_log'=>true]);

  // Phase 7 Part 54 — Company requests payment/workflow integration
  foreach ([
    ['company_request_files','sha256','CHAR(64) NULL'],
    ['company_request_files','thumbnail_path','VARCHAR(500) NULL'],
    ['company_request_files','quality_score','TINYINT UNSIGNED NULL'],
    ['company_request_files','quality_status','VARCHAR(20) NULL'],
    ['company_request_files','quality_meta','LONGTEXT NULL'],
    ['company_request_files','ocr_text','LONGTEXT NULL'],
    ['company_request_files','ocr_meta','LONGTEXT NULL'],
    ['company_request_files','original_path','VARCHAR(500) NULL'],
    ['company_request_files','processed_path','VARCHAR(500) NULL'],
    ['company_request_files','processed_size','BIGINT NOT NULL DEFAULT 0'],
    ['company_request_files','source_type','VARCHAR(30) NULL'],
    ['company_request_payments','invoice_payload','VARCHAR(128) NULL'],
    ['company_request_payments','pre_checkout_query_id','VARCHAR(191) NULL'],
    ['company_request_payments','telegram_payment_charge_id','VARCHAR(191) NULL'],
    ['company_request_payments','rejection_reason','TEXT NULL'],
    ['company_request_payments','invoice_message_id','VARCHAR(191) NULL'],
    ['company_request_payments','invoice_sent_at','DATETIME NULL'],
    ['company_request_payments','inquiry_count','INT NOT NULL DEFAULT 0'],
    ['company_request_payments','last_inquired_at','DATETIME NULL'],
    ['company_request_payments','last_error','TEXT NULL'],
  ] as $c) { try { if (!col_exists($c[0],$c[1])) q("ALTER TABLE `{$c[0]}` ADD COLUMN `{$c[1]}` {$c[2]}"); } catch (Throwable $e) {} }
  try { q("CREATE UNIQUE INDEX uq_company_payment_payload ON company_request_payments(invoice_payload)"); } catch (Throwable $e) {}
  try { q("CREATE INDEX idx_company_file_hash ON company_request_files(request_id,sha256)"); } catch (Throwable $e) {}
  setting('phase7_part54_features', ['bale_send_invoice'=>true,'precheckout_validation'=>true,'successful_payment'=>true,'card_receipt_review'=>true,'required_document_validation'=>true,'file_hash_deduplication'=>true]);
  setting('phase7_part57_features', ['bale_invoice_retry'=>true,'precheckout_idempotency'=>true,'successful_payment_idempotency'=>true,'transaction_inquiry'=>true,'payment_reconciliation'=>true,'invoice_resend'=>true]);
  // Phase 7 Part 58 — Hardened card-to-card payment workflow
  q("CREATE TABLE IF NOT EXISTS company_card_payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    payment_id BIGINT UNSIGNED NOT NULL,
    request_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT NULL,
    amount BIGINT NOT NULL DEFAULT 0,
    declared_amount BIGINT NOT NULL DEFAULT 0,
    card_number VARCHAR(32) NULL,
    tracking_number VARCHAR(64) NOT NULL,
    bank_name VARCHAR(120) NULL,
    paid_at DATETIME NULL,
    receipt_file_id BIGINT UNSIGNED NULL,
    receipt_file_path VARCHAR(500) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    device_id VARCHAR(191) NULL,
    submitted_ip VARCHAR(64) NULL,
    reviewed_by BIGINT NULL,
    reviewed_at DATETIME NULL,
    reject_reason TEXT NULL,
    operator_note TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_company_card_tracking(tracking_number),
    UNIQUE KEY uq_company_card_payment(payment_id),
    INDEX idx_company_card_request(request_id,status,created_at),
    INDEX idx_company_card_status(status,created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  foreach ([
    ['company_request_payments','paid_at','DATETIME NULL'],
    ['company_request_payments','declared_amount','BIGINT NULL'],
    ['company_request_payments','bank_name','VARCHAR(120) NULL'],
    ['company_request_payments','receipt_file_id','BIGINT UNSIGNED NULL'],
    ['company_request_payments','device_id','VARCHAR(191) NULL'],
    ['company_request_payments','submitted_ip','VARCHAR(64) NULL'],
    ['company_request_payments','review_note','TEXT NULL'],
  ] as $c) { try { if (!col_exists($c[0],$c[1])) q("ALTER TABLE `{$c[0]}` ADD COLUMN `{$c[1]}` {$c[2]}"); } catch (Throwable $e) {} }
  $cardDefaults = [
    'card_payment_enabled'=>true,
    'card_receipt_deadline_hours'=>24,
    'card_require_tracking'=>true,
    'card_require_amount'=>true,
    'card_require_paid_at'=>true,
    'card_tracking_min_length'=>6,
    'card_tracking_max_length'=>30,
    'card_amount_tolerance'=>0,
  ];
  foreach($cardDefaults as $k=>$v){ q("INSERT IGNORE INTO company_request_settings(setting_key,setting_value) VALUES(?,?)",[$k,json_encode($v,JSON_UNESCAPED_UNICODE)]); }
  setting('phase7_part58_features', ['card_payment_form'=>true,'receipt_resubmit'=>true,'duplicate_tracking_guard'=>true,'operator_payment_queue'=>true,'amount_validation'=>true,'payment_notifications'=>true]);

  // Phase 7 Part 59 — Company requests admin workflow, notifications and SLA
  foreach ([
    ['company_requests','due_at','DATETIME NULL'],
    ['company_requests','last_status_at','DATETIME NULL'],
    ['company_requests','completed_at','DATETIME NULL'],
    ['company_requests','admin_note','TEXT NULL'],
    ['company_requests','priority',"VARCHAR(20) NOT NULL DEFAULT 'normal'"],
    ['company_requests','last_sla_notified_at','DATETIME NULL'],
  ] as $c) { try { if (!col_exists($c[0],$c[1])) q("ALTER TABLE `{$c[0]}` ADD COLUMN `{$c[1]}` {$c[2]}"); } catch (Throwable $e) {} }
  try { q("CREATE INDEX idx_company_req_due ON company_requests(due_at,status)"); } catch (Throwable $e) {}
  q("UPDATE company_requests cr JOIN company_request_types rt ON rt.id=cr.request_type_id SET cr.due_at=DATE_ADD(cr.created_at,INTERVAL GREATEST(1,rt.deadline_days) DAY) WHERE cr.due_at IS NULL");
  q("UPDATE company_requests SET last_status_at=COALESCE(last_status_at,created_at)");
  foreach ([
    'notify_admins'=>true,
    'notification_admin_user_ids'=>[],
    'sla_warning_hours'=>24,
  ] as $k=>$v) { q("INSERT IGNORE INTO company_request_settings(setting_key,setting_value) VALUES(?,?)",[$k,json_encode($v,JSON_UNESCAPED_UNICODE)]); }
  setting('phase7_part59_features', ['admin_dashboard'=>true,'sla_tracking'=>true,'overdue_filter'=>true,'status_notifications'=>true,'admin_notifications'=>true,'request_lifecycle_log'=>true]);
  setting('db_upgrade_version', 'phase7-part59-company-admin-workflow-notifications');
  setting('db_upgrade_version', 'phase7-part58-company-card-payment-workflow');
  setting('db_upgrade_version', 'phase7-part57-company-bale-payment-hardening');
  setting('db_upgrade_version', 'phase7-part54-company-payment-workflow');

  setting('db_upgrade_version', 'phase7-part52-company-requests-phase1');

  // Phase 7 Part 51 — اصلاح کشور IPهای ایرانی و اعلان فاصله خروج از خط
  // اصلاح رکوردهای قبلی برای دو رنج شناخته‌شده اپراتورهای ایران؛ تشخیص زنده از فهرست رسمی RIPE تکمیل می‌شود.
  if (table_exists('user_net_state') && col_exists('user_net_state','last_ip') && col_exists('user_net_state','ip_country')) {
    q("UPDATE user_net_state SET ip_country='IR' WHERE INET_ATON(last_ip) BETWEEN INET_ATON('5.112.0.0') AND INET_ATON('5.127.255.255')");
    q("UPDATE user_net_state SET ip_country='IR' WHERE INET_ATON(last_ip) BETWEEN INET_ATON('83.120.0.0') AND INET_ATON('83.123.255.255')");
  }
  if (table_exists('vpn_events') && col_exists('vpn_events','ip') && col_exists('vpn_events','country')) {
    q("UPDATE vpn_events SET country='IR' WHERE INET_ATON(ip) BETWEEN INET_ATON('5.112.0.0') AND INET_ATON('5.127.255.255')");
    q("UPDATE vpn_events SET country='IR' WHERE INET_ATON(ip) BETWEEN INET_ATON('83.120.0.0') AND INET_ATON('83.123.255.255')");
  }
  setting('phase7_part51_features', ['ripe_iran_ip_verification'=>true,'iran_ip_cache'=>true,'station_exit_distance'=>true]);
  setting('db_upgrade_version', 'phase7-part51-ip-country-distance');

  // V181 Phase 3 - multi-signal VPN monitoring
  try {
    q("CREATE TABLE IF NOT EXISTS vpn_status_reports (
      id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id BIGINT NOT NULL, vpn_on TINYINT(1) NOT NULL DEFAULT 0,
      event VARCHAR(24) NOT NULL DEFAULT 'vpn_heartbeat', detected_by JSON NULL, tunnel_interfaces JSON NULL,
      dns_servers JSON NULL, network_type VARCHAR(32) NULL, client_public_ip VARCHAR(64) NULL, server_ip VARCHAR(64) NULL,
      ip_country VARCHAR(4) NULL, sdk_int INT NULL, checked_at DATETIME NOT NULL, duration_seconds INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_vpn_reports_user_checked (user_id, checked_at), INDEX idx_vpn_reports_state_checked (vpn_on, checked_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    if (table_exists('user_net_state')) {
      if (!col_exists('user_net_state','vpn_started_at')) q("ALTER TABLE user_net_state ADD COLUMN vpn_started_at DATETIME NULL");
      if (!col_exists('user_net_state','vpn_duration_seconds')) q("ALTER TABLE user_net_state ADD COLUMN vpn_duration_seconds INT NOT NULL DEFAULT 0");
      if (!col_exists('user_net_state','vpn_detected_by')) q("ALTER TABLE user_net_state ADD COLUMN vpn_detected_by JSON NULL");
      if (!col_exists('user_net_state','vpn_network_type')) q("ALTER TABLE user_net_state ADD COLUMN vpn_network_type VARCHAR(32) NULL");
      if (!col_exists('user_net_state','vpn_dns')) q("ALTER TABLE user_net_state ADD COLUMN vpn_dns JSON NULL");
    }
    ok('V181 VPN monitoring tables/columns');
  } catch (Throwable $e) { fail('V181 VPN monitoring: '.$e->getMessage()); }

  echo json_encode(['ok'=>true,'version'=>'1.1.0','site_version'=>110,'log'=>$log], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage(),'log'=>$log], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}

  foreach ([
    'quality_good_score'=>70,'quality_review_score'=>45,'quality_min_width'=>1200,'quality_min_height'=>800,
    'processed_max_width'=>2200,'processed_jpeg_quality'=>88
  ] as $k=>$v) { try { q("INSERT IGNORE INTO company_request_settings(setting_key,setting_value) VALUES(?,?)",[$k,json_encode($v)]); } catch (Throwable $e) {} }
  try { q("UPDATE company_request_settings SET setting_value='false' WHERE setting_key='ocr_on_upload'"); } catch (Throwable $e) {}
  setting('phase7_part60_features', ['document_quality_without_ocr'=>true,'blur_light_glare_shadow'=>true,'resolution_crop_check'=>true,'screenshot_heuristic'=>true,'cross_request_duplicate_check'=>true,'original_processed_storage'=>true,'quality_finalize'=>true]);


// v151 - اشتراک گروهی و انفرادی
try {
  Db::exec("CREATE TABLE IF NOT EXISTS subscription_payments (id INT AUTO_INCREMENT PRIMARY KEY,user_id INT NOT NULL,mode VARCHAR(20) NOT NULL,amount BIGINT NOT NULL,status VARCHAR(20) NOT NULL DEFAULT 'pending',invoice_payload VARCHAR(255) NOT NULL UNIQUE,provider_transaction_id VARCHAR(190) NULL,paid_at DATETIME NULL,raw_payload LONGTEXT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,KEY(user_id),KEY(status)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  Db::exec("CREATE TABLE IF NOT EXISTS user_subscriptions (id INT AUTO_INCREMENT PRIMARY KEY,user_id INT NOT NULL UNIQUE,starts_at DATETIME NOT NULL,expires_at DATETIME NOT NULL,amount BIGINT NOT NULL DEFAULT 0,status VARCHAR(20) NOT NULL DEFAULT 'active',payment_id INT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,KEY(expires_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  Db::exec("CREATE TABLE IF NOT EXISTS group_subscriptions (id INT AUTO_INCREMENT PRIMARY KEY,payer_user_id INT NOT NULL,starts_at DATETIME NOT NULL,expires_at DATETIME NOT NULL,amount BIGINT NOT NULL DEFAULT 0,status VARCHAR(20) NOT NULL DEFAULT 'active',payment_id INT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,KEY(expires_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  foreach(['subscription_enabled'=>false,'subscription_mode'=>'normal','subscription_group_amount'=>0,'subscription_individual_amount'=>0] as $k=>$v) setting($k,$v);
} catch (Throwable $e) { error_log('v151_subscription_upgrade: '.$e->getMessage()); }
