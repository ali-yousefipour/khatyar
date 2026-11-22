<?php
declare(strict_types=1);
require_once __DIR__.'/../lib/XlsxWriter.php';
if(!class_exists('ZipArchive'))throw new RuntimeException('ZipArchive is required for XLSX test');
$png=base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/iWQAAAAASUVORK5CYII=',true);
$writer=new XlsxWriter(['عکس پرسنلی','نام','امضا']);
$writer->setProfessionalStyle();
$writer->setTextCol(1);
$writer->addRow(['','نمونه','']);
$writer->setImage(0,0,$png,90);
$writer->setImage(0,2,$png,90);
$file=$writer->output('image_regression.xlsx','کاربران',true);
try {
  $zip=new ZipArchive();
  if($zip->open($file)!==true)throw new RuntimeException('XLSX archive invalid');
  try {
    $names=[];
    for($i=0;$i<$zip->numFiles;$i++){
      $name=$zip->getNameIndex($i);
      if(preg_match('~^xl/media/image[0-9]+\.(?:png|jpeg)$~',$name))$names[]=$name;
    }
    if(count($names)!==2)throw new RuntimeException('Photo and signature missing from XLSX media');
    foreach($names as $name){
      $data=$zip->getFromName($name);
      $mime=getimagesizefromstring($data)['mime']??'';
      if($mime==='image/jpeg'&&!str_ends_with($name,'.jpeg')||
         $mime==='image/png'&&!str_ends_with($name,'.png')||
         !in_array($mime,['image/png','image/jpeg'],true))
        throw new RuntimeException('MIME and media extension mismatch: '.$name);
    }
    $rels=$zip->getFromName('xl/drawings/_rels/drawing1.xml.rels');
    if(!is_string($rels)||substr_count($rels,'/image')!==2)
      throw new RuntimeException('Missing embedded image relationships');
    echo "PASS both personnel photo and signature are valid embedded XLSX images\n";
  }finally{$zip->close();}
}finally{@unlink($file);}
