<?php
require_once __DIR__.'/LineImageCompressor.php';
route('GET','/api/school-service/dashboard',function($p,$b,$u){
 _ssv_need($u,'view');_ssv_tables();$district=_ssv_norm($_GET['district']??'');$company=(int)($_GET['company_id']??0);$w=['1=1'];$a=[];if($district!==''){$w[]='i.educational_district=?';$a[]=$district;}if($company){$w[]='i.company_id=?';$a[]=$company;}$where=implode(' AND ',$w);
 $total=(int)(Db::one("SELECT COUNT(*) n FROM school_service_inspections i WHERE $where",$a)['n']??0);$viol=(int)(Db::one("SELECT COUNT(*) n FROM school_service_inspection_violations x JOIN school_service_inspections i ON i.id=x.inspection_id WHERE $where",$a)['n']??0);
 return ['total_inspections'=>$total,'total_violations'=>$viol,'by_district'=>Db::all("SELECT i.educational_district label,COUNT(*) n FROM school_service_inspections i WHERE $where GROUP BY i.educational_district ORDER BY n DESC",$a),'by_company'=>Db::all("SELECT COALESCE(c.name,'نامشخص') label,COUNT(*) n FROM school_service_inspections i LEFT JOIN school_service_companies c ON c.id=i.company_id WHERE $where GROUP BY i.company_id,c.name ORDER BY n DESC LIMIT 20",$a),'by_violation'=>Db::all("SELECT v.title label,COUNT(*) n FROM school_service_inspection_violations x JOIN school_service_violation_types v ON v.id=x.violation_type_id JOIN school_service_inspections i ON i.id=x.inspection_id WHERE $where GROUP BY v.id,v.title ORDER BY n DESC",$a),'by_school'=>Db::all("SELECT COALESCE(s.name,'نامشخص') label,COUNT(*) n FROM school_service_inspections i LEFT JOIN school_service_schools s ON s.id=i.school_id WHERE $where GROUP BY i.school_id,s.name ORDER BY n DESC LIMIT 20",$a)];
});
route('GET','/api/school-service/inspections/{id}',function($p,$b,$u){
 _ssv_need($u,'view');_ssv_tables();$id=(int)$p['id'];$r=Db::one("SELECT i.*,s.name school_name,s.code school_code,c.name company_name,TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) inspector_name FROM school_service_inspections i LEFT JOIN school_service_schools s ON s.id=i.school_id LEFT JOIN school_service_companies c ON c.id=i.company_id LEFT JOIN users u ON u.id=i.inspector_user_id WHERE i.id=?",[$id]);if(!$r)Http::error('بازدید پیدا نشد',404);$r['violations']=Db::all("SELECT v.id,v.title FROM school_service_inspection_violations x JOIN school_service_violation_types v ON v.id=x.violation_type_id WHERE x.inspection_id=? ORDER BY v.sort_order,v.id",[$id]);$r['photos']=Db::all("SELECT id,file_path,mime_type,width,height,file_size,created_at FROM school_service_inspection_photos WHERE inspection_id=? ORDER BY id",[$id]);$r['plate']=trim(($r['plate_three']??'').' '.($r['plate_letter']??'').' '.($r['plate_two']??'').' ایران');return $r;
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
 [$a,$l,$pc]=_ssv_plate($body);$schoolId=(int)($body['school_id']??0);$companyId=(int)($body['company_id']??0);if(!$schoolId)$schoolId=null;if(!$companyId)$companyId=null;
 $district=_ssv_norm($body['educational_district']??'');if($district!==''&&!_ssv_valid_option('school_service_districts',$district))Http::error('ناحیه آموزشی انتخاب‌شده معتبر یا فعال نیست.',422);
 $vehicleType=_ssv_norm($body['vehicle_type']??'');if($vehicleType!==''&&!_ssv_valid_option('school_service_vehicle_types',$vehicleType))Http::error('نوع خودرو انتخاب‌شده معتبر یا فعال نیست.',422);
 $vehicleColor=_ssv_norm($body['vehicle_color']??'');if($vehicleColor!==''&&!_ssv_valid_option('school_service_vehicle_colors',$vehicleColor))Http::error('رنگ خودرو انتخاب‌شده معتبر یا فعال نیست.',422);
 _ssv_school_company_validate($schoolId??0,$companyId??0,$district);
 $gender=in_array($body['school_gender']??'',['دخترانه','پسرانه','نامشخص'],true)?$body['school_gender']:'نامشخص';$dg=in_array($body['driver_gender']??'',['خانم','آقا','نامشخص'],true)?$body['driver_gender']:'نامشخص';$cert=in_array($body['certificate_status']??'',['معتبر','نامعتبر','ارائه نشد'],true)?$body['certificate_status']:'ارائه نشد';
 $pass=max(0,(int)($body['passenger_count']??0));$date=_ssv_en($body['violation_date']??'');$time=trim((string)($body['violation_time']??''));if($date!==''&&!preg_match('/^14\d{2}[\/-]\d{1,2}[\/-]\d{1,2}$/',$date))Http::error('تاریخ ثبت تخلف نامعتبر است.',422);if($time!==''&&!preg_match('/^(?:[01]?\d|2[0-3]):[0-5]\d$/',$time))Http::error('ساعت ثبت تخلف نامعتبر است.',422);[$lat,$lng]=validGeo($body['latitude']??null,$body['longitude']??null);
 $f=$_FILES['file']??null;
 $hasPhoto=$f&&($f['error']??UPLOAD_ERR_NO_FILE)===UPLOAD_ERR_OK;
 if($hasPhoto&&($f['size']??0)>20*1024*1024)Http::error('حجم فایل اولیه بیش از حد مجاز است.',422);
 $raw=null;
 if($hasPhoto){$raw=@file_get_contents($f['tmp_name']);if(!is_string($raw)||$raw===''||@getimagesizefromstring($raw)===false)Http::error('فرمت تصویر پشتیبانی نمی‌شود.',422);}
 $pdo=Db::pdo();$pdo->beginTransaction();$path=null;
 try{
   Db::run("INSERT INTO school_service_inspections(inspector_user_id,client_uuid,educational_district,company_id,school_id,school_gender,plate_three,plate_letter,plate_two,iran_code,vehicle_type,vehicle_color,passenger_count,driver_gender,certificate_status,violation_date,violation_time,location_text,latitude,longitude,description) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",[(int)$u['id'],$clientUuid?:null,$district,$companyId,$schoolId,$gender,$a,$l,$pc,'ایران',$vehicleType,$vehicleColor,$pass,$dg,$cert,$date?:null,$time?:null,_ssv_norm($body['location_text']??'')?:null,$lat,$lng,trim((string)($body['description']??''))?:null]);
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
 _ssv_need($u,'edit');_ssv_tables();$id=(int)$p['id'];if(!Db::one("SELECT id FROM school_service_inspections WHERE id=?",[$id]))Http::error('بازدید پیدا نشد',404);[$a,$l,$c]=_ssv_plate($b);$viol=$b['violation_ids']??[];if(is_string($viol))$viol=json_decode($viol,true)?:[];$viol=array_values(array_unique(array_map('intval',(array)$viol)));[$lat,$lng]=validGeo($b['latitude']??null,$b['longitude']??null);$g=in_array($b['school_gender']??'',['دخترانه','پسرانه','نامشخص'],true)?$b['school_gender']:'نامشخص';$dg=in_array($b['driver_gender']??'',['خانم','آقا','نامشخص'],true)?$b['driver_gender']:'نامشخص';$cert=in_array($b['certificate_status']??'',['معتبر','نامعتبر','ارائه نشد'],true)?$b['certificate_status']:'ارائه نشد';$date=_ssv_en($b['violation_date']??'');if($date!==''&&!preg_match('/^14\d{2}[\/-]\d{1,2}[\/-]\d{1,2}$/',$date))Http::error('تاریخ ثبت تخلف نامعتبر است.',422);$time=trim((string)($b['violation_time']??''));if($time!==''&&!preg_match('/^(?:[01]?\d|2[0-3]):[0-5]\d$/',$time))Http::error('ساعت ثبت تخلف نامعتبر است.',422);_ssv_school_company_validate(!empty($b['school_id'])?(int)$b['school_id']:0,!empty($b['company_id'])?(int)$b['company_id']:0,_ssv_norm($b['educational_district']??''));
 Db::run("UPDATE school_service_inspections SET educational_district=?,company_id=?,school_id=?,school_gender=?,plate_three=?,plate_letter=?,plate_two=?,vehicle_type=?,vehicle_color=?,passenger_count=?,driver_gender=?,certificate_status=?,violation_date=?,violation_time=?,location_text=?,latitude=?,longitude=?,description=? WHERE id=?",[_ssv_norm($b['educational_district']??''),!empty($b['company_id'])?(int)$b['company_id']:null,!empty($b['school_id'])?(int)$b['school_id']:null,$g,$a,$l,$c,_ssv_norm($b['vehicle_type']??''),_ssv_norm($b['vehicle_color']??''),max(0,(int)($b['passenger_count']??0)),$dg,$cert,$date?:null,trim((string)($b['violation_time']??''))?:null,_ssv_norm($b['location_text']??'')?:null,$lat,$lng,trim((string)($b['description']??''))?:null,$id]);Db::run("DELETE FROM school_service_inspection_violations WHERE inspection_id=?",[$id]);foreach($viol as $vid)if(Db::one("SELECT id FROM school_service_violation_types WHERE id=? AND is_active=1",[$vid]))Db::run("INSERT IGNORE INTO school_service_inspection_violations(inspection_id,violation_type_id) VALUES(?,?)",[$id,$vid]);return ['ok'=>true,'id'=>$id];
});
route('DELETE','/api/school-service/inspections/{id}',function($p,$b,$u){_ssv_need($u,'delete');_ssv_tables();$id=(int)$p['id'];if(!Db::one("SELECT id FROM school_service_inspections WHERE id=?",[$id]))Http::error('بازدید پیدا نشد',404);Db::run("DELETE FROM school_service_inspections WHERE id=?",[$id]);return ['ok'=>true];});
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

route('POST','/api/school-service/import-preview',function($p,$b,$u){
 _ssv_need($u,'import');_ssv_tables();$sheets=_ssv_xlsx_rows_v2($_FILES['file']??null);$records=[];$sheetCounts=[];foreach($sheets as $name=>$rows){$rs=_ssv_sheet_records($rows);$sheetCounts[$name]=count($rs);$records=array_merge($records,$rs);}$companies=[];$schools=[];$maps=[];$errors=[];$duplicateRows=0;$newCompanies=[];$existingCompanies=[];$newSchools=[];$existingSchools=[];$newMappings=[];$existingMappings=[];foreach($records as $i=>$r){$cn=_ssv_norm($r['company']);$sn=_ssv_norm($r['school']);if($cn){$companies[$cn]=1;$co=Db::one("SELECT id FROM school_service_companies WHERE name=?",[$cn]);if($co)$existingCompanies[$cn]=1;else$newCompanies[$cn]=1;}if($sn){$schools[$sn]=1;$school=null;if(_ssv_norm($r['code'])!=='')$school=Db::one("SELECT id FROM school_service_schools WHERE code=?",[_ssv_norm($r['code'])]);if(!$school)$school=Db::one("SELECT id FROM school_service_schools WHERE name=? AND educational_district=?",[$sn,_ssv_norm($r['district'])]);if($school)$existingSchools[$sn]=1;else$newSchools[$sn]=1;}if($cn&&$sn){$key=$sn.'|'.$cn;if(isset($maps[$key])){$duplicateRows++;}else{$maps[$key]=1;$co=$cn?Db::one("SELECT id FROM school_service_companies WHERE name=?",[$cn]):null;$sch=null;if(_ssv_norm($r['code'])!=='')$sch=Db::one("SELECT id FROM school_service_schools WHERE code=?",[_ssv_norm($r['code'])]);if(!$sch)$sch=Db::one("SELECT id FROM school_service_schools WHERE name=? AND educational_district=?",[$sn,_ssv_norm($r['district'])]);if($co&&$sch){$existingMap=Db::one("SELECT company_id FROM school_service_school_companies WHERE school_id=?",[(int)$sch['id']]);if($existingMap&&(int)$existingMap['company_id']===(int)$co['id'])$existingMappings[$key]=1;else$newMappings[$key]=1;}else$newMappings[$key]=1;}}else if($sn==='') $errors[]='ردیف '.($i+2).' نام مدرسه ندارد';if(count($errors)>=100)break;}return ['ok'=>true,'rows'=>count($records),'companies_count'=>count($companies),'schools_count'=>count($schools),'mappings_count'=>count($maps),'new_companies'=>count($newCompanies),'existing_companies'=>count($existingCompanies),'new_schools'=>count($newSchools),'existing_schools'=>count($existingSchools),'new_mappings'=>count($newMappings),'existing_mappings'=>count($existingMappings),'duplicate_rows'=>$duplicateRows,'errors'=>$errors,'sheets'=>$sheetCounts];
},false,99);
route('POST','/api/school-service/import',function($p,$b,$u){
 _ssv_need($u,'import'); _ssv_tables();
 $sheets=_ssv_xlsx_rows_v2($_FILES['file']??null); $records=[];
 foreach($sheets as $rows) $records=array_merge($records,_ssv_sheet_records($rows));
 $companies=[];$schools=[];$mappings=[];$errors=[];$dup=0;
 foreach($records as $idx=>$r){
   $cn=_ssv_norm($r['company']??''); $sn=_ssv_norm($r['school']??''); $code=_ssv_norm($r['code']??''); $district=_ssv_norm($r['district']??'');
   if($cn){
     $co=Db::one("SELECT id FROM school_service_companies WHERE name=?",[$cn]);
     if(!$co){ Db::run("INSERT INTO school_service_companies(name,manager_name,phone,address) VALUES(?,?,?,?)",[$cn,_ssv_norm($r['manager']??'')?:null,trim((string)($r['phone']??''))?:null,_ssv_norm($r['address']??'')?:null]); $co=Db::one("SELECT id FROM school_service_companies WHERE name=?",[$cn]); $companies[]=$cn; }
   }
   if(!$sn) { if(!$cn) $errors[]='ردیف '.($idx+2).' فاقد نام مدرسه و نام شرکت است'; continue; }
   $sch=null; if($code!=='') $sch=Db::one("SELECT id FROM school_service_schools WHERE code=?",[$code]);
   if(!$sch) $sch=Db::one("SELECT id FROM school_service_schools WHERE name=? AND educational_district=?",[$sn,$district]);
   if(!$sch){
     $gender=in_array($r['gender']??'',['دخترانه','پسرانه'],true)?$r['gender']:'نامشخص';
     Db::run("INSERT INTO school_service_schools(code,name,educational_district,gender,address) VALUES(?,?,?,?,?)",[$code?:null,$sn,$district?:null,$gender,_ssv_norm($r['address']??'')?:null]);
     $sch=Db::one("SELECT id FROM school_service_schools WHERE name=? AND educational_district=?",[$sn,$district]); $schools[]=$sn;
   }
   if($cn&&$sch){
     $co=Db::one("SELECT id FROM school_service_companies WHERE name=?",[$cn]);
     if($co){
       $map=Db::one("SELECT company_id FROM school_service_school_companies WHERE school_id=? AND company_id=?",[(int)$sch['id'],(int)$co['id']]);
       if($map) $dup++; else { Db::run("INSERT INTO school_service_school_companies(school_id,company_id,is_primary) VALUES(?,?,1)",[(int)$sch['id'],(int)$co['id']]); $mappings++; }
     }
   }
 }
 return ['ok'=>true,'companies_count'=>count($companies),'schools_count'=>count($schools),'mappings_count'=>$mappings,'duplicate_rows'=>$dup,'errors'=>$errors];
},false,99);
route('GET','/api/school-service/export-filtered',function($p,$b,$u){
 _ssv_need($u,'report');_ssv_tables();$q=_ssv_norm($_GET['search']??'');$district=_ssv_norm($_GET['district']??'');$company=(int)($_GET['company_id']??0);$w=['1=1'];$a=[];if($q!==''){$w[]='(s.name LIKE ? OR c.name LIKE ? OR i.location_text LIKE ? OR CONCAT(i.plate_three,i.plate_letter,i.plate_two) LIKE ?)';array_push($a,'%'.$q.'%','%'.$q.'%','%'.$q.'%','%'.$q.'%');}if($district!==''){$w[]='i.educational_district=?';$a[]=$district;}if($company){$w[]='i.company_id=?';$a[]=$company;}
 $rows=Db::all("SELECT i.*,s.name school_name,c.name company_name,TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) inspector_name FROM school_service_inspections i LEFT JOIN school_service_schools s ON s.id=i.school_id LEFT JOIN school_service_companies c ON c.id=i.company_id LEFT JOIN users u ON u.id=i.inspector_user_id WHERE ".implode(' AND ',$w)." ORDER BY i.id DESC LIMIT 20000",$a);$head=['ردیف','ناحیه','شرکت','نوع مدرسه','مدرسه','پلاک','نوع خودرو','رنگ خودرو','تخلفات','تعداد سرنشین بدون راننده','نوع راننده','وضعیت گواهی صلاحیت','تاریخ','ساعت','محل ثبت تخلف','توضیحات','بازرس'];$out=[];foreach($rows as $i=>$r){$vs=Db::all("SELECT v.title FROM school_service_inspection_violations x JOIN school_service_violation_types v ON v.id=x.violation_type_id WHERE x.inspection_id=?",[(int)$r['id']]);$out[]=[$i+1,$r['educational_district'],$r['company_name'],$r['school_gender'],$r['school_name'],trim(($r['plate_three']??'').' '.($r['plate_letter']??'').' '.($r['plate_two']??'').' ایران'),$r['vehicle_type'],$r['vehicle_color'],implode('، ',array_column($vs,'title')),$r['passenger_count'],$r['driver_gender'],$r['certificate_status'],$r['violation_date'],$r['violation_time'],$r['location_text'],$r['description'],$r['inspector_name']];}$xw=new XlsxWriter($head);foreach($out as $row)$xw->addRow($row);$xw->output('سرویس_مدارس_بازدیدهای_فیلترشده.xlsx','بازدیدها');
},false,99);


route('GET','/api/school-service/companies-page',function($p,$b,$u){
 _ssv_need($u,'view');_ssv_tables();$q=_ssv_norm($_GET['search']??'');$page=max(1,(int)($_GET['page']??1));$size=min(100,max(1,(int)($_GET['page_size']??25)));$where=$q!==''?'WHERE c.name LIKE ?':'WHERE 1';$args=$q!==''?['%'.$q.'%']:[];$total=(int)(Db::one("SELECT COUNT(*) n FROM school_service_companies c $where",$args)['n']??0);$off=($page-1)*$size;$items=Db::all("SELECT c.id,c.name,c.manager_name,c.phone,c.address,c.is_active,COUNT(DISTINCT sc.school_id) school_count FROM school_service_companies c LEFT JOIN school_service_school_companies sc ON sc.company_id=c.id $where GROUP BY c.id ORDER BY c.name LIMIT $size OFFSET $off",$args);return ['items'=>$items,'page'=>$page,'page_size'=>$size,'total'=>$total];
});
route('GET','/api/school-service/schools-page',function($p,$b,$u){
 _ssv_need($u,'view');_ssv_tables();$q=_ssv_norm($_GET['search']??'');$page=max(1,(int)($_GET['page']??1));$size=min(100,max(1,(int)($_GET['page_size']??25)));$w=['s.is_active=1'];$args=[];if($q!==''){$w[]='(s.name LIKE ? OR s.code LIKE ?)';$args[]='%'.$q.'%';$args[]='%'.$q.'%';}$where=implode(' AND ',$w);$total=(int)(Db::one("SELECT COUNT(*) n FROM school_service_schools s WHERE $where",$args)['n']??0);$off=($page-1)*$size;$items=Db::all("SELECT s.id,s.code,s.name,s.educational_district,s.gender,s.address,GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', ') company_names FROM school_service_schools s LEFT JOIN school_service_school_companies sc ON sc.school_id=s.id LEFT JOIN school_service_companies c ON c.id=sc.company_id WHERE $where GROUP BY s.id ORDER BY s.name LIMIT $size OFFSET $off",$args);return ['items'=>$items,'page'=>$page,'page_size'=>$size,'total'=>$total];
});
route('GET','/api/school-service/inspections-page',function($p,$b,$u){
 _ssv_need($u,'view');_ssv_tables();$q=_ssv_norm($_GET['search']??'');$page=max(1,(int)($_GET['page']??1));$size=min(100,max(1,(int)($_GET['page_size']??25)));$w=['1=1'];$args=[];if($q!==''){$w[]='(s.name LIKE ? OR c.name LIKE ? OR i.location_text LIKE ? OR CONCAT(i.plate_three,i.plate_letter,i.plate_two) LIKE ?)';array_push($args,'%'.$q.'%','%'.$q.'%','%'.$q.'%','%'.$q.'%');}$where=implode(' AND ',$w);$total=(int)(Db::one("SELECT COUNT(*) n FROM school_service_inspections i LEFT JOIN school_service_schools s ON s.id=i.school_id LEFT JOIN school_service_companies c ON c.id=i.company_id WHERE $where",$args)['n']??0);$off=($page-1)*$size;$items=Db::all("SELECT i.*,s.name school_name,c.name company_name,TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) inspector_name FROM school_service_inspections i LEFT JOIN school_service_schools s ON s.id=i.school_id LEFT JOIN school_service_companies c ON c.id=i.company_id LEFT JOIN users u ON u.id=i.inspector_user_id WHERE $where ORDER BY i.id DESC LIMIT $size OFFSET $off",$args);foreach($items as &$r){$r['plate']=trim(($r['plate_three']??'').' '.($r['plate_letter']??'').' '.($r['plate_two']??'').' ایران');$r['violations']=array_column(Db::all("SELECT v.title FROM school_service_inspection_violations x JOIN school_service_violation_types v ON v.id=x.violation_type_id WHERE x.inspection_id=? ORDER BY v.sort_order,v.id",[(int)$r['id']]),'title');}unset($r);return ['items'=>$items,'page'=>$page,'page_size'=>$size,'total'=>$total];
});
route('GET','/api/school-service/config',function($p,$b,$u){
 _ssv_need($u,'view');_ssv_tables();return ['districts'=>Db::all("SELECT id,title,is_active FROM school_service_districts ORDER BY id"),'vehicle_types'=>Db::all("SELECT id,title,is_active FROM school_service_vehicle_types ORDER BY id"),'vehicle_colors'=>Db::all("SELECT id,title,is_active FROM school_service_vehicle_colors ORDER BY id")];
});
route('POST','/api/school-service/config',function($p,$b,$u){
 _ssv_need($u,'edit');_ssv_tables();$type=_ssv_norm($b['type']??'');$title=_ssv_norm($b['title']??'');$map=['district'=>'school_service_districts','vehicle_type'=>'school_service_vehicle_types','vehicle_color'=>'school_service_vehicle_colors'];if(!isset($map[$type])||$title==='')Http::error('گزینه تنظیمات نامعتبر است.',422);$table=$map[$type];if(Db::one("SELECT id FROM $table WHERE title=?",[$title]))Http::error('این گزینه قبلاً ثبت شده است.',409);Db::run("INSERT INTO $table(title,is_active) VALUES(?,1)",[$title]);return ['ok'=>true,'id'=>(int)Db::pdo()->lastInsertId()];
});
route('DELETE','/api/school-service/config',function($p,$b,$u){
 _ssv_need($u,'edit');_ssv_tables();$type=_ssv_norm($_GET['type']??'');$id=(int)($_GET['id']??0);$map=['district'=>'school_service_districts','vehicle_type'=>'school_service_vehicle_types','vehicle_color'=>'school_service_vehicle_colors'];if(!isset($map[$type])||$id<=0)Http::error('گزینه تنظیمات نامعتبر است.',422);Db::run("UPDATE ".$map[$type]." SET is_active=0 WHERE id=?",[$id]);return ['ok'=>true];
});
