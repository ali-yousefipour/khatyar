/* خطیار — Unifier for the legacy React JDate component.
 * Loaded before panel.bundle.js. It patches ReactDOM.createRoot so the
 * already-built panel is rendered once with its existing component tree and
 * immediately again after replacing the global JDate implementation.
 * This keeps APIs/data formats untouched and makes every <JDate> use the one
 * shared persian-date-picker.js implementation.
 */
(function () {
  'use strict';

  var R = window.React;
  var RD = window.ReactDOM;
  var DP = window.KhatyarJalaliDatepicker;
  var CAL = window.KhatyarJalaliDate;

  if (!R || !RD || !DP || !CAL || typeof RD.createRoot !== 'function') return;

  var useEffect = R.useEffect;
  var useRef = R.useRef;

  function fa(v) {
    return String(v == null ? '' : v).replace(/\d/g, function (d) {
      return '۰۱۲۳۴۵۶۷۸۹'[d];
    });
  }

  function normalizeDigits(v) {
    return String(v == null ? '' : v)
      .replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); })
      .replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); });
  }

  function jalaliToIso(value) {
    if (!value) return '';
    var raw = normalizeDigits(value).trim().replace(/\//g, '-');
    var m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!m) return '';
    return CAL.toGregorian(+m[1], +m[2], +m[3]) || '';
  }

  function isoValue(value, jalali) {
    if (!value) return '';
    var raw = normalizeDigits(value).trim();
    if (jalali) return jalaliToIso(raw);
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : '';
  }

  function outputValue(iso, jalali) {
    if (!iso) return '';
    if (!jalali) return iso;
    var j = CAL.toJalali(iso);
    return j ? (j[0] + '/' + String(j[1]).padStart(2, '0') + '/' + String(j[2]).padStart(2, '0')) : '';
  }

  function UnifiedJDate(props) {
    var value = props.value;
    var onChange = props.onChange;
    var placeholder = props.placeholder;
    var jalali = !!props.jalali;
    var yearFrom = props.yearFrom;
    var yearTo = props.yearTo;
    var inputRef = useRef(null);
    var onChangeRef = useRef(onChange);

    onChangeRef.current = onChange;

    useEffect(function () {
      var input = inputRef.current;
      if (!input) return;

      input.setAttribute('data-kh-react-jdate', '1');
      if (yearFrom != null) input.setAttribute('data-kh-year-from', String(yearFrom));
      if (yearTo != null) input.setAttribute('data-kh-year-to', String(yearTo));
      input.value = isoValue(value, jalali);

      if (!input.dataset.khBridgeInstalled) {
        DP.install(input);
        var handle = function () {
          onChangeRef.current(outputValue(input.value, jalali));
        };
        input.addEventListener('change', handle);
        input.dataset.khBridgeInstalled = '1';
        input.dataset.khBridgeJalali = jalali ? '1' : '0';
        input.dataset.khBridgePlaceholder = placeholder || 'تاریخ';
        input.__khBridgeCleanup = function () {
          input.removeEventListener('change', handle);
        };
      }

      DP.refresh(input);
    }, []);

    useEffect(function () {
      var input = inputRef.current;
      if (!input) return;
      input.value = isoValue(value, jalali);
      input.dataset.khBridgeJalali = jalali ? '1' : '0';
      if (yearFrom != null) input.setAttribute('data-kh-year-from', String(yearFrom));
      if (yearTo != null) input.setAttribute('data-kh-year-to', String(yearTo));
      DP.refresh(input);
    }, [value, jalali, yearFrom, yearTo, placeholder]);

    useEffect(function () {
      return function () {
        var input = inputRef.current;
        if (input && input.__khBridgeCleanup) input.__khBridgeCleanup();
      };
    }, []);

    return R.createElement('span', {
      style: { display: 'inline-block', width: '100%', minWidth: 0 }
    }, R.createElement('input', {
      ref: inputRef,
      type: 'date',
      defaultValue: isoValue(value, jalali),
      'data-kh-react-jdate': '1',
      'aria-label': placeholder || 'انتخاب تاریخ',
      style: { width: '100%' },
      onChange: function () {}
    }));
  }

  var originalCreateRoot = RD.createRoot;
  var wrapped = false;

  RD.createRoot = function () {
    var root = originalCreateRoot.apply(this, arguments);
    if (root && !root.__khJdpWrapped) {
      var originalRender = root.render.bind(root);
      var rerendered = false;
      root.render = function (element) {
        originalRender(element);
        if (!rerendered && element) {
          rerendered = true;
          window.JDate = UnifiedJDate;
          setTimeout(function () { originalRender(element); }, 0);
        }
      };
      root.__khJdpWrapped = true;
    }
    return root;
  };

  window.__KhatyarUnifiedJDate = UnifiedJDate;
  window.__KhatyarJDateUnifier = { version: '1.0.0' };
})();
