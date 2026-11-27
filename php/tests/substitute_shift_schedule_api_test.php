<?php
declare(strict_types=1);
date_default_timezone_set('Asia/Tehran');
// Exercise the real authenticated route handler with an effective synthetic shift.
require __DIR__.'/../lib/ShiftCalc.php';
$source=file_get_contents(__DIR__.'/../lib/routes.php');
$start=strpos($source,'function gregorian_to_jalali(');
$end=strpos($source,'function j_to_ts(',$start);
if($start===false||$end===false)throw new RuntimeException('Jalali conversion missing');
eval(substr($source,$start,$end-$start));
class Db {
    public static function one($sql,$args=[]){throw new RuntimeException('Synthetic shift must never query shift_days directly');}
}
$GLOBALS['shiftCalls']=0;
$GLOBALS['dayCalls']=[];
function _active_user_shift_assignment($uid,$jdate) {
    $GLOBALS['shiftCalls']++;
    return $GLOBALS['withoutShift']??false ? null :
        ['id'=>-9,'shift_id'=>-9,'type'=>'advanced','title'=>'شیفت‌های جایگزینی'];
}
function _shift_day_row($id,$date) {
    $GLOBALS['dayCalls'][]=[$id,$date];
    if($id!==-9)throw new RuntimeException('Wrong shift identity');
    return ['segments'=>[['s'=>'06:00','e'=>'14:00'],['s'=>'14:00','e'=>'22:00']],
        'day_config'=>['duty_min'=>960], 'is_off'=>false];
}
function _jweekday_name(...$args){return 'روز';}
$handlers=[];
function route($method,$path,$handler,...$rest) {
    $GLOBALS['handlers'][$method.$path]=$handler;
}
$start=strpos($source,"route('GET', '/api/my/shift-schedule'");
$end=strpos($source,"route('GET', '/api/my/work-summary'",$start);
if($start===false||$end===false)throw new RuntimeException('Schedule route not found');
eval(substr($source,$start,$end-$start));
$handler=$handlers['GET/api/my/shift-schedule'];
$result=$handler([],[],['id'=>9]);
$working=array_values(array_filter($result['days'],fn($day)=>!$day['is_friday']));
if(!$working)throw new RuntimeException('No scheduled weekdays');
foreach($working as $day){
    if($day['minutes']!==960||$day['is_off']||$day['is_no_shift'])
        throw new RuntimeException('Composite expected duty not reported: '.$day['date']);
}
if(count($GLOBALS['dayCalls'])!==count($result['days']))
    throw new RuntimeException('Every synthetic day must use the canonical day-row accessor');
$GLOBALS['withoutShift']=true;$GLOBALS['dayCalls']=[];
$empty=$handler([],[],['id'=>9]);
if(array_filter($empty['days'],fn($day)=>!$day['is_no_shift']||$day['minutes']!==0))
    throw new RuntimeException('Unassigned day must never invent duty');
if($GLOBALS['dayCalls'])throw new RuntimeException('Unassigned day queried shift row');
echo "PASS effective synthetic schedule: two independent segments, no zero-duty fallback, and no phantom duty\\n";
