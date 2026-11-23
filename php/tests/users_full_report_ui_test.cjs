'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../app/assets/users-full-report-config.js'),'utf8');
const pattern=source.match(/const label=(\/\^.*?\/[a-z]*);/);
assert.ok(pattern,'report button recognition expression must exist');
const label=vm.runInNewContext(pattern[1]);
for(const name of ['⤓ خروجی کامل کاربران (Excel)','خروجی کامل کاربران (اکسل)','گزارش کامل کاربران']) {
  assert.ok(label.test(name),'report configurator must intercept: '+name);
}
assert.match(source,/full-report-options/);
assert.match(source,/full-report-export/);
assert.match(source,/preview:true/);
assert.match(source,/JSON\.stringify\(payload\(\)\)/);
assert.match(source,/sorts:\[/);
assert.match(source,/role_id:/);
assert.match(source,/zone_id:/);
assert.match(source,/groupChecks=new Map/);
assert.match(source,/انتخاب گروه/);
assert.match(source,/حذف گروه/);
assert.match(source,/canonicalOrder/);
assert.match(source,/employment_start_from/);
assert.match(source,/employment_end_to/);
assert.match(source,/ستون‌های انتخاب‌نشده/);
assert.match(source,/e\.key==='Tab'/);
assert.match(source,/lastFocus\.focus\(\)/);
assert.match(source,/height:100dvh/);
assert.match(source,/let exporting=false/);
assert.match(source,/const dismiss=\(\)=>\{if\(exporting\)return;/);
assert.match(source,/close\.disabled=true;exporting=true/);
assert.match(source,/exporting=false;originalDismiss\(\)/);
assert.match(source,/catch\(err\)\{exporting=false;status\.textContent=err\.message/);


console.log('PASS configurable users report UI contract');
