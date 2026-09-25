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

-- v175 phase 1: ارجاع محرمانه
CALL __taxi_add_col('reports','confidential_history','TINYINT(1) NOT NULL DEFAULT 0');
CALL __taxi_add_col('users','signature_data','MEDIUMTEXT NULL');

DROP PROCEDURE IF EXISTS __taxi_add_col;
DROP PROCEDURE IF EXISTS __taxi_add_idx;
DROP PROCEDURE IF EXISTS __taxi_setting;
CALL __taxi_setting_default('bill_bot_enabled','true');
CALL __taxi_setting_default('notice_bot_enabled','true');
CALL __taxi_setting_default('checklist_bot_enabled','true');
CALL __taxi_setting_default('messenger_invite_text','"برای دریافت پیام‌های سامانه تاکسیرانی، ربات رسمی سازمان را فعال و شماره همراه خود را ارسال کنید."');
CALL __taxi_setting_default('bale_bot_link','""');
CALL __taxi_setting_default('telegram_bot_link','""');
CALL __taxi_setting_default('eitaa_bot_link','""');

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

DROP PROCEDURE IF EXISTS __taxi_setting_default;


-- ============================================================
-- KhatYar final runtime sync: core + radio v2 + school service
-- این بخش با Migrationهای فعلی مخزن همسان نگه داشته شده است.

-- تعمیر زیرساخت هسته سامانه برای نصب‌های قدیمی MySQL/MariaDB
-- قابل اجرای مجدد است و قبل از ورود/تنظیمات، جداول پایه را هم‌تراز می‌کند.
SET @db=DATABASE();

CREATE TABLE IF NOT EXISTS app_settings(
  `key` VARCHAR(190) NOT NULL PRIMARY KEY,
  value LONGTEXT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_logs(
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  event VARCHAR(80) NOT NULL DEFAULT 'event',
  meta LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_activity_logs_user_time(user_id,created_at),
  KEY idx_activity_logs_event_time(event,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sessions(
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL DEFAULT 0,
  device_type VARCHAR(20) NOT NULL DEFAULT 'web',
  device_id VARCHAR(255) NOT NULL DEFAULT '',
  device_model VARCHAR(255) NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_type(user_id,device_type),
  KEY idx_user_sessions_revoked(revoked_at,created_at),
  KEY idx_user_sessions_device(device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='activity_logs' AND COLUMN_NAME='user_id'),'SELECT 1','ALTER TABLE activity_logs ADD COLUMN user_id INT NULL'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='activity_logs' AND COLUMN_NAME='event'),'SELECT 1','ALTER TABLE activity_logs ADD COLUMN event VARCHAR(80) NOT NULL DEFAULT ''event'''); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='activity_logs' AND COLUMN_NAME='meta'),'SELECT 1','ALTER TABLE activity_logs ADD COLUMN meta LONGTEXT NULL'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='activity_logs' AND COLUMN_NAME='created_at'),'SELECT 1','ALTER TABLE activity_logs ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='user_sessions' AND COLUMN_NAME='user_id'),'SELECT 1','ALTER TABLE user_sessions ADD COLUMN user_id INT NOT NULL DEFAULT 0'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='user_sessions' AND COLUMN_NAME='device_type'),'SELECT 1','ALTER TABLE user_sessions ADD COLUMN device_type VARCHAR(20) NOT NULL DEFAULT ''web'''); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='user_sessions' AND COLUMN_NAME='device_id'),'SELECT 1','ALTER TABLE user_sessions ADD COLUMN device_id VARCHAR(255) NOT NULL DEFAULT '''''); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='user_sessions' AND COLUMN_NAME='device_model'),'SELECT 1','ALTER TABLE user_sessions ADD COLUMN device_model VARCHAR(255) NULL'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='user_sessions' AND COLUMN_NAME='revoked_at'),'SELECT 1','ALTER TABLE user_sessions ADD COLUMN revoked_at DATETIME NULL'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='user_sessions' AND COLUMN_NAME='created_at'),'SELECT 1','ALTER TABLE user_sessions ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='roles' AND COLUMN_NAME='is_admin'),'SELECT 1','ALTER TABLE roles ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='security_exempt'),'SELECT 1','ALTER TABLE users ADD COLUMN security_exempt TINYINT(1) NOT NULL DEFAULT 0'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='rank_stars'),'SELECT 1','ALTER TABLE users ADD COLUMN rank_stars TINYINT NULL'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- KhatYar Radio v2: secure membership rules, presence and audit log.
-- MySQL/MariaDB compatible and idempotent.
-- برای دیتابیس جدید و دیتابیس‌های قدیمی طراحی شده است.

SET @db=DATABASE();

