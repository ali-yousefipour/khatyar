/* KhatYar — restore Radio in the existing backend site-access UI and communications sidebar. */
(function(){
  'use strict';
  var API='/api', RADIO='radio';
  function token(){return localStorage.token||localStorage.access_token||'';}
  function auth(json){var h={Authorization:'Bearer '+token()};if(json)h['Content-Type']='application/json';return h;}
  function norm(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
  function settings(){return fetch(API+'/admin/settings',{headers:auth(),cache:'no-store'}).then(function(r){return r.json().then(function(d){if(!r.ok)throw Error('settings '+r.status);return d;});});}
  function saveRole(id,enabled){return settings().then(function(s){var all=s.role_perms&&typeof s.role_perms==='object'?s.role_perms:{};var k=String(id),cur=Array.isArray(all[k])?all[k].slice():[],i=cur.indexOf(RADIO);if(enabled&&i<0)cur.push(RADIO);if(!enabled&&i>=0)cur.splice(i,1);all[k]=Array.from(new Set(cur));return fetch(API+'/admin/settings',{method:'PUT',headers:auth(true),body:JSON.stringify({role_perms:all}),cache:'no-store'});}).then(function(r){if(!r.ok)throw Error('save '+r.status);});}
  function accessPanel(){var nodes=document.querySelectorAll('.t-access,.panel,section,article,main');for(var i=0;i<nodes.length;i++){var t=norm(nodes[i].textContent);if(t.indexOf('سطح دسترسی سمت‌ها به بخش‌های سایت')>=0&&t.indexOf('برای هر سمت تعیین کنید')>=0)return nodes[i];}return null;}
  function roleSelect(p){if(!p)return null;var ss=p.querySelectorAll('select');for(var i=0;i<ss.length;i++){if(ss[i].options&&Array.prototype.some.call(ss[i].options,function(o){return norm(o.textContent).indexOf('یک سمت را انتخاب کنید')>=0;}))return ss[i];}return ss[0]||null;}
  function installAccess(){
    var p=accessPanel(),s=roleSelect(p);if(!p||!s)return;
    var row=p.querySelector('[data-khatyar-site-radio]');
    if(!row){
      row=document.createElement('label');row.setAttribute('data-khatyar-site-radio','1');row.className='row';
      row.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 2px;margin-top:5px;border-bottom:1px solid var(--line,#e4e7ec);font-size:13px;cursor:pointer;direction:rtl;';
      var text=document.createElement('span');text.textContent='📻 بی‌سیم';
      var cb=document.createElement('input');cb.type='checkbox';cb.setAttribute('aria-label','دسترسی به مرکز بی‌سیم');
      row.append(text,cb);
      var buttons=p.querySelectorAll('button'),save=null;
      for(var i=0;i<buttons.length;i++){var bt=norm(buttons[i].textContent);if(bt.indexOf('ذخیره')>=0&&bt.indexOf('دسترسی')>=0){save=buttons[i];break;}}
      /* Put the new permission inside the existing permission list, immediately before its save action. */
      if(save&&save.parentNode)save.parentNode.insertBefore(row,save);else{
        var last=p.querySelector('[data-khatyar-permission-list],.permission-list,.permissions,.access-list');
        if(last)last.appendChild(row);else p.appendChild(row);
      }
      cb.addEventListener('change',function(){var id=s.value;if(!id){cb.checked=false;return;}saveRole(id,cb.checked).catch(function(){cb.checked=!cb.checked;alert('ذخیره دسترسی بی‌سیم ناموفق بود.');});});
    }
    function sync(){var id=s.value;if(!id){row.style.display='none';return;}settings().then(function(x){var pms=x.role_perms&&Array.isArray(x.role_perms[String(id)])?x.role_perms[String(id)]:[];row.querySelector('input').checked=pms.indexOf(RADIO)>=0;row.style.display='flex';}).catch(function(){row.style.display='flex';});}
    if(!s.dataset.khatyarRadioBound){s.dataset.khatyarRadioBound='1';s.addEventListener('change',function(){setTimeout(sync,50);});}
    sync();
  }
  function sidebar(){
    var candidates=document.querySelectorAll('.nav,nav[role="navigation"],aside nav,aside,[class*="sidebar"],[class*="side-bar"]'),best=null,scoreBest=-1;
    for(var i=0;i<candidates.length;i++){
      var t=norm(candidates[i].textContent),score=0;
      if(t.indexOf('داشبورد')>=0)score+=5;if(t.indexOf('ارتباطات')>=0)score+=8;if(t.indexOf('تنظیمات')>=0)score+=3;if(t.indexOf('کاربران')>=0)score+=2;if(t.indexOf('گزارش')>=0)score+=1;
      if(score>scoreBest){scoreBest=score;best=candidates[i];}
    }
    return scoreBest>=10?best:null;
  }
  function communicationContainer(n){
    var els=n.querySelectorAll('a,button,[role="link"],[role="button"],li,div'),anchor=null;
    for(var i=0;i<els.length;i++){if(norm(els[i].textContent)==='ارتباطات'){anchor=els[i];break;}}
    if(!anchor)return null;
    var p=anchor.parentElement;
    var sub=p&&p.querySelector('ul,.submenu,.sub-menu,.children,[data-submenu]');
    if(sub)return {anchor:anchor,box:sub};
    return {anchor:anchor,box:p||n};
  }
  function menuLink(n,key,text,href){var x=n.querySelector('[data-khatyar-radio-menu="'+key+'"]');if(!x){x=document.createElement('a');x.href=href;x.setAttribute('data-khatyar-radio-menu',key);x.dataset.key=RADIO;x.dataset.view='radio';x.textContent=text;x.style.cssText='display:block!important;padding:10px 12px;margin:2px 0;border-radius:8px;color:inherit;text-decoration:none;font:inherit;direction:rtl;';}return x;}
  function installSidebar(){
    var n=sidebar();if(!n)return;var c=communicationContainer(n);if(!c)return;
    var center=menuLink(n,'center','📻 مرکز بی‌سیم','radio-admin.html'),set=menuLink(n,'settings','⚙️ تنظیمات بی‌سیم','radio-admin.html#settings');
    if(c.box===c.anchor.parentElement){c.box.insertBefore(center,c.anchor.nextSibling);c.box.insertBefore(set,center.nextSibling);}else{c.box.appendChild(center);c.box.appendChild(set);}
    center.style.setProperty('display','block','important');set.style.setProperty('display','block','important');
  }
  function installSettingsTab(){
    var tabs=document.querySelectorAll('button,[role="tab"],a');var access=null,existing=null;
    for(var i=0;i<tabs.length;i++){var t=norm(tabs[i].textContent);if(t==='دسترسی‌ها')access=tabs[i];if(t==='تنظیمات بی‌سیم')existing=tabs[i];}
    if(existing)return;
    if(access&&access.parentElement){var a=document.createElement('a');a.href='radio-admin.html#settings';a.textContent='📻 تنظیمات بی‌سیم';a.setAttribute('data-khatyar-radio-settings-tab','1');a.style.cssText='display:inline-flex;align-items:center;justify-content:center;padding:8px 12px;margin:0 4px;border-radius:8px;text-decoration:none;color:inherit;font:inherit;direction:rtl;';access.parentElement.insertBefore(a,access.nextSibling);}
  }
  function run(){installAccess();installSidebar();installSettingsTab();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(run,350);},{once:true});else setTimeout(run,350);
  var timer=0;new MutationObserver(function(){if(timer)return;timer=setTimeout(function(){timer=0;run();},250);}).observe(document.documentElement,{childList:true,subtree:true});
})();