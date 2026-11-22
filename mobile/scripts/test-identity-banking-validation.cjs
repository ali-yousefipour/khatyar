// Run the Expo-compatible ES module in an isolated Node VM without dependencies.
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const file=path.join(__dirname,'../src/identityBankingValidation.js');
const source=fs.readFileSync(file,'utf8')
  .replace(/export const /g,'const ')
  .replace(/export function /g,'function ')
  + '\nthis.api={normalizeIranianDigits,validateNationalId,validateIban,validateAccount,validateUserInput,bankCodeFromName};';
const context={};vm.runInNewContext(source,context,{filename:file,timeout:1500});
const {normalizeIranianDigits,validateNationalId,validateIban,validateAccount,validateUserInput,bankCodeFromName}=context.api;
function check(condition,message){if(!condition)throw new Error('FAIL '+message);console.log('PASS '+message);}
check(normalizeIranianDigits('۰١۲')==='012','normalize Persian and Arabic digits');
check(validateNationalId('۰۰۱۲۳۴۵۶۷۹').valid,'valid Persian national ID');
check(!validateNationalId('0012345678').valid,'invalid national checksum');
check(!validateNationalId('1111111111').valid,'repeated national digits');
check(!validateNationalId('001234567').valid,'short national ID');
check(!validateNationalId('00123456790').valid,'long national ID');
check(!validateNationalId('00123456A9').valid,'national ID letter');
check(validateIban('IR830610000000000000000000',{expectedBank:'061'}).valid,'valid Shahr IBAN');
check(validateIban('IR۸۳۰۶۱۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰',{expectedBank:'061'}).valid,'Persian Shahr IBAN');
check(validateIban('830610000000000000000000',{allowWithoutPrefix:true}).valid,'optional IR prefix');
check(validateIban('IR830610000000000000000000',{expectedBank:'054'}).status==='mismatch','wrong bank');
check(validateIban('IR410540000000000000000002').bankName==='بانک پارسیان','bank discovery');
check(!validateIban('IR000610000000000000000000').valid,'bad IBAN checksum');
check(bankCodeFromName('بانک شهر')==='061','Shahr bank label is recognized');
check(bankCodeFromName('پارسیان')==='054','Parsian bank label is recognized');
check(bankCodeFromName('بانک ناشناخته')===null,'unknown bank label not guessed');
check(!validateIban('IR83061').valid,'short IBAN');
check(validateAccount('۰۰۰۰-۱۲۳۴').status==='offline_unverifiable','internal account never verified');
check(!validateAccount('123A4').valid,'invalid account characters');
check(!validateUserInput({national_code:'۰۰۱۲۳۴۵۶۷۹'},{knownUsers:[{id:1,national_code:'0012345679',is_active:0}],editingId:2}).valid,'inactive national duplicate blocks local form');
check(validateUserInput({national_code:'0012345679'},{knownUsers:[{id:1,national_code:'0012345679'}],editingId:1}).valid,'self edit ignores duplicate');
check(!validateUserInput({iban:'IR830610000000000000000000',bank_code:'054'}).valid,'bank-IBAN mismatch blocks local form');
check(validateUserInput({account:'۰۰۰۰-۱۲۳۴'}).status==='offline_unverifiable','internal account remains unverified');
console.log('Mobile offline validations passed');