CREATE TABLE IF NOT EXISTS radio_channels (
 id INT UNSIGNED NOT NULL AUTO_INCREMENT,name VARCHAR(100) NOT NULL,code VARCHAR(50) NOT NULL,
 description VARCHAR(255) NULL,is_active TINYINT(1) NOT NULL DEFAULT 1,current_speaker_id INT NULL,lock_until DATETIME NULL,
 channel_type VARCHAR(20) NOT NULL DEFAULT 'custom',match_mode VARCHAR(3) NOT NULL DEFAULT 'OR',max_talk_ms INT UNSIGNED NOT NULL DEFAULT 25000,
 priority INT NOT NULL DEFAULT 0,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY(id),UNIQUE KEY uq_radio_channels_code(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS radio_messages (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,channel_id INT UNSIGNED NOT NULL,sender_id INT NOT NULL,sender_name VARCHAR(190) NOT NULL,
 audio_path VARCHAR(255) NOT NULL,mime_type VARCHAR(80) NOT NULL DEFAULT 'audio/mp4',duration_ms INT UNSIGNED NOT NULL DEFAULT 0,
 bytes_size INT UNSIGNED NOT NULL DEFAULT 0,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(id),KEY idx_radio_messages_channel(channel_id,id),KEY idx_radio_messages_sender(sender_id,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS radio_user_settings (
 user_id INT NOT NULL PRIMARY KEY,enabled TINYINT(1) NOT NULL DEFAULT 1,channel_id INT UNSIGNED NULL,
 listen_all TINYINT(1) NOT NULL DEFAULT 0,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS radio_channel_regions (
 channel_id INT UNSIGNED NOT NULL,region_id INT NOT NULL,PRIMARY KEY(channel_id,region_id),KEY idx_radio_cr_region(region_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS radio_channel_users (
 channel_id INT UNSIGNED NOT NULL,user_id INT NOT NULL,PRIMARY KEY(channel_id,user_id),KEY idx_radio_cu_user(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS radio_channel_roles (
 channel_id INT UNSIGNED NOT NULL,role_id INT NOT NULL,PRIMARY KEY(channel_id,role_id),KEY idx_radio_cr_role(role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS radio_presence (
 channel_id INT UNSIGNED NOT NULL,user_id INT NOT NULL,last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(channel_id,user_id),KEY idx_radio_presence_seen(channel_id,last_seen_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS radio_logs (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,channel_id INT UNSIGNED NULL,user_id INT NULL,event_type VARCHAR(40) NOT NULL,
 meta_json TEXT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(id),KEY idx_radio_logs_channel(channel_id,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ارتقای کامل Schema بیسیم برای دیتابیس‌های قدیمی
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channels' AND COLUMN_NAME='name'),'SELECT 1','ALTER TABLE radio_channels ADD COLUMN name VARCHAR(100) NOT NULL');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channels' AND COLUMN_NAME='code'),'SELECT 1','ALTER TABLE radio_channels ADD COLUMN code VARCHAR(50) NOT NULL');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channels' AND COLUMN_NAME='description'),'SELECT 1','ALTER TABLE radio_channels ADD COLUMN description VARCHAR(255) NULL');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channels' AND COLUMN_NAME='is_active'),'SELECT 1','ALTER TABLE radio_channels ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channels' AND COLUMN_NAME='current_speaker_id'),'SELECT 1','ALTER TABLE radio_channels ADD COLUMN current_speaker_id INT NULL');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channels' AND COLUMN_NAME='lock_until'),'SELECT 1','ALTER TABLE radio_channels ADD COLUMN lock_until DATETIME NULL');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channels' AND COLUMN_NAME='channel_type'),'SELECT 1','ALTER TABLE radio_channels ADD COLUMN channel_type VARCHAR(20) NOT NULL DEFAULT ''custom''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channels' AND COLUMN_NAME='match_mode'),'SELECT 1','ALTER TABLE radio_channels ADD COLUMN match_mode VARCHAR(3) NOT NULL DEFAULT ''OR''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channels' AND COLUMN_NAME='max_talk_ms'),'SELECT 1','ALTER TABLE radio_channels ADD COLUMN max_talk_ms INT UNSIGNED NOT NULL DEFAULT 25000');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channels' AND COLUMN_NAME='priority'),'SELECT 1','ALTER TABLE radio_channels ADD COLUMN priority INT NOT NULL DEFAULT 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channels' AND COLUMN_NAME='created_at'),'SELECT 1','ALTER TABLE radio_channels ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channels' AND COLUMN_NAME='updated_at'),'SELECT 1','ALTER TABLE radio_channels ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_messages' AND COLUMN_NAME='channel_id'),'SELECT 1','ALTER TABLE radio_messages ADD COLUMN channel_id INT UNSIGNED NOT NULL DEFAULT 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_messages' AND COLUMN_NAME='sender_id'),'SELECT 1','ALTER TABLE radio_messages ADD COLUMN sender_id INT NOT NULL DEFAULT 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_messages' AND COLUMN_NAME='sender_name'),'SELECT 1','ALTER TABLE radio_messages ADD COLUMN sender_name VARCHAR(190) NOT NULL DEFAULT ''کاربر''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_messages' AND COLUMN_NAME='audio_path'),'SELECT 1','ALTER TABLE radio_messages ADD COLUMN audio_path VARCHAR(255) NOT NULL DEFAULT ''''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_messages' AND COLUMN_NAME='mime_type'),'SELECT 1','ALTER TABLE radio_messages ADD COLUMN mime_type VARCHAR(80) NOT NULL DEFAULT ''audio/mp4''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_messages' AND COLUMN_NAME='duration_ms'),'SELECT 1','ALTER TABLE radio_messages ADD COLUMN duration_ms INT UNSIGNED NOT NULL DEFAULT 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_messages' AND COLUMN_NAME='bytes_size'),'SELECT 1','ALTER TABLE radio_messages ADD COLUMN bytes_size INT UNSIGNED NOT NULL DEFAULT 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_messages' AND COLUMN_NAME='created_at'),'SELECT 1','ALTER TABLE radio_messages ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_user_settings' AND COLUMN_NAME='enabled'),'SELECT 1','ALTER TABLE radio_user_settings ADD COLUMN enabled TINYINT(1) NOT NULL DEFAULT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_user_settings' AND COLUMN_NAME='channel_id'),'SELECT 1','ALTER TABLE radio_user_settings ADD COLUMN channel_id INT UNSIGNED NULL');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_user_settings' AND COLUMN_NAME='listen_all'),'SELECT 1','ALTER TABLE radio_user_settings ADD COLUMN listen_all TINYINT(1) NOT NULL DEFAULT 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_user_settings' AND COLUMN_NAME='updated_at'),'SELECT 1','ALTER TABLE radio_user_settings ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channel_regions' AND COLUMN_NAME='channel_id'),'SELECT 1','ALTER TABLE radio_channel_regions ADD COLUMN channel_id INT UNSIGNED NOT NULL DEFAULT 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channel_regions' AND COLUMN_NAME='region_id'),'SELECT 1','ALTER TABLE radio_channel_regions ADD COLUMN region_id INT NOT NULL DEFAULT 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channel_users' AND COLUMN_NAME='channel_id'),'SELECT 1','ALTER TABLE radio_channel_users ADD COLUMN channel_id INT UNSIGNED NOT NULL DEFAULT 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channel_users' AND COLUMN_NAME='user_id'),'SELECT 1','ALTER TABLE radio_channel_users ADD COLUMN user_id INT NOT NULL DEFAULT 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channel_roles' AND COLUMN_NAME='channel_id'),'SELECT 1','ALTER TABLE radio_channel_roles ADD COLUMN channel_id INT UNSIGNED NOT NULL DEFAULT 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channel_roles' AND COLUMN_NAME='role_id'),'SELECT 1','ALTER TABLE radio_channel_roles ADD COLUMN role_id INT NOT NULL DEFAULT 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_presence' AND COLUMN_NAME='channel_id'),'SELECT 1','ALTER TABLE radio_presence ADD COLUMN channel_id INT UNSIGNED NOT NULL DEFAULT 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_presence' AND COLUMN_NAME='user_id'),'SELECT 1','ALTER TABLE radio_presence ADD COLUMN user_id INT NOT NULL DEFAULT 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_presence' AND COLUMN_NAME='last_seen_at'),'SELECT 1','ALTER TABLE radio_presence ADD COLUMN last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_logs' AND COLUMN_NAME='channel_id'),'SELECT 1','ALTER TABLE radio_logs ADD COLUMN channel_id INT UNSIGNED NULL');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_logs' AND COLUMN_NAME='user_id'),'SELECT 1','ALTER TABLE radio_logs ADD COLUMN user_id INT NULL');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_logs' AND COLUMN_NAME='event_type'),'SELECT 1','ALTER TABLE radio_logs ADD COLUMN event_type VARCHAR(40) NOT NULL DEFAULT ''event''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_logs' AND COLUMN_NAME='meta_json'),'SELECT 1','ALTER TABLE radio_logs ADD COLUMN meta_json TEXT NULL');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_logs' AND COLUMN_NAME='created_at'),'SELECT 1','ALTER TABLE radio_logs ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- تکمیل ستون‌های دیتابیس‌های قدیمی
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_user_settings' AND COLUMN_NAME='listen_all'),'SELECT 1','ALTER TABLE radio_user_settings ADD COLUMN listen_all TINYINT(1) NOT NULL DEFAULT 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channels' AND COLUMN_NAME='channel_type'),'SELECT 1','ALTER TABLE radio_channels ADD COLUMN channel_type VARCHAR(20) NOT NULL DEFAULT ''custom''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channels' AND COLUMN_NAME='match_mode'),'SELECT 1','ALTER TABLE radio_channels ADD COLUMN match_mode VARCHAR(3) NOT NULL DEFAULT ''OR''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channels' AND COLUMN_NAME='max_talk_ms'),'SELECT 1','ALTER TABLE radio_channels ADD COLUMN max_talk_ms INT UNSIGNED NOT NULL DEFAULT 25000');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channels' AND COLUMN_NAME='priority'),'SELECT 1','ALTER TABLE radio_channels ADD COLUMN priority INT NOT NULL DEFAULT 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_messages' AND COLUMN_NAME='sender_name'),'SELECT 1','ALTER TABLE radio_messages ADD COLUMN sender_name VARCHAR(190) NOT NULL DEFAULT ''کاربر''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_messages' AND COLUMN_NAME='audio_path'),'SELECT 1','ALTER TABLE radio_messages ADD COLUMN audio_path VARCHAR(255) NOT NULL DEFAULT ''''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_messages' AND COLUMN_NAME='mime_type'),'SELECT 1','ALTER TABLE radio_messages ADD COLUMN mime_type VARCHAR(80) NOT NULL DEFAULT ''audio/mp4''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_messages' AND COLUMN_NAME='duration_ms'),'SELECT 1','ALTER TABLE radio_messages ADD COLUMN duration_ms INT UNSIGNED NOT NULL DEFAULT 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_messages' AND COLUMN_NAME='bytes_size'),'SELECT 1','ALTER TABLE radio_messages ADD COLUMN bytes_size INT UNSIGNED NOT NULL DEFAULT 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_messages' AND COLUMN_NAME='created_at'),'SELECT 1','ALTER TABLE radio_messages ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

INSERT INTO radio_channels(name,code,description,is_active,channel_type,match_mode,max_talk_ms,priority)
VALUES
('عمومی','general','کانال عمومی ارتباط خطیار',1,'custom','OR',25000,10),
('مدیریت','management','ارتباط مدیریت و مسئولین',1,'custom','OR',25000,20),
('بازرسی','inspection','ارتباط واحد بازرسی',1,'custom','OR',25000,30),
('عملیات خطوط','field','ارتباط عملیات میدانی خطوط',1,'custom','OR',25000,25)
ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),is_active=1;

UPDATE radio_channels SET channel_type='custom' WHERE channel_type IS NULL OR channel_type='';
UPDATE radio_channels SET match_mode='OR' WHERE match_mode IS NULL OR match_mode='';
UPDATE radio_channels SET max_talk_ms=25000 WHERE max_talk_ms IS NULL OR max_talk_ms<5000;


-- سرویس مدارس - Migration سازگار با MySQL 8 / MariaDB
-- این فایل هم برای دیتابیس جدید و هم دیتابیس‌های قدیمی قابل اجرا است.
-- هیچ INSERT ای قبل از ساخت/تکمیل ستون موردنیاز اجرا نمی‌شود.
SET @db = DATABASE();

CREATE TABLE IF NOT EXISTS school_service_companies (
 id INT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(255) NOT NULL,manager_name VARCHAR(150) NULL,
 phone VARCHAR(50) NULL,address VARCHAR(500) NULL,is_active TINYINT(1) NOT NULL DEFAULT 1,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_ssc_name(name),KEY idx_ssc_active(is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS school_service_schools (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,code VARCHAR(100) NULL,name VARCHAR(255) NOT NULL,
 educational_district VARCHAR(80) NULL,gender VARCHAR(80) NULL,shift VARCHAR(80) NULL,
 education_level VARCHAR(150) NULL,school_type VARCHAR(150) NULL,
 activity_start VARCHAR(20) NULL,activity_end VARCHAR(20) NULL,
 morning_start VARCHAR(20) NULL,morning_end VARCHAR(20) NULL,
 afternoon_start VARCHAR(20) NULL,afternoon_end VARCHAR(20) NULL,
 driver_count INT NULL,student_count INT NULL,address TEXT NULL,phone VARCHAR(80) NULL,
 latitude DECIMAL(10,7) NULL,longitude DECIMAL(10,7) NULL,status VARCHAR(80) NULL DEFAULT 'ثبت‌شده',
 location_registered_at DATETIME NULL,is_active TINYINT(1) NOT NULL DEFAULT 1,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY(id),KEY idx_ss_code(code),KEY idx_ss_name(name),KEY idx_ss_district(educational_district),
 KEY idx_ss_status(status),KEY idx_ss_location(latitude,longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS school_service_school_companies (
 school_id BIGINT UNSIGNED NOT NULL,company_id INT NOT NULL,is_primary TINYINT(1) NOT NULL DEFAULT 1,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(school_id,company_id),
 UNIQUE KEY uq_sssc_school(school_id),KEY idx_sssc_company(company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS school_service_violation_types (
 id INT AUTO_INCREMENT PRIMARY KEY,title VARCHAR(255) NOT NULL UNIQUE,is_active TINYINT(1) NOT NULL DEFAULT 1,sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS school_service_inspections (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,inspector_user_id INT NOT NULL,client_uuid VARCHAR(80) NULL,
 educational_district VARCHAR(80) NULL,company_id INT NULL,school_id BIGINT UNSIGNED NULL,
 school_gender ENUM('دخترانه','پسرانه','نامشخص') NOT NULL DEFAULT 'نامشخص',
 plate_three VARCHAR(3) NULL,plate_letter VARCHAR(5) NULL,plate_two VARCHAR(2) NULL,plate_region VARCHAR(2) NULL,
 iran_code VARCHAR(10) NOT NULL DEFAULT 'ایران',vehicle_type VARCHAR(100) NULL,vehicle_color VARCHAR(80) NULL,
 passenger_front_count INT NOT NULL DEFAULT 0,passenger_rear_count INT NOT NULL DEFAULT 0,passenger_count INT NOT NULL DEFAULT 0,
 driver_gender ENUM('خانم','آقا','نامشخص') NOT NULL DEFAULT 'نامشخص',
 certificate_status ENUM('معتبر','نامعتبر','ارائه نشد') NOT NULL DEFAULT 'ارائه نشد',
 violation_date VARCHAR(20) NULL,violation_time VARCHAR(10) NULL,location_text VARCHAR(700) NULL,
 latitude DECIMAL(10,7) NULL,longitude DECIMAL(10,7) NULL,description TEXT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY idx_ssi_user(inspector_user_id,created_at),KEY idx_ssi_company(company_id,created_at),
 KEY idx_ssi_school(school_id,created_at),KEY idx_ssi_date(violation_date),KEY idx_ssi_client_uuid(client_uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS school_service_inspection_photos (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,inspection_id BIGINT NOT NULL,file_path VARCHAR(500) NOT NULL,
 mime_type VARCHAR(100) NOT NULL DEFAULT 'image/jpeg',width INT NOT NULL DEFAULT 0,height INT NOT NULL DEFAULT 0,
 file_size INT NOT NULL DEFAULT 0,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY idx_ssip_inspection(inspection_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS school_service_inspection_violations (
 inspection_id BIGINT NOT NULL,violation_type_id INT NOT NULL,PRIMARY KEY(inspection_id,violation_type_id),
 KEY idx_ssiv_type(violation_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS school_service_permissions (
 role_id INT NOT NULL PRIMARY KEY,can_view TINYINT(1) NOT NULL DEFAULT 0,can_create TINYINT(1) NOT NULL DEFAULT 0,
 can_edit TINYINT(1) NOT NULL DEFAULT 0,can_delete TINYINT(1) NOT NULL DEFAULT 0,can_import TINYINT(1) NOT NULL DEFAULT 0,
 can_report TINYINT(1) NOT NULL DEFAULT 0,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS school_service_import_logs (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,user_id INT NULL,file_name VARCHAR(255) NULL,companies_count INT NOT NULL DEFAULT 0,
 schools_count INT NOT NULL DEFAULT 0,mappings_count INT NOT NULL DEFAULT 0,errors_count INT NOT NULL DEFAULT 0,
 errors_text LONGTEXT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS school_service_districts (
 id INT AUTO_INCREMENT PRIMARY KEY,title VARCHAR(100) NOT NULL,is_active TINYINT(1) NOT NULL DEFAULT 1,
 sort_order INT NOT NULL DEFAULT 0,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS school_service_vehicle_types (
 id INT AUTO_INCREMENT PRIMARY KEY,title VARCHAR(100) NOT NULL UNIQUE,is_active TINYINT(1) NOT NULL DEFAULT 1,sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS school_service_vehicle_colors (
 id INT AUTO_INCREMENT PRIMARY KEY,title VARCHAR(80) NOT NULL UNIQUE,is_active TINYINT(1) NOT NULL DEFAULT 1,sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ارتقای جامع همه ستون‌های سرویس مدارس برای جداول قدیمی
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='name'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN name VARCHAR(255) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='manager_name'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN manager_name VARCHAR(150) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='phone'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN phone VARCHAR(80) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='address'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN address VARCHAR(700) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='is_active'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='created_at'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='updated_at'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='code'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN code VARCHAR(100) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='name'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN name VARCHAR(255) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='address'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN address TEXT NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='educational_district'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN educational_district VARCHAR(80) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='gender'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN gender VARCHAR(80) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='shift'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN shift VARCHAR(80) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='education_level'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN education_level VARCHAR(150) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='school_type'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN school_type VARCHAR(150) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='activity_start'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN activity_start VARCHAR(20) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='activity_end'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN activity_end VARCHAR(20) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='morning_start'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN morning_start VARCHAR(20) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='morning_end'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN morning_end VARCHAR(20) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='afternoon_start'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN afternoon_start VARCHAR(20) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='afternoon_end'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN afternoon_end VARCHAR(20) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='driver_count'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN driver_count INT NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='student_count'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN student_count INT NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='phone'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN phone VARCHAR(80) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='latitude'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN latitude DECIMAL(10,7) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='longitude'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN longitude DECIMAL(10,7) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='status'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN status VARCHAR(80) NULL DEFAULT ''ثبت‌شده''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='location_registered_at'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN location_registered_at DATETIME NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='is_active'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='created_at'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='updated_at'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_school_companies' AND COLUMN_NAME='school_id'),'SELECT 1','ALTER TABLE school_service_school_companies ADD COLUMN school_id BIGINT UNSIGNED NOT NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_school_companies' AND COLUMN_NAME='company_id'),'SELECT 1','ALTER TABLE school_service_school_companies ADD COLUMN company_id INT NOT NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_school_companies' AND COLUMN_NAME='is_primary'),'SELECT 1','ALTER TABLE school_service_school_companies ADD COLUMN is_primary TINYINT(1) NOT NULL DEFAULT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_school_companies' AND COLUMN_NAME='created_at'),'SELECT 1','ALTER TABLE school_service_school_companies ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_violation_types' AND COLUMN_NAME='title'),'SELECT 1','ALTER TABLE school_service_violation_types ADD COLUMN title VARCHAR(255) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_violation_types' AND COLUMN_NAME='is_active'),'SELECT 1','ALTER TABLE school_service_violation_types ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_violation_types' AND COLUMN_NAME='sort_order'),'SELECT 1','ALTER TABLE school_service_violation_types ADD COLUMN sort_order INT NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='inspector_user_id'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN inspector_user_id INT NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='client_uuid'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN client_uuid VARCHAR(80) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='educational_district'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN educational_district VARCHAR(80) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='company_id'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN company_id INT NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='school_id'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN school_id BIGINT UNSIGNED NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='school_gender'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN school_gender VARCHAR(80) NULL DEFAULT ''نامشخص''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='plate_three'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN plate_three VARCHAR(3) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='plate_letter'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN plate_letter VARCHAR(5) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='plate_two'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN plate_two VARCHAR(2) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='plate_region'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN plate_region VARCHAR(2) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='iran_code'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN iran_code VARCHAR(10) NULL DEFAULT ''ایران''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='vehicle_type'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN vehicle_type VARCHAR(100) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='vehicle_color'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN vehicle_color VARCHAR(80) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='passenger_front_count'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN passenger_front_count INT NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='passenger_rear_count'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN passenger_rear_count INT NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='passenger_count'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN passenger_count INT NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='driver_gender'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN driver_gender VARCHAR(40) NULL DEFAULT ''نامشخص''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='certificate_status'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN certificate_status VARCHAR(60) NULL DEFAULT ''ارائه نشد''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='violation_date'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN violation_date VARCHAR(20) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='violation_time'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN violation_time VARCHAR(10) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='location_text'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN location_text VARCHAR(700) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='latitude'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN latitude DECIMAL(10,7) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='longitude'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN longitude DECIMAL(10,7) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='description'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN description TEXT NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='created_at'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='updated_at'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspection_photos' AND COLUMN_NAME='inspection_id'),'SELECT 1','ALTER TABLE school_service_inspection_photos ADD COLUMN inspection_id BIGINT NOT NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspection_photos' AND COLUMN_NAME='file_path'),'SELECT 1','ALTER TABLE school_service_inspection_photos ADD COLUMN file_path VARCHAR(500) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspection_photos' AND COLUMN_NAME='mime_type'),'SELECT 1','ALTER TABLE school_service_inspection_photos ADD COLUMN mime_type VARCHAR(100) NULL DEFAULT ''image/jpeg''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspection_photos' AND COLUMN_NAME='width'),'SELECT 1','ALTER TABLE school_service_inspection_photos ADD COLUMN width INT NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspection_photos' AND COLUMN_NAME='height'),'SELECT 1','ALTER TABLE school_service_inspection_photos ADD COLUMN height INT NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspection_photos' AND COLUMN_NAME='file_size'),'SELECT 1','ALTER TABLE school_service_inspection_photos ADD COLUMN file_size INT NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspection_photos' AND COLUMN_NAME='created_at'),'SELECT 1','ALTER TABLE school_service_inspection_photos ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspection_violations' AND COLUMN_NAME='inspection_id'),'SELECT 1','ALTER TABLE school_service_inspection_violations ADD COLUMN inspection_id BIGINT NOT NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspection_violations' AND COLUMN_NAME='violation_type_id'),'SELECT 1','ALTER TABLE school_service_inspection_violations ADD COLUMN violation_type_id INT NOT NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_permissions' AND COLUMN_NAME='role_id'),'SELECT 1','ALTER TABLE school_service_permissions ADD COLUMN role_id INT NOT NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_permissions' AND COLUMN_NAME='can_view'),'SELECT 1','ALTER TABLE school_service_permissions ADD COLUMN can_view TINYINT(1) NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_permissions' AND COLUMN_NAME='can_create'),'SELECT 1','ALTER TABLE school_service_permissions ADD COLUMN can_create TINYINT(1) NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_permissions' AND COLUMN_NAME='can_edit'),'SELECT 1','ALTER TABLE school_service_permissions ADD COLUMN can_edit TINYINT(1) NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_permissions' AND COLUMN_NAME='can_delete'),'SELECT 1','ALTER TABLE school_service_permissions ADD COLUMN can_delete TINYINT(1) NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_permissions' AND COLUMN_NAME='can_import'),'SELECT 1','ALTER TABLE school_service_permissions ADD COLUMN can_import TINYINT(1) NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_permissions' AND COLUMN_NAME='can_report'),'SELECT 1','ALTER TABLE school_service_permissions ADD COLUMN can_report TINYINT(1) NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_permissions' AND COLUMN_NAME='updated_at'),'SELECT 1','ALTER TABLE school_service_permissions ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_import_logs' AND COLUMN_NAME='user_id'),'SELECT 1','ALTER TABLE school_service_import_logs ADD COLUMN user_id INT NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_import_logs' AND COLUMN_NAME='file_name'),'SELECT 1','ALTER TABLE school_service_import_logs ADD COLUMN file_name VARCHAR(255) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_import_logs' AND COLUMN_NAME='companies_count'),'SELECT 1','ALTER TABLE school_service_import_logs ADD COLUMN companies_count INT NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_import_logs' AND COLUMN_NAME='schools_count'),'SELECT 1','ALTER TABLE school_service_import_logs ADD COLUMN schools_count INT NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_import_logs' AND COLUMN_NAME='mappings_count'),'SELECT 1','ALTER TABLE school_service_import_logs ADD COLUMN mappings_count INT NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_import_logs' AND COLUMN_NAME='errors_count'),'SELECT 1','ALTER TABLE school_service_import_logs ADD COLUMN errors_count INT NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_import_logs' AND COLUMN_NAME='errors_text'),'SELECT 1','ALTER TABLE school_service_import_logs ADD COLUMN errors_text LONGTEXT NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_import_logs' AND COLUMN_NAME='created_at'),'SELECT 1','ALTER TABLE school_service_import_logs ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_districts' AND COLUMN_NAME='title'),'SELECT 1','ALTER TABLE school_service_districts ADD COLUMN title VARCHAR(100) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_districts' AND COLUMN_NAME='is_active'),'SELECT 1','ALTER TABLE school_service_districts ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_districts' AND COLUMN_NAME='sort_order'),'SELECT 1','ALTER TABLE school_service_districts ADD COLUMN sort_order INT NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_districts' AND COLUMN_NAME='created_at'),'SELECT 1','ALTER TABLE school_service_districts ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_vehicle_types' AND COLUMN_NAME='title'),'SELECT 1','ALTER TABLE school_service_vehicle_types ADD COLUMN title VARCHAR(100) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_vehicle_types' AND COLUMN_NAME='is_active'),'SELECT 1','ALTER TABLE school_service_vehicle_types ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_vehicle_types' AND COLUMN_NAME='sort_order'),'SELECT 1','ALTER TABLE school_service_vehicle_types ADD COLUMN sort_order INT NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_vehicle_colors' AND COLUMN_NAME='title'),'SELECT 1','ALTER TABLE school_service_vehicle_colors ADD COLUMN title VARCHAR(100) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_vehicle_colors' AND COLUMN_NAME='is_active'),'SELECT 1','ALTER TABLE school_service_vehicle_colors ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_vehicle_colors' AND COLUMN_NAME='sort_order'),'SELECT 1','ALTER TABLE school_service_vehicle_colors ADD COLUMN sort_order INT NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ابزار افزودن ستون به جداول موجود؛ در صورت وجود ستون هیچ ALTER ای اجرا نمی‌شود.
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='educational_district'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN educational_district VARCHAR(80) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='gender'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN gender VARCHAR(80) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='shift'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN shift VARCHAR(80) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='education_level'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN education_level VARCHAR(150) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='school_type'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN school_type VARCHAR(150) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='activity_start'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN activity_start VARCHAR(20) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='activity_end'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN activity_end VARCHAR(20) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='morning_start'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN morning_start VARCHAR(20) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='morning_end'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN morning_end VARCHAR(20) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='afternoon_start'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN afternoon_start VARCHAR(20) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='afternoon_end'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN afternoon_end VARCHAR(20) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='driver_count'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN driver_count INT NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='student_count'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN student_count INT NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='phone'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN phone VARCHAR(80) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='latitude'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN latitude DECIMAL(10,7) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='longitude'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN longitude DECIMAL(10,7) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='status'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN status VARCHAR(80) NULL DEFAULT ''ثبت‌شده''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='location_registered_at'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN location_registered_at DATETIME NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='is_active'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- سازگاری با نسخه‌های قدیمی که برای جنسیت/وضعیت‌ها ENUM محدود داشته‌اند.
-- این تغییر مانع ثبت «دخترانه-پسرانه» و مقادیر توسعه‌یافته در دیتابیس قدیمی می‌شود.
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='gender'),'ALTER TABLE school_service_schools MODIFY COLUMN gender VARCHAR(80) NULL','SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='school_gender'),'ALTER TABLE school_service_inspections MODIFY COLUMN school_gender VARCHAR(80) NULL DEFAULT ''نامشخص''','SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='driver_gender'),'ALTER TABLE school_service_inspections MODIFY COLUMN driver_gender VARCHAR(40) NULL DEFAULT "نامشخص"','SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='certificate_status'),'ALTER TABLE school_service_inspections MODIFY COLUMN certificate_status VARCHAR(60) NULL DEFAULT ''ارائه نشد''','SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- انتقال داده ناحیه قدیمی به ستون استاندارد جدید، فقط اگر هر دو ستون وجود داشته باشند.
SET @sql=IF(
 EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='district')
 AND EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='educational_district'),
 'UPDATE school_service_schools SET educational_district=district WHERE (educational_district IS NULL OR educational_district="") AND district IS NOT NULL',
 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ستون‌های بازدید برای دیتابیس‌های قدیمی
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='client_uuid'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN client_uuid VARCHAR(80) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='plate_region'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN plate_region VARCHAR(2) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='passenger_front_count'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN passenger_front_count INT NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='passenger_rear_count'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN passenger_rear_count INT NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_inspections' AND COLUMN_NAME='client_uuid'),'SELECT 1','ALTER TABLE school_service_inspections ADD COLUMN client_uuid VARCHAR(80) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- تکمیل قطعی ساختار جداول seed برای دیتابیس‌های قدیمی
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_violation_types' AND COLUMN_NAME='sort_order'),'SELECT 1','ALTER TABLE school_service_violation_types ADD COLUMN sort_order INT NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_violation_types' AND COLUMN_NAME='is_active'),'SELECT 1','ALTER TABLE school_service_violation_types ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_vehicle_types' AND COLUMN_NAME='sort_order'),'SELECT 1','ALTER TABLE school_service_vehicle_types ADD COLUMN sort_order INT NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_vehicle_types' AND COLUMN_NAME='is_active'),'SELECT 1','ALTER TABLE school_service_vehicle_types ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_vehicle_colors' AND COLUMN_NAME='sort_order'),'SELECT 1','ALTER TABLE school_service_vehicle_colors ADD COLUMN sort_order INT NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_vehicle_colors' AND COLUMN_NAME='is_active'),'SELECT 1','ALTER TABLE school_service_vehicle_colors ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- جداول قدیمی ممکن است فقط title را داشته باشند.
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_districts' AND COLUMN_NAME='sort_order'),'SELECT 1','ALTER TABLE school_service_districts ADD COLUMN sort_order INT NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_districts' AND COLUMN_NAME='is_active'),'SELECT 1','ALTER TABLE school_service_districts ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Seedها بدون ON DUPLICATE KEY؛ بنابراین حتی اگر title در دیتابیس قدیمی UNIQUE نباشد نیز امن است.
INSERT INTO school_service_districts(title,sort_order)
SELECT '۱',1 WHERE NOT EXISTS(SELECT 1 FROM school_service_districts WHERE title='۱');
INSERT INTO school_service_districts(title,sort_order)
SELECT '۲',2 WHERE NOT EXISTS(SELECT 1 FROM school_service_districts WHERE title='۲');
INSERT INTO school_service_districts(title,sort_order)
SELECT '۳',3 WHERE NOT EXISTS(SELECT 1 FROM school_service_districts WHERE title='۳');
INSERT INTO school_service_districts(title,sort_order)
SELECT '۴',4 WHERE NOT EXISTS(SELECT 1 FROM school_service_districts WHERE title='۴');
INSERT INTO school_service_districts(title,sort_order)
SELECT '۵',5 WHERE NOT EXISTS(SELECT 1 FROM school_service_districts WHERE title='۵');
INSERT INTO school_service_districts(title,sort_order)
SELECT '۶',6 WHERE NOT EXISTS(SELECT 1 FROM school_service_districts WHERE title='۶');
INSERT INTO school_service_districts(title,sort_order)
SELECT '۷',7 WHERE NOT EXISTS(SELECT 1 FROM school_service_districts WHERE title='۷');
INSERT INTO school_service_districts(title,sort_order)
SELECT 'تبادکان',8 WHERE NOT EXISTS(SELECT 1 FROM school_service_districts WHERE title='تبادکان');

INSERT IGNORE INTO school_service_violation_types(title,sort_order) VALUES
('عدم اعتبار معاینه فنی',0),('عدم اعتبار بیمه شخص ثالث',1),('سرنشین اضافی',2),
('راننده غیر مجاز',3),('داشتن یا نداشتن گواهی صلاحیت معتبر',4),('عدم توجه به فرمان و ایست',5);

INSERT IGNORE INTO school_service_vehicle_types(title,sort_order) VALUES
('سمند',1),('سورن',2),('پژو',3),('پراید',4),('تیبا',5),('دنا',6),('رانا',7),('اطلس',8),('کوییک',9),('سایر',99);

INSERT IGNORE INTO school_service_vehicle_colors(title,sort_order) VALUES
('سفید',1),('زرد',2),('مشکی',3),('نقره‌ای',4),('خاکستری',5),('آبی',6),('قرمز',7),('سبز',8),('سایر',99);


-- شرکت‌های سرویس مدارس - داده پایه
-- ۶۵ شرکت مطابق فهرست ارائه‌شده
-- این Migration برای اجرای مستقیم در MySQL/MariaDB و اجرای مجدد امن شده است.
SET @db = DATABASE();

-- امکان اجرای مستقل این Migration حتی در دیتابیس قدیمی/بدون جدول پایه
CREATE TABLE IF NOT EXISTS school_service_companies (
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(255) NOT NULL,
 manager_name VARCHAR(150) NULL,
 phone VARCHAR(80) NULL,
 ceo_mobile VARCHAR(80) NULL,
 landline_phone VARCHAR(80) NULL,
 address VARCHAR(700) NULL,
 latitude DECIMAL(10,7) NULL,
 longitude DECIMAL(10,7) NULL,
 declared_school_count INT NOT NULL DEFAULT 0,
 registered_school_count INT NOT NULL DEFAULT 0,
 representative_count INT NOT NULL DEFAULT 0,
 profile_completed TINYINT(1) NOT NULL DEFAULT 0,
 is_active TINYINT(1) NOT NULL DEFAULT 1,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_ssc_name(name),
 KEY idx_ssc_active(is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



SET @sql = IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='ceo_mobile'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN ceo_mobile VARCHAR(50) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='landline_phone'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN landline_phone VARCHAR(50) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='latitude'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN latitude DECIMAL(10,7) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='longitude'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN longitude DECIMAL(10,7) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='declared_school_count'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN declared_school_count INT NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='registered_school_count'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN registered_school_count INT NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='representative_count'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN representative_count INT NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='profile_completed'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN profile_completed TINYINT(1) NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ارتقای کامل جدول شرکت‌ها برای دیتابیس‌های قدیمی
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='name'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN name VARCHAR(255) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='manager_name'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN manager_name VARCHAR(150) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='phone'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN phone VARCHAR(80) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='ceo_mobile'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN ceo_mobile VARCHAR(80) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='landline_phone'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN landline_phone VARCHAR(80) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='address'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN address VARCHAR(700) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='latitude'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN latitude DECIMAL(10,7) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='longitude'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN longitude DECIMAL(10,7) NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='declared_school_count'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN declared_school_count INT NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='registered_school_count'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN registered_school_count INT NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='representative_count'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN representative_count INT NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='profile_completed'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN profile_completed TINYINT(1) NOT NULL DEFAULT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='is_active'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='created_at'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_companies' AND COLUMN_NAME='updated_at'),'SELECT 1','ALTER TABLE school_service_companies ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO school_service_companies (id,name,manager_name,phone,ceo_mobile,landline_phone,address,latitude,longitude,declared_school_count,registered_school_count,representative_count,is_active,profile_completed) VALUES
(92,'آپادانا ترابر بارثاوا','زهره سیاه پور','09157020255','09157020255','9.16E+09','بزرگراه شهید سلیمانی ، شهرک آبادگران پارکینگ جنب مجتمع توریستی و رفاهی آبادگران واحد A','36.27043','59.55056',34,27,1,1,1),
(83,'آدریان سیر امیران توس','محبوبه عزیزی','09153042102','09153042102','05137659494','بازار بین‌المللی سپاد فاز یک طبقه منفی یک واحد هفت','36.34591','59.59219',20,19,1,1,1),
(110,'آرام سیر ابیورد','امیرحسین سلمانیان','','','9.36E+09','',NULL,NULL,52,5,1,1,0),
(75,'آرام نسیم توس','محمدرضا بنایی','09153089731','09153089731','05133861056','سیدی خلج 11مجتمع تجاری کاوه پلاک 38','36.24375','59.60177',31,27,1,1,1),
(98,'آرتا نوین یزدان خراسان','مسعود یزدی','','','9.16E+09','',NULL,NULL,29,13,1,1,0),
(77,'آسایش سیر گستر','جعفر مزدورکار','09155140898','09155140898','05138429661','کوهسنگی بهشتی ۴۰ پلاک ۶۳','36.28072','59.56703',31,21,1,1,1),
(125,'آستان سیر دانش(خاص)','حمیدرضا جعفرزاده','','','9.16E+09','',NULL,NULL,0,0,1,1,0),
(97,'اختر سینای توس','لیلا رئیسی','09153212257','09153212257','05135317962','الهیه۳نرسیده به شفایی۱ روبروی ساختمان سبحان','36.36838','59.48883',4,4,1,1,1),
(95,'ارمغان گشت رضوان','علی شیردلی','09153059326','09153059326','05138668167','معلم 64 نبش معرفت جنوبی 1 پلاک 1','36.33932','59.48435',22,18,1,1,1),
(103,'امید گشت نورالرضا','ناصر رضایی','09158834673','09158834673','9.16E+09','قاسم آباد- فلاحی ۲۰/۱-پلاک ۱۲۱','36.36071','59.49544',0,0,2,1,1),
(115,'امیدوار سیر توس شاد(خاص)','مهدی شادی','09153108048','09153108048','9.15E+09','بلوار پیروزی بین حافظیه 6,8','36.29308','59.58499',1,0,1,1,1),
(85,'امیران سیر آسیا','حامد بیات','09105518860','09105518860','05136036519','بین سیدرضی۳۳و۳۵ پلاک ۳۳۵',NULL,NULL,2,2,1,1,1),
(89,'اهورا گشت برنس','عباسعلی بیات','09029228582','09029228582','05135221600','دکتر حسابی شمالی ۱ پلاک ۲۵','36.35245','59.49939',8,8,1,1,1),
(122,'ایمن سیر گلهای بارثاوا','غلامعلی مقدسیان','','','9.16E+09','',NULL,NULL,0,0,1,1,0),
(94,'برنا گشت پارس گستر','مهناز مهرجویا','09158019912','09158019912','05138674757','الهیه ۳قبل از شفایی ا روبروی ساختمان سبحان','36.36838','59.48884',18,13,1,1,1),
(123,'بعثت سیر مشهد(خاص)','محمد رضا صدیق پور','','','9.35E+09','',NULL,NULL,0,0,1,1,0),
(68,'بیتا ترابر بیتا','رضا شکوفنده','','','9.94E+09','',NULL,NULL,0,0,1,1,0),
(81,'پگاه سیر دقیق','سیدحامد میرزا بابایی','09158174808','09158174808','05137237323','قاضی طباطبایی۸ پلاک۴','36.31646','59.58004',24,19,1,1,1),
(90,'پناه سیر رهپویان ولایت','ملیحه پناهی','09158939462','09158939462','9.16E+09','بلوار سرافرازان پایداری7قائمی15پلاک111','36.29117','59.51081',16,12,1,1,1),
(99,'پیام سیر کلات','مسلم احمدیان کلات','','','9.15E+09','',NULL,NULL,0,0,1,1,0),
(93,'پیشگامان باران سیر شرق','ناصر جوانمرد','09155041105','09155041105','05136077879','بلوار مهران بین بلوار سید رضی و دانش اموز نبش مهران۱۷ پ ۳۷۵ زنگ اول','36.33727','59.51503',6,6,1,1,1),
(120,'تربیت نوین آکام(خاص)','مریم آرافته','','','9.18E+09','',NULL,NULL,0,0,1,1,0),
(116,'توس سیر نگین مفتاح(خاص)','سید محمود حسین زاده','09155142498','09155142498','9.16E+09','هاشمیه 2/۱','36.37695','59.48212',0,0,1,1,1),
(87,'ثامن گشت خراسان','رضا محمد زاده','09155057583','09155057583','05136629265','ادیب جنوبی ۱۹/۴پلاک ۲۴','36.35142','59.51472',27,18,1,1,1),
(86,'جهان گشت بارثاوا ایرانیان','قاسم جهانی','09153032758','09153032758','05136611348','مشهد، شهرک رازی، بین شهید محمدی ۱۱ و ۱۳','36.35566','59.5366',21,17,1,1,1),
(101,'حسام سیر درخشان','ابوالفضل اکبری','09010665100','09010665100','9.01E+09','بازار ملل طبقه منفی یک پلاک۱۸۱۵',NULL,NULL,34,31,1,1,1),
(78,'حمایت مشهد الرضا','مصطفی اختراعی طوسی','','','9.15E+09','',NULL,NULL,0,0,1,1,0),
(65,'رایزن سرویس','هادی بهاریه','','','9.16E+09','',NULL,NULL,0,0,1,1,0),
(67,'رایزن سیر آسایش','هادی سالاری','09153218230','09153218230','05136036837','بلوار مهران بین مهران 17 و 19 پلاک 401','36.33739','59.51388',26,12,1,1,1),
(114,'رسالت سیر پویندگان(خاص)','طاهره نصیریان','','','9.16E+09','',NULL,NULL,7,0,1,1,0),
(121,'رضوان سیربارثاوا نوین(خاص)','مریم خیرخواهان','','','9.16E+09','',NULL,NULL,0,0,1,1,0),
(109,'ره پویان سیر بارثاوا','رضا هوشمند باقری','09030280882','09030280882','09030280882','قاسم آباد_بین شریعتی ۵۰ و چهارراه ادیب پلاک ۵۷۴','36.35177','59.514',16,15,1,1,1),
(80,'رهپویان گلهای البرز','علی کاشفی','09155085530','09155085530','9.16E+09','فرامرز عباسی36سادات 4پلاک8طبقه یک','36.33609','59.54859',20,19,1,1,1),
(69,'رهنورد سیر شمال شرق','انسیه باقری','09150294301','09150294301','9.15E+09','بازار بین المللی سپاد فاز 3طبقه مثبت 1واحد 406',NULL,NULL,29,14,1,1,1),
(84,'رویش گشت خراسان','زهرا سیاری','09155061739','09155061739','9.16E+09','فرامرز عباسی 6پلاک 43',NULL,NULL,10,0,1,1,1),
(119,'سر آمد سیر گستر علوی(خاص)','ذوالفقاری ( رضائیان )','','','9.16E+09','',NULL,NULL,0,0,1,1,0),
(126,'سفیر سیر راهیان نور(خاص)','محمد حسن کرومی','','','9.15E+09','',NULL,NULL,0,0,1,1,0),
(74,'سفیران شهر بهشت','مطهره صداقت','','','9.34E+09','',NULL,NULL,37,0,1,1,0),
(91,'سهیل گشت مشهد','عباس زارع','09151029096','09151029096','05136109954','نبش جلال 46 پلاک 105','36.33509','59.53017',7,7,1,1,1),
(107,'سینا گشت آیسا','محمد عین آبادی','09156833448','09156833448','9.16E+09','دانشجوی 30مهران 33',NULL,NULL,17,1,1,1,1),
(102,'شایان گشت ستاره هشتم','معصومه ندیمی','09159064435','09159064435','05632504725','بازارملل طبقه منفی ۱ واحد۱۴۱۷','36.29521','59.66296',39,35,1,1,1),
(70,'شتاب سیر خراسان','علیرضا لطفی','09155041280','09155041280','9.16E+09','سیدی نبش قائم ۵۷','36.23936','59.58887',1,0,1,1,1),
(66,'شیرین گشت شکوفه ها','محسن شاهمرادی زاده','09153586293','09153586293','05137428005','خیابان خواجه ربیع ـ خواجه ربیع ۹ ـ پایانه مسافربری کلات ـ طبقه اول','36.3357','59.62639',0,0,1,1,1),
(118,'صالح سیر طوس ایرانیان(خاص)','سیدعلی ذولفقاری','','','9.37E+09','',NULL,NULL,0,0,1,1,0),
(76,'ظفر سیر آرمان','فرزانه کریمیان','09156910878','09156910878','9.16E+09','خیابان ایمان بین ۱۳ و ۱۵ پلاک ۲۰۳','36.24975','59.59118',33,12,1,1,1),
(117,'عادل گشت اختر هشتم(خاص)','علی امانی','09158307297','09158307297','05132504725','بازارملل طبقه منفی ۱ واحد۱۰۳۲','36.2958','59.66239',5,5,1,1,1),
(142,'عدالت منش توس رضوان','','','','','',NULL,NULL,23,0,0,1,0),
(100,'عدالت منش مشهد','ستایش عدالتیان عسگری','09153209775','09153209775','05632505476','بازارملل طبقه منفی ۱ واحد ۱۰۰۷','36.29572','59.66234',32,29,1,1,1),
(96,'فاران گستر صبا','علیرضا تقوی','','','9.16E+09','',NULL,NULL,0,0,1,1,0),
(73,'فرهنگ سیر توس','مجید کریمیان','','','9.21E+08','',NULL,NULL,1,0,1,1,0),
(124,'فرهنگ سیر دانش(خاص)','محمد بنائی تربتی','','','9.16E+09','',NULL,NULL,0,0,1,1,0),
(72,'فضا سیر مبتکران خاورمیانه','علیرضا صداقت','','','9.16E+09','',NULL,NULL,2,0,1,1,0),
(82,'کرامت سیر رضوان','علی اکبر کرامتی','','','9.16E+09','',NULL,NULL,0,0,1,1,0),
(111,'کیمیا گشت ثامن','محمدرضا پاپلی','09159241353','09159241353','05136625151','قاسم آباد اديب جنوبی ۱۹ بلاک ۷','36.35105','59.51409',9,9,1,1,1),
(108,'مارال سیر خراسان','سعید ابراهیمی عرفانی','09157040241','09157040241','05136233123','شهرک غرب رستگاری6','36.3716','59.51212',2,2,1,1,1),
(113,'مجید سیر آفتاب هشتم','محمود نوری','','','9.16E+09','',NULL,NULL,0,0,1,1,0),
(88,'مهتاب سیر کیهان','امیر پاک سیما','','','9.15E+09','',NULL,NULL,0,0,1,1,0),
(139,'مهرآوران فراسو سیر آریا','سید محسن علوی','09150682931','09150682931','05137428006','نقش خواجه ربیع ۱۱ پایانه مسافربری کلات پلاک ۱۰۰۰۱','36.33589','59.62614',58,51,1,1,1),
(79,'مهربانو گشت رضوان','فهیمه قاسمی قرقی','09156909889','09156909889','05137113403','مجتمع تجاری الماس شرق','36.34655','59.5971',36,32,1,1,1),
(143,'ندای به آوران','','','','','',NULL,NULL,18,8,0,1,0),
(105,'نسیم امین خراسان','نسرین ابراهیمی عرفانی','09906235713','09906235713','05136231690','قاسم آباد حجاب 86/2 غلام حجی 2','36.37196','59.51265',12,11,1,1,1),
(106,'نسیم سیر ابوذر','جواد قجری','05135230459','05135230459','9.16E+09','فلاحی ۲۴ پلاک ۵۷ طبقه اول','36.35994','59.49351',14,14,1,1,1),
(104,'نگین نخل خراسان','عبداله قاسمی','09156531145','09156531145','9.16E+09','قاسم اباد بلوار شریعتی شریعتی ۵۰ پلاک ۵','36.35154','59.51423',15,13,1,1,1),
(71,'نوید گرد توس','محمد صفایی','09151081559','09151081559','05138587085','امام رضا 68 پلاک 27','36.26323','59.59553',23,0,1,1,1),
(112,'یزدان سیر پویا','وجیهه احمدزاده','09019472229','09019472229','05137603392','بازار بین المللی فاز 3 طبقه منفی 1واحد 325','36.34638','59.59261',22,21,1,1,1)
ON DUPLICATE KEY UPDATE name=VALUES(name),manager_name=VALUES(manager_name),phone=VALUES(phone),ceo_mobile=VALUES(ceo_mobile),landline_phone=VALUES(landline_phone),address=VALUES(address),latitude=VALUES(latitude),longitude=VALUES(longitude),declared_school_count=VALUES(declared_school_count),registered_school_count=VALUES(registered_school_count),representative_count=VALUES(representative_count),is_active=VALUES(is_active),profile_completed=VALUES(profile_completed);



SET FOREIGN_KEY_CHECKS=1;
-- پایان فایل ارتقا

