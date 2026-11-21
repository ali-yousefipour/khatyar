<?php
declare(strict_types=1);
class Db {
 public static array $rows=[];
 public static int $reads=0;
 public static function one($sql,$args=[]) {
  self::$reads++;
  if(str_contains($sql,'FROM school_complaints WHERE id='))return [
    'tracking_code'=>'SSC-TEST123','phone'=>'09123456789',
    'company_snapshot'=>json_encode(['manager_mobile'=>'09120000001']),
    'created_by'=>-7,'assigned_to'=>-7,'supervisor_id'=>2
  ];
  if(str_contains($sql,'school_complaint_events WHERE id='))return ['actor_id'=>-7];
  if(str_contains($sql,'school_complaint_accounts'))return ['phone'=>'09127777777'];
  if(str_contains($sql,'FROM users'))return ['phone'=>'09128888888'];
  return null;
 }
 public static function run($sql,$args=[]) {
  if(str_contains($sql,'INSERT IGNORE INTO school_complaint_notification_outbox')) {
   $key=$args[0].':'.$args[3].':'.$args[4];
   self::$rows[$key]=$args;
  }
 }
}
require dirname(__DIR__).'/lib/SchoolComplaintNotifications.php';
function check($x,$message){if(!$x)throw new RuntimeException($message);}
$cls='SchoolComplaintNotifications';
$empty=$cls::normalize([]);
check(count($empty)===6,'six events expected');
check($empty['created']['complainant']['sms']===false,'notifications must default to opt-out');
$cls::queue(9,101,'created',[]);
check(Db::$reads===0,'disabled rules should not access personal information or database');
$raw=['created'=>['complainant'=>['sms'=>true,'bale'=>true],'company'=>['bale'=>true],'operator'=>['sms'=>true],'reviewer'=>['sms'=>true]],
      'close'=>['supervisor'=>['sms'=>true]],'unexpected'=>['company'=>['sms'=>true]]];
$rules=$cls::normalize($raw);
check(count($rules)===6 && !isset($rules['unexpected']),'unknown event must be rejected');
$cls::queue(9,101,'created',['notifications'=>$raw]);
check(count(Db::$rows)===4,'expected four opted-in deliveries');
check(count(array_filter(Db::$rows,fn($v)=>str_contains($v[6],'SSC-TEST123')))===4,'tracking number included');
check(count(array_filter(Db::$rows,fn($v)=>str_contains($v[6],'توضیحات')))===0,'private complaint body excluded');
check(Db::$rows['101:operator:sms'][5]==='09127777777','dedicated operator mobile used');
check(!isset(Db::$rows['101:reviewer:sms']),'same mobile must not receive two SMS for the same event');
$cls::queue(9,101,'created',['notifications'=>$raw]);
check(count(Db::$rows)===4,'event/audience/channel must stay idempotent');
echo "PASS scoped opt-in event notification routing and confidential payload\n";
