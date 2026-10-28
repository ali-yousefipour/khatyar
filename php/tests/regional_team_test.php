<?php
require_once __DIR__.'/../lib/RegionalTeam.php';
function checkTeam($ok,$message){if(!$ok)throw new RuntimeException($message);}
$users=[
 ['id'=>1,'role_title'=>'سربازرس','level'=>5,'zone_id'=>1,'is_active'=>1],
 ['id'=>2,'role_title'=>'بازرس','level'=>6,'zone_id'=>2,'is_active'=>1],
 ['id'=>3,'role_title'=>'بازرس مقیم','level'=>6,'zone_id'=>8,'is_active'=>1],
 ['id'=>4,'role_title'=>'اپراتور','level'=>8,'zone_id'=>2,'is_active'=>1],
 ['id'=>5,'role_title'=>'ناظر خط','level'=>8,'zone_id'=>3,'is_active'=>1],
 ['id'=>6,'role_title'=>'اپراتور','level'=>8,'zone_id'=>4,'is_active'=>1],
 ['id'=>7,'role_title'=>'ناظر خط','level'=>8,'zone_id'=>3,'is_active'=>0],
 ['id'=>8,'role_title'=>'سربازرس','level'=>5,'zone_id'=>4,'is_active'=>1],
 ['id'=>9,'role_title'=>'بازرس','level'=>6,'zone_id'=>4,'is_active'=>1],
];
$zones=[['id'=>1,'parent_id'=>null],['id'=>2,'parent_id'=>1],['id'=>3,'parent_id'=>2],['id'=>4,'parent_id'=>null],['id'=>8,'parent_id'=>null]];
$leaders=[['zone_id'=>1,'senior_user_id'=>1,'inspector_ids'=>[]],['zone_id'=>2,'senior_user_id'=>null,'inspector_ids'=>[2,3]]];
$ids=static fn($members)=>array_map(static fn($member)=>(int)$member['id'],$members);
checkTeam($ids(RegionalTeam::allowedMembers($users[0],$users,$zones,$leaders))===[2,3,4,5],'Senior sees inspectors including cross-region appointee, plus field staff in descendants only');
checkTeam($ids(RegionalTeam::allowedMembers($users[1],$users,$zones,$leaders))===[4,5],'Inspector sees operator and line observer in own region and descendants');
checkTeam($ids(RegionalTeam::allowedMembers($users[2],$users,$zones,$leaders))===[4,5],'Explicitly appointed inspector sees assigned region, not physical base zone');
checkTeam($ids(RegionalTeam::allowedMembers($users[7],$users,$zones,$leaders))===[9,6] || $ids(RegionalTeam::allowedMembers($users[7],$users,$zones,$leaders))===[6,9],'Separate region senior does not see other regions');
checkTeam(RegionalTeam::allowedMembers($users[3],$users,$zones,$leaders)===[],'Operators cannot enumerate personnel');
// Role labels are editable and can be unrelated to the user's numeric level.
$users[]=['id'=>10,'role_title'=>'نیروی مقیم سازمان','level'=>9,'zone_id'=>2,'is_active'=>1];
$users[]=['id'=>11,'role_title'=>'گشت موتوری','level'=>7,'zone_id'=>3,'is_active'=>1];
$users[]=['id'=>12,'role_title'=>'بازرس گشت خودرویی','level'=>6,'zone_id'=>2,'is_active'=>1];
checkTeam($ids(RegionalTeam::allowedMembers($users[1],$users,$zones,$leaders))===[4,5,10,11],'Level-six inspector includes levels seven through nine in responsible regions');
$renamedInspector=$users[1];$renamedInspector['role_title']='عنوان سفارشی';
checkTeam($ids(RegionalTeam::allowedMembers($renamedInspector,$users,$zones,$leaders))===[4,5,10,11],'Renamed level-six role keeps regional team access');
checkTeam(in_array(12,$ids(RegionalTeam::allowedMembers($users[0],$users,$zones,$leaders)),true),'Level-five senior includes all lower regional staff');
checkTeam(!in_array(12,$ids(RegionalTeam::allowedMembers($users[1],$users,$zones,$leaders)),true),'Level-six inspector cannot enumerate same-level peers');
checkTeam(RegionalTeam::zoneTree([['id'=>3,'parent_id'=>2],['id'=>2,'parent_id'=>3]],[2])===[2,3],'Malformed cycles cannot create infinite loops');
$none=RegionalTeam::attendanceState([]);
checkTeam($none['attendance_status']==='absent'&&$none['attendance_sessions']===[],'No check-in today is absent');
$one=RegionalTeam::attendanceState([['check_in'=>'2026-10-28 07:00:00','check_out'=>null]]);
checkTeam($one['attendance_status']==='present'&&$one['check_in_time']==='07:00','Open shift is present');
$done=RegionalTeam::attendanceState([['check_in'=>'2026-10-28 07:00:00','check_out'=>'2026-10-28 12:30:00']]);
checkTeam($done['attendance_status']==='completed'&&$done['check_out_time']==='12:30','Closed shift is completed');
$twice=RegionalTeam::attendanceState([
 ['check_in'=>'2026-10-28 06:00:00','check_out'=>'2026-10-28 11:00:00'],
 ['check_in'=>'2026-10-28 14:00:00','check_out'=>'2026-10-28 18:00:00'],
]);
checkTeam($twice['attendance_status']==='completed'&&count($twice['attendance_sessions'])===2,'Both finished shifts remain visible');
$reentered=RegionalTeam::attendanceState([
 ['check_in'=>'2026-10-28 06:00:00','check_out'=>'2026-10-28 11:00:00'],
 ['check_in'=>'2026-10-28 14:00:00','check_out'=>null],
]);
checkTeam($reentered['attendance_status']==='present'&&count($reentered['attendance_sessions'])===2,'New open shift takes priority and preserves earlier checkout');
echo "PASS team regional scope, nested zones, designated managers, inactive personnel and isolation\n";
