<?php
/* خطیار — گزارش تردد پرسنل */
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

/**
 * حذف تکرار و هم‌پوشانی punchها قبل از محاسبه.
 * _attendance_report ممکن است در اثر تجمیع رکوردهای تردد، یک بازه را بیش از یک بار
 * داخل punches/sessions قرار دهد. ShiftCalc مجموع هر session را جمع می‌زند و در این
 * حالت حضور به شکل غیرواقعی بزرگ می‌شود. این تابع فقط بازه‌های تکراری/هم‌پوشان را
 * یک‌بار محاسبه می‌کند و ساعت ورود/خروج واقعی را نگه می‌دارد.
 */
function aar_dedupe_sessions(array $sessions): array {
  $items = [];
  $seen = [];
  foreach ($sessions as $s) {
    if (!is_array($s) || empty($s['in'])) continue;
    $in = (int)$s['in'];
    $out = !empty($s['out']) ? (int)$s['out'] : null;
    if ($in <= 0 || !$out) continue;
    [$in,$out] = ShiftCalc::normalizeSessionPair($in,$out);
    if ($out <= $in) continue;
    $key = $in . ':' . $out;
    if (isset($seen[$key])) continue;
    $seen[$key] = true;
    $items[] = ['in'=>$in,'out'=>$out];
  }
  usort($items, static function($a,$b){ return $a['in'] <=> $b['in'] ?: $a['out'] <=> $b['out']; });

  $merged = [];
  foreach ($items as $item) {
    $n = count($merged);
    if ($n === 0) { $merged[] = $item; continue; }
    $last = $merged[$n-1];
    // بازه‌های هم‌پوشان/تودرتو فقط یک‌بار محاسبه شوند.
    if ($item['in'] <= $last['out']) {
      $merged[$n-1]['out'] = max($last['out'], $item['out']);
    } else {
      $merged[] = $item;
    }
  }
  return $merged;
}

/**
 * تردد شب متعلق به تاریخ ورود است.
 * نمونه: ورود 22:30 در 1405/06/10 و خروج 07:15 در 1405/06/11
 * تمام کارکرد و شب‌کاری در ردیف 1405/06/10 ثبت می‌شود و در روز بعد تکرار نمی‌شود.
 * از punchهای تولیدشده توسط _attendance_report استفاده می‌کنیم تا in_full/out_full
 * و رکوردهای overnight از بین نروند.
 */
