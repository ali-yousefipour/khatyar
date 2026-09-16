import * as SecureStore from 'expo-secure-store';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiBase } from './config';
import { enqueue, flush as flushOfflineQueue } from './offline';
import { setLastApi } from './crashReporter';

let accessToken = null;
const memCache = {};
const CACHE_MAX_AGE_MS = 10 * 60 * 1000;

export async function setTokens(access, refresh) { accessToken = access; await SecureStore.setItemAsync('access', access); if (refresh) await SecureStore.setItemAsync('refresh', refresh); }
export async function loadTokens() { accessToken = await SecureStore.getItemAsync('access'); return accessToken; }
export async function clearTokens() { accessToken = null; await SecureStore.deleteItemAsync('access'); await SecureStore.deleteItemAsync('refresh'); }

async function fetchTimeout(url, opts = {}, ms = 25000) {
  const ctrl = new AbortController(); const id = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  catch (e) { if (e.name === 'AbortError') throw new Error('ارتباط با سرور برقرار نشد (زمان انتظار به پایان رسید).'); throw new Error('اتصال به سرور ممکن نشد.'); }
  finally { clearTimeout(id); }
}

async function refreshAccess() {
  const refresh = await SecureStore.getItemAsync('refresh'); if (!refresh) return false;
  let r;
  try { const form = new URLSearchParams(); form.append('refresh', refresh); r = await fetchTimeout(`${apiBase()}/session/renew`, { method:'POST', headers:{'content-type':'application/x-www-form-urlencoded; charset=UTF-8','accept':'application/json'}, body:form.toString() }); }
  catch (_) { return false; }
  if (!r.ok) return false; const d = await r.json(); await setTokens(d.access, d.refresh); return true;
}

async function _sessionFormPost(path, body, { timeoutMs = 25000 } = {}) {
  const form = new URLSearchParams(); Object.entries(body || {}).forEach(([k,v])=>{if(v!==undefined&&v!==null)form.append(k,String(v));});
  setLastApi({path,method:'POST',started_at:new Date().toISOString()});
  const res = await fetchTimeout(`${apiBase()}${path}`, { method:'POST', headers:{'content-type':'application/x-www-form-urlencoded; charset=UTF-8','accept':'application/json','cache-control':'no-store','user-agent':'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36 KhatyarApp/1.0'}, body:form.toString() }, timeoutMs);
  const text=await res.text(); let data={}; try{data=text?JSON.parse(text):{}}catch(_){throw new Error(`پاسخ سرور JSON نیست (HTTP ${res.status}).`)}
  if(!res.ok)throw new Error(data.error||data.message||`خطای سرور (HTTP ${res.status})`); return data;
}
export async function loginRequest(body,opts){return _sessionFormPost('/session/start',body,opts)}
export async function requestLoginOtp(mobile){return _sessionFormPost('/session/otp-request',{mobile})}
export async function verifyLoginOtp(body){return _sessionFormPost('/session/otp-verify',body)}

export function imageSource(val){if(!val)return null;if(typeof val!=='string')return val;if(val.indexOf('data:')===0)return{uri:val};if(val.indexOf('/api/')===0){const base=apiBase().replace(/\/api$/,'');return{uri:base+val,headers:accessToken?{Authorization:'Bearer '+accessToken}:{}}}if(val.indexOf('http')===0)return{uri:val};return{uri:val}}

export async function uploadFile(path,fields={},fileField='file',fileUri=null,fileName='photo.jpg',mimeType='image/jpeg'){
  const base=apiBase(),token=accessToken,fd=new FormData(); for(const[k,v]of Object.entries(fields)){if(v!=null&&v!==undefined)fd.append(k,String(v));}
  if(fileUri)fd.append(fileField,{uri:fileUri,name:fileName,type:mimeType});
  const r=await fetch(base+path,{method:'POST',headers:{...(token?{Authorization:'Bearer '+token}:{})},body:fd}); const text=await r.text(); let json={};
  try{json=text?JSON.parse(text):{}}catch(_){throw new Error(r.ok?'پاسخ نامعتبر از سرور دریافت شد.':'خطای داخلی سرور؛ پاسخ قابل خواندن نیست.')}
  if(!r.ok)throw new Error(json.error||json.message||'خطای سرور'); return json;
}

