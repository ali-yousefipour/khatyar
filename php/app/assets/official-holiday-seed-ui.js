/* خطیار — بررسی و جایگزینی تعطیلات رسمی سال جاری */
(function(){
'use strict';
function token(){try{return localStorage.token||localStorage.access_token||localStorage.jwt||'';}catch(e){return '';}}
function currentJalaliYear(){var d=new Date(),gy=d.getFullYear(),gm=d.getMonth()+1,gd=d.getDate(),jy=gy-621;if(gm<3||(gm===3&&gd<21))jy--;return jy;}
function isOldSeedButton(b){var t=String(b.textContent||'').replace(/\s+/g,' ').trim();return /درج تعطیلات رسمی/.test(t)||(/سال جاری/.test(t)&&/تعطیلات/.test(t));}
function holidayContainer(){
 var nodes=document.querySelectorAll('p,div,section,article');
 for(var i=0;i<nodes.length;i++){
  var t=String(nodes[i].textContent||'').replace(/\s+/g,' ').trim();
  if(/روزهای تعطیل رسمی برای محاسبه/.test(t)&&/افزودن دستی تعطیلی/.test(t)&&nodes[i].querySelector('button, a, [role="button"]'))return nodes[i];
 }
 return null;
}
function removeOldButtons(root){
 if(!root)return;
 root.querySelectorAll('button,a,[role="button"]').forEach(function(b){if(isOldSeedButton(b)&&b.id!=='kh-official-holiday-check-btn')b.remove();});
}
function createButton(){
 if(document.getElementById('kh-official-holiday-check-btn'))return;
 var root=holidayContainer();
 if(!root)return;
 removeOldButtons(root);
 var host=document.createElement('div');host.id='kh-official-holiday-action';host.style.cssText='display:flex;justify-content:flex-start;align-items:center;gap:8px;margin:10px 0;';
 var b=document.createElement('button');b.type='button';b.id='kh-official-holiday-check-btn';b.className='btn btn-primary';b.textContent='بررسی و اضافه نمودن تعطیلات رسمی';
 b.addEventListener('click',function(){seed(b);});host.appendChild(b);
 var labels=root.querySelectorAll('h1,h2,h3,h4,h5,h6,p,div,span,strong,label');
 var anchor=null;
 for(var i=0;i<labels.length;i++){
  var t=String(labels[i].textContent||'').replace(/\s+/g,' ').trim();
  if(t==='افزودن دستی تعطیلی'){anchor=labels[i];break;}
 }
 if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(host,anchor);else root.appendChild(host);
}
async function seed(b){
 var y=currentJalaliYear(),h={'Accept':'application/json'},tok=token();
 if(tok)h.Authorization='Bearer '+tok;
 b.disabled=true;var old=b.innerHTML;b.innerHTML='در حال بررسی و جایگزینی تعطیلات رسمی...';
 try{
  var r=await fetch('/api/admin-holiday-seed.php?year='+y,{method:'POST',credentials:'same-origin',headers:h,cache:'no-store'}),d=await r.json().catch(function(){return{};});
  if(!r.ok||!d.ok)throw new Error(d.error||('HTTP '+r.status));
  alert('تعطیلات رسمی سال '+y+' با موفقیت بررسی و جایگزین شد.\nتعداد تعطیلات رسمی: '+d.total);
  window.dispatchEvent(new CustomEvent('khatyar:calendar-refresh',{detail:{year:y}}));
  setTimeout(function(){location.reload();},150);
 }catch(e){alert(e.message||'بررسی و جایگزینی تعطیلات رسمی ناموفق بود');}
 finally{b.disabled=false;b.innerHTML=old;}
}
function bind(){createButton();}
var ob=new MutationObserver(function(){bind();});
if(document.body)ob.observe(document.body,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
