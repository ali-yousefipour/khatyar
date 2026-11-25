-- Safe, rerunnable schema change for historical and new school complaints.
-- Apply before deploying the matching PHP/JS code.
SET @sc_schema := DATABASE();
SET @sc_has_reception := (
 SELECT COUNT(*) FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = @sc_schema AND TABLE_NAME = 'school_complaints' AND COLUMN_NAME = 'reception_type'
);
SET @sc_ddl := IF(@sc_has_reception = 0,
 'ALTER TABLE school_complaints ADD COLUMN reception_type VARCHAR(16) NULL DEFAULT NULL COMMENT ''phone / in_person; NULL for undocumented historical records''',
 'SELECT ''reception_type already exists'' AS migration_status');
PREPARE sc_statement FROM @sc_ddl;
EXECUTE sc_statement;
DEALLOCATE PREPARE sc_statement;
-- Do not infer a reception channel for historical complaints.
-- received_at and created_at are intentionally untouched.

CREATE TABLE IF NOT EXISTS school_complaint_reception_audit (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 complaint_id BIGINT NOT NULL,
 actor_id BIGINT NOT NULL,
 old_reception_type VARCHAR(16) NULL,
 new_reception_type VARCHAR(16) NULL,
 old_received_at DATETIME NOT NULL,
 new_received_at DATETIME NOT NULL,
 changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_sc_reception_audit_case (complaint_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
