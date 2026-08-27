-- v192 Mission Execution - MySQL/MariaDB compatible
-- قابل اجرا در phpMyAdmin و قابل اجرای مجدد
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS inspector_modes (
  user_id INT NOT NULL,
  mode VARCHAR(40) NOT NULL DEFAULT 'auto',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  updated_by INT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subordinate_daily_reviews (
  id BIGINT NOT NULL AUTO_INCREMENT,
  reviewer_id INT NOT NULL,
  subject_user_id INT NOT NULL,
  review_date DATE NOT NULL,
  line_id INT NULL,
  attendance_score DECIMAL(6,2) NOT NULL DEFAULT 0,
  checklist_score DECIMAL(6,2) NOT NULL DEFAULT 0,
  notice_score DECIMAL(6,2) NOT NULL DEFAULT 0,
  coverage_score DECIMAL(6,2) NOT NULL DEFAULT 0,
  quality_score DECIMAL(6,2) NOT NULL DEFAULT 0,
  total_score DECIMAL(7,2) NOT NULL DEFAULT 0,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sdr_daily (reviewer_id, subject_user_id, review_date),
  KEY idx_sdr_subject_date (subject_user_id, review_date),
  KEY idx_sdr_line_date (line_id, review_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mission_visit_sessions (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  line_id INT NOT NULL,
  role_mode VARCHAR(40) NOT NULL,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME NULL,
  start_lat DECIMAL(10,7) NULL,
  start_lng DECIMAL(10,7) NULL,
  finish_lat DECIMAL(10,7) NULL,
  finish_lng DECIMAL(10,7) NULL,
  start_photo_data LONGTEXT NULL,
  finish_photo_data LONGTEXT NULL,
  report_text TEXT NULL,
  actual_present_count INT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'in_progress',
  validated TINYINT(1) NOT NULL DEFAULT 0,
  validation_percent DECIMAL(6,2) NOT NULL DEFAULT 0,
  validation_details LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  open_visit_key VARCHAR(100) GENERATED ALWAYS AS (
    CASE WHEN status='in_progress' THEN CONCAT(user_id,':',line_id) ELSE NULL END
  ) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_mvs_open_user_line (open_visit_key),
  KEY idx_mvs_user_started (user_id, started_at),
  KEY idx_mvs_line_started (line_id, started_at),
  KEY idx_mvs_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mission_daily_progress (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  progress_date DATE NOT NULL,
  role_key VARCHAR(100) NOT NULL,
  mission_source VARCHAR(50) NULL,
  mission_id BIGINT NULL,
  assigned_lines_count INT NOT NULL DEFAULT 0,
  visited_lines_count INT NOT NULL DEFAULT 0,
  validated_lines_count INT NOT NULL DEFAULT 0,
  target_json LONGTEXT NULL,
  actual_json LONGTEXT NULL,
  progress_json LONGTEXT NULL,
  weighted_achievement DECIMAL(7,2) NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_mdp_user_date (user_id, progress_date),
  KEY idx_mdp_date_role (progress_date, role_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mission_timeline_events (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  line_id INT NULL,
  visit_session_id BIGINT NULL,
  event_type VARCHAR(100) NOT NULL,
  target_type VARCHAR(100) NULL,
  target_id BIGINT NULL,
  title VARCHAR(255) NOT NULL,
  details LONGTEXT NULL,
  lat DECIMAL(10,7) NULL,
  lng DECIMAL(10,7) NULL,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_mte_user_occurred (user_id, occurred_at),
  KEY idx_mte_line_occurred (line_id, occurred_at),
  KEY idx_mte_visit (visit_session_id),
  KEY idx_mte_event_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mission_execution_settings (
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT NULL,
  updated_by INT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO mission_execution_settings(setting_key,setting_value) VALUES
('visit_min_duration_minutes','10'),
('visit_min_checked_percent','5'),
('visit_require_start_photo','false'),
('visit_require_finish_photo','true'),
('visit_require_end_report','true'),
('visit_geo_extra_radius_m','75'),
('visit_photo_width','1280'),
('visit_photo_quality','70')
ON DUPLICATE KEY UPDATE setting_key=VALUES(setting_key);

SET FOREIGN_KEY_CHECKS = 1;
