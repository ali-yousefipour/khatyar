-- خطیار: تاریخچه مستقل هر بار انجام چک‌لیست خودرو/موتورسیکلت
-- MySQL/MariaDB compatible و idempotent
CREATE TABLE IF NOT EXISTS personnel_vehicle_checklist_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  asset_id BIGINT UNSIGNED NOT NULL,
  checker_id BIGINT UNSIGNED NOT NULL,
  result ENUM('verified','needs_correction') NOT NULL,
  note TEXT NULL,
  checked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pvch_asset (asset_id),
  KEY idx_pvch_checker (checker_id),
  KEY idx_pvch_checked_at (checked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
