/* خطیار — بازیابی کامل دسترسی‌های بخش بی‌سیم */
(function () {
  'use strict';

  var API = '/api/admin/settings';
  var RADIO = 'radio';

  function token() { return localStorage.token || localStorage.access_token || ''; }
  function auth() { return { Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json' }; }
  function norm(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }

  function roleId() {
    try {
      var part = token().split('.')[1];
      if (part) {
        var b64 = part.replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        var p = JSON.parse(decodeURIComponent(escape(atob(b64))));
        if (p.role_id != null) return String(p.role_id);
        if (p.roleId != null) return String(p.roleId);
        if (p.role && p.role.id != null) return String(p.role.id);
      }
    } catch (e) {}
    for (var i = 0; i < 4; i++) {
      var v = localStorage.getItem(['role_id', 'roleId', 'user_role_id', 'current_role_id'][i]);
      if (v !== null && v !== '') return String(v);
    }
    return null;
  }

  function getSettings() {
    return fetch(API, { headers: auth(), cache: 'no-store' }).then(function (r) {
      return r.text().then(function (t) {
        var d = {};
        try { d = t ? JSON.parse(t) : {}; } catch (e) { throw new Error('پاسخ تنظیمات نامعتبر است'); }
        if (!r.ok) throw new Error(d.error || d.message || 'خطا در دریافت تنظیمات');
        return d;
      });
    });
  }

  function savePermission(id, enabled) {
    return getSettings().then(function (s) {
      var all = s.role_perms && typeof s.role_perms === 'object' ? s.role_perms : {};
      var key = String(id);
      var cur = Array.isArray(all[key]) ? all[key].slice() : [];
      var i = cur.indexOf(RADIO);
      if (enabled && i < 0) cur.push(RADIO);
      if (!enabled && i >= 0) cur.splice(i, 1);
      all[key] = Array.from(new Set(cur));
      return fetch(API, { method: 'PUT', headers: auth(), body: JSON.stringify({ role_perms: all }), cache: 'no-store' });
    }).then(function (r) { if (!r.ok) throw new Error('ذخیره دسترسی ناموفق بود'); });
  }

  function accessPanel() {
    var nodes = document.querySelectorAll('.panel,section,article,main,div');
    for (var i = 0; i < nodes.length; i++) {
      var t = norm(nodes[i].textContent);
      if (t.indexOf('سطح دسترسی سمت‌ها به بخش‌های سایت') >= 0) return nodes[i];
    }
    return null;
  }

  function roleSelect(panel) {
    if (!panel) return null;
    var selects = panel.querySelectorAll('select');
    for (var i = 0; i < selects.length; i++) if (selects[i].options && selects[i].options.length) return selects[i];
    return null;
  }

  function addSiteRow(panel, select, key, labelText) {
    var row = panel.querySelector('[data-khatyar-site-radio-row="' + key + '"]');
    if (row) return row;
    row = document.createElement('label');
    row.setAttribute('data-khatyar-site-radio-row', key);
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 2px;margin-top:5px;border-bottom:1px solid #e4e7ec;font-size:13px;cursor:pointer;';
    var span = document.createElement('span');
    span.textContent = labelText;
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    row.appendChild(span); row.appendChild(cb);
    panel.appendChild(row);

    cb.addEventListener('change', function () {
      if (!select.value) { cb.checked = false; return; }
      savePermission(select.value, cb.checked).catch(function () {
        cb.checked = !cb.checked;
        alert('ذخیره دسترسی بی‌سیم ناموفق بود.');
      });
    });
    return row;
  }

  function syncSiteAccess() {
    var panel = accessPanel();
    var select = roleSelect(panel);
    if (!panel || !select) return;
    var center = addSiteRow(panel, select, 'center', '📻 مرکز بی‌سیم (شنود کانال‌ها)');
    var settings = addSiteRow(panel, select, 'settings', '⚙️ تنظیمات بی‌سیم (مدیریت کانال‌ها)');
    if (!select.value) return;
    getSettings().then(function (s) {
      var p = s.role_perms && Array.isArray(s.role_perms[String(select.value)]) ? s.role_perms[String(select.value)] : [];
      var on = p.indexOf(RADIO) >= 0;
      center.querySelector('input').checked = on;
      settings.querySelector('input').checked = on;
      center.style.display = 'flex';
      settings.style.display = 'flex';
    }).catch(function () {
      center.style.display = 'flex';
      settings.style.display = 'flex';
    });
    if (!select.dataset.khatyarRadioSiteBound) {
      select.dataset.khatyarRadioSiteBound = '1';
      select.addEventListener('change', function () { setTimeout(syncSiteAccess, 30); });
    }
  }

  function sidebar() { return document.querySelector('.nav') || document.querySelector('nav[role="navigation"]') || document.querySelector('aside nav') || document.querySelector('aside'); }

  function ensureMenu(nav, key, text, href) {
    var x = nav.querySelector('[data-khatyar-radio-menu="' + key + '"]');
    if (x) return x;
    x = document.createElement('a');
    x.href = href;
    x.setAttribute('data-khatyar-radio-menu', key);
    x.dataset.view = 'radio';
    x.dataset.key = RADIO;
    x.textContent = text;
    x.style.cssText = 'display:block;padding:10px 12px;margin:2px 0;border-radius:8px;color:inherit;text-decoration:none;font:inherit;';
    var s = Array.prototype.find.call(nav.querySelectorAll('a,button'), function (el) { return norm(el.textContent) === 'تنظیمات'; });
    if (s && s.parentNode) s.parentNode.insertBefore(x, s); else nav.appendChild(x);
    return x;
  }

  function syncSidebar() {
    var nav = sidebar();
    if (!nav) return;
    var center = ensureMenu(nav, 'center', '📻 مرکز بی‌سیم', 'radio-admin.html');
    var settings = ensureMenu(nav, 'settings', '⚙️ تنظیمات بی‌سیم', 'radio-admin.html#settings');
    var rid = roleId();
    if (rid == null) { center.style.display = 'block'; settings.style.display = 'block'; return; }
    getSettings().then(function (s) {
      var p = s.role_perms && Array.isArray(s.role_perms[String(rid)]) ? s.role_perms[String(rid)] : [];
      var allowed = p.indexOf(RADIO) >= 0;
      center.style.display = allowed ? 'block' : 'none';
      settings.style.display = allowed ? 'block' : 'none';
    }).catch(function () {
      center.style.display = 'block';
      settings.style.display = 'block';
    });
  }

  function run() { syncSiteAccess(); syncSidebar(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(run, 300); });
  else setTimeout(run, 300);

  var timer = 0;
  new MutationObserver(function () {
    if (timer) return;
    timer = setTimeout(function () { timer = 0; run(); }, 180);
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
