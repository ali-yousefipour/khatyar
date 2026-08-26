-- ============================================================
-- upgrade_import_mysql.sql
-- ارتقای تجمیعی دیتابیس سامانه مدیریت خطوط تاکسیرانی
-- مناسب Import مستقیم در phpMyAdmin / MySQL / MariaDB
-- این فایل PHP نیست؛ داخل phpMyAdmin همین فایل .sql را Import کنید.
-- چندبار قابل اجراست. دستورات ایندکس ناسازگار با MySQL استفاده نشده است.
-- نسخه: 1.1.0 / SITE_VERSION 110
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

-- ---------- ابزارهای امن ارتقا ----------

DROP PROCEDURE IF EXISTS __taxi_add_col;
DROP PROCEDURE IF EXISTS __taxi_add_idx;
DROP PROCEDURE IF EXISTS __taxi_setting;
DROP PROCEDURE IF EXISTS __taxi_setting_default;

DELIMITER $$
CREATE PROCEDURE __taxi_add_col(IN p_table VARCHAR(64), IN p_col VARCHAR(64), IN p_def TEXT)
BEGIN
  DECLARE v_table INT DEFAULT 0;
  DECLARE v_col INT DEFAULT 0;
  SELECT COUNT(*) INTO v_table FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=p_table;
  IF v_table > 0 THEN
    SELECT COUNT(*) INTO v_col FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=p_table AND COLUMN_NAME=p_col;
    IF v_col = 0 THEN
      SET @sql = CONCAT('ALTER TABLE `', REPLACE(p_table,'`','``'), '` ADD COLUMN `', REPLACE(p_col,'`','``'), '` ', p_def);
      PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    END IF;
  END IF;
END$$

CREATE PROCEDURE __taxi_add_idx(IN p_table VARCHAR(64), IN p_idx VARCHAR(64), IN p_cols TEXT, IN p_required_cols TEXT, IN p_unique TINYINT)
BEGIN
  DECLARE v_table INT DEFAULT 0;
  DECLARE v_idx INT DEFAULT 0;
  DECLARE v_need INT DEFAULT 0;
  DECLARE v_have INT DEFAULT 0;
  SELECT COUNT(*) INTO v_table FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=p_table;
  IF v_table > 0 THEN
    SELECT COUNT(*) INTO v_idx FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=p_table AND INDEX_NAME=p_idx;
    IF v_idx = 0 THEN
      IF p_required_cols IS NULL OR p_required_cols = '' THEN
        SET v_need = 0; SET v_have = 0;
      ELSE
        SET v_need = 1 + LENGTH(p_required_cols) - LENGTH(REPLACE(p_required_cols, ',', ''));
        SELECT COUNT(*) INTO v_have FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=p_table AND FIND_IN_SET(COLUMN_NAME, p_required_cols) > 0;
      END IF;
      IF v_need = v_have THEN
        SET @sql = CONCAT('ALTER TABLE `', REPLACE(p_table,'`','``'), '` ADD ', IF(p_unique=1,'UNIQUE INDEX ','INDEX '), '`', REPLACE(p_idx,'`','``'), '` (', p_cols, ')');
        PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
      END IF;
    END IF;
  END IF;
END$$

