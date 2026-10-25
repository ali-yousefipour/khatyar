<?php
require __DIR__.'/../lib/OrgChart.php';
function eq($a,$b,$why){if($a!==$b)throw new RuntimeException($why.': '.json_encode($a));}
function staff($id,$role,$zone,$active=1){return ['id'=>$id,'role_title'=>$role,'zone_id'=>$zone,'is_active'=>$active,'first_name'=>'نام'.$id,'last_name'=>'آزمون','level'=>99];}
$zones=[['id'=>1,'name'=>'اصلی','parent_id'=>null,'senior_user_id'=>20,'inspector_ids'=>[21]],['id'=>2,'name'=>'زیرمنطقه','parent_id'=>1,'senior_user_id'=>null,'inspector_ids'=>[]],['id'=>3,'name'=>'همسایه','parent_id'=>null,'senior_user_id'=>30,'inspector_ids'=>[31]]];
$users=[staff(1,'مدیر کل',2),staff(2,'سربازرس ارشد',2),staff(3,'سربازرس',2),staff(4,'بازرس',2),staff(20,'سربازرس',3),staff(21,'بازرس مقیم',3),staff(30,'سربازرس',3),staff(31,'بازرس',3),staff(40,'گشت موتوری',2)];
$before=[$zones,$users];$c=OrgChart::zoneResponsibility(2,$zones,$users);
eq($c['chief']['id'],20,'explicit parent beats local role/level/physical membership');eq(array_column($c['inspectors'],'id'),[21],'explicit inspector');eq($c['zone_path'],'اصلی / زیرمنطقه','path');eq($c['zone_name'],'زیرمنطقه','direct zone contract');
$zones[1]['senior_user_id']=30;$zones[1]['inspector_ids']=[31,31,40,999];$c=OrgChart::zoneResponsibility(2,$zones,$users);eq($c['chief']['id'],30,'nearest explicit chief');eq(array_column($c['inspectors'],'id'),[31],'deduplicate and exclude motor without inspector role');
$zones[1]['senior_user_id']=2;$zones[1]['inspector_ids']=[1];$c=OrgChart::zoneResponsibility(2,$zones,$users);eq($c['chief']['id'],20,'invalid chief does not replace configured parent');eq(array_column($c['inspectors'],'id'),[21],'invalid role ignored');
$users[4]['is_active']=0;$c=OrgChart::zoneResponsibility(2,$zones,$users);eq($c['chief']['id'],3,'inactive explicit falls back to eligible local senior');eq($c['chief_source'],'role','legacy source');
$zones[0]['inspector_ids']=[];$zones[1]['inspector_ids']=[];$c=OrgChart::zoneResponsibility(2,$zones,$users);eq(array_column($c['inspectors'],'id'),[4],'legacy local inspector only, no arbitrary high-level roles');
$none=OrgChart::zoneResponsibility(999,$zones,$users);eq($none['chief'],null,'unknown zone no global fallback');eq($none['inspectors'],[],'unknown zone no inspectors');
$zones[0]['parent_id']=2;$c=OrgChart::zoneResponsibility(2,$zones,$users);eq($c['zone_name'],'زیرمنطقه','cycle bounded');
$source=file_get_contents(__DIR__.'/../lib/routes.php');$a=strpos($source,"route('GET', '/api/me/full-profile'");$b=strpos($source,"route('POST', '/api/me/zone-select'",$a);$profile=substr($source,$a,$b-$a);eq(str_contains($profile,'cr.level>=4'),false,'old heuristic removed');eq(substr_count($profile,'OrgChart::currentZoneResponsibility'),3,'profile, inspector choices, current selection share authority');
echo "PASS zone context: explicit assignments, inherited subregions, active roles, no sibling fallback, legacy fallback, cycles and shared API authority\n";
