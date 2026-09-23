-- Runtime repair for PHP web panel
-- Safe/idempotent for MySQL/MariaDB.
-- Fixes production databases where the base schema was not fully migrated.

CREATE TABLE IF NOT EXISTS user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  device_type VARCHAR(10) NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  device_model VARCHAR(255) NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_type (user_id, device_type),
  KEY idx_user_sessions_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_settings (
  `key` VARCHAR(80) PRIMARY KEY,
  value JSON NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The school-service migration remains the canonical source for its tables.
