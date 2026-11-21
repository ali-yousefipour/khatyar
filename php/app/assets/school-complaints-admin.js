/* School complaints admin module; mounted by canonical panel launcher. */
(function(){
'use strict';
const R=window.React;
if(!R)return;
const h=R.createElement,{useState,useEffect,useRef}=R;
const base='/school-complaints';
const labels={pending:'در انتظار بررسی',in_progress:'در حال بررسی',answered:'پاسخ داده‌شده',escalated:'ارجاع به مسئول واحد',returned:'بررسی تکمیلی',closed:'مختومه'};
const actions={start:'شروع بررسی',note:'ثبت یادداشت',reply:'ثبت پاسخ',escalate:'ارجاع به مسئول واحد',return:'بازگشت برای تکمیل',close:'مختومه کردن'};
const fa=v=>String(v??'—').replace(/[0-9]/g,x=>'۰۱۲۳۴۵۶۷۸۹'[+x]);
const en=v=>String(v).replace(/[۰-۹]/g,x=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(x))).replace(/[٠-٩]/g,x=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(x)));
const date=v=>{
 if(!v)return '—';
 try{
  const iso=String(v).trim().replace(' ','T');
  // Timestamps may already include an explicit offset or UTC designator.
  const hasZone=/[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso);
  const parsed=new Date(hasZone?iso:iso+'+03:30');
  if(!Number.isFinite(parsed.getTime()))return fa(v);
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Tehran'}).format(parsed);
 }catch(_){return fa(v);}
};
const now=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tehran',dateStyle:'short',timeStyle:'medium'}).format(new Date()).replace(' ','T').slice(0,16);
const fresh=()=>({complainant_type:'parent',first_name:'',last_name:'',phone:'',address:'',school_id:'',company_id:'',subject:'',custom_subject:'',body:'',received_at:now(),school_snapshot:{},company_snapshot:{}});
const btn=(label,fn,disabled=false,primary=false)=>h('button',{type:'button',className:'btn'+(primary?' p':''),onClick:fn,disabled},label);
const field=(label,props)=>h('label',{className:'sc-field'},h('span',null,label),h('input',{className:'input',...props}));
const select=(label,value,onChange,options)=>h('label',{className:'sc-field'},h('span',null,label),h('select',{className:'input',value,onChange:e=>onChange(e.target.value)},...options.map(([v,t])=>h('option',{key:v,value:v},t))));
const errorText=e=>e?.message||'خطا در ارتباط با سرور';
function Lookup({get,path,label,display,onPick,min=0,initial='',extra='',seed=[]}){
 const [q,setQ]=useState(initial),[rows,setRows]=useState(seed),[err,setErr]=useState(''),[loading,setLoading]=useState(false),[open,setOpen]=useState(false);
 useEffect(()=>{if(!open)return;let live=true;if(q.length<min){setRows([]);setLoading(false);return;}setLoading(true);const t=setTimeout(()=>get(base+'/'+path+'?q='+encodeURIComponent(q)+extra).then(v=>{if(live){setRows(Array.isArray(v)?v:[]);setErr('');}}).catch(e=>{if(live){setErr(errorText(e));setRows([]);}}).finally(()=>{if(live)setLoading(false);}),300);return()=>{live=false;clearTimeout(t);};},[q,extra,open,path]);
 return h('div',{className:'sc-lookup'},field(label,{value:q,onFocus:()=>setOpen(true),onChange:e=>{setQ(e.target.value);setOpen(true);},onKeyDown:e=>{if(e.key==='Escape')setOpen(false);},'aria-expanded':open,'aria-autocomplete':'list',autoComplete:'off'}),open&&h('div',{className:'sc-results'},loading?h('p',null,'در حال جستجو…'):err?h('p',{role:'alert'},err):rows.length?rows.map((x,i)=>h('button',{key:x.id||x.national_code||i,type:'button',onClick:()=>{onPick(x);setQ(display(x));setOpen(false);}},display(x))):h('p',null,'موردی یافت نشد')));
}
function Snapshot({value,fields,onChange}){
 return h('div',{className:'sc-grid'},...fields.map(([key,label])=>field(label,{key,value:value[key]??'',readOnly:!onChange||!['address','educational_district','education_level','school_type','phone','manager_name','manager_mobile','landline_phone'].includes(key),onChange:e=>onChange?.({...value,[key]:e.target.value})})));
}
const schoolFields=[['name','نام مدرسه'],['code','کد مدرسه'],['educational_district','ناحیه'],['education_level','مقطع'],['school_type','نوع مدرسه'],['gender','جنسیت'],['shift','شیفت'],['student_count','تعداد دانش‌آموزان'],['phone','تلفن'],['address','آدرس']];
const companyFields=[['name','نام شرکت'],['manager_name','مدیرعامل'],['manager_mobile','همراه مدیرعامل'],['landline_phone','تلفن ثابت'],['address','آدرس']];
function QR({code}){if(!code)return null;try{if(!window.KhatyarSchoolQR)return h('p',{className:'sc-help'},'کد رهگیری قابل کپی است؛ نمایش QR در دسترس نیست');return h('div',{className:'sc-qr',dangerouslySetInnerHTML:{__html:window.KhatyarSchoolQR.svg(String(code))}});}catch(_){return h('p',{className:'sc-help'},'نمایش QR ممکن نیست؛ از کد رهگیری استفاده کنید');}}
const htmlEsc=x=>String(x??'—').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function printOrganization(item,isReceipt=false){
 const code=String(item.tracking_code||'');
 const qr=window.KhatyarSchoolQR?window.KhatyarSchoolQR.svg(code,160):'';
 const line=(label,value)=>'<div class="line"><span>'+htmlEsc(label)+'</span><strong>'+htmlEsc(value)+'</strong></div>';
 const details=isReceipt?'':[
  '<section><h2>مشخصات شاکی</h2>',
  line('نوع شاکی',item.complainant_type==='driver'?'راننده سرویس مدارس':'والدین دانش‌آموز'),
  line('نام و نام خانوادگی',[item.first_name,item.last_name].filter(Boolean).join(' ')),
  line('شماره تماس',fa(item.phone)),line('نشانی',item.address),'</section>',
  '<section><h2>مشخصات مدرسه</h2>',line('نام مدرسه',item.school_snapshot?.name),line('ناحیه آموزشی',item.school_snapshot?.educational_district),line('آدرس مدرسه',item.school_snapshot?.address),'</section>',
  '<section><h2>شرکت سرویس‌دهنده</h2>',line('نام شرکت',item.company_snapshot?.name),line('مدیرعامل',item.company_snapshot?.manager_name),line('همراه مدیرعامل',item.company_snapshot?.manager_mobile),'</section>',
  '<section><h2>موضوع و متن شکایت</h2>',line('موضوع',item.subject),'<div class="description">'+htmlEsc(item.body)+'</div>',
  line('تاریخ دریافت',date(item.received_at)),line('تاریخ ثبت',date(item.created_at)),line('مهلت رسیدگی',date(item.due_at)),line('وضعیت',labels[item.status]||item.status),
  line('مسئول رسیدگی',item.assigned_name),line('تاریخ مختومه',date(item.closed_at)),'</section>',
  '<section><h2>تاریخچه رسیدگی</h2>',
  (item.events||[]).map(ev=>'<article class="event"><strong>'+htmlEsc(actions[ev.action]||ev.action||'ثبت اولیه')+' — '+htmlEsc(ev.actor_name)+'</strong><small>'+htmlEsc(date(ev.created_at))+'</small><p>'+htmlEsc(ev.body||'—')+'</p></article>').join('')||'<p>رویدادی ثبت نشده است.</p>','</section>'
 ].join('');
 const title=isReceipt?'رسید ثبت شکایت سرویس مدارس':'گزارش پرونده شکایت سرویس مدارس';
 const html='<!doctype html><html lang="fa" dir="rtl"><head><meta charset="UTF-8"><title>'+htmlEsc(title)+'</title>'+
 '<link rel="stylesheet" href="/vendor/vazirmatn/Vazirmatn-font-face.css">'+
 '<style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;color:#1d342c;font:12px Vazirmatn,Tahoma,sans-serif;line-height:1.9;background:#fff}header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #087f67;padding:5px 0 16px}header img{width:54px;height:54px;object-fit:contain}h1{font-size:19px;margin:0}header p{margin:0;color:#53675c}h2{font-size:14px;color:#087f67;margin:0 0 9px}main{padding-top:14px}.intro{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border:1px solid #cddfd5;border-radius:12px;padding:15px;break-inside:avoid}.intro svg{width:135px;height:135px}.tracking{direction:ltr;unicode-bidi:embed;font:700 17px monospace;overflow-wrap:anywhere;color:#065844}.line{display:flex;gap:12px;padding:5px 0;border-bottom:1px solid #e3eae6;break-inside:avoid}.line span{min-width:135px;color:#52675b}.line strong{font-weight:650;overflow-wrap:anywhere;white-space:pre-wrap}section{margin-top:15px;border:1px solid #d7e5dd;border-radius:10px;padding:12px;break-inside:auto}section h2{border-bottom:1px solid #d7e5dd;padding-bottom:7px}.description,.event p{white-space:pre-wrap;overflow-wrap:anywhere}.description{padding:9px;background:#f5faf7;border-radius:7px}.event{padding:7px 12px;border-right:3px solid #087f67;margin:9px 0;break-inside:avoid}.event small{display:block;color:#60776b}footer{margin-top:20px;border-top:1px solid #dce6df;padding:11px 0;font-size:10px;color:#657c70;text-align:center}.print-control{margin:16px auto 0;padding:11px 20px;border:0;background:#087f67;color:white;border-radius:9px;font:inherit;cursor:pointer}@media print{.print-control{display:none}section,.intro{border-color:#b6c8be}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>'+
 '<header><img src="/brand-khatyar.png" alt="لوگوی خطیار"><div><h1>'+htmlEsc(title)+'</h1><p>سامانه مدیریت و نظارت خطیار</p></div></header><main>'+
 '<div class="intro"><div><div>کد رهگیری</div><div class="tracking">'+htmlEsc(code)+'</div><p>کد را برای پیگیری پرونده نزد خود نگهداری کنید.</p></div>'+qr+'</div>'+
 details+'</main><footer>تهیه‌شده در سامانه خطیار — '+htmlEsc(date(now()))+'</footer>'+
 '<button type="button" class="print-control" onclick="window.print()">چاپ / ذخیره به‌صورت PDF</button></body></html>';
 const pop=window.open('','_blank');
 if(!pop){window.print();return;}
 pop.document.open();pop.document.write(html);pop.document.close();pop.focus();
}
function SchoolMap({school}){
 const host=useRef(null),[error,E]=useState('');
 const lat=Number(school.latitude),lng=Number(school.longitude);
 const valid=school.latitude!=null&&school.longitude!=null&&String(school.latitude).trim()!==''&&String(school.longitude).trim()!==''&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180&&!(lat===0&&lng===0);
 useEffect(()=>{E('');if(!valid||!host.current)return;if(!window.L){E('کتابخانه نقشه در دسترس نیست');return;}let map;let timer;try{const L=window.L;map=L.map(host.current,{scrollWheelZoom:false}).setView([lat,lng],16);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);const marker=L.marker([lat,lng]).addTo(map);const title=document.createElement('span');title.textContent=school.name||'مدرسه';marker.bindTooltip(title);timer=setTimeout(()=>map.invalidateSize(),100);}catch(e){E('نمایش نقشه امکان‌پذیر نیست');}return()=>{clearTimeout(timer);if(map)map.remove();};},[lat,lng,valid,school.name]);
 return h('section',{className:'sc-card sc-school-map'},h('h4',null,'موقعیت مدرسه روی نقشه'),valid?h('div',null,h('a',{href:'https://www.openstreetmap.org/?mlat='+encodeURIComponent(lat)+'&mlon='+encodeURIComponent(lng)+'#map=16/'+lat+'/'+lng,target:'_blank',rel:'noopener noreferrer'},'نمایش در نقشه خارجی'),h('div',{ref:host,style:{height:320,width:'100%',borderRadius:12},'aria-label':'نقشه موقعیت مدرسه'}),error&&h('p',{role:'alert'},error)):h('p',null,'موقعیت جغرافیایی مدرسه ثبت نشده است'));
}

