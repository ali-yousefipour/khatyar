SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS complaint_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_type VARCHAR(20) NOT NULL,
  title VARCHAR(200) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_complaint_cat_type_title (complaint_type,title)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS complaints (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tracking_code VARCHAR(40) NOT NULL UNIQUE,
  driver_id INT NOT NULL,
  vehicle_id INT NULL,
  line_id INT NULL,
  received_by INT NOT NULL,
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  receive_lat DOUBLE NULL,
  receive_lng DOUBLE NULL,
  location_name VARCHAR(300) NULL,
  complainant_first_name VARCHAR(100) NOT NULL,
  complainant_last_name VARCHAR(100) NOT NULL,
  complainant_mobile VARCHAR(20) NOT NULL,
  complainant_type VARCHAR(20) NOT NULL,
  stay_days INT NULL,
  residence_city VARCHAR(120) NULL,
  complaint_type VARCHAR(20) NOT NULL,
  category_id INT NULL,
  subject VARCHAR(300) NOT NULL,
  body TEXT NOT NULL,
  signature_data MEDIUMTEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'received',
  assigned_to INT NULL,
  manager_id INT NULL,
  closed_at DATETIME NULL,
  closed_by INT NULL,
  sms_status VARCHAR(20) NULL,
  sms_message_id VARCHAR(80) NULL,
  sms_error VARCHAR(500) NULL,
  sms_sent_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_complaints_driver (driver_id,created_at),
  KEY idx_complaints_line (line_id,created_at),
  KEY idx_complaints_status (status,created_at),
  KEY idx_complaints_received (received_by,created_at),
  KEY idx_complaints_assigned (assigned_to,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS complaint_workflow (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  complaint_id BIGINT NOT NULL,
  actor_id INT NOT NULL,
  action VARCHAR(30) NOT NULL,
  to_user_id INT NULL,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_complaint_workflow (complaint_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO complaint_categories(complaint_type,title,sort_order) VALUES
('rate','گران‌فروشی',10),('rate','دریافت کرایه مازاد',20),('rate','عدم رعایت نرخ مصوب',30),
('non_rate','رفتار نامناسب',10),('non_rate','عدم رعایت مقررات',20),('non_rate','عدم رعایت مسیر یا خط',30),('non_rate','خودرو یا ظاهر نامناسب',40);

INSERT INTO app_settings(`key`,value) VALUES
('complaints_settings','{"sms_enabled":false,"sms_template":"شکایت شما با شماره پیگیری {tracking_code} در سامانه ثبت شد.","receiver_user_id":null,"manager_user_id":null,"allowed_user_ids":[],"allowed_role_ids":[]}')
ON DUPLICATE KEY UPDATE `key`=`key`;
