const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const bundle = fs.readFileSync(path.join(__dirname, '../app/assets/panel.bundle.js'), 'utf8');
const start = bundle.indexOf('function payrollEscape(');
const source = bundle.slice(start, bundle.indexOf('function SalarySlipAttachmentsAdmin(', start));
assert.ok(start > 0 && source.includes('function CompanyPayrollUpload('));
const layout = JSON.parse(fs.readFileSync(path.join(__dirname, '../app/assets/payroll-access-layout.json'), 'utf8'));
const settle = async () => { await new Promise(resolve => setImmediate(resolve)); await new Promise(resolve => setImmediate(resolve)); };
function nodes(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap(value => nodes(value, predicate));
  if (!tree || typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children || [], predicate)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join('');
  if (tree === null || tree === undefined || typeof tree === 'boolean') return '';
  return typeof tree === 'object' ? text(tree.props?.children || []) : String(tree);
}
const findButton = (tree, label) => nodes(tree, node => node.type === 'button' && text(node).trim() === label)[0];
function harness() {
  let index = 0;
  const state = [], effects = [], pending = [], calls = [], alerts = [];
  let deferUpload;
  const preview = { count: 1, matched: 1, token: 'signed-preview', revision: 1, rows: [{ source_row: 4, user_id: 9, warnings: [], data: { first_name: 'تست', last_name: 'پرسنل', national_code: '0123456789', net: '1234' } }] };
  const context = vm.createContext({
    React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) },
    useState: initial => { const slot = index++; if (!(slot in state)) state[slot] = typeof initial === 'function' ? initial() : initial; return [state[slot], value => { state[slot] = typeof value === 'function' ? value(state[slot]) : value; }]; },
    useRef: initial => { const slot = index++; return state[slot] || (state[slot] = { current: initial }); },
    useEffect: (callback, dependencies) => { const slot = index++; if (JSON.stringify(effects[slot]?.dependencies) !== JSON.stringify(dependencies)) pending.push(() => { effects[slot]?.cleanup?.(); effects[slot] = { dependencies, cleanup: callback() }; }); },
    todayJ: () => [1405, 6],
    GET: async endpoint => { calls.push({ endpoint }); return { rows: [], summary: { count: 0, total_net: '0', pending: 0 }, page_size: 50 }; },
    SEND: async (...arguments) => { calls.push(arguments); return { ok: true }; },
    API_BASE: '/api', _invalidateCache: () => {}, _readJsonResponse: async response => response.json(),
    _fetchWithAuth: async (endpoint, options) => { calls.push({ endpoint, options }); if (deferUpload) await deferUpload; return { ok: true, json: async () => options.body.get('mode') === 'preview' ? preview : { count: 1, ok: true } }; },
    FormData: class { constructor() { this.entries = new Map(); } append(key, value) { this.entries.set(key, value); } get(key) { return this.entries.get(key); } },
    URLSearchParams, setTimeout, clearTimeout, Modal: 'Modal', SalarySlipAttachmentsAdmin: 'SalarySlipAttachmentsAdmin', confirm: () => true, alert: value => alerts.push(value),
    window: { open: () => null }, db: { salarySlipUsers: async () => ({ rows: [] }) },
  });
  vm.runInContext(source, context);
  return { context, calls, alerts, render(name) { index = 0; const tree = context[name](); while (pending.length) pending.shift()(); return tree; }, blockUpload(value) { deferUpload = value; } };
}
(async () => {
  const test = harness();
  let tree = test.render('CompanyPayrollUpload');
  assert.equal(findButton(tree, 'بررسی و پیش‌نمایش').props.disabled, true);
  nodes(tree, node => node.type === 'input' && node.props.type === 'file')[0].props.onChange({ target: { files: [{ name: 'synthetic.xlsx' }] } });
  tree = test.render('CompanyPayrollUpload');
  let release;
  test.blockUpload(new Promise(resolve => { release = resolve; }));
  const first = findButton(tree, 'بررسی و پیش‌نمایش').props.onClick();
  await findButton(tree, 'بررسی و پیش‌نمایش').props.onClick();
  assert.equal(test.calls.length, 1, 'double clicks cannot create parallel uploads');
  release(); await first; test.blockUpload(null);
  tree = test.render('CompanyPayrollUpload');
  assert.equal(findButton(tree, 'ثبت نهایی اطلاعات حقوق').props.disabled, true, 'replacement needs confirmation');
  nodes(tree, node => node.type === 'input' && node.props.type === 'checkbox')[0].props.onChange({ target: { checked: true } });
  tree = test.render('CompanyPayrollUpload');
  await findButton(tree, 'ثبت نهایی اطلاعات حقوق').props.onClick();
  assert.equal(test.calls[1].options.body.get('token'), 'signed-preview');
  assert.equal(test.calls[1].options.body.get('replace'), '1');
  assert.equal(test.calls[1].options.body.get('period_jm'), '6');
  tree = test.render('CompanyPayrollUpload');
  assert.match(text(tree), /ردیف ثبت شد/);
  await findButton(tree, 'بررسی و پیش‌نمایش').props.onClick();
  tree = test.render('CompanyPayrollUpload');
  nodes(tree, node => node.type === 'input' && node.props['aria-label'] === 'سال حقوق')[0].props.onChange({ target: { value: '1406' } });
  assert.equal(findButton(test.render('CompanyPayrollUpload'), 'ثبت نهایی اطلاعات حقوق'), undefined, 'period changes invalidate preview');
  const tabs = harness();
  assert.equal(nodes(tabs.render('SalarySlipsAdmin'), node => node.props.role === 'tab').length, 3);
  await tabs.context.payrollPrint(1);
  assert.equal(tabs.alerts.length, 1, 'blocked popup produces actionable error');
  const list = harness(); list.render('CompanyPayrollList'); await new Promise(resolve => setTimeout(resolve, 300)); await settle();
  assert.match(list.calls[0].endpoint, /^\/admin\/payroll\?/);
  assert.match(text(list.render('CompanyPayrollList')), /فیشی برای این فیلتر یافت نشد/);
  const fields = { first_name: '<script>test</script>', last_name: 'نمونه', national_code: '0123456789', net: '1234567', role: 'اپراتور' };
  for (const control of layout.controls) {
    if (control.kind === 'TextBox' && control.ControlSource !== 'نام' && control.ControlSource !== 'نام خانوادگی' && control.ControlSource !== 'کد ملی' && control.ControlSource !== 'سمت') assert.ok(control.Width && control.Height, 'source geometry preserved');
  }
  const html = tabs.context.payrollSlipHtml({ period_jy: 1405, period_jm: 6, data: fields }, layout);
  assert.match(html, /size:A5 landscape/);
  assert.match(html, /width:200mm/);
  assert.match(html, /&lt;script&gt;test&lt;\/script&gt;/);
  assert.ok(!html.includes('<script>test</script>'));
  assert.ok(!html.includes('undefined'));
  assert.match(html, /شهریورماه/);
  assert.match(html, /data:image\/png;base64/);
  assert.ok(html.includes(Number(1234567).toLocaleString('fa-IR')));
  const bindingSource = source.match(/const bindings = (\{[^;]+\});/)[1];
  const bindings = vm.runInNewContext('('+bindingSource+')');
  for (const control of layout.controls.filter(control => control.kind === 'TextBox')) assert.ok(bindings[control.ControlSource], 'unmapped Access control '+control.ControlSource);
  if (process.env.PAYROLL_PRINT_OUTPUT) {
    const synthetic = Object.fromEntries(Object.values(bindings).map(field => [field, '1000000']));
    Object.assign(synthetic, { first_name: 'علی', last_name: 'آزمایشی', national_code: '0123456789', role: 'کاربر خطوط', married: '1', children: '2', days: '31', leave_days: '0', absence_days: '0', sick_days: '0', effective_days: '31', friday_hours: '16', holiday_hours: '16', night_hours: null, shift_percent: '0', overtime_hours: '88' });
    fs.writeFileSync(process.env.PAYROLL_PRINT_OUTPUT, tabs.context.payrollSlipHtml({ period_jy: 1405, period_jm: 6, data: synthetic }, layout));
  }
  console.log('Payroll UI: upload preview/commit, duplicate guard, replacement, period invalidation, three tabs, listing and Access A5 template passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
