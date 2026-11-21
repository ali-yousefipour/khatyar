-- Durable, user-scoped idempotency for Android attendance submissions.
-- Apply before enabling receipt handling in php/lib/routes.php.
CREATE TABLE IF NOT EXISTS attendance_action_receipts (
  user_id INT NOT NULL,
  action_name VARCHAR(16) NOT NULL,
  client_uuid VARCHAR(120) NOT NULL,
  attendance_id BIGINT UNSIGNED NOT NULL,
  response_json JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, action_name, client_uuid),
  KEY idx_attendance_receipt_id (attendance_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
