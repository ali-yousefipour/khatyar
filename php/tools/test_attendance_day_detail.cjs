const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const php = fs.readFileSync(path.resolve(__dirname, '../lib/routes.php'), 'utf8');
const panel = fs.readFileSync(path.resolve(__dirname, 'panel_source.jsx'), 'utf8');

const requests = php.slice(php.indexOf("route('GET', '/api/admin/attendance-day-requests'"), php.indexOf("route('GET', '/api/admin/requests',"));
assert.match(requests, /r\.user_id=\?/);
assert.match(requests, /r\.from_jdate/);
assert.match(requests, /r\.to_jdate/);
assert.match(requests, /_req_admin_can_view_request/);
assert.match(panel, /GET\('\/admin\/attendance-day-requests\?/);
assert.match(panel, /dayRequestsError/);
assert.match(panel, /manual:"تردد دستی"/);
assert.match(panel, /r\.in_time/);

const audit = php.slice(php.indexOf("route('GET','/api/admin/attendance-day-audit'"), php.indexOf("route('POST', '/api/admin/attendance-surplus/convert'"));
assert.match(audit, /\(int\)\(\$u\['level'\]/, 'Sensitive audit history must remain root-only');
assert.match(audit, /request_edit_history/);
assert.match(panel, /request_edit:'اصلاح درخواست ثبت‌شده'/);
console.log('Day detail includes scoped requests, errors and restricted edit history.');
