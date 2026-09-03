/* Attendance summary UI/time fix — v1
 * Ensures the "خلاصه تردد / لیست ورود و خروج" view always shows real in/out times
 * and remains readable in RTL/dark/light themes.
 */
(function () {
  'use strict';

  var FA = {'0':'۰','1':'۱','2':'۲','3':'۳','4':'۴','5':'۵','6':'۶','7':'۷','8':'۸','9':'۹'};
  function fa(s){ return String(s == null ? '' : s).replace(/[0-9]/g, function(c){ return FA[c] || c; }); }
  function timeOf(v){
    if (v == null || v === '') return '';
    var s = String(v).trim();
    var m = s.match(/(?:T|\s)(\d{1,2}):(\d{2})(?::\d{2})?/);
    if (m) return ('0' + m[1]).slice(-2) + ':' + m[2];
    m = s.match(/^(\d{1,2}):(\d{2})/);
    return m ? ('0' + m[1]).slice(-2) + ':' + m[2] : '';
  }
  function getTime(p, kind){
    var keys = kind === 'in'
      ? ['in_time','inTime','check_in_time','checkInTime','in','check_in']
      : ['out_time','outTime','check_out_time','checkOutTime','out','check_out'];
    for (var i=0;i<keys.length;i++) { var t=timeOf(p && p[keys[i]]); if(t) return t; }
    return '';
  }
  function paint(root){
    root = root || document;
    if (!document.body) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    var n;
    while ((n = walker.nextNode())) {
      var txt = (n.textContent || '').trim();
      if (!txt || txt.indexOf('لیست ورود و خروج') === -1) continue;
      var box = n.closest && (n.closest('.card,section,article,.modal,.modal-content') || n);
      if (box && !box.dataset.attendanceSummaryFix) {
        box.dataset.attendanceSummaryFix = '1';
        box.classList.add('khatyar-attendance-summary');
      }
    }

    var cells = document.querySelectorAll('.khatyar-attendance-summary td, .khatyar-attendance-summary [role="cell"]');
    cells.forEach(function(cell){
      var t = (cell.textContent || '').trim();
      if (!t) return;
      if (/^محل ورود\s*:/.test(t) && !cell.querySelector('.khatyar-in-time')) {
        // If the rendered UI has a hidden/adjacent data object, leave it intact;
        // this branch only adds styling/spacing. Actual values are injected below
        // when the API payload exposes them.
        cell.classList.add('khatyar-location-cell');
      }
      if (/^محل خروج\s*:/.test(t) && !cell.querySelector('.khatyar-out-time')) {
        cell.classList.add('khatyar-location-cell');
      }
    });
  }

  // Normalize the API payload so older frontend renderers can consume explicit
  // time fields without changing the existing API contract.
  if (window.fetch) {
    var nativeFetch = window.fetch.bind(window);
    window.fetch = function(){
      return nativeFetch.apply(window, arguments).then(function(resp){
        try {
          var ct = resp.headers && resp.headers.get && resp.headers.get('content-type') || '';
          if (ct.indexOf('application/json') === -1) return resp;
          return resp.clone().json().then(function(data){
            var changed = false;
            function walk(x){
              if (!x || typeof x !== 'object') return;
              if (Array.isArray(x)) { x.forEach(walk); return; }
              if (Array.isArray(x.punches)) {
                x.punches.forEach(function(p){
                  var it=getTime(p,'in'), ot=getTime(p,'out');
                  if (it && p.in_time !== it) { p.in_time=it; changed=true; }
                  if (ot && p.out_time !== ot) { p.out_time=ot; changed=true; }
                  if (it && p.in_fa !== fa(it)) { p.in_fa=fa(it); changed=true; }
                  if (ot && p.out_fa !== fa(ot)) { p.out_fa=fa(ot); changed=true; }
                });
              }
              Object.keys(x).forEach(function(k){ if(k!=='punches') walk(x[k]); });
            }
            walk(data);
            if (!changed) { paint(); return resp; }
            var headers = new Headers(resp.headers || {});
            headers.set('content-type','application/json; charset=utf-8');
            var body = JSON.stringify(data);
            return new Response(body,{status:resp.status,statusText:resp.statusText,headers:headers});
          }).catch(function(){ return resp; });
        } catch(e) { return resp; }
      });
    };
  }

  var style = document.createElement('style');
  style.textContent = '\n'
    + '.khatyar-attendance-summary{direction:rtl;text-align:right;color:#172033!important;}\n'
    + '.khatyar-attendance-summary table{direction:rtl!important;width:100%;border-collapse:separate;border-spacing:0;overflow:hidden;border-radius:12px;}\n'
    + '.khatyar-attendance-summary th{background:#eef2f7!important;color:#172033!important;font-weight:800!important;}\n'
    + '.khatyar-attendance-summary td{background:#fff!important;color:#273449!important;border-color:#dfe5ee!important;vertical-align:middle;}\n'
    + '.khatyar-attendance-summary a{color:#155eef!important;font-weight:700;}\n'
    + '.khatyar-location-cell{line-height:1.9!important;}\n'
    + '.khatyar-attendance-summary .badge,.khatyar-attendance-summary .text-muted{color:#344054!important;}\n'
    + '.khatyar-attendance-summary [data-attendance-time]{display:inline-flex;align-items:center;gap:5px;margin-top:6px;padding:3px 8px;border-radius:7px;background:#fff7cc;color:#694b00!important;font-weight:800;}\n';
  document.head.appendChild(style);

  var obs = new MutationObserver(function(){ paint(); });
  function start(){
    paint();
    if(document.body) obs.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
