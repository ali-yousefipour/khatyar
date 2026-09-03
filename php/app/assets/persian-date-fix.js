/* خطیار — سازگارساز تقویم شمسی
 * نسخه 3.0.1
 *
 * نکته معماری:
 * persian-date-picker.js تنها منبع محاسبه تقویم است و تاریخ انتخابی را
 * برای ارسال به Backend به ISO میلادی (YYYY-MM-DD) تبدیل می‌کند.
 * این فایل نباید الگوریتم تبدیل جلالی/میلادی مستقل داشته باشد؛ در نسخه‌های
 * قبلی یک الگوریتم تقریبی ۳۳ ساله در اینجا وجود داشت و می‌توانست روز ۳۰ اسفند
 * را اشتباه به تقویم اضافه کند.
 */
(function () {
  'use strict';

  function daysInJalaliMonth(year, month) {
    var api = window.KhatyarJalaliDate;
    if (!api || typeof api.toGregorian !== 'function') return null;

    var first = api.toGregorian(year, month, 1);
    var ny = month === 12 ? year + 1 : year;
    var nm = month === 12 ? 1 : month + 1;
    var next = api.toGregorian(ny, nm, 1);
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(first) || !/^\\d{4}-\\d{2}-\\d{2}$/.test(next)) return null;

    var a = first.split('-').map(Number);
    var b = next.split('-').map(Number);
    return Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86400000);
  }

  function repair() {
    if (!window.KhatyarJalaliDate) return;

    document.querySelectorAll('.kh-jdp').forEach(function (cal) {
      var title = cal.querySelector('.kh-jdp-title');
      if (!title) return;

      var yearEl = title.querySelector('select.year');
      var monthEl = title.querySelector('select.month');
      var year = yearEl ? Number(yearEl.value) : NaN;
      var month = monthEl ? Number(monthEl.value) : NaN;
      if (!Number.isInteger(year) || !Number.isInteger(month) || month !== 12) return;

      var len = daysInJalaliMonth(year, month);
      if (len !== 30) return;

      var grid = cal.querySelector('.kh-jdp-grid');
      if (!grid || grid.querySelector('[data-d="30"]')) return;

      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'kh-jdp-day';
      button.dataset.d = '30';
      button.textContent = '۳۰';
      grid.appendChild(button);
    });
  }

  new MutationObserver(repair).observe(document.documentElement, {
    subtree: true,
    childList: true
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', repair);
  } else {
    repair();
  }
})();
