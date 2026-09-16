-- خطیار: سازگاری ستون users.is_admin با نسخه‌های قدیمی دیتابیس
-- MySQL/MariaDB compatible و idempotent
-- منبع وضعیت مدیریتی فعلی roles.is_admin است؛ این ستون برای سازگاری کدهای قدیمی users نیز ایجاد می‌شود.

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='is_admin')=0,
  'ALTER TABLE users ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE users u
LEFT JOIN roles r ON r.id=u.role_id
SET u.is_admin=CASE WHEN COALESCE(r.is_admin,0)<>0 THEN 1 ELSE 0 END;
