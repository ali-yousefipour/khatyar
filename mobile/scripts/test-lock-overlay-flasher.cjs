const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');

const lock = read('src/AppLock.js');
const flasher = read('src/ScreenFlasher.js');
const dashboard = read('src/screens/DashboardScreen.js');
const alarm = read('src/TheftAlarmOverlay.js');

assert.match(lock, /pointerEvents=\{locked\?'none':'auto'\}/);
assert.match(lock, /\{children\}<\/View>/);
assert.match(lock, /\{locked&&<View style=\{\[StyleSheet\.absoluteFillObject/);
assert.doesNotMatch(lock, /if\(locked\)return<LockScreen/);
assert.match(flasher, /Animated\.loop\(Animated\.sequence/);
assert.match(flasher, /useNativeDriver:true/);
assert.match(flasher, /backgroundColor:'#FFFFFF'/);
assert.match(flasher, /backgroundColor:'#FFCA22'/);
assert.match(dashboard, /name="lock-outline" size=\{23\} color="#fff"/);
assert.match(alarm, /<LockScreen cfg=\{config\} unlock=/);
console.log('PASS native-driven white/amber flash, mounted background app, shared lock and consistent dashboard icon');
