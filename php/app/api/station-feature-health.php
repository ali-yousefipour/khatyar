<?php
ini_set('display_errors','0');
require_once __DIR__.'/../../lib/Db.php';
require_once __DIR__.'/../../lib/Jwt.php';
require_once __DIR__.'/../../lib/Http.php';
$C=require __DIR__.'/../../config.php';
$tok=Http::bearer();$p=$tok?Jwt::verify($tok,$C['jwt_secret']):null;if(!$p||empty($p['sub']))Http::error('توکن منقضی یا نامعتبر است',401);
$u=Db::one("SELECT u.id,u.role_id,u.is_active,r.title role_title,r.is_admin FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.id=?",[$p['sub']]);
if(!$u||!(int)$u['is_active'])Http::error('کاربر نامعتبر است',401);
$admin=!empty($u['is_admin'])||in_array((string)$u['role_title'],['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد','admin','superadmin'],true);
function ht($t){$r=Db::one("SELECT COUNT(*) c FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?",[$t]);return (int)($r['c']??0)>0;}
function hc($t,$c){$r=Db::one("SELECT COUNT(*) n FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?",[$t,$c]);return (int)($r['n']??0)>0;}
$tables=['radio_channels','radio_messages','radio_user_settings','radio_channel_users','radio_channel_roles','radio_channel_regions','radio_presence','radio_logs','line_station_locations','line_station_signs','station_sign_types'];$ok=true;$out=[];foreach($tables as$t){$out[$t]=ht($t);if(!$out[$t])$ok=false;}
$out['radio_channel_count']=ht('radio_channels')?(int)(Db::one('SELECT COUNT(*) n FROM radio_channels WHERE is_active=1')['n']??0):0;
$out['station_sign_type_count']=ht('station_sign_types')?(int)(Db::one('SELECT COUNT(*) n FROM station_sign_types WHERE is_active=1')['n']??0):0;
$out['role_app_items']=ht('app_settings');
if($out['role_app_items']){$r=Db::one("SELECT value FROM app_settings WHERE `key`='role_app_items' LIMIT 1");$cfg=$r?json_decode((string)$r['value'],true):[];$items=is_array($cfg[$u['role_id']??'']??null)?$cfg[$u['role_id']]:[];$out['permissions']=['Radio'=>in_array('Radio',$items,true),'LineLocation'=>in_array('LineLocation',$items,true),'StationCapture'=>in_array('StationCapture',$items,true),'MyStations'=>in_array('MyStations',$items,true)];}
$out['line_station_schema']=['latitude'=>ht('line_station_locations')&&hc('line_station_locations','latitude'),'longitude'=>ht('line_station_locations')&&hc('line_station_locations','longitude'),'photo'=>ht('line_station_locations')&&hc('line_station_locations','location_photo_path'),'captured_by'=>ht('line_station_locations')&&hc('line_station_locations','captured_by')];
Http::json(['ok'=>$ok,'admin'=>$admin,'user_id'=>(int)$u['id'],'role_id'=>(int)$u['role_id'],'health'=>$out]);