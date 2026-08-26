-- ماژول فیش حقوقی PDF
CREATE TABLE IF NOT EXISTS user_salary_slips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  period_jy INT NOT NULL,
  period_jm TINYINT NOT NULL,
  title VARCHAR(200) NULL,
  file_path VARCHAR(255) NOT NULL,
  file_name VARCHAR(200) NULL,
  uploaded_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_period(user_id, period_jy, period_jm),
  INDEX idx_period(period_jy, period_jm)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
