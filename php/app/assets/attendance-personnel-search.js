/* گزارش تردد پرسنل — جستجوی نام/نام خانوادگی با حفظ انتخاب و رندرهای داینامیک */
(function(){
'use strict';
var MARK='data-kh-personnel-search',INPUT='kh-personnel-search-input';
function norm(v){return String(v==null?'':v).replace(/[يى]/g,'ی').replace(/[ك]/g,'ک').replace(/[ۀة]/g,'ه').replace(/[\u200c\u200e\u200f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();}
function context(el){var p=el.parentElement;for(var i=0;p&&i<7;i++,p=p.parentElement){var t=norm(p.textContent);if(/تردد|گزارش حضور|گزارش ورود|گزارش خروج|شیفت و کارکرد/.test(t))return true;}return false;}
function looks(select){if(!select||select.getAttribute(MARK)==='1'||!context(select))return false;var opts=[...select.options];if(opts.length<2)return false;var parent=norm(select.parentElement&&select.parentElement.textContent);var sample=norm(opts.slice(0,10).map(o=>o.textContent).join(' '));return /پرسنل|کارمند|نام و نام خانوادگی|انتخاب شخص|افراد|کاربر/.test(parent)||/پرسنل|نام و نام خانوادگی|کارمند/.test(sample);}
function make(select){select.setAttribute(MARK,'1');var wrap=document.createElement('div');wrap.className='kh-personnel-search-wrap';wrap.dir='rtl';wrap.style.cssText='margin:0 0 8px;width:100%;';var input=document.createElement('input');input.type='search';input.className=INPUT;input.placeholder='جستجوی نام یا نام خانوادگی...';input.setAttribute('aria-label','جستجوی پرسنل');input.autocomplete='off';input.style.cssText='width:100%;box-sizing:border-box;border:1px solid #d0d5dd;border-radius:8px;padding:8px 10px;font:inherit;direction:rtl;background:#fff;';wrap.appendChild(input);select.parentNode.insertBefore(wrap,select);
function filter(){var q=norm(input.value);[...select.options].forEach(function(o){o.hidden=!!q&&!norm(o.textContent).includes(q);});}
input.addEventListener('input',filter);input.addEventListener('search',filter);var ob=new MutationObserver(function(){filter();});ob.observe(select,{childList:true,subtree:true});filter();}
function enhance(){document.querySelectorAll('select').forEach(function(s){if(looks(s))make(s);});}
function start(){enhance();var ob=new MutationObserver(enhance);if(document.body)ob.observe(document.body,{childList:true,subtree:true});[500,1500,3000].forEach(function(t){setTimeout(enhance,t);});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
