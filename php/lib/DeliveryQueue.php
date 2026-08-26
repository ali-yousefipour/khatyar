<?php
/**
 * صف پایدار ارسال پیام‌ها برای SMS، Push و پیام‌رسان‌ها.
 * این کلاس برای جلوگیری از گم‌شدن پیام در زمان قطعی سرویس یا اینترنت استفاده می‌شود.
 */
class DeliveryQueue {
  public static function ensure() {
    try {
      Db::run("CREATE TABLE IF NOT EXISTS delivery_queue (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        channel VARCHAR(20) NOT NULL,
        target_type VARCHAR(30) NULL,
        target_id BIGINT NULL,
        to_value VARCHAR(191) NULL,
        title VARCHAR(255) NULL,
        body TEXT NULL,
        payload JSON NULL,
        status ENUM('pending','processing','sent','failed','cancelled') NOT NULL DEFAULT 'pending',
        attempts INT NOT NULL DEFAULT 0,
        max_attempts INT NOT NULL DEFAULT 5,
        next_attempt_at DATETIME NULL,
        last_error TEXT NULL,
        sent_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_delivery_status_next (status,next_attempt_at),
        INDEX idx_delivery_target (target_type,target_id),
        INDEX idx_delivery_channel (channel)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    } catch (Throwable $e) {}
  }

  public static function enqueue($channel, $to, $title, $body='', $payload=[], $targetType=null, $targetId=null, $maxAttempts=5) {
    self::ensure();
    try {
      Db::run("INSERT INTO delivery_queue(channel,target_type,target_id,to_value,title,body,payload,status,max_attempts,next_attempt_at)
               VALUES(?,?,?,?,?,?,?,'pending',?,NOW())",
        [(string)$channel,$targetType,$targetId,(string)$to,(string)$title,(string)$body,json_encode($payload,JSON_UNESCAPED_UNICODE),(int)$maxAttempts]);
      return true;
    } catch (Throwable $e) { return false; }
  }

  public static function mark($id, $status, $error=null) {
    try {
      Db::run("UPDATE delivery_queue SET status=?, last_error=?, sent_at=IF(?='sent',NOW(),sent_at), updated_at=NOW() WHERE id=?",
        [$status,$error,$status,(int)$id]);
    } catch (Throwable $e) {}
  }

  public static function process($limit=50) {
    self::ensure();
    $limit = max(1, min(200, (int)$limit));
    $rows = Db::all("SELECT * FROM delivery_queue
      WHERE status IN ('pending','failed') AND attempts < max_attempts AND (next_attempt_at IS NULL OR next_attempt_at<=NOW())
      ORDER BY id ASC LIMIT $limit");
    $out = ['ok'=>true,'processed'=>0,'sent'=>0,'failed'=>0];
    foreach ($rows as $r) {
      $out['processed']++;
      Db::run("UPDATE delivery_queue SET status='processing', attempts=attempts+1, updated_at=NOW() WHERE id=?", [(int)$r['id']]);
      $ok=false; $err=null;
      try {
        $payload = json_decode($r['payload'] ?? '{}', true) ?: [];
        if ($r['channel'] === 'bale' && class_exists('BaleBot')) {
          $res = BaleBot::sendToMobile($r['to_value'], trim(($r['title'] ?: '')."\n".($r['body'] ?: '')), $r['target_type'], $r['target_id']);
          $ok = !empty($res['ok']); $err = $ok ? null : json_encode($res, JSON_UNESCAPED_UNICODE);
        } elseif (in_array($r['channel'], ['telegram','eitaa'], true) && class_exists('MessengerBot')) {
          $res = MessengerBot::sendToMobile($r['channel'], $r['to_value'], trim(($r['title'] ?: '')."\n".($r['body'] ?: '')), $r['target_type'], $r['target_id']);
          $ok = !empty($res['ok']); $err = $ok ? null : json_encode($res, JSON_UNESCAPED_UNICODE);
        } elseif ($r['channel'] === 'sms' && class_exists('Sms')) {
          $res = Sms::send($r['to_value'], trim(($r['title'] ?: '')."\n".($r['body'] ?: '')), $payload['kind'] ?? 'queue', $payload['sent_by'] ?? null);
          $ok = !empty($res['ok']); $err = $ok ? null : ($res['error'] ?? 'sms_failed');
        } elseif ($r['channel'] === 'push' && class_exists('Push')) {
          $uid = (int)($r['target_id'] ?: $r['to_value']);
          if ($uid > 0) { Push::send([$uid], $r['title'], $r['body'], $payload); $ok = true; }
          else $err = 'invalid_user_id';
        } else {
          $err = 'unknown_channel';
        }
      } catch (Throwable $e) { $err = $e->getMessage(); }
      if ($ok) { self::mark($r['id'], 'sent'); $out['sent']++; }
      else {
        $delay = min(1440, pow(2, min(8, (int)$r['attempts'])) * 5);
        Db::run("UPDATE delivery_queue SET status='failed', last_error=?, next_attempt_at=DATE_ADD(NOW(), INTERVAL ? MINUTE), updated_at=NOW() WHERE id=?", [$err,$delay,(int)$r['id']]);
        $out['failed']++;
      }
    }
    return $out;
  }
}
