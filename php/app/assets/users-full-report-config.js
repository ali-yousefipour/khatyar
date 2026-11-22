/* User full-report configurator: capture legacy export button without changing React internals. */
(function(){
'use strict';
const API='/api/admin/users/';
const label=/^(?:⤓\s*)?(?:خروجی|گزارش) کامل کاربران(?:\s*\((?:Excel|اکسل)\))?$/iu;
let busy=false;
const css=document.createElement('style');
css.textContent=`
#kh-user-report-modal{position:fixed;inset:0;z-index:2147482600;display:grid;place-items:center;padding:16px;background:#092b2588;direction:rtl;font:14px Vazirmatn,Tahoma,sans-serif}
#kh-user-report-modal[hidden],.kh-ur-fields [hidden]{display:none!important}
.kh-ur-panel{box-sizing:border-box;width:min(750px,100%);max-height:calc(100dvh - 32px);overflow:auto;background:#fff;color:#193c32;border:1px solid #d0e5dc;border-radius:20px;padding:clamp(16px,3vw,24px);box-shadow:0 22px 75px #0004}
.kh-ur-panel h2{margin:0;font-size:19px}.kh-ur-panel p{line-height:1.8;color:#52685f}
.kh-ur-fields{display:grid;grid-template-columns:repeat(auto-fill,minmax(205px,1fr));gap:8px;max-height:320px;overflow:auto;padding:10px;border:1px solid #dbe7e2;border-radius:12px}
.kh-ur-fields label{display:flex;align-items:center;gap:7px;padding:7px;border-radius:8px;background:#f5f9f7;cursor:pointer}
.kh-ur-fields input{accent-color:#087f5b}.kh-ur-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
.kh-ur-panel button,.kh-ur-panel select,.kh-ur-panel input[type=search]{font:inherit;border-radius:10px;padding:9px 12px;border:1px solid #b9d6cc;max-width:100%}
.kh-ur-primary{background:#087f5b;color:#fff;border-color:#087f5b!important}
.kh-ur-controls{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin:12px 0}
.kh-ur-controls label{display:grid;gap:5px}
@media(max-width:500px){.kh-ur-fields{grid-template-columns:1fr;max-height:38dvh}}
`;
document.head.appendChild(css);
function token(){const t=localStorage.getItem('token');if(!t)throw Error('نشست معتبر نیست؛ دوباره وارد شوید.');return t;}
async function request(url,options={}){const headers=new Headers(options.headers||{});headers.set('Authorization','Bearer '+token());const res=await fetch(url,{...options,headers,credentials:'same-origin',cache:'no-store'});if(!res.ok){let msg='خطای سرور ('+res.status+')';try{const data=await res.json();msg=data.error||msg;}catch(_){}throw Error(msg);}return res;}
function el(tag,props={},parent){const node=document.createElement(tag);for(const [k,v]of Object.entries(props)){if(k==='text')node.textContent=v;else if(k==='class')node.className=v;else node.setAttribute(k,v);}if(parent)parent.appendChild(node);return node;}
function open(){if(busy)return;busy=true;
const cover=el('div',{id:'kh-user-report-modal'},document.body);
const box=el('section',{class:'kh-ur-panel',role:'dialog','aria-modal':'true','aria-labelledby':'kh-ur-heading'},cover);
el('h2',{id:'kh-ur-heading',text:'تنظیمات گزارش کامل کاربران'},box);
el('p',{text:'ستون‌های مورد نیاز و نحوه مرتب‌سازی فایل اکسل را انتخاب کنید. تمام فیلدهای هویتی و سفارشی مجاز به‌صورت پیش‌فرض انتخاب شده‌اند.'},box);
const search=el('input',{type:'search',placeholder:'جستجو در نام ستون‌ها','aria-label':'جستجوی ستون'},box);
const actions=el('div',{class:'kh-ur-actions'},box);
const all=el('button',{type:'button',text:'انتخاب همه'},actions);
const none=el('button',{type:'button',text:'حذف انتخاب‌ها'},actions);
const count=el('span',{role:'status'},actions);
const fields=el('div',{class:'kh-ur-fields'},box);
const controls=el('div',{class:'kh-ur-controls'},box);
const sortLabel=el('label',{text:'مرتب‌سازی بر اساس'},controls),sort=el('select',{},sortLabel);
const dirLabel=el('label',{text:'جهت مرتب‌سازی'},controls),dir=el('select',{},dirLabel);
el('option',{value:'asc',text:'صعودی (الف تا ی / کم به زیاد)'},dir);
el('option',{value:'desc',text:'نزولی (ی تا الف / زیاد به کم)'},dir);
const status=el('p',{role:'status','aria-live':'polite'},box);
const foot=el('div',{class:'kh-ur-actions'},box);
const preview=el('button',{type:'button',text:'پیش‌نمایش داده‌ها'},foot);
const savePreset=el('button',{type:'button',text:'ذخیره تنظیمات این مرورگر'},foot);
const reset=el('button',{type:'button',text:'بازنشانی'},foot);
const previewArea=el('div',{'aria-live':'polite'},box);
const save=el('button',{type:'button',class:'kh-ur-primary',text:'دریافت فایل اکسل'},foot);
const close=el('button',{type:'button',text:'انصراف'},foot);
const dismiss=()=>{cover.remove();busy=false;};
close.onclick=dismiss;
cover.addEventListener('click',e=>{if(e.target===cover)dismiss();});
const escape=e=>{if(e.key==='Escape'){e.preventDefault();dismiss();lastFocus?.focus();}};cover.addEventListener('keydown',escape);
let lastFocus=document.activeElement;
const originalDismiss=dismiss;
close.addEventListener('click',()=>lastFocus?.focus());
save.disabled=true;
status.textContent='در حال دریافت فهرست فیلدها…';
request(API+'full-report-options').then(r=>r.json()).then(data=>{
 const columns=Array.isArray(data.columns)?data.columns:[];
 if(!columns.length)throw Error('فیلدی برای گزارش دریافت نشد');
 const checks=[];
 const storageKey='khatyar.users.full-report.selection.v2';
 let stored=null;
 try{stored=JSON.parse(localStorage.getItem(storageKey)||'null');}catch(_){}
 const savedOrder=Array.isArray(stored?.columns)?stored.columns:[];
 columns.sort((a,b)=>{const ai=savedOrder.indexOf(a.key),bi=savedOrder.indexOf(b.key);return (ai<0?9999:ai)-(bi<0?9999:bi);});
 columns.forEach((column,i)=>{
   const label=el('label',{},fields);
   const check=el('input',{type:'checkbox',value:column.key},label);
   check.checked=!stored||!Array.isArray(stored.columns)||stored.columns.includes(column.key);
   el('span',{text:column.label+' · '+(column.group||'سایر')},label);
   checks.push(check);check.addEventListener('change',update);
   const move=(step)=>{const from=checks.indexOf(check),to=from+step;if(to<0||to>=checks.length)return;const other=checks[to];checks[from]=other;checks[to]=check;
     if(step<0)fields.insertBefore(label,other.parentElement);
     else fields.insertBefore(other.parentElement,label);
     updateCount();};
   const up=el('button',{type:'button',text:'↑','aria-label':'انتقال ستون به بالا'},label);
   const down=el('button',{type:'button',text:'↓','aria-label':'انتقال ستون به پایین'},label);
   up.onclick=e=>{e.preventDefault();e.stopPropagation();move(-1);};
   down.onclick=e=>{e.preventDefault();e.stopPropagation();move(1);};
   el('option',{value:column.key,text:column.label},sort);
 });
 sort.value=(stored&&columns.some(c=>c.key===stored.sort))?stored.sort:(columns.some(c=>c.key==='id')?'id':columns[0].key);
 dir.value=stored?.direction==='desc'?'desc':'asc';
 const updateCount=()=>{const n=checks.filter(c=>c.checked).length;count.textContent=n.toLocaleString('fa-IR')+' ستون انتخاب شده';save.disabled=n===0;};
 function update(){updateCount();}
 all.onclick=()=>{checks.forEach(c=>c.checked=true);updateCount();};
 none.onclick=()=>{checks.forEach(c=>c.checked=false);updateCount();};
 search.oninput=()=>{const q=search.value.trim().toLocaleLowerCase('fa');checks.forEach(c=>{c.parentElement.hidden=!c.parentElement.textContent.toLocaleLowerCase('fa').includes(q);});};
 updateCount();status.textContent='';
 const payload=()=>({columns:checks.filter(c=>c.checked).map(c=>c.value),sort:sort.value,direction:dir.value});
 savePreset.onclick=()=>{localStorage.setItem(storageKey,JSON.stringify(payload()));status.textContent='تنظیمات ستون‌ها در این مرورگر ذخیره شد.';};
 reset.onclick=()=>{localStorage.removeItem(storageKey);checks.forEach(c=>c.checked=true);sort.value=columns.some(c=>c.key==='id')?'id':columns[0].key;dir.value='asc';updateCount();status.textContent='تمام ستون‌ها فعال شدند؛ برای بازگرداندن ترتیب اولیه، گزارش را دوباره باز کنید.';};
 preview.onclick=async()=>{try{
   preview.disabled=true;previewArea.replaceChildren();status.textContent='در حال آماده‌سازی پیش‌نمایش…';
   const res=await request(API+'full-report-export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload(),preview:true})});
   const data=await res.json();const heading=el('p',{text:(Number(data.count)||0).toLocaleString('fa-IR')+' کاربر، '+(data.columns||[]).length.toLocaleString('fa-IR')+' ستون'},previewArea);
   heading.style.fontWeight='700';
   const wrap=el('div',{},previewArea);wrap.style.cssText='overflow:auto;max-height:280px';
   const table=el('table',{},wrap);table.style.cssText='border-collapse:collapse;min-width:100%';
   const head=el('tr',{},el('thead',{},table));(data.columns||[]).forEach(v=>{const th=el('th',{text:v},head);th.style.cssText='padding:8px;border:1px solid #ddd;white-space:nowrap';});
   const tbody=el('tbody',{},table);(data.sample||[]).forEach(record=>{const tr=el('tr',{},tbody);record.forEach(v=>{const td=el('td',{text:String(v??'')},tr);td.style.cssText='padding:7px;border:1px solid #ddd;white-space:pre-wrap';});});
   status.textContent='پیش‌نمایش از همان منبع داده خروجی تهیه شد.';
 }catch(err){status.textContent=err.message;}finally{preview.disabled=false;}};
 save.onclick=async()=>{try{
   save.disabled=true;close.disabled=true;status.textContent='در حال ساخت فایل اکسل…';
   const res=await request(API+'full-report-export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload())});
   const blob=await res.blob();const href=URL.createObjectURL(blob);
   const a=document.createElement('a');a.href=href;a.download='گزارش_کامل_کاربران.xlsx';document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(href),10000);originalDismiss();lastFocus?.focus();
 }catch(err){status.textContent=err.message;save.disabled=false;close.disabled=false;}};
 search.focus();
}).catch(err=>{status.textContent=err.message;save.disabled=true;});
}
document.addEventListener('click',function(event){
 const button=event.target.closest?.('button');
 if(!button||!label.test((button.textContent||'').replace(/\s+/g,' ').trim()))return;
 event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 open();
},true);
})();