function AccountManager({get,send}){
 const empty=()=>({id:null,username:'',display_name:'',password:'',can_receive:true,can_report:false,is_active:true});
 const [accounts,setAccounts]=useState([]),[form,setForm]=useState(empty),[busy,setBusy]=useState(false),[err,setErr]=useState(''),[notice,setNotice]=useState('');
 const reload=async()=>{const list=await get(base+'/accounts');setAccounts(Array.isArray(list)?list:[]);};
 useEffect(()=>{reload().catch(e=>setErr(errorText(e)));},[]);
 const change=(key,value)=>setForm(f=>({...f,[key]:value}));
 const save=async()=>{
  if(busy)return;
  setBusy(true);setErr('');setNotice('');
  try{
   if(!form.display_name.trim())throw Error('نام نمایشی الزامی است');
   if(!form.id&&!form.username.trim())throw Error('نام کاربری الزامی است');
   if(!form.id&&form.password.length<12)throw Error('رمز عبور باید حداقل ۱۲ کاراکتر داشته باشد');
   await send(form.id?'PUT':'POST',base+'/accounts'+(form.id?'/'+form.id:''),form);
   await reload();setForm(empty());setNotice('اطلاعات حساب اختصاصی ذخیره شد؛ تغییر مجوز یا رمز، نشست قبلی را باطل می‌کند');
  }catch(e){setErr(errorText(e));}finally{setBusy(false);}
 };
 return h('section',{className:'sc-card sc-account-manager'},
  h('h3',null,'کاربران اختصاصی شکایات سرویس مدارس'),
  h('p',{className:'sc-help'},'این حساب‌ها مستقل از پرسنل سازمان هستند؛ در فهرست کاربران، مناطق، چارت سازمانی و حضور و غیاب ثبت نمی‌شوند. ورود فقط از صفحه مخصوص شکایات امکان‌پذیر است.'),
  h('p',null,h('a',{href:'/school-complaints-portal',target:'_blank',rel:'noopener noreferrer'},'باز کردن صفحه ورود اختصاصی شکایات')),
  err&&h('p',{role:'alert',className:'sc-alert'},err),
  notice&&h('p',{role:'status',className:'sc-success'},notice),
  h('div',{className:'sc-grid'},
   field('نام و نام خانوادگی نمایشی',{value:form.display_name,maxLength:200,onChange:e=>change('display_name',e.target.value)}),
   field('نام کاربری لاتین',{value:form.username,maxLength:100,disabled:!!form.id,autoComplete:'off',onChange:e=>change('username',e.target.value)}),
   field(form.id?'رمز جدید (خالی = بدون تغییر)':'رمز عبور اولیه (حداقل ۱۲ کاراکتر)',{type:'password',value:form.password,maxLength:128,autoComplete:'new-password',onChange:e=>change('password',e.target.value)})),
  h('div',{className:'sc-toolbar'},
   ...[['can_receive','اجازه ثبت و دریافت شکایت'],['can_report','گزارش‌گیری از تمام شکایات'],['is_active','حساب فعال']].map(([k,title])=>h('label',{key:k},h('input',{type:'checkbox',checked:!!form[k],onChange:e=>change(k,e.target.checked)}),' '+title))),
  h('div',{className:'sc-toolbar'},btn(form.id?'ذخیره تغییرات کاربر':'ایجاد کاربر اختصاصی',save,busy,true),btn('پاک‌کردن فرم',()=>{setForm(empty());setErr('');},busy)),
  h('h4',null,'فهرست حساب‌های اختصاصی'),
  accounts.length?h('div',{className:'sc-table',role:'region',tabIndex:0,'aria-label':'جدول حساب‌های اختصاصی شکایات؛ برای مشاهده ستون‌های بیشتر پیمایش کنید'},h('table',{className:'sc-responsive-table'},
    h('thead',null,h('tr',null,...['نام','نام کاربری','ثبت شکایت','گزارش جامع','وضعیت','عملیات'].map(v=>h('th',{key:v},v)))),
    h('tbody',null,...accounts.map(a=>h('tr',{key:a.id},
      h('td',{'data-label':'نام'},a.display_name),h('td',{'data-label':'نام کاربری',dir:'ltr'},a.username),
      h('td',{'data-label':'ثبت شکایت'},a.can_receive?'مجاز':'غیرفعال'),
      h('td',{'data-label':'گزارش جامع'},a.can_report?'مجاز':'غیرفعال'),
      h('td',{'data-label':'وضعیت'},a.is_active?'فعال':'غیرفعال'),
      h('td',{'data-label':'عملیات'},btn('ویرایش / تغییر رمز',()=>{setForm({...a,password:''});setErr('');},busy))
    ))))):h('p',null,'هنوز کاربر اختصاصی تعریف نشده است')
 );
}

