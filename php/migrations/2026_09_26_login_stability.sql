-- Login stability migration for MySQL/MariaDB.
-- Safe to run repeatedly. Login code never creates/changes these tables at request time.

CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT NULL,
  username_hash CHAR(64) NOT NULL,
  ip VARCHAR(64) NULL,
  device_type VARCHAR(20) NOT NULL DEFAULT 'web',
  success TINYINT(1) NOT NULL DEFAULT 0,
  reason VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_login_attempts_user_time (user_id, success, created_at),
  KEY idx_login_attempts_ip_time (ip, success, created_at),
  KEY idx_login_attempts_username_time (username_hash, success, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Existing installations may have activity_logs without the composite index.
-- Add it only when absent; this is deliberately kept out of the Login request path.
SET @db = DATABASE();
SET @idx_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA=@db
    AND TABLE_NAME='activity_logs'
    AND INDEX_NAME='idx_activity_logs_event_time'
);
SET @sql = IF(@idx_exists=0 AND EXISTS(
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='activity_logs'
), 'ALTER TABLE activity_logs ADD KEY idx_activity_logs_event_time(event,created_at)', 'SELECT 1');
PREPARE s FROM @sql;
EXECUTE s;
DEALLOCATE PREPARE s;

-- login_ip_attempts was previously created lazily by the health dashboard.
-- Keep it available for older code/installations that still reference it.
CREATE TABLE IF NOT EXISTS login_ip_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ip VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_lia_ip_time (ip, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
