import {attendanceMutationEpoch,publishAttendanceChange} from './attendanceState';
import * as SecureStore from 'expo-secure-store';
import * as Network from 'expo-network';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiBase } from './config';
import { enqueue, pending as pendingOfflineItems, flush as flushOfflineQueue, hasPendingPath, retryOne as retryOfflineItem } from './offline';
import {markManualRequestSynced} from './manualAttendance';
import { setLastApi } from './crashReporter';
let accessToken=null;const memCache={};const CACHE_MAX_AGE_MS=10*60*1000;
let userCacheEpoch=0;
const isAttendanceRead=path=>path==='/my/checkin-config'||path==='/my/work-timer';
export async function clearUserScopedApiCache(){
  userCacheEpoch++;
  for(const key of Object.keys(memCache))delete memCache[key];
  try{const keys=(await AsyncStorage.getAllKeys()).filter(key=>key.startsWith('cache:'));if(keys.length)await AsyncStorage.multiRemove(keys);}catch(_){}
}

const tokenListeners=new Set();
const revokedListeners=new Set();
export function onSessionRevoked(listener){
  if(typeof listener!=='function')return()=>{};
  revokedListeners.add(listener);
  return()=>revokedListeners.delete(listener);
}
let revocationReported=false;
function confirmedRevocation(){
  if(revocationReported)return;
  revocationReported=true;
  for(const listener of revokedListeners){try{listener()}catch(_){}}
}
export function onAccessTokenChanged(listener){if(typeof listener!=='function')return()=>{};tokenListeners.add(listener);return()=>tokenListeners.delete(listener)}
export async function setTokens(access,refresh){revocationReported=false;accessToken=access;await SecureStore.setItemAsync('access',access);if(refresh)await SecureStore.setItemAsync('refresh',refresh);for(const listener of tokenListeners){try{listener(access)}catch(_){}}}
export async function loadTokens(){accessToken=await SecureStore.getItemAsync('access');return accessToken}
export async function clearTokens(){revocationReported=false;accessToken=null;await SecureStore.deleteItemAsync('access');await SecureStore.deleteItemAsync('refresh');await clearUserScopedApiCache();}
async function fetchTimeout(url,opts={},ms=25000){const ctrl=new AbortController(),id=setTimeout(()=>ctrl.abort(),ms);try{return await fetch(url,{...opts,signal:ctrl.signal})}catch(e){if(e.name==='AbortError')throw new Error('ارتباط با سرور برقرار نشد (زمان انتظار به پایان رسید).');throw new Error('اتصال به سرور ممکن نشد.')}finally{clearTimeout(id)}}
// Multiple polling requests often observe the same expired access token.
// Serialize renewal to avoid simultaneous updates and transient logout races.
let renewalPromise=null;
async function refreshAccess(){
  if(renewalPromise)return renewalPromise;
  renewalPromise=(async()=>{
    const refresh=await SecureStore.getItemAsync('refresh');
    if(!refresh)return false;
    const form=new URLSearchParams();form.append('refresh',refresh);
    const transient=()=>Object.assign(new Error('سرور موقتاً در دسترس نیست؛ نشست شما حفظ شده است.'),{status:503});
    for(let attempt=0;attempt<2;attempt++){
      try{
        const r=await fetchTimeout(`${apiBase()}/session/renew`,{
          method:'POST',
          headers:{'content-type':'application/x-www-form-urlencoded; charset=UTF-8','accept':'application/json'},
          body:form.toString()
        },18000);
        if(r.status===401||r.status===403){
          // A WAF/proxy signature error is NOT evidence that the administrator
          // removed the registered device session. Keep the verified local user.
          let detail={};try{detail=await r.json()}catch(_){}
          const reason=String(detail?.error||detail?.message||'');
          if(r.status===401 && reason==='نشست نامعتبر است'){
            confirmedRevocation();
            throw Object.assign(new Error('نشست این دستگاه توسط سرور باطل شده است.'),{status:401,confirmedRevocation:true});
          }
          return false;
        } // Only exact server session revocation forces logout
        if(!r.ok){if(r.status>=500){if(attempt===0)continue;throw transient();}return false;}
        const d=await r.json();
        if(!d?.access||!d?.refresh)throw transient();
        await setTokens(d.access,d.refresh);
        return true;
      }catch(error){
        if(error?.confirmedRevocation)throw error;
        if(attempt===1)throw transient();
      }
    }
    throw transient();
  })();
  try{return await renewalPromise}finally{renewalPromise=null;}
}
async function _sessionFormPost(path,body,{timeoutMs=25000}={}){const form=new URLSearchParams();Object.entries(body||{}).forEach(([k,v])=>{if(v!==undefined&&v!==null)form.append(k,String(v))});setLastApi({path,method:'POST',started_at:new Date().toISOString()});const res=await fetchTimeout(`${apiBase()}${path}`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded; charset=UTF-8','accept':'application/json','cache-control':'no-store','user-agent':'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36 KhatyarApp/1.0'},body:form.toString()},timeoutMs);const text=await res.text();let data={};try{data=text?JSON.parse(text):{}}catch(_){throw new Error(`پاسخ سرور JSON نیست (HTTP ${res.status}).`)}if(!res.ok)throw new Error(data.error||data.message||`خطای سرور (HTTP ${res.status})`);return data}
export async function loginRequest(body,opts){return _sessionFormPost('/session/start',body,opts)}
export async function requestLoginOtp(mobile){return _sessionFormPost('/session/otp-request',{mobile})}
export async function verifyLoginOtp(body){return _sessionFormPost('/session/otp-verify',body)}
export async function getAppLoginConfig(){
  const path='/session/app-login-config';
  setLastApi({path,method:'GET',started_at:new Date().toISOString()});
  const res=await fetchTimeout(`${apiBase()}${path}`,{
    method:'GET',headers:{accept:'application/json','cache-control':'no-store'}
  },15000);
  if(res.status===404)throw new Error('API تنظیمات ورود روی سرور نصب نشده است؛ با مدیر سامانه تماس بگیرید.');
  const body=await res.text();
  let data;
  try{data=JSON.parse(body)}catch(_){throw new Error(`پاسخ تنظیمات ورود معتبر نیست (HTTP ${res.status}).`)}
  if(!res.ok)throw new Error(data?.error||data?.message||`خطای سرور (HTTP ${res.status})`);
  if(!['password','sms_otp','bale_otp'].includes(data?.method))throw new Error('روش ورود اعلام‌شده توسط سرور نامعتبر است.');
  return data;
}
export async function requestAppLoginOtp(username,device_id){return _sessionFormPost('/session/app-login-request',{username,device_id})}
export async function verifyAppLoginOtp(body){return _sessionFormPost('/session/app-login-verify',body)}
export function imageSource(val){if(!val)return null;if(typeof val!=='string')return val;if(val.indexOf('data:')===0)return{uri:val};if(val.indexOf('/api/')===0){const base=apiBase().replace(/\/api$/,'');return{uri:base+val,headers:accessToken?{Authorization:'Bearer '+accessToken,'X-Access-Token':accessToken}:{}}}if(val.indexOf('http')===0)return{uri:val};return{uri:val}}
async function queueMultipart(path,fields,fileField,fileUri,fileName,mimeType){let persistedUri=fileUri;const id=String(fields?.client_uuid||`q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,10)}`);if(fileUri&&!/^https?:\/\//i.test(String(fileUri))){const dir=FileSystem.documentDirectory||'';if(dir){const safe=String(fileName||'upload.bin').replace(/[^a-zA-Z0-9._-]/g,'_');const target=`${dir}offline-${id}-${safe}`;try{await FileSystem.copyAsync({from:fileUri,to:target});persistedUri=target}catch(_){throw new Error('ذخیره فایل برای ارسال آفلاین ممکن نشد.')}}}await enqueue({path,kind:'multipart',fields:fields||{},fileField:fileField||'file',fileUri:persistedUri,fileName:fileName||'photo.jpg',mimeType:mimeType||'image/jpeg',client_uuid:id,client_time:Date.now(),type:path});return{queued:true,ok:true,id,client_uuid:id,client_time:Date.now()}}
async function uploadMultipartXHR(url,fields,fileField,fileUri,fileName,mimeType,timeoutMs=60000){
  return new Promise((resolve,reject)=>{
    try{
      const xhr=new XMLHttpRequest();
      xhr.open('POST',url,true);
      xhr.timeout=timeoutMs;
      if(accessToken){xhr.setRequestHeader('Authorization','Bearer '+accessToken);xhr.setRequestHeader('X-Access-Token',accessToken);}
      const fd=new FormData();
      for(const[k,v]of Object.entries(fields||{})){if(v!=null)fd.append(k,String(v))}
      if(fileUri)fd.append(fileField,{uri:fileUri,name:fileName,type:mimeType});
      xhr.onload=()=>{
        const text=xhr.responseText||'';
        let json={};
        try{json=text?JSON.parse(text):{}}catch(_){
          reject(new Error(xhr.status>=200&&xhr.status<300?'پاسخ نامعتبر از سرور دریافت شد.':'خطای داخلی سرور؛ پاسخ قابل خواندن نیست.'));
          return;
        }
        if(xhr.status<200||xhr.status>=300){
          if(xhr.status===401){reject(Object.assign(new Error(json.error||json.message||'احراز هویت منقضی شده است.'),{status:401}));return}
          reject(new Error(json.error||json.message||`خطای سرور (HTTP ${xhr.status})`));return;
        }
        resolve(json);
      };
      xhr.onerror=()=>reject(new Error('ارسال فایل به سرور ناموفق بود.'));
      xhr.ontimeout=()=>reject(new Error('زمان ارسال فایل به سرور به پایان رسید.'));
      xhr.send(fd);
    }catch(e){reject(e)}
  });
}

export async function uploadFile(path,fields={},fileField='file',fileUri=null,fileName='photo.jpg',mimeType='image/jpeg',opts={}){
  const base=apiBase(),clientUuid=opts.clientUuid||`q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,10)}`;
  const sendFields={...(fields||{}),client_uuid:clientUuid};
  let net;
  try{net=await Network.getNetworkStateAsync()}catch(_){net={isConnected:true,isInternetReachable:true}}
  const definitelyOffline=net.isConnected===false||net.isInternetReachable===false;
  if(opts.queueIfOffline!==false&&definitelyOffline)return queueMultipart(path,sendFields,fileField,fileUri,fileName,mimeType);
  const timeout=opts.timeoutMs||60000;
  let receivedHttpResponse=false;
  const doFetch=async()=>{
    const fd=new FormData();
    for(const[k,v]of Object.entries(sendFields)){if(v!=null)fd.append(k,String(v))}
    if(fileUri)fd.append(fileField,{uri:fileUri,name:fileName,type:mimeType});
    let r=await fetchTimeout(base+path,{method:'POST',headers:{...(accessToken?{Authorization:'Bearer '+accessToken,'X-Access-Token':accessToken}:{}),...(opts.clientUuid?{'X-Client-UUID':opts.clientUuid}:{})},body:fd},timeout);
    receivedHttpResponse=true;
    if(r.status===401&&await refreshAccess()){
      const fd2=new FormData();
      for(const[k,v]of Object.entries(sendFields)){if(v!=null)fd2.append(k,String(v))}
      if(fileUri)fd2.append(fileField,{uri:fileUri,name:fileName,type:mimeType});
      r=await fetchTimeout(base+path,{method:'POST',headers:{...(accessToken?{Authorization:'Bearer '+accessToken,'X-Access-Token':accessToken}:{}),...(opts.clientUuid?{'X-Client-UUID':opts.clientUuid}:{})},body:fd2},timeout);
    }
    const text=await r.text();let json={};
    try{json=text?JSON.parse(text):{}}catch(_){if(!r.ok)throw new Error('خطای داخلی سرور؛ پاسخ قابل خواندن نیست.');throw new Error('پاسخ نامعتبر از سرور دریافت شد.')}
    if(!r.ok)throw new Error(json.error||json.message||`خطای سرور (HTTP ${r.status})`);
    return json;
  };
  try{
    return await doFetch();
  }catch(firstError){
    // A received HTTP response (including 4xx, 5xx or malformed JSON) must
    // never cause a second multipart write via XHR. The server may have
    // committed the operation already.
    if(receivedHttpResponse)throw firstError;
    // No HTTP response is ambiguous. The server may already have committed
    // this upload; neither automatic XHR replay nor offline queuing is safe.
    // Only requests known offline BEFORE the first send enter the queue.
    throw firstError;

  }
}

function isQueueableWrite(path,method){if(!['POST','PUT','PATCH','DELETE'].includes(String(method).toUpperCase()))return false;const p=String(path||'');if(/^\/session\//.test(p)||/^\/auth\//.test(p)||p.includes('radio-api-v2.php'))return false;return true}
function eventBody(body){const now=Date.now();if(body&&typeof body==='object'&&!Array.isArray(body))return{...body,client_uuid:body.client_uuid||`q_${now.toString(36)}_${Math.random().toString(36).slice(2,10)}`,client_time:body.client_time||now,client_timestamp_ms:body.client_timestamp_ms||now};return body}
async function queueWrite(path,body,method){const b=eventBody(body);await enqueue({path,body:b,method,type:path,client_uuid:b?.client_uuid,client_time:b?.client_time});return{queued:true,ok:true,id:b?.client_uuid||`queued_${Date.now()}`,client_uuid:b?.client_uuid,client_time:b?.client_time}}
async function requestImpl(path,{method='GET',body,auth=true,retry=true,noStore=false,timeoutMs,queueIfOffline=true,forceNetwork=false}={}){const readEpoch=userCacheEpoch,readAttendanceEpoch=attendanceMutationEpoch.current,upper=String(method||'GET').toUpperCase(),headers={'content-type':'application/json',...(noStore?{'cache-control':'no-store, no-cache'}:{})};setLastApi({path,method:upper,started_at:new Date().toISOString()});if(auth&&accessToken){headers.Authorization=`Bearer ${accessToken}`;headers['X-Access-Token']=accessToken;}const cachePath=String(path)==='/my/shift-schedule'?'/my/shift-schedule?scope=current-month':'cache:'+path;const cacheKey=cachePath.startsWith('cache:')?cachePath:'cache:'+cachePath,hasImagePayload=typeof body==='object'&&body&&!Array.isArray(body)&&Object.values(body).some(v=>typeof v==='string'&&v.length>100000),effectiveTimeout=timeoutMs||(hasImagePayload?45000:undefined),queueable=queueIfOffline&&isQueueableWrite(path,upper),sendBody=queueable?eventBody(body):body;let responseReceived=false,responseStatus=0;try{if(queueable&&!forceNetwork){let net;try{net=await Network.getNetworkStateAsync()}catch(_){net={isConnected:true}}if(net.isConnected===false||net.isInternetReachable===false)return queueWrite(path,sendBody,upper)}const res=await fetchTimeout(`${apiBase()}${path}`,{method:upper,headers,body:sendBody!==undefined?JSON.stringify(sendBody):undefined},effectiveTimeout);responseReceived=true;responseStatus=res.status;if(res.status===401&&auth&&retry&&await refreshAccess())return request(path,{method:upper,body:sendBody,auth,retry:false,noStore,timeoutMs,queueIfOffline,forceNetwork});const text=await res.text();let data={};try{data=text?JSON.parse(text):{}}catch(_){throw new Error(res.ok?'نوع پاسخ سرور نامعتبر است.':'خطای داخلی سرور؛ پاسخ JSON دریافت نشد.')}if(!res.ok)throw Object.assign(new Error(data.error||data.message||'خطای سرور'),{status:res.status});if(upper==='GET'&&!noStore&&readEpoch===userCacheEpoch&&(!isAttendanceRead(path)||readAttendanceEpoch===attendanceMutationEpoch.current)){memCache[cacheKey]=data;AsyncStorage.setItem(cacheKey,JSON.stringify({t:Date.now(),data})).catch(()=>{})}return data}catch(e){if(queueable&&queueIfOffline&&!responseReceived){try{return await queueWrite(path,sendBody,upper)}catch(_){} }if(upper==='GET'&&!noStore&&readEpoch===userCacheEpoch&&(!isAttendanceRead(path)||readAttendanceEpoch===attendanceMutationEpoch.current)){try{const c=await AsyncStorage.getItem(cacheKey);if(readEpoch!==userCacheEpoch||isAttendanceRead(path)&&readAttendanceEpoch!==attendanceMutationEpoch.current)throw new Error('stale auth session cache');if(c){const j=JSON.parse(c);if(j&&Number.isFinite(Number(j.t))&&Date.now()-Number(j.t)<=CACHE_MAX_AGE_MS&&Date.now()>=Number(j.t))return j.data;}}catch(_){} }throw e}}
// Avoid sending duplicate concurrent presence GETs from dashboard, check-in
// and foreground refresh. Never merge writes or requests across auth sessions.
const attendanceGetInflight = new Map();
const sharedReadPaths = new Set(['/my/checkin-config','/my/work-timer','/me/full-profile','/my/app-items','/my/lines','/my/app-config','/school-service/access','/school-service/bootstrap','/weather.php']);
export function request(path, options = {}) {
  const verb = String(options.method || 'GET').toUpperCase();
  // Merge only requests with identical freshness/auth semantics. A forced or
  // no-store read must never accidentally reuse a cached/offline fallback.
  const key = verb === 'GET' && sharedReadPaths.has(path)
    ? JSON.stringify([String(accessToken || ''),path,options.auth!==false,!!options.noStore,!!options.forceNetwork,options.timeoutMs||0,options.retry!==false,isAttendanceRead(path)?attendanceMutationEpoch.current:0])
    : null;
  if (!key) return requestImpl(path, options);
  const existing = attendanceGetInflight.get(key);
  if (existing) return existing;
  const call = requestImpl(path, options);
  attendanceGetInflight.set(key, call);
  call.finally(() => {
    if (attendanceGetInflight.get(key) === call) attendanceGetInflight.delete(key);
  }).catch(() => {});
  return call;
}
// Remove a stale GET snapshot after a successful attendance mutation.
export async function invalidateCachedValue(path){
  const key='cache:'+String(path);
  delete memCache[key];
  try { await AsyncStorage.removeItem(key); } catch (_) {}
}
export async function cachedValue(path){const key='cache:'+((String(path)==='/my/shift-schedule')?'/my/shift-schedule?scope=current-month':String(path));if(memCache[key]!==undefined)return memCache[key];try{const c=await AsyncStorage.getItem(key);if(c){const j=JSON.parse(c);return j&&j.data!==undefined?j.data:j}}catch(_){}return null}
export async function swr(path,onData){try{const c=await cachedValue(path);if(c!==null&&c!==undefined)onData(c,true)}catch(_){}try{const fresh=await request(path);onData(fresh,false);return fresh}catch(_){return null}}
export async function postOrQueue(path,body,type=null,opts={}){const eventMs=Date.now(),sendBody=body&&typeof body==='object'&&!Array.isArray(body)?{...body,client_uuid:body.client_uuid||`q_${eventMs.toString(36)}_${Math.random().toString(36).slice(2,10)}`,client_time:body.client_time||eventMs,client_timestamp_ms:body.client_timestamp_ms||eventMs}:body;let net;try{net=await Network.getNetworkStateAsync()}catch(_){net={isInternetReachable:true}}if(net.isConnected===false||net.isInternetReachable===false){await enqueue({path,body:sendBody,type:type||path,client_uuid:sendBody?.client_uuid,client_time:eventMs});return{queued:true,ok:true,id:sendBody?.client_uuid,client_time:eventMs,client_uuid:sendBody?.client_uuid}}return request(path,{method:'POST',body:sendBody,timeoutMs:opts.timeoutMs,queueIfOffline:true,forceNetwork:path==='/my/checkin'||path==='/my/checkout'})}
export async function hasPendingAttendanceCheckin(userId){return (await pendingOfflineItems()).some(item=>item.path==='/my/checkin'&&Number(item.owner_user_id)===Number(userId));}
export async function hasPendingAttendanceCheckout(userId){if(!Number(userId))return false;return (await pendingOfflineItems()).some(item=>item.path==='/my/checkout'&&Number(item.owner_user_id)===Number(userId));}
async function restoreEmbeddedQueueAssets(value) {
  if(value && typeof value==='object' && typeof value.__khatyar_offline_asset==='string') {
    const info=await FileSystem.getInfoAsync(value.__khatyar_offline_asset);
    if(!info.exists)throw new Error('پیوست ذخیره‌شدهٔ آفلاین یافت نشد؛ عملیات در صف باقی ماند.');
    const base64=await FileSystem.readAsStringAsync(value.__khatyar_offline_asset,{
      encoding:FileSystem.EncodingType.Base64,
    });
    return `data:${value.mime||'application/octet-stream'};base64,${base64}`;
  }
  if(Array.isArray(value)) {
    const out=[];
    for(const part of value)out.push(await restoreEmbeddedQueueAssets(part));
    return out;
  }
  if(value && typeof value==='object') {
    const out={};
    for(const [key,part] of Object.entries(value))out[key]=await restoreEmbeddedQueueAssets(part);
    return out;
  }
  return value;
}
async function sendPersistedQueueItem(item,forceNetwork=true) {
  if(!item?.path)throw new Error('صف نامعتبر است');
  if(item.kind==='multipart')return uploadFile(item.path,item.fields||{},item.fileField||'file',
    item.fileUri||null,item.fileName||'upload.bin',item.mimeType||'application/octet-stream',
    {queueIfOffline:false,clientUuid:item.client_uuid});
  let body=await restoreEmbeddedQueueAssets(item.body||{});
  if(body?.photo_file_uri){
    // A queued visit keeps the photo in a permanent file, never in the
    // Android AsyncStorage database (large base64 values exceed its limits).
    const file=body.photo_file_uri;
    const info=await FileSystem.getInfoAsync(file);
    if(!info.exists)throw new Error('عکس این ثبت آفلاین در حافظه دستگاه یافت نشد. مورد در صف باقی ماند.');
    const base64=await FileSystem.readAsStringAsync(file,{encoding:FileSystem.EncodingType.Base64});
    body={...body,photo_data:`data:${body.photo_mime||'image/jpeg'};base64,${base64}`};
    delete body.photo_file_uri;
    delete body.photo_mime;
  }
  const result=await request(item.path,{method:item.method||'POST',body,queueIfOffline:false,noStore:true,forceNetwork});
  if((item.path==='/my/checkin'||item.path==='/my/checkout')&&result?.ok&&!result?.queued){
    const acknowledgementEpoch=++attendanceMutationEpoch.current;
    await invalidateCachedValue('/my/checkin-config');
    await invalidateCachedValue('/my/work-timer');
    if(item.path==='/my/checkin')try{
      const key='attendance_local_open_v1';
      const local=JSON.parse(await AsyncStorage.getItem(key)||'null');
      if(Number(local?.owner_user_id)===Number(item.owner_user_id)&&local?.client_uuid===item.client_uuid&&acknowledgementEpoch===attendanceMutationEpoch.current){
        await AsyncStorage.setItem(key,JSON.stringify({...local,id:result.id,check_in:result.check_in||local.check_in}));
      }
    }catch(_){}
    publishAttendanceChange();
  }
  if(item.path==='/my/requests'&&body?.type==='manual'&&Number(result?.id)>0){
    try{await markManualRequestSynced(item.owner_user_id,item.client_uuid,result.id);}
    catch(error){console.warn('manual attendance acknowledgement storage failed:',error?.message||error);}
  }
  if(item.path==='/my/presence-check'&&result?.ok&&!result?.queued&&body?.request_id){
    try{
      const key='presence_local_completions_v1';
      const map=JSON.parse(await AsyncStorage.getItem(key)||'{}');
      map[String(body.request_id)]={...map[String(body.request_id)],status:'done',time:Date.now()};
      await AsyncStorage.setItem(key,JSON.stringify(map));
    }catch{}
  }
  return result;
}
export async function flushQueuedRequests(options={}){
  return flushOfflineQueue(item=>sendPersistedQueueItem(item,true),{force:!!options.force});
}
export async function retryQueuedRequest(clientUuid){
  return retryOfflineItem(clientUuid,item=>sendPersistedQueueItem(item,true));
}
