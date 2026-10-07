(function(){
'use strict';
const STYLE_ID='khc-tabs-runtime-v258';
function install(){
 if(!document.getElementById(STYLE_ID)){
  const s=document.createElement('style');s.id=STYLE_ID;s.textContent=
   '#khComplaints .khcLayout{display:block!important;width:100%!important;min-height:100%!important}'+
   '#khComplaints .khcSide{display:none!important}'+
   '#khComplaints .khcMain{width:100%!important;min-width:0!important}'+
   '#khComplaints .khcBody{width:100%!important;max-width:1420px!important;margin:0 auto!important}'+
   '#khComplaints .khcTabs{display:flex!important;flex-direction:row!important;flex-wrap:wrap!important;gap:8px!important}';
  document.head.appendChild(s);
 }
 const root=document.getElementById('khComplaints');
 if(!root)return false;
 const side=root.querySelector('.khcSide');
 const main=root.querySelector('.khcMain');
 const tabs=side&&side.querySelector('.khcTabs');
 const body=main&&main.querySelector('.khcBody');
 if(tabs&&body&&tabs.parentElement!==body){
   body.insertBefore(tabs,body.firstChild);
 }
 return true;
}
let n=0;
const run=()=>{install();if(++n<120)setTimeout(run,250)};
run();
})();