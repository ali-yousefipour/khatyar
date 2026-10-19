<?php
/*
 * گزارش تردد: مالکیت هر punch فقط بر اساس تاریخ check_in است.
 * برای شیفت شب، خروج روز بعد بخشی از همان session روز ورود است و
 * نباید به‌صورت continuation در روز بعد نمایش داده شود.
 */
function attendance_report_owned_by_entry_date($userId, $from, $to, $liveOnly=false) {
  /*
   * این helper از route قدیمی _attendance_report استفاده می‌کند، اما باید
   * مستقل از ترتیب load فایل‌ها هم قابل اجرا باشد. در index معمولاً routes.php
   * قبلاً load شده است؛ این require_once فقط در صورت نبود تابع اجرا می‌شود.
   */
  if (!function_exists('_attendance_report')) {
    require_once dirname(__DIR__, 2) . '/lib/routes.php';
  }
  if (!function_exists('_attendance_report')) {
    throw new RuntimeException('attendance report handler is unavailable');
  }
  if(!$liveOnly){
    $frozen=_frozen_attendance_report($userId,$from,$to);
    if($frozen!==null)return $frozen;
  }
  $report = _attendance_report($userId, $from, $to);
  if (empty($report['days']) || !is_array($report['days'])) return $report;

  $metricKeys = ['worked','in_shift','expected','overtime','shortage','night','late_in','early_out','surplus','adjusted_ot','friday_work','holiday_work'];
  $employment = null;
  try {
    $columns = Db::one("SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='users' AND column_name IN ('employment_start_date','employment_end_date')");
    if ((int)($columns['n'] ?? 0) === 2) $employment = Db::one('SELECT employment_start_date,employment_end_date FROM users WHERE id=?',[$userId]);
  } catch (Throwable $error) { error_log('Employment-period lookup failed: '.$error->getMessage()); }
  $employmentStart = ShiftCalc::normJdate($employment['employment_start_date']??'');
  $employmentEnd = ShiftCalc::normJdate($employment['employment_end_date']??'');
  foreach ($report['days'] as &$day) {
    if (!is_array($day)) continue;
    $j = str_replace('/','-',trim((string)($day['jdate'] ?? '')));
    if (!preg_match('/^\\d{4}-\\d{2}-\\d{2}$/',$j)) continue;
    if (($employmentStart && strcmp($j,$employmentStart)<0) || ($employmentEnd && strcmp($j,$employmentEnd)>0)) {
      $day['outside_employment_period']=true;
      foreach (array_merge($metricKeys,['absence_shortage','annual_leave','sick_leave','unpaid_leave','mission']) as $field) $day[$field]='00:00';
      foreach (['annual_leave_minutes','sick_leave_minutes','unpaid_leave_minutes','mission_minutes','gps_inactive_minutes','absent'] as $field) $day[$field]=0;
      $day['gps_inactive_details']=[];
      if (isset($day['data']) && is_array($day['data'])) $day['data']=array_fill_keys($metricKeys,0);
      $day['absence_reason']='خارج از بازه همکاری';
      continue;
    }
    [$jy,$jm,$jd] = array_map('intval', explode('-',$j));
    [$gy,$gm,$gd] = jalali_to_gregorian($jy,$jm,$jd);
    $g = sprintf('%04d-%02d-%02d',$gy,$gm,$gd);
    $next = date('Y-m-d', strtotime($g.' +1 day'));

    $owned = Db::all(
      "SELECT id,check_in,check_out,method FROM staff_attendance WHERE user_id=? AND check_in>=? AND check_in<? ORDER BY check_in ASC,id ASC",
      [$userId,$g.' 00:00:00',$next.' 00:00:00']
    );
    $ownedIds = [];
    foreach ($owned as $r) $ownedIds[(int)$r['id']] = $r;

    $punches = [];
    foreach (($day['punches'] ?? []) as $p) {
      if (isset($ownedIds[(int)($p['id'] ?? 0)])) {
        $record=$ownedIds[(int)$p['id']];
        if(empty($p['method']))$p['method']=$record['method']??null;
        $punches[]=$p;
      }
    }

    $sessions = [];
    foreach ($punches as $p) {
      $in = !empty($p['in_full']) ? strtotime($p['in_full']) : 0;
      $out = !empty($p['out_full']) ? strtotime($p['out_full']) : 0;
      if ($in && $out) {
        [$in,$out] = ShiftCalc::normalizeSessionPair($in,$out);
        if ($out > $in) $sessions[] = ['in'=>$in,'out'=>$out,'clip_start'=>$in,'clip_end'=>$out];
      }
    }

    $shift = _active_user_shift_assignment($userId,$j);
    $dr = ($shift && (($shift['type'] ?? '') === 'advanced'))
      ? _shift_day_row($shift['shift_id'] ?? $shift['id'],$j) : null;
    $isHol = !empty($day['is_holiday']);
    $w = $shift
      ? ShiftCalc::dayWork($shift,$j,$dr,$sessions,$isHol)
      : ['worked'=>0,'in_shift'=>0,'expected'=>0,'overtime'=>0,'shortage'=>0,'night'=>0,'late_in'=>0,'early_out'=>0,'surplus'=>0,'adjusted_ot'=>0];

    $adj = _attendance_adjusted_overtime($userId,$j);
    if ($adj > 0) {
      $use = min((int)$adj,(int)($w['surplus'] ?? 0));
      $w['overtime'] = (int)($w['overtime'] ?? 0) + $use;
      $w['surplus'] = max(0,(int)($w['surplus'] ?? 0) - $use);
      $w['adjusted_ot'] = $use;
    }

    $hm = static fn($m) => sprintf('%02d:%02d',intdiv(max(0,(int)$m),60),max(0,(int)$m)%60);
    // مرخصی تأییدشده باید همان‌طور که در گزارش اصلی محاسبه می‌شود،
    // موظفی را تا سقف مقدار مرخصی پوشش دهد و برای بخش پوشش‌داده‌شده
    // نه کسری کار و نه غیبت تولید شود.
    $annualLeave = max(0, (int)($day['annual_leave_minutes'] ?? 0));
    $sickLeave = max(0, (int)($day['sick_leave_minutes'] ?? 0));
    $unpaidLeave = max(0, (int)($day['unpaid_leave_minutes'] ?? 0));
    $missionLeave = max(0, (int)($day['mission_minutes'] ?? 0));
    $annualText = trim((string)($day['annual_leave'] ?? '00:00'));
    $sickText = trim((string)($day['sick_leave'] ?? '00:00'));
    $unpaidText = trim((string)($day['unpaid_leave'] ?? '00:00'));
    $missionText = trim((string)($day['mission'] ?? '00:00'));
    $toMinutes = static function($v){
      if (preg_match('/^(\d+):(\d{2})$/', (string)$v, $m)) return ((int)$m[1])*60+(int)$m[2];
      return 0;
    };
    $annualLeave = $annualLeave ?: $toMinutes($annualText);
    $sickLeave = $sickLeave ?: $toMinutes($sickText);
    $unpaidLeave = $unpaidLeave ?: $toMinutes($unpaidText);
    $missionLeave = $missionLeave ?: $toMinutes($missionText);
    $approvedExempt = min((int)($w['expected'] ?? 0), $annualLeave + $sickLeave + $unpaidLeave);
    $expectedMin = max(0, (int)($w['expected'] ?? 0));
    $inShiftMin = max(0, (int)($w['in_shift'] ?? 0));
    // The canonical daily report already applies shift rules, attendance credits,
    // leave, and absence allocation. Do not replace its shortage with the naive
    // difference between expected duty and in-shift minutes; the two are not
    // equivalent when attendance is credited or settled outside shift windows.
    $dailyShortage = $day['shortage'] ?? ($day['data']['shortage'] ?? null);
    $parseDailyMinutes = static function($value): ?int {
      if (is_int($value)) return max(0, $value);
      if (is_float($value)) return max(0, (int)$value);
      if (is_string($value) && preg_match('/^([0-9]+):([0-5][0-9])$/', trim($value), $parts))
        return ((int)$parts[1]) * 60 + (int)$parts[2];
      if (is_string($value) && ctype_digit(trim($value))) return (int)$value;
      return null;
    };
    $canonicalShortage = $parseDailyMinutes($dailyShortage);
    if ($canonicalShortage !== null) {
      // Daily source is authoritative; leave was already applied in that source.
      $w['shortage'] = $canonicalShortage;
    } else {
      // Fallback for older payloads without a daily shortage field.
      $w['shortage'] = max(0, (int)($w['shortage'] ?? 0) - $approvedExempt);
    }

    // کسری GPS/برنامه برای هر session فقط به تاریخ ورود همان session تعلق دارد.
    // این کار از شکستن یک شیفت شب بین دو روز و نمایش کسری گمراه‌کننده در روز بعد جلوگیری می‌کند.
    $gpsRanges = [];
    $gpsDetails = [];
    foreach ($owned as $attendanceRow) {
      $sessionIn = strtotime((string)($attendanceRow['check_in'] ?? ''));
      $sessionOut = !empty($attendanceRow['check_out']) ? strtotime((string)$attendanceRow['check_out']) : time();
      if (!$sessionIn || !$sessionOut || $sessionOut <= $sessionIn) continue;
      $badRanges = _gps_work_invalid_intervals((int)$userId, $sessionIn, $sessionOut, empty($attendanceRow['check_out']));
      if (!$badRanges) continue;
      foreach ($badRanges as $bad) {
        $rangeA=(int)($bad[0]??0); $rangeB=(int)($bad[1]??0);
        if ($rangeB > $rangeA) $gpsRanges[]=[$rangeA,$rangeB];
      }
    }
    usort($gpsRanges,static fn($a,$b)=>(int)$a[0]<=>(int)$b[0]);
    $gpsInvalidSeconds=0; $gpsStart=null; $gpsEnd=null;
    foreach($gpsRanges as $range) {
      if($gpsStart===null) { $gpsStart=$range[0]; $gpsEnd=$range[1]; continue; }
      if($range[0]<=$gpsEnd) $gpsEnd=max($gpsEnd,$range[1]);
      else { $gpsInvalidSeconds+=max(0,$gpsEnd-$gpsStart); $gpsDetails[]=['start_at'=>date('Y-m-d H:i:s',$gpsStart),'end_at'=>date('Y-m-d H:i:s',$gpsEnd),'minutes'=>(int)ceil(($gpsEnd-$gpsStart)/60),'reason_code'=>'gps_off','reason'=>'ثبت صریح خاموش بودن GPS در سوابق دستگاه','evidence'=>'رویداد gps_off ثبت‌شده']; $gpsStart=$range[0]; $gpsEnd=$range[1]; }
    }
    if($gpsStart!==null) { $gpsInvalidSeconds+=max(0,$gpsEnd-$gpsStart); $gpsDetails[]=['start_at'=>date('Y-m-d H:i:s',$gpsStart),'end_at'=>date('Y-m-d H:i:s',$gpsEnd),'minutes'=>(int)ceil(($gpsEnd-$gpsStart)/60),'reason_code'=>'gps_off','reason'=>'ثبت صریح خاموش بودن GPS در سوابق دستگاه','evidence'=>'رویداد gps_off ثبت‌شده']; }
    usort($gpsDetails,static fn($a,$b)=>strcmp($a['start_at'],$b['start_at']));
    // Admin waiver suppresses the deducted minutes; original GPS evidence remains intact.
    require_once dirname(__DIR__,2).'/lib/GpsWorkIntervals.php';
    $gpsDetails=array_values(array_filter($gpsDetails,static function($detail) use ($userId) {
      return !gps_work_is_waived((int)$userId,(string)$detail['start_at'],(string)$detail['end_at']);
    }));
    $gpsInvalidSeconds=0;
    foreach($gpsDetails as $detail)$gpsInvalidSeconds+=max(0,strtotime($detail['end_at'])-strtotime($detail['start_at']));
    $day['gps_inactive_minutes']=(int)ceil(max(0,$gpsInvalidSeconds)/60);
    if(isset($day['data']) && is_array($day['data']))$day['data']['gps_inactive_minutes']=$day['gps_inactive_minutes'];
    $day['gps_inactive_details']=$gpsDetails;
    $day['punches'] = $punches;
    $day['in_shift'] = $hm($w['in_shift'] ?? 0);
    $day['worked'] = $hm($w['worked'] ?? 0);
    $day['expected'] = $hm($w['expected'] ?? 0);
    $day['late_in'] = $hm($w['late_in'] ?? 0);
    $day['early_out'] = $hm($w['early_out'] ?? 0);
    $day['shortage'] = $hm($w['shortage'] ?? 0);
    $day['night'] = $hm($w['night'] ?? 0);
    $day['overtime'] = $hm($w['overtime'] ?? 0);
    $day['surplus'] = $hm($w['surplus'] ?? 0);
    $day['adjusted_ot'] = $hm($w['adjusted_ot'] ?? 0);
    $day['friday_work'] = $hm($w['friday_work'] ?? $w['friday'] ?? 0);
    $day['holiday_work'] = $hm($w['holiday_work'] ?? $w['holiday'] ?? 0);
    $day['absent'] = (!$punches && !$isHol && !ShiftCalc::isFriday($j) && (int)($w['expected'] ?? 0) > 0 && $approvedExempt <= 0) ? 1 : 0;
    // در روز غیبت، کل موظفی قبلاً به‌عنوان کسری محاسبه شده است؛
    // بنابراین نباید موظفیِ غیبت دوباره به کسری اضافه شود.
    $day['absence_shortage'] = $hm((int)($w['shortage'] ?? 0));
  }
  unset($day);
  $gpsMinutesTotal=0;
  foreach(($report['days']??[]) as $entry)$gpsMinutesTotal+=max(0,(int)($entry['gps_inactive_minutes']??0));
  foreach(['totals','work_totals','summary'] as $section){
    if(isset($report[$section]) && is_array($report[$section]) && array_key_exists('gps_inactive_minutes',$report[$section]))
      $report[$section]['gps_inactive_minutes']=$gpsMinutesTotal;
  }
  return $report;
}
