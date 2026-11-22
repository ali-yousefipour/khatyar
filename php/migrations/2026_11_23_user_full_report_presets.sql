-- Additive, idempotent storage for named personnel-report configurations.
-- No existing personnel or custom-field data is modified.
CREATE TABLE IF NOT EXISTS user_full_report_presets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  owner_user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  visibility VARCHAR(10) NOT NULL DEFAULT 'private',
  settings_json LONGTEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ufrp_owner (owner_user_id),
  INDEX idx_ufrp_visibility (visibility)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
