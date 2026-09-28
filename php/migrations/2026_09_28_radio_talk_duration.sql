-- Radio: backend-configured minimum/maximum talk duration.
-- Defaults: minimum 1.5s, maximum 25s. Values are per channel.
SET @db=DATABASE();
SET @sql=(SELECT IF(COUNT(*)=0,'ALTER TABLE radio_channels ADD COLUMN min_talk_ms INT UNSIGNED NOT NULL DEFAULT 1500','SELECT 1') FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='radio_channels' AND COLUMN_NAME='min_talk_ms'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
UPDATE radio_channels SET min_talk_ms=1500 WHERE min_talk_ms IS NULL OR min_talk_ms<1500;
UPDATE radio_channels SET max_talk_ms=25000 WHERE max_talk_ms IS NULL OR max_talk_ms<min_talk_ms;
