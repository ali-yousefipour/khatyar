const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const screen = fs.readFileSync(path.resolve(__dirname, '../src/screens/CheckInScreen.js'), 'utf8');

assert.match(screen, /accessibilityRole="tab" accessibilityLabel=\{l\} accessibilityState=\{\{ selected: tab===k \}\}/,
  'Daily attendance tabs must expose their selected state');
assert.match(screen, /accessibilityRole="checkbox" accessibilityLabel="یادآور خروج پس از هشت ساعت" accessibilityState=\{\{\s*checked:\s*!!exitReminder\s*\}\}/,
  'The eight-hour reminder must expose its checked state');
assert.match(screen, /accessibilityRole="radio" accessibilityLabel=\{`ثبت حضور با \$\{label\}`\} accessibilityState=\{\{checked:method===key\}\}/,
  'Map-overlay presence methods must expose the selected option');
assert.match(screen, /accessibilityLabel="به‌روزرسانی بی‌صدای نقشه و اطلاعات برنامه"[^>]*accessibilityState=\{\{disabled:refreshingPos\}\}/,
  'Silent map and cache refresh must describe its busy state');
assert.match(screen, /marginRight: 8, minHeight: 48, justifyContent: 'center'/,
  'Stale attendance refresh must meet the minimum Android touch target');

assert.match(screen,/accessibilityLabel=\{\`\$\{d\.weekday\}، \$\{shiftJalaliFa\(d\.date\)\}، \$\{kind\}\`\} accessibilityState=\{\{expanded:active\}\}/,'daily shift card must announce label and expansion');
const inbox=fs.readFileSync(path.resolve(__dirname,'../src/screens/RequestScreens.js'),'utf8');
assert.match(inbox,/accessibilityLabel=\{\`درخواست \$\{r\.requester/, 'inbox request card must announce requester and kind');
assert.match(inbox,/accessibilityState=\{\{expanded:open\}\} onPress=\{\(\)=>setExpanded/,'inbox request card must announce expansion state');
assert.match(inbox,/accessibilityLabel="پاک کردن جستجوی درخواست"/,'inbox search clear icon needs an accessible label');
console.log('PASS check-in accessibility: tabs, reminder, methods, location and retry');
