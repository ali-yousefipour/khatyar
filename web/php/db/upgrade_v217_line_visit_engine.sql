-- v217 - موتور کامل برنامه بازدید و پوشش خط
-- MySQL/MariaDB - قابل اجرا در phpMyAdmin و قابل اجرای مجدد
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS mission_visit_sessions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, line_id INT NOT NULL, role_mode VARCHAR(40) NOT NULL,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, finished_at DATETIME NULL,
  start_lat DECIMAL(10,7) NULL, start_lng DECIMAL(10,7) NULL, finish_lat DECIMAL(10,7) NULL, finish_lng DECIMAL(10,7) NULL,
  start_photo_path VARCHAR(500) NULL, finish_photo_path VARCHAR(500) NULL,
  start_accuracy DECIMAL(8,2) NULL, finish_accuracy DECIMAL(8,2) NULL, start_provider VARCHAR(30) NULL, finish_provider VARCHAR(30) NULL,
  report_text TEXT NULL, actual_present_count INT NULL, checked_count INT NOT NULL DEFAULT 0, attendance_count INT NOT NULL DEFAULT 0, notice_count INT NOT NULL DEFAULT 0, coverage_percent DECIMAL(6,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'in_progress', validated TINYINT(1) NOT NULL DEFAULT 0, validation_percent DECIMAL(6,2) NOT NULL DEFAULT 0, validation_details LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_mvs_user_started(user_id,started_at), KEY idx_mvs_line_started(line_id,started_at), KEY idx_mvs_day_status(user_id,line_id,started_at,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE IF EXISTS v217_add_col;
DELIMITER $$
CREATE PROCEDURE v217_add_col(IN t VARCHAR(64),IN c VARCHAR(64),IN d TEXT)
BEGIN
 IF NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=t AND COLUMN_NAME=c) THEN
  SET @q=CONCAT('ALTER TABLE `',t,'` ADD COLUMN `',c,'` ',d); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
 END IF;
END$$
DELIMITER ;
CALL v217_add_col('mission_visit_sessions','start_photo_path','VARCHAR(500) NULL');
CALL v217_add_col('mission_visit_sessions','finish_photo_path','VARCHAR(500) NULL');
CALL v217_add_col('mission_visit_sessions','start_accuracy','DECIMAL(8,2) NULL');
CALL v217_add_col('mission_visit_sessions','finish_accuracy','DECIMAL(8,2) NULL');
CALL v217_add_col('mission_visit_sessions','start_provider','VARCHAR(30) NULL');
CALL v217_add_col('mission_visit_sessions','finish_provider','VARCHAR(30) NULL');
CALL v217_add_col('mission_visit_sessions','checked_count','INT NOT NULL DEFAULT 0');
CALL v217_add_col('mission_visit_sessions','attendance_count','INT NOT NULL DEFAULT 0');
CALL v217_add_col('mission_visit_sessions','notice_count','INT NOT NULL DEFAULT 0');
CALL v217_add_col('mission_visit_sessions','coverage_percent','DECIMAL(6,2) NOT NULL DEFAULT 0');
DROP PROCEDURE IF EXISTS v217_add_col;

INSERT INTO mission_execution_settings(setting_key,setting_value) VALUES
('visit_min_duration_minutes','10'),('visit_min_checked_percent','5'),('visit_require_start_photo','false'),
('visit_require_finish_photo','true'),('visit_require_end_report','true'),('visit_geo_extra_radius_m','75'),
('visit_max_location_accuracy_m','120'),('visit_photo_width','1280'),('visit_photo_quality','70')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);
