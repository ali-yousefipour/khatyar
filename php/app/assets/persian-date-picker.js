/* خطیار — DatePicker شمسی سراسری v4.0.0
 * یک پیاده‌سازی واحد برای کل پنل مدیریت.
 *
 * قرارداد داده:
 * - UI: جلالی/شمسی با ارقام فارسی
 * - input واقعی: Gregorian ISO (YYYY-MM-DD)
 * - فیلدهای دامنه‌ای جلالی از طریق unifier به همین picker متصل می‌شوند
 * - تبدیل تاریخ با Intl Persian Calendar انجام می‌شود؛ الگوریتم چرخه ۳۳ ساله حذف شده است.
 */
(function () {
  'use strict';

  var VERSION = '4.0.0';
  var TZ = 'Asia/Tehran';
  var WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  var MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  var FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
  var cacheJ2G = Object.create(null);
  var cacheG2J = Object.create(null);
  var active = null;
  var activeInput = null;
  var positionHandler = null;

  var PERSIAN_FMT = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  function fa(v) {
    return String(v == null ? '' : v).replace(/\d/g, function (d) { return FA_DIGITS[d]; });
  }

  function en(v) {
    return String(v == null ? '' : v)
      .replace(/[۰-۹]/g, function (d) { return FA_DIGITS.indexOf(d); })
      .replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); });
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  function validJ(y, m, d) {
    return Number.isInteger(y) && Number.isInteger(m) && Number.isInteger(d) &&
      m >= 1 && m <= 12 && d >= 1 && d <= 31;
  }

  function validIso(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v || ''); }

  function g2jFromMs(ms) {
    var key = String(ms);
    if (cacheG2J[key]) return cacheG2J[key].slice();
    var parts = PERSIAN_FMT.formatToParts(new Date(ms));
    var out = [0, 0, 0];
    parts.forEach(function (p) {
      if (p.type === 'year') out[0] = +p.value;
      if (p.type === 'month') out[1] = +p.value;
      if (p.type === 'day') out[2] = +p.value;
    });
    cacheG2J[key] = out.slice();
    return out;
  }

  function g2j(gy, gm, gd) {
    var ms = Date.UTC(+gy, +gm - 1, +gd, 12);
    return g2jFromMs(ms);
  }

  function cmpJ(a, b) {
    for (var i = 0; i < 3; i++) {
      if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
    }
    return 0;
  }

  function j2g(jy, jm, jd) {
    jy = +jy; jm = +jm; jd = +jd;
    if (!validJ(jy, jm, jd)) return null;
    var key = jy + '-' + pad2(jm) + '-' + pad2(jd);
    if (cacheJ2G[key]) return cacheJ2G[key].slice();

    // A Jalali year lies between approximately March of gy=jy+621 and March of jy+622.
    // Binary search over UTC days against ICU's Persian calendar avoids the old 33-year approximation.
    var lo = Date.UTC(jy + 621, 0, 1);
    var hi = Date.UTC(jy + 622, 11, 31);
    var target = [jy, jm, jd];
    while (lo <= hi) {
      var daysSpan = Math.floor((hi - lo) / 86400000);
      var mid = lo + Math.floor(daysSpan / 2) * 86400000 + 12 * 3600000;
      var j = g2jFromMs(mid);
      var c = cmpJ(j, target);
      if (c === 0) {
        var dt = new Date(mid);
        var out = [dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()];
        cacheJ2G[key] = out.slice();
        return out;
      }
      if (c < 0) lo = mid + 12 * 3600000;
      else hi = mid - 12 * 3600000;
      lo = Date.UTC(new Date(lo).getUTCFullYear(), new Date(lo).getUTCMonth(), new Date(lo).getUTCDate());
      hi = Date.UTC(new Date(hi).getUTCFullYear(), new Date(hi).getUTCMonth(), new Date(hi).getUTCDate());
    }
    return null;
  }

  function jToIso(y, m, d) {
    var g = j2g(y, m, d);
    return g ? g[0] + '-' + pad2(g[1]) + '-' + pad2(g[2]) : '';
  }

  function isoToJ(v) {
    if (!validIso(v)) return null;
    var p = v.split('-').map(Number);
    return g2j(p[0], p[1], p[2]);
  }

  function todayJ() {
    var parts = new Intl.DateTimeFormat('en-u-ca-gregory-nu-latn', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    var y = 0, m = 0, d = 0;
    parts.forEach(function (p) {
      if (p.type === 'year') y = +p.value;
      if (p.type === 'month') m = +p.value;
      if (p.type === 'day') d = +p.value;
    });
    return g2j(y, m, d);
  }

  function monthLength(y, m) {
    var key = 'len-' + y + '-' + m;
    if (cacheJ2G[key]) return cacheJ2G[key][0];
    var nextY = m === 12 ? y + 1 : y;
    var nextM = m === 12 ? 1 : m + 1;
    var a = j2g(y, m, 1);
    var b = j2g(nextY, nextM, 1);
    if (!a || !b) return m <= 6 ? 31 : (m <= 11 ? 30 : 29);
    var len = Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86400000);
    cacheJ2G[key] = [len];
    return len;
  }

  // Saturday = 0 ... Friday = 6.
  function firstWeekday(y, m) {
    var g = j2g(y, m, 1);
    if (!g) return 0;
    var sundayBased = new Date(Date.UTC(g[0], g[1] - 1, g[2], 12)).getUTCDay();
    return (sundayBased + 1) % 7;
  }

  function yearBounds(input) {
    var now = todayJ()[0];
    var yf = parseInt(input.getAttribute('data-kh-year-from') || '', 10);
    var yt = parseInt(input.getAttribute('data-kh-year-to') || '', 10);
    if (!Number.isFinite(yf)) yf = Math.max(1200, now - 80);
    if (!Number.isFinite(yt)) yt = now + 20;
    if (yf > yt) { var tmp = yf; yf = yt; yt = tmp; }
    return [yf, yt];
  }

  function addCss() {
    if (document.getElementById('kh-jdp-css-v4')) return;
    var style = document.createElement('style');
    style.id = 'kh-jdp-css-v4';
    style.textContent = `
      .kh-jdp-wrap{position:relative;display:inline-block;width:100%;max-width:100%;font-family:Vazirmatn,Vazirmatn,Tahoma,sans-serif}
      .kh-jdp-text{direction:rtl;width:100%;height:42px;box-sizing:border-box;border:1px solid #d0d5dd;border-radius:12px;padding:8px 42px 8px 38px;font:600 13px Vazirmatn,Tahoma,sans-serif;background:#fff;color:#101828;cursor:pointer;outline:none;transition:all .16s ease;box-shadow:0 1px 2px rgba(16,24,40,.04)}
      .kh-jdp-text:hover{border-color:#98a2b3}.kh-jdp-text:focus{border-color:#0d7a5f;box-shadow:0 0 0 4px rgba(13,122,95,.10)}
      .kh-jdp-wrap:before{content:'◫';position:absolute;right:13px;top:10px;color:#0d7a5f;font-size:16px;z-index:2;pointer-events:none}
      .kh-jdp-wrap:after{content:'⌄';position:absolute;left:13px;top:10px;color:#667085;font-size:16px;z-index:2;pointer-events:none}
      .kh-jdp{position:fixed;z-index:2147483646;width:348px;max-width:calc(100vw - 20px);background:#fff;border:1px solid #eaecf0;border-radius:18px;box-shadow:0 24px 70px rgba(16,24,40,.22);padding:14px;direction:rtl;box-sizing:border-box;animation:khJdpIn .12s ease-out}
      @keyframes khJdpIn{from{opacity:0;transform:translateY(-4px) scale(.992)}to{opacity:1;transform:none}}
      .kh-jdp-head{display:grid;grid-template-columns:38px 1fr 38px;align-items:center;gap:8px;margin-bottom:10px}
      .kh-jdp-nav,.kh-jdp-title select{height:36px;border:1px solid #e4e7ec;background:#f8fafc;border-radius:10px;color:#344054;font-family:inherit;cursor:pointer}
      .kh-jdp-nav{font-size:20px;line-height:1}.kh-jdp-nav:hover{background:#eef7f3;color:#0d7a5f;border-color:#b7dfd2}
      .kh-jdp-title{display:flex;justify-content:center;align-items:center;gap:7px}.kh-jdp-title select{padding:0 8px;font-size:12px;font-weight:800;min-width:112px}.kh-jdp-title select.year{min-width:80px}
      .kh-jdp-week,.kh-jdp-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
      .kh-jdp-week{padding:0 0 6px;margin-bottom:6px;border-bottom:1px solid #f0f2f5}.kh-jdp-week div{text-align:center;font-size:10px;font-weight:800;color:#667085;padding:5px 0}
      .kh-jdp-day{height:36px;border:0;background:#fff;border-radius:10px;padding:0;cursor:pointer;font:600 11px Vazirmatn,Tahoma,sans-serif;color:#344054;transition:all .11s ease}
      .kh-jdp-day:hover{background:#eef7f3;color:#0d7a5f;transform:translateY(-1px)}
      .kh-jdp-day.empty{pointer-events:none;background:transparent}.kh-jdp-day.today{box-shadow:inset 0 0 0 1.5px #0d7a5f;color:#0d7a5f;font-weight:900}.kh-jdp-day.sel{background:#0d7a5f;color:#fff;font-weight:900;box-shadow:0 4px 10px rgba(13,122,95,.22)}
      .kh-jdp-actions{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:11px;padding-top:10px;border-top:1px solid #f0f2f5}
      .kh-jdp-actions button{border:0;border-radius:10px;padding:8px 12px;font:700 10px Vazirmatn,Tahoma,sans-serif;cursor:pointer}.kh-jdp-actions .clear{background:#fff1f0;color:#b42318}.kh-jdp-actions .today{background:#ecfdf3;color:#067647}
      .kh-jdp-caption{font-size:10px;color:#98a2b3;text-align:center;margin-top:6px}
      @media(max-width:480px){.kh-jdp{width:calc(100vw - 12px);max-width:none}.kh-jdp-day{height:38px}.kh-jdp-text{height:44px}}
    `;
    document.head.appendChild(style);
  }

  function close() {
    if (active) active.remove();
    active = null;
    activeInput = null;
    if (positionHandler) {
      window.removeEventListener('resize', positionHandler);
      window.removeEventListener('scroll', positionHandler, true);
      positionHandler = null;
    }
  }

  function position() {
    if (!active || !activeInput || !document.body.contains(activeInput)) return;
    var r = activeInput.getBoundingClientRect();
    var width = Math.min(348, window.innerWidth - 20);
    var left = Math.max(10, Math.min(r.right - width, window.innerWidth - width - 10));
    var top = r.bottom + 7;
    var h = active.offsetHeight || 430;
    if (top + h > window.innerHeight - 10 && r.top - h - 7 >= 10) top = r.top - h - 7;
    active.style.width = width + 'px';
    active.style.left = left + 'px';
    active.style.top = Math.max(10, top) + 'px';
  }

  function render(input, cal) {
    var current = isoToJ(input.value) || todayJ();
    var y = current[0], m = current[1];
    var selected = isoToJ(input.value);
    var today = todayJ();
    var bounds = yearBounds(input);

    function draw() {
      if (y < bounds[0]) y = bounds[0];
      if (y > bounds[1]) y = bounds[1];
      var len = monthLength(y, m);
      var first = firstWeekday(y, m);
      var years = [];
      for (var yy = bounds[1]; yy >= bounds[0]; yy--) years.push('<option value="' + yy + '"' + (yy === y ? ' selected' : '') + '>' + fa(yy) + '</option>');
      var months = MONTHS.map(function (name, i) {
        var mm = i + 1;
        return '<option value="' + mm + '"' + (mm === m ? ' selected' : '') + '>' + name + '</option>';
      }).join('');
      var cells = [];
      for (var e = 0; e < first; e++) cells.push('<button type="button" class="kh-jdp-day empty" tabindex="-1"></button>');
      for (var d = 1; d <= len; d++) {
        var iso = jToIso(y, m, d);
        var sel = selected && iso === input.value;
        var tod = today[0] === y && today[1] === m && today[2] === d;
        cells.push('<button type="button" class="kh-jdp-day' + (sel ? ' sel' : '') + (tod ? ' today' : '') + '" data-d="' + d + '">' + fa(d) + '</button>');
      }
      cal.innerHTML = '<div class="kh-jdp-head">' +
        '<button type="button" class="kh-jdp-nav" data-prev aria-label="ماه قبل">‹</button>' +
        '<div class="kh-jdp-title"><select class="month" aria-label="ماه">' + months + '</select><select class="year" aria-label="سال">' + years.join('') + '</select></div>' +
        '<button type="button" class="kh-jdp-nav" data-next aria-label="ماه بعد">›</button>' +
        '</div>' +
        '<div class="kh-jdp-week">' + WEEKDAYS.map(function (x) { return '<div>' + x + '</div>'; }).join('') + '</div>' +
        '<div class="kh-jdp-grid">' + cells.join('') + '</div>' +
        '<div class="kh-jdp-actions"><button type="button" class="clear">پاک کردن</button><button type="button" class="today">امروز</button></div>' +
        '<div class="kh-jdp-caption">تقویم جلالی · ذخیره‌سازی تاریخ‌های سیستمی به صورت میلادی</div>';
      position();
    }

    cal.onclick = function (e) {
      var prev = e.target.closest('[data-prev]');
      if (prev) { m--; if (m < 1) { m = 12; y--; } draw(); return; }
      var next = e.target.closest('[data-next]');
      if (next) { m++; if (m > 12) { m = 1; y++; } draw(); return; }
      var db = e.target.closest('[data-d]');
      if (db) {
        var iso = jToIso(y, m, +db.dataset.d);
        if (iso) {
          input.value = iso;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          refresh(input);
          close();
        }
        return;
      }
      if (e.target.closest('.clear')) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        refresh(input); close(); return;
      }
      if (e.target.closest('.today')) {
        var t = todayJ();
        input.value = jToIso(t[0], t[1], t[2]);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        refresh(input); close(); return;
      }
    };
    cal.onchange = function (e) {
      if (e.target.matches('select.month')) { m = +e.target.value; draw(); }
      if (e.target.matches('select.year')) { y = +e.target.value; draw(); }
    };
    draw();
  }

  function refresh(input) {
    if (!input) return;
    var wrap = input.closest('.kh-jdp-wrap');
    if (!wrap) return;
    var text = wrap.querySelector('.kh-jdp-text');
    var j = isoToJ(input.value);
    if (text) {
      text.value = j ? fa(j[0]) + '/' + fa(pad2(j[1])) + '/' + fa(pad2(j[2])) : '';
    }
  }

  function open(input) {
    close();
    activeInput = input;
    active = document.createElement('div');
    active.className = 'kh-jdp';
    document.body.appendChild(active);
    render(input, active);
    positionHandler = position;
    window.addEventListener('resize', positionHandler, { passive: true });
    window.addEventListener('scroll', positionHandler, true);
    setTimeout(position, 0);
  }

  function install(input) {
    if (!input || input.dataset.khJdp || input.dataset.khReactJdate && input.dataset.khBridgeInstalled) return;
    if (input.disabled) return;
    input.dataset.khJdp = '1';
    input.setAttribute('data-original-type', input.type);
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
    text.placeholder = 'انتخاب تاریخ شمسی';
    text.setAttribute('aria-label', 'انتخاب تاریخ شمسی');
    if (originalId) text.setAttribute('data-for', originalId);
    wrap.insertBefore(text, input);
    refresh(input);

    text.addEventListener('click', function (e) {
      e.stopPropagation();
      open(input);
    });
  }

  function looksLikeDateInput(el) {
    if (!el || el.tagName !== 'INPUT' || el.dataset.khJdp || el.dataset.khReactJdate) return false;
    if (el.type === 'date') return true;
    if (el.dataset.datePicker === 'jalali') return true;
    var hay = ((el.name || '') + ' ' + (el.id || '') + ' ' + (el.placeholder || '') + ' ' + (el.getAttribute('aria-label') || '')).toLowerCase();
    return /تاریخ|date|from_date|to_date|start_date|end_date|date_from|date_to/.test(hay);
  }

  function scan(root) {
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('input').forEach(function (el) {
      if (looksLikeDateInput(el)) install(el);
    });
  }

  document.addEventListener('click', function (e) {
    if (active && !e.target.closest('.kh-jdp') && !e.target.closest('.kh-jdp-text')) close();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && active) close();
  });

  window.KhatyarJalaliDate = {
    toJalali: isoToJ,
    toGregorian: function (y, m, d) { return jToIso(y, m, d); },
    timezone: TZ,
    version: VERSION
  };
  window.KhatyarJalaliDatepicker = {
    install: install,
    scan: scan,
    refresh: refresh,
    close: close,
    version: VERSION
  };

  function boot() {
    addCss();
    scan(document);
    [300, 1000, 2500, 5000].forEach(function (ms) {
      setTimeout(function () { scan(document); }, ms);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  new MutationObserver(function (records) {
    records.forEach(function (r) {
      r.addedNodes.forEach(function (n) {
        if (n && n.nodeType === 1) scan(n);
      });
    });
  }).observe(document.documentElement, { subtree: true, childList: true });
})();
