BEGIN;

CREATE TABLE IF NOT EXISTS mission_metric_catalog (
  metric_key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'percent',
  applicable_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mission_templates (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  role_key TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT 'daily' CHECK (period IN ('daily','weekly','monthly')),
  zone_id INT NULL,
  is_default BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from DATE NULL,
  effective_to DATE NULL,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mission_templates_role_period ON mission_templates(role_key,period,is_active);

CREATE TABLE IF NOT EXISTS mission_template_targets (
  id BIGSERIAL PRIMARY KEY,
  template_id BIGINT NOT NULL REFERENCES mission_templates(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL REFERENCES mission_metric_catalog(metric_key),
  target_percent NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (target_percent >= 0 AND target_percent <= 100),
  weight NUMERIC(8,2) NOT NULL DEFAULT 1 CHECK (weight >= 0),
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  minimum_count INT NULL CHECK (minimum_count IS NULL OR minimum_count >= 0),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(template_id,metric_key)
);

CREATE TABLE IF NOT EXISTS user_mission_overrides (
  id BIGSERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period TEXT NOT NULL DEFAULT 'daily' CHECK (period IN ('daily','weekly','monthly')),
  title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from DATE NULL,
  effective_to DATE NULL,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id,period)
);

CREATE TABLE IF NOT EXISTS user_mission_override_targets (
  id BIGSERIAL PRIMARY KEY,
  override_id BIGINT NOT NULL REFERENCES user_mission_overrides(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL REFERENCES mission_metric_catalog(metric_key),
  target_percent NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (target_percent >= 0 AND target_percent <= 100),
  weight NUMERIC(8,2) NOT NULL DEFAULT 1 CHECK (weight >= 0),
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  minimum_count INT NULL CHECK (minimum_count IS NULL OR minimum_count >= 0),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(override_id,metric_key)
);

INSERT INTO mission_metric_catalog(metric_key,title,unit,applicable_roles,description,sort_order) VALUES
('driver_attendance_percent','ثبت حضور رانندگان','percent','["line_supervisor","motor_patrol","vehicle_patrol","resident_inspector"]','درصد خودرو/رانندگان هدف که حضور آنان ثبت شده است',10),
('vehicle_checklist_percent','تکمیل چک‌لیست خودروها','percent','["line_supervisor","motor_patrol","vehicle_patrol","resident_inspector"]','درصد خودروهای حاضر که چک‌لیست کامل دارند',20),
('expired_notice_percent','تذکر اعتبارات منقضی','percent','["line_supervisor","motor_patrol","vehicle_patrol","resident_inspector"]','درصد رانندگان حاضر دارای اعتبار منقضی که تذکر گرفته‌اند',30),
('subscription_debt_notice_percent','تذکر بدهی آبونمان','percent','["line_supervisor","motor_patrol","vehicle_patrol","resident_inspector"]','درصد بدهکاران آبونمان حاضر که تذکر گرفته‌اند',40),
('assigned_lines_visit_percent','بازدید خطوط تخصیص‌یافته','percent','["motor_patrol","vehicle_patrol","chief_inspector"]','درصد خطوط تخصیص‌یافته که بازدید معتبر شده‌اند',50),
('subordinate_review_percent','بررسی عملکرد نیروهای زیرمجموعه','percent','["vehicle_patrol","resident_inspector","chief_inspector"]','درصد نیروهای زیرمجموعه که عملکرد روزانه آنان بررسی شده است',60),
('station_visit_percent','بازدید ایستگاه‌ها و پایانه‌ها','percent','["line_supervisor","motor_patrol","vehicle_patrol","resident_inspector"]','درصد ایستگاه‌ها و پایانه‌های هدف که بازدید شده‌اند',70),
('end_shift_report','گزارش پایان شیفت','percent','["line_supervisor","motor_patrol","vehicle_patrol","resident_inspector","chief_inspector"]','ثبت گزارش پایان شیفت؛ صفر یا صد درصد',80)
ON CONFLICT(metric_key) DO UPDATE SET title=EXCLUDED.title, applicable_roles=EXCLUDED.applicable_roles, description=EXCLUDED.description, sort_order=EXCLUDED.sort_order;

COMMIT;

-- الگوهای اولیه؛ مدیر می‌تواند در پنل آن‌ها را حذف، جایگزین یا برای هر کاربر Override کند.
DO $$
DECLARE tpl BIGINT;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM mission_templates WHERE role_key='line_supervisor' AND period='daily' AND is_default) THEN
  INSERT INTO mission_templates(title,role_key,period,is_default) VALUES('الگوی روزانه ناظر خط','line_supervisor','daily',TRUE) RETURNING id INTO tpl;
  INSERT INTO mission_template_targets(template_id,metric_key,target_percent,weight) VALUES
   (tpl,'driver_attendance_percent',80,1),(tpl,'vehicle_checklist_percent',30,1.5),(tpl,'expired_notice_percent',100,2),(tpl,'subscription_debt_notice_percent',100,2),(tpl,'end_shift_report',100,1);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM mission_templates WHERE role_key='motor_patrol' AND period='daily' AND is_default) THEN
  INSERT INTO mission_templates(title,role_key,period,is_default) VALUES('الگوی روزانه گشت موتوری','motor_patrol','daily',TRUE) RETURNING id INTO tpl;
  INSERT INTO mission_template_targets(template_id,metric_key,target_percent,weight) VALUES
   (tpl,'assigned_lines_visit_percent',70,2),(tpl,'driver_attendance_percent',40,1),(tpl,'vehicle_checklist_percent',25,1.5),(tpl,'expired_notice_percent',100,2),(tpl,'subscription_debt_notice_percent',100,2),(tpl,'station_visit_percent',70,1),(tpl,'end_shift_report',100,1);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM mission_templates WHERE role_key='vehicle_patrol' AND period='daily' AND is_default) THEN
  INSERT INTO mission_templates(title,role_key,period,is_default) VALUES('الگوی روزانه بازرس گشت خودرویی','vehicle_patrol','daily',TRUE) RETURNING id INTO tpl;
  INSERT INTO mission_template_targets(template_id,metric_key,target_percent,weight) VALUES
   (tpl,'assigned_lines_visit_percent',70,2),(tpl,'driver_attendance_percent',35,1),(tpl,'vehicle_checklist_percent',25,1.5),(tpl,'expired_notice_percent',100,2),(tpl,'subscription_debt_notice_percent',100,2),(tpl,'subordinate_review_percent',50,2),(tpl,'end_shift_report',100,1);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM mission_templates WHERE role_key='resident_inspector' AND period='daily' AND is_default) THEN
  INSERT INTO mission_templates(title,role_key,period,is_default) VALUES('الگوی روزانه بازرس مقیم','resident_inspector','daily',TRUE) RETURNING id INTO tpl;
  INSERT INTO mission_template_targets(template_id,metric_key,target_percent,weight) VALUES
   (tpl,'driver_attendance_percent',80,1),(tpl,'vehicle_checklist_percent',30,1.5),(tpl,'expired_notice_percent',100,2),(tpl,'subscription_debt_notice_percent',100,2),(tpl,'subordinate_review_percent',100,2),(tpl,'end_shift_report',100,1);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM mission_templates WHERE role_key='chief_inspector' AND period='daily' AND is_default) THEN
  INSERT INTO mission_templates(title,role_key,period,is_default) VALUES('الگوی روزانه سربازرس','chief_inspector','daily',TRUE) RETURNING id INTO tpl;
  INSERT INTO mission_template_targets(template_id,metric_key,target_percent,weight) VALUES
   (tpl,'assigned_lines_visit_percent',30,1),(tpl,'subordinate_review_percent',60,3),(tpl,'end_shift_report',100,1);
 END IF;
END $$;
