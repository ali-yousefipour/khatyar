/* خطیار — Safe Persian DatePicker v4.1.5
 * فقط روی inputهای مستقل خارج از React #root فعال می‌شود.
 * هرگز DOM تحت مدیریت React را wrap/replace نمی‌کند.
 * UI شمسی، مقدار input میلادی ISO.
 */
(function(){
  'use strict';
  var VERSION='4.1.5';
  var MONTHS=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
  var WEEKDAYS=['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];
  var FA='۰۱۲۳۴۵۶۷۸۹';
  var active=null, activeInput=null, posHandler=null;
  var fmt=new Intl.DateTimeFormat('en-u-ca-persian-nu-latn',{timeZone:'UTC',year:'numeric',month:'2-digit',day:'2-digit'});
  function fa(v){return String(v??'').replace(/\d/g,d=>FA[d]);}
  function norm(v){return String(v??'').replace(/[۰-۹]/g,d=>FA.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));}
  function parseParts(v){var m=norm(v).trim().match(/^(\d{4})[-\/]?(\d{1,2})[-\/]?(\d{1,2})$/);return m?[+m[1],+m[2],+m[3]]:null;}
  function g2j(y,m,d){var p=fmt.formatToParts(new Date(Date.UTC(y,m-1,d,12))),o=[0,0,0];p.forEach(x=>{if(x.type==='year')o[0]=+x.value;if(x.type==='month')o[1]=+x.value;if(x.type==='day')o[2]=+x.value});return o;}
  function cmp(a,b){for(var i=0;i<3;i++){if(a[i]!==b[i])return a[i]<b[i]?-1:1;}return 0;}
  function j2g(y,m,d){
    if(!Number.isInteger(y)||m<1||m>12||d<1||d>31)return null;
    // Search whole UTC day indices. Advancing milliseconds from a noon midpoint
    // previously skipped days and made firstWd() throw, leaving the grid empty.
    var lo=Math.floor(Date.UTC(y+621,0,1)/86400000);
    var hi=Math.floor(Date.UTC(y+623,0,1)/86400000);
    var target=[y,m,d];
    while(lo<=hi){
      var mid=Math.floor((lo+hi)/2);
      var date=new Date(mid*86400000);
      var day=g2j(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate());
      var comparison=cmp(day,target);
      if(comparison===0)return[date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate()];
      if(comparison<0)lo=mid+1;else hi=mid-1;
    }
    return null;
  }
  function isoToJ(v){var p=parseParts(v);return p&&/^\d{4}-\d{2}-\d{2}$/.test(norm(v).trim())?g2j(p[0],p[1],p[2]):null;}
  function todayJ(){var d=new Date(),p=new Intl.DateTimeFormat('en-u-ca-gregory-nu-latn',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d),y=0,m=0,dd=0;p.forEach(x=>{if(x.type==='year')y=+x.value;if(x.type==='month')m=+x.value;if(x.type==='day')dd=+x.value});return g2j(y,m,dd);}
  function monthLen(y,m){var a=j2g(y,m,1),b=j2g(m===12?y+1:y,m===12?1:m+1,1);return a&&b?Math.round((Date.UTC(b[0],b[1]-1,b[2])-Date.UTC(a[0],a[1]-1,a[2]))/86400000):(m<=6?31:m<=11?30:29);}
  function firstWd(y,m){var g=j2g(y,m,1);if(!g)return 0;var w=new Date(Date.UTC(g[0],g[1]-1,g[2],12)).getUTCDay();return(w+1)%7;}
  function css(){if(document.getElementById('kh-safe-jdp-css'))return;var s=document.createElement('style');s.id='kh-safe-jdp-css';s.textContent='.kh-safe-jdp{position:fixed;z-index:2147483646;width:348px;max-width:calc(100vw - 20px);background:#fff;border:1px solid #eaecf0;border-radius:18px;box-shadow:0 24px 70px rgba(16,24,40,.22);padding:14px;direction:rtl;font-family:Vazirmatn,Tahoma,sans-serif}.kh-safe-jdp *{box-sizing:border-box}.kh-safe-jdp{max-height:calc(100dvh - 20px);overflow-y:auto;overscroll-behavior:contain}.kh-safe-jdp button,.kh-safe-jdp select{opacity:1!important;visibility:visible!important;pointer-events:auto!important}.kh-safe-jdp .kh-safe-day:disabled{pointer-events:none!important}.kh-safe-head{display:grid;grid-template-columns:38px 1fr 38px;gap:8px;align-items:center;margin-bottom:10px}.kh-safe-nav,.kh-safe-select{height:36px;border:1px solid #e4e7ec;background:#f8fafc;border-radius:10px;font-family:inherit;cursor:pointer}.kh-safe-title{display:flex;justify-content:center;gap:7px}.kh-safe-select{padding:0 7px;font-size:12px;font-weight:800;min-width:110px}.kh-safe-select.year{min-width:78px}.kh-safe-week,.kh-safe-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}.kh-safe-week{border-bottom:1px solid #f0f2f5;padding-bottom:6px;margin-bottom:6px}.kh-safe-week div{display:block!important;text-align:center;font-size:11px;font-weight:800;color:#667085;padding:5px 0;visibility:visible!important;opacity:1!important}.kh-safe-jdp .kh-safe-grid{display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr))!important;grid-auto-rows:38px!important;gap:4px!important;visibility:visible!important;opacity:1!important;height:auto!important;min-height:200px!important;overflow:visible!important}.kh-safe-jdp .kh-safe-spacer{display:block!important;min-height:38px;visibility:hidden!important}.kh-safe-jdp .kh-safe-grid>button.kh-safe-day{display:flex!important;appearance:none!important;-webkit-appearance:none!important;width:100%!important;padding:0!important;margin:0!important;box-sizing:border-box!important;align-items:center;justify-content:center;min-width:0;min-height:38px;height:38px!important;opacity:1!important;visibility:visible!important;position:relative!important;transform:none!important;border:0;background:#fff;border-radius:10px;cursor:pointer;font:700 13px Vazirmatn,Tahoma,sans-serif!important;color:#344054!important;line-height:1.4!important}.kh-safe-jdp .kh-safe-day:disabled{visibility:hidden!important;cursor:default}.kh-safe-jdp .kh-safe-day.sel{background:#0d7a5f!important;color:#fff!important}.kh-safe-jdp .kh-safe-day.today:not(.sel){color:#0d7a5f!important;box-shadow:inset 0 0 0 1.5px #0d7a5f!important}.kh-safe-day:hover{background:#eef7f3;color:#0d7a5f}.kh-safe-day.sel{background:#0d7a5f;color:#fff}.kh-safe-day.today{box-shadow:inset 0 0 0 1.5px #0d7a5f;color:#0d7a5f}.kh-safe-actions{display:flex;justify-content:space-between;margin-top:11px;padding-top:10px;border-top:1px solid #f0f2f5}.kh-safe-actions button{border:0;border-radius:10px;padding:8px 12px;font:700 10px Vazirmatn,Tahoma,sans-serif;cursor:pointer}.kh-safe-clear{background:#fff1f0;color:#b42318}.kh-safe-today{background:#ecfdf3;color:#067647}@media(max-width:480px){.kh-safe-jdp{width:calc(100vw - 12px);max-width:none}.kh-safe-day{height:38px}}';document.head.appendChild(s);}
  function close(){if(active)active.remove();active=null;activeInput=null;if(posHandler){window.removeEventListener('resize',posHandler);window.removeEventListener('scroll',posHandler,true);posHandler=null;}}
  function position(){if(!active||!activeInput||!document.body.contains(activeInput))return;var r=activeInput.getBoundingClientRect(),w=Math.min(348,window.innerWidth-20),left=Math.max(10,Math.min(r.right-w,window.innerWidth-w-10)),h=Math.min(active.scrollHeight||430,window.innerHeight-20),top=r.bottom+7;if(top+h>window.innerHeight-10)top=r.top-h-7;if(top<10)top=10;active.style.left=left+'px';active.style.top=top+'px';active.style.width=w+'px';active.style.maxHeight=Math.max(180,window.innerHeight-20)+'px';}
  function draw(input,cal){
    var iso=input.dataset.khIsoDate??input.value,cur=isoToJ(iso)||todayJ(),y=cur[0],m=cur[1],sel=isoToJ(iso),tod=todayJ();
    function emit(value){if(input.dataset.khIsoDate!==undefined)input.dataset.khIsoDate=value;else input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));close();}
    function render(){
      var len=monthLen(y,m),first=firstWd(y,m);
      if(!Number.isInteger(len)||len<28||len>31)len=m<=6?31:m<=11?30:29;
      if(!Number.isInteger(first)||first<0||first>6)first=0;
      var years='';
      for(var yy=y-80;yy<=y+20;yy++)years+='<option value="'+yy+'"'+(yy===y?' selected':'')+'>'+fa(yy)+'</option>';
      cal.innerHTML='<div class="kh-safe-head"><button type="button" class="kh-safe-nav" data-p aria-label="ماه قبل">‹</button><div class="kh-safe-title"><select class="kh-safe-select" data-m aria-label="ماه">'+MONTHS.map((n,i)=>'<option value="'+(i+1)+'"'+(i+1===m?' selected':'')+'>'+n+'</option>').join('')+'</select><select class="kh-safe-select year" data-y aria-label="سال">'+years+'</select></div><button type="button" class="kh-safe-nav" data-n aria-label="ماه بعد">›</button></div><div class="kh-safe-week">'+WEEKDAYS.map(x=>'<div>'+x+'</div>').join('')+'</div><div class="kh-safe-grid" role="grid" aria-label="روزهای '+MONTHS[m-1]+' '+fa(y)+'"></div><div class="kh-safe-actions"><button type="button" class="kh-safe-clear" data-c>پاک کردن</button><button type="button" class="kh-safe-today" data-t>امروز</button></div>';
      var grid=cal.querySelector('.kh-safe-grid');
      var fragment=document.createDocumentFragment();
      for(var i=0;i<first;i++){var spacer=document.createElement('span');spacer.className='kh-safe-spacer';spacer.setAttribute('aria-hidden','true');fragment.appendChild(spacer);}
      for(var d=1;d<=len;d++){
        var btn=document.createElement('button');
        btn.type='button';btn.className='kh-safe-day';btn.dataset.d=String(d);btn.textContent=fa(d);btn.setAttribute('aria-label',fa(d)+' '+MONTHS[m-1]+' '+fa(y));
        if(sel&&sel[0]===y&&sel[1]===m&&sel[2]===d){btn.classList.add('sel');btn.setAttribute('aria-selected','true');}
        if(tod[0]===y&&tod[1]===m&&tod[2]===d)btn.classList.add('today');
        fragment.appendChild(btn);
      }
      grid.appendChild(fragment);
      position();
    }
    render();
    cal.onclick=function(e){
      if(e.target.closest('[data-p]')){m--;if(m<1){m=12;y--;}render();return;}
      if(e.target.closest('[data-n]')){m++;if(m>12){m=1;y++;}render();return;}
      var day=e.target.closest('[data-d]');
      if(day){var g=j2g(y,m,+day.dataset.d);if(g)emit(g[0]+'-'+String(g[1]).padStart(2,'0')+'-'+String(g[2]).padStart(2,'0'));return;}
      if(e.target.closest('[data-c]')){emit('');return;}
      if(e.target.closest('[data-t]')){var z=todayJ(),g=j2g(z[0],z[1],z[2]);if(g)emit(g[0]+'-'+String(g[1]).padStart(2,'0')+'-'+String(g[2]).padStart(2,'0'));}
    };
    cal.onchange=function(e){if(e.target.matches('[data-m]')){m=+e.target.value;render();}else if(e.target.matches('[data-y]')){y=+e.target.value;render();}};
  }
  function install(input){if(!input||input.dataset.khSafeInstalled)return;if(input.closest('#root')&&!input.closest('.ssv-report-workspace'))return;if(input.disabled)return;input.dataset.khSafeInstalled='1';input.addEventListener('click',function(){if(activeInput===input){close();return}close();css();activeInput=input;active=document.createElement('div');active.className='kh-safe-jdp';document.body.appendChild(active);draw(input,active);posHandler=position;window.addEventListener('resize',posHandler);window.addEventListener('scroll',posHandler,true);});}
  function looks(el){var h=((el.name||'')+' '+(el.id||'')+' '+(el.placeholder||'')+' '+(el.getAttribute('aria-label')||'')).toLowerCase();return /تاریخ|date|from_date|to_date|start_date|end_date|date_from|date_to/.test(h);}
  function scan(root){var scope=root&&root.querySelectorAll?root:document;scope.querySelectorAll('input').forEach(function(el){if(looks(el))install(el)});}
  document.addEventListener('mousedown',function(e){if(active&&!active.contains(e.target)&&e.target!==activeInput&&!activeInput?.contains(e.target))close()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});
  window.KhatyarSafeJalaliDate={version:VERSION,install:install,scan:scan};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){scan(document)});else scan(document);
})();
