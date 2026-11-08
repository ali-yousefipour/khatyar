const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const routes = fs.readFileSync(path.join(__dirname, '../lib/routes.php'), 'utf8');
const panel = fs.readFileSync(path.join(__dirname, '../tools/panel_source.jsx'), 'utf8');
const endpoint = routes.match(/route\('GET', '\/api\/admin\/live-staff-dashboard',[\s\S]*?\}, false, ADMIN\);/);
assert.ok(endpoint, 'Live staff endpoint must exist with admin authorization');
assert.match(endpoint[0], /_live_staff_dashboard\(\)/, 'It must load current staff data');
assert.doesNotMatch(endpoint[0], /_work_month_rows|_shift_month_report/, 'Live endpoint must not compute the monthly work report');
assert.match(panel, /liveStaffDashboard: \(\)=> GET\('\/admin\/live-staff-dashboard',\{timeoutMs:20000\}\)/);
assert.match(panel, /return db\.liveStaffDashboard\(\)\.then\(x=>/, 'Live staff UI must use dedicated lightweight endpoint');
assert.doesNotMatch(panel.match(/function LiveStaffDashboard\(\)[\s\S]*?function /)?.[0] || '', /db\.workDashboard\(/, 'Live staff tab must not call monthly report');
console.log('PASS live staff dashboard uses dedicated lightweight endpoint with timeout');
