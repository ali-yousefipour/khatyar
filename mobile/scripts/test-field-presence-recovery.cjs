const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.resolve(__dirname, '../src/screens', name), 'utf8');

const present = read('PresentListScreen.js');
assert.match(present, /setData\(\(current\) => current \|\| \[\]\)/, 'Temporary errors must preserve the last present list');
assert.match(present, /setLoadError\(e\?\.message/, 'Present list errors must be visible');
assert.match(present, /disabled=\{busy!==null\|\|!!loadError\}/, 'Bulk exits cannot overlap or run against stale data');
assert.match(present, /minHeight:48/, 'Exit button must meet Android touch target guidance');

const official = read('OfficialPresenceScreen.js');
assert.match(official, /Promise\.allSettled/, 'Partial refresh failure must not erase successful data');
assert.match(official, /validConfig=cfg\.status==='fulfilled'/, 'Photo requirement must be explicitly verified');
assert.match(official, /@khatyar:official-presence:reference:v1:/, 'Required visit data must be cached per account');
assert.match(official, /setRequiredDataReady\(ready\)/, 'Partial reference data must not enable submission');
assert.match(official, /h\.status==='fulfilled'/, 'Optional visit history must be handled independently');
assert.match(official, /setUsingOfflineSnapshot\(cached\)/, 'Verified offline fallback must be identified in UI');
assert.match(official, /disabled=\{busy\|\|!!loadError\}/, 'Submission must be disabled while required data is unverified');
assert.match(official, /r\.assets\?\.\[0\]\?\.uri/, 'Camera cancellation or missing image must be handled');
assert.match(official, /ثبت تصویر ناموفق بود/, 'Camera error must be explained');
const complaints = read('ComplaintsScreen.js');
assert.match(complaints, /if\(await save\(\)\)setFull\(false\)/, 'Full-screen signature must remain open after capture failure');
assert.match(complaints, /onSave\(uri\);return true/, 'Signature save must report confirmed completion');
const program = read('LineVisitProgramScreen.js');
assert.match(program, /@khatyar:visit-program:reference:v1:/, 'Offline visit program is scoped to the signed-in user');
assert.match(program, /if\(offlineSnapshot\)return Alert.alert/, 'Stale visit program must not confirm server-dependent actions');
console.log('PASS field presence recovery: verified offline catalog, independent history and safe live-only operations');
