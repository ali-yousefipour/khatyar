/* خطیار — مدیریت آیتم‌های اپ بر اساس سمت، نسخه پایدار بدون monkey-patch React */
(function () {
  'use strict';

  var API = '/api/unified-role-app-items.php';
  var ITEMS = [
    ['Search', 'جستجوی تاکسی و تاکسیران'],
    ['PresentList', 'حاضرین در خط'],
    ['Reports', 'ارسال گزارش'],
    ['CheckIn', 'ثبت حضور من'],
    ['Requests', 'درخواست‌ها'],
    ['RequestInbox', 'تأیید درخواست‌ها'],
    ['WorkSummary', 'کارکرد من'],
    ['CustomFields', 'اطلاعات تکمیلی'],
    ['Sms', 'ارسال پیامک'],
    ['BotMessages', 'ارسال پیام در ربات‌ها'],
    ['TempDrivers', 'رانندگان موقت خطوط ویژه'],
    ['MySms', 'پیامک‌های ارسالی من'],
    ['Forms', 'تکمیل فرم‌ها'],
    ['OfficialPresence', 'حضور مسئولین در خط'],
    ['InboxReports', 'گزارشات دریافتی'],
    ['ActivityReport', 'پرکار/کم‌کار هر خط'],
    ['ExpInsurance', 'بیمه و معاینه خودروها'],
    ['ExpTaxi', 'افراد فاقد اعتبار'],
    ['ExpOplic', 'خودرو فاقد بهره‌برداری'],
    ['TeamReport', 'زیرمجموعه من'],
    ['Outage', 'اعلام قطع سیستم نوبت‌دهی'],
    ['CompanyRequests', 'ارسال برای شرکت'],
    ['Cultural', 'فعالیت‌های فرهنگی'],
    ['Welfare', 'ثبت رفاهیات'],
    ['SalarySlips', 'فیش حقوقی'],
    ['Inventory', 'اقلام تحویلی'],
    ['LineLocation', 'ثبت موقعیت خطوط'],
    ['StationCapture', 'ثبت موقعیت و تصویر خطوط'],
    ['MyStations', 'ایستگاه‌های ثبت‌شده من'],
    ['LineVisitProgram', 'برنامه بازدید خطوط'],
    ['RadioAdmin', 'تنظیمات بی‌سیم (مدیریت کانال‌ها)'],
    ['RadioCenter', 'مرکز بی‌سیم (شنود کانال‌ها)']
  ];

  function token() {
    return localStorage.token || localStorage.access_token || '';
  }

  function api(options) {
    var opts = options || {};
    var headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token() };
    var extra = opts.headers || {};
    Object.keys(extra).forEach(function (k) { headers[k] = extra[k]; });
    return fetch(API, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body,
      cache: 'no-store'
    }).then(function (r) {
      return r.text().then(function (text) {
        var d = {};
        try { d = text ? JSON.parse(text) : {}; } catch (e) { throw new Error('پاسخ نامعتبر سرور'); }
        if (!r.ok) throw new Error(d.error || d.message || 'خطای سرور');
        return d;
      });
    });
  }

  function norm(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function findHost() {
    var nodes = document.querySelectorAll('.panel, section, article, main, div');
    var i;
    for (i = 0; i < nodes.length; i++) {
      var text = norm(nodes[i].textContent);
      if (text.indexOf('آیتم‌های قابل نمایش اپ بر اساس سمت') >= 0) return nodes[i];
    }
    for (i = 0; i < nodes.length; i++) {
      var text2 = norm(nodes[i].textContent);
      if (text2.indexOf('دسترسی سمت') >= 0 && text2.length < 6000) return nodes[i];
    }
    return null;
  }

  function findRoleSelect(host) {
    if (!host) return null;
    var selects = host.querySelectorAll('select');
    var i;
    for (i = 0; i < selects.length; i++) {
      if (selects[i].options && selects[i].options.length) return selects[i];
    }
    return null;
  }

  function setMsg(box, text, ok) {
    var msg = box.querySelector('[data-kh-radio-msg]');
    if (!msg) return;
    msg.textContent = text || '';
    msg.style.color = ok ? '#0d7a5f' : '#b42318';
  }

  function buildRadioSection(host) {
    if (!host || host.querySelector('[data-khatyar-radio-app-access]')) return;
    var sel = findRoleSelect(host);
    if (!sel) return;

    var box = document.createElement('section');
    box.setAttribute('data-khatyar-radio-app-access', '1');
    box.style.cssText = 'margin-top:14px;padding:14px;border:1px solid #dfe5ec;border-radius:12px;background:#fff;';

    var title = document.createElement('h4');
    title.textContent = '📻 دسترسی‌های بی‌سیم';
    title.style.cssText = 'margin:0 0 6px;font-size:14px;';
    box.appendChild(title);

    var note = document.createElement('div');
    note.textContent = 'برای هر سمت مشخص کنید «تنظیمات بی‌سیم» و «مرکز بی‌سیم» در اپ نمایش داده شوند یا خیر.';
    note.style.cssText = 'font-size:12px;color:#667085;margin-bottom:10px;';
    box.appendChild(note);

    var checks = {};
    [
      ['RadioAdmin', 'تنظیمات بی‌سیم (مدیریت کانال‌ها)'],
      ['RadioCenter', 'مرکز بی‌سیم (شنود کانال‌ها)']
    ].forEach(function (item) {
      var label = document.createElement('label');
      label.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 2px;border-bottom:1px solid #eef1f5;cursor:pointer;font-size:13px;';
      var span = document.createElement('span');
      span.textContent = item[1];
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      label.appendChild(span);
      label.appendChild(cb);
      box.appendChild(label);
      checks[item[0]] = cb;
    });

    var actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap;';
    var save = document.createElement('button');
    save.type = 'button';
    save.className = 'btn p';
    save.textContent = 'ذخیره دسترسی‌های بی‌سیم';
    var msg = document.createElement('span');
    msg.setAttribute('data-kh-radio-msg', '1');
    msg.style.cssText = 'font-size:12px;';
    actions.appendChild(save);
    actions.appendChild(msg);
    box.appendChild(actions);

    function load() {
      if (!sel.value) return;
      api().then(function (d) {
        var cfg = d.config && typeof d.config === 'object' ? d.config : {};
        var arr = Array.isArray(cfg[String(sel.value)]) ? cfg[String(sel.value)] : ITEMS.map(function (x) { return x[0]; });
        checks.RadioAdmin.checked = arr.indexOf('RadioAdmin') >= 0;
        checks.RadioCenter.checked = arr.indexOf('RadioCenter') >= 0;
      }).catch(function (e) {
        setMsg(box, e.message || 'بارگذاری ناموفق بود', false);
      });
    }

    save.addEventListener('click', function () {
      if (!sel.value) {
        setMsg(box, 'ابتدا یک سمت را انتخاب کنید.', false);
        return;
      }
      save.disabled = true;
      api().then(function (d) {
        var cfg = d.config && typeof d.config === 'object' ? d.config : {};
        var key = String(sel.value);
        var current = Array.isArray(cfg[key]) ? cfg[key].slice() : ITEMS.map(function (x) { return x[0]; });
        ['RadioAdmin', 'RadioCenter'].forEach(function (name) {
          var idx = current.indexOf(name);
          if (checks[name].checked && idx < 0) current.push(name);
          if (!checks[name].checked && idx >= 0) current.splice(idx, 1);
        });
        cfg[key] = Array.from(new Set(current));
        return api({ method: 'POST', body: JSON.stringify({ config: cfg }) });
      }).then(function () {
        setMsg(box, '✓ تنظیمات بی‌سیم ذخیره شد', true);
      }).catch(function (e) {
        setMsg(box, e.message || 'ذخیره ناموفق بود', false);
      }).finally(function () {
        save.disabled = false;
      });
    });

    sel.addEventListener('change', load);
    host.appendChild(box);
    load();
  }

  function run() {
    buildRadioSection(findHost());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }

  if (document.documentElement) {
    var timer = 0;
    new MutationObserver(function () {
      if (timer) return;
      timer = setTimeout(function () {
        timer = 0;
        run();
      }, 120);
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
