const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const routes = fs.readFileSync(path.join(__dirname, '../lib/routes.php'), 'utf8');
const range = routes.match(/route\('GET', '\/api\/admin\/shift-report\/range', function\(\$p,\$b,\$u\)\{([\s\S]*?)\n\}, false, ADMIN\);/);
assert.ok(range, 'Work review range route must exist');
assert.match(range[1], /_attendance_work_review_need\(\$u\)/, 'Work review must use attendance permission');
assert.doesNotMatch(range[1], /_monthly_work_report_need/, 'Work review cannot require standalone monthly report permission');

const guard = routes.match(/function _attendance_work_review_need\(\$u\)\{([\s\S]*?)\n\}/);
assert.ok(guard, 'Attendance work review guard must exist');
assert.match(guard[1], /in_array\('attreport',\$items,true\)/, 'Attendance permission must be checked');
assert.doesNotMatch(guard[1], /monthlyworkreport/, 'Standalone work report permission must not be checked');

for (const operation of ['/api/admin/shift-report', '/api/admin/shift-report/finalization']) {
  const escaped = operation.replaceAll('/', '\\/');
  assert.match(routes, new RegExp(`route\\('GET',? ?'${escaped}'[\\s\\S]*?_monthly_work_report_need\\(\\$u\\)`), 'Standalone work report guard must remain');
}
console.log('PASS work review uses attendance-report permission independently of monthly work report');
