<?php
declare(strict_types=1);
$routes=file_get_contents(__DIR__.'/../lib/routes.php');
$report=file_get_contents(__DIR__.'/../lib/UserFullReport.php');
if(!is_string($routes)||!is_string($report))throw new RuntimeException('Cannot inspect canonical report routes');
$needle="route('GET', '/api/admin/users/export'";
$start=strpos($routes,$needle);
if($start===false||strpos($routes,$needle,$start+1)!==false)
  throw new RuntimeException('Legacy full-users export route must be unique');
$end=strpos($routes,"\nroute(", $start+1);
if($end===false||$end-$start>900)
  throw new RuntimeException('Legacy report still contains independent export logic');
$handler=substr($routes,$start,$end-$start);
if(!str_contains($handler,'UserFullReport::run([],true)'))
  throw new RuntimeException('Legacy report bypasses published report visibility');
if(!str_contains($report,'orderedByProfile(')||!str_contains($report,'report_visible'))
  throw new RuntimeException('Published report visibility is no longer enforced');
if(!str_contains($report,'personnel_photo')||!str_contains($report,'personnel_signature'))
  throw new RuntimeException('Personnel photo or signature is not selectable');
if(!str_contains($report,'WHERE user_id IN ($userMarks) AND field_id IN ($fieldMarks)'))
  throw new RuntimeException('Custom field query is not scoped to selected users');
echo "PASS legacy and configurable user exports share published field authorization\n";
