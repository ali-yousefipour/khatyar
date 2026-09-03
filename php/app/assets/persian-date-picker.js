/* خطیار — DatePicker شمسی یکپارچه و دقیق
 * - تقویم جلالی واقعی با تبدیل جلالی/میلادی
 * - چیدمان صحیح شنبه تا جمعه در RTL
 * - محاسبه طول ماه بر اساس تبدیل واقعی، بدون چرخه ۳۳ ساله تقریبی
 * - نمایش فارسی ماه، روز و سال
 * - انتخاب ماه و سال از داخل هدر
 * - پشتیبانی از input[type=date] و فیلدهای تاریخ شمسی/پویا
 * - بدون وابستگی خارجی
 */
(function () {
  'use strict';

  var TZ = 'Asia/Tehran';
  var WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  var MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  var active = null;

  function div(a, b) { return Math.floor(a / b); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function fa(v) { return String(v).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); }
  function en(v) { return String(v == null ? '' : v).replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); }); }

  function g2j(gy, gm, gd) {
    var gdm = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var gy2 = gm > 2 ? gy + 1 : gy;
    var days = 355666 + 365 * gy + div(gy2 + 3, 4) - div(gy2 + 99, 100) + div(gy2 + 399, 400) + gd;
    for (var i = 1; i < gm; i++) days += gdm[i];
    var jy = -1595 + 33 * div(days, 12053);
    days %= 12053;
    jy += 4 * div(days, 1461);
    days %= 1461;
    if (days > 365) {
      jy += div(days - 1, 365);
      days = (days - 1) % 365;
    }
    var jm = days < 186 ? 1 + div(days, 31) : 7 + div(days - 186, 30);
    var jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
    return [jy, jm, jd];
  }

  function j2g(jy, jm, jd) {
    var jy2 = jy + 1595;
    var days = -355668 + 365 * jy2 + div(jy2, 33) * 8 + div((jy2 % 33) + 3, 4) + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
    var gy = 400 * div(days, 146097);
    days %= 146097;
    if (days > 36524) {
      gy += 100 * div(--days, 36524);
      days %= 36524;
      if (days >= 365) days++;
    }
    gy += 4 * div(days, 1461);
    days %= 1461;
    if (days > 365) {
      gy += div(days - 1, 365);
      days = (days - 1) % 365;
    }
    var gd = days + 1;
    var leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
    var md = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var gm = 1;
    while (gd > md[gm]) gd -= md[gm++];
    return [gy, gm, gd];
  }

  function jToIso(y, m, d) {
    var g = j2g(y, m, d);
    return g[0] + '-' + pad(g[1]) + '-' + pad(g[2]);
  }

  function isoToJ(v) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v || '')) return null;
    var p = v.split('-').map(Number);
    return g2j(p[0], p[1], p[2]);
  }

  function tehranToday() {
    var p = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    var y = +p.find(function (x) { return x.type === 'year'; }).value;
    var m = +p.find(function (x) { return x.type === 'month'; }).value;
    var d = +p.find(function (x) { return x.type === 'day'; }).value;
    return g2j(y, m, d);
  }

  function monthLength(y, m) {
    var nextY = m === 12 ? y + 1 : y;
    var nextM = m === 12 ? 1 : m + 1;
    var a = j2g(y, m, 1);
    var b = j2g(nextY, nextM, 1);
    return Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86400000);
  }

  // Saturday = 0 ... Friday = 6.
  function firstWeekday(y, m) {
    var g = j2g(y, m, 1);
    var w = new Date(Date.UTC(g[0], g[1] - 1, g[2], 12)).getUTCDay(); // Sunday=0
    return (w + 1) % 7;
  }

  function addCss() {
    if (document.getElementById('kh-jdp-css-v3')) return;
    var s = document.createElement('style');
    s.id = 'kh-jdp-css-v3';
    s.textContent = `
      .kh-jdp-wrap{position:relative;display:inline-block;width:100%;max-width:100%;font-family:Vazirmatn,Tahoma,sans-serif}
      .kh-jdp-text{direction:rtl;width:100%;height:40px;box-sizing:border-box;border:1px solid #d8dee8;border-radius:10px;padding:8px 40px 8px 38px;font:500 13px Vazirmatn,Tahoma,sans-serif;background:#fff;color:#1d2939;cursor:pointer;outline:none;transition:.18s;box-shadow:0 1px 2px rgba(16,24,40,.04)}
      .kh-jdp-text:hover{border-color:#98a2b3}.kh-jdp-text:focus{border-color:#0d7a5f;box-shadow:0 0 0 3px rgba(13,122,95,.10)}
      .kh-jdp-wrap:before{content:'▣';position:absolute;right:13px;top:10px;color:#0d7a5f;font-size:15px;z-index:2;pointer-events:none}
      .kh-jdp-wrap:after{content:'⌄';position:absolute;left:13px;top:9px;color:#667085;font-size:16px;z-index:2;pointer-events:none}
      .kh-jdp{position:absolute;z-index:2147483000;top:calc(100% + 7px);right:0;width:330px;max-width:calc(100vw - 24px);background:#fff;border:1px solid #e4e7ec;border-radius:16px;box-shadow:0 20px 55px rgba(16,24,40,.18);padding:13px;direction:rtl;box-sizing:border-box;animation:khJdpIn .12s ease-out}
      @keyframes khJdpIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
      .kh-jdp-head{display:grid;grid-template-columns:36px 1fr 36px;align-items:center;gap:7px;margin-bottom:9px}
      .kh-jdp-nav,.kh-jdp-head select{height:34px;border:1px solid #e4e7ec;background:#f8fafc;border-radius:9px;color:#344054;font-family:inherit;cursor:pointer}
      .kh-jdp-nav{font-size:20px;line-height:1}.kh-jdp-nav:hover{background:#eef7f3;color:#0d7a5f}
      .kh-jdp-title{display:flex;justify-content:center;align-items:center;gap:6px}
      .kh-jdp-title select{min-width:92px;padding:0 7px;font-size:12px;font-weight:800}
      .kh-jdp-title select.year{min-width:72px}
      .kh-jdp-week,.kh-jdp-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
      .kh-jdp-week{border-bottom:1px solid #eef0f3;padding-bottom:5px;margin-bottom:5px}
      .kh-jdp-week div{text-align:center;font-size:10px;font-weight:700;color:#667085;padding:5px 1px}
      .kh-jdp-day{min-width:0;height:35px;border:0;background:#fff;border-radius:9px;padding:0;cursor:pointer;font:500 11px Vazirmatn,Tahoma,sans-serif;color:#344054;transition:.12s}
      .kh-jdp-day:hover{background:#eef7f3;color:#0d7a5f;transform:translateY(-1px)}
      .kh-jdp-day.empty{pointer-events:none;background:transparent}.kh-jdp-day.today{box-shadow:inset 0 0 0 1px #0d7a5f;color:#0d7a5f;font-weight:800}.kh-jdp-day.sel{background:#0d7a5f;color:#fff;font-weight:800;box-shadow:0 3px 8px rgba(13,122,95,.22)}
      .kh-jdp-actions{display:flex;justify-content:space-between;align-items:center;gap:7px;margin-top:10px;padding-top:9px;border-top:1px solid #eef0f3}
      .kh-jdp-actions button{border:0;border-radius:9px;padding:7px 11px;font:600 10px Vazirmatn,Tahoma,sans-serif;cursor:pointer}.kh-jdp-actions .clear{background:#fff1f0;color:#b42318}.kh-jdp-actions .today{background:#eef7f3;color:#176b3a}.kh-jdp-actions button:hover{filter:brightness(.97)}
      @media(max-width:480px){.kh-jdp{width:320px;right:50%;transform:translateX(50%)}.kh-jdp-text{height:42px}.kh-jdp-day{height:34px}}
    `;
    document.head.appendChild(s);
  }

  function close() {
    if (active) { active.remove(); active = null; }
  }

  function yearsAround(y) {
    var out = [];
    for (var i = y - 80; i <= y + 20; i++) out.push(i);
    return out;
  }

  function render(input, wrap, cal) {
    var current = isoToJ(input.value) || tehranToday();
    var y = current[0], m = current[1];
    var selected = isoToJ(input.value);
    var today = tehranToday();

    function draw() {
      var len = monthLength(y, m);
      var first = firstWeekday(y, m);
      var yearOptions = yearsAround(y).map(function (yy) { return '<option value="' + yy + '"' + (yy === y ? ' selected' : '') + '>' + fa(yy) + '</option>'; }).join('');
      var monthOptions = MONTHS.map(function (name, i) { var mm = i + 1; return '<option value="' + mm + '"' + (mm === m ? ' selected' : '') + '>' + name + '</option>'; }).join('');

      var cells = [];
      for (var e = 0; e < first; e++) cells.push('<button type="button" class="kh-jdp-day empty" tabindex="-1"></button>');
      for (var d = 1; d <= len; d++) {
        var iso = jToIso(y, m, d);
        var sel = selected && selected[0] === y && selected[1] === m && selected[2] === d;
        var tod = today[0] === y && today[1] === m && today[2] === d;
        cells.push('<button type="button" class="kh-jdp-day' + (sel ? ' sel' : '') + (tod ? ' today' : '') + '" data-d="' + d + '">' + fa(d) + '</button>');
      }

      cal.innerHTML = '<div class="kh-jdp-head">' +
        '<button type="button" class="kh-jdp-nav" data-prev aria-label="ماه قبل">‹</button>' +
        '<div class="kh-jdp-title"><select class="month" aria-label="ماه">' + monthOptions + '</select><select class="year" aria-label="سال">' + yearOptions + '</select></div>' +
        '<button type="button" class="kh-jdp-nav" data-next aria-label="ماه بعد">›</button>' +
        '</div>' +
        '<div class="kh-jdp-week">' + WEEKDAYS.map(function (x) { return '<div>' + x + '</div>'; }).join('') + '</div>' +
        '<div class="kh-jdp-grid">' + cells.join('') + '</div>' +
        '<div class="kh-jdp-actions"><button type="button" class="clear">پاک کردن</button><button type="button" class="today">امروز</button></div>';
    }

    cal.addEventListener('change', function (e) {
      if (e.target.matches('select.month')) { m = +e.target.value; draw(); }
      if (e.target.matches('select.year')) { y = +e.target.value; draw(); }
    });
    cal.addEventListener('click', function (e) {
      if (e.target.closest('[data-prev]')) { m--; if (m < 1) { m = 12; y--; } draw(); return; }
      if (e.target.closest('[data-next]')) { m++; if (m > 12) { m = 1; y++; } draw(); return; }
      var db = e.target.closest('[data-d]');
      if (db) {
        var d = +db.dataset.d;
        input.value = jToIso(y, m, d);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        syncText(input, wrap);
        close();
        return;
      }
      if (e.target.closest('.clear')) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        syncText(input, wrap); close(); return;
      }
      if (e.target.closest('.today')) {
        var t = tehranToday();
        input.value = jToIso(t[0], t[1], t[2]);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        syncText(input, wrap); close();
      }
    });
    draw();
  }

  function syncText(input, wrap) {
    var j = isoToJ(input.value);
    var text = wrap.querySelector('.kh-jdp-text');
    if (text) text.value = j ? fa(j[0]) + '/' + fa(pad(j[1])) + '/' + fa(pad(j[2])) : '';
  }

  function install(input) {
    if (!input || input.dataset.khJdp) return;
    if (input.disabled || input.readOnly && input.type !== 'date') return;
    input.dataset.khJdp = '1';
    input.setAttribute('data-original-type', input.type);
    var originalName = input.getAttribute('name');
    var originalId = input.id;
    input.type = 'hidden';

    var wrap = document.createElement('span');
    wrap.className = 'kh-jdp-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    var text = document.createElement('input');
    text.type = 'text';
    text.className = 'kh-jdp-text';
    text.autocomplete = 'off';
    text.readOnly = true;
    text.setAttribute('aria-label', 'انتخاب تاریخ شمسی');
    if (originalName) text.removeAttribute('name');
    if (originalId) text.dataset.for = originalId;
    syncText(input, wrap);
    text.placeholder = 'انتخاب تاریخ شمسی';
    wrap.insertBefore(text, input);

    text.addEventListener('click', function (e) {
      e.stopPropagation();
      close();
      var cal = document.createElement('div');
      cal.className = 'kh-jdp';
      wrap.appendChild(cal);
      active = cal;
      render(input, wrap, cal);
    });
  }

  function looksLikeDateInput(el) {
    if (!el || el.tagName !== 'INPUT') return false;
    if (el.dataset.khJdp) return false;
    if (el.type === 'date') return true;
    if (el.dataset.jalaliDate !== undefined || el.dataset.datePicker === 'jalali') return true;
    var hay = ((el.name || '') + ' ' + (el.id || '') + ' ' + (el.placeholder || '') + ' ' + (el.getAttribute('aria-label') || '')).toLowerCase();
    return /تاریخ|date|from_date|to_date|start_date|end_date|date_from|date_to/.test(hay);
  }

  function scan(root) {
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('input').forEach(function (el) { if (looksLikeDateInput(el)) install(el); });
  }

  window.KhatyarJalaliDate = { toJalali: isoToJ, toGregorian: jToIso, timezone: TZ, version: '3.0.0' };
  window.KhatyarJalaliDatepicker = { install: install, scan: scan };

  document.addEventListener('click', function (e) {
    if (active && !e.target.closest('.kh-jdp') && !e.target.closest('.kh-jdp-text')) close();
  });

  function boot() {
    addCss();
    scan(document);
    [300, 1000, 2500, 5000].forEach(function (ms) { setTimeout(function () { scan(document); }, ms); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  new MutationObserver(function (records) {
    records.forEach(function (r) { r.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n); }); });
  }).observe(document.documentElement, { subtree: true, childList: true });
})();