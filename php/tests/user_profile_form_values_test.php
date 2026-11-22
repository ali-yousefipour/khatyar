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
$roleSchema=$schema;
$roleSchema['sections'][0]['fields'][3]['edit_roles']=[5];
invalid('role permission denies unauthorized editor',fn()=>UserProfileFormValues::plan($roleSchema,['spouse_name'=>'یک'], $stored,true,['id'=>7,'role_id'=>9]));
t('role grant allows permitted editor',isset(UserProfileFormValues::plan($roleSchema,['spouse_name'=>'مجاز'],$stored,true,['id'=>7,'role_id'=>5])['custom'][2]));
$roleSchema['sections'][0]['fields'][3]['deny_users']=[7];
invalid('user-specific deny overrides role grant',fn()=>UserProfileFormValues::plan($roleSchema,['spouse_name'=>'رد'],$stored,true,['id'=>7,'role_id'=>5]));
$multiSchema=['sections'=>[['key'=>'options','fields'=>[
 ['key'=>'cf_3','type'=>'multiselect','binding'=>'custom','custom_field_id'=>3,'options'=>['الف','ب','ج']]
]]]];
$multi=UserProfileFormValues::plan($multiSchema,['cf_3'=>'الف|ج'],[],true);
t('Android pipe-delimited multiselect validates against published choices',$multi['custom'][3]==='الف|ج');
$multiList=UserProfileFormValues::plan($multiSchema,['cf_3'=>['الف','ج']],[],true);
t('JSON array multiselect stays compatible',$multiList['custom'][3]==='الف|ج');
invalid('unknown multiselect option rejected',fn()=>UserProfileFormValues::plan($multiSchema,['cf_3'=>'الف|نامعتبر'],[],true));
invalid('duplicate multiselect option rejected',fn()=>UserProfileFormValues::plan($multiSchema,['cf_3'=>'الف|الف'],[],true));
$dateSchema=['sections'=>[['key'=>'identity','fields'=>[['key'=>'birth_date','type'=>'date','binding'=>'system']]]]];
$dateResult=UserProfileFormValues::plan($dateSchema,['birth_date'=>'۱۴۰۵/۰۷/۳۰'],[],true);
t('Persian Jalali date is normalized',$dateResult['system']['birth_date']==='1405-07-30');
invalid('Jalali month 13 rejected',fn()=>UserProfileFormValues::plan($dateSchema,['birth_date'=>'1405/13/01'],[],true));
invalid('Jalali month seven day 31 rejected',fn()=>UserProfileFormValues::plan($dateSchema,['birth_date'=>'1405/07/31'],[],true));
$permissionSchema=['sections'=>[['key'=>'personal','fields'=>[
 ['key'=>'cf_41','type'=>'text','binding'=>'custom','custom_field_id'=>41,'required'=>true,'edit_roles'=>[5]],
 ['key'=>'cf_42','type'=>'text','binding'=>'custom','custom_field_id'=>42]
]]]];
$ignored=UserProfileFormValues::plan($permissionSchema,['cf_42'=>'ok'],[],true,['id'=>10,'role_id'=>9]);
t('role-restricted required field does not block unrelated authorized edits',($ignored['custom'][42]??null)==='ok');
invalid('role-authorized user must complete role-restricted required field',fn()=>UserProfileFormValues::plan($permissionSchema,['cf_42'=>'ok'],[],true,['id'=>10,'role_id'=>5]));
$numeric=['sections'=>[['key'=>'values','fields'=>[['key'=>'children_count','type'=>'number','binding'=>'system'],['key'=>'mobile','type'=>'mobile','binding'=>'system']]]]];
$persian=UserProfileFormValues::plan($numeric,['children_count'=>'۱۲','mobile'=>'۰۹۱۲۳۴۵۶۷۸۹'],[],true);
t('Persian decimal digits normalize without corrupting UTF-8',$persian['system']['children_count']==='12');
t('Persian mobile digits normalize safely',$persian['system']['mobile']==='09123456789');
$hiddenPlatform=$schema;$hiddenPlatform['sections'][0]['fields'][3]['android_visible']=false;
invalid('Android-hidden field cannot be submitted',fn()=>UserProfileFormValues::plan($hiddenPlatform,['spouse_name'=>'hidden'],$stored));
echo "User profile value tests passed\n";
