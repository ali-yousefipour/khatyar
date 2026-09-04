/* خطیار — اتصال دکمه‌های درج تعطیلات رسمی به منبع مرجع واحد */
(function(){'use strict';
function token(){try{return localStorage.token||localStorage.access_token||localStorage.jwt||'';}catch(e){return '';}}
function norm(s){return String(s||'').replace(/[يى]/g,'ی').replace(/[ك]/g,'ک').replace(/[۰-۹]/g,function(d){return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d);}).replace(/[٠-٩]/g,function(d){return '٠١٢٣٤٥٦٧٨٩'.indexOf(d);}).replace(/\s+/g,' ').trim();}
function currentJalaliYear(){var d=new Date(),gy=d.getFullYear(),gm=d.getMonth()+1,gd=d.getDate(),jy=gy-621;if(gm<3||(gm===3&&gd<21))jy--;return jy;}
function yearFromButton(b){var t=norm(b.textContent||''),m=t.match(/(13\d{2}|14\d{2})/);return m?+m[1]:currentJalaliYear();}
function isSeedButton(b){var t=norm(b.textContent||'');return /درج تعطیلات رسمی/.test(t)&&(/سال جاری|۱۴۰۴|۱۴۰۵|1404|1405/.test(t));}
async function seed(b){var y=yearFromButton(b),h={'Accept':'application/json'},tok=token();if(tok)h.Authorization='Bearer '+tok;b.disabled=true;var old=b.innerHTML;b.innerHTML='در حال درج تعطیلات رسمی...';try{var r=await fetch('/api/admin-holiday-seed.php?year='+y,{method:'POST',credentials:'same-origin',headers:h,cache:'no-store'}),d=await r.json().catch(function(){return{};});if(!r.ok||!d.ok)throw new Error(d.error||('HTTP '+r.status));alert('سال '+y+' — '+d.total+' تعطیل رسمی\nجدید: '+d.inserted+'\nبه‌روزرسانی: '+d.updated+'\nموجود: '+d.existing);window.dispatchEvent(new CustomEvent('khatyar:calendar-refresh',{detail:{year:y}}));setTimeout(function(){location.reload();},150);}catch(e){alert(e.message||'درج تعطیلات رسمی ناموفق بود');}finally{b.disabled=false;b.innerHTML=old;}}
function bind(){document.querySelectorAll('button,a,[role="button"]').forEach(function(b){if(b.dataset.khHolidaySeedBound==='1'||!isSeedButton(b))return;b.dataset.khHolidaySeedBound='1';b.addEventListener('click',function(ev){ev.preventDefault();ev.stopImmediatePropagation();seed(b);},true);});}
var ob=new MutationObserver(bind);if(document.body)ob.observe(document.body,{childList:true,subtree:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
