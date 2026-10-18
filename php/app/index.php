<?php
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
error_reporting(E_ALL);
register_shutdown_function(function () {
  $err = error_get_last();
  if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR], true)) {
    if (!headers_sent()) { http_response_code(500); header('Content-Type: application/json; charset=utf-8'); }
    while (ob_get_level() > 0) { @ob_end_clean(); }
    $debug = getenv('API_DEBUG') === '1'; $out = ['error' => 'خطای داخلی سرور'];
    if ($debug) { $out['detail'] = $err['message']; $out['file'] = basename($err['file']); $out['line'] = $err['line']; }
    echo json_encode($out, JSON_UNESCAPED_UNICODE);
  }
});
if (!headers_sent() && extension_loaded('zlib') && !ini_get('zlib.output_compression')) { @ob_start('ob_gzhandler'); }
$ROOT = __DIR__ . '/..';
require "$ROOT/lib/Db.php"; require "$ROOT/lib/Jwt.php"; require "$ROOT/lib/Http.php"; require "$ROOT/lib/Push.php"; require "$ROOT/lib/Sms.php"; require "$ROOT/lib/Bale.php"; require "$ROOT/lib/MessengerBots.php";
if (is_file("$ROOT/lib/CloudOcr.php")) require "$ROOT/lib/CloudOcr.php";
require "$ROOT/lib/ShiftCalc.php"; require "$ROOT/lib/Media.php"; require "$ROOT/lib/XlsxWriter.php"; require "$ROOT/lib/Backup.php";
if (is_file("$ROOT/lib/DeliveryQueue.php")) require "$ROOT/lib/DeliveryQueue.php";
if (is_file("$ROOT/lib/SubstituteShift.php")) require "$ROOT/lib/SubstituteShift.php";
$CONFIG = require "$ROOT/config.php";
header('X-Content-Type-Options: nosniff'); header('X-Frame-Options: SAMEORIGIN'); header("Content-Security-Policy: frame-ancestors 'self'"); header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(self), microphone=(self), geolocation=(self)'); header('Cross-Origin-Resource-Policy: same-origin');
if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
if (strpos($_SERVER['REQUEST_URI'] ?? '', '/api') === 0) header('Cache-Control: no-store, max-age=0');
$allowed = array_filter([$CONFIG['public_url'] ?: 'https://app.yousefipour.ir', 'https://admin.yousefipour.ir']); $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && in_array($origin, $allowed, true)) header('Access-Control-Allow-Origin: ' . $origin); header('Vary: Origin'); header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Access-Token, X-Requested-With'); header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
$method = $_SERVER['REQUEST_METHOD']; $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH); $path = rtrim($path, '/'); if ($path === '') $path = '/';
if ($path === '/health' || $path === '/api/health') {
  $db_ok = false; try { Db::pdo()->query('SELECT 1'); $db_ok = true; } catch (Throwable $e) { error_log('health db: ' . $e->getMessage()); }
  $siteV = '1.5.10'; $appV = '1.5.10';
  Http::json(['ok' => true, 'installed' => is_file("$ROOT/.installed"), 'db' => $db_ok, 'site_version' => $siteV, 'app_version' => $appV, 'api_build' => '2026-10-12-v238-gps-work-accounting', 'release_notes' => ['version' => '1.5.10', 'title' => 'تغییرات نسخه ۱.5.10', 'items' => ['بهبود ثبت حضور و خروج در حالت آفلاین و همگام‌سازی پس از اتصال', 'نمایش شیفت کاری ماه جاری در ثبت حضور من', 'افزوده شدن یادآور ثبت خروج پس از ۸ ساعت کارکرد', 'بهبود ویزارد ثبت بازدید سرویس مدارس و ورود پلاک', 'اصلاح نمایش منوی سرویس مدارس و کش پنل وب', 'بهبود ناتیفیکیشن بی‌سیم و نمایش صحیح در حالت تاریک', 'اصلاح عملکرد PTT با دکمه افزایش صدا', 'اصلاح اعلام صوتی کانال ۵', 'حذف آیتم وضعیت ایمنی و موقعیت دستگاه از داشبورد', 'محاسبه کسر کار برای بازه‌های فاقد تأیید GPS یا توقف برنامه', 'نمایش کسر کار GPS/برنامه در کارکرد روزانه', 'الزام به‌روزرسانی فقط بر اساس حداقل نسخه تعیین‌شده در تنظیمات سایت', 'رفع قفل‌شدن نسخه‌های قبلی در صورت اعلام نسخه جدید یا نامعتبر بودن لینک APK'], 'download_url' => 'https://github.com/ali-yousefipour/khatyar/releases/latest/download/khatyar.apk', 'release_url' => 'https://github.com/ali-yousefipour/khatyar/releases/latest', 'apk_asset' => 'khatyar.apk']]);
}
if (strpos($path, '/api') !== 0) {
  if ($path === '/' || $path === '/index.php') { header('Cache-Control: no-cache, must-revalidate'); readfile(__DIR__ . '/panel.html'); exit; }
  if ($path === '/app' || $path === '/app.html') {
    header('Cache-Control: no-cache, must-revalidate'); $html = @file_get_contents(__DIR__ . '/app.html');
    if ($html === false) { http_response_code(500); echo 'Web App unavailable'; exit; }
    $tag = '<script src="/assets/version-badge.js?v=20260905.12" defer></script>';
    if (stripos($html, '</head>') !== false) $html = preg_replace('~</head>~i', $tag . '</head>', $html, 1); else $html .= $tag;
    header('Content-Type: text/html; charset=utf-8'); echo $html; exit;
  }
  http_response_code(404); echo 'Not Found'; exit;
}
// IMPORTANT: do not reconcile substitute shifts in the global request bootstrap.\n// That routine performs schema writes and scans request data; running it before every\n// API request can block login and health checks. Reconciliation is handled by its\n// dedicated workflow instead of the authentication/request bootstrap.\n$routes = [];
function route($m, $p, $fn, $public = false, $minLevel = 99) { global $routes; $routes[] = compact('m', 'p', 'fn', 'public', 'minLevel'); }
function nid($v){ $s = preg_replace('/\D/', '', (string)$v); return $s === '' ? null : str_pad($s, 10, '0', STR_PAD_LEFT); }

