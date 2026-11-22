<?php
require_once __DIR__.'/../lib/IdentityBankingValidation.php';
function assertValidation($ok,$message){if(!$ok)throw new RuntimeException('FAIL: '.$message);echo "PASS ".$message."\n";}
$code=IdentityBankingValidation::nationalId('۰۰۱۲۳۴۵۶۷۹');
assertValidation($code['valid']===true,'national ID Persian digits and leading zero');
assertValidation(!IdentityBankingValidation::nationalId('0012345678')['valid'],'national ID bad checksum');
assertValidation(!IdentityBankingValidation::nationalId('1111111111')['valid'],'national ID repeated digits');
assertValidation(!IdentityBankingValidation::nationalId('001234567')['valid'],'national ID short');
assertValidation(!IdentityBankingValidation::nationalId('00123456790')['valid'],'national ID long');
assertValidation(!IdentityBankingValidation::nationalId('00123456A9')['valid'],'national ID letters');
assertValidation(IdentityBankingValidation::iban('IR830610000000000000000000','061')['valid'],'Shahr IBAN checksum');
assertValidation(IdentityBankingValidation::iban('IR۸۳۰۶۱۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰')['valid'],'Shahr IBAN Persian digits');
assertValidation(IdentityBankingValidation::iban('830610000000000000000000',null,true)['valid'],'IBAN optional IR prefix');
assertValidation(IdentityBankingValidation::iban('IR830610000000000000000000','054')['status']==='mismatch','IBAN bank mismatch');
assertValidation(!IdentityBankingValidation::iban('IR000610000000000000000000')['valid'],'IBAN invalid checksum');
assertValidation(!IdentityBankingValidation::iban('IR83061000000')['valid'],'IBAN wrong length');
assertValidation(IdentityBankingValidation::iban('IR410540000000000000000002')['bankName']==='بانک پارسیان','IBAN bank discovery');
assertValidation(IdentityBankingValidation::account('۰۰۰۰-۱۲۳۴')['status']==='offline_unverifiable','account zero prefix not falsely verified');
assertValidation(!IdentityBankingValidation::account('123A4')['valid'],'account forbidden character');
assertValidation(!IdentityBankingValidation::account('')['valid'],'account empty');
$duplicates=IdentityBankingValidation::duplicateNationalIds([
 ['id'=>1,'national_code'=>'0012345679','is_active'=>1],
 ['id'=>2,'national_code'=>'۰۰۱۲۳۴۵۶۷۹','is_active'=>0],
 ['id'=>3,'national_code'=>'1234567891','is_active'=>1],
]);
assertValidation(isset($duplicates[1],$duplicates[2])&&!isset($duplicates[3]),'duplicates include inactive users');
echo "Offline identity and banking validation tests passed\n";
