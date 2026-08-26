-- ===========================================================================
--  سامانه کنترل خطوط تاکسیرانی مشهد  —  Database Schema (PostgreSQL 14+)
--  این اسکیما بازتاب مستقیم فایل‌های اکسل ارسالی شماست.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1) سازمان و سلسله‌مراتب نیروها
-- ---------------------------------------------------------------------------

-- نقش‌ها با سطح دسترسی؛ عدد کوچک‌تر = اختیار بالاتر
CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    title       TEXT NOT NULL UNIQUE,      -- «مدیر کل»، «رییس اداره بازرسی» ...
    level       INT  NOT NULL,             -- 1=مدیرکل ... 7=اپراتور/ناظر خط
    is_admin    BOOLEAN NOT NULL DEFAULT FALSE
);

-- مناطق شهر/تاکسیرانی برای گروه‌بندی نیروها (درگ‌اند‌دراپ در وب)
CREATE TABLE zones (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    parent_id   INT REFERENCES zones(id) ON DELETE SET NULL
);

-- کاربران سامانه (همان «پرسنل»). username = کد ملی
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    username        TEXT NOT NULL UNIQUE,         -- کد ملی ۱۰ رقمی
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    password_hash   TEXT NOT NULL,                -- bcrypt
    role_id         INT NOT NULL REFERENCES roles(id),
    manager_id      INT REFERENCES users(id) ON DELETE SET NULL, -- چارت سازمانی
    zone_id         INT REFERENCES zones(id) ON DELETE SET NULL,
    phone           TEXT,
    rank_stars      INT CHECK (rank_stars IS NULL OR (rank_stars BETWEEN 0 AND 5)), -- درجه اختصاصی ستاره برای فرد
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    must_change_pw  BOOLEAN NOT NULL DEFAULT TRUE, -- رمز اولیه 123456
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- اتصال کاربر به یک دستگاه مجاز (نصب فقط روی یک موبایل)
CREATE TABLE user_devices (
    id              SERIAL PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id       TEXT NOT NULL,                -- اثرانگشت سخت‌افزاری دستگاه
    device_model    TEXT,
    bound_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at      TIMESTAMPTZ,                  -- مدیرکل با حذف، تعویض را مجاز می‌کند
    UNIQUE (user_id)                              -- هر کاربر یک دستگاه فعال
);

-- دسترسی نیروها به خطوط (نیروی اداری از وب تعریف می‌کند)
CREATE TABLE user_lines (
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    line_id     INT NOT NULL,                     -- REFERENCES lines(id)
    PRIMARY KEY (user_id, line_id)
);

-- ---------------------------------------------------------------------------
-- 2) خطوط، خودروها، رانندگان  (از فایل‌های جامع کاربران/خط/پروانه‌ها)
-- ---------------------------------------------------------------------------

CREATE TABLE lines (
    id              SERIAL PRIMARY KEY,
    code            TEXT UNIQUE,                  -- «کد» خط
    origin          TEXT,                         -- مبدا
    destination     TEXT,                         -- مقصد
    broker          TEXT,                         -- کارگزاری
    municipality_zone TEXT,
    taxi_zone       TEXT,
    type            TEXT,                         -- تیپ: گردشی/ویژه ...
    is_special      BOOLEAN,
    is_circular     BOOLEAN,
    status          TEXT
);

