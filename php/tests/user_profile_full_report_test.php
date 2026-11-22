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
  ['key'=>'first_name','binding'=>'system','label'=>'نام']]]]];
$out=UserFullReport::orderedByProfile($original,$form);
verifyProfileReport('published form controls report column order',array_column($out,'key')===['custom:8','last_name','first_name','id']);
verifyProfileReport('published form controls Persian labels and groups',$out[0]['label']==='شماره حساب بانک شهر'&&$out[0]['group']==='اطلاعات بانکی');
verifyProfileReport('excluded sensitive column cannot leak through base fallback',!in_array('national_code',array_column($out,'key'),true));
$childCols=[
 ['key'=>'name','label'=>'نام فرزند','type'=>'text'],
 ['key'=>'birth','label'=>'تاریخ تولد','type'=>'date']
];
$children=UserFullReport::formatRepeatRows('[{"name":"سارا","birth":"1405-07-30"},{"name":"محمد","birth":"1403-01-01"}]',$childCols);
verifyProfileReport('repeatable children export as readable labeled rows',
  str_contains($children,'نام فرزند: سارا')&&str_contains($children,'تاریخ تولد: 1403-01-01')&&
  str_contains($children,'ردیف 2'));
verifyProfileReport('malformed repeatable JSON is identified',UserFullReport::formatRepeatRows('{broken',$childCols)==='داده تکرارشونده نامعتبر');
verifyProfileReport('empty repeatable rows render blank cell',UserFullReport::formatRepeatRows('[]',$childCols)==='');
echo "User full report form integration passed\n";
