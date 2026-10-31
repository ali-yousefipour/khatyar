'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'../tools/panel_source.jsx'),'utf8');
const start=source.indexOf('function Dashboard(){');
const end=source.indexOf('\nconst GROUP_COLORS=',start);
assert.ok(start>=0&&end>start,'Dashboard component must exist');
const dashboard=source.slice(start,end);

assert.match(dashboard,/db\.topWorkers\(\)\.then\(setTw\)/,'Worker efficiency loads without changing tabs');
assert.match(dashboard,/کارایی نیروها/,'Worker efficiency heading remains visible');
assert.match(dashboard,/tw\.groups\.map/,'Existing role-based worker cards remain rendered');
for(const removed of ['روند حضور در ۷ روز گذشته','حضور به تفکیک خط (۳۰ روز)','گزارش‌های اخیر','<canvas','db.reports()','tab==="charts"']){
  assert.ok(!dashboard.includes(removed),'Removed dashboard item should not remain: '+removed);
}
assert.match(dashboard,/<PersonnelDistributionDashboard\/>/,'Personnel distribution remains intact');
assert.match(dashboard,/<LiveStaffDashboard\/>/,'Live attendance remains intact');
console.log('PASS dashboard shows worker efficiency by default without obsolete charts or recent reports');
