<?php
/* خطیار — صفحه مستقل ماشین‌آلات؛ فقط برای نقش‌های مجاز */
ini_set('display_errors','0');
date_default_timezone_set('Asia/Tehran');
$ROOT=__DIR__.'/../../';
require "$ROOT/lib/Db.php";
require "$ROOT/lib/Jwt.php";
require "$ROOT/lib/Http.php";
$CONFIG=require "$ROOT/config.php";
function km_norm($s){return trim(strtr((string)$s,['ي'=>'ی','ى'=>'ی','ك'=>'ک','ۀ'=>'ه','ة'=>'ه']));}
function km_fail($m,$s=400){Http::error($m,$s);}
function km_auth(){global $CONFIG;$tok=Http::bearer();$p=$tok?Jwt::verify($tok,$CONFIG['jwt_secret']):null;if(!$p||empty($p['sub']))km_fail('توکن نامعتبر یا منقضی است',401);$u=Db::one("SELECT u.id,u.is_active,u.is_admin,r.title role_title FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.id=? LIMIT 1",[$p['sub']]);if(!$u||!(int)$u['is_active'])km_fail('کاربر نامعتبر است',401);return $u;}
function km_allowed($u){if(!empty($u['is_admin']))return true;$t=km_norm($u['role_title']??'');return in_array($t,['سربازرس ارشد','نیروی اداری ارشد','رییس اداره بازرسی','مدیر کل','admin','superadmin'],true);}
try{$u=km_auth();if(!km_allowed($u))km_fail('دسترسی مشاهده ماشین‌آلات برای سمت شما مجاز نیست',403);$rows=Db::all("SELECT a.*,u.first_name,u.last_name,u.username,u.phone,u.national_code,r.title role_title,r.level role_level FROM personnel_vehicle_assets a JOIN users u ON u.id=a.user_id LEFT JOIN roles r ON r.id=u.role_id ORDER BY a.status='pending' DESC,a.updated_at DESC");foreach($rows as &$r){$r['photos']=Db::all("SELECT photo_key,data_uri,crop_json FROM personnel_vehicle_asset_photos WHERE asset_id=? ORDER BY id",[$r['id']]);}unset($r);Http::$currentToken=$tok??null;Http::json(['success'=>true,'items'=>$rows,'count'=>count($rows)]);}catch(Throwable $e){error_log('personnel-machinery: '.$e->getMessage().' @ '.$e->getFile().':'.$e->getLine());km_fail('خطای داخلی سرویس ماشین‌آلات',500);}
