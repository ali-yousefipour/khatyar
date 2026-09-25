/* خطیار — modern sidebar compatibility layer
 * Runs against both the current React panel and older cached panel markup.
 */
(function(){
  'use strict';
  var STYLE_ID='kh-modern-sidebar-style-v1';
  function installStyle(){
    if(document.getElementById(STYLE_ID)) return;
    var s=document.createElement('style'); s.id=STYLE_ID;
    s.textContent=
      '.side{background:linear-gradient(180deg,#10243a 0%,#0b1b2e 100%)!important;'+
      'border-left:1px solid rgba(255,255,255,.05);box-shadow:inset -1px 0 0 rgba(255,255,255,.04),-10px 0 30px rgba(15,29,51,.08)!important;}'+
      '.side .brand{min-height:58px;margin:4px 8px 14px;padding:8px 8px;border:1px solid rgba(255,255,255,.07);'+
      'border-radius:15px;background:rgba(255,255,255,.035);gap:11px;}'+
      '.side .brand span{font-size:13px;font-weight:800;color:#fff;}'+
      '.side .nav{gap:7px;padding:0 2px 6px;}'+
      '.side .navsec{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.035);border-radius:14px;}'+
      '.side .navsec-head{min-height:50px;padding:0 13px;color:#dbe5f2;font-size:12.5px;font-weight:800;}'+
      '.side .navsec-head:hover,.side .navsec.open .navsec-head{background:rgba(255,255,255,.075);color:#fff;}'+
      '.side .nav-chevron{color:#f7c531;}'+
      '.side .navsec-body{padding:0 6px;}'+
      '.side .navitem{min-height:48px;margin:3px 0;border-radius:11px;color:#afbdd1;padding:0 11px;gap:10px;}'+
      '.side .navitem:hover{background:rgba(255,255,255,.085);color:#fff;transform:translateX(-2px);}'+
      '.side .navitem.on{background:linear-gradient(90deg,rgba(14,138,106,.78),rgba(14,138,106,.16));color:#fff;font-weight:800;}'+
      '.side .navitem.on:before{width:4px;background:#f7c531;}'+
      '.side .ic,.side .ic img{width:24px!important;height:24px!important;}'+
      '.side .apibar{margin:8px 2px 0;padding:9px 8px;border:1px solid rgba(255,255,255,.06);'+
      'background:rgba(0,0,0,.18);border-radius:11px;color:#9fb0c8;}'+
      '#school-service-menu-item{background:linear-gradient(90deg,rgba(247,197,49,.13),rgba(247,197,49,.035));}'+
      '.school-service-navsec .navsec-head{color:#f7d66b;}';
    document.head.appendChild(s);
  }
  function normalizeVersion(){
    var health=window.__health;
    var version=(health&&health.site_version)?String(health.site_version):'1.5.0';
    document.querySelectorAll('.apibar').forEach(function(el){
      var nodes=el.querySelectorAll('*');
      var target=null;
      for(var i=0;i<nodes.length;i++){if((nodes[i].textContent||'').indexOf('نسخه')>=0){target=nodes[i];break;}}
      if(target && /نسخه/.test(target.textContent||'')){
        target.textContent='نسخهٔ سایت '+version+' · '+(health?'متصل به سرور':'در حال اتصال');
      }
    });
  }
  function apply(){
    installStyle();
    normalizeVersion();
    var side=document.querySelector('.side');
    if(side) side.setAttribute('data-modern-sidebar','1');
  }
  function start(){
    apply();
    var n=new MutationObserver(function(){apply();});
    n.observe(document.documentElement,{childList:true,subtree:true});
    [100,500,1200,2500].forEach(function(t){setTimeout(apply,t);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
