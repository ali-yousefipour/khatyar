const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const route = read('php/lib/routes.php');
const unified = read('php/app/api/unified-role-app-items.php');
const catalogue = read('php/lib/android_app_items.php');
const app = read('mobile/App.js');
const drawer = read('mobile/src/DrawerMenuScreen.js');
const dashboard = read('mobile/src/screens/DashboardScreen.js');

assert.match(unified, /kh_android_app_items\(\)/, 'Admin catalogue must use the shared permission keys');
assert.match(route, /'\/api\/my\/app-items'[\s\S]*?kh_android_app_items\(\)/, 'Mobile role permissions must use the shared catalogue');
assert.match(route, /array_key_exists\(\$rid, \$cfg\)/, 'An explicitly empty role must remain forbidden');
assert.doesNotMatch(route.match(/route\('GET', '\/api\/my\/app-items'[\s\S]*?\}, false\);/)?.[0] || '', /: null/, 'Unconfigured roles must not return null');
for (const key of ['Dashboard', 'Radio', 'CheckIn', 'StationCapture', 'MyStations', 'LineLocation', 'Requests']) {
  assert.ok(catalogue.includes(`'${key}'`), `Missing canonical permission key: ${key}`);
}
assert.match(app, /if\(pending\)return <View/, 'Restricted pages must wait for authorization');
assert.match(app, /if\(!access\?\.includes\(routeName\)\)/, 'Page access must be denied when permission is absent');
assert.match(app, /forceNetwork:true,queueIfOffline:false/, 'Page permissions must be retrieved from the current server state');
assert.match(drawer, /roleAppAccess\.includes\(route\)/, 'Drawer routes must fail closed');
assert.match(dashboard, /destinationFor\(m\.r\)/, 'Legacy line location permission must navigate to its allowed route');
assert.match(dashboard, /m\.r === 'StationCapture' && allowed\.includes\('LineLocation'\)/, 'Legacy alias must not grant MyStations access');
console.log('PASS role app item contract: backend defaults, admin catalogue, page guards and navigation');