function Module({get,send,DatePicker,ClockInput}){
 const [access,A]=useState(null),[tab,T]=useState('dashboard'),[err,E]=useState(''),[msg,M]=useState(''),[busy,B]=useState(false),[refresh,F]=useState(0),[stats,S]=useState(null);
 const [draft,D]=useState(fresh),[step,J]=useState(0),[topics,Topics]=useState([]),[related,C]=useState([]),[detail,Q]=useState(null),[note,N]=useState(''),[act,Act]=useState('note');
 const [files,Files]=useState([]),[filterTopics,FilterTopics]=useState([]);
 const [receipt,Receipt]=useState(null),[inboxStats,InboxStats]=useState(null);
 const [filters,G]=useState({}),[page,P]=useState(1),[data,V]=useState(null),[config,K]=useState(null),[people,People]=useState({});
 const running=useRef(false), requestKey=useRef(null);
 // After a wizard transition, announce the new step and put keyboard focus on its heading.
 useEffect(()=>{if(tab!=='receive')return;document.getElementById('sc-wizard-heading')?.focus({preventScroll:true});},[step,tab]);
 const set=(key,val)=>D(d=>({...d,[key]:val}));
 const perform=async fn=>{if(running.current)return;running.current=true;B(true);E('');M('');try{await fn();}catch(e){E(errorText(e));}finally{running.current=false;B(false);}};
 const query=(p)=>new URLSearchParams({...Object.fromEntries(Object.entries(filters).filter(([k,v])=>!k.endsWith('_label')&&v!==''&&v!=null)),...(p?{page:String(p),page_size:'25'}:{})}).toString();
 useEffect(()=>{let live=true;get(base+'/access').then(a=>{if(live)A(a);}).catch(e=>{if(live)E(errorText(e));});return()=>{live=false;};},[]);
 useEffect(()=>{if(!access?.allowed)return;let live=true;E('');const load=async()=>{if(tab==='dashboard'){S(null);const x=await get(base+'/dashboard?'+query());if(live)S(x);}else if(tab==='receive'){const x=await get(base+'/topics');if(live)Topics(x);}else if(tab==='inbox'||tab==='search'){V(null);const x=await get(base+'/'+tab+'?'+query(page));if(live)V(x);if(live&&tab==='inbox')InboxStats(x.metrics||x.summary||null);}else if(tab==='settings'){const x=await get(base+'/settings');if(live)K({...x,receivers:x.receivers||[],reporters:x.reporters||[],topics:x.topics||[],review_hours:x.review_hours||24,supervisor_hours:x.supervisor_hours||24,require_supervisor:x.require_supervisor!==false});}};const timeout=setTimeout(()=>load().catch(e=>{if(live)E(errorText(e));}),tab==='search'||tab==='inbox'?250:0);return()=>{live=false;clearTimeout(timeout);};},[access,tab,refresh,page,filters]);
 useEffect(()=>{if(!draft.school_id)return;let live=true;C([]);get(base+'/companies?school_id='+encodeURIComponent(draft.school_id)).then(x=>{if(live){C(x);if(x.length===1)D(d=>String(d.school_id)===String(draft.school_id)&&!d.company_id?{...d,company_id:x[0].id,company_snapshot:x[0]}:d);}}).catch(e=>{if(live)E(errorText(e));});return()=>{live=false;};},[draft.school_id]);
 const go=t=>{Q(null);E('');M('');G({});P(1);T(t);};
 const open=id=>perform(async()=>{Q(await get(base+'/'+id));Files(await get(base+'/'+id+'/attachments'));N('');Act('note');});
 useEffect(()=>{if(!access?.allowed)return;let live=true;get(base+'/topics').then(x=>{if(live)FilterTopics(Array.isArray(x)?x:[]);}).catch(()=>{});return()=>{live=false;};},[access,refresh]);
 const upload=(id,file)=>perform(async()=>{if(!file)return;if(file.size>3*1024*1024)throw Error('حداکثر حجم فایل ۳ مگابایت است');if(!['image/jpeg','image/png','application/pdf'].includes(file.type))throw Error('فرمت فایل مجاز نیست');const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('خواندن فایل ناموفق بود'));reader.readAsDataURL(file);});await send('POST',base+'/'+id+'/attachments',{filename:file.name,content:data});Files(await get(base+'/'+id+'/attachments'));M('مستند ثبت شد');});
 const download=(id,aid)=>perform(async()=>{const x=await get(base+'/'+id+'/attachments/'+aid);const bytes=Uint8Array.from(atob(x.content),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes],{type:x.mime}));const a=document.createElement('a');a.href=url;a.download=x.filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 const deadline=x=>x.status==='closed'?'پایان یافته':x.remaining_minutes==null?'—':(Number(x.remaining_minutes)<0?'تأخیر: ':'باقی‌مانده: ')+fa(Math.abs(Number(x.remaining_minutes)))+' دقیقه';
 const verifyStep=(at=step)=>{const phone=en(draft.phone).trim().replace(/[\s()-]/g,'');if(at===0){if(!draft.first_name.trim()||!draft.last_name.trim()||(draft.complainant_type==='parent'&&!draft.address.trim()))throw Error('نام، نام خانوادگی و نشانی شاکی را کامل کنید');if(!(draft.complainant_type==='driver'?/^09\d{9}$/:/^0[1-9]\d{9}$/).test(phone))throw Error(draft.complainant_type==='driver'?'شماره همراه راننده باید ۱۱ رقم و با ۰۹ شروع شود':'شماره تماس والدین باید ۱۱ رقم و با ۰ شروع شود');}if(at===1&&!draft.school_id)throw Error('مدرسه را انتخاب کنید');if(at===2&&!draft.company_id)throw Error('شرکت سرویس‌دهنده را انتخاب کنید');if(at===3){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(draft.received_at)||!draft.subject||!draft.body.trim()||(draft.subject==='سایر'&&!draft.custom_subject.trim()))throw Error('تاریخ، ساعت، موضوع و متن شکایت را کامل کنید');}};
 const advance=()=>{try{verifyStep();E('');J(n=>Math.min(n+1,4));}catch(e){E(errorText(e));}};
 const register=()=>perform(async()=>{for(let i=0;i<4;i++){try{verifyStep(i);}catch(e){J(i);throw e;}}if(!requestKey.current)requestKey.current=crypto.randomUUID?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');const result=await send('POST',base,{...draft,submission_key:requestKey.current,phone:en(draft.phone).trim(),address:draft.complainant_type==='parent'?draft.address:'',received_at:draft.received_at.replace('T',' ')+':00'});requestKey.current=null;Receipt(result);M('شکایت با موفقیت ثبت شد');D(fresh());J(0);});
 const filt=(k,v)=>{P(1);G(f=>({...f,[k]:v}));};
 const name=x=>[x.first_name,x.last_name].filter(Boolean).join(' ');
 const print=()=>window.print();
 const savePdf=(item,receipt=false)=>perform(async()=>{if(!window.KhatyarSchoolPdf)throw Error('موتور PDF بارگذاری نشده است؛ صفحه را بازآوری کنید');const progress=window.KhatyarLongOperation;const job=progress?.begin('در حال تهیه فایل PDF',{delay:0,stage:'در حال آماده‌سازی صفحات و تصاویر PDF…'});try{if(job!=null)await new Promise(resolve=>setTimeout(resolve,0));await window.KhatyarSchoolPdf.download(receipt?item:{...item,attachments:files},{receipt,onProgress:(done,total)=>{if(job!=null)progress.update(job,{stage:'در حال پردازش صفحه '+String(done)+' از '+String(total)+' فایل PDF…'});}});M('فایل PDF آماده شد');}finally{if(job!=null)progress.end(job);}});
 const exportRows=()=>perform(async()=>{if(!window.XLSX)throw Error('کتابخانه Excel موجود نیست');const progress=window.KhatyarLongOperation;const job=progress?.begin('در حال تهیه خروجی اکسل',{delay:0,stage:'در حال دریافت ردیف‌های گزارش…'});try{if(job!=null)await new Promise(resolve=>setTimeout(resolve,0));let all=[],p=1,total=0;do{const x=await get(base+'/'+tab+'?'+query(p));if(!Array.isArray(x.rows))throw Error('ساختار گزارش معتبر نیست');total=+x.total;all.push(...x.rows);if(job!=null)progress.update(job,{stage:'دریافت '+String(all.length)+' ردیف از گزارش…'});if(all.length>10000)throw Error('بازه گزارش را محدود کنید (حداکثر ده هزار ردیف)');if(!x.rows.length)break;p++;}while(all.length<total);const safe=v=>typeof v==='string'&&/^[=+@\-\t\r]/.test(v)?"'"+v:v;if(job!=null){progress.update(job,{stage:'در حال آماده‌سازی '+String(all.length)+' ردیف اکسل…'});await new Promise(resolve=>setTimeout(resolve,0));}const rows=all.map(x=>({'کد رهگیری':x.tracking_code,'شاکی':safe(name(x)),'تلفن':safe(String(x.phone||'')),'مدرسه':safe(x.school_name),'شرکت':safe(x.company_name),'موضوع':safe(x.subject),'وضعیت':labels[x.status]||x.status,'تاریخ دریافت':date(x.received_at),'مهلت':date(x.due_at)}));const ws=XLSX.utils.json_to_sheet(rows);ws['!cols']=Array.from({length:9},()=>({wch:25}));if(ws['!ref'])ws['!autofilter']={ref:ws['!ref']};const wb=XLSX.utils.book_new();wb.Workbook={Views:[{RTL:true}]};XLSX.utils.book_append_sheet(wb,ws,'شکایات');const addSummary=(title,key,label)=>{const counts=new Map();for(const x of all){const k=String(label(x[key])||'نامشخص');counts.set(k,(counts.get(k)||0)+1);}const sheet=XLSX.utils.aoa_to_sheet([[title,'تعداد'],...Array.from(counts.entries()).sort((a,b)=>b[1]-a[1])]);sheet['!cols']=[{wch:40},{wch:16}];sheet['!autofilter']={ref:sheet['!ref']};XLSX.utils.book_append_sheet(wb,sheet,title);};if(job!=null){progress.update(job,{stage:'در حال تولید برگه‌های آماری…'});await new Promise(resolve=>setTimeout(resolve,0));}addSummary('آمار وضعیت','status',v=>labels[v]||v);addSummary('آمار مدارس','school_name',safe);addSummary('آمار شرکت‌ها','company_name',safe);addSummary('آمار موضوعات','subject',safe);addSummary('نوع شاکی','complainant_type',v=>v==='parent'?'والدین':'رانندگان');if(job!=null){progress.update(job,{stage:'در حال ساخت و ذخیره فایل Excel…'});await new Promise(resolve=>setTimeout(resolve,0));}XLSX.writeFile(wb,'school-complaints.xlsx');}finally{if(job!=null)progress.end(job);}});
 const content=()=>{
  if(detail){const d=detail;const own=d.can_act===true&&d.status!=='closed';return h('div',null,h('div',{className:'sc-toolbar sc-no-print'},btn('بازگشت',()=>Q(null)),btn('چاپ پرونده',()=>printOrganization(d)),btn('دریافت PDF مستقل',()=>savePdf(d),busy)),h('h3',null,'پرونده '+d.tracking_code),h('div',{className:'sc-case-qr'},h(QR,{code:d.tracking_code}),h('div',null,h('strong',{dir:'ltr',className:'sc-code'},d.tracking_code),h('p',{className:'sc-help'},'برای پیگیری، کد رهگیری را در بخش جستجوی شکایات وارد کنید'))),h('p',null,labels[d.status],d.overdue?' | دارای تأخیر':'',' | مهلت: '+date(d.due_at)),h('p',null,'مسئول فعلی: '+(d.assigned_name||'—')+' | '+deadline(d)),h('p',null,'مهلت کلی: '+date(d.overall_due_at)+' | '+deadline({...d,remaining_minutes:d.overall_remaining_minutes})),d.overall_overdue&&h('p',{className:'sc-overdue'},'مهلت کلی پرونده سپری شده است'),h('section',{className:'sc-card'},h('h4',null,'مشخصات شاکی'),h('p',null,name(d)+' — '+fa(d.phone)),h('p',null,d.address)),h('section',{className:'sc-card'},h('h4',null,'مدرسه'),h(Snapshot,{value:d.school_snapshot||{},fields:schoolFields})),h('section',{className:'sc-card'},h('h4',null,'شرکت'),h(Snapshot,{value:d.company_snapshot||{},fields:companyFields})),h('section',{className:'sc-card'},h('h4',null,d.subject),h('p',{className:'sc-long'},d.body),h('p',null,'دریافت: '+date(d.received_at)),h('p',null,'ثبت: '+date(d.created_at)),h('p',null,'پایان رسیدگی: '+date(d.closed_at))),h('section',{className:'sc-card'},h('h4',null,'مستندات پرونده'),files.length?files.map(x=>h('div',{key:x.id,className:'sc-toolbar'},h('span',null,x.filename+' — '+fa(Math.ceil(x.byte_size/1024))+' کیلوبایت'),btn('دریافت',()=>download(d.id,x.id),busy))):h('p',null,'مستندی ثبت نشده است'),d.can_attach&&h('label',{className:'sc-field sc-no-print'},'افزودن مستند (PDF یا تصویر، حداکثر ۳ مگابایت)',h('input',{type:'file',accept:'.pdf,.jpg,.jpeg,.png',disabled:busy,onChange:e=>{const file=e.target.files[0];e.target.value='';upload(d.id,file);}}))),h('section',{className:'sc-card'},h('h4',null,'تاریخچه رسیدگی'),...(d.events||[]).map(x=>h('article',{key:x.id,className:'sc-event'},h('strong',null,(actions[x.action]||'ثبت شکایت')+' — '+(x.actor_name||'کاربر')),h('small',null,date(x.created_at)),h('p',{className:'sc-long'},x.body)))),own&&h('section',{className:'sc-card sc-no-print'},select('عملیات',act,Act,Object.entries(actions).filter(([k])=>(d.allowed_actions||[]).includes(k))),h('textarea',{className:'input',rows:4,value:note,onChange:e=>N(e.target.value),placeholder:'توضیحات عملیات'}),btn('ثبت عملیات',()=>perform(async()=>{await send('POST',base+'/'+d.id+'/action',{action:act,body:note});Q(await get(base+'/'+d.id));N('');F(x=>x+1);M('عملیات ثبت شد');}),busy,true))); }
  if(tab==='dashboard'){const chartTitles={status:'وضعیت پرونده‌ها',type:'نوع شاکی',subject:'موضوع شکایات',district:'ناحیه آموزشی',school:'مدارس',company:'شرکت‌ها',day:'روز دریافت',month:'ماه دریافت',overdue:'وضعیت تأخیر',receiver:'ثبت‌کنندگان',assignee:'مسئولان جاری'};const chartLabel=(k,v)=>k==='status'?(labels[v]||v):k==='type'?(v==='parent'?'والدین':'رانندگان'):k==='overdue'?(+v?'دارای تأخیر':'بدون تأخیر'):v||'نامشخص';const keys={total:'کل شکایات',today:'امروز',month:'ماه جاری',pending:'در انتظار',in_progress:'در حال بررسی',answered:'پاسخ داده‌شده',escalated:'ارجاع‌شده',returned:'بررسی تکمیلی',closed:'مختومه',overdue:'دارای تأخیر',parents:'والدین',drivers:'رانندگان',average_resolution_minutes:'میانگین زمان رسیدگی (دقیقه)',resolved_percent:'درصد تعیین تکلیف',on_time_percent:'درصد مختومه در مهلت تمام مراحل',overall_overdue:'عبور از مهلت کلی'};return stats?h('div',null,h('div',{className:'sc-metrics'},...Object.entries(keys).map(([k,t])=>h('button',{key:k,className:'sc-card sc-metric',onClick:()=>{go('search');if(k in labels)G({status:k});else if(k==='overdue')G({overdue:'1'});else if(k==='parents'||k==='drivers')G({complainant_type:k==='parents'?'parent':'driver'});}},h('span',null,t),h('strong',null,fa(stats[k]==null?'—':Math.round(Number(stats[k])*10)/10))))),h('div',{className:'sc-chart-grid'},...Object.entries(chartTitles).map(([k,t])=>{const rows=stats.charts?.[k]||[],max=Math.max(1,...rows.map(x=>Number(x.total)));return h('section',{key:k,className:'sc-card'},h('h3',null,t),rows.length?rows.map((x,i)=>h('div',{key:i,className:'sc-chart-row'},h('span',null,fa(chartLabel(k,x.label))),h('strong',null,fa(x.total)),h('progress',{max,value:Number(x.total),'aria-label':String(chartLabel(k,x.label))}))):h('p',null,'داده‌ای وجود ندارد'));}))):h('p',null,'در حال دریافت آمار…');}
  if(tab==='receive'&&receipt){return h('section',{className:'sc-card sc-receipt'},h('h3',null,'رسید ثبت شکایت'),h('p',null,'کد رهگیری پرونده'),h(QR,{code:receipt.tracking_code}),h('strong',{dir:'ltr',className:'sc-code'},receipt.tracking_code),h('div',{className:'sc-toolbar sc-no-print'},btn('کپی کد رهگیری',()=>perform(async()=>{await navigator.clipboard.writeText(receipt.tracking_code);M('کد رهگیری کپی شد');})),btn('چاپ رسید',()=>printOrganization(receipt,true)),btn('دریافت PDF رسید',()=>savePdf(receipt,true),busy),btn('مشاهده پرونده',()=>open(receipt.id),busy),btn('ثبت شکایت جدید',()=>{Receipt(null);M('');},false,true)));}
  if(tab==='receive'){
   const steps=[['مشخصات شاکی','هویت و راه ارتباطی'],['انتخاب مدرسه','اطلاعات و موقعیت مدرسه'],['انتخاب شرکت','شرکت سرویس‌دهنده'],['شرح شکایت','تاریخ، موضوع و متن'],['بازبینی نهایی','تأیید و صدور کد رهگیری']];
   const school=draft.school_snapshot||{},company=draft.company_snapshot||{};
   const summary=(label,value)=>h('div',{className:'sc-wizard-summary-item'},h('dt',null,label),h('dd',null,value||'تکمیل نشده'));
   const panel=(n,title,children)=>h('section',{key:n,className:'sc-wizard-review-card'},
     h('header',null,h('h5',null,title),btn('ویرایش',()=>{E('');J(n);},busy)),
     h('div',{className:'sc-wizard-review-content'},children));
   const stepsBar=h('ol',{className:'sc-wizard-stepper','aria-label':'مراحل ثبت شکایت'},
     ...steps.map(([label],i)=>h('li',{key:i,className:(i===step?'is-current ':i<step?'is-done ':'')},
       h('button',{type:'button',disabled:busy||i>step,onClick:()=>{E('');J(i);},'aria-current':i===step?'step':undefined},
         h('span',{className:'sc-wizard-step-index','aria-hidden':'true'},i<step?'✓':fa(i+1)),
         h('span',{className:'sc-wizard-step-label'},label)))));
   let body;
   if(step===0)body=h('div',{className:'sc-wizard-stage'},
     h('div',{className:'sc-wizard-type-group',role:'group','aria-label':'نوع شاکی'},
       ...[['parent','والدین دانش‌آموز','ثبت شکایت توسط والد یا سرپرست'],['driver','راننده سرویس مدارس','ثبت شکایت توسط راننده']].map(([v,title,desc])=>
         h('button',{type:'button',key:v,'aria-pressed':draft.complainant_type===v,
            className:'sc-wizard-type'+(draft.complainant_type===v?' selected':''),
            onClick:()=>{set('complainant_type',v);E('');}},
           h('strong',null,title),h('small',null,desc)))),
     draft.complainant_type==='driver'&&h('div',{className:'sc-wizard-search'},
       h('h5',null,'تکمیل سریع از اطلاعات رانندگان سپند'),
       h(Lookup,{get,path:'drivers',label:'جستجوی نام یا تلفن راننده',min:2,display:x=>name(x)+' — '+fa(x.mobile),
         onPick:x=>D(d=>({...d,first_name:x.first_name||'',last_name:x.last_name||'',phone:x.mobile||''}))})),
     h('div',{className:'sc-wizard-form-grid'},
       field('نام *',{value:draft.first_name,maxLength:100,required:true,autoComplete:'given-name',onChange:e=>set('first_name',e.target.value)}),
       field('نام خانوادگی *',{value:draft.last_name,maxLength:100,required:true,autoComplete:'family-name',onChange:e=>set('last_name',e.target.value)}),
       field('شماره تماس *',{value:draft.phone,maxLength:18,required:true,dir:'ltr',inputMode:'tel',autoComplete:'tel',
         placeholder:draft.complainant_type==='driver'?'09123456789':'05112345678',onChange:e=>set('phone',e.target.value)}),
       draft.complainant_type==='parent'&&h('div',{className:'sc-wizard-span'},field('نشانی شاکی *',{value:draft.address,maxLength:700,required:true,autoComplete:'street-address',onChange:e=>set('address',e.target.value)}))),
     h('p',{className:'sc-wizard-help'},'فیلدهای ستاره‌دار الزامی هستند. شماره تماس باید ۱۱ رقم و با صفر شروع شود.'));
   if(step===1)body=h('div',{className:'sc-wizard-stage'},
     h('p',{className:'sc-wizard-lead'},'مدرسه را با نام یا کد جستجو کنید؛ سپس اطلاعات و موقعیت آن را بررسی کنید.'),
     h('div',{className:'sc-wizard-search'},
       h(Lookup,{key:'school-lookup',get,path:'schools',label:'جستجوی مدرسه',initial:school.name||'',display:x=>x.name+' — '+fa(x.educational_district),
         onPick:x=>{D(d=>({...d,school_id:x.id,school_snapshot:x,company_id:'',company_snapshot:{}}));C([]);E('');}})),
     draft.school_id&&h('div',{className:'sc-wizard-selection'},
       h('div',{className:'sc-wizard-selection-header'},h('div',null,h('strong',null,school.name||'مدرسه انتخاب‌شده'),h('small',null,'ناحیه '+fa(school.educational_district||'—')+' · کد '+fa(school.code||'—'))),
         btn('تغییر مدرسه',()=>{D(d=>({...d,school_id:'',school_snapshot:{},company_id:'',company_snapshot:{}}));C([]);},busy)),
       h('details',{className:'sc-wizard-expand'},h('summary',null,'نمایش و اصلاح جزئیات مدرسه'),h(Snapshot,{value:school,fields:schoolFields,onChange:x=>set('school_snapshot',x)})),
       h(SchoolMap,{school})));
   if(step===2)body=h('div',{className:'sc-wizard-stage'},
     h('p',{className:'sc-wizard-lead'},'شرکت مربوط به سرویس مدرسه را انتخاب کنید. در صورت نبودن در فهرست، نام شرکت را جستجو کنید.'),
     related.length>0&&h('div',{className:'sc-wizard-search'},
       select('شرکت‌های سرویس‌دهنده مدرسه',String(draft.company_id||''),v=>{
         const x=related.find(x=>String(x.id)===v);
         D(d=>({...d,company_id:x?.id||'',company_snapshot:x||{}}));
       },[['','انتخاب شرکت'],...related.map(x=>[String(x.id),x.name])])),
     h('div',{className:'sc-wizard-search'},
       h(Lookup,{key:'company-lookup',get,path:'companies',label:'جستجوی شرکت دیگر',initial:company.name||'',display:x=>x.name,
         onPick:x=>{D(d=>({...d,company_id:x.id,company_snapshot:x}));E('');}})),
     draft.company_id&&h('div',{className:'sc-wizard-selection'},
       h('div',{className:'sc-wizard-selection-header'},h('div',null,h('strong',null,company.name||'شرکت انتخاب‌شده'),h('small',null,'مدیرعامل: '+(company.manager_name||'ثبت نشده'))),
         btn('تغییر شرکت',()=>D(d=>({...d,company_id:'',company_snapshot:{}})),busy)),
       h('details',{className:'sc-wizard-expand'},h('summary',null,'نمایش و اصلاح اطلاعات شرکت و مدیرعامل'),h(Snapshot,{value:company,fields:companyFields,onChange:x=>set('company_snapshot',x)}))));
   if(step===3)body=h('div',{className:'sc-wizard-stage'},
     h('div',{className:'sc-wizard-form-grid'},
       h('div',{className:'sc-field'},h('span',null,'تاریخ دریافت (شمسی) *'),
         DatePicker?h(DatePicker,{value:draft.received_at.split('T')[0],portal:true,
           onChange:v=>set('received_at',(v||draft.received_at.split('T')[0])+'T'+(draft.received_at.split('T')[1]||'00:00'))}):h('p',{role:'alert'},'تقویم بارگذاری نشده است')),
       h('div',{className:'sc-field'},h('span',null,'ساعت دریافت (تهران) *'),
         ClockInput?h(ClockInput,{value:draft.received_at.split('T')[1]||'',onChange:v=>set('received_at',draft.received_at.split('T')[0]+'T'+en(v))}):
           h('input',{className:'input',type:'time',value:draft.received_at.split('T')[1]||'',onChange:e=>set('received_at',draft.received_at.split('T')[0]+'T'+e.target.value)}),
         btn('استفاده از زمان فعلی تهران',()=>set('received_at',now()),busy)),
       h('div',{className:'sc-wizard-span'},
         select('موضوع شکایت *',draft.subject,v=>set('subject',v),[['','موضوع را انتخاب کنید'],...topics.map(x=>[x,x])])),
       draft.subject==='سایر'&&h('div',{className:'sc-wizard-span'},
         field('موضوع سفارشی *',{value:draft.custom_subject,maxLength:255,required:true,onChange:e=>set('custom_subject',e.target.value)})),
       h('label',{className:'sc-field sc-wizard-span'},h('span',null,'شرح کامل شکایت *'),
         h('textarea',{className:'input',rows:7,maxLength:12000,required:true,value:draft.body,
           placeholder:'چه اتفاقی افتاده است؟ زمان، محل و جزئیات مرتبط را دقیق و روشن شرح دهید…',
           onChange:e=>set('body',e.target.value)}),
         h('small',{className:'sc-wizard-count'},fa(draft.body.length)+' / ۱۲٬۰۰۰ نویسه'))),
     h('p',{className:'sc-wizard-help'},'پس از ثبت نهایی، کد رهگیری پرونده صادر می‌شود.'));
   if(step===4)body=h('div',{className:'sc-wizard-review'},
     h('p',{className:'sc-wizard-lead'},'پیش از ثبت نهایی، همه اطلاعات را بررسی کنید. برای اصلاح هر بخش از «ویرایش» استفاده کنید.'),
     panel(0,'مشخصات شاکی',h('dl',{className:'sc-wizard-facts'},
       summary('نوع شاکی',draft.complainant_type==='driver'?'راننده سرویس مدارس':'والدین دانش‌آموز'),
       summary('نام و نام خانوادگی',name(draft)),summary('شماره تماس',fa(draft.phone)),
       draft.complainant_type==='parent'&&summary('نشانی',draft.address))),
     panel(1,'مدرسه',h('div',null,h('dl',{className:'sc-wizard-facts'},summary('نام مدرسه',school.name),summary('ناحیه',fa(school.educational_district))),h(SchoolMap,{school}))),
     panel(2,'شرکت سرویس‌دهنده',h('dl',{className:'sc-wizard-facts'},summary('شرکت',company.name),summary('مدیرعامل',company.manager_name),summary('همراه مدیرعامل',fa(company.manager_mobile)))),
     panel(3,'شرح شکایت',h('dl',{className:'sc-wizard-facts'},summary('تاریخ و ساعت',date(draft.received_at)),summary('موضوع',draft.subject==='سایر'?draft.custom_subject:draft.subject),summary('شرح شکایت',draft.body))));
   return h('div',{className:'sc-wizard'},
     h('div',{className:'sc-wizard-hero'},
       h('div',null,h('span',{className:'sc-wizard-eyebrow'},'ثبت پرونده جدید سرویس مدارس'),
         h('h3',null,'ویزارد ثبت شکایت'),h('p',null,'ثبت مرحله‌ای، بررسی مشخصات و تأیید نهایی در یک فرایند روشن')),
       h('div',{className:'sc-wizard-position',role:'status'},h('strong',null,fa(step+1)+' / '+fa(steps.length)),h('span',null,'مرحله'))),
     h('div',{className:'sc-wizard-track',role:'progressbar','aria-valuemin':1,'aria-valuemax':5,'aria-valuenow':step+1,'aria-label':'پیشرفت ثبت شکایت'},
       h('span',{style:{width:(step/4*100)+'%'}})),
     stepsBar,
     h('div',{className:'sc-wizard-layout'},
       h('main',{className:'sc-wizard-content'},
         h('section',{className:'sc-wizard-panel','aria-labelledby':'sc-wizard-heading'},
           h('header',{className:'sc-wizard-panel-header'},
             h('div',null,h('span',null,'مرحله '+fa(step+1)),h('h4',{id:'sc-wizard-heading',tabIndex:-1},steps[step][0]),h('p',null,steps[step][1])),
             h('span',{className:'sc-wizard-panel-number','aria-hidden':'true'},fa(step+1))),
           body,
           h('footer',{className:'sc-wizard-actions'},
             btn(step===0?'بازگشت':'مرحله قبل',()=>{E('');if(step===0)go('dashboard');else J(x=>x-1);},busy),
             step<4?btn('تأیید و ادامه',advance,busy,true):btn(busy?'در حال ثبت…':'تأیید و ثبت نهایی شکایت',register,busy,true)))),
       h('aside',{className:'sc-wizard-aside','aria-label':'خلاصه اطلاعات'},
         h('h5',null,'خلاصه اطلاعات پرونده'),
         h('dl',null,summary('شاکی',name(draft)),summary('شماره تماس',fa(draft.phone||'')),summary('مدرسه',school.name),
           summary('شرکت',company.name),summary('موضوع',draft.subject==='سایر'?draft.custom_subject:draft.subject)),
         h('p',null,'تا قبل از ثبت نهایی می‌توانید به مراحل قبلی بازگردید و اطلاعات را اصلاح کنید.'))));
  }
  if(tab==='inbox'||tab==='search'){return h('div',null,h('div',{className:'sc-grid sc-card sc-no-print'},...['first_name','last_name','phone','tracking_code'].map((k,i)=>field(['نام','نام خانوادگی','تلفن','کد رهگیری'][i],{key:k,value:filters[k]||'',onChange:e=>filt(k,e.target.value)})),h(Lookup,{key:'school-'+(filters.school_id||''),get,path:'schools',label:'مدرسه',initial:filters.school_label||'',display:x=>x.name,onPick:x=>{P(1);G(f=>({...f,school_id:x.id,school_label:x.name}));}}),h(Lookup,{key:'company-'+(filters.company_id||''),get,path:'companies',label:'شرکت',initial:filters.company_label||'',display:x=>x.name,onPick:x=>{P(1);G(f=>({...f,company_id:x.id,company_label:x.name}));}}),...['from','to'].map((k,i)=>h('div',{className:'sc-field',key:k},h('span',null,i?'تا تاریخ دریافت':'از تاریخ دریافت'),DatePicker?h(DatePicker,{value:(filters[k]||'').slice(0,10),portal:true,onChange:v=>filt(k,v?v+(k==='from'?' 00:00:00':' 23:59:59'):'')}):h('p',null,'تقویم بارگذاری نشده است'))),field('ناحیه آموزشی',{value:filters.district||'',onChange:e=>filt('district',en(e.target.value))}),select('موضوع شکایت',filters.subject||'',v=>filt('subject',v),[['','همه'],...filterTopics.filter(x=>x!=='سایر').map(x=>[x,x])]),...['closed_from','closed_to'].map((k,i)=>h('div',{className:'sc-field',key:k},h('span',null,i?'تا تاریخ مختومه':'از تاریخ مختومه'),DatePicker?h(DatePicker,{value:(filters[k]||'').slice(0,10),portal:true,onChange:v=>filt(k,v?v+(i?' 23:59:59':' 00:00:00'):'')}):h('p',null,'تقویم بارگذاری نشده است'))),select('وضعیت',filters.status||'',v=>filt('status',v),[['','همه'],...Object.entries(labels)]),select('نوع شاکی',filters.complainant_type||'',v=>filt('complainant_type',v),[['','همه'],['parent','والدین'],['driver','راننده']]),select('تأخیر',filters.overdue||'',v=>filt('overdue',v),[['','همه'],['1','دارای تأخیر']]),select('مرتب‌سازی',filters.sort||'id',v=>filt('sort',v),[['id','ردیف'],['received_at','تاریخ'],['due_at','مهلت'],['last_name','نام خانوادگی']]),select('جهت',filters.direction||'desc',v=>filt('direction',v),[['desc','نزولی'],['asc','صعودی']]),btn('حذف فیلترها',()=>{G({});P(1);}),btn('خروجی اکسل',exportRows,busy),btn('چاپ / ذخیره PDF صفحه',print)),data?h('div',null,tab==='inbox'&&inboxStats&&h('div',{className:'sc-metrics'},...Object.entries({total:'کل شکایات',pending:'در انتظار بررسی',in_progress:'در حال بررسی',escalated:'ارجاع‌شده',answered:'پاسخ داده‌شده',closed:'مختومه',overdue:'دارای تأخیر'}).map(([k,t])=>h('button',{type:'button',key:k,className:'sc-card sc-metric',onClick:()=>{P(1);G(k==='total'?{}:k==='overdue'?{overdue:'1'}:{status:k});}},h('span',null,t),h('strong',null,fa(inboxStats[k]))))),h('p',null,'تعداد نتایج: '+fa(data.total)),h('div',{className:'sc-table',role:'region',tabIndex:0,'aria-label':'فهرست پرونده‌های شکایات؛ برای مشاهده ستون‌های بیشتر پیمایش کنید'},h('table',{className:'sc-responsive-table'},h('thead',null,h('tr',null,...['کد رهگیری','شاکی','مدرسه','شرکت','موضوع','وضعیت','مسئول فعلی','مهلت','عملیات'].map(t=>h('th',{key:t},t)))),h('tbody',null,...(data.rows||[]).map(x=>h('tr',{key:x.id},h('td',{'data-label':'کد رهگیری'},x.tracking_code),h('td',{'data-label':'شاکی'},name(x),h('small',null,fa(x.phone))),h('td',{'data-label':'مدرسه'},x.school_name),h('td',{'data-label':'شرکت'},x.company_name),h('td',{'data-label':'موضوع'},x.subject),h('td',{'data-label':'وضعیت'},labels[x.status],x.overdue==1&&h('small',{className:'sc-overdue'},'دارای تأخیر')),h('td',{'data-label':'مسئول فعلی'},x.assigned_name||'—'),h('td',{'data-label':'مهلت'},date(x.due_at),h('small',null,deadline(x)),h('small',null,'مهلت کلی: '+date(x.overall_due_at))),h('td',{'data-label':'عملیات'},btn('جزئیات',()=>open(x.id),busy))))))),h('div',{className:'sc-toolbar sc-no-print'},btn('قبلی',()=>P(p=>p-1),page<=1),h('span',null,'صفحه '+fa(page)),btn('بعدی',()=>P(p=>p+1),page*25>=data.total))):h('p',null,'در حال دریافت اطلاعات…')); }
  if(tab==='settings'){if(!config)return h('p',null,'در حال دریافت تنظیمات…');const change=(k,v)=>K(c=>({...c,[k]:v}));const pick=(k,x)=>{People(p=>({...p,[x.id]:name(x)}));if(k==='receivers'||k==='reporters')K(c=>({...c,[k]:[...new Set([...(c[k]||[]).map(Number),+x.id])]}));else change(k,+x.id);};return h('section',{className:'sc-card'},h('h3',null,'مسئولان و گردش کار'),h('p',{className:'sc-help'},'دریافت‌کنندگان، رسیدگی‌کننده و مسئول واحد را تعیین کنید. تغییرات برای پرونده‌های جدید اعمال می‌شوند.'),...['reviewer','supervisor','receivers','reporters'].map((k,i)=>h('div',{key:k},h(Lookup,{get,path:'users',label:['رسیدگی‌کننده','مسئول واحد','دریافت‌کنندگان','کاربران مجاز به گزارش‌گیری از تمام پرونده‌ها'][i],display:x=>name(x)+' — '+x.username,onPick:x=>pick(k,x)}),h('div',{className:'sc-toolbar'},...(['receivers','reporters'].includes(k)?(config[k]||[]):[config[k]]).filter(Boolean).map(id=>h('span',{key:id},people[id]||'شناسه '+fa(id),' ',btn('حذف',()=>change(k,['receivers','reporters'].includes(k)?config[k].filter(x=>+x!==+id):null))))))),h('div',{className:'sc-grid'},field('مهلت رسیدگی (ساعت)',{type:'number',min:1,max:8760,value:config.review_hours,onChange:e=>change('review_hours',+e.target.value)}),field('مهلت مسئول واحد (ساعت)',{type:'number',min:1,max:8760,value:config.supervisor_hours,onChange:e=>change('supervisor_hours',+e.target.value)})),h('label',null,h('input',{type:'checkbox',checked:config.require_supervisor,onChange:e=>change('require_supervisor',e.target.checked)}),' بررسی مسئول واحد الزامی است'),h('h3',null,'موضوعات شکایت'),h('textarea',{className:'input',rows:7,value:config.topics.join('\n'),onChange:e=>change('topics',e.target.value.split('\n')),placeholder:'هر موضوع در یک خط'}),btn('ذخیره تنظیمات',()=>perform(async()=>{await send('PUT',base+'/settings',{...config,topics:config.topics.map(x=>x.trim()).filter(Boolean)});M('تنظیمات ذخیره شد');}),busy,true),h(AccountManager,{get,send}));}
 };
 const tabs=[['dashboard','داشبورد'],...(access?.receive?[['receive','دریافت شکایت']]:[]),['inbox','صندوق ورودی شکایات'],['search',access?.report?'گزارش جامع شکایات':'جستجوی پرونده‌های مرتبط'],...(access?.admin?[['settings','تنظیمات']]:[])];
 return h('div',{className:'sc-module',dir:'rtl'},h('header',{className:'sc-header'},h('h2',null,'شکایات سرویس مدارس'),h('p',null,'ثبت، پیگیری و مدیریت پرونده‌های شکایات')),err&&h('div',{className:'sc-alert',role:'alert'},err),msg&&h('div',{className:'sc-success',role:'status'},msg),access?access.allowed?h(R.Fragment,null,h('nav',{className:'sc-tabs sc-no-print'},...tabs.map(([k,t])=>h('button',{key:k,type:'button',className:'btn '+(k===tab?'p':''),onClick:()=>go(k)},t)),btn('بروزرسانی',()=>F(x=>x+1),busy)),content()):h('p',null,'دسترسی به این ماژول مجاز نیست.'):h('p',null,'در حال بررسی دسترسی…'));
}
window.KhatyarSchoolComplaints=Module;
})();
