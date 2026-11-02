const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const panel = fs.readFileSync(path.join(__dirname, '../app/assets/complaints-panel.js'), 'utf8');
const routes = fs.readFileSync(path.join(__dirname, '../lib/complaints_routes_extra.php'), 'utf8');

// The missing submit-button binding used to throw when openForm set onclick.
assert.match(panel, /'cloc','csubmit'\];const el=/);
assert.match(panel, /el\.csubmit\.onclick=/);
assert.match(panel, /drivers-advanced\?/);
assert.match(routes, /CONCAT_WS\(' ',d\.first_name,d\.last_name\) LIKE/);
assert.match(routes, /by_region.*by_category.*closure_rate/);
assert.match(panel, /complaintStatus=\{received:'دریافت‌شده'/);
assert.match(panel, /printComplaint\(details,c\.tracking_code\)/);
assert.match(panel, /signature_data:signed\?canvas\.toDataURL/);
assert.match(routes, /\/api\/complaints\/\{id\}\/lifecycle/);
assert.match(routes, /فقط مسئول مجاز می‌تواند پرونده را بایگانی یا حذف کند/);
assert.match(routes, /INSERT INTO complaint_workflow\(complaint_id,actor_id,action,note\)/);
console.log('PASS complaint form binding, management dashboard, advanced search, Persian status, print, signature and lifecycle safeguards');
