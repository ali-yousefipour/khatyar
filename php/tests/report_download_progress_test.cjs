'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../tools/panel_source.jsx'),'utf8');
const start=source.indexOf('async function downloadProtectedFile(');
const end=source.indexOf('\nfunction exportXlsx(',start);
assert.ok(start>0&&end>start,'canonical download helper must be present');
let resolveBlob;
const calls=[],links=[],revoked=[];
const progress={begin(...args){calls.push(['begin',...args]);return 42;},end(id){calls.push(['end',id]);}};
const context={
  API_BASE:'/api',tok:()=>({'Authorization':'Bearer test-token'}),
  window:{KhatyarLongOperation:progress},
  fetch:async()=>({ok:true,blob:()=>new Promise(resolve=>{resolveBlob=resolve;})}),
  URL:{createObjectURL:()=> 'blob:download',revokeObjectURL:value=>revoked.push(value)},
  document:{body:{appendChild(a){links.push(a);}},createElement(){return {click(){this.clicked=true;},remove(){}};}},
  setTimeout(){},Error
};
vm.runInNewContext(source.slice(start,end)+'\nthis.downloadProtectedFile=downloadProtectedFile;',context);
(async()=>{
 const action=context.downloadProtectedFile('/admin/work-report/export','work.xlsx');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(calls.length,1,'progress must remain active while the file body is loading');
 resolveBlob({size:4});await action;
 assert.deepEqual(calls.map(item=>item[0]),['begin','end']);
 assert.equal(links[0].download,'work.xlsx');
 assert.equal(links[0].clicked,true);
 console.log('protected report download progress regression passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
