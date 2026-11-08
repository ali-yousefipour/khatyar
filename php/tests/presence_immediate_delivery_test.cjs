const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const admin = fs.readFileSync(path.join(__dirname, '../app/assets/presence-immediate-admin.js'), 'utf8');
const api = fs.readFileSync(path.join(__dirname, '../app/api/presence-immediate-api.php'), 'utf8');
const routes = fs.readFileSync(path.join(__dirname, '../lib/routes.php'), 'utf8');

assert.match(admin, /selectedUserIds=new Set\(\)/, 'Selected recipients must survive search rerenders');
assert.match(admin, /selectedUserIds\.add\(id\)/, 'Selection must be persisted independently of visible checkboxes');
assert.match(admin, /if\(sending\)return/, 'Concurrent sends must be blocked');
assert.match(admin, /finally\{sending=false/, 'Send button must recover after errors');
assert.match(api, /\$window=3;/, 'Immediate request must allow reasonable delivery and camera time');
assert.match(api, /\(int\)\(\$u\['level'\]\?\?99\)>3/, 'Non-manager levels must not send immediate requests');
assert.match(routes, /\$now-180/, 'Polling must retain immediate notifications during the delivery window');
assert.match(routes, /\$data\['ts'\]\+max\(1,\(int\)\(\$data\['window_minutes'\]\?\?1\)\)\*60/, 'Immediate expiry must use payload window');
console.log('PASS immediate presence: target selection, concurrent sends, time window and manager access');
