<?php
require_once __DIR__.'/../lib/OrgChart.php';

function personnel($id, $role, $zone = null, $active = 1) {
  return ['id'=>(string)$id, 'role_title'=>$role, 'zone_id'=>$zone, 'is_active'=>$active];
}
function managers_for($edges, $userId) {
  $managers = array_map('intval', array_column(array_filter($edges, fn($edge)=>(int)$edge['user_id']===$userId), 'manager_id'));
  sort($managers);
  return $managers;
}
function expect_managers($edges, $userId, $expected) {
  $actual = managers_for($edges, $userId);
  if ($actual !== $expected) throw new RuntimeException('Unexpected managers for '.$userId.': '.json_encode($actual));
}

$users = [personnel(1,'معاونت بازرسی و نظارت'),personnel(2,'رئیس اداره بازرسی'),personnel(3,'سر بازرس ارشد'),
  personnel(4,'سربازرس','10'),personnel(5,'بازرس',10),personnel(6,'بازرس مقیم',10),personnel(7,'بازرس گشت موتوری',10),
  personnel(8,'اپراتور',10),personnel(9,'ناظر خط',10),personnel(10,'سربازرس',20),personnel(11,'بازرس مقیم',20),
  personnel(12,'اپراتور',20),personnel(13,'نیروی اداری'),personnel(14,'نیروی اداری مقیم سازمان'),
  personnel(15,'مدیر اجرایی شرکت'),personnel(16,'نیروی صدور پروانه'),personnel(17,'ناظر خط'),
  personnel(18,'بازرس',30),personnel(19,'سربازرس ارشد',null,0),personnel(20,'بازرس',10,0),
  personnel(21,'سایر'),personnel(22,'سمت سفارشی'),personnel(23,'بازرس گشت موتور سیکلت',20)];
$saved = [['user_id'=>8,'manager_id'=>11,'primary'=>1],['user_id'=>21,'manager_id'=>22,'primary'=>1],
  ['user_id'=>22,'manager_id'=>21,'primary'=>1],['user_id'=>21,'manager_id'=>21],['user_id'=>21,'manager_id'=>19]];
$before = $users;
$edges = OrgChart::defaultEdges($users,$saved);
expect_managers($edges,1,[]);
expect_managers($edges,2,[1]);
expect_managers($edges,3,[2]);
expect_managers($edges,4,[3]);
expect_managers($edges,5,[4]);
expect_managers($edges,6,[4]);
expect_managers($edges,7,[3]);
expect_managers($edges,8,[5,6,7]);
expect_managers($edges,9,[5,6,7]);
expect_managers($edges,10,[3]);
expect_managers($edges,11,[10]);
expect_managers($edges,12,[11,23]);
expect_managers($edges,13,[2]);
expect_managers($edges,14,[2]);
expect_managers($edges,15,[]);
expect_managers($edges,16,[15]);
expect_managers($edges,17,[]);
expect_managers($edges,18,[]);
expect_managers($edges,19,[]);
expect_managers($edges,20,[]);
expect_managers($edges,21,[22]);
expect_managers($edges,22,[]);
expect_managers($edges,23,[3]);
if ($users !== $before) throw new RuntimeException('Personnel data was mutated');
foreach ($users as &$user) if ((int)$user['id'] === 8) $user['zone_id'] = 20;
unset($user);
expect_managers(OrgChart::defaultEdges($users,$saved),8,[11,23]);
if (OrgChart::roleKey('رئيس اداره بازرسي') !== 'head' || OrgChart::roleKey('سر‌بازرس ارشد') !== 'chief') throw new RuntimeException('Role normalization failed');
if (OrgChart::defaultEdges([]) !== []) throw new RuntimeException('Empty chart failed');
$nested=[personnel(30,'سربازرس',1),personnel(31,'بازرس',2),personnel(32,'اپراتور',3),personnel(33,'بازرس',4),personnel(34,'اپراتور',4)];
$nestedZones=[['id'=>1,'parent_id'=>null],['id'=>2,'parent_id'=>1],['id'=>3,'parent_id'=>2],['id'=>4,'parent_id'=>null]];
$nestedEdges=OrgChart::defaultEdges($nested,[],$nestedZones);
expect_managers($nestedEdges,31,[30]);
expect_managers($nestedEdges,32,[31]);
expect_managers($nestedEdges,33,[]);
expect_managers($nestedEdges,34,[33]);
echo "PASS regional hierarchy: every requested role, same-region parents, direct motor-to-chief, multiple inspectors, zone changes, unassigned/missing/inactive parents, saved relationships and cycle prevention\n";
