/* خطیار — آیتم‌های اپ بر اساس سمت + fallback مستقل برای بی‌سیم */
(function(){
  'use strict';
  var R=window.React;
  var H=R&&R.createElement;
  var ITEMS=[
    ['Search','جستجوی تاکسی و تاکسیران'],['PresentList','حاضرین در خط'],['Reports','ارسال گزارش'],['CheckIn','ثبت حضور من'],['Requests','درخواست‌ها'],['RequestInbox','تأیید درخواست‌ها'],['WorkSummary','کارکرد من'],['CustomFields','اطلاعات تکمیلی'],['Sms','ارسال پیامک'],['BotMessages','ارسال پیام در ربات‌ها'],['TempDrivers','رانندگان موقت خطوط ویژه'],['MySms','پیامک‌های ارسالی من'],['Forms','تکمیل فرم‌ها'],['OfficialPresence','حضور مسئولین در خط'],['InboxReports','گزارشات دریافتی'],['ActivityReport','پرکار/کم‌کار هر خط'],['ExpInsurance','بیمه و معاینه خودروها'],['ExpTaxi','افراد فاقد اعتبار'],['ExpOplic','خودرو فاقد بهره‌برداری'],['TeamReport','زیرمجموعهٔ من'],['Outage','اعلام قطع سیستم نوبت‌دهی'],['CompanyRequests','ارسال برای شرکت'],['Cultural','فعالیت‌های فرهنگی'],['Welfare','ثبت رفاهیات'],['SalarySlips','فیش حقوقی'],['Inventory','اقلام تحویلی'],['LineLocation','ثبت موقعیت خطوط'],['StationCapture','ثبت موقعیت و تصویر خطوط'],['MyStations','ایستگاه‌های ثبت‌شده من'],['LineVisitProgram','برنامه بازدید خطوط'],['RadioAdmin','تنظیمات بی‌سیم (مدیریت کانال‌ها)'],['RadioCenter','مرکز بی‌سیم (شنود کانال‌ها)']
  ];
  var all=ITEMS.map(function(x){return x[0];});
  function token(){return localStorage.token||localStorage.access_token||'';}
  function api(opt){
    return fetch('/api/unified-role-app-items.php',Object.assign({headers:{Authorization:'Bearer '+token(),'Content-Type':'application/json'},cache:'no-store'},opt||{})).then(async function(r){var t=await r.text(),d={};try{d=t?JSON.parse(t):{};}catch(e){throw Error('پاسخ نامعتبر سرور');}if(!r.ok)throw Error(d.error||d.message||'خطای سرور');return d;});
  }
  function accessHost(){
    var els=document.querySelectorAll('.panel,section,article,main,div');
    for(var i=0;i<els.length;i++){
      var t=(els[i].textContent||'').replace(/\s+/g,' ').trim();
      if(t.indexOf('آیتم‌های قابل نمایش اپ بر اساس سمت')>=0)return els[i];
      if(t.indexOf('دسترسی سمت')>=0&&t.length<5000)return els[i];
    }
    return null;
  }
  function addFallback(){
    var host=accessHost();if(!host||host.querySelector('[data-khatyar-radio-app-items]'))return;
    if((host.textContent||'').indexOf('تنظیمات بی‌سیم (مدیریت کانال‌ها)')>=0&&(host.textContent||'').indexOf('مرکز بی‌سیم (شنود کانال‌ها)')>=0)return;
    var box=document.createElement('div');box.dataset.khatyarRadioAppItems='1';box.style.cssText='margin-top:12px;padding:12px;border:1px solid var(--line,#e4e7ec);border-radius:10px;background:#fff;';
    var title=document.createElement('div');title.textContent='بی‌سیم';title.style.cssText='font-weight:800;margin-bottom:8px;';box.appendChild(title);
    var note=document.createElement('div');note.textContent='دسترسی دو آیتم بی‌سیم اپ را برای سمت انتخاب‌شده تعیین کنید.';note.style.cssText='font-size:12px;color:var(--muted,#667085);margin-bottom:9px;';box.appendChild(note);
    var rows={};
    [['RadioAdmin','تنظیمات بی‌سیم (مدیریت کانال‌ها)'],['RadioCenter','مرکز بی‌سیم (شنود کانال‌ها)']].forEach(function(item){
      var label=document.createElement('label');label.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 2px;border-bottom:1px solid var(--line,#e4e7ec);cursor:pointer;font-size:13px;';
      var span=document.createElement('span');span.textContent=item[1];var cb=document.createElement('input');cb.type='checkbox';label.append(span,cb);box.appendChild(label);rows[item[0]]=cb;
    });
    var save=document.createElement('button');save.type='button';save.className='btn p';save.textContent='ذخیره دسترسی بی‌سیم';save.style.marginTop='10px';box.appendChild(save);
    var roleSel=host.querySelector('select');
    function load(){
      var rid=roleSel&&roleSel.value?String(roleSel.value):'';if(!rid)return;
      api().then(function(d){var cfg=d.config&&typeof d.config==='object'?d.config:{};var p=Array.isArray(cfg[rid])?cfg[rid]:all;rows.RadioAdmin.checked=p.indexOf('RadioAdmin')>=0;rows.RadioCenter.checked=p.indexOf('RadioCenter')>=0;}).catch(function(){});
    }
    save.addEventListener('click',function(){
      var rid=roleSel&&roleSel.value?String(roleSel.value):'';if(!rid){alert('ابتدا یک سمت را انتخاب کنید.');return;}
      api().then(function(d){var cfg=d.config&&typeof d.config==='object'?d.config:{};var cur=Array.isArray(cfg[rid])?cfg[rid].slice():all.slice();['RadioAdmin','RadioCenter'].forEach(function(k){var i=cur.indexOf(k),on=rows[k].checked;if(on&&i<0)cur.push(k);if(!on&&i>=0)cur.splice(i,1);});cfg[rid]=Array.from(new Set(cur));return api({method:'POST',body:JSON.stringify({config:cfg})});}).then(function(){save.textContent='✓ ذخیره شد';setTimeout(function(){save.textContent='ذخیره دسترسی بی‌سیم';},1500);}).catch(function(){alert('ذخیره دسترسی بی‌سیم ناموفق بود.');});
    });
    if(roleSel)roleSel.addEventListener('change',load);
    host.appendChild(box);load();
  }
  if(R&&H&&R.useState&&R.useEffect){
    var original=R.createElement;
    /* این hook فقط برای پیاده‌سازی‌های قدیمی مبتنی بر React.createElement است. */
    function UnifiedRoleAppItems(){
      var s=R.useState([]),roles=s[0],setRoles=s[1],c=R.useState({}),cfg=c[0],setCfg=c[1],r=R.useState(''),rid=r[0],setRid=r[1],saving=R.useState(false),busy=saving[0],setBusy=saving[1],m=R.useState(''),msg=m[0],setMsg=m[1];
      R.useEffect(function(){api().then(function(d){setRoles(Array.isArray(d.roles)?d.roles:[]);setCfg(d.config&&typeof d.config==='object'?d.config:{});if(d.roles&&d.roles[0])setRid(String(d.roles[0].id));}).catch(function(e){setMsg(e.message||'بارگذاری سمت‌ها ناموفق بود');});},[]);
      var selected=cfg[rid]===undefined?null:(Array.isArray(cfg[rid])?cfg[rid]:[]);
      function toggle(k){var cur=selected===null?all.slice():selected.slice(),i=cur.indexOf(k);if(i>=0)cur.splice(i,1);else cur.push(k);setCfg(Object.assign({},cfg,{[rid]:cur}));}
      function saveCfg(){setBusy(true);setMsg('');api({method:'POST',body:JSON.stringify({config:cfg})}).then(function(){setMsg('✓ تنظیمات ذخیره شد');}).catch(function(e){setMsg(e.message||'ذخیره ناموفق بود');}).finally(function(){setBusy(false);});}
      return H('div',{className:'panel',style:{marginTop:10}},H('h3',null,'📱 آیتم‌های قابل نمایش اپ بر اساس سمت'),H('p',{style:{fontSize:13,color:'var(--muted)',marginBottom:10}},'همین بخش تعیین می‌کند هر سمت کدام آیتم‌ها را در اپ مشاهده کند.'),H('div',{className:'row',style:{gap:8,marginBottom:10,flexWrap:'wrap'}},H('label',{style:{minWidth:180}},'سمت:',H('select',{className:'input',value:rid,onChange:function(e){setRid(e.target.value);}},roles.map(function(x){return H('option',{key:String(x.id),value:String(x.id)},x.title);})),H('button',{className:'btn p',type:'button',disabled:busy||!rid,onClick:saveCfg},busy?'در حال ذخیره…':'ذخیره تنظیمات')),msg&&H('p',{style:{fontSize:12}},msg),H('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:8}},ITEMS.map(function(x){return H('label',{key:x[0],className:'row',style:{gap:8,padding:'9px 10px',border:'1px solid var(--line)',borderRadius:9,cursor:'pointer',background:selected===null||selected.indexOf(x[0])>=0?'#f6fbf8':'#fff'}},H('input',{type:'checkbox',checked:selected===null||selected.indexOf(x[0])>=0,onChange:function(){toggle(x[0]);}}),H('span',null,x[1]));}))); 
    }
    R.createElement=function(type,props){var args=[].slice.call(arguments,2);if(typeof type==='function'&&type.name==='RoleAppItems')return original.apply(this,[UnifiedRoleAppItems,props].concat(args));return original.apply(this,arguments);};
  }
  var timer=0;
  function run(){if(timer)return;timer=setTimeout(function(){timer=0;addFallback();},80);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});
})();
