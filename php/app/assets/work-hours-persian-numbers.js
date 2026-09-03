/* Work-hours report — normalize hour:minute values to Persian digits. */
(function () {
  'use strict';

  var map = {
    '0': '۰', '1': '۱', '2': '۲', '3': '۳', '4': '۴',
    '5': '۵', '6': '۶', '7': '۷', '8': '۸', '9': '۹'
  };

  function faDigits(value) {
    return String(value == null ? '' : value).replace(/[0-9]/g, function (d) {
      return map[d];
    });
  }

  function normalize(root) {
    root = root || document;
    var nodes = root.querySelectorAll('td, th, [role="cell"], [role="gridcell"], .work-hours-report, .shift-report');

    nodes.forEach(function (el) {
      if (!el || el.dataset.khFaTimeFixed === '1') return;
      var text = el.textContent || '';
      // Only alter values that look like durations/times; leave names and other numeric data intact.
      if (/\b\d{1,4}:\d{2}\b/.test(text)) {
        el.textContent = faDigits(text);
      }
      el.dataset.khFaTimeFixed = '1';
    });
  }

  function start() {
    normalize(document);
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes && m.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) normalize(node);
        });
      });
    });
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
