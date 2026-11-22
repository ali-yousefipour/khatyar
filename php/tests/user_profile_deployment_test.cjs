'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),flow=fs.readFileSync(path.join(root,'.github/workflows/deploy-php.yml'),'utf8');
const upload=flow.slice(flow.indexOf('- name: Upload changed PHP files'),flow.indexOf('- name: Verify uploaded FTP files'));
const verify=flow.slice(flow.indexOf('- name: Verify uploaded FTP files'),flow.indexOf('- name: Delete removed PHP files'));
for(const name of ['UserProfileRules.php','UserProfileForms.php','UserProfileFormValues.php','UserProfileAttachments.php','UserFullReport.php']){
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
const attachments=upload.indexOf("'UserProfileAttachments.php' =>");
const report=upload.indexOf("'UserFullReport.php' =>");
const routes=upload.indexOf("'routes.php' =>");
assert(files>=0&&files<store&&store<values&&values<attachments&&attachments<report&&report<routes,'dependencies installed before route activation');
const sql=fs.readFileSync(path.join(root,'php/migrations/20261122_user_profile_forms.sql'),'utf8');
for(const table of ['user_form_definitions','user_form_versions','user_form_audit_logs'])
  assert(sql.includes('CREATE TABLE IF NOT EXISTS '+table),'additive schema '+table);
assert(!/\b(?:DROP|TRUNCATE|DELETE)\s+(?:TABLE|FROM)\b/i.test(sql),'schema migration does not destroy user data');
assert(flow.includes("migrations/20261122_user_profile_forms.sql migrations/20261123_user_profile_attachments.sql lib/routes.php"),'personnel form and attachment schemas always staged for deployment');
assert(flow.includes("$stage = 'personnel_form_schema'"),'migration executes through guarded host installer');
assert(flow.includes("if($created!==3)throw new RuntimeException('Personnel profile migration count invalid')"),'all three form tables must be provisioned');
assert(flow.includes("if((int)$profileTables!==3)throw new RuntimeException('Personnel profile schema verification failed')"),'host verifies form schema after migration');
assert(!/\b(?:DROP|TRUNCATE|DELETE)\s+(?:TABLE|FROM)\b/i.test(sql),'form migration stays additive');
const attachmentSql=fs.readFileSync(path.join(root,'php/migrations/20261123_user_profile_attachments.sql'),'utf8');
assert(attachmentSql.includes('CREATE TABLE IF NOT EXISTS user_profile_attachments'),'attachment table is additive');
assert(!/\b(?:DROP|TRUNCATE|DELETE)\s+(?:TABLE|FROM)\b/i.test(attachmentSql),'attachments never delete legacy data');
assert(flow.includes('migrations/20261123_user_profile_attachments.sql lib/routes.php'),'attachment schema staged on deploy');
assert(flow.includes("$stage = 'personnel_attachments_schema'"),'attachment migration runs during host installation');
assert(flow.includes("if($attachmentCreated!==1)throw new RuntimeException('Personnel attachments migration count invalid')"),'host checks attachment table DDL');
assert(flow.includes("if((int)$attachmentTables!==1)throw new RuntimeException('Personnel attachments schema verification failed')"),'host confirms migrated table');
function migrationStatements(source){
  return source.replace(/^\s*--[^\r\n]*$/gm,'').split(';').map(statement=>statement.trim()).filter(Boolean);
}
const formStatements=migrationStatements(sql),fileStatements=migrationStatements(attachmentSql);
assert.equal(formStatements.length,3,'all three profile CREATE statements remain intact despite semicolons in comments');
assert.equal(fileStatements.length,1,'exactly one private attachment DDL statement');
for(const statement of [...formStatements,...fileStatements])
  assert(/^CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\b/i.test(statement),'only create table statements are executed');
const stripProfile=flow.indexOf("$profileSql=preg_replace("),splitProfile=flow.indexOf("foreach(explode(';',$profileSql)");
const stripAttachment=flow.indexOf("$attachmentSql=preg_replace("),splitAttachment=flow.indexOf("foreach(explode(';',$attachmentSql)");
assert(stripProfile>=0&&splitProfile>stripProfile,'strip personnel migration comments before split');
assert(stripAttachment>=0&&splitAttachment>stripAttachment,'strip attachments migration comments before split');
console.log('PASS user form deployment: protected order, checksum stage and additive schema');
