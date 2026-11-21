'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../app/assets/school-complaints-admin.js'), 'utf8');
const section = (from, to) => {
  const start = source.indexOf(from), end = source.indexOf(to, start);
  assert.ok(start >= 0 && end > start, 'canonical export handler must be present');
  return source.slice(start, end);
};
const calls = [];
let fail = false;
let failWrite = false;
const progress = {
  begin(title, options) { calls.push(['begin', title, options]); return 17; },
  update(id, details) { calls.push(['update', id, details]); },
  end(id) { calls.push(['end', id]); }
};
const xlsx = {
  utils: {
    json_to_sheet: () => ({ '!ref': 'A1:I2' }),
    aoa_to_sheet: () => ({ '!ref': 'A1:B2' }),
    book_new: () => ({}),
    book_append_sheet: () => {}
  },
  writeFile: () => { calls.push(['write']); if(failWrite)throw Error('xlsx write failed'); }
};
const context = {
  window: { KhatyarLongOperation: progress, KhatyarSchoolPdf: { download: async () => { calls.push(['pdf']); if (fail) throw Error('pdf failed'); } }, XLSX: xlsx },
  perform: fn => fn(), base: '/school-complaints', tab: 'inbox', query: p => 'page=' + p,
  get: async () => { if (fail) throw Error('network failed'); return { total: 1, rows: [{ tracking_code: 'SSC-1', phone: '0912', status: 'pending' }] }; },
  labels: { pending: 'در انتظار' }, name: () => 'کاربر نمونه', date: () => '۱۴۰۵/۰۸/۳۰',
  files: [], M: () => {}, setTimeout: cb => cb(), XLSX: xlsx, Map, Error
};
vm.runInNewContext(section('const savePdf=', '\n const exportRows=') + '\nthis.savePdf=savePdf;', context);
vm.runInNewContext(section('const exportRows=', '\n const content=') + '\nthis.exportRows=exportRows;', context);
(async () => {
  await context.exportRows();
  assert.equal(calls[0][0], 'begin');
  assert.ok(calls.some(v => v[0] === 'update' && /دریافت/.test(v[2].stage)));
  assert.ok(calls.some(v => v[0] === 'update' && /ساخت/.test(v[2].stage)));
  assert.ok(calls.some(v => v[0] === 'update' && /آماده‌سازی/.test(v[2].stage)),'building Excel rows must show a real processing stage');
  assert.ok(calls.some(v => v[0] === 'update' && /برگه‌های آماری/.test(v[2].stage)),'summarizing Excel sheets must report its phase');
  assert.equal(calls.at(-2)[0], 'write');
  assert.deepEqual(calls.at(-1), ['end', 17]);
  assert.ok(calls.every(v => v[0] !== 'update' || !Object.hasOwn(v[2], 'percent')), 'no fabricated percentage');
  calls.length = 0;
  await context.savePdf({ tracking_code: 'SSC-1' });
  assert.deepEqual(calls.map(v => v[0]), ['begin', 'pdf', 'end']);
  calls.length = 0;
  failWrite = true;
  await assert.rejects(context.exportRows(), /xlsx write failed/);
  assert.equal(calls.at(-1)[0], 'end', 'Excel serialization error must close spinner');
  failWrite = false;
  calls.length = 0;
  fail = true;
  await assert.rejects(context.exportRows(), /network failed/);
  assert.equal(calls.at(-1)[0], 'end', 'failed Excel export must clear spinner');
  calls.length = 0;
  await assert.rejects(context.savePdf({ tracking_code: 'SSC-1' }), /pdf failed/);
  assert.equal(calls.at(-1)[0], 'end', 'failed PDF export must clear spinner');
  console.log('school complaints client exports progress regression passed');
})().catch(e => { console.error(e); process.exitCode = 1; });
