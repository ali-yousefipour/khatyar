/* قراردادهای کاری: authenticated administrative tool, loaded inside the backend panel. */
(function(){
'use strict';
const BASE='/api/admin/work-contracts';
let loaded=false, users=[],templates=[], issued=[];
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=s=>String(s??'').replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
const latin=s=>String(s??'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const standardDate=s=>latin(s).replace(/\//g,'-').trim();
const token=()=>localStorage.getItem('token')||localStorage.token||'';
async function call(path,opts={}){
 const headers={Authorization:'Bearer '+token()};
 if(opts.body&&!(opts.body instanceof FormData))headers['Content-Type']='application/json';
 const r=await fetch(BASE+path,{...opts,headers:{...headers,...opts.headers},cache:'no-store'});
 const data=await r.json().catch(()=>({}));
 if(!r.ok||!data.ok)throw Error(data.error||('خطای سرور '+r.status));
 return data;
}
async function printContract(id){
 // Print-only HTML, with browser's native Save as PDF destination.
 const tab=window.open('about:blank','_blank');
 if(!tab)throw Error('برای چاپ قرارداد، اجازه باز شدن پنجره را فعال کنید');
 try{
   const r=await fetch(BASE+'/'+id+'/print?autoprint=1',{headers:{Authorization:'Bearer '+token()},cache:'no-store'});
   if(!r.ok){const d=await r.json().catch(()=>({}));throw Error(d.error||'آماده‌سازی چاپ ناموفق بود');}
   const html=await r.text();
   tab.document.open();tab.document.write(html);tab.document.close();
 }catch(error){tab.close();throw error;}
}

const style=`

#kh-contract-panel{position:relative;display:none;width:100%;direction:rtl;font:14px Vazirmatn,Tahoma}
#kh-contract-panel.open{display:block}
#kh-contract-panel .wc-box{width:100%;box-sizing:border-box;background:#f5f8f7;border-radius:18px;padding:22px}
#kh-contract-panel h2{margin:0;color:#0d664b}
#kh-contract-panel .wc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin:14px 0}
#kh-contract-panel label{display:block;color:#243b37;font-weight:600}
#kh-contract-panel input,#kh-contract-panel select{font:inherit;width:100%;box-sizing:border-box;margin-top:4px;padding:10px;border:1px solid #cbd6d2;border-radius:9px;background:white;color:#222}
#kh-contract-panel input[type=checkbox]{width:auto}
#kh-contract-panel button{font:inherit;cursor:pointer;padding:9px 16px;border:0;border-radius:9px;background:#147b59;color:white}
#kh-contract-panel .wc-secondary{background:#eef3ef;color:#136345;border:1px solid #cadad0}
#kh-contract-panel .wc-users{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));max-height:230px;overflow:auto;gap:7px;padding:10px;border:1px solid #d5e0dc;background:#fff;border-radius:10px}
#kh-contract-panel .wc-users label{font-weight:400;border:1px solid #e0e7e3;padding:6px;border-radius:7px}
#kh-contract-panel .wc-toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between}
#kh-contract-panel .wc-actions{display:flex;gap:8px;flex-wrap:wrap;margin:13px 0}
#kh-contract-panel .wc-history{max-height:240px;overflow:auto}
#kh-contract-panel table{border-collapse:collapse;width:100%;background:white}
#kh-contract-panel td,#kh-contract-panel th{padding:8px;text-align:right;border:1px solid #e3ece8}
#kh-contract-panel th{background:#edf6f1}
#kh-contract-panel .wc-status{min-height:24px;color:#265a46;margin:12px 0}
#kh-contract-panel small{font-size:11px;color:#697b70}
#kh-contract-panel .wc-editor{margin-top:15px;padding:16px;background:#fff;border:1px solid #d3e3db;border-radius:12px}
#kh-contract-panel .wc-editor[hidden]{display:none}
#kh-contract-panel .wc-delete{background:#ad313a}
#kh-contract-panel .wc-template-list{margin:12px 0}
#kh-contract-panel .wc-template-row{display:flex;justify-content:space-between;align-items:center;padding:8px;border:1px solid #dce8e2;border-radius:8px;margin:5px 0;background:#fff;gap:8px}
#kh-contract-panel .wc-date-entry{display:flex;gap:6px;align-items:center}
#kh-contract-panel .wc-date-entry input{flex:1;min-width:0}
#kh-contract-panel .wc-date-entry button{flex-shrink:0;margin-top:4px}
.wc-jalali-picker{position:fixed;z-index:2147483600;width:312px;max-width:95vw;background:#fff;border:1px solid #d4e4da;border-radius:13px;box-shadow:0 14px 40px #0003;padding:12px;direction:rtl;font:13px Tahoma,sans-serif}
.wc-jalali-picker .wc-cal-head{display:flex;justify-content:space-between;gap:4px;margin-bottom:9px}
.wc-jalali-picker button,.wc-jalali-picker select{font:inherit;padding:6px;border:1px solid #d8e5dc;background:#f5faf7;color:#134e35;border-radius:7px}
.wc-jalali-picker .wc-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
.wc-jalali-picker .wc-cal-grid button{padding:7px 0;border:0;background:white;cursor:pointer}
.wc-jalali-picker .wc-cal-grid button:hover,.wc-jalali-picker .wc-cal-grid button.selected{background:#177c55;color:white}
.wc-jalali-picker .wc-cal-week{color:#64748b;text-align:center;font-size:10px;padding:4px 0}
`;
function dom(){
 if(document.getElementById('kh-contract-panel'))return;
 const st=document.createElement('style');st.textContent=style;document.head.appendChild(st);

 const div=document.createElement('div');div.id='kh-contract-panel';div.innerHTML=`
 <div class="wc-box">
 <div class="wc-toolbar"><h2>ایجاد و پرینت قرارداد کاری</h2></div>
 <p>انتخاب قالب قرارداد، تعیین مدت و صدور نسخه مستقل؛ خروجی فقط از طریق چاپ یا ذخیره PDF ارائه می‌شود.</p>
 <div class="wc-grid">
 <label>قالب قرارداد<select id="wc-template"></select></label>
 <label>تاریخ شروع (شمسی)<div class="wc-date-entry"><input id="wc-start" dir="ltr" placeholder="۱۴۰۵/۰۸/۰۱" maxlength="10"><button class="wc-secondary" type="button" data-calendar-for="wc-start" aria-label="انتخاب تاریخ شروع">📅</button></div></label>
 <label>تاریخ پایان (شمسی)<div class="wc-date-entry"><input id="wc-end" dir="ltr" placeholder="۱۴۰۵/۱۲/۲۹" maxlength="10"><button class="wc-secondary" type="button" data-calendar-for="wc-end" aria-label="انتخاب تاریخ پایان">📅</button></div></label>
 <label>مدت قرارداد<input id="wc-duration" placeholder="مثلاً پنج ماه"></label>
 </div>
 <div class="wc-toolbar"><h3>انتخاب نیروها</h3><label>جستجو<input id="wc-search" placeholder="نام و نام خانوادگی یا سمت"></label></div>
 <div class="wc-actions"><button class="wc-secondary" id="wc-select-all">انتخاب همه نتایج</button><button class="wc-secondary" id="wc-clear">لغو انتخاب</button><span id="wc-selected">۰ نفر</span></div>
 <div id="wc-users" class="wc-users"></div>
 <div class="wc-actions"><button id="wc-generate">صدور قرارداد مجزا برای نیروهای انتخاب‌شده</button><button class="wc-secondary" id="wc-refresh">به‌روزرسانی</button></div>
 <hr><h3>بارگذاری قالب Word و ذخیره در قالب‌های پیش‌فرض</h3>
 <div class="wc-grid"><label>نام قالب جدید<input id="wc-tpl-name" placeholder="مثلاً قرارداد موقت ۱۴۰۵"></label><label>فایل Word (.docx)<input id="wc-tpl-file" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"></label></div>
 <div class="wc-actions"><button id="wc-upload">ذخیره قالب</button></div>
 <div id="wc-templates-list" class="wc-template-list" aria-label="قالب‌های ذخیره‌شده"></div>
 <small>در قالب Word از برچسب‌هایی مانند {{full_name}}، {{national_code}}، {{father_name}}، {{birth_date}}، {{role_title}}، {{start_date}} و {{end_date}} استفاده کنید. هر برچسب باید در یک قطعه متن Word قرار گیرد.</small>
 <hr><div class="wc-toolbar"><h3>قراردادهای صادرشده</h3><button class="wc-secondary" id="wc-history-refresh">بارگذاری سوابق</button></div>
 <div class="wc-history"><table><thead><tr><th>نیرو</th><th>قالب</th><th>شروع</th><th>پایان</th><th>اقدامات</th></tr></thead><tbody id="wc-history"></tbody></table></div>
 <section class="wc-editor" id="wc-editor" hidden>
<h3>ویرایش قرارداد صادرشده <span id="wc-edit-number"></span></h3>
<p>ویرایش فقط روی این قرارداد اعمال می‌شود و پرونده پرسنلی تغییر نمی‌کند.</p>
<div class="wc-grid">
<label>نام و نام خانوادگی<input data-edit="full_name"></label>
<label>نام پدر<input data-edit="father_name"></label>
<label>شماره شناسنامه<input data-edit="identity_number"></label>
<label>کد ملی<input data-edit="national_code"></label>
<label>تاریخ تولد<input data-edit="birth_date"></label>
<label>شماره تماس<input data-edit="mobile"></label>
<label>نشانی<input data-edit="address"></label>
<label>عنوان شغل<input data-edit="role_title"></label>
<label>شماره حساب<input data-edit="bank_account"></label>
<label>تاریخ شروع شمسی<div class="wc-date-entry"><input id="wc-edit-start" data-edit="start_date" placeholder="۱۴۰۵/۰۸/۰۱"><button class="wc-secondary" type="button" data-calendar-for="wc-edit-start">📅</button></div></label>
<label>تاریخ پایان شمسی<div class="wc-date-entry"><input id="wc-edit-end" data-edit="end_date" placeholder="۱۴۰۵/۱۲/۲۹"><button class="wc-secondary" type="button" data-calendar-for="wc-edit-end">📅</button></div></label>
<label>مدت قرارداد<input data-edit="duration_label"></label>
<label>قالب قرارداد<select id="wc-edit-template"></select></label>
</div>
<div class="wc-actions"><button id="wc-edit-save">ذخیره تغییرات و بازسازی چاپ</button><button class="wc-secondary" id="wc-edit-cancel">انصراف</button></div>
</section>
 <div id="wc-message" class="wc-status"></div></div>`;
 const host=document.getElementById('khatyar-contract-page');if(!host)return;
 host.appendChild(div);
 const by=id=>div.querySelector('#'+id);
 by('wc-refresh').onclick=refresh;
 by('wc-history-refresh').onclick=history;
 by('wc-search').oninput=renderUsers;
 by('wc-select-all').onclick=()=>{div.querySelectorAll('#wc-users input').forEach(x=>selected.add(Number(x.value)));renderUsers();};
 by('wc-clear').onclick=()=>{selected.clear();renderUsers();};
 by('wc-generate').onclick=generate;
 by('wc-upload').onclick=upload;
 by('wc-templates-list').onclick=ev=>{
   const b=ev.target.closest('[data-template-delete]');
   if(b)deleteTemplate(Number(b.dataset.templateDelete)).catch(err=>status(err.message,true));
 };
 div.addEventListener('click',ev=>{
   const b=ev.target.closest('[data-calendar-for]');
   if(b){ev.preventDefault();openCalendar(by(b.dataset.calendarFor));}
 });
 by('wc-edit-save').onclick=saveEdit;
 by('wc-edit-cancel').onclick=()=>{editingId=null;by('wc-editor').hidden=true;};
 div.addEventListener('click',ev=>{
   const b=ev.target.closest('button[data-contract]');if(!b)return;
   const id=Number(b.dataset.contract),action=b.dataset.action;
   if(action==='edit')openEdit(id).catch(err=>status(err.message,true));
   else if(action==='delete')deleteContract(id).catch(err=>status(err.message,true));
   else printContract(id).catch(err=>status(err.message,true));
 });
}
const jMonths=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const jFormat=new Intl.DateTimeFormat('en-u-ca-persian-nu-latn',{timeZone:'UTC',year:'numeric',month:'2-digit',day:'2-digit'});
function jalaliParts(date){
 const p=jFormat.formatToParts(date),a={};p.forEach(x=>{if(['year','month','day'].includes(x.type))a[x.type]=Number(x.value);});
 return [a.year,a.month,a.day];
}
function toGregorian(y,m,d){
 const target=y*10000+m*100+d;
 let lo=Date.UTC(y+620,0,1),hi=Date.UTC(y+623,0,1);
 while(lo<=hi){
   const midDay=Math.floor((lo+hi)/2/86400000)*86400000;
   const t=jalaliParts(new Date(midDay+43200000)),n=t[0]*10000+t[1]*100+t[2];
   if(n===target)return new Date(midDay);
   if(n<target)lo=midDay+86400000;else hi=midDay-86400000;
 }
 return null;
}
function jalaliMonthLength(y,m){
 const a=toGregorian(y,m,1),b=toGregorian(m===12?y+1:y,m===12?1:m,1);
 return a&&b?Math.round((b-a)/86400000):(m<=6?31:m<=11?30:29);
}
let activeCalendar=null;
function closeCalendar(){activeCalendar?.remove();activeCalendar=null;}
function openCalendar(input){
 if(!input)return;
 closeCalendar();
 const supplied=standardDate(input.value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
 const current=jalaliParts(new Date()),selected=supplied?[+supplied[1],+supplied[2],+supplied[3]]:current;
 let y=selected[0],m=selected[1];
 const pop=document.createElement('div');pop.className='wc-jalali-picker';document.body.appendChild(pop);activeCalendar=pop;
 const rect=input.getBoundingClientRect();pop.style.left=Math.max(8,Math.min(window.innerWidth-322,rect.left))+'px';pop.style.top=Math.max(8,Math.min(window.innerHeight-360,rect.bottom+4))+'px';
 function draw(){
   const g=toGregorian(y,m,1),first=g?(g.getUTCDay()+1)%7:0,len=jalaliMonthLength(y,m);
   let cells=['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'].map(t=>'<span class="wc-cal-week">'+t+'</span>').join('');
   for(let i=0;i<first;i++)cells+='<span></span>';
   for(let d=1;d<=len;d++)cells+='<button type="button" data-jday="'+d+'" class="'+(selected[0]===y&&selected[1]===m&&selected[2]===d?'selected':'')+'">'+num(d)+'</button>';
   pop.innerHTML='<div class="wc-cal-head"><button type="button" data-prev>ماه قبل</button><select data-jmonth>'+jMonths.map((name,i)=>'<option value="'+(i+1)+'"'+(m===i+1?' selected':'')+'>'+name+'</option>').join('')+'</select><select data-jyear>'+Array.from({length:31},(_,i)=>y-15+i).map(yr=>'<option value="'+yr+'"'+(yr===y?' selected':'')+'>'+num(yr)+'</option>').join('')+'</select><button type="button" data-next>ماه بعد</button></div><div class="wc-cal-grid">'+cells+'</div><button type="button" data-close>بستن</button>';
 }
 pop.onclick=ev=>{
   const t=ev.target.closest('button');if(!t)return;
   if(t.hasAttribute('data-close'))return closeCalendar();
   if(t.hasAttribute('data-prev')){m--;if(m<1){m=12;y--;}draw();return;}
   if(t.hasAttribute('data-next')){m++;if(m>12){m=1;y++;}draw();return;}
   if(t.hasAttribute('data-jday')){
     const d=Number(t.dataset.jday);input.value=num(y+'/'+String(m).padStart(2,'0')+'/'+String(d).padStart(2,'0'));
     input.dispatchEvent(new Event('change',{bubbles:true}));closeCalendar();
   }
 };
 pop.onchange=ev=>{
   if(ev.target.matches('[data-jmonth]'))m=Number(ev.target.value);
   if(ev.target.matches('[data-jyear]'))y=Number(ev.target.value);
   draw();
 };
 draw();
}
let editingId=null;
const selected=new Set();
const by=id=>document.querySelector('#kh-contract-panel #'+id);
function status(message,error=false){const x=by('wc-message');if(x){x.textContent=message;x.style.color=error?'#b42318':'#146d4b';}}
function renderUsers(){
 const q=String(by('wc-search')?.value||'').trim().toLowerCase();
 const list=users.filter(u=>(u.first_name+' '+u.last_name+' '+u.role_title).toLowerCase().includes(q));
 by('wc-users').innerHTML=list.map(u=>`<label><input type="checkbox" value="${Number(u.id)}" ${selected.has(Number(u.id))?'checked':''}> ${e(u.first_name)} ${e(u.last_name)} <small>${e(u.role_title)}</small></label>`).join('')||'نیرویی یافت نشد.';
 by('wc-users').querySelectorAll('input').forEach(c=>c.onchange=()=>{if(c.checked)selected.add(Number(c.value));else selected.delete(Number(c.value));renderUsers();});
 by('wc-selected').textContent=num(selected.size)+' نفر انتخاب شده';
}
async function refresh(){
 try{status('در حال دریافت اطلاعات…');const d=await call('/bootstrap');users=d.users||[];templates=d.templates||[];
 by('wc-template').innerHTML=templates.map(t=>`<option value="${Number(t.id)}">${e(t.name)}${t.kind==='docx'?' (Word)':''}</option>`).join('');
 renderTemplateList();renderUsers();status('اطلاعات و قالب‌ها بارگذاری شد.');await history();
 }catch(err){status(err.message,true);}
}
function renderTemplateList(){
 const el=by('wc-templates-list');if(!el)return;
 el.innerHTML=templates.map(t=>`<div class="wc-template-row"><span>${e(t.name)} ${t.is_default?'(پیش‌فرض سامانه)':''}</span>${t.is_default?'':`<button type="button" class="wc-delete" data-template-delete="${Number(t.id)}">حذف قالب</button>`}</div>`).join('');
}
async function deleteTemplate(id){
 const t=templates.find(x=>Number(x.id)===id);
 if(!t||t.is_default)return;
 if(!confirm('قالب «'+t.name+'» برای همیشه حذف شود؟ اگر قرارداد صادرشده‌ای به آن متصل باشد، سامانه حذف را مجاز نمی‌داند.'))return;
 await call('/templates/'+id,{method:'DELETE'});
 status('قالب «'+t.name+'» حذف شد.');
 await refresh();
}
async function history(){
 try{const d=await call('/history');issued=d.rows||[];
 by('wc-history').innerHTML=issued.map(r=>`<tr><td>${e(r.first_name)} ${e(r.last_name)}</td><td>${e(r.template_name)}</td><td>${e(r.start_date)}</td><td>${e(r.end_date)}</td><td><button data-contract="${Number(r.id)}" data-action="print">چاپ / ذخیره PDF</button> <button class="wc-secondary" data-contract="${Number(r.id)}" data-action="edit">ویرایش</button> <button class="wc-delete" data-contract="${Number(r.id)}" data-action="delete">حذف</button></td></tr>`).join('')||'<tr><td colspan="5">هنوز قراردادی صادر نشده است.</td></tr>';
 }catch(err){status(err.message,true);}
}
async function openEdit(id){
 const data=await call('/'+id),c=data.contract||{},snapshot=c.snapshot||{};
 editingId=id;by('wc-edit-number').textContent='شماره '+num(id);
 for(const el of by('wc-editor').querySelectorAll('[data-edit]')){
   const key=el.dataset.edit;el.value=['start_date','end_date'].includes(key)?num(String(c[key]??snapshot[key]??'').replace(/-/g,'/')):String(c[key]??snapshot[key]??'');
 }
 by('wc-edit-template').innerHTML=templates.map(t=>`<option value="${Number(t.id)}">${e(t.name)}</option>`).join('');
 by('wc-edit-template').value=String(c.template_id);
 by('wc-editor').hidden=false;by('wc-editor').scrollIntoView({behavior:'smooth',block:'start'});
 status('اطلاعات قرارداد برای ویرایش بارگذاری شد.');
}
async function saveEdit(){
 if(!editingId)return;
 const data={template_id:Number(by('wc-edit-template').value)};
 for(const el of by('wc-editor').querySelectorAll('[data-edit]'))data[el.dataset.edit]=['start_date','end_date'].includes(el.dataset.edit)?standardDate(el.value):el.value.trim();
 const button=by('wc-edit-save');button.disabled=true;
 try{
   await call('/'+editingId,{method:'PUT',body:JSON.stringify(data)});
   status('تغییرات قرارداد شماره '+num(editingId)+' ذخیره شد. چاپ نسخه اصلاح‌شده آماده است.');
   editingId=null;by('wc-editor').hidden=true;await history();
 }catch(err){status(err.message,true);}finally{button.disabled=false;}
}
async function deleteContract(id){
 if(!confirm('قرارداد شماره '+num(id)+' برای همیشه از دیتابیس حذف شود؟ این عملیات قابل بازگشت نیست و نسخه Word، متن و سوابق تغییرات همین قرارداد نیز پاک می‌شوند.'))return;
 await call('/'+id,{method:'DELETE'});
 if(editingId===id){editingId=null;by('wc-editor').hidden=true;}
 status('قرارداد شماره '+num(id)+' برای همیشه حذف شد.');
 await history();
}
async function generate(){
 const ids=[...selected],start=standardDate(by('wc-start').value),end=standardDate(by('wc-end').value),duration=by('wc-duration').value.trim();
 if(!ids.length)return status('حداقل یک نیرو انتخاب کنید.',true);
 if(!/^1[34]\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(start)||!/^1[34]\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(end)||end<start)return status('تاریخ‌های شمسی را بررسی کنید.',true);
 if(!duration)return status('مدت قرارداد را مشخص کنید.',true);
 if(!confirm('برای '+num(ids.length)+' نفر قرارداد مستقل صادر شود؟'))return;
 const btn=by('wc-generate');btn.disabled=true;
 try{const d=await call('/generate',{method:'POST',body:JSON.stringify({user_ids:ids,template_id:Number(by('wc-template').value),start_date:start,end_date:end,duration_label:duration})});
 const incomplete=(d.contracts||[]).filter(x=>x.missing?.length);
 status(num((d.contracts||[]).length)+' قرارداد مجزا صادر شد.'+(incomplete.length?' هشدار: اطلاعات پرونده '+num(incomplete.length)+' نفر کامل نیست: '+incomplete.map(x=>x.name+' ('+x.missing.join('، ')+')').join('؛ '):''),!!incomplete.length);
 await history();
 }catch(err){status(err.message,true);}finally{btn.disabled=false;}
}
async function upload(){
 const name=by('wc-tpl-name').value.trim(),file=by('wc-tpl-file').files?.[0];
 if(!name||!file)return status('نام و فایل Word را مشخص کنید.',true);
 const f=new FormData();f.append('name',name);f.append('file',file);
 try{await call('/templates',{method:'POST',body:f});by('wc-tpl-name').value='';by('wc-tpl-file').value='';await refresh();status('قالب Word ذخیره شد.');}
 catch(err){status(err.message,true);}
}
function unmount(){document.getElementById('kh-contract-panel')?.remove();loaded=false;selected.clear();editingId=null;}
function mount(){
 const host=document.getElementById('khatyar-contract-page');
 if(!host)return;
 dom();const panel=document.getElementById('kh-contract-panel');if(!panel)return;
 panel.classList.add('open');if(!loaded){loaded=true;refresh();}
}
window.KhatyarWorkContracts={mount,unmount};
})();
