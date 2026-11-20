<?php
// Compare actual archive members against the pre-stream writer, including a multi-buffer export.
require_once __DIR__.'/../lib/XlsxWriter.php';
$baseline = getenv('XLSX_BASELINE');
if (!$baseline || !is_file($baseline)) throw new RuntimeException('Baseline writer required');
$source = file_get_contents($baseline);
$source = str_replace('class XlsxWriter {', 'class BaselineXlsxWriter {', $source);
eval(substr($source, 5));
function makeReport($class, $count) {
    $w = new $class(['شناسه', 'نام', 'مبلغ', 'توضیحات']);
    $w->setProfessionalStyle();
    $w->setReportHeading('گزارش سازمان','دوره آزمایشی','جمع');
    $w->setHeaderGroup(0,1,'مشخصات');
    $w->setTextCol(0);
    $w->setDecimalCol(2);
    $w->setColWidth(1,25);
    for ($i=0; $i<$count; $i++) {
        $r=$w->addRow(['00123','علی & رضا', $i+0.25, str_repeat('متن <آزمایشی> ',20)]);
        if ($i===0) { $w->setComment($r,2,'یادداشت'); $w->setRowHeight($r,42); }
    }
    return $w->output('test.xlsx','کارکرد',true);
}
foreach ([0, 5, 3000] as $count) {
    $files=[];
    try {
        $files[]=makeReport('BaselineXlsxWriter',$count);
        $files[]=makeReport('XlsxWriter',$count);
        $a=new ZipArchive();$b=new ZipArchive();
        if ($a->open($files[0])!==true || $b->open($files[1])!==true) throw new RuntimeException('Invalid ZIP');
        try {
            if ($a->numFiles!==$b->numFiles) throw new RuntimeException('ZIP entry count changed');
            for ($i=0;$i<$a->numFiles;$i++) {
                $name=$a->getNameIndex($i);
                if ($b->locateName($name)===false || $a->getFromName($name)!==$b->getFromName($name)) throw new RuntimeException('Changed archive entry: '.$name);
            }
            echo "PASS exact archive equivalence for $count rows\n";
        } finally { $a->close();$b->close(); }
    } finally { foreach($files as $file) @unlink($file); }
}
