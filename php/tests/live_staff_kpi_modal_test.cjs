'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../tools/panel_source.jsx'),'utf8');
const start=source.indexOf('function LiveStaffDashboard(){');
const end=source.indexOf('\nfunction PersonnelDistributionDashboard(){',start);
assert.ok(start>=0&&end>start,'LiveStaffDashboard available');
const widget=source.slice(start,end);
for(const expected of [
  'const [selectedStatus,setSelectedStatus]=useState(null)',
  'present:live.present_list||[]',
  'absent:live.absent_list||[]',
  'leave:live.leave_list||[]',
  'const allStaff=[...statusLists.present,...statusLists.absent,...statusLists.leave]',
  '["total","کل پرسنل",live.total]',
  '["present","حاضر در شیفت",live.present]',
  '["absent","غایب",live.absent]',
  '["leave","مرخصی/ماموریت",live.leave]',
  'setSelectedStatus(key)',
  'selectedStatus==="total"?allStaff',
  'modalRows.map((r,i)=>',
  'statusForRow(r)',
  '<Modal title=',
  'setSelectedStatus(null)',
  'r.check_in?faTime(r.check_in)',
  'absenceReason(r)'
]){
  assert.ok(widget.includes(expected),'Missing attendance modal requirement: '+expected);
}
console.log('PASS live attendance KPI modals use canonical server status lists, count and search');
