<?php
class Http {
  // توکن معتبر همین درخواست (توسط index.php بعد از احراز هویت ست می‌شود).
  // برای این استفاده می‌شود که URLهای /api/media?path=... که در پاسخ JSON
  // ساخته می‌شوند (مثلاً عکس پرسنلی، تصویر پلاک)، به‌صورت خودکار توکن بگیرند؛
  // چون تگ <img> مرورگر امکان ارسال هدر Authorization را ندارد و بدون این کار،
  // بعد از الزامی‌شدن احراز هویت روی /api/media، پیش‌نمایش تصاویر در پنل می‌شکند.
  public static $currentToken = null;

  public static function body() {
    $len = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    $max = 5 * 1024 * 1024; // حداکثر بدنه JSON: 5MB
    if ($len > $max) self::error('حجم درخواست بیش از حد مجاز است', 413);
    // برخی هاست‌ها/فایروال‌های امنیتی (WAF) درخواست‌های POST با بدنهٔ JSON را به مسیرهای
    // حساس (مثل ورود) مسدود می‌کنند و یک صفحهٔ خطای HTML/403 برمی‌گردانند، در حالی‌که همان
    // درخواست با Content-Type فرم معمولی (application/x-www-form-urlencoded) به‌درستی عبور
    // می‌کند (این را با تست curl مستقیم روی سرور واقعی تأیید کردیم). برای همین، اگر
    // Content-Type درخواست از نوع فرم باشد، از $_POST (که PHP خودش این نوع بدنه را پارس
    // می‌کند) استفاده می‌شود؛ در غیر این صورت مثل قبل JSON خوانده می‌شود.
    $contentType = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
    if (strpos($contentType, 'application/x-www-form-urlencoded') !== false) {
      return is_array($_POST) ? $_POST : [];
    }
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) return [];
    $j = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) self::error('فرمت JSON نامعتبر است', 400);
    return is_array($j) ? $j : [];
  }
  // به‌صورت بازگشتی رشته‌های /api/media?path=... را با توکن همین درخواست تکمیل می‌کند.
  private static function stampMediaUrls($data) {
    if (is_array($data)) {
      foreach ($data as $k => $v) $data[$k] = self::stampMediaUrls($v);
      return $data;
    }
    if (is_string($data) && self::$currentToken && strpos($data, '/api/media?path=') === 0 && strpos($data, 'token=') === false) {
      return $data . '&token=' . urlencode(self::$currentToken);
    }
    return $data;
  }
  public static function json($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    if (self::$currentToken) $data = self::stampMediaUrls($data);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
  }
  public static function error($msg, $code = 400) { self::json(['error' => $msg], $code); }
  public static function bearer() {
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    if (!$h && function_exists('apache_request_headers')) {
      $hdrs = apache_request_headers();
      $h = $hdrs['Authorization'] ?? ($hdrs['authorization'] ?? '');
    }
    if (stripos($h, 'Bearer ') === 0) return substr($h, 7);
    // پشتیبانی محدود از توکن در query فقط برای دانلودهای GET که مرورگر امکان ارسال هدر Authorization ندارد.
    // برای کاهش ریسک نشت توکن در لاگ/Referer، در سایر مسیرها مجاز نیست.
    if (!empty($_GET['token'])) {
      $path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '';
      $allowed = [
        '#^/api/admin/[^/]+/export$#', '#^/api/admin/.*/export$#', '#^/api/reports/export$#',
        '#^/api/admin/backup$#', '#^/api/admin/backup-json$#', '#^/api/media$#'
      ];
      if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
        foreach ($allowed as $re) if (preg_match($re, $path)) return $_GET['token'];
      }
    }
    return null;
  }
}
