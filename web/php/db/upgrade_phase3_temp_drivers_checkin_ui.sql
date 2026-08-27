-- Phase 3 upgrade: temp drivers, check-in reject logs, versions
CREATE TABLE IF NOT EXISTS temp_line_driver_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(30) NOT NULL,
  temp_line_driver_id INT NULL,
  driver_id INT NULL,
  line_id INT NULL,
  user_id INT NULL,
  meta JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tldh_driver (driver_id, created_at),
  INDEX idx_tldh_line (line_id, created_at),
  INDEX idx_tldh_temp (temp_line_driver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS attendance_reject_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  line_id INT NULL,
  method VARCHAR(30) NULL,
  lat DECIMAL(10,7) NULL,
  lng DECIMAL(10,7) NULL,
  accuracy_m DECIMAL(10,2) NULL,
  reason TEXT NULL,
  meta JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_arl_user_time (user_id, created_at),
  INDEX idx_arl_line_time (line_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO app_settings(`key`,`value`) VALUES
('site_version','87'),
('app_version','0.5.70')
ON DUPLICATE KEY UPDATE value=VALUES(value);
