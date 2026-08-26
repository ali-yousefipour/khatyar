// تست دود (smoke test) endpointهای کلیدی روی سرور در حال اجرا.
// استفاده:  BASE_URL=http://localhost:4000 ADMIN_USER=کدملی ADMIN_PASS=رمز node test/smoke.js
const BASE = process.env.BASE_URL || 'http://localhost:4000';
const USER = process.env.ADMIN_USER, PASS = process.env.ADMIN_PASS;
let token, pass = 0, fail = 0;

async function check(name, fn) {
  try { await fn(); console.log('  ✓', name); pass++; }
  catch (e) { console.log('  ✗', name, '→', e.message); fail++; }
}
const api = (p, opt = {}) => fetch(BASE + p, {
  ...opt, headers: { 'content-type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(opt.headers || {}) },
}).then(async r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });

(async () => {
  console.log('تست سلامت و احراز هویت:');
  await check('GET /health', async () => { const d = await api('/health'); if (!d.ok) throw new Error('not ok'); });
  await check('POST /auth/login', async () => {
    if (!USER || !PASS) throw new Error('ADMIN_USER/ADMIN_PASS تنظیم نشده');
    const d = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: USER, password: PASS, device_id: 'smoke-test' }) });
    token = d.access; if (!token) throw new Error('بدون توکن');
  });
  console.log('تست endpointهای محافظت‌شده:');
  for (const p of ['/api/admin/stats', '/api/admin/users', '/api/admin/roles', '/api/admin/zones',
                   '/api/admin/lines', '/api/admin/logs', '/api/notice-reasons',
                   '/api/my/dashboard', '/api/my/notifications'])
    await check('GET ' + p, () => api(p));
  console.log(`\nنتیجه: ${pass} موفق، ${fail} ناموفق`);
  process.exit(fail ? 1 : 0);
})();
