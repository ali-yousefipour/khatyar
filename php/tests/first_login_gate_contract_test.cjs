const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'app/index.php'), 'utf8');
const routes = fs.readFileSync(path.join(root, 'lib/routes.php'), 'utf8');
const panel = fs.readFileSync(path.join(root, 'tools/panel_source.jsx'), 'utf8');
const html = fs.readFileSync(path.join(root, 'app/panel.html'), 'utf8');

assert.match(index, /'\/api\/my\/first-login-password'/);
assert.match(routes, /route\('POST', '\/api\/my\/first-login-password'/);
assert.match(routes, /password_verify\(\$current/);
assert.match(routes, /\$u\['device_type'\] \?\? ''\) !== 'web'/);
assert.match(routes, /must_change_pw=0, pw_changed_at=NOW\(\)/);
assert.match(panel, /if\(me\.must_change_pw\)return <FirstLoginPassword/);
assert.match(panel, /!me\.must_change_pw\)\{ db\.settings/);
assert.match(panel, /mediaUrl\.searchParams\.delete\('token'\)/);
assert.match(panel, /fetch\(mediaUrl\.toString\(\),\{headers:tok\(\)/);
assert.doesNotMatch(panel, /function userPhotoImg\(/);
assert.match(html, /panel\.bundle\.js\?v=20261103\.first-login-avatar-fix/);
console.log('PASS forced-password gate, authenticated avatar fetch and panel cache bust');
