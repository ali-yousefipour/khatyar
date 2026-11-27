<?php
declare(strict_types=1);
date_default_timezone_set('Asia/Tehran');
require_once __DIR__.'/../lib/ShiftCalc.php';
function verify(bool $value,string $label): void {
  if(!$value)throw new RuntimeException($label);
  echo "PASS ".$label."\n";
}
$shift=['type'=>'advanced','title'=>'صبح'];
$segment=['s'=>'09:00','e'=>'14:00','es'=>'08:55','ls'=>'09:20','ee'=>'13:30','le'=>'14:05'];
$dayRow=['is_off'=>0,'segments'=>[$segment],'day_config'=>[]];
$limits=ShiftCalc::segmentTrafficLimits($segment);
verify($limits['entry_from']==='08:55'&&$limits['entry_until']==='09:20','exact morning entry window returned');
verify($limits['exit_from']==='13:30'&&$limits['exit_until']==='14:05','exact morning exit window returned');
$valid=function(string $time,string $kind)use($shift,$dayRow):bool {
  return !empty(ShiftCalc::checkThreshold($shift,'1405-09-06',$dayRow,strtotime('2026-11-27 '.$time.':00'),$kind)['ok']);
};
verify(!$valid('08:54','in'),'morning arrival before 08:55 rejected');
verify($valid('08:55','in'),'morning arrival at 08:55 allowed');
verify($valid('09:20','in'),'last permitted entry minute is inclusive');
verify(!$valid('09:21','in'),'entry after final minute rejected');
verify($valid('14:05','out'),'last permitted checkout minute 14:05 is inclusive');
verify(!$valid('14:06','out'),'checkout after 14:05 rejected');
$night=['s'=>'23:45','e'=>'07:00','es'=>'23:20','ls'=>'00:05','ee'=>'06:40','le'=>'07:15'];
$nightRow=['is_off'=>0,'segments'=>[$night],'day_config'=>[]];
$nightLimits=ShiftCalc::segmentTrafficLimits($night);
verify($nightLimits['entry_from']==='23:20'&&$nightLimits['entry_until']==='00:05','midnight crossing window preserved');
verify(!empty(ShiftCalc::checkThreshold($shift,'1405-09-06',$nightRow,strtotime('2026-11-27 23:30:00'),'in')['ok']),'night entry before midnight allowed');
verify(!empty(ShiftCalc::checkThreshold($shift,'1405-09-06',$nightRow,strtotime('2026-11-28 00:05:00'),'in')['ok']),'night entry at next-day endpoint allowed');
verify(empty(ShiftCalc::checkThreshold($shift,'1405-09-06',$nightRow,strtotime('2026-11-28 00:06:00'),'in')['ok']),'night entry after deadline rejected');
verify(ShiftCalc::segmentTrafficLimits(['s'=>'bad','e'=>'14:00'])===null,'unknown shift bounds are never fabricated');
echo "Canonical substitute traffic window tests passed\n";
