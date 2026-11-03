const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const bundle = fs.readFileSync(path.join(__dirname, '../app/assets/panel.bundle.js'), 'utf8');
const start = bundle.indexOf('const API_BASE =');
const end = bundle.indexOf('async function GET(', start);
assert(start >= 0 && end > start, 'Expected compiled panel auth helpers');
const helpers = bundle.slice(start, end);

function setup(legacy = '', rejectSignout = false) {
  const values = new Map([['token', 'expired']]);
  if (legacy) values.set('refresh_token', legacy);
  const requests = [];
  let cookie = 'refresh-cookie';
  const context = vm.createContext({
    URL, URLSearchParams, AbortController, setTimeout, clearTimeout,
    window: {},
    localStorage: {
      getItem: k => values.get(k) ?? null,
      setItem: (k, v) => values.set(k, String(v)),
      removeItem: k => values.delete(k),
      get token() { return values.get('token') || ''; },
      set token(v) { values.set('token', v); },
    },
    fetch: async (url, init = {}) => {
      requests.push([url, init]);
      if (url === '/api/session/renew') {
        assert.equal(init.credentials, 'same-origin');
        assert.equal(init.headers['X-Khatyar-Cookie-Session'], '1');
        assert.deepEqual(JSON.parse(init.body), legacy ? { refresh: legacy } : {});
        assert(cookie, 'HttpOnly refresh cookie must exist');
        return { status: 200, ok: true, text: async () => JSON.stringify({ access: 'renewed-access' }) };
      }
      if (url === '/api/session/web-signout') {
        if (rejectSignout) return { status: 403, ok: false };
        cookie = '';
        return { status: 200, ok: true };
      }
      return { status: 200, ok: true, text: async () => '{}' };
    },
  });
  vm.runInContext(helpers, context);
  return { context, values, requests, getCookie: () => cookie };
}

(async () => {
  for (const legacy of ['', 'old-refresh']) {
    const s = setup(legacy);
    await vm.runInContext('_renewBrowserSession()', s.context);
    assert.equal(s.values.get('token'), 'renewed-access');
    assert.equal(s.values.has('refresh_token'), false);
    await vm.runInContext('_clearWebSession()', s.context);
    assert.equal(s.values.has('token'), false);
    assert.equal(s.getCookie(), '');
  }
  const blocked = setup('', true);
  await assert.rejects(vm.runInContext('_clearWebSession()', blocked.context), /خروج امن انجام نشد/);
  assert.equal(blocked.values.get('token'), 'expired', 'Failed sign-out cannot silently claim logout');
  assert(!bundle.includes('localStorage.refresh_token = d.refresh'), 'Compiled panel must not persist refresh credentials');
  console.log('PASS panel cookie-only refresh, legacy migration and sign-out');
})().catch(error => { console.error(error); process.exitCode = 1; });
