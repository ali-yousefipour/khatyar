<?php
/**
 * Event-based, opt-in notifications for school complaints.
 * Each case transition enqueues inside the caller's transaction.
 * The dispatcher never sends from a transaction and never retries ambiguous sends automatically.
 */
final class SchoolComplaintNotifications {
  public const EVENTS = ['created','start','reply','escalate','return','close'];
  public const AUDIENCES = ['complainant','company','operator','reviewer','supervisor'];
  public const CHANNELS = ['sms','bale'];

  public static function normalize($input): array {
    $out=[];
    if (!is_array($input)) return $out;
    foreach (self::EVENTS as $event) {
      foreach (self::AUDIENCES as $audience) {
        $item=$input[$event][$audience]??null;
        foreach (self::CHANNELS as $channel) {
          $out[$event][$audience][$channel]=is_array($item)&&($item[$channel]??false)===true;
        }
      }
    }
    return $out;
  }

  public static function queue(int $caseId, int $eventId, string $event, array $config): void {
    if (!in_array($event,self::EVENTS,true)) return;
    $rules=self::normalize($config['notifications']??[]);
    $hasEnabled=false;
    foreach ($rules[$event]??[] as $methods) {
      if (!empty($methods['sms'])||!empty($methods['bale'])) { $hasEnabled=true; break; }
    }
    if (!$hasEnabled) return;
    $r=Db::one('SELECT tracking_code,phone,company_snapshot,created_by,assigned_to,supervisor_id FROM school_complaints WHERE id=?',[$caseId]);
    if (!$r) return;
    $company=json_decode((string)($r['company_snapshot']??'{}'),true);
    $company=is_array($company)?$company:[];
    $mobiles=[
      'complainant'=>(string)($r['phone']??''),
      'company'=>(string)($company['manager_mobile']??''),
      'operator'=>self::userPhone((int)($r['created_by']??0)),
      'reviewer'=>self::userPhone((int)$r['assigned_to']),
      'supervisor'=>self::userPhone((int)$r['supervisor_id']),
    ];
    // The original reviewer must receive return/escalation status even if the case has been reassigned.
    if ($event==='escalate') {
      $stage=Db::one('SELECT actor_id FROM school_complaint_events WHERE id=?',[$eventId]);
      $mobiles['reviewer']=self::userPhone((int)($stage['actor_id']??0));
    }
    $seen=[];
    foreach (self::AUDIENCES as $audience) foreach (self::CHANNELS as $channel) {
      if (empty($rules[$event][$audience][$channel])) continue;
      $mobile=self::mobile($mobiles[$audience]);
      if (!$mobile || isset($seen[$channel.':'.$mobile])) continue;
      $seen[$channel.':'.$mobile]=true;
      $labels=['created'=>'ثبت شد','start'=>'در حال رسیدگی است','reply'=>'پاسخ رسیدگی ثبت شد','escalate'=>'به مسئول واحد ارجاع شد','return'=>'برای بررسی تکمیلی بازگشت','close'=>'مختومه شد'];
      $text='خطیار - شکایات سرویس مدارس'."\n".'پرونده '.(string)$r['tracking_code'].' '.($labels[$event]??'به‌روزرسانی شد').'.';
      // The content deliberately excludes claimant identity, complaint text, and internal notes.
      Db::run("INSERT IGNORE INTO school_complaint_notification_outbox(event_id,complaint_id,event_key,audience,channel,mobile,message,status) VALUES(?,?,?,?,?,?,?,'queued')",
        [$eventId,$caseId,$event,$audience,$channel,$mobile,$text]);
    }
  }
  private static function userPhone(int $id): string {
    if ($id===0) return '';
    if ($id<0) {
      $row=Db::one('SELECT mobile AS phone FROM school_complaint_accounts WHERE id=? AND is_active=1',[-$id]);
      return (string)($row['phone']??'');
    }
    $row=Db::one('SELECT phone FROM users WHERE id=? AND is_active=1',[$id]);
    return (string)($row['phone']??'');
  }
  private static function mobile(string $value): string {
    $v=strtr($value,['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9']);
    $v=preg_replace('/\D+/','',$v);
    if (strlen($v)===12&&str_starts_with($v,'98')) $v='0'.substr($v,2);
    return preg_match('/^09\d{9}$/D',$v)?$v:'';
  }
  public static function dispatch(int $limit=25): array {
    $limit=max(1,min(50,$limit));$result=['sent'=>0,'failed'=>0];
    $rows=Db::all("SELECT id,channel,mobile,message FROM school_complaint_notification_outbox WHERE status='queued' ORDER BY id LIMIT ".$limit);
    foreach ($rows as $row) {
      $id=(int)$row['id'];
      // Atomic claim prevents two cron workers sending the same queued message.
      $claimed=Db::exec("UPDATE school_complaint_notification_outbox SET status='processing',attempted_at=NOW() WHERE id=? AND status='queued'",[$id]);
      if (!$claimed) continue;
      try {
        if ($row['channel']==='sms') {
          $out=Sms::send($row['mobile'],$row['message'],'school_complaint',null);
          $ok=!empty($out['ok']);
        } else {
          $out=BaleBot::isEnabled() ? BaleBot::sendToMobile($row['mobile'],$row['message'],'school_complaint',(string)$id) : ['ok'=>false,'error'=>'ربات بله در تنظیمات اصلی غیرفعال است'];
          $ok=!empty($out['ok']);
        }
        $error=$ok?'':mb_substr((string)($out['error']??'ارسال ناموفق بود'),0,255);
      } catch (Throwable $e) { $ok=false;$error='خطای ارسال؛ بررسی دستی لازم است'; }
      Db::run('UPDATE school_complaint_notification_outbox SET status=?,error_message=?,finished_at=NOW() WHERE id=?',
        [$ok?'sent':'failed',$error,$id]);
      $result[$ok?'sent':'failed']++;
    }
    return $result;
  }
}
