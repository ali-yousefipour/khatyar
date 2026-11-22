<?php
require_once __DIR__.'/../lib/UserFullReport.php';
function verifyProfileReport($message,$condition){if(!$condition)throw new RuntimeException('FAIL '.$message);echo "PASS ".$message."\n";}
$original=[
 ['key'=>'first_name','label'=>'نام','group'=>'هویتی'],
 ['key'=>'last_name','label'=>'نام خانوادگی','group'=>'هویتی'],
 ['key'=>'national_code','label'=>'کد ملی','group'=>'هویتی'],
 ['key'=>'custom:8','label'=>'شماره حساب','group'=>'سفارشی'],
 ['key'=>'id','label'=>'شناسه','group'=>'هویتی']
];
$form=['sections'=>[
 ['key'=>'bank','title'=>'اطلاعات بانکی','fields'=>[
  ['key'=>'cf_8','binding'=>'custom','custom_field_id'=>8,'label'=>'شماره حساب بانک شهر']]],
 ['key'=>'personal','title'=>'هویت','fields'=>[
  ['key'=>'last_name','binding'=>'system','label'=>'نام خانوادگی کارکنان'],
  ['key'=>'national_code','binding'=>'system','label'=>'کد ملی','report_visible'=>false],
  ['key'=>'first_name','binding'=>'system','label'=>'نام']]]];
$out=UserFullReport::orderedByProfile($original,$form);
verifyProfileReport('published form controls report column order',array_column($out,'key')===['custom:8','last_name','first_name','id']);
verifyProfileReport('published form controls Persian labels and groups',$out[0]['label']==='شماره حساب بانک شهر'&&$out[0]['group']==='اطلاعات بانکی');
verifyProfileReport('excluded sensitive column cannot leak through base fallback',!in_array('national_code',array_column($out,'key'),true));
echo "User full report form integration passed\n";
