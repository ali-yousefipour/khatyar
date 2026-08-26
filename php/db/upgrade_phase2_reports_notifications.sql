-- ============================================================
-- Phase 2 upgrade: reports, notifications, dashboard, audit trail
-- Compatible with MySQL/MariaDB. Safe to run multiple times.
-- ============================================================

SET @e := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='reports' AND COLUMN_NAME='priority');
SET @s := IF(@e=0, 'ALTER TABLE reports ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT ''normal''', 'SELECT 1'); PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @e := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='reports' AND COLUMN_NAME='read_at');
SET @s := IF(@e=0, 'ALTER TABLE reports ADD COLUMN read_at DATETIME NULL', 'SELECT 1'); PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @e := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='reports' AND COLUMN_NAME='read_by');
SET @s := IF(@e=0, 'ALTER TABLE reports ADD COLUMN read_by INT NULL', 'SELECT 1'); PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @e := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='reports' AND COLUMN_NAME='rejected_at');
SET @s := IF(@e=0, 'ALTER TABLE reports ADD COLUMN rejected_at DATETIME NULL', 'SELECT 1'); PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @e := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='reports' AND COLUMN_NAME='rejected_by');
SET @s := IF(@e=0, 'ALTER TABLE reports ADD COLUMN rejected_by INT NULL', 'SELECT 1'); PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @e := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='reports' AND COLUMN_NAME='reject_reason');
SET @s := IF(@e=0, 'ALTER TABLE reports ADD COLUMN reject_reason TEXT NULL', 'SELECT 1'); PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS report_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NOT NULL,
  file_name VARCHAR(255) NULL,
  file_path VARCHAR(255) NULL,
  mime_type VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_report_attachments(report_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS report_audit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NOT NULL,
  actor_id INT NOT NULL,
  action VARCHAR(40) NOT NULL,
  note TEXT NULL,
  meta JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_report_audit(report_id,created_at),
  INDEX idx_report_audit_actor(actor_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS report_reads (
  report_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(report_id,user_id),
  INDEX idx_report_reads_user(user_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS report_deletions (
  report_id INT NOT NULL,
  user_id INT NOT NULL,
  reason TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(report_id,user_id),
  INDEX idx_rd_user(user_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
SET @e := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='report_deletions' AND COLUMN_NAME='reason');
SET @s := IF(@e=0, 'ALTER TABLE report_deletions ADD COLUMN reason TEXT NULL', 'SELECT 1'); PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @e := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='notifications' AND INDEX_NAME='idx_notifications_user_read_created');
SET @s := IF(@e=0, 'ALTER TABLE notifications ADD INDEX idx_notifications_user_read_created (user_id,is_read,created_at)', 'SELECT 1'); PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