CREATE TABLE drivers (
    id                  SERIAL PRIMARY KEY,
    national_id         TEXT UNIQUE NOT NULL,     -- کد ملی
    first_name          TEXT,
    last_name           TEXT,
    father_name         TEXT,
    birth_date          TEXT,                     -- تاریخ شمسی (متن)
    gender              TEXT,
    mobile              TEXT,
    address             TEXT,
    smart_no            TEXT,                     -- شماره هوشمند
    -- پروانه تاکسیرانی
    taxi_lic_issue      TEXT,
    taxi_lic_expire     TEXT,
    taxi_lic_status     TEXT,
    -- پروانه بهره‌برداری
    operating_code      TEXT,                     -- کد بهره‌برداری
    op_lic_issue        TEXT,
    op_lic_expire       TEXT,
    op_lic_status       TEXT,
    driver_type         TEXT,                     -- اصلی/کمکی
    updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE vehicles (
    id              SERIAL PRIMARY KEY,
    plate           TEXT UNIQUE NOT NULL,         -- پلاک خودرو
    vin             TEXT,
    chassis         TEXT,
    engine          TEXT,
    model_name      TEXT,                         -- وسیله نقلیه
    model_year      TEXT,
    color           TEXT,
    fuel            TEXT,
    capacity        INT,
    line_id         INT REFERENCES lines(id),
    owner_national_id TEXT,                       -- کد ملی مالک
    ownership_type  TEXT
);

-- رابطه راننده ↔ خودرو ↔ شیفت (بهره‌بردار / کمکی صبح‌عصر‌شب)
CREATE TABLE vehicle_drivers (
    id          SERIAL PRIMARY KEY,
    vehicle_id  INT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id   INT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    role        TEXT NOT NULL,                    -- 'beneficiary' | 'assistant'
    shift       TEXT,                             -- 'morning'|'evening'|'night'|null
    line_code_in_line TEXT,                       -- کد تاکسیران در خط
    UNIQUE (vehicle_id, driver_id, shift)
);

-- ---------------------------------------------------------------------------
-- 3) آبونمان / فیش‌ها  (فایل گزارش پرداخت فیش — ~۱ میلیون رکورد)
-- ---------------------------------------------------------------------------

CREATE TABLE bills (
    id              SERIAL PRIMARY KEY,
    bill_id         TEXT,                         -- شناسه قبض
    pay_id          TEXT,                         -- شناسه پرداخت
    status          TEXT,                         -- پرداخت شده / در انتظار پرداخت
    reason          TEXT,                         -- بابت
    person_title    TEXT,                         -- عنوان شخص/شرکت
    national_id     TEXT,                         -- کد/شناسه ملی
    phone           TEXT,                         -- تلفن شخص/شرکت
    amount          BIGINT,                       -- مبلغ (ریال)
    pay_date        TEXT,
    plate           TEXT,
    operating_code  TEXT,
    line_text       TEXT,
    driver_id       INT REFERENCES drivers(id),   -- لینک‌شده پس از import
    vehicle_id      INT REFERENCES vehicles(id)
);
CREATE INDEX idx_bills_nid     ON bills(national_id);
CREATE INDEX idx_bills_plate   ON bills(plate);
CREATE INDEX idx_bills_status  ON bills(status);

-- لینک درگاه پرداخت شهرداری مشهد طبق فرمول شما ساخته می‌شود:
-- https://epay.mashhad.ir/CityUsers/OnLineBillPay.aspx?BillId={bill_id}&PayId={pay_id}&Cell={phone}

-- ---------------------------------------------------------------------------
-- 4) عملیات میدانی: حضور، چک‌لیست، تذکر، گزارش
-- ---------------------------------------------------------------------------

