<?php
/* خطیار — بارگذاری فایل JPG خودرو/موتورسیکلت پرسنل */
declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors','0');
date_default_timezone_set('Asia/Tehran');
header('Content-Type: application/json; charset=utf-8');
$ROOT=__DIR__.'/../../';
require "$ROOT/lib/Db.php";
require "$ROOT/lib/Jwt.php";
require "$ROOT/lib/Http.php";
$CONFIG=require "$ROOT/config.php";

function pvu_json($data,int $status=200): void { http_response_code($status); echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); exit; }
function pvu_fail(string $message,int $status=400): void { pvu_json(['ok'=>false,'error'=>$message],$status); }
function pvu_auth(): array {
  global $CONFIG;
  $tok=Http::bearer();
  $payload=$tok?Jwt::verify($tok,$CONFIG['jwt_secret']):null;
  if(!$payload||empty($payload['sub']))pvu_fail('توکن نامعتبر یا منقضی است',401);
  $u=Db::one("SELECT u.id,u.is_active,u.is_admin,r.title role_title,r.level role_level FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.id=? LIMIT 1",[$payload['sub']]);
  if(!$u||!(int)$u['is_active'])pvu_fail('کاربر نامعتبر است',401);
  return $u;
}
function pvu_photo_keys(string $type): array {
  return $type==='motorcycle'
    ? ['motor_front','motor_back','motor_right','motor_left','motor_card_front','motor_card_back','green_card','insurance','license_front','license_back']
    : ['car_front','car_back','car_right','car_left','license_front','license_back','vehicle_card_front','vehicle_card_back','technical_inspection','insurance','green_card'];
}
function pvu_safe_key(string $key): string { return preg_replace('/[^a-zA-Z0-9_-]/','',$key)??''; }
function pvu_public_base(): string {
  $https=!empty($_SERVER['HTTPS'])&&strtolower((string)$_SERVER['HTTPS'])!=='off';
  $scheme=$https?'https':'http';
  $host=(string)($_SERVER['HTTP_HOST']??'');
  if($host==='')return '';
  return $scheme.'://'.$host;
}

try {
  $u=pvu_auth();
  $assetId=(int)($_POST['asset_id']??0);
  $type=(string)($_POST['asset_type']??'');
  $photoKey=pvu_safe_key((string)($_POST['photo_key']??''));
  if(!$assetId||!in_array($type,['car','motorcycle'],true)||!in_array($photoKey,pvu_photo_keys($type),true))pvu_fail('پارامترهای بارگذاری تصویر نامعتبر است');

  $asset=Db::one('SELECT id,user_id,asset_type FROM personnel_vehicle_assets WHERE id=? LIMIT 1',[$assetId]);
  if(!$asset)pvu_fail('وسیله یافت نشد',404);
  if((int)$asset['user_id']!==(int)$u['id'] && !(int)($u['is_admin']??0))pvu_fail('دسترسی بارگذاری این تصویر مجاز نیست',403);
  if((string)$asset['asset_type']!==$type)pvu_fail('نوع وسیله با پرونده مطابقت ندارد');

  if(empty($_FILES['file'])||!is_array($_FILES['file']))pvu_fail('فایل تصویر ارسال نشده است');
  $file=$_FILES['file'];
  if((int)($file['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK)pvu_fail('بارگذاری فایل تصویر ناموفق بود');
  $size=(int)($file['size']??0);
  if($size<=0||$size>10*1024*1024)pvu_fail('حجم تصویر باید حداکثر ۱۰ مگابایت باشد');
  $tmp=(string)($file['tmp_name']??'');
  if($tmp===''||!is_uploaded_file($tmp))pvu_fail('فایل بارگذاری‌شده معتبر نیست');

  $info=@getimagesize($tmp);
  if(!is_array($info)||empty($info[0])||empty($info[1]))pvu_fail('فایل تصویر معتبر نیست');
  $mime=(string)($info['mime']??'');
  if(!in_array($mime,['image/jpeg','image/jpg'],true))pvu_fail('تصویر باید JPG باشد');

  $root=dirname(__DIR__,2).'/uploads/personnel-vehicle-assets/'.(int)$asset['user_id'];
  if(!is_dir($root)&&!mkdir($root,0755,true)&&!is_dir($root))pvu_fail('ایجاد پوشه ذخیره تصویر ممکن نشد',500);
  $filename=(int)$assetId.'_'.$photoKey.'.jpg';
  $target=$root.'/'.$filename;
  if(!move_uploaded_file($tmp,$target))pvu_fail('ذخیره فایل تصویر روی سرور انجام نشد',500);

  $relative='/uploads/personnel-vehicle-assets/'.(int)$asset['user_id'].'/'.$filename;
  $base=pvu_public_base();
  $publicUrl=$base!==''?$base.$relative:$relative;
  $cropMeta=(string)($_POST['crop_meta']??'');
  if($cropMeta!=='')json_decode($cropMeta,true);
  if($cropMeta!==''&&json_last_error()!==JSON_ERROR_NONE)$cropMeta='';

  Db::run("INSERT INTO personnel_vehicle_asset_photos(asset_id,photo_key,data_uri,crop_json) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE data_uri=VALUES(data_uri),crop_json=VALUES(crop_json),updated_at=CURRENT_TIMESTAMP",[$assetId,$photoKey,$publicUrl,$cropMeta!==''?$cropMeta:null]);
  pvu_json(['ok'=>true,'asset_id'=>$assetId,'photo_key'=>$photoKey,'data_uri'=>$publicUrl,'path'=>$relative]);
} catch(Throwable $e) {
  error_log('personnel-vehicle-asset-upload: '.$e->getMessage().' @ '.$e->getFile().':'.$e->getLine());
  pvu_fail('خطای داخلی در ذخیره تصویر: '.$e->getMessage(),500);
}
