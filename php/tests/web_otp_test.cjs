const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../app/app.html'), 'utf8');
const source = html.slice(html.indexOf("let webLogin="), html.indexOf("let _resetUser="));
const loginSource = html.slice(html.indexOf('  login:async()=>'), html.indexOf('  dashboard:async()=>'));

async function run() {
  const elements = { u: { value: '۰۰۱۲۳۴۵۶۷۸' }, 'login-code': { value: '۰۱۲۳۴۵' }, err: { textContent: '' }, 'login-submit': { disabled: false } };
  const requests = [];
  const values = new Map([['device_id', 'web-test-device']]);
  let gps = true;
  let verifyError = '';
  let clock = 100000;
  let navigation = '';
  const context = vm.createContext({
    document: { getElementById: name => elements[name] },
    store: { get: key => values.get(key), set: (key, value) => values.set(key, value) },
    Date: { now: () => clock }, USER: null, navigator: { platform: 'test' },
    gpsAvailable: async () => gps, toFa: String, render: async () => {},
    _clearApiCache: () => {}, window: { dispatchEvent: () => {} }, Event: class {},
    nav: route => { navigation = route; },
    POST: async (route, body) => {
      requests.push({ route, body });
      if (route === '/session/otp-request') return { ok: true };
      if (route === '/session/otp-verify') {
        if (verifyError) throw new Error(verifyError);
        return { access: 'access', refresh: 'refresh', user: { id: 1 } };
      }
      throw new Error('Unexpected endpoint ' + route);
    },
    chrome: () => {}, BRAND: {}, esc: String,
    GET: async route => route === '/session/web-login-config' ? {method:'sms_otp'} : {},
  });
  vm.runInContext(source, context);
  vm.runInContext('const testScreens={' + loginSource + '};', context);
  let form = await vm.runInContext('testScreens.login()', context);
  assert.ok(form.includes('دریافت کد ورود'));
  assert.ok(!form.includes('type="password"'));
  assert.ok(!html.includes("method:'HEAD'"));
  gps = false;
  await vm.runInContext('doLogin()', context);
  assert.equal(requests.length, 0);
  assert.ok(elements.err.textContent.includes('GPS'));
  gps = true;
  await Promise.all([vm.runInContext('doLogin()', context), vm.runInContext('doLogin()', context)]);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].route, '/session/otp-request');
  assert.equal(requests[0].body.username, '0012345678');
  form = await vm.runInContext('testScreens.login()', context);
  assert.ok(form.includes('autocomplete="one-time-code"'));
  assert.ok(form.includes('تأیید کد و ورود'));
  await vm.runInContext('doLogin(true)', context);
  assert.equal(requests.length, 1);
  vm.runInContext('changeLoginUser()', context);
  await vm.runInContext('doLogin()', context);
  assert.equal(requests.length, 1);
  assert.equal(vm.runInContext('webLogin.codeRequested', context), true);
  clock += 60000;
  await vm.runInContext('doLogin(true)', context);
  assert.equal(requests.length, 2);
  elements['login-code'].value = '123';
  await vm.runInContext('doLogin()', context);
  assert.equal(requests.length, 2);
  elements['login-code'].value = '٠١٢٣٤٥';
  verifyError = 'کد منقضی شده است';
  await vm.runInContext('doLogin()', context);
  assert.equal(navigation, '');
  assert.equal(values.has('token'), false);
  assert.equal(elements.err.textContent, verifyError);
  assert.equal(elements['login-submit'].disabled, false);
  verifyError = '';
  await vm.runInContext('doLogin()', context);
  const verification = requests.at(-1);
  assert.equal(verification.route, '/session/otp-verify');
  assert.equal(verification.body.code, '012345');
  assert.equal(verification.body.device_type, 'web');
  assert.equal(verification.body.device_id, 'web-test-device');
  assert.equal(values.get('token'), 'access');
  assert.equal(navigation, 'dashboard');
  console.log('PASS web OTP: request/verify UI, GPS, single submit, Persian/Arabic digits, resend cooldown, username editing, invalid/expired code, token storage and dashboard navigation');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
