'use strict';
// Regression checks for localized complaint timestamps, including explicit offsets.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../app/assets/school-complaints-admin.js'), 'utf8');
const start = source.indexOf('const fa=v=>');
const end = source.indexOf('const now=()=>', start);
assert.ok(start >= 0 && end > start, 'date formatter declarations must exist');
const context = { Intl, Date };
vm.runInNewContext(source.slice(start, end) + '\nthis.formatComplaintDate=date;', context);
const formatter = context.formatComplaintDate;
const target = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran'
}).format(new Date('2026-11-21T10:00:00Z'));
for (const input of [
  '2026-11-21T10:00:00Z',
  '2026-11-21T13:30:00+03:30',
  '2026-11-21 13:30:00'
]) assert.equal(formatter(input), target, 'complaint time should be Tehran-local for '+input);
assert.equal(formatter('not-a-date'), 'not-a-date', 'invalid dates must remain readable');
assert.equal(formatter(''), '—', 'missing dates should have an empty-state label');
assert.match(source, /if\(q\.length<min\)\{setRows\(\[\]\);setLoading\(false\);return;\}/, 'short searches must reset loading');
console.log('school complaints date and lookup regression checks passed');
