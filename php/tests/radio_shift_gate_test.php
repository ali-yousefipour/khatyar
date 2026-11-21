<?php
class Db {
  public static $enabled=true;
  public static $personal=false;
  public static $open=false;
  public static $checkedOut=false;
  public static $calls=[];
  public static function one($sql,$params=[]){
    self::$calls[]=[$sql,$params];
    if(strpos($sql,'app_settings')!==false)return ['value'=>self::$enabled?'1':'0'];
    if(strpos($sql,'shift_limit_enabled')!==false)return ['shift_limit_enabled'=>self::$personal?1:0];
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
Db::$personal=true;
verify(!kh_radio_shift_allowed($manager),'Official personal restriction applies even when global gate is off');
Db::$open=true;
verify(kh_radio_shift_allowed($manager),'Restricted official allowed with check-in');
Db::$checkedOut=true;
verify(!kh_radio_shift_allowed($manager),'Restricted official denied on checkout');
Db::$checkedOut=false;Db::$open=false;Db::$personal=false;
verify(kh_radio_shift_allowed($manager),'Official can disable personal restriction');
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
$panel=file_get_contents(__DIR__.'/../tools/panel_source.jsx');
verify(strpos($panel,'checked={shiftLimit}')!==false,'Admin setting checkbox is rendered');
verify(strpos($panel,"api('shift-limit-set'")!==false,'Admin setting checkbox saves on server');
$adminApi=file_get_contents(__DIR__.'/../app/radio-admin-api.php');
verify(strpos($adminApi,"'radio_limit_to_shift'")!==false,'Admin setting must be persisted');
verify(strpos($v2,"'shift_limit_toggle_allowed'")!==false,'Level 1-4 toggle flag must be exposed');
verify(strpos($v2,"'shift-limit-set'")!==false,'Personal shift restriction endpoint must exist');
verify(strpos($v2,"['channels','settings','shift-limit-set']")!==false,'Toggle endpoint must initialize the per-user column even if channels were not loaded');
verify(strpos($v2,'$stored=kh_radio_shift_personal_limit($u)')!==false,'Toggle must verify saved state before reporting success');
$context=file_get_contents(__DIR__.'/../../mobile/src/radio/RadioContext.js');
verify(strpos($context,'response?.shift_restricted!==next')!==false,'App must confirm the server restriction response');
verify(strpos($context,'verified?.shift_restricted!==next')!==false,'App must read back the saved restriction before reinitializing radio');
verify(strpos($v2,"if(!canListenAll(\$u))")!==false,'Personal toggle must be restricted by effective role level');
$mobile=file_get_contents(__DIR__.'/../../mobile/src/screens/RadioScreen.js');
verify(strpos($mobile,'shiftLimitToggleAllowed && <SettingToggle')!==false,'Restricted radio control must appear only for managers');
echo "PASS configurable radio shift restriction, personal level 1-4 control and guarded voice routes\n";
