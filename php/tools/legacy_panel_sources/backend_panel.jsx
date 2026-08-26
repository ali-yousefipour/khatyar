const {useState,useEffect,useRef} = React;

/* ============================================================
   لایهٔ API — حالت واقعی به‌صورت خودکار تشخیص داده می‌شود:
   اگر پنل پشت سرور سرو شود (/api/health پاسخ دهد) همه‌چیز واقعی است،
   و اگر فایل به‌تنهایی باز شود، به حالت دموی نمونه برمی‌گردد.
   ============================================================ */
const API_BASE = '/api';
let USE_MOCK = true;

async function detectMode(){
  for (const url of [API_BASE+'/health', '/health']) {
    try { const r = await fetch(url,{cache:'no-store'}); if (r.ok) { USE_MOCK = false; window.__health = await r.json().catch(()=>({})); return; } }
    catch(e){}
  }
  USE_MOCK = true;
}
const tok = () => ({ Authorization: 'Bearer ' + (localStorage.token||'') });
async function GET(p){
  const r = await fetch(API_BASE+p,{headers:tok()});
  if(!r.ok) throw new Error((await r.json().catch(()=>({}))).error||'خطای سرور');
  return r.json();
}
async function SEND(method,p,body){
  const r = await fetch(API_BASE+p,{method,headers:{'content-type':'application/json',...tok()},body:body?JSON.stringify(body):undefined});
  if(!r.ok) throw new Error((await r.json().catch(()=>({}))).error||'خطای سرور');
  return r.json();
}

const MOCK = {
  stats:{drivers:13298,lines:133,today_attendance:2417,unpaid_bills:1846,notices_month:304,week_attendance:[1900,2200,2050,2480,2310,2700,2417]},
  users:[
    {id:1,first_name:"رضا",last_name:"معلم‌زاده",role_title:"رییس اداره بازرسی",role_id:3,level:3,manager_id:null,zone_id:null,is_active:true,username:"5219453807"},
    {id:3,first_name:"حسین",last_name:"اختریان",role_title:"سربازرس ارشد",role_id:4,level:4,manager_id:1,zone_id:1,is_active:true,username:"0010000003"},
    {id:6,first_name:"عباس",last_name:"کرمی",role_title:"سربازرس",role_id:6,level:5,manager_id:null,zone_id:2,is_active:true,username:"0010000006"},
    {id:8,first_name:"سجاد",last_name:"حسن‌زاده",role_title:"نیروی اداری",role_id:7,level:5,manager_id:null,zone_id:null,is_active:true,username:"0922660484"},
    {id:9,first_name:"امیر",last_name:"خدنگی",role_title:"اپراتور",role_id:9,level:7,manager_id:6,zone_id:1,is_active:true,username:"0921277105"},
    {id:10,first_name:"سعید",last_name:"گزمه",role_title:"اپراتور",role_id:9,level:7,manager_id:6,zone_id:3,is_active:true,username:"0010000010"},
  ],
  drivers:[
    {id:1,national_id:"0012762016",first_name:"زهرا",last_name:"قدسی",mobile:"09021233627",taxi_lic_status:"فعال",op_lic_status:"فعال"},
    {id:2,national_id:"0012833002",first_name:"یونس",last_name:"رستمی",mobile:"09155204602",taxi_lic_status:"فعال",op_lic_status:"منقضی"},
    {id:3,national_id:"0943040299",first_name:"مجید",last_name:"زارعی",mobile:"09155016763",taxi_lic_status:"فعال",op_lic_status:"فعال"},
  ],
  bills:[
    {id:1,person_title:"عبدالامیر غلامی",national_id:"3930227649",plate:"68ت149-12",amount:4620000,status:"پرداخت شده"},
    {id:2,person_title:"احمد زراعتکار",national_id:"0889215243",plate:"13ت229-12",amount:2860000,status:"در انتظار پرداخت"},
    {id:3,person_title:"یونس رستمی",national_id:"0012833002",plate:"81ت879-12",amount:3720000,status:"در انتظار پرداخت"},
  ],
  reports:[
    {id:1,first_name:"حسین",last_name:"اختریان",subject:"گزارش روزانه خطوط حرم",status:"forwarded",created_at:"۱۴۰۵/۰۳/۱۳ ۱۰:۲۴"},
    {id:2,first_name:"جلال",last_name:"کریمی",subject:"تخلف نظافت — خط ۲۲۱",status:"seen",created_at:"۱۴۰۵/۰۳/۱۳ ۰۹:۵۱"},
    {id:3,first_name:"سعید",last_name:"گزمه",subject:"اتمام اعتبار پروانه راننده",status:"answered",created_at:"۱۴۰۵/۰۳/۱۳ ۰۹:۱۲"},
  ],
  logs:[
    {id:1,event:"login",first_name:"امیر",last_name:"خدنگی",created_at:"۱۰:۰۲"},
    {id:2,event:"login_blocked_security",first_name:"سعید",last_name:"گزمه",meta:{reason:"VPN روشن است"},created_at:"۰۹:۴۸"},
    {id:3,event:"gps_off",first_name:"جلال",last_name:"کریمی",created_at:"۰۹:۳۱"},
    {id:4,event:"device_revoked",first_name:"عباس",last_name:"کرمی",created_at:"۰۸:۵۹"},
  ],
  liveLocations:[
    {user_id:9,first_name:"امیر",last_name:"خدنگی",lat:36.297,lng:59.606,captured_at:"۱۰:۲۴"},
    {user_id:10,first_name:"سعید",last_name:"گزمه",lat:36.316,lng:59.567,captured_at:"۱۰:۲۲"},
    {user_id:6,first_name:"عباس",last_name:"کرمی",lat:36.305,lng:59.585,captured_at:"۱۰:۱۹"},
  ],
  roles:[
    {id:1,title:"مدیر کل",level:1},{id:2,title:"معاونت نظارت و بازرسی",level:2},{id:3,title:"رییس اداره بازرسی",level:3},
    {id:4,title:"سربازرس ارشد",level:4},{id:5,title:"نیروی اداری ارشد",level:4},{id:6,title:"سربازرس",level:5},
    {id:7,title:"نیروی اداری",level:5},{id:8,title:"بازرس",level:6},{id:9,title:"اپراتور",level:7},{id:10,title:"ناظر خط",level:7},
  ],
  lines:[
    {id:1,code:"1",origin:"گردشی",destination:"گردشی"},{id:2,code:"221",origin:"میدان شریعتی",destination:"وکیل آباد"},
    {id:3,code:"500",origin:"پایانه مسافربری",destination:"حرم"},{id:4,code:"502",origin:"طبرسی",destination:"سطح شهر"},
    {id:5,code:"128",origin:"چهارراه آزادشهر",destination:"میدان سعدی"},{id:6,code:"602",origin:"شبکه بیسیم",destination:"سطح شهر"},
  ],
  zones:[{id:1,name:"منطقه حرم و ثامن"},{id:2,name:"منطقه مبادی ورودی"},{id:3,name:"منطقه غرب"},{id:4,name:"منطقه مرکزی"}],
  noticeReasons:[{id:1,title:"نظافت نامناسب"},{id:2,title:"عدم پرداخت آبونمان"},{id:3,title:"نقص تجهیزات کرایه"},{id:4,title:"ظاهر نامناسب راننده"}],
  checklist:{id:1,title:"چک‌لیست بازدید خودرو",items:[{id:1,label:"نظافت داخل خودرو"},{id:2,label:"سلامت تاکسی‌متر"},{id:3,label:"اعتبار پروانه‌ها"},{id:4,label:"پوشش راننده"}]},
  settings:{org_name:"سازمان تاکسیرانی مشهد",deputy_name:"اکبر فلاح",inspection_head:"رضا معلم‌زاده",payment_base_url:"https://epay.mashhad.ir/CityUsers/OnLineBillPay.aspx",attendance_cooldown_min:5,require_gps:true,block_vpn:true,block_dev_options:true},
  report:{
    attendance:{cols:["تاریخ","راننده","خط","ثبت‌کننده"],rows:[["۱۴۰۵/۰۳/۱۳","یونس رستمی","۵۰۰","امیر خدنگی"],["۱۴۰۵/۰۳/۱۳","زهرا قدسی","۵۰۰","امیر خدنگی"],["۱۴۰۵/۰۳/۱۲","مجید زارعی","۲۲۱","سعید گزمه"]]},
    notices:{cols:["تاریخ","راننده","موضوع","اولویت","ثبت‌کننده"],rows:[["۱۴۰۵/۰۳/۱۳","یونس رستمی","نظافت نامناسب","متوسط","امیر خدنگی"],["۱۴۰۵/۰۳/۱۱","مجید زارعی","عدم پرداخت آبونمان","زیاد","سعید گزمه"]]},
    checklists:{cols:["تاریخ","راننده","ثبت‌کننده"],rows:[["۱۴۰۵/۰۳/۱۳","زهرا قدسی","امیر خدنگی"]]},
    bills:{cols:["شخص","کد ملی","پلاک","مبلغ(ریال)","وضعیت"],rows:[["یونس رستمی","0012833002","13ت101-12","2,860,000","در انتظار پرداخت"]]},
  },
  officialVisits:[
    {id:1,created_at:"۱۴۰۵/۰۳/۱۳ ۱۰:۱۵",official:"رضا معلم‌زاده",official_role:"رییس اداره بازرسی",recorded_by:"امیر خدنگی",line:"500",note:"بازدید میدانی"},
    {id:2,created_at:"۱۴۰۵/۰۳/۱۲ ۱۱:۴۰",official:"حسین اختریان",official_role:"سربازرس ارشد",recorded_by:"سعید گزمه",line:"221",note:""},
    {id:3,created_at:"۱۴۰۵/۰۳/۱۱ ۰۹:۲۰",official:"اکبر فلاح",official_role:"معاونت نظارت و بازرسی",recorded_by:"امیر خدنگی",line:"500",note:"سرکشی"},
  ],
  officialChart:{labels:["رضا معلم‌زاده","حسین اختریان","اکبر فلاح","عباس کرمی"],data:[8,5,3,4]},
  geofences:[
    {id:1,name:"ایستگاه حرم",type:"circle",color:"#e23b54",center_lat:36.2879,center_lng:59.6157,radius_m:300,line_code:"500"},
    {id:2,name:"محدودهٔ وکیل‌آباد",type:"polygon",color:"#0d7a5f",polygon:[[36.316,59.52],[36.318,59.53],[36.31,59.535],[36.308,59.523]],line_code:"221"},
  ],
  messages:[
    {id:1,title:"بازدید فردا",body:"فردا ساعت ۸ بازدید میدانی خط ۵۰۰ انجام می‌شود.",target_type:"all",created_at:"۱۴۰۵/۰۳/۱۳ ۱۰:۰۰",sender:"رضا معلم‌زاده",total:42,read_count:18},
    {id:2,title:"",body:"گزارش‌های امروز را تا پایان شیفت ارسال کنید.",target_type:"zone",created_at:"۱۴۰۵/۰۳/۱۲ ۱۴:۳۰",sender:"اکبر فلاح",total:12,read_count:12},
  ],
  receipts:[
    {id:9,name:"امیر خدنگی",role:"اپراتور",read_at:"۱۰:۰۵"},
    {id:10,name:"سعید گزمه",role:"اپراتور",read_at:null},
    {id:6,name:"عباس کرمی",role:"سربازرس",read_at:"۱۰:۱۲"},
  ],
};

