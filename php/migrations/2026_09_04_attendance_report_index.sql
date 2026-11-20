-- خطیار: ایندکس گزارش تردد پرسنل
-- MySQL / MariaDB compatible and idempotent.
SET @idx_exists := (
  SELECT COUNT(*) FROM (
    SELECT INDEX_NAME
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'staff_attendance'
      AND INDEX_TYPE = 'BTREE'
    GROUP BY INDEX_NAME
    HAVING SUM(CASE WHEN SEQ_IN_INDEX = 1 AND COLUMN_NAME = 'user_id' AND SUB_PART IS NULL THEN 1 ELSE 0 END) = 1
       AND SUM(CASE WHEN SEQ_IN_INDEX = 2 AND COLUMN_NAME = 'check_in' AND SUB_PART IS NULL THEN 1 ELSE 0 END) = 1
  ) AS compatible_indexes
);
SET @sql := IF(
  @idx_exists = 0,
  'ALTER TABLE staff_attendance ADD INDEX idx_staff_attendance_user_checkin (user_id, check_in)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
