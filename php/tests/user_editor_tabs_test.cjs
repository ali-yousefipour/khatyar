'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../tools/panel_source.jsx'),'utf8');
const start=source.indexOf('{edit&&<Modal title="ویرایش کاربر"');
const end=source.indexOf('{identityAudit',start);
assert.ok(start>0&&end>start,'user edit modal must remain in the management panel');
const modal=source.slice(start,end);
const sections=['profile','identity','contact','organization','employment','family','financial','custom','access'];
for(const name of sections){
  assert.ok(modal.includes('editTab==="'+name+'"'),'missing user edit tab '+name);
}
for(const name of sections.filter(x=>x!=='access')){
  assert.ok(modal.includes('display:editTab==="'+name+'"'),'tab must preserve component state '+name);
}
for(const value of ['first_name','last_name','national_code','birth_date','phone','email','address','role_id','zone_id','rank_stars','employment_start_date','employment_end_date','marital_status','children_count']){
  assert.ok(modal.includes('edit.'+value),'existing personnel value missing from editor '+value);
}
assert.match(modal,/<CustomFieldsFiller/);
assert.match(modal,/<PayrollEditor/);
assert.match(modal,/<LeaveBalance/);
assert.match(modal,/disabled=\{savingUser\}/);
assert.match(modal,/saveRef=\{customSaveRef\}/);
assert.match(source,/customSaveRef\.current\?await customSaveRef\.current\('payload'\)/);
assert.match(source,/custom_values:customChanges/);
assert.match(source,/if\(mode==='payload'\)return changed/);
assert.doesNotMatch(source,/const customSaved=await customSaveRef\.current\(\)/);
assert.match(source,/if\(busy\|\|fields===null\)return false/);
assert.match(modal,/users-edit-navigation/,'five grouped categories replace scrolling nine-tab strip');
assert.match(modal,/users-edit-subnav/,'all nine persistent sections remain selectable');
assert.match(modal,/onChange=\{e=>setEditTab\(e.target.value\)\}/,'nested section navigation is functional');
assert.doesNotMatch(modal,/className="row users-edit-tablist"/,'old overflowing tab strip is removed');
assert.match(source,/const label=\(\)=>selected\?faPlain/,'Jalali date labels preserve Persian digits and zero padding');
assert.match(source,/field.ftype==="date"\) return <JDate jalali/,'custom dates are handled as Jalali values');
assert.match(source,/field.ftype==="number"\) return <input[^\n]*inputMode="decimal"/,'custom numeric inputs support Persian displayed digits');
assert.match(modal,/users-edit-summary/);
assert.match(modal,/users-edit-footer/);
assert.match(modal,/closeUserEditor/);
assert.match(modal,/save\(edit,false\)/);
assert.match(source,/editDirty&&!confirm/);
assert.match(source,/onDirtyChange=\{setCustomDirty\}/);
assert.match(source,/ذخیره موفق بود، اما بازخوانی اطلاعات/);

console.log('PASS: nine persistent user editor tabs and legacy personnel values');
