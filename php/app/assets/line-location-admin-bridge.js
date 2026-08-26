/* خطیار — یکپارچه‌سازی ثبت موقعیت ایستگاه با پنل اصلی
 * این فایل عمداً فقط بعد از ورود فعال می‌شود؛ هیچ دکمه‌ای در صفحهٔ ورود نمایش داده نمی‌شود.
 * داده‌ها از line-location-api.php خوانده می‌شوند و به جدول «خطوط تاکسیرانی» متصل می‌مانند.
 */
(function(){
  'use strict';
  const TITLE='📍 ثبت موقعیت و تصویر خطوط';
  const API='/line-location-api.php';
  const token=()=>localStorage.getItem('token')||'';
  const auth=()=>({Authorization:'Bearer '+token()});
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fa=n=>String(n??'').replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
  async function j(url,opt={}){const r=await fetch(url,{cache:'no-store',...opt,headers:{...auth(),...(opt.headers||{})}});const t=await r.text();let d={};try{d=t?JSON.parse(t):{}}catch(e){throw Error('پاسخ نامعتبر از سرور');}if(!r.ok)throw Error(d.error||'خطای سرور');return d;}
  function logged(){return !!token();}
  function css(){if(document.getElementById('kh-ll-css'))return;const s=document.createElement('style');s.id='kh-ll-css';s.textContent=`
#kh-ll-entry{display:flex;align-items:center;gap:8px;margin:8px 0;padding:10px 12px;border:1px solid var(--line,#e4e7ec);border-radius:12px;background:#fff;color:var(--ink,#172033);font:700 12px Vazirmatn,Tahoma;cursor:pointer;width:100%;text-align:right}#kh-ll-entry:hover{border-color:var(--brand,#0d7a5f)}
#kh-ll-modal{position:fixed;inset:0;background:#0b1b2e88;z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px;font-family:Vazirmatn,Tahoma;direction:rtl}#kh-ll-box{background:#fff;width:min(980px,96vw);max-height:92vh;overflow:auto;border-radius:18px;padding:18px;box-shadow:0 20px 70px #0004}#kh-ll-box h3{margin:0 0 8px}#kh-ll-close{float:left;border:0;background:#eef1f7;border-radius:10px;padding:7px 12px;cursor:pointer}.kh-ll-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.kh-ll-card{border:1px solid #e4e7ec;border-radius:14px;padding:12px;background:#fff}.kh-ll-map{height:300px;border-radius:12px;overflow:hidden;border:1px solid #e4e7ec}.kh-ll-thumb{width:100%;height:180px;object-fit:cover;border-radius:10px;border:1px solid #e4e7ec}.kh-ll-btn{border:0;border-radius:10px;padding:9px 12px;background:#0d7a5f;color:#fff;font:700 12px Vazirmatn;cursor:pointer}.kh-ll-btn.y{background:#f7c600;color:#332900}.kh-ll-select{width:100%;padding:10px;border:1px solid #d9dee8;border-radius:10px;font:inherit;margin:6px 0}.kh-ll-table{width:100%;border-collapse:collapse;font-size:11px}.kh-ll-table th,.kh-ll-table td{border:1px solid #e4e7ec;padding:7px;text-align:center}.kh-ll-table th{background:#f5f7fa}.kh-ll-note{font-size:11px;color:#667085;line-height:1.8}@media(max-width:700px){.kh-ll-grid{grid-template-columns:1fr}}
`;document.head.appendChild(s);}
  function openModal(line){
    css();
    const old=document.getElementById('kh-ll-modal');if(old)old.remove();
    const m=document.createElement('div');m.id='kh-ll-modal';m.innerHTML=`<div id="kh-ll-box"><button id="kh-ll-close">بستن</button><h3>${TITLE}</h3><p class="kh-ll-note">اطلاعات این بخش مستقیماً به رکورد خط متصل است. آخرین مختصات، دقت GPS، تصاویر و تاریخچهٔ ثبت برای همان خط نمایش داده می‌شود.</p><div id="kh-ll-content"><div class="kh-ll-note">در حال دریافت اطلاعات…</div></div></div>`;document.body.appendChild(m);m.querySelector('#kh-ll-close').onclick=()=>m.remove();
    loadLine(m,line);
  }
  async function loadLine(m,line){
    try{
      const h=await j(API+'?op=history&line_id='+encodeURIComponent(line.id));
      const rows=(Array.isArray(h)?h:[]);const latest=rows[0]||line;
      const img=u=>u?`<a href="${esc(u)}" target="_blank" rel="noopener"><img class="kh-ll-thumb" src="${esc(u)}" loading="lazy" onerror="this.style.display='none'"></a>`:'<div class="kh-ll-note">تصویر ثبت نشده است.</div>';
      const map=latest.latitude&&latest.longitude?`<div class="kh-ll-map"><iframe title="نقشه" style="width:100%;height:100%;border:0" src="https://www.openstreetmap.org/export/embed.html?bbox=${latest.longitude-.004}%2C${latest.latitude-.003}%2C${+latest.longitude+.004}%2C${+latest.latitude+.003}&layer=mapnik&marker=${latest.latitude}%2C${latest.longitude}"></iframe></div>`:'<div class="kh-ll-note">مختصات ثبت نشده است.</div>';
      m.querySelector('#kh-ll-content').innerHTML=`<div class="kh-ll-card"><b>خط ${esc(line.code||latest.code||'—')}</b><div class="kh-ll-note">${esc(line.origin||latest.origin||'')} ← ${esc(line.destination||latest.destination||'')}</div></div><div class="kh-ll-grid"><div class="kh-ll-card"><h4>آخرین موقعیت</h4><div class="kh-ll-note">عرض: ${latest.latitude??'—'}<br>طول: ${latest.longitude??'—'}<br>دقت GPS: ${latest.accuracy_m!=null?fa(Math.round(latest.accuracy_m))+' متر':'—'}<br>ایستگاه: ${esc(latest.station_name||'—')}<br>زمان: ${esc(latest.captured_at||latest.location_updated_at||'—')}</div>${map}</div><div class="kh-ll-card"><h4>تصاویر</h4><div class="kh-ll-grid">${img(latest.location_photo_path||latest.location_photo)}${img(latest.sign_photo_path||latest.station_sign_photo_path||latest.sign_photo)}</div></div></div><div class="kh-ll-card"><h4>تاریخچه موقعیت‌های همین خط (${fa(rows.length)} مورد)</h4><div style="overflow:auto"><table class="kh-ll-table"><thead><tr><th>تاریخ</th><th>ایستگاه</th><th>عرض</th><th>طول</th><th>دقت</th><th>ثبت‌کننده</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.captured_at||'—')}</td><td>${esc(x.station_name||'—')}</td><td>${esc(x.latitude||'—')}</td><td>${esc(x.longitude||'—')}</td><td>${x.accuracy_m!=null?fa(Math.round(x.accuracy_m))+' متر':'—'}</td><td>${esc(x.captured_by_name||'—')}</td></tr>`).join('')||'<tr><td colspan="6">سابقه‌ای ثبت نشده است.</td></tr>'}</tbody></table></div></div>`;
    }catch(e){m.querySelector('#kh-ll-content').innerHTML='<p style="color:#c62828">'+esc(e.message)+'</p>';}
  }
  function currentLinesTable(){
    const tables=[...document.querySelectorAll('table')];
    return tables.find(t=>/خط|مبدأ|مقصد/.test(t.innerText||''));
  }
  function enhanceLines(){
    if(!logged())return;
    const t=currentLinesTable();if(!t)return;
    [...t.tBodies].forEach(tb=>[...tb.rows].forEach(tr=>{
      if(tr.dataset.khLlEnhanced)return;const cells=[...tr.cells];if(cells.length<2)return;const code=(cells[0]?.innerText||'').trim();
      if(!/^[-\d۰-۹A-Za-z]+$/.test(code) && !code)return;
      const action=tr.lastElementChild;if(!action)return;const b=document.createElement('button');b.className='btn g';b.textContent='📍 موقعیت و ایستگاه‌ها';b.style.marginInlineStart='6px';b.onclick=async()=>{try{const lines=await j(API+'?op=lines');const line=(lines||[]).find(x=>String(x.code).trim()===code);if(line)openModal(line);else alert('اطلاعات خط پیدا نشد');}catch(e){alert(e.message);}};action.appendChild(b);tr.dataset.khLlEnhanced='1';
    }));
  }
  function addEntry(){
    if(!logged())return;css();if(document.getElementById('kh-ll-entry'))return;
    const b=document.createElement('button');b.id='kh-ll-entry';b.innerHTML='📍 <span>'+TITLE+'</span>';b.onclick=()=>location.href='line-location.html';
    const candidates=[...document.querySelectorAll('nav,aside,.sidebar,.menu,.drawer,.panel')];const host=candidates.find(x=>/داشبورد|تاکسی|تاکسیرانی|خطوط/.test(x.innerText||''))||document.querySelector('#root');
    if(host)host.insertBefore(b,host.firstChild);
  }
  let timer=0;function tick(){clearTimeout(timer);timer=setTimeout(()=>{if(!logged())return;addEntry();enhanceLines();},250);}
  const obs=new MutationObserver(tick);obs.observe(document.documentElement,{subtree:true,childList:true});setInterval(tick,2500);tick();
})();
