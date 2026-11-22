/* آفلاین و فقط‌خواندنی؛ بدون ارسال اطلاعات هویتی به سرویس شخص ثالث */
(() => {
  'use strict';
  const css=document.createElement('style');
  css.textContent='.kh-audit-trigger{background:#087f5b;color:white;border:0;border-radius:10px;padding:10px;margin:8px;font:600 13px Vazirmatn,Tahoma;cursor:pointer}.kh-audit-overlay{position:fixed;inset:0;background:#142e27ad;z-index:2147483550;display:grid;place-items:center;padding:12px;direction:rtl}.kh-audit-panel{box-sizing:border-box;max-height:92dvh;overflow:auto;width:min(940px,100%);padding:20px;border-radius:18px;background:white;color:#183b2c;font:14px Vazirmatn,Tahoma}.kh-audit-panel header,.kh-audit-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:12px 0}.kh-audit-panel header{justify-content:space-between}.kh-audit-panel h2{font-size:18px;margin:0}.kh-audit-panel button,.kh-audit-panel input,.kh-audit-panel select{padding:8px;border:1px solid #cbded4;border-radius:9px;background:white;color:#20382e;font:inherit}.kh-audit-panel button{cursor:pointer}.kh-audit-panel progress{width:100%;height:14px;accent-color:#087f5b}.kh-audit-table{max-height:48dvh;overflow:auto}.kh-audit-table table{border-collapse:collapse;width:100%;min-width:580px}.kh-audit-table td,.kh-audit-table th{padding:8px;border-bottom:1px solid #dae5df;text-align:right}.kh-audit-table th{position:sticky;top:0;background:#eaf5ef}.kh-audit-panel [role=status]{line-height:1.8}.kh-audit-controls input{flex:1;min-width:160px}';
  document.head.appendChild(css);
  const make=(tag,txt)=>{const node=document.createElement(tag);if(txt!=null)node.textContent=txt;return node;};
  const number=v=>Number(v||0).toLocaleString('fa-IR');
  let overlay=null;
  function open(){
    if(overlay)return;
    overlay=make('div');overlay.className='kh-audit-overlay';
    const panel=make('section');panel.className='kh-audit-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','ممیزی اطلاعات هویتی و بانکی');
    overlay.append(panel);document.body.append(overlay);
    const head=make('header'),title=make('h2','بررسی صحت اطلاعات هویتی و بانکی کاربران'),close=make('button','بستن ×');
    head.append(title,close);panel.append(head);
    panel.append(make('p','بررسی ساختاری آفلاین؛ این گزارش مالکیت حساب یا هویت صاحب کد ملی را تأیید نمی‌کند و اطلاعات کاربران را تغییر نمی‌دهد.'));
    const progress=make('progress');progress.max=100;progress.value=0;progress.setAttribute('aria-label','پیشرفت واقعی');
    const status=make('p','آماده شروع بررسی');status.setAttribute('role','status');status.setAttribute('aria-live','polite');panel.append(progress,status);
    const controls=make('div');controls.className='kh-audit-controls';panel.append(controls);
    const start=make('button','شروع ممیزی'),stop=make('button','توقف'),download=make('button','خروجی Excel');
    const filter=make('select');[['all','همه'],['active','فعال'],['inactive','غیرفعال'],['national','کد ملی'],['bank','بانک و حساب']].forEach(([value,label])=>{const o=make('option',label);o.value=value;filter.append(o);});
    const search=make('input');search.type='search';search.placeholder='جستجوی نام یا شماره پرسنلی';search.setAttribute('aria-label','جستجو');
    controls.append(start,stop,search,filter,download);download.disabled=true;
    const wrap=make('div');wrap.className='kh-audit-table';const table=make('table'),thead=make('thead'),hrow=make('tr'),tbody=make('tbody');
    ['نام','شماره پرسنلی','وضعیت','مغایرت'].forEach(t=>hrow.append(make('th',t)));thead.append(hrow);table.append(thead,tbody);wrap.append(table);panel.append(wrap);
    const results=[];const totals={};let controller=null;let running=false;let cursor=0;let completed=false;
    const filtered=()=>results.filter(r=>{
      const text=[r.name,r.personnel_code,...(r.errors||[])].join(' ').toLowerCase();
      const query=search.value.trim().toLowerCase();if(query&&!text.includes(query))return false;
      if(filter.value==='active'&&Number(r.is_active)!==1)return false;
      if(filter.value==='inactive'&&Number(r.is_active)===1)return false;
      if(filter.value==='national'&&!text.includes('کد ملی'))return false;
      if(filter.value==='bank'&&!/حساب|بانک|شبا/.test(text))return false;
      return true;
    });
    function render(){
      tbody.replaceChildren();
      for(const r of filtered().slice(0,4000)){
        const tr=make('tr');
        [r.name||'—',r.personnel_code||'—',Number(r.is_active)===1?'فعال':'غیرفعال',(r.errors||[]).join('؛ ')].forEach(t=>tr.append(make('td',t)));
        tbody.append(tr);
      }
    }
    const dismiss=()=>{controller?.abort();running=false;overlay.remove();overlay=null;};
    close.onclick=dismiss;overlay.onclick=e=>{if(e.target===overlay)dismiss();};
    overlay.onkeydown=e=>{if(e.key==='Escape')dismiss();};
    stop.onclick=()=>{controller?.abort();running=false;status.textContent='ممیزی متوقف شد؛ نتایج موجود محفوظ است.';};
    search.oninput=render;filter.onchange=render;
    download.onclick=()=>{
      if(!window.XLSX?.utils){status.textContent='کتابخانه Excel محلی در دسترس نیست.';return;}
      const rows=filtered().map(r=>({'شناسه':r.user_id,'نام':r.name,'شماره پرسنلی':String(r.personnel_code||''),'وضعیت':Number(r.is_active)===1?'فعال':'غیرفعال','مغایرت':(r.errors||[]).join('؛ ')}));
      const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),'مغایرت‌ها');
      XLSX.writeFile(wb,'khatyar-identity-banking-audit.xlsx');
    };
    start.onclick=async()=>{
      if(running)return;running=true;controller=new AbortController();start.disabled=true;
      if(completed){cursor=0;results.length=0;Object.keys(totals).forEach(k=>delete totals[k]);completed=false;render();download.disabled=true;}
      try{
        while(running){
          const token=localStorage.token||'';
          const response=await fetch('/api/admin/identity-banking/audit?after_id='+cursor+'&limit=100',{
            headers:{Authorization:'Bearer '+token,'X-Access-Token':token},credentials:'same-origin',cache:'no-store',signal:controller.signal
          });
          const payload=await response.json().catch(()=>null);
          if(!response.ok||!payload)throw new Error(payload?.error||payload?.message||'دسترسی یا ارتباط ناموفق بود');
          results.push(...(payload.issues||[]));
          Object.entries(payload.counts||{}).forEach(([k,v])=>{totals[k]=(totals[k]||0)+Number(v||0);});
          progress.value=Math.max(0,Math.min(100,Number(payload.percent||0)));
          status.textContent='بررسی '+number(payload.processed)+' از '+number(payload.total)+' نفر — '+number(progress.value)+'٪ | موارد نیازمند بررسی: '+number(results.length);
          render();download.disabled=results.length===0;
          if(payload.finished||payload.next_cursor==null){completed=true;break;}
          const next=Number(payload.next_cursor);if(next<=cursor)throw new Error('خطا در ادامه پردازش');
          cursor=next;
        }
        if(running)status.textContent='ممیزی کامل شد. '+number(results.length)+' پرونده نیازمند بررسی شناسایی شد. '+Object.entries(totals).map(([k,v])=>k+': '+number(v)).join(' | ');
      }catch(error){if(running)status.textContent='ممیزی کامل نشد: '+(error?.message||'خطای نامشخص');}
      finally{running=false;start.disabled=false;start.textContent=completed?'اجرای مجدد ممیزی':'ادامه ممیزی';}
    };
    close.focus();
  }
  function mount(){
    const root=document.querySelector('#root');if(!root)return;
    for(const heading of root.querySelectorAll('h1,h2,h3,[role="heading"]')){
      if((heading.textContent||'').trim()!=='مدیریت کاربران')continue;
      if(heading.nextElementSibling?.classList?.contains('kh-audit-trigger'))continue;
      const btn=make('button','بررسی صحت اطلاعات هویتی و بانکی کاربران');
      btn.className='kh-audit-trigger';btn.type='button';btn.onclick=open;
      heading.insertAdjacentElement('afterend',btn);
    }
  }
  let scheduled=false;
  function boot(){
    const root=document.querySelector('#root');if(!root)return;
    new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;mount();});}).observe(root,{subtree:true,childList:true});
    mount();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
