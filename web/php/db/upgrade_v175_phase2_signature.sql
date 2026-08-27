-- v175 Phase 2 - personnel signature
-- Compatible with MySQL 5.7+, MySQL 8.x and MariaDB; safe to run repeatedly.
SET @signature_column_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'signature_data'
);
SET @signature_upgrade_sql := IF(
    @signature_column_exists = 0,
    'ALTER TABLE users ADD COLUMN signature_data MEDIUMTEXT NULL AFTER photo',
    'SELECT ''signature_data already exists'''
);
PREPARE signature_upgrade_stmt FROM @signature_upgrade_sql;
EXECUTE signature_upgrade_stmt;
DEALLOCATE PREPARE signature_upgrade_stmt;
