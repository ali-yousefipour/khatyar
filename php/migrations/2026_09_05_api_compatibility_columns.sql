-- خطیار: سازگاری API گزارش تردد و پرونده خودرو با نصب‌های قدیمی
-- MySQL/MariaDB compatible و idempotent

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='national_code')=0,
  'ALTER TABLE users ADD COLUMN national_code VARCHAR(10) NULL AFTER phone',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='device_model')=0,
  'ALTER TABLE users ADD COLUMN device_model VARCHAR(255) NULL AFTER national_code',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='staff_attendance' AND COLUMN_NAME='in_station')=0,
  'ALTER TABLE staff_attendance ADD COLUMN in_station VARCHAR(190) NULL AFTER method',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='staff_attendance' AND COLUMN_NAME='out_station')=0,
  'ALTER TABLE staff_attendance ADD COLUMN out_station VARCHAR(190) NULL AFTER in_station',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
