const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const bundle = fs.readFileSync(path.join(__dirname, '../app/assets/panel.bundle.js'), 'utf8');
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
    GET: async () => [], URLSearchParams, console
  });
  vm.runInContext(source, context);
  return { states, effects, listeners, render: (name, args = '') => { cursor = 0; effects.length = 0; return vm.runInContext(`${name}(${args})`, context); } };
}
const admin = { name: 'کاربر آزمایشی', is_admin: true, role_id: 1 };
const app = harness(extract('App'), [admin, true, 'dashboard', null, false, {}, '', false, {}]);
let tree = app.render('App');
const menu = tree => nodes(tree).filter(n => n.type === 'button' && (n.props.className || '').startsWith('navitem '));
assert.ok(menu(tree).length > 50, 'All permitted pages remain available');
app.states[6] = 'تردد';
tree = app.render('App');
assert.deepEqual(menu(tree).map(n => text(n)).filter(t => t !== 'خروج'), ['گزارش تردد پرسنل']);
menu(tree).find(n => text(n) === 'گزارش تردد پرسنل').props.onClick();
assert.equal(app.states[2], 'attreport', 'Search selection opens the real existing view');
assert.equal(app.states[4], false, 'Selecting a page closes the mobile drawer');
app.states[6] = 'مديريت';
tree = app.render('App');
assert.ok(menu(tree).some(n => text(n).includes('مدیریت')), 'Arabic/Persian spelling works');
app.states[6] = 'منابع انسانی';
tree = app.render('App');
assert.ok(menu(tree).some(n => text(n).includes('سنوات')), 'Category search includes its pages');
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
const logs = harness(extract('Logs'), [[], [{ id: 7, first_name: 'نمونه', last_name: 'آزمایشی', username: 'sample' }], [], { event: '', user_id: '', from: '', to: '' }]);
assert.doesNotThrow(() => { tree = logs.render('Logs'); }, 'Logs renders without the undefined visibleUsers crash');
assert.ok(nodes(tree).some(n => n.type === 'option' && n.props.value === 7 && text(n).includes('آزمایشی')));
const table = harness(extract('ResponsiveTable'), []).render('ResponsiveTable', "{children:'sample cells',className:'existing-report-table'}");
assert.equal(table.props.tabIndex, 0, 'Wide tables can be scrolled with a keyboard');
assert.ok(nodes(table).some(n => n.type === 'table' && n.props.className === 'existing-report-table' && text(n) === 'sample cells'), 'The scroll container preserves table attributes and cells');
console.log('PASS: real menu inventory, search, spelling, category search, empty state, permissions, navigation, mobile Escape, and logs rendering');
