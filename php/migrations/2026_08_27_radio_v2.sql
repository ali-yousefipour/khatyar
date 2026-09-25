-- KhatYar Radio v2: secure membership rules, presence and audit log.
-- MySQL/MariaDB compatible and idempotent.
-- برای دیتابیس جدید و دیتابیس‌های قدیمی طراحی شده است.

SET @db=DATABASE();

CREATE TABLE IF NOT EXISTS radio_channels (
 id INT UNSIGNED NOT NULL AUTO_INCREMENT,name VARCHAR(100) NOT NULL,code VARCHAR(50) NOT NULL,
 description VARCHAR(255) NULL,is_active TINYINT(1) NOT NULL DEFAULT 1,current_speaker_id INT NULL,lock_until DATETIME NULL,
 channel_type VARCHAR(20) NOT NULL DEFAULT 'custom',match_mode VARCHAR(3) NOT NULL DEFAULT 'OR',max_talk_ms INT UNSIGNED NOT NULL DEFAULT 25000,
 priority INT NOT NULL DEFAULT 0,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY(id),UNIQUE KEY uq_radio_channels_code(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS radio_messages (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,channel_id INT UNSIGNED NOT NULL,sender_id INT NOT NULL,sender_name VARCHAR(190) NOT NULL,
 audio_path VARCHAR(255) NOT NULL,mime_type VARCHAR(80) NOT NULL DEFAULT 'audio/mp4',duration_ms INT UNSIGNED NOT NULL DEFAULT 0,
 bytes_size INT UNSIGNED NOT NULL DEFAULT 0,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(id),KEY idx_radio_messages_channel(channel_id,id),KEY idx_radio_messages_sender(sender_id,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS radio_user_settings (
 user_id INT NOT NULL PRIMARY KEY,enabled TINYINT(1) NOT NULL DEFAULT 1,channel_id INT UNSIGNED NULL,
 listen_all TINYINT(1) NOT NULL DEFAULT 0,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS radio_channel_regions (
 channel_id INT UNSIGNED NOT NULL,region_id INT NOT NULL,PRIMARY KEY(channel_id,region_id),KEY idx_radio_cr_region(region_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS radio_channel_users (
 channel_id INT UNSIGNED NOT NULL,user_id INT NOT NULL,PRIMARY KEY(channel_id,user_id),KEY idx_radio_cu_user(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS radio_channel_roles (
 channel_id INT UNSIGNED NOT NULL,role_id INT NOT NULL,PRIMARY KEY(channel_id,role_id),KEY idx_radio_cr_role(role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS radio_presence (
 channel_id INT UNSIGNED NOT NULL,user_id INT NOT NULL,last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(channel_id,user_id),KEY idx_radio_presence_seen(channel_id,last_seen_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS radio_logs (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,channel_id INT UNSIGNED NULL,user_id INT NULL,event_type VARCHAR(40) NOT NULL,
 meta_json TEXT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(id),KEY idx_radio_logs_channel(channel_id,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- تکمیل ستون‌های دیتابیس‌های قدیمی
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_user_settings' AND COLUMN_NAME='listen_all'),'SELECT 1','ALTER TABLE radio_user_settings ADD COLUMN listen_all TINYINT(1) NOT NULL DEFAULT 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channels' AND COLUMN_NAME='channel_type'),'SELECT 1','ALTER TABLE radio_channels ADD COLUMN channel_type VARCHAR(20) NOT NULL DEFAULT ''custom''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channels' AND COLUMN_NAME='match_mode'),'SELECT 1','ALTER TABLE radio_channels ADD COLUMN match_mode VARCHAR(3) NOT NULL DEFAULT ''OR''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channels' AND COLUMN_NAME='max_talk_ms'),'SELECT 1','ALTER TABLE radio_channels ADD COLUMN max_talk_ms INT UNSIGNED NOT NULL DEFAULT 25000');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channels' AND COLUMN_NAME='priority'),'SELECT 1','ALTER TABLE radio_channels ADD COLUMN priority INT NOT NULL DEFAULT 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_messages' AND COLUMN_NAME='sender_name'),'SELECT 1','ALTER TABLE radio_messages ADD COLUMN sender_name VARCHAR(190) NOT NULL DEFAULT ''کاربر''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_messages' AND COLUMN_NAME='audio_path'),'SELECT 1','ALTER TABLE radio_messages ADD COLUMN audio_path VARCHAR(255) NOT NULL DEFAULT ''''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_messages' AND COLUMN_NAME='mime_type'),'SELECT 1','ALTER TABLE radio_messages ADD COLUMN mime_type VARCHAR(80) NOT NULL DEFAULT ''audio/mp4''');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_messages' AND COLUMN_NAME='duration_ms'),'SELECT 1','ALTER TABLE radio_messages ADD COLUMN duration_ms INT UNSIGNED NOT NULL DEFAULT 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_messages' AND COLUMN_NAME='bytes_size'),'SELECT 1','ALTER TABLE radio_messages ADD COLUMN bytes_size INT UNSIGNED NOT NULL DEFAULT 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_messages' AND COLUMN_NAME='created_at'),'SELECT 1','ALTER TABLE radio_messages ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

INSERT INTO radio_channels(name,code,description,is_active,channel_type,match_mode,max_talk_ms,priority)
VALUES
('عمومی','general','کانال عمومی ارتباط خطیار',1,'custom','OR',25000,10),
('مدیریت','management','ارتباط مدیریت و مسئولین',1,'custom','OR',25000,20),
('بازرسی','inspection','ارتباط واحد بازرسی',1,'custom','OR',25000,30),
('عملیات خطوط','field','ارتباط عملیات میدانی خطوط',1,'custom','OR',25000,25)
ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),is_active=1;

UPDATE radio_channels SET channel_type='custom' WHERE channel_type IS NULL OR channel_type='';
UPDATE radio_channels SET match_mode='OR' WHERE match_mode IS NULL OR match_mode='';
UPDATE radio_channels SET max_talk_ms=25000 WHERE max_talk_ms IS NULL OR max_talk_ms<5000;
