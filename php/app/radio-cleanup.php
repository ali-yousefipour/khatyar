<?php
// Cron-safe cleanup for radio archive files/messages.
// Retention is configured by radio-admin-api.php; env remains a fallback.
ini_set('display_errors','0');
$ROOT=__DIR__.'/..';
require "$ROOT/lib/Db.php";
function radio_cleanup_table($t){$r=Db::one("SELECT COUNT(*) c FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?",[$t]);return(int)($r['c']??0)>0;}
function radio_cleanup_retention(){
  if(radio_cleanup_table('app_settings')){try{$r=Db::one("SELECT value FROM app_settings WHERE `key`='radio_archive_retention_days' LIMIT 1");$v=(int)($r['value']??0);if($v>0)return max(1,min(3650,$v));}catch(Throwable $e){}}
  $v=(int)(getenv('RADIO_ARCHIVE_RETENTION_DAYS')?:30);return max(1,min(3650,$v));
}
try{
  if(!radio_cleanup_table('radio_messages')){echo "radio_messages table not found\n";exit;}
  $days=radio_cleanup_retention();
  $rows=Db::all("SELECT id,audio_path FROM radio_messages WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY) ORDER BY id ASC LIMIT 500",[$days]);
  $deleted=0;$missing=0;
  foreach($rows as $m){$p=__DIR__.'/'.$m['audio_path'];if(is_file($p)){if(!@unlink($p))continue;}else{$missing++;}Db::run('DELETE FROM radio_messages WHERE id=?',[(int)$m['id']]);$deleted++;}
  echo json_encode(['ok'=>true,'retention_days'=>$days,'deleted'=>$deleted,'missing_files'=>$missing],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)."\n";
}catch(Throwable $e){http_response_code(500);echo json_encode(['ok'=>false,'error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)."\n";}
