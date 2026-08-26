-- Phase 1: حضور و غیاب خودکار، تحویل شیفت و اصلاح گزارش‌ها
-- سازگار با MySQL/MariaDB؛ اگر ستون/جدول از قبل وجود داشت، پیام Duplicate را نادیده بگیرید یا قبل از اجرا بررسی کنید.

CREATE TABLE IF NOT EXISTS shift_handovers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(80) NOT NULL UNIQUE,
  from_user_id INT NOT NULL,
  to_user_id INT NULL,
  line_id INT NULL,
  attendance_id INT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  expires_at DATETIME NOT NULL,
  accepted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_handover_token (token),
  INDEX idx_handover_from (from_user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS attendance_ot_adjustments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  jdate VARCHAR(10) NOT NULL,
  minutes INT NOT NULL DEFAULT 0,
  reason TEXT NULL,
  approved_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_att_adj (user_id,jdate),
  INDEX idx_att_adj_user (user_id,jdate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS report_deletions (
  report_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(report_id,user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS report_edits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NOT NULL,
  editor_id INT NOT NULL,
  old_subject TEXT NULL,
  old_body MEDIUMTEXT NULL,
  new_subject TEXT NULL,
  new_body MEDIUMTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_report_edits (report_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- در صورت خطای Duplicate column، یعنی قبلاً اضافه شده است.
ALTER TABLE staff_attendance ADD COLUMN handover_id INT NULL;
ALTER TABLE staff_attendance ADD COLUMN calc_json JSON NULL;
ALTER TABLE reports ADD COLUMN deleted_at DATETIME NULL;
ALTER TABLE reports ADD COLUMN deleted_by INT NULL;
ALTER TABLE reports ADD COLUMN updated_at DATETIME NULL;
