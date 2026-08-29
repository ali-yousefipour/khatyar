/* KhatYar existing site-section permission guard. IMPORTANT: this is NOT the app-item permission system. */
(function(){
  'use strict';
  const API='/api';
  const token=()=>localStorage.token||'';
  const auth=()=>({Authorization:'Bearer '+token()});
  let rolePerms=[];
  let roleId=null;
  const MENU=[
    ['dashboard','داشبورد'],['reportscenter','مرکز گزارش‌ها'],['health','سلامت سامانه'],['map','نقشهٔ زنده'],['present','آمار حاضرین'],['presentchart','نمودار زندهٔ حاضرین'],
    ['missiondashboard','داشبورد عملیات میدانی'],['citydashboard','داشبورد مدیریتی کل‌شهر'],['missiontemplates','موتور مأموریت — الگوها و تنظیمات'],['scoreengine','موتور امتیازدهی'],['driverservicereport','عملکرد و تذکرات تاکسیران'],['officials','حضور مسئولین'],['covertselfies','سلفی‌های نامحسوس'],
    ['messages','پیام‌رسانی'],['messengercenter','مرکز ارسال ربات‌ها'],['companyrequests','مدارک ارسالی شرکت'],['salaryslips','بارگذاری فیش حقوقی'],['users','کاربران'],['zones','منطقه‌بندی'],['org','چارت سازمانی'],['drivers','رانندگان'],['platetraining','پلاک‌خوان'],['lines','خطوط'],['bills','آبونمان'],['config','تذکر/چک‌لیست'],['forms','فرم‌ساز'],['reports','گردش گزارش'],['report','گزارش‌گیری'],['perfreport','گزارش عملکرد پرسنل'],['welfare','رفاهیات روابط عمومی'],['cultural','فعالیت‌های فرهنگی'],['excel','ورود اکسل'],['logs','لاگ'],['useract','فعالیت کاربران'],['commitments','تعهدات انضباطی'],['tempdrivers','رانندگان موقت'],['presence','صحت‌سنجی حضور'],['attendance','حضور نیروها'],['shifts','شیفت و کارکرد'],['attreport','گزارش تردد پرسنل'],['workpolicy','سیاست کاری'],['requests','گزارش درخواست‌ها'],['outages','قطعی سیستم نوبت‌دهی'],['customfields','فیلدهای سفارشی'],['inventory','اقلام تحویلی'],['sms','ارسال پیامک'],['smslog','تاریخچهٔ پیامک'],['appitems','آیتم‌های اپ هر سمت'],['cronstatus','پایش سلامت کرون‌ها'],['activesessions','جلسات فعال کاربران'],['radio','بی‌سیم'],['settings','تنظیمات']
  ];
  const allowed=k=>roleId!=null && rolePerms.includes(k);
  function jwtPayload(){
    try{
      const raw=(token()||'').split('.')[1];
      if(!raw)return null;
      const b64=raw.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((raw.length+3)%4);
      return JSON.parse(decodeURIComponent(escape(atob(b64))));
    }catch(e){return null;}
  }
  function localRole(){
    const keys=['role_id','roleId','user_role_id','current_role_id'];
    for(const k of keys){const v=localStorage.getItem(k);if(v!==null&&v!=='')return v;}
    for(const k of ['user','currentUser','auth_user','me']){
      try{const v=JSON.parse(localStorage.getItem(k)||'null');if(v){const r=v.role_id??v.roleId??v.role?.id;if(r!=null)return r;}}catch(e){}
    }
    return null;
  }
  async function getSettings(){
    const r=await fetch(API+'/admin/settings',{headers:auth(),cache:'no-store'});
    if(!r.ok)throw new Error('settings '+r.status);
    return r.json();
  }
  function findAccessPanel(){
    return [...document.querySelectorAll('.panel')].find(p=>{
      const t=(p.textContent||'').replace(/\s+/g,' ');
      return t.includes('سطح دسترسی سمت‌ها به بخش‌های سایت')||t.includes('برای هر سمت تعیین کنید کدام بخش‌های پنل را ببیند');
    })||null;
  }
  function findRoleSelect(panel){
    if(!panel)return null;
    return [...panel.querySelectorAll('select')].find(s=>[...s.options].some(o=>(o.textContent||'').includes('یک سمت را انتخاب کنید')))||null;
  }
  async function saveRolePerms(id,cur){
    const s=await getSettings();
    const p=s.role_perms&&typeof s.role_perms==='object'?s.role_perms:{};
    p[String(id)]=cur;
    const r=await fetch(API+'/admin/settings',{method:'PUT',headers:{'content-type':'application/json',...auth()},body:JSON.stringify({role_perms:p})});
    if(!r.ok)throw new Error('save '+r.status);
  }
  async function syncRadioPermission(){
    const panel=findAccessPanel();
    const select=findRoleSelect(panel);
    const row=panel&&panel.querySelector('[data-khatyar-radio-perm]');
    if(!panel||!select||!row)return;
    const id=select.value;
    if(!id){row.style.display='none';return;}
    try{
      const s=await getSettings();
      const p=s.role_perms||{};
      const cur=Array.isArray(p[String(id)])?p[String(id)]:[];
      row.querySelector('input').checked=cur.includes('radio');
      row.style.display='flex';
    }catch(e){row.style.display='none';}
  }
  function addRadioPermissionRow(){
    const panel=findAccessPanel();
    const select=findRoleSelect(panel);
    if(!panel||!select)return;
    let row=panel.querySelector('[data-khatyar-radio-perm]');
    if(!row){
      row=document.createElement('label');
      row.dataset.khatyarRadioPerm='1';
      row.className='row';
      row.style.cssText='justify-content:space-between;padding:6px 2px;border-bottom:1px solid var(--line)';
      const span=document.createElement('span');span.style.fontSize='13px';span.textContent='بی‌سیم';
      const cb=document.createElement('input');cb.type='checkbox';
      cb.addEventListener('change',async()=>{
        const id=select.value;if(!id){cb.checked=false;return;}
        try{
          const s=await getSettings();const p=s.role_perms||{};const key=String(id);const cur=Array.isArray(p[key])?p[key].slice():[];
          const i=cur.indexOf('radio');if(cb.checked&&i<0)cur.push('radio');if(!cb.checked&&i>=0)cur.splice(i,1);
          await saveRolePerms(key,cur);if(String(id)===String(roleId))rolePerms=cur;apply();
        }catch(e){cb.checked=!cb.checked;alert('ذخیره دسترسی بی‌سیم ناموفق بود.');}
      });
      row.append(span,cb);
      const save=[...panel.querySelectorAll('button')].find(b=>(b.textContent||'').includes('ذخیرهٔ دسترسی‌ها'));
      (save||panel).before(row);
    }
    if(!select.dataset.khatyarRadioBound){select.dataset.khatyarRadioBound='1';select.addEventListener('change',()=>setTimeout(syncRadioPermission,0));}
    syncRadioPermission();
  }
  function keyFor(el){
    let k=el.dataset.view||el.dataset.key||el.getAttribute('data-view')||el.getAttribute('data-key');
    if(k&&MENU.some(x=>x[0]===k))return k;
    const t=(el.textContent||'').replace(/\s+/g,' ').trim();
    const hit=MENU.find(x=>t===x[1]||t.includes(x[1]));
    return hit?hit[0]:null;
  }
  function addRadioSidebar(){
    if(!allowed('radio')||document.querySelector('[data-khatyar-radio-link]'))return;
    const nav=document.querySelector('.nav,nav[role="navigation"],aside nav,aside');if(!nav)return;
    const a=document.createElement('a');a.href='radio-admin.html';a.dataset.view='radio';a.dataset.key='radio';a.dataset.khatyarRadioLink='1';a.textContent='📻 بی‌سیم';a.style.cssText='display:block;padding:10px 12px;margin:2px 0;border-radius:8px;color:inherit;text-decoration:none;font:inherit';
    const settings=[...nav.querySelectorAll('a,button')].find(x=>(x.textContent||'').replace(/\s+/g,' ').trim()==='تنظیمات');
    if(settings)settings.before(a);else nav.appendChild(a);
  }
  function apply(){
    document.querySelectorAll('.nav a,.nav button,nav[role="navigation"] a,nav[role="navigation"] button,aside a,aside button').forEach(el=>{
      const k=keyFor(el);if(k)el.style.display=allowed(k)?'':'none';
    });
    const radio=document.querySelector('[data-khatyar-radio-link]');if(radio)radio.style.display=allowed('radio')?'':'none';
    addRadioSidebar();
  }
  async function load(){
    try{
      const jp=jwtPayload();
      roleId=jp&&(jp.role_id??jp.roleId??jp.role?.id);
      if(roleId==null)roleId=localRole();
      /* Never fall back to /session/me: that endpoint is not part of KhatYar's current API. */
      if(roleId==null){rolePerms=[];apply();return;}
      const s=await getSettings();
      const all=s.role_perms&&typeof s.role_perms==='object'?s.role_perms:{};
      const p=all[String(roleId)];
      /* Explicit policy: missing/empty role configuration means NO site sections. */
      rolePerms=Array.isArray(p)?p:[];
      apply();
      addRadioPermissionRow();
      new MutationObserver(()=>{apply();addRadioPermissionRow();}).observe(document.body,{childList:true,subtree:true});
    }catch(e){rolePerms=[];apply();}
  }

  // Dashboard birthday filter: keep only birthdays on today or later in the current Jalali month.
  // Recommitted for deployment verification; the backend still returns `passed` unchanged.
  (function installBirthdayDashboardFilter(){
    const originalFetch=window.fetch;
    if(typeof originalFetch!=='function')return;
    window.fetch=function(){
      return originalFetch.apply(this,arguments).then(async response=>{
        try{
          const input=arguments[0];
          const rawUrl=typeof input==='string' ? input : (input&&input.url);
          const url=new URL(rawUrl||'',window.location.href);
          if(url.pathname==='/api/admin/birthdays-month' && response.ok){
            const data=await response.clone().json();
            if(data && Array.isArray(data.people)){
              const today=Number(data.today);
              data.people=data.people.filter(person=>{
                const daysLeft=Number(person&&person.days_left);
                if(Number.isFinite(daysLeft))return daysLeft>=0;
                const day=Number(person&&person.day);
                return Number.isFinite(day) && Number.isFinite(today) && day>=today;
              });
              data.count=data.people.length;
              const headers=new Headers(response.headers);
              headers.set('content-type','application/json; charset=utf-8');
              return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers});
            }
          }
        }catch(e){}
        return response;
      });
    };
  })();

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(load,300));else setTimeout(load,300);
})();