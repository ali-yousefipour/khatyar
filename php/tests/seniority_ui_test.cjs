const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const bundle = fs.readFileSync(path.join(__dirname, '../app/assets/panel.bundle.js'), 'utf8');
const start = bundle.indexOf('function seniorityEn(');
const source = bundle.slice(start, bundle.indexOf('function Users()', start));
assert.ok(start > 0 && source.includes('function PersonnelSeniority('));
const settle = () => new Promise(resolve => setImmediate(resolve));
function nodes(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap(item => nodes(item, predicate));
  if (!tree || typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children || [], predicate)];
}
function content(tree) {
  if (Array.isArray(tree)) return tree.map(content).join('');
  if (!tree || typeof tree === 'boolean') return '';
  return typeof tree === 'object' ? content(tree.props?.children || []) : String(tree);
}
const button = (tree, label) => nodes(tree, item => item.type === 'button' && content(item).trim() === label)[0];
function harness(data) {
  let index = 0, pending = [];
  const state = [], effects = [];
  const sent = [], alerts = [];
  let failGet = false, failSave = false;
  const context = vm.createContext({
    React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) },
    useState: initial => {
      const slot = index++;
      if (!(slot in state)) state[slot] = typeof initial === 'function' ? initial() : initial;
      return [state[slot], value => { state[slot] = typeof value === 'function' ? value(state[slot]) : value; }];
    },
    useRef: initial => { const slot = index++; return state[slot] ?? (state[slot] = { current: initial }); },
    useMemo: callback => callback(),
    useEffect: (callback, dependencies) => {
      const slot = index++;
      if (!effects[slot]) pending.push(() => { effects[slot] = { dependencies, cleanup: callback() }; });
    },
    usePager: rows => ({ slice: rows, Pager: () => null }),
    GET: async () => { if (failGet) throw Error('network failed'); return data; },
    SEND: async (method, endpoint, body) => {
      sent.push({ method, endpoint, body });
      if (failSave) throw Error('write failed');
      return { ok: true, delta_days: 0 };
    },
    fa: String, faPlain: String, Modal: 'Modal',
    confirm: () => true, alert: message => alerts.push(message),
  });
  vm.runInContext(source, context);
  return {
    context, sent, alerts,
    render: () => { index = 0; pending = []; const tree = vm.runInContext('PersonnelSeniority()', context); pending.forEach(run => run()); return tree; },
    failGet: value => { failGet = value; }, failSave: value => { failSave = value; },
  };
}
async function main() {
  const rows = [
    { id: 1, first_name: 'کاربر', last_name: 'یک', personnel_code: '5005', national_code: '0012345678', role_id: 2, role_title: 'بازرس', zone_id: 3, zone_name: 'شمال', is_active: 1, initialized: true, seniority_days: 130, base_days: 100, base_through_jdate: '1405-06-31', revision: 2, monthly_days: 30, current_month_days: 30 },
    { id: 2, first_name: 'کاربر', last_name: 'دو', is_active: 1, initialized: false, monthly_days: 0, current_month_days: 0, seniority_days: null },
    { id: 3, first_name: 'غیرفعال', last_name: 'سه', is_active: 0, initialized: true, seniority_days: 10 },
  ];
  const app = harness({ rows, period: '1405-07', month_days: 30 });
  app.render(); await settle(); let tree = app.render();
  assert.ok(content(tree).includes('کاربر یک'));
  assert.ok(content(tree).includes('کاربر دو'));
  assert.ok(!content(tree).includes('غیرفعال سه'));
  assert.ok(content(tree).includes('1405-07'));
  const search = nodes(tree, item => item.props?.['aria-label'] === 'جستجوی پرسنل')[0];
  search.props.onChange({ target: { value: '۵۰۰۵' } }); tree = app.render();
  assert.ok(content(tree).includes('کاربر یک') && !content(tree).includes('کاربر دو'));
  nodes(tree, item => item.props?.['aria-label'] === 'جستجوی پرسنل')[0].props.onChange({ target: { value: '' } }); tree = app.render();
  button(tree, 'ویرایش').props.onClick(); tree = app.render();
  nodes(tree, item => item.props?.['aria-label'] === 'میزان سنوات شخص بر اساس تعداد روز')[0].props.onChange({ target: { value: '۱۵۰' } });
  nodes(tree, item => item.props?.['aria-label'] === 'دلیل اصلاح سنوات')[0].props.onChange({ target: { value: 'اصلاح کنترل‌شده' } }); tree = app.render();
  app.failSave(true);
  await nodes(tree, item => item.type === 'form')[0].props.onSubmit({ preventDefault() {} }); await settle(); tree = app.render();
  assert.ok(button(tree, 'ذخیره سنوات'));
  assert.ok(app.alerts.includes('write failed'));
  assert.equal(app.sent[0].body.seniority_days, 150);
  assert.equal(app.sent[0].body.revision, 2);
  app.failSave(false);
  await nodes(tree, item => item.type === 'form')[0].props.onSubmit({ preventDefault() {} }); await settle(); tree = app.render();
  assert.ok(!button(tree, 'ذخیره سنوات'));
  const update = button(tree, 'به‌روزرسانی تا انتهای ماه');
  const first = update.props.onClick();
  const second = update.props.onClick();
  await Promise.all([first, second]); tree = app.render();
  assert.equal(app.sent.filter(call => call.endpoint.endsWith('/recalculate')).length, 1);
  assert.ok(content(tree).includes('نتیجه به‌روزرسانی'));
  const progress = [];
  app.context.targets = rows;
  app.context.progress = (done, total) => progress.push([done, total]);
  app.context.update = async id => { if (id === 2) throw Error('one failure'); return { delta_days: 0 }; };
  const results = await vm.runInContext('seniorityBatchUpdate(targets,"1405-07",update,progress)', app.context);
  assert.equal(results.length, 3);
  assert.equal(results[1].ok, false);
  assert.equal(results[2].ok, true);
  assert.deepEqual(progress, [[1, 3], [2, 3], [3, 3]]);
  app.context.exportRows = [{ ...rows[0], first_name: '=HYPERLINK("bad")' }];
  const exported = vm.runInContext('seniorityExportRows(exportRows,"1405-07")', app.context);
  assert.ok(exported[0]['نام'].startsWith("'="));
  assert.equal(exported[0]['کد ملی'], '0012345678');
  const failed = harness({ rows, period: '1405-07' }); failed.failGet(true);
  failed.render(); await settle(); let failedTree = failed.render();
  assert.ok(button(failedTree, 'تلاش مجدد'));
  failed.failGet(false); await button(failedTree, 'تلاش مجدد').props.onClick(); await settle(); failedTree = failed.render();
  assert.ok(content(failedTree).includes('کاربر یک'));
  assert.ok(bundle.includes('seniority: { t: "سنوات نیروها"'));
  console.log('PASS compiled seniority UI: filters, Persian digits, missing baseline, retained edit on failure, revision, refresh, single-flight batch, partial failures, Excel injection protection and menu');
}
main().catch(error => { console.error(error); process.exit(1); });
