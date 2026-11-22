<?php
final class Db {
  static array $fields=[
    ['id'=>7,'label'=>'شماره حساب بانک شهر','fkey'=>'bank_account','ftype'=>'text','options'=>'','required'=>1,'user_editable'=>0],
    ['id'=>9,'label'=>'جنسیت','fkey'=>'gender','ftype'=>'select','options'=>'زن|مرد','required'=>0,'user_editable'=>1]
  ];
  static function all($sql,$p=[]){if(str_contains($sql,'custom_fields'))return self::$fields;throw new RuntimeException('Unexpected DB all');}
  static function one($sql,$p=[]){if(str_contains($sql,'information_schema.tables'))return ['n'=>0];throw new RuntimeException('Unexpected DB one');}
}
require_once __DIR__.'/../lib/UserProfileForms.php';
function testProfileForm($text,$yes){if(!$yes)throw new RuntimeException('FAIL '.$text);echo "PASS ".$text."\n";}
$default=UserProfileForms::published();
testProfileForm('legacy fallback works before additive migration',$default['version']===0&&$default['source']==='legacy_fallback');
$schema=$default['schema'];UserProfileForms::validate($schema);
testProfileForm('legacy system columns are kept in system storage',in_array('employment_start_date',array_column($schema['sections'][2]['fields'],'key'),true));
testProfileForm('custom field IDs stay mapped to existing records',$schema['sections'][3]['fields'][0]['key']==='cf_7'&&$schema['sections'][3]['fields'][0]['custom_field_id']===7);
testProfileForm('private bank account remains readonly',$schema['sections'][3]['fields'][0]['readonly']===true);
$changed=$schema;$changed['sections'][3]['fields'][0]['binding']='system';
try{UserProfileForms::validate($changed);throw new RuntimeException('FAIL arbitrary system binding');}
catch(InvalidArgumentException $e){testProfileForm('unknown system binding rejected',true);}
$changed=$schema;$changed['sections'][3]['fields'][0]['custom_field_id']=999;
try{UserProfileForms::validate($changed);throw new RuntimeException('FAIL arbitrary custom binding');}
catch(InvalidArgumentException $e){testProfileForm('mismatched custom field binding rejected',true);}
echo "Profile form storage contract tests passed\n";
