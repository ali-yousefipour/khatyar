-- KhatYar Radio + Line Station repair migration
-- MySQL/MariaDB compatible and idempotent.

CREATE TABLE IF NOT EXISTS station_sign_types (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(60) NOT NULL,
  title VARCHAR(190) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_station_sign_type_code (code),
  KEY idx_station_sign_types_active (is_active,sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO station_sign_types(code,title,sort_order,is_active) VALUES
 ('station','تابلو ایستگاه',10,1),
 ('route','تابلو مسیر',20,1),
 ('information','تابلو اطلاع‌رسانی',30,1),
 ('direction','تابلو راهنما',40,1),
 ('other','سایر',90,1)
ON DUPLICATE KEY UPDATE title=VALUES(title),sort_order=VALUES(sort_order),is_active=1;

-- Prevent duplicate radio permission rows after an interrupted/manual setup.
CREATE TABLE IF NOT EXISTS radio_channel_regions (
 channel_id INT UNSIGNED NOT NULL, region_id INT NOT NULL,
 PRIMARY KEY(channel_id,region_id), KEY idx_radio_cr_region(region_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS radio_channel_users (
 channel_id INT UNSIGNED NOT NULL, user_id INT NOT NULL,
 PRIMARY KEY(channel_id,user_id), KEY idx_radio_cu_user(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS radio_channel_roles (
 channel_id INT UNSIGNED NOT NULL, role_id INT NOT NULL,
 PRIMARY KEY(channel_id,role_id), KEY idx_radio_cr_role(role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS radio_presence (
 channel_id INT UNSIGNED NOT NULL, user_id INT NOT NULL,
 last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(channel_id,user_id), KEY idx_radio_presence_seen(channel_id,last_seen_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS radio_logs (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
 channel_id INT UNSIGNED NULL, user_id INT NULL,
 event_type VARCHAR(40) NOT NULL, meta_json TEXT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(id), KEY idx_radio_logs_channel(channel_id,id), KEY idx_radio_logs_user(user_id,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
