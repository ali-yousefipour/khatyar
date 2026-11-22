<?php
require_once __DIR__.'/../lib/UserProfileRules.php';
function checkRule($name,$ok){if(!$ok)throw new RuntimeException('FAIL '.$name);echo "PASS $name\n";}
function rejectsRule($name,$schema){try{UserProfileRules::validate($schema);}catch(InvalidArgumentException $e){checkRule($name,true);return;}throw new RuntimeException('FAIL '.$name);}
$schema=['sections'=>[['key'=>'personal','fields'=>[
 ['key'=>'gender','type'=>'select','binding'=>'custom','options'=>['female','male']],
 ['key'=>'marital_status','type'=>'select','binding'=>'system','options'=>['married','single']],
 ['key'=>'children','type'=>'number','binding'=>'system'],
 ['key'=>'spouse','type'=>'text','rules'=>[['action'=>'show','when'=>['all'=>[
  ['field'=>'gender','op'=>'eq','value'=>'female'],
  ['field'=>'marital_status','op'=>'eq','value'=>'married'],
  ['field'=>'children','op'=>'gt','value'=>0]]]]]],
 ['key'=>'family_note','type'=>'textarea','rules'=>[['action'=>'require','when'=>['any'=>[
  ['field'=>'gender','op'=>'eq','value'=>'female'],['field'=>'children','op'=>'gte','value'=>2]]]]]]
]]]];
UserProfileRules::validate($schema);
checkRule('versioned profile schema validates AND OR',true);
$spouse=$schema['sections'][0]['fields'][3];$family=$schema['sections'][0]['fields'][4];
$values=['gender'=>'female','marital_status'=>'married','children'=>1];
checkRule('gender marital children AND triggers rule',UserProfileRules::state($spouse,$values)['visible']===true);
checkRule('false AND does not rewrite values',UserProfileRules::matches($spouse['rules'][0]['when'],['gender'=>'male','marital_status'=>'married','children'=>1])===false);
checkRule('nested OR sets conditional requirement',UserProfileRules::state($family,$values)['required']===true);
checkRule('numeric comparisons use numbers',UserProfileRules::matches(['field'=>'children','op'=>'gte','value'=>2],['children'=>2]));
checkRule('date comparisons use Jalali lexicographical order',UserProfileRules::matches(['field'=>'date','op'=>'date_between','value'=>['1405/01/01','1405/12/29']],['date'=>'1405/08/10']));
checkRule('empty and not-empty operators',UserProfileRules::matches(['field'=>'comment','op'=>'empty'],[])&&UserProfileRules::matches(['field'=>'comment','op'=>'not_empty'],['comment'=>'ok']));
checkRule('Persian digits compare exactly as Android',UserProfileRules::matches(['field'=>'children','op'=>'gte','value'=>'۲'],['children'=>'۳']));
checkRule('invalid month must not satisfy date range',!UserProfileRules::matches(['field'=>'date','op'=>'date_between','value'=>['1405/01/01','1405/12/30']],['date'=>'1405/13/01']));
checkRule('invalid day must not satisfy date range',!UserProfileRules::matches(['field'=>'date','op'=>'date_between','value'=>['1405/01/01','1405/12/30']],['date'=>'1405/07/31']));
checkRule('reversed dates never match',!UserProfileRules::matches(['field'=>'date','op'=>'date_outside','value'=>['1405/12/30','1405/01/01']],['date'=>'1405/08/10']));
$duplicateSection=$schema;
$duplicateSection['sections'][]=['key'=>'personal','fields'=>[]];
rejectsRule('duplicate group keys rejected',$duplicateSection);
checkRule('multi-select IN matches any selected choice',UserProfileRules::matches(['field'=>'tags','op'=>'in','value'=>['الف','ج']],['tags'=>['ب','ج']]));
checkRule('multi-select NOT IN rejects overlapping choices',!UserProfileRules::matches(['field'=>'tags','op'=>'not_in','value'=>['الف','ج']],['tags'=>['ب','ج']]));
checkRule('multi-select NOT IN permits non-overlapping choices',UserProfileRules::matches(['field'=>'tags','op'=>'not_in','value'=>['الف']],['tags'=>['ب','ج']]));
checkRule('stored pipe multi-select membership matches',UserProfileRules::matches(['field'=>'tags','op'=>'in','value'=>['ج']],['tags'=>'الف|ج']));
checkRule('stored pipe multi-select non-membership rejects overlapping selections',!UserProfileRules::matches(['field'=>'tags','op'=>'not_in','value'=>['ج']],['tags'=>'الف|ج']));
checkRule('stored pipe multi-select non-membership accepts disjoint selections',UserProfileRules::matches(['field'=>'tags','op'=>'not_in','value'=>['د']],['tags'=>'الف|ج']));
$ambiguous=$schema;
$ambiguous['sections'][0]['fields'][3]['rules'][0]['when']=['all'=>[['field'=>'gender','op'=>'eq','value'=>'زن']],'any'=>[['field'=>'gender','op'=>'eq','value'=>'مرد']]];
rejectsRule('ambiguous AND and OR group rejected',$ambiguous);
$cycle=$schema;$cycle['sections'][0]['fields'][0]['rules']=[['action'=>'show','when'=>['field'=>'spouse','op'=>'eq','value'=>'yes']]];
rejectsRule('circular dependencies rejected',$cycle);
$self=$schema;$self['sections'][0]['fields'][0]['rules']=[['action'=>'hide','when'=>['field'=>'gender','op'=>'eq','value'=>'female']]];
rejectsRule('self-references rejected',$self);
$bad=$schema;$bad['sections'][0]['fields'][3]['rules'][0]['when']['all'][0]['field']='deleted';
rejectsRule('missing dependency rejected',$bad);
$bad=$schema;$bad['sections'][0]['fields'][3]['rules'][0]['when']['all'][0]['op']='gt';
rejectsRule('numeric operator on select rejected',$bad);
$bad=$schema;$bad['sections'][0]['fields'][3]['rules'][0]['when']=['field'=>'gender','op'=>'eval','value'=>'system()'];
rejectsRule('arbitrary code operator rejected',$bad);
$hidden=['key'=>'hidden','type'=>'text','required'=>true,'rules'=>[['action'=>'hide','when'=>['field'=>'gender','op'=>'eq','value'=>'male']]]];
checkRule('hidden field is not required',UserProfileRules::state($hidden,['gender'=>'male'])['required']===false);
echo "User profile conditional rules tests passed\n";
