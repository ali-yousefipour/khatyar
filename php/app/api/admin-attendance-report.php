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

/**
 * شیفت شب متعلق به «روز کاریِ ورود» است، نه دو روز تقویمی.
 *
 * مثال: 1405/06/01 ساعت 22:30 تا 1405/06/02 ساعت 07:15
 * کل 08:45 کارکرد در 1405/06/01 ثبت می‌شود و همان تردد در 1405/06/02
 * دوباره محاسبه نمی‌شود. این تابع خروجی _attendance_report را قبل از
 * ارسال به پنل نرمال می‌کند تا حتی در نصب‌هایی که routes.php هنوز رکورد
 * عبوری از نیمه‌شب را روی هر دو روز برمی‌گرداند، دوباره‌شماری رخ ندهد.
 */
function aar_jdate_from_datetime($value) {
  $ts = strtotime((string)$value);
  if (!$ts || !function_exists('gregorian_to_jalali')) return null;
  [$jy,$jm,$jd] = gregorian_to_jalali((int)date('Y',$ts),(int)date('n',$ts),(int)date('j',$ts));
  return sprintf('%04d-%02d-%02d',$jy,$jm,$jd);
}

function aar_normalize_jdate($value) {
  $s = str_replace('/','-',trim((string)$value));
  if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/',$s,$m)) {
    return sprintf('%04d-%02d-%02d',(int)$m[1],(int)$m[2],(int)$m[3]);
  }
  return null;
}

function aar_rebuild_overnight_report(array $report, int $userId) {
  if (!isset($report['days']) || !is_array($report['days'])) return $report;

  $metricKeys = [
    'worked','in_shift','expected','overtime','shortage','night','friday','holiday',
    'late_in','early_out','surplus','adjusted_ot','friday_work','holiday_work'
  ];
  $sum = array_fill_keys($metricKeys, 0);
  $sum['night_work'] = 0;

  foreach ($report['days'] as $i => $day) {
    if (!is_array($day)) continue;
    $dayJ = aar_normalize_jdate($day['jdate'] ?? $day['date'] ?? '');
    if (!$dayJ) continue;

    $allPunches = is_array($day['punches'] ?? null) ? $day['punches'] : [];
    $ownedPunches = [];

    foreach ($allPunches as $p) {
      if (!is_array($p)) continue;
      $inFull = trim((string)($p['in_full'] ?? ''));
      $ownerJ = $inFull !== '' ? aar_jdate_from_datetime($inFull) : null;
      // رکوردهای قدیمی بدون in_full را به همان روز گزارش نسبت می‌دهیم.
      if (!$ownerJ || $ownerJ === $dayJ) $ownedPunches[] = $p;
    }

    // اگر رکورد فقط ادامهٔ شیفت شبِ روز قبل است، نباید برای این روز کارکرد
    // یا شب‌کاری تولید کند؛ در نتیجه این روز از نظر تردد، مستقل باقی می‌ماند.
    $day['punches'] = $ownedPunches;

    $shift = _active_user_shift_assignment($userId, $dayJ);
    $dayRow = null;
    if ($shift && (($shift['type'] ?? '') === 'advanced')) {
      $dayRow = _shift_day_row($shift['shift_id'] ?? $shift['id'], $dayJ);
    }
    $hol = (bool)Db::one(
      "SELECT jdate FROM holidays WHERE jdate IN (?,?) LIMIT 1",
      [$dayJ, str_replace('-','/',$dayJ)]
    );

    $sessions = [];
    foreach ($ownedPunches as $p) {
      $in = !empty($p['in_full']) ? strtotime($p['in_full']) : null;
      $out = !empty($p['out_full']) ? strtotime($p['out_full']) : null;
      if ($in) $sessions[] = ['in'=>$in,'out'=>$out];
    }

    if ($shift) {
      $w = ShiftCalc::dayWork($shift,$dayJ,$dayRow,$sessions,$hol);
    } else {
      $w = [
        'worked'=>0,'in_shift'=>0,'expected'=>0,'overtime'=>0,'shortage'=>0,
        'night'=>0,'friday'=>0,'holiday'=>0,'late_in'=>0,'early_out'=>0,
        'surplus'=>0,'adjusted_ot'=>0,'friday_work'=>0,'holiday_work'=>0,
        'in'=>null,'out'=>null
      ];
    }

    // محاسبهٔ دوبارهٔ تهاتر همان منطق گزارش اصلی را حفظ می‌کند.
    $adj = _attendance_adjusted_overtime($userId,$dayJ);
    if ($adj > 0) {
      $use = min((int)$adj,(int)($w['surplus'] ?? 0));
      $w['overtime'] = (int)($w['overtime'] ?? 0) + $use;
      $w['surplus'] = max(0,(int)($w['surplus'] ?? 0) - $use);
      $w['adjusted_ot'] = $use;
    }

    $day['data'] = $w;
    foreach ($metricKeys as $k) {
      if (array_key_exists($k,$w)) $day[$k] = (int)$w[$k];
    }
    $day['night_work'] = (int)($w['night'] ?? 0);
    $day['overnight_owned_by_entry_date'] = true;
    $day['continuation_of_previous_day'] = empty($ownedPunches) && !empty($allPunches);

    // زمان‌های ورود/خروج از رکوردهای متعلق به همین روز گرفته می‌شوند؛
    // بنابراین 22:30→07:15 دیگر به شکل یک بازهٔ تقویمیِ 24 ساعته تفسیر نمی‌شود.
    if (!empty($w['in'])) $day['in'] = $w['in'];
    if (!empty($w['out'])) $day['out'] = $w['out'];

    $report['days'][$i] = $day;

    foreach ($metricKeys as $k) $sum[$k] += (int)($w[$k] ?? 0);
    $sum['night_work'] += (int)($w['night'] ?? 0);
  }

  // خلاصهٔ استاندارد و مستقل از night_work؛ شب‌کاری زیرمجموعهٔ کارکرد است
  // ولی هرگز به worked/overtime اضافه نمی‌شود.
  $report['totals'] = $sum;
  $report['work_totals'] = $sum;
  if (isset($report['summary']) && is_array($report['summary'])) {
    foreach ($metricKeys as $k) {
      if (array_key_exists($k,$report['summary'])) $report['summary'][$k] = $sum[$k];
    }
    if (array_key_exists('night_work',$report['summary'])) $report['summary']['night_work'] = $sum['night_work'];
  }

  return $report;
}

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

  $report = _attendance_report($uid, $from, $to);
  $report = aar_rebuild_overnight_report($report, $uid);
  aar_json($report);
} catch (Throwable $e) {
  error_log('admin-attendance-report: ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
  aar_error('خطای داخلی: ' . get_class($e) . ': ' . $e->getMessage() . ' (فایل: ' . basename($e->getFile()) . ' خط ' . $e->getLine() . ')', 500);
}
