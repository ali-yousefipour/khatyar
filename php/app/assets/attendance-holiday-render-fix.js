/* خطیار — تضمین نمایش تعطیلات رسمی ایران در گزارش تردد */
(function(){
'use strict';
var OFFICIAL={
 '1405/01/01':'آغاز نوروز','1405/01/02':'عید سعید فطر / نوروز','1405/01/03':'عید نوروز','1405/01/04':'عید نوروز','1405/01/12':'روز جمهوری اسلامی ایران','1405/01/13':'روز طبیعت','1405/01/25':'شهادت امام جعفر صادق (ع)',
 '1405/03/06':'عید سعید قربان','1405/03/14':'عید سعید غدیر خم','1405/03/15':'قیام ۱۵ خرداد','1405/04/03':'تاسوعای حسینی','1405/04/04':'عاشورای حسینی','1405/05/13':'اربعین حسینی','1405/05/21':'رحلت حضرت رسول اکرم (ص) و شهادت امام حسن مجتبی (ع)','1405/05/22':'شهادت امام رضا (ع)','1405/05/30':'شهادت امام حسن عسکری (ع) و آغاز امامت حضرت ولیعصر (عج)','1405/06/08':'ولادت حضرت رسول اکرم (ص) و ولادت امام جعفر صادق (ع)','1405/08/22':'شهادت حضرت فاطمه زهرا (س)','1405/10/02':'ولادت امام علی (ع) و روز پدر','1405/10/16':'مبعث حضرت رسول اکرم (ص)','1405/11/04':'ولادت حضرت قائم (عج) و نیمه شعبان','1405/11/22':'پیروزی انقلاب اسلامی ایران','1405/12/09':'شهادت حضرت علی (ع)','1405/12/19':'عید سعید فطر','1405/12/20':'تعطیل به مناسبت عید سعید فطر','1405/12/29':'روز ملی شدن صنعت نفت ایران'
};
function en(s){return String(s||'').replace(/[۰-۹]/g,function(d){return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d);}).replace(/-/g,'/');}
function isReport(t){return /حضور کل/.test(t.innerText||'');}
function fixTable(t){
 if(!isReport(t))return;
 Array.prototype.forEach.call(t.tBodies||[],function(tb){Array.prototype.forEach.call(tb.rows||[],function(r){
  if(!r.cells.length)return;
  var key=en(r.cells[0].textContent).replace(/\s/g,''),title=OFFICIAL[key];
  if(!title)return;
  var c=r.cells[7];
  if(c){
   if(c.textContent!=='تعطیل')c.textContent='تعطیل';
   if(c.title!==title)c.title=title;
   if(!c.classList.contains('kh-official-holiday'))c.classList.add('kh-official-holiday');
  }
  if(!r.classList.contains('kh-official-holiday-row'))r.classList.add('kh-official-holiday-row');
 });});
}
function fix(){Array.prototype.forEach.call(document.querySelectorAll('table'),fixTable);}
function start(){
 if(document.getElementById('kh-holiday-render-css'))return;
 var s=document.createElement('style');s.id='kh-holiday-render-css';s.textContent='.kh-official-holiday,.kh-official-holiday-row .kh-official-holiday{color:#d92d20!important;font-weight:900!important}.kh-official-holiday-row{background:#fff8f7!important}.kh-official-holiday-row:hover{background:#fff1f0!important}';document.head.appendChild(s);
 fix();
 var scheduled=false;
 function schedule(){if(scheduled)return;scheduled=true;setTimeout(function(){scheduled=false;fix();},60);}
 if(window.MutationObserver&&document.body)new MutationObserver(function(ms){
  for(var i=0;i<ms.length;i++){
   var m=ms[i];
   if(m.type==='childList'&&((m.addedNodes&&m.addedNodes.length)||(m.removedNodes&&m.removedNodes.length))){schedule();break;}
  }
 }).observe(document.body,{subtree:true,childList:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
