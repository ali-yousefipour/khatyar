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
echo "Dashboard discipline tests passed\n";
