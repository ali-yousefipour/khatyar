<?php
declare(strict_types=1);
require_once __DIR__.'/../lib/OrgChart.php';
function assertZoneFallback(bool $condition,string $name): void {
  if(!$condition)throw new RuntimeException($name);
}
$zones=[
 ['id'=>100,'name'=>'منطقه سازمان تاکسیرانی','parent_id'=>null],
 ['id'=>101,'name'=>'زیر منطقه سازمان','parent_id'=>100],
 ['id'=>200,'name'=>'گشت‌های موتوری','parent_id'=>null],
 ['id'=>201,'name'=>'گشت موتوری - نوبت عصر','parent_id'=>200],
 ['id'=>300,'name'=>'منطقه یک','parent_id'=>null],
 ['id'=>301,'name'=>'خط ۲','parent_id'=>300],
];
foreach([100,101,200,201] as $id)
  assertZoneFallback(OrgChart::legacyDirectChiefZone($id,$zones),'Legacy direct-chief region not recognized: '.$id);
assertZoneFallback(OrgChart::legacyDirectChiefBoundaryZone(101,$zones)===100,'HQ descendant boundary');
assertZoneFallback(OrgChart::legacyDirectChiefBoundaryZone(201,$zones)===201,'Nearest motorcycle-patrol boundary');
assertZoneFallback(OrgChart::zoneInsideBoundary(101,100,$zones),'Explicit HQ reviewer must cover descendants');
assertZoneFallback(!OrgChart::zoneInsideBoundary(100,200,$zones),'Unrelated parent reviewer must not leak into patrol');
foreach([300,301,999] as $id)
  assertZoneFallback(!OrgChart::legacyDirectChiefZone($id,$zones),'Unrelated region incorrectly bypassed: '.$id);
$cyclic=[['id'=>400,'name'=>'منطقه الف','parent_id'=>401],['id'=>401,'name'=>'منطقه ب','parent_id'=>400]];
assertZoneFallback(!OrgChart::legacyDirectChiefZone(400,$cyclic),'Cyclic tree should be bounded');
echo "PASS legacy chief-direct zones (HQ, motor patrol, descendants, unrelated, cycle)\n";
