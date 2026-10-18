<?php
/* خطیار — درج امن و idempotent تعطیلات رسمی مرجع */
ini_set('display_errors','0');
date_default_timezone_set('Asia/Tehran');
$ROOT=__DIR__.'/../../';
require_once "$ROOT/lib/Db.php";
require_once "$ROOT/lib/Jwt.php";
require_once "$ROOT/lib/Http.php";
require_once "$ROOT/lib/IranCalendar.php";
$CONFIG=require "$ROOT/config.php";
function hs_json($v,$s=200){http_response_code($s);header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');header('Pragma: no-cache');echo json_encode($v,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;}
function hs_digits($v){return strtr((string)$v,['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9']);}
function hs_table_cols($table){static $cache=[];$key=strtolower($table);if(isset($cache[$key]))return$cache[$key];$rows=Db::all('SHOW COLUMNS FROM `'.$table.'`');$out=[];foreach($rows as $r)$out[strtolower((string)$r['Field'])]=true;return$cache[$key]=$out;}
function hs_auth(){global $CONFIG;$tok=Http::bearer();$p=$tok?Jwt::verify($tok,$CONFIG['jwt_secret']):null;if(!$p||empty($p['sub']))hs_json(['error'=>'توکن نامعتبر یا منقضی است'],401);$uc=hs_table_cols('users');$rc=hs_table_cols('roles');$select=['u.id','u.is_active'];if(!empty($uc['is_admin']))$select[]='u.is_admin';if(!empty($rc['is_admin']))$select[]='r.is_admin AS role_is_admin';if(!empty($rc['title']))$select[]='r.title AS role_title';$sql='SELECT '.implode(',',$select).' FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.id=? LIMIT 1';$u=Db::one($sql,[$p['sub']]);if(!$u||!(int)$u['is_active'])hs_json(['error'=>'کاربر نامعتبر است'],401);$title=(string)($u['role_title']??'');$allowed=!empty($u['is_admin'])||!empty($u['role_is_admin'])||in_array($title,['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد','admin','superadmin'],true);if(!$allowed)hs_json(['error'=>'دسترسی مدیریتی لازم است'],403);return$u;}
function hs_cols(){static $c=null;if($c!==null)return$c;$rows=Db::all('SHOW COLUMNS FROM holidays');$c=[];foreach($rows as $r)$c[strtolower((string)$r['Field'])]=true;return$c;}
function hs_ensure_table(){Db::query("CREATE TABLE IF NOT EXISTS holidays (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,jdate VARCHAR(10) NOT NULL,title VARCHAR(500) NOT NULL,source VARCHAR(40) NULL,is_official TINYINT(1) NOT NULL DEFAULT 0,created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY(id),KEY idx_holidays_jdate(jdate)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");$c=hs_cols();if(empty($c['jdate']))Db::query("ALTER TABLE holidays ADD COLUMN jdate VARCHAR(10) NULL");if(empty($c['title']))Db::query("ALTER TABLE holidays ADD COLUMN title VARCHAR(500) NULL");$c=hs_cols();if(empty($c['source'])){try{Db::query("ALTER TABLE holidays ADD COLUMN source VARCHAR(40) NULL");}catch(Throwable $e){}}if(empty($c['is_official'])){try{Db::query("ALTER TABLE holidays ADD COLUMN is_official TINYINT(1) NOT NULL DEFAULT 0");}catch(Throwable $e){}}$c=hs_cols();if(empty($c['jdate'])||empty($c['title']))throw new RuntimeException('ساختار جدول holidays قابل استفاده نیست (jdate/title)');}
$stage='شروع';
try{$stage='احراز هویت مدیریتی';hs_auth();$stage='تعیین سال';$y=(int)hs_digits($_GET['year']??$_POST['year']??'');if($y<1390||$y>1500)$y=(int)date('Y')-621;$stage='آماده‌سازی جدول تعطیلات';hs_ensure_table();$stage='دریافت تعطیلات رسمی سال '.$y;$events=IranCalendar::events($y);$official=[];foreach($events as $j=>$e)if(!empty($e['is_holiday']))$official[$j]=trim((string)($e['title']??'تعطیل رسمی'));if(!$official)hs_json(['ok'=>false,'error'=>'فهرست تعطیلات رسمی برای این سال موجود نیست','year'=>$y],422);
// Do not reconcile/delete existing holidays against incomplete third-party feeds.
// Fixed-date nationwide holidays must all be present for any Iranian calendar year.
$mandatory=['01-01','01-02','01-03','01-04','01-12','01-13','03-14','03-15','11-22','12-29'];
$missing=[];foreach($mandatory as $suffix){$date=$y.'-'.$suffix;if(!isset($official[$date]))$missing[]=$date;}
if($missing || count($official)<15){
  hs_json(['ok'=>false,'error'=>'فهرست دریافتی تعطیلات رسمی ناقص است؛ برای جلوگیری از تغییر اشتباه داده‌ها هیچ رکوردی جایگزین نشد','year'=>$y,'missing_required'=>$missing,'count'=>count($official)],422);
}
$cols=hs_cols();$sourceCol=!empty($cols['source'])?'source':null;$officialCol=!empty($cols['is_official'])?'is_official':(!empty($cols['official'])?'official':null);// Prune stale official seed records for this year before inserting the verified set.
$removed=0;
$where=[];
if($sourceCol)$where[]="`$sourceCol` IN ('official','official-reference','official-service')";
if($officialCol)$where[]="`$officialCol`=1";
if($where){
  foreach(Db::all('SELECT id,jdate FROM holidays WHERE (jdate LIKE ? OR jdate LIKE ?) AND ('.implode(' OR ',$where).')',[$y.'-%',$y.'/%%']) as $row){
    $normalized=IranCalendar::normalize($row['jdate']??'');
    if(!$normalized || !array_key_exists($normalized,$official)){
      Db::query('DELETE FROM holidays WHERE id=?',[(int)$row['id']]);
      $removed++;
    }
  }
}
// One-time reconciliation of known 1405 legacy auto-generated dates that do not
// belong in Mashhad's authoritative 1405 holiday calendar. Do not remove any
// explicit manually classified rows or arbitrary custom closures.
$legacyRemoved=0;
if($y===1405 && $sourceCol){
  $knownWrongDates=['01-22','01-25','02-25','03-05','03-31','04-08','04-29','04-30','06-07','06-15','06-17','06-25','07-05','11-03'];
  $legacyPattern='/عید|تاسوعا|عاشورا|اربعین|شهادت|ولادت|میلاد|مبعث|رحلت|نوروز|قیام/u';
  foreach(Db::all('SELECT id,jdate,title,source'.($officialCol?',`'.$officialCol.'` AS official_flag':'').' FROM holidays WHERE jdate LIKE ? OR jdate LIKE ?',[$y.'-%',$y.'/%%']) as $oldHoliday){
    $date=IranCalendar::normalize($oldHoliday['jdate']??'');
    $oldSource=strtolower(trim((string)($oldHoliday['source']??'')));
    if(in_array($oldSource,['manual','custom','user'],true))continue;
    if($officialCol && (int)($oldHoliday['official_flag']??0)===1)continue;
    if(!in_array($oldSource,['','legacy','seed','calendar','automatic'],true))continue;
    $suffix=$date?substr($date,5):'';
    $isWrong=in_array($suffix,$knownWrongDates,true)&&!isset($official[$date])&&preg_match($legacyPattern,(string)($oldHoliday['title']??''));
    $isTehran=in_array($suffix,['04-13','04-16'],true)&&stripos((string)($oldHoliday['title']??''),'تهران')!==false;
    if($isWrong||$isTehran){
      Db::run('DELETE FROM holidays WHERE id=?',[(int)$oldHoliday['id']]);
      $legacyRemoved++;
    }
  }
}
$inserted=0;$updated=0;$existing=0;$details=[];foreach($official as $j=>$title){$stage='بررسی '.$j;$old=Db::one('SELECT id,title'.($sourceCol?',source':'').($officialCol?',`'.$officialCol.'`':'').' FROM holidays WHERE jdate IN (?,?) ORDER BY id LIMIT 1',[$j,str_replace('-','/',$j)]);if($old){$existing++;$oldTitle=trim((string)($old['title']??''));$newTitle=$title;$set=[];$args=[];if($newTitle!==$oldTitle){$set[]='title=?';$args[]=$newTitle;}if($sourceCol){$set[]='`'.$sourceCol.'`=?';$args[]='official';}if($officialCol){$set[]='`'.$officialCol.'`=?';$args[]=1;}if($set){$args[]=$old['id'];Db::query('UPDATE holidays SET '.implode(',',$set).' WHERE id=?',$args);$updated++;}$details[]=['jdate'=>$j,'status'=>'existing','title'=>$newTitle];}else{$fields=['jdate','title'];$vals=[$j,$title];if($sourceCol){$fields[]=$sourceCol;$vals[]='official';}if($officialCol){$fields[]=$officialCol;$vals[]=1;}$qs=implode(',',array_fill(0,count($vals),'?'));Db::query('INSERT INTO holidays (`'.implode('`,`',$fields).'`) VALUES ('.$qs.')',$vals);$inserted++;$details[]=['jdate'=>$j,'status'=>'inserted','title'=>$title];}}
// Remove only duplicate rows that are positively identified as official imports.
// Never collapse or delete explicitly manual/custom holidays.
$duplicatesRemoved=0;
if($sourceCol || $officialCol){
  $officialIds=[];
  $candidateRows=Db::all('SELECT id,jdate'.($sourceCol?',`'.$sourceCol.'` AS holiday_source':'').($officialCol?',`'.$officialCol.'` AS official_flag':'').' FROM holidays WHERE jdate LIKE ? OR jdate LIKE ? ORDER BY id',[$y.'-%',$y.'/%%']);
  foreach($candidateRows as $candidate){
    $key=IranCalendar::normalize($candidate['jdate']??'');
    if(!$key || !isset($official[$key]))continue;
    $source=strtolower(trim((string)($candidate['holiday_source']??'')));
    $explicitManual=in_array($source,['manual','custom','user'],true);
    $taggedOfficial=in_array($source,['official','official-reference','official-service'],true)||($officialCol&&(int)($candidate['official_flag']??0)===1);
    if($explicitManual || !$taggedOfficial)continue;
    if(!isset($officialIds[$key])){$officialIds[$key]=(int)$candidate['id'];continue;}
    Db::run('DELETE FROM holidays WHERE id=?',[(int)$candidate['id']]);
    $duplicatesRemoved++;
  }
}
hs_json(['ok'=>true,'duplicates_removed'=>$duplicatesRemoved,'year'=>$y,'total'=>count($official),'inserted'=>$inserted,'updated'=>$updated,'existing'=>$existing,'removed'=>$removed,'legacy_removed'=>$legacyRemoved,'details'=>$details]);}catch(Throwable $e){error_log('admin-holiday-seed: stage='.$stage.' '.$e->getMessage().' @ '.$e->getFile().':'.$e->getLine());$detail=$e->getMessage();if($detail==='')$detail=get_class($e);hs_json(['ok'=>false,'error'=>'خطای داخلی در درج تعطیلات رسمی','stage'=>$stage,'detail'=>$detail],500);}
