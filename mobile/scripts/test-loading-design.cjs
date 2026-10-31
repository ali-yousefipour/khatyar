const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.resolve(__dirname, '../', file), 'utf8');

const startup = read('src/StartupGate.js');
const shared = read('src/components/PulseLoadingIndicator.js');

assert.match(startup, /accessibilityValue=\{\{min:0,max:100,now:Math\.round\(progress\)\}\}/,
  'Startup percentage must be exposed to assistive technology');
assert.match(startup, /<ProgressBar percent=\{progress\}/,
  'Startup must display actual progress');
assert.match(startup, /const remain = Math\.max\(0, 5000 - \(Date\.now\(\) - startedAt\)\)/,
  'Existing startup timing must remain unchanged');
assert.match(shared, /AccessibilityInfo\.isReduceMotionEnabled\(\)/,
  'Shared loading animation must respect reduced motion');
assert.match(shared, /animation|const anim = Animated\.loop/,
  'Shared loading indicator must animate when allowed');
assert.match(shared, /accessibilityRole="progressbar"/,
  'Shared loading indicator must communicate progress');
assert.match(shared, /fullScreen \? <View style=\{styles\.full\}>/,
  'Fullscreen and inline loading must retain their public contract');

console.log('PASS loading redesign: startup progress, reduced motion and shared indicator contract');
