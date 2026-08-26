BEGIN;


CREATE TABLE IF NOT EXISTS inspector_modes (
  user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'auto' CHECK(mode IN ('auto','resident_inspector','vehicle_patrol','motor_patrol')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by INT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subordinate_daily_reviews (
  id BIGSERIAL PRIMARY KEY,
  reviewer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  review_date DATE NOT NULL,
  line_id INT REFERENCES lines(id) ON DELETE SET NULL,
  attendance_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  checklist_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  notice_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  coverage_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  quality_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  total_score NUMERIC(7,2) NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sdr_daily ON subordinate_daily_reviews(reviewer_id,subject_user_id,review_date);

CREATE TABLE IF NOT EXISTS mission_visit_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  line_id INT NOT NULL REFERENCES lines(id) ON DELETE CASCADE,
  role_mode TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  start_lat DOUBLE PRECISION,
  start_lng DOUBLE PRECISION,
  finish_lat DOUBLE PRECISION,
  finish_lng DOUBLE PRECISION,
  start_photo_data TEXT,
  finish_photo_data TEXT,
  report_text TEXT,
  actual_present_count INT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress','submitted','cancelled')),
  validated BOOLEAN NOT NULL DEFAULT FALSE,
  validation_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  validation_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mvs_user_day ON mission_visit_sessions(user_id,started_at);
CREATE INDEX IF NOT EXISTS idx_mvs_line_day ON mission_visit_sessions(line_id,started_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_mvs_open_user_line ON mission_visit_sessions(user_id,line_id) WHERE status='in_progress';

CREATE TABLE IF NOT EXISTS mission_daily_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  progress_date DATE NOT NULL,
  role_key TEXT NOT NULL,
  mission_source TEXT,
  mission_id BIGINT,
  assigned_lines_count INT NOT NULL DEFAULT 0,
  visited_lines_count INT NOT NULL DEFAULT 0,
  validated_lines_count INT NOT NULL DEFAULT 0,
  target_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  actual_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  progress_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  weighted_achievement NUMERIC(7,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id,progress_date)
);
CREATE INDEX IF NOT EXISTS idx_mdp_date_role ON mission_daily_progress(progress_date,role_key);

CREATE TABLE IF NOT EXISTS mission_timeline_events (
  id BIGSERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  line_id INT REFERENCES lines(id) ON DELETE SET NULL,
  visit_session_id BIGINT REFERENCES mission_visit_sessions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  target_type TEXT,
  target_id BIGINT,
  title TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mte_user_day ON mission_timeline_events(user_id,occurred_at);
CREATE INDEX IF NOT EXISTS idx_mte_line_day ON mission_timeline_events(line_id,occurred_at);

CREATE TABLE IF NOT EXISTS mission_execution_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT,
  updated_by INT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO mission_execution_settings(setting_key,setting_value) VALUES
('visit_min_duration_minutes','10'),
('visit_min_checked_percent','5'),
('visit_require_start_photo','false'),
('visit_require_finish_photo','true'),
('visit_require_end_report','true'),
('visit_geo_extra_radius_m','75'),
('visit_photo_width','1280'),
('visit_photo_quality','70')
ON CONFLICT(setting_key) DO NOTHING;

COMMIT;
