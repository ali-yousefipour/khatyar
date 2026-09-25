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
