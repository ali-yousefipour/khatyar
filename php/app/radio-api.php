<?php
// KhatYar shared-hosting walkie-talkie API.
// Audio is short, low-quality AAC/M4A recorded on-device. PHP only arbitrates
// the floor, stores a small file and serves it back to authenticated clients.
ini_set('display_errors','0');
$ROOT = __DIR__ . '/..';
require "$ROOT/lib/Db.php";
require "$ROOT/lib/Jwt.php";
require "$ROOT/lib/Http.php";
$CONFIG = require "$ROOT/config.php";
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: microphone=(self)');

function radio_json($v,$status=200){ http_response_code($status); echo json_encode($v,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); exit; }
function radio_error($m,$s=400){ radio_json(['ok'=>false,'error'=>$m],$s); }
function radio_setup(){
  try {
    Db::run("CREATE TABLE IF NOT EXISTS radio_channels (id INT UNSIGNED NOT NULL AUTO_INCREMENT,name VARCHAR(100) NOT NULL,code VARCHAR(50) NOT NULL,description VARCHAR(255) NULL,is_active TINYINT(1) NOT NULL DEFAULT 1,current_speaker_id INT NULL,lock_until DATETIME NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY(id),UNIQUE KEY uq_radio_channels_code(code),KEY idx_radio_channels_active(is_active),KEY idx_radio_channels_speaker(current_speaker_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    Db::run("CREATE TABLE IF NOT EXISTS radio_messages (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,channel_id INT UNSIGNED NOT NULL,sender_id INT NOT NULL,sender_name VARCHAR(190) NOT NULL,audio_path VARCHAR(255) NOT NULL,mime_type VARCHAR(80) NOT NULL DEFAULT 'audio/mp4',duration_ms INT UNSIGNED NOT NULL DEFAULT 0,bytes_size INT UNSIGNED NOT NULL DEFAULT 0,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(id),KEY idx_radio_messages_channel_id(channel_id,id),KEY idx_radio_messages_sender(sender_id,id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    Db::run("CREATE TABLE IF NOT EXISTS radio_user_settings (user_id INT NOT NULL PRIMARY KEY,enabled TINYINT(1) NOT NULL DEFAULT 1,channel_id INT UNSIGNED NULL,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,KEY idx_radio_user_channel(channel_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    foreach([['عمومی','general','کانال عمومی ارتباط خطیار'],['مدیریت','management','ارتباط مدیریت و مسئولین'],['بازرسی','inspection','ارتباط واحد بازرسی'],['عملیات خطوط','field','ارتباط عملیات میدانی خطوط']] as $c) Db::run("INSERT INTO radio_channels(name,code,description) VALUES(?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),is_active=1",$c);
  } catch(Throwable $e){ radio_error('راه‌اندازی بیسیم در پایگاه‌داده ناموفق بود',500); }
}
function radio_user(){
  global $CONFIG;
  $tok=Http::bearer(); $payload=$tok?Jwt::verify($tok,$CONFIG['jwt_secret']):null; if(!$payload) radio_error('توکن منقضی یا نامعتبر است',401);
  $u=Db::one("SELECT u.id,u.first_name,u.last_name,u.username,u.is_active,r.title AS role_title,r.level,r.is_admin FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?",[$payload['sub']]);
  if(!$u||!$u['is_active']) radio_error('کاربر نامعتبر است',401);
  $dt=$payload['dt']??'web'; $sess=Db::one("SELECT device_id,revoked_at FROM user_sessions WHERE user_id=? AND device_type=?",[$u['id'],$dt]);
  $unlimited=in_array($u['role_title'],['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد'],true);
  if(!$sess||$sess['revoked_at']||(!$unlimited&&$sess['device_id']!==($payload['device_id']??''))) radio_error('نشست منقضی یا باطل شده است',401);
  $u['display_name']=trim(($u['first_name']??'').' '.($u['last_name']??''))?:($u['username']??'کاربر'); return $u;
}
function radio_body(){ $raw=file_get_contents('php://input'); $j=json_decode($raw,true); return is_array($j)?$j:$_POST; }
function radio_channel($id){ $c=Db::one('SELECT * FROM radio_channels WHERE id=? AND is_active=1',[(int)$id]); if(!$c) radio_error('کانال صوتی یافت نشد',404); return $c; }
function radio_cleanup_locks(){ try{Db::run('UPDATE radio_channels SET current_speaker_id=NULL,lock_until=NULL WHERE lock_until IS NOT NULL AND lock_until<NOW()');}catch(Throwable $e){} }
function radio_audio_path($id){ return __DIR__.'/uploads/radio/'.((int)$id).'.m4a'; }

radio_setup();
$u=radio_user(); radio_cleanup_locks();
$method=$_SERVER['REQUEST_METHOD']; $op=$_GET['op']??$_POST['op']??'state';
if($op==='channels'&&$method==='GET'){
  $rows=Db::all('SELECT id,name,code,description,current_speaker_id,lock_until FROM radio_channels WHERE is_active=1 ORDER BY id');
  $settings=Db::one('SELECT enabled,channel_id FROM radio_user_settings WHERE user_id=?',[$u['id']]);
  foreach($rows as &$r){$r['busy']=!empty($r['current_speaker_id'])&&strtotime((string)$r['lock_until'])>time();$r['speaker_id']=$r['current_speaker_id'];unset($r['current_speaker_id'],$r['lock_until']);}unset($r);
  radio_json(['ok'=>true,'channels'=>$rows,'enabled'=>$settings?(bool)$settings['enabled']:true,'channel_id'=>$settings?(int)$settings['channel_id']:(int)($rows[0]['id']??0)]);
}
if($op==='settings'&&$method==='POST'){
  $b=radio_body(); $enabled=isset($b['enabled'])?(int)(bool)$b['enabled']:1; $cid=(int)($b['channel_id']??0); if($cid) radio_channel($cid); Db::run('INSERT INTO radio_user_settings(user_id,enabled,channel_id) VALUES(?,?,?) ON DUPLICATE KEY UPDATE enabled=VALUES(enabled),channel_id=VALUES(channel_id)',[$u['id'],$enabled,$cid?:null]); radio_json(['ok'=>true,'enabled'=>(bool)$enabled,'channel_id'=>$cid]);
}
if($op==='state'&&$method==='GET'){
  $settings=Db::one('SELECT enabled,channel_id FROM radio_user_settings WHERE user_id=?',[$u['id']]); $cid=(int)($settings['channel_id']??0); if(!$cid){$x=Db::one('SELECT id FROM radio_channels WHERE is_active=1 ORDER BY id LIMIT 1');$cid=(int)($x['id']??0);}
  $c=$cid?radio_channel($cid):null; radio_json(['ok'=>true,'enabled'=>$settings?((bool)$settings['enabled']):true,'channel'=>$c?['id'=>(int)$c['id'],'name'=>$c['name'],'busy'=>!empty($c['current_speaker_id'])&&strtotime((string)$c['lock_until'])>time(),'speaker_id'=>$c['current_speaker_id']]:null]);
}
if($op==='take'&&$method==='POST'){
  $b=radio_body();$cid=(int)($b['channel_id']??0);$c=radio_channel($cid);$pdo=Db::pdo();$pdo->beginTransaction();try{$row=Db::one('SELECT current_speaker_id,lock_until FROM radio_channels WHERE id=? FOR UPDATE',[$cid]);if(!empty($row['current_speaker_id'])&&strtotime((string)$row['lock_until'])>time()&&(int)$row['current_speaker_id']!==(int)$u['id']){ $pdo->rollBack(); radio_error('کانال در حال استفاده است',409); }Db::run("UPDATE radio_channels SET current_speaker_id=?,lock_until=DATE_ADD(NOW(),INTERVAL 45 SECOND) WHERE id=?",[$u['id'],$cid]);$pdo->commit();radio_json(['ok'=>true,'channel_id'=>$cid,'speaker_id'=>(int)$u['id'],'speaker_name'=>$u['display_name'],'lease_seconds'=>45]);}catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();radio_error('گرفتن کانال ناموفق بود',500);}
}
if($op==='release'&&$method==='POST'){
  $b=radio_body();$cid=(int)($b['channel_id']??0);if($cid)Db::run('UPDATE radio_channels SET current_speaker_id=NULL,lock_until=NULL WHERE id=? AND current_speaker_id=?',[$cid,$u['id']]);radio_json(['ok'=>true]);
}
if($op==='send'&&$method==='POST'){
  $cid=(int)($_POST['channel_id']??0);$duration=max(0,min(45000,(int)($_POST['duration_ms']??0)));$c=radio_channel($cid);$row=Db::one('SELECT current_speaker_id,lock_until FROM radio_channels WHERE id=?',[$cid]);if((int)($row['current_speaker_id']??0)!==(int)$u['id']||strtotime((string)($row['lock_until']??''))<=time())radio_error('مجوز صحبت شما منقضی شده است',409);if(empty($_FILES['audio']['tmp_name']))radio_error('فایل صوتی ارسال نشده است',400);$f=$_FILES['audio'];if((int)$f['size']>160000)radio_error('فایل صوتی بیش از حد مجاز است',413);$mime=(string)($f['type']??'audio/mp4');if(!preg_match('~^(audio/(mp4|m4a|aac|webm|mpeg)|video/mp4)$~i',$mime))radio_error('فرمت صوتی مجاز نیست',415);$dir=__DIR__.'/uploads/radio';if(!is_dir($dir)&&!@mkdir($dir,0750,true))radio_error('فضای ذخیره بیسیم قابل ایجاد نیست',500);$id=(int)(Db::one('SELECT COALESCE(MAX(id),0)+1 AS n FROM radio_messages')['n']??1);$path=radio_audio_path($id);if(!@move_uploaded_file($f['tmp_name'],$path))radio_error('ذخیره فایل صوتی ناموفق بود',500);Db::run('INSERT INTO radio_messages(id,channel_id,sender_id,sender_name,audio_path,mime_type,duration_ms,bytes_size) VALUES(?,?,?,?,?,?,?,?)',[$id,$cid,$u['id'],$u['display_name'],'uploads/radio/'.$id.'.m4a',$mime,$duration,(int)$f['size']]);Db::run('UPDATE radio_channels SET current_speaker_id=NULL,lock_until=NULL WHERE id=? AND current_speaker_id=?',[$cid,$u['id']]);radio_json(['ok'=>true,'message'=>['id'=>$id,'channel_id'=>$cid,'sender_id'=>(int)$u['id'],'sender_name'=>$u['display_name'],'duration_ms'=>$duration,'audio_url'=>'/api/radio-api.php?op=audio&id='.$id]]);
}
if($op==='poll'&&$method==='GET'){
  $cid=(int)($_GET['channel_id']??0);$after=(int)($_GET['after']??0);radio_channel($cid);$rows=Db::all('SELECT id,channel_id,sender_id,sender_name,duration_ms,bytes_size,created_at FROM radio_messages WHERE channel_id=? AND id>? ORDER BY id ASC LIMIT 10',[$cid,$after]);foreach($rows as &$r)$r['audio_url']='/api/radio-api.php?op=audio&id='.(int)$r['id'];unset($r);$c=radio_channel($cid);radio_json(['ok'=>true,'messages'=>$rows,'busy'=>!empty($c['current_speaker_id'])&&strtotime((string)$c['lock_until'])>time(),'speaker_id'=>$c['current_speaker_id'],'speaker_name'=>((int)($c['current_speaker_id']??0)===(int)$u['id'])?$u['display_name']:(($c['current_speaker_id']??0)?'کاربر در حال صحبت':'')]);
}
if($op==='audio'&&$method==='GET'){
  $id=(int)($_GET['id']??0);$m=Db::one('SELECT * FROM radio_messages WHERE id=?',[$id]);if(!$m)radio_error('پیام صوتی یافت نشد',404);$p=__DIR__.'/'.$m['audio_path'];if(!is_file($p))radio_error('فایل صوتی یافت نشد',404);header('Content-Type: '.($m['mime_type']?:'audio/mp4'));header('Content-Length: '.filesize($p));header('Content-Disposition: inline; filename="radio-'.$id.'.m4a"');readfile($p);exit;
}
if($op==='create-channel'&&$method==='POST'){
  if((int)$u['level']>3&&!$u['is_admin'])radio_error('دسترسی مدیریتی لازم است',403);$b=radio_body();$name=trim((string)($b['name']??''));$code=preg_replace('/[^a-z0-9_-]/i','',strtolower((string)($b['code']??'')));if($name===''||$code==='')radio_error('نام و کد کانال الزامی است');Db::run('INSERT INTO radio_channels(name,code,description) VALUES(?,?,?)',[$name,$code,trim((string)($b['description']??''))]);radio_json(['ok'=>true,'id'=>(int)Db::pdo()->lastInsertId()]);
}
radio_error('عملیات بیسیم نامعتبر است',404);
