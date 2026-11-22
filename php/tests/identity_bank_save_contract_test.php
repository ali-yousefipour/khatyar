<?php
/** Isolated integration contract for the real custom-field save method; no production DB. */
date_default_timezone_set('Asia/Tehran');
require_once __DIR__.'/../lib/IdentityBankingValidation.php';
class FakeFormFailure extends RuntimeException {}
class Http {
  static function error($message,$status){throw new FakeFormFailure((string)$message,(int)$status);}
}
class Db {
  static array $fields=[], $values=[], $writes=[];
  static function all($sql,$args=[]){
    if(str_contains($sql,'FROM custom_fields'))return self::$fields;
    if(str_contains($sql,'FROM custom_field_values'))return self::$values;
    throw new RuntimeException('unexpected read');
  }
  static function run($sql,$args=[]){self::$writes[]=$args;}
}
$source=file_get_contents(__DIR__.'/../lib/routes.php');
$start=strpos($source,'function _save_custom_values($uid, $values, $onlyEditable){');
$end=strpos($source,"\nroute('GET', '/api/my/custom-fields'",$start);
if($start===false||$end===false)throw new RuntimeException('source contract changed');
eval(substr($source,$start,$end-$start));
function checkBank($ok,$name){if(!$ok)throw new RuntimeException('FAIL '.$name);echo "PASS $name\n";}
Db::$fields=[
 ['id'=>1,'fkey'=>'bank_name','label'=>'نام بانک','user_editable'=>1],
 ['id'=>2,'fkey'=>'iban','label'=>'شماره شبا','user_editable'=>1],
 ['id'=>3,'fkey'=>'bank_account','label'=>'شماره حساب','user_editable'=>1],
];
Db::$values=[];
try{
  _save_custom_values(9,[1=>'بانک پارسیان',2=>'IR830610000000000000000000',3=>'00123'],false);
  throw new RuntimeException('expected mismatch');
}catch(FakeFormFailure $e){checkBank($e->getCode()===422&&Db::$writes===[],'bank/IBAN mismatch rejects entire batch before any writes');}
_save_custom_values(9,[1=>'بانک شهر',2=>'IR۸۳۰۶۱۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰',3=>'۰۰۰۰-۱۲۳۴'],false);
checkBank(count(Db::$writes)===3,'matching Shahr fields save together');
checkBank(Db::$writes[1][2]==='IR830610000000000000000000','saved IBAN is normalized and zero-safe');
Db::$writes=[];
Db::$values=[['field_id'=>2,'value'=>'IR830610000000000000000000']];
try{
  _save_custom_values(9,[1=>'بانک پارسیان'],false);
  throw new RuntimeException('expected mismatch on bank-only edit');
}catch(FakeFormFailure $e){checkBank($e->getCode()===422&&Db::$writes===[],'bank-only edits recheck existing stored IBAN');}
Db::$values=[];
try{
  _save_custom_values(9,[3=>'12AB'],false);
  throw new RuntimeException('expected account rejection');
}catch(FakeFormFailure $e){checkBank($e->getCode()===422&&Db::$writes===[],'invalid account rejected without partial write');}
echo "Identity banking save contract tests passed\n";
