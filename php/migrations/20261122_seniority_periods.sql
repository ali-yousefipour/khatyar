-- Non-destructive period calculation audit and forecast ledger.
-- Existing personnel_seniority_months and personnel_seniority_history stay unchanged.
CREATE TABLE IF NOT EXISTS personnel_seniority_period_runs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  period CHAR(7) NOT NULL,
  run_type VARCHAR(12) NOT NULL,
  status VARCHAR(16) NOT NULL,
  actor_id INT NOT NULL,
  eligible_count INT NOT NULL DEFAULT 0,
  processed_count INT NOT NULL DEFAULT 0,
  skipped_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  error_summary TEXT NULL,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME NULL,
  KEY idx_seniority_runs_period (period,run_type,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS personnel_seniority_forecasts (
  user_id INT NOT NULL,
  jyear SMALLINT NOT NULL,
  jmonth TINYINT NOT NULL,
  eligible_days TINYINT UNSIGNED NOT NULL,
  credited_days TINYINT UNSIGNED NOT NULL,
  actor_id INT NOT NULL,
  run_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id,jyear,jmonth)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
