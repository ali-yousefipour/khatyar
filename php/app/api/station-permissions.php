<?php
/** Dedicated station-feature permission store. The admin UI uses this table as the source of truth. */
require_once __DIR__ . '/../auth.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
$user = require_auth();
$pdo = $GLOBALS['pdo'] ?? null;
if (!$pdo) { http_response_code(500); echo json_encode(['error'=>'DB unavailable'], JSON_UNESCAPED_UNICODE); exit; }
function station_is_admin($u){return !empty($u['is_admin'])||in_array((string)($u['role']??''),['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد','admin','superadmin'],true);}
function station_schema($pdo){$pdo->exec("CREATE TABLE IF NOT EXISTS station_app_permissions (role_id VARCHAR(120) PRIMARY KEY,role_title VARCHAR(190) NULL,enabled TINYINT(1) NOT NULL DEFAULT 0,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");}
station_schema($pdo);
$method=$_SERVER['REQUEST_METHOD']??'GET';
if($method==='GET'){
  if(!station_is_admin($user)){$rid=(string)($user['role_id']??$user['role']??'');$st=$pdo->prepare("SELECT enabled FROM station_app_permissions WHERE role_id=? LIMIT 1");$st->execute([$rid]);echo json_encode(['allowed'=>(bool)$st->fetchColumn(),'role_id'=>$rid],JSON_UNESCAPED_UNICODE);exit;}
  $roles=[];try{foreach($pdo->query("SELECT id,title FROM roles ORDER BY id") as $r)$roles[]=['id'=>(string)$r['id'],'title'=>(string)$r['title']];}catch(Throwable $e){}
  $cfg=[];$q=$pdo->query("SELECT role_id,role_title,enabled FROM station_app_permissions");foreach($q as $r)$cfg[(string)$r['role_id']]=(bool)$r['enabled'];
  echo json_encode(['roles'=>$roles,'permissions'=>$cfg,'key'=>'StationCapture'],JSON_UNESCAPED_UNICODE);exit;
}
if($method==='POST'){
  if(!station_is_admin($user)){http_response_code(403);echo json_encode(['error'=>'دسترسی غیرمجاز'],JSON_UNESCAPED_UNICODE);exit;}
  $in=json_decode(file_get_contents('php://input'),true)?:[];$permissions=$in['permissions']??[];if(!is_array($permissions)){http_response_code(422);echo json_encode(['error'=>'تنظیمات سمت‌ها نامعتبر است'],JSON_UNESCAPED_UNICODE);exit;}
  $roleTitles=[];try{foreach($pdo->query("SELECT id,title FROM roles") as $r)$roleTitles[(string)$r['id']]=(string)$r['title'];}catch(Throwable $e){}
  $st=$pdo->prepare("INSERT INTO station_app_permissions(role_id,role_title,enabled) VALUES(?,?,?) ON DUPLICATE KEY UPDATE role_title=VALUES(role_title),enabled=VALUES(enabled)");
  foreach($roleTitles as $rid=>$title)$st->execute([$rid,$title,!empty($permissions[$rid])?1:0]);
  // Compatibility mirror for installed Android builds whose dashboard still consumes /my/app-items.
  // The administrator-facing control remains the dedicated station_app_permissions table above.
  try{
    $row=$pdo->query("SELECT value FROM app_settings WHERE `key`='role_app_items' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
    $legacy=$row?json_decode($row['value'],true):[];if(!is_array($legacy))$legacy=[];
    foreach($roleTitles as $rid=>$title){$enabled=!empty($permissions[$rid]);if(!array_key_exists($rid,$legacy)||!is_array($legacy[$rid]))$legacy[$rid]=[];$legacy[$rid]=array_values(array_filter($legacy[$rid],fn($x)=>(string)$x!=='LineLocation'&&(string)$x!=='StationCapture'&&(string)$x!=='MyStations'));if($enabled){$legacy[$rid][]='StationCapture';$legacy[$rid][]='MyStations';}}
    $js=json_encode($legacy,JSON_UNESCAPED_UNICODE);$up=$pdo->prepare("INSERT INTO app_settings(`key`,`value`) VALUES('role_app_items',?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)");$up->execute([$js]);
  }catch(Throwable $e){error_log('station permission compatibility mirror: '.$e->getMessage());}
  echo json_encode(['ok'=>true],JSON_UNESCAPED_UNICODE);exit;
}
http_response_code(405);echo json_encode(['error'=>'Method not allowed'],JSON_UNESCAPED_UNICODE);
