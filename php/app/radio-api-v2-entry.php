<?php
// Bootstrap for the mobile radio endpoint. The production shared-hosting deploy is FTP-only,
// so the endpoint must be able to repair missing radio tables after deployment.
ini_set('display_errors','0');
$R=__DIR__.'/..';
require_once "$R/lib/Db.php";

function radio_entry_column_exists($table,$column){
  $r=Db::one("SELECT COUNT(*) c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?",[$table,$column]);
  return (int)($r['c']??0)>0;
}
function radio_entry_ensure_column($table,$column,$definition){
  if(!radio_entry_column_exists($table,$column)) Db::run("ALTER TABLE `$table` ADD COLUMN `$column` $definition");
}
function radio_entry_bootstrap(){
  Db::run("CREATE TABLE IF NOT EXISTS radio_channels (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description VARCHAR(255) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    current_speaker_id INT NULL,
    lock_until DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(id), UNIQUE KEY uq_radio_channels_code(code), KEY idx_radio_channels_active(is_active), KEY idx_radio_channels_speaker(current_speaker_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  radio_entry_ensure_column('radio_channels','current_speaker_id','INT NULL');
  radio_entry_ensure_column('radio_channels','lock_until','DATETIME NULL');
  radio_entry_ensure_column('radio_channels','channel_type',"VARCHAR(20) NOT NULL DEFAULT 'custom'");
  radio_entry_ensure_column('radio_channels','match_mode',"VARCHAR(3) NOT NULL DEFAULT 'OR'");
  radio_entry_ensure_column('radio_channels','max_talk_ms','INT UNSIGNED NOT NULL DEFAULT 25000');
  radio_entry_ensure_column('radio_channels','priority','INT NOT NULL DEFAULT 0');

  Db::run("CREATE TABLE IF NOT EXISTS radio_messages (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    channel_id INT UNSIGNED NOT NULL,
    sender_id INT NOT NULL,
    sender_name VARCHAR(190) NOT NULL,
    audio_path VARCHAR(255) NOT NULL,
    mime_type VARCHAR(80) NOT NULL DEFAULT 'audio/mp4',
    duration_ms INT UNSIGNED NOT NULL DEFAULT 0,
    bytes_size INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id), KEY idx_radio_messages_channel_id(channel_id,id), KEY idx_radio_messages_sender(sender_id,id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  Db::run("CREATE TABLE IF NOT EXISTS radio_user_settings (
    user_id INT NOT NULL PRIMARY KEY,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    channel_id INT UNSIGNED NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_radio_user_channel(channel_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  Db::run("CREATE TABLE IF NOT EXISTS radio_channel_regions (
    channel_id INT UNSIGNED NOT NULL, region_id INT NOT NULL,
    PRIMARY KEY(channel_id,region_id), KEY idx_radio_cr_region(region_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  Db::run("CREATE TABLE IF NOT EXISTS radio_channel_users (
    channel_id INT UNSIGNED NOT NULL, user_id INT NOT NULL,
    PRIMARY KEY(channel_id,user_id), KEY idx_radio_cu_user(user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  Db::run("CREATE TABLE IF NOT EXISTS radio_channel_roles (
    channel_id INT UNSIGNED NOT NULL, role_id INT NOT NULL,
    PRIMARY KEY(channel_id,role_id), KEY idx_radio_cr_role(role_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  Db::run("CREATE TABLE IF NOT EXISTS radio_presence (
    channel_id INT UNSIGNED NOT NULL, user_id INT NOT NULL,
    last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(channel_id,user_id), KEY idx_radio_presence_seen(channel_id,last_seen_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  Db::run("CREATE TABLE IF NOT EXISTS radio_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    channel_id INT UNSIGNED NULL, user_id INT NULL,
    event_type VARCHAR(40) NOT NULL, meta_json TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id), KEY idx_radio_logs_channel(channel_id,id), KEY idx_radio_logs_user(user_id,id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  Db::run("INSERT INTO radio_channels(name,code,description,is_active,channel_type,match_mode,max_talk_ms,priority) VALUES
    ('عمومی','general','کانال عمومی ارتباط خطیار',1,'custom','OR',25000,100),
    ('مدیریت','management','ارتباط مدیریت و مسئولین',1,'custom','OR',25000,90),
    ('بازرسی','inspection','ارتباط واحد بازرسی',1,'custom','OR',25000,80),
    ('عملیات خطوط','field','ارتباط عملیات میدانی خطوط',1,'custom','OR',25000,70)
    ON DUPLICATE KEY UPDATE is_active=1,description=VALUES(description),channel_type=VALUES(channel_type),match_mode=VALUES(match_mode),max_talk_ms=VALUES(max_talk_ms),priority=VALUES(priority)");
}
try{ radio_entry_bootstrap(); }catch(Throwable $e){ error_log('radio bootstrap: '.$e->getMessage()); }
require __DIR__.'/radio-api-v2.php';