-- ثبت حضور راننده (هر ۵ دقیقه یک‌بار مجاز)
CREATE TABLE attendances (
    id          SERIAL PRIMARY KEY,
    driver_id   INT NOT NULL REFERENCES drivers(id),
    user_id     INT NOT NULL REFERENCES users(id),   -- ثبت‌کننده
    line_id     INT REFERENCES lines(id),
    lat         DOUBLE PRECISION,
    lng         DOUBLE PRECISION,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_att_driver_time ON attendances(driver_id, created_at);

-- قالب چک‌لیست (آیتم‌ها را مدیرکل از وب تعریف می‌کند)
CREATE TABLE checklist_templates (
    id      SERIAL PRIMARY KEY,
    title   TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);
CREATE TABLE checklist_items (
    id          SERIAL PRIMARY KEY,
    template_id INT NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
    label       TEXT NOT NULL,
    sort_order  INT DEFAULT 0
);
CREATE TABLE checklist_submissions (
    id          SERIAL PRIMARY KEY,
    template_id INT NOT NULL REFERENCES checklist_templates(id),
    driver_id   INT REFERENCES drivers(id),
    vehicle_id  INT REFERENCES vehicles(id),
    user_id     INT NOT NULL REFERENCES users(id),
    answers     JSONB NOT NULL,                  -- {item_id: 'ok'|'fail'|...}
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- موضوعات تذکر (قابل تعریف توسط مدیرکل)
CREATE TABLE notice_reasons (
    id      SERIAL PRIMARY KEY,
    title   TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);
CREATE TABLE notices (
    id          SERIAL PRIMARY KEY,
    driver_id   INT NOT NULL REFERENCES drivers(id),
    user_id     INT NOT NULL REFERENCES users(id),
    reason_id   INT REFERENCES notice_reasons(id),
    priority    TEXT NOT NULL,                   -- 'low'|'medium'|'high'
    body        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- گزارش‌ها با گردش سلسله‌مراتبی
CREATE TABLE reports (
    id          SERIAL PRIMARY KEY,
    sender_id   INT NOT NULL REFERENCES users(id),
    subject     TEXT,
    body        TEXT,
    status      TEXT NOT NULL DEFAULT 'sent',    -- sent|seen|answered|forwarded|closed
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE report_routes (              -- گردش/ارجاع/پاسخ
    id          SERIAL PRIMARY KEY,
    report_id   INT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    to_user_id  INT REFERENCES users(id),
    action      TEXT NOT NULL,                   -- forward|comment|reply
    note        TEXT,
    actor_id    INT NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 5) ردیابی موقعیت + لاگ امنیتی/فعالیت
-- ---------------------------------------------------------------------------

CREATE TABLE location_pings (
    id          BIGSERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id),
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL,            -- زمان واقعی روی دستگاه
    synced_at   TIMESTAMPTZ NOT NULL DEFAULT now() -- زمان رسیدن به سرور (آفلاین/آنلاین)
);
CREATE INDEX idx_ping_user_time ON location_pings(user_id, captured_at);

-- لاگ فعالیت + رویدادهای امنیتی (خاموش‌کردن GPS/اینترنت، تلاش با VPN ...)
CREATE TABLE activity_logs (
    id          BIGSERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(id),
    event       TEXT NOT NULL,   -- login|logout|gps_off|net_off|vpn_blocked|dev_options_blocked|...
    meta        JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- فرم‌های سفارشی مدیرکل و قالب چاپی گزارش‌ها
CREATE TABLE custom_forms (
    id      SERIAL PRIMARY KEY,
    title   TEXT NOT NULL,
    schema  JSONB NOT NULL,                      -- تعریف فیلدها
    is_active BOOLEAN DEFAULT TRUE
);
CREATE TABLE print_templates (
    id      SERIAL PRIMARY KEY,
    name    TEXT NOT NULL,
    html    TEXT NOT NULL                        -- قالب چاپ/PDF گزارش
);

-- ---------------------------------------------------------------------------
-- 6) تنظیمات سامانه (قابل ویرایش از پنل) + پرچم نصب
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
    key     TEXT PRIMARY KEY,
    value   JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- مقادیر پیش‌فرض (سمت‌های قابل‌تعریف، درگاه پرداخت، نام سازمان)
INSERT INTO app_settings(key, value) VALUES
  ('org_name', '"سازمان تاکسیرانی مشهد"'),
  ('site_title', '"سامانه مدیریت و نظارت تاکسیرانی"'),
  ('site_logo', '""'),
  ('deputy_name', '"اکبر فلاح"'),
  ('inspection_head', '"رضا معلم‌زاده"'),
  ('payment_base_url', '"https://epay.mashhad.ir/CityUsers/OnLineBillPay.aspx"'),
  ('attendance_cooldown_min', '5'),
  ('require_gps', 'true'),
  ('block_vpn', 'true'),
  ('block_dev_options', 'true')
ON CONFLICT (key) DO NOTHING;

-- پاسخ‌های فرم‌های سفارشی (تکمیل‌شده توسط نیروها)
CREATE TABLE IF NOT EXISTS form_submissions (
    id          SERIAL PRIMARY KEY,
    form_id     INT NOT NULL REFERENCES custom_forms(id),
    user_id     INT NOT NULL REFERENCES users(id),
    driver_id   INT REFERENCES drivers(id),
    answers     JSONB NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 7) نوتیفیکیشن و توکن‌های Push (هشدار انقضای پروانه و ...)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_tokens (
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT NOT NULL,
    platform    TEXT,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, token)
);

CREATE TABLE IF NOT EXISTS notifications (
    id          BIGSERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    body        TEXT,
    data        JSONB,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read, created_at DESC);

-- ---------------------------------------------------------------------------
-- 8) ثبت حضور مسئولین در خط (توسط اپراتور/ناظر خط)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS official_visits (
    id              SERIAL PRIMARY KEY,
    official_id     INT NOT NULL REFERENCES users(id),   -- مسئولِ حاضر در خط
    recorded_by     INT NOT NULL REFERENCES users(id),   -- ثبت‌کننده (اپراتور/ناظر)
    line_id         INT REFERENCES lines(id),
    note            TEXT,
    lat             DOUBLE PRECISION,
    lng             DOUBLE PRECISION,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_official_visits_official ON official_visits(official_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 10) محدودهٔ خطوط (ایستگاه‌ها) + پیام‌رسانی با رسید خواندن (PostgreSQL)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS geofences (
  id          SERIAL PRIMARY KEY,
  line_id     INT REFERENCES lines(id),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#0d7a5f',
  center_lat  DOUBLE PRECISION, center_lng DOUBLE PRECISION, radius_m INT,
  polygon     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS messages (
  id          SERIAL PRIMARY KEY,
  sender_id   INT NOT NULL REFERENCES users(id),
  title       TEXT,
  body        TEXT NOT NULL,
  target_type TEXT NOT NULL,
  zone_id     INT REFERENCES zones(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS message_recipients (
  message_id  INT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id     INT NOT NULL REFERENCES users(id),
  read_at     TIMESTAMPTZ,
  PRIMARY KEY (message_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_mr_user ON message_recipients(user_id, read_at);

-- Upgrade helper: per-user star rank and site branding defaults
ALTER TABLE users ADD COLUMN IF NOT EXISTS rank_stars INT CHECK (rank_stars IS NULL OR (rank_stars BETWEEN 0 AND 5));
INSERT INTO app_settings(key, value) VALUES
  ('site_title', '"سامانه مدیریت و نظارت تاکسیرانی"'),
  ('site_logo', '""'),
  ('org_logo', '""')
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- Performance indexes: سرعت گزارش حضور، شیفت، موقعیت زنده و لاگ‌ها
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_att_user_in_exit ON attendances(user_id, checkin_at, exit_at);
CREATE INDEX IF NOT EXISTS idx_att_user_created_exit ON attendances(user_id, created_at, exit_at);
CREATE INDEX IF NOT EXISTS idx_user_shifts_user_dates ON user_shifts(user_id, from_jdate, to_jdate);
CREATE INDEX IF NOT EXISTS idx_shift_days_shift_jdate ON shift_days(shift_id, jdate);
CREATE INDEX IF NOT EXISTS idx_presence_checks_user_date_slot ON presence_checks(user_id, slot_date, slot);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_event_created ON activity_logs(user_id, event, created_at);
CREATE INDEX IF NOT EXISTS idx_location_pings_user_captured ON location_pings(user_id, captured_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, is_read, created_at);

-- Phase 2: mobile crash reporting
CREATE TABLE IF NOT EXISTS mobile_crash_reports (
  id BIGSERIAL PRIMARY KEY,
  crash_id TEXT NOT NULL UNIQUE,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  created_at_client TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  type TEXT,
  fatal BOOLEAN NOT NULL DEFAULT false,
  message TEXT,
  error_name TEXT,
  stack TEXT,
  component_stack TEXT,
  route TEXT,
  last_api JSONB,
  app_version TEXT,
  build_version TEXT,
  android_version TEXT,
  platform TEXT,
  device_name TEXT,
  device_model TEXT,
  manufacturer TEXT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_mobile_crash_reports_received ON mobile_crash_reports(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_mobile_crash_reports_user ON mobile_crash_reports(user_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_mobile_crash_reports_signature ON mobile_crash_reports(error_name, message);

-- V181 / Phase 3: multi-signal VPN monitoring (PostgreSQL)
CREATE TABLE IF NOT EXISTS vpn_status_reports (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vpn_on BOOLEAN NOT NULL DEFAULT FALSE,
  event TEXT NOT NULL DEFAULT 'vpn_heartbeat',
  detected_by JSONB,
  tunnel_interfaces JSONB,
  dns_servers JSONB,
  network_type TEXT,
  client_public_ip TEXT,
  server_ip TEXT,
  ip_country VARCHAR(4),
  sdk_int INT,
  checked_at TIMESTAMPTZ NOT NULL,
  duration_seconds INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vpn_reports_user_checked ON vpn_status_reports(user_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_vpn_reports_state_checked ON vpn_status_reports(vpn_on, checked_at DESC);

-- v182 / Phase 4: Mobile device health monitor
CREATE TABLE IF NOT EXISTS mobile_device_health (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  device_key VARCHAR(191) NOT NULL,
  app_version VARCHAR(40) NULL,
  build_version VARCHAR(40) NULL,
  android_sdk INT NULL,
  manufacturer VARCHAR(100) NULL,
  model_name VARCHAR(150) NULL,
  device_name VARCHAR(150) NULL,
  app_state VARCHAR(30) NULL,
  reason VARCHAR(40) NULL,
  battery_level SMALLINT NULL,
  battery_state SMALLINT NULL,
  low_power_mode TINYINT(1) NOT NULL DEFAULT 0,
  network_connected TINYINT(1) NOT NULL DEFAULT 0,
  internet_reachable TINYINT(1) NOT NULL DEFAULT 0,
  network_type VARCHAR(40) NULL,
  local_ip VARCHAR(64) NULL,
  total_memory_bytes BIGINT NULL,
  free_disk_bytes BIGINT NULL,
  total_disk_bytes BIGINT NULL,
  api_ok TINYINT(1) NOT NULL DEFAULT 0,
  api_latency_ms INT NULL,
  api_status INT NULL,
  monitor_uptime_seconds INT NULL,
  captured_at DATETIME NOT NULL,
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  raw_payload JSON NULL,
  UNIQUE KEY uq_mdh_user_device_time(user_id,device_key,captured_at),
  INDEX idx_mdh_user_time(user_id,captured_at),
  INDEX idx_mdh_health(api_ok,network_connected,captured_at),
  INDEX idx_mdh_version(app_version,android_sdk,captured_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS mobile_device_health_latest (
  user_id BIGINT NOT NULL,
  device_key VARCHAR(191) NOT NULL,
  health_id BIGINT NULL,
  app_version VARCHAR(40) NULL,
  android_sdk INT NULL,
  manufacturer VARCHAR(100) NULL,
  model_name VARCHAR(150) NULL,
  battery_level SMALLINT NULL,
  free_disk_bytes BIGINT NULL,
  api_ok TINYINT(1) NOT NULL DEFAULT 0,
  api_latency_ms INT NULL,
  network_connected TINYINT(1) NOT NULL DEFAULT 0,
  internet_reachable TINYINT(1) NOT NULL DEFAULT 0,
  app_state VARCHAR(30) NULL,
  captured_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id,device_key),
  INDEX idx_mdhl_time(captured_at),
  INDEX idx_mdhl_alert(api_ok,network_connected,battery_level,captured_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
