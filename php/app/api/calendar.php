<?php
/* خطیار — API واحد تقویم ایران
 * منبع واحد برای DatePicker، گزارش‌ها و سایر بخش‌های سامانه.
 * روزهای هفته به‌صورت الگوریتمی و مناسبت‌ها/تعطیلات از IranCalendar دریافت می‌شوند.
 * تعطیلات دستی جدول holidays نیز توسط IranCalendar ادغام می‌شوند.
 */
ini_set('display_errors','0');
date_default_timezone_set('Asia/Tehran');
$ROOT=__DIR__.'/../../';
require_once "$ROOT/lib/Db.php";
require_once "$ROOT/lib/IranCalendar.php";
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

function cal_json($v,$s=200){http_response_code($s);echo json_encode($v,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;}
function cal_digits($s){return strtr((string)$s,['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9']);}
function cal_year($v){$v=cal_digits($v);return preg_match('/^\d{4}$/',(string)$v)?(int)$v:(int)date('Y');}

try {
    $y=cal_year($_GET['year']??'');
    $force=!empty($_GET['force']) && (string)$_GET['force']!=='0';
    $days=IranCalendar::events($y,$force);
    $manual=[];
    foreach(IranCalendar::holidays($y) as $j=>$title){$manual[$j]=true;}

    $out=[];
    foreach($days as $j=>$d){
        $manualHoliday=isset($manual[$j]);
        $official=!empty($d['is_holiday']);
        $title=trim((string)($d['title']??''));
        if($manualHoliday){
            $manualTitle=IranCalendar::manualTitle($j);
            if($manualTitle && $manualTitle!==$title)$title=trim($title?($title.' | '.$manualTitle):$manualTitle);
        }
        $out[]=[
            'jdate'=>$j,
            'weekday_index'=>(int)($d['weekday_index']??0),
            'weekday'=>(string)($d['weekday']??''),
            'is_official_holiday'=>$official,
            'is_manual_holiday'=>$manualHoliday,
            'is_holiday'=>$official||$manualHoliday,
            'title'=>$title!==''?$title:null,
            'source'=>$official&&$manualHoliday?'official+manual':($official?'official':($manualHoliday?'manual':'calculated')),
        ];
    }
    cal_json(['year'=>$y,'source'=>'IranCalendar','synced_at'=>date('c'),'days'=>$out]);
} catch(Throwable $e) {
    error_log('calendar api: '.$e->getMessage().' @ '.$e->getFile().':'.$e->getLine());
    cal_json(['error'=>'خطای دریافت تقویم'],500);
}
