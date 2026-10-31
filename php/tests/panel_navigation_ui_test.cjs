const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const bundle = fs.readFileSync(path.join(__dirname, '../app/assets/panel.bundle.js'), 'utf8');
assert.match(bundle,/function PersonnelVehicleChecklistV2\(/,'Personnel vehicle checklist component is defined');
assert.match(bundle,/vehiclechecklist:\s*\{[^}]*c:\s*PersonnelVehicleChecklistV2\s*\}/,'Personnel vehicle checklist route uses the defined component');
const menuSource=bundle.slice(bundle.indexOf('const PANEL_MENU_SECTIONS'),bundle.indexOf('\nfunction Login('));
assert.ok(menuSource.includes('function panelMenuMatches'), 'Test the built search implementation');
const extract = name => {
  const start = bundle.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} exists in the built bundle`);
  const rest = bundle.slice(start + 1);
  const end = rest.search(/\n(?:async )?function |\nconst PANEL_BUILD_VERSION/);
  assert.ok(end >= 0);
  return bundle.slice(start, start + 1 + end);
};
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : tree && typeof tree === 'object' ? [tree, ...nodes(tree.props.children)] : [];
const text = tree => Array.isArray(tree) ? tree.map(text).join('') : tree && typeof tree === 'object' ? text(tree.props.children) : tree == null || typeof tree === 'boolean' ? '' : String(tree);
const views = {};
for (const match of bundle.matchAll(/^\s{4}(\w+): \{ t: "([^"]+)", ic:/gm)) views[match[1]] = { t: match[2], c: () => null };
assert.ok(Object.keys(views).length > 50, 'Use the actual menu inventory');
function harness(source, initial) {
  let cursor = 0;
  const states = [...initial], effects = [], listeners = new Map();
  const context = vm.createContext({
    React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }), Fragment: 'Fragment' },
    useState: value => { const slot = cursor++; if (!(slot in states)) states[slot] = typeof value === 'function' ? value() : value; return [states[slot], next => { states[slot] = typeof next === 'function' ? next(states[slot]) : next; }]; },
    useRef: () => ({ current: null }), useEffect: callback => effects.push(callback),
    VIEWS: views, I8: () => null, JDate: () => null, ResponsiveTable: () => null, fj: String, fa: String, userPhotoImg: value => value,
    localStorage: { getItem: () => null, setItem: () => {} }, window: {},
    document: { addEventListener: (event, fn) => listeners.set(event, fn), removeEventListener: event => listeners.delete(event) },
    db: { publicSettings: async () => ({}), restoreSession: async () => null, settings: async () => ({}), users: async () => [] },
    GET: async () => [], URLSearchParams, setTimeout: fn => fn(), console
  });
  vm.runInContext(menuSource, context);
  vm.runInContext(source, context);
  return { states, effects, listeners, evaluate: expression => vm.runInContext(expression,context), render: (name, args = '') => { cursor = 0; effects.length = 0; return vm.runInContext(`${name}(${args})`, context); } };
}
const admin = { name: 'کاربر آزمایشی', is_admin: true, role_id: 1 };
const app = harness(extract('App'), [admin, true, 'dashboard', null, false, {}, '', false, {}]);
let tree = app.render('App');
const menu = tree => nodes(tree).filter(n => n.type === 'button' && (n.props.className || '').startsWith('navitem '));
assert.ok(menu(tree).length > 50, 'All permitted pages remain available');
const menuKeys=JSON.parse(app.evaluate('JSON.stringify(PANEL_MENU_SECTIONS.flatMap(([,keys])=>keys))'));
assert.equal(menuKeys.length,Object.keys(views).length,'Every defined page, including work contracts, remains in the sidebar');
assert.equal(new Set(menuKeys).size,menuKeys.length,'Every page appears in exactly one category');
assert.ok(menuKeys.includes('subscriptioninvoices'),'Invoice issuance is reachable from sidebar');
assert.ok(menuKeys.includes('workcontracts'),'Work contracts must be reachable from the HR sidebar');
assert.ok(menuKeys.every(key=>views[key]),'Every menu item opens an existing view');
app.states[6] = 'تردد';
tree = app.render('App');
assert.deepEqual(menu(tree).map(n => text(n)).filter(t => t !== 'خروج'), ['گزارش تردد پرسنل']);
menu(tree).find(n => text(n) === 'گزارش تردد پرسنل').props.onClick();
assert.equal(app.states[2], 'attreport', 'Search selection opens the real existing view');
assert.equal(app.states[4], false, 'Selecting a page closes the mobile drawer');
assert.equal(app.states[6], '', 'Selecting a result clears the search');
assert.ok(Object.values(app.states[8]).includes(true), 'The destination category stays expanded');
app.states[6] = 'مديريت';
tree = app.render('App');
assert.ok(menu(tree).some(n => text(n).includes('مدیریت')), 'Arabic/Persian spelling works');
app.states[6] = 'منابع انسانی';
tree = app.render('App');
assert.ok(menu(tree).some(n => text(n).includes('سنوات')), 'Category search includes its pages');
const searchInput=tree=>nodes(tree).find(n=>n.type==='input'&&n.props['aria-label']==='جستجو در صفحات پنل');
app.states[6]='ورود خروج';tree=app.render('App');
assert.ok(menu(tree).some(n=>text(n)==='گزارش تردد پرسنل'),'Related multi-word terms find attendance reports');
app.states[6]='نشست';tree=app.render('App');
assert.deepEqual(menu(tree).map(n=>text(n)).filter(x=>x!=='خروج'),['جلسات فعال کاربران'],'Common aliases find the real page');
searchInput(tree).props.onKeyDown({key:'Enter',preventDefault(){}});
assert.equal(app.states[2],'activesessions','Enter opens the first visible result');
app.states[6]='اس ام اس';tree=app.render('App');
assert.ok(menu(tree).some(n=>text(n)==='ارسال پیامک'),'SMS aliases are supported');
app.states[6]='ماموریت';tree=app.render('App');
assert.ok(menu(tree).some(n=>text(n).includes('موتور مأموریت')),'Hamza spelling variations find mission templates');
app.states[6]='صِحّت';tree=app.render('App');
assert.ok(menu(tree).some(n=>text(n)==='صحت‌سنجی حضور'),'Diacritics do not prevent matches');
searchInput(tree).props.onKeyDown({key:'Escape',stopPropagation(){}});
assert.equal(app.states[6],'','Escape clears search before closing the drawer');
app.states[6] = 'عبارت ناموجود ۱۲۳';
tree = app.render('App');
assert.ok(nodes(tree).some(n => n.props.role === 'status' && text(n).includes('پیدا نشد')));
app.states[6] = 'لاگ'; app.states[3] = ['dashboard'];
tree = app.render('App');
assert.ok(!menu(tree).some(n => text(n).includes('لاگ')), 'Search cannot expose disallowed pages');
app.states[6] = ''; app.states[4] = true;
tree = app.render('App');
assert.ok(nodes(tree).some(n => n.props['aria-expanded'] === true && n.props.className === 'burger'));
app.effects[0]();
app.listeners.get('keydown')({ key: 'Escape' });
assert.equal(app.states[4], false, 'Escape closes the mobile menu');
app.states[7]=true;tree=app.render('App');
nodes(tree).find(n=>n.props['aria-label']==='باز کردن جستجوی منو').props.onClick();
assert.equal(app.states[7],false,'Collapsed navigation has an explicit search entry point');
app.states[3]=null;app.states[6]='';tree=app.render('App');
const sectionButtons=nodes(tree).filter(n=>n.props.className==='navsec-head');
sectionButtons[0].props.onClick();sectionButtons[1].props.onClick();
assert.equal(Object.values(app.states[8]).filter(Boolean).length,1,'Only the selected category stays open outside search');
const logs = harness(extract('Logs'), [[], [{ id: 7, first_name: 'نمونه', last_name: 'آزمایشی', username: 'sample' }], [], { event: '', user_id: '', from: '', to: '' }]);
assert.doesNotThrow(() => { tree = logs.render('Logs'); }, 'Logs renders without the undefined visibleUsers crash');
assert.ok(nodes(tree).some(n => n.type === 'option' && n.props.value === 7 && text(n).includes('آزمایشی')));
const table = harness(extract('ResponsiveTable'), []).render('ResponsiveTable', "{children:'sample cells',className:'existing-report-table'}");
assert.equal(table.props.tabIndex, 0, 'Wide tables can be scrolled with a keyboard');
assert.ok(nodes(table).some(n => n.type === 'table' && n.props.className === 'existing-report-table' && text(n) === 'sample cells'), 'The scroll container preserves table attributes and cells');
const reportContext=harness(extract('ReportsCenter'),[]);
const reports=reportContext.render('ReportsCenter',"{canNavigate:key=>key==='attreport'}");
assert.equal(nodes(reports).filter(n=>n.type==='button').length,1,'Report shortcuts respect the same page permissions');
assert.ok(text(reports).includes('تردد پرسنل'));
console.log('PASS: 59 unique pages, categories, live search, aliases, multi-word matching, Arabic/Persian spelling, keyboard selection, empty state, permissions, mobile Escape, report shortcuts, and logs rendering');
