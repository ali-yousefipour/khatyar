const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../..'),flow=fs.readFileSync(path.join(root,'.github/workflows/deploy-php.yml'),'utf8');
const upload=flow.slice(flow.indexOf('- name: Upload changed PHP files'),flow.indexOf('- name: Verify uploaded FTP files'));
const verify=flow.slice(flow.indexOf('- name: Verify uploaded FTP files'),flow.indexOf('- name: Delete removed PHP files'));
for(const name of ['DeliveryQueue.php','Xlsx.php','IdentityBankingValidation.php','CompanyWork.php','company_work_routes.php','company-work-template.xlsx']){
  assert(upload.includes('[ "${rel}" = "lib/'+name+'" ]'),'skip denied direct FTP: '+name);
  assert(upload.includes('[ -f deploy-payload/lib/'+name+' ]'),'trigger protected installer: '+name);
  assert(upload.includes("'"+name+"' => '"+name+"'"),'installer allowlist: '+name);
  assert(upload.match(/for name in ([^;]+); do/)[1].split(' ').includes(name),'stage dependency: '+name);
  assert(verify.includes('[ "${rel}" = "lib/'+name+'" ]'),'checksum verification uses installer: '+name);
  assert(fs.existsSync(path.join(root,'php/lib',name)),'canonical source exists: '+name);
}
assert(upload.indexOf("'CompanyWork.php' =>")<upload.indexOf("'routes.php' =>"),'install dependencies before routes');
assert(upload.indexOf("'company_work_routes.php' =>")<upload.indexOf("'routes.php' =>"));
assert(upload.includes('hash_equals(\\$srcSha, \\$dstSha)'),'protected installation verifies hashes');
assert(upload.includes("opcache_invalidate(\\$dst, true)"),'protected PHP replacement invalidates stale OPcache bytecode');
assert(fs.readFileSync(path.join(root,'php/lib/CompanyWork.php'),'utf8').includes("__DIR__.'/company-work-template.xlsx'"),'runtime reads canonical protected template');

// The bank validator is required by CompanyWork at load time. It must be
// reconciled even when its last source edit predates the deployment diff.
assert(flow.includes('lib/IdentityBankingValidation.php lib/KhatyarFormsSchema.php'),'forced payload includes bank validator');
assert(upload.includes('[ -f deploy-payload/lib/IdentityBankingValidation.php ]'),'protected installer activates for validator-only changes');
assert(upload.includes('IdentityBankingValidation.php CompanyWork.php'),'validator staged before CompanyWork');
assert(upload.match(/for name in Db\.php Jwt\.php Http\.php[^\n]*IdentityBankingValidation\.php; do/),'installer response checksum validates bank dependency');
console.log('PASS company deployment: all dependencies staged, allowed and checksum verified through protected PHP installation before routes');
