const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');

const lock = read('src/AppLock.js');
const flasher = read('src/ScreenFlasher.js');
const dashboard = read('src/screens/DashboardScreen.js');
const alarm = read('src/TheftAlarmOverlay.js');

assert.match(lock, /pointerEvents=\{locked\?'none':'auto'\}/);
assert.match(lock, /\{children\}<\/View>/);
assert.match(lock, /<Modal[\s\S]*visible=\{locked\}[\s\S]*presentationStyle="fullScreen"/);
assert.match(lock, /<LockScreen cfg=\{cfg\} manualLock=\{manualLock\} unlock=\{unlock\}/);
assert.doesNotMatch(lock, /\{locked&&<View style=\{\[StyleSheet\.absoluteFillObject/);
assert.doesNotMatch(lock, /if\(locked\)return<LockScreen/);
assert.match(flasher, /whiteAmber: \{ label:'سفید و زرد', colors:\['#FFFFFF','#FFCA22'\] \}/);
assert.match(flasher, /blackAmber: \{ label:'مشکی و زرد', colors:\['#070B11','#FFCA22'\] \}/);
assert.match(flasher, /setInterval\(\(\) => setFrame\(index => index\+1\), FLASH_FRAME_MS\)/);
assert.match(flasher, /backgroundColor:playing\?flashColor\(mode,frame\)/);
assert.match(flasher, /accessibilityRole="radio" accessibilityState=\{\{selected:mode===key\}\}/);
assert.match(flasher, /clearInterval\(timer\)/);
const modes = flasher.match(/export const FLASH_MODES = \{[\s\S]*?\n\};/)[0].replace('export ','');
const color = flasher.match(/export const flashColor = \(mode, frame\) =>[\s\S]*?;/)[0].replace('export ','');
const result = vm.runInNewContext(`${modes}\n${color}\n[
  flashColor('whiteAmber',0),flashColor('whiteAmber',1),flashColor('whiteAmber',2),
  flashColor('blackAmber',0),flashColor('blackAmber',1),flashColor('blackAmber',2)
]`);
assert.deepEqual(Array.from(result),['#FFFFFF','#FFCA22','#FFFFFF','#070B11','#FFCA22','#070B11']);
assert.match(dashboard, /name="lock-outline" size=\{23\} color="#fff"/);
assert.match(alarm, /<LockScreen cfg=\{config\} unlock=/);
console.log('PASS two selectable flasher palettes, actual background pulses, cleanup, app lock and dashboard icon');
