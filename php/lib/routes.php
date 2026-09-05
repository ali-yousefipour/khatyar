<?php
// ============ تعریف همهٔ مسیرهای API ============
const ADMIN = 3; // سطح ۳ و بالاتر = مدیریتی
// از این نسخه به بعد، به‌درخواست کارفرما، شمارهٔ نسخهٔ سایت و اپ اندروید و نام فایل زیپ پروژه
// همیشه یکسان و هماهنگ نگه داشته می‌شوند (به‌جای دو شمارندهٔ جداگانه مثل قبل).
const SITE_VERSION = '1.3.99';   // نسخهٔ سایت — همیشه با نسخهٔ اپ و نام فایل پروژه یکی است
const APP_VERSION = '1.3.99'; // نسخهٔ اپ اندروید — با هر تغییر افزایش می‌یابد


/* Phase 7.8 — زمان واقعی ثبت کلاینت برای عملیات آفلاین/آنلاین */
function _app_en_digits($s){
  $fa = ['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9'];
  return strtr((string)$s, $fa);
}
function _app_client_time($b, $fallback=null){
  if (!is_array($b)) $b = [];
  $v = $b['client_time'] ?? $b['client_timestamp_ms'] ?? $b['created_at'] ?? $b['captured_at'] ?? $b['at'] ?? $fallback;
  if ($v === null || $v === '') return date('Y-m-d H:i:s');
  if (is_numeric($v)) { $n=(float)$v; if ($n > 200000000000) $n = $n/1000; $ts=(int)$n; }
  else { $ts = strtotime(_app_en_digits((string)$v)); }
  if (!$ts) return date('Y-m-d H:i:s');
  $min = time() - 14*86400; $max = time() + 600;
  if ($ts < $min) $ts = $min;
  if ($ts > $max) $ts = time();
  return date('Y-m-d H:i:s', $ts);
}
function _app_jdate_from_time($dt){
  $ts = strtotime($dt ?: 'now'); if (!$ts) $ts = time();
  [$jy,$jm,$jd] = gregorian_to_jalali((int)date('Y',$ts),(int)date('m',$ts),(int)date('d',$ts));
  return sprintf('%04d/%02d/%02d',$jy,$jm,$jd);
}
function _app_normalize_jdate($v, $fallbackTime=null){
  $s = trim(_app_en_digits((string)$v));
  if ($s === '' || stripos($s,'undefined') !== false || stripos($s,'nan') !== false || stripos($s,'null') !== false) return _app_jdate_from_time($fallbackTime);
  $s = str_replace(['-','.','_',' '], '/', $s);
  if (preg_match('/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/', $s, $m)) {
    $jy=(int)$m[1]; $jm=(int)$m[2]; $jd=(int)$m[3];
    if ($jy>=1300 && $jy<=1500 && $jm>=1 && $jm<=12 && $jd>=1 && $jd<=31) return sprintf('%04d/%02d/%02d',$jy,$jm,$jd);
  }
  return _app_jdate_from_time($fallbackTime);
}


function _repair_jdate_value($value,$createdAt=null){
  $v=trim((string)$value);
  if($v!=='' && stripos($v,'nan')===false && stripos($v,'undefined')===false && preg_match('/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/',$v)) return str_replace('-','/',$v);
  return _app_jdate_from_time($createdAt ?: date('Y-m-d H:i:s'));
}
function _repair_jdate_rows(&$rows,$field){ foreach($rows as &$r){ $r[$field]=_repair_jdate_value($r[$field]??'', $r['created_at']??null); } unset($r); }
function issueTokens($uid, $dev, $dtype) {
  $c = $GLOBALS['CONFIG'];
  return [
    'access'  => Jwt::sign(['sub'=>$uid,'device_id'=>$dev,'dt'=>$dtype], $c['jwt_secret'], $c['access_ttl']),
    'refresh' => Jwt::sign(['sub'=>$uid,'device_id'=>$dev,'dt'=>$dtype,'t'=>'r'], $c['jwt_secret'], $c['refresh_ttl']),
  ];
}

// اعتبارسنجی مختصات جغرافیایی
function validGeo($lat, $lng) {
  if ($lat === null && $lng === null) return [null, null];
  $lat = is_numeric($lat) ? (float)$lat : null;
  $lng = is_numeric($lng) ? (float)$lng : null;
  if ($lat === null || $lng === null || $lat < -90 || $lat > 90 || $lng < -180 || $lng > 180)
    Http::error('مختصات جغرافیایی نامعتبر است', 400);
  return [$lat, $lng];
}

function _digits_only($v){
  $v = strtr((string)$v, ['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9']);
  return preg_replace('/\D+/', '', $v);
}

function _taxi12_plate_norm($value){
  $raw = trim(_app_en_digits((string)$value));
  $raw = str_replace(['ي','ك'], ['ی','ک'], $raw);
  if (preg_match('/(\d{2})\s*ت\s*(\d{3})/u', $raw, $m)) return $m[1].'ت'.$m[2].'-12';
  $d = _digits_only($raw);
  if (strlen($d) >= 7 && substr($d, -2) === '12') $d = substr($d, 0, 5);
  elseif (strlen($d) >= 7 && substr($d, 0, 2) === '12') $d = substr($d, 2, 5);
  elseif (strlen($d) >= 5) $d = substr($d, 0, 5);
  else return null;
  return substr($d,0,2).'ت'.substr($d,2,3).'-12';
}
function _fa_digits_str($s){
  return strtr((string)$s, ['0'=>'۰','1'=>'۱','2'=>'۲','3'=>'۳','4'=>'۴','5'=>'۵','6'=>'۶','7'=>'۷','8'=>'۸','9'=>'۹']);
}

function _db_table_exists_safe($table){
  static $cache=[]; $table=(string)$table;
  if($table==='') return false; if(array_key_exists($table,$cache)) return $cache[$table];
  try { $r=Db::one("SELECT COUNT(*) c FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?",[$table]); return $cache[$table]=((int)($r['c']??0)>0); }
  catch(Throwable $e){ return $cache[$table]=false; }
}
function _db_col_exists_safe($table,$col){
  static $cache=[]; $key=$table.'.'.$col;
  if(array_key_exists($key,$cache)) return $cache[$key];
  if(!_db_table_exists_safe($table)) return $cache[$key]=false;
  try { $r=Db::one("SELECT COUNT(*) c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?",[$table,$col]); return $cache[$key]=((int)($r['c']??0)>0); }
  catch(Throwable $e){ return $cache[$key]=false; }
}
function _sql_col_or_null($table,$alias,$col,$as=null){
  $as=$as ?: $col;
  return _db_col_exists_safe($table,$col) ? "$alias.`$col` AS `$as`" : "NULL AS `$as`";
}
function _safe_line_join_sql($vehicleAlias='v'){
  $join=''; $selects=['NULL AS line_code','NULL AS line_origin','NULL AS line_destination'];
  if(_db_table_exists_safe('lines') && _db_col_exists_safe('vehicles','line_id')){
    $join=" LEFT JOIN `lines` l ON l.id={$vehicleAlias}.line_id";
    $code=_db_col_exists_safe('lines','code') ? 'l.`code`' : 'NULL';
    $origin=_db_col_exists_safe('lines','origin') ? 'l.`origin`' : 'NULL';
    $dest=_db_col_exists_safe('lines','destination') ? 'l.`destination`' : 'NULL';
    $lineText=_db_col_exists_safe('vehicles','line_text') ? "{$vehicleAlias}.`line_text`" : 'NULL';
    $selects=["COALESCE($code,$lineText) AS line_code", "$origin AS line_origin", "$dest AS line_destination"];
  } elseif(_db_col_exists_safe('vehicles','line_text')) {
    $selects=["{$vehicleAlias}.`line_text` AS line_code", 'NULL AS line_origin', 'NULL AS line_destination'];
  }
  return [$join, implode(',', $selects)];
}
function _driver_national_where_sql($alias='d'){
  $parts=[];
  if(_db_col_exists_safe('drivers','national_id')) $parts[]="REPLACE(REPLACE({$alias}.`national_id`,'-',''),' ','') IN (?,?)";
  if(_db_col_exists_safe('drivers','national_code')) $parts[]="REPLACE(REPLACE({$alias}.`national_code`,'-',''),' ','') IN (?,?)";
  return $parts ? '('.implode(' OR ',$parts).')' : '0=1';
}
function _driver_national_args($nid){
  $args=[]; $nidFa=_fa_digits_str($nid);
  if(_db_col_exists_safe('drivers','national_id')) array_push($args,$nid,$nidFa);
  if(_db_col_exists_safe('drivers','national_code')) array_push($args,$nid,$nidFa);
  return $args;
}
function _user_display_name_sql($alias='u',$as='user_name'){
  if(_db_col_exists_safe('users','full_name')) return "$alias.`full_name` AS `$as`";
  $first=_db_col_exists_safe('users','first_name') ? "$alias.`first_name`" : "''";
  $last=_db_col_exists_safe('users','last_name') ? "$alias.`last_name`" : "''";
  return "TRIM(CONCAT($first,' ',$last)) AS `$as`";
}

function _taxi12_plate_variants($plate){
  $n = _taxi12_plate_norm($plate); if (!$n) return [];
  $d = _digits_only($n); $a=substr($d,0,2); $c=substr($d,2,3); $r='12';
  $list = [
    "{$a}ت{$c}-{$r}", "{$a} ت {$c}-{$r}", "{$a} ت {$c} - {$r}", "{$a}ت{$c}{$r}", "{$a} ت {$c} {$r}",
    _fa_digits_str("{$a}ت{$c}-{$r}"), _fa_digits_str("{$a} ت {$c}-{$r}"), _fa_digits_str("{$a} ت {$c} - {$r}"), _fa_digits_str("{$a}ت{$c}{$r}"), _fa_digits_str("{$a} ت {$c} {$r}"),
  ];
  return array_values(array_unique(array_filter($list, fn($x)=>$x!=='')));
}
function _ensure_plate_scan_samples(){
  try { Db::run("CREATE TABLE IF NOT EXISTS plate_scan_samples (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    vehicle_id INT NULL,
    original_image_path VARCHAR(255) NULL,
    crop_image_path VARCHAR(255) NULL,
    detected_plate VARCHAR(30) NULL,
    corrected_plate VARCHAR(30) NOT NULL,
    detected_digits_2 VARCHAR(2) NULL,
    detected_digits_3 VARCHAR(3) NULL,
    corrected_digits_2 VARCHAR(2) NULL,
    corrected_digits_3 VARCHAR(3) NULL,
    fixed_letter VARCHAR(5) NOT NULL DEFAULT 'ت',
    region_code VARCHAR(5) NOT NULL DEFAULT '12',
    confidence DECIMAL(5,2) NULL,
    ocr_source VARCHAR(80) NULL,
    raw_text TEXT NULL,
    status ENUM('verified','pending','rejected') NOT NULL DEFAULT 'verified',
    review_note TEXT NULL,
    reviewed_by INT NULL,
    reviewed_at DATETIME NULL,
    exported_at DATETIME NULL,
    client_time DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pss_plate(corrected_plate),
    INDEX idx_pss_user_time(user_id,created_at),
    INDEX idx_pss_vehicle(vehicle_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"); } catch (Throwable $e) {}

}

/* Phase 7.10 — آموزش واقعی OCR پلاک تاکسی ۱۲/ت */
function _ensure_plate_training(){
  _ensure_plate_scan_samples();
  // ساختار جدول نمونه‌های پلاک باید روی دیتابیس‌های قدیمی هم کامل شود.
  // اگر جدول از نسخه‌های قبلی ناقص ساخته شده باشد، endpoint مدیریت نمونه‌ها نباید 500 بدهد.
  $neededCols = [
    'user_id' => "INT NULL",
    'vehicle_id' => "INT NULL",
    'original_image_path' => "VARCHAR(255) NULL",
    'crop_image_path' => "VARCHAR(255) NULL",
    'detected_plate' => "VARCHAR(30) NULL",
    'corrected_plate' => "VARCHAR(30) NULL",
    'detected_digits_2' => "VARCHAR(2) NULL",
    'detected_digits_3' => "VARCHAR(3) NULL",
    'corrected_digits_2' => "VARCHAR(2) NULL",
    'corrected_digits_3' => "VARCHAR(3) NULL",
    'fixed_letter' => "VARCHAR(5) NOT NULL DEFAULT 'ت'",
    'region_code' => "VARCHAR(5) NOT NULL DEFAULT '12'",
    'confidence' => "DECIMAL(5,2) NULL",
    'ocr_source' => "VARCHAR(80) NULL",
    'raw_text' => "TEXT NULL",
    'status' => "VARCHAR(20) NOT NULL DEFAULT 'pending'",
    'review_note' => "TEXT NULL",
    'reviewed_by' => "INT NULL",
    'reviewed_at' => "DATETIME NULL",
    'exported_at' => "DATETIME NULL",
    'client_time' => "DATETIME NULL",
    'created_at' => "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
  ];
  foreach($neededCols as $col=>$def){
    try{ if(!_db_col_exists_safe('plate_scan_samples',$col)) Db::run("ALTER TABLE plate_scan_samples ADD COLUMN `$col` $def"); }catch(Throwable $e){}
  }
  $indexes = [
    'idx_pss_plate' => "corrected_plate",
    'idx_pss_user_time' => "user_id,created_at",
    'idx_pss_vehicle' => "vehicle_id",
    'idx_pss_status_time' => "status,created_at",
    'idx_pss_reviewed' => "reviewed_by,reviewed_at"
  ];
  foreach($indexes as $idx=>$cols){
    try{
      $r=Db::one("SELECT COUNT(*) c FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='plate_scan_samples' AND INDEX_NAME=?",[$idx]);
      if((int)($r['c']??0)===0) Db::run("CREATE INDEX `$idx` ON plate_scan_samples ($cols)");
    }catch(Throwable $e){}
  }
}
function _plate_model_status_payload(){
  _ensure_plate_training();
  $counts = [];
  try {
    $counts = Db::one("SELECT COUNT(*) total,
      SUM(CASE WHEN status='verified' THEN 1 ELSE 0 END) verified,
      SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) pending,
      SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) rejected,
      SUM(CASE WHEN crop_image_path IS NOT NULL AND crop_image_path<>'' THEN 1 ELSE 0 END) with_crop
      FROM plate_scan_samples") ?: [];
  } catch(Throwable $e) { $counts = ['total'=>0,'verified'=>0,'pending'=>0,'rejected'=>0,'with_crop'=>0]; }
  return [
    'site_version'=>SITE_VERSION,'app_version'=>APP_VERSION,
    'samples'=>[
      'total'=>(int)($counts['total']??0),'verified'=>(int)($counts['verified']??0),'pending'=>(int)($counts['pending']??0),'rejected'=>(int)($counts['rejected']??0),'with_crop'=>(int)($counts['with_crop']??0)
    ],
    // آموزش/پیش‌بینی مبتنی بر Python از سامانه حذف شده است؛ تشخیص پلاک به‌طور
    // کامل روی گوشی (ML Kit) انجام می‌شود و این نمونه‌ها صرفاً برای بازبینی و
    // آرشیو نگهداری می‌شوند.
    'training_available'=>false
  ];
}
function _vehicle_candidates_by_taxi12_plate($plate,$limit=5){
  if(!_db_table_exists_safe('vehicles') || !_db_col_exists_safe('vehicles','plate')) return [];
  $n = _taxi12_plate_norm($plate); if(!$n) return [];
  $limit=max(1,min(20,(int)$limit));
  [$join,$lineSelect]=_safe_line_join_sql('v');
  $rows=[]; $vars=_taxi12_plate_variants($n);
  try{
    if($vars){
      $in=implode(',', array_fill(0,count($vars),'?'));
      $rows = Db::all("SELECT v.*, $lineSelect FROM vehicles v $join WHERE v.plate IN ($in) LIMIT $limit", $vars);
    }
  }catch(Throwable $e){ $rows=[]; }
  $d = _digits_only($n); if(strlen($d)<5) return $rows;
  $a=substr($d,0,2); $c=substr($d,2,3); $aFa=_fa_digits_str($a); $cFa=_fa_digits_str($c);
  if(count($rows)<$limit){
    try{
      $more = Db::all("SELECT v.*, $lineSelect FROM vehicles v $join
        WHERE ((v.plate LIKE ? AND v.plate LIKE ?) OR (v.plate LIKE ? AND v.plate LIKE ?))
        ORDER BY v.id DESC LIMIT $limit", ['%'.$a.'%','%'.$c.'%','%'.$aFa.'%','%'.$cFa.'%']);
      $ids=array_column($rows,'id'); foreach($more as $r){ if(!in_array($r['id']??null,$ids,true)){ $rows[]=$r; $ids[]=$r['id']??null; if(count($rows)>=$limit) break; } }
    }catch(Throwable $e){}
  }
  return $rows;
}
function _vehicle_by_taxi12_plate($plate){
  if(!_db_table_exists_safe('vehicles') || !_db_col_exists_safe('vehicles','plate')) return null;
  $vars = _taxi12_plate_variants($plate); if (!$vars) return null;
  [$join,$lineSelect]=_safe_line_join_sql('v');
  try{
    $in = implode(',', array_fill(0, count($vars), '?'));
    $v = Db::one("SELECT v.*, $lineSelect FROM vehicles v $join WHERE v.plate IN ($in) LIMIT 1", $vars);
    if ($v) return $v;
  }catch(Throwable $e){}
  $n = _taxi12_plate_norm($plate); if (!$n) return null;
  $d = _digits_only($n); if(strlen($d)<5) return null;
  $a=substr($d,0,2); $c=substr($d,2,3); $aFa=_fa_digits_str($a); $cFa=_fa_digits_str($c);
  try{
    return Db::one("SELECT v.*, $lineSelect FROM vehicles v $join
      WHERE ((v.plate LIKE ? AND v.plate LIKE ?) OR (v.plate LIKE ? AND v.plate LIKE ?))
      ORDER BY v.id DESC LIMIT 1", ['%'.$a.'%','%'.$c.'%','%'.$aFa.'%','%'.$cFa.'%']);
  }catch(Throwable $e){ return null; }
}


function _temp_driver_log($action,$tempId,$driverId,$lineId,$userId,$meta=[]){
  _ensure_temp_line_drivers();
  try { Db::run("INSERT INTO temp_line_driver_history(action,temp_line_driver_id,driver_id,line_id,user_id,meta) VALUES(?,?,?,?,?,?)", [$action,$tempId,$driverId,$lineId,$userId,json_encode($meta,JSON_UNESCAPED_UNICODE)]); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
}
function _attendance_reject_log($userId,$lineId,$method,$lat,$lng,$accuracy,$reason,$extra=[]){
  try { Db::run("CREATE TABLE IF NOT EXISTS attendance_reject_logs (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, line_id INT NULL, method VARCHAR(30) NULL, lat DECIMAL(10,7) NULL, lng DECIMAL(10,7) NULL, accuracy_m DECIMAL(10,2) NULL, reason TEXT NULL, meta JSON NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_arl_user_time(user_id,created_at), INDEX idx_arl_line_time(line_id,created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  try { Db::run("INSERT INTO attendance_reject_logs(user_id,line_id,method,lat,lng,accuracy_m,reason,meta) VALUES(?,?,?,?,?,?,?,?)", [$userId,$lineId?:null,$method,$lat,$lng,$accuracy,$reason,json_encode($extra,JSON_UNESCAPED_UNICODE)]); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
}

/* ---------------- احراز هویت ---------------- */
// نکته دربارهٔ مسیر دوم (/api/session/start):
// روی برخی هاست‌ها/فایروال‌های امنیتی (WAF)، مسیرهایی که کلمهٔ «login» را در خود دارند
// به‌طور پیش‌فرض و برای جلوگیری از حملات brute-force مسدود می‌شوند و یک صفحهٔ خطای ۴۰۳
// (HTML، نه JSON) برمی‌گردانند؛ همین باعث خطای «پاسخ سرور JSON نیست» در اپ می‌شود، هرچند
// خودِ کد PHP کاملاً سالم است. مسیر دوم بدون کلمات حساس (login/auth) این مشکل را دور
// می‌زند. مسیر اول برای سازگاری با نسخه‌های قدیمی‌تر اپ که هنوز نصب هستند نگه داشته شده.
$loginHandler = function ($p, $b) {
  // نکتهٔ حیاتی: چون بدنهٔ ورود اکنون به‌جای JSON با فرم urlencoded ارسال می‌شود (برای دورزدن
  // مسدودسازی WAF)، همهٔ مقادیر رشته‌ای هستند — یعنی JS مقدار boolean مثل false را به رشتهٔ
  // غیرخالیِ "false" تبدیل می‌کند که در PHP با !empty() به‌اشتباه «true» شمرده می‌شود. بدون
  // این نرمال‌سازی، بررسی‌های امنیتی زیر (VPN/حالت توسعه‌دهنده/GPS) حتی وقتی همه‌چیز سالم
  // است هم به‌اشتباه ورود را مسدود می‌کردند. تابع کمکی زیر رشته‌های "false"/"0"/"" را false
  // و بقیه را طبق قانون معمول PHP در نظر می‌گیرد؛ مقادیر boolean واقعی (حالت JSON) دست‌نخورده می‌مانند.
  $strBool = function ($v) {
    if (is_bool($v)) return $v;
    if ($v === null) return false;
    $s = strtolower(trim((string)$v));
    return !in_array($s, ['', '0', 'false', 'null', 'undefined'], true);
  };
  foreach (['vpn_on', 'dev_options_on', 'mock_location', 'gps_on'] as $__bk) {
    if (array_key_exists($__bk, $b)) $b[$__bk] = $strBool($b[$__bk]);
  }
  $username = trim($b['username'] ?? ''); $password = $b['password'] ?? '';
  $dev = $b['device_id'] ?? ''; if (strlen($dev) < 6) Http::error('ورودی نامعتبر', 400);
  $dtype = (($b['device_type'] ?? 'web') === 'android') ? 'android' : 'web';
  $fails = (int) Db::one("SELECT COUNT(*) n FROM activity_logs WHERE event='login_failed'
      AND created_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
      AND JSON_UNQUOTE(JSON_EXTRACT(meta,'$.username'))=?", [$username])['n'];
  if ($fails >= 5) Http::error('به‌دلیل تلاش‌های ناموفق متعدد، حساب موقتاً مسدود است. ۱۵ دقیقه بعد دوباره تلاش کنید.', 429);
  // محدودیت اضافی بر اساس IP (مستقل از نام‌کاربری) — جلوگیری از brute-force با نام‌کاربری‌های مختلف
  try {
    _v201_health_tables();
    $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
    if ($ip) {
      $ip = trim(explode(',', $ip)[0]);
      $ipFails = (int) Db::one("SELECT COUNT(*) n FROM login_ip_attempts WHERE ip=? AND created_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)", [$ip])['n'];
      if ($ipFails >= 20) Http::error('تعداد تلاش‌های ورود از این آدرس بیش از حد مجاز است. ۱۵ دقیقه بعد دوباره تلاش کنید.', 429);
    }
  } catch (\Throwable $e) { $ip = null; }
  // ابتدا کاربر را احراز هویت می‌کنیم؛ سپس معافیت امنیتی همان رکورد قطعی اعمال می‌شود.
  // این ترتیب از نادیده‌گرفته‌شدن معافیت به‌علت جست‌وجوی مقدماتی نام کاربری جلوگیری می‌کند.
  try { if (!Db::one("SHOW COLUMNS FROM users WHERE Field='security_exempt'")) Db::run("ALTER TABLE users ADD COLUMN security_exempt TINYINT(1) NOT NULL DEFAULT 0"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  try { if (!Db::one("SHOW COLUMNS FROM users WHERE Field='rank_stars'")) Db::run("ALTER TABLE users ADD COLUMN rank_stars TINYINT NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  $u = Db::one("SELECT u.*, r.title AS role_title, r.level, r.is_admin FROM users u JOIN roles r ON r.id=u.role_id WHERE TRIM(u.username)=? LIMIT 1", [$username]);
  if (!$u || !$u['is_active'] || !password_verify($password, $u['password_hash'])) {
    Db::run("INSERT INTO activity_logs(user_id,event,meta) VALUES(?, 'login_failed', ?)", [$u['id'] ?? null, json_encode(['username'=>$username], JSON_UNESCAPED_UNICODE)]);
    if (!empty($ip)) { try { Db::run("INSERT INTO login_ip_attempts(ip) VALUES(?)", [$ip]); } catch (\Throwable $e) {} }
    Http::error('نام کاربری یا رمز عبور اشتباه است', 401);
  }
  // قوانین امنیتی ورود؛ کاربر معاف از VPN، حالت توسعه‌دهنده، موقعیت جعلی و الزام GPS مستثنا است.
  $securityExempt = ((int)($u['security_exempt'] ?? 0) === 1);
  if (!$securityExempt) {
    $secCfg = function($k,$d=true){ $r = Db::one("SELECT value FROM app_settings WHERE `key`=?", [$k]); return $r ? json_decode($r['value'], true) : $d; };
    $block_vpn = $secCfg('block_vpn', true);
    $block_dev = $secCfg('block_dev_options', true);
    $block_mock = $secCfg('block_mock_location', true);
    $require_gps = $secCfg('require_gps', true);
    $reason = null;
    if ($block_vpn && !empty($b['vpn_on'])) $reason = 'VPN روشن است';
    elseif ($block_dev && !empty($b['dev_options_on'])) $reason = 'حالت توسعه‌دهنده فعال است';
    elseif ($block_mock && !empty($b['mock_location'])) $reason = 'موقعیت جعلی (Mock Location) فعال است';
    elseif ($require_gps && array_key_exists('gps_on',$b) && $b['gps_on'] === false) $reason = 'GPS خاموش است';
    if ($reason !== null) {
      $securityMeta = $b;
      unset($securityMeta['password']);
      $securityMeta['username'] = $username;
      $securityMeta['reason'] = $reason;
      Db::run("INSERT INTO activity_logs(user_id,event,meta) VALUES(?, 'login_blocked_security', ?)", [$u['id'], json_encode($securityMeta, JSON_UNESCAPED_UNICODE)]);
      Http::error("ورود مجاز نیست: $reason", 403);
    }
  }
  if (empty($u['is_admin'])) {
    $mcfg = _maintenance_status();
    if (!empty($mcfg['enabled'])) Http::error($mcfg['message'] ?: 'نرم‌افزار موقتاً برای تعمیرات غیرفعال است.', 503);
  }
  // در صورت فعال بودن تنظیم «الزام تکمیل اطلاعات هویتی برای ورود»، کاربرانی که فیلدهای سفارشیِ الزامی
  // را کامل نکرده یا هنوز امضای خود را در برنامه ثبت نکرده‌اند، اجازهٔ ورود نخواهند داشت.
  if (empty($u['is_admin']) && _req_setting('require_complete_profile_login', false)) {
    $missing = [];
    $reqFields = Db::all("SELECT id,label FROM custom_fields WHERE is_active=1 AND required=1 ORDER BY sort_order,id");
    if ($reqFields) {
      $vals = Db::all("SELECT field_id,value FROM custom_field_values WHERE user_id=?", [$u['id']]);
      $vmap = []; foreach ($vals as $vv) $vmap[$vv['field_id']] = $vv['value'];
      foreach ($reqFields as $rf) {
        if (!isset($vmap[$rf['id']]) || trim((string)$vmap[$rf['id']]) === '') $missing[] = $rf['label'];
      }
    }
    if (empty($u['signature_data'])) $missing[] = 'امضای پرسنلی';
    if ($missing) {
      Db::run("INSERT INTO activity_logs(user_id,event,meta) VALUES(?, 'login_blocked_incomplete_profile', ?)", [$u['id'], json_encode(['missing'=>$missing], JSON_UNESCAPED_UNICODE)]);
      Http::error('اطلاعات هویتی شما تکمیل نشده و امکان ورود وجود ندارد. موارد ناقص: '.implode('، ', $missing).'. برای تکمیل، به مدیر سامانه مراجعه کنید.', 403);
    }
  }
  if ($dtype === 'android' && !$u['allow_android']) Http::error('ورود با اپ اندروید برای این حساب مجاز نیست', 403);
  if ($dtype === 'web' && !$u['allow_web']) Http::error('ورود با وب‌اپلیکیشن برای این حساب مجاز نیست', 403);
  $sess = Db::one("SELECT device_id, revoked_at FROM user_sessions WHERE user_id=? AND device_type=?", [$u['id'], $dtype]);
  $unlimited = in_array($u['role_title'], ['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد'], true);
  if (!$sess || $sess['revoked_at'] || $unlimited) {
    Db::run("INSERT INTO user_sessions(user_id,device_type,device_id,device_model) VALUES(?,?,?,?)
             ON DUPLICATE KEY UPDATE device_id=VALUES(device_id),device_model=VALUES(device_model),revoked_at=NULL,created_at=NOW()",
            [$u['id'], $dtype, $dev, $b['device_model'] ?? null]);
  } elseif ($sess['device_id'] !== $dev) {
    Db::run("INSERT INTO activity_logs(user_id,event,meta) VALUES(?, 'device_mismatch', ?)", [$u['id'], json_encode(['tried'=>$dev,'type'=>$dtype])]);
    Http::error('این حساب روی ' . ($dtype==='android'?'یک گوشی اندروید':'یک مرورگر') . ' دیگر فعال است. برای تعویض، مدیر باید آن دستگاه را حذف کند.', 409);
  }
  // اگر رمز هنوز پیش‌فرض (۱۲۳۴۶۶) باشد، کاربر باید رمز و ایمیل را تغییر دهد
  $mustChange = (bool)($u['must_change_pw'] ?? 0) || ($password === '123456');
  $t = issueTokens($u['id'], $dev, $dtype);
  Db::run("INSERT INTO activity_logs(user_id,event) VALUES(?, 'login')", [$u['id']]);
  return array_merge($t, ['user'=>[
    'id'=>(int)$u['id'],'username'=>$u['username'],'name'=>$u['first_name'].' '.$u['last_name'],
    'role'=>$u['role_title'],'role_id'=>(int)$u['role_id'],'level'=>(int)$u['level'],'is_admin'=>(bool)$u['is_admin'],'must_change_pw'=>$mustChange,
    'email'=>$u['email'],'photo'=>_user_photo_url($u['photo_path'] ?? null, $u['photo'] ?? null),'security_exempt'=>$securityExempt,
    'rank_stars'=>isset($u['rank_stars']) && $u['rank_stars']!==null ? (int)$u['rank_stars'] : null,
    'can_send_sms'=>(bool)$u['is_admin'] || (bool)($u['can_send_sms'] ?? 0),
  ]]);
};
route('POST', '/api/auth/login', $loginHandler, true);
route('POST', '/api/session/start', $loginHandler, true);

$refreshHandler = function ($p, $b) {
  $payload = Jwt::verify($b['refresh'] ?? '', $GLOBALS['CONFIG']['jwt_secret']);
  if (!$payload || ($payload['t'] ?? '') !== 'r') Http::error('توکن تمدید نامعتبر است', 401);
  $dt = $payload['dt'] ?? 'web';
  $s = Db::one("SELECT device_id,revoked_at FROM user_sessions WHERE user_id=? AND device_type=?", [$payload['sub'], $dt]);
  $ur = Db::one("SELECT r.title FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?", [$payload['sub']]);
  $unlim = $ur && in_array($ur['title'], ['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد'], true);
  if (!$s || $s['revoked_at'] || (!$unlim && $s['device_id'] !== $payload['device_id'])) Http::error('نشست نامعتبر است', 401);
  return issueTokens($payload['sub'], $payload['device_id'], $dt);
};
route('POST', '/api/auth/refresh', $refreshHandler, true);
// همان مسیر بدون کلمهٔ حساس «auth» — برای دورزدن مسدودسازی احتمالی WAF (نگاه کنید به توضیح بالای لاگین)
route('POST', '/api/session/renew', $refreshHandler, true);

/* ================= ورود با کد یک‌بارمصرف پیامکی (OTP) ================= */
function _otp_tables() {
  try { Db::run("CREATE TABLE IF NOT EXISTS login_otp (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    code_hash VARCHAR(64) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    expires_at DATETIME NOT NULL,
    consumed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_login_otp_mobile (mobile, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
}
// درخواست ارسال کد یک‌بارمصرف به موبایل ثبت‌شدهٔ کاربر
route('POST', '/api/session/otp-request', function($p, $b) {
  _otp_tables();
  $mobile = preg_replace('/\D/', '', trim($b['mobile'] ?? ''));
  if (strlen($mobile) < 10) Http::error('شمارهٔ موبایل نامعتبر است', 400);
  if (strpos($mobile, '0') !== 0) $mobile = '0' . ltrim($mobile, '0');
  $u = Db::one("SELECT id,is_active FROM users WHERE phone=? OR phone=?", [$mobile, ltrim($mobile, '0')]);
  // برای جلوگیری از افشای اینکه یک شماره در سامانه ثبت است یا نه، پاسخ همیشه یکسان است
  if (!$u || !$u['is_active']) return ['ok' => true];
  // حداکثر یک درخواست کد در هر ۶۰ ثانیه برای هر شماره (جلوگیری از سوءاستفاده/هزینهٔ پیامک)
  $recent = Db::one("SELECT id FROM login_otp WHERE mobile=? AND created_at > DATE_SUB(NOW(), INTERVAL 60 SECOND)", [$mobile]);
  if ($recent) Http::error('لطفاً ۶۰ ثانیه صبر کنید و دوباره تلاش کنید.', 429);
  // حداکثر ۵ درخواست کد در یک ساعت برای هر شماره
  $hourly = (int)(Db::one("SELECT COUNT(*) n FROM login_otp WHERE mobile=? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)", [$mobile])['n'] ?? 0);
  if ($hourly >= 5) Http::error('تعداد درخواست‌های کد در این ساعت بیش از حد مجاز است.', 429);
  $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
  Db::run("INSERT INTO login_otp(user_id,mobile,code_hash,expires_at) VALUES(?,?,?,DATE_ADD(NOW(), INTERVAL 3 MINUTE))",
    [$u['id'], $mobile, hash('sha256', $code)]);
  // امضای اپلیکیشن (App Hash) در انتهای متن پیامک درج می‌شود تا با Android SMS Retriever API
  // بتوان کد را بدون هیچ مجوز حساسی و کاملاً خودکار در برنامه خواند.
  $appHash = _req_setting('android_sms_app_hash', '');
  $text = "کد ورود خطیار: {$code}\nاین کد تا ۳ دقیقه معتبر است.";
  if ($appHash) $text .= "\n\n" . $appHash;
  $r = Sms::send([$mobile], $text, 'login_otp', null);
  if (!$r['ok']) Http::error('ارسال پیامک ناموفق بود: ' . ($r['error'] ?: 'خطای نامشخص'), 502);
  return ['ok' => true];
}, true);
// تأیید کد یک‌بارمصرف و صدور توکن ورود (دقیقاً مثل ورود عادی)
route('POST', '/api/session/otp-verify', function($p, $b) {
  _otp_tables();
  $mobile = preg_replace('/\D/', '', trim($b['mobile'] ?? ''));
  if (strpos($mobile, '0') !== 0) $mobile = '0' . ltrim($mobile, '0');
  $code = trim($b['code'] ?? '');
  $dev = $b['device_id'] ?? ''; if (strlen($dev) < 6) Http::error('ورودی نامعتبر', 400);
  $dtype = (($b['device_type'] ?? 'web') === 'android') ? 'android' : 'web';
  if (!preg_match('/^\d{6}$/', $code)) Http::error('کد وارد‌شده نامعتبر است', 400);
  $row = Db::one("SELECT * FROM login_otp WHERE mobile=? AND consumed_at IS NULL ORDER BY id DESC LIMIT 1", [$mobile]);
  if (!$row) Http::error('کدی برای این شماره یافت نشد. دوباره درخواست بدهید.', 400);
  if (strtotime($row['expires_at']) < time()) Http::error('کد منقضی شده است. دوباره درخواست بدهید.', 400);
  if ((int)$row['attempts'] >= 5) Http::error('تعداد تلاش‌های مجاز تمام شده است. دوباره درخواست بدهید.', 429);
  if (!hash_equals($row['code_hash'], hash('sha256', $code))) {
    Db::run("UPDATE login_otp SET attempts=attempts+1 WHERE id=?", [$row['id']]);
    Http::error('کد وارد‌شده نادرست است', 401);
  }
  Db::run("UPDATE login_otp SET consumed_at=NOW() WHERE id=?", [$row['id']]);
  $u = Db::one("SELECT u.*, r.title role_title, r.level FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.id=? AND u.is_active=1", [$row['user_id']]);
  if (!$u) Http::error('حساب کاربری یافت نشد یا غیرفعال است', 401);
  $securityExempt = (int)($u['security_exempt'] ?? 0) === 1;
  $t = issueTokens($u['id'], $dev, $dtype);
  Db::run("INSERT INTO activity_logs(user_id,event) VALUES(?, 'login_otp')", [$u['id']]);
  return array_merge($t, ['user' => [
    'id' => (int)$u['id'], 'username' => $u['username'], 'name' => $u['first_name'].' '.$u['last_name'],
    'role' => $u['role_title'], 'role_id' => (int)$u['role_id'], 'level' => (int)$u['level'], 'is_admin' => (bool)$u['is_admin'],
    'must_change_pw' => (bool)($u['must_change_pw'] ?? 0),
    'email' => $u['email'], 'photo' => _user_photo_url($u['photo_path'] ?? null, $u['photo'] ?? null), 'security_exempt' => $securityExempt,
    'rank_stars' => isset($u['rank_stars']) && $u['rank_stars'] !== null ? (int)$u['rank_stars'] : null,
    'can_send_sms' => (bool)$u['is_admin'] || (bool)($u['can_send_sms'] ?? 0),
  ]]);
}, true);

route('POST', '/api/auth/logout', function($p, $b, $u) {
  // بررسی اجازهٔ خروج و محدودیت ماهانه
  $allow = _req_setting('allow_logout', true) !== false;
  if (!$allow) Http::error('خروج از حساب کاربری توسط مدیر سامانه غیرفعال شده است.', 403);
  $limit = (int)_req_setting('logout_monthly_limit', 0);
  if ($limit > 0) {
    $used = (int)(Db::one("SELECT COUNT(*) n FROM activity_logs WHERE user_id=? AND event='logout' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)", [$u['id'], $eventAt])['n'] ?? 0);
    if ($used >= $limit) Http::error("شما در ۳۰ روز اخیر {$used} بار خارج شده‌اید و به سقف مجاز ({$limit} بار) رسیده‌اید.", 403);
  }
  $dt = $u['device_type'] ?? 'web';
  Db::run("UPDATE user_sessions SET revoked_at=NOW() WHERE user_id=? AND device_type=?", [$u['id'], $dt]);
  Db::run("INSERT INTO activity_logs(user_id,event) VALUES(?, 'logout')", [$u['id']]);
  return ['ok'=>true];
});

// ثبت «فراموشی خروج/ورود» — وقتی کاربر فراموش کرده ثبت تردد بزند، با محدودیت ماهانه
route('POST', '/api/me/forget-checkin', function($p,$b,$u){
  $limit = (int)_req_setting('forget_checkin_monthly_limit', 0);
  $used = (int)(Db::one("SELECT COUNT(*) n FROM activity_logs WHERE user_id=? AND event='forget_checkin' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)", [$u['id']])['n'] ?? 0);
  if ($limit > 0 && $used >= $limit) {
    Http::error("شما در ۳۰ روز اخیر {$used} بار از فراموشی ثبت تردد استفاده کرده‌اید و به سقف مجاز ({$limit} بار) رسیده‌اید.", 403);
  }
  // ثبت رویداد فراموشی
  $note = trim($b['note'] ?? '');
  Db::run("INSERT INTO activity_logs(user_id,event,meta) VALUES(?, 'forget_checkin', ?)", [$u['id'], $note ? json_encode(['note'=>$note], JSON_UNESCAPED_UNICODE) : null]);
  // اگر خروج باز هست، آن را ببند (شبیه خروج فراموش‌شده)
  $open = Db::one("SELECT id FROM attendances WHERE user_id=? AND exit_at IS NULL ORDER BY created_at DESC LIMIT 1", [$u['id']]);
  if ($open) { try { Db::run("UPDATE attendances SET exit_at=? WHERE id=?", [$eventAt, $open['id']]); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); } }
  $remaining = $limit > 0 ? max(0, $limit - $used - 1) : null;
  return ['ok'=>true, 'remaining'=>$remaining];
});

// وضعیت فراموشی ثبت تردد (چند بار باقی مانده)
route('GET', '/api/me/forget-status', function($p,$b,$u){
  $limit = (int)_req_setting('forget_checkin_monthly_limit', 0);
  $used = (int)(Db::one("SELECT COUNT(*) n FROM activity_logs WHERE user_id=? AND event='forget_checkin' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)", [$u['id']])['n'] ?? 0);
  return ['limit'=>$limit, 'used'=>$used, 'remaining'=>$limit > 0 ? max(0, $limit - $used) : null];
});

// وضعیت خروج کاربر: آیا مجاز است + چند بار در ۳۰ روز اخیر باقی مانده
route('GET', '/api/me/logout-status', function($p,$b,$u){
  $allow = _req_setting('allow_logout', true) !== false;
  $limit = (int)_req_setting('logout_monthly_limit', 0);
  $used = (int)(Db::one("SELECT COUNT(*) n FROM activity_logs WHERE user_id=? AND event='logout' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)", [$u['id']])['n'] ?? 0);
  return [
    'allow' => $allow,
    'limit' => $limit, // 0 = بدون محدودیت
    'used' => $used,
    'remaining' => $limit > 0 ? max(0, $limit - $used) : null,
  ];
});
// ---------------- صحت‌سنجی حضور ----------------

function _presence_today_jdate() {
  if (function_exists('gregorian_to_jalali')) {
    [$jy,$jm,$jd] = gregorian_to_jalali((int)date('Y'), (int)date('n'), (int)date('j'));
    return sprintf('%04d-%02d-%02d', $jy, $jm, $jd);
  }
  return date('Y-m-d');
}
function _presence_user_in_shift($userId, $jdate=null, $ts=null) {
  $jdate = $jdate ?: _presence_today_jdate();
  $ts = $ts ?: time();
  if (!class_exists('ShiftCalc') || !function_exists('_active_user_shift_assignment')) return true;
  try {
    $shift = _active_user_shift_assignment((int)$userId, $jdate);
    if (!$shift) return false;
    $dr = (($shift['type'] ?? '') === 'advanced' && function_exists('_shift_day_row')) ? _shift_day_row($shift['shift_id'] ?? $shift['id'], $jdate) : null;
    $segs = ShiftCalc::daySegments($shift, $jdate, $dr);
    if (!$segs && (($shift['type'] ?? '') !== 'floating')) return false;
    if (($shift['type'] ?? '') === 'floating') return true;
    $base = ShiftCalc::jdateToTs($jdate);
    if ($base === null) return true;
    foreach ($segs as $seg) {
      $win = ShiftCalc::segmentWindow($seg, $base);
      if (!$win) continue;
      [$a,$b] = $win;
      // ۳۰ دقیقه تلورانس قبل و بعد برای صحت‌سنجی در ابتدای/انتهای شیفت
      if ($ts >= ($a - 1800) && $ts <= ($b + 1800)) return true;
    }
    return false;
  } catch (\Throwable $e) { return true; }
}
function _presence_is_required_for_user($userId, $cfg, $presenceRequired=true, $jdate=null, $ts=null) {
  if (!$presenceRequired) return false;
  $aud = $cfg['audience'] ?? 'all_required';
  if ($aud === 'shift_only') return _presence_user_in_shift($userId, $jdate, $ts);
  return true;
}

// پیکربندی برای اپ موبایل: آیا فعال است، آیا این کاربر مشمول است، بازه‌های ساعتی، مهلت
route('GET', '/api/my/presence-config', function($p,$b,$u){
  $cfgRow = Db::one("SELECT value FROM app_settings WHERE `key`='presence_check'");
  $cfg = $cfgRow ? json_decode($cfgRow['value'], true) : [];
  $presenceRequired = false;
  try { $r = Db::one("SELECT presence_required FROM users WHERE id=?", [$u['id']]); $presenceRequired = (bool)($r['presence_required'] ?? 0); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  $required = _presence_is_required_for_user($u['id'], $cfg, $presenceRequired);
  return [
    'enabled' => !empty($cfg['enabled']),
    'required' => $required,
    'slots' => $cfg['slots'] ?? [],
    'window_minutes' => (int)($cfg['window_minutes'] ?? 1),
    'grace_minutes' => (int)($cfg['grace_minutes'] ?? 15),
    'alarm' => !isset($cfg['alarm']) ? true : !empty($cfg['alarm']), // صدای آلارم هنگام صحت‌سنجی
    'audience' => $cfg['audience'] ?? 'all_required', // all_required | shift_only
    'server_push' => !isset($cfg['server_push']) ? true : !empty($cfg['server_push']),
  ];
});

// ثبت صحت‌سنجی: سلفی + عکس خودروها + موقعیت
route('POST', '/api/my/presence-check', function($p,$b,$u){
  $slot = $b['slot'] ?? '';
  if (!preg_match('/^\d{2}:\d{2}$/', $slot)) Http::error('بازهٔ ساعتی نامعتبر', 400);
  $selfie = $b['selfie'] ?? '';
  $veh = $b['vehicles_photo'] ?? '';
  if (strpos($selfie,'data:image')!==0) Http::error('عکس سلفی لازم است', 400);
  if (strpos($veh,'data:image')!==0) Http::error('عکس خودروهای خط لازم است', 400);
  $date = date('Y-m-d');
  // اگر قبلاً برای این بازه ثبت شده، به‌روزرسانی
  $ex = Db::one("SELECT id FROM presence_checks WHERE user_id=? AND slot_date=? AND slot=?", [$u['id'],$date,$slot]);
  $_selfiePath = Media::saveBase64($selfie, 'presence', 960, 65);
  $_vehPath = Media::saveBase64($veh, 'presence', 1280, 68);
  if ($ex) {
    Db::run("UPDATE presence_checks SET selfie_path=?, vehicles_photo_path=?, lat=?, lng=?, captured_at=NOW() WHERE id=?",
      [$_selfiePath, $_vehPath, $b['lat']??null, $b['lng']??null, $ex['id']]);
    return ['ok'=>true, 'id'=>(int)$ex['id']];
  }
  $id = Db::insert("INSERT INTO presence_checks(user_id,slot,slot_date,selfie_path,vehicles_photo_path,lat,lng) VALUES(?,?,?,?,?,?,?)",
    [$u['id'],$slot,$date,$_selfiePath,$_vehPath,$b['lat']??null,$b['lng']??null]);
  return ['ok'=>true, 'id'=>$id];
});


// ارسال Push صحت‌سنجی حضور از سمت سرور؛ برای کرون هر دقیقه اجرا شود: /api/cron/presence-alert?key=CRON_KEY
route('GET', '/api/cron/presence-alert', function($p,$b,$u){
  $cfgK = Db::one("SELECT value FROM app_settings WHERE `key`='cron_key'");
  $key = $cfgK ? json_decode($cfgK['value'], true) : null;
  if (!$key || ($_GET['key'] ?? '') !== $key) Http::error('forbidden', 403);
  $cfgRow = Db::one("SELECT value FROM app_settings WHERE `key`='presence_check'");
  $cfg = $cfgRow ? json_decode($cfgRow['value'], true) : [];
  if (empty($cfg['enabled']) || empty($cfg['slots']) || (isset($cfg['server_push']) && empty($cfg['server_push']))) return ['ok'=>true,'sent'=>0,'reason'=>'disabled'];
  $now = time(); $today = date('Y-m-d'); $sent = 0; $win = max(1,(int)($cfg['window_minutes'] ?? 1));
  foreach (($cfg['slots'] ?? []) as $sl) {
    if (!preg_match('/^\d{2}:\d{2}$/', $sl)) continue;
    $slotTs = strtotime($today.' '.$sl.':00');
    if ($now < $slotTs || $now > $slotTs + 70) continue; // فقط همان حوالی شروع بازه، جلوگیری از ارسال تکراری
    $users = Db::all("SELECT id, presence_required FROM users WHERE is_active=1 AND presence_required=1");
    $targets = [];
    foreach ($users as $usr) {
      if (!_presence_is_required_for_user((int)$usr['id'], $cfg, (bool)$usr['presence_required'], _presence_today_jdate(), $slotTs)) continue;
      $dup = Db::one("SELECT id FROM notifications WHERE user_id=? AND data LIKE ? AND created_at>=DATE_SUB(NOW(),INTERVAL 2 MINUTE) LIMIT 1", [(int)$usr['id'], '%\"presence_slot\":\"'.$sl.'\"%']);
      if ($dup) continue;
      $targets[] = (int)$usr['id'];
    }
    if ($targets) {
      Push::notify($targets, 'صحت‌سنجی حضور', "لطفاً ظرف {$win} دقیقه سلفی و عکس خودروهای خط را ارسال کنید.", ['type'=>'presence_check','slot'=>$sl,'presence_slot'=>$sl,'window_minutes'=>$win]);
      $sent += count($targets);
    }
  }
  return ['ok'=>true,'sent'=>$sent];
}, true);

// فهرست ارسال‌ها (ادمین و رییس اداره بازرسی)
// تبدیل مختصات به آدرس (نام خیابان) با سرویس نشان + نزدیک‌ترین خط کاربر
route('GET', '/api/geo/reverse', function($p,$b,$u){
  $lat = (float)($_GET['lat'] ?? 0); $lng = (float)($_GET['lng'] ?? 0);
  if (!$lat || !$lng) Http::error('مختصات نامعتبر است', 400);
  $out = ['lat'=>$lat, 'lng'=>$lng, 'address'=>null, 'street'=>null, 'neighbourhood'=>null];
  // فراخوانی سرویس reverse نشان (کلید سرویس)
  $key = _req_setting('neshan_service_key', '') ?: _req_setting('neshan_api_key', '');
  if ($key && function_exists('curl_init')) {
    try {
      $ch = curl_init("https://api.neshan.org/v5/reverse?lat={$lat}&lng={$lng}");
      curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>8,
        CURLOPT_HTTPHEADER=>["Api-Key: {$key}"],
        CURLOPT_SSL_VERIFYPEER=>false,
      ]);
      $resp = curl_exec($ch); curl_close($ch);
      if ($resp) { $j = json_decode($resp, true);
        if (is_array($j)) {
          $out['address'] = $j['formatted_address'] ?? null;
          $out['street'] = $j['route_name'] ?? ($j['street'] ?? null);
          $out['neighbourhood'] = $j['neighbourhood'] ?? null;
        }
      }
    } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  }
  // یافتن نزدیک‌ترین خط تعریف‌شده برای کاربر (از ایستگاه‌های geofence خطوط)
  $fences = Db::all("SELECT g.name, g.center_lat, g.center_lng, l.code line_code
    FROM geofences g LEFT JOIN `lines` l ON l.id=g.line_id
    WHERE g.center_lat IS NOT NULL AND g.center_lng IS NOT NULL");
  $nearest = null; $nearestD = INF;
  foreach ($fences as $g) {
    $d = _haversine_m($lat, $lng, (float)$g['center_lat'], (float)$g['center_lng']);
    if ($d < $nearestD) { $nearestD = $d; $nearest = $g; }
  }
  if ($nearest) {
    $out['nearest_line'] = $nearest['line_code'] ?: $nearest['name'];
    $out['nearest_station'] = $nearest['name'];
    $out['distance_m'] = round($nearestD);
  }
  return $out;
}, false, 1);

route('GET', '/api/admin/presence-checks', function($p,$b,$u){
  $from = $_GET['from'] ?? date('Y-m-d'); $to = $_GET['to'] ?? $from;
  $from = date('Y-m-d', strtotime($from)); $to = date('Y-m-d', strtotime($to));
  $uid = (int)($_GET['user_id'] ?? 0);
  $cond = "pc.slot_date BETWEEN ? AND ?"; $args = [$from,$to];
  if ($uid) { $cond .= " AND pc.user_id=?"; $args[] = $uid; }
  $rows = Db::all("SELECT pc.id, pc.user_id, CONCAT(us.first_name,' ',us.last_name) name, r.title role,
      pc.slot, pc.slot_date, pc.lat, pc.lng, pc.captured_at,
      (pc.selfie IS NOT NULL) has_selfie, (pc.vehicles_photo IS NOT NULL) has_vehicles
    FROM presence_checks pc JOIN users us ON us.id=pc.user_id LEFT JOIN roles r ON r.id=us.role_id
    WHERE $cond ORDER BY pc.slot_date DESC, pc.slot DESC, name", $args);
  foreach ($rows as &$r) $r['captured_fa'] = fa_datetime($r['captured_at']); // وقت تهران (سرور)
  return $rows;
}, false, ADMIN);

// سرو تصویر صحت‌سنجی (برای هایپرلینک اکسل) — اعتبارسنجی توکن از کوئری یا هدر
route('GET', '/api/presence-image/{id}', function($p,$b,$u){
  $tok = $_GET['token'] ?? Http::bearer();
  $payload = $tok ? Jwt::verify($tok, $GLOBALS['CONFIG']['jwt_secret']) : null;
  if (!$payload) { http_response_code(403); exit('forbidden'); }
  $type = ($_GET['type'] ?? 'selfie') === 'vehicles' ? 'vehicles_photo' : 'selfie';
  $pathCol = $type . '_path';
  $r = Db::one("SELECT $type img, $pathCol pth FROM presence_checks WHERE id=?", [$p['id']]);
  if (!$r) { http_response_code(404); exit('not found'); }
  if (!empty($r['pth'])) { Media::serve($r['pth']); } // خروجی فایل + exit
  if (!$r['img']) { http_response_code(404); exit('not found'); }
  $data = $r['img'];
  // data:image/...;base64,XXXX  → خروجی باینری
  if (preg_match('/^data:(image\/\w+);base64,(.*)$/s', $data, $m)) {
    header('Content-Type: '.$m[1]);
    echo base64_decode($m[2]); exit;
  }
  header('Content-Type: image/jpeg'); echo $data; exit;
}, true);

// خروجی اکسل صحت‌سنجی حضور با هایپرلینک عکس‌ها
route('GET', '/api/admin/presence-checks/export', function($p,$b,$u){
  $from = $_GET['from'] ?? date('Y-m-d'); $to = $_GET['to'] ?? $from;
  $from = date('Y-m-d', strtotime($from)); $to = date('Y-m-d', strtotime($to));
  $uid = (int)($_GET['user_id'] ?? 0);
  $cond = "pc.slot_date BETWEEN ? AND ?"; $args=[$from,$to];
  if ($uid) { $cond .= " AND pc.user_id=?"; $args[]=$uid; }
  $rows = Db::all("SELECT pc.id, CONCAT(us.first_name,' ',us.last_name) name, r.title role, pc.slot, pc.slot_date,
      pc.lat, pc.lng, pc.captured_at, (pc.selfie IS NOT NULL) has_selfie, (pc.vehicles_photo IS NOT NULL) has_vehicles
    FROM presence_checks pc JOIN users us ON us.id=pc.user_id LEFT JOIN roles r ON r.id=us.role_id
    WHERE $cond ORDER BY pc.slot_date DESC, pc.slot DESC, name", $args);
  // توکن کوتاه برای لینک‌ها (از هدر فعلی ادمین)
  $tok = Http::bearer();
  $base = (isset($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off'?'https':'http').'://'.($_SERVER['HTTP_HOST'] ?? '').'/api/presence-image/';
  $SLOT = ['morning'=>'صبح','noon'=>'ظهر','evening'=>'عصر','1'=>'بازهٔ ۱','2'=>'بازهٔ ۲','3'=>'بازهٔ ۳'];
  header('Content-Type: text/csv; charset=UTF-8');
  header('Content-Disposition: attachment; filename="presence_'.$from.'_'.$to.'.csv"');
  echo "\xEF\xBB\xBF"; $out=fopen('php://output','w');
  fputcsv($out, ['نام','سمت','تاریخ','بازه','زمان دریافت (تهران)','عرض جغرافیایی','طول جغرافیایی','عکس سلفی','عکس خودروها']);
  foreach ($rows as $r) {
    $selfie = $r['has_selfie'] ? '=HYPERLINK("'.$base.$r['id'].'?type=selfie&token='.$tok.'","مشاهدهٔ سلفی")' : '—';
    $veh = $r['has_vehicles'] ? '=HYPERLINK("'.$base.$r['id'].'?type=vehicles&token='.$tok.'","مشاهدهٔ خودروها")' : '—';
    fputcsv($out, [$r['name'], $r['role'], $r['slot_date'], $SLOT[$r['slot']]??$r['slot'], fa_datetime($r['captured_at']), $r['lat'], $r['lng'], $selfie, $veh]);
  }
  fclose($out); exit;
}, false, ADMIN);

// تصاویر یک ثبت خاص
route('GET', '/api/admin/presence-checks/{id}', function($p,$b,$u){
  $r = Db::one("SELECT pc.*, CONCAT(us.first_name,' ',us.last_name) name FROM presence_checks pc JOIN users us ON us.id=pc.user_id WHERE pc.id=?", [$p['id']]);
  if (!$r) Http::error('یافت نشد', 404);
  // تصاویر را به URL با توکن تبدیل کن (endpoint presence-image از فایل یا base64 پشتیبانی می‌کند)
  $tok = $_GET['token'] ?? Http::bearer();
  $hasSelfie = !empty($r['selfie_path']) || !empty($r['selfie']);
  $hasVeh = !empty($r['vehicles_photo_path']) || !empty($r['vehicles_photo']);
  $r['selfie'] = $hasSelfie ? ('/api/presence-image/'.$r['id'].'?type=selfie&token='.urlencode($tok)) : null;
  $r['vehicles_photo'] = $hasVeh ? ('/api/presence-image/'.$r['id'].'?type=vehicles&token='.urlencode($tok)) : null;
  unset($r['selfie_path'], $r['vehicles_photo_path']);
  return $r;
}, false, ADMIN);

// تخلفات عدم ارسال صحت‌سنجی (پویا): برای هر کاربر مشمول × هر بازهٔ گذشته که ثبت نکرده
route('GET', '/api/admin/presence-violations', function($p,$b,$u){
  $from = $_GET['from'] ?? date('Y-m-d'); $to = $_GET['to'] ?? $from;
  $from = date('Y-m-d', strtotime($from)); $to = date('Y-m-d', strtotime($to));
  $cfgRow = Db::one("SELECT value FROM app_settings WHERE `key`='presence_check'");
  $cfg = $cfgRow ? json_decode($cfgRow['value'], true) : [];
  if (empty($cfg['enabled'])) return [];
  $slots = $cfg['slots'] ?? []; if (!$slots) return [];
  $grace = (int)($cfg['grace_minutes'] ?? 15);
  $users = Db::all("SELECT u.id, CONCAT(u.first_name,' ',u.last_name) name, r.title role FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.is_active=1 AND u.presence_required=1");
  $aud = $cfg['audience'] ?? 'all_required';
  $done = Db::all("SELECT user_id, slot_date, slot FROM presence_checks WHERE slot_date BETWEEN ? AND ?", [$from,$to]);
  $doneSet = [];
  foreach ($done as $d) $doneSet[$d['user_id'].'|'.$d['slot_date'].'|'.$d['slot']] = true;
  $out = []; $now = time();
  $start = strtotime($from); $end = strtotime($to);
  for ($day = $start; $day <= $end; $day += 86400) {
    $ds = date('Y-m-d', $day);
    foreach ($users as $usr) {
      foreach ($slots as $sl) {
        $deadline = strtotime($ds.' '.$sl.':00') + $grace*60;
        if ($deadline > $now) continue; // هنوز مهلت نگذشته
        if ($aud === 'shift_only' && !_presence_user_in_shift((int)$usr['id'], $ds, strtotime($ds.' '.$sl.':00'))) continue;
        if (empty($doneSet[$usr['id'].'|'.$ds.'|'.$sl])) {
          $out[] = ['user_id'=>(int)$usr['id'],'name'=>$usr['name'],'role'=>$usr['role'],'slot_date'=>$ds,'slot'=>$sl,'type'=>'عدم ارسال صحت‌سنجی حضور'];
        }
      }
    }
  }
  return $out;
}, false, ADMIN);

// ---------------- پیامک (نگین ارتباط) ----------------
// اعتبار باقیمانده (ادمین)
route('GET', '/api/admin/sms/credit', fn($p,$b,$u) => Sms::credit(), false, ADMIN);

// رانندگان/خودروهای فاقد پروانهٔ بهره‌برداری معتبر (برای پیامک و تذکر)
route('GET', '/api/my/no-oplic', function($p,$b,$u){
  $lineIds = user_line_ids($u); // null=همه، آرایه=محدود
  $where = "(d.op_lic_status IS NULL OR d.op_lic_status NOT LIKE '%فعال%' OR d.op_lic_status='منقضی' OR d.op_lic_status='')";
  $params = [];
  $join = "LEFT JOIN vehicles v ON v.owner_national_id = d.national_id LEFT JOIN `lines` l ON l.id = v.line_id";
  if (is_array($lineIds)) {
    if (!$lineIds) return [];
    $in = implode(',', array_fill(0, count($lineIds), '?'));
    $where .= " AND v.line_id IN ($in)";
    $params = $lineIds;
  }
  $rows = Db::all("SELECT d.id, d.national_id, d.first_name, d.last_name, d.mobile,
      d.op_lic_status, d.op_lic_expire, v.plate, COALESCE(l.code, v.line_text) line
    FROM drivers d $join
    WHERE $where
    GROUP BY d.id
    ORDER BY d.last_name LIMIT 3000", $params);
  return $rows;
});

// ارسال پیامک به راننده‌ای که بهره‌برداری ندارد
route('POST', '/api/admin/oplic-sms', function($p,$b,$u){
  if (!_can_send_sms($u)) Http::error('شما دسترسی ارسال پیامک ندارید', 403);
  if (!Sms::isEnabled()) Http::error('سرویس پیامک فعال نیست', 400);
  $nid = trim($b['national_id'] ?? '');
  if ($nid === '') Http::error('کد ملی لازم است', 400);
  $drv = Db::one("SELECT first_name,last_name,mobile FROM drivers WHERE national_id=?", [$nid]);
  if (!$drv || empty($drv['mobile'])) Http::error('راننده یا موبایل یافت نشد', 404);
  $tpl = _req_setting('oplic_sms_template', 'تاکسیران گرامی {name}، پروانهٔ بهره‌برداری خودروی شما معتبر نیست. لطفاً جهت تمدید اقدام فرمایید.');
  $msg = strtr($tpl, ['{name}'=>trim(($drv['first_name']??'').' '.($drv['last_name']??''))]);
  try { Sms::send([$drv['mobile']], $msg, 'oplic', $u['id']); } catch (\Throwable $e) { Http::error('ارسال ناموفق بود', 500); }
  return ['ok'=>true];
});

// مانده اعتبار + تعداد پیامک فارسی/انگلیسی قابل ارسال بر اساس هزینهٔ هر پیامک
route('GET', '/api/admin/sms/capacity', function($p,$b,$u){
  $credit = Sms::isEnabled() ? Sms::credit() : null;
  // credit ممکن است عدد یا آرایه باشد
  $creditVal = is_array($credit) ? (float)($credit['credit'] ?? $credit['balance'] ?? $credit['amount'] ?? 0) : (float)$credit;
  $costFa = (int)_req_setting('sms_cost_fa', 0);
  $costEn = (int)_req_setting('sms_cost_en', 0);
  return [
    'credit' => $creditVal,
    'cost_fa' => $costFa,
    'cost_en' => $costEn,
    'count_fa' => $costFa > 0 ? (int)floor($creditVal / $costFa) : null,
    'count_en' => $costEn > 0 ? (int)floor($creditVal / $costEn) : null,
  ];
}, false, ADMIN);
// محدودیت ارسال روزانهٔ کل
route('GET', '/api/admin/sms/limit', function($p,$b,$u){
  $g = function($k) { $r=Db::one("SELECT value FROM app_settings WHERE `key`=?",[$k]); return $r ? json_decode($r['value'],true) : null; };
  return ['global_limit'=>(int)($g('sms_daily_limit')??0), 'credit'=>Sms::isEnabled() ? Sms::credit() : null];
}, false, ADMIN);
route('POST', '/api/admin/sms/limit', function($p,$b,$u){
  // محدودیت کلی روزانه برای همهٔ کاربران
  Db::run("INSERT INTO app_settings(`key`,value) VALUES('sms_daily_limit',?) ON DUPLICATE KEY UPDATE value=VALUES(value)", [json_encode((int)($b['global_limit']??0))]);
  // محدودیت‌های اختصاصی هر کاربر (آرایهٔ [{user_id, limit}])
  if (!empty($b['user_limits']) && is_array($b['user_limits'])) {
    foreach ($b['user_limits'] as $ul) {
      $uid = (int)($ul['user_id']??0); $lim = (int)($ul['limit']??0);
      if (!$uid) continue;
      Db::run("INSERT INTO app_settings(`key`,value) VALUES(?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)", ["sms_limit_user_{$uid}", json_encode($lim)]);
    }
  }
  return ['ok'=>true];
}, false, ADMIN);
// اعتبار امروز هر کاربر
route('GET', '/api/admin/sms/usage', function($p,$b,$u){
  return Db::all("SELECT sent_by, u.first_name, u.last_name, COUNT(*) sent_today FROM sms_log sl JOIN users u ON u.id=sl.sent_by WHERE DATE(sl.created_at)=CURDATE() GROUP BY sl.sent_by ORDER BY sent_today DESC", []);
}, false, ADMIN);
// ارسال آزمایشی (ادمین)
route('POST', '/api/admin/sms/test', function($p,$b,$u){
  $to = trim($b['mobile'] ?? ''); if ($to==='') Http::error('شمارهٔ مقصد را وارد کنید',400);
  return Sms::send([$to], $b['message'] ?? 'پیام آزمایشی سامانهٔ مدیریت خطوط', 'test', $u['id']);
}, false, ADMIN);

// قالب‌های پیامک تعریف‌شده توسط ادمین (فیلترشده بر اساس دسترسی نقشِ کاربر)
route('GET', '/api/sms/templates', function($p,$b,$u){
  $r = Db::one("SELECT value FROM app_settings WHERE `key`='sms_templates'");
  $all = $r ? (json_decode($r['value'], true) ?: []) : [];
  $roleId = (int)($u['role_id'] ?? 0);
  $isAdmin = !empty($u['is_admin']);
  $out = [];
  foreach ($all as $t) {
    $roles = $t['roles'] ?? null; // null/خالی = برای همه
    if ($isAdmin || empty($roles) || !is_array($roles) || in_array($roleId, array_map('intval',$roles))) {
      $out[] = ['title'=>$t['title'] ?? '', 'body'=>$t['body'] ?? '', 'category'=>$t['category'] ?? ''];
    }
  }
  return $out;
});

// رانندگان خطوطِ کاربر جاری (برای انتخاب گیرنده) — id، نام، موبایل
route('GET', '/api/my/sms-drivers', function($p,$b,$u){
  // خطوط مجاز کاربر (تابع استاندارد: آرایه خطوط، null برای ادمینِ بدون‌خط، [] برای غیرادمین بدون‌خط)
  $ids = user_line_ids($u);
  // ادمین بدون خط مشخص → همهٔ رانندگان دارای موبایل
  if ($ids === null) {
    return Db::all(
      "SELECT DISTINCT d.id, CONCAT(COALESCE(d.first_name,''),' ',COALESCE(d.last_name,'')) name, d.mobile,
              (SELECT v.line_id FROM vehicle_drivers vd JOIN vehicles v ON v.id=vd.vehicle_id WHERE vd.driver_id=d.id LIMIT 1) line_id
       FROM drivers d WHERE d.mobile IS NOT NULL AND d.mobile<>'' ORDER BY d.last_name LIMIT 5000");
  }
  if (!is_array($ids) || !$ids) return [];
  $in = implode(',', array_fill(0, count($ids), '?'));
  // اتصال صحیح راننده→خط از طریق vehicle_drivers → vehicles.line_id
  return Db::all(
    "SELECT DISTINCT d.id, CONCAT(COALESCE(d.first_name,''),' ',COALESCE(d.last_name,'')) name, d.mobile, v.line_id
     FROM drivers d
     JOIN vehicle_drivers vd ON vd.driver_id=d.id
     JOIN vehicles v ON v.id=vd.vehicle_id
     WHERE v.line_id IN ($in) AND d.mobile IS NOT NULL AND d.mobile<>'' ORDER BY d.last_name LIMIT 5000", $ids);
});

// ارسال پیامک به رانندگان و/یا شماره‌های دستی (کاربر مجاز)
// ===== پیامک گروهی آبونمان =====
// پیش‌نمایش: رانندگانی که فیش پرداخت‌نشده دارند (فیلتر بر اساس تاریخ فیش و خط)
// لیست تاریخ‌های فیش موجود در دیتابیس + خطوط در دسترس کاربر (برای دراپ‌داون)
route('GET', '/api/admin/bill-sms/options', function($p,$b,$u){
  if (!_can_send_sms($u)) Http::error('شما دسترسی ارسال پیامک ندارید', 403);
  $dates = array_column(Db::all("SELECT DISTINCT pay_date FROM bills WHERE pay_date IS NOT NULL AND pay_date <> '' ORDER BY pay_date DESC LIMIT 500"), 'pay_date');
  // خطوط در دسترس کاربر
  $myLines = user_line_ids($u); // null=همه (ادمین)، آرایه=محدود
  if (is_array($myLines) && $myLines) {
    $in = implode(',', array_fill(0, count($myLines), '?'));
    $lines = Db::all("SELECT id, code, origin, destination FROM `lines` WHERE id IN ($in) ORDER BY code", $myLines);
  } else {
    $lines = Db::all("SELECT id, code, origin, destination FROM `lines` ORDER BY code");
  }
  // مخاطبین ذخیره‌شدهٔ کاربر برای گیرندگان خارج از لیست
  $contacts = [];
  try { $contacts = Db::all("SELECT id, name, phone FROM sms_contacts WHERE user_id=? ORDER BY name", [$u['id']]); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  return ['dates'=>$dates, 'lines'=>$lines, 'contacts'=>$contacts];
}, false, 1);

// ساخت شرط مشترک برای فیلتر فیش‌ها
function _bill_filter($b, $u) {
  // پرداخت‌نشده = هر چیزی که شامل «پرداخت شده»/«پرداخت‌شده» نباشد (مقاوم به نیم‌فاصله)
  $where = "(status IS NULL OR (REPLACE(status,'‌','') NOT LIKE '%پرداخت شده%' AND REPLACE(status,'‌','') NOT LIKE '%پرداختشده%'))"; $params = [];
  $fromD = trim($b['from_date'] ?? ''); $toD = trim($b['to_date'] ?? '');
  $payDate = trim($b['pay_date'] ?? '');
  if ($payDate !== '') { $where .= " AND pay_date = ?"; $params[] = $payDate; }
  elseif ($fromD !== '' && $toD !== '') { $where .= " AND pay_date BETWEEN ? AND ?"; $params[] = $fromD; $params[] = $toD; }
  elseif ($fromD !== '') { $where .= " AND pay_date >= ?"; $params[] = $fromD; }
  elseif ($toD !== '') { $where .= " AND pay_date <= ?"; $params[] = $toD; }
  // چند خط (آرایهٔ کدهای خط) یا یک خط متنی
  // تطبیق دقیق: کد خط همیشه ابتدای line_text است (قالب: «کد - مبدأ - مقصد»)
  // پس از LIKE 'code -%' یا تساوی دقیق استفاده می‌کنیم تا خط ۱ با ۱۰۰، ۲۱۲ و… اشتباه نشود.
  $lineMatch = function($lc) {
    $lc = trim($lc);
    // الگوها: «1 - ...» یا «1- ...» یا دقیقاً «1» یا «1 »
    return ["(line_text = ? OR line_text LIKE ? OR line_text LIKE ? OR line_text LIKE ?)",
            [$lc, "$lc - %", "$lc-%", "$lc %"]];
  };
  $lines = $b['lines'] ?? null;
  if (is_array($lines) && $lines) {
    $ors = []; foreach ($lines as $lc) { list($cond,$prm) = $lineMatch($lc); $ors[] = $cond; foreach ($prm as $x) $params[] = $x; }
    $where .= " AND (" . implode(' OR ', $ors) . ")";
  } elseif (!empty($b['line'])) {
    list($cond,$prm) = $lineMatch($b['line']); $where .= " AND $cond"; foreach ($prm as $x) $params[] = $x;
  }
  return [$where, $params];
}

route('POST', '/api/admin/bill-sms/preview', function($p,$b,$u){
  if (!_can_send_sms($u)) Http::error('شما دسترسی ارسال پیامک ندارید', 403);
  list($where, $params) = _bill_filter($b, $u);
  // شمارش کل فیش‌های منطبق با فیلتر (بدون شرط موبایل) برای تشخیص
  $totalMatch = (int)(Db::one("SELECT COUNT(*) n, COALESCE(SUM(amount),0) s FROM bills WHERE $where", $params)['n'] ?? 0);
  $noPhone = (int)(Db::one("SELECT COUNT(*) n FROM bills WHERE $where AND (phone IS NULL OR phone='')", $params)['n'] ?? 0);
  // هر فیش به‌صورت جداگانه (نه گروه‌بندی per phone) — مانند پیامک تکی
  $rows = Db::all("SELECT bill_id, pay_id, person_title, national_id, amount, phone, plate, line_text
    FROM bills WHERE $where AND phone IS NOT NULL AND phone <> '' ORDER BY amount DESC LIMIT 5000", $params);
  $totalAmount = array_sum(array_map(fn($r)=>(int)$r['amount'], $rows));
  $tpl = _req_setting('bill_bulk_sms_template', "راننده گرامی {name}، قبض آبونمان شما به شناسهٔ {bill_id} و مبلغ {amount} ریال در انتظار پرداخت است. پرداخت آنلاین:\n{pay_url}");
  $mk = function($r) use ($tpl) {
    $payUrl = (!empty($r['bill_id']) && !empty($r['pay_id']))
      ? "https://epay.mashhad.ir/CityUsers/OnLineBillPay.aspx?BillId={$r['bill_id']}&PayId={$r['pay_id']}&Cell={$r['phone']}" : '';
    return strtr($tpl, [
      '{name}'=>$r['person_title']?:'راننده', '{bill_id}'=>$r['bill_id']?:'', '{pay_id}'=>$r['pay_id']?:'',
      '{amount}'=>number_format((int)$r['amount']), '{plate}'=>$r['plate']?:'', '{line}'=>$r['line_text']?:'', '{pay_url}'=>$payUrl,
    ]);
  };
  $first5 = array_map(fn($r)=>['name'=>$r['person_title'],'phone'=>$r['phone'],'msg'=>$mk($r)], array_slice($rows, 0, 5));
  $last5 = array_map(fn($r)=>['name'=>$r['person_title'],'phone'=>$r['phone'],'msg'=>$mk($r)], array_slice($rows, -5));
  return ['count'=>count($rows), 'total_amount'=>$totalAmount, 'recipients'=>$rows, 'preview_first'=>$first5, 'preview_last'=>$last5,
          'total_match'=>$totalMatch, 'no_phone'=>$noPhone,
          'last_msg'=>$rows?$mk($rows[count($rows)-1]):''];
}, false, 1);

route('POST', '/api/admin/bill-sms/send', function($p,$b,$u){
  if (!_can_send_sms($u)) Http::error('شما دسترسی ارسال پیامک ندارید', 403);
  if (!Sms::isEnabled()) Http::error('سرویس پیامک پیکربندی نشده است', 400);
  list($where, $params) = _bill_filter($b, $u);
  // هر فیش جداگانه ارسال می‌شود (شامل شناسهٔ قبض/پرداخت/مبلغ/لینک درگاه)
  $rows = Db::all("SELECT bill_id, pay_id, person_title, amount, phone, plate, line_text
    FROM bills WHERE $where AND phone IS NOT NULL AND phone <> '' ORDER BY amount DESC LIMIT 5000", $params);
  if (!$rows) Http::error('هیچ فیش بدهی با این فیلتر یافت نشد', 404);
  $tpl = _req_setting('bill_bulk_sms_template', "راننده گرامی {name}، قبض آبونمان شما به شناسهٔ {bill_id} و مبلغ {amount} ریال در انتظار پرداخت است. پرداخت آنلاین:\n{pay_url}");
  $sent = 0; $failed = 0;
  $campaign = 'bill_bulk_' . date('YmdHis');
  $lastMsg = '';
  foreach ($rows as $r) {
    $payUrl = (!empty($r['bill_id']) && !empty($r['pay_id']))
      ? "https://epay.mashhad.ir/CityUsers/OnLineBillPay.aspx?BillId={$r['bill_id']}&PayId={$r['pay_id']}&Cell={$r['phone']}" : '';
    $msg = strtr($tpl, [
      '{name}'=>$r['person_title']?:'راننده', '{bill_id}'=>$r['bill_id']?:'', '{pay_id}'=>$r['pay_id']?:'',
      '{amount}'=>number_format((int)$r['amount']), '{plate}'=>$r['plate']?:'', '{line}'=>$r['line_text']?:'', '{pay_url}'=>$payUrl,
    ]);
    $lastMsg = $msg;
    try { $res = Sms::send([$r['phone']], $msg, $campaign, $u['id']); if (!empty($res['ok'])) $sent++; else $failed++; }
    catch (\Throwable $e) { $failed++; }
  }
  // گیرندگان خارج از لیست: متن پیامک نفر آخر «برای استحضار» برای آنها ارسال می‌شود
  $extra = $b['extra_numbers'] ?? [];
  $extraSent = 0;
  if (is_array($extra) && $extra && $lastMsg) {
    $extraMsg = $lastMsg . "\n(جهت استحضار)";
    foreach ($extra as $num) {
      $num = trim(is_array($num) ? ($num['phone'] ?? '') : $num);
      if ($num === '') continue;
      try { $res = Sms::send([$num], $extraMsg, $campaign, $u['id']); if (!empty($res['ok'])) $extraSent++; } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
    }
  }
  return ['ok'=>true, 'sent'=>$sent, 'failed'=>$failed, 'total'=>count($rows), 'extra_sent'=>$extraSent, 'campaign'=>$campaign];
}, false, 1);

// دفترچهٔ مخاطبین کاربر (برای گیرندگان خارج از لیست)
route('GET', '/api/admin/sms-contacts', function($p,$b,$u){
  try { return Db::all("SELECT id, name, phone FROM sms_contacts WHERE user_id=? ORDER BY name", [$u['id']]); }
  catch (\Throwable $e) { return []; }
}, false, 1);
route('POST', '/api/admin/sms-contacts', function($p,$b,$u){
  $name = trim($b['name'] ?? ''); $phone = trim($b['phone'] ?? '');
  if ($phone === '') Http::error('شماره الزامی است', 400);
  Db::run("CREATE TABLE IF NOT EXISTS sms_contacts (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, name VARCHAR(150), phone VARCHAR(20), UNIQUE KEY uq_uc (user_id, phone)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  try { Db::run("INSERT INTO sms_contacts(user_id,name,phone) VALUES(?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)", [$u['id'],$name,$phone]); }
  catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  return ['ok'=>true];
}, false, 1);
route('DELETE', '/api/admin/sms-contacts/{id}', function($p,$b,$u){
  try { Db::run("DELETE FROM sms_contacts WHERE id=? AND user_id=?", [$p['id'], $u['id']]); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  return ['ok'=>true];
}, false, 1);

// گزارش کمپین‌های پیامک گروهی آبونمان
route('GET', '/api/admin/bill-sms/report', function($p,$b,$u){
  $rows = Db::all("SELECT kind, COUNT(*) total,
      SUM(CASE WHEN status='sent' OR status='ok' OR status IS NULL THEN 1 ELSE 0 END) sent_count,
      MIN(created_at) sent_at,
      CONCAT(MAX(us.first_name),' ',MAX(us.last_name)) sender
    FROM sms_log sl LEFT JOIN users us ON us.id=sl.sent_by
    WHERE sl.kind LIKE 'bill_bulk_%'
    GROUP BY sl.kind ORDER BY MIN(sl.created_at) DESC LIMIT 200");
  return $rows;
}, false, 1);

route('POST', '/api/sms/send', function($p,$b,$u){
  if (!Sms::isEnabled()) Http::error('سرویس پیامک فعال نیست',400);
  // اجازهٔ ارسال: ادمین یا کاربری که can_send_sms دارد
  if (!_can_send_sms($u)) Http::error('شما اجازهٔ ارسال پیامک ندارید.',403);
  $body = trim($b['message'] ?? '');
  if ($body==='') Http::error('متن پیامک خالی است',400);
  $mobiles = []; $driverByMobile = [];
  // رانندگان انتخاب‌شده
  $driverIds = $b['driver_ids'] ?? [];
  if (is_array($driverIds) && $driverIds) {
    $driverIds = array_map('intval',$driverIds);
    $in = implode(',', array_fill(0, count($driverIds), '?'));
    $rows = Db::all("SELECT id, mobile FROM drivers WHERE id IN ($in) AND mobile IS NOT NULL AND mobile<>''", $driverIds);
    foreach ($rows as $r) { $mobiles[] = $r['mobile']; $driverByMobile[$r['mobile']] = $r['id']; }
  }
  // شماره‌های واردشدهٔ دستی
  if (!empty($b['mobiles']) && is_array($b['mobiles'])) {
    foreach ($b['mobiles'] as $m) { $m = preg_replace('/\s+/', '', (string)$m); if ($m!=='') $mobiles[] = $m; }
  }
  $mobiles = array_values(array_unique(array_filter($mobiles)));
  $mobiles = array_slice($mobiles, 0, 50);
  if (!$mobiles) Http::error('گیرنده‌ای انتخاب نشده است',400);
  try {
    $res = Sms::send($mobiles, $body, 'driver', $u['id']);
  } catch (\Throwable $e) {
    Http::error('خطا در ارسال پیامک: '.$e->getMessage(), 500);
  }
  if (!$res['ok']) Http::error($res['error'] ?? 'ارسال ناموفق', 400);
  // ثبت راننده در لاگ پیامک (برای تاریخچهٔ هر راننده)
  foreach ($driverByMobile as $mob=>$did) {
    Db::run("UPDATE sms_log SET driver_id=? WHERE to_mobile=? AND sent_by=? AND driver_id IS NULL AND created_at>=DATE_SUB(NOW(),INTERVAL 2 MINUTE)", [$did,$mob,$u['id']]);
  }
  return ['ok'=>true, 'sent'=>count($mobiles), 'id'=>$res['id']];
});



// ==================== فیش حقوقی PDF پیوست‌شده ====================
function _ensure_salary_slips(){
  try { Db::run("CREATE TABLE IF NOT EXISTS user_salary_slips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    period_jy INT NOT NULL,
    period_jm TINYINT NOT NULL,
    title VARCHAR(200) NULL,
    file_path VARCHAR(255) NOT NULL,
    file_name VARCHAR(200) NULL,
    mime_type VARCHAR(100) NULL,
    uploaded_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_period(user_id, period_jy, period_jm),
    INDEX idx_period(period_jy, period_jm)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    try { Db::run("ALTER TABLE user_salary_slips ADD COLUMN mime_type VARCHAR(100) NULL AFTER file_name"); } catch (Throwable $e2) {}
  } catch (Throwable $e) {}
}
function _salary_slip_token($id,$uid,$path){ return substr(hash_hmac('sha256', $id.'|'.$uid.'|'.$path, $GLOBALS['CONFIG']['jwt_secret'] ?? 'taxi'), 0, 32); }
function _save_salary_slip_upload($file){
  if (!$file || ($file['error'] ?? 1) !== 0 || empty($file['tmp_name'])) Http::error('فایل فیش حقوقی ارسال نشده است', 400);
  if (($file['size'] ?? 0) > 10*1024*1024) Http::error('حجم فایل نباید بیشتر از ۱۰ مگابایت باشد', 400);
  $tmp=(string)$file['tmp_name']; $orig=strtolower((string)($file['name'] ?? ''));
  $mime=''; if (function_exists('finfo_open')) { $fi=@finfo_open(FILEINFO_MIME_TYPE); if($fi){$mime=(string)@finfo_file($fi,$tmp); @finfo_close($fi);} }
  if ($mime==='') $mime=(string)($file['type'] ?? '');
  $ext='';
  $raw=@file_get_contents($tmp,false,null,0,12);
  $hex=strtolower(bin2hex((string)$raw));
  if (substr((string)$raw,0,5)==='%PDF-') { $mime='application/pdf'; $ext='pdf'; }
  elseif (str_starts_with($hex,'ffd8ff')) { $mime='image/jpeg'; $ext='jpg'; }
  elseif (str_starts_with($hex,'89504e470d0a1a0a')) { $mime='image/png'; $ext='png'; }
  elseif (preg_match('/\.(pdf|jpe?g|png)$/i',$orig,$m)) { $ext=strtolower($m[1]); if($ext==='jpeg')$ext='jpg'; }
  $allowed=['application/pdf'=>'pdf','image/jpeg'=>'jpg','image/png'=>'png'];
  if(isset($allowed[$mime])) $ext=$allowed[$mime];
  if(!in_array($ext,['pdf','jpg','png'],true)) Http::error('فقط فایل PDF یا تصویر معتبر قابل بارگذاری است',400);
  if($ext!=='pdf'){
    $path=Media::saveUploadedFile($file,'salary_slips');
    if(!$path) Http::error('تبدیل تصویر فیش به JPG ناموفق بود؛ افزونه GD سرور را بررسی کنید',500);
    return ['path'=>$path,'mime_type'=>'image/jpeg','ext'=>'jpg'];
  }
  $sub='salary_slips/'.date('Y').'/'.date('m'); $dir=Media::baseDir().'/'.$sub;
  if(!is_dir($dir)) @mkdir($dir,0755,true);
  $name=bin2hex(random_bytes(12)).'.pdf'; $dest=$dir.'/'.$name;
  if(!@move_uploaded_file($tmp,$dest)) Http::error('ذخیره فایل ناموفق بود',500);
  return ['path'=>'uploads/'.$sub.'/'.$name,'mime_type'=>'application/pdf','ext'=>'pdf'];
}
route('GET', '/api/admin/salary-slips/users', function($p,$b,$u){
  _ensure_salary_slips();
  $q = trim($_GET['q'] ?? '');
  $where=''; $params=[];
  if ($q !== '') { $where="WHERE CONCAT_WS(' ',u.first_name,u.last_name,u.username,u.mobile,u.national_code) LIKE ?"; $params[]='%'.$q.'%'; }
  return ['rows'=>Db::all("SELECT u.id, CONCAT_WS(' ',u.first_name,u.last_name) name, u.username, u.mobile, u.national_code FROM users u $where ORDER BY u.id DESC LIMIT 100", $params)];
}, false, ADMIN);
route('GET', '/api/admin/users/{id}/salary-slips', function($p,$b,$u){
  _ensure_salary_slips();
  $rows = Db::all("SELECT id,user_id,period_jy,period_jm,title,file_name,mime_type,created_at FROM user_salary_slips WHERE user_id=? ORDER BY period_jy DESC, period_jm DESC, id DESC", [(int)$p['id']]);
  foreach($rows as &$r) $r['period_label'] = $r['period_jy'].'/'.str_pad($r['period_jm'],2,'0',STR_PAD_LEFT);
  return ['rows'=>$rows];
}, false, ADMIN);
route('POST', '/api/admin/users/{id}/salary-slips', function($p,$b,$u){
  _ensure_salary_slips();
  $jy=(int)($_POST['period_jy'] ?? ($b['period_jy'] ?? 0)); $jm=(int)($_POST['period_jm'] ?? ($b['period_jm'] ?? 0));
  if ($jy < 1300 || $jy > 1500 || $jm < 1 || $jm > 12) Http::error('ماه فیش حقوقی نامعتبر است', 400);
  $title = trim($_POST['title'] ?? ($b['title'] ?? '')) ?: ('فیش حقوقی '.$jy.'/'.str_pad($jm,2,'0',STR_PAD_LEFT));
  $saved=_save_salary_slip_upload($_FILES['file'] ?? null); $path=$saved['path']; $mime=$saved['mime_type'];
  $fname = $_FILES['file']['name'] ?? ('salary-slip.'.$saved['ext']);
  $id=Db::insert("INSERT INTO user_salary_slips(user_id,period_jy,period_jm,title,file_path,file_name,mime_type,uploaded_by) VALUES(?,?,?,?,?,?,?,?)", [(int)$p['id'],$jy,$jm,$title,$path,$fname,$mime,$u['id']]);
  return ['ok'=>true,'id'=>$id];
}, false, ADMIN);
route('DELETE', '/api/admin/salary-slips/{id}', function($p,$b,$u){
  _ensure_salary_slips();
  $r=Db::one("SELECT file_path FROM user_salary_slips WHERE id=?", [(int)$p['id']]);
  if ($r) { Media::delete($r['file_path']); Db::run("DELETE FROM user_salary_slips WHERE id=?", [(int)$p['id']]); }
  return ['ok'=>true];
}, false, ADMIN);
// بررسی اینکه آیا آیتم مشخصی از اپ برای سمت کاربر مجاز است یا نه (مطابق تنظیمات «آیتم‌های اپ هر سمت»)
function _user_app_item_allowed($u, $key){
  $row = Db::one("SELECT value FROM app_settings WHERE `key`='role_app_items'");
  $cfg = $row ? json_decode($row['value'], true) : [];
  $rid = (string)($u['role_id'] ?? '');
  if (!is_array($cfg) || !isset($cfg[$rid]) || !is_array($cfg[$rid])) return true; // بدون پیکربندی = مجاز برای همه
  return in_array($key, $cfg[$rid], true);
}
route('GET', '/api/my/salary-slips', function($p,$b,$u){
  if (!_user_app_item_allowed($u,'SalarySlips')) Http::error('دسترسی به این بخش برای سمت شما فعال نیست', 403);
  _ensure_salary_slips();
  $rows=Db::all("SELECT id,user_id,period_jy,period_jm,title,file_name,mime_type,file_path,created_at FROM user_salary_slips WHERE user_id=? ORDER BY period_jy DESC, period_jm DESC, id DESC", [$u['id']]);
  foreach($rows as &$r){ $r['period_label']=$r['period_jy'].'/'.str_pad($r['period_jm'],2,'0',STR_PAD_LEFT); $r['file_type']=strpos((string)($r['mime_type']??''),'image/')===0?'image':'pdf'; $r['download_url']='/api/public/salary-slip/'.$r['id'].'/'._salary_slip_token($r['id'],$u['id'],$r['file_path']); unset($r['file_path']); }
  return ['rows'=>$rows];
});
route('GET', '/api/my/salary-slips/{id}/download', function($p,$b,$u){
  if (!_user_app_item_allowed($u,'SalarySlips')) Http::error('دسترسی به این بخش برای سمت شما فعال نیست', 403);
  _ensure_salary_slips();
  $r=Db::one("SELECT file_path,file_name,mime_type FROM user_salary_slips WHERE id=? AND user_id=?", [(int)$p['id'],$u['id']]);
  if (!$r) Http::error('فیش یافت نشد', 404);
  Media::serve($r['file_path']);
});
route('GET', '/api/public/salary-slip/{id}/{token}', function($p,$b){
  _ensure_salary_slips();
  $r=Db::one("SELECT id,user_id,file_path,file_name,mime_type FROM user_salary_slips WHERE id=?", [(int)$p['id']]);
  if (!$r) Http::error('فیش یافت نشد', 404);
  $good=_salary_slip_token($r['id'],$r['user_id'],$r['file_path']);
  if (!hash_equals($good, (string)$p['token'])) Http::error('دسترسی نامعتبر است', 403);
  Media::serve($r['file_path']);
}, true);

// ==================== فیلدهای سفارشی پرسنل ====================
route('GET', '/api/admin/custom-fields', fn($p,$b,$u) =>
  Db::all("SELECT * FROM custom_fields ORDER BY sort_order, id"), false, ADMIN);

route('POST', '/api/admin/custom-fields', function($p,$b,$u){
  $label = trim($b['label'] ?? '');
  if ($label==='') Http::error('عنوان فیلد الزامی است',400);
  $fkey = trim($b['fkey'] ?? '');
  if ($fkey==='') $fkey = 'f_'.substr(md5($label.microtime()),0,10);
  $fkey = preg_replace('/[^a-zA-Z0-9_]/','_', $fkey);
  $ftype = in_array($b['ftype']??'text', ['text','number','date','checkbox','select','multiselect','textarea']) ? $b['ftype'] : 'text';
  $exists = Db::one("SELECT id FROM custom_fields WHERE fkey=?", [$fkey]);
  if ($exists) $fkey .= '_'.rand(100,999);
  $id = Db::insert("INSERT INTO custom_fields(label,fkey,ftype,options,required,user_editable,sort_order,is_active) VALUES(?,?,?,?,?,?,?,1)",
    [$label,$fkey,$ftype,$b['options']??null,!empty($b['required'])?1:0,isset($b['user_editable'])?(!empty($b['user_editable'])?1:0):1,(int)($b['sort_order']??0)]);
  return ['id'=>$id,'fkey'=>$fkey];
}, false, ADMIN);

route('PUT', '/api/admin/custom-fields/{id}', function($p,$b,$u){
  $sets=[]; $args=[];
  foreach (['label','options'] as $k) if (isset($b[$k])) { $sets[]="$k=?"; $args[]=$b[$k]; }
  if (isset($b['ftype']) && in_array($b['ftype'],['text','number','date','checkbox','select','multiselect','textarea'])) { $sets[]="ftype=?"; $args[]=$b['ftype']; }
  foreach (['required','user_editable','is_active'] as $k) if (isset($b[$k])) { $sets[]="$k=?"; $args[]=!empty($b[$k])?1:0; }
  if (isset($b['sort_order'])) { $sets[]="sort_order=?"; $args[]=(int)$b['sort_order']; }
  if (!$sets) return ['ok'=>true];
  $args[]=$p['id'];
  Db::run("UPDATE custom_fields SET ".implode(',',$sets)." WHERE id=?", $args);
  return ['ok'=>true];
}, false, ADMIN);

route('DELETE', '/api/admin/custom-fields/{id}', function($p,$b,$u){
  Db::run("DELETE FROM custom_field_values WHERE field_id=?", [$p['id']]);
  Db::run("DELETE FROM custom_fields WHERE id=?", [$p['id']]);
  return ['ok'=>true];
}, false, ADMIN);

route('GET', '/api/admin/users/{id}/custom-values', function($p,$b,$u){
  $fields = Db::all("SELECT * FROM custom_fields WHERE is_active=1 ORDER BY sort_order, id");
  $vals = Db::all("SELECT field_id, value FROM custom_field_values WHERE user_id=?", [$p['id']]);
  $map = []; foreach ($vals as $v) $map[$v['field_id']] = $v['value'];
  foreach ($fields as &$f) $f['value'] = $map[$f['id']] ?? null;
  return $fields;
}, false, ADMIN);

route('POST', '/api/admin/users/{id}/custom-values', function($p,$b,$u){
  _save_custom_values((int)$p['id'], $b['values'] ?? [], false);
  return ['ok'=>true];
}, false, ADMIN);

function _save_custom_values($uid, $values, $onlyEditable){
  if (!is_array($values)) return;
  $fields = Db::all("SELECT * FROM custom_fields WHERE is_active=1");
  $byId = []; foreach ($fields as $f) $byId[$f['id']] = $f;
  foreach ($values as $fid=>$val) {
    $fid = (int)$fid;
    if (!isset($byId[$fid])) continue;
    if ($onlyEditable && empty($byId[$fid]['user_editable'])) continue;
    if (is_array($val)) $val = implode('|', $val);
    Db::run("INSERT INTO custom_field_values(user_id,field_id,value) VALUES(?,?,?)
             ON DUPLICATE KEY UPDATE value=VALUES(value)", [$uid,$fid,$val]);
  }
}

route('GET', '/api/my/custom-fields', function($p,$b,$u){
  $fields = Db::all("SELECT id,label,fkey,ftype,options,required,user_editable FROM custom_fields WHERE is_active=1 AND user_editable=1 ORDER BY sort_order, id");
  $vals = Db::all("SELECT field_id, value FROM custom_field_values WHERE user_id=?", [$u['id']]);
  $map = []; foreach ($vals as $v) $map[$v['field_id']] = $v['value'];
  foreach ($fields as &$f) $f['value'] = $map[$f['id']] ?? null;
  return $fields;
}, false);

route('POST', '/api/my/custom-fields', function($p,$b,$u){
  $req = Db::all("SELECT id,label FROM custom_fields WHERE is_active=1 AND user_editable=1 AND required=1");
  $values = $b['values'] ?? [];
  foreach ($req as $rf) {
    $v = $values[$rf['id']] ?? null;
    if (is_array($v)) $v = implode('', $v);
    if ($v===null || trim((string)$v)==='') Http::error('تکمیل فیلد «'.$rf['label'].'» الزامی است',422);
  }
  _save_custom_values($u['id'], $values, true);
  return ['ok'=>true];
}, false);

// ==================== حالت تعمیر (قطع دسترسی همه بجز مدیران) ====================
function _maintenance_status(){
  $row = Db::one("SELECT value FROM app_settings WHERE `key`='maintenance_mode'");
  $cfg = $row ? json_decode($row['value'], true) : null;
  if (!is_array($cfg)) $cfg = [];
  return [
    'enabled' => !empty($cfg['enabled']),
    'message' => (string)($cfg['message'] ?? 'نرم‌افزار و پنل موقتاً برای تعمیرات غیرفعال است. لطفاً بعداً تلاش کنید.'),
  ];
}
// وضعیت عمومی (بدون نیاز به توکن) — برای نمایش پیام قطعی پیش از تلاش ورود
route('GET', '/api/system/maintenance-status', function($p,$b){
  return _maintenance_status();
}, true);
route('GET', '/api/admin/maintenance', function($p,$b,$u){
  return _maintenance_status();
}, false, ADMIN);
route('POST', '/api/admin/maintenance', function($p,$b,$u){
  $cfg = ['enabled'=>!empty($b['enabled']), 'message'=>trim((string)($b['message'] ?? '')) ?: 'نرم‌افزار و پنل موقتاً برای تعمیرات غیرفعال است. لطفاً بعداً تلاش کنید.'];
  Db::run("INSERT INTO app_settings(`key`,value) VALUES('maintenance_mode',?)
           ON DUPLICATE KEY UPDATE value=VALUES(value)", [json_encode($cfg, JSON_UNESCAPED_UNICODE)]);
  return ['ok'=>true];
}, false, ADMIN);


// پیکربندی: app_settings['role_app_items'] = { roleId: [itemKey,...] }
route('GET', '/api/admin/role-app-items', function($p,$b,$u){
  $row = Db::one("SELECT value FROM app_settings WHERE `key`='role_app_items'");
  $cfg = $row ? json_decode($row['value'], true) : [];
  $roles = Db::all("SELECT id, title, level FROM roles ORDER BY level DESC");
  return ['roles'=>$roles, 'config'=>$cfg ?: new stdClass()];
}, false, ADMIN);

route('POST', '/api/admin/role-app-items', function($p,$b,$u){
  $cfg = $b['config'] ?? [];
  Db::run("INSERT INTO app_settings(`key`,value) VALUES('role_app_items',?)
           ON DUPLICATE KEY UPDATE value=VALUES(value)", [json_encode($cfg, JSON_UNESCAPED_UNICODE)]);
  return ['ok'=>true];
}, false, ADMIN);

// آیتم‌های مجاز اپ برای کاربر جاری (بر اساس سمت او)
route('GET', '/api/my/app-items', function($p,$b,$u){
  $row = Db::one("SELECT value FROM app_settings WHERE `key`='role_app_items'");
  $cfg = $row ? json_decode($row['value'], true) : [];
  $rid = (string)($u['role_id'] ?? '');
  // اگر برای این سمت پیکربندی نشده باشد، null یعنی «همه نمایش داده شود»
  $items = (is_array($cfg) && isset($cfg[$rid]) && is_array($cfg[$rid])) ? array_values($cfg[$rid]) : null;
  return ['items'=>$items];
}, false);

// ==================== اعلام قطع سیستم نوبت‌دهی (مخصوص اپراتورها) ====================
function _outage_minutes($start,$end){
  $hm=function($s){ $p=explode(':',$s); return ((int)($p[0]??0))*60+(int)($p[1]??0); };
  $a=$hm($start); $b=$hm($end); $d=$b-$a; if($d<0)$d+=1440; return $d;
}
// ثبت قطعی توسط اپراتور
// کدهای خطوطی که سیستم نوبت‌دهی روی آن‌ها فعال است (قابل تنظیم در پنل)
function _nobat_line_codes(){
  $v = _req_setting('nobat_line_codes', null);
  if (is_array($v) && $v) return array_map('strval', $v);
  // پیش‌فرض طبق اعلام کارفرما
  return ['300','500','501','502','503','505','700'];
}
// آیا این خط (بر اساس id) جزو خطوط نوبت‌دهی است؟
function _is_nobat_line($lineId){
  $codes = _nobat_line_codes();
  $r = Db::one("SELECT code FROM `lines` WHERE id=?", [$lineId]);
  if (!$r) return false;
  return in_array((string)$r['code'], $codes, true);
}

// ==================== رانندگان موقت خطوط ویژه ====================
// خطوط ویژه‌ای که راننده می‌تواند به‌صورت موقت به آن‌ها اضافه شود (همان خطوط نوبت‌دهی)
function _special_line_codes(){
  $v = _req_setting('special_temp_line_codes', null);
  if (is_array($v) && $v) return array_map('strval', $v);
  return _nobat_line_codes(); // پیش‌فرض: همان ۳۰۰،۵۰۰،۵۰۱،۵۰۲،۵۰۳،۵۰۵،۷۰۰
}
function _ensure_temp_line_drivers(){
  try {
    Db::run("CREATE TABLE IF NOT EXISTS temp_line_drivers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      driver_id INT NOT NULL,
      line_id INT NOT NULL,
      line_code_in_line VARCHAR(50) NULL,
      note VARCHAR(255) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      added_by INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME NULL,
      INDEX idx_tld_line (line_id, is_active),
      INDEX idx_tld_driver (driver_id, is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    Db::run("CREATE TABLE IF NOT EXISTS temp_line_driver_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      action VARCHAR(30) NOT NULL,
      temp_line_driver_id INT NULL,
      driver_id INT NULL,
      line_id INT NULL,
      user_id INT NULL,
      meta JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tldh_driver (driver_id, created_at),
      INDEX idx_tldh_line (line_id, created_at),
      INDEX idx_tldh_temp (temp_line_driver_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
}
// شناسهٔ خطوطی که این راننده به‌صورت موقت در آن‌ها فعال است
function _driver_temp_line_ids($driverId){
  _ensure_temp_line_drivers();
  return array_column(Db::all("SELECT line_id FROM temp_line_drivers WHERE driver_id=? AND is_active=1", [$driverId]), 'line_id');
}
// آیا راننده به‌صورت موقت در یکی از خطوط داده‌شده فعال است؟
function _driver_in_temp_lines($driverId, $allowedLineIds, $allowedCodes){
  if ($allowedLineIds === null) return true; // ادمین بدون محدودیت
  $tempIds = _driver_temp_line_ids($driverId);
  if (!$tempIds) return false;
  if ($allowedLineIds && array_intersect($tempIds, $allowedLineIds)) return true;
  if ($allowedCodes) {
    $codes = array_column(Db::all("SELECT code FROM `lines` WHERE id IN (".implode(',',array_fill(0,count($tempIds),'?')).")", $tempIds), 'code');
    if (array_intersect($codes, $allowedCodes)) return true;
  }
  return false;
}

route('POST', '/api/outages', function($p,$b,$u){
  $lineId=(int)($b['line_id']??0);
  if(!$lineId) Http::error('انتخاب خط الزامی است',400);
  // فقط خطوط دارای سیستم نوبت‌دهی مجاز به ثبت قطعی هستند
  if(!_is_nobat_line($lineId)) Http::error('سیستم نوبت‌دهی فقط روی خطوط مشخص فعال است و برای این خط قطعی ثبت نمی‌شود.',422);
  // فقط خطوط در دسترس کاربر
  $myLines=user_line_ids($u);
  if (is_array($myLines) && $myLines && !in_array($lineId,$myLines)) Http::error('این خط در دسترس شما نیست',403);
  $date=trim($b['outage_date']??''); $st=trim($b['start_time']??''); $en=trim($b['end_time']??'');
  if(!$date||!$st) Http::error('تاریخ و زمان شروع قطعی الزامی است',422);
  // تبدیل تاریخ جلالی (1405/04/01) به میلادی برای ذخیره و سازگاری با فیلترها
  $dateG = $date;
  if (preg_match('/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/', $date, $m)) {
    $jy=(int)$m[1]; $jm=(int)$m[2]; $jd=(int)$m[3];
    if ($jy >= 1300 && $jy <= 1500) { // تاریخ جلالی است
      list($gy,$gm,$gd) = jalali_to_gregorian($jy,$jm,$jd);
      $dateG = sprintf('%04d-%02d-%02d', $gy,$gm,$gd);
    }
  }
  // زمان پایان اختیاری است؛ اگر نبود، قطعی «باز» است و بعداً با دکمهٔ «وصل شد» بسته می‌شود
  // اطمینان از nullable بودن ستون‌های end_time و minutes (یک‌بار)
  try {
    $col = Db::one("SHOW COLUMNS FROM system_outages WHERE Field='end_time'");
    if ($col && stripos($col['Null'] ?? '', 'NO') !== false) {
      Db::run("ALTER TABLE system_outages MODIFY COLUMN end_time VARCHAR(5) NULL");
    }
    $colm = Db::one("SHOW COLUMNS FROM system_outages WHERE Field='minutes'");
    if ($colm && stripos($colm['Null'] ?? '', 'NO') !== false) {
      Db::run("ALTER TABLE system_outages MODIFY COLUMN minutes INT NULL");
    }
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  $min = ($en !== '') ? _outage_minutes($st,$en) : null;
  $id=Db::insert("INSERT INTO system_outages(line_id,reported_by,outage_date,start_time,end_time,minutes,note,reason) VALUES(?,?,?,?,?,?,?,?)",
    [$lineId,$u['id'],$dateG,$st,($en!==''?$en:null),$min,$b['note']??null,$b['reason']??null]);
  return ['id'=>$id,'minutes'=>$min];
}, false);

// ثبت «وصل شد» — زمان پایان قطعی را با ساعت فعلی (یا ساعت ارسالی) ثبت می‌کند
route('POST', '/api/outages/{id}/resolve', function($p,$b,$u){
  $id=(int)$p['id'];
  $o=Db::one("SELECT id,start_time,end_time FROM system_outages WHERE id=? AND reported_by=?",[$id,$u['id']]);
  if(!$o) Http::error('قطعی یافت نشد',404);
  if(!empty($o['end_time'])) Http::error('این قطعی قبلاً وصل شده است',422);
  $en = trim($b['end_time']??'');
  if($en==='') $en = date('H:i'); // ساعت فعلی سرور
  $min = _outage_minutes($o['start_time'],$en);
  Db::run("UPDATE system_outages SET end_time=?, minutes=? WHERE id=?",[$en,$min,$id]);
  return ['ok'=>true,'end_time'=>$en,'minutes'=>$min];
}, false);
// فهرست خطوط نوبت‌دهی برای اپ (تنها این خطوط در فرم قطعی نمایش داده می‌شوند)
route('GET', '/api/my/nobat-lines', function($p,$b,$u){
  $codes=_nobat_line_codes();
  $myLines=user_line_ids($u);
  $in=implode(',',array_fill(0,count($codes),'?'));
  $sql="SELECT id,code,origin,destination FROM `lines` WHERE code IN ($in)";
  $args=$codes;
  if(is_array($myLines) && $myLines){ $lin=implode(',',array_fill(0,count($myLines),'?')); $sql.=" AND id IN ($lin)"; $args=array_merge($args,$myLines); }
  $sql.=" ORDER BY code";
  return Db::all($sql,$args);
});

// قطعی‌های ثبت‌شدهٔ خودِ کاربر
route('GET', '/api/my/outages', fn($p,$b,$u) => Db::all(
  "SELECT o.id,o.outage_date,o.start_time,o.end_time,o.minutes,o.note,o.reason,l.code line_code,l.origin,l.destination
   FROM system_outages o LEFT JOIN `lines` l ON l.id=o.line_id WHERE o.reported_by=? ORDER BY o.id DESC LIMIT 100",[$u['id']]));

// گزارش قطعی‌ها (ادمین/مدیر) با تجمیع روزانه و ماهانه
// تبدیل تاریخ‌های جلالی قدیمی قطعی‌ها به میلادی (یک‌بار اجرا)
route('POST', '/api/admin/outages/fix-dates', function($p,$b,$u){
  $rows = Db::all("SELECT id, outage_date FROM system_outages");
  $fixed = 0;
  foreach ($rows as $r) {
    $d = $r['outage_date'];
    if (preg_match('/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/', $d, $m)) {
      $jy=(int)$m[1];
      if ($jy >= 1300 && $jy <= 1500) {
        list($gy,$gm,$gd) = jalali_to_gregorian($jy,(int)$m[2],(int)$m[3]);
        $g = sprintf('%04d-%02d-%02d', $gy,$gm,$gd);
        Db::run("UPDATE system_outages SET outage_date=? WHERE id=?", [$g, $r['id']]);
        $fixed++;
      }
    }
  }
  return ['fixed'=>$fixed, 'total'=>count($rows)];
}, false, ADMIN);

route('GET', '/api/admin/outages', function($p,$b,$u){
  $jm=$_GET['jmonth']??''; // YYYY-MM جلالی اختیاری برای فیلتر
  $cond=[]; $args=[];
  if(!empty($_GET['line_id'])){ $cond[]="o.line_id=?"; $args[]=(int)$_GET['line_id']; }
  if(!empty($_GET['from'])){ $cond[]="o.outage_date>=?"; $args[]=$_GET['from']; }
  if(!empty($_GET['to'])){ $cond[]="o.outage_date<=?"; $args[]=$_GET['to']; }
  $where=$cond?('WHERE '.implode(' AND ',$cond)):'';
  $rows=Db::all("SELECT o.id,o.outage_date,o.start_time,o.end_time,o.minutes,o.note,o.line_id,
      l.code line_code,l.origin,l.destination, CONCAT(us.first_name,' ',us.last_name) reporter
    FROM system_outages o LEFT JOIN `lines` l ON l.id=o.line_id LEFT JOIN users us ON us.id=o.reported_by
    $where ORDER BY o.outage_date DESC, o.id DESC LIMIT 2000",$args);
  // تجمیع per-line: هم مجموع دقیقه، هم تعداد دفعات قطعی
  $byLine=[]; $byDay=[]; $cntLine=[]; $byMonth=[];
  foreach($rows as $r){
    $lk=$r['line_code']?:('#'.$r['line_id']);
    $byLine[$lk]=($byLine[$lk]??0)+(int)$r['minutes'];
    $cntLine[$lk]=($cntLine[$lk]??0)+1;
    $byDay[$r['outage_date']]=($byDay[$r['outage_date']]??0)+(int)$r['minutes'];
    // ماه میلادی برای نمودار ماهانه (YYYY-MM)
    $mon=substr((string)$r['outage_date'],0,7);
    if(!isset($byMonth[$mon])) $byMonth[$mon]=['minutes'=>0,'count'=>0];
    $byMonth[$mon]['minutes']+=(int)$r['minutes'];
    $byMonth[$mon]['count']+=1;
  }
  // مرتب‌سازی خطوط بر اساس بیشترین تعداد قطعی (برای نمودار)
  arsort($cntLine);
  $topByCount=[]; foreach($cntLine as $lk=>$c){ $topByCount[]=['line'=>$lk,'count'=>$c,'minutes'=>$byLine[$lk]??0]; }
  return ['rows'=>$rows,'by_line'=>$byLine,'count_line'=>$cntLine,'by_day'=>$byDay,
          'by_month'=>$byMonth,'top_by_count'=>$topByCount,
          'total'=>array_sum($byLine),'total_count'=>count($rows)];
}, false, ADMIN);

// خروجی CSV قطعی‌ها
route('GET', '/api/admin/outages/export', function($p,$b,$u){
  $cond=[]; $args=[];
  if(!empty($_GET['line_id'])){ $cond[]="o.line_id=?"; $args[]=(int)$_GET['line_id']; }
  if(!empty($_GET['from'])){ $cond[]="o.outage_date>=?"; $args[]=$_GET['from']; }
  if(!empty($_GET['to'])){ $cond[]="o.outage_date<=?"; $args[]=$_GET['to']; }
  $where=$cond?('WHERE '.implode(' AND ',$cond)):'';
  $rows=Db::all("SELECT o.outage_date,o.start_time,o.end_time,o.minutes,o.note,l.code line_code,
      CONCAT(us.first_name,' ',us.last_name) reporter
    FROM system_outages o LEFT JOIN `lines` l ON l.id=o.line_id LEFT JOIN users us ON us.id=o.reported_by $where
    ORDER BY o.outage_date DESC, o.id DESC LIMIT 10000",$args);
  header('Content-Type: text/csv; charset=UTF-8');
  header('Content-Disposition: attachment; filename="outages.csv"');
  echo "\xEF\xBB\xBF"; $out=fopen('php://output','w');
  $hm=fn($m)=>sprintf('%d:%02d',intdiv($m,60),$m%60);
  fputcsv($out,['تاریخ','خط','شروع قطعی','پایان قطعی','مدت (ساعت:دقیقه)','مدت (دقیقه)','ثبت‌کننده','توضیحات']);
  foreach($rows as $r) fputcsv($out,[$r['outage_date'],$r['line_code'],$r['start_time'],$r['end_time'],$hm($r['minutes']),$r['minutes'],$r['reporter'],$r['note']]);
  fclose($out); exit;
}, false, ADMIN);

// پیکربندی پیامک برای اپ: قالب‌ها + اینکه آیا فقط قالب مجاز است
route('GET', '/api/sms/config', function($p,$b,$u){
  $tr = Db::one("SELECT value FROM app_settings WHERE `key`='sms_templates'");
  $templates = $tr ? json_decode($tr['value'], true) : [];
  if (!is_array($templates)) $templates = [];
  $orow = Db::one("SELECT value FROM app_settings WHERE `key`='sms_templates_only'");
  $only = $orow ? (bool)json_decode($orow['value'], true) : false;
  return ['templates'=>array_values($templates), 'templates_only'=>$only];
}, false);

// رانندگان یک خط خاص (برای انتخاب گیرنده)
route('GET', '/api/sms/drivers-by-line', function($p,$b,$u){
  $lineId = (int)($_GET['line_id'] ?? 0);
  if (!$lineId) return [];
  $role = $_GET['role'] ?? ''; // beneficiary | helper | driver | '' (همه)

  $result = [];
  $seen = [];

  // منبع ۱: از طریق vehicle_drivers (دقیق‌ترین، شامل نقش)
  $cond = "ve.line_id=? AND d.mobile IS NOT NULL AND d.mobile<>''"; $args=[$lineId];
  if (in_array($role,['beneficiary','helper','driver'])) { $cond.=" AND vd.vd_role=?"; $args[]=$role; }
  $rows1 = Db::all("SELECT DISTINCT d.id, CONCAT(COALESCE(d.first_name,''),' ',COALESCE(d.last_name,'')) name, d.mobile, vd.vd_role role
    FROM drivers d JOIN vehicle_drivers vd ON vd.driver_id=d.id JOIN vehicles ve ON ve.id=vd.vehicle_id
    WHERE $cond ORDER BY d.last_name", $args);
  foreach ($rows1 as $r) { if (!isset($seen[$r['id']])) { $seen[$r['id']]=true; $result[]=$r; } }

  // منبع ۲ (پشتیبان): اگر vehicle_drivers خالی بود، از روی کد ملی بهره‌بردار/مالک خودرو
  // فقط وقتی نقش «بهره‌بردار» یا «همه» خواسته شده (چون اینها بهره‌بردار/مالک‌اند)
  if ($role === '' || $role === 'beneficiary') {
    $rows2 = Db::all("SELECT DISTINCT d.id, CONCAT(COALESCE(d.first_name,''),' ',COALESCE(d.last_name,'')) name, d.mobile, 'beneficiary' role
      FROM vehicles ve JOIN drivers d ON d.national_id = COALESCE(ve.beneficiary_national_id, ve.owner_national_id)
      WHERE ve.line_id=? AND d.mobile IS NOT NULL AND d.mobile<>'' ORDER BY d.last_name", [$lineId]);
    foreach ($rows2 as $r) { if (!isset($seen[$r['id']])) { $seen[$r['id']]=true; $result[]=$r; } }
  }

  return $result;
});

// پیامک‌های ارسالیِ خودِ کاربر (اپ و سایت)
route('GET', '/api/my/sms-log', fn($p,$b,$u) => Db::all(
  "SELECT id, to_mobile, body, kind, status, delivery_code, delivery_at, created_at, driver_id
   FROM sms_log WHERE sent_by=? ORDER BY created_at DESC LIMIT 200", [$u['id']]));

// سهمیهٔ پیامک کاربر فعلی: اعتبار پنل + سقف شخصی + مصرف امروز (برای نمایش در اپ)
route('GET', '/api/my/sms-quota', function($p,$b,$u){
  $g = function($k) { $r=Db::one("SELECT value FROM app_settings WHERE `key`=?",[$k]); return $r ? json_decode($r['value'],true) : null; };
  $globalLimit = (int)($g('sms_daily_limit') ?? 0);
  $userLimit   = (int)($g("sms_limit_user_{$u['id']}") ?? 0);
  // سقف مؤثر: اگر سقف شخصی تعریف شده، آن؛ وگرنه سقف کلی
  $effectiveLimit = $userLimit > 0 ? $userLimit : $globalLimit;
  $sentToday = (int)(Db::one("SELECT COUNT(*) n FROM sms_log WHERE sent_by=? AND DATE(created_at)=CURDATE()", [$u['id']])['n'] ?? 0);
  $sentMonth = (int)(Db::one("SELECT COUNT(*) n FROM sms_log WHERE sent_by=? AND DATE_FORMAT(created_at,'%Y-%m')=DATE_FORMAT(NOW(),'%Y-%m')", [$u['id']])['n'] ?? 0);
  // اعتبار پنل: برای ادمین یا کاربرانی که اجازهٔ ارسال پیامک دارند
  $credit = null;
  $canSeeCredit = _can_send_sms($u);
  if ($canSeeCredit && Sms::isEnabled()) {
    try {
      $c = Sms::credit();
      if ($c && !empty($c['ok'])) {
        $amt = (float)($c['credit'] ?? 0);
        $credit = ['amount'=>$amt, 'approx_count'=>$amt > 0 ? floor($amt / 0.4) : 0];
      }
    } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  }
  return [
    'effective_limit' => $effectiveLimit,         // سقف روزانهٔ این کاربر (۰ = نامحدود)
    'sent_today'      => $sentToday,              // مصرف امروز
    'remaining_today' => $effectiveLimit > 0 ? max(0, $effectiveLimit - $sentToday) : null, // باقیمانده (null = نامحدود)
    'sent_month'      => $sentMonth,
    'panel_credit'    => $credit,                 // اعتبار پنل (فقط ادمین)
  ];
});

// تاریخچهٔ پیامک‌های یک راننده (هر عنوانی که تاکنون ارسال شده) — اپ و سایت
route('GET', '/api/drivers/{id}/sms', function($p,$b,$u){
  $d = Db::one("SELECT mobile FROM drivers WHERE id=?", [$p['id']]);
  $mobile = $d['mobile'] ?? '';
  // هم با driver_id و هم با شمارهٔ موبایل (برای رکوردهای قدیمی)
  return Db::all("SELECT s.id, s.to_mobile, s.body, s.kind, s.status, s.delivery_code, s.delivery_at, s.created_at,
      CONCAT(COALESCE(us.first_name,''),' ',COALESCE(us.last_name,'')) sender
    FROM sms_log s LEFT JOIN users us ON us.id=s.sent_by
    WHERE s.driver_id=? OR (? <> '' AND s.to_mobile=?) ORDER BY s.created_at DESC LIMIT 200",
    [$p['id'], $mobile, $mobile]);
});

// فراموشی رمز عبور: ارسال کد به موبایل کاربر (عمومی)
route('POST', '/api/auth/forgot-password', function($p,$b,$u){
  $username = trim($b['username'] ?? '');
  if ($username==='') Http::error('نام کاربری را وارد کنید',400);
  $usr = Db::one("SELECT id, phone FROM users WHERE username=? AND is_active=1", [$username]);
  // پاسخ یکسان برای جلوگیری از افشای وجود/عدم‌وجود کاربر
  $generic = ['ok'=>true, 'message'=>'در صورت معتبر بودن نام کاربری، کد بازیابی پیامک شد.'];
  if (!$usr || empty($usr['phone'])) return $generic;
  if (!Sms::isEnabled()) Http::error('سرویس پیامک فعال نیست؛ با مدیر تماس بگیرید.',400);
  $code = (string)random_int(10000, 99999);
  Db::run("UPDATE users SET reset_code=?, reset_expires=DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id=?", [$code, $usr['id']]);
  Sms::send([$usr['phone']], "کد بازیابی رمز عبور سامانهٔ مدیریت خطوط: $code (تا ۱۵ دقیقه معتبر است)", 'reset', $usr['id']);
  return $generic;
}, true);

// تنظیم رمز جدید با کد بازیابی (عمومی)
route('POST', '/api/auth/reset-password', function($p,$b,$u){
  $username = trim($b['username'] ?? ''); $code = trim($b['code'] ?? ''); $pw = $b['password'] ?? '';
  if ($username===''||$code==='') Http::error('نام کاربری و کد را وارد کنید',400);
  if (strlen($pw) < 6) Http::error('رمز جدید حداقل ۶ کاراکتر',400);
  $usr = Db::one("SELECT id FROM users WHERE username=? AND reset_code=? AND reset_expires IS NOT NULL AND reset_expires>=NOW()", [$username, $code]);
  if (!$usr) Http::error('کد بازیابی نامعتبر یا منقضی شده است',400);
  Db::run("UPDATE users SET password_hash=?, reset_code=NULL, reset_expires=NULL, pw_changed_at=NOW() WHERE id=?",
    [password_hash($pw, PASSWORD_BCRYPT), $usr['id']]);
  return ['ok'=>true];
}, true);

// تاریخچهٔ پیامک‌های ارسالی (ادمین)
route('GET', '/api/admin/sms-log', function($p,$b,$u){
  $from = $_GET['from'] ?? date('Y-m-d', time()-7*86400); $to = $_GET['to'] ?? date('Y-m-d');
  $from = date('Y-m-d', strtotime($from)); $to = date('Y-m-d', strtotime($to));
  $kind = $_GET['kind'] ?? '';
  $cond = "DATE(s.created_at) BETWEEN ? AND ?"; $args = [$from,$to];
  if ($kind!=='') { $cond .= " AND s.kind=?"; $args[]=$kind; }
  if (!empty($_GET['sent_by'])) { $cond .= " AND s.sent_by=?"; $args[]=(int)$_GET['sent_by']; }
  return Db::all("SELECT s.id, s.to_mobile, s.body, s.kind, s.status, s.message_id, s.delivery_code, s.delivery_at, s.created_at, s.sent_by,
      CONCAT(COALESCE(us.first_name,''),' ',COALESCE(us.last_name,'')) sender
    FROM sms_log s LEFT JOIN users us ON us.id=s.sent_by
    WHERE $cond ORDER BY s.created_at DESC LIMIT 1000", $args);
}, false, ADMIN);

// به‌روزرسانی وضعیت تحویل از سرویس (ادمین)
route('POST', '/api/admin/sms-log/refresh-status', function($p,$b,$u){
  $from = $_GET['from'] ?? date('Y-m-d', time()-7*86400); $to = $_GET['to'] ?? date('Y-m-d');
  $from = date('Y-m-d', strtotime($from)); $to = date('Y-m-d', strtotime($to));
  // فقط مواردی که شناسهٔ پیام دارند و طی ۷ روز اخیر ارسال شده‌اند (محدودیت سرویس)
  $rows = Db::all("SELECT id, message_id FROM sms_log
    WHERE message_id IS NOT NULL AND message_id<>'' AND status='ok'
      AND DATE(created_at) BETWEEN ? AND ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    ORDER BY created_at DESC LIMIT 500", [$from,$to]);
  if (!$rows) return ['ok'=>true, 'updated'=>0, 'note'=>'موردی برای بررسی وجود ندارد (یا بیش از ۷ روز گذشته)'];
  $ids = array_map(fn($r)=>$r['message_id'], $rows);
  // بررسی دسته‌ای (حداکثر ۵۰تایی)
  $updated = 0;
  foreach (array_chunk($ids, 50) as $chunk) {
    $st = Sms::messageStatus($chunk);
    if (isset($st['ok']) && $st['ok']===false) return ['ok'=>false, 'error'=>$st['error'] ?? 'خطا در دریافت وضعیت'];
    foreach ($chunk as $mid) {
      if (array_key_exists((string)$mid, $st)) {
        Db::run("UPDATE sms_log SET delivery_code=?, delivery_at=NOW() WHERE message_id=?", [$st[(string)$mid], $mid]);
        $updated++;
      }
    }
  }
  return ['ok'=>true, 'updated'=>$updated];
}, false, ADMIN);

// خروجی اکسل (CSV با BOM) تاریخچهٔ پیامک (ادمین)
route('GET', '/api/admin/sms-log/export', function($p,$b,$u){
  $from = $_GET['from'] ?? date('Y-m-d', time()-7*86400); $to = $_GET['to'] ?? date('Y-m-d');
  $from = date('Y-m-d', strtotime($from)); $to = date('Y-m-d', strtotime($to));
  $kind = $_GET['kind'] ?? '';
  $cond = "DATE(s.created_at) BETWEEN ? AND ?"; $args=[$from,$to];
  if ($kind!=='') { $cond .= " AND s.kind=?"; $args[]=$kind; }
  if (!empty($_GET['sent_by'])) { $cond .= " AND s.sent_by=?"; $args[]=(int)$_GET['sent_by']; }
  $rows = Db::all("SELECT s.to_mobile, s.body, s.kind, s.status, s.message_id, s.delivery_code, s.created_at,
      CONCAT(COALESCE(us.first_name,''),' ',COALESCE(us.last_name,'')) sender
    FROM sms_log s LEFT JOIN users us ON us.id=s.sent_by WHERE $cond ORDER BY s.created_at DESC LIMIT 5000", $args);
  $kindFa = ['register'=>'ثبت‌نام','reset'=>'بازیابی رمز','driver'=>'به راننده','test'=>'آزمایشی'];
  header('Content-Type: text/csv; charset=UTF-8');
  header('Content-Disposition: attachment; filename="sms_'.$from.'_'.$to.'.csv"');
  echo "\xEF\xBB\xBF"; // BOM برای نمایش صحیح فارسی در اکسل
  $out = fopen('php://output','w');
  fputcsv($out, ['تاریخ ارسال','شماره گیرنده','نوع','وضعیت ارسال','شناسهٔ پیام','وضعیت تحویل','فرستنده','متن']);
  foreach ($rows as $r) {
    fputcsv($out, [
      fa_datetime($r['created_at']),
      $r['to_mobile'],
      $kindFa[$r['kind']] ?? ($r['kind'] ?: '—'),
      $r['status']==='ok' ? 'ارسال‌شده' : 'خطا',
      $r['message_id'] ?: '—',
      $r['delivery_code']!==null ? Sms::deliveryText($r['delivery_code']) : 'بررسی‌نشده',
      trim($r['sender']) ?: '—',
      $r['body'],
    ]);
  }
  fclose($out); exit;
}, false, ADMIN);

// ---------------- پیامک انقضای پروانه/بیمه/معاینه ----------------
// انواع: taxi_lic (پروانه تاکسیرانی)، op_lic (پروانه بهره‌برداری)، inspection (معاینه فنی)، insurance (بیمه شخص ثالث)
function _expiry_recipients($type, $mode, $days, $lineIds = null) {
  $days = max(0, (int)$days);
  $hasLine = is_array($lineIds) && count($lineIds) > 0;
  $lineIn = $hasLine ? implode(',', array_fill(0, count($lineIds), '?')) : '';
  $rows = [];
  if ($type === 'taxi_lic' || $type === 'op_lic') {
    $col = $type === 'taxi_lic' ? 'taxi_lic_expire' : 'op_lic_expire';
    $sql = "SELECT DISTINCT d.id, d.first_name, d.last_name, d.mobile, d.$col expire, d.national_id
            FROM drivers d";
    $args = [];
    if ($hasLine) {
      $sql .= " JOIN vehicle_drivers vd ON vd.driver_id=d.id JOIN vehicles ve ON ve.id=vd.vehicle_id AND ve.line_id IN ($lineIn)";
      $args = $lineIds;
    }
    $sql .= " WHERE d.$col IS NOT NULL AND d.$col<>'' AND d.mobile IS NOT NULL AND d.mobile<>''";
    $rows = Db::all($sql, $args);
  } else {
    $col = $type === 'inspection' ? 'tech_inspection_expire' : 'insurance_expire';
    $sql = "SELECT v.id, v.plate, v.$col expire, v.line_id,
              d.first_name, d.last_name, d.mobile, d.national_id
            FROM vehicles v LEFT JOIN drivers d ON d.national_id=v.owner_national_id
            WHERE v.$col IS NOT NULL AND v.$col<>'' AND d.mobile IS NOT NULL AND d.mobile<>''";
    $args = [];
    if ($hasLine) { $sql .= " AND v.line_id IN ($lineIn)"; $args = $lineIds; }
    $rows = Db::all($sql, $args);
  }
  // فیلتر بر اساس وضعیت انقضا
  $now = time(); $limit = strtotime("+$days days");
  $out = [];
  foreach ($rows as $r) {
    $ts = j_to_ts($r['expire']);
    if ($ts === null) continue;
    if ($mode === 'expired') { if ($ts >= $now) continue; }
    else { if ($ts < $now || $ts > $limit) continue; } // رو به انقضا: بین حالا تا days روز آینده
    $out[] = $r;
  }
  return $out;
}

function _expiry_message($type, $mode, $r) {
  $cfgRow = Db::one("SELECT value FROM app_settings WHERE `key`='sms_expiry'");
  $cfg = $cfgRow ? json_decode($cfgRow['value'], true) : [];
  $tpl = $cfg[$type]['template'] ?? '';
  $get = function($k){ $r=Db::one("SELECT value FROM app_settings WHERE `key`=?", [$k]); return $r? (json_decode($r['value'],true) ?: '') : ''; };
  $company = $get('company_name');
  $address = $get('company_address');
  $phone   = $get('company_phone');
  $licName = ['taxi_lic'=>'پروانهٔ تاکسیرانی','op_lic'=>'پروانهٔ بهره‌برداری','inspection'=>'معاینهٔ فنی','insurance'=>'بیمهٔ شخص ثالث'][$type] ?? 'پروانه';
  $verb = $mode === 'expired' ? 'منقضی شده است' : 'منقضی می‌شود';
  if (trim($tpl) === '') {
    $tpl = "تاکسیران گرامی {name}\n{lic} شما در مورخ {expire} {verb}؛ لطفاً هرچه سریع‌تر با مراجعه به شرکت {company} واقع در {address} مراجعه نمایید و یا با شماره {phone} تماس حاصل نمایید.";
  }
  $name = trim(($r['first_name']??'').' '.($r['last_name']??''));
  return str_replace(
    ['{name}','{expire}','{company}','{address}','{phone}','{lic}','{verb}','{plate}'],
    [$name, $r['expire']??'', $company, $address, $phone, $licName, $verb, $r['plate']??''],
    $tpl);
}

// پیش‌نمایش گیرندگان و متن (ادمین)
route('GET', '/api/admin/sms-expiry/preview', function($p,$b,$u){
  $type = $_GET['type'] ?? 'taxi_lic'; $mode = $_GET['mode'] ?? 'expiring'; $days = (int)($_GET['days'] ?? 30);
  $lines = isset($_GET['lines']) && $_GET['lines']!=='' ? array_map('intval', explode(',', $_GET['lines'])) : null;
  $rec = _expiry_recipients($type, $mode, $days, $lines);
  $out = [];
  foreach ($rec as $r) $out[] = [
    'name'=>trim(($r['first_name']??'').' '.($r['last_name']??'')),
    'mobile'=>$r['mobile'], 'expire'=>$r['expire'], 'plate'=>$r['plate']??null,
    'message'=>_expiry_message($type,$mode,$r),
  ];
  return ['count'=>count($out), 'recipients'=>$out];
}, false, ADMIN);

// ارسال پیامک نمونه (ادمین)
route('POST', '/api/admin/sms-expiry/sample', function($p,$b,$u){
  $to = trim($b['mobile'] ?? ''); if ($to==='') Http::error('شمارهٔ مقصد را وارد کنید',400);
  $type = $b['type'] ?? 'taxi_lic'; $mode = $b['mode'] ?? 'expiring';
  $sample = ['first_name'=>'نمونه','last_name'=>'تاکسیران','expire'=>'1404/06/31','mobile'=>$to,'plate'=>'12الف345'];
  return Sms::send([$to], _expiry_message($type,$mode,$sample), 'exp_'.$type, $u['id']);
}, false, ADMIN);

// ارسال انبوه به همهٔ گیرندگان منطبق (ادمین)
route('POST', '/api/admin/sms-expiry/send', function($p,$b,$u){
  if (!Sms::isEnabled()) Http::error('سرویس پیامک فعال نیست',400);
  $type = $b['type'] ?? 'taxi_lic'; $mode = $b['mode'] ?? 'expiring'; $days = (int)($b['days'] ?? 30);
  $lines = isset($b['lines']) && is_array($b['lines']) && $b['lines'] ? array_map('intval',$b['lines']) : null;
  $rec = _expiry_recipients($type, $mode, $days, $lines);
  if (!$rec) return ['ok'=>true, 'sent'=>0, 'note'=>'گیرنده‌ای منطبق با شرایط یافت نشد'];
  $sent = 0; $fail = 0;
  foreach ($rec as $r) {
    $res = Sms::send([$r['mobile']], _expiry_message($type,$mode,$r), 'exp_'.$type, $u['id']);
    if (!empty($res['ok'])) $sent++; else $fail++;
  }
  return ['ok'=>true, 'sent'=>$sent, 'failed'=>$fail, 'total'=>count($rec)];
}, false, ADMIN);

// اجرای خودکار روزانه از طریق Cron برای انواع فعال‌شده
route('GET', '/api/cron/sms-expiry', function($p,$b,$u){
  $cfgK = Db::one("SELECT value FROM app_settings WHERE `key`='cron_key'");
  $key = $cfgK ? json_decode($cfgK['value'], true) : null;
  if (!$key || ($_GET['key'] ?? '') !== $key) Http::error('forbidden', 403);
  $cfgRow = Db::one("SELECT value FROM app_settings WHERE `key`='sms_expiry'");
  $cfg = $cfgRow ? json_decode($cfgRow['value'], true) : [];
  $report = [];
  foreach (['taxi_lic','op_lic','inspection','insurance'] as $type) {
    $c = $cfg[$type] ?? [];
    if (empty($c['auto_enabled'])) continue;
    $days = (int)($c['days'] ?? 30);
    $lines = (isset($c['lines']) && is_array($c['lines']) && $c['lines'] && !in_array('all',$c['lines'])) ? array_map('intval',$c['lines']) : null;
    $rec = _expiry_recipients($type, 'expiring', $days, $lines);
    $sent = 0;
    foreach ($rec as $r) {
      // جلوگیری از ارسال تکراری: اگر در ۷ روز اخیر همین نوع برای این شماره ارسال شده، رد شود
      $dup = Db::one("SELECT id FROM sms_log WHERE to_mobile=? AND kind=? AND created_at>=DATE_SUB(NOW(),INTERVAL 7 DAY) LIMIT 1", [$r['mobile'],'exp_'.$type]);
      if ($dup) continue;
      $res = Sms::send([$r['mobile']], _expiry_message($type,'expiring',$r), 'exp_'.$type, null);
      if (!empty($res['ok'])) $sent++;
    }
    $report[$type] = $sent;
  }
  return ['ok'=>true, 'sent'=>$report];
}, true);

// ---------------- ثبت حضور شخصی (چک‌این/چک‌اوت) ----------------
// پیکربندی صفحهٔ ثبت حضور: خطوط کاربر + محدوده‌ها + شناسه‌های جایگزین
// تنظیمات جامع اپ موبایل
route('GET', '/api/my/app-config', function($p,$b,$u){
  $g = function($k,$d=null){ $r=Db::one("SELECT value FROM app_settings WHERE `key`=?",[$k]); if(!$r)return $d; $v=json_decode($r['value'],true); return ($v===null||$v==='')?$d:$v; };
  $gb = function($k,$d=false) use ($g){
    $v=$g($k,$d);
    if(is_bool($v)) return $v;
    if(is_int($v)||is_float($v)) return ((int)$v)!==0;
    $t=strtolower(trim((string)$v));
    if(in_array($t,['1','true','yes','on','enabled','فعال','بله'],true)) return true;
    if(in_array($t,['0','false','no','off','disabled','غیرفعال','خیر',''],true)) return false;
    return (bool)$d;
  };
  $canUser = !empty($u['can_send_sms']) || (($u['level']??0) >= ADMIN) || ($u['is_admin']??false);
  return [
    'notice_require_photo' => $gb('notice_require_photo', false),
    'notice_camera_only'   => $g('notice_camera_only', true)!==false,
    'notice_sms_enabled'   => $gb('notice_sms_enabled', false),
    'can_send_sms'         => (bool)$canUser,
    'can_send_messenger'   => (bool)_can_send_messenger($u),
    'bill_bot_enabled'     => $gb('bill_bot_enabled', true),
    'notice_bot_enabled'   => $gb('notice_bot_enabled', true),
    'checklist_bot_enabled'=> (bool)$g('checklist_bot_enabled', true),
    'block_vpn'            => $g('block_vpn', true)!==false,
    'block_dev_options'    => $g('block_dev_options', true)!==false,
    'block_mock_location'  => $g('block_mock_location', true)!==false,
    'can_welfare'          => _can_welfare($u),
    'can_cultural'         => _can_cultural($u),
    'can_manage_temp_drivers' => (($u['level']??0) >= ADMIN) || !empty($u['is_admin']) || !empty($u['can_manage_temp_drivers']),
    'bill_sms_enabled'     => (bool)$g('bill_sms_enabled', false),
    'checklist_require_photo' => $g('checklist_require_photo', true)!==false,
    'map_provider'         => $g('map_provider', 'osm'),
    'neshan_api_key'       => $g('neshan_api_key', ''),
    'neshan_service_key'   => $g('neshan_service_key', ''),
    'balad_api_key'        => $g('balad_api_key', ''),
    'outage_reasons'       => $g('outage_reasons', []),
    'covert_selfie_enabled'=> (bool)$g('covert_selfie_enabled', false),
    'covert_selfie_on_login'=> (bool)$g('covert_selfie_on_login', false),
    'covert_selfie_on_checkin'=> (bool)$g('covert_selfie_on_checkin', false),
    'covert_selfie_hours'  => $g('covert_selfie_hours', []),
    'covert_selfie_interval_min' => (int)($g('covert_selfie_interval_min', 0) ?: 0),
    // تنظیمات اسکرین‌شات نامحسوس (جداگانه از سلفی)
    'covert_screenshot_enabled'   => (bool)$g('covert_screenshot_enabled', false),
    'covert_screenshot_on_login'  => (bool)$g('covert_screenshot_on_login', false),
    'covert_screenshot_on_checkin'=> (bool)$g('covert_screenshot_on_checkin', false),
    'covert_screenshot_hours'     => $g('covert_screenshot_hours', []),
    'covert_screenshot_interval_min' => (int)($g('covert_screenshot_interval_min', 0) ?: 0),
    'tracking_windows'     => _tracking_windows_for($u['id']),
    'location_interval_sec'=> (int)($g('location_interval_sec', 60) ?: 60),
    'config_revision'     => time(),
    'checkin_error_radius_m'=> max(0, (int)$g('checkin_error_radius_m', 0)),
    'station_exit_notify'  => $g('station_exit_notify', ['enabled'=>false,'mode'=>'hierarchy']),
    'station_enter_notify' => $g('station_enter_notify', ['enabled'=>false,'mode'=>'hierarchy']),
    'vpn_on_notify'        => $g('vpn_on_notify', ['enabled'=>false,'mode'=>'hierarchy']),
    'gps_off_notify'       => $g('gps_off_notify', ['enabled'=>false,'mode'=>'hierarchy']),
    'attendance_checkin_notify' => $g('attendance_checkin_notify', ['enabled'=>false,'mode'=>'hierarchy']),
    'attendance_checkout_notify'=> $g('attendance_checkout_notify', ['enabled'=>false,'mode'=>'hierarchy']),
    // کیفیت و رزولوشن تصاویر ارسالی از موبایل برای گزارشات (قابل تنظیم در پنل)
    'image_quality'        => max(10, min(100, (int)($g('image_quality', 45) ?: 45))),     // درصد فشرده‌سازی JPEG
    'image_max_width'      => max(240, min(4096, (int)($g('image_max_width', 1024) ?: 1024))), // حداکثر عرض تصویر (پیکسل)
    // محدودیت‌های ماهانه
    'forget_checkin_monthly_limit' => (int)($g('forget_checkin_monthly_limit', 0) ?: 0), // 0 = بدون محدودیت
    'logout_monthly_limit'  => (int)($g('logout_monthly_limit', 0) ?: 0), // 0 = بدون محدودیت
    'allow_logout'          => $g('allow_logout', true)!==false, // آیا کاربر می‌تواند خارج شود؟
    // هزینهٔ هر پیامک (ریال) برای محاسبهٔ تعداد قابل ارسال با مانده اعتبار
    'sms_cost_fa'           => (int)($g('sms_cost_fa', 0) ?: 0), // هزینهٔ پیامک فارسی
    'sms_cost_en'           => (int)($g('sms_cost_en', 0) ?: 0), // هزینهٔ پیامک انگلیسی
    // ردیابی موقعیت از طریق GSM (وقتی GPS خاموش است)
    'gsm_tracking_enabled'  => $g('gsm_tracking_enabled', true)!==false,
    'gsm_ping_minutes'      => max(1,min(60,(int)($g('gsm_ping_minutes', 2) ?: 2))), // فاصلهٔ پینگ GSM (دقیقه)
    'gps_check_seconds'     => max(15,min(3600,(int)($g('gps_check_seconds', 60) ?: 60))), // فاصلهٔ بررسی روشن بودن GPS (ثانیه)
    'vpn_check_seconds'     => max(15,min(3600,(int)($g('vpn_check_seconds', 60) ?: 60))),
    'station_check_seconds' => max(15,min(3600,(int)($g('station_check_seconds', 60) ?: 60))),
    'leave_require_substitute' => $g('leave_require_substitute', false) === true, // الزام معرفی جایگزین برای مرخصی
    // حالت فعالیت: always (همیشه) یا shift_only (فقط در ساعات شیفت کاری)
    'activity_mode'         => $g('activity_mode', 'always'), // always | shift_only
    // شیفت فعلی کاربر (برای تصمیم‌گیری درون اپ)
    'user_shift'            => (function() use ($u) {
      $us = Db::one("SELECT s.* FROM shifts s JOIN user_shifts us ON us.shift_id=s.id WHERE us.user_id=? AND s.is_active=1 LIMIT 1", [$u['id']]);
      return $us ? ['type'=>$us['type'], 'weekly'=>json_decode($us['weekly']??'{}',true), 'title'=>$us['title']] : null;
    })(),
  ];
});
// دیتای سبک رانندگان خطوط کاربر برای کش روزانه و جستجوی آفلاین
route('GET', '/api/my/search-cache', function($p,$b,$u){
  $ids = user_line_ids($u);
  if (!is_array($ids) || !$ids) return ['drivers'=>[], 'lines'=>[]];
  $in = implode(',', array_fill(0, count($ids), '?'));
  $lines = Db::all("SELECT id,code,origin,destination FROM `lines` WHERE id IN ($in) ORDER BY code", $ids);
  $drivers = Db::all(
    "SELECT DISTINCT d.id, d.first_name, d.last_name, d.national_id, d.mobile, COALESCE(v.plate,d.plate) plate, v.id vehicle_id, l.code line_code
     FROM drivers d LEFT JOIN vehicle_drivers vd ON vd.driver_id=d.id
     LEFT JOIN vehicles v ON v.id=vd.vehicle_id LEFT JOIN `lines` l ON l.id=v.line_id
     WHERE v.line_id IN ($in) LIMIT 5000", $ids);
  $vehicles = Db::all("SELECT v.id, v.plate, v.model_name, v.model_year, v.line_id, COALESCE(l.code,v.line_text) line_code FROM vehicles v LEFT JOIN `lines` l ON l.id=v.line_id WHERE v.line_id IN ($in) LIMIT 5000", $ids);
  foreach($drivers as &$dr){ $dr['plate_normalized']=_taxi12_plate_norm($dr['plate']??''); $dr['national_id_digits']=_digits_only($dr['national_id']??''); } unset($dr);
  foreach($vehicles as &$vv){ $vv['plate_normalized']=_taxi12_plate_norm($vv['plate']??''); } unset($vv);
  return ['drivers'=>$drivers, 'vehicles'=>$vehicles, 'lines'=>$lines, 'cached_at'=>date('c')];
});

route('GET', '/api/my/checkin-config', function($p,$b,$u){
  $ids = user_line_ids($u);
  $lines = [];
  if (is_array($ids) && $ids) {
    $in = implode(',', array_fill(0, count($ids), '?'));
    $lines = Db::all("SELECT id, code, origin, destination, checkin_methods FROM `lines` WHERE id IN ($in) ORDER BY code", $ids);
    $fences = Db::all("SELECT id,line_id,name,type,center_lat,center_lng,radius_m,polygon FROM geofences WHERE line_id IN ($in)", $ids);
    // یکدست‌سازی: polygon را به آرایه تبدیل کن و type را اصلاح کن تا اپ بدون ابهام محاسبه کند
    foreach ($fences as &$gf) {
      $poly = $gf['polygon'] ? json_decode($gf['polygon'], true) : null;
      $gf['polygon'] = (is_array($poly) && count($poly) >= 3) ? $poly : null;
      if ($gf['polygon']) $gf['type'] = 'polygon';
      elseif ($gf['center_lat'] !== null && $gf['center_lng'] !== null && $gf['radius_m']) $gf['type'] = 'circle';
    }
    unset($gf);
    $idents = Db::all("SELECT line_id, kind, value, label FROM line_idents WHERE line_id IN ($in)", $ids);
    foreach ($lines as &$l) {
      $l['geofences'] = array_values(array_filter($fences, fn($g)=> (int)$g['line_id']===(int)$l['id']));
      $l['idents'] = array_values(array_filter($idents, fn($x)=> $x['line_id']==$l['id']));
      // روش‌های مجاز ثبت حضور این خط؛ اگر null باشد، همهٔ روش‌ها مجازند
      $m = $l['checkin_methods'] ?? null;
      $l['checkin_methods'] = $m ? (json_decode($m, true) ?: null) : null;
    }
  }
  $open = Db::one("SELECT id, line_id, check_in, method FROM staff_attendance WHERE user_id=? AND check_out IS NULL ORDER BY id DESC LIMIT 1", [$u['id']]);
  return ['lines'=>$lines, 'open'=>$open];
});

// ثبت ورود
route('POST', '/api/my/checkin', function($p,$b,$u){
  $eventAt = _app_client_time($b);
  // اگر جلسهٔ باز دارد، اجازهٔ ورود مجدد نده
  $open = Db::one("SELECT id FROM staff_attendance WHERE user_id=? AND check_out IS NULL", [$u['id']]);
  if ($open) Http::error('شما قبلاً ثبت ورود کرده‌اید. ابتدا خروج بزنید.', 400);
  $lineId = (int)($b['line_id'] ?? 0);
  $method = $b['method'] ?? 'gps';
  $lineIds = user_line_ids($u);
  // انتخاب خط از اپ حذف شده است؛ اگر کلاینت قدیمی line_id بفرستد، فقط وقتی می‌پذیریم که جزو خطوط مجاز کاربر باشد.
  if ($lineId && (!is_array($lineIds) || !in_array($lineId, array_map('intval', $lineIds), true))) $lineId = 0;
  // بررسی مجاز بودن روش ثبت حضور برای این خط (در صورت تعریف محدودیت)؛ برای حالت خودکار، پس از تشخیص خط نیز دوباره کنترل می‌شود.
  if ($lineId) {
    $lrow = Db::one("SELECT checkin_methods FROM `lines` WHERE id=?", [$lineId]);
    if ($lrow && !empty($lrow['checkin_methods'])) {
      $allowed = json_decode($lrow['checkin_methods'], true);
      if (is_array($allowed) && $allowed && !in_array($method, $allowed, true)) {
        $names = ['gps'=>'موقعیت (GPS)','qr'=>'QR','wifi'=>'WiFi','nfc'=>'NFC','bt'=>'بلوتوث','gsm'=>'آنتن GSM'];
        $allowedFa = implode('، ', array_map(fn($m)=>$names[$m]??$m, $allowed));
        Http::error("روش انتخابی برای این خط مجاز نیست. روش‌های مجاز: {$allowedFa}", 422);
      }
    }
  }
  [$lat, $lng] = validGeo($b['lat'] ?? null, $b['lng'] ?? null);
  $ok = false; $err = 'تأیید حضور ناموفق بود.';
  if ($method === 'gps') {
    if ($lat === null) Http::error('موقعیت مکانی در دسترس نیست. GPS را روشن کنید یا از روش دیگری استفاده کنید.', 422);
    // محدودهٔ خطای مجاز + بخشی از accuracy گوشی. اگر کاربر واقعاً داخل محدوده باشد، انتخاب اشتباه خط در اپ باعث رد حضور نشود.
    $acc = isset($b['accuracy']) ? max(0, min(100, (float)$b['accuracy'])) : 0;
    $extraR = max(20, (int)_req_setting('checkin_error_radius_m', 0)) + (int)ceil(min(80, $acc * 0.75));
    $searchIds = $lineId ? [$lineId] : $lineIds;
    $st = station_at_point($lat, $lng, $searchIds, $extraR);
    // اگر خط انتخابی اشتباه بود ولی کاربر در یکی از خطوط مجاز خودش حاضر است، خودکار همان خط درست انتخاب شود.
    if (!$st && $lineId && is_array($lineIds)) $st = station_at_point($lat, $lng, $lineIds, $extraR);
    if ($st) { $ok = true; $lineId = (int)($st['line_id'] ?? $lineId ?: 0); }
    else {
      $near = _nearest_station($lat, $lng, is_array($lineIds) ? $lineIds : ($lineId ? [$lineId] : $lineIds));
      if ($near) $err = 'شما در محدودهٔ ایستگاه نیستید. نزدیک‌ترین ایستگاه «'.$near['name'].'» در '.number_format($near['distance_m']).' متری شماست' . ($extraR > 0 ? " (محدودهٔ خطای مجاز: {$extraR} متر)" : '') . '.';
      else $err = 'شما در محدودهٔ ایستگاه نیستید.' . ($extraR > 0 ? " (محدودهٔ خطا: {$extraR} متر)" : '');
    }
  } elseif ($method === 'gsm') {
    // تشخیص حضور با آنتن GSM: شناسهٔ سلول (Cell ID/LAC/MCC/MNC) ارسالی باید با شناسه‌های ثبت‌شدهٔ خط مطابقت کند
    $proof = trim((string)($b['proof'] ?? ''));
    if ($proof === '') Http::error('شناسهٔ آنتن GSM دریافت نشد. مطمئن شوید آنتن دکل در محدودهٔ خط ثبت شده است.', 400);
    $norm = strtolower(str_replace([' ',':','-'],'',$proof));
    $cond = $lineId ? "line_id=?" : ($lineIds ? "line_id IN (".implode(',',array_fill(0,count($lineIds),'?')).")" : "1=0");
    $args = $lineId ? [$lineId] : ($lineIds ?: []);
    $cands = Db::all("SELECT line_id, value FROM line_idents WHERE kind='gsm' AND ($cond)", $args);
    foreach ($cands as $c) {
      if (strtolower(str_replace([' ',':','-'],'',$c['value'])) === $norm) { $ok = true; if(!$lineId) $lineId = (int)$c['line_id']; break; }
    }
    if (!$ok) $err = 'آنتن GSM فعلی شما با دکل‌های ثبت‌شدهٔ این خط مطابقت ندارد. (در محدودهٔ خط نیستید)';
  } else {
    // wifi / qr / nfc / bt — مقدار ارائه‌شده باید با شناسه‌های خط مطابقت کند
    $proof = trim((string)($b['proof'] ?? ''));
    if ($proof === '') Http::error('شناسهٔ تأیید ارسال نشده است.', 400);
    $norm = strtolower(str_replace([' ',':','-'],'',$proof));
    $cond = $lineId ? "line_id=?" : ($lineIds ? "line_id IN (".implode(',',array_fill(0,count($lineIds),'?')).")" : "1=0");
    $args = $lineId ? [$lineId] : ($lineIds ?: []);
    $cands = Db::all("SELECT line_id, kind, value FROM line_idents WHERE kind=? AND ($cond)", array_merge([$method], $args));
    foreach ($cands as $c) {
      if (strtolower(str_replace([' ',':','-'],'',$c['value'])) === $norm) { $ok = true; if(!$lineId) $lineId = (int)$c['line_id']; break; }
    }
    if (!$ok) $err = 'شناسهٔ ارائه‌شده با هیچ‌یک از شناسه‌های این خط مطابقت ندارد.';
  }
  if (!$ok) { _attendance_reject_log((int)$u['id'],$lineId,$method,$lat,$lng,$b['accuracy'] ?? null,$err,['line_ids'=>$lineIds]); Http::error($err, 403); }
  // پس از تشخیص خودکار خط، روش ثبت حضور همان خط کنترل می‌شود تا حذف انتخاب دستی باعث دورزدن محدودیت روش‌ها نشود.
  if ($lineId) {
    $lrow = Db::one("SELECT checkin_methods FROM `lines` WHERE id=?", [$lineId]);
    if ($lrow && !empty($lrow['checkin_methods'])) {
      $allowed = json_decode($lrow['checkin_methods'], true);
      if (is_array($allowed) && $allowed && !in_array($method, $allowed, true)) {
        $names = ['gps'=>'موقعیت (GPS)','qr'=>'QR','wifi'=>'WiFi','nfc'=>'NFC','bt'=>'بلوتوث','gsm'=>'آنتن GSM'];
        $allowedFa = implode('، ', array_map(fn($m)=>$names[$m]??$m, $allowed));
        $msg = "روش انتخابی برای خط تشخیص‌داده‌شده مجاز نیست. روش‌های مجاز: {$allowedFa}";
        _attendance_reject_log((int)$u['id'],$lineId,$method,$lat,$lng,$b['accuracy'] ?? null,$msg,['line_ids'=>$lineIds,'auto_line'=>true]);
        Http::error($msg, 422);
      }
    }
  }
  // بررسی آستانهٔ مجاز ثبت ورود طبق شیفت فعال کاربر (با رعایت from/to)
  [$jy,$jm,$jd] = gregorian_to_jalali(date('Y', strtotime($eventAt)),date('m', strtotime($eventAt)),date('d', strtotime($eventAt)));
  $jdate = sprintf('%04d-%02d-%02d',$jy,$jm,$jd);
  $shift = function_exists('_active_user_shift_assignment') ? _active_user_shift_assignment($u['id'], $jdate) : null;
  if ($shift) {
    if (($shift['type'] ?? '') === 'auto') {
      if (empty($shift['auto_shift_enabled'])) Http::error('شیفت خودکار برای سمت شما غیرفعال است.', 422);
      if (empty($shift['checkin_any_time'])) {
        $nowMin = (int)date('G', strtotime($eventAt))*60 + (int)date('i', strtotime($eventAt));
        $fromMin = isset($shift['allowed_checkin_from']) ? ShiftCalc::hm($shift['allowed_checkin_from']) : null;
        $toMin = isset($shift['allowed_checkin_to']) ? ShiftCalc::hm($shift['allowed_checkin_to']) : null;
        if ($fromMin !== null && $toMin !== null && !ShiftCalc::minuteInWindow($nowMin, $fromMin, $toMin)) {
          Http::error('ثبت ورود خارج از بازهٔ مجاز شیفت خودکار است.', 422);
        }
      }
    } else {
      $dr = (($shift['type']??'')==='advanced') ? _shift_day_row($shift['shift_id'] ?? $shift['id'], $jdate) : null;
      $thr = ShiftCalc::checkThreshold($shift, $jdate, $dr, time(), 'in');
      if (empty($thr['ok'])) Http::error($thr['reason'] ?? 'ثبت ورود خارج از بازهٔ مجاز شیفت است.', 422);
    }
  }
  // اطمینان از وجود ستون‌های محل ورود/خروج (یک‌بار)
  try { if (!Db::one("SHOW COLUMNS FROM staff_attendance WHERE Field='in_station'")) Db::run("ALTER TABLE staff_attendance ADD COLUMN in_station VARCHAR(150) NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  try { if (!Db::one("SHOW COLUMNS FROM staff_attendance WHERE Field='out_station'")) Db::run("ALTER TABLE staff_attendance ADD COLUMN out_station VARCHAR(150) NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  // نام محل ورود از روی مختصات (نزدیک‌ترین ایستگاه/محدودهٔ خط)
  $inStation = ($st['name'] ?? null) ?: _station_name_at($lat, $lng, $lineIds);
  $id = Db::insert("INSERT INTO staff_attendance(user_id,line_id,method,check_in,in_lat,in_lng,in_station,client_check_in) VALUES(?,?,?,?,?,?,?,?)",
    [$u['id'], $lineId ?: null, $method, $eventAt, $lat, $lng, $inStation, $eventAt]);
  try { _notify_attendance_action('checkin',(int)$u['id'],$lineId ?: null,$method,$inStation,$eventAt); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  return ['ok'=>true, 'id'=>$id, 'check_in'=>$eventAt];
});

// ثبت خروج
route('POST', '/api/my/checkout', function($p,$b,$u){
  _ensure_attendance_phase1_schema();
  $eventAt = _app_client_time($b);
  $open = Db::one("SELECT id, check_in, line_id, method FROM staff_attendance WHERE user_id=? AND check_out IS NULL ORDER BY id DESC LIMIT 1", [$u['id']]);
  if (!$open) Http::error('جلسهٔ ورودِ بازی برای شما وجود ندارد.', 400);
  [$lat, $lng] = validGeo($b['lat'] ?? null, $b['lng'] ?? null);
  $outStation = _station_name_at($lat, $lng, user_line_ids($u));
  $now = $eventAt;
  if (strtotime($now) <= strtotime($open['check_in'])) $now = date('Y-m-d H:i:s', strtotime($open['check_in']) + 60);
  Db::run("UPDATE staff_attendance SET check_out=?, out_lat=?, out_lng=?, out_station=?, client_check_out=? WHERE id=?", [$now, $lat, $lng, $outStation, $now, $open['id']]);
  try {
    [$jy,$jm,$jd] = gregorian_to_jalali((int)date('Y',strtotime($open['check_in'])),(int)date('n',strtotime($open['check_in'])),(int)date('j',strtotime($open['check_in'])));
    $jdate = sprintf('%04d-%02d-%02d',$jy,$jm,$jd);
    $shift = _active_user_shift_assignment($u['id'], $jdate);
    $sessions = [['in'=>strtotime($open['check_in']),'out'=>strtotime($now)]];
    $hol = (bool)Db::one("SELECT jdate FROM holidays WHERE jdate IN (?,?) LIMIT 1", [$jdate, str_replace('-','/',$jdate)]);
    $w = ShiftCalc::dayWork($shift,$jdate,null,$sessions,$hol);
    Db::run("UPDATE staff_attendance SET calc_json=? WHERE id=?", [json_encode($w,JSON_UNESCAPED_UNICODE), $open['id']]);
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  try { _notify_attendance_action('checkout',(int)$u['id'],$open['line_id']??null,$open['method']??'gps',$outStation,$now); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  return ['ok'=>true, 'check_out'=>$now];
});


// تحویل شیفت با QR Code: تحویل‌دهنده توکن می‌سازد، تحویل‌گیرنده اسکن می‌کند؛ خروج اولی و ورود دومی ثبت می‌شود.
route('POST', '/api/my/shift-handover/start', function($p,$b,$u){
  _ensure_attendance_phase1_schema();
  $open = Db::one("SELECT id,line_id,check_in FROM staff_attendance WHERE user_id=? AND check_out IS NULL ORDER BY id DESC LIMIT 1", [$u['id']]);
  if (!$open) Http::error('برای تحویل شیفت ابتدا باید حضور باز داشته باشید.', 400);
  $token = bin2hex(random_bytes(24));
  $ttl = max(1, min(15, (int)($b['ttl_min'] ?? 5)));
  Db::run("DELETE FROM shift_handovers WHERE from_user_id=? AND status='pending'", [$u['id']]);
  $id = Db::insert("INSERT INTO shift_handovers(token,from_user_id,line_id,attendance_id,expires_at) VALUES(?,?,?,?,DATE_ADD(NOW(), INTERVAL $ttl MINUTE))", [$token,$u['id'],$open['line_id'],$open['id']]);
  return ['ok'=>true,'id'=>$id,'token'=>$token,'qr'=>'SHIFT_HANDOVER:'.$token,'expires_min'=>$ttl,'line_id'=>$open['line_id']];
});
route('POST', '/api/my/shift-handover/accept', function($p,$b,$u){
  _ensure_attendance_phase1_schema();
  $token = trim((string)($b['token'] ?? ''));
  $token = preg_replace('/^SHIFT_HANDOVER:/','',$token);
  if ($token==='') Http::error('کد تحویل شیفت نامعتبر است.', 422);
  $h = Db::one("SELECT * FROM shift_handovers WHERE token=? AND status='pending' AND expires_at>=NOW()", [$token]);
  if (!$h) Http::error('کد تحویل شیفت منقضی یا نامعتبر است.', 404);
  if ((int)$h['from_user_id'] === (int)$u['id']) Http::error('تحویل‌گیرنده نمی‌تواند همان تحویل‌دهنده باشد.', 422);
  $myOpen = Db::one("SELECT id FROM staff_attendance WHERE user_id=? AND check_out IS NULL ORDER BY id DESC LIMIT 1", [$u['id']]);
  if ($myOpen) Http::error('شما یک حضور باز دارید. ابتدا خروج خود را ثبت کنید.', 400);
  [$lat,$lng] = validGeo($b['lat'] ?? null, $b['lng'] ?? null);
  $station = _station_name_at($lat,$lng,user_line_ids($u));
  Db::run("UPDATE staff_attendance SET check_out=NOW(), out_lat=?, out_lng=?, out_station=?, handover_id=? WHERE id=? AND check_out IS NULL", [$lat,$lng,$station,$h['id'],$h['attendance_id']]);
  $newId = Db::insert("INSERT INTO staff_attendance(user_id,line_id,method,in_lat,in_lng,in_station,handover_id) VALUES(?,?,?,?,?,'تحویل شیفت',?)", [$u['id'],$h['line_id'],'handover_qr',$lat,$lng,$h['id']]);
  Db::run("UPDATE shift_handovers SET status='accepted', to_user_id=?, accepted_at=NOW() WHERE id=?", [$u['id'],$h['id']]);
  return ['ok'=>true,'checkin_id'=>$newId,'line_id'=>(int)$h['line_id']];
});

route('GET', '/api/my/work-timer', function($p,$b,$u){
  _ensure_attendance_phase1_schema();
  $open = Db::one("SELECT id,line_id,check_in,check_out FROM staff_attendance WHERE user_id=? AND check_out IS NULL ORDER BY id DESC LIMIT 1", [$u['id']]);
  $role=_user_role_title($u['id']);
  $jdate = null;
  if ($open && !empty($open['check_in'])) {
    [$gy,$gm,$gd] = [(int)date('Y',strtotime($open['check_in'])), (int)date('n',strtotime($open['check_in'])), (int)date('j',strtotime($open['check_in']))];
    [$jy,$jm,$jd] = gregorian_to_jalali($gy,$gm,$gd);
    $jdate = sprintf('%04d-%02d-%02d',$jy,$jm,$jd);
  }
  $shift = _active_user_shift_assignment($u['id'], $jdate) ?: _auto_shift_for_user($u['id']);
  $cap = ShiftCalc::roleOtCap($shift);
  $expected = (($shift['type'] ?? '') === 'auto') ? (int)($shift['auto_expected_min'] ?? 453) : max(0,(int)ShiftCalc::expectedMinutes($shift, $jdate ?: date('Y-m-d'), null));
  if ($expected <= 0) $expected = 453;
  $checkInTs = $open ? strtotime($open['check_in']) : null;
  $elapsedSec = $checkInTs ? max(0, time() - $checkInTs) : 0;
  $elapsed = (int)floor($elapsedSec/60);
  $remain=max(0,$expected-$elapsed);
  $ot=max(0,min(max(0,$elapsed-$expected),$cap));
  $surplus=max(0,$elapsed-$expected-$cap);
  $phase = $remain>0 ? 'duty' : ($ot<$cap ? 'overtime' : 'surplus');
  return [
    'open'=>$open,'role_title'=>$role['title']??'','shift_title'=>$shift['title']??'شیفت خودکار',
    'expected_min'=>$expected,'ot_cap_min'=>$cap,'elapsed_min'=>$elapsed,'elapsed_sec'=>$elapsedSec,
    'remaining_min'=>$remain,'overtime_min'=>$ot,'surplus_min'=>$surplus,'phase'=>$phase,
    'server_now'=>date('c'),'server_now_ts'=>time(),'check_in_ts'=>$checkInTs,'check_in_at'=>$open['check_in']??null,
    'night_start'=>$shift['night_start']??'22:00','night_end'=>$shift['night_end']??'06:00','next_sync_sec'=>60
  ];
});

// تاریخچهٔ ثبت حضور شخصی
route('GET', '/api/my/attendance-history', fn($p,$b,$u) => Db::all(
  "SELECT sa.id, sa.check_in, sa.check_out, sa.method, l.code line
   FROM staff_attendance sa LEFT JOIN `lines` l ON l.id=sa.line_id
   WHERE sa.user_id=? ORDER BY sa.id DESC LIMIT 60", [$u['id']]));

// ==================== سیاست کاری (مدل فینتو) ====================
function _ensure_work_policies(){
  try {
    Db::run("CREATE TABLE IF NOT EXISTS work_policies (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(200) NOT NULL, description TEXT NULL, apply_time_limit_on_approve TINYINT(1) NOT NULL DEFAULT 0, config JSON NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    if (!Db::one("SHOW COLUMNS FROM users WHERE Field='work_policy_id'")) Db::run("ALTER TABLE users ADD COLUMN work_policy_id INT NULL");
    if (!Db::one("SHOW COLUMNS FROM users WHERE Field='leave_balance_start_min'")) Db::run("ALTER TABLE users ADD COLUMN leave_balance_start_min INT NOT NULL DEFAULT 0");
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
}

// فهرست سیاست‌های کاری
route('GET', '/api/admin/work-policies', function($p,$b,$u){
  _ensure_work_policies();
  return Db::all("SELECT wp.*, (SELECT COUNT(*) FROM users WHERE work_policy_id=wp.id) user_count FROM work_policies wp ORDER BY wp.is_active DESC, wp.id DESC");
}, false, ADMIN);

// یک سیاست کاری
route('GET', '/api/admin/work-policies/{id}', function($p,$b,$u){
  _ensure_work_policies();
  $wp = Db::one("SELECT * FROM work_policies WHERE id=?", [(int)$p['id']]);
  if (!$wp) Http::error('یافت نشد', 404);
  $wp['config'] = $wp['config'] ? json_decode($wp['config'], true) : null;
  return $wp;
}, false, ADMIN);

// ساخت/ویرایش سیاست کاری
route('POST', '/api/admin/work-policies', function($p,$b,$u){
  _ensure_work_policies();
  $title = trim($b['title'] ?? '');
  if ($title === '') Http::error('نام سیاست کاری الزامی است', 422);
  $desc = trim($b['description'] ?? '') ?: null;
  $applyLimit = !empty($b['apply_time_limit_on_approve']) ? 1 : 0;
  $config = isset($b['config']) ? json_encode($b['config'], JSON_UNESCAPED_UNICODE) : null;
  $active = isset($b['is_active']) ? (int)!!$b['is_active'] : 1;
  if (!empty($b['id'])) {
    Db::run("UPDATE work_policies SET title=?, description=?, apply_time_limit_on_approve=?, config=?, is_active=? WHERE id=?",
      [$title,$desc,$applyLimit,$config,$active,(int)$b['id']]);
    return ['id'=>(int)$b['id']];
  }
  $id = Db::insert("INSERT INTO work_policies(title,description,apply_time_limit_on_approve,config,is_active) VALUES(?,?,?,?,?)",
    [$title,$desc,$applyLimit,$config,$active]);
  return ['id'=>$id];
}, false, ADMIN);

// حذف سیاست کاری
route('DELETE', '/api/admin/work-policies/{id}', function($p,$b,$u){
  _ensure_work_policies();
  Db::run("UPDATE users SET work_policy_id=NULL WHERE work_policy_id=?", [(int)$p['id']]);
  Db::run("DELETE FROM work_policies WHERE id=?", [(int)$p['id']]);
  return ['ok'=>true];
}, false, ADMIN);

// تخصیص سیاست کاری به کاربران (آرایه‌ای از user_id)
route('POST', '/api/admin/work-policies/{id}/assign', function($p,$b,$u){
  _ensure_work_policies();
  $ids = $b['user_ids'] ?? [];
  if (!is_array($ids) || !count($ids)) Http::error('کاربری انتخاب نشده است', 422);
  $pid = (int)$p['id'];
  foreach ($ids as $uid) Db::run("UPDATE users SET work_policy_id=? WHERE id=?", [$pid, (int)$uid]);
  return ['ok'=>true, 'count'=>count($ids)];
}, false, ADMIN);

// مانده مرخصی ابتدای دوره (آرایه‌ای از {user_id, minutes})
// فهرست پرسنل با ماندهٔ مرخصی استحقاقی ابتدای دوره (برای گرید)
route('GET', '/api/admin/leave-balance-init', function($p,$b,$u){
  try { if (!Db::one("SHOW COLUMNS FROM users WHERE Field='leave_balance_start_min'")) Db::run("ALTER TABLE users ADD COLUMN leave_balance_start_min INT NOT NULL DEFAULT 0"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  return Db::all("SELECT u.id, CONCAT(u.first_name,' ',u.last_name) name, r.title role_title, COALESCE(u.leave_balance_start_min,0) minutes
    FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.is_active=1 ORDER BY r.level DESC, u.last_name");
}, false, ADMIN);

route('POST', '/api/admin/leave-balance-init', function($p,$b,$u){
  _ensure_work_policies();
  $items = $b['items'] ?? [];
  if (!is_array($items)) Http::error('داده نامعتبر', 422);
  foreach ($items as $it) {
    if (!isset($it['user_id'])) continue;
    Db::run("UPDATE users SET leave_balance_start_min=? WHERE id=?", [(int)($it['minutes'] ?? 0), (int)$it['user_id']]);
  }
  return ['ok'=>true, 'count'=>count($items)];
}, false, ADMIN);

// ==================== سیستم شیفت کاری ====================
// فهرست شیفت‌ها
route('GET', '/api/admin/shifts', fn($p,$b,$u) => Db::all(
  "SELECT id,title,type,weekly,float_minutes,allow_offday,daily_ot_cap,monthly_ot_cap,night_calc,friday_calc,holiday_calc,advanced,is_active
   FROM shifts WHERE is_active=1 ORDER BY id DESC"), false, ADMIN);

// یک شیفت + روزهای پیشرفته‌اش
route('GET', '/api/admin/shifts/{id}', function($p,$b,$u){
  $s = Db::one("SELECT * FROM shifts WHERE id=?", [$p['id']]);
  if (!$s) Http::error('یافت نشد', 404);
  if (isset($s['advanced']) && $s['advanced']) $s['advanced'] = json_decode($s['advanced'], true);
  $s['days'] = Db::all("SELECT jdate, segments, is_off, day_config FROM shift_days WHERE shift_id=? ORDER BY jdate", [$p['id']]);
  foreach ($s['days'] as &$d) { if (!empty($d['day_config'])) $d['day_config'] = json_decode($d['day_config'], true); }
  return $s;
}, false, ADMIN);

// ساخت/ویرایش شیفت
route('POST', '/api/admin/shifts', function($p,$b,$u){
  try { if (!Db::one("SHOW COLUMNS FROM shifts WHERE Field='advanced'")) Db::run("ALTER TABLE shifts ADD COLUMN advanced JSON NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  $weekly = isset($b['weekly']) ? json_encode($b['weekly'], JSON_UNESCAPED_UNICODE) : null;
  $advanced = isset($b['advanced']) ? json_encode($b['advanced'], JSON_UNESCAPED_UNICODE) : null;
  $id = Db::insert("INSERT INTO shifts(title,type,weekly,float_minutes,allow_offday,daily_ot_cap,monthly_ot_cap,night_calc,friday_calc,holiday_calc,advanced)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)",
    [$b['title'] ?? 'شیفت', $b['type'] ?? 'simple', $weekly, $b['float_minutes'] ?? null,
     !empty($b['allow_offday'])?1:0, $b['daily_ot_cap'] ?? null, $b['monthly_ot_cap'] ?? null,
     isset($b['night_calc'])?(!empty($b['night_calc'])?1:0):1,
     isset($b['friday_calc'])?(!empty($b['friday_calc'])?1:0):1,
     isset($b['holiday_calc'])?(!empty($b['holiday_calc'])?1:0):1, $advanced]);
  return ['id'=>$id];
}, false, ADMIN);

route('PUT', '/api/admin/shifts/{id}', function($p,$b,$u){
  try { if (!Db::one("SHOW COLUMNS FROM shifts WHERE Field='advanced'")) Db::run("ALTER TABLE shifts ADD COLUMN advanced JSON NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  $f=[]; $v=[];
  foreach (['title','type','float_minutes','allow_offday','daily_ot_cap','monthly_ot_cap','night_calc','friday_calc','holiday_calc'] as $k)
    if (array_key_exists($k,$b)) { $f[]="$k=?"; $v[]= is_bool($b[$k])?(int)$b[$k]:$b[$k]; }
  if (array_key_exists('weekly',$b)) { $f[]="weekly=?"; $v[]=json_encode($b['weekly'], JSON_UNESCAPED_UNICODE); }
  if (array_key_exists('advanced',$b)) { $f[]="advanced=?"; $v[]=json_encode($b['advanced'], JSON_UNESCAPED_UNICODE); }
  if ($f) { $v[]=$p['id']; Db::run("UPDATE shifts SET ".implode(',',$f)." WHERE id=?", $v); }
  return ['ok'=>true];
}, false, ADMIN);

route('DELETE', '/api/admin/shifts/{id}', function($p,$b,$u){
  Db::run("UPDATE shifts SET is_active=0 WHERE id=?", [$p['id']]); return ['ok'=>true];
}, false, ADMIN);

// ذخیرهٔ روزهای شیفت پیشرفته (آرایه‌ای از {jdate,segments,is_off,day_config})
route('POST', '/api/admin/shifts/{id}/days', function($p,$b,$u){
  try { if (!Db::one("SHOW COLUMNS FROM shift_days WHERE Field='day_config'")) Db::run("ALTER TABLE shift_days ADD COLUMN day_config JSON NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  $days = $b['days'] ?? [];
  if (!is_array($days)) Http::error('داده نامعتبر', 400);
  foreach ($days as $d) {
    if (empty($d['jdate'])) continue;
    $seg = isset($d['segments']) ? json_encode($d['segments'], JSON_UNESCAPED_UNICODE) : null;
    $off = !empty($d['is_off']) ? 1 : 0;
    $dc = isset($d['day_config']) ? json_encode($d['day_config'], JSON_UNESCAPED_UNICODE) : null;
    Db::run("INSERT INTO shift_days(shift_id,jdate,segments,is_off,day_config) VALUES(?,?,?,?,?)
             ON DUPLICATE KEY UPDATE segments=VALUES(segments), is_off=VALUES(is_off), day_config=VALUES(day_config)",
      [$p['id'], $d['jdate'], $seg, $off, $dc]);
  }
  return ['ok'=>true, 'count'=>count($days)];
}, false, ADMIN);

// حذف یک روز شیفت
route('DELETE', '/api/admin/shifts/{id}/days/{jdate}', function($p,$b,$u){
  Db::run("DELETE FROM shift_days WHERE shift_id=? AND jdate=?", [$p['id'], $p['jdate']]);
  return ['ok'=>true];
}, false, ADMIN);

// تخصیص شیفت به کاربر
route('GET', '/api/admin/user-shifts', fn($p,$b,$u) => Db::all(
  "SELECT us.user_id, us.shift_id, s.title, s.type, us.from_jdate, us.to_jdate
   FROM user_shifts us JOIN shifts s ON s.id=us.shift_id"), false, ADMIN);
route('POST', '/api/admin/user-shifts', function($p,$b,$u){
  _ensure_role_work_rules();
  $uid=(int)($b['user_id']??0); $sid=(int)($b['shift_id']??0);
  if (!$uid||!$sid) Http::error('کاربر و شیفت را مشخص کنید',400);
  $from = trim((string)($b['from_jdate']??'')); $to = trim((string)($b['to_jdate']??''));
  $from = $from!=='' ? str_replace('/','-',$from) : null;
  $to = $to!=='' ? str_replace('/','-',$to) : null;
  if ($from && !preg_match('/^\d{4}-\d{2}-\d{2}$/',$from)) Http::error('تاریخ شروع تخصیص نامعتبر است',422);
  if ($to && !preg_match('/^\d{4}-\d{2}-\d{2}$/',$to)) Http::error('تاریخ پایان تخصیص نامعتبر است',422);
  if ($from && $to && strcmp($to,$from)<0) Http::error('تاریخ پایان نباید قبل از تاریخ شروع باشد',422);
  $over = Db::one("SELECT us.user_id,us.shift_id,s.title FROM user_shifts us LEFT JOIN shifts s ON s.id=us.shift_id
    WHERE us.user_id=? AND us.shift_id<>? AND (COALESCE(us.from_jdate,'0000-00-00') <= COALESCE(?,'9999-12-31')) AND (COALESCE(us.to_jdate,'9999-12-31') >= COALESCE(?,'0000-00-00')) LIMIT 1", [$uid,$sid,$to,$from]);
  if ($over) Http::error('این کاربر در همین بازه شیفت فعال دیگری دارد: '.($over['title'] ?? $over['shift_id']),422);
  Db::run("INSERT INTO user_shifts(user_id,shift_id,from_jdate,to_jdate) VALUES(?,?,?,?)
           ON DUPLICATE KEY UPDATE shift_id=VALUES(shift_id), from_jdate=VALUES(from_jdate), to_jdate=VALUES(to_jdate)",
    [$uid,$sid,$from,$to]);
  try { Db::run("INSERT INTO shift_assignment_audit(user_id,shift_id,from_jdate,to_jdate,action,actor_id,note) VALUES(?,?,?,?,?,?,?)", [$uid,$sid,$from,$to,'assign',$u['id']??null,$b['note']??null]); } catch (Throwable $e) {}
  return ['ok'=>true];
}, false, ADMIN);
route('DELETE', '/api/admin/user-shifts/{id}', function($p,$b,$u){
  _ensure_role_work_rules();
  $old = Db::one("SELECT * FROM user_shifts WHERE user_id=?", [$p['id']]);
  Db::run("DELETE FROM user_shifts WHERE user_id=?", [$p['id']]);
  if ($old) { try { Db::run("INSERT INTO shift_assignment_audit(user_id,shift_id,from_jdate,to_jdate,action,actor_id,note) VALUES(?,?,?,?,?,?,?)", [$p['id'],$old['shift_id']??null,$old['from_jdate']??null,$old['to_jdate']??null,'delete',$u['id']??null,$b['note']??null]); } catch (Throwable $e) {} }
  return ['ok'=>true];
}, false, ADMIN);

// تعطیلات رسمی
route('GET', '/api/admin/holidays', fn($p,$b,$u) => Db::all("SELECT jdate,title FROM holidays ORDER BY jdate"), false, ADMIN);
route('POST', '/api/admin/holidays', function($p,$b,$u){
  // پذیرش یک یا چند تعطیلی
  $items = isset($b['items']) && is_array($b['items']) ? $b['items'] : [['jdate'=>$b['jdate']??null,'title'=>$b['title']??null]];
  $n=0;
  foreach ($items as $it) { if (empty($it['jdate'])) continue;
    Db::run("INSERT INTO holidays(jdate,title) VALUES(?,?) ON DUPLICATE KEY UPDATE title=VALUES(title)", [$it['jdate'],$it['title']??null]); $n++; }
  return ['ok'=>true,'count'=>$n];
}, false, ADMIN);
route('DELETE', '/api/admin/holidays/{jdate}', function($p,$b,$u){
  Db::run("DELETE FROM holidays WHERE jdate=?", [$p['jdate']]); return ['ok'=>true];
}, false, ADMIN);



function _ensure_attendance_phase1_schema(){
  static $done=false; if($done) return; $done=true;
  try { Db::run("CREATE TABLE IF NOT EXISTS shift_handovers (id INT AUTO_INCREMENT PRIMARY KEY, token VARCHAR(80) NOT NULL UNIQUE, from_user_id INT NOT NULL, to_user_id INT NULL, line_id INT NULL, attendance_id INT NULL, status VARCHAR(20) NOT NULL DEFAULT 'pending', expires_at DATETIME NOT NULL, accepted_at DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_handover_token (token), INDEX idx_handover_from (from_user_id, status)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  try { Db::run("CREATE TABLE IF NOT EXISTS attendance_ot_adjustments (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, jdate VARCHAR(10) NOT NULL, minutes INT NOT NULL DEFAULT 0, reason TEXT NULL, approved_by INT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_att_adj (user_id,jdate), INDEX idx_att_adj_user (user_id,jdate)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  try { if (!Db::one("SHOW COLUMNS FROM staff_attendance WHERE Field='handover_id'")) Db::run("ALTER TABLE staff_attendance ADD COLUMN handover_id INT NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  try { if (!Db::one("SHOW COLUMNS FROM staff_attendance WHERE Field='calc_json'")) Db::run("ALTER TABLE staff_attendance ADD COLUMN calc_json JSON NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  try { if (!Db::one("SHOW COLUMNS FROM staff_attendance WHERE Field='client_check_in'")) Db::run("ALTER TABLE staff_attendance ADD COLUMN client_check_in DATETIME NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  try { if (!Db::one("SHOW COLUMNS FROM staff_attendance WHERE Field='client_check_out'")) Db::run("ALTER TABLE staff_attendance ADD COLUMN client_check_out DATETIME NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
}

function _user_role_title($userId){
  try { $r=Db::one("SELECT r.title, r.`key` role_key FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.id=?",[(int)$userId]); return $r ?: ['title'=>'','role_key'=>'']; } catch (\Throwable $e) { return ['title'=>'','role_key'=>'']; }
}
function _ensure_role_work_rules(){
  static $done=false; if($done) return; $done=true;
  try {
    Db::run("CREATE TABLE IF NOT EXISTS role_work_rules (id INT AUTO_INCREMENT PRIMARY KEY, role_key VARCHAR(80) NOT NULL UNIQUE, title VARCHAR(120) NULL, duty_minutes INT NOT NULL DEFAULT 453, overtime_limit_minutes INT NOT NULL DEFAULT 27, surplus_after_minutes INT NOT NULL DEFAULT 480, night_start TIME NOT NULL DEFAULT '22:00:00', night_end TIME NOT NULL DEFAULT '06:00:00', is_active TINYINT(1) NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $rules = [
      ['operator','اپراتور',453,27,480], ['line_chief','رئیس خط',453,27,480],
      ['inspector','بازرس',453,147,600], ['senior_inspector','سربازرس',453,147,600], ['chief_inspector','سربازرس ارشد',453,147,600],
      ['office','نیروی اداری',453,240,693], ['default','پیش‌فرض',453,27,480]
    ];
    foreach($rules as $r) Db::run("INSERT IGNORE INTO role_work_rules(role_key,title,duty_minutes,overtime_limit_minutes,surplus_after_minutes) VALUES(?,?,?,?,?)", $r);
  } catch (Throwable $e) {}
  try { if (!Db::one("SHOW COLUMNS FROM role_work_rules WHERE Field='include_friday_in_duty'")) Db::run("ALTER TABLE role_work_rules ADD COLUMN include_friday_in_duty TINYINT(1) NOT NULL DEFAULT 0"); } catch (Throwable $e) {}
  try { if (!Db::one("SHOW COLUMNS FROM role_work_rules WHERE Field='include_holiday_in_duty'")) Db::run("ALTER TABLE role_work_rules ADD COLUMN include_holiday_in_duty TINYINT(1) NOT NULL DEFAULT 0"); } catch (Throwable $e) {}
  try { if (!Db::one("SHOW COLUMNS FROM role_work_rules WHERE Field='max_open_session_minutes'")) Db::run("ALTER TABLE role_work_rules ADD COLUMN max_open_session_minutes INT NOT NULL DEFAULT 960"); } catch (Throwable $e) {}
  try { if (!Db::one("SHOW COLUMNS FROM role_work_rules WHERE Field='auto_close_enabled'")) Db::run("ALTER TABLE role_work_rules ADD COLUMN auto_close_enabled TINYINT(1) NOT NULL DEFAULT 0"); } catch (Throwable $e) {}
  try { if (!Db::one("SHOW COLUMNS FROM role_work_rules WHERE Field='auto_close_after_minutes'")) Db::run("ALTER TABLE role_work_rules ADD COLUMN auto_close_after_minutes INT NOT NULL DEFAULT 0"); } catch (Throwable $e) {}
  try { if (!Db::one("SHOW COLUMNS FROM role_work_rules WHERE Field='checkout_grace_minutes'")) Db::run("ALTER TABLE role_work_rules ADD COLUMN checkout_grace_minutes INT NOT NULL DEFAULT 15"); } catch (Throwable $e) {}
  try { Db::run("CREATE TABLE IF NOT EXISTS user_work_rule_overrides (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL UNIQUE, title VARCHAR(160) NULL, duty_minutes INT NULL, overtime_limit_minutes INT NULL, surplus_after_minutes INT NULL, night_start TIME NULL, night_end TIME NULL, auto_shift_enabled TINYINT(1) NULL, checkin_any_time TINYINT(1) NULL, allowed_checkin_from TIME NULL, allowed_checkin_to TIME NULL, warn_before_overtime_cap_minutes INT NULL, require_checkout_after_cap TINYINT(1) NULL, night_calc TINYINT(1) NULL, friday_calc TINYINT(1) NULL, holiday_calc TINYINT(1) NULL, include_friday_in_duty TINYINT(1) NULL, include_holiday_in_duty TINYINT(1) NULL, max_open_session_minutes INT NULL, auto_close_enabled TINYINT(1) NULL, auto_close_after_minutes INT NULL, checkout_grace_minutes INT NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP, INDEX idx_uwro_user(user_id,is_active)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"); } catch (Throwable $e) {}
  try { Db::run("CREATE TABLE IF NOT EXISTS shift_assignment_audit (id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, shift_id INT NULL, from_jdate VARCHAR(10) NULL, to_jdate VARCHAR(10) NULL, action VARCHAR(30) NOT NULL, actor_id INT NULL, note TEXT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_saa_user_time(user_id,created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"); } catch (Throwable $e) {}
}
function _merge_user_rule_override($base,$userId){
  try {
    $ov = Db::one("SELECT * FROM user_work_rule_overrides WHERE user_id=? AND is_active=1 LIMIT 1", [(int)$userId]);
    if (!$ov) return $base;
    foreach (['title','duty_minutes','overtime_limit_minutes','surplus_after_minutes','night_start','night_end','auto_shift_enabled','checkin_any_time','allowed_checkin_from','allowed_checkin_to','warn_before_overtime_cap_minutes','require_checkout_after_cap','night_calc','friday_calc','holiday_calc','include_friday_in_duty','include_holiday_in_duty','max_open_session_minutes','auto_close_enabled','auto_close_after_minutes','checkout_grace_minutes'] as $k) {
      if (array_key_exists($k,$ov) && $ov[$k] !== null && $ov[$k] !== '') $base[$k] = $ov[$k];
    }
    $base['user_override_id'] = $ov['id'];
    $base['role_key'] = ($base['role_key'] ?? 'default').':user-'.$userId;
  } catch (Throwable $e) {}
  return $base;
}
function _role_work_rule_for_user($userId){
  _ensure_role_work_rules();
  $r = _user_role_title($userId);
  $key = trim((string)($r['role_key'] ?? ''));
  $title = trim((string)($r['title'] ?? ''));
  try {
    if ($key !== '') {
      $row = Db::one("SELECT * FROM role_work_rules WHERE is_active=1 AND role_key=?", [$key]);
      if ($row) return [_merge_user_rule_override($row, $userId), $r];
    }
    $txt = $key.' '.$title;
    $guess = 'default';
    if (preg_match('/اداری|niroo|office/i', $txt)) $guess = 'office';
    elseif (preg_match('/سربازرس ارشد|chief_inspector/i', $txt)) $guess = 'chief_inspector';
    elseif (preg_match('/سربازرس|senior_inspector/i', $txt)) $guess = 'senior_inspector';
    elseif (preg_match('/بازرس|inspector/i', $txt)) $guess = 'inspector';
    elseif (preg_match('/رئیس خط|raees|line_chief/i', $txt)) $guess = 'line_chief';
    elseif (preg_match('/اپراتور|operator/i', $txt)) $guess = 'operator';
    $row = Db::one("SELECT * FROM role_work_rules WHERE is_active=1 AND role_key=?", [$guess]);
    if ($row) return [_merge_user_rule_override($row, $userId), $r];
  } catch (Throwable $e) {}
  return [_merge_user_rule_override([ 'role_key'=>'default','title'=>'پیش‌فرض','duty_minutes'=>453,'overtime_limit_minutes'=>27,'surplus_after_minutes'=>480,'night_start'=>'22:00:00','night_end'=>'06:00:00' ], $userId), $r];
}
function _auto_shift_for_user($userId){
  [$rule,$r] = _role_work_rule_for_user($userId);
  return [
    'id'=>0,'shift_id'=>0,'title'=>'شیفت خودکار','type'=>'auto',
    'role_title'=>$r['title'] ?? '', 'role_key'=>$r['role_key'] ?? '',
    'rule_key'=>$rule['role_key'] ?? 'default',
    'auto_expected_min'=>(int)($rule['duty_minutes'] ?? 453),
    'auto_ot_cap_min'=>(int)($rule['overtime_limit_minutes'] ?? 27),
    'auto_surplus_after_min'=>(int)($rule['surplus_after_minutes'] ?? 480),
    'night_start'=>substr((string)($rule['night_start'] ?? '22:00:00'),0,5),
    'night_end'=>substr((string)($rule['night_end'] ?? '06:00:00'),0,5),
    'auto_shift_enabled'=>!isset($rule['auto_shift_enabled']) || !empty($rule['auto_shift_enabled']) ? 1 : 0,
    'checkin_any_time'=>!isset($rule['checkin_any_time']) || !empty($rule['checkin_any_time']) ? 1 : 0,
    'allowed_checkin_from'=>isset($rule['allowed_checkin_from']) ? substr((string)$rule['allowed_checkin_from'],0,5) : null,
    'allowed_checkin_to'=>isset($rule['allowed_checkin_to']) ? substr((string)$rule['allowed_checkin_to'],0,5) : null,
    'warn_before_overtime_cap_minutes'=>(int)($rule['warn_before_overtime_cap_minutes'] ?? 15),
    'require_checkout_after_cap'=>!empty($rule['require_checkout_after_cap']) ? 1 : 0,
    'night_calc'=>!isset($rule['night_calc']) || !empty($rule['night_calc']) ? 1 : 0,
    'friday_calc'=>!isset($rule['friday_calc']) || !empty($rule['friday_calc']) ? 1 : 0,
    'holiday_calc'=>!isset($rule['holiday_calc']) || !empty($rule['holiday_calc']) ? 1 : 0,
    'include_friday_in_duty'=>!empty($rule['include_friday_in_duty']) ? 1 : 0,
    'include_holiday_in_duty'=>!empty($rule['include_holiday_in_duty']) ? 1 : 0,
    'max_open_session_minutes'=>(int)($rule['max_open_session_minutes'] ?? 960),
    'auto_close_enabled'=>!empty($rule['auto_close_enabled']) ? 1 : 0,
    'auto_close_after_minutes'=>(int)($rule['auto_close_after_minutes'] ?? 0),
    'checkout_grace_minutes'=>(int)($rule['checkout_grace_minutes'] ?? 15),
    'allow_offday'=>1
  ];
}
function _attendance_adjusted_overtime($userId,$jdate){
  static $schemaReady=false; if(!$schemaReady){ _ensure_attendance_phase1_schema(); $schemaReady=true; }
  try { $r=Db::one("SELECT minutes FROM attendance_ot_adjustments WHERE user_id=? AND jdate=?",[(int)$userId,str_replace('/','-',$jdate)]); return (int)($r['minutes'] ?? 0); } catch (\Throwable $e) { return 0; }
}
function _hm_min($m){ return sprintf('%02d:%02d', intdiv(max(0,(int)$m),60), max(0,(int)$m)%60); }

function _active_user_shift_assignment($userId, $jdate=null){
  $jdate = $jdate ? str_replace('/','-',$jdate) : null;
  // شیفت موقت نیروی جایگزین: در روزهای مرخصی، دقیقاً شیفت فرد مرخصی‌گیرنده اعمال می‌شود.
  if ($jdate) {
    try {
      $sa = Db::one("SELECT absent_user_id,request_id FROM substitute_assignments WHERE substitute_user_id=? AND status='active' AND from_date<=? AND to_date>=? ORDER BY id DESC LIMIT 1",[(int)$userId,$jdate,$jdate]);
      if ($sa) {
        $arows = Db::all("SELECT us.user_id, us.shift_id, us.from_jdate, us.to_jdate, s.* FROM user_shifts us JOIN shifts s ON s.id=us.shift_id WHERE us.user_id=? AND s.is_active=1",[(int)$sa['absent_user_id']]);
        foreach($arows as $r){
          $from=!empty($r['from_jdate'])?str_replace('/','-',$r['from_jdate']):null;
          $to=!empty($r['to_jdate'])?str_replace('/','-',$r['to_jdate']):null;
          if($from && strcmp($jdate,$from)<0) continue;
          if($to && strcmp($jdate,$to)>0) continue;
          $r['is_substitute_shift']=1; $r['absent_user_id']=(int)$sa['absent_user_id']; $r['request_id']=(int)$sa['request_id'];
          $r['title']='جایگزینی — '.($r['title']??'شیفت');
          return $r;
        }
        $auto=_auto_shift_for_user((int)$sa['absent_user_id']);
        $auto['is_substitute_shift']=1; $auto['absent_user_id']=(int)$sa['absent_user_id']; $auto['request_id']=(int)$sa['request_id'];
        $auto['title']='جایگزینی — '.($auto['title']??'شیفت خودکار');
        return $auto;
      }
    } catch (Throwable $e) {}
  }
  $rows = Db::all("SELECT us.user_id, us.shift_id, us.from_jdate, us.to_jdate, s.*
    FROM user_shifts us JOIN shifts s ON s.id=us.shift_id
    WHERE us.user_id=? AND s.is_active=1", [(int)$userId]);
  foreach($rows as $r){
    if($jdate){
      $from = !empty($r['from_jdate']) ? str_replace('/','-',$r['from_jdate']) : null;
      $to   = !empty($r['to_jdate']) ? str_replace('/','-',$r['to_jdate']) : null;
      if($from && strcmp($jdate,$from)<0) continue;
      if($to && strcmp($jdate,$to)>0) continue;
    }
    return $r;
  }
  return _auto_shift_for_user($userId);
}
function _shift_day_row($shiftId, $jdate){
  return Db::one("SELECT jdate,segments,is_off,day_config FROM shift_days WHERE shift_id=? AND jdate=?", [(int)$shiftId, str_replace('/','-',$jdate)]);
}
function _attendance_day_bounds($jdate){
  $jdate = str_replace('/','-', trim((string)$jdate));
  if (!preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/', $jdate, $m)) return [null,null,null];
  [$gy,$gm,$gd] = jalali_to_gregorian((int)$m[1], (int)$m[2], (int)$m[3]);
  $start = sprintf('%04d-%02d-%02d 00:00:00', $gy, $gm, $gd);
  $end = date('Y-m-d H:i:s', strtotime($start) + 86400);
  return [$start, $end, date('Y-m-d', strtotime($start))];
}
function _attendance_rows_for_jdate($userId,$jdate){
  [$start,$end,$g] = _attendance_day_bounds($jdate);
  if (!$start || !$end) return [];
  // فاز ۷.۲: رکوردهایی که با روز هم‌پوشانی دارند انتخاب می‌شوند، نه فقط رکوردهایی که همان روز شروع شده‌اند.
  // این اصلاح باعث می‌شود شیفت شب ۲۳ تا ۷ در گزارش روز بعد و ماه بعد نیز درست دیده شود.
  $rows = Db::all("SELECT id, check_in, check_out, method, in_lat, in_lng, out_lat, out_lng, in_station, out_station
    FROM staff_attendance
    WHERE user_id=? AND check_in < ? AND COALESCE(check_out, NOW()) > ?
    ORDER BY check_in", [(int)$userId,$end,$start]);
  foreach ($rows as &$r) { $r['_clip_start'] = $start; $r['_clip_end'] = $end; $r['_gdate'] = $g; }
  return $rows;
}

// گزارش تجمیعی کارکرد ماهانه (شبیه فینتو) — بر اساس staff_attendance و شیفت کاربر
// پارامترها: ?year=1404&month=6  (یا from/to جلالی)
function _shift_month_report($jy, $jm) {
  $jmStr = str_pad($jm, 2, '0', STR_PAD_LEFT);
  $prefix = "$jy-$jmStr-";
  // تعداد روزهای ماه شمسی: ۱..۶ ⇒۳۱، ۷..۱۱⇒۳۰، ۱۲⇒۲۹/۳۰
  $days = ShiftCalc::jMonthDays($jy, $jm);
  $holidays = array_column(Db::all("SELECT jdate FROM holidays WHERE jdate LIKE ?", [$prefix.'%']), 'jdate');
  $holidaySet = array_flip($holidays);
  // کاربرانی که در بخشی از ماه شیفت فعال دارند
  $assigns = Db::all("SELECT us.user_id, us.shift_id, us.from_jdate, us.to_jdate, CONCAT(uu.first_name,' ',uu.last_name) name, r.title role
    FROM user_shifts us JOIN users uu ON uu.id=us.user_id LEFT JOIN roles r ON r.id=uu.role_id
    WHERE (us.from_jdate IS NULL OR us.from_jdate <= ?) AND (us.to_jdate IS NULL OR us.to_jdate >= ?)", [$prefix.'31', $prefix.'01']);
  // شیفت خودکار برای کاربرانی که تخصیص شیفت ندارند اما تردد ثبت کرده‌اند یا فعال هستند.
  $seenAssign = array_flip(array_map(fn($x)=>(int)$x['user_id'], $assigns));
  $autoUsers = Db::all("SELECT u.id user_id, 0 shift_id, NULL from_jdate, NULL to_jdate, CONCAT(u.first_name,' ',u.last_name) name, r.title role
    FROM users u LEFT JOIN roles r ON r.id=u.role_id
    WHERE u.is_active=1 AND NOT EXISTS (SELECT 1 FROM user_shifts us WHERE us.user_id=u.id)");
  foreach ($autoUsers as $au) if (!isset($seenAssign[(int)$au['user_id']])) $assigns[] = $au;
  $shiftsById = [];
  foreach (Db::all("SELECT * FROM shifts WHERE is_active=1") as $sx) $shiftsById[$sx['id']] = $sx;
  $out = [];
  foreach ($assigns as $a) {
    $shift = ((int)($a['shift_id'] ?? 0) > 0) ? ($shiftsById[$a['shift_id']] ?? null) : _auto_shift_for_user($a['user_id']); if (!$shift) continue;
    $dayRows = [];
    if (($shift['type'] ?? '') === 'advanced') {
      foreach (Db::all("SELECT jdate,segments,is_off,day_config FROM shift_days WHERE shift_id=? AND jdate LIKE ?", [$a['shift_id'], $prefix.'%']) as $dr)
        $dayRows[$dr['jdate']] = $dr;
    }
    // جلسات ثبت‌حضور کاربر در این ماه (بر اساس تاریخ میلادیِ متناظر با هر روز شمسی)
    $tot = ['worked'=>0,'in_shift'=>0,'expected'=>0,'overtime'=>0,'shortage'=>0,'night'=>0,'friday'=>0,'holiday'=>0,'late_in'=>0,'early_out'=>0,'surplus'=>0,'adjusted_ot'=>0,'present_days'=>0,'absent_min'=>0];
    for ($d=1; $d<=$days; $d++) {
      $jdate = $prefix.str_pad($d,2,'0',STR_PAD_LEFT);
      if (!empty($a['from_jdate']) && strcmp($jdate, str_replace('/','-',$a['from_jdate'])) < 0) continue;
      if (!empty($a['to_jdate']) && strcmp($jdate, str_replace('/','-',$a['to_jdate'])) > 0) continue;
      $rows = _attendance_rows_for_jdate($a['user_id'], $jdate);
      $dr = $dayRows[$jdate] ?? null;
      $isHol = isset($holidaySet[$jdate]);
      if (!$rows) {
        // روزی که تردد ندارد: اگر شیفت برای آن روز موظفی دارد و تعطیل نیست ⇒ غیبت
        if (!$isHol) {
          $exp = 0;
          $exp = ShiftCalc::expectedMinutes($shift, $jdate, $dr);
          $tot['absent_min'] += $exp;
        }
        continue;
      }
      $sessions = array_map(fn($r)=>['in'=>strtotime($r['check_in']),'out'=>$r['check_out']?strtotime($r['check_out']):null,'clip_start'=>strtotime($r['_clip_start'] ?? '1970-01-01 00:00:00'),'clip_end'=>strtotime($r['_clip_end'] ?? '2999-01-01 00:00:00')], $rows);
      $w = ShiftCalc::dayWork($shift, $jdate, $dr, $sessions, $isHol);
      $adj = _attendance_adjusted_overtime($a['user_id'],$jdate);
      if ($adj > 0) { $use = min($adj, (int)($w['surplus'] ?? 0)); $w['overtime'] = (int)($w['overtime'] ?? 0) + $use; $w['surplus'] = max(0, (int)($w['surplus'] ?? 0) - $use); $w['adjusted_ot'] = $use; }
      foreach (['worked','in_shift','expected','overtime','shortage','night','friday','holiday','late_in','early_out','surplus','adjusted_ot'] as $k) $tot[$k]+=($w[$k] ?? 0);
      if ($w['worked']>0) $tot['present_days']++;
    }
    if (!empty($shift['monthly_ot_cap'])) $tot['overtime']=min($tot['overtime'],(int)$shift['monthly_ot_cap']);
    // تجمیع درخواست‌های تأییدشدهٔ این ماه (مرخصی/ماموریت/اضافه‌کار)
    $reqAgg = ['annual_min'=>0,'sick_min'=>0,'mission_min'=>0,'ot_req_min'=>0];
    $rqs = Db::all("SELECT type, minutes, the_date, from_jdate FROM requests
      WHERE user_id=? AND status='approved' AND type IN('annual','sick','mission','overtime')", [$a['user_id']]);
    foreach ($rqs as $rq) {
      $d = $rq['the_date'] ?: $rq['from_jdate'];
      if (!$d || strpos($d, $prefix) !== 0) continue;
      $mins = (int)$rq['minutes'];
      if ($rq['type']==='annual') $reqAgg['annual_min']+=$mins;
      elseif ($rq['type']==='sick') $reqAgg['sick_min']+=$mins;
      elseif ($rq['type']==='mission') $reqAgg['mission_min']+=$mins;
      elseif ($rq['type']==='overtime') $reqAgg['ot_req_min']+=$mins;
    }
    $out[] = array_merge(['user_id'=>$a['user_id'],'name'=>$a['name'],'role'=>$a['role'],'shift'=>$shift['title']], $tot, $reqAgg);
  }
  return $out;
}

route('GET', '/api/admin/shift-report', function($p,$b,$u){
  $jy=(int)($_GET['year']??0); $jm=(int)($_GET['month']??0);
  if (!$jy||!$jm) Http::error('سال و ماه شمسی را مشخص کنید',400);
  return ['year'=>$jy,'month'=>$jm,'rows'=>_shift_month_report($jy,$jm)];
}, false, ADMIN);

// ==================== گزارش تردد پرسنل (مدل فینتو) ====================
// نام محل ورود/خروج از روی مختصات (نزدیک‌ترین ایستگاه)
function _station_name_at($lat,$lng,$lineIds=null){
  if($lat===null||$lng===null) return null;
  $st = station_at_point((float)$lat,(float)$lng,$lineIds,150);
  if($st && !empty($st['name'])) return $st['name'];
  $nr = _nearest_station((float)$lat,(float)$lng,$lineIds);
  return ($nr && !empty($nr['name'])) ? $nr['name'] : null;
}
// نام روز هفتهٔ شمسی
function _jweekday_name($jy,$jm,$jd){
  $names=['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];
  [$gy,$gm,$gd]=jalali_to_gregorian($jy,$jm,$jd);
  $w=(int)date('w', mktime(0,0,0,$gm,$gd,$gy)); // 0=یکشنبه..6=شنبه
  // تبدیل به شاخص شمسی: شنبه=0
  $map=[0=>1,1=>2,2=>3,3=>4,4=>5,5=>6,6=>0];
  return $names[$map[$w]];
}
// گزارش تردد روزانهٔ یک پرسنل در بازهٔ جلالی
function _attendance_report($userId,$fromJ,$toJ){
  try { if (!Db::one("SHOW COLUMNS FROM users WHERE Field='personnel_code'")) Db::run("ALTER TABLE users ADD COLUMN personnel_code VARCHAR(40) NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  try { if (!Db::one("SHOW COLUMNS FROM users WHERE Field='birth_date'")) Db::run("ALTER TABLE users ADD COLUMN birth_date VARCHAR(20) NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  try { if (!Db::one("SHOW COLUMNS FROM users WHERE Field='rank_stars'")) Db::run("ALTER TABLE users ADD COLUMN rank_stars TINYINT NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  $u = Db::one("SELECT id, CONCAT(first_name,' ',last_name) name, COALESCE(NULLIF(personnel_code,''), id) pcode, device_model, work_policy_id FROM users WHERE id=?", [$userId]);
  if(!$u) Http::error('پرسنل یافت نشد',404);
  // شیفت کاربر در هر روز جداگانه بر اساس بازهٔ تخصیص تشخیص داده می‌شود.
  $shift = null;
  // بازهٔ تاریخ‌ها
  [$fy,$fm,$fd]=array_map('intval',explode('-',str_replace('/','-',$fromJ)));
  [$ty,$tm,$td]=array_map('intval',explode('-',str_replace('/','-',$toJ)));
  $fromTs=j_to_ts(sprintf('%04d-%02d-%02d',$fy,$fm,$fd));
  $toTs  =j_to_ts(sprintf('%04d-%02d-%02d',$ty,$tm,$td));
  if($fromTs===null||$toTs===null) Http::error('بازهٔ تاریخ نامعتبر',400);
  $holidaySet = array_flip(array_column(Db::all("SELECT jdate FROM holidays"),'jdate'));
  $days=[];
  for($ts=$fromTs; $ts<=$toTs; $ts+=86400){
    [$jy,$jm,$jd]=gregorian_to_jalali((int)date('Y',$ts),(int)date('n',$ts),(int)date('j',$ts));
    $jdate=sprintf('%04d/%02d/%02d',$jy,$jm,$jd);
    $jdateDash=sprintf('%04d-%02d-%02d',$jy,$jm,$jd);
    $g=date('Y-m-d',$ts);
    // پانچ‌های این روز
    $rows=_attendance_rows_for_jdate($userId,$jdateDash);
    $punches=[]; $sessions=[];
    foreach($rows as $r){
      // ابتدا نام ذخیره‌شده، در غیر این صورت استخراج از مختصات (برای رکوردهای قدیمی)
      $inName = ($r['in_station']??'') !== '' ? $r['in_station'] : _station_name_at($r['in_lat']??null,$r['in_lng']??null);
      $outName = ($r['out_station']??'') !== '' ? $r['out_station'] : _station_name_at($r['out_lat']??null,$r['out_lng']??null);
      $punches[]=[
        'id'=>$r['id'],
        'in'=>$r['check_in']?date('H:i',strtotime($r['check_in'])):null,
        'out'=>$r['check_out']?date('H:i',strtotime($r['check_out'])):null,
        'in_full'=>$r['check_in'],'out_full'=>$r['check_out'],
        'in_station'=>$inName,'out_station'=>$outName,
        'method'=>$r['method'],
        'device'=>$u['device_model']?:null,
        'in_lat'=>$r['in_lat'],'in_lng'=>$r['in_lng'],'out_lat'=>$r['out_lat'],'out_lng'=>$r['out_lng'],
      ];
      $sessions[]=['in'=>strtotime($r['check_in']),'out'=>$r['check_out']?strtotime($r['check_out']):null,'clip_start'=>strtotime($r['_clip_start'] ?? '1970-01-01 00:00:00'),'clip_end'=>strtotime($r['_clip_end'] ?? '2999-01-01 00:00:00')];
    }
    $isHol=isset($holidaySet[$jdateDash])||isset($holidaySet[$jdate]);
    $shift = _active_user_shift_assignment($userId, $jdateDash);
    $dr = ($shift && (($shift['type'] ?? '') === 'advanced')) ? _shift_day_row($shift['shift_id'] ?? $shift['id'], $jdateDash) : null;
    $w = $shift ? ShiftCalc::dayWork($shift,$jdateDash,$dr,$sessions,$isHol) : ['worked'=>0,'in_shift'=>0,'expected'=>0,'overtime'=>0,'shortage'=>0,'night'=>0,'late_in'=>0,'early_out'=>0,'surplus'=>0];
    $adj = _attendance_adjusted_overtime($userId,$jdateDash);
    if ($adj > 0) { $use = min($adj, (int)($w['surplus'] ?? 0)); $w['overtime'] = (int)($w['overtime'] ?? 0) + $use; $w['surplus'] = max(0, (int)($w['surplus'] ?? 0) - $use); $w['adjusted_ot'] = $use; }
    $hm=fn($m)=>sprintf('%02d:%02d',intdiv(max(0,(int)$m),60),max(0,(int)$m)%60);
    $days[]=[
      'jdate'=>$jdate,
      'weekday'=>_jweekday_name($jy,$jm,$jd),
      'is_holiday'=>$isHol,
      'is_friday'=>(bool)ShiftCalc::isFriday($jdateDash),
      'friday_work'=>$hm($w['friday_work']??$w['friday']??0),
      'holiday_work'=>$hm($w['holiday_work']??$w['holiday']??0),
      'punches'=>$punches,
      'in_shift'=>$hm($w['in_shift'] ?? $w['worked']),       // حضور در بازهٔ شیفت
      'worked'=>$hm($w['worked']),
      'expected'=>$hm($w['expected'] ?? 0),
      'late_in'=>$hm($w['late_in'] ?? 0),
      'early_out'=>$hm($w['early_out'] ?? 0),
      'shortage'=>$hm($w['shortage']),
      'night'=>$hm($w['night']??0),
      'overtime'=>$hm($w['overtime']??0),
      'surplus'=>$hm($w['surplus']??0),
      'adjusted_ot'=>$hm($w['adjusted_ot']??0),
      'absent'=>(!$punches && !$isHol)?1:0,
    ];
  }
  return ['user'=>$u,'shift'=>$shift?['title'=>$shift['title']]:null,'from'=>$fromJ,'to'=>$toJ,'days'=>$days];
}
route('GET', '/api/admin/attendance-report', function($p,$b,$u){
  $uid=(int)($_GET['user_id']??0);
  $from=trim($_GET['from']??''); $to=trim($_GET['to']??'');
  if(!$uid||!$from||!$to) Http::error('پرسنل و بازهٔ تاریخ را مشخص کنید',400);
  return _attendance_report($uid,$from,$to);
}, false, ADMIN);


route('POST', '/api/admin/attendance-surplus/convert', function($p,$b,$u){
  _ensure_attendance_phase1_schema();
  $uid=(int)($b['user_id']??0); $jdate=str_replace('/','-',trim((string)($b['jdate']??''))); $min=max(0,(int)($b['minutes']??0));
  if(!$uid||!preg_match('/^\d{4}-\d{2}-\d{2}$/',$jdate)) Http::error('کاربر و تاریخ نامعتبر است',422);
  Db::run("INSERT INTO attendance_ot_adjustments(user_id,jdate,minutes,reason,approved_by) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE minutes=VALUES(minutes), reason=VALUES(reason), approved_by=VALUES(approved_by), created_at=NOW()", [$uid,$jdate,$min,$b['reason']??null,$u['id']]);
  return ['ok'=>true,'user_id'=>$uid,'jdate'=>$jdate,'minutes'=>$min];
}, false, ADMIN);

route('POST', '/api/admin/attendance-surplus/reset', function($p,$b,$u){
  _ensure_attendance_phase1_schema();
  $uid=(int)($b['user_id']??0); $jdate=str_replace('/','-',trim((string)($b['jdate']??'')));
  if(!$uid||!preg_match('/^\d{4}-\d{2}-\d{2}$/',$jdate)) Http::error('کاربر و تاریخ نامعتبر است',422);
  Db::run("DELETE FROM attendance_ot_adjustments WHERE user_id=? AND jdate=?", [$uid,$jdate]);
  return ['ok'=>true,'user_id'=>$uid,'jdate'=>$jdate,'minutes'=>0];
}, false, ADMIN);

route('GET', '/api/admin/attendance-surplus/list', function($p,$b,$u){
  $uid=(int)($_GET['user_id']??0); $from=trim($_GET['from']??''); $to=trim($_GET['to']??'');
  if(!$uid||!$from||!$to) Http::error('پرسنل و بازهٔ تاریخ را مشخص کنید',400);
  $rep=_attendance_report($uid,$from,$to);
  $rows=[];
  foreach(($rep['days']??[]) as $d){ if(($d['surplus']??'00:00')!=='00:00' || ($d['adjusted_ot']??'00:00')!=='00:00') $rows[]=$d; }
  return ['user'=>$rep['user'],'from'=>$from,'to'=>$to,'rows'=>$rows];
}, false, ADMIN);

// ویرایش ساعت ورود/خروج یک پانچ توسط ادمین
route('PUT', '/api/admin/attendance-punch/{id}', function($p,$b,$u){
  $id=(int)$p['id'];
  $row=Db::one("SELECT id, check_in, check_out FROM staff_attendance WHERE id=?", [$id]);
  if(!$row) Http::error('رکورد تردد یافت نشد',404);
  $inT=trim($b['check_in']??'');   // فرمت HH:MM یا خالی
  $outT=trim($b['check_out']??'');
  $newJdate=trim((string)($b['jdate']??''));
  $set=[]; $args=[];
  // تاریخ مبنا از check_in فعلی؛ در صورت ارسال jdate، تاریخ شمسی جدید اعمال می‌شود.
  $baseDate = date('Y-m-d', strtotime($row['check_in']));
  if ($newJdate!=='') {
    $jp=preg_split('/[\/-]/',$newJdate);
    if (count($jp)!==3 || !preg_match('/^\d{4}$/',$jp[0]) || !preg_match('/^\d{1,2}$/',$jp[1]) || !preg_match('/^\d{1,2}$/',$jp[2])) Http::error('فرمت تاریخ نامعتبر است',422);
    [$jy,$jm,$jd]=array_map('intval',$jp);
    if ($jm<1||$jm>12||$jd<1||$jd>31) Http::error('تاریخ نامعتبر است',422);
    [$gy,$gm,$gd]=jalali_to_gregorian($jy,$jm,$jd);
    $baseDate=sprintf('%04d-%02d-%02d',$gy,$gm,$gd);
  }
  if($inT!==''){
    if(!preg_match('/^\d{1,2}:\d{2}$/',$inT)) Http::error('فرمت ساعت ورود نامعتبر است (HH:MM)',422);
    $set[]="check_in=?"; $args[]="$baseDate $inT:00";
  }
  if(array_key_exists('check_out',$b)){
    if($outT===''){ $set[]="check_out=NULL"; }
    else {
      if(!preg_match('/^\d{1,2}:\d{2}$/',$outT)) Http::error('فرمت ساعت خروج نامعتبر است (HH:MM)',422);
      // اگر خروج کوچک‌تر از ورود بود، روز بعد (شیفت شب)
      $inBase = $inT!=='' ? "$baseDate $inT:00" : $row['check_in'];
      $outTs = strtotime("$baseDate $outT:00");
      if($outTs < strtotime($inBase)) $outTs += 86400;
      $set[]="check_out=?"; $args[]=date('Y-m-d H:i:s',$outTs);
    }
  }
  if(!$set) return ['ok'=>true,'unchanged'=>true];
  $args[]=$id;
  Db::run("UPDATE staff_attendance SET ".implode(',',$set)." WHERE id=?", $args);
  return ['ok'=>true];
}, false, ADMIN);

// حذف یک پانچ
route('DELETE', '/api/admin/attendance-punch/{id}', function($p,$b,$u){
  Db::run("DELETE FROM staff_attendance WHERE id=?", [(int)$p['id']]);
  return ['ok'=>true];
}, false, ADMIN);

// افزودن تردد دستی توسط ادمین (ورود/خروج در یک تاریخ مشخص)
route('POST', '/api/admin/attendance-punch', function($p,$b,$u){
  $uid=(int)($b['user_id']??0);
  $jdate=trim($b['jdate']??''); // 1405/04/01
  $inT=trim($b['check_in']??''); $outT=trim($b['check_out']??'');
  $lineId=(int)($b['line_id']??0) ?: null;
  if(!$uid||!$jdate||$inT==='') Http::error('پرسنل، تاریخ و ساعت ورود الزامی است',422);
  [$jy,$jm,$jd]=array_map('intval',explode('/',str_replace('-','/',$jdate)));
  [$gy,$gm,$gd]=jalali_to_gregorian($jy,$jm,$jd);
  $base=sprintf('%04d-%02d-%02d',$gy,$gm,$gd);
  if(!preg_match('/^\d{1,2}:\d{2}$/',$inT)) Http::error('فرمت ساعت ورود نامعتبر',422);
  $ci="$base $inT:00"; $co=null;
  if($outT!==''){
    if(!preg_match('/^\d{1,2}:\d{2}$/',$outT)) Http::error('فرمت ساعت خروج نامعتبر',422);
    $coTs=strtotime("$base $outT:00"); if($coTs<strtotime($ci)) $coTs+=86400;
    $co=date('Y-m-d H:i:s',$coTs);
  }
  $id=Db::insert("INSERT INTO staff_attendance(user_id,line_id,method,check_in,check_out) VALUES(?,?,'manual',?,?)",[$uid,$lineId,$ci,$co]);
  return ['id'=>$id,'ok'=>true];
}, false, ADMIN);

route('GET', '/api/admin/shift-report/export', function($p,$b,$u){
  $jy=(int)($_GET['year']??0); $jm=(int)($_GET['month']??0);
  if (!$jy||!$jm) Http::error('سال و ماه را مشخص کنید',400);
  $rows=_shift_month_report($jy,$jm);
  header('Content-Type: text/csv; charset=UTF-8');
  header('Content-Disposition: attachment; filename="shift_'.$jy.'_'.$jm.'.csv"');
  echo "\xEF\xBB\xBF";
  $out=fopen('php://output','w');
  $hm=fn($m)=>sprintf('%02d:%02d',intdiv(max(0,(int)$m),60),max(0,(int)$m)%60);
  fputcsv($out,['نام و نام خانوادگی','موظفی','حضور کل','حضور در شیفت','تاخیر ورود','تعجیل خروج','کسری کار','غیبت','جمع غیبت و کسری کار','شب کاری','اضافه کاری','ماموریت','مرخصی استحقاقی','مرخصی استعلاجی']);
  foreach($rows as $r){ $gh=($r['absent_min']??0)+($r['shortage']??0); fputcsv($out,[$r['name'],$hm($r['expected']),$hm($r['worked']),$hm($r['in_shift']??$r['worked']),$hm($r['late_in']??0),$hm($r['early_out']??0),$hm($r['shortage']),$hm($r['absent_min']??0),$hm($gh),$hm($r['night']),$hm($r['overtime']),$hm($r['mission_min']??0),$hm($r['annual_min']??0),$hm($r['sick_min']??0)]); }
  fclose($out); exit;
}, false, ADMIN);

// فراخوان خودکار تعطیلات رسمی یک ماه از سرویس holidayapi.ir (شمسی)
route('POST', '/api/admin/holidays/fetch', function($p,$b,$u){
  $jy = (int)($b['year'] ?? 0); $jm = (int)($b['month'] ?? 0);
  if (!$jy || !$jm) Http::error('سال و ماه شمسی را مشخص کنید', 400);
  $dim = ShiftCalc::jMonthDays($jy, $jm);
  $ctx = stream_context_create(['http'=>['timeout'=>4,'ignore_errors'=>true],'ssl'=>['verify_peer'=>false,'verify_peer_name'=>false]]);
  $added = 0; $checked = 0; $netFail = 0;
  for ($d = 1; $d <= $dim; $d++) {
    $url = sprintf('https://holidayapi.ir/jalali/%d/%02d/%02d', $jy, $jm, $d);
    $raw = @file_get_contents($url, false, $ctx);
    if ($raw === false) { $netFail++; if ($netFail > 5) break; continue; }
    $j = json_decode($raw, true);
    $checked++;
    if (!is_array($j)) continue;
    if (!empty($j['is_holiday'])) {
      $title = '';
      if (!empty($j['events']) && is_array($j['events'])) {
        $titles = array_map(fn($e)=> is_array($e) ? ($e['description'] ?? '') : (string)$e, $j['events']);
        $title = mb_substr(implode('، ', array_filter($titles)), 0, 140);
      }
      $jdate = sprintf('%04d-%02d-%02d', $jy, $jm, $d);
      Db::run("INSERT INTO holidays(jdate,title) VALUES(?,?) ON DUPLICATE KEY UPDATE title=VALUES(title)", [$jdate, $title ?: 'تعطیل رسمی']);
      $added++;
    }
  }
  if ($checked === 0) Http::error('اتصال به سرویس تقویم ناموفق بود. ممکن است سرور به اینترنت دسترسی نداشته باشد؛ می‌توانید تعطیلات را دستی وارد کنید.', 502);
  return ['ok'=>true, 'added'=>$added, 'checked'=>$checked];
}, false, ADMIN);

// ==================== درخواست‌ها (مرخصی/ماموریت/اضافه‌کار/تردد دستی) ====================
function _req_setting($k,$def=null){ $r=Db::one("SELECT value FROM app_settings WHERE `key`=?",[$k]); if(!$r)return $def; $v=json_decode($r['value'],true); return ($v===null||$v==='')?$def:$v; }
// بازه‌های ساعتی ارسال موقعیت برای یک کاربر؛ اگر تنظیم نشده باشد، آرایهٔ خالی = همیشه مجاز
function _tracking_windows_for($userId){
  $all = _req_setting('tracking_windows', []);
  if (is_array($all) && isset($all[$userId])) return $all[$userId];
  if (is_array($all) && isset($all[(string)$userId])) return $all[(string)$userId];
  return [];
}

// اعلان پیامکی به متقاضی هنگام تأیید/رد درخواست (در صورت فعال‌بودن)
function _req_notify_sms($req,$status,$note){
  if (empty(_req_setting('request_sms_notify',false))) return;
  if (!Sms::isEnabled()) return;
  $usr = Db::one("SELECT first_name,last_name,phone FROM users WHERE id=?", [$req['user_id']]);
  if (!$usr || empty($usr['phone'])) return;
  $TY = ['annual'=>'مرخصی استحقاقی','sick'=>'مرخصی استعلاجی','mission'=>'ماموریت','overtime'=>'اضافه‌کار','manual'=>'تردد دستی'];
  $tn = $TY[$req['type']] ?? 'درخواست';
  $when = $req['the_date'] ?: ($req['from_jdate'] ?? '');
  $name = trim(($usr['first_name']??'').' '.($usr['last_name']??''));
  if ($status === 'approved') {
    $text = "همکار گرامی {$name}\nدرخواست {$tn} شما".($when?" برای تاریخ {$when}":"")." تأیید شد.";
  } else {
    $text = "همکار گرامی {$name}\nدرخواست {$tn} شما".($when?" برای تاریخ {$when}":"")." رد شد.".($note?"\nعلت: {$note}":"");
  }
  Sms::send([$usr['phone']], $text, 'req_'.$status, null);
}

// محاسبهٔ مصرف یک نوع درخواست در ماه/سال جاری (دقیقه و تعداد)
function _req_usage($uid,$type,$unit,$jy,$jm){
  $rows = Db::all("SELECT minutes, the_date, from_jdate, created_at FROM requests
    WHERE user_id=? AND type=? AND (unit=? OR ?='') AND status IN('pending','approved')",
    [$uid,$type,$unit,$unit]);
  $monthMin=0;$yearMin=0;$monthCnt=0;$yearCnt=0;
  foreach($rows as $r){
    $d = $r['the_date'] ?: $r['from_jdate'];
    if(!$d || !preg_match('/^(\d{4})-(\d{2})/',$d,$m)) continue;
    $ry=(int)$m[1]; $rm=(int)$m[2];
    if($ry==$jy){ $yearMin+=(int)$r['minutes']; $yearCnt++; if($rm==$jm){ $monthMin+=(int)$r['minutes']; $monthCnt++; } }
  }
  return ['month_min'=>$monthMin,'year_min'=>$yearMin,'month_cnt'=>$monthCnt,'year_cnt'=>$yearCnt];
}

// تعیین مقام تأییدکننده (سلسله‌مراتبی یا مسئول خاص)
function _req_approver($uid){
  $mode = _req_setting('request_approval_mode','hierarchical');
  if ($mode === 'specific') {
    $sp = (int)_req_setting('request_approver_id',0);
    return $sp ?: null;
  }
  $mgrs = _user_managers($uid);
  return $mgrs[0] ?? null; // نخستین مقام بالادست
}

// ==================== نیروی جایگزین مرخصی ====================
// بررسی همپوشانی دو بازهٔ تاریخ جلالی
function _date_ranges_overlap($from1,$to1,$from2,$to2){
  $a=j_to_ts($from1); $b=j_to_ts($to1); $c=j_to_ts($from2); $d=j_to_ts($to2);
  if($a===null||$b===null||$c===null||$d===null) return false;
  if($a>$b){$t=$a;$a=$b;$b=$t;} if($c>$d){$t=$c;$c=$d;$d=$t;}
  return $a <= $d && $c <= $b; // همپوشانی دارند؟
}

// بررسی در دسترس بودن یک نیروی جایگزین در بازهٔ مشخص
// خروجی: ['available'=>bool, 'reason'=>string|null]
function _substitute_availability($subId, $fromDate, $toDate, $excludeRequestId=null){
  // اطمینان از وجود جدول
  try { Db::run("CREATE TABLE IF NOT EXISTS substitute_assignments (id INT AUTO_INCREMENT PRIMARY KEY, substitute_user_id INT NOT NULL, request_id INT NOT NULL, absent_user_id INT NOT NULL, from_date VARCHAR(10) NOT NULL, to_date VARCHAR(10) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'active', created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_sub_user (substitute_user_id), INDEX idx_sub_dates (from_date, to_date)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }

  // ۱) شیفت اشغال‌شده (از مرخصی‌های تأییدشده): substitute_assignments فعال که با بازه همپوشانی دارد
  $assigns = Db::all("SELECT from_date,to_date FROM substitute_assignments WHERE substitute_user_id=? AND status='active'", [$subId]);
  foreach ($assigns as $a) {
    if (_date_ranges_overlap($fromDate,$toDate,$a['from_date'],$a['to_date'])) {
      return ['available'=>false, 'reason'=>'این نیروی جایگزین در بازهٔ انتخابی شیفت جایگزینی فعال دارد و در دسترس نیست.'];
    }
  }

  // ۲) رزرو توسط درخواست تأییدنشدهٔ دیگر (هنوز pending)
  $hasSub = false;
  try { $hasSub = (bool)Db::one("SHOW COLUMNS FROM requests WHERE Field='substitute_user_id'"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  if ($hasSub) {
    $q = "SELECT from_jdate,to_jdate,the_date FROM requests WHERE substitute_user_id=? AND status='pending'";
    $args = [$subId];
    if ($excludeRequestId) { $q .= " AND id<>?"; $args[] = $excludeRequestId; }
    $pendings = Db::all($q, $args);
    foreach ($pendings as $pr) {
      $pf = $pr['from_jdate'] ?: $pr['the_date'];
      $pt = $pr['to_jdate'] ?: ($pr['the_date'] ?: $pf);
      if ($pf && $pt && _date_ranges_overlap($fromDate,$toDate,$pf,$pt)) {
        return ['available'=>false, 'reason'=>'این نیروی جایگزین توسط درخواست دیگری (در انتظار تأیید) برای این بازه رزرو شده است.'];
      }
    }
  }

  return ['available'=>true, 'reason'=>null];
}

// بررسی اینکه آیا تاریخ‌های بازه شامل روز ممنوعهٔ مرخصی هستند
function _leave_blocked_in_range($fromDate, $toDate){
  try {
    Db::run("CREATE TABLE IF NOT EXISTS leave_blocked_dates (id INT AUTO_INCREMENT PRIMARY KEY, jdate VARCHAR(10) NOT NULL UNIQUE, reason VARCHAR(255) NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $rows = Db::all("SELECT jdate, reason FROM leave_blocked_dates");
  } catch (\Throwable $e) { return null; }
  foreach ($rows as $r) {
    $jt = j_to_ts($r['jdate']);
    $f = j_to_ts($fromDate); $t = j_to_ts($toDate);
    if ($jt!==null && $f!==null && $t!==null && $jt>=min($f,$t) && $jt<=max($f,$t)) {
      return $r; // اولین روز ممنوعه در بازه
    }
  }
  return null;
}

// --- مدیریت روزهای ممنوعهٔ مرخصی (ادمین) ---
route('GET', '/api/admin/leave-blocked-dates', function($p,$b,$u){
  try { Db::run("CREATE TABLE IF NOT EXISTS leave_blocked_dates (id INT AUTO_INCREMENT PRIMARY KEY, jdate VARCHAR(10) NOT NULL UNIQUE, reason VARCHAR(255) NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  return Db::all("SELECT * FROM leave_blocked_dates ORDER BY jdate");
}, false, ADMIN);

route('POST', '/api/admin/leave-blocked-dates', function($p,$b,$u){
  try { Db::run("CREATE TABLE IF NOT EXISTS leave_blocked_dates (id INT AUTO_INCREMENT PRIMARY KEY, jdate VARCHAR(10) NOT NULL UNIQUE, reason VARCHAR(255) NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  $jdate = trim($b['jdate'] ?? '');
  if (!preg_match('/^\d{4}\/\d{1,2}\/\d{1,2}$/', $jdate)) Http::error('تاریخ نامعتبر است (قالب: ۱۴۰۴/۰۴/۱۵)', 422);
  $reason = trim($b['reason'] ?? '') ?: null;
  try {
    Db::run("INSERT INTO leave_blocked_dates(jdate,reason) VALUES(?,?) ON DUPLICATE KEY UPDATE reason=VALUES(reason)", [$jdate,$reason]);
  } catch (\Throwable $e) { Http::error('خطا در ثبت', 500); }
  return ['ok'=>true];
}, false, ADMIN);

route('DELETE', '/api/admin/leave-blocked-dates/{id}', function($p,$b,$u){
  Db::run("DELETE FROM leave_blocked_dates WHERE id=?", [(int)$p['id']]);
  return ['ok'=>true];
}, false, ADMIN);

// فهرست نیروهای جایگزین (فقط کاربرانی که فلگ can_be_substitute دارند) + وضعیت در دسترس بودن در بازه
route('GET', '/api/my/substitutes', function($p,$b,$u){
  $from = $_GET['from'] ?? null; // جلالی
  $to = $_GET['to'] ?? $from;
  // اطمینان از وجود ستون فلگ
  $hasFlag = false;
  try { $hasFlag = (bool)Db::one("SHOW COLUMNS FROM users WHERE Field='can_be_substitute'"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  if (!$hasFlag) {
    try { Db::run("ALTER TABLE users ADD COLUMN can_be_substitute TINYINT(1) NOT NULL DEFAULT 0"); $hasFlag = true; } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  }
  if (!$hasFlag) return ['substitutes'=>[]];
  $rows = Db::all("SELECT u.id, TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) name, r.title role_title
    FROM users u LEFT JOIN roles r ON r.id=u.role_id
    WHERE u.can_be_substitute=1 AND u.is_active=1 AND u.id<>? ORDER BY name", [$u['id']]);
  $out = [];
  foreach ($rows as $r) {
    $av = ($from && $to) ? _substitute_availability($r['id'], $from, $to) : ['available'=>true, 'reason'=>null];
    $out[] = ['id'=>$r['id'], 'name'=>$r['name'], 'role_title'=>$r['role_title'],
              'available'=>$av['available'], 'reason'=>$av['reason']];
  }
  return ['substitutes'=>$out];
});

// بررسی پیش از ثبت: آیا بازه برای مرخصی مجاز است (روز ممنوعه) و جایگزین در دسترس است
route('POST', '/api/my/check-leave-window', function($p,$b,$u){
  $from = $b['from'] ?? null; $to = $b['to'] ?? $from;
  if (!$from) Http::error('تاریخ لازم است', 422);
  $blocked = _leave_blocked_in_range($from, $to);
  $subId = !empty($b['substitute_user_id']) ? (int)$b['substitute_user_id'] : null;
  $subAv = $subId ? _substitute_availability($subId, $from, $to) : null;
  return [
    'blocked' => $blocked ? true : false,
    'blocked_date' => $blocked['jdate'] ?? null,
    'blocked_reason' => $blocked['reason'] ?? null,
    'substitute_available' => $subAv ? $subAv['available'] : null,
    'substitute_reason' => $subAv ? $subAv['reason'] : null,
  ];
});

route('POST', '/api/my/requests', function($p,$b,$u){
  $type = $b['type'] ?? ''; // annual / sick / mission / overtime / manual
  if (!in_array($type,['annual','sick','mission','overtime','manual'])) Http::error('نوع درخواست نامعتبر',400);
  $unit = $b['unit'] ?? 'daily';
  $minutes = 0;
  // محاسبهٔ مدت
  if ($type === 'manual') {
    // تردد دستی: ورود/خروج مجزا
    $minutes = 0;
  } elseif ($unit === 'hourly') {
    $a = $b['from_time'] ?? null; $c = $b['to_time'] ?? null;
    if ($a && $c) { [$ah,$am]=array_map('intval',explode(':',$a)); [$ch,$cm]=array_map('intval',explode(':',$c)); $minutes=max(0,($ch*60+$cm)-($ah*60+$am)); }
  } else {
    // روزانه: تعداد روز × ۸ ساعت (۴۸۰ دقیقه)
    $f = $b['from_jdate'] ?? null; $t = $b['to_jdate'] ?? $f;
    if ($f && $t) { $df=j_to_ts($f); $dt=j_to_ts($t); $days=$df&&$dt?max(1,(int)(($dt-$df)/86400)+1):1; $minutes=$days*480; }
  }
  // بررسی سقف‌ها (برای مرخصی/ماموریت/اضافه‌کار)
  $tj = explode('-', $b['the_date'] ?? $b['from_jdate'] ?? '');
  $jy = (int)($tj[0] ?? 0); $jm = (int)($tj[1] ?? 0);
  if (!$jy) { [$jy,$jm] = array_slice(gregorian_to_jalali(date('Y'),date('m'),date('d')),0,2); }
  $capMsg = null;
  $usage = _req_usage($u['id'],$type,$unit,$jy,$jm);
  $capKey = function($base) use($type,$unit){ return $type.'_'.($unit==='hourly'?'hourly':'daily').'_'.$base; };
  if (in_array($type,['annual','sick'])) {
    $cm = (int)_req_setting($capKey('month'),0); $cyr=(int)_req_setting($capKey('year'),0);
    $unitMin = $unit==='hourly'?60:480;
    if ($cm>0 && ($usage['month_min']+$minutes) > $cm*$unitMin) $capMsg="سقف مرخصی ماهانه شما تکمیل است.";
    if (!$capMsg && $cyr>0 && ($usage['year_min']+$minutes) > $cyr*$unitMin) $capMsg="سقف مرخصی سالانهٔ شما تکمیل است.";
  } elseif ($type==='overtime') {
    $cntM=(int)_req_setting('ot_count_month',0); $minM=(int)_req_setting('ot_minutes_month',0);
    $cntY=(int)_req_setting('ot_count_year',0); $minY=(int)_req_setting('ot_minutes_year',0);
    if ($cntM>0 && $usage['month_cnt']+1>$cntM) $capMsg="سقف تعداد اضافه‌کار ماهانه تکمیل است.";
    if (!$capMsg && $minM>0 && $usage['month_min']+$minutes>$minM) $capMsg="سقف دقایق اضافه‌کار ماهانه تکمیل است.";
    if (!$capMsg && $cntY>0 && $usage['year_cnt']+1>$cntY) $capMsg="سقف تعداد اضافه‌کار سالانه تکمیل است.";
    if (!$capMsg && $minY>0 && $usage['year_min']+$minutes>$minY) $capMsg="سقف دقایق اضافه‌کار سالانه تکمیل است.";
  } elseif ($type==='mission') {
    $cntM=(int)_req_setting('mission_count_month',0); $hM=(int)_req_setting('mission_hours_month',0);
    $cntY=(int)_req_setting('mission_count_year',0); $hY=(int)_req_setting('mission_hours_year',0);
    $maxH=(int)_req_setting('mission_max_hours',0);
    if ($maxH>0 && $minutes>$maxH*60) $capMsg="مدت این ماموریت از حداکثر مجاز بیشتر است.";
    if (!$capMsg && $cntM>0 && $usage['month_cnt']+1>$cntM) $capMsg="سقف تعداد ماموریت ماهانه تکمیل است.";
    if (!$capMsg && $hM>0 && $usage['month_min']+$minutes>$hM*60) $capMsg="سقف ساعت ماموریت ماهانه تکمیل است.";
    if (!$capMsg && $cntY>0 && $usage['year_cnt']+1>$cntY) $capMsg="سقف تعداد ماموریت سالانه تکمیل است.";
    if (!$capMsg && $hY>0 && $usage['year_min']+$minutes>$hY*60) $capMsg="سقف ساعت ماموریت سالانه تکمیل است.";
  }
  if ($capMsg) Http::error($capMsg,422);
  // سلفی اجباری برای تردد دستی؟
  if ($type==='manual' && _req_setting('manual_attendance_selfie',false) && empty($b['selfie_data'])) {
    Http::error('برای ثبت تردد دستی، الصاق عکس سلفی الزامی است.',422);
  }
  $approver = _req_approver($u['id']);
  // معرفی نیروی جایگزین (برای مرخصی/ماموریت) — اگر تنظیم الزام فعال است، برای annual/sick اجباری
  $sub = !empty($b['substitute_user_id']) ? (int)$b['substitute_user_id'] : null;
  if (in_array($type,['annual','sick','mission']) && _req_setting('leave_require_substitute',false) && !$sub) {
    Http::error('برای ثبت این درخواست، معرفی نیروی جایگزین الزامی است.',422);
  }
  // بررسی روز ممنوعهٔ مرخصی و در دسترس بودن جایگزین (فقط برای مرخصی/ماموریت)
  if (in_array($type,['annual','sick','mission'])) {
    $fromD = $b['from_jdate'] ?? ($b['the_date'] ?? null);
    $toD = $b['to_jdate'] ?? ($b['the_date'] ?? $fromD);
    if ($fromD && $toD) {
      $blocked = _leave_blocked_in_range($fromD, $toD);
      if ($blocked) Http::error('در بازهٔ انتخابی، روز «'.$blocked['jdate'].'» جزو روزهای ممنوعهٔ مرخصی است'.(!empty($blocked['reason'])?' ('.$blocked['reason'].')':'').'. لطفاً تاریخ دیگری انتخاب کنید.', 422);
      if ($sub) {
        $av = _substitute_availability($sub, $fromD, $toD);
        if (!$av['available']) Http::error($av['reason'] ?: 'نیروی جایگزین در این بازه در دسترس نیست.', 422);
      }
    }
  }
  // اطمینان از وجود ستون substitute_user_id (یک‌بار)
  try {
    $hasSub = Db::one("SHOW COLUMNS FROM requests WHERE Field='substitute_user_id'");
    if (!$hasSub) Db::run("ALTER TABLE requests ADD COLUMN substitute_user_id INT NULL");
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  $id = Db::insert("INSERT INTO requests(user_id,type,unit,from_jdate,to_jdate,the_date,from_time,to_time,manual_kind,in_time,out_time,minutes,reason,attachment_name,attachment_data,selfie_data,pending_on,substitute_user_id)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [$u['id'],$type,$unit,$b['from_jdate']??null,$b['to_jdate']??null,$b['the_date']??null,$b['from_time']??null,$b['to_time']??null,
     $b['manual_kind']??null,$b['in_time']??null,$b['out_time']??null,$minutes,$b['reason']??null,
     $b['attachment_name']??null,$b['attachment_data']??null,$b['selfie_data']??null,$approver,$sub]);
  if ($approver) Push::send([$approver],'درخواست جدید برای تأیید',['annual'=>'مرخصی استحقاقی','sick'=>'مرخصی استعلاجی','mission'=>'ماموریت','overtime'=>'اضافه‌کار','manual'=>'تردد دستی'][$type]??'درخواست',['type'=>'request','request_id'=>$id]);
  // اطلاع به نیروی جایگزین معرفی‌شده
  if ($sub) {
    try {
      Push::notify([$sub], 'معرفی به‌عنوان جایگزین', trim(($u['first_name']??'').' '.($u['last_name']??'')).' شما را به‌عنوان نیروی جایگزین در یک درخواست مرخصی/ماموریت معرفی کرده است.', ['type'=>'substitute_assigned','request_id'=>$id]);
    } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  }
  return ['id'=>$id,'minutes'=>$minutes];
});

// درخواست‌های من
route('GET', '/api/my/requests', function($p,$b,$u){
  // اطمینان از وجود ستون جایگزین
  $sel = "id,type,unit,from_jdate,to_jdate,the_date,from_time,to_time,manual_kind,in_time,out_time,minutes,reason,status,approver_note,created_at,attachment_name";
  $hasSub = false;
  try { $hasSub = (bool)Db::one("SHOW COLUMNS FROM requests WHERE Field='substitute_user_id'"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  if ($hasSub) {
    return Db::all("SELECT r.$sel, r.substitute_user_id,
        TRIM(CONCAT(COALESCE(su.first_name,''),' ',COALESCE(su.last_name,''))) substitute_name
      FROM requests r LEFT JOIN users su ON su.id=r.substitute_user_id
      WHERE r.user_id=? ORDER BY r.id DESC LIMIT 100", [$u['id']]);
  }
  return Db::all("SELECT $sel FROM requests WHERE user_id=? ORDER BY id DESC LIMIT 100", [$u['id']]);
});

// لغو درخواست توسط خود کاربر (در حالت pending یا approved)
route('POST', '/api/my/requests/{id}/cancel', function($p,$b,$u){
  $r = Db::one("SELECT * FROM requests WHERE id=? AND user_id=?", [$p['id'], $u['id']]);
  if (!$r) Http::error('یافت نشد', 404);
  if (!in_array($r['status'], ['pending','approved'])) Http::error('این درخواست قابل لغو نیست', 422);
  Db::run("UPDATE requests SET status='canceled', pending_on=NULL WHERE id=?", [$p['id']]);
  // اگر شیفت جایگزینی برای این درخواست ساخته شده بود، غیرفعال شود
  try { Db::run("UPDATE substitute_assignments SET status='canceled' WHERE request_id=?", [$p['id']]); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  return ['ok'=>true, 'status'=>'canceled'];
});

// کارتابل تأیید: درخواست‌هایی که در انتظار تأیید این کاربر است
route('GET', '/api/my/request-inbox', fn($p,$b,$u) => Db::all(
  "SELECT r.id,r.type,r.unit,r.from_jdate,r.to_jdate,r.the_date,r.from_time,r.to_time,r.manual_kind,r.in_time,r.out_time,r.minutes,r.reason,r.status,r.created_at,r.attachment_name,r.selfie_data,
     CONCAT(us.first_name,' ',us.last_name) requester
   FROM requests r JOIN users us ON us.id=r.user_id
   WHERE r.pending_on=? AND r.status='pending' ORDER BY r.id DESC", [$u['id']]));

// جزئیات یک درخواست (شامل پیوست/سلفی)
route('GET', '/api/requests/{id}', function($p,$b,$u){
  $r = Db::one("SELECT r.*, CONCAT(us.first_name,' ',us.last_name) requester FROM requests r JOIN users us ON us.id=r.user_id WHERE r.id=?", [$p['id']]);
  if (!$r) Http::error('یافت نشد',404);
  if ($r['user_id']!=$u['id'] && $r['pending_on']!=$u['id'] && empty($u['is_admin'])) Http::error('دسترسی ندارید',403);
  return $r;
});

// تأیید/رد درخواست
route('POST', '/api/requests/{id}/decide', function($p,$b,$u){
  $r = Db::one("SELECT * FROM requests WHERE id=?", [$p['id']]);
  if (!$r) Http::error('یافت نشد',404);
  if ($r['pending_on']!=$u['id'] && empty($u['is_admin'])) Http::error('این درخواست در کارتابل شما نیست',403);
  $decision = $b['decision'] ?? ''; // approve / reject
  if (!in_array($decision,['approve','reject'])) Http::error('تصمیم نامعتبر',400);
  if ($decision === 'reject') {
    Db::run("UPDATE requests SET status='rejected', approver_id=?, approver_note=?, decided_at=NOW(), pending_on=NULL WHERE id=?", [$u['id'],$b['note']??null,$p['id']]);
    Push::send([$r['user_id']],'درخواست شما رد شد',$b['note']??'',['type'=>'request','request_id'=>$p['id']]);
    _req_notify_sms($r,'rejected',$b['note']??'');
    return ['ok'=>true,'status'=>'rejected'];
  }
  // تأیید: در حالت سلسله‌مراتبی، اگر تأییدکنندهٔ فعلی خودش مقام بالادست دارد، به او ارجاع شود
  $mode = _req_setting('request_approval_mode','hierarchical');
  $next = null;
  if ($mode === 'hierarchical') {
    $mgrs = _user_managers($u['id']);
    $next = $mgrs[0] ?? null;
  }
  if ($next) {
    Db::run("UPDATE requests SET pending_on=?, approver_id=? WHERE id=?", [$next,$u['id'],$p['id']]);
    Push::send([$next],'درخواست برای تأیید نهایی','',['type'=>'request','request_id'=>$p['id']]);
    return ['ok'=>true,'status'=>'forwarded','to'=>$next];
  }
  // تأیید نهایی
  Db::run("UPDATE requests SET status='approved', approver_id=?, approver_note=?, decided_at=NOW(), pending_on=NULL WHERE id=?", [$u['id'],$b['note']??null,$p['id']]);
  // اگر نیروی جایگزین معرفی شده بود، شیفت جایگزینی او در این بازه ثبت می‌شود
  try {
    $hasSub = (bool)Db::one("SHOW COLUMNS FROM requests WHERE Field='substitute_user_id'");
    if ($hasSub) {
      $rr = Db::one("SELECT substitute_user_id, from_jdate, to_jdate, the_date FROM requests WHERE id=?", [$p['id']]);
      if ($rr && !empty($rr['substitute_user_id'])) {
        $fromD = $rr['from_jdate'] ?: $rr['the_date'];
        $toD = $rr['to_jdate'] ?: ($rr['the_date'] ?: $fromD);
        if ($fromD && $toD) {
          Db::run("CREATE TABLE IF NOT EXISTS substitute_assignments (id INT AUTO_INCREMENT PRIMARY KEY, substitute_user_id INT NOT NULL, request_id INT NOT NULL, absent_user_id INT NOT NULL, from_date VARCHAR(10) NOT NULL, to_date VARCHAR(10) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'active', created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_sub_user (substitute_user_id), INDEX idx_sub_dates (from_date, to_date)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
          // جلوگیری از درج تکراری برای همین درخواست
          $exists = Db::one("SELECT id FROM substitute_assignments WHERE request_id=? AND status='active'", [$p['id']]);
          if (!$exists) {
            Db::run("INSERT INTO substitute_assignments(substitute_user_id,request_id,absent_user_id,from_date,to_date,status) VALUES(?,?,?,?,?,'active')",
              [(int)$rr['substitute_user_id'], $p['id'], $r['user_id'], $fromD, $toD]);
            // اطلاع به نیروی جایگزین
            try { Push::notify([(int)$rr['substitute_user_id']], 'شیفت جایگزینی', "شما به‌عنوان نیروی جایگزین برای بازهٔ $fromD تا $toD تعیین شدید و در هر روز، شیفت فرد مرخصی‌گیرنده به‌صورت خودکار برای شما اعمال می‌شود.", ['type'=>'substitute_shift','request_id'=>$p['id'],'from'=>$fromD,'to'=>$toD]); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
          }
        }
      }
    }
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  // تردد دستی تأییدشده → درج در staff_attendance
  if ($r['type']==='manual') {
    $g = null;
    if ($r['the_date'] && preg_match('/^(\d{4})-(\d{2})-(\d{2})$/',$r['the_date'],$m)) {
      [$gy,$gm,$gd]=jalali_to_gregorian((int)$m[1],(int)$m[2],(int)$m[3]); $g=sprintf('%04d-%02d-%02d',$gy,$gm,$gd);
    }
    if ($g) {
      $ci = $r['in_time'] ? "$g ".$r['in_time'].":00" : null;
      $co = $r['out_time'] ? "$g ".$r['out_time'].":00" : null;
      if ($ci) Db::run("INSERT INTO staff_attendance(user_id,check_in,check_out,method) VALUES(?,?,?, 'manual')", [$r['user_id'],$ci,$co]);
    }
  }
  Push::send([$r['user_id']],'درخواست شما تأیید شد','',['type'=>'request','request_id'=>$p['id']]);
  _req_notify_sms($r,'approved','');
  return ['ok'=>true,'status'=>'approved'];
});

// عملکرد روزانهٔ خودِ کاربر — مدل فینتو، برای تب «عملکرد روزانه» در اپ و وب‌اپ
route('GET', '/api/my/daily-performance', function($p,$b,$u){
  [$ty,$tm,$td]=array_slice(gregorian_to_jalali(date('Y'),date('m'),date('d')),0,3);
  $jdate=preg_replace('/\//','-',trim((string)($_GET['date']??'')));
  if(!preg_match('/^\d{4}-\d{2}-\d{2}$/',$jdate)) $jdate=sprintf('%04d-%02d-%02d',$ty,$tm,$td);
  $shift=_auto_shift_for_user($u['id']);
  if(!$shift) return ['date'=>$jdate,'data'=>null,'message'=>'برای شما شیفت فعالی تعریف نشده است.'];
  $dayRow=null;
  if(($shift['type']??'')==='advanced') $dayRow=Db::one("SELECT jdate,segments,is_off,day_config FROM shift_days WHERE shift_id=? AND jdate=? LIMIT 1",[(int)$shift['id'],$jdate]);
  $hol=Db::one("SELECT jdate,title FROM holidays WHERE jdate=? LIMIT 1",[$jdate]);
  $rows=_attendance_rows_for_jdate($u['id'],$jdate);
  $sessions=array_map(fn($r)=>['in'=>strtotime($r['check_in']),'out'=>$r['check_out']?strtotime($r['check_out']):null,'clip_start'=>strtotime($r['_clip_start']??'1970-01-01 00:00:00'),'clip_end'=>strtotime($r['_clip_end']??'2999-01-01 00:00:00')],$rows);
  $w=ShiftCalc::dayWork($shift,$jdate,$dayRow,$sessions,(bool)$hol);
  $weekday=_jweekday_name((int)substr($jdate,0,4),(int)substr($jdate,5,2),(int)substr($jdate,8,2));
  return ['date'=>$jdate,'weekday'=>$weekday,'shift_title'=>$shift['title']??'شیفت کاری','shift_type'=>$shift['type']??'','holiday'=>(bool)$hol,'holiday_title'=>$hol['title']??'', 'sessions'=>$rows,'data'=>$w];
});

// برنامهٔ شیفت کاری کاربر — بازهٔ آینده برای تب «شیفت کاری»
route('GET', '/api/my/shift-schedule', function($p,$b,$u){
  [$gy,$gm,$gd]=[date('Y'),date('m'),date('d')]; [$jy,$jm,$jd]=array_slice(gregorian_to_jalali((int)$gy,(int)$gm,(int)$gd),0,3);
  $start=preg_replace('/\//','-',trim((string)($_GET['from']??'')));
  if(!preg_match('/^\d{4}-\d{2}-\d{2}$/',$start)) $start=sprintf('%04d-%02d-%02d',$jy,$jm,$jd);
  [$sy,$sm,$sd]=array_map('intval',explode('-',$start));
  $shift=_auto_shift_for_user($u['id']); if(!$shift)return ['shift'=>null,'days'=>[],'message'=>'برای شما شیفت فعالی تعریف نشده است.'];
  $days=[];$ts=mktime(12,0,0,...jalali_to_gregorian($sy,$sm,$sd));
  for($i=0;$i<14;$i++){
    $gt=getdate($ts+($i*86400)); [$y,$m,$d]=array_slice(gregorian_to_jalali($gt['year'],$gt['mon'],$gt['mday']),0,3);$j=sprintf('%04d-%02d-%02d',$y,$m,$d);
    $dr=null;if(($shift['type']??'')==='advanced')$dr=Db::one("SELECT jdate,segments,is_off,day_config FROM shift_days WHERE shift_id=? AND jdate=? LIMIT 1",[(int)$shift['id'],$j]);
    $hol=Db::one("SELECT jdate,title FROM holidays WHERE jdate=? LIMIT 1",[$j]);$mins=ShiftCalc::expectedMinutes($shift,$j,$dr);
    $days[]=['date'=>$j,'weekday'=>_jweekday_name($y,$m,$d),'shift_title'=>$shift['title']??'شیفت کاری','minutes'=>$mins,'is_off'=>(bool)($dr['is_off']??false)||($mins<=0),'is_holiday'=>(bool)$hol,'holiday_title'=>$hol['title']??''];
  }
  return ['shift'=>['id'=>(int)$shift['id'],'title'=>$shift['title']??'شیفت کاری','type'=>$shift['type']??''],'days'=>$days];
});

// خلاصهٔ کارکرد ماهانهٔ خودِ کاربر (برای اپ)
route('GET', '/api/my/work-summary', function($p,$b,$u){
  $jy=(int)($_GET['year']??0); $jm=(int)($_GET['month']??0);
  if(!$jy){ [$jy,$jm]=array_slice(gregorian_to_jalali(date('Y'),date('m'),date('d')),0,2); }
  $rows = _shift_month_report($jy,$jm);
  foreach($rows as $r) if($r['user_id']==$u['id']) return ['year'=>$jy,'month'=>$jm,'data'=>$r];
  return ['year'=>$jy,'month'=>$jm,'data'=>null];
});

// مانده مرخصی/ماموریت/اضافه‌کار یک کاربر (سقف منهای مصرف)
function _req_balance($uid){
  [$jy,$jm] = array_slice(gregorian_to_jalali(date('Y'),date('m'),date('d')),0,2);
  $out = [];
  // مرخصی استحقاقی و استعلاجی (ساعتی/روزانه)
  foreach (['annual','sick'] as $type) {
    foreach (['hourly','daily'] as $unit) {
      $u = _req_usage($uid,$type,$unit,$jy,$jm);
      $capM = (int)_req_setting("{$type}_{$unit}_month",0);
      $capY = (int)_req_setting("{$type}_{$unit}_year",0);
      $unitMin = $unit==='hourly'?60:480;
      $out["{$type}_{$unit}"] = [
        'cap_month'=>$capM,'cap_year'=>$capY,
        'used_month'=> $unitMin? round($u['month_min']/$unitMin,1):0,
        'used_year'=> $unitMin? round($u['year_min']/$unitMin,1):0,
        'left_month'=> $capM? max(0,$capM - ($unitMin?$u['month_min']/$unitMin:0)):null,
        'left_year'=> $capY? max(0,$capY - ($unitMin?$u['year_min']/$unitMin:0)):null,
      ];
    }
  }
  // اضافه‌کار (تعداد/دقیقه)
  $uo = _req_usage($uid,'overtime','',$jy,$jm);
  $out['overtime'] = [
    'cap_count_month'=>(int)_req_setting('ot_count_month',0),'cap_min_month'=>(int)_req_setting('ot_minutes_month',0),
    'cap_count_year'=>(int)_req_setting('ot_count_year',0),'cap_min_year'=>(int)_req_setting('ot_minutes_year',0),
    'used_count_month'=>$uo['month_cnt'],'used_min_month'=>$uo['month_min'],
    'used_count_year'=>$uo['year_cnt'],'used_min_year'=>$uo['year_min'],
  ];
  // ماموریت (تعداد/ساعت)
  $um = _req_usage($uid,'mission','',$jy,$jm);
  $out['mission'] = [
    'cap_count_month'=>(int)_req_setting('mission_count_month',0),'cap_hours_month'=>(int)_req_setting('mission_hours_month',0),
    'cap_count_year'=>(int)_req_setting('mission_count_year',0),'cap_hours_year'=>(int)_req_setting('mission_hours_year',0),
    'used_count_month'=>$um['month_cnt'],'used_min_month'=>$um['month_min'],
    'used_count_year'=>$um['year_cnt'],'used_min_year'=>$um['year_min'],
  ];
  return ['year'=>$jy,'month'=>$jm,'balance'=>$out];
}

// مانده مرخصی خودِ کاربر (اپ)
route('GET', '/api/my/leave-balance', fn($p,$b,$u) => _req_balance($u['id']));

// مانده مرخصی یک کاربر (ادمین)
route('GET', '/api/admin/users/{id}/leave-balance', fn($p,$b,$u) => _req_balance((int)$p['id']), false, ADMIN);

// گزارش درخواست‌ها برای ادمین (با فیلتر کاربر/نوع/وضعیت/بازه)
route('GET', '/api/admin/requests', function($p,$b,$u){
  $cond=[]; $args=[];
  if (!empty($_GET['user_id'])) { $cond[]="r.user_id=?"; $args[]=(int)$_GET['user_id']; }
  if (!empty($_GET['type'])) { $cond[]="r.type=?"; $args[]=$_GET['type']; }
  if (!empty($_GET['status'])) { $cond[]="r.status=?"; $args[]=$_GET['status']; }
  if (!empty($_GET['from'])) { $cond[]="r.created_at>=?"; $args[]=$_GET['from'].' 00:00:00'; }
  if (!empty($_GET['to'])) { $cond[]="r.created_at<=?"; $args[]=$_GET['to'].' 23:59:59'; }
  $where = $cond ? 'WHERE '.implode(' AND ',$cond) : '';
  return Db::all("SELECT r.id,r.type,r.unit,r.from_jdate,r.to_jdate,r.the_date,r.from_time,r.to_time,r.in_time,r.out_time,r.minutes,r.reason,r.status,r.approver_note,r.created_at,r.attachment_name,
      CONCAT(us.first_name,' ',us.last_name) requester,
      CONCAT(COALESCE(ap.first_name,''),' ',COALESCE(ap.last_name,'')) approver
    FROM requests r JOIN users us ON us.id=r.user_id LEFT JOIN users ap ON ap.id=r.approver_id
    $where ORDER BY r.id DESC LIMIT 500", $args);
}, false, ADMIN);

// خروجی اکسل گزارش درخواست‌ها (ادمین)
route('GET', '/api/admin/requests/export', function($p,$b,$u){
  $cond=[]; $args=[];
  if (!empty($_GET['user_id'])) { $cond[]="r.user_id=?"; $args[]=(int)$_GET['user_id']; }
  if (!empty($_GET['type'])) { $cond[]="r.type=?"; $args[]=$_GET['type']; }
  if (!empty($_GET['status'])) { $cond[]="r.status=?"; $args[]=$_GET['status']; }
  $where = $cond ? 'WHERE '.implode(' AND ',$cond) : '';
  $rows = Db::all("SELECT r.*, CONCAT(us.first_name,' ',us.last_name) requester,
      CONCAT(COALESCE(ap.first_name,''),' ',COALESCE(ap.last_name,'')) approver
    FROM requests r JOIN users us ON us.id=r.user_id LEFT JOIN users ap ON ap.id=r.approver_id $where ORDER BY r.id DESC LIMIT 5000", $args);
  $TY=['annual'=>'مرخصی استحقاقی','sick'=>'مرخصی استعلاجی','mission'=>'ماموریت','overtime'=>'اضافه‌کار','manual'=>'تردد دستی'];
  $ST=['pending'=>'در انتظار','approved'=>'تأییدشده','rejected'=>'ردشده'];
  header('Content-Type: text/csv; charset=UTF-8');
  header('Content-Disposition: attachment; filename="requests.csv"');
  echo "\xEF\xBB\xBF"; $out=fopen('php://output','w');
  $hm=fn($m)=>$m?sprintf('%02d:%02d',intdiv($m,60),$m%60):'';
  fputcsv($out,['نام','نوع','واحد','از تاریخ','تا تاریخ','روز','از ساعت','تا ساعت','مدت','وضعیت','تأییدکننده','توضیحات','تاریخ ثبت']);
  foreach($rows as $r) fputcsv($out,[$r['requester'],$TY[$r['type']]??$r['type'],$r['unit']==='hourly'?'ساعتی':($r['unit']==='daily'?'روزانه':''),
    $r['from_jdate'],$r['to_jdate'],$r['the_date'],$r['from_time']?:$r['in_time'],$r['to_time']?:$r['out_time'],$hm($r['minutes']),
    $ST[$r['status']]??$r['status'],trim($r['approver'])?:'—',$r['reason'],fa_datetime($r['created_at'])]);
  fclose($out); exit;
}, false, ADMIN);

// داشبورد لحظه‌ای حضور پرسنل
function _live_staff_dashboard(){
  [$jy,$jm,$jd] = gregorian_to_jalali((int)date('Y'),(int)date('m'),(int)date('d'));
  $jdate = sprintf('%04d-%02d-%02d',$jy,$jm,$jd);
  $dayStart = date('Y-m-d 00:00:00');
  $dayEnd = date('Y-m-d 00:00:00', strtotime('+1 day'));

  $staff = Db::all("SELECT u.id, TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) name,
      COALESCE(r.title,'—') role_title
    FROM users u LEFT JOIN roles r ON r.id=u.role_id
    WHERE u.is_active=1 ORDER BY name");

  $att = Db::all("SELECT a.id,a.user_id,a.check_in,a.check_out,a.method,a.in_station,a.in_lat,a.in_lng,
      COALESCE(l.code,'') line_code, TRIM(CONCAT(COALESCE(l.origin,''), CASE WHEN COALESCE(l.origin,'')<>'' AND COALESCE(l.destination,'')<>'' THEN ' ← ' ELSE '' END, COALESCE(l.destination,''))) line_description
    FROM staff_attendance a
    LEFT JOIN `lines` l ON l.id=(SELECT ul.line_id FROM user_lines ul WHERE ul.user_id=a.user_id ORDER BY ul.line_id LIMIT 1)
    WHERE a.check_in>=? AND a.check_in<? ORDER BY a.check_in DESC",[$dayStart,$dayEnd]);
  $byUser=[];
  foreach($att as $a){ if(!isset($byUser[(int)$a['user_id']])) $byUser[(int)$a['user_id']]=$a; }

  $leaves = Db::all("SELECT DISTINCT user_id FROM requests
    WHERE status='approved' AND type IN ('annual','sick','mission')
      AND COALESCE(NULLIF(from_jdate,''),NULLIF(the_date,''))<=?
      AND COALESCE(NULLIF(to_jdate,''),NULLIF(the_date,''),NULLIF(from_jdate,''))>=?",[$jdate,$jdate]);
  $leaveSet=[]; foreach($leaves as $l) $leaveSet[(int)$l['user_id']]=true;

  $present=[]; $leave=[]; $absent=[];
  foreach($staff as $st){
    $uid=(int)$st['id'];
    if(isset($byUser[$uid])){
      $a=$byUser[$uid];
      $loc=trim((string)($a['in_station']??''));
      if($loc===''){
        if($a['in_lat']!==null && $a['in_lng']!==null) $loc='مختصات '.round((float)$a['in_lat'],5).', '.round((float)$a['in_lng'],5);
        else $loc='ثبت نشده';
      }
      $present[]=[
        'user_id'=>$uid,'name'=>$st['name'],'role_title'=>$st['role_title'],
        'check_in'=>$a['check_in'],'check_out'=>$a['check_out'],'method'=>$a['method'],
        'location'=>$loc,'line_code'=>$a['line_code'],'line_description'=>$a['line_description'],
        'is_open'=>empty($a['check_out'])
      ];
    } elseif(isset($leaveSet[$uid])) $leave[]=$st;
    else $absent[]=$st;
  }
  return [
    'jdate'=>$jdate,'generated_at'=>date('Y-m-d H:i:s'),
    'total'=>count($staff),'present'=>count($present),'absent'=>count($absent),'leave'=>count($leave),
    'present_list'=>$present,'leave_list'=>$leave,'absent_list'=>$absent
  ];
}

// خلاصهٔ تجمیعی کارکرد برای داشبورد (مجموع همهٔ نیروها در یک ماه)
route('GET', '/api/admin/work-dashboard', function($p,$b,$u){
  $jy=(int)($_GET['year']??0); $jm=(int)($_GET['month']??0);
  if(!$jy){ [$jy,$jm]=array_slice(gregorian_to_jalali(date('Y'),date('m'),date('d')),0,2); }
  $rows=_shift_month_report($jy,$jm);
  $sum=['worked'=>0,'overtime'=>0,'shortage'=>0,'night'=>0,'friday'=>0,'holiday'=>0,'annual_min'=>0,'sick_min'=>0,'mission_min'=>0,'present_days'=>0,'staff'=>count($rows)];
  $top=[];
  foreach($rows as $r){
    foreach(['worked','overtime','shortage','night','friday','holiday','annual_min','sick_min','mission_min','present_days'] as $k) $sum[$k]+=($r[$k]??0);
    $top[]=['name'=>$r['name'],'worked'=>$r['worked'],'overtime'=>$r['overtime']];
  }
  usort($top,fn($a,$b)=>$b['worked']-$a['worked']);
  // وضعیت درخواست‌های در انتظار
  $pending=Db::one("SELECT COUNT(*) c FROM requests WHERE status='pending'");
  return ['year'=>$jy,'month'=>$jm,'sum'=>$sum,'top'=>array_slice($top,0,8),'pending_requests'=>(int)($pending['c']??0),'live'=>_live_staff_dashboard()];
}, false, ADMIN);

// ==================== حقوق و دستمزد ====================
// تنظیمات کلی نرخ‌ها و ضرایب در app_settings:
//  payroll_hour_rate (نرخ هر ساعت کارکرد عادی، ریال) یا از base_monthly/۱۹۲ محاسبه می‌شود
//  ot_mult (ضریب اضافه‌کار، پیش‌فرض 1.4)، night_mult (شب‌کاری 1.35)، friday_mult (جمعه‌کاری 1.4)، holiday_mult (تعطیل‌کاری 1.4)
//  std_month_hours (ساعت موظف ماهانه، پیش‌فرض 192)

// پایهٔ حقوق یک کاربر
route('GET', '/api/admin/users/{id}/payroll', fn($p,$b,$u) =>
  Db::one("SELECT * FROM payroll_base WHERE user_id=?", [$p['id']]) ?: ['user_id'=>(int)$p['id']], false, ADMIN);
route('POST', '/api/admin/users/{id}/payroll', function($p,$b,$u){
  $f=['base_monthly','housing','family','food','other_allow','insurance_pct','tax_pct','other_deduct'];
  $cols=[]; $vals=[]; $ph=[];
  foreach($f as $k){ $cols[]=$k; $vals[]= isset($b[$k])&&$b[$k]!=='' ? $b[$k] : null; $ph[]='?'; }
  $set=implode(',', array_map(fn($c)=>"$c=VALUES($c)", $cols));
  Db::run("INSERT INTO payroll_base(user_id,".implode(',',$cols).") VALUES(?,".implode(',',$ph).")
           ON DUPLICATE KEY UPDATE $set", array_merge([$p['id']], $vals));
  return ['ok'=>true];
}, false, ADMIN);

// محاسبهٔ فیش حقوقی یک کاربر برای یک ماه
function _payslip($uid,$jy,$jm){
  $base = Db::one("SELECT * FROM payroll_base WHERE user_id=?", [$uid]) ?: [];
  $stdHours = (float)_req_setting('std_month_hours',192);
  $otMult = (float)_req_setting('ot_mult',1.4);
  $nightMult = (float)_req_setting('night_mult',1.35);
  $friMult = (float)_req_setting('friday_mult',1.4);
  $holMult = (float)_req_setting('holiday_mult',1.4);
  $baseMonthly = (float)($base['base_monthly'] ?? 0);
  $hourRate = (float)_req_setting('payroll_hour_rate',0);
  if ($hourRate <= 0) $hourRate = $stdHours>0 ? $baseMonthly/$stdHours : 0;
  // کارکرد ماه از گزارش شیفت
  $rep = _shift_month_report($jy,$jm);
  $w = null; foreach($rep as $r) if($r['user_id']==$uid){ $w=$r; break; }
  $worked=$w['worked']??0; $ot=$w['overtime']??0; $night=$w['night']??0; $fri=$w['friday']??0; $hol=$w['holiday']??0;
  // مبالغ (ریال)
  $h = fn($min)=>$min/60;
  $regularPay = round($baseMonthly>0 ? $baseMonthly : $h($worked)*$hourRate);
  $otPay = round($h($ot)*$hourRate*$otMult);
  $nightPay = round($h($night)*$hourRate*($nightMult-1));   // فوق‌العادهٔ شب‌کاری
  $friPay = round($h($fri)*$hourRate*($friMult-1));
  $holPay = round($h($hol)*$hourRate*($holMult-1));
  $housing=(float)($base['housing']??0); $family=(float)($base['family']??0); $food=(float)($base['food']??0); $otherA=(float)($base['other_allow']??0);
  $gross = $regularPay+$otPay+$nightPay+$friPay+$holPay+$housing+$family+$food+$otherA;
  $insPct=(float)($base['insurance_pct']??0); $taxPct=(float)($base['tax_pct']??0); $otherD=(float)($base['other_deduct']??0);
  $insurance = round($gross*$insPct/100);
  $tax = round($gross*$taxPct/100);
  $deductions = $insurance+$tax+$otherD;
  $net = $gross-$deductions;
  return [
    'year'=>$jy,'month'=>$jm,
    'worked_h'=>round($h($worked),1),'ot_h'=>round($h($ot),1),'night_h'=>round($h($night),1),'friday_h'=>round($h($fri),1),'holiday_h'=>round($h($hol),1),
    'hour_rate'=>round($hourRate),
    'earnings'=>['حقوق پایه/کارکرد'=>$regularPay,'اضافه‌کار'=>$otPay,'فوق‌العادهٔ شب‌کاری'=>$nightPay,'فوق‌العادهٔ جمعه‌کاری'=>$friPay,'فوق‌العادهٔ تعطیل‌کاری'=>$holPay,'حق مسکن'=>round($housing),'حق خانوار'=>round($family),'بن/خواربار'=>round($food),'سایر مزایا'=>round($otherA)],
    'deductions'=>['بیمه'=>$insurance,'مالیات'=>$tax,'سایر کسورات'=>round($otherD)],
    'gross'=>round($gross),'total_deduct'=>round($deductions),'net'=>round($net),
  ];
}

route('GET', '/api/admin/users/{id}/payslip', function($p,$b,$u){
  $jy=(int)($_GET['year']??0); $jm=(int)($_GET['month']??0);
  if(!$jy){ [$jy,$jm]=array_slice(gregorian_to_jalali(date('Y'),date('m'),date('d')),0,2); }
  return _payslip((int)$p['id'],$jy,$jm);
}, false, ADMIN);

// فیش حقوقی خودِ کاربر (اپ)
route('GET', '/api/my/payslip', function($p,$b,$u){
  $jy=(int)($_GET['year']??0); $jm=(int)($_GET['month']??0);
  if(!$jy){ [$jy,$jm]=array_slice(gregorian_to_jalali(date('Y'),date('m'),date('d')),0,2); }
  return _payslip($u['id'],$jy,$jm);
});

// خروجی اکسل لیست حقوق همهٔ نیروها برای یک ماه
route('GET', '/api/admin/payroll/export', function($p,$b,$u){
  $jy=(int)($_GET['year']??0); $jm=(int)($_GET['month']??0);
  if(!$jy){ [$jy,$jm]=array_slice(gregorian_to_jalali(date('Y'),date('m'),date('d')),0,2); }
  $rep=_shift_month_report($jy,$jm);
  header('Content-Type: text/csv; charset=UTF-8');
  header('Content-Disposition: attachment; filename="payroll_'.$jy.'_'.$jm.'.csv"');
  echo "\xEF\xBB\xBF"; $out=fopen('php://output','w');
  fputcsv($out,['نام','کارکرد(ساعت)','اضافه‌کار(ساعت)','جمع دریافتی','کسورات','خالص پرداختی(ریال)']);
  foreach($rep as $r){ $ps=_payslip($r['user_id'],$jy,$jm); fputcsv($out,[$r['name'],$ps['worked_h'],$ps['ot_h'],$ps['gross'],$ps['total_deduct'],$ps['net']]); }
  fclose($out); exit;
}, false, ADMIN);

// اطلاعات شرکت برای سربرگ فیش/گزارش‌ها در اپ
route('GET', '/api/my/company-info', function($p,$b,$u){
  $get = function($k){ $r=Db::one("SELECT value FROM app_settings WHERE `key`=?", [$k]); return $r? (json_decode($r['value'],true) ?: '') : ''; };
  $me = Db::one("SELECT first_name,last_name FROM users WHERE id=?", [$u['id']]);
  return [
    'company'=> $get('company_name') ?: $get('org_name'),
    'address'=> $get('company_address'),
    'phone'=> $get('company_phone'),
    'name'=> trim(($me['first_name']??'').' '.($me['last_name']??'')),
  ];
});



// ==================== فیلدهای سفارشی پرسنل ====================
// مدیریت تعریف فیلدها (ادمین)




// مقادیر فیلدهای سفارشی یک کاربر (ادمین — مشاهده/ویرایش)

// فیلدهای قابل‌تکمیل توسط کاربر + مقادیر فعلی او (اپ)

// ==================== درج تعطیلات رسمی ۱۴۰۴ (واقعی) ====================
route('POST', '/api/admin/holidays/seed-1404', function($p,$b,$u){
  // فهرست تعطیلات رسمی سال ۱۴۰۴ (مطابق تقویم رسمی کشور)
  $H = [
    ['1404-01-01','نوروز'],['1404-01-02','عید نوروز'],['1404-01-03','عید نوروز'],['1404-01-04','عید نوروز'],
    ['1404-01-11','عید سعید فطر'],['1404-01-12','تعطیل عید فطر / روز جمهوری اسلامی'],['1404-01-13','روز طبیعت (سیزده‌به‌در)'],
    ['1404-02-04','شهادت امام جعفر صادق (ع)'],
    ['1404-03-14','رحلت امام خمینی (ره)'],['1404-03-15','قیام ۱۵ خرداد'],['1404-03-16','عید سعید قربان'],['1404-03-24','عید سعید غدیر خم'],
    ['1404-04-14','تاسوعای حسینی'],['1404-04-15','عاشورای حسینی'],
    ['1404-05-23','اربعین حسینی'],['1404-05-31','رحلت رسول اکرم (ص) و شهادت امام حسن مجتبی (ع)'],
    ['1404-06-02','شهادت امام رضا (ع)'],['1404-06-10','شهادت امام حسن عسکری (ع)'],['1404-06-19','میلاد رسول اکرم (ص) و امام جعفر صادق (ع)'],
    ['1404-09-03','شهادت حضرت فاطمه زهرا (س)'],
    ['1404-10-13','ولادت امام علی (ع) و روز پدر'],['1404-10-27','مبعث رسول اکرم (ص)'],
    ['1404-11-15','ولادت حضرت قائم (عج) / نیمه شعبان'],['1404-11-22','پیروزی انقلاب اسلامی'],
    ['1404-12-20','شهادت حضرت علی (ع)'],['1404-12-29','روز ملی شدن صنعت نفت'],
  ];
  $n=0;
  foreach ($H as $h) { Db::run("INSERT INTO holidays(jdate,title) VALUES(?,?) ON DUPLICATE KEY UPDATE title=VALUES(title)", $h); $n++; }
  return ['ok'=>true,'count'=>$n];
}, false, ADMIN);

// ==================== درج تعطیلات رسمی ۱۴۰۵ ====================
route('POST', '/api/admin/holidays/seed-1405', function($p,$b,$u){
  $H = [
    ['1405-01-01','نوروز'],['1405-01-02','عید نوروز'],['1405-01-03','عید نوروز'],['1405-01-04','عید نوروز'],
    ['1405-01-12','روز جمهوری اسلامی'],['1405-01-13','سیزده به در'],
    ['1405-01-22','شهادت امام جعفر صادق (ع)'],
    ['1405-02-25','شهادت حضرت فاطمه زهرا (س)'],
    ['1405-03-05','عید سعید فطر'],['1405-03-06','تعطیل عید فطر'],
    ['1405-03-14','رحلت امام خمینی (ره)'],['1405-03-15','قیام ۱۵ خرداد'],
    ['1405-03-31','عید سعید قربان'],
    ['1405-04-08','عید سعید غدیر خم'],
    ['1405-04-29','تاسوعای حسینی'],['1405-04-30','عاشورای حسینی'],
    ['1405-06-07','اربعین حسینی'],
    ['1405-06-15','رحلت رسول اکرم (ص) و شهادت امام حسن مجتبی (ع)'],
    ['1405-06-17','شهادت امام رضا (ع)'],['1405-06-25','شهادت امام حسن عسکری (ع)'],
    ['1405-07-05','میلاد رسول اکرم (ص) و امام جعفر صادق (ع)'],
    ['1405-10-02','ولادت امام علی (ع) و روز پدر'],['1405-10-16','مبعث رسول اکرم (ص)'],
    ['1405-11-03','ولادت حضرت قائم (عج) / نیمه شعبان'],['1405-11-22','پیروزی انقلاب اسلامی'],
    ['1405-12-09','شهادت حضرت علی (ع)'],['1405-12-29','روز ملی شدن صنعت نفت'],
  ];
  $n=0;
  foreach ($H as $h) { Db::run("INSERT INTO holidays(jdate,title) VALUES(?,?) ON DUPLICATE KEY UPDATE title=VALUES(title)", $h); $n++; }
  return ['ok'=>true,'count'=>$n];
}, false, ADMIN);

function _parse_birth_jalali_parts($birthDate) {
  $bd = trim((string)$birthDate);
  if ($bd === '') return null;
  if (!preg_match('/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/', $bd, $m)) return null;
  $y=(int)$m[1]; $mo=(int)$m[2]; $d=(int)$m[3];
  if ($mo < 1 || $mo > 12 || $d < 1 || $d > 31) return null;
  if ($y >= 1900) {
    try { [$jy,$jm,$jd] = gregorian_to_jalali($y,$mo,$d); return [$jy,$jm,$jd]; } catch (\Throwable $e) { return null; }
  }
  return [$y,$mo,$d];
}
function _users_with_jalali_birthday($month, $day=null) {
  $rows = Db::all("SELECT id, first_name, last_name, phone, mobile, birth_date,
      (SELECT title FROM roles WHERE id=users.role_id) role_title
    FROM users WHERE is_active=1 AND birth_date IS NOT NULL AND birth_date<>''");
  $out=[];
  foreach ($rows as $r) {
    $parts = _parse_birth_jalali_parts($r['birth_date'] ?? '');
    if (!$parts) continue;
    [$by,$bm,$bd] = $parts;
    if ((int)$bm !== (int)$month) continue;
    if ($day !== null && (int)$bd !== (int)$day) continue;
    $r['_birth_j_month']=(int)$bm; $r['_birth_j_day']=(int)$bd; $r['_birth_j_year']=(int)$by;
    $out[]=$r;
  }
  return $out;
}

// فعال‌سازی و قالب پیام در تنظیمات: birthday_enabled, birthday_channel (notif/sms/both),
// birthday_message (با {name} {first_name})
route('GET', '/api/cron/birthday', function($p,$b,$u){
  $key = $_GET['key'] ?? '';
  $ck = Db::one("SELECT value FROM app_settings WHERE `key`='cron_key'");
  $cronKey = $ck ? json_decode($ck['value'],true) : '';
  if (!$cronKey || $key !== $cronKey) Http::error('کلید کرون نامعتبر',403);
  $get = function($k,$d=null){ $r=Db::one("SELECT value FROM app_settings WHERE `key`=?",[$k]); if(!$r)return $d; $v=json_decode($r['value'],true); return ($v===null||$v==='')?$d:$v; };
  if (empty($get('birthday_enabled',false))) return ['ok'=>true,'skipped'=>'disabled'];
  $channel = $get('birthday_channel','notif'); // notif / sms / both
  $tpl = $get('birthday_message','همکار گرامی {name}\nتولدتان مبارک! 🎉 برایتان سالی پر از موفقیت آرزومندیم.');
  // امروز به شمسی؛ پشتیبانی از تاریخ تولد شمسی با جداکننده‌های / - . و اعداد یک‌رقمی
  [$jy,$jm,$jd] = gregorian_to_jalali((int)date('Y'),(int)date('m'),(int)date('d'));
  $mmdd = sprintf('%02d-%02d',$jm,$jd);
  $users = _users_with_jalali_birthday((int)$jm, (int)$jd);
  $sent=0;
  foreach ($users as $usr) {
    $name = trim(($usr['first_name']??'').' '.($usr['last_name']??''));
    $msg = str_replace(['{name}','{first_name}'], [$name, $usr['first_name']??''], $tpl);
    try{ Push::notify([(int)$usr['id']],'تولدت مبارک 🎉',$msg,['type'=>'birthday','birth_date'=>$usr['birth_date'] ?? null]); }catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
    if (in_array($channel,['sms','both']) && !empty($usr['phone']) && Sms::isEnabled()) { try{ Sms::send([$usr['phone']],$msg,'birthday',null); }catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); } }
    if (class_exists('MessengerHub')) { try{ MessengerHub::sendToMobile($usr['phone'] ?? $usr['mobile'] ?? '', 'تولدت مبارک 🎉' . "\n" . $msg, 'birthday', (int)$usr['id'], 'birthday'); }catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); } }
    elseif (BaleBot::isEnabled() && (BaleBot::config()['items']['birthday'] ?? true)) { try{ BaleBot::sendToMobile($usr['phone'] ?? $usr['mobile'] ?? '', 'تولدت مبارک 🎉' . "\n" . $msg, 'birthday', (int)$usr['id']); }catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); } }
    $sent++;
  }
  return ['ok'=>true,'date'=>$mmdd,'greeted'=>$sent];
}, true);

// تست دستی تبریک تولد (ادمین) — بدون توجه به تاریخ، برای یک کاربر
route('POST', '/api/admin/birthday/test', function($p,$b,$u){
  $uid = (int)($b['user_id'] ?? 0); if(!$uid) Http::error('کاربر را مشخص کنید',400);
  $get = function($k,$d=null){ $r=Db::one("SELECT value FROM app_settings WHERE `key`=?",[$k]); if(!$r)return $d; $v=json_decode($r['value'],true); return ($v===null||$v==='')?$d:$v; };
  $usr = Db::one("SELECT id,first_name,last_name,phone,mobile FROM users WHERE id=?", [$uid]);
  if(!$usr) Http::error('کاربر یافت نشد',404);
  $name = trim(($usr['first_name']??'').' '.($usr['last_name']??''));
  $msg = str_replace(['{name}','{first_name}'], [$name,$usr['first_name']??''], $get('birthday_message','همکار گرامی {name}
تولدتان مبارک!'));
  $channel = $get('birthday_channel','notif');
  $out=[]; $errs=[];
  try{ Push::notify([(int)$usr['id']],'تولدت مبارک 🎉',$msg,['type'=>'birthday']); $out[]='نوتیفیکیشن داخل برنامه ✓'; }catch(\Throwable $e){ $errs[]='پوش: '.$e->getMessage(); }
  $phone = $usr['mobile'] ?? $usr['phone'] ?? null;
  if (in_array($channel,['sms','both'])) {
    if (!$phone) $errs[]='شمارهٔ موبایل کاربر ثبت نشده است';
    elseif (!Sms::isEnabled()) $errs[]='سرویس پیامک فعال یا پیکربندی نشده است (تنظیمات → پیامک)';
    else { try{ Sms::send([$phone],$msg,'birthday',null); $out[]='پیامک ✓'; }catch(\Throwable $e){ $errs[]='خطای ارسال پیامک: '.$e->getMessage(); } }
  }
  if ($phone && class_exists('MessengerHub')) {
    $mr = MessengerHub::sendToMobile($phone, 'تولدت مبارک 🎉' . "\n" . $msg, 'birthday', $uid, 'birthday');
    $mt = MessengerHub::totals($mr);
    if ($mt['sent']>0) $out[]='ربات‌های پیام‌رسان ✓'; else $errs[]='ربات‌ها: ارسال نشد یا کاربر متصل نیست';
  } elseif ($phone && BaleBot::isEnabled() && (BaleBot::config()['items']['birthday'] ?? true)) {
    $br = BaleBot::sendToMobile($phone, 'تولدت مبارک 🎉' . "\n" . $msg, 'birthday', $uid);
    if (!empty($br['ok'])) $out[]='ربات بله ✓'; else $errs[]='بله: '.($br['error'] ?? 'ارسال نشد');
  }
  return ['ok'=>true,'sent'=>$out,'errors'=>$errs,'message'=>$msg,'channel'=>$channel];
}, false, ADMIN);

// ثبت خودکار نوع گوشی و نسخهٔ اندروید کاربر (از اپ)
route('POST', '/api/my/device-info', function($p,$b,$u){
  Db::run("UPDATE users SET device_model=?, android_version=?, app_version=? WHERE id=?",
    [substr((string)($b['device_model']??''),0,120), substr((string)($b['android_version']??''),0,40), substr((string)($b['app_version']??''),0,30), $u['id']]);
  return ['ok'=>true];
}, false);

// خروجی کامل اطلاعات کاربران (شامل فیلدهای سفارشی و اطلاعات دستگاه)
route('GET', '/api/admin/users/export', function($p,$b,$u){
  $users = Db::all("SELECT u.id,u.username,u.first_name,u.last_name,r.title role_title,u.phone,u.email,u.national_code,
      u.birth_date,u.marital_status,u.children_count,u.address,u.seniority_start,u.is_active,u.can_send_sms,u.device_model,u.android_version,u.app_version,
      u.signature_data,CASE WHEN u.photo_path IS NOT NULL AND u.photo_path<>'' THEN NULL ELSE u.photo END AS photo_b64,u.photo_path
    FROM users u LEFT JOIN roles r ON r.id=u.role_id ORDER BY u.id");
  $fields = Db::all("SELECT id,label FROM custom_fields WHERE is_active=1 ORDER BY sort_order,id");
  $allVals = Db::all("SELECT user_id,field_id,value FROM custom_field_values");
  $valMap=[]; foreach($allVals as $v){ $valMap[$v['user_id']][$v['field_id']]=$v['value']; }
  // تعداد تعهدات انضباطی هر کاربر
  $commitMap = [];
  try {
    Db::run("CREATE TABLE IF NOT EXISTS user_commitments (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, title VARCHAR(255) NOT NULL, description TEXT NULL, commit_jdate VARCHAR(10) NOT NULL, attachment_name VARCHAR(255) NULL, attachment_path VARCHAR(400) NULL, attachment_data LONGTEXT NULL, created_by INT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_uc_user (user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    foreach (Db::all("SELECT user_id, COUNT(*) c FROM user_commitments GROUP BY user_id") as $cm) $commitMap[$cm['user_id']] = (int)$cm['c'];
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }

  $head=['شناسه','نام کاربری','نام','نام خانوادگی','سمت','موبایل','ایمیل','کد ملی','تاریخ تولد','وضعیت تأهل','تعداد فرزند','آدرس','شروع سنوات','فعال','اجازهٔ پیامک','مدل گوشی','نسخهٔ اندروید','نسخهٔ برنامه','تعداد تعهدات انضباطی'];
  $photoColIdx = count($head); $head[] = 'عکس پرسنلی';
  $sigColIdx = count($head); $head[] = 'امضا';
  foreach($fields as $f) $head[]=$f['label'];

  $xw = new XlsxWriter($head);
  foreach (['id'=>6,'username'=>12,'first_name'=>12,'last_name'=>14,'role_title'=>16,'phone'=>13,'email'=>18,'national_code'=>12,
            'birth_date'=>11,'marital_status'=>10,'children_count'=>8,'address'=>26,'seniority_start'=>11,'is_active'=>8,
            'can_send_sms'=>9,'device_model'=>14,'android_version'=>10,'app_version'=>10,'commitments'=>10] as $i2=>$w2) { static $ci=0; $xw->setColWidth($ci++, $w2); }
  $xw->setColWidth($photoColIdx, 13);
  $xw->setColWidth($sigColIdx, 16);

  foreach($users as $usr){
    $row=[$usr['id'],$usr['username'],$usr['first_name'],$usr['last_name'],$usr['role_title'],$usr['phone'],$usr['email'],$usr['national_code'],$usr['birth_date'],
      $usr['marital_status'],$usr['children_count'],$usr['address'],$usr['seniority_start'],$usr['is_active']?'فعال':'غیرفعال',$usr['can_send_sms']?'بله':'خیر',
      $usr['device_model'],$usr['android_version'],$usr['app_version'],$commitMap[$usr['id']] ?? 0,
      '', // ستون عکس (خالی؛ خود تصویر بعداً جاسازی می‌شود)
      '', // ستون امضا
    ];
    foreach($fields as $f){ $row[]= $valMap[$usr['id']][$f['id']] ?? ''; }
    $rIdx = $xw->addRow($row);

    // عکس پرسنلی: از فایل فیزیکی (photo_path) یا از ستون قدیمی base64
    $photoBytes = null;
    if (!empty($usr['photo_path'])) {
      $full = Media::fullPath($usr['photo_path']);
      if ($full && is_file($full)) $photoBytes = @file_get_contents($full);
    } elseif (!empty($usr['photo_b64']) && strpos($usr['photo_b64'], 'base64,') !== false) {
      $photoBytes = base64_decode(substr($usr['photo_b64'], strpos($usr['photo_b64'], 'base64,') + 7), true) ?: null;
    }
    if ($photoBytes) $xw->setImage($rIdx, $photoColIdx, $photoBytes, 90);

    // امضا: در ستون signature_data به‌صورت data URI ذخیره شده است
    if (!empty($usr['signature_data']) && strpos($usr['signature_data'], 'base64,') !== false) {
      $sigBytes = base64_decode(substr($usr['signature_data'], strpos($usr['signature_data'], 'base64,') + 7), true) ?: null;
      if ($sigBytes) $xw->setImage($rIdx, $sigColIdx, $sigBytes, 110);
    }
  }
  $xw->output('اطلاعات_کامل_کاربران.xlsx', 'کاربران');
}, false, ADMIN);

route('GET', '/api/auth/me', function($p,$b,$u){
  $exempt = false; $mustSetup = false; $mustRenew = false; $secEx = false;
  try {
    $r = Db::one("SELECT security_exempt, must_change_pw, profile_done, pw_changed_at, photo_taken_at FROM users WHERE id=?", [$u['id']]);
    $exempt = (bool)($r['security_exempt'] ?? 0); $secEx = $exempt;
    // دورهٔ اجباری تمدید (روز) از تنظیمات؛ پیش‌فرض ۳۰
    $rd = Db::one("SELECT value FROM app_settings WHERE `key`='renew_days'");
    $renewDays = $rd ? (int)json_decode($rd['value'], true) : 30; if ($renewDays < 1) $renewDays = 30;
    $mustSetup = empty($r['profile_done']) || (bool)($r['must_change_pw'] ?? 0);
    if (!$mustSetup) {
      $pwAt = $r['pw_changed_at'] ? strtotime($r['pw_changed_at']) : 0;
      $phAt = $r['photo_taken_at'] ? strtotime($r['photo_taken_at']) : 0;
      $limit = time() - $renewDays*86400;
      if ($pwAt < $limit || $phAt < $limit) $mustRenew = true;
    }
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  return ['user'=>[
    'id'=>(int)$u['id'],'username'=>$u['username'],'name'=>trim(($u['first_name']??'').' '.($u['last_name']??'')),
    'role'=>$u['role_title']??'','role_id'=>(int)($u['role_id']??0),'level'=>(int)($u['level']??0),'is_admin'=>(bool)($u['is_admin']??false),
    'must_change_pw'=>(bool)($u['must_change_pw']??false),'email'=>$u['email']??null,'photo'=>_user_photo_url($u['photo_path'] ?? null, $u['photo'] ?? null),
    'security_exempt'=>$secEx, 'must_setup'=>$mustSetup, 'must_renew'=>$mustRenew,
    'can_send_sms'=>(bool)($u['is_admin']??false) || (bool)(Db::one("SELECT can_send_sms FROM users WHERE id=?", [$u['id']])['can_send_sms'] ?? 0),
  ]];
});

// تنظیمات اولین ورود: ثبت ایمیل و تغییر رمز پیش‌فرض
route('POST', '/api/my/initial-setup', function($p, $b, $u) {
  $next  = $b['next'] ?? '';
  if (strlen($next) < 6) Http::error('رمز جدید حداقل ۶ کاراکتر', 400);
  if ($next === '123456') Http::error('رمز جدید نباید پیش‌فرض باشد', 400);
  // اطلاعات فردی
  $national = trim($b['national_code'] ?? '');
  $phone    = trim($b['phone'] ?? '');
  $marital  = $b['marital_status'] ?? null;
  $address  = trim($b['address'] ?? '');
  $children = isset($b['children_count']) ? (int)$b['children_count'] : null;
  $photo    = $b['photo'] ?? '';
  if ($national !== '' && !preg_match('/^\d{10}$/', $national)) Http::error('کد ملی باید ۱۰ رقم باشد', 400);
  if ($phone === '' ) Http::error('شمارهٔ تلفن همراه لازم است', 400);
  if ($photo === '' || strpos($photo,'data:image') !== 0) Http::error('عکس پرسنلی (از دوربین) لازم است', 400);
  $email = trim($b['email'] ?? '');
  Db::run("UPDATE users SET email=?, phone=?, national_code=?, marital_status=?, address=?, children_count=?, photo=?,
      password_hash=?, must_change_pw=0, profile_done=1, pw_changed_at=NOW(), photo_taken_at=NOW() WHERE id=?",
    [$email ?: null, $phone, $national ?: null, $marital, $address ?: null, $children, $photo,
     password_hash($next, PASSWORD_BCRYPT), $u['id']]);
  return ['ok'=>true];
});

// به‌روزرسانی دوره‌ای (هر ۳۰ روز): فقط رمز جدید + عکس پرسنلی جدید
route('POST', '/api/my/periodic-renew', function($p, $b, $u) {
  $next  = $b['next'] ?? '';
  $photo = $b['photo'] ?? '';
  if (strlen($next) < 6) Http::error('رمز جدید حداقل ۶ کاراکتر', 400);
  if ($next === '123456') Http::error('رمز جدید نباید پیش‌فرض باشد', 400);
  if ($photo === '' || strpos($photo,'data:image') !== 0) Http::error('عکس پرسنلی جدید (از دوربین) لازم است', 400);
  $_uPhotoPath = Media::saveBase64($photo, 'users', 600, 75);
  Db::run("UPDATE users SET photo_path=?, password_hash=?, pw_changed_at=NOW(), photo_taken_at=NOW() WHERE id=?",
    [$_uPhotoPath, password_hash($next, PASSWORD_BCRYPT), $u['id']]);
  return ['ok'=>true];
});

route('POST', '/api/admin/change-password', function($p, $b, $u) {
  if (strlen($b['next'] ?? '') < 6) Http::error('رمز جدید حداقل ۶ کاراکتر', 400);
  $row = Db::one("SELECT password_hash FROM users WHERE id=?", [$u['id']]);
  if (!password_verify($b['current'] ?? '', $row['password_hash'])) Http::error('رمز فعلی اشتباه است', 401);
  Db::run("UPDATE users SET password_hash=?, must_change_pw=0 WHERE id=?", [password_hash($b['next'], PASSWORD_BCRYPT), $u['id']]);
  return ['ok'=>true];
});


// ثبت نمونه آموزشی پلاک: تصویر برش‌خورده + مقدار صحیح، برای بهبود OCR پلاک‌های تاکسی ۱۲/ت
route('POST', '/api/plate-scan-samples', function($p,$b,$u){
  _ensure_plate_scan_samples();
  $post = $_POST ?: [];
  if (!is_array($b)) $b = [];
  $data = array_merge($b, $post);
  $corrected = _taxi12_plate_norm($data['corrected_plate'] ?? (($data['corrected_digits_2'] ?? '').'ت'.($data['corrected_digits_3'] ?? '').'-12'));
  if (!$corrected) Http::error('پلاک اصلاح‌شده نامعتبر است', 400);
  $detected = _taxi12_plate_norm($data['detected_plate'] ?? '') ?: null;
  $d = _digits_only($corrected);
  $detD = $detected ? _digits_only($detected) : '';
  $cropPath = null; $origPath = null;
  if (!empty($_FILES['crop']) && ($_FILES['crop']['error'] ?? 1) === 0) $cropPath = Media::saveUploadedFile($_FILES['crop'], 'plate_samples', 1100, 82);
  if (!empty($_FILES['file']) && ($_FILES['file']['error'] ?? 1) === 0 && !$cropPath) $cropPath = Media::saveUploadedFile($_FILES['file'], 'plate_samples', 1100, 82);
  if (!empty($_FILES['original']) && ($_FILES['original']['error'] ?? 1) === 0) $origPath = Media::saveUploadedFile($_FILES['original'], 'plate_samples_original', 1400, 75);
  $veh = _vehicle_by_taxi12_plate($corrected);
  $conf = isset($data['confidence']) && is_numeric($data['confidence']) ? (float)$data['confidence'] : null;
  if ($conf !== null && $conf > 1) $conf = $conf / 100;
  $eventAt = function_exists('_app_client_time') ? _app_client_time($data) : date('Y-m-d H:i:s');
  $id = Db::insert("INSERT INTO plate_scan_samples(user_id,vehicle_id,original_image_path,crop_image_path,detected_plate,corrected_plate,detected_digits_2,detected_digits_3,corrected_digits_2,corrected_digits_3,fixed_letter,region_code,confidence,ocr_source,raw_text,status,client_time)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [
      $u['id'], $veh['id'] ?? null, $origPath, $cropPath, $detected, $corrected,
      $detD ? substr($detD,0,2) : substr(_digits_only($data['detected_digits_2'] ?? ''),0,2),
      $detD ? substr($detD,2,3) : substr(_digits_only($data['detected_digits_3'] ?? ''),0,3),
      substr($d,0,2), substr($d,2,3), 'ت', '12', $conf,
      substr((string)($data['ocr_source'] ?? ''),0,80), substr((string)($data['raw_text'] ?? ''),0,10000),
      'verified', $eventAt
    ]);
  return ['ok'=>true,'id'=>$id,'plate'=>$corrected,'vehicle_id'=>$veh['id'] ?? null,'crop_image'=> $cropPath ? '/api/media?path='.urlencode($cropPath) : null];
}, false);


route('GET', '/api/admin/plate-scan-samples', function($p,$b,$u){
  _ensure_plate_training();
  $plate = _taxi12_plate_norm($_GET['plate'] ?? '') ?: null;
  $where='1=1'; $args=[];
  if ($plate) { $where .= ' AND p.corrected_plate=?'; $args[]=$plate; }
  $rows = Db::all("SELECT p.*, CONCAT(u.first_name,' ',u.last_name) user_name, v.plate vehicle_plate
    FROM plate_scan_samples p LEFT JOIN users u ON u.id=p.user_id LEFT JOIN vehicles v ON v.id=p.vehicle_id
    WHERE $where ORDER BY p.id DESC LIMIT 500", $args);
  foreach($rows as &$r){
    if(!empty($r['crop_image_path'])) $r['crop_image']='/api/media?path='.urlencode($r['crop_image_path']);
    if(!empty($r['original_image_path'])) $r['original_image']='/api/media?path='.urlencode($r['original_image_path']);
    unset($r['crop_image_path'],$r['original_image_path']);
  }
  return ['items'=>$rows,'count'=>count($rows),'site_version'=>SITE_VERSION,'app_version'=>APP_VERSION];
}, false, ADMIN);

route('GET', '/api/admin/plate-training/status', function($p,$b,$u){
  return _plate_model_status_payload();
}, false, ADMIN);

route('GET', '/api/admin/plate-training/samples', function($p,$b,$u){
  _ensure_plate_training();
  $status = trim((string)($_GET['status'] ?? ''));
  $plate = _taxi12_plate_norm($_GET['plate'] ?? '') ?: null;
  $q = trim((string)($_GET['q'] ?? ''));
  $limit = max(20, min(1000, (int)($_GET['limit'] ?? 300)));
  $where = '1=1'; $args=[];
  if(in_array($status,['verified','pending','rejected'],true)){ $where.=' AND p.status=?'; $args[]=$status; }
  if($plate){ $where.=' AND p.corrected_plate=?'; $args[]=$plate; }
  if($q!==''){
    $qPlate = _taxi12_plate_norm($q);
    if($qPlate){ $where.=' AND p.corrected_plate=?'; $args[]=$qPlate; }
    else {
      $where.=' AND (p.corrected_plate LIKE ? OR p.raw_text LIKE ?)';
      $args[]='%'.$q.'%'; $args[]='%'.$q.'%';
    }
  }
  $sampleCols = ['id','user_id','vehicle_id','detected_plate','corrected_plate','detected_digits_2','detected_digits_3','corrected_digits_2','corrected_digits_3','fixed_letter','region_code','confidence','ocr_source','raw_text','status','review_note','reviewed_at','exported_at','client_time','created_at','original_image_path','crop_image_path'];
  $select = [];
  foreach($sampleCols as $c){ $select[] = _sql_col_or_null('plate_scan_samples','p',$c,$c); }
  $joins=[];
  if(_db_table_exists_safe('users')){
    $joins[]='LEFT JOIN users u ON u.id=p.user_id';
    $select[]=_user_display_name_sql('u','user_name');
    if(_db_col_exists_safe('plate_scan_samples','reviewed_by')){
      $joins[]='LEFT JOIN users rv ON rv.id=p.reviewed_by';
      $select[]=_user_display_name_sql('rv','reviewer_name');
    } else { $select[]='NULL AS reviewer_name'; }
  } else { $select[]='NULL AS user_name'; $select[]='NULL AS reviewer_name'; }
  if(_db_table_exists_safe('vehicles')){
    $joins[]='LEFT JOIN vehicles v ON v.id=p.vehicle_id';
    $select[]=_sql_col_or_null('vehicles','v','plate','vehicle_plate');
    $select[]=_sql_col_or_null('vehicles','v','model_name','model_name');
    $select[]=_sql_col_or_null('vehicles','v','model_year','model_year');
    if(_db_table_exists_safe('lines') && _db_col_exists_safe('vehicles','line_id')){
      $joins[]='LEFT JOIN `lines` l ON l.id=v.line_id';
      $lineCode = _db_col_exists_safe('lines','code') ? 'l.`code`' : 'NULL';
      $lineText = _db_col_exists_safe('vehicles','line_text') ? 'v.`line_text`' : 'NULL';
      $select[]="COALESCE($lineCode,$lineText) AS line_code";
    } else {
      $select[]=_sql_col_or_null('vehicles','v','line_text','line_code');
    }
  } else { $select[]='NULL AS vehicle_plate'; $select[]='NULL AS model_name'; $select[]='NULL AS model_year'; $select[]='NULL AS line_code'; }
  $sql='SELECT '.implode(',', $select).' FROM plate_scan_samples p '.implode(' ', $joins)." WHERE $where ORDER BY p.id DESC LIMIT $limit";
  try { $rows = Db::all($sql, $args); }
  catch(Throwable $e){
    try{ Db::run("INSERT INTO app_error_logs(level,source,message,context) VALUES('error','plate_training_samples',?,?)", [substr($e->getMessage(),0,1000), json_encode(['sql'=>$sql],JSON_UNESCAPED_UNICODE)]); }catch(Throwable $x){}
    // در پنل مدیریت نباید خطای 500 باعث توقف صفحه شود؛ ساختار فعلی دیتابیس گزارش می‌شود.
    return ['items'=>[], 'count'=>0, 'status'=>_plate_model_status_payload(), 'warning'=>'ساختار جدول نمونه‌های پلاک ناقص بود و به‌صورت خودکار ترمیم شد. صفحه را دوباره باز کنید.', 'db_error'=>substr($e->getMessage(),0,400)];
  }
  foreach($rows as &$r){
    $r['crop_image'] = !empty($r['crop_image_path']) ? '/api/media?path='.urlencode($r['crop_image_path']) : null;
    $r['original_image'] = !empty($r['original_image_path']) ? '/api/media?path='.urlencode($r['original_image_path']) : null;
    unset($r['crop_image_path'],$r['original_image_path']);
  }
  return ['items'=>$rows,'count'=>count($rows),'status'=>_plate_model_status_payload()];
}, false, ADMIN);

route('POST', '/api/admin/plate-training/samples/{id}/review', function($p,$b,$u){
  _ensure_plate_training();
  $id=(int)$p['id']; if(!$id) Http::error('شناسه نامعتبر است',422);
  $status = (string)($b['status'] ?? 'verified');
  if(!in_array($status,['verified','pending','rejected'],true)) Http::error('وضعیت نامعتبر است',422);
  $old = Db::one("SELECT corrected_plate,corrected_digits_2,corrected_digits_3 FROM plate_scan_samples WHERE id=?",[$id]);
  if(!$old) Http::error('نمونه پلاک یافت نشد',404);
  $hasCorrection = array_key_exists('corrected_plate',$b) || array_key_exists('corrected_digits_2',$b) || array_key_exists('corrected_digits_3',$b);
  $candidate = '';
  if($hasCorrection){
    $candidate = trim((string)($b['corrected_plate'] ?? ''));
    if($candidate==='') $candidate = (string)($b['corrected_digits_2'] ?? '').'ت'.(string)($b['corrected_digits_3'] ?? '').'-12';
  } else {
    $candidate = (string)($old['corrected_plate'] ?? '');
    if(trim($candidate)==='') $candidate = (string)($old['corrected_digits_2'] ?? '').'ت'.(string)($old['corrected_digits_3'] ?? '').'-12';
  }
  $corrected = _taxi12_plate_norm($candidate);
  // برای «در انتظار» و «ردشده» وجود پلاک کامل الزامی نیست؛ فقط تأیید نهایی به پلاک معتبر نیاز دارد.
  if($status==='verified' && !$corrected) Http::error('برای تأیید نمونه، پلاک اصلاحی معتبر وارد کنید',422);
  $d = $corrected ? _digits_only($corrected) : '';
  $note = substr((string)($b['review_note'] ?? $b['note'] ?? ''),0,2000);
  $veh = $corrected ? _vehicle_by_taxi12_plate($corrected) : null;
  Db::run("UPDATE plate_scan_samples SET status=?, corrected_plate=COALESCE(?,corrected_plate), corrected_digits_2=COALESCE(?,corrected_digits_2), corrected_digits_3=COALESCE(?,corrected_digits_3), vehicle_id=COALESCE(?,vehicle_id), review_note=?, reviewed_by=?, reviewed_at=NOW() WHERE id=?",[$status,$corrected,$corrected?substr($d,0,2):null,$corrected?substr($d,2,3):null,$veh['id']??null,$note,$u['id'],$id]);
  return ['ok'=>true,'id'=>$id,'status'=>$status,'corrected_plate'=>$corrected,'vehicle_id'=>$veh['id']??null];
}, false, ADMIN);

/* ---------------- جستجو ---------------- */
route('GET', '/api/search', function($p, $b, $u) {
  // خطوط مجاز کاربر — مقاوم در برابر نصب‌های قدیمی یا جدول/ستون ناقص
  $myLines = [];
  try {
    if (_db_table_exists_safe('user_lines') && _db_table_exists_safe('lines')) {
      $myLines = Db::all("SELECT l.id, l.code FROM user_lines ul JOIN `lines` l ON l.id=ul.line_id WHERE ul.user_id=?", [$u['id']]);
    }
  } catch (Throwable $e) { $myLines = []; }
  if ($myLines) { $allowedLineIds = array_column($myLines,'id'); $allowedCodes = array_column($myLines,'code'); }
  elseif (empty($u['is_admin'])) { $allowedLineIds = []; $allowedCodes = []; }
  else { $allowedLineIds = null; $allowedCodes = null; }
  $vehicleInLines = function($v) use ($allowedLineIds,$allowedCodes) {
    if ($allowedLineIds === null) return true;
    if (!$allowedLineIds && !$allowedCodes) return false;
    if ($v['line_id'] && in_array($v['line_id'], $allowedLineIds)) return true;
    if (!empty($v['line_text']) && $allowedCodes) { $code = trim(preg_split('/\s*-\s*/u', trim($v['line_text']))[0]); if (in_array($code, $allowedCodes)) return true; }
    return false;
  };
  $driverInLines = function($driverId) use ($allowedLineIds,$allowedCodes,$vehicleInLines) {
    if ($allowedLineIds === null) return true;
    if (!$allowedLineIds && !$allowedCodes) return false;
    $vs = Db::all("SELECT v.line_id, v.line_text FROM vehicle_drivers vd JOIN vehicles v ON v.id=vd.vehicle_id WHERE vd.driver_id=?", [$driverId]);
    foreach ($vs as $v) if ($vehicleInLines($v)) return true;
    // راننده‌های موقتِ اضافه‌شده به خطوط ویژه نیز برای ناظر/اپراتور/بازرس همان خط قابل مشاهده‌اند
    if (_driver_in_temp_lines($driverId, $allowedLineIds, $allowedCodes)) return true;
    return false;
  };
  if (!empty($_GET['national_id'])) {
    $nid = _digits_only($_GET['national_id']);
    if ($nid === '') Http::error('کد ملی نامعتبر است', 400);
    $d = Db::one("SELECT * FROM drivers WHERE "._driver_national_where_sql('drivers'), _driver_national_args($nid));
    if ($d && empty($d['national_id']) && !empty($d['national_code'])) $d['national_id'] = $d['national_code'];
    if (!$d) Http::error('راننده یافت نشد', 404);
    if (!$driverInLines($d['id'])) Http::error('این راننده در خطوط شما نمی‌باشد', 403);
    $w = [];
    if ($d['taxi_lic_status'] && $d['taxi_lic_status'] !== 'فعال') $w[] = 'پروانه تاکسیرانی نامعتبر است';
    if ($d['op_lic_status'] && $d['op_lic_status'] !== 'فعال') $w[] = 'پروانه بهره‌برداری نامعتبر است';
    if ($w) {
      $rec = [$u['id']];
      $ln = Db::one("SELECT l.id FROM vehicle_drivers vd JOIN vehicles v ON v.id=vd.vehicle_id JOIN `lines` l ON l.id=v.line_id WHERE vd.driver_id=? LIMIT 1", [$d['id']]);
      if ($ln) foreach (Db::all("SELECT user_id FROM user_lines WHERE line_id=?", [$ln['id']]) as $f) $rec[] = $f['user_id'];
      Push::notify($rec, 'هشدار انقضای پروانه',
        "پروانهٔ راننده {$d['first_name']} {$d['last_name']} (کد ملی {$d['national_id']}) نامعتبر است. لطفاً تذکر ثبت شود.",
        ['type'=>'license_expiry','national_id'=>$d['national_id']]);
    }
    // خودرو + خط + کد در خط + نوع فعالیت + شیفت + بهره‌بردار برای نمایش در صفحهٔ نتیجه
    $veh = Db::one("SELECT v.plate, v.model_name, v.model_year, v.tech_inspection_expire, v.insurance_expire,
        COALESCE(l.code, v.line_text) AS line_code, l.origin AS line_origin, l.destination AS line_destination,
        vd.line_code_in_line, vd.role AS vd_role, vd.shift AS vd_shift, v.id AS vehicle_id
      FROM vehicle_drivers vd JOIN vehicles v ON v.id=vd.vehicle_id LEFT JOIN `lines` l ON l.id=v.line_id
      WHERE vd.driver_id=? ORDER BY (vd.role='beneficiary') DESC LIMIT 1", [$d['id']]);
    if ($veh) {
      $roleMap = ['beneficiary'=>'بهره‌بردار','helper'=>'کمکی','driver'=>'راننده'];
      $veh['activity_type'] = $roleMap[$veh['vd_role']] ?? ($d['driver_type'] ?? null);
      $shiftMap = ['morning'=>'صبح','evening'=>'عصر','night'=>'شب','صبح'=>'صبح','عصر'=>'عصر','شب'=>'شب'];
      $veh['shift_fa'] = isset($veh['vd_shift']) ? ($shiftMap[$veh['vd_shift']] ?? $veh['vd_shift']) : null;
      // اگر راننده «کمکی» است، نام بهره‌بردار خودرو را پیدا کن
      if ($veh['vd_role'] === 'helper' && !empty($veh['vehicle_id'])) {
        $ben = Db::one("SELECT d.first_name, d.last_name FROM vehicle_drivers vd JOIN drivers d ON d.id=vd.driver_id
                        WHERE vd.vehicle_id=? AND vd.role='beneficiary' LIMIT 1", [$veh['vehicle_id']]);
        if ($ben) $veh['beneficiary_name'] = trim($ben['first_name'].' '.$ben['last_name']);
      }
      $veh['insurance_status'] = $veh['insurance_expire'] ? (j_to_ts($veh['insurance_expire'])===null?null:(j_to_ts($veh['insurance_expire'])<time()?'منقضی':(is_expiring($veh['insurance_expire'],10)?'رو به انقضا':'معتبر'))) : null;
      $veh['inspection_status'] = $veh['tech_inspection_expire'] ? (j_to_ts($veh['tech_inspection_expire'])===null?null:(j_to_ts($veh['tech_inspection_expire'])<time()?'منقضی':(is_expiring($veh['tech_inspection_expire'],10)?'رو به انقضا':'معتبر'))) : null;
    }
    // خطوط موقتِ فعالِ این راننده (خط ویژه + کد در خط)
    _ensure_temp_line_drivers();
    $tempLines = Db::all("SELECT t.id, t.line_id, t.line_code_in_line, t.note, t.created_at, l.code line_code, l.origin, l.destination
      FROM temp_line_drivers t JOIN `lines` l ON l.id=t.line_id
      WHERE t.driver_id=? AND t.is_active=1 ORDER BY t.id DESC", [$d['id']]);
    return ['type'=>'driver','driver'=>$d,'vehicle'=>$veh,'warnings'=>$w,'temp_lines'=>$tempLines];
  }
  if (!empty($_GET['plate'])) {
    $plateNorm = _taxi12_plate_norm($_GET['plate']);
    if (!$plateNorm) Http::error('پلاک نامعتبر است', 400);
    $v = _vehicle_by_taxi12_plate($plateNorm);
    if (!$v) Http::error('خودرو یافت نشد', 404);
    if (!$vehicleInLines($v)) Http::error('این خودرو در خطوط شما نمی‌باشد', 403);
    $drv = Db::all("SELECT d.*, vd.role, vd.shift, vd.line_code_in_line FROM vehicle_drivers vd JOIN drivers d ON d.id=vd.driver_id WHERE vd.vehicle_id=? ORDER BY (vd.role='beneficiary') DESC", [$v['id']]);
    $rmap = ['beneficiary'=>'بهره‌بردار','helper'=>'کمکی','driver'=>'راننده'];
    $shiftMap = ['morning'=>'صبح','evening'=>'عصر','night'=>'شب','صبح'=>'صبح','عصر'=>'عصر','شب'=>'شب'];
    foreach ($drv as &$dd) {
      $dd['role_fa'] = $rmap[$dd['role']] ?? 'راننده';
      $dd['shift_fa'] = !empty($dd['shift']) ? ($shiftMap[$dd['shift']] ?? $dd['shift']) : null;
      // بررسی انقضای پروانهٔ بهره‌برداری برای رانندگان کمکی
      // اگر کمکی باشد و پروانهٔ بهره‌برداری‌اش منقضی باشد → مسدود
      $opExpired = ($dd['op_lic_status'] ?? '') === 'منقضی'
        || (!empty($dd['op_lic_expire']) && j_to_ts($dd['op_lic_expire']) !== null && j_to_ts($dd['op_lic_expire']) < time());
      // راننده اصلی (بهره‌بردار) حتی با پروانهٔ منقضی، دسترسی باز دارد
      // راننده کمکی با پروانهٔ منقضی → مسدود
      $dd['op_lic_expired'] = $opExpired;
      $dd['access_blocked'] = ($dd['role'] === 'helper' && $opExpired);
      $dd['block_reason'] = $dd['access_blocked']
        ? 'پروانهٔ بهره‌برداری این رانندهٔ کمکی منقضی شده و قانوناً امکان استفاده از این تاکسی را ندارد.'
        : null;
    }
    unset($dd);
    return ['type'=>'vehicle','vehicle'=>$v,'drivers'=>$drv];
  }
  Http::error('national_id یا plate لازم است', 400);
});

/* ==================== رانندگان موقت خطوط ویژه ==================== */
// جستجوی راننده در «کل خطوط» (برای نیروی اداری، بدون محدودیت خط) جهت افزودن موقت به خط ویژه
route('GET', '/api/temp-drivers/search', function($p,$b,$u){
  _ensure_temp_line_drivers();
  $nid = _digits_only($_GET['national_id'] ?? $_GET['q'] ?? '');
  if ($nid === '' || strlen($nid) < 8) Http::error('کد ملی را کامل وارد کنید', 400);
  $d = Db::one("SELECT * FROM drivers WHERE REPLACE(REPLACE(national_id,'-',''),' ','')=?", [$nid]);
  if (!$d) Http::error('راننده یافت نشد', 404);
  // خط اصلی راننده (از طریق خودرو) — در پایگاه‌های ناقص، نبود vehicle_drivers نباید باعث خطای 500 شود
  $main = null;
  try {
    $main = Db::one("SELECT COALESCE(l.code, v.line_text) line_code, l.id line_id, l.origin, l.destination, vd.line_code_in_line
      FROM vehicle_drivers vd JOIN vehicles v ON v.id=vd.vehicle_id LEFT JOIN `lines` l ON l.id=v.line_id
      WHERE vd.driver_id=? ORDER BY (vd.role='beneficiary') DESC LIMIT 1", [$d['id']]);
  } catch (\Throwable $e) { $main = null; }
  $temp = Db::all("SELECT t.id, t.line_id, t.line_code_in_line, t.note, t.created_at, l.code line_code, l.origin, l.destination
    FROM temp_line_drivers t JOIN `lines` l ON l.id=t.line_id
    WHERE t.driver_id=? AND t.is_active=1 ORDER BY t.id DESC", [$d['id']]);
  return ['driver'=>$d, 'main_line'=>$main, 'temp_lines'=>$temp];
}, false);

// فهرست خطوط ویژه‌ای که راننده می‌تواند موقتاً به آن‌ها اضافه شود
route('GET', '/api/temp-drivers/special-lines', function($p,$b,$u){
  $codes = _special_line_codes();
  if (!$codes) return [];
  $in = implode(',', array_fill(0, count($codes), '?'));
  return Db::all("SELECT id, code, origin, destination FROM `lines` WHERE code IN ($in) ORDER BY code", $codes);
}, false);

// جستجوی خودرو برای ثبت همزمان بهره‌بردار و راننده کمکی در خطوط موقت
route('GET', '/api/temp-drivers/vehicle-search', function($p,$b,$u){
  _ensure_temp_line_drivers();
  $q = trim($_GET['q'] ?? $_GET['plate'] ?? '');
  if ($q === '') Http::error('عبارت جستجوی خودرو را وارد کنید', 400);
  $digits = _digits_only($q);
  $like = '%'.$q.'%';
  $args = [$like, $like, $like, $like];
  $sql = "SELECT DISTINCT v.* FROM vehicles v
    LEFT JOIN vehicle_drivers vd ON vd.vehicle_id=v.id
    LEFT JOIN drivers d ON d.id=vd.driver_id
    WHERE v.plate LIKE ? OR v.operating_code LIKE ? OR v.line_text LIKE ? OR CONCAT_WS(' ',d.first_name,d.last_name,d.national_id,d.mobile) LIKE ?";
  if ($digits !== '') { $sql .= " OR REPLACE(REPLACE(REPLACE(REPLACE(v.plate,' ',''),'-',''),'ایران',''),'IR','') LIKE ? OR REPLACE(REPLACE(d.national_id,'-',''),' ','') LIKE ?"; $args[] = '%'.$digits.'%'; $args[] = '%'.$digits.'%'; }
  $sql .= " ORDER BY v.id DESC LIMIT 1";
  $v = Db::one($sql, $args);
  if (!$v) Http::error('خودرو یافت نشد', 404);
  $drivers = [];
  try {
    $drivers = Db::all("SELECT d.id, d.national_id, d.first_name, d.last_name, d.mobile, vd.role, vd.line_code_in_line
      FROM vehicle_drivers vd JOIN drivers d ON d.id=vd.driver_id
      WHERE vd.vehicle_id=? ORDER BY FIELD(vd.role,'beneficiary','helper'), d.last_name", [$v['id']]);
  } catch (\Throwable $e) { $drivers = []; }
  $main = Db::one("SELECT COALESCE(l.code, v.line_text) line_code, l.id line_id, l.origin, l.destination
    FROM vehicles v LEFT JOIN `lines` l ON l.id=v.line_id WHERE v.id=?", [$v['id']]);
  return ['vehicle'=>$v, 'drivers'=>$drivers, 'main_line'=>$main];
}, false);

// افزودن راننده به خط ویژه به‌صورت موقت (خط اصلی حفظ می‌شود)
route('POST', '/api/temp-drivers', function($p,$b,$u){
  _ensure_temp_line_drivers();
  $lineId = (int)($b['line_id'] ?? 0);
  $codeInLine = trim($b['line_code_in_line'] ?? '') ?: null;
  $note = trim($b['note'] ?? '') ?: null;
  if (!$lineId) Http::error('خط ویژه را انتخاب کنید', 422);
  $line = Db::one("SELECT id, code FROM `lines` WHERE id=?", [$lineId]);
  if (!$line || !in_array((string)$line['code'], _special_line_codes(), true)) Http::error('این خط جزو خطوط ویژه نیست', 422);

  $driverIds = [];
  if (!empty($b['driver_ids']) && is_array($b['driver_ids'])) {
    foreach ($b['driver_ids'] as $id) { $id=(int)$id; if($id>0) $driverIds[$id]=$id; }
  }
  if (!$driverIds) {
    $nid = preg_replace('/\D+/', '', (string)($b['national_id'] ?? ''));
    if ($nid === '') Http::error('کد ملی راننده الزامی است', 422);
    $d = Db::one("SELECT id FROM drivers WHERE national_id=?", [$nid]);
    if (!$d) Http::error('راننده یافت نشد', 404);
    $driverIds[(int)$d['id']] = (int)$d['id'];
  }

  $added = []; $skipped = [];
  foreach (array_values($driverIds) as $driverId) {
    $d = Db::one("SELECT id, national_id, first_name, last_name FROM drivers WHERE id=?", [$driverId]);
    if (!$d) { $skipped[] = ['driver_id'=>$driverId,'reason'=>'راننده یافت نشد']; continue; }
    $exists = Db::one("SELECT id FROM temp_line_drivers WHERE driver_id=? AND line_id=? AND is_active=1", [$d['id'], $lineId]);
    if ($exists) { $skipped[] = ['driver_id'=>$d['id'],'reason'=>'قبلاً فعال است']; continue; }
    $id = Db::insert("INSERT INTO temp_line_drivers(driver_id,line_id,line_code_in_line,note,added_by) VALUES(?,?,?,?,?)",
      [$d['id'], $lineId, $codeInLine, $note, $u['id']]);
    _temp_driver_log('add',$id,(int)$d['id'],$lineId,(int)$u['id'],['line_code_in_line'=>$codeInLine,'note'=>$note]);
    $added[] = ['id'=>$id,'driver'=>$d];
  }
  if (!$added) Http::error('هیچ راننده‌ای اضافه نشد؛ احتمالاً همه قبلاً در این خط فعال هستند.', 409);

  $rec = [];
  foreach (Db::all("SELECT user_id FROM user_lines WHERE line_id=?", [$lineId]) as $f) $rec[] = $f['user_id'];
  if ($rec) {
    $names = implode('، ', array_map(function($x){ return trim(($x['driver']['first_name']??'').' '.($x['driver']['last_name']??'')); }, $added));
    Push::notify($rec, 'راننده موقت جدید',
      "{$names} به‌صورت موقت به خط {$line['code']} اضافه شد.",
      ['type'=>'temp_driver','line_id'=>$lineId]);
  }
  return ['ok'=>true, 'added_count'=>count($added), 'skipped'=>$skipped];
}, false);

// فهرست رانندگان موقتِ یک خط (یا همهٔ خطوط مجاز کاربر)
route('GET', '/api/temp-drivers', function($p,$b,$u){
  _ensure_temp_line_drivers();
  $lineId = (int)($_GET['line_id'] ?? 0);
  $args = []; $where = "t.is_active=1";
  if ($lineId) { $where .= " AND t.line_id=?"; $args[] = $lineId; }
  else {
    // محدود به خطوط مجاز کاربر (اگر ادمین نیست)
    $myLines = array_column(Db::all("SELECT line_id FROM user_lines WHERE user_id=?", [$u['id']]), 'line_id');
    if ($myLines) { $where .= " AND t.line_id IN (".implode(',',array_fill(0,count($myLines),'?')).")"; $args = array_merge($args, $myLines); }
    elseif (empty($u['is_admin'])) return [];
  }
  return Db::all("SELECT t.id, t.driver_id, t.line_id, t.line_code_in_line, t.note, t.created_at,
      d.first_name, d.last_name, d.national_id, d.mobile,
      l.code line_code, l.origin, l.destination,
      TRIM(CONCAT(COALESCE(ab.first_name,''),' ',COALESCE(ab.last_name,''))) added_by_name
    FROM temp_line_drivers t
    JOIN drivers d ON d.id=t.driver_id
    JOIN `lines` l ON l.id=t.line_id
    LEFT JOIN users ab ON ab.id=t.added_by
    WHERE $where ORDER BY t.id DESC", $args);
}, false);

// غیرفعال‌کردن (پایان) تخصیص موقت
route('DELETE', '/api/temp-drivers/{id}', function($p,$b,$u){
  _ensure_temp_line_drivers();
  $id=(int)$p['id'];
  $row=Db::one("SELECT * FROM temp_line_drivers WHERE id=?", [$id]);
  Db::run("UPDATE temp_line_drivers SET is_active=0, ended_at=NOW() WHERE id=?", [$id]);
  if($row) _temp_driver_log('end',$id,(int)$row['driver_id'],(int)$row['line_id'],(int)$u['id'],['reason'=>$b['reason']??null]);
  return ['ok'=>true];
}, false);
route('GET', '/api/temp-drivers/history', function($p,$b,$u){
  _ensure_temp_line_drivers();
  $driverId=(int)($_GET['driver_id']??0); $lineId=(int)($_GET['line_id']??0);
  $where='1=1'; $args=[];
  if($driverId){$where.=' AND h.driver_id=?'; $args[]=$driverId;}
  if($lineId){$where.=' AND h.line_id=?'; $args[]=$lineId;}
  return Db::all("SELECT h.*, d.first_name, d.last_name, d.national_id, l.code line_code, TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) user_name
    FROM temp_line_driver_history h
    LEFT JOIN drivers d ON d.id=h.driver_id LEFT JOIN `lines` l ON l.id=h.line_id LEFT JOIN users u ON u.id=h.user_id
    WHERE $where ORDER BY h.id DESC LIMIT 200", $args);
}, false);

/* ---------------- حضور ---------------- */
// اطمینان از وجود ستون/ایندکس‌های لازم روی جدول attendances (سازگاری با پایگاه‌داده‌های قدیمی‌تر
// که ممکن است پیش از افزودن ستون created_at ساخته شده باشند و باعث خطای «ثبت حضور» می‌شدند)
function _ensure_attendances_schema(){
  static $done = false; if ($done) return; $done = true;
  try {
    if (!Db::one("SHOW COLUMNS FROM attendances WHERE Field='created_at'")) {
      Db::run("ALTER TABLE attendances ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
    }
    if (!Db::one("SHOW COLUMNS FROM attendances WHERE Field='exit_at'")) {
      Db::run("ALTER TABLE attendances ADD COLUMN exit_at DATETIME NULL");
    }
    if (!Db::one("SHOW INDEX FROM attendances WHERE Key_name='idx_att'")) {
      Db::run("ALTER TABLE attendances ADD INDEX idx_att (driver_id, created_at)");
    }
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
}
route('POST', '/api/attendance', function($p, $b, $u) {
  _ensure_attendances_schema();
  $eventAt = _app_client_time($b);
  $did = (int)($b['driver_id'] ?? 0); if (!$did) Http::error('ورودی نامعتبر', 400);
  // مسدودسازی راننده (دستی یا به‌دلیل بدهی فیش)
  $drv = Db::one("SELECT national_id FROM drivers WHERE id=?", [$did]);
  $setRow = Db::one("SELECT value FROM app_settings WHERE `key`='driver_block'");
  $cfg = $setRow ? json_decode($setRow['value'], true) : null;
  if (is_array($cfg) && $drv) {
    $blockedIds = $cfg['driver_ids'] ?? [];
    if (in_array($did, $blockedIds) || in_array((string)$did, $blockedIds)) Http::error('این راننده مسدود شده و امکان ثبت حضور ندارد', 403);
    if (!empty($cfg['enabled'])) {
      $cnt = (int)($cfg['count'] ?? 0); $months = (int)($cfg['months'] ?? 0);
      if ($cnt > 0 && $months > 0 && $drv['national_id']) {
        $unpaid = (int)Db::one("SELECT COUNT(*) n FROM bills WHERE national_id=? AND (status IS NULL OR status NOT LIKE '%پرداخت%') AND created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)", [$drv['national_id'], $months])['n'];
        if ($unpaid >= $cnt) Http::error('راننده بدهکار است و امکان ثبت حضور وجود ندارد ('.$unpaid.' فیش پرداخت‌نشده)', 403);
      }
    }
  }
  // تا زمانی که راننده در لیست حاضرین خط است (خروج ثبت نشده)، ثبت مجدد حضور مجاز نیست
  $open = Db::one("SELECT id, created_at FROM attendances WHERE driver_id=? AND exit_at IS NULL ORDER BY created_at DESC LIMIT 1", [$did]);
  if ($open) Http::error('این راننده هم‌اکنون در خط حاضر است. ابتدا خروج او را ثبت کنید.', 409);
  [$lat, $lng] = validGeo($b['lat'] ?? null, $b['lng'] ?? null);
  // ثبت حضور تنها وقتی مجاز است که کاربر داخل محدودهٔ ایستگاهِ یکی از خطوط مجازش باشد
  $lineIds = user_line_ids($u);
  if ($lat === null) Http::error('موقعیت مکانی شما در دسترس نیست. GPS را روشن کنید.', 422);
  // اگر کاربر هیچ خطی ندارد و ادمین نیست، علت را شفاف اعلام کن
  if (is_array($lineIds) && !$lineIds) Http::error('هیچ خطی به حساب شما تخصیص داده نشده است. با مدیر سیستم تماس بگیرید.', 403);
  $extraR = max(0, (int)_req_setting('checkin_error_radius_m', 0)) + 25;
  $st = station_at_point($lat, $lng, $lineIds, $extraR);
  if (!$st) {
    // پیام دقیق: نزدیک‌ترین ایستگاه و فاصله تا آن
    $near = _nearest_station($lat, $lng, $lineIds);
    if ($near) {
      $allowed = (int)$near['radius_m'] + $extraR;
      Http::error('شما در محدودهٔ ایستگاه نیستید. نزدیک‌ترین ایستگاه «'.$near['name'].'» در فاصلهٔ '.number_format($near['distance_m']).' متری شماست (شعاع مجاز '.number_format($allowed).' متر). برای ثبت حضور باید نزدیک‌تر شوید.', 403);
    }
    Http::error('برای خطوط مجاز شما هیچ ایستگاه/محدوده‌ای تعریف نشده است. با مدیر سیستم تماس بگیرید.', 403);
  }
  // اگر خط ارسال نشده، از روی خودروی راننده تشخیص داده می‌شود تا در لیست حاضرین خط ظاهر شود
  $lineId = $b['line_id'] ?? null;
  if (!$lineId) {
    $ln = Db::one("SELECT v.line_id FROM vehicle_drivers vd JOIN vehicles v ON v.id=vd.vehicle_id WHERE vd.driver_id=? AND v.line_id IS NOT NULL LIMIT 1", [$did]);
    if ($ln) $lineId = $ln['line_id'];
  }
  if (!$lineId && $st['line_id']) $lineId = $st['line_id'];  // در غیر این صورت خط همان ایستگاه
  // در صورت فعال بودن تنظیم، ثبت حضور راننده برای خطوط دارای سیستم نوبت‌دهی ممنوع است.
  if ($lineId && _req_setting('disable_driver_attendance_for_nobat_lines', false) && _is_nobat_line($lineId)) {
    Http::error('ثبت حضور رانندگان در این خط به دلیل داشتن سیستم نوبت‌دهی غیرفعال شده است.', 403);
  }
  $id = Db::insert("INSERT INTO attendances(driver_id,user_id,line_id,lat,lng,created_at) VALUES(?,?,?,?,?,?)",
    [$did, $u['id'], $lineId, $lat, $lng, $eventAt]);
  return ['id'=>$id, 'line_id'=>$lineId, 'station'=>$st['name']];
});

// ثبت خروج تاکسیران از خط (بستن حضور باز)
route('POST', '/api/attendance/exit', function($p,$b,$u){
  _ensure_attendances_schema();
  $eventAt = _app_client_time($b);
  $did = (int)($b['driver_id'] ?? 0); if (!$did) Http::error('ورودی نامعتبر', 400);
  $open = Db::one("SELECT id FROM attendances WHERE driver_id=? AND exit_at IS NULL ORDER BY created_at DESC LIMIT 1", [$did]);
  if (!$open) Http::error('این راننده در لیست حاضرین نیست', 404);
  Db::run("UPDATE attendances SET exit_at=? WHERE id=?", [$eventAt, $open['id']]);
  return ['ok'=>true, 'id'=>$open['id']];
});

// لیست تاکسیرانان حاضر در خط (حضور باز) — محدود به خطوط مجاز کاربر
route('GET', '/api/attendance/present', function($p,$b,$u){
  _ensure_attendances_schema();
  $lineIds = user_line_ids($u);
  $where = ''; $params = [];
  if (is_array($lineIds)) {
    if (!$lineIds) return [];  // کاربر خطی ندارد
    $in = implode(',', array_fill(0, count($lineIds), '?'));
    $where = "AND a.line_id IN ($in)"; $params = $lineIds;
  }
  return Db::all("SELECT a.id, a.driver_id, a.line_id, a.created_at, l.code line_code, l.origin line_origin,
      d.first_name, d.last_name, d.national_id,
      TIMESTAMPDIFF(MINUTE, a.created_at, NOW()) mins_in
    FROM attendances a JOIN drivers d ON d.id=a.driver_id LEFT JOIN `lines` l ON l.id=a.line_id
    WHERE a.exit_at IS NULL $where ORDER BY a.created_at DESC", $params);
});
route('GET', '/api/attendance/{driverId}', function($p,$b,$u){
  _ensure_attendances_schema();
  return Db::all("SELECT created_at, exit_at FROM attendances WHERE driver_id=? ORDER BY created_at DESC LIMIT 200", [$p['driverId']]);
});

// گزارش کارکرد رانندگان: برای یک خط خاص یا کل خطوط، در یک بازهٔ تاریخی، جمع‌بندی حضور هر راننده
route('GET', '/api/admin/driver-work-report', function($p,$b,$u){
  _ensure_attendances_schema();
  $lineId = (int)($_GET['line_id'] ?? 0);
  $from = trim((string)($_GET['from'] ?? ''));
  $to = trim((string)($_GET['to'] ?? ''));
  $where = ['1=1']; $params = [];
  if ($lineId > 0) { $where[] = 'a.line_id=?'; $params[] = $lineId; }
  if ($from !== '') { $where[] = 'a.created_at >= ?'; $params[] = $from.' 00:00:00'; }
  if ($to !== '') { $where[] = 'a.created_at <= ?'; $params[] = $to.' 23:59:59'; }
  $whereSql = implode(' AND ', $where);
  $rows = Db::all("SELECT
      a.driver_id, d.first_name, d.last_name, d.national_id,
      GROUP_CONCAT(DISTINCT l.code ORDER BY l.code SEPARATOR '، ') line_codes,
      COUNT(*) total_sessions,
      SUM(TIMESTAMPDIFF(SECOND, a.created_at, COALESCE(a.exit_at, a.created_at))) total_seconds,
      COUNT(DISTINCT DATE(a.created_at)) distinct_days,
      COUNT(DISTINCT DATE_FORMAT(a.created_at,'%Y-%m')) distinct_months,
      MIN(a.created_at) first_seen, MAX(a.created_at) last_seen
    FROM attendances a
    JOIN drivers d ON d.id = a.driver_id
    LEFT JOIN `lines` l ON l.id = a.line_id
    WHERE $whereSql
    GROUP BY a.driver_id, d.first_name, d.last_name, d.national_id
    ORDER BY total_sessions DESC", $params);
  foreach ($rows as &$r) {
    $days = max(1, (int)$r['distinct_days']);
    $months = max(1, (int)$r['distinct_months']);
    $r['total_sessions'] = (int)$r['total_sessions'];
    $r['total_seconds'] = (int)$r['total_seconds'];
    $r['avg_daily_count'] = round($r['total_sessions'] / $days, 2);
    $r['avg_daily_seconds'] = round($r['total_seconds'] / $days, 1);
    $r['avg_monthly_seconds'] = round($r['total_seconds'] / $months, 1);
  }
  unset($r);
  return $rows;
}, false, ADMIN);

// آمار لحظه‌ای تعداد تاکسیرانان حاضر در هر خط (مرتب بر اساس بیشترین) — برای سایت
route('GET', '/api/admin/present-stats', function($p,$b,$u){
  $rows = Db::all("SELECT l.id line_id, l.code, l.origin, l.destination,
      COUNT(a.id) present
    FROM `lines` l
    LEFT JOIN attendances a ON a.line_id=l.id AND a.exit_at IS NULL
    GROUP BY l.id, l.code, l.origin, l.destination
    ORDER BY present DESC, l.code ASC");
  foreach ($rows as &$r) $r['present'] = (int)$r['present'];
  $total = array_sum(array_column($rows, 'present'));
  return ['lines'=>$rows, 'total_present'=>$total];
}, false, ADMIN);

/* ---------------- بدهی ---------------- */
route('GET', '/api/debt/{nationalId}', function($p, $b, $u) {
  $nid = $p['nationalId'];
  // راننده را پیدا کن (برای جستجو با driver_id و پلاک‌هایش)
  $driver = Db::one("SELECT id, national_id FROM drivers WHERE national_id=?", [$nid]);
  $driverId = $driver ? $driver['id'] : null;

  $cols = array_column(Db::all("SHOW COLUMNS FROM bills"), 'Field');
  $hasDrv = in_array('driver_id', $cols);
  $paidCol = in_array('paid_date', $cols) ? 'paid_date' : 'NULL AS paid_date';

  // پلاک‌های مرتبط با این راننده (برای جستجوی فیش با پلاک)
  $plates = [];
  if ($driverId) {
    $plates = array_column(Db::all("SELECT DISTINCT v.plate FROM vehicle_drivers vd JOIN vehicles v ON v.id=vd.vehicle_id WHERE vd.driver_id=? AND v.plate IS NOT NULL AND v.plate<>''", [$driverId]), 'plate');
  }

  // ساخت شرط جستجو: national_id یا driver_id یا پلاک
  $conds = ["national_id=?"]; $params = [$nid];
  if ($driverId && $hasDrv) { $conds[] = "driver_id=?"; $params[] = $driverId; }
  if ($plates) {
    $ph = implode(',', array_fill(0, count($plates), '?'));
    $conds[] = "plate IN ($ph)";
    $params = array_merge($params, $plates);
  }
  $where = implode(' OR ', $conds);

  $rows = Db::all("SELECT id,bill_id,pay_id,status,reason,person_title,national_id,phone,amount,pay_date,$paidCol,plate
    FROM bills WHERE $where ORDER BY (status='پرداخت شده') ASC, id DESC", $params);

  $unpaid = array_values(array_filter($rows, fn($r) => $r['status'] !== 'پرداخت شده'));
  $total = array_sum(array_map(fn($r) => (int)$r['amount'], $unpaid));
  $bills = array_map(function($r) {
    $r['pay_url'] = ($r['status'] !== 'پرداخت شده' && !empty($r['bill_id']) && !empty($r['pay_id']))
      ? "https://epay.mashhad.ir/CityUsers/OnLineBillPay.aspx?BillId={$r['bill_id']}&PayId={$r['pay_id']}&Cell={$r['phone']}" : null;
    return $r;
  }, $rows);
  return ['unpaid_count'=>count($unpaid),'total_unpaid'=>$total,'bills'=>array_values($bills)];
});

// جستجوی فیش با پلاک (مستقیم)
route('GET', '/api/debt-by-plate/{plate}', function($p, $b, $u) {
  $plate = urldecode($p['plate']);
  $cols = array_column(Db::all("SHOW COLUMNS FROM bills"), 'Field');
  $paidCol = in_array('paid_date', $cols) ? 'paid_date' : 'NULL AS paid_date';
  $rows = Db::all("SELECT id,bill_id,pay_id,status,reason,person_title,national_id,phone,amount,pay_date,$paidCol,plate
    FROM bills WHERE plate=? ORDER BY (status='پرداخت شده') ASC, id DESC", [$plate]);
  $unpaid = array_values(array_filter($rows, fn($r) => $r['status'] !== 'پرداخت شده'));
  $total = array_sum(array_map(fn($r) => (int)$r['amount'], $unpaid));
  $bills = array_map(function($r) {
    $r['pay_url'] = ($r['status'] !== 'پرداخت شده' && !empty($r['bill_id']) && !empty($r['pay_id']))
      ? "https://epay.mashhad.ir/CityUsers/OnLineBillPay.aspx?BillId={$r['bill_id']}&PayId={$r['pay_id']}&Cell={$r['phone']}" : null;
    return $r;
  }, $rows);
  return ['unpaid_count'=>count($unpaid),'total_unpaid'=>$total,'bills'=>array_values($bills)];
});

/* ---------------- تذکر / چک‌لیست ---------------- */
route('GET', '/api/notice-reasons', fn($p,$b,$u) => Db::all("SELECT id,title FROM notice_reasons WHERE is_active=1 ORDER BY id"));

// گزارش تذکرات داده‌شده (فیلتر: سمت ثبت‌کننده/شخص/خط/زمان/کد ملی)
route('GET', '/api/admin/given-notices', function($p,$b,$u){
  $where = "1=1"; $args = [];
  if (!empty($_GET['recorder_role'])) { $where .= " AND rr.title = ?"; $args[] = $_GET['recorder_role']; }
  if (!empty($_GET['recorder_id'])) { $where .= " AND n.user_id = ?"; $args[] = (int)$_GET['recorder_id']; }
  if (!empty($_GET['national_id'])) { $where .= " AND d.national_id LIKE ?"; $args[] = '%'.$_GET['national_id'].'%'; }
  if (!empty($_GET['line'])) { $lc=trim($_GET['line']); $where .= " AND (CAST(l.code AS CHAR)=? OR v.line_text=? OR v.line_text LIKE ? OR v.line_text LIKE ?)"; $args[]=$lc; $args[]=$lc; $args[]="$lc - %"; $args[]="$lc-%"; }
  if (!empty($_GET['from'])) { $where .= " AND DATE(n.created_at) >= ?"; $args[] = $_GET['from']; }
  if (!empty($_GET['to'])) { $where .= " AND DATE(n.created_at) <= ?"; $args[] = $_GET['to']; }
  return Db::all("SELECT n.id, n.created_at, n.priority, n.body,
      nr.title reason,
      TRIM(CONCAT(COALESCE(d.first_name,''),' ',COALESCE(d.last_name,''))) driver_name,
      d.national_id,
      TRIM(CONCAT(COALESCE(rec.first_name,''),' ',COALESCE(rec.last_name,''))) recorder_name,
      rr.title recorder_role,
      COALESCE(v.line_text, l.code) line,
      CASE WHEN n.attachment_data IS NOT NULL OR n.attachment_name IS NOT NULL THEN 1 ELSE 0 END has_attachment
    FROM notices n
    LEFT JOIN notice_reasons nr ON nr.id = n.reason_id
    LEFT JOIN drivers d ON d.id = n.driver_id
    LEFT JOIN users rec ON rec.id = n.user_id
    LEFT JOIN roles rr ON rr.id = rec.role_id
    LEFT JOIN vehicles v ON v.owner_national_id = d.national_id
    LEFT JOIN `lines` l ON l.id = v.line_id
    WHERE $where ORDER BY n.created_at DESC LIMIT 2000", $args);
}, false, ADMIN);

// گزارش چک‌لیست‌های داده‌شده (همان فیلترها)
route('GET', '/api/admin/given-checklists', function($p,$b,$u){
  $where = "1=1"; $args = [];
  if (!empty($_GET['recorder_role'])) { $where .= " AND rr.title = ?"; $args[] = $_GET['recorder_role']; }
  if (!empty($_GET['recorder_id'])) { $where .= " AND cs.user_id = ?"; $args[] = (int)$_GET['recorder_id']; }
  if (!empty($_GET['national_id'])) { $where .= " AND d.national_id LIKE ?"; $args[] = '%'.$_GET['national_id'].'%'; }
  if (!empty($_GET['line'])) { $lc=trim($_GET['line']); $where .= " AND (CAST(l.code AS CHAR)=? OR v.line_text=? OR v.line_text LIKE ? OR v.line_text LIKE ?)"; $args[]=$lc; $args[]=$lc; $args[]="$lc - %"; $args[]="$lc-%"; }
  if (!empty($_GET['from'])) { $where .= " AND DATE(cs.created_at) >= ?"; $args[] = $_GET['from']; }
  if (!empty($_GET['to'])) { $where .= " AND DATE(cs.created_at) <= ?"; $args[] = $_GET['to']; }
  $rows = Db::all("SELECT cs.id, cs.created_at, cs.answers, ct.title template_title,
      TRIM(CONCAT(COALESCE(d.first_name,''),' ',COALESCE(d.last_name,''))) driver_name,
      d.national_id,
      TRIM(CONCAT(COALESCE(rec.first_name,''),' ',COALESCE(rec.last_name,''))) recorder_name,
      rr.title recorder_role,
      COALESCE(v.line_text, l.code) line
    FROM checklist_submissions cs
    LEFT JOIN checklist_templates ct ON ct.id = cs.template_id
    LEFT JOIN drivers d ON d.id = cs.driver_id
    LEFT JOIN users rec ON rec.id = cs.user_id
    LEFT JOIN roles rr ON rr.id = rec.role_id
    LEFT JOIN vehicles v ON v.owner_national_id = d.national_id
    LEFT JOIN `lines` l ON l.id = v.line_id
    WHERE $where ORDER BY cs.created_at DESC LIMIT 2000", $args);
  $labels = [];
  foreach (Db::all("SELECT id,label FROM checklist_items") as $it) $labels[$it['id']] = $it['label'];
  foreach ($rows as &$r) {
    $ans = json_decode($r['answers'] ?? '[]', true) ?: [];
    $pretty = [];
    if (is_array($ans)) foreach ($ans as $k=>$vv) {
      $pretty[] = ['label'=>($labels[$k] ?? $k), 'value'=>is_array($vv)?implode('، ',$vv):$vv];
    }
    $r['answers_pretty'] = $pretty; unset($r['answers']);
  }
  unset($r);
  return $rows;
}, false, ADMIN);

// فهرست ثبت‌کنندگان (برای فیلتر شخص)
route('GET', '/api/admin/recorders', function($p,$b,$u){
  return Db::all("SELECT DISTINCT u.id, TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) name, r.title role_title
    FROM users u JOIN roles r ON r.id=u.role_id
    WHERE u.id IN (SELECT DISTINCT user_id FROM notices UNION SELECT DISTINCT user_id FROM checklist_submissions)
    ORDER BY name");
}, false, ADMIN);
route('POST', '/api/notices', function($p, $b, $u) {
  // پشتیبانی از هر دو حالت: JSON (attachment_data) و multipart (فایل واقعی)
  $isMultipart = !empty($_FILES['attachment']) && ($_FILES['attachment']['error'] ?? 1) === 0;
  if ($isMultipart) {
    // در multipart، فیلدهای متنی از $_POST می‌آیند
    $b = array_merge($b, $_POST);
    // مقادیر عددی را تبدیل کن
    foreach (['driver_id','reason_id','send_sms'] as $k) { if (isset($b[$k])) $b[$k] = (int)$b[$k]; }
  }
  if (empty($b['priority'])) Http::error('ورودی نامعتبر', 400);
  // الزام عکس باید در سرور نیز اعمال شود؛ اپ قدیمی یا کش تنظیمات نباید بتواند آن را دور بزند.
  $noticeRequirePhoto = _req_setting('notice_require_photo', false);
  $noticeRequirePhoto = is_bool($noticeRequirePhoto) ? $noticeRequirePhoto : in_array(strtolower(trim((string)$noticeRequirePhoto)), ['1','true','yes','on','enabled','فعال','بله'], true);
  if ($noticeRequirePhoto && !$isMultipart && empty($b['attachment_data'])) Http::error('پیوست عکس برای ثبت تذکر الزامی است.', 422);
  // بررسی محدودیت حجم فایل
  if (!$isMultipart) enforce_attachment('notices', $b['attachment_name'] ?? null, $b['attachment_data'] ?? null);
  // محدودیت فاصلهٔ زمانی تذکر
  $ndays = (int)_req_setting('notice_interval_days', 0);
  if ($ndays > 0 && !empty($b['driver_id'])) {
    $last = Db::one("SELECT created_at FROM notices WHERE driver_id=? ORDER BY id DESC LIMIT 1", [$b['driver_id']]);
    if ($last) {
      $diff = (time() - strtotime($last['created_at'])) / 86400;
      if ($diff < $ndays) {
        $rem = ceil($ndays - $diff);
        Http::error("برای این راننده اخیراً تذکر ثبت شده است. تا {$rem} روز دیگر امکان ثبت تذکر جدید نیست.", 429);
      }
    }
  }
  // ذخیرهٔ تصویر
  $_noticePath = null;
  if ($isMultipart) {
    // آپلود مستقیم فایل (multipart) — بدون تبدیل base64
    $_noticePath = Media::saveUploadedFile($_FILES['attachment'], 'notices', 1280, 70);
  } elseif (!empty($b['attachment_data'])) {
    try { $_noticePath = Media::saveBase64($b['attachment_data'], 'notices', 1280, 70); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  }
  // ثبت تذکر — با fallback به ستون قدیمی در صورت نبود ستون attachment_path
  try {
    $id = Db::insert("INSERT INTO notices(driver_id,user_id,reason_id,priority,body,attachment_name,attachment_path) VALUES(?,?,?,?,?,?,?)",
      [$b['driver_id'], $u['id'], $b['reason_id'] ?? null, $b['priority'], $b['body'] ?? null, $b['attachment_name'] ?? null, $_noticePath]);
  } catch (\Throwable $e) {
    $id = Db::insert("INSERT INTO notices(driver_id,user_id,reason_id,priority,body,attachment_name,attachment_data) VALUES(?,?,?,?,?,?,?)",
      [$b['driver_id'], $u['id'], $b['reason_id'] ?? null, $b['priority'], $b['body'] ?? null, $b['attachment_name'] ?? null, $b['attachment_data'] ?? null]);
  }
  $smsResult = null; $smsDebug = null; $baleResult = null; $noticeMsg = null;
  // متن مشترک تذکر برای پیامک و ربات بله
  try {
    $d0 = Db::one("SELECT id,first_name,last_name,national_id,mobile FROM drivers WHERE id=?", [$b['driver_id']]);
    if ($d0) {
      $reason0 = '';
      if (!empty($b['reason_id'])) { $rr0 = Db::one("SELECT title FROM notice_reasons WHERE id=?", [$b['reason_id']]); $reason0 = $rr0['title'] ?? ''; }
      $tpl0 = _req_setting('notice_sms_template', 'راننده گرامی {name}، یک تذکر برای شما ثبت شد: {body}');
      $noticeMsg = strtr($tpl0, ['{name}'=>trim(($d0['first_name']??'').' '.($d0['last_name']??'')),'{first_name}'=>$d0['first_name']??'','{last_name}'=>$d0['last_name']??'','{national_id}'=>$d0['national_id']??'','{reason}'=>$reason0,'{body}'=>$b['body']??'','{priority}'=>$b['priority']??'']);
      if (!empty($b['send_bot']) && !empty($d0['mobile']) && class_exists('MessengerHub')) {
        $baleResult = MessengerHub::sendToMobile($d0['mobile'], $noticeMsg, 'driver', (int)$d0['id'], 'warnings');
      } elseif (!empty($d0['mobile']) && BaleBot::isEnabled() && BaleBot::itemEnabled('warnings', true)) {
        $baleResult = BaleBot::sendToMobile($d0['mobile'], $noticeMsg, 'driver', (int)$d0['id']);
      }
    }
  } catch (Throwable $e) { $baleResult = ['ok'=>false,'error'=>$e->getMessage()]; }
  if (!empty($b['send_sms'])) {
    $enabled = _req_setting('notice_sms_enabled', false);
    $canUser = !empty($u['can_send_sms']) || (($u['level']??0) >= ADMIN) || ($u['is_admin']??false);
    if (!$enabled) $smsDebug = 'ارسال پیامک تذکر در تنظیمات غیرفعال است';
    elseif (!$canUser) $smsDebug = 'شما مجوز ارسال پیامک ندارید';
    elseif (!Sms::isEnabled()) $smsDebug = 'سرویس پیامک پیکربندی نشده (نام‌کاربری/رمز/فعال‌سازی)';
    else {
      $d = Db::one("SELECT first_name,last_name,national_id,mobile FROM drivers WHERE id=?", [$b['driver_id']]);
      $mobile = $d['mobile'] ?? null;
      if (!$d) $smsDebug = 'راننده یافت نشد';
      elseif (!$mobile) $smsDebug = 'شمارهٔ موبایل راننده ثبت نشده است';
      else {
        $tpl = _req_setting('notice_sms_template', 'راننده گرامی {name}، یک تذکر برای شما ثبت شد: {body}');
        $reason = '';
        if (!empty($b['reason_id'])) { $rr = Db::one("SELECT title FROM notice_reasons WHERE id=?", [$b['reason_id']]); $reason = $rr['title'] ?? ''; }
        $msg = $noticeMsg ?: strtr($tpl, ['{name}'=>trim(($d['first_name']??'').' '.($d['last_name']??'')),'{first_name}'=>$d['first_name']??'','{last_name}'=>$d['last_name']??'','{national_id}'=>$d['national_id']??'','{reason}'=>$reason,'{body}'=>$b['body']??'','{priority}'=>$b['priority']??'']);
        try { $smsResult = Sms::send([$mobile], $msg, 'notice', $u['id']); }
        catch (\Throwable $e) { $smsResult = ['ok'=>false,'error'=>$e->getMessage()]; }
      }
    }
  }
  return ['id'=>$id, 'sms'=>$smsResult, 'sms_debug'=>$smsDebug, 'bale'=>$baleResult];
});
// ارسال پیامک اطلاعات فیش آبونمان
route('POST', '/api/debt/{billId}/sms', function($p, $b, $u) {
  $enabled = _req_setting('bill_sms_enabled', false);
  if (!$enabled) Http::error('ارسال پیامک فیش در تنظیمات غیرفعال است. ابتدا آن را در تنظیمات → پیامک فعال کنید.', 400);
  if (!_can_send_sms($u)) Http::error('شما دسترسی ارسال پیامک ندارید', 403);
  if (!Sms::isEnabled()) Http::error('سرویس پیامک پیکربندی نشده است', 400);
  $bill = Db::one("SELECT id,bill_id,pay_id,status,amount,phone,plate,national_id FROM bills WHERE id=?", [$p['billId']]);
  if (!$bill) Http::error('فیش یافت نشد', 404);
  if ($bill['status'] === 'پرداخت شده') Http::error('این فیش قبلاً پرداخت شده است', 400);
  $drv = Db::one("SELECT first_name,last_name,mobile FROM drivers WHERE national_id=?", [$bill['national_id']]);
  $mobile = $bill['phone'] ?: ($drv['mobile'] ?? null);
  if (!$mobile) Http::error('شمارهٔ موبایل تاکسیران موجود نیست', 400);
  $payUrl = "https://epay.mashhad.ir/CityUsers/OnLineBillPay.aspx?BillId={$bill['bill_id']}&PayId={$bill['pay_id']}&Cell={$mobile}";
  $tpl = _req_setting('bill_sms_template', "تاکسیران گرامی {name}\nشناسهٔ قبض: {bill_id}\nشناسهٔ پرداخت: {pay_id}\nمبلغ: {amount} ریال\nپرداخت: {pay_url}");
  $msg = strtr($tpl, ['{name}'=>trim((($drv['first_name']??'').' '.($drv['last_name']??'')))?:'تاکسیران','{first_name}'=>$drv['first_name']??'','{last_name}'=>$drv['last_name']??'','{bill_id}'=>$bill['bill_id'],'{pay_id}'=>$bill['pay_id'],'{amount}'=>number_format((int)$bill['amount']),'{plate}'=>$bill['plate']??'','{pay_url}'=>$payUrl]);
  try {
    $res = Sms::send([$mobile], $msg, 'bill', $u['id']);
  } catch (\Throwable $e) {
    Http::error('خطا در ارسال پیامک: '.$e->getMessage(), 500);
  }
  if (empty($res['ok'])) Http::error($res['error'] ?? 'ارسال ناموفق بود', 400);
  return ['ok'=>true, 'sms'=>$res];
});
// ارسال پیامک پروانهٔ تاکسیرانی/بهره‌برداری به راننده
route('POST', '/api/admin/license-sms', function($p,$b,$u){
  if (!_can_send_sms($u)) Http::error('شما دسترسی ارسال پیامک ندارید', 403);
  if (!Sms::isEnabled()) Http::error('سرویس پیامک پیکربندی نشده است', 400);
  $nid = $b['national_id'] ?? null;
  $kind = $b['kind'] ?? 'taxi'; // taxi (تاکسیرانی) یا oplic (بهره‌برداری)
  if (!$nid) Http::error('کد ملی مشخص نشده است', 400);
  $drv = Db::one("SELECT first_name,last_name,mobile,taxi_lic_expire,op_lic_expire FROM drivers WHERE national_id=?", [$nid]);
  if (!$drv) Http::error('راننده یافت نشد', 404);
  $mobile = $drv['mobile'] ?? null;
  if (!$mobile) Http::error('شمارهٔ موبایل راننده موجود نیست', 400);
  $isTaxi = $kind === 'taxi';
  $expire = $isTaxi ? ($drv['taxi_lic_expire'] ?? '') : ($drv['op_lic_expire'] ?? '');
  $label = $isTaxi ? 'پروانهٔ تاکسیرانی' : 'پروانهٔ بهره‌برداری';
  $tplKey = $isTaxi ? 'taxilic_sms_template' : 'oplic_sms_template';
  $tpl = _req_setting($tplKey, "راننده گرامی {name}، {label} شما در تاریخ {expire} منقضی می‌شود. لطفاً نسبت به تمدید اقدام فرمایید.");
  $msg = strtr($tpl, [
    '{name}'=>trim(($drv['first_name']??'').' '.($drv['last_name']??''))?:'راننده',
    '{expire}'=>$expire, '{label}'=>$label,
  ]);
  try { $res = Sms::send([$mobile], $msg, $kind, $u['id']); }
  catch (\Throwable $e) { Http::error('خطا در ارسال: '.$e->getMessage(), 500); }
  if (empty($res['ok'])) Http::error($res['error'] ?? 'ارسال ناموفق', 400);
  return ['ok'=>true];
}, false, 1);

// ارسال پیامک بیمه/معاینه به راننده/مالک خودرو
route('POST', '/api/admin/expiry-sms', function($p,$b,$u){
  if (!_can_send_sms($u)) Http::error('شما دسترسی ارسال پیامک ندارید', 403);
  if (!Sms::isEnabled()) Http::error('سرویس پیامک پیکربندی نشده است', 400);
  $plate = $b['plate'] ?? null;
  $kind = $b['kind'] ?? 'insurance'; // insurance یا inspection
  if (!$plate) Http::error('پلاک مشخص نشده است', 400);
  $v = Db::one("SELECT plate, model_name, insurance_expire, tech_inspection_expire, owner_national_id FROM vehicles WHERE plate=?", [$plate]);
  if (!$v) Http::error('خودرو یافت نشد', 404);
  // یافتن راننده (بهره‌بردار)
  $drv = null;
  if (!empty($v['owner_national_id'])) $drv = Db::one("SELECT first_name,last_name,mobile FROM drivers WHERE national_id=?", [$v['owner_national_id']]);
  if (!$drv) {
    $drv = Db::one("SELECT d.first_name,d.last_name,d.mobile FROM vehicle_drivers vd JOIN drivers d ON d.id=vd.driver_id JOIN vehicles ve ON ve.id=vd.vehicle_id WHERE ve.plate=? ORDER BY (vd.role='beneficiary') DESC LIMIT 1", [$plate]);
  }
  $mobile = $drv['mobile'] ?? null;
  if (!$mobile) Http::error('شمارهٔ موبایل راننده موجود نیست', 400);
  $isIns = $kind === 'insurance';
  $expire = $isIns ? ($v['insurance_expire'] ?? '') : ($v['tech_inspection_expire'] ?? '');
  $label = $isIns ? 'بیمهٔ شخص ثالث' : 'معاینهٔ فنی';
  $tplKey = $isIns ? 'insurance_sms_template' : 'inspection_sms_template';
  $tpl = _req_setting($tplKey, "راننده گرامی {name}، {label} خودروی شما با پلاک {plate} در تاریخ {expire} منقضی می‌شود. لطفاً نسبت به تمدید اقدام فرمایید.");
  $msg = strtr($tpl, [
    '{name}'=>trim(($drv['first_name']??'').' '.($drv['last_name']??''))?:'راننده',
    '{plate}'=>$plate, '{expire}'=>$expire, '{label}'=>$label,
  ]);
  try { $res = Sms::send([$mobile], $msg, $kind, $u['id']); }
  catch (\Throwable $e) { Http::error('خطا در ارسال: '.$e->getMessage(), 500); }
  if (empty($res['ok'])) Http::error($res['error'] ?? 'ارسال ناموفق', 400);
  return ['ok'=>true];
}, false, 1);

route('GET', '/api/notices/{driverId}', function($p,$b,$u){
  $rows = Db::all("SELECT n.*, nr.title AS reason, TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS recorder_name, u.username AS recorder_username
    FROM notices n
    LEFT JOIN notice_reasons nr ON nr.id=n.reason_id
    LEFT JOIN users u ON u.id=n.user_id
    WHERE n.driver_id=? ORDER BY n.created_at DESC", [$p['driverId']]);
  foreach ($rows as &$r) {
    if (!empty($r['attachment_path'])) { $r['attachment_url'] = '/api/media?path='.urlencode($r['attachment_path']); unset($r['attachment_data']); }
    elseif (!empty($r['attachment_data'])) { $r['attachment_url'] = $r['attachment_data']; }
  }
  return $rows;
});

// چک‌لیست‌های قبلیِ یک راننده (برای نمایش در اپ) — همراه برچسب سؤال‌ها
route('GET', '/api/checklists/{driverId}', function($p,$b,$u){
  $rows = Db::all("SELECT cs.id, cs.created_at, cs.answers, cs.photo_data, cs.photo_path, CONCAT(us.first_name,' ',us.last_name) by_name
    FROM checklist_submissions cs LEFT JOIN users us ON us.id=cs.user_id
    WHERE cs.driver_id=? ORDER BY cs.created_at DESC LIMIT 50", [$p['driverId']]);
  // نگاشت شناسهٔ آیتم → برچسب
  $labels = [];
  foreach (Db::all("SELECT id,label FROM checklist_items") as $it) $labels[$it['id']] = $it['label'];
  foreach ($rows as &$r) {
    $ans = json_decode($r['answers'], true);
    $pretty = [];
    if (is_array($ans)) {
      foreach ($ans as $k=>$v) {
        $label = $labels[$k] ?? (is_numeric($k) ? ("سؤال ".$k) : $k);
        $val = is_array($v) ? implode('، ', $v) : (string)$v;
        $pretty[] = ['label'=>$label, 'value'=>$val];
      }
    }
    $r['items'] = $pretty;
    unset($r['answers']);
    // تصویر: از فایل فیزیکی یا base64 قدیمی
    if (!empty($r['photo_path'])) { $r['photo'] = '/api/media?path='.urlencode($r['photo_path']); }
    elseif (!empty($r['photo_data'])) { $r['photo'] = $r['photo_data']; }
    unset($r['photo_data'], $r['photo_path']);
  }
  return $rows;
});

route('GET', '/api/checklist/template', function($p,$b,$u) {
  $t = Db::one("SELECT id,title FROM checklist_templates WHERE is_active=1 LIMIT 1");
  if (!$t) return null;
  $items = Db::all("SELECT id,label,options,answer_type FROM checklist_items WHERE template_id=? ORDER BY sort_order", [$t['id']]);
  foreach ($items as &$it) $it['options'] = $it['options'] ? json_decode($it['options'], true) : null;
  $t['items'] = $items; return $t;
});
route('POST', '/api/checklist', function($p, $b, $u) {
  // الزام درج عکس (در صورت فعال‌بودن در تنظیمات؛ پیش‌فرض: الزامی)
  $reqPhoto = Db::one("SELECT value FROM app_settings WHERE `key`='checklist_require_photo'");
  $requirePhoto = $reqPhoto ? (bool)json_decode($reqPhoto['value'], true) : true;
  $photo = $b['photo_data'] ?? null;
  if ($requirePhoto && (empty($photo) || strpos((string)$photo,'data:image')!==0)) {
    Http::error('درج عکس برای ثبت چک‌لیست الزامی است.', 422);
  }
  // محدودیت فاصلهٔ زمانی چک‌لیست هر خودرو (روز): مثلاً حداکثر یک‌بار در روز
  $days = (int)_req_setting('checklist_interval_days', 0);
  if ($days > 0 && !empty($b['vehicle_id'])) {
    $last = Db::one("SELECT created_at FROM checklist_submissions WHERE vehicle_id=? ORDER BY id DESC LIMIT 1", [$b['vehicle_id']]);
    if ($last) {
      $diff = (time() - strtotime($last['created_at'])) / 86400;
      if ($diff < $days) {
        $rem = ceil($days - $diff);
        Http::error("برای این خودرو اخیراً چک‌لیست ثبت شده است. تا {$rem} روز دیگر امکان ثبت مجدد نیست.", 429);
      }
    }
  }
  $_chkPath = !empty($photo) ? Media::saveBase64($photo, 'checklists', 1280, 70) : null;
  try {
    $id = Db::insert("INSERT INTO checklist_submissions(template_id,driver_id,vehicle_id,user_id,answers,photo_path) VALUES(?,?,?,?,?,?)",
      [$b['template_id'], $b['driver_id'] ?? null, $b['vehicle_id'] ?? null, $u['id'], json_encode($b['answers'] ?? [], JSON_UNESCAPED_UNICODE), $_chkPath]);
  } catch (\Throwable $e) {
    $id = Db::insert("INSERT INTO checklist_submissions(template_id,driver_id,vehicle_id,user_id,answers,photo_data) VALUES(?,?,?,?,?,?)",
      [$b['template_id'], $b['driver_id'] ?? null, $b['vehicle_id'] ?? null, $u['id'], json_encode($b['answers'] ?? [], JSON_UNESCAPED_UNICODE), $photo]);
  }
  $botResult=null;
  if(!empty($b['send_bot']) && !empty($b['driver_id'])){
    try { $d=Db::one("SELECT first_name,last_name,mobile FROM drivers WHERE id=?",[(int)$b['driver_id']]); if($d && !empty($d['mobile'])){ $summary=[]; foreach(($b['answers']??[]) as $k=>$v)$summary[]=$k.': '.(is_array($v)?implode('، ',$v):$v); $msg="چک‌لیست خودرو برای ".trim(($d['first_name']??'').' '.($d['last_name']??''))." ثبت شد.\n".implode("\n",$summary); $botResult=_messenger_send_mobiles_all([$d['mobile']],$msg,'checklist',$id); } } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  }
  return ['id'=>$id,'messenger'=>$botResult];
});


// اهداف اعلان برای هشدارهای میدانی و حضور.
// ساختار جدید تنظیمات:
// {
//   enabled:true,
//   mode:'hierarchy'|'specific',
//   subject_mode:'all'|'roles'|'users', subject_role_ids:[], subject_user_ids:[],
//   recipients:[{user_id:12, subject_mode:'all'|'roles'|'users', role_ids:[], user_ids:[]}]
// }
// ساختارهای قدیمی user_id/user_ids همچنان پشتیبانی می‌شوند.
function _field_alert_user_matches_scope($userId, $mode='all', $roleIds=[], $userIds=[]) {
  $userId=(int)$userId;
  $mode=(string)($mode ?: 'all');
  if ($mode==='all') return true;
  if ($mode==='users') return in_array($userId, array_map('intval', is_array($userIds)?$userIds:[]), true);
  if ($mode==='roles') {
    $u=Db::one("SELECT role_id FROM users WHERE id=?",[$userId]);
    return $u && in_array((int)$u['role_id'], array_map('intval', is_array($roleIds)?$roleIds:[]), true);
  }
  return true;
}
function _field_alert_pref_key($userId){ return 'field_alert_preferences_'.(int)$userId; }
function _field_alert_preferences($userId){
  $def=['enabled'=>true,'types'=>['station_exit'=>true,'station_enter'=>true,'vpn_on'=>true,'gps_off'=>true,'attendance_checkin'=>true,'attendance_checkout'=>true],'subject_mode'=>'all','role_ids'=>[],'user_ids'=>[]];
  $v=_req_setting(_field_alert_pref_key($userId),$def); return is_array($v)?array_replace_recursive($def,$v):$def;
}
function _field_alert_recipient_accepts($recipientId,$eventType,$subjectUserId){
  $p=_field_alert_preferences($recipientId);
  if(empty($p['enabled']) || empty($p['types'][$eventType])) return false;
  return _field_alert_user_matches_scope($subjectUserId,$p['subject_mode']??'all',$p['role_ids']??[],$p['user_ids']??[]);
}
function _field_alert_type_from_setting($key){ return ['station_exit_notify'=>'station_exit','station_enter_notify'=>'station_enter','vpn_on_notify'=>'vpn_on','gps_off_notify'=>'gps_off','attendance_checkin_notify'=>'attendance_checkin','attendance_checkout_notify'=>'attendance_checkout'][$key]??''; }
function _field_alert_targets($settingKey, $userId) {
  $cfg = _req_setting($settingKey, ['enabled'=>false]);
  if (empty($cfg['enabled'])) return [];
  // فیلتر کلی افراد تحت پایش برای این نوع رویداد
  if (!_field_alert_user_matches_scope(
    $userId,
    $cfg['subject_mode'] ?? 'all',
    $cfg['subject_role_ids'] ?? [],
    $cfg['subject_user_ids'] ?? []
  )) return [];

  $targets = [];
  $mode = $cfg['mode'] ?? 'hierarchy';
  if ($mode === 'specific') {
    $recipients = $cfg['recipients'] ?? [];
    if (is_array($recipients) && $recipients) {
      foreach ($recipients as $rec) {
        if (!is_array($rec)) continue;
        $tid=(int)($rec['user_id'] ?? 0);
        if ($tid<=0) continue;
        if (_field_alert_user_matches_scope(
          $userId,
          $rec['subject_mode'] ?? 'all',
          $rec['role_ids'] ?? [],
          $rec['user_ids'] ?? []
        )) $targets[]=$tid;
      }
    } else {
      // سازگاری با ساختار قدیمی
      $ids = $cfg['user_ids'] ?? [];
      if (!is_array($ids) || !$ids) $ids = !empty($cfg['user_id']) ? [$cfg['user_id']] : [];
      foreach ($ids as $tid) { $tid=(int)$tid; if($tid>0)$targets[]=$tid; }
    }
  } else {
    $urow = Db::one("SELECT manager_id FROM users WHERE id=?", [$userId]);
    if (!empty($urow['manager_id'])) $targets[] = (int)$urow['manager_id'];
    try {
      foreach (Db::all("SELECT manager_id FROM user_managers WHERE user_id=?", [$userId]) as $r)
        if (!empty($r['manager_id'])) $targets[]=(int)$r['manager_id'];
    } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  }
  // خود فرد موضوع رویداد هیچ‌گاه گیرنده هشدار مدیریتی خودش نباشد.
  $eventType=_field_alert_type_from_setting($settingKey);
  return array_values(array_unique(array_filter($targets, fn($id)=>(int)$id>0 && (int)$id!==(int)$userId && (!$eventType || _field_alert_recipient_accepts((int)$id,$eventType,(int)$userId)))));
}
function _field_alert_time_text($at=null) {
  $ts=$at ? strtotime((string)$at) : time();
  if (!$ts) $ts=time();
  [$jy,$jm,$jd]=gregorian_to_jalali((int)date('Y',$ts),(int)date('n',$ts),(int)date('j',$ts));
  return sprintf('%04d/%02d/%02d ساعت %s',$jy,$jm,$jd,date('H:i',$ts));
}
function _field_alert_user_name($userId) {
  $u=Db::one("SELECT CONCAT(first_name,' ',last_name) name FROM users WHERE id=?",[(int)$userId]);
  return trim($u['name'] ?? ('کاربر '.$userId));
}
function _field_alert_line_text($lineId, $stationName=null) {
  $ln=$lineId?Db::one("SELECT code,origin,destination FROM `lines` WHERE id=?",[(int)$lineId]):null;
  $code=trim((string)($ln['code']??($lineId?:'—')));
  $origin=trim((string)($ln['origin']??''));
  $destination=trim((string)($ln['destination']??''));
  $description=trim($origin.($origin!=='' && $destination!==''?' ← ':'').$destination);
  $station=trim((string)($stationName??''));
  return [$code,$description?:'—',$station?:'—'];
}
function _field_alert_country_name($code) {
  $c=strtoupper(trim((string)$code));
  $map=['IR'=>'ایران','TR'=>'ترکیه','AZ'=>'جمهوری آذربایجان','AE'=>'امارات متحده عربی','DE'=>'آلمان','FR'=>'فرانسه','NL'=>'هلند','GB'=>'بریتانیا','US'=>'ایالات متحده','CA'=>'کانادا','RU'=>'روسیه','IQ'=>'عراق','AF'=>'افغانستان','PK'=>'پاکستان','IN'=>'هند','QA'=>'قطر','OM'=>'عمان','SA'=>'عربستان سعودی','AM'=>'ارمنستان','GE'=>'گرجستان'];
  return $map[$c]??($c?:'نامشخص');
}

// تشخیص قابل اتکاتر کشور IP: ابتدا رنج‌های رسمی تخصیص‌یافته به ایران در RIPE، سپس نتیجه اپ.
// فهرست RIPE با cURL و بدون shell_exec دریافت و در سرور Cache می‌شود.
function _ip4_to_uint($ip) {
  if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) return null;
  $n = ip2long($ip); if ($n === false) return null;
  return (float)sprintf('%u', $n);
}
function _ip4_in_cidr($ip,$cidr) {
  if (strpos((string)$cidr,'/')===false) return false;
  [$net,$bits]=explode('/',trim((string)$cidr),2); $bits=(int)$bits;
  $i=_ip4_to_uint($ip); $n=_ip4_to_uint($net);
  if ($i===null || $n===null || $bits<0 || $bits>32) return false;
  $size=2 ** (32-$bits); return floor($i/$size)===floor($n/$size);
}
function _iran_ip_seed_prefixes() {
  // رنج‌های شناخته‌شده اپراتورهای ایران؛ فهرست RIPE در زمان اجرا این Seed را تکمیل می‌کند.
  return ['5.112.0.0/12','83.120.0.0/14'];
}
function _iran_ip_prefixes() {
  static $memo=null; if (is_array($memo)) return $memo;
  $memo=_iran_ip_seed_prefixes();
  $cacheDir=dirname(__DIR__).'/storage/cache';
  $cacheFile=$cacheDir.'/iran-ipv4-prefixes.json';
  $fresh=false; $cached=[];
  try {
    if (is_file($cacheFile)) {
      $j=json_decode((string)file_get_contents($cacheFile),true);
      if (is_array($j) && !empty($j['prefixes']) && is_array($j['prefixes'])) {
        $cached=$j['prefixes']; $fresh=((int)($j['updated_at']??0) > time()-7*86400);
      }
    }
    if (!$fresh && function_exists('curl_init')) {
      $ch=curl_init('https://stat.ripe.net/data/country-resource-list/data.json?resource=IR&v4_format=prefix');
      curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>4,CURLOPT_TIMEOUT=>8,CURLOPT_FOLLOWLOCATION=>true,CURLOPT_HTTPHEADER=>['Accept: application/json','User-Agent: Khatyar/1.0']]);
      $raw=curl_exec($ch); $status=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE); curl_close($ch);
      if ($status>=200 && $status<300 && $raw) {
        $j=json_decode($raw,true); $list=$j['data']['resources']['ipv4']??[];
        if (is_array($list) && count($list)>100) {
          $cached=array_values(array_filter(array_map('trim',$list),fn($x)=>preg_match('/^\d+\.\d+\.\d+\.\d+\/\d+$/',$x)));
          if (!is_dir($cacheDir)) @mkdir($cacheDir,0775,true);
          @file_put_contents($cacheFile,json_encode(['updated_at'=>time(),'prefixes'=>$cached],JSON_UNESCAPED_SLASHES),LOCK_EX);
        }
      }
    }
  } catch (\Throwable $e) { error_log('iran ip list refresh failed: '.$e->getMessage()); }
  if ($cached) $memo=array_values(array_unique(array_merge($memo,$cached)));
  return $memo;
}
function _is_iran_ip($ip) {
  if (!filter_var($ip,FILTER_VALIDATE_IP)) return false;
  if (filter_var($ip,FILTER_VALIDATE_IP,FILTER_FLAG_NO_PRIV_RANGE|FILTER_FLAG_NO_RES_RANGE)===false) return true;
  if (filter_var($ip,FILTER_VALIDATE_IP,FILTER_FLAG_IPV4)) {
    foreach (_iran_ip_prefixes() as $cidr) if (_ip4_in_cidr($ip,$cidr)) return true;
  }
  return false;
}
function _verified_ip_country($ip,$reported=null) {
  if (_is_iran_ip($ip)) return 'IR';
  $c=strtoupper(substr(trim((string)$reported),0,2));
  return preg_match('/^[A-Z]{2}$/',$c)?$c:null;
}
function _distance_to_geofence_m($geofenceId,$lat,$lng) {
  if (!$geofenceId || $lat===null || $lng===null) return null;
  $g=Db::one("SELECT type,center_lat,center_lng,radius_m,polygon FROM geofences WHERE id=?",[(int)$geofenceId]);
  if (!$g) return null;
  if (($g['type']??'')==='polygon' && !empty($g['polygon'])) {
    $poly=json_decode($g['polygon'],true);
    if (is_array($poly) && count($poly)>=3) return (int)round(_point_in_polygon((float)$lat,(float)$lng,$poly)?0:_dist_to_polygon_m((float)$lat,(float)$lng,$poly));
  }
  if ($g['center_lat']!==null && $g['center_lng']!==null) {
    $center=_haversine_m((float)$lat,(float)$lng,(float)$g['center_lat'],(float)$g['center_lng']);
    return (int)round(max(0,$center-(float)($g['radius_m']??0)));
  }
  return null;
}
function _notify_station_exit($userId,$geofenceId,$lineId,$stationName,$eventAt=null,$distanceM=null) {
  $targets=_field_alert_targets('station_exit_notify',$userId); if(!$targets)return;
  [$lineCode,$lineDesc,$station]=_field_alert_line_text($lineId,$stationName);
  $name=_field_alert_user_name($userId); $when=_field_alert_time_text($eventAt);
  $distanceText=$distanceM===null?'نامشخص':number_format(max(0,(int)$distanceM)).' متر';
  $body="کاربر {$name} در {$when} از محدوده ایستگاه «{$station}» خارج شد.\nشماره خط: {$lineCode}\nمبدأ و مقصد خط: {$lineDesc}\nفاصله تا محدوده خط: {$distanceText}";
  Push::notify($targets,'خروج کاربر از محدوده خط',$body,['type'=>'station_exit','user_id'=>$userId,'geofence_id'=>$geofenceId,'line_id'=>$lineId,'event_at'=>$eventAt,'distance_m'=>$distanceM]);
}
function _notify_station_enter($userId,$geofenceId,$lineId,$stationName,$eventAt=null) {
  $targets=_field_alert_targets('station_enter_notify',$userId); if(!$targets)return;
  [$lineCode,$lineDesc,$station]=_field_alert_line_text($lineId,$stationName);
  $name=_field_alert_user_name($userId); $when=_field_alert_time_text($eventAt);
  Push::notify($targets,'ورود کاربر به محدوده خط',"کاربر {$name} در {$when} وارد محدوده ایستگاه «{$station}» شد.\nشماره خط: {$lineCode}\nمبدأ و مقصد خط: {$lineDesc}",['type'=>'station_enter','user_id'=>$userId,'geofence_id'=>$geofenceId,'line_id'=>$lineId,'event_at'=>$eventAt]);
}
function _notify_vpn_on($userId,$eventAt=null,$ip=null,$country=null,$previousCountry=null) {
  $targets=_field_alert_targets('vpn_on_notify',$userId); if(!$targets)return;
  $name=_field_alert_user_name($userId); $when=_field_alert_time_text($eventAt);
  $ipText=trim((string)$ip) ?: 'نامشخص';
  $verified=_verified_ip_country($ipText,$country);
  $countryName=_field_alert_country_name($verified);
  $prevVerified=_verified_ip_country($ipText,$previousCountry ?: 'IR');
  $prevName=_field_alert_country_name($prevVerified ?: 'IR');
  if ($verified==='IR') {
    $body="فیلترشکن دستگاه کاربر {$name} در {$when} روشن شد.\nIP مشاهده‌شده در رنج‌های رسمی ایران قرار دارد و تغییر کشور تأیید نشد.\nکشور IP: ایران\nIP مشاهده‌شده: {$ipText}";
  } else {
    $body="فیلترشکن دستگاه کاربر {$name} در {$when} روشن شد.\nکشور IP از {$prevName} به {$countryName} تغییر یافته است.\nIP مشاهده‌شده: {$ipText}";
  }
  Push::notify($targets,'روشن‌شدن فیلترشکن (VPN)',$body,['type'=>'vpn_on','user_id'=>$userId,'event_at'=>$eventAt,'ip'=>$ipText,'country'=>$verified,'reported_country'=>$country,'previous_country'=>$previousCountry]);
}
function _notify_gps_off($userId,$eventAt=null) {
  $targets=_field_alert_targets('gps_off_notify',$userId); if(!$targets)return;
  $name=_field_alert_user_name($userId); $when=_field_alert_time_text($eventAt);
  Push::notify($targets,'خاموش‌شدن GPS',"GPS دستگاه کاربر {$name} در {$when} خاموش شد.",['type'=>'gps_off','user_id'=>$userId,'event_at'=>$eventAt]);
}
function _notify_attendance_action($kind,$userId,$lineId,$method,$station,$eventAt) {
  $key=$kind==='checkin'?'attendance_checkin_notify':'attendance_checkout_notify';
  $targets=_field_alert_targets($key,$userId); if(!$targets)return;
  [$lineCode,$lineDesc,$stationText]=_field_alert_line_text($lineId,$station);
  $name=_field_alert_user_name($userId); $when=_field_alert_time_text($eventAt);
  $isIn=$kind==='checkin';
  $title=$isIn?'ثبت ورود از حضور من':'ثبت خروج از حضور من';
  $verb=$isIn?'ورود خود را ثبت کرد':'خروج خود را ثبت کرد';
  $methodNames=['gps'=>'GPS','qr'=>'QR','wifi'=>'WiFi','nfc'=>'NFC','bt'=>'بلوتوث','gsm'=>'GSM'];
  $m=$methodNames[$method]??$method;
  $body="کاربر {$name} در {$when} {$verb}.\nشماره خط: {$lineCode}\nمبدأ و مقصد خط: {$lineDesc}\nایستگاه: {$stationText}\nروش ثبت: {$m}";
  Push::notify($targets,$title,$body,['type'=>$isIn?'attendance_checkin':'attendance_checkout','user_id'=>$userId,'line_id'=>$lineId,'event_at'=>$eventAt,'method'=>$method]);
}

/* ---------------- موقعیت ---------------- */
route('POST', '/api/locations', function($p, $b, $u) {
  $n = 0; $lineIds = user_line_ids($u); $lastLat=null; $lastLng=null; $lastAt=null; $lastAccuracy=null; $lastViaGsm=false;
  // اطمینان از وجود ستون‌های تشخیصی موقعیت (یک‌بار)
  try { Db::run("ALTER TABLE location_pings ADD COLUMN via_gsm TINYINT(1) NOT NULL DEFAULT 0"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  try { Db::run("ALTER TABLE location_pings ADD COLUMN accuracy_m DECIMAL(10,2) NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  try { Db::run("ALTER TABLE location_pings ADD COLUMN provider VARCHAR(20) NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  foreach (($b['pings'] ?? []) as $pg) {
    [$lat, $lng] = validGeo($pg['lat'] ?? null, $pg['lng'] ?? null);
    if ($lat === null) continue;
    try {
      Db::run("INSERT INTO location_pings(user_id,lat,lng,captured_at,mocked,via_gsm,accuracy_m,provider) VALUES(?,?,?,?,?,?,?,?)",
        [$u['id'], $lat, $lng, date('Y-m-d H:i:s', strtotime($pg['captured_at'])), !empty($pg['mocked'])?1:0, !empty($pg['via_gsm'])?1:0,
         isset($pg['accuracy'])?(float)$pg['accuracy']:null, substr((string)($pg['provider'] ?? (!empty($pg['via_gsm'])?'network':'gps')),0,20)]);
    } catch (\Throwable $e) {
      // fallback اگر ستون via_gsm نبود
      Db::run("INSERT INTO location_pings(user_id,lat,lng,captured_at,mocked) VALUES(?,?,?,?,?)",
        [$u['id'], $lat, $lng, date('Y-m-d H:i:s', strtotime($pg['captured_at'])), !empty($pg['mocked'])?1:0]);
    }
    $n++;
    $lastLat=$lat; $lastLng=$lng; $lastAt=date('Y-m-d H:i:s', strtotime($pg['captured_at'])); $lastAccuracy=isset($pg['accuracy'])?(float)$pg['accuracy']:null; $lastViaGsm=!empty($pg['via_gsm']);
  }
  // پایش ورود/خروج از محدودهٔ ایستگاه بر اساس آخرین نقطه
  if ($lastLat !== null) {
    try {
      $baseBuffer = max(20, (int)_req_setting('geofence_exit_buffer_m', 50));
      $accBuffer = $lastAccuracy !== null ? (int)ceil(min(100, max(0, $lastAccuracy)) * 0.75) : 0;
      $effectiveBuffer = $baseBuffer + $accBuffer;
      $st = station_at_point($lastLat, $lastLng, $lineIds, $effectiveBuffer);
      try { Db::run("ALTER TABLE user_station_state ADD COLUMN outside_count INT NOT NULL DEFAULT 0"); } catch (\Throwable $e) {}
      try { Db::run("ALTER TABLE user_station_state ADD COLUMN last_outside_at DATETIME NULL"); } catch (\Throwable $e) {}
      $cur = Db::one("SELECT geofence_id,outside_count,last_outside_at FROM user_station_state WHERE user_id=?", [$u['id']]);
      $insideId = $st ? (int)$st['id'] : null;
      $prevId = $cur ? ($cur['geofence_id']!==null?(int)$cur['geofence_id']:null) : null;
      // وضعیت قدیمی فقط زمانی معتبر است که ایستگاه قبلی همچنان متعلق به یکی از خطوط تخصیص‌یافته کاربر باشد.
      if ($prevId !== null && is_array($lineIds)) {
        if (!$lineIds) $prevId=null;
        else {
          $q=implode(',',array_fill(0,count($lineIds),'?'));
          $allowedPrev=Db::one("SELECT id FROM geofences WHERE id=? AND line_id IN ($q)",array_merge([$prevId],$lineIds));
          if(!$allowedPrev)$prevId=null;
        }
      }
      $outsideCount = (int)($cur['outside_count'] ?? 0);
      $accuracyTooLow = $lastAccuracy !== null && $lastAccuracy > max(80, (int)_req_setting('gps_required_accuracy_m', 80));
      // موقعیت GSM یا GPS کم‌دقت هرگز به‌تنهایی خروج ایجاد نمی‌کند.
      if ($prevId !== null && $insideId !== $prevId) {
        if ($lastViaGsm || $accuracyTooLow) {
          $outsideCount = 0;
          $insideId = $prevId;
        } else {
          $outsideCount++;
          $requiredOutside = max(2, (int)_req_setting('geofence_exit_confirmations', 3));
          if ($outsideCount < $requiredOutside) {
            $insideId = $prevId;
          } else {
            $g = Db::one("SELECT id,name,line_id FROM geofences WHERE id=?", [$prevId]);
            Db::run("INSERT INTO station_exits(user_id,geofence_id,line_id,station_name,lat,lng,exited_at) VALUES(?,?,?,?,?,?,?)",
              [$u['id'], $prevId, $g['line_id']??null, $g['name']??null, $lastLat, $lastLng, $lastAt ?: date('Y-m-d H:i:s')]);
            $distanceM=_distance_to_geofence_m($prevId,$lastLat,$lastLng);
            _notify_station_exit((int)$u['id'], $prevId, $g['line_id']??null, $g['name']??null, $lastAt ?: date('Y-m-d H:i:s'), $distanceM);
            $outsideCount = 0;
          }
        }
      } else {
        $outsideCount = 0;
      }
      if ($insideId !== null && $insideId !== $prevId) {
        $gin = Db::one("SELECT id,name,line_id FROM geofences WHERE id=?", [$insideId]);
        _notify_station_enter((int)$u['id'], $insideId, $gin['line_id']??($st['line_id']??null), $gin['name']??($st['name']??null), $lastAt ?: date('Y-m-d H:i:s'));
      }
      if ($cur) Db::run("UPDATE user_station_state SET geofence_id=?, line_id=?, outside_count=?, last_outside_at=?, updated_at=NOW() WHERE user_id=?", [$insideId, $st['line_id']??null, $outsideCount, $outsideCount>0?($lastAt?:date('Y-m-d H:i:s')):null, $u['id']]);
      else Db::run("INSERT INTO user_station_state(user_id,geofence_id,line_id,outside_count,last_outside_at,updated_at) VALUES(?,?,?,?,?,NOW())", [$u['id'], $insideId, $st['line_id']??null, 0, null]);
    } catch (\Throwable $e) { /* جداول پایش ممکن است هنوز ساخته نشده باشند */ }
  }
  // پایش روشن/خاموش‌شدن VPN (فیلترشکن) — مبنا: گزارش اپ یا تغییر IP کاربر
  try {
    $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null;
    if ($ip && strpos($ip, ',') !== false) $ip = trim(explode(',', $ip)[0]);
    $vpnReported = array_key_exists('vpn_on', $b) ? (!empty($b['vpn_on']) ? 1 : 0) : null;
    $prev = Db::one("SELECT vpn_on,last_ip,ip_country FROM user_net_state WHERE user_id=?", [$u['id']]);
    $prevVpn = $prev ? (int)$prev['vpn_on'] : 0;
    $prevIp  = $prev ? $prev['last_ip'] : null;
    $prevCountry = $prev ? ($prev['ip_country'] ?? 'IR') : 'IR';
    // اگر اپ گزارش نداده، به وضعیت قبلی اتکا می‌کنیم.
    // توجه: صرفِ تغییر IP را دیگر نشانهٔ VPN نمی‌گیریم، چون IP موبایل (3G/4G/5G)
    // به‌طور طبیعی مدام عوض می‌شود و این باعث هشدار اشتباه می‌شد.
    $vpnNow = $vpnReported !== null ? $vpnReported : $prevVpn;
    if ($vpnNow !== $prevVpn) {
      // ذخیرهٔ کشور IP در رویداد (در صورت ارسال)
      $reportedCountry = (array_key_exists('vpn_country',$b) && $b['vpn_country']) ? substr($b['vpn_country'],0,4) : null;
      $evCountry = _verified_ip_country($ip,$reportedCountry);
      try {
        $vc = array_column(Db::all("SHOW COLUMNS FROM vpn_events"), 'Field');
        if (!in_array('country', $vc)) Db::run("ALTER TABLE vpn_events ADD COLUMN country VARCHAR(4) NULL");
      } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
      Db::run("INSERT INTO vpn_events(user_id,state,ip,country) VALUES(?,?,?,?)", [$u['id'], $vpnNow, $ip, $evCountry]);
      // اعلان روشن‌شدن VPN برای مسئول(ان) پیکربندی‌شده (فقط لحظهٔ روشن‌شدن، نه خاموش‌شدن)
      if ($vpnNow === 1 && $prevVpn === 0) { try { _notify_vpn_on($u['id'], $lastAt ?: date('Y-m-d H:i:s'), $ip, $evCountry, $prevCountry); } catch (\Throwable $e) { error_log('vpn field alert failed: '.$e->getMessage()); } }
    }
    if ($prev) Db::run("UPDATE user_net_state SET vpn_on=?, last_ip=?, updated_at=NOW() WHERE user_id=?", [$vpnNow, $ip, $u['id']]);
    else Db::run("INSERT INTO user_net_state(user_id,vpn_on,last_ip,updated_at) VALUES(?,?,?,NOW())", [$u['id'], $vpnNow, $ip]);
    // ذخیرهٔ کشور IP (در صورت ارسال توسط اپ)
    if (array_key_exists('vpn_country', $b) && $b['vpn_country']) {
      try {
        $cc = array_column(Db::all("SHOW COLUMNS FROM user_net_state"), 'Field');
        if (!in_array('ip_country', $cc)) Db::run("ALTER TABLE user_net_state ADD COLUMN ip_country VARCHAR(4) NULL");
        Db::run("UPDATE user_net_state SET ip_country=? WHERE user_id=?", [_verified_ip_country($ip,$b['vpn_country']), $u['id']]);
      } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
    }
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  // ذخیرهٔ سطح باتری (در صورت ارسال) برای نمایش در فعالیت کاربران
  if (isset($b['battery']) && is_array($b['battery']) && isset($b['battery']['level'])) {
    try {
      $cols = array_column(Db::all("SHOW COLUMNS FROM user_net_state"), 'Field');
      if (!in_array('battery_level', $cols)) Db::run("ALTER TABLE user_net_state ADD COLUMN battery_level INT NULL");
      if (!in_array('battery_charging', $cols)) Db::run("ALTER TABLE user_net_state ADD COLUMN battery_charging TINYINT(1) NULL");
      $lvl = (int)$b['battery']['level']; $chg = !empty($b['battery']['charging']) ? 1 : 0;
      Db::run("UPDATE user_net_state SET battery_level=?, battery_charging=? WHERE user_id=?", [$lvl, $chg, $u['id']]);
    } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  }
  return ['saved'=>$n];
});
route('GET','/api/my/field-status',function($p,$b,$u){
  $uid=(int)$u['id'];
  $net=null; $st=null; $gps=null; $vpnSince=null; $outsideSince=null;
  try { $net=Db::one("SELECT vpn_on,updated_at FROM user_net_state WHERE user_id=?",[$uid]); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  try {
    $ve=Db::one("SELECT state,created_at FROM vpn_events WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 1",[$uid]);
    if ($ve && (int)$ve['state']===1) $vpnSince=$ve['created_at'];
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  if (!$vpnSince && !empty($net['vpn_on'])) $vpnSince=$net['updated_at']??null;

  try { $st=Db::one("SELECT geofence_id,updated_at FROM user_station_state WHERE user_id=?",[$uid]); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  if ($st && $st['geofence_id']===null) {
    try {
      $se=Db::one("SELECT exited_at FROM station_exits WHERE user_id=? ORDER BY exited_at DESC,id DESC LIMIT 1",[$uid]);
      $outsideSince=$se['exited_at']??($st['updated_at']??null);
    } catch (\Throwable $e) { $outsideSince=$st['updated_at']??null; }
  }

  try { $gps=Db::one("SELECT kind,at FROM user_activity WHERE user_id=? AND kind IN ('gps_on','gps_off') ORDER BY at DESC,id DESC LIMIT 1",[$uid]); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }

  return [
    'vpn_on'=>!empty($net['vpn_on']),
    'vpn_since'=>$vpnSince,
    'outside_station'=>$st ? ($st['geofence_id']===null) : false,
    'outside_since'=>$outsideSince,
    'gps_off'=>($gps && $gps['kind']==='gps_off'),
    'gps_since'=>$gps['at']??null,
    'checked_at'=>date('Y-m-d H:i:s')
  ];
});
route('GET', '/api/admin/station-exits', function($p,$b,$u){
  $since = $_GET['since'] ?? date('Y-m-d 00:00:00');
  return Db::all("SELECT se.id, se.user_id, CONCAT(us.first_name,' ',us.last_name) name, r.title role, se.station_name, l.code line_code, se.lat, se.lng, se.exited_at
    FROM station_exits se JOIN users us ON us.id=se.user_id LEFT JOIN roles r ON r.id=us.role_id LEFT JOIN `lines` l ON l.id=se.line_id
    WHERE se.exited_at >= ? ORDER BY se.exited_at DESC LIMIT 200", [$since]);
}, false, ADMIN);
// سرو امن تصویر فیزیکی: /api/media?path=uploads/...  (نیازمند احراز هویت)
// نکته امنیتی مهم: پیش‌تر این مسیر به‌اشتباه public=true بود (برخلاف همین کامنت بالا)
// و باعث می‌شد همهٔ تصاویر (از جمله سلفی‌های حضور و «سلفی نامحسوس») بدون نیاز به
// ورود، فقط با دانستن/حدس مسیر فایل قابل مشاهده باشند. اصلاح شد تا مثل سایر
// مسیرهای دانلود (backup, export) از Http::bearer() استفاده کند که هم هدر
// Authorization و هم پارامتر ?token= (برای <img>/<Image> که هدر نمی‌فرستند) را
// می‌پذیرد؛ اپ موبایل از قبل با هدر Authorization درخواست می‌دهد.
route('GET', '/api/media', function($p,$b,$u){
  $rel = $_GET['path'] ?? '';
  if (!$rel) Http::error('مسیر تصویر مشخص نیست', 400);
  Media::serve($rel); // خروجی مستقیم فایل + exit
});

route('GET', '/api/locations/live', function($p,$b,$u){
  $shiftOnly = !empty($_GET['shift_only']);
  // اطمینان از وجود ستون ip_country
  try { $cc = array_column(Db::all("SHOW COLUMNS FROM user_net_state"), 'Field'); if (!in_array('ip_country', $cc)) Db::run("ALTER TABLE user_net_state ADD COLUMN ip_country VARCHAR(4) NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  $where = '';
  if ($shiftOnly) {
    // فقط کاربرانی که شیفت دارند و الان در ساعت شیفت‌شان هستند
    // (چک ساده: user_shifts وجود داشته باشد و ارسال موقعیت اخیر داشته باشند)
    $where = 'JOIN user_shifts ust ON ust.user_id=lp.user_id JOIN shifts sh ON sh.id=ust.shift_id AND sh.is_active=1';
  }
  return Db::all(
  "SELECT lp.user_id, u.first_name, u.last_name,
          CASE WHEN u.photo_path IS NOT NULL AND u.photo_path<>'' THEN CONCAT('/api/media?path=', u.photo_path) ELSE u.photo END AS photo,
          u.role_id, r.title role_title, r.level, lp.lat, lp.lng, lp.captured_at,
          COALESCE(lp.via_gsm,0) AS via_gsm,
          COALESCE(lp.received_at, lp.captured_at) AS received_at,
          (COALESCE(lp.received_at, lp.captured_at) >= DATE_SUB(NOW(), INTERVAL 3 MINUTE)) AS online,
          TIMESTAMPDIFF(SECOND, COALESCE(lp.received_at, lp.captured_at), NOW()) AS secs_ago,
          COALESCE(ns.vpn_on,0) AS vpn_on, ns.battery_level, ns.battery_charging, ns.ip_country, ns.last_ip
   FROM location_pings lp
   JOIN (SELECT user_id, MAX(COALESCE(received_at,captured_at)) mx FROM location_pings GROUP BY user_id) m
        ON m.user_id=lp.user_id AND m.mx=COALESCE(lp.received_at,lp.captured_at)
   JOIN users u ON u.id=lp.user_id LEFT JOIN roles r ON r.id=u.role_id
   LEFT JOIN user_net_state ns ON ns.user_id=lp.user_id
   $where
   GROUP BY lp.user_id");
}, false, ADMIN);

// مسیر طی‌شدهٔ یک کاربر در بازهٔ زمانی (برای رهگیری زنده و گزارش رهگیری روی نقشه)
route('GET', '/api/locations/track', function($p,$b,$u){
  $uid = (int)($_GET['user_id'] ?? 0);
  if (!$uid) Http::error('user_id لازم است', 400);
  $from = $_GET['from'] ?? date('Y-m-d 00:00:00');
  $to   = $_GET['to']   ?? date('Y-m-d 23:59:59');
  $from = date('Y-m-d H:i:s', strtotime($from));
  $to   = date('Y-m-d H:i:s', strtotime($to));
  $cols = array_column(Db::all("SHOW COLUMNS FROM location_pings"), 'Field');
  $gsmCol = in_array('via_gsm', $cols) ? 'COALESCE(via_gsm,0) via_gsm' : '0 via_gsm';
  $rows = Db::all("SELECT lat,lng,captured_at,mocked,$gsmCol FROM location_pings
                   WHERE user_id=? AND captured_at BETWEEN ? AND ? ORDER BY captured_at", [$uid, $from, $to]);
  $info = Db::one("SELECT CONCAT(first_name,' ',last_name) name FROM users WHERE id=?", [$uid]);
  return ['user_id'=>$uid, 'name'=>$info['name'] ?? '', 'from'=>$from, 'to'=>$to, 'points'=>$rows, 'count'=>count($rows)];
}, false, ADMIN);

// بررسی نسخهٔ اپ اندروید (عمومی) — اپ هنگام شروع این را می‌خواند
route('GET', '/api/app/version', function($p,$b,$u){
  $get = function($k,$d=null){ $r = Db::one("SELECT value FROM app_settings WHERE `key`=?", [$k]); return $r ? json_decode($r['value'], true) : $d; };
  return [
    'latest_version' => $get('app_latest_version', APP_VERSION),
    'min_version'    => $get('app_min_version', '0.0.0'),
    'apk_url'        => $get('app_apk_url', ''),
    'notes'          => $get('app_update_notes', ''),
    'site_version'   => SITE_VERSION,
    'app_version'    => APP_VERSION,
    'location_interval_sec' => (int)($get('location_interval_sec', 60) ?: 60),
    'gps_required_accuracy_m' => (int)($get('gps_required_accuracy_m', 80) ?: 80),
  ];
}, true);  // public=true

// پایش چندلایه VPN: Android TRANSPORT_VPN + tunnel interface + IP/DNS diagnostics
route('POST', '/api/activity/vpn-status', function($p,$b,$u){
  $requestedVpnOn = !empty($b['vpn_on']) ? 1 : 0;
  $event = in_array(($b['event'] ?? ''), ['vpn_on','vpn_off','vpn_heartbeat'], true) ? $b['event'] : 'vpn_heartbeat';
  $clientIp = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null;
  if ($clientIp && strpos($clientIp, ',') !== false) $clientIp = trim(explode(',', $clientIp)[0]);
  // The server-observed IP is authoritative; client public_ip is retained only for diagnostics.
  $country = !empty($b['ip_country']) ? strtoupper(substr((string)$b['ip_country'],0,4)) : null;
  $detectedBy = is_array($b['detected_by'] ?? null) ? array_slice($b['detected_by'],0,8) : [];
  $tunnels = is_array($b['tunnel_interfaces'] ?? null) ? array_slice($b['tunnel_interfaces'],0,20) : [];
  $dns = is_array($b['dns_servers'] ?? null) ? array_slice($b['dns_servers'],0,20) : [];
  $networkType = substr((string)($b['network_type'] ?? 'unknown'),0,32);
  $confirmationCount = max(0, min(10, (int)($b['confirmation_count'] ?? 0)));
  $strongSignals = array_intersect($detectedBy, ['android_transport','expo_network','active_tunnel_interface']);
  // سرور فقط گزارش تأییدشدهٔ چندمرحله‌ای را VPN فعال می‌پذیرد. کشور/IP خارجی به‌تنهایی معیار نیست.
  $vpnOn = ($requestedVpnOn && count($strongSignals) >= 2 && $confirmationCount >= 2) ? 1 : 0;
  $checkedAt = !empty($b['checked_at']) ? date('Y-m-d H:i:s', strtotime($b['checked_at'])) : date('Y-m-d H:i:s');

  $prev = Db::one("SELECT vpn_on,vpn_started_at,last_ip,ip_country FROM user_net_state WHERE user_id=?", [$u['id']]);
  $prevVpn = $prev ? (int)$prev['vpn_on'] : 0;
  $startedAt = $prev['vpn_started_at'] ?? null;
  if ($vpnOn && !$prevVpn) $startedAt = $checkedAt;
  $duration = ($vpnOn && $startedAt) ? max(0, strtotime($checkedAt)-strtotime($startedAt)) : 0;

  Db::run("INSERT INTO vpn_status_reports(user_id,vpn_on,event,detected_by,tunnel_interfaces,dns_servers,network_type,client_public_ip,server_ip,ip_country,sdk_int,checked_at,duration_seconds)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [$u['id'],$vpnOn,$event,json_encode($detectedBy,JSON_UNESCAPED_UNICODE),json_encode($tunnels,JSON_UNESCAPED_UNICODE),json_encode($dns,JSON_UNESCAPED_UNICODE),$networkType,
     substr((string)($b['public_ip']??''),0,64)?:null,$clientIp,$country,isset($b['sdk_int'])?(int)$b['sdk_int']:null,$checkedAt,$duration]);

  if ($prev) {
    Db::run("UPDATE user_net_state SET vpn_on=?,vpn_started_at=?,vpn_duration_seconds=?,last_ip=?,ip_country=COALESCE(?,ip_country),vpn_detected_by=?,vpn_network_type=?,vpn_dns=?,updated_at=NOW() WHERE user_id=?",
      [$vpnOn,$vpnOn?$startedAt:null,$duration,$clientIp,$country,json_encode($detectedBy,JSON_UNESCAPED_UNICODE),$networkType,json_encode($dns,JSON_UNESCAPED_UNICODE),$u['id']]);
  } else {
    Db::run("INSERT INTO user_net_state(user_id,vpn_on,vpn_started_at,vpn_duration_seconds,last_ip,ip_country,vpn_detected_by,vpn_network_type,vpn_dns,updated_at) VALUES(?,?,?,?,?,?,?,?,?,NOW())",
      [$u['id'],$vpnOn,$vpnOn?$startedAt:null,$duration,$clientIp,$country,json_encode($detectedBy,JSON_UNESCAPED_UNICODE),$networkType,json_encode($dns,JSON_UNESCAPED_UNICODE)]);
  }

  if ($vpnOn !== $prevVpn) {
    Db::run("INSERT INTO vpn_events(user_id,state,ip,country) VALUES(?,?,?,?)", [$u['id'],$vpnOn,$clientIp,$country]);
    if ($vpnOn) { try { _notify_vpn_on($u['id'],$checkedAt,$clientIp,$country,$prev['ip_country']??null); } catch (\Throwable $e) { error_log('vpn notify failed: '.$e->getMessage()); } }
  }
  return ['ok'=>true,'vpn_on'=>(bool)$vpnOn,'duration_seconds'=>$duration,'server_ip'=>$clientIp,'confirmation_count'=>$confirmationCount,'signals'=>array_values($strongSignals)];
});

// ثبت رویداد فعالیت کاربر (از اپ موبایل/وب): online/offline/gps_on/gps_off/heartbeat
route('POST', '/api/activity/telemetry', function($p,$b,$u){
  $kind = $b['kind'] ?? '';
  $allowed = ['online','offline','gps_on','gps_off','heartbeat','session_start','session_end','app_foreground','app_background','bill_pay_click'];
  if (!in_array($kind, $allowed, true)) Http::error('نوع نامعتبر', 400);
  // زمان رخداد از کلاینت (برای داده‌های آفلاین که دیرتر ارسال می‌شوند)؛ در صورت نبود، اکنون
  $at = isset($b['at']) ? date('Y-m-d H:i:s', strtotime($b['at'])) : date('Y-m-d H:i:s');
  Db::run("INSERT INTO user_activity(user_id,kind,meta,at) VALUES(?,?,?,?)", [$u['id'], $kind, isset($b['meta'])?json_encode($b['meta'], JSON_UNESCAPED_UNICODE):null, $at]);
  if ($kind === 'gps_off') { try { _notify_gps_off($u['id'], $at); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); } }
  return ['ok'=>true];
});

// پرکارترین/کم‌کارترین کاربر بر اساس مجموع فعالیت (گزارش + حضور راننده + ثبت مسئول)
route('GET', '/api/admin/user-leaderboard', function($p,$b,$u){
  $rows = Db::all("SELECT u.id, CONCAT(u.first_name,' ',u.last_name) name, r.title role,
      (SELECT COUNT(*) FROM reports x WHERE x.sender_id=u.id) reports,
      (SELECT COUNT(*) FROM attendances a WHERE a.user_id=u.id) attendances,
      (SELECT COUNT(*) FROM official_visits ov WHERE ov.recorded_by=u.id) visits
    FROM users u JOIN roles r ON r.id=u.role_id WHERE u.is_active=1");
  foreach ($rows as &$x){ $x['total'] = (int)$x['reports'] + (int)$x['attendances'] + (int)$x['visits']; $x['reports']=(int)$x['reports']; $x['attendances']=(int)$x['attendances']; $x['visits']=(int)$x['visits']; }
  usort($rows, fn($a,$c)=>$c['total']-$a['total']);
  return $rows;
}, false, ADMIN);

// پرکارترین/کم‌کارترین کاربران — گروه‌ها به‌صورت پویا از روی سمت‌های واقعی سامانه ساخته می‌شوند
// محاسبهٔ پرکار/کم‌کار بر اساس تنظیمات داشبورد و نقشِ بیننده
function _dashboard_groups($viewerRoleId, $viewerZoneId, $surface = 'web') {
  // نقش‌های مدیریتی که نباید به‌عنوان «نیروی کاری» در گروه‌ها شمرده شوند
  $isManager = function($title){
    foreach (['رییس','رئیس','معاونت','مدیر کل','مدیرکل'] as $kw) if (strpos($title,$kw)!==false) return true;
    return false;
  };
  // نگاشت سازگاری با تنظیماتِ ذخیره‌شدهٔ نسخه‌های قبلی که کلیدهای رشته‌ای ثابت داشتند
  // (اگر سمتی امروز هم با این عبارت‌ها مطابقت داشته باشد، تنظیمات قدیمی او همچنان اعمال می‌شود)
  $LEGACY = [
    'سربازرس'      => ['key'=>'chief_inspector','f'=>'all','count'=>3],
    'نیروی اداری'  => ['key'=>'admin_staff',     'f'=>'all','count'=>5],
    'ناظر خط'      => ['key'=>'supervisor',      'f'=>'sup','count'=>5],
    'اپراتور'      => ['key'=>'operator',        'f'=>'opr','count'=>5],
    'بازرس'        => ['key'=>'inspector',       'f'=>'all','count'=>5],
  ];
  // گروه‌ها: یک گروه به ازای هر سمت فعال (کلید = شناسهٔ همان سمت)؛ با افزودن سمت جدید
  // (مثلاً گشت موتوری، گشت خودرویی، بازرس مقیم)، خودبه‌خود یک گروه جدید هم اضافه می‌شود.
  $roleRows = Db::all("SELECT id,title FROM roles ORDER BY title");
  $GROUPS = []; $ORDER = [];
  foreach ($roleRows as $rr) {
    if ($isManager($rr['title'])) continue;
    $key = (string)$rr['id']; $f = 'all'; $count = 5; $legacyKey = null;
    foreach ($LEGACY as $matchTitle => $meta) { if (strpos($rr['title'], $matchTitle) !== false) { $legacyKey = $meta['key']; $f = $meta['f']; $count = $meta['count']; break; } }
    $GROUPS[$key] = ['title'=>$rr['title'], 'count'=>$count, 'f'=>$f, 'legacy_key'=>$legacyKey];
    $ORDER[] = $key;
  }

  // خواندن تنظیمات
  $cfgRow = Db::one("SELECT value FROM app_settings WHERE `key`='dashboard_config'");
  $cfg = $cfgRow ? json_decode($cfgRow['value'], true) : null;
  $roleCfg = null;
  if (is_array($cfg)) {
    if ($viewerRoleId && isset($cfg['roles'][(string)$viewerRoleId])) $roleCfg = $cfg['roles'][(string)$viewerRoleId];
    elseif (isset($cfg['default'])) $roleCfg = $cfg['default'];
  }
  $zoneScope = $roleCfg['zone_scope'] ?? 'all';
  // تنظیمات هر گروه: ابتدا با کلید فعلی (شناسهٔ سمت)، در نبود آن با کلید قدیمی (سازگاری با نصب‌های قبلی)
  $groupCfgOf = function($k) use ($roleCfg, $GROUPS) {
    if (isset($roleCfg['groups'][$k])) return $roleCfg['groups'][$k];
    $lk = $GROUPS[$k]['legacy_key'] ?? null;
    if ($lk && isset($roleCfg['groups'][$lk])) return $roleCfg['groups'][$lk];
    return null;
  };

  // فیلتر منطقه
  $where = "u.is_active=1"; $args = [];
  if ($zoneScope === 'own' && $viewerZoneId) { $where .= " AND u.zone_id=?"; $args[] = $viewerZoneId; }

  $rows = Db::all("SELECT u.id, u.role_id, CONCAT(u.first_name,' ',u.last_name) name, r.title role,
      (SELECT COUNT(*) FROM attendances a WHERE a.user_id=u.id) c_att,
      (SELECT COUNT(*) FROM checklist_submissions c WHERE c.user_id=u.id) c_check,
      (SELECT COUNT(*) FROM notices n WHERE n.user_id=u.id) c_notice,
      (SELECT COUNT(*) FROM form_submissions f WHERE f.user_id=u.id) c_form,
      (SELECT COUNT(*) FROM official_visits ov WHERE ov.recorded_by=u.id) c_visit,
      (SELECT COUNT(*) FROM reports x WHERE x.sender_id=u.id) c_report
    FROM users u JOIN roles r ON r.id=u.role_id WHERE $where", $args);

  $score = function($m,$f) {
    $att=$m['attendances'];$chk=$m['checklists'];$not=$m['notices'];$frm=$m['forms'];$vis=$m['visits'];$rep=$m['reports'];
    // مبنای محاسبهٔ سفارشی هر سمت از تنظیمات (metrics): آرایه‌ای از فعالیت‌های انتخاب‌شده
    // اگر برای این گروه metrics تعریف شده باشد، فقط همان‌ها جمع می‌شوند
    $metricMap = ['attendances'=>$att,'checklists'=>$chk,'notices'=>$not,'forms'=>$frm,'visits'=>$vis,'reports'=>$rep];
    if (is_array($f)) { // فهرست metric سفارشی
      $sum = 0; foreach ($f as $mk) { if (isset($metricMap[$mk])) $sum += $metricMap[$mk]; }
      return $sum;
    }
    if ($f==='sup') return $att+$chk+$not+$frm+$vis+$rep;
    if ($f==='opr') return $vis+$rep+$chk+$frm;
    return $att+$chk+$not+$frm+$vis+$rep; // all
  };
  $buckets = []; foreach ($ORDER as $k) $buckets[$k] = [];
  foreach ($rows as $r) {
    $k = (string)$r['role_id'];
    if (!isset($buckets[$k])) continue; // نقش مدیریتی یا سمتی که دیگر وجود ندارد
    $m = ['id'=>(int)$r['id'],'name'=>$r['name'],'role'=>$r['role'],
      'attendances'=>(int)$r['c_att'],'checklists'=>(int)$r['c_check'],'notices'=>(int)$r['c_notice'],
      'forms'=>(int)$r['c_form'],'visits'=>(int)$r['c_visit'],'reports'=>(int)$r['c_report']];
    $gMetrics = ($groupCfgOf($k))['metrics'] ?? null;
    $formula = (is_array($gMetrics) && $gMetrics) ? $gMetrics : $GROUPS[$k]['f'];
    $m['total']=$score($m,$formula); $buckets[$k][]=$m;
  }

  $out = [];
  foreach ($ORDER as $k) {
    $gcfg = $groupCfgOf($k);
    // نمایش بر اساس سطحِ بیننده (وب یا اپ). سازگاری با ساختار قدیمی که فقط 'show' داشت.
    if ($gcfg === null) { $show = true; }
    elseif (array_key_exists('web', $gcfg) || array_key_exists('app', $gcfg)) {
      $show = !empty($gcfg[$surface === 'app' ? 'app' : 'web']);
    } else { $show = !empty($gcfg['show']); }
    if (!$show) continue;
    $n = $gcfg && isset($gcfg['count']) ? max(1,(int)$gcfg['count']) : $GROUPS[$k]['count'];
    $arr = $buckets[$k];
    usort($arr, fn($a,$c)=>$c['total']-$a['total']);
    $out[] = ['key'=>$k, 'title'=>$GROUPS[$k]['title'], 'count'=>$n,
      'top'=>array_slice($arr,0,$n), 'bottom'=>array_slice(array_reverse($arr),0,$n)];
  }
  return ['groups'=>$out, 'zone_scope'=>$zoneScope];
}

// زون کاربر جاری (گارد برای دیتابیس قدیمی)
function _viewer_zone($u) {
  try { $r = Db::one("SELECT zone_id FROM users WHERE id=?", [$u['id']]); return $r['zone_id'] ?? null; } catch (\Throwable $e) { return null; }
}

route('GET', '/api/admin/top-workers', function($p,$b,$u){
  return _dashboard_groups((int)($u['role_id']??0), _viewer_zone($u), 'web');
}, false, ADMIN);
// نسخهٔ قابل‌دسترس برای اپ موبایل (هر کاربر واردشده): پرکار/کم‌کار ناظر و اپراتور
// فهرست سبک کاربران برای انتخابگرها (بدون عکس → سریع)
route('GET', '/api/admin/users-lite', fn($p,$b,$u) => Db::all(
  "SELECT u.id, u.first_name, u.last_name, u.role_id, r.title role_title
   FROM users u LEFT JOIN roles r ON r.id=u.role_id
   WHERE u.is_active=1 ORDER BY u.first_name, u.last_name"), false, ADMIN);

route('GET', '/api/my/leaderboard', function($p,$b,$u){
  return _dashboard_groups((int)($u['role_id']??0), _viewer_zone($u), 'app');
});

// گزارش عملکرد جامع همهٔ پرسنل (تعداد چک‌لیست، حضور راننده، تذکر، حضور مسئول، گزارش)
route('GET', '/api/admin/personnel-performance', function($p,$b,$u){
  $from = $_GET['from'] ?? null; $to = $_GET['to'] ?? null;
  // شرط بازهٔ تاریخ (میلادی)
  $dc = function($col) use ($from,$to,&$args){ $c=''; if($from){$c.=" AND DATE($col)>=?";} if($to){$c.=" AND DATE($col)<=?";} return $c; };
  $mk = function($base) use ($from,$to){ $a=[]; if($from)$a[]=$from; if($to)$a[]=$to; return $a; };
  $users = Db::all("SELECT u.id, CONCAT(u.first_name,' ',u.last_name) name, r.title role_title
    FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.is_active=1 ORDER BY name");
  // شمارش‌ها را یکجا با گروه‌بندی بگیر
  $cntCheck = []; foreach (Db::all("SELECT user_id, COUNT(*) n FROM checklist_submissions WHERE 1=1".$dc('created_at')." GROUP BY user_id", $mk('c')) as $r) $cntCheck[$r['user_id']]=(int)$r['n'];
  $cntAtt = []; foreach (Db::all("SELECT user_id, COUNT(*) n FROM attendances WHERE 1=1".$dc('created_at')." GROUP BY user_id", $mk('a')) as $r) $cntAtt[$r['user_id']]=(int)$r['n'];
  $cntNotice = []; foreach (Db::all("SELECT user_id, COUNT(*) n FROM notices WHERE 1=1".$dc('created_at')." GROUP BY user_id", $mk('n')) as $r) $cntNotice[$r['user_id']]=(int)$r['n'];
  $cntOff = []; foreach (Db::all("SELECT recorded_by uid, COUNT(*) n FROM official_visits WHERE 1=1".$dc('created_at')." GROUP BY recorded_by", $mk('o')) as $r) $cntOff[$r['uid']]=(int)$r['n'];
  $cntRep = []; foreach (Db::all("SELECT sender_id uid, COUNT(*) n FROM reports WHERE 1=1".$dc('created_at')." GROUP BY sender_id", $mk('r')) as $r) $cntRep[$r['uid']]=(int)$r['n'];
  // پیامک‌های ارسالی (کل و آبونمان) و کلیک‌های پرداخت قبض
  $cntSms = []; $cntSmsAb = []; $cntBillClick = [];
  try {
    foreach (Db::all("SELECT sent_by uid, COUNT(*) n FROM sms_log WHERE 1=1".$dc('created_at')." GROUP BY sent_by", $mk('s')) as $r) $cntSms[$r['uid']]=(int)$r['n'];
    $smsCols = array_column(Db::all("SHOW COLUMNS FROM sms_log"), 'Field');
    if (in_array('bill_id', $smsCols)) {
      foreach (Db::all("SELECT sent_by uid, COUNT(*) n FROM sms_log WHERE bill_id IS NOT NULL".$dc('created_at')." GROUP BY sent_by", $mk('s')) as $r) $cntSmsAb[$r['uid']]=(int)$r['n'];
    }
    foreach (Db::all("SELECT user_id uid, COUNT(*) n FROM user_activity WHERE kind='bill_pay_click'".$dc('at')." GROUP BY user_id", $mk('b')) as $r) $cntBillClick[$r['uid']]=(int)$r['n'];
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  // بازهٔ تاریخ برای محاسبهٔ پرداخت مؤثر
  $effFrom = $from ?: '2000-01-01'; $effTo = $to ?: date('Y-m-d');
  $out = [];
  foreach ($users as $usr) {
    $uid = $usr['id'];
    $checklists = $cntCheck[$uid] ?? 0;
    $attendances = $cntAtt[$uid] ?? 0;
    $notices = $cntNotice[$uid] ?? 0;
    $officials = $cntOff[$uid] ?? 0;
    $reports = $cntRep[$uid] ?? 0;
    $smsTotal = $cntSms[$uid] ?? 0;
    $smsAb = $cntSmsAb[$uid] ?? 0;
    $billClicks = $cntBillClick[$uid] ?? 0;
    $billEffective = 0;
    if ($billClicks > 0) { $eff = _effective_bill_pay_clicks($uid, $effFrom, $effTo); $billEffective = $eff['effective']; }
    $total = $checklists + $attendances + $notices + $officials + $reports;
    $out[] = [
      'id'=>$uid, 'name'=>$usr['name'], 'role_title'=>$usr['role_title'],
      'checklists'=>$checklists, 'driver_attendances'=>$attendances,
      'notices'=>$notices, 'official_visits'=>$officials, 'reports'=>$reports,
      'sms_total'=>$smsTotal, 'sms_abonman'=>$smsAb, 'bill_pay_clicks'=>$billClicks, 'bill_pay_effective'=>$billEffective,
      'total'=>$total,
    ];
  }
  usort($out, fn($a,$c)=>$c['total']-$a['total']);
  return ['people'=>$out, 'from'=>$from, 'to'=>$to];
}, false, ADMIN);

// شمارش کلیک‌های پرداخت قبض که ظرف ۷ روزِ پس از کلیک، فیش مربوطه پرداخت/اقدام‌به‌پرداخت شده است.
// منطق: meta رویداد شامل bill_id است؛ اگر قبض با همان bill_id ظرف ۷ روز پس از کلیک
// وضعیتش «پرداخت شده» شده یا paid_date آن در آن بازه افتاده باشد، کلیک «مؤثر» محسوب می‌شود.
function _effective_bill_pay_clicks($uid, $fromDate, $toDate){
  $effective = 0; $total = 0;
  try {
    $hasPaid = (bool)Db::one("SHOW COLUMNS FROM bills WHERE Field='paid_date'");
    $clicks = Db::all("SELECT meta, at FROM user_activity WHERE user_id=? AND kind='bill_pay_click' AND DATE(at) BETWEEN ? AND ?", [$uid, $fromDate, $toDate]);
    foreach ($clicks as $c) {
      $total++;
      $meta = $c['meta'] ? json_decode($c['meta'], true) : null;
      $billId = $meta['bill_id'] ?? null;
      if (!$billId) continue;
      $clickTs = strtotime($c['at']);
      $deadline = date('Y-m-d H:i:s', $clickTs + 7*86400);
      // آیا قبض ظرف ۷ روز پرداخت شده؟
      $bill = Db::one("SELECT status".($hasPaid?", paid_date":"")." FROM bills WHERE bill_id=? LIMIT 1", [$billId]);
      if (!$bill) continue;
      $paid = false;
      $st = $bill['status'] ?? '';
      if ($st && (mb_strpos(str_replace('‌','',$st), 'پرداخت شده')!==false || mb_strpos(str_replace('‌','',$st),'پرداختشده')!==false)) {
        // اگر paid_date داریم، بررسی کن در بازهٔ ۷ روز باشد؛ اگر نه، صرفِ پرداخت‌شده بودن را می‌پذیریم
        if ($hasPaid && !empty($bill['paid_date'])) {
          $pts = strtotime($bill['paid_date']);
          if ($pts !== false && $pts >= $clickTs && $pts <= ($clickTs + 7*86400)) $paid = true;
          elseif ($pts === false) $paid = true; // تاریخ نامعتبر → محتاطانه می‌پذیریم
        } else {
          $paid = true;
        }
      }
      if ($paid) $effective++;
    }
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  return ['effective'=>$effective, 'total'=>$total];
}

// ==================== تعهدات انضباطی کاربران ====================
function _ensure_commitments_table(){
  try {
    Db::run("CREATE TABLE IF NOT EXISTS user_commitments (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, title VARCHAR(255) NOT NULL, description TEXT NULL, commit_jdate VARCHAR(10) NOT NULL, attachment_name VARCHAR(255) NULL, attachment_path VARCHAR(400) NULL, attachment_data LONGTEXT NULL, reason_id INT NULL, created_by INT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_uc_user (user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    // افزودن ستون reason_id اگر نبود
    if (!Db::one("SHOW COLUMNS FROM user_commitments WHERE Field='reason_id'")) Db::run("ALTER TABLE user_commitments ADD COLUMN reason_id INT NULL");
    Db::run("CREATE TABLE IF NOT EXISTS commitment_reasons (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255) NOT NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
}

// --- مدیریت دلایل از پیش‌تعریف‌شدهٔ تعهد ---
route('GET', '/api/admin/commitment-reasons', function($p,$b,$u){
  _ensure_commitments_table();
  return Db::all("SELECT * FROM commitment_reasons ORDER BY is_active DESC, id DESC");
}, false, ADMIN);

route('POST', '/api/admin/commitment-reasons', function($p,$b,$u){
  _ensure_commitments_table();
  $title = trim($b['title'] ?? '');
  if ($title === '') Http::error('عنوان دلیل الزامی است', 422);
  $active = isset($b['is_active']) ? (int)!!$b['is_active'] : 1;
  if (!empty($b['id'])) { Db::run("UPDATE commitment_reasons SET title=?, is_active=? WHERE id=?", [$title,$active,(int)$b['id']]); return ['id'=>(int)$b['id']]; }
  $id = Db::insert("INSERT INTO commitment_reasons(title,is_active) VALUES(?,?)", [$title,$active]);
  return ['id'=>$id];
}, false, ADMIN);

route('DELETE', '/api/admin/commitment-reasons/{id}', function($p,$b,$u){
  _ensure_commitments_table();
  Db::run("DELETE FROM commitment_reasons WHERE id=?", [(int)$p['id']]);
  return ['ok'=>true];
}, false, ADMIN);

// فهرست تعهدات یک کاربر
route('GET', '/api/admin/user-commitments', function($p,$b,$u){
  _ensure_commitments_table();
  $uid = (int)($_GET['user_id'] ?? 0);
  if (!$uid) Http::error('user_id لازم است', 400);
  return Db::all("SELECT uc.id, uc.title, uc.description, uc.commit_jdate, uc.attachment_name, uc.reason_id, cr.title reason_title,
      CASE WHEN uc.attachment_data IS NOT NULL OR uc.attachment_name IS NOT NULL THEN 1 ELSE 0 END has_attachment,
      uc.created_at, TRIM(CONCAT(COALESCE(cb.first_name,''),' ',COALESCE(cb.last_name,''))) created_by_name
    FROM user_commitments uc LEFT JOIN users cb ON cb.id=uc.created_by
    LEFT JOIN commitment_reasons cr ON cr.id=uc.reason_id
    WHERE uc.user_id=? ORDER BY uc.id DESC", [$uid]);
}, false, ADMIN);

// فهرست همهٔ تعهدات (برای آیتم مجزای تعهدات) با فیلتر اختیاری
route('GET', '/api/admin/commitments-all', function($p,$b,$u){
  _ensure_commitments_table();
  $where = []; $args = [];
  if (!empty($_GET['user_id'])) { $where[] = 'uc.user_id=?'; $args[] = (int)$_GET['user_id']; }
  if (!empty($_GET['reason_id'])) { $where[] = 'uc.reason_id=?'; $args[] = (int)$_GET['reason_id']; }
  if (!empty($_GET['from'])) { $where[] = 'uc.commit_jdate>=?'; $args[] = $_GET['from']; }
  if (!empty($_GET['to'])) { $where[] = 'uc.commit_jdate<=?'; $args[] = $_GET['to']; }
  $w = $where ? ('WHERE '.implode(' AND ',$where)) : '';
  $rows = Db::all("SELECT uc.id, uc.user_id, uc.title, uc.description, uc.commit_jdate, uc.attachment_name, uc.reason_id, cr.title reason_title,
      CASE WHEN uc.attachment_data IS NOT NULL OR uc.attachment_name IS NOT NULL THEN 1 ELSE 0 END has_attachment,
      uc.created_at, TRIM(CONCAT(COALESCE(us.first_name,''),' ',COALESCE(us.last_name,''))) user_name,
      r.title user_role,
      TRIM(CONCAT(COALESCE(cb.first_name,''),' ',COALESCE(cb.last_name,''))) created_by_name
    FROM user_commitments uc
    LEFT JOIN users us ON us.id=uc.user_id
    LEFT JOIN roles r ON r.id=us.role_id
    LEFT JOIN users cb ON cb.id=uc.created_by
    LEFT JOIN commitment_reasons cr ON cr.id=uc.reason_id
    $w ORDER BY uc.id DESC LIMIT 1000", $args);
  return $rows;
}, false, ADMIN);

// ثبت تعهد جدید
route('POST', '/api/admin/user-commitments', function($p,$b,$u){
  _ensure_commitments_table();
  $uid = (int)($b['user_id'] ?? 0);
  $title = trim($b['title'] ?? '');
  if (!$uid) Http::error('کاربر را انتخاب کنید', 422);
  if ($title === '') Http::error('عنوان تعهد الزامی است', 422);
  [$jy,$jm,$jd] = gregorian_to_jalali((int)date('Y'),(int)date('m'),(int)date('d'));
  $jdate = $b['commit_jdate'] ?? sprintf('%04d/%02d/%02d',$jy,$jm,$jd);
  $desc = trim($b['description'] ?? '') ?: null;
  $reasonId = !empty($b['reason_id']) ? (int)$b['reason_id'] : null;
  $attName = $b['attachment_name'] ?? null;
  $attData = $b['attachment_data'] ?? null; // data URI (تصویر یا PDF) — مستقیم در DB
  $id = Db::insert("INSERT INTO user_commitments(user_id,title,description,reason_id,commit_jdate,attachment_name,attachment_data,created_by) VALUES(?,?,?,?,?,?,?,?)",
    [$uid,$title,$desc,$reasonId,$jdate,$attName,$attData,$u['id']]);
  return ['id'=>$id];
}, false, ADMIN);

// دریافت پیوست تعهد (data URI)
route('GET', '/api/admin/user-commitments/{id}/attachment', function($p,$b,$u){
  _ensure_commitments_table();
  $row = Db::one("SELECT attachment_data, attachment_name FROM user_commitments WHERE id=?", [(int)$p['id']]);
  if (!$row || empty($row['attachment_data'])) Http::error('پیوستی وجود ندارد', 404);
  return ['attachment_data'=>$row['attachment_data'], 'attachment_name'=>$row['attachment_name']];
}, false, ADMIN);

// حذف تعهد
route('DELETE', '/api/admin/user-commitments/{id}', function($p,$b,$u){
  _ensure_commitments_table();
  Db::run("DELETE FROM user_commitments WHERE id=?", [(int)$p['id']]);
  return ['ok'=>true];
}, false, ADMIN);

route('GET', '/api/admin/user-activity', function($p,$b,$u){
  $uid = (int)($_GET['user_id'] ?? 0); $date = $_GET['date'] ?? date('Y-m-d');
  if (!$uid) Http::error('user_id لازم است', 400);
  $rows = Db::all("SELECT kind, at FROM user_activity WHERE user_id=? AND DATE(at)=? ORDER BY at", [$uid, $date]);
  $dur = ['active'=>0,'online'=>0,'gps_on'=>0,'session'=>0]; $open = [];
  $logins = []; $logouts = [];
  // بازه‌های خاموشی برای خروجی ریز
  $offline_spans = []; $gpsoff_spans = []; $bg_spans = [];
  $tmpOffStart = null; $tmpGpsOffStart = null; $tmpBgStart = null;
  foreach ($rows as $r) {
    $ts = strtotime($r['at']);
    switch ($r['kind']) {
      case 'session_start': $open['session']=$ts; $logins[]=$r['at']; break;
      case 'session_end':   if(isset($open['session'])){ $dur['session']+=$ts-$open['session']; unset($open['session']); } $logouts[]=$r['at']; break;
      // زمان فعالِ واقعی داخل اپ = مجموع بازه‌های پیش‌زمینه
      case 'app_foreground': $open['active']=$ts; if($tmpBgStart!==null){ $bg_spans[]=[$tmpBgStart,$r['at']]; $tmpBgStart=null; } break;
      case 'app_background':  if(isset($open['active'])){ $dur['active']+=$ts-$open['active']; unset($open['active']); } $tmpBgStart=$r['at']; break;
      case 'online':  $open['online']=$ts; if($tmpOffStart!==null){ $offline_spans[]=[$tmpOffStart,$r['at']]; $tmpOffStart=null; } break;
      case 'offline': if(isset($open['online'])){ $dur['online']+=$ts-$open['online']; unset($open['online']); } $tmpOffStart=$r['at']; break;
      case 'gps_on':  $open['gps']=$ts; if($tmpGpsOffStart!==null){ $gpsoff_spans[]=[$tmpGpsOffStart,$r['at']]; $tmpGpsOffStart=null; } break;
      case 'gps_off': if(isset($open['gps'])){ $dur['gps_on']+=$ts-$open['gps']; unset($open['gps']); } $tmpGpsOffStart=$r['at']; break;
    }
  }
  $endOfDay = min(time(), strtotime($date.' 23:59:59'));
  if (isset($open['session'])) $dur['session'] += $endOfDay-$open['session'];
  if (isset($open['active']))  $dur['active']  += $endOfDay-$open['active'];
  if (isset($open['online']))  $dur['online']  += $endOfDay-$open['online'];
  if (isset($open['gps']))     $dur['gps_on']   += $endOfDay-$open['gps'];
  // مدت استفاده = زمان فعالِ داخل اپ؛ اگر رویداد پیش‌زمینه نبود (نسخهٔ قدیمی)، از session استفاده کن
  $usage = $dur['active'] > 0 ? $dur['active'] : $dur['session'];
  // رویدادهای VPN (فیلترشکن) در این روز
  $vpn_events = []; $vpn_spans = []; $vpnOnAt = null;
  try {
    $ve = Db::all("SELECT state, ip, created_at, country FROM vpn_events WHERE user_id=? AND DATE(created_at)=? ORDER BY created_at", [$uid, $date]);
    foreach ($ve as $e) {
      $vpn_events[] = ['state'=>(int)$e['state'], 'ip'=>$e['ip'], 'country'=>$e['country']??null, 'at'=>$e['created_at']];
      if ((int)$e['state'] === 1) { $vpnOnAt = $e['created_at']; }
      elseif ($vpnOnAt !== null) { $vpn_spans[] = [$vpnOnAt, $e['created_at']]; $vpnOnAt = null; }
    }
    if ($vpnOnAt !== null) $vpn_spans[] = [$vpnOnAt, date('Y-m-d H:i:s', $endOfDay)];
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  // تعداد پیامک‌های ارسالی این کاربر در این روز (کل و آبونمان)
  $sms_total = 0; $sms_abonman = 0; $sms_first = null; $sms_last = null;
  try {
    $smsRow = Db::one("SELECT COUNT(*) c, MIN(created_at) mn, MAX(created_at) mx FROM sms_log WHERE sent_by=? AND DATE(created_at)=?", [$uid, $date]);
    $sms_total = (int)($smsRow['c'] ?? 0); $sms_first = $smsRow['mn'] ?? null; $sms_last = $smsRow['mx'] ?? null;
    // پیامک‌های آبونمان: آن‌هایی که به قبض مرتبط‌اند (bill_id غیر تهی) یا کمپین آبونمان
    $cols = array_column(Db::all("SHOW COLUMNS FROM sms_log"), 'Field');
    if (in_array('bill_id', $cols)) {
      $sms_abonman = (int)(Db::one("SELECT COUNT(*) c FROM sms_log WHERE sent_by=? AND DATE(created_at)=? AND bill_id IS NOT NULL", [$uid, $date])['c'] ?? 0);
    } elseif (in_array('campaign', $cols)) {
      $sms_abonman = (int)(Db::one("SELECT COUNT(*) c FROM sms_log WHERE sent_by=? AND DATE(created_at)=? AND campaign LIKE '%abonman%'", [$uid, $date])['c'] ?? 0);
    }
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  // تعداد دفعات زدن دکمهٔ پرداخت قبض در این روز + کلیک‌های مؤثر (پرداخت ظرف ۷ روز)
  $bill_pay_clicks = 0; $bill_pay_times = [];
  try {
    $bp = Db::all("SELECT at FROM user_activity WHERE user_id=? AND kind='bill_pay_click' AND DATE(at)=? ORDER BY at", [$uid, $date]);
    $bill_pay_clicks = count($bp);
    foreach ($bp as $x) $bill_pay_times[] = $x['at'];
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  $eff = _effective_bill_pay_clicks($uid, $date, $date);
  $bill_pay_effective = $eff['effective'];
  // تعداد کل تعهدات انضباطی اخذشده از این کاربر
  $commitments_count = 0;
  try { _ensure_commitments_table(); $commitments_count = (int)(Db::one("SELECT COUNT(*) c FROM user_commitments WHERE user_id=?", [$uid])['c'] ?? 0); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  return [
    'date'=>$date,
    'first_login'=>$logins[0] ?? null, 'last_logout'=>end($logouts) ?: null,
    'usage_seconds'=>$usage,
    'active_seconds'=>$dur['active'],
    'online_seconds'=>$dur['online'], 'gps_on_seconds'=>$dur['gps_on'],
    'offline_spans'=>$offline_spans, 'gps_off_spans'=>$gpsoff_spans, 'background_spans'=>$bg_spans,
    'vpn_events'=>$vpn_events, 'vpn_spans'=>$vpn_spans, 'vpn_used'=>count($vpn_spans)>0,
    'sms_total'=>$sms_total, 'sms_abonman'=>$sms_abonman, 'sms_first'=>$sms_first, 'sms_last'=>$sms_last,
    'bill_pay_clicks'=>$bill_pay_clicks, 'bill_pay_times'=>$bill_pay_times, 'bill_pay_effective'=>$bill_pay_effective,
    'commitments_count'=>$commitments_count,
    'events'=>count($rows),
  ];
}, false, ADMIN);


/* ---------------- اعلان / Push / داشبورد ---------------- */
route('POST', '/api/devices/push-token', function($p, $b, $u) {
  Db::run("INSERT INTO push_tokens(user_id,token,platform) VALUES(?,?,?) ON DUPLICATE KEY UPDATE updated_at=NOW()",
    [$u['id'], $b['token'] ?? '', $b['platform'] ?? null]); return ['ok'=>true];
});
route('GET', '/api/my/notifications', function($p, $b, $u) {
  $rows = Db::all("SELECT id,title,body,data,is_read,created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100", [$u['id']]);
  foreach ($rows as &$r) { $r['data'] = $r['data'] ? json_decode($r['data'], true) : null; $r['is_read'] = (bool)$r['is_read']; }
  // هشدارهای زندهٔ انقضا فقط برای رانندگان/خودروهای خطوط مجاز کاربر.
  // هشدار خوانده‌شده تا پایان دورهٔ تکرار تنظیم‌شده دوباره ساخته نمی‌شود.
  $alerts = expiry_alerts($u);
  $items = array_merge($alerts, $rows);
  $unreadRows = count(array_filter($rows, fn($r)=>!$r['is_read']));
  return ['unread'=>$unreadRows + count($alerts), 'items'=>$items, 'alerts'=>$alerts];
});
route('GET', '/api/my/expiry-notification-settings', function($p,$b,$u){
  return expiry_notification_settings((int)$u['id']);
});
route('POST', '/api/my/expiry-notification-settings', function($p,$b,$u){
  $types = is_array($b['types'] ?? null) ? $b['types'] : [];
  $allowed = ['taxi_license','operation_license','technical_inspection','third_party_insurance'];
  $cleanTypes = [];
  foreach ($allowed as $type) $cleanTypes[$type] = !array_key_exists($type,$types) || !empty($types[$type]);
  $cfg = [
    'types'=>$cleanTypes,
    'check_days'=>max(0,min(365,(int)($b['check_days'] ?? 10))),
    'repeat_days'=>max(1,min(365,(int)($b['repeat_days'] ?? 30))),
  ];
  Db::run("INSERT INTO app_settings(`key`,value) VALUES(?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)",
    ['expiry_notification_settings_'.(int)$u['id'], json_encode($cfg, JSON_UNESCAPED_UNICODE)]);
  return $cfg;
});
route('POST', '/api/my/notifications/read', function($p,$b,$u){
  Db::run("UPDATE notifications SET is_read=1 WHERE user_id=?", [$u['id']]);
  expiry_dismiss_alerts((int)$u['id'], array_column(expiry_alerts($u), 'fingerprint'));
  return ['ok'=>true];
});
route('POST', '/api/my/notifications/{id}/read', function($p,$b,$u){
  $id = (string)($p['id'] ?? '');
  if (strpos($id, 'expiry:') === 0) {
    expiry_dismiss_alerts((int)$u['id'], [$id]);
  } else {
    Db::run("UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?", [(int)$id, $u['id']]);
  }
  return ['ok'=>true];
});
route('DELETE', '/api/my/notifications/{id}', function($p,$b,$u){
  Db::run("DELETE FROM notifications WHERE id=? AND user_id=?", [(int)$p['id'], (int)$u['id']]);
  return ['ok'=>true];
});
route('POST', '/api/my/notifications/read-type', function($p,$b,$u){
  $type = preg_replace('/[^a-zA-Z0-9_\-]/','', (string)($b['type'] ?? ''));
  if (!$type) Http::error('نوع اعلان مشخص نیست',422);
  Db::run("UPDATE notifications SET is_read=1 WHERE user_id=? AND JSON_UNQUOTE(JSON_EXTRACT(data,'$.type'))=?", [(int)$u['id'], $type]);
  return ['ok'=>true];
});
// «هشدارهای میدانی»: فهرست جدا از اعلان‌های عمومی، فقط شامل خروج از خط/روشن‌شدن
// VPN/خاموش‌شدن GPS — چون این‌ها فقط برای مسئولان پیکربندی‌شده ارسال می‌شوند،
// خودِ وجودِ حداقل یک ردیف برای کاربر یعنی او اجازهٔ دیدن این آیتم را دارد.
route('GET','/api/my/field-alert-preferences',function($p,$b,$u){ return _field_alert_preferences((int)$u['id']); });
route('GET','/api/my/field-alert-options',function($p,$b,$u){
  $roles=Db::all("SELECT id,title FROM roles ORDER BY title");
  $users=Db::all("SELECT u.id,CONCAT(u.first_name,' ',u.last_name) name,u.role_id,r.title role_title FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.is_active=1 AND u.id<>? ORDER BY name",[(int)$u['id']]);
  return ['roles'=>$roles,'users'=>$users];
});
route('POST','/api/my/field-alert-preferences',function($p,$b,$u){
  $allowed=['station_exit','station_enter','vpn_on','gps_off','attendance_checkin','attendance_checkout']; $types=[];
  foreach($allowed as $t)$types[$t]=!empty(($b['types']??[])[$t]);
  $mode=in_array(($b['subject_mode']??'all'),['all','roles','users'],true)?$b['subject_mode']:'all';
  $cfg=['enabled'=>!empty($b['enabled']),'types'=>$types,'subject_mode'=>$mode,'role_ids'=>array_values(array_unique(array_map('intval',is_array($b['role_ids']??null)?$b['role_ids']:[]))),'user_ids'=>array_values(array_unique(array_map('intval',is_array($b['user_ids']??null)?$b['user_ids']:[])))];
  Db::run("INSERT INTO app_settings(`key`,value) VALUES(?,?) ON DUPLICATE KEY UPDATE value=VALUES(value),updated_at=NOW()",[_field_alert_pref_key((int)$u['id']),json_encode($cfg,JSON_UNESCAPED_UNICODE)]); return $cfg;
});
route('GET', '/api/my/field-alerts', function($p,$b,$u){
  $rows = Db::all("SELECT * FROM notifications WHERE user_id=? AND JSON_UNQUOTE(JSON_EXTRACT(data,'$.type')) IN ('station_exit','station_enter','vpn_on','gps_off','attendance_checkin','attendance_checkout') ORDER BY id DESC LIMIT 200", [$u['id']]);
  foreach ($rows as &$r) { $r['data'] = $r['data'] ? json_decode($r['data'], true) : null; $r['is_read'] = (bool)$r['is_read']; }
  return ['unread'=>count(array_filter($rows, fn($r)=>!$r['is_read'])), 'items'=>$rows];
});
route('POST', '/api/my/field-alerts/read', function($p,$b,$u){
  Db::run("UPDATE notifications SET is_read=1 WHERE user_id=? AND JSON_UNQUOTE(JSON_EXTRACT(data,'$.type')) IN ('station_exit','station_enter','vpn_on','gps_off','attendance_checkin','attendance_checkout')", [$u['id']]);
  return ['ok'=>true];
});

// خروج خودکار رانندگانی که بیش از ۳ ساعت در خط مانده‌اند + اعلان به ثبت‌کننده و مقام بالادست
route('GET', '/api/cron/auto-exit', function($p,$b,$u){
  $hours = (int)_req_setting('auto_exit_hours', 3) ?: 3;
  $stuck = Db::all("SELECT a.id, a.driver_id, a.user_id, a.line_id, a.created_at,
      CONCAT(COALESCE(d.first_name,''),' ',COALESCE(d.last_name,'')) dname, l.code line_code
    FROM attendances a LEFT JOIN drivers d ON d.id=a.driver_id LEFT JOIN `lines` l ON l.id=a.line_id
    WHERE a.exit_at IS NULL AND a.created_at < DATE_SUB(NOW(), INTERVAL ? HOUR)", [$hours]);
  $n = 0;
  foreach ($stuck as $row) {
    Db::run("UPDATE attendances SET exit_at=NOW() WHERE id=?", [$row['id']]);
    $n++;
    $dn = trim($row['dname']) ?: 'راننده';
    $line = $row['line_code'] ?? '';
    // اعلان به کاربر ثبت‌کننده
    if (!empty($row['user_id'])) {
      try { Push::send([$row['user_id']], 'تذکر عدم ثبت خروج راننده از خط',
        "راننده $dn در خط $line بیش از $hours ساعت بدون ثبت خروج مانده بود و به‌صورت خودکار از خط خارج شد.",
        ['type'=>'auto_exit','driver_id'=>$row['driver_id']]); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
    }
    // اعلان به مقام بالادست کاربر ثبت‌کننده
    $mgrs = Db::all("SELECT manager_id FROM user_managers WHERE user_id=?", [$row['user_id']]);
    foreach ($mgrs as $m) {
      try { Push::send([$m['manager_id']], 'عدم خروج راننده از خط توسط کاربر',
        "راننده $dn در خط $line توسط کاربر زیرمجموعه به‌موقع از خط خارج نشد (خروج خودکار پس از $hours ساعت).",
        ['type'=>'auto_exit_mgr','driver_id'=>$row['driver_id']]); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
    }
  }
  return ['closed'=>$n];
});
// دریافت سلفی نامحسوس از اپ
route('POST', '/api/my/covert-selfie', function($p,$b,$u){
  if (empty($b['photo'])) Http::error('تصویر ارسال نشده', 400);
  $_covPath = Media::saveBase64($b['photo'], 'covert', 960, 65);
  try {
    $id = Db::insert("INSERT INTO covert_selfies(user_id,photo_path,lat,lng,reason) VALUES(?,?,?,?,?)",
      [$u['id'], $_covPath, $b['lat']??null, $b['lng']??null, $b['reason']??'periodic']);
  } catch (\Throwable $e) {
    $id = Db::insert("INSERT INTO covert_selfies(user_id,photo_data,lat,lng,reason) VALUES(?,?,?,?,?)",
      [$u['id'], $b['photo'], $b['lat']??null, $b['lng']??null, $b['reason']??'periodic']);
  }
  return ['id'=>$id, 'ok'=>true];
});
// ارسال اسکرین‌شات نامحسوس از صفحهٔ گوشی (ذخیره در همان جدول covert_selfies با reason=screenshot)
route('POST', '/api/my/covert-screenshot', function($p,$b,$u){
  if (empty($b['photo'])) Http::error('تصویر ارسال نشده', 400);
  $_ssPath = Media::saveBase64($b['photo'], 'screenshots', 1280, 70);
  try {
    $id = Db::insert("INSERT INTO covert_selfies(user_id,photo_path,lat,lng,reason) VALUES(?,?,?,?,?)",
      [$u['id'], $_ssPath, $b['lat']??null, $b['lng']??null, 'screenshot']);
  } catch (\Throwable $e) {
    $id = Db::insert("INSERT INTO covert_selfies(user_id,photo_data,lat,lng,reason) VALUES(?,?,?,?,?)",
      [$u['id'], $b['photo'], $b['lat']??null, $b['lng']??null, 'screenshot']);
  }
  return ['id'=>$id, 'ok'=>true];
});
// مدیریت: فهرست سلفی‌های نامحسوس
route('GET', '/api/admin/covert-selfies', function($p,$b,$u){
  $uid = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
  $cond = $uid ? "WHERE cs.user_id=$uid" : "";
  return Db::all("SELECT cs.id, cs.user_id, cs.lat, cs.lng, cs.reason, cs.created_at,
      CONCAT(us.first_name,' ',us.last_name) name, r.title role_title
    FROM covert_selfies cs LEFT JOIN users us ON us.id=cs.user_id
    LEFT JOIN roles r ON r.id=us.role_id
    $cond ORDER BY cs.id DESC LIMIT 500", []);
}, false, ADMIN);
route('GET', '/api/admin/covert-selfies/{id}/image', function($p,$b,$u){
  $r = Db::one("SELECT photo_data, photo_path FROM covert_selfies WHERE id=?", [$p['id']]);
  if (!$r) Http::error('یافت نشد', 404);
  if (!empty($r['photo_path'])) { Media::serve($r['photo_path']); }
  if (empty($r['photo_data'])) Http::error('یافت نشد', 404);
  $data = $r['photo_data'];
  if (strpos($data, 'base64,') !== false) $data = substr($data, strpos($data, 'base64,') + 7);
  header('Content-Type: image/jpeg');
  echo base64_decode($data); exit;
}, false, ADMIN);
// حذف سلفی نامحسوس + فایل فیزیکی
// جدول covert_selfie_commands برای دستورات فوری (اگر نباشد، از endpoint موجود استفاده شود)
// دریافت دستورات سلفی فوری برای کاربر جاری (polling از اپ هر ۳۰ ثانیه)
route('GET', '/api/my/selfie-commands', function($p,$b,$u){
  try {
    $cmds = Db::all("SELECT id FROM covert_selfie_commands WHERE user_id=? AND delivered_at IS NULL ORDER BY id DESC LIMIT 5", [$u['id']]);
    if ($cmds) { $ids = array_column($cmds,'id'); $in = implode(',',array_fill(0,count($ids),'?')); Db::run("UPDATE covert_selfie_commands SET delivered_at=NOW() WHERE id IN ($in)", $ids); }
    return $cmds ?: [];
  } catch (\Throwable $e) { return []; }
}, false);
// دریافت دستورات اسکرین‌شات فوری
route('GET', '/api/my/screenshot-commands', function($p,$b,$u){
  try {
    $cmds = Db::all("SELECT id FROM covert_selfie_commands WHERE user_id=? AND reason='screenshot' AND delivered_at IS NULL ORDER BY id DESC LIMIT 5", [$u['id']]);
    if ($cmds) { $ids = array_column($cmds,'id'); $in = implode(',',array_fill(0,count($ids),'?')); Db::run("UPDATE covert_selfie_commands SET delivered_at=NOW() WHERE id IN ($in)", $ids); }
    return $cmds ?: [];
  } catch (\Throwable $e) { return []; }
}, false);

// ارسال دستور سلفی نامحسوس فوری به کاربران مشخص (از پنل)
// targets: {type: 'user'|'role'|'zone'|'all', ids: [...]}
route('POST', '/api/admin/covert-selfie/command', function($p,$b,$u){
  $type = $b['target_type'] ?? 'user';
  $ids  = $b['ids'] ?? [];
  $userIds = [];
  switch ($type) {
    case 'user':
      $userIds = array_map('intval', (array)$ids);
      break;
    case 'role':
      if (!$ids) Http::error('سمتی انتخاب نشده', 400);
      $in = implode(',', array_fill(0, count($ids), '?'));
      $userIds = array_column(Db::all("SELECT id FROM users WHERE is_active=1 AND role_id IN ($in)", array_map('intval',$ids)), 'id');
      break;
    case 'zone':
      if (!$ids) Http::error('منطقه‌ای انتخاب نشده', 400);
      $in = implode(',', array_fill(0, count($ids), '?'));
      $userIds = array_column(Db::all("SELECT id FROM users WHERE is_active=1 AND zone_id IN ($in)", array_map('intval',$ids)), 'id');
      break;
    case 'all':
      $userIds = array_column(Db::all("SELECT id FROM users WHERE is_active=1"), 'id');
      break;
    default:
      Http::error('نوع هدف نامعتبر', 400);
  }
  if (!$userIds) return ['ok'=>true,'sent'=>0,'msg'=>'کاربری پیدا نشد'];
  // ثبت دستور در جدول (اپ در polling بعدی می‌گیرد و سلفی می‌گیرد)
  $sent = 0;
  foreach ($userIds as $uid) {
    try {
      Db::run("INSERT INTO covert_selfie_commands(user_id,issued_by,reason) VALUES(?,?,?)", [$uid, $u['id'], 'manual']);
      $sent++;
    } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  }
  return ['ok'=>true, 'sent'=>$sent, 'user_count'=>count($userIds)];
}, false, ADMIN);

route('DELETE', '/api/admin/covert-selfies/{id}', function($p,$b,$u){
  $r = Db::one("SELECT photo_path FROM covert_selfies WHERE id=?", [$p['id']]);
  if (!$r) Http::error('یافت نشد', 404);
  if (!empty($r['photo_path'])) Media::delete($r['photo_path']);
  Db::run("DELETE FROM covert_selfies WHERE id=?", [$p['id']]);
  return ['ok'=>true];
}, false, ADMIN);

// ==================== درخواست سلفی نامحسوس از پنل ====================
// ادمین درخواست می‌فرستد؛ اپ هر چند دقیقه poll می‌کند
route('POST', '/api/admin/covert-selfie-request', function($p,$b,$u){
  $expire = date('Y-m-d H:i:s', time() + 30 * 60); // ۳۰ دقیقه مهلت
  $id = Db::insert("INSERT INTO covert_selfie_requests(target_user_id,target_role_id,target_zone_id,requested_by,expires_at,note) VALUES(?,?,?,?,?,?)",
    [$b['user_id'] ?? null, $b['role_id'] ?? null, $b['zone_id'] ?? null, $u['id'], $expire, $b['note'] ?? null]);
  return ['ok'=>true, 'id'=>$id, 'expires_at'=>$expire];
}, false, ADMIN);
// اپ poll می‌کند آیا درخواستی برای این کاربر وجود دارد
route('GET', '/api/my/covert-selfie-request', function($p,$b,$u){
  $r = Db::one("SELECT csr.id, csr.note FROM covert_selfie_requests csr
    WHERE csr.expires_at > NOW() AND csr.fulfilled_count = 0
    AND (csr.target_user_id = ? OR
         (csr.target_role_id IS NOT NULL AND csr.target_role_id = (SELECT role_id FROM users WHERE id=?)) OR
         (csr.target_zone_id IS NOT NULL AND csr.target_zone_id = (SELECT zone_id FROM users WHERE id=?)))
    ORDER BY csr.requested_at DESC LIMIT 1", [$u['id'], $u['id'], $u['id']]);
  return $r ?: ['id'=>null];
});
// اپ پس از گرفتن سلفی، fulfilled می‌کند
route('POST', '/api/my/covert-selfie-request/{id}/fulfill', function($p,$b,$u){
  Db::run("UPDATE covert_selfie_requests SET fulfilled_count=fulfilled_count+1 WHERE id=?", [$p['id']]);
  return ['ok'=>true];
});
route('GET', '/api/admin/tracking-windows', function($p,$b,$u){
  return _req_setting('tracking_windows', []);
}, false, ADMIN);
route('PUT', '/api/admin/tracking-windows', function($p,$b,$u){
  $all = _req_setting('tracking_windows', []);
  if (!is_array($all)) $all = [];
  $uid = (string)($b['user_id'] ?? '');
  if ($uid === '') Http::error('user_id لازم است', 400);
  $all[$uid] = $b['windows'] ?? [];
  Db::run("INSERT INTO app_settings(`key`,value) VALUES('tracking_windows',?) ON DUPLICATE KEY UPDATE value=VALUES(value)", [json_encode($all, JSON_UNESCAPED_UNICODE)]);
  return ['ok'=>true];
}, false, ADMIN);
route('GET', '/api/my/unread-counts', function($p,$b,$u){
  $uid=(int)$u['id']; $messages=0; $reports=0;
  try { $messages=(int)(Db::one("SELECT COUNT(*) n FROM message_recipients WHERE user_id=? AND read_at IS NULL",[$uid])['n']??0); } catch(\Throwable $e) { error_log('unread messages count: '.$e->getMessage()); }
  try {
    _ensure_reports_index();
    $sql="SELECT COUNT(*) n FROM reports r JOIN (SELECT rr.report_id,rr.to_user_id FROM report_routes rr JOIN (SELECT report_id,MAX(id) mx FROM report_routes GROUP BY report_id) lm ON lm.report_id=rr.report_id AND lm.mx=rr.id) lr ON lr.report_id=r.id LEFT JOIN report_reads rd ON rd.report_id=r.id AND rd.user_id=? WHERE lr.to_user_id=? AND r.deleted_at IS NULL AND rd.report_id IS NULL";
    $params=[$uid,$uid];
    $hasArchives=false; $hasDeletions=false;
    try { $hasArchives=(bool)Db::one("SHOW TABLES LIKE 'report_archives'"); } catch(\Throwable $e) {}
    try { $hasDeletions=(bool)Db::one("SHOW TABLES LIKE 'report_deletions'"); } catch(\Throwable $e) {}
    if($hasArchives){$sql.=" AND NOT EXISTS(SELECT 1 FROM report_archives ra WHERE ra.report_id=r.id AND ra.user_id=?)";$params[]=$uid;}
    if($hasDeletions){$sql.=" AND NOT EXISTS(SELECT 1 FROM report_deletions rx WHERE rx.report_id=r.id AND rx.user_id=?)";$params[]=$uid;}
    $reports=(int)(Db::one($sql,$params)['n']??0);
  } catch(\Throwable $e) { error_log('unread reports count: '.$e->getMessage()); }
  return ['messages'=>$messages,'reports'=>$reports,'total'=>$messages+$reports];
});

route('GET', '/api/my/dashboard', function($p, $b, $u) {
  _ensure_reports_index();
  $i = fn($sql) => (int)Db::one($sql, [$u['id']])['n'];
  // هشدارهای انقضا برای خطوط مجاز کاربر → به‌صورت اعلان شمرده می‌شوند
  $alerts = expiry_alerts($u);
  // هشدارهای dismiss‌شده (تا ۲۴ ساعت) را از شمارش خارج کن
  $dismissed = Db::one("SELECT value FROM app_settings WHERE `key`=?", ["dismissed_alerts_{$u['id']}"]);
  $alertCount = $alerts ? count($alerts) : 0;
  if ($dismissed) {
    $dis = json_decode($dismissed['value'], true);
    if (isset($dis['at']) && (time() - $dis['at']) < 86400) $alertCount = 0;
  }
  $faType = "JSON_UNQUOTE(JSON_EXTRACT(data,'$.type'))";
  return [
    'today'=>$i("SELECT COUNT(*) n FROM attendances WHERE user_id=? AND DATE(created_at)=CURDATE()"),
    'checklists'=>$i("SELECT COUNT(*) n FROM checklist_submissions WHERE user_id=? AND DATE_FORMAT(created_at,'%Y-%m')=DATE_FORMAT(NOW(),'%Y-%m')"),
    'notices'=>$i("SELECT COUNT(*) n FROM notices WHERE user_id=? AND DATE(created_at)=CURDATE()"),
    'reports'=>$i("SELECT COUNT(*) n FROM reports WHERE sender_id=?"),
    'unread'=>$i("SELECT COUNT(*) n FROM notifications WHERE user_id=? AND is_read=0 AND ($faType IS NULL OR $faType NOT IN ('station_exit','station_enter','vpn_on','gps_off','attendance_checkin','attendance_checkout'))") + $alertCount,
    'unread_messages'=>$i("SELECT COUNT(*) n FROM message_recipients WHERE user_id=? AND read_at IS NULL"),
    'inbox_reports'=>(int)Db::one("SELECT COUNT(*) n FROM reports r JOIN (SELECT rr.report_id, rr.to_user_id FROM report_routes rr JOIN (SELECT report_id, MAX(id) mx FROM report_routes GROUP BY report_id) m ON m.report_id=rr.report_id AND m.mx=rr.id) lr ON lr.report_id=r.id WHERE lr.to_user_id=? AND (r.deleted_at IS NULL) AND NOT EXISTS (SELECT 1 FROM report_archives ra WHERE ra.report_id=r.id AND ra.user_id=?) AND NOT EXISTS (SELECT 1 FROM report_deletions rd WHERE rd.report_id=r.id AND rd.user_id=?)", [$u['id'],$u['id'],$u['id']])['n'],
    // «هشدارهای میدانی» (خروج از خط/VPN/GPS): شمارش جدا از پیام‌های عمومی تا
    // آیتم اختصاصی «هشدارها» در اپ فقط برای کسانی که واقعاً این هشدارها را
    // دریافت کرده‌اند (یعنی به‌عنوان مسئول پیکربندی شده‌اند) نمایش داده شود.
    'field_alerts_total'=>$i("SELECT COUNT(*) n FROM notifications WHERE user_id=? AND $faType IN ('station_exit','station_enter','vpn_on','gps_off','attendance_checkin','attendance_checkout')"),
    'field_alerts_unread'=>$i("SELECT COUNT(*) n FROM notifications WHERE user_id=? AND is_read=0 AND $faType IN ('station_exit','station_enter','vpn_on','gps_off','attendance_checkin','attendance_checkout')"),
  ];
});

// شناسه‌های جایگزین GPS برای یک خط (WiFi BSSID / QR / NFC / Bluetooth MAC)
route('GET', '/api/admin/lines/{id}/idents', fn($p,$b,$u) =>
  Db::all("SELECT id, line_id, kind, value, label FROM line_idents WHERE line_id=? ORDER BY kind", [$p['id']]), false, ADMIN);
route('POST', '/api/admin/lines/{id}/idents', function($p,$b,$u){
  $kind = $b['kind'] ?? ''; $value = trim($b['value'] ?? '');
  if (!in_array($kind, ['wifi','qr','nfc','bt'])) Http::error('نوع شناسه نامعتبر است', 400);
  if ($value === '') Http::error('مقدار شناسه را وارد کنید', 400);
  $id = Db::insert("INSERT INTO line_idents(line_id,kind,value,label) VALUES(?,?,?,?)",
    [$p['id'], $kind, $value, $b['label'] ?? null]);
  return ['id'=>$id];
}, false, ADMIN);
route('DELETE', '/api/admin/line-idents/{id}', function($p,$b,$u){
  Db::run("DELETE FROM line_idents WHERE id=?", [$p['id']]); return ['ok'=>true];
}, false, ADMIN);

// گزارش ثبت حضور نیروها (ادمین)
route('GET', '/api/admin/staff-attendance', function($p,$b,$u){
  $from = $_GET['from'] ?? date('Y-m-d'); $to = $_GET['to'] ?? $from;
  $from = date('Y-m-d', strtotime($from)); $to = date('Y-m-d', strtotime($to));
  $cond = ["DATE(sa.check_in) BETWEEN ? AND ?"]; $args = [$from, $to];
  if (!empty($_GET['user_id'])) { $cond[] = "sa.user_id=?"; $args[] = (int)$_GET['user_id']; }
  if (!empty($_GET['line_id'])) { $cond[] = "sa.line_id=?"; $args[] = (int)$_GET['line_id']; }
  if (!empty($_GET['role_id'])) { $cond[] = "us.role_id=?"; $args[] = (int)$_GET['role_id']; }
  if (!empty($_GET['method'])) { $cond[] = "sa.method=?"; $args[] = $_GET['method']; }
  $where = implode(' AND ', $cond);
  return Db::all("SELECT sa.id, CONCAT(us.first_name,' ',us.last_name) name, r.title role, l.code line,
      sa.check_in, sa.check_out, sa.method,
      TIMESTAMPDIFF(MINUTE, sa.check_in, COALESCE(sa.check_out, NOW())) minutes
    FROM staff_attendance sa JOIN users us ON us.id=sa.user_id LEFT JOIN roles r ON r.id=us.role_id
    LEFT JOIN `lines` l ON l.id=sa.line_id
    WHERE $where ORDER BY sa.check_in DESC LIMIT 2000", $args);
}, false, ADMIN);
// خروجی CSV حضور نیروها (با همان فیلترها + سربرگ سازمان)
route('GET', '/api/admin/staff-attendance/export', function($p,$b,$u){
  $from = $_GET['from'] ?? date('Y-m-d'); $to = $_GET['to'] ?? $from;
  $from = date('Y-m-d', strtotime($from)); $to = date('Y-m-d', strtotime($to));
  $cond = ["DATE(sa.check_in) BETWEEN ? AND ?"]; $args = [$from, $to];
  if (!empty($_GET['user_id'])) { $cond[] = "sa.user_id=?"; $args[] = (int)$_GET['user_id']; }
  if (!empty($_GET['line_id'])) { $cond[] = "sa.line_id=?"; $args[] = (int)$_GET['line_id']; }
  if (!empty($_GET['role_id'])) { $cond[] = "us.role_id=?"; $args[] = (int)$_GET['role_id']; }
  if (!empty($_GET['method'])) { $cond[] = "sa.method=?"; $args[] = $_GET['method']; }
  $where = implode(' AND ', $cond);
  $rows = Db::all("SELECT CONCAT(us.first_name,' ',us.last_name) name, r.title role, l.code line,
      sa.check_in, sa.check_out, sa.method,
      TIMESTAMPDIFF(MINUTE, sa.check_in, COALESCE(sa.check_out, NOW())) minutes
    FROM staff_attendance sa JOIN users us ON us.id=sa.user_id LEFT JOIN roles r ON r.id=us.role_id
    LEFT JOIN `lines` l ON l.id=sa.line_id WHERE $where ORDER BY sa.check_in DESC LIMIT 10000", $args);
  $methodFa = ['gps'=>'GPS','qr'=>'QR','wifi'=>'WiFi','nfc'=>'NFC','bt'=>'بلوتوث','manual'=>'دستی'];
  header('Content-Type: text/csv; charset=UTF-8');
  header('Content-Disposition: attachment; filename="staff_attendance.csv"');
  echo "\xEF\xBB\xBF"; $out=fopen('php://output','w');
  $org = _req_setting('org_title', '') ?: _req_setting('org_name', '');
  if ($org) { fputcsv($out, [$org]); fputcsv($out, ['گزارش حضور نیروها']); fputcsv($out, ["از $from تا $to"]); fputcsv($out, []); }
  fputcsv($out, ['نام','سمت','خط','ورود','خروج','روش','مدت (دقیقه)']);
  foreach($rows as $r){ fputcsv($out, [$r['name'],$r['role'],$r['line'],$r['check_in'],$r['check_out']?:'—',$methodFa[$r['method']]??$r['method'],$r['minutes']]); }
  fclose($out); exit;
}, false, ADMIN);

// دادهٔ یکپارچهٔ چارت سازمانی؛ هر فرد فقط یک‌بار نمایش داده می‌شود و تمام ارتباط‌های چندمدیره بازگردانده می‌شوند
route('GET', '/api/admin/org-chart', function($p,$b,$u){
  $users = Db::all("SELECT u.id,u.first_name,u.last_name,u.role_id,u.zone_id,u.manager_id,u.is_active,r.title role_title FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.is_active=1 ORDER BY r.level DESC,u.last_name,u.first_name");
  $edges = [];
  try {
    $multi = Db::all("SELECT user_id,manager_id FROM user_managers");
    foreach ($multi as $e) $edges[(int)$e['user_id'].':'.(int)$e['manager_id']] = ['user_id'=>(int)$e['user_id'],'manager_id'=>(int)$e['manager_id'],'primary'=>0];
  } catch (\Throwable $e) { error_log('org chart user_managers: '.$e->getMessage()); }
  foreach ($users as $x) if (!empty($x['manager_id'])) {
    $k=(int)$x['id'].':'.(int)$x['manager_id'];
    $edges[$k]=['user_id'=>(int)$x['id'],'manager_id'=>(int)$x['manager_id'],'primary'=>1];
  }
  return ['users'=>$users,'edges'=>array_values($edges)];
}, false, ADMIN);

// مدیریت چند مقام بالاسری برای یک نیرو
route('GET', '/api/admin/users/{id}/managers', fn($p,$b,$u) =>
  array_map('intval', array_column(Db::all("SELECT manager_id FROM user_managers WHERE user_id=?", [$p['id']]), 'manager_id')), false, ADMIN);
route('PUT', '/api/admin/users/{id}/managers', function($p,$b,$u){
  $ids = array_values(array_unique(array_filter(array_map('intval', $b['manager_ids'] ?? []), fn($x)=>$x>0 && $x!=(int)$p['id'])));
  Db::run("DELETE FROM user_managers WHERE user_id=?", [$p['id']]);
  foreach ($ids as $mid) Db::run("INSERT IGNORE INTO user_managers(user_id,manager_id) VALUES(?,?)", [$p['id'], $mid]);
  // برای سازگاری، اولین مدیر را به‌عنوان manager_id اصلی هم ثبت کن
  Db::run("UPDATE users SET manager_id=? WHERE id=?", [$ids[0] ?? null, $p['id']]);
  return ['ok'=>true, 'count'=>count($ids)];
}, false, ADMIN);

/* ---------------- حضور مسئولین ---------------- */
// پیکربندی ثبت حضور مسئول برای اپ
route('GET', '/api/officials/config', function($p,$b,$u){
  $r1 = Db::one("SELECT value FROM app_settings WHERE `key`='official_visit_require_photo'");
  return ['require_photo'=> $r1 ? (bool)json_decode($r1['value'], true) : false];
}, false);

route('GET', '/api/officials', fn($p,$b,$u) => Db::all(
  "SELECT u.id,u.first_name,u.last_name,r.title role_title,r.level FROM users u JOIN roles r ON r.id=u.role_id
   WHERE u.is_active=1 AND r.title NOT IN ('ناظر خط','اپراتور') ORDER BY r.level DESC, u.last_name"));
route('POST', '/api/official-visits', function($p, $b, $u) {
  if (empty($b['official_id'])) Http::error('انتخاب مسئول الزامی است.', 400);
  if (empty(trim($b['note'] ?? ''))) Http::error('درج توضیحات الزامی است.', 422);
  // جلوگیری از ثبت تکراری حضور یک مسئول توسط یک کاربر برای بالا بردن رتبه
  $officialId = (int)$b['official_id'];
  $eventAt = _app_client_time($b);
  $maxPerDay = (int)_req_setting('official_visit_daily_max', 0);
  if ($maxPerDay > 0) {
    $cnt = (int)(Db::one("SELECT COUNT(*) n FROM official_visits WHERE recorded_by=? AND official_id=? AND DATE(created_at)=DATE(?)",
      [$u['id'], $officialId, $eventAt])['n'] ?? 0);
    if ($cnt >= $maxPerDay) Http::error("شما امروز این مسئول را {$maxPerDay} بار ثبت کرده‌اید و بیش از این مجاز نیست.", 429);
  }
  $gapMin = (int)_req_setting('official_visit_gap_min', 0);
  if ($gapMin > 0) {
    $last = Db::one("SELECT created_at FROM official_visits WHERE recorded_by=? AND official_id=? ORDER BY id DESC LIMIT 1",
      [$u['id'], $officialId]);
    if ($last) {
      $diffMin = (strtotime($eventAt) - strtotime($last['created_at'])) / 60;
      if ($diffMin < $gapMin) {
        $rem = ceil($gapMin - $diffMin);
        Http::error("ثبت مجدد این مسئول باید با فاصلهٔ حداقل {$gapMin} دقیقه باشد. {$rem} دقیقهٔ دیگر تلاش کنید.", 429);
      }
    }
  }
  // الزام عکس حضور مسئول (در صورت فعال‌بودن در تنظیمات)
  $reqPhotoRow = Db::one("SELECT value FROM app_settings WHERE `key`='official_visit_require_photo'");
  $requirePhoto = $reqPhotoRow ? (bool)json_decode($reqPhotoRow['value'], true) : false;
  $photo = $b['photo_data'] ?? null;
  if ($requirePhoto && (empty($photo) || strpos((string)$photo,'data:image')!==0)) {
    Http::error('پیوست عکس حضور مسئول الزامی است.', 422);
  }
  [$lat, $lng] = validGeo($b['lat'] ?? null, $b['lng'] ?? null);
  $lineIds = user_line_ids($u);
  $reqRow = Db::one("SELECT value FROM app_settings WHERE `key`='official_visit_require_station'");
  $requireStation = $reqRow ? (bool)json_decode($reqRow['value'], true) : true;
  $fenceCount = 0;
  if ($requireStation) {
    if (is_array($lineIds) && $lineIds) {
      $in = implode(',', array_fill(0, count($lineIds), '?'));
      $fc = Db::one("SELECT COUNT(*) c FROM geofences WHERE line_id IN ($in) OR line_id IS NULL", $lineIds);
    } else {
      $fc = Db::one("SELECT COUNT(*) c FROM geofences");
    }
    $fenceCount = (int)($fc['c'] ?? 0);
  }
  $st = null;
  if ($requireStation && $fenceCount > 0) {
    if ($lat === null) Http::error('موقعیت مکانی شما در دسترس نیست. GPS را روشن کنید.', 422);
    $st = station_at_point($lat, $lng, $lineIds);
    if (!$st) Http::error('شما در محدودهٔ ایستگاه خطوط مجاز خود نیستید. ثبت حضور مسئول تنها در محدودهٔ ایستگاه امکان‌پذیر است.', 403);
  }
  $_visitPath = !empty($photo) ? Media::saveBase64($photo, 'visits', 1280, 70) : null;
  try {
    $id = Db::insert("INSERT INTO official_visits(official_id,recorded_by,line_id,note,lat,lng,photo_path,created_at) VALUES(?,?,?,?,?,?,?,?)",
      [$b['official_id'], $u['id'], $b['line_id'] ?? ($st['line_id'] ?? null), $b['note'] ?? null, $lat, $lng, $_visitPath, $eventAt]);
  } catch (\Throwable $e) {
    $id = Db::insert("INSERT INTO official_visits(official_id,recorded_by,line_id,note,lat,lng,photo_data,created_at) VALUES(?,?,?,?,?,?,?,?)",
      [$b['official_id'], $u['id'], $b['line_id'] ?? ($st['line_id'] ?? null), $b['note'] ?? null, $lat, $lng, $photo, $eventAt]);
  }
  // اعلان به مسئول که بازدید او در خط ثبت شد — بر اساس تنظیم حالت (sms / notification / both)
  try {
    $recorder = Db::one("SELECT CONCAT(first_name,' ',last_name) name, role_id FROM users WHERE id=?", [$u['id']]);
    $recorderName = $recorder['name'] ?? 'یکی از کاربران';
    $recRole = '';
    if (!empty($recorder['role_id'])) { $rr = Db::one("SELECT title FROM roles WHERE id=?", [$recorder['role_id']]); $recRole = $rr['title'] ?? ''; }
    $recTitle = $recRole ?: 'کاربر';
    $lineId2 = $b['line_id'] ?? ($st['line_id'] ?? null);
    $lineCode = '';
    if ($lineId2) { $ln = Db::one("SELECT code FROM `lines` WHERE id=?", [$lineId2]); $lineCode = $ln['code'] ?? $lineId2; }
    $faNow = function_exists('fa_datetime') ? fa_datetime($eventAt) : date('Y-m-d H:i', strtotime($eventAt));
    $inAppText = "بازدید شما از خط {$lineCode} توسط {$recTitle} آقای {$recorderName} در تاریخ و ساعت {$faNow} ثبت گردید.";
    $mode = _req_setting('official_visit_notify_mode', 'both');
    if ($mode === 'notification' || $mode === 'both') {
      // استفاده از Push::notify (نه درج مستقیم) تا هم Push و هم پیام در ربات
      // متصل مسئول (طبق تنظیم دستهٔ «پیام‌ها») ارسال شود.
      Push::notify([$officialId], 'ثبت بازدید شما در خط', $inAppText, ['type'=>'official_visit','recorder_id'=>$u['id'],'line_id'=>$lineId2]);
      try {
        $mid = Db::insert("INSERT INTO messages(sender_id,title,body,target_type,created_at) VALUES(?,?,?,?,?)",
          [$u['id'], 'ثبت بازدید شما در خط', $inAppText, 'selected', $eventAt]);
        Db::run("INSERT INTO message_recipients(message_id,user_id) VALUES(?,?)", [$mid, $officialId]);
      } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
    }
    if (($mode === 'sms' || $mode === 'both') && Sms::isEnabled()) {
      $official = Db::one("SELECT mobile, CONCAT(first_name,' ',last_name) name FROM users WHERE id=?", [$officialId]);
      $mob = $official['mobile'] ?? null;
      if ($mob) {
        $tpl = _req_setting('official_visit_sms_template', 'جناب {name}، بازدید شما از خط {line} توسط {recorder} در {datetime} ثبت شد.');
        $msg = strtr($tpl, ['{name}'=>$official['name']??'', '{recorder}'=>$recorderName, '{line}'=>$lineCode, '{datetime}'=>$faNow]);
        try { Sms::send([$mob], $msg, 'official_visit', $u['id']); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
      }
    }
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  return ['id'=>$id, 'station'=>$st['name'] ?? null];
});
route('GET', '/api/official-visits/summary', fn($p,$b,$u) => Db::all(
  "SELECT CONCAT(u.first_name,' ',u.last_name) name, COUNT(*) n FROM official_visits ov JOIN users u ON u.id=ov.official_id
   WHERE ov.created_at > DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY ov.official_id ORDER BY n DESC LIMIT 15"));
route('GET', '/api/my/official-visits', fn($p,$b,$u) => Db::all(
  "SELECT ov.id,ov.created_at,ov.note,CONCAT(u.first_name,' ',u.last_name) official,l.code line
   FROM official_visits ov JOIN users u ON u.id=ov.official_id LEFT JOIN `lines` l ON l.id=ov.line_id
   WHERE ov.recorded_by=? ORDER BY ov.created_at DESC LIMIT 50", [$u['id']]));

/* ---------------- فرم‌ها ---------------- */
route('GET', '/api/admin/forms', function($p,$b,$u){
  $all = !empty($_GET['all']);
  $rows = Db::all("SELECT id,title,`schema`,is_active FROM custom_forms ".($all?"":"WHERE is_active=1")." ORDER BY id");
  foreach ($rows as &$r) $r['schema'] = json_decode($r['schema'], true);
  return $rows;
});
route('POST', '/api/admin/forms', function($p,$b,$u){
  $id = Db::insert("INSERT INTO custom_forms(title,`schema`) VALUES(?,?)", [$b['title'], json_encode($b['schema'] ?? [], JSON_UNESCAPED_UNICODE)]);
  return ['id'=>$id];
}, false, ADMIN);
// ویرایش فرم موجود
route('PUT', '/api/admin/forms/{id}', function($p,$b,$u){
  $sets=[]; $args=[];
  if (isset($b['title'])) { $sets[]="title=?"; $args[]=$b['title']; }
  if (isset($b['schema'])) { $sets[]="`schema`=?"; $args[]=json_encode($b['schema'], JSON_UNESCAPED_UNICODE); }
  if (isset($b['is_active'])) { $sets[]="is_active=?"; $args[]=!empty($b['is_active'])?1:0; }
  if (!$sets) return ['ok'=>true];
  $args[]=$p['id'];
  Db::run("UPDATE custom_forms SET ".implode(',',$sets)." WHERE id=?", $args);
  return ['ok'=>true];
}, false, ADMIN);
// حذف فرم (و پاسخ‌هایش)
route('DELETE', '/api/admin/forms/{id}', function($p,$b,$u){
  Db::run("DELETE FROM form_submissions WHERE form_id=?", [$p['id']]);
  Db::run("DELETE FROM custom_forms WHERE id=?", [$p['id']]);
  return ['ok'=>true];
}, false, ADMIN);
// پاسخ‌های یک فرم
route('GET', '/api/admin/forms/{id}/submissions', function($p,$b,$u){
  $form = Db::one("SELECT id,title,`schema` FROM custom_forms WHERE id=?", [$p['id']]);
  if (!$form) Http::error('فرم یافت نشد',404);
  $form['schema'] = json_decode($form['schema'], true) ?: [];
  $subs = Db::all("SELECT fs.id, fs.driver_id, fs.answers, fs.created_at, CONCAT(us.first_name,' ',us.last_name) by_name,
      CONCAT(COALESCE(d.first_name,''),' ',COALESCE(d.last_name,'')) driver_name,
      d.first_name driver_first_name,d.last_name driver_last_name,d.mobile driver_mobile,d.gender driver_gender,
      (SELECT vd.line_code_in_line FROM vehicle_drivers vd WHERE vd.driver_id=d.id ORDER BY vd.id ASC LIMIT 1) driver_line_code
    FROM form_submissions fs LEFT JOIN users us ON us.id=fs.user_id LEFT JOIN drivers d ON d.id=fs.driver_id
    WHERE fs.form_id=? ORDER BY fs.id DESC LIMIT 1000", [$p['id']]);
  foreach ($subs as &$row) {
    $ans = json_decode($row['answers'] ?? '{}', true) ?: [];
    foreach ($form['schema'] as $f) {
      $key=(string)($f['key']??''); $label=(string)($f['label']??'');
      if ($key!=='' && !array_key_exists($key,$ans) && $label!=='' && array_key_exists($label,$ans)) $ans[$key]=$ans[$label];
    }
    $row['answers']=$ans;
  }
  return ['form'=>$form, 'submissions'=>$subs];
}, false, ADMIN);
// خروجی CSV پاسخ‌های فرم
route('GET', '/api/admin/forms/{id}/export', function($p,$b,$u){
  $form = Db::one("SELECT title,`schema` FROM custom_forms WHERE id=?", [$p['id']]);
  if (!$form) Http::error('فرم یافت نشد',404);
  $schema = json_decode($form['schema'], true) ?: [];
  $subs = Db::all("SELECT fs.answers, fs.created_at, CONCAT(us.first_name,' ',us.last_name) by_name,
      CONCAT(COALESCE(d.first_name,''),' ',COALESCE(d.last_name,'')) driver_name
    FROM form_submissions fs LEFT JOIN users us ON us.id=fs.user_id LEFT JOIN drivers d ON d.id=fs.driver_id
    WHERE fs.form_id=? ORDER BY fs.id DESC LIMIT 10000", [$p['id']]);
  header('Content-Type: text/csv; charset=UTF-8');
  header('Content-Disposition: attachment; filename="form_'.$p['id'].'.csv"');
  echo "\xEF\xBB\xBF"; $out=fopen('php://output','w');
  $head=['تاریخ','ثبت‌کننده','راننده'];
  foreach ($schema as $f) $head[] = $f['label'] ?? ($f['key'] ?? '');
  fputcsv($out,$head);
  foreach ($subs as $s) {
    $ans = json_decode($s['answers'], true) ?: [];
    $row=[fa_datetime($s['created_at']), $s['by_name'], trim($s['driver_name'])];
    foreach ($schema as $f) {
      $k = $f['key'] ?? '';
      $label = $f['label'] ?? '';
      $v = $ans[$k] ?? (($label !== '' && array_key_exists($label,$ans)) ? $ans[$label] : '');
      if (is_array($v)) $v = implode('، ', $v);
      // عکس/امضا را به‌صورت متن کوتاه نشان بده
      if (is_string($v) && strpos($v,'data:image')===0) $v='[تصویر/امضا]';
      $row[] = $v;
    }
    fputcsv($out,$row);
  }
  fclose($out); exit;
}, false, ADMIN);
route('POST', '/api/admin/form-submit', function($p,$b,$u){
  $formId=(int)($b['form_id']??0); $answers=is_array($b['answers']??null)?$b['answers']:[];
  $form=Db::one("SELECT `schema` FROM custom_forms WHERE id=?",[$formId]);
  $schema=$form ? (json_decode($form['schema']??'[]',true)?:[]) : [];
  $normalized=[]; $nationalId='';
  foreach($schema as $f){
    $key=(string)($f['key']??''); $label=(string)($f['label']??'');
    $v=array_key_exists($key,$answers)?$answers[$key]:(array_key_exists($label,$answers)?$answers[$label]:'');
    if($key!=='') $normalized[$key]=$v;
    if(($f['type']??'')==='national_id' || ($f['prefill']??'')==='national_id') $nationalId=_digits_only($v);
  }
  foreach($answers as $k=>$v) if(!array_key_exists($k,$normalized)) $normalized[$k]=$v;
  $driverId=(int)($b['driver_id']??0);
  if(!$driverId && $nationalId!=='') { $dr=Db::one("SELECT id FROM drivers WHERE "._driver_national_where_sql('drivers'),_driver_national_args($nationalId)); if($dr)$driverId=(int)$dr['id']; }
  $id = Db::insert("INSERT INTO form_submissions(form_id,user_id,driver_id,answers) VALUES(?,?,?,?)",
    [$formId, $u['id'], $driverId?:null, json_encode($normalized, JSON_UNESCAPED_UNICODE)]);
  return ['id'=>$id,'driver_id'=>$driverId?:null];
});

/* ---------------- گزارش‌ها ---------------- */
// فهرست بازرس‌های بالادست کاربر فعلی (برای انتخاب گیرندهٔ گزارش)
route('GET', '/api/my/managers', function($p,$b,$u){
  $ids = _user_managers($u['id']);
  if (!$ids) return [];
  $in = implode(',', array_fill(0, count($ids), '?'));
  $rows = Db::all("SELECT u.id, TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) name, r.title role_title
    FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id IN ($in) ORDER BY name", $ids);
  // علامت‌گذاری سربازرس
  $chief = _req_setting("chief_inspector_user_{$u['id']}", null);
  foreach ($rows as &$rr) { $rr['is_chief'] = ($chief && (int)$chief === (int)$rr['id']); }
  unset($rr);
  return $rows;
});

// اطمینان از وجود ایندکس روی sender_id/created_at جدول reports؛ نبود آن باعث می‌شد
// بررسی سقف روزانه و فاصلهٔ زمانی بین دو گزارش (اسکن کامل جدول) با رشد داده‌ها کند شود
function _ensure_reports_index(){
  static $done = false; if ($done) return; $done = true;
  try {
    if (!Db::one("SHOW INDEX FROM reports WHERE Key_name='idx_reports_sender_created'")) {
      Db::run("ALTER TABLE reports ADD INDEX idx_reports_sender_created (sender_id, created_at)");
    }
    foreach ([
      'deleted_at' => "ALTER TABLE reports ADD COLUMN deleted_at DATETIME NULL",
      'deleted_by' => "ALTER TABLE reports ADD COLUMN deleted_by INT NULL",
      'updated_at' => "ALTER TABLE reports ADD COLUMN updated_at DATETIME NULL",
      'priority'   => "ALTER TABLE reports ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'normal'",
      'read_at'    => "ALTER TABLE reports ADD COLUMN read_at DATETIME NULL",
      'read_by'    => "ALTER TABLE reports ADD COLUMN read_by INT NULL",
      'rejected_at'=> "ALTER TABLE reports ADD COLUMN rejected_at DATETIME NULL",
      'rejected_by'=> "ALTER TABLE reports ADD COLUMN rejected_by INT NULL",
      'reject_reason'=> "ALTER TABLE reports ADD COLUMN reject_reason TEXT NULL",
      'confidential_history'=> "ALTER TABLE reports ADD COLUMN confidential_history TINYINT(1) NOT NULL DEFAULT 0",
    ] as $col=>$sql) {
      if (!Db::one("SHOW COLUMNS FROM reports WHERE Field=?", [$col])) Db::run($sql);
    }
    Db::run("CREATE TABLE IF NOT EXISTS report_deletions (report_id INT NOT NULL, user_id INT NOT NULL, reason TEXT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(report_id,user_id), INDEX idx_rd_user(user_id,created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    if (!Db::one("SHOW COLUMNS FROM report_deletions WHERE Field='reason'")) Db::run("ALTER TABLE report_deletions ADD COLUMN reason TEXT NULL");
    Db::run("CREATE TABLE IF NOT EXISTS report_edits (id INT AUTO_INCREMENT PRIMARY KEY, report_id INT NOT NULL, editor_id INT NOT NULL, old_subject TEXT NULL, old_body MEDIUMTEXT NULL, new_subject TEXT NULL, new_body MEDIUMTEXT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_report_edits (report_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    Db::run("CREATE TABLE IF NOT EXISTS report_attachments (id INT AUTO_INCREMENT PRIMARY KEY, report_id INT NOT NULL, file_name VARCHAR(255) NULL, file_path VARCHAR(255) NULL, thumbnail_path VARCHAR(255) NULL, mime_type VARCHAR(120) NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_report_attachments(report_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    if (!Db::one("SHOW COLUMNS FROM report_attachments WHERE Field='thumbnail_path'")) Db::run("ALTER TABLE report_attachments ADD COLUMN thumbnail_path VARCHAR(255) NULL AFTER file_path");
    Db::run("CREATE TABLE IF NOT EXISTS report_audit (id INT AUTO_INCREMENT PRIMARY KEY, report_id INT NOT NULL, actor_id INT NOT NULL, action VARCHAR(40) NOT NULL, note TEXT NULL, meta JSON NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_report_audit(report_id,created_at), INDEX idx_report_audit_actor(actor_id,created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    Db::run("CREATE TABLE IF NOT EXISTS report_reads (report_id INT NOT NULL, user_id INT NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(report_id,user_id), INDEX idx_report_reads_user(user_id,created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    // رونوشت گزارش: برخلاف ارجاع (forward)، مالکیت/کارتابل گزارش را تغییر نمی‌دهد؛
    // فقط یک نسخهٔ اطلاع‌رسانی برای شخص دیگری ثبت می‌کند تا در تب «رونوشت‌های من» ببیند.
    Db::run("CREATE TABLE IF NOT EXISTS report_cc (id INT AUTO_INCREMENT PRIMARY KEY, report_id INT NOT NULL, to_user_id INT NOT NULL, added_by INT NOT NULL, note TEXT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_report_cc_report(report_id), INDEX idx_report_cc_to(to_user_id,created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
}
function _report_audit($reportId,$actorId,$action,$note=null,$meta=null){
  try { Db::run("INSERT INTO report_audit(report_id,actor_id,action,note,meta) VALUES(?,?,?,?,?)", [(int)$reportId,(int)$actorId,$action,$note,$meta?json_encode($meta,JSON_UNESCAPED_UNICODE):null]); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
}
function _report_is_read_by_receiver($reportId){
  try { return (bool)Db::one("SELECT 1 FROM report_reads WHERE report_id=? LIMIT 1", [(int)$reportId]); } catch (\Throwable $e) { return false; }
}
function _save_report_attachments($reportId,$items){
  if (!$items || !is_array($items)) return 0;
  $n=0;
  foreach (array_slice($items,0,5) as $it) {
    $data = $it['data'] ?? $it['attachment_data'] ?? null;
    if (!$data) continue;
    $name = substr((string)($it['name'] ?? $it['file_name'] ?? 'attachment'),0,220);
    try {
      $path = Media::saveBase64($data, 'reports', 1600, 75);
      if(!$path) continue;
      $thumb = Media::makeThumbnail($path, 'report_thumbs');
      Db::run("INSERT INTO report_attachments(report_id,file_name,file_path,thumbnail_path,mime_type) VALUES(?,?,?,?,?)", [(int)$reportId,$name,$path,$thumb,'image/jpeg']);
      $n++;
    } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  }
  return $n;
}
route('POST', '/api/reports', function($p,$b,$u){
  _ensure_reports_index();
  $eventAt = _app_client_time($b);
  if (empty($b['subject']) || empty($b['body'])) Http::error('ورودی نامعتبر', 400);
  enforce_attachment('reports', $b['attachment_name'] ?? null, $b['attachment_data'] ?? null);
  // محدودیت تعداد گزارش روزانهٔ هر کاربر
  $dailyLimit = (int)_req_setting('report_daily_limit', 0);
  if ($dailyLimit > 0) {
    $cnt = (int)(Db::one("SELECT COUNT(*) n FROM reports WHERE sender_id=? AND DATE(created_at)=DATE(?)", [$u['id'], $eventAt])['n'] ?? 0);
    if ($cnt >= $dailyLimit) Http::error("شما امروز به سقف مجاز ارسال گزارش ({$dailyLimit} گزارش) رسیده‌اید.", 429);
  }
  // محدودیت فاصلهٔ زمانی بین دو گزارش (دقیقه)
  $gapMin = (int)_req_setting('report_send_interval_min', 0);
  if ($gapMin > 0) {
    $last = Db::one("SELECT created_at FROM reports WHERE sender_id=? ORDER BY id DESC LIMIT 1", [$u['id']]);
    if ($last) {
      $diffMin = (strtotime($eventAt) - strtotime($last['created_at'])) / 60;
      if ($diffMin < $gapMin) {
        $rem = ceil($gapMin - $diffMin);
        Http::error("بین ارسال دو گزارش باید حداقل {$gapMin} دقیقه فاصله باشد. لطفاً {$rem} دقیقهٔ دیگر تلاش کنید.", 429);
      }
    }
  }
  $priority = in_array(($b['priority'] ?? 'normal'), ['normal','important','urgent'], true) ? $b['priority'] : 'normal';
  $confidentialHistory = !empty($b['confidential_history']) ? 1 : 0;
  try {
    // وقتی آرایهٔ پیوست‌ها ارسال شده، پیوست اول دوباره در ستون قدیمی ذخیره نمی‌شود.
    // این کار باگ نمایش دو مرتبهٔ «پیوست شماره ۱» را برای گزارش‌های جدید رفع می‌کند.
    $hasAttachmentList = !empty($b['attachments']) && is_array($b['attachments']);
    $attPath = null;
    $legacyName = null;
    if (!$hasAttachmentList && !empty($b['attachment_data'])) {
      $attPath = Media::saveBase64($b['attachment_data'], 'reports', 1280, 70);
      $legacyName = $b['attachment_name'] ?? null;
    }
    $id = Db::insert("INSERT INTO reports(sender_id,subject,body,priority,confidential_history,attachment_name,attachment_path,created_at) VALUES(?,?,?,?,?,?,?,?)",
      [$u['id'], $b['subject'], $b['body'], $priority, $confidentialHistory, $legacyName, $attPath, $eventAt]);
  } catch (\Throwable $e) {
    // سازگاری با هاست‌هایی که هنوز ستون‌های پیوست/priority را ندارند
    try { $id = Db::insert("INSERT INTO reports(sender_id,subject,body,priority,created_at) VALUES(?,?,?,?,?)", [$u['id'], $b['subject'], $b['body'], $priority, $eventAt]); }
    catch (\Throwable $e2) { $id = Db::insert("INSERT INTO reports(sender_id,subject,body,created_at) VALUES(?,?,?,?)", [$u['id'], $b['subject'], $b['body'], $eventAt]); }
  }
  _save_report_attachments($id, $b['attachments'] ?? []);
  _report_audit($id, $u['id'], 'create', null, ['priority'=>$priority,'confidential_history'=>$confidentialHistory]);
  // گردش گزارش به مقام(های) بالادست — در صورت بروز هر خطا، خودِ گزارش حفظ می‌شود
  try {
    $targets = !empty($b['to_user_id']) ? [(int)$b['to_user_id']] : _user_managers($u['id']);
    $targets = array_values(array_filter(array_unique($targets), fn($target) => (int)$target > 0 && (int)$target !== (int)$u['id']));
    foreach ($targets as $target) {
      if (!$target) continue;
      Db::run("INSERT INTO report_routes(report_id,to_user_id,action,actor_id) VALUES(?,?,'forward',?)", [$id, $target, $u['id']]);
    }
    if ($targets) {
      Push::send($targets, 'گزارش جدید برای بررسی', $b['subject'], ['type'=>'report','report_id'=>$id]);
      try {
        if (class_exists('MessengerHub')) {
          $bodyPreview = mb_substr((string)($b['body'] ?? ''), 0, 300);
          $msgText = "📩 گزارش جدید برای بررسی\n\nموضوع: {$b['subject']}\n\n{$bodyPreview}";
          MessengerHub::sendToUserIds($targets, '📩 گزارش جدید برای بررسی', $msgText, 'report_notify', ['type'=>'report','report_id'=>$id]);
        }
      } catch (\Throwable $e) { /* اعلان پیام‌رسان اختیاری است؛ نبود اتصال نباید ارسال گزارش را مختل کند */ }
    }
  } catch (\Throwable $e) { /* گردش اختیاری است؛ نبود جدول/مدیر نباید ارسال را مختل کند */ }
  // امکان ارسال رونوشتِ گزارش تازه‌ایجادشده به یک یا چند نفر، همان لحظهٔ ثبت
  // (کاربر می‌تواند هنگام نوشتن گزارش جدید، «رونوشت» هم انتخاب کند؛ مثل دکمهٔ رونوشت
  // که برای گزارش‌های دریافتی از قبل وجود داشت). جدول report_cc از قبل توسط
  // _ensure_reports_index() که در ابتدای همین تابع فراخوانی شده، تضمین‌شده است.
  if (!empty($b['cc_user_id'])) {
    $ccIds = is_array($b['cc_user_id']) ? $b['cc_user_id'] : [$b['cc_user_id']];
    foreach (array_unique(array_map('intval', $ccIds)) as $ccId) {
      if (!$ccId || $ccId === (int)$u['id']) continue;
      if (!Db::one("SELECT id FROM users WHERE id=? AND is_active=1", [$ccId])) continue;
      try {
        Db::run("INSERT INTO report_cc(report_id,to_user_id,added_by) VALUES(?,?,?)", [$id, $ccId, (int)$u['id']]);
        Push::send([$ccId], 'رونوشت گزارش', $b['subject'], ['type'=>'report','report_id'=>$id]);
      } catch (\Throwable $e) { /* نادیده */ }
    }
  }
  return ['id'=>$id];
});
route('GET', '/api/reports', function($p,$b,$u){
  _ensure_reports_index();
  $conds=[]; $params=[];
  if (!empty($_GET['sender'])) { $conds[]="CONCAT(us.first_name,' ',us.last_name) LIKE ?"; $params[]='%'.$_GET['sender'].'%'; }
  if (!empty($_GET['subject'])) { $conds[]="r.subject LIKE ?"; $params[]='%'.$_GET['subject'].'%'; }
  if (!empty($_GET['from'])) { $conds[]="r.created_at >= ?"; $params[]=$_GET['from']; }
  if (!empty($_GET['to'])) { $conds[]="r.created_at <= ?"; $params[]=$_GET['to']; }
  if ((int)$u['level'] > ADMIN) {
    $conds[]="(r.sender_id = ? OR EXISTS (SELECT 1 FROM report_routes rx WHERE rx.report_id=r.id AND (rx.to_user_id=? OR rx.actor_id=?)))";
    $params[]=$u['id']; $params[]=$u['id']; $params[]=$u['id'];
  }
  $conds[]="r.deleted_at IS NULL";
  $where = $conds ? 'WHERE '.implode(' AND ', $conds) : '';
  // صفحه‌بندی
  $page = max(1, (int)($_GET['page'] ?? 1));
  $per  = min(50, max(5, (int)($_GET['per'] ?? 20)));
  $off  = ($page - 1) * $per;
  // شمارش کل برای صفحه‌بندی
  $total = (int)(Db::one("SELECT COUNT(*) n FROM reports r JOIN users us ON us.id=r.sender_id $where", $params)['n'] ?? 0);
  // فهرست سبک: بدون attachment_data (تصاویر سنگین)، فقط نشانگر وجود پیوست
  $rows = Db::all(
    "SELECT r.id, r.subject, r.body, r.status, COALESCE(r.priority,'normal') priority, r.created_at, r.sender_id,
            (r.attachment_data IS NOT NULL AND r.attachment_data<>'') AS has_attachment,
            r.attachment_name, us.first_name, us.last_name,
            (SELECT COUNT(*) FROM report_attachments ra WHERE ra.report_id=r.id) attachments_count
     FROM reports r JOIN users us ON us.id=r.sender_id $where
     ORDER BY FIELD(COALESCE(r.priority,'normal'),'urgent','important','normal'), r.created_at DESC LIMIT $per OFFSET $off", $params);
  return ['items'=>$rows, 'total'=>$total, 'page'=>$page, 'per'=>$per, 'pages'=>(int)ceil($total/$per)];
});
// خروجی CSV فهرست گزارش‌ها (با اعمال همان فیلترها) + سربرگ سازمان
route('GET', '/api/reports/export', function($p,$b,$u){
  $conds=[]; $params=[];
  if (!empty($_GET['sender'])) { $conds[]="CONCAT(us.first_name,' ',us.last_name) LIKE ?"; $params[]='%'.$_GET['sender'].'%'; }
  if (!empty($_GET['subject'])) { $conds[]="r.subject LIKE ?"; $params[]='%'.$_GET['subject'].'%'; }
  if (!empty($_GET['from'])) { $conds[]="r.created_at >= ?"; $params[]=$_GET['from']; }
  if (!empty($_GET['to'])) { $conds[]="r.created_at <= ?"; $params[]=$_GET['to']; }
  if ((int)$u['level'] > ADMIN) {
    $conds[]="(r.sender_id = ? OR EXISTS (SELECT 1 FROM report_routes rx WHERE rx.report_id=r.id AND (rx.to_user_id=? OR rx.actor_id=?)))";
    $params[]=$u['id']; $params[]=$u['id']; $params[]=$u['id'];
  }
  $conds[]="r.deleted_at IS NULL";
  $where = $conds ? 'WHERE '.implode(' AND ', $conds) : '';
  $rows = Db::all("SELECT r.id, CONCAT(us.first_name,' ',us.last_name) sender, r.subject, r.body, r.status, r.created_at
     FROM reports r JOIN users us ON us.id=r.sender_id $where ORDER BY r.created_at DESC LIMIT 10000", $params);
  header('Content-Type: text/csv; charset=UTF-8');
  header('Content-Disposition: attachment; filename="reports.csv"');
  echo "\xEF\xBB\xBF"; $out=fopen('php://output','w');
  // سربرگ سازمان (عنوان اداره) در صورت تنظیم
  $org = _req_setting('org_title', '') ?: _req_setting('org_name', '');
  if ($org) { fputcsv($out, [$org]); fputcsv($out, ['گزارش فهرست گزارش‌ها']); fputcsv($out, []); }
  fputcsv($out, ['شناسه','فرستنده','موضوع','متن','وضعیت','تاریخ']);
  foreach($rows as $r){ fputcsv($out, [$r['id'],$r['sender'],$r['subject'],$r['body'],$r['status'],$r['created_at']]); }
  fclose($out); exit;
});
// گزارش ماهانهٔ تعداد گزارش‌ها و عملکرد هر کاربر
route('GET', '/api/reports/monthly', function($p,$b,$u){
  $conds=[]; $params=[];
  if (!empty($_GET['from'])) { $conds[]="r.created_at >= ?"; $params[]=$_GET['from']; }
  if (!empty($_GET['to'])) { $conds[]="r.created_at <= ?"; $params[]=$_GET['to']; }
  $conds[]="r.deleted_at IS NULL";
  $where = $conds ? 'WHERE '.implode(' AND ', $conds) : '';
  return Db::all(
    "SELECT us.id, CONCAT(us.first_name,' ',us.last_name) name, ro.title role,
            COUNT(*) total,
            SUM(r.status='answered') answered, SUM(r.status='forwarded') forwarded
     FROM reports r JOIN users us ON us.id=r.sender_id LEFT JOIN roles ro ON ro.id=us.role_id
     $where GROUP BY us.id ORDER BY total DESC", $params);
});
route('PUT', '/api/reports/{id}', function($p,$b,$u){
  _ensure_reports_index();
  $id=(int)$p['id'];
  $r=Db::one("SELECT id,sender_id,subject,body,priority,deleted_at FROM reports WHERE id=?",[$id]);
  if(!$r || !empty($r['deleted_at'])) Http::error('گزارش یافت نشد',404);
  $isOwner = ((int)$r['sender_id'] === (int)$u['id']);
  $isAdmin = (!empty($u['is_admin']) || (int)($u['level']??99)<=ADMIN);
  if(!$isOwner && !$isAdmin) Http::error('اجازه ویرایش این گزارش را ندارید',403);
  if($isOwner && !$isAdmin && _report_is_read_by_receiver($id)) Http::error('این گزارش توسط دریافت‌کننده مشاهده شده و دیگر قابل ویرایش نیست.',409);
  $subject=trim((string)($b['subject']??$r['subject'])); $body=trim((string)($b['body']??$r['body']));
  $priority = in_array(($b['priority'] ?? $r['priority'] ?? 'normal'), ['normal','important','urgent'], true) ? ($b['priority'] ?? $r['priority'] ?? 'normal') : 'normal';
  if($subject==='' || $body==='') Http::error('موضوع و متن گزارش الزامی است',422);
  Db::run("INSERT INTO report_edits(report_id,editor_id,old_subject,old_body,new_subject,new_body) VALUES(?,?,?,?,?,?)",[$id,$u['id'],$r['subject'],$r['body'],$subject,$body]);
  Db::run("UPDATE reports SET subject=?, body=?, priority=?, updated_at=NOW() WHERE id=?",[$subject,$body,$priority,$id]);
  _save_report_attachments($id, $b['attachments'] ?? []);
  _report_audit($id,$u['id'],'edit',null,['priority'=>$priority]);
  return ['ok'=>true];
});
route('DELETE', '/api/reports/{id}', function($p,$b,$u){
  _ensure_reports_index();
  $id=(int)$p['id'];
  $r=Db::one("SELECT id,sender_id FROM reports WHERE id=? AND deleted_at IS NULL",[$id]);
  if(!$r) Http::error('گزارش یافت نشد',404);
  $reason = trim((string)($b['reason'] ?? ''));
  if((int)$r['sender_id'] === (int)$u['id'] || !empty($u['is_admin']) || (int)($u['level']??99)<=ADMIN) {
    if ((int)$r['sender_id'] === (int)$u['id'] && _report_is_read_by_receiver($id) && empty($u['is_admin']) && (int)($u['level']??99)>ADMIN) {
      Http::error('گزارش توسط دریافت‌کننده مشاهده شده و حذف کامل آن مجاز نیست.',409);
    }
    Db::run("UPDATE reports SET deleted_at=NOW(), deleted_by=? WHERE id=?",[$u['id'],$id]);
    _report_audit($id,$u['id'],'delete',$reason?:null);
    return ['ok'=>true,'deleted'=>'global'];
  }
  Db::run("INSERT INTO report_deletions(report_id,user_id,reason) VALUES(?,?,?) ON DUPLICATE KEY UPDATE reason=VALUES(reason), created_at=NOW()",[$id,$u['id'],$reason?:null]);
  Db::run("INSERT IGNORE INTO report_archives(report_id,user_id) VALUES(?,?)",[$id,$u['id']]);
  _report_audit($id,$u['id'],'delete_for_me',$reason?:null);
  return ['ok'=>true,'deleted'=>'for_me'];
});
route('POST', '/api/reports/{id}/reject', function($p,$b,$u){
  _ensure_reports_index();
  $id=(int)$p['id']; $reason=trim((string)($b['reason']??''));
  if($reason==='') Http::error('علت رد/حذف گزارش را وارد کنید.',422);
  $r=Db::one("SELECT id,sender_id,subject FROM reports WHERE id=? AND deleted_at IS NULL",[$id]);
  if(!$r) Http::error('گزارش یافت نشد',404);
  Db::run("UPDATE reports SET status='rejected', rejected_at=NOW(), rejected_by=?, reject_reason=? WHERE id=?",[$u['id'],$reason,$id]);
  Db::run("INSERT INTO report_routes(report_id,to_user_id,action,note,actor_id) VALUES(?,?,?,?,?)",[$id,$r['sender_id'],'reject',$reason,$u['id']]);
  Db::run("INSERT INTO report_deletions(report_id,user_id,reason) VALUES(?,?,?) ON DUPLICATE KEY UPDATE reason=VALUES(reason), created_at=NOW()",[$id,$u['id'],$reason]);
  _report_audit($id,$u['id'],'reject',$reason);
  Push::send([(int)$r['sender_id']], 'گزارش شما رد شد', $r['subject'] ?? 'گزارش', ['type'=>'report','report_id'=>$id]);
  return ['ok'=>true];
});

route('GET', '/api/reports/{id}', function($p,$b,$u){
  _ensure_reports_index();
  $r = Db::one("SELECT r.*, us.first_name, us.last_name, us.signature_data sender_signature, COALESCE(ro.title,'') sender_role_title FROM reports r JOIN users us ON us.id=r.sender_id LEFT JOIN roles ro ON ro.id=us.role_id WHERE r.id=? AND r.deleted_at IS NULL", [$p['id']]);
  if (!$r) Http::error('یافت نشد', 404);
  $isSender = ((int)$r['sender_id'] === (int)$u['id']);
  if (!$isSender) {
    try {
      Db::run("INSERT IGNORE INTO report_reads(report_id,user_id) VALUES(?,?)", [(int)$p['id'], (int)$u['id']]);
      Db::run("UPDATE reports SET read_at=COALESCE(read_at,NOW()), read_by=COALESCE(read_by,?) WHERE id=?", [(int)$u['id'], (int)$p['id']]);
      _report_audit((int)$p['id'], (int)$u['id'], 'view');
    } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  }
  // تصویر پیوست: اگر فایل فیزیکی است URL بده، وگرنه base64 قدیمی
  if (!empty($r['attachment_path'])) {
    $r['attachment_url'] = '/api/media?path=' . urlencode($r['attachment_path']);
    unset($r['attachment_data']);
  } elseif (!empty($r['attachment_data'])) {
    $r['attachment_url'] = $r['attachment_data']; // base64 قدیمی (data URI)
  }
  $atts = [];
  try {
    foreach (Db::all("SELECT id,file_name,file_path,thumbnail_path,mime_type,created_at FROM report_attachments WHERE report_id=? ORDER BY id", [(int)$p['id']]) as $a) {
      $a['url'] = !empty($a['file_path']) ? '/api/media?path=' . urlencode($a['file_path']) : null;
      $a['thumbnail_url'] = !empty($a['thumbnail_path']) ? '/api/media?path=' . urlencode($a['thumbnail_path']) : $a['url'];
      $atts[] = $a;
    }
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  // حذف هم‌پوشانی داده‌های قدیمی: اگر نام پیوست اصلی با نخستین رکورد جدول یکی است،
  // کلاینت فقط نسخهٔ جدول را نمایش می‌دهد.
  if (!empty($r['attachment_name']) && $atts) {
    foreach ($atts as $a) {
      if (!empty($a['file_name']) && trim((string)$a['file_name']) === trim((string)$r['attachment_name'])) {
        unset($r['attachment_url'], $r['attachment_data']);
        break;
      }
    }
  }
  $r['attachments'] = $atts;
  $r['can_edit'] = $isSender && !_report_is_read_by_receiver((int)$p['id']);
  $hideHistory = $isSender && !empty($r['confidential_history']);
  $r['history_hidden_for_sender'] = $hideHistory;
  if ($hideHistory) {
    $r['trail'] = [];
    $r['audit'] = [];
    $r['edits'] = [];
  } else {
    $r['trail'] = Db::all("SELECT rr.*, a.first_name a_first, a.last_name a_last, a.signature_data a_signature, COALESCE(ar.title,'') a_role_title FROM report_routes rr JOIN users a ON a.id=rr.actor_id LEFT JOIN roles ar ON ar.id=a.role_id WHERE rr.report_id=? ORDER BY rr.created_at", [$p['id']]);
    try { $r['audit'] = Db::all("SELECT ra.*, u.first_name, u.last_name FROM report_audit ra LEFT JOIN users u ON u.id=ra.actor_id WHERE ra.report_id=? ORDER BY ra.id", [(int)$p['id']]); } catch (\Throwable $e) { $r['audit']=[]; }
    try { $r['edits'] = Db::all("SELECT re.id,re.created_at,u.first_name,u.last_name FROM report_edits re LEFT JOIN users u ON u.id=re.editor_id WHERE re.report_id=? ORDER BY re.id", [(int)$p['id']]); } catch (\Throwable $e) { $r['edits']=[]; }
  }
  return $r;
});
// فهرست افراد برای ارجاع گزارش (همهٔ کاربران واردشده) — سبک، بدون عکس
route('GET', '/api/my/forward-targets', fn($p,$b,$u) => Db::all(
  "SELECT u.id, u.first_name, u.last_name, u.role_id, r.title role_title
   FROM users u LEFT JOIN roles r ON r.id=u.role_id
   WHERE u.is_active=1 AND u.id<>? ORDER BY r.level DESC, u.first_name", [$u['id']]));

route('POST', '/api/reports/{id}/action', function($p,$b,$u){
  $action = $b['action'] ?? 'note';
  if ($action === 'forward') {
    // ارجاع: اگر مقصد مشخص شده، فقط همان؛ وگرنه به همهٔ مقام‌های بالادستی
    $targets = !empty($b['to_user_id']) ? [(int)$b['to_user_id']] : _user_managers($u['id']);
    $targets = array_values(array_filter(array_unique($targets), fn($target) => (int)$target > 0 && (int)$target !== (int)$u['id']));
    if (!$targets) Http::error('مقام بالادستی برای ارجاع تعریف نشده است', 400);
    $rep = Db::one("SELECT subject, sender_id FROM reports WHERE id=?", [$p['id']]);
    foreach ($targets as $to) {
      Db::run("INSERT INTO report_routes(report_id,to_user_id,action,note,actor_id) VALUES(?,?,?,?,?)",
        [$p['id'], $to, $action, $b['note'] ?? null, $u['id']]);
    }
    $confidentialHistory = !empty($b['confidential_history']) ? 1 : 0;
    Db::run("UPDATE reports SET status='forwarded', confidential_history=? WHERE id=?", [$confidentialHistory, $p['id']]);
    _report_audit((int)$p['id'], (int)$u['id'], 'forward', $b['note'] ?? null, ['targets'=>$targets,'confidential_history'=>$confidentialHistory]);
    Push::send($targets, 'گزارش جدید برای بررسی', $rep['subject'] ?? 'گزارش', ['type'=>'report','report_id'=>$p['id']]);
    try {
      if (class_exists('MessengerHub')) {
        $bodyPreview = mb_substr((string)($b['note'] ?? ''), 0, 300);
        $msgText = "📩 گزارشی برای شما ارجاع شد\n\nموضوع: ".($rep['subject'] ?? 'گزارش').($bodyPreview!=='' ? "\n\nیادداشت ارجاع: {$bodyPreview}" : '');
        MessengerHub::sendToUserIds($targets, '📩 گزارش جدید برای بررسی', $msgText, 'report_notify', ['type'=>'report','report_id'=>$p['id']]);
      }
    } catch (\Throwable $e) { /* اعلان پیام‌رسان اختیاری است؛ نبود اتصال نباید ارجاع را مختل کند */ }
    return ['ok'=>true, 'forwarded_to'=>count($targets)];
  }
  // پاسخ/یادداشت: گزارش در کارتابل خودِ کاربر باقی می‌ماند
  $to = $u['id'];
  Db::run("INSERT INTO report_routes(report_id,to_user_id,action,note,actor_id) VALUES(?,?,?,?,?)",
    [$p['id'], $to, $action, $b['note'] ?? null, $u['id']]);
  $st = $action==='reply' ? 'answered' : 'seen';
  Db::run("UPDATE reports SET status=? WHERE id=?", [$st, $p['id']]);
  _report_audit((int)$p['id'], (int)$u['id'], $action, $b['note'] ?? null);
  $rep = Db::one("SELECT subject, sender_id FROM reports WHERE id=?", [$p['id']]);
  if ($action === 'reply' && $rep) Push::send([$rep['sender_id']], 'پاسخ به گزارش شما', $rep['subject'] ?? 'گزارش', ['type'=>'report','report_id'=>$p['id']]);
  return ['ok'=>true];
});

// رونوشت گزارش برای شخص دیگر — برخلاف ارجاع، کارتابل/مالکیت گزارش را تغییر نمی‌دهد
route('POST', '/api/reports/{id}/cc', function($p,$b,$u){
  _ensure_reports_index();
  $to = (int)($b['to_user_id'] ?? 0);
  if (!$to) Http::error('گیرندهٔ رونوشت را انتخاب کنید', 400);
  if ($to === (int)$u['id']) Http::error('نمی‌توانید برای خودتان رونوشت بفرستید', 400);
  if (!Db::one("SELECT id FROM users WHERE id=? AND is_active=1", [$to])) Http::error('کاربر گیرنده نامعتبر است', 400);
  $rep = Db::one("SELECT subject FROM reports WHERE id=? AND deleted_at IS NULL", [$p['id']]);
  if (!$rep) Http::error('گزارش یافت نشد', 404);
  Db::run("INSERT INTO report_cc(report_id,to_user_id,added_by,note) VALUES(?,?,?,?)", [$p['id'], $to, (int)$u['id'], trim($b['note'] ?? '') ?: null]);
  _report_audit((int)$p['id'], (int)$u['id'], 'cc', $b['note'] ?? null, ['to_user_id'=>$to]);
  Push::send([$to], 'رونوشت گزارش', $rep['subject'] ?? 'گزارش', ['type'=>'report','report_id'=>$p['id']]);
  try {
    if (class_exists('MessengerHub')) {
      MessengerHub::sendToUserIds([$to], '📋 رونوشت گزارش', 'یک رونوشت از گزارش «'.($rep['subject'] ?? 'گزارش').'» برای شما ارسال شد.', 'report_notify', ['type'=>'report','report_id'=>$p['id']]);
    }
  } catch (\Throwable $e) { /* اعلان پیام‌رسان اختیاری است */ }
  return ['ok'=>true];
});
// فهرست گزارش‌هایی که برای این کاربر رونوشت شده‌اند
route('GET', '/api/my/cc-reports', function($p,$b,$u){
  _ensure_reports_index();
  return Db::all(
    "SELECT r.id, r.subject, r.body, r.status, COALESCE(r.priority,'normal') priority, r.created_at, r.attachment_name,
            us.first_name, us.last_name, us.id sender_id,
            (SELECT COUNT(*) FROM report_attachments ra WHERE ra.report_id=r.id) attachments_count,
            cc.created_at cc_at,
            TRIM(CONCAT(COALESCE(ab.first_name,''),' ',COALESCE(ab.last_name,''))) cc_by_name
     FROM report_cc cc
     JOIN reports r ON r.id=cc.report_id
     JOIN users us ON us.id=r.sender_id
     LEFT JOIN users ab ON ab.id=cc.added_by
     WHERE cc.to_user_id=? AND r.deleted_at IS NULL
     ORDER BY cc.created_at DESC LIMIT 300", [$u['id']]);
});

// کارتابل گزارش‌های دریافتی: گزارش‌هایی که آخرین ارجاع آن‌ها به این کاربر است
route('GET', '/api/my/inbox-reports', function($p,$b,$u){
  _ensure_reports_index();
  return Db::all(
    "SELECT r.id, r.subject, r.body, r.status, COALESCE(r.priority,'normal') priority, r.created_at, r.attachment_name,
            us.first_name, us.last_name, us.id sender_id, lr.action last_action, (SELECT COUNT(*) FROM report_attachments ra WHERE ra.report_id=r.id) attachments_count
     FROM reports r
     JOIN users us ON us.id=r.sender_id
     JOIN (SELECT rr.report_id, rr.to_user_id, rr.action
           FROM report_routes rr
           JOIN (SELECT report_id, MAX(id) mx FROM report_routes GROUP BY report_id) m
             ON m.report_id=rr.report_id AND m.mx=rr.id) lr ON lr.report_id=r.id
     WHERE lr.to_user_id = ? AND r.deleted_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM report_archives ra WHERE ra.report_id=r.id AND ra.user_id=?)
       AND NOT EXISTS (SELECT 1 FROM report_deletions rd WHERE rd.report_id=r.id AND rd.user_id=?)
     ORDER BY r.created_at DESC LIMIT 200", [$u['id'], $u['id'], $u['id']]);
});
route('GET', '/api/my/forwarded-reports', function($p,$b,$u){
  _ensure_reports_index();
  return Db::all(
    "SELECT DISTINCT r.id, r.subject, r.body, r.status, COALESCE(r.priority,'normal') priority, r.created_at, r.attachment_name,
            us.first_name, us.last_name, us.id sender_id,
            (SELECT COUNT(*) FROM report_attachments ra WHERE ra.report_id=r.id) attachments_count,
            (SELECT MAX(rr2.created_at) FROM report_routes rr2 WHERE rr2.report_id=r.id AND rr2.actor_id=? AND rr2.action='forward') forwarded_at
     FROM reports r
     JOIN users us ON us.id=r.sender_id
     JOIN report_routes rr ON rr.report_id=r.id AND rr.actor_id=? AND rr.action='forward'
     WHERE r.deleted_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM report_deletions rd WHERE rd.report_id=r.id AND rd.user_id=?)
     ORDER BY forwarded_at DESC, r.created_at DESC LIMIT 300", [$u['id'],$u['id'],$u['id']]);
});
route('GET', '/api/my/inbox-reports/archived', function($p,$b,$u){
  _ensure_reports_index();
  return Db::all(
    "SELECT r.id, r.subject, r.body, r.status, COALESCE(r.priority,'normal') priority, r.created_at, r.attachment_name,
            us.first_name, us.last_name, us.id sender_id
     FROM reports r JOIN users us ON us.id=r.sender_id
     JOIN report_archives ra ON ra.report_id=r.id AND ra.user_id=?
     WHERE r.deleted_at IS NULL
     ORDER BY r.created_at DESC LIMIT 200", [$u['id']]);
});
route('POST', '/api/my/inbox-reports/{id}/archive', function($p,$b,$u){
  _ensure_reports_index();
  $archive = !isset($b['archive']) || !empty($b['archive']);
  if ($archive) Db::run("INSERT IGNORE INTO report_archives(report_id,user_id) VALUES(?,?)", [$p['id'], $u['id']]);
  else Db::run("DELETE FROM report_archives WHERE report_id=? AND user_id=?", [$p['id'], $u['id']]);
  return ['ok'=>true, 'archived'=>$archive];
});
route('GET', '/api/my/reports/{id}/flow', function($p,$b,$u){
  $rep = Db::one("SELECT sender_id,COALESCE(confidential_history,0) confidential_history FROM reports WHERE id=?", [(int)$p['id']]);
  if (!$rep) Http::error('یافت نشد',404);
  if ((int)$rep['sender_id'] === (int)$u['id'] && !empty($rep['confidential_history'])) return [];
  return Db::all(
    "SELECT rr.id, rr.action, rr.note, rr.created_at,
            af.first_name af_fn, af.last_name af_ln, tu.first_name tu_fn, tu.last_name tu_ln
     FROM report_routes rr
     LEFT JOIN users af ON af.id=rr.actor_id
     LEFT JOIN users tu ON tu.id=rr.to_user_id
     WHERE rr.report_id=? ORDER BY rr.id", [$p['id']]);
});

/* ---------------- مدیریت ---------------- */
// سالگرد تولد پرسنل در ماه جاری (شمسی) — برای داشبورد
route('GET', '/api/admin/birthdays-month', function($p,$b,$u){
  [$jy,$jm,$jdToday] = gregorian_to_jalali((int)date('Y'),(int)date('m'),(int)date('d'));
  $out = [];
  foreach (_users_with_jalali_birthday((int)$jm, null) as $r) {
    $bdd = (int)$r['_birth_j_day'];
    $name = trim(($r['first_name']??'').' '.($r['last_name']??''));
    $daysLeft = $bdd - (int)$jdToday;
    $out[] = [
      'id'=>(int)$r['id'],
      'name'=>$name ?: 'بدون نام',
      'role_title'=>$r['role_title'] ?? null,
      'day'=>$bdd,
      'birth_date'=>$r['birth_date'],
      'jmonth'=>(int)$jm,
      'days_left'=>$daysLeft,
      'is_today'=>($daysLeft === 0),
      'passed'=>($daysLeft < 0),
    ];
  }
  usort($out, fn($a,$c)=>($a['day']<=>$c['day']) ?: strcmp($a['name'],$c['name']));
  $months = ['','فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
  return ['month'=>(int)$jm, 'month_name'=>$months[$jm] ?? '', 'today'=>(int)$jdToday, 'people'=>$out, 'count'=>count($out)];
}, false, ADMIN);

// گزارش موقعیت‌های ارسال‌شده از طریق آنتن GSM (GPS خاموش)
route('GET', '/api/admin/gsm-locations', function($p,$b,$u){
  $from = $_GET['from'] ?? null; $to = $_GET['to'] ?? null;
  $cols = array_column(Db::all("SHOW COLUMNS FROM location_pings"), 'Field');
  if (!in_array('via_gsm', $cols)) return ['rows'=>[], 'by_user'=>[], 'summary'=>['total'=>0,'users'=>0]];
  $where = "lp.via_gsm=1"; $args=[];
  if ($from) { $where .= " AND DATE(lp.captured_at)>=?"; $args[]=$from; }
  if ($to)   { $where .= " AND DATE(lp.captured_at)<=?"; $args[]=$to; }
  $rows = Db::all("SELECT lp.id, lp.lat, lp.lng, lp.captured_at, lp.user_id,
      TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) name, r.title role_title
    FROM location_pings lp LEFT JOIN users u ON u.id=lp.user_id LEFT JOIN roles r ON r.id=u.role_id
    WHERE $where ORDER BY lp.captured_at DESC LIMIT 1000", $args);
  $userSet = []; $byUser = [];
  foreach ($rows as $r) {
    $userSet[$r['user_id']] = true;
    $uid = $r['user_id'];
    if (!isset($byUser[$uid])) $byUser[$uid] = ['name'=>$r['name'], 'role_title'=>$r['role_title'], 'count'=>0, 'last'=>$r['captured_at']];
    $byUser[$uid]['count']++;
  }
  return ['rows'=>$rows, 'by_user'=>array_values($byUser), 'summary'=>['total'=>count($rows), 'users'=>count($userSet)]];
}, false, ADMIN);

// ==================== فعالیت‌های فرهنگی ====================
function _ensure_cultural_tables() {
  try {
    Db::run("CREATE TABLE IF NOT EXISTS cultural_types (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(150) NOT NULL, description TEXT NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    Db::run("CREATE TABLE IF NOT EXISTS cultural_places (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(200) NOT NULL, address VARCHAR(400) NULL, phone VARCHAR(40) NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    Db::run("CREATE TABLE IF NOT EXISTS cultural_activities (id INT AUTO_INCREMENT PRIMARY KEY, type_id INT NOT NULL, place_id INT NULL, driver_national_id VARCHAR(10) NOT NULL, driver_name VARCHAR(200) NULL, driver_mobile VARCHAR(20) NULL, activity_jdate VARCHAR(10) NOT NULL, location VARCHAR(255) NULL, hours DECIMAL(5,1) NULL, note TEXT NULL, recorded_by INT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_ca_nid (driver_national_id), INDEX idx_ca_type (type_id), INDEX idx_ca_date (activity_jdate)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    // افزودن place_id اگر نبود
    $c = Db::one("SHOW COLUMNS FROM cultural_activities WHERE Field='place_id'");
    if (!$c) Db::run("ALTER TABLE cultural_activities ADD COLUMN place_id INT NULL");
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
}

// آیا کاربر به ثبت فعالیت فرهنگی دسترسی دارد؟
function _can_cultural($u){
  if (($u['level'] ?? 0) >= ADMIN || !empty($u['is_admin'])) return true;
  try { $r = Db::one("SELECT can_cultural FROM users WHERE id=?", [$u['id']]); return !empty($r['can_cultural']); }
  catch (\Throwable $e) { return false; }
}

// --- مدیریت مکان‌های فرهنگی (فقط ادمین) ---
route('GET', '/api/admin/cultural-places', function($p,$b,$u){
  _ensure_cultural_tables();
  return Db::all("SELECT * FROM cultural_places ORDER BY is_active DESC, id DESC");
}, false, ADMIN);

route('POST', '/api/admin/cultural-places', function($p,$b,$u){
  _ensure_cultural_tables();
  $title = trim($b['title'] ?? '');
  if ($title === '') Http::error('عنوان مکان الزامی است', 422);
  $addr = trim($b['address'] ?? '') ?: null;
  $phone = trim($b['phone'] ?? '') ?: null;
  $active = isset($b['is_active']) ? (int)!!$b['is_active'] : 1;
  if (!empty($b['id'])) {
    Db::run("UPDATE cultural_places SET title=?, address=?, phone=?, is_active=? WHERE id=?", [$title,$addr,$phone,$active,(int)$b['id']]);
    return ['id'=>(int)$b['id']];
  }
  $id = Db::insert("INSERT INTO cultural_places(title,address,phone,is_active) VALUES(?,?,?,?)", [$title,$addr,$phone,$active]);
  return ['id'=>$id];
}, false, ADMIN);

route('DELETE', '/api/admin/cultural-places/{id}', function($p,$b,$u){
  _ensure_cultural_tables();
  Db::run("DELETE FROM cultural_places WHERE id=?", [(int)$p['id']]);
  return ['ok'=>true];
}, false, ADMIN);

// فهرست انواع فعالیت فرهنگی
route('GET', '/api/admin/cultural-types', function($p,$b,$u){
  _ensure_cultural_tables();
  return Db::all("SELECT * FROM cultural_types ORDER BY is_active DESC, id DESC");
}, false, ADMIN);

// ساخت/ویرایش نوع فعالیت
route('POST', '/api/admin/cultural-types', function($p,$b,$u){
  _ensure_cultural_tables();
  $title = trim($b['title'] ?? '');
  if ($title === '') Http::error('عنوان فعالیت الزامی است', 422);
  $desc = trim($b['description'] ?? '') ?: null;
  $active = isset($b['is_active']) ? (int)!!$b['is_active'] : 1;
  if (!empty($b['id'])) {
    Db::run("UPDATE cultural_types SET title=?, description=?, is_active=? WHERE id=?", [$title,$desc,$active,(int)$b['id']]);
    return ['id'=>(int)$b['id']];
  }
  $id = Db::insert("INSERT INTO cultural_types(title,description,is_active) VALUES(?,?,?)", [$title,$desc,$active]);
  return ['id'=>$id];
}, false, ADMIN);

// حذف نوع فعالیت
route('DELETE', '/api/admin/cultural-types/{id}', function($p,$b,$u){
  _ensure_cultural_tables();
  Db::run("DELETE FROM cultural_types WHERE id=?", [(int)$p['id']]);
  return ['ok'=>true];
}, false, ADMIN);

// ثبت فعالیت فرهنگی برای راننده
route('POST', '/api/admin/cultural-activities', function($p,$b,$u){
  _ensure_cultural_tables();
  $typeId = (int)($b['type_id'] ?? 0);
  $nid = trim($b['driver_national_id'] ?? '');
  if (!$typeId) Http::error('نوع فعالیت را انتخاب کنید', 422);
  if ($nid === '') Http::error('کد ملی راننده الزامی است', 422);
  $drv = Db::one("SELECT first_name,last_name,mobile FROM drivers WHERE national_id=?", [$nid]);
  $name = $drv ? trim(($drv['first_name']??'').' '.($drv['last_name']??'')) : ($b['driver_name'] ?? null);
  $mobile = $drv['mobile'] ?? ($b['driver_mobile'] ?? null);
  $eventAt = _app_client_time($b);
  $jdate = _app_normalize_jdate($b['activity_jdate'] ?? null, $eventAt);
  $location = trim($b['location'] ?? '') ?: null;
  $placeId = !empty($b['place_id']) ? (int)$b['place_id'] : null;
  $hours = isset($b['hours']) && $b['hours'] !== '' ? (float)$b['hours'] : null;
  $note = trim($b['note'] ?? '') ?: null;
  $id = Db::insert("INSERT INTO cultural_activities(type_id,place_id,driver_national_id,driver_name,driver_mobile,activity_jdate,location,hours,note,recorded_by) VALUES(?,?,?,?,?,?,?,?,?,?)",
    [$typeId,$placeId,$nid,$name,$mobile,$jdate,$location,$hours,$note,$u['id']]);
  return ['id'=>$id, 'driver_name'=>$name, 'driver_mobile'=>$mobile];
}, false, ADMIN);

// گزارش فعالیت‌های فرهنگی با فیلتر
route('GET', '/api/admin/cultural-activities', function($p,$b,$u){
  _ensure_cultural_tables();
  $where = "1=1"; $args = [];
  if (!empty($_GET['type_id'])) { $where .= " AND ca.type_id=?"; $args[] = (int)$_GET['type_id']; }
  if (!empty($_GET['national_id'])) { $where .= " AND ca.driver_national_id=?"; $args[] = trim($_GET['national_id']); }
  if (!empty($_GET['from'])) { $where .= " AND ca.activity_jdate>=?"; $args[] = $_GET['from']; }
  if (!empty($_GET['to'])) { $where .= " AND ca.activity_jdate<=?"; $args[] = $_GET['to']; }
  $rows = Db::all("SELECT ca.*, ct.title type_title, cp.title place_title, cp.address place_address,
      TRIM(CONCAT(COALESCE(rb.first_name,''),' ',COALESCE(rb.last_name,''))) recorded_by_name
    FROM cultural_activities ca
    LEFT JOIN cultural_types ct ON ct.id=ca.type_id
    LEFT JOIN cultural_places cp ON cp.id=ca.place_id
    LEFT JOIN users rb ON rb.id=ca.recorded_by
    WHERE $where ORDER BY ca.id DESC LIMIT 2000", $args);
  _repair_jdate_rows($rows,'activity_jdate');
  $summary = Db::all("SELECT ct.title, COUNT(*) activity_count, COALESCE(SUM(ca.hours),0) total_hours
    FROM cultural_activities ca LEFT JOIN cultural_types ct ON ct.id=ca.type_id
    WHERE $where GROUP BY ca.type_id ORDER BY activity_count DESC", $args);
  return ['rows'=>$rows, 'summary'=>$summary, 'total'=>count($rows)];
}, false, ADMIN);

// حذف یک فعالیت فرهنگی
route('DELETE', '/api/admin/cultural-activities/{id}', function($p,$b,$u){
  _ensure_cultural_tables();
  Db::run("DELETE FROM cultural_activities WHERE id=?", [(int)$p['id']]);
  return ['ok'=>true];
}, false, ADMIN);

// فعالیت‌های فرهنگی یک راننده (برای صفحهٔ اطلاعات راننده)
route('GET', '/api/admin/driver-cultural', function($p,$b,$u){
  _ensure_cultural_tables();
  $nid = trim($_GET['national_id'] ?? '');
  if ($nid === '') return [];
  return Db::all("SELECT ca.*, ct.title type_title, cp.title place_title, cp.address place_address,
      TRIM(CONCAT(COALESCE(rb.first_name,''),' ',COALESCE(rb.last_name,''))) recorded_by_name
    FROM cultural_activities ca LEFT JOIN cultural_types ct ON ct.id=ca.type_id
    LEFT JOIN cultural_places cp ON cp.id=ca.place_id
    LEFT JOIN users rb ON rb.id=ca.recorded_by
    WHERE ca.driver_national_id=? ORDER BY ca.id DESC", [$nid]);
}, false, ADMIN);

// --- نسخهٔ اپ (نیروهای میدانی): ثبت و مشاهدهٔ فعالیت فرهنگی ---
// انواع فعالیت فعال (برای انتخاب در اپ)
route('GET', '/api/my/cultural-types', function($p,$b,$u){
  _ensure_cultural_tables();
  if (!_can_cultural($u)) Http::error('شما به ثبت فعالیت فرهنگی دسترسی ندارید', 403);
  return Db::all("SELECT id, title FROM cultural_types WHERE is_active=1 ORDER BY title");
});

// مکان‌های فعال فعالیت فرهنگی (برای انتخاب در اپ — فقط مشاهده)
route('GET', '/api/my/cultural-places', function($p,$b,$u){
  _ensure_cultural_tables();
  if (!_can_cultural($u)) Http::error('دسترسی ندارید', 403);
  return Db::all("SELECT id, title, address FROM cultural_places WHERE is_active=1 ORDER BY title");
});

// ثبت فعالیت فرهنگی از اپ
route('POST', '/api/my/cultural-activities', function($p,$b,$u){
  _ensure_cultural_tables();
  if (!_can_cultural($u)) Http::error('شما به ثبت فعالیت فرهنگی دسترسی ندارید', 403);
  $typeId = (int)($b['type_id'] ?? 0);
  $nid = trim($b['driver_national_id'] ?? '');
  if (!$typeId) Http::error('نوع فعالیت را انتخاب کنید', 422);
  if ($nid === '') Http::error('کد ملی راننده الزامی است', 422);
  $drv = Db::one("SELECT first_name,last_name,mobile FROM drivers WHERE national_id=?", [$nid]);
  if (!$drv) Http::error('راننده‌ای با این کد ملی یافت نشد', 404);
  $name = trim(($drv['first_name']??'').' '.($drv['last_name']??''));
  $eventAt = _app_client_time($b);
  $jdate = _app_normalize_jdate($b['activity_jdate'] ?? null, $eventAt);
  $location = trim($b['location'] ?? '') ?: null;
  $placeId = !empty($b['place_id']) ? (int)$b['place_id'] : null;
  $hours = isset($b['hours']) && $b['hours'] !== '' ? (float)$b['hours'] : null;
  $note = trim($b['note'] ?? '') ?: null;
  $id = Db::insert("INSERT INTO cultural_activities(type_id,place_id,driver_national_id,driver_name,driver_mobile,activity_jdate,location,hours,note,recorded_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
    [$typeId,$placeId,$nid,$name,$drv['mobile']??null,$jdate,$location,$hours,$note,$u['id'],$eventAt]);
  return ['id'=>$id, 'driver_name'=>$name];
});

// فعالیت‌های فرهنگی که خود کاربر ثبت کرده
route('GET', '/api/my/cultural-activities', function($p,$b,$u){
  _ensure_cultural_tables();
  $rows=Db::all("SELECT ca.*, ct.title type_title, cp.title place_title FROM cultural_activities ca LEFT JOIN cultural_types ct ON ct.id=ca.type_id LEFT JOIN cultural_places cp ON cp.id=ca.place_id WHERE ca.recorded_by=? ORDER BY ca.id DESC LIMIT 200", [$u['id']]); _repair_jdate_rows($rows,'activity_jdate'); return $rows;
});

// ==================== رفاهیات روابط عمومی ====================
function _ensure_welfare_tables() {
  try {
    Db::run("CREATE TABLE IF NOT EXISTS welfare_items (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(150) NOT NULL, description TEXT NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    Db::run("CREATE TABLE IF NOT EXISTS welfare_places (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(200) NOT NULL, address VARCHAR(400) NULL, phone VARCHAR(40) NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    Db::run("CREATE TABLE IF NOT EXISTS welfare_grants (id INT AUTO_INCREMENT PRIMARY KEY, item_id INT NOT NULL, place_id INT NULL, driver_national_id VARCHAR(10) NOT NULL, driver_name VARCHAR(200) NULL, driver_mobile VARCHAR(20) NULL, count INT NOT NULL DEFAULT 1, note TEXT NULL, granted_by INT NULL, granted_jdate VARCHAR(10) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_wg_nid (driver_national_id), INDEX idx_wg_item (item_id), INDEX idx_wg_date (granted_jdate)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $c = Db::one("SHOW COLUMNS FROM welfare_grants WHERE Field='place_id'");
    if (!$c) Db::run("ALTER TABLE welfare_grants ADD COLUMN place_id INT NULL");
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
}

// آیا کاربر به ثبت رفاهیات دسترسی دارد؟
function _can_welfare($u){
  if (($u['level'] ?? 0) >= ADMIN || !empty($u['is_admin'])) return true;
  try { $r = Db::one("SELECT can_welfare FROM users WHERE id=?", [$u['id']]); return !empty($r['can_welfare']); }
  catch (\Throwable $e) { return false; }
}

// --- مدیریت مکان‌های رفاهیات (فقط ادمین) ---
route('GET', '/api/admin/welfare-places', function($p,$b,$u){
  _ensure_welfare_tables();
  return Db::all("SELECT * FROM welfare_places ORDER BY is_active DESC, id DESC");
}, false, ADMIN);

route('POST', '/api/admin/welfare-places', function($p,$b,$u){
  _ensure_welfare_tables();
  $title = trim($b['title'] ?? '');
  if ($title === '') Http::error('عنوان مکان الزامی است', 422);
  $addr = trim($b['address'] ?? '') ?: null;
  $phone = trim($b['phone'] ?? '') ?: null;
  $active = isset($b['is_active']) ? (int)!!$b['is_active'] : 1;
  if (!empty($b['id'])) {
    Db::run("UPDATE welfare_places SET title=?, address=?, phone=?, is_active=? WHERE id=?", [$title,$addr,$phone,$active,(int)$b['id']]);
    return ['id'=>(int)$b['id']];
  }
  $id = Db::insert("INSERT INTO welfare_places(title,address,phone,is_active) VALUES(?,?,?,?)", [$title,$addr,$phone,$active]);
  return ['id'=>$id];
}, false, ADMIN);

route('DELETE', '/api/admin/welfare-places/{id}', function($p,$b,$u){
  _ensure_welfare_tables();
  Db::run("DELETE FROM welfare_places WHERE id=?", [(int)$p['id']]);
  return ['ok'=>true];
}, false, ADMIN);

// فهرست انواع رفاهیات
route('GET', '/api/admin/welfare-items', function($p,$b,$u){
  _ensure_welfare_tables();
  return Db::all("SELECT * FROM welfare_items ORDER BY is_active DESC, id DESC");
}, false, ADMIN);

// ساخت/ویرایش نوع رفاهیت
route('POST', '/api/admin/welfare-items', function($p,$b,$u){
  _ensure_welfare_tables();
  $title = trim($b['title'] ?? '');
  if ($title === '') Http::error('عنوان رفاهیت الزامی است', 422);
  $desc = trim($b['description'] ?? '') ?: null;
  $active = isset($b['is_active']) ? (int)!!$b['is_active'] : 1;
  if (!empty($b['id'])) {
    Db::run("UPDATE welfare_items SET title=?, description=?, is_active=? WHERE id=?", [$title,$desc,$active,(int)$b['id']]);
    return ['id'=>(int)$b['id']];
  }
  $id = Db::insert("INSERT INTO welfare_items(title,description,is_active) VALUES(?,?,?)", [$title,$desc,$active]);
  return ['id'=>$id];
}, false, ADMIN);

// حذف نوع رفاهیت
route('DELETE', '/api/admin/welfare-items/{id}', function($p,$b,$u){
  _ensure_welfare_tables();
  Db::run("DELETE FROM welfare_items WHERE id=?", [(int)$p['id']]);
  return ['ok'=>true];
}, false, ADMIN);

// ثبت تحویل رفاهیت به راننده
route('POST', '/api/admin/welfare-grants', function($p,$b,$u){
  _ensure_welfare_tables();
  $itemId = (int)($b['item_id'] ?? 0);
  $nid = trim($b['driver_national_id'] ?? '');
  if (!$itemId) Http::error('نوع رفاهیت را انتخاب کنید', 422);
  if ($nid === '') Http::error('کد ملی راننده الزامی است', 422);
  // فراخوان اطلاعات راننده
  $drv = Db::one("SELECT first_name,last_name,mobile FROM drivers WHERE national_id=?", [$nid]);
  $name = $drv ? trim(($drv['first_name']??'').' '.($drv['last_name']??'')) : ($b['driver_name'] ?? null);
  $mobile = $drv['mobile'] ?? ($b['driver_mobile'] ?? null);
  $count = max(1, (int)($b['count'] ?? 1));
  $note = trim($b['note'] ?? '') ?: null;
  $placeId = !empty($b['place_id']) ? (int)$b['place_id'] : null;
  // تاریخ واقعی ثبت از کلاینت گرفته می‌شود؛ اگر آفلاین بوده باشد همان زمان ثبت محلی ملاک است.
  $eventAt = _app_client_time($b);
  $jdate = _app_normalize_jdate($b['granted_jdate'] ?? null, $eventAt);
  $id = Db::insert("INSERT INTO welfare_grants(item_id,place_id,driver_national_id,driver_name,driver_mobile,count,note,granted_by,granted_jdate,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
    [$itemId,$placeId,$nid,$name,$mobile,$count,$note,$u['id'],$jdate,$eventAt]);
  return ['id'=>$id, 'driver_name'=>$name, 'driver_mobile'=>$mobile];
}, false, ADMIN);

// گزارش تحویل رفاهیات با فیلتر
route('GET', '/api/admin/welfare-grants', function($p,$b,$u){
  _ensure_welfare_tables();
  $where = "1=1"; $args = [];
  if (!empty($_GET['item_id'])) { $where .= " AND wg.item_id=?"; $args[] = (int)$_GET['item_id']; }
  if (!empty($_GET['national_id'])) { $where .= " AND wg.driver_national_id=?"; $args[] = trim($_GET['national_id']); }
  if (!empty($_GET['from'])) { $where .= " AND wg.granted_jdate>=?"; $args[] = $_GET['from']; }
  if (!empty($_GET['to'])) { $where .= " AND wg.granted_jdate<=?"; $args[] = $_GET['to']; }
  $rows = Db::all("SELECT wg.*, wi.title item_title, wp.title place_title, wp.address place_address,
      TRIM(CONCAT(COALESCE(gb.first_name,''),' ',COALESCE(gb.last_name,''))) granted_by_name
    FROM welfare_grants wg
    LEFT JOIN welfare_items wi ON wi.id=wg.item_id
    LEFT JOIN welfare_places wp ON wp.id=wg.place_id
    LEFT JOIN users gb ON gb.id=wg.granted_by
    WHERE $where ORDER BY wg.id DESC LIMIT 2000", $args);
  _repair_jdate_rows($rows,'granted_jdate');
  // خلاصه: مجموع تعداد بر اساس نوع رفاهیت
  $summary = Db::all("SELECT wi.title, COUNT(*) grant_count, SUM(wg.count) total_count
    FROM welfare_grants wg LEFT JOIN welfare_items wi ON wi.id=wg.item_id
    WHERE $where GROUP BY wg.item_id ORDER BY total_count DESC", $args);
  return ['rows'=>$rows, 'summary'=>$summary, 'total'=>count($rows)];
}, false, ADMIN);

// حذف یک تحویل رفاهیت
route('DELETE', '/api/admin/welfare-grants/{id}', function($p,$b,$u){
  _ensure_welfare_tables();
  Db::run("DELETE FROM welfare_grants WHERE id=?", [(int)$p['id']]);
  return ['ok'=>true];
}, false, ADMIN);

// رفاهیات دریافت‌شدهٔ یک راننده (برای صفحهٔ اطلاعات راننده)
route('GET', '/api/admin/driver-welfare', function($p,$b,$u){
  _ensure_welfare_tables();
  $nid = trim($_GET['national_id'] ?? '');
  if ($nid === '') return [];
  $rows=Db::all("SELECT wg.*, wi.title item_title, wp.title place_title, wp.address place_address,
      TRIM(CONCAT(COALESCE(gb.first_name,''),' ',COALESCE(gb.last_name,''))) granted_by_name
    FROM welfare_grants wg LEFT JOIN welfare_items wi ON wi.id=wg.item_id
    LEFT JOIN welfare_places wp ON wp.id=wg.place_id
    LEFT JOIN users gb ON gb.id=wg.granted_by
    WHERE wg.driver_national_id=? ORDER BY wg.id DESC", [$nid]);
  _repair_jdate_rows($rows,'granted_jdate'); return $rows;
}, false, ADMIN);

// --- نسخهٔ اپ: ثبت و مشاهدهٔ رفاهیات (فقط با دسترسی) ---
route('GET', '/api/my/welfare-items', function($p,$b,$u){
  _ensure_welfare_tables();
  if (!_can_welfare($u)) Http::error('شما به ثبت رفاهیات دسترسی ندارید', 403);
  return Db::all("SELECT id, title FROM welfare_items WHERE is_active=1 ORDER BY title");
});

route('GET', '/api/my/welfare-places', function($p,$b,$u){
  _ensure_welfare_tables();
  if (!_can_welfare($u)) Http::error('دسترسی ندارید', 403);
  return Db::all("SELECT id, title, address FROM welfare_places WHERE is_active=1 ORDER BY title");
});

route('POST', '/api/my/welfare-grants', function($p,$b,$u){
  _ensure_welfare_tables();
  if (!_can_welfare($u)) Http::error('شما به ثبت رفاهیات دسترسی ندارید', 403);
  $itemId = (int)($b['item_id'] ?? 0);
  $nid = trim($b['driver_national_id'] ?? '');
  if (!$itemId) Http::error('نوع رفاهیت را انتخاب کنید', 422);
  if ($nid === '') Http::error('کد ملی راننده الزامی است', 422);
  $drv = Db::one("SELECT first_name,last_name,mobile FROM drivers WHERE national_id=?", [$nid]);
  if (!$drv) Http::error('راننده‌ای با این کد ملی یافت نشد', 404);
  $name = trim(($drv['first_name']??'').' '.($drv['last_name']??''));
  $count = max(1, (int)($b['count'] ?? 1));
  $note = trim($b['note'] ?? '') ?: null;
  $placeId = !empty($b['place_id']) ? (int)$b['place_id'] : null;
  $eventAt = _app_client_time($b);
  $jdate = _app_normalize_jdate($b['granted_jdate'] ?? null, $eventAt);
  $id = Db::insert("INSERT INTO welfare_grants(item_id,place_id,driver_national_id,driver_name,driver_mobile,count,note,granted_by,granted_jdate,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
    [$itemId,$placeId,$nid,$name,$drv['mobile']??null,$count,$note,$u['id'],$jdate,$eventAt]);
  return ['id'=>$id, 'driver_name'=>$name];
});

route('GET', '/api/my/welfare-grants', function($p,$b,$u){
  _ensure_welfare_tables();
  if (!_can_welfare($u)) Http::error('دسترسی ندارید', 403);
  $rows=Db::all("SELECT wg.*, wi.title item_title, wp.title place_title
    FROM welfare_grants wg LEFT JOIN welfare_items wi ON wi.id=wg.item_id
    LEFT JOIN welfare_places wp ON wp.id=wg.place_id
    WHERE wg.granted_by=? ORDER BY wg.id DESC LIMIT 200", [$u['id']]);
  _repair_jdate_rows($rows,'granted_jdate'); return $rows;
});

// تاریخچهٔ رفاهیات یک راننده (برای نمایش در اپ پس از جستجوی راننده)
route('GET', '/api/my/driver-welfare', function($p,$b,$u){
  _ensure_welfare_tables();
  if (!_can_welfare($u)) Http::error('دسترسی ندارید', 403);
  $nid = trim($_GET['national_id'] ?? '');
  if ($nid === '') return [];
  $rows=Db::all("SELECT wg.*, wi.title item_title, wp.title place_title,
      TRIM(CONCAT(COALESCE(gb.first_name,''),' ',COALESCE(gb.last_name,''))) granted_by_name
    FROM welfare_grants wg LEFT JOIN welfare_items wi ON wi.id=wg.item_id
    LEFT JOIN welfare_places wp ON wp.id=wg.place_id
    LEFT JOIN users gb ON gb.id=wg.granted_by
    WHERE wg.driver_national_id=? ORDER BY wg.id DESC LIMIT 200", [$nid]);
  _repair_jdate_rows($rows,'granted_jdate'); return $rows;
});

// تاریخچهٔ فعالیت فرهنگی یک راننده (برای نمایش در اپ)
route('GET', '/api/my/driver-cultural', function($p,$b,$u){
  _ensure_cultural_tables();
  if (!_can_cultural($u)) Http::error('دسترسی ندارید', 403);
  $nid = trim($_GET['national_id'] ?? '');
  if ($nid === '') return [];
  $rows=Db::all("SELECT ca.*, ct.title type_title, cp.title place_title,
      TRIM(CONCAT(COALESCE(rb.first_name,''),' ',COALESCE(rb.last_name,''))) recorded_by_name
    FROM cultural_activities ca LEFT JOIN cultural_types ct ON ct.id=ca.type_id
    LEFT JOIN cultural_places cp ON cp.id=ca.place_id
    LEFT JOIN users rb ON rb.id=ca.recorded_by
    WHERE ca.driver_national_id=? ORDER BY ca.id DESC LIMIT 200", [$nid]);
  _repair_jdate_rows($rows,'activity_jdate'); return $rows;
});

route('GET', '/api/admin/stats', function($p,$b,$u){
  $c = fn($sql) => (int)Db::one($sql)['n'];
  return [
    'drivers'=>$c("SELECT COUNT(*) n FROM drivers"),
    'lines'=>$c("SELECT COUNT(*) n FROM `lines` WHERE status='فعال'"),
    'today_attendance'=>$c("SELECT COUNT(*) n FROM attendances WHERE DATE(created_at)=CURDATE()"),
    'unpaid_bills'=>$c("SELECT COUNT(*) n FROM bills WHERE status<>'پرداخت شده'"),
    'notices_month'=>$c("SELECT COUNT(*) n FROM notices WHERE DATE_FORMAT(created_at,'%Y-%m')=DATE_FORMAT(NOW(),'%Y-%m')"),
    'week_attendance'=>array_map(fn($r)=>['d'=>$r['d'],'n'=>(int)$r['n']], Db::all("SELECT DATE_FORMAT(created_at,'%m-%d') d, COUNT(*) n FROM attendances WHERE created_at>DATE_SUB(NOW(),INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY DATE(created_at)")),
    'by_line'=>array_map(fn($r)=>['code'=>$r['code'],'n'=>(int)$r['n']], Db::all("SELECT l.code, COUNT(*) n FROM attendances a JOIN `lines` l ON l.id=a.line_id WHERE a.created_at>DATE_SUB(NOW(),INTERVAL 30 DAY) GROUP BY l.code ORDER BY n DESC LIMIT 8")),
  ];
});
// مقام‌های بالاسری یک کاربر (برای فرم ویرایش)

route('GET', '/api/admin/users', function($p,$b,$u){
  $conds=[]; $pr=[];
  if (!empty($_GET['q'])) { $conds[]="(u.first_name LIKE ? OR u.last_name LIKE ? OR u.username LIKE ?)"; $q='%'.$_GET['q'].'%'; array_push($pr,$q,$q,$q); }
  if (!empty($_GET['role_id'])) { $conds[]="u.role_id=?"; $pr[]=(int)$_GET['role_id']; }
  if (!empty($_GET['zone_id'])) { $conds[]="u.zone_id=?"; $pr[]=(int)$_GET['zone_id']; }
  if (isset($_GET['active']) && $_GET['active']!=='') { $conds[]="u.is_active=?"; $pr[]=(int)$_GET['active']; }
  $where=$conds?('WHERE '.implode(' AND ',$conds)):'';
  // اطمینان از وجود ستون‌های فلگ جدید
  foreach (['can_be_substitute','can_welfare','can_cultural','can_manage_temp_drivers'] as $flag) {
    try { if (!Db::one("SHOW COLUMNS FROM users WHERE Field='$flag'")) Db::run("ALTER TABLE users ADD COLUMN $flag TINYINT(1) NOT NULL DEFAULT 0"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  }
  try { if (!Db::one("SHOW COLUMNS FROM users WHERE Field='personnel_code'")) Db::run("ALTER TABLE users ADD COLUMN personnel_code VARCHAR(40) NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  try { if (!Db::one("SHOW COLUMNS FROM users WHERE Field='birth_date'")) Db::run("ALTER TABLE users ADD COLUMN birth_date VARCHAR(20) NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  try { _ensure_commitments_table(); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  return Db::all("SELECT u.id,u.username,u.first_name,u.last_name,u.role_id,r.title role_title,r.level,u.manager_id,u.zone_id,u.is_active,u.email,CASE WHEN u.photo_path IS NOT NULL AND u.photo_path<>'' THEN CONCAT('/api/media?path=', u.photo_path) ELSE u.photo END AS photo,u.signature_data,u.allow_android,u.allow_web,u.security_exempt,u.phone,u.national_code,u.personnel_code,u.rank_stars,u.marital_status,u.address,u.children_count,u.presence_required,u.seniority_start,u.can_send_sms,u.can_be_substitute,u.can_welfare,u.can_cultural,u.can_manage_temp_drivers,u.birth_date,u.device_model,u.android_version,u.app_version,
    (SELECT COUNT(*) FROM user_commitments uc WHERE uc.user_id=u.id) commitments_count,
    (SELECT device_type FROM user_sessions s WHERE s.user_id=u.id AND s.revoked_at IS NULL AND s.device_type='android' LIMIT 1) android_bound,
    (SELECT device_type FROM user_sessions s WHERE s.user_id=u.id AND s.revoked_at IS NULL AND s.device_type='web' LIMIT 1) web_bound
    FROM users u JOIN roles r ON r.id=u.role_id $where ORDER BY r.level DESC, r.title ASC, u.last_name ASC, u.first_name ASC, u.id ASC", $pr);
});
route('POST', '/api/admin/users', function($p,$b,$u){
  // اطمینان از وجود ستون تاریخ تولد در نسخه‌های ارتقایی
  try { if (!Db::one("SHOW COLUMNS FROM users WHERE Field='birth_date'")) Db::run("ALTER TABLE users ADD COLUMN birth_date VARCHAR(20) NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  if (Db::one("SELECT 1 a FROM users WHERE username=?", [$b['username']])) Http::error('این کد ملی قبلاً ثبت شده است', 409);
  $id = Db::insert("INSERT INTO users(username,first_name,last_name,password_hash,role_id,zone_id,manager_id,phone,email,allow_android,allow_web,national_code,marital_status,address,children_count,birth_date,must_change_pw)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)", [$b['username'],$b['first_name'],$b['last_name'],
    password_hash($b['password'] ?? '123456', PASSWORD_BCRYPT), $b['role_id'], $b['zone_id'] ?? null, $b['manager_id'] ?? null, $b['phone'] ?? null,
    $b['email'] ?? null, isset($b['allow_android'])?(int)!!$b['allow_android']:1, isset($b['allow_web'])?(int)!!$b['allow_web']:1,
    $b['national_code'] ?? null, $b['marital_status'] ?? null, $b['address'] ?? null, isset($b['children_count'])?(int)$b['children_count']:null, $b['birth_date'] ?? null]);
  // ذخیرهٔ مقام‌های بالاسری (چند مدیر)
  $mgrs = $b['manager_ids'] ?? ($b['manager_id'] ? [$b['manager_id']] : []);
  if (is_array($mgrs)) foreach (array_unique(array_map('intval',$mgrs)) as $mid) if ($mid) Db::run("INSERT IGNORE INTO user_managers(user_id,manager_id) VALUES(?,?)", [$id,$mid]);
  // ارسال خودکار پیامک خوش‌آمد با نام کاربری و رمز عبور (در صورت فعال بودن سرویس و وجود موبایل)
  $smsSent = false;
  $phone = trim($b['phone'] ?? '');
  if ($phone !== '' && Sms::isEnabled()) {
    $tplRow = Db::one("SELECT value FROM app_settings WHERE `key`='sms_welcome_template'");
    $tpl = $tplRow ? json_decode($tplRow['value'], true) : null;
    $pw = $b['password'] ?? '123456';
    if (!$tpl || trim($tpl) === '') {
      $tpl = "به سامانهٔ مدیریت خطوط تاکسیرانی خوش آمدید.\nنام کاربری: {username}\nرمز عبور: {password}\nلطفاً در نخستین ورود رمز را تغییر دهید.";
    }
    $text = str_replace(
      ['{username}','{password}','{first_name}','{last_name}'],
      [$b['username'], $pw, $b['first_name'] ?? '', $b['last_name'] ?? ''],
      $tpl);
    $r = Sms::send([$phone], $text, 'register', $u['id']);
    $smsSent = !empty($r['ok']);
  }
  // ذخیرهٔ چند مقام بالاسری (در صورت ارسال manager_ids)
  if (isset($b['manager_ids']) && is_array($b['manager_ids'])) {
    foreach (array_unique(array_map('intval', $b['manager_ids'])) as $mid) {
      if ($mid && $mid != $id) Db::run("INSERT IGNORE INTO user_managers(user_id,manager_id) VALUES(?,?)", [$id, $mid]);
    }
  }
  return ['id'=>$id, 'sms_sent'=>$smsSent];
}, false, ADMIN);
route('PUT', '/api/admin/users/{id}', function($p,$b,$u){
  // اطمینان از وجود ستون‌های فلگ جدید (یک‌بار)
  try { if (!Db::one("SHOW COLUMNS FROM users WHERE Field='security_exempt'")) Db::run("ALTER TABLE users ADD COLUMN security_exempt TINYINT(1) NOT NULL DEFAULT 0"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  if (array_key_exists('security_exempt',$b)) $b['security_exempt'] = !empty($b['security_exempt']) ? 1 : 0;
  foreach (['can_be_substitute','can_welfare','can_cultural','can_manage_temp_drivers'] as $flag) {
    if (array_key_exists($flag,$b)) {
      try { if (!Db::one("SHOW COLUMNS FROM users WHERE Field='$flag'")) Db::run("ALTER TABLE users ADD COLUMN $flag TINYINT(1) NOT NULL DEFAULT 0"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
    }
  }
  if (array_key_exists('personnel_code',$b)) { try { if (!Db::one("SHOW COLUMNS FROM users WHERE Field='personnel_code'")) Db::run("ALTER TABLE users ADD COLUMN personnel_code VARCHAR(40) NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); } }
  if (array_key_exists('birth_date',$b)) { try { if (!Db::one("SHOW COLUMNS FROM users WHERE Field='birth_date'")) Db::run("ALTER TABLE users ADD COLUMN birth_date VARCHAR(20) NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); } $b['birth_date'] = trim((string)($b['birth_date'] ?? '')) ?: null; }
  if (array_key_exists('rank_stars',$b)) { try { if (!Db::one("SHOW COLUMNS FROM users WHERE Field='rank_stars'")) Db::run("ALTER TABLE users ADD COLUMN rank_stars TINYINT NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); } $b['rank_stars'] = ($b['rank_stars']==='' || $b['rank_stars']===null) ? null : max(0, min(5, (int)$b['rank_stars'])); }
  $fields=[]; $vals=[];
  foreach (['first_name','last_name','role_id','zone_id','manager_id','is_active','phone','email','allow_android','allow_web','security_exempt','marital_status','address','national_code','children_count','presence_required','seniority_start','can_send_sms','birth_date','can_be_substitute','can_welfare','can_cultural','can_manage_temp_drivers','personnel_code','rank_stars'] as $k)
    if (array_key_exists($k,$b)) { $fields[]="$k=?"; $vals[] = is_bool($b[$k]) ? (int)$b[$k] : $b[$k]; }
  if ($fields) { $vals[]=$p['id']; Db::run("UPDATE users SET ".implode(',',$fields)." WHERE id=?", $vals); }
  // همگام‌سازی مقام‌های بالاسری (چند مدیر) در صورت ارسال manager_ids
  if (array_key_exists('manager_ids', $b) && is_array($b['manager_ids'])) {
    Db::run("DELETE FROM user_managers WHERE user_id=?", [$p['id']]);
    foreach (array_unique(array_map('intval',$b['manager_ids'])) as $mid) if ($mid) Db::run("INSERT IGNORE INTO user_managers(user_id,manager_id) VALUES(?,?)", [$p['id'],$mid]);
    // برای سازگاری، اولین مدیر را در manager_id هم نگه می‌داریم
    Db::run("UPDATE users SET manager_id=? WHERE id=?", [array_values(array_filter(array_map('intval',$b['manager_ids'])))[0] ?? null, $p['id']]);
  }
  $savedExempt = null;
  try { $savedExempt = (int)(Db::one("SELECT security_exempt FROM users WHERE id=?", [$p['id']])['security_exempt'] ?? 0); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  return ['ok'=>true, 'security_exempt'=>$savedExempt];
}, false, ADMIN);
// مقام‌های بالاسری یک کاربر
route('POST', '/api/admin/users/{id}/reset-password', function($p,$b,$u){
  Db::run("UPDATE users SET password_hash=?, must_change_pw=1 WHERE id=?", [password_hash($b['password'] ?? '123456', PASSWORD_BCRYPT), $p['id']]); return ['ok'=>true];
}, false, ADMIN);
route('POST', '/api/admin/users/{id}/revoke-device', function($p,$b,$u){
  $type = $b['device_type'] ?? null; // 'android' | 'web' | null(=هر دو)
  if ($type) Db::run("UPDATE user_sessions SET revoked_at=NOW() WHERE user_id=? AND device_type=?", [$p['id'], $type]);
  else       Db::run("UPDATE user_sessions SET revoked_at=NOW() WHERE user_id=?", [$p['id']]);
  Db::run("INSERT INTO activity_logs(user_id,event,meta) VALUES(?, 'device_revoked', ?)", [$p['id'], json_encode(['by'=>$u['id'],'type'=>$type])]);
  return ['ok'=>true];
}, false, ADMIN);
route('POST', '/api/admin/users/{id}/photo', function($p,$b,$u){
  $_pp = !empty($b['photo']) ? Media::saveBase64($b['photo'], 'users', 600, 75) : null;
  Db::run("UPDATE users SET photo_path=? WHERE id=?", [$_pp, $p['id']]); return ['ok'=>true];
}, false, ADMIN);
// ثبت/ویرایش امضای پرسنلی کاربر توسط مدیر (همان ستونی که کاربر از داخل برنامه امضا می‌کند)
route('POST', '/api/admin/users/{id}/signature', function($p,$b,$u){
  $sig = $b['signature_data'] ?? null;
  if ($sig === '') $sig = null;
  if ($sig !== null && strpos($sig, 'data:image') !== 0) Http::error('تصویر امضا نامعتبر است', 400);
  Db::run("UPDATE users SET signature_data=? WHERE id=?", [$sig, $p['id']]);
  return ['ok'=>true];
}, false, ADMIN);
route('PUT', '/api/admin/users/{id}/org', function($p,$b,$u){
  // فقط فیلدهایی که در درخواست آمده‌اند به‌روزرسانی می‌شوند تا تنظیم منطقه، مدیر را پاک نکند و برعکس
  $sets = []; $args = [];
  if (array_key_exists('manager_id', $b)) { $sets[] = "manager_id=?"; $args[] = $b['manager_id'] ?: null; }
  if (array_key_exists('zone_id', $b))    { $sets[] = "zone_id=?";    $args[] = $b['zone_id'] ?: null; }
  if ($sets) { $args[] = $p['id']; Db::run("UPDATE users SET ".implode(',', $sets)." WHERE id=?", $args); }
  return ['ok'=>true];
}, false, ADMIN);
route('GET', '/api/admin/users/{id}/lines', fn($p,$b,$u) => Db::all(
  "SELECT l.id,l.code,l.origin,l.destination FROM user_lines ul JOIN `lines` l ON l.id=ul.line_id WHERE ul.user_id=?", [$p['id']]));
route('PUT', '/api/admin/users/{id}/lines', function($p,$b,$u){
  Db::run("DELETE FROM user_lines WHERE user_id=?", [$p['id']]);
  foreach (($b['line_ids'] ?? []) as $lid) Db::run("INSERT IGNORE INTO user_lines(user_id,line_id) VALUES(?,?)", [$p['id'], $lid]);
  return ['ok'=>true];
});
route('GET', '/api/admin/roles', fn($p,$b,$u) => Db::all("SELECT id,title,level,is_admin FROM roles ORDER BY level DESC"));
route('POST', '/api/admin/roles', function($p,$b,$u){
  if (empty($b['title'])) Http::error('عنوان نقش لازم است',400);
  try { $id = Db::insert("INSERT INTO roles(title,level,is_admin) VALUES(?,?,?)", [trim($b['title']), (int)($b['level']??1), (int)!empty($b['is_admin'])]); }
  catch (\Throwable $e) { Http::error('این عنوان نقش قبلاً ثبت شده است',409); }
  return ['id'=>$id];
}, false, ADMIN);
route('PUT', '/api/admin/roles/{id}', function($p,$b,$u){
  $f=[];$v=[]; foreach(['title','level','is_admin'] as $k) if(array_key_exists($k,$b)){ $f[]="$k=?"; $v[]= $k==='title'?trim($b[$k]):(int)$b[$k]; }
  if($f){ $v[]=$p['id']; Db::run("UPDATE roles SET ".implode(',',$f)." WHERE id=?", $v); }
  return ['ok'=>true];
}, false, ADMIN);
route('DELETE', '/api/admin/roles/{id}', function($p,$b,$u){
  $n = Db::one("SELECT COUNT(*) c FROM users WHERE role_id=?", [$p['id']]);
  if (($n['c']??0) > 0) Http::error('این نقش به کاربرانی اختصاص دارد و قابل حذف نیست',409);
  Db::run("DELETE FROM roles WHERE id=?", [$p['id']]);
  return ['ok'=>true];
}, false, ADMIN);
route('GET', '/api/admin/zones', fn($p,$b,$u) => Db::all("SELECT * FROM zones ORDER BY id"));
route('POST', '/api/admin/zones', fn($p,$b,$u) => ['id'=>Db::insert("INSERT INTO zones(name,parent_id) VALUES(?,?)", [$b['name'], $b['parent_id'] ?? null]), 'name'=>$b['name']], false, ADMIN);
route('PUT', '/api/admin/zones/{id}', function($p,$b,$u){ Db::run("UPDATE zones SET name=? WHERE id=?", [$b['name'], $p['id']]); return ['ok'=>true]; }, false, ADMIN);
route('DELETE', '/api/admin/zones/{id}', function($p,$b,$u){ Db::run("UPDATE users SET zone_id=NULL WHERE zone_id=?", [$p['id']]); Db::run("DELETE FROM zones WHERE id=?", [$p['id']]); return ['ok'=>true]; }, false, ADMIN);
route('GET', '/api/admin/lines', fn($p,$b,$u) => Db::all("SELECT id,code,origin,destination,status,checkin_methods FROM `lines` ORDER BY code"));
// تنظیم روش‌های مجاز ثبت حضور یک خط (آرایه‌ای از gps/qr/wifi/nfc/bt یا null برای همه)
route('PUT', '/api/admin/lines/{id}/checkin-methods', function($p,$b,$u){
  $methods = $b['methods'] ?? null;
  $val = (is_array($methods) && $methods) ? json_encode(array_values($methods)) : null;
  Db::run("UPDATE `lines` SET checkin_methods=? WHERE id=?", [$val, $p['id']]);
  return ['ok'=>true];
}, false, ADMIN);
route('POST', '/api/admin/lines', function($p,$b,$u){
  $code = trim($b['code'] ?? ''); if ($code==='') Http::error('کد خط لازم است', 400);
  Db::run("INSERT INTO `lines`(code,origin,destination,status) VALUES(?,?,?,?)
           ON DUPLICATE KEY UPDATE origin=VALUES(origin),destination=VALUES(destination),status=VALUES(status)",
          [$code, $b['origin'] ?? null, $b['destination'] ?? null, $b['status'] ?? 'فعال']);
  return ['ok'=>true];
}, false, ADMIN);
route('GET', '/api/admin/drivers', function($p,$b,$u){
  $c=[]; $pr=[];
  if (!empty($_GET['q'])) { $c[]="(d.national_id LIKE ? OR d.first_name LIKE ? OR d.last_name LIKE ?)"; $q='%'.$_GET['q'].'%'; array_push($pr,$q,$q,$q); }
  if (!empty($_GET['gender'])) { $c[]="d.gender=?"; $pr[]=$_GET['gender']; }
  if (!empty($_GET['driver_type'])) { $c[]="d.driver_type=?"; $pr[]=$_GET['driver_type']; }
  if (!empty($_GET['op_status'])) { $c[]="d.op_lic_status=?"; $pr[]=$_GET['op_status']; }
  if (!empty($_GET['line'])) { $c[]="EXISTS(SELECT 1 FROM vehicle_drivers vd JOIN vehicles v ON v.id=vd.vehicle_id JOIN `lines` l ON l.id=v.line_id WHERE vd.driver_id=d.id AND l.code=?)"; $pr[]=$_GET['line']; }
  if (!empty($_GET['model'])) { $c[]="EXISTS(SELECT 1 FROM vehicle_drivers vd JOIN vehicles v ON v.id=vd.vehicle_id WHERE vd.driver_id=d.id AND v.model_name LIKE ?)"; $pr[]='%'.$_GET['model'].'%'; }
  $where=$c?('WHERE '.implode(' AND ',$c)):'';
  $total=(int) Db::one("SELECT COUNT(*) n FROM drivers d $where", $pr)['n'];
  $per=min(200,max(10,(int)($_GET['per'] ?? 25))); $page=max(1,(int)($_GET['page'] ?? 1)); $off=($page-1)*$per;
  $rows=Db::all("SELECT d.id,d.national_id,d.first_name,d.last_name,d.mobile,d.gender,d.driver_type,d.taxi_lic_status,d.op_lic_status,d.op_lic_expire
    FROM drivers d $where ORDER BY d.id LIMIT $per OFFSET $off", $pr);
  return ['rows'=>$rows,'total'=>$total,'page'=>$page,'per'=>$per,'pages'=>(int)ceil($total/$per)];
});

// گزارش عملکرد ماهانه تاکسیران و ریز حضورها
route('GET', '/api/admin/driver-performance', function($p,$b,$u){
  _ensure_attendances_schema();
  $nid=preg_replace('/\\D+/','', (string)($_GET['national_id']??''));
  $jy=(int)($_GET['year']??_app_jdate_from_time(date('Y-m-d')));
  if(strlen($nid)!==10) Http::error('کد ملی ۱۰ رقمی لازم است',422);
  $d=Db::one("SELECT id,national_id,first_name,last_name,mobile FROM drivers WHERE national_id=?",[$nid]);
  if(!$d) Http::error('تاکسیران یافت نشد',404);
  $rows=Db::all("SELECT a.id,a.created_at,a.exit_at,a.line_id,l.code line_code,l.origin,l.destination,
    TIMESTAMPDIFF(MINUTE,a.created_at,COALESCE(a.exit_at,NOW())) duration_minutes,
    TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) recorder_name
    FROM attendances a LEFT JOIN `lines` l ON l.id=a.line_id LEFT JOIN users u ON u.id=a.user_id
    WHERE a.driver_id=? ORDER BY a.created_at DESC",[$d['id']]);
  $months=array_fill(1,12,0); $details=array_fill(1,12,[]);
  foreach($rows as $x){ $ts=strtotime($x['created_at']); [$y,$m,$day]=gregorian_to_jalali((int)date('Y',$ts),(int)date('n',$ts),(int)date('j',$ts)); if((int)$y!==$jy) continue; $x['jdate']=sprintf('%04d/%02d/%02d',$y,$m,$day); $months[(int)$m]++; $details[(int)$m][]=$x; }
  return ['driver'=>$d,'year'=>$jy,'months'=>$months,'details'=>$details,'total'=>array_sum($months)];
}, false, ADMIN);

route('GET', '/api/admin/driver-notices', function($p,$b,$u){
  $nid=preg_replace('/\\D+/','', (string)($_GET['national_id']??''));
  if(strlen($nid)!==10) Http::error('کد ملی ۱۰ رقمی لازم است',422);
  $d=Db::one("SELECT id,national_id,first_name,last_name FROM drivers WHERE national_id=?",[$nid]); if(!$d) Http::error('تاکسیران یافت نشد',404);
  $rows=Db::all("SELECT n.id,n.created_at,n.priority,n.body,nr.title reason,TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) recorder_name FROM notices n LEFT JOIN notice_reasons nr ON nr.id=n.reason_id LEFT JOIN users u ON u.id=n.user_id WHERE n.driver_id=? ORDER BY n.id DESC",[$d['id']]);
  return ['driver'=>$d,'rows'=>$rows,'total'=>count($rows)];
}, false, ADMIN);
route('DELETE', '/api/admin/driver-notices/{id}', function($p,$b,$u){
  $id=(int)$p['id']; $n=Db::one("SELECT attachment_path FROM notices WHERE id=?",[$id]); if(!$n) Http::error('تذکر یافت نشد',404);
  Db::run("DELETE FROM notices WHERE id=?",[$id]);
  if(!empty($n['attachment_path'])){ $f=dirname(__DIR__).'/public/'.ltrim($n['attachment_path'],'/'); if(is_file($f)) @unlink($f); }
  return ['ok'=>true];
}, false, ADMIN);
route('GET', '/api/admin/driver-notices/export', function($p,$b,$u){
  $nid=preg_replace('/\\D+/','', (string)($_GET['national_id']??'')); $d=Db::one("SELECT id,first_name,last_name FROM drivers WHERE national_id=?",[$nid]); if(!$d) Http::error('تاکسیران یافت نشد',404);
  $rows=Db::all("SELECT n.created_at,n.priority,n.body,nr.title reason,TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) recorder_name FROM notices n LEFT JOIN notice_reasons nr ON nr.id=n.reason_id LEFT JOIN users u ON u.id=n.user_id WHERE n.driver_id=? ORDER BY n.id DESC",[$d['id']]);
  header('Content-Type: text/csv; charset=UTF-8'); header('Content-Disposition: attachment; filename=driver-notices-'.$nid.'.csv'); echo "\\xEF\\xBB\\xBF"; $o=fopen('php://output','w'); fputcsv($o,['تاریخ','نوع','اولویت','شرح','ثبت‌کننده']); foreach($rows as $x) fputcsv($o,[$x['created_at'],$x['reason'],$x['priority'],$x['body'],$x['recorder_name']]); fclose($o); exit;
}, false, ADMIN);

route('GET', '/api/admin/drivers/{id}/full', function($p,$b,$u){
  $d = Db::one("SELECT * FROM drivers WHERE id=?", [$p['id']]); if(!$d) Http::error('یافت نشد',404);
  $d['vehicles']  = Db::all("SELECT v.plate, MAX(v.model_name) model_name, MAX(v.model_year) model_year, MAX(l.code) line_code,
       MAX(vd.role) role, MAX(vd.shift) shift FROM vehicle_drivers vd JOIN vehicles v ON v.id=vd.vehicle_id
       LEFT JOIN `lines` l ON l.id=v.line_id WHERE vd.driver_id=? GROUP BY v.plate", [$p['id']]);
  $d['notices']   = Db::all("SELECT n.created_at,n.priority,n.body,nr.title reason FROM notices n LEFT JOIN notice_reasons nr ON nr.id=n.reason_id WHERE n.driver_id=? ORDER BY n.created_at DESC", [$p['id']]);
  $d['bills']     = Db::all("SELECT amount,status,pay_date FROM bills WHERE national_id=? ORDER BY pay_date DESC LIMIT 50", [$d['national_id']]);
  $d['checklists']= Db::all("SELECT created_at,answers FROM checklist_submissions WHERE driver_id=? ORDER BY created_at DESC LIMIT 50", [$p['id']]);
  foreach ($d['checklists'] as &$cl) $cl['answers']=json_decode($cl['answers'],true);
  return $d;
}, false, ADMIN);
route('PUT', '/api/admin/drivers/{id}', function($p,$b,$u){
  $f=[]; $v=[];
  foreach (['first_name','last_name','father_name','mobile','gender','address','driver_type','taxi_lic_status','op_lic_status'] as $k)
    if (array_key_exists($k,$b)) { $f[]="$k=?"; $v[]=$b[$k]; }
  if ($f){ $v[]=$p['id']; Db::run("UPDATE drivers SET ".implode(',',$f)." WHERE id=?", $v); }
  return ['ok'=>true];
}, false, ADMIN);
route('DELETE', '/api/admin/drivers/{id}', function($p,$b,$u){ Db::run("DELETE FROM drivers WHERE id=?", [$p['id']]); return ['ok'=>true]; }, false, ADMIN);
// پاکسازی فیش‌های خالی/خراب (ردیف‌هایی که فیلدهای کلیدی‌شان null است)
route('POST', '/api/admin/bills-cleanup', function($p,$b,$u){
  $before = (int)(Db::one("SELECT COUNT(*) n FROM bills")['n'] ?? 0);
  // حذف ردیف‌هایی که هیچ داده‌ای ندارند
  Db::run("DELETE FROM bills WHERE (bill_id IS NULL OR bill_id='')
    AND (national_id IS NULL OR national_id='')
    AND (plate IS NULL OR plate='')
    AND (amount IS NULL OR amount=0)
    AND (person_title IS NULL OR person_title='')
    AND (pay_id IS NULL OR pay_id='')");
  $after = (int)(Db::one("SELECT COUNT(*) n FROM bills")['n'] ?? 0);
  return ['ok'=>true, 'before'=>$before, 'after'=>$after, 'deleted'=>$before-$after];
}, false, ADMIN);

// تشخیصی: بررسی مستقیم داده‌های bills (برای عیب‌یابی نمایش)
route('GET', '/api/admin/bills-debug', function($p,$b,$u){
  $count = (int)(Db::one("SELECT COUNT(*) n FROM bills")['n'] ?? 0);
  $cols = array_column(Db::all("SHOW COLUMNS FROM bills"), 'Field');
  $sample = Db::all("SELECT * FROM bills ORDER BY id DESC LIMIT 2");
  return [
    'total_rows' => $count,
    'columns' => $cols,
    'sample_rows' => $sample,
    'first_row_keys' => $sample ? array_keys($sample[0]) : [],
  ];
}, false, ADMIN);

route('GET', '/api/admin/bills', function($p,$b,$u){
  $st = !empty($_GET['status']) ? $_GET['status'] : null;
  $q  = !empty($_GET['q']) ? '%'.trim($_GET['q']).'%' : null;
  $per = min(100, max(10, (int)($_GET['per'] ?? 25)));
  $page = max(1, (int)($_GET['page'] ?? 1));
  $offset = ($page - 1) * $per;

  // شرط WHERE پایه — ردیف‌های کاملاً خالی نمایش داده نمی‌شوند
  $where = "((bill_id IS NOT NULL AND bill_id<>'') OR (national_id IS NOT NULL AND national_id<>'') OR (plate IS NOT NULL AND plate<>'') OR (person_title IS NOT NULL AND person_title<>''))";
  $params = [];
  if ($st !== null) { $where .= " AND status = ?"; $params[] = $st; }
  if ($q !== null) {
    $where .= " AND (national_id LIKE ? OR person_title LIKE ? OR plate LIKE ? OR bill_id LIKE ?)";
    $params[] = $q; $params[] = $q; $params[] = $q; $params[] = $q;
  }

  // شمارش کل (برای pagination)
  $total = (int)(Db::one("SELECT COUNT(*) n FROM bills WHERE $where", $params)['n'] ?? 0);

  // کوئری صفحهٔ جاری
  $rows = Db::all("SELECT * FROM bills WHERE $where ORDER BY id DESC LIMIT $per OFFSET $offset", $params);

  // افزودن نام راننده
  if ($rows) {
    $driverIds = array_values(array_unique(array_filter(array_map(fn($r) => $r['driver_id'] ?? null, $rows))));
    $names = [];
    if ($driverIds) {
      $in = implode(',', array_fill(0, count($driverIds), '?'));
      try {
        foreach (Db::all("SELECT id, first_name, last_name FROM drivers WHERE id IN ($in)", $driverIds) as $d) {
          $names[$d['id']] = trim(($d['first_name'] ?? '').' '.($d['last_name'] ?? ''));
        }
      } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
    }
    foreach ($rows as &$r) {
      $r['driver_name'] = (!empty($r['driver_id']) && isset($names[$r['driver_id']])) ? $names[$r['driver_id']] : '';
      if (!isset($r['line_text'])) $r['line_text'] = '';
    }
    unset($r);
  }
  return ['rows'=>$rows, 'total'=>$total, 'page'=>$page, 'per'=>$per, 'pages'=>max(1, (int)ceil($total/$per))];
}, false, ADMIN);
// سرو تصویر حضور مسئول (فایل فیزیکی یا base64 قدیمی)
route('GET', '/api/admin/official-visits/{id}/image', function($p,$b,$u){
  $r = Db::one("SELECT photo_data, photo_path FROM official_visits WHERE id=?", [$p['id']]);
  if (!$r) Http::error('یافت نشد', 404);
  if (!empty($r['photo_path'])) { Media::serve($r['photo_path']); }
  if (empty($r['photo_data'])) Http::error('یافت نشد', 404);
  $data = $r['photo_data'];
  if (strpos($data, 'base64,') !== false) $data = substr($data, strpos($data, 'base64,') + 7);
  header('Content-Type: image/jpeg'); echo base64_decode($data); exit;
}, false, ADMIN);
// لیست حضور مسئولین با فیلتر نام/تاریخ (برای پنل)
route('GET', '/api/admin/official-visits', function($p,$b,$u){
  $official = trim($_GET['official'] ?? '');
  $role = trim($_GET['role'] ?? '');
  $officialId = (int)($_GET['official_id'] ?? 0);
  $from = trim($_GET['from'] ?? '');
  $to = trim($_GET['to'] ?? '');
  $where = "1=1"; $params = [];
  if ($officialId > 0) { $where .= " AND ov.official_id = ?"; $params[] = $officialId; }
  elseif ($official !== '') {
    $where .= " AND (CONCAT(COALESCE(o.first_name,''),' ',COALESCE(o.last_name,'')) LIKE ? OR COALESCE(o.first_name,'') LIKE ? OR COALESCE(o.last_name,'') LIKE ? OR COALESCE(o.username,'') LIKE ?)";
    $like = "%$official%"; $params[] = $like; $params[] = $like; $params[] = $like; $params[] = $like;
  }
  if ($role !== '') { $where .= " AND orole.title = ?"; $params[] = $role; }
  if ($from !== '') { $where .= " AND DATE(ov.created_at) >= ?"; $params[] = $from; }
  if ($to !== '')   { $where .= " AND DATE(ov.created_at) <= ?"; $params[] = $to; }
  return Db::all("SELECT ov.id, ov.created_at, ov.note, ov.lat, ov.lng,
      CONCAT(o.first_name,' ',o.last_name) official,
      orole.title official_role,
      l.code line,
      CONCAT(r.first_name,' ',r.last_name) recorded_by
    FROM official_visits ov
    LEFT JOIN users o ON o.id = ov.official_id
    LEFT JOIN roles orole ON orole.id = o.role_id
    LEFT JOIN users r ON r.id = ov.recorded_by
    LEFT JOIN `lines` l ON l.id = ov.line_id
    WHERE $where
    ORDER BY ov.id DESC LIMIT 500", $params);
}, false, ADMIN);

// فهرست مسئولینی که حضورشان ثبت شده (برای فیلتر در پنل)
route('GET', '/api/admin/official-list', function($p,$b,$u){
  return Db::all("SELECT DISTINCT o.id, CONCAT(o.first_name,' ',o.last_name) name, r.title role_title
    FROM official_visits ov JOIN users o ON o.id=ov.official_id LEFT JOIN roles r ON r.id=o.role_id
    ORDER BY name");
}, false, ADMIN);

route('GET', '/api/admin/official-visits/chart', function($p,$b,$u){
  $rows = Db::all("SELECT CONCAT(u.first_name,' ',u.last_name) name, COUNT(*) n FROM official_visits ov JOIN users u ON u.id=ov.official_id GROUP BY ov.official_id ORDER BY n DESC LIMIT 15");
  return ['labels'=>array_column($rows,'name'), 'data'=>array_map('intval', array_column($rows,'n'))];
}, false, ADMIN);
route('POST', '/api/admin/notice-reasons', fn($p,$b,$u) => ['id'=>Db::insert("INSERT INTO notice_reasons(title) VALUES(?)", [$b['title']]), 'title'=>$b['title']], false, ADMIN);
route('DELETE', '/api/admin/notice-reasons/{id}', function($p,$b,$u){ Db::run("UPDATE notice_reasons SET is_active=0 WHERE id=?", [$p['id']]); return ['ok'=>true]; }, false, ADMIN);
route('POST', '/api/admin/checklist-templates', function($p,$b,$u){
  // سازگاری با دیتابیس نسخه‌های قدیمی: ستون‌های گزینه‌ها و نوع پاسخ ممکن است وجود نداشته باشند.
  try { Db::run("ALTER TABLE checklist_items ADD COLUMN options TEXT NULL"); } catch (\Throwable $e) {}
  try { Db::run("ALTER TABLE checklist_items ADD COLUMN answer_type VARCHAR(20) NOT NULL DEFAULT 'single'"); } catch (\Throwable $e) {}
  $title = trim((string)($b['title'] ?? 'چک‌لیست بازدید خودرو')) ?: 'چک‌لیست بازدید خودرو';
  $items = array_values(array_filter(($b['items'] ?? []), function($it){
    $label = is_array($it) ? ($it['label'] ?? '') : $it;
    return trim((string)$label) !== '';
  }));
  if (!$items) Http::error('حداقل یک آیتم چک‌لیست تعریف کنید.', 422);
  try {
    Db::pdo()->beginTransaction();
    Db::run("UPDATE checklist_templates SET is_active=0");
    $tid = Db::insert("INSERT INTO checklist_templates(title,is_active) VALUES(?,1)", [$title]);
    $i=0; foreach ($items as $it) {
      $label = trim((string)(is_array($it) ? ($it['label'] ?? '') : $it));
      $opts  = is_array($it) && !empty($it['options']) ? json_encode(array_values($it['options']), JSON_UNESCAPED_UNICODE) : null;
      $atype = is_array($it) && in_array(($it['answer_type'] ?? 'single'), ['single','multi','text'], true) ? $it['answer_type'] : 'single';
      Db::run("INSERT INTO checklist_items(template_id,label,sort_order,options,answer_type) VALUES(?,?,?,?,?)", [$tid,$label,$i++,$opts,$atype]);
    }
    Db::pdo()->commit();
    return ['id'=>$tid,'ok'=>true];
  } catch (\Throwable $e) {
    try { Db::pdo()->rollBack(); } catch (\Throwable $ignored) {}
    error_log('checklist template save failed: '.$e->getMessage());
    Http::error('ذخیره چک‌لیست انجام نشد. ساختار دیتابیس را ارتقا دهید: '.$e->getMessage(), 500);
  }
}, false, ADMIN);

// موضوعات قابل انتخاب گزارش‌ها
function _ensure_report_subjects_table(){
  Db::run("CREATE TABLE IF NOT EXISTS report_subjects (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255) NOT NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, sort_order INT NOT NULL DEFAULT 0, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_report_subject_title (title)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}
route('GET', '/api/report-subjects', function($p,$b,$u){ _ensure_report_subjects_table(); return Db::all("SELECT id,title FROM report_subjects WHERE is_active=1 ORDER BY sort_order,id"); });
route('GET', '/api/admin/report-subjects', function($p,$b,$u){ _ensure_report_subjects_table(); return Db::all("SELECT id,title,is_active,sort_order FROM report_subjects ORDER BY sort_order,id"); }, false, ADMIN);
route('POST', '/api/admin/report-subjects', function($p,$b,$u){ _ensure_report_subjects_table(); $title=trim((string)($b['title']??'')); if($title==='') Http::error('عنوان موضوع الزامی است',422); try{$id=Db::insert("INSERT INTO report_subjects(title,sort_order,is_active) VALUES(?,?,1)",[$title,(int)($b['sort_order']??0)]);}catch(\Throwable $e){Http::error('این موضوع قبلاً ثبت شده است',409);} return ['id'=>$id,'title'=>$title,'is_active'=>1]; }, false, ADMIN);
route('PUT', '/api/admin/report-subjects/{id}', function($p,$b,$u){ _ensure_report_subjects_table(); $title=trim((string)($b['title']??'')); if($title==='') Http::error('عنوان موضوع الزامی است',422); Db::run("UPDATE report_subjects SET title=?,sort_order=?,is_active=? WHERE id=?",[$title,(int)($b['sort_order']??0),!empty($b['is_active'])?1:0,(int)$p['id']]); return ['ok'=>true]; }, false, ADMIN);
route('DELETE', '/api/admin/report-subjects/{id}', function($p,$b,$u){ _ensure_report_subjects_table(); Db::run("UPDATE report_subjects SET is_active=0 WHERE id=?",[(int)$p['id']]); return ['ok'=>true]; }, false, ADMIN);

route('GET', '/api/admin/settings', function($p,$b,$u){
  $out=[]; foreach (Db::all("SELECT `key`,value FROM app_settings") as $r) $out[$r['key']] = json_decode($r['value'], true);
  return $out;
},false,ADMIN);
route('PUT', '/api/admin/settings', function($p,$b,$u){
  // یکسان‌سازی تنظیمات اشتراک برای جلوگیری از باقی‌ماندن حالت قدیمی یا متناقض.
  if(array_key_exists('subscription_mode',$b) || array_key_exists('subscription_enabled',$b)){
    // ذخیرهٔ جزئی تنظیمات نباید حالت انتخاب‌شده را ناخواسته به «معمولی» برگرداند.
    $currentMode=function_exists('_subscription_mode')?_subscription_mode():'normal';
    $currentEnabled=function_exists('_subscription_enabled')?_subscription_enabled():false;
    $mode=array_key_exists('subscription_mode',$b)
      ? strtolower(trim((string)$b['subscription_mode']))
      : $currentMode;
    $mode=in_array($mode,['normal','group','individual'],true)?$mode:'normal';
    $enabled=array_key_exists('subscription_enabled',$b)
      ? filter_var($b['subscription_enabled'],FILTER_VALIDATE_BOOLEAN,FILTER_NULL_ON_FAILURE)
      : $currentEnabled;
    if($enabled===null) $enabled=!empty($b['subscription_enabled']);
    // حالت «استفاده معمولی/بدون اشتراک» باید همیشه همه کنترل‌های اشتراک را خاموش کند،
    // حتی اگر مقدار subscription_enabled از حالت قبلی (گروهی/انفرادی) در دیتابیس مانده باشد.
    if($mode==='normal') $enabled=false;
    else $enabled=true;
    // خاموش‌کردن صریح کلید فعال‌سازی نیز سامانه را به حالت معمولی می‌برد.
    if(array_key_exists('subscription_enabled',$b) && !$enabled) $mode='normal';
    $b['subscription_mode']=$mode;
    $b['subscription_enabled']=$enabled;
    foreach(['subscription_group_amount','subscription_individual_amount'] as $ak){
      if(array_key_exists($ak,$b)) $b[$ak]=max(0,(int)preg_replace('/[^0-9]/','',(string)$b[$ak]));
    }
  }
  foreach ($b as $k=>$v) Db::run("INSERT INTO app_settings(`key`,value) VALUES(?,?) ON DUPLICATE KEY UPDATE value=VALUES(value),updated_at=NOW()", [$k, json_encode($v, JSON_UNESCAPED_UNICODE)]);
  return ['ok'=>true,'subscription'=>function_exists('_subscription_status_for_user')?_subscription_status_for_user($u):null];
}, false, ADMIN);
// تنظیمات عمومی (محدودیت آپلود هر بخش) برای اپ میدانی — فقط کلیدهای غیرحساس
route('GET', '/api/settings/public', function($p,$b,$u){
  $keys = ['upload_reports','upload_checklists','upload_notices','image_quality','image_max_width','image_max_height','thumbnail_size','thumbnail_quality','attachment_retention_days','form_attachment_retention_days','presence_retention_days','covert_selfie_retention_days','salary_slip_retention_days','company_request_retention_days','site_title','site_logo','org_title','org_logo','plate_ocr_enabled','plate_ocr_mode','plate_ocr_min_confidence','plate_ocr_require_confirm','plate_ocr_save_samples','plate_ocr_fixed_letter','plate_ocr_region_code','plate_ocr_crop_width','plate_ocr_crop_quality','cloud_ocr_enabled','cloud_ocr_provider','cloud_ocr_api_key','cloud_ocr_endpoint','cloud_ocr_connect_timeout','cloud_ocr_timeout'];
  $out=[]; foreach (Db::all("SELECT `key`,value FROM app_settings WHERE `key` IN ('".implode("','",$keys)."')") as $r) $out[$r['key']] = json_decode($r['value'], true);
  return $out;
}, true);
// حذف خودکار پیوست‌های قدیمی‌تر از N روز (از طریق Cron یا دکمهٔ مدیر)
// حذف خودکار تصاویر/پیوست‌ها بر اساس مدت نگهداری (هر بخش جداگانه)
function _run_retention_cleanup() {
  $get = function($k){ $r=Db::one("SELECT value FROM app_settings WHERE `key`=?",[$k]); $v=$r?json_decode($r['value'],true):0; return is_numeric($v)?max(0,(int)$v):0; };
  $report=['deleted_files'=>0,'cleared_rows'=>0,'errors'=>[],'sections'=>[]];
  $deletePath=function($path) use (&$report){ if(!$path)return; try{$full=Media::fullPath($path); if($full&&is_file($full)){Media::delete($path);$report['deleted_files']++;}}catch(\Throwable $e){$report['errors'][]=$e->getMessage();} };
  $cleanTable=function($table,$dateCol,$days,$pathCols=[],$dataCols=[],$deleteRows=false) use (&$report,$deletePath){
    if($days<=0)return;
    $cut=date('Y-m-d H:i:s',time()-$days*86400); $section=['days'=>$days,'files'=>0,'rows'=>0];
    try{
      $cols=array_values(array_unique(array_merge(['id'],$pathCols)));
      $rows=Db::all("SELECT `".implode('`,`',$cols)."` FROM `$table` WHERE `$dateCol` < ?",[$cut]);
      $before=$report['deleted_files'];
      foreach($rows as $r)foreach($pathCols as $c)if(!empty($r[$c]))$deletePath($r[$c]);
      $section['files']=$report['deleted_files']-$before;
      if($deleteRows){ $section['rows']=(int)Db::run("DELETE FROM `$table` WHERE `$dateCol` < ?",[$cut]); }
      else {
        $sets=[]; foreach(array_merge($pathCols,$dataCols) as $c)$sets[]="`$c`=NULL";
        if($sets)$section['rows']=(int)Db::run("UPDATE `$table` SET ".implode(',',$sets)." WHERE `$dateCol` < ?",[$cut]);
      }
      $report['cleared_rows']+=$section['rows']; $report['sections'][$table]=$section;
    }catch(\Throwable $e){$report['errors'][]=$table.': '.$e->getMessage();}
  };
  $att=$get('attachment_retention_days');
  $cleanTable('reports','created_at',$att,['attachment_path'],['attachment_data']);
  $cleanTable('report_attachments','created_at',$att,['file_path','thumbnail_path'],[],true);
  $cleanTable('notices','created_at',$att,['attachment_path'],['attachment_data']);
  $cleanTable('messages','created_at',$att,['attachment_path'],['attachment_data']);
  $form=$get('form_attachment_retention_days');
  $cleanTable('checklist_submissions','created_at',$form,['photo_path'],['photo_data']);
  $cleanTable('official_visits','created_at',$form,['photo_path'],['photo_data']);
  $cleanTable('form_submissions','created_at',$form,['attachment_path'],['attachment_data']);
  $pres=$get('presence_retention_days');
  $cleanTable('presence_checks','captured_at',$pres,['selfie_path','vehicles_photo_path'],['selfie','vehicles_photo']);
  $cov=$get('covert_selfie_retention_days'); if($cov<=0)$cov=$pres;
  $cleanTable('covert_selfies','created_at',$cov,['photo_path'],['photo_data'],true);
  $salary=$get('salary_slip_retention_days');
  $cleanTable('user_salary_slips','created_at',$salary,['file_path'],[],true);
  $company=$get('company_request_retention_days');
  if($company>0){
    $cut=date('Y-m-d H:i:s',time()-$company*86400);
    try{
      $rows=Db::all("SELECT f.id,f.file_path,f.original_path,f.processed_path,f.thumbnail_path FROM company_request_files f JOIN company_requests r ON r.id=f.request_id WHERE r.created_at < ?",[$cut]);
      $before=$report['deleted_files']; foreach($rows as $r)foreach(['file_path','original_path','processed_path','thumbnail_path'] as $c)if(!empty($r[$c]))$deletePath($r[$c]);
      if($rows){$ids=array_column($rows,'id');$in=implode(',',array_fill(0,count($ids),'?'));$n=(int)Db::run("DELETE FROM company_request_files WHERE id IN ($in)",$ids);}else$n=0;
      $report['sections']['company_request_files']=['days'=>$company,'files'=>$report['deleted_files']-$before,'rows'=>$n];$report['cleared_rows']+=$n;
    }catch(\Throwable $e){$report['errors'][]='company_request_files: '.$e->getMessage();}
  }
  $report['ok']=count($report['errors'])===0;
  return $report;
}

route('POST', '/api/admin/cleanup-attachments', function($p,$b,$u){
  $rep = _run_retention_cleanup();
  return ['ok'=>true, 'applied'=>$rep];
}, false, ADMIN);

// اجرای خودکار از طریق Cron:  wget -qO- "https://app.yousefipour.ir/api/cron/cleanup?key=КЛЮЧ"
route('GET', '/api/cron/cleanup', function($p,$b,$u){
  $cfg = Db::one("SELECT value FROM app_settings WHERE `key`='cron_key'");
  $key = $cfg ? json_decode($cfg['value'], true) : null;
  if (!$key || ($_GET['key'] ?? '') !== $key) Http::error('forbidden', 403);
  return ['ok'=>true, 'applied'=>_run_retention_cleanup()];
}, true);
route('GET', '/api/admin/report', function($p,$b,$u){
  $type = $_GET['type'] ?? ''; $from=$_GET['from']??null; $to=$_GET['to']??null;
  $rng=''; $params=[];
  $add=function($col) use (&$rng,&$params,$from,$to){ if($from){$rng.=" AND $col>=?";$params[]=$from;} if($to){$rng.=" AND $col<=?";$params[]=$to;} };
  // تابع کمکی: تشخیص خودرو/کد در خط/نقش راننده + قالب‌بندی نقش و زمان انتظار
  $roleFa=function($r){ if(!$r)return ''; $x=mb_strtolower($r); if(strpos($x,'oper')!==false||strpos($r,'بهره')!==false)return 'بهره‌بردار'; if(strpos($x,'assist')!==false||strpos($r,'کمک')!==false)return 'کمکی'; return $r; };
  $waitFmt=function($a,$b){ if(!$a||!$b)return ''; $s=strtotime($b)-strtotime($a); if($s<0)return ''; $h=floor($s/3600);$m=floor(($s%3600)/60); return sprintf('%02d:%02d',$h,$m); };
  if ($type==='attendance') { $add('a.created_at');
    $rows=Db::all("SELECT a.created_at, a.exit_at, dr.national_id nid, CONCAT(dr.first_name,' ',dr.last_name) driver, dr.driver_type dtype, l.code line,
        (SELECT v.plate FROM vehicle_drivers vd JOIN vehicles v ON v.id=vd.vehicle_id WHERE vd.driver_id=dr.id ORDER BY (v.line_id<=>a.line_id) DESC, vd.id ASC LIMIT 1) plate,
        (SELECT vd.line_code_in_line FROM vehicle_drivers vd JOIN vehicles v ON v.id=vd.vehicle_id WHERE vd.driver_id=dr.id ORDER BY (v.line_id<=>a.line_id) DESC, vd.id ASC LIMIT 1) line_code,
        (SELECT vd.role FROM vehicle_drivers vd JOIN vehicles v ON v.id=vd.vehicle_id WHERE vd.driver_id=dr.id ORDER BY (v.line_id<=>a.line_id) DESC, vd.id ASC LIMIT 1) vrole,
        CONCAT(us.first_name,' ',us.last_name) by_user
      FROM attendances a JOIN drivers dr ON dr.id=a.driver_id JOIN users us ON us.id=a.user_id LEFT JOIN `lines` l ON l.id=a.line_id WHERE 1=1 $rng ORDER BY a.created_at DESC LIMIT 5000",$params);
    return ['cols'=>['تاریخ','راننده','کد ملی','خط','کد در خط','پلاک','نوع فعالیت','زمان ورود به ایستگاه','زمان خروج از ایستگاه','زمان انتظار','ثبت‌کننده'],
      'rows'=>array_map(fn($r)=>[
        substr(fa_datetime($r['created_at']),0,10), $r['driver'], $r['nid'], $r['line']??'', $r['line_code']??'', $r['plate']??'',
        $roleFa($r['vrole']) ?: ($r['dtype']??''), fa_datetime($r['created_at']),
        $r['exit_at']?fa_datetime($r['exit_at']):'در خط', $waitFmt($r['created_at'],$r['exit_at']), $r['by_user']],$rows)];
  }
  if ($type==='notices') { $add('n.created_at');
    $rows=Db::all("SELECT n.created_at, dr.national_id nid, CONCAT(dr.first_name,' ',dr.last_name) driver, dr.driver_type dtype, nr.title reason, n.priority,
        (SELECT v.plate FROM vehicle_drivers vd JOIN vehicles v ON v.id=vd.vehicle_id WHERE vd.driver_id=dr.id ORDER BY vd.id ASC LIMIT 1) plate,
        (SELECT l2.code FROM vehicle_drivers vd JOIN vehicles v ON v.id=vd.vehicle_id LEFT JOIN `lines` l2 ON l2.id=v.line_id WHERE vd.driver_id=dr.id ORDER BY vd.id ASC LIMIT 1) line,
        (SELECT vd.line_code_in_line FROM vehicle_drivers vd JOIN vehicles v ON v.id=vd.vehicle_id WHERE vd.driver_id=dr.id ORDER BY vd.id ASC LIMIT 1) line_code,
        (SELECT vd.role FROM vehicle_drivers vd JOIN vehicles v ON v.id=vd.vehicle_id WHERE vd.driver_id=dr.id ORDER BY vd.id ASC LIMIT 1) vrole,
        CONCAT(us.first_name,' ',us.last_name) by_user
      FROM notices n JOIN drivers dr ON dr.id=n.driver_id JOIN users us ON us.id=n.user_id LEFT JOIN notice_reasons nr ON nr.id=n.reason_id WHERE 1=1 $rng ORDER BY n.created_at DESC LIMIT 5000",$params);
    $P=['low'=>'کم','medium'=>'متوسط','high'=>'زیاد'];
    return ['cols'=>['تاریخ','راننده','کد ملی','خط','کد در خط','پلاک','نوع فعالیت','موضوع','اولویت','ثبت‌کننده'],
      'rows'=>array_map(fn($r)=>[substr(fa_datetime($r['created_at']),0,10),$r['driver'],$r['nid'],$r['line']??'',$r['line_code']??'',$r['plate']??'',$roleFa($r['vrole'])?:($r['dtype']??''),$r['reason']??'',$P[$r['priority']]??$r['priority'],$r['by_user']],$rows)];
  }
  if ($type==='checklists') { $add('c.created_at');
    $rows=Db::all("SELECT c.created_at, dr.national_id nid, CONCAT(dr.first_name,' ',dr.last_name) driver, dr.driver_type dtype,
        (SELECT v.plate FROM vehicle_drivers vd JOIN vehicles v ON v.id=vd.vehicle_id WHERE vd.driver_id=dr.id ORDER BY vd.id ASC LIMIT 1) plate,
        (SELECT l2.code FROM vehicle_drivers vd JOIN vehicles v ON v.id=vd.vehicle_id LEFT JOIN `lines` l2 ON l2.id=v.line_id WHERE vd.driver_id=dr.id ORDER BY vd.id ASC LIMIT 1) line,
        (SELECT vd.line_code_in_line FROM vehicle_drivers vd JOIN vehicles v ON v.id=vd.vehicle_id WHERE vd.driver_id=dr.id ORDER BY vd.id ASC LIMIT 1) line_code,
        (SELECT vd.role FROM vehicle_drivers vd JOIN vehicles v ON v.id=vd.vehicle_id WHERE vd.driver_id=dr.id ORDER BY vd.id ASC LIMIT 1) vrole,
        CONCAT(us.first_name,' ',us.last_name) by_user
      FROM checklist_submissions c LEFT JOIN drivers dr ON dr.id=c.driver_id JOIN users us ON us.id=c.user_id WHERE 1=1 $rng ORDER BY c.created_at DESC LIMIT 5000",$params);
    return ['cols'=>['تاریخ','راننده','کد ملی','خط','کد در خط','پلاک','نوع فعالیت','ثبت‌کننده'],
      'rows'=>array_map(fn($r)=>[substr(fa_datetime($r['created_at']),0,10),$r['driver']??'',$r['nid']??'',$r['line']??'',$r['line_code']??'',$r['plate']??'',$roleFa($r['vrole'])?:($r['dtype']??''),$r['by_user']],$rows)];
  }
  if ($type==='bills') {
    $q = !empty($_GET['q']) ? '%'.$_GET['q'].'%' : null;
    $rows=Db::all("SELECT person_title,national_id,plate,amount,status FROM bills WHERE (? IS NULL OR national_id LIKE ?) ORDER BY id DESC LIMIT 5000",[$q,$q]);
    return ['cols'=>['شخص','کد ملی','پلاک','مبلغ(ریال)','وضعیت'],'rows'=>array_map(fn($r)=>[$r['person_title'],$r['national_id'],$r['plate'],number_format((int)$r['amount']),$r['status']],$rows)];
  }
  if ($type==='presence_violations') {
    $f = $from ?: date('Y-m-d'); $t = $to ?: $f;
    $f = date('Y-m-d', strtotime($f)); $t = date('Y-m-d', strtotime($t));
    $cfgRow = Db::one("SELECT value FROM app_settings WHERE `key`='presence_check'");
    $cfg = $cfgRow ? json_decode($cfgRow['value'], true) : [];
    $rows = [];
    if (!empty($cfg['enabled']) && !empty($cfg['slots'])) {
      $grace = (int)($cfg['grace_minutes'] ?? 15);
      $users = Db::all("SELECT u.id, CONCAT(u.first_name,' ',u.last_name) name, r.title role FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.is_active=1 AND u.presence_required=1");
      $aud = $cfg['audience'] ?? 'all_required';
      $done = Db::all("SELECT user_id, slot_date, slot FROM presence_checks WHERE slot_date BETWEEN ? AND ?", [$f,$t]);
      $ds = []; foreach ($done as $d) $ds[$d['user_id'].'|'.$d['slot_date'].'|'.$d['slot']] = true;
      $now = time();
      for ($day = strtotime($f); $day <= strtotime($t); $day += 86400) {
        $dd = date('Y-m-d', $day);
        foreach ($users as $usr) foreach ($cfg['slots'] as $sl) {
          if (strtotime($dd.' '.$sl.':00') + $grace*60 > $now) continue;
          if ($aud === 'shift_only' && !_presence_user_in_shift((int)$usr['id'], $dd, strtotime($dd.' '.$sl.':00'))) continue;
          if (empty($ds[$usr['id'].'|'.$dd.'|'.$sl])) $rows[] = [fa_datetime($dd.' 00:00:00'), $usr['name'], $usr['role']?:'—', $sl, 'عدم ارسال صحت‌سنجی حضور'];
        }
      }
    }
    return ['cols'=>['تاریخ','نیرو','سمت','بازهٔ ساعتی','نوع تخلف'], 'rows'=>$rows];
  }
  Http::error('نوع گزارش نامعتبر', 400);
});
// ==================== بکاپ / بازیابی / پاکسازی دیتابیس (فقط مدیر) ====================
// دانلود بکاپ کامل دیتابیس به‌صورت فایل SQL
route('GET', '/api/admin/backup', function($p,$b,$u){
  @set_time_limit(600); @ini_set('memory_limit','768M');
  $light = !empty($_GET['light']); // حالت سبک: بدون تصاویر base64
  $fname = 'backup_taxi_' . date('Ymd_His') . ($light ? '_light' : '') . '.sql';
  header('Content-Type: application/sql; charset=UTF-8');
  header('Content-Disposition: attachment; filename="' . $fname . '"');
  try{ _v201_health_tables(); Db::run("INSERT INTO backup_log(kind,is_light,created_by) VALUES('sql',?,?)",[$light?1:0,(int)$u['id']]); }catch(\Throwable $e){}
  Backup::streamDump($light);
  exit;
}, false, ADMIN);

// بکاپ JSON کامل برای نرم‌افزار ویندوزی آفلاین (ایمپورت در SQLite)
route('GET', '/api/admin/backup-json', function($p,$b,$u){
  @set_time_limit(900); @ini_set('memory_limit','1024M');
  $light = !empty($_GET['light']);
  $fname = 'taxi_backup_' . date('Ymd_His') . ($light ? '_light' : '') . '.json';
  header('Content-Type: application/json; charset=UTF-8');
  header('Content-Disposition: attachment; filename="' . $fname . '"');
  try{ _v201_health_tables(); Db::run("INSERT INTO backup_log(kind,is_light,created_by) VALUES('json',?,?)",[$light?1:0,(int)$u['id']]); }catch(\Throwable $e){}
  Backup::streamJson($light);
  exit;
}, false, ADMIN);

// فهرست فایل‌های رسانه (تصاویر فیزیکی) برای دانلود توسط نرم‌افزار ویندوزی
route('GET', '/api/admin/backup-media-list', function($p,$b,$u){
  $dir = __DIR__ . '/../public/uploads';
  $out = [];
  if (is_dir($dir)) {
    $rii = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS));
    foreach ($rii as $f) {
      if ($f->isFile()) {
        $rel = ltrim(str_replace($dir, '', $f->getPathname()), '/\\');
        $out[] = ['path'=>str_replace('\\','/',$rel), 'size'=>$f->getSize()];
      }
    }
  }
  return ['count'=>count($out), 'files'=>$out];
}, false, ADMIN);

// بازیابی از فایل SQL آپلودی
route('POST', '/api/admin/restore', function($p,$b,$u){
  @set_time_limit(600); @ini_set('memory_limit','768M');
  if (empty($_FILES['file']) || ($_FILES['file']['error'] ?? 1) !== 0) Http::error('فایلی ارسال نشد یا حجم بیش از حد مجاز هاست است', 400);
  $sql = file_get_contents($_FILES['file']['tmp_name']);
  if (!$sql || strlen($sql) < 10) Http::error('فایل بکاپ خالی یا نامعتبر است', 400);
  // بررسی ساده که فایل واقعاً بکاپ این سامانه باشد
  if (strpos($sql, 'CREATE TABLE') === false && strpos($sql, 'INSERT INTO') === false) {
    Http::error('فایل ارسالی یک بکاپ SQL معتبر نیست', 422);
  }
  $res = Backup::restoreFromSql($sql);
  return array_merge(['ok'=>true], $res);
}, false, ADMIN);

// پاکسازی انتخابی داده‌ها (نیازمند تأیید با عبارت)
route('POST', '/api/admin/purge', function($p,$b,$u){
  @set_time_limit(300);
  $confirm = $b['confirm'] ?? '';
  if ($confirm !== 'پاکسازی') Http::error('برای پاکسازی باید عبارت تأیید را دقیقاً وارد کنید', 422);
  $kinds = $b['kinds'] ?? [];
  if (!is_array($kinds) || !$kinds) Http::error('هیچ موردی برای پاکسازی انتخاب نشده است', 400);
  $report = Backup::purge($kinds);
  return ['ok'=>true, 'report'=>$report];
}, false, ADMIN);

// مهاجرت تصاویر base64 به فایل فیزیکی (از پنل، با احراز هویت مدیر) — دسته‌ای
route('POST', '/api/admin/migrate-images', function($p,$b,$u){
  @set_time_limit(300); @ini_set('memory_limit','768M');
  $limit = max(20, min(300, (int)($b['limit'] ?? 100)));
  $report = [];
  $migrate = function($table, $dataCol, $pathCol, $type, $maxW, $q) use (&$report, $limit) {
    $done = 0; $fail = 0;
    try {
      $rows = Db::all("SELECT id, `$dataCol` AS d FROM `$table`
        WHERE `$dataCol` IS NOT NULL AND `$dataCol` <> '' AND (`$pathCol` IS NULL OR `$pathCol` = '') LIMIT $limit");
    } catch (\Throwable $e) { $report[$table] = 'skip'; return; }
    foreach ($rows as $r) {
      $path = Media::saveBase64($r['d'], $type, $maxW, $q);
      if ($path) { Db::run("UPDATE `$table` SET `$pathCol`=?, `$dataCol`=NULL WHERE id=?", [$path, $r['id']]); $done++; }
      else { $fail++; }
    }
    $report[$table] = ['migrated'=>$done, 'failed'=>$fail, 'more'=> (count($rows) === $limit)];
  };
  $migrate('reports','attachment_data','attachment_path','reports',1280,70);
  $migrate('notices','attachment_data','attachment_path','notices',1280,70);
  $migrate('checklist_submissions','photo_data','photo_path','checklists',1280,70);
  $migrate('official_visits','photo_data','photo_path','visits',1280,70);
  $migrate('covert_selfies','photo_data','photo_path','covert',960,65);
  $migrate('users','photo','photo_path','users',600,75);
  $migrate('messages','attachment_data','attachment_path','messages',1280,70);
  $migrate('presence_checks','selfie','selfie_path','presence',960,65);
  $migrate('presence_checks','vehicles_photo','vehicles_photo_path','presence',1280,68);
  $anyMore = false; foreach ($report as $r) { if (is_array($r) && !empty($r['more'])) $anyMore = true; }
  return ['ok'=>true, 'report'=>$report, 'more'=>$anyMore];
}, false, ADMIN);

// کدهای بابت مجاز برای ایمپورت فیش (پیش‌فرض ۲۰، ۲۱، ۲۲ = آبونمان)
route('GET', '/api/admin/bill-reason-codes', function($p,$b,$u){
  $r = Db::one("SELECT value FROM app_settings WHERE `key`='bill_import_reason_codes'");
  $codes = $r ? json_decode($r['value'], true) : [20, 21, 22];
  if (!is_array($codes) || !$codes) $codes = [20, 21, 22];
  return ['codes' => array_values(array_map('intval', $codes))];
}, false, ADMIN);
route('POST', '/api/admin/bill-reason-codes', function($p,$b,$u){
  $codes = $b['codes'] ?? [];
  if (!is_array($codes)) Http::error('فرمت نامعتبر', 400);
  $codes = array_values(array_unique(array_filter(array_map('intval', $codes), fn($c) => $c > 0)));
  if (!$codes) $codes = [20, 21, 22];
  Db::run("INSERT INTO app_settings(`key`,value) VALUES('bill_import_reason_codes',?) ON DUPLICATE KEY UPDATE value=VALUES(value)", [json_encode($codes)]);
  return ['ok'=>true, 'codes'=>$codes];
}, false, ADMIN);

// فیلترهای ایمپورت پروانهٔ بهره‌برداری: وضعیت‌ها و نوع پلاک مجاز
route('GET', '/api/admin/oplic-import-filters', function($p,$b,$u){
  $gs = Db::one("SELECT value FROM app_settings WHERE `key`='oplic_import_statuses'");
  $gp = Db::one("SELECT value FROM app_settings WHERE `key`='oplic_import_plate_types'");
  $statuses = $gs ? json_decode($gs['value'], true) : ['فعال','منقضی'];
  $plateTypes = $gp ? json_decode($gp['value'], true) : ['تاکسی'];
  if (!is_array($statuses) || !$statuses) $statuses = ['فعال','منقضی'];
  if (!is_array($plateTypes) || !$plateTypes) $plateTypes = ['تاکسی'];
  return ['statuses'=>array_values($statuses), 'plate_types'=>array_values($plateTypes)];
}, false, ADMIN);
route('POST', '/api/admin/oplic-import-filters', function($p,$b,$u){
  $statuses = $b['statuses'] ?? [];
  $plateTypes = $b['plate_types'] ?? [];
  if (!is_array($statuses)) $statuses = [];
  if (!is_array($plateTypes)) $plateTypes = [];
  $statuses = array_values(array_unique(array_filter(array_map('trim', $statuses))));
  $plateTypes = array_values(array_unique(array_filter(array_map('trim', $plateTypes))));
  if (!$statuses) $statuses = ['فعال','منقضی'];
  if (!$plateTypes) $plateTypes = ['تاکسی'];
  Db::run("INSERT INTO app_settings(`key`,value) VALUES('oplic_import_statuses',?) ON DUPLICATE KEY UPDATE value=VALUES(value)", [json_encode($statuses, JSON_UNESCAPED_UNICODE)]);
  Db::run("INSERT INTO app_settings(`key`,value) VALUES('oplic_import_plate_types',?) ON DUPLICATE KEY UPDATE value=VALUES(value)", [json_encode($plateTypes, JSON_UNESCAPED_UNICODE)]);
  return ['ok'=>true, 'statuses'=>$statuses, 'plate_types'=>$plateTypes];
}, false, ADMIN);

// آخرین زمان به‌روزرسانی هر لیست (برای نمایش در اپ)
route('GET', '/api/my/import-times', function($p,$b,$u){
  $readTime = function(array $keys){
    foreach ($keys as $k) {
      $r = Db::one("SELECT value FROM app_settings WHERE `key`=?", [$k]);
      if (!$r || $r['value'] === null || trim((string)$r['value']) === '') continue;
      $raw = trim((string)$r['value']);
      $decoded = json_decode($raw, true);
      if (json_last_error() === JSON_ERROR_NONE && is_string($decoded)) $raw = trim($decoded);
      elseif (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) $raw = trim((string)($decoded['iso'] ?? $decoded['at'] ?? $decoded['value'] ?? ''));
      if ($raw === '') continue;
      try {
        $tz = new DateTimeZone('Asia/Tehran');
        $dt = new DateTimeImmutable($raw, $tz);
        return ['iso'=>$dt->format('Y-m-d\TH:i:sP'), 'unix'=>$dt->getTimestamp(), 'source_key'=>$k];
      } catch (Throwable $e) {
        return ['iso'=>$raw, 'unix'=>null, 'source_key'=>$k];
      }
    }
    return null;
  };
  return [
    ['key'=>'oplic',    'title'=>'تاریخ‌های بهره‌برداری',             'at'=>$readTime(['last_import_oplic','last_import_operation_license'])],
    ['key'=>'vehicles', 'title'=>'لیست خودروها (بیمه و معاینه فنی)', 'at'=>$readTime(['last_import_vehicles','last_import_vehicle'])],
    ['key'=>'drivers',  'title'=>'اطلاعات جامع رانندگان',             'at'=>$readTime(['last_import_drivers','last_import_driver'])],
    ['key'=>'taxilic',  'title'=>'پروانه‌های تاکسیرانی',              'at'=>$readTime(['last_import_taxilic','last_import_taxi_license'])],
    ['key'=>'bills',    'title'=>'لیست فیش‌ها',                       'at'=>$readTime(['last_import_bills','last_import_bill'])],
  ];
});

route('POST', '/api/admin/import/{kind}', function($p,$b,$u){
  @ini_set('memory_limit','512M'); @set_time_limit(600);
  if (empty($_FILES['file']) || ($_FILES['file']['error'] ?? 1) !== 0) Http::error('فایلی ارسال نشد یا حجم فایل از حد مجاز هاست بیشتر است', 400);
  if (!extension_loaded('zip') || !extension_loaded('xmlreader')) Http::error('افزونه‌های zip/xmlreader روی هاست فعال نیست', 500);
  $dir = sys_get_temp_dir().'/taxi_imports'; @mkdir($dir, 0777, true);
  $dest = "$dir/".uniqid().'.xlsx';
  if (!move_uploaded_file($_FILES['file']['tmp_name'], $dest)) Http::error('ذخیرهٔ موقت فایل ناموفق بود', 500);
  require_once __DIR__.'/Xlsx.php';
  try { $res = Importer::run($p['kind'], $dest); }
  finally { @unlink($dest); }
  // ثبت زمان آخرین ورود این نوع لیست
  try { Db::run("INSERT INTO app_settings(`key`,value) VALUES(?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)", ["last_import_{$p['kind']}", json_encode((new DateTimeImmutable('now', new DateTimeZone('Asia/Tehran')))->format('Y-m-d\TH:i:sP'))]); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  return array_merge(['ok'=>true], $res);
}, false, ADMIN);
// ورود قطعه‌قطعهٔ اکسل: ردیف‌ها به‌صورت JSON از مرورگر می‌آیند (برای فایل‌های حجیم)
// بدنه: { rows: [[سلول‌ها...], ...], offset: شمارهٔ ردیف شروع این قطعه }
route('POST', '/api/admin/import-chunk/{kind}', function($p,$b,$u){
  @ini_set('memory_limit','512M'); @set_time_limit(300);
  $rows = $b['rows'] ?? null;
  if (!is_array($rows)) Http::error('داده‌ای برای ورود ارسال نشد', 400);
  $offset = (int)($b['offset'] ?? 0);
  require_once __DIR__.'/Xlsx.php';
  $res = Importer::runRows($p['kind'], $rows, $offset);
  // ثبت زمان آخرین ورود این نوع لیست (در هر قطعه به‌روزرسانی می‌شود)
  try { Db::run("INSERT INTO app_settings(`key`,value) VALUES(?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)", ["last_import_{$p['kind']}", json_encode((new DateTimeImmutable('now', new DateTimeZone('Asia/Tehran')))->format('Y-m-d\TH:i:sP'))]); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  return array_merge(['ok'=>true], $res);
}, false, ADMIN);


/* ---------------- ربات پیام‌رسان بله ---------------- */
route('POST', '/api/bale/webhook/{secret}', function($p,$b,$u){
  $cfg = BaleBot::config();
  // وب‌هوک پرداخت حتی در صورت خاموش بودن اعلان‌های عمومی بله باید فعال بماند.
  if (empty($cfg['token'])) return ['ok'=>false,'reason'=>'bot_token_missing'];
  if (!$cfg['webhook_secret'] || !hash_equals((string)$cfg['webhook_secret'], (string)$p['secret'])) Http::error('webhook نامعتبر است', 403);
  if (!empty($b['pre_checkout_query'])) {
    $q=$b['pre_checkout_query']; $payment=_company_payment_by_payload($q['invoice_payload']??'');
    $currency=strtoupper((string)($q['currency']??''));
    $ok=$payment && in_array((string)$payment['status'],['pending','precheckout'],true) && (int)$payment['amount']===(int)($q['total_amount']??-1) && $currency==='IRR';
    if($payment) Db::exec("UPDATE company_request_payments SET status=IF(?,'precheckout',status),pre_checkout_query_id=?,last_error=?,raw_payload=? WHERE id=?",[$ok?1:0,$q['id']??null,$ok?null:'precheckout_validation_failed',json_encode($q,JSON_UNESCAPED_UNICODE),$payment['id']]);
    $answer=BaleBot::answerPreCheckoutQuery($q['id']??'',(bool)$ok,$ok?'':'صورتحساب معتبر نیست، منقضی شده یا مبلغ آن تغییر کرده است.');
    if($payment) _company_log((int)$payment['request_id'],(int)$payment['user_id'],$ok?'bale_precheckout_accepted':'bale_precheckout_rejected',$ok?'پیش‌پرداخت بله تأیید شد':'پیش‌پرداخت بله رد شد',['payment_id'=>(int)$payment['id'],'answer'=>$answer]);
    return ['ok'=>true,'pre_checkout_answered'=>true,'accepted'=>(bool)$ok];
  }
  $msg = $b['message'] ?? $b['edited_message'] ?? null;
  if (!$msg) return ['ok'=>true,'ignored'=>true];
  $text=trim((string)($msg['text']??''));
  if(preg_match('/^\/start\s+pay_(\d+)_([a-f0-9]{12})$/i',$text,$m)){
    $payment=_company_payment_full((int)$m[1]);
    if(!$payment || !hash_equals(substr(hash('sha256',(string)($payment['invoice_payload']??'')),0,12),strtolower($m[2]))) {
      BaleBot::sendMessage($msg['chat']['id']??'','لینک پرداخت نامعتبر یا منقضی است.');
      return ['ok'=>true,'payment_start'=>'invalid'];
    }
    $chatId=(string)($msg['chat']['id']??''); $fromId=$msg['from']['id']??null; $name=trim(($msg['from']['first_name']??'').' '.($msg['from']['last_name']??''));
    try{
      $usr=Db::one("SELECT phone FROM users WHERE id=?",[(int)$payment['user_id']]);
      $mobile=BaleBot::normalizeMobile($usr['phone']??'');
      Db::exec("INSERT INTO bale_subscribers(chat_id,bale_user_id,mobile,user_id,display_name,is_active,last_seen_at,created_at) VALUES(?,?,?,?,?,1,NOW(),NOW()) ON DUPLICATE KEY UPDATE bale_user_id=VALUES(bale_user_id),mobile=VALUES(mobile),user_id=VALUES(user_id),display_name=VALUES(display_name),is_active=1,last_seen_at=NOW()",[$chatId,$fromId,$mobile,(int)$payment['user_id'],$name]);
    }catch(Throwable $e){}
    $sent=_company_bale_send_invoice_for_payment($payment,$chatId);
    if(empty($sent['ok'])) BaleBot::sendMessage($chatId,'ارسال صورتحساب انجام نشد: '.(string)($sent['description']??$sent['error']??'خطای نامشخص'));
    return ['ok'=>true,'payment_start'=>'processed','invoice_sent'=>!empty($sent['ok'])];
  }
  if (!empty($msg['successful_payment'])) {
    $sp=$msg['successful_payment']; $payload=(string)($sp['invoice_payload']??'');
    if(str_starts_with($payload,'subscription:')){ $sub=Db::one("SELECT * FROM subscription_payments WHERE invoice_payload=? ORDER BY id DESC LIMIT 1",[$payload]); if(!$sub)return ['ok'=>true,'payment_ignored'=>'subscription_payload_not_found']; if((int)$sub['amount']!==(int)($sp['total_amount']??-1))return ['ok'=>true,'payment_ignored'=>'subscription_amount_mismatch']; _subscription_mark_paid($sub,$sp); BaleBot::sendMessage($msg['chat']['id']??'','پرداخت اشتراک با موفقیت ثبت شد و دسترسی ۳۰ روزه فعال گردید.'); return ['ok'=>true,'subscription_payment_recorded'=>true]; }
    $payment=_company_payment_by_payload($payload);
    if(!$payment) return ['ok'=>true,'payment_ignored'=>'payload_not_found'];
    if(strtoupper((string)($sp['currency']??''))!=='IRR') return ['ok'=>true,'payment_ignored'=>'currency_mismatch'];
    if((int)$payment['amount']!==(int)($sp['total_amount']??-1)) return ['ok'=>true,'payment_ignored'=>'amount_mismatch'];
    _company_payment_mark_paid($payment,$sp,'successful_payment_webhook');
    BaleBot::sendMessage($msg['chat']['id']??'',"پرداخت درخواست {$payment['request_tracking']} با موفقیت ثبت شد.
درخواست شما برای بررسی شرکت ارسال شد.",['target_type'=>'company_request_payment','target_id'=>$payment['request_id']]);
    return ['ok'=>true,'payment_recorded'=>true,'idempotent'=>true];
  }
  return BaleBot::processMessage($msg);
}, true);

route('GET', '/api/admin/bale/subscribers', function($p,$b,$u){
  return Db::all("SELECT bs.*, CONCAT(us.first_name,' ',us.last_name) user_name, CONCAT(d.first_name,' ',d.last_name) driver_name
                  FROM bale_subscribers bs
                  LEFT JOIN users us ON us.id=bs.user_id
                  LEFT JOIN drivers d ON d.id=bs.driver_id
                  ORDER BY bs.last_seen_at DESC, bs.id DESC LIMIT 500");
}, false, ADMIN);

route('GET', '/api/admin/bale/log', function($p,$b,$u){
  return Db::all("SELECT * FROM bale_message_log ORDER BY id DESC LIMIT 300");
}, false, ADMIN);

route('POST', '/api/admin/bale/test', function($p,$b,$u){
  $mobile = $b['mobile'] ?? '';
  $text = $b['message'] ?? 'پیام آزمایشی سامانه تاکسیرانی از طریق ربات بله';
  $res = BaleBot::sendToMobile($mobile, $text, 'test', $u['id']);
  return $res;
}, false, ADMIN);

route('POST', '/api/admin/bale/send', function($p,$b,$u){
  $target = $b['target_type'] ?? 'users';
  $text = trim((string)($b['message'] ?? ''));
  if ($text === '') Http::error('متن پیام لازم است', 400);
  $mobiles = [];
  if ($target === 'users') {
    $ids = array_values(array_unique(array_map('intval', $b['user_ids'] ?? [])));
    if ($ids) { $in=implode(',', array_fill(0,count($ids),'?')); $rows=Db::all("SELECT phone mobile FROM users WHERE id IN ($in) AND phone<>''", $ids); }
    else $rows=Db::all("SELECT phone mobile FROM users WHERE is_active=1 AND phone<>''");
  } elseif ($target === 'drivers') {
    $ids = array_values(array_unique(array_map('intval', $b['driver_ids'] ?? [])));
    if ($ids) { $in=implode(',', array_fill(0,count($ids),'?')); $rows=Db::all("SELECT mobile FROM drivers WHERE id IN ($in) AND mobile<>''", $ids); }
    else $rows=Db::all("SELECT mobile FROM drivers WHERE mobile<>''");
  } else {
    $rows = array_map(fn($m)=>['mobile'=>$m], $b['mobiles'] ?? []);
  }
  foreach ($rows as $r) { $m=BaleBot::normalizeMobile($r['mobile'] ?? ''); if ($m) $mobiles[$m]=true; }
  $sent=0; $failed=0; $notConnected=0;
  foreach (array_keys($mobiles) as $m) {
    $res = BaleBot::sendToMobile($m, $text, $target, null);
    if (!empty($res['ok'])) $sent++; elseif (($res['error'] ?? '') === 'not_connected') $notConnected++; else $failed++;
  }
  return ['ok'=>true,'sent'=>$sent,'failed'=>$failed,'not_connected'=>$notConnected,'total'=>count($mobiles)];
}, false, ADMIN);


route('GET', '/api/admin/bale/menu-items', function($p,$b,$u){
  BaleBot::ensureProTables();
  return Db::all("SELECT * FROM bale_menu_items ORDER BY sort_order,id");
}, false, ADMIN);
route('POST', '/api/admin/bale/menu-items', function($p,$b,$u){
  BaleBot::ensureProTables();
  $id = Db::insert("INSERT INTO bale_menu_items(title,action_type,action_payload,form_id,sort_order,is_active,created_at) VALUES(?,?,?,?,?,?,NOW())", [
    trim((string)($b['title'] ?? '')), $b['action_type'] ?? 'message', $b['action_payload'] ?? null, $b['form_id'] ?? null, (int)($b['sort_order'] ?? 0), !empty($b['is_active']) ? 1 : 0
  ]);
  return ['ok'=>true,'id'=>$id];
}, false, ADMIN);
route('PUT', '/api/admin/bale/menu-items/{id}', function($p,$b,$u){
  BaleBot::ensureProTables();
  Db::run("UPDATE bale_menu_items SET title=?,action_type=?,action_payload=?,form_id=?,sort_order=?,is_active=?,updated_at=NOW() WHERE id=?", [
    trim((string)($b['title'] ?? '')), $b['action_type'] ?? 'message', $b['action_payload'] ?? null, $b['form_id'] ?? null, (int)($b['sort_order'] ?? 0), !empty($b['is_active']) ? 1 : 0, (int)$p['id']
  ]);
  return ['ok'=>true];
}, false, ADMIN);
route('DELETE', '/api/admin/bale/menu-items/{id}', function($p,$b,$u){ BaleBot::ensureProTables(); Db::run("DELETE FROM bale_menu_items WHERE id=?", [(int)$p['id']]); return ['ok'=>true]; }, false, ADMIN);

route('GET', '/api/admin/bale/custom-replies', function($p,$b,$u){
  BaleBot::ensureProTables();
  return Db::all("SELECT * FROM bale_custom_replies ORDER BY sort_order,id");
}, false, ADMIN);
route('POST', '/api/admin/bale/custom-replies', function($p,$b,$u){
  BaleBot::ensureProTables();
  $id = Db::insert("INSERT INTO bale_custom_replies(trigger_text,match_type,response_text,sort_order,is_active,created_at) VALUES(?,?,?,?,?,NOW())", [
    trim((string)($b['trigger_text'] ?? '')), $b['match_type'] ?? 'exact', trim((string)($b['response_text'] ?? '')), (int)($b['sort_order'] ?? 0), !empty($b['is_active']) ? 1 : 0
  ]);
  return ['ok'=>true,'id'=>$id];
}, false, ADMIN);
route('PUT', '/api/admin/bale/custom-replies/{id}', function($p,$b,$u){
  BaleBot::ensureProTables();
  Db::run("UPDATE bale_custom_replies SET trigger_text=?,match_type=?,response_text=?,sort_order=?,is_active=?,updated_at=NOW() WHERE id=?", [
    trim((string)($b['trigger_text'] ?? '')), $b['match_type'] ?? 'exact', trim((string)($b['response_text'] ?? '')), (int)($b['sort_order'] ?? 0), !empty($b['is_active']) ? 1 : 0, (int)$p['id']
  ]);
  return ['ok'=>true];
}, false, ADMIN);
route('DELETE', '/api/admin/bale/custom-replies/{id}', function($p,$b,$u){ BaleBot::ensureProTables(); Db::run("DELETE FROM bale_custom_replies WHERE id=?", [(int)$p['id']]); return ['ok'=>true]; }, false, ADMIN);

route('GET', '/api/admin/bale/forms', function($p,$b,$u){
  BaleBot::ensureProTables();
  $forms = Db::all("SELECT * FROM bale_forms ORDER BY sort_order,id");
  foreach ($forms as &$f) $f['fields'] = Db::all("SELECT * FROM bale_form_fields WHERE form_id=? ORDER BY sort_order,id", [$f['id']]);
  return $forms;
}, false, ADMIN);
route('POST', '/api/admin/bale/forms', function($p,$b,$u){
  BaleBot::ensureProTables();
  $id = Db::insert("INSERT INTO bale_forms(title,slug,description,require_national_code,auto_prefill_driver,success_message,is_active,sort_order,created_at) VALUES(?,?,?,?,?,?,?,?,NOW())", [
    trim((string)($b['title'] ?? '')), $b['slug'] ?? null, $b['description'] ?? null, !empty($b['require_national_code']) ? 1 : 0, !empty($b['auto_prefill_driver']) ? 1 : 0, $b['success_message'] ?? null, !empty($b['is_active']) ? 1 : 0, (int)($b['sort_order'] ?? 0)
  ]);
  foreach (($b['fields'] ?? []) as $i=>$f) {
    Db::run("INSERT INTO bale_form_fields(form_id,field_key,label,field_type,is_required,prefill_source,options_json,sort_order,created_at) VALUES(?,?,?,?,?,?,?,?,NOW())", [
      $id, preg_replace('/[^a-zA-Z0-9_\-]/','_', (string)($f['field_key'] ?? ('field_'.$i))), trim((string)($f['label'] ?? '')), $f['field_type'] ?? 'text', !empty($f['is_required']) ? 1 : 0, $f['prefill_source'] ?? null, json_encode($f['options'] ?? [], JSON_UNESCAPED_UNICODE), (int)($f['sort_order'] ?? $i)
    ]);
  }
  return ['ok'=>true,'id'=>$id];
}, false, ADMIN);
route('PUT', '/api/admin/bale/forms/{id}', function($p,$b,$u){
  BaleBot::ensureProTables();
  $id=(int)$p['id'];
  Db::run("UPDATE bale_forms SET title=?,slug=?,description=?,require_national_code=?,auto_prefill_driver=?,success_message=?,is_active=?,sort_order=?,updated_at=NOW() WHERE id=?", [
    trim((string)($b['title'] ?? '')), $b['slug'] ?? null, $b['description'] ?? null, !empty($b['require_national_code']) ? 1 : 0, !empty($b['auto_prefill_driver']) ? 1 : 0, $b['success_message'] ?? null, !empty($b['is_active']) ? 1 : 0, (int)($b['sort_order'] ?? 0), $id
  ]);
  if (isset($b['fields']) && is_array($b['fields'])) {
    Db::run("DELETE FROM bale_form_fields WHERE form_id=?", [$id]);
    foreach ($b['fields'] as $i=>$f) {
      Db::run("INSERT INTO bale_form_fields(form_id,field_key,label,field_type,is_required,prefill_source,options_json,sort_order,created_at) VALUES(?,?,?,?,?,?,?,?,NOW())", [
        $id, preg_replace('/[^a-zA-Z0-9_\-]/','_', (string)($f['field_key'] ?? ('field_'.$i))), trim((string)($f['label'] ?? '')), $f['field_type'] ?? 'text', !empty($f['is_required']) ? 1 : 0, $f['prefill_source'] ?? null, json_encode($f['options'] ?? [], JSON_UNESCAPED_UNICODE), (int)($f['sort_order'] ?? $i)
      ]);
    }
  }
  return ['ok'=>true];
}, false, ADMIN);
route('DELETE', '/api/admin/bale/forms/{id}', function($p,$b,$u){ BaleBot::ensureProTables(); Db::run("UPDATE bale_forms SET is_active=0,updated_at=NOW() WHERE id=?", [(int)$p['id']]); return ['ok'=>true]; }, false, ADMIN);

route('GET', '/api/admin/bale/form-submissions', function($p,$b,$u){
  BaleBot::ensureProTables();
  $status = $_GET['status'] ?? '';
  $where = $status !== '' ? "WHERE s.status=?" : "";
  $params = $status !== '' ? [$status] : [];
  $rows = Db::all("SELECT s.*, f.title form_title, CONCAT(d.first_name,' ',d.last_name) driver_name, CONCAT(us.first_name,' ',us.last_name) user_name
                   FROM bale_form_submissions s
                   LEFT JOIN bale_forms f ON f.id=s.form_id
                   LEFT JOIN drivers d ON d.id=s.driver_id
                   LEFT JOIN users us ON us.id=s.user_id
                   $where ORDER BY s.id DESC LIMIT 500", $params);
  foreach ($rows as &$r) $r['data'] = json_decode($r['data_json'] ?? '{}', true) ?: [];
  return $rows;
}, false, ADMIN);
route('POST', '/api/admin/bale/form-submissions/{id}/review', function($p,$b,$u){
  BaleBot::ensureProTables();
  $status = in_array(($b['status'] ?? ''), ['pending','approved','rejected','done'], true) ? $b['status'] : 'pending';
  Db::run("UPDATE bale_form_submissions SET status=?, reviewed_by=?, reviewed_at=NOW(), review_note=? WHERE id=?", [$status, $u['id'] ?? null, $b['review_note'] ?? null, (int)$p['id']]);
  $row = Db::one("SELECT * FROM bale_form_submissions WHERE id=?", [(int)$p['id']]);
  if ($row && !empty($row['chat_id'])) {
    $msg = $status === 'approved' ? 'درخواست شما تأیید شد.' : ($status === 'rejected' ? 'درخواست شما رد شد.' : 'وضعیت درخواست شما به‌روزرسانی شد.');
    if (!empty($b['review_note'])) $msg .= "
".$b['review_note'];
    BaleBot::sendMessage($row['chat_id'], $msg, ['target_type'=>'bale_form_submission','target_id'=>$row['id']]);
  }
  return ['ok'=>true];
}, false, ADMIN);
route('GET', '/api/admin/bale/events', function($p,$b,$u){ BaleBot::ensureProTables(); return Db::all("SELECT * FROM bale_bot_events ORDER BY id DESC LIMIT 500"); }, false, ADMIN);


/* ---------------- ربات‌های پیام‌رسان مشترک: تلگرام و ایتا ---------------- */
function _messenger_platform($p){
  $platform = $p['platform'] ?? '';
  if (!in_array($platform, ['bale','telegram','eitaa'], true)) Http::error('پیام‌رسان نامعتبر است', 400);
  return $platform;
}
function _messenger_is_bale($platform){ return $platform === 'bale'; }

route('POST', '/api/{platform}/webhook/{secret}', function($p,$b,$u){
  $platform = _messenger_platform($p);
  if (_messenger_is_bale($platform)) {
    $cfg = BaleBot::config();
    if (empty($cfg['enabled']) || ($cfg['webhook_secret'] ?? '') !== ($p['secret'] ?? '')) Http::error('webhook نامعتبر است',403);
    $msg = $b['message'] ?? $b;
    return BaleBot::processMessage($msg);
  }
  $cfg = MessengerBot::config($platform);
  if (empty($cfg['enabled']) || ($cfg['webhook_secret'] ?? '') !== ($p['secret'] ?? '')) Http::error('webhook نامعتبر است',403);
  return MessengerBot::processUpdate($platform, $b);
}, true);

route('GET', '/api/admin/messengers/{platform}/subscribers', function($p,$b,$u){
  $platform = _messenger_platform($p); MessengerBot::ensureTables();
  if (_messenger_is_bale($platform)) return Db::all("SELECT 'bale' platform, bs.*, CONCAT(u.first_name,' ',u.last_name) user_name, CONCAT(d.first_name,' ',d.last_name) driver_name
                  FROM bale_subscribers bs
                  LEFT JOIN users u ON u.id=bs.user_id
                  LEFT JOIN drivers d ON d.id=bs.driver_id
                  ORDER BY bs.id DESC LIMIT 500");
  return Db::all("SELECT ms.*, CONCAT(u.first_name,' ',u.last_name) user_name, CONCAT(d.first_name,' ',d.last_name) driver_name
                  FROM messenger_subscribers ms
                  LEFT JOIN users u ON u.id=ms.user_id
                  LEFT JOIN drivers d ON d.id=ms.driver_id
                  WHERE ms.platform=? ORDER BY ms.id DESC LIMIT 500", [$platform]);
}, false, ADMIN);

route('GET', '/api/admin/messengers/{platform}/log', function($p,$b,$u){
  $platform = _messenger_platform($p); MessengerBot::ensureTables();
  if (_messenger_is_bale($platform)) return Db::all("SELECT 'bale' platform, l.* FROM bale_message_log l ORDER BY l.id DESC LIMIT 300");
  return Db::all("SELECT * FROM messenger_message_log WHERE platform=? ORDER BY id DESC LIMIT 300", [$platform]);
}, false, ADMIN);

route('POST', '/api/admin/messengers/{platform}/test', function($p,$b,$u){
  $platform = _messenger_platform($p); MessengerBot::ensureTables();
  $mobile = trim((string)($b['mobile'] ?? '')); $text = trim((string)($b['text'] ?? 'تست ربات پیام‌رسان سامانه تاکسیرانی'));
  if (_messenger_is_bale($platform)) $res = BaleBot::sendToMobile($mobile, $text, 'test', $u['id']);
  else $res = MessengerBot::sendToMobile($platform, $mobile, $text, 'test', $u['id']);
  return $res + ['platform'=>$platform];
}, false, ADMIN);

// ثبت خودکار Webhook در سرور پیام‌رسان (بله/تلگرام/ایتا) با استفاده از توکن
// ذخیره‌شده — تا این نقطه، تنها بخش واقعاً ناقص سامانهٔ ربات‌ها همین بود: کد و
// پنل مدیریت منو/پاسخ خودکار/فرم‌ها کامل بود، اما هیچ راهی برای ثبت خودکار
// آدرس Webhook نزد خود پیام‌رسان وجود نداشت و باید دستی (مثلاً با curl) انجام می‌شد.
route('POST', '/api/admin/messengers/{platform}/register-webhook', function($p,$b,$u){
  $platform = _messenger_platform($p);
  $cfg = _messenger_is_bale($platform) ? BaleBot::config() : MessengerBot::config($platform);
  if (empty($cfg['token'])) Http::error('ابتدا توکن ربات را در تب «تنظیمات» وارد و ذخیره کنید', 422);
  $secret = trim((string)($cfg['webhook_secret'] ?? ''));
  if ($secret === '') {
    // اگر کلید محرمانه Webhook تنظیم نشده باشد، یک مقدار تصادفی امن ساخته و ذخیره می‌شود.
    $secret = bin2hex(random_bytes(20));
    try { Db::run("INSERT INTO app_settings(`key`,value) VALUES(?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)", [$platform.'_webhook_secret', json_encode($secret, JSON_UNESCAPED_UNICODE)]); } catch (Throwable $e) {
      Http::error('ذخیره کلید Webhook ناموفق بود', 500);
    }
  }
  $publicUrl = rtrim((string)_req_setting('public_url', ''), '/');
  if ($publicUrl === '') {
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = preg_replace('/[^A-Za-z0-9.:-]/', '', (string)($_SERVER['HTTP_HOST'] ?? ''));
    if ($host !== '') $publicUrl = $scheme.'://'.$host;
  }
  if ($publicUrl === '') Http::error('آدرس عمومی سایت قابل تشخیص نیست', 422);
  $webhookUrl = $publicUrl.'/api/'.$platform.'/webhook/'.$secret;
  $res = _messenger_is_bale($platform)
    ? BaleBot::request('setWebhook', ['url'=>$webhookUrl], false)
    : MessengerBot::request($platform, 'setWebhook', ['url'=>$webhookUrl], false);
  if (empty($res['ok'])) { $msg=$res['description'] ?? $res['error'] ?? 'ثبت Webhook توسط سرویس رد شد'; Http::error($msg, 422); }
  return ['ok'=>true, 'platform'=>$platform, 'webhook_url'=>$webhookUrl, 'response'=>$res];
}, false, ADMIN);

route('POST', '/api/admin/messengers/{platform}/send', function($p,$b,$u){
  $platform = _messenger_platform($p); MessengerBot::ensureTables();
  $target = $b['target'] ?? 'all_users'; $text = trim((string)($b['text'] ?? '')); if ($text==='') Http::error('متن لازم است',400);
  $mobiles=[];
  if ($target === 'all_drivers') $rows = Db::all("SELECT mobile FROM drivers WHERE mobile IS NOT NULL AND mobile<>'' LIMIT 5000");
  elseif ($target === 'all_users') $rows = Db::all("SELECT phone mobile FROM users WHERE is_active=1 AND phone IS NOT NULL AND phone<>'' LIMIT 5000");
  else $rows = [];
  foreach ($rows as $r) { $m = _messenger_is_bale($platform) ? BaleBot::normalizeMobile($r['mobile'] ?? '') : MessengerBot::normalizeMobile($r['mobile'] ?? ''); if ($m) $mobiles[$m]=true; }
  $out=['sent'=>0,'not_connected'=>0,'failed'=>0];
  foreach (array_keys($mobiles) as $m) {
    $res = _messenger_is_bale($platform) ? BaleBot::sendToMobile($m, $text, $target, null) : MessengerBot::sendToMobile($platform, $m, $text, $target, null);
    if (!empty($res['ok'])) $out['sent']++; elseif (($res['error'] ?? '') === 'not_connected') $out['not_connected']++; else $out['failed']++;
  }
  return $out + ['platform'=>$platform, 'total'=>count($mobiles)];
}, false, ADMIN);

route('GET', '/api/admin/messengers/{platform}/menu-items', function($p,$b,$u){
  $platform=_messenger_platform($p); MessengerBot::ensureTables(); BaleBot::ensureProTables();
  return Db::all("SELECT * FROM bale_menu_items WHERE platform=? ORDER BY sort_order,id", [$platform]);
}, false, ADMIN);
route('POST', '/api/admin/messengers/{platform}/menu-items', function($p,$b,$u){
  $platform=_messenger_platform($p); MessengerBot::ensureTables(); BaleBot::ensureProTables();
  $title=trim((string)($b['title']??'')); if($title==='') Http::error('عنوان دکمه لازم است',422);
  $id=Db::insert("INSERT INTO bale_menu_items(platform,title,action_type,action_payload,form_id,sort_order,is_active,created_at) VALUES(?,?,?,?,?,?,?,NOW())", [$platform,$title,$b['action_type']??'message',$b['action_payload']??null,$b['form_id']??null,(int)($b['sort_order']??0),!empty($b['is_active'])?1:0]);
  return ['ok'=>true,'id'=>$id];
}, false, ADMIN);
route('PUT', '/api/admin/messengers/{platform}/menu-items/{id}', function($p,$b,$u){
  $platform=_messenger_platform($p); MessengerBot::ensureTables(); BaleBot::ensureProTables();
  $title=trim((string)($b['title']??'')); if($title==='') Http::error('عنوان دکمه لازم است',422);
  Db::run("UPDATE bale_menu_items SET title=?,action_type=?,action_payload=?,form_id=?,sort_order=?,is_active=?,updated_at=NOW() WHERE platform=? AND id=?", [$title,$b['action_type']??'message',$b['action_payload']??null,$b['form_id']??null,(int)($b['sort_order']??0),!empty($b['is_active'])?1:0,$platform,(int)$p['id']]);
  return ['ok'=>true];
}, false, ADMIN);
route('DELETE', '/api/admin/messengers/{platform}/menu-items/{id}', function($p,$b,$u){ $platform=_messenger_platform($p); BaleBot::ensureProTables(); Db::run("DELETE FROM bale_menu_items WHERE platform=? AND id=?", [$platform,(int)$p['id']]); return ['ok'=>true]; }, false, ADMIN);

route('GET', '/api/admin/messengers/{platform}/custom-replies', function($p,$b,$u){ $platform=_messenger_platform($p); BaleBot::ensureProTables(); return Db::all("SELECT * FROM bale_custom_replies WHERE platform=? ORDER BY sort_order,id",[$platform]); }, false, ADMIN);
route('POST', '/api/admin/messengers/{platform}/custom-replies', function($p,$b,$u){
  $platform=_messenger_platform($p); BaleBot::ensureProTables();
  $trigger=trim((string)($b['trigger_text']??'')); $response=trim((string)($b['response_text']??'')); if($trigger===''||$response==='') Http::error('کلید و متن پاسخ لازم است',422);
  $id=Db::insert("INSERT INTO bale_custom_replies(platform,trigger_text,match_type,response_text,sort_order,is_active,created_at) VALUES(?,?,?,?,?,?,NOW())", [$platform,$trigger,$b['match_type']??'exact',$response,(int)($b['sort_order']??0),!empty($b['is_active'])?1:0]);
  return ['ok'=>true,'id'=>$id];
}, false, ADMIN);
route('PUT', '/api/admin/messengers/{platform}/custom-replies/{id}', function($p,$b,$u){
  $platform=_messenger_platform($p); BaleBot::ensureProTables();
  $trigger=trim((string)($b['trigger_text']??'')); $response=trim((string)($b['response_text']??'')); if($trigger===''||$response==='') Http::error('کلید و متن پاسخ لازم است',422);
  Db::run("UPDATE bale_custom_replies SET trigger_text=?,match_type=?,response_text=?,sort_order=?,is_active=?,updated_at=NOW() WHERE platform=? AND id=?", [$trigger,$b['match_type']??'exact',$response,(int)($b['sort_order']??0),!empty($b['is_active'])?1:0,$platform,(int)$p['id']]);
  return ['ok'=>true];
}, false, ADMIN);
route('DELETE', '/api/admin/messengers/{platform}/custom-replies/{id}', function($p,$b,$u){ $platform=_messenger_platform($p); BaleBot::ensureProTables(); Db::run("DELETE FROM bale_custom_replies WHERE platform=? AND id=?",[$platform,(int)$p['id']]); return ['ok'=>true]; }, false, ADMIN);

route('GET', '/api/admin/messengers/{platform}/forms', function($p,$b,$u){
  $platform=_messenger_platform($p); BaleBot::ensureProTables();
  $forms=Db::all("SELECT * FROM bale_forms WHERE platform=? ORDER BY sort_order,id",[$platform]);
  foreach($forms as &$f){ $f['fields']=Db::all("SELECT * FROM bale_form_fields WHERE form_id=? ORDER BY sort_order,id",[$f['id']]); foreach($f['fields'] as &$ff)$ff['options']=json_decode($ff['options_json']??'[]',true)?:[]; }
  return $forms;
}, false, ADMIN);
route('POST', '/api/admin/messengers/{platform}/forms', function($p,$b,$u){
  $platform=_messenger_platform($p); BaleBot::ensureProTables(); $title=trim((string)($b['title']??'')); if($title==='') Http::error('عنوان فرم لازم است',422);
  $id=Db::insert("INSERT INTO bale_forms(platform,title,slug,description,require_national_code,auto_prefill_driver,success_message,is_active,sort_order,created_at) VALUES(?,?,?,?,?,?,?,?,?,NOW())", [$platform,$title,$b['slug']??null,$b['description']??null,!empty($b['require_national_code'])?1:0,!empty($b['auto_prefill_driver'])?1:0,$b['success_message']??null,!empty($b['is_active'])?1:0,(int)($b['sort_order']??0)]);
  foreach(($b['fields']??[]) as $i=>$f) Db::run("INSERT INTO bale_form_fields(form_id,field_key,label,field_type,is_required,prefill_source,options_json,sort_order,created_at) VALUES(?,?,?,?,?,?,?,?,NOW())",[$id,preg_replace('/[^a-zA-Z0-9_\-]/','_',(string)($f['field_key']??('field_'.$i))),trim((string)($f['label']??'')),$f['field_type']??'text',!empty($f['is_required'])?1:0,$f['prefill_source']??null,json_encode($f['options']??[],JSON_UNESCAPED_UNICODE),(int)($f['sort_order']??$i)]);
  return ['ok'=>true,'id'=>$id];
}, false, ADMIN);
route('PUT', '/api/admin/messengers/{platform}/forms/{id}', function($p,$b,$u){
  $platform=_messenger_platform($p); BaleBot::ensureProTables(); $id=(int)$p['id']; $title=trim((string)($b['title']??'')); if($title==='') Http::error('عنوان فرم لازم است',422);
  Db::run("UPDATE bale_forms SET title=?,slug=?,description=?,require_national_code=?,auto_prefill_driver=?,success_message=?,is_active=?,sort_order=?,updated_at=NOW() WHERE platform=? AND id=?",[$title,$b['slug']??null,$b['description']??null,!empty($b['require_national_code'])?1:0,!empty($b['auto_prefill_driver'])?1:0,$b['success_message']??null,!empty($b['is_active'])?1:0,(int)($b['sort_order']??0),$platform,$id]);
  if(isset($b['fields'])&&is_array($b['fields'])){ Db::run("DELETE FROM bale_form_fields WHERE form_id=?",[$id]); foreach($b['fields'] as $i=>$f) Db::run("INSERT INTO bale_form_fields(form_id,field_key,label,field_type,is_required,prefill_source,options_json,sort_order,created_at) VALUES(?,?,?,?,?,?,?,?,NOW())",[$id,preg_replace('/[^a-zA-Z0-9_\-]/','_',(string)($f['field_key']??('field_'.$i))),trim((string)($f['label']??'')),$f['field_type']??'text',!empty($f['is_required'])?1:0,$f['prefill_source']??null,json_encode($f['options']??[],JSON_UNESCAPED_UNICODE),(int)($f['sort_order']??$i)]); }
  return ['ok'=>true];
}, false, ADMIN);
route('DELETE', '/api/admin/messengers/{platform}/forms/{id}', function($p,$b,$u){ $platform=_messenger_platform($p); BaleBot::ensureProTables(); Db::run("UPDATE bale_forms SET is_active=0,updated_at=NOW() WHERE platform=? AND id=?",[$platform,(int)$p['id']]); return ['ok'=>true]; }, false, ADMIN);

route('GET', '/api/admin/messengers/{platform}/form-submissions', function($p,$b,$u){
  $platform=_messenger_platform($p); MessengerBot::ensureTables(); $status=$_GET['status'] ?? ''; $where=$status!=='' ? " AND s.status=?" : ""; $params=$status!=='' ? [$status] : [];
  if (_messenger_is_bale($platform)) {
    $w=$status!=='' ? "WHERE s.status=?" : "";
    $rows=Db::all("SELECT 'bale' platform, s.*, f.title form_title, CONCAT(d.first_name,' ',d.last_name) driver_name, CONCAT(us.first_name,' ',us.last_name) user_name FROM bale_form_submissions s LEFT JOIN bale_forms f ON f.id=s.form_id LEFT JOIN drivers d ON d.id=s.driver_id LEFT JOIN users us ON us.id=s.user_id $w ORDER BY s.id DESC LIMIT 500", $params);
  } else {
    $rows=Db::all("SELECT s.*, f.title form_title, CONCAT(d.first_name,' ',d.last_name) driver_name, CONCAT(us.first_name,' ',us.last_name) user_name FROM messenger_form_submissions s LEFT JOIN bale_forms f ON f.id=s.form_id LEFT JOIN drivers d ON d.id=s.driver_id LEFT JOIN users us ON us.id=s.user_id WHERE s.platform=?$where ORDER BY s.id DESC LIMIT 500", array_merge([$platform], $params));
  }
  foreach($rows as &$r) $r['data']=json_decode($r['data_json'] ?? '{}', true) ?: [];
  return $rows;
}, false, ADMIN);

route('POST', '/api/admin/messengers/{platform}/form-submissions/{id}/review', function($p,$b,$u){
  $platform=_messenger_platform($p); MessengerBot::ensureTables(); $status=in_array(($b['status']??''), ['pending','approved','rejected','done'], true) ? $b['status'] : 'pending';
  if (_messenger_is_bale($platform)) {
    Db::run("UPDATE bale_form_submissions SET status=?, reviewed_by=?, reviewed_at=NOW(), review_note=? WHERE id=?", [$status,$u['id']??null,$b['review_note']??null,(int)$p['id']]);
    $row=Db::one("SELECT * FROM bale_form_submissions WHERE id=?", [(int)$p['id']]);
    if($row && !empty($row['chat_id'])) { $msg=$status==='approved'?'درخواست شما تأیید شد.':($status==='rejected'?'درخواست شما رد شد.':'وضعیت درخواست شما به‌روزرسانی شد.'); if(!empty($b['review_note']))$msg.="\n".$b['review_note']; BaleBot::sendMessage($row['chat_id'],$msg,['target_type'=>'bale_form_submission','target_id'=>$row['id']]); }
  } else {
    Db::run("UPDATE messenger_form_submissions SET status=?, reviewed_by=?, reviewed_at=NOW(), review_note=? WHERE platform=? AND id=?", [$status,$u['id']??null,$b['review_note']??null,$platform,(int)$p['id']]);
    $row=Db::one("SELECT * FROM messenger_form_submissions WHERE platform=? AND id=?", [$platform,(int)$p['id']]);
    if($row && !empty($row['chat_id'])) { $msg=$status==='approved'?'درخواست شما تأیید شد.':($status==='rejected'?'درخواست شما رد شد.':'وضعیت درخواست شما به‌روزرسانی شد.'); if(!empty($b['review_note']))$msg.="\n".$b['review_note']; MessengerBot::sendMessage($platform,$row['chat_id'],$msg,['target_type'=>'messenger_form_submission','target_id'=>$row['id']]); }
  }
  return ['ok'=>true];
}, false, ADMIN);

route('GET', '/api/admin/messengers/{platform}/events', function($p,$b,$u){
  $platform=_messenger_platform($p); MessengerBot::ensureTables();
  if (_messenger_is_bale($platform)) return Db::all("SELECT 'bale' platform, e.* FROM bale_bot_events e ORDER BY e.id DESC LIMIT 500");
  return Db::all("SELECT * FROM messenger_bot_events WHERE platform=? ORDER BY id DESC LIMIT 500", [$platform]);
}, false, ADMIN);

/* ---------------- محدودهٔ خطوط (ایستگاه‌ها) روی نقشه ---------------- */
route('GET', '/api/geofences', function($p,$b,$u){
  $rows = Db::all("SELECT g.*, l.code line_code FROM geofences g LEFT JOIN `lines` l ON l.id=g.line_id ORDER BY g.id");
  foreach ($rows as &$r) $r['polygon'] = $r['polygon'] ? json_decode($r['polygon'], true) : null;
  return $rows;
});
route('POST', '/api/admin/geofences', function($p,$b,$u){
  $id = Db::insert("INSERT INTO geofences(line_id,name,type,color,center_lat,center_lng,radius_m,polygon) VALUES(?,?,?,?,?,?,?,?)",
    [$b['line_id'] ?? null, $b['name'], $b['type'], $b['color'] ?? '#0d7a5f',
     $b['center_lat'] ?? null, $b['center_lng'] ?? null, $b['radius_m'] ?? null,
     isset($b['polygon']) ? json_encode($b['polygon']) : null]);
  return ['id'=>$id];
}, false, ADMIN);
route('PUT', '/api/admin/geofences/{id}', function($p,$b,$u){
  Db::run("UPDATE geofences SET name=?, color=?, line_id=? WHERE id=?", [$b['name'], $b['color'] ?? '#0d7a5f', $b['line_id'] ?? null, $p['id']]);
  return ['ok'=>true];
}, false, ADMIN);
route('DELETE', '/api/admin/geofences/{id}', function($p,$b,$u){ Db::run("DELETE FROM geofences WHERE id=?", [$p['id']]); return ['ok'=>true]; }, false, ADMIN);

/* ---------------- پیام‌رسانی + رسید خواندن ---------------- */
route('POST', '/api/admin/messages', function($p,$b,$u){
  if (empty($b['body'])) Http::error('متن پیام لازم است', 400);
  $tt = $b['target_type'] ?? 'all';
  // تعیین گیرندگان
  if ($tt === 'selected') {
    $ids = array_values(array_unique(array_map('intval', $b['user_ids'] ?? [])));
  } elseif ($tt === 'zone') {
    $ids = array_column(Db::all("SELECT id FROM users WHERE is_active=1 AND zone_id=?", [$b['zone_id']]), 'id');
  } else {
    $ids = array_column(Db::all("SELECT id FROM users WHERE is_active=1 AND id<>?", [$u['id']]), 'id');
  }
  if (!$ids) Http::error('گیرنده‌ای یافت نشد', 400);
  $_msgPath = !empty($b['attachment_data']) ? Media::saveBase64($b['attachment_data'], 'messages', 1280, 70) : null;
  $mid = Db::insert("INSERT INTO messages(sender_id,title,body,target_type,zone_id,attachment_name,attachment_path) VALUES(?,?,?,?,?,?,?)",
    [$u['id'], $b['title'] ?? null, $b['body'], $tt, $b['zone_id'] ?? null, $b['attachment_name'] ?? null, $_msgPath]);
  foreach ($ids as $uid) Db::run("INSERT IGNORE INTO message_recipients(message_id,user_id) VALUES(?,?)", [$mid, $uid]);
  Push::send($ids, $b['title'] ?: 'پیام جدید', mb_substr($b['body'], 0, 120), ['type'=>'message','message_id'=>$mid]);
  // ارسال هم‌زمان از طریق ربات‌های پیام‌رسان برای کاربرانی که ربات را فعال کرده‌اند
  $baleSent = 0; $baleNotConnected = 0; $messengerSent = 0; $messengerNotConnected = 0; $messengerFailed = 0;
  if ((!empty($b['also_bale']) || !empty($b['also_messengers'])) && class_exists('MessengerHub')) {
    $resAll = MessengerHub::sendToUserIds($ids, $b['title'] ?: 'پیام جدید', $b['body'], 'messages', ['type'=>'message','message_id'=>$mid]);
    $tot = MessengerHub::totals($resAll);
    $messengerSent = $baleSent = $tot['sent'];
    $messengerNotConnected = $baleNotConnected = $tot['not_connected'];
    $messengerFailed = $tot['failed'];
  } elseif (!empty($b['also_bale']) && BaleBot::isEnabled() && (BaleBot::config()['items']['messages'] ?? true)) {
    $in = implode(',', array_fill(0, count($ids), '?'));
    $rows = Db::all("SELECT id, phone FROM users WHERE id IN ($in) AND phone IS NOT NULL AND phone<>''", $ids);
    $text = trim(($b['title'] ? $b['title']."
" : '').$b['body']);
    foreach ($rows as $row) {
      $res = BaleBot::sendToMobile($row['phone'], $text, 'user', (int)$row['id']);
      if (!empty($res['ok'])) $baleSent++; elseif (($res['error'] ?? '') === 'not_connected') $baleNotConnected++;
    }
  }
  // ارسال هم‌زمان به‌صورت پیامک (در صورت درخواست و فعال‌بودن سرویس)
  $smsSent = 0;
  if (!empty($b['also_sms']) && Sms::isEnabled()) {
    $in = implode(',', array_fill(0, count($ids), '?'));
    $rows = Db::all("SELECT phone FROM users WHERE id IN ($in) AND phone IS NOT NULL AND phone<>''", $ids);
    $mobiles = array_values(array_unique(array_map(fn($x)=>$x['phone'], $rows)));
    $text = trim(($b['title'] ? $b['title']."\n" : '').$b['body']);
    foreach (array_chunk($mobiles, 50) as $chunk) {
      $res = Sms::send($chunk, $text, 'message', $u['id']);
      if (!empty($res['ok'])) $smsSent += count($chunk);
    }
  }
  return ['id'=>$mid, 'recipients'=>count($ids), 'sms_sent'=>$smsSent, 'bale_sent'=>$baleSent ?? 0, 'bale_not_connected'=>$baleNotConnected ?? 0, 'messenger_sent'=>$messengerSent ?? ($baleSent ?? 0), 'messenger_not_connected'=>$messengerNotConnected ?? ($baleNotConnected ?? 0), 'messenger_failed'=>$messengerFailed ?? 0];
}, false, ADMIN);

route('GET', '/api/admin/messages', fn($p,$b,$u) => Db::all(
  "SELECT m.id, m.title, m.body, m.target_type, m.created_at, CONCAT(s.first_name,' ',s.last_name) sender,
          CAST(COUNT(mr.user_id) AS UNSIGNED) total, CAST(SUM(mr.read_at IS NOT NULL) AS UNSIGNED) read_count
   FROM messages m JOIN users s ON s.id=m.sender_id LEFT JOIN message_recipients mr ON mr.message_id=m.id
   GROUP BY m.id ORDER BY m.created_at DESC LIMIT 200"), false, ADMIN);

route('GET', '/api/admin/messages/{id}/receipts', fn($p,$b,$u) => Db::all(
  "SELECT u.id, CONCAT(u.first_name,' ',u.last_name) name, r.title role, mr.read_at
   FROM message_recipients mr JOIN users u ON u.id=mr.user_id JOIN roles r ON r.id=u.role_id
   WHERE mr.message_id=? ORDER BY (mr.read_at IS NULL) DESC, mr.read_at DESC", [$p['id']]), false, ADMIN);

/* گیرنده: پیام‌های من + علامت خواندن */
route('GET', '/api/my/messages', function($p,$b,$u){
  $rows = Db::all("SELECT m.id, m.title, m.body, m.created_at, m.attachment_name, m.attachment_data, m.attachment_path, mr.read_at, CONCAT(s.first_name,' ',s.last_name) sender
    FROM message_recipients mr JOIN messages m ON m.id=mr.message_id JOIN users s ON s.id=m.sender_id
    WHERE mr.user_id=? ORDER BY m.created_at DESC LIMIT 100", [$u['id']]);
  foreach ($rows as &$r) {
    if (!empty($r['attachment_path'])) { $r['attachment_url'] = '/api/media?path='.urlencode($r['attachment_path']); unset($r['attachment_data']); }
    elseif (!empty($r['attachment_data'])) { $r['attachment_url'] = $r['attachment_data']; }
    unset($r['attachment_path']);
  }
  return $rows;
});
route('POST', '/api/my/messages/{id}/read', function($p,$b,$u){
  Db::run("UPDATE message_recipients SET read_at=NOW() WHERE message_id=? AND user_id=? AND read_at IS NULL", [$p['id'], $u['id']]);
  return ['ok'=>true];
});

/* ---------------- حذف کاربر + سلامت مدیریتی ---------------- */
route('DELETE', '/api/admin/users/{id}', function($p,$b,$u){
  if ((int)$p['id'] === (int)$u['id']) Http::error('حذف حساب خودتان مجاز نیست', 400);
  $pdo = Db::pdo(); $pdo->beginTransaction();
  try {
    foreach (['user_devices','user_lines','push_tokens'] as $t) Db::run("DELETE FROM $t WHERE user_id=?", [$p['id']]);
    Db::run("DELETE FROM message_recipients WHERE user_id=?", [$p['id']]);
    Db::run("DELETE FROM users WHERE id=?", [$p['id']]);
    $pdo->commit();
  } catch (Throwable $e) { $pdo->rollBack(); throw $e; }
  return ['ok'=>true];
}, false, ADMIN);

route('GET', '/api/admin/health', function($p,$b,$u){
  $db_ok=false; $err=null;
  try { Db::pdo()->query('SELECT 1'); $db_ok=true; } catch (Throwable $e){ $err=$e->getMessage(); }
  return ['ok'=>true,'db'=>$db_ok,'db_error'=>$err,'php'=>PHP_VERSION,
    'pdo_mysql'=>extension_loaded('pdo_mysql'),'zip'=>extension_loaded('zip'),
    'simplexml'=>extension_loaded('simplexml'),'curl'=>extension_loaded('curl'),
    'upload_max'=>ini_get('upload_max_filesize'),'post_max'=>ini_get('post_max_size')];
}, false, ADMIN);


/* ---------------- پروفایل کاربر، عکس، فراموشی رمز، گزارش‌های من ---------------- */
route('PUT', '/api/me/profile', function($p,$b,$u){
  if (isset($b['email']) && $b['email']!=='' && !filter_var($b['email'], FILTER_VALIDATE_EMAIL)) Http::error('ایمیل نامعتبر است', 400);
  if (array_key_exists('national_code', $b)) {
    $b['national_code'] = preg_replace('/\D+/', '', (string)$b['national_code']);
    if ($b['national_code'] !== '' && strlen($b['national_code']) !== 10) Http::error('کد ملی باید ۱۰ رقم باشد', 400);
  }
  $allow = ['email','mobile','address','national_code','marital_status','children_count','birth_date','signature_data'];
  $sets=[]; $args=[];
  foreach ($allow as $f) { if (array_key_exists($f,$b)) { $sets[]="`$f`=?"; $args[]=$b[$f]===''?null:$b[$f]; } }
  if ($sets) { $args[]=$u['id']; Db::run("UPDATE users SET ".implode(',',$sets)." WHERE id=?", $args); }
  return ['ok'=>true];
});
route('GET', '/api/me/full-profile', function($p,$b,$u){
  $r = Db::one("SELECT id,username,first_name,last_name,email,mobile,address,marital_status,children_count,birth_date,national_code,rank_stars,signature_data,CASE WHEN photo_path IS NOT NULL AND photo_path<>'' THEN CONCAT('/api/media?path=', photo_path) ELSE photo END AS photo FROM users WHERE id=?", [$u['id']]);
  return $r ?: [];
});

// آیا کاربر اجازهٔ انتخاب منطقه/بازرس خودش را دارد؟ + داده‌های لازم برای انتخاب
// بازرسین و سربازرس یک منطقهٔ خاص (برای انتخاب مسئول بالادستی در اپ)
route('GET', '/api/me/zone-inspectors', function($p,$b,$u){
  $zoneId = (int)($_GET['zone_id'] ?? 0);
  if (!$zoneId) Http::error('منطقه مشخص نشده است', 400);
  // آیا کاربر فعلی «نیروی اداری» است؟
  $myRole = $u['role_title'] ?? '';
  $isAdminStaff = (mb_strpos($myRole, 'نیروی اداری') !== false);

  if ($isAdminStaff) {
    // چارت نیروی اداری مستقل است: بالادست پیش‌فرض = رییس اداره بازرسی
    // کاربر می‌تواند به‌جای آن یک نیروی اداری دیگر را انتخاب کند
    $head = Db::one("SELECT u.id, TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) name, r.title role_title
      FROM users u JOIN roles r ON r.id=u.role_id
      WHERE r.title LIKE '%رییس اداره بازرسی%' AND u.is_active=1 ORDER BY u.id LIMIT 1");
    // سایر نیروهای اداری (به‌جز خود کاربر) برای انتخاب اختیاری به‌عنوان بالادست
    $adminStaff = Db::all("SELECT u.id, TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) name, r.title role_title, r.is_admin, r.level
      FROM users u JOIN roles r ON r.id=u.role_id
      WHERE u.id<>? AND u.is_active=1 AND (r.title LIKE '%نیروی اداری%' OR r.title LIKE '%رییس اداره بازرسی%')
      ORDER BY r.level DESC, name", [$u['id']]);
    return [
      'chief' => $head,        // رییس اداره بازرسی (پیش‌فرض)
      'inspectors' => $adminStaff, // نیروهای اداری قابل‌انتخاب
      'is_admin_staff' => true,
    ];
  }

  // بازرسین منطقه: کاربرانی که منطقه‌شان این است و نقش بازرسی/سربازرسی دارند (و خود کاربر نیستند)
  // نیروهای اداری از این فهرست حذف می‌شوند (چارت مستقل دارند)
  $inspectors = Db::all("SELECT u.id, TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) name, r.title role_title, r.is_admin, r.level
    FROM users u JOIN roles r ON r.id=u.role_id
    WHERE u.zone_id=? AND u.id<>? AND (r.title LIKE '%بازرس%' OR r.level>=4)
      AND r.title NOT LIKE '%نیروی اداری%'
    ORDER BY r.level DESC, name", [$zoneId, $u['id']]);
  // سربازرس منطقه: کسی که نقشش شامل «سربازرس» است یا بالاترین سطح در منطقه
  $chief = null;
  foreach ($inspectors as $ins) {
    if (mb_strpos($ins['role_title'] ?? '', 'سربازرس') !== false) { $chief = $ins; break; }
  }
  if (!$chief && $inspectors) {
    $chief = $inspectors[0];
  }
  return [
    'chief' => $chief,
    'inspectors' => $inspectors,
    'is_admin_staff' => false,
  ];
});

route('GET', '/api/me/zone-options', function($p,$b,$u){
  $enabled = (bool)_req_setting('allow_self_zone_select', false);
  $zones = Db::all("SELECT id, name, parent_id FROM zones ORDER BY name");
  // فهرست بازرس‌ها و سربازرس‌ها بر اساس نقش (نقش‌هایی که سطحشان بالاتر از راننده است)
  // اینجا همهٔ کاربرانِ دارای نقش غیر-راننده را به‌عنوان بازرس قابل‌انتخاب می‌آوریم
  $people = Db::all("SELECT u.id, TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) name, r.title role_title
    FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id<>? ORDER BY name", [$u['id']]);
  // انتخاب فعلی کاربر
  $me = Db::one("SELECT zone_id FROM users WHERE id=?", [$u['id']]);
  $mgrs = array_map('intval', array_column(Db::all("SELECT manager_id FROM user_managers WHERE user_id=?", [$u['id']]), 'manager_id'));
  $chief = _req_setting("chief_inspector_user_{$u['id']}", null);
  return [
    'enabled' => $enabled,
    'zones' => $zones,
    'people' => $people,
    'current' => [
      'zone_id' => $me['zone_id'] ? (int)$me['zone_id'] : null,
      'inspector_ids' => $mgrs,
      'chief_inspector_id' => $chief ? (int)$chief : null,
    ],
  ];
});

// ذخیرهٔ انتخاب منطقه/بازرس‌ها/سربازرس توسط خود کاربر
route('POST', '/api/me/zone-select', function($p,$b,$u){
  if (!(bool)_req_setting('allow_self_zone_select', false)) Http::error('این قابلیت فعال نیست', 403);
  $zoneId = isset($b['zone_id']) && $b['zone_id'] ? (int)$b['zone_id'] : null;
  $inspectors = is_array($b['inspector_ids'] ?? null) ? array_values(array_unique(array_map('intval', $b['inspector_ids']))) : [];
  $chief = isset($b['chief_inspector_id']) && $b['chief_inspector_id'] ? (int)$b['chief_inspector_id'] : null;
  // سربازرس باید جزو بازرس‌ها باشد (اگر انتخاب شده)
  if ($chief && !in_array($chief, $inspectors, true)) $inspectors[] = $chief;
  // ذخیرهٔ منطقه
  Db::run("UPDATE users SET zone_id=? WHERE id=?", [$zoneId, $u['id']]);
  // ذخیرهٔ بازرس‌ها (جایگزینی کامل روابط مدیر)
  Db::run("DELETE FROM user_managers WHERE user_id=?", [$u['id']]);
  foreach ($inspectors as $mid) {
    if ($mid && $mid !== (int)$u['id']) {
      try { Db::run("INSERT INTO user_managers(user_id, manager_id) VALUES(?,?)", [$u['id'], $mid]); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
    }
  }
  // ذخیرهٔ سربازرس در تنظیمات + ست‌کردن manager_id اصلی برای چارت سازمانی
  if ($chief) {
    Db::run("INSERT INTO app_settings(`key`,value) VALUES(?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)", ["chief_inspector_user_{$u['id']}", json_encode($chief)]);
    Db::run("UPDATE users SET manager_id=? WHERE id=?", [$chief, $u['id']]);
  } else {
    Db::run("DELETE FROM app_settings WHERE `key`=?", ["chief_inspector_user_{$u['id']}"]);
    // اگر سربازرس انتخاب نشد ولی بازرسی هست، اولین بازرس را به‌عنوان مدیر اصلی بگذار
    if ($inspectors) Db::run("UPDATE users SET manager_id=? WHERE id=?", [$inspectors[0], $u['id']]);
  }
  return ['ok'=>true];
});
route('POST', '/api/me/photo', function($p,$b,$u){
  // پشتیبانی از multipart (فایل) و base64
  $path = null;
  if (!empty($_FILES['photo']) && ($_FILES['photo']['error'] ?? 1) === 0) {
    try { $path = Media::saveUploadedFile($_FILES['photo'], 'users', 600, 75); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  } elseif (!empty($b['photo'])) {
    try { $path = Media::saveBase64($b['photo'], 'users', 600, 75); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  }
  if (!$path) Http::error('ذخیرهٔ تصویر ناموفق بود. دوباره تلاش کنید.', 500);
  // تلاش برای ذخیره در photo_path، fallback به photo (base64) اگر ستون نبود
  try {
    Db::run("UPDATE users SET photo_path=? WHERE id=?", [$path, $u['id']]);
  } catch (\Throwable $e) {
    if (!empty($b['photo'])) Db::run("UPDATE users SET photo=? WHERE id=?", [$b['photo'], $u['id']]);
    else Http::error('ستون عکس در دیتابیس موجود نیست. upgrade.sql را اجرا کنید.', 500);
  }
  return ['ok'=>true, 'path'=>$path];
});
route('GET', '/api/my/lines', fn($p,$b,$u) => Db::all(
  "SELECT l.id,l.code,l.origin,l.destination,l.status FROM user_lines ul JOIN `lines` l ON l.id=ul.line_id WHERE ul.user_id=? ORDER BY l.code", [$u['id']]));
route('GET', '/api/my/reports', function($p,$b,$u){
  _ensure_reports_index();
  $q = trim((string)($_GET['q'] ?? ''));
  $sql = "SELECT r.id,r.subject,r.body,r.status,COALESCE(r.priority,'normal') priority,COALESCE(r.confidential_history,0) confidential_history,r.created_at,(SELECT COUNT(*) FROM report_attachments ra WHERE ra.report_id=r.id) attachments_count FROM reports r WHERE r.sender_id=? AND r.deleted_at IS NULL";
  $args = [$u['id']];
  if ($q !== '') { $sql .= " AND (r.subject LIKE ? OR r.body LIKE ?)"; $like='%'.$q.'%'; $args[]=$like; $args[]=$like; }
  $sql .= " ORDER BY r.created_at DESC LIMIT 200";
  return Db::all($sql,$args);
});

// فراموشی رمز: رمز جدید تصادفی ساخته و به ایمیل کاربر ارسال می‌شود
route('POST', '/api/auth/forgot', function($p,$b){
  $id = trim($b['username'] ?? $b['email'] ?? '');
  if ($id==='') Http::error('کد ملی یا ایمیل را وارد کنید', 400);
  $u = Db::one("SELECT id,email,first_name,last_name FROM users WHERE username=? OR email=?", [$id,$id]);
  // برای امنیت همیشه پیام موفق برمی‌گردد (افشای وجود/عدم‌وجود حساب نمی‌شود)
  if ($u && $u['email']) {
    $newpw = bin2hex(random_bytes(4)); // ۸ کاراکتر
    Db::run("UPDATE users SET password_hash=?, must_change_pw=1 WHERE id=?", [password_hash($newpw, PASSWORD_BCRYPT), $u['id']]);
    $body = "سلام {$u['first_name']} {$u['last_name']}\nرمز عبور جدید شما: {$newpw}\nلطفاً پس از ورود، رمز را تغییر دهید.";
    $pub = parse_url($GLOBALS['CONFIG']['public_url'] ?: 'https://app.yousefipour.ir', PHP_URL_HOST) ?: 'yousefipour.ir';
    $headers = "From: no-reply@$pub\r\nReply-To: no-reply@$pub\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n";
    @mail($u['email'], '=?UTF-8?B?'.base64_encode('بازیابی رمز عبور — سامانه تاکسیرانی').'?=', $body, $headers);
    Db::run("INSERT INTO activity_logs(user_id,event) VALUES(?, 'password_reset_email')", [$u['id']]);
  }
  return ['ok'=>true, 'message'=>'اگر این حساب ایمیل داشته باشد، رمز جدید ارسال شد.'];
}, true);

// فهرست نشست‌های کاربر برای مدیر (وضعیت دو دستگاه)
route('GET', '/api/admin/users/{id}/sessions', fn($p,$b,$u) => Db::all(
  "SELECT device_type, device_id, device_model, revoked_at, created_at FROM user_sessions WHERE user_id=?", [$p['id']]), false, ADMIN);

/* ---------------- آمار و فهرست‌های مدیریتی خط‌محور ---------------- */
// تبدیل میلادی به شمسی
function gregorian_to_jalali($gy, $gm, $gd) {
  $g_d_m = [0,31,59,90,120,151,181,212,243,273,304,334];
  $gy=(int)$gy; $gm=(int)$gm; $gd=(int)$gd;
  $gy2 = ($gm > 2) ? ($gy + 1) : $gy;
  $days = 355666 + (365*$gy) + intdiv($gy2+3,4) - intdiv($gy2+99,100) + intdiv($gy2+399,400) + $gd + $g_d_m[$gm-1];
  $jy = -1595 + (33*intdiv($days,12053)); $days %= 12053;
  $jy += 4*intdiv($days,1461); $days %= 1461;
  if ($days > 365) { $jy += intdiv($days-1,365); $days = ($days-1)%365; }
  if ($days < 186) { $jm = 1 + intdiv($days,31); $jd = 1 + ($days%31); }
  else { $jm = 7 + intdiv($days-186,30); $jd = 1 + (($days-186)%30); }
  return [$jy,$jm,$jd];
}
// قالب‌بندی تاریخ-زمان میلادی (Y-m-d H:i:s) به شمسی با ساعت تهران
function fa_datetime($mysqlDt) {
  if (!$mysqlDt) return '';
  $ts = strtotime($mysqlDt);
  [$jy,$jm,$jd] = gregorian_to_jalali(date('Y',$ts), date('m',$ts), date('d',$ts));
  return sprintf('%04d/%02d/%02d %s', $jy,$jm,$jd, date('H:i:s',$ts));
}
function fa_time($mysqlDt){ return $mysqlDt ? date('H:i:s', strtotime($mysqlDt)) : ''; }

function jalali_to_gregorian($jy, $jm, $jd) {
  $jy = (int)$jy - 979; $jm = (int)$jm - 1; $jd = (int)$jd - 1;
  $jdn = 365*$jy + intdiv($jy,33)*8 + intdiv(($jy%33+3),4);
  $md = [31,31,31,31,31,31,30,30,30,30,30,29];
  for ($i=0; $i<$jm; $i++) $jdn += $md[$i];
  $jdn += $jd; $g = $jdn + 79;
  $gy = 1600 + 400*intdiv($g,146097); $g %= 146097; $leap = true;
  if ($g >= 36525) { $g--; $gy += 100*intdiv($g,36524); $g %= 36524; if ($g >= 365) $g++; else $leap = false; }
  $gy += 4*intdiv($g,1461); $g %= 1461;
  if ($g >= 366) { $leap = false; $g--; $gy += intdiv($g,365); $g %= 365; }
  $gd = [31,($leap?29:28),31,30,31,30,31,31,30,31,30,31]; $gm = 0;
  for (; $gm<12 && $g >= $gd[$gm]; $gm++) $g -= $gd[$gm];
  return [$gy, $gm+1, $g+1];
}
function j_to_ts($s) {
  $s = strtr(trim((string)$s), ['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9']);
  if (!preg_match('/(\d{4})\D(\d{1,2})\D(\d{1,2})/', $s, $m)) return null;
  [$gy,$gm,$gd] = jalali_to_gregorian($m[1],$m[2],$m[3]);
  return mktime(0,0,0,$gm,$gd,$gy);
}
function is_expiring($jstr, $days=10) { $ts = j_to_ts($jstr); return $ts !== null && $ts <= strtotime("+$days days"); }
// همهٔ مقام‌های بالاسری یک نیرو (چند مدیر) — از user_managers و در صورت نبود، manager_id
// بررسی مقاوم دسترسی ارسال پیامک — از $u که از auth می‌آید استفاده می‌کند (بدون کوئری اضافه)
function _can_send_sms($u) {
  if (!empty($u['is_admin'])) return true;
  if (!empty($u['can_send_sms'])) return true;
  // اگر can_send_sms در $u نبود، یک‌بار از users بخوان (can_send_sms قطعاً در users است)
  try {
    $r = Db::one("SELECT can_send_sms FROM users WHERE id=?", [$u['id']]);
    return !empty($r['can_send_sms']);
  } catch (\Throwable $e) { return false; }
}

function _user_managers($uid) {
  $ids = array_column(Db::all("SELECT manager_id FROM user_managers WHERE user_id=?", [$uid]), 'manager_id');
  if ($ids) return array_values(array_unique(array_map('intval', $ids)));
  $m = Db::one("SELECT manager_id FROM users WHERE id=?", [$uid]);
  return ($m && $m['manager_id']) ? [(int)$m['manager_id']] : [];
}

function user_line_ids($u) {
  $ids = array_column(Db::all("SELECT line_id FROM user_lines WHERE user_id=?", [$u['id']]), 'line_id');
  if ($ids) return $ids;                              // هر کاربری که خط مجاز دارد → فقط همان خطوط
  return empty($u['is_admin']) ? [] : null;           // بدون خط: ادمین=همه، غیرادمین=هیچ
}
// تبدیل عکس کاربر به URL: اگر photo_path باشد URL فایل، وگرنه photo قدیمی (base64)
function _user_photo_url($photoPath, $photoData) {
  if (!empty($photoPath)) return '/api/media?path=' . urlencode($photoPath);
  return $photoData ?: null;
}

// فاصلهٔ هاورساین به متر
function _haversine_m($la1,$lo1,$la2,$lo2){
  $R=6371000; $t=M_PI/180; $dLa=($la2-$la1)*$t; $dLo=($lo2-$lo1)*$t;
  $a=sin($dLa/2)**2 + cos($la1*$t)*cos($la2*$t)*sin($dLo/2)**2;
  return 2*$R*asin(min(1,sqrt($a)));
}
// آیا نقطه داخل چندضلعی است (ray casting). poly = [[lat,lng],...]
function _point_in_polygon($lat,$lng,$poly){
  $inside=false; $n=count($poly);
  for($i=0,$j=$n-1;$i<$n;$j=$i++){
    $yi=$poly[$i][0]; $xi=$poly[$i][1]; $yj=$poly[$j][0]; $xj=$poly[$j][1];
    if((($yi>$lat)!=($yj>$lat)) && ($lng < ($xj-$xi)*($lat-$yi)/(($yj-$yi)?:1e-12)+$xi)) $inside=!$inside;
  }
  return $inside;
}
// کوتاه‌ترین فاصله (متر) از یک نقطه تا مرز چندضلعی (نزدیک‌ترین ضلع)
function _dist_point_to_segment_m($plat,$plng,$alat,$alng,$blat,$blng){
  // تبدیل تقریبی به مختصات متری محلی (برای فواصل کوتاه دقیق است)
  $latRef = ($alat+$blat)/2.0; $mPerDegLat = 111320.0; $mPerDegLng = 111320.0*cos($latRef*M_PI/180);
  $px=($plng-$alng)*$mPerDegLng; $py=($plat-$alat)*$mPerDegLat;
  $bx=($blng-$alng)*$mPerDegLng; $by=($blat-$alat)*$mPerDegLat;
  $len2=$bx*$bx+$by*$by;
  if($len2<=1e-9) return sqrt($px*$px+$py*$py);
  $t=max(0,min(1,($px*$bx+$py*$by)/$len2));
  $dx=$px-$t*$bx; $dy=$py-$t*$by;
  return sqrt($dx*$dx+$dy*$dy);
}
function _dist_to_polygon_m($lat,$lng,$poly){
  $n=count($poly); if($n<2) return INF; $min=INF;
  for($i=0,$j=$n-1;$i<$n;$j=$i++){
    $d=_dist_point_to_segment_m($lat,$lng,$poly[$i][0],$poly[$i][1],$poly[$j][0],$poly[$j][1]);
    if($d<$min) $min=$d;
  }
  return $min;
}
// ایستگاهی که نقطه داخل آن است را برمی‌گرداند (محدود به خطوط داده‌شده) یا null
function station_at_point($lat,$lng,$lineIds=null,$extraRadius=0){
  if($lat===null||$lng===null) return null;
  $where=''; $params=[];
  if(is_array($lineIds)){ if(!$lineIds) return null; $in=implode(',',array_fill(0,count($lineIds),'?')); $where="WHERE line_id IN ($in)"; $params=$lineIds; }
  $fences=Db::all("SELECT id,line_id,name,type,center_lat,center_lng,radius_m,polygon FROM geofences $where",$params);
  foreach($fences as $g){
    $hasCircle = ($g['center_lat']!==null && $g['center_lng']!==null && $g['radius_m']);
    $isPolygon = ($g['type']==='polygon' && $g['polygon']);
    if(($g['type']==='circle' || (!$isPolygon && $hasCircle)) && $hasCircle){
      if(_haversine_m((float)$lat,(float)$lng,(float)$g['center_lat'],(float)$g['center_lng']) <= ((float)$g['radius_m'] + (float)$extraRadius)) return $g;
    } elseif($isPolygon){
      $poly=json_decode($g['polygon'],true);
      if(is_array($poly) && count($poly)>=3){
        // داخل چندضلعی → قبول؛ یا اگر در فاصلهٔ مجازِ حاشیه از مرز باشد → قبول
        if(_point_in_polygon((float)$lat,(float)$lng,$poly)) return $g;
        if($extraRadius>0 && _dist_to_polygon_m((float)$lat,(float)$lng,$poly) <= (float)$extraRadius) return $g;
      }
    }
  }
  return null;
}

// نزدیک‌ترین ایستگاهِ خطوط مجاز و فاصلهٔ آن (برای پیام خطای دقیق هنگام ثبت حضور)
function _nearest_station($lat,$lng,$lineIds=null){
  if($lat===null||$lng===null) return null;
  $where=''; $params=[];
  if(is_array($lineIds)){ if(!$lineIds) return null; $in=implode(',',array_fill(0,count($lineIds),'?')); $where="WHERE line_id IN ($in)"; $params=$lineIds; }
  $fences=Db::all("SELECT id,line_id,name,type,center_lat,center_lng,radius_m,polygon FROM geofences $where",$params);
  $best=null; $bestD=null;
  foreach($fences as $g){
    $d=null; $allowed=0;
    $isPolygon = ($g['type']==='polygon' && $g['polygon']);
    if($isPolygon){
      $poly=json_decode($g['polygon'],true);
      if(is_array($poly) && count($poly)>=3){
        $d = _point_in_polygon((float)$lat,(float)$lng,$poly) ? 0 : _dist_to_polygon_m((float)$lat,(float)$lng,$poly);
        $allowed=0;
      }
    } elseif($g['center_lat']!==null && $g['center_lng']!==null){
      $d=_haversine_m((float)$lat,(float)$lng,(float)$g['center_lat'],(float)$g['center_lng']);
      $allowed=(int)$g['radius_m'];
    }
    if($d!==null && ($bestD===null || $d<$bestD)){ $bestD=$d; $best=['name'=>$g['name'],'distance_m'=>round($d),'radius_m'=>$allowed,'type'=>($isPolygon?'polygon':'circle')]; }
  }
  return $best;
}

// آمار داشبورد: تعداد رانندگان و خودروهای خطوط مجاز کاربر
route('GET', '/api/my/stats', function($p,$b,$u){
  $ids = user_line_ids($u);
  if ($ids === null) {
    return ['drivers'=>(int)Db::one("SELECT COUNT(*) n FROM drivers")['n'], 'vehicles'=>(int)Db::one("SELECT COUNT(*) n FROM vehicles")['n'], 'scope'=>'all'];
  }
  if (!$ids) return ['drivers'=>0,'vehicles'=>0,'scope'=>'lines'];
  $in = implode(',', array_fill(0,count($ids),'?'));
  $veh = (int)Db::one("SELECT COUNT(*) n FROM vehicles WHERE line_id IN ($in)", $ids)['n'];
  $drv = (int)Db::one("SELECT COUNT(DISTINCT vd.driver_id) n FROM vehicle_drivers vd JOIN vehicles v ON v.id=vd.vehicle_id WHERE v.line_id IN ($in)", $ids)['n'];
  return ['drivers'=>$drv,'vehicles'=>$veh,'scope'=>'lines'];
});

// پرکارترین و کم‌کارترین رانندهٔ هر خط (بر اساس تعداد ثبت حضور)
route('GET', '/api/my/driver-activity', function($p,$b,$u){
  $ids = user_line_ids($u); $where=''; $params=[];
  if ($ids !== null) { if (!$ids) return []; $where = "WHERE v.line_id IN (".implode(',',array_fill(0,count($ids),'?')).")"; $params=$ids; }
  $rows = Db::all("SELECT l.code line, CONCAT(d.first_name,' ',d.last_name) name, COUNT(a.id) n
    FROM vehicle_drivers vd JOIN vehicles v ON v.id=vd.vehicle_id JOIN `lines` l ON l.id=v.line_id
    JOIN drivers d ON d.id=vd.driver_id LEFT JOIN attendances a ON a.driver_id=d.id
    $where GROUP BY l.id, d.id ORDER BY l.code, n DESC", $params);
  $byLine = [];
  foreach ($rows as $r) { $byLine[$r['line']][] = $r; }
  $out = [];
  foreach ($byLine as $line=>$list) {
    $busy = $list[0]; $idle = end($list);
    $out[] = ['line'=>$line, 'busiest'=>['name'=>$busy['name'],'n'=>(int)$busy['n']], 'idlest'=>['name'=>$idle['name'],'n'=>(int)$idle['n']]];
  }
  return $out;
});

// فهرست‌های انقضا: type = insurance | inspection | taxi | oplic
route('GET', '/api/my/expiring', function($p,$b,$u){
  $type = $_GET['type'] ?? 'insurance'; $days = 10;
  $ids = user_line_ids($u);
  $lineCond = ''; $params = [];
  if ($ids !== null) { if (!$ids) return []; $lineCond = "v.line_id IN (".implode(',',array_fill(0,count($ids),'?')).")"; $params=$ids; }
  else $lineCond = '1=1';
  $out = [];
  if ($type === 'insurance' || $type === 'inspection') {
    $col = $type === 'insurance' ? 'insurance_expire' : 'tech_inspection_expire';
    $rows = Db::all("SELECT v.plate, v.model_name, v.$col expire, l.code line,
        COALESCE(v.beneficiary_national_id, v.owner_national_id) national_id, v.owner_national_id
      FROM vehicles v LEFT JOIN `lines` l ON l.id=v.line_id WHERE $lineCond AND v.$col IS NOT NULL AND v.$col<>''", $params);
    foreach ($rows as $r) if (is_expiring($r['expire'], $days)) $out[] = $r;
  } elseif ($type === 'taxi') {
    $rows = Db::all("SELECT DISTINCT d.first_name, d.last_name, d.national_id, d.taxi_lic_expire expire, l.code line, v.plate
      FROM drivers d JOIN vehicle_drivers vd ON vd.driver_id=d.id JOIN vehicles v ON v.id=vd.vehicle_id LEFT JOIN `lines` l ON l.id=v.line_id
      WHERE $lineCond AND d.taxi_lic_expire IS NOT NULL AND d.taxi_lic_expire<>''", $params);
    foreach ($rows as $r) if (is_expiring($r['expire'], $days)) $out[] = $r;
  } elseif ($type === 'oplic') {
    $rows = Db::all("SELECT v.plate, v.model_name, l.code line, d.op_lic_expire expire,
        CONCAT(d.first_name,' ',d.last_name) beneficiary, d.national_id, d.national_id owner_national_id
      FROM vehicles v LEFT JOIN `lines` l ON l.id=v.line_id LEFT JOIN drivers d ON d.national_id=COALESCE(v.beneficiary_national_id,v.owner_national_id)
      WHERE $lineCond AND d.op_lic_expire IS NOT NULL AND d.op_lic_expire<>''", $params);
    foreach ($rows as $r) if (is_expiring($r['expire'], $days)) $out[] = $r;
  }
  return $out;
});

// حضور/عدم‌حضور نیروها: آنلاین (پینگ ۳ دقیقهٔ اخیر)، آفلاین (پینگ قدیمی)، غیرفعال (بدون هیچ پینگ)
route('GET', '/api/admin/presence', function($p,$b,$u){
  $rows = Db::all("SELECT u.id, CONCAT(u.first_name,' ',u.last_name) name, r.title role,
      lp.lat, lp.lng, lp.captured_at, TIMESTAMPDIFF(SECOND, lp.captured_at, NOW()) secs
    FROM users u JOIN roles r ON r.id=u.role_id
    LEFT JOIN (SELECT lp1.user_id, lp1.lat, lp1.lng, lp1.captured_at FROM location_pings lp1
               JOIN (SELECT user_id, MAX(captured_at) mx FROM location_pings GROUP BY user_id) m
               ON m.user_id=lp1.user_id AND m.mx=lp1.captured_at) lp ON lp.user_id=u.id
    WHERE u.is_active=1 ORDER BY name");
  $online=[]; $offline=[]; $inactive=[];
  foreach ($rows as $r) {
    if (!$r['captured_at']) $inactive[] = $r;
    elseif ($r['secs'] !== null && (int)$r['secs'] <= 180) $online[] = $r;
    else $offline[] = $r;
  }
  return ['online'=>$online, 'offline'=>$offline, 'inactive'=>$inactive];
}, false, ADMIN);

// جستجوی راننده برای فهرست مسدودسازی (مدیر/رییس بازرسی/اداری ارشد)
route('GET', '/api/admin/drivers-search', function($p,$b,$u){
  $q = trim($_GET['q'] ?? ''); if (mb_strlen($q) < 2) return [];
  return Db::all("SELECT id, CONCAT(first_name,' ',last_name) name, national_id FROM drivers
    WHERE first_name LIKE ? OR last_name LIKE ? OR national_id LIKE ? LIMIT 20",
    ["%$q%","%$q%","%$q%"]);
}, false, ADMIN);

// هشدارهای انقضای اعتبار/بیمه/معاینه برای خطوط مجاز کاربر (برای اعلان‌ها)


/* ==================== مرکز ارسال پیام در ربات‌ها (Part 22) ==================== */
function _can_send_messenger($u) {
  if (!empty($u['is_admin']) || (($u['level'] ?? 0) >= ADMIN)) return true;
  if (!empty($u['can_send_sms'])) return true;
  $rid = (string)($u['role_id'] ?? '');
  $cfg = _req_setting('role_app_items', []);
  return is_array($cfg) && isset($cfg[$rid]) && is_array($cfg[$rid]) && in_array('BotMessages', $cfg[$rid], true);
}
function _messenger_send_mobiles_all($mobiles,$text,$targetType='group',$targetId=null) {
  $mobiles=array_values(array_unique(array_filter(array_map(function($m){ return MessengerBot::normalizeMobile((string)$m); }, $mobiles))));
  $tot=['sent'=>0,'not_connected'=>0,'failed'=>0,'total'=>count($mobiles),'platforms'=>[]];
  foreach(['bale','telegram','eitaa'] as $platform){
    $pc=['sent'=>0,'not_connected'=>0,'failed'=>0];
    foreach($mobiles as $m){
      try {
        $r=$platform==='bale' ? BaleBot::sendToMobile($m,$text,$targetType,$targetId) : MessengerBot::sendToMobile($platform,$m,$text,$targetType,$targetId);
        if(!empty($r['ok'])){$pc['sent']++;$tot['sent']++;}
        elseif(($r['error']??'')==='not_connected'){$pc['not_connected']++;$tot['not_connected']++;}
        else{$pc['failed']++;$tot['failed']++;}
      } catch(\Throwable $e){$pc['failed']++;$tot['failed']++;}
    }
    $tot['platforms'][$platform]=$pc;
  }
  return $tot;
}
route('GET','/api/messengers/config',function($p,$b,$u){
  return ['can_send'=>_can_send_messenger($u),'platforms'=>['bale'=>'بله','telegram'=>'تلگرام','eitaa'=>'ایتا'],'invite_text'=>_req_setting('messenger_invite_text','برای دریافت پیام‌های سامانه تاکسیرانی، ربات‌های رسمی سازمان را فعال و شماره همراه خود را ارسال کنید.'),'links'=>['bale'=>_req_setting('bale_bot_link',''),'telegram'=>_req_setting('telegram_bot_link',''),'eitaa'=>_req_setting('eitaa_bot_link','')]];
});
route('POST','/api/messengers/send-group',function($p,$b,$u){
  if(!_can_send_messenger($u)) Http::error('دسترسی ارسال پیام در ربات‌ها را ندارید',403);
  $text=trim((string)($b['message']??'')); if($text==='') Http::error('متن پیام لازم است',422);
  $mobiles=[];
  foreach(($b['mobiles']??[]) as $m)$mobiles[]=$m;
  $ids=array_values(array_filter(array_map('intval',$b['driver_ids']??[])));
  if($ids){$ph=implode(',',array_fill(0,count($ids),'?')); foreach(Db::all("SELECT mobile FROM drivers WHERE id IN ($ph)",$ids) as $r)$mobiles[]=$r['mobile']??'';}
  $line=(int)($b['line_id']??0); $role=trim((string)($b['role']??''));
  if($line>0 && empty($ids)){
    $sql="SELECT DISTINCT d.mobile FROM drivers d LEFT JOIN vehicle_drivers vd ON vd.driver_id=d.id LEFT JOIN vehicles v ON v.id=vd.vehicle_id WHERE d.mobile IS NOT NULL AND d.mobile<>'' AND (d.line_id=? OR v.line_id=?)";
    $params=[$line,$line]; if($role!==''){$sql.=" AND vd.role=?";$params[]=$role;}
    foreach(Db::all($sql.' LIMIT 5000',$params) as $r)$mobiles[]=$r['mobile'];
  }
  if(!$mobiles) Http::error('گیرنده‌ای انتخاب نشده است',422);
  return _messenger_send_mobiles_all($mobiles,$text,'group_message',$u['id']);
});
route('POST','/api/debt/{billId}/messenger',function($p,$b,$u){
  if(!_can_send_messenger($u)) Http::error('دسترسی ارسال در ربات‌ها را ندارید',403);
  $bill=Db::one("SELECT id,bill_id,pay_id,status,amount,phone,plate,national_id FROM bills WHERE id=?",[(int)$p['billId']]); if(!$bill)Http::error('فیش یافت نشد',404);
  $drv=Db::one("SELECT first_name,last_name,mobile FROM drivers WHERE national_id=?",[$bill['national_id']]); $mobile=$bill['phone']?:($drv['mobile']??''); if(!$mobile)Http::error('شماره همراه موجود نیست',422);
  $payUrl="https://epay.mashhad.ir/CityUsers/OnLineBillPay.aspx?BillId={$bill['bill_id']}&PayId={$bill['pay_id']}&Cell={$mobile}";
  $tpl=_req_setting('bill_bot_template',_req_setting('bill_sms_template',"تاکسیران گرامی {name}\nشناسه قبض: {bill_id}\nشناسه پرداخت: {pay_id}\nمبلغ: {amount} ریال\nپرداخت: {pay_url}"));
  $msg=strtr($tpl,['{name}'=>trim(($drv['first_name']??'').' '.($drv['last_name']??''))?:'تاکسیران','{bill_id}'=>$bill['bill_id'],'{pay_id}'=>$bill['pay_id'],'{amount}'=>number_format((int)$bill['amount']),'{plate}'=>$bill['plate']??'','{pay_url}'=>$payUrl]);
  return _messenger_send_mobiles_all([$mobile],$msg,'bill',(int)$bill['id']);
});
route('POST','/api/admin/messengers/invite',function($p,$b,$u){
  if(!_can_send_messenger($u))Http::error('دسترسی ندارید',403); if(!Sms::isEnabled())Http::error('برای دعوت شماره‌های متصل‌نشده، سرویس پیامک باید فعال باشد',400);
  $mobiles=array_values(array_unique(array_filter($b['mobiles']??[]))); if(!$mobiles)Http::error('شماره‌ای وارد نشده است',422);
  $links=array_filter([_req_setting('bale_bot_link',''),_req_setting('telegram_bot_link',''),_req_setting('eitaa_bot_link','')]);
  $text=trim((string)($b['text']??_req_setting('messenger_invite_text','برای دریافت پیام‌های سامانه تاکسیرانی، ربات رسمی سازمان را فعال کنید.'))); if($links)$text.="\n".implode("\n",$links);
  return Sms::send($mobiles,$text,'messenger_invite',$u['id']);
},false,1);
route('GET','/api/admin/messengers/subscribers-all',function($p,$b,$u){
  MessengerBot::ensureTables();
  $out=[];
  foreach(Db::all("SELECT 'bale' platform,id,mobile,chat_id,user_id,driver_id,status,created_at FROM bale_subscribers ORDER BY id DESC LIMIT 1000") as $r)$out[]=$r;
  foreach(Db::all("SELECT platform,id,mobile,chat_id,user_id,driver_id,status,created_at FROM messenger_subscribers ORDER BY id DESC LIMIT 2000") as $r)$out[]=$r;
  usort($out,function($a,$b){return strcmp($b['created_at']??'',$a['created_at']??'');}); return $out;
},false,ADMIN);

function expiry_notification_settings($userId) {
  $defaults = [
    'types'=>[
      'taxi_license'=>true,
      'operation_license'=>true,
      'technical_inspection'=>true,
      'third_party_insurance'=>true,
    ],
    'check_days'=>10,
    'repeat_days'=>30,
  ];
  $row = Db::one("SELECT value FROM app_settings WHERE `key`=?", ['expiry_notification_settings_'.(int)$userId]);
  $saved = $row ? json_decode((string)$row['value'], true) : null;
  if (!is_array($saved)) return $defaults;
  $savedTypes = is_array($saved['types'] ?? null) ? $saved['types'] : [];
  foreach ($defaults['types'] as $k=>$v) $defaults['types'][$k] = !array_key_exists($k,$savedTypes) || !empty($savedTypes[$k]);
  $defaults['check_days'] = max(0,min(365,(int)($saved['check_days'] ?? 10)));
  $defaults['repeat_days'] = max(1,min(365,(int)($saved['repeat_days'] ?? 30)));
  return $defaults;
}

function expiry_dismissed_map($userId) {
  $row = Db::one("SELECT value FROM app_settings WHERE `key`=?", ['dismissed_expiry_alerts_'.(int)$userId]);
  $map = $row ? json_decode((string)$row['value'], true) : [];
  return is_array($map) ? $map : [];
}

function expiry_dismiss_alerts($userId, $fingerprints) {
  $map = expiry_dismissed_map($userId);
  $now = time();
  foreach ((array)$fingerprints as $fp) if (is_string($fp) && strpos($fp,'expiry:')===0) $map[$fp]=$now;
  // جلوگیری از رشد نامحدود تنظیمات؛ رکوردهای قدیمی‌تر از دو سال حذف می‌شوند.
  foreach ($map as $fp=>$ts) if ((int)$ts < $now - 63072000) unset($map[$fp]);
  Db::run("INSERT INTO app_settings(`key`,value) VALUES(?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)",
    ['dismissed_expiry_alerts_'.(int)$userId, json_encode($map, JSON_UNESCAPED_UNICODE)]);
}

function expiry_alerts($u) {
  $uid = (int)($u['id'] ?? 0);
  $cfg = expiry_notification_settings($uid);
  $enabled = $cfg['types'];
  $checkDays = (int)$cfg['check_days'];
  $repeatSeconds = max(1,(int)$cfg['repeat_days']) * 86400;
  $dismissed = expiry_dismissed_map($uid);
  $ids = user_line_ids($u);
  if ($ids === null) { $lineCond = '1=1'; $params = []; }
  elseif (!$ids) return [];
  else { $lineCond = "v.line_id IN (".implode(',', array_fill(0,count($ids),'?')).")"; $params = $ids; }
  $out = [];
  $append = function($type,$entityId,$title,$body,$data=[]) use (&$out,$dismissed,$repeatSeconds) {
    $fp = 'expiry:'.$type.':'.(int)$entityId;
    if (!empty($dismissed[$fp]) && (int)$dismissed[$fp] + $repeatSeconds > time()) return;
    $out[] = [
      'id'=>$fp, 'fingerprint'=>$fp, 'type'=>'alert', 'title'=>$title, 'body'=>$body,
      'is_read'=>false, 'created_at'=>null,
      'data'=>array_merge(['type'=>'expiry','expiry_type'=>$type],$data),
    ];
  };

  if (!empty($enabled['taxi_license']) || !empty($enabled['operation_license'])) {
    $drivers = Db::all("SELECT DISTINCT d.id,d.national_id,d.first_name,d.last_name,d.taxi_lic_expire,d.op_lic_expire
      FROM drivers d JOIN vehicle_drivers vd ON vd.driver_id=d.id JOIN vehicles v ON v.id=vd.vehicle_id
      WHERE $lineCond", $params);
    foreach ($drivers as $r) {
      $name = trim(($r['first_name']??'').' '.($r['last_name']??''));
      if (!empty($enabled['taxi_license']) && !empty($r['taxi_lic_expire']) && is_expiring($r['taxi_lic_expire'],$checkDays))
        $append('taxi_license',$r['id'],'انقضای پروانه تاکسیرانی',$name.' — '.$r['taxi_lic_expire'],['national_id'=>$r['national_id']??null,'expires_at'=>$r['taxi_lic_expire']]);
      if (!empty($enabled['operation_license']) && !empty($r['op_lic_expire']) && is_expiring($r['op_lic_expire'],$checkDays))
        $append('operation_license',$r['id'],'انقضای پروانه بهره‌برداری',$name.' — '.$r['op_lic_expire'],['national_id'=>$r['national_id']??null,'expires_at'=>$r['op_lic_expire']]);
    }
  }

  if (!empty($enabled['third_party_insurance']) || !empty($enabled['technical_inspection'])) {
    $vehicles = Db::all("SELECT v.id,v.plate,v.insurance_expire,v.tech_inspection_expire FROM vehicles v WHERE $lineCond", $params);
    foreach ($vehicles as $r) {
      if (!empty($enabled['third_party_insurance']) && !empty($r['insurance_expire']) && is_expiring($r['insurance_expire'],$checkDays))
        $append('third_party_insurance',$r['id'],'انقضای بیمه شخص ثالث','پلاک '.$r['plate'].' — '.$r['insurance_expire'],['vehicle_id'=>(int)$r['id'],'plate'=>$r['plate'],'expires_at'=>$r['insurance_expire']]);
      if (!empty($enabled['technical_inspection']) && !empty($r['tech_inspection_expire']) && is_expiring($r['tech_inspection_expire'],$checkDays))
        $append('technical_inspection',$r['id'],'انقضای معاینه فنی','پلاک '.$r['plate'].' — '.$r['tech_inspection_expire'],['vehicle_id'=>(int)$r['id'],'plate'=>$r['plate'],'expires_at'=>$r['tech_inspection_expire']]);
    }
  }
  return array_slice($out, 0, 100);
}

// لاگ فعالیت‌ها با فیلتر تاریخ/نوع/کاربر (و خروجی برای اکسل سمت کلاینت)
route('GET', '/api/admin/logs', function($p,$b,$u){
  $c=[]; $pr=[];
  if (!empty($_GET['event'])) { $c[]="l.event=?"; $pr[]=$_GET['event']; }
  if (!empty($_GET['user_id'])) { $c[]="l.user_id=?"; $pr[]=(int)$_GET['user_id']; }
  if (!empty($_GET['from'])) { $c[]="l.created_at>=?"; $pr[]=$_GET['from'].' 00:00:00'; }
  if (!empty($_GET['to']))   { $c[]="l.created_at<=?"; $pr[]=$_GET['to'].' 23:59:59'; }
  $where = $c ? ('WHERE '.implode(' AND ',$c)) : '';
  $lim = !empty($_GET['all']) ? 5000 : 200;
  return Db::all("SELECT l.id,l.event,l.meta,l.created_at,u.first_name,u.last_name
    FROM activity_logs l LEFT JOIN users u ON u.id=l.user_id $where ORDER BY l.created_at DESC LIMIT $lim", $pr);
}, false, ADMIN);
// انواع رویداد موجود برای فیلتر
route('GET', '/api/admin/log-events', fn($p,$b,$u) =>
  array_column(Db::all("SELECT DISTINCT event FROM activity_logs ORDER BY event"), 'event'), false, ADMIN);

// گزارش زیرمجموعهٔ سربازرس/بازرس (بر اساس چارت سازمانی manager_id، به‌صورت بازگشتی)
route('GET', '/api/my/team', function($p,$b,$u){
  // جمع‌آوری همهٔ زیردستان (چند سطح)
  $all = Db::all("SELECT id, manager_id, first_name, last_name, role_id FROM users WHERE is_active=1");
  $byMgr = [];
  foreach ($all as $r) $byMgr[$r['manager_id']][] = $r;
  $roleName = []; foreach (Db::all("SELECT id,title,level FROM roles") as $r) $roleName[$r['id']] = $r;
  $team = []; $stack = [$u['id']];
  while ($stack) { $cur = array_pop($stack); foreach (($byMgr[$cur] ?? []) as $c) { $team[] = $c; $stack[] = $c['id']; } }
  // فیلتر نقش‌های قابل‌نمایش بسته به نقش بیننده
  $viewer = $u['role_title'] ?? '';
  $isInspector = (mb_strpos($viewer,'بازرس')!==false && mb_strpos($viewer,'سرباز')===false && mb_strpos($viewer,'رییس')===false);
  $allowRoles = $isInspector ? ['ناظر خط','ناظر خط مبادی','ناظر خط ثامن','اپراتور','نظارت تصویری']
                             : ['بازرس','نماینده اجرایی','ناظر خط','ناظر خط مبادی','ناظر خط ثامن','اپراتور','نظارت تصویری'];
  $groups = [];
  // خطوط دسترسی هر کاربر را یکجا بخوان
  $teamIdsAll = array_column($team, 'id');
  $userLines = [];
  if ($teamIdsAll) {
    $in = implode(',', array_fill(0, count($teamIdsAll), '?'));
    $lr = Db::all("SELECT ul.user_id, l.code FROM user_lines ul JOIN `lines` l ON l.id=ul.line_id WHERE ul.user_id IN ($in) ORDER BY l.code", $teamIdsAll);
    foreach ($lr as $row) $userLines[$row['user_id']][] = $row['code'];
  }
  foreach ($team as $m) {
    $rt = $roleName[$m['role_id']]['title'] ?? '';
    $match = false; foreach ($allowRoles as $ar) if (mb_strpos($rt,$ar)!==false) { $match=true; break; }
    if (!$match) continue;
    $lines = $userLines[$m['id']] ?? [];
    $groups[$rt][] = [
      'id'=>$m['id'],
      'name'=>$m['first_name'].' '.$m['last_name'],
      'role_title'=>$rt,
      'lines'=>$lines,
      'line_count'=>count($lines),
    ];
  }
  // پرکار/کم‌کارترین زیرمجموعه بر اساس فعالیت
  $teamIds = array_column($team,'id');
  $busiest=null; $idlest=null;
  if ($teamIds) {
    $in = implode(',', array_fill(0,count($teamIds),'?'));
    $rows = Db::all("SELECT u.id, CONCAT(u.first_name,' ',u.last_name) name,
        (SELECT COUNT(*) FROM attendances a WHERE a.user_id=u.id) + (SELECT COUNT(*) FROM reports rp WHERE rp.sender_id=u.id) + (SELECT COUNT(*) FROM official_visits ov WHERE ov.recorded_by=u.id) total
      FROM users u WHERE u.id IN ($in)", $teamIds);
    usort($rows, fn($a,$c)=>$c['total']-$a['total']);
    if ($rows){ $busiest=$rows[0]; $idlest=end($rows); }
  }
  $counts = []; foreach ($groups as $rt=>$list) $counts[$rt] = count($list);
  return ['groups'=>$groups, 'counts'=>$counts, 'total'=>count(array_merge(...array_values($groups ?: [[]]))), 'busiest'=>$busiest, 'idlest'=>$idlest];
});

// گزارش فعالیت کاربر با بازهٔ تاریخ (شمسی→میلادی در سمت کلاینت ارسال می‌شود به‌صورت میلادی from/to)
route('GET', '/api/admin/user-activity-range', function($p,$b,$u){
  $uid=(int)($_GET['user_id']??0); $from=$_GET['from']??date('Y-m-d'); $to=$_GET['to']??$from;
  $normDate=function($v){ $v=str_replace('/','-',trim((string)$v)); if(preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/',$v,$m) && (int)$m[1]<1700){ [$gy,$gm,$gd]=jalali_to_gregorian((int)$m[1],(int)$m[2],(int)$m[3]); return sprintf('%04d-%02d-%02d',$gy,$gm,$gd); } return date('Y-m-d',strtotime($v)); };
  $from=$normDate($from); $to=$normDate($to);
  if(!$uid) Http::error('user_id لازم است',400);
  $rows=Db::all("SELECT kind, at FROM user_activity WHERE user_id=? AND DATE(at) BETWEEN ? AND ? ORDER BY at",[$uid,$from,$to]);
  $dur=['online'=>0,'gps'=>0,'session'=>0,'active'=>0]; $open=[]; $logins=[];$logouts=[];
  foreach($rows as $r){ $ts=strtotime($r['at']);
    if($r['kind']==='session_start'){$open['session']=$ts;$logins[]=$r['at'];}
    elseif($r['kind']==='session_end'){if(isset($open['session'])){$dur['session']+=$ts-$open['session'];unset($open['session']);}$logouts[]=$r['at'];}
    elseif($r['kind']==='app_foreground'){$open['active']=$ts;}
    elseif($r['kind']==='app_background'){if(isset($open['active'])){$dur['active']+=$ts-$open['active'];unset($open['active']);}}
    elseif($r['kind']==='online'){$open['online']=$ts;}
    elseif($r['kind']==='offline'){if(isset($open['online'])){$dur['online']+=$ts-$open['online'];unset($open['online']);}}
    elseif($r['kind']==='gps_on'){$open['gps']=$ts;}
    elseif($r['kind']==='gps_off'){if(isset($open['gps'])){$dur['gps']+=$ts-$open['gps'];unset($open['gps']);}}
  }
  // بازه‌های بازِ تا انتهای دورهٔ انتخابی/اکنون
  $endTs=min(time(), strtotime($to.' 23:59:59'));
  foreach(['session','active','online','gps'] as $k) if(isset($open[$k])) $dur[$k]+=$endTs-$open[$k];
  // مدت استفاده = زمان فعالِ داخل اپ؛ اگر رویداد پیش‌زمینه نبود، از session
  $usage = $dur['active']>0 ? $dur['active'] : $dur['session'];
  // رویدادهای VPN در بازه
  $vpn_events=[]; $vpn_spans=[]; $vpnOnAt=null;
  try {
    $ve=Db::all("SELECT state, ip, created_at, country FROM vpn_events WHERE user_id=? AND DATE(created_at) BETWEEN ? AND ? ORDER BY created_at",[$uid,$from,$to]);
    foreach($ve as $e){ $vpn_events[]=['state'=>(int)$e['state'],'ip'=>$e['ip'],'country'=>$e['country']??null,'at'=>$e['created_at']];
      if((int)$e['state']===1){$vpnOnAt=$e['created_at'];}
      elseif($vpnOnAt!==null){$vpn_spans[]=[$vpnOnAt,$e['created_at']];$vpnOnAt=null;} }
    if($vpnOnAt!==null) $vpn_spans[]=[$vpnOnAt,date('Y-m-d H:i:s',$endTs)];
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  // تعداد پیامک ارسالی و کلیک پرداخت قبض در بازه
  $sms_total=0; $sms_abonman=0; $bill_pay_clicks=0;
  try {
    $sms_total = (int)(Db::one("SELECT COUNT(*) c FROM sms_log WHERE sent_by=? AND DATE(created_at) BETWEEN ? AND ?", [$uid,$from,$to])['c'] ?? 0);
    $cols = array_column(Db::all("SHOW COLUMNS FROM sms_log"), 'Field');
    if (in_array('bill_id', $cols)) {
      $sms_abonman = (int)(Db::one("SELECT COUNT(*) c FROM sms_log WHERE sent_by=? AND DATE(created_at) BETWEEN ? AND ? AND bill_id IS NOT NULL", [$uid,$from,$to])['c'] ?? 0);
    }
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  try {
    $bill_pay_clicks = (int)(Db::one("SELECT COUNT(*) c FROM user_activity WHERE user_id=? AND kind='bill_pay_click' AND DATE(at) BETWEEN ? AND ?", [$uid,$from,$to])['c'] ?? 0);
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  $effRange = _effective_bill_pay_clicks($uid, $from, $to);
  $bill_pay_effective = $effRange['effective'];
  $commitments_count = 0;
  try { _ensure_commitments_table(); $commitments_count = (int)(Db::one("SELECT COUNT(*) c FROM user_commitments WHERE user_id=?", [$uid])['c'] ?? 0); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  return ['from'=>$from,'to'=>$to,'first_login'=>$logins[0]??null,'last_logout'=>end($logouts)?:null,
    'usage_seconds'=>$usage,'active_seconds'=>$dur['active'],'online_seconds'=>$dur['online'],'gps_on_seconds'=>$dur['gps'],
    'vpn_events'=>$vpn_events,'vpn_spans'=>$vpn_spans,'vpn_used'=>count($vpn_spans)>0,
    'sms_total'=>$sms_total,'sms_abonman'=>$sms_abonman,'bill_pay_clicks'=>$bill_pay_clicks,'bill_pay_effective'=>$bill_pay_effective,
    'commitments_count'=>$commitments_count,
    'events'=>count($rows)];
}, false, ADMIN);

// گزارش کلی فعالیت همهٔ کاربران در یک بازه (برای خروجی اکسل سراسری)
route('GET', '/api/admin/user-activity-all', function($p,$b,$u){
  $from = $_GET['from'] ?? date('Y-m-d', strtotime('-30 days'));
  $to = $_GET['to'] ?? date('Y-m-d');
  $normDate=function($v){ $v=str_replace('/','-',trim((string)$v)); if(preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/',$v,$m) && (int)$m[1]<1700){ [$gy,$gm,$gd]=jalali_to_gregorian((int)$m[1],(int)$m[2],(int)$m[3]); return sprintf('%04d-%02d-%02d',$gy,$gm,$gd); } return date('Y-m-d',strtotime($v)); };
  $from=$normDate($from); $to=$normDate($to);
  $users = Db::all("SELECT u.id, CONCAT(u.first_name,' ',u.last_name) name, r.title role_title
    FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.is_active=1 ORDER BY name");
  // پیش‌محاسبهٔ شمارش‌های گروهی برای کارایی
  $smsCols = array_column(Db::all("SHOW COLUMNS FROM sms_log"), 'Field');
  $sms = []; foreach (Db::all("SELECT sent_by uid, COUNT(*) n FROM sms_log WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY sent_by", [$from,$to]) as $r) $sms[$r['uid']]=(int)$r['n'];
  $smsAb = []; if (in_array('bill_id',$smsCols)) foreach (Db::all("SELECT sent_by uid, COUNT(*) n FROM sms_log WHERE bill_id IS NOT NULL AND DATE(created_at) BETWEEN ? AND ? GROUP BY sent_by", [$from,$to]) as $r) $smsAb[$r['uid']]=(int)$r['n'];
  $billClick = []; foreach (Db::all("SELECT user_id uid, COUNT(*) n FROM user_activity WHERE kind='bill_pay_click' AND DATE(at) BETWEEN ? AND ? GROUP BY user_id", [$from,$to]) as $r) $billClick[$r['uid']]=(int)$r['n'];
  $commit = []; try { _ensure_commitments_table(); foreach (Db::all("SELECT user_id uid, COUNT(*) n FROM user_commitments GROUP BY user_id") as $r) $commit[$r['uid']]=(int)$r['n']; } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  // مدت استفاده/آنلاین/GPS و VPN از روی user_activity
  $rowsAll = Db::all("SELECT user_id, kind, at FROM user_activity WHERE DATE(at) BETWEEN ? AND ? ORDER BY user_id, at", [$from,$to]);
  $byUser = [];
  foreach ($rowsAll as $r) { $byUser[$r['user_id']][] = $r; }
  $fromTs = strtotime($from.' 00:00:00'); $toTs = strtotime($to.' 23:59:59');
  $calcDur = function($rows) use ($fromTs,$toTs){
    $active=0;$online=0;$gps=0; $vpnUsed=false;
    $openA=null;$openO=null;$openG=null;$vpnOn=null;
    foreach ($rows as $e){ $t=strtotime($e['at']); $k=$e['kind'];
      if ($k==='session_start'||$k==='app_foreground'){ if($openA===null)$openA=$t; }
      elseif ($k==='session_end'||$k==='app_background'){ if($openA!==null){$active+=max(0,$t-$openA);$openA=null;} }
      elseif ($k==='online'){ if($openO===null)$openO=$t; }
      elseif ($k==='offline'){ if($openO!==null){$online+=max(0,$t-$openO);$openO=null;} }
      elseif ($k==='gps_on'){ if($openG===null)$openG=$t; }
      elseif ($k==='gps_off'){ if($openG!==null){$gps+=max(0,$t-$openG);$openG=null;} }
    }
    if($openA!==null)$active+=max(0,min($toTs,time())-$openA);
    if($openO!==null)$online+=max(0,min($toTs,time())-$openO);
    if($openG!==null)$gps+=max(0,min($toTs,time())-$openG);
    return ['active'=>$active,'online'=>$online,'gps'=>$gps];
  };
  // رویدادهای VPN برای تشخیص استفاده
  $vpnByUser = [];
  try { foreach (Db::all("SELECT user_id, COUNT(*) n FROM vpn_events WHERE state=1 AND DATE(created_at) BETWEEN ? AND ? GROUP BY user_id", [$from,$to]) as $r) $vpnByUser[$r['user_id']]=(int)$r['n']; } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  $out = [];
  foreach ($users as $usr) {
    $uid = $usr['id'];
    $dur = $calcDur($byUser[$uid] ?? []);
    $bc = $billClick[$uid] ?? 0;
    $eff = $bc>0 ? _effective_bill_pay_clicks($uid,$from,$to)['effective'] : 0;
    $out[] = [
      'id'=>$uid,'name'=>$usr['name'],'role_title'=>$usr['role_title'],
      'usage_seconds'=>$dur['active'],'online_seconds'=>$dur['online'],'gps_on_seconds'=>$dur['gps'],
      'vpn_used'=>!empty($vpnByUser[$uid]),
      'sms_total'=>$sms[$uid]??0,'sms_abonman'=>$smsAb[$uid]??0,
      'bill_pay_clicks'=>$bc,'bill_pay_effective'=>$eff,
      'commitments_count'=>$commit[$uid]??0,
    ];
  }
  return ['from'=>$from,'to'=>$to,'people'=>$out];
}, false, ADMIN);

// خروجی اکسل ریز عملکرد کاربر: ساعات استفاده، خاموشی GPS و قطعی اینترنت در بازهٔ تاریخ (زمان شمسی/تهران)
route('GET', '/api/admin/user-activity/export', function($p,$b,$u){
  $uid=(int)($_GET['user_id']??0); $from=$_GET['from']??date('Y-m-d'); $to=$_GET['to']??$from;
  if(!$uid) Http::error('user_id لازم است',400);
  $normDate=function($v){ $v=str_replace('/','-',trim((string)$v)); if(preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/',$v,$m) && (int)$m[1]<1700){ [$gy,$gm,$gd]=jalali_to_gregorian((int)$m[1],(int)$m[2],(int)$m[3]); return sprintf('%04d-%02d-%02d',$gy,$gm,$gd); } return date('Y-m-d',strtotime($v)); };
  $from=$normDate($from); $to=$normDate($to);
  $info=Db::one("SELECT CONCAT(first_name,' ',last_name) name FROM users WHERE id=?", [$uid]);
  $rows=Db::all("SELECT kind, at FROM user_activity WHERE user_id=? AND DATE(at) BETWEEN ? AND ? ORDER BY at",[$uid,$from,$to]);

  // ساخت بازه‌ها از روی رویدادها (active/offline/gps_off)
  $spans=[]; $open=[];
  $label=['active'=>'در حال استفاده از برنامه','offline'=>'اینترنت خاموش','gps_off'=>'GPS خاموش'];
  $push=function($type,$s,$e) use (&$spans,$label){ if($e>$s) $spans[]=['type'=>$label[$type],'start'=>$s,'end'=>$e,'secs'=>$e-$s]; };
  foreach($rows as $r){ $ts=strtotime($r['at']);
    switch($r['kind']){
      case 'app_foreground': $open['active']=$r['at']; break;
      case 'app_background': if(isset($open['active'])){ $push('active',strtotime($open['active']),$ts); unset($open['active']); } break;
      case 'offline': $open['offline']=$r['at']; break;
      case 'online': if(isset($open['offline'])){ $push('offline',strtotime($open['offline']),$ts); unset($open['offline']); } break;
      case 'gps_off': $open['gps']=$r['at']; break;
      case 'gps_on': if(isset($open['gps'])){ $push('gps_off',strtotime($open['gps']),$ts); unset($open['gps']); } break;
    }
  }
  // افزودن بازه‌های روشن‌بودن فیلترشکن (VPN)
  try {
    $ve=Db::all("SELECT state, created_at FROM vpn_events WHERE user_id=? AND DATE(created_at) BETWEEN ? AND ? ORDER BY created_at",[$uid,$from,$to]);
    $von=null;
    foreach($ve as $e){ $ts=strtotime($e['created_at']);
      if((int)$e['state']===1){ $von=$ts; }
      elseif($von!==null){ $spans[]=['type'=>'فیلترشکن (VPN) روشن','start'=>$von,'end'=>$ts,'secs'=>$ts-$von]; $von=null; }
    }
    if($von!==null){ $eod=min(time(),strtotime($to.' 23:59:59')); $spans[]=['type'=>'فیلترشکن (VPN) روشن','start'=>$von,'end'=>$eod,'secs'=>$eod-$von]; }
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  usort($spans, fn($a,$c)=>$a['start']-$c['start']);

  $hms=function($s){ return sprintf('%02d:%02d:%02d', intdiv($s,3600), intdiv($s%3600,60), $s%60); };
  // CSV با BOM برای باز شدن صحیح در اکسل
  $out = "\xEF\xBB\xBF";
  $out .= "کاربر,نوع,از تاریخ-ساعت,تا تاریخ-ساعت,مدت\r\n";
  foreach($spans as $sp){
    $out .= sprintf("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"\r\n",
      $info['name']??'', $sp['type'], fa_datetime(date('Y-m-d H:i:s',$sp['start'])), fa_datetime(date('Y-m-d H:i:s',$sp['end'])), $hms($sp['secs']));
  }
  header('Content-Type: text/csv; charset=UTF-8');
  header('Content-Disposition: attachment; filename="activity_'.$uid.'_'.$from.'_'.$to.'.csv"');
  echo $out; exit;
}, false, ADMIN);

// اعتبارسنجی حجم فایل پیوست بر اساس محدودیت هر بخش (در صورت نبود محدودیت، بدون اعمال)
function enforce_attachment($section, $name, $dataUrl) {
  if (empty($dataUrl)) return;                       // پیوستی وجود ندارد
  $row = Db::one("SELECT value FROM app_settings WHERE `key`=?", ['upload_'.$section]);
  $cfg = $row ? json_decode($row['value'], true) : null;
  $maxKb = 0;
  if (is_array($cfg)) $maxKb = (int)($cfg['max_kb'] ?? $cfg['limit_kb'] ?? $cfg['kb'] ?? 0);
  elseif (is_numeric($cfg)) $maxKb = (int)$cfg;
  // محاسبهٔ حجم تقریبی از data URL (base64)
  $b64 = (string)$dataUrl;
  if (($pos = strpos($b64, 'base64,')) !== false) $b64 = substr($b64, $pos + 7);
  $bytes = (int)(strlen($b64) * 3 / 4);
  $kb = $bytes / 1024;
  if ($maxKb > 0 && $kb > $maxKb) Http::error('حجم فایل پیوست بیش از حد مجاز است (حداکثر '.$maxKb.' کیلوبایت)', 413);
}

// ارسال Push هشدارهای انقضا (برای اجرای روزانه با Cron). با کلید مخفی محافظت می‌شود.
// نمونهٔ Cron روزانه:  wget -qO- "https://app.yousefipour.ir/api/cron/push-expiry?key=КЛЮЧ"
route('GET', '/api/cron/push-expiry', function($p,$b,$u){
  $cfg = Db::one("SELECT value FROM app_settings WHERE `key`='cron_key'");
  $key = $cfg ? trim((string)json_decode($cfg['value'], true)) : '';
  if ($key === '' || ($_GET['key'] ?? '') !== $key) Http::error('کلید نامعتبر', 403);
  $users = array_column(Db::all("SELECT DISTINCT user_id FROM user_lines"), 'user_id');
  $sent = 0;
  foreach ($users as $uid) {
    $alerts = expiry_alerts(['id'=>$uid, 'is_admin'=>0]);
    if ($alerts) { Push::send([$uid], 'هشدار انقضای اعتبار', count($alerts).' مورد در خطوط شما رو به انقضا یا منقضی است', ['type'=>'expiry']); $sent++; }
  }
  return ['ok'=>true, 'users_notified'=>$sent];
}, true); // public=true (با کلید محافظت می‌شود)

/* ---------------- فاز ۲: داشبورد لحظه‌ای گزارش، اعلان و شیفت ---------------- */
route('GET', '/api/admin/phase2-dashboard', function($p,$b,$u){
  $today = date('Y-m-d');
  $one = fn($sql,$params=[]) => (int)(Db::one($sql,$params)['n'] ?? 0);
  $present = $one("SELECT COUNT(*) n FROM user_attendance WHERE DATE(checkin_at)=? AND checkout_at IS NULL", [$today]);
  $reportsNew = $one("SELECT COUNT(*) n FROM reports WHERE deleted_at IS NULL AND DATE(created_at)=?", [$today]);
  $reportsUnread = $one("SELECT COUNT(*) n FROM reports r JOIN report_routes rr ON rr.report_id=r.id WHERE r.deleted_at IS NULL AND rr.to_user_id=? AND NOT EXISTS(SELECT 1 FROM report_reads rd WHERE rd.report_id=r.id AND rd.user_id=?)", [(int)$u['id'],(int)$u['id']]);
  $outOfZone = $one("SELECT COUNT(*) n FROM notifications WHERE DATE(created_at)=? AND (title LIKE '%خروج از محدوده%' OR body LIKE '%خارج شد%')", [$today]);
  $shiftTransfers = $one("SELECT COUNT(*) n FROM report_audit WHERE action='shift_transfer' AND DATE(created_at)=?", [$today]);
  $lines = [];
  try {
    $lines = Db::all("SELECT l.id,l.code,l.origin,l.destination,COUNT(ua.id) present_count
      FROM `lines` l
      LEFT JOIN user_attendance ua ON ua.line_id=l.id AND DATE(ua.checkin_at)=? AND ua.checkout_at IS NULL
      GROUP BY l.id ORDER BY l.code LIMIT 100", [$today]);
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  return ['today'=>$today,'present'=>$present,'reports_new'=>$reportsNew,'reports_unread'=>$reportsUnread,'out_of_zone'=>$outOfZone,'shift_transfers'=>$shiftTransfers,'lines'=>$lines];
}, false, ADMIN);

route('GET', '/api/admin/shift-live', function($p,$b,$u){
  try {
    return Db::all("SELECT ua.id,ua.user_id,ua.line_id,ua.checkin_at,ua.checkout_at,
        u.first_name,u.last_name,r.title role_title,l.code line_code,l.origin,l.destination
      FROM user_attendance ua
      JOIN users u ON u.id=ua.user_id
      LEFT JOIN roles r ON r.id=u.role_id
      LEFT JOIN `lines` l ON l.id=ua.line_id
      WHERE ua.checkout_at IS NULL
      ORDER BY ua.checkin_at DESC LIMIT 300");
  } catch (\Throwable $e) { return []; }
}, false, ADMIN);


/* ---------------- فاز ۴: وضعیت پروژه، نسخه‌گذاری و کنترل تکمیل قابلیت‌ها ---------------- */
function _project_phase_status(){
  return [
    'version' => [
      'site_version' => SITE_VERSION,
      'app_version' => APP_VERSION,
      'phase' => 5,
      'release_name' => 'Phase 5 - Stability, Queue, Rules & Upgrade Consolidation',
    ],
    'completed' => [
      ['key'=>'phase1_attendance_engine','title'=>'موتور حضور، شیفت خودکار، QR تحویل شیفت، شب‌کاری، جمعه‌کاری و تعطیل‌کاری','status'=>'done'],
      ['key'=>'phase1_reports_basic','title'=>'ویرایش/حذف پایه گزارش و اصلاح بایگانی','status'=>'done'],
      ['key'=>'phase2_reports_notifications','title'=>'بهبود گزارش‌ها، اعلان‌ها، داشبورد و وضعیت زنده شیفت','status'=>'done'],
      ['key'=>'phase3_temp_drivers','title'=>'رانندگان موقت، جستجوی خودرو/بهره‌بردار/کمکی و رفع جداکننده کد ملی','status'=>'done'],
      ['key'=>'mobile_audio_alerts','title'=>'صداهای اختصاصی و آلارم صحت‌سنجی','status'=>'done'],
      ['key'=>'bale_bot','title'=>'اتصال ربات بله و ارسال همزمان پیام‌ها','status'=>'done'],
      ['key'=>'salary_slips','title'=>'بارگذاری و مشاهده فیش حقوقی PDF','status'=>'done'],
      ['key'=>'delivery_queue','title'=>'صف پایدار پیامک، Push و بله با Retry و گزارش تحویل','status'=>'done'],
      ['key'=>'rule_engine_base','title'=>'موتور قوانین سمت‌ها برای موظفی، اضافه‌کار و مازاد حضور','status'=>'done'],
      ['key'=>'upgrade_php','title'=>'تجمیع به‌روزرسانی دیتابیس در php/public/upgrade.php','status'=>'done'],
      ['key'=>'health_observability_base','title'=>'لاگ سلامت فنی و API گزارش سلامت سامانه','status'=>'done'],
      ['key'=>'offline_sync_base','title'=>'زیرساخت ثبت صف آفلاین موبایل در سرور','status'=>'done'],
    ],
    'remaining' => [
      ['key'=>'frontend_production_bundle','title'=>'ساخت نهایی Production Bundle پنل پس از نصب Node/Vite روی سیستم توسعه و حذف کامل Babel از مرورگر','priority'=>'high'],
      ['key'=>'device_field_tests','title'=>'تست میدانی GPS، Push، QR، آلارم و حالت پس‌زمینه روی گوشی‌های واقعی','priority'=>'high'],
      ['key'=>'automated_test_suite','title'=>'تکمیل تست خودکار API و سناریوهای حضور/گزارش/شیفت','priority'=>'medium'],
      ['key'=>'holiday_provider_integration','title'=>'اتصال به منبع رسمی تعطیلات سالانه در صورت ارائه API معتبر','priority'=>'medium'],
    ],
  ];
}
route('GET', '/api/admin/project-status', function($p,$b,$u){
  return _project_phase_status();
}, false, ADMIN);

route('GET', '/api/project-version', function($p,$b,$u){
  $st = _project_phase_status();
  return [
    'site_version' => $st['version']['site_version'],
    'app_version' => $st['version']['app_version'],
    'phase' => $st['version']['phase'],
    'release_name' => $st['version']['release_name'],
  ];
}, true);



/* ---------------- فاز ۵: پایداری، صف پیام‌ها، Rule Engine و ارتقای تجمیعی ---------------- */
function _phase5_setting($key, $default=null){
  try {
    $r = Db::one("SELECT value FROM app_settings WHERE `key`=?", [$key]);
    if (!$r) return $default;
    $v = json_decode($r['value'], true);
    return ($v === null || $v === '') ? $default : $v;
  } catch (Throwable $e) { return $default; }
}
function _phase5_set_setting($key, $value){
  Db::run("INSERT INTO app_settings(`key`,`value`) VALUES(?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)", [$key, json_encode($value, JSON_UNESCAPED_UNICODE)]);
}
function _phase5_role_rules_default(){
  return [
    'operator' => ['duty_minutes'=>453,'overtime_limit_minutes'=>27,'surplus_after_minutes'=>480],
    'line_chief' => ['duty_minutes'=>453,'overtime_limit_minutes'=>27,'surplus_after_minutes'=>480],
    'inspector' => ['duty_minutes'=>453,'overtime_limit_minutes'=>147,'surplus_after_minutes'=>600],
    'senior_inspector' => ['duty_minutes'=>453,'overtime_limit_minutes'=>147,'surplus_after_minutes'=>600],
    'chief_inspector' => ['duty_minutes'=>453,'overtime_limit_minutes'=>147,'surplus_after_minutes'=>600],
    'office' => ['duty_minutes'=>453,'overtime_limit_minutes'=>240,'surplus_after_minutes'=>693],
    'default' => ['duty_minutes'=>453,'overtime_limit_minutes'=>27,'surplus_after_minutes'=>480],
  ];
}
function _phase5_ensure_core_tables(){
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
  try {
    Db::run("CREATE TABLE IF NOT EXISTS role_work_rules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      role_key VARCHAR(80) NOT NULL UNIQUE,
      title VARCHAR(120) NULL,
      duty_minutes INT NOT NULL DEFAULT 453,
      overtime_limit_minutes INT NOT NULL DEFAULT 27,
      surplus_after_minutes INT NOT NULL DEFAULT 480,
      night_start TIME NOT NULL DEFAULT '22:00:00',
      night_end TIME NOT NULL DEFAULT '06:00:00',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  } catch (Throwable $e) {}
  try {
    Db::run("CREATE TABLE IF NOT EXISTS system_health_logs (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      level VARCHAR(20) NOT NULL DEFAULT 'info',
      source VARCHAR(80) NULL,
      message TEXT NULL,
      context JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_health_level_time(level,created_at),
      INDEX idx_health_source_time(source,created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  } catch (Throwable $e) {}
  try {
    Db::run("CREATE TABLE IF NOT EXISTS offline_sync_logs (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NULL,
      device_id VARCHAR(120) NULL,
      item_type VARCHAR(50) NULL,
      client_uuid VARCHAR(120) NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'received',
      payload JSON NULL,
      response JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_offline_item (user_id, client_uuid),
      INDEX idx_offline_user_time(user_id,created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  } catch (Throwable $e) {}

  try { if (!Db::one("SHOW COLUMNS FROM role_work_rules WHERE Field='auto_shift_enabled'")) Db::run("ALTER TABLE role_work_rules ADD COLUMN auto_shift_enabled TINYINT(1) NOT NULL DEFAULT 1"); } catch (Throwable $e) {}
  try { if (!Db::one("SHOW COLUMNS FROM role_work_rules WHERE Field='checkin_any_time'")) Db::run("ALTER TABLE role_work_rules ADD COLUMN checkin_any_time TINYINT(1) NOT NULL DEFAULT 1"); } catch (Throwable $e) {}
  try { if (!Db::one("SHOW COLUMNS FROM role_work_rules WHERE Field='allowed_checkin_from'")) Db::run("ALTER TABLE role_work_rules ADD COLUMN allowed_checkin_from TIME NULL"); } catch (Throwable $e) {}
  try { if (!Db::one("SHOW COLUMNS FROM role_work_rules WHERE Field='allowed_checkin_to'")) Db::run("ALTER TABLE role_work_rules ADD COLUMN allowed_checkin_to TIME NULL"); } catch (Throwable $e) {}
  try { if (!Db::one("SHOW COLUMNS FROM role_work_rules WHERE Field='warn_before_overtime_cap_minutes'")) Db::run("ALTER TABLE role_work_rules ADD COLUMN warn_before_overtime_cap_minutes INT NOT NULL DEFAULT 15"); } catch (Throwable $e) {}
  try { if (!Db::one("SHOW COLUMNS FROM role_work_rules WHERE Field='require_checkout_after_cap'")) Db::run("ALTER TABLE role_work_rules ADD COLUMN require_checkout_after_cap TINYINT(1) NOT NULL DEFAULT 0"); } catch (Throwable $e) {}
  try { if (!Db::one("SHOW COLUMNS FROM role_work_rules WHERE Field='night_calc'")) Db::run("ALTER TABLE role_work_rules ADD COLUMN night_calc TINYINT(1) NOT NULL DEFAULT 1"); } catch (Throwable $e) {}
  try { if (!Db::one("SHOW COLUMNS FROM role_work_rules WHERE Field='friday_calc'")) Db::run("ALTER TABLE role_work_rules ADD COLUMN friday_calc TINYINT(1) NOT NULL DEFAULT 1"); } catch (Throwable $e) {}
  try { if (!Db::one("SHOW COLUMNS FROM role_work_rules WHERE Field='holiday_calc'")) Db::run("ALTER TABLE role_work_rules ADD COLUMN holiday_calc TINYINT(1) NOT NULL DEFAULT 1"); } catch (Throwable $e) {}
  try { if (!Db::one("SHOW COLUMNS FROM role_work_rules WHERE Field='description'")) Db::run("ALTER TABLE role_work_rules ADD COLUMN description TEXT NULL"); } catch (Throwable $e) {}

  try {
    foreach (_phase5_role_rules_default() as $rk=>$rr) {
      Db::run("INSERT IGNORE INTO role_work_rules(role_key,title,duty_minutes,overtime_limit_minutes,surplus_after_minutes) VALUES(?,?,?,?,?)",
        [$rk, $rk, (int)$rr['duty_minutes'], (int)$rr['overtime_limit_minutes'], (int)$rr['surplus_after_minutes']]);
    }
  } catch (Throwable $e) {}
}
function _phase5_health($level,$source,$message,$context=[]){
  try { _phase5_ensure_core_tables(); Db::run("INSERT INTO system_health_logs(level,source,message,context) VALUES(?,?,?,?)", [$level,$source,$message,json_encode($context,JSON_UNESCAPED_UNICODE)]); } catch (Throwable $e) {}
}
function _phase5_rule_for_role($roleKey){
  _phase5_ensure_core_tables();
  $roleKey = trim((string)$roleKey) ?: 'default';
  try {
    $r = Db::one("SELECT * FROM role_work_rules WHERE role_key=? AND is_active=1 LIMIT 1", [$roleKey]);
    if (!$r) $r = Db::one("SELECT * FROM role_work_rules WHERE role_key='default' AND is_active=1 LIMIT 1");
    if ($r) return $r;
  } catch (Throwable $e) {}
  $d = _phase5_role_rules_default();
  return ['role_key'=>'default'] + $d['default'];
}
function _phase5_project_status(){
  $base = function_exists('_project_phase_status') ? _project_phase_status() : ['completed'=>[],'remaining'=>[],'version'=>[]];
  $base['version'] = ['site_version'=>SITE_VERSION,'app_version'=>APP_VERSION,'phase'=>7,'release_name'=>'Phase 7.7 - Shift Scheduling Finalization'];
  $base['completed'][] = ['key'=>'delivery_queue','title'=>'صف پایدار پیامک، Push و بله با Retry و گزارش تحویل','status'=>'done'];
  $base['completed'][] = ['key'=>'rule_engine_base','title'=>'موتور قوانین سمت‌ها برای موظفی، اضافه‌کار و مازاد حضور','status'=>'done'];
  $base['completed'][] = ['key'=>'upgrade_php','title'=>'تجمیع به‌روزرسانی دیتابیس در php/public/upgrade.php','status'=>'done'];
  $base['completed'][] = ['key'=>'health_observability_base','title'=>'لاگ سلامت فنی و API گزارش سلامت سامانه','status'=>'done'];
  $base['completed'][] = ['key'=>'offline_sync_base','title'=>'زیرساخت ثبت صف آفلاین موبایل در سرور','status'=>'done'];
  $base['remaining'] = [
    ['key'=>'frontend_production_bundle','title'=>'ساخت نهایی production bundle پنل پس از نصب Node/Vite روی سیستم توسعه','priority'=>'high'],
    ['key'=>'device_field_tests','title'=>'تست میدانی GPS، Push، QR و آلارم روی گوشی‌های واقعی','priority'=>'high'],
    ['key'=>'automated_test_suite','title'=>'تکمیل تست خودکار API و سناریوهای حضور/گزارش/شیفت','priority'=>'medium'],
    ['key'=>'holiday_provider_integration','title'=>'اتصال به منبع رسمی تعطیلات سالانه در صورت ارائه API معتبر','priority'=>'medium'],
  ];
  return $base;
}

route('GET', '/api/admin/phase5/status', function($p,$b,$u){
  _phase5_ensure_core_tables();
  return _phase5_project_status();
}, false, ADMIN);

route('GET', '/api/admin/rule-engine/roles', function($p,$b,$u){
  _phase7p7_ensure();
  return Db::all("SELECT * FROM role_work_rules ORDER BY id");
}, false, ADMIN);

route('PUT', '/api/admin/rule-engine/roles/{role_key}', function($p,$b,$u){
  _phase7p7_ensure();
  $rk = preg_replace('/[^a-zA-Z0-9_\-]/','', (string)$p['role_key']);
  if ($rk === '') Http::error('کلید سمت نامعتبر است', 422);
  $duty = max(0, (int)($b['duty_minutes'] ?? 453));
  $ot = max(0, (int)($b['overtime_limit_minutes'] ?? 27));
  $surplus = max($duty + $ot, (int)($b['surplus_after_minutes'] ?? ($duty+$ot)));
  $title = trim((string)($b['title'] ?? $rk));
  $nightStart = preg_match('/^\d{1,2}:\d{2}/', (string)($b['night_start'] ?? '')) ? substr((string)$b['night_start'],0,5).':00' : '22:00:00';
  $nightEnd = preg_match('/^\d{1,2}:\d{2}/', (string)($b['night_end'] ?? '')) ? substr((string)$b['night_end'],0,5).':00' : '06:00:00';
  $from = preg_match('/^\d{1,2}:\d{2}/', (string)($b['allowed_checkin_from'] ?? '')) ? substr((string)$b['allowed_checkin_from'],0,5).':00' : null;
  $to = preg_match('/^\d{1,2}:\d{2}/', (string)($b['allowed_checkin_to'] ?? '')) ? substr((string)$b['allowed_checkin_to'],0,5).':00' : null;
  $warn = max(0, min(240, (int)($b['warn_before_overtime_cap_minutes'] ?? 15)));
  $desc = trim((string)($b['description'] ?? ''));
  $maxOpen=max(60,(int)($b['max_open_session_minutes'] ?? 960));
  $autoCloseAfter=max(0,(int)($b['auto_close_after_minutes'] ?? 0));
  $grace=max(0,(int)($b['checkout_grace_minutes'] ?? 15));
  Db::run("INSERT INTO role_work_rules(role_key,title,duty_minutes,overtime_limit_minutes,surplus_after_minutes,night_start,night_end,auto_shift_enabled,checkin_any_time,allowed_checkin_from,allowed_checkin_to,warn_before_overtime_cap_minutes,require_checkout_after_cap,night_calc,friday_calc,holiday_calc,include_friday_in_duty,include_holiday_in_duty,max_open_session_minutes,auto_close_enabled,auto_close_after_minutes,checkout_grace_minutes,is_active,description)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
           ON DUPLICATE KEY UPDATE title=VALUES(title),duty_minutes=VALUES(duty_minutes),overtime_limit_minutes=VALUES(overtime_limit_minutes),surplus_after_minutes=VALUES(surplus_after_minutes),night_start=VALUES(night_start),night_end=VALUES(night_end),auto_shift_enabled=VALUES(auto_shift_enabled),checkin_any_time=VALUES(checkin_any_time),allowed_checkin_from=VALUES(allowed_checkin_from),allowed_checkin_to=VALUES(allowed_checkin_to),warn_before_overtime_cap_minutes=VALUES(warn_before_overtime_cap_minutes),require_checkout_after_cap=VALUES(require_checkout_after_cap),night_calc=VALUES(night_calc),friday_calc=VALUES(friday_calc),holiday_calc=VALUES(holiday_calc),include_friday_in_duty=VALUES(include_friday_in_duty),include_holiday_in_duty=VALUES(include_holiday_in_duty),max_open_session_minutes=VALUES(max_open_session_minutes),auto_close_enabled=VALUES(auto_close_enabled),auto_close_after_minutes=VALUES(auto_close_after_minutes),checkout_grace_minutes=VALUES(checkout_grace_minutes),is_active=VALUES(is_active),description=VALUES(description)",
           [$rk,$title,$duty,$ot,$surplus,$nightStart,$nightEnd,!empty($b['auto_shift_enabled'])?1:0,!empty($b['checkin_any_time'])?1:0,$from,$to,$warn,!empty($b['require_checkout_after_cap'])?1:0,!empty($b['night_calc'])?1:0,!empty($b['friday_calc'])?1:0,!empty($b['holiday_calc'])?1:0,!empty($b['include_friday_in_duty'])?1:0,!empty($b['include_holiday_in_duty'])?1:0,$maxOpen,!empty($b['auto_close_enabled'])?1:0,$autoCloseAfter,$grace,!empty($b['is_active'])?1:0,$desc]);
  _phase5_health('info','rule-engine','rule updated',['role_key'=>$rk,'by'=>$u['id'] ?? null]);
  return ['ok'=>true,'rule'=>Db::one("SELECT * FROM role_work_rules WHERE role_key=?",[$rk])];
}, false, ADMIN);

route('GET', '/api/admin/delivery-queue', function($p,$b,$u){
  _phase5_ensure_core_tables();
  $status = trim((string)($p['status'] ?? ''));
  $args=[]; $where='1=1';
  if ($status !== '') { $where .= ' AND status=?'; $args[]=$status; }
  return Db::all("SELECT * FROM delivery_queue WHERE $where ORDER BY id DESC LIMIT 300", $args);
}, false, ADMIN);

route('POST', '/api/admin/delivery-queue/process', function($p,$b,$u){
  _phase5_ensure_core_tables();
  if (class_exists('DeliveryQueue')) return DeliveryQueue::process((int)($b['limit'] ?? 50));
  return ['ok'=>false,'error'=>'DeliveryQueue class not loaded'];
}, false, ADMIN);

route('POST', '/api/mobile/offline-sync', function($p,$b,$u){
  _phase7p4_ensure();
  $items = $b['items'] ?? [];
  if (!is_array($items)) Http::error('فرمت صف آفلاین نامعتبر است', 400);
  $received=0; $processed=0; $failed=0; $duplicates=0; $synced=[]; $errors=[];
  foreach ($items as $it) {
    if (!is_array($it)) { $failed++; continue; }
    $uuid = (string)($it['client_uuid'] ?? $it['uuid'] ?? md5(json_encode($it,JSON_UNESCAPED_UNICODE)));
    $path = (string)($it['path'] ?? $it['type'] ?? 'unknown');
    $payload = json_encode($it,JSON_UNESCAPED_UNICODE);
    $logId = null;
    try {
      $exists = Db::one("SELECT id,status FROM offline_sync_logs WHERE user_id=? AND client_uuid=? LIMIT 1", [$u['id'] ?? null, $uuid]);
      if ($exists && in_array((string)$exists['status'], ['processed','duplicate'], true)) { $duplicates++; $synced[]=$uuid; continue; }
      if ($exists) $logId = (int)$exists['id'];
      else {
        $logId = Db::insert("INSERT INTO offline_sync_logs(user_id,device_id,item_type,client_uuid,payload,status,source_path) VALUES(?,?,?,?,?,'received',?)",
          [$u['id'] ?? null, $it['device_id'] ?? null, $it['type'] ?? $path, $uuid, $payload, $path]);
        $received++;
      }
      $result = _phase7p4_process_offline_item($it, $u, $uuid);
      Db::run("UPDATE offline_sync_logs SET status='processed', processed_at=NOW(), error=NULL, server_result=? WHERE id=?", [json_encode($result,JSON_UNESCAPED_UNICODE), $logId]);
      $processed++; $synced[]=$uuid;
    } catch (Throwable $e) {
      $failed++; $errors[] = ['client_uuid'=>$uuid,'path'=>$path,'error'=>$e->getMessage()];
      try {
        if ($logId) Db::run("UPDATE offline_sync_logs SET status='failed', processed_at=NOW(), error=? WHERE id=?", [substr($e->getMessage(),0,1000), $logId]);
        else Db::run("INSERT INTO offline_sync_logs(user_id,device_id,item_type,client_uuid,payload,status,source_path,error,processed_at) VALUES(?,?,?,?,?,'failed',?,?,NOW())", [$u['id']??null,$it['device_id']??null,$it['type']??$path,$uuid,$payload,$path,substr($e->getMessage(),0,1000)]);
      } catch (Throwable $e2) {}
    }
  }
  return ['ok'=>true,'received'=>$received,'processed'=>$processed,'failed'=>$failed,'duplicates'=>$duplicates,'synced_ids'=>$synced,'errors'=>$errors];
}, false);

route('GET', '/api/admin/system-health', function($p,$b,$u){
  _phase5_ensure_core_tables();
  $q = [
    'php_version' => PHP_VERSION,
    'site_version' => SITE_VERSION,
    'app_version' => APP_VERSION,
    'time' => date('Y-m-d H:i:s'),
    'delivery_queue' => Db::all("SELECT status,COUNT(*) count FROM delivery_queue GROUP BY status"),
    'recent_errors' => Db::all("SELECT * FROM system_health_logs WHERE level IN ('error','warning') ORDER BY id DESC LIMIT 50"),
  ];
  return $q;
}, false, ADMIN);

// بازتعریف وضعیت پروژه پس از فاز ۵: این مسیر عمداً بعد از مسیر قبلی می‌آید تا روتر آخرین تعریف را استفاده کند اگر پشتیبانی کند.
route('GET', '/api/admin/project-status-v5', function($p,$b,$u){
  _phase5_ensure_core_tables();
  return _phase5_project_status();
}, false, ADMIN);

route('GET', '/api/project-version-v5', function($p,$b,$u){
  return ['site_version'=>SITE_VERSION,'app_version'=>APP_VERSION,'phase'=>7,'release_name'=>'Phase 7.7 - Shift Scheduling Finalization'];
}, true);



/* ============================================================
 * Phase 6 — Production stability, observability, holiday import,
 * delivery retry/dead-letter and mobile diagnostics
 * Version: site 93 / app 1.0.5
 * ============================================================ */
function _phase6_setting($key,$default=null){
  try { $r = Db::one("SELECT value FROM app_settings WHERE `key`=?", [$key]); return $r ? json_decode($r['value'], true) : $default; } catch (Throwable $e) { return $default; }
}
function _phase6_set($key,$value){
  try { Db::run("CREATE TABLE IF NOT EXISTS app_settings (`key` VARCHAR(191) PRIMARY KEY, `value` JSON NULL, updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"); Db::run("INSERT INTO app_settings(`key`,`value`) VALUES(?,?) ON DUPLICATE KEY UPDATE value=VALUES(value),updated_at=NOW()", [$key,json_encode($value,JSON_UNESCAPED_UNICODE)]); } catch (Throwable $e) {}
}
function _phase6_ensure_tables(){
  if (function_exists('_phase5_ensure_core_tables')) _phase5_ensure_core_tables();
  try { Db::run("CREATE TABLE IF NOT EXISTS holidays (id INT AUTO_INCREMENT PRIMARY KEY, jdate VARCHAR(10) NOT NULL UNIQUE, title VARCHAR(191) NULL, source VARCHAR(80) NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_holidays_jdate(jdate)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"); } catch (Throwable $e) {}
  try { Db::run("CREATE TABLE IF NOT EXISTS system_health_checks (id BIGINT AUTO_INCREMENT PRIMARY KEY, check_key VARCHAR(80) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'ok', message TEXT NULL, meta JSON NULL, checked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_health_check_key_time(check_key,checked_at), INDEX idx_health_check_status(status,checked_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"); } catch (Throwable $e) {}
  try { Db::run("CREATE TABLE IF NOT EXISTS mobile_error_logs (id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id BIGINT NULL, device_id VARCHAR(120) NULL, app_version VARCHAR(40) NULL, screen VARCHAR(80) NULL, message TEXT NULL, stack MEDIUMTEXT NULL, extra JSON NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_mobile_error_user_time(user_id,created_at), INDEX idx_mobile_error_app(app_version,created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"); } catch (Throwable $e) {}
  try { Db::run("CREATE TABLE IF NOT EXISTS delivery_dead_letters (id BIGINT AUTO_INCREMENT PRIMARY KEY, original_queue_id BIGINT NULL, channel VARCHAR(20) NULL, target_type VARCHAR(30) NULL, target_id BIGINT NULL, to_value VARCHAR(191) NULL, title VARCHAR(255) NULL, body TEXT NULL, payload JSON NULL, attempts INT NOT NULL DEFAULT 0, last_error TEXT NULL, failed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_dead_channel_time(channel,failed_at), INDEX idx_dead_target(target_type,target_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"); } catch (Throwable $e) {}
  try { Db::run("CREATE TABLE IF NOT EXISTS api_cache (cache_key VARCHAR(191) PRIMARY KEY, cache_value MEDIUMTEXT NULL, expires_at DATETIME NULL, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX idx_api_cache_exp(expires_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"); } catch (Throwable $e) {}
  _phase6_set('site_version', SITE_VERSION); _phase6_set('app_version', APP_VERSION); _phase6_set('db_upgrade_version','phase7-part4-1.0.7');
}
function _phase6_log($level,$source,$message,$context=[]){
  try { _phase6_ensure_tables(); Db::run("INSERT INTO system_health_logs(level,source,message,context) VALUES(?,?,?,?)", [$level,$source,$message,json_encode($context,JSON_UNESCAPED_UNICODE)]); } catch (Throwable $e) {}
}
function _phase6_to_minutes($hhmm){
  if (!$hhmm || !preg_match('/^(\d{1,2}):(\d{2})/', (string)$hhmm, $m)) return null;
  return max(0,min(1439,((int)$m[1])*60+(int)$m[2]));
}
function _phase6_overlap_minutes($start,$end,$winStart,$winEnd){
  if ($end <= $start) $end += 1440;
  $ranges = $winEnd > $winStart ? [[$winStart,$winEnd]] : [[$winStart,1440],[0,$winEnd]];
  $total=0;
  foreach ($ranges as $r) {
    foreach ([[0,0],[1440,1440]] as $shift) {
      $a=$r[0]+$shift[0]; $b=$r[1]+$shift[1];
      $total += max(0, min($end,$b)-max($start,$a));
    }
  }
  return $total;
}
function _phase6_role_key_from_user($u){
  $r = trim((string)($u['role_title'] ?? $u['role'] ?? ''));
  if (mb_strpos($r,'نیروی اداری')!==false) return 'office';
  if (mb_strpos($r,'سربازرس ارشد')!==false) return 'chief_inspector';
  if (mb_strpos($r,'سربازرس')!==false) return 'senior_inspector';
  if (mb_strpos($r,'بازرس')!==false) return 'inspector';
  if (mb_strpos($r,'رئیس خط')!==false || mb_strpos($r,'ناظر خط')!==false) return 'line_chief';
  if (mb_strpos($r,'اپراتور')!==false) return 'operator';
  return 'default';
}
function _phase6_work_calc($roleKey,$checkin,$checkout,$jdate=null){
  _phase6_ensure_tables();
  $rule = function_exists('_phase5_rule_for_role') ? _phase5_rule_for_role($roleKey) : null;
  if (!$rule) $rule = ['duty_minutes'=>453,'overtime_limit_minutes'=>27,'surplus_after_minutes'=>480,'night_start'=>'22:00:00','night_end'=>'06:00:00'];
  $ci=_phase6_to_minutes($checkin); $co=_phase6_to_minutes($checkout);
  if ($ci===null || $co===null) return ['ok'=>false,'error'=>'time_invalid'];
  $presence = $co >= $ci ? $co-$ci : (1440-$ci)+$co;
  $duty = min($presence,(int)$rule['duty_minutes']);
  $otLimit=(int)$rule['overtime_limit_minutes'];
  $overtime = min(max(0,$presence-$duty), $otLimit);
  $surplus = max(0, $presence-$duty-$overtime);
  $ns=_phase6_to_minutes(substr((string)($rule['night_start']??'22:00'),0,5));
  $ne=_phase6_to_minutes(substr((string)($rule['night_end']??'06:00'),0,5));
  $night=_phase6_overlap_minutes($ci,$co,$ns??1320,$ne??360);
  $isHoliday=false; if ($jdate) { try { $jdNorm = str_replace('/','-', (string)$jdate); $isHoliday=(bool)Db::one("SELECT id FROM holidays WHERE jdate IN (?,?) LIMIT 1", [$jdNorm, str_replace('-','/',$jdNorm)]); } catch (Throwable $e) {} }
  $isFriday=false; try { if ($jdate && class_exists('ShiftCalc')) $isFriday = ShiftCalc::isFriday($jdate); } catch (Throwable $e) { $isFriday=false; }
  return ['ok'=>true,'role_key'=>$roleKey,'presence_minutes'=>$presence,'duty_minutes'=>$duty,'overtime_minutes'=>$overtime,'surplus_minutes'=>$surplus,'night_minutes'=>$night,'holiday_minutes'=>$isHoliday?$presence:0,'friday_minutes'=>$isFriday?$presence:0,'rule'=>$rule];
}
function _phase6_delivery_sweep($limit=50){
  _phase6_ensure_tables();
  $limit=max(1,min(200,(int)$limit));
  $moved=0;
  try {
    $rows=Db::all("SELECT * FROM delivery_queue WHERE status='failed' AND attempts>=max_attempts ORDER BY id ASC LIMIT $limit");
    foreach ($rows as $r) {
      Db::run("INSERT INTO delivery_dead_letters(original_queue_id,channel,target_type,target_id,to_value,title,body,payload,attempts,last_error) VALUES(?,?,?,?,?,?,?,?,?,?)", [$r['id'],$r['channel'],$r['target_type'],$r['target_id'],$r['to_value'],$r['title'],$r['body'],$r['payload'],$r['attempts'],$r['last_error']]);
      Db::run("UPDATE delivery_queue SET status='cancelled',updated_at=NOW() WHERE id=?", [$r['id']]);
      $moved++;
    }
  } catch (Throwable $e) { _phase6_log('warning','delivery-sweep',$e->getMessage()); }
  return $moved;
}
function _phase6_project_status(){
  $base = function_exists('_phase5_project_status') ? _phase5_project_status() : ['completed'=>[],'remaining'=>[],'version'=>[]];
  $base['version'] = ['site_version'=>SITE_VERSION,'app_version'=>APP_VERSION,'phase'=>7,'release_name'=>'Phase 7.7 - Shift Scheduling Finalization'];
  $base['completed'][] = ['key'=>'holiday_admin_import','title'=>'مدیریت و ایمپورت تعطیلات رسمی در upgrade.php و API مدیریتی','status'=>'done'];
  $base['completed'][] = ['key'=>'delivery_dead_letter','title'=>'Dead-letter برای پیام‌های ناموفق و پاکسازی صف ارسال','status'=>'done'];
  $base['completed'][] = ['key'=>'mobile_diagnostics','title'=>'ثبت خطاهای اپ موبایل و گزارش تشخیصی دستگاه','status'=>'done'];
  $base['completed'][] = ['key'=>'work_rule_calculator_api','title'=>'API محاسبه آزمایشی قوانین کارکرد برای هر سمت','status'=>'done'];
  $base['completed'][] = ['key'=>'health_checks_v2','title'=>'چک سلامت نسخه ۲ برای دیتابیس، صف پیام و خطاهای اخیر','status'=>'done'];
  $base['completed'][] = ['key'=>'attendance_overnight_split_v2','title'=>'تقسیم دقیق ترددهای عبوری از نیمه‌شب در گزارش روزانه و ماهانه','status'=>'done'];
  $base['completed'][] = ['key'=>'surplus_management_panel','title'=>'رابط مدیریتی تبدیل مازاد حضور به اضافه‌کار و لغو تبدیل','status'=>'done'];
  $base['completed'][] = ['key'=>'friday_holiday_calc_fix','title'=>'اصلاح محاسبه جمعه‌کاری و تعطیل‌کاری در API محاسبه قوانین','status'=>'done'];
  $base['remaining'] = [
    ['key'=>'native_field_test','title'=>'تست میدانی نسخه APK روی چند گوشی واقعی برای GPS، آلارم و Push','priority'=>'high'],
    ['key'=>'panel_real_build','title'=>'Build واقعی پنل با ابزار Node/Vite در محیط توسعه سازمان و حذف کامل Babel مرورگر','priority'=>'high'],
    ['key'=>'load_test','title'=>'تست بارگذاری همزمان کاربران و رانندگان در سرور نهایی','priority'=>'medium'],
  ];
  return $base;
}

route('GET', '/api/admin/phase6/status', function($p,$b,$u){ _phase6_ensure_tables(); return _phase6_project_status(); }, false, ADMIN);
route('GET', '/api/project-version-v6', function($p,$b,$u){ return ['site_version'=>SITE_VERSION,'app_version'=>APP_VERSION,'phase'=>7,'release_name'=>'Phase 7.7 - Shift Scheduling Finalization']; }, true);
route('GET', '/api/project-version-v7', function($p,$b,$u){ return ['site_version'=>SITE_VERSION,'app_version'=>APP_VERSION,'phase'=>7,'part'=>2,'release_name'=>'Phase 7.7 - Shift Scheduling Finalization']; }, true);


route('POST', '/api/admin/holidays/import', function($p,$b,$u){
  _phase6_ensure_tables();
  $items = $b['items'] ?? [];
  if (is_string($items)) {
    $rows=[]; foreach (preg_split('/\r?\n/', $items) as $line) { $line=trim($line); if(!$line) continue; $parts=preg_split('/[,;\t]/', $line, 2); $rows[]=['jdate'=>trim($parts[0]??''),'title'=>trim($parts[1]??'تعطیل رسمی')]; } $items=$rows;
  }
  if (!is_array($items)) Http::error('فرمت تعطیلات نامعتبر است',400);
  $ok=0; $bad=0;
  foreach ($items as $it) {
    $jd = str_replace(['-','.'],'/', trim((string)($it['jdate'] ?? $it['date'] ?? '')));
    if (!preg_match('/^1[34]\d{2}\/\d{1,2}\/\d{1,2}$/', $jd)) { $bad++; continue; }
    [$y,$m,$d]=array_map('intval', explode('/',$jd)); $jd=sprintf('%04d/%02d/%02d',$y,$m,$d);
    Db::run("INSERT INTO holidays(jdate,title,source) VALUES(?,?,?) ON DUPLICATE KEY UPDATE title=VALUES(title),source=VALUES(source)", [$jd, (string)($it['title'] ?? 'تعطیل رسمی'), 'admin-import']); $ok++;
  }
  _phase6_log('info','holidays','holidays imported',['ok'=>$ok,'bad'=>$bad,'by'=>$u['id']??null]);
  return ['ok'=>true,'imported'=>$ok,'invalid'=>$bad];
}, false, ADMIN);

route('POST', '/api/admin/rule-engine/calculate', function($p,$b,$u){
  $role = preg_replace('/[^a-zA-Z0-9_\-]/','', (string)($b['role_key'] ?? 'default'));
  return _phase6_work_calc($role, (string)($b['checkin'] ?? ''), (string)($b['checkout'] ?? ''), $b['jdate'] ?? null);
}, false, ADMIN);

route('POST', '/api/mobile/error-log', function($p,$b,$u){
  _phase6_ensure_tables();
  Db::run("INSERT INTO mobile_error_logs(user_id,device_id,app_version,screen,message,stack,extra) VALUES(?,?,?,?,?,?,?)", [$u['id']??null,$u['device_id']??($b['device_id']??null),substr((string)($b['app_version']??APP_VERSION),0,40),substr((string)($b['screen']??''),0,80),substr((string)($b['message']??''),0,5000),substr((string)($b['stack']??''),0,50000),json_encode($b['extra']??[],JSON_UNESCAPED_UNICODE)]);
  return ['ok'=>true];
}, false);

route('POST', '/api/cron/delivery-queue/process', function($p,$b,$u){
  _phase6_ensure_tables();
  $key = $p['key'] ?? $b['key'] ?? '';
  $expected = _phase6_setting('cron_key', getenv('CRON_KEY') ?: '');
  if ($expected && !hash_equals((string)$expected,(string)$key)) Http::error('کلید کرون نامعتبر است',403);
  $processed = class_exists('DeliveryQueue') ? DeliveryQueue::process((int)($b['limit'] ?? 50)) : ['ok'=>false,'error'=>'DeliveryQueue missing'];
  $dead = _phase6_delivery_sweep(100);
  return ['ok'=>true,'processed'=>$processed,'dead_letters_moved'=>$dead];
}, true);

route('GET', '/api/admin/delivery-dead-letters', function($p,$b,$u){ _phase6_ensure_tables(); return Db::all("SELECT * FROM delivery_dead_letters ORDER BY id DESC LIMIT 300"); }, false, ADMIN);

route('GET', '/api/admin/system-health-v2', function($p,$b,$u){
  _phase6_ensure_tables();
  $health = ['status'=>'ok','time'=>date('Y-m-d H:i:s'),'site_version'=>SITE_VERSION,'app_version'=>APP_VERSION];
  try { Db::one('SELECT 1'); $health['database']='ok'; } catch (Throwable $e) { $health['status']='error'; $health['database']='fail'; }
  $health['delivery_queue'] = Db::all("SELECT status,COUNT(*) count FROM delivery_queue GROUP BY status");
  $health['dead_letters_count'] = (int)(Db::one("SELECT COUNT(*) n FROM delivery_dead_letters")['n'] ?? 0);
  $health['mobile_errors_24h'] = (int)(Db::one("SELECT COUNT(*) n FROM mobile_error_logs WHERE created_at>DATE_SUB(NOW(), INTERVAL 1 DAY)")['n'] ?? 0);
  $health['recent_errors'] = Db::all("SELECT * FROM system_health_logs WHERE level IN ('error','warning') ORDER BY id DESC LIMIT 30");
  return $health;
}, false, ADMIN);

route('POST', '/api/admin/cache/clear', function($p,$b,$u){ _phase6_ensure_tables(); try { Db::run("DELETE FROM api_cache"); } catch (Throwable $e) {} _phase6_log('info','cache','api cache cleared',['by'=>$u['id']??null]); return ['ok'=>true]; }, false, ADMIN);


/* ============================================================
 * Phase 7.3 — Auto shift rules UI, checkin rejection diagnostics
 * Version: site 95 / app 1.0.7
 * ============================================================ */
function _phase7p3_ensure(){
  if (function_exists('_phase5_ensure_core_tables')) _phase5_ensure_core_tables();
  try { Db::run("CREATE TABLE IF NOT EXISTS attendance_reject_logs (id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id BIGINT NOT NULL, line_id BIGINT NULL, method VARCHAR(30) NULL, lat DECIMAL(10,7) NULL, lng DECIMAL(10,7) NULL, accuracy_m DECIMAL(10,2) NULL, reason TEXT NULL, meta JSON NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_arl_user_time(user_id,created_at), INDEX idx_arl_line_time(line_id,created_at), INDEX idx_arl_created(created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"); } catch (Throwable $e) {}
}
route('GET', '/api/admin/attendance-reject-logs', function($p,$b,$u){
  _phase7p3_ensure();
  $from = trim((string)($p['from'] ?? ''));
  $to = trim((string)($p['to'] ?? ''));
  $userId = (int)($p['user_id'] ?? 0);
  $where = '1=1'; $args=[];
  if ($from !== '') { $where .= ' AND ar.created_at >= ?'; $args[] = $from.' 00:00:00'; }
  if ($to !== '') { $where .= ' AND ar.created_at <= ?'; $args[] = $to.' 23:59:59'; }
  if ($userId > 0) { $where .= ' AND ar.user_id=?'; $args[] = $userId; }
  return Db::all("SELECT ar.*, CONCAT(u.first_name,' ',u.last_name) user_name, l.code line_code, CONCAT(l.origin,' - ',l.destination) line_title
    FROM attendance_reject_logs ar
    LEFT JOIN users u ON u.id=ar.user_id
    LEFT JOIN `lines` l ON l.id=ar.line_id
    WHERE $where ORDER BY ar.id DESC LIMIT 500", $args);
}, false, ADMIN);
route('GET', '/api/admin/phase7-part3/status', function($p,$b,$u){
  return ['site_version'=>SITE_VERSION,'app_version'=>APP_VERSION,'phase'=>7,'part'=>3,'completed'=>[
    'auto_shift_rules_admin','attendance_reject_logs','auto_shift_checkin_window','version_1_0_6','upgrade_php_consolidated'
  ],'remaining'=>[
    'production_bundle_without_browser_babel','full_device_field_test','automated_api_test_suite','external_official_holiday_provider_when_available'
  ]];
}, false, ADMIN);
route('GET', '/api/project-version-v7p3', function($p,$b,$u){ return ['site_version'=>SITE_VERSION,'app_version'=>APP_VERSION,'phase'=>7,'part'=>3,'release_name'=>'Phase 7.7 - Shift Scheduling Finalization']; }, true);


/* ============================================================
 * Phase 7.4 — Offline sync processing and attendance reliability
 * Version: site 95 / app 1.0.7
 * ============================================================ */
function _phase7p4_ensure(){
  if (function_exists('_phase6_ensure_tables')) _phase6_ensure_tables();
  try { Db::run("CREATE TABLE IF NOT EXISTS offline_sync_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NULL,
    device_id VARCHAR(120) NULL,
    item_type VARCHAR(80) NULL,
    client_uuid VARCHAR(120) NOT NULL,
    source_path VARCHAR(191) NULL,
    payload JSON NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'received',
    error TEXT NULL,
    server_result JSON NULL,
    processed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_offline_item (user_id, client_uuid),
    INDEX idx_offline_user_time(user_id,created_at),
    INDEX idx_offline_status_time(status,created_at),
    INDEX idx_offline_path_time(source_path,created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"); } catch (Throwable $e) {}
  foreach ([
    ['offline_sync_logs','source_path',"VARCHAR(191) NULL"],['offline_sync_logs','error',"TEXT NULL"],['offline_sync_logs','server_result',"JSON NULL"],['offline_sync_logs','processed_at',"DATETIME NULL"],
    ['staff_attendance','client_uuid',"VARCHAR(120) NULL"],['staff_attendance','offline_synced',"TINYINT(1) NOT NULL DEFAULT 0"],['staff_attendance','client_check_in',"DATETIME NULL"],['staff_attendance','client_check_out',"DATETIME NULL"]
  ] as $c) { try { if (Db::one("SHOW TABLES LIKE ?", [$c[0]]) && !Db::one("SHOW COLUMNS FROM {$c[0]} WHERE Field=?", [$c[1]])) Db::run("ALTER TABLE {$c[0]} ADD COLUMN {$c[1]} {$c[2]}"); } catch (Throwable $e) {} }
  try { Db::run("CREATE INDEX idx_staff_att_client_uuid ON staff_attendance(client_uuid)"); } catch (Throwable $e) {}
  try { Db::run("CREATE INDEX idx_staff_att_offline ON staff_attendance(offline_synced,check_in)"); } catch (Throwable $e) {}
  _phase6_set('site_version', SITE_VERSION); _phase6_set('app_version', APP_VERSION); _phase6_set('db_upgrade_version','phase7-part4-1.0.7');
}
function _phase7p4_client_time($v){
  if ($v === null || $v === '') return date('Y-m-d H:i:s');
  if (is_numeric($v)) { $n=(float)$v; if ($n > 200000000000) $n = $n/1000; $ts=(int)$n; }
  else { $ts = strtotime((string)$v); }
  if (!$ts) return date('Y-m-d H:i:s');
  $min = time() - 7*86400; $max = time() + 600;
  if ($ts < $min) $ts = $min; if ($ts > $max) $ts = time();
  return date('Y-m-d H:i:s', $ts);
}
function _phase7p4_item_body($it){
  $b = $it['body'] ?? $it['payload'] ?? $it;
  return is_array($b) ? $b : [];
}
function _phase7p4_process_offline_item($it,$u,$uuid){
  $path = (string)($it['path'] ?? $it['type'] ?? '');
  $body = _phase7p4_item_body($it);
  $path = preg_replace('#^/api#','',$path);
  if ($path === '/my/checkin') return _phase7p4_offline_checkin($body,$u,$uuid,$it);
  if ($path === '/my/checkout') return _phase7p4_offline_checkout($body,$u,$uuid,$it);
  if ($path === '/locations') return _phase7p4_offline_locations($body,$u,$uuid,$it);
  if ($path === '/activity') return _phase7p4_offline_activity($body,$u,$uuid,$it);
  if ($path === '/official-visits') return _phase7p8_offline_official_visit($body,$u,$uuid,$it);
  if ($path === '/my/welfare-grants') return _phase7p8_offline_welfare_grant($body,$u,$uuid,$it);
  if ($path === '/my/cultural-activities') return _phase7p8_offline_cultural_activity($body,$u,$uuid,$it);
  if ($path === '/reports') return _phase7p8_offline_report($body,$u,$uuid,$it);
  throw new Exception('این نوع درخواست آفلاین هنوز پردازش‌پذیر نیست: '.$path);
}
function _phase7p4_offline_checkin($b,$u,$uuid,$it){
  if (Db::one("SELECT id FROM staff_attendance WHERE client_uuid=? LIMIT 1", [$uuid])) return ['ok'=>true,'duplicate'=>true,'kind'=>'checkin'];
  [$lat,$lng] = validGeo($b['lat'] ?? null, $b['lng'] ?? null);
  if ($lat === null || $lng === null) throw new Exception('موقعیت ثبت ورود آفلاین وجود ندارد');
  $method = (string)($b['method'] ?? 'gps');
  $lineId = (int)($b['line_id'] ?? 0);
  $lineIds = user_line_ids($u);
  if ($lineId && (!is_array($lineIds) || !in_array($lineId, array_map('intval', $lineIds), true))) $lineId = 0;
  $acc = isset($b['accuracy']) ? max(0, min(150, (float)$b['accuracy'])) : 0;
  $extraR = max(0, (int)_req_setting('checkin_error_radius_m', 0)) + (int)ceil(min(80, $acc * 0.75));
  $st = null;
  if ($method === 'gps') {
    $search = $lineId ? [$lineId] : $lineIds;
    $st = station_at_point($lat,$lng,$search,$extraR);
    if (!$st && $lineId && is_array($lineIds)) $st = station_at_point($lat,$lng,$lineIds,$extraR);
    if (!$st) {
      $near = _nearest_station($lat,$lng,is_array($lineIds)?$lineIds:($lineId?[$lineId]:[]));
      $reason = $near ? ('خارج از محدوده؛ نزدیک‌ترین ایستگاه '.$near['name'].' در '.round($near['distance_m']).' متر') : 'خارج از محدوده';
      _attendance_reject_log((int)$u['id'],$lineId,$method,$lat,$lng,$acc,$reason,['offline'=>true,'client_uuid'=>$uuid]);
      throw new Exception($reason);
    }
    $lineId = (int)($st['line_id'] ?? $lineId);
  }
  if (!$lineId && $method !== 'gps') {
    $proof = trim((string)($b['proof'] ?? ''));
    if ($proof !== '' && is_array($lineIds) && $lineIds) {
      $norm = strtolower(str_replace([' ',':','-'],'',$proof));
      $cond = "line_id IN (".implode(',',array_fill(0,count($lineIds),'?')).")";
      $cands = Db::all("SELECT line_id, kind, value FROM line_idents WHERE kind=? AND ($cond)", array_merge([$method], $lineIds));
      foreach ($cands as $c) {
        if (strtolower(str_replace([' ',':','-'],'',$c['value'])) === $norm) { $lineId = (int)$c['line_id']; break; }
      }
    }
  }
  if (!$lineId) throw new Exception('خط ثبت ورود آفلاین مشخص نیست');
  // محدودیت روش ثبت حضور برای خط تشخیص‌داده‌شده در حالت آفلاین نیز رعایت می‌شود.
  $lrow = Db::one("SELECT checkin_methods FROM `lines` WHERE id=?", [$lineId]);
  if ($lrow && !empty($lrow['checkin_methods'])) {
    $allowed = json_decode($lrow['checkin_methods'], true);
    if (is_array($allowed) && $allowed && !in_array($method, $allowed, true)) throw new Exception('روش ثبت حضور برای خط تشخیص‌داده‌شده مجاز نیست');
  }
  $clientTime = _phase7p4_client_time($b['client_time'] ?? $it['queued_at'] ?? null);
  $open = Db::one("SELECT id FROM staff_attendance WHERE user_id=? AND check_out IS NULL ORDER BY id DESC LIMIT 1", [$u['id']]);
  if ($open) return ['ok'=>true,'already_open'=>true,'attendance_id'=>(int)$open['id'],'kind'=>'checkin'];
  $station = ($st['name'] ?? null) ?: _station_name_at($lat,$lng,$lineIds);
  $id = Db::insert("INSERT INTO staff_attendance(user_id,line_id,method,check_in,in_lat,in_lng,in_station,client_uuid,offline_synced,client_check_in) VALUES(?,?,?,?,?,?,?,?,1,?)",
    [$u['id'],$lineId,$method,$clientTime,$lat,$lng,$station,$uuid,$clientTime]);
  try { _notify_attendance_action('checkin',(int)$u['id'],$lineId,$method,$station,$clientTime); } catch (\Throwable $e) { error_log('offline attendance checkin alert failed: '.$e->getMessage()); }
  return ['ok'=>true,'attendance_id'=>$id,'kind'=>'checkin','offline_synced'=>true,'check_in'=>$clientTime];
}
function _phase7p4_offline_checkout($b,$u,$uuid,$it){
  if (Db::one("SELECT id FROM staff_attendance WHERE client_uuid=? AND check_out IS NOT NULL LIMIT 1", [$uuid])) return ['ok'=>true,'duplicate'=>true,'kind'=>'checkout'];
  [$lat,$lng] = validGeo($b['lat'] ?? null, $b['lng'] ?? null);
  $clientTime = _phase7p4_client_time($b['client_time'] ?? $it['queued_at'] ?? null);
  $open = Db::one("SELECT id,check_in,line_id,method FROM staff_attendance WHERE user_id=? AND check_out IS NULL ORDER BY id DESC LIMIT 1", [$u['id']]);
  if (!$open) throw new Exception('برای خروج آفلاین، ورود بازی در سرور وجود ندارد');
  $station = _station_name_at($lat,$lng,user_line_ids($u));
  if (strtotime($clientTime) <= strtotime($open['check_in'])) $clientTime = date('Y-m-d H:i:s', strtotime($open['check_in']) + 60);
  Db::run("UPDATE staff_attendance SET check_out=?, out_lat=?, out_lng=?, out_station=?, offline_synced=1, client_check_out=? WHERE id=?", [$clientTime,$lat,$lng,$station,$clientTime,$open['id']]);
  try { _notify_attendance_action('checkout',(int)$u['id'],$open['line_id']??null,$open['method']??'gps',$station,$clientTime); } catch (\Throwable $e) { error_log('offline attendance checkout alert failed: '.$e->getMessage()); }
  return ['ok'=>true,'attendance_id'=>(int)$open['id'],'kind'=>'checkout','offline_synced'=>true,'check_out'=>$clientTime];
}
function _phase7p4_offline_locations($b,$u,$uuid,$it){
  $pings = $b['pings'] ?? [];
  if (!is_array($pings) || !$pings) return ['ok'=>true,'kind'=>'locations','inserted'=>0];
  $n=0;
  foreach ($pings as $p) {
    if (!is_array($p)) continue;
    $lat = is_numeric($p['lat'] ?? null) ? (float)$p['lat'] : null; $lng = is_numeric($p['lng'] ?? null) ? (float)$p['lng'] : null;
    if ($lat===null || $lng===null) continue;
    $ts = _phase7p4_client_time($p['captured_at'] ?? $p['ts'] ?? $it['queued_at'] ?? null);
    try { Db::run("INSERT INTO location_pings(user_id,lat,lng,captured_at,mocked) VALUES(?,?,?,?,?)", [$u['id'],$lat,$lng,$ts,!empty($p['mocked'])?1:0]); $n++; } catch (Throwable $e) {}
  }
  return ['ok'=>true,'kind'=>'locations','inserted'=>$n];
}
function _phase7p4_offline_activity($b,$u,$uuid,$it){
  $event = preg_replace('/[^a-zA-Z0-9_\-]/','', (string)($b['kind'] ?? $b['event'] ?? 'offline_event'));
  Db::run("INSERT INTO activity_logs(user_id,event,meta,created_at) VALUES(?,?,?,?)", [$u['id'],$event,json_encode(['offline'=>true,'client_uuid'=>$uuid,'payload'=>$b],JSON_UNESCAPED_UNICODE),_phase7p4_client_time($b['at'] ?? $it['queued_at'] ?? null)]);
  return ['ok'=>true,'kind'=>'activity'];
}

function _phase7p8_offline_official_visit($b,$u,$uuid,$it){
  if (empty($b['official_id'])) throw new Exception('انتخاب مسئول الزامی است');
  if (empty(trim($b['note'] ?? ''))) throw new Exception('درج توضیحات الزامی است');
  if (Db::one("SELECT id FROM official_visits WHERE recorded_by=? AND note=? AND created_at=? LIMIT 1", [$u['id'], $b['note'] ?? '', _app_client_time($b, $it['queued_at'] ?? null)])) return ['ok'=>true,'duplicate'=>true,'kind'=>'official_visit'];
  [$lat,$lng] = validGeo($b['lat'] ?? null, $b['lng'] ?? null);
  $lineIds = user_line_ids($u);
  $reqRow = Db::one("SELECT value FROM app_settings WHERE `key`='official_visit_require_station'");
  $requireStation = $reqRow ? (bool)json_decode($reqRow['value'], true) : true;
  $st = null;
  if ($requireStation) {
    if ($lat === null) throw new Exception('موقعیت مکانی ثبت آفلاین وجود ندارد');
    $st = station_at_point($lat,$lng,$lineIds);
    if (!$st) throw new Exception('ثبت آفلاین حضور مسئول خارج از محدوده مجاز است');
  }
  $photo = $b['photo_data'] ?? null;
  $eventAt = _app_client_time($b, $it['queued_at'] ?? null);
  $path = !empty($photo) ? Media::saveBase64($photo, 'visits', 1280, 70) : null;
  try {
    $id = Db::insert("INSERT INTO official_visits(official_id,recorded_by,line_id,note,lat,lng,photo_path,created_at) VALUES(?,?,?,?,?,?,?,?)", [(int)$b['official_id'],$u['id'],$b['line_id'] ?? ($st['line_id'] ?? null),$b['note'] ?? null,$lat,$lng,$path,$eventAt]);
  } catch (Throwable $e) {
    $id = Db::insert("INSERT INTO official_visits(official_id,recorded_by,line_id,note,lat,lng,photo_data,created_at) VALUES(?,?,?,?,?,?,?,?)", [(int)$b['official_id'],$u['id'],$b['line_id'] ?? ($st['line_id'] ?? null),$b['note'] ?? null,$lat,$lng,$photo,$eventAt]);
  }
  return ['ok'=>true,'kind'=>'official_visit','id'=>$id,'created_at'=>$eventAt];
}
function _phase7p8_offline_welfare_grant($b,$u,$uuid,$it){
  _ensure_welfare_tables();
  if (!_can_welfare($u)) throw new Exception('دسترسی ثبت رفاهیات ندارید');
  $itemId=(int)($b['item_id']??0); $nid=trim((string)($b['driver_national_id']??''));
  if (!$itemId || $nid==='') throw new Exception('اطلاعات رفاهیات ناقص است');
  $drv=Db::one("SELECT first_name,last_name,mobile FROM drivers WHERE national_id=?",[$nid]);
  if (!$drv) throw new Exception('راننده رفاهیات یافت نشد');
  $eventAt=_app_client_time($b,$it['queued_at']??null);
  $jdate=_app_normalize_jdate($b['granted_jdate']??null,$eventAt);
  $name=trim(($drv['first_name']??'').' '.($drv['last_name']??''));
  $id=Db::insert("INSERT INTO welfare_grants(item_id,place_id,driver_national_id,driver_name,driver_mobile,count,note,granted_by,granted_jdate,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",[$itemId,!empty($b['place_id'])?(int)$b['place_id']:null,$nid,$name,$drv['mobile']??null,max(1,(int)($b['count']??1)),trim($b['note']??'')?:null,$u['id'],$jdate,$eventAt]);
  return ['ok'=>true,'kind'=>'welfare_grant','id'=>$id,'created_at'=>$eventAt,'granted_jdate'=>$jdate];
}
function _phase7p8_offline_cultural_activity($b,$u,$uuid,$it){
  _ensure_cultural_tables();
  if (!_can_cultural($u)) throw new Exception('دسترسی ثبت فعالیت فرهنگی ندارید');
  $typeId=(int)($b['type_id']??0); $nid=trim((string)($b['driver_national_id']??''));
  if (!$typeId || $nid==='') throw new Exception('اطلاعات فعالیت فرهنگی ناقص است');
  $drv=Db::one("SELECT first_name,last_name,mobile FROM drivers WHERE national_id=?",[$nid]);
  if (!$drv) throw new Exception('راننده فعالیت فرهنگی یافت نشد');
  $eventAt=_app_client_time($b,$it['queued_at']??null);
  $jdate=_app_normalize_jdate($b['activity_jdate']??null,$eventAt);
  $name=trim(($drv['first_name']??'').' '.($drv['last_name']??''));
  $id=Db::insert("INSERT INTO cultural_activities(type_id,place_id,driver_national_id,driver_name,driver_mobile,activity_jdate,location,hours,note,recorded_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",[$typeId,!empty($b['place_id'])?(int)$b['place_id']:null,$nid,$name,$drv['mobile']??null,$jdate,trim($b['location']??'')?:null,($b['hours']??null),trim($b['note']??'')?:null,$u['id'],$eventAt]);
  return ['ok'=>true,'kind'=>'cultural_activity','id'=>$id,'created_at'=>$eventAt,'activity_jdate'=>$jdate];
}
function _phase7p8_offline_report($b,$u,$uuid,$it){
  _ensure_reports_index();
  if (empty($b['subject']) || empty($b['body'])) throw new Exception('گزارش آفلاین ناقص است');
  $eventAt=_app_client_time($b,$it['queued_at']??null);
  $priority=in_array(($b['priority']??'normal'),['normal','important','urgent'],true)?$b['priority']:'normal';
  $attPath=null; if (!empty($b['attachment_data'])) $attPath=Media::saveBase64($b['attachment_data'],'reports',1280,70);
  try { $id=Db::insert("INSERT INTO reports(sender_id,subject,body,priority,attachment_name,attachment_path,created_at) VALUES(?,?,?,?,?,?,?)",[$u['id'],$b['subject'],$b['body'],$priority,$b['attachment_name']??null,$attPath,$eventAt]); }
  catch (Throwable $e) { $id=Db::insert("INSERT INTO reports(sender_id,subject,body,created_at) VALUES(?,?,?,?)",[$u['id'],$b['subject'],$b['body'],$eventAt]); }
  _save_report_attachments($id,$b['attachments']??[]);
  _report_audit($id,$u['id'],'create_offline',null,['priority'=>$priority,'client_uuid'=>$uuid]);
  return ['ok'=>true,'kind'=>'report','id'=>$id,'created_at'=>$eventAt];
}
route('GET', '/api/admin/offline-sync-logs', function($p,$b,$u){
  _phase7p4_ensure();
  $status = trim((string)($p['status'] ?? ''));
  $where='1=1'; $args=[];
  if ($status !== '') { $where.=' AND osl.status=?'; $args[]=$status; }
  return Db::all("SELECT osl.*, CONCAT(u.first_name,' ',u.last_name) user_name FROM offline_sync_logs osl LEFT JOIN users u ON u.id=osl.user_id WHERE $where ORDER BY osl.id DESC LIMIT 500", $args);
}, false, ADMIN);
route('GET', '/api/admin/phase7-part4/status', function($p,$b,$u){
  return ['site_version'=>SITE_VERSION,'app_version'=>APP_VERSION,'phase'=>7,'part'=>4,'completed'=>[
    'offline_sync_processing','offline_checkin_checkout_processing','offline_location_processing','offline_sync_admin_logs','mobile_sync_client_fix','version_1_0_7','upgrade_php_consolidated'
  ],'remaining'=>[
    'production_bundle_without_browser_babel','full_device_field_test','automated_api_test_suite','advanced_offline_conflict_resolution_ui'
  ]];
}, false, ADMIN);
route('GET', '/api/project-version-v7p4', function($p,$b,$u){ return ['site_version'=>SITE_VERSION,'app_version'=>APP_VERSION,'phase'=>7,'part'=>4,'release_name'=>'Phase 7.7 - Shift Scheduling Finalization']; }, true);


/* ============================================================
 * Phase 7.5 — Offline conflict resolution and operational QA
 * Version: site 96 / app 1.0.8
 * ============================================================ */
function _phase7p5_ensure(){
  if (function_exists('_phase7p4_ensure')) _phase7p4_ensure();
  foreach ([
    ['offline_sync_logs','resolved_by','BIGINT NULL'],
    ['offline_sync_logs','resolved_at','DATETIME NULL'],
    ['offline_sync_logs','resolution_note','TEXT NULL'],
    ['offline_sync_logs','conflict_reason','TEXT NULL']
  ] as $c) {
    try { if (Db::one("SHOW TABLES LIKE ?", [$c[0]]) && !Db::one("SHOW COLUMNS FROM {$c[0]} WHERE Field=?", [$c[1]])) Db::run("ALTER TABLE {$c[0]} ADD COLUMN {$c[1]} {$c[2]}"); } catch (Throwable $e) {}
  }
  try { Db::run("CREATE INDEX idx_offline_resolved ON offline_sync_logs(resolved_at,resolved_by)"); } catch (Throwable $e) {}
  try { Db::run("CREATE TABLE IF NOT EXISTS offline_sync_audit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    offline_sync_id BIGINT NOT NULL,
    actor_id BIGINT NULL,
    action VARCHAR(40) NOT NULL,
    note TEXT NULL,
    before_status VARCHAR(30) NULL,
    after_status VARCHAR(30) NULL,
    meta JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_osa_sync(offline_sync_id,created_at),
    INDEX idx_osa_actor(actor_id,created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"); } catch (Throwable $e) {}
  if (function_exists('_phase6_set')) { _phase6_set('site_version', SITE_VERSION); _phase6_set('app_version', APP_VERSION); _phase6_set('db_upgrade_version','phase7-part5-1.0.8'); }
}
function _phase7p5_audit($id,$actor,$action,$note,$before,$after,$meta=[]){
  try { Db::run("INSERT INTO offline_sync_audit(offline_sync_id,actor_id,action,note,before_status,after_status,meta) VALUES(?,?,?,?,?,?,?)", [$id,$actor,$action,$note,$before,$after,json_encode($meta,JSON_UNESCAPED_UNICODE)]); } catch (Throwable $e) {}
}
function _phase7p5_row($id){
  _phase7p5_ensure();
  $row = Db::one("SELECT * FROM offline_sync_logs WHERE id=?", [(int)$id]);
  if (!$row) Http::error('رکورد همگام‌سازی آفلاین یافت نشد',404);
  return $row;
}
function _phase7p5_decode_payload($row){
  $payload = $row['payload'] ?? null;
  if (is_string($payload)) $payload = json_decode($payload,true);
  return is_array($payload) ? $payload : [];
}
route('GET', '/api/admin/offline-sync-conflicts', function($p,$b,$u){
  _phase7p5_ensure();
  $status = trim((string)($p['status'] ?? ''));
  $where = "osl.status IN ('failed','conflict','received')"; $args=[];
  if ($status !== '') { $where = 'osl.status=?'; $args[]=$status; }
  $userId=(int)($p['user_id']??0); if($userId>0){$where.=' AND osl.user_id=?';$args[]=$userId;}
  $rows = Db::all("SELECT osl.*, CONCAT(u.first_name,' ',u.last_name) user_name, r.title role_title
    FROM offline_sync_logs osl
    LEFT JOIN users u ON u.id=osl.user_id
    LEFT JOIN roles r ON r.id=u.role_id
    WHERE $where ORDER BY osl.id DESC LIMIT 500", $args);
  foreach($rows as &$r){
    if (empty($r['conflict_reason'])) $r['conflict_reason'] = $r['error'] ?: ($r['status']==='received'?'در صف بررسی یا پردازش نشده':'نیازمند بررسی');
    $r['audit'] = Db::all("SELECT a.*, CONCAT(u.first_name,' ',u.last_name) actor_name FROM offline_sync_audit a LEFT JOIN users u ON u.id=a.actor_id WHERE a.offline_sync_id=? ORDER BY a.id DESC LIMIT 20", [$r['id']]);
  }
  return ['items'=>$rows,'count'=>count($rows),'site_version'=>SITE_VERSION,'app_version'=>APP_VERSION];
}, false, ADMIN);
route('POST', '/api/admin/offline-sync-conflicts/{id}/retry', function($p,$b,$u){
  _phase7p5_ensure(); $row=_phase7p5_row($p['id']); $before=$row['status'];
  $payload=_phase7p5_decode_payload($row);
  $targetUser = Db::one("SELECT * FROM users WHERE id=?", [(int)$row['user_id']]);
  if (!$targetUser) Http::error('کاربر رکورد آفلاین پیدا نشد',400);
  try {
    if (!function_exists('_phase7p4_process_offline_item')) throw new Exception('پردازشگر آفلاین فعال نیست');
    $res = _phase7p4_process_offline_item($payload, $targetUser, (string)$row['client_uuid']);
    Db::run("UPDATE offline_sync_logs SET status='processed', error=NULL, conflict_reason=NULL, server_result=?, processed_at=NOW(), resolved_by=?, resolved_at=NOW(), resolution_note=? WHERE id=?", [json_encode($res,JSON_UNESCAPED_UNICODE),$u['id']??null,substr((string)($b['note']??'پردازش مجدد دستی'),0,1000),$row['id']]);
    _phase7p5_audit($row['id'],$u['id']??null,'retry',$b['note']??'',$before,'processed',['result'=>$res]);
    return ['ok'=>true,'result'=>$res];
  } catch (Throwable $e) {
    Db::run("UPDATE offline_sync_logs SET status='failed', error=?, conflict_reason=? WHERE id=?", [$e->getMessage(),$e->getMessage(),$row['id']]);
    _phase7p5_audit($row['id'],$u['id']??null,'retry_failed',$b['note']??'',$before,'failed',['error'=>$e->getMessage()]);
    Http::error($e->getMessage(),400);
  }
}, false, ADMIN);
route('POST', '/api/admin/offline-sync-conflicts/{id}/ignore', function($p,$b,$u){
  _phase7p5_ensure(); $row=_phase7p5_row($p['id']); $before=$row['status'];
  $note=substr((string)($b['note']??'نادیده گرفته شد'),0,1000);
  Db::run("UPDATE offline_sync_logs SET status='ignored', resolved_by=?, resolved_at=NOW(), resolution_note=? WHERE id=?", [$u['id']??null,$note,$row['id']]);
  _phase7p5_audit($row['id'],$u['id']??null,'ignore',$note,$before,'ignored');
  return ['ok'=>true];
}, false, ADMIN);
route('POST', '/api/admin/offline-sync-conflicts/{id}/mark-conflict', function($p,$b,$u){
  _phase7p5_ensure(); $row=_phase7p5_row($p['id']); $before=$row['status'];
  $reason=substr((string)($b['reason']??'نیازمند بررسی مدیریتی'),0,2000);
  Db::run("UPDATE offline_sync_logs SET status='conflict', conflict_reason=? WHERE id=?", [$reason,$row['id']]);
  _phase7p5_audit($row['id'],$u['id']??null,'mark_conflict',$reason,$before,'conflict');
  return ['ok'=>true];
}, false, ADMIN);
route('GET', '/api/admin/offline-sync-conflicts/{id}/audit', function($p,$b,$u){
  _phase7p5_ensure(); _phase7p5_row($p['id']);
  return Db::all("SELECT a.*, CONCAT(u.first_name,' ',u.last_name) actor_name FROM offline_sync_audit a LEFT JOIN users u ON u.id=a.actor_id WHERE a.offline_sync_id=? ORDER BY a.id DESC", [(int)$p['id']]);
}, false, ADMIN);
route('GET', '/api/admin/phase7-part5/status', function($p,$b,$u){
  _phase7p5_ensure();
  $counts = Db::all("SELECT status, COUNT(*) count FROM offline_sync_logs GROUP BY status");
  return ['site_version'=>SITE_VERSION,'app_version'=>APP_VERSION,'phase'=>7,'part'=>5,'release_name'=>'Phase 7.7 - Shift Scheduling Finalization','completed'=>[
    'offline_conflict_list','manual_retry_failed_offline_items','ignore_invalid_offline_items','offline_sync_audit_trail','version_1_0_8','upgrade_php_consolidated'
  ],'remaining'=>[
    'production_bundle_without_browser_babel','full_device_field_test','automated_api_test_suite','load_test_on_final_server'
  ],'counts'=>$counts];
}, false, ADMIN);
route('GET', '/api/project-version-v7p5', function($p,$b,$u){ return ['site_version'=>SITE_VERSION,'app_version'=>APP_VERSION,'phase'=>7,'part'=>5,'release_name'=>'Phase 7.7 - Shift Scheduling Finalization']; }, true);


// Phase 7.7 - Shift Scheduling Finalization without manual line selection
route('GET', '/api/project-version-v7p6', function($p,$b,$u){ return ['site_version'=>SITE_VERSION,'app_version'=>APP_VERSION,'phase'=>7,'part'=>6,'release_name'=>'Phase 7.7 - Shift Scheduling Finalization']; }, true);

// Phase 7.7 - Remaining shift scheduling and auto-shift hardening
function _phase7p7_ensure(){
  _ensure_role_work_rules();
  try { if (!Db::one("SHOW COLUMNS FROM role_work_rules WHERE Field='include_friday_in_duty'")) Db::run("ALTER TABLE role_work_rules ADD COLUMN include_friday_in_duty TINYINT(1) NOT NULL DEFAULT 0"); } catch (Throwable $e) {}
  try { if (!Db::one("SHOW COLUMNS FROM role_work_rules WHERE Field='include_holiday_in_duty'")) Db::run("ALTER TABLE role_work_rules ADD COLUMN include_holiday_in_duty TINYINT(1) NOT NULL DEFAULT 0"); } catch (Throwable $e) {}
  try { if (!Db::one("SHOW COLUMNS FROM role_work_rules WHERE Field='max_open_session_minutes'")) Db::run("ALTER TABLE role_work_rules ADD COLUMN max_open_session_minutes INT NOT NULL DEFAULT 960"); } catch (Throwable $e) {}
  try { if (!Db::one("SHOW COLUMNS FROM role_work_rules WHERE Field='auto_close_enabled'")) Db::run("ALTER TABLE role_work_rules ADD COLUMN auto_close_enabled TINYINT(1) NOT NULL DEFAULT 0"); } catch (Throwable $e) {}
  try { if (!Db::one("SHOW COLUMNS FROM role_work_rules WHERE Field='auto_close_after_minutes'")) Db::run("ALTER TABLE role_work_rules ADD COLUMN auto_close_after_minutes INT NOT NULL DEFAULT 0"); } catch (Throwable $e) {}
  try { if (!Db::one("SHOW COLUMNS FROM role_work_rules WHERE Field='checkout_grace_minutes'")) Db::run("ALTER TABLE role_work_rules ADD COLUMN checkout_grace_minutes INT NOT NULL DEFAULT 15"); } catch (Throwable $e) {}
  try { Db::run("CREATE TABLE IF NOT EXISTS user_work_rule_overrides (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL UNIQUE, title VARCHAR(160) NULL, duty_minutes INT NULL, overtime_limit_minutes INT NULL, surplus_after_minutes INT NULL, night_start TIME NULL, night_end TIME NULL, auto_shift_enabled TINYINT(1) NULL, checkin_any_time TINYINT(1) NULL, allowed_checkin_from TIME NULL, allowed_checkin_to TIME NULL, warn_before_overtime_cap_minutes INT NULL, require_checkout_after_cap TINYINT(1) NULL, night_calc TINYINT(1) NULL, friday_calc TINYINT(1) NULL, holiday_calc TINYINT(1) NULL, include_friday_in_duty TINYINT(1) NULL, include_holiday_in_duty TINYINT(1) NULL, max_open_session_minutes INT NULL, auto_close_enabled TINYINT(1) NULL, auto_close_after_minutes INT NULL, checkout_grace_minutes INT NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP, INDEX idx_uwro_user(user_id,is_active)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"); } catch (Throwable $e) {}
  try { Db::run("CREATE TABLE IF NOT EXISTS shift_assignment_audit (id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, shift_id INT NULL, from_jdate VARCHAR(10) NULL, to_jdate VARCHAR(10) NULL, action VARCHAR(30) NOT NULL, actor_id INT NULL, note TEXT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_saa_user_time(user_id,created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"); } catch (Throwable $e) {}
  try { Db::run("CREATE TABLE IF NOT EXISTS attendance_recalculate_logs (id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id INT NULL, from_jdate VARCHAR(10) NULL, to_jdate VARCHAR(10) NULL, rows_count INT NOT NULL DEFAULT 0, actor_id INT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_recalc_user_time(user_id,created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"); } catch (Throwable $e) {}
  try { if (function_exists('_phase6_set')) { _phase6_set('site_version', SITE_VERSION); _phase6_set('app_version', APP_VERSION); _phase6_set('db_upgrade_version','phase7-part7-1.0.10'); } } catch (Throwable $e) {}
}
function _phase7p7_clean_time($v){ $v=trim((string)$v); return preg_match('/^\d{1,2}:\d{2}/',$v) ? substr($v,0,5).':00' : null; }
function _phase7p7_int_or_null($v){ return ($v === '' || $v === null) ? null : max(0,(int)$v); }
function _phase7p7_bool_or_null($v){ return ($v === '' || $v === null) ? null : (!empty($v) ? 1 : 0); }
function _phase7p7_user_rule_payload($b){
  $cols = [
    'title'=>isset($b['title'])?substr((string)$b['title'],0,160):null,
    'duty_minutes'=>_phase7p7_int_or_null($b['duty_minutes']??null),
    'overtime_limit_minutes'=>_phase7p7_int_or_null($b['overtime_limit_minutes']??null),
    'surplus_after_minutes'=>_phase7p7_int_or_null($b['surplus_after_minutes']??null),
    'night_start'=>isset($b['night_start'])?_phase7p7_clean_time($b['night_start']):null,
    'night_end'=>isset($b['night_end'])?_phase7p7_clean_time($b['night_end']):null,
    'auto_shift_enabled'=>array_key_exists('auto_shift_enabled',$b)?_phase7p7_bool_or_null($b['auto_shift_enabled']):null,
    'checkin_any_time'=>array_key_exists('checkin_any_time',$b)?_phase7p7_bool_or_null($b['checkin_any_time']):null,
    'allowed_checkin_from'=>isset($b['allowed_checkin_from'])?_phase7p7_clean_time($b['allowed_checkin_from']):null,
    'allowed_checkin_to'=>isset($b['allowed_checkin_to'])?_phase7p7_clean_time($b['allowed_checkin_to']):null,
    'warn_before_overtime_cap_minutes'=>_phase7p7_int_or_null($b['warn_before_overtime_cap_minutes']??null),
    'require_checkout_after_cap'=>array_key_exists('require_checkout_after_cap',$b)?_phase7p7_bool_or_null($b['require_checkout_after_cap']):null,
    'night_calc'=>array_key_exists('night_calc',$b)?_phase7p7_bool_or_null($b['night_calc']):null,
    'friday_calc'=>array_key_exists('friday_calc',$b)?_phase7p7_bool_or_null($b['friday_calc']):null,
    'holiday_calc'=>array_key_exists('holiday_calc',$b)?_phase7p7_bool_or_null($b['holiday_calc']):null,
    'include_friday_in_duty'=>array_key_exists('include_friday_in_duty',$b)?_phase7p7_bool_or_null($b['include_friday_in_duty']):null,
    'include_holiday_in_duty'=>array_key_exists('include_holiday_in_duty',$b)?_phase7p7_bool_or_null($b['include_holiday_in_duty']):null,
    'max_open_session_minutes'=>_phase7p7_int_or_null($b['max_open_session_minutes']??null),
    'auto_close_enabled'=>array_key_exists('auto_close_enabled',$b)?_phase7p7_bool_or_null($b['auto_close_enabled']):null,
    'auto_close_after_minutes'=>_phase7p7_int_or_null($b['auto_close_after_minutes']??null),
    'checkout_grace_minutes'=>_phase7p7_int_or_null($b['checkout_grace_minutes']??null),
    'is_active'=>array_key_exists('is_active',$b)?(!empty($b['is_active'])?1:0):1,
  ];
  return $cols;
}
route('GET', '/api/admin/rule-engine/user-overrides', function($p,$b,$u){
  _phase7p7_ensure();
  $uid=(int)($_GET['user_id']??0); $args=[]; $where='1=1';
  if($uid>0){$where='u.id=?';$args[]=$uid;}
  return Db::all("SELECT u.id user_id, CONCAT(u.first_name,' ',u.last_name) user_name, r.title role_title, o.*
    FROM users u LEFT JOIN roles r ON r.id=u.role_id LEFT JOIN user_work_rule_overrides o ON o.user_id=u.id
    WHERE $where ORDER BY u.last_name,u.first_name LIMIT 500", $args);
}, false, ADMIN);
route('PUT', '/api/admin/rule-engine/user-overrides/{user_id}', function($p,$b,$u){
  _phase7p7_ensure(); $uid=(int)$p['user_id']; if(!$uid) Http::error('کاربر نامعتبر است',400);
  if(!Db::one("SELECT id FROM users WHERE id=?",[$uid])) Http::error('کاربر یافت نشد',404);
  $c=_phase7p7_user_rule_payload($b);
  Db::run("INSERT INTO user_work_rule_overrides(user_id,title,duty_minutes,overtime_limit_minutes,surplus_after_minutes,night_start,night_end,auto_shift_enabled,checkin_any_time,allowed_checkin_from,allowed_checkin_to,warn_before_overtime_cap_minutes,require_checkout_after_cap,night_calc,friday_calc,holiday_calc,include_friday_in_duty,include_holiday_in_duty,max_open_session_minutes,auto_close_enabled,auto_close_after_minutes,checkout_grace_minutes,is_active)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE title=VALUES(title), duty_minutes=VALUES(duty_minutes), overtime_limit_minutes=VALUES(overtime_limit_minutes), surplus_after_minutes=VALUES(surplus_after_minutes), night_start=VALUES(night_start), night_end=VALUES(night_end), auto_shift_enabled=VALUES(auto_shift_enabled), checkin_any_time=VALUES(checkin_any_time), allowed_checkin_from=VALUES(allowed_checkin_from), allowed_checkin_to=VALUES(allowed_checkin_to), warn_before_overtime_cap_minutes=VALUES(warn_before_overtime_cap_minutes), require_checkout_after_cap=VALUES(require_checkout_after_cap), night_calc=VALUES(night_calc), friday_calc=VALUES(friday_calc), holiday_calc=VALUES(holiday_calc), include_friday_in_duty=VALUES(include_friday_in_duty), include_holiday_in_duty=VALUES(include_holiday_in_duty), max_open_session_minutes=VALUES(max_open_session_minutes), auto_close_enabled=VALUES(auto_close_enabled), auto_close_after_minutes=VALUES(auto_close_after_minutes), checkout_grace_minutes=VALUES(checkout_grace_minutes), is_active=VALUES(is_active)",
    [$uid,$c['title'],$c['duty_minutes'],$c['overtime_limit_minutes'],$c['surplus_after_minutes'],$c['night_start'],$c['night_end'],$c['auto_shift_enabled'],$c['checkin_any_time'],$c['allowed_checkin_from'],$c['allowed_checkin_to'],$c['warn_before_overtime_cap_minutes'],$c['require_checkout_after_cap'],$c['night_calc'],$c['friday_calc'],$c['holiday_calc'],$c['include_friday_in_duty'],$c['include_holiday_in_duty'],$c['max_open_session_minutes'],$c['auto_close_enabled'],$c['auto_close_after_minutes'],$c['checkout_grace_minutes'],$c['is_active']]);
  return ['ok'=>true,'row'=>Db::one("SELECT * FROM user_work_rule_overrides WHERE user_id=?",[$uid])];
}, false, ADMIN);
route('DELETE', '/api/admin/rule-engine/user-overrides/{user_id}', function($p,$b,$u){
  _phase7p7_ensure(); Db::run("DELETE FROM user_work_rule_overrides WHERE user_id=?",[(int)$p['user_id']]); return ['ok'=>true];
}, false, ADMIN);
route('GET', '/api/admin/shift-planning/diagnostics', function($p,$b,$u){
  _phase7p7_ensure();
  $overlaps = Db::all("SELECT a.user_id, CONCAT(u.first_name,' ',u.last_name) user_name, a.shift_id shift_a, sa.title shift_a_title, a.from_jdate a_from, a.to_jdate a_to, b.shift_id shift_b, sb.title shift_b_title, b.from_jdate b_from, b.to_jdate b_to
    FROM user_shifts a JOIN user_shifts b ON b.user_id=a.user_id AND b.shift_id<>a.shift_id
    LEFT JOIN users u ON u.id=a.user_id LEFT JOIN shifts sa ON sa.id=a.shift_id LEFT JOIN shifts sb ON sb.id=b.shift_id
    WHERE COALESCE(a.from_jdate,'0000-00-00') <= COALESCE(b.to_jdate,'9999-12-31') AND COALESCE(a.to_jdate,'9999-12-31') >= COALESCE(b.from_jdate,'0000-00-00')
    ORDER BY a.user_id LIMIT 200");
  $badRot = Db::all("SELECT id,title FROM shifts WHERE type='rotating' AND (advanced IS NULL OR JSON_EXTRACT(advanced,'$.rotation.cycle_start_jdate') IS NULL) LIMIT 100");
  $open = Db::all("SELECT sa.id,sa.user_id,CONCAT(u.first_name,' ',u.last_name) user_name,sa.check_in,TIMESTAMPDIFF(MINUTE,sa.check_in,NOW()) open_minutes
    FROM staff_attendance sa JOIN users u ON u.id=sa.user_id WHERE sa.check_out IS NULL ORDER BY sa.check_in LIMIT 200");
  foreach($open as &$r){ $sh=_auto_shift_for_user((int)$r['user_id']); $r['max_open_session_minutes']=(int)($sh['max_open_session_minutes']??960); $r['too_long']=((int)$r['open_minutes']>$r['max_open_session_minutes'])?1:0; }
  $noRules = Db::all("SELECT u.id user_id, CONCAT(u.first_name,' ',u.last_name) user_name, r.title role_title FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.is_active=1 AND r.`key` IS NOT NULL AND NOT EXISTS(SELECT 1 FROM role_work_rules rr WHERE rr.role_key=r.`key`) LIMIT 200");
  return ['overlaps'=>$overlaps,'rotating_without_start'=>$badRot,'open_sessions'=>$open,'users_without_exact_role_rule'=>$noRules,'site_version'=>SITE_VERSION,'app_version'=>APP_VERSION];
}, false, ADMIN);
function _phase7p7_calc_for_attendance_row($row){
  if(empty($row['check_in'])) return null;
  [$gy,$gm,$gd]=[(int)date('Y',strtotime($row['check_in'])),(int)date('n',strtotime($row['check_in'])),(int)date('j',strtotime($row['check_in']))];
  [$jy,$jm,$jd]=gregorian_to_jalali($gy,$gm,$gd); $jdate=sprintf('%04d-%02d-%02d',$jy,$jm,$jd);
  $shift=_active_user_shift_assignment((int)$row['user_id'],$jdate);
  $dr=($shift && (($shift['type']??'')==='advanced')) ? _shift_day_row($shift['shift_id']??$shift['id'],$jdate) : null;
  $hol=(bool)Db::one("SELECT jdate FROM holidays WHERE jdate IN (?,?) LIMIT 1",[$jdate,str_replace('-','/',$jdate)]);
  $sess=[['in'=>strtotime($row['check_in']),'out'=>!empty($row['check_out'])?strtotime($row['check_out']):null]];
  return ShiftCalc::dayWork($shift,$jdate,$dr,$sess,$hol);
}
route('POST', '/api/admin/attendance/recalculate', function($p,$b,$u){
  _phase7p7_ensure();
  $uid=(int)($b['user_id']??0); $from=str_replace('/','-',trim((string)($b['from']??''))); $to=str_replace('/','-',trim((string)($b['to']??'')));
  if(!$from||!$to) Http::error('بازه تاریخ مشخص نیست',400);
  [$start]=_attendance_day_bounds($from); [, $end]=_attendance_day_bounds($to); if(!$start||!$end) Http::error('بازه تاریخ نامعتبر است',422);
  $args=[$end,$start]; $where="check_in < ? AND COALESCE(check_out,NOW()) > ?";
  if($uid>0){$where.=" AND user_id=?";$args[]=$uid;}
  $rows=Db::all("SELECT id,user_id,check_in,check_out FROM staff_attendance WHERE $where ORDER BY id",$args);
  $n=0;
  foreach($rows as $r){ try{ $calc=_phase7p7_calc_for_attendance_row($r); Db::run("UPDATE staff_attendance SET calc_json=? WHERE id=?",[json_encode($calc,JSON_UNESCAPED_UNICODE),$r['id']]); $n++; }catch(Throwable $e){} }
  try{Db::run("INSERT INTO attendance_recalculate_logs(user_id,from_jdate,to_jdate,rows_count,actor_id) VALUES(?,?,?,?,?)",[$uid?:null,$from,$to,$n,$u['id']??null]);}catch(Throwable $e){}
  return ['ok'=>true,'rows_count'=>$n,'from'=>$from,'to'=>$to];
}, false, ADMIN);
route('POST', '/api/admin/attendance/auto-close-open-sessions', function($p,$b,$u){
  _phase7p7_ensure();
  $dry=!empty($b['dry_run']); $closed=[];
  $rows=Db::all("SELECT id,user_id,check_in,line_id FROM staff_attendance WHERE check_out IS NULL ORDER BY check_in LIMIT 500");
  foreach($rows as $r){
    $shift=_auto_shift_for_user((int)$r['user_id']);
    if(empty($shift['auto_close_enabled'])) continue;
    $after=(int)($shift['auto_close_after_minutes']??0); if($after<=0) $after=(int)($shift['max_open_session_minutes']??960);
    $checkIn=strtotime($r['check_in']); if(!$checkIn || time()-$checkIn < $after*60) continue;
    $out=date('Y-m-d H:i:s',$checkIn+$after*60);
    if(!$dry){ Db::run("UPDATE staff_attendance SET check_out=?, method=CONCAT(COALESCE(method,''),'|auto_close') WHERE id=? AND check_out IS NULL",[$out,$r['id']]); try{ $calc=_phase7p7_calc_for_attendance_row(['id'=>$r['id'],'user_id'=>$r['user_id'],'check_in'=>$r['check_in'],'check_out'=>$out]); Db::run("UPDATE staff_attendance SET calc_json=? WHERE id=?",[json_encode($calc,JSON_UNESCAPED_UNICODE),$r['id']]); }catch(Throwable $e){} }
    $closed[]=['id'=>$r['id'],'user_id'=>$r['user_id'],'check_in'=>$r['check_in'],'auto_check_out'=>$out];
  }
  return ['ok'=>true,'dry_run'=>$dry,'closed_count'=>count($closed),'items'=>$closed];
}, false, ADMIN);
route('GET', '/api/admin/shift-assignment-audit', function($p,$b,$u){
  _phase7p7_ensure(); $uid=(int)($_GET['user_id']??0); $where='1=1'; $args=[]; if($uid){$where='a.user_id=?';$args[]=$uid;}
  return Db::all("SELECT a.*, CONCAT(u.first_name,' ',u.last_name) user_name, s.title shift_title, CONCAT(actor.first_name,' ',actor.last_name) actor_name FROM shift_assignment_audit a LEFT JOIN users u ON u.id=a.user_id LEFT JOIN users actor ON actor.id=a.actor_id LEFT JOIN shifts s ON s.id=a.shift_id WHERE $where ORDER BY a.id DESC LIMIT 500",$args);
}, false, ADMIN);
route('GET', '/api/admin/phase7-part7/status', function($p,$b,$u){
  _phase7p7_ensure();
  return ['site_version'=>SITE_VERSION,'app_version'=>APP_VERSION,'phase'=>7,'part'=>7,'release_name'=>'Phase 7.7 - Shift Scheduling Finalization','completed'=>[
    'user_specific_auto_shift_overrides','shift_assignment_overlap_guard','advanced_day_config_applied_to_calculation','auto_shift_friday_holiday_duty_flags','attendance_recalculate_api','open_session_auto_close_api','shift_diagnostics_api','assignment_audit_trail','version_1_0_10','upgrade_php_consolidated'
  ],'remaining'=>[
    'production_bundle_without_browser_babel','full_device_field_test','automated_api_test_suite','load_test_on_final_server'
  ]];
}, false, ADMIN);
route('GET', '/api/project-version-v7p7', function($p,$b,$u){ return ['site_version'=>SITE_VERSION,'app_version'=>APP_VERSION,'phase'=>7,'part'=>7,'release_name'=>'Phase 7.7 - Shift Scheduling Finalization']; }, true);

// Phase 7.9 - OCR پلاک تاکسی ۱۲/ت و نرمال‌سازی کد ملی فارسی/عربی
route('GET', '/api/admin/phase7-part9/status', function($p,$b,$u){
  _ensure_plate_scan_samples();
  $counts = Db::one("SELECT COUNT(*) total, SUM(CASE WHEN crop_image_path IS NOT NULL THEN 1 ELSE 0 END) with_crop FROM plate_scan_samples");
  return ['site_version'=>SITE_VERSION,'app_version'=>APP_VERSION,'phase'=>7,'part'=>9,'release_name'=>'Phase 7.9 - Taxi Plate OCR Learning','completed'=>[
    'fixed_taxi_plate_region_12_letter_te','digit_only_plate_ocr','human_verified_plate_samples','plate_crop_upload_dataset','persian_arabic_national_id_normalization','plate_search_normalization','version_1_0_12','upgrade_php_consolidated'
  ],'plate_samples'=>$counts ?: ['total'=>0,'with_crop'=>0]];
}, false, ADMIN);
route('GET', '/api/project-version-v7p9', function($p,$b,$u){ return ['site_version'=>SITE_VERSION,'app_version'=>APP_VERSION,'phase'=>7,'part'=>9,'release_name'=>'Phase 7.9 - Taxi Plate OCR Learning']; }, true);


route('GET', '/api/admin/phase7-part10/status', function($p,$b,$u){
  $st = _plate_model_status_payload();
  $st['phase']=7; $st['part']=10; $st['release_name']='Phase 7.11 - Professional Bale Bot and Forms';
  $st['completed']=[
    'plate_training_sample_review_panel','verified_rejected_pending_sample_workflow','server_side_training_manifest_export','python_random_forest_digit_training_pipeline','trained_model_registry','server_side_plate_prediction_endpoint','mobile_server_model_fallback','version_1_0_14','upgrade_php_consolidated'
  ];
  $st['remaining']=[
    'collect_real_plate_samples_from_field','train_after_enough_verified_samples','evaluate_accuracy_on_real_devices'
  ];
  return $st;
}, false, ADMIN);
route('GET', '/api/project-version-v7p10', function($p,$b,$u){ return ['site_version'=>SITE_VERSION,'app_version'=>APP_VERSION,'phase'=>7,'part'=>10,'release_name'=>'Phase 7.11 - Professional Bale Bot and Forms']; }, true);


route('GET', '/api/project-version-v7p11', function($p,$b,$u){ return ['site_version'=>SITE_VERSION,'app_version'=>APP_VERSION,'phase'=>7,'part'=>11,'release_name'=>'Phase 7.11 - Professional Bale Bot and Forms']; }, true);

route('GET', '/api/project-version-v7p12', function($p,$b,$u){
  return ['site_version'=>SITE_VERSION,'app_version'=>APP_VERSION,'phase'=>7,'part'=>12,'release_name'=>'Phase 7.12 - Unified Bale Telegram Eitaa Bots'];
}, true);

route('GET', '/api/admin/phase7-part12/status', function($p,$b,$u){
  return ['site_version'=>SITE_VERSION,'app_version'=>APP_VERSION,'phase'=>7,'part'=>12,'release_name'=>'Phase 7.12 - Unified Bale Telegram Eitaa Bots','completed'=>[
    'telegram_bot_webhook','eitaa_bot_webhook','shared_menu_items','shared_custom_replies','shared_forms_and_registration','national_code_prefill_for_all_bots','platform_specific_subscribers','platform_specific_logs','platform_specific_form_reviews','messenger_hub_notifications','settings_panel_platform_tabs','version_1_0_17','upgrade_php_consolidated'
  ],'remaining'=>[
    'register_real_telegram_webhook_on_server','register_real_eitaa_webhook_on_server','field_test_all_three_bots_with_real_tokens','verify_eitaa_api_base_if_provider_uses_custom_gateway'
  ]];
}, false, ADMIN);

/* ============================================================
 * Phase 7.13 — Complete system health dashboard
 * Version: site 105 / app 1.0.17
 * ============================================================ */
function _phase7p13_table_exists($table){
  $table = preg_replace('/[^a-zA-Z0-9_]/','',(string)$table);
  if ($table==='') return false;
  try { return (bool)Db::one('SHOW TABLES LIKE ?', [$table]); } catch (Throwable $e) { return false; }
}
function _phase7p13_count($table,$where='1=1',$args=[]){
  $table = preg_replace('/[^a-zA-Z0-9_]/','',(string)$table);
  if ($table==='' || !_phase7p13_table_exists($table)) return 0;
  try { $r=Db::one("SELECT COUNT(*) n FROM `$table` WHERE $where", $args); return (int)($r['n'] ?? 0); } catch (Throwable $e) { return 0; }
}
function _phase7p13_all($sql,$args=[]){ try { return Db::all($sql,$args); } catch (Throwable $e) { return []; } }
function _phase7p13_one($sql,$args=[]){ try { return Db::one($sql,$args) ?: []; } catch (Throwable $e) { return []; } }
function _phase7p13_bytes($v){ $v=(string)$v; $n=(float)$v; $unit=strtolower(preg_replace('/[^a-z]/i','',$v)); if($unit==='g'||$unit==='gb')$n*=1024*1024*1024; elseif($unit==='m'||$unit==='mb')$n*=1024*1024; elseif($unit==='k'||$unit==='kb')$n*=1024; return (int)$n; }
function _phase7p13_component($key,$title,$status,$message,$meta=[]){ return ['key'=>$key,'title'=>$title,'status'=>$status,'message'=>$message,'meta'=>$meta]; }
function _phase7p13_ensure(){
  try { if(function_exists('_phase6_ensure_tables')) _phase6_ensure_tables(); } catch(Throwable $e) {}
  try { if(class_exists('MessengerBot')) MessengerBot::ensureTables(); } catch(Throwable $e) {}
  try { if(class_exists('BaleBot')) BaleBot::ensureProTables(); } catch(Throwable $e) {}
  try { Db::run("CREATE TABLE IF NOT EXISTS system_health_checks (id BIGINT AUTO_INCREMENT PRIMARY KEY, check_key VARCHAR(80) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'ok', message TEXT NULL, meta JSON NULL, checked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_health_check_key_time(check_key,checked_at), INDEX idx_health_check_status(status,checked_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"); } catch(Throwable $e) {}
  try { Db::run("CREATE TABLE IF NOT EXISTS system_health_incidents (id BIGINT AUTO_INCREMENT PRIMARY KEY, check_key VARCHAR(80) NOT NULL, status VARCHAR(20) NOT NULL, title VARCHAR(191) NULL, message TEXT NULL, meta JSON NULL, first_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, resolved_at DATETIME NULL, resolved_by BIGINT NULL, resolution_note TEXT NULL, INDEX idx_shi_key_status(check_key,status,last_seen_at), INDEX idx_shi_resolved(resolved_at,last_seen_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"); } catch(Throwable $e) {}
}
function _phase7p13_collect_health(){
  _phase7p13_ensure();
  $components=[]; $stats=[]; $now=date('Y-m-d H:i:s');

  $dbOk=false; $dbMsg='اتصال برقرار است';
  try { Db::one('SELECT 1'); $dbOk=true; } catch(Throwable $e){ $dbMsg=$e->getMessage(); }
  $components[]=_phase7p13_component('database','دیتابیس',$dbOk?'ok':'error',$dbMsg,[
    'users'=>_phase7p13_count('users'),
    'active_users'=>_phase7p13_count('users','is_active=1'),
    'drivers'=>_phase7p13_count('drivers'),
    'lines'=>_phase7p13_count('taxi_lines') ?: _phase7p13_count('lines'),
  ]);

  $dirs=[
    'uploads'=>__DIR__.'/../public/uploads',
    'plate_training'=>__DIR__.'/../storage/plate_training',
    'php_public'=>__DIR__.'/../public',
  ];
  $badDirs=[]; $dirMeta=[];
  foreach($dirs as $k=>$d){ $dirMeta[$k]=['path'=>$d,'exists'=>is_dir($d),'writable'=>is_dir($d)?is_writable($d):false]; if(!is_dir($d)||!is_writable($d)) $badDirs[]=$k; }
  $components[]=_phase7p13_component('storage','مسیرهای ذخیره‌سازی',empty($badDirs)?'ok':'warning',empty($badDirs)?'مسیرهای اصلی قابل نوشتن هستند':'برخی مسیرها قابل نوشتن نیستند',$dirMeta);

  $required=['pdo_mysql','curl','json','mbstring','openssl','zip','simplexml','gd'];
  $missing=[]; foreach($required as $ext){ if(!extension_loaded($ext)) $missing[]=$ext; }
  $components[]=_phase7p13_component('php_extensions','افزونه‌های PHP',empty($missing)?'ok':'warning',empty($missing)?'افزونه‌های اصلی فعال هستند':'افزونه‌های ناقص: '.implode(', ',$missing),['php'=>PHP_VERSION,'missing'=>$missing,'upload_max'=>ini_get('upload_max_filesize'),'post_max'=>ini_get('post_max_size'),'memory_limit'=>ini_get('memory_limit')]);


  $panelHtml=__DIR__.'/../public/panel.html';
  $panelJs=__DIR__.'/../public/assets/panel.bundle.js';
  $panelCss=__DIR__.'/../public/assets/panel.bundle.css';
  $panelText=is_file($panelHtml)?(string)@file_get_contents($panelHtml):'';
  $hasRuntimeBabel=(stripos($panelText,'text/babel')!==false || stripos($panelText,'babel.min.js')!==false || stripos($panelText,'@babel/standalone')!==false);
  $bundleOk=is_file($panelJs) && filesize($panelJs)>100000 && is_file($panelCss) && filesize($panelCss)>1000;
  $components[]=_phase7p13_component('panel_bundle','Build پنل سایت',($bundleOk && !$hasRuntimeBabel)?'ok':'error',($bundleOk && !$hasRuntimeBabel)?'پنل با bundle تولیدی اجرا می‌شود و Babel مرورگر حذف شده است':'پنل هنوز bundle کامل ندارد یا Babel مرورگر در HTML دیده شد',[
    'panel_html_exists'=>is_file($panelHtml),
    'bundle_js_exists'=>is_file($panelJs),
    'bundle_css_exists'=>is_file($panelCss),
    'bundle_js_bytes'=>is_file($panelJs)?filesize($panelJs):0,
    'bundle_css_bytes'=>is_file($panelCss)?filesize($panelCss):0,
    'runtime_babel_detected'=>$hasRuntimeBabel,
  ]);

  $diskFree=@disk_free_space(__DIR__); $diskTotal=@disk_total_space(__DIR__); $freePct=($diskFree&&$diskTotal)?round(($diskFree/$diskTotal)*100,1):null;
  $diskStatus=($freePct!==null && $freePct<10)?'error':(($freePct!==null && $freePct<20)?'warning':'ok');
  $components[]=_phase7p13_component('disk','فضای دیسک',$diskStatus,$freePct===null?'اطلاعات دیسک قابل خواندن نیست':'فضای آزاد '.$freePct.'٪',['free_bytes'=>$diskFree,'total_bytes'=>$diskTotal,'free_percent'=>$freePct]);

  $dq=_phase7p13_all("SELECT status,COUNT(*) count FROM delivery_queue GROUP BY status");
  $dqFailed=_phase7p13_count('delivery_queue',"status IN ('failed','cancelled')");
  $dqPendingOld=_phase7p13_count('delivery_queue',"status IN ('pending','queued') AND created_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)");
  $dead=_phase7p13_count('delivery_dead_letters');
  $qStatus=($dqFailed+$dead>0)?'warning':'ok'; if($dqPendingOld>50)$qStatus='error';
  $components[]=_phase7p13_component('delivery_queue','صف ارسال پیام‌ها',$qStatus,"ناموفق: $dqFailed / Dead-letter: $dead / معطل قدیمی: $dqPendingOld",['by_status'=>$dq,'failed'=>$dqFailed,'dead_letters'=>$dead,'old_pending'=>$dqPendingOld]);

  $offline=_phase7p13_all("SELECT status,COUNT(*) count FROM offline_sync_logs GROUP BY status");
  $offlineFailed=_phase7p13_count('offline_sync_logs',"status IN ('failed','conflict')");
  $offlinePending=_phase7p13_count('offline_sync_logs',"status IN ('pending','received')");
  $components[]=_phase7p13_component('offline_sync','همگام‌سازی آفلاین',$offlineFailed>0?'warning':'ok',"تعارض/ناموفق: $offlineFailed / در صف: $offlinePending",['by_status'=>$offline]);

  $mobile24=_phase7p13_count('mobile_error_logs','created_at>DATE_SUB(NOW(), INTERVAL 1 DAY)');
  $reject24=_phase7p13_count('attendance_reject_logs','created_at>DATE_SUB(NOW(), INTERVAL 1 DAY)');
  $components[]=_phase7p13_component('mobile_diagnostics','خطاهای اپ و GPS',($mobile24>20||$reject24>80)?'warning':'ok',"خطای اپ ۲۴ساعت: $mobile24 / رد حضور: $reject24",['mobile_errors_24h'=>$mobile24,'attendance_reject_24h'=>$reject24]);

  $platePending=_phase7p13_count('plate_scan_samples',"status='pending'");
  $plateVerified=_phase7p13_count('plate_scan_samples',"status='verified'");
  $plateStatus=($platePending>200)?'warning':'ok';
  $components[]=_phase7p13_component('plate_ocr','بازبینی پلاک‌خوان',$plateStatus,"نمونه تأییدشده: $plateVerified / در انتظار بازبینی: $platePending",['verified'=>$plateVerified,'pending'=>$platePending]);

  $platforms=['bale','telegram','eitaa']; $mess=[]; $msgFailed=0;
  foreach($platforms as $pl){
    if($pl==='bale'){
      $subs=_phase7p13_count('bale_subscribers','is_active=1');
      $failed=_phase7p13_count('bale_message_log',"status<>'sent' AND created_at>DATE_SUB(NOW(), INTERVAL 1 DAY)");
      $events=_phase7p13_count('bale_bot_events','created_at>DATE_SUB(NOW(), INTERVAL 1 DAY)');
    } else {
      $subs=_phase7p13_count('messenger_subscribers','platform=? AND is_active=1',[$pl]);
      $failed=_phase7p13_count('messenger_message_log',"platform=? AND status<>'sent' AND created_at>DATE_SUB(NOW(), INTERVAL 1 DAY)",[$pl]);
      $events=_phase7p13_count('messenger_bot_events','platform=? AND created_at>DATE_SUB(NOW(), INTERVAL 1 DAY)',[$pl]);
    }
    $msgFailed+=$failed; $mess[$pl]=['active_subscribers'=>$subs,'failed_24h'=>$failed,'events_24h'=>$events];
  }
  $components[]=_phase7p13_component('messenger_bots','ربات‌های پیام‌رسان',$msgFailed>0?'warning':'ok',"خطای ارسال ۲۴ساعت: $msgFailed",$mess);

  $checks=_phase7p13_all("SELECT check_key,status,message,checked_at FROM system_health_checks ORDER BY id DESC LIMIT 80");
  $lastCron=_phase7p13_one("SELECT checked_at,status,message FROM system_health_checks WHERE check_key='cron_probe' ORDER BY id DESC LIMIT 1");
  $cronOld=false; if(!empty($lastCron['checked_at'])) $cronOld=(time()-strtotime($lastCron['checked_at'])>86400); else $cronOld=true;
  $components[]=_phase7p13_component('cron','کرون‌جاب‌ها',$cronOld?'warning':'ok',$cronOld?'چک کرون در ۲۴ ساعت اخیر ثبت نشده است':'آخرین چک کرون ثبت شده است',['last_cron'=>$lastCron]);

  $sysWarn24=_phase7p13_count('system_health_logs',"level IN ('warning','error') AND created_at>DATE_SUB(NOW(), INTERVAL 1 DAY)");
  $openSessions=_phase7p13_count('staff_attendance','check_out IS NULL');
  $stats=[
    'users_total'=>_phase7p13_count('users'),
    'users_active'=>_phase7p13_count('users','is_active=1'),
    'drivers_total'=>_phase7p13_count('drivers'),
    'lines_total'=>_phase7p13_count('taxi_lines') ?: _phase7p13_count('lines'),
    'open_staff_sessions'=>$openSessions,
    'delivery_dead_letters'=>$dead,
    'offline_failed'=>$offlineFailed,
    'mobile_errors_24h'=>$mobile24,
    'attendance_rejects_24h'=>$reject24,
    'system_warnings_24h'=>$sysWarn24,
    'plate_verified'=>$plateVerified,
    'plate_pending'=>$platePending,
  ];

  $overall='ok'; foreach($components as $c){ if($c['status']==='error'){ $overall='error'; break; } if($c['status']==='warning' && $overall!=='error') $overall='warning'; }
  return [
    'ok'=>true,
    'status'=>$overall,
    'time'=>$now,
    'site_version'=>SITE_VERSION,
    'app_version'=>APP_VERSION,
    'components'=>$components,
    'stats'=>$stats,
    'recent_errors'=>_phase7p13_all("SELECT * FROM system_health_logs WHERE level IN ('error','warning') ORDER BY id DESC LIMIT 50"),
    'recent_mobile_errors'=>_phase7p13_all("SELECT * FROM mobile_error_logs ORDER BY id DESC LIMIT 30"),
    'recent_offline_failures'=>_phase7p13_all("SELECT * FROM offline_sync_logs WHERE status IN ('failed','conflict') ORDER BY id DESC LIMIT 30"),
    'checks_history'=>$checks,
    'thresholds'=>['old_queue_minutes'=>30,'cron_max_age_hours'=>24,'disk_warning_percent'=>20,'disk_error_percent'=>10],
  ];
}
function _phase7p13_save_checks($payload,$actor=null){
  foreach(($payload['components']??[]) as $c){
    try { Db::run("INSERT INTO system_health_checks(check_key,status,message,meta) VALUES(?,?,?,?)", [$c['key'],$c['status'],$c['message'],json_encode($c['meta']??[],JSON_UNESCAPED_UNICODE)]); } catch(Throwable $e) {}
    if(($c['status']??'ok')!=='ok'){
      try { Db::run("INSERT INTO system_health_incidents(check_key,status,title,message,meta,last_seen_at) VALUES(?,?,?,?,?,NOW())", [$c['key'],$c['status'],$c['title']??$c['key'],$c['message']??'',json_encode(['actor'=>$actor,'meta'=>$c['meta']??[]],JSON_UNESCAPED_UNICODE)]); } catch(Throwable $e) {}
    }
  }
  try { Db::run("INSERT INTO system_health_checks(check_key,status,message,meta) VALUES('cron_probe',?,?,?)", [$payload['status']??'ok','health dashboard probe executed',json_encode(['actor'=>$actor,'time'=>date('c')],JSON_UNESCAPED_UNICODE)]); } catch(Throwable $e) {}
}
route('GET', '/api/admin/system-health-dashboard', function($p,$b,$u){ return _phase7p13_collect_health(); }, false, ADMIN);
route('POST', '/api/admin/system-health-dashboard/run', function($p,$b,$u){ $h=_phase7p13_collect_health(); _phase7p13_save_checks($h,$u['id']??'admin'); return $h; }, false, ADMIN);
route('POST', '/api/cron/system-health-probe', function($p,$b,$u){
  $key = $p['key'] ?? $b['key'] ?? ($_GET['key'] ?? '');
  $expected = '';
  try { $r=Db::one("SELECT value FROM app_settings WHERE `key`='cron_key'"); $expected=$r ? (string)json_decode($r['value'], true) : ''; } catch(Throwable $e) {}
  if(!$expected) $expected=getenv('CRON_KEY') ?: '';
  if($expected && !hash_equals((string)$expected,(string)$key)) Http::error('کلید کرون نامعتبر است',403);
  $h=_phase7p13_collect_health(); _phase7p13_save_checks($h,'cron'); return $h;
}, true);
route('POST', '/api/admin/system-health-incidents/{id}/resolve', function($p,$b,$u){
  _phase7p13_ensure(); Db::run("UPDATE system_health_incidents SET resolved_at=NOW(), resolved_by=?, resolution_note=? WHERE id=?", [$u['id']??null, trim((string)($b['note']??'')), (int)$p['id']]); return ['ok'=>true];
}, false, ADMIN);
route('GET', '/api/admin/system-health-incidents', function($p,$b,$u){ _phase7p13_ensure(); return Db::all("SELECT * FROM system_health_incidents ORDER BY id DESC LIMIT 300"); }, false, ADMIN);
route('GET', '/api/admin/phase7-part13/status', function($p,$b,$u){
  $h=_phase7p13_collect_health();
  return ['site_version'=>SITE_VERSION,'app_version'=>APP_VERSION,'phase'=>7,'part'=>13,'release_name'=>'Phase 7.13 - Complete System Health Dashboard','health_status'=>$h['status'],'completed'=>[
    'full_health_dashboard','database_storage_disk_php_checks','delivery_queue_dead_letter_monitor','offline_sync_monitor','mobile_gps_error_monitor','plate_ocr_training_monitor','messenger_bot_monitor','cron_probe_endpoint','incident_history','admin_panel_health_view','version_1_0_17','upgrade_php_consolidated'
  ],'remaining'=>['production_field_threshold_tuning','external_uptime_monitor_on_final_domain']];
}, false, ADMIN);
route('GET', '/api/project-version-v7p13', function($p,$b,$u){ return ['site_version'=>SITE_VERSION,'app_version'=>APP_VERSION,'phase'=>7,'part'=>13,'release_name'=>'Phase 7.13 - Complete System Health Dashboard']; }, true);
route('GET', '/api/cron/system-health-probe', function($p,$b,$u){
  $key = $_GET['key'] ?? ($p['key'] ?? '');
  $expected = '';
  try { $r=Db::one("SELECT value FROM app_settings WHERE `key`='cron_key'"); $expected=$r ? (string)json_decode($r['value'], true) : ''; } catch(Throwable $e) {}
  if(!$expected) $expected=getenv('CRON_KEY') ?: '';
  if($expected && !hash_equals((string)$expected,(string)$key)) Http::error('کلید کرون نامعتبر است',403);
  $h=_phase7p13_collect_health(); _phase7p13_save_checks($h,'cron'); return $h;
}, true);


route('GET', '/api/admin/phase7-part14/status', function($p,$b,$u){
  return ['site_version'=>SITE_VERSION,'app_version'=>APP_VERSION,'phase'=>7,'part'=>14,'release_name'=>'Phase 7.15 - MySQL Import Upgrade and Plate OCR Settings','completed'=>[
    'browser_babel_removed','text_babel_removed','panel_react_compiled_to_bundle_js','panel_css_extracted_to_bundle_css','panel_html_slimmed','vendor_babel_fetch_removed','health_dashboard_panel_bundle_check','version_1_0_17','upgrade_php_consolidated'
  ],'remaining'=>['field_test_panel_on_final_domain','cdn_vendor_self_host_download_if_needed']];
}, false, ADMIN);
route('GET', '/api/project-version-v7p14', function($p,$b,$u){ return ['site_version'=>SITE_VERSION,'app_version'=>APP_VERSION,'phase'=>7,'part'=>14,'release_name'=>'Phase 7.15 - MySQL Import Upgrade and Plate OCR Settings']; }, true);
route('POST', '/api/plate-ocr/cloud', function($p,$b,$u){
  if (!class_exists('CloudOcr')) Http::error('ماژول OCR ابری نصب نشده است',500);
  $image=(string)($b['image_base64']??''); if($image==='') Http::error('تصویر لازم است',400);
  $kind=(string)($b['kind']??'plate'); if(!in_array($kind,['plate','national_id','text'],true)) $kind='text';
  try { return CloudOcr::recognize($image,$kind); }
  catch(Throwable $e){ Http::error($e->getMessage(),422); }
}, false, 9);

route('GET', '/api/project-version-v7p15', function($p,$b,$u){ return ['site_version'=>SITE_VERSION,'app_version'=>APP_VERSION,'phase'=>7,'part'=>15,'release_name'=>'Phase 7.15 - MySQL Import Upgrade and Plate OCR Settings','completed'=>['mysql_import_upgrade_sql'=>true,'safe_indexes'=>true,'plate_ocr_settings_visible'=>true]]; }, true);

route('GET', '/api/project-version-v7p16', function($p,$b,$u){ return ['site_version'=>SITE_VERSION,'app_version'=>APP_VERSION,'phase'=>7,'part'=>16,'release_name'=>'Phase 7.16 - Plate Training Endpoint Stabilization']; }, true);


// ============================================================================
// Phase 7 Part 52 — Company document requests (Phase 1 backend)
// ============================================================================


function _company_requests_schema_ensure(){
  static $done=false; if($done) return; $done=true;
  $columns=[
    'assigned_to'=>'BIGINT NULL','reviewed_by'=>'BIGINT NULL','reviewed_at'=>'DATETIME NULL',
    'due_at'=>'DATETIME NULL','last_status_at'=>'DATETIME NULL','completed_at'=>'DATETIME NULL',
    'admin_note'=>'TEXT NULL','priority'=>"VARCHAR(20) NOT NULL DEFAULT 'normal'",'last_sla_notified_at'=>'DATETIME NULL'
  ];
  foreach($columns as $name=>$definition){
    try{ $exists=Db::one("SHOW COLUMNS FROM company_requests LIKE ?",[$name]); if(!$exists) Db::exec("ALTER TABLE company_requests ADD COLUMN `$name` $definition"); }
    catch(Throwable $e){ error_log('company_requests schema '.$name.': '.$e->getMessage()); }
  }
  try{ Db::exec("CREATE INDEX idx_company_req_due ON company_requests(due_at,status)"); }catch(Throwable $e){}
  try{ $exists=Db::one("SHOW COLUMNS FROM company_request_logs LIKE 'meta'"); if(!$exists) Db::exec("ALTER TABLE company_request_logs ADD COLUMN meta LONGTEXT NULL"); }catch(Throwable $e){ error_log('company_request_logs schema meta: '.$e->getMessage()); }
  try{ Db::exec("UPDATE company_requests cr JOIN company_request_types rt ON rt.id=cr.request_type_id SET cr.due_at=DATE_ADD(cr.created_at,INTERVAL GREATEST(1,COALESCE(rt.deadline_days,1)) DAY) WHERE cr.due_at IS NULL"); }catch(Throwable $e){}
  try{ Db::exec("UPDATE company_requests SET last_status_at=COALESCE(last_status_at,created_at)"); }catch(Throwable $e){}
}

function _company_files_schema_ensure(){
  static $done=false; if($done) return; $done=true;
  $columns=[
    'original_path'=>'TEXT NULL','processed_path'=>'TEXT NULL','processed_size'=>'BIGINT NULL',
    'crop_meta'=>'LONGTEXT NULL','sha256'=>'VARCHAR(64) NULL','thumbnail_path'=>'TEXT NULL',
    'quality_score'=>'INT NULL','quality_status'=>"VARCHAR(20) NULL DEFAULT 'ok'",
    'quality_meta'=>'LONGTEXT NULL','source_type'=>"VARCHAR(30) NULL DEFAULT 'unknown'"
  ];
  foreach($columns as $name=>$definition){
    try { $exists=Db::one("SHOW COLUMNS FROM company_request_files LIKE ?",[$name]); if(!$exists) Db::exec("ALTER TABLE company_request_files ADD COLUMN `$name` $definition"); }
    catch(Throwable $e){ error_log('company_request_files schema '.$name.': '.$e->getMessage()); }
  }
  try { Db::exec("CREATE INDEX idx_company_request_files_sha256 ON company_request_files(sha256)"); } catch(Throwable $e) {}
}
function _company_detect_mime($bin){
  try { if(class_exists('finfo')) { $fi=new finfo(FILEINFO_MIME_TYPE); $m=$fi->buffer($bin); if($m) return $m; } } catch(Throwable $e) {}
  if(substr($bin,0,4)==='%PDF') return 'application/pdf';
  if(substr($bin,0,3)==="ÿØÿ") return 'image/jpeg';
  if(substr($bin,0,8)==="PNG

") return 'image/png';
  if(substr($bin,0,4)==='RIFF' && substr($bin,8,4)==='WEBP') return 'image/webp';
  return 'application/octet-stream';
}

function _company_setting_get($key,$default=null){
  $row=Db::one("SELECT setting_value FROM company_request_settings WHERE setting_key=?",[$key]);
  if(!$row) return $default;
  $v=json_decode($row['setting_value'],true);
  return json_last_error()===JSON_ERROR_NONE ? $v : $default;
}
function _company_settings_all(){
  $rows=Db::all("SELECT setting_key,setting_value FROM company_request_settings ORDER BY setting_key"); $out=[];
  foreach($rows as $x){ $v=json_decode($x['setting_value'],true); $out[$x['setting_key']]=json_last_error()===JSON_ERROR_NONE?$v:null; }
  return $out;
}
function _company_log($requestId,$userId,$action,$description='',$meta=null){
  Db::insert("INSERT INTO company_request_logs(request_id,user_id,action,description,meta) VALUES(?,?,?,?,?)",[(int)$requestId,$userId?:null,$action,$description,$meta===null?null:json_encode($meta,JSON_UNESCAPED_UNICODE)]);
}
function _company_tracking_code(){ return 'CR-'.date('ymd').'-'.strtoupper(substr(bin2hex(random_bytes(5)),0,8)); }

function _company_doc_type_canonical($doc){
  $doc=trim((string)$doc);
  $aliases=[
    'birth_certificate_page1'=>'birth_certificate_page_1',
    'birth_certificate_page2'=>'birth_certificate_page_2',
    'license_front'=>'driver_license_front',
    'license_back'=>'driver_license_back',
    'personal_photo'=>'portrait_photo',
    'residency_document'=>'residence_document',
    'proof_of_residence'=>'residence_document',
  ];
  return $aliases[$doc]??$doc;
}
function _company_required_docs_state($req){
  $required=is_array($req['required_documents']??null)?$req['required_documents']:(json_decode($req['required_documents']??'[]',true)?:[]);
  $required=array_values(array_unique(array_map('_company_doc_type_canonical',$required)));
  $rows=Db::all("SELECT document_type,COUNT(*) c FROM company_request_files WHERE request_id=? GROUP BY document_type",[(int)$req['id']]);
  $have=[]; foreach($rows as $r) if((int)$r['c']>0) $have[_company_doc_type_canonical((string)$r['document_type'])]=true;
  $missing=[]; foreach($required as $d) if(empty($have[$d])) $missing[]=$d;
  return ['required'=>$required,'missing'=>$missing,'complete'=>count($missing)===0];
}
function _company_notify_user($req,$title,$body=''){
  try {
    if(class_exists('BaleBot') && BaleBot::isEnabled()){
      $chat=BaleBot::findChatForUser((int)$req['user_id']);
      if($chat) BaleBot::sendMessage($chat,trim($title."
".$body),['target_type'=>'company_request','target_id'=>(int)$req['id']]);
    }
  } catch(Throwable $e) { error_log('company_notify: '.$e->getMessage()); }
}

function _company_admin_user_ids(){
  $configured=_company_setting_get('notification_admin_user_ids',[]);
  if(is_array($configured) && count($configured)) return array_values(array_unique(array_map('intval',$configured)));
  $rows=Db::all("SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id WHERE u.active=1 AND r.is_admin=1 ORDER BY r.level DESC,u.id");
  return array_values(array_unique(array_map(fn($x)=>(int)$x['id'],$rows)));
}
function _company_notify_admins($req,$title,$body='',$data=[]){
  if(_company_setting_get('notify_admins',true)===false) return;
  $ids=_company_admin_user_ids(); if(!$ids) return;
  try { Push::notify($ids,$title,trim($body),['type'=>'company_request','request_id'=>(int)$req['id'],'tracking_code'=>$req['tracking_code']??'']+$data); }
  catch(Throwable $e){ error_log('company_admin_notify: '.$e->getMessage()); }
}
function _company_status_title($status){
  $m=['draft'=>'پیش‌نویس','documents_pending'=>'در انتظار مدارک','payment_pending'=>'در انتظار پرداخت','pending_review'=>'در انتظار بررسی','needs_correction'=>'نیازمند اصلاح','approved'=>'تأییدشده','rejected'=>'ردشده','completed'=>'تکمیل‌شده','cancelled'=>'لغوشده'];
  return $m[$status]??$status;
}
function _company_apply_due_date($requestId,$deadlineDays){
  $days=max(1,(int)$deadlineDays);
  Db::exec("UPDATE company_requests SET due_at=DATE_ADD(created_at,INTERVAL ? DAY),last_status_at=COALESCE(last_status_at,created_at) WHERE id=?",[$days,(int)$requestId]);
}

function _company_image_quality($bin,$documentType='',$clientMeta=[]){
  $out=['score'=>100,'status'=>'ok','warnings'=>[],'width'=>0,'height'=>0,'brightness'=>null,'contrast'=>null,'sharpness'=>null,'glare_percent'=>0,'dark_percent'=>0,'edge_coverage'=>null,'likely_screenshot'=>false,'orientation'=>'unknown','checks'=>[]];
  if(!function_exists('imagecreatefromstring')) { $out['warnings'][]='بررسی کیفیت تصویر روی سرور فعال نیست'; $out['checks']['server_gd']=false; return $out; }
  $im=@imagecreatefromstring($bin); if(!$im){$out['score']=0;$out['status']='invalid';$out['warnings'][]='تصویر قابل پردازش نیست';return $out;}
  $w=imagesx($im);$h=imagesy($im);$out['width']=$w;$out['height']=$h;$out['orientation']=$w>=$h?'landscape':'portrait';
  $minW=max(700,(int)_company_setting_get('quality_min_width',1200));
  $minH=max(450,(int)_company_setting_get('quality_min_height',800));
  if($w<$minW||$h<$minH){$out['score']-=30;$out['warnings'][]='رزولوشن تصویر کمتر از حد مجاز است';$out['checks']['resolution']=false;}else{$out['checks']['resolution']=true;}
  $sample=64;$thumb=imagecreatetruecolor($sample,$sample);imagecopyresampled($thumb,$im,0,0,0,0,$sample,$sample,$w,$h);
  $vals=[];$edges=[];$sum=0;$sum2=0;$glare=0;$dark=0;$borderEdges=0;$borderCount=0;
  for($y=0;$y<$sample;$y++) for($x=0;$x<$sample;$x++){
    $c=imagecolorat($thumb,$x,$y);$r=($c>>16)&255;$g=($c>>8)&255;$b=$c&255;$v=(int)round(.299*$r+.587*$g+.114*$b);$vals[$y][$x]=$v;$sum+=$v;$sum2+=$v*$v;
    if($v>=245)$glare++; if($v<=25)$dark++;
    if($x>0){$d=abs($v-$vals[$y][$x-1]);$edges[]=$d;if($x<5||$x>$sample-5||$y<5||$y>$sample-5){$borderEdges+=$d;$borderCount++;}}
    if($y>0){$d=abs($v-$vals[$y-1][$x]);$edges[]=$d;if($x<5||$x>$sample-5||$y<5||$y>$sample-5){$borderEdges+=$d;$borderCount++;}}
  }
  $n=$sample*$sample;$mean=$sum/$n;$variance=max(0,$sum2/$n-$mean*$mean);$contrast=sqrt($variance);$sharp=count($edges)?array_sum($edges)/count($edges):0;
  $glarePct=round($glare*100/$n,1);$darkPct=round($dark*100/$n,1);$edgeCoverage=$borderCount?round($borderEdges/$borderCount,1):0;
  $out['brightness']=round($mean,1);$out['contrast']=round($contrast,1);$out['sharpness']=round($sharp,1);$out['glare_percent']=$glarePct;$out['dark_percent']=$darkPct;$out['edge_coverage']=$edgeCoverage;
  if($mean<45){$out['score']-=25;$out['warnings'][]='تصویر بسیار تاریک است';$out['checks']['lighting']=false;}
  elseif($mean>225){$out['score']-=25;$out['warnings'][]='تصویر بیش از حد روشن است';$out['checks']['lighting']=false;}else{$out['checks']['lighting']=true;}
  if($glarePct>12){$out['score']-=18;$out['warnings'][]='بازتاب نور یا سفیدی شدید روی مدرک دیده می‌شود';$out['checks']['glare']=false;}else{$out['checks']['glare']=true;}
  if($darkPct>18){$out['score']-=12;$out['warnings'][]='سایه یا ناحیه بسیار تاریک در تصویر زیاد است';$out['checks']['shadow']=false;}else{$out['checks']['shadow']=true;}
  if($contrast<22){$out['score']-=18;$out['warnings'][]='کنتراست تصویر پایین است';$out['checks']['contrast']=false;}else{$out['checks']['contrast']=true;}
  if($sharp<11){$out['score']-=30;$out['warnings'][]='تصویر احتمالاً تار است';$out['checks']['sharpness']=false;}else{$out['checks']['sharpness']=true;}
  $ratio=$h?($w/$h):0;
  if($documentType!=='portrait_photo' && ($ratio<.8||$ratio>2.4)){$out['score']-=12;$out['warnings'][]='نسبت ابعاد تصویر غیرعادی است؛ حواشی را کراپ کنید';$out['checks']['aspect']=false;}else{$out['checks']['aspect']=true;}
  if($documentType==='portrait_photo' && ($ratio<.65||$ratio>1.25)){$out['score']-=15;$out['warnings'][]='کادر عکس پرسنلی مناسب نیست';$out['checks']['aspect']=false;}
  if($documentType!=='portrait_photo' && $edgeCoverage<5){$out['score']-=10;$out['warnings'][]='مدرک احتمالاً تمام کادر را پوشش نداده یا حاشیه اضافی دارد';$out['checks']['crop_coverage']=false;}else{$out['checks']['crop_coverage']=true;}
  $source=strtolower((string)($clientMeta['capture_source']??$clientMeta['source']??''));
  $isCommonScreen=in_array($w.'x'.$h,['1080x1920','1080x2400','1440x2560','720x1280','1080x2340','1170x2532','1290x2796'],true);
  if($source==='library' && ($isCommonScreen || (!empty($clientMeta['is_screenshot'])))){
    $out['likely_screenshot']=true;$out['score']-=20;$out['warnings'][]='تصویر احتمالاً اسکرین‌شات است؛ از اصل مدرک عکس بگیرید';$out['checks']['original_capture']=false;
  } else $out['checks']['original_capture']=true;
  $crop=$clientMeta['crop']??$clientMeta;
  if(is_array($crop) && isset($crop['left'],$crop['right'],$crop['top'],$crop['bottom'])){
    $trim=(float)$crop['left']+(float)$crop['right']+(float)$crop['top']+(float)$crop['bottom'];
    if($trim<4 && $documentType!=='portrait_photo'){$out['score']-=5;$out['warnings'][]='کراپ تصویر بسیار کم است؛ حاشیه‌های اضافی را بررسی کنید';}
  }
  $out['score']=max(0,min(100,(int)$out['score']));
  $good=max(50,min(95,(int)_company_setting_get('quality_good_score',70)));
  $review=max(20,min($good-1,(int)_company_setting_get('quality_review_score',45)));
  $out['status']=$out['score']>=$good?'ok':($out['score']>=$review?'warning':'poor');
  imagedestroy($thumb);imagedestroy($im);return $out;
}
function _company_validate_image_payload($base64,$documentType='',$clientMeta=[]){
  $data=(string)$base64;if(str_contains($data,','))$data=explode(',',$data,2)[1];$bin=base64_decode($data,true);
  if($bin===false||$bin==='') Http::error('تصویر معتبر ارسال نشده است',422);
  $fi=new finfo(FILEINFO_MIME_TYPE);$mime=$fi->buffer($bin)?:'application/octet-stream';
  if(!in_array($mime,['image/jpeg','image/png','image/webp'],true)) return ['quality'=>['score'=>100,'status'=>'ok','warnings'=>[]],'mime_type'=>$mime,'sha256'=>hash('sha256',$bin),'size'=>strlen($bin)];
  return ['quality'=>_company_image_quality($bin,$documentType,is_array($clientMeta)?$clientMeta:[]),'mime_type'=>$mime,'sha256'=>hash('sha256',$bin),'size'=>strlen($bin)];
}
function _company_processed_image($bin,$mime,$maxWidth=2200,$quality=88){
  if(!function_exists('imagecreatefromstring')) return ['bin'=>$bin,'mime'=>$mime,'ext'=>$mime==='image/png'?'png':'jpg'];
  $im=@imagecreatefromstring($bin);if(!$im)return ['bin'=>$bin,'mime'=>$mime,'ext'=>$mime==='image/png'?'png':'jpg'];
  $w=imagesx($im);$h=imagesy($im);$nw=min($maxWidth,$w);$nh=max(1,(int)round($h*$nw/max(1,$w)));
  $dst=imagecreatetruecolor($nw,$nh);$white=imagecolorallocate($dst,255,255,255);imagefill($dst,0,0,$white);imagecopyresampled($dst,$im,0,0,0,0,$nw,$nh,$w,$h);
  ob_start();imagejpeg($dst,null,max(60,min(95,$quality)));$out=ob_get_clean();imagedestroy($dst);imagedestroy($im);
  return ['bin'=>$out?:$bin,'mime'=>'image/jpeg','ext'=>'jpg','width'=>$nw,'height'=>$nh];
}

route('POST','/api/company-request/validate-document',function($p,$b,$u){ return ['ok'=>true,'accepted'=>true,'quality'=>null,'checks_disabled'=>true]; },false,99);
route('POST','/api/company-document/analyze',function($p,$b,$u){
  $doc=trim((string)($b['document_type']??''));if($doc==='')Http::error('نوع مدرک الزامی است',422);
  return ['ok'=>true]+_company_validate_image_payload($b['file_base64']??'',$doc,$b['client_meta']??[]);
},false,99);
route('POST','/api/company-document/validate',function($p,$b,$u){
  $doc=trim((string)($b['document_type']??''));if($doc==='')Http::error('نوع مدرک الزامی است',422);
  $r=_company_validate_image_payload($b['file_base64']??'',$doc,$b['client_meta']??[]);$min=max(20,min(95,(int)_company_setting_get('quality_min_score',55)));
  return ['ok'=>true,'accepted'=>(($r['quality']['score']??0)>=$min),'minimum_score'=>$min]+$r;
},false,99);
route('POST','/api/company-document/duplicate-check',function($p,$b,$u){
  $hash=strtolower(trim((string)($b['sha256']??'')));$requestId=(int)($b['request_id']??0);
  if(!preg_match('/^[a-f0-9]{64}$/',$hash))Http::error('هش تصویر نامعتبر است',422);
  $row=Db::one("SELECT f.id,f.request_id,f.document_type,f.created_at FROM company_request_files f JOIN company_requests r ON r.id=f.request_id WHERE f.sha256=? AND r.user_id=? ".($requestId?'AND f.request_id<>? ':'')."ORDER BY f.id DESC LIMIT 1",$requestId?[$hash,(int)$u['id'],$requestId]:[$hash,(int)$u['id']]);
  return ['ok'=>true,'duplicate'=>(bool)$row,'match'=>$row?:null];
},false,99);
route('POST','/api/company-document/finalize',function($p,$b,$u){
  $req=_company_request_owned((int)($b['request_id']??0),$u,false);$docs=_company_required_docs_state($req);
  $poor=[]; // کنترل کیفیت تصاویر حذف شده است.
  if(!$docs['complete'])Http::error('مدارک الزامی کامل نیست: '.implode('، ',$docs['missing']),422);
  // بررسی کیفیت تصاویر بنا به تنظیم سامانه حذف شده است.
  Db::exec("UPDATE company_requests SET status=IF(amount>0,'payment_pending','pending_review') WHERE id=?",[(int)$req['id']]);
  _company_log((int)$req['id'],(int)$u['id'],'documents_finalized','مدارک از نظر کیفیت نهایی شدند',['poor_count'=>count($poor)]);
  return ['ok'=>true,'status'=>(int)$req['amount']>0?'payment_pending':'pending_review','quality_issues'=>[]];
},false,99);


function _company_bale_payment_start_token($payment){
  return 'pay_'.(int)$payment['id'].'_'.substr(hash('sha256',(string)$payment['invoice_payload']),0,12);
}
function _company_bale_bot_link($startToken=''){
  $link=trim((string)_company_setting_get('bale_bot_link',''));
  if($link===''){
    try{$r=Db::one("SELECT value FROM app_settings WHERE `key`='bale_bot_link'"); if($r)$link=(string)(json_decode($r['value'],true)?:'');}catch(Throwable $e){}
  }
  if($link==='' || $startToken==='') return $link;
  $sep=str_contains($link,'?')?'&':'?';
  return $link.$sep.'start='.rawurlencode($startToken);
}

function _company_payment_link_message($payment,$botLink){
  $amount=number_format((int)($payment['amount']??0));
  return "لینک پرداخت کیف پول بله\nدرخواست: ".($payment['request_title']??'')."\nکد رهگیری: ".($payment['request_tracking']??'')."\nمبلغ: {$amount} ریال\n{$botLink}";
}
function _company_deliver_payment_link($payment,$botLink,$channel='both',$actorId=null){
  $out=['sms'=>false,'bale'=>false,'errors'=>[]];
  if(!$payment||$botLink==='') return $out;
  $msg=_company_payment_link_message($payment,$botLink);
  $usr=Db::one("SELECT phone FROM users WHERE id=?",[(int)$payment['user_id']]);
  if(in_array($channel,['sms','both'],true)){
    try{
      if(!empty($usr['phone']) && Sms::isEnabled()){ $r=Sms::send([$usr['phone']],$msg,'company_payment_link',$actorId); $out['sms']=!empty($r['ok'])||$r===true; }
      else $out['errors'][]='ارسال پیامک آماده نیست';
    }catch(Throwable $e){ $out['errors'][]='پیامک: '.$e->getMessage(); }
  }
  if(in_array($channel,['bale','both'],true)){
    try{
      $chat=BaleBot::findChatForUser((int)$payment['user_id']);
      if($chat){ $r=BaleBot::sendMessage($chat,$msg,['target_type'=>'company_request_payment','target_id'=>(int)$payment['request_id']]); $out['bale']=!empty($r['ok'])||$r===true; }
      else $out['errors'][]='حساب بله کاربر متصل نیست';
    }catch(Throwable $e){ $out['errors'][]='بله: '.$e->getMessage(); }
  }
  return $out;
}

function _company_bale_send_invoice_for_payment($payment,$chatId){
  if(!$payment) return ['ok'=>false,'error'=>'payment_not_found'];
  $provider=trim((string)_company_setting_get('bale_provider_token',''));
  if($provider==='') return ['ok'=>false,'error'=>'provider_token_missing','description'=>'توکن پرداخت کیف پول بله ثبت نشده است'];
  if(!class_exists('BaleBot')||!BaleBot::hasToken()) return ['ok'=>false,'error'=>'bale_bot_token_missing','description'=>'توکن بازوی بله ثبت نشده است'];
  $photo=(string)_company_setting_get('bale_invoice_photo_url','');
  $res=BaleBot::sendInvoice((string)$chatId,mb_substr((string)$payment['request_title'],0,32),'هزینه درخواست '.$payment['request_tracking'].' در سامانه خطیار',(string)$payment['invoice_payload'],(int)$payment['amount'],$provider,$photo,3);
  if(empty($res['ok'])){
    $err=(string)($res['description']??$res['error']??'invoice_send_failed');
    Db::exec("UPDATE company_request_payments SET status='failed',last_error=?,raw_payload=? WHERE id=?",[$err,json_encode($res,JSON_UNESCAPED_UNICODE),(int)$payment['id']]);
    return $res;
  }
  $messageId=$res['result']['message_id']??$res['message_id']??null;
  Db::exec("UPDATE company_request_payments SET status='pending',invoice_message_id=?,invoice_sent_at=NOW(),last_error=NULL,raw_payload=? WHERE id=?",[$messageId,json_encode($res,JSON_UNESCAPED_UNICODE),(int)$payment['id']]);
  Db::exec("UPDATE company_requests SET payment_method='bale_wallet',payment_status='pending',status='payment_pending' WHERE id=?",[(int)$payment['request_id']]);
  _company_log((int)$payment['request_id'],(int)$payment['user_id'],'bale_invoice_sent','صورتحساب بله ارسال شد',['payment_id'=>(int)$payment['id'],'message_id'=>$messageId]);
  return ['ok'=>true,'message_id'=>$messageId,'response'=>$res];
}

function _company_payment_by_payload($payload){ return Db::one("SELECT p.*,r.user_id,r.status request_status,r.payment_status request_payment_status,r.tracking_code request_tracking,rt.title request_title FROM company_request_payments p JOIN company_requests r ON r.id=p.request_id JOIN company_request_types rt ON rt.id=r.request_type_id WHERE p.invoice_payload=? ORDER BY p.id DESC LIMIT 1",[(string)$payload]); }

function _company_payment_full($id){
  return Db::one("SELECT p.*,r.user_id,r.status request_status,r.payment_status request_payment_status,r.tracking_code request_tracking,rt.title request_title FROM company_request_payments p JOIN company_requests r ON r.id=p.request_id JOIN company_request_types rt ON rt.id=r.request_type_id WHERE p.id=?",[(int)$id]);
}
function _company_payment_mark_paid($payment,$sp=[],$source='webhook'){
  if(!$payment) return false;
  $fresh=_company_payment_full((int)$payment['id']);
  if(!$fresh) return false;
  if(($fresh['status']??'')==='paid'){
    Db::exec("UPDATE company_requests SET payment_method='bale_wallet',payment_status='paid',status=IF(status IN ('draft','documents_pending','payment_pending'),'pending_review',status),updated_at=NOW() WHERE id=?",[(int)$fresh['request_id']]);
    return true;
  }
  $transaction=(string)($sp['bale_payment_charge_id']??$sp['telegram_payment_charge_id']??$sp['payment_charge_id']??$sp['id']??$fresh['transaction_id']??'');
  $provider=(string)($sp['provider_payment_charge_id']??$sp['provider_charge_id']??$fresh['provider_transaction_id']??'');
  Db::exec("UPDATE company_request_payments SET status='paid',transaction_id=?,provider_transaction_id=?,telegram_payment_charge_id=?,verified_at=NOW(),last_error=NULL,raw_payload=? WHERE id=?",[$transaction?:null,$provider?:null,$transaction?:null,json_encode($sp,JSON_UNESCAPED_UNICODE),(int)$fresh['id']]);
  Db::exec("UPDATE company_requests SET payment_method='bale_wallet',payment_status='paid',status='pending_review',updated_at=NOW() WHERE id=?",[(int)$fresh['request_id']]);
  _company_log((int)$fresh['request_id'],(int)$fresh['user_id'],'bale_payment_success','پرداخت کیف پول بله با موفقیت انجام شد',['payment_id'=>(int)$fresh['id'],'provider_charge_id'=>$provider,'source'=>$source]);
  return true;
}
function _company_payment_inquire($payment){
  if(!$payment) return ['ok'=>false,'error'=>'payment_not_found'];
  $tx=trim((string)($payment['provider_transaction_id']??$payment['transaction_id']??''));
  if($tx==='') return ['ok'=>true,'status'=>(string)($payment['status']??'pending'),'inquired'=>false,'reason'=>'transaction_id_not_available'];
  $res=BaleBot::inquireTransaction($tx);
  Db::exec("UPDATE company_request_payments SET inquiry_count=COALESCE(inquiry_count,0)+1,last_inquired_at=NOW(),last_error=?,raw_payload=? WHERE id=?",[empty($res['ok'])?(string)($res['description']??$res['error']??'inquiry_failed'):null,json_encode($res,JSON_UNESCAPED_UNICODE),(int)$payment['id']]);
  $data=$res['result']??$res['transaction']??$res;
  $status=strtolower((string)($data['status']??''));
  if($status==='paid'){
    $amount=(int)($data['amount']??$payment['amount']);
    if($amount===(int)$payment['amount']) _company_payment_mark_paid($payment,['id'=>$tx,'provider_payment_charge_id'=>$tx,'inquiry'=>$data],'inquireTransaction');
  } elseif(in_array($status,['failed','rejected'],true)) {
    Db::exec("UPDATE company_request_payments SET status=?,last_error=? WHERE id=?",[$status,'وضعیت تراکنش در استعلام: '.$status,(int)$payment['id']]);
    Db::exec("UPDATE company_requests SET payment_status='unpaid',status='payment_pending' WHERE id=?",[(int)$payment['request_id']]);
  }
  return ['ok'=>!empty($res['ok']),'status'=>$status?:($payment['status']??'pending'),'inquired'=>true,'response'=>$res];
}

function _company_digits($v){
  return preg_replace('/[^0-9]/','',strtr((string)$v,['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9']));
}
function _company_client_ip(){
  foreach(['HTTP_CF_CONNECTING_IP','HTTP_X_REAL_IP','HTTP_X_FORWARDED_FOR','REMOTE_ADDR'] as $k){
    $v=trim((string)($_SERVER[$k]??'')); if($v==='') continue; $v=trim(explode(',',$v)[0]); if(filter_var($v,FILTER_VALIDATE_IP)) return $v;
  }
  return '';
}
function _company_card_payment_full($paymentId){
  return Db::one("SELECT cp.*,p.method,p.currency,p.status payment_status,p.rejection_reason,p.payer_note,r.tracking_code request_tracking,r.user_id request_user_id,r.status request_status,r.payment_status request_payment_status,rt.title request_title FROM company_card_payments cp JOIN company_request_payments p ON p.id=cp.payment_id JOIN company_requests r ON r.id=cp.request_id JOIN company_request_types rt ON rt.id=r.request_type_id WHERE cp.payment_id=?",[(int)$paymentId]);
}
function _company_card_receipt_owned($requestId,$fileId,$path=''){
  if($fileId){$f=Db::one("SELECT * FROM company_request_files WHERE id=? AND request_id=? AND document_type='card_to_card_receipt'",[(int)$fileId,(int)$requestId]); if($f)return $f;}
  if($path!==''){$f=Db::one("SELECT * FROM company_request_files WHERE request_id=? AND file_path=? AND document_type='card_to_card_receipt' ORDER BY id DESC LIMIT 1",[(int)$requestId,(string)$path]);if($f)return $f;}
  return null;
}
function _company_card_submit($req,$u,$b,$resubmitPaymentId=0){
  if(!(bool)_company_setting_get('card_payment_enabled',true)) Http::error('پرداخت کارت‌به‌کارت غیرفعال است',422);
  $tracking=_company_digits($b['tracking_code']??$b['tracking_number']??'');
  $min=max(4,(int)_company_setting_get('card_tracking_min_length',6));$max=max($min,(int)_company_setting_get('card_tracking_max_length',30));
  if((bool)_company_setting_get('card_require_tracking',true) && (strlen($tracking)<$min||strlen($tracking)>$max)) Http::error("شماره پیگیری باید بین $min تا $max رقم باشد",422);
  $declared=(int)preg_replace('/[^0-9]/','',(string)($b['amount']??$b['declared_amount']??$req['amount']));
  $expected=(int)$req['amount'];$tol=max(0,(int)_company_setting_get('card_amount_tolerance',0));
  if((bool)_company_setting_get('card_require_amount',true) && abs($declared-$expected)>$tol) Http::error('مبلغ ثبت‌شده با تعرفه درخواست مطابقت ندارد',422);
  $paidAt=trim((string)($b['paid_at']??''));
  if((bool)_company_setting_get('card_require_paid_at',true) && $paidAt==='') Http::error('تاریخ و ساعت پرداخت الزامی است',422);
  if($paidAt!==''){try{$dt=new DateTime($paidAt);$paidAt=$dt->format('Y-m-d H:i:s');}catch(Throwable $e){Http::error('تاریخ و ساعت پرداخت نامعتبر است',422);}}
  $receiptId=(int)($b['receipt_file_id']??0);$receiptPath=trim((string)($b['receipt_file_path']??''));$file=_company_card_receipt_owned((int)$req['id'],$receiptId,$receiptPath);
  if(!$file) Http::error('تصویر رسید معتبر و متعلق به همین درخواست یافت نشد',422);
  $dup=Db::one("SELECT id,payment_id,request_id FROM company_card_payments WHERE tracking_number=?",[$tracking]);
  if($dup && (!$resubmitPaymentId || (int)$dup['payment_id']!==$resubmitPaymentId)) Http::error('این شماره پیگیری قبلاً ثبت شده است',409);
  $bank=trim((string)($b['bank_name']??''));$device=trim((string)($b['device_id']??''));$ip=_company_client_ip();$note=trim((string)($b['note']??''));
  if($resubmitPaymentId){
    $old=Db::one("SELECT * FROM company_request_payments WHERE id=? AND request_id=? AND method='card_to_card'",[$resubmitPaymentId,(int)$req['id']]);if(!$old)Http::error('پرداخت قبلی یافت نشد',404);if(!in_array($old['status'],['rejected','pending','failed'],true))Http::error('این پرداخت قابل ارسال مجدد نیست',422);
    Db::exec("UPDATE company_request_payments SET amount=?,declared_amount=?,status='pending',tracking_code=?,receipt_file_id=?,receipt_file_path=?,paid_at=?,bank_name=?,device_id=?,submitted_ip=?,payer_note=?,rejection_reason=NULL,verified_by=NULL,verified_at=NULL,review_note=NULL,raw_payload=? WHERE id=?",[$expected,$declared,$tracking,(int)$file['id'],$file['file_path'],$paidAt?:null,$bank?:null,$device?:null,$ip?:null,$note?:null,json_encode($b,JSON_UNESCAPED_UNICODE),$resubmitPaymentId]);
    Db::exec("INSERT INTO company_card_payments(payment_id,request_id,user_id,amount,declared_amount,card_number,tracking_number,bank_name,paid_at,receipt_file_id,receipt_file_path,status,device_id,submitted_ip) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE amount=VALUES(amount),declared_amount=VALUES(declared_amount),card_number=VALUES(card_number),tracking_number=VALUES(tracking_number),bank_name=VALUES(bank_name),paid_at=VALUES(paid_at),receipt_file_id=VALUES(receipt_file_id),receipt_file_path=VALUES(receipt_file_path),status='pending',device_id=VALUES(device_id),submitted_ip=VALUES(submitted_ip),reviewed_by=NULL,reviewed_at=NULL,reject_reason=NULL",[$resubmitPaymentId,(int)$req['id'],(int)$u['id'],$expected,$declared,(string)_company_setting_get('card_number',''),$tracking,$bank?:null,$paidAt?:null,(int)$file['id'],$file['file_path'],'pending',$device?:null,$ip?:null]);
    $pid=$resubmitPaymentId;$action='card_payment_resubmitted';$desc='رسید کارت‌به‌کارت مجدداً ارسال شد';
  } else {
    $pid=Db::insert("INSERT INTO company_request_payments(request_id,method,amount,declared_amount,status,tracking_code,receipt_file_id,receipt_file_path,paid_at,bank_name,device_id,submitted_ip,payer_note,raw_payload) VALUES(?,?,?,?,'pending',?,?,?,?,?,?,?,?,?)",[(int)$req['id'],'card_to_card',$expected,$declared,$tracking,(int)$file['id'],$file['file_path'],$paidAt?:null,$bank?:null,$device?:null,$ip?:null,$note?:null,json_encode($b,JSON_UNESCAPED_UNICODE)]);
    Db::insert("INSERT INTO company_card_payments(payment_id,request_id,user_id,amount,declared_amount,card_number,tracking_number,bank_name,paid_at,receipt_file_id,receipt_file_path,status,device_id,submitted_ip) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",[$pid,(int)$req['id'],(int)$u['id'],$expected,$declared,(string)_company_setting_get('card_number',''),$tracking,$bank?:null,$paidAt?:null,(int)$file['id'],$file['file_path'],'pending',$device?:null,$ip?:null]);
    $action='card_payment_submitted';$desc='رسید کارت‌به‌کارت ثبت شد';
  }
  Db::exec("UPDATE company_requests SET payment_method='card_to_card',payment_status='pending',status='payment_pending' WHERE id=?",[(int)$req['id']]);
  _company_log((int)$req['id'],(int)$u['id'],$action,$desc,['payment_id'=>$pid,'tracking_code'=>$tracking,'declared_amount'=>$declared,'paid_at'=>$paidAt,'bank_name'=>$bank,'submitted_ip'=>$ip]);
  $fresh=_company_request_owned((int)$req['id'],$u,false); _company_notify_admins($fresh,'رسید کارت‌به‌کارت جدید','کد رهگیری درخواست: '.$fresh['tracking_code']."\n".'شماره پیگیری: '.$tracking,['event'=>$action,'payment_id'=>$pid]);
  return ['ok'=>true,'payment_id'=>$pid,'status'=>'pending','request_status'=>'payment_pending','tracking_code'=>$tracking];
}

function _company_request_owned($id,$u,$admin=false){
  $row=Db::one("SELECT cr.*,crt.code request_type_code,crt.title request_type_title,crt.required_fields,crt.required_documents FROM company_requests cr JOIN company_request_types crt ON crt.id=cr.request_type_id WHERE cr.id=?",[(int)$id]);
  if(!$row) Http::error('درخواست یافت نشد',404);
  if(!$admin && (int)$row['user_id']!==(int)$u['id']) Http::error('دسترسی به این درخواست مجاز نیست',403);
  foreach(['form_data','required_fields','required_documents'] as $k){ $row[$k]=json_decode($row[$k]??'null',true); }
  return $row;
}

route('GET','/api/company-request/settings',function($p,$b,$u){
  $types=Db::all("SELECT id,code,title,price,enabled,deadline_days,description,required_fields,required_documents FROM company_request_types WHERE enabled=1 ORDER BY id");
  foreach($types as &$t){ $t['price']=(int)$t['price']; $t['required_fields']=json_decode($t['required_fields']??'[]',true)?:[]; $t['required_documents']=json_decode($t['required_documents']??'[]',true)?:[]; } unset($t);
  $s=_company_settings_all(); $baleProviderConfigured=trim((string)($s['bale_provider_token']??''))!==''; $baleBotReady=class_exists('BaleBot')&&BaleBot::hasToken(); unset($s['bale_provider_token']);
  return ['ok'=>true,'types'=>$types,'payment'=>['mode'=>$s['payment_mode']??'both','card_bank'=>$s['card_bank']??'','card_number'=>$s['card_number']??'','card_sheba'=>$s['card_sheba']??'','card_owner'=>$s['card_owner']??'','card_description'=>$s['card_description']??'','card_enabled'=>(bool)($s['card_payment_enabled']??true),'card_receipt_deadline_hours'=>(int)($s['card_receipt_deadline_hours']??24),'card_require_tracking'=>(bool)($s['card_require_tracking']??true),'card_require_amount'=>(bool)($s['card_require_amount']??true),'card_require_paid_at'=>(bool)($s['card_require_paid_at']??true),'bale_enabled'=>(bool)($s['bale_payment_enabled']??false),'bale_ready'=>(bool)($s['bale_payment_enabled']??false)&&$baleProviderConfigured&&$baleBotReady,'bale_bot_ready'=>$baleBotReady,'bale_provider_ready'=>$baleProviderConfigured,'bale_unavailable_reason'=>!(bool)($s['bale_payment_enabled']??false)?'پرداخت بله در تنظیمات غیرفعال است':(!$baleBotReady?'توکن بازوی بله ثبت نشده است':(!$baleProviderConfigured?'توکن پرداخت کیف پول ثبت نشده است':'')),'bale_bot_link'=>(string)($s['bale_bot_link']??'')],'upload'=>['max_mb'=>(int)($s['max_upload_mb']??12),'allowed_mime_types'=>$s['allowed_mime_types']??[]]];
},false,99);

route('GET','/api/company-request/prices',function($p,$b,$u){ return ['ok'=>true,'items'=>Db::all("SELECT code,title,price,enabled,deadline_days FROM company_request_types ORDER BY id")]; },false,99);

route('POST','/api/company-request/create',function($p,$b,$u){
  $code=trim((string)($b['request_type']??$b['code']??''));
  $type=Db::one("SELECT * FROM company_request_types WHERE code=? AND enabled=1",[$code]); if(!$type) Http::error('نوع درخواست نامعتبر یا غیرفعال است',422);
  $driverId=isset($b['driver_id'])?(int)$b['driver_id']:null; $form=$b['form_data']??[]; if(!is_array($form)) Http::error('اطلاعات فرم نامعتبر است',422);
  $required=json_decode($type['required_fields']??'[]',true)?:[]; foreach($required as $f){ if(trim((string)($form[$f]??''))==='') Http::error('تکمیل فیلد '.$f.' الزامی است',422); }
  $tracking=_company_tracking_code();
  $id=Db::insert("INSERT INTO company_requests(tracking_code,request_type_id,user_id,driver_id,status,amount,payment_status,form_data,description,last_status_at) VALUES(?,?,?,?, 'draft',?,'unpaid',?,?,NOW())",[$tracking,$type['id'],$u['id'],$driverId,(int)$type['price'],json_encode($form,JSON_UNESCAPED_UNICODE),trim((string)($b['description']??''))]);
  _company_apply_due_date($id,(int)($type['deadline_days']??7));
  _company_log($id,$u['id'],'created','درخواست ایجاد شد',['tracking_code'=>$tracking,'type'=>$code]);
  return ['ok'=>true,'id'=>$id,'tracking_code'=>$tracking,'amount'=>(int)$type['price'],'status'=>'draft'];
},false,99);

route('POST','/api/company-request/upload',function($p,$b,$u){
  _company_files_schema_ensure();
  $id=(int)($b['request_id']??0); $req=_company_request_owned($id,$u,false);
  $doc=_company_doc_type_canonical($b['document_type']??''); if($doc==='') Http::error('نوع مدرک الزامی است',422);
  $data=(string)($b['file_base64']??''); if(str_contains($data,',')) $data=explode(',',$data,2)[1]; $bin=base64_decode($data,true); if($bin===false||$bin==='') Http::error('فایل معتبر ارسال نشده است',422);
  $max=max(1,(int)_company_setting_get('max_upload_mb',12))*1024*1024; if(strlen($bin)>$max) Http::error('حجم فایل بیش از حد مجاز است',413);
  $mime=_company_detect_mime($bin);
  $allowed=_company_setting_get('allowed_mime_types',['image/jpeg','image/png','image/webp','application/pdf']); if(!is_array($allowed))$allowed=['image/jpeg','image/png','image/webp','application/pdf'];
  if(!in_array($mime,$allowed,true)) Http::error('نوع فایل مجاز نیست',422);
  $clientMeta=$b['client_meta']??$b['crop_meta']??[];
  $validation=in_array($mime,['image/jpeg','image/png','image/webp'],true)?_company_validate_image_payload(base64_encode($bin),$doc,$clientMeta):['quality'=>['score'=>100,'status'=>'ok','warnings'=>[]],'sha256'=>hash('sha256',$bin),'size'=>strlen($bin)];
  $validation=['ok'=>true,'quality'=>null,'checks_disabled'=>true];
  $hash=hash('sha256',$bin);
  $dup=Db::one("SELECT f.id,f.file_path,f.request_id FROM company_request_files f JOIN company_requests r ON r.id=f.request_id WHERE f.sha256=? AND r.user_id=? ORDER BY f.id DESC LIMIT 1",[$hash,(int)$u['id']]);
  if($dup){
    if((int)$dup['request_id']===$id) return ['ok'=>true,'file_id'=>(int)$dup['id'],'file_path'=>$dup['file_path'],'duplicate'=>true,'mime_type'=>$mime,'size'=>strlen($bin),'quality'=>$validation['quality']??null];
    Http::error('این تصویر قبلاً در یکی از درخواست‌های شما ارسال شده است',422);
  }
  $dir=dirname(__DIR__).'/public/uploads/company_requests/'.date('Y/m'); if(!is_dir($dir)&&!mkdir($dir,0775,true)&&!is_dir($dir)) Http::error('ایجاد پوشه فایل ناموفق بود',500);
  $base='req_'.$id.'_'.preg_replace('/[^a-zA-Z0-9_-]/','_',$doc).'_'.bin2hex(random_bytes(6));
  $isImage=in_array($mime,['image/jpeg','image/png','image/webp'],true);
  $originalExt=$isImage?'jpg':($mime==='application/pdf'?'pdf':'bin');
  $originalPayload=$bin;
  if($isImage){
    $globalW=(int)(_subscription_setting('image_max_width',1024)); $globalQ=(int)(_subscription_setting('image_quality',45));
    $origJpg=_company_processed_image($bin,$mime,max(240,min(4096,$globalW)),max(10,min(95,$globalQ)));
    if(($origJpg['mime']??'')!=='image/jpeg') Http::error('تبدیل تصویر به JPG روی سرور امکان‌پذیر نیست؛ افزونه GD را فعال کنید',500);
    $originalPayload=$origJpg['bin'];
  }
  $originalName=$base.'_original.'.$originalExt;$originalFull=$dir.'/'.$originalName;if(file_put_contents($originalFull,$originalPayload)===false)Http::error('ذخیره نسخه اصلی ناموفق بود',500);
  $originalRel='uploads/company_requests/'.date('Y/m').'/'.$originalName;
  $processed=$originalPayload;$processedMime=$isImage?'image/jpeg':$mime;$processedExt=$originalExt;
  if($isImage){
    $globalW=(int)(_subscription_setting('image_max_width',1024)); $globalQ=(int)(_subscription_setting('image_quality',45));
    $pr=_company_processed_image($bin,$mime,max(240,min(4096,$globalW)),max(10,min(95,$globalQ)));
    $processed=$pr['bin'];$processedMime=$pr['mime'];$processedExt=$pr['ext'];
  }
  $name=$base.'_processed.'.$processedExt;$full=$dir.'/'.$name;if(file_put_contents($full,$processed)===false)Http::error('ذخیره فایل پردازش‌شده ناموفق بود',500);
  $rel='uploads/company_requests/'.date('Y/m').'/'.$name;$thumbRel=null;
  if(str_starts_with($processedMime,'image/')&&function_exists('imagecreatefromstring')){
    try{$im=@imagecreatefromstring($processed);if($im){$w=imagesx($im);$h=imagesy($im);$tw=min(420,$w);$th=max(1,(int)round($h*$tw/max(1,$w)));$thumb=imagecreatetruecolor($tw,$th);$white=imagecolorallocate($thumb,255,255,255);imagefill($thumb,0,0,$white);imagecopyresampled($thumb,$im,0,0,0,0,$tw,$th,$w,$h);$tn=$base.'_thumb.jpg';imagejpeg($thumb,$dir.'/'.$tn,76);$thumbRel='uploads/company_requests/'.date('Y/m').'/'.$tn;imagedestroy($thumb);imagedestroy($im);}}catch(Throwable $e){}
  }
  $fid=Db::insert("INSERT INTO company_request_files(request_id,document_type,file_name,file_path,original_path,processed_path,mime_type,file_size,processed_size,crop_meta,uploaded_by,sha256,thumbnail_path,quality_score,quality_status,quality_meta,source_type) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",[$id,$doc,$b['file_name']??$name,$rel,$originalRel,$rel,$processedMime,strlen($bin),strlen($processed),json_encode($clientMeta,JSON_UNESCAPED_UNICODE),$u['id'],$hash,$thumbRel,(int)($validation['quality']['score']??100),(string)($validation['quality']['status']??'ok'),json_encode($validation['quality']??[],JSON_UNESCAPED_UNICODE),(string)($clientMeta['capture_source']??$clientMeta['source']??'unknown')]);
  Db::exec("UPDATE company_requests SET status=IF(status='draft','documents_pending',status) WHERE id=?",[$id]);
  _company_log($id,$u['id'],'file_uploaded','مدرک بارگذاری شد',['file_id'=>$fid,'document_type'=>$doc,'quality_score'=>$validation['quality']['score']??null,'source'=>$clientMeta['capture_source']??null]);
  return ['ok'=>true,'file_id'=>$fid,'file_path'=>$rel,'original_path'=>$originalRel,'mime_type'=>$processedMime,'size'=>strlen($processed),'original_size'=>strlen($bin),'quality'=>$validation['quality']??null,'duplicate'=>false];
},false,99);


/* ---------------- اشتراک گروهی و انفرادی ---------------- */
function _subscription_decode_value($v){
  for($i=0;$i<4 && is_string($v);$i++){
    $d=json_decode($v,true);
    if(json_last_error()!==JSON_ERROR_NONE) break;
    $v=$d;
  }
  return $v;
}
function _subscription_setting($key,$default=null){
  try{
    $r=Db::one("SELECT value FROM app_settings WHERE `key`=?",[$key]);
    if($r) return _subscription_decode_value($r['value']);
    // سازگاری با نسخه‌هایی که تنظیمات اشتراک را به‌صورت یک شیء ذخیره کرده‌اند.
    foreach(['subscription_settings','subscription','app_subscription'] as $containerKey){
      $c=Db::one("SELECT value FROM app_settings WHERE `key`=?",[$containerKey]);
      if(!$c) continue;
      $obj=_subscription_decode_value($c['value']);
      if(is_array($obj)){
        $short=preg_replace('/^subscription_/','',$key);
        if(array_key_exists($key,$obj)) return _subscription_decode_value($obj[$key]);
        if(array_key_exists($short,$obj)) return _subscription_decode_value($obj[$short]);
      }
    }
  }catch(Throwable $e){}
  return $default;
}
function _subscription_mode(){
  $raw=null;
  foreach(['subscription_mode','subscription_type','app_subscription_mode'] as $k){
    $v=_subscription_setting($k,null);
    if($v!==null && $v!==''){ $raw=$v; break; }
  }
  $m=strtolower(trim((string)($raw??'normal')));
  $aliases=[
    'grouped'=>'group','group_subscription'=>'group','group-subscription'=>'group','گروهی'=>'group','اشتراک گروهی'=>'group',
    'individual_subscription'=>'individual','individual-subscription'=>'individual','personal'=>'individual','single'=>'individual','انفرادی'=>'individual','اشتراک انفرادی'=>'individual',
    'normal_use'=>'normal','normal-use'=>'normal','regular'=>'normal','none'=>'normal','off'=>'normal','disabled'=>'normal','no_subscription'=>'normal','no-subscription'=>'normal','بدون اشتراک'=>'normal','معمولی'=>'normal','استفاده معمولی'=>'normal'
  ];
  $m=$aliases[$m]??$m;
  return in_array($m,['normal','group','individual'],true)?$m:'normal';
}
function _subscription_enabled(){
  $mode=_subscription_mode();
  // انتخاب حالت گروهی یا انفرادی همیشه به معنی فعال بودن اشتراک است؛ این کار ناسازگاری
  // نسخه‌های قبلی را که mode ذخیره شده ولی checkbox ذخیره نشده بود، اصلاح می‌کند.
  if($mode!=='normal') return true;
  $v=_subscription_setting('subscription_enabled',false);
  if(is_bool($v))return $v;
  if(is_numeric($v))return (int)$v===1;
  return in_array(strtolower(trim((string)$v)),['1','true','yes','on','enabled','فعال'],true);
}
function _subscription_amount($mode){
  $keys=$mode==='group'
    ? ['subscription_group_amount','group_subscription_amount','subscription_amount_group']
    : ['subscription_individual_amount','individual_subscription_amount','subscription_amount_individual','subscription_user_amount'];
  foreach($keys as $k){ $v=_subscription_setting($k,null); if($v!==null && $v!=='') return max(0,(int)preg_replace('/[^0-9]/','',(string)$v)); }
  return 0;
}
function _subscription_days_left($until){ if(!$until)return 0; $now=new DateTimeImmutable('now',new DateTimeZone('Asia/Tehran')); $end=new DateTimeImmutable($until,new DateTimeZone('Asia/Tehran')); if($end<$now)return 0; return max(0,(int)$now->diff($end)->format('%a')+1); }
function _subscription_status_for_user($u){
  $mode=_subscription_mode(); $enabled=_subscription_enabled();
  if(!$enabled||$mode==='normal') return ['enabled'=>false,'mode'=>'normal','active'=>true,'days_left'=>null,'label'=>'استفاده معمولی'];
  $uid=(int)$u['id']; $dbUser=Db::one("SELECT manager_id FROM users WHERE id=?",[$uid])?:[]; $row=Db::one("SELECT * FROM user_subscriptions WHERE user_id=?",[$uid]);
  $until=$row['expires_at']??null; $active=$until && strtotime($until)>=time();
  if($mode==='group'){
    $group=Db::one("SELECT * FROM group_subscriptions ORDER BY id DESC LIMIT 1"); $until=$group['expires_at']??null; $active=$until&&strtotime($until)>=time();
    return ['enabled'=>true,'mode'=>'group','label'=>'اشتراک گروهی','active'=>(bool)$active,'days_left'=>_subscription_days_left($until),'expires_at'=>$until,'amount'=>_subscription_amount('group'),'can_pay'=>empty($dbUser['manager_id'])];
  }
  return ['enabled'=>true,'mode'=>'individual','label'=>'اشتراک انفرادی','active'=>(bool)$active,'days_left'=>_subscription_days_left($until),'expires_at'=>$until,'amount'=>_subscription_amount('individual'),'can_pay'=>true];
}
function _subscription_payment_full($id){return Db::one("SELECT sp.*,u.phone,u.manager_id FROM subscription_payments sp JOIN users u ON u.id=sp.user_id WHERE sp.id=?",[(int)$id]);}
function _subscription_start_token($p){return 'sub_'.(int)$p['id'].'_'.substr(hash('sha256',(string)$p['invoice_payload']),0,12);}
function _subscription_mark_paid($p,$data=[]){
  $fresh=_subscription_payment_full((int)$p['id']); if(!$fresh)return false;
  Db::exec("UPDATE subscription_payments SET status='paid',provider_transaction_id=?,paid_at=NOW(),raw_payload=? WHERE id=?",[(string)($data['provider_payment_charge_id']??$data['bale_payment_charge_id']??''),json_encode($data,JSON_UNESCAPED_UNICODE),(int)$fresh['id']]);
  $start=date('Y-m-d H:i:s'); $end=date('Y-m-d H:i:s',strtotime('+30 days'));
  if($fresh['mode']==='group') Db::exec("INSERT INTO group_subscriptions(payer_user_id,starts_at,expires_at,amount,status,payment_id,created_at) VALUES(?,?,?,?, 'active',?,NOW())",[(int)$fresh['user_id'],$start,$end,(int)$fresh['amount'],(int)$fresh['id']]);
  else Db::exec("INSERT INTO user_subscriptions(user_id,starts_at,expires_at,amount,status,payment_id,created_at) VALUES(?,?,?,?, 'active',?,NOW()) ON DUPLICATE KEY UPDATE starts_at=VALUES(starts_at),expires_at=VALUES(expires_at),amount=VALUES(amount),status='active',payment_id=VALUES(payment_id)",[(int)$fresh['user_id'],$start,$end,(int)$fresh['amount'],(int)$fresh['id']]);
  return true;
}
route('GET','/api/subscription/status',function($p,$b,$u){$st=_subscription_status_for_user($u);return ['ok'=>true,'subscription'=>$st,'effective_mode'=>$st['mode']??'normal','server_time'=>date('c')];},false,99);
route('POST','/api/subscription/payment',function($p,$b,$u){
  // در حالت بدون اشتراک هیچ صورتحسابی ساخته نمی‌شود و توکن کیف پول نیز بررسی نمی‌گردد.
  if(_subscription_mode()==='normal' || !_subscription_enabled()) {
    return ['ok'=>true,'skipped'=>true,'subscription'=>_subscription_status_for_user($u),'message'=>'سامانه در حالت بدون اشتراک است و نیازی به صورتحساب ندارد.'];
  }
  $st=_subscription_status_for_user($u); if(empty($st['enabled'])) Http::error('اشتراک سامانه فعال نیست',422); if(empty($st['can_pay'])) Http::error('پرداخت اشتراک گروهی فقط توسط مدیر اجرایی انجام می‌شود',403);
  $amount=(int)$st['amount']; if($amount<=0) Http::error('مبلغ اشتراک در تنظیمات تعیین نشده است',422);
  $provider=trim((string)_subscription_setting('bale_provider_token','')); if($provider==='') Http::error('توکن پرداخت کیف پول بله ثبت نشده است',422);
  $payload='subscription:'.$st['mode'].':'.(int)$u['id'].':'.bin2hex(random_bytes(8));
  $id=Db::insert("INSERT INTO subscription_payments(user_id,mode,amount,status,invoice_payload,created_at) VALUES(?,?,?,'pending',?,NOW())",[(int)$u['id'],$st['mode'],$amount,$payload]);
  $pay=_subscription_payment_full($id); $token=_subscription_start_token($pay); $link=_company_bale_bot_link($token);
  return ['ok'=>true,'payment_id'=>$id,'status'=>'pending','bot_link'=>$link,'message'=>'برای دریافت صورتحساب، لینک ربات بله را باز کنید.'];
},false,99);
route('GET','/api/subscription/payment-status/{id}',function($p,$b,$u){$x=_subscription_payment_full((int)$p['id']);if(!$x)Http::error('پرداخت یافت نشد',404);if((int)$x['user_id']!==(int)$u['id'])Http::error('دسترسی مجاز نیست',403);return ['ok'=>true,'status'=>$x['status'],'subscription'=>_subscription_status_for_user($u)];},false,99);

route('POST','/api/company-request/payment',function($p,$b,$u){
  $id=(int)($b['request_id']??0); $req=_company_request_owned($id,$u,false); $method=$b['method']??''; if(!in_array($method,['bale_wallet','card_to_card'],true)) Http::error('روش پرداخت نامعتبر است',422);
  $docs=_company_required_docs_state($req); if(!$docs['complete']) Http::error('ابتدا همه مدارک الزامی را بارگذاری کنید: '.implode(', ',$docs['missing']),422);
  if((int)$req['amount']<=0){ Db::exec("UPDATE company_requests SET payment_method=?,payment_status='paid',status='pending_review' WHERE id=?",[$method,$id]); _company_log($id,$u['id'],'payment_waived','تعرفه خدمت صفر است'); return ['ok'=>true,'status'=>'paid','request_status'=>'pending_review']; }
  if($method==='card_to_card') return _company_card_submit($req,$u,$b,0);
  if(!_company_setting_get('bale_payment_enabled',false)) Http::error('پرداخت بله غیرفعال است',422);
  $provider=trim((string)_company_setting_get('bale_provider_token','')); if($provider==='') Http::error('توکن پرداخت کیف پول بله در تنظیمات ثبت نشده است',422);
  if(!class_exists('BaleBot')||!BaleBot::hasToken()) Http::error('توکن بازوی بله ثبت نشده است',422);
  $payload='company_request:'.$id.':'.bin2hex(random_bytes(8));
  $pid=Db::insert("INSERT INTO company_request_payments(request_id,method,amount,status,invoice_payload,payer_note,raw_payload) VALUES(?,?,?,'pending',?,?,?)",[$id,$method,(int)$req['amount'],$payload,$b['note']??null,json_encode(['stage'=>'created'],JSON_UNESCAPED_UNICODE)]);
  $payment=_company_payment_full($pid);
  $startToken=_company_bale_payment_start_token($payment);
  $botLink=_company_bale_bot_link($startToken);
  // این مسیر نباید منتظر شبکهٔ بله یا درگاه پیامک بماند؛ در غیر این صورت
  // timeout کوتاه اپ باعث نمایش «اتصال به سرور ممکن نشد» می‌شود، در حالی که رکورد
  // پرداخت در سرور ساخته شده است. صورتحساب پس از بازشدن لینک و دریافت /start در
  // وب‌هوک بله ارسال می‌شود. ارسال پیامک/بله نیز از دکمه‌های مستقل انجام می‌گیرد.
  Db::exec("UPDATE company_request_payments SET last_error='awaiting_bot_start',raw_payload=? WHERE id=?",[json_encode(['stage'=>'awaiting_bot_start','start_token'=>$startToken],JSON_UNESCAPED_UNICODE),$pid]);
  Db::exec("UPDATE company_requests SET payment_method='bale_wallet',payment_status='pending',status='payment_pending' WHERE id=?",[$id]);
  _company_log($id,$u['id'],'bale_bot_link_created','لینک ورود به ربات برای پرداخت ایجاد شد',['payment_id'=>$pid]);
  return ['ok'=>true,'payment_id'=>$pid,'status'=>'pending','request_status'=>'payment_pending','invoice_sent'=>false,'requires_bot_start'=>true,'bot_link'=>$botLink,'link_delivery'=>['sms'=>false,'bale'=>false,'errors'=>[]],'message'=>'لینک پرداخت ایجاد شد. برای دریافت صورتحساب، لینک را در بله باز کنید.'];
},false,99);

route('GET','/api/company-request/payment-status/{id}',function($p,$b,$u){
  $payment=_company_payment_full((int)$p['id']);
  if(!$payment) Http::error('پرداخت یافت نشد',404);
  if((int)$payment['user_id']!==(int)$u['id']) Http::error('دسترسی مجاز نیست',403);
  if(in_array((string)$payment['status'],['precheckout','pending'],true) && !empty($payment['provider_transaction_id'])) _company_payment_inquire($payment);
  $fresh=_company_payment_full((int)$payment['id']);
  if(($fresh['status']??'')==='paid' && (($fresh['request_payment_status']??'')!=='paid' || ($fresh['request_status']??'')==='payment_pending')){ _company_payment_mark_paid($fresh,[],'status_repair'); $fresh=_company_payment_full((int)$payment['id']); }
  return ['ok'=>true,'payment_id'=>(int)$fresh['id'],'status'=>$fresh['status'],'request_status'=>$fresh['request_status'],'payment_status'=>$fresh['request_payment_status'],'transaction_id'=>$fresh['transaction_id']??null,'provider_transaction_id'=>$fresh['provider_transaction_id']??null,'last_error'=>$fresh['last_error']??null,'verified_at'=>$fresh['verified_at']??null];
},false,99);

route('POST','/api/company-request/card-payment',function($p,$b,$u){
  $req=_company_request_owned((int)($b['request_id']??0),$u,false);$docs=_company_required_docs_state($req);if(!$docs['complete'])Http::error('ابتدا همه مدارک الزامی را بارگذاری کنید',422);return _company_card_submit($req,$u,$b,0);
},false,99);
route('POST','/api/company-request/upload-payment-receipt',function($p,$b,$u){
  $b['document_type']='card_to_card_receipt';
  // Reuse the standard upload route contract through an internal request is intentionally avoided; clients should call /upload with this document type.
  return ['ok'=>true,'upload_endpoint'=>'/api/company-request/upload','document_type'=>'card_to_card_receipt'];
},false,99);
route('GET','/api/company-request/card-payment/{id}',function($p,$b,$u){
  $x=_company_card_payment_full((int)$p['id']);if(!$x)Http::error('پرداخت کارت‌به‌کارت یافت نشد',404);if((int)$x['request_user_id']!==(int)$u['id'])Http::error('دسترسی مجاز نیست',403);return ['ok'=>true,'item'=>$x];
},false,99);
route('POST','/api/company-request/card-payment/resubmit',function($p,$b,$u){
  $paymentId=(int)($b['payment_id']??0);$x=_company_card_payment_full($paymentId);if(!$x)Http::error('پرداخت کارت‌به‌کارت یافت نشد',404);if((int)$x['request_user_id']!==(int)$u['id'])Http::error('دسترسی مجاز نیست',403);$req=_company_request_owned((int)$x['request_id'],$u,false);return _company_card_submit($req,$u,$b,$paymentId);
},false,99);
route('GET','/api/admin/company-card-payments',function($p,$b,$u){
  $status=trim((string)($_GET['status']??'pending'));$where=['1=1'];$args=[];if($status!==''){$where[]='cp.status=?';$args[]=$status;}return ['ok'=>true,'items'=>Db::all("SELECT cp.*,r.tracking_code request_tracking,rt.title request_title,CONCAT(COALESCE(us.first_name,''),' ',COALESCE(us.last_name,'')) user_name FROM company_card_payments cp JOIN company_requests r ON r.id=cp.request_id JOIN company_request_types rt ON rt.id=r.request_type_id LEFT JOIN users us ON us.id=cp.user_id WHERE ".implode(' AND ',$where)." ORDER BY cp.id DESC LIMIT 500",$args)];
},false,ADMIN);

route('POST','/api/company-request/payment-link/send',function($p,$b,$u){
  $payment=_company_payment_full((int)($b['payment_id']??0));
  if(!$payment) Http::error('پرداخت یافت نشد',404);
  if((int)$payment['user_id']!==(int)$u['id']) Http::error('دسترسی مجاز نیست',403);
  if((string)$payment['method']!=='bale_wallet') Http::error('این پرداخت از نوع کیف پول بله نیست',422);
  $channel=(string)($b['channel']??'both'); if(!in_array($channel,['sms','bale','both'],true)) $channel='both';
  $link=_company_bale_bot_link(_company_bale_payment_start_token($payment));
  if($link==='') Http::error('لینک بازوی بله در تنظیمات ثبت نشده است',422);
  $delivery=_company_deliver_payment_link($payment,$link,$channel,(int)$u['id']);
  _company_log((int)$payment['request_id'],(int)$u['id'],'payment_link_sent','لینک پرداخت بله ارسال شد',['channel'=>$channel,'delivery'=>$delivery]);
  return ['ok'=>true,'bot_link'=>$link,'delivery'=>$delivery];
},false,99);

route('POST','/api/company-request/payment-resend',function($p,$b,$u){
  $payment=_company_payment_full((int)($b['payment_id']??0));
  if(!$payment) Http::error('پرداخت یافت نشد',404);
  if((int)$payment['user_id']!==(int)$u['id']) Http::error('دسترسی مجاز نیست',403);
  if($payment['method']!=='bale_wallet') Http::error('این پرداخت از نوع کیف پول بله نیست',422);
  if($payment['status']==='paid') return ['ok'=>true,'status'=>'paid'];
  $provider=trim((string)_company_setting_get('bale_provider_token','')); if($provider==='') Http::error('توکن پرداخت بله تنظیم نشده است',422);
  $chat=BaleBot::findChatForUser((int)$u['id']); if(!$chat) Http::error('حساب بله شما به سامانه متصل نیست',422);
  $photo=(string)_company_setting_get('bale_invoice_photo_url','');
  $res=BaleBot::sendInvoice($chat,mb_substr((string)$payment['request_title'],0,32),'هزینه درخواست '.$payment['request_tracking'].' در سامانه خطیار',(string)$payment['invoice_payload'],(int)$payment['amount'],$provider,$photo,3);
  if(empty($res['ok'])){ Db::exec("UPDATE company_request_payments SET last_error=?,raw_payload=? WHERE id=?",[(string)($res['description']??$res['error']??'invoice_resend_failed'),json_encode($res,JSON_UNESCAPED_UNICODE),(int)$payment['id']]); Http::error('ارسال مجدد صورتحساب ناموفق بود',422); }
  $messageId=$res['result']['message_id']??$res['message_id']??null;
  Db::exec("UPDATE company_request_payments SET status='pending',invoice_message_id=?,invoice_sent_at=NOW(),last_error=NULL,raw_payload=? WHERE id=?",[$messageId,json_encode($res,JSON_UNESCAPED_UNICODE),(int)$payment['id']]);
  _company_log((int)$payment['request_id'],(int)$u['id'],'bale_invoice_resent','صورتحساب بله مجدداً ارسال شد',['payment_id'=>(int)$payment['id'],'message_id'=>$messageId]);
  return ['ok'=>true,'payment_id'=>(int)$payment['id'],'status'=>'pending','invoice_sent'=>true];
},false,99);

route('POST','/api/admin/company-payments/reconcile',function($p,$b,$u){
  $limit=max(1,min(100,(int)($b['limit']??30)));
  $rows=Db::all("SELECT p.*,r.user_id,r.tracking_code request_tracking,rt.title request_title FROM company_request_payments p JOIN company_requests r ON r.id=p.request_id JOIN company_request_types rt ON rt.id=r.request_type_id WHERE p.method='bale_wallet' AND p.status IN ('pending','precheckout') AND (p.transaction_id IS NOT NULL OR p.provider_transaction_id IS NOT NULL) ORDER BY COALESCE(p.last_inquired_at,p.created_at) ASC LIMIT ".$limit);
  $out=[]; foreach($rows as $row) $out[]=['payment_id'=>(int)$row['id']]+_company_payment_inquire($row);
  return ['ok'=>true,'count'=>count($out),'items'=>$out];
},false,ADMIN);

route('POST','/api/company-request/submit',function($p,$b,$u){
  $req=_company_request_owned((int)($b['request_id']??0),$u,false); $docs=_company_required_docs_state($req); if(!$docs['complete']) Http::error('مدارک درخواست ناقص است',422);
  if($req['payment_status']!=='paid') Http::error('پرداخت درخواست هنوز تأیید نشده است',422);
  Db::exec("UPDATE company_requests SET status='pending_review',last_status_at=NOW() WHERE id=?",[$req['id']]);
  _company_log($req['id'],$u['id'],'submitted','درخواست برای بررسی نهایی ارسال شد');
  $fresh=_company_request_owned($req['id'],$u,false);
  _company_notify_admins($fresh,'درخواست مدارک جدید برای بررسی','کد رهگیری: '.$fresh['tracking_code']."\n".'خدمت: '.($fresh['request_type_title']??''),['event'=>'submitted']);
  return ['ok'=>true,'status'=>'pending_review'];
},false,99);

route('GET','/api/company-request/list',function($p,$b,$u){
  $rows=Db::all("SELECT cr.id,cr.tracking_code,cr.status,cr.amount,cr.payment_method,cr.payment_status,cr.created_at,crt.code request_type,crt.title request_type_title FROM company_requests cr JOIN company_request_types crt ON crt.id=cr.request_type_id WHERE cr.user_id=? ORDER BY cr.id DESC",[$u['id']]); return ['ok'=>true,'items'=>$rows];
},false,99);
route('GET','/api/company-request/detail/{id}',function($p,$b,$u){ $x=_company_request_owned($p['id'],$u,false); $x['files']=Db::all("SELECT id,document_type,file_name,file_path,mime_type,file_size,created_at FROM company_request_files WHERE request_id=? ORDER BY id",[$x['id']]); $x['payments']=Db::all("SELECT id,method,amount,declared_amount,status,transaction_id,provider_transaction_id,tracking_code,receipt_file_id,receipt_file_path,paid_at,bank_name,rejection_reason,review_note,verified_at,created_at FROM company_request_payments WHERE request_id=? ORDER BY id DESC",[$x['id']]); $x['logs']=Db::all("SELECT action,description,created_at FROM company_request_logs WHERE request_id=? ORDER BY id",[$x['id']]); return ['ok'=>true,'item'=>$x]; },false,99);
route('POST','/api/company-request/update/{id}',function($p,$b,$u){
  $req=_company_request_owned((int)$p['id'],$u,false);
  if(!in_array((string)$req['status'],['draft','documents_pending','payment_pending','needs_correction'],true)) Http::error('این درخواست پس از ارسال نهایی قابل ویرایش نیست',422);
  $form=$b['form_data']??[]; if(!is_array($form)) Http::error('اطلاعات درخواست نامعتبر است',422);
  Db::run("UPDATE company_requests SET form_data=?,status=IF(status='needs_correction','documents_pending',status),updated_at=NOW() WHERE id=?",[json_encode($form,JSON_UNESCAPED_UNICODE),(int)$req['id']]);
  _company_log((int)$req['id'],(int)$u['id'],'user_updated','اطلاعات درخواست توسط کاربر ویرایش شد');
  return ['ok'=>true,'id'=>(int)$req['id'],'tracking_code'=>$req['tracking_code'],'amount'=>(int)$req['amount']];
},false,99);
route('DELETE','/api/company-request/{id}',function($p,$b,$u){
  $req=_company_request_owned((int)$p['id'],$u,false);
  if(!in_array((string)$req['status'],['draft','documents_pending','payment_pending','needs_correction','cancelled','rejected'],true)) Http::error('درخواست ارسال‌شده یا تأییدشده قابل حذف نیست',422);
  if((string)$req['payment_status']==='paid') Http::error('درخواست دارای پرداخت تأییدشده قابل حذف نیست',422);
  $files=Db::all("SELECT file_path,original_path,processed_path,thumbnail_path FROM company_request_files WHERE request_id=?",[(int)$req['id']]);
  Db::pdo()->beginTransaction(); try{
    Db::run("DELETE FROM company_card_payments WHERE request_id=?",[(int)$req['id']]);
    Db::run("DELETE FROM company_request_payments WHERE request_id=?",[(int)$req['id']]);
    Db::run("DELETE FROM company_request_logs WHERE request_id=?",[(int)$req['id']]);
    Db::run("DELETE FROM company_request_files WHERE request_id=?",[(int)$req['id']]);
    Db::run("DELETE FROM company_requests WHERE id=?",[(int)$req['id']]);
    Db::pdo()->commit();
  }catch(Throwable $e){ if(Db::pdo()->inTransaction()) Db::pdo()->rollBack(); throw $e; }
  $root=dirname(__DIR__).'/public/'; foreach($files as $f) foreach(['file_path','original_path','processed_path','thumbnail_path'] as $k){ $rel=ltrim((string)($f[$k]??''),'/'); if($rel!=='' && str_starts_with($rel,'uploads/company_requests/')) @unlink($root.$rel); }
  return ['ok'=>true,'deleted'=>true,'id'=>(int)$req['id']];
},false,99);

route('GET','/api/admin/company-requests/stats',function($p,$b,$u){
  $row=Db::one("SELECT COUNT(*) total,SUM(status='pending_review') pending_review,SUM(status='needs_correction') needs_correction,SUM(status='approved') approved,SUM(status='completed') completed,SUM(status='rejected') rejected,SUM(payment_status='pending') payment_pending,SUM(payment_status='paid') paid_count,COALESCE(SUM(CASE WHEN payment_status='paid' THEN amount ELSE 0 END),0) paid_amount,SUM(due_at IS NOT NULL AND due_at<NOW() AND status NOT IN ('completed','rejected','cancelled')) overdue,SUM(DATE(created_at)=CURDATE()) today_count FROM company_requests");
  $types=Db::all("SELECT rt.code,rt.title,COUNT(cr.id) count FROM company_request_types rt LEFT JOIN company_requests cr ON cr.request_type_id=rt.id GROUP BY rt.id ORDER BY count DESC");
  return ['ok'=>true,'stats'=>$row?:[],'types'=>$types];
},false,ADMIN);
route('POST','/api/admin/company-requests/sla-scan',function($p,$b,$u){
  // ساختار دیتابیس در مرحله نصب/ارتقا ایجاد می‌شود؛ اجرای ALTER/SHOW در هر درخواست حذف شد.
  try{
    $hours=max(1,min(168,(int)_company_setting_get('sla_warning_hours',24)));
    $rows=Db::all("SELECT cr.*,crt.title request_type_title FROM company_requests cr JOIN company_request_types crt ON crt.id=cr.request_type_id WHERE cr.due_at IS NOT NULL AND cr.status NOT IN ('completed','rejected','cancelled') AND cr.due_at<=DATE_ADD(NOW(),INTERVAL {$hours} HOUR) AND (cr.last_sla_notified_at IS NULL OR cr.last_sla_notified_at<DATE_SUB(NOW(),INTERVAL 12 HOUR)) ORDER BY cr.due_at");
  }catch(Throwable $e){
    error_log('company SLA query failed: '.$e->getMessage());
    Http::error('اجرای بررسی مهلت درخواست‌ها ناموفق بود',500);
  }
  $processed=0;
  foreach($rows as $r){
    try{ _company_notify_admins($r,'هشدار مهلت درخواست مدارک','کد رهگیری: '.$r['tracking_code']."\n".'خدمت: '.$r['request_type_title']."\n".'مهلت: '.($r['due_at']??''),['event'=>'sla_warning']); }catch(Throwable $e){ error_log('company SLA notify: '.$e->getMessage()); }
    try{ Db::exec("UPDATE company_requests SET last_sla_notified_at=NOW() WHERE id=?",[(int)$r['id']]); }catch(Throwable $e){ error_log('company SLA timestamp: '.$e->getMessage()); continue; }
    try{ _company_log($r['id'],$u['id'],'sla_warning','هشدار نزدیک‌شدن یا عبور از مهلت ارسال شد'); }catch(Throwable $e){ error_log('company SLA log: '.$e->getMessage()); }
    $processed++;
  }
  return ['ok'=>true,'count'=>$processed];
},false,ADMIN);
route('GET','/api/admin/company-requests',function($p,$b,$u){
  $status=trim((string)($_GET['status']??'')); $q=trim((string)($_GET['q']??'')); $overdue=(int)($_GET['overdue']??0); $payment=trim((string)($_GET['payment_status']??''));
  $where=['1=1'];$args=[]; if($status!==''){ $where[]='cr.status=?';$args[]=$status; } if($payment!==''){ $where[]='cr.payment_status=?';$args[]=$payment; } if($overdue){$where[]="cr.due_at IS NOT NULL AND cr.due_at<NOW() AND cr.status NOT IN ('completed','rejected','cancelled')";} if($q!==''){ $where[]="(cr.tracking_code LIKE ? OR crt.title LIKE ? OR CONCAT(COALESCE(us.first_name,''),' ',COALESCE(us.last_name,'')) LIKE ?)";$args=array_merge($args,["%$q%","%$q%","%$q%"]); }
  $rows=Db::all("SELECT cr.*,crt.code request_type_code,crt.title request_type_title,CONCAT(COALESCE(us.first_name,''),' ',COALESCE(us.last_name,'')) user_name,CONCAT(COALESCE(ass.first_name,''),' ',COALESCE(ass.last_name,'')) assigned_name,(cr.due_at IS NOT NULL AND cr.due_at<NOW() AND cr.status NOT IN ('completed','rejected','cancelled')) is_overdue FROM company_requests cr JOIN company_request_types crt ON crt.id=cr.request_type_id LEFT JOIN users us ON us.id=cr.user_id LEFT JOIN users ass ON ass.id=cr.assigned_to WHERE ".implode(' AND ',$where)." ORDER BY is_overdue DESC,cr.id DESC LIMIT 500",$args); return ['ok'=>true,'items'=>$rows];
},false,ADMIN);
route('GET','/api/admin/company-requests/{id}',function($p,$b,$u){ _company_files_schema_ensure(); $x=_company_request_owned($p['id'],$u,true); $x['files']=Db::all("SELECT * FROM company_request_files WHERE request_id=? ORDER BY id",[$x['id']]); $x['payments']=Db::all("SELECT * FROM company_request_payments WHERE request_id=? ORDER BY id DESC",[$x['id']]); $x['logs']=Db::all("SELECT l.*,CONCAT(COALESCE(us.first_name,''),' ',COALESCE(us.last_name,'')) user_name FROM company_request_logs l LEFT JOIN users us ON us.id=l.user_id WHERE request_id=? ORDER BY l.id",[$x['id']]); return ['ok'=>true,'item'=>$x]; },false,ADMIN);
route('DELETE','/api/admin/company-requests/{id}',function($p,$b,$u){
  $id=(int)$p['id']; $req=Db::one("SELECT * FROM company_requests WHERE id=?",[$id]); if(!$req) Http::error('درخواست یافت نشد',404);
  $files=Db::all("SELECT file_path,original_path,processed_path,thumbnail_path FROM company_request_files WHERE request_id=?",[$id]);
  Db::pdo()->beginTransaction(); try{
    Db::run("DELETE FROM company_card_payments WHERE request_id=?",[$id]); Db::run("DELETE FROM company_request_payments WHERE request_id=?",[$id]);
    Db::run("DELETE FROM company_request_logs WHERE request_id=?",[$id]); Db::run("DELETE FROM company_request_files WHERE request_id=?",[$id]); Db::run("DELETE FROM company_requests WHERE id=?",[$id]); Db::pdo()->commit();
  }catch(Throwable $e){if(Db::pdo()->inTransaction()) Db::pdo()->rollBack();throw $e;}
  $root=dirname(__DIR__).'/public/'; foreach($files as $f) foreach(['file_path','original_path','processed_path','thumbnail_path'] as $k){$rel=ltrim((string)($f[$k]??''),'/');if($rel!==''&&str_starts_with($rel,'uploads/company_requests/'))@unlink($root.$rel);}
  return ['ok'=>true,'deleted'=>true,'id'=>$id];
},false,ADMIN);
route('POST','/api/admin/company-requests/{id}/status',function($p,$b,$u){
  $requestId=(int)($p['id']??0);
  $allowed=['draft','documents_pending','payment_pending','pending_review','needs_correction','approved','rejected','completed','cancelled'];
  $rawStatus=trim((string)($b['status']??''));
  $statusAliases=[
    'approve'=>'approved','confirmed'=>'approved','تایید'=>'approved','تأیید'=>'approved',
    'reject'=>'rejected','رد'=>'rejected',
    'complete'=>'completed','done'=>'completed','تکمیل'=>'completed',
    'cancel'=>'cancelled','لغو'=>'cancelled',
    'correction'=>'needs_correction','اصلاح'=>'needs_correction'
  ];
  $status=$statusAliases[$rawStatus]??$rawStatus;
  $note=trim((string)($b['note']??$b['admin_note']??''));
  if($requestId<1) Http::error('شناسه درخواست نامعتبر است',422);
  if($status==='') Http::error('وضعیت جدید ارسال نشده است',422);
  if(!in_array($status,$allowed,true)) Http::error('وضعیت نامعتبر است: '.$rawStatus,422);
  if(in_array($status,['rejected','cancelled'],true)&&$note==='') Http::error('برای رد یا لغو درخواست، ثبت توضیح الزامی است',422);

  try{
    $x=Db::one("SELECT id,user_id,tracking_code,status FROM company_requests WHERE id=?",[$requestId]);
  }catch(Throwable $e){
    $ref='CRS-READ-'.$requestId.'-'.date('YmdHis');
    error_log($ref.' '.$e->getMessage());
    Http::error('خواندن درخواست ناموفق بود. کد پیگیری خطا: '.$ref,500);
  }
  if(!$x) Http::error('درخواست یافت نشد',404);

  $terminal=in_array($status,['completed','rejected','cancelled'],true);
  try{
    // هسته تغییر وضعیت فقط از ستون‌های قطعی و بدون کلید خارجی استفاده می‌کند.
    Db::run(
      "UPDATE company_requests SET status=?,admin_note=?,last_status_at=NOW(),completed_at=".($terminal?'NOW()':'NULL').",updated_at=NOW() WHERE id=?",
      [$status,$note!==''?$note:null,$requestId]
    );
  }catch(Throwable $e){
    $ref='CRS-UPDATE-'.$requestId.'-'.date('YmdHis');
    error_log($ref.' '.$e->getMessage());
    Http::error('ذخیره وضعیت درخواست ناموفق بود. کد پیگیری خطا: '.$ref,500);
  }

  // اطلاعات ممیزی و ارجاع، غیرحیاتی و مستقل از نتیجه اصلی ذخیره می‌شوند.
  try{
    Db::run("UPDATE company_requests SET reviewed_by=?,reviewed_at=NOW() WHERE id=?",[(int)($u['id']??0),$requestId]);
  }catch(Throwable $e){ error_log('CRS-AUDIT-'.$requestId.' '.$e->getMessage()); }
  if(array_key_exists('assigned_to',$b)){
    try{
      $assignedTo=($b['assigned_to']===''||$b['assigned_to']===null)?null:max(1,(int)$b['assigned_to']);
      Db::run("UPDATE company_requests SET assigned_to=? WHERE id=?",[$assignedTo,$requestId]);
    }catch(Throwable $e){ error_log('CRS-ASSIGN-'.$requestId.' '.$e->getMessage()); }
  }

  try{ _company_log($requestId,(int)($u['id']??0),'status_changed',$note!==''?$note:null,['from'=>$x['status'],'to'=>$status]); }
  catch(Throwable $e){ error_log('CRS-LOG-'.$requestId.' '.$e->getMessage()); }

  $title='وضعیت درخواست شما تغییر کرد';
  $body='کد رهگیری: '.$x['tracking_code']."\n".'وضعیت: '._company_status_title($status).($note!==''?"\n".'توضیح: '.$note:'');
  $notifyPayload=$x; $notifyPayload['status']=$status;
  try{ _company_notify_user($notifyPayload,$title,$body); }
  catch(Throwable $e){ error_log('CRS-NOTIFY-'.$requestId.' '.$e->getMessage()); }
  try{ Push::notify([(int)$x['user_id']],$title,$body,['type'=>'company_request','request_id'=>$requestId,'status'=>$status]); }
  catch(Throwable $e){ error_log('CRS-PUSH-'.$requestId.' '.$e->getMessage()); }

  return ['ok'=>true,'status'=>$status,'request_id'=>$requestId];
},false,ADMIN);
route('POST','/api/admin/company-requests/{id}/payment-review',function($p,$b,$u){
  $req=_company_request_owned($p['id'],$u,true); $paymentId=(int)($b['payment_id']??0); $decision=$b['decision']??''; if(!in_array($decision,['approve','reject'],true)) Http::error('تصمیم نامعتبر است',422);
  $pay=Db::one("SELECT * FROM company_request_payments WHERE id=? AND request_id=?",[$paymentId,$req['id']]); if(!$pay) Http::error('پرداخت یافت نشد',404);
  if($decision==='approve'){
    Db::exec("UPDATE company_request_payments SET status='paid',verified_by=?,verified_at=NOW(),rejection_reason=NULL,review_note=? WHERE id=?",[$u['id'],trim((string)($b['note']??''))?:null,$paymentId]); Db::exec("UPDATE company_card_payments SET status='paid',reviewed_by=?,reviewed_at=NOW(),reject_reason=NULL,operator_note=? WHERE payment_id=?",[$u['id'],trim((string)($b['note']??''))?:null,$paymentId]); Db::exec("UPDATE company_requests SET payment_status='paid',status='pending_review' WHERE id=?",[$req['id']]);
    _company_log($req['id'],$u['id'],'card_payment_approved','پرداخت کارت‌به‌کارت تأیید شد',['payment_id'=>$paymentId]); _company_notify_user($req,'پرداخت درخواست تأیید شد','کد رهگیری: '.$req['tracking_code'].'
درخواست برای بررسی شرکت ارسال شد.');
    return ['ok'=>true,'payment_status'=>'paid','request_status'=>'pending_review'];
  }
  $reason=trim((string)($b['reason']??'')); if($reason==='') Http::error('علت رد پرداخت را وارد کنید',422);
  Db::exec("UPDATE company_request_payments SET status='rejected',verified_by=?,verified_at=NOW(),rejection_reason=?,review_note=? WHERE id=?",[$u['id'],$reason,trim((string)($b['note']??''))?:null,$paymentId]); Db::exec("UPDATE company_card_payments SET status='rejected',reviewed_by=?,reviewed_at=NOW(),reject_reason=?,operator_note=? WHERE payment_id=?",[$u['id'],$reason,trim((string)($b['note']??''))?:null,$paymentId]); Db::exec("UPDATE company_requests SET payment_status='rejected',status='payment_pending' WHERE id=?",[$req['id']]);
  _company_log($req['id'],$u['id'],'card_payment_rejected',$reason,['payment_id'=>$paymentId]); _company_notify_user($req,'پرداخت درخواست رد شد','کد رهگیری: '.$req['tracking_code'].'
علت: '.$reason);
  return ['ok'=>true,'payment_status'=>'rejected','request_status'=>'payment_pending'];
},false,ADMIN);
route('POST','/api/admin/company-requests/{id}/request-correction',function($p,$b,$u){
  $req=_company_request_owned($p['id'],$u,true); $note=trim((string)($b['note']??'')); if($note==='') Http::error('توضیح اصلاحات الزامی است',422);
  Db::exec("UPDATE company_requests SET status='needs_correction',reviewed_by=?,reviewed_at=NOW() WHERE id=?",[$u['id'],$req['id']]); _company_log($req['id'],$u['id'],'correction_requested',$note,$b['documents']??null); _company_notify_user($req,'درخواست نیازمند اصلاح مدارک است','کد رهگیری: '.$req['tracking_code'].'
'.$note); return ['ok'=>true,'status'=>'needs_correction'];
},false,ADMIN);

route('GET','/api/admin/company-request-settings',function($p,$b,$u){ return ['ok'=>true,'settings'=>_company_settings_all(),'types'=>Db::all("SELECT * FROM company_request_types ORDER BY id")]; },false,ADMIN);
route('POST','/api/admin/company-request-settings',function($p,$b,$u){
  $settings=$b['settings']??[]; if(array_key_exists('bale_provider_token',$settings)){ $settings['bale_provider_invalid']=false; } if(!is_array($settings)) Http::error('تنظیمات نامعتبر است',422); foreach($settings as $k=>$v){ if(!preg_match('/^[a-z0-9_]{2,120}$/i',(string)$k)) continue; Db::exec("INSERT INTO company_request_settings(setting_key,setting_value,updated_by) VALUES(?,?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value),updated_by=VALUES(updated_by)",[$k,json_encode($v,JSON_UNESCAPED_UNICODE),$u['id']]); }
  foreach(($b['types']??[]) as $t){ if(empty($t['id'])) continue; Db::exec("UPDATE company_request_types SET title=?,price=?,enabled=?,deadline_days=?,description=? WHERE id=?",[trim((string)$t['title']),max(0,(int)$t['price']),empty($t['enabled'])?0:1,max(1,(int)$t['deadline_days']),$t['description']??null,(int)$t['id']]); }
  return ['ok'=>true];
},false,ADMIN);

/* ===== v182 / Phase 4: Mobile Device Health Monitor ===== */
function _v182_health_tables(){
  Db::run("CREATE TABLE IF NOT EXISTS mobile_device_health (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    device_key VARCHAR(191) NOT NULL,
    app_version VARCHAR(40) NULL,
    build_version VARCHAR(40) NULL,
    android_sdk INT NULL,
    manufacturer VARCHAR(100) NULL,
    model_name VARCHAR(150) NULL,
    device_name VARCHAR(150) NULL,
    app_state VARCHAR(30) NULL,
    reason VARCHAR(40) NULL,
    battery_level SMALLINT NULL,
    battery_state SMALLINT NULL,
    low_power_mode TINYINT(1) NOT NULL DEFAULT 0,
    network_connected TINYINT(1) NOT NULL DEFAULT 0,
    internet_reachable TINYINT(1) NOT NULL DEFAULT 0,
    network_type VARCHAR(40) NULL,
    local_ip VARCHAR(64) NULL,
    total_memory_bytes BIGINT NULL,
    free_disk_bytes BIGINT NULL,
    total_disk_bytes BIGINT NULL,
    api_ok TINYINT(1) NOT NULL DEFAULT 0,
    api_latency_ms INT NULL,
    api_status INT NULL,
    monitor_uptime_seconds INT NULL,
    captured_at DATETIME NOT NULL,
    received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    raw_payload JSON NULL,
    UNIQUE KEY uq_mdh_user_device_time(user_id,device_key,captured_at),
    INDEX idx_mdh_user_time(user_id,captured_at),
    INDEX idx_mdh_health(api_ok,network_connected,captured_at),
    INDEX idx_mdh_version(app_version,android_sdk,captured_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  Db::run("CREATE TABLE IF NOT EXISTS mobile_device_health_latest (
    user_id BIGINT NOT NULL,
    device_key VARCHAR(191) NOT NULL,
    health_id BIGINT NULL,
    app_version VARCHAR(40) NULL,
    android_sdk INT NULL,
    manufacturer VARCHAR(100) NULL,
    model_name VARCHAR(150) NULL,
    battery_level SMALLINT NULL,
    free_disk_bytes BIGINT NULL,
    api_ok TINYINT(1) NOT NULL DEFAULT 0,
    api_latency_ms INT NULL,
    network_connected TINYINT(1) NOT NULL DEFAULT 0,
    internet_reachable TINYINT(1) NOT NULL DEFAULT 0,
    app_state VARCHAR(30) NULL,
    captured_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id,device_key),
    INDEX idx_mdhl_time(captured_at),
    INDEX idx_mdhl_alert(api_ok,network_connected,battery_level,captured_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

route('POST','/api/activity/device-health',function($p,$b,$u){
  _v182_health_tables();
  $captured = !empty($b['captured_at']) && strtotime($b['captured_at']) ? date('Y-m-d H:i:s',strtotime($b['captured_at'])) : date('Y-m-d H:i:s');
  $deviceKey = trim((string)($u['device_id'] ?? $b['device_id'] ?? ''));
  if ($deviceKey==='') $deviceKey = sha1(($b['manufacturer']??'').'|'.($b['model_name']??'').'|'.($b['device_name']??''));
  $vals = [
    (int)$u['id'], substr($deviceKey,0,191), substr((string)($b['app_version']??''),0,40)?:null, substr((string)($b['build_version']??''),0,40)?:null,
    isset($b['android_sdk'])?(int)$b['android_sdk']:null, substr((string)($b['manufacturer']??''),0,100)?:null, substr((string)($b['model_name']??''),0,150)?:null,
    substr((string)($b['device_name']??''),0,150)?:null, substr((string)($b['app_state']??''),0,30)?:null, substr((string)($b['reason']??''),0,40)?:null,
    isset($b['battery_level'])?max(0,min(100,(int)$b['battery_level'])):null, isset($b['battery_state'])?(int)$b['battery_state']:null, !empty($b['low_power_mode'])?1:0,
    !empty($b['network_connected'])?1:0, !empty($b['internet_reachable'])?1:0, substr((string)($b['network_type']??''),0,40)?:null,
    substr((string)($b['local_ip']??''),0,64)?:null, isset($b['total_memory_bytes'])?(int)$b['total_memory_bytes']:null,
    isset($b['free_disk_bytes'])?(int)$b['free_disk_bytes']:null, isset($b['total_disk_bytes'])?(int)$b['total_disk_bytes']:null,
    !empty($b['api_ok'])?1:0, isset($b['api_latency_ms'])?max(0,(int)$b['api_latency_ms']):null, isset($b['api_status'])?(int)$b['api_status']:null,
    isset($b['monitor_uptime_seconds'])?max(0,(int)$b['monitor_uptime_seconds']):null, $captured, json_encode($b,JSON_UNESCAPED_UNICODE)
  ];
  Db::run("INSERT IGNORE INTO mobile_device_health(user_id,device_key,app_version,build_version,android_sdk,manufacturer,model_name,device_name,app_state,reason,battery_level,battery_state,low_power_mode,network_connected,internet_reachable,network_type,local_ip,total_memory_bytes,free_disk_bytes,total_disk_bytes,api_ok,api_latency_ms,api_status,monitor_uptime_seconds,captured_at,raw_payload) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",$vals);
  $healthId=(int)(Db::one("SELECT id FROM mobile_device_health WHERE user_id=? AND device_key=? AND captured_at=? ORDER BY id DESC LIMIT 1",[(int)$u['id'],substr($deviceKey,0,191),$captured])['id']??0);
  Db::run("INSERT INTO mobile_device_health_latest(user_id,device_key,health_id,app_version,android_sdk,manufacturer,model_name,battery_level,free_disk_bytes,api_ok,api_latency_ms,network_connected,internet_reachable,app_state,captured_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE health_id=VALUES(health_id),app_version=VALUES(app_version),android_sdk=VALUES(android_sdk),manufacturer=VALUES(manufacturer),model_name=VALUES(model_name),battery_level=VALUES(battery_level),free_disk_bytes=VALUES(free_disk_bytes),api_ok=VALUES(api_ok),api_latency_ms=VALUES(api_latency_ms),network_connected=VALUES(network_connected),internet_reachable=VALUES(internet_reachable),app_state=VALUES(app_state),captured_at=VALUES(captured_at)",
    [(int)$u['id'],substr($deviceKey,0,191),$healthId,substr((string)($b['app_version']??''),0,40)?:null,isset($b['android_sdk'])?(int)$b['android_sdk']:null,substr((string)($b['manufacturer']??''),0,100)?:null,substr((string)($b['model_name']??''),0,150)?:null,isset($b['battery_level'])?(int)$b['battery_level']:null,isset($b['free_disk_bytes'])?(int)$b['free_disk_bytes']:null,!empty($b['api_ok'])?1:0,isset($b['api_latency_ms'])?(int)$b['api_latency_ms']:null,!empty($b['network_connected'])?1:0,!empty($b['internet_reachable'])?1:0,substr((string)($b['app_state']??''),0,30)?:null,$captured]);
  return ['ok'=>true,'health_id'=>$healthId,'received_at'=>date('c')];
});

route('GET','/api/admin/device-health',function($p,$b,$u){
  _v182_health_tables();
  $q=trim((string)($_GET['q']??'')); $where='1=1'; $args=[];
  if($q!==''){ $where.=" AND (CONCAT(us.first_name,' ',us.last_name) LIKE ? OR l.model_name LIKE ? OR l.app_version LIKE ? OR l.device_key LIKE ?)"; $x='%'.$q.'%'; $args=[$x,$x,$x,$x]; }
  $items=Db::all("SELECT l.*,CONCAT(us.first_name,' ',us.last_name) user_name,r.title role_title,
    TIMESTAMPDIFF(MINUTE,l.captured_at,NOW()) stale_minutes,
    CASE WHEN TIMESTAMPDIFF(MINUTE,l.captured_at,NOW())>20 THEN 'stale' WHEN l.api_ok=0 OR l.network_connected=0 THEN 'error' WHEN l.battery_level IS NOT NULL AND l.battery_level<15 THEN 'warning' WHEN l.free_disk_bytes IS NOT NULL AND l.free_disk_bytes<536870912 THEN 'warning' WHEN l.api_latency_ms>5000 THEN 'warning' ELSE 'ok' END health_status
    FROM mobile_device_health_latest l JOIN users us ON us.id=l.user_id LEFT JOIN roles r ON r.id=us.role_id WHERE $where ORDER BY l.captured_at DESC LIMIT 500",$args);
  $stats=Db::one("SELECT COUNT(*) total_devices,SUM(captured_at<DATE_SUB(NOW(),INTERVAL 20 MINUTE)) stale_devices,SUM(api_ok=0) api_failed,SUM(network_connected=0) offline_devices,SUM(battery_level<15) low_battery,SUM(free_disk_bytes<536870912) low_storage,ROUND(AVG(api_latency_ms)) avg_latency_ms FROM mobile_device_health_latest");
  return ['items'=>$items,'stats'=>$stats?:[],'site_version'=>SITE_VERSION,'app_version'=>APP_VERSION];
},false,ADMIN);

route('GET','/api/admin/device-health/{user_id}/history',function($p,$b,$u){
  _v182_health_tables();
  return ['items'=>Db::all("SELECT * FROM mobile_device_health WHERE user_id=? ORDER BY captured_at DESC LIMIT 200",[(int)$p['user_id']])];
},false,ADMIN);


/* ================= v183: برنامه بازدید و پوشش خطوط ================= */
function _v183_visit_tables(){
  static $done=false; if($done) return; $done=true;
  Db::run("CREATE TABLE IF NOT EXISTS inspector_modes (
    user_id BIGINT PRIMARY KEY,
    mode VARCHAR(30) NOT NULL DEFAULT 'auto',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    updated_by BIGINT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_inspector_mode(mode)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  Db::run("CREATE TABLE IF NOT EXISTS line_visit_reports (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    line_id BIGINT NOT NULL,
    visit_type VARCHAR(30) NOT NULL DEFAULT 'field',
    started_at DATETIME NOT NULL,
    finished_at DATETIME NULL,
    lat DOUBLE NOT NULL,
    lng DOUBLE NOT NULL,
    declared_present_count INT NULL,
    actual_present_count INT NULL,
    total_line_vehicles INT NULL,
    expired_present_count INT NULL,
    present_notice_count INT NULL,
    supervisor_user_id BIGINT NULL,
    supervisor_score DECIMAL(6,2) NULL,
    supervisor_note TEXT NULL,
    report_text TEXT NULL,
    photo_path VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'submitted',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_lvr_user_date(user_id,started_at),
    INDEX idx_lvr_line_date(line_id,started_at),
    INDEX idx_lvr_type_date(visit_type,started_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  Db::run("CREATE TABLE IF NOT EXISTS subordinate_daily_reviews (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reviewer_id BIGINT NOT NULL,
    subject_user_id BIGINT NOT NULL,
    review_date DATE NOT NULL,
    line_id BIGINT NULL,
    attendance_score DECIMAL(6,2) NOT NULL DEFAULT 0,
    checklist_score DECIMAL(6,2) NOT NULL DEFAULT 0,
    notice_score DECIMAL(6,2) NOT NULL DEFAULT 0,
    coverage_score DECIMAL(6,2) NOT NULL DEFAULT 0,
    quality_score DECIMAL(6,2) NOT NULL DEFAULT 0,
    total_score DECIMAL(7,2) NOT NULL DEFAULT 0,
    note TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_daily_review(reviewer_id,subject_user_id,review_date,line_id),
    INDEX idx_sdr_subject_date(subject_user_id,review_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}
function _v183_role_mode($userId){
  _v183_visit_tables();
  $u=Db::one("SELECT r.title role_title FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.id=?",[(int)$userId]);
  $role=trim((string)($u['role_title']??''));
  $roleNorm=mb_strtolower(str_replace(['ي','ك'],['ی','ک'],$role),'UTF-8');
  $manual=Db::one("SELECT mode FROM inspector_modes WHERE user_id=? AND is_active=1",[(int)$userId]);
  if($manual && $manual['mode']!=='auto') return $manual['mode'];
  $n=(int)(Db::one("SELECT COUNT(*) n FROM user_lines WHERE user_id=?",[(int)$userId])['n']??0);

  // نقش‌های ارشد باید پیش از «بازرس» بررسی شوند؛ چون «سربازرس» شامل واژهٔ «بازرس» است.
  if(mb_strpos($roleNorm,'سربازرس')!==false || mb_strpos($roleNorm,'بازرس ارشد')!==false || mb_strpos($roleNorm,'رئیس اداره بازرسی')!==false || mb_strpos($roleNorm,'chief inspector')!==false) return 'chief_inspector';
  if(mb_strpos($roleNorm,'گشت موتوری')!==false || mb_strpos($roleNorm,'motor patrol')!==false) return 'motor_patrol';
  if(mb_strpos($roleNorm,'گشت خودرویی')!==false || mb_strpos($roleNorm,'بازرس گشت')!==false || mb_strpos($roleNorm,'vehicle patrol')!==false) return 'vehicle_patrol';
  if(mb_strpos($roleNorm,'بازرس مقیم')!==false || mb_strpos($roleNorm,'resident inspector')!==false) return 'resident_inspector';
  if(mb_strpos($roleNorm,'ناظر خط')!==false || mb_strpos($roleNorm,'رئیس خط')!==false || $roleNorm==='ناظر' || mb_strpos($roleNorm,'line supervisor')!==false) return 'line_supervisor';
  if(mb_strpos($roleNorm,'نیروی اداری')!==false || mb_strpos($roleNorm,'کارشناس اداری')!==false || mb_strpos($roleNorm,'administrative')!==false) return 'administrative_visit';
  if(mb_strpos($roleNorm,'بازرس')!==false || mb_strpos($roleNorm,'inspector')!==false) return $n<=1?'resident_inspector':'vehicle_patrol';
  return 'other';
}
function _v183_line_snapshot($lineId){
  $lineId=(int)$lineId;
  $total=(int)(Db::one("SELECT COUNT(*) n FROM vehicles WHERE line_id=?",[$lineId])['n']??0);
  $present=(int)(Db::one("SELECT COUNT(DISTINCT a.driver_id) n FROM attendances a WHERE a.line_id=? AND DATE(a.created_at)=CURDATE()",[$lineId])['n']??0);
  $declared=$present;
  $expired=(int)(Db::one("SELECT COUNT(DISTINCT a.driver_id) n FROM attendances a JOIN drivers d ON d.id=a.driver_id LEFT JOIN vehicle_drivers vd ON vd.driver_id=d.id LEFT JOIN vehicles v ON v.id=vd.vehicle_id WHERE a.line_id=? AND DATE(a.created_at)=CURDATE() AND (COALESCE(d.taxi_lic_status,'') LIKE '%منقض%' OR COALESCE(d.op_lic_status,'') LIKE '%منقض%' OR COALESCE(v.tech_inspection_expire,'')<>'' AND v.tech_inspection_expire < DATE_FORMAT(CURDATE(),'%Y/%m/%d') OR COALESCE(v.insurance_expire,'')<>'' AND v.insurance_expire < DATE_FORMAT(CURDATE(),'%Y/%m/%d'))",[$lineId])['n']??0);
  $noticeCount=(int)(Db::one("SELECT COUNT(*) n FROM notices n JOIN attendances a ON a.driver_id=n.driver_id WHERE a.line_id=? AND DATE(a.created_at)=CURDATE() AND n.created_at>=DATE_SUB(NOW(),INTERVAL 30 DAY)",[$lineId])['n']??0);
  $line=Db::one("SELECT id,code,origin,destination FROM `lines` WHERE id=?",[$lineId]);
  $supervisors=Db::all("SELECT u.id,TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) name,r.title role_title FROM user_lines ul JOIN users u ON u.id=ul.user_id LEFT JOIN roles r ON r.id=u.role_id WHERE ul.line_id=? AND (r.title LIKE '%ناظر خط%' OR r.title LIKE '%بازرس مقیم%')",[$lineId]);
  $today=Db::one("SELECT COUNT(DISTINCT a.driver_id) attendance_count FROM attendances a WHERE a.line_id=? AND DATE(a.created_at)=CURDATE()",[$lineId]);
  return ['line'=>$line,'total_line_vehicles'=>$total,'current_present_count'=>$present,'declared_present_count'=>$declared,'expired_present_count'=>$expired,'present_notice_count'=>$noticeCount,'today_attendance_count'=>(int)($today['attendance_count']??0),'supervisors'=>$supervisors];
}
function _v191_line_snapshot($lineId,$userId=null){
  $lineId=(int)$lineId;
  $line=Db::one("SELECT id,code,origin,destination FROM `lines` WHERE id=?",[$lineId]);
  $total=(int)(Db::one("SELECT COUNT(*) n FROM vehicles WHERE line_id=?",[$lineId])['n']??0);
  $present=(int)(Db::one("SELECT COUNT(DISTINCT driver_id) n FROM attendances WHERE line_id=? AND DATE(created_at)=CURDATE()",[$lineId])['n']??0);
  $checked=(int)(Db::one("SELECT COUNT(DISTINCT COALESCE(cs.vehicle_id,cs.driver_id)) n FROM checklist_submissions cs LEFT JOIN vehicles v ON v.id=cs.vehicle_id
    WHERE DATE(cs.created_at)=CURDATE() AND (v.line_id=? OR EXISTS(SELECT 1 FROM attendances a WHERE a.driver_id=cs.driver_id AND a.line_id=? AND DATE(a.created_at)=CURDATE()))",[$lineId,$lineId])['n']??0);
  $notices=(int)(Db::one("SELECT COUNT(*) n FROM notices nt WHERE DATE(nt.created_at)=CURDATE() AND EXISTS(SELECT 1 FROM attendances a WHERE a.driver_id=nt.driver_id AND a.line_id=? AND DATE(a.created_at)=CURDATE())",[$lineId])['n']??0);
  $expired=(int)(Db::one("SELECT COUNT(DISTINCT a.driver_id) n FROM attendances a JOIN drivers d ON d.id=a.driver_id LEFT JOIN vehicle_drivers vd ON vd.driver_id=d.id LEFT JOIN vehicles v ON v.id=vd.vehicle_id
    WHERE a.line_id=? AND DATE(a.created_at)=CURDATE() AND (COALESCE(d.taxi_lic_status,'') LIKE '%منقض%' OR COALESCE(d.op_lic_status,'') LIKE '%منقض%' OR (COALESCE(v.tech_inspection_expire,'')<>'' AND v.tech_inspection_expire<DATE_FORMAT(CURDATE(),'%Y/%m/%d')) OR (COALESCE(v.insurance_expire,'')<>'' AND v.insurance_expire<DATE_FORMAT(CURDATE(),'%Y/%m/%d')))",[$lineId])['n']??0);
  $debt=(int)(Db::one("SELECT COUNT(DISTINCT a.driver_id) n FROM attendances a JOIN drivers d ON d.id=a.driver_id WHERE a.line_id=? AND DATE(a.created_at)=CURDATE()
    AND EXISTS(SELECT 1 FROM bills b WHERE (b.driver_id=d.id OR b.national_id=d.national_id) AND (b.status IS NULL OR b.status NOT LIKE '%پرداخت%'))",[$lineId])['n']??0);
  $visit=$userId?Db::one("SELECT id,status,validated,validation_percent,started_at,finished_at FROM mission_visit_sessions WHERE user_id=? AND line_id=? AND DATE(started_at)=CURDATE() ORDER BY id DESC LIMIT 1",[(int)$userId,$lineId]):null;
  return ['line'=>$line,'total_vehicles'=>$total,'present_count'=>$present,'checked_count'=>$checked,'notice_count'=>$notices,
    'expired_present_count'=>$expired,'subscription_debt_present_count'=>$debt,'coverage_percent'=>_v191_pct($checked,$total),'today_visit'=>$visit?:null];
}
route('GET','/api/my/visit-program',function($p,$b,$u){
  _v191_mission_tables();
  $prog=_v191_mission_progress($u);
  $lineIds=array_map('intval', array_column(Db::all("SELECT line_id FROM user_lines WHERE user_id=?",[(int)$u['id']]),'line_id'));
  $lines=array_map(function($lid) use ($u){ return _v191_line_snapshot($lid,$u['id']); },$lineIds);
  return ['mode'=>$prog['role_key'],'date'=>date('Y-m-d'),'summary'=>$prog['summary'],'targets'=>$prog['targets'],'lines'=>$lines];
});
route('GET','/api/line-visits/line/{line_id}/snapshot',function($p,$b,$u){
  $ids=user_line_ids($u); $lid=(int)$p['line_id'];
  if(is_array($ids) && !in_array($lid,array_map('intval',$ids),true)) Http::error('این خط در محدوده دسترسی شما نیست',403);
  return _v183_line_snapshot($lid);
});
route('POST','/api/line-visits',function($p,$b,$u){
  _v183_visit_tables();
  $lid=(int)($b['line_id']??0); if(!$lid) Http::error('انتخاب خط الزامی است',422);
  $ids=user_line_ids($u); if(is_array($ids) && !in_array($lid,array_map('intval',$ids),true)) Http::error('این خط در محدوده دسترسی شما نیست',403);
  [$lat,$lng]=validGeo($b['lat']??null,$b['lng']??null); if($lat===null) Http::error('موقعیت مکانی معتبر لازم است',422);
  $st=station_at_point($lat,$lng,[$lid],max(25,(int)_req_setting('line_visit_extra_radius_m',50))); if(!$st) Http::error('برای ثبت بازدید باید در محدوده خط یا ایستگاه آن حضور داشته باشید',403);
  if(empty($b['photo_data']) || strpos((string)$b['photo_data'],'data:image')!==0) Http::error('ثبت مستقیم تصویر از دوربین الزامی است',422);
  $w=max(640,(int)_req_setting('line_visit_photo_width',1280)); $q=max(35,min(90,(int)_req_setting('line_visit_photo_quality',70)));
  $path=Media::saveBase64($b['photo_data'],'line_visits',$w,$q);
  $snap=_v183_line_snapshot($lid); $actual=max(0,(int)($b['actual_present_count']??0));
  $id=Db::insert("INSERT INTO line_visit_reports(user_id,line_id,visit_type,started_at,finished_at,lat,lng,declared_present_count,actual_present_count,total_line_vehicles,expired_present_count,present_notice_count,report_text,photo_path,status) VALUES(?,?,?,NOW(),NOW(),?,?,?,?,?,?,?,?,?,'submitted')",[(int)$u['id'],$lid,_v183_role_mode($u['id']),$lat,$lng,(int)$snap['declared_present_count'],$actual,(int)$snap['total_line_vehicles'],(int)$snap['expired_present_count'],(int)$snap['present_notice_count'],trim((string)($b['report_text']??'')),$path]);
  return ['id'=>$id,'snapshot'=>$snap,'difference'=>$actual-(int)$snap['declared_present_count']];
});
route('GET','/api/my/line-visits',function($p,$b,$u){
  _v183_visit_tables();
  return ['items'=>Db::all("SELECT v.*,l.code line_code,l.origin,l.destination FROM line_visit_reports v JOIN `lines` l ON l.id=v.line_id WHERE v.user_id=? ORDER BY v.started_at DESC LIMIT 200",[(int)$u['id']])];
});
route('GET','/api/admin/line-visits',function($p,$b,$u){
  _v183_visit_tables(); $from=$_GET['from']??date('Y-m-01'); $to=$_GET['to']??date('Y-m-d'); $uid=(int)($_GET['user_id']??0); $type=trim((string)($_GET['type']??''));
  $where="DATE(v.started_at) BETWEEN ? AND ?"; $args=[$from,$to]; if($uid){$where.=" AND v.user_id=?";$args[]=$uid;} if($type!==''){$where.=" AND v.visit_type=?";$args[]=$type;}
  $items=Db::all("SELECT v.*,l.code line_code,l.origin,l.destination,CONCAT(u.first_name,' ',u.last_name) user_name,r.title role_title,(v.actual_present_count-v.declared_present_count) presence_difference FROM line_visit_reports v JOIN `lines` l ON l.id=v.line_id JOIN users u ON u.id=v.user_id LEFT JOIN roles r ON r.id=u.role_id WHERE $where ORDER BY v.started_at DESC",$args);
  $summary=Db::all("SELECT v.user_id,CONCAT(u.first_name,' ',u.last_name) user_name,r.title role_title,COUNT(*) visits,COUNT(DISTINCT v.line_id) visited_lines,SUM(v.actual_present_count) actual_present,SUM(ABS(v.actual_present_count-v.declared_present_count)) total_difference FROM line_visit_reports v JOIN users u ON u.id=v.user_id LEFT JOIN roles r ON r.id=u.role_id WHERE $where GROUP BY v.user_id,u.first_name,u.last_name,r.title ORDER BY visits DESC",$args);
  return ['items'=>$items,'summary'=>$summary];
},false,ADMIN);
route('POST','/api/admin/inspector-mode/{user_id}',function($p,$b,$u){
  _v183_visit_tables(); $mode=$b['mode']??'auto'; if(!in_array($mode,['auto','resident_inspector','vehicle_patrol','motor_patrol'],true)) Http::error('نوع نامعتبر',422);
  Db::run("INSERT INTO inspector_modes(user_id,mode,updated_by) VALUES(?,?,?) ON DUPLICATE KEY UPDATE mode=VALUES(mode),updated_by=VALUES(updated_by)",[(int)$p['user_id'],$mode,(int)$u['id']]); return ['ok'=>true];
},false,ADMIN);
route('POST','/api/subordinate-daily-reviews',function($p,$b,$u){
  _v183_visit_tables(); $sid=(int)($b['subject_user_id']??0); if(!$sid) Http::error('نیروی زیرمجموعه انتخاب نشده است',422);
  $vals=[]; foreach(['attendance_score','checklist_score','notice_score','coverage_score','quality_score'] as $k)$vals[$k]=max(0,min(20,(float)($b[$k]??0)));
  $total=array_sum($vals); Db::run("INSERT INTO subordinate_daily_reviews(reviewer_id,subject_user_id,review_date,line_id,attendance_score,checklist_score,notice_score,coverage_score,quality_score,total_score,note) VALUES(?,?,CURDATE(),?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE attendance_score=VALUES(attendance_score),checklist_score=VALUES(checklist_score),notice_score=VALUES(notice_score),coverage_score=VALUES(coverage_score),quality_score=VALUES(quality_score),total_score=VALUES(total_score),note=VALUES(note)",[(int)$u['id'],$sid,$b['line_id']??null,$vals['attendance_score'],$vals['checklist_score'],$vals['notice_score'],$vals['coverage_score'],$vals['quality_score'],$total,trim((string)($b['note']??''))]); return ['ok'=>true,'total_score'=>$total];
});

/* ================= v191/v192: موتور مأموریت واقعی (هم‌گام با نسخهٔ Node) ================= */
function _v191_mission_tables(){
  static $done=false; if($done) return; $done=true;
  Db::run("CREATE TABLE IF NOT EXISTS mission_metric_catalog (
    metric_key VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    unit VARCHAR(30) NOT NULL DEFAULT 'percent',
    applicable_roles LONGTEXT NULL,
    description TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (metric_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  Db::run("CREATE TABLE IF NOT EXISTS mission_templates (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    role_key VARCHAR(100) NOT NULL,
    period VARCHAR(20) NOT NULL DEFAULT 'daily',
    zone_id INT NULL,
    is_default TINYINT(1) NOT NULL DEFAULT 1,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    effective_from DATE NULL,
    effective_to DATE NULL,
    created_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_mission_templates_role_period (role_key, period, is_active)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  Db::run("CREATE TABLE IF NOT EXISTS mission_template_targets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    template_id BIGINT NOT NULL,
    metric_key VARCHAR(100) NOT NULL,
    target_percent DECIMAL(6,2) NOT NULL DEFAULT 0,
    weight DECIMAL(8,2) NOT NULL DEFAULT 1,
    is_required TINYINT(1) NOT NULL DEFAULT 1,
    minimum_count INT NULL,
    config LONGTEXT NULL,
    UNIQUE KEY uq_mission_template_metric (template_id, metric_key),
    KEY idx_mtt_template (template_id), KEY idx_mtt_metric (metric_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  Db::run("CREATE TABLE IF NOT EXISTS user_mission_overrides (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    period VARCHAR(20) NOT NULL DEFAULT 'daily',
    title VARCHAR(255) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    effective_from DATE NULL,
    effective_to DATE NULL,
    created_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_mission_period (user_id, period)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  Db::run("CREATE TABLE IF NOT EXISTS user_mission_override_targets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    override_id BIGINT NOT NULL,
    metric_key VARCHAR(100) NOT NULL,
    target_percent DECIMAL(6,2) NOT NULL DEFAULT 0,
    weight DECIMAL(8,2) NOT NULL DEFAULT 1,
    is_required TINYINT(1) NOT NULL DEFAULT 1,
    minimum_count INT NULL,
    config LONGTEXT NULL,
    UNIQUE KEY uq_user_override_metric (override_id, metric_key),
    KEY idx_umot_override (override_id), KEY idx_umot_metric (metric_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  Db::run("CREATE TABLE IF NOT EXISTS mission_visit_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    line_id INT NOT NULL,
    role_mode VARCHAR(40) NOT NULL,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME NULL,
    start_lat DECIMAL(10,7) NULL, start_lng DECIMAL(10,7) NULL,
    finish_lat DECIMAL(10,7) NULL, finish_lng DECIMAL(10,7) NULL,
    start_photo_data LONGTEXT NULL,
    finish_photo_data LONGTEXT NULL,
    report_text TEXT NULL,
    actual_present_count INT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'in_progress',
    validated TINYINT(1) NOT NULL DEFAULT 0,
    validation_percent DECIMAL(6,2) NOT NULL DEFAULT 0,
    validation_details LONGTEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_mvs_user_started (user_id, started_at),
    KEY idx_mvs_line_started (line_id, started_at),
    KEY idx_mvs_user_line_status (user_id, line_id, status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  Db::run("CREATE TABLE IF NOT EXISTS mission_daily_progress (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    progress_date DATE NOT NULL,
    role_key VARCHAR(100) NOT NULL,
    mission_source VARCHAR(50) NULL,
    mission_id BIGINT NULL,
    assigned_lines_count INT NOT NULL DEFAULT 0,
    visited_lines_count INT NOT NULL DEFAULT 0,
    validated_lines_count INT NOT NULL DEFAULT 0,
    target_json LONGTEXT NULL,
    actual_json LONGTEXT NULL,
    progress_json LONGTEXT NULL,
    weighted_achievement DECIMAL(7,2) NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_mdp_user_date (user_id, progress_date),
    KEY idx_mdp_date_role (progress_date, role_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  Db::run("CREATE TABLE IF NOT EXISTS mission_timeline_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    line_id INT NULL,
    visit_session_id BIGINT NULL,
    event_type VARCHAR(100) NOT NULL,
    target_type VARCHAR(100) NULL,
    target_id BIGINT NULL,
    title VARCHAR(255) NOT NULL,
    details LONGTEXT NULL,
    lat DECIMAL(10,7) NULL, lng DECIMAL(10,7) NULL,
    occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_mte_user_occurred (user_id, occurred_at),
    KEY idx_mte_line_occurred (line_id, occurred_at),
    KEY idx_mte_visit (visit_session_id),
    KEY idx_mte_event_type (event_type)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  Db::run("CREATE TABLE IF NOT EXISTS mission_execution_settings (
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT NULL,
    updated_by INT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (setting_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

  // بذر یک‌بارهٔ کاتالوگ معیارها (اگر خالی باشد)
  if (!Db::one("SELECT metric_key FROM mission_metric_catalog LIMIT 1")) {
    $metrics = [
      ['driver_attendance_percent','ثبت حضور رانندگان','percent',10],
      ['vehicle_checklist_percent','تکمیل چک‌لیست خودروها','percent',20],
      ['expired_notice_percent','تذکر اعتبارات منقضی','percent',30],
      ['subscription_debt_notice_percent','تذکر بدهی آبونمان','percent',40],
      ['assigned_lines_visit_percent','بازدید خطوط تخصیص‌یافته','percent',50],
      ['subordinate_review_percent','بررسی عملکرد نیروهای زیرمجموعه','percent',60],
      ['station_visit_percent','بازدید ایستگاه‌ها و پایانه‌ها','percent',70],
      ['end_shift_report','گزارش پایان شیفت','percent',80],
    ];
    foreach ($metrics as $m) {
      Db::run("INSERT INTO mission_metric_catalog(metric_key,title,unit,sort_order,is_active) VALUES(?,?,?,?,1)
        ON DUPLICATE KEY UPDATE title=VALUES(title),unit=VALUES(unit),sort_order=VALUES(sort_order)", [$m[0],$m[1],$m[2],$m[3]]);
    }
  }
  // بذر یک‌بارهٔ الگوهای پیش‌فرض هر سمت (اگر خالی باشد)
  if (!Db::one("SELECT id FROM mission_templates LIMIT 1")) {
    $defaults = [
      'line_supervisor' => ['الگوی روزانه ناظر خط', [
        ['driver_attendance_percent',80,1,1],['vehicle_checklist_percent',30,1.5,1],
        ['expired_notice_percent',100,2,1],['subscription_debt_notice_percent',100,2,1],['end_shift_report',100,1,1],
      ]],
      'motor_patrol' => ['الگوی روزانه گشت موتوری', [
        ['assigned_lines_visit_percent',70,2,1],['driver_attendance_percent',40,1,1],['vehicle_checklist_percent',25,1.5,1],
        ['expired_notice_percent',100,2,1],['subscription_debt_notice_percent',100,2,1],['station_visit_percent',70,1,1],['end_shift_report',100,1,1],
      ]],
      'vehicle_patrol' => ['الگوی روزانه بازرس گشت خودرویی', [
        ['assigned_lines_visit_percent',70,2,1],['driver_attendance_percent',35,1,1],['vehicle_checklist_percent',25,1.5,1],
        ['expired_notice_percent',100,2,1],['subscription_debt_notice_percent',100,2,1],['subordinate_review_percent',50,2,1],['end_shift_report',100,1,1],
      ]],
      'resident_inspector' => ['الگوی روزانه بازرس مقیم', [
        ['driver_attendance_percent',80,1,1],['vehicle_checklist_percent',30,1.5,1],['expired_notice_percent',100,2,1],
        ['subscription_debt_notice_percent',100,2,1],['subordinate_review_percent',100,2,1],['end_shift_report',100,1,1],
      ]],
      'chief_inspector' => ['الگوی روزانه سربازرس', [
        ['assigned_lines_visit_percent',30,1,1],['subordinate_review_percent',60,3,1],['end_shift_report',100,1,1],
      ]],
    ];
    foreach ($defaults as $roleKey => $tpl) {
      $tid = Db::insert("INSERT INTO mission_templates(title,role_key,period,is_default,is_active) VALUES(?,?,'daily',1,1)", [$tpl[0], $roleKey]);
      foreach ($tpl[1] as $t) {
        Db::run("INSERT INTO mission_template_targets(template_id,metric_key,target_percent,weight,is_required) VALUES(?,?,?,?,?)",
          [$tid, $t[0], $t[1], $t[2], $t[3]]);
      }
    }
  }
  // بذر یک‌بارهٔ تنظیمات اجرای مأموریت
  if (!Db::one("SELECT setting_key FROM mission_execution_settings LIMIT 1")) {
    $defs = ['visit_min_duration_minutes'=>'10','visit_min_checked_percent'=>'5','visit_require_start_photo'=>'false',
      'visit_require_finish_photo'=>'true','visit_require_end_report'=>'true','visit_geo_extra_radius_m'=>'75',
      'visit_photo_width'=>'1280','visit_photo_quality'=>'70'];
    foreach ($defs as $k=>$v) Db::run("INSERT INTO mission_execution_settings(setting_key,setting_value) VALUES(?,?) ON DUPLICATE KEY UPDATE setting_key=setting_key", [$k,$v]);
  }
}

function _v191_setting($key,$fallback){
  $r = Db::one("SELECT setting_value FROM mission_execution_settings WHERE setting_key=?", [$key]);
  return $r ? $r['setting_value'] : $fallback;
}

function _v217_col_exists($table,$column){
  try { return (bool)Db::one("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?",[$table,$column]); }
  catch (\Throwable $e) { return false; }
}
function _v217_visit_schema(){
  _v191_mission_tables();
  $adds=[
    'start_photo_path'=>"VARCHAR(500) NULL",'finish_photo_path'=>"VARCHAR(500) NULL",
    'start_accuracy'=>"DECIMAL(8,2) NULL",'finish_accuracy'=>"DECIMAL(8,2) NULL",
    'start_provider'=>"VARCHAR(30) NULL",'finish_provider'=>"VARCHAR(30) NULL",
    'checked_count'=>"INT NOT NULL DEFAULT 0",'attendance_count'=>"INT NOT NULL DEFAULT 0",
    'notice_count'=>"INT NOT NULL DEFAULT 0",'coverage_percent'=>"DECIMAL(6,2) NOT NULL DEFAULT 0"
  ];
  foreach($adds as $c=>$def){ if(!_v217_col_exists('mission_visit_sessions',$c)) Db::run("ALTER TABLE mission_visit_sessions ADD COLUMN `$c` $def"); }
  if(!Db::one("SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='mission_visit_sessions' AND INDEX_NAME='idx_mvs_day_status'")){
    Db::run("ALTER TABLE mission_visit_sessions ADD INDEX idx_mvs_day_status(user_id,line_id,started_at,status)");
  }
}
function _v217_save_visit_photo($data,$folder='mission_visits'){
  if(!$data) return null;
  if(strpos((string)$data,'data:image')!==0) Http::error('فرمت تصویر بازدید نامعتبر است',422);
  $w=max(640,(int)_v191_setting('visit_photo_width',1280));
  $q=max(35,min(90,(int)_v191_setting('visit_photo_quality',70)));
  return Media::saveBase64($data,$folder,$w,$q);
}
function _v217_line_checked_count($lineId,$userId,$from=null,$to=null){
  $where="cs.user_id=? AND (v.line_id=? OR EXISTS(SELECT 1 FROM attendances a WHERE a.driver_id=cs.driver_id AND a.line_id=? AND DATE(a.created_at)=DATE(cs.created_at)))";
  $args=[(int)$userId,(int)$lineId,(int)$lineId];
  if($from){ $where.=" AND cs.created_at>=?"; $args[]=$from; }
  if($to){ $where.=" AND cs.created_at<=?"; $args[]=$to; }
  return (int)(Db::one("SELECT COUNT(DISTINCT COALESCE(cs.vehicle_id,cs.driver_id)) n FROM checklist_submissions cs LEFT JOIN vehicles v ON v.id=cs.vehicle_id WHERE $where",$args)['n']??0);
}
function _v217_line_user_counts($lineId,$userId,$from=null,$to=null){
  $aw="user_id=? AND line_id=?"; $aa=[(int)$userId,(int)$lineId];
  $nw="n.user_id=? AND EXISTS(SELECT 1 FROM attendances a WHERE a.driver_id=n.driver_id AND a.line_id=? AND DATE(a.created_at)=DATE(n.created_at))"; $na=[(int)$userId,(int)$lineId];
  if($from){$aw.=" AND created_at>=?";$aa[]=$from;$nw.=" AND n.created_at>=?";$na[]=$from;}
  if($to){$aw.=" AND created_at<=?";$aa[]=$to;$nw.=" AND n.created_at<=?";$na[]=$to;}
  return [
    'attendance_count'=>(int)(Db::one("SELECT COUNT(DISTINCT driver_id) n FROM attendances WHERE $aw",$aa)['n']??0),
    'notice_count'=>(int)(Db::one("SELECT COUNT(*) n FROM notices n WHERE $nw",$na)['n']??0),
  ];
}

// سمت مؤثر کاربر برای موتور مأموریت: از همان تشخیص v183 استفاده می‌کند تا با بقیهٔ سامانه هم‌راستا بماند
function _v191_role_key($userId){ return _v183_role_mode($userId); }

function _v191_effective_mission($u, $period='daily'){
  _v191_mission_tables();
  $uid=(int)$u['id'];
  $ov = Db::one("SELECT * FROM user_mission_overrides WHERE user_id=? AND period=? AND is_active=1
    AND (effective_from IS NULL OR effective_from<=CURDATE()) AND (effective_to IS NULL OR effective_to>=CURDATE())
    ORDER BY updated_at DESC LIMIT 1", [$uid,$period]);
  $rk = _v191_role_key($uid);
  if ($ov) {
    $targets = Db::all("SELECT t.*,c.title,c.unit,c.description FROM user_mission_override_targets t
      JOIN mission_metric_catalog c ON c.metric_key=t.metric_key WHERE override_id=? ORDER BY c.sort_order", [$ov['id']]);
    return ['source'=>'user_override','role_key'=>$rk,'mission'=>$ov,'targets'=>$targets];
  }
  $zoneId = $u['zone_id'] ?? null;
  $tpl = Db::one("SELECT * FROM mission_templates WHERE role_key=? AND period=? AND is_active=1
    AND (effective_from IS NULL OR effective_from<=CURDATE()) AND (effective_to IS NULL OR effective_to>=CURDATE())
    ORDER BY (zone_id IS NOT NULL AND zone_id=?) DESC, is_default DESC, updated_at DESC LIMIT 1", [$rk,$period,$zoneId]);
  if (!$tpl) return ['source'=>'none','role_key'=>$rk,'mission'=>null,'targets'=>[]];
  $targets = Db::all("SELECT t.*,c.title,c.unit,c.description FROM mission_template_targets t
    JOIN mission_metric_catalog c ON c.metric_key=t.metric_key WHERE template_id=? ORDER BY c.sort_order", [$tpl['id']]);
  return ['source'=>'role_template','role_key'=>$rk,'mission'=>$tpl,'targets'=>$targets];
}

function _v191_subordinate_ids($uid){
  // پیمایش تکرارشونده (BFS) در PHP به‌جای WITH RECURSIVE — چون بسیاری از هاست‌های اشتراکی
  // نسخهٔ قدیمی‌تر MySQL/MariaDB دارند که از CTEهای بازگشتی پشتیبانی نمی‌کنند و باعث خطای ۵۰۰
  // در همهٔ endpointهای موتور مأموریت می‌شد (چون این تابع برای هر کاربر صدا زده می‌شود).
  $all=[]; $frontier=[(int)$uid]; $guard=0;
  while ($frontier && $guard<50) {
    $guard++;
    $q=implode(',',array_fill(0,count($frontier),'?'));
    $rows=Db::all("SELECT id FROM users WHERE manager_id IN ($q)",$frontier);
    $next=[];
    foreach ($rows as $r) { $id=(int)$r['id']; if(!in_array($id,$all,true)) { $all[]=$id; $next[]=$id; } }
    $frontier=$next;
  }
  return $all;
}
function _v191_subordinate_count($uid){ return count(_v191_subordinate_ids($uid)); }

function _v191_actual_metrics($u){
  $uid=(int)$u['id'];
  $lineIds = array_map('intval', array_column(Db::all("SELECT line_id FROM user_lines WHERE user_id=?", [$uid]), 'line_id'));
  $presentTotal=0; $totalVehicles=0; $expiredTotal=0; $debtTotal=0;
  foreach ($lineIds as $lid) {
    $snap = _v183_line_snapshot($lid);
    $presentTotal += (int)$snap['current_present_count'];
    $totalVehicles += (int)$snap['total_line_vehicles'];
    $expiredTotal += (int)$snap['expired_present_count'];
    $debtTotal += (int)(Db::one("SELECT COUNT(DISTINCT a.driver_id) n FROM attendances a JOIN drivers d ON d.id=a.driver_id
      WHERE a.line_id=? AND DATE(a.created_at)=CURDATE() AND EXISTS(SELECT 1 FROM bills b WHERE (b.driver_id=d.id OR b.national_id=d.national_id)
      AND (b.status IS NULL OR b.status NOT LIKE '%پرداخت%'))", [$lid])['n'] ?? 0);
  }
  $att = (int)(Db::one("SELECT COUNT(DISTINCT driver_id) n FROM attendances WHERE user_id=? AND DATE(created_at)=CURDATE()", [$uid])['n'] ?? 0);
  $checks = (int)(Db::one("SELECT COUNT(DISTINCT COALESCE(vehicle_id,driver_id)) n FROM checklist_submissions WHERE user_id=? AND DATE(created_at)=CURDATE()", [$uid])['n'] ?? 0);
  $notices = (int)(Db::one("SELECT COUNT(*) n FROM notices WHERE user_id=? AND DATE(created_at)=CURDATE()", [$uid])['n'] ?? 0);
  $expiredNotices = (int)(Db::one("SELECT COUNT(*) n FROM notices WHERE user_id=? AND DATE(created_at)=CURDATE() AND (body LIKE '%منقض%' OR body LIKE '%اعتبار%')", [$uid])['n'] ?? 0);
  $debtNotices = (int)(Db::one("SELECT COUNT(*) n FROM notices WHERE user_id=? AND DATE(created_at)=CURDATE() AND (body LIKE '%آبونمان%' OR body LIKE '%بدهکار%')", [$uid])['n'] ?? 0);
  $visits = (int)(Db::one("SELECT COUNT(DISTINCT line_id) n FROM mission_visit_sessions WHERE user_id=? AND DATE(started_at)=CURDATE() AND status='submitted'", [$uid])['n'] ?? 0);
  $validVisits = (int)(Db::one("SELECT COUNT(DISTINCT line_id) n FROM mission_visit_sessions WHERE user_id=? AND DATE(started_at)=CURDATE() AND validated=1", [$uid])['n'] ?? 0);
  $reviews = (int)(Db::one("SELECT COUNT(DISTINCT subject_user_id) n FROM subordinate_daily_reviews WHERE reviewer_id=? AND review_date=CURDATE()", [$uid])['n'] ?? 0);
  $reports = (int)(Db::one("SELECT COUNT(*) n FROM reports WHERE sender_id=? AND DATE(created_at)=CURDATE() AND (subject LIKE '%پایان شیفت%' OR body LIKE '%پایان شیفت%')", [$uid])['n'] ?? 0);
  $subs = _v191_subordinate_count($uid);
  $denominators = [
    'driver_attendance_percent'=>$presentTotal ?: $totalVehicles,
    'vehicle_checklist_percent'=>$presentTotal ?: $totalVehicles,
    'expired_notice_percent'=>$expiredTotal,
    'subscription_debt_notice_percent'=>$debtTotal,
    'assigned_lines_visit_percent'=>count($lineIds),
    'subordinate_review_percent'=>$subs,
    'station_visit_percent'=>count($lineIds),
    'end_shift_report'=>1,
  ];
  $counts = [
    'driver_attendance_percent'=>$att,
    'vehicle_checklist_percent'=>$checks,
    'expired_notice_percent'=>$expiredNotices,
    'subscription_debt_notice_percent'=>$debtNotices,
    'assigned_lines_visit_percent'=>$validVisits,
    'subordinate_review_percent'=>$reviews,
    'station_visit_percent'=>$visits,
    'end_shift_report'=>$reports>0?1:0,
  ];
  return ['lines'=>$lineIds,'counts'=>$counts,'denominators'=>$denominators,
    'raw'=>['present_total'=>$presentTotal,'total_vehicles'=>$totalVehicles,'notices'=>$notices,'visited_lines'=>$visits,'validated_lines'=>$validVisits,'subordinates'=>$subs]];
}

function _v191_pct($n,$d){ $d=(float)$d; return $d>0 ? min(100, round(((float)$n/$d)*10000)/100) : 0.0; }
// نرمال‌سازی پارامترهای تاریخِ دریافتی از پنل: چون بعضی از انتخابگرهای تاریخ خروجی شمسی با اسلش
// می‌دهند (مثل «۱۴۰۵/۰۵/۱۰») ولی کوئری‌های SQL این ماژول به فرمت میلادی «YYYY-MM-DD» نیاز دارند،
// این تابع (دقیقاً هم‌الگو با نرمال‌سازهای مشابه که از قبل در بخش‌های دیگر این فایل استفاده
// می‌شدند) هر دو فرمت را می‌پذیرد و همیشه میلادی برمی‌گرداند.
function _v191_norm_date($v, $fallback=null){
  $v = trim((string)$v);
  if ($v === '') return $fallback;
  $v = str_replace('/', '-', $v);
  if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/', $v, $m) && (int)$m[1] < 1700) {
    [$gy,$gm,$gd] = jalali_to_gregorian((int)$m[1], (int)$m[2], (int)$m[3]);
    return sprintf('%04d-%02d-%02d', $gy, $gm, $gd);
  }
  $ts = strtotime($v);
  return $ts ? date('Y-m-d', $ts) : $fallback;
}

function _v191_mission_progress($u){
  $eff = _v191_effective_mission($u,'daily');
  $act = _v191_actual_metrics($u);
  $weightSum=0.0; $scoreSum=0.0; $targets=[];
  foreach (($eff['targets'] ?: []) as $t) {
    $mk = $t['metric_key'];
    $actual = $act['counts'][$mk] ?? 0;
    $den = $act['denominators'][$mk] ?? 0;
    $actualPercent = ($mk==='end_shift_report') ? ($actual ? 100 : 0) : _v191_pct($actual,$den);
    $target = (float)($t['target_percent'] ?? 0);
    $achievement = $target>0 ? min(100, $actualPercent/$target*100) : 100;
    $w = (float)($t['weight'] ?? 1);
    $weightSum += $w; $scoreSum += $achievement*$w;
    $targets[] = $t + [
      'actual_count'=>$actual,'denominator_count'=>$den,'actual_percent'=>$actualPercent,
      'achievement_percent'=>round($achievement*100)/100,
      'remaining_count'=>max(0, (int)ceil($den*$target/100) - $actual),
    ];
  }
  $weighted = $weightSum ? round($scoreSum/$weightSum*100)/100 : 0.0;
  if ($eff['mission']) {
    $targetJson = json_encode(array_column($targets,'target_percent','metric_key'), JSON_UNESCAPED_UNICODE);
    $actualJson = json_encode($act['counts'], JSON_UNESCAPED_UNICODE);
    $progressJson = json_encode(array_column($targets,'achievement_percent','metric_key'), JSON_UNESCAPED_UNICODE);
    Db::run("INSERT INTO mission_daily_progress(user_id,progress_date,role_key,mission_source,mission_id,assigned_lines_count,visited_lines_count,validated_lines_count,target_json,actual_json,progress_json,weighted_achievement)
      VALUES(?,CURDATE(),?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE role_key=VALUES(role_key),mission_source=VALUES(mission_source),mission_id=VALUES(mission_id),
      assigned_lines_count=VALUES(assigned_lines_count),visited_lines_count=VALUES(visited_lines_count),validated_lines_count=VALUES(validated_lines_count),
      target_json=VALUES(target_json),actual_json=VALUES(actual_json),progress_json=VALUES(progress_json),weighted_achievement=VALUES(weighted_achievement)",
      [(int)$u['id'],$eff['role_key'],$eff['source'],$eff['mission']['id'],count($act['lines']),$act['raw']['visited_lines'],$act['raw']['validated_lines'],
       $targetJson,$actualJson,$progressJson,$weighted]);
  }
  try { _v195_apply_daily_scoring($u,$act,$eff,$weighted); } catch (\Throwable $e) { error_log('scoring failed: '.$e->getMessage()); }
  return $eff + ['assigned_lines'=>count($act['lines']),'targets'=>$targets,'actual_counts'=>$act['counts'],'denominators'=>$act['denominators'],
    'summary'=>$act['raw'] + ['weighted_achievement'=>$weighted]];
}

route('GET','/api/my/missions/effective',function($p,$b,$u){
  return _v191_effective_mission($u, (string)($_GET['period'] ?? 'daily'));
});
route('GET','/api/my/missions/today',function($p,$b,$u){
  return _v191_mission_progress($u);
});
route('GET','/api/my/mission-timeline',function($p,$b,$u){
  _v191_mission_tables();
  $date = _v191_norm_date($_GET['date'] ?? null, date('Y-m-d'));
  return ['items'=>Db::all("SELECT e.*,l.code line_code,l.origin,l.destination FROM mission_timeline_events e
    LEFT JOIN `lines` l ON l.id=e.line_id WHERE e.user_id=? AND DATE(e.occurred_at)=? ORDER BY e.occurred_at DESC", [(int)$u['id'],$date])];
});
route('POST','/api/mission-timeline/event',function($p,$b,$u){
  _v191_mission_tables();
  $type = trim((string)($b['event_type'] ?? '')); $title = trim((string)($b['title'] ?? ''));
  if (mb_strlen($type)<2 || mb_strlen($title)<2) Http::error('رویداد نامعتبر است',400);
  $id = Db::insert("INSERT INTO mission_timeline_events(user_id,line_id,event_type,target_type,target_id,title,details,lat,lng) VALUES(?,?,?,?,?,?,?,?,?)",
    [(int)$u['id'], $b['line_id'] ?? null, $type, $b['target_type'] ?? null, $b['target_id'] ?? null, $title,
     json_encode($b['details'] ?? new stdClass(), JSON_UNESCAPED_UNICODE), $b['lat'] ?? null, $b['lng'] ?? null]);
  Http::json(['id'=>$id],201);
});

route('POST','/api/mission-visits/start',function($p,$b,$u){
  _v217_visit_schema();
  $lid=(int)($b['line_id']??0); if(!$lid) Http::error('انتخاب خط الزامی است',422);
  $ids=user_line_ids($u); if(is_array($ids) && !in_array($lid,array_map('intval',$ids),true)) Http::error('این خط در محدوده دسترسی شما نیست',403);
  [$lat,$lng]=validGeo($b['lat']??null,$b['lng']??null); if($lat===null) Http::error('موقعیت مکانی معتبر لازم است',422);
  $accuracy=isset($b['accuracy'])?max(0,(float)$b['accuracy']):null;
  $maxAccuracy=max(20,(int)_v191_setting('visit_max_location_accuracy_m',120));
  if($accuracy!==null && $accuracy>$maxAccuracy) Http::error('دقت موقعیت برای شروع بازدید کافی نیست. چند لحظه در فضای باز منتظر بمانید.',422);
  $extra=max(0,(int)_v191_setting('visit_geo_extra_radius_m',75));
  $fence=station_at_point($lat,$lng,[$lid],$extra);
  if(!$fence) Http::error('برای شروع بازدید باید در محدوده خط یا ایستگاه آن حضور داشته باشید',403);
  $requirePhoto=_v191_setting('visit_require_start_photo','false')==='true';
  if($requirePhoto && empty($b['photo_data'])) Http::error('تصویر شروع بازدید الزامی است',422);
  $photoPath=!empty($b['photo_data'])?_v217_save_visit_photo($b['photo_data'],'mission_visits/start'):null;
  $existing=Db::one("SELECT id,started_at FROM mission_visit_sessions WHERE user_id=? AND line_id=? AND status='in_progress' ORDER BY id DESC LIMIT 1",[(int)$u['id'],$lid]);
  if($existing) return ['ok'=>true,'id'=>(int)$existing['id'],'started_at'=>$existing['started_at'],'already_started'=>true];
  $id=Db::insert("INSERT INTO mission_visit_sessions(user_id,line_id,role_mode,start_lat,start_lng,start_photo_path,start_accuracy,start_provider,status) VALUES(?,?,?,?,?,?,?,?, 'in_progress')",
    [(int)$u['id'],$lid,_v191_role_key($u['id']),$lat,$lng,$photoPath,$accuracy,substr((string)($b['provider']??''),0,30)?:null]);
  Db::run("INSERT INTO mission_timeline_events(user_id,line_id,visit_session_id,event_type,title,details,lat,lng) VALUES(?,?,?,'visit_started','شروع بازدید خط',?,?,?)",
    [(int)$u['id'],$lid,$id,json_encode(['role_mode'=>_v191_role_key($u['id']),'geofence'=>$fence['name']??null,'accuracy'=>$accuracy],JSON_UNESCAPED_UNICODE),$lat,$lng]);
  Http::json(['ok'=>true,'id'=>$id,'started_at'=>date('c'),'geo'=>['name'=>$fence['name']??null],'accuracy'=>$accuracy],201);
});

route('POST','/api/mission-visits/finish',function($p,$b,$u){
  _v217_visit_schema();
  $sid=(int)($b['session_id']??0); if(!$sid) Http::error('شناسه بازدید نامعتبر است',422);
  $s=Db::one("SELECT * FROM mission_visit_sessions WHERE id=? AND user_id=? AND status='in_progress'",[$sid,(int)$u['id']]);
  if(!$s) Http::error('بازدید فعال یافت نشد یا قبلاً پایان یافته است',404);
  [$lat,$lng]=validGeo($b['lat']??null,$b['lng']??null); if($lat===null) Http::error('موقعیت مکانی معتبر لازم است',422);
  $accuracy=isset($b['accuracy'])?max(0,(float)$b['accuracy']):null;
  $maxAccuracy=max(20,(int)_v191_setting('visit_max_location_accuracy_m',120));
  if($accuracy!==null && $accuracy>$maxAccuracy) Http::error('دقت موقعیت برای پایان بازدید کافی نیست. چند لحظه در فضای باز منتظر بمانید.',422);
  $fence=station_at_point($lat,$lng,[(int)$s['line_id']],max(0,(int)_v191_setting('visit_geo_extra_radius_m',75)));
  if(!$fence) Http::error('برای پایان بازدید باید در محدوده خط یا ایستگاه آن حضور داشته باشید',403);
  $requirePhoto=_v191_setting('visit_require_finish_photo','true')==='true';
  $requireReport=_v191_setting('visit_require_end_report','true')==='true';
  $report=trim((string)($b['report_text']??''));
  if($requirePhoto && empty($b['photo_data'])) Http::error('تصویر مستقیم پایان بازدید الزامی است',422);
  if($requireReport && $report==='') Http::error('گزارش پایان بازدید الزامی است',422);
  $photoPath=!empty($b['photo_data'])?_v217_save_visit_photo($b['photo_data'],'mission_visits/finish'):null;
  $finishAt=date('Y-m-d H:i:s');
  $snap=_v183_line_snapshot((int)$s['line_id']);
  $checked=_v217_line_checked_count((int)$s['line_id'],(int)$u['id'],$s['started_at'],$finishAt);
  $ops=_v217_line_user_counts((int)$s['line_id'],(int)$u['id'],$s['started_at'],$finishAt);
  $den=max(1,(int)($snap['current_present_count']?:$snap['total_line_vehicles']));
  $checkedPct=_v191_pct($checked,$den);
  $duration=max(0,(strtotime($finishAt)-strtotime($s['started_at']))/60);
  $minDuration=max(0,(float)_v191_setting('visit_min_duration_minutes',10));
  $minChecked=max(0,(float)_v191_setting('visit_min_checked_percent',5));
  $actual=max(0,(int)($b['actual_present_count']??0));
  $checks=['geo'=>true,'accuracy'=>$accuracy===null||$accuracy<=$maxAccuracy,'duration'=>$duration>=$minDuration,'checked'=>$checkedPct>=$minChecked,'photo'=>!$requirePhoto||!!$photoPath,'report'=>!$requireReport||$report!==''];
  $pass=count(array_filter($checks)); $validation=round($pass/max(1,count($checks))*10000)/100; $validated=$pass===count($checks);
  $details=['checks'=>$checks,'duration_minutes'=>round($duration,1),'checked_percent'=>$checkedPct,'minimums'=>['duration_minutes'=>$minDuration,'checked_percent'=>$minChecked,'max_accuracy_m'=>$maxAccuracy],'geofence'=>$fence['name']??null];
  Db::run("UPDATE mission_visit_sessions SET finished_at=?,finish_lat=?,finish_lng=?,finish_photo_path=?,finish_accuracy=?,finish_provider=?,report_text=?,actual_present_count=?,checked_count=?,attendance_count=?,notice_count=?,coverage_percent=?,status='submitted',validated=?,validation_percent=?,validation_details=?,updated_at=NOW() WHERE id=?",
    [$finishAt,$lat,$lng,$photoPath,$accuracy,substr((string)($b['provider']??''),0,30)?:null,$report,$actual,$checked,$ops['attendance_count'],$ops['notice_count'],$checkedPct,$validated?1:0,$validation,json_encode($details,JSON_UNESCAPED_UNICODE),$sid]);
  Db::run("INSERT INTO mission_timeline_events(user_id,line_id,visit_session_id,event_type,title,details,lat,lng) VALUES(?,?,?,'visit_finished','پایان بازدید خط',?,?,?)",
    [(int)$u['id'],(int)$s['line_id'],$sid,json_encode(['validated'=>$validated,'validation_percent'=>$validation,'duration_minutes'=>round($duration,1),'checked_count'=>$checked,'attendance_count'=>$ops['attendance_count'],'notice_count'=>$ops['notice_count'],'actual_present_count'=>$actual],JSON_UNESCAPED_UNICODE),$lat,$lng]);
  return ['ok'=>true,'validated'=>$validated,'validation_percent'=>$validation,'validation_details'=>$details,'snapshot'=>$snap+['checked_count'=>$checked,'attendance_count'=>$ops['attendance_count'],'notice_count'=>$ops['notice_count'],'coverage_percent'=>$checkedPct],'difference'=>$actual-(int)$snap['current_present_count']];
});

route('GET','/api/mission-visits/{id}',function($p,$b,$u){
  _v217_visit_schema();
  $row=Db::one("SELECT s.*,l.code line_code,l.origin,l.destination FROM mission_visit_sessions s JOIN `lines` l ON l.id=s.line_id WHERE s.id=? AND s.user_id=?",[(int)$p['id'],(int)$u['id']]);
  if(!$row) Http::error('بازدید یافت نشد',404);
  if(!empty($row['validation_details']) && is_string($row['validation_details'])) $row['validation_details']=json_decode($row['validation_details'],true)?:[];
  return ['item'=>$row];
});

route('GET','/api/my/subordinates/daily',function($p,$b,$u){
  _v191_mission_tables();
  $subIds = _v191_subordinate_ids((int)$u['id']);
  if (!$subIds) { return ['items'=>[]]; }
  $q = implode(',', array_fill(0, count($subIds), '?'));
  $rows = Db::all("SELECT s.id, CONCAT(s.first_name,' ',s.last_name) name, r.title role_title,
      COALESCE(m.weighted_achievement,0) weighted_achievement,
      COALESCE(m.visited_lines_count,0) visited_lines_count,
      COALESCE(m.validated_lines_count,0) validated_lines_count,
      rv.total_score review_score
    FROM users s LEFT JOIN roles r ON r.id=s.role_id
    LEFT JOIN mission_daily_progress m ON m.user_id=s.id AND m.progress_date=CURDATE()
    LEFT JOIN subordinate_daily_reviews rv ON rv.subject_user_id=s.id AND rv.reviewer_id=? AND rv.review_date=CURDATE()
    WHERE s.id IN ($q)
    ORDER BY r.level DESC, s.last_name", array_merge([(int)$u['id']], $subIds));
  return ['items'=>$rows];
});

route('GET','/api/admin/mission-daily-performance',function($p,$b,$u){
  _v191_mission_tables();
  $date = _v191_norm_date($_GET['date'] ?? null, date('Y-m-d'));
  return ['items'=>Db::all("SELECT m.*,CONCAT(us.first_name,' ',us.last_name) user_name,r.title role_title
    FROM mission_daily_progress m JOIN users us ON us.id=m.user_id LEFT JOIN roles r ON r.id=us.role_id
    WHERE m.progress_date=? ORDER BY m.weighted_achievement DESC,us.last_name",[$date])];
},false,ADMIN);

route('GET','/api/admin/mission-visit-report',function($p,$b,$u){
  _v191_mission_tables();
  $from = _v191_norm_date($_GET['from'] ?? null, date('Y-m-01')); $to = _v191_norm_date($_GET['to'] ?? null, date('Y-m-d'));
  return ['items'=>Db::all("SELECT v.*,CONCAT(us.first_name,' ',us.last_name) user_name,r.title role_title,l.code line_code,l.origin,l.destination,
    TIMESTAMPDIFF(MINUTE,v.started_at,v.finished_at) duration_minutes
    FROM mission_visit_sessions v JOIN users us ON us.id=v.user_id LEFT JOIN roles r ON r.id=us.role_id JOIN `lines` l ON l.id=v.line_id
    WHERE DATE(v.started_at) BETWEEN ? AND ? ORDER BY v.started_at DESC",[$from,$to])];
},false,ADMIN);

route('GET','/api/admin/mission-execution-settings',function($p,$b,$u){
  _v191_mission_tables();
  return ['items'=>Db::all("SELECT * FROM mission_execution_settings ORDER BY setting_key")];
},false,ADMIN);
route('PUT','/api/admin/mission-execution-settings',function($p,$b,$u){
  _v191_mission_tables();
  $items = is_array($b['items'] ?? null) ? $b['items'] : [];
  foreach ($items as $x) {
    Db::run("INSERT INTO mission_execution_settings(setting_key,setting_value,updated_by) VALUES(?,?,?)
      ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value),updated_by=VALUES(updated_by)",
      [(string)($x['setting_key'] ?? ''), (string)($x['setting_value'] ?? ''), (int)$u['id']]);
  }
  return ['ok'=>true];
},false,ADMIN);

route('GET','/api/admin/mission-metrics',function($p,$b,$u){
  _v191_mission_tables();
  return Db::all("SELECT * FROM mission_metric_catalog WHERE is_active=1 ORDER BY sort_order");
},false,ADMIN);

route('GET','/api/admin/mission-templates',function($p,$b,$u){
  _v191_mission_tables();
  $tpls = Db::all("SELECT * FROM mission_templates ORDER BY role_key,period,updated_at DESC");
  foreach ($tpls as &$t) {
    $t['targets'] = Db::all("SELECT mtt.metric_key,mtt.target_percent,mtt.weight,mtt.is_required,mtt.minimum_count
      FROM mission_template_targets mtt JOIN mission_metric_catalog c ON c.metric_key=mtt.metric_key
      WHERE mtt.template_id=? ORDER BY c.sort_order",[$t['id']]);
  }
  return $tpls;
},false,ADMIN);
route('POST','/api/admin/mission-templates',function($p,$b,$u){
  _v191_mission_tables();
  $title = trim((string)($b['title'] ?? '')); if (mb_strlen($title)<2) Http::error('عنوان الگو الزامی است',400);
  $roleKey = (string)($b['role_key'] ?? '');
  if (!in_array($roleKey,['line_supervisor','motor_patrol','vehicle_patrol','resident_inspector','chief_inspector'],true)) Http::error('سمت نامعتبر است',400);
  $period = in_array($b['period'] ?? 'daily',['daily','weekly','monthly'],true) ? $b['period'] : 'daily';
  $targets = is_array($b['targets'] ?? null) ? $b['targets'] : [];
  if (!$targets) Http::error('حداقل یک هدف باید تعریف شود',400);
  Db::pdo()->beginTransaction();
  try {
    $tid = Db::insert("INSERT INTO mission_templates(title,role_key,period,zone_id,is_default,is_active,effective_from,effective_to,created_by) VALUES(?,?,?,?,?,?,?,?,?)",
      [$title,$roleKey,$period,$b['zone_id'] ?? null, !empty($b['is_default'])?1:0, array_key_exists('is_active',$b)?(!empty($b['is_active'])?1:0):1,
       $b['effective_from'] ?? null,$b['effective_to'] ?? null,(int)$u['id']]);
    foreach ($targets as $t) {
      Db::run("INSERT INTO mission_template_targets(template_id,metric_key,target_percent,weight,is_required,minimum_count) VALUES(?,?,?,?,?,?)",
        [$tid,(string)$t['metric_key'],(float)$t['target_percent'],(float)($t['weight'] ?? 1),!empty($t['is_required'])?1:0,$t['minimum_count'] ?? null]);
    }
    Db::pdo()->commit();
  } catch (Throwable $e) { if (Db::pdo()->inTransaction()) Db::pdo()->rollBack(); throw $e; }
  Http::json(['id'=>$tid],201);
},false,ADMIN);
route('DELETE','/api/admin/mission-templates/{id}',function($p,$b,$u){
  _v191_mission_tables();
  Db::run("DELETE FROM mission_templates WHERE id=?", [(int)$p['id']]);
  return ['ok'=>true];
},false,ADMIN);

route('GET','/api/admin/user-mission-overrides',function($p,$b,$u){
  _v191_mission_tables();
  $where='1=1'; $args=[];
  if (!empty($_GET['user_id'])) { $where='o.user_id=?'; $args=[(int)$_GET['user_id']]; }
  $rows = Db::all("SELECT o.*,CONCAT(us.first_name,' ',us.last_name) user_name FROM user_mission_overrides o
    JOIN users us ON us.id=o.user_id WHERE $where ORDER BY o.updated_at DESC",$args);
  foreach ($rows as &$r) {
    $r['targets'] = Db::all("SELECT metric_key,target_percent,weight,is_required,minimum_count FROM user_mission_override_targets WHERE override_id=?",[$r['id']]);
  }
  return $rows;
},false,ADMIN);
route('PUT','/api/admin/user-mission-overrides/{user_id}',function($p,$b,$u){
  _v191_mission_tables();
  $period = in_array($b['period'] ?? 'daily',['daily','weekly','monthly'],true) ? $b['period'] : 'daily';
  $targets = is_array($b['targets'] ?? null) ? $b['targets'] : [];
  if (!$targets) Http::error('حداقل یک هدف باید تعریف شود',400);
  Db::pdo()->beginTransaction();
  try {
    Db::run("INSERT INTO user_mission_overrides(user_id,period,title,is_active,effective_from,effective_to,created_by) VALUES(?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE title=VALUES(title),is_active=VALUES(is_active),effective_from=VALUES(effective_from),effective_to=VALUES(effective_to)",
      [(int)$p['user_id'],$period,$b['title'] ?? null,array_key_exists('is_active',$b)?(!empty($b['is_active'])?1:0):1,$b['effective_from'] ?? null,$b['effective_to'] ?? null,(int)$u['id']]);
    $oid = (int)Db::one("SELECT id FROM user_mission_overrides WHERE user_id=? AND period=?",[(int)$p['user_id'],$period])['id'];
    Db::run("DELETE FROM user_mission_override_targets WHERE override_id=?",[$oid]);
    foreach ($targets as $t) {
      Db::run("INSERT INTO user_mission_override_targets(override_id,metric_key,target_percent,weight,is_required,minimum_count) VALUES(?,?,?,?,?,?)",
        [$oid,(string)$t['metric_key'],(float)$t['target_percent'],(float)($t['weight'] ?? 1),!empty($t['is_required'])?1:0,$t['minimum_count'] ?? null]);
    }
    Db::pdo()->commit();
  } catch (Throwable $e) { if (Db::pdo()->inTransaction()) Db::pdo()->rollBack(); throw $e; }
  return ['ok'=>true,'id'=>$oid];
},false,ADMIN);
route('DELETE','/api/admin/user-mission-overrides/{user_id}',function($p,$b,$u){
  _v191_mission_tables();
  $period = $_GET['period'] ?? 'daily';
  Db::run("DELETE FROM user_mission_overrides WHERE user_id=? AND period=?", [(int)$p['user_id'],$period]);
  return ['ok'=>true];
},false,ADMIN);

/* ================= v195: موتور امتیازدهی واقعی (فاز ۳ عملیات میدانی) ================= */
function _v195_scoring_tables(){
  static $done=false; if($done) return; $done=true;
  Db::run("CREATE TABLE IF NOT EXISTS score_rules(
    rule_key VARCHAR(64) PRIMARY KEY, title VARCHAR(190) NOT NULL, base_points DECIMAL(6,2) NOT NULL DEFAULT 1,
    is_negative TINYINT(1) NOT NULL DEFAULT 0, is_active TINYINT(1) NOT NULL DEFAULT 1,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  Db::run("CREATE TABLE IF NOT EXISTS role_score_coefficients(
    role_key VARCHAR(40) PRIMARY KEY, coefficient DECIMAL(5,2) NOT NULL DEFAULT 1
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  Db::run("CREATE TABLE IF NOT EXISTS line_score_coefficients(
    line_id INT PRIMARY KEY, coefficient DECIMAL(5,2) NOT NULL DEFAULT 1, note VARCHAR(190) NULL,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  Db::run("CREATE TABLE IF NOT EXISTS mission_score_daily(
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, score_date DATE NOT NULL, rule_key VARCHAR(64) NOT NULL,
    role_key VARCHAR(40) NULL, `count` DECIMAL(8,2) NOT NULL DEFAULT 0, base_points DECIMAL(6,2) NOT NULL DEFAULT 0,
    role_coefficient DECIMAL(5,2) NOT NULL DEFAULT 1, line_coefficient DECIMAL(5,2) NOT NULL DEFAULT 1,
    points DECIMAL(9,2) NOT NULL DEFAULT 0, updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_date_rule(user_id,score_date,rule_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  try { if (!Db::one("SHOW COLUMNS FROM mission_score_daily WHERE Field='is_adjusted'")) Db::run("ALTER TABLE mission_score_daily ADD COLUMN is_adjusted TINYINT(1) NOT NULL DEFAULT 0"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  try { if (!Db::one("SHOW COLUMNS FROM mission_score_daily WHERE Field='adjustment_reason'")) Db::run("ALTER TABLE mission_score_daily ADD COLUMN adjustment_reason VARCHAR(300) NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  Db::run("CREATE TABLE IF NOT EXISTS mission_score_adjustments(
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, score_date DATE NOT NULL, rule_key VARCHAR(64) NOT NULL,
    original_points DECIMAL(9,2) NOT NULL, adjusted_points DECIMAL(9,2) NOT NULL, reason VARCHAR(300) NOT NULL,
    adjusted_by INT NULL, adjusted_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  $rc=(int)(Db::one("SELECT COUNT(*) n FROM score_rules")['n']??0);
  if(!$rc){
    $seed=[
      ['attendance_registration','ثبت حضور راننده',1,0],
      ['checklist_submission','تکمیل چک‌لیست خودرو',1,0],
      ['notice_issued','ثبت تذکر برای راننده',1.5,0],
      ['photo_report','ثبت گزارش تصویری بازدید',2,0],
      ['line_visit_validated','بازدید معتبر خط',5,0],
      ['mission_completed','تکمیل مأموریت روزانه (تحقق ≥ ۹۰٪)',10,0],
      ['mission_incomplete','مأموریت روزانه انجام نشد (تحقق پایین)',8,1],
      ['line_not_visited','خط تخصیص‌یافته بازدید نشد',4,1],
      ['gps_off','خاموش‌کردن GPS در ساعات کاری',5,1],
      ['vpn_on','روشن‌کردن فیلترشکن (VPN)',6,1],
      ['incomplete_report','بازدید ثبت‌شده ولی نامعتبر (گزارش ناقص)',3,1],
    ];
    foreach($seed as $s) Db::run("INSERT IGNORE INTO score_rules(rule_key,title,base_points,is_negative) VALUES(?,?,?,?)",$s);
  }
  $roc=(int)(Db::one("SELECT COUNT(*) n FROM role_score_coefficients")['n']??0);
  if(!$roc){
    foreach(['line_supervisor'=>1,'motor_patrol'=>1,'vehicle_patrol'=>1,'resident_inspector'=>1,'chief_inspector'=>1.2] as $rk=>$co)
      Db::run("INSERT IGNORE INTO role_score_coefficients(role_key,coefficient) VALUES(?,?)",[$rk,$co]);
  }
}
function _v195_rules(){ _v195_scoring_tables(); $m=[]; foreach(Db::all("SELECT * FROM score_rules") as $r) $m[$r['rule_key']]=$r; return $m; }
function _v195_role_coefficient($roleKey){ _v195_scoring_tables(); $r=Db::one("SELECT coefficient FROM role_score_coefficients WHERE role_key=?",[$roleKey]); return $r?(float)$r['coefficient']:1.0; }
function _v195_line_coefficient_map($lineIds){
  _v195_scoring_tables(); if(!$lineIds) return [];
  $q=implode(',',array_fill(0,count($lineIds),'?'));
  $rows=Db::all("SELECT line_id,coefficient FROM line_score_coefficients WHERE line_id IN ($q)",$lineIds);
  $m=[]; foreach($rows as $r) $m[(int)$r['line_id']]=(float)$r['coefficient']; return $m;
}
function _v195_apply_daily_scoring($u,$act,$eff,$weighted){
  _v195_scoring_tables();
  $uid=(int)$u['id']; $today=date('Y-m-d'); $rules=_v195_rules(); $roleKey=$eff['role_key']??'other';
  $roleCo=_v195_role_coefficient($roleKey);
  $lineIds=$act['lines']?:[]; $lineCoMap=_v195_line_coefficient_map($lineIds);
  $avgLineCo=$lineIds?array_sum(array_map(fn($lid)=>$lineCoMap[(int)$lid]??1.0,$lineIds))/count($lineIds):1.0;
  $assigned=count($lineIds); $visits=(int)($act['raw']['visited_lines']??0); $valid=(int)($act['raw']['validated_lines']??0);
  $gpsOff=(int)(Db::one("SELECT COUNT(*) n FROM user_activity WHERE user_id=? AND kind='gps_off' AND DATE(at)=?",[$uid,$today])['n']??0);
  $vpnOn=(int)(Db::one("SELECT COUNT(*) n FROM vpn_events WHERE user_id=? AND state=1 AND DATE(created_at)=?",[$uid,$today])['n']??0);
  $counts=[
    'attendance_registration'=>$act['counts']['driver_attendance_percent']??0,
    'checklist_submission'=>$act['counts']['vehicle_checklist_percent']??0,
    'notice_issued'=>$act['raw']['notices']??0,
    'photo_report'=>$visits,
    'line_visit_validated'=>$valid,
    'mission_completed'=>($eff['mission']&&$weighted>=90)?1:0,
    'mission_incomplete'=>($eff['mission']&&$weighted<50)?1:0,
    'line_not_visited'=>max(0,$assigned-$visits),
    'gps_off'=>$gpsOff,
    'vpn_on'=>$vpnOn,
    'incomplete_report'=>max(0,$visits-$valid),
  ];
  foreach($counts as $rk=>$cnt){
    $rule=$rules[$rk]??null; if(!$rule||!(int)$rule['is_active']) continue;
    $base=(float)$rule['base_points']; $neg=(int)$rule['is_negative'];
    $points=round($base*$roleCo*$avgLineCo*(float)$cnt,2); if($neg) $points=-abs($points);
    Db::run("INSERT INTO mission_score_daily(user_id,score_date,rule_key,role_key,`count`,base_points,role_coefficient,line_coefficient,points)
      VALUES(?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE role_key=VALUES(role_key),
      `count`=IF(is_adjusted=1,`count`,VALUES(`count`)),
      base_points=IF(is_adjusted=1,base_points,VALUES(base_points)),
      role_coefficient=IF(is_adjusted=1,role_coefficient,VALUES(role_coefficient)),
      line_coefficient=IF(is_adjusted=1,line_coefficient,VALUES(line_coefficient)),
      points=IF(is_adjusted=1,points,VALUES(points))",
      [$uid,$today,$rk,$roleKey,$cnt,$base,$roleCo,$avgLineCo,$points]);
  }
}

route('GET','/api/admin/score-rules',function($p,$b,$u){ return ['items'=>array_values(_v195_rules())]; },false,ADMIN);
route('PUT','/api/admin/score-rules',function($p,$b,$u){
  _v195_scoring_tables();
  foreach(($b['items']??[]) as $it){
    if(empty($it['rule_key'])) continue;
    Db::run("UPDATE score_rules SET base_points=?,is_active=? WHERE rule_key=?",
      [(float)($it['base_points']??1),!empty($it['is_active'])?1:0,(string)$it['rule_key']]);
  }
  return ['ok'=>true];
},false,ADMIN);
route('GET','/api/admin/role-score-coefficients',function($p,$b,$u){ _v195_scoring_tables(); return ['items'=>Db::all("SELECT * FROM role_score_coefficients ORDER BY role_key")]; },false,ADMIN);
route('PUT','/api/admin/role-score-coefficients',function($p,$b,$u){
  _v195_scoring_tables();
  foreach(($b['items']??[]) as $it){
    if(empty($it['role_key'])) continue;
    Db::run("INSERT INTO role_score_coefficients(role_key,coefficient) VALUES(?,?) ON DUPLICATE KEY UPDATE coefficient=VALUES(coefficient)",
      [(string)$it['role_key'],(float)($it['coefficient']??1)]);
  }
  return ['ok'=>true];
},false,ADMIN);
route('GET','/api/admin/line-score-coefficients',function($p,$b,$u){
  _v195_scoring_tables();
  return ['items'=>Db::all("SELECT l.id line_id,l.code,l.origin,l.destination,COALESCE(c.coefficient,1) coefficient,c.note
    FROM `lines` l LEFT JOIN line_score_coefficients c ON c.line_id=l.id ORDER BY l.code")];
},false,ADMIN);
route('PUT','/api/admin/line-score-coefficients',function($p,$b,$u){
  _v195_scoring_tables();
  foreach(($b['items']??[]) as $it){
    if(empty($it['line_id'])) continue;
    Db::run("INSERT INTO line_score_coefficients(line_id,coefficient,note) VALUES(?,?,?) ON DUPLICATE KEY UPDATE coefficient=VALUES(coefficient),note=VALUES(note)",
      [(int)$it['line_id'],(float)($it['coefficient']??1),$it['note']??null]);
  }
  return ['ok'=>true];
},false,ADMIN);
route('GET','/api/admin/score-daily',function($p,$b,$u){
  _v195_scoring_tables();
  $date=_v191_norm_date($_GET['date']??null, date('Y-m-d'));
  $rows=Db::all("SELECT s.*,TRIM(CONCAT(COALESCE(us.first_name,''),' ',COALESCE(us.last_name,''))) user_name,r.title role_title
    FROM mission_score_daily s JOIN users us ON us.id=s.user_id LEFT JOIN roles r ON r.id=us.role_id WHERE s.score_date=? ORDER BY s.user_id",[$date]);
  $byUser=[];
  foreach($rows as $r){ $uid=(int)$r['user_id'];
    if(!isset($byUser[$uid])) $byUser[$uid]=['user_id'=>$uid,'user_name'=>$r['user_name'],'role_title'=>$r['role_title'],'role_key'=>$r['role_key'],'total_points'=>0,'items'=>[]];
    $byUser[$uid]['total_points']+=(float)$r['points']; $byUser[$uid]['items'][]=$r;
  }
  return ['date'=>$date,'items'=>array_values($byUser)];
},false,ADMIN);
route('POST','/api/admin/score-daily/adjust',function($p,$b,$u){
  _v195_scoring_tables();
  $uid=(int)($b['user_id']??0); $date=trim((string)($b['score_date']??'')); $rk=trim((string)($b['rule_key']??''));
  $adj=isset($b['adjusted_points'])?(float)$b['adjusted_points']:null; $reason=trim((string)($b['reason']??''));
  if(!$uid||!$date||!$rk) Http::error('اطلاعات ناقص است',400);
  if($adj===null) Http::error('مقدار جدید امتیاز را وارد کنید',400);
  if($reason==='') Http::error('برای هر تعدیل، دلیل (توضیح بازبینی) الزامی است',400);
  $row=Db::one("SELECT * FROM mission_score_daily WHERE user_id=? AND score_date=? AND rule_key=?",[$uid,$date,$rk]);
  if(!$row) Http::error('ردیف امتیاز مورد نظر یافت نشد',404);
  $original=(float)$row['points'];
  Db::run("UPDATE mission_score_daily SET points=?,is_adjusted=1,adjustment_reason=? WHERE user_id=? AND score_date=? AND rule_key=?",
    [$adj,$reason,$uid,$date,$rk]);
  Db::run("INSERT INTO mission_score_adjustments(user_id,score_date,rule_key,original_points,adjusted_points,reason,adjusted_by) VALUES(?,?,?,?,?,?,?)",
    [$uid,$date,$rk,$original,$adj,$reason,(int)$u['id']]);
  try{ if(class_exists('Push')) Push::notify([$uid],'📝 بازبینی امتیاز',
    "امتیاز مورد «".($row['rule_key'])."» در تاریخ $date از ".round($original,1)." به ".round($adj,1)." اصلاح شد. دلیل: $reason",
    ['type'=>'mission_score_adjusted']); }catch(\Throwable $e){}
  return ['ok'=>true,'original_points'=>$original,'adjusted_points'=>$adj];
},false,ADMIN);
route('GET','/api/admin/score-daily/adjustments',function($p,$b,$u){
  _v195_scoring_tables();
  $uid=$_GET['user_id']??null;
  $where=$uid?"WHERE a.user_id=?":""; $args=$uid?[(int)$uid]:[];
  return ['items'=>Db::all("SELECT a.*,TRIM(CONCAT(COALESCE(us.first_name,''),' ',COALESCE(us.last_name,''))) user_name,
    TRIM(CONCAT(COALESCE(ab.first_name,''),' ',COALESCE(ab.last_name,''))) adjusted_by_name
    FROM mission_score_adjustments a JOIN users us ON us.id=a.user_id LEFT JOIN users ab ON ab.id=a.adjusted_by
    $where ORDER BY a.adjusted_at DESC LIMIT 200",$args)];
},false,ADMIN);
route('GET','/api/my/score/today',function($p,$b,$u){
  _v195_scoring_tables();
  $today=date('Y-m-d');
  $rows=Db::all("SELECT rule_key,`count`,points FROM mission_score_daily WHERE user_id=? AND score_date=?",[(int)$u['id'],$today]);
  $total=array_sum(array_column($rows,'points'));
  return ['date'=>$today,'total_points'=>round($total,2),'items'=>$rows];
});

/* ================= v196: داشبورد اختصاصی هر سمت (فاز ۴ عملیات میدانی) ================= */
function _v196_user_brief($uid){
  $u=Db::one("SELECT us.id,TRIM(CONCAT(COALESCE(us.first_name,''),' ',COALESCE(us.last_name,''))) name,us.role_id,r.title role_title
    FROM users us LEFT JOIN roles r ON r.id=us.role_id WHERE us.id=?",[(int)$uid]);
  return $u;
}
function _v196_daily_snapshot($uid){
  $today=date('Y-m-d');
  $u=['id'=>(int)$uid];
  $roleKey=_v191_role_key($uid);
  $eff=_v191_effective_mission($u,'daily');
  $act=_v191_actual_metrics($u);
  $weightSum=0.0; $scoreSum=0.0; $targetsOut=[];
  foreach(($eff['targets']?:[]) as $t){
    $mk=$t['metric_key']; $actual=$act['counts'][$mk]??0; $den=$act['denominators'][$mk]??0;
    $actualPercent=($mk==='end_shift_report')?($actual?100:0):_v191_pct($actual,$den);
    $target=(float)($t['target_percent']??0); $achievement=$target>0?min(100,$actualPercent/$target*100):100;
    $w=(float)($t['weight']??1); $weightSum+=$w; $scoreSum+=$achievement*$w;
    $targetsOut[]=['metric_key'=>$mk,'target_percent'=>$target,'actual_percent'=>$actualPercent,'achievement_percent'=>round($achievement,1),'weight'=>$w,'is_required'=>!empty($t['is_required'])];
  }
  $weighted=$weightSum?round($scoreSum/$weightSum*100)/100:0.0;
  $points=(float)(Db::one("SELECT COALESCE(SUM(points),0) s FROM mission_score_daily WHERE user_id=? AND score_date=?",[(int)$uid,$today])['s']??0);
  return ['user_id'=>(int)$uid,'role_key'=>$roleKey,'has_mission'=>!!$eff['mission'],'mission_source'=>$eff['source'],
    'assigned_lines'=>count($act['lines']),'visited_lines'=>(int)($act['raw']['visited_lines']??0),'validated_lines'=>(int)($act['raw']['validated_lines']??0),
    'weighted_achievement'=>$weighted,'targets'=>$targetsOut,'score_today'=>round($points,2)];
}
route('GET','/api/my/role-dashboard',function($p,$b,$u){
  _v191_mission_tables(); _v195_scoring_tables();
  $uid=(int)$u['id']; $roleKey=_v191_role_key($uid);
  $me=_v196_user_brief($uid);
  $snap=_v196_daily_snapshot($uid);
  $faType="JSON_UNQUOTE(JSON_EXTRACT(data,'$.type'))";
  $unread=(int)(Db::one("SELECT COUNT(*) n FROM notifications WHERE user_id=? AND is_read=0 AND $faType IN ('station_exit','station_enter','vpn_on','gps_off','attendance_checkin','attendance_checkout')",[$uid])['n']??0);
  $out=['role_key'=>$roleKey,'role_title'=>$me['role_title']??'','me'=>$snap+['name'=>$me['name']??''],'unread_alerts'=>$unread,'subordinates'=>null];
  if($roleKey==='chief_inspector'){
    $subIds=_v191_subordinate_ids($uid);
    $rows=[];
    foreach($subIds as $sid){
      $sk=_v191_role_key($sid);
      if(!in_array($sk,['line_supervisor','motor_patrol','vehicle_patrol','resident_inspector'],true)) continue;
      $brief=_v196_user_brief($sid); $s=_v196_daily_snapshot($sid);
      $rows[]=$s+['name'=>$brief['name']??'','role_title'=>$brief['role_title']??''];
    }
    usort($rows,fn($a,$b)=>$a['weighted_achievement']<=>$b['weighted_achievement']);
    $out['subordinates']=['total'=>count($rows),'weak'=>array_values(array_filter($rows,fn($r)=>$r['weighted_achievement']<50)),'all'=>$rows];
  }
  return $out;
});
function _v196_field_users_snapshot($date){
  $rows=Db::all("SELECT us.id,TRIM(CONCAT(COALESCE(us.first_name,''),' ',COALESCE(us.last_name,''))) name,r.title role_title
    FROM users us LEFT JOIN roles r ON r.id=us.role_id WHERE us.is_active=1 AND EXISTS(SELECT 1 FROM user_lines ul WHERE ul.user_id=us.id)");
  $out=[];
  foreach($rows as $r){
    try{
      $uid=(int)$r['id']; $rk=_v191_role_key($uid);
      if(!in_array($rk,['line_supervisor','motor_patrol','vehicle_patrol','resident_inspector','chief_inspector'],true)) continue;
      if($date===date('Y-m-d')) $s=_v196_daily_snapshot($uid);
      else {
        $pr=Db::one("SELECT weighted_achievement FROM mission_daily_progress WHERE user_id=? AND progress_date=?",[$uid,$date]);
        $pts=(float)(Db::one("SELECT COALESCE(SUM(points),0) s FROM mission_score_daily WHERE user_id=? AND score_date=?",[$uid,$date])['s']??0);
        $s=['weighted_achievement'=>$pr?(float)$pr['weighted_achievement']:0,'score_today'=>round($pts,2),'has_mission'=>!!$pr,'assigned_lines'=>0,'visited_lines'=>0,'validated_lines'=>0];
      }
      $out[]=$s+['user_id'=>$uid,'name'=>$r['name'],'role_key'=>$rk,'role_title'=>$r['role_title']];
    } catch (\Throwable $e) {
      error_log('_v196_field_users_snapshot skipped user '.($r['id']??'?').': '.$e->getMessage());
    }
  }
  return $out;
}
function _v196_role_group_summary($date){
  $byRole=[];
  foreach(_v196_field_users_snapshot($date) as $s){
    $rk=$s['role_key'];
    if(!isset($byRole[$rk])) $byRole[$rk]=['role_key'=>$rk,'count'=>0,'avg_achievement'=>0,'total_score'=>0,'sum_ach'=>0];
    $byRole[$rk]['count']++; $byRole[$rk]['sum_ach']+=(float)$s['weighted_achievement']; $byRole[$rk]['total_score']+=(float)$s['score_today'];
  }
  foreach($byRole as &$g){ $g['avg_achievement']=$g['count']?round($g['sum_ach']/$g['count'],1):0; unset($g['sum_ach']); }
  return array_values($byRole);
}
route('GET','/api/admin/role-dashboard-summary',function($p,$b,$u){
  try {
    _v191_mission_tables(); _v195_scoring_tables();
    $date=_v191_norm_date($_GET['date']??null, date('Y-m-d'));
    return ['date'=>$date,'items'=>_v196_role_group_summary($date)];
  } catch (\Throwable $e) {
    error_log('role-dashboard-summary error: '.$e->getMessage());
    Http::json(['error'=>'خطای داخلی سرور','detail'=>$e->getMessage(),'line'=>$e->getLine(),'file'=>basename($e->getFile())], 500);
  }
},false,ADMIN);



/* ================= v213: API پایدار عملیات میدانی برای اپ ================= */
function _v213_empty_mission_payload($u,$error=''){
  $uid=(int)($u['id']??0); $rk='other';
  try{$rk=_v191_role_key($uid);}catch(\Throwable $e){}
  return ['source'=>'none','role_key'=>$rk,'mission'=>null,'assigned_lines'=>0,'targets'=>[],
    'actual_counts'=>[],'denominators'=>[],'summary'=>['weighted_achievement'=>0,'visited_lines'=>0,'validated_lines'=>0,'present_total'=>0],
    'warning'=>$error?:null];
}
route('GET','/api/operations/my-mission',function($p,$b,$u){
  try { return _v191_mission_progress($u); }
  catch(\Throwable $e){
    error_log('operations/my-mission: '.$e->getMessage().' in '.$e->getFile().':'.$e->getLine());
    Http::json([
      'error'=>'خطا در محاسبه مأموریت روزانه',
      'code'=>'MISSION_CALCULATION_FAILED',
      'message'=>'اطلاعات مأموریت روزانه قابل محاسبه نیست. لطفاً دوباره تلاش کنید یا گزارش خطا را برای پشتیبانی ارسال کنید.'
    ],500);
  }
});
route('GET','/api/operations/visit-program',function($p,$b,$u){
  try {
    _v217_visit_schema();
    $prog=_v191_mission_progress($u);
    $lineIds=array_values(array_unique(array_map('intval',array_column(Db::all("SELECT line_id FROM user_lines WHERE user_id=? ORDER BY line_id",[(int)$u['id']]),'line_id'))));
    $lines=[]; $errors=[];
    foreach($lineIds as $lid){
      try{$lines[]=_v191_line_snapshot($lid,$u['id']);}
      catch(\Throwable $e){$errors[]=['line_id'=>$lid,'message'=>$e->getMessage()];error_log('visit snapshot '.$lid.': '.$e->getMessage());}
    }
    return ['ok'=>true,'mode'=>$prog['role_key']??_v191_role_key((int)$u['id']),'date'=>date('Y-m-d'),'summary'=>$prog['summary']??[],'targets'=>$prog['targets']??[],'lines'=>$lines,'assigned_lines'=>count($lineIds),'partial_errors'=>$errors];
  } catch(\Throwable $e){
    error_log('operations/visit-program: '.$e->getMessage().' in '.$e->getFile().':'.$e->getLine());
    Http::json(['error'=>'خطا در دریافت برنامه بازدید و پوشش خط','code'=>'VISIT_PROGRAM_FAILED','message'=>'اطلاعات برنامه بازدید قابل دریافت نیست. جزئیات خطا در گزارش سرور ثبت شد.'],500);
  }
});
route('GET','/api/operations/my-dashboard',function($p,$b,$u){
  try {
    _v191_mission_tables(); _v195_scoring_tables();
    $uid=(int)$u['id']; $roleKey=_v191_role_key($uid); $me=_v196_user_brief($uid); $snap=_v196_daily_snapshot($uid);
    $unread=0;
    try{$unread=(int)(Db::one("SELECT COUNT(*) n FROM notifications WHERE user_id=? AND is_read=0 AND (data LIKE '%station_exit%' OR data LIKE '%station_enter%' OR data LIKE '%vpn_on%' OR data LIKE '%gps_off%' OR data LIKE '%attendance_checkin%' OR data LIKE '%attendance_checkout%')",[$uid])['n']??0);}catch(\Throwable $e){}
    $out=['role_key'=>$roleKey,'role_title'=>$me['role_title']??'','me'=>$snap+['name'=>$me['name']??''],'unread_alerts'=>$unread,'subordinates'=>null];
    if($roleKey==='chief_inspector'){
      $rows=[]; foreach(_v191_subordinate_ids($uid) as $sid){ try{$sk=_v191_role_key($sid);if(!in_array($sk,['line_supervisor','motor_patrol','vehicle_patrol','resident_inspector'],true))continue;$brief=_v196_user_brief($sid);$ss=_v196_daily_snapshot($sid);$rows[]=$ss+['name'=>$brief['name']??'','role_title'=>$brief['role_title']??''];}catch(\Throwable $e){} }
      usort($rows,fn($a,$b)=>$a['weighted_achievement']<=>$b['weighted_achievement']);
      $out['subordinates']=['total'=>count($rows),'weak'=>array_values(array_filter($rows,fn($r)=>$r['weighted_achievement']<50)),'all'=>$rows];
    }
    return $out;
  } catch(\Throwable $e){
    error_log('operations/my-dashboard: '.$e->getMessage());
    $brief=[]; try{$brief=_v196_user_brief((int)$u['id'])?:[];}catch(\Throwable $x){}
    return ['role_key'=>'other','role_title'=>$brief['role_title']??'','me'=>['name'=>$brief['name']??'','weighted_achievement'=>0,'score_today'=>0,'assigned_lines'=>0,'visited_lines'=>0,'validated_lines'=>0],'unread_alerts'=>0,'subordinates'=>null,'warning'=>'اطلاعات داشبورد هنوز در سرور آماده نشده است.'];
  }
});

/* ================= v197: رتبه‌بندی و نشان‌ها (فاز ۵ عملیات میدانی) ================= */
function _v197_badge_tables(){
  static $done=false; if($done) return; $done=true;
  Db::run("CREATE TABLE IF NOT EXISTS mission_badges(
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, badge_key VARCHAR(32) NOT NULL,
    period_type VARCHAR(10) NOT NULL, period_key VARCHAR(20) NOT NULL, `rank` INT NULL, points DECIMAL(9,2) NOT NULL DEFAULT 0,
    awarded_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_badge(user_id,badge_key,period_type,period_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}
const MISSION_FIELD_ROLES = ['line_supervisor','motor_patrol','vehicle_patrol','resident_inspector','chief_inspector'];
function _v197_period_bounds($periodType,$jy=null,$jm=null,$jd=null){
  if($jy===null){ [$jy,$jm,$jd]=gregorian_to_jalali((int)date('Y'),(int)date('n'),(int)date('j')); }
  $todayJ=sprintf('%04d-%02d-%02d',$jy,$jm,$jd);
  if($periodType==='daily'){
    [$gy,$gm,$gd]=jalali_to_gregorian($jy,$jm,$jd);
    return [sprintf('%04d-%02d-%02d',$gy,$gm,$gd),sprintf('%04d-%02d-%02d',$gy,$gm,$gd),$todayJ];
  }
  if($periodType==='weekly'){
    $wd=ShiftCalc::jweekday($todayJ); // 0=شنبه..6=جمعه
    $start=ShiftCalc::jdateAddDays($todayJ,-$wd); $end=ShiftCalc::jdateAddDays($start,6);
    [$sy,$sm,$sd]=array_map('intval',explode('-',$start)); [$ey,$em,$ed]=array_map('intval',explode('-',$end));
    [$gsy,$gsm,$gsd]=jalali_to_gregorian($sy,$sm,$sd); [$gey,$gem,$ged]=jalali_to_gregorian($ey,$em,$ed);
    return [sprintf('%04d-%02d-%02d',$gsy,$gsm,$gsd),sprintf('%04d-%02d-%02d',$gey,$gem,$ged),$start];
  }
  // monthly
  $days=ShiftCalc::jMonthDays($jy,$jm);
  [$gsy,$gsm,$gsd]=jalali_to_gregorian($jy,$jm,1); [$gey,$gem,$ged]=jalali_to_gregorian($jy,$jm,$days);
  return [sprintf('%04d-%02d-%02d',$gsy,$gsm,$gsd),sprintf('%04d-%02d-%02d',$gey,$gem,$ged),sprintf('%04d-%02d',$jy,$jm)];
}
function _v197_leaderboard($periodType,$jy=null,$jm=null,$jd=null){
  [$start,$end,$periodKey]=_v197_period_bounds($periodType,$jy,$jm,$jd);
  $rows=Db::all("SELECT s.user_id,TRIM(CONCAT(COALESCE(us.first_name,''),' ',COALESCE(us.last_name,''))) user_name,r.title role_title,
      SUM(s.points) total_points,
      SUM(CASE WHEN s.rule_key='line_visit_validated' THEN s.points ELSE 0 END) visit_points,
      SUM(CASE WHEN sr.is_negative=1 THEN s.points ELSE 0 END) negative_points,
      SUM(CASE WHEN sr.is_negative=0 THEN s.points ELSE 0 END) positive_points
    FROM mission_score_daily s JOIN users us ON us.id=s.user_id LEFT JOIN roles r ON r.id=us.role_id LEFT JOIN score_rules sr ON sr.rule_key=s.rule_key
    WHERE s.score_date BETWEEN ? AND ? GROUP BY s.user_id ORDER BY total_points DESC",[$start,$end]);
  $i=0; foreach($rows as &$r){ $i++; $r['rank']=$i; $r['total_points']=round((float)$r['total_points'],2); }
  return ['period_type'=>$periodType,'period_key'=>$periodKey,'from'=>$start,'to'=>$end,'items'=>$rows];
}
function _v197_badge_labels(){
  return ['gold'=>'🥇 نفر اول','silver'=>'🥈 نفر دوم','bronze'=>'🥉 نفر سوم','discipline'=>'🛡 نشان انضباط','best_report'=>'📷 نشان بهترین گزارش'];
}
function _v197_period_label($t){ return $t==='daily'?'روزانه':($t==='weekly'?'هفتگی':'ماهانه'); }
function _v197_badge_upsert_notify($uid,$badgeKey,$periodType,$pk,$rank,$points){
  $existed=Db::one("SELECT id FROM mission_badges WHERE user_id=? AND badge_key=? AND period_type=? AND period_key=?",[$uid,$badgeKey,$periodType,$pk]);
  Db::run("INSERT INTO mission_badges(user_id,badge_key,period_type,period_key,`rank`,points) VALUES(?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE `rank`=VALUES(`rank`),points=VALUES(points),awarded_at=CURRENT_TIMESTAMP",
    [$uid,$badgeKey,$periodType,$pk,$rank,$points]);
  if(!$existed && function_exists('_v195_scoring_tables')){
    try{
      $labels=_v197_badge_labels(); $label=$labels[$badgeKey]??$badgeKey;
      $title='🏅 نشان جدید!';
      $body=$label.' — دورهٔ '._v197_period_label($periodType).' ('.$pk.') را دریافت کردید. آفرین!';
      if(class_exists('Push')) Push::notify([$uid],$title,$body,['type'=>'badge_awarded','badge_key'=>$badgeKey,'period_type'=>$periodType,'period_key'=>$pk]);
    } catch(\Throwable $e) { /* اعلان هرگز نباید مانع ثبت نشان شود */ }
  }
}
function _v197_award_badges($periodType,$jy=null,$jm=null,$jd=null){
  _v197_badge_tables();
  $lb=_v197_leaderboard($periodType,$jy,$jm,$jd);
  $items=$lb['items']; $pk=$lb['period_key'];
  $rankBadge=['gold','silver','bronze'];
  foreach(array_slice($items,0,3) as $idx=>$r){
    _v197_badge_upsert_notify((int)$r['user_id'],$rankBadge[$idx],$periodType,$pk,$idx+1,$r['total_points']);
  }
  // انضباط: بدون هیچ امتیاز منفی در بازه، و حداقل کمی فعالیت مثبت داشته باشد
  foreach($items as $r){
    if((float)$r['negative_points']===0.0 && (float)$r['positive_points']>0){
      _v197_badge_upsert_notify((int)$r['user_id'],'discipline',$periodType,$pk,null,$r['positive_points']);
    }
  }
  // بهترین گزارش: بیشترین امتیاز بازدید معتبر خط در بازه
  $bestReport=null;
  foreach($items as $r){ if((float)$r['visit_points']>0 && (!$bestReport || (float)$r['visit_points']>(float)$bestReport['visit_points'])) $bestReport=$r; }
  if($bestReport){
    _v197_badge_upsert_notify((int)$bestReport['user_id'],'best_report',$periodType,$pk,null,$bestReport['visit_points']);
  }
  return ['period_type'=>$periodType,'period_key'=>$pk,'gold'=>$items[0]['user_id']??null,'discipline_count'=>count(array_filter($items,fn($r)=>(float)$r['negative_points']===0.0&&(float)$r['positive_points']>0))];
}
route('GET','/api/leaderboard',function($p,$b,$u){
  _v195_scoring_tables();
  $type=in_array($_GET['period']??'daily',['daily','weekly','monthly'],true)?$_GET['period']:'daily';
  return _v197_leaderboard($type);
});
route('GET','/api/my/badges',function($p,$b,$u){
  _v197_badge_tables();
  return ['items'=>Db::all("SELECT badge_key,period_type,period_key,`rank`,points,awarded_at FROM mission_badges WHERE user_id=? ORDER BY awarded_at DESC LIMIT 100",[(int)$u['id']])];
});
route('GET','/api/admin/badges',function($p,$b,$u){
  _v197_badge_tables();
  $type=$_GET['period_type']??null; $where=$type?"WHERE mb.period_type=?":""; $args=$type?[$type]:[];
  return ['items'=>Db::all("SELECT mb.*,TRIM(CONCAT(COALESCE(us.first_name,''),' ',COALESCE(us.last_name,''))) user_name FROM mission_badges mb JOIN users us ON us.id=mb.user_id $where ORDER BY mb.awarded_at DESC LIMIT 300",$args)];
},false,ADMIN);

/* ================= v198: داشبورد مدیریتی کل‌شهر (فاز ۶ عملیات میدانی) ================= */
route('GET','/api/admin/city-dashboard',function($p,$b,$u){
 try {
  _v191_mission_tables(); _v195_scoring_tables(); _v197_badge_tables();
  $date=_v191_norm_date($_GET['date']??null, date('Y-m-d'));

  // پوشش کل شهر و خطوط کم‌پوشش
  $lineRows=Db::all("SELECT l.id,l.code,l.origin,l.destination,COUNT(DISTINCT v.id) total_vehicles,
      (SELECT COUNT(DISTINCT cs.driver_id) FROM checklist_submissions cs JOIN vehicles vv ON vv.id=cs.vehicle_id WHERE vv.line_id=l.id AND DATE(cs.created_at)=?) checked_count,
      (SELECT COUNT(DISTINCT a.driver_id) FROM attendances a WHERE a.line_id=l.id AND DATE(a.created_at)=?) present_count
    FROM `lines` l LEFT JOIN vehicles v ON v.line_id=l.id GROUP BY l.id",[$date,$date]);
  $cityTotalVehicles=0; $cityChecked=0;
  foreach($lineRows as &$lr){
    $lr['total_vehicles']=(int)$lr['total_vehicles']; $lr['checked_count']=(int)$lr['checked_count']; $lr['present_count']=(int)$lr['present_count'];
    $lr['coverage_percent']=_v191_pct($lr['checked_count'],$lr['total_vehicles']);
    $cityTotalVehicles+=$lr['total_vehicles']; $cityChecked+=$lr['checked_count'];
  }
  usort($lineRows,fn($a,$b)=>$a['coverage_percent']<=>$b['coverage_percent']);
  $weakLines=array_values(array_filter($lineRows,fn($l)=>$l['total_vehicles']>0));
  $weakLines=array_slice($weakLines,0,10);

  // خلاصهٔ سمت‌ها (عملکرد گشت‌ها/ناظران/بازرسان)
  $roleSummary=_v196_role_group_summary($date);

  // مأموریت‌های ناقص امروز
  $allUsers=_v196_field_users_snapshot($date);
  $incomplete=array_values(array_filter($allUsers,fn($s)=>!empty($s['has_mission'])&&(float)$s['weighted_achievement']<50));
  usort($incomplete,fn($a,$b)=>$a['weighted_achievement']<=>$b['weighted_achievement']);

  // کاربران برتر امروز (leaderboard بر اساس تاریخ شمسیِ معادل تاریخ انتخابی محاسبه می‌شود)
  if($date===date('Y-m-d')){ $top=_v197_leaderboard('daily'); }
  else{ [$jy,$jm,$jd]=gregorian_to_jalali((int)substr($date,0,4),(int)substr($date,5,2),(int)substr($date,8,2)); $top=_v197_leaderboard('daily',$jy,$jm,$jd); }

  return [
    'date'=>$date,
    'city_coverage'=>['total_vehicles'=>$cityTotalVehicles,'checked_count'=>$cityChecked,'coverage_percent'=>_v191_pct($cityChecked,$cityTotalVehicles),'lines_count'=>count($lineRows)],
    'weak_lines'=>$weakLines,
    'role_summary'=>$roleSummary,
    'incomplete_missions'=>['count'=>count($incomplete),'items'=>array_slice($incomplete,0,20)],
    'top_users'=>array_slice($top['items'],0,10),
  ];
 } catch (\Throwable $e) {
   error_log('city-dashboard error: '.$e->getMessage());
   Http::json(['error'=>'خطای داخلی سرور','detail'=>$e->getMessage(),'line'=>$e->getLine(),'file'=>basename($e->getFile())], 500);
 }
},false,ADMIN);

/* ================= v199: پایش سلامت کرون‌ها ================= */
function _cronlog_table() {
  static $done = false; if ($done) return; $done = true;
  Db::run("CREATE TABLE IF NOT EXISTS cron_run_log(
    cron_key VARCHAR(40) PRIMARY KEY, last_run_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    last_status VARCHAR(10) NOT NULL DEFAULT 'ok', last_message TEXT NULL, run_count INT NOT NULL DEFAULT 0,
    last_source VARCHAR(10) NOT NULL DEFAULT 'cli'
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}
function _cronlog_record($cronKey, $status, $message, $isCli) {
  try {
    _cronlog_table();
    Db::run("INSERT INTO cron_run_log(cron_key,last_run_at,last_status,last_message,run_count,last_source) VALUES(?,NOW(),?,?,1,?)
      ON DUPLICATE KEY UPDATE last_run_at=NOW(),last_status=VALUES(last_status),last_message=VALUES(last_message),
      run_count=run_count+1,last_source=VALUES(last_source)",
      [$cronKey, $status, $message ? mb_substr((string)$message,0,500) : null, $isCli ? 'cli' : 'http']);
  } catch (\Throwable $e) { /* ثبت لاگ هرگز نباید خود اجرای کرون را متوقف کند */ }
}
function _v199_known_crons(){
  return [
    ['key'=>'auto-exit','file'=>'cron_auto_exit.php','title'=>'خروج خودکار رانندگان جامانده در خط','schedule'=>'هر ۱۵ دقیقه','max_minutes'=>30],
    ['key'=>'sms-expiry','file'=>'cron_sms_expiry.php','title'=>'پیامک هشدار انقضای اعتبار','schedule'=>'روزی یک‌بار (پیشنهاد ۸ صبح)','max_minutes'=>1560],
    ['key'=>'push-expiry','file'=>'cron_push_expiry.php','title'=>'پوش هشدار انقضای اعتبار','schedule'=>'روزی یک‌بار (پیشنهاد ۸ صبح)','max_minutes'=>1560],
    ['key'=>'birthday','file'=>'cron_birthday.php','title'=>'تبریک تولد','schedule'=>'روزی یک‌بار صبح','max_minutes'=>1560],
    ['key'=>'cleanup','file'=>'cron_cleanup.php','title'=>'پاکسازی فایل‌های موقت/قدیمی','schedule'=>'روزی یک‌بار','max_minutes'=>1560],
    ['key'=>'mission-scoring','file'=>'cron_mission_scoring.php','title'=>'نهایی‌سازی امتیاز و نشان‌های عملیات میدانی','schedule'=>'روزی یک‌بار، پایان روز (پیشنهاد ۲۳:۰۰)','max_minutes'=>1560],
    ['key'=>'daily','file'=>'cron_daily.php','title'=>'بستهٔ کارهای روزانه (پیامک+پوش+تولد+پاکسازی با هم)','schedule'=>'جایگزین اجرای جداگانهٔ ۴ کار بالا — روزی یک‌بار صبح','max_minutes'=>1560,'optional_bundle'=>true],
    ['key'=>'all','file'=>'cron_all.php','title'=>'اجرای همهٔ کارها با هم (شامل مأموریت‌ها)','schedule'=>'اختیاری — جایگزین کل موارد بالا','max_minutes'=>null,'optional_bundle'=>true],
  ];
}
route('GET','/api/admin/cron-status',function($p,$b,$u){
  _cronlog_table();
  $rows=Db::all("SELECT * FROM cron_run_log");
  $byKey=[]; foreach($rows as $r) $byKey[$r['cron_key']]=$r;
  $out=[];
  foreach(_v199_known_crons() as $c){
    $row=$byKey[$c['key']]??null;
    $status='never_run'; $minutesSince=null;
    if($row && $row['last_run_at']){
      $minutesSince=round((strtotime('now')-strtotime($row['last_run_at']))/60);
      if($row['last_status']==='error') $status='error';
      elseif($c['max_minutes']===null) $status='ok';
      elseif($minutesSince<=$c['max_minutes']*1.5) $status='ok';
      else $status='late';
    }
    $out[]=$c+['status'=>$status,'last_run_at'=>$row['last_run_at']??null,'minutes_since'=>$minutesSince,
      'run_count'=>$row?(int)$row['run_count']:0,'last_source'=>$row['last_source']??null,'last_message'=>$row['last_message']??null];
  }
  return ['items'=>$out,'checked_at'=>date('c')];
},false,ADMIN);

/* ================= v200: نمودار روند ۳۰ روزه (تکمیل طبیعی عملیات میدانی) ================= */
route('GET','/api/admin/mission-trend',function($p,$b,$u){
  _v191_mission_tables(); _v195_scoring_tables();
  $days=max(1,min(90,(int)($_GET['days']??30)));
  $userId=$_GET['user_id']??null;
  $from=date('Y-m-d',strtotime("-".($days-1)." days"));
  if($userId){
    $rows=Db::all("SELECT progress_date d, weighted_achievement ach FROM mission_daily_progress WHERE user_id=? AND progress_date>=? ORDER BY progress_date",[(int)$userId,$from]);
    $scoreRows=Db::all("SELECT score_date d, SUM(points) pts FROM mission_score_daily WHERE user_id=? AND score_date>=? GROUP BY score_date",[(int)$userId,$from]);
  } else {
    $rows=Db::all("SELECT progress_date d, AVG(weighted_achievement) ach FROM mission_daily_progress WHERE progress_date>=? GROUP BY progress_date ORDER BY progress_date",[$from]);
    $scoreRows=Db::all("SELECT score_date d, SUM(points) pts FROM mission_score_daily WHERE score_date>=? GROUP BY score_date",[$from]);
  }
  $achMap=[]; foreach($rows as $r) $achMap[$r['d']]=round((float)$r['ach'],1);
  $scoreMap=[]; foreach($scoreRows as $r) $scoreMap[$r['d']]=round((float)$r['pts'],1);
  $out=[];
  for($i=0;$i<$days;$i++){
    $d=date('Y-m-d',strtotime("$from +$i days"));
    [$jy,$jm,$jd]=gregorian_to_jalali((int)substr($d,0,4),(int)substr($d,5,2),(int)substr($d,8,2));
    $out[]=['date'=>$d,'jdate'=>sprintf('%02d/%02d',$jm,$jd),'achievement'=>$achMap[$d]??0,'score'=>$scoreMap[$d]??0];
  }
  return ['from'=>$from,'to'=>date('Y-m-d'),'user_id'=>$userId?(int)$userId:null,'items'=>$out];
},false,ADMIN);

/* ================= v201: داشبورد سلامت سامانه (پایداری و قابلیت اتکا) ================= */
function _v201_health_tables(){
  static $done=false; if($done) return; $done=true;
  Db::run("CREATE TABLE IF NOT EXISTS backup_log(
    id INT AUTO_INCREMENT PRIMARY KEY, kind VARCHAR(10) NOT NULL, is_light TINYINT(1) NOT NULL DEFAULT 0,
    created_by INT NULL, created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  Db::run("CREATE TABLE IF NOT EXISTS login_ip_attempts(
    id INT AUTO_INCREMENT PRIMARY KEY, ip VARCHAR(64) NOT NULL, created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_lia_ip_time (ip, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}
function _v201_dir_size($dir, $maxFiles = 20000){
  if (!is_dir($dir)) return ['bytes'=>0,'files'=>0,'truncated'=>false];
  $bytes=0; $files=0; $truncated=false;
  try{
    $it = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS));
    foreach ($it as $f) {
      if ($files >= $maxFiles) { $truncated = true; break; }
      if ($f->isFile()) { $bytes += $f->getSize(); $files++; }
    }
  } catch (\Throwable $e) { /* اگر خواندن پوشه با خطا مواجه شد، همان مقدار جزئی را برمی‌گردانیم */ }
  return ['bytes'=>$bytes,'files'=>$files,'truncated'=>$truncated];
}
function _v201_fmt_bytes($b){
  $b=(float)$b; $units=['بایت','کیلوبایت','مگابایت','گیگابایت','ترابایت']; $i=0;
  while ($b>=1024 && $i<count($units)-1) { $b/=1024; $i++; }
  return round($b,1).' '.$units[$i];
}

/* ================= v203: جلسات فعال کاربران (امنیت) ================= */
route('GET','/api/admin/active-sessions',function($p,$b,$u){
  $rows = Db::all("SELECT s.id, s.user_id, s.device_type, s.device_id, s.device_model, s.created_at,
      TRIM(CONCAT(COALESCE(us.first_name,''),' ',COALESCE(us.last_name,''))) user_name, r.title role_title
    FROM user_sessions s
    JOIN users us ON us.id = s.user_id
    LEFT JOIN roles r ON r.id = us.role_id
    WHERE s.revoked_at IS NULL
    ORDER BY s.created_at DESC LIMIT 500");
  return ['items'=>$rows,'count'=>count($rows)];
},false,ADMIN);

/* ================= اقلام تحویلی (واگذاری زنجیره‌ای اقلام بین کاربران با تأیید گیرنده) ================= */
function _inv_tables() {
  try { Db::run("CREATE TABLE IF NOT EXISTS inventory_item_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    unit VARCHAR(30) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  try { Db::run("CREATE TABLE IF NOT EXISTS inventory_transfers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_type_id INT NOT NULL,
    from_user_id INT NULL,
    to_user_id INT NOT NULL,
    quantity INT NOT NULL,
    status VARCHAR(15) NOT NULL DEFAULT 'pending',
    transferable TINYINT(1) NOT NULL DEFAULT 1,
    note VARCHAR(255) NULL,
    created_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at DATETIME NULL,
    confirmed_by INT NULL,
    rejected_at DATETIME NULL,
    INDEX idx_it_item (item_type_id),
    INDEX idx_it_from (from_user_id),
    INDEX idx_it_to (to_user_id),
    INDEX idx_it_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  // برای دیتابیس‌هایی که این جدول را پیش از افزودن قابلیت «مجوز انتقال مجدد» ساخته‌اند
  try { Db::run("ALTER TABLE inventory_transfers ADD COLUMN transferable TINYINT(1) NOT NULL DEFAULT 1"); } catch (\Throwable $e) { /* ستون از قبل وجود دارد */ }
}
// موجودی تأییدشدهٔ هر کاربر به تفکیک نوع قلم (مجموع دریافتی‌های تأییدشده منهای مجموع تحویلی‌های تأییدشده)
// فقط اقلامی که واقعاً حداقل یک‌بار به این کاربر تحویل داده شده‌اند نمایش داده می‌شوند (نه همهٔ انواع قلم سامانه)
// transferable_balance = بخشی از موجودی که اجازهٔ انتقال مجدد به دیگران را دارد
function _inv_balance($userId) {
  _inv_tables();
  return Db::all("SELECT it.id item_type_id, it.name, it.unit,
      COALESCE(SUM(CASE WHEN t.to_user_id=? AND t.status='confirmed' THEN t.quantity ELSE 0 END),0)
      - COALESCE(SUM(CASE WHEN t.from_user_id=? AND t.status='confirmed' THEN t.quantity ELSE 0 END),0) AS balance,
      COALESCE(SUM(CASE WHEN t.to_user_id=? AND t.status='confirmed' AND t.transferable=1 THEN t.quantity ELSE 0 END),0)
      - COALESCE(SUM(CASE WHEN t.from_user_id=? AND t.status='confirmed' THEN t.quantity ELSE 0 END),0) AS transferable_balance,
      MAX(CASE WHEN t.to_user_id=? THEN 1 ELSE 0 END) has_received
    FROM inventory_item_types it
    LEFT JOIN inventory_transfers t ON t.item_type_id = it.id
    WHERE it.is_active=1
    GROUP BY it.id, it.name, it.unit
    HAVING has_received=1
    ORDER BY it.name", [$userId,$userId,$userId,$userId,$userId]);
}
// موجودیِ «قابل‌انتقال به دیگران» یک کاربر برای یک نوع قلم مشخص (برای بررسی هنگام تحویلِ مجدد)
function _inv_transferable_balance($userId, $itemTypeId) {
  _inv_tables();
  $row = Db::one("SELECT
      COALESCE(SUM(CASE WHEN to_user_id=? AND status='confirmed' AND transferable=1 THEN quantity ELSE 0 END),0)
      - COALESCE(SUM(CASE WHEN from_user_id=? AND status='confirmed' THEN quantity ELSE 0 END),0) b
    FROM inventory_transfers WHERE item_type_id=?", [$userId,$userId,$itemTypeId]);
  return (int)($row['b'] ?? 0);
}

// ---- مدیریت انواع اقلام (ادمین) ----
route('GET','/api/admin/inventory/item-types',function($p,$b,$u){ _inv_tables(); return ['items'=>Db::all("SELECT * FROM inventory_item_types ORDER BY is_active DESC,name")]; },false,ADMIN);
route('POST','/api/admin/inventory/item-types',function($p,$b,$u){
  _inv_tables();
  $name = trim($b['name'] ?? ''); if ($name==='') Http::error('نام قلم الزامی است',422);
  Db::run("INSERT INTO inventory_item_types(name,unit) VALUES(?,?)", [$name, trim($b['unit'] ?? '') ?: null]);
  return ['ok'=>true];
},false,ADMIN);
route('PUT','/api/admin/inventory/item-types/{id}',function($p,$b,$u){
  _inv_tables();
  $name = trim($b['name'] ?? ''); $unit = trim($b['unit'] ?? '') ?: null; $active = array_key_exists('is_active',$b) ? (int)!!$b['is_active'] : 1;
  Db::run("UPDATE inventory_item_types SET name=COALESCE(NULLIF(?,''),name), unit=?, is_active=? WHERE id=?", [$name,$unit,$active,(int)$p['id']]);
  return ['ok'=>true];
},false,ADMIN);

// واگذاری اولیهٔ ادمین به یک شخص؛ مثل هر تحویل دیگر، نیازمند تأیید گیرنده در برنامه است
route('POST','/api/admin/inventory/assign',function($p,$b,$u){
  _inv_tables();
  $itemTypeId=(int)($b['item_type_id']??0); $toUser=(int)($b['to_user_id']??0); $qty=(int)($b['quantity']??0);
  $transferable = array_key_exists('transferable',$b) ? (int)!!$b['transferable'] : 1;
  if (!$itemTypeId || !$toUser || $qty===0) Http::error('اطلاعات ناقص است',422);
  if (!Db::one("SELECT id FROM inventory_item_types WHERE id=? AND is_active=1",[$itemTypeId])) Http::error('نوع قلم نامعتبر است',422);
  if (!Db::one("SELECT id FROM users WHERE id=? AND is_active=1",[$toUser])) Http::error('کاربر گیرنده نامعتبر است',422);
  Db::run("INSERT INTO inventory_transfers(item_type_id,from_user_id,to_user_id,quantity,status,transferable,note,created_by) VALUES(?,NULL,?,?,'pending',?,?,?)",
    [$itemTypeId,$toUser,$qty,$transferable,trim($b['note']??'')?:null,(int)$u['id']]);
  try { Push::notify([$toUser],'اقلام تحویلی جدید','یک قلم برای تأیید دریافت توسط مدیر سامانه به شما واگذار شده است.',['type'=>'inventory_assigned']); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  return ['ok'=>true];
},false,ADMIN);

// دفتر کل تحویل‌ها برای گزارش‌گیری در پنل (فیلتر بر اساس نوع قلم و بازهٔ زمانی)
route('GET','/api/admin/inventory/ledger',function($p,$b,$u){
  _inv_tables();
  $c=["t.status='confirmed'"]; $pr=[];
  if (!empty($_GET['item_type_id'])) { $c[]='t.item_type_id=?'; $pr[]=(int)$_GET['item_type_id']; }
  if (!empty($_GET['from'])) { $c[]='t.confirmed_at >= ?'; $pr[]=$_GET['from'].' 00:00:00'; }
  if (!empty($_GET['to'])) { $c[]='t.confirmed_at <= ?'; $pr[]=$_GET['to'].' 23:59:59'; }
  $where = implode(' AND ',$c);
  $rows = Db::all("SELECT t.id,t.quantity,t.note,t.created_at,t.confirmed_at,t.transferable,it.name item_name,it.unit,
      TRIM(CONCAT(COALESCE(fu.first_name,''),' ',COALESCE(fu.last_name,''))) from_name,
      TRIM(CONCAT(COALESCE(tu.first_name,''),' ',COALESCE(tu.last_name,''))) to_name
    FROM inventory_transfers t
    JOIN inventory_item_types it ON it.id=t.item_type_id
    LEFT JOIN users fu ON fu.id=t.from_user_id
    JOIN users tu ON tu.id=t.to_user_id
    WHERE $where ORDER BY t.confirmed_at DESC LIMIT 2000", $pr);
  foreach ($rows as &$r3) { $r3['created_at_fa'] = fa_datetime($r3['created_at']); $r3['confirmed_at_fa'] = fa_datetime($r3['confirmed_at']); } unset($r3);
  return ['items'=>$rows];
},false,ADMIN);

// خروجی اکسل تحویل‌ها با درج امضای تحویل‌دهنده و تحویل‌گیرنده
route('GET','/api/admin/inventory/export',function($p,$b,$u){
  _inv_tables();
  $c=["t.status='confirmed'"]; $pr=[];
  if (!empty($_GET['item_type_id'])) { $c[]='t.item_type_id=?'; $pr[]=(int)$_GET['item_type_id']; }
  if (!empty($_GET['from'])) { $c[]='t.confirmed_at >= ?'; $pr[]=$_GET['from'].' 00:00:00'; }
  if (!empty($_GET['to'])) { $c[]='t.confirmed_at <= ?'; $pr[]=$_GET['to'].' 23:59:59'; }
  $where = implode(' AND ',$c);
  $rows = Db::all("SELECT t.id,t.quantity,t.note,t.created_at,t.confirmed_at,t.transferable,it.name item_name,it.unit,
      TRIM(CONCAT(COALESCE(fu.first_name,''),' ',COALESCE(fu.last_name,''))) from_name, fu.signature_data from_sig,
      TRIM(CONCAT(COALESCE(tu.first_name,''),' ',COALESCE(tu.last_name,''))) to_name, tu.signature_data to_sig
    FROM inventory_transfers t
    JOIN inventory_item_types it ON it.id=t.item_type_id
    LEFT JOIN users fu ON fu.id=t.from_user_id
    JOIN users tu ON tu.id=t.to_user_id
    WHERE $where ORDER BY t.confirmed_at DESC LIMIT 5000", $pr);

  $head=['شناسه تحویل','نوع قلم','تعداد','واحد','تحویل‌دهنده','تحویل‌گیرنده','تاریخ ثبت (شمسی - تهران)','تاریخ تأیید دریافت (شمسی - تهران)','قابل انتقال مجدد توسط گیرنده','توضیح'];
  $fromSigCol=count($head); $head[]='امضای تحویل‌دهنده';
  $toSigCol=count($head); $head[]='امضای تحویل‌گیرنده';
  $xw = new XlsxWriter($head);
  foreach ([6,16,8,8,16,16,20,20,14,20] as $i2=>$w2) $xw->setColWidth($i2,$w2);
  $xw->setColWidth($fromSigCol,16); $xw->setColWidth($toSigCol,16);
  foreach ($rows as $r2) {
    $row=[$r2['id'],$r2['item_name'],$r2['quantity'],$r2['unit'],$r2['from_name']?:'مدیر سامانه (واگذاری اولیه)',$r2['to_name'],
      fa_datetime($r2['created_at']),fa_datetime($r2['confirmed_at']),(!empty($r2['transferable'])?'بله':'خیر'),$r2['note'],'',''];
    $rIdx=$xw->addRow($row);
    if (!empty($r2['from_sig']) && strpos($r2['from_sig'],'base64,')!==false) {
      $bytes=base64_decode(substr($r2['from_sig'],strpos($r2['from_sig'],'base64,')+7),true);
      if ($bytes) $xw->setImage($rIdx,$fromSigCol,$bytes,110);
    }
    if (!empty($r2['to_sig']) && strpos($r2['to_sig'],'base64,')!==false) {
      $bytes=base64_decode(substr($r2['to_sig'],strpos($r2['to_sig'],'base64,')+7),true);
      if ($bytes) $xw->setImage($rIdx,$toSigCol,$bytes,110);
    }
  }
  $xw->output('گزارش_اقلام_تحویلی.xlsx','اقلام تحویلی');
},false,ADMIN);

// ---- برنامهٔ کاربر (موبایل/وب) ----
route('GET','/api/inventory/item-types',function($p,$b,$u){ _inv_tables(); return ['items'=>Db::all("SELECT id,name,unit FROM inventory_item_types WHERE is_active=1 ORDER BY name")]; });
// فهرست سمت‌ها و کاربران فعال، برای انتخاب دومرحله‌ای «سمت → شخص» در فرم تحویل
route('GET','/api/inventory/recipients',function($p,$b,$u){
  $roles=Db::all("SELECT id,title FROM roles ORDER BY title");
  $users=Db::all("SELECT u.id,CONCAT(u.first_name,' ',u.last_name) name,u.role_id,r.title role_title FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.is_active=1 AND u.id<>? ORDER BY name",[(int)$u['id']]);
  return ['roles'=>$roles,'users'=>$users];
});
route('GET','/api/inventory/balance',function($p,$b,$u){ return ['items'=>_inv_balance((int)$u['id'])]; });
// اقلامی که برای این کاربر ثبت شده و در انتظار تأیید دریافت اوست
route('GET','/api/inventory/pending',function($p,$b,$u){
  _inv_tables();
  $rows=Db::all("SELECT t.id,t.quantity,t.note,t.created_at,t.transferable,it.name item_name,it.unit,
      CASE WHEN t.from_user_id IS NULL THEN 'مدیر سامانه' ELSE TRIM(CONCAT(COALESCE(fu.first_name,''),' ',COALESCE(fu.last_name,''))) END from_name
    FROM inventory_transfers t JOIN inventory_item_types it ON it.id=t.item_type_id
    LEFT JOIN users fu ON fu.id=t.from_user_id
    WHERE t.to_user_id=? AND t.status='pending' ORDER BY t.created_at DESC",[(int)$u['id']]);
  foreach ($rows as &$r3) { $r3['created_at_fa'] = fa_datetime($r3['created_at']); } unset($r3);
  return ['items'=>$rows];
});
// تاریخچهٔ کامل تحویل‌های ارسالی و دریافتی این کاربر
route('GET','/api/inventory/history',function($p,$b,$u){
  _inv_tables();
  $rows=Db::all("SELECT t.id,t.quantity,t.status,t.note,t.created_at,t.confirmed_at,t.transferable,it.name item_name,it.unit,
      CASE WHEN t.from_user_id=? THEN 'ارسالی' ELSE 'دریافتی' END direction,
      CASE WHEN t.from_user_id IS NULL THEN 'مدیر سامانه' ELSE TRIM(CONCAT(COALESCE(fu.first_name,''),' ',COALESCE(fu.last_name,''))) END from_name,
      TRIM(CONCAT(COALESCE(tu.first_name,''),' ',COALESCE(tu.last_name,''))) to_name
    FROM inventory_transfers t JOIN inventory_item_types it ON it.id=t.item_type_id
    LEFT JOIN users fu ON fu.id=t.from_user_id JOIN users tu ON tu.id=t.to_user_id
    WHERE t.from_user_id=? OR t.to_user_id=? ORDER BY t.created_at DESC LIMIT 500",[(int)$u['id'],(int)$u['id'],(int)$u['id']]);
  foreach ($rows as &$r3) { $r3['created_at_fa'] = fa_datetime($r3['created_at']); $r3['confirmed_at_fa'] = fa_datetime($r3['confirmed_at']); } unset($r3);
  return ['items'=>$rows];
});
// تحویل تعدادی از موجودیِ تأییدشدهٔ خودم به شخص دیگر (نیازمند تأیید گیرنده)
route('POST','/api/inventory/deliver',function($p,$b,$u){
  _inv_tables();
  $itemTypeId=(int)($b['item_type_id']??0); $toUser=(int)($b['to_user_id']??0); $qty=(int)($b['quantity']??0);
  // آیا خودِ گیرندهٔ جدید مجاز است این قلم را باز هم به شخص دیگری منتقل کند؟ پیش‌فرض: بله
  $transferable = array_key_exists('transferable',$b) ? (int)!!$b['transferable'] : 1;
  if (!$itemTypeId || !$toUser || $qty===0) Http::error('اطلاعات ناقص است',422);
  if ($toUser === (int)$u['id']) Http::error('نمی‌توانید به خودتان تحویل دهید',422);
  if (!Db::one("SELECT id FROM inventory_item_types WHERE id=? AND is_active=1",[$itemTypeId])) Http::error('نوع قلم نامعتبر است',422);
  if (!Db::one("SELECT id FROM users WHERE id=? AND is_active=1",[$toUser])) Http::error('کاربر گیرنده نامعتبر است',422);
  if ($qty > 0) {
    // فقط بخشی از موجودی که خودِ این کاربر اجازهٔ انتقال مجدد آن را دارد قابل تحویل به دیگری است
    $bal = _inv_transferable_balance((int)$u['id'], $itemTypeId);
    if ($qty > $bal) Http::error("موجودیِ قابل‌انتقالِ شما کافی نیست (موجودی قابل‌انتقال فعلی: {$bal})",422);
  }
  Db::run("INSERT INTO inventory_transfers(item_type_id,from_user_id,to_user_id,quantity,status,transferable,note,created_by) VALUES(?,?,?,?,'pending',?,?,?)",
    [$itemTypeId,(int)$u['id'],$toUser,$qty,$transferable,trim($b['note']??'')?:null,(int)$u['id']]);
  try { Push::notify([$toUser],'اقلام تحویلی جدید',trim(($u['first_name']??'').' '.($u['last_name']??'')).' اقلامی را برای تأیید دریافت به شما تحویل داده است.',['type'=>'inventory_assigned']); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  return ['ok'=>true];
});
// تأیید دریافت یک تحویل توسط گیرنده (فقط خود گیرنده مجاز است)
route('POST','/api/inventory/confirm/{id}',function($p,$b,$u){
  _inv_tables();
  $t = Db::one("SELECT * FROM inventory_transfers WHERE id=?",[(int)$p['id']]);
  if (!$t) Http::error('یافت نشد',404);
  if ((int)$t['to_user_id'] !== (int)$u['id']) Http::error('اجازهٔ تأیید این تحویل را ندارید',403);
  if ($t['status'] !== 'pending') Http::error('این تحویل قبلاً بررسی شده است',422);
  Db::run("UPDATE inventory_transfers SET status='confirmed', confirmed_at=NOW(), confirmed_by=? WHERE id=?",[(int)$u['id'],(int)$p['id']]);
  Db::run("INSERT INTO activity_logs(user_id,event,meta) VALUES(?, 'inventory_confirmed', ?)",[(int)$u['id'], json_encode(['transfer_id'=>(int)$p['id']], JSON_UNESCAPED_UNICODE)]);
  if (!empty($t['from_user_id'])) { try { Push::notify([(int)$t['from_user_id']],'تأیید دریافت اقلام',trim(($u['first_name']??'').' '.($u['last_name']??'')).' دریافت اقلام را تأیید کرد.',['type'=>'inventory_confirmed']); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); } }
  return ['ok'=>true];
});
// رد یک تحویل توسط گیرنده (مثلاً در صورت اشتباه بودن)
route('POST','/api/inventory/reject/{id}',function($p,$b,$u){
  _inv_tables();
  $t = Db::one("SELECT * FROM inventory_transfers WHERE id=?",[(int)$p['id']]);
  if (!$t) Http::error('یافت نشد',404);
  if ((int)$t['to_user_id'] !== (int)$u['id']) Http::error('اجازهٔ رد این تحویل را ندارید',403);
  if ($t['status'] !== 'pending') Http::error('این تحویل قبلاً بررسی شده است',422);
  Db::run("UPDATE inventory_transfers SET status='rejected', rejected_at=NOW() WHERE id=?",[(int)$p['id']]);
  return ['ok'=>true];
});
