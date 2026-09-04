<?php
/* خطیار — تب ماشین آلات: فهرست خودرو/موتورسیکلت + تاریخ چک‌لیست + خروجی XLSX تصویردار */
ini_set('display_errors','0');
date_default_timezone_set('Asia/Tehran');
$ROOT=__DIR__.'/../../';
require "$ROOT/lib/Db.php";
require "$ROOT/lib/Jwt.php";
require "$ROOT/lib/Http.php";
require "$ROOT/lib/XlsxWriter.php";
$CONFIG=require "$ROOT/config.php";
function pvm_fail($m,$s=400){http_response_code($s);header('Content-Type: application/json; charset=utf-8');echo json_encode(['error'=>$m],JSON_UNESCAPED_UNICODE);exit;}
function pvm_auth(){global $CONFIG;$tok=Http::bearer();$p=$tok?Jwt::verify($tok,$CONFIG['jwt_secret']):null;if(!$p||empty($p['sub']))pvm_fail('توکن نامعتبر یا منقضی است',401);$u=Db::one("SELECT id,is_active,is_admin FROM users WHERE id=? LIMIT 1",[$p['sub']]);if(!$u||!(int)$u['is_active'])pvm_fail('کاربر نامعتبر است',401);if(!(int)$u['is_admin'])pvm_fail('دسترسی مدیریتی لازم است',403);return $u;}
function pvm_rows(){
 $rows=Db::all("SELECT a.*,u.first_name,u.last_name,u.username,u.phone,u.national_code,r.title role_title,
   MAX(c.updated_at) checklist_last_at, MIN(c.created_at) checklist_first_at,
   GROUP_CONCAT(DISTINCT c.updated_at ORDER BY c.updated_at DESC SEPARATOR ' | ') checklist_dates
   FROM personnel_vehicle_assets a
   JOIN users u ON u.id=a.user_id
   LEFT JOIN roles r ON r.id=u.role_id
   LEFT JOIN personnel_vehicle_asset_checks c ON c.asset_id=a.id
   GROUP BY a.id ORDER BY u.last_name,u.first_name,a.asset_type");
 foreach($rows as &$r){$r['photos']=Db::all("SELECT photo_key,data_uri,crop_json FROM personnel_vehicle_asset_photos WHERE asset_id=? ORDER BY id",[$r['id']]);}
 unset($r);return $rows;
}
function pvm_plate($r){if(($r['asset_type']??'')==='motorcycle')return trim(($r['motorcycle_plate_top']??'').' / '.($r['motorcycle_plate_bottom']??''));return trim(($r['plate_part_right']??'').' '.($r['plate_letter']??'').' '.($r['plate_part_left']??'').' ایران '.($r['plate_iran']??''));}
function pvm_image_bytes($data){$data=(string)$data;if(strpos($data,'base64,')!==false)$data=substr($data,strpos($data,'base64,')+7);$data=preg_replace('/\s+/','',$data);$b=base64_decode($data,true);return $b===false?'':$b;}
try{
 $u=pvm_auth();$op=$_GET['op']??'list';
 if($op==='list'){header('Content-Type: application/json; charset=utf-8');echo json_encode(['items'=>pvm_rows()],JSON_UNESCAPED_UNICODE);exit;}
 if($op==='export'){
  $rows=pvm_rows();
  $head=['شناسه','نام','نام خانوادگی','نام کاربری','سمت','موبایل','کد ملی','نوع وسیله','پلاک','نوع خودرو','سوخت','رنگ','سال ساخت','شماره شاسی/تنه','شماره موتور','VIN','سیستم موتور','تیپ موتور','کاربری موتور','سیلندر','شماره گواهینامه','صدور گواهینامه','انقضای گواهینامه','شماره بیمه','شرکت بیمه','صدور بیمه','انقضای بیمه','شماره معاینه فنی','صدور معاینه','انقضای معاینه','چراغگردان ثابت','چراغگردان متحرک','گرمایش','سرمایش','آمپلی‌فایر','وضعیت بررسی','اولین تاریخ چک‌لیست','آخرین تاریخ چک‌لیست','تمام تاریخ‌های چک‌لیست','عکس ۱','عکس ۲','عکس ۳','عکس ۴','سایر پیوست‌ها'];
  $x=new XlsxWriter($head);
  $photoKeys=[];
  foreach($rows as $r){foreach(($r['photos']??[]) as $ph){$k=(string)$ph['photo_key'];if($k!==''&&!in_array($k,$photoKeys,true))$photoKeys[]=$k;}}
  $photoCols=['photo1','photo2','photo3','photo4'];
  foreach($photoKeys as $k){if(count($photoCols)>=4)break;$photoCols[]=$k;}
  foreach($rows as $r){
   $plate=pvm_plate($r);
   $row=$x->addRow([$r['id'],$r['first_name'],$r['last_name'],$r['username'],$r['role_title'],$r['phone'],$r['national_code'],$r['asset_type']==='car'?'خودرو':'موتورسیکلت',$plate,$r['vehicle_type'],$r['fuel_type'],$r['color'],$r['model_year'],$r['chassis_number'],$r['engine_number'],$r['vin'],$r['motorcycle_system'],$r['motorcycle_type'],$r['motorcycle_usage'],$r['cylinders'],$r['license_number'],$r['license_issue_date'],$r['license_expiry_date'],$r['insurance_number'],$r['insurance_company'],$r['insurance_issue_date'],$r['insurance_expiry_date'],$r['technical_inspection_number'],$r['technical_inspection_issue_date'],$r['technical_inspection_expiry_date'],((int)$r['fixed_beacon']?'بله':'خیر'),((int)$r['mobile_beacon']?'بله':'خیر'),((int)$r['heating_ok']?'بله':'خیر'),((int)$r['cooling_ok']?'بله':'خیر'),((int)$r['amplifier']?'بله':'خیر'),$r['status'],$r['checklist_first_at'],$r['checklist_last_at'],$r['checklist_dates'],'','','','']);
   $byKey=[];foreach(($r['photos']??[]) as $ph)$byKey[(string)$ph['photo_key']=$ph;
   $colBase=39;
   $used=0;
   foreach($photoKeys as $idx=>$key){if($idx>=5)break;if(empty($byKey[$key]))continue;$bytes=pvm_image_bytes($byKey[$key]['data_uri']??'');if(!$bytes)continue;$x->setImage($row,$colBase+$idx,$bytes,110);$used++;}
  }
  foreach(range(39,43) as $c)$x->setImageColWidth($c,18);
  $x->output('personnel_vehicle_machinery.xlsx','ماشین آلات');exit;
 }
 pvm_fail('عملیات نامعتبر',404);
}catch(Throwable $e){error_log('personnel-vehicle-machinery: '.$e->getMessage().' @ '.$e->getFile().':'.$e->getLine());pvm_fail('خطای داخلی سرویس ماشین آلات',500);}
