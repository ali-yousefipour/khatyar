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
assert.match(flasher, /redBlue: \{ label:'قرمز و آبی', colors:\['#EC1728','#095DFF'\] \}/);
assert.match(flasher, /FLASH_PATTERNS = \{ federal:'فدرالی', simple:'ساده', random:'تصادفی' \}/);
assert.match(flasher, /setTimeout\(\(\) => setFrame\(index => \(index\+1\)%FLASH_PATTERN_MS.length\)/);
assert.match(flasher, /backgroundColor:playing\?flashColor\(mode,frame,pattern\)/);
assert.match(flasher, /playing&&halfScreen/);
assert.match(flasher, /accessibilityRole="radio" accessibilityState=\{\{selected:mode===key\}\}/);
assert.match(flasher, /clearTimeout\(timer\)/);
const modes = flasher.match(/export const FLASH_MODES = \{[\s\S]*?\n\};/)[0].replace('export ','');
const color = flasher.match(/export const flashColor = \(mode, frame, pattern='federal'\) => \{[\s\S]*?\n\};/)[0].replace('export ','');
const result = vm.runInNewContext(`${modes}\n${color}\n[
  flashColor('whiteAmber',0),flashColor('whiteAmber',1),flashColor('whiteAmber',2),
  flashColor('blackAmber',0),flashColor('blackAmber',1),flashColor('blackAmber',2),
  flashColor('redBlue',0,'simple'),flashColor('redBlue',1,'simple')
]`);
assert.deepEqual(Array.from(result),['#FFCA22','#FFFFFF','#FFCA22','#FFCA22','#070B11','#FFCA22','#EC1728','#095DFF']);
assert.match(dashboard, /<DashboardQuickAction label="قفل" icon="lock-outline" onPress=\{lockAppNow\}/);
assert.match(alarm, /<LockScreen cfg=\{config\} unlock=/);
console.log('PASS three flasher palettes, three patterns, half-screen, cleanup, app lock and dashboard icon');
