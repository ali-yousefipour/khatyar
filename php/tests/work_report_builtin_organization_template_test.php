<?php
require_once __DIR__.'/../lib/WorkReportTemplateRepository.php';
require_once __DIR__.'/../lib/WorkReportTemplateExporter.php';
function orgCheck($ok,string $message): void {if(!$ok)throw new RuntimeException($message);}
$file=__DIR__.'/../lib/organization-template.xlsx';
$s=WorkReportTemplateParser::parse($file,WorkReportTemplateRepository::organizationMapping());
orgCheck($s['sha256']===WorkReportTemplateRepository::ORGANIZATION_SHA256,'Approved XLSX hash');
orgCheck(count($s['slots'])===107&&count($s['merges'])===43,'Exact slot and merge counts');
orgCheck((int)$s['slots'][0]['row']===4&&(int)$s['slots'][106]['row']===110,'Exact data range');
$record=['user_id'=>1,'cells'=>['','','','','Test','Person','QA001',1.25,2.5,3.75],'comments'=>[7=>'جمعه 12',8=>'تعطیل 3',9=>'اضافه 4'],'placement'=>['location'=>'شرکت','role'=>'کاربر خطوط']];
$out=WorkReportTemplateExporter::export($file,$s,[$record],['assignments'=>[4=>1],'unmatched'=>[]],['year'=>1405,'month'=>8]);
$a=new ZipArchive();$b=new ZipArchive();
try{
    orgCheck($a->open($file)===true&&$b->open($out)===true,'Open input and output');
    foreach(['xl/styles.xml','xl/theme/theme1.xml'] as $part)orgCheck($a->getFromName($part)===$b->getFromName($part),'Exact retained '.$part);
    $before=WorkReportTemplateArchive::xml($a,'xl/worksheets/sheet1.xml');
    $after=WorkReportTemplateArchive::xml($b,'xl/worksheets/sheet1.xml');
    $ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    foreach(['dimension','cols','mergeCells','conditionalFormatting','pageMargins'] as $tag){
        $x=$before->getElementsByTagNameNS($ns,$tag);$y=$after->getElementsByTagNameNS($ns,$tag);
        orgCheck($x->length===$y->length,'Retain '.$tag);
        for($i=0;$i<$x->length;$i++)orgCheck($before->saveXML($x->item($i))===$after->saveXML($y->item($i)),'Retain '.$tag.' XML');
    }
    $xp=new DOMXPath($after);$xp->registerNamespace('s',$ns);
    orgCheck($xp->query('//s:row')->length===$before->getElementsByTagNameNS($ns,'row')->length,'No extra rows without overflow');
    orgCheck($xp->evaluate('string(//s:c[@r="A1"]//s:t)')==='صورت وضعیت اضافه‌کاری پرسنل مدیریت پیمان خطوط تاکسیرانی شهر مشهد مقدس (آبان ۱۴۰۵)','Exact title with selected month');
    orgCheck($xp->evaluate('string(//s:c[@r="G4"]//s:t)')==='QA001','Personnel placement');
    orgCheck((float)$xp->evaluate('string(//s:c[@r="H4"]/s:v)')===1.25,'Numeric hours');
    foreach(['H','I','J'] as $c)orgCheck($xp->evaluate('string(//s:c[@r="'.$c.'111"]/s:f)')==='SUM('.$c.'4:'.$c.'110)','Original subtotal formula');
    orgCheck($xp->query('//s:c[@r="G5"]/s:v|//s:c[@r="G5"]/s:is')->length===0,'Unassigned row remains blank');
    orgCheck($xp->query('//s:legacyDrawing')->length===1,'New cell notes present');
    echo "Approved organization workbook: exact source, 107 slots, 43 merges, data, notes and unchanged style/print structure verified\n";
}finally{$a->close();$b->close();@unlink($out);}
