-- خطیار — سازگاری اسکیمای گزارش مستقیم تردد پرسنل
-- MySQL 5.7+ / MariaDB 10.2+
-- بر اساس اسکیمای تاریخی staff_attendance در upgrade_full_standalone.sql
-- و ستون‌های افزوده‌شده در 2026_09_06_vehicle_attendance_hardening.sql
-- این migration چندبار قابل اجراست.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS staff_attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  line_id INT NULL,
  check_in DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  check_out DATETIME NULL,
  method VARCHAR(20) NULL,
  in_lat DOUBLE NULL,
  in_lng DOUBLE NULL,
  out_lat DOUBLE NULL,
  out_lng DOUBLE NULL,
  auto_closed TINYINT(1) NOT NULL DEFAULT 0,
  INDEX idx_sa_user (user_id, check_in),
  INDEX idx_sa_open (user_id, check_out)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @sql := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='staff_attendance' AND COLUMN_NAME='in_station')=0,
  'ALTER TABLE staff_attendance ADD COLUMN in_station VARCHAR(190) NULL AFTER method','SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='staff_attendance' AND COLUMN_NAME='out_station')=0,
  'ALTER TABLE staff_attendance ADD COLUMN out_station VARCHAR(190) NULL AFTER in_station','SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='staff_attendance' AND COLUMN_NAME='handover_id')=0,
  'ALTER TABLE staff_attendance ADD COLUMN handover_id INT NULL','SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='staff_attendance' AND COLUMN_NAME='calc_json')=0,
  'ALTER TABLE staff_attendance ADD COLUMN calc_json JSON NULL','SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='staff_attendance' AND COLUMN_NAME='client_check_in')=0,
  'ALTER TABLE staff_attendance ADD COLUMN client_check_in DATETIME NULL','SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='staff_attendance' AND COLUMN_NAME='client_check_out')=0,
  'ALTER TABLE staff_attendance ADD COLUMN client_check_out DATETIME NULL','SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ستون‌های مورد استفاده مستقیم _attendance_report در users
SET @sql := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='device_model')=0,
  'ALTER TABLE users ADD COLUMN device_model VARCHAR(255) NULL','SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='work_policy_id')=0,
  'ALTER TABLE users ADD COLUMN work_policy_id INT NULL','SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ایندکس گزارش مستقیم: کاربر + زمان ورود
SET @sql := IF((SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='staff_attendance' AND INDEX_NAME='idx_sa_user_checkin_report')=0,
  'ALTER TABLE staff_attendance ADD INDEX idx_sa_user_checkin_report (user_id,check_in)','SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
