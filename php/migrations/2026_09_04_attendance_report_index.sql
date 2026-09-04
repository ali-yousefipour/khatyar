-- خطیار: ایندکس گزارش تردد پرسنل
-- MySQL / MariaDB compatible and idempotent.
SET @idx_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'staff_attendance'
    AND INDEX_NAME = 'idx_staff_attendance_user_checkin'
);
SET @sql := IF(
  @idx_exists = 0,
  'ALTER TABLE staff_attendance ADD INDEX idx_staff_attendance_user_checkin (user_id, check_in)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
