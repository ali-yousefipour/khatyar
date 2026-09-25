-- سرویس مدارس - MySQL/MariaDB
-- Schema اصلی این فایل با ساختار مورد استفاده PHP و اپ موبایل یکسان است.
-- قابل اجرای مجدد است و برای phpMyAdmin/MySQL/MariaDB طراحی شده است.

CREATE TABLE IF NOT EXISTS school_service_companies (id INT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(255) NOT NULL,manager_name VARCHAR(150) NULL,phone VARCHAR(50) NULL,address VARCHAR(500) NULL,is_active TINYINT(1) NOT NULL DEFAULT 1,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,UNIQUE KEY uq_ssc_name(name),KEY idx_ssc_active(is_active)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS school_service_schools (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(100) NULL,
  name VARCHAR(255) NOT NULL,
  district VARCHAR(80) NULL,
  address TEXT NULL,
  gender VARCHAR(80) NULL,
  shift VARCHAR(80) NULL,
  education_level VARCHAR(150) NULL,
  school_type VARCHAR(150) NULL,
  activity_start VARCHAR(20) NULL,
  activity_end VARCHAR(20) NULL,
  morning_start VARCHAR(20) NULL,
  morning_end VARCHAR(20) NULL,
  afternoon_start VARCHAR(20) NULL,
  afternoon_end VARCHAR(20) NULL,
  driver_count INT NULL,
  student_count INT NULL,
  phone VARCHAR(50) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  status VARCHAR(80) NULL DEFAULT 'فعال',
  location_registered_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ss_code (code),
  KEY idx_ss_name (name),
  KEY idx_ss_district (district),
  KEY idx_ss_status (status),
  KEY idx_ss_location (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS school_service_school_companies (school_id INT NOT NULL,company_id INT NOT NULL,is_primary TINYINT(1) NOT NULL DEFAULT 1,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(school_id,company_id),UNIQUE KEY uq_sssc_school(school_id),KEY idx_sssc_company(company_id),CONSTRAINT fk_sssc_school FOREIGN KEY(school_id) REFERENCES school_service_schools(id) ON DELETE CASCADE,CONSTRAINT fk_sssc_company FOREIGN KEY(company_id) REFERENCES school_service_companies(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS school_service_violation_types (id INT AUTO_INCREMENT PRIMARY KEY,title VARCHAR(255) NOT NULL UNIQUE,is_active TINYINT(1) NOT NULL DEFAULT 1,sort_order INT NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO school_service_violation_types(title,sort_order) VALUES ('عدم اعتبار معاینه فنی',0),('عدم اعتبار بیمه شخص ثالث',1),('سرنشین اضافی',2),('راننده غیر مجاز',3),('داشتن یا نداشتن گواهی صلاحیت معتبر',4),('عدم توجه به فرمان و ایست',5);
CREATE TABLE IF NOT EXISTS school_service_inspections (id BIGINT AUTO_INCREMENT PRIMARY KEY,inspector_user_id INT NOT NULL,educational_district VARCHAR(80) NULL,company_id INT NULL,school_id INT NULL,school_gender ENUM('دخترانه','پسرانه','نامشخص') NOT NULL DEFAULT 'نامشخص',plate_three VARCHAR(3) NULL,plate_letter VARCHAR(5) NULL,plate_two VARCHAR(2) NULL,iran_code VARCHAR(4) NOT NULL DEFAULT 'ایران',vehicle_type VARCHAR(100) NULL,vehicle_color VARCHAR(80) NULL,passenger_count INT NOT NULL DEFAULT 0,driver_gender ENUM('خانم','آقا','نامشخص') NOT NULL DEFAULT 'نامشخص',certificate_status ENUM('معتبر','نامعتبر','ارائه نشد') NOT NULL DEFAULT 'ارائه نشد',violation_date VARCHAR(20) NULL,violation_time VARCHAR(10) NULL,location_text VARCHAR(700) NULL,latitude DECIMAL(10,7) NULL,longitude DECIMAL(10,7) NULL,description TEXT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,KEY idx_ssi_user(inspector_user_id,created_at),KEY idx_ssi_company(company_id,created_at),KEY idx_ssi_school(school_id,created_at),KEY idx_ssi_date(violation_date)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS school_service_inspection_photos (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  inspection_id BIGINT NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL DEFAULT 'image/jpeg',
  width INT NOT NULL DEFAULT 0,
  height INT NOT NULL DEFAULT 0,
  file_size INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ssip_inspection(inspection_id),
  CONSTRAINT fk_ssip_inspection FOREIGN KEY(inspection_id) REFERENCES school_service_inspections(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS school_service_inspection_violations (inspection_id BIGINT NOT NULL,violation_type_id INT NOT NULL,PRIMARY KEY(inspection_id,violation_type_id),KEY idx_ssiv_type(violation_type_id),CONSTRAINT fk_ssiv_inspection FOREIGN KEY(inspection_id) REFERENCES school_service_inspections(id) ON DELETE CASCADE,CONSTRAINT fk_ssiv_type FOREIGN KEY(violation_type_id) REFERENCES school_service_violation_types(id) ON DELETE RESTRICT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS school_service_permissions (role_id INT NOT NULL PRIMARY KEY,can_view TINYINT(1) NOT NULL DEFAULT 0,can_create TINYINT(1) NOT NULL DEFAULT 0,can_edit TINYINT(1) NOT NULL DEFAULT 0,can_delete TINYINT(1) NOT NULL DEFAULT 0,can_import TINYINT(1) NOT NULL DEFAULT 0,can_report TINYINT(1) NOT NULL DEFAULT 0,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS school_service_import_logs (id BIGINT AUTO_INCREMENT PRIMARY KEY,user_id INT NULL,file_name VARCHAR(255) NULL,companies_count INT NOT NULL DEFAULT 0,schools_count INT NOT NULL DEFAULT 0,mappings_count INT NOT NULL DEFAULT 0,errors_count INT NOT NULL DEFAULT 0,errors_text LONGTEXT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS school_service_districts (id INT AUTO_INCREMENT PRIMARY KEY,title VARCHAR(80) NOT NULL UNIQUE,is_active TINYINT(1) NOT NULL DEFAULT 1,sort_order INT NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO school_service_districts (title, sort_order) VALUES ('۱',1),('۲',2),('۳',3),('۴',4),('۵',5),('۶',6),('۷',7),('تبادکان',8) ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order), is_active = 1;
CREATE TABLE IF NOT EXISTS school_service_vehicle_types (id INT AUTO_INCREMENT PRIMARY KEY,title VARCHAR(100) NOT NULL UNIQUE,is_active TINYINT(1) NOT NULL DEFAULT 1,sort_order INT NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO school_service_vehicle_types(title,sort_order) VALUES ('سمند',1),('سورن',2),('پژو',3),('پراید',4),('تیبا',5),('دنا',6),('رانا',7),('اطلس',8),('کوییک',9),('سایر',99);
CREATE TABLE IF NOT EXISTS school_service_vehicle_colors (id INT AUTO_INCREMENT PRIMARY KEY,title VARCHAR(80) NOT NULL UNIQUE,is_active TINYINT(1) NOT NULL DEFAULT 1,sort_order INT NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO school_service_vehicle_colors(title,sort_order) VALUES ('سفید',1),('زرد',2),('مشکی',3),('نقره‌ای',4),('خاکستری',5),('آبی',6),('قرمز',7),('سبز',8),('سایر',99);

-- تکمیل ساختار مدارس برای دیتابیس‌های قبلی
-- برای سازگاری با MySQL و MariaDB، افزودن ستون‌ها با INFORMATION_SCHEMA انجام می‌شود.
SET @db = DATABASE();

SET @sql = IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='shift'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN shift VARCHAR(40) NULL AFTER gender');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='education_level'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN education_level VARCHAR(120) NULL AFTER shift');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='school_type'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN school_type VARCHAR(120) NULL AFTER education_level');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='activity_start'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN activity_start DATE NULL AFTER school_type');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='activity_end'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN activity_end DATE NULL AFTER activity_start');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='morning_start'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN morning_start TIME NULL AFTER activity_end');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='morning_end'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN morning_end TIME NULL AFTER morning_start');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='afternoon_start'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN afternoon_start TIME NULL AFTER morning_end');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='afternoon_end'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN afternoon_end TIME NULL AFTER afternoon_start');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='driver_count'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN driver_count INT NULL AFTER afternoon_end');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='student_count'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN student_count INT NULL AFTER driver_count');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='phone'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN phone VARCHAR(80) NULL AFTER address');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='latitude'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN latitude DECIMAL(10,7) NULL AFTER phone');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='longitude'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN longitude DECIMAL(10,7) NULL AFTER latitude');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='status'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'ثبت‌شده' AFTER longitude');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='school_service_schools' AND COLUMN_NAME='location_registered_at'),'SELECT 1','ALTER TABLE school_service_schools ADD COLUMN location_registered_at DATETIME NULL AFTER status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
