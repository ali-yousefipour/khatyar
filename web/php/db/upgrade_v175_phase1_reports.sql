-- v175 phase 1 - گزارش‌های محرمانه و جستجو
SET @e := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='reports' AND COLUMN_NAME='confidential_history');
SET @s := IF(@e=0, 'ALTER TABLE reports ADD COLUMN confidential_history TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1'); PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
