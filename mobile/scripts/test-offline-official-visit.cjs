'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname,'../src/offline.js'),'utf8');
const text = src.replace(/^import .*;\s*$/gm,'').replace(/\bexport (?=(async )?function )/g,'');
const storage = new Map();
const photos = new Map();
let owner = {id:41};
const AsyncStorage = {
  async getItem(k) { return storage.get(k) || null; },
  async setItem(k,v) { storage.set(k,v); },
  async removeItem(k) { storage.delete(k); },
};
const FileSystem = {
  documentDirectory:'file:///verified/',
  EncodingType:{Base64:'base64'},
  async writeAsStringAsync(u,s) { photos.set(u,s); },
  async deleteAsync(u) { photos.delete(u); },
};
const Network = {async getNetworkStateAsync(){return {isConnected:true,isInternetReachable:true}}};
const context = vm.createContext({AsyncStorage,FileSystem,Network,readVerifiedUser:async()=>owner,Date,Math,
  JSON,Set,String,Number,Promise,Error,console});
vm.runInContext(text+'\nthis.api={enqueue,pending,flush,retryOne,removeSynced}',context);
const api=context.api;
(async()=>{
  const photo='data:image/jpeg;base64,'+'X'.repeat(320000);
  const key='visit-41';
  await api.enqueue({path:'/official-visits',client_uuid:key,method:'POST',body:{
    client_uuid:key,official_id:12,line_id:501,note:'Test visit',photo_data:photo
  }});
  let rows=await api.pending();
  assert.equal(rows.length,1);
  assert.equal(rows[0].owner_user_id,41);
  assert.equal(rows[0].body.photo_data,null);
  assert.ok(photos.has(rows[0].body.photo_file_uri));
  assert.ok(!storage.get('offline_queue_v2').includes('X'.repeat(10000)));
  await api.enqueue({path:'/official-visits',client_uuid:key,body:{note:'duplicate'}});
  assert.equal((await api.pending()).length,1,'same UUID is idempotent in device queue');
  owner={id:55};
  let calls=0;
  assert.equal(await api.flush(async()=>{calls++;return {ok:true}}),0);
  assert.equal(calls,0,'another user must never send this visit');
  owner={id:41};
  assert.equal(await api.flush(async()=>{calls++;throw new Error('network offline')}),0);
  assert.equal((await api.pending()).length,1,'failed visit remains in queue');
  assert.equal(await api.flush(async()=>{calls++;return {ok:true}},{force:true}),1);
  assert.equal((await api.pending()).length,0);
  assert.equal(photos.size,0,'confirmed send cleans up the preserved photo');
  const attachment='data:image/png;base64,'+'A'.repeat(180000);
  await api.enqueue({path:'/reports',client_uuid:'nested',body:{
    subject:'offline report',attachments:[attachment],signature:attachment
  }});
  rows=await api.pending();
  const nested=rows.find(x=>x.client_uuid==='nested');
  assert.ok(nested.body.attachments[0].__khatyar_offline_asset);
  assert.ok(nested.body.signature.__khatyar_offline_asset);
  assert.ok(photos.size===2,'nested image assets are persisted outside AsyncStorage');
  assert.ok(!storage.get('offline_queue_v2').includes('A'.repeat(10000)));
  await api.retryOne('nested',async()=>({ok:true}));
  assert.equal(photos.size,0,'all nested files are cleaned after successful send');
  await Promise.all([api.enqueue({path:'/api/one',client_uuid:'a'}),api.enqueue({path:'/api/two',client_uuid:'b'})]);
  assert.equal((await api.pending()).length,2,'concurrent writes must not overwrite each other');
  storage.set('offline_queue_v2',JSON.stringify([{path:'/official-visits',client_uuid:'legacy',owner_user_id:null,body:{note:'old'}}]));
  calls=0;
  assert.equal(await api.flush(async()=>{calls++;return {ok:true}},{force:true}),0);
  assert.equal(calls,0,'unowned legacy operations must not replay automatically under the wrong account');
  assert.equal((await api.pending()).length,1,'legacy evidence is retained for explicit manual review');
  await assert.rejects(api.retryOne('legacy',async()=>({ok:true})),/حساب دیگری|ورود شما تأیید نشده/);
  assert.equal((await api.pending()).length,1,'Unowned evidence must remain pending rather than be sent by another account');
  const list=fs.readFileSync(path.join(__dirname,'../src/screens/SendQueueScreen.js'),'utf8');
  assert.match(list,/official-visits/,'Official visits must appear in the visible queue');
  assert.match(list,/confirmRetry\(item\)/,'Legacy replay must require explicit user confirmation');
  const official=fs.readFileSync(path.join(__dirname,'../src/screens/OfficialPresenceScreen.js'),'utf8');
  assert.match(official,/@khatyar:official-presence:reference:v1:/,'Reference cache must be scoped to user');
  assert.match(official,/reqPhoto \|\| usingOfflineSnapshot/,'Offline photo policy must fail safely');
  const routes=fs.readFileSync(path.join(__dirname,'../../php/lib/routes.php'),'utf8');
  const officialRoute=routes.slice(routes.indexOf("route('POST', '/api/official-visits'"),routes.indexOf("route('GET', '/api/official-visits/summary'"));
  assert.ok(officialRoute.indexOf("if($clientUuid!=='')")<officialRoute.indexOf('official_visit_daily_max'),
    'Duplicate replay must be detected before daily rate limits');
  assert.match(officialRoute,/u\.is_active=1|is_active=1/,'Inactive officials must be rejected');
  assert.match(officialRoute,/in_array\(\$selectedLineId/,'Offline lines must be revalidated');
  const reportRoute=routes.slice(routes.indexOf("route('POST', '/api/reports'"),routes.indexOf("route('GET', '/api/my/reports'"));
  assert.ok(reportRoute.includes("Only de-duplicate payloads") || reportRoute.includes("client_uuid"),
    'Report replay must have an idempotency path');
  const sourceApi=fs.readFileSync(path.join(__dirname,'../src/api.js'),'utf8');
  assert.match(sourceApi,/restoreEmbeddedQueueAssets/,'Nested media must be restored before replay');
  // A manual attendance selfie is a large inline base64 field, NOT the
  // official visit photo_data field. Its bytes must persist outside AsyncStorage.
  const manualPhoto='data:image/jpeg;base64,'+'M'.repeat(190000);
  await api.enqueue({path:'/my/requests',client_uuid:'manual-41',method:'POST',body:{
    type:'manual',manual_kind:'in',the_date:'1405-08-24',
    in_time:'08:00',client_uuid:'manual-41',selfie_data:manualPhoto
  }});
  rows=await api.pending();
  assert.equal(rows.length,1);
  assert.ok(rows[0].body.selfie_data.__khatyar_offline_asset,'Manual selfie must be preserved as an app-private file');
  assert.ok(photos.size===1,'One permanent selfie asset is expected');
  assert.ok(!storage.get('offline_queue_v2').includes('M'.repeat(10000)),'Large selfie must never be stored directly in AsyncStorage');
  await api.retryOne('manual-41',async item=>{assert.equal(item.path,'/my/requests');return{id:55,ok:true};});
  assert.equal((await api.pending()).length,0,'Confirmed manual request must leave offline queue');
  assert.equal(photos.size,0,'Selfie file must be deleted only after confirmed delivery');
  const broken='[broken-json';
  storage.set('offline_queue_v2',broken);
  await assert.rejects(api.pending(),/صف آفلاین/);
  assert.equal(storage.get('offline_queue_v2'),broken,'corruption must not silently delete user evidence');
  console.log('PASS offline queue: persistent photo, owner isolation, replay retry, concurrent records and corruption safety');
})().catch(e=>{console.error(e);process.exitCode=1});
