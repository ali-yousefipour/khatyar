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
 status ENUM('pending','escalated','closed') NOT NULL DEFAULT 'pending',
 supervisor_id INT NOT NULL,review_hours INT NOT NULL,supervisor_hours INT NOT NULL,
 due_at DATETIME NOT NULL,closed_at DATETIME NULL,
 KEY idx_sc_queue(assigned_to,status,due_at),KEY idx_sc_school(school_id,received_at),
 KEY idx_sc_company(company_id,received_at),KEY idx_sc_phone(phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS school_complaint_events (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,complaint_id BIGINT UNSIGNED NOT NULL,
 actor_id INT NOT NULL,action ENUM('created','note','reply','escalate','close') NOT NULL,
 body TEXT NOT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY idx_sce_case(complaint_id,id),
 CONSTRAINT fk_sce_case FOREIGN KEY(complaint_id) REFERENCES school_complaints(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
