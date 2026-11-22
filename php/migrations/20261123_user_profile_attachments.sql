-- Private personnel attachments are additive and never expose files via the site document root.
-- Existing users, custom_fields and custom_field_values remain untouched.
CREATE TABLE IF NOT EXISTS user_profile_attachments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  field_id INT UNSIGNED NOT NULL,
  storage_name VARCHAR(72) NOT NULL,
  original_name VARCHAR(180) NOT NULL,
  mime_type VARCHAR(80) NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  sha256 CHAR(64) NOT NULL,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY user_profile_attachment_owner (user_id, field_id),
  KEY user_profile_attachment_field_idx (field_id),
  KEY user_profile_attachment_upload_idx (uploaded_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
