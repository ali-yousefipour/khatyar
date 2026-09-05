<?php
/* خطیار — گزارش تردد سریع، مقاوم در برابر تفاوت نسخه‌های دیتابیس */
ini_set('display_errors','0');
date_default_timezone_set('Asia/Tehran');
$ROOT=__DIR__.'/../../';
require "$ROOT/lib/Db.php";
require "$ROOT/lib/Jwt.php";
require "$ROOT/lib/Http.php";
require "$ROOT/lib/ShiftCalc.php";
require "$ROOT/lib/IranCalendar.php";
$CONFIG=require "$ROOT/config.php";
require "$ROOT/lib/routes.php";
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
function afr_json($v,$s=200){http_response_code($s);echo json_encode($v,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;}
function afr_error($m,$s=400){afr_json(['error'=>$m],$s);}
function afr_col($table,$col){static $c=[];$k=$table.'.'.$col;if(array_key_exists($k,$c))return$c[$k];try{$r=Db::one("SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=? LIMIT 1",[$table,$col]);return$c[$k]=($r!==null);}catch(Throwable $e){return$c[$k]=false;}}
function afr_auth(){global $CONFIG;$tok=Http::bearer();$p=$tok?Jwt::verify($tok,$CONFIG['jwt_secret']):null;if(!$p||empty($p['sub']))afr_error('توکن منقضی یا نامعتبر است',401);$u=Db::one("SELECT u.id,u.is_active,u.is_admin,r.level,r.title role_title FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=? LIMIT 1",[$p['sub']]);if(!$u||!(int)$u['is_active'])afr_error('کاربر نامعتبر',401);$dt=$p['dt']??'web';$sess=Db::one("SELECT device_id,revoked_at FROM user_sessions WHERE user_id=? AND device_type=? ORDER BY id DESC LIMIT 1",[$u['id'],$dt]);$unlimited=in_array($u['role_title'],['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد'],true);if(!$sess||$sess['revoked_at']||(!$unlimited&&$sess['device_id']!==($p['device_id']??'')))afr_error('نشست منقضی یا باطل شده است',401);if(empty($u['is_admin']))afr_error('دسترسی مدیریتی لازم است',403);return$u;}
function afr_en($s){return strtr((string)$s,['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9']);}
function afr_jdate($ts){$j=gregorian_to_jalali((int)date('Y',$ts),(int)date('n',$ts),(int)date('j',$ts));return sprintf('%04d-%02d-%02d',$j[0],$j[1],$j[2]);}
function afr_hm($m){$m=max(0,(int)$m);return sprintf('%02d:%02d',intdiv($m,60),$m%60);}
try{
 afr_auth();
 $uid=(int)($_GET['user_id']??0);$from=str_replace('/','-',afr_en(trim($_GET['from']??'')));$to=str_replace('/','-',afr_en(trim($_GET['to']??'')));
 if(!$uid||!$from||!$to)afr_error('پرسنل و بازهٔ تاریخ را مشخص کنید',400);
 $fts=j_to_ts($from);$tts=j_to_ts($to);if($fts===null||$tts===null||$fts>$tts)afr_error('بازهٔ تاریخ نامعتبر است',400);
 if((int)floor(($tts-$fts)/86400)+1>366)afr_error('حداکثر بازهٔ مجاز گزارش ۳۶۶ روز است',400);
 $start=date('Y-m-d',$fts).' 00:00:00';$end=date('Y-m-d',$tts+86400).' 00:00:00';
 $deviceExpr=afr_col('users','device_model')?'u.device_model':'NULL';
 $usr=Db::one("SELECT u.id,TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) name,$deviceExpr device_model".($deviceExpr!=='NULL'?',u.work_policy_id':'')." FROM users u WHERE u.id=? LIMIT 1",[$uid]);
 if(!$usr)afr_error('پرسنل یافت نشد',404);
 $inStation=afr_col('staff_attendance','in_station')?'in_station':'NULL';$outStation=afr_col('staff_attendance','out_station')?'out_station':'NULL';
 $att=Db::all("SELECT id,check_in,check_out,method,in_lat,in_lng,out_lat,out_lng,$inStation in_station,$outStation out_station FROM staff_attendance WHERE user_id=? AND check_in < ? AND (check_out IS NULL OR check_out > ?) ORDER BY check_in",[$uid,$end,$start]);
 $byDay=[];
 foreach($att as $r){$inTs=strtotime($r['check_in']);if(!$inTs)continue;$outTs=$r['check_out']?strtotime($r['check_out']):time();$first=max($fts,(int)floor($inTs/86400)*86400);$last=min($tts+86399,$outTs);for($dts=$first;$dts<=$last;$dts+=86400)if($inTs<$dts+86400&&$outTs>$dts)$byDay[afr_jdate($dts)][]=$r;}
 $shiftCache=[];$assigns=Db::all("SELECT us.user_id,us.shift_id,us.from_jdate,us.to_jdate,s.* FROM user_shifts us JOIN shifts s ON s.id=us.shift_id WHERE us.user_id=? AND s.is_active=1",[$uid]);foreach($assigns as $a)$shiftCache[]=['row'=>$a,'from'=>!empty($a['from_jdate'])?str_replace('/','-',$a['from_jdate']):null,'to'=>!empty($a['to_jdate'])?str_replace('/','-',$a['to_jdate']):null];$autoShift=_auto_shift_for_user($uid);$days=[];$lastShift=null;
 for($ts=$fts;$ts<=$tts;$ts+=86400){$j=gregorian_to_jalali((int)date('Y',$ts),(int)date('n',$ts),(int)date('j',$ts));$jdate=sprintf('%04d-%02d-%02d',$j[0],$j[1],$j[2]);$rows=$byDay[$jdate]??[];$punches=[];$sessions=[];foreach($rows as $r){$punches[]=['id'=>$r['id'],'in'=>$r['check_in']?date('H:i',strtotime($r['check_in'])):null,'out'=>$r['check_out']?date('H:i',strtotime($r['check_out'])):null,'in_full'=>$r['check_in'],'out_full'=>$r['check_out'],'in_station'=>$r['in_station']??null,'out_station'=>$r['out_station']??null,'method'=>$r['method']??null,'device'=>$usr['device_model']??null,'in_lat'=>$r['in_lat']??null,'in_lng'=>$r['in_lng']??null,'out_lat'=>$r['out_lat']??null,'out_lng'=>$r['out_lng']??null];$sessions[]=['in'=>strtotime($r['check_in']),'out'=>$r['check_out']?strtotime($r['check_out']):null,'clip_start'=>$ts,'clip_end'=>$ts+86400];}
   $shift=null;foreach($shiftCache as $x){if($x['from']&&strcmp($jdate,$x['from'])<0)continue;if($x['to']&&strcmp($jdate,$x['to'])>0)continue;$shift=$x['row'];break;}if(!$shift)$shift=$autoShift;$lastShift=$shift?:$lastShift;
   $dr=($shift&&(($shift['type']??'')==='advanced'))?_shift_day_row($shift['shift_id']??$shift['id'],$jdate):null;$calendarDay=IranCalendar::day($jdate);$isHol=(bool)($calendarDay['is_holiday']??false);$isFri=ShiftCalc::isFriday($jdate);$w=$shift?ShiftCalc::dayWork($shift,$jdate,$dr,$sessions,$isHol):['worked'=>0,'in_shift'=>0,'expected'=>0,'overtime'=>0,'shortage'=>0,'night'=>0,'late_in'=>0,'early_out'=>0,'surplus'=>0,'friday_work'=>0,'holiday_work'=>0];
   $days[]=['jdate'=>str_replace('-','/',$jdate),'weekday'=>_jweekday_name($j[0],$j[1],$j[2]),'is_friday'=>$isFri,'is_official_holiday'=>(bool)($calendarDay['is_official_holiday']??false),'is_manual_holiday'=>(bool)($calendarDay['is_manual_holiday']??false),'is_holiday'=>$isHol,'holiday_title'=>$calendarDay['title']??'','holiday_source'=>$calendarDay['source']??'','punches'=>$punches,'in_shift'=>afr_hm($w['in_shift']??$w['worked']),'worked'=>afr_hm($w['worked']??0),'expected'=>afr_hm($w['expected']??0),'late_in'=>afr_hm($w['late_in']??0),'early_out'=>afr_hm($w['early_out']??0),'shortage'=>afr_hm($w['shortage']??0),'night'=>afr_hm($w['night']??0),'overtime'=>afr_hm($w['overtime']??0),'surplus'=>afr_hm($w['surplus']??0),'adjusted_ot'=>afr_hm($w['adjusted_ot']??0),'friday_work'=>afr_hm($w['friday_work']??$w['friday']??0),'holiday_work'=>afr_hm($w['holiday_work']??$w['holiday']??0),'absent'=>(!$punches&&!$isHol&&!$isFri)?1:0];
 }
 afr_json(['user'=>$usr,'shift'=>$lastShift?['title'=>$lastShift['title']??'']:null,'from'=>str_replace('-','/',$from),'to'=>str_replace('-','/',$to),'days'=>$days,'fast_report'=>true,'read_only'=>true,'holiday_source'=>'IranCalendar','friday_source'=>'IranCalendar+algorithmic_weekday','work_classification'=>'friday_and_holiday_independent','schema_compatible'=>true]);
}catch(Throwable $e){error_log('attendance-report-fast: '.$e->getMessage().' @ '.$e->getFile().':'.$e->getLine());afr_error('خطای داخلی گزارش تردد؛ جزئیات در گزارش خطای سرور ثبت شد.',500);}
