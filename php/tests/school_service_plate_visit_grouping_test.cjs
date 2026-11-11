const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const api = fs.readFileSync(path.join(root, 'lib/routes.php'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'app/assets/school-service-admin.js'), 'utf8');
const source = fs.readFileSync(path.join(root, 'tools/panel_source.jsx'), 'utf8');

assert.match(api, /group_by_plate.*==='1'/, 'inspection list must opt in to grouping');
assert.match(api, /GROUP BY \$plateKey/, 'plate grouping must happen before pagination');
assert.match(api, /COUNT\(\*\) inspection_count/, 'server returns per-plate visit counts');
assert.match(api, /CONCAT\('unknown:',i\.id\)/, 'incomplete plates must not be merged');
assert.match(api, /inspections-plate-history/, 'individual history endpoint must exist');
assert.match(api, /_ssv_need\(\$u,'view'\)/, 'inspection histories retain permission checks');
assert.match(ui, /group_by_plate:'1'/, 'active admin UI requests grouped plate rows');
assert.match(ui, /data-plate-visits/, 'visit count must open the history');
assert.match(ui, /ssvJalaliDate\(visit\.violation_date\)/, 'history shows Jalali dates');
assert.match(ui, /visit\.inspector_name/, 'history shows inspector');
assert.match(ui, /visit\.location_text/, 'history shows visit location');
assert.match(source, /ssvShowPlateVisits/, 'panel source matches standalone admin behavior');

// Parse-only checks missed a stray unary + before `function`, which silently
// turned this declaration into an expression and left the click handler undefined.
const historyStart = ui.indexOf('function ssvFa(');
const historyEnd = ui.indexOf('function ssvIranPlate(', historyStart);
assert.ok(historyStart > -1 && historyEnd > historyStart);
const runtime = {css:{textContent:''}};
vm.createContext(runtime);
vm.runInContext(ui.slice(historyStart,historyEnd),runtime);
assert.equal(typeof runtime.ssvShowPlateVisits,'function', 'clickable history handler must exist at runtime');

const start = ui.indexOf('function ssvGroupedInspectionTable(');
const end = ui.indexOf('\ncss.textContent +=', start);
assert.ok(start > -1 && end > start, 'grouped table renderer exists');
const context = {ssvFa: n => String(n), ssvIranPlate: r => r.plate, esc: String,
  ssvJalaliDate: String, ssvVehicleSortHeading: text => `<th>${text}</th>`};
vm.runInNewContext(ui.slice(start, end), context);
const markup = vm.runInNewContext(`ssvGroupedInspectionTable([{id:7,plate:'12 ب 345',inspection_count:3,school_name:'مدرسه',company_name:'شرکت',violation_date:'1405/08/20'}],{total:1},1)`, context);
assert.match(markup, /data-plate-visits="0"/, 'number button is rendered');
assert.match(markup, />3 <span>مشاهده سوابق/, 'count is visible');
assert.equal((markup.match(/<tr>/g)||[]).length, 2, 'one header row and one row per distinct plate');
console.log('PASS school service visits: grouped plates, counts, history, and UI contract');
