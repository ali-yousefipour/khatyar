const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const bundle = fs.readFileSync(path.join(__dirname, '../app/assets/panel.bundle.js'), 'utf8');
const source = bundle.slice(bundle.indexOf('function Zones() {'), bundle.indexOf('function ManagersEditor('));
const settle = () => new Promise(resolve => setImmediate(resolve));
function nodes(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...(tree.props?.children || []).flat(Infinity).flatMap(child => nodes(child, predicate))];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join('');
  if (!tree || typeof tree === 'boolean') return '';
  return typeof tree === 'object' ? text(tree.props?.children || []) : String(tree);
}
const button = (tree, label) => nodes(tree, node => node.type === 'button' && text(node).trim() === label)[0];
const column = (tree, key) => nodes(tree, node => node.props.className?.startsWith('col') && String(node.props.key) === String(key))[0];
function harness(component, db) {
  let index = 0;
  let pending = [];
  const values = [];
  const effects = [];
  let confirmed = true;
  const context = vm.createContext({
    React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) },
    useState: initial => {
      const slot = index++;
      if (!(slot in values)) values[slot] = typeof initial === 'function' ? initial() : initial;
      return [values[slot], value => { values[slot] = typeof value === 'function' ? value(values[slot]) : value; }];
    },
    useRef: initial => { const slot = index++; return values[slot] ?? (values[slot] = { current: initial }); },
    useEffect: (callback, dependencies) => {
      const slot = index++;
      const previous = effects[slot];
      if (!previous || !dependencies || dependencies.some((value, offset) => value !== previous.dependencies[offset])) {
        pending.push(() => { previous?.cleanup?.(); effects[slot] = { dependencies, cleanup: callback() }; });
      }
    },
    db, fa: String, Modal: 'Modal', ManagersEditor: 'ManagersEditor',
    confirm: () => confirmed, alert: () => {}, setTimeout, clearTimeout,
    requestAnimationFrame: callback => callback(),
  });
  vm.runInContext(source, context);
  return {
    render: () => { index = 0; pending = []; const tree = vm.runInContext(component + '()', context); pending.forEach(effect => effect()); return tree; },
    confirm: value => { confirmed = value; },
  };
}

async function testZones() {
  let failUpdate = false, failDelete = false, failAssign = false;
  let deletions = 0;
  const created = [];
  const app = harness('Zones', {
    users: async () => [{ id: '1', first_name: 'نیروی یک', zone_id: '1' }, { id: '2', first_name: 'نیروی دو', zone_id: '2' }],
    zones: async () => [{ id: '1', name: 'شمال' }, { id: '2', name: 'جنوب' }],
    createZone: async name => { created.push(name); return { id: 3, name }; },
    updateZone: async () => { if (failUpdate) throw new Error('rename failed'); },
    deleteZone: async () => { if (failDelete) throw new Error('delete failed'); deletions++; },
    setOrg: async () => { if (failAssign) throw new Error('assign failed'); },
  });
  app.render(); await settle(); let tree = app.render();
  assert.ok(text(column(tree, 1)).includes('نیروی یک'));
  button(column(tree, 1), 'ویرایش').props.onClick(); tree = app.render();
  const editInput = nodes(tree, node => node.type === 'input' && node.props.value === 'شمال')[0];
  editInput.props.onChange({ target: { value: 'شمال جدید' } }); tree = app.render();
  await button(tree, 'ذخیرهٔ منطقه').props.onClick(); tree = app.render();
  assert.ok(text(column(tree, 1)).includes('شمال جدید'));
  assert.ok(text(column(tree, 1)).includes('نیروی یک'));
  button(column(tree, 1), 'ویرایش').props.onClick(); tree = app.render();
  nodes(tree, node => node.type === 'input' && node.props.value === 'شمال جدید')[0].props.onChange({ target: { value: 'نام ناموفق' } });
  tree = app.render(); failUpdate = true;
  await button(tree, 'ذخیرهٔ منطقه').props.onClick(); tree = app.render();
  assert.ok(text(column(tree, 1)).includes('شمال جدید'));
  assert.ok(text(nodes(tree, node => node.type === 'Modal')[0]).includes('rename failed'));
  nodes(tree, node => node.type === 'Modal')[0].props.onClose(); tree = app.render();
  app.confirm(false);
  await button(column(tree, 1), 'حذف').props.onClick();
  assert.equal(deletions, 0);
  app.confirm(true); failDelete = true;
  await button(column(tree, 1), 'حذف').props.onClick(); tree = app.render();
  assert.ok(column(tree, 1)); assert.ok(text(column(tree, 1)).includes('نیروی یک'));
  failDelete = false; failAssign = true;
  const drop = { dataTransfer: { getData: () => '1' } };
  column(tree, 2).props.onDrop(drop); await settle(); tree = app.render();
  assert.ok(text(column(tree, 1)).includes('نیروی یک'));
  failAssign = false;
  column(tree, 2).props.onDrop(drop); await settle(); tree = app.render();
  assert.ok(text(column(tree, 2)).includes('نیروی یک'));
  await button(column(tree, 2), 'حذف').props.onClick(); tree = app.render();
  assert.equal(column(tree, 2), undefined);
  assert.ok(text(column(tree, 'none')).includes('نیروی یک'));
  assert.ok(text(column(tree, 'none')).includes('نیروی دو'));
  const newInput = nodes(tree, node => node.type === 'input' && node.props.placeholder === 'نام منطقهٔ جدید')[0];
  newInput.props.onChange({ target: { value: '  شرق  ' } }); tree = app.render();
  await button(tree, '+ منطقه').props.onClick(); tree = app.render();
  assert.deepEqual(created, ['شرق']); assert.ok(column(tree, 3));
  console.log('PASS compiled Zones UI: edit/create, numeric/string IDs, cancel/delete, retained personnel, failed writes, and drag/drop');
}

