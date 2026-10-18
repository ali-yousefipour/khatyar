<?php
/**
 * Presentation-layer employment window applied to live and finalized attendance reports.
 * Historical punches/finalized snapshots remain immutable. All boundaries are Jalali and inclusive.
 */
function kh_filter_attendance_employment(array $report, int $userId, string $from = '', string $to = ''): array {
    if (empty($report['days']) || !is_array($report['days'])) return $report;
    $cols=Db::one("SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='users' AND column_name IN ('employment_start_date','employment_end_date')");
    if ((int)($cols['n']??0)!==2) return $report;
    $user=Db::one('SELECT employment_start_date,employment_end_date FROM users WHERE id=?',[$userId]);
    if (!$user) return $report;
    $norm=static function($v) {
        $v=strtr(trim((string)$v),['/'=>'-','۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9']);
        if (!preg_match('/^(1[34][0-9]{2})-(0[1-9]|1[0-2])-([0-3][0-9])$/',$v,$m)) return null;
        return $v;
    };
    $start=$norm($user['employment_start_date']??'');
    $end=$norm($user['employment_end_date']??'');
    if (!$start && !$end) return $report;
    $clock=static function($v) {
        if(is_numeric($v)) return (int)$v;
        if(is_string($v) && preg_match('/^(\\d+):([0-5]\\d)$/',$v,$m))return (int)$m[1]*60+(int)$m[2];
        return 0;
    };
    $zero=static function($v) {return is_string($v) && strpos($v,':')!==false?'00:00':0;};
    $metrics=['worked','in_shift','expected','overtime','shortage','night','night_work','late_in','early_out','surplus','adjusted_ot','adjusted_shortage','adjusted_surplus','friday_work','holiday_work','mission','annual_leave','sick_leave','unpaid_leave','gps_inactive_minutes','absence_shortage','absence_minutes','holiday_overtime','friday_overtime','total_overtime','holiday_friday_overtime','absent','absence','present_days','friday_workday'];
    $totals=[];
    $periodDays=0;$actualPresent=0;
    foreach($report['days'] as &$day){
        if(!is_array($day))continue;
        $date=$norm($day['jdate']??$day['date']??'');
        if(!$date)continue;
        $outside=($start!==null&&strcmp($date,$start)<0)||($end!==null&&strcmp($date,$end)>0);
        $day['outside_employment_period']=$outside;
        if($outside){
            foreach($metrics as $key)if(array_key_exists($key,$day))$day[$key]=$zero($day[$key]);
            if(isset($day['data'])&&is_array($day['data']))foreach($day['data'] as $key=>$value)if(in_array($key,$metrics,true))$day['data'][$key]=$zero($value);
            $day['absent']=0;$day['is_absent']=false;
            $day['gps_inactive_details']=[];
            $day['absence_reason']='خارج از بازه همکاری';
        }else{
            $periodDays++;
            if($clock($day['worked']??0)>0)$actualPresent++;
        }
    }
    unset($day);
    // Recalculate only totals derived from visible day rows; do not mutate frozen DB snapshots.
    foreach($metrics as $key){
        $sum=0;$found=false;$template=null;
        foreach($report['days'] as $day)if(is_array($day)&&array_key_exists($key,$day)){$found=true;$template=$day[$key];$sum+=$clock($day[$key]);}
        if(!$found)continue;
        $totals[$key]=is_string($template)&&strpos($template,':')!==false?sprintf('%02d:%02d',intdiv($sum,60),$sum%60):$sum;
    }
    $totals['present_days']=$actualPresent;
    foreach(['totals','work_totals','summary'] as $part)if(isset($report[$part])&&is_array($report[$part])){
        foreach($totals as $key=>$value)if(array_key_exists($key,$report[$part]))$report[$part][$key]=$value;
        $report[$part]['employment_period_days']=$periodDays;
    }
    $report['employment_period_days']=$periodDays;
    $report['employment_start_date']=$start;
    $report['employment_end_date']=$end;
    return $report;
}
