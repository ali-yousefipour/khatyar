<?php
require_once __DIR__.'/GpsWorkIntervals.php';
require_once __DIR__.'/Seniority.php';
// ============ ØªØ¹Ø±ÛŒÙ Ù‡Ù…Ù‡Ù” Ù…Ø³ÛŒØ±Ù‡Ø§ÛŒ API ============
const ADMIN = 3; // Ø³Ø·Ø­ Û³ Ùˆ Ø¨Ø§Ù„Ø§ØªØ± = Ù…Ø¯ÛŒØ±ÛŒØªÛŒ
// Ø§Ø² Ø§ÛŒÙ† Ù†Ø³Ø®Ù‡ Ø¨Ù‡ Ø¨Ø¹Ø¯ØŒ Ø¨Ù‡â€ŒØ¯Ø±Ø®ÙˆØ§Ø³Øª Ú©Ø§Ø±ÙØ±Ù…Ø§ØŒ Ø´Ù…Ø§Ø±Ù‡Ù” Ù†Ø³Ø®Ù‡Ù” Ø³Ø§ÛŒØª Ùˆ Ø§Ù¾ Ø§Ù†Ø¯Ø±ÙˆÛŒØ¯ Ùˆ Ù†Ø§Ù… ÙØ§ÛŒÙ„ Ø²ÛŒÙ¾ Ù¾Ø±ÙˆÚ˜Ù‡
// Ù‡Ù…ÛŒØ´Ù‡ ÛŒÚ©Ø³Ø§Ù† Ùˆ Ù‡Ù…Ø§Ù‡Ù†Ú¯ Ù†Ú¯Ù‡ Ø¯Ø§Ø´ØªÙ‡ Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯ (Ø¨Ù‡â€ŒØ¬Ø§ÛŒ Ø¯Ùˆ Ø´Ù…Ø§Ø±Ù†Ø¯Ù‡Ù” Ø¬Ø¯Ø§Ú¯Ø§Ù†Ù‡ Ù…Ø«Ù„ Ù‚Ø¨Ù„).
const SITE_VERSION = '1.5.14';   // Ù†Ø³Ø®Ù‡Ù” Ø³Ø§ÛŒØª â€” Ù‡Ù…ÛŒØ´Ù‡ Ø¨Ø§ Ù†Ø³Ø®Ù‡Ù” Ø§Ù¾ Ùˆ Ù†Ø§Ù… ÙØ§ÛŒÙ„ Ù¾Ø±ÙˆÚ˜Ù‡ ÛŒÚ©ÛŒ Ø§Ø³Øª
const APP_VERSION = '1.5.14'; // Ù†Ø³Ø®Ù‡Ù” Ø§Ù¾ Ø§Ù†Ø¯Ø±ÙˆÛŒØ¯ â€” Ø¨Ø§ Ù‡Ø± ØªØºÛŒÛŒØ± Ø§ÙØ²Ø§ÛŒØ´ Ù…ÛŒâ€ŒÛŒØ§Ø¨Ø¯


/* Phase 7.8 â€” Ø²Ù…Ø§Ù† ÙˆØ§Ù‚Ø¹ÛŒ Ø«Ø¨Øª Ú©Ù„Ø§ÛŒÙ†Øª Ø¨Ø±Ø§ÛŒ Ø¹Ù…Ù„ÛŒØ§Øª Ø¢ÙÙ„Ø§ÛŒÙ†/Ø¢Ù†Ù„Ø§ÛŒÙ† */
function _app_en_digits($s){
  $fa = ['Û°'=>'0','Û±'=>'1','Û²'=>'2','Û³'=>'3','Û´'=>'4','Ûµ'=>'5','Û¶'=>'6','Û·'=>'7','Û¸'=>'8','Û¹'=>'9','Ù '=>'0','Ù¡'=>'1','Ù¢'=>'2','Ù£'=>'3','Ù¤'=>'4','Ù¥'=>'5','Ù¦'=>'6','Ù§'=>'7','Ù¨'=>'8','Ù©'=>'9'];
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

// Ø§Ø¹ØªØ¨Ø§Ø±Ø³Ù†Ø¬ÛŒ Ù…Ø®ØªØµØ§Øª Ø¬ØºØ±Ø§ÙÛŒØ§ÛŒÛŒ
function _ssv_require_inspection_core($b){
  if(!is_array($b)) Http::error('Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ø¨Ø§Ø²Ø¯ÛŒØ¯ Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª.',422);
  $schoolId=(int)($b['school_id']??0);
  if($schoolId<=0) Http::error('Ø§Ù†ØªØ®Ø§Ø¨ Ù…Ø¯Ø±Ø³Ù‡ Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª.',422);
  $school=Db::one("SELECT id,latitude,longitude FROM school_service_schools WHERE id=? AND is_active=1",[$schoolId]);
  if(!$school) Http::error('Ù…Ø¯Ø±Ø³Ù‡ Ø§Ù†ØªØ®Ø§Ø¨â€ŒØ´Ø¯Ù‡ Ù…Ø¹ØªØ¨Ø± ÛŒØ§ ÙØ¹Ø§Ù„ Ù†ÛŒØ³Øª.',422);
  $dg=trim((string)($b['driver_gender']??''));
  if(!in_array($dg,['Ø®Ø§Ù†Ù…','Ø¢Ù‚Ø§'],true)) Http::error('Ø¬Ù†Ø³ÛŒØª Ø±Ø§Ù†Ù†Ø¯Ù‡ Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª.',422);
  foreach(['passenger_front_count','passenger_rear_count'] as $k){
    if(!array_key_exists($k,$b) || trim((string)$b[$k])==='') Http::error('ØªØ¹Ø¯Ø§Ø¯ Ø³Ø±Ù†Ø´ÛŒÙ† Ø¬Ù„Ùˆ Ùˆ Ø¹Ù‚Ø¨ Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª.',422);
    $v=_digits_only($b[$k]); if($v==='' || !preg_match('/^\\d+$/',$v)) Http::error('ØªØ¹Ø¯Ø§Ø¯ Ø³Ø±Ù†Ø´ÛŒÙ† Ø¬Ù„Ùˆ Ùˆ Ø¹Ù‚Ø¨ Ø¨Ø§ÛŒØ¯ Ø¹Ø¯Ø¯ÛŒ Ùˆ ØµÙØ± ÛŒØ§ Ø¨ÛŒØ´ØªØ± Ø¨Ø§Ø´Ø¯.',422);
  }
  if($school['latitude']===null || $school['longitude']===null) Http::error('Ù…ÙˆÙ‚Ø¹ÛŒØª Ù…Ú©Ø§Ù†ÛŒ Ù…Ø¯Ø±Ø³Ù‡ Ø«Ø¨Øª Ù†Ø´Ø¯Ù‡ Ø§Ø³ØªØ› Ø§Ø¨ØªØ¯Ø§ Ù…ÙˆÙ‚Ø¹ÛŒØª Ù…Ø¯Ø±Ø³Ù‡ Ø±Ø§ Ø«Ø¨Øª Ú©Ù†ÛŒØ¯.',422);
  $useSchool=!empty($b['use_school_location']);
  $loc=trim((string)($b['location_text']??''));
  if($useSchool){ return; }
  if($loc==='') Http::error('Ù…Ø­Ù„ Ø¨Ø§Ø²Ø¯ÛŒØ¯ Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª.',422);
  if(!isset($b['latitude'],$b['longitude']) || !is_numeric($b['latitude']) || !is_numeric($b['longitude'])) Http::error('Ù…Ø®ØªØµØ§Øª Ù…Ø­Ù„ Ø¨Ø§Ø²Ø¯ÛŒØ¯ Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª.',422);
}

function validGeo($lat, $lng) {
  if ($lat === null && $lng === null) return [null, null];
  $lat = is_numeric($lat) ? (float)$lat : null;
  $lng = is_numeric($lng) ? (float)$lng : null;
  if ($lat === null || $lng === null || $lat < -90 || $lat > 90 || $lng < -180 || $lng > 180)
    Http::error('Ù…Ø®ØªØµØ§Øª Ø¬ØºØ±Ø§ÙÛŒØ§ÛŒÛŒ Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª', 400);
  return [$lat, $lng];
}

function _digits_only($v){
  $v = strtr((string)$v, ['Û°'=>'0','Û±'=>'1','Û²'=>'2','Û³'=>'3','Û´'=>'4','Ûµ'=>'5','Û¶'=>'6','Û·'=>'7','Û¸'=>'8','Û¹'=>'9','Ù '=>'0','Ù¡'=>'1','Ù¢'=>'2','Ù£'=>'3','Ù¤'=>'4','Ù¥'=>'5','Ù¦'=>'6','Ù§'=>'7','Ù¨'=>'8','Ù©'=>'9']);
  return preg_replace('/\D+/', '', $v);
}

function _taxi12_plate_norm($value){
  $raw = trim(_app_en_digits((string)$value));
  $raw = str_replace(['ÙŠ','Ùƒ'], ['ÛŒ','Ú©'], $raw);
  if (preg_match('/(\d{2})\s*Øª\s*(\d{3})/u', $raw, $m)) return $m[1].'Øª'.$m[2].'-12';
  $d = _digits_only($raw);
  if (strlen($d) >= 7 && substr($d, -2) === '12') $d = substr($d, 0, 5);
  elseif (strlen($d) >= 7 && substr($d, 0, 2) === '12') $d = substr($d, 2, 5);
  elseif (strlen($d) >= 5) $d = substr($d, 0, 5);
  else return null;
  return substr($d,0,2).'Øª'.substr($d,2,3).'-12';
}
function _fa_digits_str($s){
  return strtr((string)$s, ['0'=>'Û°','1'=>'Û±','2'=>'Û²','3'=>'Û³','4'=>'Û´','5'=>'Ûµ','6'=>'Û¶','7'=>'Û·','8'=>'Û¸','9'=>'Û¹']);
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
    "{$a}Øª{$c}-{$r}", "{$a} Øª {$c}-{$r}", "{$a} Øª {$c} - {$r}", "{$a}Øª{$c}{$r}", "{$a} Øª {$c} {$r}",
    _fa_digits_str("{$a}Øª{$c}-{$r}"), _fa_digits_str("{$a} Øª {$c}-{$r}"), _fa_digits_str("{$a} Øª {$c} - {$r}"), _fa_digits_str("{$a}Øª{$c}{$r}"), _fa_digits_str("{$a} Øª {$c} {$r}"),
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
    fixed_letter VARCHAR(5) NOT NULL DEFAULT 'Øª',
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

/* Phase 7.10 â€” Ø¢Ù…ÙˆØ²Ø´ ÙˆØ§Ù‚Ø¹ÛŒ OCR Ù¾Ù„Ø§Ú© ØªØ§Ú©Ø³ÛŒ Û±Û²/Øª */
function _ensure_plate_training(){
  _ensure_plate_scan_samples();
  // Ø³Ø§Ø®ØªØ§Ø± Ø¬Ø¯ÙˆÙ„ Ù†Ù…ÙˆÙ†Ù‡â€ŒÙ‡Ø§ÛŒ Ù¾Ù„Ø§Ú© Ø¨Ø§ÛŒØ¯ Ø±ÙˆÛŒ Ø¯ÛŒØªØ§Ø¨ÛŒØ³â€ŒÙ‡Ø§ÛŒ Ù‚Ø¯ÛŒÙ…ÛŒ Ù‡Ù… Ú©Ø§Ù…Ù„ Ø´ÙˆØ¯.
  // Ø§Ú¯Ø± Ø¬Ø¯ÙˆÙ„ Ø§Ø² Ù†Ø³Ø®Ù‡â€ŒÙ‡Ø§ÛŒ Ù‚Ø¨Ù„ÛŒ Ù†Ø§Ù‚Øµ Ø³Ø§Ø®ØªÙ‡ Ø´Ø¯Ù‡ Ø¨Ø§Ø´Ø¯ØŒ endpoint Ù…Ø¯ÛŒØ±ÛŒØª Ù†Ù…ÙˆÙ†Ù‡â€ŒÙ‡Ø§ Ù†Ø¨Ø§ÛŒØ¯ 500 Ø¨Ø¯Ù‡Ø¯.
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
    'fixed_letter' => "VARCHAR(5) NOT NULL DEFAULT 'Øª'",
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
    // Ø¢Ù…ÙˆØ²Ø´/Ù¾ÛŒØ´â€ŒØ¨ÛŒÙ†ÛŒ Ù…Ø¨ØªÙ†ÛŒ Ø¨Ø± Python Ø§Ø² Ø³Ø§Ù…Ø§Ù†Ù‡ Ø­Ø°Ù Ø´Ø¯Ù‡ Ø§Ø³ØªØ› ØªØ´Ø®ÛŒØµ Ù¾Ù„Ø§Ú© Ø¨Ù‡â€ŒØ·ÙˆØ±
    // Ú©Ø§Ù…Ù„ Ø±ÙˆÛŒ Ú¯ÙˆØ´ÛŒ (ML Kit) Ø§Ù†Ø¬Ø§Ù… Ù…ÛŒâ€ŒØ´ÙˆØ¯ Ùˆ Ø§ÛŒÙ† Ù†Ù…ÙˆÙ†Ù‡â€ŒÙ‡Ø§ ØµØ±ÙØ§Ù‹ Ø¨Ø±Ø§ÛŒ Ø¨Ø§Ø²Ø¨ÛŒÙ†ÛŒ Ùˆ
    // Ø¢Ø±Ø´ÛŒÙˆ Ù†Ú¯Ù‡Ø¯Ø§Ø±ÛŒ Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯.
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

/* ---------------- Ø§Ø­Ø±Ø§Ø² Ù‡ÙˆÛŒØª ---------------- */
// Ù†Ú©ØªÙ‡ Ø¯Ø±Ø¨Ø§Ø±Ù‡Ù” Ù…Ø³ÛŒØ± Ø¯ÙˆÙ… (/api/session/start):
// Ø±ÙˆÛŒ Ø¨Ø±Ø®ÛŒ Ù‡Ø§Ø³Øªâ€ŒÙ‡Ø§/ÙØ§ÛŒØ±ÙˆØ§Ù„â€ŒÙ‡Ø§ÛŒ Ø§Ù…Ù†ÛŒØªÛŒ (WAF)ØŒ Ù…Ø³ÛŒØ±Ù‡Ø§ÛŒÛŒ Ú©Ù‡ Ú©Ù„Ù…Ù‡Ù” Â«loginÂ» Ø±Ø§ Ø¯Ø± Ø®ÙˆØ¯ Ø¯Ø§Ø±Ù†Ø¯
// Ø¨Ù‡â€ŒØ·ÙˆØ± Ù¾ÛŒØ´â€ŒÙØ±Ø¶ Ùˆ Ø¨Ø±Ø§ÛŒ Ø¬Ù„ÙˆÚ¯ÛŒØ±ÛŒ Ø§Ø² Ø­Ù…Ù„Ø§Øª brute-force Ù…Ø³Ø¯ÙˆØ¯ Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯ Ùˆ ÛŒÚ© ØµÙØ­Ù‡Ù” Ø®Ø·Ø§ÛŒ Û´Û°Û³
// (HTMLØŒ Ù†Ù‡ JSON) Ø¨Ø±Ù…ÛŒâ€ŒÚ¯Ø±Ø¯Ø§Ù†Ù†Ø¯Ø› Ù‡Ù…ÛŒÙ† Ø¨Ø§Ø¹Ø« Ø®Ø·Ø§ÛŒ Â«Ù¾Ø§Ø³Ø® Ø³Ø±ÙˆØ± JSON Ù†ÛŒØ³ØªÂ» Ø¯Ø± Ø§Ù¾ Ù…ÛŒâ€ŒØ´ÙˆØ¯ØŒ Ù‡Ø±Ú†Ù†Ø¯
// Ø®ÙˆØ¯Ù Ú©Ø¯ PHP Ú©Ø§Ù…Ù„Ø§Ù‹ Ø³Ø§Ù„Ù… Ø§Ø³Øª. Ù…Ø³ÛŒØ± Ø¯ÙˆÙ… Ø¨Ø¯ÙˆÙ† Ú©Ù„Ù…Ø§Øª Ø­Ø³Ø§Ø³ (login/auth) Ø§ÛŒÙ† Ù…Ø´Ú©Ù„ Ø±Ø§ Ø¯ÙˆØ±
// Ù…ÛŒâ€ŒØ²Ù†Ø¯. Ù…Ø³ÛŒØ± Ø§ÙˆÙ„ Ø¨Ø±Ø§ÛŒ Ø³Ø§Ø²Ú¯Ø§Ø±ÛŒ Ø¨Ø§ Ù†Ø³Ø®Ù‡â€ŒÙ‡Ø§ÛŒ Ù‚Ø¯ÛŒÙ…ÛŒâ€ŒØªØ± Ø§Ù¾ Ú©Ù‡ Ù‡Ù†ÙˆØ² Ù†ØµØ¨ Ù‡Ø³ØªÙ†Ø¯ Ù†Ú¯Ù‡ Ø¯Ø§Ø´ØªÙ‡ Ø´Ø¯Ù‡.
function _login_method($deviceType) {
  $method = _req_setting($deviceType === 'android' ? 'app_login_method' : 'web_login_method', $deviceType === 'android' ? 'password' : 'sms_otp');
  if (!in_array($method, ['password', 'sms_otp', 'bale_otp'], true)) Http::error('Ø±ÙˆØ´ ÙˆØ±ÙˆØ¯ ØªÙ†Ø¸ÛŒÙ…â€ŒØ´Ø¯Ù‡ Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³ØªØ› Ø¨Ø§ Ù…Ø¯ÛŒØ± Ø³Ø§Ù…Ø§Ù†Ù‡ ØªÙ…Ø§Ø³ Ø¨Ú¯ÛŒØ±ÛŒØ¯.', 503);
  return $method;
}
route('GET', '/api/session/app-login-config', fn()=>['method'=>_login_method('android')], true);
route('GET', '/api/session/web-login-config', fn()=>['method'=>_login_method('web')], true);

// The fourth argument is internal only: the router never obtains it from a request.
$loginHandler = function ($p, $b, $unused = null, $verifiedOtpUserId = null) {
  // Ù†Ú©ØªÙ‡Ù” Ø­ÛŒØ§ØªÛŒ: Ú†ÙˆÙ† Ø¨Ø¯Ù†Ù‡Ù” ÙˆØ±ÙˆØ¯ Ø§Ú©Ù†ÙˆÙ† Ø¨Ù‡â€ŒØ¬Ø§ÛŒ JSON Ø¨Ø§ ÙØ±Ù… urlencoded Ø§Ø±Ø³Ø§Ù„ Ù…ÛŒâ€ŒØ´ÙˆØ¯ (Ø¨Ø±Ø§ÛŒ Ø¯ÙˆØ±Ø²Ø¯Ù†
  // Ù…Ø³Ø¯ÙˆØ¯Ø³Ø§Ø²ÛŒ WAF)ØŒ Ù‡Ù…Ù‡Ù” Ù…Ù‚Ø§Ø¯ÛŒØ± Ø±Ø´ØªÙ‡â€ŒØ§ÛŒ Ù‡Ø³ØªÙ†Ø¯ â€” ÛŒØ¹Ù†ÛŒ JS Ù…Ù‚Ø¯Ø§Ø± boolean Ù…Ø«Ù„ false Ø±Ø§ Ø¨Ù‡ Ø±Ø´ØªÙ‡Ù”
  // ØºÛŒØ±Ø®Ø§Ù„ÛŒÙ "false" ØªØ¨Ø¯ÛŒÙ„ Ù…ÛŒâ€ŒÚ©Ù†Ø¯ Ú©Ù‡ Ø¯Ø± PHP Ø¨Ø§ !empty() Ø¨Ù‡â€ŒØ§Ø´ØªØ¨Ø§Ù‡ Â«trueÂ» Ø´Ù…Ø±Ø¯Ù‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯. Ø¨Ø¯ÙˆÙ†
  // Ø§ÛŒÙ† Ù†Ø±Ù…Ø§Ù„â€ŒØ³Ø§Ø²ÛŒØŒ Ø¨Ø±Ø±Ø³ÛŒâ€ŒÙ‡Ø§ÛŒ Ø§Ù…Ù†ÛŒØªÛŒ Ø²ÛŒØ± (VPN/Ø­Ø§Ù„Øª ØªÙˆØ³Ø¹Ù‡â€ŒØ¯Ù‡Ù†Ø¯Ù‡/GPS) Ø­ØªÛŒ ÙˆÙ‚ØªÛŒ Ù‡Ù…Ù‡â€ŒÚ†ÛŒØ² Ø³Ø§Ù„Ù…
  // Ø§Ø³Øª Ù‡Ù… Ø¨Ù‡â€ŒØ§Ø´ØªØ¨Ø§Ù‡ ÙˆØ±ÙˆØ¯ Ø±Ø§ Ù…Ø³Ø¯ÙˆØ¯ Ù…ÛŒâ€ŒÚ©Ø±Ø¯Ù†Ø¯. ØªØ§Ø¨Ø¹ Ú©Ù…Ú©ÛŒ Ø²ÛŒØ± Ø±Ø´ØªÙ‡â€ŒÙ‡Ø§ÛŒ "false"/"0"/"" Ø±Ø§ false
  // Ùˆ Ø¨Ù‚ÛŒÙ‡ Ø±Ø§ Ø·Ø¨Ù‚ Ù‚Ø§Ù†ÙˆÙ† Ù…Ø¹Ù…ÙˆÙ„ PHP Ø¯Ø± Ù†Ø¸Ø± Ù…ÛŒâ€ŒÚ¯ÛŒØ±Ø¯Ø› Ù…Ù‚Ø§Ø¯ÛŒØ± boolean ÙˆØ§Ù‚Ø¹ÛŒ (Ø­Ø§Ù„Øª JSON) Ø¯Ø³Øªâ€ŒÙ†Ø®ÙˆØ±Ø¯Ù‡ Ù…ÛŒâ€ŒÙ…Ø§Ù†Ù†Ø¯.
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
  $dev = $b['device_id'] ?? ''; if (strlen($dev) < 6) Http::error('ÙˆØ±ÙˆØ¯ÛŒ Ù†Ø§Ù…Ø¹ØªØ¨Ø±', 400);
  $dtype = (($b['device_type'] ?? 'web') === 'android') ? 'android' : 'web';
  $method = _login_method($dtype);
  if ($verifiedOtpUserId === null && $method !== 'password') Http::error('ÙˆØ±ÙˆØ¯ Ø¨Ø§ Ø±Ù…Ø² Ø¹Ø¨ÙˆØ± ÙØ¹Ø§Ù„ Ù†ÛŒØ³ØªØ› Ø§Ø² Ø±ÙˆØ´ ÙˆØ±ÙˆØ¯ ØªÙ†Ø¸ÛŒÙ…â€ŒØ´Ø¯Ù‡ Ø§Ø³ØªÙØ§Ø¯Ù‡ Ú©Ù†ÛŒØ¯.', 403);
  if ($verifiedOtpUserId !== null && $method === 'password') Http::error('ÙˆØ±ÙˆØ¯ Ø¨Ø§ Ú©Ø¯ ÛŒÚ©â€ŒØ¨Ø§Ø±Ù…ØµØ±Ù ÙØ¹Ø§Ù„ Ù†ÛŒØ³Øª.', 403);
  // Ù…Ø­Ø¯ÙˆØ¯ÛŒØª ÙˆØ±ÙˆØ¯ Ø¨Ø± Ø§Ø³Ø§Ø³ IP Ø¨Ø§ Ø¬Ø¯ÙˆÙ„ Ø§ÛŒÙ†Ø¯Ú©Ø³â€ŒØ¯Ø§Ø±Ø› Ø§Ø² JSON_EXTRACT Ø±ÙˆÛŒ activity_logs Ø¯Ø± Ù…Ø³ÛŒØ± ÙˆØ±ÙˆØ¯ Ø§Ø³ØªÙØ§Ø¯Ù‡ Ù†Ù…ÛŒâ€ŒØ´ÙˆØ¯
  // ØªØ§ Ø¬Ø³Øªâ€ŒÙˆØ¬ÙˆÛŒ Ù†Ø§Ù…â€ŒÚ©Ø§Ø±Ø¨Ø±ÛŒ Ø¯Ø± Ø¯ÛŒØªØ§Ø¨ÛŒØ³ Ø¨Ø§Ø¹Ø« Ú©Ù†Ø¯ÛŒ/Ù‡Ù†Ú¯ Ø´Ø¯Ù† ÙˆØ±ÙˆØ¯ Ù†Ø´ÙˆØ¯.
  $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
  if ($ip) $ip = trim(explode(',', $ip)[0]);
  if ($ip !== '') {
    try {
      $ipFails = (int)(Db::one("SELECT COUNT(*) n FROM login_ip_attempts WHERE ip=? AND created_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)", [$ip])['n'] ?? 0);
      if ($ipFails >= 20) Http::error('ØªØ¹Ø¯Ø§Ø¯ ØªÙ„Ø§Ø´â€ŒÙ‡Ø§ÛŒ ÙˆØ±ÙˆØ¯ Ø§Ø² Ø§ÛŒÙ† Ø¢Ø¯Ø±Ø³ Ø¨ÛŒØ´ Ø§Ø² Ø­Ø¯ Ù…Ø¬Ø§Ø² Ø§Ø³Øª. Û±Ûµ Ø¯Ù‚ÛŒÙ‚Ù‡ Ø¨Ø¹Ø¯ Ø¯ÙˆØ¨Ø§Ø±Ù‡ ØªÙ„Ø§Ø´ Ú©Ù†ÛŒØ¯.', 429);
    } catch (\Throwable $e) {
      // Ù†Ø¨ÙˆØ¯Ù† Ø¬Ø¯ÙˆÙ„ Ù‚Ø¯ÛŒÙ…ÛŒÙ Ù…Ø­Ø¯ÙˆØ¯ÛŒØª IP Ù†Ø¨Ø§ÛŒØ¯ ÙˆØ±ÙˆØ¯ Ø±Ø§ Ø§Ø² Ú©Ø§Ø± Ø¨ÛŒÙ†Ø¯Ø§Ø²Ø¯.
    }
  }

  // Ø§Ø¨ØªØ¯Ø§ Ú©Ø§Ø±Ø¨Ø± Ø±Ø§ Ø§Ø­Ø±Ø§Ø² Ù‡ÙˆÛŒØª Ù…ÛŒâ€ŒÚ©Ù†ÛŒÙ…Ø› Ø³Ù¾Ø³ Ù…Ø¹Ø§ÙÛŒØª Ø§Ù…Ù†ÛŒØªÛŒ Ù‡Ù…Ø§Ù† Ø±Ú©ÙˆØ±Ø¯ Ù‚Ø·Ø¹ÛŒ Ø§Ø¹Ù…Ø§Ù„ Ù…ÛŒâ€ŒØ´ÙˆØ¯.
  // Ø§ÛŒÙ† ØªØ±ØªÛŒØ¨ Ø§Ø² Ù†Ø§Ø¯ÛŒØ¯Ù‡â€ŒÚ¯Ø±ÙØªÙ‡â€ŒØ´Ø¯Ù† Ù…Ø¹Ø§ÙÛŒØª Ø¨Ù‡â€ŒØ¹Ù„Øª Ø¬Ø³Øªâ€ŒÙˆØ¬ÙˆÛŒ Ù…Ù‚Ø¯Ù…Ø§ØªÛŒ Ù†Ø§Ù… Ú©Ø§Ø±Ø¨Ø±ÛŒ Ø¬Ù„ÙˆÚ¯ÛŒØ±ÛŒ Ù…ÛŒâ€ŒÚ©Ù†Ø¯.
  // Fast path first: exact username lookup can use the normal username index.
  // Only legacy rows containing incidental whitespace fall back to TRIM().
  try { $u = Db::one("SELECT u.*, r.title AS role_title, r.level, r.is_admin FROM users u JOIN roles r ON r.id=u.role_id WHERE u.username=? LIMIT 1", [$username]); } catch (Throwable $e) { error_log("login role lookup failed: ".$e->getMessage()); $u = Db::one("SELECT u.* FROM users u WHERE u.username=? LIMIT 1", [$username]); $u["role_title"]=""; $u["level"]=0; $u["is_admin"]=0; }
  if (!$u) {
    try { $u = Db::one("SELECT u.*, r.title AS role_title, r.level, r.is_admin FROM users u JOIN roles r ON r.id=u.role_id WHERE TRIM(u.username)=? LIMIT 1", [$username]); } catch (Throwable $e) { error_log("login trimmed role lookup failed: ".$e->getMessage()); $u = Db::one("SELECT u.* FROM users u WHERE TRIM(u.username)=? LIMIT 1", [$username]); $u["role_title"]=""; $u["level"]=0; $u["is_admin"]=0; }
  }
  if (!$u || !$u['is_active'] || ($verifiedOtpUserId === null ? !password_verify($password, $u['password_hash']) : (int)$u['id'] !== (int)$verifiedOtpUserId)) {
    Db::run("INSERT INTO activity_logs(user_id,event,meta) VALUES(?, 'login_failed', ?)", [$u['id'] ?? null, json_encode(['username'=>$username], JSON_UNESCAPED_UNICODE)]);
    if (!empty($ip)) { try { Db::run("INSERT INTO login_ip_attempts(ip) VALUES(?)", [$ip]); } catch (\Throwable $e) {} }
    Http::error('Ù†Ø§Ù… Ú©Ø§Ø±Ø¨Ø±ÛŒ ÛŒØ§ Ø±Ù…Ø² Ø¹Ø¨ÙˆØ± Ø§Ø´ØªØ¨Ø§Ù‡ Ø§Ø³Øª', 401);
  }
  // Ù‚ÙˆØ§Ù†ÛŒÙ† Ø§Ù…Ù†ÛŒØªÛŒ ÙˆØ±ÙˆØ¯Ø› Ú©Ø§Ø±Ø¨Ø± Ù…Ø¹Ø§Ù Ø§Ø² VPNØŒ Ø­Ø§Ù„Øª ØªÙˆØ³Ø¹Ù‡â€ŒØ¯Ù‡Ù†Ø¯Ù‡ØŒ Ù…ÙˆÙ‚Ø¹ÛŒØª Ø¬Ø¹Ù„ÛŒ Ùˆ Ø§Ù„Ø²Ø§Ù… GPS Ù…Ø³ØªØ«Ù†Ø§ Ø§Ø³Øª.
  $securityExempt = ((int)($u['security_exempt'] ?? 0) === 1);
  if ($dtype === 'android' && !$securityExempt) {
    $secCfg = function($k,$d=true){ try { $r = Db::one("SELECT value FROM app_settings WHERE `key`=?", [$k]); return $r ? json_decode($r['value'], true) : $d; } catch (Throwable $e) { error_log('login settings fallback: '.$e->getMessage()); return $d; } };
    $block_vpn = $secCfg('block_vpn', true);
    $block_dev = $secCfg('block_dev_options', true);
    $block_mock = $secCfg('block_mock_location', true);
    $require_gps = $secCfg('require_gps', true);
    $reason = null;
    if ($block_vpn && !empty($b['vpn_on'])) $reason = 'VPN Ø±ÙˆØ´Ù† Ø§Ø³Øª';
    elseif ($block_dev && !empty($b['dev_options_on'])) $reason = 'Ø­Ø§Ù„Øª ØªÙˆØ³Ø¹Ù‡â€ŒØ¯Ù‡Ù†Ø¯Ù‡ ÙØ¹Ø§Ù„ Ø§Ø³Øª';
    elseif ($block_mock && !empty($b['mock_location'])) $reason = 'Ù…ÙˆÙ‚Ø¹ÛŒØª Ø¬Ø¹Ù„ÛŒ (Mock Location) ÙØ¹Ø§Ù„ Ø§Ø³Øª';
    elseif ($require_gps && array_key_exists('gps_on',$b) && $b['gps_on'] === false) $reason = 'GPS Ø®Ø§Ù…ÙˆØ´ Ø§Ø³Øª';
    if ($reason !== null) {
      $securityMeta = $b;
      unset($securityMeta['password'], $securityMeta['code']);
      $securityMeta['username'] = $username;
      $securityMeta['reason'] = $reason;
      Db::run("INSERT INTO activity_logs(user_id,event,meta) VALUES(?, 'login_blocked_security', ?)", [$u['id'], json_encode($securityMeta, JSON_UNESCAPED_UNICODE)]);
      Http::error("ÙˆØ±ÙˆØ¯ Ù…Ø¬Ø§Ø² Ù†ÛŒØ³Øª: $reason", 403);
    }
  }
  if (empty($u['is_admin'])) {
    $mcfg = _maintenance_status();
    if (!empty($mcfg['enabled'])) Http::error($mcfg['message'] ?: 'Ù†Ø±Ù…â€ŒØ§ÙØ²Ø§Ø± Ù…ÙˆÙ‚ØªØ§Ù‹ Ø¨Ø±Ø§ÛŒ ØªØ¹Ù…ÛŒØ±Ø§Øª ØºÛŒØ±ÙØ¹Ø§Ù„ Ø§Ø³Øª.', 503);
  }
  // Ø¯Ø± ØµÙˆØ±Øª ÙØ¹Ø§Ù„ Ø¨ÙˆØ¯Ù† ØªÙ†Ø¸ÛŒÙ… Â«Ø§Ù„Ø²Ø§Ù… ØªÚ©Ù…ÛŒÙ„ Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ù‡ÙˆÛŒØªÛŒ Ø¨Ø±Ø§ÛŒ ÙˆØ±ÙˆØ¯Â»ØŒ Ú©Ø§Ø±Ø¨Ø±Ø§Ù†ÛŒ Ú©Ù‡ ÙÛŒÙ„Ø¯Ù‡Ø§ÛŒ Ø³ÙØ§Ø±Ø´ÛŒÙ Ø§Ù„Ø²Ø§Ù…ÛŒ
  // Ø±Ø§ Ú©Ø§Ù…Ù„ Ù†Ú©Ø±Ø¯Ù‡ ÛŒØ§ Ù‡Ù†ÙˆØ² Ø§Ù…Ø¶Ø§ÛŒ Ø®ÙˆØ¯ Ø±Ø§ Ø¯Ø± Ø¨Ø±Ù†Ø§Ù…Ù‡ Ø«Ø¨Øª Ù†Ú©Ø±Ø¯Ù‡â€ŒØ§Ù†Ø¯ØŒ Ø§Ø¬Ø§Ø²Ù‡Ù” ÙˆØ±ÙˆØ¯ Ù†Ø®ÙˆØ§Ù‡Ù†Ø¯ Ø¯Ø§Ø´Øª.
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
    if (empty($u['signature_data'])) $missing[] = 'Ø§Ù…Ø¶Ø§ÛŒ Ù¾Ø±Ø³Ù†Ù„ÛŒ';
    if ($missing) {
      Db::run("INSERT INTO activity_logs(user_id,event,meta) VALUES(?, 'login_blocked_incomplete_profile', ?)", [$u['id'], json_encode(['missing'=>$missing], JSON_UNESCAPED_UNICODE)]);
      Http::error('Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ù‡ÙˆÛŒØªÛŒ Ø´Ù…Ø§ ØªÚ©Ù…ÛŒÙ„ Ù†Ø´Ø¯Ù‡ Ùˆ Ø§Ù…Ú©Ø§Ù† ÙˆØ±ÙˆØ¯ ÙˆØ¬ÙˆØ¯ Ù†Ø¯Ø§Ø±Ø¯. Ù…ÙˆØ§Ø±Ø¯ Ù†Ø§Ù‚Øµ: '.implode('ØŒ ', $missing).'. Ø¨Ø±Ø§ÛŒ ØªÚ©Ù…ÛŒÙ„ØŒ Ø¨Ù‡ Ù…Ø¯ÛŒØ± Ø³Ø§Ù…Ø§Ù†Ù‡ Ù…Ø±Ø§Ø¬Ø¹Ù‡ Ú©Ù†ÛŒØ¯.', 403);
    }
  }
  if ($dtype === 'android' && !$u['allow_android']) Http::error('ÙˆØ±ÙˆØ¯ Ø¨Ø§ Ø§Ù¾ Ø§Ù†Ø¯Ø±ÙˆÛŒØ¯ Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ø­Ø³Ø§Ø¨ Ù…Ø¬Ø§Ø² Ù†ÛŒØ³Øª', 403);
  if ($dtype === 'web' && !$u['allow_web']) Http::error('ÙˆØ±ÙˆØ¯ Ø¨Ø§ ÙˆØ¨â€ŒØ§Ù¾Ù„ÛŒÚ©ÛŒØ´Ù† Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ø­Ø³Ø§Ø¨ Ù…Ø¬Ø§Ø² Ù†ÛŒØ³Øª', 403);
  $sess = Db::one("SELECT device_id, revoked_at FROM user_sessions WHERE user_id=? AND device_type=?", [$u['id'], $dtype]);
  $unlimited = in_array($u['role_title'], ['Ù…Ø¯ÛŒØ± Ú©Ù„','Ø±ÛŒÛŒØ³ Ø§Ø¯Ø§Ø±Ù‡ Ø¨Ø§Ø²Ø±Ø³ÛŒ','Ù†ÛŒØ±ÙˆÛŒ Ø§Ø¯Ø§Ø±ÛŒ Ø§Ø±Ø´Ø¯'], true);
  if (!$sess || $sess['revoked_at'] || $unlimited) {
    Db::run("INSERT INTO user_sessions(user_id,device_type,device_id,device_model) VALUES(?,?,?,?)
             ON DUPLICATE KEY UPDATE device_id=VALUES(device_id),device_model=VALUES(device_model),revoked_at=NULL,created_at=NOW()",
            [$u['id'], $dtype, $dev, $b['device_model'] ?? null]);
  } elseif ($sess['device_id'] !== $dev) {
    // ÙˆØ¨ ÛŒÚ© Ú©Ù„Ø§ÛŒÙ†Øª Ù…Ø±ÙˆØ±Ú¯Ø±ÛŒ Ø§Ø³ØªØ› Ù¾Ø³ Ø§Ø² Ø§Ø­Ø±Ø§Ø² Ù‡ÙˆÛŒØª Ù…ÙˆÙÙ‚ØŒ ÙˆØ±ÙˆØ¯ Ø§Ø² Ù…Ø±ÙˆØ±Ú¯Ø± Ø¬Ø¯ÛŒØ¯ Ø¨Ø§ÛŒØ¯ Ù†Ø´Ø³Øª ÙˆØ¨ Ù‚Ø¨Ù„ÛŒ Ø±Ø§ Ø¬Ø§Ø¨Ù‡â€ŒØ¬Ø§ Ú©Ù†Ø¯.
    if ($dtype === 'web') {
      Db::run("UPDATE user_sessions SET device_id=?, device_model=?, revoked_at=NULL, created_at=NOW() WHERE user_id=? AND device_type=?", [$dev, $b['device_model'] ?? null, $u['id'], $dtype]);
    } else {
      Db::run("INSERT INTO activity_logs(user_id,event,meta) VALUES(?, 'device_mismatch', ?)", [$u['id'], json_encode(['tried'=>$dev,'type'=>$dtype])]);
      Http::error('Ø§ÛŒÙ† Ø­Ø³Ø§Ø¨ Ø±ÙˆÛŒ ÛŒÚ© Ú¯ÙˆØ´ÛŒ Ø§Ù†Ø¯Ø±ÙˆÛŒØ¯ Ø¯ÛŒÚ¯Ø± ÙØ¹Ø§Ù„ Ø§Ø³Øª. Ø¨Ø±Ø§ÛŒ ØªØ¹ÙˆÛŒØ¶ØŒ Ù…Ø¯ÛŒØ± Ø¨Ø§ÛŒØ¯ Ø¢Ù† Ø¯Ø³ØªÚ¯Ø§Ù‡ Ø±Ø§ Ø­Ø°Ù Ú©Ù†Ø¯.', 409);
    }
  }
  // Ø§Ú¯Ø± Ø±Ù…Ø² Ù‡Ù†ÙˆØ² Ù¾ÛŒØ´â€ŒÙØ±Ø¶ (Û±Û²Û³Û´Û¶Û¶) Ø¨Ø§Ø´Ø¯ØŒ Ú©Ø§Ø±Ø¨Ø± Ø¨Ø§ÛŒØ¯ Ø±Ù…Ø² Ùˆ Ø§ÛŒÙ…ÛŒÙ„ Ø±Ø§ ØªØºÛŒÛŒØ± Ø¯Ù‡Ø¯
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
  if (!$payload || ($payload['t'] ?? '') !== 'r') Http::error('ØªÙˆÚ©Ù† ØªÙ…Ø¯ÛŒØ¯ Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª', 401);
  $dt = $payload['dt'] ?? 'web';
  $s = Db::one("SELECT device_id,revoked_at FROM user_sessions WHERE user_id=? AND device_type=?", [$payload['sub'], $dt]);
  $ur = Db::one("SELECT r.title FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?", [$payload['sub']]);
  $unlim = $ur && in_array($ur['title'], ['Ù…Ø¯ÛŒØ± Ú©Ù„','Ø±ÛŒÛŒØ³ Ø§Ø¯Ø§Ø±Ù‡ Ø¨Ø§Ø²Ø±Ø³ÛŒ','Ù†ÛŒØ±ÙˆÛŒ Ø§Ø¯Ø§Ø±ÛŒ Ø§Ø±Ø´Ø¯'], true);
  if (!$s || $s['revoked_at'] || (!$unlim && $s['device_id'] !== $payload['device_id'])) Http::error('Ù†Ø´Ø³Øª Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª', 401);
  return issueTokens($payload['sub'], $payload['device_id'], $dt);
};
route('POST', '/api/auth/refresh', $refreshHandler, true);
// Ù‡Ù…Ø§Ù† Ù…Ø³ÛŒØ± Ø¨Ø¯ÙˆÙ† Ú©Ù„Ù…Ù‡Ù” Ø­Ø³Ø§Ø³ Â«authÂ» â€” Ø¨Ø±Ø§ÛŒ Ø¯ÙˆØ±Ø²Ø¯Ù† Ù…Ø³Ø¯ÙˆØ¯Ø³Ø§Ø²ÛŒ Ø§Ø­ØªÙ…Ø§Ù„ÛŒ WAF (Ù†Ú¯Ø§Ù‡ Ú©Ù†ÛŒØ¯ Ø¨Ù‡ ØªÙˆØ¶ÛŒØ­ Ø¨Ø§Ù„Ø§ÛŒ Ù„Ø§Ú¯ÛŒÙ†)
route('POST', '/api/session/renew', $refreshHandler, true);

/* ================= ÙˆØ±ÙˆØ¯ Ø¨Ø§ Ú©Ø¯ ÛŒÚ©â€ŒØ¨Ø§Ø±Ù…ØµØ±Ù Ù¾ÛŒØ§Ù…Ú©ÛŒ (OTP) ================= */
// OTP schema is provisioned by the deployment migration.
// Avoid runtime DDL and metadata locks at peak login time.
function _otp_tables() { return; }
// Platform is selected by the route, never by the request body.
function _login_otp_request($b, $dtype) {
  $username = trim((string)($b['username'] ?? ''));
  if ($username === '') Http::error('Ù†Ø§Ù… Ú©Ø§Ø±Ø¨Ø±ÛŒ Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯', 400);
  $method = _login_method($dtype);
  if ($method === 'password') Http::error('ÙˆØ±ÙˆØ¯ Ø¨Ø§ Ú©Ø¯ ÛŒÚ©â€ŒØ¨Ø§Ø±Ù…ØµØ±Ù ÙØ¹Ø§Ù„ Ù†ÛŒØ³Øª.', 403);
  $u = Db::one("SELECT id,is_active,phone,allow_android,allow_web FROM users WHERE username=? LIMIT 1", [$username]);
  $channel = $method === 'bale_otp' ? 'bale' : 'sms';
  if (!$u || !$u['is_active'] || empty($u['allow_'.$dtype])) return ['ok'=>true,'channel'=>$channel];
  $mobile = preg_replace('/\D/', '', trim((string)($u['phone'] ?? '')));
  if ($channel === 'sms' && strlen($mobile) < 10) Http::error('Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ú©Ø§Ø±Ø¨Ø± Ø´Ù…Ø§Ø±Ù‡ Ù‡Ù…Ø±Ø§Ù‡ Ù…Ø¹ØªØ¨Ø± Ø«Ø¨Øª Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª.', 400);
  if ($mobile !== '' && strpos($mobile, '0') !== 0) $mobile = '0'.ltrim($mobile, '0');
  $chat = $channel === 'bale' ? BaleBot::findChatForUser((int)$u['id']) : null;
  if ($channel === 'bale' && (!BaleBot::isEnabled() || !$chat)) Http::error('Ø§ØªØµØ§Ù„ Ø­Ø³Ø§Ø¨ Ø¨Ù‡ Ø±Ø¨Ø§Øª Ø¨Ù„Ù‡ ÙØ¹Ø§Ù„ Ù†ÛŒØ³ØªØ› Ø¨Ø§ Ù…Ø¯ÛŒØ± Ø³Ø§Ù…Ø§Ù†Ù‡ ØªÙ…Ø§Ø³ Ø¨Ú¯ÛŒØ±ÛŒØ¯.', 400);
  $recent = Db::one("SELECT id FROM login_otp WHERE user_id=? AND created_at > DATE_SUB(NOW(), INTERVAL 60 SECOND)", [$u['id']]);
  if ($recent) Http::error('Ù„Ø·ÙØ§Ù‹ Û¶Û° Ø«Ø§Ù†ÛŒÙ‡ ØµØ¨Ø± Ú©Ù†ÛŒØ¯ Ùˆ Ø¯ÙˆØ¨Ø§Ø±Ù‡ ØªÙ„Ø§Ø´ Ú©Ù†ÛŒØ¯.', 429);
  $hourly = (int)(Db::one("SELECT COUNT(*) n FROM login_otp WHERE user_id=? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)", [$u['id']])['n'] ?? 0);
  if ($hourly >= 5) Http::error('ØªØ¹Ø¯Ø§Ø¯ Ø¯Ø±Ø®ÙˆØ§Ø³Øªâ€ŒÙ‡Ø§ÛŒ Ú©Ø¯ Ø¯Ø± Ø§ÛŒÙ† Ø³Ø§Ø¹Øª Ø¨ÛŒØ´ Ø§Ø² Ø­Ø¯ Ù…Ø¬Ø§Ø² Ø§Ø³Øª.', 429);
  $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
  // Bind challenges to both platform and configured channel without changing schema.
  $hash = hash('sha256', $dtype.':'.$method.':'.$code);
  Db::run("INSERT INTO login_otp(user_id,mobile,code_hash,expires_at) VALUES(?,?,?,DATE_ADD(NOW(), INTERVAL 3 MINUTE))", [$u['id'], $mobile, $hash]);
  $text = "Ú©Ø¯ ÙˆØ±ÙˆØ¯ Ø®Ø·ÛŒØ§Ø±: {$code}\nØ§ÛŒÙ† Ú©Ø¯ ØªØ§ Û³ Ø¯Ù‚ÛŒÙ‚Ù‡ Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª.";
  if ($channel === 'bale') $r = BaleBot::sendMessage($chat, $text);
  else {
    $appHash = $dtype === 'android' ? _req_setting('android_sms_app_hash', '') : '';
    if ($appHash) $text .= "\n\n".$appHash;
    $r = Sms::send([$mobile], $text, 'login_otp', null);
  }
  if (empty($r['ok'])) Http::error('Ø§Ø±Ø³Ø§Ù„ Ú©Ø¯ ÙˆØ±ÙˆØ¯ Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯Ø› Ø¯ÙˆØ¨Ø§Ø±Ù‡ ØªÙ„Ø§Ø´ Ú©Ù†ÛŒØ¯.', 502);
  return ['ok'=>true,'channel'=>$channel];
}
function _login_otp_verify($b, $dtype, $loginHandler) {
  $method = _login_method($dtype);
  if ($method === 'password') Http::error('ÙˆØ±ÙˆØ¯ Ø¨Ø§ Ú©Ø¯ ÛŒÚ©â€ŒØ¨Ø§Ø±Ù…ØµØ±Ù ÙØ¹Ø§Ù„ Ù†ÛŒØ³Øª.', 403);
  $username = trim((string)($b['username'] ?? ''));
  $code = _app_en_digits(trim((string)($b['code'] ?? '')));
  if ($username === '' || !preg_match('/^[0-9]{6}$/D', $code) || strlen((string)($b['device_id'] ?? '')) < 6) Http::error('ÙˆØ±ÙˆØ¯ÛŒ Ù†Ø§Ù…Ø¹ØªØ¨Ø±', 400);
  $u = Db::one("SELECT id,is_active FROM users WHERE username=? LIMIT 1", [$username]);
  if (!$u || !$u['is_active']) Http::error('Ú©Ø¯ ÙˆØ§Ø±Ø¯Ø´Ø¯Ù‡ ØµØ­ÛŒØ­ ÛŒØ§ Ù…Ù†Ù‚Ø¶ÛŒ Ø´Ø¯Ù‡ Ø§Ø³Øª.', 401);
  $row = Db::one("SELECT * FROM login_otp WHERE user_id=? AND consumed_at IS NULL ORDER BY id DESC LIMIT 1", [$u['id']]);
  if (!$row || strtotime($row['expires_at']) <= time()) Http::error('Ú©Ø¯ ÙˆØ§Ø±Ø¯Ø´Ø¯Ù‡ ØµØ­ÛŒØ­ ÛŒØ§ Ù…Ù†Ù‚Ø¶ÛŒ Ø´Ø¯Ù‡ Ø§Ø³Øª.', 401);
  // Reserve each attempt atomically, including concurrent incorrect submissions.
  $attempt = Db::run("UPDATE login_otp SET attempts=attempts+1 WHERE id=? AND consumed_at IS NULL AND attempts<5 AND expires_at>NOW()", [$row['id']]);
  if ($attempt->rowCount() !== 1) Http::error('Ú©Ø¯ Ù…Ù†Ù‚Ø¶ÛŒ Ø´Ø¯Ù‡ ÛŒØ§ ØªØ¹Ø¯Ø§Ø¯ ØªÙ„Ø§Ø´â€ŒÙ‡Ø§ÛŒ Ù…Ø¬Ø§Ø² ØªÙ…Ø§Ù… Ø´Ø¯Ù‡ Ø§Ø³Øª.', 429);
  if (!hash_equals($row['code_hash'], hash('sha256', $dtype.':'.$method.':'.$code))) Http::error('Ú©Ø¯ ÙˆØ§Ø±Ø¯Ø´Ø¯Ù‡ Ù†Ø§Ø¯Ø±Ø³Øª Ø§Ø³Øª', 401);
  $consume = Db::run("UPDATE login_otp SET consumed_at=NOW() WHERE id=? AND consumed_at IS NULL AND expires_at>NOW()", [$row['id']]);
  if ($consume->rowCount() !== 1) Http::error('Ø§ÛŒÙ† Ú©Ø¯ Ù‚Ø¨Ù„Ø§Ù‹ Ø§Ø³ØªÙØ§Ø¯Ù‡ Ø´Ø¯Ù‡ ÛŒØ§ Ù…Ù†Ù‚Ø¶ÛŒ Ø´Ø¯Ù‡ Ø§Ø³Øª.', 401);
  $b['device_type'] = $dtype;
  unset($b['password']);
  return $loginHandler([], $b, null, (int)$u['id']);
}
route('POST', '/api/session/otp-request', fn($p,$b)=>_login_otp_request($b,'web'), true);
route('POST', '/api/session/otp-verify', fn($p,$b)=>_login_otp_verify($b,'web',$loginHandler), true);
route('POST', '/api/session/app-login-request', fn($p,$b)=>_login_otp_request($b,'android'), true);
route('POST', '/api/session/app-login-verify', fn($p,$b)=>_login_otp_verify($b,'android',$loginHandler), true);

route('POST', '/api/auth/logout', function($p, $b, $u) {
  // Ø¨Ø±Ø±Ø³ÛŒ Ø§Ø¬Ø§Ø²Ù‡Ù” Ø®Ø±ÙˆØ¬ Ùˆ Ù…Ø­Ø¯ÙˆØ¯ÛŒØª Ù…Ø§Ù‡Ø§Ù†Ù‡
  $allow = _req_setting('allow_logout', true) !== false;
  if (!$allow) Http::error('Ø®Ø±ÙˆØ¬ Ø§Ø² Ø­Ø³Ø§Ø¨ Ú©Ø§Ø±Ø¨Ø±ÛŒ ØªÙˆØ³Ø· Ù…Ø¯ÛŒØ± Ø³Ø§Ù…Ø§Ù†Ù‡ ØºÛŒØ±ÙØ¹Ø§Ù„ Ø´Ø¯Ù‡ Ø§Ø³Øª.', 403);
  $limit = (int)_req_setting('logout_monthly_limit', 0);
  if ($limit > 0) {
    $used = (int)(Db::one("SELECT COUNT(*) n FROM activity_logs WHERE user_id=? AND event='logout' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)", [$u['id'], $eventAt])['n'] ?? 0);
    if ($used >= $limit) Http::error("Ø´Ù…Ø§ Ø¯Ø± Û³Û° Ø±ÙˆØ² Ø§Ø®ÛŒØ± {$used} Ø¨Ø§Ø± Ø®Ø§Ø±Ø¬ Ø´Ø¯Ù‡â€ŒØ§ÛŒØ¯ Ùˆ Ø¨Ù‡ Ø³Ù‚Ù Ù…Ø¬Ø§Ø² ({$limit} Ø¨Ø§Ø±) Ø±Ø³ÛŒØ¯Ù‡â€ŒØ§ÛŒØ¯.", 403);
  }
  $dt = $u['device_type'] ?? 'web';
  Db::run("UPDATE user_sessions SET revoked_at=NOW() WHERE user_id=? AND device_type=?", [$u['id'], $dt]);
  Db::run("INSERT INTO activity_logs(user_id,event) VALUES(?, 'logout')", [$u['id']]);
  return ['ok'=>true];
});

// Ø«Ø¨Øª Â«ÙØ±Ø§Ù…ÙˆØ´ÛŒ Ø®Ø±ÙˆØ¬/ÙˆØ±ÙˆØ¯Â» â€” ÙˆÙ‚ØªÛŒ Ú©Ø§Ø±Ø¨Ø± ÙØ±Ø§Ù…ÙˆØ´ Ú©Ø±Ø¯Ù‡ Ø«Ø¨Øª ØªØ±Ø¯Ø¯ Ø¨Ø²Ù†Ø¯ØŒ Ø¨Ø§ Ù…Ø­Ø¯ÙˆØ¯ÛŒØª Ù…Ø§Ù‡Ø§Ù†Ù‡
route('POST', '/api/me/forget-checkin', function($p,$b,$u){
  $limit = (int)_req_setting('forget_checkin_monthly_limit', 0);
  $used = (int)(Db::one("SELECT COUNT(*) n FROM activity_logs WHERE user_id=? AND event='forget_checkin' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)", [$u['id']])['n'] ?? 0);
  if ($limit > 0 && $used >= $limit) {
    Http::error("Ø´Ù…Ø§ Ø¯Ø± Û³Û° Ø±ÙˆØ² Ø§Ø®ÛŒØ± {$used} Ø¨Ø§Ø± Ø§Ø² ÙØ±Ø§Ù…ÙˆØ´ÛŒ Ø«Ø¨Øª ØªØ±Ø¯Ø¯ Ø§Ø³ØªÙØ§Ø¯Ù‡ Ú©Ø±Ø¯Ù‡â€ŒØ§ÛŒØ¯ Ùˆ Ø¨Ù‡ Ø³Ù‚Ù Ù…Ø¬Ø§Ø² ({$limit} Ø¨Ø§Ø±) Ø±Ø³ÛŒØ¯Ù‡â€ŒØ§ÛŒØ¯.", 403);
  }
  // Ø«Ø¨Øª Ø±ÙˆÛŒØ¯Ø§Ø¯ ÙØ±Ø§Ù…ÙˆØ´ÛŒ
  $note = trim($b['note'] ?? '');
  Db::run("INSERT INTO activity_logs(user_id,event,meta) VALUES(?, 'forget_checkin', ?)", [$u['id'], $note ? json_encode(['note'=>$note], JSON_UNESCAPED_UNICODE) : null]);
  // Ø§Ú¯Ø± Ø®Ø±ÙˆØ¬ Ø¨Ø§Ø² Ù‡Ø³ØªØŒ Ø¢Ù† Ø±Ø§ Ø¨Ø¨Ù†Ø¯ (Ø´Ø¨ÛŒÙ‡ Ø®Ø±ÙˆØ¬ ÙØ±Ø§Ù…ÙˆØ´â€ŒØ´Ø¯Ù‡)
  $open = Db::one("SELECT id FROM attendances WHERE user_id=? AND exit_at IS NULL ORDER BY created_at DESC LIMIT 1", [$u['id']]);
  if ($open) { try { Db::run("UPDATE attendances SET exit_at=? WHERE id=?", [$eventAt, $open['id']]); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); } }
  $remaining = $limit > 0 ? max(0, $limit - $used - 1) : null;
  return ['ok'=>true, 'remaining'=>$remaining];
});

// ÙˆØ¶Ø¹ÛŒØª ÙØ±Ø§Ù…ÙˆØ´ÛŒ Ø«Ø¨Øª ØªØ±Ø¯Ø¯ (Ú†Ù†Ø¯ Ø¨Ø§Ø± Ø¨Ø§Ù‚ÛŒ Ù…Ø§Ù†Ø¯Ù‡)
route('GET', '/api/me/forget-status', function($p,$b,$u){
  $limit = (int)_req_setting('forget_checkin_monthly_limit', 0);
  $used = (int)(Db::one("SELECT COUNT(*) n FROM activity_logs WHERE user_id=? AND event='forget_checkin' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)", [$u['id']])['n'] ?? 0);
  return ['limit'=>$limit, 'used'=>$used, 'remaining'=>$limit > 0 ? max(0, $limit - $used) : null];
});

// ÙˆØ¶Ø¹ÛŒØª Ø®Ø±ÙˆØ¬ Ú©Ø§Ø±Ø¨Ø±: Ø¢ÛŒØ§ Ù…Ø¬Ø§Ø² Ø§Ø³Øª + Ú†Ù†Ø¯ Ø¨Ø§Ø± Ø¯Ø± Û³Û° Ø±ÙˆØ² Ø§Ø®ÛŒØ± Ø¨Ø§Ù‚ÛŒ Ù…Ø§Ù†Ø¯Ù‡
route('GET', '/api/me/logout-status', function($p,$b,$u){
  $allow = _req_setting('allow_logout', true) !== false;
  $limit = (int)_req_setting('logout_monthly_limit', 0);
  $used = (int)(Db::one("SELECT COUNT(*) n FROM activity_logs WHERE user_id=? AND event='logout' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)", [$u['id']])['n'] ?? 0);
  return [
    'allow' => $allow,
    'limit' => $limit, // 0 = Ø¨Ø¯ÙˆÙ† Ù…Ø­Ø¯ÙˆØ¯ÛŒØª
    'used' => $used,
    'remaining' => $limit > 0 ? max(0, $limit - $used) : null,
  ];
});
// ---------------- ØµØ­Øªâ€ŒØ³Ù†Ø¬ÛŒ Ø­Ø¶ÙˆØ± ----------------

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
      // Û³Û° Ø¯Ù‚ÛŒÙ‚Ù‡ ØªÙ„ÙˆØ±Ø§Ù†Ø³ Ù‚Ø¨Ù„ Ùˆ Ø¨Ø¹Ø¯ Ø¨Ø±Ø§ÛŒ ØµØ­Øªâ€ŒØ³Ù†Ø¬ÛŒ Ø¯Ø± Ø§Ø¨ØªØ¯Ø§ÛŒ/Ø§Ù†ØªÙ‡Ø§ÛŒ Ø´ÛŒÙØª
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

// Ø²Ù…Ø§Ù†â€ŒØ¨Ù†Ø¯ÛŒ ØªØµØ§Ø¯ÙÛŒ ØµØ­Øªâ€ŒØ³Ù†Ø¬ÛŒ: Ø¯Ø± Ù‡Ø± Ø¨Ù„ÙˆÚ© Û´ Ø³Ø§Ø¹ØªÙ‡ØŒ Û³ Ø²Ù…Ø§Ù† Ù…Ø³ØªÙ‚Ù„ Ø¨Ø±Ø§ÛŒ Ù‡Ø± Ø­Ø¶ÙˆØ± Ø³Ø§Ø®ØªÙ‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯.
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
  // Ø­Ø¯Ø§Ú©Ø«Ø± Û²Û´ Ø³Ø§Ø¹Øª Ø¨Ø¹Ø¯ Ø§Ø² ÙˆØ±ÙˆØ¯Ø› ÙˆØ¶Ø¹ÛŒØª Ø¨Ø§Ø² Ø¨ÙˆØ¯Ù† Ø­Ø¶ÙˆØ± Ø¯Ø± Ú©Ø±ÙˆÙ† ØªØ¹ÛŒÛŒÙ† Ù…ÛŒâ€ŒÚ©Ù†Ø¯ Ú©Ù‡ Ø¨Ø¹Ø¯ Ø§Ø² Ø®Ø±ÙˆØ¬ Ú†ÛŒØ²ÛŒ Ø§Ø±Ø³Ø§Ù„ Ù†Ø´ÙˆØ¯.
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

// Ù¾ÛŒÚ©Ø±Ø¨Ù†Ø¯ÛŒ Ø¨Ø±Ø§ÛŒ Ø§Ù¾ Ù…ÙˆØ¨Ø§ÛŒÙ„: Ø¢ÛŒØ§ ÙØ¹Ø§Ù„ Ø§Ø³ØªØŒ Ø¢ÛŒØ§ Ø§ÛŒÙ† Ú©Ø§Ø±Ø¨Ø± Ù…Ø´Ù…ÙˆÙ„ Ø§Ø³ØªØŒ Ø¨Ø§Ø²Ù‡â€ŒÙ‡Ø§ÛŒ Ø³Ø§Ø¹ØªÛŒØŒ Ù…Ù‡Ù„Øª
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
    'alarm' => !isset($cfg['alarm']) ? true : !empty($cfg['alarm']), // ØµØ¯Ø§ÛŒ Ø¢Ù„Ø§Ø±Ù… Ù‡Ù†Ú¯Ø§Ù… ØµØ­Øªâ€ŒØ³Ù†Ø¬ÛŒ
    'audience' => $cfg['audience'] ?? 'all_required', // all_required | shift_only
    'server_push' => !isset($cfg['server_push']) ? true : !empty($cfg['server_push']),
    'random_enabled' => !empty($cfg['random_enabled']),
  ];
});

// Ø¨Ø±Ù†Ø§Ù…Ù‡Ù” Ø²Ù…Ø§Ù†â€ŒØ¨Ù†Ø¯ÛŒ ØªØµØ§Ø¯ÙÛŒ ÙØ¹Ø§Ù„ Ø¨Ø±Ø§ÛŒ Ø¬Ù„Ø³Ù‡Ù” Ø­Ø¶ÙˆØ± ÙØ¹Ù„ÛŒØ› Ø¨Ø±Ø§ÛŒ Ø¨Ø§Ø²ÛŒØ§Ø¨ÛŒ Ú©Ø´ Ø§Ù¾ Ù†ÛŒØ² Ø§Ø³ØªÙØ§Ø¯Ù‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯.
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

// Ø«Ø¨Øª ØµØ­Øªâ€ŒØ³Ù†Ø¬ÛŒ: Ø³Ù„ÙÛŒ + Ø¹Ú©Ø³ Ø®ÙˆØ¯Ø±ÙˆÙ‡Ø§ + Ù…ÙˆÙ‚Ø¹ÛŒØª
route('POST', '/api/my/presence-check', function($p,$b,$u){
  $slot = $b['slot'] ?? '';
  if (!preg_match('/^\d{2}:\d{2}$/', $slot)) Http::error('Ø¨Ø§Ø²Ù‡Ù” Ø³Ø§Ø¹ØªÛŒ Ù†Ø§Ù…Ø¹ØªØ¨Ø±', 400);
  $selfie = $b['selfie'] ?? '';
  $veh = $b['vehicles_photo'] ?? '';
  if (strpos($selfie,'data:image')!==0) Http::error('Ø¹Ú©Ø³ Ø³Ù„ÙÛŒ Ù„Ø§Ø²Ù… Ø§Ø³Øª', 400);
  if (strpos($veh,'data:image')!==0) Http::error('Ø¹Ú©Ø³ Ø®ÙˆØ¯Ø±ÙˆÙ‡Ø§ÛŒ Ø®Ø· Ù„Ø§Ø²Ù… Ø§Ø³Øª', 400);
  $date = date('Y-m-d');
  // Ø§Ú¯Ø± Ù‚Ø¨Ù„Ø§Ù‹ Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ø¨Ø§Ø²Ù‡ Ø«Ø¨Øª Ø´Ø¯Ù‡ØŒ Ø¨Ù‡â€ŒØ±ÙˆØ²Ø±Ø³Ø§Ù†ÛŒ
  $ex = Db::one("SELECT id FROM presence_checks WHERE user_id=? AND slot_date=? AND slot=?", [$u['id'],$date,$slot]);
  $_selfiePath = Media::saveBase64($selfie, 'presence', 960, 65);
  $_vehPath = Media::saveBase64($veh, 'presence', 1280, 68);
  if (!$_selfiePath || !$_vehPath) {
    if ($_selfiePath) Media::delete($_selfiePath);
    if ($_vehPath) Media::delete($_vehPath);
    Http::error('Ø°Ø®ÛŒØ±Ù‡ ØªØµØ§ÙˆÛŒØ± ØµØ­Øªâ€ŒØ³Ù†Ø¬ÛŒ Ø§Ù†Ø¬Ø§Ù… Ù†Ø´Ø¯. Ø¯ÙˆØ¨Ø§Ø±Ù‡ ØªÙ„Ø§Ø´ Ú©Ù†ÛŒØ¯.', 500);
  }
  if ($ex) {
    Db::run("UPDATE presence_checks SET selfie_path=?, vehicles_photo_path=?, lat=?, lng=?, captured_at=NOW() WHERE id=?",
      [$_selfiePath, $_vehPath, $b['lat']??null, $b['lng']??null, $ex['id']]);
    return ['ok'=>true, 'id'=>(int)$ex['id']];
  }
  $id = Db::insert("INSERT INTO presence_checks(user_id,slot,slot_date,selfie_path,vehicles_photo_path,lat,lng) VALUES(?,?,?,?,?,?,?)",
    [$u['id'],$slot,$date,$_selfiePath,$_vehPath,$b['lat']??null,$b['lng']??null]);
  return ['ok'=>true, 'id'=>$id];
});


// Ø§Ø±Ø³Ø§Ù„ Push ØµØ­Øªâ€ŒØ³Ù†Ø¬ÛŒ Ø­Ø¶ÙˆØ± Ø§Ø² Ø³Ù…Øª Ø³Ø±ÙˆØ±Ø› Ø¨Ø±Ø§ÛŒ Ú©Ø±ÙˆÙ† Ù‡Ø± Ø¯Ù‚ÛŒÙ‚Ù‡ Ø§Ø¬Ø±Ø§ Ø´ÙˆØ¯: /api/cron/presence-alert?key=CRON_KEY
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
    if ($now < $slotTs || $now > $slotTs + 70) continue; // ÙÙ‚Ø· Ù‡Ù…Ø§Ù† Ø­ÙˆØ§Ù„ÛŒ Ø´Ø±ÙˆØ¹ Ø¨Ø§Ø²Ù‡ØŒ Ø¬Ù„ÙˆÚ¯ÛŒØ±ÛŒ Ø§Ø² Ø§Ø±Ø³Ø§Ù„ ØªÚ©Ø±Ø§Ø±ÛŒ
    $users = Db::all("SELECT id, presence_required FROM users WHERE is_active=1 AND presence_required=1");
    $targets = [];
    foreach ($users as $usr) {
      if (!_presence_is_required_for_user((int)$usr['id'], $cfg, (bool)$usr['presence_required'], _presence_today_jdate(), $slotTs)) continue;
      $dup = Db::one("SELECT id FROM notifications WHERE user_id=? AND data LIKE ? AND created_at>=DATE_SUB(NOW(),INTERVAL 2 MINUTE) LIMIT 1", [(int)$usr['id'], '%\"presence_slot\":\"'.$sl.'\"%']);
      if ($dup) continue;
      $targets[] = (int)$usr['id'];
    }
    if ($targets) {
      Push::notify($targets, 'ØµØ­Øªâ€ŒØ³Ù†Ø¬ÛŒ Ø­Ø¶ÙˆØ±', "Ù„Ø·ÙØ§Ù‹ Ø¸Ø±Ù {$win} Ø¯Ù‚ÛŒÙ‚Ù‡ Ø³Ù„ÙÛŒ Ùˆ Ø¹Ú©Ø³ Ø®ÙˆØ¯Ø±ÙˆÙ‡Ø§ÛŒ Ø®Ø· Ø±Ø§ Ø§Ø±Ø³Ø§Ù„ Ú©Ù†ÛŒØ¯.", ['type'=>'presence_check','slot'=>$sl,'presence_slot'=>$sl,'window_minutes'=>$win]);
      $sent += count($targets);
    }
  }
  // Ø¯Ø± Ø­Ø§Ù„Øª ØªØµØ§Ø¯ÙÛŒØŒ Ø³Ø§Ø¹Øªâ€ŒÙ‡Ø§ÛŒ Ø¯Ø³ØªÛŒ Ø¹Ù…Ø¯Ø§Ù‹ Ù†Ø§Ø¯ÛŒØ¯Ù‡ Ú¯Ø±ÙØªÙ‡ Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯.
  // Ø²Ù…Ø§Ù†â€ŒØ¨Ù†Ø¯ÛŒ ØªØµØ§Ø¯ÙÛŒ: Ø²Ù…Ø§Ù†â€ŒÙ‡Ø§ Ø§Ø² Ù„Ø­Ø¸Ù‡Ù” Ø«Ø¨Øª ÙˆØ±ÙˆØ¯ Ù‡Ø± Ù¾Ø±Ø³Ù†Ù„ Ù…Ø³ØªÙ‚Ù„ Ù‡Ø³ØªÙ†Ø¯ Ùˆ ÙÙ‚Ø· ØªØ§ ÙˆÙ‚ØªÛŒ Ø­Ø¶ÙˆØ± Ø¨Ø§Ø² Ø§Ø³Øª Ø§Ø±Ø³Ø§Ù„ Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯.
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
            Push::notify([$uid],'ØµØ­Øªâ€ŒØ³Ù†Ø¬ÛŒ Ø­Ø¶ÙˆØ±',"Ù„Ø·ÙØ§Ù‹ Ø¸Ø±Ù {$itemWin} Ø¯Ù‚ÛŒÙ‚Ù‡ Ø³Ù„ÙÛŒ Ùˆ Ø¹Ú©Ø³ Ø®ÙˆØ¯Ø±ÙˆÙ‡Ø§ÛŒ Ø®Ø· Ø±Ø§ Ø§Ø±Ø³Ø§Ù„ Ú©Ù†ÛŒØ¯.",[
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

// ÙÙ‡Ø±Ø³Øª Ø§Ø±Ø³Ø§Ù„â€ŒÙ‡Ø§ (Ø§Ø¯Ù…ÛŒÙ† Ùˆ Ø±ÛŒÛŒØ³ Ø§Ø¯Ø§Ø±Ù‡ Ø¨Ø§Ø²Ø±Ø³ÛŒ)
// ØªØ¨Ø¯ÛŒÙ„ Ù…Ø®ØªØµØ§Øª Ø¨Ù‡ Ø¢Ø¯Ø±Ø³ (Ù†Ø§Ù… Ø®ÛŒØ§Ø¨Ø§Ù†) Ø¨Ø§ Ø³Ø±ÙˆÛŒØ³ Ù†Ø´Ø§Ù† + Ù†Ø²Ø¯ÛŒÚ©â€ŒØªØ±ÛŒÙ† Ø®Ø· Ú©Ø§Ø±Ø¨Ø±
route('GET', '/api/geo/reverse', function($p,$b,$u){
  $lat = (float)($_GET['lat'] ?? 0); $lng = (float)($_GET['lng'] ?? 0);
  if (!$lat || !$lng) Http::error('Ù…Ø®ØªØµØ§Øª Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª', 400);
  $out = ['lat'=>$lat, 'lng'=>$lng, 'address'=>null, 'street'=>null, 'neighbourhood'=>null];
  // ÙØ±Ø§Ø®ÙˆØ§Ù†ÛŒ Ø³Ø±ÙˆÛŒØ³ reverse Ù†Ø´Ø§Ù† (Ú©Ù„ÛŒØ¯ Ø³Ø±ÙˆÛŒØ³)
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
  // ÛŒØ§ÙØªÙ† Ù†Ø²Ø¯ÛŒÚ©â€ŒØªØ±ÛŒÙ† Ø®Ø· ØªØ¹Ø±ÛŒÙâ€ŒØ´Ø¯Ù‡ Ø¨Ø±Ø§ÛŒ Ú©Ø§Ø±Ø¨Ø± (Ø§Ø² Ø§ÛŒØ³ØªÚ¯Ø§Ù‡â€ŒÙ‡Ø§ÛŒ geofence Ø®Ø·ÙˆØ·)
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
  foreach ($rows as &$r) $r['captured_fa'] = fa_datetime($r['captured_at']); // ÙˆÙ‚Øª ØªÙ‡Ø±Ø§Ù† (Ø³Ø±ÙˆØ±)
  return $rows;
}, false, ADMIN);

// Ø³Ø±Ùˆ ØªØµÙˆÛŒØ± ØµØ­Øªâ€ŒØ³Ù†Ø¬ÛŒ (Ø¨Ø±Ø§ÛŒ Ù‡Ø§ÛŒÙ¾Ø±Ù„ÛŒÙ†Ú© Ø§Ú©Ø³Ù„) â€” Ø§Ø¹ØªØ¨Ø§Ø±Ø³Ù†Ø¬ÛŒ ØªÙˆÚ©Ù† Ø§Ø² Ú©ÙˆØ¦Ø±ÛŒ ÛŒØ§ Ù‡Ø¯Ø±
route('GET', '/api/presence-image/{id}', function($p,$b,$u){
  $tok = $_GET['token'] ?? Http::bearer();
  $payload = $tok ? Jwt::verify($tok, $GLOBALS['CONFIG']['jwt_secret']) : null;
  if (!$payload) { http_response_code(403); exit('forbidden'); }
  $type = ($_GET['type'] ?? 'selfie') === 'vehicles' ? 'vehicles_photo' : 'selfie';
  $pathCol = $type . '_path';
  $r = Db::one("SELECT $type img, $pathCol pth FROM presence_checks WHERE id=?", [$p['id']]);
  if (!$r) { http_response_code(404); exit('not found'); }
  if (!empty($r['pth'])) { Media::serve($r['pth']); } // Ø®Ø±ÙˆØ¬ÛŒ ÙØ§ÛŒÙ„ + exit
  if (!$r['img']) { http_response_code(404); exit('not found'); }
  $data = $r['img'];
  // data:image/...;base64,XXXX  â†’ Ø®Ø±ÙˆØ¬ÛŒ Ø¨Ø§ÛŒÙ†Ø±ÛŒ
  if (preg_match('/^data:(image\/\w+);base64,(.*)$/s', $data, $m)) {
    header('Content-Type: '.$m[1]);
    echo base64_decode($m[2]); exit;
  }
  header('Content-Type: image/jpeg'); echo $data; exit;
}, true);

// Ø®Ø±ÙˆØ¬ÛŒ Ø§Ú©Ø³Ù„ ØµØ­Øªâ€ŒØ³Ù†Ø¬ÛŒ Ø­Ø¶ÙˆØ± Ø¨Ø§ Ù‡Ø§ÛŒÙ¾Ø±Ù„ÛŒÙ†Ú© Ø¹Ú©Ø³â€ŒÙ‡Ø§
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
  // ØªÙˆÚ©Ù† Ú©ÙˆØªØ§Ù‡ Ø¨Ø±Ø§ÛŒ Ù„ÛŒÙ†Ú©â€ŒÙ‡Ø§ (Ø§Ø² Ù‡Ø¯Ø± ÙØ¹Ù„ÛŒ Ø§Ø¯Ù…ÛŒÙ†)
  $tok = Http::bearer();
  $base = (isset($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off'?'https':'http').'://'.($_SERVER['HTTP_HOST'] ?? '').'/api/presence-image/';
  $SLOT = ['morning'=>'ØµØ¨Ø­','noon'=>'Ø¸Ù‡Ø±','evening'=>'Ø¹ØµØ±','1'=>'Ø¨Ø§Ø²Ù‡Ù” Û±','2'=>'Ø¨Ø§Ø²Ù‡Ù” Û²','3'=>'Ø¨Ø§Ø²Ù‡Ù” Û³'];
  header('Content-Type: text/csv; charset=UTF-8');
  header('Content-Disposition: attachment; filename="presence_'.$from.'_'.$to.'.csv"');
  echo "\xEF\xBB\xBF"; $out=fopen('php://output','w');
  fputcsv($out, ['Ù†Ø§Ù…','Ø³Ù…Øª','ØªØ§Ø±ÛŒØ®','Ø¨Ø§Ø²Ù‡','Ø²Ù…Ø§Ù† Ø¯Ø±ÛŒØ§ÙØª (ØªÙ‡Ø±Ø§Ù†)','Ø¹Ø±Ø¶ Ø¬ØºØ±Ø§ÙÛŒØ§ÛŒÛŒ','Ø·ÙˆÙ„ Ø¬ØºØ±Ø§ÙÛŒØ§ÛŒÛŒ','Ø¹Ú©Ø³ Ø³Ù„ÙÛŒ','Ø¹Ú©Ø³ Ø®ÙˆØ¯Ø±ÙˆÙ‡Ø§']);
  foreach ($rows as $r) {
    $selfie = $r['has_selfie'] ? '=HYPERLINK("'.$base.$r['id'].'?type=selfie&token='.$tok.'","Ù…Ø´Ø§Ù‡Ø¯Ù‡Ù” Ø³Ù„ÙÛŒ")' : 'â€”';
    $veh = $r['has_vehicles'] ? '=HYPERLINK("'.$base.$r['id'].'?type=vehicles&token='.$tok.'","Ù…Ø´Ø§Ù‡Ø¯Ù‡Ù” Ø®ÙˆØ¯Ø±ÙˆÙ‡Ø§")' : 'â€”';
    fputcsv($out, [$r['name'], $r['role'], $r['slot_date'], $SLOT[$r['slot']]??$r['slot'], fa_datetime($r['captured_at']), $r['lat'], $r['lng'], $selfie, $veh]);
  }
  fclose($out); exit;
}, false, ADMIN);

// ØªØµØ§ÙˆÛŒØ± ÛŒÚ© Ø«Ø¨Øª Ø®Ø§Øµ
route('GET', '/api/admin/presence-checks/{id}', function($p,$b,$u){
  $r = Db::one("SELECT pc.*, CONCAT(us.first_name,' ',us.last_name) name FROM presence_checks pc JOIN users us ON us.id=pc.user_id WHERE pc.id=?", [$p['id']]);
  if (!$r) Http::error('ÛŒØ§ÙØª Ù†Ø´Ø¯', 404);
  // ØªØµØ§ÙˆÛŒØ± Ø±Ø§ Ø¨Ù‡ URL Ø¨Ø§ ØªÙˆÚ©Ù† ØªØ¨Ø¯ÛŒÙ„ Ú©Ù† (endpoint presence-image Ø§Ø² ÙØ§ÛŒÙ„ ÛŒØ§ base64 Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒ Ù…ÛŒâ€ŒÚ©Ù†Ø¯)
  $tok = $_GET['token'] ?? Http::bearer();
  $hasSelfie = !empty($r['selfie_path']) || !empty($r['selfie']);
  $hasVeh = !empty($r['vehicles_photo_path']) || !empty($r['vehicles_photo']);
  $r['selfie'] = $hasSelfie ? ('/api/presence-image/'.$r['id'].'?type=selfie&token='.urlencode($tok)) : null;
  $r['vehicles_photo'] = $hasVeh ? ('/api/presence-image/'.$r['id'].'?type=vehicles&token='.urlencode($tok)) : null;
  unset($r['selfie_path'], $r['vehicles_photo_path']);
  return $r;
}, false, ADMIN);

// ØªØ®Ù„ÙØ§Øª Ø¹Ø¯Ù… Ø§Ø±Ø³Ø§Ù„ ØµØ­Øªâ€ŒØ³Ù†Ø¬ÛŒ (Ù¾ÙˆÛŒØ§): Ø¨Ø±Ø§ÛŒ Ù‡Ø± Ú©Ø§Ø±Ø¨Ø± Ù…Ø´Ù…ÙˆÙ„ Ã— Ù‡Ø± Ø¨Ø§Ø²Ù‡Ù” Ú¯Ø°Ø´ØªÙ‡ Ú©Ù‡ Ø«Ø¨Øª Ù†Ú©Ø±Ø¯Ù‡
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
        $out[]=['user_id'=>(int)$row['user_id'],'name'=>$row['name'],'role'=>$row['role'],'slot_date'=>$ds,'slot'=>$slot,'type'=>'Ø¹Ø¯Ù… Ø§Ø±Ø³Ø§Ù„ ØµØ­Øªâ€ŒØ³Ù†Ø¬ÛŒ Ø­Ø¶ÙˆØ±'];
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
          $out[] = ['user_id'=>(int)$usr['id'],'name'=>$usr['name'],'role'=>$usr['role'],'slot_date'=>$ds,'slot'=>$sl,'type'=>'Ø¹Ø¯Ù… Ø§Ø±Ø³Ø§Ù„ ØµØ­Øªâ€ŒØ³Ù†Ø¬ÛŒ Ø­Ø¶ÙˆØ±'];
        }
      }
    }
  }
  return $out;
}, false, ADMIN);

// ---------------- Ù¾ÛŒØ§Ù…Ú© (Ù†Ú¯ÛŒÙ† Ø§Ø±ØªØ¨Ø§Ø·) ----------------
// Ø§Ø¹ØªØ¨Ø§Ø± Ø¨Ø§Ù‚ÛŒÙ…Ø§Ù†Ø¯Ù‡ (Ø§Ø¯Ù…ÛŒÙ†)
route('GET', '/api/admin/sms/credit', fn($p,$b,$u) => Sms::credit(), false, ADMIN);

// Ø±Ø§Ù†Ù†Ø¯Ú¯Ø§Ù†/Ø®ÙˆØ¯Ø±ÙˆÙ‡Ø§ÛŒ ÙØ§Ù‚Ø¯ Ù¾Ø±ÙˆØ§Ù†Ù‡Ù” Ø¨Ù‡Ø±Ù‡â€ŒØ¨Ø±Ø¯Ø§Ø±ÛŒ Ù…Ø¹ØªØ¨Ø± (Ø¨Ø±Ø§ÛŒ Ù¾ÛŒØ§Ù…Ú© Ùˆ ØªØ°Ú©Ø±)
route('GET', '/api/my/no-oplic', function($p,$b,$u){
  $lineIds = user_line_ids($u); // null=Ù‡Ù…Ù‡ØŒ Ø¢Ø±Ø§ÛŒÙ‡=Ù…Ø­Ø¯ÙˆØ¯
  $where = "(d.op_lic_status IS NULL OR d.op_lic_status NOT LIKE '%ÙØ¹Ø§Ù„%' OR d.op_lic_status='Ù…Ù†Ù‚Ø¶ÛŒ' OR d.op_lic_status='')";
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

// Ø§Ø±Ø³Ø§Ù„ Ù¾ÛŒØ§Ù…Ú© Ø¨Ù‡ Ø±Ø§Ù†Ù†Ø¯Ù‡â€ŒØ§ÛŒ Ú©Ù‡ Ø¨Ù‡Ø±Ù‡â€ŒØ¨Ø±Ø¯Ø§Ø±ÛŒ Ù†Ø¯Ø§Ø±Ø¯
route('POST', '/api/admin/oplic-sms', function($p,$b,$u){
  if (!_can_send_sms($u)) Http::error('Ø´Ù…Ø§ Ø¯Ø³ØªØ±Ø³ÛŒ Ø§Ø±Ø³Ø§Ù„ Ù¾ÛŒØ§Ù…Ú© Ù†Ø¯Ø§Ø±ÛŒØ¯', 403);
  if (!Sms::isEnabled()) Http::error('Ø³Ø±ÙˆÛŒØ³ Ù¾ÛŒØ§Ù…Ú© ÙØ¹Ø§Ù„ Ù†ÛŒØ³Øª', 400);
  $nid = trim($b['national_id'] ?? '');
  if ($nid === '') Http::error('Ú©Ø¯ Ù…Ù„ÛŒ Ù„Ø§Ø²Ù… Ø§Ø³Øª', 400);
  $drv = Db::one("SELECT first_name,last_name,mobile FROM drivers WHERE national_id=?", [$nid]);
  if (!$drv || empty($drv['mobile'])) Http::error('Ø±Ø§Ù†Ù†Ø¯Ù‡ ÛŒØ§ Ù…ÙˆØ¨Ø§ÛŒÙ„ ÛŒØ§ÙØª Ù†Ø´Ø¯', 404);
  $tpl = _req_setting('oplic_sms_template', 'ØªØ§Ú©Ø³ÛŒØ±Ø§Ù† Ú¯Ø±Ø§Ù…ÛŒ {name}ØŒ Ù¾Ø±ÙˆØ§Ù†Ù‡Ù” Ø¨Ù‡Ø±Ù‡â€ŒØ¨Ø±Ø¯Ø§Ø±ÛŒ Ø®ÙˆØ¯Ø±ÙˆÛŒ Ø´Ù…Ø§ Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª. Ù„Ø·ÙØ§Ù‹ Ø¬Ù‡Øª ØªÙ…Ø¯ÛŒØ¯ Ø§Ù‚Ø¯Ø§Ù… ÙØ±Ù…Ø§ÛŒÛŒØ¯.');
  $msg = strtr($tpl, ['{name}'=>trim(($drv['first_name']??'').' '.($drv['last_name']??''))]);
  try { Sms::send([$drv['mobile']], $msg, 'oplic', $u['id']); } catch (\Throwable $e) { Http::error('Ø§Ø±Ø³Ø§Ù„ Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯', 500); }
  return ['ok'=>true];
});

// Ù…Ø§Ù†Ø¯Ù‡ Ø§Ø¹ØªØ¨Ø§Ø± + ØªØ¹Ø¯Ø§Ø¯ Ù¾ÛŒØ§Ù…Ú© ÙØ§Ø±Ø³ÛŒ/Ø§Ù†Ú¯Ù„ÛŒØ³ÛŒ Ù‚Ø§Ø¨Ù„ Ø§Ø±Ø³Ø§Ù„ Ø¨Ø± Ø§Ø³Ø§Ø³ Ù‡Ø²ÛŒÙ†Ù‡Ù” Ù‡Ø± Ù¾ÛŒØ§Ù…Ú©
route('GET', '/api/admin/sms/capacity', function($p,$b,$u){
  $credit = Sms::isEnabled() ? Sms::credit() : null;
  // credit Ù…Ù…Ú©Ù† Ø§Ø³Øª Ø¹Ø¯Ø¯ ÛŒØ§ Ø¢Ø±Ø§ÛŒÙ‡ Ø¨Ø§Ø´Ø¯
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
// Ù…Ø­Ø¯ÙˆØ¯ÛŒØª Ø§Ø±Ø³Ø§Ù„ Ø±ÙˆØ²Ø§Ù†Ù‡Ù” Ú©Ù„
route('GET', '/api/admin/sms/limit', function($p,$b,$u){
  $g = function($k) { $r=Db::one("SELECT value FROM app_settings WHERE `key`=?",[$k]); return $r ? json_decode($r['value'],true) : null; };
  return ['global_limit'=>(int)($g('sms_daily_limit')??0), 'credit'=>Sms::isEnabled() ? Sms::credit() : null];
}, false, ADMIN);
route('POST', '/api/admin/sms/limit', function($p,$b,$u){
  // Ù…Ø­Ø¯ÙˆØ¯ÛŒØª Ú©Ù„ÛŒ Ø±ÙˆØ²Ø§Ù†Ù‡ Ø¨Ø±Ø§ÛŒ Ù‡Ù…Ù‡Ù” Ú©Ø§Ø±Ø¨Ø±Ø§Ù†
  Db::run("INSERT INTO app_settings(`key`,value) VALUES('sms_daily_limit',?) ON DUPLICATE KEY UPDATE value=VALUES(value)", [json_encode((int)($b['global_limit']??0))]);
  // Ù…Ø­Ø¯ÙˆØ¯ÛŒØªâ€ŒÙ‡Ø§ÛŒ Ø§Ø®ØªØµØ§ØµÛŒ Ù‡Ø± Ú©Ø§Ø±Ø¨Ø± (Ø¢Ø±Ø§ÛŒÙ‡Ù” [{user_id, limit}])
  if (!empty($b['user_limits']) && is_array($b['user_limits'])) {
    foreach ($b['user_limits'] as $ul) {
      $uid = (int)($ul['user_id']??0); $lim = (int)($ul['limit']??0);
      if (!$uid) continue;
      Db::run("INSERT INTO app_settings(`key`,value) VALUES(?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)", ["sms_limit_user_{$uid}", json_encode($lim)]);
    }
  }
  return ['ok'=>true];
}, false, ADMIN);
// Ø§Ø¹ØªØ¨Ø§Ø± Ø§Ù…Ø±ÙˆØ² Ù‡Ø± Ú©Ø§Ø±Ø¨Ø±
route('GET', '/api/admin/sms/usage', function($p,$b,$u){
  return Db::all("SELECT sent_by, u.first_name, u.last_name, COUNT(*) sent_today FROM sms_log sl JOIN users u ON u.id=sl.sent_by WHERE DATE(sl.created_at)=CURDATE() GROUP BY sl.sent_by ORDER BY sent_today DESC", []);
}, false, ADMIN);
// Ø§Ø±Ø³Ø§Ù„ Ø¢Ø²Ù…Ø§ÛŒØ´ÛŒ (Ø§Ø¯Ù…ÛŒÙ†)
route('POST', '/api/admin/sms/test', function($p,$b,$u){
  $to = trim($b['mobile'] ?? ''); if ($to==='') Http::error('Ø´Ù…Ø§Ø±Ù‡Ù” Ù…Ù‚ØµØ¯ Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯',400);
  return Sms::send([$to], $b['message'] ?? 'Ù¾ÛŒØ§Ù… Ø¢Ø²Ù…Ø§ÛŒØ´ÛŒ Ø³Ø§Ù…Ø§Ù†Ù‡Ù” Ù…Ø¯ÛŒØ±ÛŒØª Ø®Ø·ÙˆØ·', 'test', $u['id']);
}, false, ADMIN);

// Ù‚Ø§Ù„Ø¨â€ŒÙ‡Ø§ÛŒ Ù¾ÛŒØ§Ù…Ú© ØªØ¹Ø±ÛŒÙâ€ŒØ´Ø¯Ù‡ ØªÙˆØ³Ø· Ø§Ø¯Ù…ÛŒÙ† (ÙÛŒÙ„ØªØ±Ø´Ø¯Ù‡ Ø¨Ø± Ø§Ø³Ø§Ø³ Ø¯Ø³ØªØ±Ø³ÛŒ Ù†Ù‚Ø´Ù Ú©Ø§Ø±Ø¨Ø±)
route('GET', '/api/sms/templates', function($p,$b,$u){
  $r = Db::one("SELECT value FROM app_settings WHERE `key`='sms_templates'");
  $all = $r ? (json_decode($r['value'], true) ?: []) : [];
  $roleId = (int)($u['role_id'] ?? 0);
  $isAdmin = !empty($u['is_admin']);
  $out = [];
  foreach ($all as $t) {
    $roles = $t['roles'] ?? null; // null/Ø®Ø§Ù„ÛŒ = Ø¨Ø±Ø§ÛŒ Ù‡Ù…Ù‡
    if ($isAdmin || empty($roles) || !is_array($roles) || in_array($roleId, array_map('intval',$roles))) {
      $out[] = ['title'=>$t['title'] ?? '', 'body'=>$t['body'] ?? '', 'category'=>$t['category'] ?? ''];
    }
  }
  return $out;
});

// Ø±Ø§Ù†Ù†Ø¯Ú¯Ø§Ù† Ø®Ø·ÙˆØ·Ù Ú©Ø§Ø±Ø¨Ø± Ø¬Ø§Ø±ÛŒ (Ø¨Ø±Ø§ÛŒ Ø§Ù†ØªØ®Ø§Ø¨ Ú¯ÛŒØ±Ù†Ø¯Ù‡) â€” idØŒ Ù†Ø§Ù…ØŒ Ù…ÙˆØ¨Ø§ÛŒÙ„
route('GET', '/api/my/sms-drivers', function($p,$b,$u){
  // Ø®Ø·ÙˆØ· Ù…Ø¬Ø§Ø² Ú©Ø§Ø±Ø¨Ø± (ØªØ§Ø¨Ø¹ Ø§Ø³ØªØ§Ù†Ø¯Ø§Ø±Ø¯: Ø¢Ø±Ø§ÛŒÙ‡ Ø®Ø·ÙˆØ·ØŒ null Ø¨Ø±Ø§ÛŒ Ø§Ø¯Ù…ÛŒÙ†Ù Ø¨Ø¯ÙˆÙ†â€ŒØ®Ø·ØŒ [] Ø¨Ø±Ø§ÛŒ ØºÛŒØ±Ø§Ø¯Ù…ÛŒÙ† Ø¨Ø¯ÙˆÙ†â€ŒØ®Ø·)
  $ids = user_line_ids($u);
  // Ø§Ø¯Ù…ÛŒÙ† Ø¨Ø¯ÙˆÙ† Ø®Ø· Ù…Ø´Ø®Øµ â†’ Ù‡Ù…Ù‡Ù” Ø±Ø§Ù†Ù†Ø¯Ú¯Ø§Ù† Ø¯Ø§Ø±Ø§ÛŒ Ù…ÙˆØ¨Ø§ÛŒÙ„
  if ($ids === null) {
    return Db::all(
      "SELECT DISTINCT d.id, CONCAT(COALESCE(d.first_name,''),' ',COALESCE(d.last_name,'')) name, d.mobile,
              (SELECT v.line_id FROM vehicle_drivers vd JOIN vehicles v ON v.id=vd.vehicle_id WHERE vd.driver_id=d.id LIMIT 1) line_id
       FROM drivers d WHERE d.mobile IS NOT NULL AND d.mobile<>'' ORDER BY d.last_name LIMIT 5000");
  }
  if (!is_array($ids) || !$ids) return [];
  $in = implode(',', array_fill(0, count($ids), '?'));
  // Ø§ØªØµØ§Ù„ ØµØ­ÛŒØ­ Ø±Ø§Ù†Ù†Ø¯Ù‡â†’Ø®Ø· Ø§Ø² Ø·Ø±ÛŒÙ‚ vehicle_drivers â†’ vehicles.line_id
  return Db::all(
    "SELECT DISTINCT d.id, CONCAT(COALESCE(d.first_name,''),' ',COALESCE(d.last_name,'')) name, d.mobile, v.line_id
     FROM drivers d
     JOIN vehicle_drivers vd ON vd.driver_id=d.id
     JOIN vehicles v ON v.id=vd.vehicle_id
     WHERE v.line_id IN ($in) AND d.mobile IS NOT NULL AND d.mobile<>'' ORDER BY d.last_name LIMIT 5000", $ids);
});

// Ø§Ø±Ø³Ø§Ù„ Ù¾ÛŒØ§Ù…Ú© Ø¨Ù‡ Ø±Ø§Ù†Ù†Ø¯Ú¯Ø§Ù† Ùˆ/ÛŒØ§ Ø´Ù…Ø§Ø±Ù‡â€ŒÙ‡Ø§ÛŒ Ø¯Ø³ØªÛŒ (Ú©Ø§Ø±Ø¨Ø± Ù…Ø¬Ø§Ø²)
// ===== Ù¾ÛŒØ§Ù…Ú© Ú¯Ø±ÙˆÙ‡ÛŒ Ø¢Ø¨ÙˆÙ†Ù…Ø§Ù† =====
// Ù¾ÛŒØ´â€ŒÙ†Ù…Ø§ÛŒØ´: Ø±Ø§Ù†Ù†Ø¯Ú¯Ø§Ù†ÛŒ Ú©Ù‡ ÙÛŒØ´ Ù¾Ø±Ø¯Ø§Ø®Øªâ€ŒÙ†Ø´Ø¯Ù‡ Ø¯Ø§Ø±Ù†Ø¯ (ÙÛŒÙ„ØªØ± Ø¨Ø± Ø§Ø³Ø§Ø³ ØªØ§Ø±ÛŒØ® ÙÛŒØ´ Ùˆ Ø®Ø·)
// Ù„ÛŒØ³Øª ØªØ§Ø±ÛŒØ®â€ŒÙ‡Ø§ÛŒ ÙÛŒØ´ Ù…ÙˆØ¬ÙˆØ¯ Ø¯Ø± Ø¯ÛŒØªØ§Ø¨ÛŒØ³ + Ø®Ø·ÙˆØ· Ø¯Ø± Ø¯Ø³ØªØ±Ø³ Ú©Ø§Ø±Ø¨Ø± (Ø¨Ø±Ø§ÛŒ Ø¯Ø±Ø§Ù¾â€ŒØ¯Ø§ÙˆÙ†)
route('GET', '/api/admin/bill-sms/options', function($p,$b,$u){
  if (!_can_send_sms($u)) Http::error('Ø´Ù…Ø§ Ø¯Ø³ØªØ±Ø³ÛŒ Ø§Ø±Ø³Ø§Ù„ Ù¾ÛŒØ§Ù…Ú© Ù†Ø¯Ø§Ø±ÛŒØ¯', 403);
  $dates = array_column(Db::all("SELECT DISTINCT pay_date FROM bills WHERE pay_date IS NOT NULL AND pay_date <> '' ORDER BY pay_date DESC LIMIT 500"), 'pay_date');
  // Ø®Ø·ÙˆØ· Ø¯Ø± Ø¯Ø³ØªØ±Ø³ Ú©Ø§Ø±Ø¨Ø±
  $myLines = user_line_ids($u); // null=Ù‡Ù…Ù‡ (Ø§Ø¯Ù…ÛŒÙ†)ØŒ Ø¢Ø±Ø§ÛŒÙ‡=Ù…Ø­Ø¯ÙˆØ¯
  if (is_array($myLines) && $myLines) {
    $in = implode(',', array_fill(0, count($myLines), '?'));
    $lines = Db::all("SELECT id, code, origin, destination FROM `lines` WHERE id IN ($in) ORDER BY code", $myLines);
  } else {
    $lines = Db::all("SELECT id, code, origin, destination FROM `lines` ORDER BY code");
  }
  // Ù…Ø®Ø§Ø·Ø¨ÛŒÙ† Ø°Ø®ÛŒØ±Ù‡â€ŒØ´Ø¯Ù‡Ù” Ú©Ø§Ø±Ø¨Ø± Ø¨Ø±Ø§ÛŒ Ú¯ÛŒØ±Ù†Ø¯Ú¯Ø§Ù† Ø®Ø§Ø±Ø¬ Ø§Ø² Ù„ÛŒØ³Øª
  $contacts = [];
  try { $contacts = Db::all("SELECT id, name, phone FROM sms_contacts WHERE user_id=? ORDER BY name", [$u['id']]); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  return ['dates'=>$dates, 'lines'=>$lines, 'contacts'=>$contacts];
}, false, 1);

// Ø³Ø§Ø®Øª Ø´Ø±Ø· Ù…Ø´ØªØ±Ú© Ø¨Ø±Ø§ÛŒ ÙÛŒÙ„ØªØ± ÙÛŒØ´â€ŒÙ‡Ø§
function _bill_filter($b, $u) {
  // Ù¾Ø±Ø¯Ø§Ø®Øªâ€ŒÙ†Ø´Ø¯Ù‡ = Ù‡Ø± Ú†ÛŒØ²ÛŒ Ú©Ù‡ Ø´Ø§Ù…Ù„ Â«Ù¾Ø±Ø¯Ø§Ø®Øª Ø´Ø¯Ù‡Â»/Â«Ù¾Ø±Ø¯Ø§Ø®Øªâ€ŒØ´Ø¯Ù‡Â» Ù†Ø¨Ø§Ø´Ø¯ (Ù…Ù‚Ø§ÙˆÙ… Ø¨Ù‡ Ù†ÛŒÙ…â€ŒÙØ§ØµÙ„Ù‡)
  $where = "(status IS NULL OR (REPLACE(status,'â€Œ','') NOT LIKE '%Ù¾Ø±Ø¯Ø§Ø®Øª Ø´Ø¯Ù‡%' AND REPLACE(status,'â€Œ','') NOT LIKE '%Ù¾Ø±Ø¯Ø§Ø®ØªØ´Ø¯Ù‡%'))"; $params = [];
  $fromD = trim($b['from_date'] ?? ''); $toD = trim($b['to_date'] ?? '');
  $payDate = trim($b['pay_date'] ?? '');
  if ($payDate !== '') { $where .= " AND pay_date = ?"; $params[] = $payDate; }
  elseif ($fromD !== '' && $toD !== '') { $where .= " AND pay_date BETWEEN ? AND ?"; $params[] = $fromD; $params[] = $toD; }
  elseif ($fromD !== '') { $where .= " AND pay_date >= ?"; $params[] = $fromD; }
  elseif ($toD !== '') { $where .= " AND pay_date <= ?"; $params[] = $toD; }
  // Ú†Ù†Ø¯ Ø®Ø· (Ø¢Ø±Ø§ÛŒÙ‡Ù” Ú©Ø¯Ù‡Ø§ÛŒ Ø®Ø·) ÛŒØ§ ÛŒÚ© Ø®Ø· Ù…ØªÙ†ÛŒ
  // ØªØ·Ø¨ÛŒÙ‚ Ø¯Ù‚ÛŒÙ‚: Ú©Ø¯ Ø®Ø· Ù‡Ù…ÛŒØ´Ù‡ Ø§Ø¨ØªØ¯Ø§ÛŒ line_text Ø§Ø³Øª (Ù‚Ø§Ù„Ø¨: Â«Ú©Ø¯ - Ù…Ø¨Ø¯Ø£ - Ù…Ù‚ØµØ¯Â»)
  // Ù¾Ø³ Ø§Ø² LIKE 'code -%' ÛŒØ§ ØªØ³Ø§ÙˆÛŒ Ø¯Ù‚ÛŒÙ‚ Ø§Ø³ØªÙØ§Ø¯Ù‡ Ù…ÛŒâ€ŒÚ©Ù†ÛŒÙ… ØªØ§ Ø®Ø· Û± Ø¨Ø§ Û±Û°Û°ØŒ Û²Û±Û² Ùˆâ€¦ Ø§Ø´ØªØ¨Ø§Ù‡ Ù†Ø´ÙˆØ¯.
  $lineMatch = function($lc) {
    $lc = trim($lc);
    // Ø§Ù„Ú¯ÙˆÙ‡Ø§: Â«1 - ...Â» ÛŒØ§ Â«1- ...Â» ÛŒØ§ Ø¯Ù‚ÛŒÙ‚Ø§Ù‹ Â«1Â» ÛŒØ§ Â«1 Â»
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
  if (!_can_send_sms($u)) Http::error('Ø´Ù…Ø§ Ø¯Ø³ØªØ±Ø³ÛŒ Ø§Ø±Ø³Ø§Ù„ Ù¾ÛŒØ§Ù…Ú© Ù†Ø¯Ø§Ø±ÛŒØ¯', 403);
  list($where, $params) = _bill_filter($b, $u);
  // Ø´Ù…Ø§Ø±Ø´ Ú©Ù„ ÙÛŒØ´â€ŒÙ‡Ø§ÛŒ Ù…Ù†Ø·Ø¨Ù‚ Ø¨Ø§ ÙÛŒÙ„ØªØ± (Ø¨Ø¯ÙˆÙ† Ø´Ø±Ø· Ù…ÙˆØ¨Ø§ÛŒÙ„) Ø¨Ø±Ø§ÛŒ ØªØ´Ø®ÛŒØµ
  $totalMatch = (int)(Db::one("SELECT COUNT(*) n, COALESCE(SUM(amount),0) s FROM bills WHERE $where", $params)['n'] ?? 0);
  $noPhone = (int)(Db::one("SELECT COUNT(*) n FROM bills WHERE $where AND (phone IS NULL OR phone='')", $params)['n'] ?? 0);
  // Ù‡Ø± ÙÛŒØ´ Ø¨Ù‡â€ŒØµÙˆØ±Øª Ø¬Ø¯Ø§Ú¯Ø§Ù†Ù‡ (Ù†Ù‡ Ú¯Ø±ÙˆÙ‡â€ŒØ¨Ù†Ø¯ÛŒ per phone) â€” Ù…Ø§Ù†Ù†Ø¯ Ù¾ÛŒØ§Ù…Ú© ØªÚ©ÛŒ
  $rows = Db::all("SELECT bill_id, pay_id, person_title, national_id, amount, phone, plate, line_text
    FROM bills WHERE $where AND phone IS NOT NULL AND phone <> '' ORDER BY amount DESC LIMIT 5000", $params);
  $totalAmount = array_sum(array_map(fn($r)=>(int)$r['amount'], $rows));
  $tpl = _req_setting('bill_bulk_sms_template', "Ø±Ø§Ù†Ù†Ø¯Ù‡ Ú¯Ø±Ø§Ù…ÛŒ {name}ØŒ Ù‚Ø¨Ø¶ Ø¢Ø¨ÙˆÙ†Ù…Ø§Ù† Ø´Ù…Ø§ Ø¨Ù‡ Ø´Ù†Ø§Ø³Ù‡Ù” {bill_id} Ùˆ Ù…Ø¨Ù„Øº {amount} Ø±ÛŒØ§Ù„ Ø¯Ø± Ø§Ù†ØªØ¸Ø§Ø± Ù¾Ø±Ø¯Ø§Ø®Øª Ø§Ø³Øª. Ù¾Ø±Ø¯Ø§Ø®Øª Ø¢Ù†Ù„Ø§ÛŒÙ†:\n{pay_url}");
  $mk = function($r) use ($tpl) {
    $payUrl = (!empty($r['bill_id']) && !empty($r['pay_id']))
      ? "https://epay.mashhad.ir/CityUsers/OnLineBillPay.aspx?BillId={$r['bill_id']}&PayId={$r['pay_id']}&Cell={$r['phone']}" : '';
    return strtr($tpl, [
      '{name}'=>$r['person_title']?:'Ø±Ø§Ù†Ù†Ø¯Ù‡', '{bill_id}'=>$r['bill_id']?:'', '{pay_id}'=>$r['pay_id']?:'',
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
  if (!_can_send_sms($u)) Http::error('Ø´Ù…Ø§ Ø¯Ø³ØªØ±Ø³ÛŒ Ø§Ø±Ø³Ø§Ù„ Ù¾ÛŒØ§Ù…Ú© Ù†Ø¯Ø§Ø±ÛŒØ¯', 403);
  if (!Sms::isEnabled()) Http::error('Ø³Ø±ÙˆÛŒØ³ Ù¾ÛŒØ§Ù…Ú© Ù¾ÛŒÚ©Ø±Ø¨Ù†Ø¯ÛŒ Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª', 400);
  list($where, $params) = _bill_filter($b, $u);
  // Ù‡Ø± ÙÛŒØ´ Ø¬Ø¯Ø§Ú¯Ø§Ù†Ù‡ Ø§Ø±Ø³Ø§Ù„ Ù…ÛŒâ€ŒØ´ÙˆØ¯ (Ø´Ø§Ù…Ù„ Ø´Ù†Ø§Ø³Ù‡Ù” Ù‚Ø¨Ø¶/Ù¾Ø±Ø¯Ø§Ø®Øª/Ù…Ø¨Ù„Øº/Ù„ÛŒÙ†Ú© Ø¯Ø±Ú¯Ø§Ù‡)
  $rows = Db::all("SELECT bill_id, pay_id, person_title, amount, phone, plate, line_text
    FROM bills WHERE $where AND phone IS NOT NULL AND phone <> '' ORDER BY amount DESC LIMIT 5000", $params);
  if (!$rows) Http::error('Ù‡ÛŒÚ† ÙÛŒØ´ Ø¨Ø¯Ù‡ÛŒ Ø¨Ø§ Ø§ÛŒÙ† ÙÛŒÙ„ØªØ± ÛŒØ§ÙØª Ù†Ø´Ø¯', 404);
  $tpl = _req_setting('bill_bulk_sms_template', "Ø±Ø§Ù†Ù†Ø¯Ù‡ Ú¯Ø±Ø§Ù…ÛŒ {name}ØŒ Ù‚Ø¨Ø¶ Ø¢Ø¨ÙˆÙ†Ù…Ø§Ù† Ø´Ù…Ø§ Ø¨Ù‡ Ø´Ù†Ø§Ø³Ù‡Ù” {bill_id} Ùˆ Ù…Ø¨Ù„Øº {amount} Ø±ÛŒØ§Ù„ Ø¯Ø± Ø§Ù†ØªØ¸Ø§Ø± Ù¾Ø±Ø¯Ø§Ø®Øª Ø§Ø³Øª. Ù¾Ø±Ø¯Ø§Ø®Øª Ø¢Ù†Ù„Ø§ÛŒÙ†:\n{pay_url}");
  $sent = 0; $failed = 0;
  $campaign = 'bill_bulk_' . date('YmdHis');
  $lastMsg = '';
  foreach ($rows as $r) {
    $payUrl = (!empty($r['bill_id']) && !empty($r['pay_id']))
      ? "https://epay.mashhad.ir/CityUsers/OnLineBillPay.aspx?BillId={$r['bill_id']}&PayId={$r['pay_id']}&Cell={$r['phone']}" : '';
    $msg = strtr($tpl, [
      '{name}'=>$r['person_title']?:'Ø±Ø§Ù†Ù†Ø¯Ù‡', '{bill_id}'=>$r['bill_id']?:'', '{pay_id}'=>$r['pay_id']?:'',
      '{amount}'=>number_format((int)$r['amount']), '{plate}'=>$r['plate']?:'', '{line}'=>$r['line_text']?:'', '{pay_url}'=>$payUrl,
    ]);
    $lastMsg = $msg;
    try { $res = Sms::send([$r['phone']], $msg, $campaign, $u['id']); if (!empty($res['ok'])) $sent++; else $failed++; }
    catch (\Throwable $e) { $failed++; }
  }
  // Ú¯ÛŒØ±Ù†Ø¯Ú¯Ø§Ù† Ø®Ø§Ø±Ø¬ Ø§Ø² Ù„ÛŒØ³Øª: Ù…ØªÙ† Ù¾ÛŒØ§Ù…Ú© Ù†ÙØ± Ø¢Ø®Ø± Â«Ø¨Ø±Ø§ÛŒ Ø§Ø³ØªØ­Ø¶Ø§Ø±Â» Ø¨Ø±Ø§ÛŒ Ø¢Ù†Ù‡Ø§ Ø§Ø±Ø³Ø§Ù„ Ù…ÛŒâ€ŒØ´ÙˆØ¯
  $extra = $b['extra_numbers'] ?? [];
  $extraSent = 0;
  if (is_array($extra) && $extra && $lastMsg) {
    $extraMsg = $lastMsg . "\n(Ø¬Ù‡Øª Ø§Ø³ØªØ­Ø¶Ø§Ø±)";
    foreach ($extra as $num) {
      $num = trim(is_array($num) ? ($num['phone'] ?? '') : $num);
      if ($num === '') continue;
      try { $res = Sms::send([$num], $extraMsg, $campaign, $u['id']); if (!empty($res['ok'])) $extraSent++; } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
    }
  }
  return ['ok'=>true, 'sent'=>$sent, 'failed'=>$failed, 'total'=>count($rows), 'extra_sent'=>$extraSent, 'campaign'=>$campaign];
}, false, 1);

// Ø¯ÙØªØ±Ú†Ù‡Ù” Ù…Ø®Ø§Ø·Ø¨ÛŒÙ† Ú©Ø§Ø±Ø¨Ø± (Ø¨Ø±Ø§ÛŒ Ú¯ÛŒØ±Ù†Ø¯Ú¯Ø§Ù† Ø®Ø§Ø±Ø¬ Ø§Ø² Ù„ÛŒØ³Øª)
route('GET', '/api/admin/sms-contacts', function($p,$b,$u){
  try { return Db::all("SELECT id, name, phone FROM sms_contacts WHERE user_id=? ORDER BY name", [$u['id']]); }
  catch (\Throwable $e) { return []; }
}, false, 1);
route('POST', '/api/admin/sms-contacts', function($p,$b,$u){
  $name = trim($b['name'] ?? ''); $phone = trim($b['phone'] ?? '');
  if ($phone === '') Http::error('Ø´Ù…Ø§Ø±Ù‡ Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª', 400);
  Db::run("CREATE TABLE IF NOT EXISTS sms_contacts (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, name VARCHAR(150), phone VARCHAR(20), UNIQUE KEY uq_uc (user_id, phone)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  try { Db::run("INSERT INTO sms_contacts(user_id,name,phone) VALUES(?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)", [$u['id'],$name,$phone]); }
  catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  return ['ok'=>true];
}, false, 1);
route('DELETE', '/api/admin/sms-contacts/{id}', function($p,$b,$u){
  try { Db::run("DELETE FROM sms_contacts WHERE id=? AND user_id=?", [$p['id'], $u['id']]); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  return ['ok'=>true];
}, false, 1);

// Ú¯Ø²Ø§Ø±Ø´ Ú©Ù…Ù¾ÛŒÙ†â€ŒÙ‡Ø§ÛŒ Ù¾ÛŒØ§Ù…Ú© Ú¯Ø±ÙˆÙ‡ÛŒ Ø¢Ø¨ÙˆÙ†Ù…Ø§Ù†
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
  if (!Sms::isEnabled()) Http::error('Ø³Ø±ÙˆÛŒØ³ Ù¾ÛŒØ§Ù…Ú© ÙØ¹Ø§Ù„ Ù†ÛŒØ³Øª',400);
  // Ø§Ø¬Ø§Ø²Ù‡Ù” Ø§Ø±Ø³Ø§Ù„: Ø§Ø¯Ù…ÛŒÙ† ÛŒØ§ Ú©Ø§Ø±Ø¨Ø±ÛŒ Ú©Ù‡ can_send_sms Ø¯Ø§Ø±Ø¯
  if (!_can_send_sms($u)) Http::error('Ø´Ù…Ø§ Ø§Ø¬Ø§Ø²Ù‡Ù” Ø§Ø±Ø³Ø§Ù„ Ù¾ÛŒØ§Ù…Ú© Ù†Ø¯Ø§Ø±ÛŒØ¯.',403);
  $body = trim($b['message'] ?? '');
  if ($body==='') Http::error('Ù…ØªÙ† Ù¾ÛŒØ§Ù…Ú© Ø®Ø§Ù„ÛŒ Ø§Ø³Øª',400);
  $mobiles = []; $driverByMobile = [];
  // Ø±Ø§Ù†Ù†Ø¯Ú¯Ø§Ù† Ø§Ù†ØªØ®Ø§Ø¨â€ŒØ´Ø¯Ù‡
  $driverIds = $b['driver_ids'] ?? [];
  if (is_array($driverIds) && $driverIds) {
    $driverIds = array_map('intval',$driverIds);
    $in = implode(',', array_fill(0, count($driverIds), '?'));
    $rows = Db::all("SELECT id, mobile FROM drivers WHERE id IN ($in) AND mobile IS NOT NULL AND mobile<>''", $driverIds);
    foreach ($rows as $r) { $mobiles[] = $r['mobile']; $driverByMobile[$r['mobile']] = $r['id']; }
  }
  // Ø´Ù…Ø§Ø±Ù‡â€ŒÙ‡Ø§ÛŒ ÙˆØ§Ø±Ø¯Ø´Ø¯Ù‡Ù” Ø¯Ø³ØªÛŒ
  if (!empty($b['mobiles']) && is_array($b['mobiles'])) {
    foreach ($b['mobiles'] as $m) { $m = preg_replace('/\s+/', '', (string)$m); if ($m!=='') $mobiles[] = $m; }
  }
  $mobiles = array_values(array_unique(array_filter($mobiles)));
  $mobiles = array_slice($mobiles, 0, 50);
  if (!$mobiles) Http::error('Ú¯ÛŒØ±Ù†Ø¯Ù‡â€ŒØ§ÛŒ Ø§Ù†ØªØ®Ø§Ø¨ Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª',400);
  try {
    $res = Sms::send($mobiles, $body, 'driver', $u['id']);
  } catch (\Throwable $e) {
    Http::error('Ø®Ø·Ø§ Ø¯Ø± Ø§Ø±Ø³Ø§Ù„ Ù¾ÛŒØ§Ù…Ú©: '.$e->getMessage(), 500);
  }
  if (!$res['ok']) Http::error($res['error'] ?? 'Ø§Ø±Ø³Ø§Ù„ Ù†Ø§Ù…ÙˆÙÙ‚', 400);
  // Ø«Ø¨Øª Ø±Ø§Ù†Ù†Ø¯Ù‡ Ø¯Ø± Ù„Ø§Ú¯ Ù¾ÛŒØ§Ù…Ú© (Ø¨Ø±Ø§ÛŒ ØªØ§Ø±ÛŒØ®Ú†Ù‡Ù” Ù‡Ø± Ø±Ø§Ù†Ù†Ø¯Ù‡)
  foreach ($driverByMobile as $mob=>$did) {
    Db::run("UPDATE sms_log SET driver_id=? WHERE to_mobile=? AND sent_by=? AND driver_id IS NULL AND created_at>=DATE_SUB(NOW(),INTERVAL 2 MINUTE)", [$did,$mob,$u['id']]);
  }
  return ['ok'=>true, 'sent'=>count($mobiles), 'id'=>$res['id']];
});



// ==================== ÙÛŒØ´ Ø­Ù‚ÙˆÙ‚ÛŒ PDF Ù¾ÛŒÙˆØ³Øªâ€ŒØ´Ø¯Ù‡ ====================
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
  if (!$file || ($file['error'] ?? 1) !== 0 || empty($file['tmp_name'])) Http::error('ÙØ§ÛŒÙ„ ÙÛŒØ´ Ø­Ù‚ÙˆÙ‚ÛŒ Ø§Ø±Ø³Ø§Ù„ Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª', 400);
  if (($file['size'] ?? 0) > 10*1024*1024) Http::error('Ø­Ø¬Ù… ÙØ§ÛŒÙ„ Ù†Ø¨Ø§ÛŒØ¯ Ø¨ÛŒØ´ØªØ± Ø§Ø² Û±Û° Ù…Ú¯Ø§Ø¨Ø§ÛŒØª Ø¨Ø§Ø´Ø¯', 400);
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
  if(!in_array($ext,['pdf','jpg','png'],true)) Http::error('ÙÙ‚Ø· ÙØ§ÛŒÙ„ PDF ÛŒØ§ ØªØµÙˆÛŒØ± Ù…Ø¹ØªØ¨Ø± Ù‚Ø§Ø¨Ù„ Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ø§Ø³Øª',400);
  if($ext!=='pdf'){
    $path=Media::saveUploadedFile($file,'salary_slips');
    if(!$path) Http::error('ØªØ¨Ø¯ÛŒÙ„ ØªØµÙˆÛŒØ± ÙÛŒØ´ Ø¨Ù‡ JPG Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯Ø› Ø§ÙØ²ÙˆÙ†Ù‡ GD Ø³Ø±ÙˆØ± Ø±Ø§ Ø¨Ø±Ø±Ø³ÛŒ Ú©Ù†ÛŒØ¯',500);
    return ['path'=>$path,'mime_type'=>'image/jpeg','ext'=>'jpg'];
  }
  $sub='salary_slips/'.date('Y').'/'.date('m'); $dir=Media::baseDir().'/'.$sub;
  if(!is_dir($dir)) @mkdir($dir,0755,true);
  $name=bin2hex(random_bytes(12)).'.pdf'; $dest=$dir.'/'.$name;
  if(!@move_uploaded_file($tmp,$dest)) Http::error('Ø°Ø®ÛŒØ±Ù‡ ÙØ§ÛŒÙ„ Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯',500);
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
  if ($jy < 1300 || $jy > 1500 || $jm < 1 || $jm > 12) Http::error('Ù…Ø§Ù‡ ÙÛŒØ´ Ø­Ù‚ÙˆÙ‚ÛŒ Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª', 400);
  $title = trim($_POST['title'] ?? ($b['title'] ?? '')) ?: ('ÙÛŒØ´ Ø­Ù‚ÙˆÙ‚ÛŒ '.$jy.'/'.str_pad($jm,2,'0',STR_PAD_LEFT));
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
// Ø¨Ø±Ø±Ø³ÛŒ Ø§ÛŒÙ†Ú©Ù‡ Ø¢ÛŒØ§ Ø¢ÛŒØªÙ… Ù…Ø´Ø®ØµÛŒ Ø§Ø² Ø§Ù¾ Ø¨Ø±Ø§ÛŒ Ø³Ù…Øª Ú©Ø§Ø±Ø¨Ø± Ù…Ø¬Ø§Ø² Ø§Ø³Øª ÛŒØ§ Ù†Ù‡ (Ù…Ø·Ø§Ø¨Ù‚ ØªÙ†Ø¸ÛŒÙ…Ø§Øª Â«Ø¢ÛŒØªÙ…â€ŒÙ‡Ø§ÛŒ Ø§Ù¾ Ù‡Ø± Ø³Ù…ØªÂ»)
function _user_app_item_allowed($u, $key){
  $row = Db::one("SELECT value FROM app_settings WHERE `key`='role_app_items'");
  $cfg = $row ? json_decode($row['value'], true) : [];
  $rid = (string)($u['role_id'] ?? '');
  if (!is_array($cfg) || !isset($cfg[$rid]) || !is_array($cfg[$rid])) return true; // Ø¨Ø¯ÙˆÙ† Ù¾ÛŒÚ©Ø±Ø¨Ù†Ø¯ÛŒ = Ù…Ø¬Ø§Ø² Ø¨Ø±Ø§ÛŒ Ù‡Ù…Ù‡
  return in_array($key, $cfg[$rid], true);
}
route('GET', '/api/my/salary-slips', function($p,$b,$u){
  if (!_user_app_item_allowed($u,'SalarySlips')) Http::error('Ø¯Ø³ØªØ±Ø³ÛŒ Ø¨Ù‡ Ø§ÛŒÙ† Ø¨Ø®Ø´ Ø¨Ø±Ø§ÛŒ Ø³Ù…Øª Ø´Ù…Ø§ ÙØ¹Ø§Ù„ Ù†ÛŒØ³Øª', 403);
  _ensure_salary_slips();
  $rows=Db::all("SELECT id,user_id,period_jy,period_jm,title,file_name,mime_type,file_path,created_at FROM user_salary_slips WHERE user_id=? ORDER BY period_jy DESC, period_jm DESC, id DESC", [$u['id']]);
  foreach($rows as &$r){ $r['period_label']=$r['period_jy'].'/'.str_pad($r['period_jm'],2,'0',STR_PAD_LEFT); $r['file_type']=strpos((string)($r['mime_type']??''),'image/')===0?'image':'pdf'; $r['download_url']='/api/public/salary-slip/'.$r['id'].'/'._salary_slip_token($r['id'],$u['id'],$r['file_path']); unset($r['file_path']); }
  return ['rows'=>$rows];
});
route('GET', '/api/my/salary-slips/{id}/download', function($p,$b,$u){
  if (!_user_app_item_allowed($u,'SalarySlips')) Http::error('Ø¯Ø³ØªØ±Ø³ÛŒ Ø¨Ù‡ Ø§ÛŒÙ† Ø¨Ø®Ø´ Ø¨Ø±Ø§ÛŒ Ø³Ù…Øª Ø´Ù…Ø§ ÙØ¹Ø§Ù„ Ù†ÛŒØ³Øª', 403);
  _ensure_salary_slips();
  $r=Db::one("SELECT file_path,file_name,mime_type FROM user_salary_slips WHERE id=? AND user_id=?", [(int)$p['id'],$u['id']]);
  if (!$r) Http::error('ÙÛŒØ´ ÛŒØ§ÙØª Ù†Ø´Ø¯', 404);
  Media::serve($r['file_path']);
});
route('GET', '/api/public/salary-slip/{id}/{token}', function($p,$b){
  _ensure_salary_slips();
  $r=Db::one("SELECT id,user_id,file_path,file_name,mime_type FROM user_salary_slips WHERE id=?", [(int)$p['id']]);
  if (!$r) Http::error('ÙÛŒØ´ ÛŒØ§ÙØª Ù†Ø´Ø¯', 404);
  $good=_salary_slip_token($r['id'],$r['user_id'],$r['file_path']);
  if (!hash_equals($good, (string)$p['token'])) Http::error('Ø¯Ø³ØªØ±Ø³ÛŒ Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª', 403);
  Media::serve($r['file_path']);
}, true);

// ==================== ÙÛŒÙ„Ø¯Ù‡Ø§ÛŒ Ø³ÙØ§Ø±Ø´ÛŒ Ù¾Ø±Ø³Ù†Ù„ ====================
route('GET', '/api/admin/custom-fields', fn($p,$b,$u) =>
  Db::all("SELECT * FROM custom_fields ORDER BY sort_order, id"), false, ADMIN);

route('POST', '/api/admin/custom-fields', function($p,$b,$u){
  $label = trim($b['label'] ?? '');
  if ($label==='') Http::error('Ø¹Ù†ÙˆØ§Ù† ÙÛŒÙ„Ø¯ Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª',400);
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
    if ($v===null || trim((string)$v)==='') Http::error('ØªÚ©Ù…ÛŒÙ„ ÙÛŒÙ„Ø¯ Â«'.$rf['label'].'Â» Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª',422);
  }
  _save_custom_values($u['id'], $values, true);
  return ['ok'=>true];
}, false);

// ==================== Ø­Ø§Ù„Øª ØªØ¹Ù…ÛŒØ± (Ù‚Ø·Ø¹ Ø¯Ø³ØªØ±Ø³ÛŒ Ù‡Ù…Ù‡ Ø¨Ø¬Ø² Ù…Ø¯ÛŒØ±Ø§Ù†) ====================
function _maintenance_status(){
  $row = Db::one("SELECT value FROM app_settings WHERE `key`='maintenance_mode'");
  $cfg = $row ? json_decode($row['value'], true) : null;
  if (!is_array($cfg)) $cfg = [];
  return [
    'enabled' => !empty($cfg['enabled']),
    'message' => (string)($cfg['message'] ?? 'Ù†Ø±Ù…â€ŒØ§ÙØ²Ø§Ø± Ùˆ Ù¾Ù†Ù„ Ù…ÙˆÙ‚ØªØ§Ù‹ Ø¨Ø±Ø§ÛŒ ØªØ¹Ù…ÛŒØ±Ø§Øª ØºÛŒØ±ÙØ¹Ø§Ù„ Ø§Ø³Øª. Ù„Ø·ÙØ§Ù‹ Ø¨Ø¹Ø¯Ø§Ù‹ ØªÙ„Ø§Ø´ Ú©Ù†ÛŒØ¯.'),
  ];
}
// ÙˆØ¶Ø¹ÛŒØª Ø¹Ù…ÙˆÙ…ÛŒ (Ø¨Ø¯ÙˆÙ† Ù†ÛŒØ§Ø² Ø¨Ù‡ ØªÙˆÚ©Ù†) â€” Ø¨Ø±Ø§ÛŒ Ù†Ù…Ø§ÛŒØ´ Ù¾ÛŒØ§Ù… Ù‚Ø·Ø¹ÛŒ Ù¾ÛŒØ´ Ø§Ø² ØªÙ„Ø§Ø´ ÙˆØ±ÙˆØ¯
route('GET', '/api/system/maintenance-status', function($p,$b){
  return _maintenance_status();
}, true);
route('GET', '/api/admin/maintenance', function($p,$b,$u){
  return _maintenance_status();
}, false, ADMIN);
route('POST', '/api/admin/maintenance', function($p,$b,$u){
  $cfg = ['enabled'=>!empty($b['enabled']), 'message'=>trim((string)($b['message'] ?? '')) ?: 'Ù†Ø±Ù…â€ŒØ§ÙØ²Ø§Ø± Ùˆ Ù¾Ù†Ù„ Ù…ÙˆÙ‚ØªØ§Ù‹ Ø¨Ø±Ø§ÛŒ ØªØ¹Ù…ÛŒØ±Ø§Øª ØºÛŒØ±ÙØ¹Ø§Ù„ Ø§Ø³Øª. Ù„Ø·ÙØ§Ù‹ Ø¨Ø¹Ø¯Ø§Ù‹ ØªÙ„Ø§Ø´ Ú©Ù†ÛŒØ¯.'];
  Db::run("INSERT INTO app_settings(`key`,value) VALUES('maintenance_mode',?)
           ON DUPLICATE KEY UPDATE value=VALUES(value)", [json_encode($cfg, JSON_UNESCAPED_UNICODE)]);
  return ['ok'=>true];
}, false, ADMIN);


// Ù¾ÛŒÚ©Ø±Ø¨Ù†Ø¯ÛŒ: app_settings['role_app_items'] = { roleId: [itemKey,...] }
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

// Ø¢ÛŒØªÙ…â€ŒÙ‡Ø§ÛŒ Ù…Ø¬Ø§Ø² Ø§Ù¾ Ø¨Ø±Ø§ÛŒ Ú©Ø§Ø±Ø¨Ø± Ø¬Ø§Ø±ÛŒ (Ø¨Ø± Ø§Ø³Ø§Ø³ Ø³Ù…Øª Ø§Ùˆ)
route('GET', '/api/my/app-items', function($p,$b,$u){
  require_once __DIR__.'/android_app_items.php';
  $row = Db::one("SELECT value FROM app_settings WHERE `key`='role_app_items'");
  $cfg = $row ? json_decode($row['value'], true) : [];
  $rid = (string)($u['role_id'] ?? '');
  // An unconfigured role inherits the full catalogue; an explicitly empty role has no access.
  $items = (is_array($cfg) && array_key_exists($rid, $cfg) && is_array($cfg[$rid]))
    ? array_values(array_intersect(kh_android_app_items(), $cfg[$rid])) : kh_android_app_items();
  return ['items'=>$items];
}, false);

// ==================== Ø§Ø¹Ù„Ø§Ù… Ù‚Ø·Ø¹ Ø³ÛŒØ³ØªÙ… Ù†ÙˆØ¨Øªâ€ŒØ¯Ù‡ÛŒ (Ù…Ø®ØµÙˆØµ Ø§Ù¾Ø±Ø§ØªÙˆØ±Ù‡Ø§) ====================
function _outage_minutes($start,$end){
  $hm=function($s){ $p=explode(':',$s); return ((int)($p[0]??0))*60+(int)($p[1]??0); };
  $a=$hm($start); $b=$hm($end); $d=$b-$a; if($d<0)$d+=1440; return $d;
}
// Ø«Ø¨Øª Ù‚Ø·Ø¹ÛŒ ØªÙˆØ³Ø· Ø§Ù¾Ø±Ø§ØªÙˆØ±
// Ú©Ø¯Ù‡Ø§ÛŒ Ø®Ø·ÙˆØ·ÛŒ Ú©Ù‡ Ø³ÛŒØ³ØªÙ… Ù†ÙˆØ¨Øªâ€ŒØ¯Ù‡ÛŒ Ø±ÙˆÛŒ Ø¢Ù†â€ŒÙ‡Ø§ ÙØ¹Ø§Ù„ Ø§Ø³Øª (Ù‚Ø§Ø¨Ù„ ØªÙ†Ø¸ÛŒÙ… Ø¯Ø± Ù¾Ù†Ù„)
function _nobat_line_codes(){
  $v = _req_setting('nobat_line_codes', null);
  if (is_array($v) && $v) return array_map('strval', $v);
  // Ù¾ÛŒØ´â€ŒÙØ±Ø¶ Ø·Ø¨Ù‚ Ø§Ø¹Ù„Ø§Ù… Ú©Ø§Ø±ÙØ±Ù…Ø§
  return ['300','500','501','502','503','505','700'];
}
// Ø¢ÛŒØ§ Ø§ÛŒÙ† Ø®Ø· (Ø¨Ø± Ø§Ø³Ø§Ø³ id) Ø¬Ø²Ùˆ Ø®Ø·ÙˆØ· Ù†ÙˆØ¨Øªâ€ŒØ¯Ù‡ÛŒ Ø§Ø³ØªØŸ
function _is_nobat_line($lineId){
  $codes = _nobat_line_codes();
  $r = Db::one("SELECT code FROM `lines` WHERE id=?", [$lineId]);
  if (!$r) return false;
  return in_array((string)$r['code'], $codes, true);
}

// ==================== Ø±Ø§Ù†Ù†Ø¯Ú¯Ø§Ù† Ù…ÙˆÙ‚Øª Ø®Ø·ÙˆØ· ÙˆÛŒÚ˜Ù‡ ====================
// Ø®Ø·ÙˆØ· ÙˆÛŒÚ˜Ù‡â€ŒØ§ÛŒ Ú©Ù‡ Ø±Ø§Ù†Ù†Ø¯Ù‡ Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ø¯ Ø¨Ù‡â€ŒØµÙˆØ±Øª Ù…ÙˆÙ‚Øª Ø¨Ù‡ Ø¢Ù†â€ŒÙ‡Ø§ Ø§Ø¶Ø§ÙÙ‡ Ø´ÙˆØ¯ (Ù‡Ù…Ø§Ù† Ø®Ø·ÙˆØ· Ù†ÙˆØ¨Øªâ€ŒØ¯Ù‡ÛŒ)
function _special_line_codes(){
  $v = _req_setting('special_temp_line_codes', null);
  if (is_array($v) && $v) return array_map('strval', $v);
  return _nobat_line_codes(); // Ù¾ÛŒØ´â€ŒÙØ±Ø¶: Ù‡Ù…Ø§Ù† Û³Û°Û°ØŒÛµÛ°Û°ØŒÛµÛ°Û±ØŒÛµÛ°Û²ØŒÛµÛ°Û³ØŒÛµÛ°ÛµØŒÛ·Û°Û°
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
// Ø´Ù†Ø§Ø³Ù‡Ù” Ø®Ø·ÙˆØ·ÛŒ Ú©Ù‡ Ø§ÛŒÙ† Ø±Ø§Ù†Ù†Ø¯Ù‡ Ø¨Ù‡â€ŒØµÙˆØ±Øª Ù…ÙˆÙ‚Øª Ø¯Ø± Ø¢Ù†â€ŒÙ‡Ø§ ÙØ¹Ø§Ù„ Ø§Ø³Øª
function _driver_temp_line_ids($driverId){
  _ensure_temp_line_drivers();
  return array_column(Db::all("SELECT line_id FROM temp_line_drivers WHERE driver_id=? AND is_active=1", [$driverId]), 'line_id');
}
// Ø¢ÛŒØ§ Ø±Ø§Ù†Ù†Ø¯Ù‡ Ø¨Ù‡â€ŒØµÙˆØ±Øª Ù…ÙˆÙ‚Øª Ø¯Ø± ÛŒÚ©ÛŒ Ø§Ø² Ø®Ø·ÙˆØ· Ø¯Ø§Ø¯Ù‡â€ŒØ´Ø¯Ù‡ ÙØ¹Ø§Ù„ Ø§Ø³ØªØŸ
function _driver_in_temp_lines($driverId, $allowedLineIds, $allowedCodes){
  if ($allowedLineIds === null) return true; // Ø§Ø¯Ù…ÛŒÙ† Ø¨Ø¯ÙˆÙ† Ù…Ø­Ø¯ÙˆØ¯ÛŒØª
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
  if(!$lineId) Http::error('Ø§Ù†ØªØ®Ø§Ø¨ Ø®Ø· Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª',400);
  // ÙÙ‚Ø· Ø®Ø·ÙˆØ· Ø¯Ø§Ø±Ø§ÛŒ Ø³ÛŒØ³ØªÙ… Ù†ÙˆØ¨Øªâ€ŒØ¯Ù‡ÛŒ Ù…Ø¬Ø§Ø² Ø¨Ù‡ Ø«Ø¨Øª Ù‚Ø·Ø¹ÛŒ Ù‡Ø³ØªÙ†Ø¯
  if(!_is_nobat_line($lineId)) Http::error('Ø³ÛŒØ³ØªÙ… Ù†ÙˆØ¨Øªâ€ŒØ¯Ù‡ÛŒ ÙÙ‚Ø· Ø±ÙˆÛŒ Ø®Ø·ÙˆØ· Ù…Ø´Ø®Øµ ÙØ¹Ø§Ù„ Ø§Ø³Øª Ùˆ Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ø®Ø· Ù‚Ø·Ø¹ÛŒ Ø«Ø¨Øª Ù†Ù…ÛŒâ€ŒØ´ÙˆØ¯.',422);
  // ÙÙ‚Ø· Ø®Ø·ÙˆØ· Ø¯Ø± Ø¯Ø³ØªØ±Ø³ Ú©Ø§Ø±Ø¨Ø±
  $myLines=user_line_ids($u);
  if (is_array($myLines) && $myLines && !in_array($lineId,$myLines)) Http::error('Ø§ÛŒÙ† Ø®Ø· Ø¯Ø± Ø¯Ø³ØªØ±Ø³ Ø´Ù…Ø§ Ù†ÛŒØ³Øª',403);
  $date=trim($b['outage_date']??''); $st=trim($b['start_time']??''); $en=trim($b['end_time']??'');
  if(!$date||!$st) Http::error('ØªØ§Ø±ÛŒØ® Ùˆ Ø²Ù…Ø§Ù† Ø´Ø±ÙˆØ¹ Ù‚Ø·Ø¹ÛŒ Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª',422);
  // ØªØ¨Ø¯ÛŒÙ„ ØªØ§Ø±ÛŒØ® Ø¬Ù„Ø§Ù„ÛŒ (1405/04/01) Ø¨Ù‡ Ù…ÛŒÙ„Ø§Ø¯ÛŒ Ø¨Ø±Ø§ÛŒ Ø°Ø®ÛŒØ±Ù‡ Ùˆ Ø³Ø§Ø²Ú¯Ø§Ø±ÛŒ Ø¨Ø§ ÙÛŒÙ„ØªØ±Ù‡Ø§
  $dateG = $date;
  if (preg_match('/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/', $date, $m)) {
    $jy=(int)$m[1]; $jm=(int)$m[2]; $jd=(int)$m[3];
    if ($jy >= 1300 && $jy <= 1500) { // ØªØ§Ø±ÛŒØ® Ø¬Ù„Ø§Ù„ÛŒ Ø§Ø³Øª
      list($gy,$gm,$gd) = jalali_to_gregorian($jy,$jm,$jd);
      $dateG = sprintf('%04d-%02d-%02d', $gy,$gm,$gd);
    }
  }
  // Ø²Ù…Ø§Ù† Ù¾Ø§ÛŒØ§Ù† Ø§Ø®ØªÛŒØ§Ø±ÛŒ Ø§Ø³ØªØ› Ø§Ú¯Ø± Ù†Ø¨ÙˆØ¯ØŒ Ù‚Ø·Ø¹ÛŒ Â«Ø¨Ø§Ø²Â» Ø§Ø³Øª Ùˆ Ø¨Ø¹Ø¯Ø§Ù‹ Ø¨Ø§ Ø¯Ú©Ù…Ù‡Ù” Â«ÙˆØµÙ„ Ø´Ø¯Â» Ø¨Ø³ØªÙ‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯
  // Ø§Ø·Ù…ÛŒÙ†Ø§Ù† Ø§Ø² nullable Ø¨ÙˆØ¯Ù† Ø³ØªÙˆÙ†â€ŒÙ‡Ø§ÛŒ end_time Ùˆ minutes (ÛŒÚ©â€ŒØ¨Ø§Ø±)
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

// Ø«Ø¨Øª Â«ÙˆØµÙ„ Ø´Ø¯Â» â€” Ø²Ù…Ø§Ù† Ù¾Ø§ÛŒØ§Ù† Ù‚Ø·Ø¹ÛŒ Ø±Ø§ Ø¨Ø§ Ø³Ø§Ø¹Øª ÙØ¹Ù„ÛŒ (ÛŒØ§ Ø³Ø§Ø¹Øª Ø§Ø±Ø³Ø§Ù„ÛŒ) Ø«Ø¨Øª Ù…ÛŒâ€ŒÚ©Ù†Ø¯
route('POST', '/api/outages/{id}/resolve', function($p,$b,$u){
  $id=(int)$p['id'];
  $o=Db::one("SELECT id,start_time,end_time FROM system_outages WHERE id=? AND reported_by=?",[$id,$u['id']]);
  if(!$o) Http::error('Ù‚Ø·Ø¹ÛŒ ÛŒØ§ÙØª Ù†Ø´Ø¯',404);
  if(!empty($o['end_time'])) Http::error('Ø§ÛŒÙ† Ù‚Ø·Ø¹ÛŒ Ù‚Ø¨Ù„Ø§Ù‹ ÙˆØµÙ„ Ø´Ø¯Ù‡ Ø§Ø³Øª',422);
  $en = trim($b['end_time']??'');
  if($en==='') $en = date('H:i'); // Ø³Ø§Ø¹Øª ÙØ¹Ù„ÛŒ Ø³Ø±ÙˆØ±
  $min = _outage_minutes($o['start_time'],$en);
  Db::run("UPDATE system_outages SET end_time=?, minutes=? WHERE id=?",[$en,$min,$id]);
  return ['ok'=>true,'end_time'=>$en,'minutes'=>$min];
}, false);
// ÙÙ‡Ø±Ø³Øª Ø®Ø·ÙˆØ· Ù†ÙˆØ¨Øªâ€ŒØ¯Ù‡ÛŒ Ø¨Ø±Ø§ÛŒ Ø§Ù¾ (ØªÙ†Ù‡Ø§ Ø§ÛŒÙ† Ø®Ø·ÙˆØ· Ø¯Ø± ÙØ±Ù… Ù‚Ø·Ø¹ÛŒ Ù†Ù…Ø§ÛŒØ´ Ø¯Ø§Ø¯Ù‡ Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯)
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

// Ù‚Ø·Ø¹ÛŒâ€ŒÙ‡Ø§ÛŒ Ø«Ø¨Øªâ€ŒØ´Ø¯Ù‡Ù” Ø®ÙˆØ¯Ù Ú©Ø§Ø±Ø¨Ø±
route('GET', '/api/my/outages', fn($p,$b,$u) => Db::all(
  "SELECT o.id,o.outage_date,o.start_time,o.end_time,o.minutes,o.note,o.reason,l.code line_code,l.origin,l.destination
   FROM system_outages o LEFT JOIN `lines` l ON l.id=o.line_id WHERE o.reported_by=? ORDER BY o.id DESC LIMIT 100",[$u['id']]));

// Ú¯Ø²Ø§Ø±Ø´ Ù‚Ø·Ø¹ÛŒâ€ŒÙ‡Ø§ (Ø§Ø¯Ù…ÛŒÙ†/Ù…Ø¯ÛŒØ±) Ø¨Ø§ ØªØ¬Ù…ÛŒØ¹ Ø±ÙˆØ²Ø§Ù†Ù‡ Ùˆ Ù…Ø§Ù‡Ø§Ù†Ù‡
// ØªØ¨Ø¯ÛŒÙ„ ØªØ§Ø±ÛŒØ®â€ŒÙ‡Ø§ÛŒ Ø¬Ù„Ø§Ù„ÛŒ Ù‚Ø¯ÛŒÙ…ÛŒ Ù‚Ø·Ø¹ÛŒâ€ŒÙ‡Ø§ Ø¨Ù‡ Ù…ÛŒÙ„Ø§Ø¯ÛŒ (ÛŒÚ©â€ŒØ¨Ø§Ø± Ø§Ø¬Ø±Ø§)
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
  $jm=$_GET['jmonth']??''; // YYYY-MM Ø¬Ù„Ø§Ù„ÛŒ Ø§Ø®ØªÛŒØ§Ø±ÛŒ Ø¨Ø±Ø§ÛŒ ÙÛŒÙ„ØªØ±
  $cond=[]; $args=[];
  if(!empty($_GET['line_id'])){ $cond[]="o.line_id=?"; $args[]=(int)$_GET['line_id']; }
  if(!empty($_GET['from'])){ $cond[]="o.outage_date>=?"; $args[]=$_GET['from']; }
  if(!empty($_GET['to'])){ $cond[]="o.outage_date<=?"; $args[]=$_GET['to']; }
  $where=$cond?('WHERE '.implode(' AND ',$cond)):'';
  $rows=Db::all("SELECT o.id,o.outage_date,o.start_time,o.end_time,o.minutes,o.note,o.line_id,
      l.code line_code,l.origin,l.destination, CONCAT(us.first_name,' ',us.last_name) reporter
    FROM system_outages o LEFT JOIN `lines` l ON l.id=o.line_id LEFT JOIN users us ON us.id=o.reported_by
    $where ORDER BY o.outage_date DESC, o.id DESC LIMIT 2000",$args);
  // ØªØ¬Ù…ÛŒØ¹ per-line: Ù‡Ù… Ù…Ø¬Ù…ÙˆØ¹ Ø¯Ù‚ÛŒÙ‚Ù‡ØŒ Ù‡Ù… ØªØ¹Ø¯Ø§Ø¯ Ø¯ÙØ¹Ø§Øª Ù‚Ø·Ø¹ÛŒ
  $byLine=[]; $byDay=[]; $cntLine=[]; $byMonth=[];
  foreach($rows as $r){
    $lk=$r['line_code']?:('#'.$r['line_id']);
    $byLine[$lk]=($byLine[$lk]??0)+(int)$r['minutes'];
    $cntLine[$lk]=($cntLine[$lk]??0)+1;
    $byDay[$r['outage_date']]=($byDay[$r['outage_date']]??0)+(int)$r['minutes'];
    // Ù…Ø§Ù‡ Ù…ÛŒÙ„Ø§Ø¯ÛŒ Ø¨Ø±Ø§ÛŒ Ù†Ù…ÙˆØ¯Ø§Ø± Ù…Ø§Ù‡Ø§Ù†Ù‡ (YYYY-MM)
    $mon=substr((string)$r['outage_date'],0,7);
    if(!isset($byMonth[$mon])) $byMonth[$mon]=['minutes'=>0,'count'=>0];
    $byMonth[$mon]['minutes']+=(int)$r['minutes'];
    $byMonth[$mon]['count']+=1;
  }
  // Ù…Ø±ØªØ¨â€ŒØ³Ø§Ø²ÛŒ Ø®Ø·ÙˆØ· Ø¨Ø± Ø§Ø³Ø§Ø³ Ø¨ÛŒØ´ØªØ±ÛŒÙ† ØªØ¹Ø¯Ø§Ø¯ Ù‚Ø·Ø¹ÛŒ (Ø¨Ø±Ø§ÛŒ Ù†Ù…ÙˆØ¯Ø§Ø±)
  arsort($cntLine);
  $topByCount=[]; foreach($cntLine as $lk=>$c){ $topByCount[]=['line'=>$lk,'count'=>$c,'minutes'=>$byLine[$lk]??0]; }
  return ['rows'=>$rows,'by_line'=>$byLine,'count_line'=>$cntLine,'by_day'=>$byDay,
          'by_month'=>$byMonth,'top_by_count'=>$topByCount,
          'total'=>array_sum($byLine),'total_count'=>count($rows)];
}, false, ADMIN);

// Ø®Ø±ÙˆØ¬ÛŒ CSV Ù‚Ø·Ø¹ÛŒâ€ŒÙ‡Ø§
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
  fputcsv($out,['ØªØ§Ø±ÛŒØ®','Ø®Ø·','Ø´Ø±ÙˆØ¹ Ù‚Ø·Ø¹ÛŒ','Ù¾Ø§ÛŒØ§Ù† Ù‚Ø·Ø¹ÛŒ','Ù…Ø¯Øª (Ø³Ø§Ø¹Øª:Ø¯Ù‚ÛŒÙ‚Ù‡)','Ù…Ø¯Øª (Ø¯Ù‚ÛŒÙ‚Ù‡)','Ø«Ø¨Øªâ€ŒÚ©Ù†Ù†Ø¯Ù‡','ØªÙˆØ¶ÛŒØ­Ø§Øª']);
  foreach($rows as $r) fputcsv($out,[$r['outage_date'],$r['line_code'],$r['start_time'],$r['end_time'],$hm($r['minutes']),$r['minutes'],$r['reporter'],$r['note']]);
  fclose($out); exit;
}, false, ADMIN);

// Ù¾ÛŒÚ©Ø±Ø¨Ù†Ø¯ÛŒ Ù¾ÛŒØ§Ù…Ú© Ø¨Ø±Ø§ÛŒ Ø§Ù¾: Ù‚Ø§Ù„Ø¨â€ŒÙ‡Ø§ + Ø§ÛŒÙ†Ú©Ù‡ Ø¢ÛŒØ§ ÙÙ‚Ø· Ù‚Ø§Ù„Ø¨ Ù…Ø¬Ø§Ø² Ø§Ø³Øª
route('GET', '/api/sms/config', function($p,$b,$u){
  $tr = Db::one("SELECT value FROM app_settings WHERE `key`='sms_templates'");
  $templates = $tr ? json_decode($tr['value'], true) : [];
  if (!is_array($templates)) $templates = [];
  $orow = Db::one("SELECT value FROM app_settings WHERE `key`='sms_templates_only'");
  $only = $orow ? (bool)json_decode($orow['value'], true) : false;
  return ['templates'=>array_values($templates), 'templates_only'=>$only];
}, false);

// Ø±Ø§Ù†Ù†Ø¯Ú¯Ø§Ù† ÛŒÚ© Ø®Ø· Ø®Ø§Øµ (Ø¨Ø±Ø§ÛŒ Ø§Ù†ØªØ®Ø§Ø¨ Ú¯ÛŒØ±Ù†Ø¯Ù‡)
route('GET', '/api/sms/drivers-by-line', function($p,$b,$u){
  $lineId = (int)($_GET['line_id'] ?? 0);
  if (!$lineId) return [];
  $role = $_GET['role'] ?? ''; // beneficiary | helper | driver | '' (Ù‡Ù…Ù‡)

  $result = [];
  $seen = [];

  // Ù…Ù†Ø¨Ø¹ Û±: Ø§Ø² Ø·Ø±ÛŒÙ‚ vehicle_drivers (Ø¯Ù‚ÛŒÙ‚â€ŒØªØ±ÛŒÙ†ØŒ Ø´Ø§Ù…Ù„ Ù†Ù‚Ø´)
  $cond = "ve.line_id=? AND d.mobile IS NOT NULL AND d.mobile<>''"; $args=[$lineId];
  if (in_array($role,['beneficiary','helper','driver'])) { $cond.=" AND vd.vd_role=?"; $args[]=$role; }
  $rows1 = Db::all("SELECT DISTINCT d.id, CONCAT(COALESCE(d.first_name,''),' ',COALESCE(d.last_name,'')) name, d.mobile, vd.vd_role role
    FROM drivers d JOIN vehicle_drivers vd ON vd.driver_id=d.id JOIN vehicles ve ON ve.id=vd.vehicle_id
    WHERE $cond ORDER BY d.last_name", $args);
  foreach ($rows1 as $r) { if (!isset($seen[$r['id']])) { $seen[$r['id']]=true; $result[]=$r; } }

  // Ù…Ù†Ø¨Ø¹ Û² (Ù¾Ø´ØªÛŒØ¨Ø§Ù†): Ø§Ú¯Ø± vehicle_drivers Ø®Ø§Ù„ÛŒ Ø¨ÙˆØ¯ØŒ Ø§Ø² Ø±ÙˆÛŒ Ú©Ø¯ Ù…Ù„ÛŒ Ø¨Ù‡Ø±Ù‡â€ŒØ¨Ø±Ø¯Ø§Ø±/Ù…Ø§Ù„Ú© Ø®ÙˆØ¯Ø±Ùˆ
  // ÙÙ‚Ø· ÙˆÙ‚ØªÛŒ Ù†Ù‚Ø´ Â«Ø¨Ù‡Ø±Ù‡â€ŒØ¨Ø±Ø¯Ø§Ø±Â» ÛŒØ§ Â«Ù‡Ù…Ù‡Â» Ø®ÙˆØ§Ø³ØªÙ‡ Ø´Ø¯Ù‡ (Ú†ÙˆÙ† Ø§ÛŒÙ†Ù‡Ø§ Ø¨Ù‡Ø±Ù‡â€ŒØ¨Ø±Ø¯Ø§Ø±/Ù…Ø§Ù„Ú©â€ŒØ§Ù†Ø¯)
  if ($role === '' || $role === 'beneficiary') {
    $rows2 = Db::all("SELECT DISTINCT d.id, CONCAT(COALESCE(d.first_name,''),' ',COALESCE(d.last_name,'')) name, d.mobile, 'beneficiary' role
      FROM vehicles ve JOIN drivers d ON d.national_id = COALESCE(ve.beneficiary_national_id, ve.owner_national_id)
      WHERE ve.line_id=? AND d.mobile IS NOT NULL AND d.mobile<>'' ORDER BY d.last_name", [$lineId]);
    foreach ($rows2 as $r) { if (!isset($seen[$r['id']])) { $seen[$r['id']]=true; $result[]=$r; } }
  }

  return $result;
});

// Ù¾ÛŒØ§Ù…Ú©â€ŒÙ‡Ø§ÛŒ Ø§Ø±Ø³Ø§Ù„ÛŒÙ Ø®ÙˆØ¯Ù Ú©Ø§Ø±Ø¨Ø± (Ø§Ù¾ Ùˆ Ø³Ø§ÛŒØª)
route('GET', '/api/my/sms-log', fn($p,$b,$u) => Db::all(
  "SELECT id, to_mobile, body, kind, status, delivery_code, delivery_at, created_at, driver_id
   FROM sms_log WHERE sent_by=? ORDER BY created_at DESC LIMIT 200", [$u['id']]));

// Ø³Ù‡Ù…ÛŒÙ‡Ù” Ù¾ÛŒØ§Ù…Ú© Ú©Ø§Ø±Ø¨Ø± ÙØ¹Ù„ÛŒ: Ø§Ø¹ØªØ¨Ø§Ø± Ù¾Ù†Ù„ + Ø³Ù‚Ù Ø´Ø®ØµÛŒ + Ù…ØµØ±Ù Ø§Ù…Ø±ÙˆØ² (Ø¨Ø±Ø§ÛŒ Ù†Ù…Ø§ÛŒØ´ Ø¯Ø± Ø§Ù¾)
route('GET', '/api/my/sms-quota', function($p,$b,$u){
  $g = function($k) { $r=Db::one("SELECT value FROM app_settings WHERE `key`=?",[$k]); return $r ? json_decode($r['value'],true) : null; };
  $globalLimit = (int)($g('sms_daily_limit') ?? 0);
  $userLimit   = (int)($g("sms_limit_user_{$u['id']}") ?? 0);
  // Ø³Ù‚Ù Ù…Ø¤Ø«Ø±: Ø§Ú¯Ø± Ø³Ù‚Ù Ø´Ø®ØµÛŒ ØªØ¹Ø±ÛŒÙ Ø´Ø¯Ù‡ØŒ Ø¢Ù†Ø› ÙˆÚ¯Ø±Ù†Ù‡ Ø³Ù‚Ù Ú©Ù„ÛŒ
  $effectiveLimit = $userLimit > 0 ? $userLimit : $globalLimit;
  $sentToday = (int)(Db::one("SELECT COUNT(*) n FROM sms_log WHERE sent_by=? AND DATE(created_at)=CURDATE()", [$u['id']])['n'] ?? 0);
  $sentMonth = (int)(Db::one("SELECT COUNT(*) n FROM sms_log WHERE sent_by=? AND DATE_FORMAT(created_at,'%Y-%m')=DATE_FORMAT(NOW(),'%Y-%m')", [$u['id']])['n'] ?? 0);
  // Ø§Ø¹ØªØ¨Ø§Ø± Ù¾Ù†Ù„: Ø¨Ø±Ø§ÛŒ Ø§Ø¯Ù…ÛŒÙ† ÛŒØ§ Ú©Ø§Ø±Ø¨Ø±Ø§Ù†ÛŒ Ú©Ù‡ Ø§Ø¬Ø§Ø²Ù‡Ù” Ø§Ø±Ø³Ø§Ù„ Ù¾ÛŒØ§Ù…Ú© Ø¯Ø§Ø±Ù†Ø¯
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
    'effective_limit' => $effectiveLimit,         // Ø³Ù‚Ù Ø±ÙˆØ²Ø§Ù†Ù‡Ù” Ø§ÛŒÙ† Ú©Ø§Ø±Ø¨Ø± (Û° = Ù†Ø§Ù…Ø­Ø¯ÙˆØ¯)
    'sent_today'      => $sentToday,              // Ù…ØµØ±Ù Ø§Ù…Ø±ÙˆØ²
    'remaining_today' => $effectiveLimit > 0 ? max(0, $effectiveLimit - $sentToday) : null, // Ø¨Ø§Ù‚ÛŒÙ…Ø§Ù†Ø¯Ù‡ (null = Ù†Ø§Ù…Ø­Ø¯ÙˆØ¯)
    'sent_month'      => $sentMonth,
    'panel_credit'    => $credit,                 // Ø§Ø¹ØªØ¨Ø§Ø± Ù¾Ù†Ù„ (ÙÙ‚Ø· Ø§Ø¯Ù…ÛŒÙ†)
  ];
});

// ØªØ§Ø±ÛŒØ®Ú†Ù‡Ù” Ù¾ÛŒØ§Ù…Ú©â€ŒÙ‡Ø§ÛŒ ÛŒÚ© Ø±Ø§Ù†Ù†Ø¯Ù‡ (Ù‡Ø± Ø¹Ù†ÙˆØ§Ù†ÛŒ Ú©Ù‡ ØªØ§Ú©Ù†ÙˆÙ† Ø§Ø±Ø³Ø§Ù„ Ø´Ø¯Ù‡) â€” Ø§Ù¾ Ùˆ Ø³Ø§ÛŒØª
route('GET', '/api/drivers/{id}/sms', function($p,$b,$u){
  $d = Db::one("SELECT mobile FROM drivers WHERE id=?", [$p['id']]);
  $mobile = $d['mobile'] ?? '';
  // Ù‡Ù… Ø¨Ø§ driver_id Ùˆ Ù‡Ù… Ø¨Ø§ Ø´Ù…Ø§Ø±Ù‡Ù” Ù…ÙˆØ¨Ø§ÛŒÙ„ (Ø¨Ø±Ø§ÛŒ Ø±Ú©ÙˆØ±Ø¯Ù‡Ø§ÛŒ Ù‚Ø¯ÛŒÙ…ÛŒ)
  return Db::all("SELECT s.id, s.to_mobile, s.body, s.kind, s.status, s.delivery_code, s.delivery_at, s.created_at,
      CONCAT(COALESCE(us.first_name,''),' ',COALESCE(us.last_name,'')) sender
    FROM sms_log s LEFT JOIN users us ON us.id=s.sent_by
    WHERE s.driver_id=? OR (? <> '' AND s.to_mobile=?) ORDER BY s.created_at DESC LIMIT 200",
    [$p['id'], $mobile, $mobile]);
});

// ÙØ±Ø§Ù…ÙˆØ´ÛŒ Ø±Ù…Ø² Ø¹Ø¨ÙˆØ±: Ø§Ø±Ø³Ø§Ù„ Ú©Ø¯ Ø¨Ù‡ Ù…ÙˆØ¨Ø§ÛŒÙ„ Ú©Ø§Ø±Ø¨Ø± (Ø¹Ù…ÙˆÙ…ÛŒ)
route('POST', '/api/auth/forgot-password', function($p,$b,$u){
  $username = trim($b['username'] ?? '');
  if ($username==='') Http::error('Ù†Ø§Ù… Ú©Ø§Ø±Ø¨Ø±ÛŒ Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯',400);
  $usr = Db::one("SELECT id, phone FROM users WHERE username=? AND is_active=1", [$username]);
  // Ù¾Ø§Ø³Ø® ÛŒÚ©Ø³Ø§Ù† Ø¨Ø±Ø§ÛŒ Ø¬Ù„ÙˆÚ¯ÛŒØ±ÛŒ Ø§Ø² Ø§ÙØ´Ø§ÛŒ ÙˆØ¬ÙˆØ¯/Ø¹Ø¯Ù…â€ŒÙˆØ¬ÙˆØ¯ Ú©Ø§Ø±Ø¨Ø±
  $generic = ['ok'=>true, 'message'=>'Ø¯Ø± ØµÙˆØ±Øª Ù…Ø¹ØªØ¨Ø± Ø¨ÙˆØ¯Ù† Ù†Ø§Ù… Ú©Ø§Ø±Ø¨Ø±ÛŒØŒ Ú©Ø¯ Ø¨Ø§Ø²ÛŒØ§Ø¨ÛŒ Ù¾ÛŒØ§Ù…Ú© Ø´Ø¯.'];
  if (!$usr || empty($usr['phone'])) return $generic;
  if (!Sms::isEnabled()) Http::error('Ø³Ø±ÙˆÛŒØ³ Ù¾ÛŒØ§Ù…Ú© ÙØ¹Ø§Ù„ Ù†ÛŒØ³ØªØ› Ø¨Ø§ Ù…Ø¯ÛŒØ± ØªÙ…Ø§Ø³ Ø¨Ú¯ÛŒØ±ÛŒØ¯.',400);
  $code = (string)random_int(10000, 99999);
  Db::run("UPDATE users SET reset_code=?, reset_expires=DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id=?", [$code, $usr['id']]);
  Sms::send([$usr['phone']], "Ú©Ø¯ Ø¨Ø§Ø²ÛŒØ§Ø¨ÛŒ Ø±Ù…Ø² Ø¹Ø¨ÙˆØ± Ø³Ø§Ù…Ø§Ù†Ù‡Ù” Ù…Ø¯ÛŒØ±ÛŒØª Ø®Ø·ÙˆØ·: $code (ØªØ§ Û±Ûµ Ø¯Ù‚ÛŒÙ‚Ù‡ Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª)", 'reset', $usr['id']);
  return $generic;
}, true);

// ØªÙ†Ø¸ÛŒÙ… Ø±Ù…Ø² Ø¬Ø¯ÛŒØ¯ Ø¨Ø§ Ú©Ø¯ Ø¨Ø§Ø²ÛŒØ§Ø¨ÛŒ (Ø¹Ù…ÙˆÙ…ÛŒ)
route('POST', '/api/auth/reset-password', function($p,$b,$u){
  $username = trim($b['username'] ?? ''); $code = trim($b['code'] ?? ''); $pw = $b['password'] ?? '';
  if ($username===''||$code==='') Http::error('Ù†Ø§Ù… Ú©Ø§Ø±Ø¨Ø±ÛŒ Ùˆ Ú©Ø¯ Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯',400);
  if (strlen($pw) < 6) Http::error('Ø±Ù…Ø² Ø¬Ø¯ÛŒØ¯ Ø­Ø¯Ø§Ù‚Ù„ Û¶ Ú©Ø§Ø±Ø§Ú©ØªØ±',400);
  $usr = Db::one("SELECT id FROM users WHERE username=? AND reset_code=? AND reset_expires IS NOT NULL AND reset_expires>=NOW()", [$username, $code]);
  if (!$usr) Http::error('Ú©Ø¯ Ø¨Ø§Ø²ÛŒØ§Ø¨ÛŒ Ù†Ø§Ù…Ø¹ØªØ¨Ø± ÛŒØ§ Ù…Ù†Ù‚Ø¶ÛŒ Ø´Ø¯Ù‡ Ø§Ø³Øª',400);
  Db::run("UPDATE users SET password_hash=?, reset_code=NULL, reset_expires=NULL, pw_changed_at=NOW() WHERE id=?",
    [password_hash($pw, PASSWORD_BCRYPT), $usr['id']]);
  return ['ok'=>true];
}, true);

// ØªØ§Ø±ÛŒØ®Ú†Ù‡Ù” Ù¾ÛŒØ§Ù…Ú©â€ŒÙ‡Ø§ÛŒ Ø§Ø±Ø³Ø§Ù„ÛŒ (Ø§Ø¯Ù…ÛŒÙ†)
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

// Ø¨Ù‡â€ŒØ±ÙˆØ²Ø±Ø³Ø§Ù†ÛŒ ÙˆØ¶Ø¹ÛŒØª ØªØ­ÙˆÛŒÙ„ Ø§Ø² Ø³Ø±ÙˆÛŒØ³ (Ø§Ø¯Ù…ÛŒÙ†)
route('POST', '/api/admin/sms-log/refresh-status', function($p,$b,$u){
  $from = $_GET['from'] ?? date('Y-m-d', time()-7*86400); $to = $_GET['to'] ?? date('Y-m-d');
  $from = date('Y-m-d', strtotime($from)); $to = date('Y-m-d', strtotime($to));
  // ÙÙ‚Ø· Ù…ÙˆØ§Ø±Ø¯ÛŒ Ú©Ù‡ Ø´Ù†Ø§Ø³Ù‡Ù” Ù¾ÛŒØ§Ù… Ø¯Ø§Ø±Ù†Ø¯ Ùˆ Ø·ÛŒ Û· Ø±ÙˆØ² Ø§Ø®ÛŒØ± Ø§Ø±Ø³Ø§Ù„ Ø´Ø¯Ù‡â€ŒØ§Ù†Ø¯ (Ù…Ø­Ø¯ÙˆØ¯ÛŒØª Ø³Ø±ÙˆÛŒØ³)
  $rows = Db::all("SELECT id, message_id FROM sms_log
    WHERE message_id IS NOT NULL AND message_id<>'' AND status='ok'
      AND DATE(created_at) BETWEEN ? AND ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    ORDER BY created_at DESC LIMIT 500", [$from,$to]);
  if (!$rows) return ['ok'=>true, 'updated'=>0, 'note'=>'Ù…ÙˆØ±Ø¯ÛŒ Ø¨Ø±Ø§ÛŒ Ø¨Ø±Ø±Ø³ÛŒ ÙˆØ¬ÙˆØ¯ Ù†Ø¯Ø§Ø±Ø¯ (ÛŒØ§ Ø¨ÛŒØ´ Ø§Ø² Û· Ø±ÙˆØ² Ú¯Ø°Ø´ØªÙ‡)'];
  $ids = array_map(fn($r)=>$r['message_id'], $rows);
  // Ø¨Ø±Ø±Ø³ÛŒ Ø¯Ø³ØªÙ‡â€ŒØ§ÛŒ (Ø­Ø¯Ø§Ú©Ø«Ø± ÛµÛ°ØªØ§ÛŒÛŒ)
  $updated = 0;
  foreach (array_chunk($ids, 50) as $chunk) {
    $st = Sms::messageStatus($chunk);
    if (isset($st['ok']) && $st['ok']===false) return ['ok'=>false, 'error'=>$st['error'] ?? 'Ø®Ø·Ø§ Ø¯Ø± Ø¯Ø±ÛŒØ§ÙØª ÙˆØ¶Ø¹ÛŒØª'];
    foreach ($chunk as $mid) {
      if (array_key_exists((string)$mid, $st)) {
        Db::run("UPDATE sms_log SET delivery_code=?, delivery_at=NOW() WHERE message_id=?", [$st[(string)$mid], $mid]);
        $updated++;
      }
    }
  }
  return ['ok'=>true, 'updated'=>$updated];
}, false, ADMIN);

// Ø®Ø±ÙˆØ¬ÛŒ Ø§Ú©Ø³Ù„ (CSV Ø¨Ø§ BOM) ØªØ§Ø±ÛŒØ®Ú†Ù‡Ù” Ù¾ÛŒØ§Ù…Ú© (Ø§Ø¯Ù…ÛŒÙ†)
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
  $kindFa = ['register'=>'Ø«Ø¨Øªâ€ŒÙ†Ø§Ù…','reset'=>'Ø¨Ø§Ø²ÛŒØ§Ø¨ÛŒ Ø±Ù…Ø²','driver'=>'Ø¨Ù‡ Ø±Ø§Ù†Ù†Ø¯Ù‡','test'=>'Ø¢Ø²Ù…Ø§ÛŒØ´ÛŒ'];
  header('Content-Type: text/csv; charset=UTF-8');
  header('Content-Disposition: attachment; filename="sms_'.$from.'_'.$to.'.csv"');
  echo "\xEF\xBB\xBF"; // BOM Ø¨Ø±Ø§ÛŒ Ù†Ù…Ø§ÛŒØ´ ØµØ­ÛŒØ­ ÙØ§Ø±Ø³ÛŒ Ø¯Ø± Ø§Ú©Ø³Ù„
  $out = fopen('php://output','w');
  fputcsv($out, ['ØªØ§Ø±ÛŒØ® Ø§Ø±Ø³Ø§Ù„','Ø´Ù…Ø§Ø±Ù‡ Ú¯ÛŒØ±Ù†Ø¯Ù‡','Ù†ÙˆØ¹','ÙˆØ¶Ø¹ÛŒØª Ø§Ø±Ø³Ø§Ù„','Ø´Ù†Ø§Ø³Ù‡Ù” Ù¾ÛŒØ§Ù…','ÙˆØ¶Ø¹ÛŒØª ØªØ­ÙˆÛŒÙ„','ÙØ±Ø³ØªÙ†Ø¯Ù‡','Ù…ØªÙ†']);
  foreach ($rows as $r) {
    fputcsv($out, [
      fa_datetime($r['created_at']),
      $r['to_mobile'],
      $kindFa[$r['kind']] ?? ($r['kind'] ?: 'â€”'),
      $r['status']==='ok' ? 'Ø§Ø±Ø³Ø§Ù„â€ŒØ´Ø¯Ù‡' : 'Ø®Ø·Ø§',
      $r['message_id'] ?: 'â€”',
      $r['delivery_code']!==null ? Sms::deliveryText($r['delivery_code']) : 'Ø¨Ø±Ø±Ø³ÛŒâ€ŒÙ†Ø´Ø¯Ù‡',
      trim($r['sender']) ?: 'â€”',
      $r['body'],
    ]);
  }
  fclose($out); exit;
}, false, ADMIN);

// ---------------- Ù¾ÛŒØ§Ù…Ú© Ø§Ù†Ù‚Ø¶Ø§ÛŒ Ù¾Ø±ÙˆØ§Ù†Ù‡/Ø¨ÛŒÙ…Ù‡/Ù…Ø¹Ø§ÛŒÙ†Ù‡ ----------------
// Ø§Ù†ÙˆØ§Ø¹: taxi_lic (Ù¾Ø±ÙˆØ§Ù†Ù‡ ØªØ§Ú©Ø³ÛŒØ±Ø§Ù†ÛŒ)ØŒ op_lic (Ù¾Ø±ÙˆØ§Ù†Ù‡ Ø¨Ù‡Ø±Ù‡â€ŒØ¨Ø±Ø¯Ø§Ø±ÛŒ)ØŒ inspection (Ù…Ø¹Ø§ÛŒÙ†Ù‡ ÙÙ†ÛŒ)ØŒ insurance (Ø¨ÛŒÙ…Ù‡ Ø´Ø®Øµ Ø«Ø§Ù„Ø«)
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
  // ÙÛŒÙ„ØªØ± Ø¨Ø± Ø§Ø³Ø§Ø³ ÙˆØ¶Ø¹ÛŒØª Ø§Ù†Ù‚Ø¶Ø§
  $now = time(); $limit = strtotime("+$days days");
  $out = [];
  foreach ($rows as $r) {
    $ts = j_to_ts($r['expire']);
    if ($ts === null) continue;
    if ($mode === 'expired') { if ($ts >= $now) continue; }
    else { if ($ts < $now || $ts > $limit) continue; } // Ø±Ùˆ Ø¨Ù‡ Ø§Ù†Ù‚Ø¶Ø§: Ø¨ÛŒÙ† Ø­Ø§Ù„Ø§ ØªØ§ days Ø±ÙˆØ² Ø¢ÛŒÙ†Ø¯Ù‡
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
  $licName = ['taxi_lic'=>'Ù¾Ø±ÙˆØ§Ù†Ù‡Ù” ØªØ§Ú©Ø³ÛŒØ±Ø§Ù†ÛŒ','op_lic'=>'Ù¾Ø±ÙˆØ§Ù†Ù‡Ù” Ø¨Ù‡Ø±Ù‡â€ŒØ¨Ø±Ø¯Ø§Ø±ÛŒ','inspection'=>'Ù…Ø¹Ø§ÛŒÙ†Ù‡Ù” ÙÙ†ÛŒ','insurance'=>'Ø¨ÛŒÙ…Ù‡Ù” Ø´Ø®Øµ Ø«Ø§Ù„Ø«'][$type] ?? 'Ù¾Ø±ÙˆØ§Ù†Ù‡';
  $verb = $mode === 'expired' ? 'Ù…Ù†Ù‚Ø¶ÛŒ Ø´Ø¯Ù‡ Ø§Ø³Øª' : 'Ù…Ù†Ù‚Ø¶ÛŒ Ù…ÛŒâ€ŒØ´ÙˆØ¯';
  if (trim($tpl) === '') {
    $tpl = "ØªØ§Ú©Ø³ÛŒØ±Ø§Ù† Ú¯Ø±Ø§Ù…ÛŒ {name}\n{lic} Ø´Ù…Ø§ Ø¯Ø± Ù…ÙˆØ±Ø® {expire} {verb}Ø› Ù„Ø·ÙØ§Ù‹ Ù‡Ø±Ú†Ù‡ Ø³Ø±ÛŒØ¹â€ŒØªØ± Ø¨Ø§ Ù…Ø±Ø§Ø¬Ø¹Ù‡ Ø¨Ù‡ Ø´Ø±Ú©Øª {company} ÙˆØ§Ù‚Ø¹ Ø¯Ø± {address} Ù…Ø±Ø§Ø¬Ø¹Ù‡ Ù†Ù…Ø§ÛŒÛŒØ¯ Ùˆ ÛŒØ§ Ø¨Ø§ Ø´Ù…Ø§Ø±Ù‡ {phone} ØªÙ…Ø§Ø³ Ø­Ø§ØµÙ„ Ù†Ù…Ø§ÛŒÛŒØ¯.";
  }
  $name = trim(($r['first_name']??'').' '.($r['last_name']??''));
  return str_replace(
    ['{name}','{expire}','{company}','{address}','{phone}','{lic}','{verb}','{plate}'],
    [$name, $r['expire']??'', $company, $address, $phone, $licName, $verb, $r['plate']??''],
    $tpl);
}

// Ù¾ÛŒØ´â€ŒÙ†Ù…Ø§ÛŒØ´ Ú¯ÛŒØ±Ù†Ø¯Ú¯Ø§Ù† Ùˆ Ù…ØªÙ† (Ø§Ø¯Ù…ÛŒÙ†)
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

// Ø§Ø±Ø³Ø§Ù„ Ù¾ÛŒØ§Ù…Ú© Ù†Ù…ÙˆÙ†Ù‡ (Ø§Ø¯Ù…ÛŒÙ†)
route('POST', '/api/admin/sms-expiry/sample', function($p,$b,$u){
  $to = trim($b['mobile'] ?? ''); if ($to==='') Http::error('Ø´Ù…Ø§Ø±Ù‡Ù” Ù…Ù‚ØµØ¯ Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯',400);
  $type = $b['type'] ?? 'taxi_lic'; $mode = $b['mode'] ?? 'expiring';
  $sample = ['first_name'=>'Ù†Ù…ÙˆÙ†Ù‡','last_name'=>'ØªØ§Ú©Ø³ÛŒØ±Ø§Ù†','expire'=>'1404/06/31','mobile'=>$to,'plate'=>'12Ø§Ù„Ù345'];
  return Sms::send([$to], _expiry_message($type,$mode,$sample), 'exp_'.$type, $u['id']);
}, false, ADMIN);

// Ø§Ø±Ø³Ø§Ù„ Ø§Ù†Ø¨ÙˆÙ‡ Ø¨Ù‡ Ù‡Ù…Ù‡Ù” Ú¯ÛŒØ±Ù†Ø¯Ú¯Ø§Ù† Ù…Ù†Ø·Ø¨Ù‚ (Ø§Ø¯Ù…ÛŒÙ†)
route('POST', '/api/admin/sms-expiry/send', function($p,$b,$u){
  if (!Sms::isEnabled()) Http::error('Ø³Ø±ÙˆÛŒØ³ Ù¾ÛŒØ§Ù…Ú© ÙØ¹Ø§Ù„ Ù†ÛŒØ³Øª',400);
  $type = $b['type'] ?? 'taxi_lic'; $mode = $b['mode'] ?? 'expiring'; $days = (int)($b['days'] ?? 30);
  $lines = isset($b['lines']) && is_array($b['lines']) && $b['lines'] ? array_map('intval',$b['lines']) : null;
  $rec = _expiry_recipients($type, $mode, $days, $lines);
  if (!$rec) return ['ok'=>true, 'sent'=>0, 'note'=>'Ú¯ÛŒØ±Ù†Ø¯Ù‡â€ŒØ§ÛŒ Ù…Ù†Ø·Ø¨Ù‚ Ø¨Ø§ Ø´Ø±Ø§ÛŒØ· ÛŒØ§ÙØª Ù†Ø´Ø¯'];
  $sent = 0; $fail = 0;
  foreach ($rec as $r) {
    $res = Sms::send([$r['mobile']], _expiry_message($type,$mode,$r), 'exp_'.$type, $u['id']);
    if (!empty($res['ok'])) $sent++; else $fail++;
  }
  return ['ok'=>true, 'sent'=>$sent, 'failed'=>$fail, 'total'=>count($rec)];
}, false, ADMIN);

// Ø§Ø¬Ø±Ø§ÛŒ Ø®ÙˆØ¯Ú©Ø§Ø± Ø±ÙˆØ²Ø§Ù†Ù‡ Ø§Ø² Ø·Ø±ÛŒÙ‚ Cron Ø¨Ø±Ø§ÛŒ Ø§Ù†ÙˆØ§Ø¹ ÙØ¹Ø§Ù„â€ŒØ´Ø¯Ù‡
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
      // Ø¬Ù„ÙˆÚ¯ÛŒØ±ÛŒ Ø§Ø² Ø§Ø±Ø³Ø§Ù„ ØªÚ©Ø±Ø§Ø±ÛŒ: Ø§Ú¯Ø± Ø¯Ø± Û· Ø±ÙˆØ² Ø§Ø®ÛŒØ± Ù‡Ù…ÛŒÙ† Ù†ÙˆØ¹ Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ø´Ù…Ø§Ø±Ù‡ Ø§Ø±Ø³Ø§Ù„ Ø´Ø¯Ù‡ØŒ Ø±Ø¯ Ø´ÙˆØ¯
      $dup = Db::one("SELECT id FROM sms_log WHERE to_mobile=? AND kind=? AND created_at>=DATE_SUB(NOW(),INTERVAL 7 DAY) LIMIT 1", [$r['mobile'],'exp_'.$type]);
      if ($dup) continue;
      $res = Sms::send([$r['mobile']], _expiry_message($type,'expiring',$r), 'exp_'.$type, null);
      if (!empty($res['ok'])) $sent++;
    }
    $report[$type] = $sent;
  }
  return ['ok'=>true, 'sent'=>$report];
}, true);

// ---------------- Ø«Ø¨Øª Ø­Ø¶ÙˆØ± Ø´Ø®ØµÛŒ (Ú†Ú©â€ŒØ§ÛŒÙ†/Ú†Ú©â€ŒØ§ÙˆØª) ----------------
// Ù¾ÛŒÚ©Ø±Ø¨Ù†Ø¯ÛŒ ØµÙØ­Ù‡Ù” Ø«Ø¨Øª Ø­Ø¶ÙˆØ±: Ø®Ø·ÙˆØ· Ú©Ø§Ø±Ø¨Ø± + Ù…Ø­Ø¯ÙˆØ¯Ù‡â€ŒÙ‡Ø§ + Ø´Ù†Ø§Ø³Ù‡â€ŒÙ‡Ø§ÛŒ Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ†
// ØªÙ†Ø¸ÛŒÙ…Ø§Øª Ø¬Ø§Ù…Ø¹ Ø§Ù¾ Ù…ÙˆØ¨Ø§ÛŒÙ„
// Ù…Ø­Ø§Ø³Ø¨Ù‡Ù” Ú©Ø³Ø± ÙÙ‚Ø· Ø¨Ø± Ù¾Ø§ÛŒÙ‡Ù” Ø±ÙˆÛŒØ¯Ø§Ø¯ ØµØ±ÛŒØ­ gps_off Ø§Ø³ØªØ› Ù†Ø¨ÙˆØ¯ checkpoint ÛŒØ§ app_background Ø´Ø§Ù‡Ø¯ Ø®Ø§Ù…ÙˆØ´ÛŒ GPS/Ø¨Ø³ØªÙ‡â€ŒØ´Ø¯Ù† Ú©Ø§Ù…Ù„ Ø¨Ø±Ù†Ø§Ù…Ù‡ Ù†ÛŒØ³Øª.
function _gps_work_required() {
  try {
    $r = Db::one("SELECT value FROM app_settings WHERE `key`='gps_work_required'");
  } catch (Throwable $e) { error_log('GPS work setting read failed: '.$e->getMessage()); return false; }
  if (!$r) return false;
  $v=json_decode((string)$r['value'],true);
  if (is_bool($v)) $required=$v;
  elseif (is_int($v) || is_float($v)) $required=((int)$v)!==0;
  else $required=in_array(strtolower(trim((string)$v)),['1','true','yes','on','enabled','ÙØ¹Ø§Ù„','Ø¨Ù„Ù‡'],true);
  if (!$required) return false;
  // ØªÙ†Ø¸ÛŒÙ… ÙØ¹Ø§Ù„Ù Ù‚Ø¯ÛŒÙ…ÛŒ timestamp Ù†Ø¯Ø§Ø±Ø¯Ø› Ø§Ø² Ø§ÙˆÙ„ÛŒÙ† Ø¨Ø±Ø±Ø³ÛŒ Ù¾Ø³ Ø§Ø² Ø§Ù†ØªØ´Ø§Ø± Ù…Ø¨Ù†Ø§ Ø¨Ø³Ø§Ø²ØŒ
  // Ø¨Ø¯ÙˆÙ† Ø§ÛŒÙ†Ú©Ù‡ Ø®Ø·Ø§ÛŒ Ø°Ø®ÛŒØ±Ù‡â€ŒØ³Ø§Ø²ÛŒ timestamp Ø§Ù„Ø²Ø§Ù… GPS Ø±Ø§ Ø®Ø§Ù…ÙˆØ´ Ú©Ù†Ø¯.
  try {
    $activeRow=Db::one("SELECT value FROM app_settings WHERE `key`='gps_work_required_enabled_at'");
    $activeValue=$activeRow ? json_decode((string)$activeRow['value'],true) : null;
    if (!$activeValue) {
      $nowValue=json_encode(date('Y-m-d H:i:s'),JSON_UNESCAPED_UNICODE);
      Db::run("INSERT INTO app_settings(`key`,value) VALUES('gps_work_required_enabled_at',?) ON DUPLICATE KEY UPDATE value=IF(value IS NULL OR value='null' OR value='',VALUES(value),value)",[$nowValue]);
    }
  } catch (Throwable $e) { error_log('GPS work activation timestamp seed failed: '.$e->getMessage()); }
  return true;
}
function _gps_work_record_event($userId, $kind, $at, $meta=[]) {
  if (!in_array($kind, ['gps_on','gps_off'], true)) return;
  $ts = is_numeric($at) ? (int)$at : strtotime((string)$at);
  if (!$ts) $ts = time();
  Db::run("INSERT INTO user_activity(user_id,kind,meta,at) VALUES(?,?,?,?)", [
    (int)$userId, $kind, json_encode(is_array($meta) ? $meta : [], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES), date('Y-m-d H:i:s', $ts)
  ]);
}
function _gps_work_invalid_intervals($userId, $fromTs, $toTs, $gracePending=false) {
  $fromTs=(int)$fromTs; $toTs=(int)$toTs; $interval=1800;
  if (!$fromTs || !$toTs || $toTs <= $fromTs || !_gps_work_required()) return [];
  $enabledTs=0;
  try {
    $enabledRow=Db::one("SELECT value FROM app_settings WHERE `key`='gps_work_required_enabled_at'");
    $enabledValue=$enabledRow ? json_decode((string)$enabledRow['value'],true) : null;
    $enabledTs=$enabledValue ? (int)strtotime((string)$enabledValue) : 0;
  } catch (Throwable $e) {}
  if ($enabledTs > $fromTs) $fromTs=$enabledTs;
  if ($toTs <= $fromTs) return [];

  try {
    $queryFrom=date('Y-m-d H:i:s',max(1,$fromTs-$interval));
    $queryTo=date('Y-m-d H:i:s',$toTs);
    $events=Db::all("SELECT kind,at FROM user_activity
      WHERE user_id=? AND kind='gps_off' AND at>=? AND at<=?
      ORDER BY at ASC,id ASC",[(int)$userId,$queryFrom,$queryTo]);
  } catch (Throwable $e) {
    error_log('gps work explicit-off query failed; no penalty without evidence: '.$e->getMessage());
    return [];
  }
  return gps_work_explicit_off_intervals($events,$fromTs,$toTs,$interval);
}
route('GET', '/api/my/app-config', function($p,$b,$u){
  $g = function($k,$d=null){ $r=Db::one("SELECT value FROM app_settings WHERE `key`=?",[$k]); if(!$r)return $d; $v=json_decode($r['value'],true); return ($v===null||$v==='')?$d:$v; };
  $gb = function($k,$d=false) use ($g){
    $v=$g($k,$d);
    if(is_bool($v)) return $v;
    if(is_int($v)||is_float($v)) return ((int)$v)!==0;
    $t=strtolower(trim((string)$v));
    if(in_array($t,['1','true','yes','on','enabled','ÙØ¹Ø§Ù„','Ø¨Ù„Ù‡'],true)) return true;
    if(in_array($t,['0','false','no','off','disabled','ØºÛŒØ±ÙØ¹Ø§Ù„','Ø®ÛŒØ±',''],true)) return false;
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
    // ØªÙ†Ø¸ÛŒÙ…Ø§Øª Ø§Ø³Ú©Ø±ÛŒÙ†â€ŒØ´Ø§Øª Ù†Ø§Ù…Ø­Ø³ÙˆØ³ (Ø¬Ø¯Ø§Ú¯Ø§Ù†Ù‡ Ø§Ø² Ø³Ù„ÙÛŒ)
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
    // Ú©ÛŒÙÛŒØª Ùˆ Ø±Ø²ÙˆÙ„ÙˆØ´Ù† ØªØµØ§ÙˆÛŒØ± Ø§Ø±Ø³Ø§Ù„ÛŒ Ø§Ø² Ù…ÙˆØ¨Ø§ÛŒÙ„ Ø¨Ø±Ø§ÛŒ Ú¯Ø²Ø§Ø±Ø´Ø§Øª (Ù‚Ø§Ø¨Ù„ ØªÙ†Ø¸ÛŒÙ… Ø¯Ø± Ù¾Ù†Ù„)
    'image_quality'        => max(10, min(100, (int)($g('image_quality', 45) ?: 45))),     // Ø¯Ø±ØµØ¯ ÙØ´Ø±Ø¯Ù‡â€ŒØ³Ø§Ø²ÛŒ JPEG
    'image_max_width'      => max(240, min(4096, (int)($g('image_max_width', 1024) ?: 1024))), // Ø­Ø¯Ø§Ú©Ø«Ø± Ø¹Ø±Ø¶ ØªØµÙˆÛŒØ± (Ù¾ÛŒÚ©Ø³Ù„)
    'image_max_height'     => max(240, min(4096, (int)($g('image_max_height', 1920) ?: 1920))),
    // Ù…Ø­Ø¯ÙˆØ¯ÛŒØªâ€ŒÙ‡Ø§ÛŒ Ù…Ø§Ù‡Ø§Ù†Ù‡
    'forget_checkin_monthly_limit' => (int)($g('forget_checkin_monthly_limit', 0) ?: 0), // 0 = Ø¨Ø¯ÙˆÙ† Ù…Ø­Ø¯ÙˆØ¯ÛŒØª
    'logout_monthly_limit'  => (int)($g('logout_monthly_limit', 0) ?: 0), // 0 = Ø¨Ø¯ÙˆÙ† Ù…Ø­Ø¯ÙˆØ¯ÛŒØª
    'allow_logout'          => $g('allow_logout', true)!==false, // Ø¢ÛŒØ§ Ú©Ø§Ø±Ø¨Ø± Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ø¯ Ø®Ø§Ø±Ø¬ Ø´ÙˆØ¯ØŸ
    // Ù‡Ø²ÛŒÙ†Ù‡Ù” Ù‡Ø± Ù¾ÛŒØ§Ù…Ú© (Ø±ÛŒØ§Ù„) Ø¨Ø±Ø§ÛŒ Ù…Ø­Ø§Ø³Ø¨Ù‡Ù” ØªØ¹Ø¯Ø§Ø¯ Ù‚Ø§Ø¨Ù„ Ø§Ø±Ø³Ø§Ù„ Ø¨Ø§ Ù…Ø§Ù†Ø¯Ù‡ Ø§Ø¹ØªØ¨Ø§Ø±
    'sms_cost_fa'           => (int)($g('sms_cost_fa', 0) ?: 0), // Ù‡Ø²ÛŒÙ†Ù‡Ù” Ù¾ÛŒØ§Ù…Ú© ÙØ§Ø±Ø³ÛŒ
    'sms_cost_en'           => (int)($g('sms_cost_en', 0) ?: 0), // Ù‡Ø²ÛŒÙ†Ù‡Ù” Ù¾ÛŒØ§Ù…Ú© Ø§Ù†Ú¯Ù„ÛŒØ³ÛŒ
    // Ø±Ø¯ÛŒØ§Ø¨ÛŒ Ù…ÙˆÙ‚Ø¹ÛŒØª Ø§Ø² Ø·Ø±ÛŒÙ‚ GSM (ÙˆÙ‚ØªÛŒ GPS Ø®Ø§Ù…ÙˆØ´ Ø§Ø³Øª)
    'gsm_tracking_enabled'  => $g('gsm_tracking_enabled', true)!==false,
    'gsm_ping_minutes'      => max(1,min(60,(int)($g('gsm_ping_minutes', 2) ?: 2))), // ÙØ§ØµÙ„Ù‡Ù” Ù¾ÛŒÙ†Ú¯ GSM (Ø¯Ù‚ÛŒÙ‚Ù‡)
    'gps_work_required'     => $gb('gps_work_required', false),
    'internet_work_required'=> $gb('internet_work_required', true),
    'gps_check_seconds'     => max(15,min(3600,(int)($g('gps_check_seconds', 60) ?: 60))), // ÙØ§ØµÙ„Ù‡Ù” Ø¨Ø±Ø±Ø³ÛŒ Ø±ÙˆØ´Ù† Ø¨ÙˆØ¯Ù† GPS (Ø«Ø§Ù†ÛŒÙ‡)
    'vpn_check_seconds'     => max(15,min(3600,(int)($g('vpn_check_seconds', 60) ?: 60))),
    'station_check_seconds' => max(15,min(3600,(int)($g('station_check_seconds', 60) ?: 60))),
    'leave_require_substitute' => _req_leave_substitute_required($u['id']), // only daily annual leave; substitute staff exempt except specified zones
    'manual_attendance_selfie' => !empty(_req_policy_options($u['id'],false)['manual_attendance_selfie']),
    // Ø­Ø§Ù„Øª ÙØ¹Ø§Ù„ÛŒØª: always (Ù‡Ù…ÛŒØ´Ù‡) ÛŒØ§ shift_only (ÙÙ‚Ø· Ø¯Ø± Ø³Ø§Ø¹Ø§Øª Ø´ÛŒÙØª Ú©Ø§Ø±ÛŒ)
    'activity_mode'         => $g('activity_mode', 'always'), // always | shift_only
    // Ø´ÛŒÙØª ÙØ¹Ù„ÛŒ Ú©Ø§Ø±Ø¨Ø± (Ø¨Ø±Ø§ÛŒ ØªØµÙ…ÛŒÙ…â€ŒÚ¯ÛŒØ±ÛŒ Ø¯Ø±ÙˆÙ† Ø§Ù¾)
    'user_shift'            => (function() use ($u) {
      $us = Db::one("SELECT s.* FROM shifts s JOIN user_shifts us ON us.shift_id=s.id WHERE us.user_id=? AND s.is_active=1 LIMIT 1", [$u['id']]);
      return $us ? ['type'=>$us['type'], 'weekly'=>json_decode($us['weekly']??'{}',true), 'title'=>$us['title']] : null;
    })(),
  ];
});
// Ø¯ÛŒØªØ§ÛŒ Ø³Ø¨Ú© Ø±Ø§Ù†Ù†Ø¯Ú¯Ø§Ù† Ø®Ø·ÙˆØ· Ú©Ø§Ø±Ø¨Ø± Ø¨Ø±Ø§ÛŒ Ú©Ø´ Ø±ÙˆØ²Ø§Ù†Ù‡ Ùˆ Ø¬Ø³ØªØ¬ÙˆÛŒ Ø¢ÙÙ„Ø§ÛŒÙ†
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
  _attendance_auto_close_stale((int)$u['id']);
  // The app must display only Wi-Fi identifiers accepted by POST /my/checkin.
  // Previously config used viewable lines while attendance validation used
  // the narrower check-in permission list, so the UI could advertise a BSSID
  // that the server would later reject.
  $ids = user_checkin_line_ids($u);
  if ($ids === null) $ids = array_map('intval', array_column(Db::all("SELECT id FROM `lines`"), 'id'));
  $lines = [];
  if (is_array($ids) && $ids) {
    $in = implode(',', array_fill(0, count($ids), '?'));
    $lines = Db::all("SELECT id, code, origin, destination, checkin_methods FROM `lines` WHERE id IN ($in) ORDER BY code", $ids);
    $fences = Db::all("SELECT id,line_id,name,type,center_lat,center_lng,radius_m,polygon FROM geofences WHERE line_id IN ($in)", $ids);
    // ÛŒÚ©Ø¯Ø³Øªâ€ŒØ³Ø§Ø²ÛŒ: polygon Ø±Ø§ Ø¨Ù‡ Ø¢Ø±Ø§ÛŒÙ‡ ØªØ¨Ø¯ÛŒÙ„ Ú©Ù† Ùˆ type Ø±Ø§ Ø§ØµÙ„Ø§Ø­ Ú©Ù† ØªØ§ Ø§Ù¾ Ø¨Ø¯ÙˆÙ† Ø§Ø¨Ù‡Ø§Ù… Ù…Ø­Ø§Ø³Ø¨Ù‡ Ú©Ù†Ø¯
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
      // Ø±ÙˆØ´â€ŒÙ‡Ø§ÛŒ Ù…Ø¬Ø§Ø² Ø«Ø¨Øª Ø­Ø¶ÙˆØ± Ø§ÛŒÙ† Ø®Ø·Ø› Ø§Ú¯Ø± null Ø¨Ø§Ø´Ø¯ØŒ Ù‡Ù…Ù‡Ù” Ø±ÙˆØ´â€ŒÙ‡Ø§ Ù…Ø¬Ø§Ø²Ù†Ø¯
      $m = $l['checkin_methods'] ?? null;
      $l['checkin_methods'] = $m ? (json_decode($m, true) ?: null) : null;
    }
  }
  $open = Db::one("SELECT id, line_id, check_in, method FROM staff_attendance WHERE user_id=? AND check_out IS NULL ORDER BY id DESC LIMIT 1", [$u['id']]);
  return ['lines'=>$lines, 'open'=>$open];
});

function _attendance_checkin_traffic($userId,$eventAt){
  $timestamp=strtotime($eventAt);
  [$year,$month,$day]=gregorian_to_jalali((int)date('Y',$timestamp),(int)date('n',$timestamp),(int)date('j',$timestamp));
  $date=sprintf('%04d-%02d-%02d',$year,$month,$day);
  $shift=_active_user_shift_assignment($userId,$date);
  if(!$shift||($shift['type']??'')!=='advanced')return;
  $dayRow=_shift_day_row($shift['shift_id']??$shift['id'],$date);
  $result=ShiftCalc::checkTrafficWindow($dayRow,$timestamp);
  if(empty($result['ok']))Http::error($result['reason'],422);
}
// Ø«Ø¨Øª ÙˆØ±ÙˆØ¯
route('POST', '/api/my/checkin', function($p,$b,$u){
  $eventAt = _app_client_time($b);
  _attendance_auto_close_stale((int)$u['id']);
  // Ø§Ú¯Ø± Ø¬Ù„Ø³Ù‡Ù” Ø¨Ø§Ø² Ø¯Ø§Ø±Ø¯ØŒ Ø§Ø¬Ø§Ø²Ù‡Ù” ÙˆØ±ÙˆØ¯ Ù…Ø¬Ø¯Ø¯ Ù†Ø¯Ù‡
  $open = Db::one("SELECT id FROM staff_attendance WHERE user_id=? AND check_out IS NULL", [$u['id']]);
  if ($open) Http::error('Ø´Ù…Ø§ Ù‚Ø¨Ù„Ø§Ù‹ Ø«Ø¨Øª ÙˆØ±ÙˆØ¯ Ú©Ø±Ø¯Ù‡â€ŒØ§ÛŒØ¯. Ø§Ø¨ØªØ¯Ø§ Ø®Ø±ÙˆØ¬ Ø¨Ø²Ù†ÛŒØ¯.', 400);
  _attendance_checkin_traffic((int)$u['id'],$eventAt);
  $lineId = (int)($b['line_id'] ?? 0);
  $method = strtolower((string)($b['method'] ?? 'gps'));
  if (in_array($method, ['qr','nfc','rfid','bt','bluetooth'], true)) Http::error('Ø§ÛŒÙ† Ø±ÙˆØ´ Ø«Ø¨Øª Ø­Ø¶ÙˆØ± Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒ Ù†Ù…ÛŒâ€ŒØ´ÙˆØ¯. Ø§Ø² GPSØŒ Wi-Fi ÛŒØ§ GSM Ø§Ø³ØªÙØ§Ø¯Ù‡ Ú©Ù†ÛŒØ¯.', 422);
  $lineIds = user_checkin_line_ids($u);
  if ($lineIds === null) $lineIds = array_map('intval', array_column(Db::all("SELECT id FROM `lines`"), 'id'));
  // Ø§Ù†ØªØ®Ø§Ø¨ Ø®Ø· Ø§Ø² Ø§Ù¾ Ø­Ø°Ù Ø´Ø¯Ù‡ Ø§Ø³ØªØ› Ø§Ú¯Ø± Ú©Ù„Ø§ÛŒÙ†Øª Ù‚Ø¯ÛŒÙ…ÛŒ line_id Ø¨ÙØ±Ø³ØªØ¯ØŒ ÙÙ‚Ø· ÙˆÙ‚ØªÛŒ Ù…ÛŒâ€ŒÙ¾Ø°ÛŒØ±ÛŒÙ… Ú©Ù‡ Ø¬Ø²Ùˆ Ø®Ø·ÙˆØ· Ù…Ø¬Ø§Ø² Ú©Ø§Ø±Ø¨Ø± Ø¨Ø§Ø´Ø¯.
  if ($lineId && (!is_array($lineIds) || !in_array($lineId, array_map('intval', $lineIds), true))) $lineId = 0;
  // Ø¨Ø±Ø±Ø³ÛŒ Ù…Ø¬Ø§Ø² Ø¨ÙˆØ¯Ù† Ø±ÙˆØ´ Ø«Ø¨Øª Ø­Ø¶ÙˆØ± Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ø®Ø· (Ø¯Ø± ØµÙˆØ±Øª ØªØ¹Ø±ÛŒÙ Ù…Ø­Ø¯ÙˆØ¯ÛŒØª)Ø› Ø¨Ø±Ø§ÛŒ Ø­Ø§Ù„Øª Ø®ÙˆØ¯Ú©Ø§Ø±ØŒ Ù¾Ø³ Ø§Ø² ØªØ´Ø®ÛŒØµ Ø®Ø· Ù†ÛŒØ² Ø¯ÙˆØ¨Ø§Ø±Ù‡ Ú©Ù†ØªØ±Ù„ Ù…ÛŒâ€ŒØ´ÙˆØ¯.
  if ($lineId) {
    $lrow = Db::one("SELECT checkin_methods FROM `lines` WHERE id=?", [$lineId]);
    if ($lrow && !empty($lrow['checkin_methods'])) {
      $allowed = json_decode($lrow['checkin_methods'], true);
      if (is_array($allowed)) $allowed = array_values(array_filter($allowed, fn($m)=>!in_array(strtolower((string)$m), ['qr','nfc','rfid','bt','bluetooth'], true)));
      if (is_array($allowed) && $allowed && !in_array($method, $allowed, true)) {
        $names = ['gps'=>'Ù…ÙˆÙ‚Ø¹ÛŒØª (GPS)','wifi'=>'WiFi','gsm'=>'Ø¢Ù†ØªÙ† GSM'];
        $allowedFa = implode('ØŒ ', array_map(fn($m)=>$names[$m]??$m, $allowed));
        Http::error("Ø±ÙˆØ´ Ø§Ù†ØªØ®Ø§Ø¨ÛŒ Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ø®Ø· Ù…Ø¬Ø§Ø² Ù†ÛŒØ³Øª. Ø±ÙˆØ´â€ŒÙ‡Ø§ÛŒ Ù…Ø¬Ø§Ø²: {$allowedFa}", 422);
      }
    }
  }
  [$lat, $lng] = validGeo($b['lat'] ?? null, $b['lng'] ?? null);
  $ok = false; $err = 'ØªØ£ÛŒÛŒØ¯ Ø­Ø¶ÙˆØ± Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯.';
  if ($method === 'gps') {
    if ($lat === null) Http::error('Ù…ÙˆÙ‚Ø¹ÛŒØª Ù…Ú©Ø§Ù†ÛŒ Ø¯Ø± Ø¯Ø³ØªØ±Ø³ Ù†ÛŒØ³Øª. GPS Ø±Ø§ Ø±ÙˆØ´Ù† Ú©Ù†ÛŒØ¯ ÛŒØ§ Ø§Ø² Ø±ÙˆØ´ Ø¯ÛŒÚ¯Ø±ÛŒ Ø§Ø³ØªÙØ§Ø¯Ù‡ Ú©Ù†ÛŒØ¯.', 422);
    // Ù…Ø­Ø¯ÙˆØ¯Ù‡Ù” Ø®Ø·Ø§ÛŒ Ù…Ø¬Ø§Ø² + Ø¨Ø®Ø´ÛŒ Ø§Ø² accuracy Ú¯ÙˆØ´ÛŒ. Ø§Ú¯Ø± Ú©Ø§Ø±Ø¨Ø± ÙˆØ§Ù‚Ø¹Ø§Ù‹ Ø¯Ø§Ø®Ù„ Ù…Ø­Ø¯ÙˆØ¯Ù‡ Ø¨Ø§Ø´Ø¯ØŒ Ø§Ù†ØªØ®Ø§Ø¨ Ø§Ø´ØªØ¨Ø§Ù‡ Ø®Ø· Ø¯Ø± Ø§Ù¾ Ø¨Ø§Ø¹Ø« Ø±Ø¯ Ø­Ø¶ÙˆØ± Ù†Ø´ÙˆØ¯.
    $acc = isset($b['accuracy']) ? max(0, min(100, (float)$b['accuracy'])) : 0;
    $extraR = max(20, (int)_req_setting('checkin_error_radius_m', 0)) + (int)ceil(min(80, $acc * 0.75));
    $searchIds = $lineId ? [$lineId] : $lineIds;
    $st = station_at_point($lat, $lng, $searchIds, $extraR);
    // Ø§Ú¯Ø± Ø®Ø· Ø§Ù†ØªØ®Ø§Ø¨ÛŒ Ø§Ø´ØªØ¨Ø§Ù‡ Ø¨ÙˆØ¯ ÙˆÙ„ÛŒ Ú©Ø§Ø±Ø¨Ø± Ø¯Ø± ÛŒÚ©ÛŒ Ø§Ø² Ø®Ø·ÙˆØ· Ù…Ø¬Ø§Ø² Ø®ÙˆØ¯Ø´ Ø­Ø§Ø¶Ø± Ø§Ø³ØªØŒ Ø®ÙˆØ¯Ú©Ø§Ø± Ù‡Ù…Ø§Ù† Ø®Ø· Ø¯Ø±Ø³Øª Ø§Ù†ØªØ®Ø§Ø¨ Ø´ÙˆØ¯.
    if (!$st && $lineId && is_array($lineIds)) $st = station_at_point($lat, $lng, $lineIds, $extraR);
    if ($st) { $ok = true; $lineId = (int)($st['line_id'] ?? $lineId ?: 0); }
    else {
      // Ú©Ø§Ø±Ø¨Ø± Ù…Ù…Ú©Ù† Ø§Ø³Øª Ø¯Ø³ØªØ±Ø³ÛŒ Ù…Ø´Ø§Ù‡Ø¯Ù‡Ù” Ø§Ø·Ù„Ø§Ø¹Ø§Øª ÛŒÚ© Ø®Ø· Ø±Ø§ Ø¯Ø§Ø´ØªÙ‡ Ø¨Ø§Ø´Ø¯ Ø§Ù…Ø§ Ù…Ø¬ÙˆØ² Ø«Ø¨Øª Ø­Ø¶ÙˆØ± Ø¯Ø± Ø¢Ù† Ø®Ø· Ø±Ø§ Ù†Ø¯Ø§Ø´ØªÙ‡ Ø¨Ø§Ø´Ø¯.
      // ÙÙ‚Ø· Ø§Ú¯Ø± Ù…Ø®ØªØµØ§Øª Ø¯Ø§Ø®Ù„ Ù…Ø­Ø¯ÙˆØ¯Ù‡Ù” ÛŒÚ©ÛŒ Ø§Ø² Ø®Ø·ÙˆØ·Ù Ø¨Ø¯ÙˆÙ† Ù…Ø¬ÙˆØ² Ø«Ø¨Øª Ø­Ø¶ÙˆØ± Ø¨Ø§Ø´Ø¯ØŒ Ù¾ÛŒØ§Ù… Ø§Ø®ØªØµØ§ØµÛŒ Ù†Ù…Ø§ÛŒØ´ Ø¨Ø¯Ù‡Ø›
      // Ø®Ø§Ø±Ø¬ Ø¨ÙˆØ¯Ù† Ø§Ø² Ù‡Ù…Ù‡Ù” Ø®Ø·ÙˆØ· ÛŒØ§ ØµØ±ÙØ§Ù‹ Ù†Ø²Ø¯ÛŒÚ© Ø¨ÙˆØ¯Ù† Ø¨Ù‡ ÛŒÚ© Ø®Ø·ØŒ Ù†Ø¨Ø§ÛŒØ¯ Ø§ÛŒÙ† Ù¾ÛŒØ§Ù… Ø±Ø§ ÙØ¹Ø§Ù„ Ú©Ù†Ø¯.
      $viewLineIds = user_line_ids($u);
      $deniedLineIds = [];
      if (is_array($viewLineIds) && is_array($lineIds)) {
        $deniedLineIds = array_values(array_diff(array_map('intval', $viewLineIds), array_map('intval', $lineIds)));
      }
      $deniedStation = $deniedLineIds ? station_at_point($lat, $lng, $deniedLineIds, $extraR) : null;
      $near = _nearest_station($lat, $lng, is_array($lineIds) ? $lineIds : ($lineId ? [$lineId] : $lineIds));
      if ($deniedStation) {
        $err = 'Ø´Ù…Ø§ Ù…Ø¬Ø§Ø² Ø¨Ù‡ Ø«Ø¨Øª Ø­Ø¶ÙˆØ± Ø¯Ø± Ø§ÛŒÙ† Ø®Ø· Ù†ÛŒØ³ØªÛŒØ¯.';
        if ($near) {
          $err .= ' Ù†Ø²Ø¯ÛŒÚ©â€ŒØªØ±ÛŒÙ† Ø§ÛŒØ³ØªÚ¯Ø§Ù‡ Ø§Ø² Ø®Ø·ÙˆØ· Ù…Ø¬Ø§Ø² Â«'.$near['name'].'Â» Ø¯Ø± ÙØ§ØµÙ„Ù‡Ù” '.number_format($near['distance_m']).' Ù…ØªØ±ÛŒ Ø´Ù…Ø§Ø³Øª'
            . ($extraR > 0 ? " (Ù…Ø­Ø¯ÙˆØ¯Ù‡Ù” Ø®Ø·Ø§ÛŒ Ù…Ø¬Ø§Ø²: {$extraR} Ù…ØªØ±)" : '') . '.';
        } else {
          $err .= ' Ø¨Ø±Ø§ÛŒ Ø®Ø·ÙˆØ· Ù…Ø¬Ø§Ø² Ø´Ù…Ø§ Ù…Ø­Ø¯ÙˆØ¯Ù‡â€ŒØ§ÛŒ Ø¨Ø±Ø§ÛŒ Ø«Ø¨Øª Ø­Ø¶ÙˆØ± ØªØ¹Ø±ÛŒÙ Ù†Ø´Ø¯Ù‡ Ø§Ø³ØªØ› Ø¨Ø§ Ù…Ø¯ÛŒØ± Ø³ÛŒØ³ØªÙ… ØªÙ…Ø§Ø³ Ø¨Ú¯ÛŒØ±ÛŒØ¯.';
        }
      } elseif ($near) {
        $err = 'Ø´Ù…Ø§ Ø¯Ø± Ù…Ø­Ø¯ÙˆØ¯Ù‡Ù” Ø§ÛŒØ³ØªÚ¯Ø§Ù‡ Ù†ÛŒØ³ØªÛŒØ¯. Ù†Ø²Ø¯ÛŒÚ©â€ŒØªØ±ÛŒÙ† Ø§ÛŒØ³ØªÚ¯Ø§Ù‡ Â«'.$near['name'].'Â» Ø¯Ø± '.number_format($near['distance_m']).' Ù…ØªØ±ÛŒ Ø´Ù…Ø§Ø³Øª' . ($extraR > 0 ? " (Ù…Ø­Ø¯ÙˆØ¯Ù‡Ù” Ø®Ø·Ø§ÛŒ Ù…Ø¬Ø§Ø²: {$extraR} Ù…ØªØ±)" : '') . '.';
      } else {
        $err = 'Ø´Ù…Ø§ Ø¯Ø± Ù…Ø­Ø¯ÙˆØ¯Ù‡Ù” Ø§ÛŒØ³ØªÚ¯Ø§Ù‡ Ù†ÛŒØ³ØªÛŒØ¯.' . ($extraR > 0 ? " (Ù…Ø­Ø¯ÙˆØ¯Ù‡Ù” Ø®Ø·Ø§: {$extraR} Ù…ØªØ±)" : '');
      }
    }
  } elseif ($method === 'gsm') {
    // ØªØ´Ø®ÛŒØµ Ø­Ø¶ÙˆØ± Ø¨Ø§ Ø¢Ù†ØªÙ† GSM: Ø´Ù†Ø§Ø³Ù‡Ù” Ø³Ù„ÙˆÙ„ (Cell ID/LAC/MCC/MNC) Ø§Ø±Ø³Ø§Ù„ÛŒ Ø¨Ø§ÛŒØ¯ Ø¨Ø§ Ø´Ù†Ø§Ø³Ù‡â€ŒÙ‡Ø§ÛŒ Ø«Ø¨Øªâ€ŒØ´Ø¯Ù‡Ù” Ø®Ø· Ù…Ø·Ø§Ø¨Ù‚Øª Ú©Ù†Ø¯
    $proof = trim((string)($b['proof'] ?? ''));
    if ($proof === '') Http::error('Ø´Ù†Ø§Ø³Ù‡Ù” Ø¢Ù†ØªÙ† GSM Ø¯Ø±ÛŒØ§ÙØª Ù†Ø´Ø¯. Ù…Ø·Ù…Ø¦Ù† Ø´ÙˆÛŒØ¯ Ø¢Ù†ØªÙ† Ø¯Ú©Ù„ Ø¯Ø± Ù…Ø­Ø¯ÙˆØ¯Ù‡Ù” Ø®Ø· Ø«Ø¨Øª Ø´Ø¯Ù‡ Ø§Ø³Øª.', 400);
    $norm = strtolower(str_replace([' ',':','-'],'',$proof));
    $cond = $lineId ? "line_id=?" : ($lineIds ? "line_id IN (".implode(',',array_fill(0,count($lineIds),'?')).")" : "1=0");
    $args = $lineId ? [$lineId] : ($lineIds ?: []);
    $cands = Db::all("SELECT line_id, value FROM line_idents WHERE kind='gsm' AND ($cond)", $args);
    foreach ($cands as $c) {
      if (strtolower(str_replace([' ',':','-'],'',$c['value'])) === $norm) { $ok = true; if(!$lineId) $lineId = (int)$c['line_id']; break; }
    }
    if (!$ok) $err = 'Ø¢Ù†ØªÙ† GSM ÙØ¹Ù„ÛŒ Ø´Ù…Ø§ Ø¨Ø§ Ø¯Ú©Ù„â€ŒÙ‡Ø§ÛŒ Ø«Ø¨Øªâ€ŒØ´Ø¯Ù‡Ù” Ø§ÛŒÙ† Ø®Ø· Ù…Ø·Ø§Ø¨Ù‚Øª Ù†Ø¯Ø§Ø±Ø¯. (Ø¯Ø± Ù…Ø­Ø¯ÙˆØ¯Ù‡Ù” Ø®Ø· Ù†ÛŒØ³ØªÛŒØ¯)';
  } else {
    // Wi-Fi â€” Ù…Ù‚Ø¯Ø§Ø± Ø§Ø±Ø§Ø¦Ù‡â€ŒØ´Ø¯Ù‡ Ø¨Ø§ÛŒØ¯ Ø¨Ø§ Ø´Ù†Ø§Ø³Ù‡â€ŒÙ‡Ø§ÛŒ Ø®Ø· Ù…Ø·Ø§Ø¨Ù‚Øª Ú©Ù†Ø¯
    $proof = trim((string)($b['proof'] ?? ''));
    if ($proof === '') Http::error('Ø´Ù†Ø§Ø³Ù‡Ù” ØªØ£ÛŒÛŒØ¯ Ø§Ø±Ø³Ø§Ù„ Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª.', 400);
    $norm = _attendance_normalize_bssid($proof);
    if ($norm === '') Http::error('Ù‚Ø§Ù„Ø¨ BSSID Ø§Ø±Ø³Ø§Ù„ÛŒ Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª.', 400);
    $cond = $lineId ? "line_id=?" : ($lineIds ? "line_id IN (".implode(',',array_fill(0,count($lineIds),'?')).")" : "1=0");
    $args = $lineId ? [$lineId] : ($lineIds ?: []);
    $cands = Db::all("SELECT line_id, kind, value FROM line_idents WHERE kind=? AND ($cond)", array_merge([$method], $args));
    foreach ($cands as $c) {
      if (_attendance_normalize_bssid($c['value']) === $norm) { $ok = true; if(!$lineId) $lineId = (int)$c['line_id']; break; }
    }
    if (!$ok) $err = 'Ø´Ù†Ø§Ø³Ù‡Ù” Ø§Ø±Ø§Ø¦Ù‡â€ŒØ´Ø¯Ù‡ Ø¨Ø§ Ù‡ÛŒÚ†â€ŒÛŒÚ© Ø§Ø² Ø´Ù†Ø§Ø³Ù‡â€ŒÙ‡Ø§ÛŒ Ø§ÛŒÙ† Ø®Ø· Ù…Ø·Ø§Ø¨Ù‚Øª Ù†Ø¯Ø§Ø±Ø¯.';
  }
  if (!$ok) { _attendance_reject_log((int)$u['id'],$lineId,$method,$lat,$lng,$b['accuracy'] ?? null,$err,['line_ids'=>$lineIds]); Http::error($err, 403); }
  // Ù¾Ø³ Ø§Ø² ØªØ´Ø®ÛŒØµ Ø®ÙˆØ¯Ú©Ø§Ø± Ø®Ø·ØŒ Ø±ÙˆØ´ Ø«Ø¨Øª Ø­Ø¶ÙˆØ± Ù‡Ù…Ø§Ù† Ø®Ø· Ú©Ù†ØªØ±Ù„ Ù…ÛŒâ€ŒØ´ÙˆØ¯ ØªØ§ Ø­Ø°Ù Ø§Ù†ØªØ®Ø§Ø¨ Ø¯Ø³ØªÛŒ Ø¨Ø§Ø¹Ø« Ø¯ÙˆØ±Ø²Ø¯Ù† Ù…Ø­Ø¯ÙˆØ¯ÛŒØª Ø±ÙˆØ´â€ŒÙ‡Ø§ Ù†Ø´ÙˆØ¯.
  if ($lineId) {
    $lrow = Db::one("SELECT checkin_methods FROM `lines` WHERE id=?", [$lineId]);
    if ($lrow && !empty($lrow['checkin_methods'])) {
      $allowed = json_decode($lrow['checkin_methods'], true);
      if (is_array($allowed)) $allowed = array_values(array_filter($allowed, fn($m)=>!in_array(strtolower((string)$m), ['qr','nfc','rfid','bt','bluetooth'], true)));
      if (is_array($allowed) && $allowed && !in_array($method, $allowed, true)) {
        $names = ['gps'=>'Ù…ÙˆÙ‚Ø¹ÛŒØª (GPS)','wifi'=>'WiFi','gsm'=>'Ø¢Ù†ØªÙ† GSM'];
        $allowedFa = implode('ØŒ ', array_map(fn($m)=>$names[$m]??$m, $allowed));
        $msg = "Ø±ÙˆØ´ Ø§Ù†ØªØ®Ø§Ø¨ÛŒ Ø¨Ø±Ø§ÛŒ Ø®Ø· ØªØ´Ø®ÛŒØµâ€ŒØ¯Ø§Ø¯Ù‡â€ŒØ´Ø¯Ù‡ Ù…Ø¬Ø§Ø² Ù†ÛŒØ³Øª. Ø±ÙˆØ´â€ŒÙ‡Ø§ÛŒ Ù…Ø¬Ø§Ø²: {$allowedFa}";
        _attendance_reject_log((int)$u['id'],$lineId,$method,$lat,$lng,$b['accuracy'] ?? null,$msg,['line_ids'=>$lineIds,'auto_line'=>true]);
        Http::error($msg, 422);
      }
    }
  }
  // Ø«Ø¨Øª ÙˆØ±ÙˆØ¯/Ø®Ø±ÙˆØ¬ Ø¯Ø± Ù‡Ø± Ø³Ø§Ø¹Øª Ù…Ø¬Ø§Ø² Ø§Ø³Øª. Ø´ÛŒÙØª ÙÙ‚Ø· Ø¨Ø±Ø§ÛŒ Ù…Ø­Ø§Ø³Ø¨Ù‡Ù” Ù…ÙˆØ¸ÙÛŒØŒ Ø§Ø¶Ø§ÙÙ‡â€ŒÚ©Ø§Ø± Ùˆ
  // Ú¯Ø²Ø§Ø±Ø´ Ø±ÙˆØ²Ø§Ù†Ù‡ Ø§Ø³ØªÙØ§Ø¯Ù‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯ Ùˆ Ù†Ø¨Ø§ÛŒØ¯ Ù…Ø§Ù†Ø¹ Ø«Ø¨Øª Ø­Ø¶ÙˆØ± ÙˆØ§Ù‚Ø¹ÛŒÙ Ù†ÛŒØ±Ùˆ Ø¯Ø± Ù…ÛŒØ§Ù†Ù‡Ù” Ø±ÙˆØ² Ø´ÙˆØ¯.
  [$jy,$jm,$jd] = gregorian_to_jalali(date('Y', strtotime($eventAt)),date('m', strtotime($eventAt)),date('d', strtotime($eventAt)));
  $jdate = sprintf('%04d-%02d-%02d',$jy,$jm,$jd);
  // Ù†Ø§Ù… Ù…Ø­Ù„ ÙˆØ±ÙˆØ¯ Ø§Ø² Ø±ÙˆÛŒ Ù…Ø®ØªØµØ§Øª (Ù†Ø²Ø¯ÛŒÚ©â€ŒØªØ±ÛŒÙ† Ø§ÛŒØ³ØªÚ¯Ø§Ù‡/Ù…Ø­Ø¯ÙˆØ¯Ù‡Ù” Ø®Ø·)
  $inStation = $method === 'wifi' ? null : (($st['name'] ?? null) ?: _station_name_at($lat, $lng, $lineIds));
  $id = Db::insert("INSERT INTO staff_attendance(user_id,line_id,method,check_in,in_lat,in_lng,in_station,client_check_in) VALUES(?,?,?,?,?,?,?,?)",
    [$u['id'], $lineId ?: null, $method, $eventAt, $lat, $lng, $inStation, $eventAt]);
  if (_gps_work_required() && $lat !== null && $lng !== null) {
    try { _gps_work_record_event((int)$u['id'], 'gps_on', $eventAt, ['source'=>'attendance_checkin','attendance_id'=>(int)$id,'interval_minutes'=>30]); }
    catch (Throwable $e) { error_log('GPS check-in verification event failed: '.$e->getMessage()); }
  }
  $presenceSchedule=[];
  try{
    $pcRow=Db::one("SELECT value FROM app_settings WHERE `key`='presence_check'");
    $pcfg=$pcRow?json_decode($pcRow['value'],true):[];
    $presenceRequired=false;
    try{$pr=Db::one("SELECT presence_required FROM users WHERE id=?",[$u['id']]);$presenceRequired=!empty($pr['presence_required']);}catch(Throwable $e){}
    [$pjy,$pjm,$pjd]=gregorian_to_jalali((int)date('Y',strtotime($eventAt)),(int)date('n',strtotime($eventAt)),(int)date('j',strtotime($eventAt)));
    $pjdate=sprintf('%04d-%02d-%02d',$pjy,$pjm,$pjd);
    if(_presence_random_schedule_enabled($pcfg) && _presence_is_required_for_user((int)$u['id'],$pcfg,$presenceRequired,$pjdate,strtotime($eventAt))){
      $presenceSchedule=_presence_random_schedule_for_attendance((int)$u['id'],(int)$id,$eventAt,$pcfg);
    }
  }catch(Throwable $e){ error_log('presence random schedule suppressed: '.$e->getMessage()); }
  try { _notify_attendance_action('checkin',(int)$u['id'],$lineId ?: null,$method,$inStation,$eventAt); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  return ['ok'=>true, 'id'=>$id, 'check_in'=>$eventAt, 'presence_random_schedule'=>_presence_random_schedule_payload($presenceSchedule)];
});

// Ø«Ø¨Øª Ø®Ø±ÙˆØ¬
route('POST', '/api/my/checkout', function($p,$b,$u){
  _ensure_attendance_phase1_schema();
  $eventAt = _app_client_time($b);
  $autoClosed = _attendance_auto_close_stale((int)$u['id']);
  $open = Db::one("SELECT id, check_in, line_id, method FROM staff_attendance WHERE user_id=? AND check_out IS NULL ORDER BY id DESC LIMIT 1", [$u['id']]);
  // Ø¬Ù„Ø³Ù‡â€ŒØ§ÛŒ Ú©Ù‡ Ø¨Ù‡â€ŒØ¯Ù„ÛŒÙ„ Ø¹Ø¨ÙˆØ± Ø§Ø² Ø³Ù‚Ù Û±Û´ Ø³Ø§Ø¹Øª Ù‡Ù…ÛŒÙ† Ù„Ø­Ø¸Ù‡ Ø¨Ø³ØªÙ‡ Ø´Ø¯Ù‡ØŒ Ø®Ø·Ø§ÛŒ Ø«Ø¨Øª Ø®Ø±ÙˆØ¬ Ù†ÛŒØ³Øª.
  if (!$open && $autoClosed) {
    return ['ok'=>true,'auto_closed'=>true,'check_out'=>$autoClosed['check_out'] ?? null,'attendance_id'=>(int)($autoClosed['id'] ?? 0),'auto_close_reason'=>$autoClosed['reason'] ?? '14_hour_limit'];
  }
  if (!$open) Http::error('Ø¬Ù„Ø³Ù‡Ù” ÙˆØ±ÙˆØ¯Ù Ø¨Ø§Ø² Ø¨Ø±Ø§ÛŒ Ø´Ù…Ø§ ÙˆØ¬ÙˆØ¯ Ù†Ø¯Ø§Ø±Ø¯.', 400);

  // Ø®Ø±ÙˆØ¬ Ù†ÛŒØ² Ø¨Ø§ÛŒØ¯ Ø¨Ø§ GPS Ú©Ù†ØªØ±Ù„ Ø´ÙˆØ¯ØŒ Ø§Ù…Ø§ Ø¨Ø±Ø®Ù„Ø§Ù ÙˆØ±ÙˆØ¯ØŒ Ø®Ø· Ø®Ø±ÙˆØ¬ Ø§Ù„Ø²Ø§Ù…Ø§Ù‹ Ù‡Ù…Ø§Ù† Ø®Ø· ÙˆØ±ÙˆØ¯ Ù†ÛŒØ³Øª.
  // Ú©Ø§Ø±Ø¨Ø± Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ø¯ Ø¯Ø± Ù‡Ø±Ú©Ø¯Ø§Ù… Ø§Ø² Ø®Ø·ÙˆØ· Ù…Ø¬Ø§Ø² Ø®ÙˆØ¯Ø´ Ú©Ù‡ Ø§Ú©Ù†ÙˆÙ† Ø¯Ø§Ø®Ù„ Ù…Ø­Ø¯ÙˆØ¯Ù‡ Ø¢Ù† Ù‚Ø±Ø§Ø± Ø¯Ø§Ø±Ø¯ Ø®Ø±ÙˆØ¬ Ø¨Ø²Ù†Ø¯.
  [$lat, $lng] = validGeo($b['lat'] ?? null, $b['lng'] ?? null);
  if ($lat === null || $lng === null) {
    _attendance_reject_log((int)$u['id'], null, 'gps_checkout', $lat, $lng, $b['accuracy'] ?? null, 'Ù…ÙˆÙ‚Ø¹ÛŒØª GPS Ø¨Ø±Ø§ÛŒ Ø«Ø¨Øª Ø®Ø±ÙˆØ¬ Ø¯Ø± Ø¯Ø³ØªØ±Ø³ Ù†ÛŒØ³Øª.', ['open_line_id'=>(int)($open['line_id']??0)]);
    Http::error('Ø¨Ø±Ø§ÛŒ Ø«Ø¨Øª Ø®Ø±ÙˆØ¬ØŒ GPS Ùˆ Ù…ÙˆÙ‚Ø¹ÛŒØª Ù…Ú©Ø§Ù†ÛŒ Ø¨Ø§ÛŒØ¯ Ø±ÙˆØ´Ù† Ùˆ Ø¯Ø± Ø¯Ø³ØªØ±Ø³ Ø¨Ø§Ø´Ø¯.', 422);
  }

  $lineIds = user_line_ids($u);
  $acc = isset($b['accuracy']) ? max(0, min(100, (float)$b['accuracy'])) : 0;
  $extraR = max(20, (int)_req_setting('checkin_error_radius_m', 0)) + (int)ceil(min(80, $acc * 0.75));
  $outFence = station_at_point($lat, $lng, $lineIds, $extraR);
  if (!$outFence) {
    $near = _nearest_station($lat, $lng, $lineIds);
    $msg = $near
      ? 'Ø´Ù…Ø§ Ø¯Ø± Ù…Ø­Ø¯ÙˆØ¯Ù‡Ù” Ù‡ÛŒÚ†â€ŒÛŒÚ© Ø§Ø² Ø®Ø·ÙˆØ· Ù…Ø¬Ø§Ø² Ø®ÙˆØ¯ Ø¨Ø±Ø§ÛŒ Ø«Ø¨Øª Ø®Ø±ÙˆØ¬ Ù†ÛŒØ³ØªÛŒØ¯. Ù†Ø²Ø¯ÛŒÚ©â€ŒØªØ±ÛŒÙ† Ø§ÛŒØ³ØªÚ¯Ø§Ù‡ Â«'.$near['name'].'Â» Ø¯Ø± '.number_format($near['distance_m']).' Ù…ØªØ±ÛŒ Ø´Ù…Ø§Ø³Øª.'
      : 'Ø´Ù…Ø§ Ø¯Ø± Ù…Ø­Ø¯ÙˆØ¯Ù‡Ù” Ù‡ÛŒÚ†â€ŒÛŒÚ© Ø§Ø² Ø®Ø·ÙˆØ· Ù…Ø¬Ø§Ø² Ø®ÙˆØ¯ Ø¨Ø±Ø§ÛŒ Ø«Ø¨Øª Ø®Ø±ÙˆØ¬ Ù†ÛŒØ³ØªÛŒØ¯.';
    _attendance_reject_log((int)$u['id'], null, 'gps_checkout', $lat, $lng, $b['accuracy'] ?? null, $msg, ['line_ids'=>$lineIds,'open_line_id'=>(int)($open['line_id']??0)]);
    Http::error($msg, 403);
  }

  $outLineId = (int)($outFence['line_id'] ?? 0);
  $outStation = $outFence['name'] ?? _station_name_at($lat, $lng, $lineIds);
  $now = $eventAt;
  if (strtotime($now) <= strtotime($open['check_in'])) $now = date('Y-m-d H:i:s', strtotime($open['check_in']) + 60);
  if (_gps_work_required()) {
    try { _gps_work_record_event((int)$u['id'], 'gps_on', $now, ['source'=>'attendance_checkout','attendance_id'=>(int)$open['id'],'interval_minutes'=>30]); }
    catch (Throwable $e) { error_log('GPS checkout verification event failed: '.$e->getMessage()); }
  }

  Db::run("UPDATE staff_attendance SET check_out=?, out_lat=?, out_lng=?, out_station=?, out_line_id=?, client_check_out=? WHERE id=?", [$now, $lat, $lng, $outStation, $outLineId ?: null, $now, $open['id']]);
  try {
    [$jy,$jm,$jd] = gregorian_to_jalali((int)date('Y',strtotime($open['check_in'])),(int)date('n',strtotime($open['check_in'])),(int)date('j',strtotime($open['check_in'])));
    $jdate = sprintf('%04d-%02d-%02d',$jy,$jm,$jd);
    $shift = _active_user_shift_assignment($u['id'], $jdate);
    $sessions = [['in'=>strtotime($open['check_in']),'out'=>strtotime($now),'gps_invalid'=>_gps_work_invalid_intervals((int)$u['id'],strtotime($open['check_in']),strtotime($now))]];
    $hol = ShiftCalc::effectiveHoliday($jdate);
    $w = $shift ? ShiftCalc::dayWork($shift,$jdate,null,$sessions,$hol) : ['worked'=>0,'expected'=>0,'overtime'=>0,'shortage'=>0,'surplus'=>0];
    Db::run("UPDATE staff_attendance SET calc_json=? WHERE id=?", [json_encode($w,JSON_UNESCAPED_UNICODE), $open['id']]);
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  try { _notify_attendance_action('checkout',(int)$u['id'],$open['line_id']??null,$open['method']??'gps',$outStation,$now); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  $outLineCode = $outLineId ? (Db::one("SELECT code FROM `lines` WHERE id=?",[$outLineId])['code'] ?? null) : null;
  return ['ok'=>true, 'check_out'=>$now, 'checkout_line_id'=>$outLineId ?: null, 'checkout_line_code'=>$outLineCode, 'checkout_station'=>$outStation];
});

// ØªØ­ÙˆÛŒÙ„ Ø´ÛŒÙØª Ø¨Ø§ QR Code: ØªØ­ÙˆÛŒÙ„â€ŒØ¯Ù‡Ù†Ø¯Ù‡ ØªÙˆÚ©Ù† Ù…ÛŒâ€ŒØ³Ø§Ø²Ø¯ØŒ ØªØ­ÙˆÛŒÙ„â€ŒÚ¯ÛŒØ±Ù†Ø¯Ù‡ Ø§Ø³Ú©Ù† Ù…ÛŒâ€ŒÚ©Ù†Ø¯Ø› Ø®Ø±ÙˆØ¬ Ø§ÙˆÙ„ÛŒ Ùˆ ÙˆØ±ÙˆØ¯ Ø¯ÙˆÙ…ÛŒ Ø«Ø¨Øª Ù…ÛŒâ€ŒØ´ÙˆØ¯.
route('POST', '/api/my/shift-handover/start', function($p,$b,$u){
  _ensure_attendance_phase1_schema();
  _attendance_auto_close_stale((int)$u['id']);
  $open = Db::one("SELECT id,line_id,check_in FROM staff_attendance WHERE user_id=? AND check_out IS NULL ORDER BY id DESC LIMIT 1", [$u['id']]);
  if (!$open) Http::error('Ø¨Ø±Ø§ÛŒ ØªØ­ÙˆÛŒÙ„ Ø´ÛŒÙØª Ø§Ø¨ØªØ¯Ø§ Ø¨Ø§ÛŒØ¯ Ø­Ø¶ÙˆØ± Ø¨Ø§Ø² Ø¯Ø§Ø´ØªÙ‡ Ø¨Ø§Ø´ÛŒØ¯.', 400);
  $token = bin2hex(random_bytes(24));
  $ttl = max(1, min(15, (int)($b['ttl_min'] ?? 5)));
  Db::run("DELETE FROM shift_handovers WHERE from_user_id=? AND status='pending'", [$u['id']]);
  $id = Db::insert("INSERT INTO shift_handovers(token,from_user_id,line_id,attendance_id,expires_at) VALUES(?,?,?,?,DATE_ADD(NOW(), INTERVAL $ttl MINUTE))", [$token,$u['id'],$open['line_id'],$open['id']]);
  return ['ok'=>true,'id'=>$id,'token'=>$token,'qr'=>'SHIFT_HANDOVER:'.$token,'expires_min'=>$ttl,'line_id'=>$open['line_id']];
});
route('POST', '/api/my/shift-handover/accept', function($p,$b,$u){
  _ensure_attendance_phase1_schema();
  _attendance_auto_close_stale((int)$u['id']);
  $token = trim((string)($b['token'] ?? ''));
  $token = preg_replace('/^SHIFT_HANDOVER:/','',$token);
  if ($token==='') Http::error('Ú©Ø¯ ØªØ­ÙˆÛŒÙ„ Ø´ÛŒÙØª Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª.', 422);
  $h = Db::one("SELECT * FROM shift_handovers WHERE token=? AND status='pending' AND expires_at>=NOW()", [$token]);
  if (!$h) Http::error('Ú©Ø¯ ØªØ­ÙˆÛŒÙ„ Ø´ÛŒÙØª Ù…Ù†Ù‚Ø¶ÛŒ ÛŒØ§ Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª.', 404);
  if ((int)$h['from_user_id'] === (int)$u['id']) Http::error('ØªØ­ÙˆÛŒÙ„â€ŒÚ¯ÛŒØ±Ù†Ø¯Ù‡ Ù†Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ø¯ Ù‡Ù…Ø§Ù† ØªØ­ÙˆÛŒÙ„â€ŒØ¯Ù‡Ù†Ø¯Ù‡ Ø¨Ø§Ø´Ø¯.', 422);
  $handoverLineId=(int)($h['line_id']??0);
  if($handoverLineId<=0) Http::error('Ø®Ø· Ø­Ø¶ÙˆØ± ØªØ­ÙˆÛŒÙ„â€ŒØ´Ø¯Ù‡ Ù…Ø´Ø®Øµ Ù†ÛŒØ³ØªØ› Ø«Ø¨Øª Ø­Ø¶ÙˆØ± Ø¹Ø§Ø¯ÛŒ Ø±Ø§ Ø§Ù†Ø¬Ø§Ù… Ø¯Ù‡ÛŒØ¯.',422);
  $checkinLineIds=user_checkin_line_ids($u);
  if(is_array($checkinLineIds) && !in_array($handoverLineId,array_map('intval',$checkinLineIds),true))
    Http::error('Ø¨Ø±Ø§ÛŒ Ø«Ø¨Øª Ø­Ø¶ÙˆØ± Ø±ÙˆÛŒ Ø®Ø· ØªØ­ÙˆÛŒÙ„â€ŒØ´Ø¯Ù‡ Ù…Ø¬ÙˆØ² Ø«Ø¨Øª Ø­Ø¶ÙˆØ± Ù†Ø¯Ø§Ø±ÛŒØ¯.',403);
  $myOpen = Db::one("SELECT id FROM staff_attendance WHERE user_id=? AND check_out IS NULL ORDER BY id DESC LIMIT 1", [$u['id']]);
  if ($myOpen) Http::error('Ø´Ù…Ø§ ÛŒÚ© Ø­Ø¶ÙˆØ± Ø¨Ø§Ø² Ø¯Ø§Ø±ÛŒØ¯. Ø§Ø¨ØªØ¯Ø§ Ø®Ø±ÙˆØ¬ Ø®ÙˆØ¯ Ø±Ø§ Ø«Ø¨Øª Ú©Ù†ÛŒØ¯.', 400);
  [$lat,$lng] = validGeo($b['lat'] ?? null, $b['lng'] ?? null);
  $station = _station_name_at($lat,$lng,$checkinLineIds);
  Db::run("UPDATE staff_attendance SET check_out=NOW(), out_lat=?, out_lng=?, out_station=?, handover_id=? WHERE id=? AND check_out IS NULL", [$lat,$lng,$station,$h['id'],$h['attendance_id']]);
  $newId = Db::insert("INSERT INTO staff_attendance(user_id,line_id,method,in_lat,in_lng,in_station,handover_id) VALUES(?,?,?,?,?,'ØªØ­ÙˆÛŒÙ„ Ø´ÛŒÙØª',?)", [$u['id'],$handoverLineId,'handover_qr',$lat,$lng,$h['id']]);
  Db::run("UPDATE shift_handovers SET status='accepted', to_user_id=?, accepted_at=NOW() WHERE id=?", [$u['id'],$h['id']]);
  return ['ok'=>true,'checkin_id'=>$newId,'line_id'=>(int)$h['line_id']];
});

route('GET', '/api/my/work-timer', function($p,$b,$u){
  _ensure_attendance_phase1_schema();
  $autoClosed = _attendance_auto_close_stale((int)$u['id']);

  // ØªØ§ÛŒÙ…Ø± Ø±ÙˆØ²Ø§Ù†Ù‡ Ø¨Ø± Ø§Ø³Ø§Ø³ Ù…Ø¬Ù…ÙˆØ¹ Ù‡Ù…Ù‡Ù” Ø¨Ø§Ø²Ù‡â€ŒÙ‡Ø§ÛŒ Ø­Ø¶ÙˆØ± Ù‡Ù…Ø§Ù† Ø±ÙˆØ² Ø§Ø³ØªØ›
  // Ø¨Ù†Ø§Ø¨Ø±Ø§ÛŒÙ† Ø®Ø±ÙˆØ¬ Ùˆ ÙˆØ±ÙˆØ¯ Ù…Ø¬Ø¯Ø¯ Ø¯Ø± Ù…ÛŒØ§Ù†Ù‡Ù” Ø±ÙˆØ²ØŒ Ø²Ù…Ø§Ù† Ù‚Ø¨Ù„ÛŒ Ø±Ø§ Ø§Ø² Ø¨ÛŒÙ† Ù†Ù…ÛŒâ€ŒØ¨Ø±Ø¯.
  [$gy,$gm,$gd] = [(int)date('Y'), (int)date('n'), (int)date('j')];
  [$jy,$jm,$jd] = gregorian_to_jalali($gy,$gm,$gd);
  $jdate = sprintf('%04d-%02d-%02d',$jy,$jm,$jd);

  // Ø§Ø¨ØªØ¯Ø§ Ø¬Ù„Ø³Ù‡Ù” Ø¨Ø§Ø² ÙØ¹Ù„ÛŒ Ø±Ø§ Ø¨Ø¹Ø¯ Ø§Ø² Ú©Ù†ØªØ±Ù„ Ø³Ù‚Ù Û±Û´ Ø³Ø§Ø¹Øª Ø¯ÙˆØ¨Ø§Ø±Ù‡ Ø¨Ø®ÙˆØ§Ù†.
  $open = Db::one("SELECT id,line_id,check_in,check_out FROM staff_attendance WHERE user_id=? AND check_out IS NULL ORDER BY id DESC LIMIT 1", [$u['id']]);
  $rows = _attendance_rows_for_jdate((int)$u['id'], $jdate);

  $workedSec = 0;
  $completedSec = 0;
  $openElapsedSec = 0;
  foreach ($rows as $row) {
    $inTs = strtotime($row['check_in'] ?? '');
    if ($inTs === false) continue;
    $outTs = !empty($row['check_out']) ? strtotime($row['check_out']) : time();
    if ($outTs === false || $outTs <= $inTs) continue;
    $startTs = strtotime($row['_clip_start'] ?? '1970-01-01 00:00:00');
    $endTs = strtotime($row['_clip_end'] ?? '2999-01-01 00:00:00');
    $segIn = max($inTs, $startTs ?: $inTs);
    $segOut = min($outTs, $endTs ?: $outTs);
    $sec = max(0, $segOut - $segIn);
    foreach (($row['_gps_invalid'] ?? []) as $bad) {
      $badFrom=(int)($bad[0]??0); $badTo=(int)($bad[1]??0);
      if ($badTo>$badFrom) $sec -= max(0,min($segOut,$badTo)-max($segIn,$badFrom));
    }
    $sec=max(0,$sec);
    $workedSec += $sec;
    if (empty($row['check_out'])) $openElapsedSec += $sec;
    else $completedSec += $sec;
  }

  $role=_user_role_title($u['id']);
  $shift = _active_user_shift_assignment($u['id'], $jdate);
  $dayRow=($shift&&($shift['type']??'')==='advanced')?_shift_day_row($shift['shift_id']??$shift['id'],$jdate):null;
  $dayConfig=ShiftCalc::parseJson($dayRow['day_config']??null);
  $cap = !$shift?0:(($shift['type']??'')==='auto'?ShiftCalc::roleOtCap($shift):max(0,(int)($dayConfig['daily_ot']??$shift['daily_ot_cap']??27)));
  $expected = !$shift?0:((($shift['type']??'')==='auto')?(ShiftCalc::isFriday($jdate)||ShiftCalc::effectiveHoliday($jdate)?0:(int)($shift['auto_expected_min']??453)):max(0,(int)ShiftCalc::expectedMinutes($shift,$jdate,$dayRow)));

  $elapsedSec = (int)$workedSec;
  $elapsed = (int)floor($elapsedSec/60);
  $remain=max(0,$expected-$elapsed);
  $ot=$shift?max(0,min(max(0,$elapsed-$expected),$cap)):0;
  $surplus=$shift?max(0,$elapsed-$expected-$cap):0;
  $phase = !$shift?'unassigned':($remain>0 ? 'duty' : ($ot<$cap ? 'overtime' : 'surplus'));
  $checkInTs = $open ? strtotime($open['check_in']) : null;

  return [
    'open'=>$open,'auto_closed'=>$autoClosed ? true : false,'auto_closed_at'=>$autoClosed['check_out'] ?? null,'auto_close_reason'=>$autoClosed['reason'] ?? null,
    'gps_work_required'=>_gps_work_required(),
    'role_title'=>$role['title']??'','shift_title'=>$shift['title']??'',
    'expected_min'=>$expected,'ot_cap_min'=>$cap,'elapsed_min'=>$elapsed,'elapsed_sec'=>$elapsedSec,
    'worked_min'=>$elapsed,'worked_sec'=>$elapsedSec,'completed_min'=>(int)floor($completedSec/60),'completed_sec'=>(int)$completedSec,
    'open_elapsed_sec'=>(int)$openElapsedSec,'session_count'=>count($rows),
    'remaining_min'=>$remain,'overtime_min'=>$ot,'surplus_min'=>$surplus,'phase'=>$phase,
    'jdate'=>$jdate,'server_now'=>date('c'),'server_now_ts'=>time(),'check_in_ts'=>$checkInTs,'check_in_at'=>$open['check_in']??null,
    'night_start'=>$shift['night_start']??'22:00','night_end'=>$shift['night_end']??'06:00','next_sync_sec'=>60
  ];
});

// ØªØ§Ø±ÛŒØ®Ú†Ù‡Ù” Ø«Ø¨Øª Ø­Ø¶ÙˆØ± Ø´Ø®ØµÛŒ
route('GET', '/api/my/attendance-history', fn($p,$b,$u) => Db::all(
  "SELECT sa.id, sa.check_in, sa.check_out, sa.method,
          l.code line,
          l.code in_line,
          lo.code out_line
   FROM staff_attendance sa
   LEFT JOIN `lines` l ON l.id=sa.line_id
   LEFT JOIN `lines` lo ON lo.id=sa.out_line_id
   WHERE sa.user_id=? ORDER BY sa.id DESC LIMIT 60", [$u['id']]));

// ==================== Ø³ÛŒØ§Ø³Øª Ú©Ø§Ø±ÛŒ (Ù…Ø¯Ù„ ÙÛŒÙ†ØªÙˆ) ====================
function _ensure_work_policies(){
  try {
    Db::run("CREATE TABLE IF NOT EXISTS work_policies (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(200) NOT NULL, description TEXT NULL, apply_time_limit_on_approve TINYINT(1) NOT NULL DEFAULT 0, config JSON NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    if (!Db::one("SHOW COLUMNS FROM users WHERE Field='work_policy_id'")) Db::run("ALTER TABLE users ADD COLUMN work_policy_id INT NULL");
    if (!Db::one("SHOW COLUMNS FROM users WHERE Field='leave_balance_start_min'")) Db::run("ALTER TABLE users ADD COLUMN leave_balance_start_min INT NOT NULL DEFAULT 0");
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
}

// ÙÙ‡Ø±Ø³Øª Ø³ÛŒØ§Ø³Øªâ€ŒÙ‡Ø§ÛŒ Ú©Ø§Ø±ÛŒ
route('GET', '/api/admin/work-policies', function($p,$b,$u){
  _ensure_work_policies();
  return Db::all("SELECT wp.*, (SELECT COUNT(*) FROM users WHERE work_policy_id=wp.id) user_count FROM work_policies wp ORDER BY wp.is_active DESC, wp.id DESC");
}, false, ADMIN);

// ÛŒÚ© Ø³ÛŒØ§Ø³Øª Ú©Ø§Ø±ÛŒ
route('GET', '/api/admin/work-policies/{id}', function($p,$b,$u){
  _ensure_work_policies();
  $wp = Db::one("SELECT * FROM work_policies WHERE id=?", [(int)$p['id']]);
  if (!$wp) Http::error('ÛŒØ§ÙØª Ù†Ø´Ø¯', 404);
  $wp['config'] = $wp['config'] ? json_decode($wp['config'], true) : null;
  return $wp;
}, false, ADMIN);

// Ø³Ø§Ø®Øª/ÙˆÛŒØ±Ø§ÛŒØ´ Ø³ÛŒØ§Ø³Øª Ú©Ø§Ø±ÛŒ
route('POST', '/api/admin/work-policies', function($p,$b,$u){
  _ensure_work_policies();
  $title = trim($b['title'] ?? '');
  if ($title === '') Http::error('Ù†Ø§Ù… Ø³ÛŒØ§Ø³Øª Ú©Ø§Ø±ÛŒ Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª', 422);
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

// Ø­Ø°Ù Ø³ÛŒØ§Ø³Øª Ú©Ø§Ø±ÛŒ
route('DELETE', '/api/admin/work-policies/{id}', function($p,$b,$u){
  _ensure_work_policies();
  Db::run("UPDATE users SET work_policy_id=NULL WHERE work_policy_id=?", [(int)$p['id']]);
  Db::run("DELETE FROM work_policies WHERE id=?", [(int)$p['id']]);
  return ['ok'=>true];
}, false, ADMIN);

// ØªØ®ØµÛŒØµ Ø³ÛŒØ§Ø³Øª Ú©Ø§Ø±ÛŒ Ø¨Ù‡ Ú©Ø§Ø±Ø¨Ø±Ø§Ù† (Ø¢Ø±Ø§ÛŒÙ‡â€ŒØ§ÛŒ Ø§Ø² user_id)
route('POST', '/api/admin/work-policies/{id}/assign', function($p,$b,$u){
  _ensure_work_policies();
  $ids = $b['user_ids'] ?? [];
  if (!is_array($ids) || !count($ids)) Http::error('Ú©Ø§Ø±Ø¨Ø±ÛŒ Ø§Ù†ØªØ®Ø§Ø¨ Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª', 422);
  $pid = (int)$p['id'];
  foreach ($ids as $uid) Db::run("UPDATE users SET work_policy_id=? WHERE id=?", [$pid, (int)$uid]);
  return ['ok'=>true, 'count'=>count($ids)];
}, false, ADMIN);

// Ù…Ø§Ù†Ø¯Ù‡ Ù…Ø±Ø®ØµÛŒ Ø§Ø¨ØªØ¯Ø§ÛŒ Ø¯ÙˆØ±Ù‡ (Ø¢Ø±Ø§ÛŒÙ‡â€ŒØ§ÛŒ Ø§Ø² {user_id, minutes})
// ÙÙ‡Ø±Ø³Øª Ù¾Ø±Ø³Ù†Ù„ Ø¨Ø§ Ù…Ø§Ù†Ø¯Ù‡Ù” Ù…Ø±Ø®ØµÛŒ Ø§Ø³ØªØ­Ù‚Ø§Ù‚ÛŒ Ø§Ø¨ØªØ¯Ø§ÛŒ Ø¯ÙˆØ±Ù‡ (Ø¨Ø±Ø§ÛŒ Ú¯Ø±ÛŒØ¯)
route('GET', '/api/admin/leave-balance-init', function($p,$b,$u){
  try { if (!Db::one("SHOW COLUMNS FROM users WHERE Field='leave_balance_start_min'")) Db::run("ALTER TABLE users ADD COLUMN leave_balance_start_min INT NOT NULL DEFAULT 0"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  return Db::all("SELECT u.id, CONCAT(u.first_name,' ',u.last_name) name, r.title role_title, COALESCE(u.leave_balance_start_min,0) minutes
    FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.is_active=1 ORDER BY r.level DESC, u.last_name");
}, false, ADMIN);

route('POST', '/api/admin/leave-balance-init', function($p,$b,$u){
  _ensure_work_policies();
  $items = $b['items'] ?? [];
  if (!is_array($items)) Http::error('Ø¯Ø§Ø¯Ù‡ Ù†Ø§Ù…Ø¹ØªØ¨Ø±', 422);
  foreach ($items as $it) {
    if (!isset($it['user_id'])) continue;
    Db::run("UPDATE users SET leave_balance_start_min=? WHERE id=?", [(int)($it['minutes'] ?? 0), (int)$it['user_id']]);
  }
  return ['ok'=>true, 'count'=>count($items)];
}, false, ADMIN);

// ==================== Ø³ÛŒØ³ØªÙ… Ø´ÛŒÙØª Ú©Ø§Ø±ÛŒ ====================
// ÙÙ‡Ø±Ø³Øª Ø´ÛŒÙØªâ€ŒÙ‡Ø§
function _ensure_user_shifts_schema(){
  Db::run("CREATE TABLE IF NOT EXISTS user_shifts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    shift_id INT NOT NULL,
    from_jdate VARCHAR(10) NULL,
    to_jdate VARCHAR(10) NULL,
    UNIQUE KEY uq_us (user_id),
    INDEX idx_us_shift (shift_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  foreach(['from_jdate','to_jdate'] as $column){
    if(!Db::one("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='user_shifts' AND COLUMN_NAME=?",[$column]))
      Db::run("ALTER TABLE user_shifts ADD COLUMN `$column` VARCHAR(10) NULL");
  }
}
route('GET', '/api/admin/shifts', fn($p,$b,$u) => Db::all(
  "SELECT id,title,type,weekly,float_minutes,allow_offday,daily_ot_cap,monthly_ot_cap,night_calc,friday_calc,holiday_calc,advanced,is_active
   FROM shifts WHERE is_active=1 ORDER BY id DESC"), false, ADMIN);

// ÛŒÚ© Ø´ÛŒÙØª + Ø±ÙˆØ²Ù‡Ø§ÛŒ Ù¾ÛŒØ´Ø±ÙØªÙ‡â€ŒØ§Ø´
route('GET', '/api/admin/shifts/{id}', function($p,$b,$u){
  $s = Db::one("SELECT * FROM shifts WHERE id=?", [$p['id']]);
  if (!$s) Http::error('ÛŒØ§ÙØª Ù†Ø´Ø¯', 404);
  if (isset($s['advanced']) && $s['advanced']) $s['advanced'] = json_decode($s['advanced'], true);
  $s['days'] = Db::all("SELECT jdate, segments, is_off, day_config FROM shift_days WHERE shift_id=? ORDER BY jdate", [$p['id']]);
  foreach ($s['days'] as &$d) { if (!empty($d['day_config'])) $d['day_config'] = json_decode($d['day_config'], true); }
  return $s;
}, false, ADMIN);

// Ø³Ø§Ø®Øª/ÙˆÛŒØ±Ø§ÛŒØ´ Ø´ÛŒÙØª
route('POST', '/api/admin/shifts', function($p,$b,$u){
  try { if (!Db::one("SHOW COLUMNS FROM shifts WHERE Field='advanced'")) Db::run("ALTER TABLE shifts ADD COLUMN advanced JSON NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  $weekly = isset($b['weekly']) ? json_encode($b['weekly'], JSON_UNESCAPED_UNICODE) : null;
  $advanced = isset($b['advanced']) ? json_encode($b['advanced'], JSON_UNESCAPED_UNICODE) : null;
  $id = Db::insert("INSERT INTO shifts(title,type,weekly,float_minutes,allow_offday,daily_ot_cap,monthly_ot_cap,night_calc,friday_calc,holiday_calc,advanced)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)",
    [$b['title'] ?? 'Ø´ÛŒÙØª', $b['type'] ?? 'simple', $weekly, $b['float_minutes'] ?? null,
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

// Ø°Ø®ÛŒØ±Ù‡Ù” Ø±ÙˆØ²Ù‡Ø§ÛŒ Ø´ÛŒÙØª Ù¾ÛŒØ´Ø±ÙØªÙ‡ (Ø¢Ø±Ø§ÛŒÙ‡â€ŒØ§ÛŒ Ø§Ø² {jdate,segments,is_off,day_config})
route('POST', '/api/admin/shifts/{id}/days', function($p,$b,$u){
  try { if (!Db::one("SHOW COLUMNS FROM shift_days WHERE Field='day_config'")) Db::run("ALTER TABLE shift_days ADD COLUMN day_config JSON NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  $days = $b['days'] ?? [];
  if (!is_array($days)) Http::error('Ø¯Ø§Ø¯Ù‡ Ù†Ø§Ù…Ø¹ØªØ¨Ø±', 400);
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

// Ø­Ø°Ù ÛŒÚ© Ø±ÙˆØ² Ø´ÛŒÙØª
route('DELETE', '/api/admin/shifts/{id}/days/{jdate}', function($p,$b,$u){
  Db::run("DELETE FROM shift_days WHERE shift_id=? AND jdate=?", [$p['id'], $p['jdate']]);
  return ['ok'=>true];
}, false, ADMIN);

// ØªØ®ØµÛŒØµ Ø´ÛŒÙØª Ø¨Ù‡ Ú©Ø§Ø±Ø¨Ø±
route('GET', '/api/admin/user-shifts', function($p,$b,$u){
  _ensure_user_shifts_schema();
  return Db::all("SELECT us.user_id, us.shift_id, s.title, s.type, us.from_jdate, us.to_jdate
    FROM user_shifts us LEFT JOIN shifts s ON s.id=us.shift_id");
}, false, ADMIN);
route('POST', '/api/admin/user-shifts', function($p,$b,$u){
  _ensure_user_shifts_schema();
  _ensure_role_work_rules();
  $uid=(int)($b['user_id']??0); $sid=(int)($b['shift_id']??0);
  if (!$uid||$sid<0) Http::error('Ú©Ø§Ø±Ø¨Ø± Ùˆ Ø´ÛŒÙØª Ø±Ø§ Ù…Ø´Ø®Øµ Ú©Ù†ÛŒØ¯',400);
  if($sid>0&&!Db::one('SELECT id FROM shifts WHERE id=? AND is_active=1',[$sid]))Http::error('Ø´ÛŒÙØª Ø§Ù†ØªØ®Ø§Ø¨â€ŒØ´Ø¯Ù‡ Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª',422);
  $from = trim((string)($b['from_jdate']??'')); $to = trim((string)($b['to_jdate']??''));
  $from = $from!=='' ? str_replace('/','-',$from) : null;
  $to = $to!=='' ? str_replace('/','-',$to) : null;
  if ($from && !preg_match('/^\d{4}-\d{2}-\d{2}$/',$from)) Http::error('ØªØ§Ø±ÛŒØ® Ø´Ø±ÙˆØ¹ ØªØ®ØµÛŒØµ Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª',422);
  if ($to && !preg_match('/^\d{4}-\d{2}-\d{2}$/',$to)) Http::error('ØªØ§Ø±ÛŒØ® Ù¾Ø§ÛŒØ§Ù† ØªØ®ØµÛŒØµ Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª',422);
  if ($from && $to && strcmp($to,$from)<0) Http::error('ØªØ§Ø±ÛŒØ® Ù¾Ø§ÛŒØ§Ù† Ù†Ø¨Ø§ÛŒØ¯ Ù‚Ø¨Ù„ Ø§Ø² ØªØ§Ø±ÛŒØ® Ø´Ø±ÙˆØ¹ Ø¨Ø§Ø´Ø¯',422);
  // user_shifts has UNIQUE(user_id): assigning a different shift replaces the existing
  // assignment atomically. The former overlap check incorrectly rejected every edit.
  $previous = Db::one("SELECT shift_id,from_jdate,to_jdate FROM user_shifts WHERE user_id=?", [$uid]);
  Db::run("INSERT INTO user_shifts(user_id,shift_id,from_jdate,to_jdate) VALUES(?,?,?,?)
           ON DUPLICATE KEY UPDATE shift_id=VALUES(shift_id), from_jdate=VALUES(from_jdate), to_jdate=VALUES(to_jdate)",
    [$uid,$sid,$from,$to]);
  try { Db::run("INSERT INTO shift_assignment_audit(user_id,shift_id,from_jdate,to_jdate,action,actor_id,note) VALUES(?,?,?,?,?,?,?)", [$uid,$sid,$from,$to,'assign',$u['id']??null,$b['note']??null]); } catch (Throwable $e) {}
  return ['ok'=>true];
}, false, ADMIN);
route('DELETE', '/api/admin/user-shifts/{id}', function($p,$b,$u){
  _ensure_user_shifts_schema();
  _ensure_role_work_rules();
  $old = Db::one("SELECT * FROM user_shifts WHERE user_id=?", [$p['id']]);
  Db::run("DELETE FROM user_shifts WHERE user_id=?", [$p['id']]);
  if ($old) { try { Db::run("INSERT INTO shift_assignment_audit(user_id,shift_id,from_jdate,to_jdate,action,actor_id,note) VALUES(?,?,?,?,?,?,?)", [$p['id'],$old['shift_id']??null,$old['from_jdate']??null,$old['to_jdate']??null,'delete',$u['id']??null,$b['note']??null]); } catch (Throwable $e) {} }
  return ['ok'=>true];
}, false, ADMIN);

// ØªØ¹Ø·ÛŒÙ„Ø§Øª Ø±Ø³Ù…ÛŒ
route('GET', '/api/admin/holidays', fn($p,$b,$u) => Db::all("SELECT jdate,title FROM holidays ORDER BY jdate"), false, ADMIN);
route('POST', '/api/admin/holidays', function($p,$b,$u){
  // Ù¾Ø°ÛŒØ±Ø´ ÛŒÚ© ÛŒØ§ Ú†Ù†Ø¯ ØªØ¹Ø·ÛŒÙ„ÛŒ
  $items = isset($b['items']) && is_array($b['items']) ? $b['items'] : [['jdate'=>$b['jdate']??null,'title'=>$b['title']??null]];
  $n=0;
  foreach ($items as $it) { if (empty($it['jdate'])) continue;
    Db::run("INSERT INTO holidays(jdate,title) VALUES(?,?) ON DUPLICATE KEY UPDATE title=VALUES(title)", [$it['jdate'],$it['title']??null]); $n++; }
  return ['ok'=>true,'count'=>$n];
}, false, ADMIN);
route('DELETE', '/api/admin/holidays/{jdate}', function($p,$b,$u){
  Db::run("DELETE FROM holidays WHERE jdate=?", [$p['jdate']]); return ['ok'=>true];
}, false, ADMIN);



// Schema DDL belongs to the deployment migration, never routine requests.
function _ensure_attendance_phase1_schema(){ return; }

function _attendance_auto_close_stale($userId, $now=null){
  _ensure_attendance_phase1_schema();
  $now = $now ?: date('Y-m-d H:i:s');
  $open = Db::one("SELECT id, check_in, line_id, method FROM staff_attendance WHERE user_id=? AND check_out IS NULL ORDER BY id DESC LIMIT 1", [(int)$userId]);
  if (!$open || empty($open['check_in'])) return null;
  $inTs = strtotime($open['check_in']);
  $nowTs = strtotime($now);
  if ($inTs === false || $nowTs === false || ($nowTs - $inTs) < 14*3600) return null;

  $autoOutTs = $inTs + 14*3600;
  $autoOut = date('Y-m-d H:i:s', $autoOutTs);
  try {
    $gy=(int)date('Y', $inTs); $gm=(int)date('n', $inTs); $gd=(int)date('j', $inTs);
    [$jy,$jm,$jd] = gregorian_to_jalali($gy,$gm,$gd);
    $jdate=sprintf('%04d-%02d-%02d',$jy,$jm,$jd);
    $shift=function_exists('_active_user_shift_assignment') ? _active_user_shift_assignment((int)$userId,$jdate) : null;
    $sessions=[['in'=>$inTs,'out'=>$autoOutTs,'gps_invalid'=>_gps_work_invalid_intervals((int)$userId,$inTs,$autoOutTs)]];
    $hol=ShiftCalc::effectiveHoliday($jdate);
    $w=ShiftCalc::dayWork($shift,$jdate,null,$sessions,$hol);
    Db::run("UPDATE staff_attendance SET check_out=?, client_check_out=?, calc_json=? WHERE id=? AND check_out IS NULL",
      [$autoOut,$autoOut,json_encode($w,JSON_UNESCAPED_UNICODE),(int)$open['id']]);
  } catch (\Throwable $e) {
    Db::run("UPDATE staff_attendance SET check_out=?, client_check_out=? WHERE id=? AND check_out IS NULL",
      [$autoOut,$autoOut,(int)$open['id']]);
    error_log('attendance auto-close calculation failed: '.$e->getMessage());
  }
  return ['id'=>(int)$open['id'],'check_out'=>$autoOut,'check_in'=>$open['check_in'],'line_id'=>$open['line_id'],'method'=>$open['method'],'reason'=>'14_hour_limit'];
}

function _user_role_title($userId){
  try { $r=Db::one("SELECT r.title, r.`key` role_key FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.id=?",[(int)$userId]); return $r ?: ['title'=>'','role_key'=>'']; } catch (\Throwable $e) { return ['title'=>'','role_key'=>'']; }
}
function _ensure_role_work_rules(){
  static $done=false; if($done) return; $done=true;
  try {
    Db::run("CREATE TABLE IF NOT EXISTS role_work_rules (id INT AUTO_INCREMENT PRIMARY KEY, role_key VARCHAR(80) NOT NULL UNIQUE, title VARCHAR(120) NULL, duty_minutes INT NOT NULL DEFAULT 453, overtime_limit_minutes INT NOT NULL DEFAULT 27, surplus_after_minutes INT NOT NULL DEFAULT 480, night_start TIME NOT NULL DEFAULT '22:00:00', night_end TIME NOT NULL DEFAULT '06:00:00', is_active TINYINT(1) NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $rules = [
      ['operator','Ø§Ù¾Ø±Ø§ØªÙˆØ±',453,27,480], ['line_chief','Ø±Ø¦ÛŒØ³ Ø®Ø·',453,27,480],
      ['inspector','Ø¨Ø§Ø²Ø±Ø³',453,147,600], ['senior_inspector','Ø³Ø±Ø¨Ø§Ø²Ø±Ø³',453,147,600], ['chief_inspector','Ø³Ø±Ø¨Ø§Ø²Ø±Ø³ Ø§Ø±Ø´Ø¯',453,147,600],
      ['office','Ù†ÛŒØ±ÙˆÛŒ Ø§Ø¯Ø§Ø±ÛŒ',453,240,693], ['default','Ù¾ÛŒØ´â€ŒÙØ±Ø¶',453,27,480]
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
    if (preg_match('/Ø§Ø¯Ø§Ø±ÛŒ|niroo|office/i', $txt)) $guess = 'office';
    elseif (preg_match('/Ø³Ø±Ø¨Ø§Ø²Ø±Ø³ Ø§Ø±Ø´Ø¯|chief_inspector/i', $txt)) $guess = 'chief_inspector';
    elseif (preg_match('/Ø³Ø±Ø¨Ø§Ø²Ø±Ø³|senior_inspector/i', $txt)) $guess = 'senior_inspector';
    elseif (preg_match('/Ø¨Ø§Ø²Ø±Ø³|inspector/i', $txt)) $guess = 'inspector';
    elseif (preg_match('/Ø±Ø¦ÛŒØ³ Ø®Ø·|raees|line_chief/i', $txt)) $guess = 'line_chief';
    elseif (preg_match('/Ø§Ù¾Ø±Ø§ØªÙˆØ±|operator/i', $txt)) $guess = 'operator';
    $row = Db::one("SELECT * FROM role_work_rules WHERE is_active=1 AND role_key=?", [$guess]);
    if ($row) return [_merge_user_rule_override($row, $userId), $r];
  } catch (Throwable $e) {}
  return [_merge_user_rule_override([ 'role_key'=>'default','title'=>'Ù¾ÛŒØ´â€ŒÙØ±Ø¶','duty_minutes'=>453,'overtime_limit_minutes'=>27,'surplus_after_minutes'=>480,'night_start'=>'22:00:00','night_end'=>'06:00:00' ], $userId), $r];
}
function _auto_shift_for_user($userId){
  [$rule,$r] = _role_work_rule_for_user($userId);
  return [
    'id'=>0,'shift_id'=>0,'title'=>'Ø´ÛŒÙØª Ø®ÙˆØ¯Ú©Ø§Ø±','type'=>'auto',
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
  // Ø´ÛŒÙØª Ù…ÙˆÙ‚Øª Ù†ÛŒØ±ÙˆÛŒ Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ†: Ø¯Ø± Ø±ÙˆØ²Ù‡Ø§ÛŒ Ù…Ø±Ø®ØµÛŒØŒ Ø¯Ù‚ÛŒÙ‚Ø§Ù‹ Ø´ÛŒÙØª ÙØ±Ø¯ Ù…Ø±Ø®ØµÛŒâ€ŒÚ¯ÛŒØ±Ù†Ø¯Ù‡ Ø§Ø¹Ù…Ø§Ù„ Ù…ÛŒâ€ŒØ´ÙˆØ¯.
  if ($jdate) {
    try {
      $sa = Db::one("SELECT sa.absent_user_id,sa.request_id FROM substitute_assignments sa JOIN requests rq ON rq.id=sa.request_id AND rq.status='approved' AND rq.type='annual' AND COALESCE(rq.unit,'daily')='daily' WHERE sa.substitute_user_id=? AND sa.status='active' AND sa.from_date<=? AND sa.to_date>=? ORDER BY sa.id DESC LIMIT 1",[(int)$userId,$jdate,$jdate]);
      if ($sa) {
        $arows = Db::all("SELECT us.user_id, us.shift_id, us.from_jdate, us.to_jdate, s.* FROM user_shifts us JOIN shifts s ON s.id=us.shift_id WHERE us.user_id=? AND s.is_active=1",[(int)$sa['absent_user_id']]);
        foreach($arows as $r){
          $from=!empty($r['from_jdate'])?str_replace('/','-',$r['from_jdate']):null;
          $to=!empty($r['to_jdate'])?str_replace('/','-',$r['to_jdate']):null;
          if($from && strcmp($jdate,$from)<0) continue;
          if($to && strcmp($jdate,$to)>0) continue;
          $r['is_substitute_shift']=1; $r['absent_user_id']=(int)$sa['absent_user_id']; $r['request_id']=(int)$sa['request_id'];
          $r['title']='Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ†ÛŒ â€” '.($r['title']??'Ø´ÛŒÙØª');
          return $r;
        }
        // Substitute inherits an automatic shift only if the absent user explicitly selected it.
        $explicitAuto=Db::one('SELECT from_jdate,to_jdate FROM user_shifts WHERE user_id=? AND shift_id=0',[(int)$sa['absent_user_id']]);
        $autoFrom=ShiftCalc::normJdate($explicitAuto['from_jdate']??'');
        $autoTo=ShiftCalc::normJdate($explicitAuto['to_jdate']??'');
        if(!$explicitAuto||($autoFrom&&$jdate<$autoFrom)||($autoTo&&$jdate>$autoTo))return null;
        $auto=_auto_shift_for_user((int)$sa['absent_user_id']);
        $auto['is_substitute_shift']=1; $auto['absent_user_id']=(int)$sa['absent_user_id']; $auto['request_id']=(int)$sa['request_id'];
        $auto['title']='Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ†ÛŒ â€” '.($auto['title']??'Ø´ÛŒÙØª Ø®ÙˆØ¯Ú©Ø§Ø±');
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
  // No implicit automatic shift: only an explicitly assigned shift is effective.
  $autoRow=Db::one('SELECT from_jdate,to_jdate FROM user_shifts WHERE user_id=? AND shift_id=0',[(int)$userId]);
  if($autoRow){
    $from=!empty($autoRow['from_jdate'])?str_replace('/','-',$autoRow['from_jdate']):null;
    $to=!empty($autoRow['to_jdate'])?str_replace('/','-',$autoRow['to_jdate']):null;
    if(!$jdate||((!$from||strcmp($jdate,$from)>=0)&&(!$to||strcmp($jdate,$to)<=0)))return _auto_shift_for_user($userId);
  }
  return null;
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
  // ÙØ§Ø² Û·.Û²: Ø±Ú©ÙˆØ±Ø¯Ù‡Ø§ÛŒÛŒ Ú©Ù‡ Ø¨Ø§ Ø±ÙˆØ² Ù‡Ù…â€ŒÙ¾ÙˆØ´Ø§Ù†ÛŒ Ø¯Ø§Ø±Ù†Ø¯ Ø§Ù†ØªØ®Ø§Ø¨ Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯ØŒ Ù†Ù‡ ÙÙ‚Ø· Ø±Ú©ÙˆØ±Ø¯Ù‡Ø§ÛŒÛŒ Ú©Ù‡ Ù‡Ù…Ø§Ù† Ø±ÙˆØ² Ø´Ø±ÙˆØ¹ Ø´Ø¯Ù‡â€ŒØ§Ù†Ø¯.
  // Ø§ÛŒÙ† Ø§ØµÙ„Ø§Ø­ Ø¨Ø§Ø¹Ø« Ù…ÛŒâ€ŒØ´ÙˆØ¯ Ø´ÛŒÙØª Ø´Ø¨ Û²Û³ ØªØ§ Û· Ø¯Ø± Ú¯Ø²Ø§Ø±Ø´ Ø±ÙˆØ² Ø¨Ø¹Ø¯ Ùˆ Ù…Ø§Ù‡ Ø¨Ø¹Ø¯ Ù†ÛŒØ² Ø¯Ø±Ø³Øª Ø¯ÛŒØ¯Ù‡ Ø´ÙˆØ¯.
  $rows = Db::all("SELECT id, check_in, check_out, method, in_lat, in_lng, out_lat, out_lng, in_station, out_station
    FROM staff_attendance
    WHERE user_id=? AND check_in < ? AND COALESCE(check_out, NOW()) > ?
    ORDER BY check_in", [(int)$userId,$end,$start]);
  foreach ($rows as &$r) {
    $r['_clip_start'] = $start; $r['_clip_end'] = $end; $r['_gdate'] = $g;
    $rowIn=strtotime($r['check_in']??'');
    $rowOut=!empty($r['check_out'])?strtotime($r['check_out']):time();
    $gpsFrom=max(strtotime($start),$rowIn?:strtotime($start));
    $gpsTo=min(strtotime($end),$rowOut?:time());
    $pendingGpsGrace=empty($r['check_out']) && $gpsTo>=time()-60; // Ù…Ù‡Ù„Øª ÙÙ‚Ø· Ø¨Ø±Ø§ÛŒ Ù†ÛŒÙ…â€ŒØ³Ø§Ø¹Øª Ø¬Ø§Ø±ÛŒØ› Ø±ÙˆØ²Ù‡Ø§ÛŒ Ø¨Ø³ØªÙ‡â€ŒØ´Ø¯Ù‡ Ø¯ÛŒÚ¯Ø± Ù…Ù‡Ù„Øª Ù†Ø¯Ø§Ø±Ù†Ø¯.
    $r['_gps_invalid']=$gpsTo>$gpsFrom?_gps_work_invalid_intervals((int)$userId,$gpsFrom,$gpsTo,$pendingGpsGrace):[];
  }
  return $rows;
}

/**
 * Monthly attendance totals must be derived from the identical day records
 * displayed by the attendance detail endpoint. In particular, a day with no
 * punch counts toward absence, not simultaneously toward shortage.
 * Returns null when the canonical report cannot provide a complete day range.
 */
/**
 * Monthly net shortage is the uncovered remaining duty after crediting
 * eligible in-shift presence, approved leave/mission and separately-reported
 * absence. This caps (never increases) the sum of daily shortages.
 * Day-level late/early/GPS evidence remains in attendance detail.
 */
/**
 * Monthly net shortage credits only approved leave/mission minutes that
 * actually cover an uncovered scheduled duty on their own date. Never subtract
 * mission minutes: mission is independent of shortage in these reports.
 * Existing daily shortage is an upper bound; absence is accounted separately.
 */
function _work_month_net_shortage(array $tot, array $requestMinutes=[]): int {
  $expected=max(0,(int)($tot['expected']??0));
  $inShift=max(0,(int)($tot['in_shift']??0));
  $absence=max(0,(int)($tot['absent_min']??0));
  $credits=max(0,(int)($tot['credited_exemption']??0));
  $uncovered=max(0,$expected-$inShift-$absence-$credits);
  return min(max(0,(int)($tot['shortage']??0)),$uncovered);
}

function _work_month_daily_attendance_totals(array $report, int $lastDay): ?array {
  if (!isset($report['days']) || !is_array($report['days']) || count($report['days']) !== $lastDay) return null;
  $parse = static function($value): int {
    if (is_int($value) || is_float($value)) return max(0,(int)$value);
    $value = trim(strtr((string)$value,['Û°'=>'0','Û±'=>'1','Û²'=>'2','Û³'=>'3','Û´'=>'4','Ûµ'=>'5','Û¶'=>'6','Û·'=>'7','Û¸'=>'8','Û¹'=>'9']));
    if (preg_match('/^([0-9]+):([0-5][0-9])$/',$value,$m)) return (int)$m[1]*60+(int)$m[2];
    return ctype_digit($value) ? (int)$value : 0;
  };
  $tot=['expected'=>0,'in_shift'=>0,'shortage'=>0,'absent_min'=>0,'credited_exemption'=>0];
  $seen=[];
  foreach ($report['days'] as $day) {
    if (!is_array($day)) return null;
    $jdate=ShiftCalc::normJdate($day['jdate']??$day['date']??'');
    if (!$jdate || isset($seen[$jdate])) return null;
    $seen[$jdate]=true;
    if (!empty($day['is_future']) || !empty($day['outside_employment_period'])) continue;
    $expected=$parse($day['expected']??0);
    $inShift=$parse($day['in_shift']??0);
    $shortage=$parse($day['shortage']??0);
    $tot['expected'] += $expected;
    $tot['in_shift'] += $inShift;
    // Only approved leave may cover a duty gap here. Mission is reported
    // independently; the organization Excel export applies its own policy.
    $request=$parse($day['annual_leave']??0)+$parse($day['sick_leave']??0)
      +$parse($day['unpaid_leave']??0);
    $uncoveredDay=max(0,$expected-min($expected,$inShift));
    $credited=min($uncoveredDay,$request);
    $tot['credited_exemption'] += $credited;
    $punches=$day['punches']??[];
    if (empty($punches)) {
      $tot['absent_min'] += max(0,$expected-$credited);
    } else {
      $tot['shortage'] += $shortage;
    }
  }
  return $tot;
}

// Ú¯Ø²Ø§Ø±Ø´ ØªØ¬Ù…ÛŒØ¹ÛŒ Ú©Ø§Ø±Ú©Ø±Ø¯ Ù…Ø§Ù‡Ø§Ù†Ù‡ (Ø´Ø¨ÛŒÙ‡ ÙÛŒÙ†ØªÙˆ) â€” Ø¨Ø± Ø§Ø³Ø§Ø³ staff_attendance Ùˆ Ø´ÛŒÙØª Ú©Ø§Ø±Ø¨Ø±
// Ù¾Ø§Ø±Ø§Ù…ØªØ±Ù‡Ø§: ?year=1404&month=6  (ÛŒØ§ from/to Ø¬Ù„Ø§Ù„ÛŒ)
function _shift_month_report($jy, $jm, $throughJdate=null, $onlyUserId=null) {
  // Ø±Ú©ÙˆØ±Ø¯Ù‡Ø§ÛŒ Ø¨Ø§Ø²Ù Ù‚Ø¯ÛŒÙ…ÛŒ Ø¨Ø§ÛŒØ¯ Ù‚Ø¨Ù„ Ø§Ø² Ú¯Ø²Ø§Ø±Ø´ Ù…Ø·Ø§Ø¨Ù‚ Ø³ÛŒØ§Ø³Øª Auto-Close Ø¨Ø³ØªÙ‡ Ø´ÙˆÙ†Ø¯Ø›
  // ÙˆÚ¯Ø±Ù†Ù‡ Ú¯Ø²Ø§Ø±Ø´ Ù…Ø§Ù‡â€ŒÙ‡Ø§ÛŒ Ú¯Ø°Ø´ØªÙ‡ Ù…Ù…Ú©Ù† Ø§Ø³Øª ÛŒÚ© Ø¬Ù„Ø³Ù‡Ù” Ø¨Ø§Ø² Ø±Ø§ ØµÙØ± Ù…Ø­Ø§Ø³Ø¨Ù‡ Ú©Ù†Ø¯.
  try {
    $pending = $onlyUserId !== null
      ? Db::all("SELECT DISTINCT user_id FROM staff_attendance WHERE user_id=? AND check_out IS NULL", [(int)$onlyUserId])
      : Db::all("SELECT DISTINCT user_id FROM staff_attendance WHERE check_out IS NULL");
    foreach ($pending as $or) {
      _attendance_auto_close_stale((int)$or['user_id']);
    }
  } catch (Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  $jmStr = str_pad($jm, 2, '0', STR_PAD_LEFT);
  $prefix = "$jy-$jmStr-";
  // ØªØ¹Ø¯Ø§Ø¯ Ø±ÙˆØ²Ù‡Ø§ÛŒ Ù…Ø§Ù‡ Ø´Ù…Ø³ÛŒ: Û±..Û¶ â‡’Û³Û±ØŒ Û·..Û±Û±â‡’Û³Û°ØŒ Û±Û²â‡’Û²Û¹/Û³Û°
  $days = ShiftCalc::jMonthDays($jy, $jm);
  $throughJdate=$throughJdate?ShiftCalc::normJdate($throughJdate):null;
  // Cap live reports to today's Jalali date: future dates are neither absent nor deficient.
  [$cy,$cm,$cd]=gregorian_to_jalali((int)date('Y'),(int)date('n'),(int)date('j'));
  $todayJ=sprintf('%04d-%02d-%02d',$cy,$cm,$cd);
  $firstJ=sprintf('%04d-%02d-01',$jy,$jm);
  $endJ=sprintf('%04d-%02d-%02d',$jy,$jm,ShiftCalc::jMonthDays($jy,$jm));
  // Monthly actuals stop at the end of yesterday, never at an incomplete current day.
  $yesterdayJ=_app_jdate_from_time(date('Y-m-d H:i:s',strtotime('yesterday noon')));
  $yesterdayJ=ShiftCalc::normJdate($yesterdayJ);
  if($endJ>$yesterdayJ && ($throughJdate===null || $throughJdate>$yesterdayJ))$throughJdate=$yesterdayJ;
  $lastDay=$firstJ>$yesterdayJ?0:ShiftCalc::monthReportLastDay($jy,$jm,$throughJdate);
  // monthReportLastDay may treat a cutoff before the month as a full month.
  if($firstJ>$yesterdayJ)$lastDay=0;
  $reportNow=time();
  $holidays = array_column(Db::all("SELECT jdate FROM holidays WHERE jdate LIKE ?", [$prefix.'%']), 'jdate');
  $holidaySet = array_flip($holidays);
  unset($holidaySet['1405-07-05'], $holidaySet['1405/07/05']);
  // Ú©Ø§Ø±Ø¨Ø±Ø§Ù†ÛŒ Ú©Ù‡ Ø¯Ø± Ø¨Ø®Ø´ÛŒ Ø§Ø² Ù…Ø§Ù‡ Ø´ÛŒÙØª ÙØ¹Ø§Ù„ Ø¯Ø§Ø±Ù†Ø¯
  $userFilter = $onlyUserId !== null ? " AND us.user_id=?" : "";
  $assignParams = [$prefix.'31', $prefix.'01'];
  if ($onlyUserId !== null) $assignParams[]=(int)$onlyUserId;
  $assigns = Db::all("SELECT us.user_id, us.shift_id, us.from_jdate, us.to_jdate, CONCAT(uu.first_name,' ',uu.last_name) name, r.title role
    FROM user_shifts us JOIN users uu ON uu.id=us.user_id AND uu.is_active=1 LEFT JOIN roles r ON r.id=uu.role_id
    WHERE (us.from_jdate IS NULL OR us.from_jdate <= ?) AND (us.to_jdate IS NULL OR us.to_jdate >= ?)" . $userFilter, $assignParams);
  // A substitute can have a temporary assignment without a permanent user_shifts row.
  try{
    $subParams=[$endJ,$firstJ];if($onlyUserId!==null)$subParams[]=(int)$onlyUserId;
    $subUsers=Db::all("SELECT sa.substitute_user_id user_id,0 shift_id,sa.from_date from_jdate,sa.to_date to_jdate,CONCAT(uu.first_name,' ',uu.last_name) name,r.title role
      FROM substitute_assignments sa JOIN requests rq ON rq.id=sa.request_id AND rq.status='approved' AND rq.type='annual' AND COALESCE(rq.unit,'daily')='daily'
      JOIN users uu ON uu.id=sa.substitute_user_id AND uu.is_active=1 LEFT JOIN roles r ON r.id=uu.role_id
      WHERE sa.status='active' AND sa.from_date<=? AND sa.to_date>=?".($onlyUserId!==null?' AND sa.substitute_user_id=?':''),$subParams);
    $assigns=array_merge($assigns,$subUsers);
  }catch(Throwable $e){/* Legacy databases can lack substitute_assignments until first use. */}
  $shiftsById = [];
  foreach (Db::all("SELECT * FROM shifts WHERE is_active=1") as $sx) $shiftsById[$sx['id']] = $sx;
  $out = [];
  $reportedUsers=[];
  foreach ($assigns as $a) {
    // Several shift assignments can overlap one month; calculate each user only once.
    $reportUid=(int)$a['user_id'];
    if(isset($reportedUsers[$reportUid]))continue;
    $reportedUsers[$reportUid]=true;
    // Select an effective shift within the reporting window, not the first historical assignment.
    $shift=null;
    for($probe=1;$probe<=$lastDay;$probe++){
      $probeJ=$prefix.str_pad($probe,2,'0',STR_PAD_LEFT);
      $shift=_active_user_shift_assignment($reportUid,$probeJ);
      if($shift)break;
    }
    if(!$shift)continue;
    $dayRows = [];
    if (($shift['type'] ?? '') === 'advanced') {
      foreach (Db::all("SELECT jdate,segments,is_off,day_config FROM shift_days WHERE shift_id=? AND jdate LIKE ?", [$a['shift_id'], $prefix.'%']) as $dr)
        $dayRows[$dr['jdate']] = $dr;
    }
    // Ù…Ø±Ø®ØµÛŒ/Ù…Ø§Ù…ÙˆØ±ÛŒØª ØªØ£ÛŒÛŒØ¯Ø´Ø¯Ù‡ Ø¨Ø§ÛŒØ¯ Ø§Ø² Ú©Ø³Ø±ÛŒ Ù‡Ù…Ø§Ù† Ø±ÙˆØ² Ú©Ù… Ø´ÙˆØ¯Ø› Ø¨Ø§Ø²Ù‡â€ŒÙ‡Ø§ÛŒ Ú†Ù†Ø¯Ø±ÙˆØ²Ù‡
    // Ù…Ø·Ø§Ø¨Ù‚ Ú¯Ø²Ø§Ø±Ø´ Ø±ÙˆØ²Ø§Ù†Ù‡ Ø¨ÛŒÙ† Ø±ÙˆØ²Ù‡Ø§ÛŒ Ø¨Ø§Ø²Ù‡ ØªÙ‚Ø³ÛŒÙ… Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯.
    $reqAgg = ['annual_min'=>0,'sick_min'=>0,'mission_min'=>0,'unpaid_min'=>0,'ot_req_min'=>0];
    $approvedExemptByJdate=[];
    $rqs=Db::all("SELECT type,unit,from_jdate,to_jdate,the_date,from_time,to_time,MAX(minutes) AS minutes
      FROM requests WHERE user_id=? AND status='approved' AND type IN('annual','sick','unpaid','mission','overtime')
      GROUP BY type,unit,from_jdate,to_jdate,the_date,from_time,to_time",[$a['user_id']]);
    $normSummaryDate=static function($v){$v=trim(str_replace('/','-',(string)$v));if(!preg_match('/^(\\d{4})-(\\d{1,2})-(\\d{1,2})$/',$v,$m))return null;return sprintf('%04d-%02d-%02d',(int)$m[1],(int)$m[2],(int)$m[3]);};
    foreach($rqs as $rq){
      $from=$normSummaryDate($rq['from_jdate']??'')?:$normSummaryDate($rq['the_date']??'');
      $to=$normSummaryDate($rq['to_jdate']??'')?:$normSummaryDate($rq['the_date']??'')?:$from;
      if(!$from||!$to||$to<$from)continue;
      $fromTs=j_to_ts($from);$toTs=j_to_ts($to);
      if($fromTs===false||$fromTs===null||$toTs===false||$toTs===null||$toTs<$fromTs)continue;
      if(($rq['unit']??'')==='hourly'){
        $mins=(int)($rq['minutes']??0);
        if($mins<=0&&!empty($rq['from_time'])&&!empty($rq['to_time'])){[$fh,$fm]=array_map('intval',explode(':',(string)$rq['from_time']));[$th,$tm]=array_map('intval',explode(':',(string)$rq['to_time']));$mins=max(0,$th*60+$tm-$fh*60-$fm);}
        $reqDays=[$from=>$mins];
      }else{
        $dayCount=max(1,(int)floor(($toTs-$fromTs)/86400)+1);$total=(int)($rq['minutes']??0);if($total<=0)$total=$dayCount*480;$base=intdiv($total,$dayCount);$rem=$total%$dayCount;$reqDays=[];
        for($dts=$fromTs,$i=0;$dts<=$toTs;$dts+=86400,$i++){[$ry,$rm,$rd]=gregorian_to_jalali((int)date('Y',$dts),(int)date('n',$dts),(int)date('j',$dts));$reqDays[sprintf('%04d-%02d-%02d',$ry,$rm,$rd)]=$base+($i<$rem?1:0);}
      }
      foreach($reqDays as $reqDate=>$mins){
        if(strpos($reqDate,$prefix)!==0)continue;
        if($throughJdate!==null&&strcmp($reqDate,$throughJdate)>0)continue;
        if($rq['type']==='annual')$reqAgg['annual_min']+=$mins;
        elseif($rq['type']==='sick')$reqAgg['sick_min']+=$mins;
        elseif($rq['type']==='unpaid')$reqAgg['unpaid_min']+=$mins;
        elseif($rq['type']==='mission')$reqAgg['mission_min']+=$mins;
        elseif($rq['type']==='overtime')$reqAgg['ot_req_min']+=$mins;
        if(in_array($rq['type'],['annual','sick','unpaid'],true))$approvedExemptByJdate[$reqDate]=($approvedExemptByJdate[$reqDate]??0)+$mins;
      }
    }
    // Ø¬Ù„Ø³Ø§Øª Ø«Ø¨Øªâ€ŒØ­Ø¶ÙˆØ± Ú©Ø§Ø±Ø¨Ø± Ø¯Ø± Ø§ÛŒÙ† Ù…Ø§Ù‡ (Ø¨Ø± Ø§Ø³Ø§Ø³ ØªØ§Ø±ÛŒØ® Ù…ÛŒÙ„Ø§Ø¯ÛŒÙ Ù…ØªÙ†Ø§Ø¸Ø± Ø¨Ø§ Ù‡Ø± Ø±ÙˆØ² Ø´Ù…Ø³ÛŒ)
    $tot = ['friday_overtime'=>0,'worked'=>0,'in_shift'=>0,'expected'=>0,'overtime'=>0,'shortage'=>0,'night'=>0,'friday'=>0,'holiday'=>0,'late_in'=>0,'early_out'=>0,'surplus'=>0,'adjusted_ot'=>0,'present_days'=>0,'absent_min'=>0];
    for ($d=1; $d<=$lastDay; $d++) {
      $jdate = $prefix.str_pad($d,2,'0',STR_PAD_LEFT);
      // Resolve the effective assignment on each date, including substitute shifts.
      // A single month may span several shift assignments.
      $dayShift = _active_user_shift_assignment($a['user_id'], $jdate);
      if (!$dayShift) continue;
      $shift = $dayShift;
      $rows = _attendance_rows_for_jdate($a['user_id'], $jdate);
      $dr = (($shift['type']??'')==='advanced') ? _shift_day_row($shift['shift_id']??$shift['id'], $jdate) : null;
      $isHol = ShiftCalc::effectiveHoliday($jdate);
      // Ù…Ø­Ø§Ø³Ø¨Ù‡Ù” Ø±ÙˆØ²Ù‡Ø§ÛŒ Ø¨Ø¯ÙˆÙ† ØªØ±Ø¯Ø¯ Ù†ÛŒØ² Ø¨Ø§ÛŒØ¯ Ø¯Ù‚ÛŒÙ‚Ø§Ù‹ Ø§Ø² Ù‡Ù…Ø§Ù† Ù…ÙˆØªÙˆØ± Ù…Ø­Ø§Ø³Ø¨Ù‡Ù”
      // Ø±ÙˆØ²Ù‡Ø§ÛŒ Ø¯Ø§Ø±Ø§ÛŒ ØªØ±Ø¯Ø¯ Ø¹Ø¨ÙˆØ± Ú©Ù†Ø¯Ø› Ù…Ø®ØµÙˆØµØ§Ù‹ Ø¨Ø±Ø§ÛŒ Ø´ÛŒÙØª Ø®ÙˆØ¯Ú©Ø§Ø±ØŒ Ø¬Ù…Ø¹Ù‡ØŒ ØªØ¹Ø·ÛŒÙ„
      // Ùˆ Ø±ÙˆØ²Ù‡Ø§ÛŒ Ø¨Ø¯ÙˆÙ† Ù…ÙˆØ¸ÙÛŒ. Ø¯Ø± ØºÛŒØ± Ø§ÛŒÙ† ØµÙˆØ±Øª Ú¯Ø²Ø§Ø±Ø´ Ù…Ø§Ù‡Ø§Ù†Ù‡ Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ø³Øª ÛŒÚ© Ø±ÙˆØ²
      // Ø¢Ø²Ø§Ø¯ Ø±Ø§ Ø¨Ù‡ Ø§Ø´ØªØ¨Ø§Ù‡ ØºÛŒØ¨Øª Û·:Û³Û³ Ø«Ø¨Øª Ú©Ù†Ø¯.
      $sessions = array_map(fn($r)=>['in'=>strtotime($r['check_in']),'out'=>$r['check_out']?strtotime($r['check_out']):($throughJdate!==null?$reportNow:null),'clip_start'=>strtotime($r['_clip_start'] ?? '1970-01-01 00:00:00'),'clip_end'=>strtotime($r['_clip_end'] ?? '2999-01-01 00:00:00'),'gps_invalid'=>$r['_gps_invalid']??[]], $rows);
      $w = ShiftCalc::dayWork($shift, $jdate, $dr, $sessions, $isHol);
      $hasOpenSession=(bool)array_filter($rows,static fn($r)=>empty($r['check_out']));
      $isInCurrentReport=$throughJdate!==null&&strcmp($jdate,$throughJdate)<=0;
      $fullExpected=max(0,(int)($w['expected']??0));
      $elapsedExpected=$isInCurrentReport?ShiftCalc::elapsedExpectedMinutes($shift,$jdate,$dr,$reportNow):null;
      $isAsOfDay=false; // Only fully completed dates are included; open sessions must not be finalized as shortages.
      // Do not prorate past scheduled shifts by the current clock time.

      if (!$rows) {
        // Ù…ÙˆØ¸ÙÛŒ Ù…Ø§Ù‡Ø§Ù†Ù‡ Ø¨Ø§ÛŒØ¯ Ø­ØªÛŒ Ø¯Ø± Ø±ÙˆØ² ØºÛŒØ¨Øª Ù‡Ù… Ø¯Ø± Ù…Ø¬Ù…ÙˆØ¹ Ø«Ø¨Øª Ø´ÙˆØ¯.
        // ØºÛŒØ¨Øª Ù‡Ù…Ø§Ù† Ù…ÙˆØ¸ÙÛŒÙ Ø§Ù†Ø¬Ø§Ù…â€ŒÙ†Ø´Ø¯Ù‡ Ø§Ø³ØªØ› Ø¨Ù†Ø§Ø¨Ø±Ø§ÛŒÙ† Ø­Ø°Ù expected Ø§Ø²
        // Ø§ÛŒÙ† Ø±ÙˆØ²Ù‡Ø§ Ø¨Ø§Ø¹Ø« Ú©Ù…â€ŒÙ†Ù…Ø§ÛŒÛŒ Ù…ÙˆØ¸ÙÛŒ Ù…Ø§Ù‡Ø§Ù†Ù‡ Ù…ÛŒâ€ŒØ´Ø¯.
        $dayExpected = max(0, (int)($w['expected'] ?? 0));
        $dayExempt=min($dayExpected,max(0,(int)($approvedExemptByJdate[$jdate]??0)));
        $dayAbsent=($isAsOfDay&&$elapsedExpected===null)?0:max(0,$dayExpected-$dayExempt);
        $tot['expected'] += $dayExpected;
        $tot['absent_min'] += $dayAbsent;
        continue;
      }
      if($hasOpenSession)$w['shortage']=0;
      if($hasOpenSession)$w['early_out']=0;
      $dayExempt=min(max(0,(int)($w['expected']??0)),max(0,(int)($approvedExemptByJdate[$jdate]??0)));
      if($dayExempt>0)$w['shortage']=max(0,(int)($w['shortage']??0)-$dayExempt);
      $adj = _attendance_adjusted_overtime($a['user_id'],$jdate);
      if ($adj > 0) { $use = min($adj, (int)($w['surplus'] ?? 0)); $w['overtime'] = (int)($w['overtime'] ?? 0) + $use; $w['surplus'] = max(0, (int)($w['surplus'] ?? 0) - $use); $w['adjusted_ot'] = $use; }
      foreach (['worked','in_shift','expected','overtime','shortage','night','friday','holiday','late_in','early_out','surplus','adjusted_ot'] as $k) $tot[$k]+=($w[$k] ?? 0);
      // Ø¬Ù…Ø¹Ù‡ Ú©Ø§Ø±ÛŒ Ø§Ø¶Ø§ÙÙ‡ Ø¨Ø± Ø³Ø§Ø¹Øª Ù…ÙˆØ¸ÙÛŒØŒ Ù…Ø³ØªÙ‚Ù„ Ø§Ø² Ø¬Ù…Ø¹Ù‡ Ú©Ø§Ø±ÛŒ Ù¾Ø§ÛŒÙ‡ Ø¯Ø± Ú¯Ø²Ø§Ø±Ø´ Ø³Ø§Ø²Ù…Ø§Ù†ÛŒ.
      // Friday worked minutes are already included in 'friday'; do not add them a second time.
      // Friday overtime is the Friday work itself; never add a separate overtime bucket.
      if ($w['worked']>0) $tot['present_days']++;
    }
    // Reconcile the monthly detail with the canonical report returned to the
    // attendance UI. Previously this independent loop could show 02:02 shortage
    // when all visible daily rows showed 00:00.
    if ($lastDay > 0) {
      try {
        require_once __DIR__.'/../app/api/admin-attendance-report-owned.php';
        $monthlyTo=$prefix.str_pad($lastDay,2,'0',STR_PAD_LEFT);
        $dailyReport=attendance_report_owned_by_entry_date($reportUid,$firstJ,$monthlyTo,true);
        $dailyTotals=_work_month_daily_attendance_totals($dailyReport,$lastDay);
        if ($dailyTotals !== null) {
          foreach ($dailyTotals as $field=>$minutes) $tot[$field]=$minutes;
        } else {
          error_log('monthly work daily reconciliation unavailable for user '.$reportUid);
        }
      } catch (Throwable $reconciliationError) {
        error_log('monthly work daily reconciliation failed for user '.$reportUid.': '.$reconciliationError->getMessage());
      }
    }
    // Net monthly settlement: extra eligible presence on other dates covers
    // short daily windows; recorded absences stay in their own column.
    $tot['shortage']=_work_month_net_shortage($tot,$reqAgg);
    unset($tot['credited_exemption']);
    // Keep regular overtime and Friday/holiday work as disjoint minute buckets.
    // The monthly visible overtime is their sum, matching daily total_overtime.
    // Apply the monthly cap to regular overtime only, not to Friday/holiday work.
    $tot['regular_overtime']=max(0,(int)($tot['overtime']??0));
    $tot['friday_overtime']=max(0,(int)($tot['friday']??0));
    $tot['holiday_overtime']=max(0,(int)($tot['holiday']??0));
    $tot['holiday_friday_overtime']=$tot['friday_overtime']+$tot['holiday_overtime'];
    // Gross time is the sum of daily detail, irrespective of payroll caps.
    $tot['total_overtime']=$tot['regular_overtime']+$tot['holiday_friday_overtime'];
    // 'overtime' is the regular-only column in daily/monthly reports.
    // Friday and holiday minutes are exposed separately and in total_overtime.
    $tot['overtime']=$tot['regular_overtime'];
    // Automatic shifts have no monthly overtime ceiling, regardless of legacy DB settings.
    $monthlyCap=(($shift['type']??'')==='auto')?0:max(0,(int)($shift['monthly_ot_cap']??0));
    $tot['monthly_ot_cap']=$monthlyCap;
    $tot['payable_regular_overtime']=$monthlyCap>0?min($tot['regular_overtime'],$monthlyCap):$tot['regular_overtime'];
    $tot['capped_overtime_minutes']=$tot['regular_overtime']-$tot['payable_regular_overtime'];
    $tot['payable_total_overtime']=$tot['payable_regular_overtime']+$tot['holiday_friday_overtime'];
    $out[] = array_merge(['user_id'=>$a['user_id'],'name'=>$a['name'],'role'=>$a['role'],'shift'=>$shift['title'],'shift_type'=>$shift['type']??'auto'], $tot, $reqAgg);
  }
  return $out;
}

// Ù…Ø¬ÙˆØ² Ù…Ø³ØªÙ‚Ù„ Ú¯Ø²Ø§Ø±Ø´ Ú©Ø§Ø±Ú©Ø±Ø¯ Ù…Ø§Ù‡Ø§Ù†Ù‡Ø› Ø¨Ø§ Ø¯Ø³ØªØ±Ø³ÛŒ Ø´ÛŒÙØª Ùˆ Ø­Ø¶ÙˆØ± Ø§Ø´ØªØ±Ø§Ú© Ù†Ø¯Ø§Ø±Ø¯.
function _monthly_work_report_need($u){
  $row=Db::one("SELECT value FROM app_settings WHERE `key`='role_perms' LIMIT 1");
  if(!$row)return; // Ø³Ø§Ø²Ú¯Ø§Ø± Ø¨Ø§ Ø­Ø§Ù„Øª Ù¾ÛŒØ´â€ŒÙØ±Ø¶ Ù¾Ù†Ù„: Ø¨Ø¯ÙˆÙ† Ù¾ÛŒÚ©Ø±Ø¨Ù†Ø¯ÛŒ Ù‡Ù…Ù‡Ù” Ø¢ÛŒØªÙ…â€ŒÙ‡Ø§ Ù…Ø¬Ø§Ø²Ù†Ø¯.
  $cfg=json_decode((string)$row['value'],true);
  $rid=(string)($u['role_id']??'');
  if(!is_array($cfg)||!array_key_exists($rid,$cfg))return;
  $items=is_array($cfg[$rid])?$cfg[$rid]:[];
  if(!in_array('monthlyworkreport',$items,true))Http::error('Ø¯Ø³ØªØ±Ø³ÛŒ Ú¯Ø²Ø§Ø±Ø´ Ú©Ø§Ø±Ú©Ø±Ø¯ Ù…Ø§Ù‡Ø§Ù†Ù‡ Ø¨Ø±Ø§ÛŒ Ø³Ù…Øª Ø´Ù…Ø§ ÙØ¹Ø§Ù„ Ù†ÛŒØ³Øª',403);
}

function _final_work_month($y,$m){
  static $ready=false;
  if(!$ready){
    Db::run("CREATE TABLE IF NOT EXISTS finalized_work_months (jy SMALLINT NOT NULL,jm TINYINT NOT NULL,monthly_json LONGTEXT NOT NULL,daily_json LONGTEXT NOT NULL,finalized_by BIGINT NULL,finalized_at DATETIME DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(jy,jm)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $ready=true;
  }
  return Db::one("SELECT * FROM finalized_work_months WHERE jy=? AND jm=?",[$y,$m]);
}
function _work_snapshot_decode($json){
  $data=json_decode((string)$json,true,512,JSON_THROW_ON_ERROR);
  if(!is_array($data))throw new RuntimeException('Invalid work month snapshot');
  return $data;
}
function _work_only_active_users($rows){
  if(!$rows)return [];
  $active=Db::all("SELECT id FROM users WHERE is_active=1");
  $allowed=array_fill_keys(array_map('intval',array_column($active,'id')),true);
  return array_values(array_filter($rows,static fn($r)=>isset($allowed[(int)($r['user_id']??0)])));
}
function _work_month_rows($y,$m){
  $final=_final_work_month($y,$m);
  return _work_only_active_users($final?_work_snapshot_decode($final['monthly_json']):_shift_month_report($y,$m));
}
function _work_month_people(){
  $people=Db::all("SELECT u.id,u.first_name,u.last_name,u.username,u.national_code,u.personnel_code,u.zone_id,z.name AS zone_name FROM users u LEFT JOIN zones z ON z.id=u.zone_id WHERE u.is_active=1");
  $byId=[];foreach($people as $person)$byId[(int)$person['id']]=$person;
  return $byId;
}
function _work_organization_person($row,$livePeople,$daily){
  if(isset($row['organization_person'])&&is_array($row['organization_person']))return $row['organization_person'];
  $uid=(int)$row['user_id'];
  if($livePeople!==null)return $livePeople[$uid]??[];
  $person=$daily[$uid]['user']??[];
  return ['id'=>$uid,'first_name'=>$person['name']??$row['name']??'','last_name'=>'','personnel_code'=>$person['pcode']??'','zone_name'=>''];
}
function _frozen_attendance_report($userId,$from,$to){
  $from=ShiftCalc::normJdate($from);$to=ShiftCalc::normJdate($to);
  if(!$from||!$to||$from>$to)return null;
  [$year,$month]=array_map('intval',explode('-',substr($from,0,7)));
  $parts=[];$hasFrozen=false;
  while(sprintf('%04d-%02d-01',$year,$month)<=$to){
    $first=sprintf('%04d-%02d-01',$year,$month);
    $last=sprintf('%04d-%02d-%02d',$year,$month,ShiftCalc::jMonthDays($year,$month));
    $final=_final_work_month($year,$month);
    $parts[]=['from'=>max($from,$first),'to'=>min($to,$last),'final'=>$final];
    $hasFrozen=$hasFrozen||(bool)$final;
    if(++$month>12){$month=1;$year++;}
  }
  if(!$hasFrozen)return null;
  require_once __DIR__.'/../app/api/admin-attendance-report-owned.php';
  $result=null;$days=[];$missing=false;
  foreach($parts as $part){
    if($part['final']){
      $daily=_work_snapshot_decode($part['final']['daily_json']);
      $report=$daily[(int)$userId]??null;
      if(!$report){
        $missing=true;
        $report=['user'=>['id'=>(int)$userId,'name'=>'','pcode'=>''],'shift'=>null,'days'=>[]];
      }
    }else $report=attendance_report_owned_by_entry_date($userId,$part['from'],$part['to'],true);
    if($result===null)$result=$report;
    foreach($report['days']??[] as $day){
      $date=ShiftCalc::normJdate($day['jdate']??$day['date']??'');
      if($date&&$date>=$part['from']&&$date<=$part['to'])$days[$date]=$day;
    }
  }
  ksort($days);
  $result['from']=$from;$result['to']=$to;$result['days']=array_values($days);
  $result['contains_finalized_month']=true;
  if($missing)$result['missing_frozen_person']=true;
  return $result;
}
function _finalize_work_month($year,$month,$userId){
  if($year<1300||$year>1500||$month<1||$month>12)Http::error('ØªØ§Ø±ÛŒØ® Ù†Ø§Ù…Ø¹ØªØ¨Ø±',422);
  $from=sprintf('%04d-%02d-01',$year,$month);
  $to=sprintf('%04d-%02d-%02d',$year,$month,ShiftCalc::jMonthDays($year,$month));
  $today=gregorian_to_jalali((int)date('Y'),(int)date('n'),(int)date('j'));
  if($to>=sprintf('%04d-%02d-%02d',...$today))Http::error('Ù…Ø§Ù‡ Ø¬Ø§Ø±ÛŒ ÛŒØ§ Ø¢ÛŒÙ†Ø¯Ù‡ Ù‚Ø§Ø¨Ù„ Ù†Ù‡Ø§ÛŒÛŒâ€ŒØ³Ø§Ø²ÛŒ Ù†ÛŒØ³Øª',422);
  $lock='khatyar-work-final-'.$year.'-'.$month;
  if((int)(Db::one("SELECT GET_LOCK(?,0) locked",[$lock])['locked']??0)!==1)Http::error('Ù†Ù‡Ø§ÛŒÛŒâ€ŒØ³Ø§Ø²ÛŒ Ø§ÛŒÙ† Ù…Ø§Ù‡ Ø¯Ø± Ø­Ø§Ù„ Ø§Ø¬Ø±Ø§ Ø§Ø³Øª',409);
  try{
    if(_final_work_month($year,$month))Http::error('Ø§ÛŒÙ† Ù…Ø§Ù‡ Ù‚Ø¨Ù„Ø§Ù‹ Ù†Ù‡Ø§ÛŒÛŒ Ø´Ø¯Ù‡ Ø§Ø³Øª',409);
    require_once __DIR__.'/../app/api/admin-attendance-report-owned.php';
    $rows=_shift_month_report($year,$month);
    $people=_work_month_people();
    foreach($rows as &$row)$row['organization_person']=$people[(int)$row['user_id']]??[];
    unset($row);
    $daily=[];
    foreach($people as $uid=>$person){
      $daily[$uid]=attendance_report_owned_by_entry_date($uid,$from,$to,true);
      $daily[$uid]['rotation_person']=$person;
    }
    Db::run("INSERT INTO finalized_work_months(jy,jm,monthly_json,daily_json,finalized_by) VALUES(?,?,?,?,?)",[$year,$month,json_encode($rows,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),json_encode($daily,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),(int)$userId]);
    return ['ok'=>true,'count'=>count($rows)];
  }finally{Db::one("SELECT RELEASE_LOCK(?) released",[$lock]);}
}
route('GET','/api/admin/shift-report/finalization',function($p,$b,$u){
  _monthly_work_report_need($u);$year=(int)($_GET['year']??0);$month=(int)($_GET['month']??0);
  if($year<1300||$year>1500||$month<1||$month>12)Http::error('ØªØ§Ø±ÛŒØ® Ù†Ø§Ù…Ø¹ØªØ¨Ø±',422);
  $final=_final_work_month($year,$month);
  return ['finalized'=>(bool)$final,'finalized_at'=>$final['finalized_at']??null];
},false,ADMIN);
route('POST','/api/admin/shift-report/finalization',function($p,$b,$u){
  _monthly_work_report_need($u);
  return _finalize_work_month((int)($b['year']??0),(int)($b['month']??0),(int)($u['id']??0));
},false,ADMIN);
route('GET', '/api/admin/shift-report', function($p,$b,$u){
  _monthly_work_report_need($u);
  $jy=(int)($_GET['year']??0); $jm=(int)($_GET['month']??0);
  if (!$jy||!$jm) Http::error('Ø³Ø§Ù„ Ùˆ Ù…Ø§Ù‡ Ø´Ù…Ø³ÛŒ Ø±Ø§ Ù…Ø´Ø®Øµ Ú©Ù†ÛŒØ¯',400);
  return ['year'=>$jy,'month'=>$jm,'rows'=>_work_month_rows($jy,$jm)];
}, false, ADMIN);

// Shift rotation is an entry-time classification, independent of assigned/payable shifts.
function _shift_rotation_stamp($value){
  if(!$value)return null;
  $date=DateTimeImmutable::createFromFormat('!Y-m-d H:i:s',(string)$value,new DateTimeZone('Asia/Tehran'));
  $errors=DateTimeImmutable::getLastErrors();
  return $date&&(!$errors||(!$errors['warning_count']&&!$errors['error_count']))?$date:null;
}
function _shift_rotation_rows(array $people,array $punches,$start,$end){
  $rows=[];$days=[];$seen=[];
  foreach($people as $person){
    $uid=(int)$person['id'];
    $rows[$uid]=['user_id'=>$uid,'name'=>trim(($person['first_name']??'').' '.($person['last_name']??'')),
      'national_code'=>(string)(($person['national_code']??'')?:($person['username']??'')),
      'personnel_code'=>(string)($person['personnel_code']??''),
      'morning'=>0,'afternoon'=>0,'night'=>0,'matched_days'=>0,'outside_days'=>0,'open_sessions'=>0,
      'missing_source'=>!empty($person['missing_source'])];
  }
  foreach($punches as $punch){
    $uid=(int)($punch['user_id']??0);
    if(!isset($rows[$uid]))continue;
    $id=$punch['attendance_id']??null;
    if($id!==null&&isset($seen[$uid][$id]))continue;
    if($id!==null)$seen[$uid][$id]=true;
    $entry=_shift_rotation_stamp($punch['check_in']??null);
    if(!$entry||$entry<$start||$entry>=$end)continue;
    $exit=_shift_rotation_stamp($punch['check_out']??null);
    if(!$exit||$exit<=$entry)$rows[$uid]['open_sessions']++;
    $minute=(int)$entry->format('G')*60+(int)$entry->format('i');
    $kind=$minute>=300&&$minute<=660?'morning':($minute>=840&&$minute<=1080?'afternoon':($minute>=1260&&$minute<=1380?'night':'outside'));
    $days[$uid][$entry->format('Y-m-d')][$kind]=true;
  }
  foreach($rows as $uid=>&$row){
    $units=['morning'=>0,'afternoon'=>0,'night'=>0];
    foreach($days[$uid]??[] as $kinds){
      if(isset($kinds['outside']))$row['outside_days']++;
      unset($kinds['outside']);$count=count($kinds);
      if(!$count)continue;
      $row['matched_days']++;
      foreach($kinds as $kind=>$unused)$units[$kind]+=6/$count;
    }
    foreach($units as $kind=>$value)$row[$kind]=$row['missing_source']?null:$value/6;
    if($row['missing_source'])foreach(['matched_days','outside_days','open_sessions'] as $key)$row[$key]=null;
  }
  unset($row);
  return array_values($rows);
}
function _shift_rotation_report($year,$month){
  if($year<1300||$year>1500||$month<1||$month>12)Http::error('Ù…Ø§Ù‡ Ùˆ Ø³Ø§Ù„ Ø´Ù…Ø³ÛŒ Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª',422);
  require_once __DIR__.'/IranCalendar.php';
  [$gy,$gm,$gd]=IranCalendar::toGregorian($year,$month,1);
  $start=new DateTimeImmutable(sprintf('%04d-%02d-%02d 00:00:00',$gy,$gm,$gd),new DateTimeZone('Asia/Tehran'));
  $end=$start->modify('+'.IranCalendar::monthLength($year,$month).' days');
  $final=_final_work_month($year,$month);$people=[];$punches=[];
  if($final){
    $daily=_work_snapshot_decode($final['daily_json']);
    $monthly=_work_snapshot_decode($final['monthly_json']);$metadata=[];
    foreach($monthly as $person){
      $uid=(int)$person['user_id'];
      $metadata[$uid]=$person['organization_person']??['first_name'=>$person['name']??''];
      if(!isset($daily[$uid]))$daily[$uid]=['user'=>['name'=>$person['name']??''],'days'=>[]];
    }
    foreach($daily as $uid=>$report){
      $person=$report['rotation_person']??($metadata[(int)$uid]??[]);
      $person['id']=(int)$uid;
      if(empty($person['first_name'])&&empty($person['last_name']))$person['first_name']=$report['user']['name']??'';
      if(empty($person['personnel_code']))$person['personnel_code']=$report['user']['pcode']??'';
      $person['missing_source']=empty($report['days']);
      foreach($report['days']??[] as $day){
        if(!array_key_exists('punches',$day))$person['missing_source']=true;
        foreach($day['punches']??[] as $punch){
          if(empty($punch['in_full'])){$person['missing_source']=true;continue;}
          $punches[]=['user_id'=>(int)$uid,'attendance_id'=>$punch['id']??null,'check_in'=>$punch['in_full'],'check_out'=>$punch['out_full']??null];
        }
      }
      $people[]=$person;
    }
  }else{
    $people=array_values(_work_month_people());
    $punches=Db::all("SELECT a.id attendance_id,a.user_id,a.check_in,a.check_out
      FROM staff_attendance a JOIN users u ON u.id=a.user_id
      WHERE u.is_active=1 AND a.check_in>=? AND a.check_in<? ORDER BY a.check_in,a.id",[$start->format('Y-m-d H:i:s'),$end->format('Y-m-d H:i:s')]);
  }
  $rows=_shift_rotation_rows($people,$punches,$start,$end);
  $totals=array_fill_keys(['morning','afternoon','night','matched_days','outside_days','open_sessions'],0);
  $missing=0;$missingIdentity=0;
  foreach($rows as $row){foreach($totals as $key=>$unused)$totals[$key]+=$row[$key]??0;if($row['missing_source'])$missing++;if($row['national_code']==='')$missingIdentity++;}
  return ['year'=>$year,'month'=>$month,'source'=>$final?'finalized':'live','rows'=>$rows,'totals'=>$totals,'missing_source_count'=>$missing,'missing_identity_count'=>$missingIdentity];
}
function _shift_rotation_xlsx(array $report){
  $xw=new XlsxWriter(['Ø±Ø¯ÛŒÙ','Ù†Ø§Ù… Ùˆ Ù†Ø§Ù… Ø®Ø§Ù†ÙˆØ§Ø¯Ú¯ÛŒ','Ú©Ø¯ Ù…Ù„ÛŒ','Ø´Ù…Ø§Ø±Ù‡ Ù¾Ø±Ø³Ù†Ù„ÛŒ','ØµØ¨Ø­','Ø¹ØµØ±','Ø´Ø¨','Ø¬Ù…Ø¹ Ø±ÙˆØ² Ø·Ø¨Ù‚Ù‡â€ŒØ¨Ù†Ø¯ÛŒâ€ŒØ´Ø¯Ù‡','Ø±ÙˆØ² Ø¯Ø§Ø±Ø§ÛŒ ÙˆØ±ÙˆØ¯ Ø®Ø§Ø±Ø¬ Ø§Ø² Ø¨Ø§Ø²Ù‡','ÙˆØ±ÙˆØ¯ Ø¨Ø¯ÙˆÙ† Ø®Ø±ÙˆØ¬ Ù…Ø¹ØªØ¨Ø±']);
  $xw->setProfessionalStyle();
  $xw->setReportHeading('Ù…Ø­Ø§Ø³Ø¨Ù‡ Ú†Ø±Ø®Ø´ Ø´ÛŒÙØª Ù†ÛŒØ±ÙˆÙ‡Ø§',sprintf('Ø¯ÙˆØ±Ù‡: %04d/%02d | ØªØ¹Ø¯Ø§Ø¯ Ù†ÛŒØ±Ùˆ: %d | Ù…Ù†Ø¨Ø¹: %s | Ù†Ù‚Øµ ØªØ±Ø¯Ø¯: %d | Ú©Ø¯ Ù…Ù„ÛŒ Ù†Ø§Ù…ÙˆØ¬ÙˆØ¯: %d',$report['year'],$report['month'],count($report['rows']),$report['source']==='finalized'?'Ù…Ø§Ù‡ Ù†Ù‡Ø§ÛŒÛŒâ€ŒØ´Ø¯Ù‡':'ØªØ±Ø¯Ø¯ Ø«Ø¨Øªâ€ŒØ´Ø¯Ù‡',$report['missing_source_count'],$report['missing_identity_count']),
    'ØµØ¨Ø­ Û°Ûµ:Û°Û°â€“Û±Û±:Û°Û° | Ø¹ØµØ± Û±Û´:Û°Û°â€“Û±Û¸:Û°Û° | Ø´Ø¨ Û²Û±:Û°Û°â€“Û²Û³:Û°Û° | Ø³Ù‡Ù… Ø±ÙˆØ² Ø¨ÛŒÙ† Ø´ÛŒÙØªâ€ŒÙ‡Ø§ÛŒ Ù…ØªÙ…Ø§ÛŒØ² ØªÙ‚Ø³ÛŒÙ… Ù…ÛŒâ€ŒØ´ÙˆØ¯');
  $xw->setHeaderGroup(4,6,'Ú†Ø±Ø®Ø´ Ø´ÛŒÙØª (Ø±ÙˆØ²)');
  foreach([8,30,18,18,12,12,12,20,24,24] as $col=>$width)$xw->setColWidth($col,$width);
  $xw->setTextCol(2);$xw->setTextCol(3);
  foreach([4,5,6] as $col)$xw->setDecimalCol($col);
  foreach($report['rows'] as $index=>$row){
    $xw->addRow([$index+1,$row['name'],$row['national_code'],$row['personnel_code'],$row['morning'],$row['afternoon'],$row['night'],$row['matched_days'],$row['outside_days'],$row['open_sessions']]);
    $xw->setComment($index,4,'Ù…Ø¨Ù†Ø§ÛŒ Ù…Ø­Ø§Ø³Ø¨Ù‡ Ø³Ø§Ø¹Øª ÙˆØ±ÙˆØ¯ Ø§Ø³ØªØ› ÙˆØ±ÙˆØ¯ Ø¨Ø¯ÙˆÙ† Ø®Ø±ÙˆØ¬ Ù†ÛŒØ² Ø·Ø¨Ù‚Ù‡â€ŒØ¨Ù†Ø¯ÛŒ Ùˆ Ø¬Ø¯Ø§Ú¯Ø§Ù†Ù‡ Ú¯Ø²Ø§Ø±Ø´ Ù…ÛŒâ€ŒØ´ÙˆØ¯. ØªÚ©Ø±Ø§Ø± ÛŒÚ© Ø´ÛŒÙØª Ø¯Ø± ÛŒÚ© Ø±ÙˆØ² Ø³Ù‡Ù… Ø§Ø¶Ø§ÙÙ‡ Ù†Ù…ÛŒâ€ŒØ³Ø§Ø²Ø¯.');
    if($row['missing_source'])$xw->setComment($index,1,'Ø¬Ø²Ø¦ÛŒØ§Øª ÙˆØ±ÙˆØ¯ Ø¯Ø± snapshot Ù‚Ø¯ÛŒÙ…ÛŒ Ú©Ø§Ù…Ù„ Ù†ÛŒØ³ØªØ› Ø®Ø§Ù†Ù‡â€ŒÙ‡Ø§ÛŒ Ø®Ø§Ù„ÛŒ Ø¨Ù‡ Ù…Ø¹Ù†ÛŒ ØµÙØ± Ù†ÛŒØ³ØªÙ†Ø¯.');
    if($row['national_code']==='')$xw->setComment($index,2,'Ú©Ø¯ Ù…Ù„ÛŒ Ø¯Ø± Ø¯Ø§Ø¯Ù‡Ù” Ø§ÛŒÙ† Ú¯Ø²Ø§Ø±Ø´ Ù…ÙˆØ¬ÙˆØ¯ Ù†ÛŒØ³ØªØ› Ø§Ø·Ù„Ø§Ø¹Ø§Øª ÙØ¹Ù„ÛŒ Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† ØªØ§Ø±ÛŒØ®Ú†Ù‡ Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª.');
  }
  $t=$report['totals'];
  $xw->addRow(['',$report['missing_source_count']?'Ø¬Ù…Ø¹ Ø¯Ø§Ø¯Ù‡â€ŒÙ‡Ø§ÛŒ Ù…ÙˆØ¬ÙˆØ¯':'Ø¬Ù…Ø¹ Ú©Ù„','','',$t['morning'],$t['afternoon'],$t['night'],$t['matched_days'],$t['outside_days'],$t['open_sessions']]);
  $xw->output('Ú†Ø±Ø®Ø´_Ø´ÛŒÙØª_'.$report['year'].'_'.$report['month'].'.xlsx','Ú†Ø±Ø®Ø´ Ø´ÛŒÙØª Ù†ÛŒØ±ÙˆÙ‡Ø§');
}
route('GET','/api/admin/shift-report/rotation',function($p,$b,$u){
  _monthly_work_report_need($u);
  return _shift_rotation_report((int)($_GET['year']??0),(int)($_GET['month']??0));
},false,ADMIN);
route('GET','/api/admin/shift-report/rotation/export',function($p,$b,$u){
  _monthly_work_report_need($u);
  _shift_rotation_xlsx(_shift_rotation_report((int)($_GET['year']??0),(int)($_GET['month']??0)));
},false,ADMIN);

// ==================== Ú¯Ø²Ø§Ø±Ø´ ØªØ±Ø¯Ø¯ Ù¾Ø±Ø³Ù†Ù„ (Ù…Ø¯Ù„ ÙÛŒÙ†ØªÙˆ) ====================
// Ù†Ø§Ù… Ù…Ø­Ù„ ÙˆØ±ÙˆØ¯/Ø®Ø±ÙˆØ¬ Ø§Ø² Ø±ÙˆÛŒ Ù…Ø®ØªØµØ§Øª (Ù†Ø²Ø¯ÛŒÚ©â€ŒØªØ±ÛŒÙ† Ø§ÛŒØ³ØªÚ¯Ø§Ù‡)
function _station_name_at($lat,$lng,$lineIds=null){
  if($lat===null||$lng===null) return null;
  $st = station_at_point((float)$lat,(float)$lng,$lineIds,150);
  if($st && !empty($st['name'])) return $st['name'];
  $nr = _nearest_station((float)$lat,(float)$lng,$lineIds);
  return ($nr && !empty($nr['name'])) ? $nr['name'] : null;
}
// Ù†Ø§Ù… Ø±ÙˆØ² Ù‡ÙØªÙ‡Ù” Ø´Ù…Ø³ÛŒ
function _jweekday_name($jy,$jm,$jd){
  $names=['Ø´Ù†Ø¨Ù‡','ÛŒÚ©Ø´Ù†Ø¨Ù‡','Ø¯ÙˆØ´Ù†Ø¨Ù‡','Ø³Ù‡â€ŒØ´Ù†Ø¨Ù‡','Ú†Ù‡Ø§Ø±Ø´Ù†Ø¨Ù‡','Ù¾Ù†Ø¬Ø´Ù†Ø¨Ù‡','Ø¬Ù…Ø¹Ù‡'];
  [$gy,$gm,$gd]=jalali_to_gregorian($jy,$jm,$jd);
  $w=(int)date('w', mktime(0,0,0,$gm,$gd,$gy)); // 0=ÛŒÚ©Ø´Ù†Ø¨Ù‡..6=Ø´Ù†Ø¨Ù‡
  // ØªØ¨Ø¯ÛŒÙ„ Ø¨Ù‡ Ø´Ø§Ø®Øµ Ø´Ù…Ø³ÛŒ: Ø´Ù†Ø¨Ù‡=0
  $map=[0=>1,1=>2,2=>3,3=>4,4=>5,5=>6,6=>0];
  return $names[$map[$w]];
}
// Ú¯Ø²Ø§Ø±Ø´ ØªØ±Ø¯Ø¯ Ø±ÙˆØ²Ø§Ù†Ù‡Ù” ÛŒÚ© Ù¾Ø±Ø³Ù†Ù„ Ø¯Ø± Ø¨Ø§Ø²Ù‡Ù” Ø¬Ù„Ø§Ù„ÛŒ
function _attendance_report($userId,$fromJ,$toJ){
  // Ú¯Ø²Ø§Ø±Ø´ Ø¨Ø§ÛŒØ¯ Ù‡Ù…Ø§Ù† ÙˆØ¶Ø¹ÛŒØª Auto-Close Ø±Ø§ Ú©Ù‡ ØªØ§ÛŒÙ…Ø± Ùˆ Ø«Ø¨Øª ØªØ±Ø¯Ø¯ Ø§Ø³ØªÙØ§Ø¯Ù‡ Ù…ÛŒâ€ŒÚ©Ù†Ù†Ø¯ Ø¨Ø¨ÛŒÙ†Ø¯.
  try { _attendance_auto_close_stale((int)$userId); } catch (Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  try { if (!Db::one("SHOW COLUMNS FROM users WHERE Field='personnel_code'")) Db::run("ALTER TABLE users ADD COLUMN personnel_code VARCHAR(40) NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  try { if (!Db::one("SHOW COLUMNS FROM users WHERE Field='birth_date'")) Db::run("ALTER TABLE users ADD COLUMN birth_date VARCHAR(20) NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  try { if (!Db::one("SHOW COLUMNS FROM users WHERE Field='rank_stars'")) Db::run("ALTER TABLE users ADD COLUMN rank_stars TINYINT NULL"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  $u = Db::one("SELECT id, CONCAT(first_name,' ',last_name) name, COALESCE(NULLIF(personnel_code,''), id) pcode, device_model, work_policy_id FROM users WHERE id=?", [$userId]);
  if(!$u) Http::error('Ù¾Ø±Ø³Ù†Ù„ ÛŒØ§ÙØª Ù†Ø´Ø¯',404);
  // Ø´ÛŒÙØª Ú©Ø§Ø±Ø¨Ø± Ø¯Ø± Ù‡Ø± Ø±ÙˆØ² Ø¬Ø¯Ø§Ú¯Ø§Ù†Ù‡ Ø¨Ø± Ø§Ø³Ø§Ø³ Ø¨Ø§Ø²Ù‡Ù” ØªØ®ØµÛŒØµ ØªØ´Ø®ÛŒØµ Ø¯Ø§Ø¯Ù‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯.
  $shift = null;
  // Ø¨Ø§Ø²Ù‡Ù” ØªØ§Ø±ÛŒØ®â€ŒÙ‡Ø§
  [$fy,$fm,$fd]=array_map('intval',explode('-',str_replace('/','-',$fromJ)));
  [$ty,$tm,$td]=array_map('intval',explode('-',str_replace('/','-',$toJ)));
  $fromTs=j_to_ts(sprintf('%04d-%02d-%02d',$fy,$fm,$fd));
  $toTs  =j_to_ts(sprintf('%04d-%02d-%02d',$ty,$tm,$td));
  if($fromTs===null||$toTs===null) Http::error('Ø¨Ø§Ø²Ù‡Ù” ØªØ§Ø±ÛŒØ® Ù†Ø§Ù…Ø¹ØªØ¨Ø±',400);
  $holidaySet = array_flip(array_column(Db::all("SELECT jdate FROM holidays"),'jdate'));
  // Ø¯Ø±Ø®ÙˆØ§Ø³Øªâ€ŒÙ‡Ø§ÛŒ ØªØ£ÛŒÛŒØ¯Ø´Ø¯Ù‡Ù” Ù…Ø±Ø®ØµÛŒ/Ù…Ø§Ù…ÙˆØ±ÛŒØª Ø¨Ø§ÛŒØ¯ Ù…Ø³ØªÙ‚ÛŒÙ…Ø§Ù‹ Ø¯Ø± Ú¯Ø²Ø§Ø±Ø´ Û²Û¹ Ø³ØªÙˆÙ†Ù‡ Ù…Ù†Ø¹Ú©Ø³ Ø´ÙˆÙ†Ø¯.
  // ØªØ§Ø±ÛŒØ®â€ŒÙ‡Ø§ÛŒ Ù‚Ø¯ÛŒÙ…ÛŒ Ù…Ù…Ú©Ù† Ø§Ø³Øª Ø¨Ø§ Â«/Â» ÛŒØ§ Â«-Â» Ø°Ø®ÛŒØ±Ù‡ Ø´Ø¯Ù‡ Ø¨Ø§Ø´Ù†Ø¯.
  $approvedRequests=[];
  try {
    // Ø¯Ø±Ø®ÙˆØ§Ø³Øªâ€ŒÙ‡Ø§ÛŒ Ú©Ø§Ù…Ù„Ø§Ù‹ ØªÚ©Ø±Ø§Ø±ÛŒ Ù‚Ø¯ÛŒÙ…ÛŒ Ù†Ø¨Ø§ÛŒØ¯ Ø¯Ø± Ú¯Ø²Ø§Ø±Ø´ Ø¯Ùˆ Ø¨Ø±Ø§Ø¨Ø± Ø´ÙˆÙ†Ø¯.
    $reqRows=Db::all("SELECT type,unit,from_jdate,to_jdate,the_date,from_time,to_time,MAX(minutes) AS minutes
      FROM requests
      WHERE user_id=? AND status='approved' AND type IN ('annual','sick','unpaid','mission')
      GROUP BY type,unit,from_jdate,to_jdate,the_date,from_time,to_time",[$userId]);
    $normReqDate=function($v){
      $v=trim(str_replace('/','-',(string)$v));
      if(!preg_match('/^(\\d{4})-(\\d{1,2})-(\\d{1,2})$/',$v,$m)) return null;
      return sprintf('%04d-%02d-%02d',(int)$m[1],(int)$m[2],(int)$m[3]);
    };
    foreach($reqRows as $rr){
      $rf=$normReqDate($rr['from_jdate']??'') ?: $normReqDate($rr['the_date']??'');
      $rt=$normReqDate($rr['to_jdate']??'') ?: $rf;
      if(!$rf||!$rt||$rf>$rt) continue;
      if($rr['unit']==='hourly'){
        $mins=(int)($rr['minutes']??0);
        if($mins<=0 && !empty($rr['from_time']) && !empty($rr['to_time'])){
          [$fh,$fm]=array_map('intval',explode(':',(string)$rr['from_time']));
          [$th,$tm]=array_map('intval',explode(':',(string)$rr['to_time']));
          $mins=max(0,($th*60+$tm)-($fh*60+$fm));
        }
        if($mins>0) $approvedRequests[$rf][$rr['type']]=($approvedRequests[$rf][$rr['type']]??0)+$mins;
      } else {
        $a=j_to_ts($rf); $z=j_to_ts($rt);
        if($a===false||$a===null||$z===false||$z===null||$z<$a) continue;
        $daysCount=max(1,(int)floor(($z-$a)/86400)+1);
        $total=(int)($rr['minutes']??0); if($total<=0) $total=$daysCount*480;
        $base=intdiv($total,$daysCount); $rem=$total%$daysCount; $idx=0;
        for($dts=$a;$dts<=$z;$dts+=86400,$idx++){
          [$ry,$rm,$rd]=gregorian_to_jalali((int)date('Y',$dts),(int)date('n',$dts),(int)date('j',$dts));
          $rk=sprintf('%04d-%02d-%02d',$ry,$rm,$rd);
          $approvedRequests[$rk][$rr['type']]=($approvedRequests[$rk][$rr['type']]??0)+$base+($idx<$rem?1:0);
        }
      }
    }
  } catch(Throwable $e) { error_log('attendance report approved requests: '.$e->getMessage()); }
  $days=[];
  for($ts=$fromTs; $ts<=$toTs; $ts+=86400){
    [$jy,$jm,$jd]=gregorian_to_jalali((int)date('Y',$ts),(int)date('n',$ts),(int)date('j',$ts));
    $jdate=sprintf('%04d/%02d/%02d',$jy,$jm,$jd);
    $jdateDash=sprintf('%04d-%02d-%02d',$jy,$jm,$jd);
    $g=date('Y-m-d',$ts);
    // Ù¾Ø§Ù†Ú†â€ŒÙ‡Ø§ÛŒ Ø§ÛŒÙ† Ø±ÙˆØ²
    $rows=_attendance_rows_for_jdate($userId,$jdateDash);
    $punches=[]; $sessions=[];
    foreach($rows as $r){
      // Ø§Ø¨ØªØ¯Ø§ Ù†Ø§Ù… Ø°Ø®ÛŒØ±Ù‡â€ŒØ´Ø¯Ù‡ØŒ Ø¯Ø± ØºÛŒØ± Ø§ÛŒÙ† ØµÙˆØ±Øª Ø§Ø³ØªØ®Ø±Ø§Ø¬ Ø§Ø² Ù…Ø®ØªØµØ§Øª (Ø¨Ø±Ø§ÛŒ Ø±Ú©ÙˆØ±Ø¯Ù‡Ø§ÛŒ Ù‚Ø¯ÛŒÙ…ÛŒ)
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
      $sessions[]=['in'=>strtotime($r['check_in']),'out'=>$r['check_out']?strtotime($r['check_out']):null,'clip_start'=>strtotime($r['_clip_start'] ?? '1970-01-01 00:00:00'),'clip_end'=>strtotime($r['_clip_end'] ?? '2999-01-01 00:00:00'),'gps_invalid'=>$r['_gps_invalid']??[]];
    }
    $isHol=ShiftCalc::effectiveHoliday($jdateDash);
    $shift = _active_user_shift_assignment($userId, $jdateDash);
    $dr = ($shift && (($shift['type'] ?? '') === 'advanced')) ? _shift_day_row($shift['shift_id'] ?? $shift['id'], $jdateDash) : null;
    $w = $shift ? ShiftCalc::dayWork($shift,$jdateDash,$dr,$sessions,$isHol) : ['worked'=>0,'in_shift'=>0,'expected'=>0,'overtime'=>0,'shortage'=>0,'night'=>0,'late_in'=>0,'early_out'=>0,'surplus'=>0];
    $adj = _attendance_adjusted_overtime($userId,$jdateDash);
    if ($adj > 0) { $use = min($adj, (int)($w['surplus'] ?? 0)); $w['overtime'] = (int)($w['overtime'] ?? 0) + $use; $w['surplus'] = max(0, (int)($w['surplus'] ?? 0) - $use); $w['adjusted_ot'] = $use; }
    $rq=$approvedRequests[$jdateDash]??[];
    $annualLeave=(int)($rq['annual']??0); $sickLeave=(int)($rq['sick']??0); $unpaidLeave=(int)($rq['unpaid']??0); $mission=(int)($rq['mission']??0);
    $approvedExempt=min((int)($w['expected']??0),$annualLeave+$sickLeave+$unpaidLeave);
    if($approvedExempt>0) $w['shortage']=max(0,(int)($w['shortage']??0)-$approvedExempt);
    $hm=fn($m)=>sprintf('%02d:%02d',intdiv(max(0,(int)$m),60),max(0,(int)$m)%60);
    $days[]=[
      'jdate'=>$jdate,
      'weekday'=>_jweekday_name($jy,$jm,$jd),
      'is_holiday'=>$isHol,
      'is_friday'=>(bool)ShiftCalc::isFriday($jdateDash),
      'friday_work'=>$hm($w['friday_work']??$w['friday']??0),
      'holiday_work'=>$hm($w['holiday_work']??$w['holiday']??0),
      'punches'=>$punches,
      'in_shift'=>$hm($w['in_shift'] ?? $w['worked']),       // Ø­Ø¶ÙˆØ± Ø¯Ø± Ø¨Ø§Ø²Ù‡Ù” Ø´ÛŒÙØª
      'worked'=>$hm($w['worked']),
      'expected'=>$hm($w['expected'] ?? 0),
      'late_in'=>$hm($w['late_in'] ?? 0),
      'early_out'=>$hm($w['early_out'] ?? 0),
      'shortage'=>$hm($w['shortage']),
      'night'=>$hm($w['night']??0),
      'overtime'=>$hm($w['overtime']??0),
      'holiday_overtime'=>$hm($w['holiday']??0),
      'friday_overtime'=>$hm($w['friday']??0),
      'total_overtime'=>$hm((int)($w['overtime']??0)+(int)($w['holiday']??0)+(int)($w['friday']??0)),
      'holiday_friday_overtime'=>$hm(($w['holiday']??0)+($w['friday']??0)),
      'friday_workday'=>(int)($w['friday_workday']??0),
      'surplus'=>$hm($w['surplus']??0),
      'adjusted_ot'=>$hm($w['adjusted_ot']??0),
      // ØºÛŒØ¨Øª ÙÙ‚Ø· ÙˆÙ‚ØªÛŒ Ù…Ø¹Ù†Ø§ Ø¯Ø§Ø±Ø¯ Ú©Ù‡ Ø¨Ø±Ø§ÛŒ Ù‡Ù…Ø§Ù† Ø±ÙˆØ² ÙˆØ§Ù‚Ø¹Ø§Ù‹ Ù…ÙˆØ¸ÙÛŒ ÙˆØ¬ÙˆØ¯ Ø¯Ø§Ø´ØªÙ‡ Ø¨Ø§Ø´Ø¯.
      // Ø¬Ù…Ø¹Ù‡/ØªØ¹Ø·ÛŒÙ„/Ø±ÙˆØ² Ø¢Ø²Ø§Ø¯ Ù…ÙˆØ¸ÙÛŒ ØµÙØ± Ø¯Ø§Ø±Ù†Ø¯ Ùˆ Ø­ØªÛŒ Ø¨Ø§ Ù†Ø¨ÙˆØ¯ ØªØ±Ø¯Ø¯ ØºÛŒØ¨Øª Ù†Ù…ÛŒâ€ŒØ³Ø§Ø²Ù†Ø¯.
      'absent'=>(!$punches && !$isHol && !ShiftCalc::isFriday($jdateDash) && (int)($w['expected'] ?? 0)>0 && $approvedExempt<=0)?1:0,
      'absence_shortage'=>$hm((int)($w['shortage']??0)),
      'mission'=>$hm($mission),
      'annual_leave'=>$hm($annualLeave),
      'sick_leave'=>$hm($sickLeave),
      'unpaid_leave'=>$hm($unpaidLeave),
    ];
  }
  return ['user'=>$u,'shift'=>$shift?['title'=>$shift['title']]:null,'from'=>$fromJ,'to'=>$toJ,'days'=>$days];
}
route('GET', '/api/admin/attendance-report', function($p,$b,$u){
  $uid=(int)($_GET['user_id']??0);
  $from=trim($_GET['from']??''); $to=trim($_GET['to']??'');
  if(!$uid||!$from||!$to) Http::error('Ù¾Ø±Ø³Ù†Ù„ Ùˆ Ø¨Ø§Ø²Ù‡Ù” ØªØ§Ø±ÛŒØ® Ø±Ø§ Ù…Ø´Ø®Øµ Ú©Ù†ÛŒØ¯',400);
  require_once __DIR__.'/../app/api/admin-attendance-report-owned.php';
  return attendance_report_owned_by_entry_date($uid,$from,$to);
}, false, ADMIN);

route('GET', '/api/admin/seniority', function($p,$b,$u){
  return Seniority::listRows();
}, false, ADMIN);
route('POST', '/api/admin/seniority/export', function($p,$b,$u){
  $ids=$b['user_ids']??null;
  if (!is_array($ids)||!$ids||count($ids)>10000) Http::error('ÙÙ‡Ø±Ø³Øª Ù¾Ø±Ø³Ù†Ù„ Ø¨Ø±Ø§ÛŒ Ø®Ø±ÙˆØ¬ÛŒ Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª.',422);
  $selected=[];
  foreach($ids as $id) {
    if (filter_var($id,FILTER_VALIDATE_INT)===false||(int)$id<1) Http::error('Ø´Ù†Ø§Ø³Ù‡ Ù¾Ø±Ø³Ù†Ù„ Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª.',422);
    $selected[(int)$id]=true;
  }
  $data=Seniority::listRows();
  if (($b['period']??'')!==$data['period']) Http::error('Ù…Ø§Ù‡ Ø¬Ø§Ø±ÛŒ ØªØºÛŒÛŒØ± Ú©Ø±Ø¯Ù‡ Ø§Ø³ØªØ› ÙÙ‡Ø±Ø³Øª Ø±Ø§ Ø¨Ø§Ø²Ø®ÙˆØ§Ù†ÛŒ Ú©Ù†ÛŒØ¯.',409);
  $rows=array_values(array_filter($data['rows'],fn($row)=>isset($selected[(int)$row['id']])));
  if (count($rows)!==count($selected)) Http::error('Ø¨Ø¹Ø¶ÛŒ Ù¾Ø±Ø³Ù†Ù„ Ø¯ÛŒÚ¯Ø± Ø¯Ø± ÙÙ‡Ø±Ø³Øª Ù…ÙˆØ¬ÙˆØ¯ Ù†ÛŒØ³ØªÙ†Ø¯Ø› ØµÙØ­Ù‡ Ø±Ø§ Ø¨Ø§Ø²Ø®ÙˆØ§Ù†ÛŒ Ú©Ù†ÛŒØ¯.',409);
  Seniority::exportWorkbook($rows,$data['period'])->output('seniority-'.$data['period'].'.xlsx','Ø³Ù†ÙˆØ§Øª Ù†ÛŒØ±ÙˆÙ‡Ø§');
}, false, ADMIN);
route('PUT', '/api/admin/seniority/{id}', function($p,$b,$u){
  return Seniority::save((int)$p['id'],$b,(int)$u['id']);
}, false, ADMIN);
route('POST', '/api/admin/seniority/{id}/recalculate', function($p,$b,$u){
  return Seniority::recalculate((int)$p['id'],(int)$u['id'],(string)($b['period']??''));
}, false, ADMIN);
route('GET', '/api/admin/seniority/{id}/history', function($p,$b,$u){
  Seniority::ensureSchema();
  return ['rows'=>Db::all('SELECT h.*,CONCAT(u.first_name,\' \',u.last_name) actor_name FROM personnel_seniority_history h LEFT JOIN users u ON u.id=h.actor_id WHERE h.user_id=? ORDER BY h.id DESC LIMIT 200',[(int)$p['id']])];
}, false, ADMIN);


route('POST', '/api/admin/attendance-surplus/convert', function($p,$b,$u){
  _ensure_attendance_phase1_schema();
  $uid=(int)($b['user_id']??0); $jdate=str_replace('/','-',trim((string)($b['jdate']??''))); $min=max(0,(int)($b['minutes']??0));
  if(!$uid||!preg_match('/^\d{4}-\d{2}-\d{2}$/',$jdate)) Http::error('Ú©Ø§Ø±Ø¨Ø± Ùˆ ØªØ§Ø±ÛŒØ® Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª',422);
  Db::run("INSERT INTO attendance_ot_adjustments(user_id,jdate,minutes,reason,approved_by) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE minutes=VALUES(minutes), reason=VALUES(reason), approved_by=VALUES(approved_by), created_at=NOW()", [$uid,$jdate,$min,$b['reason']??null,$u['id']]);
  return ['ok'=>true,'user_id'=>$uid,'jdate'=>$jdate,'minutes'=>$min];
}, false, ADMIN);

route('POST', '/api/admin/attendance-surplus/reset', function($p,$b,$u){
  _ensure_attendance_phase1_schema();
  $uid=(int)($b['user_id']??0); $jdate=str_replace('/','-',trim((string)($b['jdate']??'')));
  if(!$uid||!preg_match('/^\d{4}-\d{2}-\d{2}$/',$jdate)) Http::error('Ú©Ø§Ø±Ø¨Ø± Ùˆ ØªØ§Ø±ÛŒØ® Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª',422);
  Db::run("DELETE FROM attendance_ot_adjustments WHERE user_id=? AND jdate=?", [$uid,$jdate]);
  return ['ok'=>true,'user_id'=>$uid,'jdate'=>$jdate,'minutes'=>0];
}, false, ADMIN);

route('GET', '/api/admin/attendance-surplus/list', function($p,$b,$u){
  $uid=(int)($_GET['user_id']??0); $from=trim($_GET['from']??''); $to=trim($_GET['to']??'');
  if(!$uid||!$from||!$to) Http::error('Ù¾Ø±Ø³Ù†Ù„ Ùˆ Ø¨Ø§Ø²Ù‡Ù” ØªØ§Ø±ÛŒØ® Ø±Ø§ Ù…Ø´Ø®Øµ Ú©Ù†ÛŒØ¯',400);
  $rep=_attendance_report($uid,$from,$to);
  $rows=[];
  foreach(($rep['days']??[]) as $d){ if(($d['surplus']??'00:00')!=='00:00' || ($d['adjusted_ot']??'00:00')!=='00:00') $rows[]=$d; }
  return ['user'=>$rep['user'],'from'=>$from,'to'=>$to,'rows'=>$rows];
}, false, ADMIN);

// ÙˆÛŒØ±Ø§ÛŒØ´ Ø³Ø§Ø¹Øª ÙˆØ±ÙˆØ¯/Ø®Ø±ÙˆØ¬ ÛŒÚ© Ù¾Ø§Ù†Ú† ØªÙˆØ³Ø· Ø§Ø¯Ù…ÛŒÙ†
route('PUT', '/api/admin/attendance-punch/{id}', function($p,$b,$u){
  $id=(int)$p['id'];
  $row=Db::one("SELECT id, check_in, check_out FROM staff_attendance WHERE id=?", [$id]);
  if(!$row) Http::error('Ø±Ú©ÙˆØ±Ø¯ ØªØ±Ø¯Ø¯ ÛŒØ§ÙØª Ù†Ø´Ø¯',404);
  $inT=trim($b['check_in']??'');   // ÙØ±Ù…Øª HH:MM ÛŒØ§ Ø®Ø§Ù„ÛŒ
  $outT=trim($b['check_out']??'');
  $newJdate=trim((string)($b['jdate']??''));
  $set=[]; $args=[];
  // ØªØ§Ø±ÛŒØ® Ù…Ø¨Ù†Ø§ Ø§Ø² check_in ÙØ¹Ù„ÛŒØ› Ø¯Ø± ØµÙˆØ±Øª Ø§Ø±Ø³Ø§Ù„ jdateØŒ ØªØ§Ø±ÛŒØ® Ø´Ù…Ø³ÛŒ Ø¬Ø¯ÛŒØ¯ Ø§Ø¹Ù…Ø§Ù„ Ù…ÛŒâ€ŒØ´ÙˆØ¯.
  $baseDate = date('Y-m-d', strtotime($row['check_in']));
  if ($newJdate!=='') {
    $jp=preg_split('/[\/-]/',$newJdate);
    if (count($jp)!==3 || !preg_match('/^\d{4}$/',$jp[0]) || !preg_match('/^\d{1,2}$/',$jp[1]) || !preg_match('/^\d{1,2}$/',$jp[2])) Http::error('ÙØ±Ù…Øª ØªØ§Ø±ÛŒØ® Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª',422);
    [$jy,$jm,$jd]=array_map('intval',$jp);
    if ($jm<1||$jm>12||$jd<1||$jd>31) Http::error('ØªØ§Ø±ÛŒØ® Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª',422);
    [$gy,$gm,$gd]=jalali_to_gregorian($jy,$jm,$jd);
    $baseDate=sprintf('%04d-%02d-%02d',$gy,$gm,$gd);
  }
  if($inT!==''){
    if(!preg_match('/^\d{1,2}:\d{2}$/',$inT)) Http::error('ÙØ±Ù…Øª Ø³Ø§Ø¹Øª ÙˆØ±ÙˆØ¯ Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª (HH:MM)',422);
    $set[]="check_in=?"; $args[]="$baseDate $inT:00";
  }
  if(array_key_exists('check_out',$b)){
    if($outT===''){ $set[]="check_out=NULL"; }
    else {
      if(!preg_match('/^\d{1,2}:\d{2}$/',$outT)) Http::error('ÙØ±Ù…Øª Ø³Ø§Ø¹Øª Ø®Ø±ÙˆØ¬ Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª (HH:MM)',422);
      // Ø§Ú¯Ø± Ø®Ø±ÙˆØ¬ Ú©ÙˆÚ†Ú©â€ŒØªØ± Ø§Ø² ÙˆØ±ÙˆØ¯ Ø¨ÙˆØ¯ØŒ Ø±ÙˆØ² Ø¨Ø¹Ø¯ (Ø´ÛŒÙØª Ø´Ø¨)
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

// Ø­Ø°Ù ÛŒÚ© Ù¾Ø§Ù†Ú†
route('DELETE', '/api/admin/attendance-punch/{id}', function($p,$b,$u){
  Db::run("DELETE FROM staff_attendance WHERE id=?", [(int)$p['id']]);
  return ['ok'=>true];
}, false, ADMIN);

// Ø§ÙØ²ÙˆØ¯Ù† ØªØ±Ø¯Ø¯ Ø¯Ø³ØªÛŒ ØªÙˆØ³Ø· Ø§Ø¯Ù…ÛŒÙ† (ÙˆØ±ÙˆØ¯/Ø®Ø±ÙˆØ¬ Ø¯Ø± ÛŒÚ© ØªØ§Ø±ÛŒØ® Ù…Ø´Ø®Øµ)
route('POST', '/api/admin/attendance-punch', function($p,$b,$u){
  $uid=(int)($b['user_id']??0);
  $jdate=trim($b['jdate']??''); // 1405/04/01
  $inT=trim($b['check_in']??''); $outT=trim($b['check_out']??'');
  $lineId=(int)($b['line_id']??0) ?: null;
  if(!$uid||!$jdate||$inT==='') Http::error('Ù¾Ø±Ø³Ù†Ù„ØŒ ØªØ§Ø±ÛŒØ® Ùˆ Ø³Ø§Ø¹Øª ÙˆØ±ÙˆØ¯ Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª',422);
  [$jy,$jm,$jd]=array_map('intval',explode('/',str_replace('-','/',$jdate)));
  [$gy,$gm,$gd]=jalali_to_gregorian($jy,$jm,$jd);
  $base=sprintf('%04d-%02d-%02d',$gy,$gm,$gd);
  if(!preg_match('/^\d{1,2}:\d{2}$/',$inT)) Http::error('ÙØ±Ù…Øª Ø³Ø§Ø¹Øª ÙˆØ±ÙˆØ¯ Ù†Ø§Ù…Ø¹ØªØ¨Ø±',422);
  $ci="$base $inT:00"; $co=null;
  if($outT!==''){
    if(!preg_match('/^\d{1,2}:\d{2}$/',$outT)) Http::error('ÙØ±Ù…Øª Ø³Ø§Ø¹Øª Ø®Ø±ÙˆØ¬ Ù†Ø§Ù…Ø¹ØªØ¨Ø±',422);
    $coTs=strtotime("$base $outT:00"); if($coTs<strtotime($ci)) $coTs+=86400;
    $co=date('Y-m-d H:i:s',$coTs);
  }
  $id=Db::insert("INSERT INTO staff_attendance(user_id,line_id,method,check_in,check_out) VALUES(?,?,'manual',?,?)",[$uid,$lineId,$ci,$co]);
  return ['id'=>$id,'ok'=>true];
}, false, ADMIN);

route('GET', '/api/admin/shift-report/export', function($p,$b,$u){
  _monthly_work_report_need($u);
  $jy=(int)($_GET['year']??0); $jm=(int)($_GET['month']??0);
  if (!$jy||!$jm) Http::error('Ø³Ø§Ù„ Ùˆ Ù…Ø§Ù‡ Ø±Ø§ Ù…Ø´Ø®Øµ Ú©Ù†ÛŒØ¯',400);
  $rows=_work_month_rows($jy,$jm);
  $hm=fn($m)=>sprintf('%02d:%02d',intdiv(max(0,(int)$m),60),max(0,(int)$m)%60);
  $headers=['Ù†Ø§Ù… Ùˆ Ù†Ø§Ù… Ø®Ø§Ù†ÙˆØ§Ø¯Ú¯ÛŒ','Ù…ÙˆØ¸ÙÛŒ','Ø­Ø¶ÙˆØ± Ú©Ù„','Ø­Ø¶ÙˆØ± Ø¯Ø± Ø´ÛŒÙØª','ØªØ§Ø®ÛŒØ± ÙˆØ±ÙˆØ¯','ØªØ¹Ø¬ÛŒÙ„ Ø®Ø±ÙˆØ¬','Ú©Ø³Ø±ÛŒ Ú©Ø§Ø±','ØºÛŒØ¨Øª','Ø¬Ù…Ø¹ ØºÛŒØ¨Øª Ùˆ Ú©Ø³Ø±ÛŒ Ú©Ø§Ø±','Ø´Ø¨ Ú©Ø§Ø±ÛŒ','Ø§Ø¶Ø§ÙÙ‡ Ú©Ø§Ø±ÛŒ','Ù…Ø§Ø²Ø§Ø¯ Ø­Ø¶ÙˆØ±','Ø¬Ù…Ø¹Ù‡ Ú©Ø§Ø±ÛŒ','ØªØ¹Ø·ÛŒÙ„ Ú©Ø§Ø±ÛŒ','Ù…Ø§Ù…ÙˆØ±ÛŒØª','Ù…Ø±Ø®ØµÛŒ Ø§Ø³ØªØ­Ù‚Ø§Ù‚ÛŒ','Ù…Ø±Ø®ØµÛŒ Ø§Ø³ØªØ¹Ù„Ø§Ø¬ÛŒ'];
  $xw=new XlsxWriter($headers);
  $widths=[30,13,14,16,13,13,13,12,20,13,14,14,14,14,14,17,17];
  $xw->setProfessionalStyle(true);
  $xw->setReportHeading('Ú¯Ø²Ø§Ø±Ø´ Ú©Ø§Ø±Ú©Ø±Ø¯ Ù…Ø§Ù‡Ø§Ù†Ù‡ Ù¾Ø±Ø³Ù†Ù„ Ù€ Ø³Ø§Ø²Ù…Ø§Ù† Ù…Ø¯ÛŒØ±ÛŒØª Ùˆ Ù†Ø¸Ø§Ø±Øª Ø¨Ø± ØªØ§Ú©Ø³ÛŒØ±Ø§Ù†ÛŒ Ø´Ù‡Ø±Ø¯Ø§Ø±ÛŒ Ù…Ø´Ù‡Ø¯', 'Ø¯ÙˆØ±Ù‡: '.sprintf('%04d/%02d',$jy,$jm).'  |  ØªØ¹Ø¯Ø§Ø¯ Ù†ÛŒØ±ÙˆÙ‡Ø§: '.count($rows), 'Ø³Ø§Ø¹Ø§Øª Ø¨Ù‡ Ù‚Ø§Ù„Ø¨ Ø³Ø§Ø¹Øª:Ø¯Ù‚ÛŒÙ‚Ù‡Ø› Ø¬Ù…Ø¹Ù‡â€ŒÚ©Ø§Ø±ÛŒ Ùˆ ØªØ¹Ø·ÛŒÙ„â€ŒÚ©Ø§Ø±ÛŒ Ø§Ø² Ø§Ø¶Ø§ÙÙ‡â€ŒÚ©Ø§Ø±ÛŒ Ø¹Ø§Ø¯ÛŒ Ù…Ø³ØªÙ‚Ù„ Ù‡Ø³ØªÙ†Ø¯.');
  $xw->setHeaderGroup(1,3,'Ø­Ø¶ÙˆØ± Ùˆ Ù…ÙˆØ¸ÙÛŒ');
  $xw->setHeaderGroup(4,8,'Ú©Ø³Ø±ÛŒ Ùˆ ØºÛŒØ¨Øª');
  $xw->setHeaderGroup(9,13,'Ú©Ø§Ø±Ú©Ø±Ø¯ ÙˆÛŒÚ˜Ù‡ Ùˆ Ø§Ø¶Ø§ÙÙ‡â€ŒÚ©Ø§Ø±ÛŒ');
  $xw->setHeaderGroup(14,16,'Ø¯Ø±Ø®ÙˆØ§Ø³Øªâ€ŒÙ‡Ø§ÛŒ ØªØ£ÛŒÛŒØ¯Ø´Ø¯Ù‡');
  foreach($widths as $i=>$w) $xw->setColWidth($i,$w);
  foreach($rows as $r){
    $gh=($r['absent_min']??0)+($r['shortage']??0);
    $xw->addRow([
      $r['name'],
      $hm($r['expected']),
      $hm($r['worked']),
      $hm($r['in_shift']??$r['worked']),
      $hm($r['late_in']??0),
      $hm($r['early_out']??0),
      $hm($r['shortage']),
      $hm($r['absent_min']??0),
      $hm($gh),
      $hm($r['night']),
      $hm($r['regular_overtime']??$r['overtime']),
      $hm($r['surplus']??0),
      $hm($r['friday']??0),
      $hm($r['holiday']??0),
      $hm($r['mission_min']??0),
      $hm($r['annual_min']??0),
      $hm($r['sick_min']??0)
    ]);
  }
  $xw->output('Ú©Ø§Ø±Ú©Ø±Ø¯_'.$jy.'_'.$jm.'.xlsx','Ú©Ø§Ø±Ú©Ø±Ø¯ Ù…Ø§Ù‡Ø§Ù†Ù‡');
}, false, ADMIN);

// Ø®Ø±ÙˆØ¬ÛŒ Ù…Ø³ØªÙ‚Ù„ Ú©Ø§Ø±Ú©Ø±Ø¯ Ø¬Ù‡Øª Ø§Ø±Ø³Ø§Ù„ Ø¨Ù‡ Ø³Ø§Ø²Ù…Ø§Ù†Ø› Ù‡ÛŒÚ† Ø±Ú©ÙˆØ±Ø¯ ØªØ±Ø¯Ø¯ ÛŒØ§ Ù…Ø­Ø§Ø³Ø¨Ù‡ Ù¾Ø§ÛŒÙ‡â€ŒØ§ÛŒ Ø±Ø§ ØªØºÛŒÛŒØ± Ù†Ù…ÛŒâ€ŒØ¯Ù‡Ø¯.
route('GET','/api/admin/shift-report/organization-export',function($p,$b,$u){
  _monthly_work_report_need($u);
  $jy=(int)($_GET['year']??0); $jm=(int)($_GET['month']??0);
  if($jy<1300||$jy>1500||$jm<1||$jm>12)Http::error('Ù…Ø§Ù‡ Ùˆ Ø³Ø§Ù„ Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª',422);
  $final=_final_work_month($jy,$jm);
  $rows=_work_only_active_users($final?_work_snapshot_decode($final['monthly_json']):_shift_month_report($jy,$jm));
  $byId=$final?null:_work_month_people();
  $daily=$final?_work_snapshot_decode($final['daily_json']):[];
  // Forecast is an export-only overlay. Never mutate the canonical work report or finalized snapshots.
  $forecastRequested=($_GET['forecast_remaining']??'0')==='1';
  $includeSurplus=($_GET['include_surplus']??'0')==='1';
  $forecastByUser=[];
  if($forecastRequested&&!$final){
    [$cy,$cm,$cd]=gregorian_to_jalali((int)date('Y'),(int)date('n'),(int)date('j'));
    $todayJ=sprintf('%04d-%02d-%02d',$cy,$cm,$cd);
    $firstJ=sprintf('%04d-%02d-01',$jy,$jm);
    $endJ=sprintf('%04d-%02d-%02d',$jy,$jm,ShiftCalc::jMonthDays($jy,$jm));
    if($firstJ<=$todayJ&&$todayJ<$endJ){
      $monthStartTs=ShiftCalc::jdateToTs($firstJ);
      $todayTs=ShiftCalc::jdateToTs($todayJ);
      $monthEndTs=ShiftCalc::jdateToTs($endJ);
      // Exclude approved leave dates from the historical average denominator per employee.
      $approved=Db::all("SELECT user_id,from_jdate,to_jdate,the_date,type FROM requests WHERE status='approved' AND type IN ('annual','sick','unpaid') AND ((from_jdate IS NOT NULL AND from_jdate <= ? AND COALESCE(to_jdate,from_jdate) >= ?) OR (the_date BETWEEN ? AND ?))",[$endJ,$firstJ,$firstJ,$endJ]);
      $leaveByUser=[];
      foreach($approved as $leave){
        $from=ShiftCalc::normJdate($leave['from_jdate']??'')?:ShiftCalc::normJdate($leave['the_date']??'');
        $to=ShiftCalc::normJdate($leave['to_jdate']??'')?:ShiftCalc::normJdate($leave['the_date']??'')?:$from;
        if(!$from||!$to)continue;
        $uid=(int)$leave['user_id'];
        for($ts=max($monthStartTs,ShiftCalc::jdateToTs($from));$ts<=min($monthEndTs,ShiftCalc::jdateToTs($to));$ts+=86400){
          [$y,$m,$d]=gregorian_to_jalali((int)date('Y',$ts),(int)date('n',$ts),(int)date('j',$ts));
          $leaveByUser[$uid][sprintf('%04d-%02d-%02d',$y,$m,$d)]=true;
        }
      }
      foreach($rows as $r){
        $uid=(int)($r['user_id']??0);
        if($uid<=0)continue;
        // Build the employee-specific average from actual completed prior workdays,
        // not from a calendar-day denominator or monthly totals containing holiday overtime.
        $priorOvertime=0;$workedDays=0;
        for($ts=$monthStartTs;$ts<$todayTs;$ts+=86400){
          [$py,$pm,$pd]=gregorian_to_jalali((int)date('Y',$ts),(int)date('n',$ts),(int)date('j',$ts));
          $pj=sprintf('%04d-%02d-%02d',$py,$pm,$pd);
          if(isset($leaveByUser[$uid][$pj])||(int)date('w',$ts)===5||ShiftCalc::effectiveHoliday($pj))continue;
          $dayShift=_active_user_shift_assignment($uid,$pj);
          if(!$dayShift)continue;
          $dr=(($dayShift['type']??'')==='advanced')?_shift_day_row($dayShift['shift_id']??$dayShift['id'],$pj):null;
          $dayRows=_attendance_rows_for_jdate($uid,$pj);
          if(!$dayRows)continue; // only the employee's actually worked days
          $sessions=array_map(static fn($a)=>[
            'in'=>strtotime($a['check_in']),
            'out'=>!empty($a['check_out'])?strtotime($a['check_out']):null,
            'clip_start'=>strtotime($a['_clip_start']??'1970-01-01 00:00:00'),
            'clip_end'=>strtotime($a['_clip_end']??'2999-01-01 00:00:00'),
            'gps_invalid'=>$a['_gps_invalid']??[]
          ],$dayRows);
          $dayWork=ShiftCalc::dayWork($dayShift,$pj,$dr,$sessions,false);
          if((int)($dayWork['worked']??0)<=0)continue;
          $extra=max(0,(int)($dayWork['overtime']??0));
          $extra+=($includeSurplus?max(0,(int)($dayWork['surplus']??0)):min(max(0,(int)($dayWork['surplus']??0)),max(0,(int)_attendance_adjusted_overtime($uid,$pj))));
          $priorOvertime+=$extra;
          $workedDays++;
        }
        $dailyOt=$workedDays>0?$priorOvertime/$workedDays:0;
        $futureOt=0;$futureHoliday=0;$futureWorkCount=0;$futureHolidayCount=0;
        for($ts=$todayTs;$ts<=$monthEndTs;$ts+=86400){
          [$y,$m,$d]=gregorian_to_jalali((int)date('Y',$ts),(int)date('n',$ts),(int)date('j',$ts));
          $j=sprintf('%04d-%02d-%02d',$y,$m,$d);
          if(isset($leaveByUser[$uid][$j]))continue;
          if((int)date('w',$ts)===5||ShiftCalc::effectiveHoliday($j)){$futureHoliday+=480;$futureHolidayCount++;}
          else{$futureOt+=$dailyOt;$futureWorkCount++;}
        }
        $forecastByUser[$uid]=['overtime'=>(int)round($futureOt),'holiday'=>$futureHoliday,'work_days'=>$futureWorkCount,'holiday_days'=>$futureHolidayCount,'daily_overtime'=>(int)round($dailyOt),'sample_days'=>$workedDays];
      }
    }
  }

  $headers=['Ø±Ø¯ÛŒÙ','Ù…Ø­Ù„ Ø®Ø¯Ù…Øª','Ø³Ù…Øª','Ø±Ø¯ÛŒÙ Ú¯Ø±ÙˆÙ‡','Ù†Ø§Ù…','Ù†Ø§Ù… Ø®Ø§Ù†ÙˆØ§Ø¯Ú¯ÛŒ','Ø´Ù…Ø§Ø±Ù‡ Ù¾Ø±Ø³Ù†Ù„ÛŒ','Ø³Ø§Ø¹Øª Ø¬Ù…Ø¹Ù‡ Ú©Ø§Ø±ÛŒ (Ø§Ø±Ø³Ø§Ù„ÛŒ)','Ø³Ø§Ø¹Øª ØªØ¹Ø·ÛŒÙ„ Ú©Ø§Ø±ÛŒ (Ø§Ø±Ø³Ø§Ù„ÛŒ)','Ø§Ø¶Ø§ÙÙ‡ Ú©Ø§Ø±ÛŒ (Ø§Ø±Ø³Ø§Ù„ÛŒ)'];
  $xw=new XlsxWriter($headers);$xw->setProfessionalStyle(true);
  $months=['ÙØ±ÙˆØ±Ø¯ÛŒÙ†','Ø§Ø±Ø¯ÛŒØ¨Ù‡Ø´Øª','Ø®Ø±Ø¯Ø§Ø¯','ØªÛŒØ±','Ù…Ø±Ø¯Ø§Ø¯','Ø´Ù‡Ø±ÛŒÙˆØ±','Ù…Ù‡Ø±','Ø¢Ø¨Ø§Ù†','Ø¢Ø°Ø±','Ø¯ÛŒ','Ø¨Ù‡Ù…Ù†','Ø§Ø³ÙÙ†Ø¯'];
  $xw->setReportHeading('ØµÙˆØ±Øª ÙˆØ¶Ø¹ÛŒØª Ø§Ø¶Ø§ÙÙ‡â€ŒÚ©Ø§Ø±ÛŒ Ù¾Ø±Ø³Ù†Ù„ Ù…Ø¯ÛŒØ±ÛŒØª Ù¾ÛŒÙ…Ø§Ù† Ø®Ø·ÙˆØ· ØªØ§Ú©Ø³ÛŒØ±Ø§Ù†ÛŒ Ø´Ù‡Ø± Ù…Ø´Ù‡Ø¯ Ù…Ù‚Ø¯Ø³',($months[$jm-1]??'').' '.$jy,'');
  foreach([9,27,36,12,20,25,18,22,22,22] as $i=>$w)$xw->setColWidth($i,$w);
  $xw->setTextCol(6);
  $hm=static fn($m)=>sprintf('%02d:%02d',intdiv(abs((int)$m),60),abs((int)$m)%60);
  $i=0;foreach($rows as $r){
    $person=_work_organization_person($r,$byId,$daily);
    $o=(int)($r['regular_overtime']??0);$mission=(int)($r['mission_min']??0);$short=(int)($r['shortage']??0);
    $fri=(int)($r['friday']??0);$hol=(int)($r['holiday']??0);
    $forecast=$forecastByUser[(int)($r['user_id']??0)]??['overtime'=>0,'holiday'=>0,'work_days'=>0,'holiday_days'=>0,'daily_overtime'=>0,'sample_days'=>0];
    $surplusIncluded=$includeSurplus?max(0,(int)($r['surplus']??0)):0;
    $net=$o+$surplusIncluded+$mission-$short+(int)$forecast['overtime'];
    $hol+=(int)$forecast['holiday'];
    $i++;$row=$xw->addRow([$i,(string)($person['zone_name']??''),($r['role']??''),$i,$person['first_name']??'', $person['last_name']??'',(string)($person['personnel_code']??''),round($fri/60,6),round($hol/60,6),round($net/60,6)]);
    $xw->setComment($row,7,'Ø¬Ù…Ø¹Ù‡â€ŒÚ©Ø§Ø±ÛŒ Ù‚Ø·Ø¹ÛŒ: '.$hm($fri).' Ø³Ø§Ø¹Øª'."\n".'ÙÙ‚Ø· Ø­Ø¶ÙˆØ± Ù…Ø¹ØªØ¨Ø± Ø±ÙˆØ²Ù‡Ø§ÛŒ Ø¬Ù…Ø¹Ù‡Ø› Ø±ÙˆØ² Ø¬Ù…Ø¹Ù‡ Ø­ØªÛŒ Ø¯Ø± ØµÙˆØ±Øª ØªØ¹Ø·ÛŒÙ„ÛŒ Ø±Ø³Ù…ÛŒ Ø¯Ø± Ø³ØªÙˆÙ† ØªØ¹Ø·ÛŒÙ„â€ŒÚ©Ø§Ø±ÛŒ Ø«Ø¨Øª Ù†Ù…ÛŒâ€ŒØ´ÙˆØ¯.'."\n".'Ø§ÛŒÙ† Ù…Ù‚Ø¯Ø§Ø± Ø¯Ø± Ø§Ø¶Ø§ÙÙ‡â€ŒÚ©Ø§Ø±ÛŒ Ø¹Ø§Ø¯ÛŒ Ø³ØªÙˆÙ† Û¹ Ø¯ÙˆØ¨Ø§Ø±Ù‡ Ù„Ø­Ø§Ø¸ Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª.');
    $xw->setComment($row,8,'ØªØ¹Ø·ÛŒÙ„â€ŒÚ©Ø§Ø±ÛŒ Ù‚Ø·Ø¹ÛŒ (Ø¨Ù‡â€ŒØ¬Ø² Ø¬Ù…Ø¹Ù‡): '.$hm((int)($r['holiday']??0)).' Ø³Ø§Ø¹Øª'."\n".'Ù¾ÛŒØ´â€ŒØ¨ÛŒÙ†ÛŒ ØªØ¹Ø·ÛŒÙ„â€ŒÚ©Ø§Ø±ÛŒ Ø±ÙˆØ²Ù‡Ø§ÛŒ ØºÛŒØ±Ø¬Ù…Ø¹Ù‡: '.$hm($forecast['holiday']).' Ø³Ø§Ø¹Øª'."\n".'Ø¬Ù…Ø¹ Ù‚Ø§Ø¨Ù„ Ù†Ù…Ø§ÛŒØ´: '.$hm($hol).' Ø³Ø§Ø¹ØªØ› Ø¬Ù…Ø¹Ù‡â€ŒÙ‡Ø§ Ø¯Ø± Ø§ÛŒÙ† Ø³ØªÙˆÙ† Ù…Ù†Ø¸ÙˆØ± Ù†Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯.');
    $xw->setComment($row,9,'Ø§Ø¶Ø§ÙÙ‡â€ŒÚ©Ø§Ø±ÛŒ Ø¹Ø§Ø¯ÛŒ: '.$hm($o).' Ø³Ø§Ø¹Øª'."\n".'Ù…Ø§Ø²Ø§Ø¯ Ø­Ø¶ÙˆØ± Ù…Ù†Ø¸ÙˆØ±Ø´Ø¯Ù‡: '.$hm($surplusIncluded).' Ø³Ø§Ø¹Øª'."\n".'Ù…Ø£Ù…ÙˆØ±ÛŒØª: '.$hm($mission).' Ø³Ø§Ø¹Øª'."\n".'Ú©Ø³Ø±ÛŒ Ú©Ø§Ø± Ú©Ø³Ø±Ø´Ø¯Ù‡: '.$hm($short).' Ø³Ø§Ø¹Øª'."\n".'Ù¾ÛŒØ´â€ŒØ¨ÛŒÙ†ÛŒ Ø§Ø¶Ø§ÙÙ‡â€ŒÚ©Ø§Ø±ÛŒ Ø¹Ø§Ø¯ÛŒ: '.$hm($forecast['overtime']).' Ø³Ø§Ø¹Øª'."\n".'Ø¬Ù…Ø¹ Ù†Ù‡Ø§ÛŒÛŒ Ø§ÛŒÙ† Ø³ØªÙˆÙ† (Ø¨Ø¯ÙˆÙ† Ø¬Ù…Ø¹Ù‡â€ŒÚ©Ø§Ø±ÛŒ Ùˆ ØªØ¹Ø·ÛŒÙ„â€ŒÚ©Ø§Ø±ÛŒ): '.($net<0?'-':'').$hm($net).' Ø³Ø§Ø¹Øª');
  }
  $xw->output('organization-work-'.$jy.'-'.$jm.'.xlsx','Ú©Ø§Ø±Ú©Ø±Ø¯ Ø³Ø§Ø²Ù…Ø§Ù†');
},false,ADMIN);

// ÙØ±Ø§Ø®ÙˆØ§Ù† Ø®ÙˆØ¯Ú©Ø§Ø± ØªØ¹Ø·ÛŒÙ„Ø§Øª Ø±Ø³Ù…ÛŒ ÛŒÚ© Ù…Ø§Ù‡ Ø§Ø² Ø³Ø±ÙˆÛŒØ³ holidayapi.ir (Ø´Ù…Ø³ÛŒ)
route('POST', '/api/admin/holidays/fetch', function($p,$b,$u){
  $jy = (int)($b['year'] ?? 0); $jm = (int)($b['month'] ?? 0);
  if (!$jy || !$jm) Http::error('Ø³Ø§Ù„ Ùˆ Ù…Ø§Ù‡ Ø´Ù…Ø³ÛŒ Ø±Ø§ Ù…Ø´Ø®Øµ Ú©Ù†ÛŒØ¯', 400);
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
        $title = mb_substr(implode('ØŒ ', array_filter($titles)), 0, 140);
      }
      $jdate = sprintf('%04d-%02d-%02d', $jy, $jm, $d);
      Db::run("INSERT INTO holidays(jdate,title) VALUES(?,?) ON DUPLICATE KEY UPDATE title=VALUES(title)", [$jdate, $title ?: 'ØªØ¹Ø·ÛŒÙ„ Ø±Ø³Ù…ÛŒ']);
      $added++;
    }
  }
  if ($checked === 0) Http::error('Ø§ØªØµØ§Ù„ Ø¨Ù‡ Ø³Ø±ÙˆÛŒØ³ ØªÙ‚ÙˆÛŒÙ… Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯. Ù…Ù…Ú©Ù† Ø§Ø³Øª Ø³Ø±ÙˆØ± Ø¨Ù‡ Ø§ÛŒÙ†ØªØ±Ù†Øª Ø¯Ø³ØªØ±Ø³ÛŒ Ù†Ø¯Ø§Ø´ØªÙ‡ Ø¨Ø§Ø´Ø¯Ø› Ù…ÛŒâ€ŒØªÙˆØ§Ù†ÛŒØ¯ ØªØ¹Ø·ÛŒÙ„Ø§Øª Ø±Ø§ Ø¯Ø³ØªÛŒ ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯.', 502);
  return ['ok'=>true, 'added'=>$added, 'checked'=>$checked];
}, false, ADMIN);

// ==================== Ø¯Ø±Ø®ÙˆØ§Ø³Øªâ€ŒÙ‡Ø§ (Ù…Ø±Ø®ØµÛŒ/Ù…Ø§Ù…ÙˆØ±ÛŒØª/Ø§Ø¶Ø§ÙÙ‡â€ŒÚ©Ø§Ø±/ØªØ±Ø¯Ø¯ Ø¯Ø³ØªÛŒ) ====================
function _req_setting($k,$def=null){ $r=Db::one("SELECT value FROM app_settings WHERE `key`=?",[$k]); if(!$r)return $def; $v=json_decode($r['value'],true); return ($v===null||$v==='')?$def:$v; }
// Ø¨Ø§Ø²Ù‡â€ŒÙ‡Ø§ÛŒ Ø³Ø§Ø¹ØªÛŒ Ø§Ø±Ø³Ø§Ù„ Ù…ÙˆÙ‚Ø¹ÛŒØª Ø¨Ø±Ø§ÛŒ ÛŒÚ© Ú©Ø§Ø±Ø¨Ø±Ø› Ø§Ú¯Ø± ØªÙ†Ø¸ÛŒÙ… Ù†Ø´Ø¯Ù‡ Ø¨Ø§Ø´Ø¯ØŒ Ø¢Ø±Ø§ÛŒÙ‡Ù” Ø®Ø§Ù„ÛŒ = Ù‡Ù…ÛŒØ´Ù‡ Ù…Ø¬Ø§Ø²
function _tracking_windows_for($userId){
  $all = _req_setting('tracking_windows', []);
  if (is_array($all) && isset($all[$userId])) return $all[$userId];
  if (is_array($all) && isset($all[(string)$userId])) return $all[(string)$userId];
  return [];
}

// Ø§Ø¹Ù„Ø§Ù† Ù¾ÛŒØ§Ù…Ú©ÛŒ Ø¨Ù‡ Ù…ØªÙ‚Ø§Ø¶ÛŒ Ù‡Ù†Ú¯Ø§Ù… ØªØ£ÛŒÛŒØ¯/Ø±Ø¯ Ø¯Ø±Ø®ÙˆØ§Ø³Øª (Ø¯Ø± ØµÙˆØ±Øª ÙØ¹Ø§Ù„â€ŒØ¨ÙˆØ¯Ù†)
function _req_notify_sms($req,$status,$note){
  if (empty(_req_policy_options($req['user_id'],false)['request_sms_notify'])) return;
  if (!Sms::isEnabled()) return;
  $usr = Db::one("SELECT first_name,last_name,phone FROM users WHERE id=?", [$req['user_id']]);
  if (!$usr || empty($usr['phone'])) return;
  $TY = ['annual'=>'Ù…Ø±Ø®ØµÛŒ Ø§Ø³ØªØ­Ù‚Ø§Ù‚ÛŒ','sick'=>'Ù…Ø±Ø®ØµÛŒ Ø§Ø³ØªØ¹Ù„Ø§Ø¬ÛŒ','mission'=>'Ù…Ø§Ù…ÙˆØ±ÛŒØª','overtime'=>'Ø§Ø¶Ø§ÙÙ‡â€ŒÚ©Ø§Ø±','manual'=>'ØªØ±Ø¯Ø¯ Ø¯Ø³ØªÛŒ'];
  $tn = $TY[$req['type']] ?? 'Ø¯Ø±Ø®ÙˆØ§Ø³Øª';
  $when = $req['the_date'] ?: ($req['from_jdate'] ?? '');
  $name = trim(($usr['first_name']??'').' '.($usr['last_name']??''));
  if ($status === 'approved') {
    $text = "Ù‡Ù…Ú©Ø§Ø± Ú¯Ø±Ø§Ù…ÛŒ {$name}\nØ¯Ø±Ø®ÙˆØ§Ø³Øª {$tn} Ø´Ù…Ø§".($when?" Ø¨Ø±Ø§ÛŒ ØªØ§Ø±ÛŒØ® {$when}":"")." ØªØ£ÛŒÛŒØ¯ Ø´Ø¯.";
  } else {
    $text = "Ù‡Ù…Ú©Ø§Ø± Ú¯Ø±Ø§Ù…ÛŒ {$name}\nØ¯Ø±Ø®ÙˆØ§Ø³Øª {$tn} Ø´Ù…Ø§".($when?" Ø¨Ø±Ø§ÛŒ ØªØ§Ø±ÛŒØ® {$when}":"")." Ø±Ø¯ Ø´Ø¯.".($note?"\nØ¹Ù„Øª: {$note}":"");
  }
  Sms::send([$usr['phone']], $text, 'req_'.$status, null);
}

// Ù…Ø­Ø§Ø³Ø¨Ù‡Ù” Ù…ØµØ±Ù ÛŒÚ© Ù†ÙˆØ¹ Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø¯Ø± Ù…Ø§Ù‡/Ø³Ø§Ù„ Ø¬Ø§Ø±ÛŒ (Ø¯Ù‚ÛŒÙ‚Ù‡ Ùˆ ØªØ¹Ø¯Ø§Ø¯)
function _req_usage($uid,$type,$unit,$jy,$jm){
  // Ø¯Ø±Ø®ÙˆØ§Ø³Øªâ€ŒÙ‡Ø§ÛŒ Ú©Ø§Ù…Ù„Ø§Ù‹ ØªÚ©Ø±Ø§Ø±ÛŒ Ù‚Ø¯ÛŒÙ…ÛŒ Ù†ÛŒØ² ÙÙ‚Ø· ÛŒÚ©â€ŒØ¨Ø§Ø± Ø¯Ø± Ù…Ø§Ù†Ø¯Ù‡ Ù…Ø­Ø§Ø³Ø¨Ù‡ Ø´ÙˆÙ†Ø¯.
  $rows = Db::all("SELECT MAX(minutes) AS minutes, the_date, from_jdate, unit,
      CASE WHEN MAX(status='approved')=1 THEN 'approved' ELSE 'pending' END AS balance_status
    FROM requests
    WHERE user_id=? AND type=? AND (unit=? OR ?='') AND status IN('pending','approved')
    GROUP BY user_id,type,unit,the_date,from_jdate,to_jdate,from_time,to_time",
    [$uid,$type,$unit,$unit]);
  $monthMin=0;$yearMin=0;$monthCnt=0;$yearCnt=0;
  $approvedMonthMin=0;$approvedYearMin=0;$pendingMonthMin=0;$pendingYearMin=0;
  foreach($rows as $r){
    $d = $r['the_date'] ?: $r['from_jdate'];
    if(!$d || !preg_match('/^(\d{4})-(\d{2})/',$d,$m)) continue;
    $ry=(int)$m[1]; $rm=(int)$m[2];
    if($ry==$jy){
      $minutes=(int)$r['minutes'];$yearMin+=$minutes;$yearCnt++;
      if($r['balance_status']==='approved')$approvedYearMin+=$minutes;else$pendingYearMin+=$minutes;
      if($rm==$jm){$monthMin+=$minutes;$monthCnt++;if($r['balance_status']==='approved')$approvedMonthMin+=$minutes;else$pendingMonthMin+=$minutes;}
    }
  }
  return ['month_min'=>$monthMin,'year_min'=>$yearMin,'month_cnt'=>$monthCnt,'year_cnt'=>$yearCnt,
    'approved_month_min'=>$approvedMonthMin,'approved_year_min'=>$approvedYearMin,
    'pending_month_min'=>$pendingMonthMin,'pending_year_min'=>$pendingYearMin];
}

// Request constraints come exclusively from the active assigned work policy.
function _req_active_work_policy($uid){
  $user=Db::one("SELECT * FROM users WHERE id=?",[(int)$uid]);
  if(empty($user['work_policy_id'])) return null;
  $policy=Db::one("SELECT * FROM work_policies WHERE id=? AND is_active=1",[(int)$user['work_policy_id']]);
  if(!$policy) return null;
  if(!is_array($policy['config'])) $policy['config']=json_decode((string)$policy['config'],true);
  if(!is_array($policy['config'])) Http::error('ØªÙ†Ø¸ÛŒÙ…Ø§Øª Ø³ÛŒØ§Ø³Øª Ú©Ø§Ø±ÛŒ Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³ØªØ› Ø¨Ø§ Ù…Ø¯ÛŒØ± Ø³Ø§Ù…Ø§Ù†Ù‡ ØªÙ…Ø§Ø³ Ø¨Ú¯ÛŒØ±ÛŒØ¯.',422);
  return $policy;
}

function _req_policy_options($uid,$required=true){
  $policy=_req_active_work_policy($uid);
  if(!$policy&&$required)Http::error('Ø¨Ø±Ø§ÛŒ Ø¨Ø±Ø±Ø³ÛŒ Ø¯Ø±Ø®ÙˆØ§Ø³ØªØŒ Ø§Ø¨ØªØ¯Ø§ Ø³ÛŒØ§Ø³Øª Ú©Ø§Ø±ÛŒ ÙØ¹Ø§Ù„ Ø¨Ù‡ Ø§ÛŒÙ† Ú©Ø§Ø±Ø¨Ø± ØªØ®ØµÛŒØµ Ø¯Ù‡ÛŒØ¯.',422);
  return is_array($policy['config']['request_options']??null)?$policy['config']['request_options']:[];
}

// One region-specific rule shared by the Android config and server validation.
function _req_leave_substitute_required($uid){
  $uid=(int)$uid;
  if($uid<=0)return true; // fail closed if the caller identity is unavailable
  _zone_leave_requirement_storage();
  $row=Db::one("SELECT COALESCE(z.leave_requires_substitute,0) leave_requires_substitute FROM users u LEFT JOIN zones z ON z.id=u.zone_id WHERE u.id=? LIMIT 1",[$uid]);
  if(!$row)return true;
  return !empty($row['leave_requires_substitute']);
}

function _req_policy_date($value){
  require_once __DIR__.'/IranCalendar.php';
  $date=IranCalendar::normalize($value);
  if(!$date || (int)substr($date,0,4)<1300 || (int)substr($date,0,4)>1500) return null;
  [$gy,$gm,$gd]=IranCalendar::toGregorian(...array_map('intval',explode('-',$date)));
  return new DateTimeImmutable(sprintf('%04d-%02d-%02d',$gy,$gm,$gd),new DateTimeZone('Asia/Tehran'));
}

// Recompute durations from dates/times; never trust client-supplied minutes.
function _req_policy_span(array $request){
  $type=$request['type']??'';
  $unit=$type==='manual'?'daily':($request['unit']??'daily');
  if(!in_array($unit,['daily','hourly'],true)) return null;
  $from=$unit==='hourly'||$type==='manual'?($request['the_date']??$request['from_jdate']??null):($request['from_jdate']??$request['the_date']??null);
  $to=$unit==='hourly'||$type==='manual'?$from:(($request['to_jdate']??null)?:$from);
  $start=_req_policy_date($from); $end=_req_policy_date($to);
  if(!$start||!$end||$end<$start) return null;
  $days=(int)$start->diff($end)->days+1;
  $minutes=$type==='manual'?0:$days*480; // Same daily-minute contract as requests/reporting.
  if($unit==='hourly'){
    $a=(string)($request['from_time']??''); $b=(string)($request['to_time']??'');
    if(!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/',$a)||!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/',$b)||$b<=$a) return null;
    $minutes=((int)substr($b,0,2)*60+(int)substr($b,3,2))-((int)substr($a,0,2)*60+(int)substr($a,3,2));
    $start=$start->setTime((int)substr($a,0,2),(int)substr($a,3,2));
  }
  $periods=[];
  for($day=$start->setTime(0,0);$day<=$end;$day=$day->modify('+1 day')){
    [$jy,$jm]=gregorian_to_jalali((int)$day->format('Y'),(int)$day->format('n'),(int)$day->format('j'));
    foreach([sprintf('%04d',$jy),sprintf('%04d-%02d',$jy,$jm)] as $key){
      $periods[$key]=($periods[$key]??0)+($unit==='daily'?($type==='manual'?0:480):$minutes);
    }
  }
  return compact('unit','start','days','minutes','periods');
}

function _req_validate_work_policy($uid,array $request,array $policy,$approval=false,$excludeId=0,$now=null,$editing=false){
  $type=$request['type']??'';
  if(!in_array($type,['annual','sick','unpaid','mission','overtime','manual'],true)) Http::error('Ù†ÙˆØ¹ Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª',422);
  if($type!=='manual'&&($request['unit']??'daily')==='hourly'){
    $a=(string)($request['from_time']??'');$z=(string)($request['to_time']??'');
    if(!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/D',$a)||!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/D',$z))Http::error('Ø³Ø§Ø¹Øª Ø´Ø±ÙˆØ¹ Ùˆ Ù¾Ø§ÛŒØ§Ù† Ø¨Ø§ÛŒØ¯ Ø¨Ø§ Ù‚Ø§Ù„Ø¨ Ø³Ø§Ø¹Øª Ùˆ Ø¯Ù‚ÛŒÙ‚Ù‡ Ù…Ø¹ØªØ¨Ø± ÙˆØ§Ø±Ø¯ Ø´ÙˆÙ†Ø¯.',422);
    if($a>=$z)Http::error('Ø³Ø§Ø¹Øª Ø´Ø±ÙˆØ¹ Ø¨Ø§ÛŒØ¯ Ú©ÙˆÚ†Ú©â€ŒØªØ± Ø§Ø² Ø³Ø§Ø¹Øª Ù¾Ø§ÛŒØ§Ù† Ø¨Ø§Ø´Ø¯.',422);
  }
  $span=_req_policy_span($request);
  if(!$span) Http::error('ØªØ§Ø±ÛŒØ® ÛŒØ§ Ø¨Ø§Ø²Ù‡Ù” Ø³Ø§Ø¹Øª Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª.',422);
  $config=$policy['config'][$type]??[];
  $limits=in_array($type,['manual','overtime'],true)?$config:($config[$span['unit']]??[]);
  $title=['annual'=>'Ù…Ø±Ø®ØµÛŒ Ø§Ø³ØªØ­Ù‚Ø§Ù‚ÛŒ','sick'=>'Ù…Ø±Ø®ØµÛŒ Ø§Ø³ØªØ¹Ù„Ø§Ø¬ÛŒ','unpaid'=>'Ù…Ø±Ø®ØµÛŒ Ø¨ÛŒâ€ŒØ­Ù‚ÙˆÙ‚','mission'=>'Ù…Ø§Ù…ÙˆØ±ÛŒØª','overtime'=>'Ø§Ø¶Ø§ÙÙ‡â€ŒÚ©Ø§Ø±','manual'=>'ØªØ±Ø¯Ø¯ Ø¯Ø³ØªÛŒ'][$type];
  $hm=static fn($data,$prefix)=>max(0,(int)($data[$prefix.'_h']??0))*60+max(0,(int)($data[$prefix.'_m']??0));
  if($type!=='manual'){
    $daily=$span['unit']==='daily' && $type!=='overtime';
    $min=$daily?(int)($limits['min_days']??0):$hm($limits,'min');
    $max=$daily?(int)($limits['max_days']??0):$hm($limits,'max');
    $length=$daily?$span['days']:$span['minutes'];
    if($min>0&&$length<$min) Http::error('Ø·ÙˆÙ„ Ø¨Ø§Ø²Ù‡Ù” '.$title.' Ú©Ù…ØªØ± Ø§Ø² Ø­Ø¯Ø§Ù‚Ù„ Ù…Ø¬Ø§Ø² Ø³ÛŒØ§Ø³Øª Ú©Ø§Ø±ÛŒ Ø§Ø³Øª.',422);
    if($max>0&&$length>$max) Http::error('Ø·ÙˆÙ„ Ø¨Ø§Ø²Ù‡Ù” '.$title.' Ø¨ÛŒØ´ØªØ± Ø§Ø² Ø­Ø¯Ø§Ú©Ø«Ø± Ù…Ø¬Ø§Ø² Ø³ÛŒØ§Ø³Øª Ú©Ø§Ø±ÛŒ Ø§Ø³Øª.',422);
  }
  // Zero days means the start day itself, unlike zero caps (unlimited).
  if(!$editing && (!$approval||!empty($policy['apply_time_limit_on_approve'])) && array_key_exists('deadline_days',$limits)){
    $days=max(0,(int)$limits['deadline_days']);
    $before=($limits['deadline_dir']??'after')==='before';
    $deadline=$span['start']->modify(($before?'-':'+').$days.' days')->setTime(23,59,59);
    $clock=(new DateTimeImmutable('@'.($now??time())))->setTimezone(new DateTimeZone('Asia/Tehran'));
    if($clock>$deadline) Http::error('Ù…Ù‡Ù„Øª '.($approval?'ØªØ£ÛŒÛŒØ¯':'Ø«Ø¨Øª').' '.$title.' Ø·Ø¨Ù‚ Ø³ÛŒØ§Ø³Øª Ú©Ø§Ø±ÛŒ Ú¯Ø°Ø´ØªÙ‡ Ø§Ø³Øª.',422);
  }
  $rows=Db::all("SELECT MAX(minutes) minutes,unit,from_jdate,to_jdate,the_date,from_time,to_time,type
    FROM requests WHERE user_id=? AND type=? AND status IN ('pending','approved') AND id<>?
    GROUP BY type,unit,from_jdate,to_jdate,the_date,from_time,to_time",[(int)$uid,$type,(int)$excludeId]);
  $usage=[];
  foreach($rows as $row){
    $used=_req_policy_span($row);
    if(!$used) continue; // Historical malformed rows have no usable interval.
    foreach($used['periods'] as $key=>$minutes){
      $usage[$key]['minutes']=($usage[$key]['minutes']??0)+$minutes;
      if($type==='manual'||$type==='overtime'||$used['unit']===$span['unit']) $usage[$key]['count']=($usage[$key]['count']??0)+1;
    }
  }
  foreach($span['periods'] as $key=>$minutes){
    $period=strlen((string)$key)===4?'year':'month';
    $label=$period==='year'?'Ø³Ø§Ù„Ø§Ù†Ù‡':'Ù…Ø§Ù‡Ø§Ù†Ù‡';
    $cap=(int)($limits[$period.'_cap']??0);
    if($cap>0&&($usage[$key]['count']??0)+1>$cap) Http::error('Ø³Ù‚Ù ØªØ¹Ø¯Ø§Ø¯ '.$title.' '.$label.' Ø¯Ø± Ø³ÛŒØ§Ø³Øª Ú©Ø§Ø±ÛŒ ØªÚ©Ù…ÛŒÙ„ Ø§Ø³Øª.',422);
    $minuteCap=$hm($config,$period);
    $allowOver=$type==='annual'&&!empty($config['allow_over_'.$period]);
    if(!$allowOver&&$minuteCap>0&&($usage[$key]['minutes']??0)+$minutes>$minuteCap) Http::error('Ø³Ù‚Ù Ù…Ø¯Øª '.$title.' '.$label.' Ø¯Ø± Ø³ÛŒØ§Ø³Øª Ú©Ø§Ø±ÛŒ ØªÚ©Ù…ÛŒÙ„ Ø§Ø³Øª.',422);
  }
}

// Serialize quota validation and writes for one requester across all four entry points.
// An advisory lock tolerates legacy DDL in the handlers (which would commit a transaction).
// Match validation: normalized Jalali periods, shared duration across hourly/daily,
// deduplicated pending/approved requests and separate per-unit request counts.
function _req_policy_balance($uid,array $policy,$jy,$jm){
  $out=[];$month=sprintf('%04d-%02d',$jy,$jm);$year=sprintf('%04d',$jy);
  foreach(['annual','sick','unpaid','mission','overtime'] as $type){
    $config=$policy['config'][$type]??[];$usage=[];
    $rows=Db::all("SELECT MAX(minutes) minutes,unit,from_jdate,to_jdate,the_date,from_time,to_time,type,
      CASE WHEN MAX(status='approved')=1 THEN 'approved' ELSE 'pending' END balance_status
      FROM requests WHERE user_id=? AND type=? AND status IN ('pending','approved')
      GROUP BY type,unit,from_jdate,to_jdate,the_date,from_time,to_time",[(int)$uid,$type]);
    foreach($rows as $row){$span=_req_policy_span($row);if(!$span)continue;
      foreach($span['periods'] as $period=>$minutes){
        $status=($row['balance_status']??'pending')==='approved'?'approved':'pending';
        $usage[$period][$status]=($usage[$period][$status]??0)+$minutes;
        $usage[$period]['count'][$span['unit']]=($usage[$period]['count'][$span['unit']]??0)+1;
      }
    }
    $minutes=static fn($period)=>max(0,(int)($config[$period.'_h']??0))*60+max(0,(int)($config[$period.'_m']??0));
    foreach(['daily'=>480,'hourly'=>60] as $unit=>$factor){
      if($type==='overtime'&&$unit==='daily')continue;
      $limits=$type==='overtime'?$config:($config[$unit]??[]);$value=[];
      foreach(['month'=>$month,'year'=>$year] as $period=>$key){
        $cap=$minutes($period);$approved=$usage[$key]['approved']??0;$pending=$usage[$key]['pending']??0;
        $value['cap_'.$period]=$cap/$factor;$value['used_'.$period]=round($approved/$factor,2);$value['pending_'.$period]=round($pending/$factor,2);
        $unlimited=$type==='annual'&&!empty($config['allow_over_'.$period]);
        $value['left_'.$period]=$cap&&!$unlimited?max(0,($cap-$approved-$pending)/$factor):null;
        $value['cap_count_'.$period]=(int)($limits[$period.'_cap']??0);
        $value['used_count_'.$period]=$usage[$key]['count'][$unit]??0;
      }
      $out[$type.'_'.$unit]=$value;
    }
    if($type==='overtime'||$type==='mission'){
      $value=[];foreach(['month'=>$month,'year'=>$year] as $period=>$key){
        $value['used_min_'.$period]=($usage[$key]['approved']??0)+($usage[$key]['pending']??0);
        $value['used_count_'.$period]=array_sum($usage[$key]['count']??[]);
        $value['cap_min_'.$period]=$minutes($period);$value['cap_hours_'.$period]=$minutes($period)/60;
        $value['cap_count_'.$period]=$type==='overtime'?(int)($config[$period.'_cap']??0):0;
      }$out[$type]=$value;
    }
  }return $out;
}

function _req_reject_overlap($uid,array $request,$excludeId=0){
  $span=_req_policy_span($request);
  if(!$span)return; // Existing handlers retain responsibility for invalid input.
  $type=(string)($request['type']??'');
  $args=[(int)$uid,$type];$exclude='';if($excludeId){$exclude=' AND id<>?';$args[]=(int)$excludeId;}
  $rows=Db::all("SELECT * FROM requests WHERE user_id=? AND type=? AND status IN ('pending','approved')".$exclude,$args);
  $end=static function($value){return $value['unit']==='hourly'?$value['start']->modify('+'.$value['minutes'].' minutes'):$value['start']->setTime(0,0)->modify('+'.$value['days'].' days');};
  foreach($rows as $row){
    $other=_req_policy_span($row);if(!$other)continue;
    if($type==='manual'){
      if($span['start']->format('Y-m-d')===$other['start']->format('Y-m-d')&&($request['in_time']??null)===($row['in_time']??null)&&($request['out_time']??null)===($row['out_time']??null))Http::error('Ø§ÛŒÙ† Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù‚Ø¨Ù„Ø§Ù‹ Ø«Ø¨Øª Ø´Ø¯Ù‡ Ø§Ø³Øª.',409);
    }elseif($span['start']<$end($other)&&$other['start']<$end($span))Http::error('Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ø±ÙˆØ² Ùˆ Ø¨Ø§Ø²Ù‡ØŒ Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù‡Ù…â€ŒØ²Ù…Ø§Ù† Ø¯Ø± Ø§Ù†ØªØ¸Ø§Ø± ÛŒØ§ ØªØ£ÛŒÛŒØ¯Ø´Ø¯Ù‡ Ø¯Ø§Ø±ÛŒØ¯.',409);
  }
}
function _req_work_policy_handler($path,callable $handler){
  return static function($params,$body,$user) use($path,$handler){
    $approval=false; $excludeId=0; $request=$body; $uid=(int)($user['id']??0);
    if($path==='/api/admin/requests'){
      $uid=(int)($body['user_id']??0);
      // Even immediate admin approval is a new submission: its deadline always applies.
    } elseif(str_contains($path,'{id}')){
      $approval=($body['decision']??'')==='approve'||($body['status']??'')==='approved';
      if(!$approval) return $handler($params,$body,$user);
      $request=Db::one("SELECT * FROM requests WHERE id=?",[(int)$params['id']]);
      if(!$request) return $handler($params,$body,$user);
      if($path==='/api/requests/{id}/decide' && ($request['pending_on']??null)!=($user['id']??0) && empty($user['is_admin'])) Http::error('Ø§ÛŒÙ† Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø¯Ø± Ú©Ø§Ø±ØªØ§Ø¨Ù„ Ø´Ù…Ø§ Ù†ÛŒØ³Øª',403);
      $uid=(int)$request['user_id']; $excludeId=(int)$params['id'];
    }
    if($uid<=0) return $handler($params,$body,$user);
    _ensure_requests_table();
    $lock='khatyar:request-policy:'.$uid;
    $locked=Db::one("SELECT GET_LOCK(?,10) acquired",[$lock]);
    if((int)($locked['acquired']??0)!==1) Http::error('Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø¯ÛŒÚ¯Ø±ÛŒ Ø¯Ø± Ø­Ø§Ù„ Ø¨Ø±Ø±Ø³ÛŒ Ø§Ø³ØªØ› Ø¯ÙˆØ¨Ø§Ø±Ù‡ ØªÙ„Ø§Ø´ Ú©Ù†ÛŒØ¯.',409);
    try{
      if(!$approval || ($request['status']??'')==='rejected') _req_reject_overlap($uid,$request);
      $policy=_req_active_work_policy($uid);
      if(!$policy)Http::error('Ø¨Ø±Ø§ÛŒ Ø¨Ø±Ø±Ø³ÛŒ Ø¯Ø±Ø®ÙˆØ§Ø³ØªØŒ Ø§Ø¨ØªØ¯Ø§ Ø³ÛŒØ§Ø³Øª Ú©Ø§Ø±ÛŒ ÙØ¹Ø§Ù„ Ø¨Ù‡ Ø§ÛŒÙ† Ú©Ø§Ø±Ø¨Ø± ØªØ®ØµÛŒØµ Ø¯Ù‡ÛŒØ¯.',422);
      _req_validate_work_policy($uid,$request,$policy,$approval,$excludeId);
      return $handler($params,$body,$user);
    } finally { Db::one("SELECT RELEASE_LOCK(?) released",[$lock]); }
  };
}

// ØªØ¹ÛŒÛŒÙ† Ù…Ù‚Ø§Ù… ØªØ£ÛŒÛŒØ¯Ú©Ù†Ù†Ø¯Ù‡ (Ø³Ù„Ø³Ù„Ù‡â€ŒÙ…Ø±Ø§ØªØ¨ÛŒ ÛŒØ§ Ù…Ø³Ø¦ÙˆÙ„ Ø®Ø§Øµ)
function _req_approver($uid){
  $options=_req_policy_options($uid);
  $mode=$options['approval_mode']??'hierarchical';
  if ($mode === 'specific') {
    $sp=(int)($options['approver_id']??0);
    if(!$sp||!Db::one('SELECT id FROM users WHERE id=? AND is_active=1',[$sp]))Http::error('Ù…Ø³Ø¦ÙˆÙ„ ØªØ£ÛŒÛŒØ¯ Ø³ÛŒØ§Ø³Øª Ú©Ø§Ø±ÛŒ Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª.',422);
    return $sp ?: null;
  }
  $mgrs = _user_managers($uid);
  return $mgrs[0] ?? null; // Ù†Ø®Ø³ØªÛŒÙ† Ù…Ù‚Ø§Ù… Ø¨Ø§Ù„Ø§Ø¯Ø³Øª
}

// ==================== Ù†ÛŒØ±ÙˆÛŒ Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† Ù…Ø±Ø®ØµÛŒ ====================
// Ø¨Ø±Ø±Ø³ÛŒ Ù‡Ù…Ù¾ÙˆØ´Ø§Ù†ÛŒ Ø¯Ùˆ Ø¨Ø§Ø²Ù‡Ù” ØªØ§Ø±ÛŒØ® Ø¬Ù„Ø§Ù„ÛŒ
function _date_ranges_overlap($from1,$to1,$from2,$to2){
  $a=j_to_ts($from1); $b=j_to_ts($to1); $c=j_to_ts($from2); $d=j_to_ts($to2);
  if($a===null||$b===null||$c===null||$d===null) return false;
  if($a>$b){$t=$a;$a=$b;$b=$t;} if($c>$d){$t=$c;$c=$d;$d=$t;}
  return $a <= $d && $c <= $b; // Ù‡Ù…Ù¾ÙˆØ´Ø§Ù†ÛŒ Ø¯Ø§Ø±Ù†Ø¯ØŸ
}

// Ø¨Ø±Ø±Ø³ÛŒ Ø¯Ø± Ø¯Ø³ØªØ±Ø³ Ø¨ÙˆØ¯Ù† ÛŒÚ© Ù†ÛŒØ±ÙˆÛŒ Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† Ø¯Ø± Ø¨Ø§Ø²Ù‡Ù” Ù…Ø´Ø®Øµ
// Ø®Ø±ÙˆØ¬ÛŒ: ['available'=>bool, 'reason'=>string|null]
function _substitute_availability($subId, $fromDate, $toDate, $excludeRequestId=null,$prepareStorage=true){
  // Ø§Ø·Ù…ÛŒÙ†Ø§Ù† Ø§Ø² ÙˆØ¬ÙˆØ¯ Ø¬Ø¯ÙˆÙ„
  if($prepareStorage){try { Db::run("CREATE TABLE IF NOT EXISTS substitute_assignments (id INT AUTO_INCREMENT PRIMARY KEY, substitute_user_id INT NOT NULL, request_id INT NOT NULL, absent_user_id INT NOT NULL, from_date VARCHAR(10) NOT NULL, to_date VARCHAR(10) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'active', created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_sub_user (substitute_user_id), INDEX idx_sub_dates (from_date, to_date)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }}

  // Û±) Ø´ÛŒÙØª Ø§Ø´ØºØ§Ù„â€ŒØ´Ø¯Ù‡ (Ø§Ø² Ù…Ø±Ø®ØµÛŒâ€ŒÙ‡Ø§ÛŒ ØªØ£ÛŒÛŒØ¯Ø´Ø¯Ù‡): substitute_assignments ÙØ¹Ø§Ù„ Ú©Ù‡ Ø¨Ø§ Ø¨Ø§Ø²Ù‡ Ù‡Ù…Ù¾ÙˆØ´Ø§Ù†ÛŒ Ø¯Ø§Ø±Ø¯
  $args=[$subId];$exclude='';if($excludeRequestId){$exclude=' AND sa.request_id<>?';$args[]=(int)$excludeRequestId;}
  $assigns = Db::all("SELECT sa.from_date,sa.to_date FROM substitute_assignments sa JOIN requests rq ON rq.id=sa.request_id AND rq.status='approved' AND rq.type='annual' AND COALESCE(rq.unit,'daily')='daily' WHERE sa.substitute_user_id=? AND sa.status='active'".$exclude.($prepareStorage?'':' FOR UPDATE'), $args);
  foreach ($assigns as $a) {
    if (_date_ranges_overlap($fromDate,$toDate,$a['from_date'],$a['to_date'])) {
      return ['available'=>false, 'reason'=>'Ø§ÛŒÙ† Ù†ÛŒØ±ÙˆÛŒ Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† Ø¯Ø± Ø¨Ø§Ø²Ù‡Ù” Ø§Ù†ØªØ®Ø§Ø¨ÛŒ Ø´ÛŒÙØª Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ†ÛŒ ÙØ¹Ø§Ù„ Ø¯Ø§Ø±Ø¯ Ùˆ Ø¯Ø± Ø¯Ø³ØªØ±Ø³ Ù†ÛŒØ³Øª.'];
    }
  }

  // Û²) Ø±Ø²Ø±Ùˆ ØªÙˆØ³Ø· Ø¯Ø±Ø®ÙˆØ§Ø³Øª ØªØ£ÛŒÛŒØ¯Ù†Ø´Ø¯Ù‡Ù” Ø¯ÛŒÚ¯Ø± (Ù‡Ù†ÙˆØ² pending)
  $hasSub = false;
  try { $hasSub = (bool)Db::one("SHOW COLUMNS FROM requests WHERE Field='substitute_user_id'"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  if ($hasSub) {
    $q = "SELECT from_jdate,to_jdate,the_date FROM requests WHERE substitute_user_id=? AND status='pending' AND type='annual' AND COALESCE(unit,'daily')='daily'";
    $args = [$subId];
    if ($excludeRequestId) { $q .= " AND id<>?"; $args[] = $excludeRequestId; }
    $pendings = Db::all($q.($prepareStorage?'':' FOR UPDATE'), $args);
    foreach ($pendings as $pr) {
      $pf = $pr['from_jdate'] ?: $pr['the_date'];
      $pt = $pr['to_jdate'] ?: ($pr['the_date'] ?: $pf);
      if ($pf && $pt && _date_ranges_overlap($fromDate,$toDate,$pf,$pt)) {
        return ['available'=>false, 'reason'=>'Ø§ÛŒÙ† Ù†ÛŒØ±ÙˆÛŒ Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† ØªÙˆØ³Ø· Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø¯ÛŒÚ¯Ø±ÛŒ (Ø¯Ø± Ø§Ù†ØªØ¸Ø§Ø± ØªØ£ÛŒÛŒØ¯) Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ø¨Ø§Ø²Ù‡ Ø±Ø²Ø±Ùˆ Ø´Ø¯Ù‡ Ø§Ø³Øª.'];
      }
    }
  }

  return ['available'=>true, 'reason'=>null];
}

// Ø¨Ø±Ø±Ø³ÛŒ Ø§ÛŒÙ†Ú©Ù‡ Ø¢ÛŒØ§ ØªØ§Ø±ÛŒØ®â€ŒÙ‡Ø§ÛŒ Ø¨Ø§Ø²Ù‡ Ø´Ø§Ù…Ù„ Ø±ÙˆØ² Ù…Ù…Ù†ÙˆØ¹Ù‡Ù” Ù…Ø±Ø®ØµÛŒ Ù‡Ø³ØªÙ†Ø¯
function _leave_blocked_in_range($fromDate, $toDate){
  try {
    Db::run("CREATE TABLE IF NOT EXISTS leave_blocked_dates (id INT AUTO_INCREMENT PRIMARY KEY, jdate VARCHAR(10) NOT NULL UNIQUE, reason VARCHAR(255) NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $rows = Db::all("SELECT jdate, reason FROM leave_blocked_dates");
  } catch (\Throwable $e) { return null; }
  foreach ($rows as $r) {
    $jt = j_to_ts($r['jdate']);
    $f = j_to_ts($fromDate); $t = j_to_ts($toDate);
    if ($jt!==null && $f!==null && $t!==null && $jt>=min($f,$t) && $jt<=max($f,$t)) {
      return $r; // Ø§ÙˆÙ„ÛŒÙ† Ø±ÙˆØ² Ù…Ù…Ù†ÙˆØ¹Ù‡ Ø¯Ø± Ø¨Ø§Ø²Ù‡
    }
  }
  return null;
}

// --- Ù…Ø¯ÛŒØ±ÛŒØª Ø±ÙˆØ²Ù‡Ø§ÛŒ Ù…Ù…Ù†ÙˆØ¹Ù‡Ù” Ù…Ø±Ø®ØµÛŒ (Ø§Ø¯Ù…ÛŒÙ†) ---
route('GET', '/api/admin/leave-blocked-dates', function($p,$b,$u){
  try { Db::run("CREATE TABLE IF NOT EXISTS leave_blocked_dates (id INT AUTO_INCREMENT PRIMARY KEY, jdate VARCHAR(10) NOT NULL UNIQUE, reason VARCHAR(255) NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  return Db::all("SELECT * FROM leave_blocked_dates ORDER BY jdate");
}, false, ADMIN);

route('POST', '/api/admin/leave-blocked-dates', function($p,$b,$u){
  try { Db::run("CREATE TABLE IF NOT EXISTS leave_blocked_dates (id INT AUTO_INCREMENT PRIMARY KEY, jdate VARCHAR(10) NOT NULL UNIQUE, reason VARCHAR(255) NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  $jdate = trim($b['jdate'] ?? '');
  if (!preg_match('/^\d{4}\/\d{1,2}\/\d{1,2}$/', $jdate)) Http::error('ØªØ§Ø±ÛŒØ® Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª (Ù‚Ø§Ù„Ø¨: Û±Û´Û°Û´/Û°Û´/Û±Ûµ)', 422);
  $reason = trim($b['reason'] ?? '') ?: null;
  try {
    Db::run("INSERT INTO leave_blocked_dates(jdate,reason) VALUES(?,?) ON DUPLICATE KEY UPDATE reason=VALUES(reason)", [$jdate,$reason]);
  } catch (\Throwable $e) { Http::error('Ø®Ø·Ø§ Ø¯Ø± Ø«Ø¨Øª', 500); }
  return ['ok'=>true];
}, false, ADMIN);

route('DELETE', '/api/admin/leave-blocked-dates/{id}', function($p,$b,$u){
  Db::run("DELETE FROM leave_blocked_dates WHERE id=?", [(int)$p['id']]);
  return ['ok'=>true];
}, false, ADMIN);

// ÙÙ‡Ø±Ø³Øª Ù†ÛŒØ±ÙˆÙ‡Ø§ÛŒ Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† (ÙÙ‚Ø· Ú©Ø§Ø±Ø¨Ø±Ø§Ù†ÛŒ Ú©Ù‡ ÙÙ„Ú¯ can_be_substitute Ø¯Ø§Ø±Ù†Ø¯) + ÙˆØ¶Ø¹ÛŒØª Ø¯Ø± Ø¯Ø³ØªØ±Ø³ Ø¨ÙˆØ¯Ù† Ø¯Ø± Ø¨Ø§Ø²Ù‡
route('GET', '/api/my/substitutes', function($p,$b,$u){
  $from = $_GET['from'] ?? null; // Ø¬Ù„Ø§Ù„ÛŒ
  $to = $_GET['to'] ?? $from;
  // Ø§Ø·Ù…ÛŒÙ†Ø§Ù† Ø§Ø² ÙˆØ¬ÙˆØ¯ Ø³ØªÙˆÙ† ÙÙ„Ú¯
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

// Ø¨Ø±Ø±Ø³ÛŒ Ù¾ÛŒØ´ Ø§Ø² Ø«Ø¨Øª: Ø¢ÛŒØ§ Ø¨Ø§Ø²Ù‡ Ø¨Ø±Ø§ÛŒ Ù…Ø±Ø®ØµÛŒ Ù…Ø¬Ø§Ø² Ø§Ø³Øª (Ø±ÙˆØ² Ù…Ù…Ù†ÙˆØ¹Ù‡) Ùˆ Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† Ø¯Ø± Ø¯Ø³ØªØ±Ø³ Ø§Ø³Øª
route('POST', '/api/my/check-leave-window', function($p,$b,$u){
  $from = $b['from'] ?? null; $to = $b['to'] ?? $from;
  if (!$from) Http::error('ØªØ§Ø±ÛŒØ® Ù„Ø§Ø²Ù… Ø§Ø³Øª', 422);
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

function _ensure_requests_table(){
  static $ready = false;
  if ($ready) return;
  if (Db::one("SHOW TABLES LIKE 'requests'")) {
    $ready = true;
    return;
  }
  Db::run("CREATE TABLE IF NOT EXISTS requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(20) NOT NULL,
    unit VARCHAR(8) NULL,
    from_jdate VARCHAR(10) NULL,
    to_jdate VARCHAR(10) NULL,
    the_date VARCHAR(10) NULL,
    from_time VARCHAR(5) NULL,
    to_time VARCHAR(5) NULL,
    manual_kind VARCHAR(6) NULL,
    in_time VARCHAR(5) NULL,
    out_time VARCHAR(5) NULL,
    minutes INT NULL,
    reason TEXT NULL,
    attachment_name VARCHAR(255) NULL,
    attachment_data LONGTEXT NULL,
    selfie_data LONGTEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    approver_id INT NULL,
    approver_note TEXT NULL,
    decided_at DATETIME NULL,
    pending_on INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_req_user (user_id, created_at),
    INDEX idx_req_status (status),
    INDEX idx_req_pending (pending_on)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  $ready = true;
}

function _req_approval_steps_ensure(){
  static $ready=false;if($ready)return;
  Db::run("CREATE TABLE IF NOT EXISTS request_approval_steps (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,actor_id INT NOT NULL,
    decision VARCHAR(16) NOT NULL,note TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_request_steps (request_id,id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  $ready=true;
}
function _req_record_approval_step(int $requestId,int $actorId,string $decision,?string $note=null): void {
  _req_approval_steps_ensure();
  Db::run('INSERT INTO request_approval_steps(request_id,actor_id,decision,note) VALUES(?,?,?,?)',[$requestId,$actorId,$decision,$note]);
}
function _req_decorate_my_requests(array $rows): array {
  if(!$rows)return $rows;
  $ids=array_map(static fn($r)=>(int)$r['id'],$rows);
  $marks=implode(',',array_fill(0,count($ids),'?'));
  $steps=[];
  if(_db_table_exists_safe('request_approval_steps')){
    foreach(Db::all("SELECT s.request_id,s.decision,s.note,s.created_at,
        TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) actor_name
        FROM request_approval_steps s LEFT JOIN users u ON u.id=s.actor_id
        WHERE s.request_id IN ($marks) ORDER BY s.id",$ids) as $s){$steps[(int)$s['request_id']][]=$s;}
  }
  foreach($rows as &$r){
    $id=(int)$r['id'];$r['approval_steps']=$steps[$id]??[];
    $r['pending_approver_name']=trim((string)($r['pending_approver_name']??''));
    $r['approver_name']=trim((string)($r['approver_name']??''));
  }unset($r);
  return $rows;
}

route('POST', '/api/my/requests', function($p,$b,$u){
  _ensure_requests_table();
  $type = $b['type'] ?? ''; // annual / sick / mission / overtime / manual
  if (!in_array($type,['annual','sick','mission','overtime','manual'])) Http::error('Ù†ÙˆØ¹ Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù†Ø§Ù…Ø¹ØªØ¨Ø±',400);
  $unit = $b['unit'] ?? 'daily';
  $minutes = 0;
  // Ù…Ø­Ø§Ø³Ø¨Ù‡Ù” Ù…Ø¯Øª
  if ($type === 'manual') {
    // ØªØ±Ø¯Ø¯ Ø¯Ø³ØªÛŒ: ÙˆØ±ÙˆØ¯/Ø®Ø±ÙˆØ¬ Ù…Ø¬Ø²Ø§
    $minutes = 0;
  } elseif ($unit === 'hourly') {
    $a = $b['from_time'] ?? null; $c = $b['to_time'] ?? null;
    if ($a && $c) { [$ah,$am]=array_map('intval',explode(':',$a)); [$ch,$cm]=array_map('intval',explode(':',$c)); $minutes=max(0,($ch*60+$cm)-($ah*60+$am)); }
  } else {
    // Ø±ÙˆØ²Ø§Ù†Ù‡: ØªØ¹Ø¯Ø§Ø¯ Ø±ÙˆØ² Ã— Û¸ Ø³Ø§Ø¹Øª (Û´Û¸Û° Ø¯Ù‚ÛŒÙ‚Ù‡)
    $f = $b['from_jdate'] ?? null; $t = $b['to_jdate'] ?? $f;
    if ($f && $t) { $df=j_to_ts($f); $dt=j_to_ts($t); $days=$df&&$dt?max(1,(int)(($dt-$df)/86400)+1):1; $minutes=$days*480; }
  }
  // Ø³Ù„ÙÛŒ Ø§Ø¬Ø¨Ø§Ø±ÛŒ Ø¨Ø±Ø§ÛŒ ØªØ±Ø¯Ø¯ Ø¯Ø³ØªÛŒØŸ
  if ($type==='manual') {
    $kind=(string)($b['manual_kind']??'both');
    if(!in_array($kind,['in','out','both'],true))Http::error('Ù†ÙˆØ¹ ØªØ±Ø¯Ø¯ Ø¯Ø³ØªÛŒ Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª.',422);
    foreach(['in_time','out_time'] as $timeKey){
      if(isset($b[$timeKey])&&$b[$timeKey]!==''&&!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/D',(string)$b[$timeKey]))Http::error('Ø³Ø§Ø¹Øª ÙˆØ±ÙˆØ¯ ÛŒØ§ Ø®Ø±ÙˆØ¬ Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª.',422);
    }
    if(($kind==='in'||$kind==='both')&&empty($b['in_time']))Http::error('Ø³Ø§Ø¹Øª ÙˆØ±ÙˆØ¯ Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª.',422);
    if(($kind==='out'||$kind==='both')&&empty($b['out_time']))Http::error('Ø³Ø§Ø¹Øª Ø®Ø±ÙˆØ¬ Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª.',422);
    if($kind==='in')$b['out_time']=null;
    if($kind==='out')$b['in_time']=null;
    $b['manual_kind']=$kind;
  }
  if ($type==='manual' && !empty(_req_policy_options($u['id'])['manual_attendance_selfie']) && empty($b['selfie_data'])) {
    Http::error('Ø¨Ø±Ø§ÛŒ Ø«Ø¨Øª ØªØ±Ø¯Ø¯ Ø¯Ø³ØªÛŒØŒ Ø§Ù„ØµØ§Ù‚ Ø¹Ú©Ø³ Ø³Ù„ÙÛŒ Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª.',422);
  }
  $approver = _req_approver($u['id']);
  // Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† ÙÙ‚Ø· Ø¨Ø±Ø§ÛŒ Ù…Ø±Ø®ØµÛŒ Ø§Ø³ØªØ­Ù‚Ø§Ù‚ÛŒ Ø±ÙˆØ²Ø§Ù†Ù‡ Ù‚Ø§Ø¨Ù„ Ø§Ù†ØªØ®Ø§Ø¨ Ùˆ Ø§Ù„Ø²Ø§Ù… Ø§Ø³Øª.
  $sub = _req_substitute_eligible(['type'=>$type,'unit'=>$unit]) && !empty($b['substitute_user_id']) ? (int)$b['substitute_user_id'] : null;
  if (_req_substitute_eligible(['type'=>$type,'unit'=>$unit]) && _req_leave_substitute_required($u['id']) && !$sub) {
    Http::error('Ø¨Ø±Ø§ÛŒ Ø«Ø¨Øª Ø§ÛŒÙ† Ø¯Ø±Ø®ÙˆØ§Ø³ØªØŒ Ù…Ø¹Ø±ÙÛŒ Ù†ÛŒØ±ÙˆÛŒ Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª.',422);
  }
  // Ø¨Ø±Ø±Ø³ÛŒ Ø±ÙˆØ² Ù…Ù…Ù†ÙˆØ¹Ù‡Ù” Ù…Ø±Ø®ØµÛŒ Ùˆ Ø¯Ø± Ø¯Ø³ØªØ±Ø³ Ø¨ÙˆØ¯Ù† Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† (ÙÙ‚Ø· Ø¨Ø±Ø§ÛŒ Ù…Ø±Ø®ØµÛŒ/Ù…Ø§Ù…ÙˆØ±ÛŒØª)
  if (in_array($type,['annual','sick','mission'])) {
    $fromD = $b['from_jdate'] ?? ($b['the_date'] ?? null);
    $toD = $b['to_jdate'] ?? ($b['the_date'] ?? $fromD);
    if ($fromD && $toD) {
      $blocked = _leave_blocked_in_range($fromD, $toD);
      if ($blocked) Http::error('Ø¯Ø± Ø¨Ø§Ø²Ù‡Ù” Ø§Ù†ØªØ®Ø§Ø¨ÛŒØŒ Ø±ÙˆØ² Â«'.$blocked['jdate'].'Â» Ø¬Ø²Ùˆ Ø±ÙˆØ²Ù‡Ø§ÛŒ Ù…Ù…Ù†ÙˆØ¹Ù‡Ù” Ù…Ø±Ø®ØµÛŒ Ø§Ø³Øª'.(!empty($blocked['reason'])?' ('.$blocked['reason'].')':'').'. Ù„Ø·ÙØ§Ù‹ ØªØ§Ø±ÛŒØ® Ø¯ÛŒÚ¯Ø±ÛŒ Ø§Ù†ØªØ®Ø§Ø¨ Ú©Ù†ÛŒØ¯.', 422);
      if ($sub) {
        $av = _substitute_availability($sub, $fromD, $toD);
        if (!$av['available']) Http::error($av['reason'] ?: 'Ù†ÛŒØ±ÙˆÛŒ Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† Ø¯Ø± Ø§ÛŒÙ† Ø¨Ø§Ø²Ù‡ Ø¯Ø± Ø¯Ø³ØªØ±Ø³ Ù†ÛŒØ³Øª.', 422);
      }
    }
  }
  // Ø§Ø·Ù…ÛŒÙ†Ø§Ù† Ø§Ø² ÙˆØ¬ÙˆØ¯ Ø³ØªÙˆÙ† substitute_user_id (ÛŒÚ©â€ŒØ¨Ø§Ø±)
  try {
    $hasSub = Db::one("SHOW COLUMNS FROM requests WHERE Field='substitute_user_id'");
    if (!$hasSub) Db::run("ALTER TABLE requests ADD COLUMN substitute_user_id INT NULL");
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  $id = Db::insert("INSERT INTO requests(user_id,type,unit,from_jdate,to_jdate,the_date,from_time,to_time,manual_kind,in_time,out_time,minutes,reason,attachment_name,attachment_data,selfie_data,pending_on,substitute_user_id)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [$u['id'],$type,$unit,$b['from_jdate']??null,$b['to_jdate']??null,$b['the_date']??null,$b['from_time']??null,$b['to_time']??null,
     $b['manual_kind']??null,$b['in_time']??null,$b['out_time']??null,$minutes,$b['reason']??null,
     $b['attachment_name']??null,$b['attachment_data']??null,$b['selfie_data']??null,$approver,$sub]);
  if ($approver) Push::send([$approver],'Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø¬Ø¯ÛŒØ¯ Ø¨Ø±Ø§ÛŒ ØªØ£ÛŒÛŒØ¯',['annual'=>'Ù…Ø±Ø®ØµÛŒ Ø§Ø³ØªØ­Ù‚Ø§Ù‚ÛŒ','sick'=>'Ù…Ø±Ø®ØµÛŒ Ø§Ø³ØªØ¹Ù„Ø§Ø¬ÛŒ','mission'=>'Ù…Ø§Ù…ÙˆØ±ÛŒØª','overtime'=>'Ø§Ø¶Ø§ÙÙ‡â€ŒÚ©Ø§Ø±','manual'=>'ØªØ±Ø¯Ø¯ Ø¯Ø³ØªÛŒ'][$type]??'Ø¯Ø±Ø®ÙˆØ§Ø³Øª',['type'=>'request','request_id'=>$id]);
  // Ø§Ø·Ù„Ø§Ø¹ Ø¨Ù‡ Ù†ÛŒØ±ÙˆÛŒ Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† Ù…Ø¹Ø±ÙÛŒâ€ŒØ´Ø¯Ù‡
  if ($sub) {
    try {
      Push::notify([$sub], 'Ù…Ø¹Ø±ÙÛŒ Ø¨Ù‡â€ŒØ¹Ù†ÙˆØ§Ù† Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ†', trim(($u['first_name']??'').' '.($u['last_name']??'')).' Ø´Ù…Ø§ Ø±Ø§ Ø¨Ù‡â€ŒØ¹Ù†ÙˆØ§Ù† Ù†ÛŒØ±ÙˆÛŒ Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† Ø¯Ø± ÛŒÚ© Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù…Ø±Ø®ØµÛŒ/Ù…Ø§Ù…ÙˆØ±ÛŒØª Ù…Ø¹Ø±ÙÛŒ Ú©Ø±Ø¯Ù‡ Ø§Ø³Øª.', ['type'=>'substitute_assigned','request_id'=>$id]);
    } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  }
  return ['id'=>$id,'minutes'=>$minutes];
});

// Ø¯Ø±Ø®ÙˆØ§Ø³Øªâ€ŒÙ‡Ø§ÛŒ Ù…Ù†
route('GET', '/api/my/requests', function($p,$b,$u){
  _ensure_requests_table();
  // Ø§Ø·Ù…ÛŒÙ†Ø§Ù† Ø§Ø² ÙˆØ¬ÙˆØ¯ Ø³ØªÙˆÙ† Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ†
  $sel = "r.id,r.type,r.unit,r.from_jdate,r.to_jdate,r.the_date,r.from_time,r.to_time,r.manual_kind,r.in_time,r.out_time,r.minutes,r.reason,r.status,r.approver_note,r.created_at,r.attachment_name";
  $hasSub = false;
  try { $hasSub = (bool)Db::one("SHOW COLUMNS FROM requests WHERE Field='substitute_user_id'"); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  if ($hasSub) {
    return _req_decorate_my_requests(Db::all("SELECT r.id,r.type,r.unit,r.from_jdate,r.to_jdate,r.the_date,r.from_time,r.to_time,
        r.manual_kind,r.in_time,r.out_time,r.minutes,r.reason,r.status,r.approver_note,r.created_at,r.attachment_name,r.substitute_user_id,
        TRIM(CONCAT(COALESCE(su.first_name,''),' ',COALESCE(su.last_name,''))) substitute_name,
        TRIM(CONCAT(COALESCE(ap.first_name,''),' ',COALESCE(ap.last_name,''))) approver_name,
        TRIM(CONCAT(COALESCE(pn.first_name,''),' ',COALESCE(pn.last_name,''))) pending_approver_name
      FROM requests r LEFT JOIN users su ON su.id=r.substitute_user_id
      LEFT JOIN users ap ON ap.id=r.approver_id LEFT JOIN users pn ON pn.id=r.pending_on
      WHERE r.user_id=? ORDER BY r.id DESC LIMIT 100", [$u['id']]));
  }
  return _req_decorate_my_requests(Db::all("SELECT $sel,TRIM(CONCAT(COALESCE(ap.first_name,''),' ',COALESCE(ap.last_name,''))) approver_name,
      TRIM(CONCAT(COALESCE(pn.first_name,''),' ',COALESCE(pn.last_name,''))) pending_approver_name
      FROM requests r LEFT JOIN users ap ON ap.id=r.approver_id LEFT JOIN users pn ON pn.id=r.pending_on
      WHERE r.user_id=? ORDER BY r.id DESC LIMIT 100",[$u['id']]));
});

// Ù„ØºÙˆ Ø¯Ø±Ø®ÙˆØ§Ø³Øª ØªÙˆØ³Ø· Ø®ÙˆØ¯ Ú©Ø§Ø±Ø¨Ø± (Ø¯Ø± Ø­Ø§Ù„Øª pending ÛŒØ§ approved)
route('POST', '/api/my/requests/{id}/cancel', function($p,$b,$u){
  $r = Db::one("SELECT * FROM requests WHERE id=? AND user_id=?", [$p['id'], $u['id']]);
  if (!$r) Http::error('ÛŒØ§ÙØª Ù†Ø´Ø¯', 404);
  if (!in_array($r['status'], ['pending','approved'])) Http::error('Ø§ÛŒÙ† Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù‚Ø§Ø¨Ù„ Ù„ØºÙˆ Ù†ÛŒØ³Øª', 422);
  Db::run("UPDATE requests SET status='canceled', pending_on=NULL WHERE id=?", [$p['id']]);
  // Ø§Ú¯Ø± Ø´ÛŒÙØª Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ†ÛŒ Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø³Ø§Ø®ØªÙ‡ Ø´Ø¯Ù‡ Ø¨ÙˆØ¯ØŒ ØºÛŒØ±ÙØ¹Ø§Ù„ Ø´ÙˆØ¯
  try { Db::run("UPDATE substitute_assignments SET status='canceled' WHERE request_id=?", [$p['id']]); } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
  return ['ok'=>true, 'status'=>'canceled'];
});

// Ú©Ø§Ø±ØªØ§Ø¨Ù„ ØªØ£ÛŒÛŒØ¯: Ø¯Ø±Ø®ÙˆØ§Ø³Øªâ€ŒÙ‡Ø§ÛŒÛŒ Ú©Ù‡ Ø¯Ø± Ø§Ù†ØªØ¸Ø§Ø± ØªØ£ÛŒÛŒØ¯ Ø§ÛŒÙ† Ú©Ø§Ø±Ø¨Ø± Ø§Ø³Øª
route('GET', '/api/my/request-inbox', fn($p,$b,$u) => Db::all(
  "SELECT r.id,r.type,r.unit,r.from_jdate,r.to_jdate,r.the_date,r.from_time,r.to_time,r.manual_kind,r.in_time,r.out_time,r.minutes,r.reason,r.status,r.created_at,r.attachment_name,r.selfie_data,
     CONCAT(us.first_name,' ',us.last_name) requester
   FROM requests r JOIN users us ON us.id=r.user_id
   WHERE r.pending_on=? AND r.status='pending' ORDER BY r.id DESC", [$u['id']]));

// Ø¬Ø²Ø¦ÛŒØ§Øª ÛŒÚ© Ø¯Ø±Ø®ÙˆØ§Ø³Øª (Ø´Ø§Ù…Ù„ Ù¾ÛŒÙˆØ³Øª/Ø³Ù„ÙÛŒ)
route('GET', '/api/requests/{id}', function($p,$b,$u){
  $r = Db::one("SELECT r.*, CONCAT(us.first_name,' ',us.last_name) requester FROM requests r JOIN users us ON us.id=r.user_id WHERE r.id=?", [$p['id']]);
  if (!$r) Http::error('ÛŒØ§ÙØª Ù†Ø´Ø¯',404);
  if ((int)$r['user_id']!==(int)$u['id'] && !_req_admin_can_view_request($u,$r)) Http::error('Ø¯Ø³ØªØ±Ø³ÛŒ Ù†Ø¯Ø§Ø±ÛŒØ¯',403);
  return $r;
});

// ØªØ£ÛŒÛŒØ¯/Ø±Ø¯ Ø¯Ø±Ø®ÙˆØ§Ø³Øª
route('POST', '/api/requests/{id}/decide', function($p,$b,$u){
  $r = Db::one("SELECT * FROM requests WHERE id=?", [$p['id']]);
  if (!$r) Http::error('ÛŒØ§ÙØª Ù†Ø´Ø¯',404);
  if ((int)($r['pending_on']??0)!==(int)$u['id'] && !_req_is_root_admin($u)) Http::error('Ø§ÛŒÙ† Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø¯Ø± Ú©Ø§Ø±ØªØ§Ø¨Ù„ Ø´Ù…Ø§ Ù†ÛŒØ³Øª',403);
  if($r['status']!=='pending')Http::error('Ø§ÛŒÙ† Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø¯ÛŒÚ¯Ø± Ø¯Ø± Ø§Ù†ØªØ¸Ø§Ø± Ø¨Ø±Ø±Ø³ÛŒ Ù†ÛŒØ³Øª',409);
  $decision = $b['decision'] ?? ''; // approve / reject
  if (!in_array($decision,['approve','reject'])) Http::error('ØªØµÙ…ÛŒÙ… Ù†Ø§Ù…Ø¹ØªØ¨Ø±',400);
  if ($decision === 'reject') {
    _req_approval_steps_ensure();
    $pdo=Db::pdo();$pdo->beginTransaction();
    try{
      $updated=Db::run("UPDATE requests SET status='rejected', approver_id=?, approver_note=?, decided_at=NOW(), pending_on=NULL WHERE id=? AND status='pending'", [$u['id'],$b['note']??null,$p['id']]);
      if($updated->rowCount()!==1)Http::error('ÙˆØ¶Ø¹ÛŒØª Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù‡Ù…â€ŒØ²Ù…Ø§Ù† ØªØºÛŒÛŒØ± Ú©Ø±Ø¯Ù‡ Ø§Ø³Øª',409);
      _req_record_approval_step((int)$p['id'],(int)$u['id'],'rejected',$b['note']??null);
      $pdo->commit();
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
    _req_notify_decision($r,'rejected',$b['note']??'',(int)$p['id']);
    return ['ok'=>true,'status'=>'rejected'];
  }
  // ØªØ£ÛŒÛŒØ¯: Ø¯Ø± Ø­Ø§Ù„Øª Ø³Ù„Ø³Ù„Ù‡â€ŒÙ…Ø±Ø§ØªØ¨ÛŒØŒ Ø§Ú¯Ø± ØªØ£ÛŒÛŒØ¯Ú©Ù†Ù†Ø¯Ù‡Ù” ÙØ¹Ù„ÛŒ Ø®ÙˆØ¯Ø´ Ù…Ù‚Ø§Ù… Ø¨Ø§Ù„Ø§Ø¯Ø³Øª Ø¯Ø§Ø±Ø¯ØŒ Ø¨Ù‡ Ø§Ùˆ Ø§Ø±Ø¬Ø§Ø¹ Ø´ÙˆØ¯
  $options=_req_policy_options($r['user_id']);
  $mode=$options['approval_mode']??'hierarchical';
  $next = null;
  if ($mode === 'hierarchical') {
    $mgrs = _user_managers($u['id']);
    $next = $mgrs[0] ?? null;
  }
  if ($next) {
    _req_approval_steps_ensure();
    $pdo=Db::pdo();$pdo->beginTransaction();
    try{
      $updated=Db::run("UPDATE requests SET pending_on=?, approver_id=? WHERE id=? AND status='pending'", [$next,$u['id'],$p['id']]);
      if($updated->rowCount()!==1)Http::error('ÙˆØ¶Ø¹ÛŒØª Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù‡Ù…â€ŒØ²Ù…Ø§Ù† ØªØºÛŒÛŒØ± Ú©Ø±Ø¯Ù‡ Ø§Ø³Øª',409);
      _req_record_approval_step((int)$p['id'],(int)$u['id'],'forwarded',$b['note']??null);
      $pdo->commit();
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
    Push::send([$next],'Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø¨Ø±Ø§ÛŒ ØªØ£ÛŒÛŒØ¯ Ù†Ù‡Ø§ÛŒÛŒ','',['type'=>'request','request_id'=>$p['id']]);
    return ['ok'=>true,'status'=>'forwarded','to'=>$next];
  }
  // Commit the decision and its attendance/substitute records together.
  _req_prepare_approval_storage($r);
  _req_approval_steps_ensure();
  $pdo=Db::pdo();$pdo->beginTransaction();
  try{
    $updated=Db::run("UPDATE requests SET status='approved', approver_id=?, approver_note=?, decided_at=NOW(), pending_on=NULL WHERE id=? AND status='pending'",[$u['id'],$b['note']??null,$p['id']]);
    if($updated->rowCount()!==1)Http::error('ÙˆØ¶Ø¹ÛŒØª Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù‡Ù…â€ŒØ²Ù…Ø§Ù† ØªØºÛŒÛŒØ± Ú©Ø±Ø¯Ù‡ Ø§Ø³Øª',409);
    _req_apply_approval_effects($r,(int)$p['id']);
    _req_record_approval_step((int)$p['id'],(int)$u['id'],'approved',$b['note']??null);
    $pdo->commit();
  }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
  _req_notify_substitute($r,(int)$p['id']);
  _req_notify_decision($r,'approved',$b['note']??'',(int)$p['id']);
  return ['ok'=>true,'status'=>'approved'];
});

// Ø¹Ù…Ù„Ú©Ø±Ø¯ Ø±ÙˆØ²Ø§Ù†Ù‡Ù” Ø®ÙˆØ¯Ù Ú©Ø§Ø±Ø¨Ø± â€” Ù…Ø¯Ù„ ÙÛŒÙ†ØªÙˆØŒ Ø¨Ø±Ø§ÛŒ ØªØ¨ Â«Ø¹Ù…Ù„Ú©Ø±Ø¯ Ø±ÙˆØ²Ø§Ù†Ù‡Â» Ø¯Ø± Ø§Ù¾ Ùˆ ÙˆØ¨â€ŒØ§Ù¾
route('GET', '/api/my/daily-performance', function($p,$b,$u){
  [$ty,$tm,$td]=array_slice(gregorian_to_jalali(date('Y'),date('m'),date('d')),0,3);
  $jdate=preg_replace('/\//','-',trim((string)($_GET['date']??'')));
  if(!preg_match('/^\d{4}-\d{2}-\d{2}$/',$jdate)) $jdate=sprintf('%04d-%02d-%02d',$ty,$tm,$td);
  $shift=_active_user_shift_assignment($u['id'],$jdate);
  if(!$shift) return ['date'=>$jdate,'data'=>null,'message'=>'Ø¨Ø±Ø§ÛŒ Ø´Ù…Ø§ Ø´ÛŒÙØª ÙØ¹Ø§Ù„ÛŒ ØªØ¹Ø±ÛŒÙ Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª.'];
  $dayRow=null;
  if(($shift['type']??'')==='advanced') $dayRow=Db::one("SELECT jdate,segments,is_off,day_config FROM shift_days WHERE shift_id=? AND jdate=? LIMIT 1",[(int)$shift['id'],$jdate]);
  $cal=ShiftCalc::calendarDay($jdate);
  $rows=_attendance_rows_for_jdate($u['id'],$jdate);
  $sessions=array_map(fn($r)=>['in'=>strtotime($r['check_in']),'out'=>$r['check_out']?strtotime($r['check_out']):null,'clip_start'=>strtotime($r['_clip_start']??'1970-01-01 00:00:00'),'clip_end'=>strtotime($r['_clip_end']??'2999-01-01 00:00:00'),'gps_invalid'=>$r['_gps_invalid']??[]],$rows);
  $w=ShiftCalc::dayWork($shift,$jdate,$dayRow,$sessions,ShiftCalc::effectiveHoliday($jdate));
  // Ø¨Ø§Ø²Ù‡â€ŒÙ‡Ø§ÛŒ Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø±Ø§ Ø¨Ù‡â€ŒØµÙˆØ±Øª Ø§Ø¬ØªÙ…Ø§Ø¹ Ø¨Ø§Ø²Ù‡â€ŒÙ‡Ø§ Ø­Ø³Ø§Ø¨ Ú©Ù†Ø› Ù‡Ù…â€ŒÙ¾ÙˆØ´Ø§Ù†ÛŒ Ø¬Ù„Ø³Ø§Øª/Ø±ÙˆÛŒØ¯Ø§Ø¯Ù‡Ø§ Ù†Ø¨Ø§ÛŒØ¯ Ø¯ÙˆØ¨Ø§Ø± Ú©Ø³Ø± Ø´ÙˆØ¯.
  $gpsInvalidRanges=[];
  foreach($rows as $gpsRow) {
    foreach(($gpsRow['_gps_invalid']??[]) as $gpsRange) {
      $gpsA=(int)($gpsRange[0]??0); $gpsB=(int)($gpsRange[1]??0);
      if($gpsB>$gpsA) $gpsInvalidRanges[]=[$gpsA,$gpsB];
    }
  }
  usort($gpsInvalidRanges,static fn($a,$b)=>(int)$a[0]<=>(int)$b[0]);
  $gpsInvalidSeconds=0; $gpsRangeStart=null; $gpsRangeEnd=null;
  foreach($gpsInvalidRanges as $gpsRange) {
    if($gpsRangeStart===null) { $gpsRangeStart=$gpsRange[0]; $gpsRangeEnd=$gpsRange[1]; continue; }
    if($gpsRange[0]<=$gpsRangeEnd) $gpsRangeEnd=max($gpsRangeEnd,$gpsRange[1]);
    else { $gpsInvalidSeconds+=max(0,$gpsRangeEnd-$gpsRangeStart); $gpsRangeStart=$gpsRange[0]; $gpsRangeEnd=$gpsRange[1]; }
  }
  if($gpsRangeStart!==null) $gpsInvalidSeconds+=max(0,$gpsRangeEnd-$gpsRangeStart);
  $w['gps_work_required']=_gps_work_required();
  $w['gps_invalid_min']=(int)ceil(max(0,$gpsInvalidSeconds)/60);
  $weekday=_jweekday_name((int)substr($jdate,0,4),(int)substr($jdate,5,2),(int)substr($jdate,8,2));
  $isCalHoliday=!empty($cal['is_official_holiday'])||!empty($cal['is_manual_holiday']);
  return ['date'=>$jdate,'weekday'=>$weekday,'shift_title'=>$shift['title']??'Ø´ÛŒÙØª Ú©Ø§Ø±ÛŒ','shift_type'=>$shift['type']??'','holiday'=>$isCalHoliday,'holiday_title'=>$cal['title']??'', 'sessions'=>$rows,'data'=>$w];
});

// Ø¨Ø±Ù†Ø§Ù…Ù‡Ù” Ø´ÛŒÙØª Ú©Ø§Ø±ÛŒ Ú©Ø§Ø±Ø¨Ø± â€” Ø¨Ø§Ø²Ù‡Ù” Ø¢ÛŒÙ†Ø¯Ù‡ Ø¨Ø±Ø§ÛŒ ØªØ¨ Â«Ø´ÛŒÙØª Ú©Ø§Ø±ÛŒÂ»
route('GET', '/api/my/shift-schedule', function($p,$b,$u){
  [$gy,$gm,$gd]=[date('Y'),date('m'),date('d')];
  [$jy,$jm,$jd]=array_slice(gregorian_to_jalali((int)$gy,(int)$gm,(int)$gd),0,3);
  $todayJ=sprintf('%04d-%02d-%02d',$jy,$jm,$jd);

  // MONTH_START_MKTIME_ORDER_FIX:
  // jalali_to_gregorian returns [year, month, day], while mktime needs [month, day, year].
  // Never spread [gy,gm,gd] directly into mktime; that previously collapsed the month range.
  [$monthStartGy,$monthStartGm,$monthStartGd]=jalali_to_gregorian($jy,$jm,1);
  $ts=mktime(12,0,0,(int)$monthStartGm,(int)$monthStartGd,(int)$monthStartGy);

  $nextJy=$jy; $nextJm=$jm+1;
  if($nextJm>12){$nextJm=1;$nextJy++;}
  [$nextGy,$nextGm,$nextGd]=jalali_to_gregorian($nextJy,$nextJm,1);
  $nextTs=mktime(12,0,0,(int)$nextGm,(int)$nextGd,(int)$nextGy);
  $daysCount=max(1,(int)round(($nextTs-$ts)/86400));

  $days=[]; $displayShift=null; $userId=(int)$u['id'];
  for($i=0;$i<$daysCount;$i++){
    $gt=getdate($ts+($i*86400));
    [$y,$m,$d]=array_slice(gregorian_to_jalali($gt['year'],$gt['mon'],$gt['mday']),0,3);
    $j=sprintf('%04d-%02d-%02d',$y,$m,$d);

    // Ù‡Ø± Ø±ÙˆØ² Ø§Ø² Ø±ÙˆÛŒ Ø§Ù†ØªØ³Ø§Ø¨ Ù…Ø¹ØªØ¨Ø± Ù‡Ù…Ø§Ù† ØªØ§Ø±ÛŒØ® Ù…Ø­Ø§Ø³Ø¨Ù‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯Ø›
    // Ø´ÛŒÙØª Ø±ÙˆØ² Ø¬Ø§Ø±ÛŒ Ø¨Ù‡ Ø±ÙˆØ²Ù‡Ø§ÛŒÛŒ Ú©Ù‡ Ù‡ÛŒÚ† Ø§Ù†ØªØ³Ø§Ø¨ÛŒ Ù†Ø¯Ø§Ø±Ù†Ø¯ ØªØ¹Ù…ÛŒÙ… Ø¯Ø§Ø¯Ù‡ Ù†Ù…ÛŒâ€ŒØ´ÙˆØ¯.
    $dayShift=_active_user_shift_assignment($userId,$j);
    if($displayShift===null && $dayShift) $displayShift=$dayShift;
    $dr=null;
    if($dayShift && (($dayShift['type']??'')==='advanced')){
      $dr=Db::one("SELECT jdate,segments,is_off,day_config FROM shift_days WHERE shift_id=? AND jdate=? LIMIT 1",[(int)$dayShift['id'],$j]);
    }
    $mins=$dayShift ? max(0,(int)ShiftCalc::expectedMinutes($dayShift,$j,$dr)) : 0;
    $cal=ShiftCalc::calendarDay($j);
    $isCalHoliday=!empty($cal['is_official_holiday'])||!empty($cal['is_manual_holiday']);
    $noShift=!$dayShift;
    $days[]=[
      'date'=>$j,
      'weekday'=>_jweekday_name($y,$m,$d),
      'is_today'=>($j===$todayJ),
      'shift_title'=>$dayShift['title']??'',
      'minutes'=>$mins,
      'is_off'=>$noShift||(bool)($dr['is_off']??false)||$mins<=0,
      'is_no_shift'=>$noShift,
      'is_holiday'=>$isCalHoliday,
      'is_friday'=>ShiftCalc::isFriday($j),
      'holiday_title'=>$cal['title']??''
    ];
  }
  return [
    'shift'=>$displayShift?['id'=>(int)$displayShift['id'],'title'=>$displayShift['title']??'Ø´ÛŒÙØª Ú©Ø§Ø±ÛŒ','type'=>$displayShift['type']??'']:null,
    'days'=>$days,
    'message'=>$displayShift?null:'Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ù…Ø§Ù‡ Ø´ÛŒÙØª ÙØ¹Ø§Ù„ÛŒ ØªØ¹Ø±ÛŒÙ Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª.'
  ];
});
route('GET', '/api/my/work-summary', function($p,$b,$u){
  $jy=(int)($_GET['year']??0); $jm=(int)($_GET['month']??0);
  [$todayY,$todayM,$todayD]=array_slice(gregorian_to_jalali((int)date('Y'),(int)date('m'),(int)date('d')),0,3);
  if(!$jy){$jy=$todayY;$jm=$todayM;}
  $todayJ=sprintf('%04d-%02d-%02d',$todayY,$todayM,$todayD);
  $throughJdate=($jy===$todayY&&$jm===$todayM)?$todayJ:null;
  // Self-service must not recalculate every staff member's monthly attendance.
  $rows = _shift_month_report($jy,$jm,$throughJdate,(int)$u['id']);
  $throughDate=$throughJdate?:sprintf('%04d-%02d-%02d',$jy,$jm,ShiftCalc::jMonthDays($jy,$jm));
  foreach($rows as $r) if($r['user_id']==$u['id']) return ['year'=>$jy,'month'=>$jm,'through_jdate'=>$throughDate,'data'=>$r];
  return ['year'=>$jy,'month'=>$jm,'through_jdate'=>$throughDate,'data'=>null];
});

// Ú¯Ø²Ø§Ø±Ø´ Ù…Ø±Ø®ØµÛŒ Ù¾Ø±Ø³Ù†Ù„ Ø¨Ø± Ø§Ø³Ø§Ø³ snapshot Ø±Ø³Ù…ÛŒ Ø§Ú©Ø³Ù„ Ùˆ Ø³ÙˆØ§Ø¨Ù‚ Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø³Ø§Ù…Ø§Ù†Ù‡.
function _ensure_personnel_leave_snapshots(){
  Db::run("CREATE TABLE IF NOT EXISTS personnel_leave_snapshots (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    personnel_code VARCHAR(40) NOT NULL,
    personnel_name VARCHAR(160) NOT NULL,
    period_year SMALLINT UNSIGNED NOT NULL,
    period_month TINYINT UNSIGNED NOT NULL,
    through_jdate VARCHAR(10) NOT NULL,
    source_reported_at VARCHAR(20) NULL,
    monthly_used_min INT NOT NULL DEFAULT 0,
    monthly_used_count INT NOT NULL DEFAULT 0,
    yearly_used_min INT NOT NULL DEFAULT 0,
    yearly_used_count INT NOT NULL DEFAULT 0,
    monthly_balance_min INT NOT NULL DEFAULT 0,
    yearly_balance_min INT NOT NULL DEFAULT 0,
    monthly_allowed_min INT NOT NULL DEFAULT 0,
    yearly_allowed_min INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_personnel_leave_snapshot (period_year,period_month,personnel_code,personnel_name),
    KEY idx_personnel_leave_user_period (user_id,period_year,period_month),
    KEY idx_personnel_leave_period (period_year,period_month)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function _personnel_leave_report_need($u){
  $row=Db::one("SELECT value FROM app_settings WHERE `key`='role_perms' LIMIT 1");
  if(!$row)return; // Ø¨Ø¯ÙˆÙ† Ù¾ÛŒÚ©Ø±Ø¨Ù†Ø¯ÛŒØŒ Ù‡Ù…Ø§Ù†Ù†Ø¯ Ù…Ù†ÙˆÛŒ Ù¾Ù†Ù„ØŒ Ù‡Ù…Ù‡Ù” Ø¢ÛŒØªÙ…â€ŒÙ‡Ø§ Ø¯Ø± Ø¯Ø³ØªØ±Ø³â€ŒØ§Ù†Ø¯.
  $cfg=json_decode((string)$row['value'],true);$rid=(string)($u['role_id']??'');
  if(!is_array($cfg)||!array_key_exists($rid,$cfg))return;
  $items=is_array($cfg[$rid])?$cfg[$rid]:[];
  if(!in_array('leavereport',$items,true))Http::error('Ø¯Ø³ØªØ±Ø³ÛŒ Ú¯Ø²Ø§Ø±Ø´ Ù…Ø±Ø®ØµÛŒ Ø¨Ø±Ø§ÛŒ Ø³Ù…Øª Ø´Ù…Ø§ ÙØ¹Ø§Ù„ Ù†ÛŒØ³Øª',403);
}

route('GET', '/api/admin/personnel-leave-report', function($p,$b,$u){
  _personnel_leave_report_need($u);
  _ensure_personnel_leave_snapshots();
  $periods=Db::all("SELECT period_year AS year,period_month AS month,MAX(through_jdate) AS through_jdate,MAX(source_reported_at) AS source_reported_at
    FROM personnel_leave_snapshots GROUP BY period_year,period_month ORDER BY period_year DESC,period_month DESC");
  $year=(int)($_GET['year']??0);$month=(int)($_GET['month']??0);
  if(($year===0)!==($month===0))Http::error('Ø³Ø§Ù„ Ùˆ Ù…Ø§Ù‡ Ú¯Ø²Ø§Ø±Ø´ Ø±Ø§ Ø¨Ø§ Ù‡Ù… Ù…Ø´Ø®Øµ Ú©Ù†ÛŒØ¯',422);
  if($year===0&&$periods){$year=(int)$periods[0]['year'];$month=(int)$periods[0]['month'];}
  if($year&&($year<1300||$year>1500||$month<1||$month>12))Http::error('Ø¯ÙˆØ±Ù‡Ù” Ú¯Ø²Ø§Ø±Ø´ Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª',422);
  $sql="SELECT s.id AS snapshot_id,s.user_id,s.personnel_code,s.personnel_name,
      COALESCE(NULLIF(CONCAT_WS(' ',u.first_name,u.last_name),''),s.personnel_name) AS name,
      r.title AS role_title,s.period_year,s.period_month,s.through_jdate,s.source_reported_at,
      s.monthly_used_min,s.monthly_used_count,s.yearly_used_min,s.yearly_used_count,
      s.monthly_balance_min,s.yearly_balance_min,s.monthly_allowed_min,s.yearly_allowed_min
    FROM personnel_leave_snapshots s LEFT JOIN users u ON u.id=s.user_id LEFT JOIN roles r ON r.id=u.role_id
    WHERE s.period_year=? AND s.period_month=?";
  $args=[$year,$month];$snapshotId=(int)($_GET['snapshot_id']??0);
  if($snapshotId>0){$sql.=" AND s.id=?";$args[]=$snapshotId;}
  $sql.=" ORDER BY COALESCE(u.last_name,s.personnel_name),s.personnel_code,s.id";
  $rows=$year?Db::all($sql,$args):[];
  $details=[];$selected=$rows?($rows[0]):null;
  if($snapshotId>0&&$selected&&!empty($selected['user_id'])){
    $yearStart=sprintf('%04d-01-01',$year);$through=ShiftCalc::normJdate($selected['through_jdate'])?:sprintf('%04d-%02d-31',$year,$month);
    $details=Db::all("SELECT id,type,unit,from_jdate,to_jdate,the_date,from_time,to_time,minutes,status,reason,approver_note,created_at,decided_at
      FROM requests WHERE user_id=? AND type IN('annual','sick','unpaid')
        AND COALESCE(NULLIF(REPLACE(from_jdate,'/','-'),''),NULLIF(REPLACE(the_date,'/','-'),''))<=?
        AND COALESCE(NULLIF(REPLACE(to_jdate,'/','-'),''),NULLIF(REPLACE(the_date,'/','-'),''),NULLIF(REPLACE(from_jdate,'/','-'),''))>=?
      ORDER BY COALESCE(NULLIF(REPLACE(from_jdate,'/','-'),''),NULLIF(REPLACE(the_date,'/','-'),'')) DESC,id DESC LIMIT 500",
      [(int)$selected['user_id'],$through,$yearStart]);
  }
  return ['year'=>$year,'month'=>$month,'periods'=>$periods,'through_jdate'=>$selected['through_jdate']??($periods[0]['through_jdate']??null),
    'source_reported_at'=>$selected['source_reported_at']??($periods[0]['source_reported_at']??null),'rows'=>$rows,
    'selected'=>$selected,'requests'=>$details,'requests_available'=>!empty($selected['user_id'])];
},false,ADMIN);

// Ù…Ø§Ù†Ø¯Ù‡ Ù…Ø±Ø®ØµÛŒ/Ù…Ø§Ù…ÙˆØ±ÛŒØª/Ø§Ø¶Ø§ÙÙ‡â€ŒÚ©Ø§Ø± ÛŒÚ© Ú©Ø§Ø±Ø¨Ø± (Ø³Ù‚Ù Ù…Ù†Ù‡Ø§ÛŒ Ù…ØµØ±Ù)
function _req_balance($uid){
  _ensure_requests_table();
  [$jy,$jm] = array_slice(gregorian_to_jalali(date('Y'),date('m'),date('d')),0,2);
  $officialSnapshot = null;
  try {
    _ensure_personnel_leave_snapshots();
    $officialSnapshot = Db::one("SELECT period_year,period_month,through_jdate,source_reported_at,
        monthly_used_min,monthly_balance_min,monthly_allowed_min,
        yearly_used_min,yearly_balance_min,yearly_allowed_min
      FROM personnel_leave_snapshots
      WHERE user_id=? AND period_year<=?
      ORDER BY period_year DESC,period_month DESC,id DESC LIMIT 1", [(int)$uid,$jy]);
    if ($officialSnapshot) {
      foreach (['period_year','period_month','monthly_used_min','monthly_balance_min','monthly_allowed_min','yearly_used_min','yearly_balance_min','yearly_allowed_min'] as $key) {
        $officialSnapshot[$key] = (int)$officialSnapshot[$key];
      }
    }
  } catch (\Throwable $e) { error_log('leave balance snapshot lookup failed: '.$e->getMessage()); }
  $policy=_req_active_work_policy($uid);
  if(!$policy)Http::error('Ø¨Ø±Ø§ÛŒ Ù†Ù…Ø§ÛŒØ´ Ù…Ø§Ù†Ø¯Ù‡ØŒ Ø§Ø¨ØªØ¯Ø§ Ø³ÛŒØ§Ø³Øª Ú©Ø§Ø±ÛŒ ÙØ¹Ø§Ù„ Ø¨Ù‡ Ø§ÛŒÙ† Ú©Ø§Ø±Ø¨Ø± ØªØ®ØµÛŒØµ Ø¯Ù‡ÛŒØ¯.',422);
  return ['year'=>$jy,'month'=>$jm,'balance'=>_req_policy_balance($uid,$policy,$jy,$jm),'official_snapshot'=>$officialSnapshot,
    'policy_id'=>(int)$policy['id'],'policy_title'=>$policy['title']??'','source'=>'work_policy'];
}

// Ù…Ø§Ù†Ø¯Ù‡ Ù…Ø±Ø®ØµÛŒ Ø®ÙˆØ¯Ù Ú©Ø§Ø±Ø¨Ø± (Ø§Ù¾)
route('GET', '/api/my/leave-balance', fn($p,$b,$u) => _req_balance($u['id']));

// Ù…Ø§Ù†Ø¯Ù‡ Ù…Ø±Ø®ØµÛŒ ÛŒÚ© Ú©Ø§Ø±Ø¨Ø± (Ø§Ø¯Ù…ÛŒÙ†)
route('GET', '/api/admin/users/{id}/leave-balance', fn($p,$b,$u) => _req_balance((int)$p['id']), false, ADMIN);

// Ø«Ø¨Øª Ø¯Ø±Ø®ÙˆØ§Ø³Øª ØªÙˆØ³Ø· Ù…Ø¯ÛŒØ±/Ø§Ù¾Ø±Ø§ØªÙˆØ± Ø¨Ø±Ø§ÛŒ Ù¾Ø±Ø³Ù†Ù„ Ø§Ù†ØªØ®Ø§Ø¨â€ŒØ´Ø¯Ù‡
route('POST', '/api/admin/requests', function($p,$b,$u){
  // Ù…ÙˆØ¯Ø§Ù„ Ø¬Ø²Ø¦ÛŒØ§Øª Ú¯Ø²Ø§Ø±Ø´ ØªØ±Ø¯Ø¯ ØªÙˆØ³Ø· Ù…Ø¯ÛŒØ± Ø¨Ø±Ø§ÛŒ Ù¾Ø±Ø³Ù†Ù„ Ø§Ù†ØªØ®Ø§Ø¨â€ŒØ´Ø¯Ù‡ Ø«Ø¨Øª Ù…ÛŒâ€ŒØ´ÙˆØ¯Ø›
  // Ù‡ÙˆÛŒØª Ø«Ø¨Øªâ€ŒÚ©Ù†Ù†Ø¯Ù‡ Ø¨Ø±Ø§ÛŒ approver Ø§Ø² Ù†Ø´Ø³Øª Ø¬Ø§Ø±ÛŒ Ø®ÙˆØ§Ù†Ø¯Ù‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯.
  $directApprove = !empty($b['direct_approve']);
  $uid = (int)($b['user_id']??0);
  if(!$uid || !Db::one("SELECT id FROM users WHERE id=? AND is_active=1",[$uid])) Http::error('Ù¾Ø±Ø³Ù†Ù„ Ø§Ù†ØªØ®Ø§Ø¨â€ŒØ´Ø¯Ù‡ Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª',422);
  $type=(string)($b['type']??'');
  if(!in_array($type,['annual','sick','mission','overtime'],true)) Http::error('Ù†ÙˆØ¹ Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª',400);
  $unit=($b['unit']??'daily')==='hourly'?'hourly':'daily';
  $normalizeReqJ=function($v){
    $s=strtr(trim((string)$v),['Û°'=>'0','Û±'=>'1','Û²'=>'2','Û³'=>'3','Û´'=>'4','Ûµ'=>'5','Û¶'=>'6','Û·'=>'7','Û¸'=>'8','Û¹'=>'9','Ù '=>'0','Ù¡'=>'1','Ù¢'=>'2','Ù£'=>'3','Ù¤'=>'4','Ù¥'=>'5','Ù¦'=>'6','Ù§'=>'7','Ù¨'=>'8','Ù©'=>'9']);
    $s=str_replace(['/','.', '_',' '],'-',$s);
    if(!preg_match('/^(\\d{4})-(\\d{1,2})-(\\d{1,2})$/',$s,$m)) return false;
    $y=(int)$m[1];$mo=(int)$m[2];$d=(int)$m[3];
    if($y<1300||$y>1500||$mo<1||$mo>12||$d<1||$d>31)return false;
    $norm=sprintf('%04d-%02d-%02d',$y,$mo,$d);
    $ts=j_to_ts($norm);
    return ($ts===false||$ts===null)?false:$norm;
  };
  $from=$normalizeReqJ($b['from_jdate']??$b['the_date']??'');
  $to=$normalizeReqJ($b['to_jdate']??$from);
  $the=$normalizeReqJ($b['the_date']??$from);
  if($from===false) Http::error('ØªØ§Ø±ÛŒØ® Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª',422);
  if($to===false) Http::error('ØªØ§Ø±ÛŒØ® Ù¾Ø§ÛŒØ§Ù† Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª',422);
  if($the===false) Http::error('ØªØ§Ø±ÛŒØ® Ø§ØµÙ„ÛŒ Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª',422);
  if($unit==='hourly'){
    $ft=trim((string)($b['from_time']??'')); $tt=trim((string)($b['to_time']??''));
    if(!preg_match('/^([01]\\d|2[0-3]):[0-5]\\d$/',$ft)||!preg_match('/^([01]\\d|2[0-3]):[0-5]\\d$/',$tt)) Http::error('Ø³Ø§Ø¹Øª Ø´Ø±ÙˆØ¹ Ùˆ Ù¾Ø§ÛŒØ§Ù† Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª',422);
    if($ft>=$tt) Http::error('Ø³Ø§Ø¹Øª Ù¾Ø§ÛŒØ§Ù† Ø¨Ø§ÛŒØ¯ Ø¨Ø¹Ø¯ Ø§Ø² Ø³Ø§Ø¹Øª Ø´Ø±ÙˆØ¹ Ø¨Ø§Ø´Ø¯',422);
    $minutes=(int)substr($tt,0,2)*60+(int)substr($tt,3,2)-(int)substr($ft,0,2)*60-(int)substr($ft,3,2);
  } else {
    $ft=null; $tt=null; $minutes=480;
    $df=j_to_ts($from); $dt=j_to_ts($to);
    if($df===false||$dt===false||$dt<$df) Http::error('Ø¨Ø§Ø²Ù‡ ØªØ§Ø±ÛŒØ® Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª',422);
    $minutes=max(1,(int)(($dt-$df)/86400)+1)*480;
  }
  $reason=trim((string)($b['reason']??''))?:null;

  // Ø¬Ù„ÙˆÚ¯ÛŒØ±ÛŒ Ù‚Ø·Ø¹ÛŒ Ø§Ø² Ø«Ø¨Øª Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù…Ø±Ø®ØµÛŒ ØªÚ©Ø±Ø§Ø±ÛŒ Ø¨Ø±Ø§ÛŒ Ù‡Ù…Ø§Ù† Ù¾Ø±Ø³Ù†Ù„ Ùˆ Ù‡Ù…Ø§Ù† Ø¨Ø§Ø²Ù‡.
  // Ø¯Ø±Ø®ÙˆØ§Ø³Øªâ€ŒÙ‡Ø§ÛŒ Ø±Ø¯/Ù„ØºÙˆØ´Ø¯Ù‡ Ø¢Ø²Ø§Ø¯ Ù‡Ø³ØªÙ†Ø¯Ø› Ø¯Ø±Ø®ÙˆØ§Ø³Øª pending/approved Ù‡Ù…Ù¾ÙˆØ´Ø§Ù† Ø¨Ø§ÛŒØ¯ Ø®Ø·Ø§ÛŒ 409 Ø¨Ø¯Ù‡Ø¯.
  $duplicate = Db::one(
    "SELECT id,type,unit,from_jdate,to_jdate,the_date,from_time,to_time,minutes,status
       FROM requests
      WHERE user_id=?
        AND type=?
        AND status IN ('pending','approved')
        AND COALESCE(NULLIF(from_jdate,''),NULLIF(the_date,'')) <= ?
        AND COALESCE(NULLIF(to_jdate,''),NULLIF(the_date,''),NULLIF(from_jdate,'')) >= ?
      ORDER BY id DESC LIMIT 1",
    [$uid,$type,$to,$from]
  );
  if($duplicate){
    $dupFrom=$duplicate['from_jdate'] ?: ($duplicate['the_date'] ?: $from);
    $dupTo=$duplicate['to_jdate'] ?: ($duplicate['the_date'] ?: $dupFrom);
    if($unit!=='hourly' || ($duplicate['unit']??'')!=='hourly'){
      Http::error('Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ù¾Ø±Ø³Ù†Ù„ Ø¯Ø± Ø§ÛŒÙ† ØªØ§Ø±ÛŒØ®/Ø¨Ø§Ø²Ù‡ØŒ Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù…Ø±Ø®ØµÛŒ Ù‚Ø¨Ù„Ø§Ù‹ Ø«Ø¨Øª Ø´Ø¯Ù‡ Ø§Ø³Øª.',409);
    }
    // Ø¯Ùˆ Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø³Ø§Ø¹ØªÛŒ ÙÙ‚Ø· Ø¯Ø± ØµÙˆØ±Øª Ù‡Ù…Ù¾ÙˆØ´Ø§Ù†ÛŒ Ø²Ù…Ø§Ù†ÛŒ ØªÚ©Ø±Ø§Ø±ÛŒ Ù…Ø­Ø³ÙˆØ¨ Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯.
    $dft=trim((string)($duplicate['from_time']??''));
    $dtt=trim((string)($duplicate['to_time']??''));
    if($dft!=='' && $dtt!=='' && $ft!=='' && $tt!==''){
      $overlap=($ft<$dtt && $tt>$dft);
      if($overlap) Http::error('Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ù¾Ø±Ø³Ù†Ù„ Ø¯Ø± Ø§ÛŒÙ† ØªØ§Ø±ÛŒØ® Ùˆ Ø¨Ø§Ø²Ù‡Ù” Ø³Ø§Ø¹ØªÛŒØŒ Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù‚Ø¨Ù„Ø§Ù‹ Ø«Ø¨Øª Ø´Ø¯Ù‡ Ø§Ø³Øª.',409);
    }
  }

  if($directApprove){
    $id=Db::insert("INSERT INTO requests(user_id,type,unit,from_jdate,to_jdate,the_date,from_time,to_time,minutes,reason,status,approver_id,approver_note,decided_at,pending_on)
      VALUES(?,?,?,?,?,?,?,?,?,?, 'approved', ?, ?, NOW(), NULL)",
      [$uid,$type,$unit,$from,$to,$the,$ft,$tt,$minutes,$reason,(int)$u['id'],'ØªØ£ÛŒÛŒØ¯ ÙÙˆØ±ÛŒ ØªÙˆØ³Ø· Ø«Ø¨Øªâ€ŒÚ©Ù†Ù†Ø¯Ù‡']);
    return ['id'=>$id,'status'=>'approved','minutes'=>$minutes,'requester_id'=>$uid,'approver_id'=>(int)$u['id']];
  }
  $approver=_req_approver($uid);
  $id=Db::insert("INSERT INTO requests(user_id,type,unit,from_jdate,to_jdate,the_date,from_time,to_time,minutes,reason,pending_on)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)",[$uid,$type,$unit,$from,$to,$the,$ft,$tt,$minutes,$reason,$approver]);
  if($approver) Push::send([$approver],'Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø¬Ø¯ÛŒØ¯ Ø¨Ø±Ø§ÛŒ ØªØ£ÛŒÛŒØ¯',['annual'=>'Ù…Ø±Ø®ØµÛŒ Ø§Ø³ØªØ­Ù‚Ø§Ù‚ÛŒ','sick'=>'Ù…Ø±Ø®ØµÛŒ Ø§Ø³ØªØ¹Ù„Ø§Ø¬ÛŒ','mission'=>'Ù…Ø§Ù…ÙˆØ±ÛŒØª','overtime'=>'Ø§Ø¶Ø§ÙÙ‡â€ŒÚ©Ø§Ø±'][$type]??'Ø¯Ø±Ø®ÙˆØ§Ø³Øª',['type'=>'request','request_id'=>$id]);
  return ['id'=>$id,'status'=>'pending','minutes'=>$minutes];
}, false, ADMIN);

// Storage DDL runs before the decision transaction (MySQL DDL implicitly commits).
function _req_prepare_approval_storage(array $request){
  if(_req_substitute_eligible($request)&&!empty($request['substitute_user_id']))Db::run("CREATE TABLE IF NOT EXISTS substitute_assignments (id INT AUTO_INCREMENT PRIMARY KEY, substitute_user_id INT NOT NULL, request_id INT NOT NULL, absent_user_id INT NOT NULL, from_date VARCHAR(10) NOT NULL, to_date VARCHAR(10) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'active', created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_sub_user (substitute_user_id), INDEX idx_sub_dates (from_date, to_date)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}
function _req_substitute_eligible(array $request){
  return ($request['type']??'')==='annual'&&($request['unit']??'daily')==='daily';
}
function _req_apply_approval_effects(array $request,int $id){
  if($request['type']==='manual'){
    if(empty($request['in_time'])&&empty($request['out_time']))Http::error('Ø¯Ø±Ø®ÙˆØ§Ø³Øª ØªØ±Ø¯Ø¯ Ø¯Ø³ØªÛŒ Ø³Ø§Ø¹Øª ÙˆØ±ÙˆØ¯ ÛŒØ§ Ø®Ø±ÙˆØ¬ Ù†Ø¯Ø§Ø±Ø¯',422);
    foreach(['in_time','out_time'] as $key){
      if(!empty($request[$key])&&!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d(?::00)?$/',(string)$request[$key]))Http::error('Ø³Ø§Ø¹Øª ØªØ±Ø¯Ø¯ Ø¯Ø³ØªÛŒ Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª',422);
    }
  }
  if(_req_substitute_eligible($request)&&!empty($request['substitute_user_id'])){
    if((int)$request['substitute_user_id']===(int)$request['user_id'])Http::error('Ù†ÛŒØ±ÙˆÛŒ Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† Ù†Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ø¯ Ø®ÙˆØ¯ Ø¯Ø±Ø®ÙˆØ§Ø³Øªâ€ŒÚ©Ù†Ù†Ø¯Ù‡ Ø¨Ø§Ø´Ø¯',422);
    if(!Db::one("SELECT id FROM users WHERE id=? AND is_active=1 FOR UPDATE",[(int)$request['substitute_user_id']]))Http::error('Ù†ÛŒØ±ÙˆÛŒ Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† ÙØ¹Ø§Ù„ Ù†ÛŒØ³Øª',422);
    $from=$request['from_jdate']?:$request['the_date'];
    $to=$request['to_jdate']?:($request['the_date']?:$from);
    $conflict=Db::one("SELECT sa.id FROM substitute_assignments sa JOIN requests rq ON rq.id=sa.request_id AND rq.status='approved' AND rq.type='annual' AND COALESCE(rq.unit,'daily')='daily' WHERE sa.substitute_user_id=? AND sa.status='active' AND sa.request_id<>? AND sa.from_date<=? AND sa.to_date>=? LIMIT 1 FOR UPDATE",[(int)$request['substitute_user_id'],$id,$to,$from]);
    if($conflict)Http::error('Ù†ÛŒØ±ÙˆÛŒ Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† Ø¯Ø± Ø§ÛŒÙ† Ø¨Ø§Ø²Ù‡ Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ†ÛŒ ØªØ£ÛŒÛŒØ¯Ø´Ø¯Ù‡Ù” Ø¯ÛŒÚ¯Ø±ÛŒ Ø¯Ø§Ø±Ø¯',409);
    if($from&&$to&&!Db::one("SELECT id FROM substitute_assignments WHERE request_id=? AND status='active'",[$id]))
      Db::run("INSERT INTO substitute_assignments(substitute_user_id,request_id,absent_user_id,from_date,to_date,status) VALUES(?,?,?,?,?,'active')",[(int)$request['substitute_user_id'],$id,(int)$request['user_id'],$from,$to]);
  }
  if($request['type']==='manual'&&!empty($request['in_time'])){
    $day=_req_policy_date($request['the_date']??'');
    if(!$day)Http::error('ØªØ§Ø±ÛŒØ® ØªØ±Ø¯Ø¯ Ø¯Ø³ØªÛŒ Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª',422);
    $in=$day->format('Y-m-d').' '.substr($request['in_time'],0,5).':00';
    $out=!empty($request['out_time'])?$day->format('Y-m-d').' '.substr($request['out_time'],0,5).':00':null;
    if($out&&$out<$in)$out=(new DateTimeImmutable($out))->modify('+1 day')->format('Y-m-d H:i:s');
    Db::run("INSERT INTO staff_attendance(user_id,check_in,check_out,method) VALUES(?,?,?, 'manual')",[(int)$request['user_id'],$in,$out]);
  }elseif($request['type']==='manual'&&!empty($request['out_time'])){
    $day=_req_policy_date($request['the_date']??'');
    if(!$day)Http::error('ØªØ§Ø±ÛŒØ® ØªØ±Ø¯Ø¯ Ø¯Ø³ØªÛŒ Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª',422);
    $out=$day->format('Y-m-d').' '.substr($request['out_time'],0,5).':00';
    $open=Db::one("SELECT id FROM staff_attendance WHERE user_id=? AND check_out IS NULL AND check_in>=? AND check_in<=? ORDER BY check_in DESC LIMIT 1 FOR UPDATE",[(int)$request['user_id'],$day->format('Y-m-d').' 00:00:00',$out]);
    if(!$open)Http::error('Ø¨Ø±Ø§ÛŒ Ø«Ø¨Øª Ø®Ø±ÙˆØ¬ØŒ ÙˆØ±ÙˆØ¯ Ø¨Ø§Ø² Ø¯Ø± ØªØ§Ø±ÛŒØ® Ø¯Ø±Ø®ÙˆØ§Ø³Øª ÛŒØ§ÙØª Ù†Ø´Ø¯Ø› Ø§Ø¨ØªØ¯Ø§ ÙˆØ±ÙˆØ¯ Ø±Ø§ Ø«Ø¨Øª ÛŒØ§ Ø§ØµÙ„Ø§Ø­ Ú©Ù†ÛŒØ¯.',422);
    Db::run("UPDATE staff_attendance SET check_out=? WHERE id=? AND check_out IS NULL",[$out,(int)$open['id']]);
  }
}

function _req_notify_decision(array $request,string $status,string $note,int $id){
  try{Push::send([(int)$request['user_id']],$status==='approved'?'Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø´Ù…Ø§ ØªØ£ÛŒÛŒØ¯ Ø´Ø¯':'Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø´Ù…Ø§ Ø±Ø¯ Ø´Ø¯',$note,['type'=>'request','request_id'=>$id]);}catch(Throwable $e){error_log('request decision push failed');}
  try{_req_notify_sms($request,$status,$note);}catch(Throwable $e){error_log('request decision sms failed');}
}
function _req_notify_substitute(array $request,int $id){
  if(!_req_substitute_eligible($request)||empty($request['substitute_user_id']))return;
  try{Push::send([(int)$request['substitute_user_id']],'Ø´ÛŒÙØª Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ†ÛŒ','Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ†ÛŒ Ø´Ù…Ø§ Ø¨Ø±Ø§ÛŒ Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù…Ø±Ø®ØµÛŒ ØªØ£ÛŒÛŒØ¯ Ø´Ø¯.',['type'=>'substitute_shift','request_id'=>$id]);}catch(Throwable $e){error_log('substitute shift notification failed');}
}

// Ø¯Ø³ØªØ±Ø³ÛŒ Ú©Ø§Ù…Ù„ Ø¨Ù‡ Ù‡Ù…Ù‡Ù” Ù…Ø±Ø§Ø­Ù„ ØµØ±ÙØ§Ù‹ Ù…ØªØ¹Ù„Ù‚ Ø¨Ù‡ Ø³Ù…Øª Â«Ù…Ø¯ÛŒØ± Ú©Ù„Â» Ø§Ø³ØªØŒ Ù†Ù‡ Ù†Ø§Ù… Ú©Ø§Ø±Ø¨Ø±ÛŒ admin.
function _req_is_root_admin(array $viewer): bool {
  return in_array(preg_replace('/\s+/u','',trim((string)($viewer['role_title']??''))),['Ù…Ø¯ÛŒØ±Ú©Ù„'],true);
}
function _req_admin_can_view_request(array $viewer,array $request): bool {
  if(_req_is_root_admin($viewer))return true;
  $uid=(int)($viewer['id']??0);if($uid<=0)return false;
  if((int)($request['pending_on']??0)===$uid||(int)($request['approver_id']??0)===$uid)return true;
  return _db_table_exists_safe('request_approval_steps')
    && (bool)Db::one('SELECT id FROM request_approval_steps WHERE request_id=? AND actor_id=? LIMIT 1',[(int)($request['id']??0),$uid]);
}
// Shared filters keep the on-screen report and XLSX export consistent.
function _req_report_filter(array $query,?array $viewer=null){
  $cond=[];$args=[];
  if($viewer!==null&&!_req_is_root_admin($viewer)){
    $uid=(int)($viewer['id']??0);
    $scope='(r.pending_on=? OR r.approver_id=?';$args[]=$uid;$args[]=$uid;
    if(_db_table_exists_safe('request_approval_steps')){$scope.=' OR EXISTS (SELECT 1 FROM request_approval_steps ras WHERE ras.request_id=r.id AND ras.actor_id=?)';$args[]=$uid;}
    $cond[]=$scope.')';
  }
  if(!empty($query['user_id'])){$cond[]='r.user_id=?';$args[]=(int)$query['user_id'];}
  foreach(['type'=>['annual','sick','unpaid','mission','overtime','manual'],'status'=>['pending','approved','rejected','canceled']] as $key=>$allowed){
    $value=trim((string)($query[$key]??''));
    if($value==='')continue;
    if(!in_array($value,$allowed,true))Http::error('ÙÛŒÙ„ØªØ± Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª',422);
    $cond[]="r.$key=?";$args[]=$value;
  }
  foreach(['from','to'] as $key){
    $value=trim((string)($query[$key]??''));
    if($value==='')continue;
    $date=DateTimeImmutable::createFromFormat('!Y-m-d',$value);
    if(!$date||$date->format('Y-m-d')!==$value)Http::error('ØªØ§Ø±ÛŒØ® Ø«Ø¨Øª Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª',422);
    $cond[]=$key==='from'?'r.created_at>=?':'r.created_at<?';
    $args[]=$key==='from'?$value.' 00:00:00':$date->modify('+1 day')->format('Y-m-d').' 00:00:00';
  }
  if(!empty($query['from'])&&!empty($query['to'])&&$query['from']>$query['to'])Http::error('Ø§Ø¨ØªØ¯Ø§ÛŒ Ø¨Ø§Ø²Ù‡ Ø¨Ø§ÛŒØ¯ Ù‚Ø¨Ù„ Ø§Ø² Ù¾Ø§ÛŒØ§Ù† Ø¢Ù† Ø¨Ø§Ø´Ø¯',422);
  $q=trim((string)($query['q']??''));
  if($q!==''){$cond[]="(CONCAT_WS(' ',us.first_name,us.last_name) LIKE ? OR r.reason LIKE ? OR CAST(r.id AS CHAR)=?)";$args[]='%'.$q.'%';$args[]='%'.$q.'%';$args[]=$q;}
  return [$cond?'WHERE '.implode(' AND ',$cond):'',$args];
}
function _req_report_csv_cell($value){
  $value=(string)($value??'');
  return preg_match('/^[\s]*[=+@-]/u',$value)?"'".$value:$value;
}

// Consumption through the end of today, separate from quota reserved for future leave.
function _req_leave_usage_through(array $rows,array $balance,$throughJdate){
  $through=_req_policy_date($throughJdate);
  if(!$through)Http::error('ØªØ§Ø±ÛŒØ® Ù…Ø­Ø§Ø³Ø¨Ù‡Ù” Ù…Ø±Ø®ØµÛŒ Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª',422);
  $year=substr($throughJdate,0,4);$month=substr($throughJdate,0,7);
  $yearStart=_req_policy_date($year.'-01-01');$monthStart=_req_policy_date($month.'-01');
  $end=$through->modify('+1 day');$used=[];$seen=[];
  foreach($rows as $row){
    if(($row['status']??$row['balance_status']??'')!=='approved')continue;
    $type=$row['type']??'';if(!in_array($type,['annual','sick','unpaid'],true))continue;
    $span=_req_policy_span($row);if(!$span)continue;
    $key=$type.'|'.$span['unit'].'|'.$span['start']->format('Y-m-d H:i').'|'.$span['days'].'|'.$span['minutes'];
    if(isset($seen[$key]))continue;$seen[$key]=true;
    if($span['unit']==='hourly'){
      $stop=$span['start']->modify('+'.$span['minutes'].' minutes');
      foreach(['year'=>$yearStart,'month'=>$monthStart] as $period=>$start){
        $a=max($start->getTimestamp(),$span['start']->getTimestamp());$b=min($end->getTimestamp(),$stop->getTimestamp());
        $used[$type][$period]=($used[$type][$period]??0)+max(0,($b-$a)/60);
      }
    }else{
      $stop=$span['start']->modify('+'.$span['days'].' days');
      foreach(['year'=>$yearStart,'month'=>$monthStart] as $period=>$start){
        $a=$span['start']>$start?$span['start']:$start;$b=$stop<$end?$stop:$end;
        $used[$type][$period]=($used[$type][$period]??0)+($b>$a?(int)$a->diff($b)->days*480:0);
      }
    }
  }
  $types=[];
  foreach(['annual','sick','unpaid'] as $type){
    $quota=$balance[$type.'_hourly']??[];$value=[];
    foreach(['month','year'] as $period){
      $value['used_hours_'.$period]=round(($used[$type][$period]??0)/60,2);
      $value['remaining_hours_'.$period]=$quota['left_'.$period]??null;
      $value['pending_hours_'.$period]=$quota['pending_'.$period]??0;
      $value['future_approved_hours_'.$period]=max(0,round(($quota['used_'.$period]??0)-$value['used_hours_'.$period],2));
    }$types[$type]=$value;
  }
  return ['through_jdate'=>$throughJdate,'types'=>$types];
}

function _req_edit_state(array $request){
  $out=[];
  foreach(['id','user_id','type','unit','status','from_jdate','to_jdate','the_date','from_time','to_time','in_time','out_time','manual_kind','minutes','reason','approver_note','substitute_user_id','approver_id','decided_at','pending_on'] as $key){
    $v=$request[$key]??null;
    if(in_array($key,['id','user_id','minutes','substitute_user_id','approver_id','pending_on'],true))$v=$v===null?null:(int)$v;
    $out[$key]=$v;
  }
  return $out;
}
function _req_edit_token(array $request){return hash('sha256',json_encode(_req_edit_state($request),JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR));}
function _req_edit_storage(){
  static $ready=false;if($ready)return;
  Db::run("CREATE TABLE IF NOT EXISTS request_edit_history (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,request_id INT NOT NULL,actor_id INT NOT NULL,edit_reason VARCHAR(1500) NOT NULL,before_json LONGTEXT NOT NULL,after_json LONGTEXT NOT NULL,created_at DATETIME DEFAULT CURRENT_TIMESTAMP,INDEX request_idx(request_id,id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");$ready=true;
}
function _req_edit_payload(array $old,array $body){
  require_once __DIR__.'/IranCalendar.php';
  foreach(['type','unit','user_id','status'] as $key)if(array_key_exists($key,$body)&&(string)$body[$key] !== (string)($old[$key]??''))Http::error('Ù†ÙˆØ¹ØŒ ÙˆØ§Ø­Ø¯ØŒ Ø¯Ø±Ø®ÙˆØ§Ø³Øªâ€ŒÚ©Ù†Ù†Ø¯Ù‡ Ùˆ ÙˆØ¶Ø¹ÛŒØª ØªØ£ÛŒÛŒØ¯ Ø¯Ø± Ø§ÛŒÙ† ÙØ±Ù… Ù‚Ø§Ø¨Ù„ ØªØºÛŒÛŒØ± Ù†ÛŒØ³ØªÙ†Ø¯.',422);
  $r=$old;
  $date=static function($value){$value=IranCalendar::normalize($value);if(!$value||!_req_policy_date($value))Http::error('ØªØ§Ø±ÛŒØ® Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª.',422);return $value;};
  $single=$old['type']==='manual'||($old['unit']??'daily')==='hourly';
  if($single){
    $r['the_date']=$date($body['the_date']??$old['the_date']??$old['from_jdate']??'');
    if($old['type']!=='manual'){if(!empty($old['from_jdate']))$r['from_jdate']=$r['the_date'];if(!empty($old['to_jdate']))$r['to_jdate']=$r['the_date'];}
  }else{
    $r['from_jdate']=$date($body['from_jdate']??$old['from_jdate']??$old['the_date']??'');
    $r['to_jdate']=$date($body['to_jdate']??$old['to_jdate']??$r['from_jdate']);
    if($r['to_jdate']<$r['from_jdate'])Http::error('ØªØ§Ø±ÛŒØ® Ù¾Ø§ÛŒØ§Ù† Ù†Ø¨Ø§ÛŒØ¯ Ù‚Ø¨Ù„ Ø§Ø² ØªØ§Ø±ÛŒØ® Ø´Ø±ÙˆØ¹ Ø¨Ø§Ø´Ø¯.',422);
    if(!empty($old['the_date']))$r['the_date']=$r['from_jdate'];
  }
  if($old['type']==='manual'){
    foreach(['in_time','out_time'] as $key){
      $value=trim((string)($body[$key]??$old[$key]??''));
      if((bool)$value!==(bool)($old[$key]??''))Http::error('Ù†ÙˆØ¹ Ø«Ø¨Øª ÙˆØ±ÙˆØ¯/Ø®Ø±ÙˆØ¬ Ø¯Ø± ÙˆÛŒØ±Ø§ÛŒØ´ ØªØ±Ø¯Ø¯ Ø¯Ø³ØªÛŒ Ø«Ø§Ø¨Øª Ø§Ø³Øª.',422);
      if($value!==''&&!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d(?::00)?$/D',$value))Http::error('Ø³Ø§Ø¹Øª ØªØ±Ø¯Ø¯ Ø¯Ø³ØªÛŒ Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª.',422);
      $r[$key]=$value===''?null:substr($value,0,5);
    }
    if(empty($r['in_time'])&&empty($r['out_time']))Http::error('Ø¯Ø±Ø®ÙˆØ§Ø³Øª ØªØ±Ø¯Ø¯ Ø¯Ø³ØªÛŒ Ø³Ø§Ø¹Øª ÙˆØ±ÙˆØ¯ ÛŒØ§ Ø®Ø±ÙˆØ¬ Ù†Ø¯Ø§Ø±Ø¯.',422);
  }elseif(($old['unit']??'daily')==='hourly'){
    foreach(['from_time','to_time'] as $key)$r[$key]=trim((string)($body[$key]??$old[$key]??''));
    if(!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/D',$r['from_time'])||!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/D',$r['to_time']))Http::error('Ø³Ø§Ø¹Øª Ø´Ø±ÙˆØ¹ Ùˆ Ù¾Ø§ÛŒØ§Ù† Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª.',422);
    if($r['from_time']>=$r['to_time'])Http::error('Ø³Ø§Ø¹Øª Ø´Ø±ÙˆØ¹ Ø¨Ø§ÛŒØ¯ Ú©ÙˆÚ†Ú©â€ŒØªØ± Ø§Ø² Ø³Ø§Ø¹Øª Ù¾Ø§ÛŒØ§Ù† Ø¨Ø§Ø´Ø¯.',422);
  }
  foreach(['reason','approver_note'] as $key){$text=trim((string)($body[$key]??$old[$key]??''));if(mb_strlen($text)>4000)Http::error('ØªÙˆØ¶ÛŒØ­Ø§Øª Ø¨ÛŒØ´ Ø§Ø² Ø­Ø¯ Ù…Ø¬Ø§Ø² Ø§Ø³Øª.',422);$r[$key]=$text===''?null:$text;}
  if(array_key_exists('substitute_user_id',$body)){
    if($body['substitute_user_id']!==null&&$body['substitute_user_id']!==''&&((!is_int($body['substitute_user_id'])&&!is_string($body['substitute_user_id']))||!preg_match('/^(?:0|[1-9]\d*)$/D',(string)$body['substitute_user_id'])))Http::error('Ø´Ù†Ø§Ø³Ù‡Ù” Ù†ÛŒØ±ÙˆÛŒ Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª.',422);
    $r['substitute_user_id']=(int)$body['substitute_user_id']?:null;
    if($r['substitute_user_id']&&!array_key_exists('substitute_user_id',$old))Http::error('Ø³ØªÙˆÙ† Ù†ÛŒØ±ÙˆÛŒ Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† Ø¯Ø± Ù¾Ø§ÛŒÚ¯Ø§Ù‡ Ø¯Ø§Ø¯Ù‡ Ø¢Ù…Ø§Ø¯Ù‡ Ù†ÛŒØ³ØªØ› Ø§Ø¨ØªØ¯Ø§ Ø³Ø§Ø®ØªØ§Ø± Ø¯Ø±Ø®ÙˆØ§Ø³Øªâ€ŒÙ‡Ø§ Ø¨Ù‡â€ŒØ±ÙˆØ²Ø±Ø³Ø§Ù†ÛŒ Ø´ÙˆØ¯.',422);
    if(!_req_substitute_eligible($r)&&$r['substitute_user_id'])Http::error('Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† ÙÙ‚Ø· Ø¨Ø±Ø§ÛŒ Ù…Ø±Ø®ØµÛŒ Ø§Ø³ØªØ­Ù‚Ø§Ù‚ÛŒ Ø±ÙˆØ²Ø§Ù†Ù‡ Ù‚Ø§Ø¨Ù„ Ø§Ù†ØªØ®Ø§Ø¨ Ø§Ø³Øª.',422);
  }
  $span=_req_policy_span($r);if(!$span)Http::error('ØªØ§Ø±ÛŒØ® ÛŒØ§ Ø¨Ø§Ø²Ù‡Ù” Ø³Ø§Ø¹Øª Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª.',422);
  $r['minutes']=$r['type']==='manual'?0:$span['minutes'];return $r;
}
/** Update an unambiguous existing punch in place, preserving its ID and other evidence. */
function _req_edit_manual_effect(array $old,array $new){
  $day=_req_policy_date($old['the_date']??'');if(!$day)Http::error('ØªØ§Ø±ÛŒØ® ØªØ±Ø¯Ø¯ Ù‚Ø¨Ù„ÛŒ Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³ØªØ› Ø§Ø¨ØªØ¯Ø§ Ú¯Ø²Ø§Ø±Ø´ ØªØ±Ø¯Ø¯ Ø¨Ø±Ø±Ø³ÛŒ Ø´ÙˆØ¯.',409);
  $uid=(int)$old['user_id'];$g=$day->format('Y-m-d');$params=[$uid];
  if(!empty($old['in_time'])){
    $params[]=$g.' '.substr($old['in_time'],0,5).':00';$where="check_in=? AND (method='manual' OR method LIKE 'manual|%')";
    if(!empty($old['out_time'])){$out=$g.' '.substr($old['out_time'],0,5).':00';if($out<$params[1])$out=(new DateTimeImmutable($out,new DateTimeZone('Asia/Tehran')))->modify('+1 day')->format('Y-m-d H:i:s');$where.=' AND check_out=?';$params[]=$out;}
  }else{$where='check_out=? AND check_in>=? AND check_in<=?';$params[]=$g.' '.substr($old['out_time'],0,5).':00';$params[]=$g.' 00:00:00';$params[]=$params[1];}
  $matches=Db::all('SELECT id,user_id,check_in,check_out,method FROM staff_attendance WHERE user_id=? AND '.$where.' ORDER BY id LIMIT 2 FOR UPDATE',$params);
  if(count($matches)!==1)Http::error('ØªØ±Ø¯Ø¯ Ù…Ø±ØªØ¨Ø· Ø¨Ù‡â€ŒØµÙˆØ±Øª ÛŒÚ©ØªØ§ ÛŒØ§ÙØª Ù†Ø´Ø¯ ÛŒØ§ Ø¨Ø¹Ø¯Ø§Ù‹ Ø§ØµÙ„Ø§Ø­ Ø´Ø¯Ù‡ Ø§Ø³ØªØ› Ø¬Ø²Ø¦ÛŒØ§Øª Ú¯Ø²Ø§Ø±Ø´ ØªØ±Ø¯Ø¯ Ø±Ø§ Ø¨Ø±Ø±Ø³ÛŒ Ú©Ù†ÛŒØ¯.',409);
  $p=$matches[0];$newDay=_req_policy_date($new['the_date'])->format('Y-m-d');
  $in=!empty($old['in_time'])?$newDay.' '.$new['in_time'].':00':$p['check_in'];
  $out=!empty($old['out_time'])?$newDay.' '.$new['out_time'].':00':$p['check_out'];
  if(empty($old['in_time'])&&substr($p['check_in'],0,10)!==$newDay)Http::error('ØªØ§Ø±ÛŒØ® Ø¯Ø±Ø®ÙˆØ§Ø³ØªÙ ÙÙ‚Ø· Ø®Ø±ÙˆØ¬ Ø¨Ø§ÛŒØ¯ Ù‡Ù…Ø§Ù† Ø±ÙˆØ² ÙˆØ±ÙˆØ¯ Ù…Ø±ØªØ¨Ø· Ø¨Ø§Ø´Ø¯Ø› Ø¨Ø±Ø§ÛŒ Ø¬Ø§Ø¨Ù‡â€ŒØ¬Ø§ÛŒÛŒ Ø±ÙˆØ²ØŒ Ú¯Ø²Ø§Ø±Ø´ ØªØ±Ø¯Ø¯ Ø±Ø§ Ø§ØµÙ„Ø§Ø­ Ú©Ù†ÛŒØ¯.',422);
  if(!empty($old['in_time'])&&!empty($old['out_time'])&&$out<$in)$out=(new DateTimeImmutable($out,new DateTimeZone('Asia/Tehran')))->modify('+1 day')->format('Y-m-d H:i:s');
  if($out&&$out<=$in)Http::error('Ø®Ø±ÙˆØ¬ Ù…Ø±ØªØ¨Ø· Ø¨Ø§ÛŒØ¯ Ø¨Ø¹Ø¯ Ø§Ø² ÙˆØ±ÙˆØ¯ Ø¨Ø§Ø´Ø¯.',422);
  $changes=['before'=>['id'=>(int)$p['id'],'check_in'=>$p['check_in'],'check_out'=>$p['check_out']],'after'=>['id'=>(int)$p['id'],'check_in'=>$in,'check_out'=>$out]];
  if($in===$p['check_in']&&$out===$p['check_out'])return $changes;
  $overlap=Db::one("SELECT id FROM staff_attendance WHERE user_id=? AND id<>? AND check_in<COALESCE(?,'9999-12-31 23:59:59') AND COALESCE(check_out,'9999-12-31 23:59:59')>? LIMIT 1 FOR UPDATE",[$uid,(int)$p['id'],$out,$in]);
  if($overlap)Http::error('Ø¨Ø§Ø²Ù‡Ù” Ø¬Ø¯ÛŒØ¯ ØªØ±Ø¯Ø¯ Ø¨Ø§ ØªØ±Ø¯Ø¯ Ø¯ÛŒÚ¯Ø±ÛŒ Ù‡Ù…Ù¾ÙˆØ´Ø§Ù†ÛŒ Ø¯Ø§Ø±Ø¯.',409);
  $updated=Db::run('UPDATE staff_attendance SET check_in=?,check_out=? WHERE id=? AND user_id=? AND check_in=? AND check_out<=>?',[$in,$out,(int)$p['id'],$uid,$p['check_in'],$p['check_out']]);
  if($updated->rowCount()!==1)Http::error('ØªØ±Ø¯Ø¯ Ù‡Ù…â€ŒØ²Ù…Ø§Ù† ØªØºÛŒÛŒØ± Ú©Ø±Ø¯Ù‡ Ø§Ø³ØªØ› Ø¯ÙˆØ¨Ø§Ø±Ù‡ Ø¨Ø±Ø±Ø³ÛŒ Ú©Ù†ÛŒØ¯.',409);
  return $changes;
}
function _req_edit_approved($id,array $body,array $actor){
  if($id<=0)Http::error('Ø´Ù†Ø§Ø³Ù‡Ù” Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª.',422);
  foreach($body as $value)if($value!==null&&!is_scalar($value))Http::error('Ø³Ø§Ø®ØªØ§Ø± ÙÛŒÙ„Ø¯Ù‡Ø§ÛŒ ÙˆÛŒØ±Ø§ÛŒØ´ Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª.',422);
  $before=Db::one('SELECT * FROM requests WHERE id=?',[$id]);if(!$before)Http::error('Ø¯Ø±Ø®ÙˆØ§Ø³Øª ÛŒØ§ÙØª Ù†Ø´Ø¯.',404);
  if(!_req_admin_can_view_request($actor,$before))Http::error('Ø§ÛŒÙ† Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø¯Ø± Ø¯Ø³ØªØ±Ø³ Ø´Ù…Ø§ Ù†ÛŒØ³Øª.',403);
  if($before['status']!=='approved')Http::error('ÙÙ‚Ø· Ø¯Ø±Ø®ÙˆØ§Ø³Øª ØªØ£ÛŒÛŒØ¯Ø´Ø¯Ù‡ Ø¯Ø± Ø§ÛŒÙ† ÙØ±Ù… Ù‚Ø§Ø¨Ù„ ÙˆÛŒØ±Ø§ÛŒØ´ Ø§Ø³Øª.',409);
  $why=trim((string)($body['edit_reason']??''));if(mb_strlen($why)<3||mb_strlen($why)>500)Http::error('Ø¹Ù„Øª Ø§ØµÙ„Ø§Ø­ Ø±Ø§ Ø¨ÛŒÙ† Û³ ØªØ§ ÛµÛ°Û° Ù†ÙˆÛŒØ³Ù‡ ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯.',422);
  $token=(string)($body['edit_token']??'');if(!preg_match('/^[a-f0-9]{64}$/D',$token))Http::error('Ø§Ø·Ù„Ø§Ø¹Ø§Øª ÙˆÛŒØ±Ø§ÛŒØ´ Ù…Ù†Ù‚Ø¶ÛŒ Ø§Ø³ØªØ› Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø±Ø§ Ø¯ÙˆØ¨Ø§Ø±Ù‡ Ø¨Ø§Ø² Ú©Ù†ÛŒØ¯.',409);
  $lock='khatyar:request-policy:'.(int)$before['user_id'];$locked=Db::one('SELECT GET_LOCK(?,10) acquired',[$lock]);
  if((int)($locked['acquired']??0)!==1)Http::error('Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø¯ÛŒÚ¯Ø±ÛŒ Ø¯Ø± Ø­Ø§Ù„ Ù¾Ø±Ø¯Ø§Ø²Ø´ Ø§Ø³ØªØ› Ø¯ÙˆØ¨Ø§Ø±Ù‡ ØªÙ„Ø§Ø´ Ú©Ù†ÛŒØ¯.',409);
  $pdo=Db::pdo();
  try{
    _zone_leave_requirement_storage();_req_edit_storage();_req_prepare_approval_storage(array_replace($before,['substitute_user_id'=>$body['substitute_user_id']??$before['substitute_user_id']??null]));
    $pdo->beginTransaction();
    $before=Db::one('SELECT * FROM requests WHERE id=? FOR UPDATE',[$id]);
    if(!$before||$before['status']!=='approved'||!hash_equals(_req_edit_token($before),$token))Http::error('Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù‡Ù…â€ŒØ²Ù…Ø§Ù† ØªØºÛŒÛŒØ± Ú©Ø±Ø¯Ù‡ Ø§Ø³ØªØ› Ø¢Ù† Ø±Ø§ Ø¯ÙˆØ¨Ø§Ø±Ù‡ Ø¨Ø§Ø² Ú©Ù†ÛŒØ¯.',409);
    $after=_req_edit_payload($before,$body);
    if(hash_equals(_req_edit_token($before),_req_edit_token($after))){$pdo->commit();return ['id'=>$id,'status'=>'approved','unchanged'=>true];}
    $domain=false;foreach(['from_jdate','to_jdate','the_date','from_time','to_time','in_time','out_time','minutes','substitute_user_id'] as $key)if((string)($before[$key]??'')!==(string)($after[$key]??''))$domain=true;
    $attendance=null;
    if($domain){
      $uid=(int)$before['user_id'];$policy=_req_active_work_policy($uid);if(!$policy)Http::error('Ø§Ø¨ØªØ¯Ø§ Ø³ÛŒØ§Ø³Øª Ú©Ø§Ø±ÛŒ ÙØ¹Ø§Ù„ Ø¨Ù‡ Ø§ÛŒÙ† Ú©Ø§Ø±Ø¨Ø± ØªØ®ØµÛŒØµ Ø¯Ù‡ÛŒØ¯.',422);
      _req_validate_work_policy($uid,$after,$policy,true,$id,null,true);_req_reject_overlap($uid,$after,$id);
      if(_req_substitute_eligible($after)){
        if(_req_leave_substitute_required($uid)&&empty($after['substitute_user_id']))Http::error('Ø¨Ø±Ø§ÛŒ Ù…Ø±Ø®ØµÛŒ Ø§Ø³ØªØ­Ù‚Ø§Ù‚ÛŒ Ø±ÙˆØ²Ø§Ù†Ù‡ Ù†ÛŒØ±ÙˆÛŒ Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† Ù„Ø§Ø²Ù… Ø§Ø³Øª.',422);
        if(!empty($after['substitute_user_id'])){
          if((int)$after['substitute_user_id']===$uid||!Db::one('SELECT id FROM users WHERE id=? AND is_active=1 FOR UPDATE',[(int)$after['substitute_user_id']]))Http::error('Ù†ÛŒØ±ÙˆÛŒ Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† ÙØ¹Ø§Ù„ Ùˆ Ù…Ø¹ØªØ¨Ø± Ø§Ù†ØªØ®Ø§Ø¨ Ú©Ù†ÛŒØ¯.',422);
          $available=_substitute_availability((int)$after['substitute_user_id'],$after['from_jdate'],$after['to_jdate'],$id,false);
          if(!$available['available'])Http::error($available['reason'],409);
        }
      }
      if($after['type']==='manual')$attendance=_req_edit_manual_effect($before,$after);
    }
    $columns=['from_jdate','to_jdate','the_date','from_time','to_time','in_time','out_time','minutes','reason','approver_note'];
    if(array_key_exists('substitute_user_id',$before))$columns[]='substitute_user_id';
    $values=[];foreach($columns as $key)$values[]=$after[$key]??null;$values[]=$id;
    $updated=Db::run("UPDATE requests SET ".implode(',',array_map(static fn($key)=>$key.'=?',$columns))." WHERE id=? AND status='approved'",$values);
    if($updated->rowCount()!==1)Http::error('Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù‡Ù…â€ŒØ²Ù…Ø§Ù† ØªØºÛŒÛŒØ± Ú©Ø±Ø¯Ù‡ Ø§Ø³ØªØ› Ø¯ÙˆØ¨Ø§Ø±Ù‡ Ø¨Ø±Ø±Ø³ÛŒ Ú©Ù†ÛŒØ¯.',409);
    if($domain&&_req_substitute_eligible($after)){
      if(!empty($after['substitute_user_id'])||_db_table_exists_safe('substitute_assignments'))Db::run("UPDATE substitute_assignments SET status='canceled' WHERE request_id=? AND status='active'",[$id]);
      if(!empty($after['substitute_user_id']))_req_apply_approval_effects($after,$id);
    }
    $prior=_req_edit_state($before);$next=_req_edit_state($after);if($attendance){$prior['attendance']=$attendance['before'];$next['attendance']=$attendance['after'];}
    $audit=Db::insert('INSERT INTO request_edit_history(request_id,actor_id,edit_reason,before_json,after_json) VALUES(?,?,?,?,?)',[$id,(int)$actor['id'],$why,json_encode($prior,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),json_encode($next,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
    $pdo->commit();return ['id'=>$id,'status'=>'approved','minutes'=>$after['minutes'],'edit_id'=>$audit,'message'=>'Ø¯Ø±Ø®ÙˆØ§Ø³Øª ØªØ£ÛŒÛŒØ¯Ø´Ø¯Ù‡ Ø§ØµÙ„Ø§Ø­ Ø´Ø¯.'];
  }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}finally{Db::one('SELECT RELEASE_LOCK(?) released',[$lock]);}
}

// Ú¯Ø²Ø§Ø±Ø´ Ø¯Ø±Ø®ÙˆØ§Ø³Øªâ€ŒÙ‡Ø§ Ø¨Ø±Ø§ÛŒ Ø§Ø¯Ù…ÛŒÙ† (Ø¨Ø§ ÙÛŒÙ„ØªØ± Ú©Ø§Ø±Ø¨Ø±/Ù†ÙˆØ¹/ÙˆØ¶Ø¹ÛŒØª/Ø¨Ø§Ø²Ù‡)
route('GET', '/api/admin/requests', function($p,$b,$u){
  [$where,$args]=_req_report_filter($_GET,$u);
  return Db::all("SELECT r.id,r.type,r.unit,r.from_jdate,r.to_jdate,r.the_date,r.from_time,r.to_time,r.in_time,r.out_time,r.minutes,r.reason,r.status,r.approver_note,r.created_at,r.attachment_name,
      CONCAT(us.first_name,' ',us.last_name) requester,
      CONCAT(COALESCE(ap.first_name,''),' ',COALESCE(ap.last_name,'')) approver
    FROM requests r JOIN users us ON us.id=r.user_id LEFT JOIN users ap ON ap.id=r.approver_id
    $where ORDER BY r.id DESC LIMIT 500", $args);
}, false, ADMIN);

// Ø¹Ù…Ù„ÛŒØ§Øª Ù…Ø¯ÛŒØ±ÛŒØªÛŒ Ú¯Ø²Ø§Ø±Ø´ Ø¯Ø±Ø®ÙˆØ§Ø³Øªâ€ŒÙ‡Ø§: ØªØ£ÛŒÛŒØ¯ØŒ Ø±Ø¯ Ùˆ Ø­Ø°Ù
route('GET', '/api/admin/requests/{id}/detail', function($p,$b,$u){
  $id=(int)$p['id'];if($id<=0)Http::error('Ø´Ù†Ø§Ø³Ù‡Ù” Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª',422);
  $row=Db::one("SELECT r.*,CONCAT_WS(' ',us.first_name,us.last_name) requester,
      CONCAT_WS(' ',ap.first_name,ap.last_name) approver,
      CONCAT_WS(' ',pn.first_name,pn.last_name) pending_on_name
    FROM requests r JOIN users us ON us.id=r.user_id LEFT JOIN users ap ON ap.id=r.approver_id
    LEFT JOIN users pn ON pn.id=r.pending_on WHERE r.id=?",[$id]);
  if(!$row)Http::error('Ø¯Ø±Ø®ÙˆØ§Ø³Øª ÛŒØ§ÙØª Ù†Ø´Ø¯',404);
  if(!_req_admin_can_view_request($u,$row))Http::error('Ø§ÛŒÙ† Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø¯Ø± Ø¯Ø³ØªØ±Ø³ Ø´Ù…Ø§ Ù†ÛŒØ³Øª',403);
  $row['edit_token']=_req_edit_token($row);
  $row['edit_history']=_db_table_exists_safe('request_edit_history')?Db::all("SELECT h.id,h.edit_reason,h.created_at,CONCAT_WS(' ',us.first_name,us.last_name) actor FROM request_edit_history h LEFT JOIN users us ON us.id=h.actor_id WHERE h.request_id=? ORDER BY h.id DESC LIMIT 20",[$id]):[];
  $row['substitute_name']=null;$row['substitute_assignment']=null;
  if(!empty($row['substitute_user_id'])){
    $person=Db::one("SELECT CONCAT_WS(' ',first_name,last_name) name FROM users WHERE id=?",[(int)$row['substitute_user_id']]);
    $row['substitute_name']=$person['name']??null;
    if(_db_table_exists_safe('substitute_assignments'))$row['substitute_assignment']=Db::one("SELECT from_date,to_date,status FROM substitute_assignments WHERE request_id=? ORDER BY id DESC LIMIT 1",[$id]);
  }
  return $row;
},false,ADMIN);
route('GET', '/api/admin/requests/{id}/leave-context', function($p,$b,$u){
  $request=Db::one("SELECT id,user_id,type,status,pending_on FROM requests WHERE id=?",[(int)$p['id']]);
  if(!$request)Http::error('Ø¯Ø±Ø®ÙˆØ§Ø³Øª ÛŒØ§ÙØª Ù†Ø´Ø¯',404);
  if(!_req_admin_can_view_request($u,$request))Http::error('Ø§ÛŒÙ† Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø¯Ø± Ø¯Ø³ØªØ±Ø³ Ø´Ù…Ø§ Ù†ÛŒØ³Øª',403);
  if(!in_array($request['type'],['annual','sick','unpaid'],true))Http::error('Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù…Ø±Ø®ØµÛŒ Ù†ÛŒØ³Øª',422);
  $context=_req_balance((int)$request['user_id']);
  $from=_req_policy_date(sprintf('%04d-%02d-01',$context['year'],$context['month']));
  $next=$context['month']===12?sprintf('%04d-01-01',$context['year']+1):sprintf('%04d-%02d-01',$context['year'],$context['month']+1);
  $to=_req_policy_date($next);
  $rows=Db::all("SELECT id,type,unit,from_jdate,to_jdate,the_date,from_time,to_time,minutes,status FROM requests WHERE user_id=? AND type IN ('annual','sick','unpaid') ORDER BY id DESC",[(int)$request['user_id']]);
  $today=_app_jdate_from_time(date('Y-m-d H:i:s'));
  $context['usage_through_today']=_req_leave_usage_through($rows,$context['balance'],str_replace('/','-',$today));
  $context['requests']=array_values(array_filter($rows,static function($row)use($from,$to){$span=_req_policy_span($row);if(!$span)return false;$end=$span['unit']==='hourly'?$span['start']->modify('+'.$span['minutes'].' minutes'):$span['start']->setTime(0,0)->modify('+'.$span['days'].' days');return $span['start']<$to&&$end>$from;}));
  return $context;
},false,ADMIN);
route('POST', '/api/admin/requests/{id}/decision', function($p,$b,$u){
  $id=(int)($p['id']??0); $status=(string)($b['status']??'');
  if(!$id || !in_array($status,['approved','rejected'],true)) Http::error('Ø¹Ù…Ù„ÛŒØ§Øª Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª',400);
  $req=Db::one("SELECT * FROM requests WHERE id=?",[$id]);
  if(!$req) Http::error('Ø¯Ø±Ø®ÙˆØ§Ø³Øª ÛŒØ§ÙØª Ù†Ø´Ø¯',404);
  if(!_req_is_root_admin($u)&&($req['status']!=='pending'||(int)($req['pending_on']??0)!==(int)$u['id']))Http::error('Ø§ÛŒÙ† Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø¯Ø± Ú©Ø§Ø±ØªØ§Ø¨Ù„ Ø´Ù…Ø§ Ù†ÛŒØ³Øª',403);
  if($req['status']!=='pending'&&!($status==='approved'&&$req['status']==='rejected')) Http::error('Ø§ÛŒÙ† Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø¯ÛŒÚ¯Ø± Ø¯Ø± Ø§Ù†ØªØ¸Ø§Ø± Ø¨Ø±Ø±Ø³ÛŒ Ù†ÛŒØ³ØªØ› ÙÙ‡Ø±Ø³Øª Ø±Ø§ ØªØ§Ø²Ù‡â€ŒØ³Ø§Ø²ÛŒ Ú©Ù†ÛŒØ¯.',409);
  if($req['status']===$status) Http::error('ÙˆØ¶Ø¹ÛŒØª Ø§ÛŒÙ† Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù‚Ø¨Ù„Ø§Ù‹ Ø«Ø¨Øª Ø´Ø¯Ù‡ Ø§Ø³Øª',409);
  $note=trim((string)($b['note']??''))?:null;
  if($status==='approved')_req_prepare_approval_storage($req);
  _req_approval_steps_ensure();
  $pdo=Db::pdo();$pdo->beginTransaction();
  try{
  $updated=Db::run("UPDATE requests SET status=?,approver_id=?,approver_note=?,decided_at=NOW(),pending_on=NULL WHERE id=? AND status=?",[$status,(int)$u['id'],$note,$id,$req['status']]);
  if($updated->rowCount()!==1)Http::error('ÙˆØ¶Ø¹ÛŒØª Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù‡Ù…â€ŒØ²Ù…Ø§Ù† ØªØºÛŒÛŒØ± Ú©Ø±Ø¯Ù‡ Ø§Ø³ØªØ› ÙÙ‡Ø±Ø³Øª Ø±Ø§ ØªØ§Ø²Ù‡â€ŒØ³Ø§Ø²ÛŒ Ú©Ù†ÛŒØ¯.',409);
    if($status==='approved')_req_apply_approval_effects($req,$id);
    _req_record_approval_step($id,(int)$u['id'],$status,$note);
    $pdo->commit();
  }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
  if($status==='approved')_req_notify_substitute($req,$id);
  _req_notify_decision($req,$status,$note??'',$id);
  return ['id'=>$id,'status'=>$status,'message'=>$status==='approved'?'Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø¨Ø§ Ù…ÙˆÙÙ‚ÛŒØª ØªØ£ÛŒÛŒØ¯ Ø´Ø¯.':'Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø¨Ø§ Ù…ÙˆÙÙ‚ÛŒØª Ø±Ø¯ Ø´Ø¯.'];
}, false, ADMIN);

route('PUT','/api/admin/requests/{id}',function($p,$b,$u){return _req_edit_approved((int)$p['id'],$b,$u);},false,ADMIN);

// Install after all four request write routes, keeping front-controller deployment independent.
// Cron and standalone report scripts load helpers with a no-op route() and no registry.
if(isset($routes) && is_array($routes)){
foreach($routes as &$policyRoute){
  if(($policyRoute['m']??'')==='POST' && in_array($policyRoute['p']??'',['/api/my/requests','/api/admin/requests','/api/requests/{id}/decide','/api/admin/requests/{id}/decision'],true)){
    $policyRoute['fn']=_req_work_policy_handler($policyRoute['p'],$policyRoute['fn']);
  }
}
unset($policyRoute);
}

route('DELETE', '/api/admin/requests/{id}', function($p,$b,$u){
  $id=(int)($p['id']??0); if(!$id) Http::error('Ø´Ù†Ø§Ø³Ù‡ Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª',400);
  $req=Db::one("SELECT id,status,pending_on,approver_id FROM requests WHERE id=?",[$id]); if(!$req) Http::error('Ø¯Ø±Ø®ÙˆØ§Ø³Øª ÛŒØ§ÙØª Ù†Ø´Ø¯',404);
  if(!_req_admin_can_view_request($u,$req))Http::error('Ø§ÛŒÙ† Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø¯Ø± Ø¯Ø³ØªØ±Ø³ Ø´Ù…Ø§ Ù†ÛŒØ³Øª',403);
  $pdo=Db::pdo();$pdo->beginTransaction();
  try{
    if(!Db::one("SELECT id FROM requests WHERE id=? FOR UPDATE",[$id]))Http::error('Ø¯Ø±Ø®ÙˆØ§Ø³Øª ÛŒØ§ÙØª Ù†Ø´Ø¯',404);
    if(_db_table_exists_safe('substitute_assignments'))Db::run("UPDATE substitute_assignments SET status='canceled' WHERE request_id=?",[$id]);
    Db::run("DELETE FROM requests WHERE id=?",[$id]);
    $pdo->commit();
  }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
  return ['id'=>$id,'deleted'=>true];
}, false, ADMIN);

// Ø®Ø±ÙˆØ¬ÛŒ Ø§Ú©Ø³Ù„ Ú¯Ø²Ø§Ø±Ø´ Ø¯Ø±Ø®ÙˆØ§Ø³Øªâ€ŒÙ‡Ø§ (Ø§Ø¯Ù…ÛŒÙ†)
route('GET', '/api/admin/requests/export', function($p,$b,$u){
  [$where,$args]=_req_report_filter($_GET,$u);
  $rows = Db::all("SELECT r.*, CONCAT(us.first_name,' ',us.last_name) requester,
      CONCAT(COALESCE(ap.first_name,''),' ',COALESCE(ap.last_name,'')) approver
    FROM requests r JOIN users us ON us.id=r.user_id LEFT JOIN users ap ON ap.id=r.approver_id $where ORDER BY r.id DESC LIMIT 5000", $args);
  $TY=['annual'=>'Ù…Ø±Ø®ØµÛŒ Ø§Ø³ØªØ­Ù‚Ø§Ù‚ÛŒ','sick'=>'Ù…Ø±Ø®ØµÛŒ Ø§Ø³ØªØ¹Ù„Ø§Ø¬ÛŒ','unpaid'=>'Ù…Ø±Ø®ØµÛŒ Ø¨Ø¯ÙˆÙ† Ø­Ù‚ÙˆÙ‚','mission'=>'Ù…Ø§Ù…ÙˆØ±ÛŒØª','overtime'=>'Ø§Ø¶Ø§ÙÙ‡â€ŒÚ©Ø§Ø±','manual'=>'ØªØ±Ø¯Ø¯ Ø¯Ø³ØªÛŒ'];
  $ST=['pending'=>'Ø¯Ø± Ø§Ù†ØªØ¸Ø§Ø±','approved'=>'ØªØ£ÛŒÛŒØ¯Ø´Ø¯Ù‡','rejected'=>'Ø±Ø¯Ø´Ø¯Ù‡','canceled'=>'Ù„ØºÙˆØ´Ø¯Ù‡'];
  require_once __DIR__.'/XlsxWriter.php';
  $xw=new XlsxWriter(['Ø´Ù…Ø§Ø±Ù‡ Ø¯Ø±Ø®ÙˆØ§Ø³Øª','Ù†Ø§Ù… Ù¾Ø±Ø³Ù†Ù„','Ù†ÙˆØ¹ Ø¯Ø±Ø®ÙˆØ§Ø³Øª','ÙˆØ§Ø­Ø¯','Ø§Ø² ØªØ§Ø±ÛŒØ®','ØªØ§ ØªØ§Ø±ÛŒØ®','Ø±ÙˆØ²','Ø´Ø±ÙˆØ¹ / ÙˆØ±ÙˆØ¯','Ù¾Ø§ÛŒØ§Ù† / Ø®Ø±ÙˆØ¬','Ù…Ø¯Øª','ÙˆØ¶Ø¹ÛŒØª','Ø¨Ø±Ø±Ø³ÛŒâ€ŒÚ©Ù†Ù†Ø¯Ù‡','ØªÙˆØ¶ÛŒØ­Ø§Øª Ø¯Ø±Ø®ÙˆØ§Ø³Øª','Ù¾Ø§Ø³Ø® Ø¨Ø±Ø±Ø³ÛŒâ€ŒÚ©Ù†Ù†Ø¯Ù‡','Ø²Ù…Ø§Ù† Ø«Ø¨Øª']);
  $xw->setProfessionalStyle(true);
  $xw->setReportHeading('Ø¯Ø±Ø®ÙˆØ§Ø³Øªâ€ŒÙ‡Ø§ÛŒ Ù¾Ø±Ø³Ù†Ù„','Ø®Ø·ÛŒØ§Ø± Â· Ø®Ø±ÙˆØ¬ÛŒ Ù…Ø¯ÛŒØ±ÛŒØªÛŒ Â· '.fa_datetime(date('Y-m-d H:i:s')),'ØªØ¹Ø¯Ø§Ø¯: '.count($rows).' | ÙˆØ¶Ø¹ÛŒØª: '.($ST[$_GET['status']??'']??'Ù‡Ù…Ù‡').' | Ø«Ø¨Øª Ø§Ø²: '.(!empty($_GET['from'])?_app_jdate_from_time($_GET['from'].' 00:00:00'):'â€”').' ØªØ§: '.(!empty($_GET['to'])?_app_jdate_from_time($_GET['to'].' 00:00:00'):'â€”'));
  foreach([12,26,22,12,16,16,16,15,15,16,16,24,58,48,23] as $i=>$width){$xw->setColWidth($i,$width);$xw->setTextCol($i);}
  $hm=fn($m)=>$m===null?'â€”':sprintf('%02d:%02d',intdiv((int)$m,60),(int)$m%60);
  foreach($rows as $r){$rowIndex=$xw->addRow([$r['id'],$r['requester'],$TY[$r['type']]??$r['type'],$r['type']==='manual'?'ØªØ±Ø¯Ø¯ Ø¯Ø³ØªÛŒ':($r['unit']==='hourly'?'Ø³Ø§Ø¹ØªÛŒ':'Ø±ÙˆØ²Ø§Ù†Ù‡'),
    $r['from_jdate']?:$r['the_date'],$r['to_jdate']?:$r['the_date'],$r['the_date'],$r['from_time']?:$r['in_time'],$r['to_time']?:$r['out_time'],
    $r['type']==='manual'?'Ø·Ø¨Ù‚ Ø³Ø§Ø¹Øª ÙˆØ±ÙˆØ¯ Ùˆ Ø®Ø±ÙˆØ¬':($r['unit']==='daily'?round((float)$r['minutes']/480,2).' Ø±ÙˆØ²':$hm($r['minutes'])),$ST[$r['status']]??$r['status'],trim($r['approver'])?:'â€”',$r['reason'],$r['approver_note'],fa_datetime($r['created_at'])]);
    $lines=max(2,(int)ceil(mb_strlen((string)$r['reason'],'UTF-8')/48),(int)ceil(mb_strlen((string)$r['approver_note'],'UTF-8')/40));
    $xw->setRowHeight($rowIndex,min(8,$lines)*18);
  }
  $xw->output('Ø¯Ø±Ø®ÙˆØ§Ø³ØªÙ‡Ø§ÛŒ_Ù¾Ø±Ø³Ù†Ù„.xlsx','Ø¯Ø±Ø®ÙˆØ§Ø³Øªâ€ŒÙ‡Ø§ÛŒ Ù¾Ø±Ø³Ù†Ù„');
}, false, ADMIN);

// Ø¯Ø§Ø´Ø¨ÙˆØ±Ø¯ Ù„Ø­Ø¸Ù‡â€ŒØ§ÛŒ Ø­Ø¶ÙˆØ± Ù¾Ø±Ø³Ù†Ù„
function _live_staff_dashboard(){
  [$jy,$jm,$jd] = gregorian_to_jalali((int)date('Y'),(int)date('m'),(int)date('d'));
  $jdate = sprintf('%04d-%02d-%02d',$jy,$jm,$jd);
  $dayStart = date('Y-m-d 00:00:00');
  $dayEnd = date('Y-m-d 00:00:00', strtotime('+1 day'));

  $staff = Db::all("SELECT u.id, TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) name,
      COALESCE(r.title,'â€”') role_title
    FROM users u LEFT JOIN roles r ON r.id=u.role_id
    WHERE u.is_active=1 ORDER BY name");

  $att = Db::all("SELECT a.id,a.user_id,a.check_in,a.check_out,a.method,a.in_station,a.in_lat,a.in_lng,
      a.line_id AS attendance_line_id,
      COALESCE(l.code,'') line_code,
      TRIM(CONCAT(COALESCE(l.origin,''), CASE WHEN COALESCE(l.origin,'')<>'' AND COALESCE(l.destination,'')<>'' THEN ' â† ' ELSE '' END, COALESCE(l.destination,''))) line_description
    FROM staff_attendance a
    LEFT JOIN `lines` l ON l.id=a.line_id
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
      $present[]=[
        'user_id'=>$uid,'name'=>$st['name'],'role_title'=>$st['role_title'],
        'check_in'=>$a['check_in'],'check_out'=>$a['check_out'],'method'=>$a['method'],
        'line_code'=>$a['line_code'],'line_description'=>$a['line_description'],
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

// Ø®Ù„Ø§ØµÙ‡Ù” ØªØ¬Ù…ÛŒØ¹ÛŒ Ú©Ø§Ø±Ú©Ø±Ø¯ Ø¨Ø±Ø§ÛŒ Ø¯Ø§Ø´Ø¨ÙˆØ±Ø¯ (Ù…Ø¬Ù…ÙˆØ¹ Ù‡Ù…Ù‡Ù” Ù†ÛŒØ±ÙˆÙ‡Ø§ Ø¯Ø± ÛŒÚ© Ù…Ø§Ù‡)
route('GET', '/api/admin/work-dashboard', function($p,$b,$u){
  $jy=(int)($_GET['year']??0); $jm=(int)($_GET['month']??0);
  if(!$jy){ [$jy,$jm]=array_slice(gregorian_to_jalali(date('Y'),date('m'),date('d')),0,2); }
  $rows=_work_month_rows($jy,$jm);
  $sum=['worked'=>0,'overtime'=>0,'shortage'=>0,'night'=>0,'friday'=>0,'holiday'=>0,'annual_min'=>0,'sick_min'=>0,'mission_min'=>0,'present_days'=>0,'staff'=>count($rows)];
  $top=[];
  foreach($rows as $r){
    foreach(['worked','overtime','shortage','night','friday','holiday','annual_min','sick_min','mission_min','present_days'] as $k) $sum[$k]+=($r[$k]??0);
    $top[]=['name'=>$r['name'],'worked'=>$r['worked'],'overtime'=>$r['overtime']];
  }
  usort($top,fn($a,$b)=>$b['worked']-$a['worked']);
  // ÙˆØ¶Ø¹ÛŒØª Ø¯Ø±Ø®ÙˆØ§Ø³Øªâ€ŒÙ‡Ø§ÛŒ Ø¯Ø± Ø§Ù†ØªØ¸Ø§Ø±
  $pending=Db::one("SELECT COUNT(*) c FROM requests WHERE status='pending'");
  return ['year'=>$jy,'month'=>$jm,'sum'=>$sum,'top'=>array_slice($top,0,8),'pending_requests'=>(int)($pending['c']??0),'live'=>_live_staff_dashboard()];
}, false, ADMIN);

// ==================== Ø­Ù‚ÙˆÙ‚ Ùˆ Ø¯Ø³ØªÙ…Ø²Ø¯ ====================
// ØªÙ†Ø¸ÛŒÙ…Ø§Øª Ú©Ù„ÛŒ Ù†Ø±Ø®â€ŒÙ‡Ø§ Ùˆ Ø¶Ø±Ø§ÛŒØ¨ Ø¯Ø± app_settings:
//  payroll_hour_rate (Ù†Ø±Ø® Ù‡Ø± Ø³Ø§Ø¹Øª Ú©Ø§Ø±Ú©Ø±Ø¯ Ø¹Ø§Ø¯ÛŒØŒ Ø±ÛŒØ§Ù„) ÛŒØ§ Ø§Ø² base_monthly/Û±Û¹Û² Ù…Ø­Ø§Ø³Ø¨Ù‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯
//  ot_mult (Ø¶Ø±ÛŒØ¨ Ø§Ø¶Ø§ÙÙ‡â€ŒÚ©Ø§Ø±ØŒ Ù¾ÛŒØ´â€ŒÙØ±Ø¶ 1.4)ØŒ night_mult (Ø´Ø¨â€ŒÚ©Ø§Ø±ÛŒ 1.35)ØŒ friday_mult (Ø¬Ù…Ø¹Ù‡â€ŒÚ©Ø§Ø±ÛŒ 1.4)ØŒ holiday_mult (ØªØ¹Ø·ÛŒÙ„â€ŒÚ©Ø§Ø±ÛŒ 1.4)
//  std_month_hours (Ø³Ø§Ø¹Øª Ù…ÙˆØ¸Ù Ù…Ø§Ù‡Ø§Ù†Ù‡ØŒ Ù¾ÛŒØ´â€ŒÙØ±Ø¶ 192)

// Ù¾Ø§ÛŒÙ‡Ù” Ø­Ù‚ÙˆÙ‚ ÛŒÚ© Ú©Ø§Ø±Ø¨Ø±
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

// Ù…Ø­Ø§Ø³Ø¨Ù‡Ù” ÙÛŒØ´ Ø­Ù‚ÙˆÙ‚ÛŒ ÛŒÚ© Ú©Ø§Ø±Ø¨Ø± Ø¨Ø±Ø§ÛŒ ÛŒÚ© Ù…Ø§Ù‡
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
  // Ú©Ø§Ø±Ú©Ø±Ø¯ Ù…Ø§Ù‡ Ø§Ø² Ú¯Ø²Ø§Ø±Ø´ Ø´ÛŒÙØª
  $rep = _shift_month_report($jy,$jm);
  $w = null; foreach($rep as $r) if($r['user_id']==$uid){ $w=$r; break; }
  $worked=$w['worked']??0; $ot=$w['overtime']??0; $night=$w['night']??0; $fri=$w['friday']??0; $hol=$w['holiday']??0;
  // Ù…Ø¨Ø§Ù„Øº (Ø±ÛŒØ§Ù„)
  $h = fn($min)=>$min/60;
  $regularPay = round($baseMonthly>0 ? $baseMonthly : $h($worked)*$hourRate);
  $otPay = round($h($ot)*$hourRate*$otMult);
  $nightPay = round($h($night)*$hourRate*($nightMult-1));   // ÙÙˆÙ‚â€ŒØ§Ù„Ø¹Ø§Ø¯Ù‡Ù” Ø´Ø¨â€ŒÚ©Ø§Ø±ÛŒ
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
    'earnings'=>['Ø­Ù‚ÙˆÙ‚ Ù¾Ø§ÛŒÙ‡/Ú©Ø§Ø±Ú©Ø±Ø¯'=>$regularPay,'Ø§Ø¶Ø§ÙÙ‡â€ŒÚ©Ø§Ø±'=>$otPay,'ÙÙˆÙ‚â€ŒØ§Ù„Ø¹Ø§Ø¯Ù‡Ù” Ø´Ø¨â€ŒÚ©Ø§Ø±ÛŒ'=>$nightPay,'ÙÙˆÙ‚â€ŒØ§Ù„Ø¹Ø§Ø¯Ù‡Ù” Ø¬Ù…Ø¹Ù‡â€ŒÚ©Ø§Ø±ÛŒ'=>$friPay,'ÙÙˆÙ‚â€ŒØ§Ù„Ø¹Ø§Ø¯Ù‡Ù” ØªØ¹Ø·ÛŒÙ„â€ŒÚ©Ø§Ø±ÛŒ'=>$holPay,'Ø­Ù‚ Ù…Ø³Ú©Ù†'=>round($housing),'Ø­Ù‚ Ø®Ø§Ù†ÙˆØ§Ø±'=>round($family),'Ø¨Ù†/Ø®ÙˆØ§Ø±Ø¨Ø§Ø±'=>round($food),'Ø³Ø§ÛŒØ± Ù…Ø²Ø§ÛŒØ§'=>round($otherA)],
    'deductions'=>['Ø¨ÛŒÙ…Ù‡'=>$insurance,'Ù…Ø§Ù„ÛŒØ§Øª'=>$tax,'Ø³Ø§ÛŒØ± Ú©Ø³ÙˆØ±Ø§Øª'=>round($otherD)],
    'gross'=>round($gross),'total_deduct'=>round($deductions),'net'=>round($net),
  ];
}

route('GET', '/api/admin/users/{id}/payslip', function($p,$b,$u){
  $jy=(int)($_GET['year']??0); $jm=(int)($_GET['month']??0);
  if(!$jy){ [$jy,$jm]=array_slice(gregorian_to_jalali(date('Y'),date('m'),date('d')),0,2); }
  return _payslip((int)$p['id'],$jy,$jm);
}, false, ADMIN);

// ÙÛŒØ´ Ø­Ù‚ÙˆÙ‚ÛŒ Ø®ÙˆØ¯Ù Ú©Ø§Ø±Ø¨Ø± (Ø§Ù¾)
route('GET', '/api/my/payslip', function($p,$b,$u){
  $jy=(int)($_GET['year']??0); $jm=(int)($_GET['month']??0);
  if(!$jy){ [$jy,$jm]=array_slice(gregorian_to_jalali(date('Y'),date('m'),date('d')),0,2); }
  return _payslip($u['id'],$jy,$jm);
});

// Ø®Ø±ÙˆØ¬ÛŒ Ø§Ú©Ø³Ù„ Ù„ÛŒØ³Øª Ø­Ù‚ÙˆÙ‚ Ù‡Ù…Ù‡Ù” Ù†ÛŒØ±ÙˆÙ‡Ø§ Ø¨Ø±Ø§ÛŒ ÛŒÚ© Ù…Ø§Ù‡
route('GET', '/api/admin/payroll/export', function($p,$b,$u){
  $jy=(int)($_GET['year']??0); $jm=(int)($_GET['month']??0);
  if(!$jy){ [$jy,$jm]=array_slice(gregorian_to_jalali(date('Y'),date('m'),date('d')),0,2); }
  $rep=_shift_month_report($jy,$jm);
  header('Content-Type: text/csv; charset=UTF-8');
  header('Content-Disposition: attachment; filename="payroll_'.$jy.'_'.$jm.'.csv"');
  echo "\xEF\xBB\xBF"; $out=fopen('php://output','w');
  fputcsv($out,['Ù†Ø§Ù…','Ú©Ø§Ø±Ú©Ø±Ø¯(Ø³Ø§Ø¹Øª)','Ø§Ø¶Ø§ÙÙ‡â€ŒÚ©Ø§Ø±(Ø³Ø§Ø¹Øª)','Ø¬Ù…Ø¹ Ø¯Ø±ÛŒØ§ÙØªÛŒ','Ú©Ø³ÙˆØ±Ø§Øª','Ø®Ø§Ù„Øµ Ù¾Ø±Ø¯Ø§Ø®ØªÛŒ(Ø±ÛŒØ§Ù„)']);
  foreach($rep as $r){ $ps=_payslip($r['user_id'],$jy,$jm); fputcsv($out,[$r['name'],$ps['worked_h'],$ps['ot_h'],$ps['gross'],$ps['total_deduct'],$ps['net']]); }
  fclose($out); exit;
}, false, ADMIN);

// Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ø´Ø±Ú©Øª Ø¨Ø±Ø§ÛŒ Ø³Ø±Ø¨Ø±Ú¯ ÙÛŒØ´/Ú¯Ø²Ø§Ø±Ø´â€ŒÙ‡Ø§ Ø¯Ø± Ø§Ù¾
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



// ==================== ÙÛŒÙ„Ø¯Ù‡Ø§ÛŒ Ø³ÙØ§Ø±Ø´ÛŒ Ù¾Ø±Ø³Ù†Ù„ ====================
// Ù…Ø¯ÛŒØ±ÛŒØª ØªØ¹Ø±ÛŒÙ ÙÛŒÙ„Ø¯Ù‡Ø§ (Ø§Ø¯Ù…ÛŒÙ†)




// Ù…Ù‚Ø§Ø¯ÛŒØ± ÙÛŒÙ„Ø¯Ù‡Ø§ÛŒ Ø³ÙØ§Ø±Ø´ÛŒ ÛŒÚ© Ú©Ø§Ø±Ø¨Ø± (Ø§Ø¯Ù…ÛŒÙ† â€” Ù…Ø´Ø§Ù‡Ø¯Ù‡/ÙˆÛŒØ±Ø§ÛŒØ´)

// ÙÛŒÙ„Ø¯Ù‡Ø§ÛŒ Ù‚Ø§Ø¨Ù„â€ŒØªÚ©Ù…ÛŒÙ„ ØªÙˆØ³Ø· Ú©Ø§Ø±Ø¨Ø± + Ù…Ù‚Ø§Ø¯ÛŒØ± ÙØ¹Ù„ÛŒ Ø§Ùˆ (Ø§Ù¾)

// ==================== Ø¯Ø±Ø¬ ØªØ¹Ø·ÛŒÙ„Ø§Øª Ø±Ø³Ù…ÛŒ Û±Û´Û°Û´ (ÙˆØ§Ù‚Ø¹ÛŒ) ====================
route('POST', '/api/admin/holidays/seed-1404', function($p,$b,$u){
  // ÙÙ‡Ø±Ø³Øª ØªØ¹Ø·ÛŒÙ„Ø§Øª Ø±Ø³Ù…ÛŒ Ø³Ø§Ù„ Û±Û´Û°Û´ (Ù…Ø·Ø§Ø¨Ù‚ ØªÙ‚ÙˆÛŒÙ… Ø±Ø³Ù…ÛŒ Ú©Ø´ÙˆØ±)
  $H = [
    ['1404-01-01','Ù†ÙˆØ±ÙˆØ²'],['1404-01-02','Ø¹ÛŒØ¯ Ù†ÙˆØ±ÙˆØ²'],['1404-01-03','Ø¹ÛŒØ¯ Ù†ÙˆØ±ÙˆØ²'],['1404-01-04','Ø¹ÛŒØ¯ Ù†ÙˆØ±ÙˆØ²'],
    ['1404-01-11','Ø¹ÛŒØ¯ Ø³Ø¹ÛŒØ¯ ÙØ·Ø±'],['1404-01-12','ØªØ¹Ø·ÛŒÙ„ Ø¹ÛŒØ¯ ÙØ·Ø± / Ø±ÙˆØ² Ø¬Ù…Ù‡ÙˆØ±ÛŒ Ø§Ø³Ù„Ø§Ù…ÛŒ'],['1404-01-13','Ø±ÙˆØ² Ø·Ø¨ÛŒØ¹Øª (Ø³ÛŒØ²Ø¯Ù‡â€ŒØ¨Ù‡â€ŒØ¯Ø±)'],
    ['1404-02-04','Ø´Ù‡Ø§Ø¯Øª Ø§Ù…Ø§Ù… Ø¬Ø¹ÙØ± ØµØ§Ø¯Ù‚ (Ø¹)'],
    ['1404-03-14','Ø±Ø­Ù„Øª Ø§Ù…Ø§Ù… Ø®Ù…ÛŒÙ†ÛŒ (Ø±Ù‡)'],['1404-03-15','Ù‚ÛŒØ§Ù… Û±Ûµ Ø®Ø±Ø¯Ø§Ø¯'],['1404-03-16','Ø¹ÛŒØ¯ Ø³Ø¹ÛŒØ¯ Ù‚Ø±Ø¨Ø§Ù†'],['1404-03-24','Ø¹ÛŒØ¯ Ø³Ø¹ÛŒØ¯ ØºØ¯ÛŒØ± Ø®Ù…'],
    ['1404-04-14','ØªØ§Ø³ÙˆØ¹Ø§ÛŒ Ø­Ø³ÛŒÙ†ÛŒ'],['1404-04-15','Ø¹Ø§Ø´ÙˆØ±Ø§ÛŒ Ø­Ø³ÛŒÙ†ÛŒ'],
    ['1404-05-23','Ø§Ø±Ø¨Ø¹ÛŒÙ† Ø­Ø³ÛŒÙ†ÛŒ'],['1404-05-31','Ø±Ø­Ù„Øª Ø±Ø³ÙˆÙ„ Ø§Ú©Ø±Ù… (Øµ) Ùˆ Ø´Ù‡Ø§Ø¯Øª Ø§Ù…Ø§Ù… Ø­Ø³Ù† Ù…Ø¬ØªØ¨ÛŒ (Ø¹)'],
    ['1404-06-02','Ø´Ù‡Ø§Ø¯Øª Ø§Ù…Ø§Ù… Ø±Ø¶Ø§ (Ø¹)'],['1404-06-10','Ø´Ù‡Ø§Ø¯Øª Ø§Ù…Ø§Ù… Ø­Ø³Ù† Ø¹Ø³Ú©Ø±ÛŒ (Ø¹)'],['1404-06-19','Ù…ÛŒÙ„Ø§Ø¯ Ø±Ø³ÙˆÙ„ Ø§Ú©Ø±Ù… (Øµ) Ùˆ Ø§Ù…Ø§Ù… Ø¬Ø¹ÙØ± ØµØ§Ø¯Ù‚ (Ø¹)'],
    ['1404-09-03','Ø´Ù‡Ø§Ø¯Øª Ø­Ø¶Ø±Øª ÙØ§Ø·Ù…Ù‡ Ø²Ù‡Ø±Ø§ (Ø³)'],
    ['1404-10-13','ÙˆÙ„Ø§Ø¯Øª Ø§Ù…Ø§Ù… Ø¹Ù„ÛŒ (Ø¹) Ùˆ Ø±ÙˆØ² Ù¾Ø¯Ø±'],['1404-10-27','Ù…Ø¨Ø¹Ø« Ø±Ø³ÙˆÙ„ Ø§Ú©Ø±Ù… (Øµ)'],
    ['1404-11-15','ÙˆÙ„Ø§Ø¯Øª Ø­Ø¶Ø±Øª Ù‚Ø§Ø¦Ù… (Ø¹Ø¬) / Ù†ÛŒÙ…Ù‡ Ø´Ø¹Ø¨Ø§Ù†'],['1404-11-22','Ù¾ÛŒØ±ÙˆØ²ÛŒ Ø§Ù†Ù‚Ù„Ø§Ø¨ Ø§Ø³Ù„Ø§Ù…ÛŒ'],
    ['1404-12-20','Ø´Ù‡Ø§Ø¯Øª Ø­Ø¶Ø±Øª Ø¹Ù„ÛŒ (Ø¹)'],['1404-12-29','Ø±ÙˆØ² Ù…Ù„ÛŒ Ø´Ø¯Ù† ØµÙ†Ø¹Øª Ù†ÙØª'],
  ];
  $n=0;
  foreach ($H as $h) { Db::run("INSERT INTO holidays(jdate,title) VALUES(?,?) ON DUPLICATE KEY UPDATE title=VALUES(title)", $h); $n++; }
  return ['ok'=>true,'count'=>$n];
}, false, ADMIN);

// ==================== Ø¯Ø±Ø¬ ØªØ¹Ø·ÛŒÙ„Ø§Øª Ø±Ø³Ù…ÛŒ Û±Û´Û°Ûµ ====================
route('POST', '/api/admin/holidays/seed-1405', function($p,$b,$u){
  $H = [
    ['1405-01-01','Ù†ÙˆØ±ÙˆØ²'],['1405-01-02','Ø¹ÛŒØ¯ Ù†ÙˆØ±ÙˆØ²'],['1405-01-03','Ø¹ÛŒØ¯ Ù†ÙˆØ±ÙˆØ²'],['1405-01-04','Ø¹ÛŒØ¯ Ù†ÙˆØ±ÙˆØ²'],
    ['1405-01-12','Ø±ÙˆØ² Ø¬Ù…Ù‡ÙˆØ±ÛŒ Ø§Ø³Ù„Ø§Ù…ÛŒ'],['1405-01-13','Ø³ÛŒØ²Ø¯Ù‡ Ø¨Ù‡ Ø¯Ø±'],
    ['1405-01-22','Ø´Ù‡Ø§Ø¯Øª Ø§Ù…Ø§Ù… Ø¬Ø¹ÙØ± ØµØ§Ø¯Ù‚ (Ø¹)'],
    ['1405-02-25','Ø´Ù‡Ø§Ø¯Øª Ø­Ø¶Ø±Øª ÙØ§Ø·Ù…Ù‡ Ø²Ù‡Ø±Ø§ (Ø³)'],
    ['1405-03-05','Ø¹ÛŒØ¯ Ø³Ø¹ÛŒØ¯ ÙØ·Ø±'],['1405-03-06','ØªØ¹Ø·ÛŒÙ„ Ø¹ÛŒØ¯ ÙØ·Ø±'],
    ['1405-03-14','Ø±Ø­Ù„Øª Ø§Ù…Ø§Ù… Ø®Ù…ÛŒÙ†ÛŒ (Ø±Ù‡)'],['1405-03-15','Ù‚ÛŒØ§Ù… Û±Ûµ Ø®Ø±Ø¯Ø§Ø¯'],
    ['1405-03-31','Ø¹ÛŒØ¯ Ø³Ø¹ÛŒØ¯ Ù‚Ø±Ø¨Ø§Ù†'],
    ['1405-04-08','Ø¹ÛŒØ¯ Ø³Ø¹ÛŒØ¯ ØºØ¯ÛŒØ± Ø®Ù…'],
    ['1405-04-29','ØªØ§Ø³ÙˆØ¹Ø§ÛŒ Ø­Ø³ÛŒÙ†ÛŒ'],['1405-04-30','Ø¹Ø§Ø´ÙˆØ±Ø§ÛŒ Ø­Ø³ÛŒÙ†ÛŒ'],
    ['1405-06-07','Ø§Ø±Ø¨Ø¹ÛŒÙ† Ø­Ø³ÛŒÙ†ÛŒ'],
    ['1405-06-15','Ø±Ø­Ù„Øª Ø±Ø³ÙˆÙ„ Ø§Ú©Ø±Ù… (Øµ) Ùˆ Ø´Ù‡Ø§Ø¯Øª Ø§Ù…Ø§Ù… Ø­Ø³Ù† Ù…Ø¬ØªØ¨ÛŒ (Ø¹)'],
    ['1405-06-17','Ø´Ù‡Ø§Ø¯Øª Ø§Ù…Ø§Ù… Ø±Ø¶Ø§ (Ø¹)'],['1405-06-25','Ø´Ù‡Ø§Ø¯Øª Ø§Ù…Ø§Ù… Ø­Ø³Ù† Ø¹Ø³Ú©Ø±ÛŒ (Ø¹)'],
    ['1405-07-05','Ù…ÛŒÙ„Ø§Ø¯ Ø±Ø³ÙˆÙ„ Ø§Ú©Ø±Ù… (Øµ) Ùˆ Ø§Ù…Ø§Ù… Ø¬Ø¹ÙØ± ØµØ§Ø¯Ù‚ (Ø¹)'],
    ['1405-10-02','ÙˆÙ„Ø§Ø¯Øª Ø§Ù…Ø§Ù… Ø¹Ù„ÛŒ (Ø¹) Ùˆ Ø±ÙˆØ² Ù¾Ø¯Ø±'],['1405-10-16','Ù…Ø¨Ø¹Ø« Ø±Ø³ÙˆÙ„ Ø§Ú©Ø±Ù… (Øµ)'],
    ['1405-11-03','ÙˆÙ„Ø§Ø¯Øª Ø­Ø¶Ø±Øª Ù‚Ø§Ø¦Ù… (Ø¹Ø¬) / Ù†ÛŒÙ…Ù‡ Ø´Ø¹Ø¨Ø§Ù†'],['1405-11-22','Ù¾ÛŒØ±ÙˆØ²ÛŒ Ø§Ù†Ù‚Ù„Ø§Ø¨ Ø§Ø³Ù„Ø§Ù…ÛŒ'],
    ['1405-12-09','Ø´Ù‡Ø§Ø¯Øª Ø­Ø¶Ø±Øª Ø¹Ù„ÛŒ (Ø¹)'],['1405-12-29','Ø±ÙˆØ² Ù…Ù„ÛŒ Ø´Ø¯Ù† ØµÙ†Ø¹Øª Ù†ÙØª'],
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

// ÙØ¹Ø§Ù„â€ŒØ³Ø§Ø²ÛŒ Ùˆ Ù‚Ø§Ù„Ø¨ Ù¾ÛŒØ§Ù… Ø¯Ø± ØªÙ†Ø¸ÛŒÙ…Ø§Øª: birthday_enabled, birthday_channel (notif/sms/both),
// birthday_message (Ø¨Ø§ {name} {first_name})
route('GET', '/api/cron/birthday', function($p,$b,$u){
  $key = $_GET['key'] ?? '';
  $ck = Db::one("SELECT value FROM app_settings WHERE `key`='cron_key'");
  $cronKey = $ck ? json_decode($ck['value'],true) : '';
  if (!$cronKey || $key !== $cronKey) Http::error('Ú©Ù„ÛŒØ¯ Ú©Ø±ÙˆÙ† Ù†Ø§Ù…Ø¹ØªØ¨Ø±',403);
  $get = function($k,$d=null){ $r=Db::one("SELECT value FROM app_settings WHERE `key`=?",[$k]); if(!$r)return $d; $v=json_decode($r['value'],true); return ($v===null||$v==='')?$d:$v; };
  if (empty($get('birthday_enabled',false))) return ['ok'=>true,'skipped'=>'disabled'];
  $channel = $get('birthday_channel','notif'); // notif / sms / both
  $tpl = $get('birthday_message','Ù‡Ù…Ú©Ø§Ø± Ú¯Ø±Ø§Ù…ÛŒ {name}\nØªÙˆÙ„Ø¯ØªØ§Ù† Ù…Ø¨Ø§Ø±Ú©! ðŸŽ‰ Ø¨Ø±Ø§ÛŒØªØ§Ù† Ø³Ø§Ù„ÛŒ Ù¾Ø± Ø§Ø² Ù…ÙˆÙÙ‚ÛŒØª Ø¢Ø±Ø²ÙˆÙ…Ù†Ø¯ÛŒÙ….');
  // Ø§Ù…Ø±ÙˆØ² Ø¨Ù‡ Ø´Ù…Ø³ÛŒØ› Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒ Ø§Ø² ØªØ§Ø±ÛŒØ® ØªÙˆÙ„Ø¯ Ø´Ù…Ø³ÛŒ Ø¨Ø§ Ø¬Ø¯Ø§Ú©Ù†Ù†Ø¯Ù‡â€ŒÙ‡Ø§ÛŒ / - . Ùˆ Ø§Ø¹Ø¯Ø§Ø¯ ÛŒÚ©â€ŒØ±Ù‚Ù…ÛŒ
  [$jy,$jm,$jd] = gregorian_to_jalali((int)date('Y'),(int)date('m'),(int)date('d'));
  $mmdd = sprintf('%02d-%02d',$jm,$jd);
  $users = _users_with_jalali_birthday((int)$jm, (int)$jd);
  $sent=0;
  foreach ($users as $usr) {
    $name = trim(($usr['first_name']??'').' '.($usr['last_name']??''));
    $msg = str_replace(['{name}','{first_name}'], [$name, $usr['first_name']??''], $tpl);
    try{ Push::notify([(int)$usr['id']],'ØªÙˆÙ„Ø¯Øª Ù…Ø¨Ø§Ø±Ú© ðŸŽ‰',$msg,['type'=>'birthday','birth_date'=>$usr['birth_date'] ?? null]); }catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }
    if (in_array($channel,['sms','both']) && !empty($usr['phone']) && Sms::isEnabled()) { try{ Sms::send([$usr['phone']],$msg,'birthday',null); }catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); } }
    if (class_exists('MessengerHub')) { try{ MessengerHub::sendToMobile($usr['phone'] ?? $usr['mobile'] ?? '', 'ØªÙˆÙ„Ø¯Øª Ù…Ø¨Ø§Ø±Ú© ðŸŽ‰' . "\n" . $msg, 'birthday', (int)$usr['id'], 'birthday'); }catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); } }
    elseif (BaleBot::isEnabled() && (BaleBot::config()['items']['birthday'] ?? true)) { try{ BaleBot::sendToMobile($usr['phone'] ?? $usr['mobile'] ?? '', 'ØªÙˆÙ„Ø¯Øª Ù…Ø¨Ø§Ø±Ú© ðŸŽ‰' . "\n" . $msg, 'birthday', (int)$usr['id']); }catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); } }
    $sent++;
  }
  return ['ok'=>true,'date'=>$mmdd,'greeted'=>$sent];
}, true);

// ØªØ³Øª Ø¯Ø³ØªÛŒ ØªØ¨Ø±ÛŒÚ© ØªÙˆÙ„Ø¯ (Ø§Ø¯Ù…ÛŒÙ†) â€” Ø¨Ø¯ÙˆÙ† ØªÙˆØ¬Ù‡ Ø¨Ù‡ ØªØ§Ø±ÛŒØ®ØŒ Ø¨Ø±Ø§ÛŒ ÛŒÚ© Ú©Ø§Ø±Ø¨Ø±
route('POST', '/api/admin/birthday/test', function($p,$b,$u){
  $uid = (int)($b['user_id'] ?? 0); if(!$uid) Http::error('Ú©Ø§Ø±Ø¨Ø± Ø±Ø§ Ù…Ø´Ø®Øµ Ú©Ù†ÛŒØ¯',400);
  $get = function($k,$d=null){ $r=Db::one("SELECT value FROM app_settings WHERE `key`=?",[$k]); if(!$r)return $d; $v=json_decode($r['value'],true); return ($v===null||$v==='')?$d:$v; };
  $usr = Db::one("SELECT id,first_name,last_name,phone,mobile FROM users WHERE id=?", [$uid]);
  if(!$usr) Http::error('Ú©Ø§Ø±Ø¨Ø± ÛŒØ§ÙØª Ù†Ø´Ø¯',404);
  $name = trim(($usr['first_name']??'').' '.($usr['last_name']??''));
  $msg = str_replace(['{name}','{first_name}'], [$name,$usr['first_name']??''], $get('birthday_message','Ù‡Ù…Ú©Ø§Ø± Ú¯Ø±Ø§Ù…ÛŒ {name}
ØªÙˆÙ„Ø¯ØªØ§Ù† Ù…Ø¨Ø§Ø±Ú©!'));
  $channel = $get('birthday_channel','notif');
  $out=[]; $errs=[];
  try{ Push::notify([(int)$usr['id']],'ØªÙˆÙ„Ø¯Øª Ù…Ø¨Ø§Ø±Ú© ðŸŽ‰',$msg,['type'=>'birthday']); $out[]='Ù†ÙˆØªÛŒÙÛŒÚ©ÛŒØ´Ù† Ø¯Ø§Ø®Ù„ Ø¨Ø±Ù†Ø§Ù…Ù‡ âœ“'; }catch(\Throwable $e){ $errs[]='Ù¾ÙˆØ´: '.$e->getMessage(); }
  $phone = $usr['mobile'] ?? $usr['phone'] ?? null;
  if (in_array($channel,['sms','both'])) {
    if (!$phone) $errs[]='Ø´Ù…Ø§Ø±Ù‡Ù” Ù…ÙˆØ¨Ø§ÛŒÙ„ Ú©Ø§Ø±Ø¨Ø± Ø«Ø¨Øª Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª';
    elseif (!Sms::isEnabled()) $errs[]='Ø³Ø±ÙˆÛŒØ³ Ù¾ÛŒØ§Ù…Ú© ÙØ¹Ø§Ù„ ÛŒØ§ Ù¾ÛŒÚ©Ø±Ø¨Ù†Ø¯ÛŒ Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª (ØªÙ†Ø¸ÛŒÙ…Ø§Øª â†’ Ù¾ÛŒØ§Ù…Ú©)';
    else { try{ Sms::send([$phone],$msg,'birthday',null); $out[]='Ù¾ÛŒØ§Ù…Ú© âœ“'; }catch(\Throwable $e){ $errs[]='Ø®Ø·Ø§ÛŒ Ø§Ø±Ø³Ø§Ù„ Ù¾ÛŒØ§Ù…Ú©: '.$e->getMessage(); } }
  }
  if ($phone && class_exists('MessengerHub')) {
    $mr = MessengerHub::sendToMobile($phone, 'ØªÙˆÙ„Ø¯Øª Ù…Ø¨Ø§Ø±Ú© ðŸŽ‰' . "\n" . $msg, 'birthday', $uid, 'birthday');
    $mt = MessengerHub::totals($mr);
    if ($mt['sent']>0) $out[]='Ø±Ø¨Ø§Øªâ€ŒÙ‡Ø§ÛŒ Ù¾ÛŒØ§Ù…â€ŒØ±Ø³Ø§Ù† âœ“'; else $errs[]='Ø±Ø¨Ø§Øªâ€ŒÙ‡Ø§: Ø§Ø±Ø³Ø§Ù„ Ù†Ø´Ø¯ ÛŒØ§ Ú©Ø§Ø±Ø¨Ø± Ù…ØªØµÙ„ Ù†ÛŒØ³Øª';
  } elseif ($phone && BaleBot::isEnabled() && (BaleBot::config()['items']['birthday'] ?? true)) {
    $br = BaleBot::sendToMobile($phone, 'ØªÙˆÙ„Ø¯Øª Ù…Ø¨Ø§Ø±Ú© ðŸŽ‰' . "\n" . $msg, 'birthday', $uid);
    if (!empty($br['ok'])) $out[]='Ø±Ø¨Ø§Øª Ø¨Ù„Ù‡ âœ“'; else $errs[]='Ø¨Ù„Ù‡: '.($br['error'] ?? 'Ø§Ø±Ø³Ø§Ù„ Ù†Ø´Ø¯');
  }
  return ['ok'=>true,'sent'=>$out,'errors'=>$errs,'message'=>$msg,'channel'=>$channel];
}, false, ADMIN);

// Ø«Ø¨Øª Ø®ÙˆØ¯Ú©Ø§Ø± Ù†ÙˆØ¹ Ú¯ÙˆØ´ÛŒ Ùˆ Ù†Ø³Ø®Ù‡Ù” Ø§Ù†Ø¯Ø±ÙˆÛŒØ¯ Ú©Ø§Ø±Ø¨Ø± (Ø§Ø² Ø§Ù¾)
route('POST', '/api/my/device-info', function($p,$b,$u){
  Db::run("UPDATE users SET device_model=?, android_version=?, app_version=? WHERE id=?",
    [substr((string)($b['device_model']??''),0,120), substr((string)($b['android_version']??''),0,40), substr((string)($b['app_version']??''),0,30), $u['id']]);
  return ['ok'=>true];
}, false);

// Ø®Ø±ÙˆØ¬ÛŒ Ú©Ø§Ù…Ù„ Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ú©Ø§Ø±Ø¨Ø±Ø§Ù† (Ø´Ø§Ù…Ù„ ÙÛŒÙ„Ø¯Ù‡Ø§ÛŒ Ø³ÙØ§Ø±Ø´ÛŒ Ùˆ Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ø¯Ø³ØªÚ¯Ø§Ù‡)
route('GET', '/api/admin/users/export', function($p,$b,$u){
  $users = Db::all("SELECT u.id,u.username,u.first_name,u.last_name,r.title role_title,u.phone,u.email,u.national_code,u.personnel_code,
      u.birth_date,u.marital_status,u.children_count,u.address,u.seniority_start,u.is_active,u.can_send_sms,u.device_model,u.android_version,u.app_version,
      u.signature_data,CASE WHEN u.photo_path IS NOT NULL AND u.photo_path<>'' THEN NULL ELSE u.photo END AS photo_b64,u.photo_path
    FROM users u LEFT JOIN roles r ON r.id=u.role_id ORDER BY u.id");
  $fields = Db::all("SELECT id,label FROM custom_fields WHERE is_active=1 ORDER BY sort_order,id");
  $allVals = Db::all("SELECT user_id,field_id,value FROM custom_field_values");
  $valMap=[]; foreach($allVals as $v){ $valMap[$v['user_id']][$v['field_id']]=$v['value']; }
  // ØªØ¹Ø¯Ø§Ø¯ ØªØ¹Ù‡Ø¯Ø§Øª Ø§Ù†Ø¶Ø¨Ø§Ø·ÛŒ Ù‡Ø± Ú©Ø§Ø±Ø¨Ø±
  $commitMap = [];
  try {
    Db::run("CREATE TABLE IF NOT EXISTS user_commitments (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, title VARCHAR(255) NOT NULL, description TEXT NULL, commit_jdate VARCHAR(10) NOT NULL, attachment_name VARCHAR(255) NULL, attachment_path VARCHAR(400) NULL, attachment_data LONGTEXT NULL, created_by INT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_uc_user (user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    foreach (Db::all("SELECT user_id, COUNT(*) c FROM user_commitments GROUP BY user_id") as $cm) $commitMap[$cm['user_id']] = (int)$cm['c'];
  } catch (\Throwable $e) { error_log('suppressed exception: '.$e->getMessage()); }

  $head=['Ø±Ø¯ÛŒÙ','Ø¹Ú©Ø³ Ù¾Ø±Ø³Ù†Ù„ÛŒ','Ù†Ø§Ù…','Ù†Ø§Ù… Ø®Ø§Ù†ÙˆØ§Ø¯Ú¯ÛŒ','Ú©Ø¯ Ù¾Ø±Ø³Ù†Ù„ÛŒ','Ú©Ø¯ Ù…Ù„ÛŒ','ØªØ§Ø±ÛŒØ® ØªÙˆÙ„Ø¯','ÙˆØ¶Ø¹ÛŒØª ØªØ£Ù‡Ù„','ØªØ¹Ø¯Ø§Ø¯ ÙØ±Ø²Ù†Ø¯',
    'Ù…ÙˆØ¨Ø§ÛŒÙ„','Ø§ÛŒÙ…ÛŒÙ„','Ø¢Ø¯Ø±Ø³','Ø³Ù…Øª','Ø´Ø±ÙˆØ¹ Ø³Ù†ÙˆØ§Øª','ÙˆØ¶Ø¹ÛŒØª Ø­Ø³Ø§Ø¨','Ø§Ø¬Ø§Ø²Ù‡Ù” Ù¾ÛŒØ§Ù…Ú©','Ù…Ø¯Ù„ Ú¯ÙˆØ´ÛŒ','Ù†Ø³Ø®Ù‡Ù” Ø§Ù†Ø¯Ø±ÙˆÛŒØ¯','Ù†Ø³Ø®Ù‡Ù” Ø¨Ø±Ù†Ø§Ù…Ù‡',
    'ØªØ¹Ø¯Ø§Ø¯ ØªØ¹Ù‡Ø¯Ø§Øª Ø§Ù†Ø¶Ø¨Ø§Ø·ÛŒ','Ø´Ù†Ø§Ø³Ù‡ Ú©Ø§Ø±Ø¨Ø±','Ù†Ø§Ù… Ú©Ø§Ø±Ø¨Ø±ÛŒ','Ø§Ù…Ø¶Ø§'];
  $photoColIdx = 1; $sigColIdx = array_search('Ø§Ù…Ø¶Ø§', $head, true);
  foreach($fields as $f) $head[]=$f['label'];

  $xw = new XlsxWriter($head);
  $xw->setProfessionalStyle();
  $xw->setTextCol(4); // Ú©Ø¯ Ù¾Ø±Ø³Ù†Ù„ÛŒ Ø¨Ø§ÛŒØ¯ Ø¨Ø§ ØµÙØ±Ù‡Ø§ÛŒ Ø§Ø¨ØªØ¯Ø§ÛŒÛŒ Ùˆ ØªÙ…Ø§Ù… Ø±Ù‚Ù…â€ŒÙ‡Ø§ Ø­ÙØ¸ Ø´ÙˆØ¯
  foreach ([0=>7,1=>15,2=>16,3=>18,4=>14,5=>15,6=>14,7=>13,8=>10,9=>16,10=>28,11=>34,12=>20,13=>14,
            14=>12,15=>13,16=>20,17=>15,18=>15,19=>17,20=>10,21=>20] as $colIdx=>$width) $xw->setColWidth($colIdx, $width);
  $xw->setColWidth($photoColIdx, 15);
  $xw->setColWidth($sigColIdx, 16);

  foreach($users as $userIndex=>$usr){
    $row=[$userIndex+1,'',$usr['first_name'],$usr['last_name'],$usr['personnel_code'],$usr['national_code'],$usr['birth_date'],
      $usr['marital_status'],$usr['children_count'],$usr['phone'],$usr['email'],$usr['address'],$usr['role_title'],$usr['seniority_start'],
      $usr['is_active']?'ÙØ¹Ø§Ù„':'ØºÛŒØ±ÙØ¹Ø§Ù„',$usr['can_send_sms']?'Ø¨Ù„Ù‡':'Ø®ÛŒØ±',$usr['device_model'],$usr['android_version'],$usr['app_version'],
      $commitMap[$usr['id']] ?? 0,$usr['id'],$usr['username'],'', // Ø¹Ú©Ø³ Ùˆ Ø§Ù…Ø¶Ø§ Ø¨Ù‡â€ŒØµÙˆØ±Øª ØªØµÙˆÛŒØ± Ø¬Ø§Ø³Ø§Ø²ÛŒ Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯
    ];
    foreach($fields as $f){ $row[]= $valMap[$usr['id']][$f['id']] ?? ''; }
    $rIdx = $xw->addRow($row);

    // Ø¹Ú©Ø³ Ù¾Ø±Ø³Ù†Ù„ÛŒ: Ø§Ø² ÙØ§ÛŒÙ„ ÙÛŒØ²ÛŒÚ©ÛŒ (photo_path) ÛŒØ§ Ø§Ø² Ø³ØªÙˆÙ† Ù‚Ø¯ÛŒÙ…ÛŒ base64
    $photoBytes = null;
    if (!empty($usr['photo_path'])) {
      $full = Media::fullPath($usr['photo_path']);
      if ($full && is_file($full)) $photoBytes = @file_get_contents($full);
    } elseif (!empty($usr['photo_b64']) && strpos($usr['photo_b64'], 'base64,') !== false) {
      $photoBytes = base64_decode(substr($usr['photo_b64'], strpos($usr['photo_b64'], 'base64,') + 7), true) ?: null;
    }
    if ($photoBytes) $xw->setImage($rIdx, $photoColIdx, $photoBytes, 90);

    // Ø§Ù…Ø¶Ø§: Ø¯Ø± Ø³ØªÙˆÙ† signature_data Ø¨Ù‡â€ŒØµÙˆØ±Øª data URI Ø°Ø®ÛŒØ±Ù‡ Ø´Ø¯Ù‡ Ø§Ø³Øª
    if (!empty($usr['signature_data']) && strpos($usr['signature_data'], 'base64,') !== false) {
      $sigBytes = base64_decode(substr($usr['signature_data'], strpos($usr['signature_data'], 'base64,') + 7), true) ?: null;
      if ($sigBytes) $xw->setImage($rIdx, $sigColIdx, $sigBytes, 110);
    }
  }
  $xw->output('Ø§Ø·Ù„Ø§Ø¹Ø§Øª_Ú©Ø§Ù…Ù„_Ú©Ø§Ø±Ø¨Ø±Ø§Ù†.xlsx', 'Ú©Ø§Ø±Ø¨Ø±Ø§Ù†');
}, false, ADMIN);

route('GET', '/api/auth/me', function($p,$b,$u){
  $exempt = false; $mustSetup = false; $mustRenew = false; $secEx = false;
  try {
    $r = Db::one("SELECT security_exempt, must_change_pw, profile_done, pw_changed_at, photo_taken_at FROM users WHERE id=?", [$u['id']]);
    $exempt = (bool)($r['security_exempt'] ?? 0); $secEx = $exempt;
    // Ø¯ÙˆØ±Ù‡Ù” Ø§Ø¬Ø¨Ø§Ø±ÛŒ ØªÙ…Ø¯ÛŒØ¯ (Ø±ÙˆØ²) Ø§Ø² ØªÙ†Ø¸ÛŒÙ…Ø§ØªØ› Ù¾ÛŒØ´â€ŒÙØ±Ø¶ Û³Û°
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

// ØªÙ†Ø¸ÛŒÙ…Ø§Øª Ø§ÙˆÙ„ÛŒÙ† ÙˆØ±ÙˆØ¯: Ø«Ø¨Øª Ø§ÛŒÙ…ÛŒÙ„ Ùˆ ØªØºÛŒÛŒØ± Ø±Ù…Ø² Ù¾ÛŒØ´â€ŒÙØ±Ø¶
route('POST', '/api/my/initial-setup', function($p, $b, $u) {
  $next  = $b['next'] ?? '';
  if (strlen($next) < 6) Http::error('Ø±Ù…Ø² Ø¬Ø¯ÛŒØ¯ Ø­Ø¯Ø§Ù‚Ù„ Û¶ Ú©Ø§Ø±Ø§Ú©ØªØ±', 400);
  if ($next === '123456') Http::error('Ø±Ù…Ø² Ø¬Ø¯ÛŒØ¯ Ù†Ø¨Ø§ÛŒØ¯ Ù¾ÛŒØ´â€ŒÙØ±Ø¶ Ø¨Ø§Ø´Ø¯', 400);
  // Ø§Ø·Ù„Ø§Ø¹Ø§Øª ÙØ±Ø¯ÛŒ
  $national = trim($b['national_code'] ?? '');
  $phone    = trim($b['phone'] ?? '');
  $marital  = $b['marital_status'] ?? null;
  $address  = trim($b['address'] ?? '');
  $children = isset($b['children_count']) ? (int)$b['children_count'] : null;
  $photo    = $b['photo'] ?? '';
  if ($national !== '' && !preg_match('/^\d{10}$/', $national)) Http::error('Ú©Ø¯ Ù…Ù„ÛŒ Ø¨Ø§ÛŒØ¯ Û±Û° Ø±Ù‚Ù… Ø¨Ø§Ø´Ø¯', 400);
  if ($phone === '' ) Http::error('Ø´Ù…Ø§Ø±Ù‡Ù” ØªÙ„ÙÙ† Ù‡Ù…Ø±Ø§Ù‡ Ù„Ø§Ø²Ù… Ø§Ø³Øª', 400);
  if ($photo === '' || strpos($photo,'data:image') !== 0) Http::error('Ø¹Ú©Ø³ Ù¾Ø±Ø³Ù†Ù„ÛŒ (Ø§Ø² Ø¯ÙˆØ±Ø¨ÛŒÙ†) Ù„Ø§Ø²Ù… Ø§Ø³Øª', 400);
  $email = trim($b['email'] ?? '');
  Db::run("UPDATE users SET email=?, phone=?, national_code=?, marital_status=?, address=?, children_count=?, photo=?,
      password_hash=?, must_change_pw=0, profile_done=1, pw_changed_at=NOW(), photo_taken_at=NOW() WHERE id=?",
    [$email ?: null, $phone, $national ?: null, $marital, $address ?: null, $children, $photo,
     password_hash($next, PASSWORD_BCRYPT), $u['id']]);
  return ['ok'=>true];
});

// Ø¨Ù‡â€ŒØ±ÙˆØ²Ø±Ø³Ø§Ù†ÛŒ Ø¯ÙˆØ±Ù‡â€ŒØ§ÛŒ (Ù‡Ø± Û³Û° Ø±ÙˆØ²): ÙÙ‚Ø· Ø±Ù…Ø² Ø¬Ø¯ÛŒØ¯ + Ø¹Ú©Ø³ Ù¾Ø±Ø³Ù†Ù„ÛŒ Ø¬Ø¯ÛŒØ¯
route('POST', '/api/my/periodic-renew', function($p, $b, $u) {
  $next  = $b['next'] ?? '';
  $photo = $b['photo'] ?? '';
  if (strlen($next) < 6) Http::error('Ø±Ù…Ø² Ø¬Ø¯ÛŒØ¯ Ø­Ø¯Ø§Ù‚Ù„ Û¶ Ú©Ø§Ø±Ø§Ú©ØªØ±', 400);
  if ($next === '123456') Http::error('Ø±Ù…Ø² Ø¬Ø¯ÛŒØ¯ Ù†Ø¨Ø§ÛŒØ¯ Ù¾ÛŒØ´â€ŒÙØ±Ø¶ Ø¨Ø§Ø´Ø¯', 400);
  if ($photo === '' || strpos($photo,'data:image') !== 0) Http::error('Ø¹Ú©Ø³ Ù¾Ø±Ø³Ù†Ù„ÛŒ Ø¬Ø¯ÛŒØ¯ (Ø§Ø² Ø¯ÙˆØ±Ø¨ÛŒÙ†) Ù„Ø§Ø²Ù… Ø§Ø³Øª', 400);
  $_uPhotoPath = Media::saveBase64($photo, 'users', 600, 75);
  Db::run("UPDATE users SET photo_path=?, password_hash=?, pw_changed_at=NOW(), photo_taken_at=NOW() WHERE id=?",
    [$_uPhotoPath, password_hash($next, PASSWORD_BCRYPT), $u['id']]);
  return ['ok'=>true];
});

route('POST', '/api/admin/change-password', function($p, $b, $u) {
  if (strlen($b['next'] ?? '') < 6) Http::error('Ø±Ù…Ø² Ø¬Ø¯ÛŒØ¯ Ø­Ø¯Ø§Ù‚Ù„ Û¶ Ú©Ø§Ø±Ø§Ú©ØªØ±', 400);
  $row = Db::one("SELECT password_hash FROM users WHERE id=?", [$u['id']]);
  if (!password_verify($b['current'] ?? '', $row['password_hash'])) Http::error('Ø±Ù…Ø² ÙØ¹Ù„ÛŒ Ø§Ø´ØªØ¨Ø§Ù‡ Ø§Ø³Øª', 401);
  Db::run("UPDATE users SET password_hash=?, must_change_pw=0 WHERE id=?", [password_hash($b['next'], PASSWORD_BCRYPT), $u['id']]);
  return ['ok'=>true];
});


// Ø«Ø¨Øª Ù†Ù…ÙˆÙ†Ù‡ Ø¢Ù…ÙˆØ²Ø´ÛŒ Ù¾Ù„Ø§Ú©: ØªØµÙˆÛŒØ± Ø¨Ø±Ø´â€ŒØ®ÙˆØ±Ø¯Ù‡ + Ù…Ù‚Ø¯Ø§Ø± ØµØ­ÛŒØ­ØŒ Ø¨Ø±Ø§ÛŒ Ø¨Ù‡Ø¨ÙˆØ¯ OCR Ù¾Ù„Ø§Ú©â€ŒÙ‡Ø§ÛŒ ØªØ§Ú©Ø³ÛŒ Û±Û²/Øª
route('POST', '/api/plate-scan-samples', function($p,$b,$u){
  _ensure_plate_scan_samples();
  $post = $_POST ?: [];
  if (!is_array($b)) $b = [];
  $data = array_merge($b, $post);
  $corrected = _taxi12_plate_norm($data['corrected_plate'] ?? (($data['corrected_digits_2'] ?? '').'Øª'.($data['corrected_digits_3'] ?? '').'-12'));
  if (!$corrected) Http::error('Ù¾Ù„Ø§Ú© Ø§ØµÙ„Ø§Ø­â€ŒØ´Ø¯Ù‡ Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª', 400);
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
      substr($d,0,2), substr($d,2,3), 'Øª', '12', $conf,
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
    // Ø¯Ø± Ù¾Ù†Ù„ Ù…Ø¯ÛŒØ±ÛŒØª Ù†Ø¨Ø§ÛŒØ¯ Ø®Ø·Ø§ÛŒ 500 Ø¨Ø§Ø¹Ø« ØªÙˆÙ‚Ù ØµÙØ­Ù‡ Ø´ÙˆØ¯Ø› Ø³Ø§Ø®ØªØ§Ø± ÙØ¹Ù„ÛŒ Ø¯ÛŒØªØ§Ø¨ÛŒØ³ Ú¯Ø²Ø§Ø±Ø´ Ù…ÛŒâ€ŒØ´ÙˆØ¯.
    return ['items'=>[], 'count'=>0, 'status'=>_plate_model_status_payload(), 'warning'=>'Ø³Ø§Ø®ØªØ§Ø± Ø¬Ø¯ÙˆÙ„ Ù†Ù…ÙˆÙ†Ù‡â€ŒÙ‡Ø§ÛŒ Ù¾Ù„Ø§Ú© Ù†Ø§Ù‚Øµ Ø¨ÙˆØ¯ Ùˆ Ø¨Ù‡â€ŒØµÙˆØ±Øª Ø®ÙˆØ¯Ú©Ø§Ø± ØªØ±Ù…ÛŒÙ… Ø´Ø¯. ØµÙØ­Ù‡ Ø±Ø§ Ø¯ÙˆØ¨Ø§Ø±Ù‡ Ø¨Ø§Ø² Ú©Ù†ÛŒØ¯.', 'db_error'=>substr($e->getMessage(),0,400)];
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
  $id=(int)$p['id']; if(!$id) Http::error('Ø´Ù†Ø§Ø³Ù‡ Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª',422);
  $status = (string)($b['status'] ?? 'verified');
  if(!in_array($status,['verified','pending','rejected'],true)) Http::error('ÙˆØ¶Ø¹ÛŒØª Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª',422);
  $old = Db::one("SELECT corrected_plate,corrected_digits_2,corrected_digits_3 FROM plate_scan_samples WHERE id=?",[$id]);
  if(!$old) Http::error('Ù†Ù…ÙˆÙ†Ù‡ Ù¾Ù„Ø§Ú© ÛŒØ§ÙØª Ù†Ø´Ø¯',404);
  $hasCorrection = array_key_exists('corrected_plate',$b) || array_key_exists('corrected_digits_2',$b) || array_key_exists('corrected_digits_3',$b);
  $candidate = '';
  if($hasCorrection){
    $candidate = trim((string)($b['corrected_plate'] ?? ''));
    if($candidate==='') $candidate = (string)($b['corrected_digits_2'] ?? '').'Øª'.(string)($b['corrected_digits_3'] ?? '').'-12';
  } else {
    $candidate = (string)($old['corrected_plate'] ?? '');
    if(trim($candidate)==='') $candidate = (string)($old['corrected_digits_2'] ?? '').'Øª'.(string)($old['corrected_digits_3'] ?? '').'-1çnöÓFòµë(š+myÖR‚%4TÄT5BfÇVRe$ôÒ÷6WGF–æw2t„U$R¶W–Óò"Â²wWÆöEòrâG6V7F–öåÒ“°¢F6frÒG&÷rò§6öåöFV6öFR‚G&÷u²wfÇVRuÒÂG'VR’¢çVÆÃ°¢FÖ„¶"Ò°¢–b†—5ö'&’‚F6fr’’FÖ„¶"Ò†–çB’‚F6fu²vÖ…ö¶"uÒóòF6fu²vÆ–Ö—Eö¶"uÒóòF6fu²v¶"uÒóò“°¢VÇ6V–b†—5öçVÖW&–2‚F6fr’’FÖ„¶"Ò†–çB’F6fs°¢òò˜]ŠÝŠ}‹=Š˜}™BŠÝŠÍ˜RŠ­˜-‹¸ÍŠ¸ÂŠ}‹"FFU$Â†&6ScB¢F#cBÒ‡7G&–ær’FFFW&Ã°¢–b‚‚G÷2Ò7G'÷2‚F#cBÂv&6ScBÂr’’ÓÒfÇ6R’F#cBÒ7V'7G"‚F#cBÂG÷2²r“°¢F'—FW2Ò†–çB’‡7G&ÆVâ‚F#cB’¢2òB“°¢F¶"ÒF'—FW2ò#C°¢–b‚FÖ„¶"âbbF¶"âFÖ„¶"’‡GG£¦W'&÷"‚}ŠÝŠÍ˜R˜Š}¸Í˜B›í¸Í˜‹=Š¢Š¸Í‹BŠ}‹"ŠÝŠò˜]ŠÍŠ}‹"Š}‹=Š¢ŠÝŠýŠ}ªŠ½‹râFÖ„¶"ârª¸Í˜M˜ŠŠ}¸ÍŠ¢’rÂC2“°§Ð ¢òòŠ}‹‹=Š}˜BW6‚˜}‹MŠýŠ}‹˜}Š}¸ÂŠ}˜m˜-‹mŠrŠ‹Š}¸ÂŠ}ŠÍ‹Š}¸Â‹˜‹-Š}˜m˜rŠŠr7&öâ’âŠŠrª˜M¸ÍŠò˜]Ší˜¸Â˜]ŠÝŠ}˜‹Š¢˜]¸Î(Í‹M˜Šòà¢òò˜m˜]˜˜m˜}™B7&öâ‹˜‹-Š}˜m˜s¢vvWB×òÒ&‡GG3¢òöç–÷W6Vf—÷W"æ—"ö’ö7&öâ÷W6‚ÖW‡—'“ö¶W“Ý	­	½
í
r §&÷WFR‚ttUBrÂrö’ö7&öâ÷W6‚ÖW‡—'’rÂgVæ7F–öâ‚GÂF"ÂGR—°¢F6frÒF#£¦öæR‚%4TÄT5BfÇVRe$ôÒ÷6WGF–æw2t„U$R¶W–Òv7&öåö¶W’r"“°¢F¶W’ÒF6fròG&–Ò‚‡7G&–ær–§6öåöFV6öFR‚F6fu²wfÇVRuÒÂG'VR’’¢rs°¢–b‚F¶W’ÓÓÒrrÇÂ‚EôtUE²v¶W’uÒóòrr’ÓÒF¶W’’‡GG£¦W'&÷"‚}ª˜M¸ÍŠò˜mŠ}˜]‹Š­Š‹rÂC2“°¢GW6W'2Ò'&•ö6öÇVÖâ„F#£¦ÆÂ‚%4TÄT5BD•5D”ä5BW6W%ö–Be$ôÒW6W%öÆ–æW2"’ÂwW6W%ö–Br“°¢G6VçBÒ°¢f÷&V6‚‚GW6W'22GV–B’°¢FÆW'G2ÒW‡—'•öÆW'G2…²v–BsÓâGV–BÂv—5öFÖ–âsÓãÒ“°¢–b‚FÆW'G2’²W6ƒ£§6VæB…²GV–EÒÂ}˜}‹MŠýŠ}‹Š}˜m˜-‹mŠ}¸ÂŠ}‹Š­ŠŠ}‹rÂ6÷VçB‚FÆW'G2’âr˜]˜‹ŠòŠý‹Ší‹}˜‹r‹M˜]Šr‹˜‚Š˜rŠ}˜m˜-‹mŠr¸ÍŠr˜]˜m˜-‹m¸ÂŠ}‹=Š¢rÂ²wG—RsÓâvW‡—'’uÒ“²G6VçB²³²Ð¢Ð¢&WGW&â²vö²sÓçG'VRÂwW6W'5öæ÷F–f–VBsÓâG6VçEÓ°§ÒÂG'VR“²òòV&Æ–3×G'VRŠŠrª˜M¸ÍŠò˜]ŠÝŠ}˜‹Š¢˜]¸Î(Í‹M˜Šò ¢ò¢ÒÒÒÒÒÒÒÒÒÒÒÒÒÒÒÒ˜Š}‹"»#¢ŠýŠ}‹MŠ˜‹Šò˜MŠÝ‹˜~(ÍŠ}¸Âªý‹-Š}‹‹MˆÂŠ}‹˜MŠ}˜b˜‚‹M¸Í˜Š¢ÒÒÒÒÒÒÒÒÒÒÒÒÒÒÒÒ¢ð§&÷WFR‚ttUBrÂrö’öFÖ–â÷†6S"ÖF6†&ö&BrÂgVæ7F–öâ‚GÂF"ÂGR—°¢GFöF’ÒFFR‚u’ÖÒÖBr“°¢FöæRÒfâ‚G7ÂÂG&×3ÕµÒ’Óâ†–çB’„F#£¦öæR‚G7ÂÂG&×2•²vâuÒóò“°¢G&W6VçBÒFöæR‚%4TÄT5B4õTåB‚¢’âe$ôÒW6W%öGFVæFæ6Rt„U$RDDR†6†V6¶–åöB“ÓòäB6†V6¶÷WEöB•2åTÄÂ"Â²GFöF•Ò“°¢G&W÷'G4æWrÒFöæR‚%4TÄT5B4õTåB‚¢’âe$ôÒ&W÷'G2t„U$RFVÆWFVEöB•2åTÄÂäBDDR†7&VFVEöB“Óò"Â²GFöF•Ò“°¢G&W÷'G5Vç&VBÒFöæR‚%4TÄT5B4õTåB‚¢’âe$ôÒ&W÷'G2"¤ô”â&W÷'E÷&÷WFW2'"ôâ'"ç&W÷'Eö–C×"æ–Bt„U$R"æFVÆWFVEöB•2åTÄÂäB'"çFõ÷W6W%ö–CÓòäBäõBU„•5E2…4TÄT5Be$ôÒ&W÷'E÷&VG2&Bt„U$R&Bç&W÷'Eö–C×"æ–BäB&BçW6W%ö–CÓò’"Â²†–çB’GU²v–BuÒÂ†–çB’GU²v–BuÕÒ“°¢F÷WDöe¦öæRÒFöæR‚%4TÄT5B4õTåB‚¢’âe$ôÒæ÷F–f–6F–öç2t„U$RDDR†7&VFVEöB“ÓòäB‡F—FÆRÄ”´Rr]Ší‹˜ŠÂŠ}‹"˜]ŠÝŠý˜Šý˜rRrõ"&öG’Ä”´Rr]ŠíŠ}‹ŠÂ‹MŠòRr’"Â²GFöF•Ò“°¢G6†–gEG&ç6fW'2ÒFöæR‚%4TÄT5B4õTåB‚¢’âe$ôÒ&W÷'EöVF—Bt„U$R7F–öãÒw6†–gE÷G&ç6fW"räBDDR†7&VFVEöB“Óò"Â²GFöF•Ò“°¢FÆ–æW2ÒµÓ°¢G'’°¢FÆ–æW2ÒF#£¦ÆÂ‚%4TÄT5BÂæ–BÆÂæ6öFRÆÂæ÷&–v–âÆÂæFW7F–æF–öâÄ4õTåB‡Væ–B’&W6VçEö6÷Vç@¢e$ôÒÆ–æW6À¢ÄTeB¤ô”âW6W%öGFVæFæ6RVôâVæÆ–æUö–CÖÂæ–BäBDDR‡Væ6†V6¶–åöB“ÓòäBVæ6†V6¶÷WEöB•2åTÄÀ¢u$õU%’Âæ–Bõ$DU"%’Âæ6öFRÄ”Ô•B"Â²GFöF•Ò“°¢Ò6F6‚…ÅF‡&÷v&ÆRFR’²W'&÷%öÆör‚w7W&W76VBW†6WF–öã¢râFRÓævWDÖW76vR‚’“²Ð¢&WGW&â²wFöF’sÓâGFöF’Âw&W6VçBsÓâG&W6VçBÂw&W÷'G5öæWrsÓâG&W÷'G4æWrÂw&W÷'G5÷Vç&VBsÓâG&W÷'G5Vç&VBÂv÷WEööe÷¦öæRsÓâF÷WDöe¦öæRÂw6†–gE÷G&ç6fW'2sÓâG6†–gEG&ç6fW'2ÂvÆ–æW2sÓâFÆ–æW5Ó°§ÒÂfÇ6RÂDÔ”â“° §&÷WFR‚ttUBrÂrö’öFÖ–â÷6†–gBÖÆ—fRrÂgVæ7F–öâ‚GÂF"ÂGR—°¢G'’°¢&WGW&âF#£¦ÆÂ‚%4TÄT5BVæ–BÇVçW6W%ö–BÇVæÆ–æUö–BÇVæ6†V6¶–åöBÇVæ6†V6¶÷WEöBÀ¢Ræf—'7EöæÖRÇRæÆ7EöæÖRÇ"çF—FÆR&öÆU÷F—FÆRÆÂæ6öFRÆ–æUö6öFRÆÂæ÷&–v–âÆÂæFW7F–æF–öà¢e$ôÒW6W%öGFVæFæ6RV¢¤ô”âW6W'2RôâRæ–C×VçW6W%ö–@¢ÄTeB¤ô”â&öÆW2"ôâ"æ–C×Rç&öÆUö–@¢ÄTeB¤ô”âÆ–æW6ÂôâÂæ–C×VæÆ–æUö–@¢t„U$RVæ6†V6¶÷WEöB•2åTÄÀ¢õ$DU"%’Væ6†V6¶–åöBDU42Ä”Ô•B3"“°¢Ò6F6‚…ÅF‡&÷v&ÆRFR’²&WGW&âµÓ²Ð§ÒÂfÇ6RÂDÔ”â“°  ¢ò¢ÒÒÒÒÒÒÒÒÒÒÒÒÒÒÒÒ˜Š}‹"»C¢˜‹m‹¸ÍŠ¢›í‹˜©˜}ˆÂ˜m‹=Ší˜~(Íªý‹Š}‹¸Â˜‚ª˜mŠ­‹˜BŠ­ª˜]¸Í˜B˜-Š}Š˜M¸ÍŠ®(Í˜}ŠrÒÒÒÒÒÒÒÒÒÒÒÒÒÒÒÒ¢ð¦gVæ7F–öâ÷&ö¦V7E÷†6U÷7FGW2‚—°¢&WGW&â°¢wfW'6–öârÓâ°¢w6—FU÷fW'6–öârÓâ4•DUõdU%4”ôâÀ¢v÷fW'6–öârÓâõdU%4”ôâÀ¢w†6RrÓâRÀ¢w&VÆV6UöæÖRrÓâu†6RRÒ7F&–Æ—G’ÂVWVRÂ'VÆW2bWw&FR6öç6öÆ–FF–öârÀ¢ÒÀ¢v6ö×ÆWFVBrÓâ°¢²v¶W’sÓâw†6SöGFVæFæ6UöVæv–æRrÂwF—FÆRsÓâ}˜]˜Š­˜‹ŠÝ‹m˜‹ˆÂ‹M¸Í˜Š¢Ší˜ŠýªŠ}‹ˆÂ"Š­ŠÝ˜¸Í˜B‹M¸Í˜Š­ˆÂ‹MŠŽ(ÍªŠ}‹¸ÍˆÂŠÍ˜]‹˜~(ÍªŠ}‹¸Â˜‚Š­‹‹}¸Í˜N(ÍªŠ}‹¸ÂrÂw7FGW2sÓâvFöæRuÒÀ¢²v¶W’sÓâw†6S÷&W÷'G5ö&6–2rÂwF—FÆRsÓâ}˜¸Í‹Š}¸Í‹BýŠÝ‹˜›íŠ}¸Í˜rªý‹-Š}‹‹B˜‚Š}‹]˜MŠ}ŠÒŠŠ}¸ÍªýŠ}˜m¸ÂrÂw7FGW2sÓâvFöæRuÒÀ¢²v¶W’sÓâw†6S%÷&W÷'G5öæ÷F–f–6F–öç2rÂwF—FÆRsÓâ}Š˜}Š˜Šòªý‹-Š}‹‹N(Í˜}Š}ˆÂŠ}‹˜MŠ}˜n(Í˜}Š}ˆÂŠýŠ}‹MŠ˜‹Šò˜‚˜‹m‹¸ÍŠ¢‹-˜mŠý˜r‹M¸Í˜Š¢rÂw7FGW2sÓâvFöæRuÒÀ¢²v¶W’sÓâw†6S5÷FV×öG&—fW'2rÂwF—FÆRsÓâ}‹Š}˜m˜mŠýªýŠ}˜b˜]˜˜-Š­ˆÂŠÍ‹=Š­ŠÍ˜¸ÂŠí˜Šý‹˜‚ýŠ˜}‹˜~(ÍŠ‹ŠýŠ}‹ýª˜]ª¸Â˜‚‹˜‹’ŠÍŠýŠ}ª˜m˜mŠý˜rªŠò˜]˜M¸ÂrÂw7FGW2sÓâvFöæRuÒÀ¢²v¶W’sÓâvÖö&–ÆUöVF–õöÆW'G2rÂwF—FÆRsÓâ}‹]ŠýŠ}˜}Š}¸ÂŠ}ŠíŠ­‹]Š}‹]¸Â˜‚Š-˜MŠ}‹˜R‹]ŠÝŠ®(Í‹=˜mŠÍ¸ÂrÂw7FGW2sÓâvFöæRuÒÀ¢²v¶W’sÓâv&ÆUö&÷BrÂwF—FÆRsÓâ}Š}Š­‹]Š}˜B‹ŠŠ}Š¢Š˜M˜r˜‚Š}‹‹=Š}˜B˜}˜]‹-˜]Š}˜b›í¸ÍŠ}˜^(Í˜}ŠrrÂw7FGW2sÓâvFöæRuÒÀ¢²v¶W’sÓâw6Æ'•÷6Æ—2rÂwF—FÆRsÓâ}ŠŠ}‹ªý‹Š}‹¸Â˜‚˜]‹MŠ}˜}Šý˜r˜¸Í‹BŠÝ˜-˜˜-¸ÂDbrÂw7FGW2sÓâvFöæRuÒÀ¢²v¶W’sÓâvFVÆ—fW'•÷VWVRrÂwF—FÆRsÓâ}‹]˜›íŠ}¸ÍŠýŠ}‹›í¸ÍŠ}˜]ªˆÂW6‚˜‚Š˜M˜rŠŠr&WG'’˜‚ªý‹-Š}‹‹BŠ­ŠÝ˜¸Í˜BrÂw7FGW2sÓâvFöæRuÒÀ¢²v¶W’sÓâw'VÆUöVæv–æUö&6RrÂwF—FÆRsÓâ}˜]˜Š­˜‹˜-˜Š}˜m¸Í˜b‹=˜]Š®(Í˜}ŠrŠ‹Š}¸Â˜]˜‹˜¸ÍˆÂŠ}‹mŠ}˜˜~(ÍªŠ}‹˜‚˜]Š}‹-Š}ŠòŠÝ‹m˜‹rÂw7FGW2sÓâvFöæRuÒÀ¢²v¶W’sÓâwWw&FU÷‡rÂwF—FÆRsÓâ}Š­ŠÍ˜]¸Í‹’Š˜~(Í‹˜‹-‹‹=Š}˜m¸ÂŠý¸ÍŠ­Š}Š¸Í‹2Šý‹‡÷V&Æ–2÷Ww&FRç‡rÂw7FGW2sÓâvFöæRuÒÀ¢²v¶W’sÓâv†VÇF…öö'6W'f&–Æ—G•ö&6RrÂwF—FÆRsÓâ}˜MŠ}ªò‹=˜MŠ}˜]Š¢˜˜m¸Â˜‚’ªý‹-Š}‹‹B‹=˜MŠ}˜]Š¢‹=Š}˜]Š}˜m˜rrÂw7FGW2sÓâvFöæRuÒÀ¢²v¶W’sÓâvöffÆ–æU÷7–æ5ö&6RrÂwF—FÆRsÓâ}‹-¸Í‹‹=Š}ŠíŠ¢Š½ŠŠ¢‹]˜Š-˜˜MŠ}¸Í˜b˜]˜ŠŠ}¸Í˜BŠý‹‹=‹˜‹rÂw7FGW2sÓâvFöæRuÒÀ¢ÒÀ¢w&VÖ–æ–ærrÓâ°¢²v¶W’sÓâvg&öçFVæE÷&öGV7F–öåö'VæFÆRrÂwF—FÆRsÓâ}‹=Š}ŠíŠ¢˜m˜}Š}¸Í¸Â&öGV7F–öâ'VæFÆR›í˜m˜B›í‹2Š}‹"˜m‹]Š‚æöFRõf—FR‹˜¸Â‹=¸Í‹=Š­˜RŠ­˜‹=‹˜r˜‚ŠÝ‹˜ªŠ}˜]˜B&&VÂŠ}‹"˜]‹˜‹ªý‹rÂw&–÷&—G’sÓâv†–v‚uÒÀ¢²v¶W’sÓâvFWf–6Uöf–VÆE÷FW7G2rÂwF—FÆRsÓâ}Š­‹=Š¢˜]¸ÍŠýŠ}˜m¸Âu=ˆÂW6ˆÂ-ˆÂŠ-˜MŠ}‹˜R˜‚ŠÝŠ}˜MŠ¢›í‹>(Í‹-˜]¸Í˜m˜r‹˜¸Âªý˜‹M¸Î(Í˜}Š}¸Â˜Š}˜-‹¸ÂrÂw&–÷&—G’sÓâv†–v‚uÒÀ¢²v¶W’sÓâvWFöÖFVE÷FW7E÷7V—FRrÂwF—FÆRsÓâ}Š­ª˜]¸Í˜BŠ­‹=Š¢Ší˜ŠýªŠ}‹’˜‚‹=˜mŠ}‹¸Í˜˜}Š}¸ÂŠÝ‹m˜‹ýªý‹-Š}‹‹Bý‹M¸Í˜Š¢rÂw&–÷&—G’sÓâvÖVF—VÒuÒÀ¢²v¶W’sÓâv†öÆ–F•÷&÷f–FW%ö–çFVw&F–öârÂwF—FÆRsÓâ}Š}Š­‹]Š}˜BŠ˜r˜]˜mŠ‹’‹‹=˜]¸ÂŠ­‹‹}¸Í˜MŠ}Š¢‹=Š}˜MŠ}˜m˜rŠý‹‹]˜‹Š¢Š}‹Š}Šm˜r’˜]‹Š­Š‹rÂw&–÷&—G’sÓâvÖVF—VÒuÒÀ¢ÒÀ¢Ó°§Ð§&÷WFR‚ttUBrÂrö’öFÖ–â÷&ö¦V7B×7FGW2rÂgVæ7F–öâ‚GÂF"ÂGR—°¢&WGW&â÷&ö¦V7E÷†6U÷7FGW2‚“°§ÒÂfÇ6RÂDÔ”â“° §&÷WFR‚ttUBrÂrö’÷&ö¦V7B×fW'6–öârÂgVæ7F–öâ‚GÂF"ÂGR—°¢G7BÒ÷&ö¦V7E÷†6U÷7FGW2‚“°¢&WGW&â°¢w6—FU÷fW'6–öârÓâG7E²wfW'6–öâuÕ²w6—FU÷fW'6–öâuÒÀ¢v÷fW'6–öârÓâG7E²wfW'6–öâuÕ²v÷fW'6–öâuÒÀ¢w†6RrÓâG7E²wfW'6–öâuÕ²w†6RuÒÀ¢w&VÆV6UöæÖRrÓâG7E²wfW'6–öâuÕ²w&VÆV6UöæÖRuÒÀ¢Ó°§ÒÂG'VR“°   ¢ò¢ÒÒÒÒÒÒÒÒÒÒÒÒÒÒÒÒ˜Š}‹"»S¢›íŠ}¸ÍŠýŠ}‹¸ÍˆÂ‹]˜›í¸ÍŠ}˜^(Í˜}Š}ˆÂ'VÆRVæv–æR˜‚Š}‹Š­˜-Š}¸ÂŠ­ŠÍ˜]¸Í‹¸ÂÒÒÒÒÒÒÒÒÒÒÒÒÒÒÒÒ¢ð¦gVæ7F–öâ÷†6SU÷6WGF–ær‚F¶W’ÂFFVfVÇCÖçVÆÂ—°¢G'’°¢G"ÒF#£¦öæR‚%4TÄT5BfÇVRe$ôÒ÷6WGF–æw2t„U$R¶W–Óò"Â²F¶W•Ò“°¢–b‚G"’&WGW&âFFVfVÇC°¢GbÒ§6öåöFV6öFR‚G%²wfÇVRuÒÂG'VR“°¢&WGW&â‚GbÓÓÒçVÆÂÇÂGbÓÓÒrr’òFFVfVÇB¢Gc°¢Ò6F6‚…F‡&÷v&ÆRFR’²&WGW&âFFVfVÇC²Ð§Ð¦gVæ7F–öâ÷†6SU÷6WE÷6WGF–ær‚F¶W’ÂGfÇVR—°¢F#£§'Vâ‚$”å4U%B”åDò÷6WGF–æw2†¶W–ÆfÇVV’dÅTU2ƒòÃò’ôâEUÄ”4DR´U’UDDRfÇVSÕdÅTU2‡fÇVR’"Â²F¶W’Â§6öåöVæ6öFR‚GfÇVRÂ¥4ôåõTäU44TEõTä”4ôDR•Ò“°§Ð¦gVæ7F–öâ÷†6SU÷&öÆU÷'VÆW5öFVfVÇB‚—°¢&WGW&â°¢v÷W&F÷"rÓâ²vGWG•öÖ–çWFW2sÓãCS2Âv÷fW'F–ÖUöÆ–Ö—EöÖ–çWFW2sÓã#rÂw7W'ÇW5ögFW%öÖ–çWFW2sÓãCƒÒÀ¢vÆ–æUö6†–VbrÓâ²vGWG•öÖ–çWFW2sÓãCS2Âv÷fW'F–ÖUöÆ–Ö—EöÖ–çWFW2sÓã#rÂw7W'ÇW5ögFW%öÖ–çWFW2sÓãCƒÒÀ¢v–ç7V7F÷"rÓâ²vGWG•öÖ–çWFW2sÓãCS2Âv÷fW'F–ÖUöÆ–Ö—EöÖ–çWFW2sÓãCrÂw7W'ÇW5ögFW%öÖ–çWFW2sÓãcÒÀ¢w6Væ–÷%ö–ç7V7F÷"rÓâ²vGWG•öÖ–çWFW2sÓãCS2Âv÷fW'F–ÖUöÆ–Ö—EöÖ–çWFW2sÓãCrÂw7W'ÇW5ögFW%öÖ–çWFW2sÓãcÒÀ¢v6†–Veö–ç7V7F÷"rÓâ²vGWG•öÖ–çWFW2sÓãCS2Âv÷fW'F–ÖUöÆ–Ö—EöÖ–çWFW2sÓãCrÂw7W'ÇW5ögFW%öÖ–çWFW2sÓãcÒÀ¢vöff–6RrÓâ²vGWG•öÖ–çWFW2sÓãCS2Âv÷fW'F–ÖUöÆ–Ö—EöÖ–çWFW2sÓã#CÂw7W'ÇW5ögFW%öÖ–çWFW2sÓãc“5ÒÀ¢vFVfVÇBrÓâ²vGWG•öÖ–çWFW2sÓãCS2Âv÷fW'F–ÖUöÆ–Ö—EöÖ–çWFW2sÓã#rÂw7W'ÇW5ögFW%öÖ–çWFW2sÓãCƒÒÀ¢Ó°§Ð¦gVæ7F–öâ÷†6SUöVç7W&Uö6÷&U÷F&ÆW2‚—°¢G'’°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2FVÆ—fW'•÷VWVR€¢–B$”t”åBUDõô”ä5$TÔTåB$”Ô%’´U’À¢6†ææVÂd$4„"ƒ#’äõBåTÄÂÀ¢F&vWE÷G—Rd$4„"ƒ3’åTÄÂÀ¢F&vWEö–B$”t”åBåTÄÂÀ¢Fõ÷fÇVRd$4„"ƒ“’åTÄÂÀ¢F—FÆRd$4„"ƒ#SR’åTÄÂÀ¢&öG’DU…BåTÄÂÀ¢–ÆöB¥4ôâåTÄÂÀ¢7FGW2TåTÒ‚wVæF–ærrÂw&ö6W76–ærrÂw6VçBrÂvf–ÆVBrÂv6æ6VÆÆVBr’äõBåTÄÂDTdTÅBwVæF–ærrÀ¢GFV×G2”åBäõBåTÄÂDTdTÅBÀ¢Ö…öGFV×G2”åBäõBåTÄÂDTdTÅBRÀ¢æW‡EöGFV×EöBDDUD”ÔRåTÄÂÀ¢Æ7EöW'&÷"DU…BåTÄÂÀ¢6VçEöBDDUD”ÔRåTÄÂÀ¢7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÀ¢WFFVEöBDDUD”ÔRåTÄÂDTdTÅBåTÄÂôâUDDR5U%$TåEõD”ÔU5DÕÀ¢”äDU‚–G…öFVÆ—fW'•÷7FGW5öæW‡B‡7FGW2ÆæW‡EöGFV×EöB’À¢”äDU‚–G…öFVÆ—fW'•÷F&vWB‡F&vWE÷G—RÇF&vWEö–B’À¢”äDU‚–G…öFVÆ—fW'•ö6†ææVÂ†6†ææVÂ¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“°¢Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2&öÆU÷v÷&µ÷'VÆW2€¢–B”åBUDõô”ä5$TÔTåB$”Ô%’´U’À¢&öÆUö¶W’d$4„"ƒƒ’äõBåTÄÂTä•TRÀ¢F—FÆRd$4„"ƒ#’åTÄÂÀ¢GWG•öÖ–çWFW2”åBäõBåTÄÂDTdTÅBCS2À¢÷fW'F–ÖUöÆ–Ö—EöÖ–çWFW2”åBäõBåTÄÂDTdTÅB#rÀ¢7W'ÇW5ögFW%öÖ–çWFW2”åBäõBåTÄÂDTdTÅBCƒÀ¢æ–v‡E÷7F'BD”ÔRäõBåTÄÂDTdTÅBs##££rÀ¢æ–v‡EöVæBD”ÔRäõBåTÄÂDTdTÅBsc££rÀ¢—5ö7F—fRD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÀ¢WFFVEöBDDUD”ÔRåTÄÂDTdTÅBåTÄÂôâUDDR5U%$TåEõD”ÔU5DÕ ¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“°¢Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E27—7FVÕö†VÇF…öÆöw2€¢–B$”t”åBUDõô”ä5$TÔTåB$”Ô%’´U’À¢ÆWfVÂd$4„"ƒ#’äõBåTÄÂDTdTÅBv–æfòrÀ¢6÷W&6Rd$4„"ƒƒ’åTÄÂÀ¢ÖW76vRDU…BåTÄÂÀ¢6öçFW‡B¥4ôâåTÄÂÀ¢7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÀ¢”äDU‚–G…ö†VÇF…öÆWfVÅ÷F–ÖR†ÆWfVÂÆ7&VFVEöB’À¢”äDU‚–G…ö†VÇF…÷6÷W&6U÷F–ÖR‡6÷W&6RÆ7&VFVEöB¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“°¢Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2öffÆ–æU÷7–æ5öÆöw2€¢–B$”t”åBUDõô”ä5$TÔTåB$”Ô%’´U’À¢W6W%ö–B$”t”åBåTÄÂÀ¢FWf–6Uö–Bd$4„"ƒ#’åTÄÂÀ¢—FVÕ÷G—Rd$4„"ƒS’åTÄÂÀ¢6Æ–VçE÷WV–Bd$4„"ƒ#’åTÄÂÀ¢7FGW2d$4„"ƒ#’äõBåTÄÂDTdTÅBw&V6V—fVBrÀ¢–ÆöB¥4ôâåTÄÂÀ¢&W7öç6R¥4ôâåTÄÂÀ¢7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÀ¢Tä•TR´U’WööffÆ–æUö—FVÒ‡W6W%ö–BÂ6Æ–VçE÷WV–B’À¢”äDU‚–G…ööffÆ–æU÷W6W%÷F–ÖR‡W6W%ö–BÆ7&VFVEöB¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“°¢Ò6F6‚…F‡&÷v&ÆRFR’·Ð ¢G'’²–b‚F#£¦öæR‚%4„õr4ôÅTÔå2e$ôÒ&öÆU÷v÷&µ÷'VÆW2t„U$Rf–VÆCÒvWFõ÷6†–gEöVæ&ÆVBr"’’F#£§'Vâ‚$ÅDU"D$ÄR&öÆU÷v÷&µ÷'VÆW2DB4ôÅTÔâWFõ÷6†–gEöVæ&ÆVBD”å””åBƒ’äõBåTÄÂDTdTÅB"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²–b‚F#£¦öæR‚%4„õr4ôÅTÔå2e$ôÒ&öÆU÷v÷&µ÷'VÆW2t„U$Rf–VÆCÒv6†V6¶–åöç•÷F–ÖRr"’’F#£§'Vâ‚$ÅDU"D$ÄR&öÆU÷v÷&µ÷'VÆW2DB4ôÅTÔâ6†V6¶–åöç•÷F–ÖRD”å””åBƒ’äõBåTÄÂDTdTÅB"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²–b‚F#£¦öæR‚%4„õr4ôÅTÔå2e$ôÒ&öÆU÷v÷&µ÷'VÆW2t„U$Rf–VÆCÒvÆÆ÷vVEö6†V6¶–åög&öÒr"’’F#£§'Vâ‚$ÅDU"D$ÄR&öÆU÷v÷&µ÷'VÆW2DB4ôÅTÔâÆÆ÷vVEö6†V6¶–åög&öÒD”ÔRåTÄÂ"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²–b‚F#£¦öæR‚%4„õr4ôÅTÔå2e$ôÒ&öÆU÷v÷&µ÷'VÆW2t„U$Rf–VÆCÒvÆÆ÷vVEö6†V6¶–å÷Fòr"’’F#£§'Vâ‚$ÅDU"D$ÄR&öÆU÷v÷&µ÷'VÆW2DB4ôÅTÔâÆÆ÷vVEö6†V6¶–å÷FòD”ÔRåTÄÂ"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²–b‚F#£¦öæR‚%4„õr4ôÅTÔå2e$ôÒ&öÆU÷v÷&µ÷'VÆW2t„U$Rf–VÆCÒwv&åö&Vf÷&Uö÷fW'F–ÖUö6öÖ–çWFW2r"’’F#£§'Vâ‚$ÅDU"D$ÄR&öÆU÷v÷&µ÷'VÆW2DB4ôÅTÔâv&åö&Vf÷&Uö÷fW'F–ÖUö6öÖ–çWFW2”åBäõBåTÄÂDTdTÅBR"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²–b‚F#£¦öæR‚%4„õr4ôÅTÔå2e$ôÒ&öÆU÷v÷&µ÷'VÆW2t„U$Rf–VÆCÒw&WV—&Uö6†V6¶÷WEögFW%ö6r"’’F#£§'Vâ‚$ÅDU"D$ÄR&öÆU÷v÷&µ÷'VÆW2DB4ôÅTÔâ&WV—&Uö6†V6¶÷WEögFW%ö6D”å””åBƒ’äõBåTÄÂDTdTÅB"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²–b‚F#£¦öæR‚%4„õr4ôÅTÔå2e$ôÒ&öÆU÷v÷&µ÷'VÆW2t„U$Rf–VÆCÒvæ–v‡Eö6Æ2r"’’F#£§'Vâ‚$ÅDU"D$ÄR&öÆU÷v÷&µ÷'VÆW2DB4ôÅTÔâæ–v‡Eö6Æ2D”å””åBƒ’äõBåTÄÂDTdTÅB"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²–b‚F#£¦öæR‚%4„õr4ôÅTÔå2e$ôÒ&öÆU÷v÷&µ÷'VÆW2t„U$Rf–VÆCÒvg&–F•ö6Æ2r"’’F#£§'Vâ‚$ÅDU"D$ÄR&öÆU÷v÷&µ÷'VÆW2DB4ôÅTÔâg&–F•ö6Æ2D”å””åBƒ’äõBåTÄÂDTdTÅB"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²–b‚F#£¦öæR‚%4„õr4ôÅTÔå2e$ôÒ&öÆU÷v÷&µ÷'VÆW2t„U$Rf–VÆCÒv†öÆ–F•ö6Æ2r"’’F#£§'Vâ‚$ÅDU"D$ÄR&öÆU÷v÷&µ÷'VÆW2DB4ôÅTÔâ†öÆ–F•ö6Æ2D”å””åBƒ’äõBåTÄÂDTdTÅB"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²–b‚F#£¦öæR‚%4„õr4ôÅTÔå2e$ôÒ&öÆU÷v÷&µ÷'VÆW2t„U$Rf–VÆCÒvFW67&—F–öâr"’’F#£§'Vâ‚$ÅDU"D$ÄR&öÆU÷v÷&µ÷'VÆW2DB4ôÅTÔâFW67&—F–öâDU…BåTÄÂ"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð ¢G'’°¢f÷&V6‚…÷†6SU÷&öÆU÷'VÆW5öFVfVÇB‚’2G&³ÓâG'"’°¢F#£§'Vâ‚$”å4U%B”täõ$R”åDò&öÆU÷v÷&µ÷'VÆW2‡&öÆUö¶W’ÇF—FÆRÆGWG•öÖ–çWFW2Æ÷fW'F–ÖUöÆ–Ö—EöÖ–çWFW2Ç7W'ÇW5ögFW%öÖ–çWFW2’dÅTU2ƒòÃòÃòÃòÃò’"À¢²G&²ÂG&²Â†–çB’G'%²vGWG•öÖ–çWFW2uÒÂ†–çB’G'%²v÷fW'F–ÖUöÆ–Ö—EöÖ–çWFW2uÒÂ†–çB’G'%²w7W'ÇW5ögFW%öÖ–çWFW2uÕÒ“°¢Ð¢Ò6F6‚…F‡&÷v&ÆRFR’·Ð§Ð¦gVæ7F–öâ÷†6SUö†VÇF‚‚FÆWfVÂÂG6÷W&6RÂFÖW76vRÂF6öçFW‡CÕµÒ—°¢G'’²÷†6SUöVç7W&Uö6÷&U÷F&ÆW2‚“²F#£§'Vâ‚$”å4U%B”åDò7—7FVÕö†VÇF…öÆöw2†ÆWfVÂÇ6÷W&6RÆÖW76vRÆ6öçFW‡B’dÅTU2ƒòÃòÃòÃò’"Â²FÆWfVÂÂG6÷W&6RÂFÖW76vRÆ§6öåöVæ6öFR‚F6öçFW‡BÄ¥4ôåõTäU44TEõTä”4ôDR•Ò“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð§Ð¦gVæ7F–öâ÷†6SU÷'VÆUöf÷%÷&öÆR‚G&öÆT¶W’—°¢÷†6SUöVç7W&Uö6÷&U÷F&ÆW2‚“°¢G&öÆT¶W’ÒG&–Ò‚‡7G&–ær’G&öÆT¶W’’ó¢vFVfVÇBs°¢G'’°¢G"ÒF#£¦öæR‚%4TÄT5B¢e$ôÒ&öÆU÷v÷&µ÷'VÆW2t„U$R&öÆUö¶W“ÓòäB—5ö7F—fSÓÄ”Ô•B"Â²G&öÆT¶W•Ò“°¢–b‚G"’G"ÒF#£¦öæR‚%4TÄT5B¢e$ôÒ&öÆU÷v÷&µ÷'VÆW2t„U$R&öÆUö¶W“ÒvFVfVÇBräB—5ö7F—fSÓÄ”Ô•B"“°¢–b‚G"’&WGW&âG#°¢Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢FBÒ÷†6SU÷&öÆU÷'VÆW5öFVfVÇB‚“°¢&WGW&â²w&öÆUö¶W’sÓâvFVfVÇBuÒ²FE²vFVfVÇBuÓ°§Ð¦gVæ7F–öâ÷†6SU÷&ö¦V7E÷7FGW2‚—°¢F&6RÒgVæ7F–öåöW†—7G2‚u÷&ö¦V7E÷†6U÷7FGW2r’ò÷&ö¦V7E÷†6U÷7FGW2‚’¢²v6ö×ÆWFVBsÓåµÒÂw&VÖ–æ–ærsÓåµÒÂwfW'6–öâsÓåµÕÓ°¢F&6U²wfW'6–öâuÒÒ²w6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôâÂw†6RsÓãrÂw&VÆV6UöæÖRsÓâu†6RrãrÒ6†–gB66†VGVÆ–ærf–æÆ—¦F–öâuÓ°¢F&6U²v6ö×ÆWFVBuÕµÒÒ²v¶W’sÓâvFVÆ—fW'•÷VWVRrÂwF—FÆRsÓâ}‹]˜›íŠ}¸ÍŠýŠ}‹›í¸ÍŠ}˜]ªˆÂW6‚˜‚Š˜M˜rŠŠr&WG'’˜‚ªý‹-Š}‹‹BŠ­ŠÝ˜¸Í˜BrÂw7FGW2sÓâvFöæRuÓ°¢F&6U²v6ö×ÆWFVBuÕµÒÒ²v¶W’sÓâw'VÆUöVæv–æUö&6RrÂwF—FÆRsÓâ}˜]˜Š­˜‹˜-˜Š}˜m¸Í˜b‹=˜]Š®(Í˜}ŠrŠ‹Š}¸Â˜]˜‹˜¸ÍˆÂŠ}‹mŠ}˜˜~(ÍªŠ}‹˜‚˜]Š}‹-Š}ŠòŠÝ‹m˜‹rÂw7FGW2sÓâvFöæRuÓ°¢F&6U²v6ö×ÆWFVBuÕµÒÒ²v¶W’sÓâwWw&FU÷‡rÂwF—FÆRsÓâ}Š­ŠÍ˜]¸Í‹’Š˜~(Í‹˜‹-‹‹=Š}˜m¸ÂŠý¸ÍŠ­Š}Š¸Í‹2Šý‹‡÷V&Æ–2÷Ww&FRç‡rÂw7FGW2sÓâvFöæRuÓ°¢F&6U²v6ö×ÆWFVBuÕµÒÒ²v¶W’sÓâv†VÇF…öö'6W'f&–Æ—G•ö&6RrÂwF—FÆRsÓâ}˜MŠ}ªò‹=˜MŠ}˜]Š¢˜˜m¸Â˜‚’ªý‹-Š}‹‹B‹=˜MŠ}˜]Š¢‹=Š}˜]Š}˜m˜rrÂw7FGW2sÓâvFöæRuÓ°¢F&6U²v6ö×ÆWFVBuÕµÒÒ²v¶W’sÓâvöffÆ–æU÷7–æ5ö&6RrÂwF—FÆRsÓâ}‹-¸Í‹‹=Š}ŠíŠ¢Š½ŠŠ¢‹]˜Š-˜˜MŠ}¸Í˜b˜]˜ŠŠ}¸Í˜BŠý‹‹=‹˜‹rÂw7FGW2sÓâvFöæRuÓ°¢F&6U²w&VÖ–æ–æruÒÒ°¢²v¶W’sÓâvg&öçFVæE÷&öGV7F–öåö'VæFÆRrÂwF—FÆRsÓâ}‹=Š}ŠíŠ¢˜m˜}Š}¸Í¸Â&öGV7F–öâ'VæFÆR›í˜m˜B›í‹2Š}‹"˜m‹]Š‚æöFRõf—FR‹˜¸Â‹=¸Í‹=Š­˜RŠ­˜‹=‹˜rrÂw&–÷&—G’sÓâv†–v‚uÒÀ¢²v¶W’sÓâvFWf–6Uöf–VÆE÷FW7G2rÂwF—FÆRsÓâ}Š­‹=Š¢˜]¸ÍŠýŠ}˜m¸Âu=ˆÂW6ˆÂ"˜‚Š-˜MŠ}‹˜R‹˜¸Âªý˜‹M¸Î(Í˜}Š}¸Â˜Š}˜-‹¸ÂrÂw&–÷&—G’sÓâv†–v‚uÒÀ¢²v¶W’sÓâvWFöÖFVE÷FW7E÷7V—FRrÂwF—FÆRsÓâ}Š­ª˜]¸Í˜BŠ­‹=Š¢Ší˜ŠýªŠ}‹’˜‚‹=˜mŠ}‹¸Í˜˜}Š}¸ÂŠÝ‹m˜‹ýªý‹-Š}‹‹Bý‹M¸Í˜Š¢rÂw&–÷&—G’sÓâvÖVF—VÒuÒÀ¢²v¶W’sÓâv†öÆ–F•÷&÷f–FW%ö–çFVw&F–öârÂwF—FÆRsÓâ}Š}Š­‹]Š}˜BŠ˜r˜]˜mŠ‹’‹‹=˜]¸ÂŠ­‹‹}¸Í˜MŠ}Š¢‹=Š}˜MŠ}˜m˜rŠý‹‹]˜‹Š¢Š}‹Š}Šm˜r’˜]‹Š­Š‹rÂw&–÷&—G’sÓâvÖVF—VÒuÒÀ¢Ó°¢&WGW&âF&6S°§Ð §&÷WFR‚ttUBrÂrö’öFÖ–â÷†6SR÷7FGW2rÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6SUöVç7W&Uö6÷&U÷F&ÆW2‚“°¢&WGW&â÷†6SU÷&ö¦V7E÷7FGW2‚“°§ÒÂfÇ6RÂDÔ”â“° §&÷WFR‚ttUBrÂrö’öFÖ–â÷'VÆRÖVæv–æR÷&öÆW2rÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6SwuöVç7W&R‚“°¢&WGW&âF#£¦ÆÂ‚%4TÄT5B¢e$ôÒ&öÆU÷v÷&µ÷'VÆW2õ$DU"%’–B"“°§ÒÂfÇ6RÂDÔ”â“° §&÷WFR‚uUBrÂrö’öFÖ–â÷'VÆRÖVæv–æR÷&öÆW2÷·&öÆUö¶W—ÒrÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6SwuöVç7W&R‚“°¢G&²Ò&Vu÷&WÆ6R‚rõµæ×¤Õ£Ó•õÂÕÒòrÂrrÂ‡7G&–ær’G²w&öÆUö¶W’uÒ“°¢–b‚G&²ÓÓÒrr’‡GG£¦W'&÷"‚}ª˜M¸ÍŠò‹=˜]Š¢˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÂC#"“°¢FGWG’ÒÖ‚ƒÂ†–çB’‚F%²vGWG•öÖ–çWFW2uÒóòCS2’“°¢F÷BÒÖ‚ƒÂ†–çB’‚F%²v÷fW'F–ÖUöÆ–Ö—EöÖ–çWFW2uÒóò#r’“°¢G7W'ÇW2ÒÖ‚‚FGWG’²F÷BÂ†–çB’‚F%²w7W'ÇW5ögFW%öÖ–çWFW2uÒóò‚FGWG’²F÷B’’“°¢GF—FÆRÒG&–Ò‚‡7G&–ær’‚F%²wF—FÆRuÒóòG&²’“°¢Fæ–v‡E7F'BÒ&VuöÖF6‚‚rõåÆG³Ã'Ó¥ÆG³'ÒòrÂ‡7G&–ær’‚F%²væ–v‡E÷7F'BuÒóòrr’’ò7V'7G"‚‡7G&–ær’F%²væ–v‡E÷7F'BuÒÃÃR’âs£r¢s##££s°¢Fæ–v‡DVæBÒ&VuöÖF6‚‚rõåÆG³Ã'Ó¥ÆG³'ÒòrÂ‡7G&–ær’‚F%²væ–v‡EöVæBuÒóòrr’’ò7V'7G"‚‡7G&–ær’F%²væ–v‡EöVæBuÒÃÃR’âs£r¢sc££s°¢Fg&öÒÒ&VuöÖF6‚‚rõåÆG³Ã'Ó¥ÆG³'ÒòrÂ‡7G&–ær’‚F%²vÆÆ÷vVEö6†V6¶–åög&öÒuÒóòrr’’ò7V'7G"‚‡7G&–ær’F%²vÆÆ÷vVEö6†V6¶–åög&öÒuÒÃÃR’âs£r¢çVÆÃ°¢GFòÒ&VuöÖF6‚‚rõåÆG³Ã'Ó¥ÆG³'ÒòrÂ‡7G&–ær’‚F%²vÆÆ÷vVEö6†V6¶–å÷FòuÒóòrr’’ò7V'7G"‚‡7G&–ær’F%²vÆÆ÷vVEö6†V6¶–å÷FòuÒÃÃR’âs£r¢çVÆÃ°¢Gv&âÒÖ‚ƒÂÖ–âƒ#CÂ†–çB’‚F%²wv&åö&Vf÷&Uö÷fW'F–ÖUö6öÖ–çWFW2uÒóòR’’“°¢FFW62ÒG&–Ò‚‡7G&–ær’‚F%²vFW67&—F–öâuÒóòrr’“°¢FÖ„÷VãÖÖ‚ƒcÂ†–çB’‚F%²vÖ…ö÷Vå÷6W76–öåöÖ–çWFW2uÒóò“c’“°¢FWFô6Æ÷6TgFW#ÖÖ‚ƒÂ†–çB’‚F%²vWFõö6Æ÷6UögFW%öÖ–çWFW2uÒóò’“°¢Fw&6SÖÖ‚ƒÂ†–çB’‚F%²v6†V6¶÷WEöw&6UöÖ–çWFW2uÒóòR’“°¢F#£§'Vâ‚$”å4U%B”åDò&öÆU÷v÷&µ÷'VÆW2‡&öÆUö¶W’ÇF—FÆRÆGWG•öÖ–çWFW2Æ÷fW'F–ÖUöÆ–Ö—EöÖ–çWFW2Ç7W'ÇW5ögFW%öÖ–çWFW2Ææ–v‡E÷7F'BÆæ–v‡EöVæBÆWFõ÷6†–gEöVæ&ÆVBÆ6†V6¶–åöç•÷F–ÖRÆÆÆ÷vVEö6†V6¶–åög&öÒÆÆÆ÷vVEö6†V6¶–å÷FòÇv&åö&Vf÷&Uö÷fW'F–ÖUö6öÖ–çWFW2Ç&WV—&Uö6†V6¶÷WEögFW%ö6Ææ–v‡Eö6Æ2Æg&–F•ö6Æ2Æ†öÆ–F•ö6Æ2Æ–æ6ÇVFUög&–F•ö–åöGWG’Æ–æ6ÇVFUö†öÆ–F•ö–åöGWG’ÆÖ…ö÷Vå÷6W76–öåöÖ–çWFW2ÆWFõö6Æ÷6UöVæ&ÆVBÆWFõö6Æ÷6UögFW%öÖ–çWFW2Æ6†V6¶÷WEöw&6UöÖ–çWFW2Æ—5ö7F—fRÆFW67&—F–öâ¢dÅTU2ƒòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃò¢ôâEUÄ”4DR´U’UDDRF—FÆSÕdÅTU2‡F—FÆR’ÆGWG•öÖ–çWFW3ÕdÅTU2†GWG•öÖ–çWFW2’Æ÷fW'F–ÖUöÆ–Ö—EöÖ–çWFW3ÕdÅTU2†÷fW'F–ÖUöÆ–Ö—EöÖ–çWFW2’Ç7W'ÇW5ögFW%öÖ–çWFW3ÕdÅTU2‡7W'ÇW5ögFW%öÖ–çWFW2’Ææ–v‡E÷7F'CÕdÅTU2†æ–v‡E÷7F'B’Ææ–v‡EöVæCÕdÅTU2†æ–v‡EöVæB’ÆWFõ÷6†–gEöVæ&ÆVCÕdÅTU2†WFõ÷6†–gEöVæ&ÆVB’Æ6†V6¶–åöç•÷F–ÖSÕdÅTU2†6†V6¶–åöç•÷F–ÖR’ÆÆÆ÷vVEö6†V6¶–åög&öÓÕdÅTU2†ÆÆ÷vVEö6†V6¶–åög&öÒ’ÆÆÆ÷vVEö6†V6¶–å÷FóÕdÅTU2†ÆÆ÷vVEö6†V6¶–å÷Fò’Çv&åö&Vf÷&Uö÷fW'F–ÖUö6öÖ–çWFW3ÕdÅTU2‡v&åö&Vf÷&Uö÷fW'F–ÖUö6öÖ–çWFW2’Ç&WV—&Uö6†V6¶÷WEögFW%ö6ÕdÅTU2‡&WV—&Uö6†V6¶÷WEögFW%ö6’Ææ–v‡Eö6Æ3ÕdÅTU2†æ–v‡Eö6Æ2’Æg&–F•ö6Æ3ÕdÅTU2†g&–F•ö6Æ2’Æ†öÆ–F•ö6Æ3ÕdÅTU2††öÆ–F•ö6Æ2’Æ–æ6ÇVFUög&–F•ö–åöGWG“ÕdÅTU2†–æ6ÇVFUög&–F•ö–åöGWG’’Æ–æ6ÇVFUö†öÆ–F•ö–åöGWG“ÕdÅTU2†–æ6ÇVFUö†öÆ–F•ö–åöGWG’’ÆÖ…ö÷Vå÷6W76–öåöÖ–çWFW3ÕdÅTU2†Ö…ö÷Vå÷6W76–öåöÖ–çWFW2’ÆWFõö6Æ÷6UöVæ&ÆVCÕdÅTU2†WFõö6Æ÷6UöVæ&ÆVB’ÆWFõö6Æ÷6UögFW%öÖ–çWFW3ÕdÅTU2†WFõö6Æ÷6UögFW%öÖ–çWFW2’Æ6†V6¶÷WEöw&6UöÖ–çWFW3ÕdÅTU2†6†V6¶÷WEöw&6UöÖ–çWFW2’Æ—5ö7F—fSÕdÅTU2†—5ö7F—fR’ÆFW67&—F–öãÕdÅTU2†FW67&—F–öâ’"À¢²G&²ÂGF—FÆRÂFGWG’ÂF÷BÂG7W'ÇW2ÂFæ–v‡E7F'BÂFæ–v‡DVæBÂV×G’‚F%²vWFõ÷6†–gEöVæ&ÆVBuÒ“ó£ÂV×G’‚F%²v6†V6¶–åöç•÷F–ÖRuÒ“ó£ÂFg&öÒÂGFòÂGv&âÂV×G’‚F%²w&WV—&Uö6†V6¶÷WEögFW%ö6uÒ“ó£ÂV×G’‚F%²væ–v‡Eö6Æ2uÒ“ó£ÂV×G’‚F%²vg&–F•ö6Æ2uÒ“ó£ÂV×G’‚F%²v†öÆ–F•ö6Æ2uÒ“ó£ÂV×G’‚F%²v–æ6ÇVFUög&–F•ö–åöGWG’uÒ“ó£ÂV×G’‚F%²v–æ6ÇVFUö†öÆ–F•ö–åöGWG’uÒ“ó£ÂFÖ„÷VâÂV×G’‚F%²vWFõö6Æ÷6UöVæ&ÆVBuÒ“ó£ÂFWFô6Æ÷6TgFW"ÂFw&6RÂV×G’‚F%²v—5ö7F—fRuÒ“ó£ÂFFW65Ò“°¢÷†6SUö†VÇF‚‚v–æfòrÂw'VÆRÖVæv–æRrÂw'VÆRWFFVBrÅ²w&öÆUö¶W’sÓâG&²Âv'’sÓâGU²v–BuÒóòçVÆÅÒ“°¢&WGW&â²vö²sÓçG'VRÂw'VÆRsÓäF#£¦öæR‚%4TÄT5B¢e$ôÒ&öÆU÷v÷&µ÷'VÆW2t„U$R&öÆUö¶W“Óò"Å²G&µÒ•Ó°§ÒÂfÇ6RÂDÔ”â“° §&÷WFR‚ttUBrÂrö’öFÖ–âöFVÆ—fW'’×VWVRrÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6SUöVç7W&Uö6÷&U÷F&ÆW2‚“°¢G7FGW2ÒG&–Ò‚‡7G&–ær’‚G²w7FGW2uÒóòrr’“°¢F&w3ÕµÓ²Gv†W&SÒsÓs°¢–b‚G7FGW2ÓÒrr’²Gv†W&RãÒräB7FGW3Óòs²F&w5µÓÒG7FGW3²Ð¢&WGW&âF#£¦ÆÂ‚%4TÄT5B¢e$ôÒFVÆ—fW'•÷VWVRt„U$RGv†W&Rõ$DU"%’–BDU42Ä”Ô•B3"ÂF&w2“°§ÒÂfÇ6RÂDÔ”â“° §&÷WFR‚uõ5BrÂrö’öFÖ–âöFVÆ—fW'’×VWVR÷&ö6W72rÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6SUöVç7W&Uö6÷&U÷F&ÆW2‚“°¢–b†6Æ75öW†—7G2‚tFVÆ—fW'•VWVRr’’&WGW&âFVÆ—fW'•VWVS£§&ö6W72‚†–çB’‚F%²vÆ–Ö—BuÒóòS’“°¢&WGW&â²vö²sÓæfÇ6RÂvW'&÷"sÓâtFVÆ—fW'•VWVR6Æ72æ÷BÆöFVBuÓ°§ÒÂfÇ6RÂDÔ”â“° §&÷WFR‚uõ5BrÂrö’öÖö&–ÆRööffÆ–æR×7–æ2rÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6SwEöVç7W&R‚“°¢F—FV×2ÒF%²v—FV×2uÒóòµÓ°¢–b‚—5ö'&’‚F—FV×2’’‡GG£¦W'&÷"‚}˜‹˜]Š¢‹]˜Š-˜˜MŠ}¸Í˜b˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÂC“°¢G&V6V—fVCÓ²G&ö6W76VCÓ²Ff–ÆVCÓ²FGWÆ–6FW3Ó²G7–æ6VCÕµÓ²FW'&÷'3ÕµÓ°¢f÷&V6‚‚F—FV×22F—B’°¢–b‚—5ö'&’‚F—B’’²Ff–ÆVB²³²6öçF–çVS²Ð¢GWV–BÒ‡7G&–ær’‚F—E²v6Æ–VçE÷WV–BuÒóòF—E²wWV–BuÒóòÖCR†§6öåöVæ6öFR‚F—BÄ¥4ôåõTäU44TEõTä”4ôDR’’“°¢GF‚Ò‡7G&–ær’‚F—E²wF‚uÒóòF—E²wG—RuÒóòwVæ¶æ÷vâr“°¢G–ÆöBÒ§6öåöVæ6öFR‚F—BÄ¥4ôåõTäU44TEõTä”4ôDR“°¢FÆöt–BÒçVÆÃ°¢G'’°¢FW†—7G2ÒF#£¦öæR‚%4TÄT5B–BÇ7FGW2e$ôÒöffÆ–æU÷7–æ5öÆöw2t„U$RW6W%ö–CÓòäB6Æ–VçE÷WV–CÓòÄ”Ô•B"Â²GU²v–BuÒóòçVÆÂÂGWV–EÒ“°¢–b‚FW†—7G2bb–åö'&’‚‡7G&–ær’FW†—7G5²w7FGW2uÒÂ²w&ö6W76VBrÂvGWÆ–6FRuÒÂG'VR’’²FGWÆ–6FW2²³²G7–æ6VEµÓÒGWV–C²6öçF–çVS²Ð¢–b‚FW†—7G2’FÆöt–BÒ†–çB’FW†—7G5²v–BuÓ°¢VÇ6R°¢FÆöt–BÒF#£¦–ç6W'B‚$”å4U%B”åDòöffÆ–æU÷7–æ5öÆöw2‡W6W%ö–BÆFWf–6Uö–BÆ—FVÕ÷G—RÆ6Æ–VçE÷WV–BÇ–ÆöBÇ7FGW2Ç6÷W&6U÷F‚’dÅTU2ƒòÃòÃòÃòÃòÂw&V6V—fVBrÃò’"À¢²GU²v–BuÒóòçVÆÂÂF—E²vFWf–6Uö–BuÒóòçVÆÂÂF—E²wG—RuÒóòGF‚ÂGWV–BÂG–ÆöBÂGF…Ò“°¢G&V6V—fVB²³°¢Ð¢G&W7VÇBÒ÷†6SwE÷&ö6W75ööffÆ–æUö—FVÒ‚F—BÂGRÂGWV–B“°¢F#£§'Vâ‚%UDDRöffÆ–æU÷7–æ5öÆöw24UB7FGW3Òw&ö6W76VBrÂ&ö6W76VEöCÔäõr‚’ÂW'&÷#ÔåTÄÂÂ6W'fW%÷&W7VÇCÓòt„U$R–CÓò"Â¶§6öåöVæ6öFR‚G&W7VÇBÄ¥4ôåõTäU44TEõTä”4ôDR’ÂFÆöt–EÒ“°¢G&ö6W76VB²³²G7–æ6VEµÓÒGWV–C°¢Ò6F6‚…F‡&÷v&ÆRFR’°¢Ff–ÆVB²³²FW'&÷'5µÒÒ²v6Æ–VçE÷WV–BsÓâGWV–BÂwF‚sÓâGF‚ÂvW'&÷"sÓâFRÓævWDÖW76vR‚•Ó°¢G'’°¢–b‚FÆöt–B’F#£§'Vâ‚%UDDRöffÆ–æU÷7–æ5öÆöw24UB7FGW3Òvf–ÆVBrÂ&ö6W76VEöCÔäõr‚’ÂW'&÷#Óòt„U$R–CÓò"Â·7V'7G"‚FRÓævWDÖW76vR‚’ÃÃ’ÂFÆöt–EÒ“°¢VÇ6RF#£§'Vâ‚$”å4U%B”åDòöffÆ–æU÷7–æ5öÆöw2‡W6W%ö–BÆFWf–6Uö–BÆ—FVÕ÷G—RÆ6Æ–VçE÷WV–BÇ–ÆöBÇ7FGW2Ç6÷W&6U÷F‚ÆW'&÷"Ç&ö6W76VEöB’dÅTU2ƒòÃòÃòÃòÃòÂvf–ÆVBrÃòÃòÄäõr‚’’"Â²GU²v–BuÓóöçVÆÂÂF—E²vFWf–6Uö–BuÓóöçVÆÂÂF—E²wG—RuÓóòGF‚ÂGWV–BÂG–ÆöBÂGF‚Ç7V'7G"‚FRÓævWDÖW76vR‚’ÃÃ•Ò“°¢Ò6F6‚…F‡&÷v&ÆRFS"’·Ð¢Ð¢Ð¢&WGW&â²vö²sÓçG'VRÂw&V6V—fVBsÓâG&V6V—fVBÂw&ö6W76VBsÓâG&ö6W76VBÂvf–ÆVBsÓâFf–ÆVBÂvGWÆ–6FW2sÓâFGWÆ–6FW2Âw7–æ6VEö–G2sÓâG7–æ6VBÂvW'&÷'2sÓâFW'&÷'5Ó°§ÒÂfÇ6R“° §&÷WFR‚ttUBrÂrö’öFÖ–â÷7—7FVÒÖ†VÇF‚rÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6SUöVç7W&Uö6÷&U÷F&ÆW2‚“°¢GÒ°¢w‡÷fW'6–öârÓâ…õdU%4”ôâÀ¢w6—FU÷fW'6–öârÓâ4•DUõdU%4”ôâÀ¢v÷fW'6–öârÓâõdU%4”ôâÀ¢wF–ÖRrÓâFFR‚u’ÖÒÖBƒ¦“§2r’À¢vFVÆ—fW'•÷VWVRrÓâF#£¦ÆÂ‚%4TÄT5B7FGW2Ä4õTåB‚¢’6÷VçBe$ôÒFVÆ—fW'•÷VWVRu$õU%’7FGW2"’À¢w&V6VçEöW'&÷'2rÓâF#£¦ÆÂ‚%4TÄT5B¢e$ôÒ7—7FVÕö†VÇF…öÆöw2t„U$RÆWfVÂ”â‚vW'&÷"rÂwv&æ–ærr’õ$DU"%’–BDU42Ä”Ô•BS"’À¢Ó°¢&WGW&âG°§ÒÂfÇ6RÂDÔ”â“° ¢òòŠŠ}‹-Š­‹‹¸Í˜˜‹m‹¸ÍŠ¢›í‹˜©˜r›í‹2Š}‹"˜Š}‹"»S¢Š}¸Í˜b˜]‹=¸Í‹‹˜]ŠýŠ}˜²Š‹ŠòŠ}‹"˜]‹=¸Í‹˜-Š˜M¸Â˜]¸Î(ÍŠ-¸ÍŠòŠ­Šr‹˜Š­‹Š-Ší‹¸Í˜bŠ­‹‹¸Í˜‹ŠrŠ}‹=Š­˜Š}Šý˜rª˜mŠòŠ}ªý‹›í‹MŠ­¸ÍŠŠ}˜m¸Âª˜mŠòà§&÷WFR‚ttUBrÂrö’öFÖ–â÷&ö¦V7B×7FGW2×cRrÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6SUöVç7W&Uö6÷&U÷F&ÆW2‚“°¢&WGW&â÷†6SU÷&ö¦V7E÷7FGW2‚“°§ÒÂfÇ6RÂDÔ”â“° §&÷WFR‚ttUBrÂrö’÷&ö¦V7B×fW'6–öâ×cRrÂgVæ7F–öâ‚GÂF"ÂGR—°¢&WGW&â²w6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôâÂw†6RsÓãrÂw&VÆV6UöæÖRsÓâu†6RrãrÒ6†–gB66†VGVÆ–ærf–æÆ—¦F–öâuÓ°§ÒÂG'VR“°   ¢ò¢ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐ¢¢†6Rb(	B&öGV7F–öâ7F&–Æ—G’Âö'6W'f&–Æ—G’Â†öÆ–F’–×÷'BÀ¢¢FVÆ—fW'’&WG'’öFVBÖÆWGFW"æBÖö&–ÆRF–væ÷7F–70¢¢fW'6–öã¢6—FR“2òããP¢¢ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒ¢ð¦gVæ7F–öâ÷†6Se÷6WGF–ær‚F¶W’ÂFFVfVÇCÖçVÆÂ—°¢G'’²G"ÒF#£¦öæR‚%4TÄT5BfÇVRe$ôÒ÷6WGF–æw2t„U$R¶W–Óò"Â²F¶W•Ò“²&WGW&âG"ò§6öåöFV6öFR‚G%²wfÇVRuÒÂG'VR’¢FFVfVÇC²Ò6F6‚…F‡&÷v&ÆRFR’²&WGW&âFFVfVÇC²Ð§Ð¦gVæ7F–öâ÷†6Se÷6WB‚F¶W’ÂGfÇVR—°¢G'’²F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2÷6WGF–æw2†¶W–d$4„"ƒ“’$”Ô%’´U’ÂfÇVV¥4ôâåTÄÂÂWFFVEöBDDUD”ÔRåTÄÂDTdTÅBåTÄÂôâUDDR5U%$TåEõD”ÔU5DÕ’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“²F#£§'Vâ‚$”å4U%B”åDò÷6WGF–æw2†¶W–ÆfÇVV’dÅTU2ƒòÃò’ôâEUÄ”4DR´U’UDDRfÇVSÕdÅTU2‡fÇVR’ÇWFFVEöCÔäõr‚’"Â²F¶W’Æ§6öåöVæ6öFR‚GfÇVRÄ¥4ôåõTäU44TEõTä”4ôDR•Ò“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð§Ð¦gVæ7F–öâ÷†6SeöVç7W&U÷F&ÆW2‚—°¢–b†gVæ7F–öåöW†—7G2‚u÷†6SUöVç7W&Uö6÷&U÷F&ÆW2r’’÷†6SUöVç7W&Uö6÷&U÷F&ÆW2‚“°¢G'’²F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2†öÆ–F—2†–B”åBUDõô”ä5$TÔTåB$”Ô%’´U’Â¦FFRd$4„"ƒ’äõBåTÄÂTä•TRÂF—FÆRd$4„"ƒ“’åTÄÂÂ6÷W&6Rd$4„"ƒƒ’åTÄÂÂ7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÂ”äDU‚–G…ö†öÆ–F—5ö¦FFR†¦FFR’’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E27—7FVÕö†VÇF…ö6†V6·2†–B$”t”åBUDõô”ä5$TÔTåB$”Ô%’´U’Â6†V6µö¶W’d$4„"ƒƒ’äõBåTÄÂÂ7FGW2d$4„"ƒ#’äõBåTÄÂDTdTÅBvö²rÂÖW76vRDU…BåTÄÂÂÖWF¥4ôâåTÄÂÂ6†V6¶VEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÂ”äDU‚–G…ö†VÇF…ö6†V6µö¶W•÷F–ÖR†6†V6µö¶W’Æ6†V6¶VEöB’Â”äDU‚–G…ö†VÇF…ö6†V6µ÷7FGW2‡7FGW2Æ6†V6¶VEöB’’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2Öö&–ÆUöW'&÷%öÆöw2†–B$”t”åBUDõô”ä5$TÔTåB$”Ô%’´U’ÂW6W%ö–B$”t”åBåTÄÂÂFWf–6Uö–Bd$4„"ƒ#’åTÄÂÂ÷fW'6–öâd$4„"ƒC’åTÄÂÂ67&VVâd$4„"ƒƒ’åTÄÂÂÖW76vRDU…BåTÄÂÂ7F6²ÔTD•TÕDU…BåTÄÂÂW‡G&¥4ôâåTÄÂÂ7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÂ”äDU‚–G…öÖö&–ÆUöW'&÷%÷W6W%÷F–ÖR‡W6W%ö–BÆ7&VFVEöB’Â”äDU‚–G…öÖö&–ÆUöW'&÷%ö†÷fW'6–öâÆ7&VFVEöB’’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2FVÆ—fW'•öFVEöÆWGFW'2†–B$”t”åBUDõô”ä5$TÔTåB$”Ô%’´U’Â÷&–v–æÅ÷VWVUö–B$”t”åBåTÄÂÂ6†ææVÂd$4„"ƒ#’åTÄÂÂF&vWE÷G—Rd$4„"ƒ3’åTÄÂÂF&vWEö–B$”t”åBåTÄÂÂFõ÷fÇVRd$4„"ƒ“’åTÄÂÂF—FÆRd$4„"ƒ#SR’åTÄÂÂ&öG’DU…BåTÄÂÂ–ÆöB¥4ôâåTÄÂÂGFV×G2”åBäõBåTÄÂDTdTÅBÂÆ7EöW'&÷"DU…BåTÄÂÂf–ÆVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÂ”äDU‚–G…öFVEö6†ææVÅ÷F–ÖR†6†ææVÂÆf–ÆVEöB’Â”äDU‚–G…öFVE÷F&vWB‡F&vWE÷G—RÇF&vWEö–B’’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2•ö66†R†66†Uö¶W’d$4„"ƒ“’$”Ô%’´U’Â66†U÷fÇVRÔTD•TÕDU…BåTÄÂÂW‡—&W5öBDDUD”ÔRåTÄÂÂWFFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕôâUDDR5U%$TåEõD”ÔU5DÕÂ”äDU‚–G…ö•ö66†UöW‡†W‡—&W5öB’’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢÷†6Se÷6WB‚w6—FU÷fW'6–öârÂ4•DUõdU%4”ôâ“²÷†6Se÷6WB‚v÷fW'6–öârÂõdU%4”ôâ“²÷†6Se÷6WB‚vF%÷Ww&FU÷fW'6–öârÂw†6Sr×'CBÓããrr“°§Ð¦gVæ7F–öâ÷†6SeöÆör‚FÆWfVÂÂG6÷W&6RÂFÖW76vRÂF6öçFW‡CÕµÒ—°¢G'’²÷†6SeöVç7W&U÷F&ÆW2‚“²F#£§'Vâ‚$”å4U%B”åDò7—7FVÕö†VÇF…öÆöw2†ÆWfVÂÇ6÷W&6RÆÖW76vRÆ6öçFW‡B’dÅTU2ƒòÃòÃòÃò’"Â²FÆWfVÂÂG6÷W&6RÂFÖW76vRÆ§6öåöVæ6öFR‚F6öçFW‡BÄ¥4ôåõTäU44TEõTä”4ôDR•Ò“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð§Ð¦gVæ7F–öâ÷†6Se÷FõöÖ–çWFW2‚F††ÖÒ—°¢–b‚F††ÖÒÇÂ&VuöÖF6‚‚rõâ…ÆG³Ã'Ò“¢…ÆG³'Ò’òrÂ‡7G&–ær’F††ÖÒÂFÒ’’&WGW&âçVÆÃ°¢&WGW&âÖ‚ƒÆÖ–âƒC3’Â‚†–çB’FÕ³Ò’£c²†–çB’FÕ³%Ò’“°§Ð¦gVæ7F–öâ÷†6Seö÷fW&ÆöÖ–çWFW2‚G7F'BÂFVæBÂGv–å7F'BÂGv–äVæB—°¢–b‚FVæBÃÒG7F'B’FVæB³ÒCC°¢G&ævW2ÒGv–äVæBâGv–å7F'Bòµ²Gv–å7F'BÂGv–äVæEÕÒ¢µ²Gv–å7F'BÃCCÒÅ³ÂGv–äVæEÕÓ°¢GF÷FÃÓ°¢f÷&V6‚‚G&ævW22G"’°¢f÷&V6‚…µ³ÃÒÅ³CCÃCCÕÒ2G6†–gB’°¢FÒG%³Ò²G6†–gE³Ó²F#ÒG%³Ò²G6†–gE³Ó°¢GF÷FÂ³ÒÖ‚ƒÂÖ–â‚FVæBÂF"’ÖÖ‚‚G7F'BÂF’“°¢Ð¢Ð¢&WGW&âGF÷FÃ°§Ð¦gVæ7F–öâ÷†6Se÷&öÆUö¶W•ög&öÕ÷W6W"‚GR—°¢G"ÒG&–Ò‚‡7G&–ær’‚GU²w&öÆU÷F—FÆRuÒóòGU²w&öÆRuÒóòrr’“°¢–b†Ö%÷7G'÷2‚G"Â}˜m¸Í‹˜¸ÂŠ}ŠýŠ}‹¸Âr’ÓÖfÇ6R’&WGW&âvöff–6Rs°¢–b†Ö%÷7G'÷2‚G"Â}‹=‹ŠŠ}‹-‹‹2Š}‹‹MŠòr’ÓÖfÇ6R’&WGW&âv6†–Veö–ç7V7F÷"s°¢–b†Ö%÷7G'÷2‚G"Â}‹=‹ŠŠ}‹-‹‹2r’ÓÖfÇ6R’&WGW&âw6Væ–÷%ö–ç7V7F÷"s°¢–b†Ö%÷7G'÷2‚G"Â}ŠŠ}‹-‹‹2r’ÓÖfÇ6R’&WGW&âv–ç7V7F÷"s°¢–b†Ö%÷7G'÷2‚G"Â}‹Šm¸Í‹2Ší‹rr’ÓÖfÇ6RÇÂÖ%÷7G'÷2‚G"Â}˜mŠ}‹‹Ší‹rr’ÓÖfÇ6R’&WGW&âvÆ–æUö6†–Vbs°¢–b†Ö%÷7G'÷2‚G"Â}Š}›í‹Š}Š­˜‹r’ÓÖfÇ6R’&WGW&âv÷W&F÷"s°¢&WGW&âvFVfVÇBs°§Ð¦gVæ7F–öâ÷†6Se÷v÷&µö6Æ2‚G&öÆT¶W’ÂF6†V6¶–âÂF6†V6¶÷WBÂF¦FFSÖçVÆÂ—°¢÷†6SeöVç7W&U÷F&ÆW2‚“°¢G'VÆRÒgVæ7F–öåöW†—7G2‚u÷†6SU÷'VÆUöf÷%÷&öÆRr’ò÷†6SU÷'VÆUöf÷%÷&öÆR‚G&öÆT¶W’’¢çVÆÃ°¢–b‚G'VÆR’G'VÆRÒ²vGWG•öÖ–çWFW2sÓãCS2Âv÷fW'F–ÖUöÆ–Ö—EöÖ–çWFW2sÓã#rÂw7W'ÇW5ögFW%öÖ–çWFW2sÓãCƒÂvæ–v‡E÷7F'BsÓâs##££rÂvæ–v‡EöVæBsÓâsc££uÓ°¢F6“Õ÷†6Se÷FõöÖ–çWFW2‚F6†V6¶–â“²F6óÕ÷†6Se÷FõöÖ–çWFW2‚F6†V6¶÷WB“°¢–b‚F6“ÓÓÖçVÆÂÇÂF6óÓÓÖçVÆÂ’&WGW&â²vö²sÓæfÇ6RÂvW'&÷"sÓâwF–ÖUö–çfÆ–BuÓ°¢G&W6Væ6RÒF6òãÒF6’òF6òÒF6’¢ƒCCÒF6’’²F6ó°¢FGWG’ÒÖ–â‚G&W6Væ6RÂ†–çB’G'VÆU²vGWG•öÖ–çWFW2uÒ“°¢F÷DÆ–Ö—CÒ†–çB’G'VÆU²v÷fW'F–ÖUöÆ–Ö—EöÖ–çWFW2uÓ°¢F÷fW'F–ÖRÒÖ–â†Ö‚ƒÂG&W6Væ6RÒFGWG’’ÂF÷DÆ–Ö—B“°¢G7W'ÇW2ÒÖ‚ƒÂG&W6Væ6RÒFGWG’ÒF÷fW'F–ÖR“°¢Fç3Õ÷†6Se÷FõöÖ–çWFW2‡7V'7G"‚‡7G&–ær’‚G'VÆU²væ–v‡E÷7F'BuÓóòs##£r’ÃÃR’“°¢FæSÕ÷†6Se÷FõöÖ–çWFW2‡7V'7G"‚‡7G&–ær’‚G'VÆU²væ–v‡EöVæBuÓóòsc£r’ÃÃR’“°¢Fæ–v‡CÕ÷†6Seö÷fW&ÆöÖ–çWFW2‚F6’ÂF6òÂFç3óó3#ÂFæSóó3c“°¢F—4†öÆ–F“ÖfÇ6S²–b‚F¦FFR’²G'’²F6ÃÕ6†–gD6Æ3£¦6ÆVæF$F’‚F¦FFR“²F—4†öÆ–F“ÒV×G’‚F6Å²v—5ööff–6–Åö†öÆ–F’uÒ—ÇÂV×G’‚F6Å²v—5öÖçVÅö†öÆ–F’uÒ“²Ò6F6‚…F‡&÷v&ÆRFR’·ÒÐ¢F—4g&–F“ÖfÇ6S²G'’²–b‚F¦FFRbb6Æ75öW†—7G2‚u6†–gD6Æ2r’’F—4g&–F’Ò6†–gD6Æ3£¦—4g&–F’‚F¦FFR“²Ò6F6‚…F‡&÷v&ÆRFR’²F—4g&–F“ÖfÇ6S²Ð¢&WGW&â²vö²sÓçG'VRÂw&öÆUö¶W’sÓâG&öÆT¶W’Âw&W6Væ6UöÖ–çWFW2sÓâG&W6Væ6RÂvGWG•öÖ–çWFW2sÓâFGWG’Âv÷fW'F–ÖUöÖ–çWFW2sÓâF÷fW'F–ÖRÂw7W'ÇW5öÖ–çWFW2sÓâG7W'ÇW2Âvæ–v‡EöÖ–çWFW2sÓâFæ–v‡BÂv†öÆ–F•öÖ–çWFW2sÓâF—4†öÆ–F“òG&W6Væ6S£Âvg&–F•öÖ–çWFW2sÓâF—4g&–F“òG&W6Væ6S£Âw'VÆRsÓâG'VÆUÓ°§Ð¦gVæ7F–öâ÷†6SeöFVÆ—fW'•÷7vVW‚FÆ–Ö—CÓS—°¢÷†6SeöVç7W&U÷F&ÆW2‚“°¢FÆ–Ö—CÖÖ‚ƒÆÖ–âƒ#Â†–çB’FÆ–Ö—B’“°¢FÖ÷fVCÓ°¢G'’°¢G&÷w3ÔF#£¦ÆÂ‚%4TÄT5B¢e$ôÒFVÆ—fW'•÷VWVRt„U$R7FGW3Òvf–ÆVBräBGFV×G3ãÖÖ…öGFV×G2õ$DU"%’–B42Ä”Ô•BFÆ–Ö—B"“°¢f÷&V6‚‚G&÷w22G"’°¢F#£§'Vâ‚$”å4U%B”åDòFVÆ—fW'•öFVEöÆWGFW'2†÷&–v–æÅ÷VWVUö–BÆ6†ææVÂÇF&vWE÷G—RÇF&vWEö–BÇFõ÷fÇVRÇF—FÆRÆ&öG’Ç–ÆöBÆGFV×G2ÆÆ7EöW'&÷"’dÅTU2ƒòÃòÃòÃòÃòÃòÃòÃòÃòÃò’"Â²G%²v–BuÒÂG%²v6†ææVÂuÒÂG%²wF&vWE÷G—RuÒÂG%²wF&vWEö–BuÒÂG%²wFõ÷fÇVRuÒÂG%²wF—FÆRuÒÂG%²v&öG’uÒÂG%²w–ÆöBuÒÂG%²vGFV×G2uÒÂG%²vÆ7EöW'&÷"uÕÒ“°¢F#£§'Vâ‚%UDDRFVÆ—fW'•÷VWVR4UB7FGW3Òv6æ6VÆÆVBrÇWFFVEöCÔäõr‚’t„U$R–CÓò"Â²G%²v–BuÕÒ“°¢FÖ÷fVB²³°¢Ð¢Ò6F6‚…F‡&÷v&ÆRFR’²÷†6SeöÆör‚wv&æ–ærrÂvFVÆ—fW'’×7vVWrÂFRÓævWDÖW76vR‚’“²Ð¢&WGW&âFÖ÷fVC°§Ð¦gVæ7F–öâ÷†6Se÷&ö¦V7E÷7FGW2‚—°¢F&6RÒgVæ7F–öåöW†—7G2‚u÷†6SU÷&ö¦V7E÷7FGW2r’ò÷†6SU÷&ö¦V7E÷7FGW2‚’¢²v6ö×ÆWFVBsÓåµÒÂw&VÖ–æ–ærsÓåµÒÂwfW'6–öâsÓåµÕÓ°¢F&6U²wfW'6–öâuÒÒ²w6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôâÂw†6RsÓãrÂw&VÆV6UöæÖRsÓâu†6RrãrÒ6†–gB66†VGVÆ–ærf–æÆ—¦F–öâuÓ°¢F&6U²v6ö×ÆWFVBuÕµÒÒ²v¶W’sÓâv†öÆ–F•öFÖ–åö–×÷'BrÂwF—FÆRsÓâ}˜]Šý¸Í‹¸ÍŠ¢˜‚Š}¸Í˜]›í˜‹Š¢Š­‹‹}¸Í˜MŠ}Š¢‹‹=˜]¸ÂŠý‹Ww&FRç‡˜‚’˜]Šý¸Í‹¸ÍŠ­¸ÂrÂw7FGW2sÓâvFöæRuÓ°¢F&6U²v6ö×ÆWFVBuÕµÒÒ²v¶W’sÓâvFVÆ—fW'•öFVEöÆWGFW"rÂwF—FÆRsÓâtFVBÖÆWGFW"Š‹Š}¸Â›í¸ÍŠ}˜^(Í˜}Š}¸Â˜mŠ}˜]˜˜˜"˜‚›íŠ}ª‹=Š}‹-¸Â‹]˜Š}‹‹=Š}˜BrÂw7FGW2sÓâvFöæRuÓ°¢F&6U²v6ö×ÆWFVBuÕµÒÒ²v¶W’sÓâvÖö&–ÆUöF–væ÷7F–72rÂwF—FÆRsÓâ}Š½ŠŠ¢Ší‹}Š}˜}Š}¸ÂŠ}›â˜]˜ŠŠ}¸Í˜B˜‚ªý‹-Š}‹‹BŠ­‹MŠí¸Í‹]¸ÂŠý‹=Š­ªýŠ}˜rrÂw7FGW2sÓâvFöæRuÓ°¢F&6U²v6ö×ÆWFVBuÕµÒÒ²v¶W’sÓâwv÷&µ÷'VÆUö6Æ7VÆF÷%ö’rÂwF—FÆRsÓât’˜]ŠÝŠ}‹=Š˜rŠ-‹-˜]Š}¸Í‹M¸Â˜-˜Š}˜m¸Í˜bªŠ}‹ª‹ŠòŠ‹Š}¸Â˜}‹‹=˜]Š¢rÂw7FGW2sÓâvFöæRuÓ°¢F&6U²v6ö×ÆWFVBuÕµÒÒ²v¶W’sÓâv†VÇF…ö6†V6·5÷c"rÂwF—FÆRsÓâ}¨mª’‹=˜MŠ}˜]Š¢˜m‹=Ší˜r»"Š‹Š}¸ÂŠý¸ÍŠ­Š}Š¸Í‹=ˆÂ‹]˜›í¸ÍŠ}˜R˜‚Ší‹}Š}˜}Š}¸ÂŠ}Ší¸Í‹rÂw7FGW2sÓâvFöæRuÓ°¢F&6U²v6ö×ÆWFVBuÕµÒÒ²v¶W’sÓâvGFVæFæ6Uö÷fW&æ–v‡E÷7Æ—E÷c"rÂwF—FÆRsÓâ}Š­˜-‹=¸Í˜RŠý˜-¸Í˜"Š­‹ŠýŠý˜}Š}¸Â‹Š˜‹¸ÂŠ}‹"˜m¸Í˜]˜~(Í‹MŠ‚Šý‹ªý‹-Š}‹‹B‹˜‹-Š}˜m˜r˜‚˜]Š}˜}Š}˜m˜rrÂw7FGW2sÓâvFöæRuÓ°¢F&6U²v6ö×ÆWFVBuÕµÒÒ²v¶W’sÓâw7W'ÇW5öÖævVÖVçE÷æVÂrÂwF—FÆRsÓâ}‹Š}Š‹r˜]Šý¸Í‹¸ÍŠ­¸ÂŠ­ŠŠý¸Í˜B˜]Š}‹-Š}ŠòŠÝ‹m˜‹Š˜rŠ}‹mŠ}˜˜~(ÍªŠ}‹˜‚˜M‹­˜‚Š­ŠŠý¸Í˜BrÂw7FGW2sÓâvFöæRuÓ°¢F&6U²v6ö×ÆWFVBuÕµÒÒ²v¶W’sÓâvg&–F•ö†öÆ–F•ö6Æ5öf—‚rÂwF—FÆRsÓâ}Š}‹]˜MŠ}ŠÒ˜]ŠÝŠ}‹=Š˜rŠÍ˜]‹˜~(ÍªŠ}‹¸Â˜‚Š­‹‹}¸Í˜N(ÍªŠ}‹¸ÂŠý‹’˜]ŠÝŠ}‹=Š˜r˜-˜Š}˜m¸Í˜brÂw7FGW2sÓâvFöæRuÓ°¢F&6U²w&VÖ–æ–æruÒÒ°¢²v¶W’sÓâvæF—fUöf–VÆE÷FW7BrÂwF—FÆRsÓâ}Š­‹=Š¢˜]¸ÍŠýŠ}˜m¸Â˜m‹=Ší˜r²‹˜¸Â¨m˜mŠòªý˜‹M¸Â˜Š}˜-‹¸ÂŠ‹Š}¸Âu=ˆÂŠ-˜MŠ}‹˜R˜‚W6‚rÂw&–÷&—G’sÓâv†–v‚uÒÀ¢²v¶W’sÓâwæVÅ÷&VÅö'V–ÆBrÂwF—FÆRsÓât'V–ÆB˜Š}˜-‹¸Â›í˜m˜BŠŠrŠ}Š‹-Š}‹æöFRõf—FRŠý‹˜]ŠÝ¸Í‹rŠ­˜‹=‹˜r‹=Š}‹-˜]Š}˜b˜‚ŠÝ‹˜ªŠ}˜]˜B&&VÂ˜]‹˜‹ªý‹rÂw&–÷&—G’sÓâv†–v‚uÒÀ¢²v¶W’sÓâvÆöE÷FW7BrÂwF—FÆRsÓâ}Š­‹=Š¢ŠŠ}‹ªý‹Š}‹¸Â˜}˜]‹-˜]Š}˜bªŠ}‹Š‹Š}˜b˜‚‹Š}˜m˜mŠýªýŠ}˜bŠý‹‹=‹˜‹˜m˜}Š}¸Í¸ÂrÂw&–÷&—G’sÓâvÖVF—VÒuÒÀ¢Ó°¢&WGW&âF&6S°§Ð §&÷WFR‚ttUBrÂrö’öFÖ–â÷†6Sb÷7FGW2rÂgVæ7F–öâ‚GÂF"ÂGR—²÷†6SeöVç7W&U÷F&ÆW2‚“²&WGW&â÷†6Se÷&ö¦V7E÷7FGW2‚“²ÒÂfÇ6RÂDÔ”â“°§&÷WFR‚ttUBrÂrö’÷&ö¦V7B×fW'6–öâ×cbrÂgVæ7F–öâ‚GÂF"ÂGR—²&WGW&â²w6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôâÂw†6RsÓãrÂw&VÆV6UöæÖRsÓâu†6RrãrÒ6†–gB66†VGVÆ–ærf–æÆ—¦F–öâuÓ²ÒÂG'VR“°§&÷WFR‚ttUBrÂrö’÷&ö¦V7B×fW'6–öâ×crrÂgVæ7F–öâ‚GÂF"ÂGR—²&WGW&â²w6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôâÂw†6RsÓãrÂw'BsÓã"Âw&VÆV6UöæÖRsÓâu†6RrãrÒ6†–gB66†VGVÆ–ærf–æÆ—¦F–öâuÓ²ÒÂG'VR“°  §&÷WFR‚uõ5BrÂrö’öFÖ–âö†öÆ–F—2ö–×÷'BrÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6SeöVç7W&U÷F&ÆW2‚“°¢F—FV×2ÒF%²v—FV×2uÒóòµÓ°¢–b†—5÷7G&–ær‚F—FV×2’’°¢G&÷w3ÕµÓ²f÷&V6‚‡&Vu÷7Æ—B‚rõÇ#õÆâòrÂF—FV×2’2FÆ–æR’²FÆ–æS×G&–Ò‚FÆ–æR“²–b‚FÆ–æR’6öçF–çVS²G'G3×&Vu÷7Æ—B‚rõ²ÃµÇEÒòrÂFÆ–æRÂ"“²G&÷w5µÓÕ²v¦FFRsÓçG&–Ò‚G'G5³Óóòrr’ÂwF—FÆRsÓçG&–Ò‚G'G5³Óóò}Š­‹‹}¸Í˜B‹‹=˜]¸Âr•Ó²ÒF—FV×3ÒG&÷w3°¢Ð¢–b‚—5ö'&’‚F—FV×2’’‡GG£¦W'&÷"‚}˜‹˜]Š¢Š­‹‹}¸Í˜MŠ}Š¢˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÃC“°¢Fö³Ó²F&CÓ°¢f÷&V6‚‚F—FV×22F—B’°¢F¦BÒ7G%÷&WÆ6R…²rÒrÂrâuÒÂròrÂG&–Ò‚‡7G&–ær’‚F—E²v¦FFRuÒóòF—E²vFFRuÒóòrr’’“°¢–b‚&VuöÖF6‚‚rõã³3EÕÆG³'ÕÂõÆG³Ã'ÕÂõÆG³Ã'ÒBòrÂF¦B’’²F&B²³²6öçF–çVS²Ð¢²G’ÂFÒÂFEÓÖ'&•öÖ‚v–çGfÂrÂW‡ÆöFR‚ròrÂF¦B’“²F¦C×7&–çFb‚rSFBòS&BòS&BrÂG’ÂFÒÂFB“°¢F#£§'Vâ‚$”å4U%B”åDò†öÆ–F—2†¦FFRÇF—FÆRÇ6÷W&6R’dÅTU2ƒòÃòÃò’ôâEUÄ”4DR´U’UDDRF—FÆSÕdÅTU2‡F—FÆR’Ç6÷W&6SÕdÅTU2‡6÷W&6R’"Â²F¦BÂ‡7G&–ær’‚F—E²wF—FÆRuÒóò}Š­‹‹}¸Í˜B‹‹=˜]¸Âr’ÂvFÖ–âÖ–×÷'BuÒ“²Fö²²³°¢Ð¢÷†6SeöÆör‚v–æfòrÂv†öÆ–F—2rÂv†öÆ–F—2–×÷'FVBrÅ²vö²sÓâFö²Âv&BsÓâF&BÂv'’sÓâGU²v–BuÓóöçVÆÅÒ“°¢&WGW&â²vö²sÓçG'VRÂv–×÷'FVBsÓâFö²Âv–çfÆ–BsÓâF&EÓ°§ÒÂfÇ6RÂDÔ”â“° §&÷WFR‚uõ5BrÂrö’öFÖ–â÷'VÆRÖVæv–æRö6Æ7VÆFRrÂgVæ7F–öâ‚GÂF"ÂGR—°¢G&öÆRÒ&Vu÷&WÆ6R‚rõµæ×¤Õ£Ó•õÂÕÒòrÂrrÂ‡7G&–ær’‚F%²w&öÆUö¶W’uÒóòvFVfVÇBr’“°¢&WGW&â÷†6Se÷v÷&µö6Æ2‚G&öÆRÂ‡7G&–ær’‚F%²v6†V6¶–âuÒóòrr’Â‡7G&–ær’‚F%²v6†V6¶÷WBuÒóòrr’ÂF%²v¦FFRuÒóòçVÆÂ“°§ÒÂfÇ6RÂDÔ”â“° §&÷WFR‚uõ5BrÂrö’öÖö&–ÆRöW'&÷"ÖÆörrÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6SeöVç7W&U÷F&ÆW2‚“°¢F#£§'Vâ‚$”å4U%B”åDòÖö&–ÆUöW'&÷%öÆöw2‡W6W%ö–BÆFWf–6Uö–BÆ÷fW'6–öâÇ67&VVâÆÖW76vRÇ7F6²ÆW‡G&’dÅTU2ƒòÃòÃòÃòÃòÃòÃò’"Â²GU²v–BuÓóöçVÆÂÂGU²vFWf–6Uö–BuÓóò‚F%²vFWf–6Uö–BuÓóöçVÆÂ’Ç7V'7G"‚‡7G&–ær’‚F%²v÷fW'6–öâuÓóôõdU%4”ôâ’ÃÃC’Ç7V'7G"‚‡7G&–ær’‚F%²w67&VVâuÓóòrr’ÃÃƒ’Ç7V'7G"‚‡7G&–ær’‚F%²vÖW76vRuÓóòrr’ÃÃS’Ç7V'7G"‚‡7G&–ær’‚F%²w7F6²uÓóòrr’ÃÃS’Æ§6öåöVæ6öFR‚F%²vW‡G&uÓóõµÒÄ¥4ôåõTäU44TEõTä”4ôDR•Ò“°¢&WGW&â²vö²sÓçG'VUÓ°§ÒÂfÇ6R“° §&÷WFR‚uõ5BrÂrö’ö7&öâöFVÆ—fW'’×VWVR÷&ö6W72rÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6SeöVç7W&U÷F&ÆW2‚“°¢F¶W’ÒG²v¶W’uÒóòF%²v¶W’uÒóòrs°¢FW‡V7FVBÒ÷†6Se÷6WGF–ær‚v7&öåö¶W’rÂvWFVçb‚t5$ôåô´U’r’ó¢rr“°¢–b‚FW‡V7FVBbb†6…öWVÇ2‚‡7G&–ær’FW‡V7FVBÂ‡7G&–ær’F¶W’’’‡GG£¦W'&÷"‚}ª˜M¸ÍŠòª‹˜˜b˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÃC2“°¢G&ö6W76VBÒ6Æ75öW†—7G2‚tFVÆ—fW'•VWVRr’òFVÆ—fW'•VWVS£§&ö6W72‚†–çB’‚F%²vÆ–Ö—BuÒóòS’’¢²vö²sÓæfÇ6RÂvW'&÷"sÓâtFVÆ—fW'•VWVRÖ—76–æruÓ°¢FFVBÒ÷†6SeöFVÆ—fW'•÷7vVWƒ“°¢&WGW&â²vö²sÓçG'VRÂw&ö6W76VBsÓâG&ö6W76VBÂvFVEöÆWGFW'5öÖ÷fVBsÓâFFVEÓ°§ÒÂG'VR“° §&÷WFR‚ttUBrÂrö’öFÖ–âöFVÆ—fW'’ÖFVBÖÆWGFW'2rÂgVæ7F–öâ‚GÂF"ÂGR—²÷†6SeöVç7W&U÷F&ÆW2‚“²&WGW&âF#£¦ÆÂ‚%4TÄT5B¢e$ôÒFVÆ—fW'•öFVEöÆWGFW'2õ$DU"%’–BDU42Ä”Ô•B3"“²ÒÂfÇ6RÂDÔ”â“° §&÷WFR‚ttUBrÂrö’öFÖ–â÷7—7FVÒÖ†VÇF‚×c"rÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6SeöVç7W&U÷F&ÆW2‚“°¢F†VÇF‚Ò²w7FGW2sÓâvö²rÂwF–ÖRsÓæFFR‚u’ÖÒÖBƒ¦“§2r’Âw6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôåÓ°¢G'’²F#£¦öæR‚u4TÄT5Br“²F†VÇF…²vFF&6RuÓÒvö²s²Ò6F6‚…F‡&÷v&ÆRFR’²F†VÇF…²w7FGW2uÓÒvW'&÷"s²F†VÇF…²vFF&6RuÓÒvf–Âs²Ð¢F†VÇF…²vFVÆ—fW'•÷VWVRuÒÒF#£¦ÆÂ‚%4TÄT5B7FGW2Ä4õTåB‚¢’6÷VçBe$ôÒFVÆ—fW'•÷VWVRu$õU%’7FGW2"“°¢F†VÇF…²vFVEöÆWGFW'5ö6÷VçBuÒÒ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒFVÆ—fW'•öFVEöÆWGFW'2"•²vâuÒóò“°¢F†VÇF…²vÖö&–ÆUöW'&÷'5ó#F‚uÒÒ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒÖö&–ÆUöW'&÷%öÆöw2t„U$R7&VFVEöCäDDUõ5T"„äõr‚’Â”åDU%dÂD’’"•²vâuÒóò“°¢F†VÇF…²w&V6VçEöW'&÷'2uÒÒF#£¦ÆÂ‚%4TÄT5B¢e$ôÒ7—7FVÕö†VÇF…öÆöw2t„U$RÆWfVÂ”â‚vW'&÷"rÂwv&æ–ærr’õ$DU"%’–BDU42Ä”Ô•B3"“°¢&WGW&âF†VÇFƒ°§ÒÂfÇ6RÂDÔ”â“° §&÷WFR‚uõ5BrÂrö’öFÖ–âö66†Rö6ÆV"rÂgVæ7F–öâ‚GÂF"ÂGR—²÷†6SeöVç7W&U÷F&ÆW2‚“²G'’²F#£§'Vâ‚$DTÄUDRe$ôÒ•ö66†R"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ò÷†6SeöÆör‚v–æfòrÂv66†RrÂv’66†R6ÆV&VBrÅ²v'’sÓâGU²v–BuÓóöçVÆÅÒ“²&WGW&â²vö²sÓçG'VUÓ²ÒÂfÇ6RÂDÔ”â“°  ¢ò¢ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐ¢¢†6Rrã2(	BWFò6†–gB'VÆW2T’Â6†V6¶–â&V¦V7F–öâF–væ÷7F–70¢¢fW'6–öã¢6—FR“Ròããp¢¢ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒ¢ð¦gVæ7F–öâ÷†6Sw5öVç7W&R‚—°¢–b†gVæ7F–öåöW†—7G2‚u÷†6SUöVç7W&Uö6÷&U÷F&ÆW2r’’÷†6SUöVç7W&Uö6÷&U÷F&ÆW2‚“°¢G'’²F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2GFVæFæ6U÷&V¦V7EöÆöw2†–B$”t”åBUDõô”ä5$TÔTåB$”Ô%’´U’ÂW6W%ö–B$”t”åBäõBåTÄÂÂÆ–æUö–B$”t”åBåTÄÂÂÖWF†öBd$4„"ƒ3’åTÄÂÂÆBDT4”ÔÂƒÃr’åTÄÂÂÆærDT4”ÔÂƒÃr’åTÄÂÂ67W&7•öÒDT4”ÔÂƒÃ"’åTÄÂÂ&V6öâDU…BåTÄÂÂÖWF¥4ôâåTÄÂÂ7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÂ”äDU‚–G…ö&Å÷W6W%÷F–ÖR‡W6W%ö–BÆ7&VFVEöB’Â”äDU‚–G…ö&ÅöÆ–æU÷F–ÖR†Æ–æUö–BÆ7&VFVEöB’Â”äDU‚–G…ö&Åö7&VFVB†7&VFVEöB’’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð§Ð§&÷WFR‚ttUBrÂrö’öFÖ–âöGFVæFæ6R×&V¦V7BÖÆöw2rÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6Sw5öVç7W&R‚“°¢Fg&öÒÒG&–Ò‚‡7G&–ær’‚G²vg&öÒuÒóòrr’“°¢GFòÒG&–Ò‚‡7G&–ær’‚G²wFòuÒóòrr’“°¢GW6W$–BÒ†–çB’‚G²wW6W%ö–BuÒóò“°¢Gv†W&RÒsÓs²F&w3ÕµÓ°¢–b‚Fg&öÒÓÒrr’²Gv†W&RãÒräB"æ7&VFVEöBãÒòs²F&w5µÒÒFg&öÒâr££s²Ð¢–b‚GFòÓÒrr’²Gv†W&RãÒräB"æ7&VFVEöBÃÒòs²F&w5µÒÒGFòâr#3£S“£S’s²Ð¢–b‚GW6W$–Bâ’²Gv†W&RãÒräB"çW6W%ö–CÓòs²F&w5µÒÒGW6W$–C²Ð¢&WGW&âF#£¦ÆÂ‚%4TÄT5B"â¢Â4ôä4B‡Ræf—'7EöæÖRÂrrÇRæÆ7EöæÖR’W6W%öæÖRÂÂæ6öFRÆ–æUö6öFRÂ4ôä4B†Âæ÷&–v–âÂrÒrÆÂæFW7F–æF–öâ’Æ–æU÷F—FÆP¢e$ôÒGFVæFæ6U÷&V¦V7EöÆöw2 ¢ÄTeB¤ô”âW6W'2RôâRæ–CÖ"çW6W%ö–@¢ÄTeB¤ô”âÆ–æW6ÂôâÂæ–CÖ"æÆ–æUö–@¢t„U$RGv†W&Rõ$DU"%’"æ–BDU42Ä”Ô•BS"ÂF&w2“°§ÒÂfÇ6RÂDÔ”â“°§&÷WFR‚ttUBrÂrö’öFÖ–â÷†6Sr×'C2÷7FGW2rÂgVæ7F–öâ‚GÂF"ÂGR—°¢&WGW&â²w6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôâÂw†6RsÓãrÂw'BsÓã2Âv6ö×ÆWFVBsÓå°¢vWFõ÷6†–gE÷'VÆW5öFÖ–ârÂvGFVæFæ6U÷&V¦V7EöÆöw2rÂvWFõ÷6†–gEö6†V6¶–å÷v–æF÷rrÂwfW'6–öåóóóbrÂwWw&FU÷‡ö6öç6öÆ–FFVBp¢ÒÂw&VÖ–æ–ærsÓå°¢w&öGV7F–öåö'VæFÆU÷v—F†÷WEö'&÷w6W%ö&&VÂrÂvgVÆÅöFWf–6Uöf–VÆE÷FW7BrÂvWFöÖFVEö•÷FW7E÷7V—FRrÂvW‡FW&æÅööff–6–Åö†öÆ–F•÷&÷f–FW%÷v†Våöf–Æ&ÆRp¢ÕÓ°§ÒÂfÇ6RÂDÔ”â“°§&÷WFR‚ttUBrÂrö’÷&ö¦V7B×fW'6–öâ×cw2rÂgVæ7F–öâ‚GÂF"ÂGR—²&WGW&â²w6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôâÂw†6RsÓãrÂw'BsÓã2Âw&VÆV6UöæÖRsÓâu†6RrãrÒ6†–gB66†VGVÆ–ærf–æÆ—¦F–öâuÓ²ÒÂG'VR“°  ¢ò¢ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐ¢¢†6RrãB(	BöffÆ–æR7–æ2&ö6W76–æræBGFVæFæ6R&VÆ–&–Æ—G¢¢fW'6–öã¢6—FR“Ròããp¢¢ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒ¢ð¦gVæ7F–öâ÷†6SwEöVç7W&R‚—°¢–b†gVæ7F–öåöW†—7G2‚u÷†6SeöVç7W&U÷F&ÆW2r’’÷†6SeöVç7W&U÷F&ÆW2‚“°¢G'’²F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2öffÆ–æU÷7–æ5öÆöw2€¢–B$”t”åBUDõô”ä5$TÔTåB$”Ô%’´U’À¢W6W%ö–B$”t”åBåTÄÂÀ¢FWf–6Uö–Bd$4„"ƒ#’åTÄÂÀ¢—FVÕ÷G—Rd$4„"ƒƒ’åTÄÂÀ¢6Æ–VçE÷WV–Bd$4„"ƒ#’äõBåTÄÂÀ¢6÷W&6U÷F‚d$4„"ƒ“’åTÄÂÀ¢–ÆöB¥4ôâåTÄÂÀ¢7FGW2d$4„"ƒ3’äõBåTÄÂDTdTÅBw&V6V—fVBrÀ¢W'&÷"DU…BåTÄÂÀ¢6W'fW%÷&W7VÇB¥4ôâåTÄÂÀ¢&ö6W76VEöBDDUD”ÔRåTÄÂÀ¢7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÀ¢Tä•TR´U’WööffÆ–æUö—FVÒ‡W6W%ö–BÂ6Æ–VçE÷WV–B’À¢”äDU‚–G…ööffÆ–æU÷W6W%÷F–ÖR‡W6W%ö–BÆ7&VFVEöB’À¢”äDU‚–G…ööffÆ–æU÷7FGW5÷F–ÖR‡7FGW2Æ7&VFVEöB’À¢”äDU‚–G…ööffÆ–æU÷F…÷F–ÖR‡6÷W&6U÷F‚Æ7&VFVEöB¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢f÷&V6‚…°¢²vöffÆ–æU÷7–æ5öÆöw2rÂw6÷W&6U÷F‚rÂ%d$4„"ƒ“’åTÄÂ%ÒÅ²vöffÆ–æU÷7–æ5öÆöw2rÂvW'&÷"rÂ%DU…BåTÄÂ%ÒÅ²vöffÆ–æU÷7–æ5öÆöw2rÂw6W'fW%÷&W7VÇBrÂ$¥4ôâåTÄÂ%ÒÅ²vöffÆ–æU÷7–æ5öÆöw2rÂw&ö6W76VEöBrÂ$DDUD”ÔRåTÄÂ%ÒÀ¢²w7FfeöGFVæFæ6RrÂv6Æ–VçE÷WV–BrÂ%d$4„"ƒ#’åTÄÂ%ÒÅ²w7FfeöGFVæFæ6RrÂvöffÆ–æU÷7–æ6VBrÂ%D”å””åBƒ’äõBåTÄÂDTdTÅB%ÒÅ²w7FfeöGFVæFæ6RrÂv6Æ–VçEö6†V6µö–ârÂ$DDUD”ÔRåTÄÂ%ÒÅ²w7FfeöGFVæFæ6RrÂv6Æ–VçEö6†V6µö÷WBrÂ$DDUD”ÔRåTÄÂ%Ð¢Ò2F2’²G'’²–b„F#£¦öæR‚%4„õrD$ÄU2Ä”´Rò"Â²F5³ÕÒ’bbF#£¦öæR‚%4„õr4ôÅTÔå2e$ôÒ²F5³×Òt„U$Rf–VÆCÓò"Â²F5³ÕÒ’’F#£§'Vâ‚$ÅDU"D$ÄR²F5³×ÒDB4ôÅTÔâ²F5³×Ò²F5³%×Ò"“²Ò6F6‚…F‡&÷v&ÆRFR’·ÒÐ¢G'’²F#£§'Vâ‚$5$TDR”äDU‚–G…÷7FfeöGEö6Æ–VçE÷WV–Bôâ7FfeöGFVæFæ6R†6Æ–VçE÷WV–B’"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²F#£§'Vâ‚$5$TDR”äDU‚–G…÷7FfeöGEööffÆ–æRôâ7FfeöGFVæFæ6R†öffÆ–æU÷7–æ6VBÆ6†V6µö–â’"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢÷†6Se÷6WB‚w6—FU÷fW'6–öârÂ4•DUõdU%4”ôâ“²÷†6Se÷6WB‚v÷fW'6–öârÂõdU%4”ôâ“²÷†6Se÷6WB‚vF%÷Ww&FU÷fW'6–öârÂw†6Sr×'CBÓããrr“°§Ð¦gVæ7F–öâ÷†6SwEö6Æ–VçE÷F–ÖR‚Gb—°¢–b‚GbÓÓÒçVÆÂÇÂGbÓÓÒrr’&WGW&âFFR‚u’ÖÒÖBƒ¦“§2r“°¢–b†—5öçVÖW&–2‚Gb’’²FãÒ†fÆöB’Gc²–b‚Fââ#’FâÒFâó²GG3Ò†–çB’Fã²Ð¢VÇ6R²GG2Ò7G'F÷F–ÖR‚‡7G&–ær’Gb“²Ð¢–b‚GG2’&WGW&âFFR‚u’ÖÒÖBƒ¦“§2r“°¢FÖ–âÒF–ÖR‚’Òr£ƒcC²FÖ‚ÒF–ÖR‚’²c°¢–b‚GG2ÂFÖ–â’GG2ÒFÖ–ã²–b‚GG2âFÖ‚’GG2ÒF–ÖR‚“°¢&WGW&âFFR‚u’ÖÒÖBƒ¦“§2rÂGG2“°§Ð¦gVæ7F–öâ÷†6SwEö—FVÕö&öG’‚F—B—°¢F"ÒF—E²v&öG’uÒóòF—E²w–ÆöBuÒóòF—C°¢&WGW&â—5ö'&’‚F"’òF"¢µÓ°§Ð¦gVæ7F–öâ÷†6SwE÷&ö6W75ööffÆ–æUö—FVÒ‚F—BÂGRÂGWV–B—°¢GF‚Ò‡7G&–ær’‚F—E²wF‚uÒóòF—E²wG—RuÒóòrr“°¢F&öG’Ò÷†6SwEö—FVÕö&öG’‚F—B“°¢GF‚Ò&Vu÷&WÆ6R‚r5âö’2rÂrrÂGF‚“°¢–b‚GF‚ÓÓÒrö×’ö6†V6¶–âr’&WGW&â÷†6SwEööffÆ–æUö6†V6¶–â‚F&öG’ÂGRÂGWV–BÂF—B“°¢–b‚GF‚ÓÓÒrö×’ö6†V6¶÷WBr’&WGW&â÷†6SwEööffÆ–æUö6†V6¶÷WB‚F&öG’ÂGRÂGWV–BÂF—B“°¢–b‚GF‚ÓÓÒröÆö6F–öç2r’&WGW&â÷†6SwEööffÆ–æUöÆö6F–öç2‚F&öG’ÂGRÂGWV–BÂF—B“°¢–b‚GF‚ÓÓÒrö7F—f—G’r’&WGW&â÷†6SwEööffÆ–æUö7F—f—G’‚F&öG’ÂGRÂGWV–BÂF—B“°¢–b‚GF‚ÓÓÒrööff–6–Â×f—6—G2r’&WGW&â÷†6Sw…ööffÆ–æUööff–6–Å÷f—6—B‚F&öG’ÂGRÂGWV–BÂF—B“°¢–b‚GF‚ÓÓÒrö×’÷vVÆf&RÖw&çG2r’&WGW&â÷†6Sw…ööffÆ–æU÷vVÆf&Uöw&çB‚F&öG’ÂGRÂGWV–BÂF—B“°¢–b‚GF‚ÓÓÒrö×’ö7VÇGW&ÂÖ7F—f—F–W2r’&WGW&â÷†6Sw…ööffÆ–æUö7VÇGW&Åö7F—f—G’‚F&öG’ÂGRÂGWV–BÂF—B“°¢–b‚GF‚ÓÓÒr÷&W÷'G2r’&WGW&â÷†6Sw…ööffÆ–æU÷&W÷'B‚F&öG’ÂGRÂGWV–BÂF—B“°¢F‡&÷ræWrW†6WF–öâ‚}Š}¸Í˜b˜m˜‹’Šý‹Ší˜Š}‹=Š¢Š-˜˜MŠ}¸Í˜b˜}˜m˜‹"›í‹ŠýŠ}‹-‹N(Í›í‹¸Í‹˜m¸Í‹=Š£¢râGF‚“°§Ð¦gVæ7F–öâ÷†6SwEööffÆ–æUö6†V6¶–â‚F"ÂGRÂGWV–BÂF—B—°¢–b„F#£¦öæR‚%4TÄT5B–Be$ôÒ7FfeöGFVæFæ6Rt„U$R6Æ–VçE÷WV–CÓòÄ”Ô•B"Â²GWV–EÒ’’&WGW&â²vö²sÓçG'VRÂvGWÆ–6FRsÓçG'VRÂv¶–æBsÓâv6†V6¶–âuÓ°¢FÖWF†öBÒ7G'FöÆ÷vW"‚‡7G&–ær’‚F%²vÖWF†öBuÒóòvw2r’“°¢–b†–åö'&’‚FÖWF†öBÂ²w"rÂvæf2rÂw&f–BrÂv'BrÂv&ÇVWFö÷F‚uÒÂG'VR’’F‡&÷ræWrW†6WF–öâ‚}Š}¸Í˜b‹˜‹BŠ½ŠŠ¢ŠÝ‹m˜‹›í‹MŠ­¸ÍŠŠ}˜m¸Â˜m˜]¸Î(Í‹M˜ŠòâŠ}‹"u=ˆÂv’Ôf’¸ÍŠru4ÒŠ}‹=Š­˜Š}Šý˜rª˜m¸ÍŠòâr“°¢²FÆBÂFÆæuÒÒfÆ–DvVò‚F%²vÆBuÒóòçVÆÂÂF%²vÆæruÒóòçVÆÂ“°¢–b‚‚FÆBÓÓÒçVÆÂÇÂFÆærÓÓÒçVÆÂ’bbFÖWF†öBÓÒwv–f’r’F‡&÷ræWrW†6WF–öâ‚}˜]˜˜-‹¸ÍŠ¢Š½ŠŠ¢˜‹˜ŠòŠ-˜˜MŠ}¸Í˜b˜ŠÍ˜Šò˜mŠýŠ}‹Šòr“°¢FÆ–æT–BÒ†–çB’‚F%²vÆ–æUö–BuÒóò“°¢FÆ–æT–G2ÒW6W%ö6†V6¶–åöÆ–æUö–G2‚GR“°¢–b‚FÆ–æT–G2ÓÓÒçVÆÂ’FÆ–æT–G2Ò'&•öÖ‚v–çGfÂrÂ'&•ö6öÇVÖâ„F#£¦ÆÂ‚%4TÄT5B–Be$ôÒÆ–æW6"’Âv–Br’“°¢–b‚FÆ–æT–Bbb‚—5ö'&’‚FÆ–æT–G2’ÇÂ–åö'&’‚FÆ–æT–BÂ'&•öÖ‚v–çGfÂrÂFÆ–æT–G2’ÂG'VR’’’FÆ–æT–BÒ°¢F62Ò—76WB‚F%²v67W&7’uÒ’òÖ‚ƒÂÖ–âƒSÂ†fÆöB’F%²v67W&7’uÒ’’¢°¢FW‡G&"ÒÖ‚ƒÂ†–çB•÷&W÷6WGF–ær‚v6†V6¶–åöW'&÷%÷&F—W5öÒrÂ’’²†–çB–6V–Â†Ö–âƒƒÂF62¢ãsR’“°¢G7BÒçVÆÃ°¢–b‚FÖWF†öBÓÓÒvw2r’°¢G6V&6‚ÒFÆ–æT–Bò²FÆ–æT–EÒ¢FÆ–æT–G3°¢G7BÒ7FF–öåöE÷ö–çB‚FÆBÂFÆærÂG6V&6‚ÂFW‡G&"“°¢–b‚G7BbbFÆ–æT–Bbb—5ö'&’‚FÆ–æT–G2’’G7BÒ7FF–öåöE÷ö–çB‚FÆBÂFÆærÂFÆ–æT–G2ÂFW‡G&"“°¢–b‚G7B’°¢FæV"ÒöæV&W7E÷7FF–öâ‚FÆBÂFÆærÆ—5ö'&’‚FÆ–æT–G2“òFÆ–æT–G3¢‚FÆ–æT–Cõ²FÆ–æT–EÓ¥µÒ’“°¢G&V6öâÒFæV"ò‚}ŠíŠ}‹ŠÂŠ}‹"˜]ŠÝŠý˜Šý˜}‰²˜m‹-Šý¸Íªž(ÍŠ­‹¸Í˜bŠ}¸Í‹=Š­ªýŠ}˜rrâFæV%²væÖRuÒârŠý‹rç&÷VæB‚FæV%²vF—7Fæ6UöÒuÒ’âr˜]Š­‹r’¢}ŠíŠ}‹ŠÂŠ}‹"˜]ŠÝŠý˜Šý˜rs°¢öGFVæFæ6U÷&V¦V7EöÆör‚†–çB’GU²v–BuÒÂFÆ–æT–BÂFÖWF†öBÂFÆBÂFÆærÂF62ÂG&V6öâÅ²vöffÆ–æRsÓçG'VRÂv6Æ–VçE÷WV–BsÓâGWV–EÒ“°¢F‡&÷ræWrW†6WF–öâ‚G&V6öâ“°¢Ð¢FÆ–æT–BÒ†–çB’‚G7E²vÆ–æUö–BuÒóòFÆ–æT–B“°¢Ð¢–b‚FÖWF†öBÓÓÒwv–f’r’°¢òòÇv—2fÆ–FFRv’Ôf’&ööbv–ç7BWfW'’76–væVBÆ–æS²æWfW"G'W7B6Æ–VçBÆ–æUö–BÆöæRà¢G&ööbÒG&–Ò‚‡7G&–ær’‚F%²w&ööbuÒóòrr’“°¢–b‚G&ööbÓÓÒrrÇÂ—5ö'&’‚FÆ–æT–G2’ÇÂFÆ–æT–G2’F‡&÷ræWrW†6WF–öâ‚}‹M˜mŠ}‹=˜}™Bv’Ôf’Š‹Š}¸ÂŠ½ŠŠ¢Š-˜˜MŠ}¸Í˜b˜]˜ŠÍ˜Šò˜m¸Í‹=Š¢r“°¢Fæ÷&ÒÒöGFVæFæ6Uöæ÷&ÖÆ—¦Uö'76–B‚G&ööb“°¢–b‚Fæ÷&ÒÓÓÒrr’F‡&÷ræWrW†6WF–öâ‚}˜-Š}˜MŠ‚%54”BŠ}‹‹=Š}˜M¸Â˜]‹Š­Š‹˜m¸Í‹=Š¢r“°¢F6öæBÒ&Æ–æUö–B”â‚"æ–×ÆöFR‚rÂrÆ'&•öf–ÆÂƒÆ6÷VçB‚FÆ–æT–G2’Âsòr’’â"’#°¢F6æG2ÒF#£¦ÆÂ‚%4TÄT5BÆ–æUö–BÂfÇVRe$ôÒÆ–æUö–FVçG2t„U$R¶–æCÒwv–f’räB‚F6öæB’"ÂFÆ–æT–G2“°¢FÖF6†VDÆ–æT–BÒ°¢f÷&V6‚‚F6æG22F2’²–b…öGFVæFæ6Uöæ÷&ÖÆ—¦Uö'76–B‚F5²wfÇVRuÒ’ÓÓÒFæ÷&Ò’²FÖF6†VDÆ–æT–BÒ†–çB’F5²vÆ–æUö–BuÓ²'&V³²ÒÐ¢–b‚FÖF6†VDÆ–æT–B’F‡&÷ræWrW†6WF–öâ‚t%54”BŠ}‹=ª˜n(Í‹MŠý˜rŠŠr˜}¸Í¨n(Í¸Íª’Š}‹"Ší‹}˜‹r˜]ŠÍŠ}‹"‹M˜]Šr˜]‹}Š}Š˜-Š¢˜mŠýŠ}‹Šòr“°¢FÆ–æT–BÒFÖF6†VDÆ–æT–C°¢Ð¢–b‚FÆ–æT–BbbFÖWF†öBÓÒvw2rbbFÖWF†öBÓÒwv–f’r’°¢G&ööbÒG&–Ò‚‡7G&–ær’‚F%²w&ööbuÒóòrr’“°¢–b‚G&ööbÓÒrrbb—5ö'&’‚FÆ–æT–G2’bbFÆ–æT–G2’°¢Fæ÷&ÒÒ7G'FöÆ÷vW"‡7G%÷&WÆ6R…²rrÂs¢rÂrÒuÒÂrrÂG&ööb’“°¢F6öæBÒ&Æ–æUö–B”â‚"æ–×ÆöFR‚rÂrÆ'&•öf–ÆÂƒÆ6÷VçB‚FÆ–æT–G2’Âsòr’’â"’#°¢F6æG2ÒF#£¦ÆÂ‚%4TÄT5BÆ–æUö–BÂ¶–æBÂfÇVRe$ôÒÆ–æUö–FVçG2t„U$R¶–æCÓòäB‚F6öæB’"Â'&•öÖW&vR…²FÖWF†öEÒÂFÆ–æT–G2’“°¢f÷&V6‚‚F6æG22F2’°¢–b‡7G'FöÆ÷vW"‡7G%÷&WÆ6R…²rrÂs¢rÂrÒuÒÂrrÂF5²wfÇVRuÒ’’ÓÓÒFæ÷&Ò’²FÆ–æT–BÒ†–çB’F5²vÆ–æUö–BuÓ²'&V³²Ð¢Ð¢Ð¢Ð¢–b‚FÆ–æT–B’F‡&÷ræWrW†6WF–öâ‚}Ší‹rŠ½ŠŠ¢˜‹˜ŠòŠ-˜˜MŠ}¸Í˜b˜]‹MŠí‹R˜m¸Í‹=Š¢r“°¢òò˜]ŠÝŠý˜Šý¸ÍŠ¢‹˜‹BŠ½ŠŠ¢ŠÝ‹m˜‹Š‹Š}¸ÂŠí‹rŠ­‹MŠí¸Í‹^(ÍŠýŠ}Šý˜~(Í‹MŠý˜rŠý‹ŠÝŠ}˜MŠ¢Š-˜˜MŠ}¸Í˜b˜m¸Í‹"‹‹Š}¸ÍŠ¢˜]¸Î(Í‹M˜Šòà¢FÇ&÷rÒF#£¦öæR‚%4TÄT5B6†V6¶–åöÖWF†öG2e$ôÒÆ–æW6t„U$R–CÓò"Â²FÆ–æT–EÒ“°¢–b‚FÇ&÷rbbV×G’‚FÇ&÷u²v6†V6¶–åöÖWF†öG2uÒ’’°¢FÆÆ÷vVBÒ§6öåöFV6öFR‚FÇ&÷u²v6†V6¶–åöÖWF†öG2uÒÂG'VR“°¢–b†—5ö'&’‚FÆÆ÷vVB’’FÆÆ÷vVBÒ'&•÷fÇVW2†'&•öf–ÇFW"‚FÆÆ÷vVBÂfâ‚FÒ“Óâ–åö'&’‡7G'FöÆ÷vW"‚‡7G&–ær’FÒ’Â²w"rÂvæf2rÂw&f–BrÂv'BrÂv&ÇVWFö÷F‚uÒÂG'VR’’“°¢–b†—5ö'&’‚FÆÆ÷vVB’bbFÆÆ÷vVBbb–åö'&’‚FÖWF†öBÂFÆÆ÷vVBÂG'VR’’F‡&÷ræWrW†6WF–öâ‚}‹˜‹BŠ½ŠŠ¢ŠÝ‹m˜‹Š‹Š}¸ÂŠí‹rŠ­‹MŠí¸Í‹^(ÍŠýŠ}Šý˜~(Í‹MŠý˜r˜]ŠÍŠ}‹"˜m¸Í‹=Š¢r“°¢Ð¢F6Æ–VçEF–ÖRÒ÷†6SwEö6Æ–VçE÷F–ÖR‚F%²v6Æ–VçE÷F–ÖRuÒóòF—E²wVWVVEöBuÒóòçVÆÂ“°¢F÷VâÒF#£¦öæR‚%4TÄT5B–Be$ôÒ7FfeöGFVæFæ6Rt„U$RW6W%ö–CÓòäB6†V6µö÷WB•2åTÄÂõ$DU"%’–BDU42Ä”Ô•B"Â²GU²v–BuÕÒ“°¢–b‚F÷Vâ’&WGW&â²vö²sÓçG'VRÂvÇ&VG•ö÷VâsÓçG'VRÂvGFVæFæ6Uö–BsÓâ†–çB’F÷Vå²v–BuÒÂv¶–æBsÓâv6†V6¶–âuÓ°¢G7FF–öâÒFÖWF†öBÓÓÒwv–f’ròçVÆÂ¢‚‚G7E²væÖRuÒóòçVÆÂ’ó¢÷7FF–öåöæÖUöB‚FÆBÂFÆærÂFÆ–æT–G2’“°¢F–BÒF#£¦–ç6W'B‚$”å4U%B”åDò7FfeöGFVæFæ6R‡W6W%ö–BÆÆ–æUö–BÆÖWF†öBÆ6†V6µö–âÆ–åöÆBÆ–åöÆærÆ–å÷7FF–öâÆ6Æ–VçE÷WV–BÆöffÆ–æU÷7–æ6VBÆ6Æ–VçEö6†V6µö–â’dÅTU2ƒòÃòÃòÃòÃòÃòÃòÃòÃÃò’"À¢²GU²v–BuÒÂFÆ–æT–BÂFÖWF†öBÂF6Æ–VçEF–ÖRÂFÆBÂFÆærÂG7FF–öâÂGWV–BÂF6Æ–VçEF–ÖUÒ“°¢G'’²öæ÷F–g•öGFVæFæ6Uö7F–öâ‚v6†V6¶–ârÂ†–çB’GU²v–BuÒÂFÆ–æT–BÂFÖWF†öBÂG7FF–öâÂF6Æ–VçEF–ÖR“²Ò6F6‚…ÅF‡&÷v&ÆRFR’²W'&÷%öÆör‚vöffÆ–æRGFVæFæ6R6†V6¶–âÆW'Bf–ÆVC¢râFRÓævWDÖW76vR‚’“²Ð¢&WGW&â²vö²sÓçG'VRÂvGFVæFæ6Uö–BsÓâF–BÂv¶–æBsÓâv6†V6¶–ârÂvöffÆ–æU÷7–æ6VBsÓçG'VRÂv6†V6µö–âsÓâF6Æ–VçEF–ÖUÓ°§Ð¦gVæ7F–öâ÷†6SwEööffÆ–æUö6†V6¶÷WB‚F"ÂGRÂGWV–BÂF—B—°¢–b„F#£¦öæR‚%4TÄT5B–Be$ôÒ7FfeöGFVæFæ6Rt„U$R6Æ–VçE÷WV–CÓòäB6†V6µö÷WB•2äõBåTÄÂÄ”Ô•B"Â²GWV–EÒ’’&WGW&â²vö²sÓçG'VRÂvGWÆ–6FRsÓçG'VRÂv¶–æBsÓâv6†V6¶÷WBuÓ°¢²FÆBÂFÆæuÒÒfÆ–DvVò‚F%²vÆBuÒóòçVÆÂÂF%²vÆæruÒóòçVÆÂ“°¢F6Æ–VçEF–ÖRÒ÷†6SwEö6Æ–VçE÷F–ÖR‚F%²v6Æ–VçE÷F–ÖRuÒóòF—E²wVWVVEöBuÒóòçVÆÂ“°¢F÷VâÒF#£¦öæR‚%4TÄT5B–BÆ6†V6µö–âÆÆ–æUö–BÆÖWF†öBe$ôÒ7FfeöGFVæFæ6Rt„U$RW6W%ö–CÓòäB6†V6µö÷WB•2åTÄÂõ$DU"%’–BDU42Ä”Ô•B"Â²GU²v–BuÕÒ“°¢–b‚F÷Vâ’F‡&÷ræWrW†6WF–öâ‚}Š‹Š}¸ÂŠí‹˜ŠÂŠ-˜˜MŠ}¸Í˜mˆÂ˜‹˜ŠòŠŠ}‹-¸ÂŠý‹‹=‹˜‹˜ŠÍ˜Šò˜mŠýŠ}‹Šòr“°¢G7FF–öâÒ÷7FF–öåöæÖUöB‚FÆBÂFÆærÇW6W%öÆ–æUö–G2‚GR’“°¢–b‡7G'F÷F–ÖR‚F6Æ–VçEF–ÖR’ÃÒ7G'F÷F–ÖR‚F÷Vå²v6†V6µö–âuÒ’’F6Æ–VçEF–ÖRÒFFR‚u’ÖÒÖBƒ¦“§2rÂ7G'F÷F–ÖR‚F÷Vå²v6†V6µö–âuÒ’²c“°¢F#£§'Vâ‚%UDDR7FfeöGFVæFæ6R4UB6†V6µö÷WCÓòÂ÷WEöÆCÓòÂ÷WEöÆæsÓòÂ÷WE÷7FF–öãÓòÂöffÆ–æU÷7–æ6VCÓÂ6Æ–VçEö6†V6µö÷WCÓòt„U$R–CÓò"Â²F6Æ–VçEF–ÖRÂFÆBÂFÆærÂG7FF–öâÂF6Æ–VçEF–ÖRÂF÷Vå²v–BuÕÒ“°¢G'’²öæ÷F–g•öGFVæFæ6Uö7F–öâ‚v6†V6¶÷WBrÂ†–çB’GU²v–BuÒÂF÷Vå²vÆ–æUö–BuÓóöçVÆÂÂF÷Vå²vÖWF†öBuÓóòvw2rÂG7FF–öâÂF6Æ–VçEF–ÖR“²Ò6F6‚…ÅF‡&÷v&ÆRFR’²W'&÷%öÆör‚vöffÆ–æRGFVæFæ6R6†V6¶÷WBÆW'Bf–ÆVC¢râFRÓævWDÖW76vR‚’“²Ð¢&WGW&â²vö²sÓçG'VRÂvGFVæFæ6Uö–BsÓâ†–çB’F÷Vå²v–BuÒÂv¶–æBsÓâv6†V6¶÷WBrÂvöffÆ–æU÷7–æ6VBsÓçG'VRÂv6†V6µö÷WBsÓâF6Æ–VçEF–ÖUÓ°§Ð¦gVæ7F–öâ÷†6SwEööffÆ–æUöÆö6F–öç2‚F"ÂGRÂGWV–BÂF—B—°¢G–æw2ÒF%²w–æw2uÒóòµÓ°¢–b‚—5ö'&’‚G–æw2’ÇÂG–æw2’&WGW&â²vö²sÓçG'VRÂv¶–æBsÓâvÆö6F–öç2rÂv–ç6W'FVBsÓãÓ°¢FãÓ°¢f÷&V6‚‚G–æw22G’°¢–b‚—5ö'&’‚G’’6öçF–çVS°¢FÆBÒ—5öçVÖW&–2‚G²vÆBuÒóòçVÆÂ’ò†fÆöB’G²vÆBuÒ¢çVÆÃ²FÆærÒ—5öçVÖW&–2‚G²vÆæruÒóòçVÆÂ’ò†fÆöB’G²vÆæruÒ¢çVÆÃ°¢–b‚FÆCÓÓÖçVÆÂÇÂFÆæsÓÓÖçVÆÂ’6öçF–çVS°¢GG2Ò÷†6SwEö6Æ–VçE÷F–ÖR‚G²v6GW&VEöBuÒóòG²wG2uÒóòF—E²wVWVVEöBuÒóòçVÆÂ“°¢G'’²F#£§'Vâ‚$”å4U%B”åDòÆö6F–öå÷–æw2‡W6W%ö–BÆÆBÆÆærÆ6GW&VEöBÆÖö6¶VB’dÅTU2ƒòÃòÃòÃòÃò’"Â²GU²v–BuÒÂFÆBÂFÆærÂGG2ÂV×G’‚G²vÖö6¶VBuÒ“ó£Ò“²Fâ²³²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢Ð¢&WGW&â²vö²sÓçG'VRÂv¶–æBsÓâvÆö6F–öç2rÂv–ç6W'FVBsÓâFåÓ°§Ð¦gVæ7F–öâ÷†6SwEööffÆ–æUö7F—f—G’‚F"ÂGRÂGWV–BÂF—B—°¢FWfVçBÒ&Vu÷&WÆ6R‚rõµæ×¤Õ£Ó•õÂÕÒòrÂrrÂ‡7G&–ær’‚F%²v¶–æBuÒóòF%²vWfVçBuÒóòvöffÆ–æUöWfVçBr’“°¢F#£§'Vâ‚$”å4U%B”åDò7F—f—G•öÆöw2‡W6W%ö–BÆWfVçBÆÖWFÆ7&VFVEöB’dÅTU2ƒòÃòÃòÃò’"Â²GU²v–BuÒÂFWfVçBÆ§6öåöVæ6öFR…²vöffÆ–æRsÓçG'VRÂv6Æ–VçE÷WV–BsÓâGWV–BÂw–ÆöBsÓâF%ÒÄ¥4ôåõTäU44TEõTä”4ôDR’Å÷†6SwEö6Æ–VçE÷F–ÖR‚F%²vBuÒóòF—E²wVWVVEöBuÒóòçVÆÂ•Ò“°¢&WGW&â²vö²sÓçG'VRÂv¶–æBsÓâv7F—f—G’uÓ°§Ð ¦gVæ7F–öâ÷†6Sw…ööffÆ–æUööff–6–Å÷f—6—B‚F"ÂGRÂGWV–BÂF—B—°¢–b†V×G’‚F%²vöff–6–Åö–BuÒ’’F‡&÷ræWrW†6WF–öâ‚}Š}˜mŠ­ŠíŠ}Š‚˜]‹=Šm˜˜BŠ}˜M‹-Š}˜]¸ÂŠ}‹=Š¢r“°¢–b†V×G’‡G&–Ò‚F%²væ÷FRuÒóòrr’’’F‡&÷ræWrW†6WF–öâ‚}Šý‹ŠÂŠ­˜‹m¸ÍŠÝŠ}Š¢Š}˜M‹-Š}˜]¸ÂŠ}‹=Š¢r“°¢–b„F#£¦öæR‚%4TÄT5B–Be$ôÒöff–6–Å÷f—6—G2t„U$R&V6÷&FVEö'“ÓòäBæ÷FSÓòäB7&VFVEöCÓòÄ”Ô•B"Â²GU²v–BuÒÂF%²væ÷FRuÒóòrrÂöö6Æ–VçE÷F–ÖR‚F"ÂF—E²wVWVVEöBuÒóòçVÆÂ•Ò’’&WGW&â²vö²sÓçG'VRÂvGWÆ–6FRsÓçG'VRÂv¶–æBsÓâvöff–6–Å÷f—6—BuÓ°¢²FÆBÂFÆæuÒÒfÆ–DvVò‚F%²vÆBuÒóòçVÆÂÂF%²vÆæruÒóòçVÆÂ“°¢FÆ–æT–G2ÒW6W%öÆ–æUö–G2‚GR“°¢G&W&÷rÒF#£¦öæR‚%4TÄT5BfÇVRe$ôÒ÷6WGF–æw2t„U$R¶W–Òvöff–6–Å÷f—6—E÷&WV—&U÷7FF–öâr"“°¢G&WV—&U7FF–öâÒG&W&÷rò†&ööÂ–§6öåöFV6öFR‚G&W&÷u²wfÇVRuÒÂG'VR’¢G'VS°¢G7BÒçVÆÃ°¢–b‚G&WV—&U7FF–öâ’°¢–b‚FÆBÓÓÒçVÆÂ’F‡&÷ræWrW†6WF–öâ‚}˜]˜˜-‹¸ÍŠ¢˜]ªŠ}˜m¸ÂŠ½ŠŠ¢Š-˜˜MŠ}¸Í˜b˜ŠÍ˜Šò˜mŠýŠ}‹Šòr“°¢G7BÒ7FF–öåöE÷ö–çB‚FÆBÂFÆærÂFÆ–æT–G2“°¢–b‚G7B’F‡&÷ræWrW†6WF–öâ‚}Š½ŠŠ¢Š-˜˜MŠ}¸Í˜bŠÝ‹m˜‹˜]‹=Šm˜˜BŠíŠ}‹ŠÂŠ}‹"˜]ŠÝŠý˜Šý˜r˜]ŠÍŠ}‹"Š}‹=Š¢r“°¢Ð¢G†÷FòÒF%²w†÷FõöFFuÒóòçVÆÃ°¢FWfVçDBÒöö6Æ–VçE÷F–ÖR‚F"ÂF—E²wVWVVEöBuÒóòçVÆÂ“°¢GF‚ÒV×G’‚G†÷Fò’òÖVF–£§6fT&6ScB‚G†÷FòÂwf—6—G2rÂ#ƒÂs’¢çVÆÃ°¢G'’°¢F–BÒF#£¦–ç6W'B‚$”å4U%B”åDòöff–6–Å÷f—6—G2†öff–6–Åö–BÇ&V6÷&FVEö'’ÆÆ–æUö–BÆæ÷FRÆÆBÆÆærÇ†÷Fõ÷F‚Æ7&VFVEöB’dÅTU2ƒòÃòÃòÃòÃòÃòÃòÃò’"Â²†–çB’F%²vöff–6–Åö–BuÒÂGU²v–BuÒÂF%²vÆ–æUö–BuÒóò‚G7E²vÆ–æUö–BuÒóòçVÆÂ’ÂF%²væ÷FRuÒóòçVÆÂÂFÆBÂFÆærÂGF‚ÂFWfVçDEÒ“°¢Ò6F6‚…F‡&÷v&ÆRFR’°¢F–BÒF#£¦–ç6W'B‚$”å4U%B”åDòöff–6–Å÷f—6—G2†öff–6–Åö–BÇ&V6÷&FVEö'’ÆÆ–æUö–BÆæ÷FRÆÆBÆÆærÇ†÷FõöFFÆ7&VFVEöB’dÅTU2ƒòÃòÃòÃòÃòÃòÃòÃò’"Â²†–çB’F%²vöff–6–Åö–BuÒÂGU²v–BuÒÂF%²vÆ–æUö–BuÒóò‚G7E²vÆ–æUö–BuÒóòçVÆÂ’ÂF%²væ÷FRuÒóòçVÆÂÂFÆBÂFÆærÂG†÷FòÂFWfVçDEÒ“°¢Ð¢&WGW&â²vö²sÓçG'VRÂv¶–æBsÓâvöff–6–Å÷f—6—BrÂv–BsÓâF–BÂv7&VFVEöBsÓâFWfVçDEÓ°§Ð¦gVæ7F–öâ÷†6Sw…ööffÆ–æU÷vVÆf&Uöw&çB‚F"ÂGRÂGWV–BÂF—B—°¢öVç7W&U÷vVÆf&U÷F&ÆW2‚“°¢–b‚ö6å÷vVÆf&R‚GR’’F‡&÷ræWrW†6WF–öâ‚}Šý‹=Š­‹‹=¸ÂŠ½ŠŠ¢‹˜Š}˜}¸ÍŠ}Š¢˜mŠýŠ}‹¸ÍŠòr“°¢F—FVÔ–CÒ†–çB’‚F%²v—FVÕö–BuÓóó“²Fæ–C×G&–Ò‚‡7G&–ær’‚F%²vG&—fW%öæF–öæÅö–BuÓóòrr’“°¢–b‚F—FVÔ–BÇÂFæ–CÓÓÒrr’F‡&÷ræWrW†6WF–öâ‚}Š}‹}˜MŠ}‹Š}Š¢‹˜Š}˜}¸ÍŠ}Š¢˜mŠ}˜-‹RŠ}‹=Š¢r“°¢FG'cÔF#£¦öæR‚%4TÄT5Bf—'7EöæÖRÆÆ7EöæÖRÆÖö&–ÆRe$ôÒG&—fW'2t„U$RæF–öæÅö–CÓò"Å²Fæ–EÒ“°¢–b‚FG'b’F‡&÷ræWrW†6WF–öâ‚}‹Š}˜m˜mŠý˜r‹˜Š}˜}¸ÍŠ}Š¢¸ÍŠ}˜Š¢˜m‹MŠòr“°¢FWfVçDCÕöö6Æ–VçE÷F–ÖR‚F"ÂF—E²wVWVVEöBuÓóöçVÆÂ“°¢F¦FFSÕööæ÷&ÖÆ—¦Uö¦FFR‚F%²vw&çFVEö¦FFRuÓóöçVÆÂÂFWfVçDB“°¢FæÖS×G&–Ò‚‚FG'e²vf—'7EöæÖRuÓóòrr’ârrâ‚FG'e²vÆ7EöæÖRuÓóòrr’“°¢F–CÔF#£¦–ç6W'B‚$”å4U%B”åDòvVÆf&Uöw&çG2†—FVÕö–BÇÆ6Uö–BÆG&—fW%öæF–öæÅö–BÆG&—fW%öæÖRÆG&—fW%öÖö&–ÆRÆ6÷VçBÆæ÷FRÆw&çFVEö'’Æw&çFVEö¦FFRÆ7&VFVEöB’dÅTU2ƒòÃòÃòÃòÃòÃòÃòÃòÃòÃò’"Å²F—FVÔ–BÂV×G’‚F%²wÆ6Uö–BuÒ“ò†–çB’F%²wÆ6Uö–BuÓ¦çVÆÂÂFæ–BÂFæÖRÂFG'e²vÖö&–ÆRuÓóöçVÆÂÆÖ‚ƒÂ†–çB’‚F%²v6÷VçBuÓóó’’ÇG&–Ò‚F%²væ÷FRuÓóòrr“ó¦çVÆÂÂGU²v–BuÒÂF¦FFRÂFWfVçDEÒ“°¢&WGW&â²vö²sÓçG'VRÂv¶–æBsÓâwvVÆf&Uöw&çBrÂv–BsÓâF–BÂv7&VFVEöBsÓâFWfVçDBÂvw&çFVEö¦FFRsÓâF¦FFUÓ°§Ð¦gVæ7F–öâ÷†6Sw…ööffÆ–æUö7VÇGW&Åö7F—f—G’‚F"ÂGRÂGWV–BÂF—B—°¢öVç7W&Uö7VÇGW&Å÷F&ÆW2‚“°¢–b‚ö6åö7VÇGW&Â‚GR’’F‡&÷ræWrW†6WF–öâ‚}Šý‹=Š­‹‹=¸ÂŠ½ŠŠ¢˜‹Š}˜M¸ÍŠ¢˜‹˜}˜mªý¸Â˜mŠýŠ}‹¸ÍŠòr“°¢GG—T–CÒ†–çB’‚F%²wG—Uö–BuÓóó“²Fæ–C×G&–Ò‚‡7G&–ær’‚F%²vG&—fW%öæF–öæÅö–BuÓóòrr’“°¢–b‚GG—T–BÇÂFæ–CÓÓÒrr’F‡&÷ræWrW†6WF–öâ‚}Š}‹}˜MŠ}‹Š}Š¢˜‹Š}˜M¸ÍŠ¢˜‹˜}˜mªý¸Â˜mŠ}˜-‹RŠ}‹=Š¢r“°¢FG'cÔF#£¦öæR‚%4TÄT5Bf—'7EöæÖRÆÆ7EöæÖRÆÖö&–ÆRe$ôÒG&—fW'2t„U$RæF–öæÅö–CÓò"Å²Fæ–EÒ“°¢–b‚FG'b’F‡&÷ræWrW†6WF–öâ‚}‹Š}˜m˜mŠý˜r˜‹Š}˜M¸ÍŠ¢˜‹˜}˜mªý¸Â¸ÍŠ}˜Š¢˜m‹MŠòr“°¢FWfVçDCÕöö6Æ–VçE÷F–ÖR‚F"ÂF—E²wVWVVEöBuÓóöçVÆÂ“°¢F¦FFSÕööæ÷&ÖÆ—¦Uö¦FFR‚F%²v7F—f—G•ö¦FFRuÓóöçVÆÂÂFWfVçDB“°¢FæÖS×G&–Ò‚‚FG'e²vf—'7EöæÖRuÓóòrr’ârrâ‚FG'e²vÆ7EöæÖRuÓóòrr’“°¢F–CÔF#£¦–ç6W'B‚$”å4U%B”åDò7VÇGW&Åö7F—f—F–W2‡G—Uö–BÇÆ6Uö–BÆG&—fW%öæF–öæÅö–BÆG&—fW%öæÖRÆG&—fW%öÖö&–ÆRÆ7F—f—G•ö¦FFRÆÆö6F–öâÆ†÷W'2Ææ÷FRÇ&V6÷&FVEö'’Æ7&VFVEöB’dÅTU2ƒòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃò’"Å²GG—T–BÂV×G’‚F%²wÆ6Uö–BuÒ“ò†–çB’F%²wÆ6Uö–BuÓ¦çVÆÂÂFæ–BÂFæÖRÂFG'e²vÖö&–ÆRuÓóöçVÆÂÂF¦FFRÇG&–Ò‚F%²vÆö6F–öâuÓóòrr“ó¦çVÆÂÂ‚F%²v†÷W'2uÓóöçVÆÂ’ÇG&–Ò‚F%²væ÷FRuÓóòrr“ó¦çVÆÂÂGU²v–BuÒÂFWfVçDEÒ“°¢&WGW&â²vö²sÓçG'VRÂv¶–æBsÓâv7VÇGW&Åö7F—f—G’rÂv–BsÓâF–BÂv7&VFVEöBsÓâFWfVçDBÂv7F—f—G•ö¦FFRsÓâF¦FFUÓ°§Ð¦gVæ7F–öâ÷†6Sw…ööffÆ–æU÷&W÷'B‚F"ÂGRÂGWV–BÂF—B—°¢öVç7W&U÷&W÷'G5ö–æFW‚‚“°¢–b†V×G’‚F%²w7V&¦V7BuÒ’ÇÂV×G’‚F%²v&öG’uÒ’’F‡&÷ræWrW†6WF–öâ‚}ªý‹-Š}‹‹BŠ-˜˜MŠ}¸Í˜b˜mŠ}˜-‹RŠ}‹=Š¢r“°¢FWfVçDCÕöö6Æ–VçE÷F–ÖR‚F"ÂF—E²wVWVVEöBuÓóöçVÆÂ“°¢G&–÷&—G“Ö–åö'&’‚‚F%²w&–÷&—G’uÓóòvæ÷&ÖÂr’Å²væ÷&ÖÂrÂv–×÷'FçBrÂwW&vVçBuÒÇG'VR“òF%²w&–÷&—G’uÓ¢væ÷&ÖÂs°¢FGEFƒÖçVÆÃ²–b‚V×G’‚F%²vGF6†ÖVçEöFFuÒ’’FGEFƒÔÖVF–£§6fT&6ScB‚F%²vGF6†ÖVçEöFFuÒÂw&W÷'G2rÃ#ƒÃs“°¢G'’²F–CÔF#£¦–ç6W'B‚$”å4U%B”åDò&W÷'G2‡6VæFW%ö–BÇ7V&¦V7BÆ&öG’Ç&–÷&—G’ÆGF6†ÖVçEöæÖRÆGF6†ÖVçE÷F‚Æ7&VFVEöB’dÅTU2ƒòÃòÃòÃòÃòÃòÃò’"Å²GU²v–BuÒÂF%²w7V&¦V7BuÒÂF%²v&öG’uÒÂG&–÷&—G’ÂF%²vGF6†ÖVçEöæÖRuÓóöçVÆÂÂFGEF‚ÂFWfVçDEÒ“²Ð¢6F6‚…F‡&÷v&ÆRFR’²F–CÔF#£¦–ç6W'B‚$”å4U%B”åDò&W÷'G2‡6VæFW%ö–BÇ7V&¦V7BÆ&öG’Æ7&VFVEöB’dÅTU2ƒòÃòÃòÃò’"Å²GU²v–BuÒÂF%²w7V&¦V7BuÒÂF%²v&öG’uÒÂFWfVçDEÒ“²Ð¢÷6fU÷&W÷'EöGF6†ÖVçG2‚F–BÂF%²vGF6†ÖVçG2uÓóõµÒ“°¢÷&W÷'EöVF—B‚F–BÂGU²v–BuÒÂv7&VFUööffÆ–æRrÆçVÆÂÅ²w&–÷&—G’sÓâG&–÷&—G’Âv6Æ–VçE÷WV–BsÓâGWV–EÒ“°¢&WGW&â²vö²sÓçG'VRÂv¶–æBsÓâw&W÷'BrÂv–BsÓâF–BÂv7&VFVEöBsÓâFWfVçDEÓ°§Ð§&÷WFR‚ttUBrÂrö’öFÖ–âööffÆ–æR×7–æ2ÖÆöw2rÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6SwEöVç7W&R‚“°¢G7FGW2ÒG&–Ò‚‡7G&–ær’‚G²w7FGW2uÒóòrr’“°¢Gv†W&SÒsÓs²F&w3ÕµÓ°¢–b‚G7FGW2ÓÒrr’²Gv†W&RãÒräB÷6Âç7FGW3Óòs²F&w5µÓÒG7FGW3²Ð¢&WGW&âF#£¦ÆÂ‚%4TÄT5B÷6Ââ¢Â4ôä4B‡Ræf—'7EöæÖRÂrrÇRæÆ7EöæÖR’W6W%öæÖRe$ôÒöffÆ–æU÷7–æ5öÆöw2÷6ÂÄTeB¤ô”âW6W'2RôâRæ–CÖ÷6ÂçW6W%ö–Bt„U$RGv†W&Rõ$DU"%’÷6Âæ–BDU42Ä”Ô•BS"ÂF&w2“°§ÒÂfÇ6RÂDÔ”â“°§&÷WFR‚ttUBrÂrö’öFÖ–â÷†6Sr×'CB÷7FGW2rÂgVæ7F–öâ‚GÂF"ÂGR—°¢&WGW&â²w6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôâÂw†6RsÓãrÂw'BsÓãBÂv6ö×ÆWFVBsÓå°¢vöffÆ–æU÷7–æ5÷&ö6W76–ærrÂvöffÆ–æUö6†V6¶–åö6†V6¶÷WE÷&ö6W76–ærrÂvöffÆ–æUöÆö6F–öå÷&ö6W76–ærrÂvöffÆ–æU÷7–æ5öFÖ–åöÆöw2rÂvÖö&–ÆU÷7–æ5ö6Æ–VçEöf—‚rÂwfW'6–öåóóórrÂwWw&FU÷‡ö6öç6öÆ–FFVBp¢ÒÂw&VÖ–æ–ærsÓå°¢w&öGV7F–öåö'VæFÆU÷v—F†÷WEö'&÷w6W%ö&&VÂrÂvgVÆÅöFWf–6Uöf–VÆE÷FW7BrÂvWFöÖFVEö•÷FW7E÷7V—FRrÂvGfæ6VEööffÆ–æUö6öæfÆ–7E÷&W6öÇWF–öå÷V’p¢ÕÓ°§ÒÂfÇ6RÂDÔ”â“°§&÷WFR‚ttUBrÂrö’÷&ö¦V7B×fW'6–öâ×cwBrÂgVæ7F–öâ‚GÂF"ÂGR—²&WGW&â²w6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôâÂw†6RsÓãrÂw'BsÓãBÂw&VÆV6UöæÖRsÓâu†6RrãrÒ6†–gB66†VGVÆ–ærf–æÆ—¦F–öâuÓ²ÒÂG'VR“°  ¢ò¢ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐ¢¢†6RrãR(	BöffÆ–æR6öæfÆ–7B&W6öÇWF–öâæB÷W&F–öæÂ¢¢fW'6–öã¢6—FR“bòãã€¢¢ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒ¢ð¦gVæ7F–öâ÷†6SwUöVç7W&R‚—°¢–b†gVæ7F–öåöW†—7G2‚u÷†6SwEöVç7W&Rr’’÷†6SwEöVç7W&R‚“°¢f÷&V6‚…°¢²vöffÆ–æU÷7–æ5öÆöw2rÂw&W6öÇfVEö'’rÂt$”t”åBåTÄÂuÒÀ¢²vöffÆ–æU÷7–æ5öÆöw2rÂw&W6öÇfVEöBrÂtDDUD”ÔRåTÄÂuÒÀ¢²vöffÆ–æU÷7–æ5öÆöw2rÂw&W6öÇWF–öåöæ÷FRrÂuDU…BåTÄÂuÒÀ¢²vöffÆ–æU÷7–æ5öÆöw2rÂv6öæfÆ–7E÷&V6öârÂuDU…BåTÄÂuÐ¢Ò2F2’°¢G'’²–b„F#£¦öæR‚%4„õrD$ÄU2Ä”´Rò"Â²F5³ÕÒ’bbF#£¦öæR‚%4„õr4ôÅTÔå2e$ôÒ²F5³×Òt„U$Rf–VÆCÓò"Â²F5³ÕÒ’’F#£§'Vâ‚$ÅDU"D$ÄR²F5³×ÒDB4ôÅTÔâ²F5³×Ò²F5³%×Ò"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢Ð¢G'’²F#£§'Vâ‚$5$TDR”äDU‚–G…ööffÆ–æU÷&W6öÇfVBôâöffÆ–æU÷7–æ5öÆöw2‡&W6öÇfVEöBÇ&W6öÇfVEö'’’"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2öffÆ–æU÷7–æ5öVF—B€¢–B$”t”åBUDõô”ä5$TÔTåB$”Ô%’´U’À¢öffÆ–æU÷7–æ5ö–B$”t”åBäõBåTÄÂÀ¢7F÷%ö–B$”t”åBåTÄÂÀ¢7F–öâd$4„"ƒC’äõBåTÄÂÀ¢æ÷FRDU…BåTÄÂÀ¢&Vf÷&U÷7FGW2d$4„"ƒ3’åTÄÂÀ¢gFW%÷7FGW2d$4„"ƒ3’åTÄÂÀ¢ÖWF¥4ôâåTÄÂÀ¢7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÀ¢”äDU‚–G…ö÷6÷7–æ2†öffÆ–æU÷7–æ5ö–BÆ7&VFVEöB’À¢”äDU‚–G…ö÷6ö7F÷"†7F÷%ö–BÆ7&VFVEöB¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢–b†gVæ7F–öåöW†—7G2‚u÷†6Se÷6WBr’’²÷†6Se÷6WB‚w6—FU÷fW'6–öârÂ4•DUõdU%4”ôâ“²÷†6Se÷6WB‚v÷fW'6–öârÂõdU%4”ôâ“²÷†6Se÷6WB‚vF%÷Ww&FU÷fW'6–öârÂw†6Sr×'CRÓãã‚r“²Ð§Ð¦gVæ7F–öâ÷†6SwUöVF—B‚F–BÂF7F÷"ÂF7F–öâÂFæ÷FRÂF&Vf÷&RÂFgFW"ÂFÖWFÕµÒ—°¢G'’²F#£§'Vâ‚$”å4U%B”åDòöffÆ–æU÷7–æ5öVF—B†öffÆ–æU÷7–æ5ö–BÆ7F÷%ö–BÆ7F–öâÆæ÷FRÆ&Vf÷&U÷7FGW2ÆgFW%÷7FGW2ÆÖWF’dÅTU2ƒòÃòÃòÃòÃòÃòÃò’"Â²F–BÂF7F÷"ÂF7F–öâÂFæ÷FRÂF&Vf÷&RÂFgFW"Æ§6öåöVæ6öFR‚FÖWFÄ¥4ôåõTäU44TEõTä”4ôDR•Ò“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð§Ð¦gVæ7F–öâ÷†6SwU÷&÷r‚F–B—°¢÷†6SwUöVç7W&R‚“°¢G&÷rÒF#£¦öæR‚%4TÄT5B¢e$ôÒöffÆ–æU÷7–æ5öÆöw2t„U$R–CÓò"Â²†–çB’F–EÒ“°¢–b‚G&÷r’‡GG£¦W'&÷"‚}‹ª˜‹Šò˜}˜]ªýŠ}˜^(Í‹=Š}‹-¸ÂŠ-˜˜MŠ}¸Í˜b¸ÍŠ}˜Š¢˜m‹MŠòrÃCB“°¢&WGW&âG&÷s°§Ð¦gVæ7F–öâ÷†6SwUöFV6öFU÷–ÆöB‚G&÷r—°¢G–ÆöBÒG&÷u²w–ÆöBuÒóòçVÆÃ°¢–b†—5÷7G&–ær‚G–ÆöB’’G–ÆöBÒ§6öåöFV6öFR‚G–ÆöBÇG'VR“°¢&WGW&â—5ö'&’‚G–ÆöB’òG–ÆöB¢µÓ°§Ð§&÷WFR‚ttUBrÂrö’öFÖ–âööffÆ–æR×7–æ2Ö6öæfÆ–7G2rÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6SwUöVç7W&R‚“°¢G7FGW2ÒG&–Ò‚‡7G&–ær’‚G²w7FGW2uÒóòrr’“°¢Gv†W&RÒ&÷6Âç7FGW2”â‚vf–ÆVBrÂv6öæfÆ–7BrÂw&V6V—fVBr’#²F&w3ÕµÓ°¢–b‚G7FGW2ÓÒrr’²Gv†W&RÒv÷6Âç7FGW3Óòs²F&w5µÓÒG7FGW3²Ð¢GW6W$–CÒ†–çB’‚G²wW6W%ö–BuÓóó“²–b‚GW6W$–Cã—²Gv†W&RãÒräB÷6ÂçW6W%ö–CÓòs²F&w5µÓÒGW6W$–C·Ð¢G&÷w2ÒF#£¦ÆÂ‚%4TÄT5B÷6Ââ¢Â4ôä4B‡Ræf—'7EöæÖRÂrrÇRæÆ7EöæÖR’W6W%öæÖRÂ"çF—FÆR&öÆU÷F—FÆP¢e$ôÒöffÆ–æU÷7–æ5öÆöw2÷6À¢ÄTeB¤ô”âW6W'2RôâRæ–CÖ÷6ÂçW6W%ö–@¢ÄTeB¤ô”â&öÆW2"ôâ"æ–C×Rç&öÆUö–@¢t„U$RGv†W&Rõ$DU"%’÷6Âæ–BDU42Ä”Ô•BS"ÂF&w2“°¢f÷&V6‚‚G&÷w22bG"—°¢–b†V×G’‚G%²v6öæfÆ–7E÷&V6öâuÒ’’G%²v6öæfÆ–7E÷&V6öâuÒÒG%²vW'&÷"uÒó¢‚G%²w7FGW2uÓÓÓÒw&V6V—fVBsò}Šý‹‹]˜Š‹‹‹=¸Â¸ÍŠr›í‹ŠýŠ}‹-‹B˜m‹MŠý˜rs¢}˜m¸ÍŠ}‹-˜]˜mŠòŠ‹‹‹=¸Âr“°¢G%²vVF—BuÒÒF#£¦ÆÂ‚%4TÄT5Bâ¢Â4ôä4B‡Ræf—'7EöæÖRÂrrÇRæÆ7EöæÖR’7F÷%öæÖRe$ôÒöffÆ–æU÷7–æ5öVF—BÄTeB¤ô”âW6W'2RôâRæ–CÖæ7F÷%ö–Bt„U$RæöffÆ–æU÷7–æ5ö–CÓòõ$DU"%’æ–BDU42Ä”Ô•B#"Â²G%²v–BuÕÒ“°¢Ð¢&WGW&â²v—FV×2sÓâG&÷w2Âv6÷VçBsÓæ6÷VçB‚G&÷w2’Âw6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôåÓ°§ÒÂfÇ6RÂDÔ”â“°§&÷WFR‚uõ5BrÂrö’öFÖ–âööffÆ–æR×7–æ2Ö6öæfÆ–7G2÷¶–GÒ÷&WG'’rÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6SwUöVç7W&R‚“²G&÷sÕ÷†6SwU÷&÷r‚G²v–BuÒ“²F&Vf÷&SÒG&÷u²w7FGW2uÓ°¢G–ÆöCÕ÷†6SwUöFV6öFU÷–ÆöB‚G&÷r“°¢GF&vWEW6W"ÒF#£¦öæR‚%4TÄT5B¢e$ôÒW6W'2t„U$R–CÓò"Â²†–çB’G&÷u²wW6W%ö–BuÕÒ“°¢–b‚GF&vWEW6W"’‡GG£¦W'&÷"‚}ªŠ}‹Š‹‹ª˜‹ŠòŠ-˜˜MŠ}¸Í˜b›í¸ÍŠýŠr˜m‹MŠòrÃC“°¢G'’°¢–b‚gVæ7F–öåöW†—7G2‚u÷†6SwE÷&ö6W75ööffÆ–æUö—FVÒr’’F‡&÷ræWrW†6WF–öâ‚}›í‹ŠýŠ}‹-‹Mªý‹Š-˜˜MŠ}¸Í˜b˜‹Š}˜B˜m¸Í‹=Š¢r“°¢G&W2Ò÷†6SwE÷&ö6W75ööffÆ–æUö—FVÒ‚G–ÆöBÂGF&vWEW6W"Â‡7G&–ær’G&÷u²v6Æ–VçE÷WV–BuÒ“°¢F#£§'Vâ‚%UDDRöffÆ–æU÷7–æ5öÆöw24UB7FGW3Òw&ö6W76VBrÂW'&÷#ÔåTÄÂÂ6öæfÆ–7E÷&V6öãÔåTÄÂÂ6W'fW%÷&W7VÇCÓòÂ&ö6W76VEöCÔäõr‚’Â&W6öÇfVEö'“ÓòÂ&W6öÇfVEöCÔäõr‚’Â&W6öÇWF–öåöæ÷FSÓòt„U$R–CÓò"Â¶§6öåöVæ6öFR‚G&W2Ä¥4ôåõTäU44TEõTä”4ôDR’ÂGU²v–BuÓóöçVÆÂÇ7V'7G"‚‡7G&–ær’‚F%²væ÷FRuÓóò}›í‹ŠýŠ}‹-‹B˜]ŠÍŠýŠòŠý‹=Š­¸Âr’ÃÃ’ÂG&÷u²v–BuÕÒ“°¢÷†6SwUöVF—B‚G&÷u²v–BuÒÂGU²v–BuÓóöçVÆÂÂw&WG'’rÂF%²væ÷FRuÓóòrrÂF&Vf÷&RÂw&ö6W76VBrÅ²w&W7VÇBsÓâG&W5Ò“°¢&WGW&â²vö²sÓçG'VRÂw&W7VÇBsÓâG&W5Ó°¢Ò6F6‚…F‡&÷v&ÆRFR’°¢F#£§'Vâ‚%UDDRöffÆ–æU÷7–æ5öÆöw24UB7FGW3Òvf–ÆVBrÂW'&÷#ÓòÂ6öæfÆ–7E÷&V6öãÓòt„U$R–CÓò"Â²FRÓævWDÖW76vR‚’ÂFRÓævWDÖW76vR‚’ÂG&÷u²v–BuÕÒ“°¢÷†6SwUöVF—B‚G&÷u²v–BuÒÂGU²v–BuÓóöçVÆÂÂw&WG'•öf–ÆVBrÂF%²væ÷FRuÓóòrrÂF&Vf÷&RÂvf–ÆVBrÅ²vW'&÷"sÓâFRÓævWDÖW76vR‚•Ò“°¢‡GG£¦W'&÷"‚FRÓævWDÖW76vR‚’ÃC“°¢Ð§ÒÂfÇ6RÂDÔ”â“°§&÷WFR‚uõ5BrÂrö’öFÖ–âööffÆ–æR×7–æ2Ö6öæfÆ–7G2÷¶–GÒö–væ÷&RrÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6SwUöVç7W&R‚“²G&÷sÕ÷†6SwU÷&÷r‚G²v–BuÒ“²F&Vf÷&SÒG&÷u²w7FGW2uÓ°¢Fæ÷FS×7V'7G"‚‡7G&–ær’‚F%²væ÷FRuÓóò}˜mŠ}Šý¸ÍŠý˜rªý‹˜Š­˜r‹MŠòr’ÃÃ“°¢F#£§'Vâ‚%UDDRöffÆ–æU÷7–æ5öÆöw24UB7FGW3Òv–væ÷&VBrÂ&W6öÇfVEö'“ÓòÂ&W6öÇfVEöCÔäõr‚’Â&W6öÇWF–öåöæ÷FSÓòt„U$R–CÓò"Â²GU²v–BuÓóöçVÆÂÂFæ÷FRÂG&÷u²v–BuÕÒ“°¢÷†6SwUöVF—B‚G&÷u²v–BuÒÂGU²v–BuÓóöçVÆÂÂv–væ÷&RrÂFæ÷FRÂF&Vf÷&RÂv–væ÷&VBr“°¢&WGW&â²vö²sÓçG'VUÓ°§ÒÂfÇ6RÂDÔ”â“°§&÷WFR‚uõ5BrÂrö’öFÖ–âööffÆ–æR×7–æ2Ö6öæfÆ–7G2÷¶–GÒöÖ&²Ö6öæfÆ–7BrÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6SwUöVç7W&R‚“²G&÷sÕ÷†6SwU÷&÷r‚G²v–BuÒ“²F&Vf÷&SÒG&÷u²w7FGW2uÓ°¢G&V6öã×7V'7G"‚‡7G&–ær’‚F%²w&V6öâuÓóò}˜m¸ÍŠ}‹-˜]˜mŠòŠ‹‹‹=¸Â˜]Šý¸Í‹¸ÍŠ­¸Âr’ÃÃ#“°¢F#£§'Vâ‚%UDDRöffÆ–æU÷7–æ5öÆöw24UB7FGW3Òv6öæfÆ–7BrÂ6öæfÆ–7E÷&V6öãÓòt„U$R–CÓò"Â²G&V6öâÂG&÷u²v–BuÕÒ“°¢÷†6SwUöVF—B‚G&÷u²v–BuÒÂGU²v–BuÓóöçVÆÂÂvÖ&µö6öæfÆ–7BrÂG&V6öâÂF&Vf÷&RÂv6öæfÆ–7Br“°¢&WGW&â²vö²sÓçG'VUÓ°§ÒÂfÇ6RÂDÔ”â“°§&÷WFR‚ttUBrÂrö’öFÖ–âööffÆ–æR×7–æ2Ö6öæfÆ–7G2÷¶–GÒöVF—BrÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6SwUöVç7W&R‚“²÷†6SwU÷&÷r‚G²v–BuÒ“°¢&WGW&âF#£¦ÆÂ‚%4TÄT5Bâ¢Â4ôä4B‡Ræf—'7EöæÖRÂrrÇRæÆ7EöæÖR’7F÷%öæÖRe$ôÒöffÆ–æU÷7–æ5öVF—BÄTeB¤ô”âW6W'2RôâRæ–CÖæ7F÷%ö–Bt„U$RæöffÆ–æU÷7–æ5ö–CÓòõ$DU"%’æ–BDU42"Â²†–çB’G²v–BuÕÒ“°§ÒÂfÇ6RÂDÔ”â“°§&÷WFR‚ttUBrÂrö’öFÖ–â÷†6Sr×'CR÷7FGW2rÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6SwUöVç7W&R‚“°¢F6÷VçG2ÒF#£¦ÆÂ‚%4TÄT5B7FGW2Â4õTåB‚¢’6÷VçBe$ôÒöffÆ–æU÷7–æ5öÆöw2u$õU%’7FGW2"“°¢&WGW&â²w6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôâÂw†6RsÓãrÂw'BsÓãRÂw&VÆV6UöæÖRsÓâu†6RrãrÒ6†–gB66†VGVÆ–ærf–æÆ—¦F–öârÂv6ö×ÆWFVBsÓå°¢vöffÆ–æUö6öæfÆ–7EöÆ—7BrÂvÖçVÅ÷&WG'•öf–ÆVEööffÆ–æUö—FV×2rÂv–væ÷&Uö–çfÆ–EööffÆ–æUö—FV×2rÂvöffÆ–æU÷7–æ5öVF—E÷G&–ÂrÂwfW'6–öåóóó‚rÂwWw&FU÷‡ö6öç6öÆ–FFVBp¢ÒÂw&VÖ–æ–ærsÓå°¢w&öGV7F–öåö'VæFÆU÷v—F†÷WEö'&÷w6W%ö&&VÂrÂvgVÆÅöFWf–6Uöf–VÆE÷FW7BrÂvWFöÖFVEö•÷FW7E÷7V—FRrÂvÆöE÷FW7Eööåöf–æÅ÷6W'fW"p¢ÒÂv6÷VçG2sÓâF6÷VçG5Ó°§ÒÂfÇ6RÂDÔ”â“°§&÷WFR‚ttUBrÂrö’÷&ö¦V7B×fW'6–öâ×cwRrÂgVæ7F–öâ‚GÂF"ÂGR—²&WGW&â²w6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôâÂw†6RsÓãrÂw'BsÓãRÂw&VÆV6UöæÖRsÓâu†6RrãrÒ6†–gB66†VGVÆ–ærf–æÆ—¦F–öâuÓ²ÒÂG'VR“°  ¢òò†6RrãrÒ6†–gB66†VGVÆ–ærf–æÆ—¦F–öâv—F†÷WBÖçVÂÆ–æR6VÆV7F–öà§&÷WFR‚ttUBrÂrö’÷&ö¦V7B×fW'6–öâ×cwbrÂgVæ7F–öâ‚GÂF"ÂGR—²&WGW&â²w6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôâÂw†6RsÓãrÂw'BsÓãbÂw&VÆV6UöæÖRsÓâu†6RrãrÒ6†–gB66†VGVÆ–ærf–æÆ—¦F–öâuÓ²ÒÂG'VR“° ¢òò†6RrãrÒ&VÖ–æ–ær6†–gB66†VGVÆ–æræBWFò×6†–gB†&FVæ–æp¦gVæ7F–öâ÷†6SwuöVç7W&R‚—°¢öVç7W&U÷&öÆU÷v÷&µ÷'VÆW2‚“°¢G'’²–b‚F#£¦öæR‚%4„õr4ôÅTÔå2e$ôÒ&öÆU÷v÷&µ÷'VÆW2t„U$Rf–VÆCÒv–æ6ÇVFUög&–F•ö–åöGWG’r"’’F#£§'Vâ‚$ÅDU"D$ÄR&öÆU÷v÷&µ÷'VÆW2DB4ôÅTÔâ–æ6ÇVFUög&–F•ö–åöGWG’D”å””åBƒ’äõBåTÄÂDTdTÅB"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²–b‚F#£¦öæR‚%4„õr4ôÅTÔå2e$ôÒ&öÆU÷v÷&µ÷'VÆW2t„U$Rf–VÆCÒv–æ6ÇVFUö†öÆ–F•ö–åöGWG’r"’’F#£§'Vâ‚$ÅDU"D$ÄR&öÆU÷v÷&µ÷'VÆW2DB4ôÅTÔâ–æ6ÇVFUö†öÆ–F•ö–åöGWG’D”å””åBƒ’äõBåTÄÂDTdTÅB"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²–b‚F#£¦öæR‚%4„õr4ôÅTÔå2e$ôÒ&öÆU÷v÷&µ÷'VÆW2t„U$Rf–VÆCÒvÖ…ö÷Vå÷6W76–öåöÖ–çWFW2r"’’F#£§'Vâ‚$ÅDU"D$ÄR&öÆU÷v÷&µ÷'VÆW2DB4ôÅTÔâÖ…ö÷Vå÷6W76–öåöÖ–çWFW2”åBäõBåTÄÂDTdTÅB“c"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²–b‚F#£¦öæR‚%4„õr4ôÅTÔå2e$ôÒ&öÆU÷v÷&µ÷'VÆW2t„U$Rf–VÆCÒvWFõö6Æ÷6UöVæ&ÆVBr"’’F#£§'Vâ‚$ÅDU"D$ÄR&öÆU÷v÷&µ÷'VÆW2DB4ôÅTÔâWFõö6Æ÷6UöVæ&ÆVBD”å””åBƒ’äõBåTÄÂDTdTÅB"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²–b‚F#£¦öæR‚%4„õr4ôÅTÔå2e$ôÒ&öÆU÷v÷&µ÷'VÆW2t„U$Rf–VÆCÒvWFõö6Æ÷6UögFW%öÖ–çWFW2r"’’F#£§'Vâ‚$ÅDU"D$ÄR&öÆU÷v÷&µ÷'VÆW2DB4ôÅTÔâWFõö6Æ÷6UögFW%öÖ–çWFW2”åBäõBåTÄÂDTdTÅB"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²–b‚F#£¦öæR‚%4„õr4ôÅTÔå2e$ôÒ&öÆU÷v÷&µ÷'VÆW2t„U$Rf–VÆCÒv6†V6¶÷WEöw&6UöÖ–çWFW2r"’’F#£§'Vâ‚$ÅDU"D$ÄR&öÆU÷v÷&µ÷'VÆW2DB4ôÅTÔâ6†V6¶÷WEöw&6UöÖ–çWFW2”åBäõBåTÄÂDTdTÅBR"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2W6W%÷v÷&µ÷'VÆUö÷fW'&–FW2†–B”åBUDõô”ä5$TÔTåB$”Ô%’´U’ÂW6W%ö–B”åBäõBåTÄÂTä•TRÂF—FÆRd$4„"ƒc’åTÄÂÂGWG•öÖ–çWFW2”åBåTÄÂÂ÷fW'F–ÖUöÆ–Ö—EöÖ–çWFW2”åBåTÄÂÂ7W'ÇW5ögFW%öÖ–çWFW2”åBåTÄÂÂæ–v‡E÷7F'BD”ÔRåTÄÂÂæ–v‡EöVæBD”ÔRåTÄÂÂWFõ÷6†–gEöVæ&ÆVBD”å””åBƒ’åTÄÂÂ6†V6¶–åöç•÷F–ÖRD”å””åBƒ’åTÄÂÂÆÆ÷vVEö6†V6¶–åög&öÒD”ÔRåTÄÂÂÆÆ÷vVEö6†V6¶–å÷FòD”ÔRåTÄÂÂv&åö&Vf÷&Uö÷fW'F–ÖUö6öÖ–çWFW2”åBåTÄÂÂ&WV—&Uö6†V6¶÷WEögFW%ö6D”å””åBƒ’åTÄÂÂæ–v‡Eö6Æ2D”å””åBƒ’åTÄÂÂg&–F•ö6Æ2D”å””åBƒ’åTÄÂÂ†öÆ–F•ö6Æ2D”å””åBƒ’åTÄÂÂ–æ6ÇVFUög&–F•ö–åöGWG’D”å””åBƒ’åTÄÂÂ–æ6ÇVFUö†öÆ–F•ö–åöGWG’D”å””åBƒ’åTÄÂÂÖ…ö÷Vå÷6W76–öåöÖ–çWFW2”åBåTÄÂÂWFõö6Æ÷6UöVæ&ÆVBD”å””åBƒ’åTÄÂÂWFõö6Æ÷6UögFW%öÖ–çWFW2”åBåTÄÂÂ6†V6¶÷WEöw&6UöÖ–çWFW2”åBåTÄÂÂ—5ö7F—fRD”å””åBƒ’äõBåTÄÂDTdTÅBÂ7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÂWFFVEöBDDUD”ÔRåTÄÂDTdTÅBåTÄÂôâUDDR5U%$TåEõD”ÔU5DÕÂ”äDU‚–G…÷Ww&õ÷W6W"‡W6W%ö–BÆ—5ö7F—fR’’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E26†–gEö76–væÖVçEöVF—B†–B$”t”åBUDõô”ä5$TÔTåB$”Ô%’´U’ÂW6W%ö–B”åBäõBåTÄÂÂ6†–gEö–B”åBåTÄÂÂg&öÕö¦FFRd$4„"ƒ’åTÄÂÂFõö¦FFRd$4„"ƒ’åTÄÂÂ7F–öâd$4„"ƒ3’äõBåTÄÂÂ7F÷%ö–B”åBåTÄÂÂæ÷FRDU…BåTÄÂÂ7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÂ”äDU‚–G…÷6÷W6W%÷F–ÖR‡W6W%ö–BÆ7&VFVEöB’’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2GFVæFæ6U÷&V6Æ7VÆFUöÆöw2†–B$”t”åBUDõô”ä5$TÔTåB$”Ô%’´U’ÂW6W%ö–B”åBåTÄÂÂg&öÕö¦FFRd$4„"ƒ’åTÄÂÂFõö¦FFRd$4„"ƒ’åTÄÂÂ&÷w5ö6÷VçB”åBäõBåTÄÂDTdTÅBÂ7F÷%ö–B”åBåTÄÂÂ7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÂ”äDU‚–G…÷&V6Æ5÷W6W%÷F–ÖR‡W6W%ö–BÆ7&VFVEöB’’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²–b†gVæ7F–öåöW†—7G2‚u÷†6Se÷6WBr’’²÷†6Se÷6WB‚w6—FU÷fW'6–öârÂ4•DUõdU%4”ôâ“²÷†6Se÷6WB‚v÷fW'6–öârÂõdU%4”ôâ“²÷†6Se÷6WB‚vF%÷Ww&FU÷fW'6–öârÂw†6Sr×'CrÓããr“²ÒÒ6F6‚…F‡&÷v&ÆRFR’·Ð§Ð¦gVæ7F–öâ÷†6Swuö6ÆVå÷F–ÖR‚Gb—²Gc×G&–Ò‚‡7G&–ær’Gb“²&WGW&â&VuöÖF6‚‚rõåÆG³Ã'Ó¥ÆG³'ÒòrÂGb’ò7V'7G"‚GbÃÃR’âs£r¢çVÆÃ²Ð¦gVæ7F–öâ÷†6Swuö–çEö÷%öçVÆÂ‚Gb—²&WGW&â‚GbÓÓÒrrÇÂGbÓÓÒçVÆÂ’òçVÆÂ¢Ö‚ƒÂ†–çB’Gb“²Ð¦gVæ7F–öâ÷†6Swuö&ööÅö÷%öçVÆÂ‚Gb—²&WGW&â‚GbÓÓÒrrÇÂGbÓÓÒçVÆÂ’òçVÆÂ¢‚V×G’‚Gb’ò¢“²Ð¦gVæ7F–öâ÷†6Swu÷W6W%÷'VÆU÷–ÆöB‚F"—°¢F6öÇ2Ò°¢wF—FÆRsÓæ—76WB‚F%²wF—FÆRuÒ“÷7V'7G"‚‡7G&–ær’F%²wF—FÆRuÒÃÃc“¦çVÆÂÀ¢vGWG•öÖ–çWFW2sÓå÷†6Swuö–çEö÷%öçVÆÂ‚F%²vGWG•öÖ–çWFW2uÓóöçVÆÂ’À¢v÷fW'F–ÖUöÆ–Ö—EöÖ–çWFW2sÓå÷†6Swuö–çEö÷%öçVÆÂ‚F%²v÷fW'F–ÖUöÆ–Ö—EöÖ–çWFW2uÓóöçVÆÂ’À¢w7W'ÇW5ögFW%öÖ–çWFW2sÓå÷†6Swuö–çEö÷%öçVÆÂ‚F%²w7W'ÇW5ögFW%öÖ–çWFW2uÓóöçVÆÂ’À¢væ–v‡E÷7F'BsÓæ—76WB‚F%²væ–v‡E÷7F'BuÒ“õ÷†6Swuö6ÆVå÷F–ÖR‚F%²væ–v‡E÷7F'BuÒ“¦çVÆÂÀ¢væ–v‡EöVæBsÓæ—76WB‚F%²væ–v‡EöVæBuÒ“õ÷†6Swuö6ÆVå÷F–ÖR‚F%²væ–v‡EöVæBuÒ“¦çVÆÂÀ¢vWFõ÷6†–gEöVæ&ÆVBsÓæ'&•ö¶W•öW†—7G2‚vWFõ÷6†–gEöVæ&ÆVBrÂF"“õ÷†6Swuö&ööÅö÷%öçVÆÂ‚F%²vWFõ÷6†–gEöVæ&ÆVBuÒ“¦çVÆÂÀ¢v6†V6¶–åöç•÷F–ÖRsÓæ'&•ö¶W•öW†—7G2‚v6†V6¶–åöç•÷F–ÖRrÂF"“õ÷†6Swuö&ööÅö÷%öçVÆÂ‚F%²v6†V6¶–åöç•÷F–ÖRuÒ“¦çVÆÂÀ¢vÆÆ÷vVEö6†V6¶–åög&öÒsÓæ—76WB‚F%²vÆÆ÷vVEö6†V6¶–åög&öÒuÒ“õ÷†6Swuö6ÆVå÷F–ÖR‚F%²vÆÆ÷vVEö6†V6¶–åög&öÒuÒ“¦çVÆÂÀ¢vÆÆ÷vVEö6†V6¶–å÷FòsÓæ—76WB‚F%²vÆÆ÷vVEö6†V6¶–å÷FòuÒ“õ÷†6Swuö6ÆVå÷F–ÖR‚F%²vÆÆ÷vVEö6†V6¶–å÷FòuÒ“¦çVÆÂÀ¢wv&åö&Vf÷&Uö÷fW'F–ÖUö6öÖ–çWFW2sÓå÷†6Swuö–çEö÷%öçVÆÂ‚F%²wv&åö&Vf÷&Uö÷fW'F–ÖUö6öÖ–çWFW2uÓóöçVÆÂ’À¢w&WV—&Uö6†V6¶÷WEögFW%ö6sÓæ'&•ö¶W•öW†—7G2‚w&WV—&Uö6†V6¶÷WEögFW%ö6rÂF"“õ÷†6Swuö&ööÅö÷%öçVÆÂ‚F%²w&WV—&Uö6†V6¶÷WEögFW%ö6uÒ“¦çVÆÂÀ¢væ–v‡Eö6Æ2sÓæ'&•ö¶W•öW†—7G2‚væ–v‡Eö6Æ2rÂF"“õ÷†6Swuö&ööÅö÷%öçVÆÂ‚F%²væ–v‡Eö6Æ2uÒ“¦çVÆÂÀ¢vg&–F•ö6Æ2sÓæ'&•ö¶W•öW†—7G2‚vg&–F•ö6Æ2rÂF"“õ÷†6Swuö&ööÅö÷%öçVÆÂ‚F%²vg&–F•ö6Æ2uÒ“¦çVÆÂÀ¢v†öÆ–F•ö6Æ2sÓæ'&•ö¶W•öW†—7G2‚v†öÆ–F•ö6Æ2rÂF"“õ÷†6Swuö&ööÅö÷%öçVÆÂ‚F%²v†öÆ–F•ö6Æ2uÒ“¦çVÆÂÀ¢v–æ6ÇVFUög&–F•ö–åöGWG’sÓæ'&•ö¶W•öW†—7G2‚v–æ6ÇVFUög&–F•ö–åöGWG’rÂF"“õ÷†6Swuö&ööÅö÷%öçVÆÂ‚F%²v–æ6ÇVFUög&–F•ö–åöGWG’uÒ“¦çVÆÂÀ¢v–æ6ÇVFUö†öÆ–F•ö–åöGWG’sÓæ'&•ö¶W•öW†—7G2‚v–æ6ÇVFUö†öÆ–F•ö–åöGWG’rÂF"“õ÷†6Swuö&ööÅö÷%öçVÆÂ‚F%²v–æ6ÇVFUö†öÆ–F•ö–åöGWG’uÒ“¦çVÆÂÀ¢vÖ…ö÷Vå÷6W76–öåöÖ–çWFW2sÓå÷†6Swuö–çEö÷%öçVÆÂ‚F%²vÖ…ö÷Vå÷6W76–öåöÖ–çWFW2uÓóöçVÆÂ’À¢vWFõö6Æ÷6UöVæ&ÆVBsÓæ'&•ö¶W•öW†—7G2‚vWFõö6Æ÷6UöVæ&ÆVBrÂF"“õ÷†6Swuö&ööÅö÷%öçVÆÂ‚F%²vWFõö6Æ÷6UöVæ&ÆVBuÒ“¦çVÆÂÀ¢vWFõö6Æ÷6UögFW%öÖ–çWFW2sÓå÷†6Swuö–çEö÷%öçVÆÂ‚F%²vWFõö6Æ÷6UögFW%öÖ–çWFW2uÓóöçVÆÂ’À¢v6†V6¶÷WEöw&6UöÖ–çWFW2sÓå÷†6Swuö–çEö÷%öçVÆÂ‚F%²v6†V6¶÷WEöw&6UöÖ–çWFW2uÓóöçVÆÂ’À¢v—5ö7F—fRsÓæ'&•ö¶W•öW†—7G2‚v—5ö7F—fRrÂF"“ò‚V×G’‚F%²v—5ö7F—fRuÒ“ó£“£À¢Ó°¢&WGW&âF6öÇ3°§Ð§&÷WFR‚ttUBrÂrö’öFÖ–â÷'VÆRÖVæv–æR÷W6W"Ö÷fW'&–FW2rÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6SwuöVç7W&R‚“°¢GV–CÒ†–çB’‚EôtUE²wW6W%ö–BuÓóó“²F&w3ÕµÓ²Gv†W&SÒsÓs°¢–b‚GV–Cã—²Gv†W&SÒwRæ–CÓòs²F&w5µÓÒGV–C·Ð¢&WGW&âF#£¦ÆÂ‚%4TÄT5BRæ–BW6W%ö–BÂ4ôä4B‡Ræf—'7EöæÖRÂrrÇRæÆ7EöæÖR’W6W%öæÖRÂ"çF—FÆR&öÆU÷F—FÆRÂòâ ¢e$ôÒW6W'2RÄTeB¤ô”â&öÆW2"ôâ"æ–C×Rç&öÆUö–BÄTeB¤ô”âW6W%÷v÷&µ÷'VÆUö÷fW'&–FW2òôâòçW6W%ö–C×Ræ–@¢t„U$RGv†W&Rõ$DU"%’RæÆ7EöæÖRÇRæf—'7EöæÖRÄ”Ô•BS"ÂF&w2“°§ÒÂfÇ6RÂDÔ”â“°§&÷WFR‚uUBrÂrö’öFÖ–â÷'VÆRÖVæv–æR÷W6W"Ö÷fW'&–FW2÷·W6W%ö–GÒrÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6SwuöVç7W&R‚“²GV–CÒ†–çB’G²wW6W%ö–BuÓ²–b‚GV–B’‡GG£¦W'&÷"‚}ªŠ}‹Š‹˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÃC“°¢–b‚F#£¦öæR‚%4TÄT5B–Be$ôÒW6W'2t„U$R–CÓò"Å²GV–EÒ’’‡GG£¦W'&÷"‚}ªŠ}‹Š‹¸ÍŠ}˜Š¢˜m‹MŠòrÃCB“°¢F3Õ÷†6Swu÷W6W%÷'VÆU÷–ÆöB‚F"“°¢F#£§'Vâ‚$”å4U%B”åDòW6W%÷v÷&µ÷'VÆUö÷fW'&–FW2‡W6W%ö–BÇF—FÆRÆGWG•öÖ–çWFW2Æ÷fW'F–ÖUöÆ–Ö—EöÖ–çWFW2Ç7W'ÇW5ögFW%öÖ–çWFW2Ææ–v‡E÷7F'BÆæ–v‡EöVæBÆWFõ÷6†–gEöVæ&ÆVBÆ6†V6¶–åöç•÷F–ÖRÆÆÆ÷vVEö6†V6¶–åög&öÒÆÆÆ÷vVEö6†V6¶–å÷FòÇv&åö&Vf÷&Uö÷fW'F–ÖUö6öÖ–çWFW2Ç&WV—&Uö6†V6¶÷WEögFW%ö6Ææ–v‡Eö6Æ2Æg&–F•ö6Æ2Æ†öÆ–F•ö6Æ2Æ–æ6ÇVFUög&–F•ö–åöGWG’Æ–æ6ÇVFUö†öÆ–F•ö–åöGWG’ÆÖ…ö÷Vå÷6W76–öåöÖ–çWFW2ÆWFõö6Æ÷6UöVæ&ÆVBÆWFõö6Æ÷6UögFW%öÖ–çWFW2Æ6†V6¶÷WEöw&6UöÖ–çWFW2Æ—5ö7F—fR¢dÅTU2ƒòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃò¢ôâEUÄ”4DR´U’UDDRF—FÆSÕdÅTU2‡F—FÆR’ÂGWG•öÖ–çWFW3ÕdÅTU2†GWG•öÖ–çWFW2’Â÷fW'F–ÖUöÆ–Ö—EöÖ–çWFW3ÕdÅTU2†÷fW'F–ÖUöÆ–Ö—EöÖ–çWFW2’Â7W'ÇW5ögFW%öÖ–çWFW3ÕdÅTU2‡7W'ÇW5ögFW%öÖ–çWFW2’Âæ–v‡E÷7F'CÕdÅTU2†æ–v‡E÷7F'B’Âæ–v‡EöVæCÕdÅTU2†æ–v‡EöVæB’ÂWFõ÷6†–gEöVæ&ÆVCÕdÅTU2†WFõ÷6†–gEöVæ&ÆVB’Â6†V6¶–åöç•÷F–ÖSÕdÅTU2†6†V6¶–åöç•÷F–ÖR’ÂÆÆ÷vVEö6†V6¶–åög&öÓÕdÅTU2†ÆÆ÷vVEö6†V6¶–åög&öÒ’ÂÆÆ÷vVEö6†V6¶–å÷FóÕdÅTU2†ÆÆ÷vVEö6†V6¶–å÷Fò’Âv&åö&Vf÷&Uö÷fW'F–ÖUö6öÖ–çWFW3ÕdÅTU2‡v&åö&Vf÷&Uö÷fW'F–ÖUö6öÖ–çWFW2’Â&WV—&Uö6†V6¶÷WEögFW%ö6ÕdÅTU2‡&WV—&Uö6†V6¶÷WEögFW%ö6’Âæ–v‡Eö6Æ3ÕdÅTU2†æ–v‡Eö6Æ2’Âg&–F•ö6Æ3ÕdÅTU2†g&–F•ö6Æ2’Â†öÆ–F•ö6Æ3ÕdÅTU2††öÆ–F•ö6Æ2’Â–æ6ÇVFUög&–F•ö–åöGWG“ÕdÅTU2†–æ6ÇVFUög&–F•ö–åöGWG’’Â–æ6ÇVFUö†öÆ–F•ö–åöGWG“ÕdÅTU2†–æ6ÇVFUö†öÆ–F•ö–åöGWG’’ÂÖ…ö÷Vå÷6W76–öåöÖ–çWFW3ÕdÅTU2†Ö…ö÷Vå÷6W76–öåöÖ–çWFW2’ÂWFõö6Æ÷6UöVæ&ÆVCÕdÅTU2†WFõö6Æ÷6UöVæ&ÆVB’ÂWFõö6Æ÷6UögFW%öÖ–çWFW3ÕdÅTU2†WFõö6Æ÷6UögFW%öÖ–çWFW2’Â6†V6¶÷WEöw&6UöÖ–çWFW3ÕdÅTU2†6†V6¶÷WEöw&6UöÖ–çWFW2’Â—5ö7F—fSÕdÅTU2†—5ö7F—fR’"À¢²GV–BÂF5²wF—FÆRuÒÂF5²vGWG•öÖ–çWFW2uÒÂF5²v÷fW'F–ÖUöÆ–Ö—EöÖ–çWFW2uÒÂF5²w7W'ÇW5ögFW%öÖ–çWFW2uÒÂF5²væ–v‡E÷7F'BuÒÂF5²væ–v‡EöVæBuÒÂF5²vWFõ÷6†–gEöVæ&ÆVBuÒÂF5²v6†V6¶–åöç•÷F–ÖRuÒÂF5²vÆÆ÷vVEö6†V6¶–åög&öÒuÒÂF5²vÆÆ÷vVEö6†V6¶–å÷FòuÒÂF5²wv&åö&Vf÷&Uö÷fW'F–ÖUö6öÖ–çWFW2uÒÂF5²w&WV—&Uö6†V6¶÷WEögFW%ö6uÒÂF5²væ–v‡Eö6Æ2uÒÂF5²vg&–F•ö6Æ2uÒÂF5²v†öÆ–F•ö6Æ2uÒÂF5²v–æ6ÇVFUög&–F•ö–åöGWG’uÒÂF5²v–æ6ÇVFUö†öÆ–F•ö–åöGWG’uÒÂF5²vÖ…ö÷Vå÷6W76–öåöÖ–çWFW2uÒÂF5²vWFõö6Æ÷6UöVæ&ÆVBuÒÂF5²vWFõö6Æ÷6UögFW%öÖ–çWFW2uÒÂF5²v6†V6¶÷WEöw&6UöÖ–çWFW2uÒÂF5²v—5ö7F—fRuÕÒ“°¢&WGW&â²vö²sÓçG'VRÂw&÷rsÓäF#£¦öæR‚%4TÄT5B¢e$ôÒW6W%÷v÷&µ÷'VÆUö÷fW'&–FW2t„U$RW6W%ö–CÓò"Å²GV–EÒ•Ó°§ÒÂfÇ6RÂDÔ”â“°§&÷WFR‚tDTÄUDRrÂrö’öFÖ–â÷'VÆRÖVæv–æR÷W6W"Ö÷fW'&–FW2÷·W6W%ö–GÒrÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6SwuöVç7W&R‚“²F#£§'Vâ‚$DTÄUDRe$ôÒW6W%÷v÷&µ÷'VÆUö÷fW'&–FW2t„U$RW6W%ö–CÓò"Å²†–çB’G²wW6W%ö–BuÕÒ“²&WGW&â²vö²sÓçG'VUÓ°§ÒÂfÇ6RÂDÔ”â“°§&÷WFR‚ttUBrÂrö’öFÖ–â÷6†–gB×Æææ–æröF–væ÷7F–72rÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6SwuöVç7W&R‚“°¢F÷fW&Æ2ÒF#£¦ÆÂ‚%4TÄT5BçW6W%ö–BÂ4ôä4B‡Ræf—'7EöæÖRÂrrÇRæÆ7EöæÖR’W6W%öæÖRÂç6†–gEö–B6†–gEöÂ6çF—FÆR6†–gEö÷F—FÆRÂæg&öÕö¦FFRög&öÒÂçFõö¦FFR÷FòÂ"ç6†–gEö–B6†–gEö"Â6"çF—FÆR6†–gEö%÷F—FÆRÂ"æg&öÕö¦FFR%ög&öÒÂ"çFõö¦FFR%÷Fð¢e$ôÒW6W%÷6†–gG2¤ô”âW6W%÷6†–gG2"ôâ"çW6W%ö–CÖçW6W%ö–BäB"ç6†–gEö–CÃæç6†–gEö–@¢ÄTeB¤ô”âW6W'2RôâRæ–CÖçW6W%ö–BÄTeB¤ô”â6†–gG26ôâ6æ–CÖç6†–gEö–BÄTeB¤ô”â6†–gG26"ôâ6"æ–CÖ"ç6†–gEö–@¢t„U$R4ôÄU44R†æg&öÕö¦FFRÂsÓÓr’ÃÒ4ôÄU44R†"çFõö¦FFRÂs“““’Ó"Ó3r’äB4ôÄU44R†çFõö¦FFRÂs“““’Ó"Ó3r’ãÒ4ôÄU44R†"æg&öÕö¦FFRÂsÓÓr¢õ$DU"%’çW6W%ö–BÄ”Ô•B#"“°¢F&E&÷BÒF#£¦ÆÂ‚%4TÄT5B–BÇF—FÆRe$ôÒ6†–gG2t„U$RG—SÒw&÷FF–ærräB†Gfæ6VB•2åTÄÂõ"¥4ôåôU…E$5B†Gfæ6VBÂrBç&÷FF–öâæ7–6ÆU÷7F'Eö¦FFRr’•2åTÄÂ’Ä”Ô•B"“°¢F÷VâÒF#£¦ÆÂ‚%4TÄT5B6æ–BÇ6çW6W%ö–BÄ4ôä4B‡Ræf—'7EöæÖRÂrrÇRæÆ7EöæÖR’W6W%öæÖRÇ6æ6†V6µö–âÅD”ÔU5DÕD”db„Ô”åUDRÇ6æ6†V6µö–âÄäõr‚’’÷VåöÖ–çWFW0¢e$ôÒ7FfeöGFVæFæ6R6¤ô”âW6W'2RôâRæ–C×6çW6W%ö–Bt„U$R6æ6†V6µö÷WB•2åTÄÂõ$DU"%’6æ6†V6µö–âÄ”Ô•B#"“°¢f÷&V6‚‚F÷Vâ2bG"—²G6ƒÕöWFõ÷6†–gEöf÷%÷W6W"‚†–çB’G%²wW6W%ö–BuÒ“²G%²vÖ…ö÷Vå÷6W76–öåöÖ–çWFW2uÓÒ†–çB’‚G6…²vÖ…ö÷Vå÷6W76–öåöÖ–çWFW2uÓóó“c“²G%²wFöõöÆöæruÓÒ‚†–çB’G%²v÷VåöÖ–çWFW2uÓâG%²vÖ…ö÷Vå÷6W76–öåöÖ–çWFW2uÒ“ó£²Ð¢Fæõ'VÆW2ÒF#£¦ÆÂ‚%4TÄT5BRæ–BW6W%ö–BÂ4ôä4B‡Ræf—'7EöæÖRÂrrÇRæÆ7EöæÖR’W6W%öæÖRÂ"çF—FÆR&öÆU÷F—FÆRe$ôÒW6W'2RÄTeB¤ô”â&öÆW2"ôâ"æ–C×Rç&öÆUö–Bt„U$RRæ—5ö7F—fSÓäB"æ¶W–•2äõBåTÄÂäBäõBU„•5E2…4TÄT5Be$ôÒ&öÆU÷v÷&µ÷'VÆW2'"t„U$R'"ç&öÆUö¶W“×"æ¶W–’Ä”Ô•B#"“°¢&WGW&â²v÷fW&Æ2sÓâF÷fW&Æ2Âw&÷FF–æu÷v—F†÷WE÷7F'BsÓâF&E&÷BÂv÷Vå÷6W76–öç2sÓâF÷VâÂwW6W'5÷v—F†÷WEöW†7E÷&öÆU÷'VÆRsÓâFæõ'VÆW2Âw6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôåÓ°§ÒÂfÇ6RÂDÔ”â“°¦gVæ7F–öâ÷†6Swuö6Æ5öf÷%öGFVæFæ6U÷&÷r‚G&÷r—°¢–b†V×G’‚G&÷u²v6†V6µö–âuÒ’’&WGW&âçVÆÃ°¢²Fw’ÂFvÒÂFvEÓÕ²†–çB–FFR‚u’rÇ7G'F÷F–ÖR‚G&÷u²v6†V6µö–âuÒ’’Â†–çB–FFR‚vârÇ7G'F÷F–ÖR‚G&÷u²v6†V6µö–âuÒ’’Â†–çB–FFR‚v¢rÇ7G'F÷F–ÖR‚G&÷u²v6†V6µö–âuÒ’•Ó°¢²F§’ÂF¦ÒÂF¦EÓÖw&Vv÷&–å÷Fõö¦ÆÆ’‚Fw’ÂFvÒÂFvB“²F¦FFS×7&–çFb‚rSFBÒS&BÒS&BrÂF§’ÂF¦ÒÂF¦B“°¢G6†–gCÕö7F—fU÷W6W%÷6†–gEö76–væÖVçB‚†–çB’G&÷u²wW6W%ö–BuÒÂF¦FFR“°¢FG#Ò‚G6†–gBbb‚‚G6†–gE²wG—RuÓóòrr“ÓÓÒvGfæ6VBr’’ò÷6†–gEöF•÷&÷r‚G6†–gE²w6†–gEö–BuÓóòG6†–gE²v–BuÒÂF¦FFR’¢çVÆÃ°¢F†öÃÕ6†–gD6Æ3£¦VffV7F—fT†öÆ–F’‚F¦FFR“°¢G6W74–ã×7G'F÷F–ÖR‚G&÷u²v6†V6µö–âuÒ“²G6W74÷WCÒV×G’‚G&÷u²v6†V6µö÷WBuÒ“÷7G'F÷F–ÖR‚G&÷u²v6†V6µö÷WBuÒ“§F–ÖR‚“°¢G6W73Õµ²v–âsÓâG6W74–âÂv÷WBsÓâG6W74÷WBÂvw5ö–çfÆ–BsÓåöw5÷v÷&µö–çfÆ–Eö–çFW'fÇ2‚†–çB’G&÷u²wW6W%ö–BuÒÂG6W74–âÂG6W74÷WBÆV×G’‚G&÷u²v6†V6µö÷WBuÒ’•ÕÓ°¢&WGW&â6†–gD6Æ3£¦F•v÷&²‚G6†–gBÂF¦FFRÂFG"ÂG6W72ÂF†öÂ“°§Ð§&÷WFR‚uõ5BrÂrö’öFÖ–âöGFVæFæ6R÷&V6Æ7VÆFRrÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6SwuöVç7W&R‚“°¢GV–CÒ†–çB’‚F%²wW6W%ö–BuÓóó“²Fg&öÓ×7G%÷&WÆ6R‚ròrÂrÒrÇG&–Ò‚‡7G&–ær’‚F%²vg&öÒuÓóòrr’’“²GFó×7G%÷&WÆ6R‚ròrÂrÒrÇG&–Ò‚‡7G&–ær’‚F%²wFòuÓóòrr’’“°¢–b‚Fg&ö×ÇÂGFò’‡GG£¦W'&÷"‚}ŠŠ}‹-˜rŠ­Š}‹¸ÍŠâ˜]‹MŠí‹R˜m¸Í‹=Š¢rÃC“°¢²G7F'EÓÕöGFVæFæ6UöF•ö&÷VæG2‚Fg&öÒ“²²ÂFVæEÓÕöGFVæFæ6UöF•ö&÷VæG2‚GFò“²–b‚G7F'GÇÂFVæB’‡GG£¦W'&÷"‚}ŠŠ}‹-˜rŠ­Š}‹¸ÍŠâ˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÃC#"“°¢F&w3Õ²FVæBÂG7F'EÓ²Gv†W&SÒ&6†V6µö–âÂòäB4ôÄU44R†6†V6µö÷WBÄäõr‚’’âò#°¢–b‚GV–Cã—²Gv†W&RãÒ"äBW6W%ö–CÓò#²F&w5µÓÒGV–C·Ð¢G&÷w3ÔF#£¦ÆÂ‚%4TÄT5B–BÇW6W%ö–BÆ6†V6µö–âÆ6†V6µö÷WBe$ôÒ7FfeöGFVæFæ6Rt„U$RGv†W&Rõ$DU"%’–B"ÂF&w2“°¢FãÓ°¢f÷&V6‚‚G&÷w22G"—²G'—²F6Æ3Õ÷†6Swuö6Æ5öf÷%öGFVæFæ6U÷&÷r‚G"“²F#£§'Vâ‚%UDDR7FfeöGFVæFæ6R4UB6Æ5ö§6öãÓòt„U$R–CÓò"Å¶§6öåöVæ6öFR‚F6Æ2Ä¥4ôåõTäU44TEõTä”4ôDR’ÂG%²v–BuÕÒ“²Fâ²³²Ö6F6‚…F‡&÷v&ÆRFR—·ÒÐ¢G'—´F#£§'Vâ‚$”å4U%B”åDòGFVæFæ6U÷&V6Æ7VÆFUöÆöw2‡W6W%ö–BÆg&öÕö¦FFRÇFõö¦FFRÇ&÷w5ö6÷VçBÆ7F÷%ö–B’dÅTU2ƒòÃòÃòÃòÃò’"Å²GV–Có¦çVÆÂÂFg&öÒÂGFòÂFâÂGU²v–BuÓóöçVÆÅÒ“·Ö6F6‚…F‡&÷v&ÆRFR—·Ð¢&WGW&â²vö²sÓçG'VRÂw&÷w5ö6÷VçBsÓâFâÂvg&öÒsÓâFg&öÒÂwFòsÓâGFõÓ°§ÒÂfÇ6RÂDÔ”â“°§&÷WFR‚uõ5BrÂrö’öFÖ–âöGFVæFæ6RöWFòÖ6Æ÷6RÖ÷Vâ×6W76–öç2rÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6SwuöVç7W&R‚“°¢FG'“ÒV×G’‚F%²vG'•÷'VâuÒ“²F6Æ÷6VCÕµÓ°¢G&÷w3ÔF#£¦ÆÂ‚%4TÄT5B–BÇW6W%ö–BÆ6†V6µö–âÆÆ–æUö–Be$ôÒ7FfeöGFVæFæ6Rt„U$R6†V6µö÷WB•2åTÄÂõ$DU"%’6†V6µö–âÄ”Ô•BS"“°¢f÷&V6‚‚G&÷w22G"—°¢G6†–gCÕöWFõ÷6†–gEöf÷%÷W6W"‚†–çB’G%²wW6W%ö–BuÒ“°¢–b†V×G’‚G6†–gE²vWFõö6Æ÷6UöVæ&ÆVBuÒ’’6öçF–çVS°¢FgFW#Ò†–çB’‚G6†–gE²vWFõö6Æ÷6UögFW%öÖ–çWFW2uÓóó“²–b‚FgFW#ÃÓ’FgFW#Ò†–çB’‚G6†–gE²vÖ…ö÷Vå÷6W76–öåöÖ–çWFW2uÓóó“c“°¢F6†V6´–ã×7G'F÷F–ÖR‚G%²v6†V6µö–âuÒ“²–b‚F6†V6´–âÇÂF–ÖR‚’ÒF6†V6´–âÂFgFW"£c’6öçF–çVS°¢F÷WCÖFFR‚u’ÖÒÖBƒ¦“§2rÂF6†V6´–â²FgFW"£c“°¢–b‚FG'’—²F#£§'Vâ‚%UDDR7FfeöGFVæFæ6R4UB6†V6µö÷WCÓòÂÖWF†öCÔ4ôä4B„4ôÄU44R†ÖWF†öBÂrr’ÂwÆWFõö6Æ÷6Rr’t„U$R–CÓòäB6†V6µö÷WB•2åTÄÂ"Å²F÷WBÂG%²v–BuÕÒ“²G'—²F6Æ3Õ÷†6Swuö6Æ5öf÷%öGFVæFæ6U÷&÷r…²v–BsÓâG%²v–BuÒÂwW6W%ö–BsÓâG%²wW6W%ö–BuÒÂv6†V6µö–âsÓâG%²v6†V6µö–âuÒÂv6†V6µö÷WBsÓâF÷WEÒ“²F#£§'Vâ‚%UDDR7FfeöGFVæFæ6R4UB6Æ5ö§6öãÓòt„U$R–CÓò"Å¶§6öåöVæ6öFR‚F6Æ2Ä¥4ôåõTäU44TEõTä”4ôDR’ÂG%²v–BuÕÒ“²Ö6F6‚…F‡&÷v&ÆRFR—·ÒÐ¢F6Æ÷6VEµÓÕ²v–BsÓâG%²v–BuÒÂwW6W%ö–BsÓâG%²wW6W%ö–BuÒÂv6†V6µö–âsÓâG%²v6†V6µö–âuÒÂvWFõö6†V6µö÷WBsÓâF÷WEÓ°¢Ð¢&WGW&â²vö²sÓçG'VRÂvG'•÷'VâsÓâFG'’Âv6Æ÷6VEö6÷VçBsÓæ6÷VçB‚F6Æ÷6VB’Âv—FV×2sÓâF6Æ÷6VEÓ°§ÒÂfÇ6RÂDÔ”â“°§&÷WFR‚ttUBrÂrö’öFÖ–â÷6†–gBÖ76–væÖVçBÖVF—BrÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6SwuöVç7W&R‚“²GV–CÒ†–çB’‚EôtUE²wW6W%ö–BuÓóó“²Gv†W&SÒsÓs²F&w3ÕµÓ²–b‚GV–B—²Gv†W&SÒvçW6W%ö–CÓòs²F&w5µÓÒGV–C·Ð¢&WGW&âF#£¦ÆÂ‚%4TÄT5Bâ¢Â4ôä4B‡Ræf—'7EöæÖRÂrrÇRæÆ7EöæÖR’W6W%öæÖRÂ2çF—FÆR6†–gE÷F—FÆRÂ4ôä4B†7F÷"æf—'7EöæÖRÂrrÆ7F÷"æÆ7EöæÖR’7F÷%öæÖRe$ôÒ6†–gEö76–væÖVçEöVF—BÄTeB¤ô”âW6W'2RôâRæ–CÖçW6W%ö–BÄTeB¤ô”âW6W'27F÷"ôâ7F÷"æ–CÖæ7F÷%ö–BÄTeB¤ô”â6†–gG22ôâ2æ–CÖç6†–gEö–Bt„U$RGv†W&Rõ$DU"%’æ–BDU42Ä”Ô•BS"ÂF&w2“°§ÒÂfÇ6RÂDÔ”â“°§&÷WFR‚ttUBrÂrö’öFÖ–â÷†6Sr×'Cr÷7FGW2rÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6SwuöVç7W&R‚“°¢&WGW&â²w6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôâÂw†6RsÓãrÂw'BsÓãrÂw&VÆV6UöæÖRsÓâu†6RrãrÒ6†–gB66†VGVÆ–ærf–æÆ—¦F–öârÂv6ö×ÆWFVBsÓå°¢wW6W%÷7V6–f–5öWFõ÷6†–gEö÷fW'&–FW2rÂw6†–gEö76–væÖVçEö÷fW&ÆöwV&BrÂvGfæ6VEöF•ö6öæf–uöÆ–VE÷Fõö6Æ7VÆF–öârÂvWFõ÷6†–gEög&–F•ö†öÆ–F•öGWG•öfÆw2rÂvGFVæFæ6U÷&V6Æ7VÆFUö’rÂv÷Vå÷6W76–öåöWFõö6Æ÷6Uö’rÂw6†–gEöF–væ÷7F–75ö’rÂv76–væÖVçEöVF—E÷G&–ÂrÂwfW'6–öåóóórÂwWw&FU÷‡ö6öç6öÆ–FFVBp¢ÒÂw&VÖ–æ–ærsÓå°¢w&öGV7F–öåö'VæFÆU÷v—F†÷WEö'&÷w6W%ö&&VÂrÂvgVÆÅöFWf–6Uöf–VÆE÷FW7BrÂvWFöÖFVEö•÷FW7E÷7V—FRrÂvÆöE÷FW7Eööåöf–æÅ÷6W'fW"p¢ÕÓ°§ÒÂfÇ6RÂDÔ”â“°§&÷WFR‚ttUBrÂrö’÷&ö¦V7B×fW'6–öâ×cwrrÂgVæ7F–öâ‚GÂF"ÂGR—²&WGW&â²w6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôâÂw†6RsÓãrÂw'BsÓãrÂw&VÆV6UöæÖRsÓâu†6RrãrÒ6†–gB66†VGVÆ–ærf–æÆ—¦F–öâuÓ²ÒÂG'VR“° ¢òò†6Rrã’Òô5"›í˜MŠ}ª’Š­Š}ª‹=¸Â»»"ýŠ¢˜‚˜m‹˜]Š}˜N(Í‹=Š}‹-¸ÂªŠò˜]˜M¸Â˜Š}‹‹=¸Âý‹‹Š¸À§&÷WFR‚ttUBrÂrö’öFÖ–â÷†6Sr×'C’÷7FGW2rÂgVæ7F–öâ‚GÂF"ÂGR—°¢öVç7W&U÷ÆFU÷66å÷6×ÆW2‚“°¢F6÷VçG2ÒF#£¦öæR‚%4TÄT5B4õTåB‚¢’F÷FÂÂ5TÒ„44Rt„Tâ7&÷ö–ÖvU÷F‚•2äõBåTÄÂD„TâTÅ4RTäB’v—F…ö7&÷e$ôÒÆFU÷66å÷6×ÆW2"“°¢&WGW&â²w6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôâÂw†6RsÓãrÂw'BsÓã’Âw&VÆV6UöæÖRsÓâu†6Rrã’ÒF†’ÆFRô5"ÆV&æ–ærrÂv6ö×ÆWFVBsÓå°¢vf—†VE÷F†•÷ÆFU÷&Vv–öåó%öÆWGFW%÷FRrÂvF–v—EööæÇ•÷ÆFUöö7"rÂv‡VÖå÷fW&–f–VE÷ÆFU÷6×ÆW2rÂwÆFUö7&÷÷WÆöEöFF6WBrÂwW'6–åö&&–5öæF–öæÅö–Eöæ÷&ÖÆ—¦F–öârÂwÆFU÷6V&6…öæ÷&ÖÆ—¦F–öârÂwfW'6–öåóóó"rÂwWw&FU÷‡ö6öç6öÆ–FFVBp¢ÒÂwÆFU÷6×ÆW2sÓâF6÷VçG2ó¢²wF÷FÂsÓãÂwv—F…ö7&÷sÓãÕÓ°§ÒÂfÇ6RÂDÔ”â“°§&÷WFR‚ttUBrÂrö’÷&ö¦V7B×fW'6–öâ×cw’rÂgVæ7F–öâ‚GÂF"ÂGR—²&WGW&â²w6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôâÂw†6RsÓãrÂw'BsÓã’Âw&VÆV6UöæÖRsÓâu†6Rrã’ÒF†’ÆFRô5"ÆV&æ–æruÓ²ÒÂG'VR“°  §&÷WFR‚ttUBrÂrö’öFÖ–â÷†6Sr×'C÷7FGW2rÂgVæ7F–öâ‚GÂF"ÂGR—°¢G7BÒ÷ÆFUöÖöFVÅ÷7FGW5÷–ÆöB‚“°¢G7E²w†6RuÓÓs²G7E²w'BuÓÓ²G7E²w&VÆV6UöæÖRuÓÒu†6RrãÒ&öfW76–öæÂ&ÆR&÷BæBf÷&×2s°¢G7E²v6ö×ÆWFVBuÓÕ°¢wÆFU÷G&–æ–æu÷6×ÆU÷&Wf–Wu÷æVÂrÂwfW&–f–VE÷&V¦V7FVE÷VæF–æu÷6×ÆU÷v÷&¶fÆ÷rrÂw6W'fW%÷6–FU÷G&–æ–æuöÖæ–fW7EöW‡÷'BrÂw—F†öå÷&æFöÕöf÷&W7EöF–v—E÷G&–æ–æu÷—VÆ–æRrÂwG&–æVEöÖöFVÅ÷&Vv—7G'’rÂw6W'fW%÷6–FU÷ÆFU÷&VF–7F–öåöVæGö–çBrÂvÖö&–ÆU÷6W'fW%öÖöFVÅöfÆÆ&6²rÂwfW'6–öåóóóBrÂwWw&FU÷‡ö6öç6öÆ–FFVBp¢Ó°¢G7E²w&VÖ–æ–æruÓÕ°¢v6öÆÆV7E÷&VÅ÷ÆFU÷6×ÆW5ög&öÕöf–VÆBrÂwG&–åögFW%öVæ÷Vv…÷fW&–f–VE÷6×ÆW2rÂvWfÇVFUö67W&7•ööå÷&VÅöFWf–6W2p¢Ó°¢&WGW&âG7C°§ÒÂfÇ6RÂDÔ”â“°§&÷WFR‚ttUBrÂrö’÷&ö¦V7B×fW'6–öâ×cwrÂgVæ7F–öâ‚GÂF"ÂGR—²&WGW&â²w6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôâÂw†6RsÓãrÂw'BsÓãÂw&VÆV6UöæÖRsÓâu†6RrãÒ&öfW76–öæÂ&ÆR&÷BæBf÷&×2uÓ²ÒÂG'VR“°  §&÷WFR‚ttUBrÂrö’÷&ö¦V7B×fW'6–öâ×cwrÂgVæ7F–öâ‚GÂF"ÂGR—²&WGW&â²w6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôâÂw†6RsÓãrÂw'BsÓãÂw&VÆV6UöæÖRsÓâu†6RrãÒ&öfW76–öæÂ&ÆR&÷BæBf÷&×2uÓ²ÒÂG'VR“° §&÷WFR‚ttUBrÂrö’÷&ö¦V7B×fW'6–öâ×cw"rÂgVæ7F–öâ‚GÂF"ÂGR—°¢&WGW&â²w6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôâÂw†6RsÓãrÂw'BsÓã"Âw&VÆV6UöæÖRsÓâu†6Rrã"ÒVæ–f–VB&ÆRFVÆVw&ÒV—F&÷G2uÓ°§ÒÂG'VR“° §&÷WFR‚ttUBrÂrö’öFÖ–â÷†6Sr×'C"÷7FGW2rÂgVæ7F–öâ‚GÂF"ÂGR—°¢&WGW&â²w6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôâÂw†6RsÓãrÂw'BsÓã"Âw&VÆV6UöæÖRsÓâu†6Rrã"ÒVæ–f–VB&ÆRFVÆVw&ÒV—F&÷G2rÂv6ö×ÆWFVBsÓå°¢wFVÆVw&Õö&÷E÷vV&†öö²rÂvV—Fö&÷E÷vV&†öö²rÂw6†&VEöÖVçUö—FV×2rÂw6†&VEö7W7FöÕ÷&WÆ–W2rÂw6†&VEöf÷&×5öæE÷&Vv—7G&F–öârÂvæF–öæÅö6öFU÷&Vf–ÆÅöf÷%öÆÅö&÷G2rÂwÆFf÷&Õ÷7V6–f–5÷7V'67&–&W'2rÂwÆFf÷&Õ÷7V6–f–5öÆöw2rÂwÆFf÷&Õ÷7V6–f–5öf÷&Õ÷&Wf–Ww2rÂvÖW76VævW%ö‡V%öæ÷F–f–6F–öç2rÂw6WGF–æw5÷æVÅ÷ÆFf÷&Õ÷F'2rÂwfW'6–öåóóórrÂwWw&FU÷‡ö6öç6öÆ–FFVBp¢ÒÂw&VÖ–æ–ærsÓå°¢w&Vv—7FW%÷&VÅ÷FVÆVw&Õ÷vV&†ööµööå÷6W'fW"rÂw&Vv—7FW%÷&VÅöV—F÷vV&†ööµööå÷6W'fW"rÂvf–VÆE÷FW7EöÆÅ÷F‡&VUö&÷G5÷v—F…÷&VÅ÷Fö¶Vç2rÂwfW&–g•öV—Fö•ö&6Uö–e÷&÷f–FW%÷W6W5ö7W7FöÕövFWv’p¢ÕÓ°§ÒÂfÇ6RÂDÔ”â“° ¢ò¢ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐ¢¢†6Rrã2(	B6ö×ÆWFR7—7FVÒ†VÇF‚F6†&ö&@¢¢fW'6–öã¢6—FRRòããp¢¢ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒ¢ð¦gVæ7F–öâ÷†6Sw5÷F&ÆUöW†—7G2‚GF&ÆR—°¢GF&ÆRÒ&Vu÷&WÆ6R‚rõµæ×¤Õ£Ó•õÒòrÂrrÂ‡7G&–ær’GF&ÆR“°¢–b‚GF&ÆSÓÓÒrr’&WGW&âfÇ6S°¢G'’²&WGW&â†&ööÂ”F#£¦öæR‚u4„õrD$ÄU2Ä”´RòrÂ²GF&ÆUÒ“²Ò6F6‚…F‡&÷v&ÆRFR’²&WGW&âfÇ6S²Ð§Ð¦gVæ7F–öâ÷†6Sw5ö6÷VçB‚GF&ÆRÂGv†W&SÒsÓrÂF&w3ÕµÒ—°¢GF&ÆRÒ&Vu÷&WÆ6R‚rõµæ×¤Õ£Ó•õÒòrÂrrÂ‡7G&–ær’GF&ÆR“°¢–b‚GF&ÆSÓÓÒrrÇÂ÷†6Sw5÷F&ÆUöW†—7G2‚GF&ÆR’’&WGW&â°¢G'’²G#ÔF#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒGF&ÆVt„U$RGv†W&R"ÂF&w2“²&WGW&â†–çB’‚G%²vâuÒóò“²Ò6F6‚…F‡&÷v&ÆRFR’²&WGW&â²Ð§Ð¦gVæ7F–öâ÷†6Sw5öÆÂ‚G7ÂÂF&w3ÕµÒ—²G'’²&WGW&âF#£¦ÆÂ‚G7ÂÂF&w2“²Ò6F6‚…F‡&÷v&ÆRFR’²&WGW&âµÓ²ÒÐ¦gVæ7F–öâ÷†6Sw5ööæR‚G7ÂÂF&w3ÕµÒ—²G'’²&WGW&âF#£¦öæR‚G7ÂÂF&w2’ó¢µÓ²Ò6F6‚…F‡&÷v&ÆRFR’²&WGW&âµÓ²ÒÐ¦gVæ7F–öâ÷†6Sw5ö'—FW2‚Gb—²GcÒ‡7G&–ær’Gc²FãÒ†fÆöB’Gc²GVæ—C×7G'FöÆ÷vW"‡&Vu÷&WÆ6R‚rõµæ×¥Òö’rÂrrÂGb’“²–b‚GVæ—CÓÓÒvrwÇÂGVæ—CÓÓÒvv"r’Fâ£Ó#B£#B£#C²VÇ6V–b‚GVæ—CÓÓÒvÒwÇÂGVæ—CÓÓÒvÖ"r’Fâ£Ó#B£#C²VÇ6V–b‚GVæ—CÓÓÒv²wÇÂGVæ—CÓÓÒv¶"r’Fâ£Ó#C²&WGW&â†–çB’Fã²Ð¦gVæ7F–öâ÷†6Sw5ö6ö×öæVçB‚F¶W’ÂGF—FÆRÂG7FGW2ÂFÖW76vRÂFÖWFÕµÒ—²&WGW&â²v¶W’sÓâF¶W’ÂwF—FÆRsÓâGF—FÆRÂw7FGW2sÓâG7FGW2ÂvÖW76vRsÓâFÖW76vRÂvÖWFsÓâFÖWFÓ²Ð¦gVæ7F–öâ÷†6Sw5öVç7W&R‚—°¢G'’²–b†gVæ7F–öåöW†—7G2‚u÷†6SeöVç7W&U÷F&ÆW2r’’÷†6SeöVç7W&U÷F&ÆW2‚“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²–b†6Æ75öW†—7G2‚tÖW76VævW$&÷Br’’ÖW76VævW$&÷C£¦Vç7W&UF&ÆW2‚“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²–b†6Æ75öW†—7G2‚t&ÆT&÷Br’’&ÆT&÷C£¦Vç7W&U&õF&ÆW2‚“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E27—7FVÕö†VÇF…ö6†V6·2†–B$”t”åBUDõô”ä5$TÔTåB$”Ô%’´U’Â6†V6µö¶W’d$4„"ƒƒ’äõBåTÄÂÂ7FGW2d$4„"ƒ#’äõBåTÄÂDTdTÅBvö²rÂÖW76vRDU…BåTÄÂÂÖWF¥4ôâåTÄÂÂ6†V6¶VEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÂ”äDU‚–G…ö†VÇF…ö6†V6µö¶W•÷F–ÖR†6†V6µö¶W’Æ6†V6¶VEöB’Â”äDU‚–G…ö†VÇF…ö6†V6µ÷7FGW2‡7FGW2Æ6†V6¶VEöB’’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢G'’²F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E27—7FVÕö†VÇF…ö–æ6–FVçG2†–B$”t”åBUDõô”ä5$TÔTåB$”Ô%’´U’Â6†V6µö¶W’d$4„"ƒƒ’äõBåTÄÂÂ7FGW2d$4„"ƒ#’äõBåTÄÂÂF—FÆRd$4„"ƒ“’åTÄÂÂÖW76vRDU…BåTÄÂÂÖWF¥4ôâåTÄÂÂf—'7E÷6VVåöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÂÆ7E÷6VVåöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÂ&W6öÇfVEöBDDUD”ÔRåTÄÂÂ&W6öÇfVEö'’$”t”åBåTÄÂÂ&W6öÇWF–öåöæ÷FRDU…BåTÄÂÂ”äDU‚–G…÷6†•ö¶W•÷7FGW2†6†V6µö¶W’Ç7FGW2ÆÆ7E÷6VVåöB’Â”äDU‚–G…÷6†•÷&W6öÇfVB‡&W6öÇfVEöBÆÆ7E÷6VVåöB’’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð§Ð¦gVæ7F–öâ÷†6Sw5ö6öÆÆV7Eö†VÇF‚‚—°¢÷†6Sw5öVç7W&R‚“°¢F6ö×öæVçG3ÕµÓ²G7FG3ÕµÓ²Fæ÷sÖFFR‚u’ÖÒÖBƒ¦“§2r“° ¢FF$ö³ÖfÇ6S²FF$×6sÒ}Š}Š­‹]Š}˜BŠ‹˜-‹Š}‹Š}‹=Š¢s°¢G'’²F#£¦öæR‚u4TÄT5Br“²FF$ö³×G'VS²Ò6F6‚…F‡&÷v&ÆRFR—²FF$×6sÒFRÓævWDÖW76vR‚“²Ð¢F6ö×öæVçG5µÓÕ÷†6Sw5ö6ö×öæVçB‚vFF&6RrÂ}Šý¸ÍŠ­Š}Š¸Í‹2rÂFF$ö³òvö²s¢vW'&÷"rÂFF$×6rÅ°¢wW6W'2sÓå÷†6Sw5ö6÷VçB‚wW6W'2r’À¢v7F—fU÷W6W'2sÓå÷†6Sw5ö6÷VçB‚wW6W'2rÂv—5ö7F—fSÓr’À¢vG&—fW'2sÓå÷†6Sw5ö6÷VçB‚vG&—fW'2r’À¢vÆ–æW2sÓå÷†6Sw5ö6÷VçB‚wF†•öÆ–æW2r’ó¢÷†6Sw5ö6÷VçB‚vÆ–æW2r’À¢Ò“° ¢FF—'3Õ°¢wWÆöG2sÓåõôD•%õòâròââ÷V&Æ–2÷WÆöG2rÀ¢wÆFU÷G&–æ–ærsÓåõôD•%õòâròââ÷7F÷&vR÷ÆFU÷G&–æ–ærrÀ¢w‡÷V&Æ–2sÓåõôD•%õòâròââ÷V&Æ–2rÀ¢Ó°¢F&DF—'3ÕµÓ²FF—$ÖWFÕµÓ°¢f÷&V6‚‚FF—'22F³ÓâFB—²FF—$ÖWF²FµÓÕ²wF‚sÓâFBÂvW†—7G2sÓæ—5öF—"‚FB’Âww&—F&ÆRsÓæ—5öF—"‚FB“ö—5÷w&—F&ÆR‚FB“¦fÇ6UÓ²–b‚—5öF—"‚FB—ÇÂ—5÷w&—F&ÆR‚FB’’F&DF—'5µÓÒF³²Ð¢F6ö×öæVçG5µÓÕ÷†6Sw5ö6ö×öæVçB‚w7F÷&vRrÂ}˜]‹=¸Í‹˜}Š}¸Â‹Ší¸Í‹˜~(Í‹=Š}‹-¸ÂrÆV×G’‚F&DF—'2“òvö²s¢wv&æ–ærrÆV×G’‚F&DF—'2“ò}˜]‹=¸Í‹˜}Š}¸ÂŠ}‹]˜M¸Â˜-Š}Š˜B˜m˜‹MŠ­˜b˜}‹=Š­˜mŠòs¢}Š‹Ší¸Â˜]‹=¸Í‹˜}Šr˜-Š}Š˜B˜m˜‹MŠ­˜b˜m¸Í‹=Š­˜mŠòrÂFF—$ÖWF“° ¢G&WV—&VCÕ²wFõö×—7ÂrÂv7W&ÂrÂv§6öârÂvÖ'7G&–ærrÂv÷Vç76ÂrÂw¦—rÂw6–×ÆW†ÖÂrÂvvBuÓ°¢FÖ—76–æsÕµÓ²f÷&V6‚‚G&WV—&VB2FW‡B—²–b‚W‡FVç6–öåöÆöFVB‚FW‡B’’FÖ—76–æuµÓÒFW‡C²Ð¢F6ö×öæVçG5µÓÕ÷†6Sw5ö6ö×öæVçB‚w‡öW‡FVç6–öç2rÂ}Š}˜‹-˜˜m˜~(Í˜}Š}¸Â…rÆV×G’‚FÖ—76–ær“òvö²s¢wv&æ–ærrÆV×G’‚FÖ—76–ær“ò}Š}˜‹-˜˜m˜~(Í˜}Š}¸ÂŠ}‹]˜M¸Â˜‹Š}˜B˜}‹=Š­˜mŠòs¢}Š}˜‹-˜˜m˜~(Í˜}Š}¸Â˜mŠ}˜-‹S¢ræ–×ÆöFR‚rÂrÂFÖ—76–ær’Å²w‡sÓå…õdU%4”ôâÂvÖ—76–ærsÓâFÖ—76–ærÂwWÆöEöÖ‚sÓæ–æ•övWB‚wWÆöEöÖ…öf–ÆW6—¦Rr’Âw÷7EöÖ‚sÓæ–æ•övWB‚w÷7EöÖ…÷6—¦Rr’ÂvÖVÖ÷'•öÆ–Ö—BsÓæ–æ•övWB‚vÖVÖ÷'•öÆ–Ö—Br•Ò“°  ¢GæVÄ‡FÖÃÕõôD•%õòâròââ÷V&Æ–2÷æVÂæ‡FÖÂs°¢GæVÄ§3ÕõôD•%õòâròââ÷V&Æ–2ö76WG2÷æVÂæ'VæFÆRæ§2s°¢GæVÄ773ÕõôD•%õòâròââ÷V&Æ–2ö76WG2÷æVÂæ'VæFÆRæ772s°¢GæVÅFW‡CÖ—5öf–ÆR‚GæVÄ‡FÖÂ“ò‡7G&–ær”f–ÆUövWEö6öçFVçG2‚GæVÄ‡FÖÂ“¢rs°¢F†5'VçF–ÖT&&VÃÒ‡7G&—÷2‚GæVÅFW‡BÂwFW‡Bö&&VÂr’ÓÖfÇ6RÇÂ7G&—÷2‚GæVÅFW‡BÂv&&VÂæÖ–âæ§2r’ÓÖfÇ6RÇÂ7G&—÷2‚GæVÅFW‡BÂt&&VÂ÷7FæFÆöæRr’ÓÖfÇ6R“°¢F'VæFÆTö³Ö—5öf–ÆR‚GæVÄ§2’bbf–ÆW6—¦R‚GæVÄ§2“ãbb—5öf–ÆR‚GæVÄ772’bbf–ÆW6—¦R‚GæVÄ772“ã°¢F6ö×öæVçG5µÓÕ÷†6Sw5ö6ö×öæVçB‚wæVÅö'VæFÆRrÂt'V–ÆB›í˜m˜B‹=Š}¸ÍŠ¢rÂ‚F'VæFÆTö²bbF†5'VçF–ÖT&&VÂ“òvö²s¢vW'&÷"rÂ‚F'VæFÆTö²bbF†5'VçF–ÖT&&VÂ“ò}›í˜m˜BŠŠr'VæFÆRŠ­˜˜M¸ÍŠý¸ÂŠ}ŠÍ‹Šr˜]¸Î(Í‹M˜Šò˜‚&&VÂ˜]‹˜‹ªý‹ŠÝ‹˜‹MŠý˜rŠ}‹=Š¢s¢}›í˜m˜B˜}˜m˜‹"'VæFÆRªŠ}˜]˜B˜mŠýŠ}‹Šò¸ÍŠr&&VÂ˜]‹˜‹ªý‹Šý‹…DÔÂŠý¸ÍŠý˜r‹MŠòrÅ°¢wæVÅö‡FÖÅöW†—7G2sÓæ—5öf–ÆR‚GæVÄ‡FÖÂ’À¢v'VæFÆUö§5öW†—7G2sÓæ—5öf–ÆR‚GæVÄ§2’À¢v'VæFÆUö775öW†—7G2sÓæ—5öf–ÆR‚GæVÄ772’À¢v'VæFÆUö§5ö'—FW2sÓæ—5öf–ÆR‚GæVÄ§2“öf–ÆW6—¦R‚GæVÄ§2“£À¢v'VæFÆUö775ö'—FW2sÓæ—5öf–ÆR‚GæVÄ772“öf–ÆW6—¦R‚GæVÄ772“£À¢w'VçF–ÖUö&&VÅöFWFV7FVBsÓâF†5'VçF–ÖT&&VÂÀ¢Ò“° ¢FF—6´g&VSÔF—6µög&VU÷76R…õôD•%õò“²FF—6µF÷FÃÔF—6µ÷F÷FÅ÷76R…õôD•%õò“²Fg&VU7CÒ‚FF—6´g&VRbbFF—6µF÷FÂ“÷&÷VæB‚‚FF—6´g&VRòFF—6µF÷FÂ’£Ã“¦çVÆÃ°¢FF—6µ7FGW3Ò‚Fg&VU7BÓÖçVÆÂbbFg&VU7CÃ“òvW'&÷"s¢‚‚Fg&VU7BÓÖçVÆÂbbFg&VU7CÃ#“òwv&æ–ærs¢vö²r“°¢F6ö×öæVçG5µÓÕ÷†6Sw5ö6ö×öæVçB‚vF—6²rÂ}˜‹mŠ}¸ÂŠý¸Í‹=ª’rÂFF—6µ7FGW2ÂFg&VU7CÓÓÖçVÆÃò}Š}‹}˜MŠ}‹Š}Š¢Šý¸Í‹=ª’˜-Š}Š˜BŠí˜Š}˜mŠý˜b˜m¸Í‹=Š¢s¢}˜‹mŠ}¸ÂŠ-‹-Š}ŠòrâFg&VU7Bâ}š¢rÅ²vg&VUö'—FW2sÓâFF—6´g&VRÂwF÷FÅö'—FW2sÓâFF—6µF÷FÂÂvg&VU÷W&6VçBsÓâFg&VU7EÒ“° ¢FGÕ÷†6Sw5öÆÂ‚%4TÄT5B7FGW2Ä4õTåB‚¢’6÷VçBe$ôÒFVÆ—fW'•÷VWVRu$õU%’7FGW2"“°¢FGf–ÆVCÕ÷†6Sw5ö6÷VçB‚vFVÆ—fW'•÷VWVRrÂ'7FGW2”â‚vf–ÆVBrÂv6æ6VÆÆVBr’"“°¢FGVæF–ætöÆCÕ÷†6Sw5ö6÷VçB‚vFVÆ—fW'•÷VWVRrÂ'7FGW2”â‚wVæF–ærrÂwVWVVBr’äB7&VFVEöBÂDDUõ5T"„äõr‚’Â”åDU%dÂ3Ô”åUDR’"“°¢FFVCÕ÷†6Sw5ö6÷VçB‚vFVÆ—fW'•öFVEöÆWGFW'2r“°¢G7FGW3Ò‚FGf–ÆVB²FFVCã“òwv&æ–ærs¢vö²s²–b‚FGVæF–ætöÆCãS’G7FGW3ÒvW'&÷"s°¢F6ö×öæVçG5µÓÕ÷†6Sw5ö6ö×öæVçB‚vFVÆ—fW'•÷VWVRrÂ}‹]˜Š}‹‹=Š}˜B›í¸ÍŠ}˜^(Í˜}ŠrrÂG7FGW2Â-˜mŠ}˜]˜˜˜#¢FGf–ÆVBòFVBÖÆWGFW#¢FFVBò˜]‹‹}˜B˜-Šý¸Í˜]¸Ã¢FGVæF–ætöÆB"Å²v'•÷7FGW2sÓâFGÂvf–ÆVBsÓâFGf–ÆVBÂvFVEöÆWGFW'2sÓâFFVBÂvöÆE÷VæF–ærsÓâFGVæF–ætöÆEÒ“° ¢FöffÆ–æSÕ÷†6Sw5öÆÂ‚%4TÄT5B7FGW2Ä4õTåB‚¢’6÷VçBe$ôÒöffÆ–æU÷7–æ5öÆöw2u$õU%’7FGW2"“°¢FöffÆ–æTf–ÆVCÕ÷†6Sw5ö6÷VçB‚vöffÆ–æU÷7–æ5öÆöw2rÂ'7FGW2”â‚vf–ÆVBrÂv6öæfÆ–7Br’"“°¢FöffÆ–æUVæF–æsÕ÷†6Sw5ö6÷VçB‚vöffÆ–æU÷7–æ5öÆöw2rÂ'7FGW2”â‚wVæF–ærrÂw&V6V—fVBr’"“°¢F6ö×öæVçG5µÓÕ÷†6Sw5ö6ö×öæVçB‚vöffÆ–æU÷7–æ2rÂ}˜}˜]ªýŠ}˜^(Í‹=Š}‹-¸ÂŠ-˜˜MŠ}¸Í˜brÂFöffÆ–æTf–ÆVCãòwv&æ–ærs¢vö²rÂ-Š­‹Š}‹‹bý˜mŠ}˜]˜˜˜#¢FöffÆ–æTf–ÆVBòŠý‹‹]˜¢FöffÆ–æUVæF–ær"Å²v'•÷7FGW2sÓâFöffÆ–æUÒ“° ¢FÖö&–ÆS#CÕ÷†6Sw5ö6÷VçB‚vÖö&–ÆUöW'&÷%öÆöw2rÂv7&VFVEöCäDDUõ5T"„äõr‚’Â”åDU%dÂD’’r“°¢G&V¦V7C#CÕ÷†6Sw5ö6÷VçB‚vGFVæFæ6U÷&V¦V7EöÆöw2rÂv7&VFVEöCäDDUõ5T"„äõr‚’Â”åDU%dÂD’’r“°¢F6ö×öæVçG5µÓÕ÷†6Sw5ö6ö×öæVçB‚vÖö&–ÆUöF–væ÷7F–72rÂ}Ší‹}Š}˜}Š}¸ÂŠ}›â˜‚u2rÂ‚FÖö&–ÆS#Cã#ÇÂG&V¦V7C#Cãƒ“òwv&æ–ærs¢vö²rÂ-Ší‹}Š}¸ÂŠ}›â»-»M‹=Š}‹Š£¢FÖö&–ÆS#Bò‹ŠòŠÝ‹m˜‹¢G&V¦V7C#B"Å²vÖö&–ÆUöW'&÷'5ó#F‚sÓâFÖö&–ÆS#BÂvGFVæFæ6U÷&V¦V7Eó#F‚sÓâG&V¦V7C#EÒ“° ¢GÆFUVæF–æsÕ÷†6Sw5ö6÷VçB‚wÆFU÷66å÷6×ÆW2rÂ'7FGW3ÒwVæF–ærr"“°¢GÆFUfW&–f–VCÕ÷†6Sw5ö6÷VçB‚wÆFU÷66å÷6×ÆW2rÂ'7FGW3ÒwfW&–f–VBr"“°¢GÆFU7FGW3Ò‚GÆFUVæF–æsã#“òwv&æ–ærs¢vö²s°¢F6ö×öæVçG5µÓÕ÷†6Sw5ö6ö×öæVçB‚wÆFUöö7"rÂ}ŠŠ}‹-Š¸Í˜m¸Â›í˜MŠ}ªž(ÍŠí˜Š}˜brÂGÆFU7FGW2Â-˜m˜]˜˜m˜rŠ­Š=¸Í¸ÍŠý‹MŠý˜s¢GÆFUfW&–f–VBòŠý‹Š}˜mŠ­‹Š}‹ŠŠ}‹-Š¸Í˜m¸Ã¢GÆFUVæF–ær"Å²wfW&–f–VBsÓâGÆFUfW&–f–VBÂwVæF–ærsÓâGÆFUVæF–æuÒ“° ¢GÆFf÷&×3Õ²v&ÆRrÂwFVÆVw&ÒrÂvV—FuÓ²FÖW73ÕµÓ²F×6tf–ÆVCÓ°¢f÷&V6‚‚GÆFf÷&×22GÂ—°¢–b‚GÃÓÓÒv&ÆRr—°¢G7V'3Õ÷†6Sw5ö6÷VçB‚v&ÆU÷7V'67&–&W'2rÂv—5ö7F—fSÓr“°¢Ff–ÆVCÕ÷†6Sw5ö6÷VçB‚v&ÆUöÖW76vUöÆörrÂ'7FGW3Ãâw6VçBräB7&VFVEöCäDDUõ5T"„äõr‚’Â”åDU%dÂD’’"“°¢FWfVçG3Õ÷†6Sw5ö6÷VçB‚v&ÆUö&÷EöWfVçG2rÂv7&VFVEöCäDDUõ5T"„äõr‚’Â”åDU%dÂD’’r“°¢ÒVÇ6R°¢G7V'3Õ÷†6Sw5ö6÷VçB‚vÖW76VævW%÷7V'67&–&W'2rÂwÆFf÷&ÓÓòäB—5ö7F—fSÓrÅ²GÅÒ“°¢Ff–ÆVCÕ÷†6Sw5ö6÷VçB‚vÖW76VævW%öÖW76vUöÆörrÂ'ÆFf÷&ÓÓòäB7FGW3Ãâw6VçBräB7&VFVEöCäDDUõ5T"„äõr‚’Â”åDU%dÂD’’"Å²GÅÒ“°¢FWfVçG3Õ÷†6Sw5ö6÷VçB‚vÖW76VævW%ö&÷EöWfVçG2rÂwÆFf÷&ÓÓòäB7&VFVEöCäDDUõ5T"„äõr‚’Â”åDU%dÂD’’rÅ²GÅÒ“°¢Ð¢F×6tf–ÆVB³ÒFf–ÆVC²FÖW75²GÅÓÕ²v7F—fU÷7V'67&–&W'2sÓâG7V'2Âvf–ÆVEó#F‚sÓâFf–ÆVBÂvWfVçG5ó#F‚sÓâFWfVçG5Ó°¢Ð¢F6ö×öæVçG5µÓÕ÷†6Sw5ö6ö×öæVçB‚vÖW76VævW%ö&÷G2rÂ}‹ŠŠ}Š®(Í˜}Š}¸Â›í¸ÍŠ}˜^(Í‹‹=Š}˜brÂF×6tf–ÆVCãòwv&æ–ærs¢vö²rÂ-Ší‹}Š}¸ÂŠ}‹‹=Š}˜B»-»M‹=Š}‹Š£¢F×6tf–ÆVB"ÂFÖW72“° ¢F6†V6·3Õ÷†6Sw5öÆÂ‚%4TÄT5B6†V6µö¶W’Ç7FGW2ÆÖW76vRÆ6†V6¶VEöBe$ôÒ7—7FVÕö†VÇF…ö6†V6·2õ$DU"%’–BDU42Ä”Ô•Bƒ"“°¢FÆ7D7&öãÕ÷†6Sw5ööæR‚%4TÄT5B6†V6¶VEöBÇ7FGW2ÆÖW76vRe$ôÒ7—7FVÕö†VÇF…ö6†V6·2t„U$R6†V6µö¶W“Òv7&öå÷&ö&Rrõ$DU"%’–BDU42Ä”Ô•B"“°¢F7&öäöÆCÖfÇ6S²–b‚V×G’‚FÆ7D7&öå²v6†V6¶VEöBuÒ’’F7&öäöÆCÒ‡F–ÖR‚’×7G'F÷F–ÖR‚FÆ7D7&öå²v6†V6¶VEöBuÒ“ãƒcC“²VÇ6RF7&öäöÆC×G'VS°¢F6ö×öæVçG5µÓÕ÷†6Sw5ö6ö×öæVçB‚v7&öârÂ}ª‹˜˜n(ÍŠÍŠ}ŠŽ(Í˜}ŠrrÂF7&öäöÆCòwv&æ–ærs¢vö²rÂF7&öäöÆCò}¨mª’ª‹˜˜bŠý‹»-»B‹=Š}‹Š¢Š}Ší¸Í‹Š½ŠŠ¢˜m‹MŠý˜rŠ}‹=Š¢s¢}Š-Ší‹¸Í˜b¨mª’ª‹˜˜bŠ½ŠŠ¢‹MŠý˜rŠ}‹=Š¢rÅ²vÆ7Eö7&öâsÓâFÆ7D7&öåÒ“° ¢G7—5v&ã#CÕ÷†6Sw5ö6÷VçB‚w7—7FVÕö†VÇF…öÆöw2rÂ&ÆWfVÂ”â‚wv&æ–ærrÂvW'&÷"r’äB7&VFVEöCäDDUõ5T"„äõr‚’Â”åDU%dÂD’’"“°¢F÷Vå6W76–öç3Õ÷†6Sw5ö6÷VçB‚w7FfeöGFVæFæ6RrÂv6†V6µö÷WB•2åTÄÂr“°¢G7FG3Õ°¢wW6W'5÷F÷FÂsÓå÷†6Sw5ö6÷VçB‚wW6W'2r’À¢wW6W'5ö7F—fRsÓå÷†6Sw5ö6÷VçB‚wW6W'2rÂv—5ö7F—fSÓr’À¢vG&—fW'5÷F÷FÂsÓå÷†6Sw5ö6÷VçB‚vG&—fW'2r’À¢vÆ–æW5÷F÷FÂsÓå÷†6Sw5ö6÷VçB‚wF†•öÆ–æW2r’ó¢÷†6Sw5ö6÷VçB‚vÆ–æW2r’À¢v÷Vå÷7Ffe÷6W76–öç2sÓâF÷Vå6W76–öç2À¢vFVÆ—fW'•öFVEöÆWGFW'2sÓâFFVBÀ¢vöffÆ–æUöf–ÆVBsÓâFöffÆ–æTf–ÆVBÀ¢vÖö&–ÆUöW'&÷'5ó#F‚sÓâFÖö&–ÆS#BÀ¢vGFVæFæ6U÷&V¦V7G5ó#F‚sÓâG&V¦V7C#BÀ¢w7—7FVÕ÷v&æ–æw5ó#F‚sÓâG7—5v&ã#BÀ¢wÆFU÷fW&–f–VBsÓâGÆFUfW&–f–VBÀ¢wÆFU÷VæF–ærsÓâGÆFUVæF–ærÀ¢Ó° ¢F÷fW&ÆÃÒvö²s²f÷&V6‚‚F6ö×öæVçG22F2—²–b‚F5²w7FGW2uÓÓÓÒvW'&÷"r—²F÷fW&ÆÃÒvW'&÷"s²'&V³²Ò–b‚F5²w7FGW2uÓÓÓÒwv&æ–ærrbbF÷fW&ÆÂÓÒvW'&÷"r’F÷fW&ÆÃÒwv&æ–ærs²Ð¢&WGW&â°¢vö²sÓçG'VRÀ¢w7FGW2sÓâF÷fW&ÆÂÀ¢wF–ÖRsÓâFæ÷rÀ¢w6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÀ¢v÷fW'6–öâsÓäõdU%4”ôâÀ¢v6ö×öæVçG2sÓâF6ö×öæVçG2À¢w7FG2sÓâG7FG2À¢w&V6VçEöW'&÷'2sÓå÷†6Sw5öÆÂ‚%4TÄT5B¢e$ôÒ7—7FVÕö†VÇF…öÆöw2t„U$RÆWfVÂ”â‚vW'&÷"rÂwv&æ–ærr’õ$DU"%’–BDU42Ä”Ô•BS"’À¢w&V6VçEöÖö&–ÆUöW'&÷'2sÓå÷†6Sw5öÆÂ‚%4TÄT5B¢e$ôÒÖö&–ÆUöW'&÷%öÆöw2õ$DU"%’–BDU42Ä”Ô•B3"’À¢w&V6VçEööffÆ–æUöf–ÇW&W2sÓå÷†6Sw5öÆÂ‚%4TÄT5B¢e$ôÒöffÆ–æU÷7–æ5öÆöw2t„U$R7FGW2”â‚vf–ÆVBrÂv6öæfÆ–7Br’õ$DU"%’–BDU42Ä”Ô•B3"’À¢v6†V6·5ö†—7F÷'’sÓâF6†V6·2À¢wF‡&W6†öÆG2sÓå²vöÆE÷VWVUöÖ–çWFW2sÓã3Âv7&öåöÖ…övUö†÷W'2sÓã#BÂvF—6µ÷v&æ–æu÷W&6VçBsÓã#ÂvF—6µöW'&÷%÷W&6VçBsÓãÒÀ¢Ó°§Ð¦gVæ7F–öâ÷†6Sw5÷6fUö6†V6·2‚G–ÆöBÂF7F÷#ÖçVÆÂ—°¢f÷&V6‚‚‚G–ÆöE²v6ö×öæVçG2uÓóõµÒ’2F2—°¢G'’²F#£§'Vâ‚$”å4U%B”åDò7—7FVÕö†VÇF…ö6†V6·2†6†V6µö¶W’Ç7FGW2ÆÖW76vRÆÖWF’dÅTU2ƒòÃòÃòÃò’"Â²F5²v¶W’uÒÂF5²w7FGW2uÒÂF5²vÖW76vRuÒÆ§6öåöVæ6öFR‚F5²vÖWFuÓóõµÒÄ¥4ôåõTäU44TEõTä”4ôDR•Ò“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢–b‚‚F5²w7FGW2uÓóòvö²r’ÓÒvö²r—°¢G'’²F#£§'Vâ‚$”å4U%B”åDò7—7FVÕö†VÇF…ö–æ6–FVçG2†6†V6µö¶W’Ç7FGW2ÇF—FÆRÆÖW76vRÆÖWFÆÆ7E÷6VVåöB’dÅTU2ƒòÃòÃòÃòÃòÄäõr‚’’"Â²F5²v¶W’uÒÂF5²w7FGW2uÒÂF5²wF—FÆRuÓóòF5²v¶W’uÒÂF5²vÖW76vRuÓóòrrÆ§6öåöVæ6öFR…²v7F÷"sÓâF7F÷"ÂvÖWFsÓâF5²vÖWFuÓóõµÕÒÄ¥4ôåõTäU44TEõTä”4ôDR•Ò“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢Ð¢Ð¢G'’²F#£§'Vâ‚$”å4U%B”åDò7—7FVÕö†VÇF…ö6†V6·2†6†V6µö¶W’Ç7FGW2ÆÖW76vRÆÖWF’dÅTU2‚v7&öå÷&ö&RrÃòÃòÃò’"Â²G–ÆöE²w7FGW2uÓóòvö²rÂv†VÇF‚F6†&ö&B&ö&RW†V7WFVBrÆ§6öåöVæ6öFR…²v7F÷"sÓâF7F÷"ÂwF–ÖRsÓæFFR‚v2r•ÒÄ¥4ôåõTäU44TEõTä”4ôDR•Ò“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð§Ð§&÷WFR‚ttUBrÂrö’öFÖ–â÷7—7FVÒÖ†VÇF‚ÖF6†&ö&BrÂgVæ7F–öâ‚GÂF"ÂGR—²&WGW&â÷†6Sw5ö6öÆÆV7Eö†VÇF‚‚“²ÒÂfÇ6RÂDÔ”â“°§&÷WFR‚uõ5BrÂrö’öFÖ–â÷7—7FVÒÖ†VÇF‚ÖF6†&ö&B÷'VârÂgVæ7F–öâ‚GÂF"ÂGR—²FƒÕ÷†6Sw5ö6öÆÆV7Eö†VÇF‚‚“²÷†6Sw5÷6fUö6†V6·2‚F‚ÂGU²v–BuÓóòvFÖ–âr“²&WGW&âFƒ²ÒÂfÇ6RÂDÔ”â“°§&÷WFR‚uõ5BrÂrö’ö7&öâ÷7—7FVÒÖ†VÇF‚×&ö&RrÂgVæ7F–öâ‚GÂF"ÂGR—°¢F¶W’ÒG²v¶W’uÒóòF%²v¶W’uÒóò‚EôtUE²v¶W’uÒóòrr“°¢FW‡V7FVBÒrs°¢G'’²G#ÔF#£¦öæR‚%4TÄT5BfÇVRe$ôÒ÷6WGF–æw2t„U$R¶W–Òv7&öåö¶W’r"“²FW‡V7FVCÒG"ò‡7G&–ær–§6öåöFV6öFR‚G%²wfÇVRuÒÂG'VR’¢rs²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢–b‚FW‡V7FVB’FW‡V7FVCÖvWFVçb‚t5$ôåô´U’r’ó¢rs°¢–b‚FW‡V7FVBbb†6…öWVÇ2‚‡7G&–ær’FW‡V7FVBÂ‡7G&–ær’F¶W’’’‡GG£¦W'&÷"‚}ª˜M¸ÍŠòª‹˜˜b˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÃC2“°¢FƒÕ÷†6Sw5ö6öÆÆV7Eö†VÇF‚‚“²÷†6Sw5÷6fUö6†V6·2‚F‚Âv7&öâr“²&WGW&âFƒ°§ÒÂG'VR“°§&÷WFR‚uõ5BrÂrö’öFÖ–â÷7—7FVÒÖ†VÇF‚Ö–æ6–FVçG2÷¶–GÒ÷&W6öÇfRrÂgVæ7F–öâ‚GÂF"ÂGR—°¢÷†6Sw5öVç7W&R‚“²F#£§'Vâ‚%UDDR7—7FVÕö†VÇF…ö–æ6–FVçG24UB&W6öÇfVEöCÔäõr‚’Â&W6öÇfVEö'“ÓòÂ&W6öÇWF–öåöæ÷FSÓòt„U$R–CÓò"Â²GU²v–BuÓóöçVÆÂÂG&–Ò‚‡7G&–ær’‚F%²væ÷FRuÓóòrr’’Â†–çB’G²v–BuÕÒ“²&WGW&â²vö²sÓçG'VUÓ°§ÒÂfÇ6RÂDÔ”â“°§&÷WFR‚ttUBrÂrö’öFÖ–â÷7—7FVÒÖ†VÇF‚Ö–æ6–FVçG2rÂgVæ7F–öâ‚GÂF"ÂGR—²÷†6Sw5öVç7W&R‚“²&WGW&âF#£¦ÆÂ‚%4TÄT5B¢e$ôÒ7—7FVÕö†VÇF…ö–æ6–FVçG2õ$DU"%’–BDU42Ä”Ô•B3"“²ÒÂfÇ6RÂDÔ”â“°§&÷WFR‚ttUBrÂrö’öFÖ–â÷†6Sr×'C2÷7FGW2rÂgVæ7F–öâ‚GÂF"ÂGR—°¢FƒÕ÷†6Sw5ö6öÆÆV7Eö†VÇF‚‚“°¢&WGW&â²w6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôâÂw†6RsÓãrÂw'BsÓã2Âw&VÆV6UöæÖRsÓâu†6Rrã2Ò6ö×ÆWFR7—7FVÒ†VÇF‚F6†&ö&BrÂv†VÇF…÷7FGW2sÓâF…²w7FGW2uÒÂv6ö×ÆWFVBsÓå°¢vgVÆÅö†VÇF…öF6†&ö&BrÂvFF&6U÷7F÷&vUöF—6µ÷‡ö6†V6·2rÂvFVÆ—fW'•÷VWVUöFVEöÆWGFW%öÖöæ—F÷"rÂvöffÆ–æU÷7–æ5öÖöæ—F÷"rÂvÖö&–ÆUöw5öW'&÷%öÖöæ—F÷"rÂwÆFUöö7%÷G&–æ–æuöÖöæ—F÷"rÂvÖW76VævW%ö&÷EöÖöæ—F÷"rÂv7&öå÷&ö&UöVæGö–çBrÂv–æ6–FVçEö†—7F÷'’rÂvFÖ–å÷æVÅö†VÇF…÷f–WrrÂwfW'6–öåóóórrÂwWw&FU÷‡ö6öç6öÆ–FFVBp¢ÒÂw&VÖ–æ–ærsÓå²w&öGV7F–öåöf–VÆE÷F‡&W6†öÆE÷GVæ–ærrÂvW‡FW&æÅ÷WF–ÖUöÖöæ—F÷%ööåöf–æÅöFöÖ–âuÕÓ°§ÒÂfÇ6RÂDÔ”â“°§&÷WFR‚ttUBrÂrö’÷&ö¦V7B×fW'6–öâ×cw2rÂgVæ7F–öâ‚GÂF"ÂGR—²&WGW&â²w6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôâÂw†6RsÓãrÂw'BsÓã2Âw&VÆV6UöæÖRsÓâu†6Rrã2Ò6ö×ÆWFR7—7FVÒ†VÇF‚F6†&ö&BuÓ²ÒÂG'VR“°§&÷WFR‚ttUBrÂrö’ö7&öâ÷7—7FVÒÖ†VÇF‚×&ö&RrÂgVæ7F–öâ‚GÂF"ÂGR—°¢F¶W’ÒEôtUE²v¶W’uÒóò‚G²v¶W’uÒóòrr“°¢FW‡V7FVBÒrs°¢G'’²G#ÔF#£¦öæR‚%4TÄT5BfÇVRe$ôÒ÷6WGF–æw2t„U$R¶W–Òv7&öåö¶W’r"“²FW‡V7FVCÒG"ò‡7G&–ær–§6öåöFV6öFR‚G%²wfÇVRuÒÂG'VR’¢rs²Ò6F6‚…F‡&÷v&ÆRFR’·Ð¢–b‚FW‡V7FVB’FW‡V7FVCÖvWFVçb‚t5$ôåô´U’r’ó¢rs°¢–b‚FW‡V7FVBbb†6…öWVÇ2‚‡7G&–ær’FW‡V7FVBÂ‡7G&–ær’F¶W’’’‡GG£¦W'&÷"‚}ª˜M¸ÍŠòª‹˜˜b˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÃC2“°¢FƒÕ÷†6Sw5ö6öÆÆV7Eö†VÇF‚‚“²÷†6Sw5÷6fUö6†V6·2‚F‚Âv7&öâr“²&WGW&âFƒ°§ÒÂG'VR“°  §&÷WFR‚ttUBrÂrö’öFÖ–â÷†6Sr×'CB÷7FGW2rÂgVæ7F–öâ‚GÂF"ÂGR—°¢&WGW&â²w6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôâÂw†6RsÓãrÂw'BsÓãBÂw&VÆV6UöæÖRsÓâu†6RrãRÒ×•5Â–×÷'BWw&FRæBÆFRô5"6WGF–æw2rÂv6ö×ÆWFVBsÓå°¢v'&÷w6W%ö&&VÅ÷&VÖ÷fVBrÂwFW‡Eö&&VÅ÷&VÖ÷fVBrÂwæVÅ÷&V7Eö6ö×–ÆVE÷Fõö'VæFÆUö§2rÂwæVÅö775öW‡G&7FVE÷Fõö'VæFÆUö772rÂwæVÅö‡FÖÅ÷6Æ–ÖÖVBrÂwfVæF÷%ö&&VÅöfWF6…÷&VÖ÷fVBrÂv†VÇF…öF6†&ö&E÷æVÅö'VæFÆUö6†V6²rÂwfW'6–öåóóórrÂwWw&FU÷‡ö6öç6öÆ–FFVBp¢ÒÂw&VÖ–æ–ærsÓå²vf–VÆE÷FW7E÷æVÅööåöf–æÅöFöÖ–ârÂv6Få÷fVæF÷%÷6VÆeö†÷7EöF÷væÆöEö–eöæVVFVBuÕÓ°§ÒÂfÇ6RÂDÔ”â“°§&÷WFR‚ttUBrÂrö’÷&ö¦V7B×fW'6–öâ×cwBrÂgVæ7F–öâ‚GÂF"ÂGR—²&WGW&â²w6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôâÂw†6RsÓãrÂw'BsÓãBÂw&VÆV6UöæÖRsÓâu†6RrãRÒ×•5Â–×÷'BWw&FRæBÆFRô5"6WGF–æw2uÓ²ÒÂG'VR“°§&÷WFR‚uõ5BrÂrö’÷ÆFRÖö7"ö6Æ÷VBrÂgVæ7F–öâ‚GÂF"ÂGR—°¢–b‚6Æ75öW†—7G2‚t6Æ÷VDö7"r’’‡GG£¦W'&÷"‚}˜]Š}©˜˜Bô5"Š}Š‹¸Â˜m‹]Š‚˜m‹MŠý˜rŠ}‹=Š¢rÃS“°¢F–ÖvSÒ‡7G&–ær’‚F%²v–ÖvUö&6ScBuÓóòrr“²–b‚F–ÖvSÓÓÒrr’‡GG£¦W'&÷"‚}Š­‹]˜¸Í‹˜MŠ}‹-˜RŠ}‹=Š¢rÃC“°¢F¶–æCÒ‡7G&–ær’‚F%²v¶–æBuÓóòwÆFRr“²–b‚–åö'&’‚F¶–æBÅ²wÆFRrÂvæF–öæÅö–BrÂwFW‡BuÒÇG'VR’’F¶–æCÒwFW‡Bs°¢G'’²&WGW&â6Æ÷VDö7#£§&V6övæ—¦R‚F–ÖvRÂF¶–æB“²Ð¢6F6‚…F‡&÷v&ÆRFR—²‡GG£¦W'&÷"‚FRÓævWDÖW76vR‚’ÃC#"“²Ð§ÒÂfÇ6RÂ’“° §&÷WFR‚ttUBrÂrö’÷&ö¦V7B×fW'6–öâ×cwRrÂgVæ7F–öâ‚GÂF"ÂGR—²&WGW&â²w6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôâÂw†6RsÓãrÂw'BsÓãRÂw&VÆV6UöæÖRsÓâu†6RrãRÒ×•5Â–×÷'BWw&FRæBÆFRô5"6WGF–æw2rÂv6ö×ÆWFVBsÓå²v×—7Åö–×÷'E÷Ww&FU÷7ÂsÓçG'VRÂw6fUö–æFW†W2sÓçG'VRÂwÆFUöö7%÷6WGF–æw5÷f—6–&ÆRsÓçG'VUÕÓ²ÒÂG'VR“° §&÷WFR‚ttUBrÂrö’÷&ö¦V7B×fW'6–öâ×cwbrÂgVæ7F–öâ‚GÂF"ÂGR—²&WGW&â²w6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôâÂw†6RsÓãrÂw'BsÓãbÂw&VÆV6UöæÖRsÓâu†6RrãbÒÆFRG&–æ–ærVæGö–çB7F&–Æ—¦F–öâuÓ²ÒÂG'VR“°  ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐ¢òò†6Rr'BS"(	B6ö×ç’Fö7VÖVçB&WVW7G2…†6R&6¶VæB¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐ  ¦gVæ7F–öâö6ö×ç•÷&WVW7G5÷66†VÖöVç7W&R‚—°¢7FF–2FFöæSÖfÇ6S²–b‚FFöæR’&WGW&ã²FFöæS×G'VS°¢F6öÇVÖç3Õ°¢v76–væVE÷FòsÓât$”t”åBåTÄÂrÂw&Wf–WvVEö'’sÓât$”t”åBåTÄÂrÂw&Wf–WvVEöBsÓâtDDUD”ÔRåTÄÂrÀ¢vGVUöBsÓâtDDUD”ÔRåTÄÂrÂvÆ7E÷7FGW5öBsÓâtDDUD”ÔRåTÄÂrÂv6ö×ÆWFVEöBsÓâtDDUD”ÔRåTÄÂrÀ¢vFÖ–åöæ÷FRsÓâuDU…BåTÄÂrÂw&–÷&—G’sÓâ%d$4„"ƒ#’äõBåTÄÂDTdTÅBvæ÷&ÖÂr"ÂvÆ7E÷6Æöæ÷F–f–VEöBsÓâtDDUD”ÔRåTÄÂp¢Ó°¢f÷&V6‚‚F6öÇVÖç22FæÖSÓâFFVf–æ—F–öâ—°¢G'—²FW†—7G3ÔF#£¦öæR‚%4„õr4ôÅTÔå2e$ôÒ6ö×ç•÷&WVW7G2Ä”´Rò"Å²FæÖUÒ“²–b‚FW†—7G2’F#£¦W†V2‚$ÅDU"D$ÄR6ö×ç•÷&WVW7G2DB4ôÅTÔâFæÖVFFVf–æ—F–öâ"“²Ð¢6F6‚…F‡&÷v&ÆRFR—²W'&÷%öÆör‚v6ö×ç•÷&WVW7G266†VÖrâFæÖRâs¢râFRÓævWDÖW76vR‚’“²Ð¢Ð¢G'—²F#£¦W†V2‚$5$TDR”äDU‚–G…ö6ö×ç•÷&WöGVRôâ6ö×ç•÷&WVW7G2†GVUöBÇ7FGW2’"“²Ö6F6‚…F‡&÷v&ÆRFR—·Ð¢G'—²FW†—7G3ÔF#£¦öæR‚%4„õr4ôÅTÔå2e$ôÒ6ö×ç•÷&WVW7EöÆöw2Ä”´RvÖWFr"“²–b‚FW†—7G2’F#£¦W†V2‚$ÅDU"D$ÄR6ö×ç•÷&WVW7EöÆöw2DB4ôÅTÔâÖWFÄôäuDU…BåTÄÂ"“²Ö6F6‚…F‡&÷v&ÆRFR—²W'&÷%öÆör‚v6ö×ç•÷&WVW7EöÆöw266†VÖÖWF¢râFRÓævWDÖW76vR‚’“²Ð¢G'—²F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7G27"¤ô”â6ö×ç•÷&WVW7E÷G—W2'Bôâ'Bæ–CÖ7"ç&WVW7E÷G—Uö–B4UB7"æGVUöCÔDDUôDB†7"æ7&VFVEöBÄ”åDU%dÂu$TDU5BƒÄ4ôÄU44R‡'BæFVFÆ–æUöF—2Ã’’D’’t„U$R7"æGVUöB•2åTÄÂ"“²Ö6F6‚…F‡&÷v&ÆRFR—·Ð¢G'—²F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7G24UBÆ7E÷7FGW5öCÔ4ôÄU44R†Æ7E÷7FGW5öBÆ7&VFVEöB’"“²Ö6F6‚…F‡&÷v&ÆRFR—·Ð§Ð ¦gVæ7F–öâö6ö×ç•öf–ÆW5÷66†VÖöVç7W&R‚—°¢7FF–2FFöæSÖfÇ6S²–b‚FFöæR’&WGW&ã²FFöæS×G'VS°¢F6öÇVÖç3Õ°¢v÷&–v–æÅ÷F‚sÓâuDU…BåTÄÂrÂw&ö6W76VE÷F‚sÓâuDU…BåTÄÂrÂw&ö6W76VE÷6—¦RsÓât$”t”åBåTÄÂrÀ¢v7&÷öÖWFsÓâtÄôäuDU…BåTÄÂrÂw6†#SbsÓâud$4„"ƒcB’åTÄÂrÂwF‡VÖ&æ–Å÷F‚sÓâuDU…BåTÄÂrÀ¢wVÆ—G•÷66÷&RsÓât”åBåTÄÂrÂwVÆ—G•÷7FGW2sÓâ%d$4„"ƒ#’åTÄÂDTdTÅBvö²r"À¢wVÆ—G•öÖWFsÓâtÄôäuDU…BåTÄÂrÂw6÷W&6U÷G—RsÓâ%d$4„"ƒ3’åTÄÂDTdTÅBwVæ¶æ÷vâr ¢Ó°¢f÷&V6‚‚F6öÇVÖç22FæÖSÓâFFVf–æ—F–öâ—°¢G'’²FW†—7G3ÔF#£¦öæR‚%4„õr4ôÅTÔå2e$ôÒ6ö×ç•÷&WVW7Eöf–ÆW2Ä”´Rò"Å²FæÖUÒ“²–b‚FW†—7G2’F#£¦W†V2‚$ÅDU"D$ÄR6ö×ç•÷&WVW7Eöf–ÆW2DB4ôÅTÔâFæÖVFFVf–æ—F–öâ"“²Ð¢6F6‚…F‡&÷v&ÆRFR—²W'&÷%öÆör‚v6ö×ç•÷&WVW7Eöf–ÆW266†VÖrâFæÖRâs¢râFRÓævWDÖW76vR‚’“²Ð¢Ð¢G'’²F#£¦W†V2‚$5$TDR”äDU‚–G…ö6ö×ç•÷&WVW7Eöf–ÆW5÷6†#Sbôâ6ö×ç•÷&WVW7Eöf–ÆW2‡6†#Sb’"“²Ò6F6‚…F‡&÷v&ÆRFR’·Ð§Ð¦gVæ7F–öâö6ö×ç•öFWFV7EöÖ–ÖR‚F&–â—°¢G'’²–b†6Æ75öW†—7G2‚vf–æfòr’’²Ff“ÖæWrf–æfò„d”ÄT”ädõôÔ”ÔUõE•R“²FÓÒFf’Óæ'VffW"‚F&–â“²–b‚FÒ’&WGW&âFÓ²ÒÒ6F6‚…F‡&÷v&ÆRFR’·Ð¢–b‡7V'7G"‚F&–âÃÃB“ÓÓÒrUDbr’&WGW&âvÆ–6F–öâ÷Fbs°¢–b‡7V'7G"‚F&–âÃÃ2“ÓÓÒ,;ü9Œ;ò"’&WGW&âv–ÖvRö§Vrs°¢–b‡7V'7G"‚F&–âÃÃ‚“ÓÓÒ,(•äp¡ ¢"’&WGW&âv–ÖvR÷ærs°¢–b‡7V'7G"‚F&–âÃÃB“ÓÓÒu$”dbrbb7V'7G"‚F&–âÃ‚ÃB“ÓÓÒutT%r’&WGW&âv–ÖvR÷vV's°¢&WGW&âvÆ–6F–öâöö7FWB×7G&VÒs°§Ð ¦gVæ7F–öâö6ö×ç•÷6WGF–æuövWB‚F¶W’ÂFFVfVÇCÖçVÆÂ—°¢G&÷sÔF#£¦öæR‚%4TÄT5B6WGF–æu÷fÇVRe$ôÒ6ö×ç•÷&WVW7E÷6WGF–æw2t„U$R6WGF–æuö¶W“Óò"Å²F¶W•Ò“°¢–b‚G&÷r’&WGW&âFFVfVÇC°¢GcÖ§6öåöFV6öFR‚G&÷u²w6WGF–æu÷fÇVRuÒÇG'VR“°¢&WGW&â§6öåöÆ7EöW'&÷"‚“ÓÓÔ¥4ôåôU%$õ%ôäôäRòGb¢FFVfVÇC°§Ð¦gVæ7F–öâö6ö×ç•÷6WGF–æw5öÆÂ‚—°¢G&÷w3ÔF#£¦ÆÂ‚%4TÄT5B6WGF–æuö¶W’Ç6WGF–æu÷fÇVRe$ôÒ6ö×ç•÷&WVW7E÷6WGF–æw2õ$DU"%’6WGF–æuö¶W’"“²F÷WCÕµÓ°¢f÷&V6‚‚G&÷w22G‚—²GcÖ§6öåöFV6öFR‚G…²w6WGF–æu÷fÇVRuÒÇG'VR“²F÷WE²G…²w6WGF–æuö¶W’uÕÓÖ§6öåöÆ7EöW'&÷"‚“ÓÓÔ¥4ôåôU%$õ%ôäôäSòGc¦çVÆÃ²Ð¢&WGW&âF÷WC°§Ð¦gVæ7F–öâö6ö×ç•öÆör‚G&WVW7D–BÂGW6W$–BÂF7F–öâÂFFW67&—F–öãÒrrÂFÖWFÖçVÆÂ—°¢F#£¦–ç6W'B‚$”å4U%B”åDò6ö×ç•÷&WVW7EöÆöw2‡&WVW7Eö–BÇW6W%ö–BÆ7F–öâÆFW67&—F–öâÆÖWF’dÅTU2ƒòÃòÃòÃòÃò’"Å²†–çB’G&WVW7D–BÂGW6W$–Có¦çVÆÂÂF7F–öâÂFFW67&—F–öâÂFÖWFÓÓÖçVÆÃöçVÆÃ¦§6öåöVæ6öFR‚FÖWFÄ¥4ôåõTäU44TEõTä”4ôDR•Ò“°§Ð¦gVæ7F–öâö6ö×ç•÷G&6¶–æuö6öFR‚—²&WGW&ât5"ÒræFFR‚w–ÖBr’ârÒrç7G'F÷WW"‡7V'7G"†&–ã&†W‚‡&æFöÕö'—FW2ƒR’’ÃÃ‚’“²Ð ¦gVæ7F–öâö6ö×ç•öFö5÷G—Uö6æöæ–6Â‚FFö2—°¢FFö3×G&–Ò‚‡7G&–ær’FFö2“°¢FÆ–6W3Õ°¢v&—'F…ö6W'F–f–6FU÷vSsÓâv&—'F…ö6W'F–f–6FU÷vUórÀ¢v&—'F…ö6W'F–f–6FU÷vS"sÓâv&—'F…ö6W'F–f–6FU÷vUó"rÀ¢vÆ–6Vç6Uög&öçBsÓâvG&—fW%öÆ–6Vç6Uög&öçBrÀ¢vÆ–6Vç6Uö&6²sÓâvG&—fW%öÆ–6Vç6Uö&6²rÀ¢wW'6öæÅ÷†÷FòsÓâw÷'G&—E÷†÷FòrÀ¢w&W6–FVæ7•öFö7VÖVçBsÓâw&W6–FVæ6UöFö7VÖVçBrÀ¢w&ööeööe÷&W6–FVæ6RsÓâw&W6–FVæ6UöFö7VÖVçBrÀ¢Ó°¢&WGW&âFÆ–6W5²FFö5ÓóòFFö3°§Ð¦gVæ7F–öâö6ö×ç•÷&WV—&VEöFö75÷7FFR‚G&W—°¢G&WV—&VCÖ—5ö'&’‚G&W²w&WV—&VEöFö7VÖVçG2uÓóöçVÆÂ“òG&W²w&WV—&VEöFö7VÖVçG2uÓ¢†§6öåöFV6öFR‚G&W²w&WV—&VEöFö7VÖVçG2uÓóòuµÒrÇG'VR“ó¥µÒ“°¢G&WV—&VCÖ'&•÷fÇVW2†'&•÷Væ—VR†'&•öÖ‚uö6ö×ç•öFö5÷G—Uö6æöæ–6ÂrÂG&WV—&VB’’“°¢G&÷w3ÔF#£¦ÆÂ‚%4TÄT5BFö7VÖVçE÷G—RÄ4õTåB‚¢’2e$ôÒ6ö×ç•÷&WVW7Eöf–ÆW2t„U$R&WVW7Eö–CÓòu$õU%’Fö7VÖVçE÷G—R"Å²†–çB’G&W²v–BuÕÒ“°¢F†fSÕµÓ²f÷&V6‚‚G&÷w22G"’–b‚†–çB’G%²v2uÓã’F†fUµö6ö×ç•öFö5÷G—Uö6æöæ–6Â‚‡7G&–ær’G%²vFö7VÖVçE÷G—RuÒ•Ó×G'VS°¢FÖ—76–æsÕµÓ²f÷&V6‚‚G&WV—&VB2FB’–b†V×G’‚F†fU²FEÒ’’FÖ—76–æuµÓÒFC°¢&WGW&â²w&WV—&VBsÓâG&WV—&VBÂvÖ—76–ærsÓâFÖ—76–ærÂv6ö×ÆWFRsÓæ6÷VçB‚FÖ—76–ær“ÓÓÓÓ°§Ð¦gVæ7F–öâö6ö×ç•öæ÷F–g•÷W6W"‚G&WÂGF—FÆRÂF&öG“Òrr—°¢G'’°¢–b†6Æ75öW†—7G2‚t&ÆT&÷Br’bb&ÆT&÷C£¦—4Væ&ÆVB‚’—°¢F6†CÔ&ÆT&÷C£¦f–æD6†Df÷%W6W"‚†–çB’G&W²wW6W%ö–BuÒ“°¢–b‚F6†B’&ÆT&÷C£§6VæDÖW76vR‚F6†BÇG&–Ò‚GF—FÆRâ ¢"âF&öG’’Å²wF&vWE÷G—RsÓâv6ö×ç•÷&WVW7BrÂwF&vWEö–BsÓâ†–çB’G&W²v–BuÕÒ“°¢Ð¢Ò6F6‚…F‡&÷v&ÆRFR’²W'&÷%öÆör‚v6ö×ç•öæ÷F–g“¢râFRÓævWDÖW76vR‚’“²Ð§Ð ¦gVæ7F–öâö6ö×ç•öFÖ–å÷W6W%ö–G2‚—°¢F6öæf–wW&VCÕö6ö×ç•÷6WGF–æuövWB‚væ÷F–f–6F–öåöFÖ–å÷W6W%ö–G2rÅµÒ“°¢–b†—5ö'&’‚F6öæf–wW&VB’bb6÷VçB‚F6öæf–wW&VB’’&WGW&â'&•÷fÇVW2†'&•÷Væ—VR†'&•öÖ‚v–çGfÂrÂF6öæf–wW&VB’’“°¢G&÷w3ÔF#£¦ÆÂ‚%4TÄT5BRæ–Be$ôÒW6W'2R¤ô”â&öÆW2"ôâ"æ–C×Rç&öÆUö–Bt„U$RRæ7F—fSÓäB"æ—5öFÖ–ãÓõ$DU"%’"æÆWfVÂDU42ÇRæ–B"“°¢&WGW&â'&•÷fÇVW2†'&•÷Væ—VR†'&•öÖ†fâ‚G‚“Óâ†–çB’G…²v–BuÒÂG&÷w2’’“°§Ð¦gVæ7F–öâö6ö×ç•öæ÷F–g•öFÖ–ç2‚G&WÂGF—FÆRÂF&öG“ÒrrÂFFFÕµÒ—°¢–b…ö6ö×ç•÷6WGF–æuövWB‚væ÷F–g•öFÖ–ç2rÇG'VR“ÓÓÖfÇ6R’&WGW&ã°¢F–G3Õö6ö×ç•öFÖ–å÷W6W%ö–G2‚“²–b‚F–G2’&WGW&ã°¢G'’²W6ƒ£¦æ÷F–g’‚F–G2ÂGF—FÆRÇG&–Ò‚F&öG’’Å²wG—RsÓâv6ö×ç•÷&WVW7BrÂw&WVW7Eö–BsÓâ†–çB’G&W²v–BuÒÂwG&6¶–æuö6öFRsÓâG&W²wG&6¶–æuö6öFRuÓóòruÒ²FFF“²Ð¢6F6‚…F‡&÷v&ÆRFR—²W'&÷%öÆör‚v6ö×ç•öFÖ–åöæ÷F–g“¢râFRÓævWDÖW76vR‚’“²Ð§Ð¦gVæ7F–öâö6ö×ç•÷7FGW5÷F—FÆR‚G7FGW2—°¢FÓÕ²vG&gBsÓâ}›í¸Í‹N(Í˜m˜¸Í‹2rÂvFö7VÖVçG5÷VæF–ærsÓâ}Šý‹Š}˜mŠ­‹Š}‹˜]ŠýŠ}‹ª’rÂw–ÖVçE÷VæF–ærsÓâ}Šý‹Š}˜mŠ­‹Š}‹›í‹ŠýŠ}ŠíŠ¢rÂwVæF–æu÷&Wf–WrsÓâ}Šý‹Š}˜mŠ­‹Š}‹Š‹‹‹=¸ÂrÂvæVVG5ö6÷'&V7F–öâsÓâ}˜m¸ÍŠ}‹-˜]˜mŠòŠ}‹]˜MŠ}ŠÒrÂv&÷fVBsÓâ}Š­Š=¸Í¸ÍŠý‹MŠý˜rrÂw&V¦V7FVBsÓâ}‹Šý‹MŠý˜rrÂv6ö×ÆWFVBsÓâ}Š­ª˜]¸Í˜N(Í‹MŠý˜rrÂv6æ6VÆÆVBsÓâ}˜M‹­˜‹MŠý˜ruÓ°¢&WGW&âFÕ²G7FGW5ÓóòG7FGW3°§Ð¦gVæ7F–öâö6ö×ç•öÇ•öGVUöFFR‚G&WVW7D–BÂFFVFÆ–æTF—2—°¢FF—3ÖÖ‚ƒÂ†–çB’FFVFÆ–æTF—2“°¢F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7G24UBGVUöCÔDDUôDB†7&VFVEöBÄ”åDU%dÂòD’’ÆÆ7E÷7FGW5öCÔ4ôÄU44R†Æ7E÷7FGW5öBÆ7&VFVEöB’t„U$R–CÓò"Å²FF—2Â†–çB’G&WVW7D–EÒ“°§Ð ¦gVæ7F–öâö6ö×ç•ö–ÖvU÷VÆ—G’‚F&–âÂFFö7VÖVçEG—SÒrrÂF6Æ–VçDÖWFÕµÒ—°¢F÷WCÕ²w66÷&RsÓãÂw7FGW2sÓâvö²rÂwv&æ–æw2sÓåµÒÂwv–GF‚sÓãÂv†V–v‡BsÓãÂv'&–v‡FæW72sÓæçVÆÂÂv6öçG&7BsÓæçVÆÂÂw6†'æW72sÓæçVÆÂÂvvÆ&U÷W&6VçBsÓãÂvF&µ÷W&6VçBsÓãÂvVFvUö6÷fW&vRsÓæçVÆÂÂvÆ–¶VÇ•÷67&VVç6†÷BsÓæfÇ6RÂv÷&–VçFF–öâsÓâwVæ¶æ÷vârÂv6†V6·2sÓåµÕÓ°¢–b‚gVæ7F–öåöW†—7G2‚v–ÖvV7&VFVg&ö×7G&–ærr’’²F÷WE²wv&æ–æw2uÕµÓÒ}Š‹‹‹=¸Âª¸Í˜¸ÍŠ¢Š­‹]˜¸Í‹‹˜¸Â‹=‹˜‹˜‹Š}˜B˜m¸Í‹=Š¢s²F÷WE²v6†V6·2uÕ²w6W'fW%övBuÓÖfÇ6S²&WGW&âF÷WC²Ð¢F–ÓÔ–ÖvV7&VFVg&ö×7G&–ær‚F&–â“²–b‚F–Ò—²F÷WE²w66÷&RuÓÓ²F÷WE²w7FGW2uÓÒv–çfÆ–Bs²F÷WE²wv&æ–æw2uÕµÓÒ}Š­‹]˜¸Í‹˜-Š}Š˜B›í‹ŠýŠ}‹-‹B˜m¸Í‹=Š¢s·&WGW&âF÷WC·Ð¢GsÖ–ÖvW7‚‚F–Ò“²FƒÖ–ÖvW7’‚F–Ò“²F÷WE²wv–GF‚uÓÒGs²F÷WE²v†V–v‡BuÓÒFƒ²F÷WE²v÷&–VçFF–öâuÓÒGsãÒFƒòvÆæG66Rs¢w÷'G&—Bs°¢FÖ–åsÖÖ‚ƒsÂ†–çB•ö6ö×ç•÷6WGF–æuövWB‚wVÆ—G•öÖ–å÷v–GF‚rÃ#’“°¢FÖ–äƒÖÖ‚ƒCSÂ†–çB•ö6ö×ç•÷6WGF–æuövWB‚wVÆ—G•öÖ–åö†V–v‡BrÃƒ’“°¢–b‚GsÂFÖ–åwÇÂFƒÂFÖ–ä‚—²F÷WE²w66÷&RuÒÓÓ3²F÷WE²wv&æ–æw2uÕµÓÒ}‹‹-˜˜M˜‹M˜bŠ­‹]˜¸Í‹ª˜]Š­‹Š}‹"ŠÝŠò˜]ŠÍŠ}‹"Š}‹=Š¢s²F÷WE²v6†V6·2uÕ²w&W6öÇWF–öâuÓÖfÇ6S·ÖVÇ6W²F÷WE²v6†V6·2uÕ²w&W6öÇWF–öâuÓ×G'VS·Ð¢G6×ÆSÓcC²GF‡VÖ#Ö–ÖvV7&VFWG'VV6öÆ÷"‚G6×ÆRÂG6×ÆR“¶–ÖvV6÷—&W6×ÆVB‚GF‡VÖ"ÂF–ÒÃÃÃÃÂG6×ÆRÂG6×ÆRÂGrÂF‚“°¢GfÇ3ÕµÓ²FVFvW3ÕµÓ²G7VÓÓ²G7VÓ#Ó²FvÆ&SÓ²FF&³Ó²F&÷&FW$VFvW3Ó²F&÷&FW$6÷VçCÓ°¢f÷"‚G“Ó²G“ÂG6×ÆS²G’²²’f÷"‚GƒÓ²GƒÂG6×ÆS²G‚²²—°¢F3Ö–ÖvV6öÆ÷&B‚GF‡VÖ"ÂG‚ÂG’“²G#Ò‚F3ããb’c#SS²FsÒ‚F3ãã‚’c#SS²F#ÒF2c#SS²GcÒ†–çB—&÷VæB‚ã#“’¢G"²ãSƒr¢Fr²ãB¢F"“²GfÇ5²G•Õ²G…ÓÒGc²G7VÒ³ÒGc²G7VÓ"³ÒGb¢Gc°¢–b‚GcãÓ#CR’FvÆ&R²³²–b‚GcÃÓ#R’FF&²²³°¢–b‚Gƒã—²FCÖ'2‚GbÒGfÇ5²G•Õ²G‚ÓÒ“²FVFvW5µÓÒFC¶–b‚GƒÃWÇÂGƒâG6×ÆRÓWÇÂG“ÃWÇÂG“âG6×ÆRÓR—²F&÷&FW$VFvW2³ÒFC²F&÷&FW$6÷VçB²³·×Ð¢–b‚G“ã—²FCÖ'2‚GbÒGfÇ5²G’ÓÕ²G…Ò“²FVFvW5µÓÒFC¶–b‚GƒÃWÇÂGƒâG6×ÆRÓWÇÂG“ÃWÇÂG“âG6×ÆRÓR—²F&÷&FW$VFvW2³ÒFC²F&÷&FW$6÷VçB²³·×Ð¢Ð¢FãÒG6×ÆR¢G6×ÆS²FÖVãÒG7VÒòFã²Gf&–æ6SÖÖ‚ƒÂG7VÓ"òFâÒFÖVâ¢FÖVâ“²F6öçG&7C×7'B‚Gf&–æ6R“²G6†'Ö6÷VçB‚FVFvW2“ö'&•÷7VÒ‚FVFvW2’ö6÷VçB‚FVFvW2“£°¢FvÆ&U7C×&÷VæB‚FvÆ&R£òFâÃ“²FF&µ7C×&÷VæB‚FF&²£òFâÃ“²FVFvT6÷fW&vSÒF&÷&FW$6÷VçC÷&÷VæB‚F&÷&FW$VFvW2òF&÷&FW$6÷VçBÃ“£°¢F÷WE²v'&–v‡FæW72uÓ×&÷VæB‚FÖVâÃ“²F÷WE²v6öçG&7BuÓ×&÷VæB‚F6öçG&7BÃ“²F÷WE²w6†'æW72uÓ×&÷VæB‚G6†'Ã“²F÷WE²vvÆ&U÷W&6VçBuÓÒFvÆ&U7C²F÷WE²vF&µ÷W&6VçBuÓÒFF&µ7C²F÷WE²vVFvUö6÷fW&vRuÓÒFVFvT6÷fW&vS°¢–b‚FÖVãÃCR—²F÷WE²w66÷&RuÒÓÓ#S²F÷WE²wv&æ–æw2uÕµÓÒ}Š­‹]˜¸Í‹Š‹=¸ÍŠ}‹Š­Š}‹¸Íª’Š}‹=Š¢s²F÷WE²v6†V6·2uÕ²vÆ–v‡F–æruÓÖfÇ6S·Ð¢VÇ6V–b‚FÖVãã##R—²F÷WE²w66÷&RuÒÓÓ#S²F÷WE²wv&æ–æw2uÕµÓÒ}Š­‹]˜¸Í‹Š¸Í‹BŠ}‹"ŠÝŠò‹˜‹M˜bŠ}‹=Š¢s²F÷WE²v6†V6·2uÕ²vÆ–v‡F–æruÓÖfÇ6S·ÖVÇ6W²F÷WE²v6†V6·2uÕ²vÆ–v‡F–æruÓ×G'VS·Ð¢–b‚FvÆ&U7Cã"—²F÷WE²w66÷&RuÒÓÓƒ²F÷WE²wv&æ–æw2uÕµÓÒ}ŠŠ}‹-Š­Š}Š‚˜m˜‹¸ÍŠr‹=˜¸ÍŠý¸Â‹MŠý¸ÍŠò‹˜¸Â˜]Šý‹ª’Šý¸ÍŠý˜r˜]¸Î(Í‹M˜Šòs²F÷WE²v6†V6·2uÕ²vvÆ&RuÓÖfÇ6S·ÖVÇ6W²F÷WE²v6†V6·2uÕ²vvÆ&RuÓ×G'VS·Ð¢–b‚FF&µ7Cã‚—²F÷WE²w66÷&RuÒÓÓ#²F÷WE²wv&æ–æw2uÕµÓÒ}‹=Š}¸Í˜r¸ÍŠr˜mŠ}ŠÝ¸Í˜rŠ‹=¸ÍŠ}‹Š­Š}‹¸Íª’Šý‹Š­‹]˜¸Í‹‹-¸ÍŠ}ŠòŠ}‹=Š¢s²F÷WE²v6†V6·2uÕ²w6†F÷ruÓÖfÇ6S·ÖVÇ6W²F÷WE²v6†V6·2uÕ²w6†F÷ruÓ×G'VS·Ð¢–b‚F6öçG&7CÃ#"—²F÷WE²w66÷&RuÒÓÓƒ²F÷WE²wv&æ–æw2uÕµÓÒ}ª˜mŠ­‹Š}‹=Š¢Š­‹]˜¸Í‹›íŠ}¸Í¸Í˜bŠ}‹=Š¢s²F÷WE²v6†V6·2uÕ²v6öçG&7BuÓÖfÇ6S·ÖVÇ6W²F÷WE²v6†V6·2uÕ²v6öçG&7BuÓ×G'VS·Ð¢–b‚G6†'Ã—²F÷WE²w66÷&RuÒÓÓ3²F÷WE²wv&æ–æw2uÕµÓÒ}Š­‹]˜¸Í‹Š}ŠÝŠ­˜]Š}˜MŠ}˜²Š­Š}‹Š}‹=Š¢s²F÷WE²v6†V6·2uÕ²w6†'æW72uÓÖfÇ6S·ÖVÇ6W²F÷WE²v6†V6·2uÕ²w6†'æW72uÓ×G'VS·Ð¢G&F–óÒFƒò‚GròF‚“£°¢–b‚FFö7VÖVçEG—RÓÒw÷'G&—E÷†÷Fòrbb‚G&F–óÂã‡ÇÂG&F–óã"ãB’—²F÷WE²w66÷&RuÒÓÓ#²F÷WE²wv&æ–æw2uÕµÓÒ}˜m‹=ŠŠ¢Š}Š‹Š}ŠòŠ­‹]˜¸Í‹‹­¸Í‹‹Š}Šý¸ÂŠ}‹=Š­‰²ŠÝ˜Š}‹M¸Â‹Šrª‹Š}›âª˜m¸ÍŠòs²F÷WE²v6†V6·2uÕ²v7V7BuÓÖfÇ6S·ÖVÇ6W²F÷WE²v6†V6·2uÕ²v7V7BuÓ×G'VS·Ð¢–b‚FFö7VÖVçEG—SÓÓÒw÷'G&—E÷†÷Fòrbb‚G&F–óÂãcWÇÂG&F–óãã#R’—²F÷WE²w66÷&RuÒÓÓS²F÷WE²wv&æ–æw2uÕµÓÒ}ªŠ}Šý‹‹ª‹2›í‹‹=˜m˜M¸Â˜]˜mŠ}‹=Š‚˜m¸Í‹=Š¢s²F÷WE²v6†V6·2uÕ²v7V7BuÓÖfÇ6S·Ð¢–b‚FFö7VÖVçEG—RÓÒw÷'G&—E÷†÷FòrbbFVFvT6÷fW&vSÃR—²F÷WE²w66÷&RuÒÓÓ²F÷WE²wv&æ–æw2uÕµÓÒ}˜]Šý‹ª’Š}ŠÝŠ­˜]Š}˜MŠ}˜²Š­˜]Š}˜RªŠ}Šý‹‹Šr›í˜‹M‹B˜mŠýŠ}Šý˜r¸ÍŠrŠÝŠ}‹M¸Í˜rŠ}‹mŠ}˜¸ÂŠýŠ}‹Šòs²F÷WE²v6†V6·2uÕ²v7&÷ö6÷fW&vRuÓÖfÇ6S·ÖVÇ6W²F÷WE²v6†V6·2uÕ²v7&÷ö6÷fW&vRuÓ×G'VS·Ð¢G6÷W&6S×7G'FöÆ÷vW"‚‡7G&–ær’‚F6Æ–VçDÖWF²v6GW&U÷6÷W&6RuÓóòF6Æ–VçDÖWF²w6÷W&6RuÓóòrr’“°¢F—46öÖÖöå67&VVãÖ–åö'&’‚Grâw‚râF‚Å²sƒƒ“#rÂsƒƒ#CrÂsCCƒ#ScrÂss#ƒ#ƒrÂsƒƒ#3CrÂssƒ#S3"rÂs#“ƒ#s“buÒÇG'VR“°¢–b‚G6÷W&6SÓÓÒvÆ–'&'’rbb‚F—46öÖÖöå67&VVâÇÂ‚V×G’‚F6Æ–VçDÖWF²v—5÷67&VVç6†÷BuÒ’’’—°¢F÷WE²vÆ–¶VÇ•÷67&VVç6†÷BuÓ×G'VS²F÷WE²w66÷&RuÒÓÓ#²F÷WE²wv&æ–æw2uÕµÓÒ}Š­‹]˜¸Í‹Š}ŠÝŠ­˜]Š}˜MŠ}˜²Š}‹=ª‹¸Í˜n(Í‹MŠ}Š¢Š}‹=Š­‰²Š}‹"Š}‹]˜B˜]Šý‹ª’‹ª‹2Šªý¸Í‹¸ÍŠòs²F÷WE²v6†V6·2uÕ²v÷&–v–æÅö6GW&RuÓÖfÇ6S°¢ÒVÇ6RF÷WE²v6†V6·2uÕ²v÷&–v–æÅö6GW&RuÓ×G'VS°¢F7&÷ÒF6Æ–VçDÖWF²v7&÷uÓóòF6Æ–VçDÖWF°¢–b†—5ö'&’‚F7&÷’bb—76WB‚F7&÷²vÆVgBuÒÂF7&÷²w&–v‡BuÒÂF7&÷²wF÷uÒÂF7&÷²v&÷GFöÒuÒ’—°¢GG&–ÓÒ†fÆöB’F7&÷²vÆVgBuÒ²†fÆöB’F7&÷²w&–v‡BuÒ²†fÆöB’F7&÷²wF÷uÒ²†fÆöB’F7&÷²v&÷GFöÒuÓ°¢–b‚GG&–ÓÃBbbFFö7VÖVçEG—RÓÒw÷'G&—E÷†÷Fòr—²F÷WE²w66÷&RuÒÓÓS²F÷WE²wv&æ–æw2uÕµÓÒ}ª‹Š}›âŠ­‹]˜¸Í‹Š‹=¸ÍŠ}‹ª˜RŠ}‹=Š­‰²ŠÝŠ}‹M¸Í˜~(Í˜}Š}¸ÂŠ}‹mŠ}˜¸Â‹ŠrŠ‹‹‹=¸Âª˜m¸ÍŠòs·Ð¢Ð¢F÷WE²w66÷&RuÓÖÖ‚ƒÆÖ–âƒÂ†–çB’F÷WE²w66÷&RuÒ’“°¢FvööCÖÖ‚ƒSÆÖ–âƒ“RÂ†–çB•ö6ö×ç•÷6WGF–æuövWB‚wVÆ—G•övööE÷66÷&RrÃs’’“°¢G&Wf–WsÖÖ‚ƒ#ÆÖ–â‚FvööBÓÂ†–çB•ö6ö×ç•÷6WGF–æuövWB‚wVÆ—G•÷&Wf–Wu÷66÷&RrÃCR’’“°¢F÷WE²w7FGW2uÓÒF÷WE²w66÷&RuÓãÒFvööCòvö²s¢‚F÷WE²w66÷&RuÓãÒG&Wf–Wsòwv&æ–ærs¢wö÷"r“°¢–ÖvVFW7G&÷’‚GF‡VÖ"“¶–ÖvVFW7G&÷’‚F–Ò“·&WGW&âF÷WC°§Ð¦gVæ7F–öâö6ö×ç•÷fÆ–FFUö–ÖvU÷–ÆöB‚F&6ScBÂFFö7VÖVçEG—SÒrrÂF6Æ–VçDÖWFÕµÒ—°¢FFFÒ‡7G&–ær’F&6ScC¶–b‡7G%ö6öçF–ç2‚FFFÂrÂr’’FFFÖW‡ÆöFR‚rÂrÂFFFÃ"•³Ó²F&–ãÖ&6ScEöFV6öFR‚FFFÇG'VR“°¢–b‚F&–ãÓÓÖfÇ6WÇÂF&–ãÓÓÒrr’‡GG£¦W'&÷"‚}Š­‹]˜¸Í‹˜]‹Š­Š‹Š}‹‹=Š}˜B˜m‹MŠý˜rŠ}‹=Š¢rÃC#"“°¢Ff“ÖæWrf–æfò„d”ÄT”ädõôÔ”ÔUõE•R“²FÖ–ÖSÒFf’Óæ'VffW"‚F&–â“ó¢vÆ–6F–öâöö7FWB×7G&VÒs°¢–b‚–åö'&’‚FÖ–ÖRÅ²v–ÖvRö§VrrÂv–ÖvR÷ærrÂv–ÖvR÷vV'uÒÇG'VR’’&WGW&â²wVÆ—G’sÓå²w66÷&RsÓãÂw7FGW2sÓâvö²rÂwv&æ–æw2sÓåµÕÒÂvÖ–ÖU÷G—RsÓâFÖ–ÖRÂw6†#SbsÓæ†6‚‚w6†#SbrÂF&–â’Âw6—¦RsÓç7G&ÆVâ‚F&–â•Ó°¢&WGW&â²wVÆ—G’sÓåö6ö×ç•ö–ÖvU÷VÆ—G’‚F&–âÂFFö7VÖVçEG—RÆ—5ö'&’‚F6Æ–VçDÖWF“òF6Æ–VçDÖWF¥µÒ’ÂvÖ–ÖU÷G—RsÓâFÖ–ÖRÂw6†#SbsÓæ†6‚‚w6†#SbrÂF&–â’Âw6—¦RsÓç7G&ÆVâ‚F&–â•Ó°§Ð¦gVæ7F–öâö6ö×ç•÷&ö6W76VEö–ÖvR‚F&–âÂFÖ–ÖRÂFÖ…v–GFƒÓ##ÂGVÆ—G“Óƒ‚—°¢–b‚gVæ7F–öåöW†—7G2‚v–ÖvV7&VFVg&ö×7G&–ærr’’&WGW&â²v&–âsÓâF&–âÂvÖ–ÖRsÓâFÖ–ÖRÂvW‡BsÓâFÖ–ÖSÓÓÒv–ÖvR÷ærsòwærs¢v§ruÓ°¢F–ÓÔ–ÖvV7&VFVg&ö×7G&–ær‚F&–â“¶–b‚F–Ò—&WGW&â²v&–âsÓâF&–âÂvÖ–ÖRsÓâFÖ–ÖRÂvW‡BsÓâFÖ–ÖSÓÓÒv–ÖvR÷ærsòwærs¢v§ruÓ°¢GsÖ–ÖvW7‚‚F–Ò“²FƒÖ–ÖvW7’‚F–Ò“²FçsÖÖ–â‚FÖ…v–GF‚ÂGr“²FæƒÖÖ‚ƒÂ†–çB—&÷VæB‚F‚¢FçröÖ‚ƒÂGr’’“°¢FG7CÖ–ÖvV7&VFWG'VV6öÆ÷"‚FçrÂFæ‚“²Gv†—FSÖ–ÖvV6öÆ÷&ÆÆö6FR‚FG7BÃ#SRÃ#SRÃ#SR“¶–ÖvVf–ÆÂ‚FG7BÃÃÂGv†—FR“¶–ÖvV6÷—&W6×ÆVB‚FG7BÂF–ÒÃÃÃÃÂFçrÂFæ‚ÂGrÂF‚“°¢ö%÷7F'B‚“¶–ÖvV§Vr‚FG7BÆçVÆÂÆÖ‚ƒcÆÖ–âƒ“RÂGVÆ—G’’’“²F÷WCÖö%övWEö6ÆVâ‚“¶–ÖvVFW7G&÷’‚FG7B“¶–ÖvVFW7G&÷’‚F–Ò“°¢&WGW&â²v&–âsÓâF÷WCó¢F&–âÂvÖ–ÖRsÓâv–ÖvRö§VrrÂvW‡BsÓâv§rrÂwv–GF‚sÓâFçrÂv†V–v‡BsÓâFæ…Ó°§Ð §&÷WFR‚uõ5BrÂrö’ö6ö×ç’×&WVW7B÷fÆ–FFRÖFö7VÖVçBrÆgVæ7F–öâ‚GÂF"ÂGR—²&WGW&â²vö²sÓçG'VRÂv66WFVBsÓçG'VRÂwVÆ—G’sÓæçVÆÂÂv6†V6·5öF—6&ÆVBsÓçG'VUÓ²ÒÆfÇ6RÃ“’“°§&÷WFR‚uõ5BrÂrö’ö6ö×ç’ÖFö7VÖVçBöæÇ—¦RrÆgVæ7F–öâ‚GÂF"ÂGR—°¢FFö3×G&–Ò‚‡7G&–ær’‚F%²vFö7VÖVçE÷G—RuÓóòrr’“¶–b‚FFö3ÓÓÒrr”‡GG£¦W'&÷"‚}˜m˜‹’˜]Šý‹ª’Š}˜M‹-Š}˜]¸ÂŠ}‹=Š¢rÃC#"“°¢&WGW&â²vö²sÓçG'VUÒµö6ö×ç•÷fÆ–FFUö–ÖvU÷–ÆöB‚F%²vf–ÆUö&6ScBuÓóòrrÂFFö2ÂF%²v6Æ–VçEöÖWFuÓóõµÒ“°§ÒÆfÇ6RÃ“’“°§&÷WFR‚uõ5BrÂrö’ö6ö×ç’ÖFö7VÖVçB÷fÆ–FFRrÆgVæ7F–öâ‚GÂF"ÂGR—°¢FFö3×G&–Ò‚‡7G&–ær’‚F%²vFö7VÖVçE÷G—RuÓóòrr’“¶–b‚FFö3ÓÓÒrr”‡GG£¦W'&÷"‚}˜m˜‹’˜]Šý‹ª’Š}˜M‹-Š}˜]¸ÂŠ}‹=Š¢rÃC#"“°¢G#Õö6ö×ç•÷fÆ–FFUö–ÖvU÷–ÆöB‚F%²vf–ÆUö&6ScBuÓóòrrÂFFö2ÂF%²v6Æ–VçEöÖWFuÓóõµÒ“²FÖ–ãÖÖ‚ƒ#ÆÖ–âƒ“RÂ†–çB•ö6ö×ç•÷6WGF–æuövWB‚wVÆ—G•öÖ–å÷66÷&RrÃSR’’“°¢&WGW&â²vö²sÓçG'VRÂv66WFVBsÓâ‚‚G%²wVÆ—G’uÕ²w66÷&RuÓóó“ãÒFÖ–â’ÂvÖ–æ–×VÕ÷66÷&RsÓâFÖ–åÒ²G#°§ÒÆfÇ6RÃ“’“°§&÷WFR‚uõ5BrÂrö’ö6ö×ç’ÖFö7VÖVçBöGWÆ–6FRÖ6†V6²rÆgVæ7F–öâ‚GÂF"ÂGR—°¢F†6ƒ×7G'FöÆ÷vW"‡G&–Ò‚‡7G&–ær’‚F%²w6†#SbuÓóòrr’’“²G&WVW7D–CÒ†–çB’‚F%²w&WVW7Eö–BuÓóó“°¢–b‚&VuöÖF6‚‚rõå¶ÖcÓ•×³cGÒBòrÂF†6‚’”‡GG£¦W'&÷"‚}˜}‹BŠ­‹]˜¸Í‹˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÃC#"“°¢G&÷sÔF#£¦öæR‚%4TÄT5Bbæ–BÆbç&WVW7Eö–BÆbæFö7VÖVçE÷G—RÆbæ7&VFVEöBe$ôÒ6ö×ç•÷&WVW7Eöf–ÆW2b¤ô”â6ö×ç•÷&WVW7G2"ôâ"æ–CÖbç&WVW7Eö–Bt„U$Rbç6†#ScÓòäB"çW6W%ö–CÓò"â‚G&WVW7D–CòtäBbç&WVW7Eö–CÃãòs¢rr’â$õ$DU"%’bæ–BDU42Ä”Ô•B"ÂG&WVW7D–Cõ²F†6‚Â†–çB’GU²v–BuÒÂG&WVW7D–EÓ¥²F†6‚Â†–çB’GU²v–BuÕÒ“°¢&WGW&â²vö²sÓçG'VRÂvGWÆ–6FRsÓâ†&ööÂ’G&÷rÂvÖF6‚sÓâG&÷só¦çVÆÅÓ°§ÒÆfÇ6RÃ“’“°§&÷WFR‚uõ5BrÂrö’ö6ö×ç’ÖFö7VÖVçBöf–æÆ—¦RrÆgVæ7F–öâ‚GÂF"ÂGR—°¢G&WÕö6ö×ç•÷&WVW7Eö÷væVB‚†–çB’‚F%²w&WVW7Eö–BuÓóó’ÂGRÆfÇ6R“²FFö73Õö6ö×ç•÷&WV—&VEöFö75÷7FFR‚G&W“°¢Gö÷#ÕµÓ²òòª˜mŠ­‹˜Bª¸Í˜¸ÍŠ¢Š­‹]Š}˜¸Í‹ŠÝ‹˜‹MŠý˜rŠ}‹=Š¢à¢–b‚FFö75²v6ö×ÆWFRuÒ”‡GG£¦W'&÷"‚}˜]ŠýŠ}‹ª’Š}˜M‹-Š}˜]¸ÂªŠ}˜]˜B˜m¸Í‹=Š£¢ræ–×ÆöFR‚}ˆÂrÂFFö75²vÖ—76–æruÒ’ÃC#"“°¢òòŠ‹‹‹=¸Âª¸Í˜¸ÍŠ¢Š­‹]Š}˜¸Í‹Š˜mŠrŠ˜rŠ­˜m‹¸Í˜R‹=Š}˜]Š}˜m˜rŠÝ‹˜‹MŠý˜rŠ}‹=Š¢à¢F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7G24UB7FGW3Ô”b†Ö÷VçCãÂw–ÖVçE÷VæF–ærrÂwVæF–æu÷&Wf–Wrr’t„U$R–CÓò"Å²†–çB’G&W²v–BuÕÒ“°¢ö6ö×ç•öÆör‚†–çB’G&W²v–BuÒÂ†–çB’GU²v–BuÒÂvFö7VÖVçG5öf–æÆ—¦VBrÂ}˜]ŠýŠ}‹ª’Š}‹"˜m‹‹ª¸Í˜¸ÍŠ¢˜m˜}Š}¸Í¸Â‹MŠý˜mŠòrÅ²wö÷%ö6÷VçBsÓæ6÷VçB‚Gö÷"•Ò“°¢&WGW&â²vö²sÓçG'VRÂw7FGW2sÓâ†–çB’G&W²vÖ÷VçBuÓãòw–ÖVçE÷VæF–ærs¢wVæF–æu÷&Wf–WrrÂwVÆ—G•ö—77VW2sÓåµÕÓ°§ÒÆfÇ6RÃ“’“°  ¦gVæ7F–öâö6ö×ç•ö&ÆU÷–ÖVçE÷7F'E÷Fö¶Vâ‚G–ÖVçB—°¢&WGW&âw•òrâ†–çB’G–ÖVçE²v–BuÒâuòrç7V'7G"††6‚‚w6†#SbrÂ‡7G&–ær’G–ÖVçE²v–çfö–6U÷–ÆöBuÒ’ÃÃ"“°§Ð¦gVæ7F–öâö6ö×ç•ö&ÆUö&÷EöÆ–æ²‚G7F'EFö¶VãÒrr—°¢FÆ–æ³×G&–Ò‚‡7G&–ær•ö6ö×ç•÷6WGF–æuövWB‚v&ÆUö&÷EöÆ–æ²rÂrr’“°¢–b‚FÆ–æ³ÓÓÒrr—°¢G'—²G#ÔF#£¦öæR‚%4TÄT5BfÇVRe$ôÒ÷6WGF–æw2t„U$R¶W–Òv&ÆUö&÷EöÆ–æ²r"“²–b‚G"’FÆ–æ³Ò‡7G&–ær’†§6öåöFV6öFR‚G%²wfÇVRuÒÇG'VR“ó¢rr“·Ö6F6‚…F‡&÷v&ÆRFR—·Ð¢Ð¢–b‚FÆ–æ³ÓÓÒrrÇÂG7F'EFö¶VãÓÓÒrr’&WGW&âFÆ–æ³°¢G6W×7G%ö6öçF–ç2‚FÆ–æ²Âsòr“òrbs¢sòs°¢&WGW&âFÆ–æ²âG6Wâw7F'CÒrç&wW&ÆVæ6öFR‚G7F'EFö¶Vâ“°§Ð ¦gVæ7F–öâö6ö×ç•÷–ÖVçEöÆ–æµöÖW76vR‚G–ÖVçBÂF&÷DÆ–æ²—°¢FÖ÷VçCÖçVÖ&W%öf÷&ÖB‚†–çB’‚G–ÖVçE²vÖ÷VçBuÓóó’“°¢&WGW&â-˜M¸Í˜mª’›í‹ŠýŠ}ŠíŠ¢ª¸Í˜›í˜˜BŠ˜M˜uÆíŠý‹Ší˜Š}‹=Š£¢"â‚G–ÖVçE²w&WVW7E÷F—FÆRuÓóòrr’â%ÆíªŠò‹˜}ªý¸Í‹¸Ã¢"â‚G–ÖVçE²w&WVW7E÷G&6¶–æruÓóòrr’â%Æí˜]Š˜M‹£¢²FÖ÷VçGÒ‹¸ÍŠ}˜EÆç²F&÷DÆ–æ·Ò#°§Ð¦gVæ7F–öâö6ö×ç•öFVÆ—fW%÷–ÖVçEöÆ–æ²‚G–ÖVçBÂF&÷DÆ–æ²ÂF6†ææVÃÒv&÷F‚rÂF7F÷$–CÖçVÆÂ—°¢F÷WCÕ²w6×2sÓæfÇ6RÂv&ÆRsÓæfÇ6RÂvW'&÷'2sÓåµÕÓ°¢–b‚G–ÖVçGÇÂF&÷DÆ–æ³ÓÓÒrr’&WGW&âF÷WC°¢F×6sÕö6ö×ç•÷–ÖVçEöÆ–æµöÖW76vR‚G–ÖVçBÂF&÷DÆ–æ²“°¢GW7#ÔF#£¦öæR‚%4TÄT5B†öæRe$ôÒW6W'2t„U$R–CÓò"Å²†–çB’G–ÖVçE²wW6W%ö–BuÕÒ“°¢–b†–åö'&’‚F6†ææVÂÅ²w6×2rÂv&÷F‚uÒÇG'VR’—°¢G'—°¢–b‚V×G’‚GW7%²w†öæRuÒ’bb6×3£¦—4Væ&ÆVB‚’—²G#Õ6×3£§6VæB…²GW7%²w†öæRuÕÒÂF×6rÂv6ö×ç•÷–ÖVçEöÆ–æ²rÂF7F÷$–B“²F÷WE²w6×2uÓÒV×G’‚G%²vö²uÒ—ÇÂG#ÓÓ×G'VS²Ð¢VÇ6RF÷WE²vW'&÷'2uÕµÓÒ}Š}‹‹=Š}˜B›í¸ÍŠ}˜]ª’Š-˜]Š}Šý˜r˜m¸Í‹=Š¢s°¢Ö6F6‚…F‡&÷v&ÆRFR—²F÷WE²vW'&÷'2uÕµÓÒ}›í¸ÍŠ}˜]ª“¢râFRÓævWDÖW76vR‚“²Ð¢Ð¢–b†–åö'&’‚F6†ææVÂÅ²v&ÆRrÂv&÷F‚uÒÇG'VR’—°¢G'—°¢F6†CÔ&ÆT&÷C£¦f–æD6†Df÷%W6W"‚†–çB’G–ÖVçE²wW6W%ö–BuÒ“°¢–b‚F6†B—²G#Ô&ÆT&÷C£§6VæDÖW76vR‚F6†BÂF×6rÅ²wF&vWE÷G—RsÓâv6ö×ç•÷&WVW7E÷–ÖVçBrÂwF&vWEö–BsÓâ†–çB’G–ÖVçE²w&WVW7Eö–BuÕÒ“²F÷WE²v&ÆRuÓÒV×G’‚G%²vö²uÒ—ÇÂG#ÓÓ×G'VS²Ð¢VÇ6RF÷WE²vW'&÷'2uÕµÓÒ}ŠÝ‹=Š}Š‚Š˜M˜rªŠ}‹Š‹˜]Š­‹]˜B˜m¸Í‹=Š¢s°¢Ö6F6‚…F‡&÷v&ÆRFR—²F÷WE²vW'&÷'2uÕµÓÒ}Š˜M˜s¢râFRÓævWDÖW76vR‚“²Ð¢Ð¢&WGW&âF÷WC°§Ð ¦gVæ7F–öâö6ö×ç•ö&ÆU÷6VæEö–çfö–6Uöf÷%÷–ÖVçB‚G–ÖVçBÂF6†D–B—°¢–b‚G–ÖVçB’&WGW&â²vö²sÓæfÇ6RÂvW'&÷"sÓâw–ÖVçEöæ÷Eöf÷VæBuÓ°¢G&÷f–FW#×G&–Ò‚‡7G&–ær•ö6ö×ç•÷6WGF–æuövWB‚v&ÆU÷&÷f–FW%÷Fö¶VârÂrr’“°¢–b‚G&÷f–FW#ÓÓÒrr’&WGW&â²vö²sÓæfÇ6RÂvW'&÷"sÓâw&÷f–FW%÷Fö¶VåöÖ—76–ærrÂvFW67&—F–öâsÓâ}Š­˜ª˜b›í‹ŠýŠ}ŠíŠ¢ª¸Í˜›í˜˜BŠ˜M˜rŠ½ŠŠ¢˜m‹MŠý˜rŠ}‹=Š¢uÓ°¢–b‚6Æ75öW†—7G2‚t&ÆT&÷Br—ÇÂ&ÆT&÷C£¦†5Fö¶Vâ‚’’&WGW&â²vö²sÓæfÇ6RÂvW'&÷"sÓâv&ÆUö&÷E÷Fö¶VåöÖ—76–ærrÂvFW67&—F–öâsÓâ}Š­˜ª˜bŠŠ}‹-˜¸ÂŠ˜M˜rŠ½ŠŠ¢˜m‹MŠý˜rŠ}‹=Š¢uÓ°¢G†÷FóÒ‡7G&–ær•ö6ö×ç•÷6WGF–æuövWB‚v&ÆUö–çfö–6U÷†÷Fõ÷W&ÂrÂrr“°¢G&W3Ô&ÆT&÷C£§6VæD–çfö–6R‚‡7G&–ær’F6†D–BÆÖ%÷7V'7G"‚‡7G&–ær’G–ÖVçE²w&WVW7E÷F—FÆRuÒÃÃ3"’Â}˜}‹-¸Í˜m˜rŠý‹Ší˜Š}‹=Š¢râG–ÖVçE²w&WVW7E÷G&6¶–æruÒârŠý‹‹=Š}˜]Š}˜m˜rŠí‹}¸ÍŠ}‹rÂ‡7G&–ær’G–ÖVçE²v–çfö–6U÷–ÆöBuÒÂ†–çB’G–ÖVçE²vÖ÷VçBuÒÂG&÷f–FW"ÂG†÷FòÃ2“°¢–b†V×G’‚G&W5²vö²uÒ’—°¢FW'#Ò‡7G&–ær’‚G&W5²vFW67&—F–öâuÓóòG&W5²vW'&÷"uÓóòv–çfö–6U÷6VæEöf–ÆVBr“°¢F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7E÷–ÖVçG24UB7FGW3Òvf–ÆVBrÆÆ7EöW'&÷#ÓòÇ&u÷–ÆöCÓòt„U$R–CÓò"Å²FW'"Æ§6öåöVæ6öFR‚G&W2Ä¥4ôåõTäU44TEõTä”4ôDR’Â†–çB’G–ÖVçE²v–BuÕÒ“°¢&WGW&âG&W3°¢Ð¢FÖW76vT–CÒG&W5²w&W7VÇBuÕ²vÖW76vUö–BuÓóòG&W5²vÖW76vUö–BuÓóöçVÆÃ°¢F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7E÷–ÖVçG24UB7FGW3ÒwVæF–ærrÆ–çfö–6UöÖW76vUö–CÓòÆ–çfö–6U÷6VçEöCÔäõr‚’ÆÆ7EöW'&÷#ÔåTÄÂÇ&u÷–ÆöCÓòt„U$R–CÓò"Å²FÖW76vT–BÆ§6öåöVæ6öFR‚G&W2Ä¥4ôåõTäU44TEõTä”4ôDR’Â†–çB’G–ÖVçE²v–BuÕÒ“°¢F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7G24UB–ÖVçEöÖWF†öCÒv&ÆU÷vÆÆWBrÇ–ÖVçE÷7FGW3ÒwVæF–ærrÇ7FGW3Òw–ÖVçE÷VæF–ærrt„U$R–CÓò"Å²†–çB’G–ÖVçE²w&WVW7Eö–BuÕÒ“°¢ö6ö×ç•öÆör‚†–çB’G–ÖVçE²w&WVW7Eö–BuÒÂ†–çB’G–ÖVçE²wW6W%ö–BuÒÂv&ÆUö–çfö–6U÷6VçBrÂ}‹]˜‹Š­ŠÝ‹=Š}Š‚Š˜M˜rŠ}‹‹=Š}˜B‹MŠòrÅ²w–ÖVçEö–BsÓâ†–çB’G–ÖVçE²v–BuÒÂvÖW76vUö–BsÓâFÖW76vT–EÒ“°¢&WGW&â²vö²sÓçG'VRÂvÖW76vUö–BsÓâFÖW76vT–BÂw&W7öç6RsÓâG&W5Ó°§Ð ¦gVæ7F–öâö6ö×ç•÷–ÖVçEö'•÷–ÆöB‚G–ÆöB—²&WGW&âF#£¦öæR‚%4TÄT5Bâ¢Ç"çW6W%ö–BÇ"ç7FGW2&WVW7E÷7FGW2Ç"ç–ÖVçE÷7FGW2&WVW7E÷–ÖVçE÷7FGW2Ç"çG&6¶–æuö6öFR&WVW7E÷G&6¶–ærÇ'BçF—FÆR&WVW7E÷F—FÆRe$ôÒ6ö×ç•÷&WVW7E÷–ÖVçG2¤ô”â6ö×ç•÷&WVW7G2"ôâ"æ–C×ç&WVW7Eö–B¤ô”â6ö×ç•÷&WVW7E÷G—W2'Bôâ'Bæ–C×"ç&WVW7E÷G—Uö–Bt„U$Ræ–çfö–6U÷–ÆöCÓòõ$DU"%’æ–BDU42Ä”Ô•B"Å²‡7G&–ær’G–ÆöEÒ“²Ð ¦gVæ7F–öâö6ö×ç•÷–ÖVçEögVÆÂ‚F–B—°¢&WGW&âF#£¦öæR‚%4TÄT5Bâ¢Ç"çW6W%ö–BÇ"ç7FGW2&WVW7E÷7FGW2Ç"ç–ÖVçE÷7FGW2&WVW7E÷–ÖVçE÷7FGW2Ç"çG&6¶–æuö6öFR&WVW7E÷G&6¶–ærÇ'BçF—FÆR&WVW7E÷F—FÆRe$ôÒ6ö×ç•÷&WVW7E÷–ÖVçG2¤ô”â6ö×ç•÷&WVW7G2"ôâ"æ–C×ç&WVW7Eö–B¤ô”â6ö×ç•÷&WVW7E÷G—W2'Bôâ'Bæ–C×"ç&WVW7E÷G—Uö–Bt„U$Ræ–CÓò"Å²†–çB’F–EÒ“°§Ð¦gVæ7F–öâö6ö×ç•÷–ÖVçEöÖ&µ÷–B‚G–ÖVçBÂG7ÕµÒÂG6÷W&6SÒwvV&†öö²r—°¢–b‚G–ÖVçB’&WGW&âfÇ6S°¢Fg&W6ƒÕö6ö×ç•÷–ÖVçEögVÆÂ‚†–çB’G–ÖVçE²v–BuÒ“°¢–b‚Fg&W6‚’&WGW&âfÇ6S°¢–b‚‚Fg&W6…²w7FGW2uÓóòrr“ÓÓÒw–Br—°¢F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7G24UB–ÖVçEöÖWF†öCÒv&ÆU÷vÆÆWBrÇ–ÖVçE÷7FGW3Òw–BrÇ7FGW3Ô”b‡7FGW2”â‚vG&gBrÂvFö7VÖVçG5÷VæF–ærrÂw–ÖVçE÷VæF–ærr’ÂwVæF–æu÷&Wf–WrrÇ7FGW2’ÇWFFVEöCÔäõr‚’t„U$R–CÓò"Å²†–çB’Fg&W6…²w&WVW7Eö–BuÕÒ“°¢&WGW&âG'VS°¢Ð¢GG&ç67F–öãÒ‡7G&–ær’‚G7²v&ÆU÷–ÖVçEö6†&vUö–BuÓóòG7²wFVÆVw&Õ÷–ÖVçEö6†&vUö–BuÓóòG7²w–ÖVçEö6†&vUö–BuÓóòG7²v–BuÓóòFg&W6…²wG&ç67F–öåö–BuÓóòrr“°¢G&÷f–FW#Ò‡7G&–ær’‚G7²w&÷f–FW%÷–ÖVçEö6†&vUö–BuÓóòG7²w&÷f–FW%ö6†&vUö–BuÓóòFg&W6…²w&÷f–FW%÷G&ç67F–öåö–BuÓóòrr“°¢F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7E÷–ÖVçG24UB7FGW3Òw–BrÇG&ç67F–öåö–CÓòÇ&÷f–FW%÷G&ç67F–öåö–CÓòÇFVÆVw&Õ÷–ÖVçEö6†&vUö–CÓòÇfW&–f–VEöCÔäõr‚’ÆÆ7EöW'&÷#ÔåTÄÂÇ&u÷–ÆöCÓòt„U$R–CÓò"Å²GG&ç67F–öãó¦çVÆÂÂG&÷f–FW#ó¦çVÆÂÂGG&ç67F–öãó¦çVÆÂÆ§6öåöVæ6öFR‚G7Ä¥4ôåõTäU44TEõTä”4ôDR’Â†–çB’Fg&W6…²v–BuÕÒ“°¢F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7G24UB–ÖVçEöÖWF†öCÒv&ÆU÷vÆÆWBrÇ–ÖVçE÷7FGW3Òw–BrÇ7FGW3ÒwVæF–æu÷&Wf–WrrÇWFFVEöCÔäõr‚’t„U$R–CÓò"Å²†–çB’Fg&W6…²w&WVW7Eö–BuÕÒ“°¢ö6ö×ç•öÆör‚†–çB’Fg&W6…²w&WVW7Eö–BuÒÂ†–çB’Fg&W6…²wW6W%ö–BuÒÂv&ÆU÷–ÖVçE÷7V66W72rÂ}›í‹ŠýŠ}ŠíŠ¢ª¸Í˜›í˜˜BŠ˜M˜rŠŠr˜]˜˜˜-¸ÍŠ¢Š}˜mŠÍŠ}˜R‹MŠòrÅ²w–ÖVçEö–BsÓâ†–çB’Fg&W6…²v–BuÒÂw&÷f–FW%ö6†&vUö–BsÓâG&÷f–FW"Âw6÷W&6RsÓâG6÷W&6UÒ“°¢&WGW&âG'VS°§Ð¦gVæ7F–öâö6ö×ç•÷–ÖVçEö–çV—&R‚G–ÖVçB—°¢–b‚G–ÖVçB’&WGW&â²vö²sÓæfÇ6RÂvW'&÷"sÓâw–ÖVçEöæ÷Eöf÷VæBuÓ°¢GGƒ×G&–Ò‚‡7G&–ær’‚G–ÖVçE²w&÷f–FW%÷G&ç67F–öåö–BuÓóòG–ÖVçE²wG&ç67F–öåö–BuÓóòrr’“°¢–b‚GGƒÓÓÒrr’&WGW&â²vö²sÓçG'VRÂw7FGW2sÓâ‡7G&–ær’‚G–ÖVçE²w7FGW2uÓóòwVæF–ærr’Âv–çV—&VBsÓæfÇ6RÂw&V6öâsÓâwG&ç67F–öåö–Eöæ÷Eöf–Æ&ÆRuÓ°¢G&W3Ô&ÆT&÷C£¦–çV—&UG&ç67F–öâ‚GG‚“°¢F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7E÷–ÖVçG24UB–çV—'•ö6÷VçCÔ4ôÄU44R†–çV—'•ö6÷VçBÃ’³ÆÆ7Eö–çV—&VEöCÔäõr‚’ÆÆ7EöW'&÷#ÓòÇ&u÷–ÆöCÓòt„U$R–CÓò"Å¶V×G’‚G&W5²vö²uÒ“ò‡7G&–ær’‚G&W5²vFW67&—F–öâuÓóòG&W5²vW'&÷"uÓóòv–çV—'•öf–ÆVBr“¦çVÆÂÆ§6öåöVæ6öFR‚G&W2Ä¥4ôåõTäU44TEõTä”4ôDR’Â†–çB’G–ÖVçE²v–BuÕÒ“°¢FFFÒG&W5²w&W7VÇBuÓóòG&W5²wG&ç67F–öâuÓóòG&W3°¢G7FGW3×7G'FöÆ÷vW"‚‡7G&–ær’‚FFF²w7FGW2uÓóòrr’“°¢–b‚G7FGW3ÓÓÒw–Br—°¢FÖ÷VçCÒ†–çB’‚FFF²vÖ÷VçBuÓóòG–ÖVçE²vÖ÷VçBuÒ“°¢–b‚FÖ÷VçCÓÓÒ†–çB’G–ÖVçE²vÖ÷VçBuÒ’ö6ö×ç•÷–ÖVçEöÖ&µ÷–B‚G–ÖVçBÅ²v–BsÓâGG‚Âw&÷f–FW%÷–ÖVçEö6†&vUö–BsÓâGG‚Âv–çV—'’sÓâFFFÒÂv–çV—&UG&ç67F–öâr“°¢ÒVÇ6V–b†–åö'&’‚G7FGW2Å²vf–ÆVBrÂw&V¦V7FVBuÒÇG'VR’’°¢F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7E÷–ÖVçG24UB7FGW3ÓòÆÆ7EöW'&÷#Óòt„U$R–CÓò"Å²G7FGW2Â}˜‹m‹¸ÍŠ¢Š­‹Š}ª˜m‹BŠý‹Š}‹=Š­‹˜MŠ}˜S¢râG7FGW2Â†–çB’G–ÖVçE²v–BuÕÒ“°¢F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7G24UB–ÖVçE÷7FGW3ÒwVç–BrÇ7FGW3Òw–ÖVçE÷VæF–ærrt„U$R–CÓò"Å²†–çB’G–ÖVçE²w&WVW7Eö–BuÕÒ“°¢Ð¢&WGW&â²vö²sÓâV×G’‚G&W5²vö²uÒ’Âw7FGW2sÓâG7FGW3ó¢‚G–ÖVçE²w7FGW2uÓóòwVæF–ærr’Âv–çV—&VBsÓçG'VRÂw&W7öç6RsÓâG&W5Ó°§Ð ¦gVæ7F–öâö6ö×ç•öF–v—G2‚Gb—°¢&WGW&â&Vu÷&WÆ6R‚rõµãÓ•ÒòrÂrrÇ7G'G"‚‡7G&–ær’GbÅ²}»sÓâsrÂ}»sÓâsrÂ}»"sÓâs"rÂ}»2sÓâs2rÂ}»BsÓâsBrÂ}»RsÓâsRrÂ}»bsÓâsbrÂ}»rsÓâsrrÂ}»‚sÓâs‚rÂ}»’sÓâs’rÂ}šsÓâsrÂ}šsÓâsrÂ}š"sÓâs"rÂ}š2sÓâs2rÂ}šBsÓâsBrÂ}šRsÓâsRrÂ}šbsÓâsbrÂ}šrsÓâsrrÂ}š‚sÓâs‚rÂ}š’sÓâs’uÒ’“°§Ð¦gVæ7F–öâö6ö×ç•ö6Æ–VçEö—‚—°¢f÷&V6‚…²t…EEô4eô4ôääT5D”äuô•rÂt…EEõ…õ$TÅô•rÂt…EEõ…ôdõ%t$DTEôdõ"rÂu$TÔõDUôDE"uÒ2F²—°¢Gc×G&–Ò‚‡7G&–ær’‚Eõ4U%dU%²FµÓóòrr’“²–b‚GcÓÓÒrr’6öçF–çVS²Gc×G&–Ò†W‡ÆöFR‚rÂrÂGb•³Ò“²–b†f–ÇFW%÷f"‚GbÄd”ÅDU%õdÄ”DDUô•’’&WGW&âGc°¢Ð¢&WGW&ârs°§Ð¦gVæ7F–öâö6ö×ç•ö6&E÷–ÖVçEögVÆÂ‚G–ÖVçD–B—°¢&WGW&âF#£¦öæR‚%4TÄT5B7â¢ÇæÖWF†öBÇæ7W'&Væ7’Çç7FGW2–ÖVçE÷7FGW2Çç&V¦V7F–öå÷&V6öâÇç–W%öæ÷FRÇ"çG&6¶–æuö6öFR&WVW7E÷G&6¶–ærÇ"çW6W%ö–B&WVW7E÷W6W%ö–BÇ"ç7FGW2&WVW7E÷7FGW2Ç"ç–ÖVçE÷7FGW2&WVW7E÷–ÖVçE÷7FGW2Ç'BçF—FÆR&WVW7E÷F—FÆRe$ôÒ6ö×ç•ö6&E÷–ÖVçG27¤ô”â6ö×ç•÷&WVW7E÷–ÖVçG2ôâæ–CÖ7ç–ÖVçEö–B¤ô”â6ö×ç•÷&WVW7G2"ôâ"æ–CÖ7ç&WVW7Eö–B¤ô”â6ö×ç•÷&WVW7E÷G—W2'Bôâ'Bæ–C×"ç&WVW7E÷G—Uö–Bt„U$R7ç–ÖVçEö–CÓò"Å²†–çB’G–ÖVçD–EÒ“°§Ð¦gVæ7F–öâö6ö×ç•ö6&E÷&V6V—Eö÷væVB‚G&WVW7D–BÂFf–ÆT–BÂGFƒÒrr—°¢–b‚Ff–ÆT–B—²FcÔF#£¦öæR‚%4TÄT5B¢e$ôÒ6ö×ç•÷&WVW7Eöf–ÆW2t„U$R–CÓòäB&WVW7Eö–CÓòäBFö7VÖVçE÷G—SÒv6&E÷Fõö6&E÷&V6V—Br"Å²†–çB’Ff–ÆT–BÂ†–çB’G&WVW7D–EÒ“²–b‚Fb—&WGW&âFc·Ð¢–b‚GF‚ÓÒrr—²FcÔF#£¦öæR‚%4TÄT5B¢e$ôÒ6ö×ç•÷&WVW7Eöf–ÆW2t„U$R&WVW7Eö–CÓòäBf–ÆU÷FƒÓòäBFö7VÖVçE÷G—SÒv6&E÷Fõö6&E÷&V6V—Brõ$DU"%’–BDU42Ä”Ô•B"Å²†–çB’G&WVW7D–BÂ‡7G&–ær’GF…Ò“¶–b‚Fb—&WGW&âFc·Ð¢&WGW&âçVÆÃ°§Ð¦gVæ7F–öâö6ö×ç•ö6&E÷7V&Ö—B‚G&WÂGRÂF"ÂG&W7V&Ö—E–ÖVçD–CÓ—°¢–b‚†&ööÂ•ö6ö×ç•÷6WGF–æuövWB‚v6&E÷–ÖVçEöVæ&ÆVBrÇG'VR’’‡GG£¦W'&÷"‚}›í‹ŠýŠ}ŠíŠ¢ªŠ}‹Š®(ÍŠ˜~(ÍªŠ}‹Š¢‹­¸Í‹˜‹Š}˜BŠ}‹=Š¢rÃC#"“°¢GG&6¶–æsÕö6ö×ç•öF–v—G2‚F%²wG&6¶–æuö6öFRuÓóòF%²wG&6¶–æuöçVÖ&W"uÓóòrr“°¢FÖ–ãÖÖ‚ƒBÂ†–çB•ö6ö×ç•÷6WGF–æuövWB‚v6&E÷G&6¶–æuöÖ–åöÆVæwF‚rÃb’“²FÖƒÖÖ‚‚FÖ–âÂ†–çB•ö6ö×ç•÷6WGF–æuövWB‚v6&E÷G&6¶–æuöÖ…öÆVæwF‚rÃ3’“°¢–b‚†&ööÂ•ö6ö×ç•÷6WGF–æuövWB‚v6&E÷&WV—&U÷G&6¶–ærrÇG'VR’bb‡7G&ÆVâ‚GG&6¶–ær“ÂFÖ–çÇÇ7G&ÆVâ‚GG&6¶–ær“âFÖ‚’’‡GG£¦W'&÷"‚-‹M˜]Š}‹˜r›í¸Íªý¸Í‹¸ÂŠŠ}¸ÍŠòŠ¸Í˜bFÖ–âŠ­ŠrFÖ‚‹˜-˜RŠŠ}‹MŠò"ÃC#"“°¢FFV6Æ&VCÒ†–çB—&Vu÷&WÆ6R‚rõµãÓ•ÒòrÂrrÂ‡7G&–ær’‚F%²vÖ÷VçBuÓóòF%²vFV6Æ&VEöÖ÷VçBuÓóòG&W²vÖ÷VçBuÒ’“°¢FW‡V7FVCÒ†–çB’G&W²vÖ÷VçBuÓ²GFöÃÖÖ‚ƒÂ†–çB•ö6ö×ç•÷6WGF–æuövWB‚v6&EöÖ÷VçE÷FöÆW&æ6RrÃ’“°¢–b‚†&ööÂ•ö6ö×ç•÷6WGF–æuövWB‚v6&E÷&WV—&UöÖ÷VçBrÇG'VR’bb'2‚FFV6Æ&VBÒFW‡V7FVB“âGFöÂ’‡GG£¦W'&÷"‚}˜]Š˜M‹¢Š½ŠŠ®(Í‹MŠý˜rŠŠrŠ­‹‹˜˜rŠý‹Ší˜Š}‹=Š¢˜]‹}Š}Š˜-Š¢˜mŠýŠ}‹ŠòrÃC#"“°¢G–DC×G&–Ò‚‡7G&–ær’‚F%²w–EöBuÓóòrr’“°¢–b‚†&ööÂ•ö6ö×ç•÷6WGF–æuövWB‚v6&E÷&WV—&U÷–EöBrÇG'VR’bbG–DCÓÓÒrr’‡GG£¦W'&÷"‚}Š­Š}‹¸ÍŠâ˜‚‹=Š}‹Š¢›í‹ŠýŠ}ŠíŠ¢Š}˜M‹-Š}˜]¸ÂŠ}‹=Š¢rÃC#"“°¢–b‚G–DBÓÒrr—·G'—²FGCÖæWrFFUF–ÖR‚G–DB“²G–DCÒFGBÓæf÷&ÖB‚u’ÖÒÖBƒ¦“§2r“·Ö6F6‚…F‡&÷v&ÆRFR—´‡GG£¦W'&÷"‚}Š­Š}‹¸ÍŠâ˜‚‹=Š}‹Š¢›í‹ŠýŠ}ŠíŠ¢˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÃC#"“·×Ð¢G&V6V—D–CÒ†–çB’‚F%²w&V6V—Eöf–ÆUö–BuÓóó“²G&V6V—EFƒ×G&–Ò‚‡7G&–ær’‚F%²w&V6V—Eöf–ÆU÷F‚uÓóòrr’“²Ff–ÆSÕö6ö×ç•ö6&E÷&V6V—Eö÷væVB‚†–çB’G&W²v–BuÒÂG&V6V—D–BÂG&V6V—EF‚“°¢–b‚Ff–ÆR’‡GG£¦W'&÷"‚}Š­‹]˜¸Í‹‹‹=¸ÍŠò˜]‹Š­Š‹˜‚˜]Š­‹˜M˜"Š˜r˜}˜]¸Í˜bŠý‹Ší˜Š}‹=Š¢¸ÍŠ}˜Š¢˜m‹MŠòrÃC#"“°¢FGWÔF#£¦öæR‚%4TÄT5B–BÇ–ÖVçEö–BÇ&WVW7Eö–Be$ôÒ6ö×ç•ö6&E÷–ÖVçG2t„U$RG&6¶–æuöçVÖ&W#Óò"Å²GG&6¶–æuÒ“°¢–b‚FGWbb‚G&W7V&Ö—E–ÖVçD–BÇÂ†–çB’FGW²w–ÖVçEö–BuÒÓÒG&W7V&Ö—E–ÖVçD–B’’‡GG£¦W'&÷"‚}Š}¸Í˜b‹M˜]Š}‹˜r›í¸Íªý¸Í‹¸Â˜-Š˜MŠ}˜²Š½ŠŠ¢‹MŠý˜rŠ}‹=Š¢rÃC’“°¢F&æ³×G&–Ò‚‡7G&–ær’‚F%²v&æµöæÖRuÓóòrr’“²FFWf–6S×G&–Ò‚‡7G&–ær’‚F%²vFWf–6Uö–BuÓóòrr’“²F—Õö6ö×ç•ö6Æ–VçEö—‚“²Fæ÷FS×G&–Ò‚‡7G&–ær’‚F%²væ÷FRuÓóòrr’“°¢–b‚G&W7V&Ö—E–ÖVçD–B—°¢FöÆCÔF#£¦öæR‚%4TÄT5B¢e$ôÒ6ö×ç•÷&WVW7E÷–ÖVçG2t„U$R–CÓòäB&WVW7Eö–CÓòäBÖWF†öCÒv6&E÷Fõö6&Br"Å²G&W7V&Ö—E–ÖVçD–BÂ†–çB’G&W²v–BuÕÒ“¶–b‚FöÆB”‡GG£¦W'&÷"‚}›í‹ŠýŠ}ŠíŠ¢˜-Š˜M¸Â¸ÍŠ}˜Š¢˜m‹MŠòrÃCB“¶–b‚–åö'&’‚FöÆE²w7FGW2uÒÅ²w&V¦V7FVBrÂwVæF–ærrÂvf–ÆVBuÒÇG'VR’”‡GG£¦W'&÷"‚}Š}¸Í˜b›í‹ŠýŠ}ŠíŠ¢˜-Š}Š˜BŠ}‹‹=Š}˜B˜]ŠÍŠýŠò˜m¸Í‹=Š¢rÃC#"“°¢F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7E÷–ÖVçG24UBÖ÷VçCÓòÆFV6Æ&VEöÖ÷VçCÓòÇ7FGW3ÒwVæF–ærrÇG&6¶–æuö6öFSÓòÇ&V6V—Eöf–ÆUö–CÓòÇ&V6V—Eöf–ÆU÷FƒÓòÇ–EöCÓòÆ&æµöæÖSÓòÆFWf–6Uö–CÓòÇ7V&Ö—GFVEö—ÓòÇ–W%öæ÷FSÓòÇ&V¦V7F–öå÷&V6öãÔåTÄÂÇfW&–f–VEö'“ÔåTÄÂÇfW&–f–VEöCÔåTÄÂÇ&Wf–Wuöæ÷FSÔåTÄÂÇ&u÷–ÆöCÓòt„U$R–CÓò"Å²FW‡V7FVBÂFFV6Æ&VBÂGG&6¶–ærÂ†–çB’Ff–ÆU²v–BuÒÂFf–ÆU²vf–ÆU÷F‚uÒÂG–DCó¦çVÆÂÂF&æ³ó¦çVÆÂÂFFWf–6Só¦çVÆÂÂF—ó¦çVÆÂÂFæ÷FSó¦çVÆÂÆ§6öåöVæ6öFR‚F"Ä¥4ôåõTäU44TEõTä”4ôDR’ÂG&W7V&Ö—E–ÖVçD–EÒ“°¢F#£¦W†V2‚$”å4U%B”åDò6ö×ç•ö6&E÷–ÖVçG2‡–ÖVçEö–BÇ&WVW7Eö–BÇW6W%ö–BÆÖ÷VçBÆFV6Æ&VEöÖ÷VçBÆ6&EöçVÖ&W"ÇG&6¶–æuöçVÖ&W"Æ&æµöæÖRÇ–EöBÇ&V6V—Eöf–ÆUö–BÇ&V6V—Eöf–ÆU÷F‚Ç7FGW2ÆFWf–6Uö–BÇ7V&Ö—GFVEö—’dÅTU2ƒòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃò’ôâEUÄ”4DR´U’UDDRÖ÷VçCÕdÅTU2†Ö÷VçB’ÆFV6Æ&VEöÖ÷VçCÕdÅTU2†FV6Æ&VEöÖ÷VçB’Æ6&EöçVÖ&W#ÕdÅTU2†6&EöçVÖ&W"’ÇG&6¶–æuöçVÖ&W#ÕdÅTU2‡G&6¶–æuöçVÖ&W"’Æ&æµöæÖSÕdÅTU2†&æµöæÖR’Ç–EöCÕdÅTU2‡–EöB’Ç&V6V—Eöf–ÆUö–CÕdÅTU2‡&V6V—Eöf–ÆUö–B’Ç&V6V—Eöf–ÆU÷FƒÕdÅTU2‡&V6V—Eöf–ÆU÷F‚’Ç7FGW3ÒwVæF–ærrÆFWf–6Uö–CÕdÅTU2†FWf–6Uö–B’Ç7V&Ö—GFVEö—ÕdÅTU2‡7V&Ö—GFVEö—’Ç&Wf–WvVEö'“ÔåTÄÂÇ&Wf–WvVEöCÔåTÄÂÇ&V¦V7E÷&V6öãÔåTÄÂ"Å²G&W7V&Ö—E–ÖVçD–BÂ†–çB’G&W²v–BuÒÂ†–çB’GU²v–BuÒÂFW‡V7FVBÂFFV6Æ&VBÂ‡7G&–ær•ö6ö×ç•÷6WGF–æuövWB‚v6&EöçVÖ&W"rÂrr’ÂGG&6¶–ærÂF&æ³ó¦çVÆÂÂG–DCó¦çVÆÂÂ†–çB’Ff–ÆU²v–BuÒÂFf–ÆU²vf–ÆU÷F‚uÒÂwVæF–ærrÂFFWf–6Só¦çVÆÂÂF—ó¦çVÆÅÒ“°¢G–CÒG&W7V&Ö—E–ÖVçD–C²F7F–öãÒv6&E÷–ÖVçE÷&W7V&Ö—GFVBs²FFW63Ò}‹‹=¸ÍŠòªŠ}‹Š®(ÍŠ˜~(ÍªŠ}‹Š¢˜]ŠÍŠýŠýŠ}˜²Š}‹‹=Š}˜B‹MŠòs°¢ÒVÇ6R°¢G–CÔF#£¦–ç6W'B‚$”å4U%B”åDò6ö×ç•÷&WVW7E÷–ÖVçG2‡&WVW7Eö–BÆÖWF†öBÆÖ÷VçBÆFV6Æ&VEöÖ÷VçBÇ7FGW2ÇG&6¶–æuö6öFRÇ&V6V—Eöf–ÆUö–BÇ&V6V—Eöf–ÆU÷F‚Ç–EöBÆ&æµöæÖRÆFWf–6Uö–BÇ7V&Ö—GFVEö—Ç–W%öæ÷FRÇ&u÷–ÆöB’dÅTU2ƒòÃòÃòÃòÂwVæF–ærrÃòÃòÃòÃòÃòÃòÃòÃòÃò’"Å²†–çB’G&W²v–BuÒÂv6&E÷Fõö6&BrÂFW‡V7FVBÂFFV6Æ&VBÂGG&6¶–ærÂ†–çB’Ff–ÆU²v–BuÒÂFf–ÆU²vf–ÆU÷F‚uÒÂG–DCó¦çVÆÂÂF&æ³ó¦çVÆÂÂFFWf–6Só¦çVÆÂÂF—ó¦çVÆÂÂFæ÷FSó¦çVÆÂÆ§6öåöVæ6öFR‚F"Ä¥4ôåõTäU44TEõTä”4ôDR•Ò“°¢F#£¦–ç6W'B‚$”å4U%B”åDò6ö×ç•ö6&E÷–ÖVçG2‡–ÖVçEö–BÇ&WVW7Eö–BÇW6W%ö–BÆÖ÷VçBÆFV6Æ&VEöÖ÷VçBÆ6&EöçVÖ&W"ÇG&6¶–æuöçVÖ&W"Æ&æµöæÖRÇ–EöBÇ&V6V—Eöf–ÆUö–BÇ&V6V—Eöf–ÆU÷F‚Ç7FGW2ÆFWf–6Uö–BÇ7V&Ö—GFVEö—’dÅTU2ƒòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃò’"Å²G–BÂ†–çB’G&W²v–BuÒÂ†–çB’GU²v–BuÒÂFW‡V7FVBÂFFV6Æ&VBÂ‡7G&–ær•ö6ö×ç•÷6WGF–æuövWB‚v6&EöçVÖ&W"rÂrr’ÂGG&6¶–ærÂF&æ³ó¦çVÆÂÂG–DCó¦çVÆÂÂ†–çB’Ff–ÆU²v–BuÒÂFf–ÆU²vf–ÆU÷F‚uÒÂwVæF–ærrÂFFWf–6Só¦çVÆÂÂF—ó¦çVÆÅÒ“°¢F7F–öãÒv6&E÷–ÖVçE÷7V&Ö—GFVBs²FFW63Ò}‹‹=¸ÍŠòªŠ}‹Š®(ÍŠ˜~(ÍªŠ}‹Š¢Š½ŠŠ¢‹MŠòs°¢Ð¢F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7G24UB–ÖVçEöÖWF†öCÒv6&E÷Fõö6&BrÇ–ÖVçE÷7FGW3ÒwVæF–ærrÇ7FGW3Òw–ÖVçE÷VæF–ærrt„U$R–CÓò"Å²†–çB’G&W²v–BuÕÒ“°¢ö6ö×ç•öÆör‚†–çB’G&W²v–BuÒÂ†–çB’GU²v–BuÒÂF7F–öâÂFFW62Å²w–ÖVçEö–BsÓâG–BÂwG&6¶–æuö6öFRsÓâGG&6¶–ærÂvFV6Æ&VEöÖ÷VçBsÓâFFV6Æ&VBÂw–EöBsÓâG–DBÂv&æµöæÖRsÓâF&æ²Âw7V&Ö—GFVEö—sÓâF—Ò“°¢Fg&W6ƒÕö6ö×ç•÷&WVW7Eö÷væVB‚†–çB’G&W²v–BuÒÂGRÆfÇ6R“²ö6ö×ç•öæ÷F–g•öFÖ–ç2‚Fg&W6‚Â}‹‹=¸ÍŠòªŠ}‹Š®(ÍŠ˜~(ÍªŠ}‹Š¢ŠÍŠý¸ÍŠòrÂ}ªŠò‹˜}ªý¸Í‹¸ÂŠý‹Ší˜Š}‹=Š£¢râFg&W6…²wG&6¶–æuö6öFRuÒâ%Æâ"â}‹M˜]Š}‹˜r›í¸Íªý¸Í‹¸Ã¢râGG&6¶–ærÅ²vWfVçBsÓâF7F–öâÂw–ÖVçEö–BsÓâG–EÒ“°¢&WGW&â²vö²sÓçG'VRÂw–ÖVçEö–BsÓâG–BÂw7FGW2sÓâwVæF–ærrÂw&WVW7E÷7FGW2sÓâw–ÖVçE÷VæF–ærrÂwG&6¶–æuö6öFRsÓâGG&6¶–æuÓ°§Ð ¦gVæ7F–öâö6ö×ç•÷&WVW7Eö÷væVB‚F–BÂGRÂFFÖ–ãÖfÇ6R—°¢G&÷sÔF#£¦öæR‚%4TÄT5B7"â¢Æ7'Bæ6öFR&WVW7E÷G—Uö6öFRÆ7'BçF—FÆR&WVW7E÷G—U÷F—FÆRÆ7'Bç&WV—&VEöf–VÆG2Æ7'Bç&WV—&VEöFö7VÖVçG2e$ôÒ6ö×ç•÷&WVW7G27"¤ô”â6ö×ç•÷&WVW7E÷G—W27'Bôâ7'Bæ–CÖ7"ç&WVW7E÷G—Uö–Bt„U$R7"æ–CÓò"Å²†–çB’F–EÒ“°¢–b‚G&÷r’‡GG£¦W'&÷"‚}Šý‹Ší˜Š}‹=Š¢¸ÍŠ}˜Š¢˜m‹MŠòrÃCB“°¢–b‚FFÖ–âbb†–çB’G&÷u²wW6W%ö–BuÒÓÒ†–çB’GU²v–BuÒ’‡GG£¦W'&÷"‚}Šý‹=Š­‹‹=¸ÂŠ˜rŠ}¸Í˜bŠý‹Ší˜Š}‹=Š¢˜]ŠÍŠ}‹"˜m¸Í‹=Š¢rÃC2“°¢f÷&V6‚…²vf÷&ÕöFFrÂw&WV—&VEöf–VÆG2rÂw&WV—&VEöFö7VÖVçG2uÒ2F²—²G&÷u²FµÓÖ§6öåöFV6öFR‚G&÷u²FµÓóòvçVÆÂrÇG'VR“²Ð¢&WGW&âG&÷s°§Ð §&÷WFR‚ttUBrÂrö’ö6ö×ç’×&WVW7B÷6WGF–æw2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢GG—W3ÔF#£¦ÆÂ‚%4TÄT5B–BÆ6öFRÇF—FÆRÇ&–6RÆVæ&ÆVBÆFVFÆ–æUöF—2ÆFW67&—F–öâÇ&WV—&VEöf–VÆG2Ç&WV—&VEöFö7VÖVçG2e$ôÒ6ö×ç•÷&WVW7E÷G—W2t„U$RVæ&ÆVCÓõ$DU"%’–B"“°¢f÷&V6‚‚GG—W22bGB—²GE²w&–6RuÓÒ†–çB’GE²w&–6RuÓ²GE²w&WV—&VEöf–VÆG2uÓÖ§6öåöFV6öFR‚GE²w&WV—&VEöf–VÆG2uÓóòuµÒrÇG'VR“ó¥µÓ²GE²w&WV—&VEöFö7VÖVçG2uÓÖ§6öåöFV6öFR‚GE²w&WV—&VEöFö7VÖVçG2uÓóòuµÒrÇG'VR“ó¥µÓ²ÒVç6WB‚GB“°¢G3Õö6ö×ç•÷6WGF–æw5öÆÂ‚“²F&ÆU&÷f–FW$6öæf–wW&VC×G&–Ò‚‡7G&–ær’‚G5²v&ÆU÷&÷f–FW%÷Fö¶VâuÓóòrr’’ÓÒrs²F&ÆT&÷E&VG“Ö6Æ75öW†—7G2‚t&ÆT&÷Br’bd&ÆT&÷C£¦†5Fö¶Vâ‚“²Vç6WB‚G5²v&ÆU÷&÷f–FW%÷Fö¶VâuÒ“°¢&WGW&â²vö²sÓçG'VRÂwG—W2sÓâGG—W2Âw–ÖVçBsÓå²vÖöFRsÓâG5²w–ÖVçEöÖöFRuÓóòv&÷F‚rÂv6&Eö&æ²sÓâG5²v6&Eö&æ²uÓóòrrÂv6&EöçVÖ&W"sÓâG5²v6&EöçVÖ&W"uÓóòrrÂv6&E÷6†V&sÓâG5²v6&E÷6†V&uÓóòrrÂv6&Eö÷væW"sÓâG5²v6&Eö÷væW"uÓóòrrÂv6&EöFW67&—F–öâsÓâG5²v6&EöFW67&—F–öâuÓóòrrÂv6&EöVæ&ÆVBsÓâ†&ööÂ’‚G5²v6&E÷–ÖVçEöVæ&ÆVBuÓó÷G'VR’Âv6&E÷&V6V—EöFVFÆ–æUö†÷W'2sÓâ†–çB’‚G5²v6&E÷&V6V—EöFVFÆ–æUö†÷W'2uÓóó#B’Âv6&E÷&WV—&U÷G&6¶–ærsÓâ†&ööÂ’‚G5²v6&E÷&WV—&U÷G&6¶–æruÓó÷G'VR’Âv6&E÷&WV—&UöÖ÷VçBsÓâ†&ööÂ’‚G5²v6&E÷&WV—&UöÖ÷VçBuÓó÷G'VR’Âv6&E÷&WV—&U÷–EöBsÓâ†&ööÂ’‚G5²v6&E÷&WV—&U÷–EöBuÓó÷G'VR’Âv&ÆUöVæ&ÆVBsÓâ†&ööÂ’‚G5²v&ÆU÷–ÖVçEöVæ&ÆVBuÓóöfÇ6R’Âv&ÆU÷&VG’sÓâ†&ööÂ’‚G5²v&ÆU÷–ÖVçEöVæ&ÆVBuÓóöfÇ6R’bbF&ÆU&÷f–FW$6öæf–wW&VBbbF&ÆT&÷E&VG’Âv&ÆUö&÷E÷&VG’sÓâF&ÆT&÷E&VG’Âv&ÆU÷&÷f–FW%÷&VG’sÓâF&ÆU&÷f–FW$6öæf–wW&VBÂv&ÆU÷Væf–Æ&ÆU÷&V6öâsÓâ†&ööÂ’‚G5²v&ÆU÷–ÖVçEöVæ&ÆVBuÓóöfÇ6R“ò}›í‹ŠýŠ}ŠíŠ¢Š˜M˜rŠý‹Š­˜m‹¸Í˜]Š}Š¢‹­¸Í‹˜‹Š}˜BŠ}‹=Š¢s¢‚F&ÆT&÷E&VG“ò}Š­˜ª˜bŠŠ}‹-˜¸ÂŠ˜M˜rŠ½ŠŠ¢˜m‹MŠý˜rŠ}‹=Š¢s¢‚F&ÆU&÷f–FW$6öæf–wW&VCò}Š­˜ª˜b›í‹ŠýŠ}ŠíŠ¢ª¸Í˜›í˜˜BŠ½ŠŠ¢˜m‹MŠý˜rŠ}‹=Š¢s¢rr’’Âv&ÆUö&÷EöÆ–æ²sÓâ‡7G&–ær’‚G5²v&ÆUö&÷EöÆ–æ²uÓóòrr•ÒÂwWÆöBsÓå²vÖ…öÖ"sÓâ†–çB’‚G5²vÖ…÷WÆöEöÖ"uÓóó"’ÂvÆÆ÷vVEöÖ–ÖU÷G—W2sÓâG5²vÆÆ÷vVEöÖ–ÖU÷G—W2uÓóõµÕÕÓ°§ÒÆfÇ6RÃ“’“° §&÷WFR‚ttUBrÂrö’ö6ö×ç’×&WVW7B÷&–6W2rÆgVæ7F–öâ‚GÂF"ÂGR—²&WGW&â²vö²sÓçG'VRÂv—FV×2sÓäF#£¦ÆÂ‚%4TÄT5B6öFRÇF—FÆRÇ&–6RÆVæ&ÆVBÆFVFÆ–æUöF—2e$ôÒ6ö×ç•÷&WVW7E÷G—W2õ$DU"%’–B"•Ó²ÒÆfÇ6RÃ“’“° §&÷WFR‚uõ5BrÂrö’ö6ö×ç’×&WVW7Bö7&VFRrÆgVæ7F–öâ‚GÂF"ÂGR—°¢F6öFS×G&–Ò‚‡7G&–ær’‚F%²w&WVW7E÷G—RuÓóòF%²v6öFRuÓóòrr’“°¢GG—SÔF#£¦öæR‚%4TÄT5B¢e$ôÒ6ö×ç•÷&WVW7E÷G—W2t„U$R6öFSÓòäBVæ&ÆVCÓ"Å²F6öFUÒ“²–b‚GG—R’‡GG£¦W'&÷"‚}˜m˜‹’Šý‹Ší˜Š}‹=Š¢˜mŠ}˜]‹Š­Š‹¸ÍŠr‹­¸Í‹˜‹Š}˜BŠ}‹=Š¢rÃC#"“°¢FG&—fW$–CÖ—76WB‚F%²vG&—fW%ö–BuÒ“ò†–çB’F%²vG&—fW%ö–BuÓ¦çVÆÃ²Ff÷&ÓÒF%²vf÷&ÕöFFuÓóõµÓ²–b‚—5ö'&’‚Ff÷&Ò’’‡GG£¦W'&÷"‚}Š}‹}˜MŠ}‹Š}Š¢˜‹˜R˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÃC#"“°¢G&WV—&VCÖ§6öåöFV6öFR‚GG—U²w&WV—&VEöf–VÆG2uÓóòuµÒrÇG'VR“ó¥µÓ²f÷&V6‚‚G&WV—&VB2Fb—²–b‡G&–Ò‚‡7G&–ær’‚Ff÷&Õ²FeÓóòrr’“ÓÓÒrr’‡GG£¦W'&÷"‚}Š­ª˜]¸Í˜B˜¸Í˜MŠòrâFbârŠ}˜M‹-Š}˜]¸ÂŠ}‹=Š¢rÃC#"“²Ð¢GG&6¶–æsÕö6ö×ç•÷G&6¶–æuö6öFR‚“°¢F–CÔF#£¦–ç6W'B‚$”å4U%B”åDò6ö×ç•÷&WVW7G2‡G&6¶–æuö6öFRÇ&WVW7E÷G—Uö–BÇW6W%ö–BÆG&—fW%ö–BÇ7FGW2ÆÖ÷VçBÇ–ÖVçE÷7FGW2Æf÷&ÕöFFÆFW67&—F–öâÆÆ7E÷7FGW5öB’dÅTU2ƒòÃòÃòÃòÂvG&gBrÃòÂwVç–BrÃòÃòÄäõr‚’’"Å²GG&6¶–ærÂGG—U²v–BuÒÂGU²v–BuÒÂFG&—fW$–BÂ†–çB’GG—U²w&–6RuÒÆ§6öåöVæ6öFR‚Ff÷&ÒÄ¥4ôåõTäU44TEõTä”4ôDR’ÇG&–Ò‚‡7G&–ær’‚F%²vFW67&—F–öâuÓóòrr’•Ò“°¢ö6ö×ç•öÇ•öGVUöFFR‚F–BÂ†–çB’‚GG—U²vFVFÆ–æUöF—2uÓóór’“°¢ö6ö×ç•öÆör‚F–BÂGU²v–BuÒÂv7&VFVBrÂ}Šý‹Ší˜Š}‹=Š¢Š}¸ÍŠÍŠ}Šò‹MŠòrÅ²wG&6¶–æuö6öFRsÓâGG&6¶–ærÂwG—RsÓâF6öFUÒ“°¢&WGW&â²vö²sÓçG'VRÂv–BsÓâF–BÂwG&6¶–æuö6öFRsÓâGG&6¶–ærÂvÖ÷VçBsÓâ†–çB’GG—U²w&–6RuÒÂw7FGW2sÓâvG&gBuÓ°§ÒÆfÇ6RÃ“’“° §&÷WFR‚uõ5BrÂrö’ö6ö×ç’×&WVW7B÷WÆöBrÆgVæ7F–öâ‚GÂF"ÂGR—°¢ö6ö×ç•öf–ÆW5÷66†VÖöVç7W&R‚“°¢F–CÒ†–çB’‚F%²w&WVW7Eö–BuÓóó“²G&WÕö6ö×ç•÷&WVW7Eö÷væVB‚F–BÂGRÆfÇ6R“°¢FFö3Õö6ö×ç•öFö5÷G—Uö6æöæ–6Â‚F%²vFö7VÖVçE÷G—RuÓóòrr“²–b‚FFö3ÓÓÒrr’‡GG£¦W'&÷"‚}˜m˜‹’˜]Šý‹ª’Š}˜M‹-Š}˜]¸ÂŠ}‹=Š¢rÃC#"“°¢FFFÒ‡7G&–ær’‚F%²vf–ÆUö&6ScBuÓóòrr“²–b‡7G%ö6öçF–ç2‚FFFÂrÂr’’FFFÖW‡ÆöFR‚rÂrÂFFFÃ"•³Ó²F&–ãÖ&6ScEöFV6öFR‚FFFÇG'VR“²–b‚F&–ãÓÓÖfÇ6WÇÂF&–ãÓÓÒrr’‡GG£¦W'&÷"‚}˜Š}¸Í˜B˜]‹Š­Š‹Š}‹‹=Š}˜B˜m‹MŠý˜rŠ}‹=Š¢rÃC#"“°¢FÖƒÖÖ‚ƒÂ†–çB•ö6ö×ç•÷6WGF–æuövWB‚vÖ…÷WÆöEöÖ"rÃ"’’£#B£#C²–b‡7G&ÆVâ‚F&–â“âFÖ‚’‡GG£¦W'&÷"‚}ŠÝŠÍ˜R˜Š}¸Í˜BŠ¸Í‹BŠ}‹"ŠÝŠò˜]ŠÍŠ}‹"Š}‹=Š¢rÃC2“°¢FÖ–ÖSÕö6ö×ç•öFWFV7EöÖ–ÖR‚F&–â“°¢FÆÆ÷vVCÕö6ö×ç•÷6WGF–æuövWB‚vÆÆ÷vVEöÖ–ÖU÷G—W2rÅ²v–ÖvRö§VrrÂv–ÖvR÷ærrÂv–ÖvR÷vV'rÂvÆ–6F–öâ÷FbuÒ“²–b‚—5ö'&’‚FÆÆ÷vVB’’FÆÆ÷vVCÕ²v–ÖvRö§VrrÂv–ÖvR÷ærrÂv–ÖvR÷vV'rÂvÆ–6F–öâ÷FbuÓ°¢–b‚–åö'&’‚FÖ–ÖRÂFÆÆ÷vVBÇG'VR’’‡GG£¦W'&÷"‚}˜m˜‹’˜Š}¸Í˜B˜]ŠÍŠ}‹"˜m¸Í‹=Š¢rÃC#"“°¢F6Æ–VçDÖWFÒF%²v6Æ–VçEöÖWFuÓóòF%²v7&÷öÖWFuÓóõµÓ°¢GfÆ–FF–öãÖ–åö'&’‚FÖ–ÖRÅ²v–ÖvRö§VrrÂv–ÖvR÷ærrÂv–ÖvR÷vV'uÒÇG'VR“õö6ö×ç•÷fÆ–FFUö–ÖvU÷–ÆöB†&6ScEöVæ6öFR‚F&–â’ÂFFö2ÂF6Æ–VçDÖWF“¥²wVÆ—G’sÓå²w66÷&RsÓãÂw7FGW2sÓâvö²rÂwv&æ–æw2sÓåµÕÒÂw6†#SbsÓæ†6‚‚w6†#SbrÂF&–â’Âw6—¦RsÓç7G&ÆVâ‚F&–â•Ó°¢GfÆ–FF–öãÕ²vö²sÓçG'VRÂwVÆ—G’sÓæçVÆÂÂv6†V6·5öF—6&ÆVBsÓçG'VUÓ°¢F†6ƒÖ†6‚‚w6†#SbrÂF&–â“°¢FGWÔF#£¦öæR‚%4TÄT5Bbæ–BÆbæf–ÆU÷F‚Æbç&WVW7Eö–Be$ôÒ6ö×ç•÷&WVW7Eöf–ÆW2b¤ô”â6ö×ç•÷&WVW7G2"ôâ"æ–CÖbç&WVW7Eö–Bt„U$Rbç6†#ScÓòäB"çW6W%ö–CÓòõ$DU"%’bæ–BDU42Ä”Ô•B"Å²F†6‚Â†–çB’GU²v–BuÕÒ“°¢–b‚FGW—°¢–b‚†–çB’FGW²w&WVW7Eö–BuÓÓÓÒF–B’&WGW&â²vö²sÓçG'VRÂvf–ÆUö–BsÓâ†–çB’FGW²v–BuÒÂvf–ÆU÷F‚sÓâFGW²vf–ÆU÷F‚uÒÂvGWÆ–6FRsÓçG'VRÂvÖ–ÖU÷G—RsÓâFÖ–ÖRÂw6—¦RsÓç7G&ÆVâ‚F&–â’ÂwVÆ—G’sÓâGfÆ–FF–öå²wVÆ—G’uÓóöçVÆÅÓ°¢‡GG£¦W'&÷"‚}Š}¸Í˜bŠ­‹]˜¸Í‹˜-Š˜MŠ}˜²Šý‹¸Íª¸ÂŠ}‹"Šý‹Ší˜Š}‹=Š®(Í˜}Š}¸Â‹M˜]ŠrŠ}‹‹=Š}˜B‹MŠý˜rŠ}‹=Š¢rÃC#"“°¢Ð¢FF—#ÖF—&æÖR…õôD•%õò’âr÷V&Æ–2÷WÆöG2ö6ö×ç•÷&WVW7G2òræFFR‚u’öÒr“²–b‚—5öF—"‚FF—"’bbÖ¶F—"‚FF—"ÃssRÇG'VR’bb—5öF—"‚FF—"’’‡GG£¦W'&÷"‚}Š}¸ÍŠÍŠ}Šò›í˜‹M˜r˜Š}¸Í˜B˜mŠ}˜]˜˜˜"Š˜ŠòrÃS“°¢F&6SÒw&WòrâF–Bâuòrç&Vu÷&WÆ6R‚rõµæ×¤Õ£Ó•òÕÒòrÂuòrÂFFö2’âuòræ&–ã&†W‚‡&æFöÕö'—FW2ƒb’“°¢F—4–ÖvSÖ–åö'&’‚FÖ–ÖRÅ²v–ÖvRö§VrrÂv–ÖvR÷ærrÂv–ÖvR÷vV'uÒÇG'VR“°¢F÷&–v–æÄW‡CÒF—4–ÖvSòv§rs¢‚FÖ–ÖSÓÓÒvÆ–6F–öâ÷FbsòwFbs¢v&–âr“°¢F÷&–v–æÅ–ÆöCÒF&–ã°¢–b‚F—4–ÖvR—°¢FvÆö&ÅsÒ†–çB’…÷7V'67&—F–öå÷6WGF–ær‚v–ÖvUöÖ…÷v–GF‚rÃ#B’“²FvÆö&ÅÒ†–çB’…÷7V'67&—F–öå÷6WGF–ær‚v–ÖvU÷VÆ—G’rÃCR’“°¢F÷&–t§sÕö6ö×ç•÷&ö6W76VEö–ÖvR‚F&–âÂFÖ–ÖRÆÖ‚ƒ#CÆÖ–âƒC“bÂFvÆö&År’’ÆÖ‚ƒÆÖ–âƒ“RÂFvÆö&Å’’“°¢–b‚‚F÷&–t§u²vÖ–ÖRuÓóòrr’ÓÒv–ÖvRö§Vrr’‡GG£¦W'&÷"‚}Š­ŠŠý¸Í˜BŠ­‹]˜¸Í‹Š˜r¥r‹˜¸Â‹=‹˜‹Š}˜]ªŠ}˜n(Í›í‹¸Í‹˜m¸Í‹=Š­‰²Š}˜‹-˜˜m˜rtB‹Šr˜‹Š}˜Bª˜m¸ÍŠòrÃS“°¢F÷&–v–æÅ–ÆöCÒF÷&–t§u²v&–âuÓ°¢Ð¢F÷&–v–æÄæÖSÒF&6Râuö÷&–v–æÂârâF÷&–v–æÄW‡C²F÷&–v–æÄgVÆÃÒFF—"âròrâF÷&–v–æÄæÖS¶–b†f–ÆU÷WEö6öçFVçG2‚F÷&–v–æÄgVÆÂÂF÷&–v–æÅ–ÆöB“ÓÓÖfÇ6R”‡GG£¦W'&÷"‚}‹Ší¸Í‹˜r˜m‹=Ší˜rŠ}‹]˜M¸Â˜mŠ}˜]˜˜˜"Š˜ŠòrÃS“°¢F÷&–v–æÅ&VÃÒwWÆöG2ö6ö×ç•÷&WVW7G2òræFFR‚u’öÒr’âròrâF÷&–v–æÄæÖS°¢G&ö6W76VCÒF÷&–v–æÅ–ÆöC²G&ö6W76VDÖ–ÖSÒF—4–ÖvSòv–ÖvRö§Vrs¢FÖ–ÖS²G&ö6W76VDW‡CÒF÷&–v–æÄW‡C°¢–b‚F—4–ÖvR—°¢FvÆö&ÅsÒ†–çB’…÷7V'67&—F–öå÷6WGF–ær‚v–ÖvUöÖ…÷v–GF‚rÃ#B’“²FvÆö&ÅÒ†–çB’…÷7V'67&—F–öå÷6WGF–ær‚v–ÖvU÷VÆ—G’rÃCR’“°¢G#Õö6ö×ç•÷&ö6W76VEö–ÖvR‚F&–âÂFÖ–ÖRÆÖ‚ƒ#CÆÖ–âƒC“bÂFvÆö&År’’ÆÖ‚ƒÆÖ–âƒ“RÂFvÆö&Å’’“°¢G&ö6W76VCÒG%²v&–âuÓ²G&ö6W76VDÖ–ÖSÒG%²vÖ–ÖRuÓ²G&ö6W76VDW‡CÒG%²vW‡BuÓ°¢Ð¢FæÖSÒF&6Râu÷&ö6W76VBârâG&ö6W76VDW‡C²FgVÆÃÒFF—"âròrâFæÖS¶–b†f–ÆU÷WEö6öçFVçG2‚FgVÆÂÂG&ö6W76VB“ÓÓÖfÇ6R”‡GG£¦W'&÷"‚}‹Ší¸Í‹˜r˜Š}¸Í˜B›í‹ŠýŠ}‹-‹N(Í‹MŠý˜r˜mŠ}˜]˜˜˜"Š˜ŠòrÃS“°¢G&VÃÒwWÆöG2ö6ö×ç•÷&WVW7G2òræFFR‚u’öÒr’âròrâFæÖS²GF‡VÖ%&VÃÖçVÆÃ°¢–b‡7G%÷7F'G5÷v—F‚‚G&ö6W76VDÖ–ÖRÂv–ÖvRòr’bfgVæ7F–öåöW†—7G2‚v–ÖvV7&VFVg&ö×7G&–ærr’—°¢G'—²F–ÓÔ–ÖvV7&VFVg&ö×7G&–ær‚G&ö6W76VB“¶–b‚F–Ò—²GsÖ–ÖvW7‚‚F–Ò“²FƒÖ–ÖvW7’‚F–Ò“²GGsÖÖ–âƒC#ÂGr“²GFƒÖÖ‚ƒÂ†–çB—&÷VæB‚F‚¢GGröÖ‚ƒÂGr’’“²GF‡VÖ#Ö–ÖvV7&VFWG'VV6öÆ÷"‚GGrÂGF‚“²Gv†—FSÖ–ÖvV6öÆ÷&ÆÆö6FR‚GF‡VÖ"Ã#SRÃ#SRÃ#SR“¶–ÖvVf–ÆÂ‚GF‡VÖ"ÃÃÂGv†—FR“¶–ÖvV6÷—&W6×ÆVB‚GF‡VÖ"ÂF–ÒÃÃÃÃÂGGrÂGF‚ÂGrÂF‚“²GFãÒF&6Râu÷F‡VÖ"æ§rs¶–ÖvV§Vr‚GF‡VÖ"ÂFF—"âròrâGFâÃsb“²GF‡VÖ%&VÃÒwWÆöG2ö6ö×ç•÷&WVW7G2òræFFR‚u’öÒr’âròrâGFã¶–ÖvVFW7G&÷’‚GF‡VÖ"“¶–ÖvVFW7G&÷’‚F–Ò“·×Ö6F6‚…F‡&÷v&ÆRFR—·Ð¢Ð¢Ff–CÔF#£¦–ç6W'B‚$”å4U%B”åDò6ö×ç•÷&WVW7Eöf–ÆW2‡&WVW7Eö–BÆFö7VÖVçE÷G—RÆf–ÆUöæÖRÆf–ÆU÷F‚Æ÷&–v–æÅ÷F‚Ç&ö6W76VE÷F‚ÆÖ–ÖU÷G—RÆf–ÆU÷6—¦RÇ&ö6W76VE÷6—¦RÆ7&÷öÖWFÇWÆöFVEö'’Ç6†#SbÇF‡VÖ&æ–Å÷F‚ÇVÆ—G•÷66÷&RÇVÆ—G•÷7FGW2ÇVÆ—G•öÖWFÇ6÷W&6U÷G—R’dÅTU2ƒòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃò’"Å²F–BÂFFö2ÂF%²vf–ÆUöæÖRuÓóòFæÖRÂG&VÂÂF÷&–v–æÅ&VÂÂG&VÂÂG&ö6W76VDÖ–ÖRÇ7G&ÆVâ‚F&–â’Ç7G&ÆVâ‚G&ö6W76VB’Æ§6öåöVæ6öFR‚F6Æ–VçDÖWFÄ¥4ôåõTäU44TEõTä”4ôDR’ÂGU²v–BuÒÂF†6‚ÂGF‡VÖ%&VÂÂ†–çB’‚GfÆ–FF–öå²wVÆ—G’uÕ²w66÷&RuÓóó’Â‡7G&–ær’‚GfÆ–FF–öå²wVÆ—G’uÕ²w7FGW2uÓóòvö²r’Æ§6öåöVæ6öFR‚GfÆ–FF–öå²wVÆ—G’uÓóõµÒÄ¥4ôåõTäU44TEõTä”4ôDR’Â‡7G&–ær’‚F6Æ–VçDÖWF²v6GW&U÷6÷W&6RuÓóòF6Æ–VçDÖWF²w6÷W&6RuÓóòwVæ¶æ÷vâr•Ò“°¢F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7G24UB7FGW3Ô”b‡7FGW3ÒvG&gBrÂvFö7VÖVçG5÷VæF–ærrÇ7FGW2’t„U$R–CÓò"Å²F–EÒ“°¢ö6ö×ç•öÆör‚F–BÂGU²v–BuÒÂvf–ÆU÷WÆöFVBrÂ}˜]Šý‹ª’ŠŠ}‹ªý‹Š}‹¸Â‹MŠòrÅ²vf–ÆUö–BsÓâFf–BÂvFö7VÖVçE÷G—RsÓâFFö2ÂwVÆ—G•÷66÷&RsÓâGfÆ–FF–öå²wVÆ—G’uÕ²w66÷&RuÓóöçVÆÂÂw6÷W&6RsÓâF6Æ–VçDÖWF²v6GW&U÷6÷W&6RuÓóöçVÆÅÒ“°¢&WGW&â²vö²sÓçG'VRÂvf–ÆUö–BsÓâFf–BÂvf–ÆU÷F‚sÓâG&VÂÂv÷&–v–æÅ÷F‚sÓâF÷&–v–æÅ&VÂÂvÖ–ÖU÷G—RsÓâG&ö6W76VDÖ–ÖRÂw6—¦RsÓç7G&ÆVâ‚G&ö6W76VB’Âv÷&–v–æÅ÷6—¦RsÓç7G&ÆVâ‚F&–â’ÂwVÆ—G’sÓâGfÆ–FF–öå²wVÆ—G’uÓóöçVÆÂÂvGWÆ–6FRsÓæfÇ6UÓ°§ÒÆfÇ6RÃ“’“°  ¢ò¢ÒÒÒÒÒÒÒÒÒÒÒÒÒÒÒÒŠ}‹MŠ­‹Š}ª’ªý‹˜˜}¸Â˜‚Š}˜m˜‹Š}Šý¸ÂÒÒÒÒÒÒÒÒÒÒÒÒÒÒÒÒ¢ð¦gVæ7F–öâ÷7V'67&—F–öåöFV6öFU÷fÇVR‚Gb—°¢f÷"‚F“Ó²F“ÃBbb—5÷7G&–ær‚Gb“²F’²²—°¢FCÖ§6öåöFV6öFR‚GbÇG'VR“°¢–b†§6öåöÆ7EöW'&÷"‚’ÓÔ¥4ôåôU%$õ%ôäôäR’'&V³°¢GcÒFC°¢Ð¢&WGW&âGc°§Ð¦gVæ7F–öâ÷7V'67&—F–öå÷6WGF–ær‚F¶W’ÂFFVfVÇCÖçVÆÂ—°¢G'—°¢G#ÔF#£¦öæR‚%4TÄT5BfÇVRe$ôÒ÷6WGF–æw2t„U$R¶W–Óò"Å²F¶W•Ò“°¢–b‚G"’&WGW&â÷7V'67&—F–öåöFV6öFU÷fÇVR‚G%²wfÇVRuÒ“°¢òò‹=Š}‹-ªýŠ}‹¸ÂŠŠr˜m‹=Ší˜~(Í˜}Š}¸Í¸Âª˜rŠ­˜m‹¸Í˜]Š}Š¢Š}‹MŠ­‹Š}ª’‹ŠrŠ˜~(Í‹]˜‹Š¢¸Íª’‹M¸ÍŠ‹Ší¸Í‹˜rª‹Šý˜~(ÍŠ}˜mŠòà¢f÷&V6‚…²w7V'67&—F–öå÷6WGF–æw2rÂw7V'67&—F–öârÂv÷7V'67&—F–öâuÒ2F6öçF–æW$¶W’—°¢F3ÔF#£¦öæR‚%4TÄT5BfÇVRe$ôÒ÷6WGF–æw2t„U$R¶W–Óò"Å²F6öçF–æW$¶W•Ò“°¢–b‚F2’6öçF–çVS°¢Fö&£Õ÷7V'67&—F–öåöFV6öFU÷fÇVR‚F5²wfÇVRuÒ“°¢–b†—5ö'&’‚Fö&¢’—°¢G6†÷'C×&Vu÷&WÆ6R‚rõç7V'67&—F–öåòòrÂrrÂF¶W’“°¢–b†'&•ö¶W•öW†—7G2‚F¶W’ÂFö&¢’’&WGW&â÷7V'67&—F–öåöFV6öFU÷fÇVR‚Fö&¥²F¶W•Ò“°¢–b†'&•ö¶W•öW†—7G2‚G6†÷'BÂFö&¢’’&WGW&â÷7V'67&—F–öåöFV6öFU÷fÇVR‚Fö&¥²G6†÷'EÒ“°¢Ð¢Ð¢Ö6F6‚…F‡&÷v&ÆRFR—·Ð¢&WGW&âFFVfVÇC°§Ð¦gVæ7F–öâ÷7V'67&—F–öåöÖöFR‚—°¢G&sÖçVÆÃ°¢f÷&V6‚…²w7V'67&—F–öåöÖöFRrÂw7V'67&—F–öå÷G—RrÂv÷7V'67&—F–öåöÖöFRuÒ2F²—°¢GcÕ÷7V'67&—F–öå÷6WGF–ær‚F²ÆçVÆÂ“°¢–b‚GbÓÖçVÆÂbbGbÓÒrr—²G&sÒGc²'&V³²Ð¢Ð¢FÓ×7G'FöÆ÷vW"‡G&–Ò‚‡7G&–ær’‚G&sóòvæ÷&ÖÂr’’“°¢FÆ–6W3Õ°¢vw&÷WVBsÓâvw&÷WrÂvw&÷W÷7V'67&—F–öâsÓâvw&÷WrÂvw&÷W×7V'67&—F–öâsÓâvw&÷WrÂ}ªý‹˜˜}¸ÂsÓâvw&÷WrÂ}Š}‹MŠ­‹Š}ª’ªý‹˜˜}¸ÂsÓâvw&÷WrÀ¢v–æF—f–GVÅ÷7V'67&—F–öâsÓâv–æF—f–GVÂrÂv–æF—f–GVÂ×7V'67&—F–öâsÓâv–æF—f–GVÂrÂwW'6öæÂsÓâv–æF—f–GVÂrÂw6–ævÆRsÓâv–æF—f–GVÂrÂ}Š}˜m˜‹Š}Šý¸ÂsÓâv–æF—f–GVÂrÂ}Š}‹MŠ­‹Š}ª’Š}˜m˜‹Š}Šý¸ÂsÓâv–æF—f–GVÂrÀ¢væ÷&ÖÅ÷W6RsÓâvæ÷&ÖÂrÂvæ÷&ÖÂ×W6RsÓâvæ÷&ÖÂrÂw&VwVÆ"sÓâvæ÷&ÖÂrÂvæöæRsÓâvæ÷&ÖÂrÂvöfbsÓâvæ÷&ÖÂrÂvF—6&ÆVBsÓâvæ÷&ÖÂrÂvæõ÷7V'67&—F–öâsÓâvæ÷&ÖÂrÂvæò×7V'67&—F–öâsÓâvæ÷&ÖÂrÂ}ŠŠý˜˜bŠ}‹MŠ­‹Š}ª’sÓâvæ÷&ÖÂrÂ}˜]‹˜]˜˜M¸ÂsÓâvæ÷&ÖÂrÂ}Š}‹=Š­˜Š}Šý˜r˜]‹˜]˜˜M¸ÂsÓâvæ÷&ÖÂp¢Ó°¢FÓÒFÆ–6W5²FÕÓóòFÓ°¢&WGW&â–åö'&’‚FÒÅ²væ÷&ÖÂrÂvw&÷WrÂv–æF—f–GVÂuÒÇG'VR“òFÓ¢væ÷&ÖÂs°§Ð¦gVæ7F–öâ÷7V'67&—F–öåöVæ&ÆVB‚—°¢FÖöFSÕ÷7V'67&—F–öåöÖöFR‚“°¢òòŠ}˜mŠ­ŠíŠ}Š‚ŠÝŠ}˜MŠ¢ªý‹˜˜}¸Â¸ÍŠrŠ}˜m˜‹Š}Šý¸Â˜}˜]¸Í‹M˜rŠ˜r˜]‹˜m¸Â˜‹Š}˜BŠ˜Šý˜bŠ}‹MŠ­‹Š}ª’Š}‹=Š­‰²Š}¸Í˜bªŠ}‹˜mŠ}‹=Š}‹-ªýŠ}‹¸À¢òò˜m‹=Ší˜~(Í˜}Š}¸Â˜-Š˜M¸Â‹Šrª˜rÖöFR‹Ší¸Í‹˜r‹MŠý˜r˜˜M¸Â6†V6¶&÷‚‹Ší¸Í‹˜r˜m‹MŠý˜rŠ˜ŠýˆÂŠ}‹]˜MŠ}ŠÒ˜]¸Î(Íª˜mŠòà¢–b‚FÖöFRÓÒvæ÷&ÖÂr’&WGW&âG'VS°¢GcÕ÷7V'67&—F–öå÷6WGF–ær‚w7V'67&—F–öåöVæ&ÆVBrÆfÇ6R“°¢–b†—5ö&ööÂ‚Gb’—&WGW&âGc°¢–b†—5öçVÖW&–2‚Gb’—&WGW&â†–çB’GcÓÓÓ°¢&WGW&â–åö'&’‡7G'FöÆ÷vW"‡G&–Ò‚‡7G&–ær’Gb’’Å²srÂwG'VRrÂw–W2rÂvöârÂvVæ&ÆVBrÂ}˜‹Š}˜BuÒÇG'VR“°§Ð¦gVæ7F–öâ÷7V'67&—F–öåöÖ÷VçB‚FÖöFR—°¢F¶W—3ÒFÖöFSÓÓÒvw&÷Wp¢ò²w7V'67&—F–öåöw&÷WöÖ÷VçBrÂvw&÷W÷7V'67&—F–öåöÖ÷VçBrÂw7V'67&—F–öåöÖ÷VçEöw&÷WuÐ¢¢²w7V'67&—F–öåö–æF—f–GVÅöÖ÷VçBrÂv–æF—f–GVÅ÷7V'67&—F–öåöÖ÷VçBrÂw7V'67&—F–öåöÖ÷VçEö–æF—f–GVÂrÂw7V'67&—F–öå÷W6W%öÖ÷VçBuÓ°¢f÷&V6‚‚F¶W—22F²—²GcÕ÷7V'67&—F–öå÷6WGF–ær‚F²ÆçVÆÂ“²–b‚GbÓÖçVÆÂbbGbÓÒrr’&WGW&âÖ‚ƒÂ†–çB—&Vu÷&WÆ6R‚rõµãÓ•ÒòrÂrrÂ‡7G&–ær’Gb’“²Ð¢&WGW&â°§Ð¦gVæ7F–öâ÷7V'67&—F–öåöF—5öÆVgB‚GVçF–Â—²–b‚GVçF–Â—&WGW&â²Fæ÷sÖæWrFFUF–ÖT–Ö×WF&ÆR‚væ÷rrÆæWrFFUF–ÖU¦öæR‚t6–õFV‡&âr’“²FVæCÖæWrFFUF–ÖT–Ö×WF&ÆR‚GVçF–ÂÆæWrFFUF–ÖU¦öæR‚t6–õFV‡&âr’“²–b‚FVæCÂFæ÷r—&WGW&â²&WGW&âÖ‚ƒÂ†–çB’Fæ÷rÓæF–fb‚FVæB’Óæf÷&ÖB‚rVr’³“²Ð¦gVæ7F–öâ÷7V'67&—F–öå÷7FGW5öf÷%÷W6W"‚GR—°¢FÖöFSÕ÷7V'67&—F–öåöÖöFR‚“²FVæ&ÆVCÕ÷7V'67&—F–öåöVæ&ÆVB‚“°¢–b‚FVæ&ÆVGÇÂFÖöFSÓÓÒvæ÷&ÖÂr’&WGW&â²vVæ&ÆVBsÓæfÇ6RÂvÖöFRsÓâvæ÷&ÖÂrÂv7F—fRsÓçG'VRÂvF—5öÆVgBsÓæçVÆÂÂvÆ&VÂsÓâ}Š}‹=Š­˜Š}Šý˜r˜]‹˜]˜˜M¸ÂuÓ°¢GV–CÒ†–çB’GU²v–BuÓ²FF%W6W#ÔF#£¦öæR‚%4TÄT5BÖævW%ö–Be$ôÒW6W'2t„U$R–CÓò"Å²GV–EÒ“ó¥µÓ²G&÷sÔF#£¦öæR‚%4TÄT5B¢e$ôÒW6W%÷7V'67&—F–öç2t„U$RW6W%ö–CÓò"Å²GV–EÒ“°¢GVçF–ÃÒG&÷u²vW‡—&W5öBuÓóöçVÆÃ²F7F—fSÒGVçF–Âbb7G'F÷F–ÖR‚GVçF–Â“ã×F–ÖR‚“°¢–b‚FÖöFSÓÓÒvw&÷Wr—°¢Fw&÷WÔF#£¦öæR‚%4TÄT5B¢e$ôÒw&÷W÷7V'67&—F–öç2õ$DU"%’–BDU42Ä”Ô•B"“²GVçF–ÃÒFw&÷W²vW‡—&W5öBuÓóöçVÆÃ²F7F—fSÒGVçF–Âbg7G'F÷F–ÖR‚GVçF–Â“ã×F–ÖR‚“°¢&WGW&â²vVæ&ÆVBsÓçG'VRÂvÖöFRsÓâvw&÷WrÂvÆ&VÂsÓâ}Š}‹MŠ­‹Š}ª’ªý‹˜˜}¸ÂrÂv7F—fRsÓâ†&ööÂ’F7F—fRÂvF—5öÆVgBsÓå÷7V'67&—F–öåöF—5öÆVgB‚GVçF–Â’ÂvW‡—&W5öBsÓâGVçF–ÂÂvÖ÷VçBsÓå÷7V'67&—F–öåöÖ÷VçB‚vw&÷Wr’Âv6å÷’sÓæV×G’‚FF%W6W%²vÖævW%ö–BuÒ•Ó°¢Ð¢&WGW&â²vVæ&ÆVBsÓçG'VRÂvÖöFRsÓâv–æF—f–GVÂrÂvÆ&VÂsÓâ}Š}‹MŠ­‹Š}ª’Š}˜m˜‹Š}Šý¸ÂrÂv7F—fRsÓâ†&ööÂ’F7F—fRÂvF—5öÆVgBsÓå÷7V'67&—F–öåöF—5öÆVgB‚GVçF–Â’ÂvW‡—&W5öBsÓâGVçF–ÂÂvÖ÷VçBsÓå÷7V'67&—F–öåöÖ÷VçB‚v–æF—f–GVÂr’Âv6å÷’sÓçG'VUÓ°§Ð¦gVæ7F–öâ÷7V'67&—F–öå÷–ÖVçEögVÆÂ‚F–B—·&WGW&âF#£¦öæR‚%4TÄT5B7â¢ÇRç†öæRÇRæÖævW%ö–Be$ôÒ7V'67&—F–öå÷–ÖVçG27¤ô”âW6W'2RôâRæ–C×7çW6W%ö–Bt„U$R7æ–CÓò"Å²†–çB’F–EÒ“·Ð¦gVæ7F–öâ÷7V'67&—F–öå÷7F'E÷Fö¶Vâ‚G—·&WGW&âw7V%òrâ†–çB’G²v–BuÒâuòrç7V'7G"††6‚‚w6†#SbrÂ‡7G&–ær’G²v–çfö–6U÷–ÆöBuÒ’ÃÃ"“·Ð¦gVæ7F–öâ÷7V'67&—F–öåöÖ&µ÷–B‚GÂFFFÕµÒ—°¢Fg&W6ƒÕ÷7V'67&—F–öå÷–ÖVçEögVÆÂ‚†–çB’G²v–BuÒ“²–b‚Fg&W6‚—&WGW&âfÇ6S°¢F#£¦W†V2‚%UDDR7V'67&—F–öå÷–ÖVçG24UB7FGW3Òw–BrÇ&÷f–FW%÷G&ç67F–öåö–CÓòÇ–EöCÔäõr‚’Ç&u÷–ÆöCÓòt„U$R–CÓò"Å²‡7G&–ær’‚FFF²w&÷f–FW%÷–ÖVçEö6†&vUö–BuÓóòFFF²v&ÆU÷–ÖVçEö6†&vUö–BuÓóòrr’Æ§6öåöVæ6öFR‚FFFÄ¥4ôåõTäU44TEõTä”4ôDR’Â†–çB’Fg&W6…²v–BuÕÒ“°¢G7F'CÖFFR‚u’ÖÒÖBƒ¦“§2r“²FVæCÖFFR‚u’ÖÒÖBƒ¦“§2rÇ7G'F÷F–ÖR‚r³3F—2r’“°¢–b‚Fg&W6…²vÖöFRuÓÓÓÒvw&÷Wr’F#£¦W†V2‚$”å4U%B”åDòw&÷W÷7V'67&—F–öç2‡–W%÷W6W%ö–BÇ7F'G5öBÆW‡—&W5öBÆÖ÷VçBÇ7FGW2Ç–ÖVçEö–BÆ7&VFVEöB’dÅTU2ƒòÃòÃòÃòÂv7F—fRrÃòÄäõr‚’’"Å²†–çB’Fg&W6…²wW6W%ö–BuÒÂG7F'BÂFVæBÂ†–çB’Fg&W6…²vÖ÷VçBuÒÂ†–çB’Fg&W6…²v–BuÕÒ“°¢VÇ6RF#£¦W†V2‚$”å4U%B”åDòW6W%÷7V'67&—F–öç2‡W6W%ö–BÇ7F'G5öBÆW‡—&W5öBÆÖ÷VçBÇ7FGW2Ç–ÖVçEö–BÆ7&VFVEöB’dÅTU2ƒòÃòÃòÃòÂv7F—fRrÃòÄäõr‚’’ôâEUÄ”4DR´U’UDDR7F'G5öCÕdÅTU2‡7F'G5öB’ÆW‡—&W5öCÕdÅTU2†W‡—&W5öB’ÆÖ÷VçCÕdÅTU2†Ö÷VçB’Ç7FGW3Òv7F—fRrÇ–ÖVçEö–CÕdÅTU2‡–ÖVçEö–B’"Å²†–çB’Fg&W6…²wW6W%ö–BuÒÂG7F'BÂFVæBÂ†–çB’Fg&W6…²vÖ÷VçBuÒÂ†–çB’Fg&W6…²v–BuÕÒ“°¢&WGW&âG'VS°§Ð§&÷WFR‚ttUBrÂrö’÷7V'67&—F–öâ÷7FGW2rÆgVæ7F–öâ‚GÂF"ÂGR—²G7CÕ÷7V'67&—F–öå÷7FGW5öf÷%÷W6W"‚GR“·&WGW&â²vö²sÓçG'VRÂw7V'67&—F–öâsÓâG7BÂvVffV7F—fUöÖöFRsÓâG7E²vÖöFRuÓóòvæ÷&ÖÂrÂw6W'fW%÷F–ÖRsÓæFFR‚v2r•Ó·ÒÆfÇ6RÃ“’“°§&÷WFR‚uõ5BrÂrö’÷7V'67&—F–öâ÷–ÖVçBrÆgVæ7F–öâ‚GÂF"ÂGR—°¢òòŠý‹ŠÝŠ}˜MŠ¢ŠŠý˜˜bŠ}‹MŠ­‹Š}ª’˜}¸Í¨b‹]˜‹Š­ŠÝ‹=Š}Š¸Â‹=Š}ŠíŠ­˜r˜m˜]¸Î(Í‹M˜Šò˜‚Š­˜ª˜bª¸Í˜›í˜˜B˜m¸Í‹"Š‹‹‹=¸Â˜m˜]¸Î(Íªý‹ŠýŠòà¢–b…÷7V'67&—F–öåöÖöFR‚“ÓÓÒvæ÷&ÖÂrÇÂ÷7V'67&—F–öåöVæ&ÆVB‚’’°¢&WGW&â²vö²sÓçG'VRÂw6¶—VBsÓçG'VRÂw7V'67&—F–öâsÓå÷7V'67&—F–öå÷7FGW5öf÷%÷W6W"‚GR’ÂvÖW76vRsÓâ}‹=Š}˜]Š}˜m˜rŠý‹ŠÝŠ}˜MŠ¢ŠŠý˜˜bŠ}‹MŠ­‹Š}ª’Š}‹=Š¢˜‚˜m¸ÍŠ}‹-¸ÂŠ˜r‹]˜‹Š­ŠÝ‹=Š}Š‚˜mŠýŠ}‹ŠòâuÓ°¢Ð¢G7CÕ÷7V'67&—F–öå÷7FGW5öf÷%÷W6W"‚GR“²–b†V×G’‚G7E²vVæ&ÆVBuÒ’’‡GG£¦W'&÷"‚}Š}‹MŠ­‹Š}ª’‹=Š}˜]Š}˜m˜r˜‹Š}˜B˜m¸Í‹=Š¢rÃC#"“²–b†V×G’‚G7E²v6å÷’uÒ’’‡GG£¦W'&÷"‚}›í‹ŠýŠ}ŠíŠ¢Š}‹MŠ­‹Š}ª’ªý‹˜˜}¸Â˜˜-‹rŠ­˜‹=‹r˜]Šý¸Í‹Š}ŠÍ‹Š}¸Í¸ÂŠ}˜mŠÍŠ}˜R˜]¸Î(Í‹M˜ŠòrÃC2“°¢FÖ÷VçCÒ†–çB’G7E²vÖ÷VçBuÓ²–b‚FÖ÷VçCÃÓ’‡GG£¦W'&÷"‚}˜]Š˜M‹¢Š}‹MŠ­‹Š}ª’Šý‹Š­˜m‹¸Í˜]Š}Š¢Š­‹¸Í¸Í˜b˜m‹MŠý˜rŠ}‹=Š¢rÃC#"“°¢G&÷f–FW#×G&–Ò‚‡7G&–ær•÷7V'67&—F–öå÷6WGF–ær‚v&ÆU÷&÷f–FW%÷Fö¶VârÂrr’“²–b‚G&÷f–FW#ÓÓÒrr’‡GG£¦W'&÷"‚}Š­˜ª˜b›í‹ŠýŠ}ŠíŠ¢ª¸Í˜›í˜˜BŠ˜M˜rŠ½ŠŠ¢˜m‹MŠý˜rŠ}‹=Š¢rÃC#"“°¢G–ÆöCÒw7V'67&—F–öã¢râG7E²vÖöFRuÒâs¢râ†–çB’GU²v–BuÒâs¢ræ&–ã&†W‚‡&æFöÕö'—FW2ƒ‚’“°¢F–CÔF#£¦–ç6W'B‚$”å4U%B”åDò7V'67&—F–öå÷–ÖVçG2‡W6W%ö–BÆÖöFRÆÖ÷VçBÇ7FGW2Æ–çfö–6U÷–ÆöBÆ7&VFVEöB’dÅTU2ƒòÃòÃòÂwVæF–ærrÃòÄäõr‚’’"Å²†–çB’GU²v–BuÒÂG7E²vÖöFRuÒÂFÖ÷VçBÂG–ÆöEÒ“°¢G“Õ÷7V'67&—F–öå÷–ÖVçEögVÆÂ‚F–B“²GFö¶VãÕ÷7V'67&—F–öå÷7F'E÷Fö¶Vâ‚G’“²FÆ–æ³Õö6ö×ç•ö&ÆUö&÷EöÆ–æ²‚GFö¶Vâ“°¢&WGW&â²vö²sÓçG'VRÂw–ÖVçEö–BsÓâF–BÂw7FGW2sÓâwVæF–ærrÂv&÷EöÆ–æ²sÓâFÆ–æ²ÂvÖW76vRsÓâ}Š‹Š}¸ÂŠý‹¸ÍŠ}˜Š¢‹]˜‹Š­ŠÝ‹=Š}ŠˆÂ˜M¸Í˜mª’‹ŠŠ}Š¢Š˜M˜r‹ŠrŠŠ}‹"ª˜m¸ÍŠòâuÓ°§ÒÆfÇ6RÃ“’“°§&÷WFR‚ttUBrÂrö’÷7V'67&—F–öâ÷–ÖVçB×7FGW2÷¶–GÒrÆgVæ7F–öâ‚GÂF"ÂGR—²GƒÕ÷7V'67&—F–öå÷–ÖVçEögVÆÂ‚†–çB’G²v–BuÒ“¶–b‚G‚”‡GG£¦W'&÷"‚}›í‹ŠýŠ}ŠíŠ¢¸ÍŠ}˜Š¢˜m‹MŠòrÃCB“¶–b‚†–çB’G…²wW6W%ö–BuÒÓÒ†–çB’GU²v–BuÒ”‡GG£¦W'&÷"‚}Šý‹=Š­‹‹=¸Â˜]ŠÍŠ}‹"˜m¸Í‹=Š¢rÃC2“·&WGW&â²vö²sÓçG'VRÂw7FGW2sÓâG…²w7FGW2uÒÂw7V'67&—F–öâsÓå÷7V'67&—F–öå÷7FGW5öf÷%÷W6W"‚GR•Ó·ÒÆfÇ6RÃ“’“° §&÷WFR‚uõ5BrÂrö’ö6ö×ç’×&WVW7B÷–ÖVçBrÆgVæ7F–öâ‚GÂF"ÂGR—°¢F–CÒ†–çB’‚F%²w&WVW7Eö–BuÓóó“²G&WÕö6ö×ç•÷&WVW7Eö÷væVB‚F–BÂGRÆfÇ6R“²FÖWF†öCÒF%²vÖWF†öBuÓóòrs²–b‚–åö'&’‚FÖWF†öBÅ²v&ÆU÷vÆÆWBrÂv6&E÷Fõö6&BuÒÇG'VR’’‡GG£¦W'&÷"‚}‹˜‹B›í‹ŠýŠ}ŠíŠ¢˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÃC#"“°¢FFö73Õö6ö×ç•÷&WV—&VEöFö75÷7FFR‚G&W“²–b‚FFö75²v6ö×ÆWFRuÒ’‡GG£¦W'&÷"‚}Š}ŠŠ­ŠýŠr˜}˜]˜r˜]ŠýŠ}‹ª’Š}˜M‹-Š}˜]¸Â‹ŠrŠŠ}‹ªý‹Š}‹¸Âª˜m¸ÍŠó¢ræ–×ÆöFR‚rÂrÂFFö75²vÖ—76–æruÒ’ÃC#"“°¢–b‚†–çB’G&W²vÖ÷VçBuÓÃÓ—²F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7G24UB–ÖVçEöÖWF†öCÓòÇ–ÖVçE÷7FGW3Òw–BrÇ7FGW3ÒwVæF–æu÷&Wf–Wrrt„U$R–CÓò"Å²FÖWF†öBÂF–EÒ“²ö6ö×ç•öÆör‚F–BÂGU²v–BuÒÂw–ÖVçE÷v—fVBrÂ}Š­‹‹˜˜rŠíŠý˜]Š¢‹]˜‹Š}‹=Š¢r“²&WGW&â²vö²sÓçG'VRÂw7FGW2sÓâw–BrÂw&WVW7E÷7FGW2sÓâwVæF–æu÷&Wf–WruÓ²Ð¢–b‚FÖWF†öCÓÓÒv6&E÷Fõö6&Br’&WGW&âö6ö×ç•ö6&E÷7V&Ö—B‚G&WÂGRÂF"Ã“°¢–b‚ö6ö×ç•÷6WGF–æuövWB‚v&ÆU÷–ÖVçEöVæ&ÆVBrÆfÇ6R’’‡GG£¦W'&÷"‚}›í‹ŠýŠ}ŠíŠ¢Š˜M˜r‹­¸Í‹˜‹Š}˜BŠ}‹=Š¢rÃC#"“°¢G&÷f–FW#×G&–Ò‚‡7G&–ær•ö6ö×ç•÷6WGF–æuövWB‚v&ÆU÷&÷f–FW%÷Fö¶VârÂrr’“²–b‚G&÷f–FW#ÓÓÒrr’‡GG£¦W'&÷"‚}Š­˜ª˜b›í‹ŠýŠ}ŠíŠ¢ª¸Í˜›í˜˜BŠ˜M˜rŠý‹Š­˜m‹¸Í˜]Š}Š¢Š½ŠŠ¢˜m‹MŠý˜rŠ}‹=Š¢rÃC#"“°¢–b‚6Æ75öW†—7G2‚t&ÆT&÷Br—ÇÂ&ÆT&÷C£¦†5Fö¶Vâ‚’’‡GG£¦W'&÷"‚}Š­˜ª˜bŠŠ}‹-˜¸ÂŠ˜M˜rŠ½ŠŠ¢˜m‹MŠý˜rŠ}‹=Š¢rÃC#"“°¢G–ÆöCÒv6ö×ç•÷&WVW7C¢râF–Bâs¢ræ&–ã&†W‚‡&æFöÕö'—FW2ƒ‚’“°¢G–CÔF#£¦–ç6W'B‚$”å4U%B”åDò6ö×ç•÷&WVW7E÷–ÖVçG2‡&WVW7Eö–BÆÖWF†öBÆÖ÷VçBÇ7FGW2Æ–çfö–6U÷–ÆöBÇ–W%öæ÷FRÇ&u÷–ÆöB’dÅTU2ƒòÃòÃòÂwVæF–ærrÃòÃòÃò’"Å²F–BÂFÖWF†öBÂ†–çB’G&W²vÖ÷VçBuÒÂG–ÆöBÂF%²væ÷FRuÓóöçVÆÂÆ§6öåöVæ6öFR…²w7FvRsÓâv7&VFVBuÒÄ¥4ôåõTäU44TEõTä”4ôDR•Ò“°¢G–ÖVçCÕö6ö×ç•÷–ÖVçEögVÆÂ‚G–B“°¢G7F'EFö¶VãÕö6ö×ç•ö&ÆU÷–ÖVçE÷7F'E÷Fö¶Vâ‚G–ÖVçB“°¢F&÷DÆ–æ³Õö6ö×ç•ö&ÆUö&÷EöÆ–æ²‚G7F'EFö¶Vâ“°¢òòŠ}¸Í˜b˜]‹=¸Í‹˜mŠŠ}¸ÍŠò˜]˜mŠ­‹‹‹MŠª˜}™BŠ˜M˜r¸ÍŠrŠý‹ªýŠ}˜r›í¸ÍŠ}˜]ª’Š˜]Š}˜mŠý‰²Šý‹‹­¸Í‹Š}¸Í˜b‹]˜‹Š ¢òòF–ÖV÷WBª˜Š­Š}˜rŠ}›âŠŠ}‹Š²˜m˜]Š}¸Í‹B*½Š}Š­‹]Š}˜BŠ˜r‹=‹˜‹˜]˜]ª˜b˜m‹MŠü+²˜]¸Î(Í‹M˜ŠýˆÂŠý‹ŠÝŠ}˜M¸Âª˜r‹ª˜‹Šð¢òò›í‹ŠýŠ}ŠíŠ¢Šý‹‹=‹˜‹‹=Š}ŠíŠ­˜r‹MŠý˜rŠ}‹=Š¢â‹]˜‹Š­ŠÝ‹=Š}Š‚›í‹2Š}‹"ŠŠ}‹-‹MŠý˜b˜M¸Í˜mª’˜‚Šý‹¸ÍŠ}˜Š¢÷7F'BŠý‹¢òò˜ŠŽ(Í˜}˜ª’Š˜M˜rŠ}‹‹=Š}˜B˜]¸Î(Í‹M˜ŠòâŠ}‹‹=Š}˜B›í¸ÍŠ}˜]ª’ýŠ˜M˜r˜m¸Í‹"Š}‹"Šýª˜]˜~(Í˜}Š}¸Â˜]‹=Š­˜-˜BŠ}˜mŠÍŠ}˜R˜]¸Î(Íªý¸Í‹Šòà¢F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7E÷–ÖVçG24UBÆ7EöW'&÷#Òvv—F–æuö&÷E÷7F'BrÇ&u÷–ÆöCÓòt„U$R–CÓò"Å¶§6öåöVæ6öFR…²w7FvRsÓâvv—F–æuö&÷E÷7F'BrÂw7F'E÷Fö¶VâsÓâG7F'EFö¶VåÒÄ¥4ôåõTäU44TEõTä”4ôDR’ÂG–EÒ“°¢F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7G24UB–ÖVçEöÖWF†öCÒv&ÆU÷vÆÆWBrÇ–ÖVçE÷7FGW3ÒwVæF–ærrÇ7FGW3Òw–ÖVçE÷VæF–ærrt„U$R–CÓò"Å²F–EÒ“°¢ö6ö×ç•öÆör‚F–BÂGU²v–BuÒÂv&ÆUö&÷EöÆ–æµö7&VFVBrÂ}˜M¸Í˜mª’˜‹˜ŠòŠ˜r‹ŠŠ}Š¢Š‹Š}¸Â›í‹ŠýŠ}ŠíŠ¢Š}¸ÍŠÍŠ}Šò‹MŠòrÅ²w–ÖVçEö–BsÓâG–EÒ“°¢&WGW&â²vö²sÓçG'VRÂw–ÖVçEö–BsÓâG–BÂw7FGW2sÓâwVæF–ærrÂw&WVW7E÷7FGW2sÓâw–ÖVçE÷VæF–ærrÂv–çfö–6U÷6VçBsÓæfÇ6RÂw&WV—&W5ö&÷E÷7F'BsÓçG'VRÂv&÷EöÆ–æ²sÓâF&÷DÆ–æ²ÂvÆ–æµöFVÆ—fW'’sÓå²w6×2sÓæfÇ6RÂv&ÆRsÓæfÇ6RÂvW'&÷'2sÓåµÕÒÂvÖW76vRsÓâ}˜M¸Í˜mª’›í‹ŠýŠ}ŠíŠ¢Š}¸ÍŠÍŠ}Šò‹MŠòâŠ‹Š}¸ÂŠý‹¸ÍŠ}˜Š¢‹]˜‹Š­ŠÝ‹=Š}ŠˆÂ˜M¸Í˜mª’‹ŠrŠý‹Š˜M˜rŠŠ}‹"ª˜m¸ÍŠòâuÓ°§ÒÆfÇ6RÃ“’“° §&÷WFR‚ttUBrÂrö’ö6ö×ç’×&WVW7B÷–ÖVçB×7FGW2÷¶–GÒrÆgVæ7F–öâ‚GÂF"ÂGR—°¢G–ÖVçCÕö6ö×ç•÷–ÖVçEögVÆÂ‚†–çB’G²v–BuÒ“°¢–b‚G–ÖVçB’‡GG£¦W'&÷"‚}›í‹ŠýŠ}ŠíŠ¢¸ÍŠ}˜Š¢˜m‹MŠòrÃCB“°¢–b‚†–çB’G–ÖVçE²wW6W%ö–BuÒÓÒ†–çB’GU²v–BuÒ’‡GG£¦W'&÷"‚}Šý‹=Š­‹‹=¸Â˜]ŠÍŠ}‹"˜m¸Í‹=Š¢rÃC2“°¢–b†–åö'&’‚‡7G&–ær’G–ÖVçE²w7FGW2uÒÅ²w&V6†V6¶÷WBrÂwVæF–æruÒÇG'VR’bbV×G’‚G–ÖVçE²w&÷f–FW%÷G&ç67F–öåö–BuÒ’’ö6ö×ç•÷–ÖVçEö–çV—&R‚G–ÖVçB“°¢Fg&W6ƒÕö6ö×ç•÷–ÖVçEögVÆÂ‚†–çB’G–ÖVçE²v–BuÒ“°¢–b‚‚Fg&W6…²w7FGW2uÓóòrr“ÓÓÒw–Brbb‚‚Fg&W6…²w&WVW7E÷–ÖVçE÷7FGW2uÓóòrr’ÓÒw–BrÇÂ‚Fg&W6…²w&WVW7E÷7FGW2uÓóòrr“ÓÓÒw–ÖVçE÷VæF–ærr’—²ö6ö×ç•÷–ÖVçEöÖ&µ÷–B‚Fg&W6‚ÅµÒÂw7FGW5÷&W—"r“²Fg&W6ƒÕö6ö×ç•÷–ÖVçEögVÆÂ‚†–çB’G–ÖVçE²v–BuÒ“²Ð¢&WGW&â²vö²sÓçG'VRÂw–ÖVçEö–BsÓâ†–çB’Fg&W6…²v–BuÒÂw7FGW2sÓâFg&W6…²w7FGW2uÒÂw&WVW7E÷7FGW2sÓâFg&W6…²w&WVW7E÷7FGW2uÒÂw–ÖVçE÷7FGW2sÓâFg&W6…²w&WVW7E÷–ÖVçE÷7FGW2uÒÂwG&ç67F–öåö–BsÓâFg&W6…²wG&ç67F–öåö–BuÓóöçVÆÂÂw&÷f–FW%÷G&ç67F–öåö–BsÓâFg&W6…²w&÷f–FW%÷G&ç67F–öåö–BuÓóöçVÆÂÂvÆ7EöW'&÷"sÓâFg&W6…²vÆ7EöW'&÷"uÓóöçVÆÂÂwfW&–f–VEöBsÓâFg&W6…²wfW&–f–VEöBuÓóöçVÆÅÓ°§ÒÆfÇ6RÃ“’“° §&÷WFR‚uõ5BrÂrö’ö6ö×ç’×&WVW7Bö6&B×–ÖVçBrÆgVæ7F–öâ‚GÂF"ÂGR—°¢G&WÕö6ö×ç•÷&WVW7Eö÷væVB‚†–çB’‚F%²w&WVW7Eö–BuÓóó’ÂGRÆfÇ6R“²FFö73Õö6ö×ç•÷&WV—&VEöFö75÷7FFR‚G&W“¶–b‚FFö75²v6ö×ÆWFRuÒ”‡GG£¦W'&÷"‚}Š}ŠŠ­ŠýŠr˜}˜]˜r˜]ŠýŠ}‹ª’Š}˜M‹-Š}˜]¸Â‹ŠrŠŠ}‹ªý‹Š}‹¸Âª˜m¸ÍŠòrÃC#"“·&WGW&âö6ö×ç•ö6&E÷7V&Ö—B‚G&WÂGRÂF"Ã“°§ÒÆfÇ6RÃ“’“°§&÷WFR‚uõ5BrÂrö’ö6ö×ç’×&WVW7B÷WÆöB×–ÖVçB×&V6V—BrÆgVæ7F–öâ‚GÂF"ÂGR—°¢F%²vFö7VÖVçE÷G—RuÓÒv6&E÷Fõö6&E÷&V6V—Bs°¢òò&WW6RF†R7FæF&BWÆöB&÷WFR6öçG&7BF‡&÷Vv‚â–çFW&æÂ&WVW7B—2–çFVçF–öæÆÇ’fö–FVC²6Æ–VçG26†÷VÆB6ÆÂ÷WÆöBv—F‚F†—2Fö7VÖVçBG—Rà¢&WGW&â²vö²sÓçG'VRÂwWÆöEöVæGö–çBsÓârö’ö6ö×ç’×&WVW7B÷WÆöBrÂvFö7VÖVçE÷G—RsÓâv6&E÷Fõö6&E÷&V6V—BuÓ°§ÒÆfÇ6RÃ“’“°§&÷WFR‚ttUBrÂrö’ö6ö×ç’×&WVW7Bö6&B×–ÖVçB÷¶–GÒrÆgVæ7F–öâ‚GÂF"ÂGR—°¢GƒÕö6ö×ç•ö6&E÷–ÖVçEögVÆÂ‚†–çB’G²v–BuÒ“¶–b‚G‚”‡GG£¦W'&÷"‚}›í‹ŠýŠ}ŠíŠ¢ªŠ}‹Š®(ÍŠ˜~(ÍªŠ}‹Š¢¸ÍŠ}˜Š¢˜m‹MŠòrÃCB“¶–b‚†–çB’G…²w&WVW7E÷W6W%ö–BuÒÓÒ†–çB’GU²v–BuÒ”‡GG£¦W'&÷"‚}Šý‹=Š­‹‹=¸Â˜]ŠÍŠ}‹"˜m¸Í‹=Š¢rÃC2“·&WGW&â²vö²sÓçG'VRÂv—FVÒsÓâG…Ó°§ÒÆfÇ6RÃ“’“°§&÷WFR‚uõ5BrÂrö’ö6ö×ç’×&WVW7Bö6&B×–ÖVçB÷&W7V&Ö—BrÆgVæ7F–öâ‚GÂF"ÂGR—°¢G–ÖVçD–CÒ†–çB’‚F%²w–ÖVçEö–BuÓóó“²GƒÕö6ö×ç•ö6&E÷–ÖVçEögVÆÂ‚G–ÖVçD–B“¶–b‚G‚”‡GG£¦W'&÷"‚}›í‹ŠýŠ}ŠíŠ¢ªŠ}‹Š®(ÍŠ˜~(ÍªŠ}‹Š¢¸ÍŠ}˜Š¢˜m‹MŠòrÃCB“¶–b‚†–çB’G…²w&WVW7E÷W6W%ö–BuÒÓÒ†–çB’GU²v–BuÒ”‡GG£¦W'&÷"‚}Šý‹=Š­‹‹=¸Â˜]ŠÍŠ}‹"˜m¸Í‹=Š¢rÃC2“²G&WÕö6ö×ç•÷&WVW7Eö÷væVB‚†–çB’G…²w&WVW7Eö–BuÒÂGRÆfÇ6R“·&WGW&âö6ö×ç•ö6&E÷7V&Ö—B‚G&WÂGRÂF"ÂG–ÖVçD–B“°§ÒÆfÇ6RÃ“’“°§&÷WFR‚ttUBrÂrö’öFÖ–âö6ö×ç’Ö6&B×–ÖVçG2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢G7FGW3×G&–Ò‚‡7G&–ær’‚EôtUE²w7FGW2uÓóòwVæF–ærr’“²Gv†W&SÕ²sÓuÓ²F&w3ÕµÓ¶–b‚G7FGW2ÓÒrr—²Gv†W&UµÓÒv7ç7FGW3Óòs²F&w5µÓÒG7FGW3·×&WGW&â²vö²sÓçG'VRÂv—FV×2sÓäF#£¦ÆÂ‚%4TÄT5B7â¢Ç"çG&6¶–æuö6öFR&WVW7E÷G&6¶–ærÇ'BçF—FÆR&WVW7E÷F—FÆRÄ4ôä4B„4ôÄU44R‡W2æf—'7EöæÖRÂrr’ÂrrÄ4ôÄU44R‡W2æÆ7EöæÖRÂrr’’W6W%öæÖRe$ôÒ6ö×ç•ö6&E÷–ÖVçG27¤ô”â6ö×ç•÷&WVW7G2"ôâ"æ–CÖ7ç&WVW7Eö–B¤ô”â6ö×ç•÷&WVW7E÷G—W2'Bôâ'Bæ–C×"ç&WVW7E÷G—Uö–BÄTeB¤ô”âW6W'2W2ôâW2æ–CÖ7çW6W%ö–Bt„U$R"æ–×ÆöFR‚räBrÂGv†W&R’â"õ$DU"%’7æ–BDU42Ä”Ô•BS"ÂF&w2•Ó°§ÒÆfÇ6RÄDÔ”â“° §&÷WFR‚uõ5BrÂrö’ö6ö×ç’×&WVW7B÷–ÖVçBÖÆ–æ²÷6VæBrÆgVæ7F–öâ‚GÂF"ÂGR—°¢G–ÖVçCÕö6ö×ç•÷–ÖVçEögVÆÂ‚†–çB’‚F%²w–ÖVçEö–BuÓóó’“°¢–b‚G–ÖVçB’‡GG£¦W'&÷"‚}›í‹ŠýŠ}ŠíŠ¢¸ÍŠ}˜Š¢˜m‹MŠòrÃCB“°¢–b‚†–çB’G–ÖVçE²wW6W%ö–BuÒÓÒ†–çB’GU²v–BuÒ’‡GG£¦W'&÷"‚}Šý‹=Š­‹‹=¸Â˜]ŠÍŠ}‹"˜m¸Í‹=Š¢rÃC2“°¢–b‚‡7G&–ær’G–ÖVçE²vÖWF†öBuÒÓÒv&ÆU÷vÆÆWBr’‡GG£¦W'&÷"‚}Š}¸Í˜b›í‹ŠýŠ}ŠíŠ¢Š}‹"˜m˜‹’ª¸Í˜›í˜˜BŠ˜M˜r˜m¸Í‹=Š¢rÃC#"“°¢F6†ææVÃÒ‡7G&–ær’‚F%²v6†ææVÂuÓóòv&÷F‚r“²–b‚–åö'&’‚F6†ææVÂÅ²w6×2rÂv&ÆRrÂv&÷F‚uÒÇG'VR’’F6†ææVÃÒv&÷F‚s°¢FÆ–æ³Õö6ö×ç•ö&ÆUö&÷EöÆ–æ²…ö6ö×ç•ö&ÆU÷–ÖVçE÷7F'E÷Fö¶Vâ‚G–ÖVçB’“°¢–b‚FÆ–æ³ÓÓÒrr’‡GG£¦W'&÷"‚}˜M¸Í˜mª’ŠŠ}‹-˜¸ÂŠ˜M˜rŠý‹Š­˜m‹¸Í˜]Š}Š¢Š½ŠŠ¢˜m‹MŠý˜rŠ}‹=Š¢rÃC#"“°¢FFVÆ—fW'“Õö6ö×ç•öFVÆ—fW%÷–ÖVçEöÆ–æ²‚G–ÖVçBÂFÆ–æ²ÂF6†ææVÂÂ†–çB’GU²v–BuÒ“°¢ö6ö×ç•öÆör‚†–çB’G–ÖVçE²w&WVW7Eö–BuÒÂ†–çB’GU²v–BuÒÂw–ÖVçEöÆ–æµ÷6VçBrÂ}˜M¸Í˜mª’›í‹ŠýŠ}ŠíŠ¢Š˜M˜rŠ}‹‹=Š}˜B‹MŠòrÅ²v6†ææVÂsÓâF6†ææVÂÂvFVÆ—fW'’sÓâFFVÆ—fW'•Ò“°¢&WGW&â²vö²sÓçG'VRÂv&÷EöÆ–æ²sÓâFÆ–æ²ÂvFVÆ—fW'’sÓâFFVÆ—fW'•Ó°§ÒÆfÇ6RÃ“’“° §&÷WFR‚uõ5BrÂrö’ö6ö×ç’×&WVW7B÷–ÖVçB×&W6VæBrÆgVæ7F–öâ‚GÂF"ÂGR—°¢G–ÖVçCÕö6ö×ç•÷–ÖVçEögVÆÂ‚†–çB’‚F%²w–ÖVçEö–BuÓóó’“°¢–b‚G–ÖVçB’‡GG£¦W'&÷"‚}›í‹ŠýŠ}ŠíŠ¢¸ÍŠ}˜Š¢˜m‹MŠòrÃCB“°¢–b‚†–çB’G–ÖVçE²wW6W%ö–BuÒÓÒ†–çB’GU²v–BuÒ’‡GG£¦W'&÷"‚}Šý‹=Š­‹‹=¸Â˜]ŠÍŠ}‹"˜m¸Í‹=Š¢rÃC2“°¢–b‚G–ÖVçE²vÖWF†öBuÒÓÒv&ÆU÷vÆÆWBr’‡GG£¦W'&÷"‚}Š}¸Í˜b›í‹ŠýŠ}ŠíŠ¢Š}‹"˜m˜‹’ª¸Í˜›í˜˜BŠ˜M˜r˜m¸Í‹=Š¢rÃC#"“°¢–b‚G–ÖVçE²w7FGW2uÓÓÓÒw–Br’&WGW&â²vö²sÓçG'VRÂw7FGW2sÓâw–BuÓ°¢G&÷f–FW#×G&–Ò‚‡7G&–ær•ö6ö×ç•÷6WGF–æuövWB‚v&ÆU÷&÷f–FW%÷Fö¶VârÂrr’“²–b‚G&÷f–FW#ÓÓÒrr’‡GG£¦W'&÷"‚}Š­˜ª˜b›í‹ŠýŠ}ŠíŠ¢Š˜M˜rŠ­˜m‹¸Í˜R˜m‹MŠý˜rŠ}‹=Š¢rÃC#"“°¢F6†CÔ&ÆT&÷C£¦f–æD6†Df÷%W6W"‚†–çB’GU²v–BuÒ“²–b‚F6†B’‡GG£¦W'&÷"‚}ŠÝ‹=Š}Š‚Š˜M˜r‹M˜]ŠrŠ˜r‹=Š}˜]Š}˜m˜r˜]Š­‹]˜B˜m¸Í‹=Š¢rÃC#"“°¢G†÷FóÒ‡7G&–ær•ö6ö×ç•÷6WGF–æuövWB‚v&ÆUö–çfö–6U÷†÷Fõ÷W&ÂrÂrr“°¢G&W3Ô&ÆT&÷C£§6VæD–çfö–6R‚F6†BÆÖ%÷7V'7G"‚‡7G&–ær’G–ÖVçE²w&WVW7E÷F—FÆRuÒÃÃ3"’Â}˜}‹-¸Í˜m˜rŠý‹Ší˜Š}‹=Š¢râG–ÖVçE²w&WVW7E÷G&6¶–æruÒârŠý‹‹=Š}˜]Š}˜m˜rŠí‹}¸ÍŠ}‹rÂ‡7G&–ær’G–ÖVçE²v–çfö–6U÷–ÆöBuÒÂ†–çB’G–ÖVçE²vÖ÷VçBuÒÂG&÷f–FW"ÂG†÷FòÃ2“°¢–b†V×G’‚G&W5²vö²uÒ’—²F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7E÷–ÖVçG24UBÆ7EöW'&÷#ÓòÇ&u÷–ÆöCÓòt„U$R–CÓò"Å²‡7G&–ær’‚G&W5²vFW67&—F–öâuÓóòG&W5²vW'&÷"uÓóòv–çfö–6U÷&W6VæEöf–ÆVBr’Æ§6öåöVæ6öFR‚G&W2Ä¥4ôåõTäU44TEõTä”4ôDR’Â†–çB’G–ÖVçE²v–BuÕÒ“²‡GG£¦W'&÷"‚}Š}‹‹=Š}˜B˜]ŠÍŠýŠò‹]˜‹Š­ŠÝ‹=Š}Š‚˜mŠ}˜]˜˜˜"Š˜ŠòrÃC#"“²Ð¢FÖW76vT–CÒG&W5²w&W7VÇBuÕ²vÖW76vUö–BuÓóòG&W5²vÖW76vUö–BuÓóöçVÆÃ°¢F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7E÷–ÖVçG24UB7FGW3ÒwVæF–ærrÆ–çfö–6UöÖW76vUö–CÓòÆ–çfö–6U÷6VçEöCÔäõr‚’ÆÆ7EöW'&÷#ÔåTÄÂÇ&u÷–ÆöCÓòt„U$R–CÓò"Å²FÖW76vT–BÆ§6öåöVæ6öFR‚G&W2Ä¥4ôåõTäU44TEõTä”4ôDR’Â†–çB’G–ÖVçE²v–BuÕÒ“°¢ö6ö×ç•öÆör‚†–çB’G–ÖVçE²w&WVW7Eö–BuÒÂ†–çB’GU²v–BuÒÂv&ÆUö–çfö–6U÷&W6VçBrÂ}‹]˜‹Š­ŠÝ‹=Š}Š‚Š˜M˜r˜]ŠÍŠýŠýŠ}˜²Š}‹‹=Š}˜B‹MŠòrÅ²w–ÖVçEö–BsÓâ†–çB’G–ÖVçE²v–BuÒÂvÖW76vUö–BsÓâFÖW76vT–EÒ“°¢&WGW&â²vö²sÓçG'VRÂw–ÖVçEö–BsÓâ†–çB’G–ÖVçE²v–BuÒÂw7FGW2sÓâwVæF–ærrÂv–çfö–6U÷6VçBsÓçG'VUÓ°§ÒÆfÇ6RÃ“’“° §&÷WFR‚uõ5BrÂrö’öFÖ–âö6ö×ç’×–ÖVçG2÷&V6öæ6–ÆRrÆgVæ7F–öâ‚GÂF"ÂGR—°¢FÆ–Ö—CÖÖ‚ƒÆÖ–âƒÂ†–çB’‚F%²vÆ–Ö—BuÓóó3’’“°¢G&÷w3ÔF#£¦ÆÂ‚%4TÄT5Bâ¢Ç"çW6W%ö–BÇ"çG&6¶–æuö6öFR&WVW7E÷G&6¶–ærÇ'BçF—FÆR&WVW7E÷F—FÆRe$ôÒ6ö×ç•÷&WVW7E÷–ÖVçG2¤ô”â6ö×ç•÷&WVW7G2"ôâ"æ–C×ç&WVW7Eö–B¤ô”â6ö×ç•÷&WVW7E÷G—W2'Bôâ'Bæ–C×"ç&WVW7E÷G—Uö–Bt„U$RæÖWF†öCÒv&ÆU÷vÆÆWBräBç7FGW2”â‚wVæF–ærrÂw&V6†V6¶÷WBr’äB‡çG&ç67F–öåö–B•2äõBåTÄÂõ"ç&÷f–FW%÷G&ç67F–öåö–B•2äõBåTÄÂ’õ$DU"%’4ôÄU44R‡æÆ7Eö–çV—&VEöBÇæ7&VFVEöB’42Ä”Ô•B"âFÆ–Ö—B“°¢F÷WCÕµÓ²f÷&V6‚‚G&÷w22G&÷r’F÷WEµÓÕ²w–ÖVçEö–BsÓâ†–çB’G&÷u²v–BuÕÒµö6ö×ç•÷–ÖVçEö–çV—&R‚G&÷r“°¢&WGW&â²vö²sÓçG'VRÂv6÷VçBsÓæ6÷VçB‚F÷WB’Âv—FV×2sÓâF÷WEÓ°§ÒÆfÇ6RÄDÔ”â“° §&÷WFR‚uõ5BrÂrö’ö6ö×ç’×&WVW7B÷7V&Ö—BrÆgVæ7F–öâ‚GÂF"ÂGR—°¢G&WÕö6ö×ç•÷&WVW7Eö÷væVB‚†–çB’‚F%²w&WVW7Eö–BuÓóó’ÂGRÆfÇ6R“²FFö73Õö6ö×ç•÷&WV—&VEöFö75÷7FFR‚G&W“²–b‚FFö75²v6ö×ÆWFRuÒ’‡GG£¦W'&÷"‚}˜]ŠýŠ}‹ª’Šý‹Ší˜Š}‹=Š¢˜mŠ}˜-‹RŠ}‹=Š¢rÃC#"“°¢–b‚G&W²w–ÖVçE÷7FGW2uÒÓÒw–Br’‡GG£¦W'&÷"‚}›í‹ŠýŠ}ŠíŠ¢Šý‹Ší˜Š}‹=Š¢˜}˜m˜‹"Š­Š=¸Í¸ÍŠò˜m‹MŠý˜rŠ}‹=Š¢rÃC#"“°¢F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7G24UB7FGW3ÒwVæF–æu÷&Wf–WrrÆÆ7E÷7FGW5öCÔäõr‚’t„U$R–CÓò"Å²G&W²v–BuÕÒ“°¢ö6ö×ç•öÆör‚G&W²v–BuÒÂGU²v–BuÒÂw7V&Ö—GFVBrÂ}Šý‹Ší˜Š}‹=Š¢Š‹Š}¸ÂŠ‹‹‹=¸Â˜m˜}Š}¸Í¸ÂŠ}‹‹=Š}˜B‹MŠòr“°¢Fg&W6ƒÕö6ö×ç•÷&WVW7Eö÷væVB‚G&W²v–BuÒÂGRÆfÇ6R“°¢ö6ö×ç•öæ÷F–g•öFÖ–ç2‚Fg&W6‚Â}Šý‹Ší˜Š}‹=Š¢˜]ŠýŠ}‹ª’ŠÍŠý¸ÍŠòŠ‹Š}¸ÂŠ‹‹‹=¸ÂrÂ}ªŠò‹˜}ªý¸Í‹¸Ã¢râFg&W6…²wG&6¶–æuö6öFRuÒâ%Æâ"â}ŠíŠý˜]Š£¢râ‚Fg&W6…²w&WVW7E÷G—U÷F—FÆRuÓóòrr’Å²vWfVçBsÓâw7V&Ö—GFVBuÒ“°¢&WGW&â²vö²sÓçG'VRÂw7FGW2sÓâwVæF–æu÷&Wf–WruÓ°§ÒÆfÇ6RÃ“’“° §&÷WFR‚ttUBrÂrö’ö6ö×ç’×&WVW7BöÆ—7BrÆgVæ7F–öâ‚GÂF"ÂGR—°¢G&÷w3ÔF#£¦ÆÂ‚%4TÄT5B7"æ–BÆ7"çG&6¶–æuö6öFRÆ7"ç7FGW2Æ7"æÖ÷VçBÆ7"ç–ÖVçEöÖWF†öBÆ7"ç–ÖVçE÷7FGW2Æ7"æ7&VFVEöBÆ7'Bæ6öFR&WVW7E÷G—RÆ7'BçF—FÆR&WVW7E÷G—U÷F—FÆRe$ôÒ6ö×ç•÷&WVW7G27"¤ô”â6ö×ç•÷&WVW7E÷G—W27'Bôâ7'Bæ–CÖ7"ç&WVW7E÷G—Uö–Bt„U$R7"çW6W%ö–CÓòõ$DU"%’7"æ–BDU42"Å²GU²v–BuÕÒ“²&WGW&â²vö²sÓçG'VRÂv—FV×2sÓâG&÷w5Ó°§ÒÆfÇ6RÃ“’“°§&÷WFR‚ttUBrÂrö’ö6ö×ç’×&WVW7BöFWF–Â÷¶–GÒrÆgVæ7F–öâ‚GÂF"ÂGR—²GƒÕö6ö×ç•÷&WVW7Eö÷væVB‚G²v–BuÒÂGRÆfÇ6R“²G…²vf–ÆW2uÓÔF#£¦ÆÂ‚%4TÄT5B–BÆFö7VÖVçE÷G—RÆf–ÆUöæÖRÆf–ÆU÷F‚ÆÖ–ÖU÷G—RÆf–ÆU÷6—¦RÆ7&VFVEöBe$ôÒ6ö×ç•÷&WVW7Eöf–ÆW2t„U$R&WVW7Eö–CÓòõ$DU"%’–B"Å²G…²v–BuÕÒ“²G…²w–ÖVçG2uÓÔF#£¦ÆÂ‚%4TÄT5B–BÆÖWF†öBÆÖ÷VçBÆFV6Æ&VEöÖ÷VçBÇ7FGW2ÇG&ç67F–öåö–BÇ&÷f–FW%÷G&ç67F–öåö–BÇG&6¶–æuö6öFRÇ&V6V—Eöf–ÆUö–BÇ&V6V—Eöf–ÆU÷F‚Ç–EöBÆ&æµöæÖRÇ&V¦V7F–öå÷&V6öâÇ&Wf–Wuöæ÷FRÇfW&–f–VEöBÆ7&VFVEöBe$ôÒ6ö×ç•÷&WVW7E÷–ÖVçG2t„U$R&WVW7Eö–CÓòõ$DU"%’–BDU42"Å²G…²v–BuÕÒ“²G…²vÆöw2uÓÔF#£¦ÆÂ‚%4TÄT5B7F–öâÆFW67&—F–öâÆ7&VFVEöBe$ôÒ6ö×ç•÷&WVW7EöÆöw2t„U$R&WVW7Eö–CÓòõ$DU"%’–B"Å²G…²v–BuÕÒ“²&WGW&â²vö²sÓçG'VRÂv—FVÒsÓâG…Ó²ÒÆfÇ6RÃ“’“°§&÷WFR‚uõ5BrÂrö’ö6ö×ç’×&WVW7B÷WFFR÷¶–GÒrÆgVæ7F–öâ‚GÂF"ÂGR—°¢G&WÕö6ö×ç•÷&WVW7Eö÷væVB‚†–çB’G²v–BuÒÂGRÆfÇ6R“°¢–b‚–åö'&’‚‡7G&–ær’G&W²w7FGW2uÒÅ²vG&gBrÂvFö7VÖVçG5÷VæF–ærrÂw–ÖVçE÷VæF–ærrÂvæVVG5ö6÷'&V7F–öâuÒÇG'VR’’‡GG£¦W'&÷"‚}Š}¸Í˜bŠý‹Ší˜Š}‹=Š¢›í‹2Š}‹"Š}‹‹=Š}˜B˜m˜}Š}¸Í¸Â˜-Š}Š˜B˜¸Í‹Š}¸Í‹B˜m¸Í‹=Š¢rÃC#"“°¢Ff÷&ÓÒF%²vf÷&ÕöFFuÓóõµÓ²–b‚—5ö'&’‚Ff÷&Ò’’‡GG£¦W'&÷"‚}Š}‹}˜MŠ}‹Š}Š¢Šý‹Ší˜Š}‹=Š¢˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÃC#"“°¢F#£§'Vâ‚%UDDR6ö×ç•÷&WVW7G24UBf÷&ÕöFFÓòÇ7FGW3Ô”b‡7FGW3ÒvæVVG5ö6÷'&V7F–öârÂvFö7VÖVçG5÷VæF–ærrÇ7FGW2’ÇWFFVEöCÔäõr‚’t„U$R–CÓò"Å¶§6öåöVæ6öFR‚Ff÷&ÒÄ¥4ôåõTäU44TEõTä”4ôDR’Â†–çB’G&W²v–BuÕÒ“°¢ö6ö×ç•öÆör‚†–çB’G&W²v–BuÒÂ†–çB’GU²v–BuÒÂwW6W%÷WFFVBrÂ}Š}‹}˜MŠ}‹Š}Š¢Šý‹Ší˜Š}‹=Š¢Š­˜‹=‹rªŠ}‹Š‹˜¸Í‹Š}¸Í‹B‹MŠòr“°¢&WGW&â²vö²sÓçG'VRÂv–BsÓâ†–çB’G&W²v–BuÒÂwG&6¶–æuö6öFRsÓâG&W²wG&6¶–æuö6öFRuÒÂvÖ÷VçBsÓâ†–çB’G&W²vÖ÷VçBuÕÓ°§ÒÆfÇ6RÃ“’“°§&÷WFR‚tDTÄUDRrÂrö’ö6ö×ç’×&WVW7B÷¶–GÒrÆgVæ7F–öâ‚GÂF"ÂGR—°¢G&WÕö6ö×ç•÷&WVW7Eö÷væVB‚†–çB’G²v–BuÒÂGRÆfÇ6R“°¢–b‚–åö'&’‚‡7G&–ær’G&W²w7FGW2uÒÅ²vG&gBrÂvFö7VÖVçG5÷VæF–ærrÂw–ÖVçE÷VæF–ærrÂvæVVG5ö6÷'&V7F–öârÂv6æ6VÆÆVBrÂw&V¦V7FVBuÒÇG'VR’’‡GG£¦W'&÷"‚}Šý‹Ší˜Š}‹=Š¢Š}‹‹=Š}˜N(Í‹MŠý˜r¸ÍŠrŠ­Š=¸Í¸ÍŠý‹MŠý˜r˜-Š}Š˜BŠÝ‹˜˜m¸Í‹=Š¢rÃC#"“°¢–b‚‡7G&–ær’G&W²w–ÖVçE÷7FGW2uÓÓÓÒw–Br’‡GG£¦W'&÷"‚}Šý‹Ší˜Š}‹=Š¢ŠýŠ}‹Š}¸Â›í‹ŠýŠ}ŠíŠ¢Š­Š=¸Í¸ÍŠý‹MŠý˜r˜-Š}Š˜BŠÝ‹˜˜m¸Í‹=Š¢rÃC#"“°¢Ff–ÆW3ÔF#£¦ÆÂ‚%4TÄT5Bf–ÆU÷F‚Æ÷&–v–æÅ÷F‚Ç&ö6W76VE÷F‚ÇF‡VÖ&æ–Å÷F‚e$ôÒ6ö×ç•÷&WVW7Eöf–ÆW2t„U$R&WVW7Eö–CÓò"Å²†–çB’G&W²v–BuÕÒ“°¢F#£§Fò‚’Óæ&Vv–åG&ç67F–öâ‚“²G'—°¢F#£§'Vâ‚$DTÄUDRe$ôÒ6ö×ç•ö6&E÷–ÖVçG2t„U$R&WVW7Eö–CÓò"Å²†–çB’G&W²v–BuÕÒ“°¢F#£§'Vâ‚$DTÄUDRe$ôÒ6ö×ç•÷&WVW7E÷–ÖVçG2t„U$R&WVW7Eö–CÓò"Å²†–çB’G&W²v–BuÕÒ“°¢F#£§'Vâ‚$DTÄUDRe$ôÒ6ö×ç•÷&WVW7EöÆöw2t„U$R&WVW7Eö–CÓò"Å²†–çB’G&W²v–BuÕÒ“°¢F#£§'Vâ‚$DTÄUDRe$ôÒ6ö×ç•÷&WVW7Eöf–ÆW2t„U$R&WVW7Eö–CÓò"Å²†–çB’G&W²v–BuÕÒ“°¢F#£§'Vâ‚$DTÄUDRe$ôÒ6ö×ç•÷&WVW7G2t„U$R–CÓò"Å²†–çB’G&W²v–BuÕÒ“°¢F#£§Fò‚’Óæ6öÖÖ—B‚“°¢Ö6F6‚…F‡&÷v&ÆRFR—²–b„F#£§Fò‚’Óæ–åG&ç67F–öâ‚’’F#£§Fò‚’Óç&öÆÄ&6²‚“²F‡&÷rFS²Ð¢G&ö÷CÖF—&æÖR…õôD•%õò’âr÷V&Æ–2òs²f÷&V6‚‚Ff–ÆW22Fb’f÷&V6‚…²vf–ÆU÷F‚rÂv÷&–v–æÅ÷F‚rÂw&ö6W76VE÷F‚rÂwF‡VÖ&æ–Å÷F‚uÒ2F²—²G&VÃÖÇG&–Ò‚‡7G&–ær’‚Fe²FµÓóòrr’Âròr“²–b‚G&VÂÓÒrrbb7G%÷7F'G5÷v—F‚‚G&VÂÂwWÆöG2ö6ö×ç•÷&WVW7G2òr’’VæÆ–æ²‚G&ö÷BâG&VÂ“²Ð¢&WGW&â²vö²sÓçG'VRÂvFVÆWFVBsÓçG'VRÂv–BsÓâ†–çB’G&W²v–BuÕÓ°§ÒÆfÇ6RÃ“’“° §&÷WFR‚ttUBrÂrö’öFÖ–âö6ö×ç’×&WVW7G2÷7FG2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢G&÷sÔF#£¦öæR‚%4TÄT5B4õTåB‚¢’F÷FÂÅ5TÒ‡7FGW3ÒwVæF–æu÷&Wf–Wrr’VæF–æu÷&Wf–WrÅ5TÒ‡7FGW3ÒvæVVG5ö6÷'&V7F–öâr’æVVG5ö6÷'&V7F–öâÅ5TÒ‡7FGW3Òv&÷fVBr’&÷fVBÅ5TÒ‡7FGW3Òv6ö×ÆWFVBr’6ö×ÆWFVBÅ5TÒ‡7FGW3Òw&V¦V7FVBr’&V¦V7FVBÅ5TÒ‡–ÖVçE÷7FGW3ÒwVæF–ærr’–ÖVçE÷VæF–ærÅ5TÒ‡–ÖVçE÷7FGW3Òw–Br’–Eö6÷VçBÄ4ôÄU44R…5TÒ„44Rt„Tâ–ÖVçE÷7FGW3Òw–BrD„TâÖ÷VçBTÅ4RTäB’Ã’–EöÖ÷VçBÅ5TÒ†GVUöB•2äõBåTÄÂäBGVUöCÄäõr‚’äB7FGW2äõB”â‚v6ö×ÆWFVBrÂw&V¦V7FVBrÂv6æ6VÆÆVBr’’÷fW&GVRÅ5TÒ„DDR†7&VFVEöB“Ô5U$DDR‚’’FöF•ö6÷VçBe$ôÒ6ö×ç•÷&WVW7G2"“°¢GG—W3ÔF#£¦ÆÂ‚%4TÄT5B'Bæ6öFRÇ'BçF—FÆRÄ4õTåB†7"æ–B’6÷VçBe$ôÒ6ö×ç•÷&WVW7E÷G—W2'BÄTeB¤ô”â6ö×ç•÷&WVW7G27"ôâ7"ç&WVW7E÷G—Uö–C×'Bæ–Bu$õU%’'Bæ–Bõ$DU"%’6÷VçBDU42"“°¢&WGW&â²vö²sÓçG'VRÂw7FG2sÓâG&÷só¥µÒÂwG—W2sÓâGG—W5Ó°§ÒÆfÇ6RÄDÔ”â“°§&÷WFR‚uõ5BrÂrö’öFÖ–âö6ö×ç’×&WVW7G2÷6Æ×66ârÆgVæ7F–öâ‚GÂF"ÂGR—°¢òò‹=Š}ŠíŠ­Š}‹Šý¸ÍŠ­Š}Š¸Í‹2Šý‹˜]‹ŠÝ˜M˜r˜m‹]Š‚ýŠ}‹Š­˜-ŠrŠ}¸ÍŠÍŠ}Šò˜]¸Î(Í‹M˜Šý‰²Š}ŠÍ‹Š}¸ÂÅDU"õ4„õrŠý‹˜}‹Šý‹Ší˜Š}‹=Š¢ŠÝ‹˜‹MŠòà¢G'—°¢F†÷W'3ÖÖ‚ƒÆÖ–âƒc‚Â†–çB•ö6ö×ç•÷6WGF–æuövWB‚w6Æ÷v&æ–æuö†÷W'2rÃ#B’’“°¢G&÷w3ÔF#£¦ÆÂ‚%4TÄT5B7"â¢Æ7'BçF—FÆR&WVW7E÷G—U÷F—FÆRe$ôÒ6ö×ç•÷&WVW7G27"¤ô”â6ö×ç•÷&WVW7E÷G—W27'Bôâ7'Bæ–CÖ7"ç&WVW7E÷G—Uö–Bt„U$R7"æGVUöB•2äõBåTÄÂäB7"ç7FGW2äõB”â‚v6ö×ÆWFVBrÂw&V¦V7FVBrÂv6æ6VÆÆVBr’äB7"æGVUöCÃÔDDUôDB„äõr‚’Ä”åDU%dÂ²F†÷W'7Ò„õU"’äB†7"æÆ7E÷6Æöæ÷F–f–VEöB•2åTÄÂõ"7"æÆ7E÷6Æöæ÷F–f–VEöCÄDDUõ5T"„äõr‚’Ä”åDU%dÂ"„õU"’’õ$DU"%’7"æGVUöB"“°¢Ö6F6‚…F‡&÷v&ÆRFR—°¢W'&÷%öÆör‚v6ö×ç’4ÄVW'’f–ÆVC¢râFRÓævWDÖW76vR‚’“°¢‡GG£¦W'&÷"‚}Š}ŠÍ‹Š}¸ÂŠ‹‹‹=¸Â˜]˜}˜MŠ¢Šý‹Ší˜Š}‹=Š®(Í˜}Šr˜mŠ}˜]˜˜˜"Š˜ŠòrÃS“°¢Ð¢G&ö6W76VCÓ°¢f÷&V6‚‚G&÷w22G"—°¢G'—²ö6ö×ç•öæ÷F–g•öFÖ–ç2‚G"Â}˜}‹MŠýŠ}‹˜]˜}˜MŠ¢Šý‹Ší˜Š}‹=Š¢˜]ŠýŠ}‹ª’rÂ}ªŠò‹˜}ªý¸Í‹¸Ã¢râG%²wG&6¶–æuö6öFRuÒâ%Æâ"â}ŠíŠý˜]Š£¢râG%²w&WVW7E÷G—U÷F—FÆRuÒâ%Æâ"â}˜]˜}˜MŠ£¢râ‚G%²vGVUöBuÓóòrr’Å²vWfVçBsÓâw6Æ÷v&æ–æruÒ“²Ö6F6‚…F‡&÷v&ÆRFR—²W'&÷%öÆör‚v6ö×ç’4Äæ÷F–g“¢râFRÓævWDÖW76vR‚’“²Ð¢G'—²F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7G24UBÆ7E÷6Æöæ÷F–f–VEöCÔäõr‚’t„U$R–CÓò"Å²†–çB’G%²v–BuÕÒ“²Ö6F6‚…F‡&÷v&ÆRFR—²W'&÷%öÆör‚v6ö×ç’4ÄF–ÖW7F×¢râFRÓævWDÖW76vR‚’“²6öçF–çVS²Ð¢G'—²ö6ö×ç•öÆör‚G%²v–BuÒÂGU²v–BuÒÂw6Æ÷v&æ–ærrÂ}˜}‹MŠýŠ}‹˜m‹-Šý¸Íªž(Í‹MŠý˜b¸ÍŠr‹Š˜‹Š}‹"˜]˜}˜MŠ¢Š}‹‹=Š}˜B‹MŠòr“²Ö6F6‚…F‡&÷v&ÆRFR—²W'&÷%öÆör‚v6ö×ç’4ÄÆös¢râFRÓævWDÖW76vR‚’“²Ð¢G&ö6W76VB²³°¢Ð¢&WGW&â²vö²sÓçG'VRÂv6÷VçBsÓâG&ö6W76VEÓ°§ÒÆfÇ6RÄDÔ”â“°§&÷WFR‚ttUBrÂrö’öFÖ–âö6ö×ç’×&WVW7G2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢G7FGW3×G&–Ò‚‡7G&–ær’‚EôtUE²w7FGW2uÓóòrr’“²G×G&–Ò‚‡7G&–ær’‚EôtUE²wuÓóòrr’“²F÷fW&GVSÒ†–çB’‚EôtUE²v÷fW&GVRuÓóó“²G–ÖVçC×G&–Ò‚‡7G&–ær’‚EôtUE²w–ÖVçE÷7FGW2uÓóòrr’“°¢Gv†W&SÕ²sÓuÓ²F&w3ÕµÓ²–b‚G7FGW2ÓÒrr—²Gv†W&UµÓÒv7"ç7FGW3Óòs²F&w5µÓÒG7FGW3²Ò–b‚G–ÖVçBÓÒrr—²Gv†W&UµÓÒv7"ç–ÖVçE÷7FGW3Óòs²F&w5µÓÒG–ÖVçC²Ò–b‚F÷fW&GVR—²Gv†W&UµÓÒ&7"æGVUöB•2äõBåTÄÂäB7"æGVUöCÄäõr‚’äB7"ç7FGW2äõB”â‚v6ö×ÆWFVBrÂw&V¦V7FVBrÂv6æ6VÆÆVBr’#·Ò–b‚GÓÒrr—²Gv†W&UµÓÒ"†7"çG&6¶–æuö6öFRÄ”´Ròõ"7'BçF—FÆRÄ”´Ròõ"4ôä4B„4ôÄU44R‡W2æf—'7EöæÖRÂrr’ÂrrÄ4ôÄU44R‡W2æÆ7EöæÖRÂrr’’Ä”´Rò’#²F&w3Ö'&•öÖW&vR‚F&w2Å²"RGR"Â"RGR"Â"RGR%Ò“²Ð¢G&÷w3ÔF#£¦ÆÂ‚%4TÄT5B7"â¢Æ7'Bæ6öFR&WVW7E÷G—Uö6öFRÆ7'BçF—FÆR&WVW7E÷G—U÷F—FÆRÄ4ôä4B„4ôÄU44R‡W2æf—'7EöæÖRÂrr’ÂrrÄ4ôÄU44R‡W2æÆ7EöæÖRÂrr’’W6W%öæÖRÄ4ôä4B„4ôÄU44R†72æf—'7EöæÖRÂrr’ÂrrÄ4ôÄU44R†72æÆ7EöæÖRÂrr’’76–væVEöæÖRÂ†7"æGVUöB•2äõBåTÄÂäB7"æGVUöCÄäõr‚’äB7"ç7FGW2äõB”â‚v6ö×ÆWFVBrÂw&V¦V7FVBrÂv6æ6VÆÆVBr’’—5ö÷fW&GVRe$ôÒ6ö×ç•÷&WVW7G27"¤ô”â6ö×ç•÷&WVW7E÷G—W27'Bôâ7'Bæ–CÖ7"ç&WVW7E÷G—Uö–BÄTeB¤ô”âW6W'2W2ôâW2æ–CÖ7"çW6W%ö–BÄTeB¤ô”âW6W'272ôâ72æ–CÖ7"æ76–væVE÷Fòt„U$R"æ–×ÆöFR‚räBrÂGv†W&R’â"õ$DU"%’—5ö÷fW&GVRDU42Æ7"æ–BDU42Ä”Ô•BS"ÂF&w2“²&WGW&â²vö²sÓçG'VRÂv—FV×2sÓâG&÷w5Ó°§ÒÆfÇ6RÄDÔ”â“°§&÷WFR‚ttUBrÂrö’öFÖ–âö6ö×ç’×&WVW7G2÷¶–GÒrÆgVæ7F–öâ‚GÂF"ÂGR—²ö6ö×ç•öf–ÆW5÷66†VÖöVç7W&R‚“²GƒÕö6ö×ç•÷&WVW7Eö÷væVB‚G²v–BuÒÂGRÇG'VR“²G…²vf–ÆW2uÓÔF#£¦ÆÂ‚%4TÄT5B¢e$ôÒ6ö×ç•÷&WVW7Eöf–ÆW2t„U$R&WVW7Eö–CÓòõ$DU"%’–B"Å²G…²v–BuÕÒ“²G…²w–ÖVçG2uÓÔF#£¦ÆÂ‚%4TÄT5B¢e$ôÒ6ö×ç•÷&WVW7E÷–ÖVçG2t„U$R&WVW7Eö–CÓòõ$DU"%’–BDU42"Å²G…²v–BuÕÒ“²G…²vÆöw2uÓÔF#£¦ÆÂ‚%4TÄT5BÂâ¢Ä4ôä4B„4ôÄU44R‡W2æf—'7EöæÖRÂrr’ÂrrÄ4ôÄU44R‡W2æÆ7EöæÖRÂrr’’W6W%öæÖRe$ôÒ6ö×ç•÷&WVW7EöÆöw2ÂÄTeB¤ô”âW6W'2W2ôâW2æ–CÖÂçW6W%ö–Bt„U$R&WVW7Eö–CÓòõ$DU"%’Âæ–B"Å²G…²v–BuÕÒ“²&WGW&â²vö²sÓçG'VRÂv—FVÒsÓâG…Ó²ÒÆfÇ6RÄDÔ”â“°§&÷WFR‚tDTÄUDRrÂrö’öFÖ–âö6ö×ç’×&WVW7G2÷¶–GÒrÆgVæ7F–öâ‚GÂF"ÂGR—°¢F–CÒ†–çB’G²v–BuÓ²G&WÔF#£¦öæR‚%4TÄT5B¢e$ôÒ6ö×ç•÷&WVW7G2t„U$R–CÓò"Å²F–EÒ“²–b‚G&W’‡GG£¦W'&÷"‚}Šý‹Ší˜Š}‹=Š¢¸ÍŠ}˜Š¢˜m‹MŠòrÃCB“°¢Ff–ÆW3ÔF#£¦ÆÂ‚%4TÄT5Bf–ÆU÷F‚Æ÷&–v–æÅ÷F‚Ç&ö6W76VE÷F‚ÇF‡VÖ&æ–Å÷F‚e$ôÒ6ö×ç•÷&WVW7Eöf–ÆW2t„U$R&WVW7Eö–CÓò"Å²F–EÒ“°¢F#£§Fò‚’Óæ&Vv–åG&ç67F–öâ‚“²G'—°¢F#£§'Vâ‚$DTÄUDRe$ôÒ6ö×ç•ö6&E÷–ÖVçG2t„U$R&WVW7Eö–CÓò"Å²F–EÒ“²F#£§'Vâ‚$DTÄUDRe$ôÒ6ö×ç•÷&WVW7E÷–ÖVçG2t„U$R&WVW7Eö–CÓò"Å²F–EÒ“°¢F#£§'Vâ‚$DTÄUDRe$ôÒ6ö×ç•÷&WVW7EöÆöw2t„U$R&WVW7Eö–CÓò"Å²F–EÒ“²F#£§'Vâ‚$DTÄUDRe$ôÒ6ö×ç•÷&WVW7Eöf–ÆW2t„U$R&WVW7Eö–CÓò"Å²F–EÒ“²F#£§'Vâ‚$DTÄUDRe$ôÒ6ö×ç•÷&WVW7G2t„U$R–CÓò"Å²F–EÒ“²F#£§Fò‚’Óæ6öÖÖ—B‚“°¢Ö6F6‚…F‡&÷v&ÆRFR—¶–b„F#£§Fò‚’Óæ–åG&ç67F–öâ‚’’F#£§Fò‚’Óç&öÆÄ&6²‚“·F‡&÷rFS·Ð¢G&ö÷CÖF—&æÖR…õôD•%õò’âr÷V&Æ–2òs²f÷&V6‚‚Ff–ÆW22Fb’f÷&V6‚…²vf–ÆU÷F‚rÂv÷&–v–æÅ÷F‚rÂw&ö6W76VE÷F‚rÂwF‡VÖ&æ–Å÷F‚uÒ2F²—²G&VÃÖÇG&–Ò‚‡7G&–ær’‚Fe²FµÓóòrr’Âròr“¶–b‚G&VÂÓÒrrbg7G%÷7F'G5÷v—F‚‚G&VÂÂwWÆöG2ö6ö×ç•÷&WVW7G2òr’”VæÆ–æ²‚G&ö÷BâG&VÂ“·Ð¢&WGW&â²vö²sÓçG'VRÂvFVÆWFVBsÓçG'VRÂv–BsÓâF–EÓ°§ÒÆfÇ6RÄDÔ”â“°§&÷WFR‚uõ5BrÂrö’öFÖ–âö6ö×ç’×&WVW7G2÷¶–GÒ÷7FGW2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢G&WVW7D–CÒ†–çB’‚G²v–BuÓóó“°¢FÆÆ÷vVCÕ²vG&gBrÂvFö7VÖVçG5÷VæF–ærrÂw–ÖVçE÷VæF–ærrÂwVæF–æu÷&Wf–WrrÂvæVVG5ö6÷'&V7F–öârÂv&÷fVBrÂw&V¦V7FVBrÂv6ö×ÆWFVBrÂv6æ6VÆÆVBuÓ°¢G&u7FGW3×G&–Ò‚‡7G&–ær’‚F%²w7FGW2uÓóòrr’“°¢G7FGW4Æ–6W3Õ°¢v&÷fRsÓâv&÷fVBrÂv6öæf—&ÖVBsÓâv&÷fVBrÂ}Š­Š}¸Í¸ÍŠòsÓâv&÷fVBrÂ}Š­Š=¸Í¸ÍŠòsÓâv&÷fVBrÀ¢w&V¦V7BsÓâw&V¦V7FVBrÂ}‹ŠòsÓâw&V¦V7FVBrÀ¢v6ö×ÆWFRsÓâv6ö×ÆWFVBrÂvFöæRsÓâv6ö×ÆWFVBrÂ}Š­ª˜]¸Í˜BsÓâv6ö×ÆWFVBrÀ¢v6æ6VÂsÓâv6æ6VÆÆVBrÂ}˜M‹­˜‚sÓâv6æ6VÆÆVBrÀ¢v6÷'&V7F–öâsÓâvæVVG5ö6÷'&V7F–öârÂ}Š}‹]˜MŠ}ŠÒsÓâvæVVG5ö6÷'&V7F–öâp¢Ó°¢G7FGW3ÒG7FGW4Æ–6W5²G&u7FGW5ÓóòG&u7FGW3°¢Fæ÷FS×G&–Ò‚‡7G&–ær’‚F%²væ÷FRuÓóòF%²vFÖ–åöæ÷FRuÓóòrr’“°¢–b‚G&WVW7D–CÃ’‡GG£¦W'&÷"‚}‹M˜mŠ}‹=˜rŠý‹Ší˜Š}‹=Š¢˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÃC#"“°¢–b‚G7FGW3ÓÓÒrr’‡GG£¦W'&÷"‚}˜‹m‹¸ÍŠ¢ŠÍŠý¸ÍŠòŠ}‹‹=Š}˜B˜m‹MŠý˜rŠ}‹=Š¢rÃC#"“°¢–b‚–åö'&’‚G7FGW2ÂFÆÆ÷vVBÇG'VR’’‡GG£¦W'&÷"‚}˜‹m‹¸ÍŠ¢˜mŠ}˜]‹Š­Š‹Š}‹=Š£¢râG&u7FGW2ÃC#"“°¢–b†–åö'&’‚G7FGW2Å²w&V¦V7FVBrÂv6æ6VÆÆVBuÒÇG'VR’bbFæ÷FSÓÓÒrr’‡GG£¦W'&÷"‚}Š‹Š}¸Â‹Šò¸ÍŠr˜M‹­˜‚Šý‹Ší˜Š}‹=Š­ˆÂŠ½ŠŠ¢Š­˜‹m¸ÍŠÒŠ}˜M‹-Š}˜]¸ÂŠ}‹=Š¢rÃC#"“° ¢G'—°¢GƒÔF#£¦öæR‚%4TÄT5B–BÇW6W%ö–BÇG&6¶–æuö6öFRÇ7FGW2e$ôÒ6ö×ç•÷&WVW7G2t„U$R–CÓò"Å²G&WVW7D–EÒ“°¢Ö6F6‚…F‡&÷v&ÆRFR—°¢G&VcÒt5%2Õ$TBÒrâG&WVW7D–BârÒræFFR‚u–ÖD†—2r“°¢W'&÷%öÆör‚G&VbârrâFRÓævWDÖW76vR‚’“°¢‡GG£¦W'&÷"‚}Ší˜Š}˜mŠý˜bŠý‹Ší˜Š}‹=Š¢˜mŠ}˜]˜˜˜"Š˜ŠòâªŠò›í¸Íªý¸Í‹¸ÂŠí‹}Šs¢râG&VbÃS“°¢Ð¢–b‚G‚’‡GG£¦W'&÷"‚}Šý‹Ší˜Š}‹=Š¢¸ÍŠ}˜Š¢˜m‹MŠòrÃCB“° ¢GFW&Ö–æÃÖ–åö'&’‚G7FGW2Å²v6ö×ÆWFVBrÂw&V¦V7FVBrÂv6æ6VÆÆVBuÒÇG'VR“°¢G'—°¢òò˜}‹=Š­˜rŠ­‹­¸Í¸Í‹˜‹m‹¸ÍŠ¢˜˜-‹rŠ}‹"‹=Š­˜˜n(Í˜}Š}¸Â˜-‹}‹¸Â˜‚ŠŠý˜˜bª˜M¸ÍŠòŠíŠ}‹ŠÍ¸ÂŠ}‹=Š­˜Š}Šý˜r˜]¸Î(Íª˜mŠòà¢F#£§'Vâ€¢%UDDR6ö×ç•÷&WVW7G24UB7FGW3ÓòÆFÖ–åöæ÷FSÓòÆÆ7E÷7FGW5öCÔäõr‚’Æ6ö×ÆWFVEöCÒ"â‚GFW&Ö–æÃòtäõr‚’s¢tåTÄÂr’â"ÇWFFVEöCÔäõr‚’t„U$R–CÓò"À¢²G7FGW2ÂFæ÷FRÓÒrsòFæ÷FS¦çVÆÂÂG&WVW7D–EÐ¢“°¢Ö6F6‚…F‡&÷v&ÆRFR—°¢G&VcÒt5%2ÕUDDRÒrâG&WVW7D–BârÒræFFR‚u–ÖD†—2r“°¢W'&÷%öÆör‚G&VbârrâFRÓævWDÖW76vR‚’“°¢‡GG£¦W'&÷"‚}‹Ší¸Í‹˜r˜‹m‹¸ÍŠ¢Šý‹Ší˜Š}‹=Š¢˜mŠ}˜]˜˜˜"Š˜ŠòâªŠò›í¸Íªý¸Í‹¸ÂŠí‹}Šs¢râG&VbÃS“°¢Ð ¢òòŠ}‹}˜MŠ}‹Š}Š¢˜]˜]¸Í‹-¸Â˜‚Š}‹ŠÍŠ}‹ˆÂ‹­¸Í‹ŠÝ¸ÍŠ}Š­¸Â˜‚˜]‹=Š­˜-˜BŠ}‹"˜mŠ­¸ÍŠÍ˜rŠ}‹]˜M¸Â‹Ší¸Í‹˜r˜]¸Î(Í‹M˜˜mŠòà¢G'—°¢F#£§'Vâ‚%UDDR6ö×ç•÷&WVW7G24UB&Wf–WvVEö'“ÓòÇ&Wf–WvVEöCÔäõr‚’t„U$R–CÓò"Å²†–çB’‚GU²v–BuÓóó’ÂG&WVW7D–EÒ“°¢Ö6F6‚…F‡&÷v&ÆRFR—²W'&÷%öÆör‚t5%2ÔTD•BÒrâG&WVW7D–BârrâFRÓævWDÖW76vR‚’“²Ð¢–b†'&•ö¶W•öW†—7G2‚v76–væVE÷FòrÂF"’—°¢G'—°¢F76–væVEFóÒ‚F%²v76–væVE÷FòuÓÓÓÒrwÇÂF%²v76–væVE÷FòuÓÓÓÖçVÆÂ“öçVÆÃ¦Ö‚ƒÂ†–çB’F%²v76–væVE÷FòuÒ“°¢F#£§'Vâ‚%UDDR6ö×ç•÷&WVW7G24UB76–væVE÷FóÓòt„U$R–CÓò"Å²F76–væVEFòÂG&WVW7D–EÒ“°¢Ö6F6‚…F‡&÷v&ÆRFR—²W'&÷%öÆör‚t5%2Ô54”tâÒrâG&WVW7D–BârrâFRÓævWDÖW76vR‚’“²Ð¢Ð ¢G'—²ö6ö×ç•öÆör‚G&WVW7D–BÂ†–çB’‚GU²v–BuÓóó’Âw7FGW5ö6†ævVBrÂFæ÷FRÓÒrsòFæ÷FS¦çVÆÂÅ²vg&öÒsÓâG…²w7FGW2uÒÂwFòsÓâG7FGW5Ò“²Ð¢6F6‚…F‡&÷v&ÆRFR—²W'&÷%öÆör‚t5%2ÔÄôrÒrâG&WVW7D–BârrâFRÓævWDÖW76vR‚’“²Ð ¢GF—FÆSÒ}˜‹m‹¸ÍŠ¢Šý‹Ší˜Š}‹=Š¢‹M˜]ŠrŠ­‹­¸Í¸Í‹ª‹Šòs°¢F&öG“Ò}ªŠò‹˜}ªý¸Í‹¸Ã¢râG…²wG&6¶–æuö6öFRuÒâ%Æâ"â}˜‹m‹¸ÍŠ£¢råö6ö×ç•÷7FGW5÷F—FÆR‚G7FGW2’â‚Fæ÷FRÓÒrsò%Æâ"â}Š­˜‹m¸ÍŠÓ¢râFæ÷FS¢rr“°¢Fæ÷F–g•–ÆöCÒGƒ²Fæ÷F–g•–ÆöE²w7FGW2uÓÒG7FGW3°¢G'—²ö6ö×ç•öæ÷F–g•÷W6W"‚Fæ÷F–g•–ÆöBÂGF—FÆRÂF&öG’“²Ð¢6F6‚…F‡&÷v&ÆRFR—²W'&÷%öÆör‚t5%2ÔäõD”e’ÒrâG&WVW7D–BârrâFRÓævWDÖW76vR‚’“²Ð¢G'—²W6ƒ£¦æ÷F–g’…²†–çB’G…²wW6W%ö–BuÕÒÂGF—FÆRÂF&öG’Å²wG—RsÓâv6ö×ç•÷&WVW7BrÂw&WVW7Eö–BsÓâG&WVW7D–BÂw7FGW2sÓâG7FGW5Ò“²Ð¢6F6‚…F‡&÷v&ÆRFR—²W'&÷%öÆör‚t5%2ÕU4‚ÒrâG&WVW7D–BârrâFRÓævWDÖW76vR‚’“²Ð ¢&WGW&â²vö²sÓçG'VRÂw7FGW2sÓâG7FGW2Âw&WVW7Eö–BsÓâG&WVW7D–EÓ°§ÒÆfÇ6RÄDÔ”â“°§&÷WFR‚uõ5BrÂrö’öFÖ–âö6ö×ç’×&WVW7G2÷¶–GÒ÷–ÖVçB×&Wf–WrrÆgVæ7F–öâ‚GÂF"ÂGR—°¢G&WÕö6ö×ç•÷&WVW7Eö÷væVB‚G²v–BuÒÂGRÇG'VR“²G–ÖVçD–CÒ†–çB’‚F%²w–ÖVçEö–BuÓóó“²FFV6—6–öãÒF%²vFV6—6–öâuÓóòrs²–b‚–åö'&’‚FFV6—6–öâÅ²v&÷fRrÂw&V¦V7BuÒÇG'VR’’‡GG£¦W'&÷"‚}Š­‹]˜]¸Í˜R˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÃC#"“°¢G“ÔF#£¦öæR‚%4TÄT5B¢e$ôÒ6ö×ç•÷&WVW7E÷–ÖVçG2t„U$R–CÓòäB&WVW7Eö–CÓò"Å²G–ÖVçD–BÂG&W²v–BuÕÒ“²–b‚G’’‡GG£¦W'&÷"‚}›í‹ŠýŠ}ŠíŠ¢¸ÍŠ}˜Š¢˜m‹MŠòrÃCB“°¢–b‚FFV6—6–öãÓÓÒv&÷fRr—°¢F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7E÷–ÖVçG24UB7FGW3Òw–BrÇfW&–f–VEö'“ÓòÇfW&–f–VEöCÔäõr‚’Ç&V¦V7F–öå÷&V6öãÔåTÄÂÇ&Wf–Wuöæ÷FSÓòt„U$R–CÓò"Å²GU²v–BuÒÇG&–Ò‚‡7G&–ær’‚F%²væ÷FRuÓóòrr’“ó¦çVÆÂÂG–ÖVçD–EÒ“²F#£¦W†V2‚%UDDR6ö×ç•ö6&E÷–ÖVçG24UB7FGW3Òw–BrÇ&Wf–WvVEö'“ÓòÇ&Wf–WvVEöCÔäõr‚’Ç&V¦V7E÷&V6öãÔåTÄÂÆ÷W&F÷%öæ÷FSÓòt„U$R–ÖVçEö–CÓò"Å²GU²v–BuÒÇG&–Ò‚‡7G&–ær’‚F%²væ÷FRuÓóòrr’“ó¦çVÆÂÂG–ÖVçD–EÒ“²F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7G24UB–ÖVçE÷7FGW3Òw–BrÇ7FGW3ÒwVæF–æu÷&Wf–Wrrt„U$R–CÓò"Å²G&W²v–BuÕÒ“°¢ö6ö×ç•öÆör‚G&W²v–BuÒÂGU²v–BuÒÂv6&E÷–ÖVçEö&÷fVBrÂ}›í‹ŠýŠ}ŠíŠ¢ªŠ}‹Š®(ÍŠ˜~(ÍªŠ}‹Š¢Š­Š=¸Í¸ÍŠò‹MŠòrÅ²w–ÖVçEö–BsÓâG–ÖVçD–EÒ“²ö6ö×ç•öæ÷F–g•÷W6W"‚G&WÂ}›í‹ŠýŠ}ŠíŠ¢Šý‹Ší˜Š}‹=Š¢Š­Š=¸Í¸ÍŠò‹MŠòrÂ}ªŠò‹˜}ªý¸Í‹¸Ã¢râG&W²wG&6¶–æuö6öFRuÒâp­Šý‹Ší˜Š}‹=Š¢Š‹Š}¸ÂŠ‹‹‹=¸Â‹M‹ªŠ¢Š}‹‹=Š}˜B‹MŠòâr“°¢&WGW&â²vö²sÓçG'VRÂw–ÖVçE÷7FGW2sÓâw–BrÂw&WVW7E÷7FGW2sÓâwVæF–æu÷&Wf–WruÓ°¢Ð¢G&V6öã×G&–Ò‚‡7G&–ær’‚F%²w&V6öâuÓóòrr’“²–b‚G&V6öãÓÓÒrr’‡GG£¦W'&÷"‚}‹˜MŠ¢‹Šò›í‹ŠýŠ}ŠíŠ¢‹Šr˜Š}‹Šòª˜m¸ÍŠòrÃC#"“°¢F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7E÷–ÖVçG24UB7FGW3Òw&V¦V7FVBrÇfW&–f–VEö'“ÓòÇfW&–f–VEöCÔäõr‚’Ç&V¦V7F–öå÷&V6öãÓòÇ&Wf–Wuöæ÷FSÓòt„U$R–CÓò"Å²GU²v–BuÒÂG&V6öâÇG&–Ò‚‡7G&–ær’‚F%²væ÷FRuÓóòrr’“ó¦çVÆÂÂG–ÖVçD–EÒ“²F#£¦W†V2‚%UDDR6ö×ç•ö6&E÷–ÖVçG24UB7FGW3Òw&V¦V7FVBrÇ&Wf–WvVEö'“ÓòÇ&Wf–WvVEöCÔäõr‚’Ç&V¦V7E÷&V6öãÓòÆ÷W&F÷%öæ÷FSÓòt„U$R–ÖVçEö–CÓò"Å²GU²v–BuÒÂG&V6öâÇG&–Ò‚‡7G&–ær’‚F%²væ÷FRuÓóòrr’“ó¦çVÆÂÂG–ÖVçD–EÒ“²F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7G24UB–ÖVçE÷7FGW3Òw&V¦V7FVBrÇ7FGW3Òw–ÖVçE÷VæF–ærrt„U$R–CÓò"Å²G&W²v–BuÕÒ“°¢ö6ö×ç•öÆör‚G&W²v–BuÒÂGU²v–BuÒÂv6&E÷–ÖVçE÷&V¦V7FVBrÂG&V6öâÅ²w–ÖVçEö–BsÓâG–ÖVçD–EÒ“²ö6ö×ç•öæ÷F–g•÷W6W"‚G&WÂ}›í‹ŠýŠ}ŠíŠ¢Šý‹Ší˜Š}‹=Š¢‹Šò‹MŠòrÂ}ªŠò‹˜}ªý¸Í‹¸Ã¢râG&W²wG&6¶–æuö6öFRuÒâp­‹˜MŠ£¢râG&V6öâ“°¢&WGW&â²vö²sÓçG'VRÂw–ÖVçE÷7FGW2sÓâw&V¦V7FVBrÂw&WVW7E÷7FGW2sÓâw–ÖVçE÷VæF–æruÓ°§ÒÆfÇ6RÄDÔ”â“°§&÷WFR‚uõ5BrÂrö’öFÖ–âö6ö×ç’×&WVW7G2÷¶–GÒ÷&WVW7BÖ6÷'&V7F–öârÆgVæ7F–öâ‚GÂF"ÂGR—°¢G&WÕö6ö×ç•÷&WVW7Eö÷væVB‚G²v–BuÒÂGRÇG'VR“²Fæ÷FS×G&–Ò‚‡7G&–ær’‚F%²væ÷FRuÓóòrr’“²–b‚Fæ÷FSÓÓÒrr’‡GG£¦W'&÷"‚}Š­˜‹m¸ÍŠÒŠ}‹]˜MŠ}ŠÝŠ}Š¢Š}˜M‹-Š}˜]¸ÂŠ}‹=Š¢rÃC#"“°¢F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7G24UB7FGW3ÒvæVVG5ö6÷'&V7F–öârÇ&Wf–WvVEö'“ÓòÇ&Wf–WvVEöCÔäõr‚’t„U$R–CÓò"Å²GU²v–BuÒÂG&W²v–BuÕÒ“²ö6ö×ç•öÆör‚G&W²v–BuÒÂGU²v–BuÒÂv6÷'&V7F–öå÷&WVW7FVBrÂFæ÷FRÂF%²vFö7VÖVçG2uÓóöçVÆÂ“²ö6ö×ç•öæ÷F–g•÷W6W"‚G&WÂ}Šý‹Ší˜Š}‹=Š¢˜m¸ÍŠ}‹-˜]˜mŠòŠ}‹]˜MŠ}ŠÒ˜]ŠýŠ}‹ª’Š}‹=Š¢rÂ}ªŠò‹˜}ªý¸Í‹¸Ã¢râG&W²wG&6¶–æuö6öFRuÒâp¢râFæ÷FR“²&WGW&â²vö²sÓçG'VRÂw7FGW2sÓâvæVVG5ö6÷'&V7F–öâuÓ°§ÒÆfÇ6RÄDÔ”â“° §&÷WFR‚ttUBrÂrö’öFÖ–âö6ö×ç’×&WVW7B×6WGF–æw2rÆgVæ7F–öâ‚GÂF"ÂGR—²&WGW&â²vö²sÓçG'VRÂw6WGF–æw2sÓåö6ö×ç•÷6WGF–æw5öÆÂ‚’ÂwG—W2sÓäF#£¦ÆÂ‚%4TÄT5B¢e$ôÒ6ö×ç•÷&WVW7E÷G—W2õ$DU"%’–B"•Ó²ÒÆfÇ6RÄDÔ”â“°§&÷WFR‚uõ5BrÂrö’öFÖ–âö6ö×ç’×&WVW7B×6WGF–æw2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢G6WGF–æw3ÒF%²w6WGF–æw2uÓóõµÓ²–b†'&•ö¶W•öW†—7G2‚v&ÆU÷&÷f–FW%÷Fö¶VârÂG6WGF–æw2’—²G6WGF–æw5²v&ÆU÷&÷f–FW%ö–çfÆ–BuÓÖfÇ6S²Ò–b‚—5ö'&’‚G6WGF–æw2’’‡GG£¦W'&÷"‚}Š­˜m‹¸Í˜]Š}Š¢˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÃC#"“²f÷&V6‚‚G6WGF–æw22F³ÓâGb—²–b‚&VuöÖF6‚‚rõå¶×£Ó•õ×³"Ã#ÒBö’rÂ‡7G&–ær’F²’’6öçF–çVS²F#£¦W†V2‚$”å4U%B”åDò6ö×ç•÷&WVW7E÷6WGF–æw2‡6WGF–æuö¶W’Ç6WGF–æu÷fÇVRÇWFFVEö'’’dÅTU2ƒòÃòÃò’ôâEUÄ”4DR´U’UDDR6WGF–æu÷fÇVSÕdÅTU2‡6WGF–æu÷fÇVR’ÇWFFVEö'“ÕdÅTU2‡WFFVEö'’’"Å²F²Æ§6öåöVæ6öFR‚GbÄ¥4ôåõTäU44TEõTä”4ôDR’ÂGU²v–BuÕÒ“²Ð¢f÷&V6‚‚‚F%²wG—W2uÓóõµÒ’2GB—²–b†V×G’‚GE²v–BuÒ’’6öçF–çVS²F#£¦W†V2‚%UDDR6ö×ç•÷&WVW7E÷G—W24UBF—FÆSÓòÇ&–6SÓòÆVæ&ÆVCÓòÆFVFÆ–æUöF—3ÓòÆFW67&—F–öãÓòt„U$R–CÓò"Å·G&–Ò‚‡7G&–ær’GE²wF—FÆRuÒ’ÆÖ‚ƒÂ†–çB’GE²w&–6RuÒ’ÆV×G’‚GE²vVæ&ÆVBuÒ“ó£ÆÖ‚ƒÂ†–çB’GE²vFVFÆ–æUöF—2uÒ’ÂGE²vFW67&—F–öâuÓóöçVÆÂÂ†–çB’GE²v–BuÕÒ“²Ð¢&WGW&â²vö²sÓçG'VUÓ°§ÒÆfÇ6RÄDÔ”â“° ¢ò¢ÓÓÓÓÒcƒ"ò†6RC¢Öö&–ÆRFWf–6R†VÇF‚Ööæ—F÷"ÓÓÓÓÒ¢ð¦gVæ7F–öâ÷cƒ%ö†VÇF…÷F&ÆW2‚—°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2Öö&–ÆUöFWf–6Uö†VÇF‚€¢–B$”t”åBUDõô”ä5$TÔTåB$”Ô%’´U’À¢W6W%ö–B$”t”åBäõBåTÄÂÀ¢FWf–6Uö¶W’d$4„"ƒ“’äõBåTÄÂÀ¢÷fW'6–öâd$4„"ƒC’åTÄÂÀ¢'V–ÆE÷fW'6–öâd$4„"ƒC’åTÄÂÀ¢æG&ö–E÷6F²”åBåTÄÂÀ¢ÖçVf7GW&W"d$4„"ƒ’åTÄÂÀ¢ÖöFVÅöæÖRd$4„"ƒS’åTÄÂÀ¢FWf–6UöæÖRd$4„"ƒS’åTÄÂÀ¢÷7FFRd$4„"ƒ3’åTÄÂÀ¢&V6öâd$4„"ƒC’åTÄÂÀ¢&GFW'•öÆWfVÂ4ÔÄÄ”åBåTÄÂÀ¢&GFW'•÷7FFR4ÔÄÄ”åBåTÄÂÀ¢Æ÷u÷÷vW%öÖöFRD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢æWGv÷&µö6öææV7FVBD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢–çFW&æWE÷&V6†&ÆRD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢æWGv÷&µ÷G—Rd$4„"ƒC’åTÄÂÀ¢Æö6Åö—d$4„"ƒcB’åTÄÂÀ¢F÷FÅöÖVÖ÷'•ö'—FW2$”t”åBåTÄÂÀ¢g&VUöF—6µö'—FW2$”t”åBåTÄÂÀ¢F÷FÅöF—6µö'—FW2$”t”åBåTÄÂÀ¢•öö²D”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢•öÆFVæ7•ö×2”åBåTÄÂÀ¢•÷7FGW2”åBåTÄÂÀ¢Ööæ—F÷%÷WF–ÖU÷6V6öæG2”åBåTÄÂÀ¢6GW&VEöBDDUD”ÔRäõBåTÄÂÀ¢&V6V—fVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÀ¢&u÷–ÆöB¥4ôâåTÄÂÀ¢Tä•TR´U’WöÖF…÷W6W%öFWf–6U÷F–ÖR‡W6W%ö–BÆFWf–6Uö¶W’Æ6GW&VEöB’À¢”äDU‚–G…öÖF…÷W6W%÷F–ÖR‡W6W%ö–BÆ6GW&VEöB’À¢”äDU‚–G…öÖF…ö†VÇF‚†•öö²ÆæWGv÷&µö6öææV7FVBÆ6GW&VEöB’À¢”äDU‚–G…öÖF…÷fW'6–öâ†÷fW'6–öâÆæG&ö–E÷6F²Æ6GW&VEöB¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2Öö&–ÆUöFWf–6Uö†VÇF…öÆFW7B€¢W6W%ö–B$”t”åBäõBåTÄÂÀ¢FWf–6Uö¶W’d$4„"ƒ“’äõBåTÄÂÀ¢†VÇF…ö–B$”t”åBåTÄÂÀ¢÷fW'6–öâd$4„"ƒC’åTÄÂÀ¢æG&ö–E÷6F²”åBåTÄÂÀ¢ÖçVf7GW&W"d$4„"ƒ’åTÄÂÀ¢ÖöFVÅöæÖRd$4„"ƒS’åTÄÂÀ¢&GFW'•öÆWfVÂ4ÔÄÄ”åBåTÄÂÀ¢g&VUöF—6µö'—FW2$”t”åBåTÄÂÀ¢•öö²D”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢•öÆFVæ7•ö×2”åBåTÄÂÀ¢æWGv÷&µö6öææV7FVBD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢–çFW&æWE÷&V6†&ÆRD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢÷7FFRd$4„"ƒ3’åTÄÂÀ¢6GW&VEöBDDUD”ÔRäõBåTÄÂÀ¢WFFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕôâUDDR5U%$TåEõD”ÔU5DÕÀ¢$”Ô%’´U’‡W6W%ö–BÆFWf–6Uö¶W’’À¢”äDU‚–G…öÖF†Å÷F–ÖR†6GW&VEöB’À¢”äDU‚–G…öÖF†ÅöÆW'B†•öö²ÆæWGv÷&µö6öææV7FVBÆ&GFW'•öÆWfVÂÆ6GW&VEöB¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“°§Ð §&÷WFR‚uõ5BrÂrö’ö7F—f—G’öFWf–6RÖ†VÇF‚rÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷cƒ%ö†VÇF…÷F&ÆW2‚“°¢F6GW&VBÒV×G’‚F%²v6GW&VEöBuÒ’bb7G'F÷F–ÖR‚F%²v6GW&VEöBuÒ’òFFR‚u’ÖÒÖBƒ¦“§2rÇ7G'F÷F–ÖR‚F%²v6GW&VEöBuÒ’’¢FFR‚u’ÖÒÖBƒ¦“§2r“°¢FFWf–6T¶W’ÒG&–Ò‚‡7G&–ær’‚GU²vFWf–6Uö–BuÒóòF%²vFWf–6Uö–BuÒóòrr’“°¢–b‚FFWf–6T¶W“ÓÓÒrr’FFWf–6T¶W’Ò6†‚‚F%²vÖçVf7GW&W"uÓóòrr’âwÂrâ‚F%²vÖöFVÅöæÖRuÓóòrr’âwÂrâ‚F%²vFWf–6UöæÖRuÓóòrr’“°¢GfÇ2Ò°¢†–çB’GU²v–BuÒÂ7V'7G"‚FFWf–6T¶W’ÃÃ“’Â7V'7G"‚‡7G&–ær’‚F%²v÷fW'6–öâuÓóòrr’ÃÃC“ó¦çVÆÂÂ7V'7G"‚‡7G&–ær’‚F%²v'V–ÆE÷fW'6–öâuÓóòrr’ÃÃC“ó¦çVÆÂÀ¢—76WB‚F%²væG&ö–E÷6F²uÒ“ò†–çB’F%²væG&ö–E÷6F²uÓ¦çVÆÂÂ7V'7G"‚‡7G&–ær’‚F%²vÖçVf7GW&W"uÓóòrr’ÃÃ“ó¦çVÆÂÂ7V'7G"‚‡7G&–ær’‚F%²vÖöFVÅöæÖRuÓóòrr’ÃÃS“ó¦çVÆÂÀ¢7V'7G"‚‡7G&–ær’‚F%²vFWf–6UöæÖRuÓóòrr’ÃÃS“ó¦çVÆÂÂ7V'7G"‚‡7G&–ær’‚F%²v÷7FFRuÓóòrr’ÃÃ3“ó¦çVÆÂÂ7V'7G"‚‡7G&–ær’‚F%²w&V6öâuÓóòrr’ÃÃC“ó¦çVÆÂÀ¢—76WB‚F%²v&GFW'•öÆWfVÂuÒ“öÖ‚ƒÆÖ–âƒÂ†–çB’F%²v&GFW'•öÆWfVÂuÒ’“¦çVÆÂÂ—76WB‚F%²v&GFW'•÷7FFRuÒ“ò†–çB’F%²v&GFW'•÷7FFRuÓ¦çVÆÂÂV×G’‚F%²vÆ÷u÷÷vW%öÖöFRuÒ“ó£À¢V×G’‚F%²væWGv÷&µö6öææV7FVBuÒ“ó£ÂV×G’‚F%²v–çFW&æWE÷&V6†&ÆRuÒ“ó£Â7V'7G"‚‡7G&–ær’‚F%²væWGv÷&µ÷G—RuÓóòrr’ÃÃC“ó¦çVÆÂÀ¢7V'7G"‚‡7G&–ær’‚F%²vÆö6Åö—uÓóòrr’ÃÃcB“ó¦çVÆÂÂ—76WB‚F%²wF÷FÅöÖVÖ÷'•ö'—FW2uÒ“ò†–çB’F%²wF÷FÅöÖVÖ÷'•ö'—FW2uÓ¦çVÆÂÀ¢—76WB‚F%²vg&VUöF—6µö'—FW2uÒ“ò†–çB’F%²vg&VUöF—6µö'—FW2uÓ¦çVÆÂÂ—76WB‚F%²wF÷FÅöF—6µö'—FW2uÒ“ò†–çB’F%²wF÷FÅöF—6µö'—FW2uÓ¦çVÆÂÀ¢V×G’‚F%²v•öö²uÒ“ó£Â—76WB‚F%²v•öÆFVæ7•ö×2uÒ“öÖ‚ƒÂ†–çB’F%²v•öÆFVæ7•ö×2uÒ“¦çVÆÂÂ—76WB‚F%²v•÷7FGW2uÒ“ò†–çB’F%²v•÷7FGW2uÓ¦çVÆÂÀ¢—76WB‚F%²vÖöæ—F÷%÷WF–ÖU÷6V6öæG2uÒ“öÖ‚ƒÂ†–çB’F%²vÖöæ—F÷%÷WF–ÖU÷6V6öæG2uÒ“¦çVÆÂÂF6GW&VBÂ§6öåöVæ6öFR‚F"Ä¥4ôåõTäU44TEõTä”4ôDR¢Ó°¢F#£§'Vâ‚$”å4U%B”täõ$R”åDòÖö&–ÆUöFWf–6Uö†VÇF‚‡W6W%ö–BÆFWf–6Uö¶W’Æ÷fW'6–öâÆ'V–ÆE÷fW'6–öâÆæG&ö–E÷6F²ÆÖçVf7GW&W"ÆÖöFVÅöæÖRÆFWf–6UöæÖRÆ÷7FFRÇ&V6öâÆ&GFW'•öÆWfVÂÆ&GFW'•÷7FFRÆÆ÷u÷÷vW%öÖöFRÆæWGv÷&µö6öææV7FVBÆ–çFW&æWE÷&V6†&ÆRÆæWGv÷&µ÷G—RÆÆö6Åö—ÇF÷FÅöÖVÖ÷'•ö'—FW2Æg&VUöF—6µö'—FW2ÇF÷FÅöF—6µö'—FW2Æ•öö²Æ•öÆFVæ7•ö×2Æ•÷7FGW2ÆÖöæ—F÷%÷WF–ÖU÷6V6öæG2Æ6GW&VEöBÇ&u÷–ÆöB’dÅTU2ƒòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃò’"ÂGfÇ2“°¢F†VÇF„–CÒ†–çB’„F#£¦öæR‚%4TÄT5B–Be$ôÒÖö&–ÆUöFWf–6Uö†VÇF‚t„U$RW6W%ö–CÓòäBFWf–6Uö¶W“ÓòäB6GW&VEöCÓòõ$DU"%’–BDU42Ä”Ô•B"Å²†–çB’GU²v–BuÒÇ7V'7G"‚FFWf–6T¶W’ÃÃ“’ÂF6GW&VEÒ•²v–BuÓóó“°¢F#£§'Vâ‚$”å4U%B”åDòÖö&–ÆUöFWf–6Uö†VÇF…öÆFW7B‡W6W%ö–BÆFWf–6Uö¶W’Æ†VÇF…ö–BÆ÷fW'6–öâÆæG&ö–E÷6F²ÆÖçVf7GW&W"ÆÖöFVÅöæÖRÆ&GFW'•öÆWfVÂÆg&VUöF—6µö'—FW2Æ•öö²Æ•öÆFVæ7•ö×2ÆæWGv÷&µö6öææV7FVBÆ–çFW&æWE÷&V6†&ÆRÆ÷7FFRÆ6GW&VEöB¢dÅTU2ƒòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃò’ôâEUÄ”4DR´U’UDDR†VÇF…ö–CÕdÅTU2††VÇF…ö–B’Æ÷fW'6–öãÕdÅTU2†÷fW'6–öâ’ÆæG&ö–E÷6F³ÕdÅTU2†æG&ö–E÷6F²’ÆÖçVf7GW&W#ÕdÅTU2†ÖçVf7GW&W"’ÆÖöFVÅöæÖSÕdÅTU2†ÖöFVÅöæÖR’Æ&GFW'•öÆWfVÃÕdÅTU2†&GFW'•öÆWfVÂ’Æg&VUöF—6µö'—FW3ÕdÅTU2†g&VUöF—6µö'—FW2’Æ•öö³ÕdÅTU2†•öö²’Æ•öÆFVæ7•ö×3ÕdÅTU2†•öÆFVæ7•ö×2’ÆæWGv÷&µö6öææV7FVCÕdÅTU2†æWGv÷&µö6öææV7FVB’Æ–çFW&æWE÷&V6†&ÆSÕdÅTU2†–çFW&æWE÷&V6†&ÆR’Æ÷7FFSÕdÅTU2†÷7FFR’Æ6GW&VEöCÕdÅTU2†6GW&VEöB’"À¢²†–çB’GU²v–BuÒÇ7V'7G"‚FFWf–6T¶W’ÃÃ“’ÂF†VÇF„–BÇ7V'7G"‚‡7G&–ær’‚F%²v÷fW'6–öâuÓóòrr’ÃÃC“ó¦çVÆÂÆ—76WB‚F%²væG&ö–E÷6F²uÒ“ò†–çB’F%²væG&ö–E÷6F²uÓ¦çVÆÂÇ7V'7G"‚‡7G&–ær’‚F%²vÖçVf7GW&W"uÓóòrr’ÃÃ“ó¦çVÆÂÇ7V'7G"‚‡7G&–ær’‚F%²vÖöFVÅöæÖRuÓóòrr’ÃÃS“ó¦çVÆÂÆ—76WB‚F%²v&GFW'•öÆWfVÂuÒ“ò†–çB’F%²v&GFW'•öÆWfVÂuÓ¦çVÆÂÆ—76WB‚F%²vg&VUöF—6µö'—FW2uÒ“ò†–çB’F%²vg&VUöF—6µö'—FW2uÓ¦çVÆÂÂV×G’‚F%²v•öö²uÒ“ó£Æ—76WB‚F%²v•öÆFVæ7•ö×2uÒ“ò†–çB’F%²v•öÆFVæ7•ö×2uÓ¦çVÆÂÂV×G’‚F%²væWGv÷&µö6öææV7FVBuÒ“ó£ÂV×G’‚F%²v–çFW&æWE÷&V6†&ÆRuÒ“ó£Ç7V'7G"‚‡7G&–ær’‚F%²v÷7FFRuÓóòrr’ÃÃ3“ó¦çVÆÂÂF6GW&VEÒ“°¢&WGW&â²vö²sÓçG'VRÂv†VÇF…ö–BsÓâF†VÇF„–BÂw&V6V—fVEöBsÓæFFR‚v2r•Ó°§Ò“° §&÷WFR‚ttUBrÂrö’öFÖ–âöFWf–6RÖ†VÇF‚rÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷cƒ%ö†VÇF…÷F&ÆW2‚“°¢G×G&–Ò‚‡7G&–ær’‚EôtUE²wuÓóòrr’“²Gv†W&SÒsÓs²F&w3ÕµÓ°¢–b‚GÓÒrr—²Gv†W&RãÒ"äB„4ôä4B‡W2æf—'7EöæÖRÂrrÇW2æÆ7EöæÖR’Ä”´Ròõ"ÂæÖöFVÅöæÖRÄ”´Ròõ"Âæ÷fW'6–öâÄ”´Ròõ"ÂæFWf–6Uö¶W’Ä”´Rò’#²GƒÒrRrâGârRs²F&w3Õ²G‚ÂG‚ÂG‚ÂG…Ó²Ð¢F—FV×3ÔF#£¦ÆÂ‚%4TÄT5BÂâ¢Ä4ôä4B‡W2æf—'7EöæÖRÂrrÇW2æÆ7EöæÖR’W6W%öæÖRÇ"çF—FÆR&öÆU÷F—FÆRÀ¢D”ÔU5DÕD”db„Ô”åUDRÆÂæ6GW&VEöBÄäõr‚’’7FÆUöÖ–çWFW2À¢44Rt„TâD”ÔU5DÕD”db„Ô”åUDRÆÂæ6GW&VEöBÄäõr‚’“ã#D„Tâw7FÆRrt„TâÂæ•öö³Óõ"ÂææWGv÷&µö6öææV7FVCÓD„TâvW'&÷"rt„TâÂæ&GFW'•öÆWfVÂ•2äõBåTÄÂäBÂæ&GFW'•öÆWfVÃÃRD„Tâwv&æ–ærrt„TâÂæg&VUöF—6µö'—FW2•2äõBåTÄÂäBÂæg&VUöF—6µö'—FW3ÃS3cƒs“"D„Tâwv&æ–ærrt„TâÂæ•öÆFVæ7•ö×3ãSD„Tâwv&æ–ærrTÅ4Rvö²rTäB†VÇF…÷7FGW0¢e$ôÒÖö&–ÆUöFWf–6Uö†VÇF…öÆFW7BÂ¤ô”âW6W'2W2ôâW2æ–CÖÂçW6W%ö–BÄTeB¤ô”â&öÆW2"ôâ"æ–C×W2ç&öÆUö–Bt„U$RGv†W&Rõ$DU"%’Âæ6GW&VEöBDU42Ä”Ô•BS"ÂF&w2“°¢G7FG3ÔF#£¦öæR‚%4TÄT5B4õTåB‚¢’F÷FÅöFWf–6W2Å5TÒ†6GW&VEöCÄDDUõ5T"„äõr‚’Ä”åDU%dÂ#Ô”åUDR’’7FÆUöFWf–6W2Å5TÒ†•öö³Ó’•öf–ÆVBÅ5TÒ†æWGv÷&µö6öææV7FVCÓ’öffÆ–æUöFWf–6W2Å5TÒ†&GFW'•öÆWfVÃÃR’Æ÷uö&GFW'’Å5TÒ†g&VUöF—6µö'—FW3ÃS3cƒs“"’Æ÷u÷7F÷&vRÅ$õTäB„dr†•öÆFVæ7•ö×2’’fuöÆFVæ7•ö×2e$ôÒÖö&–ÆUöFWf–6Uö†VÇF…öÆFW7B"“°¢&WGW&â²v—FV×2sÓâF—FV×2Âw7FG2sÓâG7FG3ó¥µÒÂw6—FU÷fW'6–öâsÓå4•DUõdU%4”ôâÂv÷fW'6–öâsÓäõdU%4”ôåÓ°§ÒÆfÇ6RÄDÔ”â“° §&÷WFR‚ttUBrÂrö’öFÖ–âöFWf–6RÖ†VÇF‚÷·W6W%ö–GÒö†—7F÷'’rÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷cƒ%ö†VÇF…÷F&ÆW2‚“°¢&WGW&â²v—FV×2sÓäF#£¦ÆÂ‚%4TÄT5B¢e$ôÒÖö&–ÆUöFWf–6Uö†VÇF‚t„U$RW6W%ö–CÓòõ$DU"%’6GW&VEöBDU42Ä”Ô•B#"Å²†–çB’G²wW6W%ö–BuÕÒ•Ó°§ÒÆfÇ6RÄDÔ”â“°  ¢ò¢ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒcƒ3¢Š‹˜mŠ}˜]˜rŠŠ}‹-Šý¸ÍŠò˜‚›í˜‹M‹BŠí‹}˜‹rÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒ¢ð¦gVæ7F–öâ÷cƒ5÷f—6—E÷F&ÆW2‚—°¢7FF–2FFöæSÖfÇ6S²–b‚FFöæR’&WGW&ã²FFöæS×G'VS°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2–ç7V7F÷%öÖöFW2€¢W6W%ö–B$”t”åB$”Ô%’´U’À¢ÖöFRd$4„"ƒ3’äõBåTÄÂDTdTÅBvWFòrÀ¢—5ö7F—fRD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢WFFVEö'’$”t”åBåTÄÂÀ¢WFFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕôâUDDR5U%$TåEõD”ÔU5DÕÀ¢”äDU‚–G…ö–ç7V7F÷%öÖöFR†ÖöFR¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2Æ–æU÷f—6—E÷&W÷'G2€¢–B$”t”åBUDõô”ä5$TÔTåB$”Ô%’´U’À¢W6W%ö–B$”t”åBäõBåTÄÂÀ¢Æ–æUö–B$”t”åBäõBåTÄÂÀ¢f—6—E÷G—Rd$4„"ƒ3’äõBåTÄÂDTdTÅBvf–VÆBrÀ¢7F'FVEöBDDUD”ÔRäõBåTÄÂÀ¢f–æ—6†VEöBDDUD”ÔRåTÄÂÀ¢ÆBDõT$ÄRäõBåTÄÂÀ¢ÆærDõT$ÄRäõBåTÄÂÀ¢FV6Æ&VE÷&W6VçEö6÷VçB”åBåTÄÂÀ¢7GVÅ÷&W6VçEö6÷VçB”åBåTÄÂÀ¢F÷FÅöÆ–æU÷fV†–6ÆW2”åBåTÄÂÀ¢W‡—&VE÷&W6VçEö6÷VçB”åBåTÄÂÀ¢&W6VçEöæ÷F–6Uö6÷VçB”åBåTÄÂÀ¢7WW'f—6÷%÷W6W%ö–B$”t”åBåTÄÂÀ¢7WW'f—6÷%÷66÷&RDT4”ÔÂƒbÃ"’åTÄÂÀ¢7WW'f—6÷%öæ÷FRDU…BåTÄÂÀ¢&W÷'E÷FW‡BDU…BåTÄÂÀ¢†÷Fõ÷F‚d$4„"ƒS’äõBåTÄÂÀ¢7FGW2d$4„"ƒ#’äõBåTÄÂDTdTÅBw7V&Ö—GFVBrÀ¢7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÀ¢”äDU‚–G…öÇg%÷W6W%öFFR‡W6W%ö–BÇ7F'FVEöB’À¢”äDU‚–G…öÇg%öÆ–æUöFFR†Æ–æUö–BÇ7F'FVEöB’À¢”äDU‚–G…öÇg%÷G—UöFFR‡f—6—E÷G—RÇ7F'FVEöB¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E27V&÷&F–æFUöF–Ç•÷&Wf–Ww2€¢–B$”t”åBUDõô”ä5$TÔTåB$”Ô%’´U’À¢&Wf–WvW%ö–B$”t”åBäõBåTÄÂÀ¢7V&¦V7E÷W6W%ö–B$”t”åBäõBåTÄÂÀ¢&Wf–WuöFFRDDRäõBåTÄÂÀ¢Æ–æUö–B$”t”åBåTÄÂÀ¢GFVæFæ6U÷66÷&RDT4”ÔÂƒbÃ"’äõBåTÄÂDTdTÅBÀ¢6†V6¶Æ—7E÷66÷&RDT4”ÔÂƒbÃ"’äõBåTÄÂDTdTÅBÀ¢æ÷F–6U÷66÷&RDT4”ÔÂƒbÃ"’äõBåTÄÂDTdTÅBÀ¢6÷fW&vU÷66÷&RDT4”ÔÂƒbÃ"’äõBåTÄÂDTdTÅBÀ¢VÆ—G•÷66÷&RDT4”ÔÂƒbÃ"’äõBåTÄÂDTdTÅBÀ¢F÷FÅ÷66÷&RDT4”ÔÂƒrÃ"’äõBåTÄÂDTdTÅBÀ¢æ÷FRDU…BåTÄÂÀ¢7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÀ¢WFFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕôâUDDR5U%$TåEõD”ÔU5DÕÀ¢Tä•TR´U’WöF–Ç•÷&Wf–Wr‡&Wf–WvW%ö–BÇ7V&¦V7E÷W6W%ö–BÇ&Wf–WuöFFRÆÆ–æUö–B’À¢”äDU‚–G…÷6G%÷7V&¦V7EöFFR‡7V&¦V7E÷W6W%ö–BÇ&Wf–WuöFFR¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“°§Ð¦gVæ7F–öâ÷cƒ5÷&öÆUöÖöFR‚GW6W$–B—°¢÷cƒ5÷f—6—E÷F&ÆW2‚“°¢GSÔF#£¦öæR‚%4TÄT5B"çF—FÆR&öÆU÷F—FÆRe$ôÒW6W'2RÄTeB¤ô”â&öÆW2"ôâ"æ–C×Rç&öÆUö–Bt„U$RRæ–CÓò"Å²†–çB’GW6W$–EÒ“°¢G&öÆS×G&–Ò‚‡7G&–ær’‚GU²w&öÆU÷F—FÆRuÓóòrr’“°¢G&öÆTæ÷&ÓÖÖ%÷7G'FöÆ÷vW"‡7G%÷&WÆ6R…²}˜¢rÂ}˜2uÒÅ²}¸ÂrÂ}ª’uÒÂG&öÆR’ÂuUDbÓ‚r“°¢FÖçVÃÔF#£¦öæR‚%4TÄT5BÖöFRe$ôÒ–ç7V7F÷%öÖöFW2t„U$RW6W%ö–CÓòäB—5ö7F—fSÓ"Å²†–çB’GW6W$–EÒ“°¢–b‚FÖçVÂbbFÖçVÅ²vÖöFRuÒÓÒvWFòr’&WGW&âFÖçVÅ²vÖöFRuÓ°¢FãÒ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒW6W%öÆ–æW2t„U$RW6W%ö–CÓò"Å²†–çB’GW6W$–EÒ•²vâuÓóó“° ¢òò˜m˜-‹N(Í˜}Š}¸ÂŠ}‹‹MŠòŠŠ}¸ÍŠò›í¸Í‹BŠ}‹"*½ŠŠ}‹-‹‹<+²Š‹‹‹=¸Â‹M˜˜mŠý‰²¨m˜˜b*½‹=‹ŠŠ}‹-‹‹<+²‹MŠ}˜]˜B˜Š}©˜}™B*½ŠŠ}‹-‹‹<+²Š}‹=Š¢à¢–b†Ö%÷7G'÷2‚G&öÆTæ÷&ÒÂ}‹=‹ŠŠ}‹-‹‹2r’ÓÖfÇ6RÇÂÖ%÷7G'÷2‚G&öÆTæ÷&ÒÂ}ŠŠ}‹-‹‹2Š}‹‹MŠòr’ÓÖfÇ6RÇÂÖ%÷7G'÷2‚G&öÆTæ÷&ÒÂ}‹Šm¸Í‹2Š}ŠýŠ}‹˜rŠŠ}‹-‹‹=¸Âr’ÓÖfÇ6RÇÂÖ%÷7G'÷2‚G&öÆTæ÷&ÒÂv6†–Vb–ç7V7F÷"r’ÓÖfÇ6R’&WGW&âv6†–Veö–ç7V7F÷"s°¢–b†Ö%÷7G'÷2‚G&öÆTæ÷&ÒÂ}ªý‹MŠ¢˜]˜Š­˜‹¸Âr’ÓÖfÇ6RÇÂÖ%÷7G'÷2‚G&öÆTæ÷&ÒÂvÖ÷F÷"G&öÂr’ÓÖfÇ6R’&WGW&âvÖ÷F÷%÷G&öÂs°¢–b†Ö%÷7G'÷2‚G&öÆTæ÷&ÒÂ}ªý‹MŠ¢Ší˜Šý‹˜¸Í¸Âr’ÓÖfÇ6RÇÂÖ%÷7G'÷2‚G&öÆTæ÷&ÒÂ}ŠŠ}‹-‹‹2ªý‹MŠ¢r’ÓÖfÇ6RÇÂÖ%÷7G'÷2‚G&öÆTæ÷&ÒÂwfV†–6ÆRG&öÂr’ÓÖfÇ6R’&WGW&âwfV†–6ÆU÷G&öÂs°¢–b†Ö%÷7G'÷2‚G&öÆTæ÷&ÒÂ}ŠŠ}‹-‹‹2˜]˜-¸Í˜Rr’ÓÖfÇ6RÇÂÖ%÷7G'÷2‚G&öÆTæ÷&ÒÂw&W6–FVçB–ç7V7F÷"r’ÓÖfÇ6R’&WGW&âw&W6–FVçEö–ç7V7F÷"s°¢–b†Ö%÷7G'÷2‚G&öÆTæ÷&ÒÂ}˜mŠ}‹‹Ší‹rr’ÓÖfÇ6RÇÂÖ%÷7G'÷2‚G&öÆTæ÷&ÒÂ}‹Šm¸Í‹2Ší‹rr’ÓÖfÇ6RÇÂG&öÆTæ÷&ÓÓÓÒ}˜mŠ}‹‹rÇÂÖ%÷7G'÷2‚G&öÆTæ÷&ÒÂvÆ–æR7WW'f—6÷"r’ÓÖfÇ6R’&WGW&âvÆ–æU÷7WW'f—6÷"s°¢–b†Ö%÷7G'÷2‚G&öÆTæ÷&ÒÂ}˜m¸Í‹˜¸ÂŠ}ŠýŠ}‹¸Âr’ÓÖfÇ6RÇÂÖ%÷7G'÷2‚G&öÆTæ÷&ÒÂ}ªŠ}‹‹M˜mŠ}‹2Š}ŠýŠ}‹¸Âr’ÓÖfÇ6RÇÂÖ%÷7G'÷2‚G&öÆTæ÷&ÒÂvFÖ–æ—7G&F—fRr’ÓÖfÇ6R’&WGW&âvFÖ–æ—7G&F—fU÷f—6—Bs°¢–b†Ö%÷7G'÷2‚G&öÆTæ÷&ÒÂ}ŠŠ}‹-‹‹2r’ÓÖfÇ6RÇÂÖ%÷7G'÷2‚G&öÆTæ÷&ÒÂv–ç7V7F÷"r’ÓÖfÇ6R’&WGW&âFãÃÓòw&W6–FVçEö–ç7V7F÷"s¢wfV†–6ÆU÷G&öÂs°¢&WGW&âv÷F†W"s°§Ð¦gVæ7F–öâ÷cƒ5öÆ–æU÷6æ6†÷B‚FÆ–æT–B—°¢FÆ–æT–CÒ†–çB’FÆ–æT–C°¢GF÷FÃÒ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒfV†–6ÆW2t„U$RÆ–æUö–CÓò"Å²FÆ–æT–EÒ•²vâuÓóó“°¢G&W6VçCÒ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB„D•5D”ä5BæG&—fW%ö–B’âe$ôÒGFVæFæ6W2t„U$RæÆ–æUö–CÓòäBDDR†æ7&VFVEöB“Ô5U$DDR‚’"Å²FÆ–æT–EÒ•²vâuÓóó“°¢FFV6Æ&VCÒG&W6VçC°¢FW‡—&VCÒ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB„D•5D”ä5BæG&—fW%ö–B’âe$ôÒGFVæFæ6W2¤ô”âG&—fW'2BôâBæ–CÖæG&—fW%ö–BÄTeB¤ô”âfV†–6ÆUöG&—fW'2fBôâfBæG&—fW%ö–CÖBæ–BÄTeB¤ô”âfV†–6ÆW2bôâbæ–C×fBçfV†–6ÆUö–Bt„U$RæÆ–æUö–CÓòäBDDR†æ7&VFVEöB“Ô5U$DDR‚’äB„4ôÄU44R†BçF†•öÆ–5÷7FGW2Ârr’Ä”´Rr]˜]˜m˜-‹bRrõ"4ôÄU44R†Bæ÷öÆ–5÷7FGW2Ârr’Ä”´Rr]˜]˜m˜-‹bRrõ"4ôÄU44R‡bçFV6…ö–ç7V7F–öåöW‡—&RÂrr“ÃârräBbçFV6…ö–ç7V7F–öåöW‡—&RÂDDUôdõ$ÔB„5U$DDR‚’ÂrU’òVÒòVBr’õ"4ôÄU44R‡bæ–ç7W&æ6UöW‡—&RÂrr“ÃârräBbæ–ç7W&æ6UöW‡—&RÂDDUôdõ$ÔB„5U$DDR‚’ÂrU’òVÒòVBr’’"Å²FÆ–æT–EÒ•²vâuÓóó“°¢Fæ÷F–6T6÷VçCÒ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒæ÷F–6W2â¤ô”âGFVæFæ6W2ôâæG&—fW%ö–CÖâæG&—fW%ö–Bt„U$RæÆ–æUö–CÓòäBDDR†æ7&VFVEöB“Ô5U$DDR‚’äBâæ7&VFVEöCãÔDDUõ5T"„äõr‚’Ä”åDU%dÂ3D’’"Å²FÆ–æT–EÒ•²vâuÓóó“°¢FÆ–æSÔF#£¦öæR‚%4TÄT5B–BÆ6öFRÆ÷&–v–âÆFW7F–æF–öâe$ôÒÆ–æW6t„U$R–CÓò"Å²FÆ–æT–EÒ“°¢G7WW'f—6÷'3ÔF#£¦ÆÂ‚%4TÄT5BRæ–BÅE$”Ò„4ôä4B„4ôÄU44R‡Ræf—'7EöæÖRÂrr’ÂrrÄ4ôÄU44R‡RæÆ7EöæÖRÂrr’’’æÖRÇ"çF—FÆR&öÆU÷F—FÆRe$ôÒW6W%öÆ–æW2VÂ¤ô”âW6W'2RôâRæ–C×VÂçW6W%ö–BÄTeB¤ô”â&öÆW2"ôâ"æ–C×Rç&öÆUö–Bt„U$RVÂæÆ–æUö–CÓòäB‡"çF—FÆRÄ”´Rr]˜mŠ}‹‹Ší‹rRrõ""çF—FÆRÄ”´Rr]ŠŠ}‹-‹‹2˜]˜-¸Í˜RRr’"Å²FÆ–æT–EÒ“°¢GFöF“ÔF#£¦öæR‚%4TÄT5B4õTåB„D•5D”ä5BæG&—fW%ö–B’GFVæFæ6Uö6÷VçBe$ôÒGFVæFæ6W2t„U$RæÆ–æUö–CÓòäBDDR†æ7&VFVEöB“Ô5U$DDR‚’"Å²FÆ–æT–EÒ“°¢&WGW&â²vÆ–æRsÓâFÆ–æRÂwF÷FÅöÆ–æU÷fV†–6ÆW2sÓâGF÷FÂÂv7W'&VçE÷&W6VçEö6÷VçBsÓâG&W6VçBÂvFV6Æ&VE÷&W6VçEö6÷VçBsÓâFFV6Æ&VBÂvW‡—&VE÷&W6VçEö6÷VçBsÓâFW‡—&VBÂw&W6VçEöæ÷F–6Uö6÷VçBsÓâFæ÷F–6T6÷VçBÂwFöF•öGFVæFæ6Uö6÷VçBsÓâ†–çB’‚GFöF•²vGFVæFæ6Uö6÷VçBuÓóó’Âw7WW'f—6÷'2sÓâG7WW'f—6÷'5Ó°§Ð¦gVæ7F–öâ÷c“öÆ–æU÷6æ6†÷B‚FÆ–æT–BÂGW6W$–CÖçVÆÂ—°¢FÆ–æT–CÒ†–çB’FÆ–æT–C°¢FÆ–æSÔF#£¦öæR‚%4TÄT5B–BÆ6öFRÆ÷&–v–âÆFW7F–æF–öâe$ôÒÆ–æW6t„U$R–CÓò"Å²FÆ–æT–EÒ“°¢GF÷FÃÒ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒfV†–6ÆW2t„U$RÆ–æUö–CÓò"Å²FÆ–æT–EÒ•²vâuÓóó“°¢G&W6VçCÒ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB„D•5D”ä5BG&—fW%ö–B’âe$ôÒGFVæFæ6W2t„U$RÆ–æUö–CÓòäBDDR†7&VFVEöB“Ô5U$DDR‚’"Å²FÆ–æT–EÒ•²vâuÓóó“°¢F6†V6¶VCÒ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB„D•5D”ä5B4ôÄU44R†72çfV†–6ÆUö–BÆ72æG&—fW%ö–B’’âe$ôÒ6†V6¶Æ—7E÷7V&Ö—76–öç272ÄTeB¤ô”âfV†–6ÆW2bôâbæ–CÖ72çfV†–6ÆUö–@¢t„U$RDDR†72æ7&VFVEöB“Ô5U$DDR‚’äB‡bæÆ–æUö–CÓòõ"U„•5E2…4TÄT5Be$ôÒGFVæFæ6W2t„U$RæG&—fW%ö–CÖ72æG&—fW%ö–BäBæÆ–æUö–CÓòäBDDR†æ7&VFVEöB“Ô5U$DDR‚’’’"Å²FÆ–æT–BÂFÆ–æT–EÒ•²vâuÓóó“°¢Fæ÷F–6W3Ò†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒæ÷F–6W2çBt„U$RDDR†çBæ7&VFVEöB“Ô5U$DDR‚’äBU„•5E2…4TÄT5Be$ôÒGFVæFæ6W2t„U$RæG&—fW%ö–CÖçBæG&—fW%ö–BäBæÆ–æUö–CÓòäBDDR†æ7&VFVEöB“Ô5U$DDR‚’’"Å²FÆ–æT–EÒ•²vâuÓóó“°¢FW‡—&VCÒ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB„D•5D”ä5BæG&—fW%ö–B’âe$ôÒGFVæFæ6W2¤ô”âG&—fW'2BôâBæ–CÖæG&—fW%ö–BÄTeB¤ô”âfV†–6ÆUöG&—fW'2fBôâfBæG&—fW%ö–CÖBæ–BÄTeB¤ô”âfV†–6ÆW2bôâbæ–C×fBçfV†–6ÆUö–@¢t„U$RæÆ–æUö–CÓòäBDDR†æ7&VFVEöB“Ô5U$DDR‚’äB„4ôÄU44R†BçF†•öÆ–5÷7FGW2Ârr’Ä”´Rr]˜]˜m˜-‹bRrõ"4ôÄU44R†Bæ÷öÆ–5÷7FGW2Ârr’Ä”´Rr]˜]˜m˜-‹bRrõ"„4ôÄU44R‡bçFV6…ö–ç7V7F–öåöW‡—&RÂrr“ÃârräBbçFV6…ö–ç7V7F–öåöW‡—&SÄDDUôdõ$ÔB„5U$DDR‚’ÂrU’òVÒòVBr’’õ"„4ôÄU44R‡bæ–ç7W&æ6UöW‡—&RÂrr“ÃârräBbæ–ç7W&æ6UöW‡—&SÄDDUôdõ$ÔB„5U$DDR‚’ÂrU’òVÒòVBr’’’"Å²FÆ–æT–EÒ•²vâuÓóó“°¢FFV'CÒ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB„D•5D”ä5BæG&—fW%ö–B’âe$ôÒGFVæFæ6W2¤ô”âG&—fW'2BôâBæ–CÖæG&—fW%ö–Bt„U$RæÆ–æUö–CÓòäBDDR†æ7&VFVEöB“Ô5U$DDR‚¢äBU„•5E2…4TÄT5Be$ôÒ&–ÆÇ2"t„U$R†"æG&—fW%ö–CÖBæ–Bõ""ææF–öæÅö–CÖBææF–öæÅö–B’äB†"ç7FGW2•2åTÄÂõ""ç7FGW2äõBÄ”´Rr]›í‹ŠýŠ}ŠíŠ¢Rr’’"Å²FÆ–æT–EÒ•²vâuÓóó“°¢Gf—6—CÒGW6W$–CôF#£¦öæR‚%4TÄT5B–BÇ7FGW2ÇfÆ–FFVBÇfÆ–FF–öå÷W&6VçBÇ7F'FVEöBÆf–æ—6†VEöBe$ôÒÖ—76–öå÷f—6—E÷6W76–öç2t„U$RW6W%ö–CÓòäBÆ–æUö–CÓòäBDDR‡7F'FVEöB“Ô5U$DDR‚’õ$DU"%’–BDU42Ä”Ô•B"Å²†–çB’GW6W$–BÂFÆ–æT–EÒ“¦çVÆÃ°¢&WGW&â²vÆ–æRsÓâFÆ–æRÂwF÷FÅ÷fV†–6ÆW2sÓâGF÷FÂÂw&W6VçEö6÷VçBsÓâG&W6VçBÂv6†V6¶VEö6÷VçBsÓâF6†V6¶VBÂvæ÷F–6Uö6÷VçBsÓâFæ÷F–6W2À¢vW‡—&VE÷&W6VçEö6÷VçBsÓâFW‡—&VBÂw7V'67&—F–öåöFV'E÷&W6VçEö6÷VçBsÓâFFV'BÂv6÷fW&vU÷W&6VçBsÓå÷c“÷7B‚F6†V6¶VBÂGF÷FÂ’ÂwFöF•÷f—6—BsÓâGf—6—Có¦çVÆÅÓ°§Ð§&÷WFR‚ttUBrÂrö’ö×’÷f—6—B×&öw&ÒrÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“öÖ—76–öå÷F&ÆW2‚“°¢G&ösÕ÷c“öÖ—76–öå÷&öw&W72‚GR“°¢FÆ–æT–G3Ö'&•öÖ‚v–çGfÂrÂ'&•ö6öÇVÖâ„F#£¦ÆÂ‚%4TÄT5BÆ–æUö–Be$ôÒW6W%öÆ–æW2t„U$RW6W%ö–CÓò"Å²†–çB’GU²v–BuÕÒ’ÂvÆ–æUö–Br’“°¢FÆ–æW3Ö'&•öÖ†gVæ7F–öâ‚FÆ–B’W6R‚GR—²&WGW&â÷c“öÆ–æU÷6æ6†÷B‚FÆ–BÂGU²v–BuÒ“²ÒÂFÆ–æT–G2“°¢&WGW&â²vÖöFRsÓâG&öu²w&öÆUö¶W’uÒÂvFFRsÓæFFR‚u’ÖÒÖBr’Âw7VÖÖ'’sÓâG&öu²w7VÖÖ'’uÒÂwF&vWG2sÓâG&öu²wF&vWG2uÒÂvÆ–æW2sÓâFÆ–æW5Ó°§Ò“°§&÷WFR‚ttUBrÂrö’öÆ–æR×f—6—G2öÆ–æR÷¶Æ–æUö–GÒ÷6æ6†÷BrÆgVæ7F–öâ‚GÂF"ÂGR—°¢F–G3×W6W%öÆ–æUö–G2‚GR“²FÆ–CÒ†–çB’G²vÆ–æUö–BuÓ°¢–b†—5ö'&’‚F–G2’bb–åö'&’‚FÆ–BÆ'&•öÖ‚v–çGfÂrÂF–G2’ÇG'VR’’‡GG£¦W'&÷"‚}Š}¸Í˜bŠí‹rŠý‹˜]ŠÝŠý˜Šý˜rŠý‹=Š­‹‹=¸Â‹M˜]Šr˜m¸Í‹=Š¢rÃC2“°¢&WGW&â÷cƒ5öÆ–æU÷6æ6†÷B‚FÆ–B“°§Ò“°§&÷WFR‚uõ5BrÂrö’öÆ–æR×f—6—G2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷cƒ5÷f—6—E÷F&ÆW2‚“°¢FÆ–CÒ†–çB’‚F%²vÆ–æUö–BuÓóó“²–b‚FÆ–B’‡GG£¦W'&÷"‚}Š}˜mŠ­ŠíŠ}Š‚Ší‹rŠ}˜M‹-Š}˜]¸ÂŠ}‹=Š¢rÃC#"“°¢F–G3×W6W%öÆ–æUö–G2‚GR“²–b†—5ö'&’‚F–G2’bb–åö'&’‚FÆ–BÆ'&•öÖ‚v–çGfÂrÂF–G2’ÇG'VR’’‡GG£¦W'&÷"‚}Š}¸Í˜bŠí‹rŠý‹˜]ŠÝŠý˜Šý˜rŠý‹=Š­‹‹=¸Â‹M˜]Šr˜m¸Í‹=Š¢rÃC2“°¢²FÆBÂFÆæuÓ×fÆ–DvVò‚F%²vÆBuÓóöçVÆÂÂF%²vÆæruÓóöçVÆÂ“²–b‚FÆCÓÓÖçVÆÂ’‡GG£¦W'&÷"‚}˜]˜˜-‹¸ÍŠ¢˜]ªŠ}˜m¸Â˜]‹Š­Š‹˜MŠ}‹-˜RŠ}‹=Š¢rÃC#"“°¢G7C×7FF–öåöE÷ö–çB‚FÆBÂFÆærÅ²FÆ–EÒÆÖ‚ƒ#RÂ†–çB•÷&W÷6WGF–ær‚vÆ–æU÷f—6—EöW‡G&÷&F—W5öÒrÃS’’“²–b‚G7B’‡GG£¦W'&÷"‚}Š‹Š}¸ÂŠ½ŠŠ¢ŠŠ}‹-Šý¸ÍŠòŠŠ}¸ÍŠòŠý‹˜]ŠÝŠý˜Šý˜rŠí‹r¸ÍŠrŠ}¸Í‹=Š­ªýŠ}˜rŠ-˜bŠÝ‹m˜‹ŠýŠ}‹MŠ­˜rŠŠ}‹M¸ÍŠòrÃC2“°¢–b†V×G’‚F%²w†÷FõöFFuÒ’ÇÂ7G'÷2‚‡7G&–ær’F%²w†÷FõöFFuÒÂvFF¦–ÖvRr’ÓÓ’‡GG£¦W'&÷"‚}Š½ŠŠ¢˜]‹=Š­˜-¸Í˜RŠ­‹]˜¸Í‹Š}‹"Šý˜‹Š¸Í˜bŠ}˜M‹-Š}˜]¸ÂŠ}‹=Š¢rÃC#"“°¢GsÖÖ‚ƒcCÂ†–çB•÷&W÷6WGF–ær‚vÆ–æU÷f—6—E÷†÷Fõ÷v–GF‚rÃ#ƒ’“²GÖÖ‚ƒ3RÆÖ–âƒ“Â†–çB•÷&W÷6WGF–ær‚vÆ–æU÷f—6—E÷†÷Fõ÷VÆ—G’rÃs’’“°¢GFƒÔÖVF–£§6fT&6ScB‚F%²w†÷FõöFFuÒÂvÆ–æU÷f—6—G2rÂGrÂG“°¢G6æÕ÷cƒ5öÆ–æU÷6æ6†÷B‚FÆ–B“²F7GVÃÖÖ‚ƒÂ†–çB’‚F%²v7GVÅ÷&W6VçEö6÷VçBuÓóó’“°¢F–CÔF#£¦–ç6W'B‚$”å4U%B”åDòÆ–æU÷f—6—E÷&W÷'G2‡W6W%ö–BÆÆ–æUö–BÇf—6—E÷G—RÇ7F'FVEöBÆf–æ—6†VEöBÆÆBÆÆærÆFV6Æ&VE÷&W6VçEö6÷VçBÆ7GVÅ÷&W6VçEö6÷VçBÇF÷FÅöÆ–æU÷fV†–6ÆW2ÆW‡—&VE÷&W6VçEö6÷VçBÇ&W6VçEöæ÷F–6Uö6÷VçBÇ&W÷'E÷FW‡BÇ†÷Fõ÷F‚Ç7FGW2’dÅTU2ƒòÃòÃòÄäõr‚’Ääõr‚’ÃòÃòÃòÃòÃòÃòÃòÃòÃòÂw7V&Ö—GFVBr’"Å²†–çB’GU²v–BuÒÂFÆ–BÅ÷cƒ5÷&öÆUöÖöFR‚GU²v–BuÒ’ÂFÆBÂFÆærÂ†–çB’G6æ²vFV6Æ&VE÷&W6VçEö6÷VçBuÒÂF7GVÂÂ†–çB’G6æ²wF÷FÅöÆ–æU÷fV†–6ÆW2uÒÂ†–çB’G6æ²vW‡—&VE÷&W6VçEö6÷VçBuÒÂ†–çB’G6æ²w&W6VçEöæ÷F–6Uö6÷VçBuÒÇG&–Ò‚‡7G&–ær’‚F%²w&W÷'E÷FW‡BuÓóòrr’’ÂGF…Ò“°¢&WGW&â²v–BsÓâF–BÂw6æ6†÷BsÓâG6æÂvF–ffW&Væ6RsÓâF7GVÂÒ†–çB’G6æ²vFV6Æ&VE÷&W6VçEö6÷VçBuÕÓ°§Ò“°§&÷WFR‚ttUBrÂrö’ö×’öÆ–æR×f—6—G2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷cƒ5÷f—6—E÷F&ÆW2‚“°¢&WGW&â²v—FV×2sÓäF#£¦ÆÂ‚%4TÄT5Bbâ¢ÆÂæ6öFRÆ–æUö6öFRÆÂæ÷&–v–âÆÂæFW7F–æF–öâe$ôÒÆ–æU÷f—6—E÷&W÷'G2b¤ô”âÆ–æW6ÂôâÂæ–C×bæÆ–æUö–Bt„U$RbçW6W%ö–CÓòõ$DU"%’bç7F'FVEöBDU42Ä”Ô•B#"Å²†–çB’GU²v–BuÕÒ•Ó°§Ò“°§&÷WFR‚ttUBrÂrö’öFÖ–âöÆ–æR×f—6—G2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷cƒ5÷f—6—E÷F&ÆW2‚“²Fg&öÓÒEôtUE²vg&öÒuÓóöFFR‚u’ÖÒÓr“²GFóÒEôtUE²wFòuÓóöFFR‚u’ÖÒÖBr“²GV–CÒ†–çB’‚EôtUE²wW6W%ö–BuÓóó“²GG—S×G&–Ò‚‡7G&–ær’‚EôtUE²wG—RuÓóòrr’“°¢Gv†W&SÒ$DDR‡bç7F'FVEöB’$UEtTTâòäBò#²F&w3Õ²Fg&öÒÂGFõÓ²–b‚GV–B—²Gv†W&RãÒ"äBbçW6W%ö–CÓò#²F&w5µÓÒGV–C·Ò–b‚GG—RÓÒrr—²Gv†W&RãÒ"äBbçf—6—E÷G—SÓò#²F&w5µÓÒGG—S·Ð¢F—FV×3ÔF#£¦ÆÂ‚%4TÄT5Bbâ¢ÆÂæ6öFRÆ–æUö6öFRÆÂæ÷&–v–âÆÂæFW7F–æF–öâÄ4ôä4B‡Ræf—'7EöæÖRÂrrÇRæÆ7EöæÖR’W6W%öæÖRÇ"çF—FÆR&öÆU÷F—FÆRÂ‡bæ7GVÅ÷&W6VçEö6÷VçB×bæFV6Æ&VE÷&W6VçEö6÷VçB’&W6Væ6UöF–ffW&Væ6Re$ôÒÆ–æU÷f—6—E÷&W÷'G2b¤ô”âÆ–æW6ÂôâÂæ–C×bæÆ–æUö–B¤ô”âW6W'2RôâRæ–C×bçW6W%ö–BÄTeB¤ô”â&öÆW2"ôâ"æ–C×Rç&öÆUö–Bt„U$RGv†W&Rõ$DU"%’bç7F'FVEöBDU42"ÂF&w2“°¢G7VÖÖ'“ÔF#£¦ÆÂ‚%4TÄT5BbçW6W%ö–BÄ4ôä4B‡Ræf—'7EöæÖRÂrrÇRæÆ7EöæÖR’W6W%öæÖRÇ"çF—FÆR&öÆU÷F—FÆRÄ4õTåB‚¢’f—6—G2Ä4õTåB„D•5D”ä5BbæÆ–æUö–B’f—6—FVEöÆ–æW2Å5TÒ‡bæ7GVÅ÷&W6VçEö6÷VçB’7GVÅ÷&W6VçBÅ5TÒ„%2‡bæ7GVÅ÷&W6VçEö6÷VçB×bæFV6Æ&VE÷&W6VçEö6÷VçB’’F÷FÅöF–ffW&Væ6Re$ôÒÆ–æU÷f—6—E÷&W÷'G2b¤ô”âW6W'2RôâRæ–C×bçW6W%ö–BÄTeB¤ô”â&öÆW2"ôâ"æ–C×Rç&öÆUö–Bt„U$RGv†W&Ru$õU%’bçW6W%ö–BÇRæf—'7EöæÖRÇRæÆ7EöæÖRÇ"çF—FÆRõ$DU"%’f—6—G2DU42"ÂF&w2“°¢&WGW&â²v—FV×2sÓâF—FV×2Âw7VÖÖ'’sÓâG7VÖÖ'•Ó°§ÒÆfÇ6RÄDÔ”â“°§&÷WFR‚uõ5BrÂrö’öFÖ–âö–ç7V7F÷"ÖÖöFR÷·W6W%ö–GÒrÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷cƒ5÷f—6—E÷F&ÆW2‚“²FÖöFSÒF%²vÖöFRuÓóòvWFòs²–b‚–åö'&’‚FÖöFRÅ²vWFòrÂw&W6–FVçEö–ç7V7F÷"rÂwfV†–6ÆU÷G&öÂrÂvÖ÷F÷%÷G&öÂuÒÇG'VR’’‡GG£¦W'&÷"‚}˜m˜‹’˜mŠ}˜]‹Š­Š‹rÃC#"“°¢F#£§'Vâ‚$”å4U%B”åDò–ç7V7F÷%öÖöFW2‡W6W%ö–BÆÖöFRÇWFFVEö'’’dÅTU2ƒòÃòÃò’ôâEUÄ”4DR´U’UDDRÖöFSÕdÅTU2†ÖöFR’ÇWFFVEö'“ÕdÅTU2‡WFFVEö'’’"Å²†–çB’G²wW6W%ö–BuÒÂFÖöFRÂ†–çB’GU²v–BuÕÒ“²&WGW&â²vö²sÓçG'VUÓ°§ÒÆfÇ6RÄDÔ”â“°§&÷WFR‚uõ5BrÂrö’÷7V&÷&F–æFRÖF–Ç’×&Wf–Ww2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷cƒ5÷f—6—E÷F&ÆW2‚“²G6–CÒ†–çB’‚F%²w7V&¦V7E÷W6W%ö–BuÓóó“²–b‚G6–B’‡GG£¦W'&÷"‚}˜m¸Í‹˜¸Â‹-¸Í‹˜]ŠÍ˜]˜‹˜rŠ}˜mŠ­ŠíŠ}Š‚˜m‹MŠý˜rŠ}‹=Š¢rÃC#"“°¢GfÇ3ÕµÓ²f÷&V6‚…²vGFVæFæ6U÷66÷&RrÂv6†V6¶Æ—7E÷66÷&RrÂvæ÷F–6U÷66÷&RrÂv6÷fW&vU÷66÷&RrÂwVÆ—G•÷66÷&RuÒ2F²’GfÇ5²FµÓÖÖ‚ƒÆÖ–âƒ#Â†fÆöB’‚F%²FµÓóó’’“°¢GF÷FÃÖ'&•÷7VÒ‚GfÇ2“²F#£§'Vâ‚$”å4U%B”åDò7V&÷&F–æFUöF–Ç•÷&Wf–Ww2‡&Wf–WvW%ö–BÇ7V&¦V7E÷W6W%ö–BÇ&Wf–WuöFFRÆÆ–æUö–BÆGFVæFæ6U÷66÷&RÆ6†V6¶Æ—7E÷66÷&RÆæ÷F–6U÷66÷&RÆ6÷fW&vU÷66÷&RÇVÆ—G•÷66÷&RÇF÷FÅ÷66÷&RÆæ÷FR’dÅTU2ƒòÃòÄ5U$DDR‚’ÃòÃòÃòÃòÃòÃòÃòÃòÃò’ôâEUÄ”4DR´U’UDDRGFVæFæ6U÷66÷&SÕdÅTU2†GFVæFæ6U÷66÷&R’Æ6†V6¶Æ—7E÷66÷&SÕdÅTU2†6†V6¶Æ—7E÷66÷&R’Ææ÷F–6U÷66÷&SÕdÅTU2†æ÷F–6U÷66÷&R’Æ6÷fW&vU÷66÷&SÕdÅTU2†6÷fW&vU÷66÷&R’ÇVÆ—G•÷66÷&SÕdÅTU2‡VÆ—G•÷66÷&R’ÇF÷FÅ÷66÷&SÕdÅTU2‡F÷FÅ÷66÷&R’Ææ÷FSÕdÅTU2†æ÷FR’"Å²†–çB’GU²v–BuÒÂG6–BÂF%²vÆ–æUö–BuÓóöçVÆÂÂGfÇ5²vGFVæFæ6U÷66÷&RuÒÂGfÇ5²v6†V6¶Æ—7E÷66÷&RuÒÂGfÇ5²væ÷F–6U÷66÷&RuÒÂGfÇ5²v6÷fW&vU÷66÷&RuÒÂGfÇ5²wVÆ—G•÷66÷&RuÒÂGF÷FÂÇG&–Ò‚‡7G&–ær’‚F%²væ÷FRuÓóòrr’•Ò“²&WGW&â²vö²sÓçG'VRÂwF÷FÅ÷66÷&RsÓâGF÷FÅÓ°§Ò“° ¢ò¢ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒc“÷c“#¢˜]˜Š­˜‹˜]Š=˜]˜‹¸ÍŠ¢˜Š}˜-‹¸Â˜}˜^(ÍªýŠ}˜RŠŠr˜m‹=Ší˜}™BæöFR’ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒ¢ð¦gVæ7F–öâ÷c“öÖ—76–öå÷F&ÆW2‚—°¢7FF–2FFöæSÖfÇ6S²–b‚FFöæR’&WGW&ã²FFöæS×G'VS°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2Ö—76–öåöÖWG&–5ö6FÆör€¢ÖWG&–5ö¶W’d$4„"ƒ’äõBåTÄÂÀ¢F—FÆRd$4„"ƒ#SR’äõBåTÄÂÀ¢Væ—Bd$4„"ƒ3’äõBåTÄÂDTdTÅBwW&6VçBrÀ¢Æ–6&ÆU÷&öÆW2ÄôäuDU…BåTÄÂÀ¢FW67&—F–öâDU…BåTÄÂÀ¢—5ö7F—fRD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢6÷'Eö÷&FW"”åBäõBåTÄÂDTdTÅBÀ¢$”Ô%’´U’†ÖWG&–5ö¶W’¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2Ö—76–öå÷FV×ÆFW2€¢–B$”t”åBUDõô”ä5$TÔTåB$”Ô%’´U’À¢F—FÆRd$4„"ƒ#SR’äõBåTÄÂÀ¢&öÆUö¶W’d$4„"ƒ’äõBåTÄÂÀ¢W&–öBd$4„"ƒ#’äõBåTÄÂDTdTÅBvF–Ç’rÀ¢¦öæUö–B”åBåTÄÂÀ¢—5öFVfVÇBD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢—5ö7F—fRD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢VffV7F—fUög&öÒDDRåTÄÂÀ¢VffV7F—fU÷FòDDRåTÄÂÀ¢7&VFVEö'’”åBåTÄÂÀ¢7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÀ¢WFFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕôâUDDR5U%$TåEõD”ÔU5DÕÀ¢´U’–G…öÖ—76–öå÷FV×ÆFW5÷&öÆU÷W&–öB‡&öÆUö¶W’ÂW&–öBÂ—5ö7F—fR¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2Ö—76–öå÷FV×ÆFU÷F&vWG2€¢–B$”t”åBUDõô”ä5$TÔTåB$”Ô%’´U’À¢FV×ÆFUö–B$”t”åBäõBåTÄÂÀ¢ÖWG&–5ö¶W’d$4„"ƒ’äõBåTÄÂÀ¢F&vWE÷W&6VçBDT4”ÔÂƒbÃ"’äõBåTÄÂDTdTÅBÀ¢vV–v‡BDT4”ÔÂƒ‚Ã"’äõBåTÄÂDTdTÅBÀ¢—5÷&WV—&VBD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢Ö–æ–×VÕö6÷VçB”åBåTÄÂÀ¢6öæf–rÄôäuDU…BåTÄÂÀ¢Tä•TR´U’WöÖ—76–öå÷FV×ÆFUöÖWG&–2‡FV×ÆFUö–BÂÖWG&–5ö¶W’’À¢´U’–G…ö×GE÷FV×ÆFR‡FV×ÆFUö–B’Â´U’–G…ö×GEöÖWG&–2†ÖWG&–5ö¶W’¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2W6W%öÖ—76–öåö÷fW'&–FW2€¢–B$”t”åBUDõô”ä5$TÔTåB$”Ô%’´U’À¢W6W%ö–B”åBäõBåTÄÂÀ¢W&–öBd$4„"ƒ#’äõBåTÄÂDTdTÅBvF–Ç’rÀ¢F—FÆRd$4„"ƒ#SR’åTÄÂÀ¢—5ö7F—fRD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢VffV7F—fUög&öÒDDRåTÄÂÀ¢VffV7F—fU÷FòDDRåTÄÂÀ¢7&VFVEö'’”åBåTÄÂÀ¢7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÀ¢WFFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕôâUDDR5U%$TåEõD”ÔU5DÕÀ¢Tä•TR´U’W÷W6W%öÖ—76–öå÷W&–öB‡W6W%ö–BÂW&–öB¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2W6W%öÖ—76–öåö÷fW'&–FU÷F&vWG2€¢–B$”t”åBUDõô”ä5$TÔTåB$”Ô%’´U’À¢÷fW'&–FUö–B$”t”åBäõBåTÄÂÀ¢ÖWG&–5ö¶W’d$4„"ƒ’äõBåTÄÂÀ¢F&vWE÷W&6VçBDT4”ÔÂƒbÃ"’äõBåTÄÂDTdTÅBÀ¢vV–v‡BDT4”ÔÂƒ‚Ã"’äõBåTÄÂDTdTÅBÀ¢—5÷&WV—&VBD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢Ö–æ–×VÕö6÷VçB”åBåTÄÂÀ¢6öæf–rÄôäuDU…BåTÄÂÀ¢Tä•TR´U’W÷W6W%ö÷fW'&–FUöÖWG&–2†÷fW'&–FUö–BÂÖWG&–5ö¶W’’À¢´U’–G…÷VÖ÷Eö÷fW'&–FR†÷fW'&–FUö–B’Â´U’–G…÷VÖ÷EöÖWG&–2†ÖWG&–5ö¶W’¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2Ö—76–öå÷f—6—E÷6W76–öç2€¢–B$”t”åBUDõô”ä5$TÔTåB$”Ô%’´U’À¢W6W%ö–B”åBäõBåTÄÂÀ¢Æ–æUö–B”åBäõBåTÄÂÀ¢&öÆUöÖöFRd$4„"ƒC’äõBåTÄÂÀ¢7F'FVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÀ¢f–æ—6†VEöBDDUD”ÔRåTÄÂÀ¢7F'EöÆBDT4”ÔÂƒÃr’åTÄÂÂ7F'EöÆærDT4”ÔÂƒÃr’åTÄÂÀ¢f–æ—6…öÆBDT4”ÔÂƒÃr’åTÄÂÂf–æ—6…öÆærDT4”ÔÂƒÃr’åTÄÂÀ¢7F'E÷†÷FõöFFÄôäuDU…BåTÄÂÀ¢f–æ—6…÷†÷FõöFFÄôäuDU…BåTÄÂÀ¢&W÷'E÷FW‡BDU…BåTÄÂÀ¢7GVÅ÷&W6VçEö6÷VçB”åBåTÄÂÀ¢7FGW2d$4„"ƒ3’äõBåTÄÂDTdTÅBv–å÷&öw&W72rÀ¢fÆ–FFVBD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢fÆ–FF–öå÷W&6VçBDT4”ÔÂƒbÃ"’äõBåTÄÂDTdTÅBÀ¢fÆ–FF–öåöFWF–Ç2ÄôäuDU…BåTÄÂÀ¢7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÀ¢WFFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕôâUDDR5U%$TåEõD”ÔU5DÕÀ¢´U’–G…ö×g5÷W6W%÷7F'FVB‡W6W%ö–BÂ7F'FVEöB’À¢´U’–G…ö×g5öÆ–æU÷7F'FVB†Æ–æUö–BÂ7F'FVEöB’À¢´U’–G…ö×g5÷W6W%öÆ–æU÷7FGW2‡W6W%ö–BÂÆ–æUö–BÂ7FGW2¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2Ö—76–öåöF–Ç•÷&öw&W72€¢–B$”t”åBUDõô”ä5$TÔTåB$”Ô%’´U’À¢W6W%ö–B”åBäõBåTÄÂÀ¢&öw&W75öFFRDDRäõBåTÄÂÀ¢&öÆUö¶W’d$4„"ƒ’äõBåTÄÂÀ¢Ö—76–öå÷6÷W&6Rd$4„"ƒS’åTÄÂÀ¢Ö—76–öåö–B$”t”åBåTÄÂÀ¢76–væVEöÆ–æW5ö6÷VçB”åBäõBåTÄÂDTdTÅBÀ¢f—6—FVEöÆ–æW5ö6÷VçB”åBäõBåTÄÂDTdTÅBÀ¢fÆ–FFVEöÆ–æW5ö6÷VçB”åBäõBåTÄÂDTdTÅBÀ¢F&vWEö§6öâÄôäuDU…BåTÄÂÀ¢7GVÅö§6öâÄôäuDU…BåTÄÂÀ¢&öw&W75ö§6öâÄôäuDU…BåTÄÂÀ¢vV–v‡FVEö6†–WfVÖVçBDT4”ÔÂƒrÃ"’äõBåTÄÂDTdTÅBÀ¢WFFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕôâUDDR5U%$TåEõD”ÔU5DÕÀ¢Tä•TR´U’WöÖG÷W6W%öFFR‡W6W%ö–BÂ&öw&W75öFFR’À¢´U’–G…öÖGöFFU÷&öÆR‡&öw&W75öFFRÂ&öÆUö¶W’¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2Ö—76–öå÷F–ÖVÆ–æUöWfVçG2€¢–B$”t”åBUDõô”ä5$TÔTåB$”Ô%’´U’À¢W6W%ö–B”åBäõBåTÄÂÀ¢Æ–æUö–B”åBåTÄÂÀ¢f—6—E÷6W76–öåö–B$”t”åBåTÄÂÀ¢WfVçE÷G—Rd$4„"ƒ’äõBåTÄÂÀ¢F&vWE÷G—Rd$4„"ƒ’åTÄÂÀ¢F&vWEö–B$”t”åBåTÄÂÀ¢F—FÆRd$4„"ƒ#SR’äõBåTÄÂÀ¢FWF–Ç2ÄôäuDU…BåTÄÂÀ¢ÆBDT4”ÔÂƒÃr’åTÄÂÂÆærDT4”ÔÂƒÃr’åTÄÂÀ¢ö67W'&VEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÀ¢7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÀ¢´U’–G…ö×FU÷W6W%öö67W'&VB‡W6W%ö–BÂö67W'&VEöB’À¢´U’–G…ö×FUöÆ–æUöö67W'&VB†Æ–æUö–BÂö67W'&VEöB’À¢´U’–G…ö×FU÷f—6—B‡f—6—E÷6W76–öåö–B’À¢´U’–G…ö×FUöWfVçE÷G—R†WfVçE÷G—R¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2Ö—76–öåöW†V7WF–öå÷6WGF–æw2€¢6WGF–æuö¶W’d$4„"ƒ’äõBåTÄÂÀ¢6WGF–æu÷fÇVRDU…BåTÄÂÀ¢WFFVEö'’”åBåTÄÂÀ¢WFFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕôâUDDR5U%$TåEõD”ÔU5DÕÀ¢$”Ô%’´U’‡6WGF–æuö¶W’¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“° ¢òòŠ‹‹¸Íªž(ÍŠŠ}‹˜}™BªŠ}Š­Š}˜M˜ªò˜]‹¸ÍŠ}‹˜}ŠrŠ}ªý‹ŠíŠ}˜M¸ÂŠŠ}‹MŠò¢–b‚F#£¦öæR‚%4TÄT5BÖWG&–5ö¶W’e$ôÒÖ—76–öåöÖWG&–5ö6FÆörÄ”Ô•B"’’°¢FÖWG&–72Ò°¢²vG&—fW%öGFVæFæ6U÷W&6VçBrÂ}Š½ŠŠ¢ŠÝ‹m˜‹‹Š}˜m˜mŠýªýŠ}˜brÂwW&6VçBrÃÒÀ¢²wfV†–6ÆUö6†V6¶Æ—7E÷W&6VçBrÂ}Š­ª˜]¸Í˜B¨mªž(Í˜M¸Í‹=Š¢Ší˜Šý‹˜˜}ŠrrÂwW&6VçBrÃ#ÒÀ¢²vW‡—&VEöæ÷F–6U÷W&6VçBrÂ}Š­‹ª‹Š}‹Š­ŠŠ}‹Š}Š¢˜]˜m˜-‹m¸ÂrÂwW&6VçBrÃ3ÒÀ¢²w7V'67&—F–öåöFV'Eöæ÷F–6U÷W&6VçBrÂ}Š­‹ª‹ŠŠý˜}¸ÂŠ-Š˜˜m˜]Š}˜brÂwW&6VçBrÃCÒÀ¢²v76–væVEöÆ–æW5÷f—6—E÷W&6VçBrÂ}ŠŠ}‹-Šý¸ÍŠòŠí‹}˜‹rŠ­Ší‹]¸Í‹^(Í¸ÍŠ}˜Š­˜rrÂwW&6VçBrÃSÒÀ¢²w7V&÷&F–æFU÷&Wf–Wu÷W&6VçBrÂ}Š‹‹‹=¸Â‹˜]˜Mª‹Šò˜m¸Í‹˜˜}Š}¸Â‹-¸Í‹˜]ŠÍ˜]˜‹˜rrÂwW&6VçBrÃcÒÀ¢²w7FF–öå÷f—6—E÷W&6VçBrÂ}ŠŠ}‹-Šý¸ÍŠòŠ}¸Í‹=Š­ªýŠ}˜~(Í˜}Šr˜‚›íŠ}¸ÍŠ}˜m˜~(Í˜}ŠrrÂwW&6VçBrÃsÒÀ¢²vVæE÷6†–gE÷&W÷'BrÂ}ªý‹-Š}‹‹B›íŠ}¸ÍŠ}˜b‹M¸Í˜Š¢rÂwW&6VçBrÃƒÒÀ¢Ó°¢f÷&V6‚‚FÖWG&–722FÒ’°¢F#£§'Vâ‚$”å4U%B”åDòÖ—76–öåöÖWG&–5ö6FÆör†ÖWG&–5ö¶W’ÇF—FÆRÇVæ—BÇ6÷'Eö÷&FW"Æ—5ö7F—fR’dÅTU2ƒòÃòÃòÃòÃ¢ôâEUÄ”4DR´U’UDDRF—FÆSÕdÅTU2‡F—FÆR’ÇVæ—CÕdÅTU2‡Væ—B’Ç6÷'Eö÷&FW#ÕdÅTU2‡6÷'Eö÷&FW"’"Â²FÕ³ÒÂFÕ³ÒÂFÕ³%ÒÂFÕ³5ÕÒ“°¢Ð¢Ð¢òòŠ‹‹¸Íªž(ÍŠŠ}‹˜}™BŠ}˜Mªý˜˜}Š}¸Â›í¸Í‹N(Í˜‹‹b˜}‹‹=˜]Š¢Š}ªý‹ŠíŠ}˜M¸ÂŠŠ}‹MŠò¢–b‚F#£¦öæR‚%4TÄT5B–Be$ôÒÖ—76–öå÷FV×ÆFW2Ä”Ô•B"’’°¢FFVfVÇG2Ò°¢vÆ–æU÷7WW'f—6÷"rÓâ²}Š}˜Mªý˜¸Â‹˜‹-Š}˜m˜r˜mŠ}‹‹Ší‹rrÂ°¢²vG&—fW%öGFVæFæ6U÷W&6VçBrÃƒÃÃÒÅ²wfV†–6ÆUö6†V6¶Æ—7E÷W&6VçBrÃ3ÃãRÃÒÀ¢²vW‡—&VEöæ÷F–6U÷W&6VçBrÃÃ"ÃÒÅ²w7V'67&—F–öåöFV'Eöæ÷F–6U÷W&6VçBrÃÃ"ÃÒÅ²vVæE÷6†–gE÷&W÷'BrÃÃÃÒÀ¢ÕÒÀ¢vÖ÷F÷%÷G&öÂrÓâ²}Š}˜Mªý˜¸Â‹˜‹-Š}˜m˜rªý‹MŠ¢˜]˜Š­˜‹¸ÂrÂ°¢²v76–væVEöÆ–æW5÷f—6—E÷W&6VçBrÃsÃ"ÃÒÅ²vG&—fW%öGFVæFæ6U÷W&6VçBrÃCÃÃÒÅ²wfV†–6ÆUö6†V6¶Æ—7E÷W&6VçBrÃ#RÃãRÃÒÀ¢²vW‡—&VEöæ÷F–6U÷W&6VçBrÃÃ"ÃÒÅ²w7V'67&—F–öåöFV'Eöæ÷F–6U÷W&6VçBrÃÃ"ÃÒÅ²w7FF–öå÷f—6—E÷W&6VçBrÃsÃÃÒÅ²vVæE÷6†–gE÷&W÷'BrÃÃÃÒÀ¢ÕÒÀ¢wfV†–6ÆU÷G&öÂrÓâ²}Š}˜Mªý˜¸Â‹˜‹-Š}˜m˜rŠŠ}‹-‹‹2ªý‹MŠ¢Ší˜Šý‹˜¸Í¸ÂrÂ°¢²v76–væVEöÆ–æW5÷f—6—E÷W&6VçBrÃsÃ"ÃÒÅ²vG&—fW%öGFVæFæ6U÷W&6VçBrÃ3RÃÃÒÅ²wfV†–6ÆUö6†V6¶Æ—7E÷W&6VçBrÃ#RÃãRÃÒÀ¢²vW‡—&VEöæ÷F–6U÷W&6VçBrÃÃ"ÃÒÅ²w7V'67&—F–öåöFV'Eöæ÷F–6U÷W&6VçBrÃÃ"ÃÒÅ²w7V&÷&F–æFU÷&Wf–Wu÷W&6VçBrÃSÃ"ÃÒÅ²vVæE÷6†–gE÷&W÷'BrÃÃÃÒÀ¢ÕÒÀ¢w&W6–FVçEö–ç7V7F÷"rÓâ²}Š}˜Mªý˜¸Â‹˜‹-Š}˜m˜rŠŠ}‹-‹‹2˜]˜-¸Í˜RrÂ°¢²vG&—fW%öGFVæFæ6U÷W&6VçBrÃƒÃÃÒÅ²wfV†–6ÆUö6†V6¶Æ—7E÷W&6VçBrÃ3ÃãRÃÒÅ²vW‡—&VEöæ÷F–6U÷W&6VçBrÃÃ"ÃÒÀ¢²w7V'67&—F–öåöFV'Eöæ÷F–6U÷W&6VçBrÃÃ"ÃÒÅ²w7V&÷&F–æFU÷&Wf–Wu÷W&6VçBrÃÃ"ÃÒÅ²vVæE÷6†–gE÷&W÷'BrÃÃÃÒÀ¢ÕÒÀ¢v6†–Veö–ç7V7F÷"rÓâ²}Š}˜Mªý˜¸Â‹˜‹-Š}˜m˜r‹=‹ŠŠ}‹-‹‹2rÂ°¢²v76–væVEöÆ–æW5÷f—6—E÷W&6VçBrÃ3ÃÃÒÅ²w7V&÷&F–æFU÷&Wf–Wu÷W&6VçBrÃcÃ2ÃÒÅ²vVæE÷6†–gE÷&W÷'BrÃÃÃÒÀ¢ÕÒÀ¢Ó°¢f÷&V6‚‚FFVfVÇG22G&öÆT¶W’ÓâGGÂ’°¢GF–BÒF#£¦–ç6W'B‚$”å4U%B”åDòÖ—76–öå÷FV×ÆFW2‡F—FÆRÇ&öÆUö¶W’ÇW&–öBÆ—5öFVfVÇBÆ—5ö7F—fR’dÅTU2ƒòÃòÂvF–Ç’rÃÃ’"Â²GGÅ³ÒÂG&öÆT¶W•Ò“°¢f÷&V6‚‚GGÅ³Ò2GB’°¢F#£§'Vâ‚$”å4U%B”åDòÖ—76–öå÷FV×ÆFU÷F&vWG2‡FV×ÆFUö–BÆÖWG&–5ö¶W’ÇF&vWE÷W&6VçBÇvV–v‡BÆ—5÷&WV—&VB’dÅTU2ƒòÃòÃòÃòÃò’"À¢²GF–BÂGE³ÒÂGE³ÒÂGE³%ÒÂGE³5ÕÒ“°¢Ð¢Ð¢Ð¢òòŠ‹‹¸Íªž(ÍŠŠ}‹˜}™BŠ­˜m‹¸Í˜]Š}Š¢Š}ŠÍ‹Š}¸Â˜]Š=˜]˜‹¸ÍŠ ¢–b‚F#£¦öæR‚%4TÄT5B6WGF–æuö¶W’e$ôÒÖ—76–öåöW†V7WF–öå÷6WGF–æw2Ä”Ô•B"’’°¢FFVg2Ò²wf—6—EöÖ–åöGW&F–öåöÖ–çWFW2sÓâsrÂwf—6—EöÖ–åö6†V6¶VE÷W&6VçBsÓâsRrÂwf—6—E÷&WV—&U÷7F'E÷†÷FòsÓâvfÇ6RrÀ¢wf—6—E÷&WV—&Uöf–æ—6…÷†÷FòsÓâwG'VRrÂwf—6—E÷&WV—&UöVæE÷&W÷'BsÓâwG'VRrÂwf—6—EövVõöW‡G&÷&F—W5öÒsÓâssRrÀ¢wf—6—E÷†÷Fõ÷v–GF‚sÓâs#ƒrÂwf—6—E÷†÷Fõ÷VÆ—G’sÓâssuÓ°¢f÷&V6‚‚FFVg22F³ÓâGb’F#£§'Vâ‚$”å4U%B”åDòÖ—76–öåöW†V7WF–öå÷6WGF–æw2‡6WGF–æuö¶W’Ç6WGF–æu÷fÇVR’dÅTU2ƒòÃò’ôâEUÄ”4DR´U’UDDR6WGF–æuö¶W“×6WGF–æuö¶W’"Â²F²ÂGeÒ“°¢Ð§Ð ¦gVæ7F–öâ÷c“÷6WGF–ær‚F¶W’ÂFfÆÆ&6²—°¢G"ÒF#£¦öæR‚%4TÄT5B6WGF–æu÷fÇVRe$ôÒÖ—76–öåöW†V7WF–öå÷6WGF–æw2t„U$R6WGF–æuö¶W“Óò"Â²F¶W•Ò“°¢&WGW&âG"òG%²w6WGF–æu÷fÇVRuÒ¢FfÆÆ&6³°§Ð ¦gVæ7F–öâ÷c#uö6öÅöW†—7G2‚GF&ÆRÂF6öÇVÖâ—°¢G'’²&WGW&â†&ööÂ”F#£¦öæR‚%4TÄT5B4ôÅTÔåôäÔRe$ôÒ–æf÷&ÖF–öå÷66†VÖä4ôÅTÔå2t„U$RD$ÄUõ44„TÔÔDD$4R‚’äBD$ÄUôäÔSÓòäB4ôÅTÔåôäÔSÓò"Å²GF&ÆRÂF6öÇVÖåÒ“²Ð¢6F6‚…ÅF‡&÷v&ÆRFR’²&WGW&âfÇ6S²Ð§Ð¦gVæ7F–öâ÷c#u÷f—6—E÷66†VÖ‚—°¢÷c“öÖ—76–öå÷F&ÆW2‚“°¢FFG3Õ°¢w7F'E÷†÷Fõ÷F‚sÓâ%d$4„"ƒS’åTÄÂ"Âvf–æ—6…÷†÷Fõ÷F‚sÓâ%d$4„"ƒS’åTÄÂ"À¢w7F'Eö67W&7’sÓâ$DT4”ÔÂƒ‚Ã"’åTÄÂ"Âvf–æ—6…ö67W&7’sÓâ$DT4”ÔÂƒ‚Ã"’åTÄÂ"À¢w7F'E÷&÷f–FW"sÓâ%d$4„"ƒ3’åTÄÂ"Âvf–æ—6…÷&÷f–FW"sÓâ%d$4„"ƒ3’åTÄÂ"À¢v6†V6¶VEö6÷VçBsÓâ$”åBäõBåTÄÂDTdTÅB"ÂvGFVæFæ6Uö6÷VçBsÓâ$”åBäõBåTÄÂDTdTÅB"À¢væ÷F–6Uö6÷VçBsÓâ$”åBäõBåTÄÂDTdTÅB"Âv6÷fW&vU÷W&6VçBsÓâ$DT4”ÔÂƒbÃ"’äõBåTÄÂDTdTÅB ¢Ó°¢f÷&V6‚‚FFG22F3ÓâFFVb—²–b‚÷c#uö6öÅöW†—7G2‚vÖ—76–öå÷f—6—E÷6W76–öç2rÂF2’’F#£§'Vâ‚$ÅDU"D$ÄRÖ—76–öå÷f—6—E÷6W76–öç2DB4ôÅTÔâF6FFVb"“²Ð¢–b‚F#£¦öæR‚%4TÄT5B”äDU…ôäÔRe$ôÒ–æf÷&ÖF–öå÷66†VÖå5DD•5D”52t„U$RD$ÄUõ44„TÔÔDD$4R‚’äBD$ÄUôäÔSÒvÖ—76–öå÷f—6—E÷6W76–öç2räB”äDU…ôäÔSÒv–G…ö×g5öF•÷7FGW2r"’—°¢F#£§'Vâ‚$ÅDU"D$ÄRÖ—76–öå÷f—6—E÷6W76–öç2DB”äDU‚–G…ö×g5öF•÷7FGW2‡W6W%ö–BÆÆ–æUö–BÇ7F'FVEöBÇ7FGW2’"“°¢Ð§Ð¦gVæ7F–öâ÷c#u÷6fU÷f—6—E÷†÷Fò‚FFFÂFföÆFW#ÒvÖ—76–öå÷f—6—G2r—°¢–b‚FFF’&WGW&âçVÆÃ°¢–b‡7G'÷2‚‡7G&–ær’FFFÂvFF¦–ÖvRr’ÓÓ’‡GG£¦W'&÷"‚}˜‹˜]Š¢Š­‹]˜¸Í‹ŠŠ}‹-Šý¸ÍŠò˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÃC#"“°¢GsÖÖ‚ƒcCÂ†–çB•÷c“÷6WGF–ær‚wf—6—E÷†÷Fõ÷v–GF‚rÃ#ƒ’“°¢GÖÖ‚ƒ3RÆÖ–âƒ“Â†–çB•÷c“÷6WGF–ær‚wf—6—E÷†÷Fõ÷VÆ—G’rÃs’’“°¢&WGW&âÖVF–£§6fT&6ScB‚FFFÂFföÆFW"ÂGrÂG“°§Ð¦gVæ7F–öâ÷c#uöÆ–æUö6†V6¶VEö6÷VçB‚FÆ–æT–BÂGW6W$–BÂFg&öÓÖçVÆÂÂGFóÖçVÆÂ—°¢Gv†W&SÒ&72çW6W%ö–CÓòäB‡bæÆ–æUö–CÓòõ"U„•5E2…4TÄT5Be$ôÒGFVæFæ6W2t„U$RæG&—fW%ö–CÖ72æG&—fW%ö–BäBæÆ–æUö–CÓòäBDDR†æ7&VFVEöB“ÔDDR†72æ7&VFVEöB’’’#°¢F&w3Õ²†–çB’GW6W$–BÂ†–çB’FÆ–æT–BÂ†–çB’FÆ–æT–EÓ°¢–b‚Fg&öÒ—²Gv†W&RãÒ"äB72æ7&VFVEöCãÓò#²F&w5µÓÒFg&öÓ²Ð¢–b‚GFò—²Gv†W&RãÒ"äB72æ7&VFVEöCÃÓò#²F&w5µÓÒGFó²Ð¢&WGW&â†–çB’„F#£¦öæR‚%4TÄT5B4õTåB„D•5D”ä5B4ôÄU44R†72çfV†–6ÆUö–BÆ72æG&—fW%ö–B’’âe$ôÒ6†V6¶Æ—7E÷7V&Ö—76–öç272ÄTeB¤ô”âfV†–6ÆW2bôâbæ–CÖ72çfV†–6ÆUö–Bt„U$RGv†W&R"ÂF&w2•²vâuÓóó“°§Ð¦gVæ7F–öâ÷c#uöÆ–æU÷W6W%ö6÷VçG2‚FÆ–æT–BÂGW6W$–BÂFg&öÓÖçVÆÂÂGFóÖçVÆÂ—°¢FsÒ'W6W%ö–CÓòäBÆ–æUö–CÓò#²FÕ²†–çB’GW6W$–BÂ†–çB’FÆ–æT–EÓ°¢FçsÒ&âçW6W%ö–CÓòäBU„•5E2…4TÄT5Be$ôÒGFVæFæ6W2t„U$RæG&—fW%ö–CÖâæG&—fW%ö–BäBæÆ–æUö–CÓòäBDDR†æ7&VFVEöB“ÔDDR†âæ7&VFVEöB’’#²FæÕ²†–çB’GW6W$–BÂ†–çB’FÆ–æT–EÓ°¢–b‚Fg&öÒ—²FrãÒ"äB7&VFVEöCãÓò#²FµÓÒFg&öÓ²FçrãÒ"äBâæ7&VFVEöCãÓò#²FæµÓÒFg&öÓ·Ð¢–b‚GFò—²FrãÒ"äB7&VFVEöCÃÓò#²FµÓÒGFó²FçrãÒ"äBâæ7&VFVEöCÃÓò#²FæµÓÒGFó·Ð¢&WGW&â°¢vGFVæFæ6Uö6÷VçBsÓâ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB„D•5D”ä5BG&—fW%ö–B’âe$ôÒGFVæFæ6W2t„U$RFr"ÂF•²vâuÓóó’À¢væ÷F–6Uö6÷VçBsÓâ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒæ÷F–6W2ât„U$RFçr"ÂFæ•²vâuÓóó’À¢Ó°§Ð ¢òò‹=˜]Š¢˜]ŠMŠ½‹ªŠ}‹Š‹Š‹Š}¸Â˜]˜Š­˜‹˜]Š=˜]˜‹¸ÍŠ£¢Š}‹"˜}˜]Š}˜bŠ­‹MŠí¸Í‹Rcƒ2Š}‹=Š­˜Š}Šý˜r˜]¸Î(Íª˜mŠòŠ­ŠrŠŠrŠ˜-¸Í˜}™B‹=Š}˜]Š}˜m˜r˜}˜^(Í‹Š}‹=Š­ŠrŠ˜]Š}˜mŠð¦gVæ7F–öâ÷c“÷&öÆUö¶W’‚GW6W$–B—²&WGW&â÷cƒ5÷&öÆUöÖöFR‚GW6W$–B“²Ð ¦gVæ7F–öâ÷c“öVffV7F—fUöÖ—76–öâ‚GRÂGW&–öCÒvF–Ç’r—°¢÷c“öÖ—76–öå÷F&ÆW2‚“°¢GV–CÒ†–çB’GU²v–BuÓ°¢F÷bÒF#£¦öæR‚%4TÄT5B¢e$ôÒW6W%öÖ—76–öåö÷fW'&–FW2t„U$RW6W%ö–CÓòäBW&–öCÓòäB—5ö7F—fSÓ¢äB†VffV7F—fUög&öÒ•2åTÄÂõ"VffV7F—fUög&öÓÃÔ5U$DDR‚’’äB†VffV7F—fU÷Fò•2åTÄÂõ"VffV7F—fU÷FóãÔ5U$DDR‚’¢õ$DU"%’WFFVEöBDU42Ä”Ô•B"Â²GV–BÂGW&–öEÒ“°¢G&²Ò÷c“÷&öÆUö¶W’‚GV–B“°¢–b‚F÷b’°¢GF&vWG2ÒF#£¦ÆÂ‚%4TÄT5BBâ¢Æ2çF—FÆRÆ2çVæ—BÆ2æFW67&—F–öâe$ôÒW6W%öÖ—76–öåö÷fW'&–FU÷F&vWG2@¢¤ô”âÖ—76–öåöÖWG&–5ö6FÆör2ôâ2æÖWG&–5ö¶W“×BæÖWG&–5ö¶W’t„U$R÷fW'&–FUö–CÓòõ$DU"%’2ç6÷'Eö÷&FW""Â²F÷e²v–BuÕÒ“°¢&WGW&â²w6÷W&6RsÓâwW6W%ö÷fW'&–FRrÂw&öÆUö¶W’sÓâG&²ÂvÖ—76–öâsÓâF÷bÂwF&vWG2sÓâGF&vWG5Ó°¢Ð¢G¦öæT–BÒGU²w¦öæUö–BuÒóòçVÆÃ°¢GGÂÒF#£¦öæR‚%4TÄT5B¢e$ôÒÖ—76–öå÷FV×ÆFW2t„U$R&öÆUö¶W“ÓòäBW&–öCÓòäB—5ö7F—fSÓ¢äB†VffV7F—fUög&öÒ•2åTÄÂõ"VffV7F—fUög&öÓÃÔ5U$DDR‚’’äB†VffV7F—fU÷Fò•2åTÄÂõ"VffV7F—fU÷FóãÔ5U$DDR‚’¢õ$DU"%’‡¦öæUö–B•2äõBåTÄÂäB¦öæUö–CÓò’DU42Â—5öFVfVÇBDU42ÂWFFVEöBDU42Ä”Ô•B"Â²G&²ÂGW&–öBÂG¦öæT–EÒ“°¢–b‚GGÂ’&WGW&â²w6÷W&6RsÓâvæöæRrÂw&öÆUö¶W’sÓâG&²ÂvÖ—76–öâsÓæçVÆÂÂwF&vWG2sÓåµÕÓ°¢GF&vWG2ÒF#£¦ÆÂ‚%4TÄT5BBâ¢Æ2çF—FÆRÆ2çVæ—BÆ2æFW67&—F–öâe$ôÒÖ—76–öå÷FV×ÆFU÷F&vWG2@¢¤ô”âÖ—76–öåöÖWG&–5ö6FÆör2ôâ2æÖWG&–5ö¶W“×BæÖWG&–5ö¶W’t„U$RFV×ÆFUö–CÓòõ$DU"%’2ç6÷'Eö÷&FW""Â²GGÅ²v–BuÕÒ“°¢&WGW&â²w6÷W&6RsÓâw&öÆU÷FV×ÆFRrÂw&öÆUö¶W’sÓâG&²ÂvÖ—76–öâsÓâGGÂÂwF&vWG2sÓâGF&vWG5Ó°§Ð ¦gVæ7F–öâ÷c“÷7V&÷&F–æFUö–G2‚GV–B—°¢òò›í¸Í˜]Š}¸Í‹BŠ­ª‹Š}‹‹M˜˜mŠý˜r„$e2’Šý‹…Š˜~(ÍŠÍŠ}¸Ât•D‚$T5U%4•dR(	B¨m˜˜bŠ‹=¸ÍŠ}‹¸ÂŠ}‹"˜}Š}‹=Š®(Í˜}Š}¸ÂŠ}‹MŠ­‹Š}ª¸À¢òò˜m‹=Ší˜}™B˜-Šý¸Í˜]¸Î(ÍŠ­‹×•5ÂôÖ&–D"ŠýŠ}‹˜mŠòª˜rŠ}‹"5D]˜}Š}¸ÂŠŠ}‹-ªý‹MŠ­¸Â›í‹MŠ­¸ÍŠŠ}˜m¸Â˜m˜]¸Î(Íª˜m˜mŠò˜‚ŠŠ}‹Š²Ší‹}Š}¸Â»]»» ¢òòŠý‹˜}˜]˜}™BVæGö–çM˜}Š}¸Â˜]˜Š­˜‹˜]Š=˜]˜‹¸ÍŠ¢˜]¸Î(Í‹MŠò¨m˜˜bŠ}¸Í˜bŠ­Š}Š‹’Š‹Š}¸Â˜}‹ªŠ}‹Š‹‹]ŠýŠr‹-Šý˜r˜]¸Î(Í‹M˜Šò’à¢FÆÃÕµÓ²Fg&öçF–W#Õ²†–çB’GV–EÓ²FwV&CÓ°¢v†–ÆR‚Fg&öçF–W"bbFwV&CÃS’°¢FwV&B²³°¢GÖ–×ÆöFR‚rÂrÆ'&•öf–ÆÂƒÆ6÷VçB‚Fg&öçF–W"’Âsòr’“°¢G&÷w3ÔF#£¦ÆÂ‚%4TÄT5B–Be$ôÒW6W'2t„U$RÖævW%ö–B”â‚G’"ÂFg&öçF–W"“°¢FæW‡CÕµÓ°¢f÷&V6‚‚G&÷w22G"’²F–CÒ†–çB’G%²v–BuÓ²–b‚–åö'&’‚F–BÂFÆÂÇG'VR’’²FÆÅµÓÒF–C²FæW‡EµÓÒF–C²ÒÐ¢Fg&öçF–W#ÒFæW‡C°¢Ð¢&WGW&âFÆÃ°§Ð¦gVæ7F–öâ÷c“÷7V&÷&F–æFUö6÷VçB‚GV–B—²&WGW&â6÷VçB…÷c“÷7V&÷&F–æFUö–G2‚GV–B’“²Ð ¦gVæ7F–öâ÷c“ö7GVÅöÖWG&–72‚GR—°¢GV–CÒ†–çB’GU²v–BuÓ°¢FÆ–æT–G2Ò'&•öÖ‚v–çGfÂrÂ'&•ö6öÇVÖâ„F#£¦ÆÂ‚%4TÄT5BÆ–æUö–Be$ôÒW6W%öÆ–æW2t„U$RW6W%ö–CÓò"Â²GV–EÒ’ÂvÆ–æUö–Br’“°¢G&W6VçEF÷FÃÓ²GF÷FÅfV†–6ÆW3Ó²FW‡—&VEF÷FÃÓ²FFV'EF÷FÃÓ°¢f÷&V6‚‚FÆ–æT–G22FÆ–B’°¢G6æÒ÷cƒ5öÆ–æU÷6æ6†÷B‚FÆ–B“°¢G&W6VçEF÷FÂ³Ò†–çB’G6æ²v7W'&VçE÷&W6VçEö6÷VçBuÓ°¢GF÷FÅfV†–6ÆW2³Ò†–çB’G6æ²wF÷FÅöÆ–æU÷fV†–6ÆW2uÓ°¢FW‡—&VEF÷FÂ³Ò†–çB’G6æ²vW‡—&VE÷&W6VçEö6÷VçBuÓ°¢FFV'EF÷FÂ³Ò†–çB’„F#£¦öæR‚%4TÄT5B4õTåB„D•5D”ä5BæG&—fW%ö–B’âe$ôÒGFVæFæ6W2¤ô”âG&—fW'2BôâBæ–CÖæG&—fW%ö–@¢t„U$RæÆ–æUö–CÓòäBDDR†æ7&VFVEöB“Ô5U$DDR‚’äBU„•5E2…4TÄT5Be$ôÒ&–ÆÇ2"t„U$R†"æG&—fW%ö–CÖBæ–Bõ""ææF–öæÅö–CÖBææF–öæÅö–B¢äB†"ç7FGW2•2åTÄÂõ""ç7FGW2äõBÄ”´Rr]›í‹ŠýŠ}ŠíŠ¢Rr’’"Â²FÆ–EÒ•²vâuÒóò“°¢Ð¢FGBÒ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB„D•5D”ä5BG&—fW%ö–B’âe$ôÒGFVæFæ6W2t„U$RW6W%ö–CÓòäBDDR†7&VFVEöB“Ô5U$DDR‚’"Â²GV–EÒ•²vâuÒóò“°¢F6†V6·2Ò†–çB’„F#£¦öæR‚%4TÄT5B4õTåB„D•5D”ä5B4ôÄU44R‡fV†–6ÆUö–BÆG&—fW%ö–B’’âe$ôÒ6†V6¶Æ—7E÷7V&Ö—76–öç2t„U$RW6W%ö–CÓòäBDDR†7&VFVEöB“Ô5U$DDR‚’"Â²GV–EÒ•²vâuÒóò“°¢Fæ÷F–6W2Ò†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒæ÷F–6W2t„U$RW6W%ö–CÓòäBDDR†7&VFVEöB“Ô5U$DDR‚’"Â²GV–EÒ•²vâuÒóò“°¢FW‡—&VDæ÷F–6W2Ò†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒæ÷F–6W2t„U$RW6W%ö–CÓòäBDDR†7&VFVEöB“Ô5U$DDR‚’äB†&öG’Ä”´Rr]˜]˜m˜-‹bRrõ"&öG’Ä”´Rr]Š}‹Š­ŠŠ}‹Rr’"Â²GV–EÒ•²vâuÒóò“°¢FFV'Dæ÷F–6W2Ò†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒæ÷F–6W2t„U$RW6W%ö–CÓòäBDDR†7&VFVEöB“Ô5U$DDR‚’äB†&öG’Ä”´Rr]Š-Š˜˜m˜]Š}˜bRrõ"&öG’Ä”´Rr]ŠŠý˜}ªŠ}‹Rr’"Â²GV–EÒ•²vâuÒóò“°¢Gf—6—G2Ò†–çB’„F#£¦öæR‚%4TÄT5B4õTåB„D•5D”ä5BÆ–æUö–B’âe$ôÒÖ—76–öå÷f—6—E÷6W76–öç2t„U$RW6W%ö–CÓòäBDDR‡7F'FVEöB“Ô5U$DDR‚’äB7FGW3Òw7V&Ö—GFVBr"Â²GV–EÒ•²vâuÒóò“°¢GfÆ–Ef—6—G2Ò†–çB’„F#£¦öæR‚%4TÄT5B4õTåB„D•5D”ä5BÆ–æUö–B’âe$ôÒÖ—76–öå÷f—6—E÷6W76–öç2t„U$RW6W%ö–CÓòäBDDR‡7F'FVEöB“Ô5U$DDR‚’äBfÆ–FFVCÓ"Â²GV–EÒ•²vâuÒóò“°¢G&Wf–Ww2Ò†–çB’„F#£¦öæR‚%4TÄT5B4õTåB„D•5D”ä5B7V&¦V7E÷W6W%ö–B’âe$ôÒ7V&÷&F–æFUöF–Ç•÷&Wf–Ww2t„U$R&Wf–WvW%ö–CÓòäB&Wf–WuöFFSÔ5U$DDR‚’"Â²GV–EÒ•²vâuÒóò“°¢G&W÷'G2Ò†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒ&W÷'G2t„U$R6VæFW%ö–CÓòäBDDR†7&VFVEöB“Ô5U$DDR‚’äB‡7V&¦V7BÄ”´Rr]›íŠ}¸ÍŠ}˜b‹M¸Í˜Š¢Rrõ"&öG’Ä”´Rr]›íŠ}¸ÍŠ}˜b‹M¸Í˜Š¢Rr’"Â²GV–EÒ•²vâuÒóò“°¢G7V'2Ò÷c“÷7V&÷&F–æFUö6÷VçB‚GV–B“°¢FFVæöÖ–æF÷'2Ò°¢vG&—fW%öGFVæFæ6U÷W&6VçBsÓâG&W6VçEF÷FÂó¢GF÷FÅfV†–6ÆW2À¢wfV†–6ÆUö6†V6¶Æ—7E÷W&6VçBsÓâG&W6VçEF÷FÂó¢GF÷FÅfV†–6ÆW2À¢vW‡—&VEöæ÷F–6U÷W&6VçBsÓâFW‡—&VEF÷FÂÀ¢w7V'67&—F–öåöFV'Eöæ÷F–6U÷W&6VçBsÓâFFV'EF÷FÂÀ¢v76–væVEöÆ–æW5÷f—6—E÷W&6VçBsÓæ6÷VçB‚FÆ–æT–G2’À¢w7V&÷&F–æFU÷&Wf–Wu÷W&6VçBsÓâG7V'2À¢w7FF–öå÷f—6—E÷W&6VçBsÓæ6÷VçB‚FÆ–æT–G2’À¢vVæE÷6†–gE÷&W÷'BsÓãÀ¢Ó°¢F6÷VçG2Ò°¢vG&—fW%öGFVæFæ6U÷W&6VçBsÓâFGBÀ¢wfV†–6ÆUö6†V6¶Æ—7E÷W&6VçBsÓâF6†V6·2À¢vW‡—&VEöæ÷F–6U÷W&6VçBsÓâFW‡—&VDæ÷F–6W2À¢w7V'67&—F–öåöFV'Eöæ÷F–6U÷W&6VçBsÓâFFV'Dæ÷F–6W2À¢v76–væVEöÆ–æW5÷f—6—E÷W&6VçBsÓâGfÆ–Ef—6—G2À¢w7V&÷&F–æFU÷&Wf–Wu÷W&6VçBsÓâG&Wf–Ww2À¢w7FF–öå÷f—6—E÷W&6VçBsÓâGf—6—G2À¢vVæE÷6†–gE÷&W÷'BsÓâG&W÷'G3ãó£À¢Ó°¢&WGW&â²vÆ–æW2sÓâFÆ–æT–G2Âv6÷VçG2sÓâF6÷VçG2ÂvFVæöÖ–æF÷'2sÓâFFVæöÖ–æF÷'2À¢w&rsÓå²w&W6VçE÷F÷FÂsÓâG&W6VçEF÷FÂÂwF÷FÅ÷fV†–6ÆW2sÓâGF÷FÅfV†–6ÆW2Âvæ÷F–6W2sÓâFæ÷F–6W2Âwf—6—FVEöÆ–æW2sÓâGf—6—G2ÂwfÆ–FFVEöÆ–æW2sÓâGfÆ–Ef—6—G2Âw7V&÷&F–æFW2sÓâG7V'5ÕÓ°§Ð ¦gVæ7F–öâ÷c“÷7B‚FâÂFB—²FCÒ†fÆöB’FC²&WGW&âFCãòÖ–âƒÂ&÷VæB‚‚†fÆöB’FâòFB’£’ó’¢ã²Ð¢òò˜m‹˜]Š}˜N(Í‹=Š}‹-¸Â›íŠ}‹Š}˜]Š­‹˜}Š}¸ÂŠ­Š}‹¸ÍŠí™Šý‹¸ÍŠ}˜Š­¸ÂŠ}‹"›í˜m˜C¢¨m˜˜bŠ‹‹m¸ÂŠ}‹"Š}˜mŠ­ŠíŠ}Šªý‹˜}Š}¸ÂŠ­Š}‹¸ÍŠâŠí‹˜ŠÍ¸Â‹M˜]‹=¸ÂŠŠrŠ}‹=˜M‹@¢òò˜]¸Î(ÍŠý˜}˜mŠò˜]Š½˜B*½»»M»»Rý»»Rý»»+²’˜˜M¸Âª˜Šm‹¸Î(Í˜}Š}¸Â5ÂŠ}¸Í˜b˜]Š}©˜˜BŠ˜r˜‹˜]Š¢˜]¸Í˜MŠ}Šý¸Â*µ•••’ÔÔÒÔDL+²˜m¸ÍŠ}‹"ŠýŠ}‹˜mŠýˆÀ¢òòŠ}¸Í˜bŠ­Š}Š‹’Šý˜-¸Í˜-Š}˜²˜}˜^(ÍŠ}˜Mªý˜‚ŠŠr˜m‹˜]Š}˜N(Í‹=Š}‹-˜}Š}¸Â˜]‹MŠ}Š˜rª˜rŠ}‹"˜-Š˜BŠý‹ŠŠí‹N(Í˜}Š}¸ÂŠý¸Íªý‹Š}¸Í˜b˜Š}¸Í˜BŠ}‹=Š­˜Š}Šý˜p¢òò˜]¸Î(Í‹MŠý˜mŠò’˜}‹Šý˜‚˜‹˜]Š¢‹Šr˜]¸Î(Í›í‹¸Í‹Šò˜‚˜}˜]¸Í‹M˜r˜]¸Í˜MŠ}Šý¸ÂŠ‹˜]¸Î(Íªý‹ŠýŠ}˜mŠòà¦gVæ7F–öâ÷c“öæ÷&ÕöFFR‚GbÂFfÆÆ&6³ÖçVÆÂ—°¢GbÒG&–Ò‚‡7G&–ær’Gb“°¢–b‚GbÓÓÒrr’&WGW&âFfÆÆ&6³°¢GbÒ7G%÷&WÆ6R‚ròrÂrÒrÂGb“°¢–b‡&VuöÖF6‚‚rõâ…ÆG³GÒ’Ò…ÆG³Ã'Ò’Ò…ÆG³Ã'Ò’BòrÂGbÂFÒ’bb†–çB’FÕ³ÒÂs’°¢²Fw’ÂFvÒÂFvEÒÒ¦ÆÆ•÷Fõöw&Vv÷&–â‚†–çB’FÕ³ÒÂ†–çB’FÕ³%ÒÂ†–çB’FÕ³5Ò“°¢&WGW&â7&–çFb‚rSFBÒS&BÒS&BrÂFw’ÂFvÒÂFvB“°¢Ð¢GG2Ò7G'F÷F–ÖR‚Gb“°¢&WGW&âGG2òFFR‚u’ÖÒÖBrÂGG2’¢FfÆÆ&6³°§Ð ¦gVæ7F–öâ÷c“öÖ—76–öå÷&öw&W72‚GR—°¢FVfbÒ÷c“öVffV7F—fUöÖ—76–öâ‚GRÂvF–Ç’r“°¢F7BÒ÷c“ö7GVÅöÖWG&–72‚GR“°¢GvV–v‡E7VÓÓã²G66÷&U7VÓÓã²GF&vWG3ÕµÓ°¢f÷&V6‚‚‚FVfe²wF&vWG2uÒó¢µÒ’2GB’°¢FÖ²ÒGE²vÖWG&–5ö¶W’uÓ°¢F7GVÂÒF7E²v6÷VçG2uÕ²FÖµÒóò°¢FFVâÒF7E²vFVæöÖ–æF÷'2uÕ²FÖµÒóò°¢F7GVÅW&6VçBÒ‚FÖ³ÓÓÒvVæE÷6†–gE÷&W÷'Br’ò‚F7GVÂò¢’¢÷c“÷7B‚F7GVÂÂFFVâ“°¢GF&vWBÒ†fÆöB’‚GE²wF&vWE÷W&6VçBuÒóò“°¢F6†–WfVÖVçBÒGF&vWCãòÖ–âƒÂF7GVÅW&6VçBòGF&vWB£’¢°¢GrÒ†fÆöB’‚GE²wvV–v‡BuÒóò“°¢GvV–v‡E7VÒ³ÒGs²G66÷&U7VÒ³ÒF6†–WfVÖVçB¢Gs°¢GF&vWG5µÒÒGB²°¢v7GVÅö6÷VçBsÓâF7GVÂÂvFVæöÖ–æF÷%ö6÷VçBsÓâFFVâÂv7GVÅ÷W&6VçBsÓâF7GVÅW&6VçBÀ¢v6†–WfVÖVçE÷W&6VçBsÓç&÷VæB‚F6†–WfVÖVçB£’óÀ¢w&VÖ–æ–æuö6÷VçBsÓæÖ‚ƒÂ†–çB–6V–Â‚FFVâ¢GF&vWBó’ÒF7GVÂ’À¢Ó°¢Ð¢GvV–v‡FVBÒGvV–v‡E7VÒò&÷VæB‚G66÷&U7VÒòGvV–v‡E7VÒ£’ó¢ã°¢–b‚FVfe²vÖ—76–öâuÒ’°¢GF&vWD§6öâÒ§6öåöVæ6öFR†'&•ö6öÇVÖâ‚GF&vWG2ÂwF&vWE÷W&6VçBrÂvÖWG&–5ö¶W’r’Â¥4ôåõTäU44TEõTä”4ôDR“°¢F7GVÄ§6öâÒ§6öåöVæ6öFR‚F7E²v6÷VçG2uÒÂ¥4ôåõTäU44TEõTä”4ôDR“°¢G&öw&W74§6öâÒ§6öåöVæ6öFR†'&•ö6öÇVÖâ‚GF&vWG2Âv6†–WfVÖVçE÷W&6VçBrÂvÖWG&–5ö¶W’r’Â¥4ôåõTäU44TEõTä”4ôDR“°¢F#£§'Vâ‚$”å4U%B”åDòÖ—76–öåöF–Ç•÷&öw&W72‡W6W%ö–BÇ&öw&W75öFFRÇ&öÆUö¶W’ÆÖ—76–öå÷6÷W&6RÆÖ—76–öåö–BÆ76–væVEöÆ–æW5ö6÷VçBÇf—6—FVEöÆ–æW5ö6÷VçBÇfÆ–FFVEöÆ–æW5ö6÷VçBÇF&vWEö§6öâÆ7GVÅö§6öâÇ&öw&W75ö§6öâÇvV–v‡FVEö6†–WfVÖVçB¢dÅTU2ƒòÄ5U$DDR‚’ÃòÃòÃòÃòÃòÃòÃòÃòÃòÃò¢ôâEUÄ”4DR´U’UDDR&öÆUö¶W“ÕdÅTU2‡&öÆUö¶W’’ÆÖ—76–öå÷6÷W&6SÕdÅTU2†Ö—76–öå÷6÷W&6R’ÆÖ—76–öåö–CÕdÅTU2†Ö—76–öåö–B’À¢76–væVEöÆ–æW5ö6÷VçCÕdÅTU2†76–væVEöÆ–æW5ö6÷VçB’Çf—6—FVEöÆ–æW5ö6÷VçCÕdÅTU2‡f—6—FVEöÆ–æW5ö6÷VçB’ÇfÆ–FFVEöÆ–æW5ö6÷VçCÕdÅTU2‡fÆ–FFVEöÆ–æW5ö6÷VçB’À¢F&vWEö§6öãÕdÅTU2‡F&vWEö§6öâ’Æ7GVÅö§6öãÕdÅTU2†7GVÅö§6öâ’Ç&öw&W75ö§6öãÕdÅTU2‡&öw&W75ö§6öâ’ÇvV–v‡FVEö6†–WfVÖVçCÕdÅTU2‡vV–v‡FVEö6†–WfVÖVçB’"À¢²†–çB’GU²v–BuÒÂFVfe²w&öÆUö¶W’uÒÂFVfe²w6÷W&6RuÒÂFVfe²vÖ—76–öâuÕ²v–BuÒÆ6÷VçB‚F7E²vÆ–æW2uÒ’ÂF7E²w&ruÕ²wf—6—FVEöÆ–æW2uÒÂF7E²w&ruÕ²wfÆ–FFVEöÆ–æW2uÒÀ¢GF&vWD§6öâÂF7GVÄ§6öâÂG&öw&W74§6öâÂGvV–v‡FVEÒ“°¢Ð¢G'’²÷c“UöÇ•öF–Ç•÷66÷&–ær‚GRÂF7BÂFVfbÂGvV–v‡FVB“²Ò6F6‚…ÅF‡&÷v&ÆRFR’²W'&÷%öÆör‚w66÷&–ærf–ÆVC¢râFRÓævWDÖW76vR‚’“²Ð¢&WGW&âFVfb²²v76–væVEöÆ–æW2sÓæ6÷VçB‚F7E²vÆ–æW2uÒ’ÂwF&vWG2sÓâGF&vWG2Âv7GVÅö6÷VçG2sÓâF7E²v6÷VçG2uÒÂvFVæöÖ–æF÷'2sÓâF7E²vFVæöÖ–æF÷'2uÒÀ¢w7VÖÖ'’sÓâF7E²w&ruÒ²²wvV–v‡FVEö6†–WfVÖVçBsÓâGvV–v‡FVEÕÓ°§Ð §&÷WFR‚ttUBrÂrö’ö×’öÖ—76–öç2öVffV7F—fRrÆgVæ7F–öâ‚GÂF"ÂGR—°¢&WGW&â÷c“öVffV7F—fUöÖ—76–öâ‚GRÂ‡7G&–ær’‚EôtUE²wW&–öBuÒóòvF–Ç’r’“°§Ò“°§&÷WFR‚ttUBrÂrö’ö×’öÖ—76–öç2÷FöF’rÆgVæ7F–öâ‚GÂF"ÂGR—°¢&WGW&â÷c“öÖ—76–öå÷&öw&W72‚GR“°§Ò“°§&÷WFR‚ttUBrÂrö’ö×’öÖ—76–öâ×F–ÖVÆ–æRrÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“öÖ—76–öå÷F&ÆW2‚“°¢FFFRÒ÷c“öæ÷&ÕöFFR‚EôtUE²vFFRuÒóòçVÆÂÂFFR‚u’ÖÒÖBr’“°¢&WGW&â²v—FV×2sÓäF#£¦ÆÂ‚%4TÄT5BRâ¢ÆÂæ6öFRÆ–æUö6öFRÆÂæ÷&–v–âÆÂæFW7F–æF–öâe$ôÒÖ—76–öå÷F–ÖVÆ–æUöWfVçG2P¢ÄTeB¤ô”âÆ–æW6ÂôâÂæ–CÖRæÆ–æUö–Bt„U$RRçW6W%ö–CÓòäBDDR†Ræö67W'&VEöB“Óòõ$DU"%’Ræö67W'&VEöBDU42"Â²†–çB’GU²v–BuÒÂFFFUÒ•Ó°§Ò“°§&÷WFR‚uõ5BrÂrö’öÖ—76–öâ×F–ÖVÆ–æRöWfVçBrÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“öÖ—76–öå÷F&ÆW2‚“°¢GG—RÒG&–Ò‚‡7G&–ær’‚F%²vWfVçE÷G—RuÒóòrr’“²GF—FÆRÒG&–Ò‚‡7G&–ær’‚F%²wF—FÆRuÒóòrr’“°¢–b†Ö%÷7G&ÆVâ‚GG—R“Ã"ÇÂÖ%÷7G&ÆVâ‚GF—FÆR“Ã"’‡GG£¦W'&÷"‚}‹˜¸ÍŠýŠ}Šò˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÃC“°¢F–BÒF#£¦–ç6W'B‚$”å4U%B”åDòÖ—76–öå÷F–ÖVÆ–æUöWfVçG2‡W6W%ö–BÆÆ–æUö–BÆWfVçE÷G—RÇF&vWE÷G—RÇF&vWEö–BÇF—FÆRÆFWF–Ç2ÆÆBÆÆær’dÅTU2ƒòÃòÃòÃòÃòÃòÃòÃòÃò’"À¢²†–çB’GU²v–BuÒÂF%²vÆ–æUö–BuÒóòçVÆÂÂGG—RÂF%²wF&vWE÷G—RuÒóòçVÆÂÂF%²wF&vWEö–BuÒóòçVÆÂÂGF—FÆRÀ¢§6öåöVæ6öFR‚F%²vFWF–Ç2uÒóòæWr7FD6Æ72‚’Â¥4ôåõTäU44TEõTä”4ôDR’ÂF%²vÆBuÒóòçVÆÂÂF%²vÆæruÒóòçVÆÅÒ“°¢‡GG£¦§6öâ…²v–BsÓâF–EÒÃ#“°§Ò“° §&÷WFR‚uõ5BrÂrö’öÖ—76–öâ×f—6—G2÷7F'BrÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c#u÷f—6—E÷66†VÖ‚“°¢FÆ–CÒ†–çB’‚F%²vÆ–æUö–BuÓóó“²–b‚FÆ–B’‡GG£¦W'&÷"‚}Š}˜mŠ­ŠíŠ}Š‚Ší‹rŠ}˜M‹-Š}˜]¸ÂŠ}‹=Š¢rÃC#"“°¢F–G3×W6W%öÆ–æUö–G2‚GR“²–b†—5ö'&’‚F–G2’bb–åö'&’‚FÆ–BÆ'&•öÖ‚v–çGfÂrÂF–G2’ÇG'VR’’‡GG£¦W'&÷"‚}Š}¸Í˜bŠí‹rŠý‹˜]ŠÝŠý˜Šý˜rŠý‹=Š­‹‹=¸Â‹M˜]Šr˜m¸Í‹=Š¢rÃC2“°¢²FÆBÂFÆæuÓ×fÆ–DvVò‚F%²vÆBuÓóöçVÆÂÂF%²vÆæruÓóöçVÆÂ“²–b‚FÆCÓÓÖçVÆÂ’‡GG£¦W'&÷"‚}˜]˜˜-‹¸ÍŠ¢˜]ªŠ}˜m¸Â˜]‹Š­Š‹˜MŠ}‹-˜RŠ}‹=Š¢rÃC#"“°¢F67W&7“Ö—76WB‚F%²v67W&7’uÒ“öÖ‚ƒÂ†fÆöB’F%²v67W&7’uÒ“¦çVÆÃ°¢FÖ„67W&7“ÖÖ‚ƒ#Â†–çB•÷c“÷6WGF–ær‚wf—6—EöÖ…öÆö6F–öåö67W&7•öÒrÃ#’“°¢–b‚F67W&7’ÓÖçVÆÂbbF67W&7“âFÖ„67W&7’’‡GG£¦W'&÷"‚}Šý˜-Š¢˜]˜˜-‹¸ÍŠ¢Š‹Š}¸Â‹M‹˜‹’ŠŠ}‹-Šý¸ÍŠòªŠ}˜¸Â˜m¸Í‹=Š¢â¨m˜mŠò˜MŠÝ‹˜rŠý‹˜‹mŠ}¸ÂŠŠ}‹"˜]˜mŠ­‹‹Š˜]Š}˜m¸ÍŠòârÃC#"“°¢FW‡G&ÖÖ‚ƒÂ†–çB•÷c“÷6WGF–ær‚wf—6—EövVõöW‡G&÷&F—W5öÒrÃsR’“°¢FfVæ6S×7FF–öåöE÷ö–çB‚FÆBÂFÆærÅ²FÆ–EÒÂFW‡G&“°¢–b‚FfVæ6R’‡GG£¦W'&÷"‚}Š‹Š}¸Â‹M‹˜‹’ŠŠ}‹-Šý¸ÍŠòŠŠ}¸ÍŠòŠý‹˜]ŠÝŠý˜Šý˜rŠí‹r¸ÍŠrŠ}¸Í‹=Š­ªýŠ}˜rŠ-˜bŠÝ‹m˜‹ŠýŠ}‹MŠ­˜rŠŠ}‹M¸ÍŠòrÃC2“°¢G&WV—&U†÷FóÕ÷c“÷6WGF–ær‚wf—6—E÷&WV—&U÷7F'E÷†÷FòrÂvfÇ6Rr“ÓÓÒwG'VRs°¢–b‚G&WV—&U†÷FòbbV×G’‚F%²w†÷FõöFFuÒ’’‡GG£¦W'&÷"‚}Š­‹]˜¸Í‹‹M‹˜‹’ŠŠ}‹-Šý¸ÍŠòŠ}˜M‹-Š}˜]¸ÂŠ}‹=Š¢rÃC#"“°¢G†÷FõFƒÒV×G’‚F%²w†÷FõöFFuÒ“õ÷c#u÷6fU÷f—6—E÷†÷Fò‚F%²w†÷FõöFFuÒÂvÖ—76–öå÷f—6—G2÷7F'Br“¦çVÆÃ°¢FW†—7F–æsÔF#£¦öæR‚%4TÄT5B–BÇ7F'FVEöBe$ôÒÖ—76–öå÷f—6—E÷6W76–öç2t„U$RW6W%ö–CÓòäBÆ–æUö–CÓòäB7FGW3Òv–å÷&öw&W72rõ$DU"%’–BDU42Ä”Ô•B"Å²†–çB’GU²v–BuÒÂFÆ–EÒ“°¢–b‚FW†—7F–ær’&WGW&â²vö²sÓçG'VRÂv–BsÓâ†–çB’FW†—7F–æu²v–BuÒÂw7F'FVEöBsÓâFW†—7F–æu²w7F'FVEöBuÒÂvÇ&VG•÷7F'FVBsÓçG'VUÓ°¢F–CÔF#£¦–ç6W'B‚$”å4U%B”åDòÖ—76–öå÷f—6—E÷6W76–öç2‡W6W%ö–BÆÆ–æUö–BÇ&öÆUöÖöFRÇ7F'EöÆBÇ7F'EöÆærÇ7F'E÷†÷Fõ÷F‚Ç7F'Eö67W&7’Ç7F'E÷&÷f–FW"Ç7FGW2’dÅTU2ƒòÃòÃòÃòÃòÃòÃòÃòÂv–å÷&öw&W72r’"À¢²†–çB’GU²v–BuÒÂFÆ–BÅ÷c“÷&öÆUö¶W’‚GU²v–BuÒ’ÂFÆBÂFÆærÂG†÷FõF‚ÂF67W&7’Ç7V'7G"‚‡7G&–ær’‚F%²w&÷f–FW"uÓóòrr’ÃÃ3“ó¦çVÆÅÒ“°¢F#£§'Vâ‚$”å4U%B”åDòÖ—76–öå÷F–ÖVÆ–æUöWfVçG2‡W6W%ö–BÆÆ–æUö–BÇf—6—E÷6W76–öåö–BÆWfVçE÷G—RÇF—FÆRÆFWF–Ç2ÆÆBÆÆær’dÅTU2ƒòÃòÃòÂwf—6—E÷7F'FVBrÂ}‹M‹˜‹’ŠŠ}‹-Šý¸ÍŠòŠí‹rrÃòÃòÃò’"À¢²†–çB’GU²v–BuÒÂFÆ–BÂF–BÆ§6öåöVæ6öFR…²w&öÆUöÖöFRsÓå÷c“÷&öÆUö¶W’‚GU²v–BuÒ’ÂvvVöfVæ6RsÓâFfVæ6U²væÖRuÓóöçVÆÂÂv67W&7’sÓâF67W&7•ÒÄ¥4ôåõTäU44TEõTä”4ôDR’ÂFÆBÂFÆæuÒ“°¢‡GG£¦§6öâ…²vö²sÓçG'VRÂv–BsÓâF–BÂw7F'FVEöBsÓæFFR‚v2r’ÂvvVòsÓå²væÖRsÓâFfVæ6U²væÖRuÓóöçVÆÅÒÂv67W&7’sÓâF67W&7•ÒÃ#“°§Ò“° §&÷WFR‚uõ5BrÂrö’öÖ—76–öâ×f—6—G2öf–æ—6‚rÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c#u÷f—6—E÷66†VÖ‚“°¢G6–CÒ†–çB’‚F%²w6W76–öåö–BuÓóó“²–b‚G6–B’‡GG£¦W'&÷"‚}‹M˜mŠ}‹=˜rŠŠ}‹-Šý¸ÍŠò˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÃC#"“°¢G3ÔF#£¦öæR‚%4TÄT5B¢e$ôÒÖ—76–öå÷f—6—E÷6W76–öç2t„U$R–CÓòäBW6W%ö–CÓòäB7FGW3Òv–å÷&öw&W72r"Å²G6–BÂ†–çB’GU²v–BuÕÒ“°¢–b‚G2’‡GG£¦W'&÷"‚}ŠŠ}‹-Šý¸ÍŠò˜‹Š}˜B¸ÍŠ}˜Š¢˜m‹MŠò¸ÍŠr˜-Š˜MŠ}˜²›íŠ}¸ÍŠ}˜b¸ÍŠ}˜Š­˜rŠ}‹=Š¢rÃCB“°¢²FÆBÂFÆæuÓ×fÆ–DvVò‚F%²vÆBuÓóöçVÆÂÂF%²vÆæruÓóöçVÆÂ“²–b‚FÆCÓÓÖçVÆÂ’‡GG£¦W'&÷"‚}˜]˜˜-‹¸ÍŠ¢˜]ªŠ}˜m¸Â˜]‹Š­Š‹˜MŠ}‹-˜RŠ}‹=Š¢rÃC#"“°¢F67W&7“Ö—76WB‚F%²v67W&7’uÒ“öÖ‚ƒÂ†fÆöB’F%²v67W&7’uÒ“¦çVÆÃ°¢FÖ„67W&7“ÖÖ‚ƒ#Â†–çB•÷c“÷6WGF–ær‚wf—6—EöÖ…öÆö6F–öåö67W&7•öÒrÃ#’“°¢–b‚F67W&7’ÓÖçVÆÂbbF67W&7“âFÖ„67W&7’’‡GG£¦W'&÷"‚}Šý˜-Š¢˜]˜˜-‹¸ÍŠ¢Š‹Š}¸Â›íŠ}¸ÍŠ}˜bŠŠ}‹-Šý¸ÍŠòªŠ}˜¸Â˜m¸Í‹=Š¢â¨m˜mŠò˜MŠÝ‹˜rŠý‹˜‹mŠ}¸ÂŠŠ}‹"˜]˜mŠ­‹‹Š˜]Š}˜m¸ÍŠòârÃC#"“°¢FfVæ6S×7FF–öåöE÷ö–çB‚FÆBÂFÆærÅ²†–çB’G5²vÆ–æUö–BuÕÒÆÖ‚ƒÂ†–çB•÷c“÷6WGF–ær‚wf—6—EövVõöW‡G&÷&F—W5öÒrÃsR’’“°¢–b‚FfVæ6R’‡GG£¦W'&÷"‚}Š‹Š}¸Â›íŠ}¸ÍŠ}˜bŠŠ}‹-Šý¸ÍŠòŠŠ}¸ÍŠòŠý‹˜]ŠÝŠý˜Šý˜rŠí‹r¸ÍŠrŠ}¸Í‹=Š­ªýŠ}˜rŠ-˜bŠÝ‹m˜‹ŠýŠ}‹MŠ­˜rŠŠ}‹M¸ÍŠòrÃC2“°¢G&WV—&U†÷FóÕ÷c“÷6WGF–ær‚wf—6—E÷&WV—&Uöf–æ—6…÷†÷FòrÂwG'VRr“ÓÓÒwG'VRs°¢G&WV—&U&W÷'CÕ÷c“÷6WGF–ær‚wf—6—E÷&WV—&UöVæE÷&W÷'BrÂwG'VRr“ÓÓÒwG'VRs°¢G&W÷'C×G&–Ò‚‡7G&–ær’‚F%²w&W÷'E÷FW‡BuÓóòrr’“°¢–b‚G&WV—&U†÷FòbbV×G’‚F%²w†÷FõöFFuÒ’’‡GG£¦W'&÷"‚}Š­‹]˜¸Í‹˜]‹=Š­˜-¸Í˜R›íŠ}¸ÍŠ}˜bŠŠ}‹-Šý¸ÍŠòŠ}˜M‹-Š}˜]¸ÂŠ}‹=Š¢rÃC#"“°¢–b‚G&WV—&U&W÷'BbbG&W÷'CÓÓÒrr’‡GG£¦W'&÷"‚}ªý‹-Š}‹‹B›íŠ}¸ÍŠ}˜bŠŠ}‹-Šý¸ÍŠòŠ}˜M‹-Š}˜]¸ÂŠ}‹=Š¢rÃC#"“°¢G†÷FõFƒÒV×G’‚F%²w†÷FõöFFuÒ“õ÷c#u÷6fU÷f—6—E÷†÷Fò‚F%²w†÷FõöFFuÒÂvÖ—76–öå÷f—6—G2öf–æ—6‚r“¦çVÆÃ°¢Ff–æ—6„CÖFFR‚u’ÖÒÖBƒ¦“§2r“°¢G6æÕ÷cƒ5öÆ–æU÷6æ6†÷B‚†–çB’G5²vÆ–æUö–BuÒ“°¢F6†V6¶VCÕ÷c#uöÆ–æUö6†V6¶VEö6÷VçB‚†–çB’G5²vÆ–æUö–BuÒÂ†–çB’GU²v–BuÒÂG5²w7F'FVEöBuÒÂFf–æ—6„B“°¢F÷3Õ÷c#uöÆ–æU÷W6W%ö6÷VçG2‚†–çB’G5²vÆ–æUö–BuÒÂ†–çB’GU²v–BuÒÂG5²w7F'FVEöBuÒÂFf–æ—6„B“°¢FFVãÖÖ‚ƒÂ†–çB’‚G6æ²v7W'&VçE÷&W6VçEö6÷VçBuÓó¢G6æ²wF÷FÅöÆ–æU÷fV†–6ÆW2uÒ’“°¢F6†V6¶VE7CÕ÷c“÷7B‚F6†V6¶VBÂFFVâ“°¢FGW&F–öãÖÖ‚ƒÂ‡7G'F÷F–ÖR‚Ff–æ—6„B’×7G'F÷F–ÖR‚G5²w7F'FVEöBuÒ’’óc“°¢FÖ–äGW&F–öãÖÖ‚ƒÂ†fÆöB•÷c“÷6WGF–ær‚wf—6—EöÖ–åöGW&F–öåöÖ–çWFW2rÃ’“°¢FÖ–ä6†V6¶VCÖÖ‚ƒÂ†fÆöB•÷c“÷6WGF–ær‚wf—6—EöÖ–åö6†V6¶VE÷W&6VçBrÃR’“°¢F7GVÃÖÖ‚ƒÂ†–çB’‚F%²v7GVÅ÷&W6VçEö6÷VçBuÓóó’“°¢F6†V6·3Õ²vvVòsÓçG'VRÂv67W&7’sÓâF67W&7“ÓÓÖçVÆÇÇÂF67W&7“ÃÒFÖ„67W&7’ÂvGW&F–öâsÓâFGW&F–öããÒFÖ–äGW&F–öâÂv6†V6¶VBsÓâF6†V6¶VE7CãÒFÖ–ä6†V6¶VBÂw†÷FòsÓâG&WV—&U†÷F÷ÇÂG†÷FõF‚Âw&W÷'BsÓâG&WV—&U&W÷'GÇÂG&W÷'BÓÒruÓ°¢G73Ö6÷VçB†'&•öf–ÇFW"‚F6†V6·2’“²GfÆ–FF–öã×&÷VæB‚G72öÖ‚ƒÆ6÷VçB‚F6†V6·2’’£’ó²GfÆ–FFVCÒG73ÓÓÖ6÷VçB‚F6†V6·2“°¢FFWF–Ç3Õ²v6†V6·2sÓâF6†V6·2ÂvGW&F–öåöÖ–çWFW2sÓç&÷VæB‚FGW&F–öâÃ’Âv6†V6¶VE÷W&6VçBsÓâF6†V6¶VE7BÂvÖ–æ–×V×2sÓå²vGW&F–öåöÖ–çWFW2sÓâFÖ–äGW&F–öâÂv6†V6¶VE÷W&6VçBsÓâFÖ–ä6†V6¶VBÂvÖ…ö67W&7•öÒsÓâFÖ„67W&7•ÒÂvvVöfVæ6RsÓâFfVæ6U²væÖRuÓóöçVÆÅÓ°¢F#£§'Vâ‚%UDDRÖ—76–öå÷f—6—E÷6W76–öç24UBf–æ—6†VEöCÓòÆf–æ—6…öÆCÓòÆf–æ—6…öÆæsÓòÆf–æ—6…÷†÷Fõ÷FƒÓòÆf–æ—6…ö67W&7“ÓòÆf–æ—6…÷&÷f–FW#ÓòÇ&W÷'E÷FW‡CÓòÆ7GVÅ÷&W6VçEö6÷VçCÓòÆ6†V6¶VEö6÷VçCÓòÆGFVæFæ6Uö6÷VçCÓòÆæ÷F–6Uö6÷VçCÓòÆ6÷fW&vU÷W&6VçCÓòÇ7FGW3Òw7V&Ö—GFVBrÇfÆ–FFVCÓòÇfÆ–FF–öå÷W&6VçCÓòÇfÆ–FF–öåöFWF–Ç3ÓòÇWFFVEöCÔäõr‚’t„U$R–CÓò"À¢²Ff–æ—6„BÂFÆBÂFÆærÂG†÷FõF‚ÂF67W&7’Ç7V'7G"‚‡7G&–ær’‚F%²w&÷f–FW"uÓóòrr’ÃÃ3“ó¦çVÆÂÂG&W÷'BÂF7GVÂÂF6†V6¶VBÂF÷5²vGFVæFæ6Uö6÷VçBuÒÂF÷5²væ÷F–6Uö6÷VçBuÒÂF6†V6¶VE7BÂGfÆ–FFVCó£ÂGfÆ–FF–öâÆ§6öåöVæ6öFR‚FFWF–Ç2Ä¥4ôåõTäU44TEõTä”4ôDR’ÂG6–EÒ“°¢F#£§'Vâ‚$”å4U%B”åDòÖ—76–öå÷F–ÖVÆ–æUöWfVçG2‡W6W%ö–BÆÆ–æUö–BÇf—6—E÷6W76–öåö–BÆWfVçE÷G—RÇF—FÆRÆFWF–Ç2ÆÆBÆÆær’dÅTU2ƒòÃòÃòÂwf—6—Eöf–æ—6†VBrÂ}›íŠ}¸ÍŠ}˜bŠŠ}‹-Šý¸ÍŠòŠí‹rrÃòÃòÃò’"À¢²†–çB’GU²v–BuÒÂ†–çB’G5²vÆ–æUö–BuÒÂG6–BÆ§6öåöVæ6öFR…²wfÆ–FFVBsÓâGfÆ–FFVBÂwfÆ–FF–öå÷W&6VçBsÓâGfÆ–FF–öâÂvGW&F–öåöÖ–çWFW2sÓç&÷VæB‚FGW&F–öâÃ’Âv6†V6¶VEö6÷VçBsÓâF6†V6¶VBÂvGFVæFæ6Uö6÷VçBsÓâF÷5²vGFVæFæ6Uö6÷VçBuÒÂvæ÷F–6Uö6÷VçBsÓâF÷5²væ÷F–6Uö6÷VçBuÒÂv7GVÅ÷&W6VçEö6÷VçBsÓâF7GVÅÒÄ¥4ôåõTäU44TEõTä”4ôDR’ÂFÆBÂFÆæuÒ“°¢&WGW&â²vö²sÓçG'VRÂwfÆ–FFVBsÓâGfÆ–FFVBÂwfÆ–FF–öå÷W&6VçBsÓâGfÆ–FF–öâÂwfÆ–FF–öåöFWF–Ç2sÓâFFWF–Ç2Âw6æ6†÷BsÓâG6æµ²v6†V6¶VEö6÷VçBsÓâF6†V6¶VBÂvGFVæFæ6Uö6÷VçBsÓâF÷5²vGFVæFæ6Uö6÷VçBuÒÂvæ÷F–6Uö6÷VçBsÓâF÷5²væ÷F–6Uö6÷VçBuÒÂv6÷fW&vU÷W&6VçBsÓâF6†V6¶VE7EÒÂvF–ffW&Væ6RsÓâF7GVÂÒ†–çB’G6æ²v7W'&VçE÷&W6VçEö6÷VçBuÕÓ°§Ò“° §&÷WFR‚ttUBrÂrö’öÖ—76–öâ×f—6—G2÷¶–GÒrÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c#u÷f—6—E÷66†VÖ‚“°¢G&÷sÔF#£¦öæR‚%4TÄT5B2â¢ÆÂæ6öFRÆ–æUö6öFRÆÂæ÷&–v–âÆÂæFW7F–æF–öâe$ôÒÖ—76–öå÷f—6—E÷6W76–öç22¤ô”âÆ–æW6ÂôâÂæ–C×2æÆ–æUö–Bt„U$R2æ–CÓòäB2çW6W%ö–CÓò"Å²†–çB’G²v–BuÒÂ†–çB’GU²v–BuÕÒ“°¢–b‚G&÷r’‡GG£¦W'&÷"‚}ŠŠ}‹-Šý¸ÍŠò¸ÍŠ}˜Š¢˜m‹MŠòrÃCB“°¢–b‚V×G’‚G&÷u²wfÆ–FF–öåöFWF–Ç2uÒ’bb—5÷7G&–ær‚G&÷u²wfÆ–FF–öåöFWF–Ç2uÒ’’G&÷u²wfÆ–FF–öåöFWF–Ç2uÓÖ§6öåöFV6öFR‚G&÷u²wfÆ–FF–öåöFWF–Ç2uÒÇG'VR“ó¥µÓ°¢&WGW&â²v—FVÒsÓâG&÷uÓ°§Ò“° §&÷WFR‚ttUBrÂrö’ö×’÷7V&÷&F–æFW2öF–Ç’rÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“öÖ—76–öå÷F&ÆW2‚“°¢G7V$–G2Ò÷c“÷7V&÷&F–æFUö–G2‚†–çB’GU²v–BuÒ“°¢–b‚G7V$–G2’²&WGW&â²v—FV×2sÓåµÕÓ²Ð¢GÒ–×ÆöFR‚rÂrÂ'&•öf–ÆÂƒÂ6÷VçB‚G7V$–G2’Âsòr’“°¢G&÷w2ÒF#£¦ÆÂ‚%4TÄT5B2æ–BÂ4ôä4B‡2æf—'7EöæÖRÂrrÇ2æÆ7EöæÖR’æÖRÂ"çF—FÆR&öÆU÷F—FÆRÀ¢4ôÄU44R†ÒçvV–v‡FVEö6†–WfVÖVçBÃ’vV–v‡FVEö6†–WfVÖVçBÀ¢4ôÄU44R†Òçf—6—FVEöÆ–æW5ö6÷VçBÃ’f—6—FVEöÆ–æW5ö6÷VçBÀ¢4ôÄU44R†ÒçfÆ–FFVEöÆ–æW5ö6÷VçBÃ’fÆ–FFVEöÆ–æW5ö6÷VçBÀ¢'bçF÷FÅ÷66÷&R&Wf–Wu÷66÷&P¢e$ôÒW6W'22ÄTeB¤ô”â&öÆW2"ôâ"æ–C×2ç&öÆUö–@¢ÄTeB¤ô”âÖ—76–öåöF–Ç•÷&öw&W72ÒôâÒçW6W%ö–C×2æ–BäBÒç&öw&W75öFFSÔ5U$DDR‚¢ÄTeB¤ô”â7V&÷&F–æFUöF–Ç•÷&Wf–Ww2'bôâ'bç7V&¦V7E÷W6W%ö–C×2æ–BäB'bç&Wf–WvW%ö–CÓòäB'bç&Wf–WuöFFSÔ5U$DDR‚¢t„U$R2æ–B”â‚G¢õ$DU"%’"æÆWfVÂDU42Â2æÆ7EöæÖR"Â'&•öÖW&vR…²†–çB’GU²v–BuÕÒÂG7V$–G2’“°¢&WGW&â²v—FV×2sÓâG&÷w5Ó°§Ò“° §&÷WFR‚ttUBrÂrö’öFÖ–âöÖ—76–öâÖF–Ç’×W&f÷&Öæ6RrÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“öÖ—76–öå÷F&ÆW2‚“°¢FFFRÒ÷c“öæ÷&ÕöFFR‚EôtUE²vFFRuÒóòçVÆÂÂFFR‚u’ÖÒÖBr’“°¢&WGW&â²v—FV×2sÓäF#£¦ÆÂ‚%4TÄT5BÒâ¢Ä4ôä4B‡W2æf—'7EöæÖRÂrrÇW2æÆ7EöæÖR’W6W%öæÖRÇ"çF—FÆR&öÆU÷F—FÆP¢e$ôÒÖ—76–öåöF–Ç•÷&öw&W72Ò¤ô”âW6W'2W2ôâW2æ–CÖÒçW6W%ö–BÄTeB¤ô”â&öÆW2"ôâ"æ–C×W2ç&öÆUö–@¢t„U$RÒç&öw&W75öFFSÓòõ$DU"%’ÒçvV–v‡FVEö6†–WfVÖVçBDU42ÇW2æÆ7EöæÖR"Å²FFFUÒ•Ó°§ÒÆfÇ6RÄDÔ”â“° §&÷WFR‚ttUBrÂrö’öFÖ–âöÖ—76–öâ×f—6—B×&W÷'BrÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“öÖ—76–öå÷F&ÆW2‚“°¢Fg&öÒÒ÷c“öæ÷&ÕöFFR‚EôtUE²vg&öÒuÒóòçVÆÂÂFFR‚u’ÖÒÓr’“²GFòÒ÷c“öæ÷&ÕöFFR‚EôtUE²wFòuÒóòçVÆÂÂFFR‚u’ÖÒÖBr’“°¢&WGW&â²v—FV×2sÓäF#£¦ÆÂ‚%4TÄT5Bbâ¢Ä4ôä4B‡W2æf—'7EöæÖRÂrrÇW2æÆ7EöæÖR’W6W%öæÖRÇ"çF—FÆR&öÆU÷F—FÆRÆÂæ6öFRÆ–æUö6öFRÆÂæ÷&–v–âÆÂæFW7F–æF–öâÀ¢D”ÔU5DÕD”db„Ô”åUDRÇbç7F'FVEöBÇbæf–æ—6†VEöB’GW&F–öåöÖ–çWFW0¢e$ôÒÖ—76–öå÷f—6—E÷6W76–öç2b¤ô”âW6W'2W2ôâW2æ–C×bçW6W%ö–BÄTeB¤ô”â&öÆW2"ôâ"æ–C×W2ç&öÆUö–B¤ô”âÆ–æW6ÂôâÂæ–C×bæÆ–æUö–@¢t„U$RDDR‡bç7F'FVEöB’$UEtTTâòäBòõ$DU"%’bç7F'FVEöBDU42"Å²Fg&öÒÂGFõÒ•Ó°§ÒÆfÇ6RÄDÔ”â“° §&÷WFR‚ttUBrÂrö’öFÖ–âöÖ—76–öâÖW†V7WF–öâ×6WGF–æw2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“öÖ—76–öå÷F&ÆW2‚“°¢&WGW&â²v—FV×2sÓäF#£¦ÆÂ‚%4TÄT5B¢e$ôÒÖ—76–öåöW†V7WF–öå÷6WGF–æw2õ$DU"%’6WGF–æuö¶W’"•Ó°§ÒÆfÇ6RÄDÔ”â“°§&÷WFR‚uUBrÂrö’öFÖ–âöÖ—76–öâÖW†V7WF–öâ×6WGF–æw2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“öÖ—76–öå÷F&ÆW2‚“°¢F—FV×2Ò—5ö'&’‚F%²v—FV×2uÒóòçVÆÂ’òF%²v—FV×2uÒ¢µÓ°¢f÷&V6‚‚F—FV×22G‚’°¢F#£§'Vâ‚$”å4U%B”åDòÖ—76–öåöW†V7WF–öå÷6WGF–æw2‡6WGF–æuö¶W’Ç6WGF–æu÷fÇVRÇWFFVEö'’’dÅTU2ƒòÃòÃò¢ôâEUÄ”4DR´U’UDDR6WGF–æu÷fÇVSÕdÅTU2‡6WGF–æu÷fÇVR’ÇWFFVEö'“ÕdÅTU2‡WFFVEö'’’"À¢²‡7G&–ær’‚G…²w6WGF–æuö¶W’uÒóòrr’Â‡7G&–ær’‚G…²w6WGF–æu÷fÇVRuÒóòrr’Â†–çB’GU²v–BuÕÒ“°¢Ð¢&WGW&â²vö²sÓçG'VUÓ°§ÒÆfÇ6RÄDÔ”â“° §&÷WFR‚ttUBrÂrö’öFÖ–âöÖ—76–öâÖÖWG&–72rÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“öÖ—76–öå÷F&ÆW2‚“°¢&WGW&âF#£¦ÆÂ‚%4TÄT5B¢e$ôÒÖ—76–öåöÖWG&–5ö6FÆört„U$R—5ö7F—fSÓõ$DU"%’6÷'Eö÷&FW""“°§ÒÆfÇ6RÄDÔ”â“° §&÷WFR‚ttUBrÂrö’öFÖ–âöÖ—76–öâ×FV×ÆFW2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“öÖ—76–öå÷F&ÆW2‚“°¢GGÇ2ÒF#£¦ÆÂ‚%4TÄT5B¢e$ôÒÖ—76–öå÷FV×ÆFW2õ$DU"%’&öÆUö¶W’ÇW&–öBÇWFFVEöBDU42"“°¢f÷&V6‚‚GGÇ22bGB’°¢GE²wF&vWG2uÒÒF#£¦ÆÂ‚%4TÄT5B×GBæÖWG&–5ö¶W’Æ×GBçF&vWE÷W&6VçBÆ×GBçvV–v‡BÆ×GBæ—5÷&WV—&VBÆ×GBæÖ–æ–×VÕö6÷Vç@¢e$ôÒÖ—76–öå÷FV×ÆFU÷F&vWG2×GB¤ô”âÖ—76–öåöÖWG&–5ö6FÆör2ôâ2æÖWG&–5ö¶W“Ö×GBæÖWG&–5ö¶W¢t„U$R×GBçFV×ÆFUö–CÓòõ$DU"%’2ç6÷'Eö÷&FW""Å²GE²v–BuÕÒ“°¢Ð¢&WGW&âGGÇ3°§ÒÆfÇ6RÄDÔ”â“°§&÷WFR‚uõ5BrÂrö’öFÖ–âöÖ—76–öâ×FV×ÆFW2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“öÖ—76–öå÷F&ÆW2‚“°¢GF—FÆRÒG&–Ò‚‡7G&–ær’‚F%²wF—FÆRuÒóòrr’“²–b†Ö%÷7G&ÆVâ‚GF—FÆR“Ã"’‡GG£¦W'&÷"‚}‹˜m˜Š}˜bŠ}˜Mªý˜‚Š}˜M‹-Š}˜]¸ÂŠ}‹=Š¢rÃC“°¢G&öÆT¶W’Ò‡7G&–ær’‚F%²w&öÆUö¶W’uÒóòrr“°¢–b‚–åö'&’‚G&öÆT¶W’Å²vÆ–æU÷7WW'f—6÷"rÂvÖ÷F÷%÷G&öÂrÂwfV†–6ÆU÷G&öÂrÂw&W6–FVçEö–ç7V7F÷"rÂv6†–Veö–ç7V7F÷"uÒÇG'VR’’‡GG£¦W'&÷"‚}‹=˜]Š¢˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÃC“°¢GW&–öBÒ–åö'&’‚F%²wW&–öBuÒóòvF–Ç’rÅ²vF–Ç’rÂwvVV¶Ç’rÂvÖöçF†Ç’uÒÇG'VR’òF%²wW&–öBuÒ¢vF–Ç’s°¢GF&vWG2Ò—5ö'&’‚F%²wF&vWG2uÒóòçVÆÂ’òF%²wF&vWG2uÒ¢µÓ°¢–b‚GF&vWG2’‡GG£¦W'&÷"‚}ŠÝŠýŠ}˜-˜B¸Íª’˜}Šý˜ŠŠ}¸ÍŠòŠ­‹‹¸Í˜‹M˜ŠòrÃC“°¢F#£§Fò‚’Óæ&Vv–åG&ç67F–öâ‚“°¢G'’°¢GF–BÒF#£¦–ç6W'B‚$”å4U%B”åDòÖ—76–öå÷FV×ÆFW2‡F—FÆRÇ&öÆUö¶W’ÇW&–öBÇ¦öæUö–BÆ—5öFVfVÇBÆ—5ö7F—fRÆVffV7F—fUög&öÒÆVffV7F—fU÷FòÆ7&VFVEö'’’dÅTU2ƒòÃòÃòÃòÃòÃòÃòÃòÃò’"À¢²GF—FÆRÂG&öÆT¶W’ÂGW&–öBÂF%²w¦öæUö–BuÒóòçVÆÂÂV×G’‚F%²v—5öFVfVÇBuÒ“ó£Â'&•ö¶W•öW†—7G2‚v—5ö7F—fRrÂF"“ò‚V×G’‚F%²v—5ö7F—fRuÒ“ó£“£À¢F%²vVffV7F—fUög&öÒuÒóòçVÆÂÂF%²vVffV7F—fU÷FòuÒóòçVÆÂÂ†–çB’GU²v–BuÕÒ“°¢f÷&V6‚‚GF&vWG22GB’°¢F#£§'Vâ‚$”å4U%B”åDòÖ—76–öå÷FV×ÆFU÷F&vWG2‡FV×ÆFUö–BÆÖWG&–5ö¶W’ÇF&vWE÷W&6VçBÇvV–v‡BÆ—5÷&WV—&VBÆÖ–æ–×VÕö6÷VçB’dÅTU2ƒòÃòÃòÃòÃòÃò’"À¢²GF–BÂ‡7G&–ær’GE²vÖWG&–5ö¶W’uÒÂ†fÆöB’GE²wF&vWE÷W&6VçBuÒÂ†fÆöB’‚GE²wvV–v‡BuÒóò’ÂV×G’‚GE²v—5÷&WV—&VBuÒ“ó£ÂGE²vÖ–æ–×VÕö6÷VçBuÒóòçVÆÅÒ“°¢Ð¢F#£§Fò‚’Óæ6öÖÖ—B‚“°¢Ò6F6‚…F‡&÷v&ÆRFR’²–b„F#£§Fò‚’Óæ–åG&ç67F–öâ‚’’F#£§Fò‚’Óç&öÆÄ&6²‚“²F‡&÷rFS²Ð¢‡GG£¦§6öâ…²v–BsÓâGF–EÒÃ#“°§ÒÆfÇ6RÄDÔ”â“°§&÷WFR‚tDTÄUDRrÂrö’öFÖ–âöÖ—76–öâ×FV×ÆFW2÷¶–GÒrÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“öÖ—76–öå÷F&ÆW2‚“°¢F#£§'Vâ‚$DTÄUDRe$ôÒÖ—76–öå÷FV×ÆFW2t„U$R–CÓò"Â²†–çB’G²v–BuÕÒ“°¢&WGW&â²vö²sÓçG'VUÓ°§ÒÆfÇ6RÄDÔ”â“° §&÷WFR‚ttUBrÂrö’öFÖ–â÷W6W"ÖÖ—76–öâÖ÷fW'&–FW2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“öÖ—76–öå÷F&ÆW2‚“°¢Gv†W&SÒsÓs²F&w3ÕµÓ°¢–b‚V×G’‚EôtUE²wW6W%ö–BuÒ’’²Gv†W&SÒvòçW6W%ö–CÓòs²F&w3Õ²†–çB’EôtUE²wW6W%ö–BuÕÓ²Ð¢G&÷w2ÒF#£¦ÆÂ‚%4TÄT5Bòâ¢Ä4ôä4B‡W2æf—'7EöæÖRÂrrÇW2æÆ7EöæÖR’W6W%öæÖRe$ôÒW6W%öÖ—76–öåö÷fW'&–FW2ð¢¤ô”âW6W'2W2ôâW2æ–CÖòçW6W%ö–Bt„U$RGv†W&Rõ$DU"%’òçWFFVEöBDU42"ÂF&w2“°¢f÷&V6‚‚G&÷w22bG"’°¢G%²wF&vWG2uÒÒF#£¦ÆÂ‚%4TÄT5BÖWG&–5ö¶W’ÇF&vWE÷W&6VçBÇvV–v‡BÆ—5÷&WV—&VBÆÖ–æ–×VÕö6÷VçBe$ôÒW6W%öÖ—76–öåö÷fW'&–FU÷F&vWG2t„U$R÷fW'&–FUö–CÓò"Å²G%²v–BuÕÒ“°¢Ð¢&WGW&âG&÷w3°§ÒÆfÇ6RÄDÔ”â“°§&÷WFR‚uUBrÂrö’öFÖ–â÷W6W"ÖÖ—76–öâÖ÷fW'&–FW2÷·W6W%ö–GÒrÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“öÖ—76–öå÷F&ÆW2‚“°¢GW&–öBÒ–åö'&’‚F%²wW&–öBuÒóòvF–Ç’rÅ²vF–Ç’rÂwvVV¶Ç’rÂvÖöçF†Ç’uÒÇG'VR’òF%²wW&–öBuÒ¢vF–Ç’s°¢GF&vWG2Ò—5ö'&’‚F%²wF&vWG2uÒóòçVÆÂ’òF%²wF&vWG2uÒ¢µÓ°¢–b‚GF&vWG2’‡GG£¦W'&÷"‚}ŠÝŠýŠ}˜-˜B¸Íª’˜}Šý˜ŠŠ}¸ÍŠòŠ­‹‹¸Í˜‹M˜ŠòrÃC“°¢F#£§Fò‚’Óæ&Vv–åG&ç67F–öâ‚“°¢G'’°¢F#£§'Vâ‚$”å4U%B”åDòW6W%öÖ—76–öåö÷fW'&–FW2‡W6W%ö–BÇW&–öBÇF—FÆRÆ—5ö7F—fRÆVffV7F—fUög&öÒÆVffV7F—fU÷FòÆ7&VFVEö'’’dÅTU2ƒòÃòÃòÃòÃòÃòÃò¢ôâEUÄ”4DR´U’UDDRF—FÆSÕdÅTU2‡F—FÆR’Æ—5ö7F—fSÕdÅTU2†—5ö7F—fR’ÆVffV7F—fUög&öÓÕdÅTU2†VffV7F—fUög&öÒ’ÆVffV7F—fU÷FóÕdÅTU2†VffV7F—fU÷Fò’"À¢²†–çB’G²wW6W%ö–BuÒÂGW&–öBÂF%²wF—FÆRuÒóòçVÆÂÆ'&•ö¶W•öW†—7G2‚v—5ö7F—fRrÂF"“ò‚V×G’‚F%²v—5ö7F—fRuÒ“ó£“£ÂF%²vVffV7F—fUög&öÒuÒóòçVÆÂÂF%²vVffV7F—fU÷FòuÒóòçVÆÂÂ†–çB’GU²v–BuÕÒ“°¢Fö–BÒ†–çB”F#£¦öæR‚%4TÄT5B–Be$ôÒW6W%öÖ—76–öåö÷fW'&–FW2t„U$RW6W%ö–CÓòäBW&–öCÓò"Å²†–çB’G²wW6W%ö–BuÒÂGW&–öEÒ•²v–BuÓ°¢F#£§'Vâ‚$DTÄUDRe$ôÒW6W%öÖ—76–öåö÷fW'&–FU÷F&vWG2t„U$R÷fW'&–FUö–CÓò"Å²Fö–EÒ“°¢f÷&V6‚‚GF&vWG22GB’°¢F#£§'Vâ‚$”å4U%B”åDòW6W%öÖ—76–öåö÷fW'&–FU÷F&vWG2†÷fW'&–FUö–BÆÖWG&–5ö¶W’ÇF&vWE÷W&6VçBÇvV–v‡BÆ—5÷&WV—&VBÆÖ–æ–×VÕö6÷VçB’dÅTU2ƒòÃòÃòÃòÃòÃò’"À¢²Fö–BÂ‡7G&–ær’GE²vÖWG&–5ö¶W’uÒÂ†fÆöB’GE²wF&vWE÷W&6VçBuÒÂ†fÆöB’‚GE²wvV–v‡BuÒóò’ÂV×G’‚GE²v—5÷&WV—&VBuÒ“ó£ÂGE²vÖ–æ–×VÕö6÷VçBuÒóòçVÆÅÒ“°¢Ð¢F#£§Fò‚’Óæ6öÖÖ—B‚“°¢Ò6F6‚…F‡&÷v&ÆRFR’²–b„F#£§Fò‚’Óæ–åG&ç67F–öâ‚’’F#£§Fò‚’Óç&öÆÄ&6²‚“²F‡&÷rFS²Ð¢&WGW&â²vö²sÓçG'VRÂv–BsÓâFö–EÓ°§ÒÆfÇ6RÄDÔ”â“°§&÷WFR‚tDTÄUDRrÂrö’öFÖ–â÷W6W"ÖÖ—76–öâÖ÷fW'&–FW2÷·W6W%ö–GÒrÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“öÖ—76–öå÷F&ÆW2‚“°¢GW&–öBÒEôtUE²wW&–öBuÒóòvF–Ç’s°¢F#£§'Vâ‚$DTÄUDRe$ôÒW6W%öÖ—76–öåö÷fW'&–FW2t„U$RW6W%ö–CÓòäBW&–öCÓò"Â²†–çB’G²wW6W%ö–BuÒÂGW&–öEÒ“°¢&WGW&â²vö²sÓçG'VUÓ°§ÒÆfÇ6RÄDÔ”â“° ¢ò¢ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒc“S¢˜]˜Š­˜‹Š}˜]Š­¸ÍŠ}‹-Šý˜}¸Â˜Š}˜-‹¸Â˜Š}‹"»2‹˜]˜M¸ÍŠ}Š¢˜]¸ÍŠýŠ}˜m¸Â’ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒ¢ð¦gVæ7F–öâ÷c“U÷66÷&–æu÷F&ÆW2‚—°¢7FF–2FFöæSÖfÇ6S²–b‚FFöæR’&WGW&ã²FFöæS×G'VS°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E266÷&U÷'VÆW2€¢'VÆUö¶W’d$4„"ƒcB’$”Ô%’´U’ÂF—FÆRd$4„"ƒ“’äõBåTÄÂÂ&6U÷ö–çG2DT4”ÔÂƒbÃ"’äõBåTÄÂDTdTÅBÀ¢—5öæVvF—fRD”å””åBƒ’äõBåTÄÂDTdTÅBÂ—5ö7F—fRD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢WFFVEöBD”ÔU5DÕåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕôâUDDR5U%$TåEõD”ÔU5DÕ ¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B"“°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2&öÆU÷66÷&Uö6öVff–6–VçG2€¢&öÆUö¶W’d$4„"ƒC’$”Ô%’´U’Â6öVff–6–VçBDT4”ÔÂƒRÃ"’äõBåTÄÂDTdTÅB¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B"“°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2Æ–æU÷66÷&Uö6öVff–6–VçG2€¢Æ–æUö–B”åB$”Ô%’´U’Â6öVff–6–VçBDT4”ÔÂƒRÃ"’äõBåTÄÂDTdTÅBÂæ÷FRd$4„"ƒ“’åTÄÂÀ¢WFFVEöBD”ÔU5DÕåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕôâUDDR5U%$TåEõD”ÔU5DÕ ¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B"“°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2Ö—76–öå÷66÷&UöF–Ç’€¢–B”åBUDõô”ä5$TÔTåB$”Ô%’´U’ÂW6W%ö–B”åBäõBåTÄÂÂ66÷&UöFFRDDRäõBåTÄÂÂ'VÆUö¶W’d$4„"ƒcB’äõBåTÄÂÀ¢&öÆUö¶W’d$4„"ƒC’åTÄÂÂ6÷VçFDT4”ÔÂƒ‚Ã"’äõBåTÄÂDTdTÅBÂ&6U÷ö–çG2DT4”ÔÂƒbÃ"’äõBåTÄÂDTdTÅBÀ¢&öÆUö6öVff–6–VçBDT4”ÔÂƒRÃ"’äõBåTÄÂDTdTÅBÂÆ–æUö6öVff–6–VçBDT4”ÔÂƒRÃ"’äõBåTÄÂDTdTÅBÀ¢ö–çG2DT4”ÔÂƒ’Ã"’äõBåTÄÂDTdTÅBÂWFFVEöBD”ÔU5DÕåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕôâUDDR5U%$TåEõD”ÔU5DÕÀ¢Tä•TR´U’W÷W6W%öFFU÷'VÆR‡W6W%ö–BÇ66÷&UöFFRÇ'VÆUö¶W’¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B"“°¢G'’²–b‚F#£¦öæR‚%4„õr4ôÅTÔå2e$ôÒÖ—76–öå÷66÷&UöF–Ç’t„U$Rf–VÆCÒv—5öF§W7FVBr"’’F#£§'Vâ‚$ÅDU"D$ÄRÖ—76–öå÷66÷&UöF–Ç’DB4ôÅTÔâ—5öF§W7FVBD”å””åBƒ’äõBåTÄÂDTdTÅB"“²Ò6F6‚…ÅF‡&÷v&ÆRFR’²W'&÷%öÆör‚w7W&W76VBW†6WF–öã¢râFRÓævWDÖW76vR‚’“²Ð¢G'’²–b‚F#£¦öæR‚%4„õr4ôÅTÔå2e$ôÒÖ—76–öå÷66÷&UöF–Ç’t„U$Rf–VÆCÒvF§W7FÖVçE÷&V6öâr"’’F#£§'Vâ‚$ÅDU"D$ÄRÖ—76–öå÷66÷&UöF–Ç’DB4ôÅTÔâF§W7FÖVçE÷&V6öâd$4„"ƒ3’åTÄÂ"“²Ò6F6‚…ÅF‡&÷v&ÆRFR’²W'&÷%öÆör‚w7W&W76VBW†6WF–öã¢râFRÓævWDÖW76vR‚’“²Ð¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2Ö—76–öå÷66÷&UöF§W7FÖVçG2€¢–B”åBUDõô”ä5$TÔTåB$”Ô%’´U’ÂW6W%ö–B”åBäõBåTÄÂÂ66÷&UöFFRDDRäõBåTÄÂÂ'VÆUö¶W’d$4„"ƒcB’äõBåTÄÂÀ¢÷&–v–æÅ÷ö–çG2DT4”ÔÂƒ’Ã"’äõBåTÄÂÂF§W7FVE÷ö–çG2DT4”ÔÂƒ’Ã"’äõBåTÄÂÂ&V6öâd$4„"ƒ3’äõBåTÄÂÀ¢F§W7FVEö'’”åBåTÄÂÂF§W7FVEöBD”ÔU5DÕåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕ ¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B"“°¢G&3Ò†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒ66÷&U÷'VÆW2"•²vâuÓóó“°¢–b‚G&2—°¢G6VVCÕ°¢²vGFVæFæ6U÷&Vv—7G&F–öârÂ}Š½ŠŠ¢ŠÝ‹m˜‹‹Š}˜m˜mŠý˜rrÃÃÒÀ¢²v6†V6¶Æ—7E÷7V&Ö—76–öârÂ}Š­ª˜]¸Í˜B¨mªž(Í˜M¸Í‹=Š¢Ší˜Šý‹˜‚rÃÃÒÀ¢²væ÷F–6Uö—77VVBrÂ}Š½ŠŠ¢Š­‹ª‹Š‹Š}¸Â‹Š}˜m˜mŠý˜rrÃãRÃÒÀ¢²w†÷Fõ÷&W÷'BrÂ}Š½ŠŠ¢ªý‹-Š}‹‹BŠ­‹]˜¸Í‹¸ÂŠŠ}‹-Šý¸ÍŠòrÃ"ÃÒÀ¢²vÆ–æU÷f—6—E÷fÆ–FFVBrÂ}ŠŠ}‹-Šý¸ÍŠò˜]‹Š­Š‹Ší‹rrÃRÃÒÀ¢²vÖ—76–öåö6ö×ÆWFVBrÂ}Š­ª˜]¸Í˜B˜]Š=˜]˜‹¸ÍŠ¢‹˜‹-Š}˜m˜rŠ­ŠÝ˜-˜"(šR»»š¢’rÃÃÒÀ¢²vÖ—76–öåö–æ6ö×ÆWFRrÂ}˜]Š=˜]˜‹¸ÍŠ¢‹˜‹-Š}˜m˜rŠ}˜mŠÍŠ}˜R˜m‹MŠòŠ­ŠÝ˜-˜"›íŠ}¸Í¸Í˜b’rÃ‚ÃÒÀ¢²vÆ–æUöæ÷E÷f—6—FVBrÂ}Ší‹rŠ­Ší‹]¸Í‹^(Í¸ÍŠ}˜Š­˜rŠŠ}‹-Šý¸ÍŠò˜m‹MŠòrÃBÃÒÀ¢²vw5ööfbrÂ}ŠíŠ}˜]˜‹N(Íª‹Šý˜bu2Šý‹‹=Š}‹Š}Š¢ªŠ}‹¸ÂrÃRÃÒÀ¢²wgåööârÂ}‹˜‹M˜n(Íª‹Šý˜b˜¸Í˜MŠ­‹‹Mª˜b…eâ’rÃbÃÒÀ¢²v–æ6ö×ÆWFU÷&W÷'BrÂ}ŠŠ}‹-Šý¸ÍŠòŠ½ŠŠ®(Í‹MŠý˜r˜˜M¸Â˜mŠ}˜]‹Š­Š‹ªý‹-Š}‹‹B˜mŠ}˜-‹R’rÃ2ÃÒÀ¢Ó°¢f÷&V6‚‚G6VVB2G2’F#£§'Vâ‚$”å4U%B”täõ$R”åDò66÷&U÷'VÆW2‡'VÆUö¶W’ÇF—FÆRÆ&6U÷ö–çG2Æ—5öæVvF—fR’dÅTU2ƒòÃòÃòÃò’"ÂG2“°¢Ð¢G&ö3Ò†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒ&öÆU÷66÷&Uö6öVff–6–VçG2"•²vâuÓóó“°¢–b‚G&ö2—°¢f÷&V6‚…²vÆ–æU÷7WW'f—6÷"sÓãÂvÖ÷F÷%÷G&öÂsÓãÂwfV†–6ÆU÷G&öÂsÓãÂw&W6–FVçEö–ç7V7F÷"sÓãÂv6†–Veö–ç7V7F÷"sÓãã%Ò2G&³ÓâF6ò¢F#£§'Vâ‚$”å4U%B”täõ$R”åDò&öÆU÷66÷&Uö6öVff–6–VçG2‡&öÆUö¶W’Æ6öVff–6–VçB’dÅTU2ƒòÃò’"Å²G&²ÂF6õÒ“°¢Ð§Ð¦gVæ7F–öâ÷c“U÷'VÆW2‚—²÷c“U÷66÷&–æu÷F&ÆW2‚“²FÓÕµÓ²f÷&V6‚„F#£¦ÆÂ‚%4TÄT5B¢e$ôÒ66÷&U÷'VÆW2"’2G"’FÕ²G%²w'VÆUö¶W’uÕÓÒG#²&WGW&âFÓ²Ð¦gVæ7F–öâ÷c“U÷&öÆUö6öVff–6–VçB‚G&öÆT¶W’—²÷c“U÷66÷&–æu÷F&ÆW2‚“²G#ÔF#£¦öæR‚%4TÄT5B6öVff–6–VçBe$ôÒ&öÆU÷66÷&Uö6öVff–6–VçG2t„U$R&öÆUö¶W“Óò"Å²G&öÆT¶W•Ò“²&WGW&âG#ò†fÆöB’G%²v6öVff–6–VçBuÓ£ã²Ð¦gVæ7F–öâ÷c“UöÆ–æUö6öVff–6–VçEöÖ‚FÆ–æT–G2—°¢÷c“U÷66÷&–æu÷F&ÆW2‚“²–b‚FÆ–æT–G2’&WGW&âµÓ°¢GÖ–×ÆöFR‚rÂrÆ'&•öf–ÆÂƒÆ6÷VçB‚FÆ–æT–G2’Âsòr’“°¢G&÷w3ÔF#£¦ÆÂ‚%4TÄT5BÆ–æUö–BÆ6öVff–6–VçBe$ôÒÆ–æU÷66÷&Uö6öVff–6–VçG2t„U$RÆ–æUö–B”â‚G’"ÂFÆ–æT–G2“°¢FÓÕµÓ²f÷&V6‚‚G&÷w22G"’FÕ²†–çB’G%²vÆ–æUö–BuÕÓÒ†fÆöB’G%²v6öVff–6–VçBuÓ²&WGW&âFÓ°§Ð¦gVæ7F–öâ÷c“UöÇ•öF–Ç•÷66÷&–ær‚GRÂF7BÂFVfbÂGvV–v‡FVB—°¢÷c“U÷66÷&–æu÷F&ÆW2‚“°¢GV–CÒ†–çB’GU²v–BuÓ²GFöF“ÖFFR‚u’ÖÒÖBr“²G'VÆW3Õ÷c“U÷'VÆW2‚“²G&öÆT¶W“ÒFVfe²w&öÆUö¶W’uÓóòv÷F†W"s°¢G&öÆT6óÕ÷c“U÷&öÆUö6öVff–6–VçB‚G&öÆT¶W’“°¢FÆ–æT–G3ÒF7E²vÆ–æW2uÓó¥µÓ²FÆ–æT6ôÖÕ÷c“UöÆ–æUö6öVff–6–VçEöÖ‚FÆ–æT–G2“°¢FftÆ–æT6óÒFÆ–æT–G3ö'&•÷7VÒ†'&•öÖ†fâ‚FÆ–B“ÓâFÆ–æT6ôÖ²†–çB’FÆ–EÓóóãÂFÆ–æT–G2’’ö6÷VçB‚FÆ–æT–G2“£ã°¢F76–væVCÖ6÷VçB‚FÆ–æT–G2“²Gf—6—G3Ò†–çB’‚F7E²w&ruÕ²wf—6—FVEöÆ–æW2uÓóó“²GfÆ–CÒ†–çB’‚F7E²w&ruÕ²wfÆ–FFVEöÆ–æW2uÓóó“°¢Fw4öfcÒ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒW6W%ö7F—f—G’t„U$RW6W%ö–CÓòäB¶–æCÒvw5ööfbräBDDR†B“Óò"Å²GV–BÂGFöF•Ò•²vâuÓóó“°¢GgäöãÒ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒgåöWfVçG2t„U$RW6W%ö–CÓòäB7FFSÓäBDDR†7&VFVEöB“Óò"Å²GV–BÂGFöF•Ò•²vâuÓóó“°¢F6÷VçG3Õ°¢vGFVæFæ6U÷&Vv—7G&F–öâsÓâF7E²v6÷VçG2uÕ²vG&—fW%öGFVæFæ6U÷W&6VçBuÓóóÀ¢v6†V6¶Æ—7E÷7V&Ö—76–öâsÓâF7E²v6÷VçG2uÕ²wfV†–6ÆUö6†V6¶Æ—7E÷W&6VçBuÓóóÀ¢væ÷F–6Uö—77VVBsÓâF7E²w&ruÕ²væ÷F–6W2uÓóóÀ¢w†÷Fõ÷&W÷'BsÓâGf—6—G2À¢vÆ–æU÷f—6—E÷fÆ–FFVBsÓâGfÆ–BÀ¢vÖ—76–öåö6ö×ÆWFVBsÓâ‚FVfe²vÖ—76–öâuÒbbGvV–v‡FVCãÓ““ó£À¢vÖ—76–öåö–æ6ö×ÆWFRsÓâ‚FVfe²vÖ—76–öâuÒbbGvV–v‡FVCÃS“ó£À¢vÆ–æUöæ÷E÷f—6—FVBsÓæÖ‚ƒÂF76–væVBÒGf—6—G2’À¢vw5ööfbsÓâFw4öfbÀ¢wgåööâsÓâGgäöâÀ¢v–æ6ö×ÆWFU÷&W÷'BsÓæÖ‚ƒÂGf—6—G2ÒGfÆ–B’À¢Ó°¢f÷&V6‚‚F6÷VçG22G&³ÓâF6çB—°¢G'VÆSÒG'VÆW5²G&µÓóöçVÆÃ²–b‚G'VÆWÇÂ†–çB’G'VÆU²v—5ö7F—fRuÒ’6öçF–çVS°¢F&6SÒ†fÆöB’G'VÆU²v&6U÷ö–çG2uÓ²FæVsÒ†–çB’G'VÆU²v—5öæVvF—fRuÓ°¢Gö–çG3×&÷VæB‚F&6R¢G&öÆT6ò¢FftÆ–æT6ò¢†fÆöB’F6çBÃ"“²–b‚FæVr’Gö–çG3ÒÖ'2‚Gö–çG2“°¢F#£§'Vâ‚$”å4U%B”åDòÖ—76–öå÷66÷&UöF–Ç’‡W6W%ö–BÇ66÷&UöFFRÇ'VÆUö¶W’Ç&öÆUö¶W’Æ6÷VçFÆ&6U÷ö–çG2Ç&öÆUö6öVff–6–VçBÆÆ–æUö6öVff–6–VçBÇö–çG2¢dÅTU2ƒòÃòÃòÃòÃòÃòÃòÃòÃò¢ôâEUÄ”4DR´U’UDDR&öÆUö¶W“ÕdÅTU2‡&öÆUö¶W’’À¢6÷VçFÔ”b†—5öF§W7FVCÓÆ6÷VçFÅdÅTU2†6÷VçF’’À¢&6U÷ö–çG3Ô”b†—5öF§W7FVCÓÆ&6U÷ö–çG2ÅdÅTU2†&6U÷ö–çG2’’À¢&öÆUö6öVff–6–VçCÔ”b†—5öF§W7FVCÓÇ&öÆUö6öVff–6–VçBÅdÅTU2‡&öÆUö6öVff–6–VçB’’À¢Æ–æUö6öVff–6–VçCÔ”b†—5öF§W7FVCÓÆÆ–æUö6öVff–6–VçBÅdÅTU2†Æ–æUö6öVff–6–VçB’’À¢ö–çG3Ô”b†—5öF§W7FVCÓÇö–çG2ÅdÅTU2‡ö–çG2’’"À¢²GV–BÂGFöF’ÂG&²ÂG&öÆT¶W’ÂF6çBÂF&6RÂG&öÆT6òÂFftÆ–æT6òÂGö–çG5Ò“°¢Ð§Ð §&÷WFR‚ttUBrÂrö’öFÖ–â÷66÷&R×'VÆW2rÆgVæ7F–öâ‚GÂF"ÂGR—²&WGW&â²v—FV×2sÓæ'&•÷fÇVW2…÷c“U÷'VÆW2‚’•Ó²ÒÆfÇ6RÄDÔ”â“°§&÷WFR‚uUBrÂrö’öFÖ–â÷66÷&R×'VÆW2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“U÷66÷&–æu÷F&ÆW2‚“°¢f÷&V6‚‚‚F%²v—FV×2uÓóõµÒ’2F—B—°¢–b†V×G’‚F—E²w'VÆUö¶W’uÒ’’6öçF–çVS°¢F#£§'Vâ‚%UDDR66÷&U÷'VÆW24UB&6U÷ö–çG3ÓòÆ—5ö7F—fSÓòt„U$R'VÆUö¶W“Óò"À¢²†fÆöB’‚F—E²v&6U÷ö–çG2uÓóó’ÂV×G’‚F—E²v—5ö7F—fRuÒ“ó£Â‡7G&–ær’F—E²w'VÆUö¶W’uÕÒ“°¢Ð¢&WGW&â²vö²sÓçG'VUÓ°§ÒÆfÇ6RÄDÔ”â“°§&÷WFR‚ttUBrÂrö’öFÖ–â÷&öÆR×66÷&RÖ6öVff–6–VçG2rÆgVæ7F–öâ‚GÂF"ÂGR—²÷c“U÷66÷&–æu÷F&ÆW2‚“²&WGW&â²v—FV×2sÓäF#£¦ÆÂ‚%4TÄT5B¢e$ôÒ&öÆU÷66÷&Uö6öVff–6–VçG2õ$DU"%’&öÆUö¶W’"•Ó²ÒÆfÇ6RÄDÔ”â“°§&÷WFR‚uUBrÂrö’öFÖ–â÷&öÆR×66÷&RÖ6öVff–6–VçG2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“U÷66÷&–æu÷F&ÆW2‚“°¢f÷&V6‚‚‚F%²v—FV×2uÓóõµÒ’2F—B—°¢–b†V×G’‚F—E²w&öÆUö¶W’uÒ’’6öçF–çVS°¢F#£§'Vâ‚$”å4U%B”åDò&öÆU÷66÷&Uö6öVff–6–VçG2‡&öÆUö¶W’Æ6öVff–6–VçB’dÅTU2ƒòÃò’ôâEUÄ”4DR´U’UDDR6öVff–6–VçCÕdÅTU2†6öVff–6–VçB’"À¢²‡7G&–ær’F—E²w&öÆUö¶W’uÒÂ†fÆöB’‚F—E²v6öVff–6–VçBuÓóó•Ò“°¢Ð¢&WGW&â²vö²sÓçG'VUÓ°§ÒÆfÇ6RÄDÔ”â“°§&÷WFR‚ttUBrÂrö’öFÖ–âöÆ–æR×66÷&RÖ6öVff–6–VçG2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“U÷66÷&–æu÷F&ÆW2‚“°¢&WGW&â²v—FV×2sÓäF#£¦ÆÂ‚%4TÄT5BÂæ–BÆ–æUö–BÆÂæ6öFRÆÂæ÷&–v–âÆÂæFW7F–æF–öâÄ4ôÄU44R†2æ6öVff–6–VçBÃ’6öVff–6–VçBÆ2ææ÷FP¢e$ôÒÆ–æW6ÂÄTeB¤ô”âÆ–æU÷66÷&Uö6öVff–6–VçG22ôâ2æÆ–æUö–CÖÂæ–Bõ$DU"%’Âæ6öFR"•Ó°§ÒÆfÇ6RÄDÔ”â“°§&÷WFR‚uUBrÂrö’öFÖ–âöÆ–æR×66÷&RÖ6öVff–6–VçG2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“U÷66÷&–æu÷F&ÆW2‚“°¢f÷&V6‚‚‚F%²v—FV×2uÓóõµÒ’2F—B—°¢–b†V×G’‚F—E²vÆ–æUö–BuÒ’’6öçF–çVS°¢F#£§'Vâ‚$”å4U%B”åDòÆ–æU÷66÷&Uö6öVff–6–VçG2†Æ–æUö–BÆ6öVff–6–VçBÆæ÷FR’dÅTU2ƒòÃòÃò’ôâEUÄ”4DR´U’UDDR6öVff–6–VçCÕdÅTU2†6öVff–6–VçB’Ææ÷FSÕdÅTU2†æ÷FR’"À¢²†–çB’F—E²vÆ–æUö–BuÒÂ†fÆöB’‚F—E²v6öVff–6–VçBuÓóó’ÂF—E²væ÷FRuÓóöçVÆÅÒ“°¢Ð¢&WGW&â²vö²sÓçG'VUÓ°§ÒÆfÇ6RÄDÔ”â“°§&÷WFR‚ttUBrÂrö’öFÖ–â÷66÷&RÖF–Ç’rÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“U÷66÷&–æu÷F&ÆW2‚“°¢FFFSÕ÷c“öæ÷&ÕöFFR‚EôtUE²vFFRuÓóöçVÆÂÂFFR‚u’ÖÒÖBr’“°¢G&÷w3ÔF#£¦ÆÂ‚%4TÄT5B2â¢ÅE$”Ò„4ôä4B„4ôÄU44R‡W2æf—'7EöæÖRÂrr’ÂrrÄ4ôÄU44R‡W2æÆ7EöæÖRÂrr’’’W6W%öæÖRÇ"çF—FÆR&öÆU÷F—FÆP¢e$ôÒÖ—76–öå÷66÷&UöF–Ç’2¤ô”âW6W'2W2ôâW2æ–C×2çW6W%ö–BÄTeB¤ô”â&öÆW2"ôâ"æ–C×W2ç&öÆUö–Bt„U$R2ç66÷&UöFFSÓòõ$DU"%’2çW6W%ö–B"Å²FFFUÒ“°¢F'•W6W#ÕµÓ°¢f÷&V6‚‚G&÷w22G"—²GV–CÒ†–çB’G%²wW6W%ö–BuÓ°¢–b‚—76WB‚F'•W6W%²GV–EÒ’’F'•W6W%²GV–EÓÕ²wW6W%ö–BsÓâGV–BÂwW6W%öæÖRsÓâG%²wW6W%öæÖRuÒÂw&öÆU÷F—FÆRsÓâG%²w&öÆU÷F—FÆRuÒÂw&öÆUö¶W’sÓâG%²w&öÆUö¶W’uÒÂwF÷FÅ÷ö–çG2sÓãÂv—FV×2sÓåµÕÓ°¢F'•W6W%²GV–EÕ²wF÷FÅ÷ö–çG2uÒ³Ò†fÆöB’G%²wö–çG2uÓ²F'•W6W%²GV–EÕ²v—FV×2uÕµÓÒG#°¢Ð¢&WGW&â²vFFRsÓâFFFRÂv—FV×2sÓæ'&•÷fÇVW2‚F'•W6W"•Ó°§ÒÆfÇ6RÄDÔ”â“°§&÷WFR‚uõ5BrÂrö’öFÖ–â÷66÷&RÖF–Ç’öF§W7BrÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“U÷66÷&–æu÷F&ÆW2‚“°¢GV–CÒ†–çB’‚F%²wW6W%ö–BuÓóó“²FFFS×G&–Ò‚‡7G&–ær’‚F%²w66÷&UöFFRuÓóòrr’“²G&³×G&–Ò‚‡7G&–ær’‚F%²w'VÆUö¶W’uÓóòrr’“°¢FF£Ö—76WB‚F%²vF§W7FVE÷ö–çG2uÒ“ò†fÆöB’F%²vF§W7FVE÷ö–çG2uÓ¦çVÆÃ²G&V6öã×G&–Ò‚‡7G&–ær’‚F%²w&V6öâuÓóòrr’“°¢–b‚GV–GÇÂFFFWÇÂG&²’‡GG£¦W'&÷"‚}Š}‹}˜MŠ}‹Š}Š¢˜mŠ}˜-‹RŠ}‹=Š¢rÃC“°¢–b‚FF£ÓÓÖçVÆÂ’‡GG£¦W'&÷"‚}˜]˜-ŠýŠ}‹ŠÍŠý¸ÍŠòŠ}˜]Š­¸ÍŠ}‹"‹Šr˜Š}‹Šòª˜m¸ÍŠòrÃC“°¢–b‚G&V6öãÓÓÒrr’‡GG£¦W'&÷"‚}Š‹Š}¸Â˜}‹Š­‹Šý¸Í˜MˆÂŠý˜M¸Í˜BŠ­˜‹m¸ÍŠÒŠŠ}‹-Š¸Í˜m¸Â’Š}˜M‹-Š}˜]¸ÂŠ}‹=Š¢rÃC“°¢G&÷sÔF#£¦öæR‚%4TÄT5B¢e$ôÒÖ—76–öå÷66÷&UöF–Ç’t„U$RW6W%ö–CÓòäB66÷&UöFFSÓòäB'VÆUö¶W“Óò"Å²GV–BÂFFFRÂG&µÒ“°¢–b‚G&÷r’‡GG£¦W'&÷"‚}‹Šý¸Í˜Š}˜]Š­¸ÍŠ}‹"˜]˜‹Šò˜m‹‹¸ÍŠ}˜Š¢˜m‹MŠòrÃCB“°¢F÷&–v–æÃÒ†fÆöB’G&÷u²wö–çG2uÓ°¢F#£§'Vâ‚%UDDRÖ—76–öå÷66÷&UöF–Ç’4UBö–çG3ÓòÆ—5öF§W7FVCÓÆF§W7FÖVçE÷&V6öãÓòt„U$RW6W%ö–CÓòäB66÷&UöFFSÓòäB'VÆUö¶W“Óò"À¢²FF¢ÂG&V6öâÂGV–BÂFFFRÂG&µÒ“°¢F#£§'Vâ‚$”å4U%B”åDòÖ—76–öå÷66÷&UöF§W7FÖVçG2‡W6W%ö–BÇ66÷&UöFFRÇ'VÆUö¶W’Æ÷&–v–æÅ÷ö–çG2ÆF§W7FVE÷ö–çG2Ç&V6öâÆF§W7FVEö'’’dÅTU2ƒòÃòÃòÃòÃòÃòÃò’"À¢²GV–BÂFFFRÂG&²ÂF÷&–v–æÂÂFF¢ÂG&V6öâÂ†–çB’GU²v–BuÕÒ“°¢G'—²–b†6Æ75öW†—7G2‚uW6‚r’’W6ƒ£¦æ÷F–g’…²GV–EÒÂ	ù9ÒŠŠ}‹-Š¸Í˜m¸ÂŠ}˜]Š­¸ÍŠ}‹"rÀ¢-Š}˜]Š­¸ÍŠ}‹"˜]˜‹Šò*²"â‚G&÷u²w'VÆUö¶W’uÒ’â,+²Šý‹Š­Š}‹¸ÍŠâFFFRŠ}‹""ç&÷VæB‚F÷&–v–æÂÃ’â"Š˜r"ç&÷VæB‚FF¢Ã’â"Š}‹]˜MŠ}ŠÒ‹MŠòâŠý˜M¸Í˜C¢G&V6öâ"À¢²wG—RsÓâvÖ—76–öå÷66÷&UöF§W7FVBuÒ“²Ö6F6‚…ÅF‡&÷v&ÆRFR—·Ð¢&WGW&â²vö²sÓçG'VRÂv÷&–v–æÅ÷ö–çG2sÓâF÷&–v–æÂÂvF§W7FVE÷ö–çG2sÓâFF¥Ó°§ÒÆfÇ6RÄDÔ”â“°§&÷WFR‚ttUBrÂrö’öFÖ–â÷66÷&RÖF–Ç’öF§W7FÖVçG2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“U÷66÷&–æu÷F&ÆW2‚“°¢GV–CÒEôtUE²wW6W%ö–BuÓóöçVÆÃ°¢Gv†W&SÒGV–Cò%t„U$RçW6W%ö–CÓò#¢"#²F&w3ÒGV–Cõ²†–çB’GV–EÓ¥µÓ°¢&WGW&â²v—FV×2sÓäF#£¦ÆÂ‚%4TÄT5Bâ¢ÅE$”Ò„4ôä4B„4ôÄU44R‡W2æf—'7EöæÖRÂrr’ÂrrÄ4ôÄU44R‡W2æÆ7EöæÖRÂrr’’’W6W%öæÖRÀ¢E$”Ò„4ôä4B„4ôÄU44R†"æf—'7EöæÖRÂrr’ÂrrÄ4ôÄU44R†"æÆ7EöæÖRÂrr’’’F§W7FVEö'•öæÖP¢e$ôÒÖ—76–öå÷66÷&UöF§W7FÖVçG2¤ô”âW6W'2W2ôâW2æ–CÖçW6W%ö–BÄTeB¤ô”âW6W'2"ôâ"æ–CÖæF§W7FVEö'¢Gv†W&Rõ$DU"%’æF§W7FVEöBDU42Ä”Ô•B#"ÂF&w2•Ó°§ÒÆfÇ6RÄDÔ”â“°§&÷WFR‚ttUBrÂrö’ö×’÷66÷&R÷FöF’rÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“U÷66÷&–æu÷F&ÆW2‚“°¢GFöF“ÖFFR‚u’ÖÒÖBr“°¢G&÷w3ÔF#£¦ÆÂ‚%4TÄT5B'VÆUö¶W’Æ6÷VçFÇö–çG2e$ôÒÖ—76–öå÷66÷&UöF–Ç’t„U$RW6W%ö–CÓòäB66÷&UöFFSÓò"Å²†–çB’GU²v–BuÒÂGFöF•Ò“°¢GF÷FÃÖ'&•÷7VÒ†'&•ö6öÇVÖâ‚G&÷w2Âwö–çG2r’“°¢&WGW&â²vFFRsÓâGFöF’ÂwF÷FÅ÷ö–çG2sÓç&÷VæB‚GF÷FÂÃ"’Âv—FV×2sÓâG&÷w5Ó°§Ò“° ¢ò¢ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒc“c¢ŠýŠ}‹MŠ˜‹ŠòŠ}ŠíŠ­‹]Š}‹]¸Â˜}‹‹=˜]Š¢˜Š}‹"»B‹˜]˜M¸ÍŠ}Š¢˜]¸ÍŠýŠ}˜m¸Â’ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒ¢ð¦gVæ7F–öâ÷c“e÷W6W%ö'&–Vb‚GV–B—°¢GSÔF#£¦öæR‚%4TÄT5BW2æ–BÅE$”Ò„4ôä4B„4ôÄU44R‡W2æf—'7EöæÖRÂrr’ÂrrÄ4ôÄU44R‡W2æÆ7EöæÖRÂrr’’’æÖRÇW2ç&öÆUö–BÇ"çF—FÆR&öÆU÷F—FÆP¢e$ôÒW6W'2W2ÄTeB¤ô”â&öÆW2"ôâ"æ–C×W2ç&öÆUö–Bt„U$RW2æ–CÓò"Å²†–çB’GV–EÒ“°¢&WGW&âGS°§Ð¦gVæ7F–öâ÷c“eöF–Ç•÷6æ6†÷B‚GV–B—°¢GFöF“ÖFFR‚u’ÖÒÖBr“°¢GSÕ²v–BsÓâ†–çB’GV–EÓ°¢G&öÆT¶W“Õ÷c“÷&öÆUö¶W’‚GV–B“°¢FVfcÕ÷c“öVffV7F—fUöÖ—76–öâ‚GRÂvF–Ç’r“°¢F7CÕ÷c“ö7GVÅöÖWG&–72‚GR“°¢GvV–v‡E7VÓÓã²G66÷&U7VÓÓã²GF&vWG4÷WCÕµÓ°¢f÷&V6‚‚‚FVfe²wF&vWG2uÓó¥µÒ’2GB—°¢FÖ³ÒGE²vÖWG&–5ö¶W’uÓ²F7GVÃÒF7E²v6÷VçG2uÕ²FÖµÓóó²FFVãÒF7E²vFVæöÖ–æF÷'2uÕ²FÖµÓóó°¢F7GVÅW&6VçCÒ‚FÖ³ÓÓÒvVæE÷6†–gE÷&W÷'Br“ò‚F7GVÃó£“¥÷c“÷7B‚F7GVÂÂFFVâ“°¢GF&vWCÒ†fÆöB’‚GE²wF&vWE÷W&6VçBuÓóó“²F6†–WfVÖVçCÒGF&vWCãöÖ–âƒÂF7GVÅW&6VçBòGF&vWB£“£°¢GsÒ†fÆöB’‚GE²wvV–v‡BuÓóó“²GvV–v‡E7VÒ³ÒGs²G66÷&U7VÒ³ÒF6†–WfVÖVçB¢Gs°¢GF&vWG4÷WEµÓÕ²vÖWG&–5ö¶W’sÓâFÖ²ÂwF&vWE÷W&6VçBsÓâGF&vWBÂv7GVÅ÷W&6VçBsÓâF7GVÅW&6VçBÂv6†–WfVÖVçE÷W&6VçBsÓç&÷VæB‚F6†–WfVÖVçBÃ’ÂwvV–v‡BsÓâGrÂv—5÷&WV—&VBsÓâV×G’‚GE²v—5÷&WV—&VBuÒ•Ó°¢Ð¢GvV–v‡FVCÒGvV–v‡E7VÓ÷&÷VæB‚G66÷&U7VÒòGvV–v‡E7VÒ£’ó£ã°¢Gö–çG3Ò†fÆöB’„F#£¦öæR‚%4TÄT5B4ôÄU44R…5TÒ‡ö–çG2’Ã’2e$ôÒÖ—76–öå÷66÷&UöF–Ç’t„U$RW6W%ö–CÓòäB66÷&UöFFSÓò"Å²†–çB’GV–BÂGFöF•Ò•²w2uÓóó“°¢&WGW&â²wW6W%ö–BsÓâ†–çB’GV–BÂw&öÆUö¶W’sÓâG&öÆT¶W’Âv†5öÖ—76–öâsÓâFVfe²vÖ—76–öâuÒÂvÖ—76–öå÷6÷W&6RsÓâFVfe²w6÷W&6RuÒÀ¢v76–væVEöÆ–æW2sÓæ6÷VçB‚F7E²vÆ–æW2uÒ’Âwf—6—FVEöÆ–æW2sÓâ†–çB’‚F7E²w&ruÕ²wf—6—FVEöÆ–æW2uÓóó’ÂwfÆ–FFVEöÆ–æW2sÓâ†–çB’‚F7E²w&ruÕ²wfÆ–FFVEöÆ–æW2uÓóó’À¢wvV–v‡FVEö6†–WfVÖVçBsÓâGvV–v‡FVBÂwF&vWG2sÓâGF&vWG4÷WBÂw66÷&U÷FöF’sÓç&÷VæB‚Gö–çG2Ã"•Ó°§Ð§&÷WFR‚ttUBrÂrö’ö×’÷&öÆRÖF6†&ö&BrÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“öÖ—76–öå÷F&ÆW2‚“²÷c“U÷66÷&–æu÷F&ÆW2‚“°¢GV–CÒ†–çB’GU²v–BuÓ²G&öÆT¶W“Õ÷c“÷&öÆUö¶W’‚GV–B“°¢FÖSÕ÷c“e÷W6W%ö'&–Vb‚GV–B“°¢G6æÕ÷c“eöF–Ç•÷6æ6†÷B‚GV–B“°¢FfG—SÒ$¥4ôåõTåTõDR„¥4ôåôU…E$5B†FFÂrBçG—Rr’’#°¢GVç&VCÒ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒæ÷F–f–6F–öç2t„U$RW6W%ö–CÓòäB—5÷&VCÓäBFfG—R”â‚w7FF–öåöW†—BrÂw7FF–öåöVçFW"rÂwgåööârÂvw5ööfbrÂvGFVæFæ6Uö6†V6¶–ârÂvGFVæFæ6Uö6†V6¶÷WBr’"Å²GV–EÒ•²vâuÓóó“°¢F÷WCÕ²w&öÆUö¶W’sÓâG&öÆT¶W’Âw&öÆU÷F—FÆRsÓâFÖU²w&öÆU÷F—FÆRuÓóòrrÂvÖRsÓâG6æµ²væÖRsÓâFÖU²væÖRuÓóòruÒÂwVç&VEöÆW'G2sÓâGVç&VBÂw7V&÷&F–æFW2sÓæçVÆÅÓ°¢–b‚G&öÆT¶W“ÓÓÒv6†–Veö–ç7V7F÷"r—°¢G7V$–G3Õ÷c“÷7V&÷&F–æFUö–G2‚GV–B“°¢G&÷w3ÕµÓ°¢f÷&V6‚‚G7V$–G22G6–B—°¢G6³Õ÷c“÷&öÆUö¶W’‚G6–B“°¢–b‚–åö'&’‚G6²Å²vÆ–æU÷7WW'f—6÷"rÂvÖ÷F÷%÷G&öÂrÂwfV†–6ÆU÷G&öÂrÂw&W6–FVçEö–ç7V7F÷"uÒÇG'VR’’6öçF–çVS°¢F'&–VcÕ÷c“e÷W6W%ö'&–Vb‚G6–B“²G3Õ÷c“eöF–Ç•÷6æ6†÷B‚G6–B“°¢G&÷w5µÓÒG2µ²væÖRsÓâF'&–Ve²væÖRuÓóòrrÂw&öÆU÷F—FÆRsÓâF'&–Ve²w&öÆU÷F—FÆRuÓóòruÓ°¢Ð¢W6÷'B‚G&÷w2Æfâ‚FÂF"“ÓâF²wvV–v‡FVEö6†–WfVÖVçBuÓÃÓâF%²wvV–v‡FVEö6†–WfVÖVçBuÒ“°¢F÷WE²w7V&÷&F–æFW2uÓÕ²wF÷FÂsÓæ6÷VçB‚G&÷w2’ÂwvV²sÓæ'&•÷fÇVW2†'&•öf–ÇFW"‚G&÷w2Æfâ‚G"“ÓâG%²wvV–v‡FVEö6†–WfVÖVçBuÓÃS’’ÂvÆÂsÓâG&÷w5Ó°¢Ð¢&WGW&âF÷WC°§Ò“°¦gVæ7F–öâ÷c“eöf–VÆE÷W6W'5÷6æ6†÷B‚FFFR—°¢G&÷w3ÔF#£¦ÆÂ‚%4TÄT5BW2æ–BÅE$”Ò„4ôä4B„4ôÄU44R‡W2æf—'7EöæÖRÂrr’ÂrrÄ4ôÄU44R‡W2æÆ7EöæÖRÂrr’’’æÖRÇ"çF—FÆR&öÆU÷F—FÆP¢e$ôÒW6W'2W2ÄTeB¤ô”â&öÆW2"ôâ"æ–C×W2ç&öÆUö–Bt„U$RW2æ—5ö7F—fSÓäBU„•5E2…4TÄT5Be$ôÒW6W%öÆ–æW2VÂt„U$RVÂçW6W%ö–C×W2æ–B’"“°¢F÷WCÕµÓ°¢f÷&V6‚‚G&÷w22G"—°¢G'—°¢GV–CÒ†–çB’G%²v–BuÓ²G&³Õ÷c“÷&öÆUö¶W’‚GV–B“°¢–b‚–åö'&’‚G&²Å²vÆ–æU÷7WW'f—6÷"rÂvÖ÷F÷%÷G&öÂrÂwfV†–6ÆU÷G&öÂrÂw&W6–FVçEö–ç7V7F÷"rÂv6†–Veö–ç7V7F÷"uÒÇG'VR’’6öçF–çVS°¢–b‚FFFSÓÓÖFFR‚u’ÖÒÖBr’’G3Õ÷c“eöF–Ç•÷6æ6†÷B‚GV–B“°¢VÇ6R°¢G#ÔF#£¦öæR‚%4TÄT5BvV–v‡FVEö6†–WfVÖVçBe$ôÒÖ—76–öåöF–Ç•÷&öw&W72t„U$RW6W%ö–CÓòäB&öw&W75öFFSÓò"Å²GV–BÂFFFUÒ“°¢GG3Ò†fÆöB’„F#£¦öæR‚%4TÄT5B4ôÄU44R…5TÒ‡ö–çG2’Ã’2e$ôÒÖ—76–öå÷66÷&UöF–Ç’t„U$RW6W%ö–CÓòäB66÷&UöFFSÓò"Å²GV–BÂFFFUÒ•²w2uÓóó“°¢G3Õ²wvV–v‡FVEö6†–WfVÖVçBsÓâG#ò†fÆöB’G%²wvV–v‡FVEö6†–WfVÖVçBuÓ£Âw66÷&U÷FöF’sÓç&÷VæB‚GG2Ã"’Âv†5öÖ—76–öâsÓâG"Âv76–væVEöÆ–æW2sÓãÂwf—6—FVEöÆ–æW2sÓãÂwfÆ–FFVEöÆ–æW2sÓãÓ°¢Ð¢F÷WEµÓÒG2µ²wW6W%ö–BsÓâGV–BÂvæÖRsÓâG%²væÖRuÒÂw&öÆUö¶W’sÓâG&²Âw&öÆU÷F—FÆRsÓâG%²w&öÆU÷F—FÆRuÕÓ°¢Ò6F6‚…ÅF‡&÷v&ÆRFR’°¢W'&÷%öÆör‚u÷c“eöf–VÆE÷W6W'5÷6æ6†÷B6¶—VBW6W"râ‚G%²v–BuÓóòsòr’âs¢râFRÓævWDÖW76vR‚’“°¢Ð¢Ð¢&WGW&âF÷WC°§Ð¦gVæ7F–öâ÷c“e÷&öÆUöw&÷W÷7VÖÖ'’‚FFFR—°¢F'•&öÆSÕµÓ°¢f÷&V6‚…÷c“eöf–VÆE÷W6W'5÷6æ6†÷B‚FFFR’2G2—°¢G&³ÒG5²w&öÆUö¶W’uÓ°¢–b‚—76WB‚F'•&öÆU²G&µÒ’’F'•&öÆU²G&µÓÕ²w&öÆUö¶W’sÓâG&²Âv6÷VçBsÓãÂvfuö6†–WfVÖVçBsÓãÂwF÷FÅ÷66÷&RsÓãÂw7VÕö6‚sÓãÓ°¢F'•&öÆU²G&µÕ²v6÷VçBuÒ²³²F'•&öÆU²G&µÕ²w7VÕö6‚uÒ³Ò†fÆöB’G5²wvV–v‡FVEö6†–WfVÖVçBuÓ²F'•&öÆU²G&µÕ²wF÷FÅ÷66÷&RuÒ³Ò†fÆöB’G5²w66÷&U÷FöF’uÓ°¢Ð¢f÷&V6‚‚F'•&öÆR2bFr—²Fu²vfuö6†–WfVÖVçBuÓÒFu²v6÷VçBuÓ÷&÷VæB‚Fu²w7VÕö6‚uÒòFu²v6÷VçBuÒÃ“£²Vç6WB‚Fu²w7VÕö6‚uÒ“²Ð¢&WGW&â'&•÷fÇVW2‚F'•&öÆR“°§Ð§&÷WFR‚ttUBrÂrö’öFÖ–â÷&öÆRÖF6†&ö&B×7VÖÖ'’rÆgVæ7F–öâ‚GÂF"ÂGR—°¢G'’°¢÷c“öÖ—76–öå÷F&ÆW2‚“²÷c“U÷66÷&–æu÷F&ÆW2‚“°¢FFFSÕ÷c“öæ÷&ÕöFFR‚EôtUE²vFFRuÓóöçVÆÂÂFFR‚u’ÖÒÖBr’“°¢&WGW&â²vFFRsÓâFFFRÂv—FV×2sÓå÷c“e÷&öÆUöw&÷W÷7VÖÖ'’‚FFFR•Ó°¢Ò6F6‚…ÅF‡&÷v&ÆRFR’°¢W'&÷%öÆör‚w&öÆRÖF6†&ö&B×7VÖÖ'’W'&÷#¢râFRÓævWDÖW76vR‚’“°¢‡GG£¦§6öâ…²vW'&÷"sÓâ}Ší‹}Š}¸ÂŠýŠ}Ší˜M¸Â‹=‹˜‹rÂvFWF–ÂsÓâFRÓævWDÖW76vR‚’ÂvÆ–æRsÓâFRÓævWDÆ–æR‚’Âvf–ÆRsÓæ&6VæÖR‚FRÓævWDf–ÆR‚’•ÒÂS“°¢Ð§ÒÆfÇ6RÄDÔ”â“°   ¢ò¢ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒc#3¢’›íŠ}¸ÍŠýŠ}‹‹˜]˜M¸ÍŠ}Š¢˜]¸ÍŠýŠ}˜m¸ÂŠ‹Š}¸ÂŠ}›âÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒ¢ð¦gVæ7F–öâ÷c#5öV×G•öÖ—76–öå÷–ÆöB‚GRÂFW'&÷#Òrr—°¢GV–CÒ†–çB’‚GU²v–BuÓóó“²G&³Òv÷F†W"s°¢G'—²G&³Õ÷c“÷&öÆUö¶W’‚GV–B“·Ö6F6‚…ÅF‡&÷v&ÆRFR—·Ð¢&WGW&â²w6÷W&6RsÓâvæöæRrÂw&öÆUö¶W’sÓâG&²ÂvÖ—76–öâsÓæçVÆÂÂv76–væVEöÆ–æW2sÓãÂwF&vWG2sÓåµÒÀ¢v7GVÅö6÷VçG2sÓåµÒÂvFVæöÖ–æF÷'2sÓåµÒÂw7VÖÖ'’sÓå²wvV–v‡FVEö6†–WfVÖVçBsÓãÂwf—6—FVEöÆ–æW2sÓãÂwfÆ–FFVEöÆ–æW2sÓãÂw&W6VçE÷F÷FÂsÓãÒÀ¢wv&æ–ærsÓâFW'&÷#ó¦çVÆÅÓ°§Ð§&÷WFR‚ttUBrÂrö’ö÷W&F–öç2ö×’ÖÖ—76–öârÆgVæ7F–öâ‚GÂF"ÂGR—°¢G'’²&WGW&â÷c“öÖ—76–öå÷&öw&W72‚GR“²Ð¢6F6‚…ÅF‡&÷v&ÆRFR—°¢W'&÷%öÆör‚v÷W&F–öç2ö×’ÖÖ—76–öã¢râFRÓævWDÖW76vR‚’âr–ârâFRÓævWDf–ÆR‚’âs¢râFRÓævWDÆ–æR‚’“°¢‡GG£¦§6öâ…°¢vW'&÷"sÓâ}Ší‹}ŠrŠý‹˜]ŠÝŠ}‹=Š˜r˜]Š=˜]˜‹¸ÍŠ¢‹˜‹-Š}˜m˜rrÀ¢v6öFRsÓâtÔ•54”ôåô4Ä5TÄD”ôåôd”ÄTBrÀ¢vÖW76vRsÓâ}Š}‹}˜MŠ}‹Š}Š¢˜]Š=˜]˜‹¸ÍŠ¢‹˜‹-Š}˜m˜r˜-Š}Š˜B˜]ŠÝŠ}‹=Š˜r˜m¸Í‹=Š¢â˜M‹}˜Š}˜²Šý˜ŠŠ}‹˜rŠ­˜MŠ}‹Bª˜m¸ÍŠò¸ÍŠrªý‹-Š}‹‹BŠí‹}Šr‹ŠrŠ‹Š}¸Â›í‹MŠ­¸ÍŠŠ}˜m¸ÂŠ}‹‹=Š}˜Bª˜m¸ÍŠòâp¢ÒÃS“°¢Ð§Ò“°§&÷WFR‚ttUBrÂrö’ö÷W&F–öç2÷f—6—B×&öw&ÒrÆgVæ7F–öâ‚GÂF"ÂGR—°¢G'’°¢÷c#u÷f—6—E÷66†VÖ‚“°¢G&ösÕ÷c“öÖ—76–öå÷&öw&W72‚GR“°¢FÆ–æT–G3Ö'&•÷fÇVW2†'&•÷Væ—VR†'&•öÖ‚v–çGfÂrÆ'&•ö6öÇVÖâ„F#£¦ÆÂ‚%4TÄT5BÆ–æUö–Be$ôÒW6W%öÆ–æW2t„U$RW6W%ö–CÓòõ$DU"%’Æ–æUö–B"Å²†–çB’GU²v–BuÕÒ’ÂvÆ–æUö–Br’’’“°¢FÆ–æW3ÕµÓ²FW'&÷'3ÕµÓ°¢f÷&V6‚‚FÆ–æT–G22FÆ–B—°¢G'—²FÆ–æW5µÓÕ÷c“öÆ–æU÷6æ6†÷B‚FÆ–BÂGU²v–BuÒ“·Ð¢6F6‚…ÅF‡&÷v&ÆRFR—²FW'&÷'5µÓÕ²vÆ–æUö–BsÓâFÆ–BÂvÖW76vRsÓâFRÓævWDÖW76vR‚•Ó¶W'&÷%öÆör‚wf—6—B6æ6†÷BrâFÆ–Bâs¢râFRÓævWDÖW76vR‚’“·Ð¢Ð¢&WGW&â²vö²sÓçG'VRÂvÖöFRsÓâG&öu²w&öÆUö¶W’uÓóõ÷c“÷&öÆUö¶W’‚†–çB’GU²v–BuÒ’ÂvFFRsÓæFFR‚u’ÖÒÖBr’Âw7VÖÖ'’sÓâG&öu²w7VÖÖ'’uÓóõµÒÂwF&vWG2sÓâG&öu²wF&vWG2uÓóõµÒÂvÆ–æW2sÓâFÆ–æW2Âv76–væVEöÆ–æW2sÓæ6÷VçB‚FÆ–æT–G2’Âw'F–ÅöW'&÷'2sÓâFW'&÷'5Ó°¢Ò6F6‚…ÅF‡&÷v&ÆRFR—°¢W'&÷%öÆör‚v÷W&F–öç2÷f—6—B×&öw&Ó¢râFRÓævWDÖW76vR‚’âr–ârâFRÓævWDf–ÆR‚’âs¢râFRÓævWDÆ–æR‚’“°¢‡GG£¦§6öâ…²vW'&÷"sÓâ}Ší‹}ŠrŠý‹Šý‹¸ÍŠ}˜Š¢Š‹˜mŠ}˜]˜rŠŠ}‹-Šý¸ÍŠò˜‚›í˜‹M‹BŠí‹rrÂv6öFRsÓâud•4•Eõ$ôu$Õôd”ÄTBrÂvÖW76vRsÓâ}Š}‹}˜MŠ}‹Š}Š¢Š‹˜mŠ}˜]˜rŠŠ}‹-Šý¸ÍŠò˜-Š}Š˜BŠý‹¸ÍŠ}˜Š¢˜m¸Í‹=Š¢âŠÍ‹-Šm¸ÍŠ}Š¢Ší‹}ŠrŠý‹ªý‹-Š}‹‹B‹=‹˜‹Š½ŠŠ¢‹MŠòâuÒÃS“°¢Ð§Ò“°§&÷WFR‚ttUBrÂrö’ö÷W&F–öç2ö×’ÖF6†&ö&BrÆgVæ7F–öâ‚GÂF"ÂGR—°¢G'’°¢÷c“öÖ—76–öå÷F&ÆW2‚“²÷c“U÷66÷&–æu÷F&ÆW2‚“°¢GV–CÒ†–çB’GU²v–BuÓ²G&öÆT¶W“Õ÷c“÷&öÆUö¶W’‚GV–B“²FÖSÕ÷c“e÷W6W%ö'&–Vb‚GV–B“²G6æÕ÷c“eöF–Ç•÷6æ6†÷B‚GV–B“°¢GVç&VCÓ°¢G'—²GVç&VCÒ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒæ÷F–f–6F–öç2t„U$RW6W%ö–CÓòäB—5÷&VCÓäB†FFÄ”´RrW7FF–öåöW†—BRrõ"FFÄ”´RrW7FF–öåöVçFW"Rrõ"FFÄ”´RrWgåööâRrõ"FFÄ”´RrVw5ööfbRrõ"FFÄ”´RrVGFVæFæ6Uö6†V6¶–âRrõ"FFÄ”´RrVGFVæFæ6Uö6†V6¶÷WBRr’"Å²GV–EÒ•²vâuÓóó“·Ö6F6‚…ÅF‡&÷v&ÆRFR—·Ð¢F÷WCÕ²w&öÆUö¶W’sÓâG&öÆT¶W’Âw&öÆU÷F—FÆRsÓâFÖU²w&öÆU÷F—FÆRuÓóòrrÂvÖRsÓâG6æµ²væÖRsÓâFÖU²væÖRuÓóòruÒÂwVç&VEöÆW'G2sÓâGVç&VBÂw7V&÷&F–æFW2sÓæçVÆÅÓ°¢–b‚G&öÆT¶W“ÓÓÒv6†–Veö–ç7V7F÷"r—°¢G&÷w3ÕµÓ²f÷&V6‚…÷c“÷7V&÷&F–æFUö–G2‚GV–B’2G6–B—²G'—²G6³Õ÷c“÷&öÆUö¶W’‚G6–B“¶–b‚–åö'&’‚G6²Å²vÆ–æU÷7WW'f—6÷"rÂvÖ÷F÷%÷G&öÂrÂwfV†–6ÆU÷G&öÂrÂw&W6–FVçEö–ç7V7F÷"uÒÇG'VR’–6öçF–çVS²F'&–VcÕ÷c“e÷W6W%ö'&–Vb‚G6–B“²G73Õ÷c“eöF–Ç•÷6æ6†÷B‚G6–B“²G&÷w5µÓÒG72µ²væÖRsÓâF'&–Ve²væÖRuÓóòrrÂw&öÆU÷F—FÆRsÓâF'&–Ve²w&öÆU÷F—FÆRuÓóòruÓ·Ö6F6‚…ÅF‡&÷v&ÆRFR—·ÒÐ¢W6÷'B‚G&÷w2Æfâ‚FÂF"“ÓâF²wvV–v‡FVEö6†–WfVÖVçBuÓÃÓâF%²wvV–v‡FVEö6†–WfVÖVçBuÒ“°¢F÷WE²w7V&÷&F–æFW2uÓÕ²wF÷FÂsÓæ6÷VçB‚G&÷w2’ÂwvV²sÓæ'&•÷fÇVW2†'&•öf–ÇFW"‚G&÷w2Æfâ‚G"“ÓâG%²wvV–v‡FVEö6†–WfVÖVçBuÓÃS’’ÂvÆÂsÓâG&÷w5Ó°¢Ð¢&WGW&âF÷WC°¢Ò6F6‚…ÅF‡&÷v&ÆRFR—°¢W'&÷%öÆör‚v÷W&F–öç2ö×’ÖF6†&ö&C¢râFRÓævWDÖW76vR‚’“°¢F'&–VcÕµÓ²G'—²F'&–VcÕ÷c“e÷W6W%ö'&–Vb‚†–çB’GU²v–BuÒ“ó¥µÓ·Ö6F6‚…ÅF‡&÷v&ÆRG‚—·Ð¢&WGW&â²w&öÆUö¶W’sÓâv÷F†W"rÂw&öÆU÷F—FÆRsÓâF'&–Ve²w&öÆU÷F—FÆRuÓóòrrÂvÖRsÓå²væÖRsÓâF'&–Ve²væÖRuÓóòrrÂwvV–v‡FVEö6†–WfVÖVçBsÓãÂw66÷&U÷FöF’sÓãÂv76–væVEöÆ–æW2sÓãÂwf—6—FVEöÆ–æW2sÓãÂwfÆ–FFVEöÆ–æW2sÓãÒÂwVç&VEöÆW'G2sÓãÂw7V&÷&F–æFW2sÓæçVÆÂÂwv&æ–ærsÓâ}Š}‹}˜MŠ}‹Š}Š¢ŠýŠ}‹MŠ˜‹Šò˜}˜m˜‹"Šý‹‹=‹˜‹Š-˜]Š}Šý˜r˜m‹MŠý˜rŠ}‹=Š¢âuÓ°¢Ð§Ò“° ¢ò¢ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒc“s¢‹Š­Š˜~(ÍŠ˜mŠý¸Â˜‚˜m‹MŠ}˜n(Í˜}Šr˜Š}‹"»R‹˜]˜M¸ÍŠ}Š¢˜]¸ÍŠýŠ}˜m¸Â’ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒ¢ð¦gVæ7F–öâ÷c“uö&FvU÷F&ÆW2‚—°¢7FF–2FFöæSÖfÇ6S²–b‚FFöæR’&WGW&ã²FFöæS×G'VS°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2Ö—76–öåö&FvW2€¢–B”åBUDõô”ä5$TÔTåB$”Ô%’´U’ÂW6W%ö–B”åBäõBåTÄÂÂ&FvUö¶W’d$4„"ƒ3"’äõBåTÄÂÀ¢W&–öE÷G—Rd$4„"ƒ’äõBåTÄÂÂW&–öEö¶W’d$4„"ƒ#’äõBåTÄÂÂ&æ¶”åBåTÄÂÂö–çG2DT4”ÔÂƒ’Ã"’äõBåTÄÂDTdTÅBÀ¢v&FVEöBD”ÔU5DÕåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÀ¢Tä•TR´U’Wö&FvR‡W6W%ö–BÆ&FvUö¶W’ÇW&–öE÷G—RÇW&–öEö¶W’¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B"“°§Ð¦6öç7BÔ•54”ôåôd”TÄEõ$ôÄU2Ò²vÆ–æU÷7WW'f—6÷"rÂvÖ÷F÷%÷G&öÂrÂwfV†–6ÆU÷G&öÂrÂw&W6–FVçEö–ç7V7F÷"rÂv6†–Veö–ç7V7F÷"uÓ°¦gVæ7F–öâ÷c“u÷W&–öEö&÷VæG2‚GW&–öEG—RÂF§“ÖçVÆÂÂF¦ÓÖçVÆÂÂF¦CÖçVÆÂ—°¢–b‚F§“ÓÓÖçVÆÂ—²²F§’ÂF¦ÒÂF¦EÓÖw&Vv÷&–å÷Fõö¦ÆÆ’‚†–çB–FFR‚u’r’Â†–çB–FFR‚vâr’Â†–çB–FFR‚v¢r’“²Ð¢GFöF”£×7&–çFb‚rSFBÒS&BÒS&BrÂF§’ÂF¦ÒÂF¦B“°¢–b‚GW&–öEG—SÓÓÒvF–Ç’r—°¢²Fw’ÂFvÒÂFvEÓÖ¦ÆÆ•÷Fõöw&Vv÷&–â‚F§’ÂF¦ÒÂF¦B“°¢&WGW&â·7&–çFb‚rSFBÒS&BÒS&BrÂFw’ÂFvÒÂFvB’Ç7&–çFb‚rSFBÒS&BÒS&BrÂFw’ÂFvÒÂFvB’ÂGFöF”¥Ó°¢Ð¢–b‚GW&–öEG—SÓÓÒwvVV¶Ç’r—°¢GvCÕ6†–gD6Æ3£¦§vVV¶F’‚GFöF”¢“²òòÝ‹M˜mŠ˜râãcÝŠÍ˜]‹˜p¢G7F'CÕ6†–gD6Æ3£¦¦FFTFDF—2‚GFöF”¢ÂÒGvB“²FVæCÕ6†–gD6Æ3£¦¦FFTFDF—2‚G7F'BÃb“°¢²G7’ÂG6ÒÂG6EÓÖ'&•öÖ‚v–çGfÂrÆW‡ÆöFR‚rÒrÂG7F'B’“²²FW’ÂFVÒÂFVEÓÖ'&•öÖ‚v–çGfÂrÆW‡ÆöFR‚rÒrÂFVæB’“°¢²Fw7’ÂFw6ÒÂFw6EÓÖ¦ÆÆ•÷Fõöw&Vv÷&–â‚G7’ÂG6ÒÂG6B“²²FvW’ÂFvVÒÂFvVEÓÖ¦ÆÆ•÷Fõöw&Vv÷&–â‚FW’ÂFVÒÂFVB“°¢&WGW&â·7&–çFb‚rSFBÒS&BÒS&BrÂFw7’ÂFw6ÒÂFw6B’Ç7&–çFb‚rSFBÒS&BÒS&BrÂFvW’ÂFvVÒÂFvVB’ÂG7F'EÓ°¢Ð¢òòÖöçF†Ç¢FF—3Õ6†–gD6Æ3£¦¤ÖöçF„F—2‚F§’ÂF¦Ò“°¢²Fw7’ÂFw6ÒÂFw6EÓÖ¦ÆÆ•÷Fõöw&Vv÷&–â‚F§’ÂF¦ÒÃ“²²FvW’ÂFvVÒÂFvVEÓÖ¦ÆÆ•÷Fõöw&Vv÷&–â‚F§’ÂF¦ÒÂFF—2“°¢&WGW&â·7&–çFb‚rSFBÒS&BÒS&BrÂFw7’ÂFw6ÒÂFw6B’Ç7&–çFb‚rSFBÒS&BÒS&BrÂFvW’ÂFvVÒÂFvVB’Ç7&–çFb‚rSFBÒS&BrÂF§’ÂF¦Ò•Ó°§Ð¦gVæ7F–öâ÷c“uöÆVFW&&ö&B‚GW&–öEG—RÂF§“ÖçVÆÂÂF¦ÓÖçVÆÂÂF¦CÖçVÆÂ—°¢²G7F'BÂFVæBÂGW&–öD¶W•ÓÕ÷c“u÷W&–öEö&÷VæG2‚GW&–öEG—RÂF§’ÂF¦ÒÂF¦B“°¢G&÷w3ÔF#£¦ÆÂ‚%4TÄT5B2çW6W%ö–BÅE$”Ò„4ôä4B„4ôÄU44R‡W2æf—'7EöæÖRÂrr’ÂrrÄ4ôÄU44R‡W2æÆ7EöæÖRÂrr’’’W6W%öæÖRÇ"çF—FÆR&öÆU÷F—FÆRÀ¢5TÒ‡2çö–çG2’F÷FÅ÷ö–çG2À¢5TÒ„44Rt„Tâ2ç'VÆUö¶W“ÒvÆ–æU÷f—6—E÷fÆ–FFVBrD„Tâ2çö–çG2TÅ4RTäB’f—6—E÷ö–çG2À¢5TÒ„44Rt„Tâ7"æ—5öæVvF—fSÓD„Tâ2çö–çG2TÅ4RTäB’æVvF—fU÷ö–çG2À¢5TÒ„44Rt„Tâ7"æ—5öæVvF—fSÓD„Tâ2çö–çG2TÅ4RTäB’÷6—F—fU÷ö–çG0¢e$ôÒÖ—76–öå÷66÷&UöF–Ç’2¤ô”âW6W'2W2ôâW2æ–C×2çW6W%ö–BÄTeB¤ô”â&öÆW2"ôâ"æ–C×W2ç&öÆUö–BÄTeB¤ô”â66÷&U÷'VÆW27"ôâ7"ç'VÆUö¶W“×2ç'VÆUö¶W¢t„U$R2ç66÷&UöFFR$UEtTTâòäBòu$õU%’2çW6W%ö–Bõ$DU"%’F÷FÅ÷ö–çG2DU42"Å²G7F'BÂFVæEÒ“°¢F“Ó²f÷&V6‚‚G&÷w22bG"—²F’²³²G%²w&æ²uÓÒF“²G%²wF÷FÅ÷ö–çG2uÓ×&÷VæB‚†fÆöB’G%²wF÷FÅ÷ö–çG2uÒÃ"“²Ð¢&WGW&â²wW&–öE÷G—RsÓâGW&–öEG—RÂwW&–öEö¶W’sÓâGW&–öD¶W’Âvg&öÒsÓâG7F'BÂwFòsÓâFVæBÂv—FV×2sÓâG&÷w5Ó°§Ð¦gVæ7F–öâ÷c“uö&FvUöÆ&VÇ2‚—°¢&WGW&â²vvöÆBsÓâ	úXr˜m˜‹Š}˜˜BrÂw6–ÇfW"sÓâ	úX‚˜m˜‹Šý˜˜RrÂv'&öç¦RsÓâ	úX’˜m˜‹‹=˜˜RrÂvF—66—Æ–æRsÓâ	ùº˜m‹MŠ}˜bŠ}˜m‹mŠŠ}‹rrÂv&W7E÷&W÷'BsÓâ	ù;r˜m‹MŠ}˜bŠ˜}Š­‹¸Í˜bªý‹-Š}‹‹BuÓ°§Ð¦gVæ7F–öâ÷c“u÷W&–öEöÆ&VÂ‚GB—²&WGW&âGCÓÓÒvF–Ç’sò}‹˜‹-Š}˜m˜rs¢‚GCÓÓÒwvVV¶Ç’sò}˜}˜Š­ªý¸Âs¢}˜]Š}˜}Š}˜m˜rr“²Ð¦gVæ7F–öâ÷c“uö&FvU÷W6W'Eöæ÷F–g’‚GV–BÂF&FvT¶W’ÂGW&–öEG—RÂG²ÂG&æ²ÂGö–çG2—°¢FW†—7FVCÔF#£¦öæR‚%4TÄT5B–Be$ôÒÖ—76–öåö&FvW2t„U$RW6W%ö–CÓòäB&FvUö¶W“ÓòäBW&–öE÷G—SÓòäBW&–öEö¶W“Óò"Å²GV–BÂF&FvT¶W’ÂGW&–öEG—RÂGµÒ“°¢F#£§'Vâ‚$”å4U%B”åDòÖ—76–öåö&FvW2‡W6W%ö–BÆ&FvUö¶W’ÇW&–öE÷G—RÇW&–öEö¶W’Æ&æ¶Çö–çG2’dÅTU2ƒòÃòÃòÃòÃòÃò¢ôâEUÄ”4DR´U’UDDR&æ¶ÕdÅTU2†&æ¶’Çö–çG3ÕdÅTU2‡ö–çG2’Æv&FVEöCÔ5U%$TåEõD”ÔU5DÕ"À¢²GV–BÂF&FvT¶W’ÂGW&–öEG—RÂG²ÂG&æ²ÂGö–çG5Ò“°¢–b‚FW†—7FVBbbgVæ7F–öåöW†—7G2‚u÷c“U÷66÷&–æu÷F&ÆW2r’—°¢G'—°¢FÆ&VÇ3Õ÷c“uö&FvUöÆ&VÇ2‚“²FÆ&VÃÒFÆ&VÇ5²F&FvT¶W•ÓóòF&FvT¶W“°¢GF—FÆSÒ	øøR˜m‹MŠ}˜bŠÍŠý¸ÍŠòs°¢F&öG“ÒFÆ&VÂâr(	BŠý˜‹˜}™Brå÷c“u÷W&–öEöÆ&VÂ‚GW&–öEG—R’âr‚râG²âr’‹ŠrŠý‹¸ÍŠ}˜Š¢ª‹Šý¸ÍŠòâŠ-˜‹¸Í˜bs°¢–b†6Æ75öW†—7G2‚uW6‚r’’W6ƒ£¦æ÷F–g’…²GV–EÒÂGF—FÆRÂF&öG’Å²wG—RsÓâv&FvUöv&FVBrÂv&FvUö¶W’sÓâF&FvT¶W’ÂwW&–öE÷G—RsÓâGW&–öEG—RÂwW&–öEö¶W’sÓâGµÒ“°¢Ò6F6‚…ÅF‡&÷v&ÆRFR’²ò¢Š}‹˜MŠ}˜b˜}‹ªý‹"˜mŠŠ}¸ÍŠò˜]Š}˜m‹’Š½ŠŠ¢˜m‹MŠ}˜b‹M˜Šò¢òÐ¢Ð§Ð¦gVæ7F–öâ÷c“uöv&Eö&FvW2‚GW&–öEG—RÂF§“ÖçVÆÂÂF¦ÓÖçVÆÂÂF¦CÖçVÆÂ—°¢÷c“uö&FvU÷F&ÆW2‚“°¢FÆ#Õ÷c“uöÆVFW&&ö&B‚GW&–öEG—RÂF§’ÂF¦ÒÂF¦B“°¢F—FV×3ÒFÆ%²v—FV×2uÓ²G³ÒFÆ%²wW&–öEö¶W’uÓ°¢G&æ´&FvSÕ²vvöÆBrÂw6–ÇfW"rÂv'&öç¦RuÓ°¢f÷&V6‚†'&•÷6Æ–6R‚F—FV×2ÃÃ2’2F–GƒÓâG"—°¢÷c“uö&FvU÷W6W'Eöæ÷F–g’‚†–çB’G%²wW6W%ö–BuÒÂG&æ´&FvU²F–G…ÒÂGW&–öEG—RÂG²ÂF–G‚³ÂG%²wF÷FÅ÷ö–çG2uÒ“°¢Ð¢òòŠ}˜m‹mŠŠ}‹s¢ŠŠý˜˜b˜}¸Í¨bŠ}˜]Š­¸ÍŠ}‹"˜]˜m˜¸ÂŠý‹ŠŠ}‹-˜}ˆÂ˜‚ŠÝŠýŠ}˜-˜Bª˜]¸Â˜‹Š}˜M¸ÍŠ¢˜]Š½ŠŠ¢ŠýŠ}‹MŠ­˜rŠŠ}‹MŠð¢f÷&V6‚‚F—FV×22G"—°¢–b‚†fÆöB’G%²væVvF—fU÷ö–çG2uÓÓÓÓãbb†fÆöB’G%²w÷6—F—fU÷ö–çG2uÓã—°¢÷c“uö&FvU÷W6W'Eöæ÷F–g’‚†–çB’G%²wW6W%ö–BuÒÂvF—66—Æ–æRrÂGW&–öEG—RÂG²ÆçVÆÂÂG%²w÷6—F—fU÷ö–çG2uÒ“°¢Ð¢Ð¢òòŠ˜}Š­‹¸Í˜bªý‹-Š}‹‹C¢Š¸Í‹MŠ­‹¸Í˜bŠ}˜]Š­¸ÍŠ}‹"ŠŠ}‹-Šý¸ÍŠò˜]‹Š­Š‹Ší‹rŠý‹ŠŠ}‹-˜p¢F&W7E&W÷'CÖçVÆÃ°¢f÷&V6‚‚F—FV×22G"—²–b‚†fÆöB’G%²wf—6—E÷ö–çG2uÓãbb‚F&W7E&W÷'BÇÂ†fÆöB’G%²wf—6—E÷ö–çG2uÓâ†fÆöB’F&W7E&W÷'E²wf—6—E÷ö–çG2uÒ’’F&W7E&W÷'CÒG#²Ð¢–b‚F&W7E&W÷'B—°¢÷c“uö&FvU÷W6W'Eöæ÷F–g’‚†–çB’F&W7E&W÷'E²wW6W%ö–BuÒÂv&W7E÷&W÷'BrÂGW&–öEG—RÂG²ÆçVÆÂÂF&W7E&W÷'E²wf—6—E÷ö–çG2uÒ“°¢Ð¢&WGW&â²wW&–öE÷G—RsÓâGW&–öEG—RÂwW&–öEö¶W’sÓâG²ÂvvöÆBsÓâF—FV×5³Õ²wW6W%ö–BuÓóöçVÆÂÂvF—66—Æ–æUö6÷VçBsÓæ6÷VçB†'&•öf–ÇFW"‚F—FV×2Æfâ‚G"“Óâ†fÆöB’G%²væVvF—fU÷ö–çG2uÓÓÓÓãbb†fÆöB’G%²w÷6—F—fU÷ö–çG2uÓã’•Ó°§Ð§&÷WFR‚ttUBrÂrö’öÆVFW&&ö&BrÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“U÷66÷&–æu÷F&ÆW2‚“°¢GG—SÖ–åö'&’‚EôtUE²wW&–öBuÓóòvF–Ç’rÅ²vF–Ç’rÂwvVV¶Ç’rÂvÖöçF†Ç’uÒÇG'VR“òEôtUE²wW&–öBuÓ¢vF–Ç’s°¢&WGW&â÷c“uöÆVFW&&ö&B‚GG—R“°§Ò“°§&÷WFR‚ttUBrÂrö’ö×’ö&FvW2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“uö&FvU÷F&ÆW2‚“°¢&WGW&â²v—FV×2sÓäF#£¦ÆÂ‚%4TÄT5B&FvUö¶W’ÇW&–öE÷G—RÇW&–öEö¶W’Æ&æ¶Çö–çG2Æv&FVEöBe$ôÒÖ—76–öåö&FvW2t„U$RW6W%ö–CÓòõ$DU"%’v&FVEöBDU42Ä”Ô•B"Å²†–çB’GU²v–BuÕÒ•Ó°§Ò“°§&÷WFR‚ttUBrÂrö’öFÖ–âö&FvW2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“uö&FvU÷F&ÆW2‚“°¢GG—SÒEôtUE²wW&–öE÷G—RuÓóöçVÆÃ²Gv†W&SÒGG—Sò%t„U$RÖ"çW&–öE÷G—SÓò#¢"#²F&w3ÒGG—Sõ²GG—UÓ¥µÓ°¢&WGW&â²v—FV×2sÓäF#£¦ÆÂ‚%4TÄT5BÖ"â¢ÅE$”Ò„4ôä4B„4ôÄU44R‡W2æf—'7EöæÖRÂrr’ÂrrÄ4ôÄU44R‡W2æÆ7EöæÖRÂrr’’’W6W%öæÖRe$ôÒÖ—76–öåö&FvW2Ö"¤ô”âW6W'2W2ôâW2æ–CÖÖ"çW6W%ö–BGv†W&Rõ$DU"%’Ö"æv&FVEöBDU42Ä”Ô•B3"ÂF&w2•Ó°§ÒÆfÇ6RÄDÔ”â“° ¢ò¢ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒc“ƒ¢ŠýŠ}‹MŠ˜‹Šò˜]Šý¸Í‹¸ÍŠ­¸Âª˜N(Í‹M˜}‹˜Š}‹"»b‹˜]˜M¸ÍŠ}Š¢˜]¸ÍŠýŠ}˜m¸Â’ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒ¢ð§&÷WFR‚ttUBrÂrö’öFÖ–âö6—G’ÖF6†&ö&BrÆgVæ7F–öâ‚GÂF"ÂGR—°¢G'’°¢÷c“öÖ—76–öå÷F&ÆW2‚“²÷c“U÷66÷&–æu÷F&ÆW2‚“²÷c“uö&FvU÷F&ÆW2‚“°¢FFFSÕ÷c“öæ÷&ÕöFFR‚EôtUE²vFFRuÓóöçVÆÂÂFFR‚u’ÖÒÖBr’“° ¢òò›í˜‹M‹Bª˜B‹M˜}‹˜‚Ší‹}˜‹rª˜^(Í›í˜‹M‹@¢FÆ–æU&÷w3ÔF#£¦ÆÂ‚%4TÄT5BÂæ–BÆÂæ6öFRÆÂæ÷&–v–âÆÂæFW7F–æF–öâÄ4õTåB„D•5D”ä5Bbæ–B’F÷FÅ÷fV†–6ÆW2À¢…4TÄT5B4õTåB„D•5D”ä5B72æG&—fW%ö–B’e$ôÒ6†V6¶Æ—7E÷7V&Ö—76–öç272¤ô”âfV†–6ÆW2gbôâgbæ–CÖ72çfV†–6ÆUö–Bt„U$RgbæÆ–æUö–CÖÂæ–BäBDDR†72æ7&VFVEöB“Óò’6†V6¶VEö6÷VçBÀ¢…4TÄT5B4õTåB„D•5D”ä5BæG&—fW%ö–B’e$ôÒGFVæFæ6W2t„U$RæÆ–æUö–CÖÂæ–BäBDDR†æ7&VFVEöB“Óò’&W6VçEö6÷Vç@¢e$ôÒÆ–æW6ÂÄTeB¤ô”âfV†–6ÆW2bôâbæÆ–æUö–CÖÂæ–Bu$õU%’Âæ–B"Å²FFFRÂFFFUÒ“°¢F6—G•F÷FÅfV†–6ÆW3Ó²F6—G”6†V6¶VCÓ°¢f÷&V6‚‚FÆ–æU&÷w22bFÇ"—°¢FÇ%²wF÷FÅ÷fV†–6ÆW2uÓÒ†–çB’FÇ%²wF÷FÅ÷fV†–6ÆW2uÓ²FÇ%²v6†V6¶VEö6÷VçBuÓÒ†–çB’FÇ%²v6†V6¶VEö6÷VçBuÓ²FÇ%²w&W6VçEö6÷VçBuÓÒ†–çB’FÇ%²w&W6VçEö6÷VçBuÓ°¢FÇ%²v6÷fW&vU÷W&6VçBuÓÕ÷c“÷7B‚FÇ%²v6†V6¶VEö6÷VçBuÒÂFÇ%²wF÷FÅ÷fV†–6ÆW2uÒ“°¢F6—G•F÷FÅfV†–6ÆW2³ÒFÇ%²wF÷FÅ÷fV†–6ÆW2uÓ²F6—G”6†V6¶VB³ÒFÇ%²v6†V6¶VEö6÷VçBuÓ°¢Ð¢W6÷'B‚FÆ–æU&÷w2Æfâ‚FÂF"“ÓâF²v6÷fW&vU÷W&6VçBuÓÃÓâF%²v6÷fW&vU÷W&6VçBuÒ“°¢GvV´Æ–æW3Ö'&•÷fÇVW2†'&•öf–ÇFW"‚FÆ–æU&÷w2Æfâ‚FÂ“ÓâFÅ²wF÷FÅ÷fV†–6ÆW2uÓã’“°¢GvV´Æ–æW3Ö'&•÷6Æ–6R‚GvV´Æ–æW2ÃÃ“° ¢òòŠí˜MŠ}‹]˜}™B‹=˜]Š®(Í˜}Šr‹˜]˜Mª‹Šòªý‹MŠ®(Í˜}Šrý˜mŠ}‹‹Š}˜býŠŠ}‹-‹‹=Š}˜b¢G&öÆU7VÖÖ'“Õ÷c“e÷&öÆUöw&÷W÷7VÖÖ'’‚FFFR“° ¢òò˜]Š=˜]˜‹¸ÍŠ®(Í˜}Š}¸Â˜mŠ}˜-‹RŠ}˜]‹˜‹ ¢FÆÅW6W'3Õ÷c“eöf–VÆE÷W6W'5÷6æ6†÷B‚FFFR“°¢F–æ6ö×ÆWFSÖ'&•÷fÇVW2†'&•öf–ÇFW"‚FÆÅW6W'2Æfâ‚G2“ÓâV×G’‚G5²v†5öÖ—76–öâuÒ’bb†fÆöB’G5²wvV–v‡FVEö6†–WfVÖVçBuÓÃS’“°¢W6÷'B‚F–æ6ö×ÆWFRÆfâ‚FÂF"“ÓâF²wvV–v‡FVEö6†–WfVÖVçBuÓÃÓâF%²wvV–v‡FVEö6†–WfVÖVçBuÒ“° ¢òòªŠ}‹Š‹Š}˜bŠ‹Š­‹Š}˜]‹˜‹"†ÆVFW&&ö&BŠ‹Š}‹=Š}‹2Š­Š}‹¸ÍŠâ‹M˜]‹=¸Í™˜]‹Š}Šý˜BŠ­Š}‹¸ÍŠâŠ}˜mŠ­ŠíŠ}Š¸Â˜]ŠÝŠ}‹=Š˜r˜]¸Î(Í‹M˜Šò¢–b‚FFFSÓÓÖFFR‚u’ÖÒÖBr’—²GF÷Õ÷c“uöÆVFW&&ö&B‚vF–Ç’r“²Ð¢VÇ6W²²F§’ÂF¦ÒÂF¦EÓÖw&Vv÷&–å÷Fõö¦ÆÆ’‚†–çB—7V'7G"‚FFFRÃÃB’Â†–çB—7V'7G"‚FFFRÃRÃ"’Â†–çB—7V'7G"‚FFFRÃ‚Ã"’“²GF÷Õ÷c“uöÆVFW&&ö&B‚vF–Ç’rÂF§’ÂF¦ÒÂF¦B“²Ð ¢&WGW&â°¢vFFRsÓâFFFRÀ¢v6—G•ö6÷fW&vRsÓå²wF÷FÅ÷fV†–6ÆW2sÓâF6—G•F÷FÅfV†–6ÆW2Âv6†V6¶VEö6÷VçBsÓâF6—G”6†V6¶VBÂv6÷fW&vU÷W&6VçBsÓå÷c“÷7B‚F6—G”6†V6¶VBÂF6—G•F÷FÅfV†–6ÆW2’ÂvÆ–æW5ö6÷VçBsÓæ6÷VçB‚FÆ–æU&÷w2•ÒÀ¢wvVµöÆ–æW2sÓâGvV´Æ–æW2À¢w&öÆU÷7VÖÖ'’sÓâG&öÆU7VÖÖ'’À¢v–æ6ö×ÆWFUöÖ—76–öç2sÓå²v6÷VçBsÓæ6÷VçB‚F–æ6ö×ÆWFR’Âv—FV×2sÓæ'&•÷6Æ–6R‚F–æ6ö×ÆWFRÃÃ#•ÒÀ¢wF÷÷W6W'2sÓæ'&•÷6Æ–6R‚GF÷²v—FV×2uÒÃÃ’À¢Ó°¢Ò6F6‚…ÅF‡&÷v&ÆRFR’°¢W'&÷%öÆör‚v6—G’ÖF6†&ö&BW'&÷#¢râFRÓævWDÖW76vR‚’“°¢‡GG£¦§6öâ…²vW'&÷"sÓâ}Ší‹}Š}¸ÂŠýŠ}Ší˜M¸Â‹=‹˜‹rÂvFWF–ÂsÓâFRÓævWDÖW76vR‚’ÂvÆ–æRsÓâFRÓævWDÆ–æR‚’Âvf–ÆRsÓæ&6VæÖR‚FRÓævWDf–ÆR‚’•ÒÂS“°¢Ð§ÒÆfÇ6RÄDÔ”â“° ¢ò¢ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒc““¢›íŠ}¸Í‹B‹=˜MŠ}˜]Š¢ª‹˜˜n(Í˜}ŠrÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒ¢ð¦gVæ7F–öâö7&öæÆöu÷F&ÆR‚’°¢7FF–2FFöæRÒfÇ6S²–b‚FFöæR’&WGW&ã²FFöæRÒG'VS°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E27&öå÷'VåöÆör€¢7&öåö¶W’d$4„"ƒC’$”Ô%’´U’ÂÆ7E÷'VåöBD”ÔU5DÕåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÀ¢Æ7E÷7FGW2d$4„"ƒ’äõBåTÄÂDTdTÅBvö²rÂÆ7EöÖW76vRDU…BåTÄÂÂ'Våö6÷VçB”åBäõBåTÄÂDTdTÅBÀ¢Æ7E÷6÷W&6Rd$4„"ƒ’äõBåTÄÂDTdTÅBv6Æ’p¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B"“°§Ð¦gVæ7F–öâö7&öæÆöu÷&V6÷&B‚F7&öä¶W’ÂG7FGW2ÂFÖW76vRÂF—46Æ’’°¢G'’°¢ö7&öæÆöu÷F&ÆR‚“°¢F#£§'Vâ‚$”å4U%B”åDò7&öå÷'VåöÆör†7&öåö¶W’ÆÆ7E÷'VåöBÆÆ7E÷7FGW2ÆÆ7EöÖW76vRÇ'Våö6÷VçBÆÆ7E÷6÷W&6R’dÅTU2ƒòÄäõr‚’ÃòÃòÃÃò¢ôâEUÄ”4DR´U’UDDRÆ7E÷'VåöCÔäõr‚’ÆÆ7E÷7FGW3ÕdÅTU2†Æ7E÷7FGW2’ÆÆ7EöÖW76vSÕdÅTU2†Æ7EöÖW76vR’À¢'Våö6÷VçC×'Våö6÷VçB³ÆÆ7E÷6÷W&6SÕdÅTU2†Æ7E÷6÷W&6R’"À¢²F7&öä¶W’ÂG7FGW2ÂFÖW76vRòÖ%÷7V'7G"‚‡7G&–ær’FÖW76vRÃÃS’¢çVÆÂÂF—46Æ’òv6Æ’r¢v‡GGuÒ“°¢Ò6F6‚…ÅF‡&÷v&ÆRFR’²ò¢Š½ŠŠ¢˜MŠ}ªò˜}‹ªý‹"˜mŠŠ}¸ÍŠòŠí˜ŠòŠ}ŠÍ‹Š}¸Âª‹˜˜b‹Šr˜]Š­˜˜-˜ª˜mŠò¢òÐ§Ð¦gVæ7F–öâ÷c“•ö¶æ÷våö7&öç2‚—°¢&WGW&â°¢²v¶W’sÓâw&W6Væ6RÖÆW'BrÂvf–ÆRsÓâv7&öåö&6¶w&÷VæBç‡&W6Væ6RÖÆW'BrÂwF—FÆRsÓâ}˜}‹MŠýŠ}‹‹]ŠÝŠ®(Í‹=˜mŠÍ¸ÂŠÝ‹m˜‹Š}‹"‹=‹˜‹rÂw66†VGVÆRsÓâ}˜}‹Šý˜-¸Í˜-˜rrÂvÖ…öÖ–çWFW2sÓã5ÒÀ¢²v¶W’sÓâvFVÆ—fW'’×VWVRrÂvf–ÆRsÓâv7&öåö&6¶w&÷VæBç‡FVÆ—fW'’×VWVRrÂwF—FÆRsÓâ}›í‹ŠýŠ}‹-‹B‹]˜›íŠ}¸ÍŠýŠ}‹Š}‹‹=Š}˜BrÂw66†VGVÆRsÓâ}˜}‹Šý˜-¸Í˜-˜rrÂvÖ…öÖ–çWFW2sÓã5ÒÀ¢²v¶W’sÓâw7—7FVÒÖ†VÇF‚rÂvf–ÆRsÓâv7&öåö&6¶w&÷VæBç‡7—7FVÒÖ†VÇF‚rÂwF—FÆRsÓâ}Š½ŠŠ¢›íŠ}¸Í‹B‹=˜MŠ}˜]Š¢‹=Š}˜]Š}˜m˜rrÂw66†VGVÆRsÓâ}˜}‹›í˜mŠÂŠý˜-¸Í˜-˜rrÂvÖ…öÖ–çWFW2sÓãÒÀ¢²v¶W’sÓâvWFòÖW†—BrÂvf–ÆRsÓâv7&öåöWFõöW†—Bç‡rÂwF—FÆRsÓâ}Ší‹˜ŠÂŠí˜ŠýªŠ}‹‹Š}˜m˜mŠýªýŠ}˜bŠÍŠ}˜]Š}˜mŠý˜rŠý‹Ší‹rrÂw66†VGVÆRsÓâ}˜}‹»»RŠý˜-¸Í˜-˜rrÂvÖ…öÖ–çWFW2sÓã3ÒÀ¢²v¶W’sÓâw6×2ÖW‡—'’rÂvf–ÆRsÓâv7&öå÷6×5öW‡—'’ç‡rÂwF—FÆRsÓâ}›í¸ÍŠ}˜]ª’˜}‹MŠýŠ}‹Š}˜m˜-‹mŠ}¸ÂŠ}‹Š­ŠŠ}‹rÂw66†VGVÆRsÓâ}‹˜‹-¸Â¸Íªž(ÍŠŠ}‹›í¸Í‹M˜m˜}Š}Šò»‚‹]ŠŠÒ’rÂvÖ…öÖ–çWFW2sÓãScÒÀ¢²v¶W’sÓâwW6‚ÖW‡—'’rÂvf–ÆRsÓâv7&öå÷W6…öW‡—'’ç‡rÂwF—FÆRsÓâ}›í˜‹B˜}‹MŠýŠ}‹Š}˜m˜-‹mŠ}¸ÂŠ}‹Š­ŠŠ}‹rÂw66†VGVÆRsÓâ}‹˜‹-¸Â¸Íªž(ÍŠŠ}‹›í¸Í‹M˜m˜}Š}Šò»‚‹]ŠŠÒ’rÂvÖ…öÖ–çWFW2sÓãScÒÀ¢²v¶W’sÓâv&—'F†F’rÂvf–ÆRsÓâv7&öåö&—'F†F’ç‡rÂwF—FÆRsÓâ}Š­Š‹¸Íª’Š­˜˜MŠòrÂw66†VGVÆRsÓâ}‹˜‹-¸Â¸Íªž(ÍŠŠ}‹‹]ŠŠÒrÂvÖ…öÖ–çWFW2sÓãScÒÀ¢²v¶W’sÓâv6ÆVçWrÂvf–ÆRsÓâv7&öåö6ÆVçWç‡rÂwF—FÆRsÓâ}›íŠ}ª‹=Š}‹-¸Â˜Š}¸Í˜N(Í˜}Š}¸Â˜]˜˜-Š¢ý˜-Šý¸Í˜]¸ÂrÂw66†VGVÆRsÓâ}‹˜‹-¸Â¸Íªž(ÍŠŠ}‹rÂvÖ…öÖ–çWFW2sÓãScÒÀ¢²v¶W’sÓâvÖ—76–öâ×66÷&–ærrÂvf–ÆRsÓâv7&öåöÖ—76–öå÷66÷&–ærç‡rÂwF—FÆRsÓâ}˜m˜}Š}¸Í¸Î(Í‹=Š}‹-¸ÂŠ}˜]Š­¸ÍŠ}‹"˜‚˜m‹MŠ}˜n(Í˜}Š}¸Â‹˜]˜M¸ÍŠ}Š¢˜]¸ÍŠýŠ}˜m¸ÂrÂw66†VGVÆRsÓâ}‹˜‹-¸Â¸Íªž(ÍŠŠ}‹ˆÂ›íŠ}¸ÍŠ}˜b‹˜‹"›í¸Í‹M˜m˜}Š}Šò»-»3­»»’rÂvÖ…öÖ–çWFW2sÓãScÒÀ¢²v¶W’sÓâvF–Ç’rÂvf–ÆRsÓâv7&öåöF–Ç’ç‡rÂwF—FÆRsÓâ}Š‹=Š­˜}™BªŠ}‹˜}Š}¸Â‹˜‹-Š}˜m˜r›í¸ÍŠ}˜]ª’½›í˜‹B½Š­˜˜MŠò½›íŠ}ª‹=Š}‹-¸ÂŠŠr˜}˜R’rÂw66†VGVÆRsÓâ}ŠÍŠ}¸Íªý‹-¸Í˜bŠ}ŠÍ‹Š}¸ÂŠÍŠýŠ}ªýŠ}˜m˜}™B»BªŠ}‹ŠŠ}˜MŠr(	B‹˜‹-¸Â¸Íªž(ÍŠŠ}‹‹]ŠŠÒrÂvÖ…öÖ–çWFW2sÓãScÂv÷F–öæÅö'VæFÆRsÓçG'VUÒÀ¢²v¶W’sÓâvÆÂrÂvf–ÆRsÓâv7&öåöÆÂç‡rÂwF—FÆRsÓâ}Š}ŠÍ‹Š}¸Â˜}˜]˜}™BªŠ}‹˜}ŠrŠŠr˜}˜R‹MŠ}˜]˜B˜]Š=˜]˜‹¸ÍŠ®(Í˜}Šr’rÂw66†VGVÆRsÓâ}Š}ŠíŠ­¸ÍŠ}‹¸Â(	BŠÍŠ}¸Íªý‹-¸Í˜bª˜B˜]˜Š}‹ŠòŠŠ}˜MŠrrÂvÖ…öÖ–çWFW2sÓæçVÆÂÂv÷F–öæÅö'VæFÆRsÓçG'VUÒÀ¢Ó°§Ð§&÷WFR‚ttUBrÂrö’öFÖ–âö7&öâ×7FGW2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢ö7&öæÆöu÷F&ÆR‚“°¢G&÷w3ÔF#£¦ÆÂ‚%4TÄT5B¢e$ôÒ7&öå÷'VåöÆör"“°¢F'”¶W“ÕµÓ²f÷&V6‚‚G&÷w22G"’F'”¶W•²G%²v7&öåö¶W’uÕÓÒG#°¢F÷WCÕµÓ°¢f÷&V6‚…÷c“•ö¶æ÷våö7&öç2‚’2F2—°¢G&÷sÒF'”¶W•²F5²v¶W’uÕÓóöçVÆÃ°¢G7FGW3ÒvæWfW%÷'Vâs²FÖ–çWFW56–æ6SÖçVÆÃ°¢–b‚G&÷rbbG&÷u²vÆ7E÷'VåöBuÒ—°¢FÖ–çWFW56–æ6S×&÷VæB‚‡7G'F÷F–ÖR‚væ÷rr’×7G'F÷F–ÖR‚G&÷u²vÆ7E÷'VåöBuÒ’’óc“°¢–b‚G&÷u²vÆ7E÷7FGW2uÓÓÓÒvW'&÷"r’G7FGW3ÒvW'&÷"s°¢VÇ6V–b‚F5²vÖ…öÖ–çWFW2uÓÓÓÖçVÆÂ’G7FGW3Òvö²s°¢VÇ6V–b‚FÖ–çWFW56–æ6SÃÒF5²vÖ…öÖ–çWFW2uÒ£ãR’G7FGW3Òvö²s°¢VÇ6RG7FGW3ÒvÆFRs°¢Ð¢F÷WEµÓÒF2µ²w7FGW2sÓâG7FGW2ÂvÆ7E÷'VåöBsÓâG&÷u²vÆ7E÷'VåöBuÓóöçVÆÂÂvÖ–çWFW5÷6–æ6RsÓâFÖ–çWFW56–æ6RÀ¢w'Våö6÷VçBsÓâG&÷sò†–çB’G&÷u²w'Våö6÷VçBuÓ£ÂvÆ7E÷6÷W&6RsÓâG&÷u²vÆ7E÷6÷W&6RuÓóöçVÆÂÂvÆ7EöÖW76vRsÓâG&÷u²vÆ7EöÖW76vRuÓóöçVÆÅÓ°¢Ð¢&WGW&â²v—FV×2sÓâF÷WBÂv6†V6¶VEöBsÓæFFR‚v2r•Ó°§ÒÆfÇ6RÄDÔ”â“° ¢ò¢ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒc#¢˜m˜]˜ŠýŠ}‹‹˜˜mŠò»=»‹˜‹-˜rŠ­ª˜]¸Í˜B‹}Š¸Í‹¸Â‹˜]˜M¸ÍŠ}Š¢˜]¸ÍŠýŠ}˜m¸Â’ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒ¢ð§&÷WFR‚ttUBrÂrö’öFÖ–âöÖ—76–öâ×G&VæBrÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷c“öÖ—76–öå÷F&ÆW2‚“²÷c“U÷66÷&–æu÷F&ÆW2‚“°¢FF—3ÖÖ‚ƒÆÖ–âƒ“Â†–çB’‚EôtUE²vF—2uÓóó3’’“°¢GW6W$–CÒEôtUE²wW6W%ö–BuÓóöçVÆÃ°¢Fg&öÓÖFFR‚u’ÖÒÖBrÇ7G'F÷F–ÖR‚"Ò"â‚FF—2Ó’â"F—2"’“°¢–b‚GW6W$–B—°¢G&÷w3ÔF#£¦ÆÂ‚%4TÄT5B&öw&W75öFFRBÂvV–v‡FVEö6†–WfVÖVçB6‚e$ôÒÖ—76–öåöF–Ç•÷&öw&W72t„U$RW6W%ö–CÓòäB&öw&W75öFFSãÓòõ$DU"%’&öw&W75öFFR"Å²†–çB’GW6W$–BÂFg&öÕÒ“°¢G66÷&U&÷w3ÔF#£¦ÆÂ‚%4TÄT5B66÷&UöFFRBÂ5TÒ‡ö–çG2’G2e$ôÒÖ—76–öå÷66÷&UöF–Ç’t„U$RW6W%ö–CÓòäB66÷&UöFFSãÓòu$õU%’66÷&UöFFR"Å²†–çB’GW6W$–BÂFg&öÕÒ“°¢ÒVÇ6R°¢G&÷w3ÔF#£¦ÆÂ‚%4TÄT5B&öw&W75öFFRBÂdr‡vV–v‡FVEö6†–WfVÖVçB’6‚e$ôÒÖ—76–öåöF–Ç•÷&öw&W72t„U$R&öw&W75öFFSãÓòu$õU%’&öw&W75öFFRõ$DU"%’&öw&W75öFFR"Å²Fg&öÕÒ“°¢G66÷&U&÷w3ÔF#£¦ÆÂ‚%4TÄT5B66÷&UöFFRBÂ5TÒ‡ö–çG2’G2e$ôÒÖ—76–öå÷66÷&UöF–Ç’t„U$R66÷&UöFFSãÓòu$õU%’66÷&UöFFR"Å²Fg&öÕÒ“°¢Ð¢F6„ÖÕµÓ²f÷&V6‚‚G&÷w22G"’F6„Ö²G%²vBuÕÓ×&÷VæB‚†fÆöB’G%²v6‚uÒÃ“°¢G66÷&TÖÕµÓ²f÷&V6‚‚G66÷&U&÷w22G"’G66÷&TÖ²G%²vBuÕÓ×&÷VæB‚†fÆöB’G%²wG2uÒÃ“°¢F÷WCÕµÓ°¢f÷"‚F“Ó²F“ÂFF—3²F’²²—°¢FCÖFFR‚u’ÖÒÖBrÇ7G'F÷F–ÖR‚"Fg&öÒ²F’F—2"’“°¢²F§’ÂF¦ÒÂF¦EÓÖw&Vv÷&–å÷Fõö¦ÆÆ’‚†–çB—7V'7G"‚FBÃÃB’Â†–çB—7V'7G"‚FBÃRÃ"’Â†–çB—7V'7G"‚FBÃ‚Ã"’“°¢F÷WEµÓÕ²vFFRsÓâFBÂv¦FFRsÓç7&–çFb‚rS&BòS&BrÂF¦ÒÂF¦B’Âv6†–WfVÖVçBsÓâF6„Ö²FEÓóóÂw66÷&RsÓâG66÷&TÖ²FEÓóóÓ°¢Ð¢&WGW&â²vg&öÒsÓâFg&öÒÂwFòsÓæFFR‚u’ÖÒÖBr’ÂwW6W%ö–BsÓâGW6W$–Cò†–çB’GW6W$–C¦çVÆÂÂv—FV×2sÓâF÷WEÓ°§ÒÆfÇ6RÄDÔ”â“° ¢ò¢ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒc#¢ŠýŠ}‹MŠ˜‹Šò‹=˜MŠ}˜]Š¢‹=Š}˜]Š}˜m˜r›íŠ}¸ÍŠýŠ}‹¸Â˜‚˜-Š}Š˜M¸ÍŠ¢Š}Š­ªŠr’ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒ¢ð¦gVæ7F–öâ÷c#ö†VÇF…÷F&ÆW2‚—°¢7FF–2FFöæSÖfÇ6S²–b‚FFöæR’&WGW&ã²FFöæS×G'VS°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2&6·WöÆör€¢–B”åBUDõô”ä5$TÔTåB$”Ô%’´U’Â¶–æBd$4„"ƒ’äõBåTÄÂÂ—5öÆ–v‡BD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢7&VFVEö'’”åBåTÄÂÂ7&VFVEöBD”ÔU5DÕåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕ ¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B"“°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2Æöv–åö—öGFV×G2€¢–B”åBUDõô”ä5$TÔTåB$”Ô%’´U’Â—d$4„"ƒcB’äõBåTÄÂÂ7&VFVEöBD”ÔU5DÕåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÀ¢´U’–G…öÆ–ö—÷F–ÖR†—Â7&VFVEöB¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B"“°§Ð¦gVæ7F–öâ÷c#öF—%÷6—¦R‚FF—"ÂFÖ„f–ÆW2Ò#—°¢–b‚—5öF—"‚FF—"’’&WGW&â²v'—FW2sÓãÂvf–ÆW2sÓãÂwG'Væ6FVBsÓæfÇ6UÓ°¢F'—FW3Ó²Ff–ÆW3Ó²GG'Væ6FVCÖfÇ6S°¢G'—°¢F—BÒæWrÅ&V7W'6—fT—FW&F÷$—FW&F÷"†æWrÅ&V7W'6—fTF—&V7F÷'”—FW&F÷"‚FF—"ÂÄf–ÆW7—7FVÔ—FW&F÷#£¥4´•ôDõE2’“°¢f÷&V6‚‚F—B2Fb’°¢–b‚Ff–ÆW2ãÒFÖ„f–ÆW2’²GG'Væ6FVBÒG'VS²'&V³²Ð¢–b‚FbÓæ—4f–ÆR‚’’²F'—FW2³ÒFbÓævWE6—¦R‚“²Ff–ÆW2²³²Ð¢Ð¢Ò6F6‚…ÅF‡&÷v&ÆRFR’²ò¢Š}ªý‹Ší˜Š}˜mŠý˜b›í˜‹M˜rŠŠrŠí‹}Šr˜]˜Š}ŠÍ˜r‹MŠýˆÂ˜}˜]Š}˜b˜]˜-ŠýŠ}‹ŠÍ‹-Šm¸Â‹ŠrŠ‹˜]¸Î(Íªý‹ŠýŠ}˜m¸Í˜R¢òÐ¢&WGW&â²v'—FW2sÓâF'—FW2Âvf–ÆW2sÓâFf–ÆW2ÂwG'Væ6FVBsÓâGG'Væ6FVEÓ°§Ð¦gVæ7F–öâ÷c#öf×Eö'—FW2‚F"—°¢F#Ò†fÆöB’F#²GVæ—G3Õ²}ŠŠ}¸ÍŠ¢rÂ}ª¸Í˜M˜ŠŠ}¸ÍŠ¢rÂ}˜]ªýŠ}ŠŠ}¸ÍŠ¢rÂ}ªý¸ÍªýŠ}ŠŠ}¸ÍŠ¢rÂ}Š­‹Š}ŠŠ}¸ÍŠ¢uÓ²F“Ó°¢v†–ÆR‚F#ãÓ#BbbF“Æ6÷VçB‚GVæ—G2’Ó’²F"óÓ#C²F’²³²Ð¢&WGW&â&÷VæB‚F"Ã’ârrâGVæ—G5²F•Ó°§Ð ¢ò¢ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒc#3¢ŠÍ˜M‹=Š}Š¢˜‹Š}˜BªŠ}‹Š‹Š}˜bŠ}˜]˜m¸ÍŠ¢’ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒ¢ð§&÷WFR‚ttUBrÂrö’öFÖ–âö7F—fR×6W76–öç2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢G&÷w2ÒF#£¦ÆÂ‚%4TÄT5B2æ–BÂ2çW6W%ö–BÂ2æFWf–6U÷G—RÂ2æFWf–6Uö–BÂ2æFWf–6UöÖöFVÂÂ2æ7&VFVEöBÀ¢E$”Ò„4ôä4B„4ôÄU44R‡W2æf—'7EöæÖRÂrr’ÂrrÄ4ôÄU44R‡W2æÆ7EöæÖRÂrr’’’W6W%öæÖRÂ"çF—FÆR&öÆU÷F—FÆP¢e$ôÒW6W%÷6W76–öç20¢¤ô”âW6W'2W2ôâW2æ–BÒ2çW6W%ö–@¢ÄTeB¤ô”â&öÆW2"ôâ"æ–BÒW2ç&öÆUö–@¢t„U$R2ç&Wfö¶VEöB•2åTÄÀ¢õ$DU"%’2æ7&VFVEöBDU42Ä”Ô•BS"“°¢&WGW&â²v—FV×2sÓâG&÷w2Âv6÷VçBsÓæ6÷VçB‚G&÷w2•Ó°§ÒÆfÇ6RÄDÔ”â“°§&÷WFR‚uõ5BrÂrö’öFÖ–âö7F—fR×6W76–öç2÷&Wfö¶RrÆgVæ7F–öâ‚GÂF"ÂGR—°¢G&rÒF%²w6W76–öåö–G2uÒóòçVÆÃ°¢–b‚—5ö'&’‚G&r’ÇÂG&rÇÂ6÷VçB‚G&r“ãS’‡GG£¦W'&÷"‚}Š¸Í˜b»Š­Šr»]»»˜m‹M‹=Š¢‹ŠrŠ}˜mŠ­ŠíŠ}Š‚ª˜m¸ÍŠòârÃC“°¢F–G3ÕµÓ°¢f÷&V6‚‚G&r2F–B’°¢–b‚‚—5ö–çB‚F–B’bb—5÷7G&–ær‚F–B’’ÇÂ7G—UöF–v—B‚‡7G&–ær’F–B’ÇÂ†–çB’F–CÃ’‡GG£¦W'&÷"‚}‹M˜mŠ}‹=˜r˜m‹M‹=Š¢˜mŠ}˜]‹Š­Š‹Š}‹=Š¢ârÃC“°¢F–G5µÓÒ†–çB’F–C°¢Ð¢F–G3Ö'&•÷fÇVW2†'&•÷Væ—VR‚F–G2’“°¢FÖ&·3Ö–×ÆöFR‚rÂrÆ'&•öf–ÆÂƒÆ6÷VçB‚F–G2’Âsòr’“°¢GFóÔF#£§Fò‚“°¢GFòÓæ&Vv–åG&ç67F–öâ‚“°¢G'’°¢F6†ævVCÔF#£§'Vâ‚%UDDRW6W%÷6W76–öç24UB&Wfö¶VEöCÔäõr‚’t„U$R&Wfö¶VEöB•2åTÄÂäB–B”â‚FÖ&·2’"ÂF–G2’Óç&÷t6÷VçB‚“°¢F#£§'Vâ‚$”å4U%B”åDò7F—f—G•öÆöw2‡W6W%ö–BÆWfVçBÆÖWF’dÅTU2ƒòÂvFWf–6U÷&Wfö¶VEö'VÆ²rÂò’"Å²GU²v–BuÒÆ§6öåöVæ6öFR…²v'’sÓâGU²v–BuÒÂw&WVW7FVEö6÷VçBsÓæ6÷VçB‚F–G2’Âw&Wfö¶VEö6÷VçBsÓâF6†ævVEÒ•Ò“°¢GFòÓæ6öÖÖ—B‚“°¢Ò6F6‚…ÅF‡&÷v&ÆRFR’°¢–b‚GFòÓæ–åG&ç67F–öâ‚’’GFòÓç&öÆÄ&6²‚“°¢F‡&÷rFS°¢Ð¢&WGW&â²vö²sÓçG'VRÂw&Wfö¶VEö6÷VçBsÓâF6†ævVEÓ°§ÒÆfÇ6RÄDÔ”â“° ¢ò¢ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒŠ}˜-˜MŠ}˜RŠ­ŠÝ˜¸Í˜M¸Â˜Š}ªý‹Š}‹¸Â‹-˜mŠÍ¸Í‹˜~(ÍŠ}¸ÂŠ}˜-˜MŠ}˜RŠ¸Í˜bªŠ}‹Š‹Š}˜bŠŠrŠ­Š=¸Í¸ÍŠòªý¸Í‹˜mŠý˜r’ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒ¢ð¦gVæ7F–öâö–çe÷F&ÆW2‚’°¢G'’²F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2–çfVçF÷'•ö—FVÕ÷G—W2€¢–B”åBUDõô”ä5$TÔTåB$”Ô%’´U’À¢æÖRd$4„"ƒ#’äõBåTÄÂÀ¢Væ—Bd$4„"ƒ3’åTÄÂÀ¢—5ö7F—fRD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕ ¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“²Ò6F6‚…ÅF‡&÷v&ÆRFR’²W'&÷%öÆör‚w7W&W76VBW†6WF–öã¢râFRÓævWDÖW76vR‚’“²Ð¢G'’²F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E2–çfVçF÷'•÷G&ç6fW'2€¢–B”åBUDõô”ä5$TÔTåB$”Ô%’´U’À¢—FVÕ÷G—Uö–B”åBäõBåTÄÂÀ¢g&öÕ÷W6W%ö–B”åBåTÄÂÀ¢Fõ÷W6W%ö–B”åBäõBåTÄÂÀ¢VçF—G’”åBäõBåTÄÂÀ¢7FGW2d$4„"ƒR’äõBåTÄÂDTdTÅBwVæF–ærrÀ¢G&ç6fW&&ÆRD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢æ÷FRd$4„"ƒ#SR’åTÄÂÀ¢7&VFVEö'’”åBåTÄÂÀ¢7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÀ¢6öæf—&ÖVEöBDDUD”ÔRåTÄÂÀ¢6öæf—&ÖVEö'’”åBåTÄÂÀ¢&V¦V7FVEöBDDUD”ÔRåTÄÂÀ¢”äDU‚–G…ö—Eö—FVÒ†—FVÕ÷G—Uö–B’À¢”äDU‚–G…ö—Eög&öÒ†g&öÕ÷W6W%ö–B’À¢”äDU‚–G…ö—E÷Fò‡Fõ÷W6W%ö–B’À¢”äDU‚–G…ö—E÷7FGW2‡7FGW2¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“²Ò6F6‚…ÅF‡&÷v&ÆRFR’²W'&÷%öÆör‚w7W&W76VBW†6WF–öã¢râFRÓævWDÖW76vR‚’“²Ð¢òòŠ‹Š}¸ÂŠý¸ÍŠ­Š}Š¸Í‹>(Í˜}Š}¸Í¸Âª˜rŠ}¸Í˜bŠÍŠý˜˜B‹Šr›í¸Í‹BŠ}‹"Š}˜‹-˜Šý˜b˜-Š}Š˜M¸ÍŠ¢*½˜]ŠÍ˜‹"Š}˜mŠ­˜-Š}˜B˜]ŠÍŠýŠü+²‹=Š}ŠíŠ­˜~(ÍŠ}˜mŠð¢G'’²F#£§'Vâ‚$ÅDU"D$ÄR–çfVçF÷'•÷G&ç6fW'2DB4ôÅTÔâG&ç6fW&&ÆRD”å””åBƒ’äõBåTÄÂDTdTÅB"“²Ò6F6‚…ÅF‡&÷v&ÆRFR’²ò¢‹=Š­˜˜bŠ}‹"˜-Š˜B˜ŠÍ˜ŠòŠýŠ}‹Šò¢òÐ§Ð¢òò˜]˜ŠÍ˜Šý¸ÂŠ­Š=¸Í¸ÍŠý‹MŠý˜}™B˜}‹ªŠ}‹Š‹Š˜rŠ­˜ª¸Íª’˜m˜‹’˜-˜M˜R˜]ŠÍ˜]˜‹’Šý‹¸ÍŠ}˜Š­¸Î(Í˜}Š}¸ÂŠ­Š=¸Í¸ÍŠý‹MŠý˜r˜]˜m˜}Š}¸Â˜]ŠÍ˜]˜‹’Š­ŠÝ˜¸Í˜M¸Î(Í˜}Š}¸ÂŠ­Š=¸Í¸ÍŠý‹MŠý˜r¢òò˜˜-‹rŠ}˜-˜MŠ}˜]¸Âª˜r˜Š}˜-‹Š}˜²ŠÝŠýŠ}˜-˜B¸Íªž(ÍŠŠ}‹Š˜rŠ}¸Í˜bªŠ}‹Š‹Š­ŠÝ˜¸Í˜BŠýŠ}Šý˜r‹MŠý˜~(ÍŠ}˜mŠò˜m˜]Š}¸Í‹BŠýŠ}Šý˜r˜]¸Î(Í‹M˜˜mŠò˜m˜r˜}˜]˜}™BŠ}˜m˜Š}‹’˜-˜M˜R‹=Š}˜]Š}˜m˜r¢òòG&ç6fW&&ÆUö&Ææ6RÒŠŠí‹M¸ÂŠ}‹"˜]˜ŠÍ˜Šý¸Âª˜rŠ}ŠÍŠ}‹-˜}™BŠ}˜mŠ­˜-Š}˜B˜]ŠÍŠýŠòŠ˜rŠý¸Íªý‹Š}˜b‹ŠrŠýŠ}‹Šð¦gVæ7F–öâö–çeö&Ææ6R‚GW6W$–B’°¢ö–çe÷F&ÆW2‚“°¢&WGW&âF#£¦ÆÂ‚%4TÄT5B—Bæ–B—FVÕ÷G—Uö–BÂ—BææÖRÂ—BçVæ—BÀ¢4ôÄU44R…5TÒ„44Rt„TâBçFõ÷W6W%ö–CÓòäBBç7FGW3Òv6öæf—&ÖVBrD„TâBçVçF—G’TÅ4RTäB’Ã¢Ò4ôÄU44R…5TÒ„44Rt„TâBæg&öÕ÷W6W%ö–CÓòäBBç7FGW3Òv6öæf—&ÖVBrD„TâBçVçF—G’TÅ4RTäB’Ã’2&Ææ6RÀ¢4ôÄU44R…5TÒ„44Rt„TâBçFõ÷W6W%ö–CÓòäBBç7FGW3Òv6öæf—&ÖVBräBBçG&ç6fW&&ÆSÓD„TâBçVçF—G’TÅ4RTäB’Ã¢Ò4ôÄU44R…5TÒ„44Rt„TâBæg&öÕ÷W6W%ö–CÓòäBBç7FGW3Òv6öæf—&ÖVBrD„TâBçVçF—G’TÅ4RTäB’Ã’2G&ç6fW&&ÆUö&Ææ6RÀ¢Ô‚„44Rt„TâBçFõ÷W6W%ö–CÓòD„TâTÅ4RTäB’†5÷&V6V—fV@¢e$ôÒ–çfVçF÷'•ö—FVÕ÷G—W2—@¢ÄTeB¤ô”â–çfVçF÷'•÷G&ç6fW'2BôâBæ—FVÕ÷G—Uö–BÒ—Bæ–@¢t„U$R—Bæ—5ö7F—fSÓ¢u$õU%’—Bæ–BÂ—BææÖRÂ—BçVæ—@¢„d”är†5÷&V6V—fVCÓ¢õ$DU"%’—BææÖR"Â²GW6W$–BÂGW6W$–BÂGW6W$–BÂGW6W$–BÂGW6W$–EÒ“°§Ð¢òò˜]˜ŠÍ˜Šý¸Í™*½˜-Š}Š˜N(ÍŠ}˜mŠ­˜-Š}˜BŠ˜rŠý¸Íªý‹Š}˜l+²¸Íª’ªŠ}‹Š‹Š‹Š}¸Â¸Íª’˜m˜‹’˜-˜M˜R˜]‹MŠí‹RŠ‹Š}¸ÂŠ‹‹‹=¸Â˜}˜mªýŠ}˜RŠ­ŠÝ˜¸Í˜M™˜]ŠÍŠýŠò¦gVæ7F–öâö–çe÷G&ç6fW&&ÆUö&Ææ6R‚GW6W$–BÂF—FVÕG—T–B’°¢ö–çe÷F&ÆW2‚“°¢G&÷rÒF#£¦öæR‚%4TÄT5@¢4ôÄU44R…5TÒ„44Rt„TâFõ÷W6W%ö–CÓòäB7FGW3Òv6öæf—&ÖVBräBG&ç6fW&&ÆSÓD„TâVçF—G’TÅ4RTäB’Ã¢Ò4ôÄU44R…5TÒ„44Rt„Tâg&öÕ÷W6W%ö–CÓòäB7FGW3Òv6öæf—&ÖVBrD„TâVçF—G’TÅ4RTäB’Ã’ ¢e$ôÒ–çfVçF÷'•÷G&ç6fW'2t„U$R—FVÕ÷G—Uö–CÓò"Â²GW6W$–BÂGW6W$–BÂF—FVÕG—T–EÒ“°¢&WGW&â†–çB’‚G&÷u²v"uÒóò“°§Ð ¢òòÒÒÒÒ˜]Šý¸Í‹¸ÍŠ¢Š}˜m˜Š}‹’Š}˜-˜MŠ}˜RŠ}Šý˜]¸Í˜b’ÒÒÒÐ¢òò6†&VBæG&ö–Bõt&VB6öçG&7BâW'6öæÂ–çfVçF÷'’—2Çv—266÷VBFòF†R6W76–öâà§&÷WFR‚ttUBrÂrö’ö–çfVçF÷'’ö&Ææ6RrÆgVæ7F–öâ‚GÂF"ÂGR—·&WGW&â²v—FV×2sÓåö–çeö&Ææ6R‚†–çB’GU²v–BuÒ•Ó·Ò“°§&÷WFR‚ttUBrÂrö’ö–çfVçF÷'’ö—FVÒ×G—W2rÆgVæ7F–öâ‚GÂF"ÂGR—µö–çe÷F&ÆW2‚“·&WGW&â²v—FV×2sÓäF#£¦ÆÂ‚%4TÄT5B–BÆæÖRÇVæ—Be$ôÒ–çfVçF÷'•ö—FVÕ÷G—W2t„U$R—5ö7F—fSÓõ$DU"%’æÖR"•Ó·Ò“°§&÷WFR‚ttUBrÂrö’ö–çfVçF÷'’÷&V6—–VçG2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢&WGW&â²w&öÆW2sÓäF#£¦ÆÂ‚%4TÄT5BD•5D”ä5B"æ–BÇ"çF—FÆRe$ôÒ&öÆW2"¤ô”âW6W'2RôâRç&öÆUö–C×"æ–Bt„U$RRæ—5ö7F—fSÓõ$DU"%’"çF—FÆR"’À¢wW6W'2sÓäF#£¦ÆÂ‚%4TÄT5BRæ–BÇRç&öÆUö–BÅE$”Ò„4ôä4B„4ôÄU44R‡Ræf—'7EöæÖRÂrr’ÂrrÄ4ôÄU44R‡RæÆ7EöæÖRÂrr’’’æÖRÇ"çF—FÆR&öÆU÷F—FÆRe$ôÒW6W'2R¤ô”â&öÆW2"ôâ"æ–C×Rç&öÆUö–Bt„U$RRæ—5ö7F—fSÓäBRæ–CÃãòõ$DU"%’"çF—FÆRÇRæÆ7EöæÖRÇRæf—'7EöæÖR"Å²†–çB’GU²v–BuÕÒ•Ó°§Ò“°§&÷WFR‚ttUBrÂrö’ö–çfVçF÷'’÷VæF–ærrÆgVæ7F–öâ‚GÂF"ÂGR—°¢ö–çe÷F&ÆW2‚“·&WGW&â²v—FV×2sÓäF#£¦ÆÂ‚%4TÄT5BBæ–BÇBçVçF—G’ÇBææ÷FRÇBæ7&VFVEöBÇBçG&ç6fW&&ÆRÆ—BææÖR—FVÕöæÖRÆ—BçVæ—BÀ¢E$”Ò„4ôä4B„4ôÄU44R†gRæf—'7EöæÖRÂrr’ÂrrÄ4ôÄU44R†gRæÆ7EöæÖRÂrr’’’g&öÕöæÖP¢e$ôÒ–çfVçF÷'•÷G&ç6fW'2B¤ô”â–çfVçF÷'•ö—FVÕ÷G—W2—Bôâ—Bæ–C×Bæ—FVÕ÷G—Uö–BÄTeB¤ô”âW6W'2gRôâgRæ–C×Bæg&öÕ÷W6W%ö–@¢t„U$RBçFõ÷W6W%ö–CÓòäBBç7FGW3ÒwVæF–ærrõ$DU"%’Bæ7&VFVEöBDU42ÇBæ–BDU42"Å²†–çB’GU²v–BuÕÒ•Ó°§Ò“°§&÷WFR‚ttUBrÂrö’ö–çfVçF÷'’ö†—7F÷'’rÆgVæ7F–öâ‚GÂF"ÂGR—°¢ö–çe÷F&ÆW2‚“·&WGW&â²v—FV×2sÓäF#£¦ÆÂ‚%4TÄT5BBæ–BÇBçVçF—G’ÇBææ÷FRÇBç7FGW2ÇBæ7&VFVEöBÇBæ6öæf—&ÖVEöBÇBç&V¦V7FVEöBÇBçG&ç6fW&&ÆRÆ—BææÖR—FVÕöæÖRÆ—BçVæ—BÀ¢E$”Ò„4ôä4B„4ôÄU44R†gRæf—'7EöæÖRÂrr’ÂrrÄ4ôÄU44R†gRæÆ7EöæÖRÂrr’’’g&öÕöæÖRÀ¢E$”Ò„4ôä4B„4ôÄU44R‡GRæf—'7EöæÖRÂrr’ÂrrÄ4ôÄU44R‡GRæÆ7EöæÖRÂrr’’’FõöæÖP¢e$ôÒ–çfVçF÷'•÷G&ç6fW'2B¤ô”â–çfVçF÷'•ö—FVÕ÷G—W2—Bôâ—Bæ–C×Bæ—FVÕ÷G—Uö–BÄTeB¤ô”âW6W'2gRôâgRæ–C×Bæg&öÕ÷W6W%ö–B¤ô”âW6W'2GRôâGRæ–C×BçFõ÷W6W%ö–@¢t„U$RBæg&öÕ÷W6W%ö–CÓòõ"BçFõ÷W6W%ö–CÓòõ$DU"%’Bæ7&VFVEöBDU42ÇBæ–BDU42Ä”Ô•BS"Å²†–çB’GU²v–BuÒÂ†–çB’GU²v–BuÕÒ•Ó°§Ò“°§&÷WFR‚ttUBrÂrö’öFÖ–âö–çfVçF÷'’ö—FVÒ×G—W2rÆgVæ7F–öâ‚GÂF"ÂGR—²ö–çe÷F&ÆW2‚“²&WGW&â²v—FV×2sÓäF#£¦ÆÂ‚%4TÄT5B¢e$ôÒ–çfVçF÷'•ö—FVÕ÷G—W2õ$DU"%’—5ö7F—fRDU42ÆæÖR"•Ó²ÒÆfÇ6RÄDÔ”â“°§&÷WFR‚uõ5BrÂrö’öFÖ–âö–çfVçF÷'’ö—FVÒ×G—W2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢ö–çe÷F&ÆW2‚“°¢FæÖRÒG&–Ò‚F%²væÖRuÒóòrr“²–b‚FæÖSÓÓÒrr’‡GG£¦W'&÷"‚}˜mŠ}˜R˜-˜M˜RŠ}˜M‹-Š}˜]¸ÂŠ}‹=Š¢rÃC#"“°¢F#£§'Vâ‚$”å4U%B”åDò–çfVçF÷'•ö—FVÕ÷G—W2†æÖRÇVæ—B’dÅTU2ƒòÃò’"Â²FæÖRÂG&–Ò‚F%²wVæ—BuÒóòrr’ó¢çVÆÅÒ“°¢&WGW&â²vö²sÓçG'VUÓ°§ÒÆfÇ6RÄDÔ”â“°§&÷WFR‚uUBrÂrö’öFÖ–âö–çfVçF÷'’ö—FVÒ×G—W2÷¶–GÒrÆgVæ7F–öâ‚GÂF"ÂGR—°¢ö–çe÷F&ÆW2‚“°¢FæÖRÒG&–Ò‚F%²væÖRuÒóòrr“²GVæ—BÒG&–Ò‚F%²wVæ—BuÒóòrr’ó¢çVÆÃ²F7F—fRÒ'&•ö¶W•öW†—7G2‚v—5ö7F—fRrÂF"’ò†–çB’F%²v—5ö7F—fRuÒ¢°¢F#£§'Vâ‚%UDDR–çfVçF÷'•ö—FVÕ÷G—W24UBæÖSÔ4ôÄU44R„åTÄÄ”bƒòÂrr’ÆæÖR’ÂVæ—CÓòÂ—5ö7F—fSÓòt„U$R–CÓò"Â²FæÖRÂGVæ—BÂF7F—fRÂ†–çB’G²v–BuÕÒ“°¢&WGW&â²vö²sÓçG'VUÓ°§ÒÆfÇ6RÄDÔ”â“° ¢òò˜Š}ªý‹Š}‹¸ÂŠ}˜˜M¸Í˜}™BŠ}Šý˜]¸Í˜bŠ˜r¸Íª’‹MŠí‹]‰²˜]Š½˜B˜}‹Š­ŠÝ˜¸Í˜BŠý¸Íªý‹ˆÂ˜m¸ÍŠ}‹-˜]˜mŠòŠ­Š=¸Í¸ÍŠòªý¸Í‹˜mŠý˜rŠý‹Š‹˜mŠ}˜]˜rŠ}‹=Š §&÷WFR‚uõ5BrÂrö’öFÖ–âö–çfVçF÷'’ö76–vârÆgVæ7F–öâ‚GÂF"ÂGR—°¢ö–çe÷F&ÆW2‚“°¢F—FVÕG—T–CÒ†–çB’‚F%²v—FVÕ÷G—Uö–BuÓóó“²GFõW6W#Ò†–çB’‚F%²wFõ÷W6W%ö–BuÓóó“²GG“Ò†–çB’‚F%²wVçF—G’uÓóó“°¢GG&ç6fW&&ÆRÒ'&•ö¶W•öW†—7G2‚wG&ç6fW&&ÆRrÂF"’ò†–çB’F%²wG&ç6fW&&ÆRuÒ¢°¢–b‚F—FVÕG—T–BÇÂGFõW6W"ÇÂGG“ÓÓÓ’‡GG£¦W'&÷"‚}Š}‹}˜MŠ}‹Š}Š¢˜mŠ}˜-‹RŠ}‹=Š¢rÃC#"“°¢–b‚F#£¦öæR‚%4TÄT5B–Be$ôÒ–çfVçF÷'•ö—FVÕ÷G—W2t„U$R–CÓòäB—5ö7F—fSÓ"Å²F—FVÕG—T–EÒ’’‡GG£¦W'&÷"‚}˜m˜‹’˜-˜M˜R˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÃC#"“°¢–b‚F#£¦öæR‚%4TÄT5B–Be$ôÒW6W'2t„U$R–CÓòäB—5ö7F—fSÓ"Å²GFõW6W%Ò’’‡GG£¦W'&÷"‚}ªŠ}‹Š‹ªý¸Í‹˜mŠý˜r˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÃC#"“°¢F#£§'Vâ‚$”å4U%B”åDò–çfVçF÷'•÷G&ç6fW'2†—FVÕ÷G—Uö–BÆg&öÕ÷W6W%ö–BÇFõ÷W6W%ö–BÇVçF—G’Ç7FGW2ÇG&ç6fW&&ÆRÆæ÷FRÆ7&VFVEö'’’dÅTU2ƒòÄåTÄÂÃòÃòÂwVæF–ærrÃòÃòÃò’"À¢²F—FVÕG—T–BÂGFõW6W"ÂGG’ÂGG&ç6fW&&ÆRÇG&–Ò‚F%²væ÷FRuÓóòrr“ó¦çVÆÂÂ†–çB’GU²v–BuÕÒ“°¢G'’²W6ƒ£¦æ÷F–g’…²GFõW6W%ÒÂ}Š}˜-˜MŠ}˜RŠ­ŠÝ˜¸Í˜M¸ÂŠÍŠý¸ÍŠòrÂ}¸Íª’˜-˜M˜RŠ‹Š}¸ÂŠ­Š=¸Í¸ÍŠòŠý‹¸ÍŠ}˜Š¢Š­˜‹=‹r˜]Šý¸Í‹‹=Š}˜]Š}˜m˜rŠ˜r‹M˜]Šr˜Š}ªý‹Š}‹‹MŠý˜rŠ}‹=Š¢ârÅ²wG—RsÓâv–çfVçF÷'•ö76–væVBuÒ“²Ò6F6‚…ÅF‡&÷v&ÆRFR’²W'&÷%öÆör‚w7W&W76VBW†6WF–öã¢râFRÓævWDÖW76vR‚’“²Ð¢&WGW&â²vö²sÓçG'VUÓ°§ÒÆfÇ6RÄDÔ”â“° ¢òòŠý˜Š­‹ª˜BŠ­ŠÝ˜¸Í˜N(Í˜}ŠrŠ‹Š}¸Âªý‹-Š}‹‹N(Íªý¸Í‹¸ÂŠý‹›í˜m˜B˜¸Í˜MŠ­‹Š‹Š}‹=Š}‹2˜m˜‹’˜-˜M˜R˜‚ŠŠ}‹-˜}™B‹-˜]Š}˜m¸Â§&÷WFR‚ttUBrÂrö’öFÖ–âö–çfVçF÷'’öÆVFvW"rÆgVæ7F–öâ‚GÂF"ÂGR—°¢ö–çe÷F&ÆW2‚“°¢F3Õ²'Bç7FGW3Òv6öæf—&ÖVBr%Ó²G#ÕµÓ°¢–b‚V×G’‚EôtUE²v—FVÕ÷G—Uö–BuÒ’’²F5µÓÒwBæ—FVÕ÷G—Uö–CÓòs²G%µÓÒ†–çB’EôtUE²v—FVÕ÷G—Uö–BuÓ²Ð¢–b‚V×G’‚EôtUE²vg&öÒuÒ’’²F5µÓÒwBæ6öæf—&ÖVEöBãÒòs²G%µÓÒEôtUE²vg&öÒuÒâr££s²Ð¢–b‚V×G’‚EôtUE²wFòuÒ’’²F5µÓÒwBæ6öæf—&ÖVEöBÃÒòs²G%µÓÒEôtUE²wFòuÒâr#3£S“£S’s²Ð¢Gv†W&RÒ–×ÆöFR‚räBrÂF2“°¢G&÷w2ÒF#£¦ÆÂ‚%4TÄT5BBæ–BÇBçVçF—G’ÇBææ÷FRÇBæ7&VFVEöBÇBæ6öæf—&ÖVEöBÇBçG&ç6fW&&ÆRÆ—BææÖR—FVÕöæÖRÆ—BçVæ—BÀ¢E$”Ò„4ôä4B„4ôÄU44R†gRæf—'7EöæÖRÂrr’ÂrrÄ4ôÄU44R†gRæÆ7EöæÖRÂrr’’’g&öÕöæÖRÀ¢E$”Ò„4ôä4B„4ôÄU44R‡GRæf—'7EöæÖRÂrr’ÂrrÄ4ôÄU44R‡GRæÆ7EöæÖRÂrr’’’FõöæÖP¢e$ôÒ–çfVçF÷'•÷G&ç6fW'2B¤ô”â–çfVçF÷'•ö—FVÕ÷G—W2—Bôâ—Bæ–C×Bæ—FVÕ÷G—Uö–@¢ÄTeB¤ô”âW6W'2gRôâgRæ–C×Bæg&öÕ÷W6W%ö–B¤ô”âW6W'2GRôâGRæ–C×BçFõ÷W6W%ö–@¢t„U$RGv†W&Rõ$DU"%’Bæ7&VFVEöBDU42ÇBæ–BDU42Ä”Ô•BS"ÂG"“°¢f÷&V6‚‚G&÷w22bG#2’²G#5²v7&VFVEöEöfuÒÒföFFWF–ÖR‚G#5²v7&VFVEöBuÒ“²G#5²v6öæf—&ÖVEöEöfuÒÒföFFWF–ÖR‚G#5²v6öæf—&ÖVEöBuÒ“²ÒVç6WB‚G#2“°¢&WGW&â²v—FV×2sÓâG&÷w5Ó°§Ò“°¢òòŠ­ŠÝ˜¸Í˜BŠ­‹ŠýŠ}Šý¸ÂŠ}‹"˜]˜ŠÍ˜Šý¸Í™Š­Š=¸Í¸ÍŠý‹MŠý˜}™BŠí˜Šý˜RŠ˜r‹MŠí‹RŠý¸Íªý‹˜m¸ÍŠ}‹-˜]˜mŠòŠ­Š=¸Í¸ÍŠòªý¸Í‹˜mŠý˜r§&÷WFR‚uõ5BrÂrö’ö–çfVçF÷'’öFVÆ—fW"rÆgVæ7F–öâ‚GÂF"ÂGR—°¢ö–çe÷F&ÆW2‚“°¢F—FVÕG—T–CÒ†–çB’‚F%²v—FVÕ÷G—Uö–BuÓóó“²GFõW6W#Ò†–çB’‚F%²wFõ÷W6W%ö–BuÓóó“²GG“Ò†–çB’‚F%²wVçF—G’uÓóó“°¢òòŠ-¸ÍŠrŠí˜Šý™ªý¸Í‹˜mŠý˜}™BŠÍŠý¸ÍŠò˜]ŠÍŠ}‹"Š}‹=Š¢Š}¸Í˜b˜-˜M˜R‹ŠrŠŠ}‹"˜}˜RŠ˜r‹MŠí‹RŠý¸Íªý‹¸Â˜]˜mŠ­˜-˜Bª˜mŠý‰ò›í¸Í‹N(Í˜‹‹c¢Š˜M˜p¢GG&ç6fW&&ÆRÒ'&•ö¶W•öW†—7G2‚wG&ç6fW&&ÆRrÂF"’ò†–çB’F%²wG&ç6fW&&ÆRuÒ¢°¢–b‚F—FVÕG—T–BÇÂGFõW6W"ÇÂGG“ÓÓÓ’‡GG£¦W'&÷"‚}Š}‹}˜MŠ}‹Š}Š¢˜mŠ}˜-‹RŠ}‹=Š¢rÃC#"“°¢–b‚GFõW6W"ÓÓÒ†–çB’GU²v–BuÒ’‡GG£¦W'&÷"‚}˜m˜]¸Î(ÍŠ­˜Š}˜m¸ÍŠòŠ˜rŠí˜ŠýŠ­Š}˜bŠ­ŠÝ˜¸Í˜BŠý˜}¸ÍŠòrÃC#"“°¢–b‚F#£¦öæR‚%4TÄT5B–Be$ôÒ–çfVçF÷'•ö—FVÕ÷G—W2t„U$R–CÓòäB—5ö7F—fSÓ"Å²F—FVÕG—T–EÒ’’‡GG£¦W'&÷"‚}˜m˜‹’˜-˜M˜R˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÃC#"“°¢–b‚F#£¦öæR‚%4TÄT5B–Be$ôÒW6W'2t„U$R–CÓòäB—5ö7F—fSÓ"Å²GFõW6W%Ò’’‡GG£¦W'&÷"‚}ªŠ}‹Š‹ªý¸Í‹˜mŠý˜r˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÃC#"“°¢–b‚GG’â’°¢òò˜˜-‹rŠŠí‹M¸ÂŠ}‹"˜]˜ŠÍ˜Šý¸Âª˜rŠí˜Šý™Š}¸Í˜bªŠ}‹Š‹Š}ŠÍŠ}‹-˜}™BŠ}˜mŠ­˜-Š}˜B˜]ŠÍŠýŠòŠ-˜b‹ŠrŠýŠ}‹Šò˜-Š}Š˜BŠ­ŠÝ˜¸Í˜BŠ˜rŠý¸Íªý‹¸ÂŠ}‹=Š ¢F&ÂÒö–çe÷G&ç6fW&&ÆUö&Ææ6R‚†–çB’GU²v–BuÒÂF—FVÕG—T–B“°¢–b‚GG’âF&Â’‡GG£¦W'&÷"‚-˜]˜ŠÍ˜Šý¸Í™˜-Š}Š˜N(ÍŠ}˜mŠ­˜-Š}˜M™‹M˜]ŠrªŠ}˜¸Â˜m¸Í‹=Š¢˜]˜ŠÍ˜Šý¸Â˜-Š}Š˜N(ÍŠ}˜mŠ­˜-Š}˜B˜‹˜M¸Ã¢²F&ÇÒ’"ÃC#"“°¢Ð¢F#£§'Vâ‚$”å4U%B”åDò–çfVçF÷'•÷G&ç6fW'2†—FVÕ÷G—Uö–BÆg&öÕ÷W6W%ö–BÇFõ÷W6W%ö–BÇVçF—G’Ç7FGW2ÇG&ç6fW&&ÆRÆæ÷FRÆ7&VFVEö'’’dÅTU2ƒòÃòÃòÃòÂwVæF–ærrÃòÃòÃò’"À¢²F—FVÕG—T–BÂ†–çB’GU²v–BuÒÂGFõW6W"ÂGG’ÂGG&ç6fW&&ÆRÇG&–Ò‚F%²væ÷FRuÓóòrr“ó¦çVÆÂÂ†–çB’GU²v–BuÕÒ“°¢G'’²W6ƒ£¦æ÷F–g’…²GFõW6W%ÒÂ}Š}˜-˜MŠ}˜RŠ­ŠÝ˜¸Í˜M¸ÂŠÍŠý¸ÍŠòrÇG&–Ò‚‚GU²vf—'7EöæÖRuÓóòrr’ârrâ‚GU²vÆ7EöæÖRuÓóòrr’’ârŠ}˜-˜MŠ}˜]¸Â‹ŠrŠ‹Š}¸ÂŠ­Š=¸Í¸ÍŠòŠý‹¸ÍŠ}˜Š¢Š˜r‹M˜]ŠrŠ­ŠÝ˜¸Í˜BŠýŠ}Šý˜rŠ}‹=Š¢ârÅ²wG—RsÓâv–çfVçF÷'•ö76–væVBuÒ“²Ò6F6‚…ÅF‡&÷v&ÆRFR’²W'&÷%öÆör‚w7W&W76VBW†6WF–öã¢râFRÓævWDÖW76vR‚’“²Ð¢&WGW&â²vö²sÓçG'VUÓ°§Ò“°¢òòŠ­Š=¸Í¸ÍŠòŠý‹¸ÍŠ}˜Š¢¸Íª’Š­ŠÝ˜¸Í˜BŠ­˜‹=‹rªý¸Í‹˜mŠý˜r˜˜-‹rŠí˜Šòªý¸Í‹˜mŠý˜r˜]ŠÍŠ}‹"Š}‹=Š¢§&÷WFR‚uõ5BrÂrö’ö–çfVçF÷'’ö6öæf—&Ò÷¶–GÒrÆgVæ7F–öâ‚GÂF"ÂGR—°¢ö–çe÷F&ÆW2‚“°¢GBÒF#£¦öæR‚%4TÄT5B¢e$ôÒ–çfVçF÷'•÷G&ç6fW'2t„U$R–CÓò"Å²†–çB’G²v–BuÕÒ“°¢–b‚GB’‡GG£¦W'&÷"‚}¸ÍŠ}˜Š¢˜m‹MŠòrÃCB“°¢–b‚†–çB’GE²wFõ÷W6W%ö–BuÒÓÒ†–çB’GU²v–BuÒ’‡GG£¦W'&÷"‚}Š}ŠÍŠ}‹-˜}™BŠ­Š=¸Í¸ÍŠòŠ}¸Í˜bŠ­ŠÝ˜¸Í˜B‹Šr˜mŠýŠ}‹¸ÍŠòrÃC2“°¢–b‚GE²w7FGW2uÒÓÒwVæF–ærr’‡GG£¦W'&÷"‚}Š}¸Í˜bŠ­ŠÝ˜¸Í˜B˜-Š˜MŠ}˜²Š‹‹‹=¸Â‹MŠý˜rŠ}‹=Š¢rÃC#"“°¢F#£§'Vâ‚%UDDR–çfVçF÷'•÷G&ç6fW'24UB7FGW3Òv6öæf—&ÖVBrÂ6öæf—&ÖVEöCÔäõr‚’Â6öæf—&ÖVEö'“Óòt„U$R–CÓò"Å²†–çB’GU²v–BuÒÂ†–çB’G²v–BuÕÒ“°¢F#£§'Vâ‚$”å4U%B”åDò7F—f—G•öÆöw2‡W6W%ö–BÆWfVçBÆÖWF’dÅTU2ƒòÂv–çfVçF÷'•ö6öæf—&ÖVBrÂò’"Å²†–çB’GU²v–BuÒÂ§6öåöVæ6öFR…²wG&ç6fW%ö–BsÓâ†–çB’G²v–BuÕÒÂ¥4ôåõTäU44TEõTä”4ôDR•Ò“°¢–b‚V×G’‚GE²vg&öÕ÷W6W%ö–BuÒ’’²G'’²W6ƒ£¦æ÷F–g’…²†–çB’GE²vg&öÕ÷W6W%ö–BuÕÒÂ}Š­Š=¸Í¸ÍŠòŠý‹¸ÍŠ}˜Š¢Š}˜-˜MŠ}˜RrÇG&–Ò‚‚GU²vf—'7EöæÖRuÓóòrr’ârrâ‚GU²vÆ7EöæÖRuÓóòrr’’ârŠý‹¸ÍŠ}˜Š¢Š}˜-˜MŠ}˜R‹ŠrŠ­Š=¸Í¸ÍŠòª‹ŠòârÅ²wG—RsÓâv–çfVçF÷'•ö6öæf—&ÖVBuÒ“²Ò6F6‚…ÅF‡&÷v&ÆRFR’²W'&÷%öÆör‚w7W&W76VBW†6WF–öã¢râFRÓævWDÖW76vR‚’“²ÒÐ¢&WGW&â²vö²sÓçG'VUÓ°§Ò“°¢òò‹Šò¸Íª’Š­ŠÝ˜¸Í˜BŠ­˜‹=‹rªý¸Í‹˜mŠý˜r˜]Š½˜MŠ}˜²Šý‹‹]˜‹Š¢Š}‹MŠ­ŠŠ}˜rŠ˜Šý˜b§&÷WFR‚uõ5BrÂrö’ö–çfVçF÷'’÷&V¦V7B÷¶–GÒrÆgVæ7F–öâ‚GÂF"ÂGR—°¢ö–çe÷F&ÆW2‚“°¢GBÒF#£¦öæR‚%4TÄT5B¢e$ôÒ–çfVçF÷'•÷G&ç6fW'2t„U$R–CÓò"Å²†–çB’G²v–BuÕÒ“°¢–b‚GB’‡GG£¦W'&÷"‚}¸ÍŠ}˜Š¢˜m‹MŠòrÃCB“°¢–b‚†–çB’GE²wFõ÷W6W%ö–BuÒÓÒ†–çB’GU²v–BuÒ’‡GG£¦W'&÷"‚}Š}ŠÍŠ}‹-˜}™B‹ŠòŠ}¸Í˜bŠ­ŠÝ˜¸Í˜B‹Šr˜mŠýŠ}‹¸ÍŠòrÃC2“°¢–b‚GE²w7FGW2uÒÓÒwVæF–ærr’‡GG£¦W'&÷"‚}Š}¸Í˜bŠ­ŠÝ˜¸Í˜B˜-Š˜MŠ}˜²Š‹‹‹=¸Â‹MŠý˜rŠ}‹=Š¢rÃC#"“°¢F#£§'Vâ‚%UDDR–çfVçF÷'•÷G&ç6fW'24UB7FGW3Òw&V¦V7FVBrÂ&V¦V7FVEöCÔäõr‚’t„U$R–CÓò"Å²†–çB’G²v–BuÕÒ“°¢&WGW&â²vö²sÓçG'VUÓ°§Ò“°   ¢ò¢ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒ‹=‹˜¸Í‹2˜]ŠýŠ}‹‹2ÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÒ¢ð¦gVæ7F–öâ÷77e÷F&ÆW2‚—°¢7FF–2FFöæSÖfÇ6S²–b‚FFöæR’&WGW&ã²FFöæS×G'VS°¢G7ÃÕ°¢$5$TDRD$ÄR”bäõBU„•5E266†ööÅ÷6W'f–6Uö6ö×æ–W2€¢–B”åBUDõô”ä5$TÔTåB$”Ô%’´U’À¢æÖRd$4„"ƒ#SR’äõBåTÄÂÀ¢ÖævW%öæÖRd$4„"ƒS’åTÄÂÀ¢†öæRd$4„"ƒS’åTÄÂÀ¢FG&W72d$4„"ƒS’åTÄÂÀ¢ÖævW%öÖö&–ÆRd$4„"ƒ3’åTÄÂÀ¢ÆæFÆ–æU÷†öæRd$4„"ƒ3’åTÄÂÀ¢ÆF—GVFRDT4”ÔÂƒÃr’åTÄÂÀ¢Æöæv—GVFRDT4”ÔÂƒÃr’åTÄÂÀ¢&Vv—7FW&VE÷66†ööÅö6÷VçB”åBäõBåTÄÂDTdTÅBÀ¢&W&W6VçFF—fUö6÷VçB”åBäõBåTÄÂDTdTÅBÀ¢7FGW2d$4„"ƒ3’äõBåTÄÂDTdTÅB}˜‹Š}˜BrÀ¢&öf–ÆUö6ö×ÆWFRD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢—5ö7F—fRD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÀ¢WFFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕôâUDDR5U%$TåEõD”ÔU5DÕÀ¢Tä•TR´U’W÷765öæÖR†æÖR’À¢´U’–G…÷765ö7F—fR†—5ö7F—fR¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"À¢$5$TDRD$ÄR”bäõBU„•5E266†ööÅ÷6W'f–6U÷66†ööÇ2€¢–B”åBUDõô”ä5$TÔTåB$”Ô%’´U’À¢6öFRd$4„"ƒƒ’åTÄÂÀ¢æÖRd$4„"ƒ#SR’äõBåTÄÂÀ¢VGV6F–öæÅöF—7G&–7Bd$4„"ƒƒ’åTÄÂÀ¢vVæFW"TåTÒ‚}ŠýŠíŠ­‹Š}˜m˜rrÂ}›í‹=‹Š}˜m˜rrÂ}˜mŠ}˜]‹MŠí‹Rr’äõBåTÄÂDTdTÅB}˜mŠ}˜]‹MŠí‹RrÀ¢6†–gBd$4„"ƒƒ’åTÄÂÀ¢VGV6F–öåöÆWfVÂd$4„"ƒS’åTÄÂÀ¢66†ööÅ÷G—Rd$4„"ƒS’åTÄÂÀ¢7F—f—G•÷7F'Bd$4„"ƒ#’åTÄÂÀ¢7F—f—G•öVæBd$4„"ƒ#’åTÄÂÀ¢Ö÷&æ–æu÷7F'Bd$4„"ƒ#’åTÄÂÀ¢Ö÷&æ–æuöVæBd$4„"ƒ#’åTÄÂÀ¢gFW&æööå÷7F'Bd$4„"ƒ#’åTÄÂÀ¢gFW&æööåöVæBd$4„"ƒ#’åTÄÂÀ¢G&—fW%ö6÷VçB”åBåTÄÂÀ¢7GVFVçEö6÷VçB”åBåTÄÂÀ¢FG&W72d$4„"ƒs’åTÄÂÀ¢†öæRd$4„"ƒƒ’åTÄÂÀ¢ÆF—GVFRDT4”ÔÂƒÃr’åTÄÂÀ¢Æöæv—GVFRDT4”ÔÂƒÃr’åTÄÂÀ¢7FGW2d$4„"ƒƒ’äõBåTÄÂDTdTÅB}Š½ŠŠ®(Í‹MŠý˜rrÀ¢Æö6F–öå÷&Vv—7FW&VEöBDDUD”ÔRåTÄÂÀ¢—5ö7F—fRD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÀ¢WFFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕôâUDDR5U%$TåEõD”ÔU5DÕÀ¢Tä•TR´U’W÷775ö6öFR†6öFR’À¢´U’–G…÷775öæÖR†æÖR’À¢´U’–G…÷775öF—7G&–7B†VGV6F–öæÅöF—7G&–7B¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"À¢$5$TDRD$ÄR”bäõBU„•5E266†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W2€¢66†ööÅö–B”åBäõBåTÄÂÀ¢6ö×ç•ö–B”åBäõBåTÄÂÀ¢—5÷&–Ö'’D”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÀ¢$”Ô%’´U’‡66†ööÅö–BÆ6ö×ç•ö–B’À¢´U’–G…÷7765ö6ö×ç’†6ö×ç•ö–B’À¢4ôå5E$”åBfµ÷7765÷66†ööÂdõ$T”tâ´U’‡66†ööÅö–B’$TdU$Tä4U266†ööÅ÷6W'f–6U÷66†ööÇ2†–B’ôâDTÄUDR444DRÀ¢4ôå5E$”åBfµ÷7765ö6ö×ç’dõ$T”tâ´U’†6ö×ç•ö–B’$TdU$Tä4U266†ööÅ÷6W'f–6Uö6ö×æ–W2†–B’ôâDTÄUDR444DP¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"À¢$5$TDRD$ÄR”bäõBU„•5E266†ööÅ÷6W'f–6U÷f–öÆF–öå÷G—W2€¢–B”åBUDõô”ä5$TÔTåB$”Ô%’´U’À¢F—FÆRd$4„"ƒ#SR’äõBåTÄÂTä•TRÀ¢—5ö7F—fRD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢6÷'Eö÷&FW"”åBäõBåTÄÂDTdTÅB ¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"À¢$5$TDRD$ÄR”bäõBU„•5E266†ööÅ÷6W'f–6Uö–ç7V7F–öç2€¢–B$”t”åBUDõô”ä5$TÔTåB$”Ô%’´U’À¢–ç7V7F÷%÷W6W%ö–B”åBäõBåTÄÂÀ¢6Æ–VçE÷WV–Bd$4„"ƒcB’åTÄÂÀ¢VGV6F–öæÅöF—7G&–7Bd$4„"ƒƒ’åTÄÂÀ¢6ö×ç•ö–B”åBåTÄÂÀ¢66†ööÅö–B”åBåTÄÂÀ¢66†ööÅövVæFW"TåTÒ‚}ŠýŠíŠ­‹Š}˜m˜rrÂ}›í‹=‹Š}˜m˜rrÂ}˜mŠ}˜]‹MŠí‹Rr’äõBåTÄÂDTdTÅB}˜mŠ}˜]‹MŠí‹RrÀ¢ÆFU÷F‡&VRd$4„"ƒ2’åTÄÂÀ¢ÆFUöÆWGFW"d$4„"ƒR’åTÄÂÀ¢ÆFU÷Gvòd$4„"ƒ"’åTÄÂÀ¢—&åö6öFRd$4„"ƒR’äõBåTÄÂDTdTÅB}Š}¸Í‹Š}˜brÀ¢ÆFU÷&Vv–öåö6öFRd$4„"ƒ"’åTÄÂÀ¢fV†–6ÆU÷G—Rd$4„"ƒ’åTÄÂÀ¢fV†–6ÆUö6öÆ÷"d$4„"ƒƒ’åTÄÂÀ¢76VævW%ö6÷VçB”åBäõBåTÄÂDTdTÅBÀ¢76VævW%ög&öçEö6÷VçB”åBäõBåTÄÂDTdTÅBÀ¢76VævW%÷&V%ö6÷VçB”åBäõBåTÄÂDTdTÅBÀ¢G&—fW%övVæFW"TåTÒ‚}ŠíŠ}˜m˜RrÂ}Š-˜-ŠrrÂ}˜mŠ}˜]‹MŠí‹Rr’äõBåTÄÂDTdTÅB}˜mŠ}˜]‹MŠí‹RrÀ¢6W'F–f–6FU÷7FGW2TåTÒ‚}˜]‹Š­Š‹rÂ}˜mŠ}˜]‹Š­Š‹rÂ}Š}‹Š}Šm˜r˜m‹MŠòr’äõBåTÄÂDTdTÅB}Š}‹Š}Šm˜r˜m‹MŠòrÀ¢f–öÆF–öåöFFRd$4„"ƒ#’åTÄÂÀ¢f–öÆF–öå÷F–ÖRd$4„"ƒ’åTÄÂÀ¢Æö6F–öå÷FW‡Bd$4„"ƒs’åTÄÂÀ¢ÆF—GVFRDT4”ÔÂƒÃr’åTÄÂÀ¢Æöæv—GVFRDT4”ÔÂƒÃr’åTÄÂÀ¢FW67&—F–öâDU…BåTÄÂÀ¢7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÀ¢WFFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕôâUDDR5U%$TåEõD”ÔU5DÕÀ¢´U’–G…÷76•÷W6W"†–ç7V7F÷%÷W6W%ö–BÆ7&VFVEöB’À¢´U’–G…÷76•ö6ö×ç’†6ö×ç•ö–BÆ7&VFVEöB’À¢´U’–G…÷76•÷66†ööÂ‡66†ööÅö–BÆ7&VFVEöB’À¢´U’–G…÷76•öFFR‡f–öÆF–öåöFFR¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"À¢$5$TDRD$ÄR”bäõBU„•5E266†ööÅ÷6W'f–6Uö–ç7V7F–öå÷f–öÆF–öç2€¢–ç7V7F–öåö–B$”t”åBäõBåTÄÂÀ¢f–öÆF–öå÷G—Uö–B”åBäõBåTÄÂÀ¢$”Ô%’´U’†–ç7V7F–öåö–BÇf–öÆF–öå÷G—Uö–B’À¢´U’–G…÷76—e÷G—R‡f–öÆF–öå÷G—Uö–B’À¢4ôå5E$”åBfµ÷76—eö–ç7V7F–öâdõ$T”tâ´U’†–ç7V7F–öåö–B’$TdU$Tä4U266†ööÅ÷6W'f–6Uö–ç7V7F–öç2†–B’ôâDTÄUDR444DRÀ¢4ôå5E$”åBfµ÷76—e÷G—Rdõ$T”tâ´U’‡f–öÆF–öå÷G—Uö–B’$TdU$Tä4U266†ööÅ÷6W'f–6U÷f–öÆF–öå÷G—W2†–B’ôâDTÄUDR$U5E$”5@¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"À¢$5$TDRD$ÄR”bäõBU„•5E266†ööÅ÷6W'f–6U÷fV†–6ÆW2€¢–B$”t”åBUDõô”ä5$TÔTåB$”Ô%’´U’À¢ÆFU÷Gvòd$4„"ƒ"’äõBåTÄÂÀ¢ÆFUöÆWGFW"d$4„"ƒR’äõBåTÄÂÀ¢ÆFU÷F‡&VRd$4„"ƒ2’äõBåTÄÂÀ¢ÆFU÷&Vv–öåö6öFRd$4„"ƒ"’äõBåTÄÂÀ¢fV†–6ÆU÷G—Rd$4„"ƒ’åTÄÂÀ¢fV†–6ÆUö6öÆ÷"d$4„"ƒƒ’åTÄÂÀ¢76VævW%ög&öçEö6÷VçB”åBäõBåTÄÂDTdTÅBÀ¢76VævW%÷&V%ö6÷VçB”åBäõBåTÄÂDTdTÅBÀ¢G&—fW%övVæFW"TåTÒ‚}ŠíŠ}˜m˜RrÂ}Š-˜-ŠrrÂ}˜mŠ}˜]‹MŠí‹Rr’äõBåTÄÂDTdTÅB}˜mŠ}˜]‹MŠí‹RrÀ¢6W'F–f–6FU÷7FGW2TåTÒ‚}˜]‹Š­Š‹rÂ}˜mŠ}˜]‹Š­Š‹rÂ}Š}‹Š}Šm˜r˜m‹MŠòr’äõBåTÄÂDTdTÅB}Š}‹Š}Šm˜r˜m‹MŠòrÀ¢Æ7Eö–ç7V7F–öåö–B$”t”åBåTÄÂÀ¢Æ7Eö–ç7V7F–öåöBDDUD”ÔRåTÄÂÀ¢—5ö7F—fRD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÀ¢WFFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕôâUDDR5U%$TåEõD”ÔU5DÕÀ¢Tä•TR´U’W÷77e÷ÆFR‡ÆFU÷GvòÇÆFUöÆWGFW"ÇÆFU÷F‡&VRÇÆFU÷&Vv–öåö6öFR’À¢´U’–G…÷77eö7F—fR†—5ö7F—fR’À¢´U’–G…÷77eöÆ7B†Æ7Eö–ç7V7F–öåöB¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"À¢$5$TDRD$ÄR”bäõBU„•5E266†ööÅ÷6W'f–6U÷W&Ö—76–öç2€¢&öÆUö–B”åBäõBåTÄÂ$”Ô%’´U’À¢6å÷f–WrD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢6åö7&VFRD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢6åöVF—BD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢6åöFVÆWFRD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢6åö–×÷'BD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢6å÷&W÷'BD”å””åBƒ’äõBåTÄÂDTdTÅBÀ¢WFFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕôâUDDR5U%$TåEõD”ÔU5DÕ ¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"À¢$5$TDRD$ÄR”bäõBU„•5E266†ööÅ÷6W'f–6UöF—7G&–7G2†–B”åBUDõô”ä5$TÔTåB$”Ô%’´U’ÇF—FÆRd$4„"ƒƒ’äõBåTÄÂTä•TRÆ—5ö7F—fRD”å””åBƒ’äõBåTÄÂDTdTÅBÇ6÷'Eö÷&FW"”åBäõBåTÄÂDTdTÅB’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"À¢$5$TDRD$ÄR”bäõBU„•5E266†ööÅ÷6W'f–6U÷fV†–6ÆU÷G—W2†–B”åBUDõô”ä5$TÔTåB$”Ô%’´U’ÇF—FÆRd$4„"ƒ’äõBåTÄÂTä•TRÆ—5ö7F—fRD”å””åBƒ’äõBåTÄÂDTdTÅBÇ6÷'Eö÷&FW"”åBäõBåTÄÂDTdTÅB’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"À¢$5$TDRD$ÄR”bäõBU„•5E266†ööÅ÷6W'f–6U÷fV†–6ÆUö6öÆ÷'2†–B”åBUDõô”ä5$TÔTåB$”Ô%’´U’ÇF—FÆRd$4„"ƒƒ’äõBåTÄÂTä•TRÆ—5ö7F—fRD”å””åBƒ’äõBåTÄÂDTdTÅBÇ6÷'Eö÷&FW"”åBäõBåTÄÂDTdTÅB’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"À¢$5$TDRD$ÄR”bäõBU„•5E266†ööÅ÷6W'f–6Uö–×÷'EöÆöw2€¢–B$”t”åBUDõô”ä5$TÔTåB$”Ô%’´U’À¢W6W%ö–B”åBåTÄÂÀ¢f–ÆUöæÖRd$4„"ƒ#SR’åTÄÂÀ¢6ö×æ–W5ö6÷VçB”åBäõBåTÄÂDTdTÅBÀ¢66†ööÇ5ö6÷VçB”åBäõBåTÄÂDTdTÅBÀ¢Ö–æw5ö6÷VçB”åBäõBåTÄÂDTdTÅBÀ¢W'&÷'5ö6÷VçB”åBäõBåTÄÂDTdTÅBÀ¢W'&÷'5÷FW‡BÄôäuDU…BåTÄÂÀ¢7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕ ¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"À¢$5$TDRD$ÄR”bäõBU„•5E266†ööÅ÷6W'f–6Uö–ç7V7F–öå÷†÷F÷2€¢–B$”t”åBUDõô”ä5$TÔTåB$”Ô%’´U’À¢–ç7V7F–öåö–B$”t”åBäõBåTÄÂÀ¢f–ÆU÷F‚d$4„"ƒS’äõBåTÄÂÀ¢Ö–ÖU÷G—Rd$4„"ƒƒ’äõBåTÄÂDTdTÅBv–ÖvRö§VrrÀ¢v–GF‚”åBåTÄÂÀ¢†V–v‡B”åBåTÄÂÀ¢f–ÆU÷6—¦R”åBäõBåTÄÂDTdTÅBÀ¢7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÀ¢´U’–G…÷76—ö–ç7V7F–öâ†–ç7V7F–öåö–B’À¢4ôå5E$”åBfµ÷76—ö–ç7V7F–öâdõ$T”tâ´U’†–ç7V7F–öåö–B’$TdU$Tä4U266†ööÅ÷6W'f–6Uö–ç7V7F–öç2†–B’ôâDTÄUDR444DP¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"À¢Ó°¢f÷&V6‚‚G7Â2G—·G'—´F#£§'Vâ‚G“·Ö6F6‚…F‡&÷v&ÆRFR—¶W'&÷%öÆör‚w66†ööÂ×6W'f–6RF&ÆS¢râFRÓævWDÖW76vR‚’“·×Ð¢òòŠ­ª˜]¸Í˜B‹=Š}ŠíŠ­Š}‹›í‹˜˜Š}¸Í˜B‹M‹ªŠ®(Í˜}ŠrŠ‹Š}¸Â˜m‹]ŠŽ(Í˜}Š}¸Â˜-Šý¸Í˜]¸À¢f÷&V6‚…°¢$ÅDU"D$ÄR66†ööÅ÷6W'f–6Uö6ö×æ–W2DB4ôÅTÔâÖævW%öÖö&–ÆRd$4„"ƒ3’åTÄÂ"À¢$ÅDU"D$ÄR66†ööÅ÷6W'f–6Uö6ö×æ–W2DB4ôÅTÔâÆæFÆ–æU÷†öæRd$4„"ƒ3’åTÄÂ"À¢$ÅDU"D$ÄR66†ööÅ÷6W'f–6Uö6ö×æ–W2DB4ôÅTÔâÆF—GVFRDT4”ÔÂƒÃr’åTÄÂ"À¢$ÅDU"D$ÄR66†ööÅ÷6W'f–6Uö6ö×æ–W2DB4ôÅTÔâÆöæv—GVFRDT4”ÔÂƒÃr’åTÄÂ"À¢$ÅDU"D$ÄR66†ööÅ÷6W'f–6Uö6ö×æ–W2DB4ôÅTÔâ&Vv—7FW&VE÷66†ööÅö6÷VçB”åBäõBåTÄÂDTdTÅB"À¢$ÅDU"D$ÄR66†ööÅ÷6W'f–6Uö6ö×æ–W2DB4ôÅTÔâ&W&W6VçFF—fUö6÷VçB”åBäõBåTÄÂDTdTÅB"À¢$ÅDU"D$ÄR66†ööÅ÷6W'f–6Uö6ö×æ–W2DB4ôÅTÔâ7FGW2d$4„"ƒ3’äõBåTÄÂDTdTÅB}˜‹Š}˜Br"À¢$ÅDU"D$ÄR66†ööÅ÷6W'f–6Uö6ö×æ–W2DB4ôÅTÔâ&öf–ÆUö6ö×ÆWFRD”å””åBƒ’äõBåTÄÂDTdTÅB ¢Ò2G—·G'—´F#£§'Vâ‚G“·Ö6F6‚…F‡&÷v&ÆRFR—·×Ð¢òòŠ­ª˜]¸Í˜B‹=Š}ŠíŠ­Š}‹Š}‹}˜MŠ}‹Š}Š¢˜]ŠýŠ}‹‹2Š‹Š}¸Â6VVB˜‚˜m‹]ŠŽ(Í˜}Š}¸Â˜-Šý¸Í˜]¸Âà¢f÷&V6‚…°¢²w66†ööÅ÷6W'f–6U÷66†ööÇ2rÂw6†–gBrÂud$4„"ƒƒ’åTÄÂuÒÀ¢²w66†ööÅ÷6W'f–6U÷66†ööÇ2rÂvVGV6F–öåöÆWfVÂrÂud$4„"ƒS’åTÄÂuÒÀ¢²w66†ööÅ÷6W'f–6U÷66†ööÇ2rÂw66†ööÅ÷G—RrÂud$4„"ƒS’åTÄÂuÒÀ¢²w66†ööÅ÷6W'f–6U÷66†ööÇ2rÂv7F—f—G•÷7F'BrÂud$4„"ƒ#’åTÄÂuÒÀ¢²w66†ööÅ÷6W'f–6U÷66†ööÇ2rÂv7F—f—G•öVæBrÂud$4„"ƒ#’åTÄÂuÒÀ¢²w66†ööÅ÷6W'f–6U÷66†ööÇ2rÂvÖ÷&æ–æu÷7F'BrÂud$4„"ƒ#’åTÄÂuÒÀ¢²w66†ööÅ÷6W'f–6U÷66†ööÇ2rÂvÖ÷&æ–æuöVæBrÂud$4„"ƒ#’åTÄÂuÒÀ¢²w66†ööÅ÷6W'f–6U÷66†ööÇ2rÂvgFW&æööå÷7F'BrÂud$4„"ƒ#’åTÄÂuÒÀ¢²w66†ööÅ÷6W'f–6U÷66†ööÇ2rÂvgFW&æööåöVæBrÂud$4„"ƒ#’åTÄÂuÒÀ¢²w66†ööÅ÷6W'f–6U÷66†ööÇ2rÂvG&—fW%ö6÷VçBrÂt”åBåTÄÂuÒÀ¢²w66†ööÅ÷6W'f–6U÷66†ööÇ2rÂw7GVFVçEö6÷VçBrÂt”åBåTÄÂuÒÀ¢²w66†ööÅ÷6W'f–6U÷66†ööÇ2rÂw†öæRrÂud$4„"ƒƒ’åTÄÂuÒÀ¢²w66†ööÅ÷6W'f–6U÷66†ööÇ2rÂvÆF—GVFRrÂtDT4”ÔÂƒÃr’åTÄÂuÒÀ¢²w66†ööÅ÷6W'f–6U÷66†ööÇ2rÂvÆöæv—GVFRrÂtDT4”ÔÂƒÃr’åTÄÂuÒÀ¢²w66†ööÅ÷6W'f–6U÷66†ööÇ2rÂw7FGW2rÂ%d$4„"ƒƒ’åTÄÂDTdTÅB}Š½ŠŠ®(Í‹MŠý˜rr%ÒÀ¢²w66†ööÅ÷6W'f–6U÷66†ööÇ2rÂvÆö6F–öå÷&Vv—7FW&VEöBrÂtDDUD”ÔRåTÄÂuÒÀ¢²w66†ööÅ÷6W'f–6Uö–ç7V7F–öç2rÂw76VævW%ög&öçEö6÷VçBrÂt”åBäõBåTÄÂDTdTÅBuÒÀ¢²w66†ööÅ÷6W'f–6Uö–ç7V7F–öç2rÂw76VævW%÷&V%ö6÷VçBrÂt”åBäõBåTÄÂDTdTÅBuÐ¢Ò2F6öÄFVb—°¢G'—²–b‚6öÅöW†—7G2‚F6öÄFVe³ÒÂF6öÄFVe³Ò’’‚$ÅDU"D$ÄR²F6öÄFVe³×ÖDB4ôÅTÔâ²F6öÄFVe³×Ö²F6öÄFVe³%×Ò"“²Ö6F6‚…F‡&÷v&ÆRFR—·Ð¢Ð¢òò‹M˜mŠ}‹=˜r¸ÍªŠ­Š}¸Â‹=˜]Š¢ªý˜‹M¸ÂŠ‹Š}¸ÂŠÍ˜M˜ªý¸Í‹¸ÂŠ}‹"Š½ŠŠ¢Šý˜ŠŠ}‹˜rŠŠ}‹-Šý¸ÍŠò˜}˜mªýŠ}˜RŠ­ª‹Š}‹‹]˜Š-˜˜MŠ}¸Í˜bà¢G'—´F#£§'Vâ‚$ÅDU"D$ÄR66†ööÅ÷6W'f–6Uö–ç7V7F–öç2DB4ôÅTÔâ6Æ–VçE÷WV–Bd$4„"ƒcB’åTÄÂ"“·Ö6F6‚…F‡&÷v&ÆRFR—·Ð¢G'—´F#£§'Vâ‚$ÅDU"D$ÄR66†ööÅ÷6W'f–6Uö–ç7V7F–öç2DBTä•TR´U’W÷76•ö6Æ–VçE÷WV–B†6Æ–VçE÷WV–B’"“·Ö6F6‚…F‡&÷v&ÆRFR—·Ð¢òòŠ­˜m‹¸Í˜]Š}Š¢Š­‹]˜¸Í‹Š}ŠíŠ­‹]Š}‹]¸Â‹=‹˜¸Í‹2˜]ŠýŠ}‹‹2‹˜]ŠýŠ}˜²˜ŠÍ˜Šò˜mŠýŠ}‹Šý‰²Š}¸Í˜b˜-Š}Š˜M¸ÍŠ¢Š}‹"Š­˜m‹¸Í˜]Š}Š¢‹˜]˜˜]¸ÂŠ­‹]Š}˜¸Í‹‹=Š}¸ÍŠ¢Š}‹=Š­˜Š}Šý˜r˜]¸Î(Íª˜mŠòà¢G'—´F#£§'Vâ‚$E$õD$ÄR”bU„•5E266†ööÅ÷6W'f–6U÷†÷Fõ÷6WGF–æw2"“·Ö6F6‚…F‡&÷v&ÆRFR—·Ð¢òò‹=Š}‹-ªýŠ}‹¸ÂŠŠr˜m‹]ŠŽ(Í˜}Š}¸Â˜-Šý¸Í˜]¸Ã¢˜m‹=Ší˜~(Í˜}Š}¸ÂŠ}˜˜M¸Í˜r˜]˜]ª˜bŠ}‹=Š¢‹=Š­˜˜b—5÷&–Ö'’‹ŠrŠý‹‹Š}Š‹}˜r˜]ŠýŠ}‹‹2ý‹M‹ªŠ®(Í˜}Šr˜mŠýŠ}‹MŠ­˜rŠŠ}‹M˜mŠòà¢òòŠ}¸Í˜b‹=Š­˜˜b˜-Š˜BŠ}‹"˜}‹VW'’˜Š}Š‹=Š­˜rŠ˜rŠ-˜bŠ­ª˜]¸Í˜B˜]¸Î(Í‹M˜ŠòŠ­ŠrVæGö–çB˜]ŠýŠ}‹‹2ŠŠr…EES˜]Š­˜˜-˜˜m‹M˜Šòà¢G'—²F#£§'Vâ‚$ÅDU"D$ÄR66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W2DB4ôÅTÔâ—5÷&–Ö'’D”å””åBƒ’äõBåTÄÂDTdTÅB"“²Ö6F6‚…F‡&÷v&ÆRFR—·Ð¢òò˜}‹˜]Šý‹‹=˜r˜˜-‹r¸Íª’‹M‹ªŠ¢˜]ŠÍ‹¸ÂŠýŠ}‹ŠòâŠýŠ}Šý˜~(Í˜}Š}¸Â˜-Šý¸Í˜]¸Í™¨m˜mŠý‹M‹ªŠ­¸ÂŠ}ŠŠ­ŠýŠr¸Íª’‹Š}Š‹}˜r‹Šr˜mªý˜r˜]¸Î(ÍŠýŠ}‹˜mŠò˜‚‹=›í‹2˜-¸ÍŠò¸ÍªŠ­ŠrŠ}‹˜]Š}˜B˜]¸Î(Í‹M˜Šòà¢G'—°¢F#£§'Vâ‚$DTÄUDR63e$ôÒ66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W263¤ô”â66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W263"ôâ63ç66†ööÅö–C×63"ç66†ööÅö–BäB63æ6ö×ç•ö–Cç63"æ6ö×ç•ö–B"“°¢G'—´F#£§'Vâ‚$ÅDU"D$ÄR66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W2DBTä•TR´U’W÷7765÷66†ööÂ‡66†ööÅö–B’"“·Ö6F6‚…F‡&÷v&ÆRFR—·Ð¢Ö6F6‚…F‡&÷v&ÆRFR—¶W'&÷%öÆör‚w66†ööÂ×6W'f–6R&VÆF–öâæ÷&ÖÆ—¦S¢râFRÓævWDÖW76vR‚’“·Ð¢Gf–öÃÕ²}‹Šý˜RŠ}‹Š­ŠŠ}‹˜]‹Š}¸Í˜m˜r˜˜m¸ÂrÂ}‹Šý˜RŠ}‹Š­ŠŠ}‹Š¸Í˜]˜r‹MŠí‹RŠ½Š}˜MŠ²rÂ}‹=‹˜m‹M¸Í˜bŠ}‹mŠ}˜¸ÂrÂ}‹Š}˜m˜mŠý˜r‹­¸Í‹˜]ŠÍŠ}‹"rÂ}ŠýŠ}‹MŠ­˜b¸ÍŠr˜mŠýŠ}‹MŠ­˜bªý˜Š}˜}¸Â‹]˜MŠ}ŠÝ¸ÍŠ¢˜]‹Š­Š‹rÂ}‹Šý˜RŠ­˜ŠÍ˜rŠ˜r˜‹˜]Š}˜b˜‚Š}¸Í‹=Š¢uÓ°¢f÷&V6‚‚Gf–öÂ2F“ÓâGb—·G'—´F#£§'Vâ‚$”å4U%B”täõ$R”åDò66†ööÅ÷6W'f–6U÷f–öÆF–öå÷G—W2‡F—FÆRÇ6÷'Eö÷&FW"’dÅTU2ƒòÃò’"Å²GbÂF•Ò“·Ö6F6‚…F‡&÷v&ÆRFR—·×Ð¢FF—7G&–7G3Õ²}»rÂ}»"rÂ}»2rÂ}»BrÂ}»RrÂ}»brÂ}»rrÂ}Š­ŠŠ}ŠýªŠ}˜buÓ²f÷&V6‚‚FF—7G&–7G22F“ÓâGb—·G'—´F#£§'Vâ‚$”å4U%B”täõ$R”åDò66†ööÅ÷6W'f–6UöF—7G&–7G2‡F—FÆRÇ6÷'Eö÷&FW"’dÅTU2ƒòÃò’"Å²GbÂF’³Ò“·Ö6F6‚…F‡&÷v&ÆRFR—·×Ð¢GfV†–6ÆUG—W3Õ²}‹=˜]˜mŠòrÂ}‹=˜‹˜brÂ}›í©˜‚rÂ}›í‹Š}¸ÍŠòrÂ}Š­¸ÍŠŠrrÂ}Šý˜mŠrrÂ}‹Š}˜mŠrrÂ}Š}‹}˜M‹2rÂ}ª˜¸Í¸Íª’rÂ}‹=Š}¸Í‹uÓ²f÷&V6‚‚GfV†–6ÆUG—W22F“ÓâGb—·G'—´F#£§'Vâ‚$”å4U%B”täõ$R”åDò66†ööÅ÷6W'f–6U÷fV†–6ÆU÷G—W2‡F—FÆRÇ6÷'Eö÷&FW"’dÅTU2ƒòÃò’"Å²GbÂF’³Ò“·Ö6F6‚…F‡&÷v&ÆRFR—·×Ð¢GfV†–6ÆT6öÆ÷'3Õ²}‹=˜¸ÍŠòrÂ}‹-‹ŠòrÂ}˜]‹Mª¸ÂrÂ}˜m˜-‹˜~(ÍŠ}¸ÂrÂ}ŠíŠ}ª‹=Š­‹¸ÂrÂ}Š-Š¸ÂrÂ}˜-‹˜]‹"rÂ}‹=Š‹"rÂ}‹=Š}¸Í‹uÓ²f÷&V6‚‚GfV†–6ÆT6öÆ÷'22F“ÓâGb—·G'—´F#£§'Vâ‚$”å4U%B”täõ$R”åDò66†ööÅ÷6W'f–6U÷fV†–6ÆUö6öÆ÷'2‡F—FÆRÇ6÷'Eö÷&FW"’dÅTU2ƒòÃò’"Å²GbÂF’³Ò“·Ö6F6‚…F‡&÷v&ÆRFR—·×Ð ¢G'—°¢G&öÆW3ÔF#£¦ÆÂ‚%4TÄT5B–BÆÆWfVÂe$ôÒ&öÆW2"“°¢f÷&V6‚‚G&öÆW22G"—°¢FFVfVÇCÒ‚†–çB’G%²vÆWfVÂuÓÃÓB“ó£°¢F#£§'Vâ‚$”å4U%B”åDò66†ööÅ÷6W'f–6U÷W&Ö—76–öç2‡&öÆUö–BÆ6å÷f–WrÆ6åö7&VFRÆ6åöVF—BÆ6åöFVÆWFRÆ6åö–×÷'BÆ6å÷&W÷'B¢dÅTU2ƒòÃòÃòÃòÃòÃòÃò’ôâEUÄ”4DR´U’UDDP¢6å÷f–WsÔ”b†6å÷f–WsÓäB6åö7&VFSÓäB6åöVF—CÓäB6åöFVÆWFSÓäB6åö–×÷'CÓäB6å÷&W÷'CÓÅdÅTU2†6å÷f–Wr’Æ6å÷f–Wr’À¢6åö7&VFSÔ”b†6å÷f–WsÕdÅTU2†6å÷f–Wr’äB6åö7&VFSÓäB6åöVF—CÓäB6åöFVÆWFSÓäB6åö–×÷'CÓäB6å÷&W÷'CÓÅdÅTU2†6åö7&VFR’Æ6åö7&VFR’À¢6åöVF—CÔ”b†6å÷f–WsÕdÅTU2†6å÷f–Wr’äB6åö7&VFSÕdÅTU2†6åö7&VFR’äB6åöVF—CÓäB6åöFVÆWFSÓäB6åö–×÷'CÓäB6å÷&W÷'CÓÅdÅTU2†6åöVF—B’Æ6åöVF—B’À¢6åöFVÆWFSÔ”b†6å÷f–WsÕdÅTU2†6å÷f–Wr’äB6åö7&VFSÕdÅTU2†6åö7&VFR’äB6åöVF—CÕdÅTU2†6åöVF—B’äB6åöFVÆWFSÓäB6åö–×÷'CÓäB6å÷&W÷'CÓÅdÅTU2†6åöFVÆWFR’Æ6åöFVÆWFR’À¢6åö–×÷'CÔ”b†6å÷f–WsÕdÅTU2†6å÷f–Wr’äB6åö7&VFSÕdÅTU2†6åö7&VFR’äB6åöVF—CÕdÅTU2†6åöVF—B’äB6åöFVÆWFSÕdÅTU2†6åöFVÆWFR’äB6åö–×÷'CÓäB6å÷&W÷'CÓÅdÅTU2†6åö–×÷'B’Æ6åö–×÷'B’À¢6å÷&W÷'CÔ”b†6å÷f–WsÕdÅTU2†6å÷f–Wr’äB6åö7&VFSÕdÅTU2†6åö7&VFR’äB6åöVF—CÕdÅTU2†6åöVF—B’äB6åöFVÆWFSÕdÅTU2†6åöFVÆWFR’äB6åö–×÷'CÕdÅTU2†6åö–×÷'B’äB6å÷&W÷'CÓÅdÅTU2†6å÷&W÷'B’Æ6å÷&W÷'B’"À¢²†–çB’G%²v–BuÒÂFFVfVÇBÂFFVfVÇBÂFFVfVÇBÂFFVfVÇBÂ‚†–çB’G%²vÆWfVÂuÓÃÓ2“ó£ÂFFVfVÇEÒ“°¢Ð¢Ö6F6‚…F‡&÷v&ÆRFR—·Ð§Ð¦gVæ7F–öâ÷77eöWF÷6VVE÷66†ööÇ2‚—°¢7FF–2FGFV×FVCÖfÇ6S²–b‚FGFV×FVB’&WGW&ã²FGFV×FVC×G'VS°¢G'—°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E266†ööÅ÷6W'f–6U÷6VVE÷7FFR€¢6VVEö¶W’d$4„"ƒ#’äõBåTÄÂ$”Ô%’´U’À¢6ö×ÆWFVEöBDDUD”ÔRåTÄÂÀ¢&÷uö6÷VçB”åBäõBåTÄÂDTdTÅB ¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“°¢G7FFSÔF#£¦öæR‚%4TÄT5B6VVEö¶W’Ç&÷uö6÷VçBe$ôÒ66†ööÅ÷6W'f–6U÷6VVE÷7FFRt„U$R6VVEö¶W“Óò"Å²w66†ööÇ2Ö&öö³×cuÒ“°¢–b‚G7FFRbb†–çB’G7FFU²w&÷uö6÷VçBuÓã’&WGW&ã° ¢G6VVDf–ÆSÖF—&æÖR…õôD•%õò’âröÖ–w&F–öç2ó##eó•ó#e÷66†ööÅ÷6W'f–6U÷66†ööÇ5÷6VVBç7Âs°¢–b‚—5öf–ÆR‚G6VVDf–ÆR’—¶W'&÷%öÆör‚w66†ööÂ×6W'f–6R6VVBf–ÆRÖ—76–æs¢râG6VVDf–ÆR“·&WGW&ã·Ð¢G6VVE7ÃÔf–ÆUövWEö6öçFVçG2‚G6VVDf–ÆR“°¢–b‚G6VVE7ÃÓÓÖfÇ6RÇÂ&VuöÖF6‚‚"õ4UEÇ2´–ÆöEÇ2£ÕÇ2¤e$ôÕô$4ScEÂ‚r…µâuÒ²’uÂ’ò"ÂG6VVE7ÂÂFÖÒ’—¶W'&÷%öÆör‚w66†ööÂ×6W'f–6R6VVB–ÆöBæ÷Bf÷VæBr“·&WGW&ã·Ð¢F6ö×&W76VCÖ&6ScEöFV6öFR‚FÖÕ³ÒÇG'VR“°¢–b‚F6ö×&W76VCÓÓÖfÇ6R—¶W'&÷%öÆör‚w66†ööÂ×6W'f–6R6VVB&6ScBFV6öFRf–ÆVBr“·&WGW&ã·Ð¢F§6öãÔw§Væ6ö×&W72‚F6ö×&W76VB“°¢–b‚F§6öãÓÓÖfÇ6RÇÂF§6öãÓÓÒrr—¶W'&÷%öÆör‚w66†ööÂ×6W'f–6R6VVBFV6ö×&W76–öâf–ÆVBr“·&WGW&ã·Ð¢FFö3Ö§6öåöFV6öFR‚F§6öâÇG'VR“°¢–b‚—5ö'&’‚FFö2’ÇÂ—5ö'&’‚FFö5²vBuÓóöçVÆÂ’ÇÂ—5ö'&’‚FFö5²w"uÓóöçVÆÂ’—¶W'&÷%öÆör‚w66†ööÂ×6W'f–6R6VVB¥4ôâ–çfÆ–Br“·&WGW&ã·Ð ¢FCÒFFö5²vBuÓ²G&u&÷w3ÒFFö5²w"uÓ²G&÷w3ÕµÓ²F6ö×æ–W3ÕµÓ°¢FF–7EfÃÖgVæ7F–öâ‚F¶W’ÂF–G‚—W6R‚bFB—°¢F–GƒÒ†–çB’F–Gƒ²–b‚F–GƒÃ’&WGW&âçVÆÃ²FÒFE²F¶W•ÓóöçVÆÃ°¢–b‚—5ö'&’‚F’ÇÂ'&•ö¶W•öW†—7G2‚F–G‚ÂF’’&WGW&âçVÆÃ°¢GcÒF²F–G…Ó²&WGW&âGcÓÓÖçVÆÃòrs§G&–Ò‚‡7G&–ær’Gb“°¢Ó°¢f÷&V6‚‚G&u&÷w22G"—°¢–b‚—5ö'&’‚G"’ÇÂ6÷VçB‚G"“Ã#"’6öçF–çVS°¢F6öFS×G&–Ò‚‡7G&–ær’‚G%³Óóòrr’“²–b‚F6öFSÓÓÒrr’6öçF–çVS°¢FæÖSÒFF–7EfÂ‚vârÂG%³UÓóòÓ“²–b‚FæÖSÓÓÖçVÆÂÇÂFæÖSÓÓÒrr’6öçF–çVS°¢F6ö×ç“ÒFF–7EfÂ‚v6òrÂG%³uÓóòÓ“²–b†–åö'&’‚F6ö×ç’Å²}˜mŠ}˜]‹MŠí‹RrÂ}˜mŠ}˜]‹˜M˜˜RrÂrÒrÂ~(	BuÒÇG'VR’’F6ö×ç“Òrs°¢FvVæFW#ÒFF–7EfÂ‚vrrÂG%³…ÓóòÓ“²–b‚–åö'&’‚FvVæFW"Å²}ŠýŠíŠ­‹Š}˜m˜rrÂ}›í‹=‹Š}˜m˜rrÂ}˜mŠ}˜]‹MŠí‹RuÒÇG'VR’’FvVæFW#Ò}˜mŠ}˜]‹MŠí‹Rs°¢G&÷sÕ°¢v6öFRsÓâF6öFRÂvæÖRsÓâFæÖRÂvF—7G&–7BsÓâFF–7EfÂ‚vBrÂG%³eÓóòÓ’Âv6ö×ç’sÓâF6ö×ç’ÂvvVæFW"sÓâFvVæFW"À¢w6†–gBsÓâFF–7EfÂ‚w6‚rÂG%³•ÓóòÓ’ÂvVGV6F–öåöÆWfVÂsÓâFF–7EfÂ‚vVÂrÂG%³ÓóòÓ’Âw66†ööÅ÷G—RsÓâFF–7EfÂ‚w7BrÂG%³ÓóòÓ’À¢v7F—f—G•÷7F'BsÓâFF–7EfÂ‚v2rÂG%³%ÓóòÓ’Âv7F—f—G•öVæBsÓâFF–7EfÂ‚vRrÂG%³5ÓóòÓ’À¢vÖ÷&æ–æu÷7F'BsÓâFF–7EfÂ‚v×2rÂG%³EÓóòÓ’ÂvÖ÷&æ–æuöVæBsÓâFF–7EfÂ‚vÖRrÂG%³UÓóòÓ’À¢vgFW&æööå÷7F'BsÓâFF–7EfÂ‚vbrÂG%³eÓóòÓ’ÂvgFW&æööåöVæBsÓâFF–7EfÂ‚vfRrÂG%³uÓóòÓ’À¢vG&—fW%ö6÷VçBsÓæ—76WB‚G%³Ò’bbG%³ÒÓÖçVÆÃò†–çB’G%³Ó¦çVÆÂÂw7GVFVçEö6÷VçBsÓæ—76WB‚G%³%Ò’bbG%³%ÒÓÖçVÆÃò†–çB’G%³%Ó¦çVÆÂÀ¢vFG&W72sÓâFF–7EfÂ‚vBrÂG%³…ÓóòÓ’Âw†öæRsÓâFF–7EfÂ‚w‚rÂG%³•ÓóòÓ’À¢vÆF—GVFRsÓæ—76WB‚G%³5Ò’bbG%³5ÒÓÖçVÆÃò†fÆöB’G%³5Ó¦çVÆÂÂvÆöæv—GVFRsÓæ—76WB‚G%³EÒ’bbG%³EÒÓÖçVÆÃò†fÆöB’G%³EÓ¦çVÆÂÀ¢w7FGW2sÓâFF–7EfÂ‚w7FGW2rÂG%³#ÓóòÓ’ÂvÆö6F–öå÷&Vv—7FW&VEöBsÓâFF–7EfÂ‚vÇ"rÂG%³#ÓóòÓ¢Ó°¢–b‚G&÷u²w7FGW2uÓÓÓÖçVÆÂÇÂG&÷u²w7FGW2uÓÓÓÒrr’G&÷u²w7FGW2uÓÒ}Š½ŠŠ®(Í‹MŠý˜rs°¢–b‚G&÷u²vF—7G&–7BuÒÓÖçVÆÂbbG&÷u²vF—7G&–7BuÒÓÒrr’G&÷u²vF—7G&–7BuÓÕ÷77eöF—7G&–7Eö¶W’‚G&÷u²vF—7G&–7BuÒ“°¢–b‚G&÷u²v6ö×ç’uÒÓÒrr’F6ö×æ–W5²G&÷u²v6ö×ç’uÕÓ×G'VS°¢G&÷w5²F6öFUÓÒG&÷s°¢Ð¢–b‚G&÷w2—¶W'&÷%öÆör‚w66†ööÂ×6W'f–6R6VVB6öçF–ç2æòW6&ÆR&÷w2r“·&WGW&ã·Ð ¢GFóÔF#£§Fò‚“²–b‚GFòÓæ–åG&ç67F–öâ‚’’F‡&÷ræWrW†6WF–öâ‚w66†ööÂ×6W'f–6R6VVB6ææ÷B7F'BæW7FVBG&ç67F–öâr“°¢GFòÓæ&Vv–åG&ç67F–öâ‚“°¢G'—°¢f÷&V6‚†'&•ö¶W—2‚F6ö×æ–W2’2F6â¢F#£§'Vâ‚$”å4U%B”åDò66†ööÅ÷6W'f–6Uö6ö×æ–W2†æÖR’dÅTU2ƒò’ôâEUÄ”4DR´U’UDDRæÖSÕdÅTU2†æÖR’"Å²F6åÒ“° ¢F6öÇ3Ò&6öFRÆæÖRÆVGV6F–öæÅöF—7G&–7BÆvVæFW"Ç6†–gBÆVGV6F–öåöÆWfVÂÇ66†ööÅ÷G—RÆ7F—f—G•÷7F'BÆ7F—f—G•öVæBÆÖ÷&æ–æu÷7F'BÆÖ÷&æ–æuöVæBÆgFW&æööå÷7F'BÆgFW&æööåöVæBÆG&—fW%ö6÷VçBÇ7GVFVçEö6÷VçBÆFG&W72Ç†öæRÆÆF—GVFRÆÆöæv—GVFRÇ7FGW2ÆÆö6F–öå÷&Vv—7FW&VEöBÆ—5ö7F—fR#°¢GW6W'EF–ÃÒ$ôâEUÄ”4DR´U’UDDRæÖSÕdÅTU2†æÖR’ÆVGV6F–öæÅöF—7G&–7CÕdÅTU2†VGV6F–öæÅöF—7G&–7B’ÆvVæFW#ÕdÅTU2†vVæFW"’Ç6†–gCÕdÅTU2‡6†–gB’ÆVGV6F–öåöÆWfVÃÕdÅTU2†VGV6F–öåöÆWfVÂ’Ç66†ööÅ÷G—SÕdÅTU2‡66†ööÅ÷G—R’Æ7F—f—G•÷7F'CÕdÅTU2†7F—f—G•÷7F'B’Æ7F—f—G•öVæCÕdÅTU2†7F—f—G•öVæB’ÆÖ÷&æ–æu÷7F'CÕdÅTU2†Ö÷&æ–æu÷7F'B’ÆÖ÷&æ–æuöVæCÕdÅTU2†Ö÷&æ–æuöVæB’ÆgFW&æööå÷7F'CÕdÅTU2†gFW&æööå÷7F'B’ÆgFW&æööåöVæCÕdÅTU2†gFW&æööåöVæB’ÆG&—fW%ö6÷VçCÕdÅTU2†G&—fW%ö6÷VçB’Ç7GVFVçEö6÷VçCÕdÅTU2‡7GVFVçEö6÷VçB’ÆFG&W73ÕdÅTU2†FG&W72’Ç†öæSÕdÅTU2‡†öæR’ÆÆF—GVFSÕdÅTU2†ÆF—GVFR’ÆÆöæv—GVFSÕdÅTU2†Æöæv—GVFR’Ç7FGW3ÕdÅTU2‡7FGW2’ÆÆö6F–öå÷&Vv—7FW&VEöCÕdÅTU2†Æö6F–öå÷&Vv—7FW&VEöB’Æ—5ö7F—fSÓ#°¢GGWÆW3ÕµÓ²G&×3ÕµÓ²F6‡Væ³Ó°¢f÷&V6‚‚G&÷w22G&÷r—°¢GGWÆW5µÓÒ"ƒòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃò’#°¢G&×3Ö'&•öÖW&vR‚G&×2Å°¢G&÷u²v6öFRuÒÂG&÷u²væÖRuÒÂG&÷u²vF—7G&–7BuÒÓÒrsòG&÷u²vF—7G&–7BuÓ¦çVÆÂÂG&÷u²vvVæFW"uÒÂG&÷u²w6†–gBuÒÓÒrsòG&÷u²w6†–gBuÓ¦çVÆÂÀ¢G&÷u²vVGV6F–öåöÆWfVÂuÒÓÒrsòG&÷u²vVGV6F–öåöÆWfVÂuÓ¦çVÆÂÂG&÷u²w66†ööÅ÷G—RuÒÓÒrsòG&÷u²w66†ööÅ÷G—RuÓ¦çVÆÂÂG&÷u²v7F—f—G•÷7F'BuÒÓÒrsòG&÷u²v7F—f—G•÷7F'BuÓ¦çVÆÂÀ¢G&÷u²v7F—f—G•öVæBuÒÓÒrsòG&÷u²v7F—f—G•öVæBuÓ¦çVÆÂÂG&÷u²vÖ÷&æ–æu÷7F'BuÒÓÒrsòG&÷u²vÖ÷&æ–æu÷7F'BuÓ¦çVÆÂÂG&÷u²vÖ÷&æ–æuöVæBuÒÓÒrsòG&÷u²vÖ÷&æ–æuöVæBuÓ¦çVÆÂÀ¢G&÷u²vgFW&æööå÷7F'BuÒÓÒrsòG&÷u²vgFW&æööå÷7F'BuÓ¦çVÆÂÂG&÷u²vgFW&æööåöVæBuÒÓÒrsòG&÷u²vgFW&æööåöVæBuÓ¦çVÆÂÂG&÷u²vG&—fW%ö6÷VçBuÒÂG&÷u²w7GVFVçEö6÷VçBuÒÀ¢‚G&÷u²vFG&W72uÓóòrr’ÓÒrsöÖ%÷7V'7G"‚‡7G&–ær’G&÷u²vFG&W72uÒÃÃs“¦çVÆÂÂ‚G&÷u²w†öæRuÓóòrr’ÓÒrsòG&÷u²w†öæRuÓ¦çVÆÂÀ¢G&÷u²vÆF—GVFRuÒÂG&÷u²vÆöæv—GVFRuÒÂ‚G&÷u²w7FGW2uÓóòrr’ÓÒrsòG&÷u²w7FGW2uÓ¢}Š½ŠŠ®(Í‹MŠý˜rrÂG&÷u²vÆö6F–öå÷&Vv—7FW&VEöBuÓó¦çVÆÂÃ¢Ò“°¢–b‚²²F6‡Væ³ãÓ—°¢F#£§'Vâ‚$”å4U%B”åDò66†ööÅ÷6W'f–6U÷66†ööÇ2‚F6öÇ2’dÅTU2"æ–×ÆöFR‚rÂrÂGGWÆW2’â"GW6W'EF–Â"ÂG&×2“°¢GGWÆW3ÕµÓ²G&×3ÕµÓ²F6‡Væ³Ó°¢Ð¢Ð¢–b‚F6‡Væ³ã’F#£§'Vâ‚$”å4U%B”åDò66†ööÅ÷6W'f–6U÷66†ööÇ2‚F6öÇ2’dÅTU2"æ–×ÆöFR‚rÂrÂGGWÆW2’â"GW6W'EF–Â"ÂG&×2“° ¢F–G3ÕµÓ°¢f÷&V6‚†'&•ö6‡Væ²†'&•ö¶W—2‚G&÷w2’Ã#S’2F6öFW2—°¢GƒÖ–×ÆöFR‚rÂrÆ'&•öf–ÆÂƒÆ6÷VçB‚F6öFW2’Âsòr’“°¢f÷&V6‚„F#£¦ÆÂ‚%4TÄT5B–BÆ6öFRe$ôÒ66†ööÅ÷6W'f–6U÷66†ööÇ2t„U$R6öFR”â‚G‚’"ÂF6öFW2’2G7"’F–G5²‡7G&–ær’G7%²v6öFRuÕÓÒ†–çB’G7%²v–BuÓ°¢Ð¢F6ö×ç”–G3ÕµÓ°¢f÷&V6‚†'&•ö¶W—2‚F6ö×æ–W2’2F6â—²F7#ÔF#£¦öæR‚%4TÄT5B–Be$ôÒ66†ööÅ÷6W'f–6Uö6ö×æ–W2t„U$RæÖSÓò"Å²F6åÒ“¶–b‚F7"’F6ö×ç”–G5²F6åÓÒ†–çB’F7%²v–BuÓ·Ð ¢GGWÆW3ÕµÓ²G&×3ÕµÓ²F6‡Væ³Ó°¢f÷&V6‚‚G&÷w22G&÷r—°¢–b‚G&÷u²v6ö×ç’uÒÓÒrrbb—76WB‚F–G5²G&÷u²v6öFRuÕÒÂF6ö×ç”–G5²G&÷u²v6ö×ç’uÕÒ’—°¢GGWÆW5µÓÒrƒòÃòÃ’s²G&×5µÓÒF–G5²G&÷u²v6öFRuÕÓ²G&×5µÓÒF6ö×ç”–G5²G&÷u²v6ö×ç’uÕÓ°¢–b‚²²F6‡Væ³ãÓ#—°¢F#£§'Vâ‚$”å4U%B”åDò66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W2‡66†ööÅö–BÆ6ö×ç•ö–BÆ—5÷&–Ö'’’dÅTU2"æ–×ÆöFR‚rÂrÂGGWÆW2’â"ôâEUÄ”4DR´U’UDDR6ö×ç•ö–CÕdÅTU2†6ö×ç•ö–B’Æ—5÷&–Ö'“Ó"ÂG&×2“°¢GGWÆW3ÕµÓ²G&×3ÕµÓ²F6‡Væ³Ó°¢Ð¢Ð¢Ð¢–b‚F6‡Væ³ã’F#£§'Vâ‚$”å4U%B”åDò66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W2‡66†ööÅö–BÆ6ö×ç•ö–BÆ—5÷&–Ö'’’dÅTU2"æ–×ÆöFR‚rÂrÂGGWÆW2’â"ôâEUÄ”4DR´U’UDDR6ö×ç•ö–CÕdÅTU2†6ö×ç•ö–B’Æ—5÷&–Ö'“Ó"ÂG&×2“° ¢G7F÷&VCÒ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒ66†ööÅ÷6W'f–6U÷66†ööÇ2"•²vâuÓóó“°¢F#£§'Vâ‚$”å4U%B”åDò66†ööÅ÷6W'f–6U÷6VVE÷7FFR‡6VVEö¶W’Æ6ö×ÆWFVEöBÇ&÷uö6÷VçB’dÅTU2ƒòÃòÃò’ôâEUÄ”4DR´U’UDDR6ö×ÆWFVEöCÕdÅTU2†6ö×ÆWFVEöB’Ç&÷uö6÷VçCÕdÅTU2‡&÷uö6÷VçB’"Å²w66†ööÇ2Ö&öö³×crÆFFR‚u’ÖÒÖBƒ¦“§2r’ÂG7F÷&VEÒ“°¢GFòÓæ6öÖÖ—B‚“²W'&÷%öÆör‚w66†ööÂ×6W'f–6R6VVB6ö×ÆWFVC¢râG7F÷&VBâr&÷w2r“°¢Ö6F6‚…F‡&÷v&ÆRFR—¶–b‚GFòÓæ–åG&ç67F–öâ‚’’GFòÓç&öÆÄ&6²‚“¶W'&÷%öÆör‚w66†ööÂ×6W'f–6R6VVBf–ÆVC¢râFRÓævWDÖW76vR‚’“·Ð¢Ö6F6‚…F‡&÷v&ÆRFR—¶W'&÷%öÆör‚w66†ööÂ×6W'f–6R6VVB&ö÷G7G&f–ÆVC¢râFRÓævWDÖW76vR‚’“·Ð§Ð ¦gVæ7F–öâ÷77e÷66†ööÅö6ö×ç•÷fÆ–FFR‚G66†ööÄ–BÂF6ö×ç”–BÂFF—7G&–7CÒrr—°¢G66†ööÄ–CÒ†–çB’G66†ööÄ–C²F6ö×ç”–CÒ†–çB’F6ö×ç”–C°¢–b‚G66†ööÄ–B—°¢G3ÔF#£¦öæR‚%4TÄT5B–BÆVGV6F–öæÅöF—7G&–7Be$ôÒ66†ööÅ÷6W'f–6U÷66†ööÇ2t„U$R–CÓòäB—5ö7F—fSÓ"Å²G66†ööÄ–EÒ“°¢–b‚G2’‡GG£¦W'&÷"‚}˜]Šý‹‹=˜rŠ}˜mŠ­ŠíŠ}ŠŽ(Í‹MŠý˜r˜]‹Š­Š‹˜m¸Í‹=Š¢ârÃC#"“°¢–b‚FF—7G&–7BÓÒrrbb÷77eöF—7G&–7Eö¶W’‚G5²vVGV6F–öæÅöF—7G&–7BuÒ’ÓÕ÷77eöF—7G&–7Eö¶W’‚FF—7G&–7B’’‡GG£¦W'&÷"‚}˜mŠ}ŠÝ¸Í˜r˜]Šý‹‹=˜rŠŠr˜mŠ}ŠÝ¸Í˜rŠ}˜mŠ­ŠíŠ}ŠŽ(Í‹MŠý˜r¸Íª‹=Š}˜b˜m¸Í‹=Š¢ârÃC#"“°¢–b‚F6ö×ç”–B—°¢–b‚F#£¦öæR‚%4TÄT5B–Be$ôÒ66†ööÅ÷6W'f–6Uö6ö×æ–W2t„U$R–CÓòäB—5ö7F—fSÓ"Å²F6ö×ç”–EÒ’’‡GG£¦W'&÷"‚}‹M‹ªŠ¢˜]ŠÍ‹¸ÂŠ}˜mŠ­ŠíŠ}ŠŽ(Í‹MŠý˜r˜]‹Š­Š‹˜m¸Í‹=Š¢ârÃC#"“°¢FÖÔF#£¦öæR‚%4TÄT5B6ö×ç•ö–Be$ôÒ66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W2t„U$R66†ööÅö–CÓò"Å²G66†ööÄ–EÒ“°¢–b‚FÖbb†–çB’FÖ²v6ö×ç•ö–BuÒÓÒF6ö×ç”–B’‡GG£¦W'&÷"‚}‹M‹ªŠ¢Š}˜mŠ­ŠíŠ}ŠŽ(Í‹MŠý˜rŠŠr‹M‹ªŠ¢˜]ŠÍ‹¸ÂŠ}¸Í˜b˜]Šý‹‹=˜r˜]‹}Š}Š˜-Š¢˜mŠýŠ}‹ŠòârÃC#"“°¢Ð¢ÖVÇ6V–b‚F6ö×ç”–BbbF#£¦öæR‚%4TÄT5B–Be$ôÒ66†ööÅ÷6W'f–6Uö6ö×æ–W2t„U$R–CÓòäB—5ö7F—fSÓ"Å²F6ö×ç”–EÒ’’‡GG£¦W'&÷"‚}‹M‹ªŠ¢˜]ŠÍ‹¸ÂŠ}˜mŠ­ŠíŠ}ŠŽ(Í‹MŠý˜r˜]‹Š­Š‹˜m¸Í‹=Š¢ârÃC#"“°§Ð¦gVæ7F–öâ÷77e÷fÆ–Eö÷F–öâ‚GF&ÆRÂGF—FÆR—²GF—FÆSÕ÷77eöæ÷&Ò‚GF—FÆR“·&WGW&âGF—FÆRÓÒrrbdF#£¦öæR‚%4TÄT5B–Be$ôÒGF&ÆRt„U$RF—FÆSÓòäB—5ö7F—fSÓ"Å²GF—FÆUÒ“·Ð¦gVæ7F–öâ÷77e÷&öÆUö—5öFÖ–â‚GR—°¢–b‚V×G’‚GU²v—5öFÖ–âuÒ’’&WGW&âG'VS°¢G#Õ÷77eöæ÷&Ò‚GU²w&öÆU÷F—FÆRuÓóòrr“°¢&WGW&â–åö'&’‚G"Å²}˜]Šý¸Í‹ª˜BrÂ}˜]Šý¸Í‹ª˜BrÂ}‹¸Í¸Í‹2Š}ŠýŠ}‹˜rŠŠ}‹-‹‹=¸ÂrÂ}‹Šm¸Í‹2Š}ŠýŠ}‹˜rŠŠ}‹-‹‹=¸ÂrÂ}˜m¸Í‹˜¸ÂŠ}ŠýŠ}‹¸ÂŠ}‹‹MŠòuÒÇG'VR“°§Ð¦gVæ7F–öâ÷77e÷W&Ò‚GRÂF7F–öãÒwf–Wrr—°¢÷77e÷F&ÆW2‚“°¢–b…÷77e÷&öÆUö—5öFÖ–â‚GR’’&WGW&âG'VS°¢F6öÃÒv6åòrç&Vu÷&WÆ6R‚rõµæ×¥õÒòrÂrrÂF7F–öâ“°¢–b‚–åö'&’‚F6öÂÅ²v6å÷f–WrrÂv6åö7&VFRrÂv6åöVF—BrÂv6åöFVÆWFRrÂv6åö–×÷'BrÂv6å÷&W÷'BuÒÇG'VR’’&WGW&âfÇ6S°¢G#ÔF#£¦öæR‚%4TÄT5BF6öÂbe$ôÒ66†ööÅ÷6W'f–6U÷W&Ö—76–öç2t„U$R&öÆUö–CÓò"Å²†–çB’GU²w&öÆUö–BuÕÒ“°¢&WGW&âV×G’‚G%²wbuÒ“°§Ð¦gVæ7F–öâ÷77eöæVVB‚GRÂFÒwf–Wrr—¶–b‚÷77e÷W&Ò‚GRÂF’’‡GG£¦W'&÷"‚}Šý‹=Š­‹‹=¸ÂŠ˜rŠŠí‹B‹=‹˜¸Í‹2˜]ŠýŠ}‹‹2Š‹Š}¸Â‹=˜]Š¢‹M˜]Šr˜‹Š}˜B˜m¸Í‹=Š¢ârÃC2“·Ð¦gVæ7F–öâ÷77eö§6öå÷&÷w2‚G&÷w2—·&WGW&â'&•öÖ†gVæ7F–öâ‚G"—¶f÷&V6‚‚G"2F³ÓâGb––b†—5÷7G&–ær‚Gb’’G%²FµÓÒGc·&WGW&âG#·ÒÂG&÷w2“·Ð¦gVæ7F–öâ÷77eöVâ‚G2—·&WGW&â7G'G"‚‡7G&–ær’G2Å²}»sÓâsrÂ}»sÓâsrÂ}»"sÓâs"rÂ}»2sÓâs2rÂ}»BsÓâsBrÂ}»RsÓâsRrÂ}»bsÓâsbrÂ}»rsÓâsrrÂ}»‚sÓâs‚rÂ}»’sÓâs’uÒ“·Ð¦gVæ7F–öâ÷77eöæ÷&Ò‚G2—²G3×G&–Ò‚‡7G&–ær’G2“²G3×7G%÷&WÆ6R…²}˜¢rÂ}˜’rÂ}˜2rÂ}¸uÒÅ²}¸ÂrÂ}¸ÂrÂ}ª’rÂ}˜ruÒÂG2“·&WGW&â&Vu÷&WÆ6R‚rõÇ2²÷RrÂrrÂG2“·Ð¦gVæ7F–öâ÷77eöF—7G&–7Eöæ÷&ÖÆ—¦VB‚G2—°¢G3Õ÷77eöæ÷&Ò‚G2“°¢–b‚G3ÓÓÒrr’&WGW&ârs°¢G3×7G'G"‚G2Å²}»sÓâsrÂ}»sÓâsrÂ}»"sÓâs"rÂ}»2sÓâs2rÂ}»BsÓâsBrÂ}»RsÓâsRrÂ}»bsÓâsbrÂ}»rsÓâsrrÂ}»‚sÓâs‚rÂ}»’sÓâs’rÂ}šsÓâsrÂ}šsÓâsrÂ}š"sÓâs"rÂ}š2sÓâs2rÂ}šBsÓâsBrÂ}šRsÓâsRrÂ}šbsÓâsbrÂ}šrsÓâsrrÂ}š‚sÓâs‚rÂ}š’sÓâs’uÒ“°¢G3×&Vu÷&WÆ6R‚rõâƒó­˜mŠ}ŠÝ¸Í˜wÍ˜]˜m‹}˜-˜r•µÅÇ5ÅÇ‡³#7ÕÅÇ‡³#gÕÒ¢÷RrÂrrÂG2“°¢G3×&Vu÷&WÆ6R‚rõµÅÇ5ÅÇ‡³#7ÕÅÇ‡³#gÕÒ²÷RrÂrrÂG2“°¢&WGW&âG&–Ò‚G2“°§Ð¦gVæ7F–öâ÷77eöF—7G&–7Eö¶W’‚G2—°¢Fæ÷&ÖÆ—¦VCÕ÷77eöF—7G&–7Eöæ÷&ÖÆ—¦VB‚G2“°¢–b‚Fæ÷&ÖÆ—¦VCÓÓÒrr’&WGW&ârs°¢òò˜mŠ}ŠÝ¸Í˜rŠ-˜]˜‹-‹M¸Â˜]˜mŠ‹’ŠýŠ}Šý˜}™B˜]Šý‹‹=˜rŠ}‹=Š­‰²˜]˜-ŠýŠ}‹‹Ší¸Í‹˜~(Í‹MŠý˜rŠý‹D"˜mŠŠ}¸ÍŠòŠŠ}‹-˜m˜¸Í‹=¸Â¸ÍŠp¢òòŠ˜r*½»Š­Šr»|+²Š­ŠŠý¸Í˜B‹M˜Šòâ˜˜-‹rŠ‹Š}¸Â˜]˜-Š}¸Í‹=˜r˜m‹˜]Š}˜B˜]¸Î(Íª˜m¸Í˜R˜‚‹=›í‹2Šý˜-¸Í˜-Š}˜²˜}˜]Š}˜`¢òò‹˜m˜Š}˜b˜]˜ŠÍ˜ŠòŠý‹66†ööÅ÷6W'f–6U÷66†ööÇ2‹ŠrŠ‹˜]¸Î(Íªý‹ŠýŠ}˜m¸Í˜Rà¢G'—°¢FW†7CÕ÷77eöæ÷&Ò‚G2“°¢–b‚FW†7BÓÒrr—°¢G&÷sÔF#£¦öæR‚%4TÄT5BVGV6F–öæÅöF—7G&–7B2F—FÆP¢e$ôÒ66†ööÅ÷6W'f–6U÷66†ööÇ0¢t„U$RVGV6F–öæÅöF—7G&–7CÓð¢Ä”Ô•B"Å²FW†7EÒ“°¢–b‚G&÷r’&WGW&â÷77eöæ÷&Ò‚G&÷u²wF—FÆRuÒ“°¢Ð¢G&÷w3ÔF#£¦ÆÂ‚%4TÄT5BVGV6F–öæÅöF—7G&–7B2F—FÆP¢e$ôÒ66†ööÅ÷6W'f–6U÷66†ööÇ0¢t„U$RVGV6F–öæÅöF—7G&–7B•2äõBåTÄÂäBE$”Ò†VGV6F–öæÅöF—7G&–7B“Ãârp¢u$õU%’VGV6F–öæÅöF—7G&–7@¢õ$DU"%’VGV6F–öæÅöF—7G&–7B"“°¢f÷&V6‚‚G&÷w22G&÷r—°¢–b…÷77eöF—7G&–7Eöæ÷&ÖÆ—¦VB‚G&÷u²wF—FÆRuÓóòrr“ÓÓÒFæ÷&ÖÆ—¦VB’&WGW&â÷77eöæ÷&Ò‚G&÷u²wF—FÆRuÒ“°¢Ð¢Ö6F6‚…F‡&÷v&ÆRFR—·Ð¢&WGW&â÷77eöæ÷&Ò‚G2“°§Ð¦gVæ7F–öâ÷77eöF—7G&–7E÷7Â‚F6öÇVÖâ—°¢FSÒ%E$”Ò…$UÄ4R…$UÄ4R…$UÄ4R…$UÄ4R…$UÄ4R…$UÄ4R…$UÄ4R…$UÄ4R…$UÄ4R…$UÄ4R…$UÄ4R…$UÄ4R…$UÄ4R…$UÄ4R…$UÄ4R…$UÄ4R…$UÄ4R…$UÄ4R…$UÄ4R…$UÄ4R‚F6öÇVÖâÂ}»rÂsr’Â}»rÂsr’Â}»"rÂs"r’Â}»2rÂs2r’Â}»BrÂsBr’Â}»RrÂsRr’Â}»brÂsbr’Â}»rrÂsrr’Â}»‚rÂs‚r’Â}»’rÂs’r’Â}šrÂsr’Â}šrÂsr’Â}š"rÂs"r’Â}š2rÂs2r’Â}šBrÂsBr’Â}šRrÂsRr’Â}šbrÂsbr’Â}šrrÂsrr’Â}š‚rÂs‚r’Â}š’rÂs’r’’#°¢FSÒ%$UÄ4R…$UÄ4R…$UÄ4R‚FRÂ}˜mŠ}ŠÝ¸Í˜rrÂrr’Â}˜]˜m‹}˜-˜rrÂrr’ÂrrÂrr’#°¢&WGW&âFS°§Ð¦gVæ7F–öâ÷77e÷fÆ–EöF—7G&–7B‚GF—FÆR—°¢Fæ÷&ÖÆ—¦VCÕ÷77eöF—7G&–7Eöæ÷&ÖÆ—¦VB‚GF—FÆR“°¢–b‚Fæ÷&ÖÆ—¦VCÓÓÒrr’&WGW&âfÇ6S°¢G'—°¢G&÷sÔF#£¦öæR‚%4TÄT5BVGV6F–öæÅöF—7G&–7B2F—FÆP¢e$ôÒ66†ööÅ÷6W'f–6U÷66†ööÇ0¢t„U$RVGV6F–öæÅöF—7G&–7B•2äõBåTÄÂäBE$”Ò†VGV6F–öæÅöF—7G&–7B“Ãârp¢äBVGV6F–öæÅöF—7G&–7CÓð¢Ä”Ô•B"Åµ÷77eöæ÷&Ò‚GF—FÆR•Ò“°¢–b‚G&÷r’&WGW&âG'VS°¢G&÷w3ÔF#£¦ÆÂ‚%4TÄT5BVGV6F–öæÅöF—7G&–7B2F—FÆP¢e$ôÒ66†ööÅ÷6W'f–6U÷66†ööÇ0¢t„U$RVGV6F–öæÅöF—7G&–7B•2äõBåTÄÂäBE$”Ò†VGV6F–öæÅöF—7G&–7B“Ãârp¢u$õU%’VGV6F–öæÅöF—7G&–7B"“°¢f÷&V6‚‚G&÷w22G"—°¢–b…÷77eöF—7G&–7Eöæ÷&ÖÆ—¦VB‚G%²wF—FÆRuÓóòrr“ÓÓÒFæ÷&ÖÆ—¦VB’&WGW&âG'VS°¢Ð¢Ö6F6‚…F‡&÷v&ÆRFR—·Ð¢&WGW&âfÇ6S°§Ð¦gVæ7F–öâ÷77e÷76VævW'2‚F"—²Fg&öçCÖÖ‚ƒÂ†–çB’‚F%²w76VævW%ög&öçEö6÷VçBuÓóòF%²vg&öçE÷76VævW%ö6÷VçBuÓóó’“²G&V#ÖÖ‚ƒÂ†–çB’‚F%²w76VævW%÷&V%ö6÷VçBuÓóòF%²w&V%÷76VævW%ö6÷VçBuÓóó’“·&WGW&â²Fg&öçBÂG&V"ÂFg&öçB²G&V%Ó·Ð¦gVæ7F–öâ÷77e÷ÆFR‚F"—°¢F×&Vu÷&WÆ6R‚rõÄBòrÂrrÅ÷77eöVâ‚F%²wÆFU÷F‡&VRuÓóòrr’“°¢F3×&Vu÷&WÆ6R‚rõÄBòrÂrrÅ÷77eöVâ‚F%²wÆFU÷GvòuÓóòrr’“°¢G#×&Vu÷&WÆ6R‚rõÄBòrÂrrÅ÷77eöVâ‚F%²wÆFU÷&Vv–öåö6öFRuÓóòrr’“°¢FÃÕ÷77eöæ÷&Ò‚F%²wÆFUöÆWGFW"uÓóòrr“°¢FÆÆ÷vVCÕ²}Š‚rÂ}ŠÂrÂ}ŠòrÂ}‹2rÂ}‹RrÂ}‹rrÂ}˜"rÂ}˜BrÂ}˜RrÂ}˜brÂ}˜‚rÂ}˜}˜rÂ}¸ÂrÂ}Š¢rÂ}‹’rÂ}ª’rÂ}Š}˜M˜rÂ}›ârÂ}Š²rÂ}‹BrÂ}‹"rÂ}˜rÂ}ªòrÂ}©‚uÓ°¢–b‚FÓÒrrbg7G&ÆVâ‚F’ÓÓ2”‡GG£¦W'&÷"‚}ŠŠí‹B‹=˜~(Í‹˜-˜]¸Â›í˜MŠ}ª’ŠŠ}¸ÍŠòŠý˜-¸Í˜-Š}˜²»2‹˜-˜RŠŠ}‹MŠòrÃC#"“°¢–b‚F2ÓÒrrbg7G&ÆVâ‚F2’ÓÓ"”‡GG£¦W'&÷"‚}ŠŠí‹BŠý˜‹˜-˜]¸Â›í˜MŠ}ª’ŠŠ}¸ÍŠòŠý˜-¸Í˜-Š}˜²»"‹˜-˜RŠŠ}‹MŠòrÃC#"“°¢–b‚G"ÓÒrrbg7G&ÆVâ‚G"’ÓÓ"”‡GG£¦W'&÷"‚}ªŠò˜]˜m‹}˜-˜~(ÍŠ}¸Â›í˜MŠ}ª’ŠŠ}¸ÍŠòŠý˜-¸Í˜-Š}˜²»"‹˜-˜RŠŠ}‹MŠòrÃC#"“°¢–b‚FÂÓÒrrbb–åö'&’‚FÂÂFÆÆ÷vVBÇG'VR’”‡GG£¦W'&÷"‚}ŠÝ‹˜Š}˜mŠ­ŠíŠ}ŠŽ(Í‹MŠý˜rŠ‹Š}¸Â›í˜MŠ}ª’˜]‹Š­Š‹˜m¸Í‹=Š¢ârÃC#"“°¢&WGW&â²Fó¦çVÆÂÂFÃó¦çVÆÂÂF3ó¦çVÆÂÂG#ó¦çVÆÅÓ°§Ð¦gVæ7F–öâ÷77e÷†Ç7…÷&÷w2‚Ff–ÆR—°¢–b‚6Æ75öW†—7G2‚u¦—&6†—fRr’’‡GG£¦W'&÷"‚}Š}˜]ªŠ}˜bŠí˜Š}˜mŠý˜b˜Š}¸Í˜BW†6VÂ‹˜¸Â‹=‹˜‹˜‹Š}˜B˜m¸Í‹=Š¢ârÃS“°¢–b‚Ff–ÆWÇÂ‚Ff–ÆU²vW'&÷"uÓóõUÄôEôU%%ôäõôd”ÄR’ÓÕUÄôEôU%%ôô²’‡GG£¦W'&÷"‚}˜Š}¸Í˜BW†6VÂŠý‹¸ÍŠ}˜Š¢˜m‹MŠòârÃC#"“°¢G£ÖæWr¦—&6†—fR‚“¶–b‚G¢Óæ÷Vâ‚Ff–ÆU²wF×öæÖRuÒ’Ó×G'VR”‡GG£¦W'&÷"‚}˜Š}¸Í˜BW†6VÂ˜]‹Š­Š‹˜m¸Í‹=Š¢ârÃC#"“°¢G6†&VCÕµÓ²G7ƒÒG¢ÓævWDg&öÔæÖR‚w†Â÷6†&VE7G&–æw2ç†ÖÂr“°¢–b‚G7‚ÓÖfÇ6R—²G†ÖÃÔ6–×ÆW†ÖÅöÆöE÷7G&–ær‚G7‚“¶–b‚G†ÖÂ–f÷&V6‚‚G†ÖÂÓç6’2G6’—²GCÒrs¶f÷&V6‚‚G6’Óç‡F‚‚râò÷Br’2G‚’GBãÒ‡7G&–ær’Gƒ²G6†&VEµÓÒGC·×Ð¢Gv#Ô6–×ÆW†ÖÅöÆöE÷7G&–ær‚‡7G&–ær’G¢ÓævWDg&öÔæÖR‚w†Â÷v÷&¶&öö²ç†ÖÂr’“²G&VÇ3Ô6–×ÆW†ÖÅöÆöE÷7G&–ær‚‡7G&–ær’G¢ÓævWDg&öÔæÖR‚w†Âõ÷&VÇ2÷v÷&¶&öö²ç†ÖÂç&VÇ2r’“°¢G6†VWG3ÕµÓ°¢–b‚Gv"—²Fç3ÒGv"ÓævWDFö4æÖW76W2‡G'VR“²Gv"Óç&Vv—7FW%…F„æÖW76R‚vÒrÂFç5²ruÓóòv‡GG¢ò÷66†VÖ2æ÷Vç†ÖÆf÷&ÖG2æ÷&r÷7&VG6†VWFÖÂó#böÖ–âr“²G&VÇ4ç3ÒG&VÇ3òG&VÇ2ÓævWDFö4æÖW76W2‡G'VR“¥µÓ²G&VÇ2Óç&Vv—7FW%…F„æÖW76R‚w"rÂG&VÇ4ç5²ruÓóòv‡GG¢ò÷66†VÖ2æ÷Vç†ÖÆf÷&ÖG2æ÷&r÷6¶vRó#b÷&VÆF–öç6†—2r“²G&VÇ4ÖÕµÓ¶–b‚G&VÇ2–f÷&V6‚‚G&VÇ2Óå&VÆF–öç6†—2G'"’G&VÇ4Ö²‡7G&–ær’G'%²t–BuÕÓÒ‡7G&–ær’G'%²uF&vWBuÓ¶f÷&V6‚‚Gv"Óç‡F‚‚ròöÓ§6†VWG2öÓ§6†VWBr’2G6‚—²G&–CÒ‡7G&–ær’G6‚ÓæGG&–'WFW2‚v‡GG¢ò÷66†VÖ2æ÷Vç†ÖÆf÷&ÖG2æ÷&rööff–6TFö7VÖVçBó#b÷&VÆF–öç6†—2r•²v–BuÓ²GF&vWCÒG&VÇ4Ö²G&–EÓóòrs²GF&vWCÖÇG&–Ò‚GF&vWBÂròr“¶–b‡7G'÷2‚GF&vWBÂw†Âòr’ÓÓ’GF&vWCÒw†ÂòrâGF&vWC²G6†VWG5µÓÕ²‡7G&–ær’G6…²væÖRuÒÂGF&vWEÓ·×Ð¢F÷WCÕµÓ°¢f÷&V6‚‚G6†VWG22²FæÖRÂGF…Ò—°¢G†ÖÃÔ6–×ÆW†ÖÅöÆöE÷7G&–ær‚‡7G&–ær’G¢ÓævWDg&öÔæÖR‚GF‚’“¶–b‚G†ÖÂ–6öçF–çVS²Fç3ÒG†ÖÂÓævWDFö4æÖW76W2‡G'VR“²G†ÖÂÓç&Vv—7FW%…F„æÖW76R‚vÒrÂFç5²ruÓóòv‡GG¢ò÷66†VÖ2æ÷Vç†ÖÆf÷&ÖG2æ÷&r÷7&VG6†VWFÖÂó#böÖ–âr“²G&÷w3ÕµÓ°¢f÷&V6‚‚G†ÖÂÓç‡F‚‚ròöÓ§6†VWDFFöÓ§&÷rr’2G&÷r—²F6VÆÇ3ÕµÓ¶f÷&V6‚‚G&÷rÓæ22F6VÆÂ—²G&VcÒ‡7G&–ær’F6VÆÅ²w"uÓ·&VuöÖF6‚‚rò…´Õ¥Ò²•ÆB²òrÂG&VbÂFÖÒ“²F6öÃÓ¶f÷&V6‚‡7G%÷7Æ—B‚FÖÕ³Óóòtr’2F6‚’F6öÃÒF6öÂ£#b²†÷&B‚F6‚’ÓcB“²GcÒ‡7G&–ær’F6VÆÂÓçc¶–b‚‡7G&–ær’F6VÆÅ²wBuÓÓÓÒw2r’GcÒG6†&VE²†–çB’GeÓóòrs¶VÇ6V–b‚‡7G&–ær’F6VÆÅ²wBuÓÓÓÒv–æÆ–æU7G"r’GcÖ–×ÆöFR‚rrÆ'&•öÖ‚w7G'fÂrÂF6VÆÂÓæ—2ÓçCóõµÒ’“²F6VÆÇ5²F6öÅÓÒGc·Ö–b‚F6VÆÇ2’G&÷w5µÓÒF6VÆÇ3·Ð¢F÷WE²FæÖUÓÒG&÷w3°¢Ð¢G¢Óæ6Æ÷6R‚“·&WGW&âF÷WC°§Ð¦gVæ7F–öâ÷77e÷6†VWE÷&V6÷&G2‚G&÷w2—°¢–b†6÷VçB‚G&÷w2“Ã"—&WGW&âµÓ°¢FƒÒG&÷w5³Ó²FÖÕµÓ¶f÷&V6‚‚F‚2F“ÓâGb’FÖµ÷77eöæ÷&Ò‚Gb•ÓÒF“°¢FÆ–6W3Õ°¢v6öFRsÓå²}ªŠò˜]Šý‹‹=˜rrÂ}‹M˜mŠ}‹=˜r˜]Šý‹‹=˜rrÂ}ªŠòuÒÀ¢w66†ööÂsÓå²}˜mŠ}˜R˜]Šý‹‹=˜rrÂ}˜]Šý‹‹=˜ruÒÀ¢vF—7G&–7BsÓå²}˜mŠ}ŠÝ¸Í˜rŠ-˜]˜‹-‹M¸ÂrÂ}˜mŠ}ŠÝ¸Í˜rrÂ}˜]˜m‹}˜-˜rŠ-˜]˜‹-‹M¸ÂuÒÀ¢vvVæFW"sÓå²}˜m˜‹’˜]Šý‹‹=˜rrÂ}ŠÍ˜m‹=¸ÍŠ¢˜]Šý‹‹=˜rrÂ}ŠÍ˜m‹=¸ÍŠ¢uÒÀ¢v6ö×ç’sÓå²}‹M‹ªŠ¢˜]ŠÍ‹¸Â‹=‹˜¸Í‹2ŠýŠ}˜m‹N(ÍŠ-˜]˜‹-¸ÂrÂ}‹M‹ªŠ¢˜]ŠÍ‹¸ÂrÂ}‹M‹ªŠ¢‹=‹˜¸Í‹>(ÍŠý˜}˜mŠý˜rrÂ}‹M‹ªŠ¢uÒÀ¢vÖævW"sÓå²}˜]Šý¸Í‹‹M‹ªŠ¢rÂ}˜]Šý¸Í‹‹Š}˜]˜BrÂ}˜mŠ}˜R˜]Šý¸Í‹uÒÀ¢vÖævW%öÖö&–ÆRsÓå²}Š­˜M˜˜b˜}˜]‹Š}˜r˜]Šý¸Í‹‹Š}˜]˜BrÂ}˜]˜ŠŠ}¸Í˜B˜]Šý¸Í‹‹Š}˜]˜BrÂ}˜]˜ŠŠ}¸Í˜B˜]Šý¸Í‹rÂ}˜]˜ŠŠ}¸Í˜BuÒÀ¢vÆæFÆ–æRsÓå²}Š­˜M˜˜bŠ½Š}ŠŠ¢rÂ}Š­˜M˜˜b‹M‹ªŠ¢rÂ}Š­˜M˜˜buÒÀ¢w†öæRsÓå²}Š­˜M˜˜b‹M‹ªŠ¢rÂ}‹M˜]Š}‹˜rŠ­˜]Š}‹2rÂ}˜]˜ŠŠ}¸Í˜BuÒÀ¢vFG&W72sÓå²}Š-Šý‹‹2rÂ}˜m‹MŠ}˜m¸ÂuÒÀ¢vÆF—GVFRsÓå²}‹‹‹bŠÍ‹­‹Š}˜¸ÍŠ}¸Í¸ÂrÂvÆF—GVFRrÂvÆBuÒÀ¢vÆöæv—GVFRsÓå²}‹}˜˜BŠÍ‹­‹Š}˜¸ÍŠ}¸Í¸ÂrÂvÆöæv—GVFRrÂvÆæruÒÀ¢w&Vv—7FW&VE÷66†ööÅö6÷VçBsÓå²}˜]ŠýŠ}‹‹2Š½ŠŠ®(Í‹MŠý˜rrÂ}Š­‹ŠýŠ}Šò˜]ŠýŠ}‹‹2Š½ŠŠ®(Í‹MŠý˜ruÒÀ¢w&W&W6VçFF—fUö6÷VçBsÓå²}Š­‹ŠýŠ}Šò˜m˜]Š}¸Í˜mŠýªýŠ}˜brÂ}˜m˜]Š}¸Í˜mŠýªýŠ}˜buÒÀ¢w7FGW2sÓå²}˜‹m‹¸ÍŠ¢‹M‹ªŠ¢rÂ}˜‹m‹¸ÍŠ¢uÒÀ¢w&öf–ÆUö6ö×ÆWFRsÓå²}Š­ª˜]¸Í˜B›í‹˜˜Š}¸Í˜BrÂ}˜‹m‹¸ÍŠ¢Š­ª˜]¸Í˜B›í‹˜˜Š}¸Í˜BuÐ¢Ó°¢Ff–æCÖgVæ7F–öâ‚F¶W’—W6R‚FÖÂFÆ–6W2—¶f÷&V6‚‚FÆ–6W5²F¶W•ÓóõµÒ2F—²FÕ÷77eöæ÷&Ò‚F“¶–b†'&•ö¶W•öW†—7G2‚FÂFÖ’—&WGW&âFÖ²FÓ·×&WGW&âçVÆÃ·Ó°¢F–GƒÕµÓ¶f÷&V6‚†'&•ö¶W—2‚FÆ–6W2’2F²’F–G…²FµÓÒFf–æB‚F²“²F÷WCÕµÓ°¢f÷"‚G#Ó²G#Æ6÷VçB‚G&÷w2“²G"²²—²GƒÒG&÷w5²G%Ó²FvWCÖfâ‚F²“ÓâF–G…²FµÓÓÓÖçVÆÃòrs§G&–Ò‚‡7G&–ær’‚G…²F–G…²FµÕÓóòrr’“²G66†ööÃÒFvWB‚w66†ööÂr“²F6ö×ç“ÒFvWB‚v6ö×ç’r“¶–b†–åö'&’‚F6ö×ç’Å²}˜mŠ}˜]‹MŠí‹RrÂ}˜mŠ}˜]‹˜M˜˜RrÂrÒrÂ~(	BuÒÇG'VR’’F6ö×ç“Òrs¶–b‚G66†ööÃÓÓÒrrbbF6ö×ç“ÓÓÒrr–6öçF–çVS²F÷WEµÓÕ²v6öFRsÓâFvWB‚v6öFRr’Âw66†ööÂsÓâG66†ööÂÂvF—7G&–7BsÓâFvWB‚vF—7G&–7Br’ÂvvVæFW"sÓâFvWB‚vvVæFW"r’Âv6ö×ç’sÓâF6ö×ç’ÂvÖævW"sÓâFvWB‚vÖævW"r’ÂvÖævW%öÖö&–ÆRsÓâFvWB‚vÖævW%öÖö&–ÆRr’ÂvÆæFÆ–æRsÓâFvWB‚vÆæFÆ–æRr’Âw†öæRsÓâFvWB‚w†öæRr’ÂvFG&W72sÓâFvWB‚vFG&W72r’ÂvÆF—GVFRsÓâFvWB‚vÆF—GVFRr’ÂvÆöæv—GVFRsÓâFvWB‚vÆöæv—GVFRr’Âw&Vv—7FW&VE÷66†ööÅö6÷VçBsÓâFvWB‚w&Vv—7FW&VE÷66†ööÅö6÷VçBr’Âw&W&W6VçFF—fUö6÷VçBsÓâFvWB‚w&W&W6VçFF—fUö6÷VçBr’Âw7FGW2sÓâFvWB‚w7FGW2r’Âw&öf–ÆUö6ö×ÆWFRsÓâFvWB‚w&öf–ÆUö6ö×ÆWFRr•Ó·Ð¢&WGW&âF÷WC°§Ð  §&÷WFR‚uõ5BrÂrö’÷66†ööÂ×6W'f–6Rö6ö×æ–W2rÆgVæ7F–öâ‚GÂF"ÂGR—µ÷77eöæVVB‚GRÂvVF—Br“µ÷77e÷F&ÆW2‚“²FæÖSÕ÷77eöæ÷&Ò‚F%²væÖRuÓóòrr“¶–b‚FæÖSÓÓÒrr”‡GG£¦W'&÷"‚}˜mŠ}˜R‹M‹ªŠ¢Š}˜M‹-Š}˜]¸ÂŠ}‹=Š¢rÃC#"“¶–b„F#£¦öæR‚%4TÄT5B–Be$ôÒ66†ööÅ÷6W'f–6Uö6ö×æ–W2t„U$RæÖSÓò"Å²FæÖUÒ’”‡GG£¦W'&÷"‚}Š}¸Í˜b‹M‹ªŠ¢˜-Š˜MŠ}˜²Š½ŠŠ¢‹MŠý˜rŠ}‹=Š¢rÃC’“´F#£§'Vâ‚$”å4U%B”åDò66†ööÅ÷6W'f–6Uö6ö×æ–W2†æÖRÆÖævW%öæÖRÇ†öæRÆFG&W72ÆÖævW%öÖö&–ÆRÆÆæFÆ–æU÷†öæRÆÆF—GVFRÆÆöæv—GVFRÇ&Vv—7FW&VE÷66†ööÅö6÷VçBÇ&W&W6VçFF—fUö6÷VçBÇ7FGW2Ç&öf–ÆUö6ö×ÆWFR’dÅTU2ƒòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃò’"Å²FæÖRÅ÷77eöæ÷&Ò‚F%²vÖævW%öæÖRuÓóòrr“ó¦çVÆÂÇG&–Ò‚F%²w†öæRuÓóòrr“ó¦çVÆÂÅ÷77eöæ÷&Ò‚F%²vFG&W72uÓóòrr“ó¦çVÆÂÇG&–Ò‚F%²vÖævW%öÖö&–ÆRuÓóòrr“ó¦çVÆÂÇG&–Ò‚F%²vÆæFÆ–æU÷†öæRuÓóòrr“ó¦çVÆÂÆ—76WB‚F%²vÆF—GVFRuÒ’bbF%²vÆF—GVFRuÒÓÒrsò†fÆöB’F%²vÆF—GVFRuÓ¦çVÆÂÆ—76WB‚F%²vÆöæv—GVFRuÒ’bbF%²vÆöæv—GVFRuÒÓÒrsò†fÆöB’F%²vÆöæv—GVFRuÓ¦çVÆÂÆÖ‚ƒÂ†–çB’‚F%²w&Vv—7FW&VE÷66†ööÅö6÷VçBuÓóó’’ÆÖ‚ƒÂ†–çB’‚F%²w&W&W6VçFF—fUö6÷VçBuÓóó’’Å÷77eöæ÷&Ò‚F%²w7FGW2uÓóò}˜‹Š}˜Br“ó¢}˜‹Š}˜BrÂV×G’‚F%²w&öf–ÆUö6ö×ÆWFRuÒ“ó£Ò“·&WGW&â²vö²sÓçG'VRÂv–BsÓâ†–çB”F#£§Fò‚’ÓæÆ7D–ç6W'D–B‚•Ó·Ò“°§&÷WFR‚uUBrÂrö’÷66†ööÂ×6W'f–6Rö6ö×æ–W2÷¶–GÒrÆgVæ7F–öâ‚GÂF"ÂGR—µ÷77eöæVVB‚GRÂvVF—Br“µ÷77e÷F&ÆW2‚“²F–CÒ†–çB’G²v–BuÓ¶–b‚F#£¦öæR‚%4TÄT5B–Be$ôÒ66†ööÅ÷6W'f–6Uö6ö×æ–W2t„U$R–CÓò"Å²F–EÒ’”‡GG£¦W'&÷"‚}‹M‹ªŠ¢¸ÍŠ}˜Š¢˜m‹MŠòrÃCB“²FæÖSÕ÷77eöæ÷&Ò‚F%²væÖRuÓóòrr“¶–b‚FæÖSÓÓÒrr”‡GG£¦W'&÷"‚}˜mŠ}˜R‹M‹ªŠ¢Š}˜M‹-Š}˜]¸ÂŠ}‹=Š¢rÃC#"“´F#£§'Vâ‚%UDDR66†ööÅ÷6W'f–6Uö6ö×æ–W24UBæÖSÓòÆÖævW%öæÖSÓòÇ†öæSÓòÆFG&W73ÓòÆÖævW%öÖö&–ÆSÓòÆÆæFÆ–æU÷†öæSÓòÆÆF—GVFSÓòÆÆöæv—GVFSÓòÇ&Vv—7FW&VE÷66†ööÅö6÷VçCÓòÇ&W&W6VçFF—fUö6÷VçCÓòÇ7FGW3ÓòÇ&öf–ÆUö6ö×ÆWFSÓòÆ—5ö7F—fSÓòt„U$R–CÓò"Å²FæÖRÅ÷77eöæ÷&Ò‚F%²vÖævW%öæÖRuÓóòrr“ó¦çVÆÂÇG&–Ò‚F%²w†öæRuÓóòrr“ó¦çVÆÂÅ÷77eöæ÷&Ò‚F%²vFG&W72uÓóòrr“ó¦çVÆÂÇG&–Ò‚F%²vÖævW%öÖö&–ÆRuÓóòrr“ó¦çVÆÂÇG&–Ò‚F%²vÆæFÆ–æU÷†öæRuÓóòrr“ó¦çVÆÂÂF%²vÆF—GVFRuÒÓÒrrbf—76WB‚F%²vÆF—GVFRuÒ“ò†fÆöB’F%²vÆF—GVFRuÓ¦çVÆÂÂF%²vÆöæv—GVFRuÒÓÒrrbf—76WB‚F%²vÆöæv—GVFRuÒ“ò†fÆöB’F%²vÆöæv—GVFRuÓ¦çVÆÂÆÖ‚ƒÂ†–çB’‚F%²w&Vv—7FW&VE÷66†ööÅö6÷VçBuÓóó’’ÆÖ‚ƒÂ†–çB’‚F%²w&W&W6VçFF—fUö6÷VçBuÓóó’’Å÷77eöæ÷&Ò‚F%²w7FGW2uÓóò}˜‹Š}˜Br“ó¢}˜‹Š}˜BrÂV×G’‚F%²w&öf–ÆUö6ö×ÆWFRuÒ“ó£Æ—76WB‚F%²v—5ö7F—fRuÒ“ò†–çB’F%²v—5ö7F—fRuÓ£ÂF–EÒ“·&WGW&â²vö²sÓçG'VUÓ·Ò“°§&÷WFR‚tDTÄUDRrÂrö’÷66†ööÂ×6W'f–6Rö6ö×æ–W2÷¶–GÒrÆgVæ7F–öâ‚GÂF"ÂGR—µ÷77eöæVVB‚GRÂvFVÆWFRr“µ÷77e÷F&ÆW2‚“²F–CÒ†–çB’G²v–BuÓ´F#£§'Vâ‚%UDDR66†ööÅ÷6W'f–6Uö6ö×æ–W24UB—5ö7F—fSÓÇ7FGW3Ò}‹­¸Í‹˜‹Š}˜Brt„U$R–CÓò"Å²F–EÒ“·&WGW&â²vö²sÓçG'VUÓ·Ò“°§&÷WFR‚uõ5BrÂrö’÷66†ööÂ×6W'f–6R÷66†ööÇ2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢–b‡G&–Ò‚‡7G&–ær’‚F%²væÖRuÓóòrr’“ÓÓÒrr—°¢÷77eöæVVB‚GRÂwf–Wrr“µ÷77e÷F&ÆW2‚“µ÷77eöWF÷6VVE÷66†ööÇ2‚“°¢GÕ÷77eöæ÷&Ò‚F%²w6V&6‚uÓóòEôtUE²w6V&6‚uÓóòrr“²F6ö×ç“Ò†–çB’‚F%²v6ö×ç•ö–BuÓóòEôtUE²v6ö×ç•ö–BuÓóó“²FF—7G&–7CÕ÷77eöF—7G&–7Eö¶W’‚F%²vF—7G&–7BuÓóòEôtUE²vF—7G&–7BuÓóòrr“²GsÕ²w2æ—5ö7F—fSÓuÓ²F&w3ÕµÓ°¢–b‚GÓÒrr—²GuµÓÒr‡2ææÖRÄ”´Ròõ"2æ6öFRÄ”´Rò’s²F&w5µÓÒrRrâGârRs²F&w5µÓÒrRrâGârRs·Ð¢–b‚F6ö×ç’—²GuµÓÒtU„•5E2…4TÄT5Be$ôÒ66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W2‚t„U$R‚ç66†ööÅö–C×2æ–BäB‚æ6ö×ç•ö–CÓò’s²F&w5µÓÒF6ö×ç“·Ð¢–b‚FF—7G&–7BÓÒrr—²GuµÓÕ÷77eöF—7G&–7E÷7Â‚w2æVGV6F–öæÅöF—7G&–7Br’âsÓòs²F&w5µÓÕ÷77eöF—7G&–7Eöæ÷&ÖÆ—¦VB‚FF—7G&–7B“·Ð¢Gv†W&SÖ–×ÆöFR‚räBrÂGr“°¢&WGW&â²v—FV×2sÓäF#£¦ÆÂ‚%4TÄT5B2æ–BÇ2æ6öFRÇ2ææÖRÇ2æVGV6F–öæÅöF—7G&–7BÇ2ævVæFW"Ç2æFG&W72Ç2æÆF—GVFRÇ2æÆöæv—GVFRÇ2æÆö6F–öå÷&Vv—7FW&VEöBÂ…4TÄT5B67‚æ6ö×ç•ö–Be$ôÒ66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W267‚t„U$R67‚ç66†ööÅö–C×2æ–Bõ$DU"%’67‚æ—5÷&–Ö'’DU42Ç67‚æ6ö×ç•ö–B42Ä”Ô•B’6ö×ç•ö–BÄu$õUô4ôä4B„D•5D”ä5B2ææÖRõ$DU"%’2ææÖR4U$Dõ"rÂr’6ö×ç•öæÖW2e$ôÒ66†ööÅ÷6W'f–6U÷66†ööÇ22ÄTeB¤ô”â66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W262ôâ62ç66†ööÅö–C×2æ–BÄTeB¤ô”â66†ööÅ÷6W'f–6Uö6ö×æ–W22ôâ2æ–C×62æ6ö×ç•ö–Bt„U$RGv†W&Ru$õU%’2æ–Bõ$DU"%’2ææÖRÄ”Ô•BS"ÂF&w2•Ó°¢Ð¢÷77eöæVVB‚GRÂv7&VFRr“µ÷77e÷F&ÆW2‚“²FæÖSÕ÷77eöæ÷&Ò‚F%²væÖRuÓóòrr“¶–b‚FæÖSÓÓÒrr”‡GG£¦W'&÷"‚}˜mŠ}˜R˜]Šý‹‹=˜rŠ}˜M‹-Š}˜]¸ÂŠ}‹=Š¢rÃC#"“²FF—7G&–7CÕ÷77eöF—7G&–7Eö¶W’‚F%²vVGV6F–öæÅöF—7G&–7BuÓóòrr“¶–b‚FF—7G&–7CÓÓÒrwÇÂ÷77e÷fÆ–EöF—7G&–7B‚FF—7G&–7B’”‡GG£¦W'&÷"‚}˜mŠ}ŠÝ¸Í˜rŠ-˜]˜‹-‹M¸ÂŠ}˜mŠ­ŠíŠ}ŠŽ(Í‹MŠý˜r˜]‹Š­Š‹¸ÍŠr˜‹Š}˜B˜m¸Í‹=Š¢ârÃC#"“²FsÖ–åö'&’‚F%²vvVæFW"uÓóòrrÅ²}ŠýŠíŠ­‹Š}˜m˜rrÂ}›í‹=‹Š}˜m˜ruÒÇG'VR“òF%²vvVæFW"uÓ¢}˜mŠ}˜]‹MŠí‹Rs²F6–CÒV×G’‚F%²v6ö×ç•ö–BuÒ“ò†–çB’F%²v6ö×ç•ö–BuÓ£¶–b‚F6–BbbF#£¦öæR‚%4TÄT5B–Be$ôÒ66†ööÅ÷6W'f–6Uö6ö×æ–W2t„U$R–CÓòäB—5ö7F—fSÓ"Å²F6–EÒ’”‡GG£¦W'&÷"‚}‹M‹ªŠ¢˜]ŠÍ‹¸Â˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÃC#"“µ²FÆBÂFÆæuÓ×fÆ–DvVò‚F%²vÆF—GVFRuÓóöçVÆÂÂF%²vÆöæv—GVFRuÓóöçVÆÂ“´F#£§'Vâ‚$”å4U%B”åDò66†ööÅ÷6W'f–6U÷66†ööÇ2†6öFRÆæÖRÆVGV6F–öæÅöF—7G&–7BÆvVæFW"ÆFG&W72ÆÆF—GVFRÆÆöæv—GVFRÆÆö6F–öå÷&Vv—7FW&VEöB’dÅTU2ƒòÃòÃòÃòÃòÃòÃòÃò’"Åµ÷77eöæ÷&Ò‚F%²v6öFRuÓóòrr“ó¦çVÆÂÂFæÖRÂFF—7G&–7Có¦çVÆÂÂFrÅ÷77eöæ÷&Ò‚F%²vFG&W72uÓóòrr“ó¦çVÆÂÂFÆBÂFÆærÂ‚FÆBÓÖçVÆÂbbFÆærÓÖçVÆÂ“öFFR‚u’ÖÒÖBƒ¦“§2r“¦çVÆÅÒ“²G6–CÒ†–çB”F#£§Fò‚’ÓæÆ7D–ç6W'D–B‚“¶–b‚F6–B”F#£§'Vâ‚$”å4U%B”åDò66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W2‡66†ööÅö–BÆ6ö×ç•ö–BÆ—5÷&–Ö'’’dÅTU2ƒòÃòÃ’"Å²G6–BÂF6–EÒ“·&WGW&â²vö²sÓçG'VRÂv–BsÓâG6–EÓ°§Ò“°§&÷WFR‚uUBrÂrö’÷66†ööÂ×6W'f–6R÷66†ööÇ2÷¶–GÒrÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷77eöæVVB‚GRÂvVF—Br“µ÷77e÷F&ÆW2‚“²F–CÒ†–çB’G²v–BuÓ²FW†—7F–æsÔF#£¦öæR‚%4TÄT5B¢e$ôÒ66†ööÅ÷6W'f–6U÷66†ööÇ2t„U$R–CÓò"Å²F–EÒ“¶–b‚FW†—7F–ær”‡GG£¦W'&÷"‚}˜]Šý‹‹=˜r¸ÍŠ}˜Š¢˜m‹MŠòrÃCB“°¢FæÖSÕ÷77eöæ÷&Ò‚F%²væÖRuÓóòFW†—7F–æu²væÖRuÒ“¶–b‚FæÖSÓÓÒrr”‡GG£¦W'&÷"‚}˜mŠ}˜R˜]Šý‹‹=˜rŠ}˜M‹-Š}˜]¸ÂŠ}‹=Š¢rÃC#"“²FsÖ–åö'&’‚F%²vvVæFW"uÓóòFW†—7F–æu²vvVæFW"uÒÅ²}ŠýŠíŠ­‹Š}˜m˜rrÂ}›í‹=‹Š}˜m˜ruÒÇG'VR“òF%²vvVæFW"uÓ¢‚FW†—7F–æu²vvVæFW"uÓó¢}˜mŠ}˜]‹MŠí‹Rr“°¢F6öFSÖ'&•ö¶W•öW†—7G2‚v6öFRrÂF"“ò…÷77eöæ÷&Ò‚F%²v6öFRuÒ“ó¦çVÆÂ“¢FW†—7F–æu²v6öFRuÓ²FF—7G&–7CÖ'&•ö¶W•öW†—7G2‚vVGV6F–öæÅöF—7G&–7BrÂF"“ò…÷77eöF—7G&–7Eö¶W’‚F%²vVGV6F–öæÅöF—7G&–7BuÒ“ó¦çVÆÂ“¥÷77eöF—7G&–7Eö¶W’‚FW†—7F–æu²vVGV6F–öæÅöF—7G&–7BuÒ“¶–b‚FF—7G&–7CÓÓÖçVÆÇÇÂ÷77e÷fÆ–EöF—7G&–7B‚FF—7G&–7B’”‡GG£¦W'&÷"‚}˜mŠ}ŠÝ¸Í˜rŠ-˜]˜‹-‹M¸ÂŠ}˜mŠ­ŠíŠ}ŠŽ(Í‹MŠý˜r˜]‹Š­Š‹¸ÍŠr˜‹Š}˜B˜m¸Í‹=Š¢ârÃC#"“²FFG&W73Ö'&•ö¶W•öW†—7G2‚vFG&W72rÂF"“ò…÷77eöæ÷&Ò‚F%²vFG&W72uÒ“ó¦çVÆÂ“¢FW†—7F–æu²vFG&W72uÓ°¢–b†'&•ö¶W•öW†—7G2‚vÆF—GVFRrÂF"—ÇÆ'&•ö¶W•öW†—7G2‚vÆöæv—GVFRrÂF"’—µ²FÆBÂFÆæuÓ×fÆ–DvVò‚F%²vÆF—GVFRuÓóöçVÆÂÂF%²vÆöæv—GVFRuÓóöçVÆÂ“´F#£§'Vâ‚%UDDR66†ööÅ÷6W'f–6U÷66†ööÇ24UB6öFSÓòÆæÖSÓòÆVGV6F–öæÅöF—7G&–7CÓòÆvVæFW#ÓòÆFG&W73ÓòÆÆF—GVFSÓòÆÆöæv—GVFSÓòÆÆö6F–öå÷&Vv—7FW&VEöCÓòt„U$R–CÓò"Å²F6öFRÂFæÖRÂFF—7G&–7BÂFrÂFFG&W72ÂFÆBÂFÆærÂ‚FÆBÓÖçVÆÂbbFÆærÓÖçVÆÂ“öFFR‚u’ÖÒÖBƒ¦“§2r“¦çVÆÂÂF–EÒ“·Ð¢VÇ6RF#£§'Vâ‚%UDDR66†ööÅ÷6W'f–6U÷66†ööÇ24UB6öFSÓòÆæÖSÓòÆVGV6F–öæÅöF—7G&–7CÓòÆvVæFW#ÓòÆFG&W73Óòt„U$R–CÓò"Å²F6öFRÂFæÖRÂFF—7G&–7BÂFrÂFFG&W72ÂF–EÒ“°¢–b†'&•ö¶W•öW†—7G2‚v6ö×ç•ö–BrÂF"’—´F#£§'Vâ‚$DTÄUDRe$ôÒ66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W2t„U$R66†ööÅö–CÓò"Å²F–EÒ“²F6–CÒ†–çB’F%²v6ö×ç•ö–BuÓ¶–b‚F6–B—¶–b‚F#£¦öæR‚%4TÄT5B–Be$ôÒ66†ööÅ÷6W'f–6Uö6ö×æ–W2t„U$R–CÓòäB—5ö7F—fSÓ"Å²F6–EÒ’”‡GG£¦W'&÷"‚}‹M‹ªŠ¢˜]ŠÍ‹¸Â˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÃC#"“´F#£§'Vâ‚$”å4U%B”åDò66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W2‡66†ööÅö–BÆ6ö×ç•ö–BÆ—5÷&–Ö'’’dÅTU2ƒòÃòÃ’"Å²F–BÂF6–EÒ“·×Ð¢&WGW&â²vö²sÓçG'VRÂv–BsÓâF–EÓ°§Ò“°§&÷WFR‚tDTÄUDRrÂrö’÷66†ööÂ×6W'f–6R÷66†ööÇ2÷¶–GÒrÆgVæ7F–öâ‚GÂF"ÂGR—µ÷77eöæVVB‚GRÂvFVÆWFRr“µ÷77e÷F&ÆW2‚“´F#£§'Vâ‚%UDDR66†ööÅ÷6W'f–6U÷66†ööÇ24UB—5ö7F—fSÓt„U$R–CÓò"Å²†–çB’G²v–BuÕÒ“·&WGW&â²vö²sÓçG'VUÓ·Ò“°§&÷WFR‚ttUBrÂrö’÷66†ööÂ×6W'f–6Rö66W72rÆgVæ7F–öâ‚GÂF"ÂGR—µ÷77e÷F&ÆW2‚“·&WGW&â²vÆÆ÷vVBsÓå÷77e÷W&Ò‚GRÂwf–Wrr’Âv6åö7&VFRsÓå÷77e÷W&Ò‚GRÂv7&VFRr’Âv6åöVF—BsÓå÷77e÷W&Ò‚GRÂvVF—Br’Âv6åöFVÆWFRsÓå÷77e÷W&Ò‚GRÂvFVÆWFRr’Âv6åö–×÷'BsÓå÷77e÷W&Ò‚GRÂv–×÷'Br’Âv6å÷&W÷'BsÓå÷77e÷W&Ò‚GRÂw&W÷'Br•Ó·Ò“°§&÷WFR‚ttUBrÂrö’÷66†ööÂ×6W'f–6Rö&ö÷G7G&rÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷77eöæVVB‚GRÂwf–Wrr“²÷77e÷F&ÆW2‚“²÷77eöWF÷6VVE÷66†ööÇ2‚“°¢FF—7G&–7E&÷w3ÔF#£¦ÆÂ‚%4TÄT5BD•5D”ä5BE$”Ò†VGV6F–öæÅöF—7G&–7B’2F—FÆRe$ôÒ66†ööÅ÷6W'f–6U÷66†ööÇ2t„U$R—5ö7F—fSÓäBVGV6F–öæÅöF—7G&–7B•2äõBåTÄÂäBE$”Ò†VGV6F–öæÅöF—7G&–7B“Ãârrõ$DU"%’F—FÆR"“°¢FF—7G&–7G3ÕµÓ²f÷&V6‚‚FF—7G&–7E&÷w22G&÷r—²GF—FÆSÕ÷77eöæ÷&Ò‚G&÷u²wF—FÆRuÓóòrr“¶–b‚GF—FÆRÓÒrrbb–åö'&’‚GF—FÆRÂFF—7G&–7G2ÇG'VR’’FF—7G&–7G5µÓÒGF—FÆS·Ð¢FÖWFÕ°¢vF—7G&–7G2sÓâFF—7G&–7G2À¢vvVæFW'2sÓå²}ŠýŠíŠ­‹Š}˜m˜rrÂ}›í‹=‹Š}˜m˜rrÂ}˜mŠ}˜]‹MŠí‹RuÒÀ¢vG&—fW%övVæFW'2sÓå²}ŠíŠ}˜m˜RrÂ}Š-˜-ŠrrÂ}˜mŠ}˜]‹MŠí‹RuÒÀ¢wfV†–6ÆU÷G—W2sÓæ'&•ö6öÇVÖâ„F#£¦ÆÂ‚%4TÄT5BF—FÆRe$ôÒ66†ööÅ÷6W'f–6U÷fV†–6ÆU÷G—W2t„U$R—5ö7F—fSÓõ$DU"%’6÷'Eö÷&FW"Æ–B"’ÂwF—FÆRr’À¢wfV†–6ÆUö6öÆ÷'2sÓæ'&•ö6öÇVÖâ„F#£¦ÆÂ‚%4TÄT5BF—FÆRe$ôÒ66†ööÅ÷6W'f–6U÷fV†–6ÆUö6öÆ÷'2t„U$R—5ö7F—fSÓõ$DU"%’6÷'Eö÷&FW"Æ–B"’ÂwF—FÆRr’À¢wf–öÆF–öç2sÓäF#£¦ÆÂ‚%4TÄT5B–BÇF—FÆRe$ôÒ66†ööÅ÷6W'f–6U÷f–öÆF–öå÷G—W2t„U$R—5ö7F—fSÓõ$DU"%’6÷'Eö÷&FW"Æ–B"¢Ó°¢F6ö×æ–W3ÔF#£¦ÆÂ‚%4TÄT5B2æ–BÆ2ææÖRÆ2æÖævW%öæÖRÆ2æÖævW%öÖö&–ÆRÆ2æÆæFÆ–æU÷†öæRÆ2ç†öæRÆ2æFG&W72Æ2æÆF—GVFRÆ2æÆöæv—GVFRÆ2ç&Vv—7FW&VE÷66†ööÅö6÷VçBÆ2ç&W&W6VçFF—fUö6÷VçBÆ2ç7FGW2Æ2ç&öf–ÆUö6ö×ÆWFRÆ2æ—5ö7F—fRÄ4õTåB„D•5D”ä5B62ç66†ööÅö–B’66†ööÅö6÷VçBe$ôÒ66†ööÅ÷6W'f–6Uö6ö×æ–W22ÄTeB¤ô”â66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W262ôâ62æ6ö×ç•ö–CÖ2æ–Bt„U$R2æ—5ö7F—fSÓu$õU%’2æ–Bõ$DU"%’2ææÖR"“°¢G66†ööÇ3ÔF#£¦ÆÂ‚%4TÄT5B2æ–BÇ2æ6öFRÇ2ææÖRÇ2æVGV6F–öæÅöF—7G&–7BÇ2ævVæFW"Ç2æFG&W72Ç2æÆF—GVFRÇ2æÆöæv—GVFRÇ2æÆö6F–öå÷&Vv—7FW&VEöBÂ…4TÄT5B67‚æ6ö×ç•ö–Be$ôÒ66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W267‚t„U$R67‚ç66†ööÅö–C×2æ–Bõ$DU"%’67‚æ—5÷&–Ö'’DU42Ç67‚æ6ö×ç•ö–B42Ä”Ô•B’6ö×ç•ö–BÄu$õUô4ôä4B„D•5D”ä5B2ææÖRõ$DU"%’2ææÖR4U$Dõ"rÂr’6ö×ç•öæÖW2e$ôÒ66†ööÅ÷6W'f–6U÷66†ööÇ22ÄTeB¤ô”â66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W262ôâ62ç66†ööÅö–C×2æ–BÄTeB¤ô”â66†ööÅ÷6W'f–6Uö6ö×æ–W22ôâ2æ–C×62æ6ö×ç•ö–Bt„U$R2æ—5ö7F—fSÓu$õU%’2æ–Bõ$DU"%’2ææÖR"“°¢&WGW&â²wfW'6–öâsÓãÂvvVæW&FVEöBsÓæFFR‚v2r’ÂvÖWFsÓâFÖWFÂv6ö×æ–W2sÓâF6ö×æ–W2Âw66†ööÇ2sÓâG66†ööÇ2Âv6÷VçG2sÓå²vF—7G&–7G2sÓæ6÷VçB‚FF—7G&–7G2’Âv6ö×æ–W2sÓæ6÷VçB‚F6ö×æ–W2’Âw66†ööÇ2sÓæ6÷VçB‚G66†ööÇ2•ÕÓ°§Ò“°¢òò6æöæ–6Â66†ööÂ×6W'f–6RF6†&ö&B&÷WFS²F†—2FVf–æ—F–öâ'Vç2&Vf÷&R&÷WFW5öW‡G&ç‡à§&÷WFR‚ttUBrÂrö’÷66†ööÂ×6W'f–6RöF6†&ö&BrÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷77eöæVVB‚GRÂwf–Wrr“µ÷77e÷F&ÆW2‚“µ÷77eöWF÷6VVE÷66†ööÇ2‚“°¢FF—7G&–7CÕ÷77eöF—7G&–7Eö¶W’‚EôtUE²vF—7G&–7BuÓóòrr“²F6ö×ç“Ò†–çB’‚EôtUE²v6ö×ç•ö–BuÓóó“²GsÕ²sÓuÓ²FÕµÓ°¢–b‚FF—7G&–7BÓÒrr—²GuµÓÕ÷77eöF—7G&–7E÷7Â‚v’æVGV6F–öæÅöF—7G&–7Br’âsÓòs²FµÓÒFF—7G&–7C·Ð¢–b‚F6ö×ç’—²GuµÓÒv’æ6ö×ç•ö–CÓòs²FµÓÒF6ö×ç“·Ð¢Gv†W&SÖ–×ÆöFR‚räBrÂGr“°¢F7F—fU66†ööÇ3Ò†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒ66†ööÅ÷6W'f–6U÷66†ööÇ2t„U$R—5ö7F—fSÓ"•²vâuÓóó“°¢G7GVFVçEF÷FÃÒ†–çB’„F#£¦öæR‚%4TÄT5B4ôÄU44R…5TÒ‡7GVFVçEö6÷VçB’Ã’âe$ôÒ66†ööÅ÷6W'f–6U÷66†ööÇ2t„U$R—5ö7F—fSÓ"•²vâuÓóó“°¢F7F—fT6ö×æ–W3Ò†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒ66†ööÅ÷6W'f–6Uö6ö×æ–W2t„U$R—5ö7F—fSÓ"•²vâuÓóó“°¢F7F—fUfV†–6ÆW3Ò†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒ66†ööÅ÷6W'f–6U÷fV†–6ÆW2t„U$R—5ö7F—fSÓ"•²vâuÓóó“°¢F–ç7V7F–öç3Ò†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒ66†ööÅ÷6W'f–6Uö–ç7V7F–öç2’t„U$RGv†W&R"ÂF•²vâuÓóó“°¢F–ç7V7F–öç33Ò†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒ66†ööÅ÷6W'f–6Uö–ç7V7F–öç2’t„U$R’æ7&VFVEöCãÔDDUõ5T"„äõr‚’Ä”åDU%dÂ3D’’äBGv†W&R"ÂF•²vâuÓóó“°¢Gf–öÆF–öç3Ò†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒ66†ööÅ÷6W'f–6Uö–ç7V7F–öå÷f–öÆF–öç2‚¤ô”â66†ööÅ÷6W'f–6Uö–ç7V7F–öç2’ôâ’æ–C×‚æ–ç7V7F–öåö–B¤ô”â66†ööÅ÷6W'f–6U÷f–öÆF–öå÷G—W2bôâbæ–C×‚çf–öÆF–öå÷G—Uö–Bt„U$RGv†W&RäBbæ—5ö7F—fSÓ"ÂF•²vâuÓóó“°¢F–çfÆ–D6W'CÒ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒ66†ööÅ÷6W'f–6Uö–ç7V7F–öç2’t„U$R’æ6W'F–f–6FU÷7FGW2”â‚}˜mŠ}˜]‹Š­Š‹rÂ}Š}‹Š}Šm˜r˜m‹MŠòr’äBGv†W&R"ÂF•²vâuÓóó“°¢Ffuf–öÃÒF–ç7V7F–öç3ã÷&÷VæB‚Gf–öÆF–öç2òF–ç7V7F–öç2Ã"“£°¢F'”F—7G&–7CÔF#£¦ÆÂ‚%4TÄT5B4ôÄU44R„åTÄÄ”b…E$”Ò†’æVGV6F–öæÅöF—7G&–7B’Ârr’Â}˜mŠ}˜]‹MŠí‹Rr’Æ&VÂÄ4õTåB‚¢’âe$ôÒ66†ööÅ÷6W'f–6Uö–ç7V7F–öç2’t„U$RGv†W&Ru$õU%’’æVGV6F–öæÅöF—7G&–7Bõ$DU"%’âDU42"ÂF“°¢F'”6ö×ç“ÔF#£¦ÆÂ‚%4TÄT5B4ôÄU44R„åTÄÄ”b…E$”Ò†2ææÖR’Ârr’Â}˜mŠ}˜]‹MŠí‹Rr’Æ&VÂÄ4õTåB†’æ–B’âe$ôÒ66†ööÅ÷6W'f–6Uö–ç7V7F–öç2’ÄTeB¤ô”â66†ööÅ÷6W'f–6Uö6ö×æ–W22ôâ2æ–CÖ’æ6ö×ç•ö–Bt„U$RGv†W&Ru$õU%’2æ–BÆ2ææÖRõ$DU"%’âDU42Ä”Ô•B""ÂF“°¢F'•f–öÆF–öãÔF#£¦ÆÂ‚%4TÄT5B4ôÄU44R„åTÄÄ”b…E$”Ò‡bçF—FÆR’Ârr’Â}˜mŠ}˜]‹MŠí‹Rr’Æ&VÂÄ4õTåB†—bæ–ç7V7F–öåö–B’âe$ôÒ66†ööÅ÷6W'f–6Uö–ç7V7F–öå÷f–öÆF–öç2—b¤ô”â66†ööÅ÷6W'f–6U÷f–öÆF–öå÷G—W2bôâbæ–CÖ—bçf–öÆF–öå÷G—Uö–B¤ô”â66†ööÅ÷6W'f–6Uö–ç7V7F–öç2’ôâ’æ–CÖ—bæ–ç7V7F–öåö–Bt„U$RGv†W&RäBbæ—5ö7F—fSÓu$õU%’bæ–BÇbçF—FÆRõ$DU"%’âDU42Ä”Ô•B#"ÂF“°¢F'•f–öÆF–öãÖ'&•÷fÇVW2†'&•öf–ÇFW"‚F'•f–öÆF–öâÆgVæ7F–öâ‚G&÷r—·&WGW&â÷77eö—5ö6W'F–f–6FU÷f–öÆF–öå÷F—FÆR‚G&÷u²vÆ&VÂuÓóòrr“·Ò’“°¢F'•66†ööÃÔF#£¦ÆÂ‚%4TÄT5B4ôÄU44R„åTÄÄ”b…E$”Ò‡2ææÖR’Ârr’Â}˜mŠ}˜]‹MŠí‹Rr’Æ&VÂÄ4õTåB†’æ–B’âe$ôÒ66†ööÅ÷6W'f–6Uö–ç7V7F–öç2’ÄTeB¤ô”â66†ööÅ÷6W'f–6U÷66†ööÇ22ôâ2æ–CÖ’ç66†ööÅö–Bt„U$RGv†W&Ru$õU%’2æ–BÇ2ææÖRõ$DU"%’âDU42Ä”Ô•B""ÂF“°¢GfV†–6ÆUG—W3ÔF#£¦ÆÂ‚%4TÄT5B4ôÄU44R„åTÄÄ”b…E$”Ò‡fV†–6ÆU÷G—R’Ârr’Â}˜mŠ}˜]‹MŠí‹Rr’Æ&VÂÄ4õTåB‚¢’âe$ôÒ66†ööÅ÷6W'f–6U÷fV†–6ÆW2t„U$R—5ö7F—fSÓu$õU%’fV†–6ÆU÷G—Rõ$DU"%’âDU42Ä”Ô•B"“°¢F6W'F–f–6FW3ÔF#£¦ÆÂ‚%4TÄT5B’æ6W'F–f–6FU÷7FGW2Æ&VÂÄ4õTåB‚¢’âe$ôÒ66†ööÅ÷6W'f–6Uö–ç7V7F–öç2’t„U$RGv†W&Ru$õU%’’æ6W'F–f–6FU÷7FGW2õ$DU"%’âDU42"ÂF“°¢òòŠŠ}‹-˜}™B˜m˜]˜ŠýŠ}‹Š‹Š}‹=Š}‹2˜]Š}˜r‹M˜]‹=¸ÂŠÍŠ}‹¸ÂŠ­‹¸Í¸Í˜b˜]¸Î(Í‹M˜ŠýˆÂ˜m˜r˜]Š}˜r˜]¸Í˜MŠ}Šý¸Âà¢GFöF“ÖæWrFFUF–ÖT–Ö×WF&ÆR‚wFöF’r“°¢F¦ÆÆ•'G3ÖgVæ7F–öâ„FFUF–ÖT–Ö×WF&ÆRFFFR—°¢Fw“Ò†–çB’FFFRÓæf÷&ÖB‚u’r“²FvÓÒ†–çB’FFFRÓæf÷&ÖB‚vâr“²FvCÒ†–çB’FFFRÓæf÷&ÖB‚v¢r“°¢FvFÓÕ³Ã3ÃS’Ã“Ã#ÃSÃƒÃ#"Ã#C2Ã#s2Ã3BÃ33EÓ°¢–b‚Fw“ãc—²F§“Ó“s“²Fw’ÓÓc·ÖVÇ6W²F§“Ó²Fw’ÓÓc#·Ð¢Fw“#ÒFvÓã#òFw’³¢Fw“°¢FF—3Ó3cR¢Fw’²†–çB–fÆö÷"‚‚Fw“"³2’óB’Ò†–çB–fÆö÷"‚‚Fw“"³“’’ó’²†–çB–fÆö÷"‚‚Fw“"³3“’’óC’Óƒ²FvB²FvFÕ²FvÒÓÓ°¢F§’³Ó32¢†–çB–fÆö÷"‚FF—2ó#S2“²FF—2SÓ#S3°¢F§’³ÓB¢†–çB–fÆö÷"‚FF—2óCc“²FF—2SÓCc°¢–b‚FF—3ã3cR—²F§’³Ò†–çB–fÆö÷"‚‚FF—2Ó’ó3cR“²FF—3Ò‚FF—2Ó’S3cS·Ð¢F¦ÓÒFF—3Ãƒcó²†–çB–fÆö÷"‚FF—2ó3“£r²†–çB–fÆö÷"‚‚FF—2Óƒb’ó3“°¢F¦CÓ²‚FF—3ÃƒcòFF—2S3¢‚FF—2Óƒb’S3“°¢&WGW&â²F§’ÂF¦ÒÂF¦EÓ°¢Ó°¢²F7W'&VçD¥–V"ÂF7W'&VçD¤ÖöçF…ÓÒF¦ÆÆ•'G2‚GFöF’“°¢FÖöçF…7F'CÒGFöF“°¢f÷"‚G7FWÓ²G7FWÃ3²G7FW²²—°¢G&WcÒFÖöçF…7F'BÓæÖöF–g’‚rÓF’r“µ²G’ÂGÕÓÒF¦ÆÆ•'G2‚G&Wb“°¢–b‚G’ÓÒF7W'&VçD¥–V'ÇÂGÒÓÒF7W'&VçD¤ÖöçF‚–'&V³°¢FÖöçF…7F'CÒG&Wc°¢Ð¢FÖöçF„VæCÒGFöF“°¢f÷"‚G7FWÓ²G7FWÃ3²G7FW²²—°¢FæW‡CÒFÖöçF„VæBÓæÖöF–g’‚r³F’r“µ²Fç’ÂFæÕÓÒF¦ÆÆ•'G2‚FæW‡B“°¢–b‚Fç’ÓÒF7W'&VçD¥–V'ÇÂFæÒÓÒF7W'&VçD¤ÖöçF‚–'&V³°¢FÖöçF„VæCÒFæW‡C°¢Ð¢GG&VæE&÷w3ÔF#£¦ÆÂ‚%4TÄT5BDDR†’æ7&VFVEöB’F•ö¶W’Ä4õTåB‚¢’âe$ôÒ66†ööÅ÷6W'f–6Uö–ç7V7F–öç2’t„U$R’æ7&VFVEöCãÓòäB’æ7&VFVEöCÃòäBGv†W&Ru$õU%’DDR†’æ7&VFVEöB’õ$DU"%’F•ö¶W’42"Æ'&•öÖW&vR…²FÖöçF…7F'BÓæf÷&ÖB‚u’ÖÒÖB££r’ÂFÖöçF„VæBÓæÖöF–g’‚r³F’r’Óæf÷&ÖB‚u’ÖÒÖB££r•ÒÂF’“°¢GG&VæD6÷VçG3ÕµÓ°¢f÷&V6‚‚GG&VæE&÷w22GG"—²GG&VæD6÷VçG5²‡7G&–ær’GG%²vF•ö¶W’uÕÓÒ†–çB’GG%²vâuÓ·Ð¢GG&VæCÕµÓ°¢f÷"‚FF“ÒFÖöçF…7F'C²FF“ÃÒFÖöçF„VæC²FF“ÒFF’ÓæÖöF–g’‚r³F’r’—°¢F¶W“ÒFF’Óæf÷&ÖB‚u’ÖÒÖBr“°¢GG&VæEµÓÕ²w–ÒsÓâF¶W’ÂvâsÓâGG&VæD6÷VçG5²F¶W•ÓóóÓ°¢Ð¢FF—7G&–7E66†ööÇ3ÔF#£¦ÆÂ‚%4TÄT5B4ôÄU44R„åTÄÄ”b…E$”Ò†VGV6F–öæÅöF—7G&–7B’Ârr’Â}˜mŠ}˜]‹MŠí‹Rr’Æ&VÂÄ4õTåB‚¢’âÄ4ôÄU44R…5TÒ‡7GVFVçEö6÷VçB’Ã’7GVFVçG2e$ôÒ66†ööÅ÷6W'f–6U÷66†ööÇ2t„U$R—5ö7F—fSÓu$õU%’VGV6F–öæÅöF—7G&–7Bõ$DU"%’âDU42"“°¢F7F—fT–ç7V7F÷'3ÕµÓ²F7F—fT–ç7V7F÷$6÷VçCÓ°¢òòŠý‹Šý¸ÍŠ­Š}Š¸Í‹>(Í˜}Š}¸Â˜-Šý¸Í˜]¸Â‹M˜mŠ}‹=˜}™BŠ½ŠŠ®(Íª˜m˜mŠý˜r˜]˜]ª˜bŠ}‹=Š¢ŠŠr˜mŠ}˜RŠý¸Íªý‹¸Â‹Ší¸Í‹˜r‹MŠý˜rŠŠ}‹MŠý‰²‹=Š­˜˜b˜]˜ŠÍ˜Šò‹ŠrŠ}‹"Ší˜Šò66†VÖŠ­‹MŠí¸Í‹RŠŠý˜rà¢F–ç7V7F–öä6öÇVÖç3ÕµÓ°¢G'—¶f÷&V6‚„F#£¦ÆÂ‚%4„õr4ôÅTÔå2e$ôÒ66†ööÅ÷6W'f–6Uö–ç7V7F–öç2"’2F6öÇVÖâ—²Ff–VÆCÒ‡7G&–ær’‚F6öÇVÖå²tf–VÆBuÓóòF6öÇVÖå²vf–VÆBuÓóòrr“¶–b‚Ff–VÆBÓÒrr’F–ç7V7F–öä6öÇVÖç5²Ff–VÆEÓ×G'VS·×Ö6F6‚…F‡&÷v&ÆRFR—¶W'&÷%öÆör‚u66†ööÂ6W'f–6R–ç7V7F÷"66†VÖ–ç7V7F–öâf–ÆVC¢râFRÓævWDÖW76vR‚’“·Ð¢F–ç7V7F÷$f–VÆG3ÕµÓ°¢f÷&V6‚…²v–ç7V7F÷%÷W6W%ö–BrÂv–ç7V7F÷%ö–BrÂwW6W%ö–BrÂv7&VFVEö'•÷W6W%ö–BrÂv7&VFVEö'’uÒ2Ff–VÆB—¶–b†—76WB‚F–ç7V7F–öä6öÇVÖç5²Ff–VÆEÒ’’F–ç7V7F÷$f–VÆG5µÓÒtåTÄÄ”b†’ærâFf–VÆBâvÃ’s·Ð¢F–ç7V7F÷$W‡#Ö6÷VçB‚F–ç7V7F÷$f–VÆG2“òt4ôÄU44R‚ræ–×ÆöFR‚rÂrÂF–ç7V7F÷$f–VÆG2’âr’s¢tåTÄÂs°¢–b‚F–ç7V7F÷$W‡"ÓÒtåTÄÂr—°¢G'—°¢F7F—fT–ç7V7F÷$6÷VçCÒ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB„D•5D”ä5BF–ç7V7F÷$W‡"’âe$ôÒ66†ööÅ÷6W'f–6Uö–ç7V7F–öç2’t„U$RF–ç7V7F÷$W‡"•2äõBåTÄÂäB’æ7&VFVEöCãÔDDUõ5T"„äõr‚’Ä”åDU%dÂ3D’’äBGv†W&R"ÂF•²vâuÓóó“°¢Ö6F6‚…F‡&÷v&ÆRFR—¶W'&÷%öÆör‚u66†ööÂ6W'f–6R7F—fR–ç7V7F÷"6÷VçBf–ÆVC¢râFRÓævWDÖW76vR‚’“·Ð¢G'—°¢F7F—fT–ç7V7F÷'3ÔF#£¦ÆÂ‚%4TÄT5BF–ç7V7F÷$W‡"–BÀ¢4ôÄU44R„åTÄÄ”b…E$”Ò„4ôä4B„4ôÄU44R‡Ræf—'7EöæÖRÂrr’ÂrrÄ4ôÄU44R‡RæÆ7EöæÖRÂrr’’’Ârr’Ä4ôä4B‚}ŠŠ}‹-‹‹22rÂF–ç7V7F÷$W‡"’’æÖRÀ¢4ôÄU44R‡"çF—FÆRÂrr’&öÆU÷F—FÆRÄ4õTåB‚¢’–ç7V7F–öåö6÷VçBÀ¢5TÒ„44Rt„Tâ’æ7&VFVEöCãÔDDUõ5T"„äõr‚’Ä”åDU%dÂ3D’’D„TâTÅ4RTäB’–ç7V7F–öåö6÷VçEó3@¢e$ôÒ66†ööÅ÷6W'f–6Uö–ç7V7F–öç2¢ÄTeB¤ô”âW6W'2RôâRæ–CÒF–ç7V7F÷$W‡ ¢ÄTeB¤ô”â&öÆW2"ôâ"æ–C×Rç&öÆUö–@¢t„U$RF–ç7V7F÷$W‡"•2äõBåTÄÂäB’æ7&VFVEöCãÔDDUõ5T"„äõr‚’Ä”åDU%dÂ3D’’äBGv†W&P¢u$õU%’F–ç7V7F÷$W‡"ÇRæf—'7EöæÖRÇRæÆ7EöæÖRÇ"çF—FÆP¢õ$DU"%’–ç7V7F–öåö6÷VçEó3BDU42Æ–ç7V7F–öåö6÷VçBDU42ÆæÖR42"ÂF“°¢–b‚F7F—fT–ç7V7F÷$6÷VçB’F7F—fT–ç7V7F÷$6÷VçCÖ6÷VçB‚F7F—fT–ç7V7F÷'2“°¢Ö6F6‚…F‡&÷v&ÆRFR—²F7F—fT–ç7V7F÷'3ÕµÓ¶W'&÷%öÆör‚u66†ööÂ6W'f–6R7F—fR–ç7V7F÷"Æ—7Bf–ÆVC¢râFRÓævWDÖW76vR‚’“·Ð¢Ð¢&WGW&â²v6&G2sÓå²v7F—fU÷66†ööÇ2sÓâF7F—fU66†ööÇ2Âw7GVFVçG2sÓâG7GVFVçEF÷FÂÂv7F—fUö6ö×æ–W2sÓâF7F—fT6ö×æ–W2Âv7F—fU÷fV†–6ÆW2sÓâF7F—fUfV†–6ÆW2Âv–ç7V7F–öç2sÓâF–ç7V7F–öç2Âv–ç7V7F–öç5ó3BsÓâF–ç7V7F–öç33Âv7F—fUö–ç7V7F÷'2sÓâF7F—fT–ç7V7F÷$6÷VçBÂwf–öÆF–öç2sÓâGf–öÆF–öç2Âv–çfÆ–Eö6W'F–f–6FW2sÓâF–çfÆ–D6W'BÂvfu÷f–öÆF–öç5÷W%ö–ç7V7F–öâsÓâFfuf–öÅÒÀ¢v'•öF—7G&–7BsÓâF'”F—7G&–7BÂv'•ö6ö×ç’sÓâF'”6ö×ç’Âv'•÷f–öÆF–öâsÓâF'•f–öÆF–öâÂv'•÷66†ööÂsÓâF'•66†ööÂÂwfV†–6ÆU÷G—W2sÓâGfV†–6ÆUG—W2Âv6W'F–f–6FW2sÓâF6W'F–f–6FW2ÂwG&VæBsÓâGG&VæBÂvF—7G&–7E÷66†ööÇ2sÓâFF—7G&–7E66†ööÇ2Âv7F—fUö–ç7V7F÷'2sÓâF7F—fT–ç7V7F÷'2ÂvvVæW&FVEöBsÓæFFR‚u’ÖÒÖBƒ¦“§2r•Ó°§Ò“°§&÷WFR‚ttUBrÂrö’÷66†ööÂ×6W'f–6RöÖWFrÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷77eöæVVB‚GRÂwf–Wrr“²÷77e÷F&ÆW2‚“°¢òò˜˜}‹‹=Š¢˜m˜Š}ŠÝ¸ÂŠ}‹"Ší˜ŠòŠýŠ}Šý˜}™B˜]ŠýŠ}‹‹2Ší˜Š}˜mŠý˜r˜]¸Î(Í‹M˜Šý‰²ŠÍŠý˜˜BŠ­˜m‹¸Í˜]Š}Š¢˜˜-‹rŠ­˜m‹¸Í˜]Š}Š ¢òòª˜]ª¸ÂŠ}‹=Š¢˜‚˜mŠŠ}¸ÍŠòŠŠ}‹Š²ŠÝ‹˜˜m˜Š}ŠÝ¸Â˜Š}˜-‹¸Â˜]˜ŠÍ˜ŠòŠý‹66†ööÅ÷6W'f–6U÷66†ööÇ2‹M˜Šòà¢FF—7G&–7E&÷w3ÔF#£¦ÆÂ‚%4TÄT5BD•5D”ä5BE$”Ò†VGV6F–öæÅöF—7G&–7B’2F—FÆP¢e$ôÒ66†ööÅ÷6W'f–6U÷66†ööÇ0¢t„U$R—5ö7F—fSÓ¢äBVGV6F–öæÅöF—7G&–7B•2äõBåTÄÀ¢äBE$”Ò†VGV6F–öæÅöF—7G&–7B“Ãârp¢õ$DU"%’F—FÆR"“°¢FF—7G&–7G3ÕµÓ°¢f÷&V6‚‚FF—7G&–7E&÷w22G&÷r—°¢GF—FÆSÕ÷77eöæ÷&Ò‚G&÷u²wF—FÆRuÓóòrr“°¢–b‚GF—FÆRÓÒrrbb–åö'&’‚GF—FÆRÂFF—7G&–7G2ÇG'VR’’FF—7G&–7G5µÓÒGF—FÆS°¢Ð¢&WGW&â°¢vF—7G&–7G2sÓâFF—7G&–7G2À¢vvVæFW'2sÓå²}ŠýŠíŠ­‹Š}˜m˜rrÂ}›í‹=‹Š}˜m˜rrÂ}˜mŠ}˜]‹MŠí‹RuÒÀ¢vG&—fW%övVæFW'2sÓå²}ŠíŠ}˜m˜RrÂ}Š-˜-ŠrrÂ}˜mŠ}˜]‹MŠí‹RuÒÀ¢wfV†–6ÆU÷G—W2sÓæ'&•ö6öÇVÖâ„F#£¦ÆÂ‚%4TÄT5BF—FÆRe$ôÒ66†ööÅ÷6W'f–6U÷fV†–6ÆU÷G—W2t„U$R—5ö7F—fSÓõ$DU"%’6÷'Eö÷&FW"Æ–B"’ÂwF—FÆRr’À¢wfV†–6ÆUö6öÆ÷'2sÓæ'&•ö6öÇVÖâ„F#£¦ÆÂ‚%4TÄT5BF—FÆRe$ôÒ66†ööÅ÷6W'f–6U÷fV†–6ÆUö6öÆ÷'2t„U$R—5ö7F—fSÓõ$DU"%’6÷'Eö÷&FW"Æ–B"’ÂwF—FÆRr’À¢wf–öÆF–öç2sÓäF#£¦ÆÂ‚%4TÄT5B–BÇF—FÆRe$ôÒ66†ööÅ÷6W'f–6U÷f–öÆF–öå÷G—W2t„U$R—5ö7F—fSÓõ$DU"%’6÷'Eö÷&FW"Æ–B"¢Ó°§Ò“°§&÷WFR‚ttUBrÂrö’÷66†ööÂ×6W'f–6Rö6ö×æ–W2rÆgVæ7F–öâ‚GÂF"ÂGR—µ÷77eöæVVB‚GRÂwf–Wrr“µ÷77e÷F&ÆW2‚“²GÕ÷77eöæ÷&Ò‚EôtUE²w6V&6‚uÓóòrr“²GvSÖÖ‚ƒÂ†–çB’‚EôtUE²wvRuÓóó’“²FÆ–Ö—CÖÖ‚ƒÆÖ–âƒSÂ†–çB’‚EôtUE²vÆ–Ö—BuÓóóS’’“²Gv†W&SÒGÓÒrsòut„U$R2æ—5ö7F—fSÓäB2ææÖRÄ”´Ròs¢ut„U$R2æ—5ö7F—fSÓs²F&w3ÒGÓÒrsõ²rRrâGârRuÓ¥µÓ²GF÷FÃÒ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒ66†ööÅ÷6W'f–6Uö6ö×æ–W22Gv†W&R"ÂF&w2•²vâuÓóó“²Föfg6WCÒ‚GvRÓ’¢FÆ–Ö—C²F—FV×3ÔF#£¦ÆÂ‚%4TÄT5B2æ–BÆ2ææÖRÆ2æÖævW%öæÖRÆ2æÖævW%öÖö&–ÆRÆ2æÆæFÆ–æU÷†öæRÆ2ç†öæRÆ2æFG&W72Æ2æÆF—GVFRÆ2æÆöæv—GVFRÆ2ç&Vv—7FW&VE÷66†ööÅö6÷VçBÆ2ç&W&W6VçFF—fUö6÷VçBÆ2ç7FGW2Æ2ç&öf–ÆUö6ö×ÆWFRÆ2æ—5ö7F—fRÄ4õTåB„D•5D”ä5B62ç66†ööÅö–B’66†ööÅö6÷VçBe$ôÒ66†ööÅ÷6W'f–6Uö6ö×æ–W22ÄTeB¤ô”â66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W262ôâ62æ6ö×ç•ö–CÖ2æ–BGv†W&Ru$õU%’2æ–Bõ$DU"%’2ææÖRÄ”Ô•BFÆ–Ö—Bôde4UBFöfg6WB"ÂF&w2“·&WGW&â²v—FV×2sÓâF—FV×2ÂwvRsÓâGvRÂvÆ–Ö—BsÓâFÆ–Ö—BÂwF÷FÂsÓâGF÷FÂÂwvW2sÓæÖ‚ƒÂ†–çB–6V–Â‚GF÷FÂòFÆ–Ö—B’•Ó·Ò“°§&÷WFR‚ttUBrÂrö’÷66†ööÂ×6W'f–6R÷66†ööÇ2rÆgVæ7F–öâ‚GÂF"ÂGR—µ÷77eöæVVB‚GRÂwf–Wrr“µ÷77e÷F&ÆW2‚“µ÷77eöWF÷6VVE÷66†ööÇ2‚“²GÕ÷77eöæ÷&Ò‚EôtUE²w6V&6‚uÓóòrr“²F6ö×ç“Ò†–çB’‚EôtUE²v6ö×ç•ö–BuÓóó“²FF—7G&–7CÕ÷77eöF—7G&–7Eö¶W’‚EôtUE²vF—7G&–7BuÓóòrr“²GvSÖÖ‚ƒÂ†–çB’‚EôtUE²wvRuÓóó’“²FÆ–Ö—CÖÖ‚ƒÆÖ–âƒSÂ†–çB’‚EôtUE²vÆ–Ö—BuÓóóS’’“²F3Õ²w2æ—5ö7F—fSÓuÓ²F&w3ÕµÓ¶–b‚GÓÒrr—²F5µÓÒr‡2ææÖRÄ”´Ròõ"2æ6öFRÄ”´Rò’s²F&w5µÓÒrRrâGârRs²F&w5µÓÒrRrâGârRs·Ö–b‚F6ö×ç’—²F5µÓÒtU„•5E2…4TÄT5Be$ôÒ66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W2‚t„U$R‚ç66†ööÅö–C×2æ–BäB‚æ6ö×ç•ö–CÓò’s²F&w5µÓÒF6ö×ç“·Ö–b‚FF—7G&–7BÓÒrr—²F5µÓÕ÷77eöF—7G&–7E÷7Â‚w2æVGV6F–öæÅöF—7G&–7Br’âsÓòs²F&w5µÓÕ÷77eöF—7G&–7Eöæ÷&ÖÆ—¦VB‚FF—7G&–7B“·ÒGv†W&SÖ–×ÆöFR‚räBrÂF2“²GF÷FÃÒ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒ66†ööÅ÷6W'f–6U÷66†ööÇ22t„U$RGv†W&R"ÂF&w2•²vâuÓóó“²Föfg6WCÒ‚GvRÓ’¢FÆ–Ö—C²F—FV×3ÔF#£¦ÆÂ‚%4TÄT5B2æ–BÇ2æ6öFRÇ2ææÖRÇ2æVGV6F–öæÅöF—7G&–7BÇ2ævVæFW"Ç2æFG&W72Ç2æÆF—GVFRÇ2æÆöæv—GVFRÇ2æÆö6F–öå÷&Vv—7FW&VEöBÂ…4TÄT5B67‚æ6ö×ç•ö–Be$ôÒ66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W267‚t„U$R67‚ç66†ööÅö–C×2æ–Bõ$DU"%’67‚æ—5÷&–Ö'’DU42Ç67‚æ6ö×ç•ö–B42Ä”Ô•B’6ö×ç•ö–BÄu$õUô4ôä4B„D•5D”ä5B2ææÖRõ$DU"%’2ææÖR4U$Dõ"rÂr’6ö×ç•öæÖW2e$ôÒ66†ööÅ÷6W'f–6U÷66†ööÇ22ÄTeB¤ô”â66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W262ôâ62ç66†ööÅö–C×2æ–BÄTeB¤ô”â66†ööÅ÷6W'f–6Uö6ö×æ–W22ôâ2æ–C×62æ6ö×ç•ö–Bt„U$RGv†W&Ru$õU%’2æ–Bõ$DU"%’2ææÖRÄ”Ô•BFÆ–Ö—Bôde4UBFöfg6WB"ÂF&w2“·&WGW&â²v—FV×2sÓâF—FV×2ÂwvRsÓâGvRÂvÆ–Ö—BsÓâFÆ–Ö—BÂwF÷FÂsÓâGF÷FÂÂwvW2sÓæÖ‚ƒÂ†–çB–6V–Â‚GF÷FÂòFÆ–Ö—B’•Ó·Ò“°¦gVæ7F–öâ÷77e÷7–æ5÷fV†–6ÆUög&öÕö–ç7V7F–öâ‚F–B—°¢÷77e÷F&ÆW2‚“²F–CÒ†–çB’F–C²–b‚F–CÃÓ—&WGW&ã°¢G#ÔF#£¦öæR‚%4TÄT5BÆFU÷GvòÇÆFUöÆWGFW"ÇÆFU÷F‡&VRÇÆFU÷&Vv–öåö6öFRÇfV†–6ÆU÷G—RÇfV†–6ÆUö6öÆ÷"Ç76VævW%ög&öçEö6÷VçBÇ76VævW%÷&V%ö6÷VçBÆG&—fW%övVæFW"Æ6W'F–f–6FU÷7FGW2Æ7&VFVEöBe$ôÒ66†ööÅ÷6W'f–6Uö–ç7V7F–öç2t„U$R–CÓò"Å²F–EÒ“°¢–b‚G"ÇÂG&–Ò‚‡7G&–ær’G%²wÆFU÷GvòuÒ“ÓÓÒrrÇÂG&–Ò‚‡7G&–ær’G%²wÆFU÷F‡&VRuÒ“ÓÓÒrrÇÂG&–Ò‚‡7G&–ær’G%²wÆFUöÆWGFW"uÒ“ÓÓÒrrÇÂG&–Ò‚‡7G&–ær’G%²wÆFU÷&Vv–öåö6öFRuÒ“ÓÓÒrr’&WGW&ã°¢F#£§'Vâ‚$”å4U%B”åDò66†ööÅ÷6W'f–6U÷fV†–6ÆW2‡ÆFU÷GvòÇÆFUöÆWGFW"ÇÆFU÷F‡&VRÇÆFU÷&Vv–öåö6öFRÇfV†–6ÆU÷G—RÇfV†–6ÆUö6öÆ÷"Ç76VævW%ög&öçEö6÷VçBÇ76VævW%÷&V%ö6÷VçBÆG&—fW%övVæFW"Æ6W'F–f–6FU÷7FGW2ÆÆ7Eö–ç7V7F–öåö–BÆÆ7Eö–ç7V7F–öåöBÆ—5ö7F—fR¢dÅTU2ƒòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÂòÃ¢ôâEUÄ”4DR´U’UDDRfV†–6ÆU÷G—SÕdÅTU2‡fV†–6ÆU÷G—R’ÇfV†–6ÆUö6öÆ÷#ÕdÅTU2‡fV†–6ÆUö6öÆ÷"’Ç76VævW%ög&öçEö6÷VçCÕdÅTU2‡76VævW%ög&öçEö6÷VçB’Ç76VævW%÷&V%ö6÷VçCÕdÅTU2‡76VævW%÷&V%ö6÷VçB’ÆG&—fW%övVæFW#ÕdÅTU2†G&—fW%övVæFW"’Æ6W'F–f–6FU÷7FGW3ÕdÅTU2†6W'F–f–6FU÷7FGW2’ÆÆ7Eö–ç7V7F–öåö–CÕdÅTU2†Æ7Eö–ç7V7F–öåö–B’ÆÆ7Eö–ç7V7F–öåöCÕdÅTU2†Æ7Eö–ç7V7F–öåöB’Æ—5ö7F—fSÓ"À¢²G%²wÆFU÷GvòuÒÂG%²wÆFUöÆWGFW"uÒÂG%²wÆFU÷F‡&VRuÒÂG%²wÆFU÷&Vv–öåö6öFRuÒÂG%²wfV†–6ÆU÷G—RuÒÂG%²wfV†–6ÆUö6öÆ÷"uÒÂ†–çB’G%²w76VævW%ög&öçEö6÷VçBuÒÂ†–çB’G%²w76VævW%÷&V%ö6÷VçBuÒÂG%²vG&—fW%övVæFW"uÒÂG%²v6W'F–f–6FU÷7FGW2uÒÂF–BÂG%²v7&VFVEöBuÕÒ“°§Ð¦gVæ7F–öâ÷77eö&6¶f–ÆÅ÷fV†–6ÆW2‚—°¢÷77e÷F&ÆW2‚“°¢G'—°¢G&÷w3ÔF#£¦ÆÂ‚%4TÄT5B’æ–BÆ’çÆFU÷GvòÆ’çÆFUöÆWGFW"Æ’çÆFU÷F‡&VRÆ’çÆFU÷&Vv–öåö6öFRÆ’çfV†–6ÆU÷G—RÆ’çfV†–6ÆUö6öÆ÷"Æ’ç76VævW%ög&öçEö6÷VçBÆ’ç76VævW%÷&V%ö6÷VçBÆ’æG&—fW%övVæFW"Æ’æ6W'F–f–6FU÷7FGW2Æ’æ7&VFVEö@¢e$ôÒ66†ööÅ÷6W'f–6Uö–ç7V7F–öç2¢”ääU"¤ô”â…4TÄT5BÆFU÷GvòÇÆFUöÆWGFW"ÇÆFU÷F‡&VRÇÆFU÷&Vv–öåö6öFRÄÔ‚†–B’Ö…ö–Be$ôÒ66†ööÅ÷6W'f–6Uö–ç7V7F–öç2u$õU%’ÆFU÷GvòÇÆFUöÆWGFW"ÇÆFU÷F‡&VRÇÆFU÷&Vv–öåö6öFR’¢ôâ¢æÖ…ö–CÖ’æ–@¢t„U$R4ôÄU44R†’çÆFU÷GvòÂrr“ÃârräB4ôÄU44R†’çÆFU÷F‡&VRÂrr“ÃârräB4ôÄU44R†’çÆFUöÆWGFW"Ârr“ÃârräB4ôÄU44R†’çÆFU÷&Vv–öåö6öFRÂrr“Ãârr"“°¢f÷&V6‚‚G&÷w22G"—°¢F#£§'Vâ‚$”å4U%B”åDò66†ööÅ÷6W'f–6U÷fV†–6ÆW2‡ÆFU÷GvòÇÆFUöÆWGFW"ÇÆFU÷F‡&VRÇÆFU÷&Vv–öåö6öFRÇfV†–6ÆU÷G—RÇfV†–6ÆUö6öÆ÷"Ç76VævW%ög&öçEö6÷VçBÇ76VævW%÷&V%ö6÷VçBÆG&—fW%övVæFW"Æ6W'F–f–6FU÷7FGW2ÆÆ7Eö–ç7V7F–öåö–BÆÆ7Eö–ç7V7F–öåöBÆ—5ö7F—fR¢dÅTU2ƒòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÂòÃ’ôâEUÄ”4DR´U’UDDRÆ7Eö–ç7V7F–öåö–CÔ”b„4ôÄU44R†Æ7Eö–ç7V7F–öåö–BÃ“ÅdÅTU2†Æ7Eö–ç7V7F–öåö–B’ÅdÅTU2†Æ7Eö–ç7V7F–öåö–B’ÆÆ7Eö–ç7V7F–öåö–B’ÆÆ7Eö–ç7V7F–öåöCÔ”b„4ôÄU44R†Æ7Eö–ç7V7F–öåö–BÃ“ÅdÅTU2†Æ7Eö–ç7V7F–öåö–B’ÅdÅTU2†Æ7Eö–ç7V7F–öåöB’ÆÆ7Eö–ç7V7F–öåöB’Æ—5ö7F—fSÓ"À¢²G%²wÆFU÷GvòuÒÂG%²wÆFUöÆWGFW"uÒÂG%²wÆFU÷F‡&VRuÒÂG%²wÆFU÷&Vv–öåö6öFRuÒÂG%²wfV†–6ÆU÷G—RuÒÂG%²wfV†–6ÆUö6öÆ÷"uÒÂ†–çB’G%²w76VævW%ög&öçEö6÷VçBuÒÂ†–çB’G%²w76VævW%÷&V%ö6÷VçBuÒÂG%²vG&—fW%övVæFW"uÒÂG%²v6W'F–f–6FU÷7FGW2uÒÂ†–çB’G%²v–BuÒÂG%²v7&VFVEöBuÕÒ“°¢Ð¢Ö6F6‚…F‡&÷v&ÆRFR—¶W'&÷%öÆör‚w66†ööÂ×6W'f–6RfV†–6ÆR&6¶f–ÆÃ¢râFRÓævWDÖW76vR‚’“·Ð§Ð §&÷WFR‚ttUBrÂrö’÷66†ööÂ×6W'f–6R÷fV†–6ÆW2rÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷77eöæVVB‚GRÂwf–Wrr“²÷77eö&6¶f–ÆÅ÷fV†–6ÆW2‚“°¢GÕ÷77eöæ÷&Ò‚EôtUE²w6V&6‚uÓóòrr“²GvSÖÖ‚ƒÂ†–çB’‚EôtUE²wvRuÓóó’“²FÆ–Ö—CÖÖ‚ƒÆÖ–âƒ#Â†–çB’‚EôtUE²vÆ–Ö—BuÓóóS’’“°¢Gv†W&SÕ²wbæ—5ö7F—fSÓuÓ²F&w3ÕµÓ°¢–b‚GÓÒrr—²Gv†W&UµÓÒ$4ôä4B‡bçÆFU÷GvòÇbçÆFUöÆWGFW"ÇbçÆFU÷F‡&VRÇbçÆFU÷&Vv–öåö6öFR’Ä”´Ròõ"bçfV†–6ÆU÷G—RÄ”´Ròõ"bçfV†–6ÆUö6öÆ÷"Ä”´Rò#²F&w5µÓÒrRrâGârRs²F&w5µÓÒrRrâGârRs²F&w5µÓÒrRrâGârRs²Ð¢GsÖ–×ÆöFR‚räBrÂGv†W&R“²GF÷FÃÒ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒ66†ööÅ÷6W'f–6U÷fV†–6ÆW2bt„U$RGr"ÂF&w2•²vâuÓóó“²FöfcÒ‚GvRÓ’¢FÆ–Ö—C°¢F—FV×3ÔF#£¦ÆÂ‚%4TÄT5Bbâ¢Â…4TÄT5B4õTåB‚¢’e$ôÒ66†ööÅ÷6W'f–6Uö–ç7V7F–öç2’t„U$R’çÆFU÷Gvó×bçÆFU÷GvòäB’çÆFUöÆWGFW#×bçÆFUöÆWGFW"äB’çÆFU÷F‡&VS×bçÆFU÷F‡&VRäB’çÆFU÷&Vv–öåö6öFS×bçÆFU÷&Vv–öåö6öFR’–ç7V7F–öåö6÷Vç@¢e$ôÒ66†ööÅ÷6W'f–6U÷fV†–6ÆW2bt„U$RGrõ$DU"%’4ôÄU44R‡bæÆ7Eö–ç7V7F–öåöBÇbæ7&VFVEöB’DU42Ä”Ô•BFÆ–Ö—Bôde4UBFöfb"ÂF&w2“°¢f÷&V6‚‚F—FV×22bG"—²G%²wÆFRuÓÒG%²wÆFU÷GvòuÒârrâG%²wÆFUöÆWGFW"uÒârrâG%²wÆFU÷F‡&VRuÒârÒŠ}¸Í‹Š}˜brâG%²wÆFU÷&Vv–öåö6öFRuÓ·×Vç6WB‚G"“°¢&WGW&â²v—FV×2sÓâF—FV×2ÂwvRsÓâGvRÂvÆ–Ö—BsÓâFÆ–Ö—BÂwF÷FÂsÓâGF÷FÂÂwvW2sÓæÖ‚ƒÂ†–çB–6V–Â‚GF÷FÂòFÆ–Ö—B’•Ó°§Ò“°§&÷WFR‚uUBrÂrö’÷66†ööÂ×6W'f–6R÷fV†–6ÆW2÷¶–GÒrÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷77eöæVVB‚GRÂvVF—Br“µ÷77e÷F&ÆW2‚“²F–CÒ†–çB’G²v–BuÓ²GcÔF#£¦öæR‚%4TÄT5B¢e$ôÒ66†ööÅ÷6W'f–6U÷fV†–6ÆW2t„U$R–CÓò"Å²F–EÒ“¶–b‚Gb”‡GG£¦W'&÷"‚}Ší˜Šý‹˜‚¸ÍŠ}˜Š¢˜m‹MŠòârÃCB“°¢GG—SÕ÷77eöæ÷&Ò‚F%²wfV†–6ÆU÷G—RuÓóòrr“²F6öÆ÷#Õ÷77eöæ÷&Ò‚F%²wfV†–6ÆUö6öÆ÷"uÓóòrr“°¢–b‚GG—RÓÒrrbb÷77e÷fÆ–Eö÷F–öâ‚w66†ööÅ÷6W'f–6U÷fV†–6ÆU÷G—W2rÂGG—R’bbGG—RÓÒ}‹=Š}¸Í‹r”‡GG£¦W'&÷"‚}˜m˜‹’Ší˜Šý‹˜‚˜]‹Š­Š‹˜m¸Í‹=Š¢ârÃC#"“°¢–b‚F6öÆ÷"ÓÒrrbb÷77e÷fÆ–Eö÷F–öâ‚w66†ööÅ÷6W'f–6U÷fV†–6ÆUö6öÆ÷'2rÂF6öÆ÷"’bbF6öÆ÷"ÓÒ}‹=Š}¸Í‹r”‡GG£¦W'&÷"‚}‹˜mªòŠí˜Šý‹˜‚˜]‹Š­Š‹˜m¸Í‹=Š¢ârÃC#"“°¢FFsÖ–åö'&’‚F%²vG&—fW%övVæFW"uÓóòrrÂ²}ŠíŠ}˜m˜RrÂ}Š-˜-ŠrrÂ}˜mŠ}˜]‹MŠí‹RuÒÇG'VR“òF%²vG&—fW%övVæFW"uÓ¢}˜mŠ}˜]‹MŠí‹Rs°¢F6W'CÖ–åö'&’‚F%²v6W'F–f–6FU÷7FGW2uÓóòrrÂ²}˜]‹Š­Š‹rÂ}˜mŠ}˜]‹Š­Š‹rÂ}Š}‹Š}Šm˜r˜m‹MŠòuÒÇG'VR“òF%²v6W'F–f–6FU÷7FGW2uÓ¢}Š}‹Š}Šm˜r˜m‹MŠòs°¢Fg&öçCÖÖ‚ƒÂ†–çB’‚F%²w76VævW%ög&öçEö6÷VçBuÓóó’“²G&V#ÖÖ‚ƒÂ†–çB’‚F%²w76VævW%÷&V%ö6÷VçBuÓóó’“°¢F#£§'Vâ‚%UDDR66†ööÅ÷6W'f–6U÷fV†–6ÆW24UBfV†–6ÆU÷G—SÓòÇfV†–6ÆUö6öÆ÷#ÓòÇ76VævW%ög&öçEö6÷VçCÓòÇ76VævW%÷&V%ö6÷VçCÓòÆG&—fW%övVæFW#ÓòÆ6W'F–f–6FU÷7FGW3ÓòÆ—5ö7F—fSÓt„U$R–CÓò"Å²GG—Só¦çVÆÂÂF6öÆ÷#ó¦çVÆÂÂFg&öçBÂG&V"ÂFFrÂF6W'BÂF–EÒ“°¢&WGW&â²vö²sÓçG'VRÂv–BsÓâF–EÓ°§Ò“°§&÷WFR‚tDTÄUDRrÂrö’÷66†ööÂ×6W'f–6R÷fV†–6ÆW2÷¶–GÒrÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷77eöæVVB‚GRÂvFVÆWFRr“µ÷77e÷F&ÆW2‚“²F–CÒ†–çB’G²v–BuÓ¶–b‚F#£¦öæR‚%4TÄT5B–Be$ôÒ66†ööÅ÷6W'f–6U÷fV†–6ÆW2t„U$R–CÓò"Å²F–EÒ’”‡GG£¦W'&÷"‚}Ší˜Šý‹˜‚¸ÍŠ}˜Š¢˜m‹MŠòârÃCB“´F#£§'Vâ‚%UDDR66†ööÅ÷6W'f–6U÷fV†–6ÆW24UB—5ö7F—fSÓt„U$R–CÓò"Å²F–EÒ“·&WGW&â²vö²sÓçG'VUÓ°§Ò“°§&÷WFR‚ttUBrÂrö’÷66†ööÂ×6W'f–6R÷fV†–6ÆRÖÆöö·WrÆgVæ7F–öâ‚GÂF"ÂGR—°¢÷77eöæVVB‚GRÂwf–Wrr“²÷77eö&6¶f–ÆÅ÷fV†–6ÆW2‚“°¢GÆFUGvó×&Vu÷&WÆ6R‚rõÅÄBòrÂrrÅ÷77eöVâ‚EôtUE²wÆFU÷GvòuÓóòrr’“²GÆFUF‡&VS×&Vu÷&WÆ6R‚rõÅÄBòrÂrrÅ÷77eöVâ‚EôtUE²wÆFU÷F‡&VRuÓóòrr’“²G&Vv–öã×&Vu÷&WÆ6R‚rõÅÄBòrÂrrÅ÷77eöVâ‚EôtUE²wÆFU÷&Vv–öåö6öFRuÓóòrr’“²FÆWGFW#Õ÷77eöæ÷&Ò‚EôtUE²wÆFUöÆWGFW"uÓóòrr“°¢–b‡7G&ÆVâ‚GÆFUGvò’ÓÓ'ÇÇ7G&ÆVâ‚GÆFUF‡&VR’ÓÓ7ÇÇ7G&ÆVâ‚G&Vv–öâ’ÓÓ'ÇÂFÆWGFW#ÓÓÒrr”‡GG£¦W'&÷"‚}Š‹Š}¸ÂŠ}‹=Š­‹˜MŠ}˜]ˆÂ›í˜MŠ}ª’‹ŠrªŠ}˜]˜B˜Š}‹Šòª˜m¸ÍŠòârÃC#"“°¢G&÷sÔF#£¦öæR‚%4TÄT5Bbâ¢e$ôÒ66†ööÅ÷6W'f–6U÷fV†–6ÆW2bt„U$RbçÆFU÷GvóÓòäBbçÆFU÷F‡&VSÓòäBbçÆFUöÆWGFW#ÓòäBbçÆFU÷&Vv–öåö6öFSÓòäBbæ—5ö7F—fSÓÄ”Ô•B"Å²GÆFUGvòÂGÆFUF‡&VRÂFÆWGFW"ÂG&Vv–öåÒ“°¢–b‚G&÷r—&WGW&â²vf÷VæBsÓæfÇ6RÂwfV†–6ÆRsÓæçVÆÂÂv†—7F÷'’sÓåµÕÓ°¢F†—7F÷'“ÔF#£¦ÆÂ‚%4TÄT5B’æ–BÆ’ç66†ööÅö–BÆ’æ6ö×ç•ö–BÆ’çf–öÆF–öåöFFRÆ’çf–öÆF–öå÷F–ÖRÆ’çfV†–6ÆU÷G—RÆ’çfV†–6ÆUö6öÆ÷"Æ’æ6W'F–f–6FU÷7FGW2Ç2ææÖR66†ööÅöæÖRÆ2ææÖR6ö×ç•öæÖRe$ôÒ66†ööÅ÷6W'f–6Uö–ç7V7F–öç2’ÄTeB¤ô”â66†ööÅ÷6W'f–6U÷66†ööÇ22ôâ2æ–CÖ’ç66†ööÅö–BÄTeB¤ô”â66†ööÅ÷6W'f–6Uö6ö×æ–W22ôâ2æ–CÖ’æ6ö×ç•ö–Bt„U$R’çÆFU÷GvóÓòäB’çÆFU÷F‡&VSÓòäB’çÆFUöÆWGFW#ÓòäB’çÆFU÷&Vv–öåö6öFSÓòõ$DU"%’’æ–BDU42Ä”Ô•B#"Å²GÆFUGvòÂGÆFUF‡&VRÂFÆWGFW"ÂG&Vv–öåÒ“°¢f÷&V6‚‚F†—7F÷'’2bF‚—²F…²wf–öÆF–öç2uÓÖ'&•ö6öÇVÖâ„F#£¦ÆÂ‚%4TÄT5BbçF—FÆRe$ôÒ66†ööÅ÷6W'f–6Uö–ç7V7F–öå÷f–öÆF–öç2‚¤ô”â66†ööÅ÷6W'f–6U÷f–öÆF–öå÷G—W2bôâbæ–C×‚çf–öÆF–öå÷G—Uö–Bt„U$R‚æ–ç7V7F–öåö–CÓò"Å²†–çB’F…²v–BuÕÒ’ÂwF—FÆRr“·×Vç6WB‚F‚“°¢&WGW&â²vf÷VæBsÓçG'VRÂwfV†–6ÆRsÓå²v–BsÓâ†–çB’G&÷u²v–BuÒÂwÆFU÷GvòsÓâG&÷u²wÆFU÷GvòuÒÂwÆFUöÆWGFW"sÓâG&÷u²wÆFUöÆWGFW"uÒÂwÆFU÷F‡&VRsÓâG&÷u²wÆFU÷F‡&VRuÒÂwÆFU÷&Vv–öåö6öFRsÓâG&÷u²wÆFU÷&Vv–öåö6öFRuÒÂwfV†–6ÆU÷G—RsÓâG&÷u²wfV†–6ÆU÷G—RuÒÂwfV†–6ÆUö6öÆ÷"sÓâG&÷u²wfV†–6ÆUö6öÆ÷"uÒÂw76VævW%ög&öçEö6÷VçBsÓâG&÷u²w76VævW%ög&öçEö6÷VçBuÒÂw76VævW%÷&V%ö6÷VçBsÓâG&÷u²w76VævW%÷&V%ö6÷VçBuÒÂvG&—fW%övVæFW"sÓâG&÷u²vG&—fW%övVæFW"uÒÂv6W'F–f–6FU÷7FGW2sÓâG&÷u²v6W'F–f–6FU÷7FGW2uÕÒÂvÆ7BsÓâF†—7F÷'•³ÓóöçVÆÂÂv†—7F÷'’sÓâF†—7F÷'•Ó°§Ò“°§&÷WFR‚ttUBrÂrö’÷66†ööÂ×6W'f–6Rö–ç7V7F–öç2rÆgVæ7F–öâ‚GÂF"ÂGR—µ÷77eöæVVB‚GRÂwf–Wrr“µ÷77e÷F&ÆW2‚“²F3Õ²sÓuÓ²F&w3ÕµÓ²GÕ÷77eöæ÷&Ò‚EôtUE²w6V&6‚uÓóòrr“¶–b‚GÓÒrr—²F5µÓÒr‡2ææÖRÄ”´Ròõ"2ææÖRÄ”´Ròõ"’æÆö6F–öå÷FW‡BÄ”´Ròõ"4ôä4B†’çÆFU÷F‡&VRÆ’çÆFUöÆWGFW"Æ’çÆFU÷Gvò’Ä”´Rò’s²F&w3Ö'&•öÖW&vR‚F&w2Å²rRrâGârRrÂrRrâGârRrÂrRrâGârRrÂrRrâGârRuÒ“·Ö–b‚V×G’‚EôtUE²v6ö×ç•ö–BuÒ’—²F5µÓÒv’æ6ö×ç•ö–CÓòs²F&w5µÓÒ†–çB’EôtUE²v6ö×ç•ö–BuÓ·Ö–b‚V×G’‚EôtUE²vF—7G&–7BuÒ’—²F5µÓÕ÷77eöF—7G&–7E÷7Â‚v’æVGV6F–öæÅöF—7G&–7Br’âsÓòs²F&w5µÓÕ÷77eöF—7G&–7Eöæ÷&ÖÆ—¦VB‚EôtUE²vF—7G&–7BuÒ“·Ö–b‚V×G’‚EôtUE²vÖ–æRuÒ’—²F5µÓÒv’æ–ç7V7F÷%÷W6W%ö–CÓòs²F&w5µÓÒ†–çB’GU²v–BuÓ·ÒGv†W&SÖ–×ÆöFR‚räBrÂF2“²G&÷w3ÔF#£¦ÆÂ‚%4TÄT5B’â¢Ç2ææÖR66†ööÅöæÖRÆ2ææÖR6ö×ç•öæÖRÅE$”Ò„4ôä4B„4ôÄU44R‡Ræf—'7EöæÖRÂrr’ÂrrÄ4ôÄU44R‡RæÆ7EöæÖRÂrr’’’–ç7V7F÷%öæÖRe$ôÒ66†ööÅ÷6W'f–6Uö–ç7V7F–öç2’ÄTeB¤ô”â66†ööÅ÷6W'f–6U÷66†ööÇ22ôâ2æ–CÖ’ç66†ööÅö–BÄTeB¤ô”â66†ööÅ÷6W'f–6Uö6ö×æ–W22ôâ2æ–CÖ’æ6ö×ç•ö–BÄTeB¤ô”âW6W'2RôâRæ–CÖ’æ–ç7V7F÷%÷W6W%ö–Bt„U$RGv†W&Rõ$DU"%’’æ–BDU42Ä”Ô•B"ÂF&w2“¶f÷&V6‚‚G&÷w22bG"—²G%²wÆFRuÓ×G&–Ò‚‚G%²wÆFU÷F‡&VRuÓóòrr’ârrâ‚G%²wÆFUöÆWGFW"uÓóòrr’ârrâ‚G%²wÆFU÷GvòuÓóòrr’ârŠ}¸Í‹Š}˜brâ‚G%²wÆFU÷&Vv–öåö6öFRuÓóòrr’“²G%²wf–öÆF–öç2uÓÖ'&•ö6öÇVÖâ„F#£¦ÆÂ‚%4TÄT5BbçF—FÆRe$ôÒ66†ööÅ÷6W'f–6Uö–ç7V7F–öå÷f–öÆF–öç2‚¤ô”â66†ööÅ÷6W'f–6U÷f–öÆF–öå÷G—W2bôâbæ–C×‚çf–öÆF–öå÷G—Uö–Bt„U$R‚æ–ç7V7F–öåö–CÓò"Å²†–çB’G%²v–BuÕÒ’ÂwF—FÆRr“·×Vç6WB‚G"“·&WGW&â²v—FV×2sÓâG&÷w5Ó·Ò“°§&÷WFR‚uõ5BrÂrö’÷66†ööÂ×6W'f–6Rö–ç7V7F–öç2rÆgVæ7F–öâ‚GÂF"ÂGR—µ÷77eöæVVB‚GRÂv7&VFRr“µ÷77e÷F&ÆW2‚“µ÷77e÷&WV—&Uö–ç7V7F–öåö6÷&R‚F"“²F6Æ–VçEWV–CÕ÷77eöæ÷&Ò‚F%²v6Æ–VçE÷WV–BuÓóòrr“¶–b‚F6Æ–VçEWV–BÓÒrr—²FW†—7F–æsÔF#£¦öæR‚%4TÄT5B–Be$ôÒ66†ööÅ÷6W'f–6Uö–ç7V7F–öç2t„U$R6Æ–VçE÷WV–CÓò"Å²F6Æ–VçEWV–EÒ“¶–b‚FW†—7F–ær—&WGW&â²vö²sÓçG'VRÂv–BsÓâ†–çB’FW†—7F–æu²v–BuÒÂvGWÆ–6FRsÓçG'VUÓ²Õ²FÂFÂÂF2ÂG%ÓÕ÷77e÷ÆFR‚F"“²G66†ööÄ–CÒ†–çB’‚F%²w66†ööÅö–BuÓóó“²F6ö×ç”–CÒ†–çB’‚F%²v6ö×ç•ö–BuÓóó“¶–b‚G66†ööÄ–BbbF6ö×ç”–B—²FÖÔF#£¦öæR‚%4TÄT5B6ö×ç•ö–Be$ôÒ66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W2t„U$R66†ööÅö–CÓòÄ”Ô•B"Å²G66†ööÄ–EÒ“¶–b‚FÖ’F6ö×ç”–CÒ†–çB’FÖ²v6ö×ç•ö–BuÓ·ÒGf–öÃÒF%²wf–öÆF–öåö–G2uÓóõµÓ¶–b†—5÷7G&–ær‚Gf–öÂ’’Gf–öÃÖ§6öåöFV6öFR‚Gf–öÂÇG'VR“ó¥µÓ²Gf–öÃÖ'&•÷fÇVW2†'&•÷Væ—VR†'&•öÖ‚v–çGfÂrÂ†'&’’Gf–öÂ’’“¶–b‚G66†ööÄ–B’G66†ööÄ–CÖçVÆÃ¶–b‚F6ö×ç”–B’F6ö×ç”–CÖçVÆÃ²FF—7G&–7CÕ÷77eöF—7G&–7Eö¶W’‚F%²vVGV6F–öæÅöF—7G&–7BuÓóòrr“¶–b‚FF—7G&–7CÓÓÒrwÇÂ÷77e÷fÆ–EöF—7G&–7B‚FF—7G&–7B’”‡GG£¦W'&÷"‚}˜mŠ}ŠÝ¸Í˜rŠ-˜]˜‹-‹M¸ÂŠ}˜mŠ­ŠíŠ}ŠŽ(Í‹MŠý˜r˜]‹Š­Š‹¸ÍŠr˜‹Š}˜B˜m¸Í‹=Š¢ârÃC#"“²GfV†–6ÆUG—SÕ÷77eöæ÷&Ò‚F%²wfV†–6ÆU÷G—Uö7W7FöÒuÓóòrr“ó¥÷77eöæ÷&Ò‚F%²wfV†–6ÆU÷G—RuÓóòrr“²GfV†–6ÆUG—T7W7FöÓÒV×G’‚F%²wfV†–6ÆU÷G—Uö7W7FöÒuÒ“¶–b‚GfV†–6ÆUG—T7W7FöÒ—¶–b‚GfV†–6ÆUG—SÓÓÒrr”‡GG£¦W'&÷"‚}˜m˜‹’Ší˜Šý‹˜‚‹=Š}¸Í‹ŠŠ}¸ÍŠò˜Š}‹Šò‹M˜ŠòârÃC#"“¶–b†Ö%÷7G&ÆVâ‚GfV†–6ÆUG—R“ã”‡GG£¦W'&÷"‚}˜m˜‹’Ší˜Šý‹˜‚˜Š}‹Šý‹MŠý˜rŠ¸Í‹BŠ}‹"ŠÝŠò˜]ŠÍŠ}‹"Š}‹=Š¢ârÃC#"“·ÖVÇ6V–b‚GfV†–6ÆUG—RÓÒrrbb÷77e÷fÆ–Eö÷F–öâ‚w66†ööÅ÷6W'f–6U÷fV†–6ÆU÷G—W2rÂGfV†–6ÆUG—R’”‡GG£¦W'&÷"‚}˜m˜‹’Ší˜Šý‹˜‚Š}˜mŠ­ŠíŠ}ŠŽ(Í‹MŠý˜r˜]‹Š­Š‹¸ÍŠr˜‹Š}˜B˜m¸Í‹=Š¢ârÃC#"“²GfV†–6ÆT6öÆ÷#Õ÷77eöæ÷&Ò‚F%²wfV†–6ÆUö6öÆ÷%ö7W7FöÒuÓóòrr“ó¥÷77eöæ÷&Ò‚F%²wfV†–6ÆUö6öÆ÷"uÓóòrr“²GfV†–6ÆT6öÆ÷$7W7FöÓÒV×G’‚F%²wfV†–6ÆUö6öÆ÷%ö7W7FöÒuÒ“¶–b‚GfV†–6ÆT6öÆ÷$7W7FöÒ—¶–b‚GfV†–6ÆT6öÆ÷#ÓÓÒrr”‡GG£¦W'&÷"‚}‹˜mªòŠí˜Šý‹˜‚‹=Š}¸Í‹ŠŠ}¸ÍŠò˜Š}‹Šò‹M˜ŠòârÃC#"“¶–b†Ö%÷7G&ÆVâ‚GfV†–6ÆT6öÆ÷"“ãƒ”‡GG£¦W'&÷"‚}‹˜mªòŠí˜Šý‹˜‚˜Š}‹Šý‹MŠý˜rŠ¸Í‹BŠ}‹"ŠÝŠò˜]ŠÍŠ}‹"Š}‹=Š¢ârÃC#"“·ÖVÇ6V–b‚GfV†–6ÆT6öÆ÷"ÓÒrrbb÷77e÷fÆ–Eö÷F–öâ‚w66†ööÅ÷6W'f–6U÷fV†–6ÆUö6öÆ÷'2rÂGfV†–6ÆT6öÆ÷"’”‡GG£¦W'&÷"‚}‹˜mªòŠí˜Šý‹˜‚Š}˜mŠ­ŠíŠ}ŠŽ(Í‹MŠý˜r˜]‹Š­Š‹¸ÍŠr˜‹Š}˜B˜m¸Í‹=Š¢ârÃC#"“µ÷77e÷66†ööÅö6ö×ç•÷fÆ–FFR‚G66†ööÄ–CóóÂF6ö×ç”–CóóÂFF—7G&–7B“²FvVæFW#Ö–åö'&’‚F%²w66†ööÅövVæFW"uÓóòrrÅ²}ŠýŠíŠ­‹Š}˜m˜rrÂ}›í‹=‹Š}˜m˜rrÂ}˜mŠ}˜]‹MŠí‹RuÒÇG'VR“òF%²w66†ööÅövVæFW"uÓ¢}˜mŠ}˜]‹MŠí‹Rs²FFsÖ–åö'&’‚F%²vG&—fW%övVæFW"uÓóòrrÅ²}ŠíŠ}˜m˜RrÂ}Š-˜-ŠrrÂ}˜mŠ}˜]‹MŠí‹RuÒÇG'VR“òF%²vG&—fW%övVæFW"uÓ¢}˜mŠ}˜]‹MŠí‹Rs²F6W'CÖ–åö'&’‚F%²v6W'F–f–6FU÷7FGW2uÓóòrrÅ²}˜]‹Š­Š‹rÂ}˜mŠ}˜]‹Š­Š‹rÂ}Š}‹Š}Šm˜r˜m‹MŠòuÒÇG'VR“òF%²v6W'F–f–6FU÷7FGW2uÓ¢}Š}‹Š}Šm˜r˜m‹MŠòsµ²G74g&öçBÂG75&V"ÂG75ÓÕ÷77e÷76VævW'2‚F"“²FFFSÕ÷77eöVâ‚F%²wf–öÆF–öåöFFRuÓóòrr“²GF–ÖSÕ÷77eöVâ‡G&–Ò‚‡7G&–ær’‚F%²wf–öÆF–öå÷F–ÖRuÓóòrr’’“¶–b‚FFFRÓÒrrbb&VuöÖF6‚‚rõãEÆG³'ÕµÂòÕÕÆG³Ã'ÕµÂòÕÕÆG³Ã'ÒBòrÂFFFR’”‡GG£¦W'&÷"‚}Š­Š}‹¸ÍŠâŠ½ŠŠ¢Š­Ší˜M˜˜mŠ}˜]‹Š­Š‹Š}‹=Š¢ârÃC#"“¶–b‚GF–ÖRÓÒrrbb&VuöÖF6‚‚rõâƒó¥³ÓõÆGÃ%³Ó5Ò“¥³ÓUÕÆBBòrÂGF–ÖR’”‡GG£¦W'&÷"‚}‹=Š}‹Š¢Š½ŠŠ¢Š­Ší˜M˜˜mŠ}˜]‹Š­Š‹Š}‹=Š¢ârÃC#"“²GW6U66†ööÄÆö6F–öãÒV×G’‚F%²wW6U÷66†ööÅöÆö6F–öâuÒ“²FÆö6F–öåFW‡CÕ÷77eöæ÷&Ò‚F%²vÆö6F–öå÷FW‡BuÓóòrr“ó¦çVÆÃ¶–b‚GW6U66†ööÄÆö6F–öâ—¶–b‚G66†ööÄ–B”‡GG£¦W'&÷"‚}Š‹Š}¸ÂŠ}‹=Š­˜Š}Šý˜rŠ}‹"˜]ªŠ}˜b˜]Šý‹‹=˜}ˆÂŠ}ŠŠ­ŠýŠr˜]Šý‹‹=˜r‹ŠrŠ}˜mŠ­ŠíŠ}Š‚ª˜m¸ÍŠòârÃC#"“²G66†ööÄÆö3ÔF#£¦öæR‚%4TÄT5BÆF—GVFRÆÆöæv—GVFRÆFG&W72e$ôÒ66†ööÅ÷6W'f–6U÷66†ööÇ2t„U$R–CÓòäB—5ö7F—fSÓ"Å²G66†ööÄ–EÒ“¶–b‚G66†ööÄÆö7ÇÂG66†ööÄÆö5²vÆF—GVFRuÓÓÓÖçVÆÇÇÂG66†ööÄÆö5²vÆöæv—GVFRuÓÓÓÖçVÆÂ”‡GG£¦W'&÷"‚}˜]˜˜-‹¸ÍŠ¢Š}¸Í˜b˜]Šý‹‹=˜rŠ½ŠŠ¢˜m‹MŠý˜rŠ}‹=Š­‰²Š}ŠŠ­ŠýŠr˜]˜˜-‹¸ÍŠ¢˜]Šý‹‹=˜r‹ŠrŠ}‹]˜MŠ}ŠÒ¸ÍŠrŠ½ŠŠ¢ª˜m¸ÍŠòârÃC#"“²FÆCÒ†fÆöB’G66†ööÄÆö5²vÆF—GVFRuÓ²FÆæsÒ†fÆöB’G66†ööÄÆö5²vÆöæv—GVFRuÓ²FÆö6F–öåFW‡CÕ÷77eöæ÷&Ò‚G66†ööÄÆö5²vFG&W72uÓóòrr“ó¢}˜]ªŠ}˜b˜]Šý‹‹=˜rs·ÖVÇ6Wµ²FÆBÂFÆæuÓ×fÆ–DvVò‚F%²vÆF—GVFRuÓóöçVÆÂÂF%²vÆöæv—GVFRuÓóöçVÆÂ“·ÔF#£§'Vâ‚$”å4U%B”åDò66†ööÅ÷6W'f–6Uö–ç7V7F–öç2†–ç7V7F÷%÷W6W%ö–BÆ6Æ–VçE÷WV–BÆVGV6F–öæÅöF—7G&–7BÆ6ö×ç•ö–BÇ66†ööÅö–BÇ66†ööÅövVæFW"ÇÆFU÷F‡&VRÇÆFUöÆWGFW"ÇÆFU÷GvòÆ—&åö6öFRÇÆFU÷&Vv–öåö6öFRÇfV†–6ÆU÷G—RÇfV†–6ÆUö6öÆ÷"Ç76VævW%ö6÷VçBÇ76VævW%ög&öçEö6÷VçBÇ76VævW%÷&V%ö6÷VçBÆG&—fW%övVæFW"Æ6W'F–f–6FU÷7FGW2Çf–öÆF–öåöFFRÇf–öÆF–öå÷F–ÖRÆÆö6F–öå÷FW‡BÆÆF—GVFRÆÆöæv—GVFRÆFW67&—F–öâ’dÅTU2ƒòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃò’"Å²†–çB’GU²v–BuÒÅ÷77eöæ÷&Ò‚F%²v6Æ–VçE÷WV–BuÓóòrr“ó¦çVÆÂÂFF—7G&–7BÂF6ö×ç”–Có¦çVÆÂÂG66†ööÄ–Có¦çVÆÂÂFvVæFW"ÂFÂFÂÂF2Â}Š}¸Í‹Š}˜brÂG"ÂGfV†–6ÆUG—RÂGfV†–6ÆT6öÆ÷"ÂG72ÂG74g&öçBÂG75&V"ÂFFrÂF6W'BÂFFFSó¦çVÆÂÂGF–ÖSó¦çVÆÂÂFÆö6F–öåFW‡BÂFÆBÂFÆærÇG&–Ò‚‡7G&–ær’‚F%²vFW67&—F–öâuÓóòrr’“ó¦çVÆÅÒ“²F–CÒ†–çB”F#£§Fò‚’ÓæÆ7D–ç6W'D–B‚“µ÷77e÷7–æ5÷fV†–6ÆUög&öÕö–ç7V7F–öâ‚F–B“¶f÷&V6‚‚Gf–öÂ2Gf–B—¶–b„F#£¦öæR‚%4TÄT5B–Be$ôÒ66†ööÅ÷6W'f–6U÷f–öÆF–öå÷G—W2t„U$R–CÓòäB—5ö7F—fSÓ"Å²Gf–EÒ’”F#£§'Vâ‚$”å4U%B”täõ$R”åDò66†ööÅ÷6W'f–6Uö–ç7V7F–öå÷f–öÆF–öç2†–ç7V7F–öåö–BÇf–öÆF–öå÷G—Uö–B’dÅTU2ƒòÃò’"Å²F–BÂGf–EÒ“·×&WGW&â²vö²sÓçG'VRÂv–BsÓâF–EÓ·Ò“°§&÷WFR‚uõ5BrÂrö’÷66†ööÂ×6W'f–6Rö–×÷'BrÆgVæ7F–öâ‚GÂF"ÂGR—µ÷77eöæVVB‚GRÂv–×÷'Br“µ÷77e÷F&ÆW2‚“²G6†VWG3Õ÷77e÷†Ç7…÷&÷w2‚Eôd”ÄU5²vf–ÆRuÓóöçVÆÂ“²G&V6÷&G3ÕµÓ¶f÷&V6‚‚G6†VWG22FæÖSÓâG&÷w2—²G&V6÷&G3Ö'&•öÖW&vR‚G&V6÷&G2Å÷77e÷6†VWE÷&V6÷&G2‚G&÷w2’“·Ö–b‚G&V6÷&G2”‡GG£¦W'&÷"‚}˜}¸Í¨b‹Šý¸Í˜˜-Š}Š˜B‹M˜mŠ}‹=Š}¸Í¸ÂŠý‹˜Š}¸Í˜BW†6VÂ›í¸ÍŠýŠr˜m‹MŠòâ‹=Š­˜˜n(Í˜}Š}¸Â*½˜mŠ}˜R˜]Šý‹‹=˜|+²˜‚*½‹M‹ªŠ¢˜]ŠÍ‹¸Â‹=‹˜¸Í‹2ŠýŠ}˜m‹N(ÍŠ-˜]˜‹-¸Ì+²‹ŠrŠ‹‹‹=¸Âª˜m¸ÍŠòârÃC#"“²F63Ó²G63Ó²FÖ3Ó²FW''3ÕµÓ¶f÷&V6‚‚G&V6÷&G22G"—·G'—²F6ãÕ÷77eöæ÷&Ò‚G%²v6ö×ç’uÒ“²G6ãÕ÷77eöæ÷&Ò‚G%²w66†ööÂuÒ“²FF—7G&–7CÕ÷77eöF—7G&–7Eö¶W’‚G%²vF—7G&–7BuÒ“¶–b‚FF—7G&–7CÓÓÒrwÇÂ÷77e÷fÆ–EöF—7G&–7B‚FF—7G&–7B’—F‡&÷ræWr'VçF–ÖTW†6WF–öâ‚}˜mŠ}ŠÝ¸Í˜rŠ-˜]˜‹-‹M¸Â˜mŠ}˜]‹Š­Š‹¢râ‚G%²vF—7G&–7BuÓóòrr’“¶–b‚F6âÓÒrr—²F6óÔF#£¦öæR‚%4TÄT5B–Be$ôÒ66†ööÅ÷6W'f–6Uö6ö×æ–W2t„U$RæÖSÓò"Å²F6åÒ“¶–b‚F6ò’F6–CÒ†–çB’F6õ²v–BuÓ¶VÇ6W´F#£§'Vâ‚$”å4U%B”åDò66†ööÅ÷6W'f–6Uö6ö×æ–W2†æÖRÆÖævW%öæÖRÇ†öæRÆFG&W72ÆÖævW%öÖö&–ÆRÆÆæFÆ–æU÷†öæRÆÆF—GVFRÆÆöæv—GVFRÇ&Vv—7FW&VE÷66†ööÅö6÷VçBÇ&W&W6VçFF—fUö6÷VçBÇ7FGW2Ç&öf–ÆUö6ö×ÆWFR’dÅTU2ƒòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃòÃò’"Å²F6âÂG%²vÖævW"uÓó¦çVÆÂÂG%²w†öæRuÓó¦çVÆÂÂG%²vFG&W72uÓó¦çVÆÂÂG%²vÖævW%öÖö&–ÆRuÓó¦çVÆÂÂG%²vÆæFÆ–æRuÓó¦çVÆÂÂG%²vÆF—GVFRuÒÓÒrsò†fÆöB’G%²vÆF—GVFRuÓ¦çVÆÂÂG%²vÆöæv—GVFRuÒÓÒrsò†fÆöB’G%²vÆöæv—GVFRuÓ¦çVÆÂÆÖ‚ƒÂ†–çB’‚G%²w&Vv—7FW&VE÷66†ööÅö6÷VçBuÓó£’’ÆÖ‚ƒÂ†–çB’‚G%²w&W&W6VçFF—fUö6÷VçBuÓó£’’Å÷77eöæ÷&Ò‚G%²w7FGW2uÓó¢}˜‹Š}˜Br“ó¢}˜‹Š}˜BrÆ–åö'&’…÷77eöæ÷&Ò‚G%²w&öf–ÆUö6ö×ÆWFRuÓóòrr’Å²}»rÂsrÂ}Š˜M˜rrÂ}Š­ª˜]¸Í˜BuÒÇG'VR“ó£Ò“²F6–CÒ†–çB”F#£§Fò‚’ÓæÆ7D–ç6W'D–B‚“²F62²³·×ÖVÇ6W²F6–CÖçVÆÃ·ÒF6öFSÕ÷77eöæ÷&Ò‚G%²v6öFRuÒ“²G66†ööÃÖçVÆÃ¶–b‚F6öFRÓÒrr’G66†ööÃÔF#£¦öæR‚%4TÄT5B–Be$ôÒ66†ööÅ÷6W'f–6U÷66†ööÇ2t„U$R6öFSÓò"Å²F6öFUÒ“¶–b‚G66†ööÂ’G66†ööÃÔF#£¦öæR‚%4TÄT5B–Be$ôÒ66†ööÅ÷6W'f–6U÷66†ööÇ2t„U$RæÖSÓòäBVGV6F–öæÅöF—7G&–7CÓò"Å²G6âÂFF—7G&–7EÒ“¶–b‚G66†ööÂ—²G6–CÒ†–çB’G66†ööÅ²v–BuÓ´F#£§'Vâ‚%UDDR66†ööÅ÷6W'f–6U÷66†ööÇ24UBæÖSÓòÆVGV6F–öæÅöF—7G&–7CÓòÆvVæFW#ÓòÆFG&W73ÓòÆ—5ö7F—fSÓt„U$R–CÓò"Å²G6âÂFF—7G&–7BÆ–åö'&’‚G%²vvVæFW"uÒÅ²}ŠýŠíŠ­‹Š}˜m˜rrÂ}›í‹=‹Š}˜m˜ruÒÇG'VR“òG%²vvVæFW"uÓ¢}˜mŠ}˜]‹MŠí‹RrÂG%²vFG&W72uÓó¦çVÆÂÂG6–EÒ“·ÖVÇ6W´F#£§'Vâ‚$”å4U%B”åDò66†ööÅ÷6W'f–6U÷66†ööÇ2†6öFRÆæÖRÆVGV6F–öæÅöF—7G&–7BÆvVæFW"ÆFG&W72’dÅTU2ƒòÃòÃòÃòÃò’"Å²F6öFSó¦çVÆÂÂG6âÂFF—7G&–7BÆ–åö'&’‚G%²vvVæFW"uÒÅ²}ŠýŠíŠ­‹Š}˜m˜rrÂ}›í‹=‹Š}˜m˜ruÒÇG'VR“òG%²vvVæFW"uÓ¢}˜mŠ}˜]‹MŠí‹RrÂG%²vFG&W72uÓó¦çVÆÅÒ“²G6–CÒ†–çB”F#£§Fò‚’ÓæÆ7D–ç6W'D–B‚“²G62²³·Ö–b‚F6–B—²FöÆDÖÔF#£¦öæR‚%4TÄT5B6ö×ç•ö–Be$ôÒ66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W2t„U$R66†ööÅö–CÓò"Å²G6–EÒ“¶–b‚FöÆDÖ—¶–b‚†–çB’FöÆDÖ²v6ö×ç•ö–BuÒÓÒ†–çB’F6–B—´F#£§'Vâ‚%UDDR66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W24UB6ö×ç•ö–CÓòÆ—5÷&–Ö'“Ót„U$R66†ööÅö–CÓò"Å²F6–BÂG6–EÒ“²FÖ2²³·×ÖVÇ6W´F#£§'Vâ‚$”å4U%B”åDò66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W2‡66†ööÅö–BÆ6ö×ç•ö–BÆ—5÷&–Ö'’’dÅTU2ƒòÃòÃ’"Å²G6–BÂF6–EÒ“²FÖ2²³·××Ö6F6‚…F‡&÷v&ÆRFR—²FW''5µÓÒ}‹Šý¸Í˜˜]Šý‹‹=˜r*²râ‚G%²w66†ööÂuÓóòrr’â|+³¢râFRÓævWDÖW76vR‚“¶–b†6÷VçB‚FW''2“ãÓ–'&V³·×ÔF#£§'Vâ‚$”å4U%B”åDò66†ööÅ÷6W'f–6Uö–×÷'EöÆöw2‡W6W%ö–BÆf–ÆUöæÖRÆ6ö×æ–W5ö6÷VçBÇ66†ööÇ5ö6÷VçBÆÖ–æw5ö6÷VçBÆW'&÷'5ö6÷VçBÆW'&÷'5÷FW‡B’dÅTU2ƒòÃòÃòÃòÃòÃòÃò’"Å²†–çB’GU²v–BuÒÂEôd”ÄU5²vf–ÆRuÕ²væÖRuÓóòtW†6VÂrÂF62ÂG62ÂFÖ2Æ6÷VçB‚FW''2’Æ–×ÆöFR‚%Æâ"ÂFW''2•Ò“·&WGW&â²vö²sÓçG'VRÂv6ö×æ–W5ö6÷VçBsÓâF62Âw66†ööÇ5ö6÷VçBsÓâG62ÂvÖ–æw5ö6÷VçBsÓâFÖ2ÂvW'&÷'2sÓâFW''5Ó·ÒÆfÇ6RÃ“’“°§&÷WFR‚ttUBrÂrö’÷66†ööÂ×6W'f–6RöW‡÷'BrÆgVæ7F–öâ‚GÂF"ÂGR—µ÷77eöæVVB‚GRÂw&W÷'Br“µ÷77e÷F&ÆW2‚“²GG—SÒEôtUE²wG—RuÓóòv–ç7V7F–öç2s²G&÷w3ÕµÓ²F†VCÕµÓ¶–b‚GG—SÓÓÒw66†ööÇ2r—²F†VCÕ²}‹Šý¸Í˜rÂ}ªŠò˜]Šý‹‹=˜rrÂ}˜mŠ}˜R˜]Šý‹‹=˜rrÂ}˜mŠ}ŠÝ¸Í˜rŠ-˜]˜‹-‹M¸ÂrÂ}˜m˜‹’˜]Šý‹‹=˜rrÂ}‹M‹ªŠ¢ý‹M‹ªŠ®(Í˜}Š}¸Â˜]ŠÍ‹¸ÂrÂ}Š-Šý‹‹2uÓ²G&÷w3ÔF#£¦ÆÂ‚%4TÄT5B2æ–BÇ2æ6öFRÇ2ææÖRÇ2æVGV6F–öæÅöF—7G&–7BÇ2ævVæFW"Ç2æFG&W72Äu$õUô4ôä4B„D•5D”ä5B2ææÖRõ$DU"%’2ææÖR4U$Dõ"}ˆÂr’6ö×ç•öæÖW2e$ôÒ66†ööÅ÷6W'f–6U÷66†ööÇ22ÄTeB¤ô”â66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W262ôâ62ç66†ööÅö–C×2æ–BÄTeB¤ô”â66†ööÅ÷6W'f–6Uö6ö×æ–W22ôâ2æ–C×62æ6ö×ç•ö–Bt„U$R2æ—5ö7F—fSÓu$õU%’2æ–Bõ$DU"%’2ææÖRÄ”Ô•B"“¶f÷&V6‚‚G&÷w22F“ÓâbG"’G#Õ²F’³ÂG%²v6öFRuÒÂG%²væÖRuÒÂG%²vVGV6F–öæÅöF—7G&–7BuÒÂG%²vvVæFW"uÒÂG%²v6ö×ç•öæÖW2uÒÂG%²vFG&W72uÕÓ·Vç6WB‚G"“·ÖVÇ6V–b‚GG—SÓÓÒv6ö×æ–W2r—²F†VCÕ²}‹Šý¸Í˜rÂ}‹M˜mŠ}‹=˜rrÂ}˜mŠ}˜R‹M‹ªŠ¢rÂ}˜]Šý¸Í‹‹Š}˜]˜BrÂ}˜]˜ŠŠ}¸Í˜B˜]Šý¸Í‹‹Š}˜]˜BrÂ}Š­˜M˜˜bŠ½Š}ŠŠ¢rÂ}Š-Šý‹‹2rÂ}‹‹‹bŠÍ‹­‹Š}˜¸ÍŠ}¸Í¸ÂrÂ}‹}˜˜BŠÍ‹­‹Š}˜¸ÍŠ}¸Í¸ÂrÂ}Š­‹ŠýŠ}Šò˜]ŠýŠ}‹‹2rÂ}˜]ŠýŠ}‹‹2Š½ŠŠ®(Í‹MŠý˜rrÂ}Š­‹ŠýŠ}Šò˜m˜]Š}¸Í˜mŠýªýŠ}˜brÂ}˜‹m‹¸ÍŠ¢rÂ}Š­ª˜]¸Í˜B›í‹˜˜Š}¸Í˜BuÓ²G&÷w3ÔF#£¦ÆÂ‚%4TÄT5B2â¢Ä4õTåB„D•5D”ä5B62ç66†ööÅö–B’66†ööÅö6÷VçBe$ôÒ66†ööÅ÷6W'f–6Uö6ö×æ–W22ÄTeB¤ô”â66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W262ôâ62æ6ö×ç•ö–CÖ2æ–Bt„U$R2æ—5ö7F—fSÓu$õU%’2æ–Bõ$DU"%’2ææÖRÄ”Ô•BS"“¶f÷&V6‚‚G&÷w22F“ÓâbG"’G#Õ²F’³ÂG%²v–BuÒÂG%²væÖRuÒÂG%²vÖævW%öæÖRuÒÂG%²vÖævW%öÖö&–ÆRuÒÂG%²vÆæFÆ–æU÷†öæRuÓó¢G%²w†öæRuÒÂG%²vFG&W72uÒÂG%²vÆF—GVFRuÒÂG%²vÆöæv—GVFRuÒÂG%²w66†ööÅö6÷VçBuÒÂG%²w&Vv—7FW&VE÷66†ööÅö6÷VçBuÒÂG%²w&W&W6VçFF—fUö6÷VçBuÒÂG%²w7FGW2uÒÂ‚†–çB’G%²w&öf–ÆUö6ö×ÆWFRuÓò}Š­ª˜]¸Í˜Bs¢}˜mŠ}˜-‹Rr•Ó·Vç6WB‚G"“·ÖVÇ6W²F†VCÕ²}‹Šý¸Í˜rÂ}˜mŠ}ŠÝ¸Í˜rrÂ}‹M‹ªŠ¢rÂ}˜m˜‹’˜]Šý‹‹=˜rrÂ}˜]Šý‹‹=˜rrÂ}›í˜MŠ}ª’rÂ}˜m˜‹’Ší˜Šý‹˜‚rÂ}‹˜mªòŠí˜Šý‹˜‚rÂ}Š­Ší˜M˜Š}Š¢rÂ}‹=‹˜m‹M¸Í˜bŠÍ˜M˜‚rÂ}‹=‹˜m‹M¸Í˜b‹˜-Š‚rÂ}˜]ŠÍ˜]˜‹’‹=‹˜m‹M¸Í˜brÂ}˜m˜‹’‹Š}˜m˜mŠý˜rrÂ}˜‹m‹¸ÍŠ¢ªý˜Š}˜}¸Â‹]˜MŠ}ŠÝ¸ÍŠ¢rÂ}Š­Š}‹¸ÍŠârÂ}‹=Š}‹Š¢rÂ}˜]ŠÝ˜BŠ½ŠŠ¢Š­Ší˜M˜rÂ}Š­˜‹m¸ÍŠÝŠ}Š¢rÂ}ŠŠ}‹-‹‹2uÓ²G&÷w3ÔF#£¦ÆÂ‚%4TÄT5B’â¢Ç2ææÖR66†ööÅöæÖRÆ2ææÖR6ö×ç•öæÖRÅE$”Ò„4ôä4B„4ôÄU44R‡Ræf—'7EöæÖRÂrr’ÂrrÄ4ôÄU44R‡RæÆ7EöæÖRÂrr’’’–ç7V7F÷%öæÖRe$ôÒ66†ööÅ÷6W'f–6Uö–ç7V7F–öç2’ÄTeB¤ô”â66†ööÅ÷6W'f–6U÷66†ööÇ22ôâ2æ–CÖ’ç66†ööÅö–BÄTeB¤ô”â66†ööÅ÷6W'f–6Uö6ö×æ–W22ôâ2æ–CÖ’æ6ö×ç•ö–BÄTeB¤ô”âW6W'2RôâRæ–CÖ’æ–ç7V7F÷%÷W6W%ö–Bõ$DU"%’’æ–BDU42Ä”Ô•B#"“¶f÷&V6‚‚G&÷w22G"—²Gg3ÔF#£¦ÆÂ‚%4TÄT5BbçF—FÆRe$ôÒ66†ööÅ÷6W'f–6Uö–ç7V7F–öå÷f–öÆF–öç2‚¤ô”â66†ööÅ÷6W'f–6U÷f–öÆF–öå÷G—W2bôâbæ–C×‚çf–öÆF–öå÷G—Uö–Bt„U$R‚æ–ç7V7F–öåö–CÓò"Å²†–çB’G%²v–BuÕÒ“²G&÷w3%µÓÕ¶6÷VçB‚G&÷w3#óõµÒ’³ÂG%²vVGV6F–öæÅöF—7G&–7BuÒÂG%²v6ö×ç•öæÖRuÒÂG%²w66†ööÅövVæFW"uÒÂG%²w66†ööÅöæÖRuÒÇG&–Ò‚‚G%²wÆFU÷F‡&VRuÓóòrr’ârrâ‚G%²wÆFUöÆWGFW"uÓóòrr’ârrâ‚G%²wÆFU÷GvòuÓóòrr’ârŠ}¸Í‹Š}˜brâ‚G%²wÆFU÷&Vv–öåö6öFRuÓóòrr’’ÂG%²wfV†–6ÆU÷G—RuÒÂG%²wfV†–6ÆUö6öÆ÷"uÒÆ–×ÆöFR‚}ˆÂrÆ'&•ö6öÇVÖâ‚Gg2ÂwF—FÆRr’’ÂG%²w76VævW%ög&öçEö6÷VçBuÓóóÂG%²w76VævW%÷&V%ö6÷VçBuÓóóÂ‚G%²w76VævW%ö6÷VçBuÓóò‚†–çB’‚G%²w76VævW%ög&öçEö6÷VçBuÓóó’²†–çB’‚G%²w76VævW%÷&V%ö6÷VçBuÓóó’’’ÂG%²vG&—fW%övVæFW"uÒÂG%²v6W'F–f–6FU÷7FGW2uÒÂG%²wf–öÆF–öåöFFRuÒÂG%²wf–öÆF–öå÷F–ÖRuÒÂG%²vÆö6F–öå÷FW‡BuÒÂG%²vFW67&—F–öâuÒÂG%²v–ç7V7F÷%öæÖRuÕÓ·ÒG&÷w3ÒG&÷w3#óõµÓ·ÒG‡sÖæWr†Ç7…w&—FW"‚F†VB“¶f÷&V6‚‚G&÷w22G&÷r’G‡rÓæFE&÷r‚G&÷r“²G‡rÓæ÷WGWB‚}‹=‹˜¸Í‹5ý˜]ŠýŠ}‹‹5òrâGG—Rârç†Ç7‚rÂ}‹=‹˜¸Í‹2˜]ŠýŠ}‹‹2r“·ÒÆfÇ6RÃ“’“°§&÷WFR‚ttUBrÂrö’÷66†ööÂ×6W'f–6Rö6ö×æ–W2×vRrÆgVæ7F–öâ‚GÂF"ÂGR—µ÷77eöæVVB‚GRÂwf–Wrr“µ÷77e÷F&ÆW2‚“²GvSÖÖ‚ƒÂ†–çB’‚EôtUE²wvRuÓóó’“²G6—¦SÖÖ‚ƒÆÖ–âƒÂ†–çB’‚EôtUE²wvU÷6—¦RuÓóó#R’’“²GÕ÷77eöæ÷&Ò‚EôtUE²w6V&6‚uÓóòrr“²Gv†W&SÒGÓÒrsòut„U$R2æ—5ö7F—fSÓäB2ææÖRÄ”´Ròs¢ut„U$R2æ—5ö7F—fSÓs²F&w3ÒGÓÒrsõ²rRrâGârRuÓ¥µÓ²GF÷FÃÒ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒ66†ööÅ÷6W'f–6Uö6ö×æ–W22Gv†W&R"ÂF&w2•²vâuÓóó“²G&÷w3ÔF#£¦ÆÂ‚%4TÄT5B2æ–BÆ2ææÖRÆ2æÖævW%öæÖRÆ2æÖævW%öÖö&–ÆRÆ2æÆæFÆ–æU÷†öæRÆ2ç†öæRÆ2æFG&W72Æ2æÆF—GVFRÆ2æÆöæv—GVFRÆ2ç&Vv—7FW&VE÷66†ööÅö6÷VçBÆ2ç&W&W6VçFF—fUö6÷VçBÆ2ç7FGW2Æ2ç&öf–ÆUö6ö×ÆWFRÆ2æ—5ö7F—fRÄ4õTåB„D•5D”ä5B62ç66†ööÅö–B’66†ööÅö6÷VçBe$ôÒ66†ööÅ÷6W'f–6Uö6ö×æ–W22ÄTeB¤ô”â66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W262ôâ62æ6ö×ç•ö–CÖ2æ–BGv†W&Ru$õU%’2æ–Bõ$DU"%’2ææÖRÄ”Ô•BG6—¦Rôde4UB"â‚‚GvRÓ’¢G6—¦R’ÂF&w2“·&WGW&â²v—FV×2sÓâG&÷w2ÂwvRsÓâGvRÂwvU÷6—¦RsÓâG6—¦RÂwF÷FÂsÓâGF÷FÂÂwvW2sÓæÖ‚ƒÂ†–çB–6V–Â‚GF÷FÂòG6—¦R’•Ó·Ò“°§&÷WFR‚ttUBrÂrö’÷66†ööÂ×6W'f–6R÷66†ööÇ2×vRrÆgVæ7F–öâ‚GÂF"ÂGR—µ÷77eöæVVB‚GRÂwf–Wrr“µ÷77e÷F&ÆW2‚“µ÷77eöWF÷6VVE÷66†ööÇ2‚“²GvSÖÖ‚ƒÂ†–çB’‚EôtUE²wvRuÓóó’“²G6—¦SÖÖ‚ƒÆÖ–âƒÂ†–çB’‚EôtUE²wvU÷6—¦RuÓóó#R’’“²GÕ÷77eöæ÷&Ò‚EôtUE²w6V&6‚uÓóòrr“²FF—7G&–7CÕ÷77eöF—7G&–7Eö¶W’‚EôtUE²vF—7G&–7BuÓóòrr“²Gv†W&SÕ²sÓuÓ²F&w3ÕµÓ¶–b‚GÓÒrr—²Gv†W&UµÓÒr‡2ææÖRÄ”´Ròõ"2æ6öFRÄ”´Rò’s²F&w5µÓÒrRrâGârRs²F&w5µÓÒrRrâGârRs·Ö–b‚FF—7G&–7BÓÒrr—²Gv†W&UµÓÕ÷77eöF—7G&–7E÷7Â‚w2æVGV6F–öæÅöF—7G&–7Br’âsÓòs²F&w5µÓÕ÷77eöF—7G&–7Eöæ÷&ÖÆ—¦VB‚FF—7G&–7B“·ÒGsÖ–×ÆöFR‚räBrÂGv†W&R“²GF÷FÃÒ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒ66†ööÅ÷6W'f–6U÷66†ööÇ22t„U$RGr"ÂF&w2•²vâuÓóó“²G&÷w3ÔF#£¦ÆÂ‚%4TÄT5B2æ–BÇ2æ6öFRÇ2ææÖRÇ2æVGV6F–öæÅöF—7G&–7BÇ2ævVæFW"Ç2æFG&W72Ç2æÆF—GVFRÇ2æÆöæv—GVFRÇ2æÆö6F–öå÷&Vv—7FW&VEöBÇ2æ—5ö7F—fRÄu$õUô4ôä4B„D•5D”ä5B2ææÖRõ$DU"%’2ææÖR4U$Dõ"rÂr’6ö×ç•öæÖW2e$ôÒ66†ööÅ÷6W'f–6U÷66†ööÇ22ÄTeB¤ô”â66†ööÅ÷6W'f–6U÷66†ööÅö6ö×æ–W262ôâ62ç66†ööÅö–C×2æ–BÄTeB¤ô”â66†ööÅ÷6W'f–6Uö6ö×æ–W22ôâ2æ–C×62æ6ö×ç•ö–Bt„U$RGru$õU%’2æ–Bõ$DU"%’2ææÖRÄ”Ô•BG6—¦Rôde4UB"â‚‚GvRÓ’¢G6—¦R’ÂF&w2“·&WGW&â²v—FV×2sÓâG&÷w2ÂwvRsÓâGvRÂwvU÷6—¦RsÓâG6—¦RÂwF÷FÂsÓâGF÷FÂÂwvW2sÓæÖ‚ƒÂ†–çB–6V–Â‚GF÷FÂòG6—¦R’•Ó·Ò“°§&÷WFR‚ttUBrÂrö’÷66†ööÂ×6W'f–6Rö–ç7V7F–öç2×vRrÆgVæ7F–öâ‚GÂF"ÂGR—µ÷77eöæVVB‚GRÂwf–Wrr“µ÷77e÷F&ÆW2‚“²GvSÖÖ‚ƒÂ†–çB’‚EôtUE²wvRuÓóó’“²G6—¦SÖÖ‚ƒÆÖ–âƒÂ†–çB’‚EôtUE²wvU÷6—¦RuÓóó#R’’“²GÕ÷77eöæ÷&Ò‚EôtUE²w6V&6‚uÓóòrr“²Gv†W&SÕ²sÓuÓ²F&w3ÕµÓ¶–b‚GÓÒrr—²Gv†W&UµÓÒr‡2ææÖRÄ”´Ròõ"2ææÖRÄ”´Ròõ"’æÆö6F–öå÷FW‡BÄ”´Ròõ"4ôä4B†’çÆFU÷F‡&VRÆ’çÆFUöÆWGFW"Æ’çÆFU÷Gvò’Ä”´Rò’s¶'&•÷W6‚‚F&w2ÂrRrâGârRrÂrRrâGârRrÂrRrâGârRrÂrRrâGârRr“·ÒGsÖ–×ÆöFR‚räBrÂGv†W&R“²GF÷FÃÒ†–çB’„F#£¦öæR‚%4TÄT5B4õTåB‚¢’âe$ôÒ66†ööÅ÷6W'f–6Uö–ç7V7F–öç2’ÄTeB¤ô”â66†ööÅ÷6W'f–6U÷66†ööÇ22ôâ2æ–CÖ’ç66†ööÅö–BÄTeB¤ô”â66†ööÅ÷6W'f–6Uö6ö×æ–W22ôâ2æ–CÖ’æ6ö×ç•ö–Bt„U$RGr"ÂF&w2•²vâuÓóó“²G&÷w3ÔF#£¦ÆÂ‚%4TÄT5B’â¢Ç2ææÖR66†ööÅöæÖRÆ2ææÖR6ö×ç•öæÖRÅE$”Ò„4ôä4B„4ôÄU44R‡Ræf—'7EöæÖRÂrr’ÂrrÄ4ôÄU44R‡RæÆ7EöæÖRÂrr’’’–ç7V7F÷%öæÖRe$ôÒ66†ööÅ÷6W'f–6Uö–ç7V7F–öç2’ÄTeB¤ô”â66†ööÅ÷6W'f–6U÷66†ööÇ22ôâ2æ–CÖ’ç66†ööÅö–BÄTeB¤ô”â66†ööÅ÷6W'f–6Uö6ö×æ–W22ôâ2æ–CÖ’æ6ö×ç•ö–BÄTeB¤ô”âW6W'2RôâRæ–CÖ’æ–ç7V7F÷%÷W6W%ö–Bt„U$RGrõ$DU"%’’æ–BDU42Ä”Ô•BG6—¦Rôde4UB"â‚‚GvRÓ’¢G6—¦R’ÂF&w2“¶f÷&V6‚‚G&÷w22bG'"—²G'%²wÆFRuÓ×G&–Ò‚‚G'%²wÆFU÷F‡&VRuÓóòrr’ârrâ‚G'%²wÆFUöÆWGFW"uÓóòrr’ârrâ‚G'%²wÆFU÷GvòuÓóòrr’ârŠ}¸Í‹Š}˜br“²G'%²wf–öÆF–öç2uÓÖ'&•ö6öÇVÖâ„F#£¦ÆÂ‚%4TÄT5BbçF—FÆRe$ôÒ66†ööÅ÷6W'f–6Uö–ç7V7F–öå÷f–öÆF–öç2‚¤ô”â66†ööÅ÷6W'f–6U÷f–öÆF–öå÷G—W2bôâbæ–C×‚çf–öÆF–öå÷G—Uö–Bt„U$R‚æ–ç7V7F–öåö–CÓò"Å²†–çB’G'%²v–BuÕÒ’ÂwF—FÆRr“·×Vç6WB‚G'"“·&WGW&â²v—FV×2sÓâG&÷w2ÂwvRsÓâGvRÂwvU÷6—¦RsÓâG6—¦RÂwF÷FÂsÓâGF÷FÂÂwvW2sÓæÖ‚ƒÂ†–çB–6V–Â‚GF÷FÂòG6—¦R’•Ó·Ò“°§&÷WFR‚ttUBrÂrö’÷66†ööÂ×6W'f–6Rö6öæf–rrÆgVæ7F–öâ‚GÂF"ÂGR—µ÷77eöæVVB‚GRÂwf–Wrr“µ÷77e÷F&ÆW2‚“¶–b‚÷77e÷W&Ò‚GRÂvVF—Br’”‡GG£¦W'&÷"‚}Šý‹=Š­‹‹=¸Â˜]Šý¸Í‹¸ÍŠ¢Š­˜m‹¸Í˜]Š}Š¢˜mŠýŠ}‹¸ÍŠòrÃC2“·&WGW&â²vF—7G&–7G2sÓäF#£¦ÆÂ‚%4TÄT5B¢e$ôÒ66†ööÅ÷6W'f–6UöF—7G&–7G2õ$DU"%’6÷'Eö÷&FW"Æ–B"’ÂwfV†–6ÆU÷G—W2sÓäF#£¦ÆÂ‚%4TÄT5B¢e$ôÒ66†ööÅ÷6W'f–6U÷fV†–6ÆU÷G—W2õ$DU"%’6÷'Eö÷&FW"Æ–B"’ÂwfV†–6ÆUö6öÆ÷'2sÓäF#£¦ÆÂ‚%4TÄT5B¢e$ôÒ66†ööÅ÷6W'f–6U÷fV†–6ÆUö6öÆ÷'2õ$DU"%’6÷'Eö÷&FW"Æ–B"•Ó·Ò“°§&÷WFR‚uõ5BrÂrö’÷66†ööÂ×6W'f–6Rö6öæf–rrÆgVæ7F–öâ‚GÂF"ÂGR—µ÷77eöæVVB‚GRÂvVF—Br“µ÷77e÷F&ÆW2‚“²GG—SÒ‡7G&–ær’‚F%²wG—RuÓóòrr“²GF—FÆSÕ÷77eöæ÷&Ò‚F%²wF—FÆRuÓóòrr“¶–b‚–åö'&’‚GG—RÅ²vF—7G&–7BrÂwfV†–6ÆU÷G—RrÂwfV†–6ÆUö6öÆ÷"uÒÇG'VR—ÇÂGF—FÆSÓÓÒrr”‡GG£¦W'&÷"‚}˜m˜‹’¸ÍŠr‹˜m˜Š}˜bŠ­˜m‹¸Í˜R˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÃC#"“¶–b‚GG—SÓÓÒvF—7G&–7Br—²GF—FÆSÕ÷77eöF—7G&–7Eö¶W’‚GF—FÆR“¶–b‚÷77e÷fÆ–EöF—7G&–7B‚GF—FÆR’”‡GG£¦W'&÷"‚}˜mŠ}ŠÝ¸Í˜r˜˜-‹r˜]¸Î(ÍŠ­˜Š}˜mŠò¸Íª¸ÂŠ}‹"˜]˜-Š}Šý¸Í‹‹‹=˜]¸Â»Š­Šr»r¸ÍŠrŠ­ŠŠ}ŠýªŠ}˜bŠŠ}‹MŠòârÃC#"“·ÒGF&ÆSÕ²vF—7G&–7BsÓâw66†ööÅ÷6W'f–6UöF—7G&–7G2rÂwfV†–6ÆU÷G—RsÓâw66†ööÅ÷6W'f–6U÷fV†–6ÆU÷G—W2rÂwfV†–6ÆUö6öÆ÷"sÓâw66†ööÅ÷6W'f–6U÷fV†–6ÆUö6öÆ÷'2uÕ²GG—UÓ´F#£§'Vâ‚$”å4U%B”åDòGF&ÆR‡F—FÆRÇ6÷'Eö÷&FW"’dÅTU2ƒòÃò’ôâEUÄ”4DR´U’UDDR—5ö7F—fSÓ"Å²GF—FÆRÂ†–çB’‚F%²w6÷'Eö÷&FW"uÓóó“’•Ò“·&WGW&â²vö²sÓçG'VUÓ·Ò“°§&÷WFR‚tDTÄUDRrÂrö’÷66†ööÂ×6W'f–6Rö6öæf–rrÆgVæ7F–öâ‚GÂF"ÂGR—µ÷77eöæVVB‚GRÂvVF—Br“µ÷77e÷F&ÆW2‚“²GG—SÒ‡7G&–ær’‚EôtUE²wG—RuÓóòrr“²F–CÒ†–çB’‚EôtUE²v–BuÓóó“²GF&ÆSÕ²vF—7G&–7BsÓâw66†ööÅ÷6W'f–6UöF—7G&–7G2rÂwfV†–6ÆU÷G—RsÓâw66†ööÅ÷6W'f–6U÷fV†–6ÆU÷G—W2rÂwfV†–6ÆUö6öÆ÷"sÓâw66†ööÅ÷6W'f–6U÷fV†–6ÆUö6öÆ÷'2uÕ²GG—UÓóòrs¶–b‚GF&ÆWÇÂF–B”‡GG£¦W'&÷"‚}Š­˜m‹¸Í˜R˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÃC#"“´F#£§'Vâ‚%UDDRGF&ÆR4UB—5ö7F—fSÓt„U$R–CÓò"Å²F–EÒ“·&WGW&â²vö²sÓçG'VUÓ·Ò“°§&÷WFR‚ttUBrÂrö’÷66†ööÂ×6W'f–6R÷W&Ö—76–öç2rÆgVæ7F–öâ‚GÂF"ÂGR—µ÷77eöæVVB‚GRÂwf–Wrr“µ÷77e÷F&ÆW2‚“¶–b†V×G’‚GU²v—5öFÖ–âuÒ’bb–åö'&’‚‚GU²w&öÆU÷F—FÆRuÓóòrr’Å²}˜]Šý¸Í‹ª˜BrÂ}‹¸Í¸Í‹2Š}ŠýŠ}‹˜rŠŠ}‹-‹‹=¸ÂrÂ}˜m¸Í‹˜¸ÂŠ}ŠýŠ}‹¸ÂŠ}‹‹MŠòuÒÇG'VR’”‡GG£¦W'&÷"‚}˜˜-‹r˜]Šý¸Í‹‹=Š}˜]Š}˜m˜r˜]¸Î(ÍŠ­˜Š}˜mŠòŠý‹=Š­‹‹=¸Î(Í˜}Šr‹Šr˜]Šý¸Í‹¸ÍŠ¢ª˜mŠòârÃC2“²G&÷w3ÔF#£¦ÆÂ‚%4TÄT5B"æ–BÇ"çF—FÆRÇ"æÆWfVÂÄ4ôÄU44R‡æ6å÷f–WrÃ’6å÷f–WrÄ4ôÄU44R‡æ6åö7&VFRÃ’6åö7&VFRÄ4ôÄU44R‡æ6åöVF—BÃ’6åöVF—BÄ4ôÄU44R‡æ6åöFVÆWFRÃ’6åöFVÆWFRÄ4ôÄU44R‡æ6åö–×÷'BÃ’6åö–×÷'BÄ4ôÄU44R‡æ6å÷&W÷'BÃ’6å÷&W÷'Be$ôÒ&öÆW2"ÄTeB¤ô”â66†ööÅ÷6W'f–6U÷W&Ö—76–öç2ôâç&öÆUö–C×"æ–Bõ$DU"%’"æÆWfVÂÇ"çF—FÆR"“·&WGW&â²v—FV×2sÓâG&÷w5Ó·Ò“°§&÷WFR‚uõ5BrÂrö’÷66†ööÂ×6W'f–6R÷W&Ö—76–öç2÷·&öÆUö–GÒrÆgVæ7F–öâ‚GÂF"ÂGR—µ÷77eöæVVB‚GRÂwf–Wrr“µ÷77e÷F&ÆW2‚“¶–b†V×G’‚GU²v—5öFÖ–âuÒ’bb–åö'&’‚‚GU²w&öÆU÷F—FÆRuÓóòrr’Å²}˜]Šý¸Í‹ª˜BrÂ}‹¸Í¸Í‹2Š}ŠýŠ}‹˜rŠŠ}‹-‹‹=¸ÂrÂ}˜m¸Í‹˜¸ÂŠ}ŠýŠ}‹¸ÂŠ}‹‹MŠòuÒÇG'VR’”‡GG£¦W'&÷"‚}˜˜-‹r˜]Šý¸Í‹‹=Š}˜]Š}˜m˜r˜]¸Î(ÍŠ­˜Š}˜mŠòŠý‹=Š­‹‹=¸Î(Í˜}Šr‹Šr˜]Šý¸Í‹¸ÍŠ¢ª˜mŠòârÃC2“²G&–CÒ†–çB’G²w&öÆUö–BuÓ¶–b‚F#£¦öæR‚%4TÄT5B–Be$ôÒ&öÆW2t„U$R–CÓò"Å²G&–EÒ’”‡GG£¦W'&÷"‚}‹=˜]Š¢˜mŠ}˜]‹Š­Š‹Š}‹=Š¢rÃC#"“²GfÇ3ÕµÓ¶f÷&V6‚…²wf–WrrÂv7&VFRrÂvVF—BrÂvFVÆWFRrÂv–×÷'BrÂw&W÷'BuÒ2F²’GfÇ5²FµÓÒV×G’‚F%²v6åòrâFµÒ“ó£´F#£§'Vâ‚$”å4U%B”åDò66†ööÅ÷6W'f–6U÷W&Ö—76–öç2‡&öÆUö–BÆ6å÷f–WrÆ6åö7&VFRÆ6åöVF—BÆ6åöFVÆWFRÆ6åö–×÷'BÆ6å÷&W÷'B’dÅTU2ƒòÃòÃòÃòÃòÃòÃò’ôâEUÄ”4DR´U’UDDR6å÷f–WsÕdÅTU2†6å÷f–Wr’Æ6åö7&VFSÕdÅTU2†6åö7&VFR’Æ6åöVF—CÕdÅTU2†6åöVF—B’Æ6åöFVÆWFSÕdÅTU2†6åöFVÆWFR’Æ6åö–×÷'CÕdÅTU2†6åö–×÷'B’Æ6å÷&W÷'CÕdÅTU2†6å÷&W÷'B’"Å²G&–BÂGfÇ5²wf–WruÒÂGfÇ5²v7&VFRuÒÂGfÇ5²vVF—BuÒÂGfÇ5²vFVÆWFRuÒÂGfÇ5²v–×÷'BuÒÂGfÇ5²w&W÷'BuÕÒ“·&WGW&â²vö²sÓçG'VUÓ·ÒÆfÇ6RÃ“’“°  §G'’°¢&WV—&Uööæ6RõôD•%õòâr÷66†ööÅ÷6W'f–6U÷&÷WFW5öW‡G&ç‡s°§Ò6F6‚…F‡&÷v&ÆRFR’°¢òòf–ÇW&R–âF†R÷F–öæÂ66†ööÂ×6W'f–6RW‡FVç6–öâ×W7BæWfW"F¶RF÷và¢òòWF†VçF–6F–öâÂV&Æ–26WGF–æw2Â†VÇF‚Â÷"F†R&W7BöbF†R’à¢W'&÷%öÆör‚w66†ööÂ×6W'f–6R&÷WFW2&ö÷G7G&f–ÆVC¢râFRÓævWDÖW76vR‚’ârræ&6VæÖR‚FRÓævWDf–ÆR‚’’âs¢râFRÓævWDÆ–æR‚’“°§Ð ¢òò$Tt”â4Ä”TåB5$4‚$Uõ%E0¢ò¢¢WF†VçF–6FVBæG&ö–BõtF–væ÷7F–2&W÷'G2âæWfW"&WF–âF†R&r&WVW7B&öG’â¢ð¦6Æ727&6…&W÷'G2°¢7FF–2gVæ7F–öâ6ÆVâ‚GfÇVRÂFÆ–Ö—CÓc’°¢GFW‡CÖ—5÷66Æ"‚GfÇVR“ò‡7G&–ær’GfÇVS¢rs°¢GFW‡C×&Vu÷&WÆ6R‚rô&V&W%Ç2µµåÇ2%ÂsÃåÒ²ö’rÂt&V&W"·&VF7FVEÒrÂGFW‡B“°¢GFW‡C×&Vu÷&WÆ6R‚rò‚ƒó§77v÷&GÆWF†÷&—¦F–öçÆ66W75÷Fö¶VçÇ&Vg&W6…÷Fö¶VçÇFö¶VçÇ6V7&WGÆ•ö¶W’•²%ÂuÓõÇ2¥³£ÕÕÇ2¥²%ÂuÓò•µåÇ2b%ÂrÇÕÒ²ö’rÂrC·&VF7FVEÒrÂGFW‡B“°¢&WGW&âÖ%÷7V'7G"‚GFW‡BÃÂFÆ–Ö—B“°¢Ð¢7FF–2gVæ7F–öâ–ÆöB‚F&öG’’°¢–b‚—5ö'&’‚F&öG’’”‡GG£¦W'&÷"‚}ªý‹-Š}‹‹B˜]‹Š­Š‹˜m¸Í‹=Š¢rÃC#"“°¢FVæ6öFVCÖ§6öåöVæ6öFR‚F&öG’Ä¥4ôåõTäU44TEõTä”4ôDWÄ¥4ôåô”ådÄ”EõUDc…õ5T%5D•EUDR“°¢–b‡7G&ÆVâ‚FVæ6öFVB“ãcSS3b”‡GG£¦W'&÷"‚}ŠÝŠÍ˜Rªý‹-Š}‹‹BŠ¸Í‹BŠ}‹"»m»Bª¸Í˜M˜ŠŠ}¸ÍŠ¢Š}‹=Š¢rÃC2“°¢F–CÒ‡7G&–ær’‚F&öG•²v–BuÓóòrr“°¢–b‚&VuöÖF6‚‚rõå´Õ¦×£Ó•òÕ×³Ã“gÒBòrÂF–B’”‡GG£¦W'&÷"‚}‹M˜mŠ}‹=˜rªý‹-Š}‹‹B˜]‹Š­Š‹˜m¸Í‹=Š¢rÃC#"“°¢F÷WCÕ²v–BsÓâF–EÓ°¢f÷&V6‚…²vÖW76vRsÓãcÂw7F6²sÓã#Âv6ö×öæVçE÷7F6²sÓãcÂw&÷WFRsÓãcÂwÆFf÷&ÒsÓã3Âv÷fW'6–öâsÓãcÂv'V–ÆE÷fW'6–öâsÓãcÂvæG&ö–E÷fW'6–öâsÓãcÂvFWf–6UöÖöFVÂsÓãcÂvÖçVf7GW&W"sÓãÂwG—RsÓãCÒ2Ff–VÆCÓâFÆ–Ö—B’F÷WE²Ff–VÆEÓ×6VÆc£¦6ÆVâ‚F&öG•²Ff–VÆEÓóòrrÂFÆ–Ö—B“°¢–b‡G&–Ò‚F÷WE²vÖW76vRuÒ“ÓÓÒrr”‡GG£¦W'&÷"‚}‹M‹ŠÒŠí‹}ŠrŠ}˜M‹-Š}˜]¸ÂŠ}‹=Š¢rÃC#"“°¢F÷WE²vfFÂuÓÒV×G’‚F&öG•²vfFÂuÒ“°¢òò†VFW'2Â&WVW7B&öF–W2ÂÆ7Eö’æB6Æ–VçB×6VÆV7FVBW6W%ö–B&RFVÆ–&W&FVÇ’W†6ÇVFVBà¢&WGW&âF÷WC°¢Ð¢7FF–2gVæ7F–öâ66†VÖ‚’°¢F#£§'Vâ‚$5$TDRD$ÄR”bäõBU„•5E26Æ–VçEö7&6…÷&W÷'G2€¢–B$”t”åBTå4”täTBUDõô”ä5$TÔTåB$”Ô%’´U’ÇW6W%ö–B”åBäõBåTÄÂÀ¢6Æ–VçEö–Bd$4„"ƒ“b’4„$5DU"4UB66–’4ôÄÄDR66–•ö&–âäõBåTÄÂÀ¢–ÆöEö§6öâÔTD•TÕDU…BäõBåTÄÂÆ7&VFVEöBDDUD”ÔRäõBåTÄÂDTdTÅB5U%$TåEõD”ÔU5DÕÀ¢Tä•TR´U’W6W%ö6Æ–VçE÷&W÷'B‡W6W%ö–BÆ6Æ–VçEö–B’Ä”äDU‚W6W%÷&W÷'E÷F–ÖR‡W6W%ö–BÆ7&VFVEöB¢’Tät”äSÔ–ææôD"DTdTÅB4„%4UC×WFc†Ö#B4ôÄÄDS×WFc†Ö#E÷Væ–6öFUö6’"“°¢Ð¢7FF–2gVæ7F–öâ6fR‚F&öG’ÂGW6W"’°¢FFF×6VÆc£§–ÆöB‚F&öG’“·6VÆc£§66†VÖ‚“²GV–CÒ†–çB’GW6W%²v–BuÓ°¢FW†—7F–æsÔF#£¦öæR‚u4TÄT5B–Be$ôÒ6Æ–VçEö7&6…÷&W÷'G2t„U$RW6W%ö–CÓòäB6Æ–VçEö–CÓòrÅ²GV–BÂFFF²v–BuÕÒ“°¢–b‚FW†—7F–ær—&WGW&â²vö²sÓçG'VRÂv–BsÓâ†–çB’FW†—7F–æu²v–BuÒÂvGWÆ–6FRsÓçG'VUÓ°¢F6÷VçCÔF#£¦öæR‚u4TÄT5B4õTåB‚¢’âe$ôÒ6Æ–VçEö7&6…÷&W÷'G2t„U$RW6W%ö–CÓòäB7&VFVEöCãÔDDUõ5T"„äõr‚’Ä”åDU%dÂÔ”åUDR’rÅ²GV–EÒ“°¢–b‚†–çB’‚F6÷VçE²vâuÓóó“ãÓ3”‡GG£¦W'&÷"‚}Š­‹ŠýŠ}Šòªý‹-Š}‹‹N(Í˜}Šr‹-¸ÍŠ}ŠòŠ}‹=Š­‰²¨m˜mŠòŠý˜-¸Í˜-˜rŠ‹ŠòŠ­˜MŠ}‹Bª˜m¸ÍŠòrÃC#’“°¢F#£§'Vâ‚t”å4U%B”åDò6Æ–VçEö7&6…÷&W÷'G2‡W6W%ö–BÆ6Æ–VçEö–BÇ–ÆöEö§6öâ’dÅTU2ƒòÃòÃò’ôâEUÄ”4DR´U’UDDR–CÔÄ5Eô”å4U%Eô”B†–B’rÅ²GV–BÂFFF²v–BuÒÆ§6öåöVæ6öFR‚FFFÄ¥4ôåõTäU44TEõTä”4ôDWÄ¥4ôåô”ådÄ”EõUDc…õ5T%5D•EUDR•Ò“°¢G&÷sÔF#£¦öæR‚u4TÄT5B–Be$ôÒ6Æ–VçEö7&6…÷&W÷'G2t„U$RW6W%ö–CÓòäB6Æ–VçEö–CÓòrÅ²GV–BÂFFF²v–BuÕÒ“°¢–b‚G&÷r”‡GG£¦W'&÷"‚}‹Ší¸Í‹˜rªý‹-Š}‹‹BŠ­Š=¸Í¸ÍŠò˜m‹MŠòrÃS“°¢&WGW&â²vö²sÓçG'VRÂv–BsÓâ†–çB’G&÷u²v–BuÒÂvGWÆ–6FRsÓæfÇ6UÓ°¢Ð§Ð§&÷WFR‚uõ5BrÂrö’ö7&6‚×&W÷'G2rÆfâ‚GÂF"ÂGR“Óä7&6…&W÷'G3£§6fR‚F"ÂGR’“°¢òòTäB4Ä”TåB5$4‚$Uõ%E0