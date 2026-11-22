'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../app/assets/panel-long-operation-progress.js'),'utf8');
const scheduled=new Map();let nextTimer=0;
let resolveFetch;
function rawFetch(){return new Promise(resolve=>{resolveFetch=resolve;});}
class FakeXHR {
 constructor(){this.listeners={};}
 open(method,url){this.method=method;this.url=url;}
 send(){this.sent=true;}
 addEventListener(type,handler){this.listeners[type]=handler;}
 complete(){this.listeners.loadend?.();}
}
const win={
 URL,XMLHttpRequest:FakeXHR,
 location:{href:'https://khat-yar.ir/panel',origin:'https://khat-yar.ir'},
 setTimeout(fn,ms=0){const id=++nextTimer;scheduled.set(id,{fn,ms});return id;},
 clearTimeout(id){scheduled.delete(id);},
 fetch:rawFetch
};
// The panel runtime captures the original browser fetch before progress patch loads.
win.__KHATYAR_NATIVE_FETCH__=rawFetch.bind(win);
const nodes=new Map();
const element=tag=>{
 const obj={tagName:tag,isConnected:true,hidden:false,attrs:{},
 setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},
 querySelector(selector){if(!this.children)this.children=new Map();if(!this.children.has(selector))this.children.set(selector,element(selector));return this.children.get(selector);}
 };
 Object.defineProperty(obj,'id',{get(){return this._id;},set(v){this._id=v;nodes.set(v,this);}});
 return obj;
};
let mapMounted=false;
const doc={
 querySelector(selector){return selector==='.live-map-tabs'&&mapMounted?{}:null;},
 head:{appendChild(){}},body:{appendChild(el){el.isConnected=true;}},
 createElement:element,addEventListener(){},
 getElementById(id){return nodes.get(id)||null;},visibilityState:'visible'
};
vm.runInNewContext(source,{window:win,document:doc,URL,Promise});
const api=win.KhatyarLongOperation;
assert.ok(api,'progress manager registered');
const overlay=()=>nodes.get('kh-long-operation-progress');
const advanceShort=(time)=>{
 for(const [id,task] of [...scheduled]){
  if(task.ms<=time){scheduled.delete(id);task.fn();}
 }
};
for(const url of ['/api/admin/stats','/api/admin/dashboard-discipline?days=30',
 '/api/admin/dashboard','/api/admin/live-staff-dashboard','/api/admin/top-workers']){
 const result=api.classify(url);
 assert.equal(result.title,'در حال بارگذاری داشبورد');
 assert.equal(result.delay,0,'dashboard spinner must begin on first interaction');
}
assert.equal(api.classify('/api/admin/attendance-report').delay,0);
assert.equal(api.classify('/api/admin/shift-report').delay,0);
assert.equal(api.classify('/api/admin/shift-report/export').delay,0);
// Rapid location polling must never dim the map with the global modal.
for (const route of ['/api/admin/live','/api/admin/live-map','/api/admin/live/positions',
 '/api/admin/map/locations','/api/admin/locations','/api/location','/api/admin/staff-locations']) {
 assert.equal(api.classify(route),null,'live map must not trigger blocking progress: '+route);
}
assert.notEqual(api.classify('/api/admin/live-staff-dashboard'),null,'dashboard metrics retain progress');
assert.notEqual(api.classify('/api/admin/location-report'),null,'report export retains progress');
assert.equal(api.classify('/api/health'),null);
assert.equal(api.classify('https://different.invalid/api/admin/dashboard'),null);
assert.equal(api.classify('/api/admin/users',{method:'DELETE'}),null);
(async()=>{
 const xhr=new win.XMLHttpRequest();
 xhr.open('GET','/api/admin/shift-report/export');xhr.send();
 assert.equal(overlay().hidden,false,'slow XHR immediately displays reporting loader');
 xhr.complete();
 assert.equal(overlay().hidden,true,'XHR completion releases loader');
 const result=win.__KHATYAR_NATIVE_FETCH__('/api/admin/attendance-report?user_id=7');
 assert.equal(overlay().hidden,false,'captured authenticated native fetch is instrumented');
 let completeText;
 resolveFetch({
  ok:true,status:200,body:{},
  text:()=>new Promise(resolve=>{completeText=resolve;})
 });
 const response=await result;
 assert.equal(overlay().hidden,false,'HTTP headers alone do not close progress');
 const parse=response.text();
 assert.equal(overlay().hidden,false,'loader remains visible while response body is read');
 completeText('{"days":[]}');
 await parse;
 assert.equal(overlay().hidden,true,'body read completion closes progress');
 const d=win.fetch('/api/admin/top-workers');
 assert.equal(overlay().hidden,false,'normal fetch is still observed');
 resolveFetch({ok:true,status:204,body:null});
 await d;
 assert.equal(overlay().hidden,true,'no-body responses clear without a watchdog');
 // Requests and explicit progress must stay invisible on live map even if
 // they target a generally slow admin endpoint (initial view and 15s polling).
 mapMounted=true;
 assert.equal(api.classify('/api/admin/users'),null);
 assert.equal(api.classify('/api/admin/stats'),null);
 const quiet=win.fetch('/api/admin/stats');
 assert.equal(overlay().hidden,true,'background fetch on map never blocks the view');
 resolveFetch({ok:true,status:204,body:null});await quiet;
 const mapExplicit=api.begin('در حال دریافت اطلاعات',{delay:0,percent:50});
 assert.equal(overlay().hidden,true,'explicit loaders also hidden on live map');
 api.end(mapExplicit);
 mapMounted=false;
 const id=api.begin('گزارش ماهانه',{delay:0,percent:47});
 assert.equal(overlay().hidden,false,'explicit work begins on click');
 assert.equal(overlay().querySelector('progress').value,47);
 api.end(id);assert.equal(overlay().hidden,true);
 // Timer for untracked GETs must not trigger immediate display.
 const slow=win.fetch('/api/admin/users');
 assert.equal(overlay().hidden,true);
 advanceShort(600);
 assert.equal(overlay().hidden,false);
 resolveFetch({ok:true,status:204,body:null});
 await slow;
 assert.equal(overlay().hidden,true);
 assert.ok([...scheduled.values()].every(x=>x.ms<180000),'completed tasks free watchdog timers');
 console.log('PASS tracked native fetch, response-body lifetime, XHR, dashboard and report loaders');
})().catch(e=>{console.error(e);process.exitCode=1});
