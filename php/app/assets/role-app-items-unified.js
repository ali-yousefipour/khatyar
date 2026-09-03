/* خطیار — مدیریت آیتم‌های اپ بر اساس سمت؛ نسخه پایدار بدون monkey-patch React */
(function(){
  'use strict';
  var API='/api/unified-role-app-items.php';
  var ITEMS=[
    ['Search','جستجوی تاکسی و تاکسیران'],['PresentList','حاضرین در خط'],['Reports','ارسال گزارش'],['CheckIn','ثبت حضور من'],['Requests','درخواست‌ها'],['RequestInbox','تأیید درخواست‌ها'],['WorkSummary','کارکرد من'],['CustomFields','اطلاعات تکمیلی'],['Sms','ارسال پیامک'],['BotMessages','ارسال پیام در ربات‌ها'],['TempDrivers','رانندگان موقت خطوط ویژه'],['MySms','پیامک‌های ارسالی من'],['Forms','تکمیل فرم‌ها'],['OfficialPresence','حضور مسئولین در خط'],['InboxReports','گزارشات دریافتی'],['ActivityReport','پرکار/کم‌کار هر خط'],['ExpInsurance','بیمه و معاینه خودروها'],['ExpTaxi','افراد فاقد اعتبار'],['ExpOplic','خودرو فاقد بهره‌برداری'],['TeamReport','زیرمجموعه من'],['Outage','اعلام قطع سیستم نوبت‌دهی'],['CompanyRequests','ارسال برای شرکت'],['Cultural','فعالیت‌های فرهنگی'],['Welfare','ثبت رفاهیات'],['SalarySlips','فیش حقوقی'],['Inventory','اقلام تحویلی'],['LineLocation','ثبت موقعیت خطوط'],['StationCapture','ثبت موقعیت و تصویر خطوط'],['MyStations','ایستگاه‌های ثبت‌شده من'],['LineVisitProgram','برنامه بازدید خطوط'],['RadioAdmin','تنظیمات بی‌سیم (مدیریت کانال‌ها)'],['RadioCenter','مرکز بی‌سیم (شنود کانال‌ها)']
  ];
  var ALL=ITEMS.map(function(x){return x[0];});
  function token(){return localStorage.token||localStorage.access_token||'';}
  function request(opt){
    opt=opt||{};
    var h=Object.assign({'Content-Type':'application/json','Authorization':'Bearer '+token()},opt.headers||{});
    return fetch(API,Object.assign({},opt,{headers:h,cache:'no-store'})).then(function(r){return r.text().then(function(t){var d={};try{d=t?JSON.parse(t):{};}catch(e){throw Error('پاسخ نامعتبر سرور');}if(!r.ok)throw Error(d.error||d.message||'خطای سرور');return d;});});
  }
  function norm(s){return String(s||'').replace(/\s+/g,' ').trim();}
  function findAccessHost(){
    var nodes=document.querySelectorAll('.panel,section,article,main,div');
    for(var i=0;i<nodes.length;i++){
      var t=norm(nodes[i].textContent);
      if(t.indexOf('آیتم‌های قابل نمایش اپ بر اساس سمت')>=0)return nodes[i];
      if(t.indexOf('دسترسی سمت')>=0&&t.length<6000)return nodes[i];
    }
    return null;
  }
  function findRoleSelect(host){
    if(!host)return null;
    var selects=host.querySelectorAll('select');
    for(var i=0;i<selects.length;i++)if(selects[i].options&&selects[i].options.length)return selects[i];
    return null;
  }
  function buildAccess(){
    var host=findAccessHost();
    if(!host||host.querySelector('[data-khatyar-radio-access]'))return;
    var box=document.createElement('div');
    box.dataset.khatyarRadioAccess='1';
    box.style.cssText='margin-top:14px;padding:14px;border:1px solid #dfe5ec;border-radius:12px;background:#fff;';
    var title=document.createElement('div');title.textContent='📻 دسترسی‌های بی‌سیم';title.style.cssText='font-weight:800;margin-bottom:5px;';box.appendChild(title);
    var note=document.createElement('div');note.textContent='برای سمت انتخاب‌شده، دسترسی تنظیمات بی‌سیم و مرکز بی‌سیم را تعیین کنید.';note.style.cssText='font-size:12px;color:#667085;margin-bottom:10px;';box.appendChild(note);
    var rows={};
    [['RadioAdmin','تنظیمات بی‌سیم (مدیریت کانال‌ها)'],['RadioCenter','مرکز بی‌سیم (شنود کانال‌ها)']].forEach(function(item){
      var label=document.createElement('label');label.style.cssText='display:flex;align-items:center;gap:9px;padding:9px 2px;border-bottom:1px solid #eef1f5;cursor:pointer;font-size:13px;';
      var cb=document.createElement('input');cb.type='checkbox';
      var span=document.createElement('span');span.textContent=item[1];
      label.appendChild(cb);label.appendChild(span);box.appendChild(label);rows[item[0]]=cb;
    });
    var btn=document.createElement('button');btn.type='button';btn.className='btn p';btn.textContent='ذخیره دسترسی‌های بی‌سیم';btn.style.marginTop='10px';box.appendChild(btn);
    var sel=findRoleSelect(host);
    function load(){
      if(!sel||!sel.value)return;
      request().then(function(d){
        var cfg=d.config&&typeof d.config==='object'?d.config:{};
        var arr=Array.isArray(cfg[String(sel.value)])?cfg[String(sel.value)]:ALL;
        rows.RadioAdmin.checked=arr.indexOf('RadioAdmin')>=0;
        rows.RadioCenter.checked=arr.indexOf('RadioCenter')>=0;
      }).catch(function(){});
    }
    function save(){
      if(!sel||!sel.value){alert('ابتدا یک سمت را انتخاب کنید.');return;}
      btn.disabled=true;
      request().then(function(d){
        var cfg=d.config&&typeof d.config==='object'?d.config:{};
        var cur=Array.isArray(cfg[String(sel.value)])?cfg[String(sel.value)].slice():ALL.slice();
        ['RadioAdmin','RadioCenter'].forEach(function(k){var i=cur.indexOf(k);if(rows[k].checked&&i<0)cur.push(k);if(!rows[k].checked&&i>=0)cur.splice(i,1);});
        cfg[String(sel.value)]=Array.from(new Set(cur));
        return request({method:'POST',body:JSON.stringify({config:cfg})});
      }).then(function(){btn.textContent='✓ ذخیره شد';setTimeout(function(){btn.textContent='ذخیره دسترسی‌های بی‌سیم';},1400);}).catch(function(){alert('ذخیره دسترسی‌های بی‌سیم ناموفق بود.');}).finally(function(){btn.disabled=false;});
    }
    btn.addEventListener('click',save);
    if(sel)sel.addEventListener('change',load);
    host.appendChild(box);load();
  }
  function ensureAccessItems(){
    var host=findAccessHost();if(!host)return;
    var existing=norm(host.textContent);
    if(existing.indexOf('تنظیمات بی‌سیم (مدیریت کانال‌ها)')>=0&&existing.indexOf('مرکز بی‌سیم (شنود کانال‌ها)')>=0)return;
    buildAccess();
  }
  var timer=0;
  function run(){if(timer)return;timer=setTimeout(function(){timer=0;ensureAccessItems();},100);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  if(document.documentElement)new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});
})();
