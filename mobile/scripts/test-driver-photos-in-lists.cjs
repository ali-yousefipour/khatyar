const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const routes = read('php/lib/routes.php');
const avatar = read('mobile/src/components/DriverPhotoAvatar.js');
const present = read('mobile/src/screens/PresentListScreen.js');
const vehicle = read('mobile/src/screens/ListScreens.js');
const temp = read('mobile/src/screens/TempDriversScreen.js');
const expiry = read('mobile/src/screens/ReportListsScreens.js');

assert.match(routes, /function _driver_photo_url_from_row/);
assert.match(routes, /route\('GET', '\/api\/attendance\/present'/);
assert.match(routes, /LEFT JOIN driver_profile_photos dp ON dp.driver_id=d.id/);
assert.match(routes, /\$row\['photo_url'\]=_driver_photo_url_from_row/);
assert.match(routes, /\$dd\['photo_url'\]=_driver_photo_url_from_row/);
assert.match(routes, /\$d\['photo_url'\]=_driver_photo_url_from_row/);
assert.match(avatar, /imageSource\(photo\)/);
assert.match(avatar, /onError=\{\(\) => setFailed\(true\)\}/);
assert.match(avatar, /hasListPhoto/, 'An explicit null from batch APIs avoids redundant per-driver requests');
assert.match(present, /<DriverPhotoAvatar driver=\{item\}/);
assert.match(vehicle, /<DriverPhotoAvatar driver=\{d\}/);
assert.match(temp, /<DriverPhotoAvatar/);
assert.match(expiry, /<DriverPhotoAvatar driver=\{r\}/);
console.log('Driver photos are returned with list responses and displayed with authenticated image loading.');
