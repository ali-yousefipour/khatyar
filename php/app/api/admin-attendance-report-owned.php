<?php
/*
 * گزارش تردد: مالکیت هر punch فقط بر اساس تاریخ check_in است.
 * برای شیفت شب، خروج روز بعد بخشی از همان session روز ورود است و
 * نباید به‌صورت continuation در روز بعد نمایش داده شود.
 */
function attendance_report_owned_by_entry_date($userId, $from, $to) {
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
  $report = _attendance_report($userId, $from, $to);
  if (empty($report['days']) || !is_array($report['days'])) return $report;

  $metricKeys = ['worked','in_shift','expected','overtime','shortage','night','late_in','early_out','surplus','adjusted_ot','friday_work','holiday_work'];
  foreach ($report['days'] as &$day) {
    if (!is_array($day)) continue;
    $j = str_replace('/','-',trim((string)($day['jdate'] ?? '')));
    if (!preg_match('/^\\d{4}-\\d{2}-\\d{2}$/',$j)) continue;
    [$jy,$jm,$jd] = array_map('intval', explode('-',$j));
    [$gy,$gm,$gd] = jalali_to_gregorian($jy,$jm,$jd);
    $g = sprintf('%04d-%02d-%02d',$gy,$gm,$gd);
    $next = date('Y-m-d', strtotime($g.' +1 day'));

    $owned = Db::all(
      "SELECT id,check_in,check_out FROM staff_attendance WHERE user_id=? AND check_in>=? AND check_in<? ORDER BY check_in ASC,id ASC",
      [$userId,$g.' 00:00:00',$next.' 00:00:00']
    );
    $ownedIds = [];
    foreach ($owned as $r) $ownedIds[(int)$r['id']] = true;

    $punches = [];
    foreach (($day['punches'] ?? []) as $p) {
      if (isset($ownedIds[(int)($p['id'] ?? 0)])) $punches[] = $p;
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
    $approvedExempt = min((int)($w['expected'] ?? 0), $annualLeave + $sickLeave + $unpaidLeave + $missionLeave);
    $expectedMin = max(0, (int)($w['expected'] ?? 0));
    $inShiftMin = max(0, (int)($w['in_shift'] ?? 0));
    // کسری نهایی همیشه از موظفی و حضور در شیفت محاسبه می‌شود؛ بنابراین
    // جلسهٔ ۲۲:۰۰ تا ۰۶:۰۰ پس از نرمال‌سازی شبانه، کسری ۰ دارد.
    $w['shortage'] = max(0, $expectedMin - min($inShiftMin, $expectedMin));
    if ($approvedExempt > 0) $w['shortage'] = max(0, $w['shortage'] - $approvedExempt);

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
      $eventRows = [];
      try {
        $eventRows = Db::all(
          "SELECT kind,at,meta FROM user_activity WHERE user_id=? AND at>=? AND at<=? AND kind IN ('gps_on','gps_off','app_foreground','app_background','session_start','session_end','online','offline') ORDER BY at ASC,id ASC",
          [(int)$userId,date('Y-m-d H:i:s',$sessionIn-1800),date('Y-m-d H:i:s',$sessionOut)]
        );
      } catch (Throwable $e) { error_log('attendance GPS detail events: '.$e->getMessage()); }
      $gpsOffTs = [];
      $appSignals = [];
      foreach ($eventRows as $eventRow) {
        $eventTs = strtotime((string)($eventRow['at'] ?? ''));
        if (!$eventTs) continue;
        $kind = (string)($eventRow['kind'] ?? '');
        if ($kind === 'gps_off') $gpsOffTs[] = $eventTs;
        if (in_array($kind,['app_background','session_end','offline'],true)) $appSignals[] = ['kind'=>$kind,'at'=>$eventTs];
      }
      foreach ($badRanges as $bad) {
        $rangeA=(int)($bad[0]??0); $rangeB=(int)($bad[1]??0);
        if ($rangeB <= $rangeA) continue;
        $gpsRanges[]=[$rangeA,$rangeB];
        // بازه را در مرزهای رویداد GPS-off می‌شکنیم تا یک خاموشی کوتاه،
        // کل چند ساعتِ بدون checkpoint را به‌اشتباه به GPS-off نسبت ندهد.
        $cuts=[$rangeA,$rangeB];
        foreach ($gpsOffTs as $eventTs) {
          foreach ([$eventTs-1800,$eventTs] as $cut) if ($cut>$rangeA && $cut<$rangeB) $cuts[]=$cut;
        }
        $cuts=array_values(array_unique($cuts)); sort($cuts,SORT_NUMERIC);
        for ($ci=0;$ci<count($cuts)-1;$ci++) {
          $a=(int)$cuts[$ci]; $b=(int)$cuts[$ci+1];
          if ($b<=$a) continue;
          $mid=(int)floor(($a+$b)/2);
          $gpsOffEvidence=false;
          foreach ($gpsOffTs as $eventTs) if ($mid >= $eventTs-1800 && $mid < $eventTs) { $gpsOffEvidence=true; break; }
          $nearAppSignal=null;
          foreach ($appSignals as $signal) if ($signal['at'] >= $a-300 && $signal['at'] <= $b+300) { $nearAppSignal=$signal; break; }
          if ($gpsOffEvidence) {
            $reasonCode='gps_off';
            $reason='ثبت صریح خاموش بودن GPS در سوابق دستگاه';
            $evidence='رویداد gps_off ثبت‌شده';
          } elseif ($nearAppSignal) {
            $reasonCode='app_state_signal';
            $signalLabels=['app_background'=>'برنامه وارد پس‌زمینه شده است','session_end'=>'رویداد پایان نشست ثبت شده است','offline'=>'رویداد قطع ارتباط ثبت شده است'];
            $reason=($signalLabels[$nearAppSignal['kind']]??'تغییر وضعیت برنامه/ارتباط ثبت شده است').'؛ این رویداد به‌تنهایی اثبات قطعی بسته‌شدن اجباری برنامه نیست';
            $evidence=$nearAppSignal['kind'];
          } else {
            $reasonCode='missing_checkpoint';
            $reason='تأیید دوره‌ای GPS/فعالیت در این بازه دریافت نشده است؛ علت قطعی بسته‌شدن برنامه از سوابق موجود قابل اثبات نیست';
            $evidence='نبود checkpoint معتبر در بازه';
          }
          $gpsDetails[]=[
            'start_at'=>date('Y-m-d H:i:s',$a),
            'end_at'=>date('Y-m-d H:i:s',$b),
            'minutes'=>(int)ceil(($b-$a)/60),
            'reason_code'=>$reasonCode,
            'reason'=>$reason,
            'evidence'=>$evidence
          ];
        }
      }
    }
    // بازه‌های هم‌پوشان فقط یک بار در جمع دقیقه‌ها محاسبه شوند.
    usort($gpsRanges,static fn($a,$b)=>(int)$a[0]<=>(int)$b[0]);
    $gpsInvalidSeconds=0; $gpsStart=null; $gpsEnd=null;
    foreach($gpsRanges as $range) {
      if($gpsStart===null) { $gpsStart=$range[0]; $gpsEnd=$range[1]; continue; }
      if($range[0]<=$gpsEnd) $gpsEnd=max($gpsEnd,$range[1]);
      else { $gpsInvalidSeconds+=max(0,$gpsEnd-$gpsStart); $gpsStart=$range[0]; $gpsEnd=$range[1]; }
    }
    if($gpsStart!==null) $gpsInvalidSeconds+=max(0,$gpsEnd-$gpsStart);
    usort($gpsDetails,static fn($a,$b)=>strcmp($a['start_at'],$b['start_at']));
    $day['gps_inactive_minutes']=(int)ceil(max(0,$gpsInvalidSeconds)/60);
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
  return $report;
}