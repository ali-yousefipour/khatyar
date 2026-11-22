<?php
require_once __DIR__.'/../lib/UserProfileFormValues.php';
function t($name,$valid){if(!$valid)throw new RuntimeException('FAIL '.$name);echo "PASS $name\n";}
function invalid($name,$fn){try{$fn();}catch(InvalidArgumentException $e){t($name,true);return;}throw new RuntimeException('FAIL '.$name);}
$schema=['sections'=>[['key'=>'personal','fields'=>[
 ['key'=>'gender','type'=>'select','binding'=>'custom','custom_field_id'=>1,'options'=>['زن','مرد']],
 ['key'=>'marital_status','type'=>'select','binding'=>'system','options'=>['متاهل','مجرد']],
 ['key'=>'children_count','type'=>'number','binding'=>'system'],
 ['key'=>'spouse_name','type'=>'text','binding'=>'custom','custom_field_id'=>2,'required'=>false,
  'rules'=>[['action'=>'require','when'=>['all'=>[['field'=>'gender','op'=>'eq','value'=>'زن'],['field'=>'marital_status','op'=>'eq','value'=>'متاهل']]]]]],
 ['key'=>'national_code','type'=>'national_id','binding'=>'system'],
 ['key'=>'role_id','type'=>'number','binding'=>'system','readonly'=>true]
]]]];
$stored=['gender'=>'زن','marital_status'=>'متاهل','children_count'=>1,'spouse_name'=>'همسر'];
$out=UserProfileFormValues::plan($schema,['spouse_name'=>'نام جدید'],$stored);
t('conditional editable custom field',isset($out['custom'][2])&&$out['custom'][2]==='نام جدید');
invalid('conditional spouse is required',fn()=>UserProfileFormValues::plan($schema,['spouse_name'=>''],$stored));
invalid('readonly role blocked',fn()=>UserProfileFormValues::plan($schema,['role_id'=>3],$stored));
invalid('unknown fields blocked',fn()=>UserProfileFormValues::plan($schema,['inject'=>'yes'],$stored));
invalid('injected array blocked',fn()=>UserProfileFormValues::plan($schema,['spouse_name'=>['invalid']],$stored));
invalid('invalid national ID blocked',fn()=>UserProfileFormValues::plan($schema,['national_code'=>'0000000000'],$stored));
t('hidden existing values preserved',UserProfileFormValues::plan($schema,[],array_replace($stored,['gender'=>'مرد']))['custom']===[]);
$schema['sections'][0]['fields'][3]['rules'][]=['action'=>'hide','when'=>['field'=>'gender','op'=>'eq','value'=>'مرد']];
invalid('hidden field updates blocked',fn()=>UserProfileFormValues::plan($schema,['spouse_name'=>'test'],array_replace($stored,['gender'=>'مرد'])));
echo "User profile value tests passed\n";
