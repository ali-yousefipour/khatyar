const assert = require('node:assert/strict');
const babel = require('@babel/core');
const path = require('node:path');
const vm = require('node:vm');
const compiled = babel.transformFileSync(path.join(__dirname, '../src/screens/CompanyPayrollHistory.js'), {
  presets: [require.resolve('babel-preset-expo')],
  plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
  babelrc: false, configFile: false,
}).code;
const settle = async () => { await new Promise(resolve => setImmediate(resolve)); await new Promise(resolve => setImmediate(resolve)); };
function nodes(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap(value => nodes(value, predicate));
  if (!tree || typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children || [], predicate)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join('');
  if (tree === undefined || tree === null || typeof tree === 'boolean') return '';
  return typeof tree === 'object' ? text(tree.props?.children || []) : String(tree);
}
function harness() {
  let index = 0, lastFocus, cleanup, pendingFocus, requestImpl;
  const state = [], calls = [], alerts = [];
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }), Fragment: 'Fragment',
    useState: initial => { const slot = index++; if (!(slot in state)) state[slot] = initial; return [state[slot], value => { state[slot] = typeof value === 'function' ? value(state[slot]) : value; }]; },
    useRef: initial => { const slot = index++; return state[slot] || (state[slot] = { current: initial }); },
    useCallback: (callback, deps) => { const slot = index++; const signature = JSON.stringify(deps); if (state[slot]?.signature !== signature) state[slot] = { signature, callback }; return state[slot].callback; },
  };
  const native = Object.fromEntries(['View', 'Text', 'ScrollView', 'TouchableOpacity', 'TextInput', 'Modal'].map(name => [name, name]));
  native.StyleSheet = { create: value => value }; native.Alert = { alert: (...values) => alerts.push(values) };
  native.useWindowDimensions = () => ({ width: 390, height: 844 });
  const exports = {};
  const modules = {
    react: React, 'react-native': native,
    '@react-navigation/native': { useFocusEffect: callback => { if (callback !== lastFocus) { lastFocus = callback; pendingFocus = callback; } } },
    '../api': { request: async (...values) => { calls.push(values); return requestImpl(...values); } },
    '../theme': { C: { paper: '#fff', line: '#ddd', ink: '#000', brand: 'green', slate: '#444' }, FONT: { regular: 'regular', bold: 'bold' } },
    '../num': { faNum: String }, '../components/PulseLoadingIndicator': 'ActivityIndicator',
    'react-native-view-shot': { captureRef: async () => 'file:///preview.png' },
    'expo-file-system/legacy': { documentDirectory: 'file:///private/', copyAsync: async () => {}, deleteAsync: async () => {} },
    'expo-sharing': { isAvailableAsync: async () => false },
    '../components/PayrollAccessSlip': 'PayrollAccessSlip',
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: 'Fragment' },
  };
  vm.runInNewContext(compiled, { exports, require: name => { if (name.startsWith('@babel/runtime/')) return require(name); assert.ok(name in modules, 'Unexpected import '+name); return modules[name]; } });
  return {
    calls, alerts, respond(callback) { requestImpl = callback; },
    render() { index = 0; const tree = exports.default(); if (pendingFocus) { cleanup?.(); cleanup = pendingFocus(); pendingFocus = null; } return tree; },
    unmount() { cleanup?.(); },
  };
}
(async () => {
  const test = harness();
  const row = { id: 8, period_jy: 1405, period_jm: 6, employee_name: 'پرسنل آزمایشی', net: '1000000', role_title: 'اپراتور' };
  test.respond(async endpoint => endpoint.includes('/8') ? { row: { ...row, data: { net: '1000000', overtime_hours: '8.5' }, warnings: [] }, fields: ['net', 'overtime_hours'], labels: ['خالص پرداختی', 'اضافه کار'] } : { rows: [row], summary: { count: 1, total_net: '1000000' }, page_size: 50 });
  test.render(); await settle(); let tree = test.render();
  assert.equal(test.calls[0][0], '/my/payroll?year=&month=&page=1');
  assert.equal(test.calls[0][1].noStore, true, 'payroll must not persist in shared offline cache');
  assert.match(text(tree), /پرسنل آزمایشی/);
  let inputs = nodes(tree, node => node.type === 'TextInput');
  inputs[0].props.onChangeText('۱۴۰۵'); inputs[1].props.onChangeText('۱۳'); tree = test.render();
  const button = (tree, label) => nodes(tree, node => node.type === 'TouchableOpacity' && text(node) === label)[0];
  button(tree, 'اعمال فیلتر').props.onPress(); assert.equal(test.alerts.length, 1);
  inputs = nodes(tree, node => node.type === 'TextInput'); inputs[1].props.onChangeText('۶'); tree = test.render();
  button(tree, 'اعمال فیلتر').props.onPress(); test.render(); await settle(); tree = test.render();
  assert.equal(test.calls[1][0], '/my/payroll?year=1405&month=6&page=1');
  await button(tree, 'جزئیات حقوق و کسورات').props.onPress(); tree = test.render();
  assert.match(text(tree), /خالص پرداختی/); assert.equal(test.calls[2][0], '/my/payroll/8');
  assert.equal(nodes(tree, node => node.type === 'Modal')[0].props.visible, true);
  button(tree, 'بستن جزئیات').props.onPress(); tree = test.render();
  assert.equal(nodes(tree, node => node.type === 'Modal')[0].props.visible, false);
  test.respond(async () => { throw Error('network failed'); });
  button(tree, 'تازه‌سازی').props.onPress(); test.render(); await settle(); tree = test.render();
  assert.match(text(tree), /network failed/); assert.ok(!text(tree).includes('پرسنل آزمایشی'), 'failed request cannot show stale rows');
  test.unmount();
  const source = require('node:fs').readFileSync(path.join(__dirname, '../src/screens/CompanyPayrollHistory.js'), 'utf8');
  const saveStart = source.indexOf('  const saveIssuedSlip = async () => {');
  const saveEnd = source.indexOf('\n  return <View', saveStart);
  for (const mode of ['success', 'queued', 'network-error']) {
    const events = [];
    const context = {
      slipRef: { current: {} }, slip: { row: { id: 8, period_jy: 1405, period_jm: 6 } }, issuing: false,
      setIssuing: value => events.push(['busy', value]),
      captureRef: async () => 'file:///preview.png',
      FileSystem: { documentDirectory: 'file:///private/', copyAsync: async () => events.push(['copied']), deleteAsync: async () => events.push(['deleted']) },
      request: async (endpoint, options) => {
        assert.equal(options.queueIfOffline, false);
        if (mode === 'network-error') throw Error('offline');
        return mode === 'queued' ? { ok: true, queued: true } : { ok: true, issued: true };
      },
      setIssuedMonths: () => events.push(['issued']), setSlip: value => events.push(['slip', value]),
      Alert: { alert: (...values) => events.push(['alert', ...values]) },
      Sharing: { isAvailableAsync: async () => false },
    };
    vm.createContext(context);
    vm.runInContext(source.slice(saveStart, saveEnd) + '\nrunIssuance=saveIssuedSlip;', context);
    await context.runIssuance();
    assert.equal(events.some(event => event[0] === 'issued'), mode === 'success', 'only a durable server response issues a slip');
    assert.equal(events.some(event => event[0] === 'deleted'), mode !== 'success', 'unconfirmed preview is cleaned up');
  }
  console.log('Android payroll: private API, Persian filters, validation, history, details, close and network errors passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
