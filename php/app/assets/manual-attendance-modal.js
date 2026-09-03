/* خطیار — ثبت دستی تردد در مودال اختصاصی «جزئیات تردد» */
(function(){
  'use strict';
  var API='/api/admin/attendance-punch';
  var FA='۰۱۲۳۴۵۶۷۸۹';
  function en(v){return String(v==null?'':v).replace(/[۰-۹]/g,function(d){return String(FA.indexOf(d));}).replace(/[٬,]/g,'');}
  function fa(v){return String(v==null?'':v).replace(/[0-9]/g,function(d){return FA.charAt(Number(d));});}
  function norm(v){return String(v==null?'':v).replace(/[يى]/g,'ی').replace(/[ك]/g,'ک').replace(/[\u200c\u200e\u200f]/g,'').replace(/\s+/g,' ').trim();}
  function token(){return localStorage.getItem('token')||localStorage.getItem('access_token')||'';}
  function payload(){return window.__khatyarAttendancePayload||null;}
  function selectedDay(modal){
    var p=payload(),days=p&&Array.isArray(p.days)?p.days:[];
    var t=norm(modal.innerText||'');
    for(var i=0;i<days.length;i++){
      var d=days[i],j=norm(d&&d.jdate||'');
      if(j && (t.indexOf(j)>=0 || t.indexOf(fa(j))>=0)) return d;
    }
    var m=t.match(/(140\d[\/\-]\d{1,2}[\/\-]\d{1,2}|۱۴۰\d[\/\-]\d{1,2}[\/\-]\d{1,2})/);
    if(m){var wanted=en(m[1]).replace(/-/g,'/');return days.find(function(d){return en(d.jdate).replace(/-/g,'/')===wanted;})||{jdate:wanted};}
    return null;
  }
  function userId(){
    var p=payload();
    if(p&&p.user){return p.user.id||p.user.user_id||p.userId||null;}
    var s=Array.prototype.find.call(document.querySelectorAll('select'),function(x){return x.value&&x.options&&x.options.length>5;});
    return s?s.value:null;
  }
  function modal(){return document.querySelector('.khar-overlay#khar-detail .khar-detail-dialog');}
  function empty(modal){return !!(modal&&modal.querySelector('.khar-empty-state'));}
  function add(){
    var m=modal();
    if(!m||!empty(m)||m.querySelector('[data-khatyar-manual-attendance]'))return;
    var d=selectedDay(m),j=d&&d.jdate?d.jdate:'';
    var actions=document.createElement('div');
    actions.setAttribute('data-khatyar-manual-attendance','1');
    actions.style.cssText='margin-top:14px;padding-top:12px;border-top:1px solid #e5e7eb;direction:rtl';
    actions.innerHTML='<button type="button" data-ma-open style="border:0;border-radius:9px;padding:9px 14px;background:#0d7a5f;color:#fff;font:inherit;font-weight:700;cursor:pointer"><i class="bi bi-plus-circle"></i> ثبت دستی تردد</button><div data-ma-form style="display:none;margin-top:10px;padding:12px;border:1px solid #d7dde7;border-radius:10px;background:#f8fafc"><div style="font-weight:800;margin-bottom:8px">ثبت دستی تردد</div><label style="display:block;font-size:12px;margin-bottom:7px">تاریخ<input data-ma-date value="'+fa(j)+'" inputmode="numeric" style="display:block;width:100%;box-sizing:border-box;margin-top:4px;padding:8px;border:1px solid #d0d5dd;border-radius:8px;font:inherit"></label><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><label style="font-size:12px">ورود<input data-ma-in type="text" inputmode="numeric" placeholder="۰۷:۰۰" style="display:block;width:100%;margin-top:4px;padding:8px;border:1px solid #d0d5dd;border-radius:8px;font:inherit"></label><label style="font-size:12px">خروج<input data-ma-out type="text" inputmode="numeric" placeholder="۱۴:۳۰" style="display:block;width:100%;margin-top:4px;padding:8px;border:1px solid #d0d5dd;border-radius:8px;font:inherit"></label></div><div data-ma-msg style="font-size:12px;margin-top:7px"></div><div style="display:flex;gap:8px;margin-top:9px"><button type="button" data-ma-save style="border:0;border-radius:8px;padding:8px 12px;background:#0d7a5f;color:#fff;font:inherit;font-weight:700">ثبت تردد</button><button type="button" data-ma-cancel style="border:0;border-radius:8px;padding:8px 12px;background:#eef2f6;font:inherit">انصراف</button></div></div>';
    m.appendChild(actions);
    var form=actions.querySelector('[data-ma-form]');
    actions.querySelector('[data-ma-open]').onclick=function(){form.style.display=form.style.display==='none'?'block':'none';};
    actions.querySelector('[data-ma-cancel]').onclick=function(){form.style.display='none';};
    actions.querySelector('[data-ma-save]').onclick=async function(){
      var msg=form.querySelector('[data-ma-msg]'),save=form.querySelector('[data-ma-save]');
      var uid=userId(),date=en(form.querySelector('[data-ma-date]').value).trim().replace(/-/g,'/'),ci=en(form.querySelector('[data-ma-in]').value).trim(),co=en(form.querySelector('[data-ma-out]').value).trim();
      if(!uid){msg.textContent='شناسه پرسنل انتخاب‌شده پیدا نشد.';msg.style.color='#b42318';return;}
      if(!/^140\d\/\d{1,2}\/\d{1,2}$/.test(date)){msg.textContent='تاریخ نامعتبر است.';msg.style.color='#b42318';return;}
      if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(ci)){msg.textContent='ساعت ورود نامعتبر است.';msg.style.color='#b42318';return;}
      if(co&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(co)){msg.textContent='ساعت خروج نامعتبر است.';msg.style.color='#b42318';return;}
      save.disabled=true;msg.textContent='در حال ثبت تردد...';msg.style.color='';
      try{
        var r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token()},body:JSON.stringify({user_id:Number(uid),jdate:date,check_in:ci,check_out:co})});
        var body=await r.json().catch(function(){return{};});
        if(!r.ok)throw new Error(body.error||body.message||'ثبت تردد ناموفق بود.');
        msg.textContent='تردد با موفقیت ثبت شد. برای به‌روزرسانی گزارش، «مشاهده گزارش» را دوباره اجرا کنید.';msg.style.color='#0d7a5f';
      }catch(e){msg.textContent=e.message||'ثبت تردد ناموفق بود.';msg.style.color='#b42318';save.disabled=false;}
    };
  }
  function scan(){add();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});else scan();
  var timer=0;
  new MutationObserver(function(){if(timer)return;timer=setTimeout(function(){timer=0;scan();},50);}).observe(document.documentElement,{childList:true,subtree:true});
})();