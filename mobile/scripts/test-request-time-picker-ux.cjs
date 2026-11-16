const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const picker = fs.readFileSync(path.resolve(__dirname, '../src/components/TimePicker.js'), 'utf8');
const requests = fs.readFileSync(path.resolve(__dirname, '../src/screens/RequestsScreen.js'), 'utf8');

assert.match(picker, /Array\.from\(\{ length: 24 \}/, 'all 24 hours must be directly selectable');
assert.doesNotMatch(picker, /setPeriod\(|period === 'am'/, 'hour choice must not require switching AM/PM');
assert.match(picker, /Array\.from\(\{length:12\},\(_,i\)=>i\*5\)/, 'five-minute shortcuts cover the full hour');
assert.match(picker, /Number\(minute\) <= 59/, 'invalid minutes must be rejected');
assert.match(picker, /onSelect\(two\(hour\) \+ ':' \+ two\(Number\(minute\)\)\)/, 'API must receive unchanged HH:mm format');
assert.match(requests, /label=\{label\} onSelect=\{onPick\}/, 'picker identifies start or end time');
assert.match(picker, /columns: \{ flexDirection: 'row-reverse'/, 'Picker columns retain RTL Android layout');
assert.ok(picker.indexOf('<SpinnerColumn label="دقیقه"') < picker.indexOf('<SpinnerColumn label="ساعت"'), 'With row-reverse on RTL Android, hour appears on the left and minute on the right');
console.log('PASS request time picker UX and HH:mm contract');
