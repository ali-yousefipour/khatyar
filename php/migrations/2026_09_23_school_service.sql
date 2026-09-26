-- سرویس مدارس - MySQL/MariaDB
-- این فایل idempotent است؛ Backend نیز در اولین درخواست جداول را خودکار ایجاد/تکمیل می‌کند.
CREATE TABLE IF NOT EXISTS school_service_companies (id INT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(255) NOT NULL,manager_name VARCHAR(150) NULL,phone VARCHAR(50) NULL,address VARCHAR(500) NULL,is_active TINYINT(1) NOT NULL DEFAULT 1,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,UNIQUE KEY uq_ssc_name(name),KEY idx_ssc_active(is_active)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS school_service_schools (id INT AUTO_INCREMENT PRIMARY KEY,code VARCHAR(80) NULL,name VARCHAR(255) NOT NULL,educational_district VARCHAR(80) NULL,gender ENUM('دخترانه','پسرانه','نامشخص') NOT NULL DEFAULT 'نامشخص',address VARCHAR(700) NULL,is_active TINYINT(1) NOT NULL DEFAULT 1,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,UNIQUE KEY uq_sss_code(code),KEY idx_sss_name(name),KEY idx_sss_district(educational_district)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS school_service_school_companies (school_id INT NOT NULL,company_id INT NOT NULL,is_primary TINYINT(1) NOT NULL DEFAULT 1,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(school_id,company_id),UNIQUE KEY uq_sssc_school(school_id),KEY idx_sssc_company(company_id),CONSTRAINT fk_sssc_school FOREIGN KEY(school_id) REFERENCES school_service_schools(id) ON DELETE CASCADE,CONSTRAINT fk_sssc_company FOREIGN KEY(company_id) REFERENCES school_service_companies(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS school_service_violation_types (id INT AUTO_INCREMENT PRIMARY KEY,title VARCHAR(255) NOT NULL UNIQUE,is_active TINYINT(1) NOT NULL DEFAULT 1,sort_order INT NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO school_service_violation_types(title,sort_order) VALUES ('عدم اعتبار معاینه فنی',0),('عدم اعتبار بیمه شخص ثالث',1),('سرنشین اضافی',2),('راننده غیر مجاز',3),('داشتن یا نداشتن گواهی صلاحیت معتبر',4),('عدم توجه به فرمان و ایست',5);
CREATE TABLE IF NOT EXISTS school_service_inspections (id BIGINT AUTO_INCREMENT PRIMARY KEY,inspector_user_id INT NOT NULL,educational_district VARCHAR(80) NULL,company_id INT NULL,school_id INT NULL,school_gender ENUM('دخترانه','پسرانه','نامشخص') NOT NULL DEFAULT 'نامشخص',plate_three VARCHAR(3) NULL,plate_letter VARCHAR(5) NULL,plate_two VARCHAR(2) NULL,iran_code VARCHAR(5) NOT NULL DEFAULT 'ایران',vehicle_type VARCHAR(100) NULL,vehicle_color VARCHAR(80) NULL,passenger_count INT NOT NULL DEFAULT 0,driver_gender ENUM('خانم','آقا','نامشخص') NOT NULL DEFAULT 'نامشخص',certificate_status ENUM('معتبر','نامعتبر','ارائه نشد') NOT NULL DEFAULT 'ارائه نشد',violation_date VARCHAR(20) NULL,violation_time VARCHAR(10) NULL,location_text VARCHAR(700) NULL,latitude DECIMAL(10,7) NULL,longitude DECIMAL(10,7) NULL,description TEXT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,KEY idx_ssi_user(inspector_user_id,created_at),KEY idx_ssi_company(company_id,created_at),KEY idx_ssi_school(school_id,created_at),KEY idx_ssi_date(violation_date)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS school_service_inspection_violations (inspection_id BIGINT NOT NULL,violation_type_id INT NOT NULL,PRIMARY KEY(inspection_id,violation_type_id),KEY idx_ssiv_type(violation_type_id),CONSTRAINT fk_ssiv_inspection FOREIGN KEY(inspection_id) REFERENCES school_service_inspections(id) ON DELETE CASCADE,CONSTRAINT fk_ssiv_type FOREIGN KEY(violation_type_id) REFERENCES school_service_violation_types(id) ON DELETE RESTRICT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS school_service_permissions (role_id INT NOT NULL PRIMARY KEY,can_view TINYINT(1) NOT NULL DEFAULT 0,can_create TINYINT(1) NOT NULL DEFAULT 0,can_edit TINYINT(1) NOT NULL DEFAULT 0,can_delete TINYINT(1) NOT NULL DEFAULT 0,can_import TINYINT(1) NOT NULL DEFAULT 0,can_report TINYINT(1) NOT NULL DEFAULT 0,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS school_service_import_logs (id BIGINT AUTO_INCREMENT PRIMARY KEY,user_id INT NULL,file_name VARCHAR(255) NULL,companies_count INT NOT NULL DEFAULT 0,schools_count INT NOT NULL DEFAULT 0,mappings_count INT NOT NULL DEFAULT 0,errors_count INT NOT NULL DEFAULT 0,errors_text LONGTEXT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS school_service_districts (id INT AUTO_INCREMENT PRIMARY KEY,title VARCHAR(80) NOT NULL UNIQUE,is_active TINYINT(1) NOT NULL DEFAULT 1,sort_order INT NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO school_service_districts(title,sort_order) VALUES ('۱',1),('۲',2),('۳',3),('۴',4),('۵',5),('۶',6),('۷',7),('تبادکان',8);
CREATE TABLE IF NOT EXISTS school_service_vehicle_types (id INT AUTO_INCREMENT PRIMARY KEY,title VARCHAR(100) NOT NULL UNIQUE,is_active TINYINT(1) NOT NULL DEFAULT 1,sort_order INT NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO school_service_vehicle_types(title,sort_order) VALUES ('سمند',1),('سورن',2),('پژو',3),('پراید',4),('تیبا',5),('دنا',6),('رانا',7),('اطلس',8),('کوییک',9),('سایر',99);
CREATE TABLE IF NOT EXISTS school_service_vehicle_colors (id INT AUTO_INCREMENT PRIMARY KEY,title VARCHAR(80) NOT NULL UNIQUE,is_active TINYINT(1) NOT NULL DEFAULT 1,sort_order INT NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO school_service_vehicle_colors(title,sort_order) VALUES ('سفید',1),('زرد',2),('مشکی',3),('نقره‌ای',4),('خاکستری',5),('آبی',6),('قرمز',7),('سبز',8),('سایر',99);


-- همسان‌سازی مهاجرت با API فعلی: شناسه یکتای ثبت آفلاین و تصویر خودرو
SET @ssv_col_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='school_service_inspections' AND column_name='client_uuid');
SET @ssv_sql := IF(@ssv_col_exists=0,'ALTER TABLE school_service_inspections ADD COLUMN client_uuid VARCHAR(64) NULL','SELECT 1');
PREPARE ssv_stmt FROM @ssv_sql;
EXECUTE ssv_stmt;
DEALLOCATE PREPARE ssv_stmt;

SET @ssv_idx_exists := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='school_service_inspections' AND index_name='uq_ssi_client_uuid');
SET @ssv_sql := IF(@ssv_idx_exists=0,'ALTER TABLE school_service_inspections ADD UNIQUE KEY uq_ssi_client_uuid(client_uuid)','SELECT 1');
PREPARE ssv_stmt FROM @ssv_sql;
EXECUTE ssv_stmt;
DEALLOCATE PREPARE ssv_stmt;

CREATE TABLE IF NOT EXISTS school_service_inspection_photos (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  inspection_id BIGINT NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(80) NOT NULL DEFAULT 'image/jpeg',
  width INT NULL,
  height INT NULL,
  file_size INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ssip_inspection(inspection_id),
  CONSTRAINT fk_ssip_inspection FOREIGN KEY(inspection_id) REFERENCES school_service_inspections(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
