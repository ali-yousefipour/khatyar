<?php
require_once __DIR__.'/../lib/WorkReportTemplateArchive.php';
function archiveCheck($condition){if(!$condition)throw new RuntimeException('Archive assertion failed');}
function fixture(array $extra=[]): string {
    $file=tempnam(sys_get_temp_dir(),'work-template-');
    $zip=new ZipArchive();$zip->open($file,ZipArchive::OVERWRITE);
    $entries=[
      '[Content_Types].xml'=>'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>',
      '_rels/.rels'=>'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>',
      'xl/workbook.xml'=>'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets><sheet name="Sheet1" sheetId="1"/></sheets></workbook>',
      'xl/_rels/workbook.xml.rels'=>'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>'
    ];
    foreach(array_replace($entries,$extra) as $name=>$contents)$zip->addFromString($name,$contents);
    $zip->close();return $file;
}
$file=fixture();try{archiveCheck(WorkReportTemplateArchive::inspect($file)['sheet_names']===['Sheet1']);}finally{unlink($file);}
foreach([['xl/vbaProject.bin'=>'bad'],['../outside.xml'=>'<x/>'],['xl/workbook.xml'=>'<!DOCTYPE x [<!ENTITY a SYSTEM "file:///etc/passwd">]><x/>'],['xl/_rels/workbook.xml.rels'=>'<Relationships><Relationship TargetMode="External" Target="https://example.com"/></Relationships>']] as $extra){
    $file=fixture($extra);try{try{WorkReportTemplateArchive::inspect($file);throw new RuntimeException('Unsafe archive accepted');}catch(InvalidArgumentException $e){}}finally{unlink($file);}
}
echo "OK\n";
