<?php
// موتور محاسبهٔ دقیق کارکرد شیفت؛ تقویم تعطیلات فقط از IranCalendar خوانده می‌شود.
class ShiftCalc
{
    static function hm($s){if(!$s||strpos((string)$s,':')===false)return null;$p=explode(':',(string)$s);return max(0,min(47,(int)$p[0]))*60+max(0,min(59,(int)($p[1]??0)));}
    static function normJdate($jdate){$jdate=str_replace('/','-',trim((string)$jdate));if(!preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/',$jdate,$m))return null;return sprintf('%04d-%02d-%02d',(int)$m[1],(int)$m[2],(int)$m[3]);}
    static function slashJdate($jdate){$jdate=self::normJdate($jdate);return $jdate?str_replace('-','/',$jdate):null;}
    static function jdateAddDays($jdate,$days){$ts=self::jdateToTs($jdate);if($ts===null||!function_exists('gregorian_to_jalali'))return null;$ts+=(int)$days*86400;[$jy,$jm,$jd]=gregorian_to_jalali((int)date('Y',$ts),(int)date('n',$ts),(int)date('j',$ts));return sprintf('%04d-%02d-%02d',$jy,$jm,$jd);}
    static function jdateToTs($jdate){$jdate=self::normJdate($jdate);if(!$jdate)return null;[$jy,$jm,$jd]=array_map('intval',explode('-',$jdate));[$gy,$gm,$gd]=jalali_to_gregorian($jy,$jm,$jd);return mktime(12,0,0,$gm,$gd,$gy);}
    static function jweekday($jdate){$ts=self::jdateToTs($jdate);if($ts===null)return null;$w=(int)date('w',$ts);return [6=>0,0=>1,1=>2,2=>3,3=>4,4=>5,5=>6][$w];}
    static function isFriday($jdate){return self::jweekday($jdate)===6;}
    static function isJalaliLeap($jy){$a=$jy-(($jy>=0)?474:473);$b=474+($a%2820);return ((($b+38)*682)%2816)<682;}
    static function jMonthDays($jy,$jm){if($jm>=1&&$jm<=6)return 31;if($jm>=7&&$jm<=11)return 30;return self::isJalaliLeap((int)$jy)?30:29;}
    static function monthReportLastDay($jy,$jm,$throughJdate=null){$days=self::jMonthDays((int)$jy,(int)$jm);$throughJdate=self::normJdate($throughJdate);$prefix=sprintf('%04d-%02d-',(int)$jy,(int)$jm);if($throughJdate&&strpos($throughJdate,$prefix)===0)return min($days,max(0,(int)substr($throughJdate,8,2)));return $days;}
    static function parseJson($v){if(is_array($v))return $v;if($v===null||$v==='')return [];$x=json_decode((string)$v,true);return is_array($x)?$x:[];}

    // منبع واحد تعطیلات: تقویم رسمی ایران + تعطیلات دستی سازمان.
    static function calendarDay($jdate){if(!class_exists('IranCalendar'))return ['is_official_holiday'=>false,'is_manual_holiday'=>false,'is_holiday'=>false,'title'=>'','source'=>'calculated'];try{$d=IranCalendar::day($jdate);return is_array($d)?$d:['is_official_holiday'=>false,'is_manual_holiday'=>false,'is_holiday'=>false,'title'=>'','source'=>'calculated'];}catch(Throwable $e){return ['is_official_holiday'=>false,'is_manual_holiday'=>false,'is_holiday'=>false,'title'=>'','source'=>'calculated'];}}
    static function effectiveHoliday($jdate,$fallback=false){$d=self::calendarDay($jdate);return (bool)$fallback||!empty($d['is_official_holiday'])||!empty($d['is_manual_holiday']);}
    static function segmentLength($seg){$a=self::hm($seg['s']??null);$b=self::hm($seg['e']??null);if($a===null||$b===null)return 0;if($b<=$a)$b+=1440;return max(0,$b-$a);}
    static function segmentWindow($seg,$baseTs){$a=self::hm($seg['s']??null);$b=self::hm($seg['e']??null);if($a===null||$b===null)return null;if($b<=$a)$b+=1440;$day0=strtotime(date('Y-m-d 00:00:00',$baseTs));return[$day0+$a*60,$day0+$b*60];}
    static function rotationSegments($shift,$jdate){$adv=self::parseJson($shift['advanced']??null);$rot=$adv['rotation']??$adv;if(!is_array($rot))return[];$start=self::normJdate($rot['cycle_start_jdate']??$rot['start_jdate']??'');if(!$start)return[];$cycle=$rot['cycle']??null;if(!is_array($cycle)||!$cycle)$cycle=[['days'=>7,'segments'=>[['s'=>'07:00','e'=>'15:00','es'=>'06:30','ls'=>'07:30','ee'=>'14:30','le'=>'15:30']]],['days'=>7,'segments'=>[['s'=>'15:00','e'=>'23:00','es'=>'14:30','ls'=>'15:30','ee'=>'22:30','le'=>'23:30']]],['days'=>7,'segments'=>[['s'=>'23:00','e'=>'07:00','es'=>'22:30','ls'=>'23:30','ee'=>'06:30','le'=>'07:30']]]];$st=self::jdateToTs($start);$dt=self::jdateToTs($jdate);if($st===null||$dt===null||$dt<$st)return[];$diffDays=(int)floor(($dt-$st)/86400);$len=0;foreach($cycle as $c)$len+=max(1,(int)($c['days']??1));if($len<=0)return[];$pos=$diffDays%$len;$acc=0;foreach($cycle as $c){$d=max(1,(int)($c['days']??1));if($pos>=$acc&&$pos<$acc+$d)return is_array($c['segments']??null)?$c['segments']:[];$acc+=$d;}return[];}
    static function daySegments($shift,$jdate,$dayRow=null){$type=$shift['type']??'simple';if($type==='advanced'){if(!$dayRow||!empty($dayRow['is_off']))return[];$segs=self::parseJson($dayRow['segments']??null);return is_array($segs)?$segs:[];}if($type==='floating')return[];if($type==='rotating')return self::rotationSegments($shift,$jdate);$weekly=self::parseJson($shift['weekly']??null);if(!is_array($weekly))return[];$wd=self::jweekday($jdate);$segs=$weekly[(string)$wd]??$weekly[$wd]??[];return is_array($segs)?$segs:[];}
    static function overlapMinutes($a1,$a2,$b1,$b2){if(!$a1||!$a2||!$b1||!$b2||$a2<=$a1||$b2<=$b1)return 0;return max(0,(int)floor((min($a2,$b2)-max($a1,$b1))/60));}
    static function nightMinutes($inTs,$outTs,$nightStart='22:00',$nightEnd='06:00'){if(!$inTs||!$outTs||$outTs<=$inTs)return 0;$ns=self::hm($nightStart?:'22:00');$ne=self::hm($nightEnd?:'06:00');if($ns===null)$ns=1320;if($ne===null)$ne=360;if($ne<=$ns)$ne+=1440;$total=0;$cursor=strtotime(date('Y-m-d 00:00:00',$inTs))-86400;$endDay=strtotime(date('Y-m-d 00:00:00',$outTs))+86400;for($d=$cursor;$d<=$endDay;$d+=86400)$total+=self::overlapMinutes($inTs,$outTs,$d+$ns*60,$d+$ne*60);return $total;}
    static function expectedMinutes($shift,$jdate,$dayRow=null){$cal=self::calendarDay($jdate);if(self::isFriday($jdate)||!empty($cal['is_official_holiday'])||!empty($cal['is_manual_holiday']))return 0;$cfg=self::parseJson($dayRow['day_config']??null);if(isset($cfg['duty_min'])&&$cfg['duty_min']!=='')return max(0,(int)$cfg['duty_min']);if(($shift['type']??'')==='floating')return(int)($shift['float_minutes']??0);$expected=0;foreach(self::daySegments($shift,$jdate,$dayRow) as $seg)$expected+=self::segmentLength($seg);return $expected;}
    // موظفی سپری‌شدهٔ روز جاری؛ برای شیفت‌های بدون ساعت شروع/پایان قابل استنتاج نیست.
    static function elapsedExpectedMinutes($shift,$jdate,$dayRow=null,$asOfTs=null){$type=$shift['type']??'simple';if(in_array($type,['auto','floating'],true))return null;$expected=max(0,(int)self::expectedMinutes($shift,$jdate,$dayRow));if($expected===0)return 0;$base=self::jdateToTs($jdate);if($base===null)return null;$segments=self::daySegments($shift,$jdate,$dayRow);if(!$segments)return null;$asOfTs=$asOfTs===null?time():(int)$asOfTs;$elapsed=0;foreach($segments as $seg){$win=self::segmentWindow($seg,$base);if(!$win)continue;[$start,$end]=$win;$elapsed+=self::overlapMinutes($start,min($end,$asOfTs),$start,$end);}return min($expected,$elapsed);}
    static function roleOtCap($shift){$cap=$shift['auto_ot_cap_min']??null;if($cap!==null&&$cap!=='')return max(0,(int)$cap);$txt=trim((string)($shift['role_key']??'').' '.trim((string)($shift['role_title']??$shift['role']??'')));if(preg_match('/اداری|niroo|office/i',$txt))return 240;if(preg_match('/بازرس|سربازرس|inspector/i',$txt))return 147;return 27;}
    // تردد شبانه: اگر خروج از نظر ساعت قبل/مساوی ورود باشد، خروج متعلق به روز بعد است.
    // این نرمال‌سازی در هسته محاسبه انجام می‌شود تا تردد دستی، اصلاح‌شده و تردد عادی
    // دقیقاً یک رفتار داشته باشند و session شبانه در روز ورود محاسبه شود.
    static function normalizeSessionPair($in,$out){
        $in=(int)$in; $out=(int)$out;
        if($in<=0||$out<=0)return [$in,$out];
        if($out<=$in){
            $inClock=((int)date('G',$in))*60+(int)date('i',$in);
            $outClock=((int)date('G',$out))*60+(int)date('i',$out);
            if($outClock<=$inClock)$out+=86400;
        }
        return [$in,$out];
    }
    static function validSessionParts($session, $rawOutOverride = null) {
        if (empty($session['in'])) return [];
        $rawIn = (int)$session['in'];
        $rawOut = $rawOutOverride !== null
            ? (int)$rawOutOverride
            : (!empty($session['out']) ? (int)$session['out'] : 0);
        if ($rawOut <= 0) return [];
        [$rawIn, $rawOut] = self::normalizeSessionPair($rawIn, $rawOut);
        if ($rawIn <= 0 || $rawOut <= $rawIn) return [];
        $in = isset($session['clip_start']) && $session['clip_start'] !== ''
            ? max($rawIn, (int)$session['clip_start']) : $rawIn;
        $out = isset($session['clip_end']) && $session['clip_end'] !== ''
            ? min($rawOut, (int)$session['clip_end']) : $rawOut;
        if ($out <= $in) return [];

        $blocked = is_array($session['gps_invalid'] ?? null) ? $session['gps_invalid'] : [];
        if (!$blocked) return [[$in, $out]];
        usort($blocked, function($a, $b) { return (int)($a[0] ?? 0) <=> (int)($b[0] ?? 0); });
        $parts = [];
        $cursor = $in;
        foreach ($blocked as $range) {
            $from = max($in, (int)($range[0] ?? 0));
            $to = min($out, (int)($range[1] ?? 0));
            if ($to <= $from) continue;
            if ($from > $cursor) $parts[] = [$cursor, $from];
            $cursor = max($cursor, $to);
            if ($cursor >= $out) break;
        }
        if ($cursor < $out) $parts[] = [$cursor, $out];
        return $parts;
    }

    static function sessionTotals($shift, $jdate, $sessions) {
        $worked=0; $night=0; $inMin=null; $outMax=null; $now=time(); $todayJ=null;
        if (function_exists('gregorian_to_jalali')) {
            [$ty,$tm,$td]=gregorian_to_jalali((int)date('Y'),(int)date('n'),(int)date('j'));
            $todayJ=sprintf('%04d-%02d-%02d',$ty,$tm,$td);
        }
        foreach ($sessions as $session) {
            if (empty($session['in'])) continue;
            $rawOut = !empty($session['out'])
                ? (int)$session['out']
                : ((self::normJdate($jdate)===$todayJ) ? $now : null);
            if (!$rawOut) continue;
            foreach (self::validSessionParts($session, $rawOut) as $part) {
                [$in,$out] = $part;
                if ($out <= $in) continue;
                $worked += (int)floor(($out-$in)/60);
                $night += self::nightMinutes($in,$out,$shift['night_start']??'22:00',$shift['night_end']??'06:00');
                if ($inMin===null || $in<$inMin) $inMin=$in;
                if ($outMax===null || $out>$outMax) $outMax=$out;
            }
        }
        return [$worked,$night,$inMin,$outMax,$now,$todayJ];
    }

    static function classifyDay($shift,$jdate,$dayRow,$sessions,$fallbackHoliday=false){$cal=self::calendarDay($jdate);$isHoliday=(bool)$fallbackHoliday||!empty($cal['is_official_holiday'])||!empty($cal['is_manual_holiday']);$isFriday=self::isFriday($jdate);$type=$shift['type']??'simple';[$worked,$night,$inMin,$outMax,$now,$todayJ]=self::sessionTotals($shift,$jdate,$sessions);$cfg=self::parseJson($dayRow['day_config']??null);$expected=self::expectedMinutes($shift,$jdate,$dayRow);$segs=$type==='floating'?[]:self::daySegments($shift,$jdate,$dayRow);$inShift=0;$late=0;$early=0;$jTs=self::jdateToTs($jdate);$crossMidnightWorked=0;if($type!=='floating'&&$jTs!==null&&$segs){foreach($segs as $seg){$win=self::segmentWindow($seg,$jTs);if(!$win)continue;[$ss,$ee]=$win;foreach($sessions as $sx){if(empty($sx['in']))continue;$rawSo=!empty($sx['out'])?(int)$sx['out']:(self::normJdate($jdate)===$todayJ?$now:null);if(!$rawSo)continue;foreach(self::validSessionParts($sx,$rawSo) as $part){[$si,$so]=$part;if($so<=$si)continue;$inShift+=self::overlapMinutes($si,$so,$ss,$ee);if(date('Y-m-d',$so)!==date('Y-m-d',$si))$crossMidnightWorked+=max(0,(int)floor(($so-$si)/60));}}}if($crossMidnightWorked>0&&$expected>0){$overnightInShift=min($crossMidnightWorked,$expected);$inShift=max($inShift,$overnightInShift);} $first=self::segmentWindow($segs[0],$jTs);$last=self::segmentWindow($segs[count($segs)-1],$jTs);if($first&&$inMin)$late=max(0,(int)floor(($inMin-$first[0])/60));if($last&&$outMax)$early=max(0,(int)floor(($last[1]-$outMax)/60));}else $inShift=$worked;
        // جمعه و تعطیلات رسمی/دستی در کل سامانه «روز غیرکاری» هستند.
        // حضور در این روزها فقط به‌عنوان جمعه‌کاری/تعطیل‌کاری ثبت می‌شود و
        // هرگز موظفی، کسری کار یا غیبت تولید نمی‌کند.
        $fridayMin=$isFriday?$worked:0;
        $holidayMin=($isHoliday&&!$isFriday)?$worked:0;
        $offLike=($isFriday||($isHoliday&&!$isFriday));
        if($offLike){
            $expected=0;
            $inShift=0;
            $late=0;
            $early=0;
        }
        if($type==='auto'){$expected=$offLike?0:(int)($shift['auto_expected_min']??453);$cap=27;$rawExtra=$offLike?0:max(0,$worked-$expected);$overtime=$offLike?0:min($rawExtra,$cap);$surplus=$offLike?0:max(0,$rawExtra-$cap);$shortage=$offLike?0:max(0,$expected-min($inShift,$expected));if(empty($shift['night_calc']))$night=0;return ['jdate'=>$jdate,'worked'=>$worked,'in_shift'=>$inShift,'expected'=>$expected,'overtime'=>$overtime,'surplus'=>$surplus,'shortage'=>$shortage,'night'=>$night,'friday'=>$fridayMin,'holiday'=>$holidayMin,'friday_work'=>$fridayMin,'holiday_work'=>$holidayMin,'friday_overtime'=>$fridayMin,'holiday_overtime'=>$holidayMin,'total_overtime'=>$overtime+$fridayMin+$holidayMin,'holiday_friday_overtime'=>$fridayMin+$holidayMin,'friday_workday'=>$fridayMin>0?1:0,'late_in'=>0,'early_out'=>0,'in'=>$inMin?date('H:i',$inMin):null,'out'=>$outMax?date('H:i',$outMax):null,'is_off'=>$offLike,'is_friday'=>$isFriday,'is_holiday'=>$isHoliday,'holiday_title'=>$cal['title']??'','holiday_source'=>$cal['source']??''];}
        $rawExtra=$offLike?0:max(0,$worked-$expected);$overtime=$offLike?0:min($rawExtra,27);$shortage=$offLike?0:max(0,$expected-min($inShift,$expected));if(empty($shift['night_calc']))$night=0;$surplus=$offLike?0:max(0,$rawExtra-$overtime);
        return ['jdate'=>$jdate,'worked'=>$worked,'in_shift'=>$inShift,'expected'=>$expected,'overtime'=>$overtime,'shortage'=>$shortage,'night'=>$night,'friday'=>$fridayMin,'holiday'=>$holidayMin,'friday_work'=>$fridayMin,'holiday_work'=>$holidayMin,'friday_overtime'=>$fridayMin,'holiday_overtime'=>$holidayMin,'total_overtime'=>$overtime+$fridayMin+$holidayMin,'holiday_friday_overtime'=>$fridayMin+$holidayMin,'friday_workday'=>$fridayMin>0?1:0,'late_in'=>$late,'early_out'=>$early,'surplus'=>$surplus,'in'=>$inMin?date('H:i',$inMin):null,'out'=>$outMax?date('H:i',$outMax):null,'is_off'=>empty($segs)&&$type!=='floating'||$offLike,'is_friday'=>$isFriday,'is_holiday'=>$isHoliday,'holiday_title'=>$cal['title']??'','holiday_source'=>$cal['source']??''];}
    static function autoDayWork($shift,$jdate,$sessions,$isHoliday){return self::classifyDay($shift,$jdate,null,$sessions,$isHoliday);}
    static function dayWork($shift,$jdate,$dayRow,$sessions,$isHoliday){return self::classifyDay($shift,$jdate,$dayRow,$sessions,$isHoliday);}
    static function minuteInWindow($mins,$start,$end){if($start===null||$end===null)return false;if($end<$start)return $mins>=$start||$mins<=$end;return $mins>=$start&&$mins<=$end;}
    static function checkThreshold($shift,$jdate,$dayRow,$ts,$kind){$type=$shift['type']??'simple';if($type==='floating')return['ok'=>true];$segs=self::daySegments($shift,$jdate,$dayRow);if(!$segs){if(!empty($shift['allow_offday']))return['ok'=>true];return['ok'=>false,'reason'=>'امروز برای شما شیفتی تعریف نشده است.'];}$mins=(int)date('G',$ts)*60+(int)date('i',$ts);foreach($segs as $seg){$s=self::hm($seg['s']??null);$e=self::hm($seg['e']??null);if($kind==='in'){$es=self::hm($seg['es']??null);$ls=self::hm($seg['ls']??null);if($es===null)$es=$s!==null?max(0,$s-60):null;if($ls===null)$ls=$s!==null?$s+60:null;if(self::minuteInWindow($mins,$es,$ls))return['ok'=>true,'seg'=>$seg];}else{$ee=self::hm($seg['ee']??null);$le=self::hm($seg['le']??null);if($ee===null)$ee=$e!==null?max(0,$e-60):null;if($le===null)$le=$e!==null?$e+60:null;if($ee!==null)$ee%=1440;if($le!==null)$le%=1440;if(self::minuteInWindow($mins,$ee,$le))return['ok'=>true,'seg'=>$seg];}}return['ok'=>false,'reason'=>"ثبت ".($kind==='in'?'ورود':'خروج')." خارج از بازهٔ مجاز شیفت است."];}
}
