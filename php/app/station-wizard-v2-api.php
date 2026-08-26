<?php
ini_set('display_errors','0'); error_reporting(E_ALL); date_default_timezone_set('Asia/Tehran');
header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store, max-age=0');
require_once __DIR__.'/auth.php';
$u=require_auth();
function sw2j($v){return json_encode($v,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);}
$op=$_GET['op']??'permission';
if($op==='permission'){
  $pdo=$GLOBALS['pdo']??null;
  if(!$pdo){http_response_code(500);echo sw2j(['error'=>'DB unavailable']);exit;}
  $pdo->exec("CREATE TABLE IF NOT EXISTS station_app_permissions (role_id VARCHAR(120) PRIMARY KEY,role_title VARCHAR(190) NULL,enabled TINYINT(1) NOT NULL DEFAULT 0,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  $isAdmin=!empty($u['is_admin'])||in_array((string)($u['role']??''),['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد','admin','superadmin'],true);
  $rid=(string)($u['role_id']??$u['role']??'');
  $st=$pdo->prepare('SELECT enabled FROM station_app_permissions WHERE role_id=? LIMIT 1');$st->execute([$rid]);$row=$st->fetchColumn();
  echo sw2j(['allowed'=>$isAdmin||($row!==false?(bool)$row:true),'role_id'=>$rid]);exit;
}
require __DIR__.'/station-wizard-api.php';
