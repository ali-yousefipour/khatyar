/* خطیار — بازیابی قطعی «بی‌سیم» در تنظیمات دسترسی و سایدبار */
(function(){
  'use strict';
  var API='/api';
  function token(){return localStorage.token||localStorage.access_token||'';}
  function auth(){return {Authorization:'Bearer '+token()};}
  function norm(s){return String(s||'').replace(/\s+/g,' ').trim();}
  async function settings(){var r=await fetch(API+'/admin/settings',{headers:auth(),cache:'no-store'});if(!r.ok)throw Error('settings '+r.status);return r.json();}
  function accessPanel(){
    var nodes=document.querySelectorAll('.panel,section,article,main,div');
    for(var i=0;i<nodes.length;i++){var t=norm(nodes[i].textContent);if(t.indexOf('سطح دسترسی سمت‌ها به بخش‌های سایت')>=0||t.indexOf('برای هر سمت تعیین کنید کدام بخش‌های پنل را ببیند')>=0)return nodes[i];}
    return null;
  }
  function roleSelect(p){return p&&p.querySelector('select');}
  function installPermission(){
    var p=accessPanel();if(!p)return;
    var sel=roleSelect(p);if(!sel)return;
    var row=p.querySelector('[data-khatyar-radio-perm]');
    if(!row){
      row=document.createElement('label');row.dataset.khatyarRadioPerm='1';row.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 2px;margin-top:8px;border-top:1px solid #eef1f5;font-size:13px;cursor:pointer;';
      var text=document.createElement('span');text.textContent='📻 بی‌سیم';var cb=document.createElement('input');cb.type='checkbox';row.append(text,cb);
      var buttons=p.querySelectorAll('button');var inserted=false;
      for(var i=0;i<buttons.length;i++){if(/ذخیره/.test(norm(buttons[i].textContent))){buttons[i].parentNode.insertBefore(row,buttons[i]);inserted=true;break;}}
      if(!inserted)p.appendChild(row);
    }
    var cb=row.querySelector('input');
    async function sync(){if(!sel.value){row.style.display='none';return;}try{var s=await settings(),rp=s.role_perms&&typeof s.role_perms==='object'?s.role_perms:{},cur=Array.isArray(rp[String(sel.value)])?rp[String(sel.value)]:[];cb.checked=cur.indexOf('radio')>=0;row.style.display='flex';}catch(e){row.style.display='flex';}}
    if(!cb.dataset.bound){cb.dataset.bound='1';cb.addEventListener('change',async function(){try{var s=await settings(),rp=s.role_perms&&typeof s.role_perms==='object'?s.role_perms:{},cur=Array.isArray(rp[String(sel.value)])?rp[String(sel.value)].slice():[],i=cur.indexOf('radio');if(cb.checked&&i<0)cur.push('radio');if(!cb.checked&&i>=0)cur.splice(i,1);rp[String(sel.value)]=cur;var r=await fetch(API+'/admin/settings',{method:'PUT',headers:Object.assign({'Content-Type':'application/json'},auth()),body:JSON.stringify({role_perms:rp})});if(!r.ok)throw Error();}catch(e){cb.checked=!cb.checked;alert('ذخیره دسترسی بی‌سیم ناموفق بود.');}});}
    if(!sel.dataset.radioBound){sel.dataset.radioBound='1';sel.addEventListener('change',sync);}sync();
  }
  function installSidebar(){
    var nav=document.querySelector('.nav,nav[role="navigation"],aside nav,aside');if(!nav)return;
    var a=document.querySelector('[data-khatyar-radio-link]');
    if(!a){a=document.createElement('a');a.href='radio-admin.html';a.dataset.view='radio';a.dataset.key='radio';a.dataset.khatyarRadioLink='1';a.textContent='📻 مرکز بی‌سیم';a.style.cssText='display:block;padding:10px 12px;margin:2px 0;border-radius:8px;color:inherit;text-decoration:none;font:inherit;';var settingsLink=Array.prototype.find.call(nav.querySelectorAll('a,button'),function(x){return /تنظیمات/.test(norm(x.textContent));});if(settingsLink&&settingsLink.parentNode)settingsLink.parentNode.insertBefore(a,settingsLink);else nav.appendChild(a);}
    a.style.display='block';
  }
  function run(){installPermission();installSidebar();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(run,300);},{once:true});else setTimeout(run,300);
  var timer=0;if(document.documentElement)new MutationObserver(function(){if(timer)return;timer=setTimeout(function(){timer=0;run();},150);}).observe(document.documentElement,{childList:true,subtree:true});
})();
