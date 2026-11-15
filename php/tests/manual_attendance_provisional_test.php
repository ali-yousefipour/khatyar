<?php
date_default_timezone_set('Asia/Tehran');
class Http {static function error($message,$status=400){throw new RuntimeException($message,$status);}}
class Db {
  public static array $attendance=[],$map=[];
  public static int $next=20;
  public static function run($sql,$params=[]){
    if(str_contains($sql,'CREATE TABLE'))return null;
    if(str_contains($sql,'INSERT INTO manual_attendance_provisional')){
      $id=(int)$params[0];self::$map[$id]=['request_id'=>$id,'user_id'=>(int)$params[1],'attendance_id'=>(int)$params[2],'kind'=>$params[3],'previous_checkout'=>$params[4]??null];return null;
    }
    if(str_contains($sql,'DELETE FROM manual_attendance_provisional')){unset(self::$map[(int)$params[0]]);return null;}
    if(str_contains($sql,'DELETE FROM staff_attendance')){
      $id=(int)$params[0];if(isset(self::$attendance[$id])&&(int)self::$attendance[$id]['user_id']===(int)$params[1])unset(self::$attendance[$id]);return null;
    }
    if(str_contains($sql,'UPDATE staff_attendance SET check_out=')){
      $id=(int)$params[1];if(isset(self::$attendance[$id]))self::$attendance[$id]['check_out']=$params[0];return null;
    }
    throw new LogicException($sql);
  }
  public static function one($sql,$params=[]){
    if(str_contains($sql,'FROM manual_attendance_provisional'))return self::$map[(int)$params[0]]??null;
    if(str_contains($sql,'FROM staff_attendance')){
      $rows=array_values(array_filter(self::$attendance,static fn($x)=>(int)$x['user_id']===(int)$params[0]&&$x['check_out']===null));
      return $rows?end($rows):null;
    }
    throw new LogicException($sql);
  }
  public static function insert($sql,$params=[]){
    if(!str_contains($sql,'INSERT INTO staff_attendance'))throw new LogicException($sql);
    $id=++self::$next;
    self::$attendance[$id]=['id'=>$id,'user_id'=>(int)$params[0],'check_in'=>$params[1],'check_out'=>$params[2]??null,'method'=>'manual'];
    return $id;
  }
}
function _req_policy_date($value){return new DateTimeImmutable('today',new DateTimeZone('Asia/Tehran'));}
$source=file_get_contents(__DIR__.'/../lib/routes.php');
$a=strpos($source,'function _manual_provisional_schema(');
$b=strpos($source,"route('POST', '/api/my/requests'",$a);
if($a===false||$b===false)throw new RuntimeException('Provisional attendance helpers missing');
eval(substr($source,$a,$b-$a));
function check($ok,$reason){if(!$ok)throw new RuntimeException($reason);}
$in=['type'=>'manual','the_date'=>'1405-08-24','manual_kind'=>'in','in_time'=>'08:00'];
$id=_manual_provisional_apply($in,101,6);
check($id>0&&count(Db::$attendance)===1&&Db::$attendance[$id]['check_out']===null,'Pending entry opens a provisional attendance');
check(_manual_provisional_apply($in,101,6)===$id&&count(Db::$attendance)===1,'Repeated provisional apply must be idempotent');
Db::$attendance[$id]['check_out']=date('Y-m-d').' 14:00:00'; // user later checks out normally
_manual_provisional_revert(101);
check(!isset(Db::$attendance[$id])&&!isset(Db::$map[101]),'Rejecting entry removes provisional attendance including subsequent checkout');
$real=Db::insert('INSERT INTO staff_attendance', [6,date('Y-m-d').' 08:00:00',null]);
$out=['type'=>'manual','the_date'=>'1405-08-24','manual_kind'=>'out','out_time'=>'15:00'];
check(_manual_provisional_apply($out,102,6)===$real,'Pending exit must find the existing open attendance');
check(Db::$attendance[$real]['check_out']!==null,'Pending exit immediately closes the attendance');
_manual_provisional_revert(102);
check(Db::$attendance[$real]['check_out']===null,'Rejected exit restores the real open attendance');
Db::$attendance[$real]['check_out']=date('Y-m-d').' 17:00:00';
$both=['type'=>'manual','the_date'=>'1405-08-24','manual_kind'=>'both','in_time'=>'09:00','out_time'=>'12:00'];
$closed=_manual_provisional_apply($both,103,6);
check(Db::$attendance[$closed]['check_out']!==null,'Pending entry and exit must generate a bounded session');
check(str_contains($source,"if(\$status==='rejected'&&(\$req['type']??'')==='manual')_manual_provisional_revert(\$id)"),'Admin rejection must roll back provisional attendance');
check(str_contains($source,'manual_request_submission_keys'),'Offline request UUID must be idempotent server-side');
echo "PASS manual pending attendance: entry, ordinary checkout, exit, rejection rollback, same-request idempotency\n";
