/* گزارش تردد پرسنل — جستجوی سریع نام/نام خانوادگی در انتخاب پرسنل */
(function () {
  'use strict';

  var ROOT_SELECTOR = '#root';
  var SEARCH_MARK = 'data-kh-personnel-search';
  var INPUT_CLASS = 'kh-personnel-search-input';

  function norm(v) {
    return String(v == null ? '' : v)
      .replace(/[يى]/g, 'ی')
      .replace(/[ك]/g, 'ک')
      .replace(/[ۀة]/g, 'ه')
      .replace(/[\u200c\u200f\u200e]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function isAttendanceContext(el) {
    var box = el.closest('form, section, article, fieldset, .card, .modal, .modal-content, [role="dialog"], div');
    var text = norm((box && box.textContent) || '');
    return /تردد|حضور|ورود|خروج/.test(text);
  }

  function findPersonnelSelects() {
    var all = Array.prototype.slice.call(document.querySelectorAll('select'));
    return all.filter(function (select) {
      if (!select || select.getAttribute(SEARCH_MARK) === '1') return false;
      if (!isAttendanceContext(select)) return false;
      var options = Array.prototype.slice.call(select.options || []);
      if (options.length < 2) return false;
      var sample = options.slice(0, Math.min(options.length, 8)).map(function (o) { return norm(o.textContent); }).join(' ');
      var parentText = norm((select.parentElement && select.parentElement.textContent) || '');
      return /پرسنل|کارمند|نام و نام خانوادگی|انتخاب شخص|افراد|کاربر/.test(parentText) ||
             /نام و نام خانوادگی|پرسنل|کارمند/.test(sample);
    });
  }

  function makeSearch(select) {
    select.setAttribute(SEARCH_MARK, '1');
    var wrap = document.createElement('div');
    wrap.className = 'kh-personnel-search-wrap';
    wrap.dir = 'rtl';
    wrap.style.cssText = 'margin:0 0 8px 0;position:relative;width:100%;';

    var input = document.createElement('input');
    input.type = 'search';
    input.className = INPUT_CLASS;
    input.placeholder = 'جستجوی نام یا نام خانوادگی...';
    input.setAttribute('aria-label', 'جستجوی پرسنل');
    input.autocomplete = 'off';
    input.style.cssText = 'width:100%;box-sizing:border-box;border:1px solid #d0d5dd;border-radius:8px;padding:8px 34px 8px 10px;font:inherit;direction:rtl;background:#fff;';

    var icon = document.createElement('span');
    icon.textContent = '⌕';
    icon.setAttribute('aria-hidden', 'true');
    icon.style.cssText = 'position:absolute;right:10px;top:50%;transform:translateY(-50%);color:#667085;pointer-events:none;';
    wrap.appendChild(icon);
    wrap.appendChild(input);

    select.parentNode.insertBefore(wrap, select);

    function filter() {
      var q = norm(input.value);
      Array.prototype.forEach.call(select.options || [], function (option) {
        var text = norm(option.textContent);
        var keep = !q || text.indexOf(q) !== -1;
        option.hidden = !keep;
      });
    }

    input.addEventListener('input', filter);
    input.addEventListener('search', filter);
  }

  function enhance() {
    findPersonnelSelects().forEach(makeSearch);
  }

  function start() {
    enhance();
    var observer = new MutationObserver(function () { enhance(); });
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