const db = {
  detect: detectMode,
  login: async (u,p)=>{ if(USE_MOCK) return {user:{name:"رضا معلم‌زاده",role:"رییس اداره بازرسی"}};
    const d=await SEND('POST','/auth/login',{username:u,password:p,device_id:'web-panel'}); localStorage.token=d.access; return d; },
  stats: ()=> USE_MOCK?Promise.resolve(MOCK.stats):GET('/admin/stats'),
  users: ()=> USE_MOCK?Promise.resolve(MOCK.users):GET('/admin/users'),
  roles: ()=> USE_MOCK?Promise.resolve(MOCK.roles):GET('/admin/roles'),
  zones: ()=> USE_MOCK?Promise.resolve(MOCK.zones):GET('/admin/zones'),
  lines: ()=> USE_MOCK?Promise.resolve(MOCK.lines):GET('/admin/lines'),
  drivers: (q)=> USE_MOCK?Promise.resolve(MOCK.drivers):GET('/admin/drivers?q='+encodeURIComponent(q||'')),
  bills: ()=> USE_MOCK?Promise.resolve(MOCK.bills):GET('/admin/bills'),
  reports: ()=> USE_MOCK?Promise.resolve(MOCK.reports):GET('/reports'),
  logs: ()=> USE_MOCK?Promise.resolve(MOCK.logs):GET('/admin/logs'),
  live: ()=> USE_MOCK?Promise.resolve(MOCK.liveLocations):GET('/locations/live'),
  noticeReasons: ()=> USE_MOCK?Promise.resolve(MOCK.noticeReasons):GET('/notice-reasons'),
  checklist: ()=> USE_MOCK?Promise.resolve(MOCK.checklist):GET('/checklist/template'),
  settings: ()=> USE_MOCK?Promise.resolve(MOCK.settings):GET('/admin/settings'),
  report: (type,from,to,q)=> USE_MOCK?Promise.resolve(MOCK.report[type]):GET(`/admin/report?type=${type}&from=${from||''}&to=${to||''}&q=${encodeURIComponent(q||'')}`),
  userLines: (id)=> USE_MOCK?Promise.resolve([{id:3},{id:2}]):GET('/admin/users/'+id+'/lines'),
  // mutations
  createUser: (u)=> USE_MOCK?Promise.resolve({id:Date.now()}):SEND('POST','/admin/users',u),
  updateUser: (id,b)=> USE_MOCK?Promise.resolve({}):SEND('PUT','/admin/users/'+id,b),
  setOrg: (id,b)=> USE_MOCK?Promise.resolve({}):SEND('PUT','/admin/users/'+id+'/org',b),
  assignLines: (id,ids)=> USE_MOCK?Promise.resolve({}):SEND('PUT','/admin/users/'+id+'/lines',{line_ids:ids}),
  revokeDevice: (id)=> USE_MOCK?Promise.resolve({}):SEND('POST','/admin/users/'+id+'/revoke-device',{}),
  createZone: (name)=> USE_MOCK?Promise.resolve({id:Date.now(),name}):SEND('POST','/admin/zones',{name}),
  addReason: (title)=> USE_MOCK?Promise.resolve({id:Date.now(),title}):SEND('POST','/admin/notice-reasons',{title}),
  delReason: (id)=> USE_MOCK?Promise.resolve({}):SEND('DELETE','/admin/notice-reasons/'+id),
  saveChecklist: (title,items)=> USE_MOCK?Promise.resolve({}):SEND('POST','/admin/checklist-templates',{title,items}),
  saveSettings: (obj)=> USE_MOCK?Promise.resolve({}):SEND('PUT','/admin/settings',obj),
  reportAction: (id,b)=> USE_MOCK?Promise.resolve({}):SEND('POST','/reports/'+id+'/action',b),
  reportDetail: (id)=> USE_MOCK?Promise.resolve({trail:[{action:'forward',a_first:'',a_last:'سامانه',note:'ارسال'}]}):GET('/reports/'+id),
  officialVisits: (official,from,to)=> USE_MOCK?Promise.resolve(MOCK.officialVisits):GET(`/admin/official-visits?official=${official||''}&from=${from||''}&to=${to||''}`),
  officialChart: ()=> USE_MOCK?Promise.resolve(MOCK.officialChart):GET('/admin/official-visits/chart'),
  geofences: ()=> USE_MOCK?Promise.resolve(MOCK.geofences):GET('/geofences'),
  createGeofence: (g)=> USE_MOCK?Promise.resolve({id:Date.now()}):SEND('POST','/admin/geofences',g),
  deleteGeofence: (id)=> USE_MOCK?Promise.resolve({}):SEND('DELETE','/admin/geofences/'+id),
  messages: ()=> USE_MOCK?Promise.resolve(MOCK.messages):GET('/admin/messages'),
  sendMessage: (m)=> USE_MOCK?Promise.resolve({id:Date.now(),recipients:42}):SEND('POST','/admin/messages',m),
  receipts: (id)=> USE_MOCK?Promise.resolve(MOCK.receipts):GET('/admin/messages/'+id+'/receipts'),
  importExcel: async (kind,file)=>{ if(USE_MOCK) return {ok:true};
    const fd=new FormData(); fd.append('file',file);
    const r=await fetch(API_BASE+'/admin/import/'+kind,{method:'POST',headers:tok(),body:fd}); return r.json(); },
};

