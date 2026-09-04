<?php
/**
 * خطیار — سیاست مرکزی دسترسی خودرو/موتورسیکلت پرسنل.
 * سطح role.level میزان ارشدیت است؛ نوع وسیله از مجوزهای role_app_items جدا می‌شود.
 */
if(!function_exists('pva_policy_norm')){
function pva_policy_norm($s){$s=trim((string)$s);return strtr($s,['ي'=>'ی','ى'=>'ی','ك'=>'ک','ۀ'=>'ه','ة'=>'ه','۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9']);}
function pva_policy_table_exists($t){static $c=[];if(isset($c[$t]))return $c[$t];try{$r=Db::one("SELECT COUNT(*) c FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?",[$t]);return $c[$t]=((int)($r['c']??0)>0);}catch(Throwable $e){return $c[$t]=false;}}
function pva_policy_config(){static $cfg=null;if($cfg!==null)return $cfg;$cfg=['edit'=>1,'management'=>4,'checklist'=>4];try{if(pva_policy_table_exists('app_settings')){$rows=Db::all("SELECT `key`,`value` FROM app_settings WHERE `key` IN ('personnel_vehicle_min_level','personnel_vehicle_management_min_level','personnel_vehicle_checklist_min_level')");foreach($rows as $r){$k=(string)$r['key'];$v=(int)$r['value'];if($k==='personnel_vehicle_min_level')$cfg['edit']=$v;if($k==='personnel_vehicle_management_min_level')$cfg['management']=$v;if($k==='personnel_vehicle_checklist_min_level')$cfg['checklist']=$v;}}}catch(Throwable $e){}return $cfg;}
function pva_policy_items($roleId){static $cache=[];$rid=(string)$roleId;if(isset($cache[$rid]))return $cache[$rid];$items=[];try{if(pva_policy_table_exists('app_settings')){$r=Db::one("SELECT value FROM app_settings WHERE `key`='role_app_items' LIMIT 1");$cfg=$r?json_decode((string)$r['value'],true):[];$items=(is_array($cfg)&&array_key_exists($rid,$cfg)&&is_array($cfg[$rid]))?$cfg[$rid]:[];}}catch(Throwable $e){}return $cache[$rid]=$items;}
function pva_policy_has_item($u,$item,$default=true){$items=pva_policy_items($u['role_id']??0);if(!$items)return $default;return in_array($item,$items,true);}
function pva_policy_level($u){return (int)($u['role_level']??$u['level']??0);}
function pva_policy_allowed($u,$kind='edit',$type=null){
  if(!empty($u['is_admin']))return true;
  $cfg=pva_policy_config();$level=pva_policy_level($u);
  if($kind==='management')return $level>=$cfg['management'] && pva_policy_has_item($u,'PersonnelVehicleManagement',true);
  if($kind==='check')return $level>=$cfg['checklist'] && pva_policy_has_item($u,'PersonnelVehicleChecklist',true);
  if($level<$cfg['edit'])return false;
  if($type==='motorcycle')return pva_policy_has_item($u,'PersonnelMotorcycle',true);
  if($type==='car')return pva_policy_has_item($u,'PersonnelVehicle',true);
  return pva_policy_has_item($u,'PersonnelVehicle',true)||pva_policy_has_item($u,'PersonnelMotorcycle',true);
}
function pva_policy_type($u,$requested=null){
  if($requested==='car'||$requested==='motorcycle')return pva_policy_allowed($u,'edit',$requested)?$requested:false;
  $items=pva_policy_items($u['role_id']??0);$hasCar=in_array('PersonnelVehicle',$items,true);$hasMoto=in_array('PersonnelMotorcycle',$items,true);
  if($items){if($hasMoto&&!$hasCar)return 'motorcycle';if($hasCar&&!$hasMoto)return 'car';}
  return 'car';
}
}
