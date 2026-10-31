const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../app/app.html'), 'utf8');
const source = html.slice(html.indexOf('let _refreshPromise=null;'), html.indexOf('async function GET(p)'));
const reply = (status, data = {}) => ({ status, ok: status >= 200 && status < 300, json: async () => data });
function setup(fetch, authenticated = true) {
  const values = new Map(authenticated ? [['token', 'expired'], ['refresh', 'refresh-old']] : []);
  let logouts = 0;
  const context = vm.createContext({
    URL, Headers, API: '/api', USER: authenticated ? { id: 1 } : null,
    location: { href: 'https://example.test/app', origin: 'https://example.test' },
    store: { get: key => values.get(key), set: (key, value) => values.set(key, value) },
    logout: () => { logouts++; values.clear(); context.USER = null; }, fetch,
  });
  vm.runInContext(source, context);
  return { context, values, logouts: () => logouts };
}

async function run() {
  let renewals = 0;
  const session = setup(async (url, options) => {
    if (url === '/api/session/renew') {
      renewals++;
      await new Promise(resolve => setTimeout(resolve, 5));
      assert.equal(JSON.parse(options.body).refresh, 'refresh-old');
      return reply(200, { access: 'fresh', refresh: 'refresh-new' });
    }
    const bearer = options.headers.get('Authorization');
    assert.equal(options.headers.get('X-Access-Token'), bearer.slice(7));
    return bearer === 'Bearer fresh' ? reply(200, { ok: true }) : reply(401);
  });
  await Promise.all(['/my/app-items', '/my/dashboard', '/my/stats', '/personnel-vehicle-assets.php?op=access'].map(route =>
    vm.runInContext(`api(${JSON.stringify(route)})`, session.context)));
  assert.equal(renewals, 1);
  assert.equal(session.values.get('token'), 'fresh');
  assert.equal(session.logouts(), 0);

  const invalid = setup(async () => reply(401));
  await assert.rejects(vm.runInContext('api("/my/dashboard")', invalid.context));
  assert.equal(invalid.logouts(), 1);
  assert.equal(invalid.values.size, 0);

  const offline = setup(async url => {
    if (url === '/api/session/renew') throw new Error('offline');
    return reply(401);
  });
  await assert.rejects(vm.runInContext('api("/my/dashboard")', offline.context), /offline/);
  assert.equal(offline.logouts(), 0);
  assert.equal(offline.values.get('refresh'), 'refresh-old');

  let anonymousRequests = 0;
  const anonymous = setup(async () => { anonymousRequests++; return reply(200); }, false);
  await assert.rejects(vm.runInContext('api("/my/dashboard")', anonymous.context));
  assert.equal(anonymousRequests, 0);
  await vm.runInContext('api("/settings/public")', anonymous.context);
  assert.equal(anonymousRequests, 1);

  const login = setup(async (url, options) => {
    assert.equal(options.headers.has('Authorization'), false);
    return reply(401, { error: 'wrong password' });
  });
  await assert.rejects(vm.runInContext('api("/auth/login",{method:"POST",body:"{}"})', login.context), /wrong password/);
  assert.equal(login.logouts(), 0);
  for (const route of ['/session/otp-request', '/session/otp-verify']) {
    const otp = setup(async (url, options) => {
      assert.equal(url, '/api' + route);
      assert.equal(options.headers.has('Authorization'), false);
      return reply(401, { error: 'invalid OTP' });
    }, false);
    await assert.rejects(vm.runInContext(`api(${JSON.stringify(route)},{method:"POST",body:"{}"})`, otp.context), /invalid OTP/);
    assert.equal(otp.logouts(), 0);
  }

  let releaseRenewal;
  const changed = setup(async url => url === '/api/session/renew'
    ? new Promise(resolve => { releaseRenewal = resolve; }) : reply(401));
  const pending = vm.runInContext('api("/my/dashboard")', changed.context);
  await new Promise(resolve => setImmediate(resolve));
  changed.values.set('token', 'another-user');
  changed.values.set('refresh', 'another-refresh');
  releaseRenewal(reply(200, { access: 'stale', refresh: 'stale-refresh' }));
  await assert.rejects(pending);
  assert.equal(changed.values.get('token'), 'another-user');
  assert.equal(changed.logouts(), 0);

  const personnel = fs.readFileSync(path.join(__dirname, '../app/assets/personnel-vehicle-web.js'), 'utf8');
  const helper = personnel.match(/async function j\(url,opt\)\{[^\n]+/)[0];
  let sharedRequests = 0;
  vm.runInNewContext(helper + ';j("/api/personnel-vehicle-assets.php?op=access")', {
    window: { authenticatedFetch: async () => { sharedRequests++; return reply(200, { allowed: true }); } },
  });
  assert.equal(sharedRequests, 1);
  let bridgeToken = '';
  let bridgeRequests = 0;
  let sessionChanged;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../app/assets/personnel-vehicle-ui-bridge.js'), 'utf8'), {
    accessToken: () => bridgeToken,
    window: {
      authenticatedFetch: async () => { bridgeRequests++; return reply(200, { ok: true, allowed: false }); },
      addEventListener: (name, callback) => { sessionChanged = callback; },
    },
    document: { documentElement: {}, querySelector: () => null },
    MutationObserver: class { observe() {} },
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(bridgeRequests, 0);
  bridgeToken = 'fresh';
  sessionChanged();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(bridgeRequests, 1);
  let finishDashboard;
  const body = { innerHTML: '', scrollTop: 0, classList: { toggle() {} } };
  const rendering = vm.createContext({
    USER: null, current: 'dashboard', tmp: {},
    radioWebState: { liveTimer: null }, stopRadioWeb: () => {},
    setTimeout: () => {},
    document: { getElementById: () => body, querySelectorAll: () => [], querySelector: () => null },
    screens: { dashboard: () => new Promise(resolve => { finishDashboard = resolve; }), login: async () => 'LOGIN' },
    esc: String,
  });
  vm.runInContext(html.slice(html.indexOf('let _renderGeneration=0;'), html.indexOf('// ---- boot ----')), rendering);
  const oldRender = vm.runInContext('render()', rendering);
  rendering.current = 'login';
  await vm.runInContext('render()', rendering);
  finishDashboard('STALE DASHBOARD');
  await oldRender;
  assert.equal(body.innerHTML, 'LOGIN');
  console.log('PASS web auth: shared headers, single refresh for concurrent 401s, one retry, invalid session logout, network failure retention, anonymous/public requests, login failure, changed-session protection, personnel integration');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