async function testChart() {
  const roles = ['معاونت بازرسی و نظارت','رییس اداره بازرسی','سربازرس ارشد','سربازرس','بازرس','گشت موتوری','اپراتور','ناظر خط','مدیر اجرایی شرکت','صدور پروانه'];
  const users = roles.map((role, index) => ({ id: index + 1, first_name: 'نفر ' + (index + 1), role_title: role,
    zone_id: index >= 3 && index <= 6 ? 1 : index === 7 ? 2 : null, zone_name: index >= 3 && index <= 6 ? 'شمال' : index === 7 ? 'جنوب' : null }));
  const parents = { 2: [1], 3: [2], 4: [3], 5: [4], 6: [3], 7: [5, 6], 10: [9] };
  const defaultEdges = Object.entries(parents).flatMap(([user, managers]) => managers.map(manager => ({ user_id: +user, manager_id: manager, primary: 1 })));
  let writes = 0;
  const app = harness('OrgChart', { orgChart: async () => ({ users, default_edges: defaultEdges,
    edges: [{ user_id: 7, manager_id: 5, primary: 1 }], zones: [{ id: 1, name: 'شمال' }, { id: 2, name: 'جنوب' }] }),
  setOrg: async () => { writes++; } });
  app.render(); await settle(); let tree = app.render();
  const select = label => nodes(tree, node => node.type === 'select' && node.props['aria-label'] === label)[0];
  assert.equal(select('نوع چارت').props.value, 'regional');
  select('منطقه چارت').props.onChange({ target: { value: '1' } }); tree = app.render();
  const cards = () => nodes(tree, node => node.type === 'div' && typeof node.props.draggable === 'boolean');
  let shown = cards();
  assert.deepEqual(shown.map(node => node.props.key).sort((first, second) => first - second), [1,2,3,4,5,6,7]);
  assert.ok(shown.every(node => node.props.draggable === false));
  const field = shown.find(node => node.props.key === 7);
  assert.ok(field.props.style.top > shown.find(node => node.props.key === 5).props.style.top);
  assert.ok(field.props.style.top > shown.find(node => node.props.key === 6).props.style.top);
  field.props.onDrop({ preventDefault() {}, stopPropagation() {} });
  assert.equal(writes, 0);
  const search = nodes(tree, node => node.type === 'input' && node.props.placeholder === 'جستجوی نام یا سمت…')[0];
  search.props.onChange({ target: { value: 'نفر 7' } }); tree = app.render();
  assert.equal(cards().length, 7);
  select('نوع چارت').props.onChange({ target: { value: 'saved' } }); tree = app.render();
  shown = cards();
  assert.ok(shown.every(node => node.props.draggable === true));
  assert.ok(button(tree, 'تنظیم ارتباط‌ها'));
  assert.equal(writes, 0);
  console.log('PASS compiled OrgChart UI: regional default, zone labels/filter, visible ancestors under collapsed branches, longest-path levels, single cards, and preserved manual editing');
}

testZones().then(testChart).catch(error => { console.error(error); process.exitCode = 1; });
