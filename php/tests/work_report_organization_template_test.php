<?php
require_once __DIR__.'/../lib/WorkReportTemplateParser.php';
require_once __DIR__.'/../lib/WorkReportTemplateExporter.php';
$input=$argv[1];$dest=$argv[2];
$mapping=['sheet'=>'Sheet1','first_row'=>3,'last_row'=>109,'heading'=>['cell'=>'A1','format'=>"{title}\n ({month_name} {year})"],'columns'=>['ordinal'=>'A','location'=>'B','role'=>'C','first_name'=>'E','last_name'=>'F','personnel_code'=>'G','friday'=>'H','holiday'=>'I','overtime'=>'J']];
$s=WorkReportTemplateParser::parse($input,$mapping);
if(count($s['slots'])!==107||count($s['merges'])!==37||count(array_filter($s['slots'],fn($x)=>$x['combined']))!==37)throw new RuntimeException('Organization structure mismatch');
$r=[];for($i=1;$i<=4;$i++)$r[]=['user_id'=>$i,'cells'=>['','','','','Test','Person',sprintf('QA%03d',$i),$i+.25,1.5,2.75],'comments'=>[7=>'جمعه 12',8=>'تعطیل 3',9=>'اضافه 4'],'placement'=>['id'=>$i,'location'=>'شرکت','role'=>'کاربر خطوط']];
$out=WorkReportTemplateExporter::export($input,$s,$r,['assignments'=>[3=>2,73=>1],'unmatched'=>[4]],['year'=>1405,'month'=>8]);
try{if(!copy($out,$dest))throw new RuntimeException('Copy failed');}finally{@unlink($out);}
