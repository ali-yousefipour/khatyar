-- Durable dashboard cache, isolated by authorized management scope.
CREATE TABLE IF NOT EXISTS dashboard_discipline_cache (
  scope_key VARCHAR(40) NOT NULL, slot VARCHAR(80) NOT NULL,
  from_g DATE NULL, to_g DATE NULL, payload LONGTEXT NULL,
  generated_at BIGINT UNSIGNED NOT NULL DEFAULT 0,
  started_at BIGINT UNSIGNED NOT NULL DEFAULT 0, job_json LONGTEXT NULL,
  PRIMARY KEY(scope_key,slot)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
