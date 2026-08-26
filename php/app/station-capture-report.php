<?php
ini_set('display_errors','0'); error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store');
$R=__DIR__.'/..'; require "$R/lib/Db.php"; require "$R/lib/Jwt.php"; $CFG=require "$R/config.php";
function scr_json($x,$s=200){http_response_code($s);echo json_encode($x,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;}
function scr_err($m,$s=400){scr_json(['error'=>$m],$s);}
function scr_user(){global $CFG;$h=$_SERVER['HTTP_AUTHORIZATION']??'';if(!preg_match('/Bearer\s+(.+)/i',$h,$m))scr_err('توکن نامعتبر است',401);$p=Jwt::verify(trim($m[1]),$CFG['jwt_secret']);if(!$p)scr_err('توکن منقضی یا نامعتبر است',401);$u=Db::one("SELECT u.id,u.role_id,u.is_active,r.title role_title,r.is_admin FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?",[$p['sub']]);if(!$u||!$u['is_active'])scr_err('کاربر نامعتبر است',401);return $u;}
function scr_admin($u){return !empty($u['is_admin'])||in_array($u['role_title']??'', ['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد'],true);}
$u=scr_user(); if(!scr_admin($u))scr_err('دسترسی گزارش ایستگاه‌ها ندارید',403);
$status=trim((string)($_GET['station_status']??''));$type=(int)($_GET['type_id']??0);$from=trim((string)($_GET['from']??''));$to=trim((string)($_GET['to']??''));
$where=[];$args=[];
if($status!==''){$where[]='s.station_status=?';$args[]=$status;}
if($type>0){$where[]='sg.sign_type_id=?';$args[]=$type;}
if($from!==''){$where[]='DATE(s.captured_at)>=?';$args[]=$from;}
if($to!==''){$where[]='DATE(s.captured_at)<=?';$args[]=$to;}
$w=$where?' WHERE '.implode(' AND ',$where):'';
try{$rows=Db::all("SELECT s.id,s.line_id,s.station_code,s.station_status,s.station_name,s.latitude,s.longitude,s.accuracy_m,s.captured_at,l.code line_code,l.origin,l.destination,t.id sign_type_id,t.title sign_type,sg.photo_path,CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,'')) captured_by,(SELECT COUNT(*) FROM line_station_signs sx WHERE sx.station_location_id=s.id) sign_count FROM line_station_locations s JOIN `lines` l ON l.id=s.line_id LEFT JOIN line_station_signs sg ON sg.station_location_id=s.id LEFT JOIN station_sign_types t ON t.id=sg.sign_type_id LEFT JOIN users u ON u.id=s.captured_by $w ORDER BY s.captured_at DESC,sg.id ASC",$args);scr_json($rows);}catch(Throwable $e){scr_err('خطا در گزارش ثبت‌های ایستگاه: '.$e->getMessage(),500);}
