CREATE TABLE IF NOT EXISTS personnel_seniority (
  user_id INT NOT NULL PRIMARY KEY, base_days INT UNSIGNED NOT NULL,
  base_through_jdate CHAR(10) NOT NULL, adjustment_days INT NOT NULL DEFAULT 0,
  source_ref VARCHAR(100) NULL, revision INT UNSIGNED NOT NULL DEFAULT 1,
  updated_by INT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS personnel_seniority_months (
  user_id INT NOT NULL, jyear SMALLINT NOT NULL, jmonth TINYINT NOT NULL,
  eligible_days TINYINT UNSIGNED NOT NULL, absent_days TINYINT UNSIGNED NOT NULL,
  credited_days TINYINT UNSIGNED NOT NULL, absence_dates TEXT NOT NULL,
  checked_through_jdate CHAR(10) NOT NULL, updated_by INT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id,jyear,jmonth)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS personnel_seniority_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL,
  event_key VARCHAR(160) NULL, kind VARCHAR(20) NOT NULL, period CHAR(7) NULL,
  total_before INT NOT NULL, total_after INT NOT NULL, delta_days INT NOT NULL,
  reason VARCHAR(500) NOT NULL, actor_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_seniority_event(event_key), KEY idx_seniority_user(user_id,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
