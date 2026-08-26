-- Khatyar / MySQL-MariaDB / idempotent
-- مدل نهایی: هر خط فقط یک ایستگاه دارد و هر ایستگاه می‌تواند چند تابلو داشته باشد.

CREATE TABLE IF NOT EXISTS line_location_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  can_capture TINYINT(1) NOT NULL DEFAULT 0,
  can_view TINYINT(1) NOT NULL DEFAULT 0,
  can_manage TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_llp_role(role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS line_station_locations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  line_id INT NOT NULL,
  station_code VARCHAR(80) NULL,
  station_status VARCHAR(30) NOT NULL DEFAULT 'registered',
  station_name VARCHAR(190) NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  accuracy_m DECIMAL(10,2) NULL,
  physical_address TEXT NULL,
  street VARCHAR(190) NULL,
  location_photo_path VARCHAR(500) NULL,
  captured_by INT NOT NULL,
  captured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_lsl_line(line_id),
  INDEX idx_lsl_captured(captured_by,captured_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS line_station_signs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  station_location_id BIGINT NOT NULL,
  sign_type_id INT NOT NULL,
  photo_path VARCHAR(500) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lss_station(station_location_id),
  INDEX idx_lss_type(sign_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ستون‌های مرجع روی lines برای جستجوی سریع، نقشه و Attendance؛ اطلاعات چندتابلو فقط در line_station_signs نگهداری می‌شود.
SET @db_name = DATABASE();
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='lines' AND COLUMN_NAME='latitude')=0,'ALTER TABLE `lines` ADD COLUMN `latitude` DECIMAL(10,7) NULL','SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='lines' AND COLUMN_NAME='longitude')=0,'ALTER TABLE `lines` ADD COLUMN `longitude` DECIMAL(10,7) NULL','SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='lines' AND COLUMN_NAME='location_accuracy_m')=0,'ALTER TABLE `lines` ADD COLUMN `location_accuracy_m` DECIMAL(10,2) NULL','SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='lines' AND COLUMN_NAME='station_name')=0,'ALTER TABLE `lines` ADD COLUMN `station_name` VARCHAR(190) NULL','SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='lines' AND COLUMN_NAME='location_photo_path')=0,'ALTER TABLE `lines` ADD COLUMN `location_photo_path` VARCHAR(500) NULL','SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='lines' AND COLUMN_NAME='location_updated_by')=0,'ALTER TABLE `lines` ADD COLUMN `location_updated_by` INT NULL','SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='lines' AND COLUMN_NAME='location_updated_at')=0,'ALTER TABLE `lines` ADD COLUMN `location_updated_at` DATETIME NULL','SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='lines' AND COLUMN_NAME='station_location_id')=0,'ALTER TABLE `lines` ADD COLUMN `station_location_id` BIGINT NULL','SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='lines' AND COLUMN_NAME='station_physical_address')=0,'ALTER TABLE `lines` ADD COLUMN `station_physical_address` TEXT NULL','SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='lines' AND COLUMN_NAME='station_street')=0,'ALTER TABLE `lines` ADD COLUMN `station_street` VARCHAR(190) NULL','SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- برای نصب‌های قدیمی، FK به‌صورت اجباری ایجاد نمی‌شود تا با کلیدهای موجود دیتابیس ناسازگار نشود؛ API قانون one-station-per-line را enforce می‌کند.
SET @db_name=NULL; SET @sql=NULL;
