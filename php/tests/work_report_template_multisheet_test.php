<?php
require_once __DIR__.'/../lib/WorkReportTemplateExporter.php';
require_once __DIR__.'/../lib/WorkReportTemplateParser.php';
function checkWorkbook($ok,$message){if(!$ok)throw new RuntimeException($message);}
$input=$argv[1]??'';$dest=$argv[2]??'';
if(!is_file($input)||!$dest)throw new RuntimeException('Fixture and output required');
$mapping=['sheet'=>'سازمان','first_row'=>3,'last_row'=>5,'heading'=>['cell'=>'A1','format'=>'{title} - {month_name} {year}'],'columns'=>['ordinal'=>'A','location'=>'B','role'=>'C','first_name'=>'E','last_name'=>'F','personnel_code'=>'G','friday'=>'H','holiday'=>'I','overtime'=>'J']];
$structure=WorkReportTemplateParser::parse($input,$mapping);
checkWorkbook(count($structure['slots'])===3,'fixture capacity');
$records=[];for($i=1;$i<=4;$i++)$records[]=['user_id'=>$i,'cells'=>['','','','','Test'.$i,'Person','T00'.$i,$i+0.25,1.5,2.75],'comments'=>[7=>'جمعه 12',8=>'تعطیل 3',9=>'اضافه 4'],'placement'=>['id'=>$i,'location'=>$i===4?'Other':'Line A','role'=>'Inspector']];
$out=WorkReportTemplateExporter::export($input,$structure,$records,['assignments'=>[3=>2,4=>1,5=>null],'unmatched'=>[4],'overflow'=>[3]],['year'=>1405,'month'=>8]);
try{checkWorkbook(copy($out,$dest),'output copy');}finally{@unlink($out);}
echo "Multisheet export generated\n";
