/* Attendance summary fix — explicit entry/exit time + readable RTL */
(function(){
  'use strict';
  var FA={'0':'۰','1':'۱','2':'۲','3':'۳','4':'۴','5':'۵','6':'۶','7':'۷','8':'۸','9':'۹'}, lastPunches=[];
  function fa(s){return String(s==null?'':s).replace(/[0-9]/g,function(c){return FA[c]||c;});}
  function timeOf(v){
    if(v==null||v==='')return '';
    var s=String(v).trim(),m=s.match(/(?:T|\s)(\d{1,2}):(\d{2})(?::\d{2})?/);
    if(m)return ('0'+m[1]).slice(-2)+':'+m[2];
    m=s.match(/^(\d{1,2}):(\d{2})/);
    return m?('0'+m[1]).slice(-2)+':'+m[2]:'';
  }
  function getTime(p,k){
    var a=k==='in'?['in_time','inTime','check_in_time','checkInTime','in','check_in']:['out_time','outTime','check_out_time','checkOutTime','out','check_out'];
    for(var i=0;i<a.length;i++){var t=timeOf(p&&p[a[i]]);if(t)return t;}return '';
  }
  function collect(x){
    if(!x||typeof x!=='object')return;
    if(Array.isArray(x)){x.forEach(collect);return;}
    if(Array.isArray(x.punches)){
      lastPunches=x.punches.map(function(p){return {in:getTime(p,'in'),out:getTime(p,'out')};}).filter(function(p){return p.in||p.out;});
    }
    Object.keys(x).forEach(function(k){if(k!=='punches')collect(x[k]);});
  }
  function markBoxes(){
    var all=document.querySelectorAll('body *');
    all.forEach(function(el){
      var txt=(el.textContent||'').trim();
      if(txt.indexOf('لیست ورود و خروج')===-1)return;
      var box=el.closest('.card,section,article,.modal,.modal-content')||el;
      box.classList.add('khatyar-attendance-summary');
      if(!box.dataset.attendanceFix){box.dataset.attendanceFix='1';}
    });
  }
  function injectTimes(){
    markBoxes();
    if(!lastPunches.length)return;
    var root=document.querySelector('.khatyar-attendance-summary');
    if(!root)return;
    var ins=root.querySelectorAll('td, [role="cell"]'), inCells=[],outCells=[];
    ins.forEach(function(c){var t=(c.textContent||'').trim();if(/^محل ورود\s*:/.test(t))inCells.push(c);if(/^محل خروج\s*:/.test(t))outCells.push(c);});
    lastPunches.forEach(function(p,i){
      if(inCells[i]&&p.in&&!inCells[i].querySelector('.khatyar-in-time')){
        var d=document.createElement('div');d.className='khatyar-time khatyar-in-time';d.dataset.attendanceTime='1';d.textContent='ساعت ورود: '+fa(p.in);inCells[i].appendChild(d);
      }
      if(outCells[i]&&p.out&&!outCells[i].querySelector('.khatyar-out-time')){
        var d2=document.createElement('div');d2.className='khatyar-time khatyar-out-time';d2.dataset.attendanceTime='1';d2.textContent='ساعت خروج: '+fa(p.out);outCells[i].appendChild(d2);
      }
    });
  }
  if(window.fetch){
    var nativeFetch=window.fetch.bind(window);
    window.fetch=function(){return nativeFetch.apply(window,arguments).then(function(resp){
      try{
        var ct=resp.headers&&resp.headers.get&&resp.headers.get('content-type')||'';
        if(ct.indexOf('application/json')===-1)return resp;
        return resp.clone().json().then(function(data){collect(data);setTimeout(injectTimes,0);return resp;}).catch(function(){return resp;});
      }catch(e){return resp;}
    });};
  }
  var style=document.createElement('style');
  style.textContent=''
    +'.khatyar-attendance-summary{direction:rtl!important;text-align:right!important;color:#172033!important;}\n'
    +'.khatyar-attendance-summary table{direction:rtl!important;width:100%;border-collapse:separate!important;border-spacing:0!important;border-radius:12px;overflow:hidden;}\n'
    +'.khatyar-attendance-summary th{background:#eef2f7!important;color:#172033!important;font-weight:800!important;}\n'
    +'.khatyar-attendance-summary td{background:#fff!important;color:#273449!important;border-color:#dfe5ee!important;vertical-align:middle!important;}\n'
    +'.khatyar-attendance-summary a{color:#155eef!important;font-weight:700!important;}\n'
    +'.khatyar-attendance-summary .khatyar-time{display:inline-flex!important;align-items:center!important;margin-top:7px!important;padding:4px 9px!important;border-radius:7px!important;background:#fff3b0!important;color:#694b00!important;font-weight:900!important;line-height:1.5!important;white-space:nowrap!important;}\n'
    +'.khatyar-attendance-summary .khatyar-location-cell{line-height:1.9!important;}';
  document.head.appendChild(style);
  var obs=new MutationObserver(function(){injectTimes();});
  function start(){injectTimes();if(document.body)obs.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
