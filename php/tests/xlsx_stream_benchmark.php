<?php
declare(strict_types=1);
// Isolated process benchmark with synthetic data only; never touches production DB.
$writer=$argv[1]??'';
$count=(int)($argv[2]??30000);
if(!is_file($writer)||$count<1||$count>100000)throw new RuntimeException('Invalid benchmark parameters');
require_once $writer;
$w=new XlsxWriter(['شناسه','نام','تاریخ','کارکرد','توضیحات']);
$w->setProfessionalStyle();
$w->setTextCol(0);
for($i=0;$i<$count;$i++){
    $w->addRow([sprintf('%08d',$i),'کاربر آزمایشی','1405/08/20',$i%480,str_repeat('گزارش آزمایشی ',20)]);
}
$before=memory_get_usage(true);
if(function_exists('memory_reset_peak_usage'))memory_reset_peak_usage();
$start=hrtime(true);
$file=$w->output('benchmark.xlsx','کارکرد',true);
try{
    $elapsed=(hrtime(true)-$start)/1e6;
    $peak=memory_get_peak_usage(true);
    $zip=new ZipArchive();
    if($zip->open($file)!==true)throw new RuntimeException('Invalid archive');
    $stream=$zip->getStream('xl/worksheets/sheet1.xml');
    if(!$stream)throw new RuntimeException('Missing worksheet');
    $ctx=hash_init('sha256');hash_update_stream($ctx,$stream);fclose($stream);$zip->close();
    echo json_encode(['rows'=>$count,'elapsed_ms'=>round($elapsed,2),'memory_before_bytes'=>$before,'peak_bytes'=>$peak,'extra_peak_bytes'=>max(0,$peak-$before),'worksheet_sha256'=>hash_final($ctx),'archive_bytes'=>filesize($file)],JSON_THROW_ON_ERROR).PHP_EOL;
}finally{@unlink($file);}
