const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8');
const complaints = read('screens/ComplaintsScreen.js');
const dashboard = read('screens/DashboardScreen.js');
const requests = read('screens/RequestsScreen.js');
const drawer = read('DrawerMenuScreen.js');

assert.match(complaints, /import TaxiPlate, \{parseTaxiPlate\}/);
assert.match(complaints, /<TaxiPlate editable first=\{p1\} middle=\{p3\}/);
assert.match(complaints, /<TaxiPlate plate=\{d\.plate\} compact/);
assert.match(complaints, /<TaxiPlate plate=\{driver\.plate\} compact/);
assert.match(complaints, /<TaxiPlate plate=\{c\.plate\} compact/);
assert.match(dashboard, /dragResponders\.current\.set\(route, responder\)/);
assert.match(dashboard, /dragActiveRoute\.current !== route/);
assert.match(dashboard, /scrollEnabled=\{!dragRoute\}/);
assert.match(dashboard, /تأیید و ذخیره ترتیب/);
assert.match(requests, /گزارش مانده مرخصی/);
assert.match(requests, /faDigits\(String\(Math\.round/);
assert.match(drawer, /onError=\{\(\) => setPhotoFailed\(true\)\}/);
assert.match(drawer, /request\('\/me\/full-profile'/);
console.log('PASS complaints taxi plate, dashboard ordering, Persian leave balance, drawer photo fallback');
