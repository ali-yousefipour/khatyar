<?php
/**
 * اسکریپت Cron جامع (مخصوص هاست‌هایی که فقط اجرای فایل PHP را در Cron مجاز می‌دانند).
 * این فایل همهٔ کارهای زمان‌بندی‌شده را بدون نیاز به curl/wget انجام می‌دهد.
 *
 * نحوهٔ استفاده در cPanel → Cron Jobs:
 *
 *   # خروج خودکار رانندگانِ جامانده در خط (هر ۱۵ دقیقه)
 *   *\/15 * * * *  php /home/h301194/.../public/cron.php auto-exit
 *
 *   # هشدار/پیامک انقضا + تبریک تولد + پاکسازی (روزی یک‌بار، ۸ صبح)
 *   0 8 * * *  php /home/h301194/.../public/cron.php daily
 *
 *   # یا اجرای همهٔ کارها با هم:
 *   php /home/h301194/.../public/cron.php all
 *
 * مسیر دقیق فایل را از File Manager بردارید (این فایل کنار index.php است).
 * اگر مسیر php مشخص است، می‌توانید از /usr/local/bin/php استفاده کنید.
 */

// فقط از خط فرمان قابل اجراست (نه از مرورگر) مگر با کلید معتبر
$ROOT = __DIR__ . '/..';
require "$ROOT/lib/Db.php";
require "$ROOT/lib/Jwt.php";
require "$ROOT/lib/Http.php";
require "$ROOT/lib/Push.php";
require "$ROOT/lib/Sms.php";
require "$ROOT/lib/ShiftCalc.php";
require "$ROOT/lib/Bale.php";
require "$ROOT/lib/MessengerBots.php";
$CONFIG = require "$ROOT/config.php";
$GLOBALS['CONFIG'] = $CONFIG;

// route() را بی‌اثر می‌کنیم تا فقط توابع کمکیِ routes.php در دسترس قرار گیرند
if (!function_exists('route')) {
  function route($m, $p, $fn, $public = false, $minLevel = 99) { /* no-op در Cron */ }
}
require "$ROOT/lib/routes.php";

$isCli = (php_sapi_name() === 'cli');
if (!$isCli) {
  // اجرای وب فقط با کلید معتبر مجاز است (برای سازگاری با هاست‌هایی که Cron را هم HTTP می‌زنند)
  $ck = Db::one("SELECT value FROM app_settings WHERE `key`='cron_key'");
  $cronKey = $ck ? json_decode($ck['value'], true) : '';
  if (!$cronKey || ($_GET['key'] ?? '') !== $cronKey) { http_response_code(403); echo 'forbidden'; exit; }
  header('Content-Type: application/json; charset=UTF-8');
}

$task = isset($GLOBALS['CRON_TASK']) ? $GLOBALS['CRON_TASK'] : ($isCli ? ($argv[1] ?? 'all') : ($_GET['task'] ?? 'all'));
$log = [];
// توابع _cronlog_table()/_cronlog_record() اکنون در lib/routes.php تعریف شده‌اند
// (چون پنل مدیریت هم برای نمایش وضعیت کرون‌ها به آن‌ها نیاز دارد و routes.php بالاتر require شده است)


function _setting($k, $def = null) {
  $r = Db::one("SELECT value FROM app_settings WHERE `key`=?", [$k]);
  if (!$r) return $def; $v = json_decode($r['value'], true);
  return ($v === null || $v === '') ? $def : $v;
}

