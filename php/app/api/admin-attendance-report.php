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

error_reporting(E_ALL);
ini_set('display_errors', '1'); // خطیار: موقتاً برای عیب‌یابی فعال شد؛ بعد از پیداکردن علت واقعی باید به '0' برگردد.
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
  // خطیار: این‌جا دقیقاً همان require هایی که app/index.php پیش از بارگذاری routes.php انجام می‌دهد تکرار شده‌اند.
  // نسخهٔ قبلی این فایل فقط Db/Jwt/Http را می‌آورد؛ چون _attendance_report() واقعاً از ShiftCalc:: استفاده می‌کند
  // (که این‌جا اصلاً require نشده بود)، هر فراخوانی با خطای «کلاس ShiftCalc یافت نشد» شکست می‌خورد — این خطا چون
  // داخل try/catch رخ می‌داد به‌صورت یک JSON 500 تمیز برمی‌گشت، نه یک کرش خام، برای همین در نگاه اول نامرئی بود.
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
  // خطیار: چون علت دقیق خطا با بررسی کد به‌تنهایی پیدا نشد و بعد از استقرار کامل هم باز تکرار شده،
  // موقتاً پیام واقعی خطا (نوع، متن، فایل و خط) مستقیم در پاسخ برگردانده می‌شود — فقط برای عیب‌یابی همین مرحله.
  // بعد از پیداکردن و رفع علت واقعی، این بخش باید به همان پیام کلی قبلی برگردد.
  aar_error('خطای داخلی: ' . get_class($e) . ': ' . $e->getMessage() . ' (فایل: ' . basename($e->getFile()) . ' خط ' . $e->getLine() . ')', 500);
}
