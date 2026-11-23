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
.kh-ur-groups{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
.kh-ur-group{border:1px solid #d0e5dc;padding:8px;border-radius:10px;background:#f6faf8;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.kh-ur-group strong{font-size:12px}
.kh-ur-group button{padding:5px 8px;font-size:12px}
.kh-ur-unselected{font-size:12px;line-height:1.8;overflow-wrap:anywhere}
.kh-ur-panel{box-sizing:border-box;width:min(750px,100%);max-height:calc(100dvh - 32px);overflow:auto;background:#fff;color:#193c32;border:1px solid #d0e5dc;border-radius:20px;padding:clamp(16px,3vw,24px);box-shadow:0 22px 75px #0004}
.kh-ur-panel h2{margin:0;font-size:19px}.kh-ur-panel p{line-height:1.8;color:#52685f}
.kh-ur-fields{display:grid;grid-template-columns:repeat(auto-fill,minmax(205px,1fr));gap:8px;max-height:320px;overflow:auto;padding:10px;border:1px solid #dbe7e2;border-radius:12px}
.kh-ur-fields label{display:flex;align-items:center;gap:7px;padding:7px;border-radius:8px;background:#f5f9f7;cursor:pointer}
.kh-ur-fields input{accent-color:#087f5b}.kh-ur-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
.kh-ur-panel button,.kh-ur-panel select,.kh-ur-panel input[type=search],.kh-ur-panel input[type=text]{font:inherit;border-radius:10px;padding:9px 12px;border:1px solid #b9d6cc;max-width:100%}
.kh-ur-primary{background:#087f5b;color:#fff;border-color:#087f5b!important}
.kh-ur-controls{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin:12px 0}
.kh-ur-controls label{display:grid;gap:5px}
@media(max-width:600px){
 #kh-user-report-modal{padding:0}
 .kh-ur-panel{width:100vw;height:100dvh;max-height:100dvh;border-radius:0;padding:16px}
 .kh-ur-fields{grid-template-columns:1fr;max-height:38dvh}
 .kh-ur-group{width:100%}
}
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
const groupPanel=el('div',{class:'kh-ur-groups'},box);
const fields=el('div',{class:'kh-ur-fields'},box);
const unselected=el('p',{class:'kh-ur-unselected',role:'status'},box);
const controls=el('div',{class:'kh-ur-controls'},box);
const sortLabel=el('label',{text:'مرتب‌سازی بر اساس'},controls),sort=el('select',{},sortLabel);
const dirLabel=el('label',{text:'جهت مرتب‌سازی'},controls),dir=el('select',{},dirLabel);
el('option',{value:'asc',text:'صعودی (الف تا ی / کم به زیاد)'},dir);
el('option',{value:'desc',text:'نزولی (ی تا الف / زیاد به کم)'},dir);
const secondLabel=el('label',{text:'مرتب‌سازی دوم (اختیاری)'},controls),second=el('select',{},secondLabel);
const secondDirLabel=el('label',{text:'جهت دوم'},controls),secondDir=el('select',{},secondDirLabel);
const thirdLabel=el('label',{text:'مرتب‌سازی سوم (اختیاری)'},controls),third=el('select',{},thirdLabel);
const thirdDirLabel=el('label',{text:'جهت سوم'},controls),thirdDir=el('select',{},thirdDirLabel);
for(const s of [second,third])el('option',{value:'',text:'بدون مرتب‌سازی بیشتر'},s);
for(const s of [secondDir,thirdDir]){el('option',{value:'asc',text:'صعودی'},s);el('option',{value:'desc',text:'نزولی'},s);}
const filterArea=el('div',{class:'kh-ur-controls'},box);
const activeLabel=el('label',{text:'وضعیت کاربران'},filterArea),active=el('select',{},activeLabel);
for(const [value,title] of [['all','همه کاربران'],['1','فقط فعال'],['0','فقط غیرفعال']])el('option',{value,text:title},active);
const roleLabel=el('label',{text:'سمت سازمانی'},filterArea),role=el('select',{},roleLabel);
const zoneLabel=el('label',{text:'منطقه'},filterArea),zone=el('select',{},zoneLabel);
el('option',{value:'',text:'تمام سمت‌ها'},role);
el('option',{value:'',text:'تمام مناطق'},zone);
const dateInputs={};
for(const [key,title] of [
 ['employment_start_from','شروع همکاری از تاریخ'],
 ['employment_start_to','شروع همکاری تا تاریخ'],
 ['employment_end_from','پایان همکاری از تاریخ'],
 ['employment_end_to','پایان همکاری تا تاریخ']
]){
 const parent=el('label',{text:title},filterArea);
 const input=el('input',{type:'text',placeholder:'۱۴۰۵/۰۱/۰۱',dir:'ltr',maxlength:'10'},parent);
 dateInputs[key]=input;
}
const presetArea=el('div',{class:'kh-ur-controls'},box);
const presetLabel=el('label',{text:'قالب ذخیره‌شده'},presetArea),presetSelect=el('select',{},presetLabel);
el('option',{value:'',text:'قالب جدید / تنظیمات فعلی'},presetSelect);
const presetNameLabel=el('label',{text:'نام قالب'},presetArea);
const presetName=el('input',{type:'text',maxlength:'120',placeholder:'مثلاً گزارش جامع ماهانه'},presetNameLabel);
const visibilityLabel=el('label',{text:'دسترسی قالب'},presetArea),visibility=el('select',{},visibilityLabel);
el('option',{value:'private',text:'شخصی'},visibility);
el('option',{value:'shared',text:'عمومی مدیران'},visibility);
const presetActions=el('div',{class:'kh-ur-actions'},box);
const loadPreset=el('button',{type:'button',text:'بارگذاری قالب'},presetActions);
const saveServerPreset=el('button',{type:'button',text:'ذخیره / بروزرسانی قالب'},presetActions);
const copyPreset=el('button',{type:'button',text:'ایجاد کپی'},presetActions);
const deletePreset=el('button',{type:'button',text:'حذف قالب'},presetActions);
const status=el('p',{role:'status','aria-live':'polite'},box);
const foot=el('div',{class:'kh-ur-actions'},box);
const preview=el('button',{type:'button',text:'پیش‌نمایش داده‌ها'},foot);
const savePreset=el('button',{type:'button',text:'ذخیره تنظیمات این مرورگر'},foot);
const reset=el('button',{type:'button',text:'بازنشانی'},foot);
const previewArea=el('div',{'aria-live':'polite'},box);
const save=el('button',{type:'button',class:'kh-ur-primary',text:'دریافت فایل اکسل'},foot);
const close=el('button',{type:'button',text:'انصراف'},foot);
const lastFocus=document.activeElement;
let exporting=false;
const dismiss=()=>{if(exporting)return;cover.remove();busy=false;if(lastFocus?.isConnected)lastFocus.focus();};
close.onclick=dismiss;
cover.addEventListener('click',e=>{if(e.target===cover)dismiss();});
cover.addEventListener('keydown',e=>{
 if(e.key==='Escape'){e.preventDefault();dismiss();return;}
 if(e.key!=='Tab')return;
 const items=[...box.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),[href],[tabindex]:not([tabindex="-1"])')]
   .filter(node=>node.getClientRects().length);
 if(!items.length){e.preventDefault();box.focus();return;}
 const first=items[0],last=items[items.length-1];
 if(e.shiftKey&&(document.activeElement===first||document.activeElement===box)){e.preventDefault();last.focus();}
 else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
});
const originalDismiss=dismiss;
save.disabled=true;
status.textContent='در حال دریافت فهرست فیلدها…';
request(API+'full-report-options').then(r=>r.json()).then(data=>{
 const columns=Array.isArray(data.columns)?data.columns:[];
 if(!columns.length)throw Error('فیلدی برای گزارش دریافت نشد');
 const canonicalOrder=columns.map(col=>col.key);
 const columnByKey=new Map(columns.map(col=>[col.key,col]));
 const checks=[],groupChecks=new Map(),groupLabels=new Map();
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
   const group=column.group||'سایر';
   if(!groupChecks.has(group))groupChecks.set(group,[]);
   groupChecks.get(group).push(check);
   const move=(step)=>{const from=checks.indexOf(check),to=from+step;if(to<0||to>=checks.length)return;const other=checks[to];checks[from]=other;checks[to]=check;
     if(step<0)fields.insertBefore(label,other.parentElement);
     else fields.insertBefore(other.parentElement,label);
     updateCount();};
   const up=el('button',{type:'button',text:'↑','aria-label':'انتقال ستون به بالا'},label);
   const down=el('button',{type:'button',text:'↓','aria-label':'انتقال ستون به پایین'},label);
   up.onclick=e=>{e.preventDefault();e.stopPropagation();move(-1);};
   down.onclick=e=>{e.preventDefault();e.stopPropagation();move(1);};
   label.draggable=true;
   label.title='برای تغییر ترتیب ستون، بکشید و رها کنید یا از کلیدهای بالا و پایین استفاده کنید';
   label.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',column.key);e.dataTransfer.effectAllowed='move';});
   label.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='move';});
   label.addEventListener('drop',e=>{
     e.preventDefault();e.stopPropagation();
     const sourceKey=e.dataTransfer.getData('text/plain');
     const from=checks.findIndex(x=>x.value===sourceKey),to=checks.indexOf(check);
     if(from<0||from===to)return;
     const moved=checks.splice(from,1)[0];checks.splice(to,0,moved);
     if(from<to)fields.insertBefore(moved.parentElement,label.nextSibling);
     else fields.insertBefore(moved.parentElement,label);
     updateCount();
   });
   for(const s of [sort,second,third])el('option',{value:column.key,text:column.label},s);
 });
 for(const [name,members] of groupChecks){
   const card=el('div',{class:'kh-ur-group'},groupPanel);
   el('strong',{text:name},card);
   const counter=el('span',{role:'status'},card);groupLabels.set(name,counter);
   const selectGroup=el('button',{type:'button',text:'انتخاب گروه'},card);
   const clearGroup=el('button',{type:'button',text:'حذف گروه'},card);
   selectGroup.onclick=()=>{members.forEach(item=>item.checked=true);updateCount();};
   clearGroup.onclick=()=>{members.forEach(item=>item.checked=false);updateCount();};
 }
 sort.value=(stored&&columns.some(c=>c.key===stored.sort))?stored.sort:(columns.some(c=>c.key==='id')?'id':columns[0].key);
 dir.value=stored?.direction==='desc'?'desc':'asc';
 second.value=stored?.sorts?.[1]?.key||'';third.value=stored?.sorts?.[2]?.key||'';
 secondDir.value=stored?.sorts?.[1]?.direction==='desc'?'desc':'asc';
 thirdDir.value=stored?.sorts?.[2]?.direction==='desc'?'desc':'asc';
 active.value=['1','0'].includes(stored?.active)?stored.active:'all';
 for(const [key,input] of Object.entries(dateInputs))input.value=stored?.[key]||'';
 let preferredRole=stored?.role_id||'',preferredZone=stored?.zone_id||'';
 Promise.all([
 request('/api/admin/roles').then(r=>r.json()).catch(()=>[]),
 request('/api/admin/zones').then(r=>r.json()).catch(()=>[])
 ]).then(([roles,zones])=>{
   for(const item of (Array.isArray(roles)?roles:roles.items||roles.roles||[]))el('option',{value:item.id,text:item.title||item.name||String(item.id)},role);
   for(const item of (Array.isArray(zones)?zones:zones.items||zones.zones||[]))el('option',{value:item.id,text:item.name||item.title||String(item.id)},zone);
   role.value=String(preferredRole);zone.value=String(preferredZone);
 });
 const updateCount=()=>{
   const selected=checks.filter(c=>c.checked),n=selected.length;
   count.textContent=n.toLocaleString('fa-IR')+' ستون از '+checks.length.toLocaleString('fa-IR')+' ستون فعال';
   for(const [name,members] of groupChecks){
     const selectedCount=members.filter(item=>item.checked).length;
     groupLabels.get(name).textContent=selectedCount.toLocaleString('fa-IR')+' از '+members.length.toLocaleString('fa-IR');
   }
   const removed=checks.filter(c=>!c.checked).map(c=>columnByKey.get(c.value)?.label||c.value);
   unselected.textContent=removed.length?'ستون‌های انتخاب‌نشده ('+removed.length.toLocaleString('fa-IR')+'): '+removed.join('، '):'تمام ستون‌های مجاز در گزارش فعال هستند.';
   save.disabled=n===0;
 };
 function update(){updateCount();}
 all.onclick=()=>{checks.forEach(c=>c.checked=true);updateCount();};
 none.onclick=()=>{checks.forEach(c=>c.checked=false);updateCount();};
 search.oninput=()=>{const q=search.value.trim().toLocaleLowerCase('fa');checks.forEach(c=>{c.parentElement.hidden=!c.parentElement.textContent.toLocaleLowerCase('fa').includes(q);});};
 updateCount();status.textContent='';
 const payload=()=>({
   columns:checks.filter(c=>c.checked).map(c=>c.value),
   sort:sort.value,direction:dir.value,
   sorts:[{key:sort.value,direction:dir.value},...[
     {key:second.value,direction:secondDir.value},{key:third.value,direction:thirdDir.value}
   ].filter(x=>!!x.key)],
   active:active.value,role_id:role.value||'',zone_id:zone.value||'',
   ...Object.fromEntries(Object.entries(dateInputs).map(([key,input])=>[key,input.value.trim()]))
 });
 savePreset.onclick=()=>{localStorage.setItem(storageKey,JSON.stringify(payload()));status.textContent='تنظیمات ستون‌ها در این مرورگر ذخیره شد.';};
 let serverPresets=[];
 const serverUrl='/api/admin/users/full-report-presets';
 const refreshPresets=async(selectedId='')=>{
   const res=await request(serverUrl),data=await res.json();
   serverPresets=Array.isArray(data.presets)?data.presets:[];
   presetSelect.replaceChildren(el('option',{value:'',text:'قالب جدید / تنظیمات فعلی'}));
   for(const item of serverPresets)el('option',{value:item.id,text:item.name+(item.visibility==='shared'?' (عمومی)':' (شخصی)')},presetSelect);
   presetSelect.value=String(selectedId||'');
 };
 const selectedPreset=()=>serverPresets.find(p=>String(p.id)===String(presetSelect.value));
 const applyServerPreset=(record)=>{
   if(!record?.settings)return;
   const settings=record.settings,selected=Array.isArray(settings.columns)?settings.columns:[];
   checks.sort((a,b)=>{
     const x=selected.indexOf(a.value),y=selected.indexOf(b.value);
     return (x<0?9999:x)-(y<0?9999:y);
   });
   for(const checkbox of checks){checkbox.checked=selected.includes(checkbox.value);fields.appendChild(checkbox.parentElement);}
   if([...sort.options].some(o=>o.value===settings.sort))sort.value=settings.sort;
   dir.value=settings.direction==='desc'?'desc':'asc';
   second.value=settings.sorts?.[1]?.key||'';third.value=settings.sorts?.[2]?.key||'';
   secondDir.value=settings.sorts?.[1]?.direction==='desc'?'desc':'asc';
   thirdDir.value=settings.sorts?.[2]?.direction==='desc'?'desc':'asc';
   active.value=['all','1','0'].includes(settings.active)?settings.active:'all';
   preferredRole=settings.role_id||'';preferredZone=settings.zone_id||'';
   role.value=String(preferredRole);zone.value=String(preferredZone);
   for(const [key,input] of Object.entries(dateInputs))input.value=settings[key]||'';
   presetName.value=record.name;visibility.value=record.visibility==='shared'?'shared':'private';
   updateCount();
 };
 loadPreset.onclick=()=>{const record=selectedPreset();if(!record){status.textContent='ابتدا یک قالب را انتخاب کنید.';return;}applyServerPreset(record);status.textContent='قالب بارگذاری شد.';};
 saveServerPreset.onclick=async()=>{try{
   const name=presetName.value.trim();if(!name)throw Error('نام قالب را وارد کنید.');
   const body={id:Number(presetSelect.value)||0,name,visibility:visibility.value,settings:payload()};
   const res=await request(serverUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const saved=await res.json();await refreshPresets(saved.id);
   status.textContent='قالب در سامانه ذخیره شد.';
 }catch(err){status.textContent=err.message;}};
 copyPreset.onclick=()=>{const selected=selectedPreset();if(selected){presetName.value=selected.name+' - کپی';applyServerPreset(selected);presetName.value=selected.name+' - کپی';}
   presetSelect.value='';status.textContent='نام کپی را بررسی و ذخیره کنید.';};
 deletePreset.onclick=async()=>{try{
   const record=selectedPreset();if(!record)throw Error('قالبی انتخاب نشده است.');
   if(!confirm('قالب «'+record.name+'» حذف شود؟'))return;
   await request(serverUrl+'/'+encodeURIComponent(record.id),{method:'DELETE'});
   await refreshPresets();presetName.value='';status.textContent='قالب حذف شد.';
 }catch(err){status.textContent=err.message;}};
 refreshPresets().catch(err=>{status.textContent='بارگذاری قالب‌های ذخیره‌شده ممکن نشد: '+err.message;});
 reset.onclick=()=>{
   localStorage.removeItem(storageKey);
   checks.sort((a,b)=>canonicalOrder.indexOf(a.value)-canonicalOrder.indexOf(b.value));
   for(const check of checks){check.checked=true;fields.appendChild(check.parentElement);}
   sort.value=columns.some(c=>c.key==='id')?'id':columns[0].key;
   dir.value='asc';second.value='';third.value='';active.value='all';
   role.value='';zone.value='';preferredRole='';preferredZone='';
   for(const input of Object.values(dateInputs))input.value='';
   updateCount();status.textContent='تمام ستون‌ها با ترتیب پیش‌فرض اصلی سامانه فعال شدند.';
 };
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
   save.disabled=true;close.disabled=true;exporting=true;status.textContent='در حال ساخت فایل اکسل…';
   const res=await request(API+'full-report-export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload())});
   const blob=await res.blob();const href=URL.createObjectURL(blob);
   const a=document.createElement('a');a.href=href;a.download='گزارش_کامل_کاربران.xlsx';document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(href),10000);exporting=false;originalDismiss();lastFocus?.focus();
 }catch(err){exporting=false;status.textContent=err.message;save.disabled=false;close.disabled=false;}};
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
