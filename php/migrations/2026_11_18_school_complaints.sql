CREATE TABLE IF NOT EXISTS school_complaint_settings (
 id INT PRIMARY KEY, config JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS school_complaints (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 tracking_code VARCHAR(40) NOT NULL UNIQUE,
 complainant_type ENUM('parent','driver') NOT NULL,
 first_name VARCHAR(100) NOT NULL,last_name VARCHAR(100) NOT NULL,
 phone VARCHAR(30) NOT NULL,address VARCHAR(700) NULL,
 school_id INT NOT NULL,company_id INT NOT NULL,
 school_snapshot JSON NOT NULL,company_snapshot JSON NOT NULL,
 subject VARCHAR(255) NOT NULL,body TEXT NOT NULL,
 received_at DATETIME NOT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 created_by INT NOT NULL,assigned_to INT NOT NULL,
 status ENUM('pending','escalated','closed','in_progress','answered','returned') NOT NULL DEFAULT 'pending',
 supervisor_id INT NOT NULL,review_hours INT NOT NULL,supervisor_hours INT NOT NULL,
 due_at DATETIME NOT NULL,closed_at DATETIME NULL,
 KEY idx_sc_queue(assigned_to,status,due_at),KEY idx_sc_school(school_id,received_at),
 KEY idx_sc_company(company_id,received_at),KEY idx_sc_phone(phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS school_complaint_events (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,complaint_id BIGINT UNSIGNED NOT NULL,
 actor_id INT NOT NULL,action ENUM('created','note','reply','escalate','close','start','return') NOT NULL,
 body TEXT NOT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY idx_sce_case(complaint_id,id),
 CONSTRAINT fk_sce_case FOREIGN KEY(complaint_id) REFERENCES school_complaints(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE school_complaints MODIFY COLUMN status ENUM('pending','escalated','closed','in_progress','answered','returned') NOT NULL DEFAULT 'pending';
ALTER TABLE school_complaint_events MODIFY COLUMN action ENUM('created','note','reply','escalate','close','start','return') NOT NULL;

CREATE TABLE IF NOT EXISTS school_complaint_overdue_notices (
 complaint_id BIGINT UNSIGNED NOT NULL, stage_event_id BIGINT UNSIGNED NOT NULL,
 recipient_id INT NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(complaint_id,stage_event_id,recipient_id),
 CONSTRAINT fk_scon_case FOREIGN KEY(complaint_id) REFERENCES school_complaints(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS school_complaint_attachments (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, complaint_id BIGINT UNSIGNED NOT NULL,
 uploader_id INT NOT NULL, filename VARCHAR(255) NOT NULL, mime VARCHAR(80) NOT NULL,
 byte_size INT UNSIGNED NOT NULL, digest CHAR(64) NOT NULL, content MEDIUMBLOB NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_sca_digest(complaint_id,digest), KEY idx_sca_case(complaint_id,id),
 CONSTRAINT fk_sca_case FOREIGN KEY(complaint_id) REFERENCES school_complaints(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
