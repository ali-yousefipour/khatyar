<?php
require_once __DIR__.'/../lib/OrganizationWorkPlacement.php';
function checkPlacement($value){if(!$value)throw new RuntimeException('Placement regression');}
$slots=[['id'=>'3','location'=>'راه آهن','role'=>'ناظر خط'],['id'=>'4','location'=>'راه آهن','role'=>'ناظر خط']];
$people=[['id'=>1,'location'=>'راه آهن','role'=>'ناظر خط'],['id'=>2,'location'=>'راه آهن','role'=>'بازرس'],['id'=>3,'location'=>'راه آهن','role'=>'ناظر خط']];
$r=OrganizationWorkPlacement::suggest($slots,$people);
checkPlacement($r['assignments'][3]===1&&$r['assignments'][4]===3&&$r['unassigned']===[2]);
$r=OrganizationWorkPlacement::validate($slots,$people,[3=>2,4=>null]);
checkPlacement($r['unassigned']===[1,3]);
try{OrganizationWorkPlacement::validate($slots,$people,[3=>1,4=>1]);throw new RuntimeException('Duplicate accepted');}catch(InvalidArgumentException $e){}
echo "OK\n";
