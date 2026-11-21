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
assert(source.includes('school-complaints-admin.css?v=20261121.wizard3'),'Panel source cache key missing');
assert(portal.includes('school-complaints-admin.css?v=20261121.wizard3'),'Portal cache key missing');
assert(portal.includes('school-complaints-admin.js?v=20261121.wizard3'),'Portal JS cache key missing');
console.log('School complaints redesigned wizard checks passed');
