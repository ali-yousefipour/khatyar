<?php
/*
 * گزارش تردد: مالکیت هر punch فقط بر اساس تاریخ check_in است.
 * برای شیفت شب، خروج روز بعد بخشی از همان session روز ورود است و
 * نباید به‌صورت continuation در روز بعد نمایش داده شود.
 */
function attendance_report_owned_by_entry_date($userId, $from, $to) {
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
    $day['absent'] = (!$punches && !$isHol) ? 1 : 0;
  }
  unset($day);
  return $report;
}