// ---------- ۱) خروج خودکار رانندگان جامانده در خط ----------
function cron_auto_exit(&$log) {
  $hours = (int)_setting('auto_exit_hours', 3) ?: 3;
  $stuck = Db::all("SELECT a.id, a.driver_id, a.user_id, a.line_id,
      CONCAT(COALESCE(d.first_name,''),' ',COALESCE(d.last_name,'')) dname, l.code line_code
    FROM attendances a LEFT JOIN drivers d ON d.id=a.driver_id LEFT JOIN `lines` l ON l.id=a.line_id
    WHERE a.exit_at IS NULL AND a.created_at < DATE_SUB(NOW(), INTERVAL ? HOUR)", [$hours]);
  $n = 0;
  foreach ($stuck as $row) {
    Db::run("UPDATE attendances SET exit_at=NOW() WHERE id=?", [$row['id']]);
    $n++;
    $dn = trim($row['dname']) ?: 'راننده'; $line = $row['line_code'] ?? '';
    if (!empty($row['user_id'])) {
      try { Push::send([$row['user_id']], 'تذکر عدم ثبت خروج راننده از خط',
        "راننده $dn در خط $line بیش از $hours ساعت بدون ثبت خروج مانده بود و به‌صورت خودکار خارج شد.",
        ['type'=>'auto_exit','driver_id'=>$row['driver_id']]); } catch (\Throwable $e) {}
    }
    $mgrs = Db::all("SELECT manager_id FROM user_managers WHERE user_id=?", [$row['user_id']]);
    foreach ($mgrs as $m) {
      try { Push::send([$m['manager_id']], 'عدم خروج راننده از خط توسط کاربر',
        "راننده $dn در خط $line توسط کاربر زیرمجموعه به‌موقع خارج نشد (خروج خودکار پس از $hours ساعت).",
        ['type'=>'auto_exit_mgr','driver_id'=>$row['driver_id']]); } catch (\Throwable $e) {}
    }
  }
  $log['auto_exit'] = ['closed' => $n];
}

// ---------- ۲) پیامک هشدار انقضا (در صورت فعال‌بودن) ----------
function cron_sms_expiry(&$log) {
  if (!Sms::isEnabled()) { $log['sms_expiry'] = ['skipped' => 'sms_disabled']; return; }
  $cfg = _setting('sms_expiry', []);
  $report = [];
  foreach (['taxi_lic','op_lic','inspection','insurance'] as $type) {
    $c = $cfg[$type] ?? [];
    if (empty($c['auto_enabled'])) continue;
    $days = (int)($c['days'] ?? 30);
    $lines = (isset($c['lines']) && is_array($c['lines']) && $c['lines'] && !in_array('all',$c['lines'])) ? array_map('intval',$c['lines']) : null;
    if (!function_exists('_expiry_recipients')) { $report[$type] = 'no_helper'; continue; }
    $rec = _expiry_recipients($type, 'expiring', $days, $lines);
    $sent = 0;
    foreach ($rec as $r) {
      $dup = Db::one("SELECT id FROM sms_log WHERE to_mobile=? AND kind=? AND created_at>=DATE_SUB(NOW(),INTERVAL 7 DAY) LIMIT 1", [$r['mobile'],'exp_'.$type]);
      if ($dup) continue;
      $res = Sms::send([$r['mobile']], _expiry_message($type,'expiring',$r), 'exp_'.$type, null);
      if (!empty($res['ok'])) $sent++;
    }
    $report[$type] = $sent;
  }
  $log['sms_expiry'] = $report;
}

// ---------- ۳) Push هشدار انقضا برای کاربران دارای خط ----------
function cron_push_expiry(&$log) {
  if (!function_exists('expiry_alerts')) { $log['push_expiry'] = ['skipped' => 'no_helper']; return; }
  $users = array_column(Db::all("SELECT DISTINCT user_id FROM user_lines"), 'user_id');
  $sent = 0;
  foreach ($users as $uid) {
    $alerts = expiry_alerts(['id' => $uid, 'is_admin' => 0]);
    if ($alerts) {
      try { Push::send([$uid], 'هشدار انقضای اعتبار',
        'مواردی نزدیک به انقضا دارید. برای جزئیات وارد برنامه شوید.',
        ['type'=>'expiry']); $sent++; } catch (\Throwable $e) {}
    }
  }
  $log['push_expiry'] = ['sent' => $sent];
}

// ---------- ۴) تبریک تولد ----------
function cron_birthday(&$log) {
  $get = function($k,$d=null){ $r=Db::one("SELECT value FROM app_settings WHERE `key`=?",[$k]); if(!$r)return $d; $v=json_decode($r['value'],true); return ($v===null||$v==='')?$d:$v; };
  if (empty($get('birthday_enabled', true))) { $log['birthday'] = ['sent'=>0,'skipped'=>'disabled']; return; }
  $channel = $get('birthday_channel','notif');
  $tpl = $get('birthday_message','همکار گرامی {name}
تولدتان مبارک! 🎉');
  [$jy,$jm,$jd] = gregorian_to_jalali((int)date('Y'),(int)date('m'),(int)date('d'));
  $today = function_exists('_users_with_jalali_birthday') ? _users_with_jalali_birthday((int)$jm, (int)$jd) : [];
  $n = 0; $sms = 0;
  foreach ($today as $usr) {
    $name = trim(($usr['first_name']??'').' '.($usr['last_name']??''));
    $msg = str_replace(['{name}','{first_name}'], [$name,$usr['first_name']??''], $tpl);
    // تبریک تولد همیشه در فهرست اعلان‌های داخل برنامه ثبت می‌شود و Push هم ارسال می‌گردد؛
    // تنظیم کانال فقط ارسال پیامک را کنترل می‌کند تا مشکل ارسال فقط-SMS و نبود ناتیف داخل اپ رخ ندهد.
    try { Push::notify([(int)$usr['id']], '🎂 تولدت مبارک', $msg, ['type'=>'birthday','birth_date'=>$usr['birth_date'] ?? null]); } catch (\Throwable $e) {}
    $phone = $usr['mobile'] ?? $usr['phone'] ?? null;
    if (in_array($channel,['sms','both']) && $phone && Sms::isEnabled()) { try { Sms::send([$phone],$msg,'birthday',null); $sms++; } catch (\Throwable $e) {} }
    $n++;
  }
  $log['birthday'] = ['sent' => $n, 'sms_sent'=>$sms, 'jdate'=>sprintf('%04d-%02d-%02d',$jy,$jm,$jd)];
}

// ---------- ۵) پاکسازی تصاویر قدیمی ----------
function cron_cleanup(&$log) {
  // هر نوع رسانه با کلید نگهداری مخصوص خودش (هماهنگ با تنظیمات پنل)
  $attDays   = (int)_setting('attachment_retention_days', 0);
  $formDays  = (int)_setting('form_attachment_retention_days', 0);
  $presDays  = (int)_setting('presence_retention_days', 0);
  $covertDays = (int)_setting('covert_selfie_retention_days', 0); // پاک‌سازی خودکار سلفی نامحسوس
  $cleared = 0;
  $clean = function($table, $col, $dcol, $days) use (&$cleared) {
    if ($days <= 0) return;
    $cutoff = date('Y-m-d H:i:s', time() - $days * 86400);
    // اگر ستون مسیر فایل وجود دارد، ابتدا فایل‌های فیزیکی قدیمی را حذف کن
    $pathCol = (strpos($col,'attachment')!==false) ? 'attachment_path'
             : (($col==='photo_data') ? 'photo_path' : ($col.'_path'));
    try {
      $olds = Db::all("SELECT `$pathCol` p FROM `$table` WHERE `$pathCol` IS NOT NULL AND `$pathCol`<>'' AND `$dcol` < ?", [$cutoff]);
      foreach ($olds as $o) { if (!empty($o['p'])) Media::delete($o['p']); }
      $cleared += (int)Db::run("UPDATE `$table` SET `$pathCol`=NULL WHERE `$pathCol` IS NOT NULL AND `$dcol` < ?", [$cutoff]);
    } catch (\Throwable $e) { /* ستون path ممکن است نباشد */ }
    // پاکسازی base64 قدیمی هم (برای رکوردهای مهاجرت‌نشده)
    try { $cleared += (int)Db::run("UPDATE `$table` SET `$col`=NULL WHERE `$col` IS NOT NULL AND `$dcol` < ?", [$cutoff]); }
    catch (\Throwable $e) { /* جدول/ستون ممکن است نباشد */ }
  };
  // پیوست گزارش‌ها و پیام‌ها
  $clean('reports', 'attachment_data', 'created_at', $attDays);
  $clean('notices', 'attachment_data', 'created_at', $attDays);
  try { $clean('messages', 'attachment_data', 'created_at', $attDays); } catch (\Throwable $e) {}
  // پیوست فرم‌ها و چک‌لیست‌ها
  $clean('checklist_submissions', 'photo_data', 'created_at', $formDays);
  try { $clean('form_submissions', 'attachment_data', 'created_at', $formDays); } catch (\Throwable $e) {}
  // تصاویر صحت‌سنجی حضور و سلفی‌ها
  $clean('official_visits', 'photo_data', 'created_at', $presDays);
  // سلفی نامحسوس — تنظیم جداگانه (covert_selfie_retention_days)، اگر ۰ باشد از presence استفاده می‌شود
  $effCovert = $covertDays > 0 ? $covertDays : $presDays;
  if ($effCovert > 0) {
    $cov_cutoff = date('Y-m-d H:i:s', time() - $effCovert * 86400);
    try {
      $covPaths = Db::all("SELECT photo_path p FROM covert_selfies WHERE created_at < ? AND photo_path IS NOT NULL AND photo_path<>''", [$cov_cutoff]);
      foreach ($covPaths as $cp) { if (!empty($cp['p'])) Media::delete($cp['p']); }
      $cleared += (int)Db::run("DELETE FROM covert_selfies WHERE created_at < ?", [$cov_cutoff]);
    } catch (\Throwable $e) {}
  }
  $log['cleanup'] = ['cleared'=>$cleared,'attachment_days'=>$attDays,'form_days'=>$formDays,'presence_days'=>$presDays,'covert_selfie_days'=>$effCovert];
}

function cron_mission_scoring_eod(&$log) {
  // محاسبهٔ نهاییِ امتیاز روز برای همهٔ نیروهای میدانی — حتی اگر امروز اپ را باز نکرده باشند
  // (تا امتیاز منفیِ «خط بازدید نشده / مأموریت انجام‌نشده» هم برای غایبان درست ثبت شود)
  if (!function_exists('_v191_effective_mission') || !function_exists('_v191_actual_metrics') || !function_exists('_v195_apply_daily_scoring')) {
    $log['mission_scoring'] = ['skipped'=>true]; return;
  }
  $roleKeys = ['line_supervisor','motor_patrol','vehicle_patrol','resident_inspector','chief_inspector'];
  $users = Db::all("SELECT u.id FROM users u WHERE u.is_active=1 AND EXISTS(SELECT 1 FROM user_lines ul WHERE ul.user_id=u.id)");
  $n = 0;
  foreach ($users as $row) {
    $uid = (int)$row['id'];
    try {
      $roleKey = _v191_role_key($uid);
      if (!in_array($roleKey, $roleKeys, true)) continue;
      $u = ['id'=>$uid];
      $eff = _v191_effective_mission($u, 'daily');
      $act = _v191_actual_metrics($u);
      $weightSum=0.0; $scoreSum=0.0;
      foreach (($eff['targets'] ?: []) as $t) {
        $mk=$t['metric_key']; $actual=$act['counts'][$mk]??0; $den=$act['denominators'][$mk]??0;
        $actualPercent = ($mk==='end_shift_report') ? ($actual?100:0) : _v191_pct($actual,$den);
        $target=(float)($t['target_percent']??0); $achievement=$target>0?min(100,$actualPercent/$target*100):100;
        $w=(float)($t['weight']??1); $weightSum+=$w; $scoreSum+=$achievement*$w;
      }
      $weighted = $weightSum ? round($scoreSum/$weightSum*100)/100 : 0.0;
      _v195_apply_daily_scoring($u,$act,$eff,$weighted);
      $n++;
      // اعلان خلاصهٔ امتیاز منفی امروز (اگر امتیاز منفی داشته باشد)
      if (class_exists('Push')) {
        try {
          $neg = Db::all("SELECT s.rule_key,s.points,sr.title FROM mission_score_daily s LEFT JOIN score_rules sr ON sr.rule_key=s.rule_key
            WHERE s.user_id=? AND s.score_date=CURDATE() AND s.points<0", [$uid]);
          if ($neg) {
            $total = array_sum(array_map(fn($r)=>(float)$r['points'], $neg));
            $reasons = implode('، ', array_map(fn($r)=>$r['title'] ?: $r['rule_key'], array_slice($neg,0,3)));
            Push::notify([$uid], '⚠ امتیاز منفی امروز',
              round($total,1) . ' امتیاز منفی بابت: ' . $reasons . '. برای جزئیات به «داشبورد و امتیاز من» مراجعه کنید.',
              ['type'=>'mission_negative_score','total'=>$total]);
          }
        } catch (\Throwable $e) { /* اعلان هرگز نباید مانع محاسبهٔ امتیاز شود */ }
      }
    } catch (\Throwable $e) { /* یک کاربر مشکل‌دار نباید بقیه را متوقف کند */ }
  }
  $log['mission_scoring'] = ['processed_users'=>$n];

  // اعطای نشان‌ها: روزانه همیشه، هفتگی فقط جمعه‌ها (پایان هفتهٔ شمسی)، ماهانه فقط آخرین روز ماه شمسی
  if (function_exists('_v197_award_badges') && function_exists('gregorian_to_jalali')) {
    try {
      [$jy,$jm,$jd] = gregorian_to_jalali((int)date('Y'), (int)date('n'), (int)date('j'));
      $badges = ['daily'=>_v197_award_badges('daily',$jy,$jm,$jd)];
      if (class_exists('ShiftCalc')) {
        $todayJ = sprintf('%04d-%02d-%02d',$jy,$jm,$jd);
        if (ShiftCalc::isFriday($todayJ)) $badges['weekly'] = _v197_award_badges('weekly',$jy,$jm,$jd);
        if ($jd === ShiftCalc::jMonthDays($jy,$jm)) $badges['monthly'] = _v197_award_badges('monthly',$jy,$jm,$jd);
      }
      $log['mission_badges'] = $badges;
    } catch (\Throwable $e) { $log['mission_badges'] = ['error'=>$e->getMessage()]; }
  }

  // ارسال خودکار خلاصهٔ گزارش روزانه به مدیران ارشد (سربازرس‌ها و ادمین‌ها) از طریق بله/تلگرام/ایتا
  if (function_exists('_v196_role_group_summary') && class_exists('MessengerHub')) {
    try {
      $today = date('Y-m-d');
      $roleSummary = _v196_role_group_summary($today);
      $lineRows = Db::all("SELECT COUNT(DISTINCT v.id) total_vehicles,
          (SELECT COUNT(DISTINCT cs.driver_id) FROM checklist_submissions cs JOIN vehicles vv ON vv.id=cs.vehicle_id JOIN `lines` ll ON ll.id=vv.line_id WHERE DATE(cs.created_at)=?) checked_count
        FROM vehicles v", [$today]);
      $totalV = (int)($lineRows[0]['total_vehicles'] ?? 0); $checkedV = (int)($lineRows[0]['checked_count'] ?? 0);
      $coverage = $totalV > 0 ? round($checkedV / $totalV * 100, 1) : 0;
      $weakCount = 0;
      try {
        $weakCount = (int)(Db::one("SELECT COUNT(*) n FROM (SELECT l.id FROM `lines` l LEFT JOIN vehicles v ON v.line_id=l.id
          GROUP BY l.id HAVING COUNT(v.id)>0 AND
          (SELECT COUNT(DISTINCT cs.driver_id) FROM checklist_submissions cs JOIN vehicles vv ON vv.id=cs.vehicle_id WHERE vv.line_id=l.id AND DATE(cs.created_at)=?) / COUNT(v.id) < 0.4
          ) w", [$today])['n'] ?? 0);
      } catch (\Throwable $e) {}
      $incompleteCount = 0;
      if (function_exists('_v196_field_users_snapshot')) {
        $snap = _v196_field_users_snapshot($today);
        $incompleteCount = count(array_filter($snap, fn($s)=>!empty($s['has_mission']) && (float)$s['weighted_achievement'] < 50));
      }
      $roleLines = [];
      $roleLabels = ['line_supervisor'=>'ناظر خط','motor_patrol'=>'گشت موتوری','vehicle_patrol'=>'بازرس گشت خودرویی','resident_inspector'=>'بازرس مقیم','chief_inspector'=>'سربازرس'];
      foreach ($roleSummary as $g) {
        $roleLines[] = '• '.($roleLabels[$g['role_key']] ?? $g['role_key']).": ".$g['count']." نفر، میانگین تحقق ٪".$g['avg_achievement'];
      }
      $text = "📊 گزارش خودکار روزانهٔ عملیات میدانی\n".jdate_fa_label()."\n\n"
        ."🚕 پوشش کل شهر: ٪{$coverage} ({$checkedV} از {$totalV} خودرو)\n"
        ."⚠ خطوط کم‌پوشش: {$weakCount} خط\n"
        ."🚫 مأموریت‌های ناقص: {$incompleteCount} نفر\n\n"
        .implode("\n", $roleLines)
        ."\n\nجزئیات کامل: پنل مدیریت ← داشبورد مدیریتی کل‌شهر";
      $managers = Db::all("SELECT id FROM users WHERE is_active=1 AND is_admin=1");
      $managerIds = array_map(fn($r)=>(int)$r['id'], $managers);
      if ($managerIds) {
        $res = MessengerHub::sendToUserIds($managerIds, '📊 گزارش خودکار روزانهٔ عملیات میدانی', $text, 'daily_report_notify', ['type'=>'daily_report']);
        $log['daily_report_broadcast'] = ['recipients'=>count($managerIds), 'result'=>MessengerHub::totals($res)];
      }
    } catch (\Throwable $e) { $log['daily_report_broadcast'] = ['error'=>$e->getMessage()]; }
  }
}
function jdate_fa_label(){
  if (!function_exists('gregorian_to_jalali')) return date('Y-m-d');
  [$jy,$jm,$jd] = gregorian_to_jalali((int)date('Y'), (int)date('n'), (int)date('j'));
  $months = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
  return $jd.' '.($months[$jm-1] ?? '').' '.$jy;
}

// ---------- اجرا بر اساس task ----------
$cronOk = true; $cronErr = null;
try {
  switch ($task) {
    case 'auto-exit': cron_auto_exit($log); break;
    case 'sms-expiry': cron_sms_expiry($log); break;
    case 'push-expiry': cron_push_expiry($log); break;
    case 'birthday': cron_birthday($log); break;
    case 'cleanup': cron_cleanup($log); break;
    case 'daily': // کارهای روزانه
      cron_sms_expiry($log); _cronlog_record('sms-expiry','ok',null,$isCli);
      cron_push_expiry($log); _cronlog_record('push-expiry','ok',null,$isCli);
      cron_birthday($log); _cronlog_record('birthday','ok',null,$isCli);
      cron_cleanup($log); _cronlog_record('cleanup','ok',null,$isCli);
      break;
    case 'mission-scoring': // نهایی‌سازی امتیاز روز نیروهای میدانی — پیشنهاد: پایان روز کاری (مثلاً ۲۳:۰۰)، نه ۸ صبح
      cron_mission_scoring_eod($log); break;
    case 'all':
    default:
      cron_auto_exit($log); _cronlog_record('auto-exit','ok',null,$isCli);
      cron_sms_expiry($log); _cronlog_record('sms-expiry','ok',null,$isCli);
      cron_push_expiry($log); _cronlog_record('push-expiry','ok',null,$isCli);
      cron_birthday($log); _cronlog_record('birthday','ok',null,$isCli);
      cron_cleanup($log); _cronlog_record('cleanup','ok',null,$isCli);
      cron_mission_scoring_eod($log); _cronlog_record('mission-scoring','ok',null,$isCli);
      break;
  }
} catch (\Throwable $e) { $cronOk = false; $cronErr = $e->getMessage(); }
_cronlog_record($task, $cronOk ? 'ok' : 'error', $cronOk ? json_encode($log, JSON_UNESCAPED_UNICODE) : $cronErr, $isCli);

$out = ['ok' => $cronOk, 'task' => $task, 'at' => date('c'), 'result' => $log];
if (!$cronOk) $out['error'] = $cronErr;
if ($isCli) {
  fwrite(STDOUT, json_encode($out, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n");
} else {
  echo json_encode($out, JSON_UNESCAPED_UNICODE);
}
