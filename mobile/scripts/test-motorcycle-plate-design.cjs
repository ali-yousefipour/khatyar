const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const mobile = fs.readFileSync(path.join(root, 'mobile/src/components/VehicleIdentityFields.js'), 'utf8');
const web = fs.readFileSync(path.join(root, 'php/app/assets/personnel-vehicle-web.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'php/app/assets/android-web-ux.css'), 'utf8');

assert.match(mobile, /motorPlateFrame.*motorFirstRow/s, 'Motorcycle plate must have a framed two-row layout');
assert.match(mobile, /motorFlagGreen.*motorFlagWhite.*motorFlagRed/s, 'Iran flag must be visible on the left');
assert.match(mobile, /motorcycle_plate_top.*length=\{3\}/s, 'Top row must accept three digits');
assert.match(mobile, /motorcycle_plate_bottom.*length=\{5\}/s, 'Bottom row must accept five digits');
assert.match(mobile, /motorBottomRef\.current\?\.focus\(\)/, 'Completing top digits should focus the bottom row');

const helper = web.split('\n').find(line => line.startsWith('function motorPlateHtml('));
assert.ok(helper && web.includes('if(motor)h+=motorPlateHtml(d)'), 'Web motorcycle editor must use the same two-row plate layout');
const ctx = { fa: x => String(x).replace(/\d/g, n => '۰۱۲۳۴۵۶۷۸۹'[n]), esc: x => String(x).replace(/&/g, '&amp;').replace(/"/g, '&quot;') };
vm.createContext(ctx);
vm.runInContext(helper, ctx);
const html = vm.runInContext("motorPlateHtml({motorcycle_plate_top:'123',motorcycle_plate_bottom:'56789'})", ctx);
assert.match(html, /value="۱۲۳"[^>]*maxlength="3"/, 'Three-digit value must be preserved in the upper row');
assert.match(html, /value="۵۶۷۸۹"[^>]*maxlength="5"/, 'Five-digit value must be preserved in the lower row');
assert.match(html, /I\.R\.<br>IRAN/, 'Plate must display the Iran flag block');
assert.match(css, /#pva \.pva-card \.pva-motorplate/, 'Web plate must have its own scoped visual styling');
console.log('PASS motorcycle plate: Iranian two-row visual, numeric fields and unchanged storage keys');
