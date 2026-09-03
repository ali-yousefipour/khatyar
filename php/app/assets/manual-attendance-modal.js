/* خطیار — ثبت دستی تردد برای روزهای بدون رکورد، داخل مودال جزئیات تردد */
(function(){
  'use strict';
  var API='/api/admin/attendance-punch';
  var FA='۰۱۲۳۴۵۶۷۸۹';
  function fa(v){return String(v||'').replace(/[0-9]/g,function(d){return FA[Number(d)];});}
  function en(v){return String(v||'').replace(/[۰-۹]/g,function(d){return String(FA.indexOf(d));});}
  function norm(s){return String(s||'').replace(/[يى]/g,'ی').replace(/[ك]/g,'ک').replace(/[\u200c\u200e\u200f]/g,'').replace(/\s+/g,' ').trim();}
  function findUser(){
    var selects=Array.prototype.slice.call(document.querySelectorAll('select'));
    var best=selects.filter(function(s){return s.options&&s.options.length>5;}).find(function(s){return s.value&&s.selectedIndex>0;});
    return best&&best.value?String(best.value):null;
  }
  function findDate(modal){
    var text=norm(modal.innerText||'');
    var m=text.match(/(۱۴۰\d[\/\-]\d{1,2}[\/\-]\d{1,2}|140\d[\/\-]\d{1,2}[\/\-]\d{1,2})/);
    return m?m[1].replace(/-/g,'/'):'';
  }
  function modalRoot(){
    var els=Array.prototype.slice.call(document.querySelectorAll('[role="dialog"],.modal,[class*="modal"],.dialog'));
    return els.find(function(el){var t=norm(el.innerText||'');return t.indexOf('جزئیات تردد')>=0;})||null;
  }
  function hasNoPunch(modal){var t=norm(modal.innerText||'');return /بدون تردد|ترددی ثبت نشده|ورود\s*[—-]\s*خروج|هیچ ترددی/.test(t);}
  function addButton(modal){
    if(!hasNoPunch(modal)||modal.querySelector('[data-khatyar-manual-attendance]'))return;
    var btn=document.createElement('button');btn.type='button';btn.dataset.khatyarManualAttendance='1';btn.textContent='＋ ثبت دستی تردد';btn.style.cssText='border:0;border-radius:10px;padding:9px 13px;margin:8px 0;background:#0d7a5f;color:#fff;font:inherit;font-weight:700;cursor:pointer';
    var host=Array.prototype.find.call(modal.querySelectorAll('button'),function(b){return /بستن|ویرایش|حذف/.test(norm(b.textContent));});
    if(host&&host.parentNode)host.parentNode.insertBefore(btn,host);else modal.appendChild(btn);
    btn.onclick=function(){openForm(modal);};
  }
  function openForm(modal){
    if(modal.querySelector('[data-khatyar-manual-form]'))return;
    var userId=findUser(),date=findDate(modal);
    var box=document.createElement('div');box.dataset.khatyarManualForm='1';box.style.cssText='border:1px solid #d7dde7;border-radius:12px;padding:12px;margin:8px 0;background:#f8fafc;direction:rtl';
    box.innerHTML='<b>ثبت دستی تردد</b><div style="font-size:11px;color:#667085;margin:5px 0 10px">برای روز بدون رکورد، ساعت ورود و در صورت نیاز ساعت خروج را ثبت کنید.</div><label style="display:block;margin:6px 0;font-size:12px">تاریخ<input data-ma-date type="text" value="'+fa(date)+'" placeholder="۱۴۰۵/۰۶/۰۱" style="display:block;width:100%;margin-top:4px;padding:8px;border:1px solid #d7dde7;border-radius:8px;font:inherit"></label><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><label style="font-size:12px">ورود<input data-ma-in type="text" inputmode="numeric" placeholder="۰۷:۰۰" style="display:block;width:100%;margin-top:4px;padding:8px;border:1px solid #d7dde7;border-radius:8px;font:inherit"></label><label style="font-size:12px">خروج<input data-ma-out type="text" inputmode="numeric" placeholder="۱۴:۳۰" style="display:block;width:100%;margin-top:4px;padding:8px;border:1px solid #d7dde7;border-radius:8px;font:inherit"></label></div><div data-ma-msg style="font-size:11px;margin-top:7px"></div><div style="display:flex;gap:8px;margin-top:9px"><button type="button" data-ma-save style="border:0;border-radius:9px;padding:8px 13px;background:#0d7a5f;color:#fff;font:inherit;font-weight:700">ثبت تردد</button><button type="button" data-ma-cancel style="border:0;border-radius:9px;padding:8px 13px;background:#eef2f6;font:inherit">انصراف</button></div>';
    modal.appendChild(box);
    box.querySelector('[data-ma-cancel]').onclick=function(){box.remove();};
    box.querySelector('[data-ma-save]').onclick=async function(){
      var msg=box.querySelector('[data-ma-msg]'),inT=en(box.querySelector('[data-ma-in]').value).trim(),outT=en(box.querySelector('[data-ma-out]').value).trim(),jdate=en(box.querySelector('[data-ma-date]').value).trim();
      if(!userId){msg.textContent='پرسنل انتخاب‌شده پیدا نشد.';msg.style.color='#b42318';return;}
      if(!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(jdate)){msg.textContent='تاریخ باید به صورت ۱۴۰۵/۰۶/۰۱ باشد.';msg.style.color='#b42318';return;}
      if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(inT)){msg.textContent='ساعت ورود نامعتبر است.';msg.style.color='#b42318';return;}
      if(outT&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(outT)){msg.textContent='ساعت خروج نامعتبر است.';msg.style.color='#b42318';return;}
      var save=box.querySelector('[data-ma-save]');save.disabled=true;msg.textContent='در حال ثبت…';
      try{var r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+(localStorage.token||'')},body:JSON.stringify({user_id:Number(userId),jdate:jdate,check_in:inT,check_out:outT})});var d=await r.json().catch(function(){return{};});if(!r.ok)throw Error(d.error||'ثبت تردد ناموفق بود');msg.textContent='تردد با موفقیت ثبت شد. گزارش را مجدداً مشاهده کنید.';msg.style.color='#0d7a5f';setTimeout(function(){box.remove();},900);}catch(e){msg.textContent=e.message||'ثبت ناموفق بود';msg.style.color='#b42318';save.disabled=false;}
    };
  }
  function scan(){var m=modalRoot();if(m)addButton(m);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});else scan();
  var timer=0;new MutationObserver(function(){if(timer)return;timer=setTimeout(function(){timer=0;scan();},100);}).observe(document.documentElement,{childList:true,subtree:true});
})();
