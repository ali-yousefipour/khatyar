'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
const ui=read('app/assets/school-complaints-admin.js');
const css=read('app/assets/school-complaints-admin.css');
const source=read('tools/panel_source.jsx');
const portal=read('app/school-complaints-portal.html');
for(const key of ['sc-wizard-stepper','sc-wizard-type-group','sc-wizard-form-grid','sc-wizard-review',
  'sc-wizard-aside','sc-wizard-actions','sc-wizard-track','sc-wizard-selection']){
 assert(ui.includes(key),'Missing interactive wizard component: '+key);
 assert(css.includes('.sc-wizard-'+key.slice(10))||css.includes('.'+key),'Missing wizard style: '+key);
}
for(const key of ['verifyStep','advance','register','submission_key:requestKey.current',
  "SchoolMap,{school}","sc-wizard-review-card"])assert(ui.includes(key),'Registration workflow regression: '+key);
assert(ui.indexOf('if(tab===\'receive\'){')>=0,'Wizard route missing');
assert(ui.includes("step<4?btn('تأیید و ادامه',advance,busy,true)"),'Next step must validate');
assert(ui.includes("'تأیید و ثبت نهایی شکایت',register,busy,true"),'Final action must register');
assert(!ui.includes('localStorage.setItem(\'schoolComplaintDraft'),'Sensitive complaint data cannot persist in local storage');
const cssVersion=source.match(/school-complaints-admin\.css\?v=([\w.-]+)/)?.[1];
const jsVersion=source.match(/school-complaints-admin\.js\?v=([\w.-]+)/)?.[1];
assert.ok(cssVersion&&jsVersion,'Panel source versioned complaint assets must exist');
assert.equal(cssVersion,jsVersion,'Complaint CSS and JavaScript must use matching version keys');
const panel=read('app/panel.html');
for(const ext of ['css','js']){
 assert(panel.includes('school-complaints-admin.'+ext+'?v=20261121.notify1'),'Current panel missing refreshed complaint '+ext);
 assert(portal.includes('school-complaints-admin.'+ext+'?v=20261121.notify1'),'Current portal missing refreshed complaint '+ext);
}
assert(panel.indexOf('school-complaints-admin.js?v=20261121.notify1')<panel.indexOf('panel.bundle.js'),'Module override should load before panel bundle');
console.log('School complaints redesigned wizard checks passed');
