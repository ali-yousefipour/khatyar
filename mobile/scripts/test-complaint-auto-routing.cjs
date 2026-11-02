const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const screen = fs.readFileSync(path.join(__dirname, '../src/screens/ComplaintsScreen.js'), 'utf8');
const routes = fs.readFileSync(path.join(__dirname, '../../php/lib/complaints_routes_extra.php'), 'utf8');
const registration = routes.split("route('POST','/api/complaints',function")[1]?.split("route('POST','/api/complaints/{id}/action'")[0];
const workflow = routes.split("route('POST','/api/complaints/{id}/action',function")[1]?.split("route('GET','/api/complaints/settings'")[0];
const details = screen.split('export function ComplaintDetailScreen')[1];

assert.ok(registration, 'complaint registration route exists');
assert.match(registration, /\$receiver=\(int\)\(\$s\['receiver_user_id'\]\?\?0\)/);
assert.match(registration, /'received',\$receiver/);
assert.match(registration, /\['type'=>'complaint','complaint_id'=>\$id/);
assert.doesNotMatch(registration, /\$b\['(?:assigned_to|to_user_id|receiver_user_id)'\]/);
assert.ok(workflow, 'complaint workflow route exists');
assert.match(workflow, /\$target=null;/);
assert.match(workflow, /\$target=\$receiver;/);
assert.doesNotMatch(workflow, /\$b\['to_user_id'\]/);
assert.ok(details, 'complaint details screen exists');
assert.doesNotMatch(details, /act\('(manager_forward|forward|reply|back)'\)/);
assert.match(screen, /مستقیماً به دریافت‌کننده تعیین‌شده در تنظیمات/);
console.log('PASS complaint auto routing and no arbitrary reassignment in mobile');
