const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const bundle = fs.readFileSync(path.join(__dirname, '../app/assets/panel.bundle.js'), 'utf8');
const start = bundle.indexOf('function CovertGallery()');
const end = bundle.indexOf('function PlateTrainingPanel()', start);
assert.ok(start > 0 && end > start);
const values = [];
let index = 0;
let mounted = false;
let failure = false;
const React = {
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  useState: initial => { const slot = index++; if (!(slot in values)) values[slot] = initial; return [values[slot], value => { values[slot] = typeof value === 'function' ? value(values[slot]) : value; }]; },
  useEffect: callback => { if (!mounted) { mounted = true; callback(); } },
};
const context = vm.createContext({
  React, CovertSelfieImg: 'Image', JDate: 'JDate', fa: String,
  fj: () => 'تاریخ نمایشی فارسی', jFromIso: value => value,
  GET: async () => { if (failure) throw Error('network failure'); return [{ id: 1, name: 'نیروی آزمایشی', role_title: 'اپراتور', created_at: '1405-07-02', reason: 'sc:7' }]; },
});
vm.runInContext(bundle.slice(start, end), context);
function render() { index = 0; return vm.runInContext('CovertGallery()', context); }
function nodes(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap(child => nodes(child, predicate));
  if (!tree || typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props.children, predicate)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join('');
  return tree && typeof tree === 'object' ? text(tree.props.children) : typeof tree === 'string' ? tree : '';
}
(async () => {
  render(); await new Promise(resolve => setImmediate(resolve)); let tree = render();
  assert.match(text(tree), /نیروی آزمایشی/);
  assert.match(text(tree), /درخواست مدیر/);
  nodes(tree, node => node.type === 'JDate')[0].props.onChange('1405-07-01');
  tree = render(); assert.match(text(tree), /نیروی آزمایشی/, 'localized display date must not invalidate a valid Jalali filter');
  nodes(tree, node => node.type === 'JDate')[1].props.onChange('1405-07-01');
  tree = render(); assert.ok(!text(tree).includes('نیروی آزمایشی'));
  failure = true;
  await nodes(tree, node => node.type === 'button' && text(node) === 'تازه‌سازی تصاویر')[0].props.onClick();
  tree = render();
  assert.match(text(nodes(tree, node => node.props.role === 'alert')), /network failure/);
  console.log('PASS selfie gallery: confirmed images, correlated request label, Jalali range, refresh and explicit server failure');
})().catch(error => { console.error(error); process.exitCode = 1; });
