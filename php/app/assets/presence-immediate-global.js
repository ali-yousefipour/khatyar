/* خطیار — صحت‌سنجی حضور فوری: ورودی مستقل و پایدار در پنل */
(function () {
  'use strict';

  var API = 'api/presence-immediate-api.php';

  function token() { return localStorage.token || localStorage.access_token || ''; }
  function auth() { return { Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json' }; }
  function norm(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
  function fa(v) { return String(v == null ? '' : v).replace(/[0-9]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(Number(d)); }); }

  function request(url, options) {
    return fetch(url, Object.assign({ headers: auth(), cache: 'no-store' }, options || {})).then(function (r) {
      return r.text().then(function (t) {
        var d = {};
        try { d = t ? JSON.parse(t) : {}; } catch (e) { throw new Error('پاسخ نامعتبر سرور'); }
        if (!r.ok || d.ok === false) throw new Error(d.error || d.message || 'خطای سرور');
        return d;
      });
    });
  }

  function sidebarRoot() {
    return document.querySelector('.nav') || document.querySelector('nav[role="navigation"]') || document.querySelector('aside nav') || document.querySelector('aside');
  }

  function ensureSidebar() {
    var nav = sidebarRoot();
    if (!nav || nav.querySelector('[data-khatyar-immediate-link]')) return;
    var link = document.createElement('a');
    link.href = '#khatyar-immediate-presence';
    link.setAttribute('data-khatyar-immediate-link', '1');
    link.dataset.key = 'presence-immediate';
    link.textContent = '⚡ ارسال صحت‌سنجی فوری';
    link.style.cssText = 'display:block;padding:10px 12px;margin:2px 0;border-radius:8px;color:inherit;text-decoration:none;font:inherit;';
    nav.appendChild(link);
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var card = document.getElementById('khatyar-immediate-presence');
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function findHost() {
    var nodes = document.querySelectorAll('.panel,section,article,main');
    for (var i = 0; i < nodes.length; i++) {
      var t = norm(nodes[i].textContent);
      if (t.indexOf('صحت‌سنجی حضور') >= 0 || t.indexOf('صحت سنجی حضور') >= 0) return nodes[i];
    }
    return document.querySelector('#root') || document.body;
  }

  function createCard() {
    if (document.getElementById('khatyar-immediate-presence')) return;
    var host = findHost();
    if (!host) return;

    var card = document.createElement('section');
    card.id = 'khatyar-immediate-presence';
    card.className = 'panel khatyar-immediate-presence-fallback';
    card.dir = 'rtl';
    card.style.cssText = 'margin:14px 0;padding:16px;border:1px solid #f0c36a;border-radius:16px;background:#fffdf5;';
    card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div><h3 style="margin:0 0 5px">⚡ ارسال صحت‌سنجی حضور فوری</h3><div style="font-size:12px;color:#667085">درخواست همین لحظه برای نیروهای انتخاب‌شده ارسال می‌شود.</div></div><span data-pim-count style="font-size:12px;font-weight:700"></span></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-top:12px"><label style="font-size:12px;font-weight:700">دامنه ارسال<select data-pim-scope style="display:block;width:100%;box-sizing:border-box;margin-top:4px;padding:9px;border:1px solid #d7dde7;border-radius:9px;font:inherit"><option value="all">کل نیروهای فعال</option><option value="role">یک سمت</option><option value="users">اشخاص انتخابی</option></select></label><label data-pim-role-wrap hidden style="font-size:12px;font-weight:700">سمت<select data-pim-role style="display:block;width:100%;box-sizing:border-box;margin-top:4px;padding:9px;border:1px solid #d7dde7;border-radius:9px;font:inherit"></select></label></div><div data-pim-users-wrap hidden style="margin-top:10px"><input data-pim-search placeholder="جستجوی نام، نام خانوادگی یا کد کاربری" autocomplete="off" style="display:block;width:100%;box-sizing:border-box;padding:9px;border:1px solid #d7dde7;border-radius:9px;font:inherit"><div data-pim-users style="max-height:220px;overflow:auto;margin-top:7px;border:1px solid #edf0f4;border-radius:9px;background:#fff"></div></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button type="button" data-pim-send style="border:0;border-radius:9px;padding:10px 15px;background:#d92d20;color:#fff;font:inherit;font-weight:700;cursor:pointer">ارسال فوری صحت‌سنجی</button><button type="button" data-pim-refresh style="border:0;border-radius:9px;padding:10px 15px;background:#eef2f6;font:inherit;cursor:pointer">به‌روزرسانی فهرست</button></div><div data-pim-msg style="font-size:12px;margin-top:8px"></div>';
    host.appendChild(card);
    bind(card);
    load(card);
  }

  function bind(card) {
    card.querySelector('[data-pim-scope]').addEventListener('change', function () { toggle(card); updateCount(card); });
    card.querySelector('[data-pim-role]').addEventListener('change', function () { updateCount(card); });
    card.querySelector('[data-pim-search]').addEventListener('input', function () { renderUsers(card); });
    card.querySelector('[data-pim-refresh]').addEventListener('click', function () { load(card); });
    card.querySelector('[data-pim-send]').addEventListener('click', function () { send(card); });
  }

  function toggle(card) {
    var scope = card.querySelector('[data-pim-scope]').value;
    card.querySelector('[data-pim-role-wrap]').hidden = scope !== 'role';
    card.querySelector('[data-pim-users-wrap]').hidden = scope !== 'users';
  }

  function load(card) {
    setMsg(card, 'در حال بارگذاری فهرست نیروها…', false);
    request(API + '?op=targets&_=' + Date.now()).then(function (data) {
      card._khatyarData = data;
      var role = card.querySelector('[data-pim-role]');
      role.innerHTML = '<option value="">انتخاب سمت</option>' + (data.roles || []).map(function (r) { return '<option value="' + String(r.id) + '">' + esc(r.title) + '</option>'; }).join('');
      renderUsers(card);
      updateCount(card);
      setMsg(card, 'فهرست با موفقیت بارگذاری شد.', true);
    }).catch(function (e) { setMsg(card, e.message || 'خطا در بارگذاری', false); });
  }

  function renderUsers(card) {
    var d = card._khatyarData;
    if (!d) return;
    var q = norm(card.querySelector('[data-pim-search]').value).toLowerCase();
    var rows = (d.users || []).filter(function (u) {
      var s = norm((u.first_name || '') + ' ' + (u.last_name || '') + ' ' + (u.username || '')).toLowerCase();
      return !q || s.indexOf(q) >= 0;
    });
    card.querySelector('[data-pim-users]').innerHTML = rows.map(function (u) {
      return '<label style="display:flex;gap:8px;align-items:center;padding:8px 10px;border-bottom:1px solid #f0f2f5;font-size:12px"><input type="checkbox" value="' + String(u.id) + '"><span>' + esc((u.first_name || '') + ' ' + (u.last_name || '')) + '<small style="display:block;color:#667085">' + esc(u.role_title || 'بدون سمت') + '</small></span></label>';
    }).join('') || '<div style="padding:12px;color:#667085">موردی پیدا نشد.</div>';
    card.querySelectorAll('[data-pim-users] input').forEach(function (x) { x.addEventListener('change', function () { updateCount(card); }); });
  }

  function selected(card) { return Array.prototype.map.call(card.querySelectorAll('[data-pim-users] input:checked'), function (x) { return Number(x.value); }).filter(Boolean); }

  function updateCount(card) {
    var d = card._khatyarData;
    if (!d) return;
    var scope = card.querySelector('[data-pim-scope]').value;
    var count = 0;
    if (scope === 'all') count = (d.users || []).length;
    if (scope === 'role') {
      var rid = Number(card.querySelector('[data-pim-role]').value || 0);
      count = (d.users || []).filter(function (u) { return Number(u.role_id) === rid; }).length;
    }
    if (scope === 'users') count = selected(card).length;
    card.querySelector('[data-pim-count]').textContent = count ? 'تعداد هدف: ' + fa(count) : '';
  }

  function send(card) {
    var d = card._khatyarData;
    if (!d) return;
    var scope = card.querySelector('[data-pim-scope]').value;
    var roleId = Number(card.querySelector('[data-pim-role]').value || 0);
    var users = selected(card);
    var count = scope === 'all' ? (d.users || []).length : scope === 'role' ? (d.users || []).filter(function (u) { return Number(u.role_id) === roleId; }).length : users.length;
    if (scope === 'role' && !roleId) { setMsg(card, 'سمت انتخاب نشده است.', false); return; }
    if (!count) { setMsg(card, 'هیچ فردی برای ارسال انتخاب نشده است.', false); return; }
    if (!window.confirm('ارسال صحت‌سنجی فوری برای ' + fa(count) + ' نفر انجام شود؟')) return;
    var body = JSON.stringify({ scope: scope, role_id: roleId, user_ids: users });
    request(API + '?op=send&_=' + Date.now(), { method: 'POST', body: body }).then(function (x) {
      setMsg(card, 'درخواست فوری ارسال شد؛ ' + fa(x.sent || 0) + ' نفر Push دریافت خواهند کرد.', true);
    }).catch(function (e) { setMsg(card, e.message || 'ارسال ناموفق بود.', false); });
  }

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function setMsg(card, text, ok) { var node = card.querySelector('[data-pim-msg]'); if (node) { node.textContent = text || ''; node.style.color = ok ? '#0d7a5f' : '#b42318'; } }

  function run() { ensureSidebar(); createCard(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(run, 700); });
  else setTimeout(run, 700);

  var timer = 0;
  new MutationObserver(function () {
    if (timer) return;
    timer = setTimeout(function () { timer = 0; run(); }, 200);
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
