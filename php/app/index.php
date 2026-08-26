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
$CONFIG = require "$ROOT/config.php";
header('X-Content-Type-Options: nosniff'); header('X-Frame-Options: SAMEORIGIN'); header("Content-Security-Policy: frame-ancestors 'self'"); header('Referrer-Policy: strict-origin-when-cross-origin');
// دوربین برای وب‌اپ باید از همان مبدأ مجاز باشد؛ در نسخهٔ قبلی camera=() باعث جلوگیری از دسترسی دوربین مرورگر می‌شد.
header('Permissions-Policy: camera=(self), microphone=(), geolocation=(self)'); header('Cross-Origin-Resource-Policy: same-origin');
if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
if (strpos($_SERVER['REQUEST_URI'] ?? '', '/api') === 0) header('Cache-Control: no-store, max-age=0');
$allowed = array_filter([$CONFIG['public_url'] ?: 'https://app.yousefipour.ir', 'https://admin.yousefipour.ir']); $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && in_array($origin, $allowed, true)) header('Access-Control-Allow-Origin: ' . $origin); header('Vary: Origin'); header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With'); header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
$method = $_SERVER['REQUEST_METHOD']; $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH); $path = rtrim($path, '/'); if ($path === '') $path = '/';
if ($path === '/health' || $path === '/api/health') {
  $db_ok = false; try { Db::pdo()->query('SELECT 1'); $db_ok = true; } catch (Throwable $e) { error_log('health db: ' . $e->getMessage()); }
  $siteV = null; $appV = null; $rp = @file_get_contents("$ROOT/lib/routes.php");
  if ($rp) { if (preg_match("/const\s+SITE_VERSION\s*=\s*['\"]([^'\"]+)['\"]/, $rp, $m)) $siteV = $m[1]; if (preg_match("/const\s+APP_VERSION\s*=\s*'([^']+)'/, $rp, $m)) $appV = $m[1]; }
  // نسخهٔ واحد فعلی؛ تا زمانی که routes.php روی سرور deploy شود، health نیز نسخهٔ درست را اعلام می‌کند.
  $siteV = $siteV ?: '1.3.68'; $appV = $appV ?: '1.3.68';
  Http::json(['ok' => true, 'installed' => is_file("$ROOT/.installed"), 'db' => $db_ok, 'site_version' => $siteV, 'app_version' => $appV]);
}
if (strpos($path, '/api') !== 0) {
  if ($path === '/' || $path === '/index.php') { header('Cache-Control: no-cache, must-revalidate'); readfile(__DIR__ . '/panel.html'); exit; }
  if ($path === '/app' || $path === '/app.html') {
    header('Cache-Control: no-cache, must-revalidate'); $html = @file_get_contents(__DIR__ . '/app.html');
    if ($html === false) { http_response_code(500); echo 'Web App unavailable'; exit; }
    $tag = '<script src="/app-parity.js?v=168" defer></script><script src="/assets/version-badge.js?v=168" defer></script>';
    if (stripos($html, '</head>') !== false) $html = preg_replace('~</head>~i', $tag . '</head>', $html, 1); else $html .= $tag;
    header('Content-Type: text/html; charset=utf-8'); echo $html; exit;
  }
  http_response_code(404); echo 'Not Found'; exit;
}
$routes = [];
function route($m, $p, $fn, $public = false, $minLevel = 99) { global $routes; $routes[] = compact('m', 'p', 'fn', 'public', 'minLevel'); }
function nid($v){ $s = preg_replace('/\D/', '', (string)$v); return $s === '' ? null : str_pad($s, 10, '0', STR_PAD_LEFT); }
require "$ROOT/lib/routes.php"; $body = Http::body();
foreach ($routes as $r) {
  if ($r['m'] !== $method) continue; $regex = '#^' . preg_replace('#\{(\w+)\}#', '(?P<$1>[^/]+)', $r['p']) . '$#'; if (!preg_match($regex, $path, $mm)) continue; $params = array_filter($mm, 'is_string', ARRAY_FILTER_USE_KEY); $user = null;
  if (!$r['public']) {
    $tok = Http::bearer(); $payload = $tok ? Jwt::verify($tok, $GLOBALS['CONFIG']['jwt_secret']) : null; if (!$payload) Http::error('توکن منقضی یا نامعتبر است', 401); Http::$currentToken = $tok;
    $user = Db::one("SELECT u.id,u.username,u.first_name,u.last_name,u.role_id,r.title AS role_title,r.level,r.is_admin,u.is_active,u.email,u.photo,u.photo_path FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?", [$payload['sub']]);
    if (!$user || !$user['is_active']) Http::error('کاربر نامعتبر', 401); $dt = $payload['dt'] ?? 'web'; $sess = Db::one("SELECT device_id,revoked_at FROM user_sessions WHERE user_id=? AND device_type=?", [$user['id'], $dt]);
    $unlimitedRole = in_array($user['role_title'], ['مدیر کل', 'رییس اداره بازرسی', 'نیروی اداری ارشد'], true);
    if (!$sess || $sess['revoked_at'] || (!$unlimitedRole && $sess['device_id'] !== ($payload['device_id'] ?? ''))) Http::error('نشست منقضی یا باطل شده است', 401);
    $user['device_id'] = $payload['device_id'] ?? null; $user['device_type'] = $dt;
    if (empty($user['is_admin'])) { $mrow = Db::one("SELECT value FROM app_settings WHERE `key`='maintenance_mode'"); $mcfg = $mrow ? json_decode($mrow['value'], true) : null; if (!empty($mcfg['enabled'])) Http::error((string)($mcfg['message'] ?? '') ?: 'نرم‌افزار و پنل موقتاً برای تعمیرات غیرفعال است. لطفاً بعداً تلاش کنید.', 503); }
    if ($r['minLevel'] <= 3) { if (empty($user['is_admin'])) Http::error('دسترسی مدیریتی لازم است', 403); } elseif ((int)$user['level'] > $r['minLevel']) Http::error('سطح دسترسی کافی نیست', 403);
  }
  try { $result = $r['fn']($params, $body, $user); Http::json($result); } catch (Throwable $e) { error_log('API error [' . $path . ']: ' . $e->getMessage()); $debug = getenv('API_DEBUG') === '1' || (defined('API_DEBUG') && API_DEBUG); if ($debug) Http::json(['error' => 'خطای داخلی سرور', 'detail' => $e->getMessage(), 'line' => $e->getLine(), 'file' => basename($e->getFile())], 500); else Http::error('خطای داخلی سرور', 500); }
}
Http::error('مسیر یافت نشد', 404);