/* گزارش تردد canonical: مالکیت punch بر اساس تاریخ ورود؛ قبل از route قدیمی ثبت می‌شود. */
route('GET', '/api/admin/attendance-report', function($p,$b,$u){
  require_once __DIR__ . '/api/admin-attendance-report-owned.php';
  $uid=(int)($_GET['user_id']??0);
  $from=trim($_GET['from']??''); $to=trim($_GET['to']??'');
  if(!$uid||!$from||!$to) Http::error('پرسنل و بازهٔ تاریخ را مشخص کنید',400);
  return attendance_report_owned_by_entry_date($uid,$from,$to);
}, false, 3);
require __DIR__ . '/api/daily-performance-gps-separate.php'; require "$ROOT/lib/routes.php"; if (is_file("$ROOT/lib/complaints_routes_extra.php")) require "$ROOT/lib/complaints_routes_extra.php"; // Read a user's employment period directly from the authoritative table.
// This endpoint is independent of the variable-shaped admin/users list response.
$routes[] = [
  'm' => 'GET',
  'p' => '/api/admin/users/{id}/employment-period',
  'public' => false,
  'minLevel' => 3,
  'fn' => static function ($params, $body, $user) {
    $id=(int)($params['id']??0);
    if($id<=0) Http::error('شناسه کاربر معتبر نیست',422);
    $fields=Db::one("SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='users' AND column_name IN ('employment_start_date','employment_end_date')");
    if((int)($fields['n']??0)!==2) Http::error('ستون‌های تاریخ همکاری در پایگاه داده ایجاد نشده‌اند',503);
    $record=Db::one('SELECT id,employment_start_date,employment_end_date FROM users WHERE id=?',[$id]);
    if(!$record) Http::error('کاربر یافت نشد',404);
    return $record;
  }
];
$body = Http::body();
// Extend existing authenticated user routes without altering their authorization checks.
foreach ($routes as &$employmentRoute) {
  $routePath = (string)($employmentRoute['p'] ?? '');
  $routeMethod = (string)($employmentRoute['m'] ?? '');
  if (!preg_match('~(?:^|/)admin/users(?:/\\{id\\})?$~', $routePath)) continue;
  if (!in_array($routeMethod, ['GET','PUT'], true)) continue;
  $originalHandler = $employmentRoute['fn'];
  $employmentRoute['fn'] = static function($params,$body,$user) use ($originalHandler,$routeMethod,$routePath) {
    $hasColumns = Db::one("SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='users' AND column_name IN ('employment_start_date','employment_end_date')");
    if ((int)($hasColumns['n'] ?? 0) !== 2) { if ($routeMethod === 'PUT' && is_array($body) && (array_key_exists('employment_start_date',$body)||array_key_exists('employment_end_date',$body))) Http::error('ستون‌های تاریخ همکاری در پایگاه داده ایجاد نشده‌اند؛ ابتدا اسکریپت مهاجرت اجرا شود',503); return $originalHandler($params,$body,$user); }
    if ($routeMethod === 'PUT' && isset($params['id']) && is_array($body)) {
      $updates=[];$values=[];
      foreach (['employment_start_date','employment_end_date'] as $field) {
        if (!array_key_exists($field,$body)) continue;
        $date=trim((string)($body[$field]??''));
        $date=str_replace('/','-',$date);
        if ($date!=='' && !preg_match('/^1[34][0-9]{2}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/',$date)) Http::error('تاریخ همکاری معتبر نیست',422);
        if ($date!=='') {
          [$year,$month,$day]=array_map('intval',explode('-',$date));
          if ($day>IranCalendar::monthLength($year,$month)) Http::error('روز تاریخ همکاری معتبر نیست',422);
        }
        $updates[]="$field=?";$values[]=$date?:null;
      }
      if ($updates) {
        $current=Db::one('SELECT employment_start_date,employment_end_date FROM users WHERE id=?',[(int)$params['id']]);
        $start=array_key_exists('employment_start_date',$body)?str_replace('/','-',trim((string)($body['employment_start_date']??''))):($current['employment_start_date']??null);
        $end=array_key_exists('employment_end_date',$body)?str_replace('/','-',trim((string)($body['employment_end_date']??''))):($current['employment_end_date']??null);
        if ($start && $end && strcmp($start,$end)>0) Http::error('تاریخ پایان همکاری قبل از شروع است',422);
        $values[]=(int)$params['id'];
      }
    }
    $result = $originalHandler($params,$body,$user);
    if (!empty($updates)) Db::run('UPDATE users SET '.implode(',',$updates).' WHERE id=?',$values);
    if ($routeMethod === 'GET' && is_array($result)) {
      // User listing endpoints may return a plain array or wrap records in data/users/items/rows.
      $ids=[];
      $collect=function($node) use (&$collect,&$ids) {
        if(!is_array($node))return;
        if(isset($node['id']) && (isset($node['username']) || isset($node['first_name']) || isset($node['role_id'])))$ids[(int)$node['id']]=true;
        foreach($node as $child)if(is_array($child))$collect($child);
      };
      $collect($result);
      if($ids){
        $lookup=[];
        foreach(array_chunk(array_keys($ids),300) as $chunk){
          $marks=implode(',',array_fill(0,count($chunk),'?'));
          foreach(Db::all('SELECT id,employment_start_date,employment_end_date FROM users WHERE id IN ('.$marks.')',$chunk) as $record)$lookup[(int)$record['id']]=$record;
        }
        $decorate=function(&$node) use (&$decorate,$lookup){
          if(!is_array($node))return;
          if(isset($node['id']) && isset($lookup[(int)$node['id']]) && (isset($node['username'])||isset($node['first_name'])||isset($node['role_id'])))$node=array_merge($node,$lookup[(int)$node['id']]);
          foreach($node as &$child)if(is_array($child))$decorate($child);
          unset($child);
        };
        $decorate($result);
      }
    }
    return $result;
  };
}
unset($employmentRoute);
// Apply employment window to the primary attendance API irrespective of live/frozen source.
require_once "$ROOT/lib/EmploymentAttendance.php";
foreach($routes as &$attendanceRoute){
  if(($attendanceRoute['m']??'')!=='GET' || !preg_match('~(?:^|/)admin/attendance-report$~',(string)($attendanceRoute['p']??'')))continue;
  $originalAttendanceHandler=$attendanceRoute['fn'];
  $attendanceRoute['fn']=static function($params,$body,$user) use($originalAttendanceHandler){
    $report=$originalAttendanceHandler($params,$body,$user);
    if(!is_array($report))return $report;
    $target=(int)($_GET['user_id']??0);
    return $target>0?kh_filter_attendance_employment($report,$target,(string)($_GET['from']??''),(string)($_GET['to']??'')):$report;
  };
}
unset($attendanceRoute);
foreach ($routes as $r) {
  if ($r['m'] !== $method) continue; $regex = '#^' . preg_replace('#\{(\w+)\}#', '(?P<$1>[^/]+)', $r['p']) . '$#'; if (!preg_match($regex, $path, $mm)) continue; $params = array_filter($mm, 'is_string', ARRAY_FILTER_USE_KEY); $user = null;
  if (!$r['public']) {
    $tok = Http::bearer(); $payload = $tok ? Jwt::verify($tok, $GLOBALS['CONFIG']['jwt_secret']) : null; if (!$payload) Http::error('توکن منقضی یا نامعتبر است', 401); Http::$currentToken = $tok;
    $user = Db::one("SELECT u.id,u.username,u.first_name,u.last_name,u.role_id,r.title AS role_title,r.level,r.is_admin,u.is_active,u.email,u.photo,u.photo_path FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?", [$payload['sub']]);
    if (!$user || !$user['is_active']) Http::error('کاربر نامعتبر', 401); $dt = $payload['dt'] ?? 'web'; $tokenDeviceId = (string)($payload['device_id'] ?? '');
    // Match the exact device session. Looking up only by user/device_type can select another
    // browser's session and incorrectly reject a valid token when the user has multiple sessions.
    if ($tokenDeviceId !== '') {
      $sess = Db::one("SELECT device_id,revoked_at FROM user_sessions WHERE user_id=? AND device_type=? AND device_id=? LIMIT 1", [$user['id'], $dt, $tokenDeviceId]);
    } else {
      $sess = Db::one("SELECT device_id,revoked_at FROM user_sessions WHERE user_id=? AND device_type=? LIMIT 1", [$user['id'], $dt]);
    }
    $unlimitedRole = in_array($user['role_title'], ['مدیر کل', 'رییس اداره بازرسی', 'نیروی اداری ارشد'], true);
    if (!$sess || $sess['revoked_at'] || (!$unlimitedRole && $sess['device_id'] !== ($payload['device_id'] ?? ''))) Http::error('نشست منقضی یا باطل شده است', 401);
    $user['device_id'] = $payload['device_id'] ?? null; $user['device_type'] = $dt;
    if (empty($user['is_admin'])) { $mrow = Db::one("SELECT value FROM app_settings WHERE `key`='maintenance_mode'"); $mcfg = $mrow ? json_decode($mrow['value'], true) : null; if (!empty($mcfg['enabled'])) Http::error((string)($mcfg['message'] ?? '') ?: 'نرم‌افزار و پنل موقتاً برای تعمیرات غیرفعال است. لطفاً بعداً تلاش کنید.', 503); }
    if ($r['minLevel'] <= 3) { if (empty($user['is_admin'])) Http::error('دسترسی مدیریتی لازم است', 403); } elseif ((int)$user['level'] > $r['minLevel']) Http::error('سطح دسترسی کافی نیست', 403);
  }
  try { $result = $r['fn']($params, $body, $user); Http::json($result); } catch (Throwable $e) { error_log('API error [' . $path . ']: ' . $e->getMessage()); $debug = getenv('API_DEBUG') === '1' || (defined('API_DEBUG') && API_DEBUG); if ($debug) Http::json(['error' => 'خطای داخلی سرور', 'detail' => $e->getMessage(), 'line' => $e->getLine(), 'file' => basename($e->getFile())], 500); else Http::error('خطای داخلی سرور', 500); }
}
Http::error('مسیر یافت نشد', 404);
