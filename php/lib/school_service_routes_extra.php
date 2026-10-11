<?php
require_once __DIR__.'/LineImageCompressor.php';
function _ssv_is_certificate_violation_title($title){
 $s=_ssv_norm($title);
 return $s!=='' && (
   mb_strpos($s,'گواهی صلاحیت')!==false ||
   mb_strpos($s,'صلاحیت معتبر')!==false ||
   mb_strpos($s,'داشتن یا نداشتن')!==false
 );
}
function _ssv_filter_violation_rows($rows){
 return array_values(array_filter($rows,function($row){return !_ssv_is_certificate_violation_title($row['title']??'');}));
}
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
 $trendRows=Db::all("SELECT DATE(i.created_at) day_key,COUNT(*) n FROM school_service_inspections i WHERE i.created_at>=DATE_FORMAT(CURDATE(),'%Y-%m-01') AND i.created_at<DATE_ADD(CURDATE(),INTERVAL 1 DAY) AND $where GROUP BY DATE(i.created_at) ORDER BY day_key ASC",$a);
 $trendCounts=[];
 foreach($trendRows as $tr){$trendCounts[(string)$tr['day_key']]=(int)$tr['n'];}
 $trend=[];
 $monthStart=new DateTimeImmutable(date('Y-m-01'));
 $today=new DateTimeImmutable(date('Y-m-d'));
 for($day=$monthStart;$day<=$today;$day=$day->modify('+1 day')){
   $key=$day->format('Y-m-d');
   $trend[]=['ym'=>$key,'n'=>$trendCounts[$key]??0];
 }
 $districtSchools=Db::all("SELECT COALESCE(NULLIF(TRIM(educational_district),''),'نامشخص') label,COUNT(*) n,COALESCE(SUM(student_count),0) students FROM school_service_schools WHERE is_active=1 GROUP BY educational_district ORDER BY n DESC");
 $activeInspectors=[];$activeInspectorCount=0;
 // شمارنده مستقل از کوئری فهرست است؛ خطای JOIN نام/نقش نباید شمارنده را به صفر تبدیل کند.
 try{
   $activeInspectorCount=(int)(Db::one("SELECT COUNT(DISTINCT inspector_user_id) n FROM school_service_inspections WHERE inspector_user_id IS NOT NULL AND created_at>=DATE_SUB(NOW(),INTERVAL 30 DAY)")['n']??0);
 }catch(Throwable $e){error_log('School service active inspector count failed: '.$e->getMessage());}
 try{
   $activeInspectors=Db::all("SELECT u.id,TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) name,COALESCE(r.title,'') role_title,
     (SELECT COUNT(*) FROM school_service_inspections ii WHERE ii.inspector_user_id=u.id) inspection_count,
     (SELECT COUNT(*) FROM school_service_inspections ii WHERE ii.inspector_user_id=u.id AND ii.created_at>=DATE_SUB(NOW(),INTERVAL 30 DAY)) inspection_count_30d
     FROM users u JOIN (SELECT DISTINCT inspector_user_id FROM school_service_inspections WHERE inspector_user_id IS NOT NULL AND created_at>=DATE_SUB(NOW(),INTERVAL 30 DAY)) recent ON recent.inspector_user_id=u.id
     LEFT JOIN roles r ON r.id=u.role_id
     ORDER BY inspection_count_30d DESC,inspection_count DESC,name ASC");
 }catch(Throwable $e){$activeInspectors=[];error_log('School service active inspector list failed: '.$e->getMessage());}
 return ['cards'=>['active_schools'=>$activeSchools,'students'=>$studentTotal,'active_companies'=>$activeCompanies,'active_vehicles'=>$activeVehicles,'inspections'=>$inspections,'inspections_30d'=>$inspections30,'active_inspectors'=>$activeInspectorCount,'violations'=>$violations,'invalid_certificates'=>$invalidCert,'avg_violations_per_inspection'=>$avgViol],
   'by_district'=>$byDistrict,'by_company'=>$byCompany,'by_violation'=>$byViolation,'by_school'=>$bySchool,'vehicle_types'=>$vehicleTypes,'certificates'=>$certificates,'trend'=>$trend,'district_schools'=>$districtSchools,'active_inspectors'=>$activeInspectors,'generated_at'=>date('Y-m-d H:i:s')];
});
route('GET','/api/school-service/inspections/{id}',function($p,$b,$u){
 _ssv_need($u,'view');_ssv_tables();$id=(int)$p['id'];
 $r=Db::one("SELECT i.*,s.name school_name,s.code school_code,s.latitude school_latitude,s.longitude school_longitude,s.address school_address,c.name company_name,TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) inspector_name,COALESCE(rl.title,'') inspector_role FROM school_service_inspections i LEFT JOIN school_service_schools s ON s.id=i.school_id LEFT JOIN school_service_companies c ON c.id=i.company_id LEFT JOIN users u ON u.id=i.inspector_user_id LEFT JOIN roles rl ON rl.id=u.role_id WHERE i.id=?",[$id]);
 if(!$r)Http::error('بازدید پیدا نشد',404);
 if((int)$r['inspector_user_id']!==(int)$u['id']&&!_ssv_role_is_admin($u))Http::error('این بازدید متعلق به حساب شما نیست.',403);
 $r['violations']=_ssv_filter_violation_rows(Db::all("SELECT v.id,v.title FROM school_service_inspection_violations x JOIN school_service_violation_types v ON v.id=x.violation_type_id WHERE x.inspection_id=? ORDER BY v.sort_order,v.id",[$id]));
 $r['photos']=Db::all("SELECT id,file_path,mime_type,width,height,file_size,created_at FROM school_service_inspection_photos WHERE inspection_id=? ORDER BY id",[$id]);
 foreach($r['photos'] as &$photo){$rawPath=(string)($photo['file_path']??'');$photo['file_path']=$rawPath!==''?('/api/media?path='.rawurlencode(ltrim($rawPath,'/'))):null;}unset($photo);
 $r['plate']=trim(($r['plate_three']??'').' '.($r['plate_letter']??'').' '.($r['plate_two']??'').' ایران '.($r['plate_region_code']??''));
 return $r;
});
route('GET','/api/school-service/district-boundaries',function($p,$b,$u){
 _ssv_need($u,'view');_ssv_tables();
 $rows=Db::all("SELECT district_id,title,points_json,updated_at FROM school_service_district_boundaries WHERE is_active=1 ORDER BY district_id");
 $items=[];
 foreach($rows as $r){
   $points=json_decode((string)($r['points_json']??''),true);
   if(!is_array($points)||count($points)<3)continue;
   $clean=[];
   foreach($points as $p){
     if(!is_array($p)||count($p)<2)continue;
     $lat=(float)$p[0];$lng=(float)$p[1];
     if(is_finite($lat)&&is_finite($lng))$clean[]=[$lat,$lng];
   }
   if(count($clean)>=3)$items[]=['district_id'=>(int)$r['district_id'],'title'=>(string)$r['title'],'points'=>$clean,'updated_at'=>$r['updated_at']];
 }
 return ['items'=>$items,'total'=>count($items),'generated_at'=>date('c')];
});

