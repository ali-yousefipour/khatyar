<?php
require __DIR__.'/../lib/DashboardDiscipline.php';
function check($value,$label){if(!$value)throw new RuntimeException($label);}
check(dashboard_discipline_minutes('18:45')===1125,'duration conversion');
check(dashboard_discipline_minutes(-4)===0,'negative duration');
$rows=[];for($i=1;$i<=12;$i++)$rows[]=['id'=>$i,'total'=>$i,'edits'=>0];
$rank=dashboard_discipline_rank($rows,['total','edits']);
check(count($rank)===10 && $rank[0]['id']===12 && $rank[9]['id']===3,'top ten');
$rank=dashboard_discipline_rank([['id'=>3,'total'=>2,'edits'=>1],['id'=>2,'total'=>2,'edits'=>1]],['total','edits']);
check($rank[0]['id']===2,'stable tie');
check(dashboard_discipline_cooldown(100000,100000)===86400,'24h server lease');
check(dashboard_discipline_cooldown(100000,186399)===1,'one second before next refresh');
check(dashboard_discipline_cooldown(100000,186400)===0,'exactly 24h');
$raw=['corrections'=>[['id'=>1,'details'=>[['date'=>'1405/08/01','manual'=>[['id'=>78]]],['date'=>'1405/08/02','manual'=>[['id'=>78],['id'=>79]]]],'edits_detail'=>[['key'=>'78:check_in','date'=>'1405-08-01'],['key'=>'78:check_in','date'=>'1405-08-02']]],['id'=>2,'details'=>[['date'=>'1405/08/02','manual'=>[['id'=>12]]]]]],'irregular'=>[['id'=>1,'details'=>[['date'=>'1405/08/01','shortage'=>20,'late'=>5,'early'=>0,'auto_close'=>0],['date'=>'1405/08/02','shortage'=>70,'late'=>0,'early'=>10,'auto_close'=>1]]]]];
$people=[1=>['id'=>1,'name'=>'A','role'=>'staff']];
$r=dashboard_discipline_snapshot($raw,'1405-08-01','1405-08-02',$people);
check(count($r['corrections'])===1,'exclude users removed from authorized scope');
check($r['corrections'][0]['manual']===2&&$r['corrections'][0]['edits']===1,'deduplicate cached manual and edits');
$r=dashboard_discipline_snapshot($raw,'1405-08-02','1405-08-02',$people);
check($r['irregular'][0]['shortage']===70&&$r['irregular'][0]['late']===0&&$r['irregular'][0]['early']===1,'filter cached daily metrics');
echo "Dashboard discipline tests passed\n";
