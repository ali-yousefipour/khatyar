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

assert_ranges('internet offline under 30 minutes is not deducted',[],work_confirmed_off_intervals([
  ['kind'=>'offline','at'=>$base],['kind'=>'online','at'=>$base+1799],
],$base,$base+4000,'internet_off','internet_on'));
assert_ranges('legacy internet transition counts confirmed full half-hours',[[100000,103600]],work_confirmed_off_intervals([
  ['kind'=>'offline','at'=>$base],['kind'=>'online','at'=>$base+3700],
],$base,$base+5000,'internet_off','internet_on'));
assert_ranges('one unconfirmed gps_off does not deduct time before shutdown',[],work_confirmed_off_intervals([
  ['kind'=>'gps_off','at'=>$base+700],
],$base,$base+3600,'gps_off','gps_on'));
assert_ranges('two GPS off checkpoints confirm one block',[[100700,102500]],work_confirmed_off_intervals([
  ['kind'=>'gps_off','at'=>$base+700],['kind'=>'gps_off','at'=>$base+2500],
],$base,$base+3600,'gps_off','gps_on'));
assert_ranges('GPS recovery after attendance end confirms only attended half-hour',[[100000,101800]],work_confirmed_off_intervals([
  ['kind'=>'gps_off','at'=>$base],['kind'=>'gps_on','at'=>$base+4200],
],$base,$base+2400,'gps_off','gps_on'));
assert_ranges('internet checkpoint and state aliases must not double count',[[100000,103600]],work_confirmed_off_intervals([
  ['kind'=>'offline','at'=>$base],['kind'=>'internet_off','at'=>$base+5],
  ['kind'=>'internet_off','at'=>$base+1800],['kind'=>'internet_on','at'=>$base+3650],
  ['kind'=>'online','at'=>$base+3660],
],$base,$base+5000,'internet_off','internet_on'));

require_once __DIR__.'/../lib/ShiftCalc.php';
// Recorded presence is independent of device-off evidence. Overlapping confirmed
// GPS and internet windows must be counted once when a combined penalty is shown.
$parts=ShiftCalc::validSessionParts([
  'in'=>$base,'out'=>$base+5400,'gps_invalid'=>[
    [$base+600,$base+2400],[$base+1800,$base+3600],
  ],
]);
assert_ranges('telemetry never shortens actual presence',[[$base,$base+5400]],$parts);
$detail=static fn($a,$b)=>['start_at'=>date('Y-m-d H:i:s',$a),'end_at'=>date('Y-m-d H:i:s',$b)];
if(work_device_off_union_minutes([$detail($base+600,$base+2400)],[$detail($base+1800,$base+3600)])!==50)throw new RuntimeException('Overlapping device-off windows must count only once');
if(work_device_off_union_minutes([$detail($base,$base+600)],[$detail($base+1200,$base+1800)])!==20)throw new RuntimeException('Disjoint evidence must retain both intervals');
if(work_device_off_union_minutes([],[])!==0)throw new RuntimeException('Empty device evidence cannot deduct time');
$routes=file_get_contents(__DIR__.'/../lib/routes.php');
$owned=file_get_contents(__DIR__.'/../app/api/admin-attendance-report-owned.php');
if (!str_contains($routes,"kind IN ('internet_off','internet_on','offline','online')") &&
    !str_contains(file_get_contents(__DIR__.'/../lib/InternetWorkIntervals.php'),"kind IN ('internet_off','internet_on','offline','online')"))
  throw new RuntimeException('Previous Android offline/online signals must be recognized');
if (!str_contains($routes,"$"."w['internet_invalid_min']"))
  throw new RuntimeException('Daily work API must return Internet-off minutes');
if (!str_contains($routes,"'_work_invalid'"))
  throw new RuntimeException('Live work must include combined downtime evidence');
if (!str_contains($owned,'work_device_off_union_minutes') || !str_contains($routes,'work_device_off_union_minutes'))
  throw new RuntimeException('Daily and monthly reports must expose deduplicated device-off evidence');
echo "PASS independent presence and overlapping device-off evidence\n";
echo "PASS GPS/internet deductions are aligned in live, daily and monthly work\n";
