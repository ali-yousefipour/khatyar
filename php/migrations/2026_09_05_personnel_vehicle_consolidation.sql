-- خطیار: تثبیت و یکپارچه‌سازی پرونده خودرو/موتورسیکلت و تاریخچه چک‌لیست
-- MySQL/MariaDB compatible و idempotent
CREATE TABLE IF NOT EXISTS personnel_vehicle_assets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  asset_type ENUM('car','motorcycle') NOT NULL,
  plate_part_right VARCHAR(3) NULL, plate_letter VARCHAR(2) NULL, plate_part_left VARCHAR(2) NULL, plate_iran VARCHAR(2) NULL,
  motorcycle_plate_top VARCHAR(3) NULL, motorcycle_plate_bottom VARCHAR(5) NULL,
  vehicle_type VARCHAR(30) NULL, fuel_type VARCHAR(20) NULL, color VARCHAR(50) NULL, model_year SMALLINT NULL,
  chassis_number VARCHAR(80) NULL, engine_number VARCHAR(80) NULL, vin VARCHAR(80) NULL,
  motorcycle_usage VARCHAR(20) NULL, motorcycle_system VARCHAR(80) NULL, motorcycle_type VARCHAR(80) NULL, cylinders TINYINT NULL,
  license_number VARCHAR(80) NULL, license_issue_date VARCHAR(10) NULL, license_expiry_date VARCHAR(10) NULL,
  insurance_number VARCHAR(100) NULL, insurance_company VARCHAR(150) NULL, insurance_issue_date VARCHAR(10) NULL, insurance_expiry_date VARCHAR(10) NULL,
  technical_inspection_number VARCHAR(100) NULL, technical_inspection_issue_date VARCHAR(10) NULL, technical_inspection_expiry_date VARCHAR(10) NULL,
  fixed_beacon TINYINT(1) NULL, mobile_beacon TINYINT(1) NULL, heating_ok TINYINT(1) NULL, cooling_ok TINYINT(1) NULL, amplifier TINYINT(1) NULL,
  status ENUM('draft','pending','verified','needs_correction') NOT NULL DEFAULT 'pending', verified_by BIGINT UNSIGNED NULL, verified_at DATETIME NULL, checklist_note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY(id), UNIQUE KEY uq_personnel_asset_user_type(user_id,asset_type), KEY idx_personnel_asset_user(user_id), KEY idx_personnel_asset_status(status), KEY idx_personnel_asset_verified_by(verified_by), KEY idx_personnel_asset_updated(updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS personnel_vehicle_asset_photos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, asset_id BIGINT UNSIGNED NOT NULL, photo_key VARCHAR(60) NOT NULL, data_uri LONGTEXT NOT NULL, crop_json TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY(id), UNIQUE KEY uq_asset_photo(asset_id,photo_key), KEY idx_asset_photo_asset(asset_id), KEY idx_asset_photo_key(photo_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS personnel_vehicle_asset_checks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, asset_id BIGINT UNSIGNED NOT NULL, checker_id BIGINT UNSIGNED NOT NULL, check_key VARCHAR(80) NOT NULL,
  check_value TINYINT(1) NOT NULL DEFAULT 0, note VARCHAR(500) NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY(id), UNIQUE KEY uq_asset_check(asset_id,checker_id,check_key), KEY idx_asset_check_asset(asset_id), KEY idx_asset_check_checker(checker_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS personnel_vehicle_checklist_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, asset_id BIGINT UNSIGNED NOT NULL, checker_id BIGINT UNSIGNED NOT NULL,
  result ENUM('verified','needs_correction') NOT NULL, note TEXT NULL, checks_json LONGTEXT NULL, checked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(id), KEY idx_pvch_asset(asset_id), KEY idx_pvch_checker(checker_id), KEY idx_pvch_checked_at(checked_at), KEY idx_pvch_asset_time(asset_id,checked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- برای نصب‌های قبلی که جدول تاریخچه بدون checks_json دارند
SET @sql := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='personnel_vehicle_checklist_history' AND COLUMN_NAME='checks_json')=0,
  'ALTER TABLE personnel_vehicle_checklist_history ADD COLUMN checks_json LONGTEXT NULL AFTER note', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF((SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='personnel_vehicle_checklist_history' AND INDEX_NAME='idx_pvch_asset_time')=0,
  'ALTER TABLE personnel_vehicle_checklist_history ADD INDEX idx_pvch_asset_time(asset_id,checked_at)', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
