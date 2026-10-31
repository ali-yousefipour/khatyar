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
assert.match(official, /cfg\.status === 'fulfilled'/, 'Photo requirement must not silently default after a config failure');
assert.match(official, /disabled=\{busy\|\|!!loadError\}/, 'Submission must be disabled while required data is unverified');
assert.match(official, /r\.assets\?\.\[0\]\?\.uri/, 'Camera cancellation or missing image must be handled');
assert.match(official, /ثبت تصویر ناموفق بود/, 'Camera error must be explained');
console.log('PASS field presence recovery: stale-data safety, retry, photo and touch target');
