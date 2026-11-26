<?php
require __DIR__.'/../lib/LeaveSubstituteCoverage.php';
require __DIR__.'/../lib/ShiftCalc.php';
function assertOverlap($a,$b,$expected){if(LeaveSubstituteCoverage::windowsOverlap($a,$b)!==$expected)throw new RuntimeException('Overlap mismatch');}
$base=strtotime('2026-12-01 12:00:00');
$a=ShiftCalc::segmentWindow(['s'=>'06:00','e'=>'14:00'],$base);
$b=ShiftCalc::segmentWindow(['s'=>'14:00','e'=>'22:00'],$base);
$c=ShiftCalc::segmentWindow(['s'=>'12:00','e'=>'20:00'],$base);
assertOverlap([$a],[$b],false);
assertOverlap([$a],[$c],true);
assertOverlap([$a],[$a],true);
assertOverlap([],[$a],false);
$night=ShiftCalc::segmentWindow(['s'=>'22:00','e'=>'06:00'],$base);
$next=ShiftCalc::segmentWindow(['s'=>'05:00','e'=>'08:00'],$base+86400);
assertOverlap([$night],[$next],true);
$boundary=ShiftCalc::segmentWindow(['s'=>'06:00','e'=>'08:00'],$base+86400);
assertOverlap([$night],[$boundary],false);
assertOverlap([$a,$night],[$b],false);
echo "PASS 7 precise substitute interval cases: adjacent, overlap, same, empty, midnight and split\n";
