<?php
/* خطیار — پرونده خودرو/موتورسیکلت پرسنل + صحت‌سنجی و تاریخچه چک‌لیست */
declare(strict_types=1);
ini_set('display_errors','0');
date_default_timezone_set('Asia/Tehran');
$ROOT=__DIR__.'/../../';
require "$ROOT/lib/Db.php";
require "$ROOT/lib/Jwt.php";
require "$ROOT/lib/Http.php";
require "$ROOT/lib/XlsxWriter.php";
$CONFIG=require "$ROOT/config.php";

function pva_table_exists(string $table): bool { try { $r=Db::one("SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? LIMIT 1",[$table]); return $r!==null; } catch(Throwable $e){ return false; } }
function pva_column_exists(string $table,string $column): bool { try { $r=Db::one("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=? LIMIT 1",[$table,$column]); return $r!==null; } catch(Throwable $e){ return false; } }
function pva_ensure_schema(): void {
  Db::run("CREATE TABLE IF NOT EXISTS personnel_vehicle_assets (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,user_id BIGINT UNSIGNED NOT NULL,asset_type ENUM('car','motorcycle') NOT NULL,
    plate_part_right VARCHAR(3) NULL,plate_letter VARCHAR(2) NULL,plate_part_left VARCHAR(2) NULL,plate_iran VARCHAR(2) NULL,
    motorcycle_plate_top VARCHAR(3) NULL,motorcycle_plate_bottom VARCHAR(5) NULL,vehicle_type VARCHAR(30) NULL,fuel_type VARCHAR(20) NULL,color VARCHAR(50) NULL,model_year SMALLINT NULL,
    chassis_number VARCHAR(80) NULL,engine_number VARCHAR(80) NULL,vin VARCHAR(80) NULL,motorcycle_usage VARCHAR(20) NULL,motorcycle_system VARCHAR(80) NULL,motorcycle_type VARCHAR(80) NULL,cylinders TINYINT NULL,
    license_number VARCHAR(80) NULL,license_issue_date VARCHAR(10) NULL,license_expiry_date VARCHAR(10) NULL,insurance_number VARCHAR(100) NULL,insurance_company VARCHAR(150) NULL,insurance_issue_date VARCHAR(10) NULL,insurance_expiry_date VARCHAR(10) NULL,
    technical_inspection_number VARCHAR(100) NULL,technical_inspection_issue_date VARCHAR(10) NULL,technical_inspection_expiry_date VARCHAR(10) NULL,fixed_beacon TINYINT(1) NULL,mobile_beacon TINYINT(1) NULL,heating_ok TINYINT(1) NULL,cooling_ok TINYINT(1) NULL,amplifier TINYINT(1) NULL,
    status ENUM('draft','pending','verified','needs_correction') NOT NULL DEFAULT 'pending',verified_by BIGINT UNSIGNED NULL,verified_at DATETIME NULL,checklist_note TEXT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(id),UNIQUE KEY uq_personnel_asset_user_type(user_id,asset_type),KEY idx_personnel_asset_user(user_id),KEY idx_personnel_asset_status(status),KEY idx_personnel_asset_updated(updated_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  Db::run("CREATE TABLE IF NOT EXISTS personnel_vehicle_asset_photos (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,asset_id BIGINT UNSIGNED NOT NULL,photo_key VARCHAR(60) NOT NULL,data_uri LONGTEXT NOT NULL,crop_json TEXT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(id),UNIQUE KEY uq_asset_photo(asset_id,photo_key),KEY idx_asset_photo_asset(asset_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  Db::run("CREATE TABLE IF NOT EXISTS personnel_vehicle_asset_checks (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,asset_id BIGINT UNSIGNED NOT NULL,checker_id BIGINT UNSIGNED NOT NULL,check_key VARCHAR(80) NOT NULL,check_value TINYINT(1) NOT NULL DEFAULT 0,note VARCHAR(500) NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(id),UNIQUE KEY uq_asset_check(asset_id,checker_id,check_key),KEY idx_asset_check_asset(asset_id),KEY idx_asset_check_checker(checker_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  Db::run("CREATE TABLE IF NOT EXISTS personnel_vehicle_checklist_history (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,asset_id BIGINT UNSIGNED NOT NULL,checker_id BIGINT UNSIGNED NOT NULL,result ENUM('verified','needs_correction') NOT NULL,note TEXT NULL,checks_json LONGTEXT NULL,checked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),KEY idx_pvch_asset(asset_id),KEY idx_pvch_checker(checker_id),KEY idx_pvch_checked_at(checked_at),KEY idx_pvch_asset_time(asset_id,checked_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  if(pva_table_exists('personnel_vehicle_checklist_history') && !pva_column_exists('personnel_vehicle_checklist_history','checks_json')) Db::run("ALTER TABLE personnel_vehicle_checklist_history ADD COLUMN checks_json LONGTEXT NULL AFTER note");
}
function pva_json($data,int $status=200): void { http_response_code($status); header('Content-Type: application/json; charset=utf-8'); echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); exit; }
function pva_fail(string $m,int $s=400): void { pva_json(['ok'=>false,'error'=>$m],$s); }
function pva_body(): array { static $b=null; if($b===null){$raw=file_get_contents('php://input');$b=json_decode($raw?:'',true);if(!is_array($b))$b=[];}return $b; }
function pva_norm($s): string { $s=trim((string)$s); $s=strtr($s,['ي'=>'ی','ى'=>'ی','ك'=>'ک','ۀ'=>'ه','ة'=>'ه','۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9']); $s=preg_replace('/\s+/u',' ',$s)??$s; return trim($s); }
function pva_auth(): array { global $CONFIG; $tok=Http::bearer(); $p=$tok?Jwt::verify($tok,$CONFIG['jwt_secret']):null; if(!$p||empty($p['sub']))pva_fail('توکن نامعتبر یا منقضی است',401); $u=Db::one("SELECT u.id,u.is_active,u.is_admin,u.role_id,r.title role_title FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.id=? LIMIT 1",[$p['sub']]); if(!$u||!(int)$u['is_active'])pva_fail('کاربر نامعتبر است',401); return $u; }
function pva_role_kind(string $title,$forChecklist=false){ $t=pva_norm($title); $senior=((mb_strpos($t,'سربازرس')!==false || mb_strpos($t,'بازرس')!==false) && mb_strpos($t,'ارشد')!==false); if($forChecklist)return $senior; if(mb_strpos($t,'گشت موتوری')!==false)return 'motorcycle'; if(mb_strpos($t,'گشت خودرویی')!==false)return 'car'; if(mb_strpos($t,'سربازرس')!==false)return 'car'; return false; }
function pva_is_check_authorized(array $u): bool { return (bool)((int)($u['is_admin']??0) || pva_role_kind((string)($u['role_title']??''),true)); }
function pva_years(): array { $y=(int)date('Y')-621; $a=[]; for($x=$y;$x>=1390;$x--)$a[]=$x; return $a; }
function pva_asset(int $id): ?array { return Db::one('SELECT * FROM personnel_vehicle_assets WHERE id=? LIMIT 1',[$id]); }
function pva_history(int $id): array { static $hasJson=null; if($hasJson===null){try{$hasJson=(bool)Db::one("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='personnel_vehicle_checklist_history' AND COLUMN_NAME='checks_json' LIMIT 1");}catch(Throwable $e){$hasJson=false;}} $json=$hasJson?',h.checks_json':''; return Db::all("SELECT h.id,h.result,h.note{$json},h.checked_at,h.checker_id,CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,'')) checker_name FROM personnel_vehicle_checklist_history h LEFT JOIN users u ON u.id=h.checker_id WHERE h.asset_id=? ORDER BY h.checked_at DESC,h.id DESC",[$id]); }
function pva_photo_keys(string $type): array { return $type==='motorcycle'?['motor_front','motor_back','motor_right','motor_left','motor_card_front','motor_card_back','green_card','insurance','license_front','license_back']:['car_front','car_back','car_right','car_left','license_front','license_back','vehicle_card_front','vehicle_card_back','technical_inspection','insurance','green_card']; }
function pva_load(int $id,bool $photos=true): ?array { $a=pva_asset($id); if(!$a)return null; if($photos)$a['photos']=Db::all('SELECT photo_key,data_uri,crop_json,created_at,updated_at FROM personnel_vehicle_asset_photos WHERE asset_id=? ORDER BY id',[$id]); else $a['photo_keys']=array_column(Db::all('SELECT photo_key FROM personnel_vehicle_asset_photos WHERE asset_id=? ORDER BY id',[$id]),'photo_key'); $a['checks']=Db::all('SELECT check_key,check_value,note,checker_id,updated_at FROM personnel_vehicle_asset_checks WHERE asset_id=? ORDER BY check_key',[$id]); $a['checklist_history']=pva_history($id); return $a; }
function pva_list(bool $photos=false): array {
  $rows=Db::all("SELECT a.*,u.first_name,u.last_name,u.username,u.phone,u.national_code,r.title role_title,
    h.checklist_first_at,h.checklist_last_at,h.checklist_count,h.checklist_dates,h.last_result,h.last_checker_name
    FROM personnel_vehicle_assets a
    JOIN users u ON u.id=a.user_id
    LEFT JOIN roles r ON r.id=u.role_id
    LEFT JOIN (SELECT x.asset_id,MIN(x.checked_at) checklist_first_at,MAX(x.checked_at) checklist_last_at,COUNT(*) checklist_count,
      GROUP_CONCAT(DATE_FORMAT(x.checked_at,'%Y/%m/%d %H:%i:%s') ORDER BY x.checked_at DESC SEPARATOR ' | ') checklist_dates,
      SUBSTRING_INDEX(GROUP_CONCAT(x.result ORDER BY x.checked_at DESC,x.id DESC SEPARATOR ','),',',1) last_result,
      SUBSTRING_INDEX(GROUP_CONCAT(COALESCE(CONCAT(COALESCE(c.first_name,''),' ',COALESCE(c.last_name,'')),'') ORDER BY x.checked_at DESC,x.id DESC SEPARATOR '||'),'||',1) last_checker_name
      FROM personnel_vehicle_checklist_history x LEFT JOIN users c ON c.id=x.checker_id GROUP BY x.asset_id) h ON h.asset_id=a.id
    ORDER BY CASE WHEN a.status='pending' THEN 0 WHEN a.status='needs_correction' THEN 1 ELSE 2 END,a.updated_at DESC,a.id DESC");
  foreach($rows as &$r){$r['photos']=$photos?Db::all('SELECT photo_key,data_uri,crop_json FROM personnel_vehicle_asset_photos WHERE asset_id=? ORDER BY id',[$r['id']]):[];$r['checklist_history']=[];} unset($r); return $rows;
}
function pva_admin_allowed(array $u): bool { return (bool)((int)($u['is_admin']??0) || pva_is_check_authorized($u)); }
function pva_plate(array $r): string { if(($r['asset_type']??'')==='motorcycle')return trim(($r['motorcycle_plate_top']??'').' / '.($r['motorcycle_plate_bottom']??'')); return trim(($r['plate_part_right']??'').' '.($r['plate_letter']??'').' '.($r['plate_part_left']??'').' ایران '.($r['plate_iran']??'')); }
function pva_image_bytes($data): string { $data=(string)$data; if(strpos($data,'base64,')!==false)$data=substr($data,strpos($data,'base64,')+7);$data=preg_replace('/\s+/','',$data)??$data;$b=base64_decode($data,true);return $b===false?'':$b; }
function pva_check_keys(string $type): array { return $type==='motorcycle'?['identity','plate','license','insurance','photos','numbers']:['identity','plate','license','insurance','technical','photos','equipment','numbers']; }

try {
  pva_ensure_schema();
  $u=pva_auth(); $op=$_GET['op']??'access';
  if($op==='access'){ $kind=pva_role_kind((string)($u['role_title']??'')); pva_json(['ok'=>true,'allowed'=>$kind!==false,'asset_type'=>$kind===true?'car':$kind,'checklist_allowed'=>pva_is_check_authorized($u),'role_title'=>$u['role_title']??'','years'=>pva_years()]); }
  if($op==='mine'){ $kind=pva_role_kind((string)($u['role_title']??'')); $type=$_GET['type']??$kind; if(!in_array($type,['car','motorcycle'],true)||$kind!==$type)pva_fail('این بخش برای سمت شما فعال نیست',403); pva_json(['ok'=>true,'asset'=>($a=Db::one('SELECT id FROM personnel_vehicle_assets WHERE user_id=? AND asset_type=? LIMIT 1',[$u['id'],$type]))?pva_load((int)$a['id'],true):null]); }
  if($op==='list'||$op==='checklist-list'){ if(!pva_admin_allowed($u))pva_fail('دسترسی مدیریتی لازم است',403); pva_json(['ok'=>true,'items'=>pva_list(false)]); }
  if($op==='detail'){ if(!pva_admin_allowed($u))pva_fail('دسترسی مدیریتی لازم است',403); $id=(int)($_GET['id']??0);$a=pva_load($id,true);if(!$a)pva_fail('وسیله یافت نشد',404);pva_json(['ok'=>true,'asset'=>$a]); }
  if($op==='save'){
    $kind=pva_role_kind((string)($u['role_title']??''));$b=pva_body();$type=$b['asset_type']??'';
    if(!in_array($type,['car','motorcycle'],true)||$kind!==$type)pva_fail('دسترسی ثبت وسیله برای سمت شما مجاز نیست',403);
    $years=pva_years();$year=(int)pva_norm($b['model_year']??0);if($year<1390||!in_array($year,$years,true))pva_fail('سال ساخت/مدل نامعتبر است');
    if($type==='car' && trim((string)($b['plate_part_right']??''))==='' && trim((string)($b['plate_part_left']??''))==='')pva_fail('پلاک خودرو را کامل وارد کنید');
    if($type==='motorcycle' && trim((string)($b['motorcycle_plate_top']??''))==='' && trim((string)($b['motorcycle_plate_bottom']??''))==='')pva_fail('پلاک موتورسیکلت را وارد کنید');
    $cols=['asset_type','plate_part_right','plate_letter','plate_part_left','plate_iran','motorcycle_plate_top','motorcycle_plate_bottom','vehicle_type','fuel_type','color','model_year','chassis_number','engine_number','vin','motorcycle_usage','motorcycle_system','motorcycle_type','cylinders','license_number','license_issue_date','license_expiry_date','insurance_number','insurance_company','insurance_issue_date','insurance_expiry_date','technical_inspection_number','technical_inspection_issue_date','technical_inspection_expiry_date','fixed_beacon','mobile_beacon','heating_ok','cooling_ok','amplifier'];
    $vals=[];foreach($cols as $c){$v=$b[$c]??null;if(is_string($v))$v=pva_norm($v);if(in_array($c,['model_year','cylinders','fixed_beacon','mobile_beacon','heating_ok','cooling_ok','amplifier'],true))$v=($v===''||$v===null)?null:(int)pva_norm($v);$vals[]=$v;}
    Db::pdo()->beginTransaction(); try{
      $old=Db::one('SELECT id FROM personnel_vehicle_assets WHERE user_id=? AND asset_type=? LIMIT 1',[$u['id'],$type]);
      if($old){$sets=[];foreach($cols as $c)$sets[]="`$c`=?";$sets[]="status='pending'";$sets[]="verified_by=NULL";$sets[]="verified_at=NULL";Db::query('UPDATE personnel_vehicle_assets SET '.implode(',',$sets).' WHERE id=?',array_merge($vals,[(int)$old['id']]));$id=(int)$old['id'];}
      else{$names=implode(',',array_map(fn($x)=>"`$x`",array_merge(['user_id'],$cols)));$qs=implode(',',array_fill(0,count($vals)+1,'?'));Db::query("INSERT INTO personnel_vehicle_assets ($names,status) VALUES ($qs,'pending')",array_merge([(int)$u['id']],$vals));$id=(int)Db::lastInsertId();}
      $allowedPhotos=array_flip(pva_photo_keys($type));$photos=$b['photos']??[];if(is_array($photos)){foreach($photos as $ph){$key=trim((string)($ph['photo_key']??''));$data=(string)($ph['data_uri']??'');if($key===''||!isset($allowedPhotos[$key])||$data==='')continue;if(strlen($data)>8000000)pva_fail('حجم یکی از تصاویر بیش از حد مجاز است');$crop=json_encode($ph['crop_meta']??null,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);Db::query("INSERT INTO personnel_vehicle_asset_photos(asset_id,photo_key,data_uri,crop_json) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE data_uri=VALUES(data_uri),crop_json=VALUES(crop_json),updated_at=CURRENT_TIMESTAMP",[$id,$key,$data,$crop]);}}
      Db::pdo()->commit();
    }catch(Throwable $e){if(Db::pdo()->inTransaction())Db::pdo()->rollBack();throw $e;}
    pva_json(['ok'=>true,'asset'=>pva_load($id,true)]);
  }
  if($op==='checklist-verify'){
    if(!pva_is_check_authorized($u))pva_fail('فقط سربازرس ارشد یا مدیر سامانه دسترسی دارد',403);
    $b=pva_body();$id=(int)($b['asset_id']??0);$asset=pva_asset($id);if(!$asset)pva_fail('وسیله یافت نشد',404);
    $keys=pva_check_keys((string)$asset['asset_type']);$incoming=is_array($b['checks']??null)?$b['checks']:[];$checks=[];$missing=[];
    foreach($keys as $k){if(!array_key_exists($k,$incoming)){$missing[]=$k;continue;} $v=$incoming[$k];$checks[$k]=['value'=>!empty($v['value']),'note'=>pva_norm($v['note']??'')];}
    if($missing)pva_fail('همه موارد چک‌لیست باید تعیین تکلیف شوند: '.implode(', ',$missing));
    $approved=!empty($b['approved']);
    if($approved){$photoKeys=array_flip(pva_photo_keys((string)$asset['asset_type']));$have=array_flip(array_column(Db::all('SELECT photo_key FROM personnel_vehicle_asset_photos WHERE asset_id=?',[$id]),'photo_key'));$photoMissing=array_keys(array_diff_key($photoKeys,$have));if($photoMissing)pva_fail('برای تأیید نهایی همه تصاویر مدارک باید ثبت شده باشند.');}
    $status=$approved?'verified':'needs_correction';$note=pva_norm($b['note']??'');
    Db::pdo()->beginTransaction();try{
      foreach($checks as $k=>$v)Db::query("INSERT INTO personnel_vehicle_asset_checks(asset_id,checker_id,check_key,check_value,note) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE check_value=VALUES(check_value),note=VALUES(note),updated_at=CURRENT_TIMESTAMP",[$id,$u['id'],$k,$v['value']?1:0,$v['note']]);
      if($hasJson=Db::one("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='personnel_vehicle_checklist_history' AND COLUMN_NAME='checks_json' LIMIT 1")){Db::query("INSERT INTO personnel_vehicle_checklist_history(asset_id,checker_id,result,note,checks_json,checked_at) VALUES(?,?,?,?,?,NOW())",[$id,$u['id'],$status,$note,json_encode($checks,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)]);}else{Db::query("INSERT INTO personnel_vehicle_checklist_history(asset_id,checker_id,result,note,checked_at) VALUES(?,?,?,?,NOW())",[$id,$u['id'],$status,$note]);}
      Db::query('UPDATE personnel_vehicle_assets SET status=?,verified_by=?,verified_at=NOW(),checklist_note=? WHERE id=?',[$status,$u['id'],$note,$id]);
      Db::pdo()->commit();
    }catch(Throwable $e){if(Db::pdo()->inTransaction())Db::pdo()->rollBack();throw $e;}
    pva_json(['ok'=>true,'status'=>$status,'checked_at'=>date('Y-m-d H:i:s')]);
  }
  if($op==='export'){
    if(!pva_admin_allowed($u))pva_fail('دسترسی مدیریتی لازم است',403);
    $rows=Db::all("SELECT a.*,u.first_name,u.last_name,u.username,u.phone,u.national_code,r.title role_title FROM personnel_vehicle_assets a JOIN users u ON u.id=a.user_id LEFT JOIN roles r ON r.id=u.role_id ORDER BY u.last_name,u.first_name,a.asset_type");
    $photoKeys=[];foreach($rows as $r){foreach(Db::all('SELECT photo_key FROM personnel_vehicle_asset_photos WHERE asset_id=?',[$r['id']]) as $p){$k=(string)$p['photo_key'];if($k!==''&&!in_array($k,$photoKeys,true))$photoKeys[]=$k;}}
    $head=['شناسه','نام','نام خانوادگی','نام کاربری','سمت','موبایل','کد ملی','نوع وسیله','پلاک','نوع خودرو','سوخت','رنگ','سال ساخت','شماره شاسی/تنه','شماره موتور','VIN','سیستم موتور','تیپ موتور','کاربری موتور','سیلندر','شماره گواهینامه','صدور گواهینامه','انقضای گواهینامه','شماره بیمه','شرکت بیمه','صدور بیمه','انقضای بیمه','شماره معاینه فنی','صدور معاینه','انقضای معاینه','چراغگردان ثابت','چراغگردان متحرک','گرمایش','سرمایش','آمپلی‌فایر','وضعیت بررسی','اولین تاریخ چک‌لیست','آخرین تاریخ چک‌لیست','تاریخچه کامل چک‌لیست'];foreach($photoKeys as $k)$head[]='تصویر '.$k;$x=new XlsxWriter($head);
    foreach($rows as $r){$hist=pva_history((int)$r['id']);$dates=array_column($hist,'checked_at');$plate=pva_plate($r);$cells=[$r['id'],$r['first_name'],$r['last_name'],$r['username'],$r['role_title'],$r['phone'],$r['national_code'],$r['asset_type']==='car'?'خودرو':'موتورسیکلت',$plate,$r['vehicle_type'],$r['fuel_type'],$r['color'],$r['model_year'],$r['chassis_number'],$r['engine_number'],$r['vin'],$r['motorcycle_system'],$r['motorcycle_type'],$r['motorcycle_usage'],$r['cylinders'],$r['license_number'],$r['license_issue_date'],$r['license_expiry_date'],$r['insurance_number'],$r['insurance_company'],$r['insurance_issue_date'],$r['insurance_expiry_date'],$r['technical_inspection_number'],$r['technical_inspection_issue_date'],$r['technical_inspection_expiry_date'],((int)$r['fixed_beacon']?'بله':'خیر'),((int)$r['mobile_beacon']?'بله':'خیر'),((int)$r['heating_ok']?'بله':'خیر'),((int)$r['cooling_ok']?'بله':'خیر'),((int)$r['amplifier']?'بله':'خیر'),$r['status'],$dates?end($dates):null,$dates?$dates[0]:null,$dates?implode(' | ',$dates):null];$photos=Db::all('SELECT photo_key,data_uri FROM personnel_vehicle_asset_photos WHERE asset_id=? ORDER BY id',[$r['id']]);$by=[];foreach($photos as $p){$by[(string)$p['photo_key']]=$p;}$start=count($cells);foreach($photoKeys as $k)$cells[]='';$row=$x->addRow($cells);foreach($photoKeys as $i=>$k){$bytes=pva_image_bytes($by[$k]['data_uri']??'');if($bytes!==''){$x->setImage($row,$start+$i,$bytes,110);$x->setColWidth($start+$i,18);}}}
    $x->output('personnel_vehicle_assets.xlsx','خودرو و موتورسیکلت');exit;
  }
  pva_fail('عملیات نامعتبر',404);
}catch(Throwable $e){error_log('personnel-vehicle-assets: '.$e->getMessage().' @ '.$e->getFile().':'.$e->getLine());pva_fail('خطای داخلی سرویس اطلاعات خودرو و موتورسیکلت',500);}
