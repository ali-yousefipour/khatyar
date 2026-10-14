<?php
// Isolated deterministic calendar mapping for ShiftCalc's pure time-window tests.
function jalali_to_gregorian($jy, $jm, $jd) { return [2026, 10, 15]; }
function gregorian_to_jalali($gy, $gm, $gd) { return [1405, 7, 23]; }
require_once __DIR__.'/../lib/ShiftCalc.php';

function expect_same($label, $expected, $actual): void {
  if ($expected !== $actual) {
    fwrite(STDERR, "$label failed\nExpected: ".var_export($expected, true)."\nActual: ".var_export($actual, true)."\n");
    exit(1);
  }
  echo "PASS $label\n";
}

$jdate='1405-07-23';
$base=ShiftCalc::jdateToTs($jdate);
$segments=[['s'=>'09:00','e'=>'12:00'],['s'=>'13:00','e'=>'17:00']];
$shift=['type'=>'advanced'];
$day=['segments'=>json_encode($segments,JSON_UNESCAPED_UNICODE),'is_off'=>0];
expect_same('future shift minutes are not accrued',0,ShiftCalc::elapsedExpectedMinutes($shift,$jdate,$day,strtotime('2026-10-15 08:00:00')));
expect_same('only elapsed first segment minutes accrue',120,ShiftCalc::elapsedExpectedMinutes($shift,$jdate,$day,strtotime('2026-10-15 11:00:00')));
expect_same('elapsed time includes completed and current segments',270,ShiftCalc::elapsedExpectedMinutes($shift,$jdate,$day,strtotime('2026-10-15 14:30:00')));
expect_same('elapsed requirement is capped at daily expected minutes',420,ShiftCalc::elapsedExpectedMinutes($shift,$jdate,$day,strtotime('2026-10-15 19:00:00')));
expect_same('cross-midnight shift accrues after midnight',240,ShiftCalc::elapsedExpectedMinutes(['type'=>'advanced'],$jdate,['segments'=>json_encode([['s'=>'22:00','e'=>'06:00']]),'is_off'=>0],strtotime('2026-10-16 02:00:00')));
expect_same('automatic shift has no provable partial-day schedule',null,ShiftCalc::elapsedExpectedMinutes(['type'=>'auto','auto_expected_min'=>453],$jdate,null,strtotime('2026-10-15 12:00:00')));
expect_same('current month stops at the supplied Jalali day',23,ShiftCalc::monthReportLastDay(1405,7,$jdate));
expect_same('other months retain their full day range',30,ShiftCalc::monthReportLastDay(1405,7,'1405-08-01'));

echo "All work-summary cutoff checks passed.\n";
