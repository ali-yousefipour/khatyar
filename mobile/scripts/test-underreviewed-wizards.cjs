const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const screens = path.resolve(__dirname, '../src/screens');
const read = name => fs.readFileSync(path.join(screens, name), 'utf8');
const forms = read('FormsScreen.js');
const driverGate = read('CompanyRequestsDriverGateScreen.js');
const visits = read('LineVisitProgramScreen.js');

assert.match(forms, /mimeExtensions\[a\]/, 'MIME filters must validate a real filename extension');
assert.match(forms, /a==='image\/\*'/, 'Generic image picker constraints must remain usable');
assert.match(forms, /accessibilityState=\{\{checked:answers\[field.key\]===o\}\}/, 'Form choices expose selected state');
assert.match(forms, /minHeight: 48/, 'Form controls have Android touch target');
assert.match(driverGate, /searchVersion\.current\+\+;setBusy\(false\);setNid\(v\);setCandidate\(null\)/, 'Editing the ID invalidates search result');
assert.match(driverGate, /if\(version===searchVersion.current\)setCandidate\(normalized\)/, 'Stale asynchronous results are discarded');
assert.match(visits, /scrollRef\.current\?\.scrollTo/, 'Selecting a line returns to its editor');
assert.match(visits, /accessibilityState=\{\{selected:selected\?\.line\?\.id===l.id\}\}/, 'Selected line is announced');
assert.match(visits, /name="camera-outline"/, 'Camera uses a vector icon');
console.log('PASS under-reviewed Android wizards: forms, driver gate, visit program');
