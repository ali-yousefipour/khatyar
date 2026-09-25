<?php
require_once __DIR__.'/LineImageCompressor.php';
route('GET','/api/school-service/dashboard',function($p,$b,$u){
 _ssv_need($u,'view');_ssv_tables();$district=_ssv_norm($_GET['district']??'');$company=(int)($_GET['company_id']??0);$w=['1=1'];$a=[];if($district!==''){$w[]='i.educational_district=?';$a[]=$district;}if($company){$w[]='i.company_id=?';$a[]=$company;}$where=implode(' AND ',$w);
 $total=(int)(Db::one("SELECT COUNT(*) n FROM school_service_inspections i WHERE $where",$a)['n']??0);$viol=(int)(Db::one("SELECT COUNT(*) n FROM school_service_inspection_violations x JOIN school_service_inspections i ON i.id=x.inspection_id WHERE $where",$a)['n']??0);
 return ['total_inspections'=>$total,'total_violations'=>$viol,'by_district'=>Db::all("SELECT i.educational_district label,COUNT(*) n FROM school_service_inspections i WHERE $where GROUP BY i.educational_district ORDER BY n DESC",$a),'by_company'=>Db::all("SELECT COALESCE(c.name,'نامشخص') label,COUNT(*) n FROM school_service_inspections i LEFT JOIN school_service_companies c ON c.id=i.company_id WHERE $where GROUP BY i.company_id,c.name ORDER BY n DESC LIMIT 20",$a),'by_violation'=>Db::all("SELECT v.title label,COUNT(*) n FROM school_service_inspection_violations x JOIN school_service_violation_types v ON v.id=x.violation_type_id JOIN school_service_inspections i ON i.id=x.inspection_id WHERE $where GROUP BY v.id,v.title ORDER BY n DESC",$a),'by_school'=>Db::all("SELECT COALESCE(s.name,'نامشخص') label,COUNT(*) n FROM school_service_inspections i LEFT JOIN school_service_schools s ON s.id=i.school_id WHERE $where GROUP BY i.school_id,s.name ORDER BY n DESC LIMIT 20",$a)];
});
route('GET','/api/school-service/inspections/{id}',function($p,$b,$u){
 _ssv_need($u,'view');_ssv_tables();$id=(int)$p['id'];$r=Db::one("SELECT i.*,s.name school_name,s.code school_code,c.name company_name,TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) inspector_name FROM school_service_inspections i LEFT JOIN school_service_schools s ON s.id=i.school_id LEFT JOIN school_service_companies c ON c.id=i.company_id LEFT JOIN users u ON u.id=i.inspector_user_id WHERE i.id=?",[$id]);if(!$r)Http::error('بازدید پیدا نشد',404);$r['violations']=Db::all("SELECT v.id,v.title FROM school_service_inspection_violations x JOIN school_service_violation_types v ON v.id=x.violation_type_id WHERE x.inspection_id=? ORDER BY v.sort_order,v.id",[$id]);$r['photos']=Db::all("SELECT id,file_path,mime_type,width,height,file_size,created_at FROM school_service_inspection_photos WHERE inspection_id=? ORDER BY id",[$id]);$r['plate']=trim(($r['plate_two']??'').' '.($r['plate_letter']??'').' '.($r['plate_three']??'').' ایران '.($r['plate_region']??''));return $r;
});
route('POST','/api/school-service/inspections-with-photo',function($p,$b,$u){
 _ssv_need($u,'create');_ssv_tables();
 $body=$_POST?:[];$viol=$body['violation_ids']??[];if(is_string($viol))$viol=json_decode($viol,true)?:[];$body['violation_ids']=$viol;
 $clientUuid=_ssv_norm($body['client_uuid']??($_SERVER['HTTP_X_CLIENT_UUID']??''));if($clientUuid!==''){
   $existing=Db::one("SELECT id FROM school_service_inspections WHERE client_uuid=?",[$clientUuid]);
   if($existing){
     $photo=Db::one("SELECT file_path,file_size FROM school_service_inspection_photos WHERE inspection_id=? ORDER BY id LIMIT 1",[(int)$existing['id']]);
     return ['ok'=>true,'id'=>(int)$existing['id'],'duplicate'=>true,'photo'=>$photo?:null];
   }
 }
 [$a,$l,$pc,$pr]=_ssv_plate($body);$schoolId=(int)($body['school_id']??0);$companyId=(int)($body['company_id']??0);if(!$schoolId)$schoolId=null;if(!$companyId)$companyId=null;
 $district=_ssv_norm($body['educational_district']??'');if($district!==''&&!_ssv_valid_option('school_service_districts',$district))Http::error('ناحیه آموزشی انتخاب‌شده معتبر یا فعال نیست.',422);
 $vehicleTypeChoice=_ssv_norm($body['vehicle_type']??'');$vehicleTypeOther=_ssv_norm($body['vehicle_type_other']??'');$vehicleType=$vehicleTypeChoice==='سایر'?$vehicleTypeOther:$vehicleTypeChoice;if($vehicleTypeChoice!==''&&$vehicleTypeChoice!=='سایر'&&!_ssv_valid_option('school_service_vehicle_types',$vehicleTypeChoice))Http::error('نوع خودرو انتخاب‌شده معتبر یا فعال نیست.',422);if($vehicleTypeChoice==='سایر'&&$vehicleType==='')Http::error('نوع خودرو را وارد کنید.',422);
 $vehicleColorChoice=_ssv_norm($body['vehicle_color']??'');$vehicleColorOther=_ssv_norm($body['vehicle_color_other']??'');$vehicleColor=$vehicleColorChoice==='سایر'?$vehicleColorOther:$vehicleColorChoice;if($vehicleColorChoice!==''&&$vehicleColorChoice!=='سایر'&&!_ssv_valid_option('school_service_vehicle_colors',$vehicleColorChoice))Http::error('رنگ خودرو انتخاب‌شده معتبر یا فعال نیست.',422);if($vehicleColorChoice==='سایر'&&$vehicleColor==='')Http::error('رنگ خودرو را وارد کنید.',422);
 _ssv_school_company_validate($schoolId??0,0,$district);_ssv_school_company_validate(0,$companyId??0,$district);
 $gender=in_array($body['school_gender']??'',['دخترانه','پسرانه','نامشخص'],true)?$body['school_gender']:'نامشخص';$dg=in_array($body['driver_gender']??'',['خانم','آقا','نامشخص'],true)?$body['driver_gender']:'نامشخص';$cert=in_array($body['certificate_status']??'',['معتبر','نامعتبر','ارائه نشد'],true)?$body['certificate_status']:'ارائه نشد';
 $front=max(0,(int)($body['passenger_front_count']??0));$rear=max(0,(int)($body['passenger_rear_count']??0));$pass=$front+$rear;$date=_ssv_en($body['violation_date']??'');$time=trim((string)($body['violation_time']??''));if($date!==''&&!preg_match('/^14\d{2}[\/-]\d{1,2}[\/-]\d{1,2}$/',$date))Http::error('تاریخ ثبت تخلف نامعتبر است.',422);if($time!==''&&!preg_match('/^(?:[01]?\d|2[0-3]):[0-5]\d$/',$time))Http::error('ساعت ثبت تخلف نامعتبر است.',422);[$lat,$lng]=validGeo($body['latitude']??null,$body['longitude']??null);
 $f=$_FILES['file']??null;
 $hasPhoto=$f&&($f['error']??UPLOAD_ERR_NO_FILE)===UPLOAD_ERR_OK;
 if($hasPhoto&&($f['size']??0)>20*1024*1024)Http::error('حجم فایل اولیه بیش از حد مجاز است.',422);
 $raw=null;
 if($hasPhoto){$raw=@file_get_contents($f['tmp_name']);if(!is_string($raw)||$raw===''||@getimagesizefromstring($raw)===false)Http::error('فرمت تصویر پشتیبانی نمی‌شود.',422);}
 $pdo=Db::pdo();$pdo->beginTransaction();$path=null;
 try{
   Db::run("INSERT INTO school_service_inspections(inspector_user_id,client_uuid,educational_district,company_id,school_id,school_gender,plate_three,plate_letter,plate_two,plate_region,iran_code,vehicle_type,vehicle_color,passenger_front_count,passenger_rear_count,passenger_count,driver_gender,certificate_status,violation_date,violation_time,location_text,latitude,longitude,description) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",[(int)$u['id'],$clientUuid?:null,$district,$companyId,$schoolId,$gender,$a,$l,$pc,$pr,'ایران',$vehicleType,$vehicleColor,$front,$rear,$pass,$dg,$cert,$date?:null,$time?:null,_ssv_norm($body['location_text']??'')?:null,$lat,$lng,trim((string)($body['description']??''))?:null]);
   $id=(int)$pdo->lastInsertId();
   foreach((array)$viol as $vid){$vid=(int)$vid;if(Db::one("SELECT id FROM school_service_violation_types WHERE id=? AND is_active=1",[$vid]))Db::run("INSERT IGNORE INTO school_service_inspection_violations(inspection_id,violation_type_id) VALUES(?,?)",[$id,$vid]);}
   $photoInfo=null;
   if($hasPhoto){
     $dir=__DIR__.'/../public/uploads/school-service';if(!is_dir($dir)&&!@mkdir($dir,0755,true))throw new RuntimeException('پوشه ذخیره تصاویر قابل ایجاد نیست.');
     $name='inspection_'.$id.'_'.bin2hex(random_bytes(8)).'.jpg';$path=$dir.'/'.$name;if(!LineImageCompressor::fromBinary($raw,$path))throw new RuntimeException('فشرده‌سازی تصویر با تنظیمات عمومی سایت ناموفق بود.');
     $info=@getimagesize($path);$size=(int)(@filesize($path)?:0);$rel='/uploads/school-service/'.$name;Db::run("INSERT INTO school_service_inspection_photos(inspection_id,file_path,mime_type,width,height,file_size) VALUES(?,?,?,?,?,?)",[$id,$rel,'image/jpeg',(int)($info[0]??0),(int)($info[1]??0),$size]);$photoInfo=['file_path'=>$rel,'file_size'=>$size];
   }
   $pdo->commit();return ['ok'=>true,'id'=>$id,'photo'=>$photoInfo];
 }catch(Throwable $e){if($path)@unlink($path);if($pdo->inTransaction())$pdo->rollBack();throw $e;}
},false,99);
route('POST','/api/school-service/inspections/{id}/photos',function($p,$b,$u){
 _ssv_need($u,'create');_ssv_tables();$id=(int)$p['id'];if(!Db::one("SELECT id FROM school_service_inspections WHERE id=?",[$id]))Http::error('بازدید پیدا نشد',404);
 // محدودیت تصویر از تنظیمات عمومی تصاویر سایت خوانده می‌شود؛ تنظیم موازی برای سرویس مدارس وجود ندارد.
 $set=LineImageCompressor::settings();
 $count=(int)(Db::one("SELECT COUNT(*) n FROM school_service_inspection_photos WHERE inspection_id=?",[$id])['n']??0);if($count>=1)Http::error('برای هر بازدید فقط یک تصویر خودرو مجاز است.',422);
 $f=$_FILES['file']??null;if(!$f||($f['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK)Http::error('تصویر خودرو دریافت نشد.',422);
 if(($f['size']??0)>20*1024*1024)Http::error('حجم فایل اولیه بیش از حد مجاز است.',422);
 if(!function_exists('imagecreatefromstring')||!function_exists('imagejpeg'))Http::error('پردازش تصویر روی سرور فعال نیست.',500);
 $raw=@file_get_contents($f['tmp_name']);if(!is_string($raw)||$raw==='')Http::error('محتوای تصویر قابل خواندن نیست.',422);
 if(@getimagesizefromstring($raw)===false)Http::error('فرمت تصویر پشتیبانی نمی‌شود.',422);
 $dir=__DIR__.'/../public/uploads/school-service';if(!is_dir($dir)&&!@mkdir($dir,0755,true))Http::error('پوشه ذخیره تصاویر قابل ایجاد نیست.',500);
 $name='inspection_'.$id.'_'.bin2hex(random_bytes(8)).'.jpg';$path=$dir.'/'.$name;
 if(!LineImageCompressor::fromBinary($raw,$path)){@unlink($path);Http::error('فشرده‌سازی تصویر با تنظیمات عمومی سایت ناموفق بود.',500);}
 $info=@getimagesize($path);$nw=(int)($info[0]??0);$nh=(int)($info[1]??0);$size=(int)(@filesize($path)?:0);
 $rel='/uploads/school-service/'.$name;Db::run("INSERT INTO school_service_inspection_photos(inspection_id,file_path,mime_type,width,height,file_size) VALUES(?,?,?,?,?,?)",[$id,$rel,'image/jpeg',$nw,$nh,$size]);$pid=(int)Db::pdo()->lastInsertId();
 return ['ok'=>true,'id'=>$pid,'file_path'=>$rel,'width'=>$nw,'height'=>$nh,'file_size'=>$size,'image_settings'=>['quality'=>(int)$set['quality'],'max_width'=>(int)$set['max_width'],'max_height'=>(int)$set['max_height']]];
});
route('PUT','/api/school-service/inspections/{id}',function($p,$b,$u){
 _ssv_need($u,'edit');_ssv_tables();$id=(int)$p['id'];if(!Db::one("SELECT id FROM school_service_inspections WHERE id=?",[$id]))Http::error('بازدید پیدا نشد',404);[$a,$l,$c,$r]=_ssv_plate($b);$viol=$b['violation_ids']??[];if(is_string($viol))$viol=json_decode($viol,true)?:[];$viol=array_values(array_unique(array_map('intval',(array)$viol)));[$lat,$lng]=validGeo($b['latitude']??null,$b['longitude']??null);$g=in_array($b['school_gender']??'',['دخترانه','پسرانه','نامشخص'],true)?$b['school_gender']:'نامشخص';$dg=in_array($b['driver_gender']??'',['خانم','آقا','نامشخص'],true)?$b['driver_gender']:'نامشخص';$cert=in_array($b['certificate_status']??'',['معتبر','نامعتبر','ارائه نشد'],true)?$b['certificate_status']:'ارائه نشد';$vtChoice=_ssv_norm($b['vehicle_type']??'');$vtOther=_ssv_norm($b['vehicle_type_other']??'');$vt=$vtChoice==='سایر'?$vtOther:$vtChoice;if($vtChoice!==''&&$vtChoice!=='سایر'&&!_ssv_valid_option('school_service_vehicle_types',$vtChoice))Http::error('نوع خودرو انتخاب‌شده معتبر یا فعال نیست.',422);if($vtChoice==='سایر'&&$vt==='')Http::error('نوع خودرو را وارد کنید.',422);$vcChoice=_ssv_norm($b['vehicle_color']??'');$vcOther=_ssv_norm($b['vehicle_color_other']??'');$vc=$vcChoice==='سایر'?$vcOther:$vcChoice;if($vcChoice!==''&&$vcChoice!=='سایر'&&!_ssv_valid_option('school_service_vehicle_colors',$vcChoice))Http::error('رنگ خودرو انتخاب‌شده معتبر یا فعال نیست.',422);if($vcChoice==='سایر'&&$vc==='')Http::error('رنگ خودرو را وارد کنید.',422);$front=max(0,(int)($b['passenger_front_count']??0));$rear=max(0,(int)($b['passenger_rear_count']??0));$pass=$front+$rear;$date=_ssv_en($b['violation_date']??'');if($date!==''&&!preg_match('/^14\d{2}[\/-]\d{1,2}[\/-]\d{1,2}$/',$date))Http::error('تاریخ ثبت تخلف نامعتبر است.',422);$time=trim((string)($b['violation_time']??''));if($time!==''&&!preg_match('/^(?:[01]?\d|2[0-3]):[0-5]\d$/',$time))Http::error('ساعت ثبت تخلف نامعتبر است.',422);_ssv_school_company_validate(!empty($b['school_id'])?(int)$b['school_id']:0,0,_ssv_norm($b['educational_district']??''));_ssv_school_company_validate(0,!empty($b['company_id'])?(int)$b['company_id']:0,_ssv_norm($b['educational_district']??''));
 Db::run("UPDATE school_service_inspections SET educational_district=?,company_id=?,school_id=?,school_gender=?,plate_three=?,plate_letter=?,plate_two=?,plate_region=?,vehicle_type=?,vehicle_color=?,passenger_front_count=?,passenger_rear_count=?,passenger_count=?,driver_gender=?,certificate_status=?,violation_date=?,violation_time=?,location_text=?,latitude=?,longitude=?,description=? WHERE id=?",[_ssv_norm($b['educational_district']??''),!empty($b['company_id'])?(int)$b['company_id']:null,!empty($b['school_id'])?(int)$b['school_id']:null,$g,$a,$l,$c,$r,$vt,$vc,$front,$rear,$pass,$dg,$cert,$date?:null,trim((string)($b['violation_time']??''))?:null,_ssv_norm($b['location_text']??'')?:null,$lat,$lng,trim((string)($b['description']??''))?:null,$id]);Db::run("DELETE FROM school_service_inspection_violations WHERE inspection_id=?",[$id]);foreach($viol as $vid)if(Db::one("SELECT id FROM school_service_violation_types WHERE id=? AND is_active=1",[$vid]))Db::run("INSERT IGNORE INTO school_service_inspection_violations(inspection_id,violation_type_id) VALUES(?,?)",[$id,$vid]);return ['ok'=>true,'id'=>$id];
});
route('DELETE','/api/school-service/inspections/{id}',function($p,$b,$u){_ssv_need($u,'delete');_ssv_tables();$id=(int)$p['id'];if(!Db::one("SELECT id FROM school_service_inspections WHERE id=?",[$id]))Http::error('بازدید پیدا نشد',404);$photos=Db::all("SELECT file_path FROM school_service_inspection_photos WHERE inspection_id=?",[$id]);$pdo=Db::pdo();$pdo->beginTransaction();try{Db::run("DELETE FROM school_service_inspection_violations WHERE inspection_id=?",[$id]);Db::run("DELETE FROM school_service_inspection_photos WHERE inspection_id=?",[$id]);Db::run("DELETE FROM school_service_inspections WHERE id=?",[$id]);$pdo->commit();}catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}foreach($photos as $ph){$fp=(string)($ph['file_path']??'');if(strpos($fp,'/uploads/school-service/')===0)@unlink(__DIR__.'/../public'.$fp);}return ['ok'=>true];});
function _ssv_xlsx_rows_v2($file){
  if(!class_exists('ZipArchive')) Http::error('امکان خواندن فایل Excel روی سرور فعال نیست.',500);
  if(!$file||($file['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK) Http::error('فایل Excel دریافت نشد.',422);
  $name=strtolower((string)($file['name']??''));
  if($name!==''&&!preg_match('/\.xlsx$/',$name)) Http::error('فقط فایل Excel با فرمت xlsx قابل ورود است.',422);
  $z=new ZipArchive(); if($z->open($file['tmp_name'])!==true) Http::error('فایل Excel معتبر نیست.',422);
  $shared=[];
  $sx=$z->getFromName('xl/sharedStrings.xml');
  if($sx!==false){
    $xml=@simplexml_load_string($sx);
    if($xml){
      $ns=$xml->getDocNamespaces(true); $xml->registerXPathNamespace('m',$ns['']??'http://schemas.openxmlformats.org/spreadsheetml/2006/main');
      foreach($xml->xpath('//m:si') as $si){
        $parts=$si->xpath('.//m:t'); $v='';
        foreach((array)$parts as $part) $v.=(string)$part;
        $shared[]=$v;
      }
    }
  }
  $wb=@simplexml_load_string((string)$z->getFromName('xl/workbook.xml'));
  $rels=@simplexml_load_string((string)$z->getFromName('xl/_rels/workbook.xml.rels'));
  $sheets=[];
  if($wb){
    $wns=$wb->getDocNamespaces(true); $wb->registerXPathNamespace('m',$wns['']??'http://schemas.openxmlformats.org/spreadsheetml/2006/main');
    $rns=$rels?$rels->getDocNamespaces(true):[];
    if($rels) $rels->registerXPathNamespace('r',$rns['']??'http://schemas.openxmlformats.org/package/2006/relationships');
    $relMap=[];
    if($rels) foreach($rels->xpath('//r:Relationship') as $rr) $relMap[(string)$rr['Id']]=(string)$rr['Target'];
    foreach($wb->xpath('//m:sheets/m:sheet') as $sh){
      $rid=(string)$sh->attributes('http://schemas.openxmlformats.org/officeDocument/2006/relationships')['id'];
      $target=$relMap[$rid]??''; if($target==='') continue;
      if(strpos($target,'/')===0) $target=ltrim($target,'/');
      if(strpos($target,'xl/')!==0) $target='xl/'.ltrim($target,'/');
      $sheets[]=[(string)$sh['name'],$target];
    }
  }
  $out=[];
  foreach($sheets as [$sheetName,$path]){
    $raw=$z->getFromName($path); if($raw===false) continue;
    $xml=@simplexml_load_string($raw); if(!$xml) continue;
    $ns=$xml->getDocNamespaces(true); $xml->registerXPathNamespace('m',$ns['']??'http://schemas.openxmlformats.org/spreadsheetml/2006/main');
    $rows=[];
    foreach($xml->xpath('//m:sheetData/m:row') as $row){
      $cells=[];
      foreach($row->xpath('./m:c') as $cell){
        $ref=(string)$cell['r']; $mm=[]; preg_match('/^([A-Z]+)\\d+$/',$ref,$mm);
        $col=0; foreach(str_split($mm[1]??'A') as $ch) $col=$col*26+(ord($ch)-64);
        $type=(string)$cell['t'];
        $v='';
        if($type==='s') $v=(string)($shared[(int)($cell->v??0)]??'');
        elseif($type==='inlineStr'){ $parts=$cell->xpath('.//m:t'); foreach((array)$parts as $part) $v.=(string)$part; }
        elseif($type==='str') $v=(string)$cell->v;
        else $v=(string)$cell->v;
        $cells[$col]=$v;
      }
      if($cells) $rows[]=$cells;
    }
    if($rows) $out[$sheetName]=$rows;
  }
  $z->close(); return $out;
}

function _ssv_import_date($v){$v=trim((string)$v);return $v===''?null:$v;}function _ssv_import_time($v){$v=trim((string)$v);return $v===''?null:$v;}function _ssv_import_num($v){$v=trim((string)$v);return $v===''?null:(int)$v;}function _ssv_import_decimal($v){$v=trim((string)$v);return $v===''?null:(float)$v;}
route('POST','/api/school-service/import-preview',function($p,$b,$u){_ssv_need($u,'import');_ssv_tables();$sheets=_ssv_xlsx_rows_v2($_FILES['file']??null);$records=[];$sheetCounts=[];foreach($sheets as $name=>$rows){$rs=_ssv_sheet_records($rows);$sheetCounts[$name]=count($rs);$records=array_merge($records,$rs);}$companies=[];$schools=[];$maps=[];$errors=[];$duplicateRows=0;$newCompanies=[];$existingCompanies=[];$newSchools=[];$existingSchools=[];$newMappings=[];$existingMappings=[];foreach($records as $i=>$r){$cn=_ssv_norm($r['company']);$sn=_ssv_norm($r['school']);if($cn){$companies[$cn]=1;$co=Db::one("SELECT id FROM school_service_companies WHERE name=?",[$cn]);if($co)$existingCompanies[$cn]=1;else$newCompanies[$cn]=1;}if($sn){$schools[$sn]=1;$sch=null;if(_ssv_norm($r['code'])!=='')$sch=Db::one("SELECT id FROM school_service_schools WHERE code=?",[_ssv_norm($r['code'])]);if(!$sch){$rd=_ssv_norm($r['district']);$sch=$rd!==''?Db::one("SELECT id FROM school_service_schools WHERE name=? AND educational_district=?",[$sn,$rd]):Db::one("SELECT id FROM school_service_schools WHERE name=?",[$sn]);}if($sch)$existingSchools[$sn]=1;else$newSchools[$sn]=1;}if($cn&&$sn){$key=(_ssv_norm($r['code'])?:$sn).'|'.$cn;if(isset($maps[$key]))$duplicateRows++;else{$maps[$key]=1;$co=Db::one("SELECT id FROM school_service_companies WHERE name=?",[$cn]);$sch=null;if(_ssv_norm($r['code'])!=='')$sch=Db::one("SELECT id FROM school_service_schools WHERE code=?",[_ssv_norm($r['code'])]);if(!$sch)$sch=Db::one("SELECT id FROM school_service_schools WHERE name=? AND educational_district=?",[$sn,_ssv_norm($r['district'])]);if($co&&$sch){$em=Db::one("SELECT company_id FROM school_service_school_companies WHERE school_id=?",[(int)$sch['id']]);if($em&&(int)$em['company_id']===(int)$co['id'])$existingMappings[$key]=1;else$newMappings[$key]=1;}else$newMappings[$key]=1;}}else if($sn==='')$errors[]='ردیف '.($i+2).' نام مدرسه ندارد';if(count($errors)>=100)break;}return ['ok'=>true,'rows'=>count($records),'companies_count'=>count($companies),'schools_count'=>count($schools),'mappings_count'=>count($maps),'new_companies'=>count($newCompanies),'existing_companies'=>count($existingCompanies),'new_schools'=>count($newSchools),'existing_schools'=>count($existingSchools),'new_mappings'=>count($newMappings),'existing_mappings'=>count($existingMappings),'duplicate_rows'=>$duplicateRows,'errors'=>$errors,'sheets'=>$sheetCounts];},false,99);
route('POST','/api/school-service/import',function($p,$b,$u){_ssv_need($u,'import');_ssv_tables();$sheets=_ssv_xlsx_rows_v2($_FILES['file']??null);$records=[];$errors=[];$companiesCount=0;$schoolsCount=0;$mappingsCount=0;$dup=0;foreach($sheets as $rows)$records=array_merge($records,_ssv_sheet_records($rows));foreach($records as $idx=>$r){try{$cn=_ssv_norm($r['company']??'');$sn=_ssv_norm($r['school']??'');$code=_ssv_norm($r['code']??'');$district=preg_replace('/^ناحیه\s*/u','',_ssv_norm($r['district']??''));if(!$sn){$errors[]='ردیف '.($idx+2).' فاقد نام مدرسه است';continue;}$co=null;if($cn){$co=Db::one("SELECT id FROM school_service_companies WHERE name=?",[$cn]);if(!$co){Db::run("INSERT INTO school_service_companies(name) VALUES(?)",[$cn]);$co=Db::one("SELECT id FROM school_service_companies WHERE name=?",[$cn]);$companiesCount++;}}$sch=null;if($code!=='')$sch=Db::one("SELECT id FROM school_service_schools WHERE code=?",[$code]);if(!$sch)$sch=Db::one("SELECT id FROM school_service_schools WHERE name=? AND educational_district=?",[$sn,$district]);$g=in_array($r['gender']??'', ['دخترانه','پسرانه','دخترانه-پسرانه','نامشخص'],true)?$r['gender']:'نامشخص';$vals=[$code?:null,$sn,$district?:null,$g,_ssv_norm($r['shift']??'')?:null,_ssv_norm($r['education_level']??'')?:null,_ssv_norm($r['school_type']??'')?:null,_ssv_import_date($r['activity_start']??''),_ssv_import_date($r['activity_end']??''),_ssv_import_time($r['morning_start']??''),_ssv_import_time($r['morning_end']??''),_ssv_import_time($r['afternoon_start']??''),_ssv_import_time($r['afternoon_end']??''),_ssv_import_num($r['driver_count']??''),_ssv_import_num($r['student_count']??''),_ssv_norm($r['address']??'')?:null,trim((string)($r['phone']??''))?:null,_ssv_import_decimal($r['latitude']??''),_ssv_import_decimal($r['longitude']??''),_ssv_norm($r['status']??'ثبت‌شده')?:'ثبت‌شده',_ssv_import_date($r['location_registered_at']??'')];if(!$sch){Db::run("INSERT INTO school_service_schools(code,name,educational_district,gender,shift,education_level,school_type,activity_start,activity_end,morning_start,morning_end,afternoon_start,afternoon_end,driver_count,student_count,address,phone,latitude,longitude,status,location_registered_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",$vals);$sch=Db::one("SELECT id FROM school_service_schools WHERE code=?",[$code]);if(!$sch)$sch=Db::one("SELECT id FROM school_service_schools WHERE name=? AND educational_district=?",[$sn,$district]);$schoolsCount++;}else Db::run("UPDATE school_service_schools SET code=?,name=?,educational_district=?,gender=?,shift=?,education_level=?,school_type=?,activity_start=?,activity_end=?,morning_start=?,morning_end=?,afternoon_start=?,afternoon_end=?,driver_count=?,student_count=?,address=?,phone=?,latitude=?,longitude=?,status=?,location_registered_at=? WHERE id=?",array_merge($vals,[(int)$sch['id']]));if($co){$em=Db::one("SELECT company_id FROM school_service_school_companies WHERE school_id=?",[(int)$sch['id']]);if($em&&(int)$em['company_id']===(int)$co['id'])$dup++;else{Db::run("DELETE FROM school_service_school_companies WHERE school_id=?",[(int)$sch['id']]);Db::run("INSERT INTO school_service_school_companies(school_id,company_id,is_primary) VALUES(?,?,1)",[(int)$sch['id'],(int)$co['id']]);$mappingsCount++;}}}catch(Throwable $e){$errors[]='ردیف '.($idx+2).' — '.$e->getMessage();}if(count($errors)>=100)break;}try{Db::run("INSERT INTO school_service_import_logs(user_id,file_name,companies_count,schools_count,mappings_count,errors_count,errors_text) VALUES(?,?,?,?,?,?,?)",[(int)$u['id'],trim((string)($_FILES['file']['name']??''))?:null,$companiesCount,$schoolsCount,$mappingsCount,count($errors),$errors?implode("\n",array_slice($errors,0,100)):null]);}catch(Throwable $ignored){}return ['ok'=>true,'companies_count'=>$companiesCount,'schools_count'=>$schoolsCount,'mappings_count'=>$mappingsCount,'duplicate_rows'=>$dup,'errors'=>array_slice($errors,0,100)];},false,99);

route('GET','/api/school-service/map',function($p,$b,$u){
 _ssv_need($u,'view');_ssv_tables();
 $district=_ssv_norm($_GET['district']??'');$company=(int)($_GET['company_id']??0);$visited=$_GET['visited']??'';$q=_ssv_norm($_GET['search']??'');
 $w=['s.is_active=1','s.latitude IS NOT NULL','s.longitude IS NOT NULL'];$a=[];
 if($district!==''){$w[]='(s.educational_district=? OR s.educational_district IS NULL OR s.educational_district=\'\')';$a[]=$district;}
 if($company){$w[]='EXISTS(SELECT 1 FROM school_service_school_companies m WHERE m.school_id=s.id AND m.company_id=?)';$a[]=$company;}
 if($visited==='1')$w[]='EXISTS(SELECT 1 FROM school_service_inspections vi WHERE vi.school_id=s.id)';
 if($visited==='0')$w[]='NOT EXISTS(SELECT 1 FROM school_service_inspections vi WHERE vi.school_id=s.id)';
 if($q!==''){$w[]='(s.name LIKE ? OR s.code LIKE ? OR s.address LIKE ?)';array_push($a,'%'.$q.'%','%'.$q.'%','%'.$q.'%');}
 $items=Db::all("SELECT s.id,s.code,s.name,s.educational_district,s.gender,s.shift,s.education_level,s.school_type,s.student_count,s.driver_count,s.address,s.phone,s.latitude,s.longitude,s.status,
   (SELECT COUNT(*) FROM school_service_inspections vi WHERE vi.school_id=s.id) inspection_count,
   (SELECT MAX(vi.created_at) FROM school_service_inspections vi WHERE vi.school_id=s.id) last_inspection_at,
   COALESCE((SELECT c.name FROM school_service_school_companies m JOIN school_service_companies c ON c.id=m.company_id WHERE m.school_id=s.id ORDER BY m.is_primary DESC,c.name LIMIT 1),'نامشخص') company_name
   FROM school_service_schools s WHERE ".implode(' AND ',$w)." ORDER BY s.name",$a);
 return ['items'=>$items,'total'=>count($items)];
});

route('GET','/api/school-service/reports-data',function($p,$b,$u){
 _ssv_need($u,'report');_ssv_tables();
 $q=_ssv_norm($_GET['search']??'');$district=_ssv_norm($_GET['district']??'');$company=(int)($_GET['company_id']??0);$school=(int)($_GET['school_id']??0);
 $gender=_ssv_norm($_GET['school_gender']??'');$shift=_ssv_norm($_GET['shift']??'');$education=_ssv_norm($_GET['education_level']??'');$schoolType=_ssv_norm($_GET['school_type']??'');
 $vehicleType=_ssv_norm($_GET['vehicle_type']??'');$vehicleColor=_ssv_norm($_GET['vehicle_color']??'');$driverGender=_ssv_norm($_GET['driver_gender']??'');$cert=_ssv_norm($_GET['certificate_status']??'');$violation=(int)($_GET['violation_id']??0);
 $from=_ssv_norm($_GET['from']??'');$to=_ssv_norm($_GET['to']??'');$visited=$_GET['visited']??'';
 $w=['1=1'];$a=[];
 if($q!==''){$w[]='(s.name LIKE ? OR s.code LIKE ? OR c.name LIKE ? OR i.location_text LIKE ? OR CONCAT(i.plate_three,i.plate_letter,i.plate_two,i.plate_region) LIKE ?)';array_push($a,'%'.$q.'%','%'.$q.'%','%'.$q.'%','%'.$q.'%','%'.$q.'%');}
 if($district!==''){$w[]='i.educational_district=?';$a[]=$district;}
 if($company){$w[]='i.company_id=?';$a[]=$company;}
 if($school){$w[]='i.school_id=?';$a[]=$school;}
 if($gender!==''){$w[]='i.school_gender=?';$a[]=$gender;}
 if($shift!==''){$w[]='s.shift=?';$a[]=$shift;}
 if($education!==''){$w[]='s.education_level=?';$a[]=$education;}
 if($schoolType!==''){$w[]='s.school_type=?';$a[]=$schoolType;}
 if($vehicleType!==''){$w[]='i.vehicle_type=?';$a[]=$vehicleType;}
 if($vehicleColor!==''){$w[]='i.vehicle_color=?';$a[]=$vehicleColor;}
 if($driverGender!==''){$w[]='i.driver_gender=?';$a[]=$driverGender;}
 if($cert!==''){$w[]='i.certificate_status=?';$a[]=$cert;}
 if($violation){$w[]='EXISTS(SELECT 1 FROM school_service_inspection_violations rv WHERE rv.inspection_id=i.id AND rv.violation_type_id=?)';$a[]=$violation;}
 if($from!==''){$w[]='DATE(i.created_at)>=?';$a[]=$from;}
 if($to!==''){$w[]='DATE(i.created_at)<=?';$a[]=$to;}
 if($visited==='1')$w[]='i.school_id IS NOT NULL';
 if($visited==='0')$w[]='i.school_id IS NULL';
 $where=implode(' AND ',$w);
 $total=(int)(Db::one("SELECT COUNT(*) n FROM school_service_inspections i LEFT JOIN school_service_schools s ON s.id=i.school_id LEFT JOIN school_service_companies c ON c.id=i.company_id WHERE $where",$a)['n']??0);
 $viol=(int)(Db::one("SELECT COUNT(*) n FROM school_service_inspection_violations x JOIN school_service_inspections i ON i.id=x.inspection_id LEFT JOIN school_service_schools s ON s.id=i.school_id LEFT JOIN school_service_companies c ON c.id=i.company_id WHERE $where",$a)['n']??0);
 $rows=Db::all("SELECT i.id,i.created_at,i.educational_district,s.code school_code,s.name school_name,s.shift,s.education_level,s.school_type,c.name company_name,i.school_gender,i.plate_two,i.passenger_front_count,i.passenger_rear_count,i.plate_letter,i.plate_three,i.plate_region,i.vehicle_type,i.vehicle_color,i.passenger_count,i.driver_gender,i.certificate_status,i.violation_date,i.violation_time,i.location_text,i.latitude,i.longitude,i.description,TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) inspector_name FROM school_service_inspections i LEFT JOIN school_service_schools s ON s.id=i.school_id LEFT JOIN school_service_companies c ON c.id=i.company_id LEFT JOIN users u ON u.id=i.inspector_user_id WHERE $where ORDER BY i.id DESC LIMIT 2000",$a);
 foreach($rows as &$r){$vs=Db::all("SELECT v.id,v.title FROM school_service_inspection_violations x JOIN school_service_violation_types v ON v.id=x.violation_type_id WHERE x.inspection_id=? ORDER BY v.sort_order,v.id",[(int)$r['id']]);$r['violations']=array_column($vs,'title');$r['violation_ids']=array_column($vs,'id');$r['plate']=trim(($r['plate_two']??'').' '.($r['plate_letter']??'').' '.($r['plate_three']??'').' ایران '.($r['plate_region']??''));}unset($r);
 return ['total'=>$total,'total_violations'=>$viol,'items'=>$rows,'filters'=>['districts'=>Db::all("SELECT title FROM school_service_districts WHERE is_active=1 ORDER BY sort_order,id"),'companies'=>Db::all("SELECT id,name FROM school_service_companies WHERE is_active=1 ORDER BY name"),'schools'=>Db::all("SELECT id,name,code FROM school_service_schools WHERE is_active=1 ORDER BY name"),'violations'=>Db::all("SELECT id,title FROM school_service_violation_types WHERE is_active=1 ORDER BY sort_order,id"),'vehicle_types'=>Db::all("SELECT title FROM school_service_vehicle_types WHERE is_active=1 ORDER BY sort_order,id"),'vehicle_colors'=>Db::all("SELECT title FROM school_service_vehicle_colors WHERE is_active=1 ORDER BY sort_order,id")]];
});

route('GET','/api/school-service/export-filtered',function($p,$b,$u){
 _ssv_need($u,'report');_ssv_tables();
 $q=_ssv_norm($_GET['search']??'');$district=_ssv_norm($_GET['district']??'');$company=(int)($_GET['company_id']??0);$school=(int)($_GET['school_id']??0);$gender=_ssv_norm($_GET['school_gender']??'');$shift=_ssv_norm($_GET['shift']??'');$education=_ssv_norm($_GET['education_level']??'');$schoolType=_ssv_norm($_GET['school_type']??'');$vehicleType=_ssv_norm($_GET['vehicle_type']??'');$vehicleColor=_ssv_norm($_GET['vehicle_color']??'');$driverGender=_ssv_norm($_GET['driver_gender']??'');$cert=_ssv_norm($_GET['certificate_status']??'');$violation=(int)($_GET['violation_id']??0);$from=_ssv_norm($_GET['from']??'');$to=_ssv_norm($_GET['to']??'');$visited=$_GET['visited']??'';$w=['1=1'];$a=[];
 if($q!==''){$w[]='(s.name LIKE ? OR s.code LIKE ? OR c.name LIKE ? OR i.location_text LIKE ? OR CONCAT(i.plate_three,i.plate_letter,i.plate_two,i.plate_region) LIKE ?)';array_push($a,'%'.$q.'%','%'.$q.'%','%'.$q.'%','%'.$q.'%','%'.$q.'%');}
 if($district!==''){$w[]='i.educational_district=?';$a[]=$district;}if($company){$w[]='i.company_id=?';$a[]=$company;}if($school){$w[]='i.school_id=?';$a[]=$school;}if($gender!==''){$w[]='i.school_gender=?';$a[]=$gender;}if($shift!==''){$w[]='s.shift=?';$a[]=$shift;}if($education!==''){$w[]='s.education_level=?';$a[]=$education;}if($schoolType!==''){$w[]='s.school_type=?';$a[]=$schoolType;}if($vehicleType!==''){$w[]='i.vehicle_type=?';$a[]=$vehicleType;}if($vehicleColor!==''){$w[]='i.vehicle_color=?';$a[]=$vehicleColor;}if($driverGender!==''){$w[]='i.driver_gender=?';$a[]=$driverGender;}if($cert!==''){$w[]='i.certificate_status=?';$a[]=$cert;}if($violation){$w[]='EXISTS(SELECT 1 FROM school_service_inspection_violations rv WHERE rv.inspection_id=i.id AND rv.violation_type_id=?)';$a[]=$violation;}if($from!==''){$w[]='DATE(i.created_at)>=?';$a[]=$from;}if($to!==''){$w[]='DATE(i.created_at)<=?';$a[]=$to;}if($visited==='1')$w[]='i.school_id IS NOT NULL';if($visited==='0')$w[]='i.school_id IS NULL';
 $rows=Db::all("SELECT i.*,s.code school_code,s.name school_name,s.shift,s.education_level,s.school_type,c.name company_name,TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) inspector_name FROM school_service_inspections i LEFT JOIN school_service_schools s ON s.id=i.school_id LEFT JOIN school_service_companies c ON c.id=i.company_id LEFT JOIN users u ON u.id=i.inspector_user_id WHERE ".implode(' AND ',$w)." ORDER BY i.id DESC LIMIT 20000",$a);
 $head=['ردیف','تاریخ ثبت','ناحیه','کد مدرسه','مدرسه','شرکت','جنسیت مدرسه','شیفت','مقطع تحصیلی','نوع مدرسه','پلاک','نوع خودرو','رنگ خودرو','سرنشین جلو','سرنشین عقب','مجموع سرنشینان','نوع راننده','وضعیت گواهی صلاحیت','تخلفات','تاریخ تخلف','ساعت تخلف','محل ثبت تخلف','عرض جغرافیایی','طول جغرافیایی','توضیحات','بازرس'];
 $out=[];foreach($rows as $i=>$r){$vs=Db::all("SELECT v.title FROM school_service_inspection_violations x JOIN school_service_violation_types v ON v.id=x.violation_type_id WHERE x.inspection_id=?",[(int)$r['id']]);$out[]=[$i+1,$r['created_at'],$r['educational_district'],$r['school_code'],$r['school_name'],$r['company_name'],$r['school_gender'],$r['shift'],$r['education_level'],$r['school_type'],trim(($r['plate_two']??'').' '.($r['plate_letter']??'').' '.($r['plate_three']??'').' ایران '.($r['plate_region']??'')),$r['vehicle_type'],$r['vehicle_color'],$r['passenger_front_count']??0,$r['passenger_rear_count']??0,$r['passenger_count']??0,$r['driver_gender'],$r['certificate_status'],implode('، ',array_column($vs,'title')),$r['violation_date'],$r['violation_time'],$r['location_text'],$r['latitude'],$r['longitude'],$r['description'],$r['inspector_name']];}
 $xw=new XlsxWriter($head);foreach($out as $row)$xw->addRow($row);$xw->output('سرویس_مدارس_گزارش_فیلترشده.xlsx','گزارش بازدیدها');
},false,99);;



function _ssv_company_sheet_records($rows){
  if(count($rows)<2)return [];
  $out=[];
  for($i=1;$i<count($rows);$i++){
    $x=$rows[$i]??[];
    $get=function($n)use($x){return trim((string)($x[$n]??''));};
    $name=_ssv_norm($get(2));
    if($name==='')continue;
    $out[]=[
      'id'=>_ssv_norm($get(1)),
      'name'=>$name,
      'manager'=>_ssv_norm($get(3)),
      'mobile'=>trim($get(4)),
      'landline'=>trim($get(5)),
      'address'=>_ssv_norm($get(6)),
      'latitude'=>trim($get(7)),
      'longitude'=>trim($get(8)),
      'declared'=>max(0,(int)_ssv_en($get(9))),
      'registered'=>max(0,(int)_ssv_en($get(10))),
      'representatives'=>max(0,(int)_ssv_en($get(11))),
      'active'=>!in_array(_ssv_norm($get(12)),['غیرفعال','غیر فعال','0','خیر'],true)?1:0,
      'profile'=>in_array(_ssv_norm($get(13)),['تکمیل‌شده','تکمیل شده','کامل','1','بله'],true)?1:0
    ];
  }
  return $out;
}
route('POST','/api/school-service/companies-import-preview',function($p,$b,$u){
  _ssv_need($u,'import');_ssv_tables();
  $sheets=_ssv_xlsx_rows_v2($_FILES['file']??null);$records=[];
  foreach($sheets as $rows)$records=array_merge($records,_ssv_company_sheet_records($rows));
  $new=0;$existing=0;$errors=[];
  foreach($records as $r){
    if($r['id']!==''&&Db::one("SELECT id FROM school_service_companies WHERE id=?",[(int)_ssv_en($r['id'])]))$existing++;
    elseif(Db::one("SELECT id FROM school_service_companies WHERE name=?",[$r['name']]))$existing++;
    else$new++;
    if($r['id']!=='' && (int)_ssv_en($r['id'])<=0)$errors[]='شناسه نامعتبر برای شرکت: '.$r['name'];
  }
  return ['ok'=>true,'rows'=>count($records),'new_companies'=>$new,'existing_companies'=>$existing,'errors'=>array_slice($errors,0,100)];
});
route('POST','/api/school-service/companies-import',function($p,$b,$u){
  _ssv_need($u,'import');_ssv_tables();
  $sheets=_ssv_xlsx_rows_v2($_FILES['file']??null);$records=[];
  foreach($sheets as $rows)$records=array_merge($records,_ssv_company_sheet_records($rows));
  $count=0;$errors=[];
  foreach($records as $r){
    try{
      $id=(int)_ssv_en($r['id']);
      [$lat,$lng]=validGeo($r['latitude']??null,$r['longitude']??null);
      $params=[$r['name'], $r['manager']?:null, $r['mobile']?:null, $r['mobile']?:null, $r['landline']?:null, $r['address']?:null, $lat, $lng, $r['declared'], $r['registered'], $r['representatives'], $r['profile'], $r['active']];
      if($id>0){
        Db::run("INSERT INTO school_service_companies(id,name,manager_name,phone,ceo_mobile,landline_phone,address,latitude,longitude,declared_school_count,registered_school_count,representative_count,profile_completed,is_active) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),manager_name=VALUES(manager_name),phone=VALUES(phone),ceo_mobile=VALUES(ceo_mobile),landline_phone=VALUES(landline_phone),address=VALUES(address),latitude=VALUES(latitude),longitude=VALUES(longitude),declared_school_count=VALUES(declared_school_count),registered_school_count=VALUES(registered_school_count),representative_count=VALUES(representative_count),profile_completed=VALUES(profile_completed),is_active=VALUES(is_active)",array_merge([$id],$params));
      }else{
        Db::run("INSERT INTO school_service_companies(name,manager_name,phone,ceo_mobile,landline_phone,address,latitude,longitude,declared_school_count,registered_school_count,representative_count,profile_completed,is_active) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",$params);
      }
      $count++;
    }catch(Throwable $e){$errors[]='شرکت «'.$r['name'].'»: '.$e->getMessage();}
  }
  try{Db::run("INSERT INTO school_service_import_logs(user_id,file_name,companies_count,errors_count,errors_text) VALUES(?,?,?,?,?)",[(int)$u['id'],trim((string)($_FILES['file']['name']??''))?:null,$count,count($errors),$errors?implode("\n",array_slice($errors,0,100)):null]);}catch(Throwable $ignored){}return ['ok'=>true,'companies_count'=>$count,'errors'=>array_slice($errors,0,100)];
});

route('GET','/api/school-service/companies-page',function($p,$b,$u){
 _ssv_need($u,'view');_ssv_tables();$q=_ssv_norm($_GET['search']??'');$page=max(1,(int)($_GET['page']??1));$size=min(100,max(1,(int)($_GET['page_size']??25)));$where=$q!==''?'WHERE c.name LIKE ?':'WHERE 1';$args=$q!==''?['%'.$q.'%']:[];$total=(int)(Db::one("SELECT COUNT(*) n FROM school_service_companies c $where",$args)['n']??0);$off=($page-1)*$size;$items=Db::all("SELECT c.id,c.name,c.manager_name,c.phone,c.ceo_mobile,c.landline_phone,c.address,c.latitude,c.longitude,c.declared_school_count,c.registered_school_count,c.representative_count,c.profile_completed,c.is_active,COUNT(DISTINCT sc.school_id) actual_school_count,COUNT(DISTINCT sc.school_id) school_count FROM school_service_companies c LEFT JOIN school_service_school_companies sc ON sc.company_id=c.id $where GROUP BY c.id ORDER BY c.name LIMIT $size OFFSET $off",$args);return ['items'=>$items,'page'=>$page,'page_size'=>$size,'pages'=>(int)ceil($total/$size),'total'=>$total];
});
route('GET','/api/school-service/schools-page',function($p,$b,$u){
 _ssv_need($u,'view');_ssv_tables();$q=_ssv_norm($_GET['search']??'');$page=max(1,(int)($_GET['page']??1));$size=min(100,max(1,(int)($_GET['page_size']??25)));$w=['s.is_active=1'];$args=[];if($q!==''){$w[]='(s.name LIKE ? OR s.code LIKE ?)';$args[]='%'.$q.'%';$args[]='%'.$q.'%';}$where=implode(' AND ',$w);$total=(int)(Db::one("SELECT COUNT(*) n FROM school_service_schools s WHERE $where",$args)['n']??0);$off=($page-1)*$size;$items=Db::all("SELECT s.id,s.code,s.name,s.educational_district,s.gender,s.shift,s.education_level,s.school_type,s.activity_start,s.activity_end,s.morning_start,s.morning_end,s.afternoon_start,s.afternoon_end,s.driver_count,s.student_count,s.address,s.phone,s.latitude,s.longitude,s.status,s.location_registered_at,COALESCE(MAX(CASE WHEN sc.is_primary=1 THEN sc.company_id END),MIN(sc.company_id)) company_id,GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', ') company_names FROM school_service_schools s LEFT JOIN school_service_school_companies sc ON sc.school_id=s.id LEFT JOIN school_service_companies c ON c.id=sc.company_id WHERE $where GROUP BY s.id ORDER BY s.name LIMIT $size OFFSET $off",$args);return ['items'=>$items,'page'=>$page,'page_size'=>$size,'pages'=>(int)ceil($total/$size),'total'=>$total];
});
route('GET','/api/school-service/inspections-page',function($p,$b,$u){
 _ssv_need($u,'view');_ssv_tables();$q=_ssv_norm($_GET['search']??'');$page=max(1,(int)($_GET['page']??1));$size=min(100,max(1,(int)($_GET['page_size']??25)));$w=['1=1'];$args=[];if($q!==''){$w[]='(s.name LIKE ? OR c.name LIKE ? OR i.location_text LIKE ? OR CONCAT(i.plate_three,i.plate_letter,i.plate_two) LIKE ?)';array_push($args,'%'.$q.'%','%'.$q.'%','%'.$q.'%','%'.$q.'%');}$where=implode(' AND ',$w);$total=(int)(Db::one("SELECT COUNT(*) n FROM school_service_inspections i LEFT JOIN school_service_schools s ON s.id=i.school_id LEFT JOIN school_service_companies c ON c.id=i.company_id WHERE $where",$args)['n']??0);$off=($page-1)*$size;$items=Db::all("SELECT i.*,s.name school_name,c.name company_name,TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) inspector_name FROM school_service_inspections i LEFT JOIN school_service_schools s ON s.id=i.school_id LEFT JOIN school_service_companies c ON c.id=i.company_id LEFT JOIN users u ON u.id=i.inspector_user_id WHERE $where ORDER BY i.id DESC LIMIT $size OFFSET $off",$args);foreach($items as &$r){$r['plate']=trim(($r['plate_two']??'').' '.($r['plate_letter']??'').' '.($r['plate_three']??'').' ایران '.($r['plate_region']??''));$r['violations']=array_column(Db::all("SELECT v.title FROM school_service_inspection_violations x JOIN school_service_violation_types v ON v.id=x.violation_type_id WHERE x.inspection_id=? ORDER BY v.sort_order,v.id",[(int)$r['id']]),'title');}unset($r);return ['items'=>$items,'page'=>$page,'page_size'=>$size,'pages'=>(int)ceil($total/$size),'total'=>$total];
});
route('GET','/api/school-service/config',function($p,$b,$u){
 _ssv_need($u,'view');_ssv_tables();return ['districts'=>Db::all("SELECT id,title,is_active,sort_order FROM school_service_districts ORDER BY sort_order,id"),'vehicle_types'=>Db::all("SELECT id,title,is_active,sort_order FROM school_service_vehicle_types ORDER BY sort_order,id"),'vehicle_colors'=>Db::all("SELECT id,title,is_active,sort_order FROM school_service_vehicle_colors ORDER BY sort_order,id")];
});
route('POST','/api/school-service/config',function($p,$b,$u){
 _ssv_need($u,'edit');_ssv_tables();$type=_ssv_norm($b['type']??'');$title=_ssv_norm($b['title']??'');$map=['district'=>'school_service_districts','vehicle_type'=>'school_service_vehicle_types','vehicle_color'=>'school_service_vehicle_colors'];if(!isset($map[$type])||$title==='')Http::error('گزینه تنظیمات نامعتبر است.',422);$table=$map[$type];if(Db::one("SELECT id FROM $table WHERE title=?",[$title]))Http::error('این گزینه قبلاً ثبت شده است.',409);$row=Db::one("SELECT COALESCE(MAX(sort_order),0)+1 n FROM $table");$sort=(int)($row['n']??1);Db::run("INSERT INTO $table(title,is_active,sort_order) VALUES(?,?,?)",[$title,1,$sort]);return ['ok'=>true,'id'=>(int)Db::pdo()->lastInsertId(),'sort_order'=>$sort];
});
route('DELETE','/api/school-service/config',function($p,$b,$u){
 _ssv_need($u,'edit');_ssv_tables();$type=_ssv_norm($_GET['type']??'');$id=(int)($_GET['id']??0);$map=['district'=>'school_service_districts','vehicle_type'=>'school_service_vehicle_types','vehicle_color'=>'school_service_vehicle_colors'];if(!isset($map[$type])||$id<=0)Http::error('گزینه تنظیمات نامعتبر است.',422);Db::run("UPDATE ".$map[$type]." SET is_active=0 WHERE id=?",[$id]);return ['ok'=>true];
});