CREATE PROCEDURE __taxi_setting(IN p_key VARCHAR(191), IN p_value LONGTEXT)
BEGIN
  CREATE TABLE IF NOT EXISTS app_settings (
    `key` VARCHAR(191) PRIMARY KEY,
    `value` JSON NULL,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  INSERT INTO app_settings(`key`,`value`) VALUES(p_key,p_value)
  ON DUPLICATE KEY UPDATE `value`=VALUES(`value`), updated_at=NOW();
END$$

CREATE PROCEDURE __taxi_setting_default(IN p_key VARCHAR(191), IN p_value LONGTEXT)
BEGIN
  CREATE TABLE IF NOT EXISTS app_settings (
    `key` VARCHAR(191) PRIMARY KEY,
    `value` JSON NULL,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  INSERT IGNORE INTO app_settings(`key`,`value`) VALUES(p_key,p_value);
END$$
DELIMITER ;

-- ---------- جدول تنظیمات ----------
CREATE TABLE IF NOT EXISTS app_settings (
  `key` VARCHAR(191) PRIMARY KEY,
  `value` JSON NULL,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- نسخه ----------
CALL __taxi_setting('site_version','110');
CALL __taxi_setting('app_version','"1.1.0"');
CALL __taxi_setting('db_upgrade_version','"phase7-part17-1.1.0"');

-- ---------- تنظیمات پیش‌فرض پلاک‌خوان ----------
CALL __taxi_setting_default('plate_ocr_enabled','true');
CALL __taxi_setting_default('plate_ocr_mode','"server_model_then_fallback"');
CALL __taxi_setting_default('plate_ocr_min_confidence','75');
CALL __taxi_setting_default('plate_ocr_require_confirm','true');
CALL __taxi_setting_default('plate_ocr_save_samples','true');
CALL __taxi_setting_default('plate_ocr_fixed_letter','"ت"');
CALL __taxi_setting_default('plate_ocr_region_code','"12"');
CALL __taxi_setting_default('plate_ocr_crop_width','980');
CALL __taxi_setting_default('plate_ocr_crop_quality','82');
CALL __taxi_setting_default('plate_ocr_min_training_samples','10');
CALL __taxi_setting_default('cloud_ocr_enabled','false');
CALL __taxi_setting_default('cloud_ocr_provider','"google_vision"');
CALL __taxi_setting_default('cloud_ocr_api_key','""');
CALL __taxi_setting_default('cloud_ocr_endpoint','""');
CALL __taxi_setting_default('cloud_ocr_connect_timeout','8');
CALL __taxi_setting_default('cloud_ocr_timeout','20');

-- ---------- جدول‌های پایه و فازهای قبلی ----------
CREATE TABLE IF NOT EXISTS sms_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  to_mobile VARCHAR(20) NOT NULL,
  body TEXT NOT NULL,
  kind VARCHAR(30) NULL,
  status VARCHAR(20) NULL,
  message_id VARCHAR(40) NULL,
  sent_by INT NULL,
  driver_id INT NULL,
  delivery_code INT NULL,
  delivery_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sms_by (sent_by), INDEX idx_sms_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff_attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  line_id INT NULL,
  check_in DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  check_out DATETIME NULL,
  method VARCHAR(20) NULL,
  in_lat DOUBLE NULL, in_lng DOUBLE NULL, out_lat DOUBLE NULL, out_lng DOUBLE NULL,
  auto_closed TINYINT(1) NOT NULL DEFAULT 0,
  INDEX idx_sa_user (user_id, check_in), INDEX idx_sa_open (user_id, check_out)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS line_idents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  line_id INT NOT NULL,
  kind VARCHAR(10) NOT NULL,
  value VARCHAR(190) NOT NULL,
  label VARCHAR(120) NULL,
  INDEX idx_li_line (line_id), INDEX idx_li_val (kind, value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_managers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  manager_id INT NOT NULL,
  UNIQUE KEY uq_um (user_id, manager_id), INDEX idx_um_mgr (manager_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shifts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'simple',
  weekly JSON NULL,
  float_minutes INT NULL,
  allow_offday TINYINT(1) NOT NULL DEFAULT 0,
  daily_ot_cap INT NULL,
  monthly_ot_cap INT NULL,
  night_calc TINYINT(1) NOT NULL DEFAULT 1,
  friday_calc TINYINT(1) NOT NULL DEFAULT 1,
  holiday_calc TINYINT(1) NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shift_days (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shift_id INT NOT NULL,
  jdate VARCHAR(10) NOT NULL,
  segments JSON NULL,
  is_off TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_sd (shift_id, jdate), INDEX idx_sd (shift_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_shifts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  shift_id INT NOT NULL,
  from_jdate VARCHAR(10) NULL,
  to_jdate VARCHAR(10) NULL,
  UNIQUE KEY uq_us (user_id), INDEX idx_us_shift (shift_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS holidays (
  id INT AUTO_INCREMENT PRIMARY KEY,
  jdate VARCHAR(10) NOT NULL UNIQUE,
  title VARCHAR(191) NULL,
  source VARCHAR(80) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_holidays_jdate(jdate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(20) NOT NULL,
  unit VARCHAR(8) NULL,
  from_jdate VARCHAR(10) NULL,
  to_jdate VARCHAR(10) NULL,
  the_date VARCHAR(10) NULL,
  from_time VARCHAR(5) NULL,
  to_time VARCHAR(5) NULL,
  manual_kind VARCHAR(6) NULL,
  in_time VARCHAR(5) NULL,
  out_time VARCHAR(5) NULL,
  minutes INT NULL,
  reason TEXT NULL,
  attachment_name VARCHAR(255) NULL,
  attachment_data LONGTEXT NULL,
  selfie_data LONGTEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  approver_id INT NULL,
  approver_note TEXT NULL,
  decided_at DATETIME NULL,
  pending_on INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_req_user (user_id, created_at), INDEX idx_req_status (status), INDEX idx_req_pending (pending_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payroll_base (
  user_id INT PRIMARY KEY,
  base_monthly BIGINT NULL, housing BIGINT NULL, family BIGINT NULL, food BIGINT NULL,
  other_allow BIGINT NULL, insurance_pct DOUBLE NULL, tax_pct DOUBLE NULL, other_deduct BIGINT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS custom_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(120) NOT NULL,
  fkey VARCHAR(60) NOT NULL UNIQUE,
  ftype VARCHAR(20) NOT NULL DEFAULT 'text',
  options TEXT NULL,
  required TINYINT(1) NOT NULL DEFAULT 0,
  user_editable TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS custom_field_values (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  field_id INT NOT NULL,
  value TEXT NULL,
  UNIQUE KEY uq_cfv (user_id, field_id), INDEX idx_cfv_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_outages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  line_id INT NOT NULL,
  reported_by INT NULL,
  outage_date VARCHAR(10) NOT NULL,
  start_time VARCHAR(5) NOT NULL,
  end_time VARCHAR(5) NOT NULL,
  minutes INT NOT NULL DEFAULT 0,
  reason VARCHAR(190) NULL,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_so_line (line_id), INDEX idx_so_date (outage_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS report_archives (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ra (report_id, user_id), INDEX idx_ra_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS covert_selfies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  photo_data LONGTEXT NULL,
  lat DOUBLE NULL, lng DOUBLE NULL, reason VARCHAR(20) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cs_user (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- OCR پلاک و آموزش مدل ----------
CREATE TABLE IF NOT EXISTS plate_scan_samples (
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
  INDEX idx_pss_vehicle(vehicle_id),
  INDEX idx_pss_status_time(status,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS plate_model_runs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  model_key VARCHAR(80) NOT NULL DEFAULT 'taxi12_digit_rf',
  status ENUM('queued','training','ready','failed','insufficient') NOT NULL DEFAULT 'queued',
  samples_count INT NOT NULL DEFAULT 0,
  digit_count INT NOT NULL DEFAULT 0,
  classes_seen VARCHAR(80) NULL,
  accuracy DECIMAL(6,4) NULL,
  model_path VARCHAR(255) NULL,
  metadata_path VARCHAR(255) NULL,
  manifest_path VARCHAR(255) NULL,
  log_text MEDIUMTEXT NULL,
  error_text MEDIUMTEXT NULL,
  created_by INT NULL,
  started_at DATETIME NULL,
  finished_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pmr_status(status,created_at), INDEX idx_pmr_key(model_key,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- صف‌ها، سلامت، آفلاین و گزارش‌ها ----------
CREATE TABLE IF NOT EXISTS delivery_queue (
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
  INDEX idx_delivery_status_next (status,next_attempt_at), INDEX idx_delivery_target (target_type,target_id), INDEX idx_delivery_channel (channel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS delivery_dead_letters (
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
  INDEX idx_dead_channel_time(channel,failed_at), INDEX idx_dead_target(target_type,target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_health_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  level VARCHAR(20) NOT NULL DEFAULT 'info',
  source VARCHAR(80) NULL,
  message TEXT NULL,
  context JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_health_level_time(level,created_at), INDEX idx_health_source_time(source,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_health_checks (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  check_key VARCHAR(80) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ok',
  message TEXT NULL,
  meta JSON NULL,
  checked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_health_check_key_time(check_key,checked_at), INDEX idx_health_check_status(status,checked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_health_incidents (
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
  INDEX idx_shi_key_status(check_key,status,last_seen_at), INDEX idx_shi_resolved(resolved_at,last_seen_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mobile_error_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NULL,
  device_id VARCHAR(120) NULL,
  app_version VARCHAR(40) NULL,
  screen VARCHAR(80) NULL,
  message TEXT NULL,
  stack MEDIUMTEXT NULL,
  extra JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mobile_error_user_time(user_id,created_at), INDEX idx_mobile_error_app(app_version,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS api_cache (
  cache_key VARCHAR(191) PRIMARY KEY,
  cache_value MEDIUMTEXT NULL,
  expires_at DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_api_cache_exp(expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS offline_sync_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NULL,
  device_id VARCHAR(120) NULL,
  item_type VARCHAR(80) NULL,
  client_uuid VARCHAR(120) NOT NULL,
  source_path VARCHAR(191) NULL,
  payload JSON NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'received',
  error TEXT NULL,
  response JSON NULL,
  server_result JSON NULL,
  processed_at DATETIME NULL,
  resolved_by BIGINT NULL,
  resolved_at DATETIME NULL,
  resolution_note TEXT NULL,
  conflict_reason TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_offline_item (user_id, client_uuid),
  INDEX idx_offline_user_time(user_id,created_at), INDEX idx_offline_status_time(status,created_at), INDEX idx_offline_path_time(source_path,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS offline_sync_audit (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  offline_sync_id BIGINT NOT NULL,
  actor_id BIGINT NULL,
  action VARCHAR(40) NOT NULL,
  note TEXT NULL,
  before_status VARCHAR(30) NULL,
  after_status VARCHAR(30) NULL,
  meta JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_osa_sync(offline_sync_id,created_at), INDEX idx_osa_actor(actor_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS report_audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  report_id BIGINT NOT NULL,
  actor_id BIGINT NULL,
  action VARCHAR(50) NOT NULL,
  note TEXT NULL,
  meta JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_report_audit_report(report_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS report_attachments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  report_id BIGINT NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NULL,
  mime_type VARCHAR(100) NULL,
  size_bytes BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_report_attachments_report(report_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS report_deletions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  report_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  reason TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_report_deletion_user(report_id,user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- شیفت و کارکرد ----------
CREATE TABLE IF NOT EXISTS role_work_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_key VARCHAR(80) NOT NULL UNIQUE,
  title VARCHAR(120) NULL,
  duty_minutes INT NOT NULL DEFAULT 453,
  overtime_limit_minutes INT NOT NULL DEFAULT 27,
  surplus_after_minutes INT NOT NULL DEFAULT 480,
  night_start TIME NOT NULL DEFAULT '22:00:00',
  night_end TIME NOT NULL DEFAULT '06:00:00',
  auto_shift_enabled TINYINT(1) NOT NULL DEFAULT 1,
  checkin_any_time TINYINT(1) NOT NULL DEFAULT 1,
  allowed_checkin_from TIME NULL,
  allowed_checkin_to TIME NULL,
  warn_before_overtime_cap_minutes INT NOT NULL DEFAULT 15,
  require_checkout_after_cap TINYINT(1) NOT NULL DEFAULT 0,
  night_calc TINYINT(1) NOT NULL DEFAULT 1,
  friday_calc TINYINT(1) NOT NULL DEFAULT 1,
  holiday_calc TINYINT(1) NOT NULL DEFAULT 1,
  include_friday_in_duty TINYINT(1) NOT NULL DEFAULT 0,
  include_holiday_in_duty TINYINT(1) NOT NULL DEFAULT 0,
  max_open_session_minutes INT NOT NULL DEFAULT 960,
  auto_close_enabled TINYINT(1) NOT NULL DEFAULT 0,
  auto_close_after_minutes INT NOT NULL DEFAULT 0,
  checkout_grace_minutes INT NOT NULL DEFAULT 15,
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO role_work_rules(role_key,title,duty_minutes,overtime_limit_minutes,surplus_after_minutes) VALUES
('operator','اپراتور',453,27,480),('line_chief','رئیس خط',453,27,480),('inspector','بازرس',453,147,600),('senior_inspector','سربازرس',453,147,600),('chief_inspector','سربازرس ارشد',453,147,600),('office','نیروی اداری',453,240,693),('default','پیش‌فرض',453,27,480);

CREATE TABLE IF NOT EXISTS attendance_ot_adjustments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  jdate VARCHAR(10) NOT NULL,
  minutes INT NOT NULL DEFAULT 0,
  reason TEXT NULL,
  approved_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_att_adj (user_id,jdate), INDEX idx_att_adj_user (user_id,jdate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance_reject_logs (
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
  INDEX idx_arl_user_time(user_id,created_at), INDEX idx_arl_line_time(line_id,created_at), INDEX idx_arl_created(created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_work_rule_overrides (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shift_assignment_audit (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance_recalculate_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  from_jdate VARCHAR(10) NULL,
  to_jdate VARCHAR(10) NULL,
  rows_count INT NOT NULL DEFAULT 0,
  actor_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_recalc_user_time(user_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- ربات‌ها و پیام‌رسان‌ها ----------
CREATE TABLE IF NOT EXISTS bale_subscribers (
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
  INDEX idx_bale_mobile(mobile), INDEX idx_bale_user(user_id), INDEX idx_bale_driver(driver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bale_message_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  target_type VARCHAR(30) NULL,
  target_id BIGINT NULL,
  chat_id VARCHAR(120) NULL,
  body TEXT NULL,
  status VARCHAR(20) NULL,
  response JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bale_msg_target(target_type,target_id), INDEX idx_bale_msg_status(status,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bale_menu_items (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bale_custom_replies (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  trigger_text VARCHAR(191) NOT NULL,
  match_type ENUM('exact','contains','starts_with') NOT NULL DEFAULT 'exact',
  response_text TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  INDEX idx_bale_reply_active(is_active,sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bale_forms (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bale_form_fields (
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
  UNIQUE KEY uq_bale_field(form_id,field_key), INDEX idx_bale_field_form(form_id,sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bale_chat_sessions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  chat_id VARCHAR(120) NOT NULL UNIQUE,
  action VARCHAR(40) NOT NULL,
  step VARCHAR(80) NULL,
  form_id BIGINT NULL,
  payload_json JSON NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bale_session_action(action,updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bale_form_submissions (
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
  INDEX idx_bale_sub_form(form_id,created_at), INDEX idx_bale_sub_status(status,created_at), INDEX idx_bale_sub_driver(driver_id), INDEX idx_bale_sub_user(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bale_bot_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  chat_id VARCHAR(120) NULL,
  event_type VARCHAR(60) NOT NULL,
  input_text TEXT NULL,
  payload_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bale_event_type(event_type,created_at), INDEX idx_bale_event_chat(chat_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messenger_subscribers (
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
  UNIQUE KEY uq_messenger_chat(platform,chat_id), INDEX idx_messenger_mobile(platform,mobile), INDEX idx_messenger_user(platform,user_id), INDEX idx_messenger_driver(platform,driver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messenger_message_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  platform VARCHAR(30) NOT NULL,
  target_type VARCHAR(60) NULL,
  target_id BIGINT NULL,
  chat_id VARCHAR(120) NULL,
  body TEXT NULL,
  status VARCHAR(30) NOT NULL,
  response JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_messenger_msg_platform(platform,created_at), INDEX idx_messenger_msg_target(platform,target_type,target_id), INDEX idx_messenger_msg_status(platform,status,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messenger_chat_sessions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  platform VARCHAR(30) NOT NULL,
  chat_id VARCHAR(120) NOT NULL,
  action VARCHAR(40) NOT NULL,
  step VARCHAR(80) NULL,
  form_id BIGINT NULL,
  payload_json JSON NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_messenger_session(platform,chat_id), INDEX idx_messenger_session_action(platform,action,updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messenger_form_submissions (
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
  INDEX idx_messenger_sub_platform(platform,created_at), INDEX idx_messenger_sub_form(platform,form_id,created_at), INDEX idx_messenger_sub_status(platform,status,created_at), INDEX idx_messenger_sub_driver(platform,driver_id), INDEX idx_messenger_sub_user(platform,user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messenger_bot_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  platform VARCHAR(30) NOT NULL,
  chat_id VARCHAR(120) NULL,
  event_type VARCHAR(60) NOT NULL,
  input_text TEXT NULL,
  payload_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_messenger_event_platform(platform,created_at), INDEX idx_messenger_event_type(platform,event_type,created_at), INDEX idx_messenger_event_chat(platform,chat_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- فیش حقوقی ----------
CREATE TABLE IF NOT EXISTS salary_slips (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  jmonth VARCHAR(7) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  original_name VARCHAR(255) NULL,
  uploaded_by BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_salary_user_month(user_id,jmonth)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- افزودن امن ستون‌ها ----------
CALL __taxi_add_col('users','must_change_pw','TINYINT(1) NOT NULL DEFAULT 0');
CALL __taxi_add_col('users','security_exempt','TINYINT(1) NOT NULL DEFAULT 0');
CALL __taxi_add_col('users','marital_status','VARCHAR(20) NULL');
CALL __taxi_add_col('users','address','TEXT NULL');
CALL __taxi_add_col('users','national_code','VARCHAR(10) NULL');
CALL __taxi_add_col('users','children_count','INT NULL');
CALL __taxi_add_col('users','profile_done','TINYINT(1) NOT NULL DEFAULT 0');
CALL __taxi_add_col('users','pw_changed_at','DATETIME NULL');
CALL __taxi_add_col('users','photo_taken_at','DATETIME NULL');
CALL __taxi_add_col('users','presence_required','TINYINT(1) NOT NULL DEFAULT 0');
CALL __taxi_add_col('users','reset_code','VARCHAR(10) NULL');
CALL __taxi_add_col('users','reset_expires','DATETIME NULL');
CALL __taxi_add_col('users','seniority_start','VARCHAR(10) NULL');
CALL __taxi_add_col('users','can_send_sms','TINYINT(1) NOT NULL DEFAULT 0');
CALL __taxi_add_col('users','device_model','VARCHAR(120) NULL');
CALL __taxi_add_col('users','android_version','VARCHAR(40) NULL');
CALL __taxi_add_col('users','app_version','VARCHAR(30) NULL');
CALL __taxi_add_col('users','mobile','VARCHAR(20) NULL');
CALL __taxi_add_col('checklist_submissions','photo_data','LONGTEXT NULL');
CALL __taxi_add_col('sms_log','driver_id','INT NULL');
CALL __taxi_add_col('official_visits','photo_data','LONGTEXT NULL');
CALL __taxi_add_col('report_routes','note','TEXT NULL');
CALL __taxi_add_col('staff_attendance','auto_closed','TINYINT(1) NOT NULL DEFAULT 0');
CALL __taxi_add_col('system_outages','reason','VARCHAR(190) NULL');
CALL __taxi_add_col('reports','priority','VARCHAR(20) NOT NULL DEFAULT ''normal''');
CALL __taxi_add_col('reports','deleted_at','DATETIME NULL');
CALL __taxi_add_col('reports','updated_at','DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP');
CALL __taxi_add_col('user_attendance','auto_shift_type','VARCHAR(30) NULL');
CALL __taxi_add_col('user_attendance','duty_minutes','INT NOT NULL DEFAULT 0');
CALL __taxi_add_col('user_attendance','overtime_minutes','INT NOT NULL DEFAULT 0');
CALL __taxi_add_col('user_attendance','surplus_minutes','INT NOT NULL DEFAULT 0');
CALL __taxi_add_col('user_attendance','night_minutes','INT NOT NULL DEFAULT 0');
CALL __taxi_add_col('user_attendance','friday_minutes','INT NOT NULL DEFAULT 0');
CALL __taxi_add_col('user_attendance','holiday_minutes','INT NOT NULL DEFAULT 0');
CALL __taxi_add_col('user_attendance','reject_reason','TEXT NULL');
CALL __taxi_add_col('staff_attendance','calc_json','JSON NULL');
CALL __taxi_add_col('staff_attendance','handover_id','INT NULL');
CALL __taxi_add_col('staff_attendance','client_uuid','VARCHAR(120) NULL');
CALL __taxi_add_col('staff_attendance','offline_synced','TINYINT(1) NOT NULL DEFAULT 0');
CALL __taxi_add_col('staff_attendance','client_check_in','DATETIME NULL');
CALL __taxi_add_col('staff_attendance','client_check_out','DATETIME NULL');
CALL __taxi_add_col('role_work_rules','auto_shift_enabled','TINYINT(1) NOT NULL DEFAULT 1');
CALL __taxi_add_col('role_work_rules','checkin_any_time','TINYINT(1) NOT NULL DEFAULT 1');
CALL __taxi_add_col('role_work_rules','allowed_checkin_from','TIME NULL');
CALL __taxi_add_col('role_work_rules','allowed_checkin_to','TIME NULL');
CALL __taxi_add_col('role_work_rules','warn_before_overtime_cap_minutes','INT NOT NULL DEFAULT 15');
CALL __taxi_add_col('role_work_rules','require_checkout_after_cap','TINYINT(1) NOT NULL DEFAULT 0');
CALL __taxi_add_col('role_work_rules','night_calc','TINYINT(1) NOT NULL DEFAULT 1');
CALL __taxi_add_col('role_work_rules','friday_calc','TINYINT(1) NOT NULL DEFAULT 1');
CALL __taxi_add_col('role_work_rules','holiday_calc','TINYINT(1) NOT NULL DEFAULT 1');
CALL __taxi_add_col('role_work_rules','description','TEXT NULL');
CALL __taxi_add_col('role_work_rules','include_friday_in_duty','TINYINT(1) NOT NULL DEFAULT 0');
CALL __taxi_add_col('role_work_rules','include_holiday_in_duty','TINYINT(1) NOT NULL DEFAULT 0');
CALL __taxi_add_col('role_work_rules','max_open_session_minutes','INT NOT NULL DEFAULT 960');
CALL __taxi_add_col('role_work_rules','auto_close_enabled','TINYINT(1) NOT NULL DEFAULT 0');
CALL __taxi_add_col('role_work_rules','auto_close_after_minutes','INT NOT NULL DEFAULT 0');
CALL __taxi_add_col('role_work_rules','checkout_grace_minutes','INT NOT NULL DEFAULT 15');
CALL __taxi_add_col('offline_sync_logs','source_path','VARCHAR(191) NULL');
CALL __taxi_add_col('offline_sync_logs','error','TEXT NULL');
CALL __taxi_add_col('offline_sync_logs','response','JSON NULL');
CALL __taxi_add_col('offline_sync_logs','server_result','JSON NULL');
CALL __taxi_add_col('offline_sync_logs','processed_at','DATETIME NULL');
CALL __taxi_add_col('offline_sync_logs','resolved_by','BIGINT NULL');
CALL __taxi_add_col('offline_sync_logs','resolved_at','DATETIME NULL');
CALL __taxi_add_col('offline_sync_logs','resolution_note','TEXT NULL');
CALL __taxi_add_col('offline_sync_logs','conflict_reason','TEXT NULL');
CALL __taxi_add_col('plate_scan_samples','review_note','TEXT NULL');
CALL __taxi_add_col('plate_scan_samples','reviewed_by','INT NULL');
CALL __taxi_add_col('plate_scan_samples','reviewed_at','DATETIME NULL');
CALL __taxi_add_col('plate_scan_samples','exported_at','DATETIME NULL');
CALL __taxi_add_col('plate_scan_samples','client_time','DATETIME NULL');

-- ---------- ایندکس‌های امن و سازگار با MySQL ----------
CALL __taxi_add_idx('attendances','idx_att_user_in_exit','user_id, checkin_at, exit_at','user_id,checkin_at,exit_at',0);
CALL __taxi_add_idx('attendances','idx_att_user_created_exit','user_id, created_at, exit_at','user_id,created_at,exit_at',0);
CALL __taxi_add_idx('attendances','idx_att_user_date','user_id, attendance_date','user_id,attendance_date',0);
CALL __taxi_add_idx('attendances','idx_att_driver_date','driver_id, attendance_date','driver_id,attendance_date',0);
CALL __taxi_add_idx('user_attendance','idx_user_att_user_time','user_id, checkin_at, checkout_at','user_id,checkin_at,checkout_at',0);
CALL __taxi_add_idx('user_attendance','idx_user_att_line_time','line_id, checkin_at','line_id,checkin_at',0);
CALL __taxi_add_idx('staff_attendance','idx_staff_att_user_in_out','user_id, check_in, check_out','user_id,check_in,check_out',0);
CALL __taxi_add_idx('staff_attendance','idx_staff_att_client_uuid','client_uuid','client_uuid',0);
CALL __taxi_add_idx('staff_attendance','idx_staff_att_offline','offline_synced, check_in','offline_synced,check_in',0);
CALL __taxi_add_idx('staff_attendance','idx_staff_att_user_checkin','user_id, check_in','user_id,check_in',0);
CALL __taxi_add_idx('user_shifts','idx_user_shifts_user_dates','user_id, from_jdate, to_jdate','user_id,from_jdate,to_jdate',0);
CALL __taxi_add_idx('shift_days','idx_shift_days_shift_jdate','shift_id, jdate','shift_id,jdate',0);
CALL __taxi_add_idx('presence_checks','idx_presence_checks_user_date_slot','user_id, slot_date, slot','user_id,slot_date,slot',0);
CALL __taxi_add_idx('activity_logs','idx_activity_logs_user_event_created','user_id, event, created_at','user_id,event,created_at',0);
CALL __taxi_add_idx('location_pings','idx_location_pings_user_captured','user_id, captured_at','user_id,captured_at',0);
CALL __taxi_add_idx('notifications','idx_notifications_user_read_created','user_id, is_read, created_at','user_id,is_read,created_at',0);
CALL __taxi_add_idx('reports','idx_reports_sender_created','sender_id, created_at','sender_id,created_at',0);
CALL __taxi_add_idx('reports','idx_reports_status_created','status, created_at','status,created_at',0);
CALL __taxi_add_idx('official_visits','idx_ov_recorded_time','recorded_by, created_at','recorded_by,created_at',0);
CALL __taxi_add_idx('welfare_grants','idx_wg_granted_time','granted_by, created_at','granted_by,created_at',0);
CALL __taxi_add_idx('cultural_activities','idx_ca_recorded_time','recorded_by, created_at','recorded_by,created_at',0);
CALL __taxi_add_idx('offline_sync_logs','idx_offline_status_time','status, created_at','status,created_at',0);
CALL __taxi_add_idx('offline_sync_logs','idx_offline_path_time','source_path, created_at','source_path,created_at',0);
CALL __taxi_add_idx('offline_sync_logs','idx_offline_resolved','resolved_at, resolved_by','resolved_at,resolved_by',0);
CALL __taxi_add_idx('plate_scan_samples','idx_pss_plate','corrected_plate','corrected_plate',0);
CALL __taxi_add_idx('plate_scan_samples','idx_pss_user_time','user_id, created_at','user_id,created_at',0);
CALL __taxi_add_idx('plate_scan_samples','idx_pss_vehicle','vehicle_id','vehicle_id',0);
CALL __taxi_add_idx('plate_scan_samples','idx_pss_status_time','status, created_at','status,created_at',0);
CALL __taxi_add_idx('plate_scan_samples','idx_pss_reviewed','reviewed_by, reviewed_at','reviewed_by,reviewed_at',0);

-- ---------- تنظیمات فازها ----------
CALL __taxi_setting('phase6_features','{"holiday_import":true,"delivery_dead_letter":true,"mobile_error_logs":true,"health_v2":true}');
CALL __taxi_setting('phase7_part2_features','{"overnight_split":true,"friday_holiday_daily":true,"surplus_convert_ui":true}');
CALL __taxi_setting('phase7_part3_features','{"auto_shift_rules_admin":true,"attendance_reject_logs":true,"checkin_window_control":true}');
CALL __taxi_setting('phase7_part4_features','{"offline_sync_processing":true,"offline_checkin_checkout":true,"offline_locations":true,"admin_offline_logs":true}');
CALL __taxi_setting('phase7_part7_features','{"user_rule_overrides":true,"assignment_overlap_guard":true,"attendance_recalculate":true,"auto_close_open_sessions":true}');
CALL __taxi_setting('phase7_part8_features','{"client_event_time":true,"offline_official_visits":true,"welfare_date_fix":true,"offline_queue_partial_ack":true}');
CALL __taxi_setting('phase7_part11_features','{"bale_menu":true,"custom_replies":true,"bale_forms":true,"driver_prefill":true,"bale_sessions":true}');
CALL __taxi_setting('phase7_part12_features','{"telegram_bot":true,"eitaa_bot":true,"shared_bot_menu":true,"shared_custom_replies":true,"shared_forms":true,"platform_webhooks":true,"messenger_hub":true}');
CALL __taxi_setting('phase7_part13_features','{"health_dashboard_full":true,"queue_monitor":true,"messenger_monitor":true,"offline_monitor":true,"ocr_monitor":true,"cron_probe":true}');
CALL __taxi_setting('phase7_part14_features','{"browser_babel_removed":true,"text_babel_removed":true,"panel_bundle_js":true,"panel_bundle_css":true,"runtime_jsx_removed":true}');
CALL __taxi_setting('phase7_part15_features','{"mysql_import_upgrade_sql":true,"safe_mysql_indexes":true,"plate_ocr_settings_panel":true,"plate_ocr_defaults":true}');
CALL __taxi_setting_default('telegram_api_base','"https://api.telegram.org"');
CALL __taxi_setting_default('telegram_api_mode','"bot_token_method"');
CALL __taxi_setting_default('telegram_enabled_items','{"messages":true,"birthday":true,"attendance":true,"bills":true,"warnings":true,"bot_forms":true,"custom_replies":true}');
CALL __taxi_setting_default('eitaa_api_base','"https://eitaayar.ir/api"');
CALL __taxi_setting_default('eitaa_api_mode','"token_method"');
CALL __taxi_setting_default('eitaa_enabled_items','{"messages":true,"birthday":true,"attendance":true,"bills":true,"warnings":true,"bot_forms":true,"custom_replies":true}');


-- ---------- فاز 7.17: ترمیم کامل نمونه‌های آموزشی پلاک و نسخه 1.1.0 ----------
CALL __taxi_add_col('plate_scan_samples','user_id','INT NULL');
CALL __taxi_add_col('plate_scan_samples','vehicle_id','INT NULL');
CALL __taxi_add_col('plate_scan_samples','original_image_path','VARCHAR(255) NULL');
CALL __taxi_add_col('plate_scan_samples','crop_image_path','VARCHAR(255) NULL');
CALL __taxi_add_col('plate_scan_samples','detected_plate','VARCHAR(30) NULL');
CALL __taxi_add_col('plate_scan_samples','corrected_plate','VARCHAR(30) NULL');
CALL __taxi_add_col('plate_scan_samples','detected_digits_2','VARCHAR(2) NULL');
CALL __taxi_add_col('plate_scan_samples','detected_digits_3','VARCHAR(3) NULL');
CALL __taxi_add_col('plate_scan_samples','corrected_digits_2','VARCHAR(2) NULL');
CALL __taxi_add_col('plate_scan_samples','corrected_digits_3','VARCHAR(3) NULL');
CALL __taxi_add_col('plate_scan_samples','fixed_letter','VARCHAR(5) NOT NULL DEFAULT ''ت''');
CALL __taxi_add_col('plate_scan_samples','region_code','VARCHAR(5) NOT NULL DEFAULT ''12''');
CALL __taxi_add_col('plate_scan_samples','confidence','DECIMAL(5,2) NULL');
CALL __taxi_add_col('plate_scan_samples','ocr_source','VARCHAR(80) NULL');
CALL __taxi_add_col('plate_scan_samples','raw_text','TEXT NULL');
CALL __taxi_add_col('plate_scan_samples','status','VARCHAR(20) NOT NULL DEFAULT ''pending''');
CALL __taxi_add_col('plate_scan_samples','review_note','TEXT NULL');
CALL __taxi_add_col('plate_scan_samples','reviewed_by','INT NULL');
CALL __taxi_add_col('plate_scan_samples','reviewed_at','DATETIME NULL');
CALL __taxi_add_col('plate_scan_samples','exported_at','DATETIME NULL');
CALL __taxi_add_col('plate_scan_samples','client_time','DATETIME NULL');
CALL __taxi_add_col('plate_scan_samples','created_at','DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
CALL __taxi_add_idx('plate_scan_samples','idx_pss_plate','corrected_plate','corrected_plate',0);
CALL __taxi_add_idx('plate_scan_samples','idx_pss_user_time','user_id, created_at','user_id,created_at',0);
CALL __taxi_add_idx('plate_scan_samples','idx_pss_vehicle','vehicle_id','vehicle_id',0);
CALL __taxi_add_idx('plate_scan_samples','idx_pss_status_time','status, created_at','status,created_at',0);
CALL __taxi_add_idx('plate_scan_samples','idx_pss_reviewed','reviewed_by, reviewed_at','reviewed_by,reviewed_at',0);
CALL __taxi_setting('site_version','110');
CALL __taxi_setting('app_version','"1.1.0"');
CALL __taxi_setting('db_upgrade_version','"phase7-part17-1.1.0"');
CALL __taxi_setting('phase7_part17_features','{"plate_training_samples_500_fix":true,"search_response_stabilized":true,"offline_cache_plate_vehicle":true,"version_1_1_0":true}');

INSERT INTO system_health_logs(level,source,message,context)
VALUES('info','upgrade_sql','upgrade_import_mysql.sql executed','{"site_version":110,"app_version":"1.1.0","phase":"phase7-part17"}');

CALL __taxi_setting_default('bill_bot_enabled','true');
CALL __taxi_setting_default('notice_bot_enabled','true');
CALL __taxi_setting_default('checklist_bot_enabled','true');
CALL __taxi_setting_default('messenger_invite_text','"برای دریافت پیام‌های سامانه تاکسیرانی، ربات رسمی سازمان را فعال و شماره همراه خود را ارسال کنید."');
CALL __taxi_setting_default('bale_bot_link','""');
CALL __taxi_setting_default('telegram_bot_link','""');
CALL __taxi_setting_default('eitaa_bot_link','""');
CALL __taxi_setting_default('station_enter_notify','{"enabled":false,"mode":"hierarchy","subject_mode":"all"}');
CALL __taxi_setting_default('attendance_checkin_notify','{"enabled":false,"mode":"hierarchy","subject_mode":"all"}');
CALL __taxi_setting_default('attendance_checkout_notify','{"enabled":false,"mode":"hierarchy","subject_mode":"all"}');

-- v175 phase 1: ارجاع محرمانه
CALL __taxi_add_col('reports','confidential_history','TINYINT(1) NOT NULL DEFAULT 0');
CALL __taxi_add_col('users','signature_data','MEDIUMTEXT NULL');

-- v218: اقلام تحویلی (واگذاری زنجیره‌ای اقلام بین کاربران با تأیید گیرنده)
CREATE TABLE IF NOT EXISTS inventory_item_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  unit VARCHAR(30) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS inventory_transfers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_type_id INT NOT NULL,
  from_user_id INT NULL,
  to_user_id INT NOT NULL,
  quantity INT NOT NULL,
  status VARCHAR(15) NOT NULL DEFAULT 'pending',
  note VARCHAR(255) NULL,
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_at DATETIME NULL,
  confirmed_by INT NULL,
  rejected_at DATETIME NULL,
  INDEX idx_it_item (item_type_id),
  INDEX idx_it_from (from_user_id),
  INDEX idx_it_to (to_user_id),
  INDEX idx_it_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE IF EXISTS __taxi_add_col;
DROP PROCEDURE IF EXISTS __taxi_add_idx;
DROP PROCEDURE IF EXISTS __taxi_setting;
DROP PROCEDURE IF EXISTS __taxi_setting_default;

SET FOREIGN_KEY_CHECKS=1;
-- پایان فایل ارتقا


