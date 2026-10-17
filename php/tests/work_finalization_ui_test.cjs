const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const bundle = fs.readFileSync(path.join(__dirname, '../app/assets/panel.bundle.js'), 'utf8');
const start = bundle.indexOf('function ShiftReport()');
const source = bundle.slice(start, bundle.indexOf('\nfunction ', start + 1));
assert.ok(bundle.includes('data.missing_frozen_person'), 'Missing historical snapshots have a visible warning');
const settle = async () => { await new Promise(resolve => setImmediate(resolve)); await new Promise(resolve => setImmediate(resolve)); };
const deferred = () => { let resolve; const promise = new Promise(callback => { resolve = callback; }); return { promise, resolve }; };
function nodes(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap(value => nodes(value, predicate));
  if (!tree || typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props.children, predicate)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join('');
  if (!tree || typeof tree === 'boolean') return '';
  return typeof tree === 'object' ? text(tree.props.children) : String(tree);
}
let index = 0;
const states = [], effects = [], alerts = [], requests = [];
let response = async () => ({ ok: true, json: async () => ({ finalized: false }) });
const context = vm.createContext({
  React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }), Fragment: 'Fragment' },
  useState: initial => { const slot = index++; if (!(slot in states)) states[slot] = initial; return [states[slot], value => { states[slot] = typeof value === 'function' ? value(states[slot]) : value; }]; },
  useRef: initial => { const slot = index++; return states[slot] || (states[slot] = { current: initial }); },
  useEffect: callback => { const slot = index++; if (!effects[slot]) effects[slot] = callback() || (() => {}); },
  todayJ: () => [1405, 7, 25], J_MONTHS: Array.from({ length: 12 }, (_, offset) => 'month' + (offset + 1)),
  API_BASE: '/api', tok: () => ({ Authorization: 'Bearer test' }), fa: String,
  window: { confirm: () => true }, alert: message => alerts.push(message),
  fetch: async (url, options) => { requests.push({ url, options }); return response(url, options); },
  db: { shiftReport: async () => ({ rows: [] }) }
});
vm.runInContext(source, context);
function render() { index = 0; return context.ShiftReport(); }
function button(tree, label) { return nodes(tree, node => node.type === 'button' && text(node) === label)[0]; }
(async () => {
  let tree = render();
  button(tree, 'نهایی کردن کارکرد نیروها').props.onClick(); tree = render();
  const stale = deferred(); response = () => stale.promise;
  const first = button(tree, 'بررسی وضعیت').props.onClick(); await settle();
  tree = render(); nodes(tree, node => node.type === 'select')[0].props.onChange({ target: { value: '6' } });
  tree = render();
  stale.resolve({ ok: true, json: async () => ({ finalized: true, finalized_at: 'old-month' }) }); await first;
  tree = render(); assert.equal(text(tree).includes('old-month'), false, 'late response cannot label the new month');
  assert.equal(button(tree, 'نهایی کردن کارکرد').props.disabled, false, 'late response cannot disable the new month');
  response = async () => ({ ok: true, json: async () => ({ finalized: true, finalized_at: 'correct-month' }) });
  await button(tree, 'بررسی وضعیت').props.onClick(); tree = render();
  assert.equal(button(tree, 'نهایی کردن کارکرد').props.disabled, true, 'correct month status disables repeat finalization');
  nodes(tree, node => node.type === 'select')[0].props.onChange({ target: { value: '5' } }); tree = render();
  const post = deferred();
  response = (url, options) => options.method === 'POST' ? post.promise : Promise.resolve({ ok: true, json: async () => ({ finalized: true }) });
  const submit = button(tree, 'نهایی کردن کارکرد').props.onClick;
  const pending = submit(); submit(); await settle(); tree = render();
  assert.equal(requests.filter(request => request.options.method === 'POST').length, 1, 'double click posts once');
  const selector = nodes(tree, node => node.type === 'select')[0];
  assert.equal(selector.props.disabled, true, 'period selection locked during irreversible write');
  selector.props.onChange({ target: { value: '4' } }); tree = render();
  assert.equal(nodes(tree, node => node.type === 'select')[0].props.value, 5, 'stale handler cannot change write period');
  post.resolve({ ok: true, json: async () => ({ ok: true }) }); await pending; tree = render();
  const submitted = JSON.parse(requests.find(request => request.options.method === 'POST').options.body);
  assert.equal(submitted.year, 1405); assert.equal(submitted.month, 5);
  assert.equal(button(tree, 'نهایی کردن کارکرد').props.disabled, true, 'saved month status retained');
  assert.equal(alerts.length, 1, 'single success notification');
  effects.forEach(cleanup => cleanup?.());
  console.log('PASS compiled finalization UI: stale status, period scope, single-flight write, locked selectors and repeat prevention');
})().catch(error => { console.error(error); process.exitCode = 1; });
