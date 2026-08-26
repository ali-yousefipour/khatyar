<?php
class BaleBot {
  private static function setting($key, $default=null) {
    try { $r = Db::one("SELECT value FROM app_settings WHERE `key`=?", [$key]); if ($r) return json_decode($r['value'], true); } catch (Throwable $e) {}
    return $default;
  }
  private static function json($v, $default=[]) {
    if (is_array($v)) return $v;
    $j = json_decode((string)$v, true);
    return is_array($j) ? $j : $default;
  }
  public static function config() {
    return [
      'enabled' => (bool)self::setting('bale_enabled', false),
      'token' => (string)self::setting('bale_bot_token', ''),
      'api_base' => rtrim((string)self::setting('bale_api_base', 'https://tapi.bale.ai'), '/'),
      'webhook_secret' => (string)self::setting('bale_webhook_secret', ''),
      'welcome' => (string)self::setting('bale_welcome_text', "سلام. به ربات سامانه تاکسیرانی خوش آمدید.\nاز منوی پایین استفاده کنید یا شماره همراه/کد ملی ثبت‌شده در سامانه را ارسال نمایید."),
      'items' => self::setting('bale_enabled_items', ['messages'=>true,'birthday'=>true,'attendance'=>true,'bills'=>true,'warnings'=>true,'bot_forms'=>true,'custom_replies'=>true]),
    ];
  }
  public static function isEnabled() { $c = self::config(); return !empty($c['enabled']) && $c['token'] !== ''; }
  // پرداخت کیف پول باید مستقل از کلید عمومی ارسال اعلان کار کند؛ برای پرداخت وجود توکن بازو کافی است.
  public static function hasToken() { $c = self::config(); return trim((string)($c['token'] ?? '')) !== ''; }
  private static function url($method) { $c = self::config(); return $c['api_base'].'/bot'.$c['token'].'/'.$method; }

