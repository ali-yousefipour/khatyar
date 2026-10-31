const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const bundle = fs.readFileSync(path.join(__dirname, '../app/assets/panel.bundle.js'), 'utf8');
const start = bundle.indexOf('function ActiveSessionsView()');
const end = bundle.indexOf('function CronStatusView()', start);
assert.ok(start >= 0 && end > start, 'Active sessions is built into the panel');
const rows = [
  { id: 1, user_id: 11, user_name: 'علی', device_type: 'web', device_model: 'Chrome' },
  { id: 2, user_id: 11, user_name: 'علی', device_type: 'android', device_model: 'Samsung' },
  { id: 3, user_id: 12, user_name: 'رضا', device_type: 'web', device_model: 'Firefox' }
];
const states = [{ items: rows, count: 3 }, false, '', 'all', [], false, '', ''];
const requests = [];
let cursor = 0;
const context = vm.createContext({
  React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) },
  useState: init => { const i = cursor++; if (!(i in states)) states[i] = init; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
  useEffect: () => {},
  GET: async () => ({ items: rows, count: 3 }),
  SEND: async (method, endpoint, body) => { requests.push({ method, endpoint, body }); return { revoked_count: body.session_ids.length }; },
  db: { revokeDevice: async () => {} },
  confirm: () => true, fa: String, fj: String
});
vm.runInContext(bundle.slice(start, end), context);
const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === 'object' ? [node, ...nodes(node.props.children)] : [];
const render = () => { cursor = 0; return vm.runInContext('ActiveSessionsView()', context); };
const find = predicate => nodes(render()).find(predicate);
const filter = find(n => n.type === 'select' && n.props.value === 'all');
assert.ok(filter, 'Web/Android filter is present');
filter.props.onChange({ target: { value: 'web' } });
assert.equal(states[3], 'web');
const selectAll = find(n => n.type === 'input' && n.props.type === 'checkbox' && n.props.checked === false && !n.props['aria-label']);
assert.ok(selectAll, 'Select-all checkbox is available');
selectAll.props.onChange({ target: { checked: true } });
assert.deepEqual(Array.from(states[4]), [1, 3], 'Select all affects only visible Web sessions');
assert.equal(nodes(render()).filter(n => n.type === 'tr' && n.props.children?.length > 1).length, 3, 'Table retains headers and matching rows');
const bulk = find(n => n.type === 'button' && typeof n.props.onClick === 'function' && String(n.props.children).includes('قطع گروهی'));
assert.ok(bulk && !bulk.props.disabled, 'Bulk revoke is available for selection');
(async () => {
  await bulk.props.onClick();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].endpoint, '/admin/active-sessions/revoke');
  assert.deepEqual(Array.from(requests[0].body.session_ids), [1, 3]);
  assert.deepEqual(Array.from(states[4]), [], 'Selection clears after reload');
  filter.props.onChange({ target: { value: 'android' } });
  assert.deepEqual(Array.from(states[4]), [], 'Changing filters clears selection');
  console.log('PASS: active session type filter, visible select-all, bulk endpoint and cleared selection');
})().catch(error => { console.error(error); process.exitCode = 1; });
