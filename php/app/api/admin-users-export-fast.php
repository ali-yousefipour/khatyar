<?php
/* خطیار — خروجی Excel کاربران با شماره پرسنلی */
ini_set('display_errors','0');
date_default_timezone_set('Asia/Tehran');
$ROOT=__DIR__.'/../../';
require "$ROOT/lib/Db.php"; require "$ROOT/lib/Jwt.php"; require "$ROOT/lib/Http.php";
$CONFIG=require "$ROOT/config.php";
function uef_error($m,$s=400){http_response_code($s);header('Content-Type: application/json; charset=utf-8');echo json_encode(['error'=>$m],JSON_UNESCAPED_UNICODE);exit;}
function uef_auth(){global $CONFIG;$tok=Http::bearer();$p=$tok?Jwt::verify($tok,$CONFIG['jwt_secret']):null;if(!$p||empty($p['sub']))uef_error('توکن منقضی یا نامعتبر است',401);$u=Db::one("SELECT u.id,u.is_active,u.is_admin,r.level,r.title role_title FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=? LIMIT 1",[$p['sub']]);if(!$u||!(int)$u['is_active'])uef_error('کاربر نامعتبر',401);$dt=$p['dt']??'web';$sess=Db::one("SELECT device_id,revoked_at FROM user_sessions WHERE user_id=? AND device_type=?",[$u['id'],$dt]);$unlimited=in_array($u['role_title'],['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد'],true);if(!$sess||$sess['revoked_at']||(!$unlimited&&$sess['device_id']!==($p['device_id']??'')))uef_error('نشست منقضی یا باطل شده است',401);if(empty($u['is_admin']))uef_error('دسترسی مدیریتی لازم است',403);return $u;}
function uef_e($v){return htmlspecialchars((string)$v,ENT_QUOTES,'UTF-8');}
uef_auth();
$users=Db::all("SELECT u.id,u.username,u.first_name,u.last_name,r.title role_title,u.phone,u.email,u.national_code,u.personnel_code,u.birth_date,u.marital_status,u.children_count,u.address,u.seniority_start,u.is_active,u.can_send_sms,u.device_model,u.android_version,u.app_version FROM users u LEFT JOIN roles r ON r.id=u.role_id ORDER BY u.id");
$fields=Db::all("SELECT id,label FROM custom_fields WHERE is_active=1 ORDER BY sort_order,id");
$allVals=Db::all("SELECT user_id,field_id,value FROM custom_field_values");$valMap=[];foreach($allVals as $v)$valMap[$v['user_id']][$v['field_id']]=$v['value'];
$commitMap=[];try{foreach(Db::all("SELECT user_id,COUNT(*) c FROM user_commitments GROUP BY user_id") as $r)$commitMap[$r['user_id']]=(int)$r['c'];}catch(Throwable $e){}
$head=['شناسه کاربری','شماره پرسنلی','نام کاربری','نام','نام خانوادگی','سمت','موبایل','ایمیل','کد ملی','تاریخ تولد','وضعیت تأهل','تعداد فرزند','آدرس','شروع سنوات','فعال','اجازهٔ پیامک','مدل گوشی','نسخهٔ اندروید','نسخهٔ برنامه','تعداد تعهدات انضباطی'];foreach($fields as $f)$head[]=$f['label'];
header('Content-Type: application/vnd.ms-excel; charset=UTF-8');header('Content-Disposition: attachment; filename="users_full.xls"');header('Cache-Control: no-store');echo "\xEF\xBB\xBF";echo '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><style>table{border-collapse:collapse;font-family:Tahoma}th,td{border:1px solid #999;padding:5px;white-space:nowrap}th{font-weight:bold}</style></head><body><table><thead><tr>';foreach($head as $h)echo '<th>'.uef_e($h).'</th>';echo '</tr></thead><tbody>';
foreach($users as $r){echo '<tr>';echo '<td>'.uef_e($r['id']).'</td><td>'.uef_e($r['personnel_code']??'').'</td>';foreach(['username','first_name','last_name','role_title','phone','email','national_code','birth_date','marital_status','children_count','address','seniority_start'] as $k)echo '<td>'.uef_e($r[$k]??'').'</td>';echo '<td>'.((int)$r['is_active']?'بله':'خیر').'</td><td>'.((int)$r['can_send_sms']?'بله':'خیر').'</td>';foreach(['device_model','android_version','app_version'] as $k)echo '<td>'.uef_e($r[$k]??'').'</td>';echo '<td>'.($commitMap[$r['id']]??0).'</td>';foreach($fields as $f)echo '<td>'.uef_e($valMap[$r['id']][$f['id']]??'').'</td>';echo '</tr>';}
echo '</tbody></table></body></html>';exit;
