<?php
// Isolated test: no production database or session is touched.
class AttendanceReplayError extends RuntimeException {}
class Http {
  public static function error($message,$code=400){throw new AttendanceReplayError($message,$code);}
}
class Db {
  public static $ready=true;
  public static $receipts=[];
  public static $queries=[];
  public static function one($sql,$params=[]) {
    self::$queries[]=[$sql,$params];
    if(strpos($sql,'INFORMATION_SCHEMA.TABLES')!==false)return ['n'=>self::$ready?1:0];
    if(strpos($sql,'FROM attendance_action_receipts')!==false) {
      $key=implode(':',$params);return self::$receipts[$key]??null;
    }
    throw new RuntimeException('Unexpected SQL in receipt test');
  }
  public static function run($sql,$params=[]) {
    self::$queries[]=[$sql,$params];
    if(strpos($sql,'INSERT INTO attendance_action_receipts')!==false){
      $key=implode(':',array_slice($params,0,3));
      if(isset(self::$receipts[$key]))throw new RuntimeException('duplicate receipt');
      self::$receipts[$key]=['response_json'=>$params[4]];
      return true;
    }
    throw new RuntimeException('Unexpected SQL in receipt test');
  }
}
function insist($ok,$message){if(!$ok)throw new RuntimeException($message);}
$source=file_get_contents(__DIR__.'/../lib/routes.php');
$start=strpos($source,'function _attendance_receipts_ready(): bool {');
$end=strpos($source,'// ثبت ورود', $start);
insist($start!==false && $end!==false,'Attendance receipt helper boundaries missing');
eval(substr($source,$start,$end-$start));
$uuid='q_20261121_replay_1840';
insist(_attendance_request_uuid(['client_uuid'=>$uuid])===$uuid,'UUID normalization failed');
try {_attendance_request_uuid(['client_uuid'=>'bad']);throw new RuntimeException('Invalid UUID accepted');}
catch(AttendanceReplayError $e){insist($e->getCode()===422,'Wrong UUID validation status');}
insist(_attendance_saved_reply(14,'checkin',$uuid)===null,'Unexpected initial receipt');
$answer=['ok'=>true,'id'=>78,'check_in'=>'2026-11-21 09:00:00'];
_attendance_save_reply(14,'checkin',$uuid,78,$answer);
$again=_attendance_saved_reply(14,'checkin',$uuid);
insist($again['id']===78 && $again['duplicate']===true,'Lost ACK replay should return original successful ID');
insist(_attendance_saved_reply(15,'checkin',$uuid)===null,'Receipts must be user scoped');
insist(_attendance_saved_reply(14,'checkout',$uuid)===null,'Receipts must be action scoped');
_attendance_save_reply(14,'checkout',$uuid,78,['ok'=>true,'check_out'=>'2026-11-21 10:00:00']);
insist(_attendance_saved_reply(14,'checkout',$uuid)['check_out']==='2026-11-21 10:00:00','Checkout replay receipt failed');
$checkinStart=strpos($source,"route('POST', '/api/my/checkin'");
$checkoutStart=strpos($source,"route('POST', '/api/my/checkout'");
$nextRoute=strpos($source,"route('POST', '/api/my/shift-handover/start'",$checkoutStart);
$in=substr($source,$checkinStart,$checkoutStart-$checkinStart);
$out=substr($source,$checkoutStart,$nextRoute-$checkoutStart);
insist(strpos($in,'FOR UPDATE')!==false && strpos($in,"_attendance_save_reply((int)".chr(36)."u['id'],'checkin'")!==false,'Checkin receipt must be inserted under lock');
insist(strpos($out,'AND check_out IS NULL')!==false && strpos($out,"_attendance_save_reply((int)".chr(36)."u['id'],'checkout'")!==false,'Checkout must atomically guard the close and store receipt');
insist(strpos($out,'$pdo->commit();')!==false,'Checkout receipt must commit before response');
insist(strpos($out,"'auto_closed'=>true")!==false && strpos($out,"_attendance_save_reply((int)".chr(36)."u['id'],'checkout'")!==false,'Auto-closed checkout must persist an idempotent acknowledgement');
$logoutStart=strpos($source,"route('POST', '/api/auth/logout'");
$logoutEnd=strpos($source,"route('POST', '/api/me/forget-checkin'",$logoutStart);
$logout=substr($source,$logoutStart,$logoutEnd-$logoutStart);
insist(strpos($logout,"['id'], ".chr(36)."eventAt")===false,'Logout SQL must not bind an undefined event time');

echo "Attendance replay receipts: isolated tests passed\n";
