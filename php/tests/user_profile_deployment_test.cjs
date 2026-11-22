'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),flow=fs.readFileSync(path.join(root,'.github/workflows/deploy-php.yml'),'utf8');
const upload=flow.slice(flow.indexOf('- name: Upload changed PHP files'),flow.indexOf('- name: Verify uploaded FTP files'));
const verify=flow.slice(flow.indexOf('- name: Verify uploaded FTP files'),flow.indexOf('- name: Delete removed PHP files'));
for(const name of ['UserProfileRules.php','UserProfileForms.php','UserProfileFormValues.php','UserFullReport.php']){
  assert(fs.existsSync(path.join(root,'php/lib',name)),'source exists: '+name);
  assert(upload.includes('[ "${rel}" = "lib/'+name+'" ]'),'protected module bypasses unauthorized FTP writes: '+name);
  assert(upload.includes('[ -f deploy-payload/lib/'+name+' ]'),'protected module triggers guarded installer');
  assert(upload.includes("'"+name+"' => '"+name+"'"),'guarded installer allowlist contains '+name);
  assert(upload.match(/for name in ([^;]+); do/g).some(part=>part.includes(name)),'protected stage loop contains '+name);
  assert(verify.includes('[ "${rel}" = "lib/'+name+'" ]'),'external checksum verifier delegates to protected installer');
}
const files=upload.indexOf("'UserProfileRules.php' =>");
const store=upload.indexOf("'UserProfileForms.php' =>");
const values=upload.indexOf("'UserProfileFormValues.php' =>");
const report=upload.indexOf("'UserFullReport.php' =>");
const routes=upload.indexOf("'routes.php' =>");
assert(files>=0&&files<store&&store<values&&values<report&&report<routes,'dependencies installed before route activation');
const sql=fs.readFileSync(path.join(root,'php/migrations/20261122_user_profile_forms.sql'),'utf8');
for(const table of ['user_form_definitions','user_form_versions','user_form_audit_logs'])
  assert(sql.includes('CREATE TABLE IF NOT EXISTS '+table),'additive schema '+table);
assert(!/\b(?:DROP|TRUNCATE|DELETE)\s+(?:TABLE|FROM)\b/i.test(sql),'schema migration does not destroy user data');
console.log('PASS user form deployment: protected order, checksum stage and additive schema');