  public static function ensureProTables() {
    try {
      Db::run("CREATE TABLE IF NOT EXISTS bale_menu_items (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(120) NOT NULL,
        action_type VARCHAR(30) NOT NULL DEFAULT 'message',
        action_payload TEXT NULL,
        form_id BIGINT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL,
        INDEX idx_bale_menu_active(is_active,sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
      Db::run("CREATE TABLE IF NOT EXISTS bale_custom_replies (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        trigger_text VARCHAR(191) NOT NULL,
        match_type ENUM('exact','contains','starts_with') NOT NULL DEFAULT 'exact',
        response_text TEXT NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL,
        INDEX idx_bale_reply_active(is_active,sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
      Db::run("CREATE TABLE IF NOT EXISTS bale_forms (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(160) NOT NULL,
        slug VARCHAR(100) NULL,
        description TEXT NULL,
        require_national_code TINYINT(1) NOT NULL DEFAULT 1,
        auto_prefill_driver TINYINT(1) NOT NULL DEFAULT 1,
        success_message TEXT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL,
        INDEX idx_bale_form_active(is_active,sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
      Db::run("CREATE TABLE IF NOT EXISTS bale_form_fields (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        form_id BIGINT NOT NULL,
        field_key VARCHAR(80) NOT NULL,
        label VARCHAR(160) NOT NULL,
        field_type VARCHAR(30) NOT NULL DEFAULT 'text',
        is_required TINYINT(1) NOT NULL DEFAULT 0,
        prefill_source VARCHAR(80) NULL,
        options_json JSON NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_bale_field(form_id,field_key),
        INDEX idx_bale_field_form(form_id,sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
      Db::run("CREATE TABLE IF NOT EXISTS bale_chat_sessions (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        chat_id VARCHAR(120) NOT NULL UNIQUE,
        action VARCHAR(40) NOT NULL,
        step VARCHAR(80) NULL,
        form_id BIGINT NULL,
        payload_json JSON NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_bale_session_action(action,updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
      Db::run("CREATE TABLE IF NOT EXISTS bale_form_submissions (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        form_id BIGINT NOT NULL,
        chat_id VARCHAR(120) NOT NULL,
        subscriber_id BIGINT NULL,
        user_id BIGINT NULL,
        driver_id BIGINT NULL,
        national_code VARCHAR(20) NULL,
        mobile VARCHAR(20) NULL,
        data_json JSON NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        reviewed_by BIGINT NULL,
        reviewed_at DATETIME NULL,
        review_note TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_bale_sub_form(form_id,created_at),
        INDEX idx_bale_sub_status(status,created_at),
        INDEX idx_bale_sub_driver(driver_id),
        INDEX idx_bale_sub_user(user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
      // جداسازی تنظیمات محتوایی هر پیام‌رسان در جدول‌های مشترک قدیمی
      foreach (['bale_menu_items','bale_custom_replies','bale_forms'] as $tbl) {
        try { Db::run("ALTER TABLE `$tbl` ADD COLUMN platform VARCHAR(20) NOT NULL DEFAULT 'bale' AFTER id"); } catch (Throwable $e) {}
        try { Db::run("CREATE INDEX idx_{$tbl}_platform ON `$tbl` (platform,is_active,sort_order)"); } catch (Throwable $e) {}
      }

      Db::run("CREATE TABLE IF NOT EXISTS bale_bot_events (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        chat_id VARCHAR(120) NULL,
        event_type VARCHAR(60) NOT NULL,
        input_text TEXT NULL,
        payload_json JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_bale_event_type(event_type,created_at),
        INDEX idx_bale_event_chat(chat_id,created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

      $cnt = Db::one("SELECT COUNT(*) c FROM bale_forms WHERE platform='bale'");
      if ((int)($cnt['c'] ?? 0) === 0) {
        $fid = Db::insert("INSERT INTO bale_forms(platform,title,slug,description,require_national_code,auto_prefill_driver,success_message,is_active,sort_order,created_at) VALUES(?,?,?,?,?,?,?,?,?,NOW())", [
          'bale','ثبت درخواست راننده','driver-request','فرم پیش‌فرض دریافت درخواست راننده از طریق ربات بله',1,1,'درخواست شما ثبت شد و توسط مسئول مربوطه بررسی می‌شود.',1,10
        ]);
        $fields = [
          ['full_name','نام و نام خانوادگی','text',1,'driver.full_name',1],
          ['mobile','شماره همراه','mobile',1,'driver.mobile',2],
          ['plate','پلاک خودرو','text',0,'driver.plate',3],
          ['smart_code','کد هوشمند','text',0,'driver.smart_code',4],
          ['request_title','موضوع درخواست','text',1,'',5],
          ['request_description','شرح درخواست','text',1,'',6],
        ];
        foreach ($fields as $f) Db::run("INSERT INTO bale_form_fields(form_id,field_key,label,field_type,is_required,prefill_source,options_json,sort_order,created_at) VALUES(?,?,?,?,?,?,?,?,?,NOW())", [$fid,$f[0],$f[1],$f[2],$f[3],$f[4],json_encode([],JSON_UNESCAPED_UNICODE),$f[5]]);
        Db::run("INSERT INTO bale_menu_items(platform,title,action_type,action_payload,form_id,sort_order,is_active,created_at) VALUES(?,?,?,?,?,?,?,NOW())", ['bale','ثبت درخواست راننده','form',null,$fid,10,1]);
        Db::run("INSERT INTO bale_custom_replies(platform,trigger_text,match_type,response_text,sort_order,is_active,created_at) VALUES(?,?,?,?,?,?,NOW())", ['bale','راهنمای ثبت نام','exact','برای ثبت درخواست، دکمه ثبت‌نام یا ثبت درخواست راننده را انتخاب کنید. ابتدا کد ملی دریافت می‌شود و اطلاعات راننده به‌صورت خودکار از سامانه تکمیل می‌گردد.',10,1]);
      }
    } catch (Throwable $e) {}
  }

  public static function request($method, $payload=[], $requireEnabled=true) {
    if ($requireEnabled && !self::isEnabled()) return ['ok'=>false,'error'=>'bale_disabled'];
    $ch = curl_init(self::url($method));
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_POST => true,
      CURLOPT_HTTPHEADER => ['Content-Type: application/json; charset=utf-8'],
      CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
      CURLOPT_CONNECTTIMEOUT => 8,
      CURLOPT_TIMEOUT => 15,
    ]);
    $raw = curl_exec($ch); $err = curl_error($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    if ($raw === false) return ['ok'=>false,'error'=>$err ?: 'curl_error', 'http_code'=>$code];
    $json = json_decode($raw, true);
    if (is_array($json)) return $json + ['http_code'=>$code];
    return ['ok'=>($code>=200 && $code<300), 'raw'=>$raw, 'http_code'=>$code];
  }

  public static function findChatForUser($userId) {
    $userId=(int)$userId;
    if ($userId<=0) return null;
    try {
      $row=Db::one("SELECT chat_id FROM bale_subscribers WHERE user_id=? AND is_active=1 ORDER BY id DESC LIMIT 1",[$userId]);
      if ($row && !empty($row['chat_id'])) return (string)$row['chat_id'];
      $u=Db::one("SELECT phone FROM users WHERE id=?",[$userId]);
      $mobile=self::normalizeMobile($u['phone']??'');
      if ($mobile) {
        $row=Db::one("SELECT chat_id FROM bale_subscribers WHERE mobile=? AND is_active=1 ORDER BY id DESC LIMIT 1",[$mobile]);
        if ($row && !empty($row['chat_id'])) return (string)$row['chat_id'];
      }
    } catch (Throwable $e) {}
    return null;
  }
  public static function sendInvoice($chatId,$title,$description,$payload,$amount,$providerToken,$photoUrl='',$attempts=3) {
    $chatId=trim((string)$chatId); $providerToken=trim((string)$providerToken); $amount=(int)$amount;
    if ($chatId==='' || $providerToken==='' || $amount<=0) return ['ok'=>false,'error'=>'invalid_invoice_arguments'];
    $data=[
      'chat_id'=>$chatId,
      'title'=>mb_substr(trim((string)$title),0,32),
      'description'=>mb_substr(trim((string)$description),0,255),
      'payload'=>mb_substr((string)$payload,0,128),
      'provider_token'=>$providerToken,
      'currency'=>'IRR',
      'prices'=>[['label'=>mb_substr(trim((string)$title),0,32),'amount'=>$amount]],
    ];
    if (trim((string)$photoUrl)!=='') $data['photo_url']=trim((string)$photoUrl);
    $last=['ok'=>false,'error'=>'invoice_not_sent'];
    $attempts=max(1,min(5,(int)$attempts));
    for($i=1;$i<=$attempts;$i++){
      $last=self::request('sendInvoice',$data,false);
      if(!empty($last['ok'])) { $last['attempts']=$i; return $last; }
      $code=(int)($last['http_code']??0);
      if($code>=400 && $code<500 && !in_array($code,[408,429],true)) break;
      if($i<$attempts) usleep(250000*$i);
    }
    $last['attempts']=$attempts;
    return $last;
  }
  public static function answerPreCheckoutQuery($id,$ok=true,$errorMessage='') {
    $data=['pre_checkout_query_id'=>(string)$id,'ok'=>(bool)$ok];
    if (!$ok && trim((string)$errorMessage)!=='') $data['error_message']=mb_substr(trim((string)$errorMessage),0,255);
    return self::request('answerPreCheckoutQuery',$data,false);
  }
  public static function inquireTransaction($transactionId) {
    return self::request('inquireTransaction',['transaction_id'=>(string)$transactionId],false);
  }

  public static function sendMessage($chatId, $text, $data=[], $replyMarkup=null) {
    $chatId = trim((string)$chatId); $text = trim((string)$text);
    if ($chatId === '' || $text === '') return ['ok'=>false,'error'=>'empty_chat_or_text'];
    $payload = ['chat_id'=>$chatId, 'text'=>$text];
    if (is_array($replyMarkup)) $payload['reply_markup'] = $replyMarkup;
    $res = self::request('sendMessage', $payload);
    try { Db::run("INSERT INTO bale_message_log(target_type,target_id,chat_id,body,status,response,created_at) VALUES(?,?,?,?,?,?,?,NOW())", [
      $data['target_type'] ?? null, $data['target_id'] ?? null, $chatId, $text,
      !empty($res['ok']) ? 'sent' : 'failed', json_encode($res, JSON_UNESCAPED_UNICODE)
    ]); } catch (Throwable $e) {}
    if (empty($res['ok']) && class_exists('DeliveryQueue')) {
      try { DeliveryQueue::enqueue('bale', $data['mobile'] ?? $chatId, '', $text, $data, $data['target_type'] ?? 'bale', $data['target_id'] ?? null); } catch (Throwable $e) {}
    }
    return $res;
  }
  public static function keyboard($buttons) {
    $rows = [];
    foreach ($buttons as $row) {
      $r = [];
      foreach ((array)$row as $b) $r[] = ['text'=>(string)$b];
      if ($r) $rows[] = $r;
    }
    return ['keyboard'=>$rows, 'resize_keyboard'=>true, 'one_time_keyboard'=>false];
  }
  public static function mainKeyboard() {
    self::ensureProTables();
    $rows = [['ثبت‌نام','اطلاعات من'], ['راهنما','قطع اتصال']];
    try {
      $items = Db::all("SELECT title FROM bale_menu_items WHERE platform='bale' AND is_active=1 ORDER BY sort_order,id LIMIT 20");
      $buf = [];
      foreach ($items as $it) { $buf[] = $it['title']; if (count($buf) === 2) { $rows[]=$buf; $buf=[]; } }
      if ($buf) $rows[] = $buf;
    } catch (Throwable $e) {}
    return self::keyboard($rows);
  }
  public static function sendMenu($chatId, $text='منوی ربات سامانه تاکسیرانی') {
    return self::sendMessage($chatId, $text, ['target_type'=>'bale_menu'], self::mainKeyboard());
  }
  public static function sendToMobile($mobile, $text, $targetType=null, $targetId=null) {
    $mobile = self::normalizeMobile($mobile);
    if (!$mobile) return ['ok'=>false,'error'=>'invalid_mobile'];
    $sub = Db::one("SELECT chat_id FROM bale_subscribers WHERE mobile=? AND is_active=1 ORDER BY id DESC LIMIT 1", [$mobile]);
    if (!$sub) return ['ok'=>false,'error'=>'not_connected'];
    return self::sendMessage($sub['chat_id'], $text, ['target_type'=>$targetType, 'target_id'=>$targetId, 'mobile'=>$mobile]);
  }

  public static function itemEnabled($item, $default=true) {
    $items = self::config()['items'] ?? [];
    return array_key_exists($item, $items) ? !empty($items[$item]) : $default;
  }
  public static function sendToUserIds(array $userIds, $title, $body='', $item='messages', $data=[]) {
    $ids = array_values(array_unique(array_filter(array_map('intval', $userIds))));
    if (!$ids || !self::isEnabled() || !self::itemEnabled($item, true)) return ['sent'=>0,'not_connected'=>0,'failed'=>0];
    $in = implode(',', array_fill(0, count($ids), '?'));
    // همهٔ کاربران انتخاب‌شده خوانده می‌شوند؛ اتصال بله ابتدا با user_id و سپس
    // برای سازگاری با داده‌های قدیمی با شماره همراه پیدا می‌شود.
    $rows = Db::all("SELECT id, phone FROM users WHERE id IN ($in)", $ids);
    $text = trim((string)$title . ((string)$body !== '' ? "\n".(string)$body : ''));
    $out = ['sent'=>0,'not_connected'=>0,'failed'=>0];
    foreach ($rows as $r) {
      $uid = (int)$r['id'];
      $sub = null;
      try {
        $sub = Db::one("SELECT chat_id FROM bale_subscribers WHERE user_id=? AND is_active=1 ORDER BY id DESC LIMIT 1", [$uid]);
      } catch (Throwable $e) {}
      if (!$sub && !empty($r['phone'])) {
        $mobile = self::normalizeMobile($r['phone']);
        if ($mobile) {
          try { $sub = Db::one("SELECT chat_id FROM bale_subscribers WHERE mobile=? AND is_active=1 ORDER BY id DESC LIMIT 1", [$mobile]); } catch (Throwable $e) {}
        }
      }
      if (!$sub || empty($sub['chat_id'])) { $out['not_connected']++; continue; }
      $res = self::sendMessage($sub['chat_id'], $text, ['target_type'=>'user', 'target_id'=>$uid, 'item'=>$item] + (array)$data);
      if (!empty($res['ok'])) $out['sent']++; else $out['failed']++;
    }
    // شناسه‌هایی که در جدول users یافت نشدند نیز به‌عنوان ناموفق ثبت شوند.
    $out['failed'] += max(0, count($ids) - count($rows));
    return $out;
  }
  public static function sendToMobiles(array $mobiles, $text, $item='messages', $targetType=null, $targetId=null) {
    if (!self::isEnabled() || !self::itemEnabled($item, true)) return ['sent'=>0,'not_connected'=>0,'failed'=>0];
    $out = ['sent'=>0,'not_connected'=>0,'failed'=>0];
    foreach (array_values(array_unique($mobiles)) as $m) {
      $res = self::sendToMobile($m, $text, $targetType, $targetId);
      if (!empty($res['ok'])) $out['sent']++;
      elseif (($res['error'] ?? '') === 'not_connected') $out['not_connected']++;
      else $out['failed']++;
    }
    return $out;
  }

  public static function normalizeDigits($s) {
    return strtr((string)$s, ['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9']);
  }
  public static function normalizeMobile($s) {
    $d = preg_replace('/\D+/', '', self::normalizeDigits($s));
    if ($d === '') return null;
    if (strlen($d) === 12 && substr($d,0,2)==='98') $d = '0'.substr($d,2);
    if (strlen($d) === 10 && substr($d,0,1)==='9') $d = '0'.$d;
    return preg_match('/^09\d{9}$/', $d) ? $d : null;
  }
  public static function normalizeNational($s) {
    $d = preg_replace('/\D+/', '', self::normalizeDigits($s));
    if ($d === '') return null;
    return strlen($d) <= 10 ? str_pad($d, 10, '0', STR_PAD_LEFT) : substr($d, -10);
  }
  public static function bindChat($chatId, $text, $fromId=null, $name=null) {
    self::ensureProTables();
    $mobile = self::normalizeMobile($text);
    $national = self::normalizeNational($text);
    $user = null; $driver = null;
    if ($mobile) {
      try { $user = Db::one("SELECT id,first_name,last_name,phone FROM users WHERE phone=? LIMIT 1", [$mobile]); } catch (Throwable $e) {}
      try { $driver = Db::one("SELECT id,first_name,last_name,mobile FROM drivers WHERE mobile=? LIMIT 1", [$mobile]); } catch (Throwable $e) {}
    }
    if (!$user && !$driver && $national) {
      try { $user = Db::one("SELECT id,first_name,last_name,phone FROM users WHERE national_code=? LIMIT 1", [$national]); } catch (Throwable $e) {}
      try { $driver = Db::one("SELECT id,first_name,last_name,mobile FROM drivers WHERE national_id=? OR national_code=? LIMIT 1", [$national, $national]); } catch (Throwable $e) {
        try { $driver = Db::one("SELECT id,first_name,last_name,mobile FROM drivers WHERE national_id=? LIMIT 1", [$national]); } catch (Throwable $e2) {}
      }
      $mobile = self::normalizeMobile(($user['phone'] ?? '') ?: ($driver['mobile'] ?? ''));
    }
    if (!$mobile || (!$user && !$driver)) return ['ok'=>false,'message'=>'شماره همراه یا کد ملی شما در سامانه یافت نشد. لطفاً شماره همراه یا کد ملی ثبت‌شده را ارسال کنید.'];
    Db::run("INSERT INTO bale_subscribers(chat_id,bale_user_id,mobile,user_id,driver_id,display_name,is_active,last_seen_at,created_at)
             VALUES(?,?,?,?,?,?,1,NOW(),NOW())
             ON DUPLICATE KEY UPDATE bale_user_id=VALUES(bale_user_id),mobile=VALUES(mobile),user_id=VALUES(user_id),driver_id=VALUES(driver_id),display_name=VALUES(display_name),is_active=1,last_seen_at=NOW()",
      [$chatId, $fromId, $mobile, $user['id'] ?? null, $driver['id'] ?? null, $name ?: trim(($user['first_name'] ?? $driver['first_name'] ?? '').' '.($user['last_name'] ?? $driver['last_name'] ?? ''))]);
    return ['ok'=>true,'message'=>'اتصال شما با سامانه انجام شد. از منوی ربات استفاده کنید.'];
  }

  private static function subscriber($chatId) {
    try { return Db::one("SELECT * FROM bale_subscribers WHERE chat_id=? AND is_active=1 ORDER BY id DESC LIMIT 1", [$chatId]); } catch (Throwable $e) { return null; }
  }
  private static function driverByNational($national) {
    $national = self::normalizeNational($national);
    if (!$national) return null;
    try { return Db::one("SELECT * FROM drivers WHERE national_id=? OR national_code=? LIMIT 1", [$national, $national]); } catch (Throwable $e) {
      try { return Db::one("SELECT * FROM drivers WHERE national_id=? LIMIT 1", [$national]); } catch (Throwable $e2) { return null; }
    }
  }
  private static function userByNational($national) {
    $national = self::normalizeNational($national);
    if (!$national) return null;
    try { return Db::one("SELECT * FROM users WHERE national_code=? LIMIT 1", [$national]); } catch (Throwable $e) { return null; }
  }
  private static function profileText($sub) {
    if (!$sub) return 'حساب بله شما هنوز به سامانه متصل نشده است. شماره همراه یا کد ملی ثبت‌شده را ارسال کنید.';
    $lines = ['وضعیت اتصال: فعال', 'موبایل: '.$sub['mobile']];
    if (!empty($sub['user_id'])) {
      try { $u=Db::one("SELECT * FROM users WHERE id=?", [$sub['user_id']]); if ($u) $lines[]='کاربر: '.trim(($u['first_name']??'').' '.($u['last_name']??'')); } catch (Throwable $e) {}
    }
    if (!empty($sub['driver_id'])) {
      try { $d=Db::one("SELECT * FROM drivers WHERE id=?", [$sub['driver_id']]); if ($d) {
        $lines[]='راننده: '.trim(($d['first_name']??'').' '.($d['last_name']??''));
        foreach (['national_id'=>'کد ملی','national_code'=>'کد ملی','car_plate'=>'پلاک','plate'=>'پلاک','smart_code'=>'کد هوشمند'] as $k=>$lbl) if (!empty($d[$k])) $lines[]=$lbl.': '.$d[$k];
      }} catch (Throwable $e) {}
    }
    return implode("\n", array_values(array_unique($lines)));
  }

  private static function fieldValueFromDriver($driver, $user, $source) {
    $source = trim((string)$source);
    if ($source === '') return null;
    $map = [
      'driver.full_name' => trim(($driver['first_name'] ?? '').' '.($driver['last_name'] ?? '')),
      'driver.first_name' => $driver['first_name'] ?? null,
      'driver.last_name' => $driver['last_name'] ?? null,
      'driver.mobile' => $driver['mobile'] ?? null,
      'driver.national_code' => $driver['national_id'] ?? ($driver['national_code'] ?? null),
      'driver.plate' => $driver['car_plate'] ?? ($driver['plate'] ?? null),
      'driver.smart_code' => $driver['smart_code'] ?? null,
      'user.full_name' => trim(($user['first_name'] ?? '').' '.($user['last_name'] ?? '')),
      'user.mobile' => $user['phone'] ?? null,
      'user.national_code' => $user['national_code'] ?? null,
    ];
    return $map[$source] ?? null;
  }
  private static function formFields($formId) {
    return Db::all("SELECT * FROM bale_form_fields WHERE form_id=? ORDER BY sort_order,id", [$formId]);
  }
  private static function setSession($chatId, $action, $step, $formId, $payload) {
    Db::run("INSERT INTO bale_chat_sessions(chat_id,action,step,form_id,payload_json,created_at,updated_at)
             VALUES(?,?,?,?,?,NOW(),NOW())
             ON DUPLICATE KEY UPDATE action=VALUES(action),step=VALUES(step),form_id=VALUES(form_id),payload_json=VALUES(payload_json),updated_at=NOW()",
      [$chatId,$action,$step,$formId,json_encode($payload, JSON_UNESCAPED_UNICODE)]);
  }
  private static function clearSession($chatId) { try { Db::run("DELETE FROM bale_chat_sessions WHERE chat_id=?", [$chatId]); } catch (Throwable $e) {} }
  private static function currentSession($chatId) {
    try { $s=Db::one("SELECT * FROM bale_chat_sessions WHERE chat_id=? LIMIT 1", [$chatId]); if ($s) $s['payload']=self::json($s['payload_json'], []); return $s; } catch (Throwable $e) { return null; }
  }
  private static function askNextField($chatId, $form, $payload) {
    $fields = self::formFields($form['id']);
    $idx = (int)($payload['field_index'] ?? 0);
    while ($idx < count($fields)) {
      $f = $fields[$idx];
      $key = $f['field_key'];
      if (($payload['data'][$key] ?? '') !== '') { $idx++; continue; }
      $payload['field_index']=$idx;
      self::setSession($chatId, 'form', 'field', $form['id'], $payload);
      $msg = "فرم: {$form['title']}\n".$f['label'];
      if (!empty($f['is_required'])) $msg .= "\nاجباری";
      return self::sendMessage($chatId, $msg, ['target_type'=>'bale_form'], self::keyboard([['انصراف']]));
    }
    return self::saveSubmission($chatId, $form, $payload);
  }
  private static function saveSubmission($chatId, $form, $payload) {
    $sub = self::subscriber($chatId);
    $data = $payload['data'] ?? [];
    $sid = Db::insert("INSERT INTO bale_form_submissions(form_id,chat_id,subscriber_id,user_id,driver_id,national_code,mobile,data_json,status,created_at)
                       VALUES(?,?,?,?,?,?,?,?,?,NOW())", [
      $form['id'], $chatId, $sub['id'] ?? null, $payload['user_id'] ?? ($sub['user_id'] ?? null), $payload['driver_id'] ?? ($sub['driver_id'] ?? null),
      $payload['national_code'] ?? null, $payload['mobile'] ?? ($sub['mobile'] ?? null), json_encode($data, JSON_UNESCAPED_UNICODE), 'pending'
    ]);
    self::clearSession($chatId);
    $msg = trim((string)($form['success_message'] ?? ''));
    if ($msg === '') $msg = "فرم شما ثبت شد.\nکد پیگیری: ".$sid;
    return self::sendMessage($chatId, $msg, ['target_type'=>'bale_form_submission','target_id'=>$sid], self::mainKeyboard());
  }
  public static function startForm($chatId, $formId) {
    self::ensureProTables();
    $form = Db::one("SELECT * FROM bale_forms WHERE platform='bale' AND id=? AND is_active=1", [(int)$formId]);
    if (!$form) return self::sendMenu($chatId, 'فرم فعال یافت نشد.');
    $payload = ['form_id'=>(int)$form['id'], 'data'=>[], 'field_index'=>0];
    $sub = self::subscriber($chatId);
    if ($sub && !empty($sub['driver_id'])) $payload['driver_id']=(int)$sub['driver_id'];
    if ($sub && !empty($sub['user_id'])) $payload['user_id']=(int)$sub['user_id'];
    if ($sub && !empty($sub['mobile'])) $payload['mobile']=$sub['mobile'];
    if (!empty($form['require_national_code']) && empty($payload['driver_id']) && empty($payload['user_id'])) {
      self::setSession($chatId, 'form', 'national_code', $form['id'], $payload);
      return self::sendMessage($chatId, "برای شروع فرم «{$form['title']}» کد ملی راننده/کاربر را وارد کنید.", ['target_type'=>'bale_form'], self::keyboard([['انصراف']]));
    }
    $driver = !empty($payload['driver_id']) ? Db::one("SELECT * FROM drivers WHERE id=?", [$payload['driver_id']]) : null;
    $user = !empty($payload['user_id']) ? Db::one("SELECT * FROM users WHERE id=?", [$payload['user_id']]) : null;
    foreach (self::formFields($form['id']) as $f) {
      $v = self::fieldValueFromDriver($driver ?: [], $user ?: [], $f['prefill_source'] ?? '');
      if ($v !== null && $v !== '') $payload['data'][$f['field_key']] = $v;
    }
    return self::askNextField($chatId, $form, $payload);
  }
  private static function handleFormSession($chatId, $text, $session) {
    $text = trim((string)$text);
    if ($text === 'انصراف' || $text === '/cancel' || $text === 'لغو') { self::clearSession($chatId); return self::sendMenu($chatId, 'فرایند لغو شد.'); }
    $form = Db::one("SELECT * FROM bale_forms WHERE platform='bale' AND id=? AND is_active=1", [(int)$session['form_id']]);
    if (!$form) { self::clearSession($chatId); return self::sendMenu($chatId, 'فرم فعال نیست.'); }
    $payload = $session['payload'] ?? [];
    if (($session['step'] ?? '') === 'national_code') {
      $national = self::normalizeNational($text);
      $driver = self::driverByNational($national);
      $user = self::userByNational($national);
      if (!$driver && !$user) return self::sendMessage($chatId, 'کد ملی در سامانه یافت نشد. کد ملی صحیح را دوباره وارد کنید یا انصراف را بزنید.', ['target_type'=>'bale_form'], self::keyboard([['انصراف']]));
      $payload['national_code']=$national;
      if ($driver) { $payload['driver_id']=(int)$driver['id']; $payload['mobile']=self::normalizeMobile($driver['mobile'] ?? '') ?: ($payload['mobile'] ?? null); }
      if ($user) { $payload['user_id']=(int)$user['id']; $payload['mobile']=self::normalizeMobile($user['phone'] ?? '') ?: ($payload['mobile'] ?? null); }
      foreach (self::formFields($form['id']) as $f) {
        $v = self::fieldValueFromDriver($driver ?: [], $user ?: [], $f['prefill_source'] ?? '');
        if ($v !== null && $v !== '') $payload['data'][$f['field_key']] = $v;
      }
      return self::askNextField($chatId, $form, $payload);
    }
    $fields = self::formFields($form['id']);
    $idx = (int)($payload['field_index'] ?? 0);
    if (!isset($fields[$idx])) return self::saveSubmission($chatId, $form, $payload);
    $f = $fields[$idx];
    if (!empty($f['is_required']) && $text === '') return self::sendMessage($chatId, 'این مورد اجباری است. مقدار را وارد کنید.', ['target_type'=>'bale_form'], self::keyboard([['انصراف']]));
    $payload['data'][$f['field_key']] = $text;
    $payload['field_index'] = $idx + 1;
    return self::askNextField($chatId, $form, $payload);
  }
  private static function listForms($chatId) {
    self::ensureProTables();
    $forms = Db::all("SELECT id,title,description FROM bale_forms WHERE platform='bale' AND is_active=1 ORDER BY sort_order,id LIMIT 20");
    if (!$forms) return self::sendMenu($chatId, 'فرم فعالی تعریف نشده است.');
    if (count($forms) === 1) return self::startForm($chatId, $forms[0]['id']);
    $rows = [];
    foreach ($forms as $f) $rows[] = [$f['title']];
    $rows[] = ['منو'];
    return self::sendMessage($chatId, "فرم موردنظر را انتخاب کنید:", ['target_type'=>'bale_forms'], self::keyboard($rows));
  }
  private static function customReply($chatId, $text) {
    if (!self::itemEnabled('custom_replies', true)) return false;
    self::ensureProTables();
    $rows = Db::all("SELECT * FROM bale_custom_replies WHERE platform='bale' AND is_active=1 ORDER BY sort_order,id LIMIT 100");
    $norm = mb_strtolower(trim($text), 'UTF-8');
    foreach ($rows as $r) {
      $t = mb_strtolower(trim($r['trigger_text']), 'UTF-8');
      if ($t === '') continue;
      $ok = false;
      if ($r['match_type'] === 'contains') $ok = mb_strpos($norm, $t, 0, 'UTF-8') !== false;
      elseif ($r['match_type'] === 'starts_with') $ok = mb_substr($norm, 0, mb_strlen($t, 'UTF-8'), 'UTF-8') === $t;
      else $ok = $norm === $t;
      if ($ok) { self::sendMessage($chatId, $r['response_text'], ['target_type'=>'bale_custom_reply','target_id'=>$r['id']], self::mainKeyboard()); return true; }
    }
    return false;
  }
  private static function menuItem($chatId, $text) {
    self::ensureProTables();
    $it = Db::one("SELECT * FROM bale_menu_items WHERE platform='bale' AND is_active=1 AND title=? LIMIT 1", [$text]);
    if (!$it) return false;
    if ($it['action_type'] === 'form' && !empty($it['form_id'])) { self::startForm($chatId, (int)$it['form_id']); return true; }
    if ($it['action_type'] === 'profile') { self::sendMessage($chatId, self::profileText(self::subscriber($chatId)), ['target_type'=>'bale_profile'], self::mainKeyboard()); return true; }
    if ($it['action_type'] === 'forms') { self::listForms($chatId); return true; }
    if ($it['action_type'] === 'help') { self::sendMessage($chatId, self::helpText(), ['target_type'=>'bale_help'], self::mainKeyboard()); return true; }
    self::sendMessage($chatId, trim((string)$it['action_payload']) ?: 'گزینه انتخاب شد.', ['target_type'=>'bale_menu_item','target_id'=>$it['id']], self::mainKeyboard());
    return true;
  }
  private static function helpText() {
    return "دستورهای ربات:\n/start شروع و نمایش منو\n/menu نمایش منو\nثبت‌نام نمایش فرم‌ها\nاطلاعات من نمایش اتصال حساب\n/stop قطع اتصال\n/cancel لغو فرایند جاری\nبرای اتصال حساب، شماره همراه یا کد ملی ثبت‌شده را ارسال کنید.";
  }
  public static function processMessage($msg) {
    self::ensureProTables();
    $chatId = $msg['chat']['id'] ?? null;
    $fromId = $msg['from']['id'] ?? null;
    $name = trim(($msg['from']['first_name'] ?? '').' '.($msg['from']['last_name'] ?? ''));
    $text = trim((string)($msg['text'] ?? ''));
    if (!$chatId) return ['ok'=>true,'ignored'=>true];
    try { Db::run("UPDATE bale_subscribers SET last_seen_at=NOW() WHERE chat_id=?", [$chatId]); } catch (Throwable $e) {}
    try { Db::run("INSERT INTO bale_bot_events(chat_id,event_type,input_text,payload_json,created_at) VALUES(?,?,?,?,NOW())", [$chatId,'incoming',$text,json_encode($msg,JSON_UNESCAPED_UNICODE)]); } catch (Throwable $e) {}
    if ($text === '') { self::sendMenu($chatId, 'پیام متنی دریافت نشد.'); return ['ok'=>true,'action'=>'empty']; }
    $session = self::currentSession($chatId);
    if ($session && ($session['action'] ?? '') === 'form') { self::handleFormSession($chatId, $text, $session); return ['ok'=>true,'action'=>'form_session']; }
    if (in_array($text, ['/start','start','شروع'], true)) { self::sendMessage($chatId, self::config()['welcome'], ['target_type'=>'bale_welcome'], self::mainKeyboard()); return ['ok'=>true,'action'=>'welcome']; }
    if (in_array($text, ['/help','راهنما','کمک'], true)) { self::sendMessage($chatId, self::helpText(), ['target_type'=>'bale_help'], self::mainKeyboard()); return ['ok'=>true,'action'=>'help']; }
    if (in_array($text, ['/menu','منو','بازگشت'], true)) { self::sendMenu($chatId); return ['ok'=>true,'action'=>'menu']; }
    if (in_array($text, ['/stop','قطع','قطع اتصال'], true)) { Db::run("UPDATE bale_subscribers SET is_active=0 WHERE chat_id=?", [$chatId]); self::sendMessage($chatId, 'ارسال پیام‌های سامانه برای این حساب بله غیرفعال شد.'); return ['ok'=>true,'action'=>'stop']; }
    if (in_array($text, ['ثبت نام','ثبت‌نام','فرم','فرم‌ها'], true)) { self::listForms($chatId); return ['ok'=>true,'action'=>'forms']; }
    if ($text === 'اطلاعات من') { self::sendMessage($chatId, self::profileText(self::subscriber($chatId)), ['target_type'=>'bale_profile'], self::mainKeyboard()); return ['ok'=>true,'action'=>'profile']; }
    $form = Db::one("SELECT id FROM bale_forms WHERE platform='bale' AND is_active=1 AND title=? LIMIT 1", [$text]);
    if ($form) { self::startForm($chatId, (int)$form['id']); return ['ok'=>true,'action'=>'form_start']; }
    if (self::menuItem($chatId, $text)) return ['ok'=>true,'action'=>'menu_item'];
    if (preg_match('/^[\d۰-۹٠-٩\s+\-]{8,}$/u', $text)) { $bind = self::bindChat($chatId, $text, $fromId, $name); self::sendMessage($chatId, $bind['message'] ?? 'درخواست دریافت شد.', ['target_type'=>'bale_bind'], self::mainKeyboard()); return ['ok'=>true,'action'=>'bind','bound'=>!empty($bind['ok'])]; }
    if (self::customReply($chatId, $text)) return ['ok'=>true,'action'=>'custom_reply'];
    self::sendMenu($chatId, 'دستور شناخته نشد. از منوی ربات استفاده کنید.');
    return ['ok'=>true,'action'=>'fallback'];
  }
}
