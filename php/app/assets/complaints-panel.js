(function(){
'use strict';
const A='/api', token=()=>({Authorization:'Bearer '+(localStorage.token||'')});
const CACHE=new Map();
const esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const complaintStatus={received:'دریافت‌شده',in_review:'در حال بررسی',manager_review:'ارجاع به مسئول رسیدگی',answered:'پاسخ داده‌شده',closed:'مختومه',archived:'بایگانی‌شده',deleted:'حذف‌شده'};
const workflowLabel={received:'ثبت اولیه',note:'ثبت یادداشت',forward:'ارجاع',manager_forward:'ارجاع به مسئول',back:'بازگشت به دریافت‌کننده',reply:'ثبت پاسخ',close:'مختومه‌کردن',archive:'بایگانی',restore:'بازگردانی',delete:'حذف'};
const statusFa=s=>complaintStatus[s]||s||'نامشخص';
async function req(p,o={},ttl=0){
  const key=(o.method||'GET')+':'+p;
  if(!o.method&&ttl){const hit=CACHE.get(key);if(hit&&Date.now()-hit.t<ttl)return hit.v;}
  const r=await fetch(A+p,{cache:'no-store',headers:{'content-type':'application/json',...token(),...(o.headers||{})},...o});
  const t=await r.text();let j={};try{j=t?JSON.parse(t):{}}catch(e){throw Error('پاسخ نامعتبر سرور')};
  if(!r.ok)throw Error(j.error||j.message||'خطای سرور');
  if(!o.method&&ttl)CACHE.set(key,{t:Date.now(),v:j});
  return j;
}
const css=`
#khComplaints{position:relative;width:100%;min-height:calc(100vh - 100px);background:#f4f7fb;overflow:hidden;font-family:Vazirmatn,Tahoma,sans-serif;direction:rtl;color:#182230}
.khcLayout{display:block;width:100%;min-height:100%}
.khcSide{display:none}
.khcMain{width:100%;min-width:0;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.khcHead{position:relative;background:linear-gradient(135deg,#0d7a5f,#095b49);color:#fff;padding:14px 22px;display:flex;gap:12px;align-items:center;z-index:5;box-shadow:0 4px 18px #0002}
.khcHead h2{margin:0;font-size:18px}.khcHead small{opacity:.8}.khcClose{margin-right:auto;background:#fff;color:#0d7a5f;border:0;border-radius:10px;padding:8px 14px;font-weight:800;cursor:pointer}
.khcBody{padding:20px;max-width:1420px;width:100%;box-sizing:border-box;margin:0 auto;overflow:auto;min-height:0;flex:1}
.khcTabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;padding:6px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 2px 8px #17203308}
.khcTabs button{min-width:120px}

.khcTabs button,.khcBtn{border:1px solid #d9e1ea;background:#fff;border-radius:10px;padding:9px 14px;font:inherit;cursor:pointer;transition:.15s}
.khcTabs button:hover,.khcBtn:hover{transform:translateY(-1px);box-shadow:0 4px 12px #17203312}.khcOn,.khcPrimary{background:#0d7a5f!important;color:#fff!important;border-color:#0d7a5f!important}
.khcGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.khcCard{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px;box-shadow:0 2px 10px #17203308}
.khcNum{font-size:28px;font-weight:900;margin-top:7px}.khcMuted{color:#667085;font-size:12px}.khcPanel{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:18px;margin-bottom:14px;box-shadow:0 2px 10px #17203308}
.khcPanel h3,.khcPanel h4{margin:0 0 12px}.khcInput,.khcSelect,.khcArea{width:100%;box-sizing:border-box;border:1px solid #d9e1ea;border-radius:10px;padding:10px;font:inherit;margin:5px 0 10px;background:#fff}.khcArea{min-height:120px}
.khcRow{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.khcList{display:grid;gap:8px}.khcItem{border:1px solid #e1e7ee;border-radius:12px;padding:12px;background:#fff;cursor:pointer}.khcItem:hover{border-color:#0d7a5f;background:#f7fcfa}
.khcBadge{display:inline-block;padding:4px 9px;border-radius:20px;background:#edf8f4;color:#087353;font-size:11px}.khcWarn{background:#fff7e6;border:1px solid #f1d69b;padding:12px;border-radius:10px}
.khcSplit{display:grid;grid-template-columns:1.25fr .75fr;gap:14px}.khcBars{display:grid;gap:10px}.khcBarRow{display:grid;grid-template-columns:110px 1fr 45px;gap:8px;align-items:center;font-size:12px}.khcBar{height:9px;background:#e8edf2;border-radius:20px;overflow:hidden}.khcBar>i{display:block;height:100%;background:#0d7a5f;border-radius:20px}
.khcTableWrap{overflow:auto;border:1px solid #e2e8f0;border-radius:12px}.khcTable{width:100%;border-collapse:collapse;min-width:850px}.khcTable th,.khcTable td{border-bottom:1px solid #edf0f4;padding:10px;text-align:right;font-size:12px;white-space:nowrap}.khcTable th{background:#f7f9fb;font-weight:800}.khcEmpty{text-align:center;padding:28px;color:#667085}
.khcLoading{padding:28px;text-align:center;color:#667085}.khcSpin{display:inline-block;width:18px;height:18px;border:2px solid #dce5e0;border-top-color:#0d7a5f;border-radius:50%;animation:khspin .7s linear infinite;vertical-align:middle;margin-left:8px}@keyframes khspin{to{transform:rotate(360deg)}}
.khcCheckGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:9px}
.khcDateBox{display:flex;align-items:center;gap:6px;position:relative}.khcDateBox .khcInput{margin:5px 0}.khcDateBtn{border:1px solid #d9e1ea;background:#fff;border-radius:10px;padding:9px 11px;cursor:pointer;font-size:16px}.khcJp{position:absolute;top:58px;right:0;width:270px;background:#fff;border:1px solid #d9e1ea;border-radius:14px;box-shadow:0 12px 35px #17203322;padding:10px;z-index:20}.khcJpHead{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}.khcJpHead button{border:0;background:#edf8f4;border-radius:8px;width:32px;height:30px;cursor:pointer}.khcJpWeek,.khcJpDays{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center}.khcJpWeek{font-size:11px;color:#667085;margin-bottom:4px}.khcJpDays button{border:0;background:#f7f9fb;border-radius:7px;padding:7px 2px;cursor:pointer}.khcJpDays button:hover{background:#0d7a5f;color:#fff}.khcRole{display:flex;align-items:center;gap:10px;padding:11px 12px;border:1px solid #e4e7ec;border-radius:12px;background:#fff;cursor:pointer}.khcRole.on{border-color:#0d7a5f;background:#effaf6}.khcRole input{width:18px;height:18px}
@media(max-width:900px){.khcGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.khcSplit,.khcRow{grid-template-columns:1fr}}@media(max-width:560px){.khcGrid{grid-template-columns:1fr}.khcBody{padding:12px}}
`;
const polishCss=`
#khComplaints{--khc-brand:#086b57;--khc-ink:#183247;--khc-border:#dce7e8;color:var(--khc-ink);background:#f7fafb}
#khComplaints .khcHead{background:linear-gradient(110deg,#075946,#087c7d);padding:20px 24px}
#khComplaints .khcHead h2{font-size:21px;line-height:1.6}
#khComplaints .khcHead small{display:block;font-size:13px;line-height:1.8}
#khComplaints .khcTabs{position:sticky;top:0;z-index:25;padding:10px;gap:8px;border-color:var(--khc-border);box-shadow:0 4px 16px #172c3810}
#khComplaints .khcTabs button{min-height:44px;min-width:0;white-space:nowrap;font-weight:700}
#khComplaints .khcBtn{min-height:44px;font-weight:650}
#khComplaints :is(button,input,select,textarea):focus-visible{outline:3px solid #158ba3;outline-offset:2px}
#khComplaints button{touch-action:manipulation}
#khComplaints button:disabled{cursor:not-allowed;opacity:.52;transform:none;box-shadow:none}
#khComplaints .khcCard,#khComplaints .khcPanel{border-color:var(--khc-border);box-shadow:0 3px 14px #102c380b}
#khComplaints .khcCard{border-top:3px solid #087f72;min-width:0}
#khComplaints .khcNum{color:#105d61;font-variant-numeric:tabular-nums}
#khComplaints .khcInput,#khComplaints .khcSelect{min-height:44px}
#khComplaints .khcMuted{font-size:13px;line-height:1.7;color:#566879}
#khComplaints .khcItem{transition:border-color .15s ease,background-color .15s ease}
#khComplaints .khcTable th{position:sticky;top:0;z-index:1}
#khComplaints .khcWarn{color:#775015;line-height:1.8}
#khComplaints .khcBarRow{grid-template-columns:minmax(85px,130px) minmax(0,1fr) 55px}
#khComplaints .khcActions{display:flex;gap:9px;flex-wrap:wrap;align-items:center}
#khComplaints .khcToolbar{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:18px}
#khComplaints .khcToolbar .khcActions{flex:1;justify-content:flex-end}
#khComplaints .khcToolbar :is(.khcSelect,.khcInput){max-width:230px;margin:0}
#khComplaints .khcComplaintItem{cursor:default;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;border-right:4px solid #0d7a5f;padding:16px}
#khComplaints .khcDriverResult{text-align:right;width:100%;font:inherit;line-height:1.8}
#khComplaints .khcInfo{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #e7eff1}
#khComplaints .khcInfo span{color:#64748b}#khComplaints .khcInfo strong{font-weight:750;text-align:left}
#khComplaints .khcComplaintBody{white-space:pre-wrap;line-height:2;background:#f6faf9;border:1px solid #dce7e8;padding:16px;border-radius:12px}
#khComplaints .khcSignature{margin:14px 0;padding:14px;border:1px dashed #8cbcb1;border-radius:14px;background:#f8fcfb}
#khComplaints .khcSignature canvas{display:block;width:100%;max-width:650px;height:170px;border:1px solid #cbdad7;background:#fff;border-radius:10px;margin-bottom:10px}
#khComplaints .khcSignatureResult{min-height:68px;padding:12px;border:1px solid #dce7e8;border-radius:10px}
#khComplaints .khcSignatureImage{max-width:100%;max-height:140px;object-fit:contain}
#khComplaints .khcStatusLine{display:flex;gap:16px;align-items:center;margin:12px 0 20px}
#khComplaints .khcDanger{border-color:#e8b0b0;color:#a32222;background:#fff7f7}
#khComplaints .khcRole{transition:border-color .15s,background .15s}
#khComplaints .khcRole:has(input:focus-visible){outline:3px solid #158ba3;outline-offset:2px}
#khComplaints .khcBars .khcBarRow span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media(max-width:760px){#khComplaints .khcBody{padding:12px}#khComplaints .khcTabs{overflow-x:auto;flex-wrap:nowrap;scrollbar-width:thin;overscroll-behavior-x:contain}#khComplaints .khcTabs button{flex:0 0 auto}#khComplaints .khcHead{padding:15px 16px;flex-wrap:wrap}#khComplaints .khcRow,#khComplaints .khcSplit{grid-template-columns:1fr}#khComplaints .khcPanel{padding:14px}#khComplaints .khcCheckGrid{grid-template-columns:1fr}#khComplaints .khcBarRow{grid-template-columns:95px minmax(0,1fr) 48px}}
@media(max-width:760px){#khComplaints .khcToolbar .khcActions{width:100%;justify-content:stretch}#khComplaints .khcToolbar :is(.khcSelect,.khcInput){max-width:none;flex:1 1 180px}#khComplaints .khcComplaintItem{align-items:stretch}#khComplaints .khcComplaintItem .khcActions{width:100%}}
@media(max-width:400px){#khComplaints .khcGrid{grid-template-columns:1fr}#khComplaints .khcDateBox{min-width:0}#khComplaints .khcJp{max-width:calc(100vw - 44px)}}
@media(prefers-reduced-motion:reduce){#khComplaints .khcSpin{animation:none}#khComplaints button,#khComplaints .khcItem{transition:none}#khComplaints .khcBtn:hover,#khComplaints .khcTabs button:hover{transform:none}}
`;
function mountStyle(){if(document.getElementById('khc257-style'))return;const st=document.createElement('style');st.id='khc257-style';st.textContent=css+polishCss;document.head.appendChild(st)}
function loading(x){x.innerHTML='<div class="khcPanel khcLoading"><span class="khcSpin"></span>در حال دریافت اطلاعات…</div>'}
function tabs(active){return '<div class="khcTabs">'+[['dashboard','داشبورد'],['register','ثبت شکایت'],['received','شکایات دریافتی'],['report','گزارشگیری'],['settings','تنظیمات']].map(a=>'<button data-t="'+a[0]+'" class="'+(a[0]===active?'khcOn':'')+'">'+a[1]+'</button>').join('')+'</div>'}
function open(host){
 mountStyle();if(document.getElementById('khComplaints'))return;
 const root=document.createElement('div');root.id='khComplaints';
 root.innerHTML='<div class="khcLayout"><main class="khcMain"><div class="khcHead"><div><h2 id="khcTitle">مدیریت شکایات تاکسیرانان</h2><small>ثبت، ارجاع، پایش و گزارش‌گیری</small></div><button class="khcClose" type="button">بازگشت به پنل</button></div><div class="khcBody"><nav class="khcTabs" aria-label="تب‌های شکایات">'+[['dashboard','داشبورد'],['register','ثبت شکایت'],['received','شکایات دریافتی'],['report','گزارش‌گیری'],['settings','تنظیمات']].map(a=>'<button type="button" data-nav="'+a[0]+'">'+a[1]+'</button>').join('')+'</nav><div id="khcApp"></div></div></main></div>';
 const mount=(host&&host.nodeType===1)?host:document.body;mount.innerHTML='';mount.appendChild(root);root.querySelector('.khcClose').onclick=()=>root.remove();root.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>show(b.dataset.nav));show('dashboard');
}
function rootNavSync(tab){const r=document.getElementById('khComplaints');if(!r)return;const nav=r.querySelector('.khcTabs');nav.setAttribute('role','tablist');r.querySelectorAll('[data-nav]').forEach(b=>{const on=b.dataset.nav===tab;b.classList.toggle('khcOn',on);b.setAttribute('role','tab');b.setAttribute('aria-selected',String(on));b.setAttribute('tabindex',on?'0':'-1')});const titles={dashboard:'داشبورد شکایات',register:'ثبت شکایت',received:'شکایات دریافتی',report:'گزارش‌گیری حرفه‌ای شکایات',settings:'تنظیمات شکایات'};const t=r.querySelector('#khcTitle');if(t)t.textContent=titles[tab]||'مدیریت شکایات تاکسیرانان';}
async function show(tab){
 const app=document.getElementById('khcApp');if(!app)return;app.innerHTML='<div id="khcTab" role="tabpanel" aria-live="polite"></div>';rootNavSync(tab);
 app.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>show(b.dataset.t));const x=document.getElementById('khcTab');
 try{
  if(tab==='dashboard')return await dashboard(x);
  if(tab==='register')return await register(x);
  if(tab==='received')return await received(x);
  if(tab==='report')return await report(x);
  return await settings(x);
 }catch(e){x.innerHTML='<div class="khcPanel khcWarn">'+esc(e.message)+'</div>'}
}
async function dashboard(x){
 loading(x);
 const [d,ch]=await Promise.all([req('/admin/complaints/dashboard',{},15000),req('/admin/complaints/channel-stats',{},30000).catch(()=>({items:[]}))]);
 const total=Number(d.total||0),closed=Number(d.closed||0),progress=Number(d.in_progress||0),other=Math.max(0,total-closed-progress);
 const lines=Array.isArray(d.by_line)?d.by_line.slice(0,10):[];
 const max=Math.max(1,...lines.map(v=>Number(v.n||0)));
 const labels={software:'کاربران نرم‌افزار',phone:'تماس تلفنی',in_person:'حضوری'};
 const channels=Array.isArray(ch.items)?ch.items:[];
 x.innerHTML='<div class="khcGrid">'+[
  ['کل شکایات',total,'ثبت‌شده'],['در جریان',progress,'نیازمند رسیدگی'],['مختومه',closed,'پایان‌یافته'],['سایر',other,'وضعیت‌های دیگر']
 ].map(v=>'<div class="khcCard"><div class="khcMuted">'+v[0]+'</div><div class="khcNum">'+v[1].toLocaleString('fa-IR')+'</div><div class="khcMuted">'+v[2]+'</div></div>').join('')+'</div>'+
 '<div class="khcSplit" style="margin-top:14px"><div class="khcPanel"><h3>توزیع وضعیت شکایات</h3><div class="khcBars">'+[
 ['مختومه',closed,total],['در جریان',progress,total],['سایر',other,total]
 ].map(v=>'<div class="khcBarRow"><span>'+v[0]+'</span><div class="khcBar"><i style="width:'+((v[2]?v[1]/v[2]*100:0).toFixed(1))+'%"></i></div><b>'+v[1]+'</b></div>').join('')+'</div></div>'+
 '<div class="khcPanel"><h3>نحوه دریافت شکایت</h3><div class="khcBars">'+(channels.map(v=>'<div class="khcBarRow"><span>'+esc(labels[v.channel]||v.channel||'سایر')+'</span><div class="khcBar"><i style="width:'+Number(v.percent||0)+'%"></i></div><b>'+Number(v.count||0)+'</b></div>').join('')||'<div class="khcEmpty">اطلاعاتی ثبت نشده است.</div>')+'</div></div></div>'+
 '<div class="khcPanel" style="margin-top:14px"><div style="display:flex;justify-content:space-between;align-items:center"><h3>خطوط با بیشترین شکایت</h3><span class="khcMuted">۱۰ خط اول</span></div><div class="khcBars">'+(lines.map(v=>'<div class="khcBarRow" style="grid-template-columns:90px 1fr 55px"><span>خط '+esc(v.line_code||'—')+'</span><div class="khcBar"><i style="width:'+((Number(v.n||0)/max)*100).toFixed(1)+'%"></i></div><b>'+Number(v.n||0)+'</b></div>').join('')||'<div class="khcEmpty">داده‌ای وجود ندارد.</div>')+'</div></div>';
 const bars=(title,items,key)=>{const highest=Math.max(1,...items.map(v=>Number(v.n||0)));return '<section class="khcPanel"><h3>'+title+'</h3><div class="khcBars">'+(items.map(v=>'<div class="khcBarRow"><span>'+esc(v[key]||'نامشخص')+'</span><div class="khcBar"><i style="width:'+Math.min(100,Number(v.n||0)*100/highest)+'%"></i></div><b>'+faDigits(v.n||0)+'</b></div>').join('')||'<p class="khcEmpty">اطلاعاتی ثبت نشده است.</p>')+'</div></section>';};
 x.innerHTML+='<div class="khcSplit" style="margin-top:14px">'+bars('مناطق دارای بیشترین شکایت',d.by_region||[],'region_name')+bars('موضوعات پرتکرار',d.by_category||[],'category')+'</div><div class="khcPanel"><h3>نرخ مختومه‌شدن شکایات</h3><div class="khcNum">'+faDigits(d.closure_rate||0)+'٪</div><div class="khcMuted">نسبت شکایات مختومه به مجموع پرونده‌های فعال</div></div>';
}
async function register(x){
 x.innerHTML='<div class="khcPanel"><h3>یافتن تاکسیران</h3><p class="khcMuted">جستجو بر اساس نام و نام خانوادگی، کد ملی، شماره همراه، پلاک، کد بهره‌برداری یا خط؛ می‌توانید خط را جداگانه محدود کنید.</p><div class="khcRow"><div><label for="kcq">مشخصات تاکسیران</label><input id="kcq" class="khcInput" autocomplete="off" placeholder="مثلاً نام خانوادگی یا کد ملی"></div><div><label for="kcline">شماره خط (اختیاری)</label><input id="kcline" class="khcInput" placeholder="کد خط"></div></div><button id="kcs" class="khcBtn khcPrimary">جستجوی تاکسیران</button><div id="kcr" class="khcList" aria-live="polite"></div></div>';
 const search=async()=>{const q=x.querySelector('#kcq').value.trim(),line=x.querySelector('#kcline').value.trim(),out=x.querySelector('#kcr');if(q.length<2&&!line){out.innerHTML='<p class="khcWarn">حداقل دو نویسه وارد کنید یا یک خط انتخاب کنید.</p>';return}loading(out);try{const rows=await req('/complaints/drivers-advanced?'+new URLSearchParams({q,line}),{},3000);out.innerHTML=rows.map(v=>'<button type="button" class="khcItem khcDriverResult" data-id="'+v.id+'"><b>'+esc((v.first_name||'')+' '+(v.last_name||''))+'</b><div class="khcMuted">کد ملی: '+esc(v.national_id||'—')+' | همراه: '+esc(v.mobile||'—')+'</div><div class="khcMuted">پلاک: '+esc(v.plate||'—')+' | خط: '+esc(v.line_code||'—')+' | منطقه: '+esc(v.region_name||'—')+' | کد بهره‌برداری: '+esc(v.operating_code||v.vehicle_operating_code||'—')+'</div></button>').join('')||'<div class="khcEmpty">تاکسیرانی با این مشخصات پیدا نشد.</div>';out.querySelectorAll('.khcDriverResult').forEach(el=>el.onclick=()=>openForm(rows.find(v=>String(v.id)===el.dataset.id)))}catch(e){out.innerHTML='<div class="khcWarn">'+esc(e.message)+'</div>'}};
 x.querySelector('#kcs').onclick=search;let timer;x.querySelectorAll('#kcq,#kcline').forEach(input=>{input.oninput=()=>{clearTimeout(timer);timer=setTimeout(search,450)};input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();clearTimeout(timer);search()}}});
}
async function openForm(driver){
 const x=document.getElementById('khcTab');loading(x);
 const [cats,cities,loc]=await Promise.all([req('/complaints/categories?type=rate',{},60000),req('/complaints/cities',{},300000).catch(()=>[]),req('/complaints/default-location',{},30000).catch(()=>null)]);
 x.innerHTML='<div class="khcPanel"><h3>ثبت شکایت برای '+esc((driver.first_name||'')+' '+(driver.last_name||''))+'</h3><div class="khcMuted">پلاک '+esc(driver.plate||'—')+' | خط '+esc(driver.line_code||'—')+'</div><div class="khcRow"><div><label>نحوه دریافت</label><select id="crch" class="khcSelect"><option value="software">کاربران نرم‌افزار</option><option value="phone">تلفنی</option><option value="in_person">حضوری</option></select></div><div><label>محل دریافت</label><input id="cloc" class="khcInput" value="'+esc(loc?.name||'آخرین محل ثبت حضور')+'"></div></div><div class="khcRow"><input id="cf" class="khcInput" placeholder="نام شاکی"><input id="cl" class="khcInput" placeholder="نام خانوادگی شاکی"></div><div class="khcRow"><input id="cm" class="khcInput" placeholder="شماره همراه"><select id="ct" class="khcSelect"><option value="neighbor">مجاور / مقیم مشهد</option><option value="visitor">زائر</option></select></div><div class="khcRow"><input id="cstay" class="khcInput" type="number" min="1" placeholder="مدت اقامت زائر (روز)"><input id="ccity" list="citylist" class="khcInput" placeholder="شهر محل سکونت زائر"><datalist id="citylist">'+cities.map(c=>'<option value="'+esc(c.name||c)+'">').join('')+'</datalist></div><div class="khcRow"><select id="ctype" class="khcSelect"><option value="rate">تخلف نرخی</option><option value="non_rate">تخلف غیرنرخی</option></select><select id="cc" class="khcSelect">'+cats.map(c=>'<option value="'+c.id+'">'+esc(c.title)+'</option>').join('')+'</select></div><input id="cs" class="khcInput" placeholder="موضوع شکایت"><textarea id="cb" class="khcArea" placeholder="متن کامل شکایت"></textarea><button id="csubmit" class="khcBtn khcPrimary">ثبت شکایت</button></div>';
 const signatureBox=document.createElement('div');signatureBox.className='khcSignature';signatureBox.innerHTML='<label for="khcSignatureCanvas">امضای شاکی (اختیاری)</label><p class="khcMuted">شاکی می‌تواند با انگشت یا قلم روی کادر امضا کند.</p><canvas id="khcSignatureCanvas" width="650" height="170" aria-label="کادر رسم امضای شاکی"></canvas><button type="button" class="khcBtn" id="khcClearSignature">پاک کردن امضا</button>';x.querySelector('#csubmit').before(signatureBox);
 const canvas=signatureBox.querySelector('canvas'),ctx=canvas.getContext('2d');let signed=false,drawing=false;ctx.strokeStyle='#183247';ctx.lineWidth=2.4;ctx.lineCap='round';canvas.style.touchAction='none';const position=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}};canvas.onpointerdown=e=>{drawing=true;signed=true;canvas.setPointerCapture(e.pointerId);const p=position(e);ctx.beginPath();ctx.moveTo(p.x,p.y)};canvas.onpointermove=e=>{if(!drawing)return;const p=position(e);ctx.lineTo(p.x,p.y);ctx.stroke()};canvas.onpointerup=canvas.onpointercancel=()=>{drawing=false};signatureBox.querySelector('#khcClearSignature').onclick=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);signed=false};
 const ids=['crch','cf','cl','cm','ct','cstay','ccity','ctype','cc','cs','cb','cloc','csubmit'];const el={};ids.forEach(id=>el[id]=document.getElementById(id));
 const fieldLabels={cf:'نام شاکی',cl:'نام خانوادگی شاکی',cm:'شماره همراه',cstay:'مدت اقامت زائر (روز)',ccity:'شهر محل سکونت زائر',cs:'موضوع شکایت',cb:'متن کامل شکایت',cloc:'محل دریافت',ctype:'نوع تخلف',cc:'دسته‌بندی شکایت',ct:'نوع شاکی',crch:'نحوه دریافت'};
 Object.entries(fieldLabels).forEach(([id,label])=>el[id].setAttribute('aria-label',label));
 const syncVisitor=()=>{const visitor=el.ct.value==='visitor';[el.cstay,el.ccity].forEach(field=>{field.disabled=!visitor;field.required=visitor;field.setAttribute('aria-hidden',String(!visitor));field.style.display=visitor?'':'none'})};
 el.ct.onchange=syncVisitor;syncVisitor();
 el.ctype.onchange=async()=>{el.cc.disabled=true;try{const ccats=await req('/complaints/categories?type='+encodeURIComponent(el.ctype.value),{},60000);el.cc.innerHTML=ccats.map(c=>'<option value="'+c.id+'">'+esc(c.title)+'</option>').join('')||'<option value="">دسته‌بندی فعالی یافت نشد</option>'}catch(e){alert(e.message)}finally{el.cc.disabled=false}};
 el.csubmit.onclick=async()=>{if(!el.cf.value.trim()||!el.cl.value.trim()||!el.cm.value.trim()||!el.cs.value.trim()||!el.cb.value.trim())return alert('نام، نام خانوادگی، موبایل، موضوع و متن شکایت الزامی است.');if(!/^09\d{9}$/.test(toEn(el.cm.value).replace(/\s|-/g,'')))return alert('شماره همراه را به صورت ۰۹xxxxxxxxx وارد کنید.');if(!el.cc.value)return alert('دسته‌بندی شکایت را انتخاب کنید.');if(el.ct.value==='visitor'&&(!el.cstay.value||!el.ccity.value.trim()))return alert('برای زائر مدت اقامت و شهر محل سکونت الزامی است.');el.csubmit.disabled=true;el.csubmit.textContent='در حال ثبت شکایت…';try{const r=await req('/complaints',{method:'POST',body:JSON.stringify({driver_id:driver.id,receipt_channel:el.crch.value,complainant_first_name:el.cf.value.trim(),complainant_last_name:el.cl.value.trim(),complainant_mobile:toEn(el.cm.value).replace(/\s|-/g,''),complainant_type:el.ct.value,stay_days:el.ct.value==='visitor'?Number(el.cstay.value):null,residence_city:el.ct.value==='visitor'?el.ccity.value.trim():null,complaint_type:el.ctype.value,category_id:Number(el.cc.value),subject:el.cs.value.trim(),body:el.cb.value.trim(),location_name:el.cloc.value.trim()||loc?.name||'آخرین محل ثبت حضور',lat:loc?.lat??null,lng:loc?.lng??null,signature_data:signed?canvas.toDataURL('image/png'):null})});CACHE.clear();alert('شماره پیگیری: '+r.tracking_code);show('dashboard')}catch(e){alert(e.message);el.csubmit.disabled=false;el.csubmit.textContent='ثبت شکایت'}};
}
async function received(x){
 loading(x);const [active,archived,access]=await Promise.all([req('/complaints/my',{},5000),req('/complaints/my?archived=1',{},5000),req('/complaints/access',{},15000)]);
 x.innerHTML='<div class="khcPanel"><div class="khcToolbar"><div><h3>کارتابل شکایات</h3><p class="khcMuted">'+faDigits(active.length)+' پرونده جاری · '+faDigits(archived.length)+' بایگانی‌شده</p></div><div class="khcActions"><select class="khcSelect" id="khcStatusFilter" aria-label="فیلتر وضعیت"><option value="">همه وضعیت‌ها</option>'+Object.entries(complaintStatus).filter(v=>!['deleted','archived'].includes(v[0])).map(v=>'<option value="'+v[0]+'">'+v[1]+'</option>').join('')+'</select><input class="khcInput" id="khcListSearch" aria-label="جستجوی شکایت" placeholder="جستجوی نام، پیگیری یا موضوع"><label class="khcRole"><input type="checkbox" id="khcArchiveToggle"> نمایش بایگانی</label></div></div><div class="khcList" id="khcReceivedList"></div></div>';
 const render=()=>{const archive=x.querySelector('#khcArchiveToggle').checked,term=x.querySelector('#khcListSearch').value.trim().toLowerCase(),status=x.querySelector('#khcStatusFilter').value;const filtered=(archive?archived:active).filter(v=>(!status||v.status===status)&&(!term||[v.tracking_code,v.driver_name,v.subject,v.plate,v.line_code].some(s=>String(s||'').toLowerCase().includes(term))));const out=x.querySelector('#khcReceivedList');out.innerHTML=filtered.map(v=>'<article class="khcItem khcComplaintItem"><div><b>'+esc(v.tracking_code)+' · '+esc(v.subject||'بدون موضوع')+'</b><div class="khcMuted">تاکسیران: '+esc(v.driver_name||'—')+' · خط '+esc(v.line_code||'—')+' · '+esc(v.plate||'—')+'</div></div><div class="khcActions"><span class="khcBadge">'+esc(statusFa(v.status))+'</span><button class="khcBtn" data-detail="'+v.id+'">مشاهده پرونده</button>'+(access.can_manage?'<button class="khcBtn" data-life="'+v.id+'" data-action="'+(archive?'restore':'archive')+'">'+(archive?'بازگردانی':'بایگانی')+'</button><button class="khcBtn khcDanger" data-life="'+v.id+'" data-action="delete">حذف</button>':'')+'</div></article>').join('')||'<div class="khcEmpty">پرونده‌ای با این فیلتر یافت نشد.</div>';out.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>detail(b.dataset.detail));out.querySelectorAll('[data-life]').forEach(b=>b.onclick=()=>lifecycle(b.dataset.life,b.dataset.action));};
 x.querySelectorAll('#khcStatusFilter,#khcArchiveToggle').forEach(el=>el.onchange=render);x.querySelector('#khcListSearch').oninput=render;render();
}
async function lifecycle(id,action){const title={archive:'بایگانی',restore:'بازگردانی',delete:'حذف'}[action];if(!confirm('آیا از '+title+' این پرونده مطمئن هستید؟\nسوابق برای حسابرسی محفوظ می‌مانند.'))return;const reason=action==='delete'?prompt('دلیل حذف پرونده را وارد کنید:'):'';if(action==='delete'&&!reason?.trim())return;try{await req('/complaints/'+id+'/lifecycle',{method:'POST',body:JSON.stringify({action,reason})});CACHE.clear();show('received')}catch(e){alert(e.message)}}
function j2g(jy,jm,jd){
  jy=Number(jy);jm=Number(jm);jd=Number(jd);
  const epbase=jy-(jy>=0?474:473),epyear=474+(epbase%2820);
  const jdn=jd+(jm<=7?31*(jm-1):30*(jm-1)+6)+Math.floor((epyear*682-110)/2816)+(epyear-1)*365+Math.floor(epbase/2820)*1029983+1948320;
  let f=jdn+68569,c=4*f/146097|0;f=f-(146097*c+3)/4|0;
  let y=4000*(f+1)/1461001|0;f=f-1461*y/4|0+31;let m=80*f/2447|0,d=f-2447*m/80|0;f=m/11|0;m=m+2-12*f;y=100*(c-49)+y+f;
  return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
}
function g2j(date){
  const d=new Date(date+'T00:00:00Z'),gy0=d.getUTCFullYear(),gm0=d.getUTCMonth(),gd0=d.getUTCDate();
  const gy=gy0-1600,gm=gm0,gd=gd0-1,gdm=[31,28,31,30,31,30,31,31,30,31,30,31];
  let gdn=365*gy+Math.floor((gy+3)/4)-Math.floor((gy+99)/100)+Math.floor((gy+399)/400);
  for(let i=0;i<gm;i++)gdn+=gdm[i];
  if(gm>1&&((gy0%4===0&&gy0%100!==0)||gy0%400===0))gdn++;
  gdn+=gd;
  let jdn=gdn-79,jnp=Math.floor(jdn/12053);jdn%=12053;
  let jy=979+33*jnp+4*Math.floor(jdn/1461);jdn%=1461;
  if(jdn>=366){jy+=Math.floor((jdn-1)/365);jdn=(jdn-1)%365;}
  const jm=jdn<186?1+Math.floor(jdn/31):7+Math.floor((jdn-186)/30),jd=1+(jdn<186?jdn%31:(jdn-186)%30);
  return {jy,jm,jd};
}
const faDigits=s=>String(s).replace(/\\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
const toEn=s=>String(s||'').replace(/[۰-۹]/g,d=>'0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)]);
function jalaliValid(s){const m=toEn(s).match(/^(\\d{4})[\\/-](\\d{1,2})[\\/-](\\d{1,2})$/);if(!m)return false;const jy=+m[1],jm=+m[2],jd=+m[3];return jy>=1300&&jm>=1&&jm<=12&&jd>=1&&jd<=(jm<=6?31:jm<=11?30:30);}
function reportDatePicker(input){
  let p=input.parentElement.querySelector('.khcJp');if(p){p.remove();return;}
  p=document.createElement('div');p.className='khcJp';
  let v=toEn(input.value),m=v.match(/^(\\d{4})[\\/-](\\d{1,2})[\\/-](\\d{1,2})$/),now=g2j(new Date().toISOString().slice(0,10));
  let cy=m?+m[1]:now.jy,cm=m?+m[2]:now.jm;
  const render=()=>{
    const ml=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
    const first=g2j(j2g(cy,cm,1)); const dow=new Date(j2g(cy,cm,1)+'T00:00:00Z').getUTCDay();
    const offset=(dow+1)%7, max=cm<=6?31:cm<=11?30:30;
    let h='<div class="khcJpHead"><button data-jp="prev">‹</button><b>'+ml[cm-1]+' '+faDigits(cy)+'</b><button data-jp="next">›</button></div><div class="khcJpWeek">'+['ش','ی','د','س','چ','پ','ج'].map(d=>'<span>'+d+'</span>').join('')+'</div><div class="khcJpDays">';
    for(let i=0;i<offset;i++)h+='<span></span>';
    for(let d=1;d<=max;d++)h+='<button type="button" data-day="'+d+'">'+faDigits(d)+'</button>';
    p.innerHTML=h+'</div>';
    p.querySelector('[data-jp="prev"]').onclick=()=>{cm--;if(cm<1){cm=12;cy--;}render()};
    p.querySelector('[data-jp="next"]').onclick=()=>{cm++;if(cm>12){cm=1;cy++;}render()};
    p.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{input.value=cy+'/'+String(cm).padStart(2,'0')+'/'+String(b.dataset.day).padStart(2,'0');p.remove();});
  };render();input.parentElement.style.position='relative';input.parentElement.appendChild(p);
}
async function report(x){
  x.innerHTML='<div class="khcPanel"><h3>گزارش‌گیری حرفه‌ای شکایات</h3><div class="khcMuted">بازه گزارش با تقویم شمسی انتخاب می‌شود و هنگام ارسال به سرور به تاریخ میلادی تبدیل خواهد شد.</div><div class="khcRow"><div><label>از تاریخ (شمسی)</label><div class="khcDateBox"><input id="kf" class="khcInput" inputmode="numeric" placeholder="۱۴۰۵/۰۷/۰۱"><button type="button" class="khcDateBtn" data-for="kf">📅</button></div></div><div><label>تا تاریخ (شمسی)</label><div class="khcDateBox"><input id="kt" class="khcInput" inputmode="numeric" placeholder="۱۴۰۵/۰۷/۳۰"><button type="button" class="khcDateBtn" data-for="kt">📅</button></div></div></div><div class="khcRow"><input id="kd" class="khcInput" placeholder="فیلتر تاکسیران: کد ملی، پلاک، خط یا کد خودرو"><select id="kl" class="khcSelect"><option value="">همه خطوط</option></select></div><div class="khcActions"><button id="krun" class="khcBtn khcPrimary">تولید گزارش</button><button id="kxls" class="khcBtn">خروجی Excel</button></div><div id="ksum" style="display:none" class="khcGrid"></div><div id="krep" style="margin-top:14px"></div></div>';
  const ls=await req('/admin/lines',{},180000);x.querySelector('#kl').innerHTML='<option value="">همه خطوط</option>'+ls.map(v=>'<option value="'+v.id+'">خط '+esc(v.code)+'</option>').join('');
  x.querySelectorAll('.khcDateBtn').forEach(b=>b.onclick=()=>reportDatePicker(x.querySelector('#'+b.dataset.for)));
  ['kf','kt'].forEach(id=>x.querySelector('#'+id).onblur=e=>{if(e.target.value&&!jalaliValid(e.target.value)){e.target.setCustomValidity('تاریخ شمسی نامعتبر است؛ مانند ۱۴۰۵/۰۷/۰۱ وارد کنید.');e.target.reportValidity()}else e.target.setCustomValidity('')});
  x.querySelector('#krun').onclick=async()=>{
    const out=x.querySelector('#krep'), from=x.querySelector('#kf').value.trim(), to=x.querySelector('#kt').value.trim();
    if(from&&!jalaliValid(from)||to&&!jalaliValid(to))return alert('تاریخ شمسی را به شکل ۱۴۰۵/۰۷/۰۱ وارد کنید.');
    const fromG=from?j2g(...toEn(from).split(/[\\/-]/).map(Number)):'';const toG=to?j2g(...toEn(to).split(/[\\/-]/).map(Number)):'';
    loading(out);let did='';const dq=x.querySelector('#kd').value.trim();if(dq){const ds=await req('/complaints/drivers?q='+encodeURIComponent(dq),{},10000);if(!ds[0]){out.innerHTML='<div class="khcWarn">تاکسیران موردنظر پیدا نشد.</div>';return}did=ds[0].id}
    const qs=new URLSearchParams({from:fromG,to:toG,line_id:x.querySelector('#kl').value,driver_id:did});
    try{const rows=await req('/admin/complaints/report?'+qs.toString(),{},5000);window.__khcReport=rows;const closed=rows.filter(v=>String(v.status||'').includes('closed')||String(v.status||'').includes('مختوم')).length,progress=rows.length-closed;x.querySelector('#ksum').style.display='grid';x.querySelector('#ksum').innerHTML=[['تعداد نتایج',rows.length],['مختومه',closed],['در جریان',progress],['نرخ مختومه',rows.length?Math.round(closed/rows.length*100)+'%':'۰٪']].map(v=>'<div class="khcCard"><div class="khcMuted">'+v[0]+'</div><div class="khcNum">'+v[1]+'</div></div>').join('');out.innerHTML='<div class="khcTableWrap"><table class="khcTable"><thead><tr><th>پیگیری</th><th>تاکسیران</th><th>خط</th><th>نحوه دریافت</th><th>موضوع</th><th>وضعیت</th><th>تاریخ</th></tr></thead><tbody>'+(rows.slice(0,500).map(v=>'<tr><td>'+esc(v.tracking_code)+'</td><td>'+esc(v.driver_name)+'</td><td>'+esc(v.line_code||'—')+'</td><td>'+esc(({software:'کاربران نرم‌افزار',phone:'تلفنی',in_person:'حضوری'})[v.receipt_channel]||v.receipt_channel||'—')+'</td><td>'+esc(v.subject||'—')+'</td><td><span class="khcBadge">'+esc(v.status||'—')+'</span></td><td>'+esc(v.created_at||v.date||'—')+'</td></tr>').join('')||'<tr><td colspan="7" class="khcEmpty">نتیجه‌ای یافت نشد.</td></tr>')+'</tbody></table></div>'+(rows.length>500?'<div class="khcMuted" style="margin-top:8px">۵۰۰ مورد اول نمایش داده شد؛ خروجی Excel شامل همه نتایج است.</div>':'')}catch(e){out.innerHTML='<div class="khcWarn">'+esc(e.message)+'</div>'}};
  x.querySelector('#kxls').onclick=()=>{const rows=window.__khcReport||[];if(!rows.length)return alert('ابتدا گزارش را تولید کنید');if(typeof XLSX==='undefined')return alert('کتابخانه Excel بارگذاری نشده است');const ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'شکایات');XLSX.writeFile(wb,'گزارش-شکایات.xlsx')};
}
async function settings(x){
 loading(x);const [s,u,roles]=await Promise.all([req('/admin/complaints/settings',{},30000),req('/admin/users',{},60000),req('/admin/roles',{},300000)]);
 const ar=new Set((s.allowed_role_ids||[]).map(Number)),au=new Set((s.allowed_user_ids||[]).map(Number));
 const roleHtml=(roles||[]).map(r=>{const id=Number(r.id),on=ar.has(id);return '<label class="khcRole '+(on?'on':'')+'"><input class="k-role" type="checkbox" value="'+id+'" '+(on?'checked':'')+'><span><b>'+esc(r.title||r.name||('سمت '+id))+'</b></span></label>'}).join('');
 const userHtml=u.map(v=>'<option value="'+v.id+'" '+(au.has(Number(v.id))?'selected':'')+'>'+esc((v.first_name||'')+' '+(v.last_name||''))+'</option>').join('');
 const receivers=u.map(v=>'<option value="'+v.id+'" '+(String(s.receiver_user_id)===String(v.id)?'selected':'')+'>'+esc((v.first_name||'')+' '+(v.last_name||''))+'</option>').join('');
 x.innerHTML='<div class="khcPanel"><h3>تنظیمات دسترسی و مدیریت شکایات</h3><div class="khcMuted">مشخص کنید کدام سمت‌ها یا کاربران امکان ثبت شکایت داشته باشند.</div><div class="khcWarn" style="margin-top:12px"><b>نکته:</b> اگر هیچ سمت و کاربری انتخاب نشود، ثبت شکایت برای همه کاربران مجاز است.</div><div class="khcRow" style="margin-top:14px"><div><label>کاربر دریافت شکایات</label><select id="ksr" class="khcSelect"><option value="">انتخاب کنید</option>'+receivers+'</select></div><div><label>مسئول رسیدگی</label><select id="ksm" class="khcSelect"><option value="">انتخاب کنید</option>'+u.map(v=>'<option value="'+v.id+'" '+(String(s.manager_user_id)===String(v.id)?'selected':'')+'>'+esc((v.first_name||'')+' '+(v.last_name||''))+'</option>').join('')+'</select></div></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:18px"><div><h4>سمت‌های مجاز ثبت شکایت</h4><div class="khcMuted">با انتخاب سمت، تمام کاربران دارای آن سمت مجاز می‌شوند.</div></div><div><button id="kRoleAll" class="khcBtn">انتخاب همه</button> <button id="kRoleNone" class="khcBtn">حذف همه</button></div></div><div class="khcCheckGrid">'+(roleHtml||'<div class="khcEmpty">سمتی برای انتخاب وجود ندارد.</div>')+'</div><div style="margin-top:18px"><h4>استثناهای کاربری</h4><div class="khcMuted">اختیاری؛ دسترسی افراد مشخص خارج از سمت‌های انتخاب‌شده.</div><select id="kua" class="khcSelect" multiple size="7">'+userHtml+'</select></div><div class="khcRow"><div><label>ارسال پیامک شماره پیگیری</label><select id="kss" class="khcSelect"><option value="false">خیر</option><option value="true" '+(s.sms_enabled?'selected':'')+'>بله</option></select></div><div><label>قالب پیامک</label><input id="kst" class="khcInput" value="'+esc(s.sms_template||'')+'"><div class="khcMuted">متغیر: {tracking_code}</div></div></div><button id="kSave" class="khcBtn khcPrimary">ذخیره تنظیمات</button></div><div id="khcCats"></div>';
 const checks=()=>[...x.querySelectorAll('.k-role')];document.getElementById('kRoleAll').onclick=()=>{checks().forEach(c=>{c.checked=true;c.parentElement.classList.add('on')})};document.getElementById('kRoleNone').onclick=()=>{checks().forEach(c=>{c.checked=false;c.parentElement.classList.remove('on')})};checks().forEach(c=>c.onchange=()=>c.parentElement.classList.toggle('on',c.checked));
 const settingsSummary=document.createElement('div');settingsSummary.className='khcGrid';settingsSummary.style.marginBottom='16px';settingsSummary.innerHTML=[['سمت‌های مجاز',ar.size],['کاربران استثنا',au.size],['دسته‌های دسترسی','ثبت و رسیدگی'],['اعلان پیامکی',s.sms_enabled?'فعال':'غیرفعال']].map(v=>'<div class="khcCard"><div class="khcMuted">'+v[0]+'</div><div class="khcNum" style="font-size:19px">'+(typeof v[1]==='number'?faDigits(v[1]):v[1])+'</div></div>').join('');x.prepend(settingsSummary);
 const accessSearch=document.createElement('input');accessSearch.className='khcInput';accessSearch.placeholder='جستجوی سریع سمت در تنظیمات دسترسی';accessSearch.setAttribute('aria-label','جستجوی سمت');const grid=x.querySelector('.khcCheckGrid');grid.before(accessSearch);accessSearch.oninput=()=>{const q=accessSearch.value.trim().toLowerCase();grid.querySelectorAll('.khcRole').forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(q))};
 document.getElementById('kSave').onclick=async()=>{const receiver=Number(document.getElementById('ksr').value)||null,manager=Number(document.getElementById('ksm').value)||null;if(!receiver||!manager)return alert('کاربر دریافت و مسئول رسیدگی را انتخاب کنید.');const body={...s,receiver_user_id:receiver,manager_user_id:manager,sms_enabled:document.getElementById('kss').value==='true',sms_template:document.getElementById('kst').value,allowed_user_ids:[...document.getElementById('kua').selectedOptions].map(o=>Number(o.value)),allowed_role_ids:checks().filter(c=>c.checked).map(c=>Number(c.value))};try{await req('/admin/complaints/settings',{method:'PUT',body:JSON.stringify(body)});CACHE.clear();alert('تنظیمات دسترسی شکایات ذخیره شد.');settings(x)}catch(e){alert(e.message)}};
 const c=document.getElementById('khcCats');try{const all=await req('/admin/complaints/categories',{},60000);c.innerHTML='<div class="khcPanel"><h3>دسته‌بندی‌های شکایات</h3><div class="khcRow"><input id="catTitle" class="khcInput" placeholder="عنوان دسته‌بندی جدید"><select id="catType" class="khcSelect"><option value="rate">نرخی</option><option value="non_rate">غیرنرخی</option></select></div><button id="catAdd" class="khcBtn khcPrimary">افزودن دسته‌بندی</button><div class="khcList" style="margin-top:12px">'+all.map(v=>'<div class="khcItem" style="display:flex;justify-content:space-between;align-items:center;cursor:default"><div><b>'+esc(v.title)+'</b><div class="khcMuted">'+(v.complaint_type==='rate'?'نرخی':'غیرنرخی')+' — '+(v.is_active?'فعال':'غیرفعال')+'</div></div><button class="khcBtn catToggle" data-id="'+v.id+'" data-active="'+(v.is_active?0:1)+'">'+(v.is_active?'غیرفعال‌سازی':'فعال‌سازی')+'</button></div>').join('')+'</div></div>';c.querySelector('#catAdd').onclick=async()=>{const title=c.querySelector('#catTitle').value.trim();if(!title)return alert('عنوان را وارد کنید');await req('/admin/complaints/categories',{method:'POST',body:JSON.stringify({title,complaint_type:c.querySelector('#catType').value,sort_order:0})});settings(x)};c.querySelectorAll('.catToggle').forEach(b=>b.onclick=async()=>{const item=all.find(v=>String(v.id)===b.dataset.id);if(item){await req('/admin/complaints/categories/'+b.dataset.id,{method:'PUT',body:JSON.stringify({...item,is_active:Number(b.dataset.active)})});settings(x)}})}catch(e){c.innerHTML='<div class="khcPanel khcWarn">مدیریت دسته‌بندی‌ها در دسترس نیست.</div>'}
}
async function detail(id){
 const x=document.getElementById('khcTab');loading(x);const c=await req('/complaints/'+id);
 const history=(c.workflow||[]).map(w=>'<div class="khcItem" style="cursor:default"><b>'+esc(w.actor_name)+'</b> · '+esc(workflowLabel[w.action]||w.action)+' · '+esc(w.note||'')+'<div class="khcMuted">'+esc(w.created_at||'')+'</div></div>').join('')||'<div class="khcEmpty">گردش کاری ثبت نشده است.</div>';
 const signature=String(c.signature_data||'');const safeSignature=/^data:image\/(?:png|jpeg);base64,[a-zA-Z0-9+/=]+$/.test(signature)&&signature.length<750000?'<img class="khcSignatureImage" alt="امضای ثبت‌شده شاکی" src="'+signature+'">':'<span class="khcMuted">امضایی ثبت نشده است.</span>';
 const info=(label,val)=>'<div class="khcInfo"><span>'+label+'</span><strong>'+esc(val||'—')+'</strong></div>';
 const details='<div class="khcPanel khcPrintArea"><h3>گزارش پرونده شکایت · '+esc(c.tracking_code)+'</h3><div class="khcStatusLine"><span class="khcBadge">'+esc(statusFa(c.status))+'</span><span class="khcMuted">تاریخ ثبت: '+esc(c.created_at||'—')+'</span></div><div class="khcSplit"><section><h4>مشخصات شاکی</h4>'+info('نام و نام خانوادگی',(c.complainant_first_name||'')+' '+(c.complainant_last_name||''))+info('شماره همراه',c.complainant_mobile)+info('نوع شاکی',c.complainant_type==='visitor'?'زائر':'مقیم مشهد')+info('محل سکونت',c.residence_city)+info('محل ثبت',c.location_name)+'</section><section><h4>مشخصات تاکسیران</h4>'+info('نام و نام خانوادگی',c.driver_name)+info('نام پدر',c.driver_father_name)+info('کد ملی',c.national_id)+info('شماره همراه',c.driver_mobile)+info('پلاک خودرو',c.plate)+info('شماره خط',c.line_code)+info('منطقه',c.region_name)+'</section></div><h4>متن شکایت</h4>'+info('موضوع',c.subject)+'<div class="khcComplaintBody">'+esc(c.body||'')+'</div><div class="khcSplit"><section><h4>امضای شاکی</h4><div class="khcSignatureResult">'+safeSignature+'</div></section><section><h4>محل امضای تاکسیران / تأیید دریافت</h4><div class="khcSignatureResult khcMuted">محل امضا در نسخه چاپی</div></section></div><h4>گردش کار پرونده</h4>'+history+'</div>';
 x.innerHTML='<div class="khcActions khcScreenActions"><button class="khcBtn" id="khcBack">بازگشت به کارتابل</button><button class="khcBtn khcPrimary" id="khcPrint">چاپ / ذخیره PDF</button>'+(c.can_manage?'<button class="khcBtn" id="khcArchive">بایگانی پرونده</button><button class="khcBtn khcDanger" id="khcDelete">حذف پرونده</button>':'')+'</div>'+details+(c.status==='archived'?'':'<div class="khcPanel"><label for="cn">یادداشت / پاسخ</label><textarea id="cn" class="khcArea" placeholder="متن یادداشت یا پاسخ را بنویسید"></textarea><div class="khcActions"><button id="cnote" class="khcBtn">ثبت یادداشت</button><button id="cfwd" class="khcBtn">ارجاع به مسئول</button><button id="creply" class="khcBtn">پاسخ و ارجاع</button><button id="cback" class="khcBtn">بازگشت به دریافت‌کننده</button><button id="cclose" class="khcBtn khcPrimary">مختومه</button></div></div>');
 x.querySelector('#khcBack').onclick=()=>show('received');x.querySelector('#khcPrint').onclick=()=>printComplaint(details,c.tracking_code);
 if(c.can_manage){x.querySelector('#khcArchive').onclick=()=>lifecycle(id,'archive');x.querySelector('#khcDelete').onclick=()=>lifecycle(id,'delete')}
 const note=x.querySelector('#cn');if(note)[['cnote','note'],['cfwd','manager_forward'],['creply','reply'],['cback','back'],['cclose','close']].forEach(a=>x.querySelector('#'+a[0]).onclick=()=>act(id,a[1],note.value));
}
function printComplaint(content,code){const w=window.open('','_blank');if(!w){alert('برای چاپ، اجازه بازشدن پنجره جدید را بدهید.');return}w.document.open();w.document.write('<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>پرونده '+esc(code)+'</title><style>@page{size:A4;margin:16mm}body{font:13px/1.9 Vazirmatn,Tahoma,sans-serif;color:#183247}h3,h4{color:#086b57}.khcSplit{display:grid;grid-template-columns:1fr 1fr;gap:20px}.khcInfo{border-bottom:1px solid #dce7e8;padding:5px;display:flex;justify-content:space-between;gap:12px}.khcMuted{color:#667085}.khcBadge{background:#e8f7f0;padding:4px 10px}.khcComplaintBody{white-space:pre-wrap;border:1px solid #dce7e8;padding:14px}.khcItem{padding:8px;border-bottom:1px solid #ddd}.khcSignatureImage{max-height:110px;max-width:250px}@media print{button{display:none}}</style></head><body>'+content+'</body></html>');w.document.close();w.onload=()=>{w.focus();w.print()};}
async function act(id,a,note){try{await req('/complaints/'+id+'/action',{method:'POST',body:JSON.stringify({action:a,note:note||''})});detail(id)}catch(e){alert(e.message)}}
window.openComplaints=open;window.closeComplaints=()=>document.getElementById('khComplaints')?.remove();
})();
/* DEPLOY-SYNC: 20261007-v269 */
