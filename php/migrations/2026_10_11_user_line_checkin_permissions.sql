-- Separate line-data access from staff self check-in permission.
-- MySQL/MariaDB. Idempotent: existing permissions are not re-seeded on reruns.
SET @db = DATABASE();
SET @had_checkin_permission_table = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='user_line_checkin_permissions'
);
SET @sql = IF(@had_checkin_permission_table=0,
  'CREATE TABLE user_line_checkin_permissions (
    user_id INT NOT NULL,
    line_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id,line_id),
    KEY idx_ulcp_line (line_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(@had_checkin_permission_table=0,
  'INSERT IGNORE INTO user_line_checkin_permissions(user_id,line_id) SELECT user_id,line_id FROM user_lines',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
