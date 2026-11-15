'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const auth=read('mobile/src/auth.js');
const permissions=read('mobile/src/PermissionGuard.js');
const api=read('mobile/src/api.js');
const access=read('mobile/src/accessCache.js');
const school=read('mobile/src/schoolServiceCache.js');
const drawer=read('mobile/src/DrawerMenuScreen.js');
assert.match(auth,/if\(cached\)\{[^\n]+beginActivity\(\)/,'verified offline login must restart device services');
assert.match(auth,/if\(st==='active'\)\{if\(user\?\.id\)\{/,'logged-out users must not poll notifications');
assert.doesNotMatch(permissions,/return check\(\)/,'nested permission check cannot run before inFlight guard releases');
assert.match(permissions,/setTimeout\(\(\)=>\{if\(mounted\.current\)check\(\);\},0\)/,'permission grant must continue checking after inFlight unlock');
assert.match(api,/!!options\.noStore,!!options\.forceNetwork/,'requests with different freshness policies cannot share in-flight responses');
assert.match(api,/export async function clearUserScopedApiCache/,'private HTTP caches must be reset');
assert.match(api,/if\(upper==='GET'&&!noStore&&readEpoch===userCacheEpoch\)/,'stale previous-account responses must not overwrite current cache');
assert.match(api,/if\(upper==='GET'&&!noStore&&readEpoch===userCacheEpoch\)\{if\(memCache\[cacheKey\]/,'stale previous-account requests must not read the next user\'s fallback cache');
assert.equal((auth.match(/await resetAccountCaches\(\);await setTokens/g)||[]).length,3,'all three login methods must reset user-scoped caches');
assert.match(access,/if\(epoch!==cacheEpoch\)return null/,'late access responses are discarded');
assert.match(school,/if\(epoch!==cacheEpoch\)return null/,'late school bootstrap responses are discarded');
assert.match(drawer,/photoActions: \{[^\n]+flexWrap: 'wrap'/,'photo modal actions wrap on small screens');
const source=read('mobile/src/profilePhotoCache.js');
const compiled=source.replace(/^import .*;\r?\n/gm,'').replace(/export (async function|function)/g,'$1')+'\nObject.assign(exports,{cacheProfilePhoto,readProfilePhotoCache});';
const store=new Map(),files=new Map(),deleted=[];
let failDownload=false;
const storage={
  getItem:async k=>store.has(k)?store.get(k):null,
  setItem:async(k,v)=>{store.set(k,v);},
};
const fileSystem={
  documentDirectory:'file:///documents/',
  EncodingType:{Base64:'base64'},
  getInfoAsync:async uri=>({exists:files.has(uri),size:files.get(uri)?.length||0}),
  downloadAsync:async(url,target)=>{if(failDownload)return{status:503};files.set(target,url);return{status:200};},
  writeAsStringAsync:async(uri,b64)=>{files.set(uri,b64);},
  moveAsync:async({from,to})=>{files.set(to,files.get(from));files.delete(from);},
  deleteAsync:async uri=>{deleted.push(uri);files.delete(uri);},
};
const sandboxExports={};
const modules={
  '@react-native-async-storage/async-storage':{__esModule:true,default:storage},
  'expo-file-system/legacy':fileSystem,
  './api':{imageSource:source=>({uri:source})}
};
vm.runInNewContext(compiled,{exports:sandboxExports,FileSystem:fileSystem,AsyncStorage:storage,imageSource:source=>({uri:source}),Date,Math,Map,JSON,RegExp,Number,String});
(async()=>{
  const {cacheProfilePhoto,readProfilePhotoCache}=sandboxExports;
  const first=await cacheProfilePhoto(42,'https://example.invalid/photo-1.jpg');
  assert.ok(first?.startsWith('file:///documents/profile-photo-42-'));
  assert.equal(files.get(first),'https://example.invalid/photo-1.jpg');
  const second=await cacheProfilePhoto(42,'https://example.invalid/photo-2.jpg');
  assert.notEqual(first,second,'changing avatar must change Image URI to bypass stale native cache');
  assert.equal(files.has(first),false,'old image must be deleted only after new image is persisted');
  assert.equal(files.get(second),'https://example.invalid/photo-2.jpg');
  assert.equal((await readProfilePhotoCache(42)).uri,second);
  failDownload=true;
  const fallback=await cacheProfilePhoto(42,'https://example.invalid/photo-broken.jpg');
  assert.equal(fallback,second,'failed avatar refresh must preserve the existing working image');
  assert.equal(files.has(second),true);
  console.log('PASS QA regressions: offline session, auth polling, sequential permissions, safe request dedupe, RTL actions, avatar replacement and failure recovery');
})().catch(error=>{console.error(error);process.exitCode=1});