const STATUS_FA={sent:"ارسال‌شده",seen:"دیده‌شده",answered:"پاسخ‌داده‌شده",forwarded:"ارجاع‌شده",closed:"بسته‌شده"};
const badgeCls=s=>s==="answered"?"b-ok":s==="forwarded"?"b-no":"b-w";
const fa=n=>Number(n||0).toLocaleString("fa");

function Dashboard(){
  const [s,setS]=useState(null); const [rep,setRep]=useState([]); const chartRef=useRef(); const lineRef=useRef();
  useEffect(()=>{db.stats().then(setS).catch(()=>{}); db.reports().then(setRep).catch(()=>{})},[]);
  useEffect(()=>{
    if(!s||!chartRef.current)return;
    const c=new Chart(chartRef.current,{type:"bar",data:{labels:(s.week_attendance||[]).map(x=>x.d||""),
      datasets:[{data:(s.week_attendance||[]).map(x=>x.n!==undefined?x.n:x),backgroundColor:"#0d7a5f",borderRadius:7}]},
      options:{plugins:{legend:{display:false}},scales:{y:{ticks:{font:{family:"Vazirmatn"}}},x:{ticks:{font:{family:"Vazirmatn"}}}}}});
    let c2;
    if(lineRef.current&&s.by_line){
      c2=new Chart(lineRef.current,{type:"bar",data:{labels:s.by_line.map(x=>"خط "+x.code),
        datasets:[{data:s.by_line.map(x=>x.n),backgroundColor:"#f6c324",borderRadius:6}]},
        options:{indexAxis:"y",plugins:{legend:{display:false}},scales:{x:{ticks:{font:{family:"Vazirmatn"}}},y:{ticks:{font:{family:"Vazirmatn"}}}}}});
    }
    return()=>{c.destroy();c2&&c2.destroy();};
  },[s]);
  if(!s)return <div>در حال بارگذاری…</div>;
  const K=[["راننده فعال",s.drivers],["خط فعال",s.lines],["حضور امروز",s.today_attendance],["فیش پرداخت‌نشده",s.unpaid_bills],["تذکر این ماه",s.notices_month]];
  return(<>
    <div className="kpis">{K.map(([l,n],i)=><div className="kpi" key={i}><div className="n">{fa(n)}</div><div className="l">{l}</div></div>)}</div>
    <div className="grid2">
      <div className="panel"><h3>روند حضور در ۷ روز گذشته</h3><canvas ref={chartRef} height="130"></canvas></div>
      <div className="panel"><h3>حضور به تفکیک خط (۳۰ روز)</h3><canvas ref={lineRef} height="130"></canvas></div>
    </div>
    <div className="panel" style={{marginTop:16}}><h3>گزارش‌های اخیر</h3>
      <table><tbody>{rep.map(r=><tr key={r.id}><td>{r.first_name} {r.last_name}</td><td>{r.subject}</td>
        <td><span className={"badge "+badgeCls(r.status)}>{STATUS_FA[r.status]||r.status}</span></td></tr>)}</tbody></table>
    </div></>);
}

function LiveMap(){
  const ref=useRef(); const mapRef=useRef(); const lineRef=useRef(); const [mode,setMode]=useState("live");
  useEffect(()=>{
    const map=L.map(ref.current).setView([36.297,59.606],12); mapRef.current=map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap"}).addTo(map);
    db.geofences().then(gs=>(gs||[]).forEach(g=>{
      if(g.type==="circle"&&g.center_lat)L.circle([g.center_lat,g.center_lng],{radius:g.radius_m||200,color:g.color,fillColor:g.color,fillOpacity:.18}).addTo(map).bindPopup(`ایستگاه: ${g.name}${g.line_code?" — خط "+g.line_code:""}`);
      else if(g.type==="polygon"&&g.polygon)L.polygon(g.polygon,{color:g.color,fillColor:g.color,fillOpacity:.18}).addTo(map).bindPopup(`محدوده: ${g.name}${g.line_code?" — خط "+g.line_code:""}`);
    })).catch(()=>{});
    db.live().then(list=>(list||[]).forEach(u=>{
      if(u.lat&&u.lng)L.marker([u.lat,u.lng]).addTo(map).bindPopup(`<b>${u.first_name} ${u.last_name}</b><br>آخرین موقعیت: ${u.captured_at||''}`);
    })).catch(()=>{});
    return()=>map.remove();
  },[]);
  const playRoute=()=>{ const map=mapRef.current; if(lineRef.current)map.removeLayer(lineRef.current);
    const route=[[36.297,59.606],[36.301,59.601],[36.306,59.598],[36.312,59.59],[36.316,59.567]];
    lineRef.current=L.polyline(route,{color:"#0d7a5f",weight:4}).addTo(map); map.fitBounds(lineRef.current.getBounds()); setMode("daily"); };
  return(<div className="panel"><h3>نقشهٔ نیروها
    <span className="row" style={{gap:8}}><button className="btn g" onClick={()=>setMode("live")}>{mode==="live"?"● زنده":"زنده"}</button>
      <button className="btn t" onClick={playRoute}>رهگیری روزانه</button></span></h3>
    <div id="map" ref={ref}></div>
    <p style={{fontSize:12,color:"var(--muted)",marginTop:10}}>«زنده» آخرین موقعیت همه را نشان می‌دهد؛ «رهگیری روزانه» مسیر طی‌شدهٔ یک نیرو را رسم می‌کند.</p>
  </div>);
}

function Modal({title,onClose,children}){
  return(<div className="modal-bg" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()}><h3>{title}</h3>{children}</div></div>);
}

