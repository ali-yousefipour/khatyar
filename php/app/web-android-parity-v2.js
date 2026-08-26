/* Khatyar Web/Android parity v3
 * Source of truth for the Web App presentation/order is the Android Dashboard MENU.
 * Keeps the Web App authenticated, RTL, mobile-first and visually aligned with Android.
 * Camera-only capture is enforced for station photos; gallery selection is not exposed.
 * This layer is presentation/navigation only and never grants backend permissions.
 */
(function(){'use strict';
if(window.__KHATYAR_PARITY_V3__)return;window.__KHATYAR_PARITY_V3__=true;

const MENU=[
 ['🔎','جستجوی تاکسی و تاکسیران','search','general'],
 ['👥','حاضرین در خط','presentList','field'],
 ['📝','ارسال گزارش','reports','work'],
 ['✓','ثبت حضور من','checkin','field'],
 ['📨','درخواست‌ها','requests','work'],
 ['✔','تأیید درخواست‌ها','requestInbox','work'],
 ['📊','کارکرد من','workSummary','personal'],
 ['💰','فیش حقوقی','salarySlips','personal'],
 ['🏢','ارسال برای شرکت','companyRequests','work'],
 ['💳','اشتراک برنامه','subscription','personal'],
 ['📱','ارسال پیامک','sms','messages'],
 ['🤖','ارسال پیام در ربات‌ها','botMessages','messages'],
 ['📤','پیامک‌های ارسالی من','mySms','messages'],
 ['📋','تکمیل فرم‌ها','forms','work'],
 ['🎨','فعالیت‌های فرهنگی','cultural','personal'],
 ['🎁','ثبت رفاهیات','welfare','personal'],
 ['🧑‍✈️','حضور مسئولین در خط','officialPresence','field'],
 ['📦','اقلام تحویلی','inventory','personal'],
 ['🎯','مأموریت روزانه من','myDailyMission','field'],
 ['🗺','برنامه بازدید و پوشش خط','lineVisitProgram','field'],
 ['📍','ثبت موقعیت و تصویر خطوط','lineLocation','field'],
 ['🏆','داشبورد و امتیاز من','roleDashboard','personal'],
 ['🏅','رتبه‌بندی و نشان‌ها','leaderboard','personal'],
 ['📈','پرکار/کم‌کار هر خط','activityReport','work'],
 ['🛡','بیمه و معاینه خودروها','expInsurance','work'],
 ['⚠','افراد فاقد اعتبار','expTaxi','work'],
 ['🔧','خودرو فاقد بهره‌برداری','expOplic','work'],
 ['👥','زیرمجموعه من','teamReport','work'],
 ['⏱','رانندگان موقت خطوط ویژه','tempDrivers','field'],
 ['⚡','اعلام قطع سیستم نوبت‌دهی','outage','work']
];
const TABS=[['all','همه'],['field','میدانی'],['work','عملیات'],['messages','پیام‌ها'],['personal','شخصی'],['general','سایر']];
const ROUTE_ALIASES={search:'search',presentList:'presentList',reports:'reports',checkin:'checkin',requests:'requests',requestInbox:'requestInbox',workSummary:'workSummary',salarySlips:'salarySlips',companyRequests:'companyRequests',subscription:'subscription',sms:'sms',botMessages:'botMessages',mySms:'mySms',forms:'forms',cultural:'cultural',welfare:'welfare',officialPresence:'officialPresence',inventory:'inventory',myDailyMission:'myDailyMission',lineVisitProgram:'lineVisitProgram',lineLocation:'lineLocation',roleDashboard:'roleDashboard',leaderboard:'leaderboard',activityReport:'activityReport',expInsurance:'expInsurance',expTaxi:'expTaxi',expOplic:'expOplic',teamReport:'teamReport',tempDrivers:'tempDrivers',outage:'outage'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function css(){
 if(document.getElementById('kh-parity-v3-style'))return;
 const s=document.createElement('style');s.id='kh-parity-v3-style';
 s.textContent=`
 .kh-v3{direction:rtl;margin:0 0 18px}.kh-v3-head{display:flex;align-items:center;gap:8px;margin:2px 2px 10px}.kh-v3-head b{font-size:14px;font-weight:900}.kh-v3-tabs{display:flex;gap:6px;overflow:auto;padding:2px 1px 9px;scrollbar-width:none}.kh-v3-tabs::-webkit-scrollbar{display:none}.kh-v3-tab{white-space:nowrap;border:1px solid var(--line,#e4e9f2);background:#fff;color:var(--muted,#6b7890);border-radius:99px;padding:7px 11px;font:inherit;font-size:11px;font-weight:800;cursor:pointer}.kh-v3-tab.on{background:var(--brand,#0d7a5f);border-color:var(--brand,#0d7a5f);color:#fff}.kh-v3-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.kh-v3-card{min-height:68px;border:1px solid var(--line,#e4e9f2);border-radius:15px;background:#fff;display:flex;align-items:center;gap:9px;padding:11px;text-align:right;font:inherit;font-size:12px;font-weight:800;color:var(--ink,#172033);cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.035);transition:transform .12s,border-color .12s}.kh-v3-card:active{transform:scale(.985);border-color:var(--brand,#0d7a5f)}.kh-v3-icon{width:34px;height:34px;border-radius:11px;background:#f2f5f9;display:grid;place-items:center;font-size:19px;flex:0 0 auto}.kh-v3-card[data-cat="field"] .kh-v3-icon{background:#e9f7f0}.kh-v3-card[data-cat="work"] .kh-v3-icon{background:#fff3e6}.kh-v3-card[data-cat="messages"] .kh-v3-icon{background:#eef4ff}.kh-v3-card[data-cat="personal"] .kh-v3-icon{background:#fff7df}.kh-v3-empty{grid-column:1/-1;text-align:center;color:var(--muted,#6b7890);font-size:12px;padding:20px}.kh-v3-page{direction:rtl}.kh-v3-page>.card,.kh-v3-page>.item,.kh-v3-page>.kpi,.kh-v3-page>.notif{border-radius:15px}.kh-v3-page img,.kh-v3-page video{max-width:100%;height:auto;object-fit:contain}.kh-v3-page input,.kh-v3-page select,.kh-v3-page textarea,.kh-v3-page button{font-family:inherit}.kh-v3-camera-only{display:block;width:100%;margin-top:7px;border:1px solid var(--brand,#0d7a5f);border-radius:12px;background:#fff;color:var(--brand,#0d7a5f);padding:10px;font:inherit;font-weight:800;cursor:pointer}.kh-v3-camera-note{font-size:10px;color:var(--muted,#6b7890);margin-top:4px}.kh-v3-modal{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;padding:10px}.kh-v3-camera{width:min(100%,520px);max-height:94vh;background:#111;border-radius:16px;overflow:hidden;display:flex;flex-direction:column}.kh-v3-video{width:100%;aspect-ratio:3/4;object-fit:cover;background:#000}.kh-v3-actions{display:flex;gap:8px;padding:10px}.kh-v3-actions button{flex:1;border:0;border-radius:10px;padding:11px;font:inherit;font-weight:800}.kh-v3-cancel{background:#fff;color:#222}.kh-v3-shot{background:var(--brand,#0d7a5f);color:#fff}.kh-v3-preview{display:block;width:100%;height:auto;max-height:58vh;object-fit:contain;margin:auto}.kh-v3-embedded{margin-top:12px}.kh-v3-map{width:100%;height:240px;border:0;border-radius:13px;overflow:hidden;margin-top:9px}@media(max-width:380px){.kh-v3-grid{grid-template-columns:1fr}.kh-v3-card{min-height:62px}}
 `;document.head.appendChild(s);
}

function authenticated(){return !!(window.USER || localStorage.getItem('token') || localStorage.getItem('access') || localStorage.getItem('access_token'));}
function dashboard(){
 css();const body=document.getElementById('body');if(!body||!authenticated())return;
 const old=body.querySelector('#kh-parity,#kh-parity-v2');if(old)old.remove();
 const legacy=[...body.querySelectorAll('.item,[data-dashboard-card],.dashboard-grid .item')];
 if(!legacy.length && body.dataset.khV3Dashboard==='1')return;
 legacy.forEach(e=>{if(!e.closest('.kh-v3'))e.remove()});
 const root=document.createElement('section');root.id='kh-parity-v3';root.className='kh-v3';
 root.innerHTML='<div class="kh-v3-head"><b>امکانات خطیار</b></div><div class="kh-v3-tabs">'+TABS.map(t=>'<button type="button" class="kh-v3-tab" data-tab="'+t[0]+'">'+esc(t[1])+'</button>').join('')+'</div><div class="kh-v3-grid"></div>';
 body.appendChild(root);
 const grid=root.querySelector('.kh-v3-grid');let tab='all';
 function draw(){const rows=MENU.filter(x=>tab==='all'||x[3]===tab);grid.innerHTML=rows.length?rows.map(x=>'<button type="button" class="kh-v3-card" data-route="'+esc(x[2])+'" data-cat="'+x[3]+'"><span class="kh-v3-icon">'+x[0]+'</span><span>'+esc(x[1])+'</span></button>').join(''):'<div class="kh-v3-empty">موردی برای نمایش وجود ندارد.</div>';root.querySelectorAll('.kh-v3-tab').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));}
 root.addEventListener('click',e=>{const t=e.target.closest('[data-tab]');if(t){tab=t.dataset.tab;draw();return}const b=e.target.closest('[data-route]');if(b&&typeof window.nav==='function'){window.nav(ROUTE_ALIASES[b.dataset.route]||b.dataset.route)}});draw();body.dataset.khV3Dashboard='1';
}

function cameraOnly(){
 css();
 const inputs=[...document.querySelectorAll('input[type=file][accept*="image"],input[type=file][capture]')].filter(i=>/kh-f[12]/i.test(i.id||''));
 inputs.forEach(input=>{
  if(input.dataset.khV3Camera==='1')return;input.dataset.khV3Camera='1';input.removeAttribute('capture');input.setAttribute('accept','image/jpeg');input.style.display='none';
  const b=document.createElement('button');b.type='button';b.className='kh-v3-camera-only';b.textContent=/kh-f2/i.test(input.id)?'📷 گرفتن تصویر تابلو با دوربین':'📷 گرفتن تصویر محل با دوربین';
  const n=document.createElement('div');n.className='kh-v3-camera-note';n.textContent='این تصویر فقط از دوربین گوشی ثبت می‌شود و انتخاب از گالری مجاز نیست.';
  input.parentElement.appendChild(b);input.parentElement.appendChild(n);b.onclick=()=>openCamera(input);
 });
}
async function openCamera(input){
 if(!navigator.mediaDevices?.getUserMedia){alert('دوربین این مرورگر در دسترس نیست. از HTTPS و مرورگر به‌روز استفاده کنید.');return}
 const modal=document.createElement('div');modal.className='kh-v3-modal';modal.innerHTML='<div class="kh-v3-camera"><video class="kh-v3-video" autoplay playsinline muted></video><div class="kh-v3-actions"><button type="button" class="kh-v3-cancel">انصراف</button><button type="button" class="kh-v3-shot">گرفتن عکس</button></div></div>';document.body.appendChild(modal);const video=modal.querySelector('video');let stream=null;
 try{stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}});video.srcObject=stream;await video.play()}catch(e){modal.remove();alert('دسترسی دوربین برقرار نشد: '+(e?.message||'خطای ناشناخته'));return}
 const close=()=>{try{stream?.getTracks().forEach(t=>t.stop())}catch(_){}modal.remove()};modal.querySelector('.kh-v3-cancel').onclick=close;
 modal.querySelector('.kh-v3-shot').onclick=()=>{if(!video.videoWidth||!video.videoHeight)return;const max=1600,scale=Math.min(1,max/video.videoWidth),c=document.createElement('canvas');c.width=Math.round(video.videoWidth*scale);c.height=Math.round(video.videoHeight*scale);c.getContext('2d').drawImage(video,0,0,c.width,c.height);c.toBlob(blob=>{if(!blob){alert('ثبت تصویر انجام نشد');return}try{const file=new File([blob],'camera-'+Date.now()+'.jpg',{type:'image/jpeg'}),dt=new DataTransfer();dt.items.add(file);input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));close()}catch(e){alert('ارسال تصویر انجام نشد')}},'image/jpeg',.82)};
}

function previewGuard(){document.querySelectorAll('img,video').forEach(el=>{if(el.dataset.khV3Preview==='1')return;if(/selfie|station|preview|photo|kh-ls-photo/i.test((el.className||'')+' '+(el.alt||''))){el.dataset.khV3Preview='1';el.style.maxWidth='100%';el.style.width='100%';el.style.height='auto';el.style.maxHeight='58vh';el.style.objectFit='contain';el.style.display='block'}})}
function pageShell(){
 if(!authenticated())return;css();const body=document.getElementById('body');if(!body)return;
 const current=window.current||'';if(current==='dashboard')return;
 body.classList.add('kh-v3-page');
 body.querySelectorAll('.card,.item,.kpi,.notif').forEach(e=>e.classList.add('kh-v3-embedded'));
}
function scan(){try{if(authenticated())dashboard()}catch(_){}try{cameraOnly();previewGuard();pageShell()}catch(_){} }
const mo=new MutationObserver(()=>{clearTimeout(window.__khV3Timer);window.__khV3Timer=setTimeout(scan,80)});mo.observe(document.documentElement,{subtree:true,childList:true});document.addEventListener('DOMContentLoaded',scan);setTimeout(scan,400);setTimeout(scan,1200);setTimeout(scan,2500);
})();
