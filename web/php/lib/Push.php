<?php
// ارسال اعلان درون‌برنامه‌ای + Push از طریق سرویس Expo
class Push {

  private static function soundChannel($data) {
    $type = (string)($data['type'] ?? '');
    if ($type === 'presence_check') return ['sound' => 'presence_validation_alert.mp3', 'channelId' => 'presence_alarm'];
    if ($type === 'message' || $type === 'chat' || $type === 'sms') return ['sound' => 'message_new.mp3', 'channelId' => 'messages'];
    if ($type === 'report' || $type === 'inbox_report') return ['sound' => 'report_received.mp3', 'channelId' => 'reports'];
    return ['sound' => 'notification_new.mp3', 'channelId' => 'default'];
  }
  // فقط ارسال Push به دستگاه‌ها (بدون ثبت در فهرست اعلان‌ها)
  public static function send(array $userIds, $title, $body, $data = []) {
    $ids = array_values(array_unique(array_filter($userIds)));
    if (!$ids) return;
    $in = implode(',', array_fill(0, count($ids), '?'));
    // ارسال به ربات‌ها مستقل از وجود توکن Push انجام می‌شود. قبلاً اگر مسئول منتخب
    // توکن Expo نداشت، تابع همین‌جا return می‌کرد و پیام بله هرگز ارسال نمی‌شد.
    try {
      $type = (string)($data['type'] ?? '');
      // اعلان‌های انقضای مدارک فقط اعلان درون‌برنامه‌ای/Push هستند و نباید به ربات شخصی کاربر ارسال شوند.
      $noBotTypes = ['expiry','license_expiry','taxi_lic_expiry','op_lic_expiry','inspection_expiry','insurance_expiry'];
      if (!in_array($type, $noBotTypes, true)) {
        $item = ($type === 'birthday') ? 'birthday'
          : ((($type === 'presence_check') || ($type === 'attendance')) ? 'attendance'
          : ((in_array($type, ['station_exit','station_enter','vpn_on','gps_off','attendance_checkin','attendance_checkout'], true)) ? 'warnings'
          : 'messages'));
        if (class_exists('MessengerHub')) MessengerHub::sendToUserIds($ids, $title, $body, $item, $data);
        elseif (class_exists('BaleBot')) BaleBot::sendToUserIds($ids, $title, $body, $item, $data);
      }
    } catch (Throwable $e) {
      try { error_log('messenger mirror failed: '.$e->getMessage()); } catch (Throwable $ignore) {}
    }

    $tokens = array_column(Db::all("SELECT token FROM push_tokens WHERE user_id IN ($in)", $ids), 'token');
    $tokens = array_values(array_filter($tokens, fn($t) => strpos($t, 'ExponentPushToken') === 0 || strpos($t, 'ExpoPushToken') === 0));
    if (!$tokens) return;
    $sx = self::soundChannel($data);
    $messages = array_map(fn($t) => [
      'to' => $t, 'sound' => $sx['sound'], 'title' => $title, 'body' => $body,
      'data' => $data, 'channelId' => $sx['channelId'], 'priority' => 'high',
    ], $tokens);
    // ارسال دسته‌ای به سرویس Expo (حتی اگر اپ کاملاً بسته باشد، نوتیفیکیشن نمایش داده می‌شود)
    foreach (array_chunk($messages, 100) as $chunk) {
      $ch = curl_init('https://exp.host/--/api/v2/push/send');
      curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
        CURLOPT_POSTFIELDS => json_encode(array_values($chunk), JSON_UNESCAPED_UNICODE),
      ]);
      $raw = @curl_exec($ch); $err = @curl_error($ch); @curl_close($ch);
      if (($raw === false || $err) && class_exists('DeliveryQueue')) {
        foreach ($chunk as $msg) DeliveryQueue::enqueue('push', $msg['to'], $msg['title'] ?? '', $msg['body'] ?? '', $msg['data'] ?? [], 'push_token', null);
      }
    }
  }

  // ثبت اعلان درون‌برنامه‌ای (فهرست زنگوله) + ارسال Push
  public static function notify(array $userIds, $title, $body, $data = []) {
    $ids = array_values(array_unique(array_filter($userIds)));
    if (!$ids) return;
    foreach ($ids as $uid)
      Db::run("INSERT INTO notifications(user_id,title,body,data) VALUES (?,?,?,?)",
        [$uid, $title, $body, json_encode($data, JSON_UNESCAPED_UNICODE)]);
    self::send($ids, $title, $body, $data);
  }
}
