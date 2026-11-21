/* Shared long-operation feedback for the administrative web shell.
 * The work-report progress dialog remains authoritative for its own job.
 * Never fabricate a percentage for requests without server progress data.
 */
(function (win, doc) {
  'use strict';
  if (!win || !doc || win.KhatyarLongOperation) return;
  const nativeFetch = win.fetch;
  if (typeof nativeFetch !== 'function') return;
  const DELAY_MS = 1400;
  const tasks = new Map();
  let seq = 0;
  let host = null;

  const excluded = /\/(?:health|auth\/me|session\/(?:renew|me)|radio|presence\/live|notifications?|ping|heartbeat)(?:\/|$)/i;
  const reports = /(?:export|download|report|excel|xlsx|csv|pdf|print|backup|statement|صورت.?وضعیت|گزارش)/i;
  const fileExtensions = /\.(?:xlsx?|csv|pdf)(?:$|\?)/i;
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
    const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    if (excluded.test(url.pathname)) return null;
    const report = reports.test(url.pathname) || fileExtensions.test(url.pathname);
    if (method !== 'GET' && !(method === 'POST' && report)) return null;
    return {
      title: report ? 'در حال تهیه گزارش یا خروجی' : 'در حال دریافت اطلاعات',
      stage: report ? 'لطفاً تا آماده‌شدن نتیجه صبر کنید…' : 'دریافت اطلاعات از سامانه در حال انجام است…'
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
    if (workDialogActive() || doc.visibilityState === 'hidden') {
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
    const task = { ...details, started: false, timer: null };
    tasks.set(id, task);
    task.timer = win.setTimeout(() => {
      if (!tasks.has(id)) return;
      task.started = true;
      paint();
    }, delay == null ? DELAY_MS : Math.max(0, delay));
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
    tasks.delete(id);
    paint();
  }
  win.KhatyarLongOperation = Object.freeze({
    begin: (title, options = {}) => begin({ title: String(title || 'در حال پردازش'), stage: options.stage || 'در حال انجام عملیات…', percent: options.percent }, options.delay),
    update: (id, options) => update(id, options || {}),
    end,
    classify
  });
  win.fetch = function (input, init) {
    const detail = classify(input, init);
    if (!detail) return nativeFetch.apply(this, arguments);
    const id = begin(detail);
    let request;
    try { request = nativeFetch.apply(this, arguments); }
    catch (error) { end(id); throw error; }
    return Promise.resolve(request).then(
      result => { end(id); return result; },
      error => { end(id); throw error; }
    );
  };
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
      const id = begin(details);
      this.addEventListener('loadend', () => end(id), { once: true });
      try { return originalSend.apply(this, arguments); }
      catch (error) { end(id); throw error; }
    };
  }
  doc.addEventListener('visibilitychange', paint);
  const style = doc.createElement('style');
  style.textContent = `
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
