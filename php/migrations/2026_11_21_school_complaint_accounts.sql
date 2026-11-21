-- Standalone complaint operators: NEVER inserted into users, roles, zones or org chart.
-- Referential IDs used in school_complaints.created_by/assigned_to are negative account IDs.
CREATE TABLE IF NOT EXISTS school_complaint_accounts (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 username VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
 display_name VARCHAR(200) NOT NULL,
 password_hash VARCHAR(255) NOT NULL,
 can_receive TINYINT(1) NOT NULL DEFAULT 1,
 can_report TINYINT(1) NOT NULL DEFAULT 0,
 is_active TINYINT(1) NOT NULL DEFAULT 1,
 token_version INT UNSIGNED NOT NULL DEFAULT 1,
 failed_attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
 locked_until DATETIME NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_sc_account_username(username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
