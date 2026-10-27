'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../tools/panel_source.jsx'),'utf8');
const start=src.indexOf('function PersonnelDistributionDashboard(){');
const end=src.indexOf('\nfunction ResponsiveTable(',start);
assert.ok(start>0&&end>start,'PersonnelDistributionDashboard exists');
const ui=src.slice(start,end);
for(const snippet of [
  'const roleGroups=groupBy(getRole)',
  'const zoneGroups=groupBy(getZone)',
  'people.length',
  'setSelected({kind,name})',
  'activeGroups.find(([name])=>name===selected.name)',
  '<Modal title=',
  'shown.map((u,i)=>',
  'setSelected(null)',
  'aria-label="جست‌وجوی افراد"',
  'u.first_name','u.last_name','u.personnel_code','u.is_active'
])assert.ok(ui.includes(snippet),'Missing UI contract: '+snippet);
console.log('PASS role/zone person counters and searchable member modal share one grouped dataset');
