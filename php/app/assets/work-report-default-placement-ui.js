/* Work report default placement controls; independent of React reconciliation. */
(function () {
  'use strict';
  const ENDPOINT='/api/admin/shift-report/templates/';
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
    const res=await fetch('/api/admin/shift-report/templates',{credentials:'same-origin',cache:'no-store'});
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
    box.style.cssText='max-width:540px;width:100%;background:#fff;color:#173c34;border-radius:18px;padding:24px;box-shadow:0 24px 70px #0004;font:14px Vazirmatn,Tahoma,sans-serif';
    const heading=document.createElement('h3');heading.textContent='ذخیره جایگذاری پیش‌فرض';heading.style.cssText='margin:0 0 12px;font-size:18px';
    const desc=document.createElement('p');desc.textContent='فایل کارکرد ماه قبل را انتخاب کنید. فقط ردیف و مشخصات نیروها ذخیره می‌شود؛ ارقام کارکرد و محاسبات وارد نمی‌شوند.';desc.style.cssText='line-height:2;margin:0 0 14px';
    const file=document.createElement('input');file.type='file';file.accept='.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';file.style.cssText='width:100%;margin:6px 0 16px';
    const state=document.createElement('p');state.setAttribute('role','status');state.style.cssText='margin:10px 0;line-height:1.8;min-height:24px';
    const controls=document.createElement('div');controls.style.cssText='display:flex;gap:10px;flex-wrap:wrap';
    function button(label,primary){const el=document.createElement('button');el.type='button';el.textContent=label;el.style.cssText='border:1px solid #bad7ce;background:'+(primary?'#006852':'#fff')+';color:'+(primary?'white':'#006852')+';border-radius:10px;padding:9px 14px;font:inherit;cursor:pointer';return el;}
    const save=button('بارگذاری و ذخیره',true),remove=button('حذف چیدمان ذخیره‌شده',false),close=button('بستن',false);
    controls.append(save,remove,close);box.append(heading,desc,file,state,controls);overlay.append(box);document.body.append(overlay);
    function errorMessage(err){state.textContent=err?.message||'عملیات انجام نشد';state.style.color='#aa2626';}
    const dismiss=()=>overlay.remove();close.onclick=dismiss;
    overlay.addEventListener('click',event=>{if(event.target===overlay)dismiss();});
    overlay.addEventListener('keydown',event=>{if(event.key==='Escape')dismiss();});
    file.focus();
    let template=null;
    (async()=>{
      try{
        template=await chooseTemplate(area);
        heading.textContent='ذخیره جایگذاری پیش‌فرض — '+template.title;
        const response=await fetch(ENDPOINT+encodeURIComponent(template.id)+'/default-placement',{credentials:'same-origin',cache:'no-store'});
        if(!response.ok)throw Error('خطا در دریافت وضعیت ذخیره‌سازی');
        const data=await response.json();
        state.textContent=data.placement?'چیدمان فعلی: '+data.placement.source_filename+' | '+data.placement.count+' نیرو':'چیدمان پیش‌فرض قبلاً ذخیره نشده است.';
        remove.disabled=!data.placement;
      }catch(err){errorMessage(err);save.disabled=true;remove.disabled=true;}
    })();
    save.onclick=async()=>{
      if(!file.files?.length){state.textContent='فایل اکسل را انتخاب کنید';return;}
      if(!/\.xlsx$/i.test(file.files[0].name)){state.textContent='فقط فایل xlsx پذیرفته می‌شود';return;}
      const data=new FormData();data.append('file',file.files[0]);save.disabled=true;remove.disabled=true;state.textContent='در حال بررسی و ذخیره فایل…';state.style.color='#173c34';
      try{
        const response=await fetch(ENDPOINT+encodeURIComponent(template.id)+'/default-placement',{method:'POST',credentials:'same-origin',body:data});
        const result=await response.json();if(!response.ok)throw Error(result.error||result.message||'خطا در ذخیره: '+response.status);
        state.textContent='جایگذاری '+result.saved_count+' نیرو ذخیره شد. در پیش‌نمایش بعدی اعمال می‌شود.';
        remove.disabled=false;
      }catch(err){errorMessage(err);}finally{save.disabled=false;}
    };
    remove.onclick=async()=>{
      if(!window.confirm('چیدمان پیش‌فرض حذف شود؟'))return;
      remove.disabled=true;
      try{
        const response=await fetch(ENDPOINT+encodeURIComponent(template.id)+'/default-placement',{method:'DELETE',credentials:'same-origin'});
        if(!response.ok)throw Error('حذف چیدمان انجام نشد');
        state.textContent='چیدمان پیش‌فرض حذف شد. جانمایی خودکار فعال است.';
      }catch(err){errorMessage(err);remove.disabled=false;}
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
