/* خطیار — بازیابی «بی‌سیم» در تنظیمات دسترسی و سایدبار */
(function(){
  'use strict';
  var API='/api';
  function token(){return localStorage.token||localStorage.access_token||'';}
  function auth(){return {Authorization:'Bearer '+token()};}
  function norm(s){return String(s||'').replace(/\s+/g,' ').trim();}
  function settings(){return fetch(API+'/admin/settings',{headers:auth(),cache:'no-store'}).then(function(r){return r.json().then(function(d){if(!r.ok)throw Error('settings '+r.status);return d;});});}
  function saveRole(id,enabled){return settings().then(function(s){var all=s.role_perms&&typeof s.role_perms==='object'?s.role_perms:{};var cur=Array.isArray(all[String(id)])?all[String(id)].slice():[];var i=cur.indexOf('radio');if(enabled&&i<0)cur.push('radio');if(!enabled&&i>=0)cur.splice(i,1);all[String(id)]=Array.from(new Set(cur));return fetch(API+'/admin/settings',{method:'PUT',headers:Object.assign({'Content-Type':'application/json'},auth()),body:JSON.stringify({role_perms:all}),cache:'no-store'});}).then(function(r){if(!r.ok)throw Error('save');});}
  function accessPanel(){var nodes=document.querySelectorAll('.t-access,.panel,section,article,main,div');for(var i=0;i<nodes.length;i++){var t=norm(nodes[i].textContent);if(t.indexOf('سطح دسترسی سمت‌ها به بخش‌های سایت')>=0)return nodes[i];}return null;}
  function roleSelect(p){if(!p)return null;var sels=p.querySelectorAll('select');for(var i=0;i<sels.length;i++)if(sels[i].options&&sels[i].options.length)return sels[i];return null;}
  function row(panel,select,key,text){var r=panel.querySelector('[data-khatyar-site-radio="'+key+'"]');if(r)return r;r=document.createElement('label');r.setAttribute('data-khatyar-site-radio',key);r.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 2px;margin-top:5px;border-bottom:1px solid #e4e7ec;font-size:13px;cursor:pointer;';var s=document.createElement('span');s.textContent=text;var c=document.createElement('input');c.type='checkbox';r.append(s,c);var buttons=panel.querySelectorAll('button'),done=false;for(var i=0;i<buttons.length;i++){if(/ذخیره/.test(norm(buttons[i].textContent))&&/دسترسی/.test(norm(buttons[i].textContent))){buttons[i].parentNode.insertBefore(r,buttons[i]);done=true;break;}}if(!done)panel.appendChild(r);c.addEventListener('change',function(){if(!select.value){c.checked=false;return;}saveRole(select.value,c.checked).catch(function(){c.checked=!c.checked;alert('ذخیره دسترسی بی‌سیم ناموفق بود.');});});return r;}
  function syncAccess(){var p=accessPanel(),s=roleSelect(p);if(!p||!s)return;var center=row(p,s,'center','📻 مرکز بی‌سیم (شنود کانال‌ها)'),settingsRow=row(p,s,'settings','⚙️ تنظیمات بی‌سیم (مدیریت کانال‌ها)');function sync(){if(!s.value){center.style.display='none';settingsRow.style.display='none';return;}settings().then(function(x){var perms=x.role_perms&&Array.isArray(x.role_perms[String(s.value)])?x.role_perms[String(s.value)]:[],on=perms.indexOf('radio')>=0;center.querySelector('input').checked=on;settingsRow.querySelector('input').checked=on;center.style.display='flex';settingsRow.style.display='flex';}).catch(function(){center.style.display='flex';settingsRow.style.display='flex';});}if(!s.dataset.khatyarRadioBound){s.dataset.khatyarRadioBound='1';s.addEventListener('change',function(){setTimeout(sync,25);});}sync();}
  function nav(){return document.querySelector('.nav')||document.querySelector('nav[role="navigation"]')||document.querySelector('aside nav')||document.querySelector('aside');}
  function communicationAnchor(n){
    var es=n.querySelectorAll('a,button,[role="link"],[role="button"]'),last=null;
    for(var i=0;i<es.length;i++){
      var t=norm(es[i].textContent);
      if(t==='ارتباطات'||/^(ارسال پیامک|ارسال پیام در ربات‌ها|پیام‌رسانی|مرکز ارسال ربات‌ها)$/.test(t))last=es[i];
    }
    return last;
  }
  function ensureLink(n,key,text,href){var x=n.querySelector('[data-khatyar-radio-menu="'+key+'"]');if(!x){x=document.createElement('a');x.href=href;x.setAttribute('data-khatyar-radio-menu',key);x.dataset.key='radio';x.dataset.view='radio';x.textContent=text;x.style.cssText='display:block!important;padding:10px 12px;margin:2px 0;border-radius:8px;color:inherit;text-decoration:none;font:inherit;';}
    var anchor=communicationAnchor(n);
    if(anchor&&anchor.parentNode){
      var parent=anchor.parentNode;
      if(parent===n){
        if(anchor.nextSibling!==x)parent.insertBefore(x,anchor.nextSibling);
      }else{
        if(x.parentNode!==parent||x.previousSibling!==anchor)parent.insertBefore(x,anchor.nextSibling);
      }
    }else if(x.parentNode!==n){n.appendChild(x);}
    return x;
  }
  function syncSidebar(){var n=nav();if(!n)return;var center=ensureLink(n,'center','📻 مرکز بی‌سیم','radio-admin.html');ensureLink(n,'settings','⚙️ تنظیمات بی‌سیم','radio-admin.html#settings');
    // مرکز و تنظیمات هر دو در گروه «ارتباطات» قرار می‌گیرند و هر دو از مجوز radio پیروی می‌کنند.
    center.setAttribute('aria-label','مرکز بی‌سیم');
  }
  function run(){syncAccess();syncSidebar();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(run,300);},{once:true});else setTimeout(run,300);
  var timer=0;new MutationObserver(function(){if(timer)return;timer=setTimeout(function(){timer=0;run();},180);}).observe(document.documentElement,{childList:true,subtree:true});
})();