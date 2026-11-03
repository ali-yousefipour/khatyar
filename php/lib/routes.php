Warning: truncated output (original token count: 301869)
... 158898 bytes omitted ...

<?php
require_once __DIR__.'/GpsWorkIntervals.php';
require_once __DIR__.'/Seniority.php';
// ============ تعریف همهٔ مسیرهای API ============
const ADMIN = 3; // سطح ۳ و بالاتر = مدیریتی
// از این نسخه به بعد، به‌درخواست کارفرما، شمارهٔ نسخهٔ سایت و اپ اندروید و نام فایل زیپ پروژه
// همیشه یکسان و هماهنگ نگه داشته می‌شوند (به‌جای دو شمارندهٔ جداگانه مثل قبل).
const SITE_VERSION = '1.5.20';   // نسخهٔ سایت — همیشه با نسخهٔ اپ و نام فایل پروژه یکی است
const APP_VERSION = '1.5.20'; // نسخهٔ اپ اندروید — با هر تغییر افزایش می‌یابد


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
function _ssv_require_inspection_core($b){
  if(!is_array($b)) Http::error('اطلاعات بازدید نامعتبر است.',422);
  $schoolId=(int)($b['school_id']??0);
  if($schoolId<=0) Http::error('انتخاب مدرسه الزامی است.',422);
  $school=Db::one("SELECT id,latitude,longitude FROM school_service_schools WHERE id=? AND is_active=1",[$schoolId]);
  if(!$school) Http::error('مدرسه انتخاب‌شده معتبر یا فعال نیست.',422);
  $dg=trim((string)($b['driver_gender']??''));
  if(!in_array($dg,['خانم','آقا'],true)) Http::error('جنسیت راننده الزامی است.',422);
  foreach(['passenger_front_count','passenger_rear_count'] as $k){
    if(!array_key_exists($k,$b) || trim((string)$b[$k])==='') Http::error('تعداد سرنشین جلو و عقب الزامی است.',422);
    $v=_digits_only($b[$k]); if($v==='' || !preg_match('/^\\d+$/',$v)) Http::error('تعداد سرنشین جلو و عقب باید عددی و صفر یا بیشتر باشد.',422);
  }
  if($school['latitude']===null || $school['longitude']===null) Http::error('موقعیت مکانی مدرسه ثبت نشده است؛ ابتدا موقعیت مدرسه را ثبت کنید.',422);
  $useSchool=!empty($b['use_school_location']);
  $loc=trim((string)($b['location_text']??''));
  if($useSchool){ return; }
  if($loc==='') Http::error('محل بازدید الزامی است.',422);
  if(!isset($b['latitude'],$b['longitude']) || !is_numeric($b['latitude']) || !is_numeric($b['longitude'])) Http::error('مختصات محل بازدید الزامی است.',422);
}

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
  try { Db::run("INSERT INTO attendance_reject_logs(user_id,line_id,method,lat,lng,accuracy_m,reason,meta) VALUES(?,?,?,?,?,?,?,?)", [$userId,$lineId?:null,$method,$lat,$lng,$accuracy,$reason,json_encode($extra,JSON_UNESCAPED_UNICODE)]); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
}

/* ---------------- احراز هویت ---------------- */
// نکته دربارهٔ مسیر دوم (/api/session/start):
// روی برخی هاست‌ها/فایروال‌های امنیتی (WAF)، مسیرهایی که کلمهٔ «login» را در خود دارند
// به‌طور پیش‌فرض و برای جلوگیری از حملات brute-force مسدود می‌شوند و یک صفحهٔ خطای ۴۰۳
// (HTML، نه JSON) برمی‌گردانند؛ همین باعث خطای «پاسخ سرور JSON نیست» در اپ می‌شود، هرچند
// خودِ کد PHP کاملاً سالم است. مسیر دوم بدون کلمات حساس (login/auth) این مشکل را دور
// می‌زند. مسیر اول برای سازگاری با نسخه‌های قدیمی‌تر اپ که هنوز نصب هستند نگه داشته شده.
function _login_method($deviceType) {
  $method = _req_setting($deviceType === 'android' ? 'app_login_method' : 'web_login_method', $deviceType === 'android' ? 'password' : 'sms_otp');
  if (!in_array($method, ['password', 'sms_otp', 'bale_otp'], true)) Http::error('روش ورود تنظیم‌شده معتبر نیست؛ با مدیر سامانه تماس بگیرید.', 503);
  return $method;
}
route('GET', '/api/session/app-login-config', fn()=>['method'=>_login_method('android')], true);
route('GET', '/api/session/web-login-config', fn()=>['method'=>_login_method('web')], true);

