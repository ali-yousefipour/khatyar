(function(){
'use strict';
const A='/api', token=()=>({Authorization:'Bearer '+(localStorage.token||'')});
const CACHE=new Map();
const esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
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
#khComplaints{position:fixed;inset:0;z-index:2147483000;background:#f4f7fb;overflow:auto;font-family:Vazirmatn,Tahoma,sans-serif;direction:rtl;color:#182230}
.khcHead{position:sticky;top:0;background:linear-gradient(135deg,#0d7a5f,#095b49);color:#fff;padding:14px 22px;display:flex;gap:12px;align-items:center;z-index:5;box-shadow:0 4px 18px #0002}
.khcHead h2{margin:0;font-size:18px}.khcHead small{opacity:.8}.khcClose{margin-right:auto;background:#fff;color:#0d7a5f;border:0;border-radius:10px;padding:8px 14px;font-weight:800;cursor:pointer}
.khcBody{padding:20px;max-width:1420px;margin:auto}.khcTabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
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
function mountStyle(){if(document.getElementById('khc257-style'))return;const st=document.createElement('style');st.id='khc257-style';st.textContent=css;document.head.appendChild(st)}
function loading(x){x.innerHTML='<div class="khcPanel khcLoading"><span class="khcSpin"></span>در حال دریافت اطلاعات…</div>'}
function tabs(active){return '<div class="khcTabs">'+[['dashboard','داشبورد'],['register','ثبت شکایت'],['received','شکایات دریافتی'],['report','گزارشگیری'],['settings','تنظیمات']].map(a=>'<button data-t="'+a[0]+'" class="'+(a[0]===active?'khcOn':'')+'">'+a[1]+'</button>').join('')+'</div>'}
function open(){
 mountStyle();if(document.getElementById('khComplaints'))return;
 const root=document.createElement('div');root.id='khComplaints';
 root.innerHTML='<div class="khcHead"><div><h2>مدیریت شکایات تاکسیرانان</h2><small>ثبت، ارجاع، پایش و گزارش‌گیری</small></div><button class="khcClose">بستن</button></div><div class="khcBody"><div id="khcApp"></div></div>';
 document.body.appendChild(root);root.querySelector('.khcClose').onclick=()=>root.remove();show('dashboard');
}
async function show(tab){
 const app=document.getElementById('khcApp');if(!app)return;app.innerHTML=tabs(tab)+'<div id="khcTab"></div>';
 app.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>show(b.dataset.t));const x=document.getElementById('khcTab');
 try{
  if(tab==='dashboard')return dashboard(x);
  if(tab==='register')return register(x);
  if(tab==='received')return received(x);
  if(tab==='report')return report(x);
  return settings(x);
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
}
async function register(x){
 x.innerHTML='<div class="khcPanel"><h3>ثبت شکایت</h3><div class="khcMuted">برای شروع، تاکسیران را با کد ملی، پلاک، خط یا کد خودرو جستجو کنید.</div><div style="display:grid;grid-template-columns:1fr auto;gap:8px"><input id="kcq" class="khcInput" placeholder="کد ملی، پلاک، خط یا کد خودرو"><button id="kcs" class="khcBtn khcPrimary">جستجو</button></div><div id="kcr" class="khcList"></div></div>';
 document.getElementById('kcs').onclick=async()=>{const q=document.getElementById('kcq').value.trim();if(!q)return;const out=document.getElementById('kcr');loading(out);try{const rows=await req('/complaints/drivers?q='+encodeURIComponent(q),{},10000);out.innerHTML=rows.map(v=>'<div class="khcItem" data-id="'+v.id+'"><b>'+esc((v.first_name||'')+' '+(v.last_name||''))+'</b><div class="khcMuted">کد ملی '+esc(v.national_id||'—')+' | پلاک '+esc(v.plate||'—')+' | خط '+esc(v.line_code||'—')+'</div></div>').join('')||'<div class="khcEmpty">تاکسیرانی پیدا نشد.</div>';out.querySelectorAll('.khcItem').forEach(el=>el.onclick=()=>openForm(rows.find(v=>String(v.id)===el.dataset.id)))}catch(e){out.innerHTML='<div class="khcWarn">'+esc(e.message)+'</div>'}};
}
async function openForm(driver){
 const x=document.getElementById('khcTab');loading(x);
 const [cats,cities,loc]=await Promise.all([req('/complaints/categories?type=rate',{},60000),req('/complaints/cities',{},300000).catch(()=>[]),req('/complaints/default-location',{},30000).catch(()=>null)]);
 x.innerHTML='<div class="khcPanel"><h3>ثبت شکایت برای '+esc((driver.first_name||'')+' '+(driver.last_name||''))+'</h3><div class="khcMuted">پلاک '+esc(driver.plate||'—')+' | خط '+esc(driver.line_code||'—')+'</div><div class="khcRow"><div><label>نحوه دریافت</label><select id="crch" class="khcSelect"><option value="software">کاربران نرم‌افزار</option><option value="phone">تلفنی</option><option value="in_person">حضوری</option></select></div><div><label>محل دریافت</label><input id="cloc" class="khcInput" value="'+esc(loc?.name||'آخرین محل ثبت حضور')+'"></div></div><div class="khcRow"><input id="cf" class="khcInput" placeholder="نام شاکی"><input id="cl" class="khcInput" placeholder="نام خانوادگی شاکی"></div><div class="khcRow"><input id="cm" class="khcInput" placeholder="شماره همراه"><select id="ct" class="khcSelect"><option value="neighbor">مجاور / مقیم مشهد</option><option value="visitor">زائر</option></select></div><div class="khcRow"><input id="cstay" class="khcInput" type="number" min="1" placeholder="مدت اقامت زائر (روز)"><input id="ccity" list="citylist" class="khcInput" placeholder="شهر محل سکونت زائر"><datalist id="citylist">'+cities.map(c=>'<option value="'+esc(c.name||c)+'">').join('')+'</datalist></div><div class="khcRow"><select id="ctype" class="khcSelect"><option value="rate">تخلف نرخی</option><option value="non_rate">تخلف غیرنرخی</option></select><select id="cc" class="khcSelect">'+cats.map(c=>'<option value="'+c.id+'">'+esc(c.title)+'</option>').join('')+'</select></div><input id="cs" class="khcInput" placeholder="موضوع شکایت"><textarea id="cb" class="khcArea" placeholder="متن کامل شکایت"></textarea><button id="csubmit" class="khcBtn khcPrimary">ثبت شکایت</button></div>';
 const ids=['crch','cf','cl','cm','ct','cstay','ccity','ctype','cc','cs','cb','cloc'];const el={};ids.forEach(id=>el[id]=document.getElementById(id));
 el.ctype.onchange=async()=>{const ccats=await req('/complaints/categories?type='+encodeURIComponent(el.ctype.value),{},60000);el.cc.innerHTML=ccats.map(c=>'<option value="'+c.id+'">'+esc(c.title)+'</option>').join('')};
 el.csubmit.onclick=async()=>{if(!el.cf.value.trim()||!el.cl.value.trim()||!el.cm.value.trim()||!el.cs.value.trim()||!el.cb.value.trim())return alert('نام، نام خانوادگی، موبایل، موضوع و متن شکایت الزامی است.');if(el.ct.value==='visitor'&&(!el.cstay.value||!el.ccity.value.trim()))return alert('برای زائر مدت اقامت و شهر محل سکونت الزامی است.');try{const r=await req('/complaints',{method:'POST',body:JSON.stringify({driver_id:driver.id,receipt_channel:el.crch.value,complainant_first_name:el.cf.value.trim(),complainant_last_name:el.cl.value.trim(),complainant_mobile:el.cm.value.trim(),complainant_type:el.ct.value,stay_days:el.ct.value==='visitor'?Number(el.cstay.value):null,residence_city:el.ct.value==='visitor'?el.ccity.value.trim():null,complaint_type:el.ctype.value,category_id:Number(el.cc.value),subject:el.cs.value.trim(),body:el.cb.value.trim(),location_name:el.cloc.value.trim()||loc?.name||'آخرین محل ثبت حضور',lat:loc?.lat??null,lng:loc?.lng??null})});alert('شماره پیگیری: '+r.tracking_code);show('dashboard')}catch(e){alert(e.message)}};
}
async function received(x){
 loading(x);const rows=await req('/complaints/my',{},15000);x.innerHTML='<div class="khcPanel"><div style="display:flex;justify-content:space-between;align-items:center"><h3>شکایات دریافتی</h3><span class="khcMuted">'+rows.length.toLocaleString('fa-IR')+' مورد</span></div><div class="khcList">'+(rows.map(v=>'<div class="khcItem" data-id="'+v.id+'"><b>'+esc(v.tracking_code)+' — '+esc(v.driver_name)+'</b><div style="margin-top:5px">'+esc(v.subject||'—')+' <span class="khcBadge">'+esc(v.status||'—')+'</span></div></div>').join('')||'<div class="khcEmpty">موردی برای نمایش وجود ندارد.</div>')+'</div></div>';x.querySelectorAll('.khcItem').forEach(el=>el.onclick=()=>detail(el.dataset.id));
}
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
  const ls=await req('/admin/lines',{},180000);document.getElementById('kl').innerHTML='<option value="">همه خطوط</option>'+ls.map(v=>'<option value="'+v.id+'">خط '+esc(v.code)+'</option>').join('');
  x.querySelectorAll('.khcDateBtn').forEach(b=>b.onclick=()=>reportDatePicker(document.getElementById(b.dataset.for)));
  ['kf','kt'].forEach(id=>document.getElementById(id).onblur=e=>{if(e.target.value&&!jalaliValid(e.target.value)){e.target.setCustomValidity('تاریخ شمسی نامعتبر است؛ مانند ۱۴۰۵/۰۷/۰۱ وارد کنید.');e.target.reportValidity()}else e.target.setCustomValidity('')});
  document.getElementById('krun').onclick=async()=>{
    const out=document.getElementById('krep'), from=document.getElementById('kf').value.trim(), to=document.getElementById('kt').value.trim();
    if(from&&!jalaliValid(from)||to&&!jalaliValid(to))return alert('تاریخ شمسی را به شکل ۱۴۰۵/۰۷/۰۱ وارد کنید.');
    const fromG=from?j2g(...toEn(from).split(/[\\/-]/).map(Number)):'';const toG=to?j2g(...toEn(to).split(/[\\/-]/).map(Number)):'';
    loading(out);let did='';const dq=document.getElementById('kd').value.trim();if(dq){const ds=await req('/complaints/drivers?q='+encodeURIComponent(dq),{},10000);if(!ds[0]){out.innerHTML='<div class="khcWarn">تاکسیران موردنظر پیدا نشد.</div>';return}did=ds[0].id}
    const qs=new URLSearchParams({from:fromG,to:toG,line_id:document.getElementById('kl').value,driver_id:did});
    try{const rows=await req('/admin/complaints/report?'+qs.toString(),{},5000);window.__khcReport=rows;const closed=rows.filter(v=>String(v.status||'').includes('closed')||String(v.status||'').includes('مختوم')).length,progress=rows.length-closed;document.getElementById('ksum').style.display='grid';document.getElementById('ksum').innerHTML=[['تعداد نتایج',rows.length],['مختومه',closed],['در جریان',progress],['نرخ مختومه',rows.length?Math.round(closed/rows.length*100)+'%':'۰٪']].map(v=>'<div class="khcCard"><div class="khcMuted">'+v[0]+'</div><div class="khcNum">'+v[1]+'</div></div>').join('');out.innerHTML='<div class="khcTableWrap"><table class="khcTable"><thead><tr><th>پیگیری</th><th>تاکسیران</th><th>خط</th><th>نحوه دریافت</th><th>موضوع</th><th>وضعیت</th><th>تاریخ</th></tr></thead><tbody>'+(rows.slice(0,500).map(v=>'<tr><td>'+esc(v.tracking_code)+'</td><td>'+esc(v.driver_name)+'</td><td>'+esc(v.line_code||'—')+'</td><td>'+esc(({software:'کاربران نرم‌افزار',phone:'تلفنی',in_person:'حضوری'})[v.receipt_channel]||v.receipt_channel||'—')+'</td><td>'+esc(v.subject||'—')+'</td><td><span class="khcBadge">'+esc(v.status||'—')+'</span></td><td>'+esc(v.created_at||v.date||'—')+'</td></tr>').join('')||'<tr><td colspan="7" class="khcEmpty">نتیجه‌ای یافت نشد.</td></tr>')+'</tbody></table></div>'+(rows.length>500?'<div class="khcMuted" style="margin-top:8px">۵۰۰ مورد اول نمایش داده شد؛ خروجی Excel شامل همه نتایج است.</div>':'')}catch(e){out.innerHTML='<div class="khcWarn">'+esc(e.message)+'</div>'}};
  document.getElementById('kxls').onclick=()=>{const rows=window.__khcReport||[];if(!rows.length)return alert('ابتدا گزارش را تولید کنید');if(typeof XLSX==='undefined')return alert('کتابخانه Excel بارگذاری نشده است');const ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'شکایات');XLSX.writeFile(wb,'گزارش-شکایات.xlsx')};
}
async function settings(x){
 loading(x);const [s,u,roles]=await Promise.all([req('/admin/complaints/settings',{},30000),req('/admin/users',{},60000),req('/admin/roles',{},300000)]);
 const ar=new Set((s.allowed_role_ids||[]).map(Number)),au=new Set((s.allowed_user_ids||[]).map(Number));
 const roleHtml=(roles||[]).map(r=>{const id=Number(r.id),on=ar.has(id);return '<label class="khcRole '+(on?'on':'')+'"><input class="k-role" type="checkbox" value="'+id+'" '+(on?'checked':'')+'><span><b>'+esc(r.title||r.name||('سمت '+id))+'</b></span></label>'}).join('');
 const userHtml=u.map(v=>'<option value="'+v.id+'" '+(au.has(Number(v.id))?'selected':'')+'>'+esc((v.first_name||'')+' '+(v.last_name||''))+'</option>').join('');
 const receivers=u.map(v=>'<option value="'+v.id+'" '+(String(s.receiver_user_id)===String(v.id)?'selected':'')+'>'+esc((v.first_name||'')+' '+(v.last_name||''))+'</option>').join('');
 x.innerHTML='<div class="khcPanel"><h3>تنظیمات دسترسی و مدیریت شکایات</h3><div class="khcMuted">مشخص کنید کدام سمت‌ها یا کاربران امکان ثبت شکایت داشته باشند.</div><div class="khcWarn" style="margin-top:12px"><b>نکته:</b> اگر هیچ سمت و کاربری انتخاب نشود، ثبت شکایت برای همه کاربران مجاز است.</div><div class="khcRow" style="margin-top:14px"><div><label>کاربر دریافت شکایات</label><select id="ksr" class="khcSelect"><option value="">انتخاب کنید</option>'+receivers+'</select></div><div><label>مسئول رسیدگی</label><select id="ksm" class="khcSelect"><option value="">انتخاب کنید</option>'+u.map(v=>'<option value="'+v.id+'" '+(String(s.manager_user_id)===String(v.id)?'selected':'')+'>'+esc((v.first_name||'')+' '+(v.last_name||''))+'</option>').join('')+'</select></div></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:18px"><div><h4>سمت‌های مجاز ثبت شکایت</h4><div class="khcMuted">با انتخاب سمت، تمام کاربران دارای آن سمت مجاز می‌شوند.</div></div><div><button id="kRoleAll" class="khcBtn">انتخاب همه</button> <button id="kRoleNone" class="khcBtn">حذف همه</button></div></div><div class="khcCheckGrid">'+(roleHtml||'<div class="khcEmpty">سمتی برای انتخاب وجود ندارد.</div>')+'</div><div style="margin-top:18px"><h4>استثناهای کاربری</h4><div class="khcMuted">اختیاری؛ دسترسی افراد مشخص خارج از سمت‌های انتخاب‌شده.</div><select id="kua" class="khcSelect" multiple size="7">'+userHtml+'</select></div><div class="khcRow"><div><label>ارسال پیامک شماره پیگیری</label><select id="kss" class="khcSelect"><option value="false">خیر</option><option value="true" '+(s.sms_enabled?'selected':'')+'>بله</option></select></div><div><label>قالب پیامک</label><input id="kst" class="khcInput" value="'+esc(s.sms_template||'')+'"><div class="khcMuted">متغیر: {tracking_code}</div></div></div><button id="kSave" class="khcBtn khcPrimary">ذخیره تنظیمات</button></div><div id="khcCats"></div>';
 const checks=()=>[...x.querySelectorAll('.k-role')];document.getElementById('kRoleAll').onclick=()=>{checks().forEach(c=>{c.checked=true;c.parentElement.classList.add('on')})};document.getElementById('kRoleNone').onclick=()=>{checks().forEach(c=>{c.checked=false;c.parentElement.classList.remove('on')})};checks().forEach(c=>c.onchange=()=>c.parentElement.classList.toggle('on',c.checked));
 document.getElementById('kSave').onclick=async()=>{const receiver=Number(document.getElementById('ksr').value)||null,manager=Number(document.getElementById('ksm').value)||null;if(!receiver||!manager)return alert('کاربر دریافت و مسئول رسیدگی را انتخاب کنید.');const body={...s,receiver_user_id:receiver,manager_user_id:manager,sms_enabled:document.getElementById('kss').value==='true',sms_template:document.getElementById('kst').value,allowed_user_ids:[...document.getElementById('kua').selectedOptions].map(o=>Number(o.value)),allowed_role_ids:checks().filter(c=>c.checked).map(c=>Number(c.value))};try{await req('/admin/complaints/settings',{method:'PUT',body:JSON.stringify(body)});CACHE.clear();alert('تنظیمات دسترسی شکایات ذخیره شد.');settings(x)}catch(e){alert(e.message)}};
 const c=document.getElementById('khcCats');try{const all=await req('/admin/complaints/categories',{},60000);c.innerHTML='<div class="khcPanel"><h3>دسته‌بندی‌های شکایات</h3><div class="khcRow"><input id="catTitle" class="khcInput" placeholder="عنوان دسته‌بندی جدید"><select id="catType" class="khcSelect"><option value="rate">نرخی</option><option value="non_rate">غیرنرخی</option></select></div><button id="catAdd" class="khcBtn khcPrimary">افزودن دسته‌بندی</button><div class="khcList" style="margin-top:12px">'+all.map(v=>'<div class="khcItem" style="display:flex;justify-content:space-between;align-items:center;cursor:default"><div><b>'+esc(v.title)+'</b><div class="khcMuted">'+(v.complaint_type==='rate'?'نرخی':'غیرنرخی')+' — '+(v.is_active?'فعال':'غیرفعال')+'</div></div><button class="khcBtn catToggle" data-id="'+v.id+'" data-active="'+(v.is_active?0:1)+'">'+(v.is_active?'غیرفعال‌سازی':'فعال‌سازی')+'</button></div>').join('')+'</div></div>';c.querySelector('#catAdd').onclick=async()=>{const title=c.querySelector('#catTitle').value.trim();if(!title)return alert('عنوان را وارد کنید');await req('/admin/complaints/categories',{method:'POST',body:JSON.stringify({title,complaint_type:c.querySelector('#catType').value,sort_order:0})});settings(x)};c.querySelectorAll('.catToggle').forEach(b=>b.onclick=async()=>{const item=all.find(v=>String(v.id)===b.dataset.id);if(item){await req('/admin/complaints/categories/'+b.dataset.id,{method:'PUT',body:JSON.stringify({...item,is_active:Number(b.dataset.active)})});settings(x)}})}catch(e){c.innerHTML='<div class="khcPanel khcWarn">مدیریت دسته‌بندی‌ها در دسترس نیست.</div>'}
}
async function detail(id){
 const x=document.getElementById('khcTab');loading(x);const c=await req('/complaints/'+id);
 x.innerHTML='<div class="khcPanel"><h3>'+esc(c.tracking_code)+' — '+esc(c.driver_name)+'</h3><div style="padding:12px;background:#f7f9fb;border-radius:10px;line-height:2">'+esc(c.body||'')+'</div><p class="khcMuted">نحوه دریافت: '+esc(({software:'کاربران نرم‌افزار',phone:'تلفنی',in_person:'حضوری'})[c.receipt_channel]||c.receipt_channel||'—')+'</p><textarea id="cn" class="khcArea" placeholder="یادداشت / پاسخ"></textarea><div class="khcActions"><button id="cnote" class="khcBtn">ثبت یادداشت</button><button id="cfwd" class="khcBtn">ارجاع به مسئول</button><button id="creply" class="khcBtn">پاسخ و ارجاع</button><button id="cback" class="khcBtn">بازگشت به دریافت‌کننده</button><button id="cclose" class="khcBtn khcPrimary">مختومه</button></div><h3 style="margin-top:20px">گردش کار</h3>'+(c.workflow||[]).map(w=>'<div class="khcItem" style="cursor:default"><b>'+esc(w.actor_name)+'</b> — '+esc(w.action)+' — '+esc(w.note||'')+'</div>').join('')||'<div class="khcEmpty">بدون گردش کار</div>';
 const note=document.getElementById('cn');[['cnote','note'],['cfwd','manager_forward'],['creply','reply'],['cback','back'],['cclose','close']].forEach(a=>document.getElementById(a[0]).onclick=()=>act(id,a[1],note.value));
}
async function act(id,a,note){try{await req('/complaints/'+id+'/action',{method:'POST',body:JSON.stringify({action:a,note:note||''})});detail(id)}catch(e){alert(e.message)}}
window.openComplaints=open;window.closeComplaints=()=>document.getElementById('khComplaints')?.remove();
open();
/* legacy entry synchronized with validated complaints module */
})();