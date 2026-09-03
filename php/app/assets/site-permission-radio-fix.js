/* خطیار — بازیابی «بی‌سیم» در دسترسی سمت‌ها و سایدبار */
(function(){
  'use strict';
  var API='/api';
  function token(){return localStorage.token||'';}
  function auth(){return {Authorization:'Bearer '+token()};}
  function norm(s){return String(s||'').replace(/\s+/g,' ').trim();}
  function roleId(){
    try{var p=(token().split('.')[1]||'').replace(/-/g,'+').replace(/_/g,'/');if(p){p+='==='.slice((p.length+3)%4);var j=JSON.parse(decodeURIComponent(escape(atob(p))));if(j.role_id!=null)return String(j.role_id);if(j.roleId!=null)return String(j.roleId);if(j.role&&j.role.id!=null)return String(j.role.id);}}catch(e){}
    for(var i=0;i<4;i++){var k=['role_id','roleId','user_role_id','current_role_id'][i],v=localStorage.getItem(k);if(v)return String(v);}
    return null;
  }
  async function settings(){var r=await fetch(API+'/admin/settings',{headers:auth(),cache:'no-store'});if(!r.ok)throw Error('settings '+r.status);return r.json();}
  async function save(id,perms){var s=await settings(),all=s.role_perms&&typeof s.role_perms==='object'?s.role_perms:{};all[String(id)]=Array.from(new Set(perms));var r=await fetch(API+'/admin/settings',{method:'PUT',headers:{'content-type':'application/json',...auth()},body:JSON.stringify({role_perms:all})});if(!r.ok)throw Error('save '+r.status);}
  function accessPanel(){return Array.prototype.find.call(document.querySelectorAll('.panel,section,article,div'),function(el){var t=norm(el.textContent);return t.indexOf('سطح دسترسی سمت‌ها به بخش‌های سایت')>=0||t.indexOf('برای هر سمت تعیین کنید کدام بخش‌های پنل را ببیند')>=0;});}
  function installPermission(){
    var p=accessPanel();if(!p)return;var sel=Array.prototype.find.call(p.querySelectorAll('select'),function(s){return Array.prototype.some.call(s.options||[],function(o){return norm(o.textContent).indexOf('یک سمت را انتخاب کنید')>=0;});})||p.querySelector('select');if(!sel)return;
    var row=p.querySelector('[data-khatyar-radio-perm]');
    if(!row){row=document.createElement('label');row.dataset.khatyarRadioPerm='1';row.className='row';row.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 2px;margin-top:5px;border-bottom:1px solid var(--line,#e4e7ec);font-size:13px;cursor:pointer;';var text=document.createElement('span');text.textContent='بی‌سیم';var cb=document.createElement('input');cb.type='checkbox';row.append(text,cb);var saveBtn=Array.prototype.find.call(p.querySelectorAll('button'),function(b){return /ذخیره/.test(norm(b.textContent))&&/دسترسی/.test(norm(b.textContent));});if(saveBtn&&saveBtn.parentNode)saveBtn.parentNode.insertBefore(row,saveBtn);else p.appendChild(row);}
    var cb=row.querySelector('input');
    if(cb&&!cb.dataset.bound){cb.dataset.bound='1';cb.addEventListener('change',async function(){var id=sel.value;if(!id){cb.checked=false;return;}try{var s=await settings(),all=s.role_perms&&typeof s.role_perms==='object'?s.role_perms:{},cur=Array.isArray(all[String(id)])?all[String(id)].slice():[],i=cur.indexOf('radio');if(cb.checked&&i<0)cur.push('radio');if(!cb.checked&&i>=0)cur.splice(i,1);await save(id,cur);if(String(id)===String(roleId()))installSidebar(cur);else installSidebar();}catch(e){cb.checked=!cb.checked;alert('ذخیره دسترسی بی‌سیم ناموفق بود.');}});}
    var sync=async function(){var id=sel.value;if(!id){row.style.display='none';return;}try{var s=await settings(),pms=s.role_perms&&Array.isArray(s.role_perms[String(id)])?s.role_perms[String(id)]:[];cb.checked=pms.indexOf('radio')>=0;row.style.display='flex';}catch(e){row.style.display='none';}};
    if(!sel.dataset.radioSync){sel.dataset.radioSync='1';sel.addEventListener('change',function(){setTimeout(sync,30);});}sync();
  }
  async function installSidebar(forced){
    var nav=document.querySelector('.nav,nav[role="navigation"],aside nav,aside');if(!nav)return;
    var a=document.querySelector('[data-khatyar-radio-link]');
    if(!a){a=document.createElement('a');a.href='radio-admin.html';a.dataset.view='radio';a.dataset.key='radio';a.dataset.khatyarRadioLink='1';a.textContent='📻 بی‌سیم';a.style.cssText='display:block;padding:10px 12px;margin:2px 0;border-radius:8px;color:inherit;text-decoration:none;font:inherit';var settingsLink=Array.prototype.find.call(nav.querySelectorAll('a,button'),function(x){return norm(x.textContent)==='تنظیمات';});if(settingsLink)settingsLink.parentNode.insertBefore(a,settingsLink);else nav.appendChild(a);}
    try{var rid=roleId();if(rid==null){a.style.display='none';return;}var perms=forced||((await settings()).role_perms||{})[String(rid)]||[];a.style.display=Array.isArray(perms)&&perms.indexOf('radio')>=0?'block':'none';}catch(e){a.style.display='none';}
  }
  function run(){installPermission();installSidebar();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(run,350);},{once:true});else setTimeout(run,350);
  var timer=0;new MutationObserver(function(){if(timer)return;timer=setTimeout(function(){timer=0;run();},120);}).observe(document.documentElement,{childList:true,subtree:true});
})();
