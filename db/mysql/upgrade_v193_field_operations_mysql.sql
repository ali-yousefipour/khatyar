-- V193 عملیات میدانی - MySQL/MariaDB
CREATE TABLE IF NOT EXISTS permissions (
 id INT AUTO_INCREMENT PRIMARY KEY,
 permission_key VARCHAR(100) NOT NULL UNIQUE,
 title VARCHAR(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS role_permissions (
 role_id INT NOT NULL,
 permission_id INT NOT NULL,
 PRIMARY KEY(role_id,permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS field_operations (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 line_id BIGINT NULL,
 user_id BIGINT NULL,
 title VARCHAR(255) NOT NULL,
 status VARCHAR(30) NOT NULL DEFAULT 'pending',
 operation_date DATE NOT NULL,
 started_at DATETIME NULL,
 completed_at DATETIME NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX(line_id), INDEX(user_id), INDEX(operation_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO permissions(permission_key,title) VALUES
('operations.view','مشاهده عملیات میدانی'),
('operations.dashboard','داشبورد عملیات'),
('operations.missions.manage','مدیریت ماموریت ها'),
('operations.reports.view','گزارش عملکرد عملیات');
