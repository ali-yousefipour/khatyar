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
assert.ok(routes.includes('r.user_id=? ORDER BY r.id DESC LIMIT 100'), 'Request list remains scoped to signed-in requester');
assert.ok(screen.includes('function ApprovalTimeline('), 'Timeline component missing');
assert.ok(screen.includes('در انتظار بررسی:'), 'Current responsible manager must be shown');
assert.ok(screen.includes('تاریخچه مراحل قبلی'), 'Unknown legacy history must be disclosed');
assert.ok(picker.includes('length: 24'), 'Time picker must display all 24 hours');
assert.ok(picker.includes('Number(minute) <= 59'), 'Minutes must be validated');
assert.ok(picker.includes('two(hour)'), 'Selected time must retain 24-hour format');
console.log('PASS request approval history and 24-hour picker contract');
