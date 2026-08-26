<?php
ini_set('display_errors','0'); error_reporting(E_ALL); header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store');
require dirname(__DIR__,2).'/lib/Db.php'; require dirname(__DIR__,2).'/lib/Jwt.php'; $C=require dirname(__DIR__,2).'/config.php';
function sd_fail($s,$m){http_response_code($s);echo json_encode(['error'=>$m],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;}
$h=$_SERVER['HTTP_AUTHORIZATION']??'';if(!preg_match('/Bearer\s+(.+)/i',$h,$m))sd_fail(401,'توکن نامعتبر است');$p=Jwt::verify(trim($m[1]),$C['jwt_secret']);if(!$p)sd_fail(401,'توکن منقضی یا نامعتبر است');
$u=Db::one("SELECT u.id,u.is_active,r.title role_title,r.is_admin FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?",[$p['sub']]);if(!$u||!$u['is_active'])sd_fail(401,'کاربر نامعتبر است');
$id=(int)($_GET['station_id']??0);if(!$id)sd_fail(400,'شناسه ایستگاه مشخص نشده است');
$s=Db::one("SELECT s.*,l.code line_code,l.origin,l.destination,CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,'')) captured_by_name FROM line_station_locations s JOIN `lines` l ON l.id=s.line_id LEFT JOIN users u ON u.id=s.captured_by WHERE s.id=?",[$id]);if(!$s)sd_fail(404,'ایستگاه یافت نشد');
$admin=!empty($u['is_admin'])||in_array($u['role_title']??'', ['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد'],true);if(!$admin){$ok=Db::one('SELECT 1 x FROM user_lines WHERE user_id=? AND line_id=?',[$u['id'],$s['line_id']]);if(!$ok)sd_fail(403,'دسترسی به این خط ندارید');}
$signs=Db::all("SELECT z.id,z.sign_type_id,t.title,t.code,z.photo_path,z.created_at FROM line_station_signs z JOIN station_sign_types t ON t.id=z.sign_type_id WHERE z.station_location_id=? ORDER BY z.id",[$id]);
foreach($signs as &$z)$z['photo_url']='/api/station-image.php?sign_id='.(int)$z['id'];unset($z);
$s['location_photo_url']='/api/station-image.php?station_id='.$id;$s['signs']=$signs;echo json_encode($s,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
