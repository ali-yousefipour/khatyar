<?php
class Db {
  public static $enabled=false;
  public static $open=false;
  public static $calls=[];
  public static function one($sql,$params=[]){
    self::$calls[]=[$sql,$params];
    if(strpos($sql,'app_settings')!==false)return ['value'=>self::$enabled?'1':'0'];
    if(strpos($sql,'staff_attendance')!==false)return self::$open?['id'=>10]:null;
    return null;
  }
}
require __DIR__.'/../lib/RadioShiftGate.php';
function verify($cond,$label){if(!$cond)throw new RuntimeException($label);}
$staff=['id'=>14,'level'=>6,'is_admin'=>0];
$manager=['id'=>2,'level'=>3,'is_admin'=>0];
$admin=['id'=>1,'level'=>8,'is_admin'=>1];
Db::$enabled=false;Db::$open=false;
verify(kh_radio_shift_allowed($staff),'Default radio remains unrestricted');
Db::$enabled=true;
verify(!kh_radio_shift_allowed($staff),'Ordinary staff without open check-in blocked');
Db::$open=true;
verify(kh_radio_shift_allowed($staff),'Staff with open check-in allowed');
Db::$open=false;
verify(kh_radio_shift_allowed($manager),'Responsible level 1-4 exempt');
verify(kh_radio_shift_allowed($admin),'System admin exempt');
verify(!kh_radio_shift_allowed(['id'=>0,'level'=>6,'is_admin'=>0]),'Unknown user must be blocked');
$queries=array_filter(Db::$calls,static fn($c)=>strpos($c[0],'staff_attendance')!==false);
verify(count($queries)>0,'Attendance checked on server');
foreach($queries as $call)verify(strpos($call[0],'check_out IS NULL')!==false && strpos($call[0],'check_in<=NOW()')!==false,'Open and nonfuture check-in required');
$v2=file_get_contents(__DIR__.'/../app/radio-api-v2.php');
$legacy=file_get_contents(__DIR__.'/../app/radio-api.php');
foreach(['presence','take','send','poll','poll-all','archive','responsible-recent','latest-three'] as $op)
  verify(strpos($v2,"'".$op."'")!==false,'V2 voice route missing: '.$op);
verify(strpos($v2,'kh_radio_shift_require($u);')!==false,'V2 voice guard missing');
verify(strpos($v2,'if(isset($_GET[\'sig\'])){$u=radio_audio_signed_user();} kh_radio_shift_require($u);')!==false,'Signed audio needs shift check after user resolution');
verify(strpos($legacy,'kh_radio_shift_require($u)')!==false,'Legacy voice guard missing');
$panel=file_get_contents(__DIR__.'/../tools/panel_source.jsx');
verify(strpos($panel,'محدود کردن بیسیم به شیفت کاری ( بجز مسئولین)')!==false,'Admin checkbox missing');
verify(strpos($panel,"shift-limit-set")!==false,'Admin save missing');
echo "PASS shift-only radio: disabled default, responsible exemptions, live punch, server voice guards and admin checkbox\n";