route('GET','/api/school-service/inspection-map',function($p,$b,$u){
 _ssv_need($u,'view');_ssv_tables();
 $rows=Db::all("SELECT s.id,s.name,s.code,s.educational_district,s.gender,s.address,s.latitude,s.longitude,
   COUNT(DISTINCT i.id) inspection_count,MAX(i.created_at) last_inspection_at,
   (SELECT TRIM(CONCAT(COALESCE(u2.first_name,''),' ',COALESCE(u2.last_name,''))) FROM school_service_inspections i2 LEFT JOIN users u2 ON u2.id=i2.inspector_user_id WHERE i2.school_id=s.id ORDER BY i2.id DESC LIMIT 1) last_inspector
   FROM school_service_schools s JOIN school_service_inspections i ON i.school_id=s.id
   WHERE s.is_active=1 AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL
   GROUP BY s.id ORDER BY last_inspection_at DESC");
 foreach($rows as &$r){$r['inspection_count']=(int)$r['inspection_count'];}
 unset($r);
 $boundaries=[];
 $br=Db::all("SELECT district_id,title,points_json,updated_at FROM school_service_district_boundaries WHERE is_active=1 ORDER BY district_id");
 foreach($br as $bb){
   $pts=json_decode((string)($bb['points_json']??''),true);
   if(!is_array($pts)||count($pts)<3)continue;
   $clean=[];
   foreach($pts as $pp){
     if(!is_array($pp)||count($pp)<2)continue;
     $lat=(float)$pp[0];$lng=(float)$pp[1];
     if(is_finite($lat)&&is_finite($lng))$clean[]=[$lat,$lng];
   }
   if(count($clean)>=3)$boundaries[]=['district_id'=>(int)$bb['district_id'],'title'=>(string)$bb['title'],'points'=>$clean,'updated_at'=>$bb['updated_at']];
 }
 return ['items'=>$rows,'total'=>count($rows),'district_boundaries'=>$boundaries,'generated_at'=>date('Y-m-d H:i:s')];
});
// API سوابق بازدید هر مدرسه؛ برای دکمه «سوابق بازدید» در پنجرهٔ نقشه.
// این کتابخانه در استقرار تولید از مسیر نصب امن سمت PHP و کنترل checksum به‌روزرسانی می‌شود.
route('GET','/api/school-service/schools/{id}/inspections',function($p,$b,$u){
 _ssv_need($u,'view');_ssv_tables();$schoolId=(int)$p['id'];
 $school=Db::one("SELECT id,name,educational_district FROM school_service_schools WHERE id=? AND is_active=1",[$schoolId]);
 if(!$school)Http::error('مدرسه پیدا نشد.',404);
 $total=(int)(Db::one("SELECT COUNT(*) n FROM school_service_inspections WHERE school_id=?",[$schoolId])['n']??0);
 $items=Db::all("SELECT i.id,i.school_id,i.educational_district,i.plate_three,i.plate_letter,i.plate_two,i.plate_region_code,i.violation_date,i.violation_time,i.created_at,i.company_id,c.name company_name,TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) inspector_name FROM school_service_inspections i LEFT JOIN school_service_companies c ON c.id=i.company_id LEFT JOIN users u ON u.id=i.inspector_user_id WHERE i.school_id=? ORDER BY i.id DESC LIMIT 500",[$schoolId]);
 foreach($items as &$item){
  $item['plate']=trim(($item['plate_three']??'').' '.($item['plate_letter']??'').' '.($item['plate_two']??'').' ایران '.($item['plate_region_code']??''));
  $item['violations']=array_column(_ssv_filter_violation_rows(Db::all("SELECT v.id,v.title FROM school_service_inspection_violations x JOIN school_service_violation_types v ON v.id=x.violation_type_id WHERE x.inspection_id=? ORDER BY v.sort_order,v.id",[(int)$item['id']])),'title');
 }
 unset($item);
 return ['school'=>$school,'items'=>$items,'total'=>$total];
});
route('POST','/api/school-service/schools/{id}/location',function($p,$b,$u){_ssv_need($u,'create');_ssv_tables();$id=(int)$p['id'];$s=Db::one("SELECT id FROM school_service_schools WHERE id=? AND is_active=1",[$id]);if(!$s)Http::error('مدرسه یافت نشد',404);[$lat,$lng]=validGeo($b['latitude']??null,$b['longitude']??null);if($lat===null||$lng===null)Http::error('مختصات مدرسه معتبر نیست.',422);Db::run("UPDATE school_service_schools SET latitude=?,longitude=?,location_registered_at=? WHERE id=?",[$lat,$lng,date('Y-m-d H:i:s'),$id]);return ['ok'=>true,'id'=>$id,'latitude'=>$lat,'longitude'=>$lng,'location_registered_at'=>date('Y-m-d H:i:s')];},false,99);
route('POST','/api/school-service/inspections-with-photo',function($p,$b,$u){
 _ssv_need($u,'create');_ssv_tables();
 $body=is_array($b)?$b:[];_ssv_require_inspection_core($body);$viol=$body['violation_ids']??[];if(is_string($viol))$viol=json_decode($viol,true)?:[];$body['violation_ids']=$viol;
 $clientUuid=_ssv_norm($body['client_uuid']??($_SERVER['HTTP_X_CLIENT_UUID']??''));if($clientUuid!==''){
   $existing=Db::one("SELECT id FROM school_service_inspections WHERE client_uuid=?",[$clientUuid]);
   if($existing){
     $photo=Db::one("SELECT file_path,file_size FROM school_service_inspection_photos WHERE inspection_id=? ORDER BY id LIMIT 1",[(int)$existing['id']]);
     if($photo&& !empty($photo['file_path']))$photo['file_path']='/api/media?path='.rawurlencode(ltrim((string)$photo['file_path'],'/'));return ['ok'=>true,'id'=>(int)$existing['id'],'duplicate'=>true,'photo'=>$photo?:null];
   }
 }
 [$a,$l,$pc,$r]=_ssv_plate($body);$schoolId=(int)($body['school_id']??0);$companyId=(int)($body['company_id']??0);if(!$schoolId)$schoolId=null;if(!$companyId)$companyId=null;
 $district=_ssv_district_key($body['educational_district']??'');if($district===''||!_ssv_valid_district($district))Http::error('ناحیه آموزشی انتخاب‌شده معتبر یا فعال نیست.',422);
 $vehicleType=_ssv_norm($body['vehicle_type_custom']??'')?:_ssv_norm($body['vehicle_type']??'');$vehicleTypeCustom=!empty($body['vehicle_type_custom']);if($vehicleTypeCustom){if($vehicleType==='')Http::error('نوع خودرو سایر باید وارد شود.',422);if(mb_strlen($vehicleType)>100)Http::error('نوع خودرو واردشده بیش از حد مجاز است.',422);}elseif($vehicleType!==''&&!_ssv_valid_option('school_service_vehicle_types',$vehicleType))Http::error('نوع خودرو انتخاب‌شده معتبر یا فعال نیست.',422);
 $vehicleColor=_ssv_norm($body['vehicle_color_custom']??'')?:_ssv_norm($body['vehicle_color']??'');$vehicleColorCustom=!empty($body['vehicle_color_custom']);if($vehicleColorCustom){if($vehicleColor==='')Http::error('رنگ خودرو سایر باید وارد شود.',422);if(mb_strlen($vehicleColor)>80)Http::error('رنگ خودرو واردشده بیش از حد مجاز است.',422);}elseif($vehicleColor!==''&&!_ssv_valid_option('school_service_vehicle_colors',$vehicleColor))Http::error('رنگ خودرو انتخاب‌شده معتبر یا فعال نیست.',422);
 _ssv_school_company_validate($schoolId??0,$companyId??0,$district);
 $gender=in_array($body['school_gender']??'',['دخترانه','پسرانه','نامشخص'],true)?$body['school_gender']:'نامشخص';$dg=in_array($body['driver_gender']??'',['خانم','آقا','نامشخص'],true)?$body['driver_gender']:'نامشخص';$cert=in_array($body['certificate_status']??'',['معتبر','نامعتبر','ارائه نشد'],true)?$body['certificate_status']:'ارائه نشد';
 [$passFront,$passRear,$pass]=_ssv_passengers($body);$date=_ssv_en($body['violation_date']??'');$time=_ssv_en(trim((string)($body['violation_time']??'')));if($date!==''&&!preg_match('/^14\d{2}[\/-]\d{1,2}[\/-]\d{1,2}$/',$date))Http::error('تاریخ ثبت تخلف نامعتبر است.',422);if($time!==''&&!preg_match('/^(?:[01]?\d|2[0-3]):[0-5]\d$/',$time))Http::error('ساعت ثبت تخلف نامعتبر است.',422);[$lat,$lng]=validGeo($body['latitude']??null,$body['longitude']??null);
 $useSchoolLocation=!empty($body['use_school_location']);$locationText=_ssv_norm($body['location_text']??'')?:null;if($useSchoolLocation){if(!$schoolId)Http::error('برای استفاده از مکان مدرسه، ابتدا مدرسه را انتخاب کنید.',422);$schoolLoc=Db::one("SELECT latitude,longitude,address FROM school_service_schools WHERE id=? AND is_active=1",[$schoolId]);if(!$schoolLoc||$schoolLoc['latitude']===null||$schoolLoc['longitude']===null)Http::error('موقعیت این مدرسه ثبت نشده است؛ ابتدا موقعیت مدرسه را اصلاح یا ثبت کنید.',422);$lat=(float)$schoolLoc['latitude'];$lng=(float)$schoolLoc['longitude'];$locationText=_ssv_norm($schoolLoc['address']??'')?:'مکان مدرسه';}else{[$lat,$lng]=validGeo($body['latitude']??null,$body['longitude']??null);}
 $raw=null;$photoData=_ssv_norm($b['photo_data']??'');if($photoData!==''){if(!preg_match('#^data:image/(?:jpeg|jpg|png|webp);base64,#i',$photoData))Http::error('فرمت تصویر پشتیبانی نمی‌شود.',422);$raw=base64_decode(preg_replace('#^data:image/[^;]+;base64,#i','',$photoData),true);if(!is_string($raw)||$raw===''||strlen($raw)>20*1024*1024||@getimagesizefromstring($raw)===false)Http::error('تصویر خودرو معتبر یا قابل پردازش نیست.',422);}else{$f=$_FILES['file']??null;if(!$f||($f['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK)Http::error('تصویر خودرو دریافت نشد.',422);if(($f['size']??0)>20*1024*1024)Http::error('حجم فایل اولیه بیش از حد مجاز است.',422);$raw=@file_get_contents($f['tmp_name']);if(!is_string($raw)||$raw===''||@getimagesizefromstring($raw)===false)Http::error('فرمت تصویر پشتیبانی نمی‌شود.',422);}
 $pdo=Db::pdo();$pdo->beginTransaction();$path=null;
 try{
   Db::run("INSERT INTO school_service_inspections(inspector_user_id,client_uuid,educational_district,company_id,school_id,school_gender,plate_three,plate_letter,plate_two,iran_code,plate_region_code,vehicle_type,vehicle_color,passenger_count,passenger_front_count,passenger_rear_count,driver_gender,certificate_status,violation_date,violation_time,location_text,latitude,longitude,description) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",[(int)$u['id'],$clientUuid?:null,$district,$companyId,$schoolId,$gender,$a,$l,$pc,'ایران',$r,$vehicleType,$vehicleColor,$pass,$passFront,$passRear,$dg,$cert,$date?:null,$time?:null,$locationText,$lat,$lng,trim((string)($body['description']??''))?:null]);
   $id=(int)$pdo->lastInsertId();
   foreach((array)$viol as $vid){$vid=(int)$vid;if(Db::one("SELECT id FROM school_service_violation_types WHERE id=? AND is_active=1",[$vid]))Db::run("INSERT IGNORE INTO school_service_inspection_violations(inspection_id,violation_type_id) VALUES(?,?)",[$id,$vid]);}
   $dir=__DIR__.'/../public/uploads/school-service';if(!is_dir($dir)&&!@mkdir($dir,0755,true))throw new RuntimeException('پوشه ذخیره تصاویر قابل ایجاد نیست.');
   $name='inspection_'.$id.'_'.bin2hex(random_bytes(8)).'.jpg';$path=$dir.'/'.$name;if(!LineImageCompressor::fromBinary($raw,$path))throw new RuntimeException('فشرده‌سازی تصویر با تنظیمات عمومی سایت ناموفق بود.');
   $info=@getimagesize($path);$size=(int)(@filesize($path)?:0);$rel='/uploads/school-service/'.$name;Db::run("INSERT INTO school_service_inspection_photos(inspection_id,file_path,mime_type,width,height,file_size) VALUES(?,?,?,?,?,?)",[$id,$rel,'image/jpeg',(int)($info[0]??0),(int)($info[1]??0),$size]);
   _ssv_sync_vehicle_from_inspection($id);
   $pdo->commit();return ['ok'=>true,'id'=>$id,'photo'=>['file_path'=>$rel,'file_size'=>$size]];
 }catch(Throwable $e){if($path)@unlink($path);if($pdo->inTransaction())$pdo->rollBack();throw $e;}
},false,99);
route('POST','/api/school-service/inspections',function($p,$b,$u){
 _ssv_need($u,'create');_ssv_tables();$body=is_array($b)?$b:[];_ssv_require_inspection_core($body);
 $viol=$body['violation_ids']??[];if(is_string($viol))$viol=json_decode($viol,true)?:[];$viol=array_values(array_unique(array_map('intval',(array)$viol)));
 [$a,$l,$pc,$r]=_ssv_plate($body);$schoolId=(int)($body['school_id']??0);$companyId=(int)($body['company_id']??0);if(!$schoolId)$schoolId=null;if(!$companyId)$companyId=null;
 $district=_ssv_district_key($body['educational_district']??'');if($district===''||!_ssv_valid_district($district))Http::error('ناحیه آموزشی انتخاب‌شده معتبر یا فعال نیست.',422);_ssv_school_company_validate($schoolId??0,$companyId??0,$district);
 $vehicleType=_ssv_norm($body['vehicle_type_custom']??'')?:_ssv_norm($body['vehicle_type']??'');$vehicleColor=_ssv_norm($body['vehicle_color_custom']??'')?:_ssv_norm($body['vehicle_color']??'');
 if($vehicleType!==''&&!_ssv_valid_option('school_service_vehicle_types',$vehicleType)&&$vehicleType!=='سایر')Http::error('نوع خودرو انتخاب‌شده معتبر نیست.',422);
 if($vehicleColor!==''&&!_ssv_valid_option('school_service_vehicle_colors',$vehicleColor)&&$vehicleColor!=='سایر')Http::error('رنگ خودرو انتخاب‌شده معتبر نیست.',422);
 $gender=in_array($body['school_gender']??'',['دخترانه','پسرانه','نامشخص'],true)?$body['school_gender']:'نامشخص';$dg=in_array($body['driver_gender']??'',['خانم','آقا','نامشخص'],true)?$body['driver_gender']:'نامشخص';$cert=in_array($body['certificate_status']??'',['معتبر','نامعتبر','ارائه نشد'],true)?$body['certificate_status']:'ارائه نشد';
 [$passFront,$passRear,$pass]=_ssv_passengers($body);$date=_ssv_en($body['violation_date']??'');$time=_ssv_en(trim((string)($body['violation_time']??'')));if($date!==''&&!preg_match('/^14\\d{2}[\\/-]\\d{1,2}[\\/-]\\d{1,2}$/',$date))Http::error('تاریخ ثبت تخلف نامعتبر است.',422);if($time!==''&&!preg_match('/^(?:[01]?\\d|2[0-3]):[0-5]\\d$/',$time))Http::error('ساعت ثبت تخلف نامعتبر است.',422);
 $useSchool=!empty($body['use_school_location']);$locationText=_ssv_norm($body['location_text']??'')?:null;[$lat,$lng]=validGeo($body['latitude']??null,$body['longitude']??null);
 if($useSchool){$sl=$schoolId?Db::one("SELECT latitude,longitude,address FROM school_service_schools WHERE id=? AND is_active=1",[$schoolId]):null;if(!$sl||$sl['latitude']===null||$sl['longitude']===null)Http::error('موقعیت مدرسه ثبت نشده است؛ ابتدا موقعیت مدرسه را اصلاح یا ثبت کنید.',422);$lat=(float)$sl['latitude'];$lng=(float)$sl['longitude'];$locationText=_ssv_norm($sl['address']??'')?:'مکان مدرسه';}
 $uuid=_ssv_norm($body['client_uuid']??($_SERVER['HTTP_X_CLIENT_UUID']??''));if($uuid!==''){ $ex=Db::one("SELECT id FROM school_service_inspections WHERE client_uuid=? LIMIT 1",[$uuid]);if($ex)return ['ok'=>true,'id'=>(int)$ex['id'],'duplicate'=>true];}
 $pdo=Db::pdo();$pdo->beginTransaction();
 try{
  Db::run("INSERT INTO school_service_inspections(inspector_user_id,client_uuid,educational_district,company_id,school_id,school_gender,plate_three,plate_letter,plate_two,iran_code,plate_region_code,vehicle_type,vehicle_color,passenger_count,passenger_front_count,passenger_rear_count,driver_gender,certificate_status,violation_date,violation_time,location_text,latitude,longitude,description) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",[(int)$u['id'],$uuid?:null,$district,$companyId,$schoolId,$gender,$a,$l,$pc,'ایران',$r,$vehicleType?:null,$vehicleColor?:null,$pass,$passFront,$passRear,$dg,$cert,$date?:null,$time?:null,$locationText,$lat,$lng,trim((string)($body['description']??''))?:null]);
  $id=(int)$pdo->lastInsertId();
  foreach($viol as $vid)if(Db::one("SELECT id FROM school_service_violation_types WHERE id=? AND is_active=1",[$vid]))Db::run("INSERT IGNORE INTO school_service_inspection_violations(inspection_id,violation_type_id) VALUES(?,?)",[$id,$vid]);
  _ssv_sync_vehicle_from_inspection($id);$pdo->commit();return ['ok'=>true,'id'=>$id,'photo'=>null];
 }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
},false,99);
route('POST','/api/school-service/inspections/{id}/photos',function($p,$b,$u){
 _ssv_need($u,'create');_ssv_tables();$id=(int)$p['id'];$owner=Db::one("SELECT inspector_user_id FROM school_service_inspections WHERE id=?",[$id]);if(!$owner)Http::error('بازدید پیدا نشد',404);if((int)$owner['inspector_user_id']!==(int)$u['id']&&!_ssv_role_is_admin($u))Http::error('این بازدید متعلق به حساب شما نیست.',403);
 // محدودیت تصویر از تنظیمات عمومی تصاویر سایت خوانده می‌شود؛ تنظیم موازی برای سرویس مدارس وجود ندارد.
 $set=LineImageCompressor::settings();
 $count=(int)(Db::one("SELECT COUNT(*) n FROM school_service_inspection_photos WHERE inspection_id=?",[$id])['n']??0);if($count>=1)Http::error('برای هر بازدید فقط یک تصویر خودرو مجاز است.',422);
 $raw=null;$photoData=_ssv_norm($b['photo_data']??'');if($photoData!==''){if(!preg_match('#^data:image/(?:jpeg|jpg|png|webp);base64,#i',$photoData))Http::error('فرمت تصویر پشتیبانی نمی‌شود.',422);$raw=base64_decode(preg_replace('#^data:image/[^;]+;base64,#i','',$photoData),true);if(!is_string($raw)||$raw===''||strlen($raw)>20*1024*1024||@getimagesizefromstring($raw)===false)Http::error('تصویر خودرو معتبر یا قابل پردازش نیست.',422);}else{$f=$_FILES['file']??null;if(!$f||($f['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK)Http::error('تصویر خودرو دریافت نشد.',422);if(($f['size']??0)>20*1024*1024)Http::error('حجم فایل اولیه بیش از حد مجاز است.',422);$raw=@file_get_contents($f['tmp_name']);if(!is_string($raw)||$raw===''||@getimagesizefromstring($raw)===false)Http::error('فرمت تصویر پشتیبانی نمی‌شود.',422);}
 $dir=__DIR__.'/../public/uploads/school-service';if(!is_dir($dir)&&!@mkdir($dir,0755,true))Http::error('پوشه ذخیره تصاویر قابل ایجاد نیست.',500);
 $name='inspection_'.$id.'_'.bin2hex(random_bytes(8)).'.jpg';$path=$dir.'/'.$name;
 if(!LineImageCompressor::fromBinary($raw,$path)){@unlink($path);Http::error('فشرده‌سازی تصویر با تنظیمات عمومی سایت ناموفق بود.',500);}
 $info=@getimagesize($path);$nw=(int)($info[0]??0);$nh=(int)($info[1]??0);$size=(int)(@filesize($path)?:0);
 $rel='/uploads/school-service/'.$name;Db::run("INSERT INTO school_service_inspection_photos(inspection_id,file_path,mime_type,width,height,file_size) VALUES(?,?,?,?,?,?)",[$id,$rel,'image/jpeg',$nw,$nh,$size]);$pid=(int)Db::pdo()->lastInsertId();
 return ['ok'=>true,'id'=>$pid,'file_path'=>$rel,'width'=>$nw,'height'=>$nh,'file_size'=>$size,'image_settings'=>['quality'=>(int)$set['quality'],'max_width'=>(int)$set['max_width'],'max_height'=>(int)$set['max_height']]];
});
route('PUT','/api/school-service/inspections/{id}',function($p,$b,$u){
 _ssv_need($u,'edit');_ssv_tables();$id=(int)$p['id'];$owner=Db::one("SELECT inspector_user_id FROM school_service_inspections WHERE id=?",[$id]);if(!$owner)Http::error('بازدید پیدا نشد',404);if((int)$owner['inspector_user_id']!==(int)$u['id']&&!_ssv_role_is_admin($u))Http::error('این بازدید متعلق به حساب شما نیست.',403);[$a,$l,$c,$r]=_ssv_plate($b);$viol=$b['violation_ids']??[];if(is_string($viol))$viol=json_decode($viol,true)?:[];$viol=array_values(array_unique(array_map('intval',(array)$viol)));$useSchoolLocation=!empty($b['use_school_location']);$locationText=_ssv_norm($b['location_text']??'')?:null;if($useSchoolLocation){$sid=(int)($b['school_id']??0);$schoolLoc=$sid?Db::one("SELECT latitude,longitude,address FROM school_service_schools WHERE id=? AND is_active=1",[$sid]):null;if(!$schoolLoc||$schoolLoc['latitude']===null||$schoolLoc['longitude']===null)Http::error('موقعیت مدرسه ثبت نشده است؛ ابتدا موقعیت مدرسه را اصلاح یا ثبت کنید.',422);$lat=(float)$schoolLoc['latitude'];$lng=(float)$schoolLoc['longitude'];$locationText=_ssv_norm($schoolLoc['address']??'')?:'مکان مدرسه';}else{[$lat,$lng]=validGeo($b['latitude']??null,$b['longitude']??null);}$g=in_array($b['school_gender']??'',['دخترانه','پسرانه','نامشخص'],true)?$b['school_gender']:'نامشخص';[$passFront,$passRear,$pass]=_ssv_passengers($b);$dg=in_array($b['driver_gender']??'',['خانم','آقا','نامشخص'],true)?$b['driver_gender']:'نامشخص';$cert=in_array($b['certificate_status']??'',['معتبر','نامعتبر','ارائه نشد'],true)?$b['certificate_status']:'ارائه نشد';$date=_ssv_en($b['violation_date']??'');if($date!==''&&!preg_match('/^14\d{2}[\/-]\d{1,2}[\/-]\d{1,2}$/',$date))Http::error('تاریخ ثبت تخلف نامعتبر است.',422);$time=_ssv_en(trim((string)($b['violation_time']??'')));if($time!==''&&!preg_match('/^(?:[01]?\d|2[0-3]):[0-5]\d$/',$time))Http::error('ساعت ثبت تخلف نامعتبر است.',422);$district=_ssv_district_key($b['educational_district']??'');if($district===''||!_ssv_valid_district($district))Http::error('ناحیه آموزشی انتخاب‌شده معتبر یا فعال نیست.',422);_ssv_school_company_validate(!empty($b['school_id'])?(int)$b['school_id']:0,!empty($b['company_id'])?(int)$b['company_id']:0,$district);
 Db::run("UPDATE school_service_inspections SET educational_district=?,company_id=?,school_id=?,school_gender=?,plate_three=?,plate_letter=?,plate_two=?,plate_region_code=?,vehicle_type=?,vehicle_color=?,passenger_count=?,passenger_front_count=?,passenger_rear_count=?,driver_gender=?,certificate_status=?,violation_date=?,violation_time=?,location_text=?,latitude=?,longitude=?,description=? WHERE id=?",[$district,!empty($b['company_id'])?(int)$b['company_id']:null,!empty($b['school_id'])?(int)$b['school_id']:null,$g,$a,$l,$c,$r,_ssv_norm($b['vehicle_type']??''),_ssv_norm($b['vehicle_color']??''),$pass,$passFront,$passRear,$dg,$cert,$date?:null,trim((string)($b['violation_time']??''))?:null,$locationText,$lat,$lng,trim((string)($b['description']??''))?:null,$id]);Db::run("DELETE FROM school_service_inspection_violations WHERE inspection_id=?",[$id]);foreach($viol as $vid)if(Db::one("SELECT id FROM school_service_violation_types WHERE id=? AND is_active=1",[$vid]))Db::run("INSERT IGNORE INTO school_service_inspection_violations(inspection_id,violation_type_id) VALUES(?,?)",[$id,$vid]);return ['ok'=>true,'id'=>$id];
});
route('DELETE','/api/school-service/inspections/{id}',function($p,$b,$u){_ssv_need($u,'delete');_ssv_tables();$id=(int)$p['id'];$owner=Db::one("SELECT inspector_user_id FROM school_service_inspections WHERE id=?",[$id]);if(!$owner)Http::error('بازدید پیدا نشد',404);if((int)$owner['inspector_user_id']!==(int)$u['id']&&!_ssv_role_is_admin($u))Http::error('این بازدید متعلق به حساب شما نیست.',403);Db::run("DELETE FROM school_service_inspections WHERE id=?",[$id]);return ['ok'=>true];});
route('POST','/api/school-service/import-preview',function($p,$b,$u){
 _ssv_need($u,'import');_ssv_tables();$sheets=_ssv_xlsx_rows($_FILES['file']??null);$records=[];$sheetCounts=[];foreach($sheets as $name=>$rows){$rs=_ssv_sheet_records($rows);$sheetCounts[$name]=count($rs);$records=array_merge($records,$rs);}$companies=[];$schools=[];$maps=[];$errors=[];$duplicateRows=0;$newCompanies=[];$existingCompanies=[];$newSchools=[];$existingSchools=[];$newMappings=[];$existingMappings=[];foreach($records as $i=>$r){$cn=_ssv_norm($r['company']);$sn=_ssv_norm($r['school']);$district=_ssv_district_key($r['district']);if($district===''||!_ssv_valid_district($district)){$errors[]='ردیف '.($i+2).' ناحیه آموزشی نامعتبر است: '.($r['district']??'');if(count($errors)>=100)break;continue;}if($cn){$companies[$cn]=1;$co=Db::one("SELECT id FROM school_service_companies WHERE name=?",[$cn]);if($co)$existingCompanies[$cn]=1;else$newCompanies[$cn]=1;}if($sn){$schools[$sn]=1;$school=null;if(_ssv_norm($r['code'])!=='')$school=Db::one("SELECT id FROM school_service_schools WHERE code=?",[_ssv_norm($r['code'])]);if(!$school)$school=Db::one("SELECT id FROM school_service_schools WHERE name=? AND educational_district=?",[$sn,$district]);if($school)$existingSchools[$sn]=1;else$newSchools[$sn]=1;}if($cn&&$sn){$key=$sn.'|'.$cn;if(isset($maps[$key])){$duplicateRows++;}else{$maps[$key]=1;$co=$cn?Db::one("SELECT id FROM school_service_companies WHERE name=?",[$cn]):null;$sch=null;if(_ssv_norm($r['code'])!=='')$sch=Db::one("SELECT id FROM school_service_schools WHERE code=?",[_ssv_norm($r['code'])]);if(!$sch)$sch=Db::one("SELECT id FROM school_service_schools WHERE name=? AND educational_district=?",[$sn,$district]);if($co&&$sch){$existingMap=Db::one("SELECT company_id FROM school_service_school_companies WHERE school_id=?",[(int)$sch['id']]);if($existingMap&&(int)$existingMap['company_id']===(int)$co['id'])$existingMappings[$key]=1;else$newMappings[$key]=1;}else$newMappings[$key]=1;}}else if($sn==='') $errors[]='ردیف '.($i+2).' نام مدرسه ندارد';if(count($errors)>=100)break;}return ['ok'=>true,'rows'=>count($records),'companies_count'=>count($companies),'schools_count'=>count($schools),'mappings_count'=>count($maps),'new_companies'=>count($newCompanies),'existing_companies'=>count($existingCompanies),'new_schools'=>count($newSchools),'existing_schools'=>count($existingSchools),'new_mappings'=>count($newMappings),'existing_mappings'=>count($existingMappings),'duplicate_rows'=>$duplicateRows,'errors'=>$errors,'sheets'=>$sheetCounts];
},false,99);
route('GET','/api/school-service/export-filtered',function($p,$b,$u){
 _ssv_need($u,'report');_ssv_tables();$q=_ssv_norm($_GET['search']??'');$district=_ssv_district_key($_GET['district']??'');$company=(int)($_GET['company_id']??0);$w=['1=1'];$a=[];if($q!==''){$w[]='(s.name LIKE ? OR c.name LIKE ? OR i.location_text LIKE ? OR CONCAT(i.plate_three,i.plate_letter,i.plate_two) LIKE ?)';array_push($a,'%'.$q.'%','%'.$q.'%','%'.$q.'%','%'.$q.'%');}if($district!==''){$w[]=_ssv_district_sql('i.educational_district').'=?';$a[]=_ssv_district_key($district);}if($company){$w[]='i.company_id=?';$a[]=$company;}
 $rows=Db::all("SELECT i.*,s.name school_name,c.name company_name,TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) inspector_name FROM school_service_inspections i LEFT JOIN school_service_schools s ON s.id=i.school_id LEFT JOIN school_service_companies c ON c.id=i.company_id LEFT JOIN users u ON u.id=i.inspector_user_id WHERE ".implode(' AND ',$w)." ORDER BY i.id DESC LIMIT 20000",$a);$head=['ردیف','ناحیه','شرکت','نوع مدرسه','مدرسه','پلاک','نوع خودرو','رنگ خودرو','تخلفات','سرنشین جلو','سرنشین عقب','مجموع سرنشین','نوع راننده','وضعیت گواهی صلاحیت','تاریخ','ساعت','محل ثبت تخلف','توضیحات','بازرس'];$out=[];foreach($rows as $i=>$r){$vs=Db::all("SELECT v.title FROM school_service_inspection_violations x JOIN school_service_violation_types v ON v.id=x.violation_type_id WHERE x.inspection_id=?",[(int)$r['id']]);$out[]=[$i+1,$r['educational_district'],$r['company_name'],$r['school_gender'],$r['school_name'],trim(($r['plate_three']??'').' '.($r['plate_letter']??'').' '.($r['plate_two']??'').' ایران '.($r['plate_region_code']??'')),$r['vehicle_type'],$r['vehicle_color'],implode('، ',array_column($vs,'title')),($r['passenger_front_count']??0),($r['passenger_rear_count']??0),($r['passenger_count']??((int)($r['passenger_front_count']??0)+(int)($r['passenger_rear_count']??0))),$r['driver_gender'],$r['certificate_status'],$r['violation_date'],$r['violation_time'],$r['location_text'],$r['description'],$r['inspector_name']];}$xw=new XlsxWriter($head);foreach($out as $row)$xw->addRow($row);$xw->output('سرویس_مدارس_بازدیدهای_فیلترشده.xlsx','بازدیدها');
},false,99);
