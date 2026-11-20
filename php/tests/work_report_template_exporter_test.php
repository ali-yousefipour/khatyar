<?php
require_once __DIR__.'/../lib/WorkReportTemplateExporter.php';
require_once __DIR__.'/../lib/WorkReportTemplateParser.php';
require_once __DIR__.'/../lib/XlsxWriter.php';
function verifyExport($ok,$message){if(!$ok)throw new RuntimeException($message);}
$input=tempnam(sys_get_temp_dir(),'kh-fixture-');$out=null;$baseline=null;
try{
    $zip=new ZipArchive();verifyExport($zip->open($input,ZipArchive::OVERWRITE)===true,'fixture');
    $s='http://schemas.openxmlformats.org/spreadsheetml/2006/main';$r='http://schemas.openxmlformats.org/officeDocument/2006/relationships';$p='http://schemas.openxmlformats.org/package/2006/relationships';
    $zip->addFromString('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
    $zip->addFromString('_rels/.rels','<Relationships xmlns="'.$p.'"><Relationship Id="rId1" Type="'.$r.'/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    $zip->addFromString('xl/workbook.xml','<workbook xmlns="'.$s.'" xmlns:r="'.$r.'"><sheets><sheet name="نمونه" sheetId="1" r:id="rId1"/></sheets></workbook>');
    $zip->addFromString('xl/_rels/workbook.xml.rels','<Relationships xmlns="'.$p.'"><Relationship Id="rId1" Type="'.$r.'/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
    $rows='';for($i=2;$i<=4;$i++){$rows.='<row r="'.$i.'" ht="30" customHeight="1"><c r="A'.$i.'"><v>'.($i-1).'</v></c>'.($i===2?'<c r="B2" t="inlineStr"><is><t>راه آهن</t></is></c><c r="C2" t="inlineStr"><is><t>بازرس</t></is></c>':'').'<c r="D'.$i.'" t="inlineStr"><is><t>نمونه</t></is></c><c r="G'.$i.'"><v>99</v></c></row>';}
    $zip->addFromString('xl/worksheets/sheet1.xml','<worksheet xmlns="'.$s.'"><dimension ref="A1:I5"/><sheetData><row r="1"/>' .$rows.'<row r="5"><c r="G5"><f>SUM(G2:G4)</f></c></row></sheetData><mergeCells count="2"><mergeCell ref="B2:B4"/><mergeCell ref="C2:C4"/></mergeCells><pageMargins left="0.5" right="0.5" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="portrait"/></worksheet>');
    $zip->close();
    $mapping=['sheet'=>'نمونه','first_row'=>2,'last_row'=>4,'columns'=>['ordinal'=>'A','location'=>'B','role'=>'C','first_name'=>'D','last_name'=>'E','personnel_code'=>'F','friday'=>'G','holiday'=>'H','overtime'=>'I']];
    $structure=WorkReportTemplateParser::parse($input,$mapping);verifyExport(count($structure['slots'])===3,'slot count');
    $records=[];for($i=1;$i<=4;$i++)$records[]=['user_id'=>$i,'cells'=>['۱','','','۱','=نام'.$i,'آزمایش','۰۰'.$i,$i+0.125,0.5,-0.25],'comments'=>[7=>"جمعه 12\nآزمون & <".$i,8=>'تعطیل 2',9=>'اضافه 3'],'placement'=>['id'=>$i,'location'=>'راه آهن','role'=>'بازرس']];
    $placement=['assignments'=>[2=>2,3=>1,4=>null],'unmatched'=>[4],'overflow'=>[3]];
    $out=WorkReportTemplateExporter::export($input,$structure,$records,$placement,['year'=>1405,'month'=>8]);
    verifyExport(hash_file('sha256',$input)===$structure['sha256'],'original mutated');
    $z=new ZipArchive();verifyExport($z->open($out)===true,'output archive');
    $doc=WorkReportTemplateArchive::xml($z,$structure['sheet_path']);$xp=new DOMXPath($doc);$xp->registerNamespace('s',$s);
    verifyExport($xp->evaluate('string(//s:c[@r="D2"]/s:is/s:t)')==='=نام2','swap or formula injection');
    verifyExport($xp->evaluate('string(//s:c[@r="F2"]/s:is/s:t)')==='۰۰2','personnel code');
    verifyExport((float)$xp->evaluate('string(//s:c[@r="G2"]/s:v)')===2.125,'numeric hours');
    verifyExport($xp->evaluate('count(//s:c[@r="D4"]/*)')===0.0,'blank sample name');
    verifyExport($xp->evaluate('string(//s:c[@r="G5"]/s:f)')==='SUM(G2:G4)','formula preservation');
    verifyExport($xp->evaluate('count(//s:mergeCell)')===2.0,'merge preservation');
    verifyExport($xp->evaluate('string(//s:pageSetup/@orientation)')==='portrait','print preservation');
    $notes=[];for($i=0;$i<$z->numFiles;$i++){ $name=$z->getNameIndex($i);if(preg_match('~^xl/comments-work-.*\.xml$~',$name)){foreach(WorkReportTemplateArchive::xml($z,$name)->getElementsByTagNameNS($s,'comment') as $n)$notes[$n->getAttribute('ref')]=$n->textContent;}}
    verifyExport(count($notes)===12,'all notes included');
    $w=new XlsxWriter(['A','B','C','D','E','F','G','H','I','J']);$w->setOrganizationNoteStyle();$row=$w->addRow($records[1]['cells']);$w->setComment($row,7,$records[1]['comments'][7]);$baseline=$w->output('fixture.xlsx','fixture',true);
    $bz=new ZipArchive();verifyExport($bz->open($baseline)===true,'baseline archive');$bn=WorkReportTemplateArchive::xml($bz,'xl/comments1.xml')->getElementsByTagNameNS($s,'comment')->item(0)->textContent;$bz->close();
    verifyExport($notes['G2']===$bn,'serialized comment parity');
    $titles=[];
    foreach($xp->query('//s:row/s:c[@t="inlineStr"]/s:is/s:t') as $node){
        $cell=$node->parentNode->parentNode;
        if(preg_match('/^A[0-9]+$/D',$cell->getAttribute('r'))&&$cell->parentNode->getElementsByTagNameNS($s,'c')->length===1)$titles[$node->textContent][]=$cell->getAttribute('r');
    }
    foreach(['فهرست نیروهای مازاد بر ظرفیت قالب'=>3,'فهرست نیروهای بدون تطبیق سازمانی'=>4] as $title=>$id){
        $refs=$titles[$title]??[];
        verifyExport(count($refs)===1,'missing or repeated table title: '.$title.' actual cells: '.json_encode($titles,JSON_UNESCAPED_UNICODE));
        verifyExport(preg_match('/^A(\d+)$/D',$refs[0],$m)===1,'table title column');
        $row=(int)$m[1]+2;
        foreach(['A'=>'نام','B'=>'نام خانوادگی','C'=>'شماره پرسنلی','D'=>'منطقه','E'=>'محل خدمت','F'=>'سمت','G'=>'جمعه‌کاری','H'=>'تعطیل‌کاری','I'=>'اضافه‌کاری','J'=>'علت'] as $col=>$header){
            verifyExport($xp->evaluate('string(//s:c[@r="'.$col.($row-1).'"]/s:is/s:t)')===$header,'supplement header '.$col);
        }
        $reason=$xp->evaluate('string(//s:c[@r="J'.$row.'"]/s:is/s:t)');
        verifyExport($reason===($id===3?'عدم تخصیص جایگاه منطبق در چینش نهایی':'عدم وجود جایگاه منطبق با مشخصات سازمانی'),'supplement reason');

        verifyExport($xp->evaluate('string(//s:c[@r="A'.$row.'"]/s:is/s:t)')===$records[$id-1]['cells'][4],'supplement personnel');
        verifyExport($xp->evaluate('string(//s:c[@r="C'.$row.'"]/s:is/s:t)')===$records[$id-1]['cells'][6],'supplement code');
        foreach(['G'=>7,'H'=>8,'I'=>9] as $col=>$index){
            verifyExport((float)$xp->evaluate('string(//s:c[@r="'.$col.$row.'"]/s:v)')===(float)$records[$id-1]['cells'][$index],'supplement hours');
            verifyExport(($notes[$col.$row]??null)===strtr($records[$id-1]['comments'][$index],['0'=>'۰','1'=>'۱','2'=>'۲','3'=>'۳','4'=>'۴','5'=>'۵','6'=>'۶','7'=>'۷','8'=>'۸','9'=>'۹']),'supplement note');
        }
    }
    foreach($records as $record){
        $occurrences=0;foreach($xp->query('//s:c[@t="inlineStr"]/s:is/s:t') as $n)if($n->textContent===$record['cells'][6])$occurrences++;
        verifyExport($occurrences===1,'personnel occurs exactly once');
    }
    foreach(['G'=>7,'H'=>8,'I'=>9] as $col=>$index){
        $sum=0;foreach([2,3,8,11] as $row)$sum+=(int)round((float)$xp->evaluate('string(//s:c[@r="'.$col.$row.'"]/s:v)')*1000000);
        $expected=0;foreach($records as $record)$expected+=(int)round($record['cells'][$index]*1000000);
        verifyExport($sum===$expected,'serialized total hours');
    }
    $artifact=getenv('WORK_REPORT_EXPORT_ARTIFACT_DIR');
    if($artifact){if(!is_dir($artifact)&&!mkdir($artifact,0700,true))throw new RuntimeException('Artifact directory');verifyExport(copy($out,$artifact.'/sample.xlsx'),'artifact copy');}

    $z->close();
    try{WorkReportTemplateExporter::export($input,$structure,$records,['assignments'=>[2=>1,3=>1]],[]);throw new LogicException('duplicate accepted');}catch(InvalidArgumentException $e){}
    echo "OK\n";
}finally{foreach([$input,$out,$baseline] as $path)if(is_string($path))@unlink($path);}
