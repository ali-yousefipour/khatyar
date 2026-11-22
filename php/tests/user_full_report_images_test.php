<?php
declare(strict_types=1);
require_once __DIR__.'/../lib/UserFullReport.php';
function assertReportImage(bool $condition,string $message): void {
  if(!$condition)throw new RuntimeException('FAIL '.$message);
  echo 'PASS '.$message."\n";
}
$png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/iWQAAAAASUVORK5CYII=';
$method=new ReflectionMethod(UserFullReport::class,'imageBytes');
$binary=base64_decode($png,true);
$signature=$method->invoke(null,['signature_data'=>'data:image/png;base64,'.$png],'personnel_signature');
assertReportImage($signature===$binary,'decode embedded signature without exposing storage reference');
$photo=$method->invoke(null,['personnel_photo_b64'=>'data:image/png;base64,'.$png],'personnel_photo');
assertReportImage($photo===$binary,'decode legacy personnel photo');
assertReportImage($method->invoke(null,['signature_data'=>'not an image'],'personnel_signature')===null,'reject malformed image');
assertReportImage($method->invoke(null,[],'personnel_photo')===null,'handle missing personnel photo');
$headings=[
 ['key'=>'first_name','label'=>'نام','group'=>'هویتی'],
 ['key'=>'personnel_photo','label'=>'عکس پرسنلی','group'=>'مدارک تصویری','type'=>'embedded_image'],
 ['key'=>'personnel_signature','label'=>'امضا','group'=>'مدارک تصویری','type'=>'embedded_image']
];
$schema=['sections'=>[['title'=>'هویتی','fields'=>[['key'=>'first_name','binding'=>'system','label'=>'نام']]]]];
$ordered=UserFullReport::orderedByProfile($headings,$schema);
assertReportImage(count($ordered)===3&&$ordered[1]['type']==='embedded_image','keep photo and signature as selectable image columns');
echo "PASS full users report image regression\n";
