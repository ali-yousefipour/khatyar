<?php
// Regression: self-service work-summary must not enumerate the organization.
$source = file_get_contents(__DIR__.'/../lib/routes.php');
$start = strpos($source, "route('GET', '/api/my/work-summary'");
$end = strpos($source, "\nroute(", $start+10);
if ($start === false) throw new RuntimeException('My Work route missing');
$block = substr($source, $start, $end === false ? 2500 : $end-$start);
if (strpos($block, "(int)\$u['id']") === false) throw new RuntimeException('Current user ID missing from work-summary');
if (strpos($block, '_shift_month_report(') === false) throw new RuntimeException('Monthly calculator not called');
echo "PASS self-service scoped to authenticated user\n";
