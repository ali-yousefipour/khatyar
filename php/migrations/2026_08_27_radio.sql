-- KhatYar Walkie-Talkie / Radio
-- MySQL/MariaDB compatible and idempotent.
CREATE TABLE IF NOT EXISTS radio_channels (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  current_speaker_id INT NULL,
  lock_until DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_radio_channels_code (code),
  KEY idx_radio_channels_active (is_active),
  KEY idx_radio_channels_speaker (current_speaker_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS radio_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  channel_id INT UNSIGNED NOT NULL,
  sender_id INT NOT NULL,
  sender_name VARCHAR(190) NOT NULL,
  audio_path VARCHAR(255) NOT NULL,
  mime_type VARCHAR(80) NOT NULL DEFAULT 'audio/mp4',
  duration_ms INT UNSIGNED NOT NULL DEFAULT 0,
  bytes_size INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_radio_messages_channel_id (channel_id, id),
  KEY idx_radio_messages_sender (sender_id, id),
  CONSTRAINT fk_radio_messages_channel FOREIGN KEY (channel_id) REFERENCES radio_channels(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS radio_user_settings (
  user_id INT NOT NULL PRIMARY KEY,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  channel_id INT UNSIGNED NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_radio_user_channel (channel_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO radio_channels (name, code, description)
VALUES
 ('عمومی','general','کانال عمومی ارتباط خطیار'),
 ('مدیریت','management','ارتباط مدیریت و مسئولین'),
 ('بازرسی','inspection','ارتباط واحد بازرسی'),
 ('عملیات خطوط','field','ارتباط عملیات میدانی خطوط')
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), is_active=1;
