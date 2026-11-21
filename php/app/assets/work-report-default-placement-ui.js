/* Work report default placement controls; independent of React reconciliation. */
(function () {
  'use strict';
  const ENDPOINT='/api/admin/shift-report/templates/';
  // The panel uses a Bearer token, not a PHP cookie session.
  // Read the token at request time so subsequent login/refresh is respected.
  function authOptions(options={}) {
    const token=window.localStorage.getItem('token');
    if(!token)throw new Error('نشست ورود معتبر پیدا نشد؛ لطفاً دوباره وارد سامانه شوید.');
    const headers=new Headers(options.headers||{});
    headers.set('Authorization','Bearer '+token);
    return {...options,credentials:'same-origin',headers};
  }
  async function authorizedFetch(url,options={}) {
    const response=await fetch(url,authOptions(options));
    if(response.status===401)throw new Error('نشست ورود شما منقضی شده است؛ لطفاً دوباره وارد سامانه شوید.');
    if(response.status===403)throw new Error('برای مدیریت جایگذاری پیش‌فرض دسترسی مدیر کل لازم است.');
    return response;
  }

  let active=false;
  function text(el){return (el?.textContent||'').replace(/\s+/g,' ').trim();}
  function findButton(){
    return Array.from(document.querySelectorAll('button')).find(el=>text(el)==='مدیریت قالب‌ها' || text(el)==='مدیریت قالب ها');
  }
  function parentArea(button){
    let node=button;
    for(let i=0;i<6&&node;i++,node=node.parentElement){
      if(node.querySelectorAll('select').length&&text(node).includes('قالب گزارش کارکرد'))return node;
    }
    return button.parentElement;
  }
  function getSelect(area){
    const selects=Array.from(area?.querySelectorAll('select')||[]);
    return selects.find(s=>{
      const parent=s.parentElement;
      return text(parent).includes('قالب گزارش کارکرد')||text(parent?.parentElement).includes('قالب گزارش کارکرد');
    })||selects[selects.length-1];
  }
  async function chooseTemplate(area){
    const selected=getSelect(area)?.value;
    const res=await authorizedFetch('/api/admin/shift-report/templates',{cache:'no-store'});
    if(!res.ok)throw Error('فهرست قالب‌ها قابل دریافت نیست ('+res.status+')');
    const body=await res.json();
    const templates=body.templates||[];
    let row=templates.find(t=>String(t.id)===String(selected));
    if(!row&&selected)row=templates.find(t=>String(t.title)===String(selected));
    if(!row)row=templates.find(t=>String(t.id)===String(body.default_template_id));
    if(!row&&templates.length===1)row=templates[0];
    if(!row)throw Error('لطفاً قالب کارکرد را ابتدا انتخاب کنید');
    return row;
  }
  function showDialog(area){
    if(document.getElementById('kh-default-placement-dialog'))return;
    const overlay=document.createElement('div');
    overlay.id='kh-default-placement-dialog';
    overlay.setAttribute('role','presentation');
    overlay.style.cssText='position:fixed;inset:0;z-index:2147482000;background:rgba(4,32,28,.6);display:flex;align-items:center;justify-content:center;padding:16px;direction:rtl';
    const box=document.createElement('section');
    box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
    box.setAttribute('aria-label','ذخیره جایگذاری پیش‌فرض');
    box.style.cssText='max-width:540px;width:100%;max-height:calc(100dvh - 32px);overflow-y:auto;background:#fff;color:#173c34;border-radius:18px;padding:clamp(14px,4vw,24px);box-shadow:0 24px 70px #0004;font:14px Vazirmatn,Tahoma,sans-serif';
    const heading=document.createElement('h3');heading.textContent='ذخیره جایگذاری پیش‌فرض';heading.style.cssText='margin:0 0 12px;font-size:18px';
    const desc=document.createElement('p');desc.textContent='فایل کارکرد ماه قبل را انتخاب کنید. فقط ردیف و مشخصات نیروها ذخیره می‌شود؛ ارقام کارکرد و محاسبات وارد نمی‌شوند.';desc.style.cssText='line-height:2;margin:0 0 14px';
    const file=document.createElement('input');file.type='file';file.accept='.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';file.setAttribute('aria-label','انتخاب فایل اکسل کارکرد قبلی');file.style.cssText='width:100%;margin:6px 0 16px';
    const state=document.createElement('p');state.setAttribute('role','status');state.tabIndex=-1;state.style.cssText='margin:10px 0;line-height:1.8;min-height:24px';
    const controls=document.createElement('div');controls.style.cssText='display:flex;gap:10px;flex-wrap:wrap';
    function button(label,primary){const el=document.createElement('button');el.type='button';el.textContent=label;el.style.cssText='border:1px solid #bad7ce;background:'+(primary?'#006852':'#fff')+';color:'+(primary?'white':'#006852')+';border-radius:10px;padding:9px 14px;font:inherit;cursor:pointer';return el;}
    const save=button('بارگذاری و ذخیره',true),remove=button('حذف چیدمان ذخیره‌شده',false),close=button('بستن',false);
    save.disabled=true;remove.disabled=true;
    controls.append(save,remove,close);box.append(heading,desc,file,state,controls);overlay.append(box);document.body.append(overlay);
    function errorMessage(err){state.textContent=err?.message||'عملیات انجام نشد';state.style.color='#aa2626';}
    const previousFocus=document.activeElement;
    let busy=false;
    let hasPlacement=false;
    const setBusy=(value)=>{busy=value;box.setAttribute('aria-busy',value?'true':'false');file.disabled=value;close.disabled=value;save.disabled=value;remove.disabled=value||!hasPlacement;};
    const dismiss=()=>{
      if(busy)return;
      overlay.remove();
      document.removeEventListener('keydown',onDialogKeydown,true);
      if(previousFocus?.isConnected&&typeof previousFocus.focus==='function')previousFocus.focus();
    };
    function onDialogKeydown(event){
      if(!overlay.isConnected)return;
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();dismiss();return;}
      if(event.key!=='Tab')return;
      const focusable=[file,save,remove,close].filter(el=>!el.disabled&&!el.hidden);
      if(!focusable.length){event.preventDefault();state.focus();return;}
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&(document.activeElement===first||!focusable.includes(document.activeElement))){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&(document.activeElement===last||!focusable.includes(document.activeElement))){event.preventDefault();first.focus();}
    }
    close.onclick=dismiss;
    overlay.addEventListener('click',event=>{if(event.target===overlay)dismiss();});
    document.addEventListener('keydown',onDialogKeydown,true);
    file.focus();
    let template=null;
    (async()=>{
      try{
        template=await chooseTemplate(area);
        heading.textContent='ذخیره جایگذاری پیش‌فرض — '+template.title;
        const response=await authorizedFetch(ENDPOINT+encodeURIComponent(template.id)+'/default-placement',{cache:'no-store'});
        if(!response.ok)throw Error('خطا در دریافت وضعیت ذخیره‌سازی');
        const data=await response.json();
        state.textContent=data.placement?'چیدمان فعلی: '+data.placement.source_filename+' | '+data.placement.count+' نیرو':'چیدمان پیش‌فرض قبلاً ذخیره نشده است.';
        hasPlacement=!!data.placement;save.disabled=false;remove.disabled=!hasPlacement;
      }catch(err){errorMessage(err);save.disabled=true;remove.disabled=true;}
    })();
    save.onclick=async()=>{
      if(busy||!template)return;
      if(!file.files?.length){state.textContent='فایل اکسل را انتخاب کنید';file.focus();return;}
      if(!/\.xlsx$/i.test(file.files[0].name)){state.textContent='فقط فایل xlsx پذیرفته می‌شود';file.focus();return;}
      const data=new FormData();data.append('file',file.files[0]);setBusy(true);state.textContent='در حال بررسی و ذخیره فایل…';state.focus();state.style.color='#173c34';
      const progress=window.KhatyarLongOperation;const progressJob=progress?.begin('در حال بارگذاری فایل کارکرد',{delay:350,stage:'در حال اعتبارسنجی و ذخیره جایگذاری نیروها…'});
      try{
        const response=await authorizedFetch(ENDPOINT+encodeURIComponent(template.id)+'/default-placement',{method:'POST',body:data});
        const result=await response.json();if(!response.ok)throw Error(result.error||result.message||'خطا در ذخیره: '+response.status);
        state.textContent='جایگذاری '+result.saved_count+' نیرو ذخیره شد. در پیش‌نمایش بعدی اعمال می‌شود.';
        hasPlacement=true;remove.disabled=false;
      }catch(err){errorMessage(err);}finally{if(progressJob!=null)progress.end(progressJob);setBusy(false);save.disabled=false;}
    };
    remove.onclick=async()=>{
      if(busy||!template)return;
      if(!window.confirm('چیدمان پیش‌فرض حذف شود؟'))return;
      setBusy(true);state.focus();
      try{
        const response=await authorizedFetch(ENDPOINT+encodeURIComponent(template.id)+'/default-placement',{method:'DELETE'});
        if(!response.ok)throw Error('حذف چیدمان انجام نشد');
        state.textContent='چیدمان پیش‌فرض حذف شد. جانمایی خودکار فعال است.';hasPlacement=false;remove.disabled=true;
      }catch(err){errorMessage(err);remove.disabled=!hasPlacement;}finally{setBusy(false);save.disabled=false;}
    };
  }
  function attach(){
    if(active)return;
    const anchor=findButton();if(!anchor)return;
    const holder=anchor.parentElement;if(!holder)return;
    if(holder.querySelector('[data-kh-placement-control]'))return;
    const btn=document.createElement('button');btn.type='button';btn.dataset.khPlacementControl='1';btn.className=anchor.className;
    btn.textContent='ذخیره جایگذاری پیش‌فرض';
    btn.style.marginInline='6px';btn.title='استفاده از فایل کارکرد قبلی برای جایگذاری نیروها در گزارش‌های بعدی';
    btn.onclick=()=>showDialog(parentArea(anchor));
    anchor.insertAdjacentElement('afterend',btn);
  }
  const observer=new MutationObserver(()=>{if(!active){active=true;requestAnimationFrame(()=>{active=false;attach();});}});
  function start(){observer.observe(document.body,{childList:true,subtree:true});attach();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
