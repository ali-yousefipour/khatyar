const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.resolve(__dirname, file), 'utf8');

const source = read('panel_source.jsx');
const styles = read('../app/assets/panel.bundle.css');
const routes = read('../lib/routes.php');
const calendar = source.slice(source.indexOf('function AdvancedCalendar('), source.indexOf('function DayEditor('));
const save = routes.slice(routes.indexOf("route('POST', '/api/admin/shifts/{id}/days'"), routes.indexOf("route('DELETE', '/api/admin/shifts/{id}/days/{jdate}'"));

assert.match(calendar, /shift-day-edit/);
assert.match(calendar, /shift-day-copy/);
assert.match(calendar, /shift-day-delete/);
assert.match(calendar, /shift-day-paste/);
assert.match(calendar, /حذف روزهای انتخابی/);
assert.match(calendar, /setDeletedDays/);
assert.match(calendar, /saveShiftDays\(shift\.id,arr,deletedDays\)/);
assert.match(calendar, /disabled=\{saving\}/);
assert.match(save, /deleted_dates/);
assert.match(save, /DELETE FROM shift_days WHERE shift_id=\? AND jdate=\?/);
assert.match(save, /beginTransaction\(\)/);
assert.match(save, /rollBack\(\)/);
assert.match(styles, /\.shift-day-delete/);
assert.match(styles, /focus-visible/);
console.log('Calendar shift day edit/copy/paste/delete and transactional persistence contracts pass.');