// The fourth argument is internal only: the router never obtains it from a request.
$loginHandler = function ($p, $b, $unused = null, $verifiedOtpUserId = null) {
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
  $method = _login_method($dtype);
  if ($verifiedOtpUserId === null && $method !== 'password') Http::error('ورود با رمز عبور فعال نیست؛ از روش ورود تنظیم‌شده استفاده کنید.', 403);
  if ($verifiedOtpUserId !== null && $method === 'password') Http::error('ورود با کد یک‌بارمصرف فعال نیست.', 403);
  // محدودیت ورود بر اساس IP با جدول ایندکس‌دار؛ از JSON_EXTRACT روی activity_logs در مسیر ورود استفاده نمی‌شود
  // تا جست‌وجوی نام‌کاربری در دیتابیس باعث کندی/هنگ شدن ورود نشود.
  $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
  if ($ip) $ip = trim(explode(',', $ip)[0]);
  if ($ip !== '') {
    try {
      $ipFails = (int)(Db::one("SELECT COUNT(*) n FROM login_ip_attempts WHERE ip=? AND created_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)", [$ip])['n'] ?? 0);
      if ($ipFails >= 20) Http::error('تعداد تلاش‌های ورود از این آدرس بیش از حد مجاز است. ۱۵ دقیقه بعد دوباره تلاش کنید.', 429);
    } catch (\Throwable $e) {
      // نبودن جدول قدیمیِ محدودیت IP نباید ورود را از کار بیندازد.
    }
  }

  // ابتدا کاربر را احراز هویت می‌کنیم؛ سپس معافیت امنیتی همان رکورد قطعی اعمال می‌شود.
  // این ترتیب از نادیده‌گرفته‌شدن معافیت به‌علت جست‌وجوی مقدماتی نام کاربری جلوگیری می‌کند.
  // Fast path first: exact username lookup can use the normal username index.
  // Only legacy rows containing incidental whitespace fall back to TRIM().
  try { $u = Db::one("SELECT u.*, r.title AS role_title, r.level, r.is_admin FROM users u JOIN roles r ON r.id=u.role_id WHERE u.username=? LIMIT 1", [$username]); } catch (Throwable $e) { error_log("login role lookup failed: ".$e->getMessage()); $u = Db::one("SELECT u.* FROM users u WHERE u.username=? LIMIT 1", [$username]); $u["role_title"]=""; $u["level"]=0; $u["is_admin"]=0; }
  if (!$u) {
    try { $u = Db::one("SELECT u.*, r.title AS role_title, r.level, r.is_admin FROM users u JOIN roles r ON r.id=u.role_id WHERE TRIM(u.username)=? LIMIT 1", [$username]); } catch (Throwable $e) { error_log("login trimmed role lookup failed: ".$e->getMessage()); $u = Db::one("SELECT u.* FROM users u WHERE TRIM(u.username)=? LIMIT 1", [$username]); $u["role_title"]=""; $u["level"]=0; $u["is_admin"]=0; }
  }
  if (!$u || !$u['is_active'] || ($verifiedOtpUserId === null ? !password_verify($password, $u['password_hash']) : (int)$u['id'] !== (int)$verifiedOtpUserId)) {
    Db::run("INSERT INTO activity_logs(user_id,event,meta) VALUES(?, 'login_failed', ?)", [$u['id'] ?? null, json_encode(['username'=>$username], JSON_UNESCAPED_UNICODE)]);
    if (!empty($ip)) { try { Db::run("INSERT INTO login_ip_attempts(ip) VALUES(?)", [$ip]); } catch (\Throwable $e) {} }
    Http::error('نام کاربری یا رمز عبور اشتباه است', 401);
  }
  // قوانین امنیتی ورود؛ کاربر معاف از VPN، حالت توسعه‌دهنده، موقعیت جعلی و الزام GPS مستثنا است.
  $securityExempt = ((int)($u['security_exempt'] ?? 0) === 1);
  if ($dtype === 'android' && !$securityExempt) {
    $secCfg = function($k,$d=true){ try { $r = Db::one("SELECT value FROM app_settings WHERE `key`=?", [$k]); return $r ? json_decode($r['value'], true) : $d; } catch (Throwable $e) { error_log('login settings fallback: '.$e->getMessage()); return $d; } };
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
      unset($securityMeta['password'], $securityMeta['code']);
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
    // وب یک کلاینت مرورگری است؛ پس از احراز هویت موفق، ورود از مرورگر جدید باید نشست وب قبلی را جابه‌جا کند.
    if ($dtype === 'web') {
      Db::run("UPDATE user_sessions SET device_id=?, device_model=?, revoked_at=NULL, created_at=NOW() WHERE user_id=? AND device_type=?", [$dev, $b['device_model'] ?? null, $u['id'], $dtype]);
    } else {
      Db::run("INSERT INTO activity_logs(user_id,event,meta) VALUES(?, 'device_mismatch', ?)", [$u['id'], json_encode(['tried'=>$dev,'type'=>$dtype])]);
      Http::error('این حساب روی یک گوشی اندروید دیگر فعال است. برای تعویض، مدیر باید آن دستگاه را حذف کند.', 409);
    }
  }
  // اگر رمز هنوز پیش‌فرض (۱۲۳۴۶۶) باشد، کاربر باید رمز و ایمیل را تغییر دهد
  $mustChange = (bool)($u['must_change_pw'] ?? 0) || ($password === '123456');
  $t = issueTokens($u['id'], $dev, $dtype);
  try { Db::run("INSERT INTO activity_logs(user_id,event) VALUES(?, ?)", [$u['id'], $verifiedOtpUserId === null ? 'login' : 'login_otp']); } catch (Throwable $e) { error_log('login activity log suppressed: '.$e->getMessage()); }
  return array_merge($t, ['user'=>[
    'id'=>(int)$u['id'],'username'=>$u['username'],'name'=>trim((string)($u['first_name']??'').' '.(string)($u['last_name']??'')),
    'role'=>$u['role_title'],'role_id'=>(int)$u['role_id'],'level'=>(int)$u['level'],'is_admin'=>(bool)$u['is_admin'],'must_change_pw'=>$mustChange,
    'email'=>$u['email']??null,'photo'=>_user_photo_url($u['photo_path'] ?? null, $u['photo'] ?? null),'security_exempt'=>$securityExempt,
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
// OTP schema is provisioned by the deployment migration.
// Avoid runtime DDL and metadata locks at peak login time.
function _otp_tables() { return; }
// Platform is selected by the route, never by the request body.
function _login_otp_request($b, $dtype) {
  $username = trim((string)($b['username'] ?? ''));
  if ($username === '') Http::error('نام کاربری را وارد کنید', 400);
  $method = _login_method($dtype);
  if ($method === 'password') Http::error('ورود با کد یک‌بارمصرف فعال نیست.', 403);
  $u = Db::one("SELECT id,is_active,phone,allow_android,allow_web FROM users WHERE username=? LIMIT 1", [$username]);
  $channel = $method === 'bale_otp' ? 'bale' : 'sms';
  if (!$u || !$u['is_active'] || empty($u['allow_'.$dtype])) return ['ok'=>true,'channel'=>$channel];
  $mobile = preg_replace('/\D/', '', trim((string)($u['phone'] ?? '')));
  if ($channel === 'sms' && strlen($mobile) < 10) Http::error('برای این کاربر شماره همراه معتبر ثبت نشده است.', 400);
  if ($mobile !== '' && strpos($mobile, '0') !== 0) $mobile = '0'.ltrim($mobile, '0');
  $chat = $channel === 'bale' ? BaleBot::findChatForUser((int)$u['id']) : null;
  if ($channel === 'bale' && (!BaleBot::isEnabled() || !$chat)) Http::error('اتصال حساب به ربات بله فعال نیست؛ با مدیر سامانه تماس بگیرید.', 400);
  $recent = Db::one("SELECT id FROM login_otp WHERE user_id=? AND created_at > DATE_SUB(NOW(), INTERVAL 60 SECOND)", [$u['id']]);
  if ($recent) Http::error('لطفاً ۶۰ ثانیه صبر کنید و دوباره تلاش کنید.', 429);
  $hourly = (int)(Db::one("SELECT COUNT(*) n FROM login_otp WHERE user_id=? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)", [$u['id']])['n'] ?? 0);
  if ($hourly >= 5) Http::error('تعداد درخواست‌های کد در این ساعت بیش از حد مجاز است.', 429);
  $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
  // Bind challenges to both platform and configured channel without changing schema.
  $hash = hash('sha256', $dtype.':'.$method.':'.$code);
  Db::run("INSERT INTO login_otp(user_id,mobile,code_hash,expires_at) VALUES(?,?,?,DATE_ADD(NOW(), INTERVAL 3 MINUTE))", [$u['id'], $mobile, $hash]);
  $text = "کد ورود خطیار: {$code}\nاین کد تا ۳ دقیقه معتبر است.";
  if ($channel === 'bale') $r = BaleBot::sendMessage($chat, $text);
  else {
    $appHash = $dtype === 'android' ? _req_setting('android_sms_app_hash', '') : '';
    if ($appHash) $text .= "\n\n".$appHash;
    $r = Sms::send([$mobile], $text, 'login_otp', null);
  }
  if (empty($r['ok'])) Http::error('ارسال کد ورود ناموفق بود؛ دوباره تلاش کنید.', 502);
  return ['ok'=>true,'channel'=>$channel];
}
function _login_otp_verify($b, $dtype, $loginHandler) {
  $method = _login_method($dtype);
  if ($method === 'password') Http::error('ورود با کد یک‌بارمصرف فعال نیست.', 403);
  $username = trim((string)($b['username'] ?? ''));
  $code = _app_en_digits(trim((string)($b['code'] ?? '')));
  if ($username === '' || !preg_match('/^[0-9]{6}$/D', $code) || strlen((string)($b['device_id'] ?? '')) < 6) Http::error('ورودی نامعتبر', 400);
  $u = Db::one("SELECT id,is_active FROM users WHERE username=? LIMIT 1", [$username]);
  if (!$u || !$u['is_active']) Http::error('کد واردشده صحیح یا منقضی شده است.', 401);
  $row = Db::one("SELECT * FROM login_otp WHERE user_id=? AND consumed_at IS NULL ORDER BY id DESC LIMIT 1", [$u['id']]);
  if (!$row || strtotime($row['expires_at']) <= time()) Http::error('کد واردشده صحیح یا منقضی شده است.', 401);
  // Reserve each attempt atomically, including concurrent incorrect submissions.
  $attempt = Db::run("UPDATE login_otp SET attempts=attempts+1 WHERE id=? AND consumed_at IS NULL AND attempts<5 AND expires_at>NOW()", [$row['id']]);
  if ($attempt->rowCount() !== 1) Http::error('کد منقضی شده یا تعداد تلاش‌های مجاز تمام شده است.', 429);
  if (!hash_equals($row['code_hash'], hash('sha256', $dtype.':'.$method.':'.$code))) Http::error('کد واردشده نادرست است', 401);
  $consume = Db::run("UPDATE login_otp SET consumed_at=NOW() WHERE id=? AND consumed_at IS NULL AND expires_at>NOW()", [$row['id']]);
  if ($consume->rowCount() !== 1) Http::error('این کد قبلاً استفاده شده یا منقضی شده است.', 401);
  $b['device_type'] = $dtype;
  unset($b['password']);
  return $loginHandler([], $b, null, (int)$u['id']);
}
route('POST', '/api/session/otp-request', fn($p,$b)=>_login_otp_request($b,'web'), true);
route('POST', '/api/session/otp-verify', fn($p,$b)=>_login_otp_verify($b,'web',$loginHandler), true);
route('POST', '/api/session/app-login-request', fn($p,$b)=>_login_otp_request($b,'android'), true);
route('POST', '/api/session/app-login-verify', fn($p,$b)=>_login_otp_verify($b,'android',$loginHandler), true);

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

// زمان‌بندی تصادفی صحت‌سنجی: در هر بلوک ۴ ساعته، ۳ زمان مستقل برای هر حضور ساخته می‌شود.
function _ensure_presence_random_schedule_schema(){
  try{
    Db::run("CREATE TABLE IF NOT EXISTS presence_random_schedules(
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      attendance_id BIGINT UNSIGNED NOT NULL,
      checkin_at DATETIME NOT NULL,
      schedule_json LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY(id),
      UNIQUE KEY uq_prs_attendance(attendance_id),
      KEY idx_prs_user_attendance(user_id,attendance_id),
      KEY idx_prs_checkin(checkin_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  }catch(Throwable $e){}
}
function _presence_random_schedule_enabled($cfg){
  return !empty($cfg['enabled']) && !empty($cfg['random_enabled']);
}
function _presence_random_generate_schedule($checkinAt,$windowMinutes=1,$blocks=6){
  $ts=strtotime((string)$checkinAt);
  if(!$ts)return [];
  $window=max(1,min(10,(int)$windowMinutes));
  $out=[];
  // حداکثر ۲۴ ساعت بعد از ورود؛ وضعیت باز بودن حضور در کرون تعیین می‌کند که بعد از خروج چیزی ارسال نشود.
  for($b=0;$b<max(1,(int)$blocks);$b++){
    $base=$ts+($b*4*3600);
    $candidates=[];
    $attempts=0;
    while(count($candidates)<3 && $attempts<80){
      $attempts++;
      $offset=random_int(10*60,230*60);
      $candidate=$base+$offset;
      $ok=true;
      foreach($candidates as $x)if(abs($candidate-$x)<30*60){$ok=false;break;}
      if($ok)$candidates[]=$candidate;
    }
    sort($candidates,SORT_NUMERIC);
    foreach($candidates as $idx=>$at){
      $out[]=[
        'id'=>($b*3)+$idx+1,
        'at'=>date('Y-m-d H:i:s',$at),
        'ts'=>$at,
        'slot'=>date('H:i',$at),
        'window_minutes'=>$window,
        'block'=>$b+1
      ];
    }
  }
  usort($out,fn($a,$b)=>($a['ts']??0)<=>($b['ts']??0));
  return $out;
}
function _presence_random_schedule_for_attendance($userId,$attendanceId,$checkinAt,$cfg){
  _ensure_presence_random_schedule_schema();
  if(!_presence_random_schedule_enabled($cfg))return [];
  $existing=Db::one("SELECT schedule_json FROM presence_random_schedules WHERE attendance_id=? LIMIT 1",[$attendanceId]);
  if($existing){
    $j=json_decode($existing['schedule_json']??'',true);
    return is_array($j)?$j:[];
  }
  $win=max(1,min(10,(int)($cfg['window_minutes']??1)));
  $items=_presence_random_generate_schedule($checkinAt,$win,6);
  Db::run("INSERT IGNORE INTO presence_random_schedules(user_id,attendance_id,checkin_at,schedule_json) VALUES(?,?,?,?)",[
    $userId,$attendanceId,$checkinAt,json_encode($items,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)
  ]);
  // Cron and Android may initialize this attendance concurrently. Always return
  // the winning persisted schedule so both use identical random timestamps.
  $stored=Db::one("SELECT schedule_json FROM presence_random_schedules WHERE attendance_id=? LIMIT 1",[$attendanceId]);
  $persisted=$stored?json_decode($stored['schedule_json']??'',true):null;
  return is_array($persisted)?$persisted:$items;
}
function _presence_random_schedule_payload($items){
  return array_values(array_map(function($x){
    return [
      'id'=>(int)($x['id']??0),
      'at'=>(string)($x['at']??''),
      'ts'=>(int)($x['ts']??0),
      'slot'=>(string)($x['slot']??''),
      'window_minutes'=>max(1,(int)($x['window_minutes']??1)),
      'block'=>(int)($x['block']??0)
    ];
  },is_array($items)?$items:[]));
}

// پیکربندی برای اپ موبایل: آیا فعال است، آیا این کاربر مشمول است، بازه‌های ساعتی، مهلت
route('GET', '/api/my/presence-config', function($p,$b,$u){
  $cfgRow = Db::one("SELECT value FROM app_settings WHERE `key`='presence_check'");
  $cfg = $cfgRow ? json_decode($cfgRow['value'], true) : [];
  $presenceRequired = false;
  try { $r = Db::one("SELECT presence_required FROM users WHERE id=?", [$u['id']]); $presenceRequired = (bool)($r['presence_required'] ?? 0); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  $required = _presence_is_required_for_user($u['id'], $cfg, $presenceRequired);
  $immediate = [];
  $now = time();
  $rows = Db::all("SELECT data,created_at FROM notifications
    WHERE user_id=? AND created_at>=? AND data LIKE ? ORDER BY id DESC LIMIT 10",
    [(int)$u['id'],date('Y-m-d H:i:s',$now-60),'%"immediate":true%']);
  foreach ($rows as $row) {
    $data = json_decode($row['data'],true);
    if (($data['type']??null)!=='presence_check' || ($data['immediate']??false)!==true || empty($data['request_id'])) continue;
    $data['ts'] = (int)($data['ts']??strtotime($data['immediate_at']??$row['created_at']));
    if ($data['ts']>0 && $now<$data['ts']+60) $immediate[]=$data;
  }
  return [
    'enabled' => !empty($cfg['enabled']),
    'required' => $required,
    'slots' => $cfg['slots'] ?? [],
    'window_minutes' => (int)($cfg['window_minutes'] ?? 1),
    'grace_minutes' => (int)($cfg['grace_minutes'] ?? 15),
    'alarm' => !isset($cfg['alarm']) ? true : !empty($cfg['alarm']), // صدای آلارم هنگام صحت‌سنجی
    'audience' => $cfg['audience'] ?? 'all_required', // all_required | shift_only
    'server_push' => !isset($cfg['server_push']) ? true : !empty($cfg['server_push']),
    'random_enabled' => !empty($cfg['random_enabled']),
    'immediate_requests' => $immediate,
  ];
});

// برنامهٔ زمان‌بندی تصادفی فعال برای جلسهٔ حضور فعلی؛ برای بازیابی کش اپ نیز استفاده می‌شود.
route('GET', '/api/my/presence-checks/today', function($p,$b,$u){
  $today=date('Y-m-d');
  $start=$today.' 00:00:00';
  $end=date('Y-m-d 00:00:00',strtotime('tomorrow'));
  $rows=Db::all("SELECT id,data,created_at FROM notifications
    WHERE user_id=? AND created_at>=? AND created_at<? AND data LIKE ?
    ORDER BY created_at DESC,id DESC",[(int)$u['id'],$start,$end,'%"presence_check"%']);
  $checks=Db::all("SELECT slot,captured_at FROM presence_checks WHERE user_id=? AND slot_date=?",[(int)$u['id'],$today]);
  $completed=array_column($checks,'captured_at','slot');
  $items=[];
  foreach($rows as $row){
    $data=json_decode($row['data'],true);
    $slot=(string)($data['slot']??'');
    if(($data['type']??null)!=='presence_check'||!preg_match('/^\d{2}:\d{2}$/',$slot))continue;
    $id=$data['request_id']??('slot_'.$slot);
    if(isset($items[$id]))continue;
    $sent=strtotime($row['created_at']);
    $doneAt=$completed[$slot]??null;
    $done=$doneAt && strtotime($doneAt)>=$sent;
    if($done)unset($completed[$slot]);
    $deadline=(int)($data['ts']??$sent)+max(1,(int)($data['window_minutes']??1))*60;
    $items[$id]=['id'=>(string)$id,'slot'=>$slot,'sent_time'=>date('H:i',$sent),
      'immediate'=>!empty($data['immediate']),
      'status'=>$done?'done':(time()<$deadline?'pending':'missed')];
  }
  return ['date'=>$today,'items'=>array_values($items)];
});

route('GET', '/api/my/presence-random-schedule', function($p,$b,$u){
  $cfgRow=Db::one("SELECT value FROM app_settings WHERE `key`='presence_check'");
  $cfg=$cfgRow?json_decode($cfgRow['value'],true):[];
  if(!_presence_random_schedule_enabled($cfg)) return ['ok'=>true,'enabled'=>false,'items'=>[]];
  $open=Db::one("SELECT id,check_in FROM staff_attendance WHERE user_id=? AND check_out IS NULL ORDER BY id DESC LIMIT 1",[$u['id']]);
  if(!$open)return ['ok'=>true,'enabled'=>true,'items'=>[]];
  $jdate=_presence_today_jdate();
  $presenceRequired=false;
  try{$rr=Db::one("SELECT presence_required FROM users WHERE id=?",[$u['id']]);$presenceRequired=!empty($rr['presence_required']);}catch(Throwable $e){}
  if(!_presence_is_required_for_user((int)$u['id'],$cfg,$presenceRequired,$jdate,strtotime($open['check_in']))) return ['ok'=>true,'enabled'=>true,'items'=>[]];
  $items=_presence_random_schedule_for_attendance((int)$u['id'],(int)$open['id'],$open['check_in'],$cfg);
  return ['ok'=>true,'enabled'=>true,'attendance_id'=>(int)$open['id'],'items'=>_presence_random_schedule_payload($items)];
});

// Notify responsible levels 1-4 only when a saved verification is genuinely outside
// every configured geofence of the submitting user's assigned lines.
function _presence_outside_lines_bale_alert($checkId,$userId,$lat,$lng,$slot) {
  try {
    if (!is_numeric($lat) || !is_numeric($lng)) return;
    $lat=(float)$lat; $lng=(float)$lng;
    if (!is_finite($lat) || !is_finite($lng) || $lat < -90 || $lat > 90 || $lng < -180 || $lng > 180 || ($lat == 0.0 && $lng == 0.0)) return;
    $lineIds=array_values(array_unique(array_map('intval',array_column(Db::all('SELECT line_id FROM user_lines WHERE user_id=?',[(int)$userId]),'line_id'))));
    // No assigned lines or configured boundaries: do not make an ungrounded outside-area accusation.
    if (!$lineIds) return;
    $placeholders=implode(',',array_fill(0,count($lineIds),'?'));
    $fenceCount=Db::one("SELECT COUNT(*) AS n FROM geofences WHERE line_id IN ($placeholders)",$lineIds);
    if ((int)($fenceCount['n']??0)===0 || station_at_point($lat,$lng,$lineIds,50)!==null) return;
    Db::run("CREATE TABLE IF NOT EXISTS presence_outside_bale_alerts (check_id BIGINT NOT NULL PRIMARY KEY, user_id INT NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    // A unique check ID prevents a repeated submission from messaging management again.
    $inserted=Db::exec('INSERT IGNORE INTO presence_outside_bale_alerts(check_id,user_id) VALUES(?,?)',[(int)$checkId,(int)$userId]);
    if ($inserted === 0) return;
    $staff=Db::one('SELECT first_name,last_name FROM users WHERE id=?',[(int)$userId]);
    $name=trim((string)($staff['first_name']??'').' '.(string)($staff['last_name']??''));
    if ($name==='') $name='شناسه '.(int)$userId;
    $time=date('H:i');
    $mapUrl='https://www.google.com/maps?q='.sprintf('%.6F',$lat).','.sprintf('%.6F',$lng);
    $managers=Db::all('SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id WHERE u.is_active=1 AND r.level BETWEEN 1 AND 4');
    $recipients=array_values(array_unique(array_map('intval',array_column($managers,'id'))));
    if (!$recipients || !class_exists('BaleBot')) return;
    $street='';
    try {
      if (function_exists('presence_reverse_geocode')) $street=presence_reverse_geocode($lat,$lng)['street']??'';
    } catch (Throwable $e) {
      error_log('presence alert street lookup failed: '.$e->getMessage());
    }
    $body="{$name} | ساعت {$time} (بازه {$slot})\n";
    if ($street!=='') $body.="خیابان: {$street} (© OpenStreetMap)\n";
    $body.=$mapUrl;
    BaleBot::sendToUserIds($recipients,'⚠️ صحت‌سنجی خارج از محدوده ایستگاه',$body,'messages',['presence_check_id'=>(int)$checkId,'user_id'=>(int)$userId]);
  } catch (Throwable $e) { error_log('presence outside-area Bale alert: '.$e->getMessage()); }
}

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
  if (!$_selfiePath || !$_vehPath) {
    if ($_selfiePath) Media::delete($_selfiePath);
    if ($_vehPath) Media::delete($_vehPath);
    Http::error('ذخیره تصاویر صحت‌سنجی انجام نشد. دوباره تلاش کنید.', 500);
  }
  if ($ex) {
    Db::run("UPDATE presence_checks SET selfie_path=?, vehicles_photo_path=?, lat=?, lng=?, captured_at=NOW() WHERE id=?",
      [$_selfiePath, $_vehPath, $b['lat']??null, $b['lng']??null, $ex['id']]);
    _presence_outside_lines_bale_alert((int)$ex['id'],(int)$u['id'],$b['lat']??null,$b['lng']??null,$slot);
    return ['ok'=>true, 'id'=>(int)$ex['id']];
  }
  $id = Db::insert("INSERT INTO presence_checks(user_id,slot,slot_date,selfie_path,vehicles_photo_path,lat,lng) VALUES(?,?,?,?,?,?,?)",
    [$u['id'],$slot,$date,$_selfiePath,$_vehPath,$b['lat']??null,$b['lng']??null]);
  _presence_outside_lines_bale_alert((int)$id,(int)$u['id'],$b['lat']??null,$b['lng']??null,$slot);
  return ['ok'=>true, 'id'=>$id];
});


// ارسال Push صحت‌سنجی حضور از سمت سرور؛ برای کرون هر دقیقه اجرا شود: /api/cron/presence-alert?key=CRON_KEY
route('GET', '/api/cron/presence-alert', function($p,$b,$u){
  $cfgK = Db::one("SELECT value FROM app_settings WHERE `key`='cron_key'");
  $key = $cfgK ? json_decode($cfgK['value'], true) : null;
  if (!$key || ($_GET['key'] ?? '') !== $key) Http::error('forbidden', 403);
  $cfgRow = Db::one("SELECT value FROM app_settings WHERE `key`='presence_check'");
  $cfg = $cfgRow ? json_decode($cfgRow['value'], true) : [];
  if (empty($cfg['enabled']) || (isset($cfg['server_push']) && empty($cfg['server_push']))) return ['ok'=>true,'sent'=>0,'reason'=>'disabled'];
  $now = time(); $today = date('Y-m-d'); $sent = 0; $win = max(1,(int)($cfg['window_minutes'] ?? 1));
  if(empty($cfg['random_enabled'])) foreach (($cfg['slots'] ?? []) as $sl) {
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
  // در حالت تصادفی، ساعت‌های دستی عمداً نادیده گرفته می‌شوند.
  // زمان‌بندی تصادفی: زمان‌ها از لحظهٔ ثبت ورود هر پرسنل مستقل هستند و فقط تا وقتی حضور باز است ارسال می‌شوند.
  if(_presence_random_schedule_enabled($cfg)){
    _ensure_presence_random_schedule_schema();
    // Generate schedules on the SERVER for every eligible open attendance.
    // Previously schedules only existed after a handset fetched its personal API.
    $generated=0;$eligible=0;$randomErrors=0;
    try{
      $rows=Db::all("SELECT sa.id attendance_id,sa.user_id,sa.check_in,u.presence_required,prs.schedule_json
        FROM staff_attendance sa
        JOIN users u ON u.id=sa.user_id AND u.is_active=1 AND u.presence_required=1
        LEFT JOIN presence_random_schedules prs ON prs.attendance_id=sa.id
        WHERE sa.check_out IS NULL AND sa.check_in IS NOT NULL AND sa.check_in<=NOW()
          AND sa.check_in>=DATE_SUB(NOW(),INTERVAL 24 HOUR)
        ORDER BY sa.id DESC LIMIT 5000");
      $jdate=_presence_today_jdate();
      foreach($rows as $row){
        $uid=(int)$row['user_id'];$attendanceId=(int)$row['attendance_id'];
        if(!_presence_is_required_for_user($uid,$cfg,true,$jdate,$now))continue;
        $eligible++;
        try{
          $items=!empty($row['schedule_json'])?json_decode($row['schedule_json'],true):null;
          if(!is_array($items)||!count($items)){
            // An insert collision means the app initialized the same session simultaneously.
            $items=_presence_random_schedule_for_attendance($uid,$attendanceId,$row['check_in'],$cfg);
            $generated++;
          }
          foreach($items as $it){
            $at=(int)($it['ts']??0);if($at<=0)continue;
            $itemWin=max(1,min(10,(int)($it['window_minutes']??$win)));
            // Deliver during the ACTUAL request validity window, not a hard 70-second
            // window that may be missed by delayed cron invocations.
            if($now<$at||$now>=$at+$itemWin*60)continue;
            $slot=(string)($it['slot']??date('H:i',$at));
            $requestId='rnd_'.$attendanceId.'_'.$at;
            // Dedupe by each individual random request, not by entire attendance.
            // This also prevents duplicated push on a retried background job.
            $dup=Db::one("SELECT id FROM notifications WHERE user_id=? AND data LIKE ? LIMIT 1",
              [$uid,'%'. $requestId .'%']);
            if($dup)continue;
            Push::notify([$uid],'صحت‌سنجی حضور',"لطفاً ظرف {$itemWin} دقیقه سلفی و عکس خودروهای خط را ارسال کنید.",[
              'type'=>'presence_check','slot'=>$slot,'presence_slot'=>$slot,'window_minutes'=>$itemWin,
              'random'=>true,'ts'=>$at,'presence_random_attendance'=>$attendanceId,'request_id'=>$requestId
            ]);
            $sent++;
          }
        }catch(Throwable $e){
          $randomErrors++;
          error_log('presence random delivery failed uid='.$uid.' attendance='.$attendanceId.' error='.get_class($e));
        }
      }
    }catch(Throwable $e){
      $randomErrors++;
      error_log('presence random cron query failed: '.get_class($e).' '.$e->getMessage());
    }
    if($randomErrors)return ['ok'=>false,'sent'=>$sent,'eligible'=>$eligible,'generated'=>$generated,'errors'=>$randomErrors];
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
  $grace = (int)($cfg['grace_minutes'] ?? 15);
  $users = Db::all("SELECT u.id, CONCAT(u.first_name,' ',u.last_name) name, r.title role FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.is_active=1 AND u.presence_required=1");
  $done = Db::all("SELECT user_id, slot_date, slot FROM presence_checks WHERE slot_date BETWEEN ? AND ?", [$from,$to]);
  $doneSet = [];
  foreach ($done as $d) $doneSet[$d['user_id'].'|'.$d['slot_date'].'|'.$d['slot']] = true;
  $out=[]; $now=time();

  if(!empty($cfg['random_enabled'])){
    _ensure_presence_random_schedule_schema();
    $rows=Db::all("SELECT prs.user_id,prs.schedule_json,CONCAT(us.first_name,' ',us.last_name) name,r.title role
      FROM presence_random_schedules prs
      JOIN users us ON us.id=prs.user_id
      LEFT JOIN roles r ON r.id=us.role_id
      JOIN staff_attendance sa ON sa.id=prs.attendance_id
      WHERE us.is_active=1 AND us.presence_required=1
        AND DATE(sa.check_in) <= ? AND (sa.check_out IS NULL OR DATE(sa.check_out) >= ?)
      ORDER BY prs.id DESC",[$to,$from]);
    foreach($rows as $row){
      $items=json_decode($row['schedule_json']??'',true);
      if(!is_array($items))continue;
      foreach($items as $it){
        $ts=(int)($it['ts']??0); if(!$ts)continue;
        $ds=date('Y-m-d',$ts);
        if($ds<$from||$ds>$to)continue;
        if($ts+$grace*60>$now)continue;
        $slot=(string)($it['slot']??date('H:i',$ts));
        if(!empty($doneSet[$row['user_id'].'|'.$ds.'|'.$slot]))continue;
        $out[]=['user_id'=>(int)$row['user_id'],'name'=>$row['name'],'role'=>$row['role'],'slot_date'=>$ds,'slot'=>$slot,'type'=>'عدم ارسال صحت‌سنجی حضور'];
      }
    }
    return $out;
  }

  $slots = $cfg['slots'] ?? []; if (!$slots) return [];
  $aud = $cfg['audience'] ?? 'all_required';
  foreach($done as $d) $doneSet[$d['user_id'].'|'.$d['slot_date'].'|'.$d['slot']] = true;
  $start = strtotime($from); $end = strtotime($to);
  for ($day = $start; $day <= $end; $day += 86400) {
    $ds = date('Y-m-d', $day);
    foreach ($users as $usr) {
      foreach ($slots as $sl) {
        $deadline = strtotime($ds.' '.$sl.':00') + $grace*60;
        if ($deadline > $now) continue;
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
require_once __DIR__.'/Payroll.php';
require_once __DIR__.'/company_work_routes.php';
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
  $ar…212152 tokens truncated…Y name")];});
route('GET','/api/inventory/recipients',function($p,$b,$u){
  return ['roles'=>Db::all("SELECT DISTINCT r.id,r.title FROM roles r JOIN users u ON u.role_id=r.id WHERE u.is_active=1 ORDER BY r.title"),
    'users'=>Db::all("SELECT u.id,u.role_id,TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) name,r.title role_title FROM users u JOIN roles r ON r.id=u.role_id WHERE u.is_active=1 AND u.id<>? ORDER BY r.title,u.last_name,u.first_name",[(int)$u['id']])];
});
route('GET','/api/inventory/pending',function($p,$b,$u){
  _inv_tables();return ['items'=>Db::all("SELECT t.id,t.quantity,t.note,t.created_at,t.transferable,it.name item_name,it.unit,
    TRIM(CONCAT(COALESCE(fu.first_name,''),' ',COALESCE(fu.last_name,''))) from_name
    FROM inventory_transfers t JOIN inventory_item_types it ON it.id=t.item_type_id LEFT JOIN users fu ON fu.id=t.from_user_id
    WHERE t.to_user_id=? AND t.status='pending' ORDER BY t.created_at DESC,t.id DESC",[(int)$u['id']])];
});
route('GET','/api/inventory/history',function($p,$b,$u){
  _inv_tables();return ['items'=>Db::all("SELECT t.id,t.quantity,t.note,t.status,t.created_at,t.confirmed_at,t.rejected_at,t.transferable,it.name item_name,it.unit,
    TRIM(CONCAT(COALESCE(fu.first_name,''),' ',COALESCE(fu.last_name,''))) from_name,
    TRIM(CONCAT(COALESCE(tu.first_name,''),' ',COALESCE(tu.last_name,''))) to_name
    FROM inventory_transfers t JOIN inventory_item_types it ON it.id=t.item_type_id LEFT JOIN users fu ON fu.id=t.from_user_id JOIN users tu ON tu.id=t.to_user_id
    WHERE t.from_user_id=? OR t.to_user_id=? ORDER BY t.created_at DESC,t.id DESC LIMIT 500",[(int)$u['id'],(int)$u['id']])];
});
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
    FROM inventory_transfers t JOIN inventory_item_types it ON it.id=t.item_type_id
    LEFT JOIN users fu ON fu.id=t.from_user_id JOIN users tu ON tu.id=t.to_user_id
    WHERE $where ORDER BY t.created_at DESC,t.id DESC LIMIT 500",$pr);
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



/* ================= سرویس مدارس ================= */
function _ssv_tables(){
  static $done=false; if($done) return; $done=true;
  $sql=[
    "CREATE TABLE IF NOT EXISTS school_service_companies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      manager_name VARCHAR(150) NULL,
      phone VARCHAR(50) NULL,
      address VARCHAR(500) NULL,
      manager_mobile VARCHAR(30) NULL,
      landline_phone VARCHAR(30) NULL,
      latitude DECIMAL(10,7) NULL,
      longitude DECIMAL(10,7) NULL,
      registered_school_count INT NOT NULL DEFAULT 0,
      representative_count INT NOT NULL DEFAULT 0,
      status VARCHAR(30) NOT NULL DEFAULT 'فعال',
      profile_complete TINYINT(1) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_ssc_name(name),
      KEY idx_ssc_active(is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS school_service_schools (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(80) NULL,
      name VARCHAR(255) NOT NULL,
      educational_district VARCHAR(80) NULL,
      gender ENUM('دخترانه','پسرانه','نامشخص') NOT NULL DEFAULT 'نامشخص',
      shift VARCHAR(80) NULL,
      education_level VARCHAR(150) NULL,
      school_type VARCHAR(150) NULL,
      activity_start VARCHAR(20) NULL,
      activity_end VARCHAR(20) NULL,
      morning_start VARCHAR(20) NULL,
      morning_end VARCHAR(20) NULL,
      afternoon_start VARCHAR(20) NULL,
      afternoon_end VARCHAR(20) NULL,
      driver_count INT NULL,
      student_count INT NULL,
      address VARCHAR(700) NULL,
      phone VARCHAR(80) NULL,
      latitude DECIMAL(10,7) NULL,
      longitude DECIMAL(10,7) NULL,
      status VARCHAR(80) NOT NULL DEFAULT 'ثبت‌شده',
      location_registered_at DATETIME NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_sss_code(code),
      KEY idx_sss_name(name),
      KEY idx_sss_district(educational_district)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS school_service_school_companies (
      school_id INT NOT NULL,
      company_id INT NOT NULL,
      is_primary TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(school_id,company_id),
      KEY idx_sssc_company(company_id),
      CONSTRAINT fk_sssc_school FOREIGN KEY(school_id) REFERENCES school_service_schools(id) ON DELETE CASCADE,
      CONSTRAINT fk_sssc_company FOREIGN KEY(company_id) REFERENCES school_service_companies(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS school_service_violation_types (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL UNIQUE,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS school_service_inspections (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      inspector_user_id INT NOT NULL,
      client_uuid VARCHAR(64) NULL,
      educational_district VARCHAR(80) NULL,
      company_id INT NULL,
      school_id INT NULL,
      school_gender ENUM('دخترانه','پسرانه','نامشخص') NOT NULL DEFAULT 'نامشخص',
      plate_three VARCHAR(3) NULL,
      plate_letter VARCHAR(5) NULL,
      plate_two VARCHAR(2) NULL,
      iran_code VARCHAR(5) NOT NULL DEFAULT 'ایران',
      plate_region_code VARCHAR(2) NULL,
      vehicle_type VARCHAR(100) NULL,
      vehicle_color VARCHAR(80) NULL,
      passenger_count INT NOT NULL DEFAULT 0,
      passenger_front_count INT NOT NULL DEFAULT 0,
      passenger_rear_count INT NOT NULL DEFAULT 0,
      driver_gender ENUM('خانم','آقا','نامشخص') NOT NULL DEFAULT 'نامشخص',
      certificate_status ENUM('معتبر','نامعتبر','ارائه نشد') NOT NULL DEFAULT 'ارائه نشد',
      violation_date VARCHAR(20) NULL,
      violation_time VARCHAR(10) NULL,
      location_text VARCHAR(700) NULL,
      latitude DECIMAL(10,7) NULL,
      longitude DECIMAL(10,7) NULL,
      description TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_ssi_user(inspector_user_id,created_at),
      KEY idx_ssi_company(company_id,created_at),
      KEY idx_ssi_school(school_id,created_at),
      KEY idx_ssi_date(violation_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS school_service_inspection_violations (
      inspection_id BIGINT NOT NULL,
      violation_type_id INT NOT NULL,
      PRIMARY KEY(inspection_id,violation_type_id),
      KEY idx_ssiv_type(violation_type_id),
      CONSTRAINT fk_ssiv_inspection FOREIGN KEY(inspection_id) REFERENCES school_service_inspections(id) ON DELETE CASCADE,
      CONSTRAINT fk_ssiv_type FOREIGN KEY(violation_type_id) REFERENCES school_service_violation_types(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS school_service_vehicles (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      plate_two VARCHAR(2) NOT NULL,
      plate_letter VARCHAR(5) NOT NULL,
      plate_three VARCHAR(3) NOT NULL,
      plate_region_code VARCHAR(2) NOT NULL,
      vehicle_type VARCHAR(100) NULL,
      vehicle_color VARCHAR(80) NULL,
      passenger_front_count INT NOT NULL DEFAULT 0,
      passenger_rear_count INT NOT NULL DEFAULT 0,
      driver_gender ENUM('خانم','آقا','نامشخص') NOT NULL DEFAULT 'نامشخص',
      certificate_status ENUM('معتبر','نامعتبر','ارائه نشد') NOT NULL DEFAULT 'ارائه نشد',
      last_inspection_id BIGINT NULL,
      last_inspection_at DATETIME NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_ssv_plate(plate_two,plate_letter,plate_three,plate_region_code),
      KEY idx_ssv_active(is_active),
      KEY idx_ssv_last(last_inspection_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS school_service_permissions (
      role_id INT NOT NULL PRIMARY KEY,
      can_view TINYINT(1) NOT NULL DEFAULT 0,
      can_create TINYINT(1) NOT NULL DEFAULT 0,
      can_edit TINYINT(1) NOT NULL DEFAULT 0,
      can_delete TINYINT(1) NOT NULL DEFAULT 0,
      can_import TINYINT(1) NOT NULL DEFAULT 0,
      can_report TINYINT(1) NOT NULL DEFAULT 0,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS school_service_districts (id INT AUTO_INCREMENT PRIMARY KEY,title VARCHAR(80) NOT NULL UNIQUE,is_active TINYINT(1) NOT NULL DEFAULT 1,sort_order INT NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS school_service_vehicle_types (id INT AUTO_INCREMENT PRIMARY KEY,title VARCHAR(100) NOT NULL UNIQUE,is_active TINYINT(1) NOT NULL DEFAULT 1,sort_order INT NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS school_service_vehicle_colors (id INT AUTO_INCREMENT PRIMARY KEY,title VARCHAR(80) NOT NULL UNIQUE,is_active TINYINT(1) NOT NULL DEFAULT 1,sort_order INT NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS school_service_import_logs (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      file_name VARCHAR(255) NULL,
      companies_count INT NOT NULL DEFAULT 0,
      schools_count INT NOT NULL DEFAULT 0,
      mappings_count INT NOT NULL DEFAULT 0,
      errors_count INT NOT NULL DEFAULT 0,
      errors_text LONGTEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS school_service_inspection_photos (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      inspection_id BIGINT NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      mime_type VARCHAR(80) NOT NULL DEFAULT 'image/jpeg',
      width INT NULL,
      height INT NULL,
      file_size INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_ssip_inspection(inspection_id),
      CONSTRAINT fk_ssip_inspection FOREIGN KEY(inspection_id) REFERENCES school_service_inspections(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
  ];
  foreach($sql as $q){try{Db::run($q);}catch(Throwable $e){error_log('school-service table: '.$e->getMessage());}}
  // تکمیل ساختار پروفایل شرکت‌ها برای نصب‌های قدیمی
  foreach([
    "ALTER TABLE school_service_companies ADD COLUMN manager_mobile VARCHAR(30) NULL",
    "ALTER TABLE school_service_companies ADD COLUMN landline_phone VARCHAR(30) NULL",
    "ALTER TABLE school_service_companies ADD COLUMN latitude DECIMAL(10,7) NULL",
    "ALTER TABLE school_service_companies ADD COLUMN longitude DECIMAL(10,7) NULL",
    "ALTER TABLE school_service_companies ADD COLUMN registered_school_count INT NOT NULL DEFAULT 0",
    "ALTER TABLE school_service_companies ADD COLUMN representative_count INT NOT NULL DEFAULT 0",
    "ALTER TABLE school_service_companies ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'فعال'",
    "ALTER TABLE school_service_companies ADD COLUMN profile_complete TINYINT(1) NOT NULL DEFAULT 0"
  ] as $q){try{Db::run($q);}catch(Throwable $e){}}
  // تکمیل ساختار اطلاعات مدارس برای Seed و نصب‌های قدیمی.
  foreach([
    ['school_service_schools','shift','VARCHAR(80) NULL'],
    ['school_service_schools','education_level','VARCHAR(150) NULL'],
    ['school_service_schools','school_type','VARCHAR(150) NULL'],
    ['school_service_schools','activity_start','VARCHAR(20) NULL'],
    ['school_service_schools','activity_end','VARCHAR(20) NULL'],
    ['school_service_schools','morning_start','VARCHAR(20) NULL'],
    ['school_service_schools','morning_end','VARCHAR(20) NULL'],
    ['school_service_schools','afternoon_start','VARCHAR(20) NULL'],
    ['school_service_schools','afternoon_end','VARCHAR(20) NULL'],
    ['school_service_schools','driver_count','INT NULL'],
    ['school_service_schools','student_count','INT NULL'],
    ['school_service_schools','phone','VARCHAR(80) NULL'],
    ['school_service_schools','latitude','DECIMAL(10,7) NULL'],
    ['school_service_schools','longitude','DECIMAL(10,7) NULL'],
    ['school_service_schools','status',"VARCHAR(80) NULL DEFAULT 'ثبت‌شده'"],
    ['school_service_schools','location_registered_at','DATETIME NULL'],
    ['school_service_inspections','passenger_front_count','INT NOT NULL DEFAULT 0'],
    ['school_service_inspections','passenger_rear_count','INT NOT NULL DEFAULT 0']
  ] as $colDef){
    try{ if(!col_exists($colDef[0],$colDef[1])) q("ALTER TABLE `{$colDef[0]}` ADD COLUMN `{$colDef[1]}` {$colDef[2]}"); }catch(Throwable $e){}
  }
  // شناسه یکتای سمت گوشی برای جلوگیری از ثبت دوباره بازدید هنگام تکرار صف آفلاین.
  try{Db::run("ALTER TABLE school_service_inspections ADD COLUMN client_uuid VARCHAR(64) NULL");}catch(Throwable $e){}
  try{Db::run("ALTER TABLE school_service_inspections ADD UNIQUE KEY uq_ssi_client_uuid(client_uuid)");}catch(Throwable $e){}
  // تنظیمات تصویر اختصاصی سرویس مدارس عمداً وجود ندارد؛ این قابلیت از تنظیمات عمومی تصاویر سایت استفاده می‌کند.
  try{Db::run("DROP TABLE IF EXISTS school_service_photo_settings");}catch(Throwable $e){}
  // سازگاری با نصب‌های قدیمی: نسخه‌های اولیه ممکن است ستون is_primary را در رابطه مدارس/شرکت‌ها نداشته باشند.
  // این ستون قبل از هر Query وابسته به آن تکمیل می‌شود تا endpoint مدارس با HTTP 500 متوقف نشود.
  try{ Db::run("ALTER TABLE school_service_school_companies ADD COLUMN is_primary TINYINT(1) NOT NULL DEFAULT 1"); }catch(Throwable $e){}
  // هر مدرسه فقط یک شرکت مجری دارد. داده‌های قدیمیِ چندشرکتی ابتدا یک رابطه را نگه می‌دارند و سپس قید یکتا اعمال می‌شود.
  try{
    Db::run("DELETE sc1 FROM school_service_school_companies sc1 JOIN school_service_school_companies sc2 ON sc1.school_id=sc2.school_id AND sc1.company_id>sc2.company_id");
    try{Db::run("ALTER TABLE school_service_school_companies ADD UNIQUE KEY uq_sssc_school(school_id)");}catch(Throwable $e){}
  }catch(Throwable $e){error_log('school-service relation normalize: '.$e->getMessage());}
  $viol=['عدم اعتبار معاینه فنی','عدم اعتبار بیمه شخص ثالث','سرنشین اضافی','راننده غیر مجاز','داشتن یا نداشتن گواهی صلاحیت معتبر','عدم توجه به فرمان و ایست'];
  foreach($viol as $i=>$v){try{Db::run("INSERT IGNORE INTO school_service_violation_types(title,sort_order) VALUES(?,?)",[$v,$i]);}catch(Throwable $e){}}
  $districts=['۱','۲','۳','۴','۵','۶','۷','تبادکان']; foreach($districts as $i=>$v){try{Db::run("INSERT IGNORE INTO school_service_districts(title,sort_order) VALUES(?,?)",[$v,$i+1]);}catch(Throwable $e){}}
  $vehicleTypes=['سمند','سورن','پژو','پراید','تیبا','دنا','رانا','اطلس','کوییک','سایر']; foreach($vehicleTypes as $i=>$v){try{Db::run("INSERT IGNORE INTO school_service_vehicle_types(title,sort_order) VALUES(?,?)",[$v,$i+1]);}catch(Throwable $e){}}
  $vehicleColors=['سفید','زرد','مشکی','نقره‌ای','خاکستری','آبی','قرمز','سبز','سایر']; foreach($vehicleColors as $i=>$v){try{Db::run("INSERT IGNORE INTO school_service_vehicle_colors(title,sort_order) VALUES(?,?)",[$v,$i+1]);}catch(Throwable $e){}}

  try{
    $roles=Db::all("SELECT id,level FROM roles");
    foreach($roles as $r){
      $default=((int)$r['level']<=4)?1:0;
      Db::run("INSERT INTO school_service_permissions(role_id,can_view,can_create,can_edit,can_delete,can_import,can_report)
        VALUES(?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE
        can_view=IF(can_view=0 AND can_create=0 AND can_edit=0 AND can_delete=0 AND can_import=0 AND can_report=0,VALUES(can_view),can_view),
        can_create=IF(can_view=VALUES(can_view) AND can_create=0 AND can_edit=0 AND can_delete=0 AND can_import=0 AND can_report=0,VALUES(can_create),can_create),
        can_edit=IF(can_view=VALUES(can_view) AND can_create=VALUES(can_create) AND can_edit=0 AND can_delete=0 AND can_import=0 AND can_report=0,VALUES(can_edit),can_edit),
        can_delete=IF(can_view=VALUES(can_view) AND can_create=VALUES(can_create) AND can_edit=VALUES(can_edit) AND can_delete=0 AND can_import=0 AND can_report=0,VALUES(can_delete),can_delete),
        can_import=IF(can_view=VALUES(can_view) AND can_create=VALUES(can_create) AND can_edit=VALUES(can_edit) AND can_delete=VALUES(can_delete) AND can_import=0 AND can_report=0,VALUES(can_import),can_import),
        can_report=IF(can_view=VALUES(can_view) AND can_create=VALUES(can_create) AND can_edit=VALUES(can_edit) AND can_delete=VALUES(can_delete) AND can_import=VALUES(can_import) AND can_report=0,VALUES(can_report),can_report)",
        [(int)$r['id'],$default,$default,$default,$default,((int)$r['level']<=3)?1:0,$default]);
    }
  }catch(Throwable $e){}
}
function _ssv_autoseed_schools(){
  static $attempted=false; if($attempted) return; $attempted=true;
  try{
    Db::run("CREATE TABLE IF NOT EXISTS school_service_seed_state (
      seed_key VARCHAR(120) NOT NULL PRIMARY KEY,
      completed_at DATETIME NULL,
      row_count INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $state=Db::one("SELECT seed_key,row_count FROM school_service_seed_state WHERE seed_key=?",['schools-book1-v1']);
    if($state && (int)$state['row_count']>0) return;

    $seedFile=dirname(__DIR__).'/migrations/2026_09_26_school_service_schools_seed.sql';
    if(!is_file($seedFile)){error_log('school-service seed file missing: '.$seedFile);return;}
    $seedSql=@file_get_contents($seedFile);
    if($seedSql===false || !preg_match("/SET\s+@payload\s*=\s*FROM_BASE64\('([^']+)'\)/",$seedSql,$mm)){error_log('school-service seed payload not found');return;}
    $compressed=base64_decode($mm[1],true);
    if($compressed===false){error_log('school-service seed base64 decode failed');return;}
    $json=@gzuncompress($compressed);
    if($json===false || $json===''){error_log('school-service seed decompression failed');return;}
    $doc=json_decode($json,true);
    if(!is_array($doc) || !is_array($doc['d']??null) || !is_array($doc['r']??null)){error_log('school-service seed JSON invalid');return;}

    $d=$doc['d']; $rawRows=$doc['r']; $rows=[]; $companies=[];
    $dictVal=function($key,$idx)use(&$d){
      $idx=(int)$idx; if($idx<0) return null; $a=$d[$key]??null;
      if(!is_array($a) || !array_key_exists($idx,$a)) return null;
      $v=$a[$idx]; return $v===null?'':trim((string)$v);
    };
    foreach($rawRows as $r){
      if(!is_array($r) || count($r)<22) continue;
      $code=trim((string)($r[0]??'')); if($code==='') continue;
      $name=$dictVal('n',$r[5]??-1); if($name===null || $name==='') continue;
      $company=$dictVal('co',$r[7]??-1); if(in_array($company,['نامشخص','نامعلوم','-','—'],true)) $company='';
      $gender=$dictVal('g',$r[8]??-1); if(!in_array($gender,['دخترانه','پسرانه','نامشخص'],true)) $gender='نامشخص';
      $row=[
        'code'=>$code,'name'=>$name,'district'=>$dictVal('d',$r[6]??-1),'company'=>$company,'gender'=>$gender,
        'shift'=>$dictVal('sh',$r[9]??-1),'education_level'=>$dictVal('el',$r[10]??-1),'school_type'=>$dictVal('st',$r[11]??-1),
        'activity_start'=>$dictVal('as',$r[12]??-1),'activity_end'=>$dictVal('ae',$r[13]??-1),
        'morning_start'=>$dictVal('ms',$r[14]??-1),'morning_end'=>$dictVal('me',$r[15]??-1),
        'afternoon_start'=>$dictVal('af',$r[16]??-1),'afternoon_end'=>$dictVal('afe',$r[17]??-1),
        'driver_count'=>isset($r[1])&&$r[1]!==null?(int)$r[1]:null,'student_count'=>isset($r[2])&&$r[2]!==null?(int)$r[2]:null,
        'address'=>$dictVal('ad',$r[18]??-1),'phone'=>$dictVal('ph',$r[19]??-1),
        'latitude'=>isset($r[3])&&$r[3]!==null?(float)$r[3]:null,'longitude'=>isset($r[4])&&$r[4]!==null?(float)$r[4]:null,
        'status'=>$dictVal('status',$r[20]??-1),'location_registered_at'=>$dictVal('lr',$r[21]??-1)
      ];
      if($row['status']===null || $row['status']==='') $row['status']='ثبت‌شده';
      if($row['district']!==null && $row['district']!=='') $row['district']=_ssv_district_key($row['district']);
      if($row['company']!=='') $companies[$row['company']]=true;
      $rows[$code]=$row;
    }
    if(!$rows){error_log('school-service seed contains no usable rows');return;}

    $pdo=Db::pdo(); if($pdo->inTransaction()) throw new Exception('school-service seed cannot start nested transaction');
    $pdo->beginTransaction();
    try{
      foreach(array_keys($companies) as $cn)
        Db::run("INSERT INTO school_service_companies(name) VALUES(?) ON DUPLICATE KEY UPDATE name=VALUES(name)",[$cn]);

      $cols="code,name,educational_district,gender,shift,education_level,school_type,activity_start,activity_end,morning_start,morning_end,afternoon_start,afternoon_end,driver_count,student_count,address,phone,latitude,longitude,status,location_registered_at,is_active";
      $upsertTail="ON DUPLICATE KEY UPDATE name=VALUES(name),educational_district=VALUES(educational_district),gender=VALUES(gender),shift=VALUES(shift),education_level=VALUES(education_level),school_type=VALUES(school_type),activity_start=VALUES(activity_start),activity_end=VALUES(activity_end),morning_start=VALUES(morning_start),morning_end=VALUES(morning_end),afternoon_start=VALUES(afternoon_start),afternoon_end=VALUES(afternoon_end),driver_count=VALUES(driver_count),student_count=VALUES(student_count),address=VALUES(address),phone=VALUES(phone),latitude=VALUES(latitude),longitude=VALUES(longitude),status=VALUES(status),location_registered_at=VALUES(location_registered_at),is_active=1";
      $tuples=[];$params=[];$chunk=0;
      foreach($rows as $row){
        $tuples[]="(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
        $params=array_merge($params,[
          $row['code'],$row['name'],$row['district']!==''?$row['district']:null,$row['gender'],$row['shift']!==''?$row['shift']:null,
          $row['education_level']!==''?$row['education_level']:null,$row['school_type']!==''?$row['school_type']:null,$row['activity_start']!==''?$row['activity_start']:null,
          $row['activity_end']!==''?$row['activity_end']:null,$row['morning_start']!==''?$row['morning_start']:null,$row['morning_end']!==''?$row['morning_end']:null,
          $row['afternoon_start']!==''?$row['afternoon_start']:null,$row['afternoon_end']!==''?$row['afternoon_end']:null,$row['driver_count'],$row['student_count'],
          ($row['address']??'')!==''?mb_substr((string)$row['address'],0,700):null,($row['phone']??'')!==''?$row['phone']:null,
          $row['latitude'],$row['longitude'],($row['status']??'')!==''?$row['status']:'ثبت‌شده',$row['location_registered_at']?:null,1
        ]);
        if(++$chunk>=100){
          Db::run("INSERT INTO school_service_schools($cols) VALUES ".implode(',',$tuples)." $upsertTail",$params);
          $tuples=[];$params=[];$chunk=0;
        }
      }
      if($chunk>0) Db::run("INSERT INTO school_service_schools($cols) VALUES ".implode(',',$tuples)." $upsertTail",$params);

      $ids=[];
      foreach(array_chunk(array_keys($rows),250) as $codes){
        $ph=implode(',',array_fill(0,count($codes),'?'));
        foreach(Db::all("SELECT id,code FROM school_service_schools WHERE code IN ($ph)",$codes) as $sr) $ids[(string)$sr['code']]=(int)$sr['id'];
      }
      $companyIds=[];
      foreach(array_keys($companies) as $cn){$cr=Db::one("SELECT id FROM school_service_companies WHERE name=?",[$cn]);if($cr)$companyIds[$cn]=(int)$cr['id'];}

      $tuples=[];$params=[];$chunk=0;
      foreach($rows as $row){
        if($row['company']!=='' && isset($ids[$row['code']],$companyIds[$row['company']])){
          $tuples[]='(?,?,1)';$params[]=$ids[$row['code']];$params[]=$companyIds[$row['company']];
          if(++$chunk>=200){
            Db::run("INSERT INTO school_service_school_companies(school_id,company_id,is_primary) VALUES ".implode(',',$tuples)." ON DUPLICATE KEY UPDATE company_id=VALUES(company_id),is_primary=1",$params);
            $tuples=[];$params=[];$chunk=0;
          }
        }
      }
      if($chunk>0) Db::run("INSERT INTO school_service_school_companies(school_id,company_id,is_primary) VALUES ".implode(',',$tuples)." ON DUPLICATE KEY UPDATE company_id=VALUES(company_id),is_primary=1",$params);

      $stored=(int)(Db::one("SELECT COUNT(*) n FROM school_service_schools")['n']??0);
      Db::run("INSERT INTO school_service_seed_state(seed_key,completed_at,row_count) VALUES(?,?,?) ON DUPLICATE KEY UPDATE completed_at=VALUES(completed_at),row_count=VALUES(row_count)",['schools-book1-v1',date('Y-m-d H:i:s'),$stored]);
      $pdo->commit(); error_log('school-service seed completed: '.$stored.' rows');
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();error_log('school-service seed failed: '.$e->getMessage());}
  }catch(Throwable $e){error_log('school-service seed bootstrap failed: '.$e->getMessage());}
}

function _ssv_school_company_validate($schoolId,$companyId,$district=''){
  $schoolId=(int)$schoolId;$companyId=(int)$companyId;
  if($schoolId){
    $s=Db::one("SELECT id,educational_district FROM school_service_schools WHERE id=? AND is_active=1",[$schoolId]);
    if(!$s) Http::error('مدرسه انتخاب‌شده معتبر نیست.',422);
    if($district!=='' && _ssv_district_key($s['educational_district'])!==_ssv_district_key($district)) Http::error('ناحیه مدرسه با ناحیه انتخاب‌شده یکسان نیست.',422);
    if($companyId){
      if(!Db::one("SELECT id FROM school_service_companies WHERE id=? AND is_active=1",[$companyId])) Http::error('شرکت مجری انتخاب‌شده معتبر نیست.',422);
      $map=Db::one("SELECT company_id FROM school_service_school_companies WHERE school_id=?",[$schoolId]);
      if($map && (int)$map['company_id']!==$companyId) Http::error('شرکت انتخاب‌شده با شرکت مجری این مدرسه مطابقت ندارد.',422);
    }
  }elseif($companyId && !Db::one("SELECT id FROM school_service_companies WHERE id=? AND is_active=1",[$companyId])) Http::error('شرکت مجری انتخاب‌شده معتبر نیست.',422);
}
function _ssv_valid_option($table,$title){$title=_ssv_norm($title);return $title!==''&&Db::one("SELECT id FROM $table WHERE title=? AND is_active=1",[$title]);}
function _ssv_role_is_admin($u){
  if(!empty($u['is_admin'])) return true;
  $r=_ssv_norm($u['role_title']??'');
  return in_array($r,['مدیر کل','مدیرکل','رییس اداره بازرسی','رئیس اداره بازرسی','نیروی اداری ارشد'],true);
}
function _ssv_perm($u,$action='view'){
  _ssv_tables();
  if(_ssv_role_is_admin($u)) return true;
  $col='can_'.preg_replace('/[^a-z_]/','',$action);
  if(!in_array($col,['can_view','can_create','can_edit','can_delete','can_import','can_report'],true)) return false;
  $r=Db::one("SELECT $col v FROM school_service_permissions WHERE role_id=?",[(int)$u['role_id']]);
  return !empty($r['v']);
}
function _ssv_need($u,$a='view'){if(!_ssv_perm($u,$a)) Http::error('دسترسی به بخش سرویس مدارس برای سمت شما فعال نیست.',403);}
function _ssv_json_rows($rows){return array_map(function($r){foreach($r as $k=>$v)if(is_string($v))$r[$k]=$v;return $r;},$rows);}
function _ssv_en($s){return strtr((string)$s,['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9']);}
function _ssv_norm($s){$s=trim((string)$s);$s=str_replace(['ي','ى','ك','ۀ'],['ی','ی','ک','ه'],$s);return preg_replace('/\s+/u',' ',$s);}
function _ssv_district_normalized($s){
  $s=_ssv_norm($s);
  if($s==='') return '';
  $s=strtr($s,['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9']);
  $s=preg_replace('/^(?:ناحیه|منطقه)[\\s\\x{200c}\\x{200f}]*/u','',$s);
  $s=preg_replace('/[\\s\\x{200c}\\x{200f}]+/u','',$s);
  return trim($s);
}
function _ssv_district_key($s){
  $normalized=_ssv_district_normalized($s);
  if($normalized==='') return '';
  // ناحیه آموزشی منبع دادهٔ مدرسه است؛ مقدار ذخیره‌شده در DB نباید بازنویسی یا
  // به «۱ تا ۷» تبدیل شود. فقط برای مقایسه نرمال می‌کنیم و سپس دقیقاً همان
  // عنوان موجود در school_service_schools را برمی‌گردانیم.
  try{
    $exact=_ssv_norm($s);
    if($exact!==''){
      $row=Db::one("SELECT educational_district AS title
        FROM school_service_schools
        WHERE educational_district=?
        LIMIT 1",[$exact]);
      if($row) return _ssv_norm($row['title']);
    }
    $rows=Db::all("SELECT educational_district AS title
      FROM school_service_schools
      WHERE educational_district IS NOT NULL AND TRIM(educational_district)<>''
      GROUP BY educational_district
      ORDER BY educational_district");
    foreach($rows as $row){
      if(_ssv_district_normalized($row['title']??'')===$normalized) return _ssv_norm($row['title']);
    }
  }catch(Throwable $e){}
  return _ssv_norm($s);
}
function _ssv_district_sql($column){
  $e="TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE($column,'۰','0'),'۱','1'),'۲','2'),'۳','3'),'۴','4'),'۵','5'),'۶','6'),'۷','7'),'۸','8'),'۹','9'),'٠','0'),'١','1'),'٢','2'),'٣','3'),'٤','4'),'٥','5'),'٦','6'),'٧','7'),'٨','8'),'٩','9'))";
  $e="REPLACE(REPLACE(REPLACE($e,'ناحیه',''),'منطقه',''),' ','')";
  return $e;
}
function _ssv_valid_district($title){
  $normalized=_ssv_district_normalized($title);
  if($normalized==='') return false;
  try{
    $row=Db::one("SELECT educational_district AS title
      FROM school_service_schools
      WHERE educational_district IS NOT NULL AND TRIM(educational_district)<>''
        AND educational_district=?
      LIMIT 1",[_ssv_norm($title)]);
    if($row) return true;
    $rows=Db::all("SELECT educational_district AS title
      FROM school_service_schools
      WHERE educational_district IS NOT NULL AND TRIM(educational_district)<>''
      GROUP BY educational_district");
    foreach($rows as $r){
      if(_ssv_district_normalized($r['title']??'')===$normalized) return true;
    }
  }catch(Throwable $e){}
  return false;
}
function _ssv_passengers($b){$front=max(0,(int)($b['passenger_front_count']??$b['front_passenger_count']??0));$rear=max(0,(int)($b['passenger_rear_count']??$b['rear_passenger_count']??0));return [$front,$rear,$front+$rear];}
function _ssv_plate($b){
  $a=preg_replace('/\D/','',_ssv_en($b['plate_three']??''));
  $c=preg_replace('/\D/','',_ssv_en($b['plate_two']??''));
  $r=preg_replace('/\D/','',_ssv_en($b['plate_region_code']??''));
  $l=_ssv_norm($b['plate_letter']??'');
  $allowed=['ب','ج','د','س','ص','ط','ق','ل','م','ن','و','هـ','ی','ت','ع','ک','الف','پ','ث','ش','ز','ف','گ','ژ'];
  if($a!==''&&strlen($a)!==3)Http::error('بخش سه‌رقمی پلاک باید دقیقاً ۳ رقم باشد',422);
  if($c!==''&&strlen($c)!==2)Http::error('بخش دورقمی پلاک باید دقیقاً ۲ رقم باشد',422);
  if($r!==''&&strlen($r)!==2)Http::error('کد منطقه‌ای پلاک باید دقیقاً ۲ رقم باشد',422);
  if($l!==''&&!in_array($l,$allowed,true))Http::error('حرف انتخاب‌شده برای پلاک معتبر نیست.',422);
  return [$a?:null,$l?:null,$c?:null,$r?:null];
}
function _ssv_xlsx_rows($file){
  if(!class_exists('ZipArchive')) Http::error('امکان خواندن فایل Excel روی سرور فعال نیست.',500);
  if(!$file||($file['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK) Http::error('فایل Excel دریافت نشد.',422);
  $z=new ZipArchive();if($z->open($file['tmp_name'])!==true)Http::error('فایل Excel معتبر نیست.',422);
  $shared=[];$sx=$z->getFromName('xl/sharedStrings.xml');
  if($sx!==false){$xml=@simplexml_load_string($sx);if($xml)foreach($xml->si as $si){$t='';foreach($si->xpath('.//t') as $x)$t.=(string)$x;$shared[]=$t;}}
  $wb=@simplexml_load_string((string)$z->getFromName('xl/workbook.xml'));$rels=@simplexml_load_string((string)$z->getFromName('xl/_rels/workbook.xml.rels'));
  $sheets=[];
  if($wb){$ns=$wb->getDocNamespaces(true);$wb->registerXPathNamespace('m',$ns['']??'http://schemas.openxmlformats.org/spreadsheetml/2006/main');$relsNs=$rels?$rels->getDocNamespaces(true):[];$rels->registerXPathNamespace('r',$relsNs['']??'http://schemas.openxmlformats.org/package/2006/relationships');$relsMap=[];if($rels)foreach($rels->Relationship as $rr)$relsMap[(string)$rr['Id']]=(string)$rr['Target'];foreach($wb->xpath('//m:sheets/m:sheet') as $sh){$rid=(string)$sh->attributes('http://schemas.openxmlformats.org/officeDocument/2006/relationships')['id'];$target=$relsMap[$rid]??'';$target=ltrim($target,'/');if(strpos($target,'xl/')!==0)$target='xl/'.$target;$sheets[]=[(string)$sh['name'],$target];}}
  $out=[];
  foreach($sheets as [$name,$path]){
    $xml=@simplexml_load_string((string)$z->getFromName($path));if(!$xml)continue;$ns=$xml->getDocNamespaces(true);$xml->registerXPathNamespace('m',$ns['']??'http://schemas.openxmlformats.org/spreadsheetml/2006/main');$rows=[];
    foreach($xml->xpath('//m:sheetData/m:row') as $row){$cells=[];foreach($row->c as $cell){$ref=(string)$cell['r'];preg_match('/([A-Z]+)\d+/',$ref,$mm);$col=0;foreach(str_split($mm[1]??'A') as $ch)$col=$col*26+(ord($ch)-64);$v=(string)$cell->v;if((string)$cell['t']==='s')$v=$shared[(int)$v]??'';elseif((string)$cell['t']==='inlineStr')$v=implode('',array_map('strval',$cell->is->t??[]));$cells[$col]=$v;}if($cells)$rows[]=$cells;}
    $out[$name]=$rows;
  }
  $z->close();return $out;
}
function _ssv_sheet_records($rows){
  if(count($rows)<2)return [];
  $h=$rows[0];$map=[];foreach($h as $i=>$v)$map[_ssv_norm($v)]=$i;
  $aliases=[
    'code'=>['کد مدرسه','شناسه مدرسه','کد'],
    'school'=>['نام مدرسه','مدرسه'],
    'district'=>['ناحیه آموزشی','ناحیه','منطقه آموزشی'],
    'gender'=>['نوع مدرسه','جنسیت مدرسه','جنسیت'],
    'company'=>['شرکت مجری سرویس دانش‌آموزی','شرکت مجری','شرکت سرویس‌دهنده','شرکت'],
    'manager'=>['مدیر شرکت','مدیرعامل','نام مدیر'],
    'manager_mobile'=>['تلفن همراه مدیرعامل','موبایل مدیرعامل','موبایل مدیر','موبایل'],
    'landline'=>['تلفن ثابت','تلفن شرکت','تلفن'],
    'phone'=>['تلفن شرکت','شماره تماس','موبایل'],
    'address'=>['آدرس','نشانی'],
    'latitude'=>['عرض جغرافیایی','latitude','lat'],
    'longitude'=>['طول جغرافیایی','longitude','lng'],
    'registered_school_count'=>['مدارس ثبت‌شده','تعداد مدارس ثبت‌شده'],
    'representative_count'=>['تعداد نمایندگان','نمایندگان'],
    'status'=>['وضعیت شرکت','وضعیت'],
    'profile_complete'=>['تکمیل پروفایل','وضعیت تکمیل پروفایل']
  ];
  $find=function($key)use($map,$aliases){foreach($aliases[$key]??[] as $a){$a=_ssv_norm($a);if(array_key_exists($a,$map))return $map[$a];}return null;};
  $idx=[];foreach(array_keys($aliases) as $k)$idx[$k]=$find($k);$out=[];
  for($r=1;$r<count($rows);$r++){ $x=$rows[$r];$get=fn($k)=>$idx[$k]===null?'':trim((string)($x[$idx[$k]]??''));$school=$get('school');$company=$get('company');if(in_array($company,['نامشخص','نامعلوم','-','—'],true))$company='';if($school===''&&$company==='')continue;$out[]=['code'=>$get('code'),'school'=>$school,'district'=>$get('district'),'gender'=>$get('gender'),'company'=>$company,'manager'=>$get('manager'),'manager_mobile'=>$get('manager_mobile'),'landline'=>$get('landline'),'phone'=>$get('phone'),'address'=>$get('address'),'latitude'=>$get('latitude'),'longitude'=>$get('longitude'),'registered_school_count'=>$get('registered_school_count'),'representative_count'=>$get('representative_count'),'status'=>$get('status'),'profile_complete'=>$get('profile_complete')];}
  return $out;
}


route('POST','/api/school-service/companies',function($p,$b,$u){_ssv_need($u,'edit');_ssv_tables();$name=_ssv_norm($b['name']??'');if($name==='')Http::error('نام شرکت الزامی است',422);if(Db::one("SELECT id FROM school_service_companies WHERE name=?",[$name]))Http::error('این شرکت قبلاً ثبت شده است',409);Db::run("INSERT INTO school_service_companies(name,manager_name,phone,address,manager_mobile,landline_phone,latitude,longitude,registered_school_count,representative_count,status,profile_complete) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",[$name,_ssv_norm($b['manager_name']??'')?:null,trim($b['phone']??'')?:null,_ssv_norm($b['address']??'')?:null,trim($b['manager_mobile']??'')?:null,trim($b['landline_phone']??'')?:null,isset($b['latitude'])&&$b['latitude']!==''?(float)$b['latitude']:null,isset($b['longitude'])&&$b['longitude']!==''?(float)$b['longitude']:null,max(0,(int)($b['registered_school_count']??0)),max(0,(int)($b['representative_count']??0)),_ssv_norm($b['status']??'فعال')?:'فعال',!empty($b['profile_complete'])?1:0]);return ['ok'=>true,'id'=>(int)Db::pdo()->lastInsertId()];});
route('PUT','/api/school-service/companies/{id}',function($p,$b,$u){_ssv_need($u,'edit');_ssv_tables();$id=(int)$p['id'];if(!Db::one("SELECT id FROM school_service_companies WHERE id=?",[$id]))Http::error('شرکت یافت نشد',404);$name=_ssv_norm($b['name']??'');if($name==='')Http::error('نام شرکت الزامی است',422);Db::run("UPDATE school_service_companies SET name=?,manager_name=?,phone=?,address=?,manager_mobile=?,landline_phone=?,latitude=?,longitude=?,registered_school_count=?,representative_count=?,status=?,profile_complete=?,is_active=? WHERE id=?",[$name,_ssv_norm($b['manager_name']??'')?:null,trim($b['phone']??'')?:null,_ssv_norm($b['address']??'')?:null,trim($b['manager_mobile']??'')?:null,trim($b['landline_phone']??'')?:null,$b['latitude']!==''&&isset($b['latitude'])?(float)$b['latitude']:null,$b['longitude']!==''&&isset($b['longitude'])?(float)$b['longitude']:null,max(0,(int)($b['registered_school_count']??0)),max(0,(int)($b['representative_count']??0)),_ssv_norm($b['status']??'فعال')?:'فعال',!empty($b['profile_complete'])?1:0,isset($b['is_active'])?(int)!!$b['is_active']:1,$id]);return ['ok'=>true];});
route('DELETE','/api/school-service/companies/{id}',function($p,$b,$u){_ssv_need($u,'delete');_ssv_tables();$id=(int)$p['id'];Db::run("UPDATE school_service_companies SET is_active=0,status='غیرفعال' WHERE id=?",[$id]);return ['ok'=>true];});
route('POST','/api/school-service/schools',function($p,$b,$u){
  if(trim((string)($b['name']??''))===''){
    _ssv_need($u,'view');_ssv_tables();_ssv_autoseed_schools();
    $q=_ssv_norm($b['search']??$_GET['search']??'');$company=(int)($b['company_id']??$_GET['company_id']??0);$district=_ssv_district_key($b['district']??$_GET['district']??'');$w=['s.is_active=1'];$args=[];
    if($q!==''){$w[]='(s.name LIKE ? OR s.code LIKE ?)';$args[]='%'.$q.'%';$args[]='%'.$q.'%';}
    if($company){$w[]='EXISTS(SELECT 1 FROM school_service_school_companies x WHERE x.school_id=s.id AND x.company_id=?)';$args[]=$company;}
    if($district!==''){$w[]=_ssv_district_sql('s.educational_district').'=?';$args[]=_ssv_district_normalized($district);}
    $where=implode(' AND ',$w);
    return ['items'=>Db::all("SELECT s.id,s.code,s.name,s.educational_district,s.gender,s.address,s.latitude,s.longitude,s.location_registered_at,(SELECT scx.company_id FROM school_service_school_companies scx WHERE scx.school_id=s.id ORDER BY scx.is_primary DESC,scx.company_id ASC LIMIT 1) company_id,GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', ') company_names FROM school_service_schools s LEFT JOIN school_service_school_companies sc ON sc.school_id=s.id LEFT JOIN school_service_companies c ON c.id=sc.company_id WHERE $where GROUP BY s.id ORDER BY s.name LIMIT 500",$args)];
  }
  _ssv_need($u,'create');_ssv_tables();$name=_ssv_norm($b['name']??'');if($name==='')Http::error('نام مدرسه الزامی است',422);$district=_ssv_district_key($b['educational_district']??'');if($district===''||!_ssv_valid_district($district))Http::error('ناحیه آموزشی انتخاب‌شده معتبر یا فعال نیست.',422);$g=in_array($b['gender']??'',['دخترانه','پسرانه'],true)?$b['gender']:'نامشخص';$cid=!empty($b['company_id'])?(int)$b['company_id']:0;if($cid&&!Db::one("SELECT id FROM school_service_companies WHERE id=? AND is_active=1",[$cid]))Http::error('شرکت مجری نامعتبر است',422);[$lat,$lng]=validGeo($b['latitude']??null,$b['longitude']??null);Db::run("INSERT INTO school_service_schools(code,name,educational_district,gender,address,latitude,longitude,location_registered_at) VALUES(?,?,?,?,?,?,?,?)",[_ssv_norm($b['code']??'')?:null,$name,$district?:null,$g,_ssv_norm($b['address']??'')?:null,$lat,$lng,($lat!==null&&$lng!==null)?date('Y-m-d H:i:s'):null]);$sid=(int)Db::pdo()->lastInsertId();if($cid)Db::run("INSERT INTO school_service_school_companies(school_id,company_id,is_primary) VALUES(?,?,1)",[$sid,$cid]);return ['ok'=>true,'id'=>$sid];
});
route('PUT','/api/school-service/schools/{id}',function($p,$b,$u){
  _ssv_need($u,'edit');_ssv_tables();$id=(int)$p['id'];$existing=Db::one("SELECT * FROM school_service_schools WHERE id=?",[$id]);if(!$existing)Http::error('مدرسه یافت نشد',404);
  $name=_ssv_norm($b['name']??$existing['name']);if($name==='')Http::error('نام مدرسه الزامی است',422);$g=in_array($b['gender']??$existing['gender'],['دخترانه','پسرانه'],true)?$b['gender']:($existing['gender']?:'نامشخص');
  $code=array_key_exists('code',$b)?(_ssv_norm($b['code'])?:null):$existing['code'];$district=array_key_exists('educational_district',$b)?(_ssv_district_key($b['educational_district'])?:null):_ssv_district_key($existing['educational_district']);if($district===null||!_ssv_valid_district($district))Http::error('ناحیه آموزشی انتخاب‌شده معتبر یا فعال نیست.',422);$address=array_key_exists('address',$b)?(_ssv_norm($b['address'])?:null):$existing['address'];
  if(array_key_exists('latitude',$b)||array_key_exists('longitude',$b)){[$lat,$lng]=validGeo($b['latitude']??null,$b['longitude']??null);Db::run("UPDATE school_service_schools SET code=?,name=?,educational_district=?,gender=?,address=?,latitude=?,longitude=?,location_registered_at=? WHERE id=?",[$code,$name,$district,$g,$address,$lat,$lng,($lat!==null&&$lng!==null)?date('Y-m-d H:i:s'):null,$id]);}
  else Db::run("UPDATE school_service_schools SET code=?,name=?,educational_district=?,gender=?,address=? WHERE id=?",[$code,$name,$district,$g,$address,$id]);
  if(array_key_exists('company_id',$b)){Db::run("DELETE FROM school_service_school_companies WHERE school_id=?",[$id]);$cid=(int)$b['company_id'];if($cid){if(!Db::one("SELECT id FROM school_service_companies WHERE id=? AND is_active=1",[$cid]))Http::error('شرکت مجری نامعتبر است',422);Db::run("INSERT INTO school_service_school_companies(school_id,company_id,is_primary) VALUES(?,?,1)",[$id,$cid]);}}
  return ['ok'=>true,'id'=>$id];
});
route('DELETE','/api/school-service/schools/{id}',function($p,$b,$u){_ssv_need($u,'delete');_ssv_tables();Db::run("UPDATE school_service_schools SET is_active=0 WHERE id=?",[(int)$p['id']]);return ['ok'=>true];});
route('GET','/api/school-service/access',function($p,$b,$u){_ssv_tables();return ['allowed'=>_ssv_perm($u,'view'),'can_create'=>_ssv_perm($u,'create'),'can_edit'=>_ssv_perm($u,'edit'),'can_delete'=>_ssv_perm($u,'delete'),'can_import'=>_ssv_perm($u,'import'),'can_report'=>_ssv_perm($u,'report')];});
route('GET','/api/school-service/bootstrap',function($p,$b,$u){
  _ssv_need($u,'view'); _ssv_tables(); _ssv_autoseed_schools();
  $districtRows=Db::all("SELECT DISTINCT TRIM(educational_district) AS title FROM school_service_schools WHERE is_active=1 AND educational_district IS NOT NULL AND TRIM(educational_district)<>'' ORDER BY title");
  $districts=[]; foreach($districtRows as $row){$title=_ssv_norm($row['title']??'');if($title!==''&&!in_array($title,$districts,true))$districts[]=$title;}
  $meta=[
    'districts'=>$districts,
    'genders'=>['دخترانه','پسرانه','نامشخص'],
    'driver_genders'=>['خانم','آقا','نامشخص'],
    'vehicle_types'=>array_column(Db::all("SELECT title FROM school_service_vehicle_types WHERE is_active=1 ORDER BY sort_order,id"),'title'),
    'vehicle_colors'=>array_column(Db::all("SELECT title FROM school_service_vehicle_colors WHERE is_active=1 ORDER BY sort_order,id"),'title'),
    'violations'=>Db::all("SELECT id,title FROM school_service_violation_types WHERE is_active=1 ORDER BY sort_order,id")
  ];
  $companies=Db::all("SELECT c.id,c.name,c.manager_name,c.manager_mobile,c.landline_phone,c.phone,c.address,c.latitude,c.longitude,c.registered_school_count,c.representative_count,c.status,c.profile_complete,c.is_active,COUNT(DISTINCT sc.school_id) school_count FROM school_service_companies c LEFT JOIN school_service_school_companies sc ON sc.company_id=c.id WHERE c.is_active=1 GROUP BY c.id ORDER BY c.name");
  $schools=Db::all("SELECT s.id,s.code,s.name,s.educational_district,s.gender,s.address,s.latitude,s.longitude,s.location_registered_at,(SELECT scx.company_id FROM school_service_school_companies scx WHERE scx.school_id=s.id ORDER BY scx.is_primary DESC,scx.company_id ASC LIMIT 1) company_id,GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', ') company_names FROM school_service_schools s LEFT JOIN school_service_school_companies sc ON sc.school_id=s.id LEFT JOIN school_service_companies c ON c.id=sc.company_id WHERE s.is_active=1 GROUP BY s.id ORDER BY s.name");
  return ['version'=>1,'generated_at'=>date('c'),'meta'=>$meta,'companies'=>$companies,'schools'=>$schools,'counts'=>['districts'=>count($districts),'companies'=>count($companies),'schools'=>count($schools)]];
});
// Canonical school-service dashboard route; this definition runs before routes_extra.php.
route('GET','/api/school-service/dashboard',function($p,$b,$u){
 _ssv_need($u,'view');_ssv_tables();_ssv_autoseed_schools();
 $district=_ssv_district_key($_GET['district']??'');$company=(int)($_GET['company_id']??0);$w=['1=1'];$a=[];
 if($district!==''){$w[]=_ssv_district_sql('i.educational_district').'=?';$a[]=$district;}
 if($company){$w[]='i.company_id=?';$a[]=$company;}
 $where=implode(' AND ',$w);
 $activeSchools=(int)(Db::one("SELECT COUNT(*) n FROM school_service_schools WHERE is_active=1")['n']??0);
 $studentTotal=(int)(Db::one("SELECT COALESCE(SUM(student_count),0) n FROM school_service_schools WHERE is_active=1")['n']??0);
 $activeCompanies=(int)(Db::one("SELECT COUNT(*) n FROM school_service_companies WHERE is_active=1")['n']??0);
 $activeVehicles=(int)(Db::one("SELECT COUNT(*) n FROM school_service_vehicles WHERE is_active=1")['n']??0);
 $inspections=(int)(Db::one("SELECT COUNT(*) n FROM school_service_inspections i WHERE $where",$a)['n']??0);
 $inspections30=(int)(Db::one("SELECT COUNT(*) n FROM school_service_inspections i WHERE i.created_at>=DATE_SUB(NOW(),INTERVAL 30 DAY) AND $where",$a)['n']??0);
 $violations=(int)(Db::one("SELECT COUNT(*) n FROM school_service_inspection_violations x JOIN school_service_inspections i ON i.id=x.inspection_id JOIN school_service_violation_types v ON v.id=x.violation_type_id WHERE $where AND v.is_active=1",$a)['n']??0);
 $invalidCert=(int)(Db::one("SELECT COUNT(*) n FROM school_service_inspections i WHERE i.certificate_status IN ('نامعتبر','ارائه نشد') AND $where",$a)['n']??0);
 $avgViol=$inspections>0?round($violations/$inspections,2):0;
 $byDistrict=Db::all("SELECT COALESCE(NULLIF(TRIM(i.educational_district),''),'نامشخص') label,COUNT(*) n FROM school_service_inspections i WHERE $where GROUP BY i.educational_district ORDER BY n DESC",$a);
 $byCompany=Db::all("SELECT COALESCE(NULLIF(TRIM(c.name),''),'نامشخص') label,COUNT(i.id) n FROM school_service_inspections i LEFT JOIN school_service_companies c ON c.id=i.company_id WHERE $where GROUP BY c.id,c.name ORDER BY n DESC LIMIT 12",$a);
 $byViolation=Db::all("SELECT COALESCE(NULLIF(TRIM(v.title),''),'نامشخص') label,COUNT(iv.inspection_id) n FROM school_service_inspection_violations iv JOIN school_service_violation_types v ON v.id=iv.violation_type_id JOIN school_service_inspections i ON i.id=iv.inspection_id WHERE $where AND v.is_active=1 GROUP BY v.id,v.title ORDER BY n DESC LIMIT 20",$a);
 $byViolation=array_values(array_filter($byViolation,function($row){return !_ssv_is_certificate_violation_title($row['label']??'');}));
 $bySchool=Db::all("SELECT COALESCE(NULLIF(TRIM(s.name),''),'نامشخص') label,COUNT(i.id) n FROM school_service_inspections i LEFT JOIN school_service_schools s ON s.id=i.school_id WHERE $where GROUP BY s.id,s.name ORDER BY n DESC LIMIT 12",$a);
 $vehicleTypes=Db::all("SELECT COALESCE(NULLIF(TRIM(vehicle_type),''),'نامشخص') label,COUNT(*) n FROM school_service_vehicles WHERE is_active=1 GROUP BY vehicle_type ORDER BY n DESC LIMIT 10");
 $certificates=Db::all("SELECT i.certificate_status label,COUNT(*) n FROM school_service_inspections i WHERE $where GROUP BY i.certificate_status ORDER BY n DESC",$a);
 // بازهٔ نمودار بر اساس ماه شمسی جاری تعیین می‌شود، نه ماه میلادی.
 $today=new DateTimeImmutable('today');
 $jalaliParts=function(DateTimeImmutable $date){
   $gy=(int)$date->format('Y');$gm=(int)$date->format('n');$gd=(int)$date->format('j');
   $gdm=[0,31,59,90,120,151,181,212,243,273,304,334];
   if($gy>1600){$jy=979;$gy-=1600;}else{$jy=0;$gy-=621;}
   $gy2=$gm>2?$gy+1:$gy;
   $days=365*$gy+(int)floor(($gy2+3)/4)-(int)floor(($gy2+99)/100)+(int)floor(($gy2+399)/400)-80+$gd+$gdm[$gm-1];
   $jy+=33*(int)floor($days/12053);$days%=12053;
   $jy+=4*(int)floor($days/1461);$days%=1461;
   if($days>365){$jy+=(int)floor(($days-1)/365);$days=($days-1)%365;}
   $jm=$days<186?1+(int)floor($days/31):7+(int)floor(($days-186)/30);
   $jd=1+($days<186?$days%31:($days-186)%30);
   return [$jy,$jm,$jd];
 };
 [$currentJYear,$currentJMonth]=$jalaliParts($today);
 $monthStart=$today;
 for($step=0;$step<31;$step++){
   $prev=$monthStart->modify('-1 day');[$py,$pm]=$jalaliParts($prev);
   if($py!==$currentJYear||$pm!==$currentJMonth)break;
   $monthStart=$prev;
 }
 $monthEnd=$today;
 for($step=0;$step<31;$step++){
   $next=$monthEnd->modify('+1 day');[$ny,$nm]=$jalaliParts($next);
   if($ny!==$currentJYear||$nm!==$currentJMonth)break;
   $monthEnd=$next;
 }
 $trendRows=Db::all("SELECT DATE(i.created_at) day_key,COUNT(*) n FROM school_service_inspections i WHERE i.created_at>=? AND i.created_at<? AND $where GROUP BY DATE(i.created_at) ORDER BY day_key ASC",array_merge([$monthStart->format('Y-m-d 00:00:00'),$monthEnd->modify('+1 day')->format('Y-m-d 00:00:00')],$a));
 $trendCounts=[];
 foreach($trendRows as $tr){$trendCounts[(string)$tr['day_key']]=(int)$tr['n'];}
 $trend=[];
 for($day=$monthStart;$day<=$monthEnd;$day=$day->modify('+1 day')){
   $key=$day->format('Y-m-d');
   $trend[]=['ym'=>$key,'n'=>$trendCounts[$key]??0];
 }
 $districtSchools=Db::all("SELECT COALESCE(NULLIF(TRIM(educational_district),''),'نامشخص') label,COUNT(*) n,COALESCE(SUM(student_count),0) students FROM school_service_schools WHERE is_active=1 GROUP BY educational_district ORDER BY n DESC");
 $activeInspectors=[];$activeInspectorCount=0;
 // در دیتابیس‌های قدیمی شناسهٔ ثبت‌کننده ممکن است با نام دیگری ذخیره شده باشد؛ ستون موجود را از خود schema تشخیص بده.
 $inspectionColumns=[];
 try{foreach(Db::all("SHOW COLUMNS FROM school_service_inspections") as $column){$field=(string)($column['Field']??$column['field']??'');if($field!=='')$inspectionColumns[$field]=true;}}catch(Throwable $e){error_log('School service inspector schema inspection failed: '.$e->getMessage());}
 $inspectorFields=[];
 foreach(['inspector_user_id','inspector_id','user_id','created_by_user_id','created_by'] as $field){if(isset($inspectionColumns[$field]))$inspectorFields[]='NULLIF(i.`'.$field.'`,0)';}
 $inspectorExpr=count($inspectorFields)?'COALESCE('.implode(',',$inspectorFields).')':'NULL';
 if($inspectorExpr!=='NULL'){
   try{
     $activeInspectorCount=(int)(Db::one("SELECT COUNT(DISTINCT $inspectorExpr) n FROM school_service_inspections i WHERE $inspectorExpr IS NOT NULL AND i.created_at>=DATE_SUB(NOW(),INTERVAL 30 DAY) AND $where",$a)['n']??0);
   }catch(Throwable $e){error_log('School service active inspector count failed: '.$e->getMessage());}
   try{
     $activeInspectors=Db::all("SELECT $inspectorExpr id,
       COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))),''),CONCAT('بازرس #',$inspectorExpr)) name,
       COALESCE(r.title,'') role_title,COUNT(*) inspection_count,
       SUM(CASE WHEN i.created_at>=DATE_SUB(NOW(),INTERVAL 30 DAY) THEN 1 ELSE 0 END) inspection_count_30d
       FROM school_service_inspections i
       LEFT JOIN users u ON u.id=$inspectorExpr
       LEFT JOIN roles r ON r.id=u.role_id
       WHERE $inspectorExpr IS NOT NULL AND i.created_at>=DATE_SUB(NOW(),INTERVAL 30 DAY) AND $where
       GROUP BY $inspectorExpr,u.first_name,u.last_name,r.title
       ORDER BY inspection_count_30d DESC,inspection_count DESC,name ASC",$a);
     if(!$activeInspectorCount)$activeInspectorCount=count($activeInspectors);
   }catch(Throwable $e){$activeInspectors=[];error_log('School service active inspector list failed: '.$e->getMessage());}
 }
 return ['cards'=>['active_schools'=>$activeSchools,'students'=>$studentTotal,'active_companies'=>$activeCompanies,'active_vehicles'=>$activeVehicles,'inspections'=>$inspections,'inspections_30d'=>$inspections30,'active_inspectors'=>$activeInspectorCount,'violations'=>$violations,'invalid_certificates'=>$invalidCert,'avg_violations_per_inspection'=>$avgViol],
   'by_district'=>$byDistrict,'by_company'=>$byCompany,'by_violation'=>$byViolation,'by_school'=>$bySchool,'vehicle_types'=>$vehicleTypes,'certificates'=>$certificates,'trend'=>$trend,'district_schools'=>$districtSchools,'active_inspectors'=>$activeInspectors,'generated_at'=>date('Y-m-d H:i:s')];
});
route('GET','/api/school-service/meta',function($p,$b,$u){
  _ssv_need($u,'view'); _ssv_tables();
  // فهرست نواحی از خود دادهٔ مدارس خوانده می‌شود؛ جدول تنظیمات فقط تنظیمات
  // کمکی است و نباید باعث حذف نواحی واقعی موجود در school_service_schools شود.
  $districtRows=Db::all("SELECT DISTINCT TRIM(educational_district) AS title
    FROM school_service_schools
    WHERE is_active=1
      AND educational_district IS NOT NULL
      AND TRIM(educational_district)<>''
    ORDER BY title");
  $districts=[];
  foreach($districtRows as $row){
    $title=_ssv_norm($row['title']??'');
    if($title!=='' && !in_array($title,$districts,true)) $districts[]=$title;
  }
  return [
    'districts'=>$districts,
    'genders'=>['دخترانه','پسرانه','نامشخص'],
    'driver_genders'=>['خانم','آقا','نامشخص'],
    'vehicle_types'=>array_column(Db::all("SELECT title FROM school_service_vehicle_types WHERE is_active=1 ORDER BY sort_order,id"),'title'),
    'vehicle_colors'=>array_column(Db::all("SELECT title FROM school_service_vehicle_colors WHERE is_active=1 ORDER BY sort_order,id"),'title'),
    'violations'=>Db::all("SELECT id,title FROM school_service_violation_types WHERE is_active=1 ORDER BY sort_order,id")
  ];
});
route('GET','/api/school-service/companies',function($p,$b,$u){_ssv_need($u,'view');_ssv_tables();$q=_ssv_norm($_GET['search']??'');$page=max(1,(int)($_GET['page']??1));$limit=max(1,min(500,(int)($_GET['limit']??500)));$where=$q!==''?'WHERE c.is_active=1 AND c.name LIKE ?':'WHERE c.is_active=1';$args=$q!==''?['%'.$q.'%']:[];$total=(int)(Db::one("SELECT COUNT(*) n FROM school_service_companies c $where",$args)['n']??0);$offset=($page-1)*$limit;$items=Db::all("SELECT c.id,c.name,c.manager_name,c.manager_mobile,c.landline_phone,c.phone,c.address,c.latitude,c.longitude,c.registered_school_count,c.representative_count,c.status,c.profile_complete,c.is_active,COUNT(DISTINCT sc.school_id) school_count FROM school_service_companies c LEFT JOIN school_service_school_companies sc ON sc.company_id=c.id $where GROUP BY c.id ORDER BY c.name LIMIT $limit OFFSET $offset",$args);return ['items'=>$items,'page'=>$page,'limit'=>$limit,'total'=>$total,'pages'=>max(1,(int)ceil($total/$limit))];});
route('GET','/api/school-service/schools',function($p,$b,$u){_ssv_need($u,'view');_ssv_tables();_ssv_autoseed_schools();$q=_ssv_norm($_GET['search']??'');$company=(int)($_GET['company_id']??0);$district=_ssv_district_key($_GET['district']??'');$page=max(1,(int)($_GET['page']??1));$limit=max(1,min(500,(int)($_GET['limit']??500)));$c=['s.is_active=1'];$args=[];if($q!==''){$c[]='(s.name LIKE ? OR s.code LIKE ?)';$args[]='%'.$q.'%';$args[]='%'.$q.'%';}if($company){$c[]='EXISTS(SELECT 1 FROM school_service_school_companies x WHERE x.school_id=s.id AND x.company_id=?)';$args[]=$company;}if($district!==''){$c[]=_ssv_district_sql('s.educational_district').'=?';$args[]=_ssv_district_normalized($district);}$where=implode(' AND ',$c);$total=(int)(Db::one("SELECT COUNT(*) n FROM school_service_schools s WHERE $where",$args)['n']??0);$offset=($page-1)*$limit;$items=Db::all("SELECT s.id,s.code,s.name,s.educational_district,s.gender,s.address,s.latitude,s.longitude,s.location_registered_at,(SELECT scx.company_id FROM school_service_school_companies scx WHERE scx.school_id=s.id ORDER BY scx.is_primary DESC,scx.company_id ASC LIMIT 1) company_id,GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', ') company_names FROM school_service_schools s LEFT JOIN school_service_school_companies sc ON sc.school_id=s.id LEFT JOIN school_service_companies c ON c.id=sc.company_id WHERE $where GROUP BY s.id ORDER BY s.name LIMIT $limit OFFSET $offset",$args);return ['items'=>$items,'page'=>$page,'limit'=>$limit,'total'=>$total,'pages'=>max(1,(int)ceil($total/$limit))];});
function _ssv_sync_vehicle_from_inspection($id){
  _ssv_tables(); $id=(int)$id; if($id<=0)return;
  $r=Db::one("SELECT plate_two,plate_letter,plate_three,plate_region_code,vehicle_type,vehicle_color,passenger_front_count,passenger_rear_count,driver_gender,certificate_status,created_at FROM school_service_inspections WHERE id=?",[$id]);
  if(!$r || trim((string)$r['plate_two'])==='' || trim((string)$r['plate_three'])==='' || trim((string)$r['plate_letter'])==='' || trim((string)$r['plate_region_code'])==='') return;
  Db::run("INSERT INTO school_service_vehicles(plate_two,plate_letter,plate_three,plate_region_code,vehicle_type,vehicle_color,passenger_front_count,passenger_rear_count,driver_gender,certificate_status,last_inspection_id,last_inspection_at,is_active)
    VALUES(?,?,?,?,?,?,?,?,?,?,?, ?,1)
    ON DUPLICATE KEY UPDATE vehicle_type=VALUES(vehicle_type),vehicle_color=VALUES(vehicle_color),passenger_front_count=VALUES(passenger_front_count),passenger_rear_count=VALUES(passenger_rear_count),driver_gender=VALUES(driver_gender),certificate_status=VALUES(certificate_status),last_inspection_id=VALUES(last_inspection_id),last_inspection_at=VALUES(last_inspection_at),is_active=1",
    [$r['plate_two'],$r['plate_letter'],$r['plate_three'],$r['plate_region_code'],$r['vehicle_type'],$r['vehicle_color'],(int)$r['passenger_front_count'],(int)$r['passenger_rear_count'],$r['driver_gender'],$r['certificate_status'],$id,$r['created_at']]);
}
function _ssv_backfill_vehicles(){
  _ssv_tables();
  try{
    $rows=Db::all("SELECT i.id,i.plate_two,i.plate_letter,i.plate_three,i.plate_region_code,i.vehicle_type,i.vehicle_color,i.passenger_front_count,i.passenger_rear_count,i.driver_gender,i.certificate_status,i.created_at
      FROM school_service_inspections i
      INNER JOIN (SELECT plate_two,plate_letter,plate_three,plate_region_code,MAX(id) max_id FROM school_service_inspections GROUP BY plate_two,plate_letter,plate_three,plate_region_code) z ON z.max_id=i.id
      WHERE COALESCE(i.plate_two,'')<>'' AND COALESCE(i.plate_three,'')<>'' AND COALESCE(i.plate_letter,'')<>'' AND COALESCE(i.plate_region_code,'')<>''");
    foreach($rows as $r){
      Db::run("INSERT INTO school_service_vehicles(plate_two,plate_letter,plate_three,plate_region_code,vehicle_type,vehicle_color,passenger_front_count,passenger_rear_count,driver_gender,certificate_status,last_inspection_id,last_inspection_at,is_active)
        VALUES(?,?,?,?,?,?,?,?,?,?,?, ?,1) ON DUPLICATE KEY UPDATE last_inspection_id=IF(COALESCE(last_inspection_id,0)<VALUES(last_inspection_id),VALUES(last_inspection_id),last_inspection_id),last_inspection_at=IF(COALESCE(last_inspection_id,0)<VALUES(last_inspection_id),VALUES(last_inspection_at),last_inspection_at),is_active=1",
        [$r['plate_two'],$r['plate_letter'],$r['plate_three'],$r['plate_region_code'],$r['vehicle_type'],$r['vehicle_color'],(int)$r['passenger_front_count'],(int)$r['passenger_rear_count'],$r['driver_gender'],$r['certificate_status'],(int)$r['id'],$r['created_at']]);
    }
  }catch(Throwable $e){error_log('school-service vehicle backfill: '.$e->getMessage());}
}

route('GET','/api/school-service/vehicles',function($p,$b,$u){
  _ssv_need($u,'view'); _ssv_backfill_vehicles();
  $q=_ssv_norm($_GET['search']??''); $page=max(1,(int)($_GET['page']??1)); $limit=max(1,min(200,(int)($_GET['limit']??50)));
  $where=['v.is_active=1'];$args=[];
  if($q!==''){ $where[]="CONCAT(v.plate_two,v.plate_letter,v.plate_three,v.plate_region_code) LIKE ? OR v.vehicle_type LIKE ? OR v.vehicle_color LIKE ?"; $args[]='%'.$q.'%';$args[]='%'.$q.'%';$args[]='%'.$q.'%'; }
  $w=implode(' AND ',$where);$total=(int)(Db::one("SELECT COUNT(*) n FROM school_service_vehicles v WHERE $w",$args)['n']??0);$off=($page-1)*$limit;
  $items=Db::all("SELECT v.*, (SELECT COUNT(*) FROM school_service_inspections i WHERE i.plate_two=v.plate_two AND i.plate_letter=v.plate_letter AND i.plate_three=v.plate_three AND i.plate_region_code=v.plate_region_code) inspection_count
    FROM school_service_vehicles v WHERE $w ORDER BY COALESCE(v.last_inspection_at,v.created_at) DESC LIMIT $limit OFFSET $off",$args);
  foreach($items as &$r){$r['plate']=$r['plate_two'].' '.$r['plate_letter'].' '.$r['plate_three'].' - ایران '.$r['plate_region_code'];}unset($r);
  return ['items'=>$items,'page'=>$page,'limit'=>$limit,'total'=>$total,'pages'=>max(1,(int)ceil($total/$limit))];
});
route('PUT','/api/school-service/vehicles/{id}',function($p,$b,$u){
  _ssv_need($u,'edit');_ssv_tables();$id=(int)$p['id'];$v=Db::one("SELECT * FROM school_service_vehicles WHERE id=?",[$id]);if(!$v)Http::error('خودرو یافت نشد.',404);
  $type=_ssv_norm($b['vehicle_type']??'');$color=_ssv_norm($b['vehicle_color']??'');
  if($type!==''&&!_ssv_valid_option('school_service_vehicle_types',$type)&&$type!=='سایر')Http::error('نوع خودرو معتبر نیست.',422);
  if($color!==''&&!_ssv_valid_option('school_service_vehicle_colors',$color)&&$color!=='سایر')Http::error('رنگ خودرو معتبر نیست.',422);
  $dg=in_array($b['driver_gender']??'', ['خانم','آقا','نامشخص'],true)?$b['driver_gender']:'نامشخص';
  $cert=in_array($b['certificate_status']??'', ['معتبر','نامعتبر','ارائه نشد'],true)?$b['certificate_status']:'ارائه نشد';
  $front=max(0,(int)($b['passenger_front_count']??0));$rear=max(0,(int)($b['passenger_rear_count']??0));
  Db::run("UPDATE school_service_vehicles SET vehicle_type=?,vehicle_color=?,passenger_front_count=?,passenger_rear_count=?,driver_gender=?,certificate_status=?,is_active=1 WHERE id=?",[$type?:null,$color?:null,$front,$rear,$dg,$cert,$id]);
  return ['ok'=>true,'id'=>$id];
});
route('DELETE','/api/school-service/vehicles/{id}',function($p,$b,$u){
  _ssv_need($u,'delete');_ssv_tables();$id=(int)$p['id'];if(!Db::one("SELECT id FROM school_service_vehicles WHERE id=?",[$id]))Http::error('خودرو یافت نشد.',404);Db::run("UPDATE school_service_vehicles SET is_active=0 WHERE id=?",[$id]);return ['ok'=>true];
});
route('GET','/api/school-service/vehicle-lookup',function($p,$b,$u){
  _ssv_need($u,'view'); _ssv_backfill_vehicles();
  $plateTwo=preg_replace('/\\D/','',_ssv_en($_GET['plate_two']??''));$plateThree=preg_replace('/\\D/','',_ssv_en($_GET['plate_three']??''));$region=preg_replace('/\\D/','',_ssv_en($_GET['plate_region_code']??''));$letter=_ssv_norm($_GET['plate_letter']??'');
  if(strlen($plateTwo)!==2||strlen($plateThree)!==3||strlen($region)!==2||$letter==='')Http::error('برای استعلام، پلاک را کامل وارد کنید.',422);
  $row=Db::one("SELECT v.* FROM school_service_vehicles v WHERE v.plate_two=? AND v.plate_three=? AND v.plate_letter=? AND v.plate_region_code=? AND v.is_active=1 LIMIT 1",[$plateTwo,$plateThree,$letter,$region]);
  if(!$row)return ['found'=>false,'vehicle'=>null,'history'=>[]];
  $history=Db::all("SELECT i.id,i.school_id,i.company_id,i.violation_date,i.violation_time,i.vehicle_type,i.vehicle_color,i.certificate_status,s.name school_name,c.name company_name FROM school_service_inspections i LEFT JOIN school_service_schools s ON s.id=i.school_id LEFT JOIN school_service_companies c ON c.id=i.company_id WHERE i.plate_two=? AND i.plate_three=? AND i.plate_letter=? AND i.plate_region_code=? ORDER BY i.id DESC LIMIT 20",[$plateTwo,$plateThree,$letter,$region]);
  foreach($history as &$h){$h['violations']=array_column(Db::all("SELECT v.title FROM school_service_inspection_violations x JOIN school_service_violation_types v ON v.id=x.violation_type_id WHERE x.inspection_id=?",[(int)$h['id']]),'title');}unset($h);
  return ['found'=>true,'vehicle'=>['id'=>(int)$row['id'],'plate_two'=>$row['plate_two'],'plate_letter'=>$row['plate_letter'],'plate_three'=>$row['plate_three'],'plate_region_code'=>$row['plate_region_code'],'vehicle_type'=>$row['vehicle_type'],'vehicle_color'=>$row['vehicle_color'],'passenger_front_count'=>$row['passenger_front_count'],'passenger_rear_count'=>$row['passenger_rear_count'],'driver_gender'=>$row['driver_gender'],'certificate_status'=>$row['certificate_status']],'last'=>$history[0]??null,'history'=>$history];
});
route('GET','/api/school-service/inspections',function($p,$b,$u){_ssv_need($u,'view');_ssv_tables();$c=['1=1'];$args=[];$q=_ssv_norm($_GET['search']??'');if($q!==''){$c[]='(s.name LIKE ? OR c.name LIKE ? OR i.location_text LIKE ? OR CONCAT(i.plate_three,i.plate_letter,i.plate_two) LIKE ?)';$args=array_merge($args,['%'.$q.'%','%'.$q.'%','%'.$q.'%','%'.$q.'%']);}if(!empty($_GET['company_id'])){$c[]='i.company_id=?';$args[]=(int)$_GET['company_id'];}if(!empty($_GET['district'])){$c[]=_ssv_district_sql('i.educational_district').'=?';$args[]=_ssv_district_normalized($_GET['district']);}if(!empty($_GET['mine'])){$c[]='i.inspector_user_id=?';$args[]=(int)$u['id'];}$where=implode(' AND ',$c);$rows=Db::all("SELECT i.*,s.name school_name,c.name company_name,TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) inspector_name FROM school_service_inspections i LEFT JOIN school_service_schools s ON s.id=i.school_id LEFT JOIN school_service_companies c ON c.id=i.company_id LEFT JOIN users u ON u.id=i.inspector_user_id WHERE $where ORDER BY i.id DESC LIMIT 1000",$args);foreach($rows as &$r){$r['plate']=trim(($r['plate_three']??'').' '.($r['plate_letter']??'').' '.($r['plate_two']??'').' ایران '.($r['plate_region_code']??''));$r['violations']=array_column(Db::all("SELECT v.title FROM school_service_inspection_violations x JOIN school_service_violation_types v ON v.id=x.violation_type_id WHERE x.inspection_id=?",[(int)$r['id']]),'title');}unset($r);return ['items'=>$rows];});
route('POST','/api/school-service/inspections',function($p,$b,$u){_ssv_need($u,'create');_ssv_tables();_ssv_require_inspection_core($b);$clientUuid=_ssv_norm($b['client_uuid']??'');if($clientUuid!==''){ $existing=Db::one("SELECT id FROM school_service_inspections WHERE client_uuid=?",[$clientUuid]);if($existing)return ['ok'=>true,'id'=>(int)$existing['id'],'duplicate'=>true]; }[$a,$l,$c,$r]=_ssv_plate($b);$schoolId=(int)($b['school_id']??0);$companyId=(int)($b['company_id']??0);if($schoolId&&!$companyId){$map=Db::one("SELECT company_id FROM school_service_school_companies WHERE school_id=? LIMIT 1",[$schoolId]);if($map)$companyId=(int)$map['company_id'];}$viol=$b['violation_ids']??[];if(is_string($viol))$viol=json_decode($viol,true)?:[];$viol=array_values(array_unique(array_map('intval',(array)$viol)));if(!$schoolId)$schoolId=null;if(!$companyId)$companyId=null;$district=_ssv_district_key($b['educational_district']??'');if($district===''||!_ssv_valid_district($district))Http::error('ناحیه آموزشی انتخاب‌شده معتبر یا فعال نیست.',422);$vehicleType=_ssv_norm($b['vehicle_type_custom']??'')?:_ssv_norm($b['vehicle_type']??'');$vehicleTypeCustom=!empty($b['vehicle_type_custom']);if($vehicleTypeCustom){if($vehicleType==='')Http::error('نوع خودرو سایر باید وارد شود.',422);if(mb_strlen($vehicleType)>100)Http::error('نوع خودرو واردشده بیش از حد مجاز است.',422);}elseif($vehicleType!==''&&!_ssv_valid_option('school_service_vehicle_types',$vehicleType))Http::error('نوع خودرو انتخاب‌شده معتبر یا فعال نیست.',422);$vehicleColor=_ssv_norm($b['vehicle_color_custom']??'')?:_ssv_norm($b['vehicle_color']??'');$vehicleColorCustom=!empty($b['vehicle_color_custom']);if($vehicleColorCustom){if($vehicleColor==='')Http::error('رنگ خودرو سایر باید وارد شود.',422);if(mb_strlen($vehicleColor)>80)Http::error('رنگ خودرو واردشده بیش از حد مجاز است.',422);}elseif($vehicleColor!==''&&!_ssv_valid_option('school_service_vehicle_colors',$vehicleColor))Http::error('رنگ خودرو انتخاب‌شده معتبر یا فعال نیست.',422);_ssv_school_company_validate($schoolId??0,$companyId??0,$district);$gender=in_array($b['school_gender']??'',['دخترانه','پسرانه','نامشخص'],true)?$b['school_gender']:'نامشخص';$dg=in_array($b['driver_gender']??'',['خانم','آقا','نامشخص'],true)?$b['driver_gender']:'نامشخص';$cert=in_array($b['certificate_status']??'',['معتبر','نامعتبر','ارائه نشد'],true)?$b['certificate_status']:'ارائه نشد';[$passFront,$passRear,$pass]=_ssv_passengers($b);$date=_ssv_en($b['violation_date']??'');$time=_ssv_en(trim((string)($b['violation_time']??'')));if($date!==''&&!preg_match('/^14\d{2}[\/-]\d{1,2}[\/-]\d{1,2}$/',$date))Http::error('تاریخ ثبت تخلف نامعتبر است.',422);if($time!==''&&!preg_match('/^(?:[01]?\d|2[0-3]):[0-5]\d$/',$time))Http::error('ساعت ثبت تخلف نامعتبر است.',422);$useSchoolLocation=!empty($b['use_school_location']);$locationText=_ssv_norm($b['location_text']??'')?:null;if($useSchoolLocation){if(!$schoolId)Http::error('برای استفاده از مکان مدرسه، ابتدا مدرسه را انتخاب کنید.',422);$schoolLoc=Db::one("SELECT latitude,longitude,address FROM school_service_schools WHERE id=? AND is_active=1",[$schoolId]);if(!$schoolLoc||$schoolLoc['latitude']===null||$schoolLoc['longitude']===null)Http::error('موقعیت این مدرسه ثبت نشده است؛ ابتدا موقعیت مدرسه را اصلاح یا ثبت کنید.',422);$lat=(float)$schoolLoc['latitude'];$lng=(float)$schoolLoc['longitude'];$locationText=_ssv_norm($schoolLoc['address']??'')?:'مکان مدرسه';}else{[$lat,$lng]=validGeo($b['latitude']??null,$b['longitude']??null);}Db::run("INSERT INTO school_service_inspections(inspector_user_id,client_uuid,educational_district,company_id,school_id,school_gender,plate_three,plate_letter,plate_two,iran_code,plate_region_code,vehicle_type,vehicle_color,passenger_count,passenger_front_count,passenger_rear_count,driver_gender,certificate_status,violation_date,violation_time,location_text,latitude,longitude,description) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",[(int)$u['id'],_ssv_norm($b['client_uuid']??'')?:null,$district,$companyId?:null,$schoolId?:null,$gender,$a,$l,$c,'ایران',$r,$vehicleType,$vehicleColor,$pass,$passFront,$passRear,$dg,$cert,$date?:null,$time?:null,$locationText,$lat,$lng,trim((string)($b['description']??''))?:null]);$id=(int)Db::pdo()->lastInsertId();_ssv_sync_vehicle_from_inspection($id);foreach($viol as $vid){if(Db::one("SELECT id FROM school_service_violation_types WHERE id=? AND is_active=1",[$vid]))Db::run("INSERT IGNORE INTO school_service_inspection_violations(inspection_id,violation_type_id) VALUES(?,?)",[$id,$vid]);}return ['ok'=>true,'id'=>$id];});
route('POST','/api/school-service/import',function($p,$b,$u){_ssv_need($u,'import');_ssv_tables();$sheets=_ssv_xlsx_rows($_FILES['file']??null);$records=[];foreach($sheets as $name=>$rows){$records=array_merge($records,_ssv_sheet_records($rows));}if(!$records)Http::error('هیچ ردیف قابل شناسایی در فایل Excel پیدا نشد. ستون‌های «نام مدرسه» و «شرکت مجری سرویس دانش‌آموزی» را بررسی کنید.',422);$cc=0;$sc=0;$mc=0;$errs=[];foreach($records as $r){try{$cn=_ssv_norm($r['company']);$sn=_ssv_norm($r['school']);$district=_ssv_district_key($r['district']);if($district===''||!_ssv_valid_district($district))throw new RuntimeException('ناحیه آموزشی نامعتبر: '.($r['district']??''));if($cn!==''){$co=Db::one("SELECT id FROM school_service_companies WHERE name=?",[$cn]);if($co)$cid=(int)$co['id'];else{Db::run("INSERT INTO school_service_companies(name,manager_name,phone,address,manager_mobile,landline_phone,latitude,longitude,registered_school_count,representative_count,status,profile_complete) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",[$cn,$r['manager']?:null,$r['phone']?:null,$r['address']?:null,$r['manager_mobile']?:null,$r['landline']?:null,$r['latitude']!==''?(float)$r['latitude']:null,$r['longitude']!==''?(float)$r['longitude']:null,max(0,(int)($r['registered_school_count']?:0)),max(0,(int)($r['representative_count']?:0)),_ssv_norm($r['status']?:'فعال')?:'فعال',in_array(_ssv_norm($r['profile_complete']??''),['۱','1','بله','تکمیل'],true)?1:0]);$cid=(int)Db::pdo()->lastInsertId();$cc++;}}else{$cid=null;}$code=_ssv_norm($r['code']);$school=null;if($code!=='')$school=Db::one("SELECT id FROM school_service_schools WHERE code=?",[$code]);if(!$school)$school=Db::one("SELECT id FROM school_service_schools WHERE name=? AND educational_district=?",[$sn,$district]);if($school){$sid=(int)$school['id'];Db::run("UPDATE school_service_schools SET name=?,educational_district=?,gender=?,address=?,is_active=1 WHERE id=?",[$sn,$district,in_array($r['gender'],['دخترانه','پسرانه'],true)?$r['gender']:'نامشخص',$r['address']?:null,$sid]);}else{Db::run("INSERT INTO school_service_schools(code,name,educational_district,gender,address) VALUES(?,?,?,?,?)",[$code?:null,$sn,$district,in_array($r['gender'],['دخترانه','پسرانه'],true)?$r['gender']:'نامشخص',$r['address']?:null]);$sid=(int)Db::pdo()->lastInsertId();$sc++;}if($cid){$oldMap=Db::one("SELECT company_id FROM school_service_school_companies WHERE school_id=?",[$sid]);if($oldMap){if((int)$oldMap['company_id']!==(int)$cid){Db::run("UPDATE school_service_school_companies SET company_id=?,is_primary=1 WHERE school_id=?",[$cid,$sid]);$mc++;}}else{Db::run("INSERT INTO school_service_school_companies(school_id,company_id,is_primary) VALUES(?,?,1)",[$sid,$cid]);$mc++;}}}catch(Throwable $e){$errs[]='ردیف مدرسه «'.($r['school']??'').'»: '.$e->getMessage();if(count($errs)>=100)break;}}Db::run("INSERT INTO school_service_import_logs(user_id,file_name,companies_count,schools_count,mappings_count,errors_count,errors_text) VALUES(?,?,?,?,?,?,?)",[(int)$u['id'],$_FILES['file']['name']??'Excel',$cc,$sc,$mc,count($errs),implode("\n",$errs)]);return ['ok'=>true,'companies_count'=>$cc,'schools_count'=>$sc,'mappings_count'=>$mc,'errors'=>$errs];},false,99);
route('GET','/api/school-service/export',function($p,$b,$u){_ssv_need($u,'report');_ssv_tables();$type=$_GET['type']??'inspections';$rows=[];$head=[];if($type==='schools'){$head=['ردیف','کد مدرسه','نام مدرسه','ناحیه آموزشی','نوع مدرسه','شرکت/شرکت‌های مجری','آدرس'];$rows=Db::all("SELECT s.id,s.code,s.name,s.educational_district,s.gender,s.address,GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR '، ') company_names FROM school_service_schools s LEFT JOIN school_service_school_companies sc ON sc.school_id=s.id LEFT JOIN school_service_companies c ON c.id=sc.company_id WHERE s.is_active=1 GROUP BY s.id ORDER BY s.name LIMIT 10000");foreach($rows as $i=>&$r)$r=[$i+1,$r['code'],$r['name'],$r['educational_district'],$r['gender'],$r['company_names'],$r['address']];unset($r);}elseif($type==='companies'){$head=['ردیف','شناسه','نام شرکت','مدیرعامل','موبایل مدیرعامل','تلفن ثابت','آدرس','عرض جغرافیایی','طول جغرافیایی','تعداد مدارس','مدارس ثبت‌شده','تعداد نمایندگان','وضعیت','تکمیل پروفایل'];$rows=Db::all("SELECT c.*,COUNT(DISTINCT sc.school_id) school_count FROM school_service_companies c LEFT JOIN school_service_school_companies sc ON sc.company_id=c.id WHERE c.is_active=1 GROUP BY c.id ORDER BY c.name LIMIT 5000");foreach($rows as $i=>&$r)$r=[$i+1,$r['id'],$r['name'],$r['manager_name'],$r['manager_mobile'],$r['landline_phone']?:$r['phone'],$r['address'],$r['latitude'],$r['longitude'],$r['school_count'],$r['registered_school_count'],$r['representative_count'],$r['status'],((int)$r['profile_complete']?'تکمیل':'ناقص')];unset($r);}else{$head=['ردیف','ناحیه','شرکت','نوع مدرسه','مدرسه','پلاک','نوع خودرو','رنگ خودرو','تخلفات','سرنشین جلو','سرنشین عقب','مجموع سرنشین','نوع راننده','وضعیت گواهی صلاحیت','تاریخ','ساعت','محل ثبت تخلف','توضیحات','بازرس'];$rows=Db::all("SELECT i.*,s.name school_name,c.name company_name,TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) inspector_name FROM school_service_inspections i LEFT JOIN school_service_schools s ON s.id=i.school_id LEFT JOIN school_service_companies c ON c.id=i.company_id LEFT JOIN users u ON u.id=i.inspector_user_id ORDER BY i.id DESC LIMIT 20000");foreach($rows as $r){$vs=Db::all("SELECT v.title FROM school_service_inspection_violations x JOIN school_service_violation_types v ON v.id=x.violation_type_id WHERE x.inspection_id=?",[(int)$r['id']]);$rows2[]=[count($rows2??[])+1,$r['educational_district'],$r['company_name'],$r['school_gender'],$r['school_name'],trim(($r['plate_three']??'').' '.($r['plate_letter']??'').' '.($r['plate_two']??'').' ایران '.($r['plate_region_code']??'')),$r['vehicle_type'],$r['vehicle_color'],implode('، ',array_column($vs,'title')),$r['passenger_front_count']??0,$r['passenger_rear_count']??0,($r['passenger_count']??((int)($r['passenger_front_count']??0)+(int)($r['passenger_rear_count']??0))),$r['driver_gender'],$r['certificate_status'],$r['violation_date'],$r['violation_time'],$r['location_text'],$r['description'],$r['inspector_name']];}$rows=$rows2??[];}$xw=new XlsxWriter($head);foreach($rows as $row)$xw->addRow($row);$xw->output('سرویس_مدارس_'.$type.'.xlsx','سرویس مدارس');},false,99);
route('GET','/api/school-service/companies-page',function($p,$b,$u){_ssv_need($u,'view');_ssv_tables();$page=max(1,(int)($_GET['page']??1));$size=max(10,min(100,(int)($_GET['page_size']??25)));$q=_ssv_norm($_GET['search']??'');$where=$q!==''?'WHERE c.is_active=1 AND c.name LIKE ?':'WHERE c.is_active=1';$args=$q!==''?['%'.$q.'%']:[];$total=(int)(Db::one("SELECT COUNT(*) n FROM school_service_companies c $where",$args)['n']??0);$rows=Db::all("SELECT c.id,c.name,c.manager_name,c.manager_mobile,c.landline_phone,c.phone,c.address,c.latitude,c.longitude,c.registered_school_count,c.representative_count,c.status,c.profile_complete,c.is_active,COUNT(DISTINCT sc.school_id) school_count FROM school_service_companies c LEFT JOIN school_service_school_companies sc ON sc.company_id=c.id $where GROUP BY c.id ORDER BY c.name LIMIT $size OFFSET ".(($page-1)*$size),$args);return ['items'=>$rows,'page'=>$page,'page_size'=>$size,'total'=>$total,'pages'=>max(1,(int)ceil($total/$size))];});
route('GET','/api/school-service/schools-page',function($p,$b,$u){_ssv_need($u,'view');_ssv_tables();_ssv_autoseed_schools();$page=max(1,(int)($_GET['page']??1));$size=max(10,min(100,(int)($_GET['page_size']??25)));$q=_ssv_norm($_GET['search']??'');$district=_ssv_district_key($_GET['district']??'');$where=['1=1'];$args=[];if($q!==''){$where[]='(s.name LIKE ? OR s.code LIKE ?)';$args[]='%'.$q.'%';$args[]='%'.$q.'%';}if($district!==''){$where[]=_ssv_district_sql('s.educational_district').'=?';$args[]=_ssv_district_normalized($district);}$w=implode(' AND ',$where);$total=(int)(Db::one("SELECT COUNT(*) n FROM school_service_schools s WHERE $w",$args)['n']??0);$rows=Db::all("SELECT s.id,s.code,s.name,s.educational_district,s.gender,s.address,s.latitude,s.longitude,s.location_registered_at,s.is_active,GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', ') company_names FROM school_service_schools s LEFT JOIN school_service_school_companies sc ON sc.school_id=s.id LEFT JOIN school_service_companies c ON c.id=sc.company_id WHERE $w GROUP BY s.id ORDER BY s.name LIMIT $size OFFSET ".(($page-1)*$size),$args);return ['items'=>$rows,'page'=>$page,'page_size'=>$size,'total'=>$total,'pages'=>max(1,(int)ceil($total/$size))];});
route('GET','/api/school-service/inspections-page',function($p,$b,$u){_ssv_need($u,'view');_ssv_tables();$page=max(1,(int)($_GET['page']??1));$size=max(10,min(100,(int)($_GET['page_size']??25)));$q=_ssv_norm($_GET['search']??'');$where=['1=1'];$args=[];if($q!==''){$where[]='(s.name LIKE ? OR c.name LIKE ? OR i.location_text LIKE ? OR CONCAT(i.plate_three,i.plate_letter,i.plate_two) LIKE ?)';array_push($args,'%'.$q.'%','%'.$q.'%','%'.$q.'%','%'.$q.'%');}$w=implode(' AND ',$where);$total=(int)(Db::one("SELECT COUNT(*) n FROM school_service_inspections i LEFT JOIN school_service_schools s ON s.id=i.school_id LEFT JOIN school_service_companies c ON c.id=i.company_id WHERE $w",$args)['n']??0);$rows=Db::all("SELECT i.*,s.name school_name,c.name company_name,TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) inspector_name FROM school_service_inspections i LEFT JOIN school_service_schools s ON s.id=i.school_id LEFT JOIN school_service_companies c ON c.id=i.company_id LEFT JOIN users u ON u.id=i.inspector_user_id WHERE $w ORDER BY i.id DESC LIMIT $size OFFSET ".(($page-1)*$size),$args);foreach($rows as &$rr){$rr['plate']=trim(($rr['plate_three']??'').' '.($rr['plate_letter']??'').' '.($rr['plate_two']??'').' ایران');$rr['violations']=array_column(Db::all("SELECT v.title FROM school_service_inspection_violations x JOIN school_service_violation_types v ON v.id=x.violation_type_id WHERE x.inspection_id=?",[(int)$rr['id']]),'title');}unset($rr);return ['items'=>$rows,'page'=>$page,'page_size'=>$size,'total'=>$total,'pages'=>max(1,(int)ceil($total/$size))];});
route('GET','/api/school-service/config',function($p,$b,$u){_ssv_need($u,'view');_ssv_tables();if(!_ssv_perm($u,'edit'))Http::error('دسترسی مدیریت تنظیمات ندارید',403);return ['districts'=>Db::all("SELECT * FROM school_service_districts ORDER BY sort_order,id"),'vehicle_types'=>Db::all("SELECT * FROM school_service_vehicle_types ORDER BY sort_order,id"),'vehicle_colors'=>Db::all("SELECT * FROM school_service_vehicle_colors ORDER BY sort_order,id")];});
route('POST','/api/school-service/config',function($p,$b,$u){_ssv_need($u,'edit');_ssv_tables();$type=(string)($b['type']??'');$title=_ssv_norm($b['title']??'');if(!in_array($type,['district','vehicle_type','vehicle_color'],true)||$title==='')Http::error('نوع یا عنوان تنظیم نامعتبر است',422);if($type==='district'){$title=_ssv_district_key($title);if(!_ssv_valid_district($title))Http::error('ناحیه فقط می‌تواند یکی از مقادیر رسمی ۱ تا ۷ یا تبادکان باشد.',422);} $table=['district'=>'school_service_districts','vehicle_type'=>'school_service_vehicle_types','vehicle_color'=>'school_service_vehicle_colors'][$type];Db::run("INSERT INTO $table(title,sort_order) VALUES(?,?) ON DUPLICATE KEY UPDATE is_active=1",[$title,(int)($b['sort_order']??99)]);return ['ok'=>true];});
route('DELETE','/api/school-service/config',function($p,$b,$u){_ssv_need($u,'edit');_ssv_tables();$type=(string)($_GET['type']??'');$id=(int)($_GET['id']??0);$table=['district'=>'school_service_districts','vehicle_type'=>'school_service_vehicle_types','vehicle_color'=>'school_service_vehicle_colors'][$type]??'';if(!$table||!$id)Http::error('تنظیم نامعتبر است',422);Db::run("UPDATE $table SET is_active=0 WHERE id=?",[$id]);return ['ok'=>true];});
route('GET','/api/school-service/permissions',function($p,$b,$u){_ssv_need($u,'view');_ssv_tables();if(empty($u['is_admin']) && !in_array(($u['role_title']??''),['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد'],true))Http::error('فقط مدیر سامانه می‌تواند دسترسی‌ها را مدیریت کند.',403);$rows=Db::all("SELECT r.id,r.title,r.level,COALESCE(p.can_view,0) can_view,COALESCE(p.can_create,0) can_create,COALESCE(p.can_edit,0) can_edit,COALESCE(p.can_delete,0) can_delete,COALESCE(p.can_import,0) can_import,COALESCE(p.can_report,0) can_report FROM roles r LEFT JOIN school_service_permissions p ON p.role_id=r.id ORDER BY r.level,r.title");return ['items'=>$rows];});
route('POST','/api/school-service/permissions/{role_id}',function($p,$b,$u){_ssv_need($u,'view');_ssv_tables();if(empty($u['is_admin']) && !in_array(($u['role_title']??''),['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد'],true))Http::error('فقط مدیر سامانه می‌تواند دسترسی‌ها را مدیریت کند.',403);$rid=(int)$p['role_id'];if(!Db::one("SELECT id FROM roles WHERE id=?",[$rid]))Http::error('سمت نامعتبر است',422);$vals=[];foreach(['view','create','edit','delete','import','report'] as $k)$vals[$k]=!empty($b['can_'.$k])?1:0;Db::run("INSERT INTO school_service_permissions(role_id,can_view,can_create,can_edit,can_delete,can_import,can_report) VALUES(?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE can_view=VALUES(can_view),can_create=VALUES(can_create),can_edit=VALUES(can_edit),can_delete=VALUES(can_delete),can_import=VALUES(can_import),can_report=VALUES(can_report)",[$rid,$vals['view'],$vals['create'],$vals['edit'],$vals['delete'],$vals['import'],$vals['report']]);return ['ok'=>true];},false,99);


try {
  require_once __DIR__.'/school_service_routes_extra.php';
} catch (Throwable $e) {
  // A failure in the optional school-service extension must never take down
  // authentication, public settings, health, or the rest of the API.
  error_log('school-service routes bootstrap failed: '.$e->getMessage().' @ '.basename($e->getFile()).':'.$e->getLine());
}

// BEGIN CLIENT CRASH REPORTS
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
// END CLIENT CRASH REPORTS
