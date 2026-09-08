<?php
/* خطیار — گزارش تردد پرسنل (بازنویسی کامل)
   ------------------------------------------------------------
   این فایل، جایگزین کامل و مستقلِ نسخه‌های قبلی (safe / fast / fast-safe-v2 / fast-safe-v3) است.
   تفاوت اصلی و دلیل بازنویسی: نسخه‌های قبلی برای محاسبهٔ تاریخ (jalali_to_gregorian/gregorian_to_jalali)
   به کلاس ShiftCalc متکی بودند، و ShiftCalc خودش این دو تابع سراسری را از فایل روتر اصلی سایت
   (lib/routes.php — فایلی حدود ۹۴۰ کیلوبایتی با هزاران ثبت مسیر) می‌گرفت. چون این فایل مستقل
   (خارج از index.php اصلی) اجرا می‌شود، هر مشکلی در آن فایل روتر بزرگ (یا نبود تابع کمکی route())
   باعث خطای Fatal و نهایتاً HTTP 500 در همین گزارش می‌شد — کاملاً بی‌ربط به منطق خودِ گزارش تردد.
   در این نسخه، این دو تابع تبدیل تاریخ به‌طور کامل و مستقل همین‌جا تعریف شده‌اند (بدون نیاز به routes.php)
   و کل فایل، از همان ابتدای require ها، داخل یک try/catch سراسری قرار گرفته تا در صورت بروز
   هر خطای پیش‌بینی‌نشده، به‌جای صفحهٔ خطای خام ۵۰۰، همیشه یک پاسخ JSON تمیز برگردد.
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
  require "$ROOT/lib/ShiftCalc.php";
  require "$ROOT/lib/IranCalendar.php";
  $CONFIG = require "$ROOT/config.php";

  /* ---------- تبدیل تاریخ شمسی/میلادی — مستقل، بدون هیچ وابستگی بیرونی ---------- */
  if (!function_exists('gregorian_to_jalali')) {
    function gregorian_to_jalali($gy, $gm, $gd) {
      $gdm = [0,31,59,90,120,151,181,212,243,273,304,334];
      $gy2 = $gy - 1600; $gm2 = $gm - 1; $gd2 = $gd - 1;
      $gdn = 365 * $gy2 + intdiv($gy2 + 3, 4) - intdiv($gy2 + 99, 100) + intdiv($gy2 + 399, 400) + $gdm[$gm2] + $gd2;
      if ($gm2 > 1 && (($gy % 4 == 0 && $gy % 100 != 0) || ($gy % 400 == 0))) $gdn++;
      $jdn = $gdn - 79;
      $jy = 979 + 33 * intdiv($jdn, 12053); $jdn %= 12053;
      $jy += 4 * intdiv($jdn, 1461); $jdn %= 1461;
      if ($jdn >= 366) { $jy += intdiv($jdn - 1, 365); $jdn = ($jdn - 1) % 365; }
      $jm = $jdn < 186 ? 1 + intdiv($jdn, 31) : 7 + intdiv($jdn - 186, 30);
      $jd = 1 + ($jdn < 186 ? $jdn % 31 : ($jdn - 186) % 30);
      return [$jy, $jm, $jd];
    }
  }
  if (!function_exists('jalali_to_gregorian')) {
    function jalali_to_gregorian($jy, $jm, $jd) {
      $jy2 = (int)$jy - 979; $jm2 = (int)$jm - 1; $jd2 = (int)$jd - 1;
      $jdn = 365 * $jy2 + intdiv($jy2, 33) * 8 + intdiv(($jy2 % 33 + 3), 4);
      $md = [31,31,31,31,31,31,30,30,30,30,30,29];
      for ($i = 0; $i < $jm2; $i++) $jdn += $md[$i];
      $jdn += $jd2;
      $g = $jdn + 79;
      $gy = 1600 + 400 * intdiv($g, 146097); $g %= 146097;
      $leap = true;
      if ($g >= 36525) { $g--; $gy += 100 * intdiv($g, 36524); $g %= 36524; if ($g >= 365) $g++; else $leap = false; }
      $gy += 4 * intdiv($g, 1461); $g %= 1461;
      if ($g >= 366) { $leap = false; $g--; $gy += intdiv($g, 365); $g %= 365; }
      $gd = [31, $leap ? 29 : 28, 31,30,31,30,31,31,30,31,30,31];
      $gm = 0;
      for (; $gm < 12 && $g >= $gd[$gm]; $gm++) $g -= $gd[$gm];
      return [$gy, $gm + 1, $g + 1];
    }
  }

  function aar_digits($s) {
    return strtr((string)$s, ['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9',
      '٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9']);
  }
  function aar_jts($j) {
    $j = str_replace(['/', '.'], '-', aar_digits(trim((string)$j)));
    if (!preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/', $j, $m)) return null;
    [$gy, $gm, $gd] = jalali_to_gregorian((int)$m[1], (int)$m[2], (int)$m[3]);
    return mktime(0, 0, 0, $gm, $gd, $gy);
  }
  function aar_jdate($ts) {
    [$y, $m, $d] = gregorian_to_jalali((int)date('Y', $ts), (int)date('n', $ts), (int)date('j', $ts));
    return sprintf('%04d-%02d-%02d', $y, $m, $d);
  }
  function aar_hm($m) { $m = max(0, (int)$m); return sprintf('%02d:%02d', intdiv($m, 60), $m % 60); }

  /* ---------- کمکی‌های ایمن برای بررسی وجود جدول/ستون (سازگاری با نصب‌های قدیمی‌تر) ---------- */
  function aar_table($name) {
    static $cache = [];
    $name = (string)$name;
    if (array_key_exists($name, $cache)) return $cache[$name];
    try {
      $r = Db::one('SELECT COUNT(*) c FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?', [$name]);
      return $cache[$name] = ((int)($r['c'] ?? 0) > 0);
    } catch (Throwable $e) { return $cache[$name] = false; }
  }
  function aar_col($table, $col) {
    static $cache = [];
    $key = $table . '.' . $col;
    if (array_key_exists($key, $cache)) return $cache[$key];
    if (!aar_table($table)) return $cache[$key] = false;
    try {
      $r = Db::one('SELECT COUNT(*) c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?', [$table, $col]);
      return $cache[$key] = ((int)($r['c'] ?? 0) > 0);
    } catch (Throwable $e) { return $cache[$key] = false; }
  }

  /* ---------- احراز هویت ---------- */
  function aar_auth() {
    global $CONFIG;
    $token = Http::bearer();
    $payload = $token ? Jwt::verify($token, $CONFIG['jwt_secret']) : null;
    if (!$payload || empty($payload['sub'])) aar_error('توکن منقضی یا نامعتبر است', 401);
    $roleJoin = aar_table('roles') ? ' JOIN roles r ON r.id = u.role_id ' : '';
    $roleTitle = $roleJoin ? 'r.title role_title' : "'' role_title";
    $u = Db::one("SELECT u.id, u.is_active, u.is_admin, $roleTitle FROM users u" . $roleJoin . " WHERE u.id=? LIMIT 1", [$payload['sub']]);
    if (!$u || !(int)($u['is_active'] ?? 0)) aar_error('کاربر نامعتبر', 401);
    if (empty($u['is_admin'])) aar_error('دسترسی مدیریتی لازم است', 403);
    return $u;
  }

  function aar_weekday_name($j) {
    $names = ['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];
    try { $i = ShiftCalc::jweekday($j); if ($i !== null) return $names[(int)$i] ?? ''; } catch (Throwable $e) {}
    $ts = aar_jts($j);
    if ($ts === null) return '';
    return $names[((int)date('w', $ts) + 1) % 7] ?? '';
  }

  function aar_shift($uid, $j) {
    if (!aar_table('user_shifts') || !aar_table('shifts')) return null;
    try {
      $rows = Db::all('SELECT us.shift_id, us.from_jdate, us.to_jdate, s.* FROM user_shifts us JOIN shifts s ON s.id = us.shift_id WHERE us.user_id=? AND s.is_active=1 ORDER BY us.id DESC', [$uid]);
      foreach ($rows as $r) {
        $f = !empty($r['from_jdate']) ? str_replace('/', '-', (string)$r['from_jdate']) : null;
        $t = !empty($r['to_jdate']) ? str_replace('/', '-', (string)$r['to_jdate']) : null;
        if ($f && strcmp($j, $f) < 0) continue;
        if ($t && strcmp($j, $t) > 0) continue;
        return $r;
      }
    } catch (Throwable $e) { error_log('admin-attendance-report shift: ' . $e->getMessage()); }
    return null;
  }

  function aar_shift_day($shift, $j) {
    if (!$shift || ($shift['type'] ?? '') !== 'advanced' || !aar_table('shift_days')) return null;
    $sid = (int)($shift['shift_id'] ?? $shift['id'] ?? 0);
    if (!$sid) return null;
    try {
      return Db::one("SELECT shift_id, jdate, segments, is_off, day_config FROM shift_days WHERE shift_id=? AND REPLACE(jdate,'/','-')=? LIMIT 1", [$sid, str_replace('/', '-', $j)]);
    } catch (Throwable $e) { return null; }
  }

  function aar_day_sessions($j, $rows) {
    $work = 0; $first = null; $last = null; $sessions = []; $punches = [];
    foreach ($rows as $r) {
      $in = !empty($r['check_in']) ? strtotime($r['check_in']) : false;
      if (!$in) continue;
      $out = !empty($r['check_out']) ? strtotime($r['check_out']) : time();
      $work += max(0, (int)floor(($out - $in) / 60));
      $first = $first === null ? $in : min($first, $in);
      $last = $last === null ? $out : max($last, $out);
      $punches[] = [
        'id' => (int)$r['id'], 'in' => date('H:i', $in), 'out' => $r['check_out'] ? date('H:i', $out) : null,
        'in_full' => $r['check_in'] ?? null, 'out_full' => $r['check_out'] ?? null,
        'in_lat' => $r['in_lat'] ?? null, 'in_lng' => $r['in_lng'] ?? null,
        'out_lat' => $r['out_lat'] ?? null, 'out_lng' => $r['out_lng'] ?? null,
        'method' => $r['method'] ?? null, 'in_station' => $r['in_station'] ?? null, 'out_station' => $r['out_station'] ?? null,
      ];
      $sessions[] = ['in' => $in, 'out' => $out, 'clip_start' => aar_jts($j), 'clip_end' => aar_jts($j) + 86400];
    }
    return [$work, $first, $last, $punches, $sessions];
  }

  /* ================= شروع پردازش درخواست ================= */

  aar_auth();

  $uid = (int)($_GET['user_id'] ?? 0);
  $from = str_replace('/', '-', aar_digits(trim($_GET['from'] ?? '')));
  $to = str_replace('/', '-', aar_digits(trim($_GET['to'] ?? '')));
  if (!$uid || !$from || !$to) aar_error('پرسنل و بازهٔ تاریخ را مشخص کنید', 400);

  $fts = aar_jts($from);
  $tts = aar_jts($to);
  if ($fts === null || $tts === null || $fts > $tts) aar_error('بازهٔ تاریخ نامعتبر است', 400);
  $daysCount = (int)floor(($tts - $fts) / 86400) + 1;
  if ($daysCount > 366) aar_error('حداکثر بازهٔ مجاز گزارش ۳۶۶ روز است', 400);

  if (!aar_table('staff_attendance')) aar_error('جدول تردد پرسنل وجود ندارد', 500);

  $nameFirst = aar_col('users', 'first_name') ? "COALESCE(first_name,'')" : "''";
  $nameLast = aar_col('users', 'last_name') ? "COALESCE(last_name,'')" : "''";
  $device = aar_col('users', 'device_model') ? 'device_model' : 'NULL';
  $policy = aar_col('users', 'work_policy_id') ? 'work_policy_id' : 'NULL';
  $usr = Db::one("SELECT id, TRIM(CONCAT($nameFirst,' ',$nameLast)) name, $device device_model, $policy work_policy_id FROM users WHERE id=? LIMIT 1", [$uid]);
  if (!$usr) aar_error('پرسنل یافت نشد', 404);

  $start = date('Y-m-d 00:00:00', $fts);
  $end = date('Y-m-d 00:00:00', $tts + 86400);

  $optionalCols = ['method', 'in_lat', 'in_lng', 'out_lat', 'out_lng', 'in_station', 'out_station'];
  $attCols = ['id', 'check_in', 'check_out'];
  foreach ($optionalCols as $c) $attCols[] = aar_col('staff_attendance', $c) ? $c : "NULL AS $c";

  $att = Db::all('SELECT ' . implode(',', $attCols) . ' FROM staff_attendance WHERE user_id=? AND check_in < ? AND (check_out IS NULL OR check_out > ?) ORDER BY check_in', [$uid, $end, $start]);

  $byDay = [];
  foreach ($att as $r) {
    $in = strtotime((string)$r['check_in']);
    if (!$in) continue;
    $out = !empty($r['check_out']) ? strtotime($r['check_out']) : time();
    $a = max($fts, (int)floor($in / 86400) * 86400);
    $b = min($tts + 86399, $out);
    for ($d = $a; $d <= $b; $d += 86400) {
      if ($in < $d + 86400 && $out > $d) { $j = aar_jdate($d); if ($j) $byDay[$j][] = $r; }
    }
  }

  $days = [];
  $lastShift = null;
  for ($ts = $fts; $ts <= $tts; $ts += 86400) {
    $j = aar_jdate($ts);
    $rows = $byDay[$j] ?? [];
    $shift = aar_shift($uid, $j);
    if ($shift) $lastShift = $shift;
    $dayRow = aar_shift_day($shift, $j);

    $cal = ['is_official_holiday' => false, 'is_manual_holiday' => false, 'is_holiday' => false, 'title' => '', 'source' => 'calculated'];
    try { $c = IranCalendar::day($j); if (is_array($c)) $cal = $c; } catch (Throwable $e) {}
    $isHoliday = !empty($cal['is_holiday']);
    $isFriday = false;
    try { $isFriday = ShiftCalc::isFriday($j); } catch (Throwable $e) { $t = aar_jts($j); $isFriday = $t !== null && (int)date('N', $t) === 5; }

    $expected = 0;
    if ($shift) { try { $expected = (int)ShiftCalc::expectedMinutes($shift, $j, $dayRow); } catch (Throwable $e) { $expected = 0; } }

    [$worked, $first, $last, $punches, $sessions] = aar_day_sessions($j, $rows);
    $shortage = max(0, $expected - min($worked, $expected));
    $overtime = max(0, $worked - $expected);
    if ($isHoliday || $isFriday) $shortage = 0;

    if ($shift) {
      try {
        $w = ShiftCalc::dayWork($shift, $j, $dayRow, $sessions, $isHoliday);
        $worked = (int)($w['worked'] ?? $worked);
        $shortage = (int)($w['shortage'] ?? $shortage);
        $overtime = (int)($w['overtime'] ?? $overtime);
        $expected = (int)($w['expected'] ?? $expected);
      } catch (Throwable $e) { error_log('admin-attendance-report day ' . $j . ': ' . $e->getMessage()); }
    }

    $days[] = [
      'jdate' => str_replace('-', '/', $j),
      'weekday' => aar_weekday_name($j),
      'is_friday' => $isFriday,
      'is_official_holiday' => (bool)($cal['is_official_holiday'] ?? false),
      'is_manual_holiday' => (bool)($cal['is_manual_holiday'] ?? false),
      'is_holiday' => $isHoliday,
      'holiday_title' => $cal['title'] ?? '',
      'holiday_source' => $cal['source'] ?? '',
      'punches' => $punches,
      'in_shift' => aar_hm($worked),
      'worked' => aar_hm($worked),
      'expected' => aar_hm($expected),
      'late_in' => '00:00',
      'early_out' => '00:00',
      'shortage' => aar_hm($shortage),
      'night' => '00:00',
      'overtime' => aar_hm($overtime),
      'surplus' => '00:00',
      'adjusted_ot' => '00:00',
      'friday_work' => aar_hm($isFriday ? $worked : 0),
      'holiday_work' => aar_hm($isHoliday && !$isFriday ? $worked : 0),
      'absent' => (!$punches && !$isHoliday && !$isFriday) ? 1 : 0,
      'first_in' => $first ? date('H:i', $first) : null,
      'last_out' => $last ? date('H:i', $last) : null,
      'mission' => '00:00', 'annual_leave' => '00:00', 'sick_leave' => '00:00', 'unpaid_leave' => '00:00',
    ];
  }

  aar_json([
    'user' => $usr,
    'shift' => $lastShift ? ['title' => $lastShift['title'] ?? ''] : null,
    'from' => str_replace('-', '/', $from),
    'to' => str_replace('-', '/', $to),
    'days' => $days,
    'read_only' => true,
    'implementation' => 'admin-attendance-report-v4',
  ]);

} catch (Throwable $e) {
  error_log('admin-attendance-report: ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
  aar_error('خطای داخلی گزارش تردد؛ جزئیات در گزارش خطای سرور ثبت شد.', 500);
}
