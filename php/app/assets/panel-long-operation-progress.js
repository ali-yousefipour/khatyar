/* Shared long-operation feedback for the administrative web shell.
 * The work-report progress dialog remains authoritative for its own job.
 * Never fabricate a percentage for requests without server progress data.
 */
(function (win, doc) {
  'use strict';
  if (!win || !doc || win.KhatyarLongOperation) return;
  const nativeFetch = win.fetch;
  if (typeof nativeFetch !== 'function') return;
  const DELAY_MS = 600;
  const MAX_WAIT_MS = 180000; // Safety guard if consumers never read a response body.
  const tasks = new Map();
  let seq = 0;
  let host = null;

  const excluded = /\/(?:health|auth\/me|session\/(?:renew|me)|radio|presence\/live|notifications?|ping|heartbeat)(?:\/|$)/i;
  // Live map is updated every few seconds; its polling must never open the
  // blocking, global progress dialog. Keep report/download loaders unchanged.
  const liveMapPolling = /^\/api\/(?:admin\/)?(?:live(?:[-\/](?:map|locations?|positions?|staff))?|live-map(?:[-\/].*)?|map(?:[-\/](?:live|locations?|positions?|staff))?|(?:staff[-\/])?locations?|(?:staff[-\/])?positions?)(?:\/|$)/i;
  const reports = /(?:export|download|report|excel|xlsx|csv|pdf|print|backup|statement|صورت.?وضعیت|گزارش)/i;
  const fileExtensions = /\.(?:xlsx?|csv|pdf)(?:$|\?)/i;
  // Dashboard cards and their tabs must not appear frozen while API data is pending.
  const dashboardData = /\/api\/admin\/(?:dashboard(?:[-\/]|$)|stats(?:\/|$)|top-workers(?:\/|$)|live-staff-dashboard(?:\/|$)|personnel-distribution(?:\/|$)|mission-dashboard(?:\/|$)|city-dashboard(?:\/|$))/i;
  // The live-map view has continuous polling (locations, users, settings and fences).
  // Suppress EVERY blocking global loader while that view is mounted, including
  // explicitly-started loaders and requests that predate its first map refresh.
  const liveMapVisible = () => !!(typeof doc.querySelector === 'function' &&
    doc.querySelector('.live-map-tabs'));
  const normalize = (input) => {
    try {
      const raw = typeof input === 'string' ? input : input && input.url;
      const url = new URL(raw, win.location.href);
      return url.origin === win.location.origin ? url : null;
    } catch (_) { return null; }
  };
  function classify(input, init) {
    const url = normalize(input);
    if (!url || !url.pathname.startsWith('/api/')) return null;
    if (liveMapVisible()) return null;
    const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    if (excluded.test(url.pathname) || liveMapPolling.test(url.pathname)) return null;
    const report = reports.test(url.pathname) || fileExtensions.test(url.pathname);
    if (method !== 'GET' && !(method === 'POST' && report)) return null;
    const dashboard = method === 'GET' && dashboardData.test(url.pathname);
    return {
      title: dashboard ? 'در حال بارگذاری داشبورد' : report ? 'در حال تهیه گزارش یا خروجی' : 'در حال دریافت اطلاعات',
      stage: dashboard ? 'در حال دریافت اطلاعات کارت‌ها و تب‌های داشبورد…' : report ? 'لطفاً تا آماده‌شدن نتیجه صبر کنید…' : 'دریافت اطلاعات از سامانه در حال انجام است…',
      delay: dashboard || report ? 0 : DELAY_MS
    };
  }
  function ensureHost() {
    if (host && host.isConnected) return host;
    if (!doc.body) return null;
    host = doc.createElement('div');
    host.id = 'kh-long-operation-progress';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    host.setAttribute('aria-atomic', 'true');
    host.setAttribute('dir', 'rtl');
    host.hidden = true;
    host.innerHTML = '<div class="kh-long-operation-card"><span class="kh-long-operation-spinner" aria-hidden="true"></span><h3 data-long-title>در حال دریافت اطلاعات</h3><strong data-long-progress>در حال پردازش…</strong><progress aria-label="پیشرفت عملیات"></progress><p data-long-stage></p></div>';
    doc.body.appendChild(host);
    return host;
  }
  function workDialogActive() {
    const work = doc.getElementById('kh-work-progress');
    return !!(work && !work.hidden && work.open);
  }
  function paint() {
    const el = ensureHost();
    if (!el) return;
    if (liveMapVisible() || workDialogActive() || doc.visibilityState === 'hidden') {
      el.hidden = true;
      return;
    }
    const current = Array.from(tasks.values()).find(task => task.started);
    el.hidden = !current;
    if (!current) return;
    el.querySelector('[data-long-title]').textContent = current.title;
    el.querySelector('[data-long-stage]').textContent = current.stage;
    const bar = el.querySelector('progress');
    const label = el.querySelector('[data-long-progress]');
    if (typeof current.percent === 'number' && Number.isFinite(current.percent)) {
      const value = Math.min(100, Math.max(0, current.percent));
      bar.value = value;
      bar.max = 100;
      label.textContent = String(Math.round(value)).replace(/\d/g, x => '۰۱۲۳۴۵۶۷۸۹'[x]) + '٪';
    } else {
      bar.removeAttribute('value');
      label.textContent = 'در حال پردازش…';
    }
  }
  function begin(details, delay) {
    const id = ++seq;
    const task = { ...details, started: false, timer: null, watchdog: null };
    tasks.set(id, task);
    const wait = delay == null ? DELAY_MS : Math.max(0, delay);
    if (wait === 0) {
      task.started = true;
      paint(); // Paint before the network request or expensive React tab render begins.
    } else {
      task.timer = win.setTimeout(() => {
        if (!tasks.has(id)) return;
        task.started = true;
        paint();
      }, wait);
    }
    task.watchdog = win.setTimeout(() => end(id), MAX_WAIT_MS);
    return id;
  }
  function update(id, details) {
    const task = tasks.get(id);
    if (!task) return;
    Object.assign(task, details);
    paint();
  }
  function end(id) {
    const task = tasks.get(id);
    if (!task) return;
    win.clearTimeout(task.timer);
    win.clearTimeout(task.watchdog);
    tasks.delete(id);
    paint();
  }
  win.KhatyarLongOperation = Object.freeze({
    begin: (title, options = {}) => begin({ title: String(title || 'در حال پردازش'), stage: options.stage || 'در حال انجام عملیات…', percent: options.percent }, options.delay),
    update: (id, options) => update(id, options || {}),
    end,
    classify
  });
  // Most authenticated panel calls intentionally use the pre-captured browser
  // fetch, bypassing window.fetch. Instrument BOTH entry points without nesting.
  // Finishing at response headers is too early: tables often take much longer
  // to receive/parse the response body than to receive its HTTP status.
  function trackedFetch(native) {
    return function (input, init) {
      const detail = classify(input, init);
      if (!detail) return native.apply(this, arguments);
      const id = begin(detail, detail.delay);
      let result;
      try { result = native.apply(this, arguments); }
      catch (error) { end(id); throw error; }
      return Promise.resolve(result).then(response => {
        if (!response || !response.body || response.status === 204 || response.status === 304) {
          end(id); return response;
        }
        let consumed = false;
        const methods = ['json', 'text', 'blob', 'arrayBuffer', 'formData'];
        for (const method of methods) {
          if (typeof response[method] !== 'function') continue;
          const original = response[method].bind(response);
          try {
            Object.defineProperty(response, method, {
              configurable: true, value: function () {
                consumed = true;
                let value;
                try { value = original.apply(response, arguments); }
                catch (error) { end(id); throw error; }
                return Promise.resolve(value).finally(() => end(id));
              }
            });
          } catch (_) {} // A frozen Response is still usable; watchdog cleans up.
        }
        // A caller that inspects only HTTP status must not leave an orphan loader.
        win.setTimeout(() => { if (!consumed) end(id); }, 1600);
        return response;
      }, error => { end(id); throw error; });
    };
  }
  win.fetch = trackedFetch(nativeFetch);
  const captured = win.__KHATYAR_NATIVE_FETCH__;
  if (typeof captured === 'function' && captured !== nativeFetch) {
    win.__KHATYAR_NATIVE_FETCH__ = trackedFetch(captured);
  }
  // Some older panel modules and libraries use XMLHttpRequest instead of fetch.
  // Observe only duration; do not inspect or modify request/response payloads.
  const XHR = win.XMLHttpRequest;
  if (XHR && XHR.prototype && typeof XHR.prototype.open === 'function' && typeof XHR.prototype.send === 'function') {
    const originalOpen = XHR.prototype.open;
    const originalSend = XHR.prototype.send;
    const xhrDetails = new WeakMap();
    XHR.prototype.open = function (method, url) {
      xhrDetails.set(this, classify(url, { method }));
      return originalOpen.apply(this, arguments);
    };
    XHR.prototype.send = function () {
      const details = xhrDetails.get(this);
      if (!details) return originalSend.apply(this, arguments);
      const id = begin(details, details.delay);
      this.addEventListener('loadend', () => end(id), { once: true });
      try { return originalSend.apply(this, arguments); }
      catch (error) { end(id); throw error; }
    };
  }
  // Navigation may mount the map after a previous dashboard request has started.
  // Repaint on view changes to close that old loader immediately. Observe only
  // the React root so our own overlay updates cannot create observer loops.
  const root = doc.getElementById('root');
  if (root && typeof win.MutationObserver === 'function') {
    const navObserver = new win.MutationObserver(() => paint());
    navObserver.observe(root, { childList: true, subtree: true });
  }
  doc.addEventListener('visibilitychange', paint);
  const style = doc.createElement('style');
  style.textContent = `
.kh-login-startup{min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:16px;background:radial-gradient(circle at 90% 0%,#e6f3ec 0%,#f4f8f6 55%,#edf5f0 100%);direction:rtl;box-sizing:border-box}
.kh-login-startup .kh-long-operation-card{width:min(420px,100%)}
#kh-long-operation-progress[hidden]{display:none!important}
#kh-long-operation-progress{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:16px;background:rgba(8,33,28,.46);font:14px Vazirmatn,Tahoma,sans-serif;direction:rtl}
.kh-long-operation-card{width:min(420px,100%);max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box;background:#fff;color:#16352b;border:1px solid #d3e5dd;border-radius:22px;box-shadow:0 20px 70px #0004;padding:26px;text-align:center}
.kh-long-operation-card h3{font-size:17px;margin:13px 0}
.kh-long-operation-card strong{display:block;font-size:18px;color:#087f5b}
.kh-long-operation-card p{line-height:1.9;margin:12px 0 0}
.kh-long-operation-card progress{display:block;width:100%;height:14px;margin:14px 0 0;accent-color:#087f5b}
.kh-long-operation-spinner{display:block;width:38px;height:38px;border:4px solid #d6eae1;border-top-color:#087f5b;border-radius:50%;margin:auto;animation:khLongOperationSpin .9s linear infinite}
@keyframes khLongOperationSpin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.kh-long-operation-spinner{animation:none}}
@media(max-width:430px){.kh-long-operation-card{padding:18px;border-radius:17px}}
`;
  (doc.head || doc.documentElement).appendChild(style);
})(window, document);
