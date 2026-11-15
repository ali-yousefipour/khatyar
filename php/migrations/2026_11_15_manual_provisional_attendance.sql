-- Khatyar: provisional attendance for pending manual traffic requests.
-- Safe to run repeatedly. Tables are created lazily by the API for older deployments,
-- but deploying this migration first avoids DDL during an active request.
CREATE TABLE IF NOT EXISTS manual_attendance_provisional (
  request_id BIGINT NOT NULL PRIMARY KEY,
  user_id INT NOT NULL,
  attendance_id BIGINT NOT NULL,
  kind VARCHAR(6) NOT NULL,
  previous_checkout DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_map_attendance(attendance_id),
  KEY idx_map_user(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS manual_request_submission_keys (
  user_id INT NOT NULL,
  client_uuid VARCHAR(110) NOT NULL,
  request_id BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id,client_uuid),
  KEY idx_request_id(request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
