<?php
/* خطیار — ثبت/اصلاح/حذف تردد دستی از گزارش تردد پرسنل */
ini_set('display_errors','0');
error_reporting(E_ALL);
date_default_timezone_set('Asia/Tehran');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$ROOT=dirname(__DIR__,2);
require_once $ROOT.'/lib/Db.php';
require_once $ROOT.'/lib/Jwt.php';
require_once $ROOT.'/lib/Http.php';
require_once $ROOT.'/lib/IranCalendar.php';
$CONFIG=require_once $ROOT.'/config.php';

function apj($v,$status=200){http_response_code($status);echo json_encode($v,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;}
function ape($m,$s=400){apj(['error'=>$m],$s);}
function digitsLatin($v){
  return strtr(trim((string)$v),['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9']);
}
function normalizeTime($v){
  $s=digitsLatin($v);
  if(!preg_match('/^(\d{1,2}):(\d{2})$/',$s,$m))return null;
  $h=(int)$m[1];$mi=(int)$m[2];
  if($h<0||$h>23||$mi<0||$mi>59)return null;
  return sprintf('%02d:%02d',$h,$mi);
}
function dateTimeFromJTime($jdate,$time){
  $j=IranCalendar::normalize($jdate); if(!$j)return null;
  [$jy,$jm,$jd]=array_map('intval',explode('-',$j));
  [$gy,$gm,$gd]=IranCalendar::toGregorian($jy,$jm,$jd);
  return sprintf('%04d-%02d-%02d %s:00',$gy,$gm,$gd,$time);
}
function addOneDay($dt){
  $x=new DateTime($dt,new DateTimeZone('Asia/Tehran'));$x->modify('+1 day');return $x->format('Y-m-d H:i:s');
}
function authAdmin(){
  global $CONFIG;
  $token=Http::bearer();$payload=$token?Jwt::verify($token,$CONFIG['jwt_secret']):null;
  if(!$payload||empty($payload['sub']))ape('توکن منقضی یا نامعتبر است',401);
  $u=Db::one("SELECT u.id,u.username,u.first_name,u.last_name,u.is_active,u.role_id,r.title AS role_title,r.level,r.is_admin
              FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=? LIMIT 1",[(int)$payload['sub']]);
  if(!$u||!(int)$u['is_active'])ape('کاربر نامعتبر',401);
  $dt=$payload['dt']??'web';
  $sess=Db::one("SELECT device_id,revoked_at FROM user_sessions WHERE user_id=? AND device_type=? LIMIT 1",[(int)$u['id'],$dt]);
  $unlimited=in_array($u['role_title'],['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد'],true);
  if(!$sess||$sess['revoked_at']||(!$unlimited&&$sess['device_id']!==($payload['device_id']??'')))ape('نشست منقضی یا باطل شده است',401);
  if(empty($u['is_admin']))ape('دسترسی مدیریتی لازم است',403);
  return $u;
}
try{
  $actor=authAdmin();
  $method=$_SERVER['REQUEST_METHOD'];
  $body=Http::body();
  $path=rtrim(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH),'/');
  if($method==='POST'){
    $uid=(int)($body['user_id']??0);
    $jdate=IranCalendar::normalize($body['jdate']??'');
    $ci=normalizeTime($body['check_in']??'');
    $coRaw=trim((string)($body['check_out']??''));
    $co=$coRaw!==''?normalizeTime($coRaw):null;
    if(!$uid)ape('کاربر مشخص نشده است',422);
    if(!$jdate)ape('تاریخ شمسی نامعتبر است',422);
    if(!$ci)ape('ساعت ورود نامعتبر است',422);
    if($coRaw!==''&&!$co)ape('ساعت خروج نامعتبر است',422);
    $target=Db::one("SELECT id,is_active FROM users WHERE id=? LIMIT 1",[$uid]);
    if(!$target||!(int)$target['is_active'])ape('کاربر انتخاب‌شده معتبر یا فعال نیست',422);
    $checkIn=dateTimeFromJTime($jdate,$ci);
    if(!$checkIn)ape('تبدیل تاریخ تردد ناموفق بود',422);
    $checkOut=null;
    if($co!==null){
      $checkOut=dateTimeFromJTime($jdate,$co);
      $ciMin=((int)substr($ci,0,2))*60+(int)substr($ci,3,2);
      $coMin=((int)substr($co,0,2))*60+(int)substr($co,3,2);
      if($coMin<=$ciMin)$checkOut=addOneDay($checkOut);
      if($checkOut<=$checkIn)ape('ساعت خروج باید بعد از ورود باشد',422);
    }
    $id=Db::insert("INSERT INTO staff_attendance
      (user_id,check_in,check_out,method,client_check_in,client_check_out,offline_synced,auto_closed)
      VALUES(?,?,?,?,?,?,1,0)",
      [$uid,$checkIn,$checkOut,'manual',$checkIn,$checkOut]);
    apj(['ok'=>true,'id'=>(int)$id,'user_id'=>$uid,'jdate'=>$jdate,'check_in'=>$ci,'check_out'=>$co,'method'=>'manual'],201);
  }
  if(preg_match('#/api/admin/attendance-punch/(\d+)$#',$path,$mm)){
    $id=(int)$mm[1];
    $row=Db::one("SELECT id,user_id,check_in,check_out FROM staff_attendance WHERE id=? LIMIT 1",[$id]);
    if(!$row)ape('تردد پیدا نشد',404);
    if($method==='DELETE'){
      Db::run("DELETE FROM staff_attendance WHERE id=?",[$id]);
      apj(['ok'=>true,'id'=>$id]);
    }
    if($method==='PUT'){
      $ci=normalizeTime($body['check_in']??'');
      $coRaw=trim((string)($body['check_out']??''));
      $co=$coRaw!==''?normalizeTime($coRaw):null;
      if(!$ci)ape('ساعت ورود نامعتبر است',422);
      if($coRaw!==''&&!$co)ape('ساعت خروج نامعتبر است',422);
      $base=new DateTime($row['check_in'],new DateTimeZone('Asia/Tehran'));
      $checkIn=$base->format('Y-m-d').' '.$ci.':00';
      $checkOut=null;
      if($co!==null){
        $checkOut=$base->format('Y-m-d').' '.$co.':00';
        $ciMin=((int)substr($ci,0,2))*60+(int)substr($ci,3,2);
        $coMin=((int)substr($co,0,2))*60+(int)substr($co,3,2);
        if($coMin<=$ciMin)$checkOut=addOneDay($checkOut);
        if($checkOut<=$checkIn)ape('ساعت خروج باید بعد از ورود باشد',422);
      }
      Db::run("UPDATE staff_attendance SET check_in=?,check_out=?,client_check_in=?,client_check_out=?,method='manual',auto_closed=0 WHERE id=?",
        [$checkIn,$checkOut,$checkIn,$checkOut,$id]);
      apj(['ok'=>true,'id'=>$id,'check_in'=>$ci,'check_out'=>$co,'method'=>'manual']);
    }
  }
  ape('روش درخواست پشتیبانی نمی‌شود',405);
}catch(Throwable $e){
  error_log('admin-attendance-punch: '.$e->getMessage().' @ '.$e->getFile().':'.$e->getLine());
  ape('خطای ثبت تردد: '.$e->getMessage(),500);
}
