const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../..'),flow=fs.readFileSync(path.join(root,'.github/workflows/deploy-php.yml'),'utf8');
const upload=flow.slice(flow.indexOf('- name: Upload changed PHP files'),flow.indexOf('- name: Verify uploaded FTP files'));
const verify=flow.slice(flow.indexOf('- name: Verify uploaded FTP files'),flow.indexOf('- name: Delete removed PHP files'));
for(const name of ['CompanyWork.php','company_work_routes.php','company-work-template.xlsx']){
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
assert(fs.readFileSync(path.join(root,'php/lib/CompanyWork.php'),'utf8').includes("__DIR__.'/company-work-template.xlsx'"),'runtime reads canonical protected template');
console.log('PASS company deployment: all dependencies staged, allowed and checksum verified through protected PHP installation before routes');
