-- KhatYar Radio v2: secure membership rules, presence and audit log.
-- MySQL/MariaDB compatible and idempotent.

SET @db=DATABASE();
SET @sql=(SELECT IF(COUNT(*)=0,'ALTER TABLE radio_channels ADD COLUMN channel_type VARCHAR(20) NOT NULL DEFAULT ''custom''','SELECT 1') FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channels' AND COLUMN_NAME='channel_type'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=(SELECT IF(COUNT(*)=0,'ALTER TABLE radio_channels ADD COLUMN match_mode VARCHAR(3) NOT NULL DEFAULT ''OR''','SELECT 1') FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channels' AND COLUMN_NAME='match_mode'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=(SELECT IF(COUNT(*)=0,'ALTER TABLE radio_channels ADD COLUMN max_talk_ms INT UNSIGNED NOT NULL DEFAULT 25000','SELECT 1') FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channels' AND COLUMN_NAME='max_talk_ms'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql=(SELECT IF(COUNT(*)=0,'ALTER TABLE radio_channels ADD COLUMN priority INT NOT NULL DEFAULT 0','SELECT 1') FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channels' AND COLUMN_NAME='priority'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

CREATE TABLE IF NOT EXISTS radio_channel_regions (
 channel_id INT UNSIGNED NOT NULL, region_id INT NOT NULL, PRIMARY KEY(channel_id,region_id), KEY idx_radio_cr_region(region_id),
 CONSTRAINT fk_radio_cr_channel FOREIGN KEY(channel_id) REFERENCES radio_channels(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS radio_channel_users (
 channel_id INT UNSIGNED NOT NULL, user_id INT NOT NULL, PRIMARY KEY(channel_id,user_id), KEY idx_radio_cu_user(user_id),
 CONSTRAINT fk_radio_cu_channel FOREIGN KEY(channel_id) REFERENCES radio_channels(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS radio_channel_roles (
 channel_id INT UNSIGNED NOT NULL, role_id INT NOT NULL, PRIMARY KEY(channel_id,role_id), KEY idx_radio_crole_role(role_id),
 CONSTRAINT fk_radio_crole_channel FOREIGN KEY(channel_id) REFERENCES radio_channels(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS radio_presence (
 channel_id INT UNSIGNED NOT NULL, user_id INT NOT NULL, last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(channel_id,user_id), KEY idx_radio_presence_seen(channel_id,last_seen_at),
 CONSTRAINT fk_radio_presence_channel FOREIGN KEY(channel_id) REFERENCES radio_channels(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS radio_logs (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, channel_id INT UNSIGNED NULL, user_id INT NULL, event_type VARCHAR(40) NOT NULL, meta_json TEXT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(id), KEY idx_radio_logs_channel(channel_id,id), KEY idx_radio_logs_user(user_id,id),
 CONSTRAINT fk_radio_logs_channel FOREIGN KEY(channel_id) REFERENCES radio_channels(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

UPDATE radio_channels SET channel_type='custom',match_mode='OR',max_talk_ms=25000 WHERE channel_type IS NULL OR channel_type='';
