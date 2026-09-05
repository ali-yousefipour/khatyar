<?php
// Cron-safe cleanup for radio archive files/messages.
// Retention is configured by radio-admin-api.php; env remains a fallback.
ini_set('display_errors','0');
$ROOT=__DIR__.'/..';
require "$ROOT/lib/Db.php";
function radio_cleanup_table($t){$r=Db::one("SELECT COUNT(*) c FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?",[$t]);return(int)($r['c']??0)>0;}
function radio_cleanup_retention_hours(){
  if(radio_cleanup_table('app_settings')){try{$r=Db::one("SELECT value FROM app_settings WHERE `key`='radio_archive_retention_hours' LIMIT 1");$v=(int)($r['value']??0);if($v>0)return max(1,min(87600,$v));$r=Db::one("SELECT value FROM app_settings WHERE `key`='radio_archive_retention_days' LIMIT 1");$d=(int)($r['value']??0);if($d>0)return max(1,min(87600,$d*24));}catch(Throwable $e){}}
  $v=(int)(getenv('RADIO_ARCHIVE_RETENTION_DAYS')?:1);return max(1,min(87600,$v*24));
}
try{
  if(!radio_cleanup_table('radio_messages')){echo "radio_messages table not found\n";exit;}
  $hours=radio_cleanup_retention_hours();
  $rows=Db::all("SELECT id,audio_path FROM radio_messages WHERE created_at < DATE_SUB(NOW(), INTERVAL ? HOUR) ORDER BY id ASC LIMIT 500",[$hours]);
  $deleted=0;$missing=0;
  foreach($rows as $m){$p=__DIR__.'/'.$m['audio_path'];if(is_file($p)){if(!@unlink($p))continue;}else{$missing++;}Db::run('DELETE FROM radio_messages WHERE id=?',[(int)$m['id']]);$deleted++;}
  echo json_encode(['ok'=>true,'retention_hours'=>$hours,'retention_days'=>(int)ceil($hours/24),'deleted'=>$deleted,'missing_files'=>$missing],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)."\n";
}catch(Throwable $e){http_response_code(500);echo json_encode(['ok'=>false,'error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)."\n";}
