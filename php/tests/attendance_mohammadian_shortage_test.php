<?php
// Regression: mission minutes do not offset shortage in the attendance detail.
$code = file_get_contents(__DIR__ . '/../app/api/admin-attendance-report-owned.php');
if (strpos($code, '$expectedMin - min($inShiftMin, $expectedMin) - $approvedExempt') === false) {
  throw new RuntimeException('Shift based shortage recomputation missing');
}
if (strpos($code, '$annualLeave + $sickLeave + $unpaidLeave)') === false) {
  throw new RuntimeException('Approved exemption must exclude mission');
}
function assertMinutes($label,$expected,$inShift,$leave,$result) {
  $actual=max(0,$expected-min($inShift,$expected)-$leave);
  if($result!==$actual)throw new RuntimeException($label);
  echo "PASS $label\n";
}
assertMinutes('Mehr 8 mission does not offset shortage',453,423,0,30);
assertMinutes('Mehr 15 mission does not offset shortage',453,415,0,38);
assertMinutes('Mehr 21 mission does not offset shortage',453,305,0,148);
assertMinutes('Mehr 11 annual leave can cover shortage',453,423,270,0);
