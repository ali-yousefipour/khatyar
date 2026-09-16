-- KhatYar: integrity/repair for temporary substitute leave assignments.
-- MySQL/MariaDB compatible. Safe to run more than once.

CREATE TABLE IF NOT EXISTS substitute_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  substitute_user_id INT NOT NULL,
  request_id INT NOT NULL,
  absent_user_id INT NOT NULL,
  from_date VARCHAR(10) NOT NULL,
  to_date VARCHAR(10) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sub_user (substitute_user_id),
  INDEX idx_sub_dates (from_date, to_date),
  INDEX idx_sub_request (request_id),
  INDEX idx_sub_absent (absent_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Normalize legacy rows so YYYY/MM/DD and YYYY-MM-DD cannot break date matching.
UPDATE substitute_assignments
SET from_date=REPLACE(TRIM(from_date),'/','-'),
    to_date=REPLACE(TRIM(to_date),'/','-')
WHERE from_date LIKE '%/%' OR to_date LIKE '%/%';

-- Rebuild missing assignments for already-approved leave requests.
-- This intentionally does NOT create user_shifts rows: the normal permanent shift
-- assignment remains untouched and _active_user_shift_assignment() resolves the
-- temporary substitute shift only inside the approved leave interval.
INSERT INTO substitute_assignments
  (substitute_user_id, request_id, absent_user_id, from_date, to_date, status)
SELECT
  CAST(r.substitute_user_id AS UNSIGNED),
  r.id,
  r.user_id,
  REPLACE(TRIM(COALESCE(NULLIF(r.from_jdate,''),NULLIF(r.the_date,''))),'/','-'),
  REPLACE(TRIM(COALESCE(NULLIF(r.to_jdate,''),NULLIF(r.the_date,''),NULLIF(r.from_jdate,''))),'/','-'),
  'active'
FROM requests r
WHERE r.status='approved'
  AND r.substitute_user_id IS NOT NULL
  AND CAST(r.substitute_user_id AS UNSIGNED)>0
  AND COALESCE(NULLIF(r.from_jdate,''),NULLIF(r.the_date,'')) IS NOT NULL
  AND COALESCE(NULLIF(r.to_jdate,''),NULLIF(r.the_date,''),NULLIF(r.from_jdate,'')) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM substitute_assignments sa
    WHERE sa.request_id=r.id AND sa.status='active'
  );

-- Future inserts/updates are normalized at the database boundary as well.
DROP TRIGGER IF EXISTS trg_substitute_assignments_bi;
CREATE TRIGGER trg_substitute_assignments_bi
BEFORE INSERT ON substitute_assignments
FOR EACH ROW
SET NEW.from_date=REPLACE(TRIM(NEW.from_date),'/','-'),
    NEW.to_date=REPLACE(TRIM(NEW.to_date),'/','-');

DROP TRIGGER IF EXISTS trg_substitute_assignments_bu;
CREATE TRIGGER trg_substitute_assignments_bu
BEFORE UPDATE ON substitute_assignments
FOR EACH ROW
SET NEW.from_date=REPLACE(TRIM(NEW.from_date),'/','-'),
    NEW.to_date=REPLACE(TRIM(NEW.to_date),'/','-');
