<?php
require_once __DIR__.'/../lib/GpsWorkIntervals.php';

function assert_ranges(string $name, array $expected, array $actual): void {
  if ($expected !== $actual) {
    fwrite(STDERR, $name." failed\nExpected: ".var_export($expected,true)."\nActual: ".var_export($actual,true)."\n");
    exit(1);
  }
  echo "PASS $name\n";
}

$base=100000;
assert_ranges('background and missing checkpoints do not deduct',[],gps_work_explicit_off_intervals([
  ['kind'=>'app_background','at'=>$base+900],
  ['kind'=>'app_foreground','at'=>$base+1900],
  ['kind'=>'session_end','at'=>$base+1950],
  ['kind'=>'app_closed','at'=>$base+2000],
  ['kind'=>'gps_on','at'=>$base+1800],
  ['kind'=>'offline','at'=>$base+2000],
],$base,$base+3600));
assert_ranges('explicit GPS off creates a clipped checkpoint interval',[[100300,102100]],gps_work_explicit_off_intervals([
  ['kind'=>'gps_off','at'=>$base+2100],
],$base+300,$base+4000));
assert_ranges('overlapping GPS off intervals merge once',[[103600,106000]],gps_work_explicit_off_intervals([
  ['kind'=>'gps_off','at'=>$base+5400],
  ['kind'=>'gps_off','at'=>$base+6000],
],$base,$base+7000));
assert_ranges('GPS off before activation cannot deduct pre-activation time',[[100600,101200]],gps_work_explicit_off_intervals([
  ['kind'=>'gps_off','at'=>$base+1200],
],$base,$base+3000,1800,$base+600));
assert_ranges('invalid report range is empty',[],gps_work_explicit_off_intervals([
  ['kind'=>'gps_off','at'=>$base+1200],
],$base+3000,$base));
