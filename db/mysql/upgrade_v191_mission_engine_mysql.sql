-- v191 Mission Engine - MySQL/MariaDB compatible
-- قابل اجرا در phpMyAdmin و قابل اجرای مجدد
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS mission_metric_catalog (
  metric_key VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  unit VARCHAR(30) NOT NULL DEFAULT 'percent',
  applicable_roles LONGTEXT NULL,
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (metric_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mission_templates (
  id BIGINT NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  role_key VARCHAR(100) NOT NULL,
  period VARCHAR(20) NOT NULL DEFAULT 'daily',
  zone_id INT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  effective_from DATE NULL,
  effective_to DATE NULL,
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_mission_templates_role_period (role_key, period, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mission_template_targets (
  id BIGINT NOT NULL AUTO_INCREMENT,
  template_id BIGINT NOT NULL,
  metric_key VARCHAR(100) NOT NULL,
  target_percent DECIMAL(6,2) NOT NULL DEFAULT 0,
  weight DECIMAL(8,2) NOT NULL DEFAULT 1,
  is_required TINYINT(1) NOT NULL DEFAULT 1,
  minimum_count INT NULL,
  config LONGTEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_mission_template_metric (template_id, metric_key),
  KEY idx_mtt_template (template_id),
  KEY idx_mtt_metric (metric_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_mission_overrides (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  period VARCHAR(20) NOT NULL DEFAULT 'daily',
  title VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  effective_from DATE NULL,
  effective_to DATE NULL,
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_mission_period (user_id, period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_mission_override_targets (
  id BIGINT NOT NULL AUTO_INCREMENT,
  override_id BIGINT NOT NULL,
  metric_key VARCHAR(100) NOT NULL,
  target_percent DECIMAL(6,2) NOT NULL DEFAULT 0,
  weight DECIMAL(8,2) NOT NULL DEFAULT 1,
  is_required TINYINT(1) NOT NULL DEFAULT 1,
  minimum_count INT NULL,
  config LONGTEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_override_metric (override_id, metric_key),
  KEY idx_umot_override (override_id),
  KEY idx_umot_metric (metric_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO mission_metric_catalog
(metric_key,title,unit,applicable_roles,description,is_active,sort_order) VALUES
('driver_attendance_percent','ثبت حضور رانندگان','percent','["line_supervisor","motor_patrol","vehicle_patrol","resident_inspector"]','درصد خودرو/رانندگان هدف که حضور آنان ثبت شده است',1,10),
('vehicle_checklist_percent','تکمیل چک‌لیست خودروها','percent','["line_supervisor","motor_patrol","vehicle_patrol","resident_inspector"]','درصد خودروهای حاضر که چک‌لیست کامل دارند',1,20),
('expired_notice_percent','تذکر اعتبارات منقضی','percent','["line_supervisor","motor_patrol","vehicle_patrol","resident_inspector"]','درصد رانندگان حاضر دارای اعتبار منقضی که تذکر گرفته‌اند',1,30),
('subscription_debt_notice_percent','تذکر بدهی آبونمان','percent','["line_supervisor","motor_patrol","vehicle_patrol","resident_inspector"]','درصد بدهکاران آبونمان حاضر که تذکر گرفته‌اند',1,40),
('assigned_lines_visit_percent','بازدید خطوط تخصیص‌یافته','percent','["motor_patrol","vehicle_patrol","chief_inspector"]','درصد خطوط تخصیص‌یافته که بازدید معتبر شده‌اند',1,50),
('subordinate_review_percent','بررسی عملکرد نیروهای زیرمجموعه','percent','["vehicle_patrol","resident_inspector","chief_inspector"]','درصد نیروهای زیرمجموعه که عملکرد روزانه آنان بررسی شده است',1,60),
('station_visit_percent','بازدید ایستگاه‌ها و پایانه‌ها','percent','["line_supervisor","motor_patrol","vehicle_patrol","resident_inspector"]','درصد ایستگاه‌ها و پایانه‌های هدف که بازدید شده‌اند',1,70),
('end_shift_report','گزارش پایان شیفت','percent','["line_supervisor","motor_patrol","vehicle_patrol","resident_inspector","chief_inspector"]','ثبت گزارش پایان شیفت؛ صفر یا صد درصد',1,80)
ON DUPLICATE KEY UPDATE
 title=VALUES(title), unit=VALUES(unit), applicable_roles=VALUES(applicable_roles),
 description=VALUES(description), is_active=VALUES(is_active), sort_order=VALUES(sort_order);

-- الگوی روزانه ناظر خط
INSERT INTO mission_templates(title,role_key,period,is_default,is_active)
SELECT 'الگوی روزانه ناظر خط','line_supervisor','daily',1,1
WHERE NOT EXISTS (SELECT 1 FROM mission_templates WHERE role_key='line_supervisor' AND period='daily' AND is_default=1);
SET @tpl_line_supervisor := (SELECT id FROM mission_templates WHERE role_key='line_supervisor' AND period='daily' AND is_default=1 ORDER BY id LIMIT 1);
INSERT INTO mission_template_targets(template_id,metric_key,target_percent,weight,is_required,config) VALUES
(@tpl_line_supervisor,'driver_attendance_percent',80,1,1,'{}'),
(@tpl_line_supervisor,'vehicle_checklist_percent',30,1.5,1,'{}'),
(@tpl_line_supervisor,'expired_notice_percent',100,2,1,'{}'),
(@tpl_line_supervisor,'subscription_debt_notice_percent',100,2,1,'{}'),
(@tpl_line_supervisor,'end_shift_report',100,1,1,'{}')
ON DUPLICATE KEY UPDATE target_percent=VALUES(target_percent),weight=VALUES(weight),is_required=VALUES(is_required);

-- الگوی روزانه گشت موتوری
INSERT INTO mission_templates(title,role_key,period,is_default,is_active)
SELECT 'الگوی روزانه گشت موتوری','motor_patrol','daily',1,1
WHERE NOT EXISTS (SELECT 1 FROM mission_templates WHERE role_key='motor_patrol' AND period='daily' AND is_default=1);
SET @tpl_motor := (SELECT id FROM mission_templates WHERE role_key='motor_patrol' AND period='daily' AND is_default=1 ORDER BY id LIMIT 1);
INSERT INTO mission_template_targets(template_id,metric_key,target_percent,weight,is_required,config) VALUES
(@tpl_motor,'assigned_lines_visit_percent',70,2,1,'{}'),
(@tpl_motor,'driver_attendance_percent',40,1,1,'{}'),
(@tpl_motor,'vehicle_checklist_percent',25,1.5,1,'{}'),
(@tpl_motor,'expired_notice_percent',100,2,1,'{}'),
(@tpl_motor,'subscription_debt_notice_percent',100,2,1,'{}'),
(@tpl_motor,'station_visit_percent',70,1,1,'{}'),
(@tpl_motor,'end_shift_report',100,1,1,'{}')
ON DUPLICATE KEY UPDATE target_percent=VALUES(target_percent),weight=VALUES(weight),is_required=VALUES(is_required);

-- الگوی روزانه گشت خودرویی
INSERT INTO mission_templates(title,role_key,period,is_default,is_active)
SELECT 'الگوی روزانه بازرس گشت خودرویی','vehicle_patrol','daily',1,1
WHERE NOT EXISTS (SELECT 1 FROM mission_templates WHERE role_key='vehicle_patrol' AND period='daily' AND is_default=1);
SET @tpl_vehicle := (SELECT id FROM mission_templates WHERE role_key='vehicle_patrol' AND period='daily' AND is_default=1 ORDER BY id LIMIT 1);
INSERT INTO mission_template_targets(template_id,metric_key,target_percent,weight,is_required,config) VALUES
(@tpl_vehicle,'assigned_lines_visit_percent',70,2,1,'{}'),
(@tpl_vehicle,'driver_attendance_percent',35,1,1,'{}'),
(@tpl_vehicle,'vehicle_checklist_percent',25,1.5,1,'{}'),
(@tpl_vehicle,'expired_notice_percent',100,2,1,'{}'),
(@tpl_vehicle,'subscription_debt_notice_percent',100,2,1,'{}'),
(@tpl_vehicle,'subordinate_review_percent',50,2,1,'{}'),
(@tpl_vehicle,'end_shift_report',100,1,1,'{}')
ON DUPLICATE KEY UPDATE target_percent=VALUES(target_percent),weight=VALUES(weight),is_required=VALUES(is_required);

-- الگوی روزانه بازرس مقیم
INSERT INTO mission_templates(title,role_key,period,is_default,is_active)
SELECT 'الگوی روزانه بازرس مقیم','resident_inspector','daily',1,1
WHERE NOT EXISTS (SELECT 1 FROM mission_templates WHERE role_key='resident_inspector' AND period='daily' AND is_default=1);
SET @tpl_resident := (SELECT id FROM mission_templates WHERE role_key='resident_inspector' AND period='daily' AND is_default=1 ORDER BY id LIMIT 1);
INSERT INTO mission_template_targets(template_id,metric_key,target_percent,weight,is_required,config) VALUES
(@tpl_resident,'driver_attendance_percent',80,1,1,'{}'),
(@tpl_resident,'vehicle_checklist_percent',30,1.5,1,'{}'),
(@tpl_resident,'expired_notice_percent',100,2,1,'{}'),
(@tpl_resident,'subscription_debt_notice_percent',100,2,1,'{}'),
(@tpl_resident,'subordinate_review_percent',100,2,1,'{}'),
(@tpl_resident,'end_shift_report',100,1,1,'{}')
ON DUPLICATE KEY UPDATE target_percent=VALUES(target_percent),weight=VALUES(weight),is_required=VALUES(is_required);

-- الگوی روزانه سربازرس
INSERT INTO mission_templates(title,role_key,period,is_default,is_active)
SELECT 'الگوی روزانه سربازرس','chief_inspector','daily',1,1
WHERE NOT EXISTS (SELECT 1 FROM mission_templates WHERE role_key='chief_inspector' AND period='daily' AND is_default=1);
SET @tpl_chief := (SELECT id FROM mission_templates WHERE role_key='chief_inspector' AND period='daily' AND is_default=1 ORDER BY id LIMIT 1);
INSERT INTO mission_template_targets(template_id,metric_key,target_percent,weight,is_required,config) VALUES
(@tpl_chief,'assigned_lines_visit_percent',30,1,1,'{}'),
(@tpl_chief,'subordinate_review_percent',60,3,1,'{}'),
(@tpl_chief,'end_shift_report',100,1,1,'{}')
ON DUPLICATE KEY UPDATE target_percent=VALUES(target_percent),weight=VALUES(weight),is_required=VALUES(is_required);

SET FOREIGN_KEY_CHECKS = 1;