function isQueueableWrite(path,method){if(!['POST','PUT','PATCH','DELETE'].includes(String(method).toUpperCase()))return false;const p=String(path||'');if(/^\/session\//.test(p)||/^\/auth\//.test(p)||p.includes('radio-api-v2.php'))return false;return true;}
function eventBody(body){const now=Date.now();if(body&&typeof body==='object'&&!Array.isArray(body))return{...body,client_uuid:body.client_uuid||`q_${now.toString(36)}_${Math.random().toString(36).slice(2,10)}`,client_time:body.client_time||now,client_timestamp_ms:body.client_timestamp_ms||now};return body}
async function queueWrite(path,body,method){const b=eventBody(body);await enqueue({path,body:b,method,type:path,client_uuid:b?.client_uuid,client_time:b?.client_time});return{queued:true,client_uuid:b?.client_uuid,client_time:b?.client_time}}

export async function request(path,{method='GET',body,auth=true,retry=true,noStore=false,timeoutMs,queueIfOffline=true}={}){
  const upper=String(method||'GET').toUpperCase(); const headers={'content-type':'application/json'}; setLastApi({path,method:upper,started_at:new Date().toISOString()}); if(auth&&accessToken)headers.Authorization=`Bearer ${accessToken}`;
  const cacheKey='cache:'+path; const hasImagePayload=typeof body==='object'&&body&&!Array.isArray(body)&&Object.values(body).some(v=>typeof v==='string'&&v.length>100000); const effectiveTimeout=timeoutMs||(hasImagePayload?45000:undefined);
  const queueable=queueIfOffline&&isQueueableWrite(path,upper); const sendBody=queueable?eventBody(body):body; let responseReceived=false; let responseStatus=0;
  try{
    if(queueable){let net;try{net=await Network.getNetworkStateAsync()}catch(_){net={isInternetReachable:true}}if(net.isInternetReachable===false)return queueWrite(path,sendBody,upper);}
    const res=await fetchTimeout(`${apiBase()}${path}`,{method:upper,headers,body:sendBody!==undefined?JSON.stringify(sendBody):undefined},effectiveTimeout); responseReceived=true; responseStatus=res.status;
    if(res.status===401&&auth&&retry&&await refreshAccess())return request(path,{method:upper,body,auth,retry:false,noStore,timeoutMs,queueIfOffline});
    if(queueable&&res.status>=500)return queueWrite(path,sendBody,upper);
    const text=await res.text(); let data={}; try{data=text?JSON.parse(text):{}}catch(_){throw new Error(res.ok?'نوع پاسخ سرور نامعتبر است.':'خطای داخلی سرور؛ پاسخ JSON دریافت نشد.')}
    if(!res.ok)throw new Error(data.error||data.message||'خطای سرور');
    if(upper==='GET'&&!noStore){memCache[cacheKey]=data;AsyncStorage.setItem(cacheKey,JSON.stringify({t:Date.now(),data})).catch(()=>{})}
    return data;
  }catch(e){
    // فقط قطع شبکه/timeout یا پاسخ 5xx موقت وارد صف می‌شود؛ خطاهای اعتبارسنجی 4xx هرگز صف نمی‌شوند.
    if(queueable&&queueIfOffline&&(!responseReceived||responseStatus>=500)){try{return await queueWrite(path,sendBody,upper)}catch(_){}
    }
    if(upper==='GET'&&!noStore){if(memCache[cacheKey]!==undefined)return memCache[cacheKey];try{const c=await AsyncStorage.getItem(cacheKey);if(c){const j=JSON.parse(c);return j&&j.data!==undefined?j.data:j}}catch(_){} }
    throw e;
  }
}

export async function cachedValue(path){const key='cache:'+path;if(memCache[key]!==undefined)return memCache[key];try{const c=await AsyncStorage.getItem(key);if(c){const j=JSON.parse(c);return j&&j.data!==undefined?j.data:j}}catch(_){}return null}
export async function swr(path,onData){try{const c=await cachedValue(path);if(c!==null&&c!==undefined)onData(c,true)}catch(_){}try{const fresh=await request(path);onData(fresh,false);return fresh}catch(_){return null}}

export async function postOrQueue(path,body,type=null,opts={}){
  const eventMs=Date.now(); const sendBody=body&&typeof body==='object'&&!Array.isArray(body)?{...body,client_uuid:body.client_uuid||`q_${eventMs.toString(36)}_${Math.random().toString(36).slice(2,10)}`,client_time:body.client_time||eventMs,client_timestamp_ms:body.client_timestamp_ms||eventMs}:body;
  let net;try{net=await Network.getNetworkStateAsync()}catch(_){net={isInternetReachable:true}}
  if(net.isInternetReachable===false){await enqueue({path,body:sendBody,type:type||path,client_uuid:sendBody?.client_uuid,client_time:eventMs});return{queued:true,client_time:eventMs,client_uuid:sendBody?.client_uuid}}
  try{return await request(path,{method:'POST',body:sendBody,timeoutMs:opts.timeoutMs,queueIfOffline:false})}
  catch(e){if(String(e?.message||'').includes('اتصال')||String(e?.message||'زمان انتظار')){await enqueue({path,body:sendBody,type:type||path,client_uuid:sendBody?.client_uuid,client_time:eventMs});return{queued:true,client_time:eventMs,client_uuid:sendBody?.client_uuid}}throw e}
}

export async function flushQueuedRequests(){return flushOfflineQueue(async(item)=>{if(!item?.path)throw new Error('صف نامعتبر است');return request(item.path,{method:item.method||'POST',body:item.body||{},queueIfOffline:false,noStore:true})})}
