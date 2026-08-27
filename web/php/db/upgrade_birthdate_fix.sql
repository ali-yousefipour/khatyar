-- Fix: add missing users.birth_date column for birthday storage (MySQL/MariaDB)
SET @db_name := DATABASE();
SET @has_birth_date := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='users' AND COLUMN_NAME='birth_date'
);
SET @sql := IF(@has_birth_date=0,
  'ALTER TABLE users ADD COLUMN birth_date VARCHAR(20) NULL',
  'SELECT ''users.birth_date already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
