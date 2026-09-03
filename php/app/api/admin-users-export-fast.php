<?php
/* خطیار — خروجی کاربران؛ بدون فرض وجود ستون/جدول اختیاری */
ini_set('display_errors','0');
date_default_timezone_set('Asia/Tehran');
$ROOT=__DIR__.'/../../';
require "$ROOT/lib/Db.php"; require "$ROOT/lib/Jwt.php"; require "$ROOT/lib/Http.php";
require "$ROOT/lib/XlsxWriter.php";
$CONFIG=require "$ROOT/config.php";
function uef_fail($m,$s=400){http_response_code($s);header('Content-Type: application/json; charset=utf-8');echo json_encode(['error'=>$m],JSON_UNESCAPED_UNICODE);exit;}
function uef_auth(){global $CONFIG;$tok=Http::bearer();$p=$tok?Jwt::verify($tok,$CONFIG['jwt_secret']):null;if(!$p||empty($p['sub']))uef_fail('توکن منقضی یا نامعتبر است',401);$u=Db::one("SELECT u.id,u.is_active,u.is_admin,r.title role_title FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=? LIMIT 1",[$p['sub']]);if(!$u||!(int)$u['is_active'])uef_fail('کاربر نامعتبر است',401);$dt=$p['dt']??'web';$sess=Db::one("SELECT device_id,revoked_at FROM user_sessions WHERE user_id=? AND device_type=? ORDER BY id DESC LIMIT 1",[$u['id'],$dt]);$unlimited=in_array($u['role_title'],['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد'],true);if(!$sess||$sess['revoked_at']||(!$unlimited&&$sess['device_id']!==($p['device_id']??'')))uef_fail('نشست منقضی یا باطل شده است',401);if(empty($u['is_admin']))uef_fail('دسترسی مدیریتی لازم است',403);}
function uef_col($table,$col){try{return (bool)Db::one("SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=? LIMIT 1",[$table,$col]);}catch(Throwable $e){return false;}}
function uef_table($table){try{return (bool)Db::one("SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? LIMIT 1",[$table]);}catch(Throwable $e){return false;}}
try{
  uef_auth();
  $birth=uef_col('users','birth_date')?'u.birth_date':'NULL';
  $mar=uef_col('users','marital_status')?'u.marital_status':'NULL';
  $children=uef_col('users','children_count')?'u.children_count':'NULL';
  $address=uef_col('users','address')?'u.address':'NULL';
  $sen=uef_col('users','seniority_start')?'u.seniority_start':'NULL';
  $sms=uef_col('users','can_send_sms')?'u.can_send_sms':'0';
  $dev=uef_col('users','device_model')?'u.device_model':'NULL';
  $and=uef_col('users','android_version')?'u.android_version':'NULL';
  $app=uef_col('users','app_version')?'u.app_version':'NULL';
  $sig=uef_col('users','signature_data')?'u.signature_data':'NULL';
  $photoPath=uef_col('users','photo_path')?'u.photo_path':'NULL';
  $users=Db::all("SELECT u.id,u.username,u.first_name,u.last_name,r.title role_title,u.phone,u.email,u.national_code,$birth birth_date,$mar marital_status,$children children_count,$address address,$sen seniority_start,u.is_active,$sms can_send_sms,$dev device_model,$and android_version,$app app_version,$sig signature_data,$photoPath photo_path FROM users u LEFT JOIN roles r ON r.id=u.role_id ORDER BY u.id");
  $fields=uef_table('custom_fields')?Db::all("SELECT id,label FROM custom_fields WHERE is_active=1 ORDER BY sort_order,id"):[];
  $allVals=uef_table('custom_field_values')?Db::all("SELECT user_id,field_id,value FROM custom_field_values"):[];
  $valMap=[];foreach($allVals as $v)$valMap[$v['user_id']][$v['field_id']]=$v['value'];
  $personnelFieldIds=[];foreach($fields as $f){$label=trim((string)$f['label']);if(in_array($label,['شماره پرسنلی','کد پرسنلی','شماره پرسنلی کارمند','کد پرسنلی کارمند'],true))$personnelFieldIds[]=(int)$f['id'];}
  $personnelCol=uef_col('users','personnel_code');
  $head=['شناسه کاربری','شماره پرسنلی','نام کاربری','نام','نام خانوادگی','سمت','موبایل','ایمیل','کد ملی','تاریخ تولد','وضعیت تأهل','تعداد فرزند','آدرس','شروع سنوات','فعال','اجازهٔ پیامک','مدل گوشی','نسخهٔ اندروید','نسخهٔ برنامه'];foreach($fields as $f)$head[]=$f['label'];
  $xw=new XlsxWriter($head);
  foreach($users as $r){$pc=$personnelCol?trim((string)($r['personnel_code']??'')):'';if($pc===''){foreach($personnelFieldIds as $fid){$v=trim((string)($valMap[$r['id']][$fid]??''));if($v!==''){$pc=$v;break;}}}
    $xw->addRow([$r['id'],$pc,$r['username'],$r['first_name'],$r['last_name'],$r['role_title'],$r['phone'],$r['email'],$r['national_code'],$r['birth_date'],$r['marital_status'],$r['children_count'],$r['address'],$r['seniority_start'],((int)$r['is_active']?'بله':'خیر'),((int)$r['can_send_sms']?'بله':'خیر'),$r['device_model'],$r['android_version'],$r['app_version'],...array_map(fn($f)=>$valMap[$r['id']][$f['id']]??'',$fields)]);
  }
  $xw->output('users_full.xlsx','کاربران');exit;
}catch(Throwable $e){error_log('users-export-fast: '.$e->getMessage().' @ '.$e->getFile().':'.$e->getLine());uef_fail('خطای داخلی خروجی کاربران؛ جزئیات در لاگ سرور ثبت شد.',500);}
