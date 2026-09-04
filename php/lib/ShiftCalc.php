<?php
// موتور محاسبهٔ دقیق کارکرد شیفت
// وابسته به توابع جلالی موجود در routes.php: jalali_to_gregorian, gregorian_to_jalali

class ShiftCalc
{
    static function hm($s) {
        if (!$s || strpos((string)$s, ':') === false) return null;
        $p = explode(':', (string)$s);
        $h = max(0, min(47, (int)$p[0]));
        $m = max(0, min(59, (int)($p[1] ?? 0)));
        return $h * 60 + $m;
    }

    static function normJdate($jdate) {
        $jdate = str_replace('/', '-', trim((string)$jdate));
        if (!preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/', $jdate, $m)) return null;
        return sprintf('%04d-%02d-%02d', (int)$m[1], (int)$m[2], (int)$m[3]);
    }

    static function slashJdate($jdate) {
        $jdate = self::normJdate($jdate);
        return $jdate ? str_replace('-', '/', $jdate) : null;
    }

    static function jdateAddDays($jdate, $days) {
        $ts = self::jdateToTs($jdate);
        if ($ts === null) return null;
        $ts += ((int)$days) * 86400;
        if (!function_exists('gregorian_to_jalali')) return null;
        [$jy,$jm,$jd] = gregorian_to_jalali((int)date('Y',$ts), (int)date('n',$ts), (int)date('j',$ts));
        return sprintf('%04d-%02d-%02d', $jy,$jm,$jd);
    }

    static function jdateToTs($jdate) {
        $jdate = self::normJdate($jdate);
        if (!$jdate) return null;
        [$jy,$jm,$jd] = array_map('intval', explode('-', $jdate));
        [$gy,$gm,$gd] = jalali_to_gregorian($jy,$jm,$jd);
        return mktime(12, 0, 0, $gm, $gd, $gy);
    }

    static function jweekday($jdate) {
        $ts = self::jdateToTs($jdate);
        if ($ts === null) return null;
        $w = (int)date('w', $ts);
        $map = [6=>0, 0=>1, 1=>2, 2=>3, 3=>4, 4=>5, 5=>6];
        return $map[$w];
    }

    static function isFriday($jdate) { return self::jweekday($jdate) === 6; }

    static function isJalaliLeap($jy) {
        $a = $jy - (($jy >= 0) ? 474 : 473);
        $b = 474 + ($a % 2820);
        return ((($b + 38) * 682) % 2816) < 682;
    }

    static function jMonthDays($jy, $jm) {
        if ($jm >= 1 && $jm <= 6) return 31;
        if ($jm >= 7 && $jm <= 11) return 30;
        return self::isJalaliLeap((int)$jy) ? 30 : 29;
    }

    static function parseJson($v) {
        if (is_array($v)) return $v;
        if ($v === null || $v === '') return [];
        $x = json_decode((string)$v, true);
        return is_array($x) ? $x : [];
    }

    /* تعطیلی مؤثر روز: تقویم رسمی ایران + تعطیلی دستی سازمان. */
    static function effectiveHoliday($jdate, $fallback=false) {
        $official = false;
        $manual = false;
        if (class_exists('IranCalendar')) {
            try {
                $d = IranCalendar::day($jdate);
                $official = !empty($d['is_official_holiday']);
                $manual = !empty($d['is_manual_holiday']);
            } catch (Throwable $e) {}
        }
        // برای سازگاری با مسیرهای قدیمی، مقدار ورودی فقط می‌تواند تعطیلی را اضافه کند، نه حذف.
        return (bool)$fallback || $official || $manual;
    }

    static function segmentLength($seg) {
        $a = self::hm($seg['s'] ?? null); $b = self::hm($seg['e'] ?? null);
        if ($a === null || $b === null) return 0;
        if ($b <= $a) $b += 1440;
        return max(0, $b - $a);
    }

    static function segmentWindow($seg, $baseTs) {
        $a = self::hm($seg['s'] ?? null); $b = self::hm($seg['e'] ?? null);
        if ($a === null || $b === null) return null;
        if ($b <= $a) $b += 1440;
        $day0 = strtotime(date('Y-m-d 00:00:00', $baseTs));
        return [$day0 + $a * 60, $day0 + $b * 60];
    }

    static function rotationSegments($shift, $jdate) {
        $adv = self::parseJson($shift['advanced'] ?? null);
        $rot = $adv['rotation'] ?? $adv;
        if (!is_array($rot)) return [];
        $start = self::normJdate($rot['cycle_start_jdate'] ?? $rot['start_jdate'] ?? '');
        if (!$start) return [];
        $cycle = $rot['cycle'] ?? null;
        if (!is_array($cycle) || !$cycle) {
            $cycle = [
                ['days'=>7,'segments'=>[['s'=>'07:00','e'=>'15:00','es'=>'06:30','ls'=>'07:30','ee'=>'14:30','le'=>'15:30']]],
                ['days'=>7,'segments'=>[['s'=>'15:00','e'=>'23:00','es'=>'14:30','ls'=>'15:30','ee'=>'22:30','le'=>'23:30']]],
                ['days'=>7,'segments'=>[['s'=>'23:00','e'=>'07:00','es'=>'22:30','ls'=>'23:30','ee'=>'06:30','le'=>'07:30']]],
            ];
        }
        $st = self::jdateToTs($start); $dt = self::jdateToTs($jdate);
        if ($st === null || $dt === null || $dt < $st) return [];
        $diffDays = (int)floor(($dt - $st) / 86400);
        $len = 0; foreach ($cycle as $c) $len += max(1, (int)($c['days'] ?? 1));
        if ($len <= 0) return [];
        $pos = $diffDays % $len; $acc = 0;
        foreach ($cycle as $c) {
            $d = max(1, (int)($c['days'] ?? 1));
            if ($pos >= $acc && $pos < $acc + $d) return is_array($c['segments'] ?? null) ? $c['segments'] : [];
            $acc += $d;
        }
        return [];
    }

    static function daySegments($shift, $jdate, $dayRow = null) {
        $type = $shift['type'] ?? 'simple';
        if ($type === 'advanced') {
            if (!$dayRow) return [];
            if (!empty($dayRow['is_off'])) return [];
            $segs = self::parseJson($dayRow['segments'] ?? null);
            return is_array($segs) ? $segs : [];
        }
        if ($type === 'floating') return [];
        if ($type === 'rotating') return self::rotationSegments($shift, $jdate);
        $weekly = self::parseJson($shift['weekly'] ?? null);
        if (!is_array($weekly)) return [];
        $wd = self::jweekday($jdate);
        $segs = $weekly[(string)$wd] ?? $weekly[$wd] ?? [];
        return is_array($segs) ? $segs : [];
    }

    static function overlapMinutes($a1, $a2, $b1, $b2) {
        if (!$a1 || !$a2 || !$b1 || !$b2 || $a2 <= $a1 || $b2 <= $b1) return 0;
        return max(0, (int)floor((min($a2,$b2) - max($a1,$b1)) / 60));
    }

    static function nightMinutes($inTs, $outTs, $nightStart = '22:00', $nightEnd = '06:00') {
        if (!$inTs || !$outTs || $outTs <= $inTs) return 0;
        $ns = self::hm($nightStart ?: '22:00');
        $ne = self::hm($nightEnd ?: '06:00');
        if ($ns === null) $ns = 22 * 60;
        if ($ne === null) $ne = 6 * 60;
        if ($ne <= $ns) $ne += 1440;
        $total = 0;
        $cursor = strtotime(date('Y-m-d 00:00:00', $inTs)) - 86400;
        $endDay = strtotime(date('Y-m-d 00:00:00', $outTs)) + 86400;
        for ($d=$cursor; $d <= $endDay; $d += 86400) {
            $total += self::overlapMinutes($inTs, $outTs, $d + $ns * 60, $d + $ne * 60);
        }
        return $total;
    }

    static function expectedMinutes($shift, $jdate, $dayRow = null) {
        $cfg = self::parseJson($dayRow['day_config'] ?? null);
        if (isset($cfg['duty_min']) && $cfg['duty_min'] !== '' && $cfg['duty_min'] !== null) return max(0, (int)$cfg['duty_min']);
        if (($shift['type'] ?? '') === 'floating') return (int)($shift['float_minutes'] ?? 0);
        $expected = 0;
        foreach (self::daySegments($shift, $jdate, $dayRow) as $seg) $expected += self::segmentLength($seg);
        return $expected;
    }

    static function roleOtCap($shift) {
        $cap = $shift['auto_ot_cap_min'] ?? null;
        if ($cap !== null && $cap !== '') return max(0, (int)$cap);
        $role = trim((string)($shift['role_title'] ?? $shift['role'] ?? ''));
        $roleKey = trim((string)($shift['role_key'] ?? ''));
        $txt = $roleKey . ' ' . $role;
        if (preg_match('/اداری|niroo|office/i', $txt)) return 240;
        if (preg_match('/بازرس|سربازرس|inspector/i', $txt)) return 147;
        return 27;
    }

    static function autoDayWork($shift, $jdate, $sessions, $isHoliday) {
        $isHoliday = self::effectiveHoliday($jdate, $isHoliday);
        $worked = 0; $night = 0; $inMin = null; $outMax = null;
        $now = time();
        $todayJ = null;
        if (function_exists('gregorian_to_jalali')) {
            [$ty,$tm,$td] = gregorian_to_jalali((int)date('Y'), (int)date('n'), (int)date('j'));
            $todayJ = sprintf('%04d-%02d-%02d',$ty,$tm,$td);
        }
        foreach ($sessions as $s) {
            if (empty($s['in'])) continue;
            $rawIn = (int)$s['in'];
            $rawOut = !empty($s['out']) ? (int)$s['out'] : ((self::normJdate($jdate) === $todayJ) ? $now : null);
            if (!$rawOut || $rawOut <= $rawIn) continue;
            $in = !empty($s['clip_start']) ? max($rawIn, (int)$s['clip_start']) : $rawIn;
            $out = !empty($s['clip_end']) ? min($rawOut, (int)$s['clip_end']) : $rawOut;
            if (!$out || $out <= $in) continue;
            $worked += max(0, (int)floor(($out - $in) / 60));
            $night += self::nightMinutes($in, $out, $shift['night_start'] ?? '22:00', $shift['night_end'] ?? '06:00');
            if ($inMin === null || $in < $inMin) $inMin = $in;
            if ($outMax === null || $out > $outMax) $outMax = $out;
        }
        $isFri = self::isFriday($jdate);
        $countFriday = !isset($shift['friday_calc']) || !empty($shift['friday_calc']);
        $countHoliday = !isset($shift['holiday_calc']) || !empty($shift['holiday_calc']);
        $countNight = !isset($shift['night_calc']) || !empty($shift['night_calc']);
        $includeFridayDuty = !empty($shift['include_friday_in_duty']);
        $includeHolidayDuty = !empty($shift['include_holiday_in_duty']);
        $offLike = ($isFri && $countFriday && !$includeFridayDuty) || ($isHoliday && !$isFri && $countHoliday && !$includeHolidayDuty);
        $expected = $offLike ? 0 : (int)($shift['auto_expected_min'] ?? 453);
        $cap = self::roleOtCap($shift);
        $rawExtra = max(0, $worked - $expected);
        $overtime = min($rawExtra, $cap);
        $surplus = max(0, $rawExtra - $cap);
        $shortage = max(0, $expected - min($worked, $expected));
        if (!$countNight) $night = 0;
        return [
            'jdate'=>$jdate,'worked'=>$worked,'in_shift'=>min($worked,$expected),'expected'=>$expected,
            'overtime'=>$overtime,'surplus'=>$surplus,'shortage'=>$shortage,
            'night'=>$night,'friday'=>($countFriday && $isFri) ? $worked : 0,'holiday'=>($countHoliday && $isHoliday && !$isFri) ? $worked : 0,
            'late_in'=>0,'early_out'=>0,
            'in'=>$inMin ? date('H:i',$inMin) : null,'out'=>$outMax ? date('H:i',$outMax) : null,
            'is_off'=>$offLike,'auto'=>true,'ot_cap'=>$cap,
        ];
    }

    static function dayWork($shift, $jdate, $dayRow, $sessions, $isHoliday) {
        $isHoliday = self::effectiveHoliday($jdate, $isHoliday);
        if (($shift['type'] ?? '') === 'auto') return self::autoDayWork($shift, $jdate, $sessions, $isHoliday);
        $worked = 0; $night = 0; $inMin = null; $outMax = null;
        $now = time();
        $jTs = self::jdateToTs($jdate); $todayJ = null;
        if (function_exists('gregorian_to_jalali')) {
            [$ty,$tm,$td] = gregorian_to_jalali((int)date('Y'), (int)date('n'), (int)date('j'));
            $todayJ = sprintf('%04d-%02d-%02d', $ty,$tm,$td);
        }
        foreach ($sessions as $s) {
            if (empty($s['in'])) continue;
            $rawIn = (int)$s['in'];
            $rawOut = !empty($s['out']) ? (int)$s['out'] : ((self::normJdate($jdate) === $todayJ) ? $now : null);
            if (!$rawOut || $rawOut <= $rawIn) continue;
            $in = !empty($s['clip_start']) ? max($rawIn, (int)$s['clip_start']) : $rawIn;
            $out = !empty($s['clip_end']) ? min($rawOut, (int)$s['clip_end']) : $rawOut;
            if (!$out || $out <= $in) continue;
            $worked += max(0, (int)floor(($out - $in) / 60));
            $night += self::nightMinutes($in, $out, $shift['night_start'] ?? '22:00', $shift['night_end'] ?? '06:00');
            if ($inMin === null || $in < $inMin) $inMin = $in;
            if ($outMax === null || $out > $outMax) $outMax = $out;
        }
        $type = $shift['type'] ?? 'simple';
        $dayCfg = self::parseJson($dayRow['day_config'] ?? null);
        $expected = self::expectedMinutes($shift, $jdate, $dayRow);
        $segs = ($type === 'floating') ? [] : self::daySegments($shift, $jdate, $dayRow);
        $late = 0; $early = 0; $inShift = 0;
        if ($type !== 'floating' && $jTs !== null && $segs) {
            foreach ($segs as $seg) {
                $win = self::segmentWindow($seg, $jTs); if (!$win) continue;
                [$ss,$ee] = $win;
                foreach ($sessions as $sx) {
                    if (empty($sx['in'])) continue;
                    $so = !empty($sx['out']) ? (int)$sx['out'] : ((self::normJdate($jdate) === $todayJ) ? $now : null);
                    if (!$so) continue;
                    $inShift += self::overlapMinutes((int)$sx['in'], $so, $ss, $ee);
                }
            }
            $firstSeg = self::segmentWindow($segs[0], $jTs);
            $lastSeg = self::segmentWindow($segs[count($segs)-1], $jTs);
            if ($firstSeg && $inMin) $late = max(0, (int)floor(($inMin - $firstSeg[0]) / 60));
            if ($lastSeg && $outMax) $early = max(0, (int)floor(($lastSeg[1] - $outMax) / 60));
        } else {
            $inShift = $worked;
        }
        $isFri = self::isFriday($jdate);
        $overtime = max(0, $worked - $expected);
        $dailyCap = ($dayCfg['daily_ot'] ?? null);
        if ($dailyCap !== null && $dailyCap !== '') $overtime = min($overtime, max(0, (int)$dailyCap));
        elseif (!empty($shift['daily_ot_cap'])) $overtime = min($overtime, (int)$shift['daily_ot_cap']);
        $shortage = max(0, $expected - min($worked, $expected));
        $night = !empty($shift['night_calc']) ? $night : 0;
        $fridayMin = (!empty($shift['friday_calc']) && $isFri) ? $worked : 0;
        $holidayMin = (!empty($shift['holiday_calc']) && $isHoliday && !$isFri) ? $worked : 0;
        return [
            'jdate'=>$jdate,'worked'=>$worked,'in_shift'=>$inShift,'expected'=>$expected,
            'overtime'=>$overtime,'shortage'=>$shortage,'night'=>$night,'friday'=>$fridayMin,'holiday'=>$holidayMin,
            'late_in'=>$late,'early_out'=>$early,'surplus'=>max(0, max(0, $worked - $expected) - $overtime),
            'in'=>$inMin ? date('H:i',$inMin) : null,'out'=>$outMax ? date('H:i',$outMax) : null,
            'is_off'=>empty($segs) && $type !== 'floating',
        ];
    }

    static function minuteInWindow($mins, $start, $end) {
        if ($start === null || $end === null) return false;
        if ($end < $start) return ($mins >= $start || $mins <= $end);
        return ($mins >= $start && $mins <= $end);
    }

    static function checkThreshold($shift, $jdate, $dayRow, $ts, $kind) {
        $type = $shift['type'] ?? 'simple';
        if ($type === 'floating') return ['ok'=>true];
        $segs = self::daySegments($shift, $jdate, $dayRow);
        if (!$segs) {
            if (!empty($shift['allow_offday'])) return ['ok'=>true];
            return ['ok'=>false,'reason'=>'امروز برای شما شیفتی تعریف نشده است.'];
        }
        $mins = (int)date('G',$ts)*60 + (int)date('i',$ts);
        foreach ($segs as $seg) {
            $s = self::hm($seg['s'] ?? null); $e = self::hm($seg['e'] ?? null);
            if ($kind === 'in') {
                $es = self::hm($seg['es'] ?? null); $ls = self::hm($seg['ls'] ?? null);
                if ($es === null) $es = $s !== null ? max(0, $s - 60) : null;
                if ($ls === null) $ls = $s !== null ? $s + 60 : null;
                if (self::minuteInWindow($mins, $es, $ls)) return ['ok'=>true,'seg'=>$seg];
            } else {
                $ee = self::hm($seg['ee'] ?? null); $le = self::hm($seg['le'] ?? null);
                if ($ee === null) $ee = $e !== null ? max(0, $e - 60) : null;
                if ($le === null) $le = $e !== null ? $e + 60 : null;
                if ($ee !== null) $ee %= 1440;
                if ($le !== null) $le %= 1440;
                if (self::minuteInWindow($mins, $ee, $le)) return ['ok'=>true,'seg'=>$seg];
            }
        }
        $word = $kind === 'in' ? 'ورود' : 'خروج';
        return ['ok'=>false,'reason'=>"ثبت $word خارج از بازهٔ مجاز شیفت است."];
    }
}
