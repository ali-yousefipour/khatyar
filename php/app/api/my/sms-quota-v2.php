<?php
/**
 * Android SMS quota/credit endpoint.
 * Server-side source of truth for panel credit and sendable SMS count.
 * The count is calculated from the real provider credit and the configured
 * per-message cost; it is never based on a stale frontend approximation.
 */
require_once __DIR__ . '/../../../lib/Db.php';
require_once __DIR__ . '/../../../lib/Jwt.php';
require_once __DIR__ . '/../../../lib/Http.php';
require_once __DIR__ . '/../../../lib/Sms.php';
$CONFIG = require __DIR__ . '/../../../config.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

function smsq_setting($key, $default = null) {
    try {
        $r = Db::one("SELECT value FROM app_settings WHERE `key`=? LIMIT 1", [$key]);
        if (!$r) return $default;
        $v = json_decode((string)$r['value'], true);
        return ($v === null && trim((string)$r['value']) !== 'null') ? $r['value'] : $v;
    } catch (Throwable $e) { return $default; }
}
function smsq_user() {
    global $CONFIG;
    $token = Http::bearer();
    $p = $token ? Jwt::verify($token, $CONFIG['jwt_secret']) : null;
    if (!$p || empty($p['sub'])) Http::error('توکن منقضی یا نامعتبر است', 401);
    Http::$currentToken = $token;
    $u = Db::one("SELECT u.id,u.role_id,u.is_active,r.level,r.is_admin,r.title role_title FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.id=? LIMIT 1", [(int)$p['sub']]);
    if (!$u || !(int)$u['is_active']) Http::error('کاربر نامعتبر', 401);
    return $u;
}
function smsq_can_send($u) {
    if (!empty($u['is_admin'])) return true;
    $rid = (string)($u['role_id'] ?? '');
    if ($rid === '') return false;
    $cfg = smsq_setting('role_app_items', []);
    if (!is_array($cfg)) return false;
    $items = $cfg[$rid] ?? null;
    if (!is_array($items)) return false;
    return in_array('Sms', $items, true) || in_array('DriverSms', $items, true) || in_array('MySms', $items, true);
}
function smsq_number($v) {
    if (is_int($v) || is_float($v)) return (float)$v;
    $s = trim((string)$v);
    $s = str_replace([',','٬','،',' '], '', $s);
    $s = strtr($s, ['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9']);
    return is_numeric($s) ? (float)$s : 0.0;
}
try {
    $u = smsq_user();
    if (!smsq_can_send($u)) Http::error('دسترسی ارسال پیامک ندارید', 403);

    $faCost = smsq_number(smsq_setting('sms_cost_fa', 0));
    $enCost = smsq_number(smsq_setting('sms_cost_en', 0));
    $unitCost = $faCost > 0 ? $faCost : $enCost;

    $c = Sms::credit();
    if (empty($c['ok'])) {
        http_response_code(502);
        echo json_encode(['success'=>false,'ok'=>false,'error'=>$c['error'] ?? 'دریافت اعتبار پنل پیامک ناموفق بود'], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
        exit;
    }
    $credit = max(0, (float)($c['credit'] ?? 0));
    $capacity = $unitCost > 0 ? (int)floor($credit / $unitCost) : null;

    $sentToday = (int)(Db::one("SELECT COUNT(*) n FROM sms_log WHERE sent_by=? AND DATE(created_at)=CURDATE()", [(int)$u['id']])['n'] ?? 0);
    $sentMonth = (int)(Db::one("SELECT COUNT(*) n FROM sms_log WHERE sent_by=? AND YEAR(created_at)=YEAR(CURDATE()) AND MONTH(created_at)=MONTH(CURDATE())", [(int)$u['id']])['n'] ?? 0);
    $daily = max(0, (int)smsq_number(smsq_setting('sms_daily_limit', 0)));
    $userDaily = max(0, (int)smsq_number(smsq_setting('sms_limit_user_'.(int)$u['id'], 0)));
    $limits = array_values(array_filter([$daily, $userDaily], fn($x) => $x > 0));
    $effectiveLimit = $limits ? min($limits) : 0;
    $remainingToday = $effectiveLimit > 0 ? max(0, $effectiveLimit - $sentToday) : null;

    echo json_encode([
        'success'=>true,
        'ok'=>true,
        'panel_credit'=>[
            'amount'=>(int)round($credit),
            'currency'=>'ریال',
            'unit_cost_fa'=>$faCost > 0 ? (int)round($faCost) : null,
            'unit_cost_en'=>$enCost > 0 ? (int)round($enCost) : null,
            'unit_cost'=>$unitCost > 0 ? (int)round($unitCost) : null,
            'sendable_count'=>$capacity,
            'approx_count'=>$capacity
        ],
        'sent_today'=>$sentToday,
        'sent_month'=>$sentMonth,
        'effective_limit'=>$effectiveLimit,
        'remaining_today'=>$remainingToday,
        'source'=>'provider_credit_v2'
    ], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    error_log('my/sms-quota-v2: '.$e->getMessage());
    http_response_code(500);
    echo json_encode(['success'=>false,'ok'=>false,'error'=>'خطای داخلی در دریافت اعتبار پیامک'], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
}
