-- ===========================================================================
--  سامانه کنترل خطوط تاکسیرانی مشهد — MySQL Schema (MySQL 5.7+/MariaDB 10.2+)
-- ===========================================================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL UNIQUE,
  level INT NOT NULL,
  is_admin TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS zones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  parent_id INT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(20) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  manager_id INT NULL,
  zone_id INT NULL,
  phone VARCHAR(20) NULL,
  rank_stars TINYINT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  must_change_pw TINYINT(1) NOT NULL DEFAULT 1,
  email VARCHAR(190) NULL,
  photo MEDIUMTEXT NULL,
  allow_android TINYINT(1) NOT NULL DEFAULT 1,
  allow_web TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_devices (
  user_id INT NOT NULL PRIMARY KEY,
  device_id VARCHAR(255) NOT NULL,
  device_model VARCHAR(255) NULL,
  bound_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  device_type VARCHAR(10) NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  device_model VARCHAR(255) NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_type (user_id, device_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_lines (
  user_id INT NOT NULL,
  line_id INT NOT NULL,
  PRIMARY KEY (user_id, line_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `lines` (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) UNIQUE,
  origin VARCHAR(200), destination VARCHAR(200), broker VARCHAR(200),
  municipality_zone VARCHAR(120), taxi_zone VARCHAR(120), type VARCHAR(120),
  is_special VARCHAR(40), is_circular VARCHAR(40), status VARCHAR(60)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS drivers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  national_id VARCHAR(10) NOT NULL UNIQUE,
  first_name VARCHAR(100), last_name VARCHAR(100), father_name VARCHAR(100),
  birth_date VARCHAR(20), gender VARCHAR(20), mobile VARCHAR(20),
  address VARCHAR(400), smart_no VARCHAR(40),
  taxi_lic_issue VARCHAR(20), taxi_lic_expire VARCHAR(20), taxi_lic_status VARCHAR(60),
  operating_code VARCHAR(40), op_lic_issue VARCHAR(20), op_lic_expire VARCHAR(20),
  op_lic_status VARCHAR(60), driver_type VARCHAR(60),
  updated_at DATETIME NULL,
  KEY (last_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vehicles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plate VARCHAR(40) NOT NULL UNIQUE,
  vin VARCHAR(60), chassis VARCHAR(60), engine VARCHAR(60),
  model_name VARCHAR(120), model_year VARCHAR(20), color VARCHAR(40),
  fuel VARCHAR(40), capacity INT NULL, line_id INT NULL,
  owner_national_id VARCHAR(10), ownership_type VARCHAR(60), operating_code VARCHAR(40) NULL,
  tech_inspection_expire VARCHAR(20) NULL, insurance_expire VARCHAR(20) NULL, line_text VARCHAR(200) NULL,
  beneficiary_national_id VARCHAR(10) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vehicle_drivers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL, driver_id INT NOT NULL,
  role VARCHAR(20) NOT NULL, shift VARCHAR(20) NULL,
  line_code_in_line VARCHAR(40),
  UNIQUE KEY uq_vd (vehicle_id, driver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_id VARCHAR(40), pay_id VARCHAR(40), status VARCHAR(60),
  reason VARCHAR(200), person_title VARCHAR(200), national_id VARCHAR(10),
  phone VARCHAR(20), amount BIGINT, pay_date VARCHAR(20), plate VARCHAR(40),
  operating_code VARCHAR(40), line_text VARCHAR(200),
  driver_id INT NULL, vehicle_id INT NULL,
  UNIQUE KEY uq_bill (bill_id), KEY (national_id), KEY (plate), KEY (status), KEY (driver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS attendances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  driver_id INT NOT NULL, user_id INT NOT NULL, line_id INT NULL,
  lat DOUBLE NULL, lng DOUBLE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_att (driver_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS checklist_templates (
  id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(200) NOT NULL, is_active TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS checklist_items (
  id INT AUTO_INCREMENT PRIMARY KEY, template_id INT NOT NULL,
  label VARCHAR(200) NOT NULL, sort_order INT DEFAULT 0, options JSON NULL, answer_type VARCHAR(20) DEFAULT 'single'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS checklist_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY, template_id INT NOT NULL,
  driver_id INT NULL, vehicle_id INT NULL, user_id INT NOT NULL,
  answers JSON NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notice_reasons (
  id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(200) NOT NULL, is_active TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS notices (
  id INT AUTO_INCREMENT PRIMARY KEY, driver_id INT NOT NULL, user_id INT NOT NULL,
  reason_id INT NULL, priority VARCHAR(10) NOT NULL, body TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  attachment_name VARCHAR(255) NULL, attachment_data MEDIUMTEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reports (
  id INT AUTO_INCREMENT PRIMARY KEY, sender_id INT NOT NULL,
  subject VARCHAR(300), body TEXT, status VARCHAR(20) NOT NULL DEFAULT 'sent',
  attachment_name VARCHAR(255) NULL, attachment_data MEDIUMTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_reports_sender_created (sender_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS report_routes (
  id INT AUTO_INCREMENT PRIMARY KEY, report_id INT NOT NULL,
  to_user_id INT NULL, action VARCHAR(20) NOT NULL, note TEXT,
  actor_id INT NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS location_pings (
  id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL,
  lat DOUBLE NOT NULL, lng DOUBLE NOT NULL,
  captured_at DATETIME NOT NULL, synced_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ping (user_id, captured_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id INT NULL,
  event VARCHAR(60) NOT NULL, meta JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS custom_forms (
  id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(200) NOT NULL,
  `schema` JSON NOT NULL, is_active TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS print_templates (
  id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(150) NOT NULL, html MEDIUMTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS form_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY, form_id INT NOT NULL, user_id INT NOT NULL,
  driver_id INT NULL, answers JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS app_settings (
  `key` VARCHAR(80) PRIMARY KEY, value JSON NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS push_tokens (
  user_id INT NOT NULL, token VARCHAR(255) NOT NULL, platform VARCHAR(20),
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS bale_subscribers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chat_id VARCHAR(80) NOT NULL UNIQUE,
  bale_user_id VARCHAR(80) NULL,
  mobile VARCHAR(20) NOT NULL,
  user_id INT NULL,
  driver_id INT NULL,
  display_name VARCHAR(190) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_seen_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_bale_mobile (mobile),
  KEY idx_bale_user (user_id),
  KEY idx_bale_driver (driver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bale_message_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  target_type VARCHAR(30) NULL,
  target_id INT NULL,
  chat_id VARCHAR(80) NULL,
  body TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  response TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_bale_log_created (created_at),
  KEY idx_bale_log_target (target_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL, body TEXT, data JSON NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notif (user_id, is_read, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS official_visits (
  id INT AUTO_INCREMENT PRIMARY KEY, official_id INT NOT NULL, recorded_by INT NOT NULL,
  line_id INT NULL, note TEXT, lat DOUBLE NULL, lng DOUBLE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ov (official_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS=1;

-- مقادیر پیش‌فرض تنظیمات
INSERT IGNORE INTO app_settings (`key`, value) VALUES
  ('org_name', '"سازمان تاکسیرانی مشهد"'),
  ('deputy_name', '"اکبر فلاح"'),
  ('inspection_head', '"رضا معلم‌زاده"'),
  ('payment_base_url', '"https://epay.mashhad.ir/CityUsers/OnLineBillPay.aspx"'),
  ('attendance_cooldown_min', '5'),
  ('require_gps', 'true'),
  ('block_vpn', 'true'),
  ('block_dev_options', 'true');

-- ---------------------------------------------------------------------------
-- 9) محدودهٔ خطوط (ایستگاه‌ها) + پیام‌رسانی با رسید خواندن
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS geofences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  line_id INT NULL,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(12) NOT NULL,            -- 'polygon' یا 'circle'
  color VARCHAR(20) NOT NULL DEFAULT '#0d7a5f',
  center_lat DOUBLE NULL, center_lng DOUBLE NULL, radius_m INT NULL,
  polygon JSON NULL,                    -- آرایه‌ای از [lat,lng]
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT NOT NULL,
  title VARCHAR(200) NULL,
  body TEXT NOT NULL,
  target_type VARCHAR(12) NOT NULL,     -- 'all' | 'zone' | 'selected'
  zone_id INT NULL,
  attachment_name VARCHAR(255) NULL,
  attachment_data MEDIUMTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS message_recipients (
  message_id INT NOT NULL,
  user_id INT NOT NULL,
  read_at DATETIME NULL,
  PRIMARY KEY (message_id, user_id),
  KEY idx_mr_user (user_id, read_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_activity (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  kind VARCHAR(20) NOT NULL,
  at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  meta JSON NULL,
  KEY (user_id), KEY (kind), KEY (at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================
-- Performance indexes: سرعت گزارش حضور، شیفت، موقعیت زنده و لاگ‌ها
-- ============================================================
-- Performance indexes: نسخه سازگار با MySQL/MariaDB
DROP PROCEDURE IF EXISTS __taxi_schema_add_idx;
DELIMITER $$
CREATE PROCEDURE __taxi_schema_add_idx(IN p_table VARCHAR(64), IN p_idx VARCHAR(64), IN p_cols TEXT, IN p_required_cols TEXT)
BEGIN
  DECLARE v_table INT DEFAULT 0;
  DECLARE v_idx INT DEFAULT 0;
  DECLARE v_need INT DEFAULT 0;
  DECLARE v_have INT DEFAULT 0;
  SELECT COUNT(*) INTO v_table FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=p_table;
  IF v_table > 0 THEN
    SELECT COUNT(*) INTO v_idx FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=p_table AND INDEX_NAME=p_idx;
    IF v_idx = 0 THEN
      SET v_need = 1 + LENGTH(p_required_cols) - LENGTH(REPLACE(p_required_cols, ',', ''));
      SELECT COUNT(*) INTO v_have FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=p_table AND FIND_IN_SET(COLUMN_NAME, p_required_cols) > 0;
      IF v_need = v_have THEN
        SET @sql = CONCAT('ALTER TABLE `', REPLACE(p_table,'`','``'), '` ADD INDEX `', REPLACE(p_idx,'`','``'), '` (', p_cols, ')');
        PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
      END IF;
    END IF;
  END IF;
END$$
DELIMITER ;
CALL __taxi_schema_add_idx('attendances','idx_att_user_in_exit','user_id, checkin_at, exit_at','user_id,checkin_at,exit_at');
CALL __taxi_schema_add_idx('attendances','idx_att_user_created_exit','user_id, created_at, exit_at','user_id,created_at,exit_at');
CALL __taxi_schema_add_idx('user_shifts','idx_user_shifts_user_dates','user_id, from_jdate, to_jdate','user_id,from_jdate,to_jdate');
CALL __taxi_schema_add_idx('shift_days','idx_shift_days_shift_jdate','shift_id, jdate','shift_id,jdate');
CALL __taxi_schema_add_idx('presence_checks','idx_presence_checks_user_date_slot','user_id, slot_date, slot','user_id,slot_date,slot');
CALL __taxi_schema_add_idx('activity_logs','idx_activity_logs_user_event_created','user_id, event, created_at','user_id,event,created_at');
CALL __taxi_schema_add_idx('location_pings','idx_location_pings_user_captured','user_id, captured_at','user_id,captured_at');
CALL __taxi_schema_add_idx('notifications','idx_notifications_user_read_created','user_id, is_read, created_at','user_id,is_read,created_at');
DROP PROCEDURE IF EXISTS __taxi_schema_add_idx;


-- تنظیم اعلان خروج کاربر از محدودهٔ خط
INSERT INTO app_settings(`key`,value) VALUES('station_exit_notify','{"enabled":false,"mode":"hierarchy","user_id":null}')
ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO app_settings(`key`,value) VALUES('gps_required_accuracy_m','80')
ON DUPLICATE KEY UPDATE `key`=`key`;


INSERT IGNORE INTO app_settings (`key`, value) VALUES
('bale_enabled', 'false'),
('bale_bot_token', '""'),
('bale_api_base', '"https://tapi.bale.ai"'),
('bale_webhook_secret', '""'),
('bale_send_messages', 'true'),
('bale_send_birthday', 'true'),
('bale_send_attendance', 'true'),
('bale_send_bills', 'true'),
('bale_send_warnings', 'true'),
('bale_welcome_text', '"سلام. به ربات سامانه تاکسیرانی خوش آمدید. برای اتصال حساب، شماره همراه ثبت‌شده در سامانه یا کد ملی خود را ارسال کنید."'),
('bale_enabled_items', '{"messages":true,"birthday":true,"attendance":true,"bills":true,"warnings":true}');


-- V181 / Phase 3: multi-signal VPN monitoring
CREATE TABLE IF NOT EXISTS vpn_status_reports (
  id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id BIGINT NOT NULL, vpn_on TINYINT(1) NOT NULL DEFAULT 0,
  event VARCHAR(24) NOT NULL DEFAULT 'vpn_heartbeat', detected_by JSON NULL, tunnel_interfaces JSON NULL,
  dns_servers JSON NULL, network_type VARCHAR(32) NULL, client_public_ip VARCHAR(64) NULL, server_ip VARCHAR(64) NULL,
  ip_country VARCHAR(4) NULL, sdk_int INT NULL, checked_at DATETIME NOT NULL, duration_seconds INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vpn_reports_user_checked (user_id, checked_at), INDEX idx_vpn_reports_state_checked (vpn_on, checked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
