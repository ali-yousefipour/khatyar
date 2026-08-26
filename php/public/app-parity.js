/* Khatyar Web Parity Layer
 * Keeps php/public/app.html as the primary Web App and adds the Android feature surface
 * without replacing the existing implementation. Native-only capabilities are represented
 * by browser-safe equivalents; unsupported background Android capabilities are not faked.
 */
(function(){
  'use strict';
  if(window.__KHATYAR_WEB_PARITY__) return;
  window.__KHATYAR_WEB_PARITY__ = true;

  var API='/api';
  var h = window.fetch;
  var token = function(){ try{return localStorage.getItem('token')||'';}catch(e){return '';} };
  var fa=function(v){
    return String(v==null?'':v).replace(/[0-9]/g,function(d){return '۰۱۲۳۴۵۶۷۸۹'[d];});
  };
  var esc=function(v){return String(v==null?'':v).replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c];});};
  var apiGet=async function(path){
    var r=await h(API+path,{headers:{Accept:'application/json',...(token()?{Authorization:'Bearer '+token()}: {})}});
    var d=await r.json().catch(function(){return {};});
    if(!r.ok) throw new Error(d.error||'خطای سرور');
    return d;
  };

  var items=[
    ['🔎','جستجوی تاکسی و تاکسیران','search'],
    ['👥','حاضرین در خط','presentList'],
    ['📝','ارسال گزارش','reports'],
    ['✓','ثبت حضور من','checkin'],
    ['📨','درخواست‌ها','requests'],
    ['✔','تأیید درخواست‌ها','requestInbox'],
    ['📊','کارکرد من','workSummary'],
    ['💰','فیش‌های حقوقی من','salarySlips'],
    ['🏢','درخواست‌های شرکت','companyRequests'],
    ['💳','اشتراک برنامه','subscription'],
    ['📱','ارسال پیامک','sms'],
    ['🤖','ارسال پیام در ربات‌ها','botMessages'],
    ['📤','پیام‌های ارسالی من','mySms'],
    ['📋','تکمیل فرم‌ها','forms'],
    ['🎨','فعالیت‌های فرهنگی','cultural'],
    ['🎁','رفاهیات','welfare'],
    ['🧑‍✈️','حضور مسئولین در خط','officialPresence'],
    ['📦','اقلام تحویلی','inventory'],
    ['🎯','مأموریت روزانه من','myDailyMission'],
    ['🗺','برنامه بازدید خطوط','lineVisitProgram'],
    ['☑','چک‌لیست‌ها','checklists'],
    ['🚕','رانندگان','drivers'],
    ['🛣','خطوط','lines'],
    ['💸','بدهی‌ها','debt'],
    ['⏱','رانندگان موقت','tempDrivers'],
    ['⚡','قطعی/اختلال سرویس','outage'],
    ['⚠','هشدارهای میدانی','fieldAlerts'],
    ['🔔','اعلان‌ها','notifications'],
    ['💬','پیام‌ها','messages'],
    ['⚙','تنظیمات','settings']
  ];

  var extra=[
    ['🔄','همگام‌سازی کامل','sync'],
    ['📍','وضعیت موقعیت مکانی','location'],
    ['📷','آزمایش دوربین و ثبت تصویر','camera'],
    ['🔒','قفل وب‌اپ','lock'],
    ['📲','نصب وب‌اپ روی دستگاه','install'],
    ['ℹ','اطلاعات دستگاه و نشست','device']
  ];

  function style(){
    if(document.getElementById('kh-parity-style')) return;
    var s=document.createElement('style'); s.id='kh-parity-style';
    s.textContent=''+
      '.kh-parity{margin:14px 0 90px;border:1px solid #e4e9f2;border-radius:16px;background:#fff;overflow:hidden}'+
      '.kh-parity-h{padding:13px 14px;background:linear-gradient(135deg,#0d7a5f,#0a5f4a);color:#fff;font-weight:800;font-size:13px}'+
      '.kh-parity-g{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px}'+
      '.kh-parity-b{border:1px solid #e4e9f2;background:#f8fafc;border-radius:12px;padding:10px 8px;text-align:right;font:inherit;font-size:11.5px;font-weight:700;color:#0f1b2d;cursor:pointer;min-height:48px}'+
      '.kh-parity-b:active{background:#e9f7f0;border-color:#0d7a5f}'+
      '.kh-parity-i{font-size:18px;margin-left:6px}'+
      '.kh-parity-status{padding:8px 12px;font-size:11px;color:#6b7890;border-top:1px solid #e4e9f2;display:none}'+
      '.kh-parity-modal{position:fixed;inset:0;background:rgba(15,27,45,.55);z-index:99999;display:grid;place-items:center;padding:14px}'+
      '.kh-parity-box{width:min(480px,100%);max-height:88vh;overflow:auto;background:#fff;border-radius:18px;padding:16px;direction:rtl}'+
      '.kh-parity-title{font-weight:800;font-size:15px;margin-bottom:10px}'+
      '.kh-parity-row{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #e4e9f2;font-size:12px}'+
      '.kh-parity-btn{width:100%;border:0;border-radius:12px;padding:12px;margin-top:10px;background:#0d7a5f;color:#fff;font:inherit;font-weight:800}'+
      '.kh-parity-btn.alt{background:#eef1f7;color:#0f1b2d}'+
      '.kh-parity-video{width:100%;border-radius:14px;background:#111;margin-top:10px}'+
      '@media(max-width:380px){.kh-parity-g{grid-template-columns:1fr}}';
    document.head.appendChild(s);
  }

  function modal(title,body,buttons){
    var m=document.createElement('div');m.className='kh-parity-modal';
    var b=document.createElement('div');b.className='kh-parity-box';
    b.innerHTML='<div class="kh-parity-title">'+esc(title)+'</div><div>'+body+'</div>';
    (buttons||[]).forEach(function(x){var q=document.createElement('button');q.className='kh-parity-btn '+(x.alt?'alt':'');q.textContent=x.t;q.onclick=function(){x.f&&x.f();if(x.close!==false)m.remove();};b.appendChild(q);});
    m.appendChild(b);m.addEventListener('click',function(e){if(e.target===m)m.remove();});document.body.appendChild(m);return m;
  }

  function route(name){
    try{
      if(typeof window.nav==='function'){ window.nav(name); return true; }
      if(typeof window.navigate==='function'){ window.navigate(name); return true; }
    }catch(e){}
    return false;
  }

  async function sync(){
    var msg=modal('همگام‌سازی','<div class="kh-parity-row"><span>وضعیت</span><b id="kh-sync-state">در حال بررسی…</b></div>');
    var el=msg.querySelector('#kh-sync-state');
    try{
      var paths=['/my/dashboard','/my/stats','/my/lines','/my/app-config','/my/full-profile','/subscription/status'];
      for(var i=0;i<paths.length;i++){el.textContent='دریافت '+paths[i]+' …';try{await apiGet(paths[i]);}catch(e){}}
      el.textContent='همگام‌سازی اطلاعات اصلی انجام شد.';
    }catch(e){el.textContent='همگام‌سازی کامل نشد: '+e.message;}
  }

  function location(){
    if(!navigator.geolocation){modal('موقعیت مکانی','مرورگر این دستگاه از موقعیت مکانی پشتیبانی نمی‌کند.');return;}
    modal('وضعیت موقعیت مکانی','<div class="kh-parity-row"><span>وضعیت</span><b id="kh-gps">در حال دریافت…</b></div><div class="kh-parity-row"><span>دقت</span><b id="kh-acc">—</b></div>',[]);
    navigator.geolocation.getCurrentPosition(function(p){
      var e=document.getElementById('kh-gps'),a=document.getElementById('kh-acc');if(e)e.textContent='فعال';if(a)a.textContent=fa(Math.round(p.coords.accuracy||0))+' متر';
      try{localStorage.setItem('web_last_location',JSON.stringify({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,ts:Date.now()}));}catch(x){}
    },function(e){var q=document.getElementById('kh-gps');if(q)q.textContent='خطا: '+e.message;},{enableHighAccuracy:true,timeout:12000,maximumAge:10000});
  }

  function camera(){
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){modal('دوربین','مرورگر این دستگاه امکان دسترسی مستقیم به دوربین را ندارد. از گزینه انتخاب/گرفتن تصویر داخل فرم‌ها استفاده کنید.');return;}
    var m=modal('دوربین','<video id="kh-cam" class="kh-parity-video" autoplay playsinline></video><div id="kh-cam-state" class="kh-parity-status" style="display:block">دوربین فعال است.</div>',[]);
    var v=m.querySelector('#kh-cam');navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false}).then(function(stream){
      v.srcObject=stream;
      var cap=document.createElement('button');cap.className='kh-parity-btn';cap.textContent='ثبت تصویر';v.parentNode.appendChild(cap);
      cap.onclick=function(){var c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);try{localStorage.setItem('web_last_camera_capture',c.toDataURL('image/jpeg',.82));}catch(e){};var st=m.querySelector('#kh-cam-state');if(st)st.textContent='تصویر در نشست وب ذخیره شد.';};
      m.addEventListener('DOMNodeRemoved',function(){stream.getTracks().forEach(function(t){t.stop();});});
    }).catch(function(e){var st=m.querySelector('#kh-cam-state');if(st)st.textContent='دسترسی دوربین رد شد: '+e.message;});
  }

  function lock(){
    var has=!!localStorage.getItem('kh_web_pin');
    if(has){
      modal('قفل وب‌اپ','<p style="font-size:12px">قفل محلی وب‌اپ فعال است.</p>',[
        {t:'بازنشانی قفل',f:function(){localStorage.removeItem('kh_web_pin');alert('قفل بازنشانی شد.');}},
        {t:'قفل همین حالا',f:function(){document.body.setAttribute('data-kh-locked','1');showUnlock();}}
      ]);return;
    }
    modal('تنظیم قفل وب‌اپ','<input id="kh-pin" inputmode="numeric" maxlength="8" placeholder="رمز ۴ تا ۸ رقمی" class="inp" style="width:100%;padding:12px;border:1px solid #e4e9f2;border-radius:12px">',[
      {t:'فعال‌سازی',f:function(){var p=document.getElementById('kh-pin');if(p&&/^\d{4,8}$/.test(p.value)){localStorage.setItem('kh_web_pin',p.value);alert('قفل فعال شد.');}else alert('رمز باید ۴ تا ۸ رقم باشد.');}}
    ]);
  }
  function showUnlock(){
    if(document.getElementById('kh-unlock'))return;
    var m=document.createElement('div');m.id='kh-unlock';m.className='kh-parity-modal';m.innerHTML='<div class="kh-parity-box"><div class="kh-parity-title">خطیار قفل است</div><input id="kh-unlock-pin" type="password" inputmode="numeric" maxlength="8" class="inp" style="width:100%;padding:12px;border:1px solid #e4e9f2;border-radius:12px"><button id="kh-unlock-btn" class="kh-parity-btn">باز کردن</button></div>';document.body.appendChild(m);
    m.querySelector('#kh-unlock-btn').onclick=function(){if(m.querySelector('#kh-unlock-pin').value===localStorage.getItem('kh_web_pin')){m.remove();document.body.removeAttribute('data-kh-locked');}else alert('رمز نادرست است.');};
  }

  function install(){
    if(window.__khInstallPrompt){window.__khInstallPrompt.prompt();window.__khInstallPrompt.userChoice.then(function(){window.__khInstallPrompt=null;});return;}
    modal('نصب وب‌اپ','اگر مرورگر گزینه «نصب برنامه» یا «Add to Home Screen» را نشان می‌دهد، از منوی مرورگر آن را انتخاب کنید. در iPhone/iPad از Share → Add to Home Screen استفاده کنید.');
  }

  async function device(){
    var rows=[['مرورگر',navigator.userAgent],['پلتفرم',navigator.platform],['زبان',navigator.language],['آنلاین',navigator.onLine?'بله':'خیر'],['عرض صفحه',fa(window.innerWidth)+' px']];
    try{var c=await apiGet('/my/full-profile');rows.push(['کاربر',c.name||c.username||'—']);}catch(e){}
    modal('اطلاعات دستگاه و نشست',rows.map(function(x){return '<div class="kh-parity-row"><span>'+esc(x[0])+'</span><b style="max-width:65%;word-break:break-word">'+esc(x[1])+'</b></div>';}).join(''));
  }

  function build(){
    style();
    var panel=document.getElementById('drawerPanel');
    if(!panel||document.getElementById('kh-parity'))return;
    var root=document.createElement('section');root.id='kh-parity';root.className='kh-parity';
    root.innerHTML='<div class="kh-parity-h">امکانات نسخه وب خطیار — همسان‌سازی با Android</div><div class="kh-parity-g"></div><div class="kh-parity-status" id="kh-parity-status"></div>';
    var g=root.querySelector('.kh-parity-g');
    items.concat(extra).forEach(function(it){var b=document.createElement('button');b.className='kh-parity-b';b.innerHTML='<span class="kh-parity-i">'+it[0]+'</span>'+esc(it[1]);b.onclick=function(){
      if(it[2]==='sync')sync(); else if(it[2]==='location')location(); else if(it[2]==='camera')camera(); else if(it[2]==='lock')lock(); else if(it[2]==='install')install(); else if(it[2]==='device')device(); else if(!route(it[2]))modal(it[1],'این بخش در نسخه فعلی Web App مسیر داخلی قابل تشخیص ندارد. API مشترک پروژه حفظ شده و باید مسیر متناظر آن فعال باشد.');
    };g.appendChild(b);});
    panel.appendChild(root);
  }

  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__khInstallPrompt=e;});
  window.addEventListener('online',function(){var s=document.getElementById('kh-parity-status');if(s){s.style.display='block';s.textContent='اتصال برقرار شد.';}});
  window.addEventListener('offline',function(){var s=document.getElementById('kh-parity-status');if(s){s.style.display='block';s.textContent='حالت آفلاین فعال است؛ ارسال‌های قابل صف در نسخه اصلی Web App مدیریت می‌شوند.';}});
  var observer=new MutationObserver(function(){build();});
  function start(){build();observer.observe(document.body,{childList:true,subtree:true});setTimeout(build,500);setTimeout(build,1500);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
