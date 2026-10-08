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
require "$ROOT/lib/routes.php"; if (is_file("$ROOT/lib/complaints_routes_extra.php")) require "$ROOT/lib/complaints_routes_extra.php"; $body = Http::body();
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