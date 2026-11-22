-- Personnel profile form definitions are additive; legacy users/custom_fields/values remain authoritative.
-- Apply once after backup and preflight. Never DROP or rewrite legacy data.
CREATE TABLE IF NOT EXISTS user_form_definitions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  form_key VARCHAR(64) NOT NULL,
  title VARCHAR(160) NOT NULL,
  draft_json LONGTEXT NULL,
  published_version INT UNSIGNED NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 0,
  updated_by BIGINT UNSIGNED NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY user_form_key_unique (form_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_form_versions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  form_id BIGINT UNSIGNED NOT NULL,
  version INT UNSIGNED NOT NULL,
  schema_json LONGTEXT NOT NULL,
  published_by BIGINT UNSIGNED NOT NULL,
  published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY user_form_version_unique (form_id, version),
  KEY user_form_versions_form_idx (form_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_form_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  form_id BIGINT UNSIGNED NOT NULL,
  actor_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(32) NOT NULL,
  version INT UNSIGNED NULL,
  metadata_json LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY user_form_audit_idx (form_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rollback: leave these new tables intact to preserve form history.
-- To deactivate use the legacy /my/custom-fields flow. Never delete user data.
