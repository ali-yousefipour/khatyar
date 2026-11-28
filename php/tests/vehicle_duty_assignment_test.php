<?php
$source=file_get_contents(__DIR__.'/../lib/routes.php');
$start=strpos($source,'function _vehicle_duty_role(');
$end=strpos($source,'function _vehicle_duty_report(',$start);
if($start===false||$end===false)throw new RuntimeException('vehicle duty helpers missing');
eval(substr($source,$start,$end-$start));
function expect($actual,$expected){if($actual!==$expected)throw new RuntimeException('Unexpected vehicle duty eligibility: '.var_export($actual,true));}
expect(_vehicle_duty_eligible_role('گشت موتوری',null),'گشت موتوری');
expect(_vehicle_duty_eligible_role('سربازرس','car'),'سربازرس');
expect(_vehicle_duty_eligible_role('ناظر خط','car'),'ناظر خط');
expect(_vehicle_duty_eligible_role('اپراتور','motorcycle'),'اپراتور');
expect(_vehicle_duty_eligible_role('اپراتور',null),null);
expect(_vehicle_duty_eligible_role('اپراتور','invalid'),null);
$row=['days'=>0,'ordinary'=>0,'fridays'=>0,'holidays'=>0];$seen=[];
_vehicle_duty_add_day($row,$seen,'1405-09-01',false,false);
_vehicle_duty_add_day($row,$seen,'1405-09-01',false,false);
_vehicle_duty_add_day($row,$seen,'1405-09-06',true,true);
expect($row,['days'=>2,'ordinary'=>1,'fridays'=>1,'holidays'=>0]);
echo "PASS machinery eligibility and unique attendance days\n";
