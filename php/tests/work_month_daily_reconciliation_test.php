<?php
// Isolated regression for monthly rollup vs attendance detail rows.
date_default_timezone_set('Asia/Tehran');
class ShiftCalc { static function normJdate($v) { return str_replace('/','-',trim((string)$v)); } }
$source=file_get_contents(__DIR__.'/../lib/routes.php');
$start=strpos($source,'function _work_month_daily_attendance_totals(');
$end=strpos($source,"\n// گزارش تجمیعی کارکرد ماهانه", $start);
if($start===false || $end===false) throw new RuntimeException('Monthly rollup helper was not found');
eval(substr($source,$start,$end-$start));
function eq($name,$want,$got){if($want!==$got)throw new RuntimeException("$name: expected ".json_encode($want)." actual ".json_encode($got));echo "PASS $name\n";}
$report=['days'=>[
 ['jdate'=>'1405/07/01','expected'=>'05:00','in_shift'=>'05:00','shortage'=>'00:00','worked'=>'09:54','punches'=>[['id'=>1]]],
 ['jdate'=>'1405/07/02','expected'=>'05:00','in_shift'=>'05:00','shortage'=>'00:00','punches'=>[['id'=>2]]],
 ['jdate'=>'1405/07/03','expected'=>'00:00','in_shift'=>'00:00','shortage'=>'00:00','punches'=>[['id'=>3]]],
]];
$tot=_work_month_daily_attendance_totals($report,3);
eq('no phantom monthly shortage',0,$tot['shortage']);
eq('monthly duty',600,$tot['expected']);
eq('monthly within-shift',600,$tot['in_shift']);
// Regression matching the reported 110:00 / 107:58 / 02:02 discrepancy:
// a duty-versus-in-shift gap does NOT become shortage when the daily detail says zero.
$gapReport=['days'=>[
 ['jdate'=>'1405/07/01','expected'=>'105:00','in_shift'=>'102:58','shortage'=>'00:00','punches'=>[['id'=>10]]],
 ['jdate'=>'1405/07/02','expected'=>'05:00','in_shift'=>'05:00','shortage'=>'00:00','punches'=>[['id'=>11]]],
]];
$gap=_work_month_daily_attendance_totals($gapReport,2);
eq('reported duty 110 hours',6600,$gap['expected']);
eq('reported in-shift 107:58',6478,$gap['in_shift']);
eq('reported false 02:02 shortage corrected',0,$gap['shortage']);
$report['days'][1]['shortage']='۰۱:۲۰';
$report['days'][1]['in_shift']='03:40';
$tot=_work_month_daily_attendance_totals($report,3);
eq('real shortage preserved',80,$tot['shortage']);
$report['days'][1]=['jdate'=>'1405/07/02','expected'=>'05:00','in_shift'=>'00:00','shortage'=>'05:00','punches'=>[],'annual_leave'=>'02:00'];
$tot=_work_month_daily_attendance_totals($report,3);
eq('partial leave only remaining absence',180,$tot['absent_min']);
eq('absence not double counted as shortage',0,$tot['shortage']);
$report['days'][2]['is_future']=true;
eq('future day excluded',600,_work_month_daily_attendance_totals($report,3)['expected']);
eq('truncated day range cannot silently reconcile',null,_work_month_daily_attendance_totals($report,4));
// Monthly netting examples from the production summary (minutes).
$code=file_get_contents(__DIR__.'/../lib/routes.php');
$start=strpos($code,'function _work_month_net_shortage(');
$end=strpos($code,'function _work_month_daily_attendance_totals(', $start);
if ($start===false || $end===false) throw new RuntimeException('Monthly net settlement helper missing');
eval(substr($code,$start,$end-$start));
$mins=static function($hm){[$h,$m]=array_map('intval',explode(':',$hm));return $h*60+$m;};
eq('Ali 110 duty 110 shift must have zero shortage',0,_work_month_net_shortage([
  'expected'=>$mins('110:00'),'in_shift'=>$mins('110:00'),'shortage'=>$mins('02:02'),'absent_min'=>0
],[]));
eq('Mehdi Sharifi 175:30 shift vs 166:06 duty',0,_work_month_net_shortage([
  'expected'=>$mins('166:06'),'in_shift'=>$mins('175:30'),'shortage'=>$mins('06:31'),'absent_min'=>0
],['annual_min'=>$mins('08:00')]));
eq('Masoud absence is counted only once',0,_work_month_net_shortage([
  'expected'=>$mins('166:06'),'in_shift'=>$mins('175:58'),'shortage'=>$mins('12:50'),'absent_min'=>$mins('07:33')
],['annual_min'=>$mins('08:00')]));
eq('Mohammad authorized leave covers short shift',0,_work_month_net_shortage([
  'expected'=>$mins('166:06'),'in_shift'=>$mins('130:36'),'shortage'=>$mins('06:20'),'absent_min'=>0,'credited_exemption'=>$mins('35:30')
],['annual_min'=>$mins('56:00')]));
// Amir Mohammadian: full monthly mission is NOT a blanket credit.
$amir=['expected'=>$mins('166:06'),'in_shift'=>$mins('149:48'),
  'shortage'=>$mins('06:10'),'absent_min'=>0,
  'credited_exemption'=>$mins('16:00')];
eq('Amir: 16h leave leaves 18m uncovered despite 29:30 mission total',18,
  _work_month_net_shortage($amir,['annual_min'=>$mins('16:00'),'mission_min'=>$mins('29:30')]));
$missionDays=['days'=>[
 ['jdate'=>'1405/07/01','expected'=>'07:33','in_shift'=>'07:33','shortage'=>'00:00',
  'mission'=>'12:00','punches'=>[['id'=>1]]],
 ['jdate'=>'1405/07/02','expected'=>'07:33','in_shift'=>'07:03','shortage'=>'00:30',
  'mission'=>'00:00','punches'=>[['id'=>2]]]
]];
$dated=_work_month_daily_attendance_totals($missionDays,2);
eq('Mission on fully worked day creates no credit',0,$dated['credited_exemption']);
eq('Gap on a different day remains shortage',30,_work_month_net_shortage($dated));
$missionDays['days'][1]['mission']='00:20';
$dated=_work_month_daily_attendance_totals($missionDays,2);
eq('Same-day mission never offsets shortage',0,$dated['credited_exemption']);
eq('Shortage stays independent of mission',30,_work_month_net_shortage($dated));
$missionDays['days'][1]['annual_leave']='00:20';
$dated=_work_month_daily_attendance_totals($missionDays,2);
eq('Approved leave still covers its own duty gap',20,$dated['credited_exemption']);
eq('Remaining shortage after approved leave',10,_work_month_net_shortage($dated));
eq('Genuine uncovered shortage is preserved',40,_work_month_net_shortage([
  'expected'=>300,'in_shift'=>260,'shortage'=>70,'absent_min'=>0
],[]));
eq('Absence does not double-charge shortage',0,_work_month_net_shortage([
  'expected'=>453,'in_shift'=>0,'shortage'=>453,'absent_min'=>453
],[]));
echo "All monthly attendance rollup tests passed.\n";
