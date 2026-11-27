-- Khatyar: verified historical service location per substitute assignment, day and shift segment.
-- No backfill from today's user_lines: unknown historical locations remain unknown.
-- Apply before enabling the administrative location correction endpoint.
CREATE TABLE IF NOT EXISTS substitute_shift_service_snapshots (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT NOT NULL,
  jdate VARCHAR(10) NOT NULL,
  segment_index SMALLINT UNSIGNED NOT NULL,
  line_id INT NOT NULL,
  line_name VARCHAR(190) NOT NULL,
  service_location VARCHAR(255) NOT NULL,
  recorded_by INT NOT NULL,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_substitute_service_day_segment (assignment_id,jdate,segment_index),
  KEY idx_substitute_service_date (jdate,line_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS substitute_shift_service_audit (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT NOT NULL,
  jdate VARCHAR(10) NOT NULL,
  segment_index SMALLINT UNSIGNED NOT NULL,
  actor_id INT NOT NULL,
  previous_json TEXT NULL,
  next_json TEXT NOT NULL,
  reason VARCHAR(500) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_substitute_service_audit (assignment_id,jdate,segment_index,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
