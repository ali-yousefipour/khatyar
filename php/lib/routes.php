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
      address VARCHAR(700) NULL,
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
      iran_code VARCHAR(4) NOT NULL DEFAULT 'ایران',
      vehicle_type VARCHAR(100) NULL,
      vehicle_color VARCHAR(80) NULL,
      passenger_count INT NOT NULL DEFAULT 0,
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
  // شناسه یکتای سمت گوشی برای جلوگیری از ثبت دوباره بازدید هنگام تکرار صف آفلاین.
  try{Db::run("ALTER TABLE school_service_inspections ADD COLUMN client_uuid VARCHAR(64) NULL");}catch(Throwable $e){}
  try{Db::run("ALTER TABLE school_service_inspections ADD UNIQUE KEY uq_ssi_client_uuid(client_uuid)");}catch(Throwable $e){}
  // تنظیمات تصویر اختصاصی سرویس مدارس عمداً وجود ندارد؛ این قابلیت از تنظیمات عمومی تصاویر سایت استفاده می‌کند.
  try{Db::run("DROP TABLE IF EXISTS school_service_photo_settings");}catch(Throwable $e){}
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
        VALUES(?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE role_id=role_id",
        [(int)$r['id'],$default,$default,$default,$default,((int)$r['level']<=3)?1:0,$default]);
    }
  }catch(Throwable $e){}
}
function _ssv_school_company_validate($schoolId,$companyId,$district=''){
  $schoolId=(int)$schoolId;$companyId=(int)$companyId;
  if($schoolId){
    $s=Db::one("SELECT id,educational_district FROM school_service_schools WHERE id=? AND is_active=1",[$schoolId]);
    if(!$s) Http::error('مدرسه انتخاب‌شده معتبر نیست.',422);
    if($district!=='' && (string)$s['educational_district']!==$district) Http::error('ناحیه مدرسه با ناحیه انتخاب‌شده یکسان نیست.',422);
    if($companyId){
      if(!Db::one("SELECT id FROM school_service_companies WHERE id=? AND is_active=1",[$companyId])) Http::error('شرکت مجری انتخاب‌شده معتبر نیست.',422);
      $map=Db::one("SELECT company_id FROM school_service_school_companies WHERE school_id=?",[$schoolId]);
      if($map && (int)$map['company_id']!==$companyId) Http::error('شرکت انتخاب‌شده با شرکت مجری این مدرسه مطابقت ندارد.',422);
    }
  }elseif($companyId && !Db::one("SELECT id FROM school_service_companies WHERE id=? AND is_active=1",[$companyId])) Http::error('شرکت مجری انتخاب‌شده معتبر نیست.',422);
}
function _ssv_valid_option($table,$title){$title=_ssv_norm($title);return $title!==''&&Db::one("SELECT id FROM $table WHERE title=? AND is_active=1",[$title]);}
function _ssv_perm($u,$action='view'){
  _ssv_tables();
  if(!empty($u['is_admin']) || in_array(($u['role_title']??''),['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد'],true)) return true;
  $col='can_'.preg_replace('/[^a-z_]/','',$action);
  if(!in_array($col,['can_view','can_create','can_edit','can_delete','can_import','can_report'],true)) return false;
  $r=Db::one("SELECT $col v FROM school_service_permissions WHERE role_id=?",[(int)$u['role_id']]);
  return !empty($r['v']);
}
function _ssv_need($u,$a='view'){if(!_ssv_perm($u,$a)) Http::error('دسترسی به بخش سرویس مدارس برای سمت شما فعال نیست.',403);}
function _ssv_json_rows($rows){return array_map(function($r){foreach($r as $k=>$v)if(is_string($v))$r[$k]=$v;return $r;},$rows);}
function _ssv_en($s){return strtr((string)$s,['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9']);}
function _ssv_norm($s){$s=trim((string)$s);$s=str_replace(['ي','ى','ك','ۀ'],['ی','ی','ک','ه'],$s);return preg_replace('/\s+/u',' ',$s);}
function _ssv_plate($b){
  $a=preg_replace('/\D/','',_ssv_en($b['plate_three']??''));$c=preg_replace('/\D/','',_ssv_en($b['plate_two']??''));
  $l=_ssv_norm($b['plate_letter']??''); if($a!==''&&strlen($a)!==3)Http::error('بخش سه‌رقمی پلاک باید دقیقاً ۳ رقم باشد',422);
  if($c!==''&&strlen($c)!==2)Http::error('بخش دورقمی پلاک باید دقیقاً ۲ رقم باشد',422);
  return [$a?:null,$l?:null,$c?:null];
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
    'phone'=>['تلفن شرکت','شماره تماس','موبایل'],
    'address'=>['آدرس','نشانی']
  ];
  $find=function($key)use($map,$aliases){foreach($aliases[$key]??[] as $a){$a=_ssv_norm($a);if(array_key_exists($a,$map))return $map[$a];}return null;};
  $idx=[];foreach(array_keys($aliases) as $k)$idx[$k]=$find($k);$out=[];
  for($r=1;$r<count($rows);$r++){ $x=$rows[$r];$get=fn($k)=>$idx[$k]===null?'':trim((string)($x[$idx[$k]]??''));$school=$get('school');$company=$get('company');if(in_array($company,['نامشخص','نامعلوم','-','—'],true))$company='';if($school===''&&$company==='')continue;$out[]=['code'=>$get('code'),'school'=>$school,'district'=>$get('district'),'gender'=>$get('gender'),'company'=>$company,'manager'=>$get('manager'),'phone'=>$get('phone'),'address'=>$get('address')];}
  return $out;
}


