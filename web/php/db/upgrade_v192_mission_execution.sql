SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS mission_visit_sessions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  line_id INT NOT NULL,
  role_mode VARCHAR(40) NOT NULL,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME NULL,
  start_lat DOUBLE NULL,
  start_lng DOUBLE NULL,
  finish_lat DOUBLE NULL,
  finish_lng DOUBLE NULL,
  start_photo_path VARCHAR(500) NULL,
  finish_photo_path VARCHAR(500) NULL,
  report_text TEXT NULL,
  actual_present_count INT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'in_progress',
  validated TINYINT(1) NOT NULL DEFAULT 0,
  validation_percent DECIMAL(6,2) NOT NULL DEFAULT 0,
  validation_details JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_mvs_user_day(user_id,started_at),
  INDEX idx_mvs_line_day(line_id,started_at),
  INDEX idx_mvs_status(status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mission_daily_progress (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  progress_date DATE NOT NULL,
  role_key VARCHAR(40) NOT NULL,
  mission_source VARCHAR(30) NULL,
  mission_id BIGINT NULL,
  assigned_lines_count INT NOT NULL DEFAULT 0,
  visited_lines_count INT NOT NULL DEFAULT 0,
  validated_lines_count INT NOT NULL DEFAULT 0,
  target_json JSON NULL,
  actual_json JSON NULL,
  progress_json JSON NULL,
  weighted_achievement DECIMAL(7,2) NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_mdp_user_date(user_id,progress_date),
  INDEX idx_mdp_date_role(progress_date,role_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mission_timeline_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  line_id INT NULL,
  visit_session_id BIGINT NULL,
  event_type VARCHAR(60) NOT NULL,
  target_type VARCHAR(40) NULL,
  target_id BIGINT NULL,
  title VARCHAR(255) NOT NULL,
  details JSON NULL,
  lat DOUBLE NULL,
  lng DOUBLE NULL,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mte_user_day(user_id,occurred_at),
  INDEX idx_mte_line_day(line_id,occurred_at),
  INDEX idx_mte_visit(visit_session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mission_execution_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT NULL,
  updated_by INT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO mission_execution_settings(setting_key,setting_value) VALUES
('visit_min_duration_minutes','10'),
('visit_min_checked_percent','5'),
('visit_require_start_photo','0'),
('visit_require_finish_photo','1'),
('visit_require_end_report','1'),
('visit_photo_width','1280'),
('visit_photo_quality','70')
ON DUPLICATE KEY UPDATE setting_key=VALUES(setting_key);
