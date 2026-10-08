import * as SecureStore from 'expo-secure-store';
import * as Network from 'expo-network';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiBase } from './config';
import { enqueue, flush as flushOfflineQueue, hasPendingPath, retryOne as retryOfflineItem } from './offline';
import { setLastApi } from './crashReporter';
let accessToken=null;const memCache={};const CACHE_MAX_AGE_MS=10*60*1000;
export async function setTokens(access,refresh){accessToken=access;await SecureStore.setItemAsync('access',access);if(refresh)await SecureStore.setItemAsync('refresh',refresh)}
export async function loadTokens(){accessToken=await SecureStore.getItemAsync('access');return accessToken}
export async function clearTokens(){accessToken=null;await SecureStore.deleteItemAsync('access');await SecureStore.deleteItemAsync('refresh')}
async function fetchTimeout(url,opts={},ms=25000){const ctrl=new AbortController(),id=setTimeout(()=>ctrl.abort(),ms);try{return await fetch(url,{...opts,signal:ctrl.signal})}catch(e){if(e.name==='AbortError')throw new Error('ارتباط با سرور برقرار نشد (زمان انتظار به پایان رسید).');throw new Error('اتصال به سرور ممکن نشد.')}finally{clearTimeout(id)}}
async function refreshAccess(){const refresh=await SecureStore.getItemAsync('refresh');if(!refresh)return false;let r;try{const form=new URLSearchParams();form.append('refresh',refresh);r=await fetchTimeout(`${apiBase()}/session/renew`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded; charset=UTF-8','accept':'application/json'},body:form.toString()})}catch(_){return false}if(!r.ok)return false;const d=await r.json();await setTokens(d.access,d.refresh);return true}
async function _sessionFormPost(path,body,{timeoutMs=25000}={}){const form=new URLSearchParams();Object.entries(body||{}).forEach(([k,v])=>{if(v!==undefined&&v!==null)form.append(k,String(v))});setLastApi({path,method:'POST',started_at:new Date().toISOString()});const res=await fetchTimeout(`${apiBase()}${path}`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded; charset=UTF-8','accept':'application/json','cache-control':'no-store','user-agent':'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36 KhatyarApp/1.0'},body:form.toString()},timeoutMs);const text=await res.text();let data={};try{data=text?JSON.parse(text):{}}catch(_){throw new Error(`پاسخ سرور JSON نیست (HTTP ${res.status}).`)}if(!res.ok)throw new Error(data.error||data.message||`خطای سرور (HTTP ${res.status})`);return data}
export async function loginRequest(body,opts){return _sessionFormPost('/session/start',body,opts)}
export async function requestLoginOtp(mobile){return _sessionFormPost('/session/otp-request',{mobile})}
export async function verifyLoginOtp(body){return _sessionFormPost('/session/otp-verify',body)}
export async function getAppLoginConfig(){return request('/session/app-login-config',{auth:false,noStore:true})}
export async function requestAppLoginOtp(username){return _sessionFormPost('/session/app-login-request',{username})}
export async function verifyAppLoginOtp(body){return _sessionFormPost('/session/app-login-verify',body)}
export function imageSource(val){if(!val)return null;if(typeof val!=='string')return val;if(val.indexOf('data:')===0)return{uri:val};if(val.indexOf('/api/')===0){const base=apiBase().replace(/\/api$/,'');return{uri:base+val,headers:accessToken?{Authorization:'Bearer '+accessToken}:{}}}if(val.indexOf('http')===0)return{uri:val};return{uri:val}}
async function queueMultipart(path,fields,fileField,fileUri,fileName,mimeType){let persistedUri=fileUri;const id=`q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,10)}`;if(fileUri&&!/^https?:\/\//i.test(String(fileUri))){const dir=FileSystem.documentDirectory||'';if(dir){const safe=String(fileName||'upload.bin').replace(/[^a-zA-Z0-9._-]/g,'_');const target=`${dir}offline-${id}-${safe}`;try{await FileSystem.copyAsync({from:fileUri,to:target});persistedUri=target}catch(_){throw new Error('ذخیره فایل برای ارسال آفلاین ممکن نشد.')}}}await enqueue({path,kind:'multipart',fields:fields||{},fileField:fileField||'file',fileUri:persistedUri,fileName:fileName||'photo.jpg',mimeType:mimeType||'image/jpeg',client_uuid:id,client_time:Date.now(),type:path});return{queued:true,ok:true,id,client_uuid:id,client_time:Date.now()}}
async function uploadMultipartXHR(url,fields,fileField,fileUri,fileName,mimeType,timeoutMs=60000){
  return new Promise((resolve,reject)=>{
    try{
      const xhr=new XMLHttpRequest();
      xhr.open('POST',url,true);
      xhr.timeout=timeoutMs;
      if(accessToken)xhr.setRequestHeader('Authorization','Bearer '+accessToken);
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
  const definitelyOffline=net.isConnected===false&&net.isInternetReachable!==true;
  if(opts.queueIfOffline!==false&&definitelyOffline)return queueMultipart(path,sendFields,fileField,fileUri,fileName,mimeType);
  const timeout=opts.timeoutMs||60000;
  const doFetch=async()=>{
    const fd=new FormData();
    for(const[k,v]of Object.entries(sendFields)){if(v!=null)fd.append(k,String(v))}
    if(fileUri)fd.append(fileField,{uri:fileUri,name:fileName,type:mimeType});
    let r=await fetchTimeout(base+path,{method:'POST',headers:{...(accessToken?{Authorization:'Bearer '+accessToken}:{}),...(opts.clientUuid?{'X-Client-UUID':opts.clientUuid}:{})},body:fd},timeout);
    if(r.status===401&&await refreshAccess()){
      const fd2=new FormData();
      for(const[k,v]of Object.entries(sendFields)){if(v!=null)fd2.append(k,String(v))}
      if(fileUri)fd2.append(fileField,{uri:fileUri,name:fileName,type:mimeType});
      r=await fetchTimeout(base+path,{method:'POST',headers:{...(accessToken?{Authorization:'Bearer '+accessToken}:{}),...(opts.clientUuid?{'X-Client-UUID':opts.clientUuid}:{})},body:fd2},timeout);
    }
    const text=await r.text();let json={};
    try{json=text?JSON.parse(text):{}}catch(_){if(!r.ok)throw new Error('خطای داخلی سرور؛ پاسخ قابل خواندن نیست.');throw new Error('پاسخ نامعتبر از سرور دریافت شد.')}
    if(!r.ok)throw new Error(json.error||json.message||`خطای سرور (HTTP ${r.status})`);
    return json;
  };
  try{
    return await doFetch();
  }catch(firstError){
    // اگر اتصال واقعاً برقرار است، خطای شبکه نباید باعث انتقال کاذب بازدید به صف آفلاین شود.
    // برای Android یک مسیر multipart مبتنی بر XHR نیز امتحان می‌کنیم.
    try{
      return await uploadMultipartXHR(base+path,sendFields,fileField,fileUri,fileName,mimeType,timeout);
    }catch(secondError){
      let state=net;
      try{state=await Network.getNetworkStateAsync()}catch(_){}
      if(opts.queueIfOffline!==false&&state?.isConnected===false&&state?.isInternetReachable!==true){
        return queueMultipart(path,sendFields,fileField,fileUri,fileName,mimeType);
      }
      throw secondError?.message?secondError:firstError;
    }
  }
}

function isQueueableWrite(path,method){if(!['POST','PUT','PATCH','DELETE'].includes(String(method).toUpperCase()))return false;const p=String(path||'');if(/^\/session\//.test(p)||/^\/auth\//.test(p)||p.includes('radio-api-v2.php'))return false;return true}
function eventBody(body){const now=Date.now();if(body&&typeof body==='object'&&!Array.isArray(body))return{...body,client_uuid:body.client_uuid||`q_${now.toString(36)}_${Math.random().toString(36).slice(2,10)}`,client_time:body.client_time||now,client_timestamp_ms:body.client_timestamp_ms||now};return body}
async function queueWrite(path,body,method){const b=eventBody(body);await enqueue({path,body:b,method,type:path,client_uuid:b?.client_uuid,client_time:b?.client_time});return{queued:true,ok:true,id:b?.client_uuid||`queued_${Date.now()}`,client_uuid:b?.client_uuid,client_time:b?.client_time}}
export async function request(path,{method='GET',body,auth=true,retry=true,noStore=false,timeoutMs,queueIfOffline=true,forceNetwork=false}={}){const upper=String(method||'GET').toUpperCase(),headers={'content-type':'application/json',...(noStore?{'cache-control':'no-store, no-cache'}:{})};setLastApi({path,method:upper,started_at:new Date().toISOString()});if(auth&&accessToken)headers.Authorization=`Bearer ${accessToken}`;const cachePath=String(path)==='/my/shift-schedule'?'/my/shift-schedule?scope=current-month':'cache:'+path;const cacheKey=cachePath.startsWith('cache:')?cachePath:'cache:'+cachePath,hasImagePayload=typeof body==='object'&&body&&!Array.isArray(body)&&Object.values(body).some(v=>typeof v==='string'&&v.length>100000),effectiveTimeout=timeoutMs||(hasImagePayload?45000:undefined),queueable=queueIfOffline&&isQueueableWrite(path,upper),sendBody=queueable?eventBody(body):body;let responseReceived=false,responseStatus=0;try{if(queueable&&!forceNetwork){let net;try{net=await Network.getNetworkStateAsync()}catch(_){net={isConnected:true}}if(net.isConnected===false)return queueWrite(path,sendBody,upper)}const res=await fetchTimeout(`${apiBase()}${path}`,{method:upper,headers,body:sendBody!==undefined?JSON.stringify(sendBody):undefined},effectiveTimeout);responseReceived=true;responseStatus=res.status;if(res.status===401&&auth&&retry&&await refreshAccess())return request(path,{method:upper,body,auth,retry:false,noStore,timeoutMs,queueIfOffline});const text=await res.text();let data={};try{data=text?JSON.parse(text):{}}catch(_){throw new Error(res.ok?'نوع پاسخ سرور نامعتبر است.':'خطای داخلی سرور؛ پاسخ JSON دریافت نشد.')}if(!res.ok)throw new Error(data.error||data.message||'خطای سرور');if(upper==='GET'&&!noStore){memCache[cacheKey]=data;AsyncStorage.setItem(cacheKey,JSON.stringify({t:Date.now(),data})).catch(()=>{})}return data}catch(e){if(queueable&&queueIfOffline&&!responseReceived){try{return await queueWrite(path,sendBody,upper)}catch(_){} }if(upper==='GET'&&!noStore){if(memCache[cacheKey]!==undefined)return memCache[cacheKey];try{const c=await AsyncStorage.getItem(cacheKey);if(c){const j=JSON.parse(c);return j&&j.data!==undefined?j.data:j}}catch(_){} }throw e}}
export async function cachedValue(path){const key='cache:'+((String(path)==='/my/shift-schedule')?'/my/shift-schedule?scope=current-month':String(path));if(memCache[key]!==undefined)return memCache[key];try{const c=await AsyncStorage.getItem(key);if(c){const j=JSON.parse(c);return j&&j.data!==undefined?j.data:j}}catch(_){}return null}
export async function swr(path,onData){try{const c=await cachedValue(path);if(c!==null&&c!==undefined)onData(c,true)}catch(_){}try{const fresh=await request(path);onData(fresh,false);return fresh}catch(_){return null}}
export async function postOrQueue(path,body,type=null,opts={}){const eventMs=Date.now(),sendBody=body&&typeof body==='object'&&!Array.isArray(body)?{...body,client_uuid:body.client_uuid||`q_${eventMs.toString(36)}_${Math.random().toString(36).slice(2,10)}`,client_time:body.client_time||eventMs,client_timestamp_ms:body.client_timestamp_ms||eventMs}:body;let net;try{net=await Network.getNetworkStateAsync()}catch(_){net={isInternetReachable:true}}if(net.isConnected===false){await enqueue({path,body:sendBody,type:type||path,client_uuid:sendBody?.client_uuid,client_time:eventMs});return{queued:true,ok:true,id:sendBody?.client_uuid,client_time:eventMs,client_uuid:sendBody?.client_uuid}}return request(path,{method:'POST',body:sendBody,timeoutMs:opts.timeoutMs,queueIfOffline:true,forceNetwork:path==='/my/checkin'||path==='/my/checkout'})}
export async function hasPendingAttendanceCheckout(){return hasPendingPath('/my/checkout')}
export async function flushQueuedRequests(options={}){return flushOfflineQueue(async(item)=>{if(!item?.path)throw new Error('صف نامعتبر است');if(item.kind==='multipart')return uploadFile(item.path,item.fields||{},item.fileField||'file',item.fileUri||null,item.fileName||'upload.bin',item.mimeType||'application/octet-stream',{queueIfOffline:false,clientUuid:item.client_uuid});return request(item.path,{method:item.method||'POST',body:item.body||{},queueIfOffline:false,noStore:true})},{force:!!options.force})}

export async function retryQueuedRequest(clientUuid){return retryOfflineItem(clientUuid,async(item)=>{if(!item?.path)throw new Error('صف نامعتبر است');if(item.kind==='multipart')return uploadFile(item.path,item.fields||{},item.fileField||'file',item.fileUri||null,item.fileName||'upload.bin',item.mimeType||'application/octet-stream',{queueIfOffline:false,clientUuid:item.client_uuid});return request(item.path,{method:item.method||'POST',body:item.body||{},queueIfOffline:false,noStore:true,forceNetwork:true})})}
