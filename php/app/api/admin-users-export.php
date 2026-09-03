<?php
/* خطیار — خروجی کامل کاربران با شماره پرسنلی */
ini_set('display_errors','0');
date_default_timezone_set('Asia/Tehran');
require_once __DIR__.'/../../lib/Db.php';
require_once __DIR__.'/../../lib/Jwt.php';
require_once __DIR__.'/../../lib/Http.php';
require_once __DIR__.'/../../lib/XlsxWriter.php';
$CONFIG=require __DIR__.'/../../config.php';

$tok=Http::bearer();
$payload=$tok?Jwt::verify($tok,$CONFIG['jwt_secret']):null;
if(!$payload||empty($payload['sub'])) Http::error('توکن منقضی یا نامعتبر است',401);
$u=Db::one("SELECT u.id,u.is_active,u.is_admin,r.level,r.title role_title FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=? LIMIT 1",[$payload['sub']]);
if(!$u||!(int)$u['is_active']) Http::error('کاربر نامعتبر',401);
$dt=$payload['dt']??'web';
$sess=Db::one("SELECT device_id,revoked_at FROM user_sessions WHERE user_id=? AND device_type=? LIMIT 1",[$u['id'],$dt]);
$unlimited=in_array($u['role_title'],['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد'],true);
if(!$sess||$sess['revoked_at']||(!$unlimited&&$sess['device_id']!==($payload['device_id']??''))) Http::error('نشست منقضی یا باطل شده است',401);
if(empty($u['is_admin'])) Http::error('دسترسی مدیریتی لازم است',403);

// شماره پرسنلی در سامانه با personnel_code نگهداری می‌شود؛ در نصب‌های قدیمی ستون را ایجاد می‌کنیم.
try {
  if(!Db::one("SHOW COLUMNS FROM users WHERE Field='personnel_code'")) Db::run("ALTER TABLE users ADD COLUMN personnel_code VARCHAR(40) NULL");
} catch(Throwable $e) { Http::error('ساختار اطلاعات کاربران برای خروجی آماده نیست',500); }

$rows=Db::all("SELECT u.id,u.username,u.personnel_code,u.first_name,u.last_name,u.email,u.phone,
    r.title role_title,r.level,u.manager_id,u.zone_id,u.rank_stars,u.is_active,u.allow_web,u.allow_android,
    u.created_at
  FROM users u LEFT JOIN roles r ON r.id=u.role_id
  ORDER BY r.level ASC,u.last_name ASC,u.first_name ASC,u.id ASC");

$xw=new XlsxWriter(['شناسه کاربری','شماره پرسنلی','نام کاربری','نام','نام خانوادگی','سمت','سطح سمت','ایمیل','شماره همراه','شناسه مدیر','شناسه منطقه','ستاره سمت','فعال','ورود وب','ورود اندروید','تاریخ ایجاد']);
$widths=[14,16,20,16,20,24,12,28,18,14,14,12,12,12,16,22];
foreach($widths as $i=>$w) $xw->setColWidth($i,$w);
foreach($rows as $r){
  $xw->addRow([
    $r['id'],
    $r['personnel_code']??'',
    $r['username']??'',
    $r['first_name']??'',
    $r['last_name']??'',
    $r['role_title']??'',
    $r['level']??'',
    $r['email']??'',
    $r['phone']??'',
    $r['manager_id']??'',
    $r['zone_id']??'',
    $r['rank_stars']??'',
    ((int)($r['is_active']??0)===1?'فعال':'غیرفعال'),
    ((int)($r['allow_web']??0)===1?'فعال':'غیرفعال'),
    ((int)($r['allow_android']??0)===1?'فعال':'غیرفعال'),
    $r['created_at']??''
  ]);
}
$xw->output('users_full.xlsx','کاربران');
exit;
