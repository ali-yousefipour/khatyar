-- خطیار: زیرساخت مستقل محدودیت تلاش‌های ورود
-- MySQL/MariaDB compatible و idempotent.
-- این جدول نباید هنگام هر درخواست login ساخته شود؛ فقط یک‌بار توسط migration ایجاد می‌شود.

CREATE TABLE IF NOT EXISTS login_ip_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_lia_ip_time (ip, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- پاکسازی رکوردهای قدیمی برای جلوگیری از رشد بی‌نهایت جدول.
DELETE FROM login_ip_attempts
WHERE created_at < DATE_SUB(NOW(), INTERVAL 2 DAY);
