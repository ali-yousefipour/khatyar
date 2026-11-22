const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
for(const file of ['php/app/assets/identity-banking-audit.js','php/app/assets/identity-banking-inputs.js']){
  const src=fs.readFileSync(path.join(root,file),'utf8');
  new vm.Script(src,{filename:file});
  assert.match(src,/focusout|fetch\(/);
}
const panel=fs.readFileSync(path.join(root,'php/app/panel.html'),'utf8');
assert.match(panel,/identity-banking-audit\.js/);
assert.match(panel,/identity-banking-inputs\.js/);
const routes=fs.readFileSync(path.join(root,'php/lib/routes.php'),'utf8');
assert.match(routes,/identity-banking\/audit/);
assert.match(routes,/function _identity_save_national_code/);
assert.match(routes,/_identity_save_national_code\(\$b\['national_code'\]/);
assert.match(routes,/IdentityBankingValidation::iban/);
assert.match(routes,/IdentityBankingValidation::account/);
console.log('PASS offline identity/banking route and RTL panel integration');
