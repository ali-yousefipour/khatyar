<?php
/**
 * Generic messenger bot engine for Telegram and Eitaa.
 * Bale keeps its existing class for backward compatibility, while this engine
 * uses the same menu, custom-reply and form definitions for all messengers.
 */
class MessengerBot {
  public static function platforms() { return ['telegram','eitaa']; }
  public static function validPlatform($platform) { return in_array((string)$platform, self::platforms(), true); }
  private static function setting($key, $default=null) {
    try { $r = Db::one("SELECT value FROM app_settings WHERE `key`=?", [$key]); if ($r) { $v=json_decode($r['value'], true); return $v === null ? $default : $v; } } catch (Throwable $e) {}
    return $default;
  }
  private static function json($v, $default=[]) { if (is_array($v)) return $v; $j=json_decode((string)$v, true); return is_array($j)?$j:$default; }
  public static function label($platform) { return $platform==='telegram' ? 'تلگرام' : ($platform==='eitaa' ? 'ایتا' : $platform); }
  public static function config($platform) {
    $platform = (string)$platform;
    $defBase = $platform==='telegram' ? 'https://api.telegram.org' : 'https://eitaayar.ir/api';
    $defMode = $platform==='telegram' ? 'bot_token_method' : 'token_method';
    return [
      'platform'=>$platform,
      'label'=>self::label($platform),
      'enabled'=>(bool)self::setting($platform.'_enabled', false),
      'token'=>(string)self::setting($platform.'_bot_token', ''),
      'api_base'=>rtrim((string)self::setting($platform.'_api_base', $defBase), '/'),
      'api_mode'=>(string)self::setting($platform.'_api_mode', $defMode),
      'webhook_secret'=>(string)self::setting($platform.'_webhook_secret', ''),
      'welcome'=>(string)self::setting($platform.'_welcome_text', "سلام. به ربات سامانه تاکسیرانی خوش آمدید.\nاز منوی پایین استفاده کنید یا شماره همراه/کد ملی ثبت‌شده در سامانه را ارسال نمایید."),
      'items'=>self::setting($platform.'_enabled_items', ['messages'=>true,'birthday'=>true,'attendance'=>true,'bills'=>true,'warnings'=>true,'bot_forms'=>true,'custom_replies'=>true]),
    ];
  }
  public static function isEnabled($platform) { $c=self::config($platform); return self::validPlatform($platform) && !empty($c['enabled']) && $c['token']!==''; }
  private static function url($platform, $method) {
    $c=self::config($platform); $base=$c['api_base']; $token=rawurlencode($c['token']); $method=trim($method, '/');
    if (($c['api_mode'] ?? '') === 'token_method') return $base.'/'.$token.'/'.$method;
    if (($c['api_mode'] ?? '') === 'query_token') return $base.'/'.$method.'?token='.$token;
    return $base.'/bot'.$token.'/'.$method;
  }
  public static function ensureTables() {
    try {
      if (class_exists('BaleBot')) BaleBot::ensureProTables();
      Db::run("CREATE TABLE IF NOT EXISTS messenger_subscribers (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        platform VARCHAR(30) NOT NULL,
        chat_id VARCHAR(120) NOT NULL,
        platform_user_id VARCHAR(120) NULL,
        mobile VARCHAR(20) NULL,
        user_id BIGINT NULL,
        driver_id BIGINT NULL,
        display_name VARCHAR(191) NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        last_seen_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL,
        UNIQUE KEY uq_messenger_chat(platform,chat_id),
        INDEX idx_messenger_mobile(platform,mobile),
        INDEX idx_messenger_user(platform,user_id),
        INDEX idx_messenger_driver(platform,driver_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
      Db::run("CREATE TABLE IF NOT EXISTS messenger_message_log (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        platform VARCHAR(30) NOT NULL,
        target_type VARCHAR(60) NULL,
        target_id BIGINT NULL,
        chat_id VARCHAR(120) NULL,
        body TEXT NULL,
        status VARCHAR(30) NOT NULL,
        response JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_messenger_msg_platform(platform,created_at),
        INDEX idx_messenger_msg_target(platform,target_type,target_id),
        INDEX idx_messenger_msg_status(platform,status,created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
      Db::run("CREATE TABLE IF NOT EXISTS messenger_chat_sessions (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        platform VARCHAR(30) NOT NULL,
        chat_id VARCHAR(120) NOT NULL,
        action VARCHAR(40) NOT NULL,
        step VARCHAR(80) NULL,
        form_id BIGINT NULL,
        payload_json JSON NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_messenger_session(platform,chat_id),
        INDEX idx_messenger_session_action(platform,action,updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
      Db::run("CREATE TABLE IF NOT EXISTS messenger_form_submissions (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        platform VARCHAR(30) NOT NULL,
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
        INDEX idx_messenger_sub_platform(platform,created_at),
        INDEX idx_messenger_sub_form(platform,form_id,created_at),
        INDEX idx_messenger_sub_status(platform,status,created_at),
        INDEX idx_messenger_sub_driver(platform,driver_id),
        INDEX idx_messenger_sub_user(platform,user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
      Db::run("CREATE TABLE IF NOT EXISTS messenger_bot_events (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        platform VARCHAR(30) NOT NULL,
        chat_id VARCHAR(120) NULL,
        event_type VARCHAR(60) NOT NULL,
        input_text TEXT NULL,
        payload_json JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_messenger_event_platform(platform,created_at),
        INDEX idx_messenger_event_type(platform,event_type,created_at),
        INDEX idx_messenger_event_chat(platform,chat_id,created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    } catch (Throwable $e) {}
  }
  public static function request($platform, $method, $payload=[], $requireEnabled=true) {
    if ($requireEnabled && !self::isEnabled($platform)) return ['ok'=>false,'error'=>$platform.'_disabled'];
    $ch = curl_init(self::url($platform, $method));
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_POST=>true, CURLOPT_HTTPHEADER=>['Content-Type: application/json; charset=utf-8'], CURLOPT_POSTFIELDS=>json_encode($payload, JSON_UNESCAPED_UNICODE), CURLOPT_CONNECTTIMEOUT=>8, CURLOPT_TIMEOUT=>15]);
    $raw = curl_exec($ch); $err = curl_error($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    if ($raw === false) return ['ok'=>false,'error'=>$err ?: 'curl_error','http_code'=>$code];
    $json = json_decode($raw, true);
    if (is_array($json)) return $json + ['http_code'=>$code];
    return ['ok'=>($code>=200 && $code<300), 'raw'=>$raw, 'http_code'=>$code];
  }
  public static function sendMessage($platform, $chatId, $text, $data=[], $replyMarkup=null) {
    self::ensureTables(); $chatId=trim((string)$chatId); $text=trim((string)$text);
    if ($chatId==='' || $text==='') return ['ok'=>false,'error'=>'empty_chat_or_text'];
    $payload=['chat_id'=>$chatId, 'text'=>$text]; if (is_array($replyMarkup)) $payload['reply_markup']=$replyMarkup;
    $res=self::request($platform, 'sendMessage', $payload);
    try { Db::run("INSERT INTO messenger_message_log(platform,target_type,target_id,chat_id,body,status,response,created_at) VALUES(?,?,?,?,?,?,?,NOW())", [(string)$platform,$data['target_type']??null,$data['target_id']??null,$chatId,$text,!empty($res['ok'])?'sent':'failed',json_encode($res,JSON_UNESCAPED_UNICODE)]); } catch(Throwable $e) {}
    if (empty($res['ok']) && class_exists('DeliveryQueue')) { try { DeliveryQueue::enqueue($platform, $data['mobile'] ?? $chatId, '', $text, $data, $data['target_type'] ?? $platform, $data['target_id'] ?? null); } catch(Throwable $e) {} }
    return $res;
  }
  public static function keyboard($buttons) { $rows=[]; foreach($buttons as $row){ $r=[]; foreach((array)$row as $b) $r[]=['text'=>(string)$b]; if($r) $rows[]=$r; } return ['keyboard'=>$rows,'resize_keyboard'=>true,'one_time_keyboard'=>false]; }
  public static function mainKeyboard($platform) {
    self::ensureTables(); $rows=[['ثبت‌نام','اطلاعات من'], ['راهنما','قطع اتصال']];
    try { $items=Db::all("SELECT title FROM bale_menu_items WHERE platform=? AND is_active=1 ORDER BY sort_order,id LIMIT 20",[$platform]); $buf=[]; foreach($items as $it){$buf[]=$it['title']; if(count($buf)===2){$rows[]=$buf; $buf=[];}} if($buf)$rows[]=$buf; } catch(Throwable $e) {}
    return self::keyboard($rows);
  }
  public static function sendMenu($platform, $chatId, $text=null) { return self::sendMessage($platform, $chatId, $text ?: 'منوی ربات سامانه تاکسیرانی', ['target_type'=>'messenger_menu'], self::mainKeyboard($platform)); }
  public static function itemEnabled($platform, $item, $default=true) { $items=self::config($platform)['items'] ?? []; return array_key_exists($item,$items)?!empty($items[$item]):$default; }
  public static function normalizeDigits($s) { return strtr((string)$s, ['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9']); }
  public static function normalizeMobile($s) { $d=preg_replace('/\D+/', '', self::normalizeDigits($s)); if($d==='')return null; if(strlen($d)===12&&substr($d,0,2)==='98')$d='0'.substr($d,2); if(strlen($d)===10&&substr($d,0,1)==='9')$d='0'.$d; return preg_match('/^09\d{9}$/',$d)?$d:null; }
  public static function normalizeNational($s) { $d=preg_replace('/\D+/', '', self::normalizeDigits($s)); if($d==='')return null; return strlen($d)<=10 ? str_pad($d,10,'0',STR_PAD_LEFT) : substr($d,-10); }
  public static function sendToMobile($platform, $mobile, $text, $targetType=null, $targetId=null, $item='messages') {
    self::ensureTables(); $mobile=self::normalizeMobile($mobile); if(!$mobile) return ['ok'=>false,'error'=>'invalid_mobile'];
    if (!self::isEnabled($platform) || !self::itemEnabled($platform, $item, true)) return ['ok'=>false,'error'=>$platform.'_disabled'];
    $sub=Db::one("SELECT chat_id FROM messenger_subscribers WHERE platform=? AND mobile=? AND is_active=1 ORDER BY id DESC LIMIT 1", [$platform,$mobile]);
    if(!$sub) return ['ok'=>false,'error'=>'not_connected'];
    return self::sendMessage($platform, $sub['chat_id'], $text, ['target_type'=>$targetType,'target_id'=>$targetId,'mobile'=>$mobile]);
  }
  public static function sendToMobiles($platform, array $mobiles, $text, $item='messages', $targetType=null, $targetId=null) {
    if (!self::isEnabled($platform) || !self::itemEnabled($platform,$item,true)) return ['sent'=>0,'not_connected'=>0,'failed'=>0];
    $out=['sent'=>0,'not_connected'=>0,'failed'=>0];
    foreach(array_values(array_unique($mobiles)) as $m){ $res=self::sendToMobile($platform,$m,$text,$targetType,$targetId,$item); if(!empty($res['ok']))$out['sent']++; elseif(($res['error']??'')==='not_connected')$out['not_connected']++; else $out['failed']++; }
    return $out;
  }
  public static function sendToUserIds($platform, array $userIds, $title, $body='', $item='messages', $data=[]) {
    $ids=array_values(array_unique(array_filter(array_map('intval',$userIds)))); if(!$ids || !self::isEnabled($platform) || !self::itemEnabled($platform,$item,true)) return ['sent'=>0,'not_connected'=>0,'failed'=>0];
    $in=implode(',', array_fill(0,count($ids),'?')); $rows=Db::all("SELECT id, phone FROM users WHERE id IN ($in) AND phone IS NOT NULL AND phone<>''", $ids); $text=trim((string)$title.((string)$body!==''?"\n".(string)$body:'')); $out=['sent'=>0,'not_connected'=>0,'failed'=>0];
    foreach($rows as $r){ $res=self::sendToMobile($platform,$r['phone'],$text,'user',(int)$r['id'],$item); if(!empty($res['ok']))$out['sent']++; elseif(($res['error']??'')==='not_connected')$out['not_connected']++; else $out['failed']++; }
    return $out;
  }
  public static function bindChat($platform, $chatId, $text, $fromId=null, $name=null) {
    self::ensureTables(); $mobile=self::normalizeMobile($text); $national=self::normalizeNational($text); $user=null; $driver=null;
    if($mobile){ try{$user=Db::one("SELECT id,first_name,last_name,phone FROM users WHERE phone=? LIMIT 1",[$mobile]);}catch(Throwable $e){} try{$driver=Db::one("SELECT id,first_name,last_name,mobile FROM drivers WHERE mobile=? LIMIT 1",[$mobile]);}catch(Throwable $e){} }
    if(!$user && !$driver && $national){ try{$user=Db::one("SELECT id,first_name,last_name,phone FROM users WHERE national_code=? LIMIT 1",[$national]);}catch(Throwable $e){} try{$driver=Db::one("SELECT id,first_name,last_name,mobile FROM drivers WHERE national_id=? OR national_code=? LIMIT 1",[$national,$national]);}catch(Throwable $e){ try{$driver=Db::one("SELECT id,first_name,last_name,mobile FROM drivers WHERE national_id=? LIMIT 1",[$national]);}catch(Throwable $e2){} } $mobile=self::normalizeMobile(($user['phone']??'') ?: ($driver['mobile']??'')); }
    if(!$mobile || (!$user && !$driver)) return ['ok'=>false,'message'=>'شماره همراه یا کد ملی شما در سامانه یافت نشد. لطفاً شماره همراه یا کد ملی ثبت‌شده را ارسال کنید.'];
    Db::run("INSERT INTO messenger_subscribers(platform,chat_id,platform_user_id,mobile,user_id,driver_id,display_name,is_active,last_seen_at,created_at)
      VALUES(?,?,?,?,?,?,?,1,NOW(),NOW())
      ON DUPLICATE KEY UPDATE platform_user_id=VALUES(platform_user_id),mobile=VALUES(mobile),user_id=VALUES(user_id),driver_id=VALUES(driver_id),display_name=VALUES(display_name),is_active=1,last_seen_at=NOW()", [$platform,$chatId,$fromId,$mobile,$user['id']??null,$driver['id']??null,$name ?: trim(($user['first_name']??$driver['first_name']??'').' '.($user['last_name']??$driver['last_name']??''))]);
    return ['ok'=>true,'message'=>'اتصال شما با سامانه انجام شد. از منوی ربات استفاده کنید.'];
  }
  private static function subscriber($platform,$chatId) { try{return Db::one("SELECT * FROM messenger_subscribers WHERE platform=? AND chat_id=? AND is_active=1 ORDER BY id DESC LIMIT 1",[$platform,$chatId]);}catch(Throwable $e){return null;} }
  private static function driverByNational($national) { $national=self::normalizeNational($national); if(!$national)return null; try{return Db::one("SELECT * FROM drivers WHERE national_id=? OR national_code=? LIMIT 1",[$national,$national]);}catch(Throwable $e){ try{return Db::one("SELECT * FROM drivers WHERE national_id=? LIMIT 1",[$national]);}catch(Throwable $e2){return null;} } }
  private static function userByNational($national) { $national=self::normalizeNational($national); if(!$national)return null; try{return Db::one("SELECT * FROM users WHERE national_code=? LIMIT 1",[$national]);}catch(Throwable $e){return null;} }
  private static function profileText($platform,$sub) {
    if(!$sub) return 'حساب شما هنوز به سامانه متصل نشده است. شماره همراه یا کد ملی ثبت‌شده را ارسال کنید.';
    $lines=['وضعیت اتصال: فعال','پیام‌رسان: '.self::label($platform),'موبایل: '.$sub['mobile']];
    if(!empty($sub['user_id'])){ try{$u=Db::one("SELECT * FROM users WHERE id=?",[$sub['user_id']]); if($u)$lines[]='کاربر: '.trim(($u['first_name']??'').' '.($u['last_name']??''));}catch(Throwable $e){} }
    if(!empty($sub['driver_id'])){ try{$d=Db::one("SELECT * FROM drivers WHERE id=?",[$sub['driver_id']]); if($d){ $lines[]='راننده: '.trim(($d['first_name']??'').' '.($d['last_name']??'')); foreach(['national_id'=>'کد ملی','national_code'=>'کد ملی','car_plate'=>'پلاک','plate'=>'پلاک','smart_code'=>'کد هوشمند'] as $k=>$lbl) if(!empty($d[$k]))$lines[]=$lbl.': '.$d[$k]; }}catch(Throwable $e){} }
    return implode("\n", array_values(array_unique($lines)));
  }
  private static function fieldValueFromDriver($driver,$user,$source) { $source=trim((string)$source); if($source==='')return null; $map=['driver.full_name'=>trim(($driver['first_name']??'').' '.($driver['last_name']??'')),'driver.first_name'=>$driver['first_name']??null,'driver.last_name'=>$driver['last_name']??null,'driver.mobile'=>$driver['mobile']??null,'driver.national_code'=>$driver['national_id']??($driver['national_code']??null),'driver.plate'=>$driver['car_plate']??($driver['plate']??null),'driver.smart_code'=>$driver['smart_code']??null,'user.full_name'=>trim(($user['first_name']??'').' '.($user['last_name']??'')),'user.mobile'=>$user['phone']??null,'user.national_code'=>$user['national_code']??null]; return $map[$source]??null; }
  private static function formFields($formId) { return Db::all("SELECT * FROM bale_form_fields WHERE form_id=? ORDER BY sort_order,id",[$formId]); }
  private static function setSession($platform,$chatId,$action,$step,$formId,$payload) { Db::run("INSERT INTO messenger_chat_sessions(platform,chat_id,action,step,form_id,payload_json,created_at,updated_at) VALUES(?,?,?,?,?,?,NOW(),NOW()) ON DUPLICATE KEY UPDATE action=VALUES(action),step=VALUES(step),form_id=VALUES(form_id),payload_json=VALUES(payload_json),updated_at=NOW()",[$platform,$chatId,$action,$step,$formId,json_encode($payload,JSON_UNESCAPED_UNICODE)]); }
  private static function clearSession($platform,$chatId){ try{Db::run("DELETE FROM messenger_chat_sessions WHERE platform=? AND chat_id=?",[$platform,$chatId]);}catch(Throwable $e){} }
  private static function currentSession($platform,$chatId){ try{$s=Db::one("SELECT * FROM messenger_chat_sessions WHERE platform=? AND chat_id=? LIMIT 1",[$platform,$chatId]); if($s)$s['payload']=self::json($s['payload_json'],[]); return $s;}catch(Throwable $e){return null;} }
  private static function askNextField($platform,$chatId,$form,$payload){ $fields=self::formFields($form['id']); $idx=(int)($payload['field_index']??0); while($idx<count($fields)){ $f=$fields[$idx]; $key=$f['field_key']; if(($payload['data'][$key]??'')!==''){ $idx++; continue; } $payload['field_index']=$idx; self::setSession($platform,$chatId,'form','field',$form['id'],$payload); $msg="فرم: {$form['title']}\n".$f['label']; if(!empty($f['is_required']))$msg.="\nاجباری"; return self::sendMessage($platform,$chatId,$msg,['target_type'=>'messenger_form'],self::keyboard([['انصراف']])); } return self::saveSubmission($platform,$chatId,$form,$payload); }
  private static function saveSubmission($platform,$chatId,$form,$payload){ $sub=self::subscriber($platform,$chatId); $data=$payload['data']??[]; $sid=Db::insert("INSERT INTO messenger_form_submissions(platform,form_id,chat_id,subscriber_id,user_id,driver_id,national_code,mobile,data_json,status,created_at) VALUES(?,?,?,?,?,?,?,?,?, 'pending', NOW())",[$platform,$form['id'],$chatId,$sub['id']??null,$payload['user_id']??($sub['user_id']??null),$payload['driver_id']??($sub['driver_id']??null),$payload['national_code']??null,$payload['mobile']??($sub['mobile']??null),json_encode($data,JSON_UNESCAPED_UNICODE)]); self::clearSession($platform,$chatId); $msg=trim((string)($form['success_message']??'')); if($msg==='')$msg="فرم شما ثبت شد.\nکد پیگیری: ".$sid; return self::sendMessage($platform,$chatId,$msg,['target_type'=>'messenger_form_submission','target_id'=>$sid],self::mainKeyboard($platform)); }
  public static function startForm($platform,$chatId,$formId){ self::ensureTables(); $form=Db::one("SELECT * FROM bale_forms WHERE id=? AND is_active=1",[(int)$formId]); if(!$form)return self::sendMenu($platform,$chatId,'فرم فعال یافت نشد.'); $payload=['form_id'=>(int)$form['id'],'data'=>[],'field_index'=>0]; $sub=self::subscriber($platform,$chatId); if($sub&&!empty($sub['driver_id']))$payload['driver_id']=(int)$sub['driver_id']; if($sub&&!empty($sub['user_id']))$payload['user_id']=(int)$sub['user_id']; if($sub&&!empty($sub['mobile']))$payload['mobile']=$sub['mobile']; if(!empty($form['require_national_code'])&&empty($payload['driver_id'])&&empty($payload['user_id'])){ self::setSession($platform,$chatId,'form','national_code',$form['id'],$payload); return self::sendMessage($platform,$chatId,"برای شروع فرم «{$form['title']}» کد ملی راننده/کاربر را وارد کنید.",['target_type'=>'messenger_form'],self::keyboard([['انصراف']])); } $driver=!empty($payload['driver_id'])?Db::one("SELECT * FROM drivers WHERE id=?",[$payload['driver_id']]):null; $user=!empty($payload['user_id'])?Db::one("SELECT * FROM users WHERE id=?",[$payload['user_id']]):null; foreach(self::formFields($form['id']) as $f){ $v=self::fieldValueFromDriver($driver?:[],$user?:[],$f['prefill_source']??''); if($v!==null&&$v!=='')$payload['data'][$f['field_key']]=$v; } return self::askNextField($platform,$chatId,$form,$payload); }
  private static function handleFormSession($platform,$chatId,$text,$session){ $text=trim((string)$text); if($text==='انصراف'||$text==='/cancel'||$text==='لغو'){ self::clearSession($platform,$chatId); return self::sendMenu($platform,$chatId,'فرایند لغو شد.'); } $form=Db::one("SELECT * FROM bale_forms WHERE id=? AND is_active=1",[(int)$session['form_id']]); if(!$form){ self::clearSession($platform,$chatId); return self::sendMenu($platform,$chatId,'فرم فعال نیست.'); } $payload=$session['payload']??[]; if(($session['step']??'')==='national_code'){ $national=self::normalizeNational($text); $driver=self::driverByNational($national); $user=self::userByNational($national); if(!$driver&&!$user)return self::sendMessage($platform,$chatId,'کد ملی در سامانه یافت نشد. کد ملی صحیح را دوباره وارد کنید یا انصراف را بزنید.',['target_type'=>'messenger_form'],self::keyboard([['انصراف']])); $payload['national_code']=$national; if($driver){$payload['driver_id']=(int)$driver['id'];$payload['mobile']=self::normalizeMobile($driver['mobile']??'')?:($payload['mobile']??null);} if($user){$payload['user_id']=(int)$user['id'];$payload['mobile']=self::normalizeMobile($user['phone']??'')?:($payload['mobile']??null);} foreach(self::formFields($form['id']) as $f){$v=self::fieldValueFromDriver($driver?:[],$user?:[],$f['prefill_source']??''); if($v!==null&&$v!=='')$payload['data'][$f['field_key']]=$v;} return self::askNextField($platform,$chatId,$form,$payload); } $fields=self::formFields($form['id']); $idx=(int)($payload['field_index']??0); if(!isset($fields[$idx])) return self::saveSubmission($platform,$chatId,$form,$payload); $f=$fields[$idx]; if(!empty($f['is_required'])&&$text==='')return self::sendMessage($platform,$chatId,'این مورد اجباری است. مقدار را وارد کنید.',['target_type'=>'messenger_form'],self::keyboard([['انصراف']])); $payload['data'][$f['field_key']]=$text; $payload['field_index']=$idx+1; return self::askNextField($platform,$chatId,$form,$payload); }
  private static function listForms($platform,$chatId){ self::ensureTables(); $forms=Db::all("SELECT id,title,description FROM bale_forms WHERE platform=? AND is_active=1 ORDER BY sort_order,id LIMIT 20",[$platform]); if(!$forms)return self::sendMenu($platform,$chatId,'فرم فعالی تعریف نشده است.'); if(count($forms)===1)return self::startForm($platform,$chatId,$forms[0]['id']); $rows=[]; foreach($forms as $f)$rows[]=[$f['title']]; $rows[]=['منو']; return self::sendMessage($platform,$chatId,'فرم موردنظر را انتخاب کنید:',['target_type'=>'messenger_forms'],self::keyboard($rows)); }
  private static function customReply($platform,$chatId,$text){ if(!self::itemEnabled($platform,'custom_replies',true))return false; self::ensureTables(); $rows=Db::all("SELECT * FROM bale_custom_replies WHERE platform=? AND is_active=1 ORDER BY sort_order,id LIMIT 100",[$platform]); $norm=mb_strtolower(trim($text),'UTF-8'); foreach($rows as $r){$t=mb_strtolower(trim($r['trigger_text']),'UTF-8'); if($t==='')continue; $ok=false; if($r['match_type']==='contains')$ok=mb_strpos($norm,$t,0,'UTF-8')!==false; elseif($r['match_type']==='starts_with')$ok=mb_substr($norm,0,mb_strlen($t,'UTF-8'),'UTF-8')===$t; else $ok=$norm===$t; if($ok){ self::sendMessage($platform,$chatId,$r['response_text'],['target_type'=>'messenger_custom_reply','target_id'=>$r['id']],self::mainKeyboard($platform)); return true; }} return false; }
  private static function menuItem($platform,$chatId,$text){ self::ensureTables(); $it=Db::one("SELECT * FROM bale_menu_items WHERE platform=? AND is_active=1 AND title=? LIMIT 1",[$platform,$text]); if(!$it)return false; if($it['action_type']==='form'&&!empty($it['form_id'])){ self::startForm($platform,$chatId,(int)$it['form_id']); return true; } if($it['action_type']==='profile'){ self::sendMessage($platform,$chatId,self::profileText($platform,self::subscriber($platform,$chatId)),['target_type'=>'messenger_profile'],self::mainKeyboard($platform)); return true; } if($it['action_type']==='forms'){ self::listForms($platform,$chatId); return true; } if($it['action_type']==='help'){ self::sendMessage($platform,$chatId,self::helpText($platform),['target_type'=>'messenger_help'],self::mainKeyboard($platform)); return true; } self::sendMessage($platform,$chatId,trim((string)$it['action_payload'])?:'گزینه انتخاب شد.',['target_type'=>'messenger_menu_item','target_id'=>$it['id']],self::mainKeyboard($platform)); return true; }
  private static function helpText($platform){ return "دستورهای ربات «".self::label($platform)."»:\n/start شروع و نمایش منو\n/menu نمایش منو\nثبت‌نام نمایش فرم‌ها\nاطلاعات من نمایش اتصال حساب\n/stop قطع اتصال\n/cancel لغو فرایند جاری\nبرای اتصال حساب، شماره همراه یا کد ملی ثبت‌شده را ارسال کنید."; }
  public static function extractMessage($update) { if(isset($update['message'])) return $update['message']; if(isset($update['edited_message'])) return $update['edited_message']; if(isset($update['callback_query'])) { $m=$update['callback_query']['message'] ?? []; $m['text']=$update['callback_query']['data'] ?? ($m['text'] ?? ''); $m['from']=$update['callback_query']['from'] ?? ($m['from'] ?? []); return $m; } return $update; }
  public static function processUpdate($platform,$update){ return self::processMessage($platform,self::extractMessage($update)); }
  public static function processMessage($platform,$msg){ self::ensureTables(); if(!self::validPlatform($platform))return ['ok'=>false,'error'=>'invalid_platform']; $chatId=$msg['chat']['id'] ?? null; $fromId=$msg['from']['id'] ?? null; $name=trim(($msg['from']['first_name']??'').' '.($msg['from']['last_name']??'')); $text=trim((string)($msg['text']??'')); if(!$chatId)return ['ok'=>true,'ignored'=>true]; try{Db::run("UPDATE messenger_subscribers SET last_seen_at=NOW() WHERE platform=? AND chat_id=?",[$platform,$chatId]);}catch(Throwable $e){} try{Db::run("INSERT INTO messenger_bot_events(platform,chat_id,event_type,input_text,payload_json,created_at) VALUES(?,?,?,?,?,NOW())",[$platform,$chatId,'incoming',$text,json_encode($msg,JSON_UNESCAPED_UNICODE)]);}catch(Throwable $e){} if($text===''){ self::sendMenu($platform,$chatId,'پیام متنی دریافت نشد.'); return ['ok'=>true,'action'=>'empty']; } $session=self::currentSession($platform,$chatId); if($session&&($session['action']??'')==='form'){ self::handleFormSession($platform,$chatId,$text,$session); return ['ok'=>true,'action'=>'form_session']; } if(in_array($text,['/start','start','شروع'],true)){ self::sendMessage($platform,$chatId,self::config($platform)['welcome'],['target_type'=>'messenger_welcome'],self::mainKeyboard($platform)); return ['ok'=>true,'action'=>'welcome']; } if(in_array($text,['/help','راهنما','کمک'],true)){ self::sendMessage($platform,$chatId,self::helpText($platform),['target_type'=>'messenger_help'],self::mainKeyboard($platform)); return ['ok'=>true,'action'=>'help']; } if(in_array($text,['/menu','منو','بازگشت'],true)){ self::sendMenu($platform,$chatId); return ['ok'=>true,'action'=>'menu']; } if(in_array($text,['/stop','قطع','قطع اتصال'],true)){ Db::run("UPDATE messenger_subscribers SET is_active=0 WHERE platform=? AND chat_id=?",[$platform,$chatId]); self::sendMessage($platform,$chatId,'ارسال پیام‌های سامانه برای این حساب غیرفعال شد.'); return ['ok'=>true,'action'=>'stop']; } if(in_array($text,['ثبت نام','ثبت‌نام','فرم','فرم‌ها'],true)){ self::listForms($platform,$chatId); return ['ok'=>true,'action'=>'forms']; } if($text==='اطلاعات من'){ self::sendMessage($platform,$chatId,self::profileText($platform,self::subscriber($platform,$chatId)),['target_type'=>'messenger_profile'],self::mainKeyboard($platform)); return ['ok'=>true,'action'=>'profile']; } $form=Db::one("SELECT id FROM bale_forms WHERE platform=? AND is_active=1 AND title=? LIMIT 1",[$platform,$text]); if($form){ self::startForm($platform,$chatId,(int)$form['id']); return ['ok'=>true,'action'=>'form_start']; } if(self::menuItem($platform,$chatId,$text))return ['ok'=>true,'action'=>'menu_item']; if(preg_match('/^[\d۰-۹٠-٩\s+\-]{8,}$/u',$text)){ $bind=self::bindChat($platform,$chatId,$text,$fromId,$name); self::sendMessage($platform,$chatId,$bind['message']??'درخواست دریافت شد.',['target_type'=>'messenger_bind'],self::mainKeyboard($platform)); return ['ok'=>true,'action'=>'bind','bound'=>!empty($bind['ok'])]; } if(self::customReply($platform,$chatId,$text))return ['ok'=>true,'action'=>'custom_reply']; self::sendMenu($platform,$chatId,'دستور شناخته نشد. از منوی ربات استفاده کنید.'); return ['ok'=>true,'action'=>'fallback']; }
}

class TelegramBot { public static function processUpdate($update){ return MessengerBot::processUpdate('telegram',$update); } }
class EitaaBot { public static function processUpdate($update){ return MessengerBot::processUpdate('eitaa',$update); } }

class MessengerHub {
  public static function enabledPlatforms() { return ['bale','telegram','eitaa']; }
  public static function sendToMobile($mobile, $text, $targetType=null, $targetId=null, $item='messages') {
    $out=[];
    try { if (class_exists('BaleBot') && BaleBot::isEnabled() && BaleBot::itemEnabled($item,true)) $out['bale']=BaleBot::sendToMobile($mobile,$text,$targetType,$targetId); } catch(Throwable $e){ $out['bale']=['ok'=>false,'error'=>$e->getMessage()]; }
    foreach(MessengerBot::platforms() as $p){ try{ if(MessengerBot::isEnabled($p)&&MessengerBot::itemEnabled($p,$item,true)) $out[$p]=MessengerBot::sendToMobile($p,$mobile,$text,$targetType,$targetId,$item); }catch(Throwable $e){ $out[$p]=['ok'=>false,'error'=>$e->getMessage()]; } }
    return $out;
  }
  public static function sendToMobiles(array $mobiles, $text, $item='messages', $targetType=null, $targetId=null) {
    $sum=[];
    try { if(class_exists('BaleBot') && BaleBot::isEnabled() && BaleBot::itemEnabled($item,true)) $sum['bale']=BaleBot::sendToMobiles($mobiles,$text,$item,$targetType,$targetId); } catch(Throwable $e){ $sum['bale']=['sent'=>0,'not_connected'=>0,'failed'=>count($mobiles),'error'=>$e->getMessage()]; }
    foreach(MessengerBot::platforms() as $p){ try{ $sum[$p]=MessengerBot::sendToMobiles($p,$mobiles,$text,$item,$targetType,$targetId); }catch(Throwable $e){ $sum[$p]=['sent'=>0,'not_connected'=>0,'failed'=>count($mobiles),'error'=>$e->getMessage()]; } }
    return $sum;
  }
  public static function sendToUserIds(array $userIds, $title, $body='', $item='messages', $data=[]) {
    $sum=[];
    try { if(class_exists('BaleBot') && BaleBot::isEnabled() && BaleBot::itemEnabled($item,true)) $sum['bale']=BaleBot::sendToUserIds($userIds,$title,$body,$item,$data); } catch(Throwable $e){ $sum['bale']=['sent'=>0,'not_connected'=>0,'failed'=>0,'error'=>$e->getMessage()]; }
    foreach(MessengerBot::platforms() as $p){ try{ $sum[$p]=MessengerBot::sendToUserIds($p,$userIds,$title,$body,$item,$data); }catch(Throwable $e){ $sum[$p]=['sent'=>0,'not_connected'=>0,'failed'=>0,'error'=>$e->getMessage()]; } }
    return $sum;
  }
  public static function totals($result) { $t=['sent'=>0,'not_connected'=>0,'failed'=>0]; foreach((array)$result as $r){ if(is_array($r) && isset($r['sent'])){ $t['sent']+=(int)($r['sent']??0); $t['not_connected']+=(int)($r['not_connected']??0); $t['failed']+=(int)($r['failed']??0); } elseif(is_array($r)){ if(!empty($r['ok']))$t['sent']++; elseif(($r['error']??'')==='not_connected')$t['not_connected']++; else $t['failed']++; } } return $t; }
}
