-- Idempotent event-based complaint notification outbox.
-- All delivery options default to OFF; no messages are sent until an admin enables a rule.
CREATE TABLE IF NOT EXISTS school_complaint_notification_outbox (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT NOT NULL,
  complaint_id BIGINT NOT NULL,
  event_key VARCHAR(32) NOT NULL,
  audience VARCHAR(32) NOT NULL,
  channel VARCHAR(16) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('queued','processing','sent','failed') NOT NULL DEFAULT 'queued',
  error_message VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  attempted_at DATETIME NULL,
  finished_at DATETIME NULL,
  UNIQUE KEY uq_sc_event_recipient_channel (event_id,audience,channel),
  KEY idx_sc_outbox_queue (status,id),
  KEY idx_sc_outbox_case (complaint_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
