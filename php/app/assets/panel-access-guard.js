/* Existing panel section-access guard. No parallel permission store is introduced. */
(function(){'use strict';
const API='/api';
const token=()=>({Authorization:'Bearer '+(localStorage.token||'')});
let rolePerms=null, roleId=null;
const MENU=[
 ['dashboard','داشبورد'],['reportscenter','مرکز گزارش‌ها'],['health','سلامت سامانه'],['map','نقشهٔ زنده'],['present','آمار حاضرین'],['presentchart','نمودار زندهٔ حاضرین'],['missiondashboard','داشبورد عملیات میدانی'],['citydashboard','داشبورد مدیریتی کل‌شهر'],['missiontemplates','موتور مأموریت — الگوها و تنظیمات'],['scoreengine','موتور امتیازدهی'],['driverservicereport','عملکرد و تذکرات تاکسیران'],['officials','حضور مسئولین'],['covertselfies','سلفی‌های نامحسوس'],['messages','پیام‌رسانی'],['messengercenter','مرکز ارسال ربات‌ها'],['companyrequests','مدارک ارسالی شرکت'],['salaryslips','بارگذاری فیش حقوقی'],['users','کاربران'],['zones','منطقه‌بندی'],['org','چارت سازمانی'],['drivers','رانندگان'],['platetraining','پلاک‌خوان'],['lines','خطوط'],['bills','آبونمان'],['config','تذکر/چک‌لیست'],['forms','فرم‌ساز'],['reports','گردش گزارش'],['report','گزارش‌گیری'],['perfreport','گزارش عملکرد پرسنل'],['welfare','رفاهیات روابط عمومی'],['cultural','فعالیت‌های فرهنگی'],['excel','ورود اکسل'],['logs','لاگ'],['useract','فعالیت کاربران'],['commitments','تعهدات انضباطی'],['tempdrivers','رانندگان موقت'],['presence','صحت‌سنجی حضور'],['attendance','حضور نیروها'],['shifts','شیفت و کارکرد'],['attreport','گزارش تردد پرسنل'],['workpolicy','سیاست کاری'],['requests','گزارش درخواست‌ها'],['outages','قطعی سیستم نوبت‌دهی'],['customfields','فیلدهای سفارشی'],['inventory','اقلام تحویلی'],['sms','ارسال پیامک'],['smslog','تاریخچهٔ پیامک'],['appitems','آیتم‌های اپ هر سمت'],['cronstatus','پایش سلامت کرون‌ها'],['activesessions','جلسات فعال کاربران'],['settings','تنظیمات'],['radio','بی‌سیم']
];
function allowed(k){return Array.isArray(rolePerms)&&rolePerms.includes(k)}
function hideUnauthorized(){
 document.querySelectorAll('.nav a,.nav button').forEach(el=>{
   const k=el.dataset.view||el.getAttribute('data-view')||el.dataset.key||el.getAttribute('data-key');
   if(k&&MENU.some(x=>x[0]===k)) el.style.display=allowed(k)?'':'none';
 });
}
function addRadioToExistingAccessPanel(){
 const text=[...document.querySelectorAll('h1,h2,h3,p,span,div')].find(x=>x.textContent&&x.textContent.trim()==='برای هر سمت تعیین کنید کدام بخش‌های پنل را ببیند. اگر برای سمتی چیزی تعریف نشود، همهٔ بخش‌ها در دسترس است.');
 if(!text||document.querySelector('[data-khatyar-radio-perm]'))return;
 const parent=text.parentElement;
 const labels=[...parent.querySelectorAll('label')];
 const row=document.createElement('label');row.dataset.khatyarRadioPerm='1';row.className='row';row.style.cssText='justify-content:space-between;padding:6px 2px;border-bottom:1px solid var(--line)';
 const span=document.createElement('span');span.style.fontSize='13px';span.textContent='بی‌سیم';
 const cb=document.createElement('input');cb.type='checkbox';cb.checked=allowed('radio');cb.addEventListener('change',async()=>{const s=await fetch(API+'/admin/settings',{headers:token(),cache:'no-store'}).then(r=>r.json());const p=s.role_perms||{};const id=String(roleId);const cur=Array.isArray(p[id])?p[id].slice():[];const i=cur.indexOf('radio');if(cb.checked&&i<0)cur.push('radio');if(!cb.checked&&i>=0)cur.splice(i,1);p[id]=cur;await fetch(API+'/admin/settings',{method:'POST',headers:{'content-type':'application/json',...token()},body:JSON.stringify({role_perms:p})});rolePerms=cur;hideUnauthorized();});row.append(span,cb);const save=[...parent.querySelectorAll('button')].find(b=>b.textContent.includes('ذخیره'));(save||parent).before(row);
}
async function load(){
 try{
   const me=await fetch(API+'/session/me',{headers:token(),cache:'no-store'}).then(r=>r.ok?r.json():null);if(!me)return;
   roleId=me.role_id;
   const s=await fetch(API+'/admin/settings',{headers:token(),cache:'no-store'}).then(r=>r.json());const all=s.role_perms||{};const has=Object.prototype.hasOwnProperty.call(all,String(roleId))||Object.prototype.hasOwnProperty.call(all,roleId);
   /* Explicit policy: missing role configuration means no section is allowed. */
   rolePerms=has&&Array.isArray(all[roleId]||all[String(roleId)])?(all[roleId]||all[String(roleId)]):[];
   hideUnauthorized();addRadioToExistingAccessPanel();
   new MutationObserver(()=>{hideUnauthorized();addRadioToExistingAccessPanel()}).observe(document.body,{childList:true,subtree:true});
 }catch(e){}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(load,500));else setTimeout(load,500);
})();