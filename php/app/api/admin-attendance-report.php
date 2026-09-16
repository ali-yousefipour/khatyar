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

/**
 * سازگاری اسکیمای گزارش مستقیم با دیتابیس‌های قدیمی.
 * ساختار پایه از upgrade_full_standalone.sql و فیلدهای تکمیلی از
 * 2026_09_06_vehicle_attendance_hardening.sql گرفته شده است.
 * این fallback فقط وقتی ستونی/جدولی وجود نداشته باشد اجرا می‌شود و
 * منطق محاسبه شیفت، مخصوصاً شیفت شب، را تغییر نمی‌دهد.
 */
function aar_ensure_report_schema() {
  $pdo = Db::pdo();

  $pdo->exec("CREATE TABLE IF NOT EXISTS staff_attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    line_id INT NULL,
    check_in DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    check_out DATETIME NULL,
    method VARCHAR(20) NULL,
    in_lat DOUBLE NULL,
    in_lng DOUBLE NULL,
    out_lat DOUBLE NULL,
    out_lng DOUBLE NULL,
    auto_closed TINYINT(1) NOT NULL DEFAULT 0,
    INDEX idx_sa_user (user_id, check_in),
    INDEX idx_sa_open (user_id, check_out)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

  $addColumn = static function ($table, $column, $definition) use ($pdo) {
    $st = $pdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?");
    $st->execute([$table, $column]);
    if ((int)$st->fetchColumn() === 0) {
      $pdo->exec("ALTER TABLE `{$table}` ADD COLUMN `{$column}` {$definition}");
    }
  };

  // ستون‌های ثبت‌شده در migrationهای قبلی تردد.
  $addColumn('staff_attendance', 'in_station', 'VARCHAR(190) NULL');
  $addColumn('staff_attendance', 'out_station', 'VARCHAR(190) NULL');
  $addColumn('staff_attendance', 'handover_id', 'INT NULL');
  $addColumn('staff_attendance', 'calc_json', 'JSON NULL');
  $addColumn('staff_attendance', 'client_check_in', 'DATETIME NULL');
  $addColumn('staff_attendance', 'client_check_out', 'DATETIME NULL');

  // _attendance_report این دو فیلد را مستقیماً در SELECT خود می‌خواند.
  $addColumn('users', 'device_model', 'VARCHAR(255) NULL');
  $addColumn('users', 'work_policy_id', 'INT NULL');
}

/**
 * بازسازی روزهای گزارش با «تاریخ ورود» به عنوان مالک تردد.
 * رکورد 22:30 روز X تا 07:15 روز X+1 فقط متعلق به روز X است و کامل محاسبه می‌شود.
 * روز X+1 فقط ترددهایی را می‌بیند که ورودشان واقعاً در همان روز ثبت شده است.
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

  foreach ($report['days'] as $i => $day) {
    if (!is_array($day)) continue;
    $dayJ = ShiftCalc::normJdate($day['jdate'] ?? $day['date'] ?? '');
    if (!$dayJ) continue;

    // فقط رکوردهایی که ورودشان در همین تاریخ است. عمداً رکوردی با ورود روز قبل
    // را از روز جاری نمی‌خوانیم؛ این همان نقطه‌ای است که دوباره‌شماری شیفت شب رخ می‌داد.
    [$ds, $de] = _attendance_day_bounds($dayJ);
    $db = Db::pdo();
    $st = $db->prepare("SELECT * FROM staff_attendance
      WHERE user_id=?
        AND check_in >= ? AND check_in < ?
      ORDER BY check_in");
    $st->execute([(int)$userId, date('Y-m-d H:i:s',$ds), date('Y-m-d H:i:s',$de)]);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);

    $sessions = [];
    foreach ($rows as $r) {
      $sessions[] = [
        'in'  => !empty($r['check_in']) ? strtotime($r['check_in']) : null,
        'out' => !empty($r['check_out']) ? strtotime($r['check_out']) : null,
      ];
    }

    $shift = _active_user_shift_assignment($userId, $dayJ);
    $dayRow = null;
    if ($shift && (($shift['type'] ?? '') === 'advanced')) {
      $dayRow = _shift_day_row($shift['shift_id'] ?? $shift['id'], $dayJ);
    }
    $hol = (bool)Db::one(
      "SELECT jdate FROM holidays WHERE jdate IN (?,?) LIMIT 1",
      [$dayJ, str_replace('-','/',$dayJ)]
    );

    if ($shift) {
      // هیچ clip روزانه‌ای به session نمی‌دهیم؛ شیفت شب باید از 22:00 تا خروج فردا
      // به صورت یک session واقعی محاسبه شود.
      $w = ShiftCalc::dayWork($shift, $dayJ, $dayRow, $sessions, $hol);
    } else {
      $w = [
        'worked'=>0,'in_shift'=>0,'expected'=>0,'overtime'=>0,'shortage'=>0,
        'night'=>0,'friday'=>0,'holiday'=>0,'late_in'=>0,'early_out'=>0,
        'surplus'=>0,'adjusted_ot'=>0,'friday_work'=>0,'holiday_work'=>0,
        'in'=>null,'out'=>null
      ];
    }

    $adj = _attendance_adjusted_overtime($userId, $dayJ);
    if ($adj > 0) {
      $use = min((int)$adj, (int)($w['surplus'] ?? 0));
      $w['overtime'] = (int)($w['overtime'] ?? 0) + $use;
      $w['surplus'] = max(0, (int)($w['surplus'] ?? 0) - $use);
      $w['adjusted_ot'] = $use;
    }

    // همان رکوردهای واقعی برای نمایش ورود/خروج و محل‌ها حفظ می‌شوند.
    $day['punches'] = $rows;
    $day['sessions'] = $rows;
    $day['data'] = $w;
    foreach ($metricKeys as $k) {
      if (array_key_exists($k, $w)) $day[$k] = (int)$w[$k];
    }
    $day['night_work'] = (int)($w['night'] ?? 0);
    $day['overnight_owned_by_entry_date'] = true;
    $day['continuation_of_previous_day'] = false;

    // برای روز بدون ورود جدید، تردد شب قبل عمداً در این ردیف نمایش داده نمی‌شود.
    if (!empty($rows)) {
      $day['in'] = $w['in'] ?? null;
      $day['out'] = $w['out'] ?? null;
      $first = $rows[0];
      $last = $rows[count($rows)-1];
      $day['in_station'] = $first['in_station'] ?? null;
      $day['out_station'] = $last['out_station'] ?? null;
    } else {
      $day['in'] = null;
      $day['out'] = null;
      $day['in_station'] = null;
      $day['out_station'] = null;
    }

    $report['days'][$i] = $day;
    foreach ($metricKeys as $k) $sum[$k] += (int)($w[$k] ?? 0);
    $sum['night_work'] += (int)($w['night'] ?? 0);
    if ((int)($w['worked'] ?? 0) > 0) $sum['present_days']++;
  }

  $report['totals'] = $sum;
  $report['work_totals'] = $sum;
  if (isset($report['summary']) && is_array($report['summary'])) {
    foreach ($metricKeys as $k) {
      if (array_key_exists($k, $report['summary'])) $report['summary'][$k] = $sum[$k];
    }
    if (array_key_exists('night_work', $report['summary'])) $report['summary']['night_work'] = $sum['night_work'];
    if (array_key_exists('present_days', $report['summary'])) $report['summary']['present_days'] = $sum['present_days'];
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

  // قبل از اجرای _attendance_report، اسکیمای واقعی/تاریخی گزارش را تضمین می‌کنیم.
  aar_ensure_report_schema();

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
  $from = trim((string)($_GET['from'] ?? ''));
  $to = trim((string)($_GET['to'] ?? ''));
  if (!$uid || !$from || !$to) aar_error('پرسنل و بازهٔ تاریخ را مشخص کنید', 400);

  // گزارش پایه، شامل ساختار کامل ۲۹ ستون و اطلاعات جانبی.
  $report = _attendance_report($uid, $from, $to);
  $report = aar_rebuild_overnight_report($report, $uid);
  aar_json($report);
} catch (Throwable $e) {
  error_log('admin-attendance-report: ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
  aar_error('خطای داخلی: ' . get_class($e) . ': ' . $e->getMessage() . ' (فایل: ' . basename($e->getFile()) . ' خط ' . $e->getLine() . ')', 500);
}
