-- دسترسی سرویس مدارس فقط بر اساس role_id مدیریت می‌شود.
-- این migration عمداً هیچ وابستگی به عنوان سمت یا level ندارد.
-- دسترسی هر سمت در school_service_permissions با role_id ذخیره می‌شود.
CREATE TABLE IF NOT EXISTS school_service_permissions (
  role_id INT NOT NULL PRIMARY KEY,
  can_view TINYINT(1) NOT NULL DEFAULT 0,
  can_create TINYINT(1) NOT NULL DEFAULT 0,
  can_edit TINYINT(1) NOT NULL DEFAULT 0,
  can_delete TINYINT(1) NOT NULL DEFAULT 0,
  can_import TINYINT(1) NOT NULL DEFAULT 0,
  can_report TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- برای role_idهای موجود فقط رکورد خنثی ایجاد می‌شود؛ مجوزها از داده‌های
-- قبلی حفظ می‌شوند و در صورت نبود رکورد، هیچ دسترسی‌ای به‌صورت خودکار داده نمی‌شود.
INSERT IGNORE INTO school_service_permissions
  (role_id,can_view,can_create,can_edit,can_delete,can_import,can_report)
SELECT id,0,0,0,0,0,0
FROM roles;
