<?php
require_once __DIR__.'/../lib/XlsxWriter.php';
$w=new XlsxWriter(['ردیف','اضافه‌کاری']);
$w->setProfessionalStyle(true);
$w->setFontName('Vazirmatn');
$w->setOrganizationNoteStyle();
$w->setReportHeading('کارکرد سازمان','آبان ۱۴۰۵','');
$w->setColWidth(0,8);$w->setColWidth(1,21);
$w->setDecimalCol(1);
$r=$w->addRow(['۱',18.25]);$w->setRowHeight($r,32);
$w->setComment($r,1,"خاموشی اینترنت: 01:30\nخاموشی GPS: 01:00\nصرفاً اطلاع‌رسانی");
$file=$w->output('org-test.xlsx','کارکرد',true);
try{
 $zip=new ZipArchive();
 if($zip->open($file)!==true)throw new RuntimeException('Invalid XLSX');
 foreach(['xl/styles.xml','xl/worksheets/sheet1.xml','xl/comments1.xml','xl/drawings/comments.vml'] as $part){
  $xml=$zip->getFromName($part);
  if($xml===false||simplexml_load_string($xml)===false)throw new RuntimeException('Invalid XML '.$part);
 }
 $styles=$zip->getFromName('xl/styles.xml');
 $sheet=$zip->getFromName('xl/worksheets/sheet1.xml');
 $notes=$zip->getFromName('xl/comments1.xml');
 $vml=$zip->getFromName('xl/drawings/comments.vml');
 foreach([[$styles,'numFmtId="164"'],[$styles,'[$-fa-IR,300]0.00'],[$styles,'Vazirmatn'],[$sheet,'<v>18.25</v>'],[$sheet,'ht="32"'],[$sheet,'rightToLeft="1"'],[$notes,'۰۱:۳۰'],[$notes,'۰۱:۰۰'],[$vml,'width:420pt'],[$vml,'text-align:right']] as [$xml,$needle]){
 if(!str_contains($xml,$needle))throw new RuntimeException('Missing expected value '.$needle);
 }
 $zip->close();
 echo "PASS organization workbook XML, numeric hours, Persian note digits and sizing\n";
}finally{@unlink($file);}
