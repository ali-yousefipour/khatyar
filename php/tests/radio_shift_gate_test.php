<?php
class Db {
  public static $enabled=true;
  public static $open=false;
  public static $checkedOut=false;
  public static $calls=[];
  public static function one($sql,$params=[]){
    self::$calls[]=[$sql,$params];
    if(strpos($sql,'app_settings')!==false)return ['value'=>self::$enabled?'1':'0'];
    if(strpos($sql,'staff_attendance')!==false)return self::$open?['id'=>10,'check_out'=>self::$checkedOut?'2026-10-28 11:05:00':null]:null;
    return null;
  }
}
require __DIR__.'/../lib/RadioShiftGate.php';
function verify($cond,$label){if(!$cond)throw new RuntimeException($label);}
$staff=['id'=>14,'level'=>6,'is_admin'=>0];
$manager=['id'=>2,'level'=>3,'is_admin'=>0];
$admin=['id'=>1,'level'=>8,'is_admin'=>1];
Db::$enabled=true;Db::$open=false;
verify(kh_radio_shift_enabled(),'Global radio shift restriction defaults on');
verify(!kh_radio_shift_allowed($staff),'Restricted staff cannot listen without check-in');
Db::$open=true;
verify(kh_radio_shift_allowed($staff),'Staff with active check-in allowed');
Db::$checkedOut=true;
verify(!kh_radio_shift_allowed($staff),'Checkout revokes radio');
Db::$checkedOut=false;Db::$open=false;
verify(kh_radio_shift_allowed($manager),'Level 1–4 default exemption');
verify(!kh_radio_shift_allowed($admin),'Admin grant must not exempt level eight');
foreach([5,6,7,8,9] as $level)
  verify(!kh_radio_shift_allowed(['id'=>14,'level'=>$level,'is_admin'=>1]),'Restricted level '.$level.' blocked');
Db::$enabled=false;
verify(!kh_radio_shift_enabled(),'Global checkbox can disable shift restriction');
foreach([5,6,7,8,9] as $level)
  verify(kh_radio_shift_allowed(['id'=>14,'level'=>$level,'is_admin'=>1]),'Global off releases level '.$level);
verify(!kh_radio_shift_allowed(['id'=>0,'level'=>6]),'Unknown user denied regardless of global setting');
// Officials are exempt from the attendance rule, regardless of global state.
foreach([1,2,3,4] as $level)
  verify(kh_radio_shift_allowed(['id'=>2,'level'=>$level]),'Official level '.$level.' must remain exempt');
Db::$enabled=true;
verify(!kh_radio_shift_allowed($staff),'Global restriction restored');
$queries=array_filter(Db::$calls,static fn($c)=>strpos($c[0],'staff_attendance')!==false);
verify(count($queries)>0,'Attendance checked on server');
foreach($queries as $call)verify(strpos($call[0],'ORDER BY check_in DESC,id DESC LIMIT 1')!==false && strpos($call[0],'check_in<=NOW()')!==false,'Open and nonfuture check-in required');
$v2=file_get_contents(__DIR__.'/../app/radio-api-v2.php');
$legacy=file_get_contents(__DIR__.'/../app/radio-api.php');
foreach(['presence','take','send','poll','poll-all','archive','responsible-recent','latest-three'] as $op)
  verify(strpos($v2,"'".$op."'")!==false,'V2 voice route missing: '.$op);
verify(strpos($v2,'kh_radio_shift_require($u);')!==false,'V2 voice guard missing');
verify(strpos($v2,"'poll-all','archive','responsible-recent'")!==false,'Poll and archive routes must be guarded');
verify(strpos($v2,"?radio_audio_signed_user():au();")!==false,'Signed audio must resolve scoped user before dispatch');
verify(strpos($v2,"if(\$op==='audio'&&\$method==='GET'){kh_radio_shift_require(\$u);")!==false,'Signed audio needs shift check after user resolution');
verify(strpos($legacy,'kh_radio_shift_require($u)')!==false,'Legacy voice guard missing');
verify(strpos($legacy,'lock_until<DATE_SUB(NOW(),INTERVAL 30 SECOND)')!==false,'Legacy cleanup preserves upload grace');
verify(strpos($v2,'AS upload_window_valid')!==false,'V2 checks upload lease against DB time');
verify(strpos($v2,'AS active_lease')!==false,'V2 checks take lease against DB time');
verify(strpos($v2,'COALESCE(MAX(id),0)+1 n FROM radio_messages')===false,'Radio IDs must never use MAX(id)+1');
verify(strpos($v2,'INSERT INTO radio_messages(channel_id,sender_id')!==false,'Radio message ID must be allocated by database');
verify(strpos($v2,'lastInsertId()')!==false,'Radio must retrieve allocated ID');
verify(strpos($v2,'$pdo->rollBack()')!==false,'Failed uploads must roll back');
verify(strpos($v2,"'مجوز صحبت شما منقضی شده است'")!==false,'Expired speaking lease remains a separate error from shift rule');
$panel=file_get_contents(__DIR__.'/../tools/panel_source.jsx');
verify(strpos($panel,'checked={shiftLimit}')!==false,'Admin setting checkbox is rendered');
verify(strpos($panel,"api('shift-limit-set'")!==false,'Admin setting checkbox saves on server');
$adminApi=file_get_contents(__DIR__.'/../app/radio-admin-api.php');
verify(strpos($adminApi,"'radio_limit_to_shift'")!==false,'Admin setting must be persisted');
verify(strpos($v2,"'shift_limit_toggle_allowed'")!==false,'Levels 1-4 see radio control');
verify(strpos($v2,"'shift-limit-set'")!==false,'Mobile global gate endpoint exists');
verify(strpos($v2,"if(!canListenAll(\$u))")!==false,'Levels 5-9 cannot change shared setting');
verify(strpos($v2,"VALUES('radio_limit_to_shift',?)")!==false,'Mobile updates the same global key as site');
verify(strpos($v2,"'global_shift_restricted'=>\$stored")!==false,'Mobile toggle returns confirmed global state');
verify(strpos($v2,"'radio_limit_to_shift'=>kh_radio_shift_enabled()")!==false,'Mobile fetches the same setting as the site');
verify(strpos($v2,'kh_radio_shift_personal_limit')===false,'No personal radio restriction remains');
$context=file_get_contents(__DIR__.'/../../mobile/src/radio/RadioContext.js');
verify(strpos($context,'setGlobalShiftLimit=async value')!==false,'Mobile toggle updates global setting');
verify(strpos($context,'result?.global_shift_restricted!==next')!==false,'Mobile confirms server response');
verify(strpos($context,'verified?.radio_limit_to_shift!==next')!==false,'Mobile confirms shared setting after write');
$mobile=file_get_contents(__DIR__.'/../../mobile/src/screens/RadioScreen.js');
verify(strpos($mobile,'shiftLimitToggleAllowed && <SettingToggle')!==false,'Mobile control only shown for levels 1-4');
verify(strpos($mobile,'checked={globalShiftLimit}')!==false,'Mobile switch reflects global checkbox state');
echo "PASS shared radio attendance gate controlled by site and officials 1-4, voice routes guarded\n";
