<?php
ini_set('display_errors','0');
$ROOT=__DIR__.'/..';
require "$ROOT/lib/Db.php";
require "$ROOT/lib/Jwt.php";
require "$ROOT/lib/Http.php";
$CONFIG=require "$ROOT/config.php";
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control:no-store,max-age=0');
header('X-Content-Type-Options:nosniff');

function j($v,$s=200){http_response_code($s);echo json_encode($v,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;}
function e($m,$s=400){j(['ok'=>false,'error'=>$m],$s);}
function b(){ $x=json_decode(file_get_contents('php://input'),true);return is_array($x)?$x:$_POST; }
function te($t){$r=Db::one("SELECT COUNT(*) c FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?",[$t]);return (int)($r['c']??0)>0;}
function ce($t,$c){$r=Db::one("SELECT COUNT(*) c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?",[$t,$c]);return (int)($r['c']??0)>0;}
function load_user(){
  global $CONFIG;
  $p=($t=Http::bearer())?Jwt::verify($t,$CONFIG['jwt_secret']):null;
  if(!$p||empty($p['sub'])) e('توکن منقضی یا نامعتبر است',401);
  $u=Db::one("SELECT u.*,r.title role_title,r.level,r.is_admin FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.id=? LIMIT 1",[$p['sub']]);
  if(!$u||!(int)$u['is_active']) e('کاربر نامعتبر است',401);
  return $u;
}
function is_super_admin($u){return !empty($u['is_admin'])||in_array((string)$u['role_title'],['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد','admin','superadmin'],true);}
function has_radio_permission($u){
  if(is_super_admin($u)) return true;
  try{
    if(!te('app_settings')) return false;
    $r=Db::one("SELECT value FROM app_settings WHERE `key`='role_app_items' LIMIT 1");
    $cfg=$r?json_decode((string)$r['value'],true):[];$rid=(string)($u['role_id']??'');
    if(!is_array($cfg)||!array_key_exists($rid,$cfg)) return false;
    return in_array('RadioAdmin',is_array($cfg[$rid])?$cfg[$rid]:[],true);
  }catch(Throwable $x){return false;}
}
function auth(){ $u=load_user();if(!has_radio_permission($u))e('این سمت مجوز دسترسی به تنظیمات بی‌سیم را ندارد',403);return $u; }
function setup(){
  try{
    Db::run("CREATE TABLE IF NOT EXISTS radio_channels(id INT UNSIGNED NOT NULL AUTO_INCREMENT,name VARCHAR(100) NOT NULL,code VARCHAR(50) NOT NULL,description VARCHAR(255) NULL,is_active TINYINT(1) NOT NULL DEFAULT 1,current_speaker_id INT NULL,lock_until DATETIME NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY(id),UNIQUE KEY uq_radio_channels_code(code)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    foreach([['channel_type',"VARCHAR(20) NOT NULL DEFAULT 'custom'"],['match_mode',"VARCHAR(3) NOT NULL DEFAULT 'OR'"],['max_talk_ms','INT UNSIGNED NOT NULL DEFAULT 25000'],['priority','INT NOT NULL DEFAULT 0']] as $x) if(!ce('radio_channels',$x[0])) Db::run("ALTER TABLE radio_channels ADD COLUMN {$x[0]} {$x[1]}");
    foreach([
      'radio_channel_regions'=>"CREATE TABLE IF NOT EXISTS radio_channel_regions(channel_id INT UNSIGNED NOT NULL,region_id INT NOT NULL,PRIMARY KEY(channel_id,region_id),KEY(region_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
      'radio_channel_users'=>"CREATE TABLE IF NOT EXISTS radio_channel_users(channel_id INT UNSIGNED NOT NULL,user_id INT NOT NULL,PRIMARY KEY(channel_id,user_id),KEY(user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
      'radio_channel_roles'=>"CREATE TABLE IF NOT EXISTS radio_channel_roles(channel_id INT UNSIGNED NOT NULL,role_id INT NOT NULL,PRIMARY KEY(channel_id,role_id),KEY(role_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
      'radio_presence'=>"CREATE TABLE IF NOT EXISTS radio_presence(channel_id INT UNSIGNED NOT NULL,user_id INT NOT NULL,last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(channel_id,user_id),KEY(channel_id,last_seen_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
      'radio_logs'=>"CREATE TABLE IF NOT EXISTS radio_logs(id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,channel_id INT UNSIGNED NULL,user_id INT NULL,event_type VARCHAR(40) NOT NULL,meta_json TEXT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(id),KEY(channel_id,id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ] as $t=>$sql) if(!te($t)) Db::run($sql);
  }catch(Throwable $x){e('راه‌اندازی ساختار مدیریت بی‌سیم ناموفق بود',500);}
}
function region_source(){foreach(['regions','areas','geographic_regions','districts'] as $t) if(te($t)) foreach(['name','title','region_name','area_name'] as $n) if(ce($t,$n)) return [$t,$n];return null;}
function regions(){ $s=region_source();if(!$s)return [];[$t,$n]=$s;$rows=Db::all("SELECT id,$n name FROM $t ORDER BY $n");return array_map(fn($r)=>['id'=>(int)$r['id'],'name'=>(string)$r['name']],$rows); }
function uregion($u){foreach(['region_id','area_id','zone_id','district_id'] as $c) if(ce('users',$c)&&!empty($u[$c])) return (int)$u[$c];return 0;}
function allowed($c,$u){
  $rid=uregion($u);$rg=Db::all('SELECT region_id FROM radio_channel_regions WHERE channel_id=?',[$c['id']]);$us=Db::all('SELECT user_id FROM radio_channel_users WHERE channel_id=?',[$c['id']]);$ro=Db::all('SELECT role_id FROM radio_channel_roles WHERE channel_id=?',[$c['id']]);$g=[];
  if($rg)$g[]=in_array($rid,array_map(fn($x)=>(int)$x['region_id'],$rg),true);if($ro)$g[]=in_array((int)$u['role_id'],array_map(fn($x)=>(int)$x['role_id'],$ro),true);if($us)$g[]=in_array((int)$u['id'],array_map(fn($x)=>(int)$x['user_id'],$us),true);if(!$g)return true;return (($c['match_mode']??'OR')==='AND')?!in_array(false,$g,true):in_array(true,$g,true);
}
function sign_audio($id,$exp){global $CONFIG;return hash_hmac('sha256',"radio-admin|$id|$exp",$CONFIG['jwt_secret']);}
function verify_audio_sign($id,$exp,$sig){if($exp<time()||!$sig)return false;return hash_equals(sign_audio($id,$exp),$sig);}
function admin_audio_url($id,$channelId){$exp=time()+300;$base=rtrim((string)$GLOBALS['CONFIG']['public_url'],'/');if($base===''){$scheme=!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off'?'https':'http';$base=$scheme.'://'.($_SERVER['HTTP_HOST']??'localhost');}$prefix=rtrim(str_replace('\\','/',dirname($_SERVER['SCRIPT_NAME']??'/api/radio-admin-api.php')),'/');return $base.$prefix.'/radio-admin-api.php?op=monitor-audio&id='.(int)$id.'&exp='.$exp.'&sig='.sign_audio($id,$exp);}
setup();
$op=$_GET['op']??$_POST['op']??'bootstrap';$method=$_SERVER['REQUEST_METHOD']??'GET';
if($op==='monitor-audio'&&$method==='GET'){
  $id=(int)($_GET['id']??0);$exp=(int)($_GET['exp']??0);$sig=(string)($_GET['sig']??'');
  if(!$id||!verify_audio_sign($id,$exp,$sig)) e('نشانی صوتی منقضی یا نامعتبر است',401);
  $m=Db::one('SELECT m.*,c.is_active FROM radio_messages m JOIN radio_channels c ON c.id=m.channel_id WHERE m.id=?',[$id]);
  if(!$m||!(int)$m['is_active']) e('پیام صوتی یافت نشد',404);
  $p=__DIR__.'/'.$m['audio_path'];if(!is_file($p))e('فایل صوتی یافت نشد',404);
  while(ob_get_level()>0)@ob_end_clean();header('Content-Type: '.($m['mime_type']?:'audio/mp4'));header('Content-Length:'.filesize($p));header('Content-Disposition:inline; filename="radio-'.$id.'.m4a"');header('Accept-Ranges: bytes');readfile($p);exit;
}
$me=auth();
if($op==='access'&&$method==='GET')j(['ok'=>true,'allowed'=>true,'role_id'=>(int)$me['role_id']]);
if($op==='bootstrap'&&$method==='GET'){
  $chs=Db::all('SELECT id,name,code,description,is_active,channel_type,match_mode,max_talk_ms,priority,current_speaker_id,lock_until FROM radio_channels ORDER BY priority DESC,id');
  foreach($chs as &$c){$c['id']=(int)$c['id'];$c['is_active']=(bool)$c['is_active'];$c['max_talk_ms']=(int)$c['max_talk_ms'];$c['priority']=(int)$c['priority'];$c['rules']=['regions'=>array_map('intval',array_column(Db::all('SELECT region_id FROM radio_channel_regions WHERE channel_id=?',[$c['id']]),'region_id')),'users'=>array_map('intval',array_column(Db::all('SELECT user_id FROM radio_channel_users WHERE channel_id=?',[$c['id']]),'user_id')),'roles'=>array_map('intval',array_column(Db::all('SELECT role_id FROM radio_channel_roles WHERE channel_id=?',[$c['id']]),'role_id'))];$c['online_count']=(int)(Db::one('SELECT COUNT(*) n FROM radio_presence WHERE channel_id=? AND last_seen_at>=DATE_SUB(NOW(),INTERVAL 45 SECOND)',[$c['id']])['n']??0);$c['speaker_name']=$c['current_speaker_id']?(Db::one('SELECT CONCAT(COALESCE(first_name,"")," ",COALESCE(last_name,"")) n FROM users WHERE id=?',[$c['current_speaker_id']])['n']??''):'';}unset($c);
  $users=Db::all('SELECT u.id,u.first_name,u.last_name,u.username,u.role_id,r.title role_title FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.is_active=1 ORDER BY u.first_name,u.last_name,u.id LIMIT 3000');$roles=Db::all('SELECT id,title FROM roles ORDER BY id');j(['ok'=>true,'channels'=>$chs,'users'=>$users,'roles'=>$roles,'regions'=>regions()]);
}
if($op==='monitor'&&$method==='GET'){
  $cid=(int)($_GET['channel_id']??0);$after=(int)($_GET['after']??0);$limit=max(1,min(50,(int)($_GET['limit']??20)));
  if($cid){$c=Db::one('SELECT * FROM radio_channels WHERE id=?',[$cid]);if(!$c)e('کانال یافت نشد',404);}else$c=null;
  $rows=$cid?Db::all("SELECT id,channel_id,sender_id,sender_name,duration_ms,bytes_size,created_at FROM radio_messages WHERE channel_id=? AND id>? ORDER BY id ASC LIMIT $limit",[$cid,$after]):Db::all("SELECT id,channel_id,sender_id,sender_name,duration_ms,bytes_size,created_at FROM radio_messages WHERE id>? ORDER BY id ASC LIMIT $limit",[$after]);
  foreach($rows as &$r)$r['audio_url']=admin_audio_url((int)$r['id'],(int)$r['channel_id']);unset($r);
  $channels=Db::all('SELECT id,name,code,is_active FROM radio_channels ORDER BY priority DESC,id');
  j(['ok'=>true,'messages'=>$rows,'channels'=>$channels,'next_after'=>$rows?(int)end($rows)['id']:$after]);
}
if($op==='archive'&&$method==='GET'){
  $cid=(int)($_GET['channel_id']??0);$page=max(1,(int)($_GET['page']??1));$limit=max(1,min(100,(int)($_GET['limit']??30)));$offset=($page-1)*$limit;$where=$cid?'WHERE m.channel_id=?':'';$params=$cid?[$cid]:[];
  $rows=Db::all("SELECT m.id,m.channel_id,m.sender_id,m.sender_name,m.duration_ms,m.bytes_size,m.created_at,c.name channel_name FROM radio_messages m JOIN radio_channels c ON c.id=m.channel_id $where ORDER BY m.id DESC LIMIT $limit OFFSET $offset",$params);
  foreach($rows as &$r)$r['audio_url']=admin_audio_url((int)$r['id'],(int)$r['channel_id']);unset($r);
  j(['ok'=>true,'messages'=>$rows,'page'=>$page,'limit'=>$limit]);
}
if($op==='save'&&$method==='POST'){
  $x=b();$id=(int)($x['id']??0);$name=trim((string)($x['name']??''));$code=preg_replace('/[^a-z0-9_-]/i','',strtolower((string)($x['code']??'')));$type=(string)($x['channel_type']??'custom');$mode=(string)($x['match_mode']??'OR');
  if($name===''||$code===''||!in_array($type,['region','users','roles','custom'],true)||!in_array($mode,['OR','AND'],true))e('اطلاعات کانال نامعتبر است',422);
  $max=max(5000,min(120000,(int)($x['max_talk_ms']??25000)));$priority=max(-100,min(100,(int)($x['priority']??0)));$active=!empty($x['is_active'])?1:0;$desc=trim((string)($x['description']??''));
  if($id)Db::run('UPDATE radio_channels SET name=?,code=?,description=?,is_active=?,channel_type=?,match_mode=?,max_talk_ms=?,priority=? WHERE id=?',[$name,$code,$desc,$active,$type,$mode,$max,$priority,$id]);else{Db::run('INSERT INTO radio_channels(name,code,description,is_active,channel_type,match_mode,max_talk_ms,priority) VALUES(?,?,?,?,?,?,?,?)',[$name,$code,$desc,$active,$type,$mode,$max,$priority]);$id=(int)Db::pdo()->lastInsertId();}
  foreach(['radio_channel_regions'=>'region_id','radio_channel_users'=>'user_id','radio_channel_roles'=>'role_id'] as $t=>$col){Db::run("DELETE FROM $t WHERE channel_id=?",[$id]);$key=['region_id'=>'regions','user_id'=>'users','role_id'=>'roles'][$col];$vals=is_array($x['rules'][$key]??null)?array_unique(array_map('intval',$x['rules'][$key])):[];foreach($vals as $v)if($v>0)Db::run("INSERT IGNORE INTO $t(channel_id,$col) VALUES(?,?)",[$id,$v]);}
  Db::run('INSERT INTO radio_logs(channel_id,user_id,event_type,meta_json) VALUES(?,?,?,?)',[$id,$me['id'],'admin_save',json_encode(['type'=>$type,'mode'=>$mode],JSON_UNESCAPED_UNICODE)]);j(['ok'=>true,'id'=>$id]);
}
if($op==='delete'&&$method==='POST'){ $id=(int)(b()['id']??0);if(!$id)e('شناسه کانال نامعتبر است');Db::run('DELETE FROM radio_channels WHERE id=?',[$id]);j(['ok'=>true]); }
if($op==='members'&&$method==='GET'){ $id=(int)($_GET['channel_id']??0);$c=Db::one('SELECT * FROM radio_channels WHERE id=?',[$id]);if(!$c)e('کانال یافت نشد',404);$users=Db::all('SELECT u.id,u.first_name,u.last_name,u.username,u.role_id,r.title role_title FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.is_active=1 ORDER BY u.first_name,u.last_name,u.id LIMIT 3000');$out=[];foreach($users as $x){$x['member']=allowed($c,$x);$x['online']=(int)(Db::one('SELECT COUNT(*) n FROM radio_presence WHERE channel_id=? AND user_id=? AND last_seen_at>=DATE_SUB(NOW(),INTERVAL 45 SECOND)',[$id,$x['id']])['n']??0)>0;if($x['member'])$out[]=$x;}j(['ok'=>true,'members'=>$out]); }
if($op==='logs'&&$method==='GET'){ $id=(int)($_GET['channel_id']??0);$rows=Db::all('SELECT l.id,l.event_type,l.meta_json,l.created_at,u.first_name,u.last_name,u.username FROM radio_logs l LEFT JOIN users u ON u.id=l.user_id WHERE (?=0 OR l.channel_id=?) ORDER BY l.id DESC LIMIT 200',[$id,$id]);j(['ok'=>true,'logs'=>$rows]); }
e('عملیات مدیریت بی‌سیم نامعتبر است',404);
