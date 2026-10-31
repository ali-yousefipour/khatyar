-- One authenticated, confirmed portrait per taxi driver; updates are admin-only.
-- Safe to apply repeatedly. Existing drivers and import columns are unchanged.
CREATE TABLE IF NOT EXISTS driver_profile_photos (
  driver_id INT NOT NULL PRIMARY KEY,
  photo_path VARCHAR(255) NOT NULL,
  captured_by INT NULL,
  confirmed_at DATETIME NOT NULL,
  updated_by INT NULL,
  updated_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
