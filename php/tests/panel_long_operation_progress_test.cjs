'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../app/assets/panel-long-operation-progress.js'), 'utf8');
let completion;
let timerId = 0;
const scheduled = new Map();
class FakeXHR {
  constructor(){this.listeners={};}
  open(method,url){this.method=method;this.url=url;}
  send(){this.sent=true;}
  addEventListener(type,handler){this.listeners[type]=handler;}
  complete(){if(this.listeners.loadend)this.listeners.loadend();}
}
const windowMock = {
  URL, XMLHttpRequest: FakeXHR,
  location: {href:'https://khat-yar.ir/panel',origin:'https://khat-yar.ir'},
  setTimeout(fn){const id=++timerId;scheduled.set(id,fn);return id;},
  clearTimeout(id){scheduled.delete(id);},
  fetch: () => new Promise(resolve => { completion=resolve; })
};
const nodes = new Map();
const element = tag => {
  const obj={tagName:tag,isConnected:true,hidden:false,attrs:{},style:{},
    setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},
    querySelector(selector){if(!this.children)this.children=new Map();if(!this.children.has(selector))this.children.set(selector,element(selector));return this.children.get(selector);}
  };
  Object.defineProperty(obj,'id',{get(){return this._id;},set(v){this._id=v;nodes.set(v,this);}});
  return obj;
};
const doc={
  head:{appendChild(){}},body:{appendChild(el){el.isConnected=true;}},
  createElement:element,addEventListener(){},
  getElementById(id){return nodes.get(id)||null;},
  visibilityState:'visible'
};
vm.runInNewContext(source,{window:windowMock,document:doc,URL,Promise});
const api=windowMock.KhatyarLongOperation;
assert.ok(api);
assert.ok(api.classify('/api/admin/shift-report/export'));
assert.ok(api.classify('/api/admin/users'));
for(const endpoint of ['/api/admin/stats','/api/admin/dashboard-discipline?days=30','/api/admin/dashboard','/api/admin/live-staff-dashboard','/api/admin/top-workers']){
  const dashboard=api.classify(endpoint);
  assert.equal(dashboard.title,'در حال بارگذاری داشبورد','dashboard API has specific feedback');
  assert.equal(dashboard.delay,350,'dashboard cards and tabs have shorter feedback delay');
}
assert.equal(api.classify('/api/admin/stats',{method:'POST'}),null,'dashboard writes must not trigger read loading');
assert.equal(api.classify('https://external.example/api/admin/dashboard'),null,'dashboard loading ignores external origins');
assert.ok(api.classify('/api/admin/complaints/report',{method:'POST'}));
assert.equal(api.classify('/api/health'),null);
assert.equal(api.classify('/api/admin/users',{method:'DELETE'}),null);
assert.equal(api.classify('https://evil.example/api/admin/users'),null);
assert.equal(api.classify('/assets/logo.png'),null);
const xhr=new windowMock.XMLHttpRequest();
xhr.open('GET','/api/admin/shift-report/export');
xhr.send();
for(const fn of [...scheduled.values()])fn();
assert.equal(nodes.get('kh-long-operation-progress').hidden,false,'slow XHR must show shared progress');
xhr.complete();
assert.equal(nodes.get('kh-long-operation-progress').hidden,true,'completed XHR must clear its progress');
const request=windowMock.fetch('/api/admin/users');
const overlay=nodes.get('kh-long-operation-progress');
assert.ok(!overlay || overlay.hidden,'fast requests should not open progress immediately');
for(const fn of [...scheduled.values()])fn();
assert.equal(nodes.get('kh-long-operation-progress').hidden,false,'slow API should show progress');
completion({ok:true});
request.then(response=>{
  assert.equal(response.ok,true);
  assert.equal(nodes.get('kh-long-operation-progress').hidden,true);
  const id=api.begin('Preparing spreadsheet',{delay:0,percent:47});
  for(const fn of [...scheduled.values()])fn();
  assert.equal(nodes.get('kh-long-operation-progress').querySelector('progress').value,47);
  api.end(id);
  assert.equal(nodes.get('kh-long-operation-progress').hidden,true);
  console.log('shared progress regression passed');
}).catch(err=>{console.error(err);process.exitCode=1;});
