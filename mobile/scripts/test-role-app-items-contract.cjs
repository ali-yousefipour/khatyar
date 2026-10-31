const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const route = read('php/lib/routes.php');
const unified = read('php/app/api/unified-role-app-items.php');
const rewrites = read('php/app/.htaccess');
const app = read('mobile/App.js');
const drawer = read('mobile/src/DrawerMenuScreen.js');
const dashboard = read('mobile/src/screens/DashboardScreen.js');

const adminItems = unified.match(/\$allItems\s*=\s*\[([^\]]+)\]/)?.[1];
const mobileItems = route.match(/route\('GET', '\/api\/my\/app-items'[\s\S]*?\$allItems\s*=\s*\[([^\]]+)\]/)?.[1];
assert.ok(adminItems && mobileItems, 'Both endpoints must declare Android permission keys');
const keys = raw => [...raw.matchAll(/'([^']+)'/g)].map(x => x[1]);
assert.deepEqual(keys(mobileItems), keys(adminItems), 'Admin and mobile permission catalogues must agree');
assert.doesNotMatch(rewrites, /^RewriteRule \^api\/(?:my\/app-items|admin\/role-app-items).*unified-role-app-items\.php/m,
  'The live role API must not route to a stale standalone PHP file');
assert.doesNotMatch(route + unified, /android_app_items\.php/, 'Role API must not require a new protected FTP module');
assert.match(route, /array_key_exists\(\$rid, \$cfg\)/, 'An explicitly empty role must remain forbidden');
assert.doesNotMatch(route.match(/route\('GET', '\/api\/my\/app-items'[\s\S]*?\}, false\);/)?.[0] || '', /: null/, 'Unconfigured roles must not return null');
for (const key of ['Dashboard', 'Radio', 'CheckIn', 'StationCapture', 'MyStations', 'LineLocation', 'Requests']) {
  assert.ok(keys(adminItems).includes(key), `Missing canonical permission key: ${key}`);
}
assert.match(app, /if\(pending\)return <View/, 'Restricted pages must wait for authorization');
assert.match(app, /if\(!access\?\.includes\(routeName\)\)/, 'Page access must be denied when permission is absent');
assert.match(app, /forceNetwork:true,queueIfOffline:false/, 'Page permissions must be retrieved from the current server state');
assert.match(drawer, /roleAppAccess\.includes\(route\)/, 'Drawer routes must fail closed');
assert.match(dashboard, /destinationFor\(m\.r\)/, 'Legacy line location permission must navigate to its allowed route');
assert.match(dashboard, /m\.r === 'StationCapture' && allowed\.includes\('LineLocation'\)/, 'Legacy alias must not grant MyStations access');
console.log('PASS role app item contract: backend defaults, admin catalogue, page guards and navigation');
