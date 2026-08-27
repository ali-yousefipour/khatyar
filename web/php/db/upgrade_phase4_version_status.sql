-- Phase 4 upgrade: version baseline 1.0.1 and project status settings
-- Safe for MySQL/MariaDB.
INSERT INTO app_settings(`key`,`value`) VALUES
('site_version','89'),
('app_version','1.0.1'),
('app_latest_version','1.0.1'),
('app_min_version','1.0.1'),
('project_phase','4'),
('project_release_name','Phase 4 - Project Status & Version Baseline')
ON DUPLICATE KEY UPDATE value=VALUES(value);
