-- Apply once on MySQL 8 before deploying employment-period functionality.
-- NULL means the boundary is unrestricted. Dates use YYYY-MM-DD Jalali format.
SET @schema_name = DATABASE();
SET @add_start = (SELECT IF(COUNT(*)=0,
 'ALTER TABLE users ADD COLUMN employment_start_date VARCHAR(10) NULL',
 'SELECT 1') FROM information_schema.columns WHERE table_schema=@schema_name AND table_name='users' AND column_name='employment_start_date');
PREPARE stmt FROM @add_start; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @add_end = (SELECT IF(COUNT(*)=0,
 'ALTER TABLE users ADD COLUMN employment_end_date VARCHAR(10) NULL',
 'SELECT 1') FROM information_schema.columns WHERE table_schema=@schema_name AND table_name='users' AND column_name='employment_end_date');
PREPARE stmt FROM @add_end; EXECUTE stmt; DEALLOCATE PREPARE stmt;
