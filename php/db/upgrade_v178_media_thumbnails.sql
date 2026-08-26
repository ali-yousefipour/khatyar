-- v178 media and report thumbnails
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='report_attachments' AND COLUMN_NAME='thumbnail_path');
SET @q := IF(@c=0,'ALTER TABLE report_attachments ADD COLUMN thumbnail_path VARCHAR(255) NULL AFTER file_path','SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
INSERT INTO app_settings(`key`,value) VALUES ('image_max_height','1920'),('thumbnail_size','320'),('thumbnail_quality','70') ON DUPLICATE KEY UPDATE value=value;
