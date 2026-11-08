const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const routes = fs.readFileSync(path.join(root, 'php/lib/routes.php'), 'utf8');
const screen = fs.readFileSync(path.join(root, 'mobile/src/screens/PresentListScreen.js'), 'utf8');
const endpoint = routes.slice(routes.indexOf("route('GET', '/api/attendance/present'"), routes.indexOf("route('GET', '/api/attendance/{driverId}'"));

assert.match(endpoint, /GROUP_CONCAT\(DISTINCT v\.plate/,'Present drivers should return all matching vehicle plates');
assert.match(endpoint, /vd\.driver_id=a\.driver_id AND \(a\.line_id IS NULL OR v\.line_id=a\.line_id\)/,'Never display an unrelated line’s vehicle plate');
assert.match(endpoint, /vehicle_plates/);
assert.match(screen, /import TaxiPlate, \{ parseTaxiPlate \} from/);
assert.match(screen, /<TaxiPlate plate=\{plate\} compact/);
assert.match(screen, /\.\.\.platesForPresence\(item\)/,'Search must include vehicle plates');
assert.match(screen, /پلاک:.*plates\.map\(faNum\)/,'Exit confirmation should identify the vehicle');
console.log('Present-list taxi plate API, display, search and exit confirmation checks passed.');
