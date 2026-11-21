'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../app/assets/dashboard-no-charts.js'),'utf8');
let button=null, collapsed=false, css='';
const nav={textContent:'داشبورد مدیریت',classList:{contains:key=>key==='active'},getAttribute:()=>null,setAttribute(){}};
const panel={
  id:'',textContent:'وضعیت لحظه‌ای حضور: ۲۴ نفر',firstChild:null,attrs:{},
  classList:{add(){collapsed=true;},toggle(){collapsed=!collapsed;return collapsed;}},
  closest:()=>null,querySelector:()=>null,
  getAttribute(key){return this.attrs[key];},setAttribute(key,value){this.attrs[key]=value;},
  insertBefore(child){button=child;}
};
const heading={textContent:'وضعیت لحظه‌ای حضور',closest:()=>panel};
const doc={
  readyState:'complete',
  documentElement:{},
  body:{classList:{toggle(){}}},
  head:{appendChild(el){css=el.textContent;}},
  createElement(tag){return {tag,attrs:{},setAttribute(key,value){this.attrs[key]=value;},getAttribute(key){return this.attrs[key];}};},
  getElementById:()=>null,
  querySelectorAll(selector){
    if(selector==='h1,h2,h3,h4,h5,h6')return [heading];
    if(selector.startsWith('h1,h2,h3,h4,h5,h6,'))return [];
    return [nav];
  },
  addEventListener(){}
};
vm.runInNewContext(source,{document:doc,MutationObserver:class{observe(){}},setTimeout:()=>1});
assert.ok(button,'live-presence disclosure is created');
assert.equal(button.type,'button','native button supports keyboard activation');
assert.equal(button.getAttribute('aria-expanded'),'false');
assert.equal(button.getAttribute('aria-controls'),panel.id);
assert.equal(collapsed,true,'card starts collapsed');
assert.match(css,/min-height:44px/,'mobile touch target is at least 44 pixels');
assert.match(css,/:focus-visible/,'keyboard focus remains visible');
button.onclick();
assert.equal(collapsed,false);
assert.equal(button.getAttribute('aria-expanded'),'true');
button.onclick();
assert.equal(collapsed,true);
assert.equal(button.getAttribute('aria-expanded'),'false');
console.log('PASS live presence disclosure keyboard and ARIA behavior');
