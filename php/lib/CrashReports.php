<?php
/** Authenticated Android/PWA diagnostic reports. Never retain the raw request body. */
class CrashReports {
  static function clean($value,$limit=6000) {
    $text=is_scalar($value)?(string)$value:'';
    $text=preg_replace('/Bearer\s+[^\s"\'<>]+/i','Bearer [redacted]',$text);
    $text=preg_replace('/((?:password|authorization|access_token|refresh_token|token|secret|api_key)["\']?\s*[:=]\s*["\']?)[^\s&"\',}]+/i','$1[redacted]',$text);
    return mb_substr($text,0,$limit);
  }
  static function payload($body) {
    if(!is_array($body))Http::error('گزارش معتبر نیست',422);
    $encoded=json_encode($body,JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);
    if(strlen($encoded)>65536)Http::error('حجم گزارش بیش از ۶۴ کیلوبایت است',413);
    $id=(string)($body['id']??'');
    if(!preg_match('/^[A-Za-z0-9_-]{1,96}$/',$id))Http::error('شناسه گزارش معتبر نیست',422);
    $out=['id'=>$id];
    foreach(['message'=>6000,'stack'=>12000,'component_stack'=>6000,'route'=>160,'platform'=>30,'app_version'=>60,'build_version'=>60,'android_version'=>60,'device_model'=>160,'manufacturer'=>100,'type'=>40] as $field=>$limit)$out[$field]=self::clean($body[$field]??'', $limit);
    if(trim($out['message'])==='')Http::error('شرح خطا الزامی است',422);
    $out['fatal']=!empty($body['fatal']);
    // Headers, request bodies, last_api and client-selected user_id are deliberately excluded.
    return $out;
  }
  static function schema() {
    Db::run("CREATE TABLE IF NOT EXISTS client_crash_reports (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,user_id INT NOT NULL,
      client_id VARCHAR(96) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      payload_json MEDIUMTEXT NOT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY user_client_report(user_id,client_id),INDEX user_report_time(user_id,created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  }
  static function save($body,$user) {
    $data=self::payload($body);self::schema();$uid=(int)$user['id'];
    $existing=Db::one('SELECT id FROM client_crash_reports WHERE user_id=? AND client_id=?',[$uid,$data['id']]);
    if($existing)return ['ok'=>true,'id'=>(int)$existing['id'],'duplicate'=>true];
    $count=Db::one('SELECT COUNT(*) n FROM client_crash_reports WHERE user_id=? AND created_at>=DATE_SUB(NOW(),INTERVAL 10 MINUTE)',[$uid]);
    if((int)($count['n']??0)>=30)Http::error('تعداد گزارش‌ها زیاد است؛ چند دقیقه بعد تلاش کنید',429);
    Db::run('INSERT INTO client_crash_reports(user_id,client_id,payload_json) VALUES(?,?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',[$uid,$data['id'],json_encode($data,JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE)]);
    $row=Db::one('SELECT id FROM client_crash_reports WHERE user_id=? AND client_id=?',[$uid,$data['id']]);
    if(!$row)Http::error('ذخیره گزارش تأیید نشد',500);
    return ['ok'=>true,'id'=>(int)$row['id'],'duplicate'=>false];
  }
}
route('POST','/api/crash-reports',fn($p,$b,$u)=>CrashReports::save($b,$u));