route('POST','/api/school-service/companies',function($p,$b,$u){_ssv_need($u,'edit');_ssv_tables();$name=_ssv_norm($b['name']??'');if($name==='')Http::error('نام شرکت الزامی است',422);if(Db::one("SELECT id FROM school_service_companies WHERE name=?",[$name]))Http::error('این شرکت قبلاً ثبت شده است',409);Db::run("INSERT INTO school_service_companies(name,manager_name,phone,address) VALUES(?,?,?,?)",[$name,_ssv_norm($b['manager_name']??'')?:null,trim($b['phone']??'')?:null,_ssv_norm($b['address']??'')?:null]);return ['ok'=>true,'id'=>(int)Db::pdo()->lastInsertId()];});
route('PUT','/api/school-service/companies/{id}',function($p,$b,$u){_ssv_need($u,'edit');_ssv_tables();$id=(int)$p['id'];if(!Db::one("SELECT id FROM school_service_companies WHERE id=?",[$id]))Http::error('شرکت یافت نشد',404);$name=_ssv_norm($b['name']??'');if($name==='')Http::error('نام شرکت الزامی است',422);Db::run("UPDATE school_service_companies SET name=?,manager_name=?,phone=?,address=?,is_active=? WHERE id=?",[$name,_ssv_norm($b['manager_name']??'')?:null,trim($b['phone']??'')?:null,_ssv_norm($b['address']??'')?:null,isset($b['is_active'])?(int)!!$b['is_active']:1,$id]);return ['ok'=>true];});
route('DELETE','/api/school-service/companies/{id}',function($p,$b,$u){_ssv_need($u,'delete');_ssv_tables();$id=(int)$p['id'];Db::run("UPDATE school_service_companies SET is_active=0 WHERE id=?",[$id]);return ['ok'=>true];});
route('POST','/api/school-service/schools',function($p,$b,$u){_ssv_need($u,'edit');_ssv_tables();$name=_ssv_norm($b['name']??'');if($name==='')Http::error('نام مدرسه الزامی است',422);$g=in_array($b['gender']??'',['دخترانه','پسرانه'],true)?$b['gender']:'نامشخص';$cid=!empty($b['company_id'])?(int)$b['company_id']:0;if($cid&&!Db::one("SELECT id FROM school_service_companies WHERE id=? AND is_active=1",[$cid]))Http::error('شرکت مجری نامعتبر است',422);Db::run("INSERT INTO school_service_schools(code,name,educational_district,gender,address) VALUES(?,?,?,?,?)",[_ssv_norm($b['code']??'')?:null,$name,_ssv_norm($b['educational_district']??'')?:null,$g,_ssv_norm($b['address']??'')?:null]);$sid=(int)Db::pdo()->lastInsertId();if($cid)Db::run("INSERT INTO school_service_school_companies(school_id,company_id,is_primary) VALUES(?,?,1)",[$sid,$cid]);return ['ok'=>true,'id'=>$sid];});
route('PUT','/api/school-service/schools/{id}',function($p,$b,$u){_ssv_need($u,'edit');_ssv_tables();$id=(int)$p['id'];if(!Db::one("SELECT id FROM school_service_schools WHERE id=?",[$id]))Http::error('مدرسه یافت نشد',404);$name=_ssv_norm($b['name']??'');if($name==='')Http::error('نام مدرسه الزامی است',422);$g=in_array($b['gender']??'',['دخترانه','پسرانه'],true)?$b['gender']:'نامشخص';Db::run("UPDATE school_service_schools SET code=?,name=?,educational_district=?,gender=?,address=? WHERE id=?",[_ssv_norm($b['code']??'')?:null,$name,_ssv_norm($b['educational_district']??'')?:null,$g,_ssv_norm($b['address']??'')?:null,$id]);if(isset($b['company_id'])){Db::run("DELETE FROM school_service_school_companies WHERE school_id=?",[$id]);$cid=(int)$b['company_id'];if($cid){if(!Db::one("SELECT id FROM school_service_companies WHERE id=? AND is_active=1",[$cid]))Http::error('شرکت مجری نامعتبر است',422);Db::run("INSERT INTO school_service_school_companies(school_id,company_id,is_primary) VALUES(?,?,1)",[$id,$cid]);}}return ['ok'=>true];});
route('DELETE','/api/school-service/schools/{id}',function($p,$b,$u){_ssv_need($u,'delete');_ssv_tables();Db::run("UPDATE school_service_schools SET is_active=0 WHERE id=?",[(int)$p['id']]);return ['ok'=>true];});
route('GET','/api/school-service/access',function($p,$b,$u){_ssv_tables();return ['allowed'=>_ssv_perm($u,'view'),'can_create'=>_ssv_perm($u,'create'),'can_edit'=>_ssv_perm($u,'edit'),'can_delete'=>_ssv_perm($u,'delete'),'can_import'=>_ssv_perm($u,'import'),'can_report'=>_ssv_perm($u,'report')];});
route('GET','/api/school-service/meta',function($p,$b,$u){_ssv_need($u,'view');_ssv_tables();return ['districts'=>array_column(Db::all("SELECT title FROM school_service_districts WHERE is_active=1 ORDER BY sort_order,id"),'title'),'genders'=>['دخترانه','پسرانه','نامشخص'],'driver_genders'=>['خانم','آقا','نامشخص'],'vehicle_types'=>array_column(Db::all("SELECT title FROM school_service_vehicle_types WHERE is_active=1 ORDER BY sort_order,id"),'title'),'vehicle_colors'=>array_column(Db::all("SELECT title FROM school_service_vehicle_colors WHERE is_active=1 ORDER BY sort_order,id"),'title'),'violations'=>Db::all("SELECT id,title FROM school_service_violation_types WHERE is_active=1 ORDER BY sort_order,id")];});
route('GET','/api/school-service/companies',function($p,$b,$u){_ssv_need($u,'view');_ssv_tables();$q=_ssv_norm($_GET['search']??'');$limit=min(200,(int)($_GET['limit']??100));$where=$q!==''?'WHERE c.name LIKE ?':'WHERE 1';$args=$q!==''?['%'.$q.'%']:[];return ['items'=>Db::all("SELECT c.id,c.name,c.manager_name,c.phone,c.address,c.is_active,COUNT(DISTINCT sc.school_id) school_count FROM school_service_companies c LEFT JOIN school_service_school_companies sc ON sc.company_id=c.id $where GROUP BY c.id ORDER BY c.name LIMIT $limit",$args)];});
route('GET','/api/school-service/schools',function($p,$b,$u){_ssv_need($u,'view');_ssv_tables();$q=_ssv_norm($_GET['search']??'');$company=(int)($_GET['company_id']??0);$district=_ssv_norm($_GET['district']??'');$c=['s.is_active=1'];$args=[];if($q!==''){$c[]='(s.name LIKE ? OR s.code LIKE ?)';$args[]='%'.$q.'%';$args[]='%'.$q.'%';}if($company){$c[]='EXISTS(SELECT 1 FROM school_service_school_companies x WHERE x.school_id=s.id AND x.company_id=?)';$args[]=$company;}if($district!==''){$c[]='s.educational_district=?';$args[]=$district;}$where=implode(' AND ',$c);return ['items'=>Db::all("SELECT s.id,s.code,s.name,s.educational_district,s.gender,s.address,(SELECT scx.company_id FROM school_service_school_companies scx WHERE scx.school_id=s.id LIMIT 1) company_id,GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', ') company_names FROM school_service_schools s LEFT JOIN school_service_school_companies sc ON sc.school_id=s.id LEFT JOIN school_service_companies c ON c.id=sc.company_id WHERE $where GROUP BY s.id ORDER BY s.name LIMIT 500",$args)];});
route('GET','/api/school-service/inspections',function($p,$b,$u){_ssv_need($u,'view');_ssv_tables();$c=['1=1'];$args=[];$q=_ssv_norm($_GET['search']??'');if($q!==''){$c[]='(s.name LIKE ? OR c.name LIKE ? OR i.location_text LIKE ? OR CONCAT(i.plate_three,i.plate_letter,i.plate_two) LIKE ?)';$args=array_merge($args,['%'.$q.'%','%'.$q.'%','%'.$q.'%','%'.$q.'%']);}if(!empty($_GET['company_id'])){$c[]='i.company_id=?';$args[]=(int)$_GET['company_id'];}if(!empty($_GET['district'])){$c[]='i.educational_district=?';$args[]=_ssv_norm($_GET['district']);}$where=implode(' AND ',$c);$rows=Db::all("SELECT i.*,s.name school_name,c.name company_name,TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) inspector_name FROM school_service_inspections i LEFT JOIN school_service_schools s ON s.id=i.school_id LEFT JOIN school_service_companies c ON c.id=i.company_id LEFT JOIN users u ON u.id=i.inspector_user_id WHERE $where ORDER BY i.id DESC LIMIT 1000",$args);foreach($rows as &$r){$r['plate']=trim(($r['plate_three']??'').' '.($r['plate_letter']??'').' '.($r['plate_two']??'').' ایران');$r['violations']=array_column(Db::all("SELECT v.title FROM school_service_inspection_violations x JOIN school_service_violation_types v ON v.id=x.violation_type_id WHERE x.inspection_id=?",[(int)$r['id']]),'title');}unset($r);return ['items'=>$rows];});
route('POST','/api/school-service/inspections',function($p,$b,$u){_ssv_need($u,'create');_ssv_tables();$clientUuid=_ssv_norm($b['client_uuid']??'');if($clientUuid!==''){ $existing=Db::one("SELECT id FROM school_service_inspections WHERE client_uuid=?",[$clientUuid]);if($existing)return ['ok'=>true,'id'=>(int)$existing['id'],'duplicate'=>true]; }[$a,$l,$c]=_ssv_plate($b);$schoolId=(int)($b['school_id']??0);$companyId=(int)($b['company_id']??0);$viol=$b['violation_ids']??[];if(is_string($viol))$viol=json_decode($viol,true)?:[];$viol=array_values(array_unique(array_map('intval',(array)$viol)));if(!$schoolId)$schoolId=null;if(!$companyId)$companyId=null;$district=_ssv_norm($b['educational_district']??'');if($district!==''&&!_ssv_valid_option('school_service_districts',$district))Http::error('ناحیه آموزشی انتخاب‌شده معتبر یا فعال نیست.',422);$vehicleType=_ssv_norm($b['vehicle_type']??'');if($vehicleType!==''&&!_ssv_valid_option('school_service_vehicle_types',$vehicleType))Http::error('نوع خودرو انتخاب‌شده معتبر یا فعال نیست.',422);$vehicleColor=_ssv_norm($b['vehicle_color']??'');if($vehicleColor!==''&&!_ssv_valid_option('school_service_vehicle_colors',$vehicleColor))Http::error('رنگ خودرو انتخاب‌شده معتبر یا فعال نیست.',422);_ssv_school_company_validate($schoolId??0,$companyId??0,$district);$gender=in_array($b['school_gender']??'',['دخترانه','پسرانه','نامشخص'],true)?$b['school_gender']:'نامشخص';$dg=in_array($b['driver_gender']??'',['خانم','آقا','نامشخص'],true)?$b['driver_gender']:'نامشخص';$cert=in_array($b['certificate_status']??'',['معتبر','نامعتبر','ارائه نشد'],true)?$b['certificate_status']:'ارائه نشد';$pass=max(0,(int)($b['passenger_count']??0));$date=_ssv_en($b['violation_date']??'');$time=trim((string)($b['violation_time']??''));if($date!==''&&!preg_match('/^14\d{2}[\/-]\d{1,2}[\/-]\d{1,2}$/',$date))Http::error('تاریخ ثبت تخلف نامعتبر است.',422);[$lat,$lng]=validGeo($b['latitude']??null,$b['longitude']??null);Db::run("INSERT INTO school_service_inspections(inspector_user_id,client_uuid,educational_district,company_id,school_id,school_gender,plate_three,plate_letter,plate_two,iran_code,vehicle_type,vehicle_color,passenger_count,driver_gender,certificate_status,violation_date,violation_time,location_text,latitude,longitude,description) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",[(int)$u['id'],_ssv_norm($b['client_uuid']??'')?:null,$district,$companyId?:null,$schoolId?:null,$gender,$a,$l,$c,'ایران',$vehicleType,$vehicleColor,$pass,$dg,$cert,$date?:null,$time?:null,_ssv_norm($b['location_text']??'')?:null,$lat,$lng,trim((string)($b['description']??''))?:null]);$id=(int)Db::pdo()->lastInsertId();foreach($viol as $vid){if(Db::one("SELECT id FROM school_service_violation_types WHERE id=? AND is_active=1",[$vid]))Db::run("INSERT IGNORE INTO school_service_inspection_violations(inspection_id,violation_type_id) VALUES(?,?)",[$id,$vid]);}return ['ok'=>true,'id'=>$id];});
route('POST','/api/school-service/import',function($p,$b,$u){_ssv_need($u,'import');_ssv_tables();$sheets=_ssv_xlsx_rows($_FILES['file']??null);$records=[];foreach($sheets as $name=>$rows){$records=array_merge($records,_ssv_sheet_records($rows));}if(!$records)Http::error('هیچ ردیف قابل شناسایی در فایل Excel پیدا نشد. ستون‌های «نام مدرسه» و «شرکت مجری سرویس دانش‌آموزی» را بررسی کنید.',422);$cc=0;$sc=0;$mc=0;$errs=[];foreach($records as $r){try{$cn=_ssv_norm($r['company']);$sn=_ssv_norm($r['school']);if($cn!==''){$co=Db::one("SELECT id FROM school_service_companies WHERE name=?",[$cn]);if($co)$cid=(int)$co['id'];else{Db::run("INSERT INTO school_service_companies(name,manager_name,phone,address) VALUES(?,?,?,?)",[$cn,$r['manager']?:null,$r['phone']?:null,$r['address']?:null]);$cid=(int)Db::pdo()->lastInsertId();$cc++;}}else{$cid=null;}$code=_ssv_norm($r['code']);$school=null;if($code!=='')$school=Db::one("SELECT id FROM school_service_schools WHERE code=?",[$code]);if(!$school)$school=Db::one("SELECT id FROM school_service_schools WHERE name=? AND educational_district=?",[$sn,_ssv_norm($r['district'])]);if($school){$sid=(int)$school['id'];Db::run("UPDATE school_service_schools SET name=?,educational_district=?,gender=?,address=? WHERE id=?",[$sn,_ssv_norm($r['district']),in_array($r['gender'],['دخترانه','پسرانه'],true)?$r['gender']:'نامشخص',$r['address']?:null,$sid]);}else{Db::run("INSERT INTO school_service_schools(code,name,educational_district,gender,address) VALUES(?,?,?,?,?)",[$code?:null,$sn,_ssv_norm($r['district']),in_array($r['gender'],['دخترانه','پسرانه'],true)?$r['gender']:'نامشخص',$r['address']?:null]);$sid=(int)Db::pdo()->lastInsertId();$sc++;}if($cid){$oldMap=Db::one("SELECT company_id FROM school_service_school_companies WHERE school_id=?",[$sid]);if($oldMap){if((int)$oldMap['company_id']!==(int)$cid){Db::run("UPDATE school_service_school_companies SET company_id=?,is_primary=1 WHERE school_id=?",[$cid,$sid]);$mc++;}}else{Db::run("INSERT INTO school_service_school_companies(school_id,company_id,is_primary) VALUES(?,?,1)",[$sid,$cid]);$mc++;}}}catch(Throwable $e){$errs[]='ردیف مدرسه «'.($r['school']??'').'»: '.$e->getMessage();if(count($errs)>=100)break;}}Db::run("INSERT INTO school_service_import_logs(user_id,file_name,companies_count,schools_count,mappings_count,errors_count,errors_text) VALUES(?,?,?,?,?,?,?)",[(int)$u['id'],$_FILES['file']['name']??'Excel',$cc,$sc,$mc,count($errs),implode("\n",$errs)]);return ['ok'=>true,'companies_count'=>$cc,'schools_count'=>$sc,'mappings_count'=>$mc,'errors'=>$errs];},false,99);
route('GET','/api/school-service/export',function($p,$b,$u){_ssv_need($u,'report');_ssv_tables();$type=$_GET['type']??'inspections';$rows=[];$head=[];if($type==='schools'){$head=['ردیف','کد مدرسه','نام مدرسه','ناحیه آموزشی','نوع مدرسه','شرکت/شرکت‌های مجری','آدرس'];$rows=Db::all("SELECT s.id,s.code,s.name,s.educational_district,s.gender,s.address,GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR '، ') company_names FROM school_service_schools s LEFT JOIN school_service_school_companies sc ON sc.school_id=s.id LEFT JOIN school_service_companies c ON c.id=sc.company_id WHERE s.is_active=1 GROUP BY s.id ORDER BY s.name LIMIT 10000");foreach($rows as $i=>&$r)$r=[$i+1,$r['code'],$r['name'],$r['educational_district'],$r['gender'],$r['company_names'],$r['address']];unset($r);}elseif($type==='companies'){$head=['ردیف','نام شرکت','مدیر','تلفن','آدرس','تعداد مدارس'];$rows=Db::all("SELECT c.*,COUNT(DISTINCT sc.school_id) school_count FROM school_service_companies c LEFT JOIN school_service_school_companies sc ON sc.company_id=c.id WHERE c.is_active=1 GROUP BY c.id ORDER BY c.name LIMIT 5000");foreach($rows as $i=>&$r)$r=[$i+1,$r['name'],$r['manager_name'],$r['phone'],$r['address'],$r['school_count']];unset($r);}else{$head=['ردیف','ناحیه','شرکت','نوع مدرسه','مدرسه','پلاک','نوع خودرو','رنگ خودرو','تخلفات','تعداد سرنشین بدون راننده','نوع راننده','وضعیت گواهی صلاحیت','تاریخ','ساعت','محل ثبت تخلف','توضیحات','بازرس'];$rows=Db::all("SELECT i.*,s.name school_name,c.name company_name,TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) inspector_name FROM school_service_inspections i LEFT JOIN school_service_schools s ON s.id=i.school_id LEFT JOIN school_service_companies c ON c.id=i.company_id LEFT JOIN users u ON u.id=i.inspector_user_id ORDER BY i.id DESC LIMIT 20000");foreach($rows as $r){$vs=Db::all("SELECT v.title FROM school_service_inspection_violations x JOIN school_service_violation_types v ON v.id=x.violation_type_id WHERE x.inspection_id=?",[(int)$r['id']]);$rows2[]=[count($rows2??[])+1,$r['educational_district'],$r['company_name'],$r['school_gender'],$r['school_name'],trim(($r['plate_three']??'').' '.($r['plate_letter']??'').' '.($r['plate_two']??'').' ایران'),$r['vehicle_type'],$r['vehicle_color'],implode('، ',array_column($vs,'title')),$r['passenger_count'],$r['driver_gender'],$r['certificate_status'],$r['violation_date'],$r['violation_time'],$r['location_text'],$r['description'],$r['inspector_name']];}$rows=$rows2??[];}$xw=new XlsxWriter($head);foreach($rows as $row)$xw->addRow($row);$xw->output('سرویس_مدارس_'.$type.'.xlsx','سرویس مدارس');},false,99);
route('GET','/api/school-service/companies-page',function($p,$b,$u){_ssv_need($u,'view');_ssv_tables();$page=max(1,(int)($_GET['page']??1));$size=max(10,min(100,(int)($_GET['page_size']??25)));$q=_ssv_norm($_GET['search']??'');$where=$q!==''?'WHERE c.name LIKE ?':'WHERE 1';$args=$q!==''?['%'.$q.'%']:[];$total=(int)(Db::one("SELECT COUNT(*) n FROM school_service_companies c $where",$args)['n']??0);$rows=Db::all("SELECT c.id,c.name,c.manager_name,c.phone,c.address,c.is_active,COUNT(DISTINCT sc.school_id) school_count FROM school_service_companies c LEFT JOIN school_service_school_companies sc ON sc.company_id=c.id $where GROUP BY c.id ORDER BY c.name LIMIT $size OFFSET ".(($page-1)*$size),$args);return ['items'=>$rows,'page'=>$page,'page_size'=>$size,'total'=>$total,'pages'=>max(1,(int)ceil($total/$size))];});
route('GET','/api/school-service/schools-page',function($p,$b,$u){_ssv_need($u,'view');_ssv_tables();$page=max(1,(int)($_GET['page']??1));$size=max(10,min(100,(int)($_GET['page_size']??25)));$q=_ssv_norm($_GET['search']??'');$district=_ssv_norm($_GET['district']??'');$where=['s.is_active=1'];$args=[];if($q!==''){$where[]='(s.name LIKE ? OR s.code LIKE ?)';$args[]='%'.$q.'%';$args[]='%'.$q.'%';}if($district!==''){$where[]='s.educational_district=?';$args[]=$district;}$w=implode(' AND ',$where);$total=(int)(Db::one("SELECT COUNT(*) n FROM school_service_schools s WHERE $w",$args)['n']??0);$rows=Db::all("SELECT s.id,s.code,s.name,s.educational_district,s.gender,s.address,GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', ') company_names FROM school_service_schools s LEFT JOIN school_service_school_companies sc ON sc.school_id=s.id LEFT JOIN school_service_companies c ON c.id=sc.company_id WHERE $w GROUP BY s.id ORDER BY s.name LIMIT $size OFFSET ".(($page-1)*$size),$args);return ['items'=>$rows,'page'=>$page,'page_size'=>$size,'total'=>$total,'pages'=>max(1,(int)ceil($total/$size))];});
route('GET','/api/school-service/inspections-page',function($p,$b,$u){_ssv_need($u,'view');_ssv_tables();$page=max(1,(int)($_GET['page']??1));$size=max(10,min(100,(int)($_GET['page_size']??25)));$q=_ssv_norm($_GET['search']??'');$where=['1=1'];$args=[];if($q!==''){$where[]='(s.name LIKE ? OR c.name LIKE ? OR i.location_text LIKE ? OR CONCAT(i.plate_three,i.plate_letter,i.plate_two) LIKE ?)';array_push($args,'%'.$q.'%','%'.$q.'%','%'.$q.'%','%'.$q.'%');}$w=implode(' AND ',$where);$total=(int)(Db::one("SELECT COUNT(*) n FROM school_service_inspections i LEFT JOIN school_service_schools s ON s.id=i.school_id LEFT JOIN school_service_companies c ON c.id=i.company_id WHERE $w",$args)['n']??0);$rows=Db::all("SELECT i.*,s.name school_name,c.name company_name,TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) inspector_name FROM school_service_inspections i LEFT JOIN school_service_schools s ON s.id=i.school_id LEFT JOIN school_service_companies c ON c.id=i.company_id LEFT JOIN users u ON u.id=i.inspector_user_id WHERE $w ORDER BY i.id DESC LIMIT $size OFFSET ".(($page-1)*$size),$args);foreach($rows as &$rr){$rr['plate']=trim(($rr['plate_three']??'').' '.($rr['plate_letter']??'').' '.($rr['plate_two']??'').' ایران');$rr['violations']=array_column(Db::all("SELECT v.title FROM school_service_inspection_violations x JOIN school_service_violation_types v ON v.id=x.violation_type_id WHERE x.inspection_id=?",[(int)$rr['id']]),'title');}unset($rr);return ['items'=>$rows,'page'=>$page,'page_size'=>$size,'total'=>$total,'pages'=>max(1,(int)ceil($total/$size))];});
route('GET','/api/school-service/config',function($p,$b,$u){_ssv_need($u,'view');_ssv_tables();if(!_ssv_perm($u,'edit'))Http::error('دسترسی مدیریت تنظیمات ندارید',403);return ['districts'=>Db::all("SELECT * FROM school_service_districts ORDER BY sort_order,id"),'vehicle_types'=>Db::all("SELECT * FROM school_service_vehicle_types ORDER BY sort_order,id"),'vehicle_colors'=>Db::all("SELECT * FROM school_service_vehicle_colors ORDER BY sort_order,id")];});
route('POST','/api/school-service/config',function($p,$b,$u){_ssv_need($u,'edit');_ssv_tables();$type=(string)($b['type']??'');$title=_ssv_norm($b['title']??'');if(!in_array($type,['district','vehicle_type','vehicle_color'],true)||$title==='')Http::error('نوع یا عنوان تنظیم نامعتبر است',422);$table=['district'=>'school_service_districts','vehicle_type'=>'school_service_vehicle_types','vehicle_color'=>'school_service_vehicle_colors'][$type];Db::run("INSERT INTO $table(title,sort_order) VALUES(?,?) ON DUPLICATE KEY UPDATE is_active=1",[$title,(int)($b['sort_order']??99)]);return ['ok'=>true];});
route('DELETE','/api/school-service/config',function($p,$b,$u){_ssv_need($u,'edit');_ssv_tables();$type=(string)($_GET['type']??'');$id=(int)($_GET['id']??0);$table=['district'=>'school_service_districts','vehicle_type'=>'school_service_vehicle_types','vehicle_color'=>'school_service_vehicle_colors'][$type]??'';if(!$table||!$id)Http::error('تنظیم نامعتبر است',422);Db::run("UPDATE $table SET is_active=0 WHERE id=?",[$id]);return ['ok'=>true];});
route('GET','/api/school-service/permissions',function($p,$b,$u){_ssv_need($u,'view');_ssv_tables();if(empty($u['is_admin']) && !in_array(($u['role_title']??''),['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد'],true))Http::error('فقط مدیر سامانه می‌تواند دسترسی‌ها را مدیریت کند.',403);$rows=Db::all("SELECT r.id,r.title,r.level,COALESCE(p.can_view,0) can_view,COALESCE(p.can_create,0) can_create,COALESCE(p.can_edit,0) can_edit,COALESCE(p.can_delete,0) can_delete,COALESCE(p.can_import,0) can_import,COALESCE(p.can_report,0) can_report FROM roles r LEFT JOIN school_service_permissions p ON p.role_id=r.id ORDER BY r.level,r.title");return ['items'=>$rows];});
route('POST','/api/school-service/permissions/{role_id}',function($p,$b,$u){_ssv_need($u,'view');_ssv_tables();if(empty($u['is_admin']) && !in_array(($u['role_title']??''),['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد'],true))Http::error('فقط مدیر سامانه می‌تواند دسترسی‌ها را مدیریت کند.',403);$rid=(int)$p['role_id'];if(!Db::one("SELECT id FROM roles WHERE id=?",[$rid]))Http::error('سمت نامعتبر است',422);$vals=[];foreach(['view','create','edit','delete','import','report'] as $k)$vals[$k]=!empty($b['can_'.$k])?1:0;Db::run("INSERT INTO school_service_permissions(role_id,can_view,can_create,can_edit,can_delete,can_import,can_report) VALUES(?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE can_view=VALUES(can_view),can_create=VALUES(can_create),can_edit=VALUES(can_edit),can_delete=VALUES(can_delete),can_import=VALUES(can_import),can_report=VALUES(can_report)",[$rid,$vals['view'],$vals['create'],$vals['edit'],$vals['delete'],$vals['import'],$vals['report']]);return ['ok'=>true];},false,99);


require_once __DIR__.'/school_service_routes_extra.php';