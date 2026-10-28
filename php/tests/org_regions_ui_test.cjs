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
  const requirementUpdates=[];
  const created = [];
  const createdParents=[];
  let nextZoneId=3;
  const app = harness('Zones', {
    users: async () => [{ id: '1', first_name: 'نیروی یک', zone_id: '1', is_active: 1 }, { id: '2', first_name: 'نیروی دو', zone_id: '2', is_active: '1' }, { id: '99', first_name: 'نیروی غیرفعال', zone_id: '1', is_active: 0 }],
    zones: async () => [{ id: '1', name: 'شمال' }, { id: '2', name: 'جنوب' }],
    createZone: async (name,parent_id) => { created.push(name);createdParents.push(parent_id);return { id: nextZoneId++, name,parent_id }; },
    updateZone: async (...args) => { if (failUpdate) throw new Error('rename failed');if(args.length===4)requirementUpdates.push(args); },
    deleteZone: async () => { if (failDelete) throw new Error('delete failed'); deletions++; },
    setOrg: async () => { if (failAssign) throw new Error('assign failed'); },
  });
  app.render(); await settle(); let tree = app.render();
  const requirement=nodes(column(tree,1),node=>node.type==='input'&&node.props.type==='checkbox')[0];
  assert.equal(requirement.props.checked,false);
  await requirement.props.onChange({target:{checked:true}});tree=app.render();
  assert.equal(nodes(column(tree,1),node=>node.type==='input'&&node.props.type==='checkbox')[0].props.checked,true);
  assert.deepEqual(requirementUpdates[0],['1','شمال',undefined,true]);
  assert.ok(text(column(tree, 1)).includes('نیروی یک'));
  assert.ok(!text(tree).includes('نیروی غیرفعال'));
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
  button(column(tree,3),'+ زیرمنطقه').props.onClick();tree=app.render();
  nodes(tree,node=>node.type==='input'&&node.props['aria-label']==='نام زیرمنطقه')[0].props.onChange({target:{value:'  محدوده یک  '}});tree=app.render();
  await button(tree,'ذخیره زیرمنطقه').props.onClick();tree=app.render();
  assert.equal(created[1],'محدوده یک');assert.equal(createdParents[1],3);
  assert.ok(text(column(tree,4)).includes('شرق / محدوده یک'));
  button(column(tree,3),'ویرایش').props.onClick();tree=app.render();
  const parentSelect=nodes(tree,node=>node.type==='select'&&node.props['aria-label']==='منطقه والد')[0];
  const choices=nodes(parentSelect,node=>node.type==='option').map(node=>String(node.props.value));
  assert.ok(!choices.includes('3')&&!choices.includes('4'));
  console.log('PASS compiled Zones UI: edit/create, numeric/string IDs, cancel/delete, retained personnel, failed writes, and drag/drop');
}

async function testChart() {
  const roles = ['معاونت بازرسی و نظارت','رییس اداره بازرسی','سربازرس ارشد','سربازرس','بازرس','گشت موتوری','اپراتور','ناظر خط','مدیر اجرایی شرکت','صدور پروانه'];
  const users = roles.map((role, index) => ({ id: index + 1, first_name: 'نفر ' + (index + 1), role_title: role, is_active: 1,
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
  assert.equal(button(tree, 'بستن همه').props.disabled, true);
  assert.equal(button(tree, 'بازکردن همه').props.disabled, true);
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

async function testLeaders(){
  const users=[{id:10,first_name:'سربازرس',last_name:'منطقه',role_title:'سربازرس',is_active:1,zone_id:3},{id:11,first_name:'بازرس',last_name:'زیرمنطقه',role_title:'بازرس مقیم',is_active:1,zone_id:4},{id:12,first_name:'ارشد',last_name:'بازرسی',role_title:'سربازرس ارشد',is_active:1},{id:13,first_name:'نیرو',role_title:'اپراتور',is_active:1}];
  const zones=[{id:1,name:'منطقه',parent_id:null,senior_user_id:null,inspector_ids:[]}];
  const writes=[];let fail=false;
  const app=harness('Zones',{users:async()=>users,zones:async()=>zones,zoneLeaders:async(id,fields)=>{writes.push({id,fields});if(fail)throw Error('save failure');return {ok:true,...fields};}});
  app.render();await settle();let tree=app.render();
  button(column(tree,1),'تعیین مسئولان').props.onClick();tree=app.render();
  const select=nodes(tree,node=>node.type==='select'&&node.props['aria-label']==='سربازرس منطقه')[0];
  assert.ok(!text(select).includes('ارشد بازرسی'));
  select.props.onChange({target:{value:'10'}});
  nodes(tree,node=>node.type==='Modal').flatMap(modal=>nodes(modal,node=>node.type==='input'&&node.props.type==='checkbox'))[0].props.onChange({target:{checked:true}});tree=app.render();
  fail=true;await button(tree,'ذخیره مسئولان').props.onClick();tree=app.render();assert.match(text(tree),/save failure/);assert.equal(nodes(tree,node=>node.type==='Modal').length,1);
  fail=false;await button(tree,'ذخیره مسئولان').props.onClick();tree=app.render();assert.equal(nodes(tree,node=>node.type==='Modal').length,0);assert.match(text(column(tree,1)),/سربازرس منطقه/);assert.match(text(column(tree,1)),/بازرس زیرمنطقه/);
  assert.equal(writes[1].fields.senior_user_id,10);assert.deepEqual(Array.from(writes[1].fields.inspector_ids),[11]);assert.equal(users[0].zone_id,3);assert.equal(users[1].zone_id,4);
  console.log('PASS region leadership UI: explicit senior/inspectors, role filtering, retained edits on failure, saved labels and unchanged membership');
}
testZones().then(testChart).then(testLeaders).catch(error => { console.error(error); process.exitCode = 1; });
