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
console.log('PASS unified taxi plate presentation in search, vehicle and driver screens');