function Users(){
  const [users,setUsers]=useState([]); const [roles,setRoles]=useState([]); const [zones,setZones]=useState([]);
  const [edit,setEdit]=useState(null); const [lineModal,setLineModal]=useState(null); const [adding,setAdding]=useState(false);
  const reload=()=>db.users().then(us=>setUsers(us.map(u=>({...u,is_active:u.is_active!==false})))).catch(()=>{});
  useEffect(()=>{reload(); db.roles().then(setRoles).catch(()=>{}); db.zones().then(setZones).catch(()=>{})},[]);
  const rt=id=>roles.find(r=>r.id===id)?.title||""; const zn=id=>zones.find(z=>z.id===id)?.name||"—";
  const save=async u=>{ await db.updateUser(u.id,{role_id:u.role_id,zone_id:u.zone_id,is_active:u.is_active}); setEdit(null); reload(); };
  const add=async u=>{ await db.createUser(u); setAdding(false); reload(); };
  const revoke=async id=>{ if(confirm("شناسهٔ دستگاه این کاربر حذف شود؟")){ await db.revokeDevice(id); alert("دستگاه حذف شد."); } };
  return(<div className="panel"><h3>مدیریت کاربران <button className="btn p" onClick={()=>setAdding(true)}>+ افزودن کاربر</button></h3>
    <table><thead><tr><th>نام</th><th>کد ملی</th><th>سمت</th><th>منطقه</th><th>وضعیت</th><th>اقدامات</th></tr></thead>
    <tbody>{users.map(u=><tr key={u.id}>
      <td>{u.first_name} {u.last_name}</td><td style={{direction:"ltr",textAlign:"right"}}>{u.username||"—"}</td>
      <td>{u.role_title||rt(u.role_id)}</td><td>{zn(u.zone_id)}</td>
      <td><span className={"badge "+(u.is_active?"b-ok":"b-no")}>{u.is_active?"فعال":"غیرفعال"}</span></td>
      <td><div className="row" style={{gap:6,flexWrap:"wrap"}}>
        <button className="btn g" onClick={()=>setEdit({...u})}>ویرایش</button>
        <button className="btn g" onClick={()=>setLineModal(u)}>خطوط مجاز</button>
        <button className="btn g" onClick={()=>revoke(u.id)}>حذف دستگاه</button></div></td></tr>)}</tbody></table>
    {edit&&<Modal title="ویرایش کاربر" onClose={()=>setEdit(null)}>
      <label>سمت</label><select className="input" value={edit.role_id||""} onChange={e=>setEdit({...edit,role_id:+e.target.value})}>
        {roles.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select>
      <label>منطقه</label><select className="input" value={edit.zone_id||""} onChange={e=>setEdit({...edit,zone_id:e.target.value?+e.target.value:null})}>
        <option value="">بدون منطقه</option>{zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select>
      <label className="row" style={{justifyContent:"space-between",marginTop:12}}>فعال
        <input type="checkbox" checked={edit.is_active} onChange={e=>setEdit({...edit,is_active:e.target.checked})}/></label>
      <button className="btn p" style={{marginTop:14}} onClick={()=>save(edit)}>ذخیره</button></Modal>}
    {adding&&<AddUser roles={roles} zones={zones} onClose={()=>setAdding(false)} onSave={add}/>}
    {lineModal&&<LineAssign user={lineModal} lines={[]} onClose={()=>setLineModal(null)}/>}
  </div>);
}

function AddUser({roles,zones,onClose,onSave}){
  const [f,setF]=useState({first_name:"",last_name:"",username:"",role_id:roles[0]?.id||9,zone_id:null,password:"123456"});
  return(<Modal title="افزودن کاربر جدید" onClose={onClose}>
    <div className="row"><div><label>نام</label><input className="input" onChange={e=>setF({...f,first_name:e.target.value})}/></div>
      <div><label>نام خانوادگی</label><input className="input" onChange={e=>setF({...f,last_name:e.target.value})}/></div></div>
    <label>نام کاربری (کد ملی)</label><input className="input" onChange={e=>setF({...f,username:e.target.value})}/>
    <label>سمت</label><select className="input" value={f.role_id} onChange={e=>setF({...f,role_id:+e.target.value})}>
      {roles.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select>
    <label>منطقه</label><select className="input" onChange={e=>setF({...f,zone_id:e.target.value?+e.target.value:null})}>
      <option value="">بدون منطقه</option>{zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select>
    <p style={{fontSize:11,color:"var(--muted)",marginTop:8}}>رمز اولیه: ۱۲۳۴۵۶</p>
    <button className="btn p" style={{marginTop:10}} onClick={()=>onSave(f)}>ساخت کاربر</button></Modal>);
}

function LineAssign({user,onClose}){
  const [lines,setLines]=useState([]); const [sel,setSel]=useState([]);
  useEffect(()=>{ db.lines().then(setLines).catch(()=>{}); db.userLines(user.id).then(ls=>setSel(ls.map(l=>l.id))).catch(()=>{}); },[]);
  const toggle=id=>setSel(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const save=async()=>{ await db.assignLines(user.id,sel); onClose(); };
  return(<Modal title={`خطوط مجاز — ${user.first_name} ${user.last_name}`} onClose={onClose}>
    <p style={{fontSize:12,color:"var(--muted)",marginBottom:10}}>خطوطی که این نیرو مجاز به فعالیت روی آنهاست را انتخاب کنید.</p>
    <div style={{maxHeight:280,overflow:"auto"}}>{lines.map(l=>
      <label key={l.id} className="row" style={{justifyContent:"space-between",padding:"9px 11px",border:"1px solid var(--line)",borderRadius:11,marginBottom:7,cursor:"pointer"}}>
        <span style={{fontSize:13}}>خط {l.code} — {l.origin} به {l.destination}</span>
        <input type="checkbox" checked={sel.includes(l.id)} onChange={()=>toggle(l.id)}/></label>)}</div>
    <button className="btn p" style={{marginTop:12,width:"100%"}} onClick={save}>ذخیرهٔ خطوط ({fa(sel.length)})</button></Modal>);
}

function Zones(){
  const [users,setUsers]=useState([]); const [zones,setZones]=useState([]); const [over,setOver]=useState(null); const [nz,setNz]=useState("");
  useEffect(()=>{db.users().then(setUsers).catch(()=>{}); db.zones().then(setZones).catch(()=>{})},[]);
  const assign=async(uid,zid)=>{ setUsers(us=>us.map(u=>u.id===uid?{...u,zone_id:zid}:u)); await db.setOrg(uid,{manager_id:null,zone_id:zid}); };
  const addZone=async()=>{ if(!nz)return; const z=await db.createZone(nz); setZones([...zones,z]); setNz(""); };
  const Card=u=><div className="card-p" key={u.id} draggable onDragStart={e=>e.dataTransfer.setData("uid",u.id)}>
    <span>{u.first_name} {u.last_name}</span><small>{u.role_title}</small></div>;
  const Col=(title,zid)=><div className={"col"+(over===zid?" over":"")} key={zid||"none"}
    onDragOver={e=>{e.preventDefault();setOver(zid)}} onDragLeave={()=>setOver(null)}
    onDrop={e=>{assign(+e.dataTransfer.getData("uid"),zid);setOver(null)}}>
    <h4>{title}</h4>{users.filter(u=>u.zone_id===zid).map(Card)}</div>;
  return(<div className="panel"><h3>منطقه‌بندی نیروها — کارت‌ها را در منطقهٔ موردنظر رها کنید
    <span className="row" style={{gap:8}}><input className="input" style={{padding:"6px 10px",width:160}} placeholder="نام منطقهٔ جدید" value={nz} onChange={e=>setNz(e.target.value)}/>
      <button className="btn p" onClick={addZone}>+ منطقه</button></span></h3>
    <div className="org">{Col("بدون منطقه",null)}{zones.map(z=>Col(z.name,z.id))}</div></div>);
}

function OrgChart(){
  const [users,setUsers]=useState([]); const [over,setOver]=useState(null);
  useEffect(()=>{db.users().then(setUsers).catch(()=>{})},[]);
  const managers=users.filter(u=>u.level<=4);
  const assign=async(uid,mid)=>{ setUsers(us=>us.map(u=>u.id===uid?{...u,manager_id:mid}:u)); await db.setOrg(uid,{manager_id:mid,zone_id:null}); };
  const Card=u=><div className="card-p" key={u.id} draggable onDragStart={e=>e.dataTransfer.setData("uid",u.id)}>
    <span>{u.first_name} {u.last_name}</span><small>{u.role_title}</small></div>;
  const Col=(title,mid)=><div className={"col"+(over===mid?" over":"")} key={mid||"none"}
    onDragOver={e=>{e.preventDefault();setOver(mid)}} onDragLeave={()=>setOver(null)}
    onDrop={e=>{assign(+e.dataTransfer.getData("uid"),mid);setOver(null)}}>
    <h4>{title}</h4>{users.filter(u=>u.manager_id===mid).map(Card)}</div>;
  return(<div className="panel"><h3>چارت سازمانی — کارت‌ها را بکشید و رها کنید</h3>
    <div className="org">{Col("بدون سرپرست",null)}{managers.map(m=>Col(`زیرمجموعهٔ ${m.first_name} ${m.last_name}`,m.id))}</div></div>);
}

function Drivers(){
  const [d,setD]=useState([]); const [q,setQ]=useState("");
  useEffect(()=>{db.drivers("").then(setD).catch(()=>{})},[]);
  const search=()=>db.drivers(q).then(setD).catch(()=>{});
  return(<div className="panel"><h3>رانندگان و خودروها</h3>
    <div className="row" style={{marginBottom:14,gap:8}}>
      <input className="input" placeholder="کد ملی یا نام خانوادگی…" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()}/>
      <button className="btn p" onClick={search}>جستجو</button></div>
    <table><thead><tr><th>کد ملی</th><th>نام</th><th>موبایل</th><th>پروانه تاکسیرانی</th><th>پروانه بهره‌برداری</th></tr></thead>
    <tbody>{d.map(x=><tr key={x.id}><td style={{direction:"ltr",textAlign:"right"}}>{x.national_id}</td>
      <td>{x.first_name} {x.last_name}</td><td style={{direction:"ltr",textAlign:"right"}}>{x.mobile}</td>
      <td><span className={"badge "+(x.taxi_lic_status==="فعال"?"b-ok":"b-no")}>{x.taxi_lic_status}</span></td>
      <td><span className={"badge "+(x.op_lic_status==="فعال"?"b-ok":"b-no")}>{x.op_lic_status}</span></td></tr>)}</tbody></table></div>);
}

function Bills(){
  const [b,setB]=useState([]);
  useEffect(()=>{db.bills().then(setB).catch(()=>{})},[]);
  return(<div className="panel"><h3>آبونمان و فیش‌ها</h3>
    <table><thead><tr><th>شخص</th><th>کد ملی</th><th>پلاک</th><th>مبلغ (ریال)</th><th>وضعیت</th></tr></thead>
    <tbody>{b.map(x=><tr key={x.id}><td>{x.person_title}</td><td style={{direction:"ltr",textAlign:"right"}}>{x.national_id}</td>
      <td>{x.plate}</td><td>{fa(x.amount)}</td>
      <td><span className={"badge "+(x.status==="پرداخت شده"?"b-ok":"b-no")}>{x.status}</span></td></tr>)}</tbody></table></div>);
}

function Config(){
  const [reasons,setReasons]=useState([]); const [items,setItems]=useState([]); const [nr,setNr]=useState(""); const [ni,setNi]=useState("");
  useEffect(()=>{db.noticeReasons().then(setReasons).catch(()=>{}); db.checklist().then(c=>setItems(c?.items||[])).catch(()=>{})},[]);
  const addR=async()=>{ if(!nr)return; const r=await db.addReason(nr); setReasons([...reasons,r]); setNr(""); };
  const delR=async id=>{ await db.delReason(id); setReasons(reasons.filter(r=>r.id!==id)); };
  const saveCl=async()=>{ await db.saveChecklist("چک‌لیست بازدید خودرو",items.map(i=>i.label)); alert("چک‌لیست ذخیره شد."); };
  return(<div className="grid2">
    <div className="panel"><h3>موضوعات تذکر</h3>
      <div className="row"><input className="input" value={nr} onChange={e=>setNr(e.target.value)} placeholder="موضوع جدید…"/>
        <button className="btn p" onClick={addR}>افزودن</button></div>
      <div className="chiprow">{reasons.map(r=><span className="chip" key={r.id}>{r.title}<b onClick={()=>delR(r.id)}>✕</b></span>)}</div></div>
    <div className="panel"><h3>آیتم‌های چک‌لیست خودرو</h3>
      <div className="row"><input className="input" value={ni} onChange={e=>setNi(e.target.value)} placeholder="آیتم جدید…"/>
        <button className="btn p" onClick={()=>{if(ni){setItems([...items,{id:Date.now(),label:ni}]);setNi("")}}}>افزودن</button></div>
      <div className="chiprow">{items.map((r,i)=><span className="chip" key={i}>{r.label}<b onClick={()=>setItems(items.filter((_,j)=>j!==i))}>✕</b></span>)}</div>
      <button className="btn p" style={{marginTop:12}} onClick={saveCl}>ذخیرهٔ چک‌لیست</button></div></div>);
}

function FormBuilder(){
  const [fields,setFields]=useState([{key:"f1",label:"نتیجهٔ بازدید",type:"select",options:["تایید","نیاز به پیگیری"]}]);
  const [title,setTitle]=useState("فرم بازدید میدانی");
  const add=()=>setFields([...fields,{key:"f"+(fields.length+1),label:"فیلد جدید",type:"text",options:[]}]);
  const upd=(i,k,val)=>setFields(fields.map((f,j)=>j===i?{...f,[k]:val}:f));
  const save=async()=>{ if(!USE_MOCK){ try{ await SEND('POST','/admin/forms',{title,schema:fields}); }catch(e){alert(e.message);return;} } alert("فرم ذخیره شد."); };
  return(<div className="panel"><h3>فرم‌ساز مدیرکل <button className="btn p" onClick={add}>+ افزودن فیلد</button></h3>
    <input className="input" value={title} onChange={e=>setTitle(e.target.value)} style={{marginBottom:14}}/>
    {fields.map((f,i)=><div key={i} className="row" style={{gap:8,marginBottom:8}}>
      <input className="input" value={f.label} onChange={e=>upd(i,"label",e.target.value)} placeholder="عنوان فیلد"/>
      <select className="input" value={f.type} onChange={e=>upd(i,"type",e.target.value)} style={{maxWidth:140}}>
        <option value="text">متن</option><option value="number">عدد</option><option value="select">انتخابی</option><option value="checkbox">بله/خیر</option></select>
      <button className="btn g" onClick={()=>setFields(fields.filter((_,j)=>j!==i))}>حذف</button></div>)}
    <button className="btn p" style={{marginTop:10}} onClick={save}>ذخیره فرم</button>
    <p style={{fontSize:12,color:"var(--muted)",marginTop:10}}>این فرم‌ها در اپ موبایل به نیروها نمایش داده می‌شوند.</p></div>);
}

function Reports(){
  const [list,setList]=useState([]); const [open,setOpen]=useState(null); const [detail,setDetail]=useState(null);
  useEffect(()=>{db.reports().then(setList).catch(()=>{})},[]);
  const view=async r=>{ setOpen(r); setDetail(null); try{ setDetail(await db.reportDetail(r.id)); }catch{ setDetail({trail:[]}); } };
  const act=async(id,action)=>{ await db.reportAction(id,{action}); alert("انجام شد."); };
  const ACT={forward:"ارجاع",comment:"درج نظر",reply:"پاسخ"};
  return(<div className="panel"><h3>گردش گزارش‌ها <span style={{fontSize:11,color:"var(--muted)"}}>فیلتر: شخص / موضوع / زمان</span></h3>
    <table><thead><tr><th>فرستنده</th><th>موضوع</th><th>زمان</th><th>وضعیت</th><th></th></tr></thead>
    <tbody>{list.map(r=><tr key={r.id}><td>{r.first_name} {r.last_name}</td><td>{r.subject}</td><td>{r.created_at}</td>
      <td><span className={"badge "+badgeCls(r.status)}>{STATUS_FA[r.status]||r.status}</span></td>
      <td><button className="btn g" onClick={()=>view(r)}>مشاهده گردش</button></td></tr>)}</tbody></table>
    {open&&<Modal title={open.subject} onClose={()=>setOpen(null)}>
      <p style={{fontSize:13,color:"var(--muted)"}}>فرستنده: {open.first_name} {open.last_name} — {open.created_at}</p>
      {detail&&detail.body&&<p style={{fontSize:13,margin:"8px 0"}}>{detail.body}</p>}
      <div className="trail">
        {!detail&&<p style={{fontSize:12,color:"var(--muted)"}}>در حال بارگذاری گردش…</p>}
        {detail&&(detail.trail||[]).map((t,i)=><div className="t" key={i}>
          <b>{ACT[t.action]||t.action}{t.a_last?` — ${t.a_first||""} ${t.a_last}`:""}</b>
          {t.note&&<div style={{fontSize:12,color:"var(--muted)"}}>{t.note}</div>}</div>)}
      </div>
      <div className="row" style={{marginTop:16}}><button className="btn p" onClick={()=>act(open.id,'reply')}>پاسخ</button>
        <button className="btn t" onClick={()=>act(open.id,'forward')}>ارجاع</button>
        <button className="btn g" onClick={()=>window.print()}>خروجی PDF / چاپ</button></div></Modal>}
  </div>);
}

function Reporting(){
  const TYPES={attendance:"حضور رانندگان",notices:"تذکرات",checklists:"چک‌لیست‌ها",bills:"بدهی آبونمان"};
  const [type,setType]=useState("attendance"); const [from,setFrom]=useState(""); const [to,setTo]=useState(""); const [person,setPerson]=useState("");
  const [cur,setCur]=useState({cols:[],rows:[]});
  const load=()=>db.report(type,from,to,person).then(d=>setCur(d||{cols:[],rows:[]})).catch(()=>{});
  useEffect(()=>{load()},[type]);
  const exportExcel=()=>{ const ws=XLSX.utils.aoa_to_sheet([cur.cols,...cur.rows]); const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,TYPES[type]); XLSX.writeFile(wb,`گزارش_${TYPES[type]}.xlsx`); };
  const printPdf=()=>{ const a=document.getElementById("print-area");
    a.innerHTML=`<div style="padding:24px;font-family:Vazirmatn"><h2 style="text-align:center">گزارش ${TYPES[type]}</h2>
      <p style="text-align:center;color:#666">سامانه کنترل خطوط تاکسیرانی مشهد — ${new Date().toLocaleDateString("fa-IR")}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:13px"><thead><tr>${cur.cols.map(c=>`<th style="border:1px solid #ccc;padding:8px;background:#eef1f7">${c}</th>`).join("")}</tr></thead>
      <tbody>${cur.rows.map(r=>`<tr>${r.map(c=>`<td style="border:1px solid #ccc;padding:8px;text-align:center">${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    window.print(); };
  return(<div className="panel"><h3>گزارش‌گیری پیشرفته</h3>
    <div className="filters no-print">
      <select value={type} onChange={e=>setType(e.target.value)}>{Object.entries(TYPES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
      <input type="date" value={from} onChange={e=>setFrom(e.target.value)} title="از تاریخ"/>
      <input type="date" value={to} onChange={e=>setTo(e.target.value)} title="تا تاریخ"/>
      <input placeholder="نام شخص…" value={person} onChange={e=>setPerson(e.target.value)}/>
      <button className="btn g" onClick={load}>اعمال فیلتر</button>
      <button className="btn p" onClick={exportExcel}>⬇ خروجی Excel</button>
      <button className="btn t" onClick={printPdf}>🖨 چاپ / PDF</button></div>
    <table><thead><tr>{cur.cols.map((c,i)=><th key={i}>{c}</th>)}</tr></thead>
      <tbody>{cur.rows.filter(r=>!person||r.join("").includes(person)).map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>)}</tbody></table>
    <p style={{fontSize:12,color:"var(--muted)",marginTop:10}}>خروجی Excel یک فایل xlsx واقعی می‌سازد؛ «چاپ/PDF» از قالب چاپی استفاده می‌کند.</p></div>);
}

function Settings(){
  const [v,setV]=useState(null);
  useEffect(()=>{db.settings().then(setV).catch(()=>{})},[]);
  if(!v)return <div>در حال بارگذاری…</div>;
  const set=(k,val)=>setV({...v,[k]:val});
  const save=async()=>{ await db.saveSettings(v); alert("تنظیمات ذخیره شد."); };
  const Field=(k,l)=><div style={{marginBottom:12}}><label style={{fontSize:13,color:"var(--muted)"}}>{l}</label>
    <input className="input" value={v[k]??""} onChange={e=>set(k,e.target.value)} style={{marginTop:5}}/></div>;
  const Toggle=(k,l)=><label className="row" style={{justifyContent:"space-between",padding:"8px 0",cursor:"pointer"}}>
    <span style={{fontSize:13}}>{l}</span><input type="checkbox" checked={!!v[k]} onChange={e=>set(k,e.target.checked)}/></label>;
  return(<div className="grid2">
    <div className="panel"><h3>تنظیمات عمومی</h3>{Field("org_name","نام سازمان")}{Field("deputy_name","معاونت نظارت و بازرسی")}
      {Field("inspection_head","رییس اداره بازرسی")}{Field("payment_base_url","آدرس پایهٔ درگاه پرداخت")}
      {Field("attendance_cooldown_min","فاصلهٔ مجاز ثبت حضور (دقیقه)")}
      <button className="btn p" style={{marginTop:8}} onClick={save}>ذخیره تنظیمات</button></div>
    <div className="panel"><h3>قوانین امنیتی ورود</h3>{Toggle("require_gps","الزام روشن‌بودن GPS")}
      {Toggle("block_vpn","مسدودسازی هنگام VPN روشن")}{Toggle("block_dev_options","مسدودسازی هنگام Developer Options")}
      <p style={{fontSize:12,color:"var(--muted)",marginTop:10}}>این قوانین توسط اپ موبایل بررسی و توسط سرور اعمال می‌شوند.</p></div></div>);
}

function Logs(){
  const [l,setL]=useState([]);
  useEffect(()=>{db.logs().then(setL).catch(()=>{})},[]);
  const ev={login:"ورود",login_blocked_security:"ورود مسدود (امنیتی)",login_failed:"ورود ناموفق",gps_off:"خاموش‌کردن GPS",device_revoked:"حذف دستگاه",device_mismatch:"دستگاه ناهمخوان",net_off:"قطع اینترنت",logout:"خروج"};
  return(<div className="panel"><h3>لاگ فعالیت‌ها و رویدادهای امنیتی</h3>
    <table><thead><tr><th>زمان</th><th>کاربر</th><th>رویداد</th><th>توضیح</th></tr></thead>
    <tbody>{l.map(x=><tr key={x.id}><td>{x.created_at}</td><td>{x.first_name} {x.last_name}</td>
      <td><span className={"badge "+((x.event||"").includes("blocked")||(x.event||"").includes("off")||(x.event||"").includes("failed")?"b-no":"b-w")}>{ev[x.event]||x.event}</span></td>
      <td style={{fontSize:12,color:"var(--muted)"}}>{x.meta?.reason||"—"}</td></tr>)}</tbody></table></div>);
}

function ExcelImport(){
  const kinds=[["drivers","اطلاعات جامع رانندگان"],["lines","اطلاعات خطوط"],["bills","پرداخت فیش‌ها (آبونمان)"],["oplic","پروانه‌های بهره‌برداری"],["taxilic","پروانه‌های تاکسیرانی"]];
  const [busy,setBusy]=useState(null);
  const up=async(kind,input)=>{ const file=input.files[0]; if(!file)return; setBusy(kind);
    try{ const r=await db.importExcel(kind,file); alert(r.note||"بارگذاری انجام شد."); }catch(e){alert(e.message);} setBusy(null); };
  return(<div className="panel"><h3>بروزرسانی دیتابیس از فایل اکسل</h3>
    <p style={{fontSize:13,color:"var(--muted)",marginBottom:14}}>فایل خروجی سامانهٔ جامع تاکسیرانی را انتخاب کنید تا اطلاعات بروزرسانی شود.</p>
    {kinds.map(([k,t])=><div key={k} className="row" style={{marginBottom:10,justifyContent:"space-between",border:"1px solid var(--line)",borderRadius:12,padding:"10px 14px"}}>
      <span style={{fontSize:13}}>{t}</span><div className="row"><input type="file" accept=".xlsx" id={"f_"+k} style={{fontSize:12}}/>
      <button className="btn p" onClick={()=>up(k,document.getElementById("f_"+k))} disabled={busy===k}>{busy===k?"در حال بارگذاری…":"بارگذاری"}</button></div></div>)}
  </div>);
}

function Officials(){
  const [rows,setRows]=useState([]); const [official,setOfficial]=useState(""); const [from,setFrom]=useState(""); const [to,setTo]=useState("");
  const chartRef=useRef(); const [chart,setChart]=useState({labels:[],data:[]});
  const load=()=>db.officialVisits(official,from,to).then(setRows).catch(()=>{});
  useEffect(()=>{load(); db.officialChart().then(setChart).catch(()=>{})},[]);
  useEffect(()=>{
    if(!chartRef.current)return;
    const c=new Chart(chartRef.current,{type:"bar",data:{labels:chart.labels,
      datasets:[{label:"تعداد حضور",data:chart.data,backgroundColor:"#0d7a5f",borderRadius:6}]},
      options:{indexAxis:"y",plugins:{legend:{display:false}},scales:{x:{ticks:{font:{family:"Vazirmatn"}}},y:{ticks:{font:{family:"Vazirmatn"}}}}}});
    return()=>c.destroy();
  },[chart]);
  const exportExcel=()=>{ const aoa=[["تاریخ","مسئول","سمت","خط","ثبت‌کننده","توضیحات"],
    ...rows.map(r=>[r.created_at,r.official,r.official_role,r.line||"",r.recorded_by,r.note||""])];
    const ws=XLSX.utils.aoa_to_sheet(aoa); const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"حضور مسئولین"); XLSX.writeFile(wb,"حضور_مسئولین_در_خط.xlsx"); };
  return(<div className="grid2">
    <div className="panel"><h3>حضور مسئولین در خط
      <span className="row" style={{gap:8}}>
        <input className="input" style={{padding:"6px 10px",width:120}} placeholder="نام مسئول" onChange={e=>setOfficial(e.target.value)}/>
        <button className="btn g" onClick={load}>فیلتر</button>
        <button className="btn p" onClick={exportExcel}>⬇ Excel</button></span></h3>
      <table><thead><tr><th>تاریخ</th><th>مسئول</th><th>سمت</th><th>خط</th><th>ثبت‌کننده</th></tr></thead>
      <tbody>{rows.map(r=><tr key={r.id}><td>{r.created_at}</td><td>{r.official}</td><td>{r.official_role}</td>
        <td>{r.line||"—"}</td><td>{r.recorded_by}</td></tr>)}</tbody></table>
      {rows.length===0&&<p style={{color:"var(--muted)",fontSize:13,textAlign:"center",padding:12}}>رکوردی یافت نشد.</p>}</div>
    <div className="panel"><h3>نمودار حضور هر مسئول</h3><canvas ref={chartRef} height="220"></canvas></div>
  </div>);
}

function GeofenceMap(){
  const ref=useRef(); const mapRef=useRef(); const drawnRef=useRef();
  const [list,setList]=useState([]); const [pending,setPending]=useState(null);
  const [name,setName]=useState(""); const [color,setColor]=useState("#e23b54"); const [lineCode,setLineCode]=useState("");
  const reload=()=>db.geofences().then(setList).catch(()=>{});
  useEffect(()=>{
    const map=L.map(ref.current).setView([36.297,59.606],12); mapRef.current=map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap"}).addTo(map);
    const drawn=new L.FeatureGroup().addTo(map); drawnRef.current=drawn;
    const ctrl=new L.Control.Draw({edit:{featureGroup:drawn},draw:{polygon:true,circle:true,marker:false,polyline:false,rectangle:false,circlemarker:false}});
    map.addControl(ctrl);
    map.on(L.Draw.Event.CREATED,e=>{ drawn.clearLayers(); drawn.addLayer(e.layer);
      if(e.layerType==="circle"){const c=e.layer.getLatLng();setPending({type:"circle",center_lat:c.lat,center_lng:c.lng,radius_m:Math.round(e.layer.getRadius())});}
      else {const pts=e.layer.getLatLngs()[0].map(p=>[p.lat,p.lng]);setPending({type:"polygon",polygon:pts});}
    });
    db.geofences().then(gs=>{ setList(gs||[]); (gs||[]).forEach(g=>{
      if(g.type==="circle"&&g.center_lat)L.circle([g.center_lat,g.center_lng],{radius:g.radius_m,color:g.color,fillColor:g.color,fillOpacity:.18}).addTo(map).bindPopup(g.name);
      else if(g.polygon)L.polygon(g.polygon,{color:g.color,fillColor:g.color,fillOpacity:.18}).addTo(map).bindPopup(g.name);
    });}).catch(()=>{});
    return()=>map.remove();
  },[]);
  const save=async()=>{ if(!pending||!name)return alert("ابتدا روی نقشه محدوده بکشید و نامی وارد کنید.");
    const line=MOCK.lines.find(l=>l.code===lineCode);
    await db.createGeofence({...pending,name,color,line_id:line?line.id:null});
    setPending(null);setName("");drawnRef.current.clearLayers();
    const g={...pending,name,color,line_code:lineCode};
    if(g.type==="circle")L.circle([g.center_lat,g.center_lng],{radius:g.radius_m,color,fillColor:color,fillOpacity:.18}).addTo(mapRef.current).bindPopup(name);
    else L.polygon(g.polygon,{color,fillColor:color,fillOpacity:.18}).addTo(mapRef.current).bindPopup(name);
    reload();
  };
  return(<div className="panel"><h3>تعیین محدودهٔ خطوط و ایستگاه‌ها</h3>
    <p style={{fontSize:12,color:"var(--muted)",marginBottom:10}}>از ابزارهای گوشهٔ نقشه، یک «چندضلعی» یا «دایره» بکشید، سپس نام و رنگ را تعیین و ذخیره کنید. این محدوده‌ها در نقشهٔ زنده با همین رنگ‌ها دیده می‌شوند.</p>
    <div id="map" ref={ref}></div>
    <div className="row" style={{gap:8,marginTop:12,flexWrap:"wrap"}}>
      <input className="input" style={{maxWidth:200}} placeholder="نام ایستگاه/محدوده" value={name} onChange={e=>setName(e.target.value)}/>
      <input className="input" style={{maxWidth:120}} placeholder="کد خط (اختیاری)" value={lineCode} onChange={e=>setLineCode(e.target.value)}/>
      <label className="row" style={{gap:6}}>رنگ <input type="color" value={color} onChange={e=>setColor(e.target.value)}/></label>
      <button className="btn p" onClick={save}>ذخیرهٔ محدوده {pending?`(${pending.type==="circle"?"دایره":"چندضلعی"} رسم شد)`:""}</button>
    </div>
    <table style={{marginTop:14}}><thead><tr><th>نام</th><th>نوع</th><th>خط</th><th>رنگ</th><th></th></tr></thead>
    <tbody>{list.map(g=><tr key={g.id}><td>{g.name}</td><td>{g.type==="circle"?"دایره":"چندضلعی"}</td><td>{g.line_code||"—"}</td>
      <td><span style={{display:"inline-block",width:16,height:16,borderRadius:4,background:g.color}}></span></td>
      <td><button className="btn g" onClick={async()=>{await db.deleteGeofence(g.id);reload();}}>حذف</button></td></tr>)}</tbody></table>
  </div>);
}

function Messages(){
  const [tab,setTab]=useState("compose"); const [list,setList]=useState([]); const [users,setUsers]=useState([]); const [zones,setZones]=useState([]);
  const [target,setTarget]=useState("all"); const [zoneId,setZoneId]=useState(""); const [sel,setSel]=useState([]);
  const [title,setTitle]=useState(""); const [body,setBody]=useState(""); const [receipts,setReceipts]=useState(null); const [sending,setSending]=useState(false);
  const reload=()=>db.messages().then(setList).catch(()=>{});
  useEffect(()=>{reload(); db.users().then(setUsers).catch(()=>{}); db.zones().then(setZones).catch(()=>{})},[]);
  const send=async()=>{ if(!body)return alert("متن پیام را وارد کنید."); setSending(true);
    try{ const r=await db.sendMessage({title,body,target_type:target,zone_id:zoneId?+zoneId:null,user_ids:sel});
      alert(`پیام به ${fa(r.recipients||0)} نفر ارسال شد.`); setTitle("");setBody("");setSel([]);setTab("sent");reload();
    }catch(e){alert(e.message);} setSending(false); };
  const showReceipts=async m=>{ setReceipts({m,rows:null}); const rows=await db.receipts(m.id); setReceipts({m,rows}); };
  const toggleU=id=>setSel(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  return(<div className="panel"><h3>پیام‌رسانی به نیروها
    <span className="row" style={{gap:8}}><button className={"btn "+(tab==="compose"?"p":"g")} onClick={()=>setTab("compose")}>ارسال پیام</button>
      <button className={"btn "+(tab==="sent"?"p":"g")} onClick={()=>setTab("sent")}>پیام‌های ارسالی</button></span></h3>
    {tab==="compose"?<div>
      <label className="label">گیرندگان</label>
      <div className="row" style={{gap:8}}>
        {[["all","همهٔ نیروها"],["zone","یک منطقه"],["selected","انتخاب نیروها"]].map(([v,t])=>
          <span key={v} className={"chip"+(target===v?" on":"")} style={{cursor:"pointer"}} onClick={()=>setTarget(v)}>{t}</span>)}
      </div>
      {target==="zone"&&<select className="input" style={{marginTop:10}} value={zoneId} onChange={e=>setZoneId(e.target.value)}>
        <option value="">منطقه را انتخاب کنید</option>{zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select>}
      {target==="selected"&&<div style={{maxHeight:160,overflow:"auto",border:"1px solid var(--line)",borderRadius:11,padding:8,marginTop:10}}>
        {users.map(u=><label key={u.id} className="row" style={{justifyContent:"space-between",padding:"5px 4px"}}>
          <span style={{fontSize:13}}>{u.first_name} {u.last_name} <span style={{color:"var(--muted)",fontSize:11}}>({u.role_title})</span></span>
          <input type="checkbox" checked={sel.includes(u.id)} onChange={()=>toggleU(u.id)}/></label>)}</div>}
      <label className="label">عنوان (اختیاری)</label><input className="input" value={title} onChange={e=>setTitle(e.target.value)}/>
      <label className="label">متن پیام</label><textarea className="input" rows="4" value={body} onChange={e=>setBody(e.target.value)}></textarea>
      <button className="btn p" style={{marginTop:14}} onClick={send} disabled={sending}>{sending?"در حال ارسال…":"ارسال پیام"}</button>
    </div>:<div>
      <table><thead><tr><th>عنوان/متن</th><th>فرستنده</th><th>زمان</th><th>خوانده‌شده</th><th></th></tr></thead>
      <tbody>{list.map(m=><tr key={m.id}><td>{m.title||m.body.slice(0,40)}</td><td>{m.sender}</td><td>{m.created_at}</td>
        <td><span className={"badge "+(m.read_count===m.total?"b-ok":"b-w")}>{fa(m.read_count)} از {fa(m.total)}</span></td>
        <td><button className="btn g" onClick={()=>showReceipts(m)}>چه کسانی خواندند</button></td></tr>)}</tbody></table>
    </div>}
    {receipts&&<Modal title={"رسید خواندن — "+(receipts.m.title||"پیام")} onClose={()=>setReceipts(null)}>
      {!receipts.rows?<p className="muted">در حال بارگذاری…</p>:<table><thead><tr><th>نام</th><th>سمت</th><th>وضعیت</th></tr></thead>
      <tbody>{receipts.rows.map(r=><tr key={r.id}><td>{r.name}</td><td>{r.role}</td>
        <td><span className={"badge "+(r.read_at?"b-ok":"b-no")}>{r.read_at?("خوانده — "+r.read_at):"خوانده‌نشده"}</span></td></tr>)}</tbody></table>}
    </Modal>}
  </div>);
}

const VIEWS={
  dashboard:{t:"داشبورد مدیریت",ic:"▦",c:Dashboard},
  map:{t:"نقشهٔ زندهٔ نیروها",ic:"◎",c:LiveMap},
  officials:{t:"حضور مسئولین در خط",ic:"👤",c:Officials},
  geofence:{t:"محدودهٔ خطوط (نقشه)",ic:"⬟",c:GeofenceMap},
  messages:{t:"پیام‌رسانی به نیروها",ic:"✉",c:Messages},
  users:{t:"مدیریت کاربران",ic:"☷",c:Users},
  zones:{t:"منطقه‌بندی نیروها",ic:"⬡",c:Zones},
  org:{t:"چارت سازمانی",ic:"⤢",c:OrgChart},
  drivers:{t:"رانندگان و خودروها",ic:"⛁",c:Drivers},
  bills:{t:"آبونمان و فیش‌ها",ic:"₪",c:Bills},
  config:{t:"تذکرات و چک‌لیست",ic:"✎",c:Config},
  forms:{t:"فرم‌ساز",ic:"▤",c:FormBuilder},
  reports:{t:"گردش گزارش‌ها",ic:"✉",c:Reports},
  report:{t:"گزارش‌گیری پیشرفته",ic:"📊",c:Reporting},
  excel:{t:"ورود اطلاعات (اکسل)",ic:"⤓",c:ExcelImport},
  logs:{t:"لاگ فعالیت‌ها",ic:"⎘",c:Logs},
  settings:{t:"تنظیمات سامانه",ic:"⚙",c:Settings},
};

function Login({onLogin}){
  const [u,setU]=useState(""); const [p,setP]=useState(""); const [err,setErr]=useState("");
  const submit=async()=>{ try{ const d=await db.login(u,p); onLogin(d.user); }catch(e){ setErr(e.message); } };
  return(<div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"var(--paper)"}}>
    <div className="panel" style={{width:380}}>
      <div style={{textAlign:"center",marginBottom:18}}><div className="lg" style={{margin:"0 auto 10px",width:48,height:48,fontSize:22}}>ت</div>
        <h3 style={{justifyContent:"center"}}>ورود به پنل مدیریت</h3></div>
      <input className="input" placeholder="نام کاربری (کد ملی)" value={u} onChange={e=>setU(e.target.value)} style={{marginBottom:10}}/>
      <input className="input" type="password" placeholder="رمز عبور" value={p} onChange={e=>setP(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/>
      {err&&<p style={{color:"var(--danger)",fontSize:12,marginTop:8}}>{err}</p>}
      <button className="btn p" style={{width:"100%",marginTop:14}} onClick={submit}>ورود</button>
      <p style={{fontSize:11,color:"var(--muted)",textAlign:"center",marginTop:10}}>{USE_MOCK?"حالت دمو: هر رمزی وارد کنید":"اتصال به سرور برقرار است"}</p>
    </div></div>);
}

function App(){
  const [me,setMe]=useState(null); const [v,setV]=useState("dashboard");
  if(!me)return <Login onLogin={setMe}/>;
  const View=VIEWS[v].c;
  return(<div className="layout">
    <aside className="side"><div className="brand"><div className="lg">ت</div><span>کنترل خطوط</span></div>
      <nav className="nav">{Object.entries(VIEWS).map(([k,o])=>
        <button key={k} className={v===k?"on":""} onClick={()=>setV(k)}><span className="ic">{o.ic}</span>{o.t}</button>)}
        <button onClick={()=>{localStorage.removeItem("token");setMe(null);}} style={{marginTop:14,color:"#ff9aa8"}}><span className="ic">⎋</span>خروج</button></nav>
      <div className="apibar">{USE_MOCK?"حالت دمو (بدون سرور)":"متصل به سرور — داده واقعی"}</div></aside>
    <main className="main"><div className="top"><h2>{VIEWS[v].t}</h2>
      <div className="who"><span>{me.name} — {me.role}</span><div className="av">{(me.name||"؟")[0]}</div></div></div>
      <View/></main></div>);
}

(async ()=>{ await detectMode(); ReactDOM.createRoot(document.getElementById("root")).render(<App/>); })();
