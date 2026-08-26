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
header('Permissions-Policy: camera=(self), microphone=(), geolocation=(self)'); header('Cross-Origin-Resource-Policy: same-origin');
if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
if (strpos($_SERVER['REQUEST_URI'] ?? '', '/api') === 0) header('Cache-Control: no-store, max-age=0');
$allowed = array_filter([$CONFIG['public_url'] ?: 'https://app.yousefipour.ir', 'https://admin.yousefipour.ir']); $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && in_array($origin, $allowed, true)) header('Access-Control-Allow-Origin: ' . $origin); header('Vary: Origin'); header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With'); header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
$method = $_SERVER['REQUEST_METHOD']; $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH); $path = rtrim($path, '/'); if ($path === '') $path = '/';
if ($path === '/health' || $path === '/api/health') {
  $db_ok = false; try { Db::pdo()->query('SELECT 1'); $db_ok = true; } catch (Throwable $e) { error_log('health db: ' . $e->getMessage()); }
  $siteV = '1.3.69'; $appV = '1.3.69';
  Http::json(['ok' => true, 'installed' => is_file("$ROOT/.installed"), 'db' => $db_ok, 'site_version' => $siteV, 'app_version' => $appV]);
}
if (strpos($path, '/api') !== 0) {
  if ($path === '/' || $path === '/index.php') { header('Cache-Control: no-cache, must-revalidate'); readfile(__DIR__ . '/panel.html'); exit; }
  if ($path === '/app' || $path === '/app.html') {
    header('Cache-Control: no-cache, must-revalidate'); $html = @file_get_contents(__DIR__ . '/app.html');
    if ($html === false) { http_response_code(404); echo 'Not Found'; exit; }
    header('Content-Type: text/html; charset=utf-8'); echo $html; exit;
  }
  if ($path === '/admin' || $path === '/admin.html') { header('Location: /panel.html', true, 302); exit; }
  http_response_code(404); echo 'Not Found'; exit;
}
require "$ROOT/lib/routes.php";
