<?php
/**
 * عملکرد روزانهٔ شخصی با تفکیک کسری کار واقعی از جریمهٔ عدم فعالیت/خاموشی GPS.
 *
 * این route پیش از route قدیمی ثبت می‌شود. بازه‌های بدون تأیید GPS/برنامه به‌عنوان
 * زمان غیرقابل‌اعتبار به ShiftCalc داده می‌شوند تا کارکرد معتبر و کسری کار محاسبه شوند؛
 * gps_invalid_min همان بخش را جداگانه برای شفافیت نشان می‌دهد.
 */
route('GET', '/api/my/daily-performance', function($p,$b,$u){
  [$ty,$tm,$td]=array_slice(gregorian_to_jalali(date('Y'),date('m'),date('d')),0,3);
  $jdate=preg_replace('/\//','-',trim((string)($_GET['date']??'')));
  if(!preg_match('/^\d{4}-\d{2}-\d{2}$/',$jdate)) $jdate=sprintf('%04d-%02d-%02d',$ty,$tm,$td);

  $shift=_active_user_shift_assignment($u['id'],$jdate);
  if(!$shift) return ['date'=>$jdate,'data'=>null,'message'=>'برای شما شیفت فعالی تعریف نشده است.'];

  $dayRow=null;
  if(($shift['type']??'')==='advanced') {
    $dayRow=Db::one("SELECT jdate,segments,is_off,day_config FROM shift_days WHERE shift_id=? AND jdate=? LIMIT 1",[(int)$shift['id'],$jdate]);
  }

  $cal=ShiftCalc::calendarDay($jdate);
  $rows=_attendance_rows_for_jdate($u['id'],$jdate);

  // بازه‌های فاقد تأیید GPS/برنامه باید از زمان معتبر حذف شوند؛
  // ShiftCalc از gps_invalid برای محاسبهٔ کارکرد و shortage استفاده می‌کند.
  $sessions=array_map(fn($r)=>[
    'in'=>strtotime($r['check_in']),
    'out'=>$r['check_out']?strtotime($r['check_out']):null,
    'clip_start'=>strtotime($r['_clip_start']??'1970-01-01 00:00:00'),
    'clip_end'=>strtotime($r['_clip_end']??'2999-01-01 00:00:00'),
    'gps_invalid'=>$r['_gps_invalid']??[]
  ],$rows);
  $w=ShiftCalc::dayWork($shift,$jdate,$dayRow,$sessions,ShiftCalc::effectiveHoliday($jdate));

  // جمع بازه‌های نامعتبر را بدون هم‌پوشانی حساب کن تا جریمه دو بار شمرده نشود.
  $invalidRanges=[];
  foreach($rows as $gpsRow) {
    foreach(($gpsRow['_gps_invalid']??[]) as $range) {
      $a=(int)($range[0]??0); $b=(int)($range[1]??0);
      if($b>$a) $invalidRanges[]=[$a,$b];
    }
  }
  usort($invalidRanges,static fn($a,$b)=>(int)$a[0]<=>(int)$b[0]);
  $gpsInvalidSeconds=0; $rangeStart=null; $rangeEnd=null;
  foreach($invalidRanges as $range) {
    if($rangeStart===null) { $rangeStart=$range[0]; $rangeEnd=$range[1]; continue; }
    if($range[0]<=$rangeEnd) $rangeEnd=max($rangeEnd,$range[1]);
    else { $gpsInvalidSeconds+=max(0,$rangeEnd-$rangeStart); $rangeStart=$range[0]; $rangeEnd=$range[1]; }
  }
  if($rangeStart!==null) $gpsInvalidSeconds+=max(0,$rangeEnd-$rangeStart);

  $w['gps_work_required']=_gps_work_required();
  $w['gps_invalid_min']=(int)ceil(max(0,$gpsInvalidSeconds)/60);
  $weekday=_jweekday_name((int)substr($jdate,0,4),(int)substr($jdate,5,2),(int)substr($jdate,8,2));
  $isCalHoliday=!empty($cal['is_official_holiday'])||!empty($cal['is_manual_holiday']);
  return ['date'=>$jdate,'weekday'=>$weekday,'shift_title'=>$shift['title']??'شیفت کاری','shift_type'=>$shift['type']??'','holiday'=>$isCalHoliday,'holiday_title'=>$cal['title']??'', 'sessions'=>$rows,'data'=>$w];
});
