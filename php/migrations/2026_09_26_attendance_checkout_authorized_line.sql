-- ثبت خط واقعی خروج برای امکان ورود در یک خط و خروج در خط مجاز دیگر
-- سازگار با MySQL/MariaDB و قابل اجرای چندباره
SET @db = DATABASE();
SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE staff_attendance ADD COLUMN out_line_id INT NULL',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=@db
    AND TABLE_NAME='staff_attendance'
    AND COLUMN_NAME='out_line_id'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_staff_attendance_out_line ON staff_attendance(out_line_id)',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA=@db
    AND TABLE_NAME='staff_attendance'
    AND INDEX_NAME='idx_staff_attendance_out_line'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
