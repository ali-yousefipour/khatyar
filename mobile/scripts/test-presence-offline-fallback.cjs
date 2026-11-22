'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/api.js'),'utf8');
const start=source.indexOf('function isTransientPresenceDeliveryFailure(');
const end=source.indexOf('// Avoid sending duplicate concurrent presence GETs',start);
assert.ok(start>0&&end>start,'presence fallback and request implementation exist');
const code=source.slice(start,end);
const state={connected:true,response:null,error:null,writeFails:false,requests:[],queue:new Map(),fetches:0};
const context={
  Date,JSON,Math,Number,String,Object,Promise,
  attendanceMutationEpoch:{current:0},userCacheEpoch:0,accessToken:'fixture-access-token',
  setLastApi:()=>{},apiBase:()=> 'https://example.invalid/api',
  CACHE_MAX_AGE_MS:600000,memCache:{},pendingCacheWrites:new Set(),
  isAttendanceRead:()=>false,refreshAccess:async()=>false,
  Network:{getNetworkStateAsync:async()=>({isConnected:state.connected,isInternetReachable:state.connected})},
  enqueue:async item=>{if(state.writeFails)throw Error('ذخیره صف آفلاین ناموفق بود');state.queue.set(item.client_uuid,item);},
  AsyncStorage:{getItem:async()=>null,setItem:async()=>{}},
  fetchTimeout:async()=>{state.fetches++;if(state.error)throw state.error;return {status:state.response.status,ok:state.response.status<400,text:async()=>state.response.raw===undefined?JSON.stringify(state.response.body||{}):state.response.raw}},
  request:async()=>{throw new Error('unwanted recursive request')}
};
vm.createContext(context);
vm.runInContext(code+'\nthis.testApi={requestImpl,isTransientPresenceDeliveryFailure}',context);
const req=(path='/my/presence-check',extra={})=>context.testApi.requestImpl(path,{method:'POST',body:{client_uuid:'presence_7_local_77',slot:'12:30',selfie:'data:image/jpeg;base64,abc',vehicles_photo:'data:image/jpeg;base64,def'},noStore:true,queueIfOffline:true,...extra});
async function main(){
 state.connected=false;
 let r=await req();assert.equal(r.queued,true);assert.equal(state.fetches,0,'offline request must never start network upload');assert.equal(state.queue.size,1);
 state.queue.clear();state.connected=true;state.response={status:503,body:{error:'خطای داخلی سرور'}};r=await req();assert.equal(r.queued,true,'HTTP 503 goes to queue');assert.equal(state.queue.size,1,'one durable queue entry');
 state.queue.clear();state.response={status:500,raw:'<html>gateway failure</html>'};r=await req();assert.equal(r.queued,true,'invalid 5xx body still queues');
 state.queue.clear();state.error=new Error('no route to host');r=await req();assert.equal(r.queued,true,'transport exception queues even when network checker says online');
 state.error=null;state.response={status:422,body:{error:'عکس معتبر نیست'}};state.queue.clear();await assert.rejects(req(),/عکس معتبر نیست/);assert.equal(state.queue.size,0,'validation failures never queue');
 state.response={status:401,body:{error:'نشست منقضی'}};await assert.rejects(req(),/نشست منقضی/);assert.equal(state.queue.size,0,'authorization failures never queue');
 state.response={status:503,body:{error:'server busy'}};await assert.rejects(req('/my/requests'),/server busy/);assert.equal(state.queue.size,0,'other APIs keep their existing policy');
 for(const status of [408,429,500,503]){
   state.queue.clear();
   state.response={status,body:{error:'temporary error'}};
   const attendance=await req('/my/checkin');
   assert.equal(attendance.queued,true,'attendance HTTP '+status+' is durably queued');
   assert.equal(state.queue.get('presence_7_local_77').body.client_uuid,'presence_7_local_77','original UUID preserved');
 }
 for(const status of [401,403,422]){
   state.queue.clear();
   state.response={status,body:{error:'permanent error'}};
   await assert.rejects(req('/my/checkout'),/permanent error/);
   assert.equal(state.queue.size,0,'attendance HTTP '+status+' must not be queued');
 }
 state.queue.clear();state.error=new Error('connection reset');state.response=null;
 assert.equal((await req('/my/checkout')).queued,true,'ambiguous checkout transport error is queued');
 state.error=null;state.queue.clear();state.response={status:503,body:{error:'server busy'}};

 await assert.rejects(req('/my/presence-check',{queueIfOffline:false,forceNetwork:true}),/server busy/);assert.equal(state.queue.size,0,'sync replay never queues itself again');
 state.writeFails=true;await assert.rejects(req(),/ذخیره صف آفلاین ناموفق بود/);state.writeFails=false;assert.equal(state.queue.size,0,'failure to persist must not be acknowledged as queued');
 state.response={status:200,body:{ok:true,id:123}};r=await req();assert.equal(r.id,123);assert.equal(state.queue.size,0,'successful server receipt is not queued');
 state.response={status:503,body:{error:'temporarily unavailable'}};await req();await req();assert.equal(state.queue.size,1,'stable UUID prevents duplicate queue records after retry');
 const wizard=fs.readFileSync(path.join(__dirname,'../src/PresenceCheckWizard.js'),'utf8');
 assert.match(wizard,/captureTimeRef\.current/,'original capture timestamp reused across retries');
 assert.match(wizard,/return true;\s*}\s*catch\(e\)/,'success acknowledges durable queue completion');
 assert.match(wizard,/markLocalPresenceCompleted\([\s\S]*?\)\.catch\(\(\)=>\{\}\)/,'secondary completion storage cannot fail the wizard after queue persisted');
 console.log('PASS presence offline delivery: offline, 500/503, timeouts, 401/422, queue failures, replay and idempotence');
}
main().catch(e=>{console.error(e);process.exitCode=1});
