const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const src = path.resolve(__dirname, '../src');
const plate = fs.readFileSync(path.join(src, 'components/TaxiPlate.js'), 'utf8');
for (const name of ['SearchScreen.js', 'DriverScreen.js', 'ListScreens.js']) {
  const source = fs.readFileSync(path.join(src, 'screens', name), 'utf8');
  assert.match(source, /import TaxiPlate from ['"]\.\.\/components\/TaxiPlate['"]/, `${name} must use the shared taxi plate`);
  assert.match(source, /<TaxiPlate /, `${name} must render the shared taxi plate`);
}
assert.match(plate, /blueBand:\{/, 'Blue IR stripe is required');
assert.match(plate, /backgroundColor:'#ffca17'/, 'Taxi plate must be yellow');
assert.match(plate, /flexDirection:'row',direction:'ltr'/, 'Plate visual order must be independent from RTL app layout');
assert.match(plate, /region:\{/, 'Region must be its own outlined segment');
assert.match(plate, /const match = raw\.match/, 'Persisted taxi plate must be parsed');
assert.match(plate, /accessibilityLabel="دو رقم اول پلاک"/, 'Two-digit input must have an accessible label');
assert.match(plate, /accessibilityLabel="سه رقم وسط پلاک"/, 'Three-digit input must have an accessible label');
const searchPlate = fs.readFileSync(path.join(src,'components/PlateSearch.js'),'utf8');
assert.match(searchPlate,/accessibilityLabel="دو رقم ابتدایی پلاک تاکسی"/,'first plate search input needs accessible name');
assert.match(searchPlate,/accessibilityLabel="سه رقم بعد از حرف ت پلاک تاکسی"/,'second plate search input needs accessible name');
assert.match(searchPlate,/accessibilityLabel="جستجوی پلاک تاکسی"/,'search action needs accessible name');
assert.match(searchPlate,/accessibilityLabel="پاک کردن شماره پلاک"/,'clear action needs accessible name');
assert.match(searchPlate,/btnRow: \{ flexDirection: 'row-reverse', flexWrap: 'wrap'/,'buttons should wrap for enlarged Android fonts');
assert.match(searchPlate,/btn: \{ minHeight: 48/,'search button must meet minimum touch height');
assert.match(searchPlate,/btnClear: \{ minHeight: 48/,'clear button must meet minimum touch height');
console.log('PASS unified taxi plate presentation in search, vehicle and driver screens');
