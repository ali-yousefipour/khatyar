<?php
// Bootstrap for the mobile station wizard. Production deploys are FTP-only,
// therefore required lookup tables must be available without a manual CLI migration.
ini_set('display_errors','0');
$R=__DIR__.'/..';
require_once "$R/lib/Db.php";
try {
  Db::run("CREATE TABLE IF NOT EXISTS station_sign_types (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(60) NOT NULL,
    title VARCHAR(190) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    UNIQUE KEY uq_station_sign_type_code(code),
    KEY idx_station_sign_types_active(is_active,sort_order)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  Db::run("INSERT INTO station_sign_types(code,title,sort_order,is_active) VALUES
    ('station','تابلو ایستگاه',10,1),
    ('route','تابلو مسیر',20,1),
    ('information','تابلو اطلاع‌رسانی',30,1),
    ('direction','تابلو راهنما',40,1),
    ('other','سایر',90,1)
    ON DUPLICATE KEY UPDATE title=VALUES(title),sort_order=VALUES(sort_order),is_active=1");
} catch (Throwable $e) {
  error_log('station bootstrap: '.$e->getMessage());
}
require __DIR__.'/station-wizard-api.php';
