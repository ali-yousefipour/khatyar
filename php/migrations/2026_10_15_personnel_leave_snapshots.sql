-- Snapshot report imported from the personnel leave workbook (1405/06).
-- The private import containing individual personnel data is not tracked in Git.
CREATE TABLE IF NOT EXISTS personnel_leave_snapshots (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  personnel_code VARCHAR(40) NOT NULL,
  personnel_name VARCHAR(160) NOT NULL,
  period_year SMALLINT UNSIGNED NOT NULL,
  period_month TINYINT UNSIGNED NOT NULL,
  through_jdate VARCHAR(10) NOT NULL,
  source_reported_at VARCHAR(20) NULL,
  monthly_used_min INT NOT NULL DEFAULT 0,
  monthly_used_count INT NOT NULL DEFAULT 0,
  yearly_used_min INT NOT NULL DEFAULT 0,
  yearly_used_count INT NOT NULL DEFAULT 0,
  monthly_balance_min INT NOT NULL DEFAULT 0,
  yearly_balance_min INT NOT NULL DEFAULT 0,
  monthly_allowed_min INT NOT NULL DEFAULT 0,
  yearly_allowed_min INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_personnel_leave_snapshot (period_year,period_month,personnel_code,personnel_name),
  KEY idx_personnel_leave_user_period (user_id,period_year,period_month),
  KEY idx_personnel_leave_period (period_year,period_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
