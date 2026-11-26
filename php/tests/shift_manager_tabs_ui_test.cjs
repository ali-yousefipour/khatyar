const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../tools/panel_source.jsx'),'utf8');
function block(name){
  const a=source.indexOf('function '+name+'(');
  const b=source.indexOf('\nfunction ',a+10);
  assert(a>=0&&b>a,'Component missing: '+name);
  return source.slice(a,b);
}
const manager=block('ShiftManager');
for(const key of ['shifts','assign','autoRules','userRules','shiftOps','rejectLogs','offlineConflicts','holidays','blocked','leavebal','substituteCalendar']){
  assert(manager.includes('tab==="'+key+'"'),'Missing shift tab '+key);
}
for(const section of ['برنامه‌ریزی','کنترل و پایش','تقویم و مرخصی']){
  assert(manager.includes(section),'Missing navigation group '+section);
}
assert(manager.includes('sm-nav-btn')&&manager.includes('sm-content-head'),'Grouped tab interface missing');
const assign=block('ShiftAssign');
assert(assign.includes('toLocaleLowerCase')&&assign.includes('u.username'),'Personnel search needs username and ID');
assert(assign.includes('sm-scroll-table'),'Assignments need scroll container');
const override=block('UserRuleOverrides');
assert(override.includes('x.duty_minutes??453')&&override.includes('x.overtime_limit_minutes??27'),'Explicit zero policy values should be preserved');
const ops=block('ShiftOperations');
assert(ops.includes('from>to')&&ops.includes('confirm(')&&ops.includes('disabled={busy}'),'Sensitive operations need range check, confirmation and busy protection');
const logs=block('AttendanceRejectLogs');
assert(logs.includes('Asia/Tehran')&&logs.includes('setError('),'Attendance reject logs must use Tehran date and show failure');
const conflicts=block('OfflineSyncConflicts');
assert(conflicts.includes('acting!==null')&&conflicts.includes("kind==='retry'&&!confirm"),'Offline conflict operations need single-flight and confirmation');
const holidays=block('Holidays');
assert(holidays.includes('sm-status-error')&&holidays.includes('aria-label='),'Holiday controls must report errors and be accessible');
assert(block('LeaveBlockedDates').includes('دریافت روزهای ممنوعه ناموفق بود'),'Leave block load errors must be surfaced');
assert(block('LeaveBalanceInit').includes('دریافت مانده مرخصی ناموفق بود'),'Leave balances load errors must be surfaced');
const rules=block('AutoShiftRules');
assert(rules.includes('Number(v.m)>59')&&rules.includes('saving!==null'),'Rule editor requires validation and single-flight');
console.log('PASS all 10 shift manager tabs, UI, and safety guards');

const vm=require('node:vm');
const context={Intl,Date};vm.createContext(context);
vm.runInContext(block('substituteMonthDays'),context);
assert.equal(context.substituteMonthDays(1403,12).length,30,'Leap Esfand');
assert.equal(context.substituteMonthDays(1404,12).length,29,'Ordinary Esfand');
assert.equal(context.substituteMonthDays(1405,1).length,31,'Farvardin');
assert.equal(context.substituteMonthDays(1405,7).length,30,'Mehr');
const calendar=block('SubstituteCalendar');
assert(calendar.includes('controller.abort()'),'Cancel stale calendar requests');
assert(calendar.includes('reservations')&&calendar.includes('cover'),'Show both advisory and confirmed records');
console.log('PASS substitute tab, Jalali month lengths and stale request guard');
