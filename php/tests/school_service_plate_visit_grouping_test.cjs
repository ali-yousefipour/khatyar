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
const dashboard = fs.readFileSync(path.join(root, 'lib/school_service_routes_extra.php'), 'utf8');
assert.match(dashboard, /'service_companies_all_years'=>\$allYearsServiceCompanies/, 'all-time service company metric must be exposed by API');
assert.match(dashboard, /c\.is_active=1 OR EXISTS\(SELECT 1 FROM school_service_school_companies sc WHERE sc\.company_id=c\.id\) OR EXISTS\(SELECT 1 FROM school_service_inspections i WHERE i\.company_id=c\.id\)/, 'count current companies and documented former operators without duplicates');
assert.match(ui, /کل شرکت‌های مجری سرویس مدارس/, 'dashboard explains all-time service company metric');
assert.match(dashboard, /SELECT id,photo_path,CASE WHEN photo_path IS NOT NULL/, 'inspector images are fetched only for matching users');
assert.match(dashboard, /_user_photo_url\(\$photoRow\['photo_path'\]/, 'inspector photos use standard profile photo normalization');
assert.match(dashboard, /array_chunk\(\$inspectorIds,300\)/, 'batch user photo queries without grouping binary image data');
assert.match(ui, /ssv-inspector-cards/, 'dashboard renders inspectors as cards');
assert.match(ui, /ssv-inspector-avatar/, 'inspector cards include photos or fallback initials');
assert.match(ui, /data-inspector-photo/, 'inspector photos expose an error fallback binding');
assert.match(ui, /addEventListener\('error'/, 'image failures use CSP-safe event listeners');
assert.match(ui, /ssv-inspector-score/, 'inspector cards show prominent 30-day visit counts');
assert.match(ui, /ssv-kpi strong\{font-size:clamp\(34px/, 'dashboard numbers use projection-size typography');

assert.match(ui, /c\.service_companies_all_years==null\?'—'/, 'unavailable metric must not be silently shown as zero');
assert.match(dashboard, /'visited_vehicles'=>\$visitedVehicles/, 'dashboard exposes inspected unique plate totals');
assert.match(dashboard, /GROUP BY i\.plate_two,i\.plate_letter,i\.plate_three,i\.plate_region_code/, 'unique visits use all Iranian plate segments');
assert.match(dashboard, /'inspections'=>\$inspections/, 'dashboard keeps total visits independent of distinct plates');
assert.match(ui, /c\.visited_vehicles/, 'dashboard displays visited vehicles');
assert.match(ui, /inspections-page\?group_by_plate=1&page=1&page_size=1/, 'dashboard counts distinct plates through the existing grouped inspections endpoint');
assert.match(ui, /const visitedVehicleCount=groupedCount\?\?apiCount/, 'grouped server count is authoritative, API card is fallback');
assert.match(ui, /visitedVehicleCount===null\?'—'/, 'missing count must never appear as a false zero');
assert.match(ui, /c\.inspections\|\|0/, 'dashboard displays all inspection records');
assert.match(ui, /ssv-visit-history-modal/, 'visit history modal has its own scroll layout');
assert.match(ui, /\.ssv-form-body\{flex:1 1 auto;min-height:0;overflow-y:auto/, 'scrolling is constrained to modal content');
assert.match(ui, /data-photo-full/, 'visit photos open full-screen on click');
assert.match(ui, /group_by_plate:'1'/, 'active admin UI requests grouped plate rows');
assert.match(ui, /data-plate-visits/, 'visit count must open the history');
assert.match(ui, /ssvJalaliDate\(visit\.violation_date\)/, 'history shows Jalali dates');
assert.match(ui, /visit\.inspector_name/, 'history shows inspector');
assert.match(ui, /visit\.location_text/, 'history shows visit location');
assert.match(source, /ssvShowPlateVisits/, 'panel source matches standalone admin behavior');
for (const script of [ui,source]) {
  assert.match(script, /ssv-visit-summary>\.ssv-visit-meta\{display:grid/, 'only summary metadata gets grid layout');
  assert.match(script, /ssv-visit-summary>\.ssv-iran-plate\{flex:0 0 auto/, 'plate retains its dimensions');
  assert.doesNotMatch(script, /\.ssv-visit-summary span\{display:grid/, 'summary styles must not override plate internals');
  assert.doesNotMatch(script, /\.ssv-visit-summary small\{color:/, 'plate flag and Iran labels must retain their color');
}

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
