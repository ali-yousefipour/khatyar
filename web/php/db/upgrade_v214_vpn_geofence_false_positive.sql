-- v214 - کاهش هشدار کاذب VPN و خروج از محدوده
-- MySQL 5.7+/MariaDB، قابل اجرا در phpMyAdmin

SET @db := DATABASE();

SET @q := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='location_pings' AND COLUMN_NAME='accuracy_m')=0,
  'ALTER TABLE location_pings ADD COLUMN accuracy_m DECIMAL(10,2) NULL AFTER via_gsm', 'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

SET @q := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='location_pings' AND COLUMN_NAME='provider')=0,
  'ALTER TABLE location_pings ADD COLUMN provider VARCHAR(20) NULL AFTER accuracy_m', 'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

SET @q := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='user_station_state' AND COLUMN_NAME='outside_count')=0,
  'ALTER TABLE user_station_state ADD COLUMN outside_count INT NOT NULL DEFAULT 0 AFTER line_id', 'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

SET @q := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='user_station_state' AND COLUMN_NAME='last_outside_at')=0,
  'ALTER TABLE user_station_state ADD COLUMN last_outside_at DATETIME NULL AFTER outside_count', 'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

INSERT INTO app_settings (`key`,`value`) VALUES
('geofence_exit_buffer_m','50'),
('geofence_exit_confirmations','3')
ON DUPLICATE KEY UPDATE `value`=`value`;
