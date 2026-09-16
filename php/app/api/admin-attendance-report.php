<?php
/* خطیار — گزارش تردد پرسنل
   این endpoint مستقل است تا گزارش تردد در صورت تفاوت schema نصب‌های قدیمی نیز پایدار بماند.
*/
error_reporting(E_ALL);
ini_set('display_errors', '0');
date_default_timezone_set('Asia/Tehran');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

function aar_json($v, $status = 200) {
  http_response_code($status);
  echo json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
function aar_error($message, $status = 400) { aar_json(['error' => $message], $status); }

try {
  $ROOT = __DIR__ . '/../../';
  require "$ROOT/lib/Db.php";
  require "$ROOT/lib/Jwt.php";
  require "$ROOT/lib/Http.php";
  require "$ROOT/lib/Push.php";
  require "$ROOT/lib/Sms.php";
  require "$ROOT/lib/Bale.php";
  require "$ROOT/lib/MessengerBots.php";
  if (is_file("$ROOT/lib/CloudOcr.php")) require "$ROOT/lib/CloudOcr.php";
  require "$ROOT/lib/ShiftCalc.php";
  require "$ROOT/lib/Media.php";
  require "$ROOT/lib/XlsxWriter.php";
  require "$ROOT/lib/Backup.php";
  if (is_file("$ROOT/lib/DeliveryQueue.php")) require "$ROOT/lib/DeliveryQueue.php";
  $CONFIG = require "$ROOT/config.php";

  // routes.php تابع route() را هنگام load کردن مسیرها صدا می‌زند؛ در این endpoint
  // فقط توابع کمکی آن لازم است و خود مسیرها ثبت نمی‌شوند.
  if (!function_exists('route')) { function route($m, $p, $fn, $public = false, $minLevel = 99) {} }
  require "$ROOT/lib/routes.php";

  $token = Http::bearer();
  $payload = $token ? Jwt::verify($token, $CONFIG['jwt_secret']) : null;
  if (!$payload || empty($payload['sub'])) aar_error('توکن منقضی یا نامعتبر است', 401);

  // نصب‌های قدیمی ممکن است users.is_admin نداشته باشند. طبق ساختار فعلی پروژه
  // پرچم مدیریتی در roles.is_admin قرار دارد؛ بنابراین احراز هویت گزارش نباید
  // به ستون حذف/نشده users.is_admin وابسته باشد.
  $u = Db::one(
    "SELECT u.id,u.is_active,u.role_id,r.level,r.is_admin AS is_admin,r.title AS role_title
       FROM users u
       JOIN roles r ON r.id=u.role_id
      WHERE u.id=? LIMIT 1",
    [$payload['sub']]
  );
  if (!$u || !(int)($u['is_active'] ?? 0)) aar_error('کاربر نامعتبر', 401);
  if (empty($u['is_admin'])) aar_error('دسترسی مدیریتی لازم است', 403);

  $uid = (int)($_GET['user_id'] ?? 0);
  $from = trim((string)($_GET['from'] ?? ''));
  $to = trim((string)($_GET['to'] ?? ''));
  if (!$uid || !$from || !$to) aar_error('پرسنل و بازهٔ تاریخ را مشخص کنید', 400);

  aar_json(_attendance_report($uid, $from, $to));
} catch (Throwable $e) {
  error_log('admin-attendance-report: ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
  aar_error('خطای داخلی: ' . get_class($e) . ': ' . $e->getMessage() . ' (فایل: ' . basename($e->getFile()) . ' خط ' . $e->getLine() . ')', 500);
}
