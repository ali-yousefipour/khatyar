<?php
require_once __DIR__.'/../lib/UserFullReportPresets.php';
$registry=[
 ['key'=>'id','label'=>'شناسه'],
 ['key'=>'first_name','label'=>'نام'],
 ['key'=>'custom:9','label'=>'شماره حساب']
];
function checkPreset(string $title,bool $condition): void {
  if(!$condition)throw new RuntimeException('FAIL '.$title);
  echo 'PASS '.$title."\n";
}
$raw=[
 'columns'=>['custom:9','first_name','id'],
 'sort'=>'id','direction'=>'asc',
 'sorts'=>[['key'=>'first_name','direction'=>'asc'],['key'=>'id','direction'=>'desc']],
 'active'=>'1','zone_id'=>7,'role_id'=>''
];
$result=UserFullReportPresets::validated($raw,$registry);
checkPreset('retains deliberate column order',$result['columns']===$raw['columns']);
checkPreset('retains multi-column sort',$result['sorts']===$raw['sorts']);
checkPreset('normalizes allowed organizational filters',$result['zone_id']===7&&$result['active']==='1');
foreach([
 ['columns'=>['password_hash'],'sort'=>'id'],
 ['columns'=>['id'],'sort'=>'password_hash'],
 ['columns'=>['id'],'sort'=>'id','active'=>'invalid'],
 ['columns'=>['id'],'sort'=>'id','zone_id'=>'7 OR 1=1'],
 ['columns'=>['id'],'sort'=>'id','sorts'=>[['key'=>'foo','direction'=>'asc']]],
 ['columns'=>[],'sort'=>'id']
] as $invalid){
  $thrown=false;
  try{UserFullReportPresets::validated($invalid,$registry);}
  catch(InvalidArgumentException $e){$thrown=true;}
  checkPreset('rejects invalid report metadata', $thrown);
}
echo "Full report presets regression passed\n";
