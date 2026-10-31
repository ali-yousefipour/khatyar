const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const screen = fs.readFileSync(path.resolve(__dirname, '../src/screens/CheckInScreen.js'), 'utf8');

assert.match(screen, /accessibilityRole="tab" accessibilityLabel=\{l\} accessibilityState=\{\{ selected: tab===k \}\}/,
  'Daily attendance tabs must expose their selected state');
assert.match(screen, /accessibilityRole="checkbox" accessibilityLabel="یادآور ثبت خروج پس از هشت ساعت" accessibilityState=\{\{ checked: !!exitReminder \}\}/,
  'The eight-hour reminder must expose its checked state');
assert.match(screen, /accessibilityRole="radio" accessibilityLabel=\{`ثبت حضور با \$\{label\}`\} accessibilityState=\{\{checked:method===key\}\}/,
  'Map-overlay presence methods must expose the selected option');
assert.match(screen, /accessibilityLabel="به‌روزرسانی موقعیت من" accessibilityState=\{\{disabled:refreshingPos\}\}/,
  'Location refresh must describe its busy state');
assert.match(screen, /marginRight: 8, minHeight: 48, justifyContent: 'center'/,
  'Stale attendance refresh must meet the minimum Android touch target');

console.log('PASS check-in accessibility: tabs, reminder, methods, location and retry');
