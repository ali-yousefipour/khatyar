SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS bale_subscribers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chat_id VARCHAR(80) NOT NULL UNIQUE,
  bale_user_id VARCHAR(80) NULL,
  mobile VARCHAR(20) NOT NULL,
  user_id INT NULL,
  driver_id INT NULL,
  display_name VARCHAR(190) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_seen_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_bale_mobile (mobile),
  KEY idx_bale_user (user_id),
  KEY idx_bale_driver (driver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bale_message_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  target_type VARCHAR(30) NULL,
  target_id INT NULL,
  chat_id VARCHAR(80) NULL,
  body TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  response TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_bale_log_created (created_at),
  KEY idx_bale_log_target (target_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO app_settings(`key`,value) VALUES
('bale_enabled', 'false'),
('bale_bot_token', '""'),
('bale_api_base', '"https://tapi.bale.ai"'),
('bale_webhook_secret', '""'),
('bale_send_messages', 'true'),
('bale_send_birthday', 'true'),
('bale_send_attendance', 'true'),
('bale_send_bills', 'true'),
('bale_send_warnings', 'true'),
('bale_welcome_text', '"سلام. به ربات سامانه تاکسیرانی خوش آمدید. برای اتصال حساب، شماره همراه ثبت‌شده در سامانه یا کد ملی خود را ارسال کنید."'),
('bale_enabled_items', '{"messages":true,"birthday":true,"attendance":true,"bills":true,"warnings":true}')
ON DUPLICATE KEY UPDATE `key`=`key`;
