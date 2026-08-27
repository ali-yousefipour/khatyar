-- v213 - MySQL/MariaDB / phpMyAdmin compatible
-- Setting is stored in app_settings; this script is safe to run repeatedly.
INSERT INTO app_settings (`key`, `value`)
VALUES ('disable_driver_attendance_for_nobat_lines', 'false')
ON DUPLICATE KEY UPDATE `key`=VALUES(`key`);
