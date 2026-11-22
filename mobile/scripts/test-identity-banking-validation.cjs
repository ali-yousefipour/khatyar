// Run the Expo-compatible ES module in an isolated Node VM without dependencies.
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const file=path.join(__dirname,'../src/identityBankingValidation.js');
const source=fs.readFileSync(file,'utf8')
  .replace(/export const /g,'const ')
  .replace(/export function /g,'function ')
  + '\nthis.api={normalizeIranianDigits,validateNationalId,validateIban,validateAccount};';
const context={};vm.runInNewContext(source,context,{filename:file,timeout:1500});
const {normalizeIranianDigits,validateNationalId,validateIban,validateAccount}=context.api;
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
check(!validateIban('IR83061').valid,'short IBAN');
check(validateAccount('۰۰۰۰-۱۲۳۴').status==='offline_unverifiable','internal account never verified');
check(!validateAccount('123A4').valid,'invalid account characters');
console.log('Mobile offline validations passed');
