const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const routes = fs.readFileSync(path.join(root, 'lib/routes.php'), 'utf8');
const screen = fs.readFileSync(path.join(root, '../mobile/src/screens/RequestsScreen.js'), 'utf8');
const picker = fs.readFileSync(path.join(root, '../mobile/src/components/TimePicker.js'), 'utf8');

for (const action of ['forwarded', 'approved', 'rejected']) {
  assert.ok(routes.includes(`'${action}'`), `Missing request decision: ${action}`);
}
assert.ok(routes.includes('CREATE TABLE IF NOT EXISTS request_approval_steps'), 'Persistent approval history must exist');
assert.ok(routes.includes('INSERT INTO request_approval_steps('), 'Each decision must be recorded');
assert.ok(routes.includes('WHERE s.request_id IN ($marks)'), 'History must be fetched only for the requester rows');
assert.ok(routes.includes("$r['upcoming_approvers']=[]"), 'Upcoming approval chain must be attached to each request');
assert.ok(routes.includes("$next=_req_hierarchy_managers($cursor)"), 'Upcoming reviewers must follow current region leadership');
assert.ok(routes.includes('!isset($seen[$cursor])'), 'Cyclic management assignments must not loop forever');
assert.ok(routes.includes("$approvalMode==='hierarchical' && $r['status']==='pending'"), 'Upcoming reviewers only apply to pending hierarchical requests');
assert.ok(routes.includes('r.user_id=? $visibleFilter ORDER BY r.id DESC LIMIT 100'), 'Request list remains scoped to signed-in requester and hides user-deleted rows');
assert.ok(screen.includes('function ApprovalTimeline('), 'Timeline component missing');
assert.ok(screen.includes('در انتظار بررسی:'), 'Current responsible manager must be shown');
assert.ok(screen.includes('در مرحله بعد؛ هنوز بررسی نکرده است'), 'Future managers must be clearly distinguished from approved managers');
assert.ok(screen.includes('تاریخچه مراحل قبلی'), 'Unknown legacy history must be disclosed');
assert.ok(picker.includes('length={24}') && picker.includes('length={60}'), 'Wheel picker must cover all 24 hours and 60 minutes');
assert.ok(picker.includes("m > 59") && picker.includes("m = editingMinute ? Number(typed) : minute"), 'Custom minutes must be validated');
assert.ok(picker.includes('formatTime(hour, m)') && picker.includes("two(hour) + ':' + two(minute)"), 'Selected time must retain the 24-hour HH:mm format');
assert.ok(picker.includes("key: 'now'") && picker.includes("key: 'eight'"), 'Time picker must keep functional quick presets');
assert.ok(picker.includes('allowFontScaling={false}'), 'Picker must not break under Android system font scaling');
console.log('PASS request approval history and 24-hour picker contract');