function aar_rebuild_overnight_report(array $report, int $userId) {
  if (!isset($report['days']) || !is_array($report['days'])) return $report;

  $metricKeys = [
    'worked','in_shift','expected','overtime','shortage','night','friday','holiday',
    'late_in','early_out','surplus','adjusted_ot','friday_work','holiday_work'
  ];
  $sum = array_fill_keys($metricKeys, 0);
  $sum['night_work'] = 0;
  $sum['present_days'] = 0;

  /*
   * منبع قطعی تردد برای بازسازی گزارش، خود جدول staff_attendance است.
   * _attendance_report در بعضی مسیرها تردد شبانه را برای روز خروج نیز به‌صورت
   * یک punch مشتق‌شده وارد می‌کند؛ اگر همان punches دوباره محاسبه شوند، یک
   * تردد 23:00→06:00 هم در روز ورود و هم در روز بعد کارکرد می‌سازد.
   *
   * در این بازسازی فقط رکورد اصلی attendance را مالک روز ورود می‌دانیم:
   * 23:00 روز D → 06:00 روز D+1 فقط در D محاسبه می‌شود.
   */
  $reportStartJ = null;
  $reportEndJ = null;
  if (!empty($report['days'][0]['jdate'])) {
    $reportStartJ = aar_normalize_jdate($report['days'][0]['jdate']);
  }
  if (!empty($report['days']) && is_array($report['days'])) {
    $lastReportDay = $report['days'][count($report['days']) - 1] ?? null;
    if (is_array($lastReportDay)) $reportEndJ = aar_normalize_jdate($lastReportDay['jdate'] ?? $lastReportDay['date'] ?? '');
  }

  $rawAttendanceByJdate = [];
  if ($reportStartJ && $reportEndJ) {
    $startTs = ShiftCalc::jdateToTs($reportStartJ);
    $endTs = ShiftCalc::jdateToTs(ShiftCalc::jdateAddDays($reportEndJ, 1));
    if ($startTs !== null && $endTs !== null) {
      $rows = Db::all(
        "SELECT id,user_id,check_in,check_out,method,auto_closed
           FROM staff_attendance
          WHERE user_id=? AND check_in>=? AND check_in<?
          ORDER BY check_in ASC,id ASC",
        [$userId, date('Y-m-d 00:00:00', $startTs), date('Y-m-d 00:00:00', $endTs)]
      );
      foreach ($rows as $ar) {
        if (empty($ar['check_in'])) continue;
        $ownerJ = aar_jdate_from_datetime($ar['check_in']);
        if (!$ownerJ) continue;
        $rawAttendanceByJdate[$ownerJ][] = $ar;
      }
    }
  }

  foreach ($report['days'] as $i => $day) {
    if (!is_array($day)) continue;
    $dayJ = aar_normalize_jdate($day['jdate'] ?? $day['date'] ?? '');
    if (!$dayJ) continue;

    $allPunches = is_array($day['punches'] ?? null) ? $day['punches'] : [];
    $ownedPunches = [];

    /*
     * فقط رکوردهای اصلی DB که check_in آنها متعلق به همین تاریخ شمسی است
     * وارد محاسبه می‌شوند. punchهای مشتق‌شدهٔ روز بعد عمداً کنار گذاشته می‌شوند.
     */
    $baseAttendance = $rawAttendanceByJdate[$dayJ] ?? [];
    foreach ($baseAttendance as $ar) {
      $inFull = trim((string)($ar['check_in'] ?? ''));
      $outFull = trim((string)($ar['check_out'] ?? ''));
      if ($inFull === '') continue;
      $ownedPunches[] = [
        'id' => (int)($ar['id'] ?? 0),
        'in_full' => $inFull,
        'out_full' => $outFull,
        'method' => $ar['method'] ?? null,
        'auto_closed' => (int)($ar['auto_closed'] ?? 0),
      ];
    }

    // همان منطق گزارش ماهانه و تایمر: در نبود تخصیص صریح، شیفت خودکار کاربر مبنای محاسبه باشد.
    $shift = _active_user_shift_assignment($userId, $dayJ) ?: _auto_shift_for_user($userId);
    $dayRow = null;
    if ($shift && (($shift['type'] ?? '') === 'advanced')) {
      $dayRow = _shift_day_row($shift['shift_id'] ?? $shift['id'], $dayJ);
    }
    $hol = ShiftCalc::effectiveHoliday($dayJ, (bool)Db::one(
      "SELECT jdate FROM holidays WHERE jdate IN (?,?) LIMIT 1",
      [$dayJ, str_replace('-','/',$dayJ)]
    ));

    $rawSessions = [];
    foreach ($ownedPunches as $p) {
      $in = !empty($p['in_full']) ? strtotime($p['in_full']) : null;
      $out = !empty($p['out_full']) ? strtotime($p['out_full']) : null;
      if ($in && $out) {
        [$in,$out] = ShiftCalc::normalizeSessionPair($in,$out);
        if ($out > $in) {
          $rawSessions[] = ['in'=>$in,'out'=>$out];
        }
      }
    }
    $sessions = aar_dedupe_sessions($rawSessions);

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

    $adj = _attendance_adjusted_overtime($userId,$dayJ);
    if ($adj > 0) {
      $use = min((int)$adj,(int)($w['surplus'] ?? 0));
      $w['overtime'] = (int)($w['overtime'] ?? 0) + $use;
      $w['surplus'] = max(0,(int)($w['surplus'] ?? 0) - $use);
      $w['adjusted_ot'] = $use;
    }

    $day['punches'] = $ownedPunches;
    $day['sessions'] = $sessions;
    $day['data'] = $w;
    foreach ($metricKeys as $k) {
      if (array_key_exists($k,$w)) $day[$k] = (int)$w[$k];
    }
    $day['night_work'] = (int)($w['night'] ?? 0);
    $day['overnight_owned_by_entry_date'] = true;
    $day['continuation_of_previous_day'] = empty($ownedPunches) && !empty($allPunches);

    if (!empty($ownedPunches) && !empty($w['in'])) {
      $day['in'] = $w['in'];
      $day['first_in'] = $w['in'];
      $day['first_entry'] = $w['in'];
    } else {
      $day['in'] = null;
      $day['first_in'] = null;
      $day['first_entry'] = null;
    }
    if (!empty($ownedPunches) && !empty($w['out'])) {
      $day['out'] = $w['out'];
      $day['last_out'] = $w['out'];
      $day['last_exit'] = $w['out'];
    } else {
      $day['out'] = null;
      $day['last_out'] = null;
      $day['last_exit'] = null;
    }

    $first = $ownedPunches[0] ?? null;
    $last = !empty($ownedPunches) ? $ownedPunches[count($ownedPunches)-1] : null;
    $day['in_station'] = is_array($first) ? ($first['in_station'] ?? null) : null;
    $day['out_station'] = is_array($last) ? ($last['out_station'] ?? null) : null;

    $report['days'][$i] = $day;
    foreach ($metricKeys as $k) $sum[$k] += (int)($w[$k] ?? 0);
    $sum['night_work'] += (int)($w['night'] ?? 0);
    if ((int)($w['worked'] ?? 0) > 0) $sum['present_days']++;
  }

  $report['totals'] = $sum;
  $report['work_totals'] = $sum;
  if (isset($report['summary']) && is_array($report['summary'])) {
    foreach ($metricKeys as $k) {
      if (array_key_exists($k,$report['summary'])) $report['summary'][$k] = $sum[$k];
    }
    if (array_key_exists('night_work',$report['summary'])) $report['summary']['night_work'] = $sum['night_work'];
    if (array_key_exists('present_days',$report['summary'])) $report['summary']['present_days'] = $sum['present_days'];
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

  if (!function_exists('route')) { function route($m, $p, $fn, $public = false, $minLevel = 99) {} }
  require "$ROOT/lib/routes.php";

  $token = Http::bearer();
  $payload = $token ? Jwt::verify($token, $CONFIG['jwt_secret']) : null;
  if (!$payload || empty($payload['sub'])) aar_error('توکن منقضی یا نامعتبر است', 401);

  $u = Db::one(
    "SELECT u.id,u.is_active,u.role_id,r.level,r.is_admin AS is_admin,r.title AS role_title
       FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=? LIMIT 1",
    [$payload['sub']]
  );
  if (!$u || !(int)($u['is_active'] ?? 0)) aar_error('کاربر نامعتبر', 401);
  if (empty($u['is_admin'])) aar_error('دسترسی مدیریتی لازم است', 403);

  $uid = (int)($_GET['user_id'] ?? 0);