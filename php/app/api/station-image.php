<?php
ini_set('display_errors','0'); error_reporting(E_ALL);
require dirname(__DIR__, 2).'/lib/Db.php'; require dirname(__DIR__, 2).'/lib/Jwt.php'; $CFG=require dirname(__DIR__, 2).'/config.php';
function image_fail($s,$m){http_response_code($s);header('Content-Type: application/json; charset=utf-8');echo json_encode(['error'=>$m],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;}
$h=$_SERVER['HTTP_AUTHORIZATION']??'';$q=(string)($_GET['access_token']??'');$raw='';if(preg_match('/Bearer\s+(.+)/i',$h,$m))$raw=trim($m[1]);elseif($q!=='')$raw=$q;else image_fail(401,'توکن نامعتبر است');
$p=Jwt::verify($raw,$CFG['jwt_secret']);if(!$p)image_fail(401,'توکن منقضی یا نامعتبر است');
$u=Db::one("SELECT u.id,u.is_active,r.title role_title,r.is_admin FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?",[$p['sub']]);if(!$u||!$u['is_active'])image_fail(401,'کاربر نامعتبر است');
$admin=!empty($u['is_admin'])||in_array($u['role_title']??'', ['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد'],true);
$sign=(int)($_GET['sign_id']??0);$station=(int)($_GET['station_id']??0);if(!$sign&&!$station)image_fail(400,'شناسه تصویر مشخص نشده است');
if($sign)$row=Db::one("SELECT sg.photo_path,s.line_id FROM line_station_signs sg JOIN line_station_locations s ON s.id=sg.station_location_id WHERE sg.id=?",[$sign]);
else $row=Db::one("SELECT location_photo_path photo_path,line_id FROM line_station_locations WHERE id=?",[$station]);
if(!$row||empty($row['photo_path']))image_fail(404,'تصویر یافت نشد');
if(!$admin){$ok=Db::one('SELECT 1 x FROM user_lines WHERE user_id=? AND line_id=?',[$u['id'],$row['line_id']]);if(!$ok)image_fail(403,'دسترسی به تصویر این خط ندارید');}
$rel='/' . ltrim(str_replace('\\','/',(string)$row['photo_path']),'/');if(strpos($rel,'/uploads/line-locations/')!==0||strpos($rel,'..')!==false)image_fail(404,'مسیر تصویر نامعتبر است');
$base=realpath(dirname(__DIR__).'/uploads/line-locations');$file=realpath(dirname(__DIR__).$rel);if(!$base||!$file||strpos($file,$base.DIRECTORY_SEPARATOR)!==0||!is_file($file))image_fail(404,'فایل تصویر یافت نشد');
$mime=function_exists('mime_content_type')?mime_content_type($file):'image/jpeg';if(stripos($mime,'image/')!==0)image_fail(415,'فایل تصویر معتبر نیست');
header('Content-Type: '.$mime);header('Content-Length: '.filesize($file));header('Cache-Control: private, max-age=3600');readfile($file);exit;
