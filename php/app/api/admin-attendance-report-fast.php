<?php
/* خطیار — درگاه سریع گزارش تردد پرسنل
 * هدف: حفظ همان گزارش واقعی موجود، ولی جلوگیری از اسکن‌های تکراری staff_attendance با ایندکس مناسب.
 */
ini_set('display_errors','0');
date_default_timezone_set('Asia/Tehran');
require_once __DIR__.'/../../lib/Db.php';
require_once __DIR__.'/../../lib/Jwt.php';
require_once __DIR__.'/../../lib/Http.php';
require_once __DIR__.'/../../lib/Push.php';
require_once __DIR__.'/../../lib/Sms.php';
require_once __DIR__.'/../../lib/Bale.php';
require_once __DIR__.'/../../lib/MessengerBots.php';
if(is_file(__DIR__.'/../../lib/CloudOcr.php')) require_once __DIR__.'/../../lib/CloudOcr.php';
require_once __DIR__.'/../../lib/ShiftCalc.php';
require_once __DIR__.'/../../lib/Media.php';
require_once __DIR__.'/../../lib/XlsxWriter.php';
require_once __DIR__.'/../../lib/Backup.php';
if(is_file(__DIR__.'/../../lib/DeliveryQueue.php')) require_once __DIR__.'/../../lib/DeliveryQueue.php';
$CONFIG=require __DIR__.'/../../config.php';

$tok=Http::bearer();
$payload=$tok?Jwt::verify($tok,$CONFIG['jwt_secret']):null;
if(!$payload||empty($payload['sub'])) Http::error('توکن منقضی یا نامعتبر است',401);
$u=Db::one("SELECT u.id,u.username,u.first_name,u.last_name,u.role_id,r.title AS role_title,r.level,r.is_admin,u.is_active,u.email,u.photo,u.photo_path FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=? LIMIT 1",[$payload['sub']]);
if(!$u||!(int)$u['is_active']) Http::error('کاربر نامعتبر',401);
$dt=$payload['dt']??'web';
$sess=Db::one("SELECT device_id,revoked_at FROM user_sessions WHERE user_id=? AND device_type=? LIMIT 1",[$u['id'],$dt]);
$unlimited=in_array($u['role_title'],['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد'],true);
if(!$sess||$sess['revoked_at']||(!$unlimited&&$sess['device_id']!==($payload['device_id']??''))) Http::error('نشست منقضی یا باطل شده است',401);
if(empty($u['is_admin'])) Http::error('دسترسی مدیریتی لازم است',403);

// ایندکس idempotent برای کوئری اصلی گزارش: user_id + check_in.
// در دیتابیس‌های بزرگ، نبود این ایندکس باعث اسکن کامل staff_attendance برای هر روز ماه می‌شد.
try {
  $idx=Db::one("SELECT COUNT(*) c FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='staff_attendance' AND INDEX_NAME='idx_staff_attendance_user_checkin'");
  if((int)($idx['c']??0)===0) Db::run("ALTER TABLE staff_attendance ADD INDEX idx_staff_attendance_user_checkin (user_id,check_in)");
} catch(Throwable $e) { error_log('attendance report index: '.$e->getMessage()); }

// توابع گزارش واقعی پروژه را reuse می‌کنیم تا محاسبه شیفت، تعطیلات، اضافه‌کار و جزئیات پانچ تغییر نکند.
require_once __DIR__.'/../../lib/routes.php';

$uid=(int)($_GET['user_id']??0);
$from=trim($_GET['from']??'');
$to=trim($_GET['to']??'');
if(!$uid||!$from||!$to) Http::error('پرسنل و بازهٔ تاریخ را مشخص کنید',400);
$result=_attendance_report($uid,$from,$to);
header('Content-Type: application/json; charset=utf-8');
echo json_encode($result,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
exit;
