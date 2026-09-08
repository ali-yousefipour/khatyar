<?php
/* خطیار — گزارش تردد پرسنل (بازنویسی نهایی)
   ------------------------------------------------------------
   تلاش قبلی برای بازنویسی این گزارش، منطق تاریخ را مستقل کرد اما به‌اشتباه فقط بخشی از محاسبات واقعی را
   (تأخیر ورود، زودتر خروج، کارکرد شبانه، مازاد حضور، شیفتِ نیروی جایگزین، تبدیل مازاد به اضافه‌کار) از نو نوشت
   و همان مقادیر را همیشه صفر برمی‌گرداند — یعنی خودِ گزارش دیگر کرش نمی‌کرد ولی داده‌اش ناقص بود.
   منطق واقعی و کامل این محاسبات از قبل و به‌درستی در تابع _attendance_report() (داخل lib/routes.php) پیاده‌سازی
   و تست شده است. به‌جای بازنویسی دوبارهٔ همان منطق (با ریسک اشتباه دوباره)، این فایل اکنون یک لایهٔ نازک و ایمن است:
   فقط routes.php را (با رفع مشکل نبود تابع route() که باعث Fatal Error می‌شد) بارگذاری می‌کند و مستقیماً همان
   تابع اصلی و کامل را صدا می‌زند. همه‌چیز از ابتدای require ها داخل try/catch است تا هر خطای پیش‌بینی‌نشده
   به‌جای صفحهٔ خطای خام ۵۰۰، همیشه یک JSON تمیز برگرداند.
*/

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
  $CONFIG = require "$ROOT/config.php";

  // این فایل خارج از index.php اصلی اجرا می‌شود، پس تابع route() (که routes.php برای ثبت هر مسیر صدا می‌زند)
  // این‌جا تعریف نشده. یک نسخهٔ خنثیِ آن تعریف می‌کنیم تا فقط توابع کمکی routes.php بارگذاری شوند، بدون ثبت واقعی مسیرها.
  if (!function_exists('route')) { function route($m, $p, $fn, $public = false, $minLevel = 99) {} }
  require "$ROOT/lib/routes.php";

  /* ---------- احراز هویت مستقل (چون این فایل از مسیر روتر اصلی عبور نمی‌کند) ---------- */
  function aar_auth() {
    global $CONFIG;
    $token = Http::bearer();
    $payload = $token ? Jwt::verify($token, $CONFIG['jwt_secret']) : null;
    if (!$payload || empty($payload['sub'])) aar_error('توکن منقضی یا نامعتبر است', 401);
    $u = Db::one("SELECT id, is_active, is_admin FROM users WHERE id=? LIMIT 1", [$payload['sub']]);
    if (!$u || !(int)($u['is_active'] ?? 0)) aar_error('کاربر نامعتبر', 401);
    if (empty($u['is_admin'])) aar_error('دسترسی مدیریتی لازم است', 403);
    return $u;
  }

  aar_auth();

  $uid = (int)($_GET['user_id'] ?? 0);
  $from = trim((string)($_GET['from'] ?? ''));
  $to = trim((string)($_GET['to'] ?? ''));
  if (!$uid || !$from || !$to) aar_error('پرسنل و بازهٔ تاریخ را مشخص کنید', 400);

  aar_json(_attendance_report($uid, $from, $to));

} catch (Throwable $e) {
  error_log('admin-attendance-report: ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
  aar_error('خطای داخلی گزارش تردد؛ جزئیات در گزارش خطای سرور ثبت شد.', 500);
}
