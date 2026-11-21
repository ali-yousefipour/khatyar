'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/offline.js'),'utf8').replace(/^import .*;\s*$/gm,'').replace(/\bexport\s+/g,'');
const store=new Map(),files=new Map();
const FileSystem={
 documentDirectory:'file:///document/',
 EncodingType:{Base64:'base64'},
 writeAsStringAsync:async(uri,data)=>files.set(uri,data),
 deleteAsync:async(uri)=>files.delete(uri),
};
const AsyncStorage={
 getItem:async key=>store.get(key)||null,
 setItem:async(key,value)=>store.set(key,value),
 removeItem:async key=>store.delete(key)
};
const context={AsyncStorage,FileSystem,Network:{getNetworkStateAsync:async()=>({isConnected:true,isInternetReachable:true})},readVerifiedUser:async()=>({id:7}),Date,Math,Promise};
vm.createContext(context);
vm.runInContext(source+'\nthis.queue={enqueue,pending,flush};',context);
const PHOTO='data:image/jpeg;base64,'+'A'.repeat(10000);
const PHOTO2='data:image/jpeg;base64,'+'B'.repeat(11000);
async function main(){
 const record={path:'/my/presence-check',method:'POST',client_uuid:'presence_7_local_test',body:{slot:'19:25',selfie:PHOTO,vehicles_photo:PHOTO2,request_id:'local_test',captured_at:'2026-11-21T15:55:00.000Z'}};
 await context.queue.enqueue(record);
 let pending=await context.queue.pending();assert.equal(pending.length,1);
 const body=pending[0].body;
 assert.match(body.selfie.__khatyar_offline_asset,/offline-asset-presence_7_local_test-1\.jpeg$/);
 assert.match(body.vehicles_photo.__khatyar_offline_asset,/offline-asset-presence_7_local_test-2\.jpeg$/);
 assert.equal(files.size,2,'both photos must be persisted separately before acknowledging queue');
 assert.ok(!store.get('offline_queue_v2').includes('A'.repeat(100)),'large image base64 never stored in AsyncStorage');
 assert.equal(files.get(body.selfie.__khatyar_offline_asset),'A'.repeat(10000));
 assert.equal(files.get(body.vehicles_photo.__khatyar_offline_asset),'B'.repeat(11000));
 await context.queue.enqueue(record);
 assert.equal((await context.queue.pending()).length,1,'repeat with same UUID must not overwrite queued photos');
 const first=await context.queue.flush(async()=>{throw Object.assign(new Error('سرور پاسخ نمی‌دهد'),{status:503})},{force:true});
 assert.equal(first,0);
 assert.equal((await context.queue.pending()).length,1,'server 503 retains queued verification');
 assert.equal(files.size,2,'failed upload must not delete captured photos');
 let attempts=0;
 const second=await context.queue.flush(async()=>{attempts++;return {ok:true,id:22}},{force:true});
 assert.equal(second,1);assert.equal(attempts,1);
 assert.equal((await context.queue.pending()).length,0,'confirmed upload removes pending queue record');
 assert.equal(files.size,0,'confirmed upload cleans both local copies');
 console.log('PASS presence offline photos: durable two-image storage, retry on 503, deduplication and cleanup after server receipt');
}
main().catch(e=>{console.error(e);process.exitCode=1});
