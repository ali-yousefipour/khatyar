/* قراردادهای کاری: authenticated administrative tool, loaded inside the backend panel. */
(function(){
'use strict';
const BASE='/api/admin/work-contracts';
let loaded=false, users=[],templates=[], issued=[];
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=s=>String(s??'').replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
const token=()=>localStorage.getItem('token')||localStorage.token||'';
async function call(path,opts={}){
 const headers={Authorization:'Bearer '+token()};
 if(opts.body&&!(opts.body instanceof FormData))headers['Content-Type']='application/json';
 const r=await fetch(BASE+path,{...opts,headers:{...headers,...opts.headers},cache:'no-store'});
 const data=await r.json().catch(()=>({}));
 if(!r.ok||!data.ok)throw Error(data.error||('خطای سرور '+r.status));
 return data;
}
async function download(id,type){
 const r=await fetch(BASE+'/'+id+'/'+type,{headers:{Authorization:'Bearer '+token()},cache:'no-store'});
 if(!r.ok){const d=await r.json().catch(()=>({}));throw Error(d.error||'دریافت فایل ناموفق بود');}
 const blob=await r.blob(),url=URL.createObjectURL(blob);
 if(type==='print'){
   const tab=window.open(url,'_blank');
   if(!tab){URL.revokeObjectURL(url);throw Error('برای نمایش قرارداد اجازه باز شدن پنجره را بدهید');}
   setTimeout(()=>URL.revokeObjectURL(url),120000);
 } else {
   const a=document.createElement('a');a.href=url;a.download='khatyar-contract-'+id+'.docx';document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),30000);
 }
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
`;
function dom(){
 if(document.getElementById('kh-contract-panel'))return;
 const st=document.createElement('style');st.textContent=style;document.head.appendChild(st);

 const div=document.createElement('div');div.id='kh-contract-panel';div.innerHTML=`
 <div class="wc-box">
 <div class="wc-toolbar"><h2>ایجاد و پرینت قرارداد کاری</h2></div>
 <p>انتخاب قالب پیش‌فرض یا Word، تعیین مدت قرارداد و صدور نسخه مستقل برای هر یک از نیروها.</p>
 <div class="wc-grid">
 <label>قالب قرارداد<select id="wc-template"></select></label>
 <label>تاریخ شروع (شمسی)<input id="wc-start" dir="ltr" placeholder="1405/08/01" maxlength="10"></label>
 <label>تاریخ پایان (شمسی)<input id="wc-end" dir="ltr" placeholder="1405/12/29" maxlength="10"></label>
 <label>مدت قرارداد<input id="wc-duration" placeholder="مثلاً پنج ماه"></label>
 </div>
 <div class="wc-toolbar"><h3>انتخاب نیروها</h3><label>جستجو<input id="wc-search" placeholder="نام و نام خانوادگی یا سمت"></label></div>
 <div class="wc-actions"><button class="wc-secondary" id="wc-select-all">انتخاب همه نتایج</button><button class="wc-secondary" id="wc-clear">لغو انتخاب</button><span id="wc-selected">۰ نفر</span></div>
 <div id="wc-users" class="wc-users"></div>
 <div class="wc-actions"><button id="wc-generate">صدور قرارداد مجزا برای نیروهای انتخاب‌شده</button><button class="wc-secondary" id="wc-refresh">به‌روزرسانی</button></div>
 <hr><h3>بارگذاری قالب Word و ذخیره در قالب‌های پیش‌فرض</h3>
 <div class="wc-grid"><label>نام قالب جدید<input id="wc-tpl-name" placeholder="مثلاً قرارداد موقت ۱۴۰۵"></label><label>فایل Word (.docx)<input id="wc-tpl-file" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"></label></div>
 <div class="wc-actions"><button id="wc-upload">ذخیره قالب</button></div>
 <small>در قالب Word از برچسب‌هایی مانند {{full_name}}، {{national_code}}، {{father_name}}، {{birth_date}}، {{role_title}}، {{start_date}} و {{end_date}} استفاده کنید. هر برچسب باید در یک قطعه متن Word قرار گیرد.</small>
 <hr><div class="wc-toolbar"><h3>قراردادهای صادرشده</h3><button class="wc-secondary" id="wc-history-refresh">بارگذاری سوابق</button></div>
 <div class="wc-history"><table><thead><tr><th>نیرو</th><th>قالب</th><th>شروع</th><th>پایان</th><th>اقدامات</th></tr></thead><tbody id="wc-history"></tbody></table></div>
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
 div.addEventListener('click',ev=>{
   const b=ev.target.closest('button[data-contract]');if(!b)return;
   download(Number(b.dataset.contract),b.dataset.action).catch(err=>status(err.message,true));
 });
}
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
 renderUsers();status('اطلاعات و قالب‌ها بارگذاری شد.');await history();
 }catch(err){status(err.message,true);}
}
async function history(){
 try{const d=await call('/history');issued=d.rows||[];
 by('wc-history').innerHTML=issued.map(r=>`<tr><td>${e(r.first_name)} ${e(r.last_name)}</td><td>${e(r.template_name)}</td><td>${e(r.start_date)}</td><td>${e(r.end_date)}</td><td>${r.kind==='docx'?`<button data-contract="${Number(r.id)}" data-action="word">Word / چاپ دقیق</button> <button data-contract="${Number(r.id)}" data-action="print">پیش‌نمایش متنی</button>`:`<button data-contract="${Number(r.id)}" data-action="print">چاپ</button>`}</td></tr>`).join('')||'<tr><td colspan="5">هنوز قراردادی صادر نشده است.</td></tr>';
 }catch(err){status(err.message,true);}
}
async function generate(){
 const ids=[...selected],start=by('wc-start').value.trim().replaceAll('/','-'),end=by('wc-end').value.trim().replaceAll('/','-'),duration=by('wc-duration').value.trim();
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
function unmount(){document.getElementById('kh-contract-panel')?.remove();loaded=false;selected.clear();}
function mount(){
 const host=document.getElementById('khatyar-contract-page');
 if(!host)return;
 dom();const panel=document.getElementById('kh-contract-panel');if(!panel)return;
 panel.classList.add('open');if(!loaded){loaded=true;refresh();}
}
window.KhatyarWorkContracts={mount,unmount};
})();
