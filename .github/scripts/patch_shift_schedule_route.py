#!/usr/bin/env python3
from pathlib import Path

routes_path = Path("php/lib/routes.php")
src = routes_path.read_text(encoding="utf-8")
start_marker = "route('GET', '/api/my/shift-schedule'"
end_marker = "\nroute('GET', '/api/my/work-summary'"

start = src.find(start_marker)
end = src.find(end_marker, start + 1) if start >= 0 else -1
if start < 0 or end < 0:
    raise SystemExit("Could not locate canonical shift-schedule route in php/lib/routes.php")
old_route = src[start:end]
if "MONTH_START_MKTIME_ORDER_FIX" in old_route:
    raise SystemExit("Shift schedule date fix already applied; refusing duplicate patch")

new_route = r'''route('GET', '/api/my/shift-schedule', function($p,$b,$u){
  [$gy,$gm,$gd]=[date('Y'),date('m'),date('d')];
  [$jy,$jm,$jd]=array_slice(gregorian_to_jalali((int)$gy,(int)$gm,(int)$gd),0,3);
  $todayJ=sprintf('%04d-%02d-%02d',$jy,$jm,$jd);

  // MONTH_START_MKTIME_ORDER_FIX:
  // jalali_to_gregorian returns [year, month, day], while mktime needs [month, day, year].
  // Never spread [gy,gm,gd] directly into mktime; that previously collapsed the month range.
  [$monthStartGy,$monthStartGm,$monthStartGd]=jalali_to_gregorian($jy,$jm,1);
  $ts=mktime(12,0,0,(int)$monthStartGm,(int)$monthStartGd,(int)$monthStartGy);

  $nextJy=$jy; $nextJm=$jm+1;
  if($nextJm>12){$nextJm=1;$nextJy++;}
  [$nextGy,$nextGm,$nextGd]=jalali_to_gregorian($nextJy,$nextJm,1);
  $nextTs=mktime(12,0,0,(int)$nextGm,(int)$nextGd,(int)$nextGy);
  $daysCount=max(1,(int)round(($nextTs-$ts)/86400));

  $days=[]; $displayShift=null; $userId=(int)$u['id'];
  for($i=0;$i<$daysCount;$i++){
    $gt=getdate($ts+($i*86400));
    [$y,$m,$d]=array_slice(gregorian_to_jalali($gt['year'],$gt['mon'],$gt['mday']),0,3);
    $j=sprintf('%04d-%02d-%02d',$y,$m,$d);

    // هر روز از روی انتساب معتبر همان تاریخ محاسبه می‌شود؛
    // شیفت روز جاری به روزهایی که هیچ انتسابی ندارند تعمیم داده نمی‌شود.
    $dayShift=_active_user_shift_assignment($userId,$j);
    if($displayShift===null && $dayShift) $displayShift=$dayShift;
    $dr=null;
    if($dayShift && (($dayShift['type']??'')==='advanced')){
      $dr=Db::one("SELECT jdate,segments,is_off,day_config FROM shift_days WHERE shift_id=? AND jdate=? LIMIT 1",[(int)$dayShift['id'],$j]);
    }
    $mins=$dayShift ? max(0,(int)ShiftCalc::expectedMinutes($dayShift,$j,$dr)) : 0;
    $cal=ShiftCalc::calendarDay($j);
    $isCalHoliday=!empty($cal['is_official_holiday'])||!empty($cal['is_manual_holiday']);
    $noShift=!$dayShift;
    $days[]=[
      'date'=>$j,
      'weekday'=>_jweekday_name($y,$m,$d),
      'is_today'=>($j===$todayJ),
      'shift_title'=>$dayShift['title']??'',
      'minutes'=>$mins,
      'is_off'=>$noShift||(bool)($dr['is_off']??false)||$mins<=0,
      'is_no_shift'=>$noShift,
      'is_holiday'=>$isCalHoliday,
      'is_friday'=>ShiftCalc::isFriday($j),
      'holiday_title'=>$cal['title']??''
    ];
  }
  return [
    'shift'=>$displayShift?['id'=>(int)$displayShift['id'],'title'=>$displayShift['title']??'شیفت کاری','type'=>$displayShift['type']??'']:null,
    'days'=>$days,
    'message'=>$displayShift?null:'برای این ماه شیفت فعالی تعریف نشده است.'
  ];
});'''
src = src[:start] + new_route + src[end:]
routes_path.write_text(src, encoding="utf-8")
print("Patched monthly shift schedule route")
print("Fixed Gregorian mktime argument order; added per-day active shift/no-shift payload")
