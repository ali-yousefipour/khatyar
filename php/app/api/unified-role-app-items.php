<?php
/** Unified Role App Items source of truth. */
require_once __DIR__ . '/../../lib/Db.php';
require_once __DIR__ . '/../../lib/Jwt.php';
require_once __DIR__ . '/../../lib/Http.php';
$CONFIG = require __DIR__ . '/../../config.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

function kh_table_exists($t){
  static $c=[];
  if(isset($c[$t])) return $c[$t];
  try{$r=Db::one("SELECT COUNT(*) c FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?",[$t]);return $c[$t]=((int)($r['c']??0)>0);}catch(Throwable $e){return $c[$t]=false;}
}
function kh_column_exists($t,$col){
  static $c=[]; $k=$t.'.'.$col;
  if(isset($c[$k])) return $c[$k];
  try{$r=Db::one("SELECT COUNT(*) c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?",[$t,$col]);return $c[$k]=((int)($r['c']??0)>0);}catch(Throwable $e){return $c[$k]=false;}
}
function kh_auth_user(){
  global $CONFIG;
  $tok=Http::bearer();
  $p=$tok?Jwt::verify($tok,$CONFIG['jwt_secret']):null;
  if(!$p||empty($p['sub'])) Http::error('توکن منقضی یا نامعتبر است',401);
  Http::$currentToken=$tok;
  $u=Db::one("SELECT u.id,u.username,u.first_name,u.last_name,u.role_id,r.title role_title,r.level,r.is_admin,u.is_active,u.email,u.photo,u.photo_path FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.id=? LIMIT 1",[$p['sub']]);
  if(!$u||!(int)$u['is_active']) Http::error('کاربر نامعتبر',401);
  // نشست دستگاه فقط وقتی بررسی می‌شود که ساختار جدول نشست کامل باشد؛ این موضوع نباید باعث شود
  // صفحه تنظیمات سمت‌ها به‌جای JSON، خطای دیتابیس/HTML دریافت کند.
  if(kh_table_exists('user_sessions') && kh_column_exists('user_sessions','device_type') && kh_column_exists('user_sessions','device_id') && kh_column_exists('user_sessions','revoked_at')){
    $dt=$p['dt']??'web';
    $s=Db::one("SELECT device_id,revoked_at FROM user_sessions WHERE user_id=? AND device_type=? ORDER BY id DESC LIMIT 1",[$u['id'],$dt]);
    $unlimited=in_array((string)$u['role_title'],['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد','admin','superadmin'],true)||!empty($u['is_admin']);
    if(!$s||$s['revoked_at']||(!$unlimited&&(string)$s['device_id']!==(string)($p['device_id']??''))) Http::error('نشست منقضی یا باطل شده است',401);
  }
  return $u;
}
function kh_is_admin($u){return !empty($u['is_admin'])||in_array((string)($u['role_title']??''),['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد','admin','superadmin'],true);}
const KH_LINE_LOCATION='LineLocation';
const KH_STATION_CAPTURE='StationCapture';
const KH_MY_STATIONS='MyStations';
const KH_LINE_VISIT='LineVisitProgram';
$allItems=['Search','Driver','Vehicle','PersonnelVehicle','PersonnelMotorcycle','PersonnelVehicleManagement','PersonnelVehicleChecklist','Debt','Checklist','Notice','Reports','Sms','BotMessages','Requests','RequestInbox','WorkSummary','SalarySlips','CompanyRequests','Subscription','CheckIn','Forms','Cultural','Welfare','TempDrivers','Notifications','FieldAlerts','ActivityReport','ExpInsurance','ExpTaxi','ExpOplic','TeamReport','InboxReports','ReportDetail','OfficialPresence','Inventory','Messages','Attendance','PastNotices','PastChecklists','DriverSms','MySms','CustomFields','Outage','Profile','ChangePassword','EditProfile','MapSettings','ExpiryNotificationSettings','FieldAlertSettings','ImportTimes','AppLockSettings','CrashReports',KH_LINE_VISIT,KH_LINE_LOCATION,'MyDailyMission','RoleDashboard','Leaderboard','Radio','Help',KH_STATION_CAPTURE,KH_MY_STATIONS,'PresentList'];
function kh_read_config($pdo){
  if(!kh_table_exists('app_settings')) return [];
  try{$r=$pdo->query("SELECT value FROM app_settings WHERE `key`='role_app_items' LIMIT 1")->fetch(PDO::FETCH_ASSOC);$x=$r?json_decode((string)$r['value'],true):[];return is_array($x)?$x:[];}catch(Throwable $e){error_log('role_app_items config: '.$e->getMessage());return [];}
}
function kh_roles($pdo){
  $o=[];
  try{foreach($pdo->query("SELECT id,title,level FROM roles ORDER BY id") as $r)$o[]=['id'=>(string)$r['id'],'title'=>(string)$r['title'],'level'=>(int)$r['level'];}catch(Throwable $e){error_log('role_app_items roles: '.$e->getMessage());}
  return $o;
}
function kh_clean($v){if(!is_array($v))return []; $s=[];$o=[];foreach($v as $x){$x=(string)$x;if($x!==''&&!isset($s[$x])){$s[$x]=1;$o[]=$x;}}return $o;}
function kh_one_time_migrate($pdo,$cfg){
  if(!kh_table_exists('app_settings')) return $cfg;
  try{
    $r=$pdo->query("SELECT value FROM app_settings WHERE `key`='role_app_items_unified_migrated' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
    $version=$r?(int)$r['value']:0;
    if($version>=4)return $cfg;
    $roleRows=[];foreach($pdo->query("SELECT id,title,level FROM roles ORDER BY id") as $rr)$roleRows[(string)$rr['id']]=['title'=>(string)$rr['title'],'level'=>(int)$rr['level'];
    $changed=false;
    foreach($roleRows as $rid=>$rr){
      $x=array_key_exists($rid,$cfg)&&is_array($cfg[$rid])?kh_clean($cfg[$rid]):$allItems;
      $t=strtr($rr['title'],['ي'=>'ی','ى'=>'ی','ك'=>'ک']);
      $isMoto=function_exists('mb_strpos') ? mb_strpos($t,'گشت موتوری')!==false : strpos($t,'گشت موتوری')!==false;
      $isVehicle=(function_exists('mb_strpos') ? mb_strpos($t,'گشت خودرویی')!==false||mb_strpos($t,'بازرس')!==false||mb_strpos($t,'سربازرس')!==false : strpos($t,'گشت خودرویی')!==false||strpos($t,'بازرس')!==false||strpos($t,'سربازرس')!==false);
      if($isMoto){$x=array_values(array_diff($x,['PersonnelVehicle']));if(!in_array('PersonnelMotorcycle',$x,true)){$x[]='PersonnelMotorcycle';$changed=true;}}
      elseif($isVehicle){$x=array_values(array_diff($x,['PersonnelMotorcycle']));if(!in_array('PersonnelVehicle',$x,true)){$x[]='PersonnelVehicle';$changed=true;}}
      $isSeniorChief=(function_exists('mb_strpos')?mb_strpos($t,'سربازرس')!==false:strpos($t,'سربازرس')!==false);
      $isManager=(function_exists('mb_strpos')?mb_strpos($t,'مدیر')!==false:strpos($t,'مدیر')!==false);
      if(($isSeniorChief||$isManager)&&!in_array('PersonnelVehicleManagement',$x,true)){$x[]='PersonnelVehicleManagement';$changed=true;}
      if($isSeniorChief&&!in_array('PersonnelVehicleChecklist',$x,true)){$x[]='PersonnelVehicleChecklist';$changed=true;}
      $cfg[$rid]=$x;
    }
    if($changed){$js=json_encode($cfg,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);$st=$pdo->prepare("INSERT INTO app_settings(`key`,value) VALUES('role_app_items',?) ON DUPLICATE KEY UPDATE value=VALUES(value)");$st->execute([$js]);}
    $st=$pdo->prepare("INSERT INTO app_settings(`key`,value) VALUES('role_app_items_unified_migrated','4') ON DUPLICATE KEY UPDATE value='4'");$st->execute();
    return $cfg;
  }catch(Throwable $e){error_log('role_app_items migration: '.$e->getMessage());return $cfg;}
}
try{
  $u=kh_auth_user();$pdo=Db::pdo();$m=$_SERVER['REQUEST_METHOD']??'GET';$cfg=kh_read_config($pdo);$roles=kh_roles($pdo);$cfg=kh_one_time_migrate($pdo,$cfg);
  if($m==='GET'){
    if(kh_is_admin($u)){echo json_encode(['success'=>true,'roles'=>$roles,'config'=>$cfg,'items'=>$allItems,'default_items'=>$allItems,'source'=>'role_app_items'],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;}
    $rid=(string)($u['role_id']??'');$items=!array_key_exists($rid,$cfg)||!is_array($cfg[$rid])?$allItems:kh_clean($cfg[$rid]);echo json_encode(['success'=>true,'items'=>$items,'role_level'=>(int)($u['level']??0),'source'=>'role_app_items'],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;
  }
  if($m==='POST'){
    if(!kh_is_admin($u))Http::error('دسترسی غیرمجاز',403);
    if(!kh_table_exists('app_settings'))Http::error('جدول تنظیمات سامانه یافت نشد',500);
    $in=Http::body();if(!isset($in['config'])||!is_array($in['config']))Http::error('تنظیمات آیتم‌های اپ نامعتبر است',422);
    $new=[];foreach($in['config'] as $rid=>$items)$new[(string)$rid]=is_array($items)?kh_clean($items):$allItems;
    $js=json_encode($new,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);$st=$pdo->prepare("INSERT INTO app_settings(`key`,value) VALUES('role_app_items',?) ON DUPLICATE KEY UPDATE value=VALUES(value)");$st->execute([$js]);
    echo json_encode(['success'=>true,'ok'=>true,'config'=>$new,'items'=>$allItems,'roles'=>$roles,'default_items'=>$allItems,'source'=>'role_app_items'],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;
  }
  Http::error('Method not allowed',405);
}catch(Throwable $e){error_log('unified-role-app-items fatal: '.$e->getMessage());http_response_code(500);echo json_encode(['success'=>false,'error'=>'خطای داخلی در بارگذاری تنظیمات سمت‌ها و آیتم‌های اپ','detail'=>$e->getMessage()],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);}
