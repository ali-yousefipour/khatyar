import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import * as FileSystem from 'expo-file-system/legacy';
import { readVerifiedUser } from './offlineSession';
const KEY='offline_queue_v2';let flushPromise=null;let storageLock=Promise.resolve();
function withStorageLock(fn){const run=storageLock.then(fn,fn);storageLock=run.catch(()=>{});return run;}
function uuid(){return'q_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,10)}
async function preserveQueuedPhoto(item, clientUuid) {
  const body=item?.body;
  const photo=body?.photo_data;
  if(typeof photo!=='string' || !photo.startsWith('data:image/')) return item;
  const comma=photo.indexOf(',');
  if(comma<0 || !/;base64$/i.test(photo.slice(0,comma)))throw new Error('فرمت عکس برای صف آفلاین معتبر نیست.');
  const dir=FileSystem.documentDirectory;
  if(!dir)throw new Error('فضای دائمی برای ذخیره تصویر آفلاین در دسترس نیست.');
  const uri=`${dir}official-visit-${String(clientUuid).replace(/[^a-zA-Z0-9_-]/g,'')}.jpg`;
  await FileSystem.writeAsStringAsync(uri,photo.slice(comma+1),{encoding:FileSystem.EncodingType.Base64});
  return {...item,body:{...body,photo_data:null,photo_file_uri:uri,photo_mime:photo.slice(5,comma).split(';')[0]}};
}
// Persist embedded photo/PDF data URIs as files. This supports report
// attachments and complaint signatures, not only official visit photos.
async function persistEmbeddedAssets(value,clientUuid,created,index={n:0}) {
  if(typeof value==='string') {
    const match=/^data:(image\/(?:jpeg|png|webp)|application\/pdf);base64,([A-Za-z0-9+/=\r\n]+)$/i.exec(value);
    if(!match || value.length<8192)return value;
    const dir=FileSystem.documentDirectory;
    if(!dir)throw new Error('فضای دائمی برای ذخیره پیوست آفلاین در دسترس نیست.');
    const ext=match[1]==='application/pdf'?'pdf':match[1].split('/')[1];
    const uri=`${dir}offline-asset-${String(clientUuid).replace(/[^a-zA-Z0-9_-]/g,'')}-${++index.n}.${ext}`;
    await FileSystem.writeAsStringAsync(uri,match[2],{encoding:FileSystem.EncodingType.Base64});
    created.push(uri);
    return {__khatyar_offline_asset:uri,mime:match[1]};
  }
  if(Array.isArray(value)) {
    const out=[];
    for(const part of value)out.push(await persistEmbeddedAssets(part,clientUuid,created,index));
    return out;
  }
  if(value && typeof value==='object') {
    const out={};
    for(const [key,part] of Object.entries(value))
      out[key]=await persistEmbeddedAssets(part,clientUuid,created,index);
    return out;
  }
  return value;
}
async function deleteEmbeddedAssets(value) {
  if(!value || typeof value!=='object')return;
  if(typeof value.__khatyar_offline_asset==='string'){
    const uri=value.__khatyar_offline_asset;
    if((FileSystem.documentDirectory||'') && uri.startsWith(FileSystem.documentDirectory) && uri.includes('offline-asset-'))
      await FileSystem.deleteAsync(uri,{idempotent:true}).catch(()=>{});
    return;
  }
  for(const part of Object.values(value))await deleteEmbeddedAssets(part);
}
async function deleteQueuedPhoto(item) {
  await deleteEmbeddedAssets(item?.body);
  // Multipart attachments are copied into app-owned document storage by
  // queueMultipart(). Clean up that copy only after confirmed delivery.
  if(item?.kind==='multipart' && typeof item.fileUri==='string') {
    const multipartUri=item.fileUri;
    if((FileSystem.documentDirectory||'') && multipartUri.startsWith(FileSystem.documentDirectory) &&
       multipartUri.includes('offline-') && multipartUri.includes(String(item.client_uuid||''))) {
      await FileSystem.deleteAsync(multipartUri,{idempotent:true}).catch(()=>{});
    }
  }
  const uri=item?.body?.photo_file_uri;
  if(typeof uri==='string' && uri.startsWith(FileSystem.documentDirectory||'') && uri.includes('official-visit-')) {
    await FileSystem.deleteAsync(uri,{idempotent:true}).catch(()=>{});
  }
}
function normalizeQueue(value){const source=Array.isArray(value)?value:[];let changed=!Array.isArray(value);const normalized=source.filter(x=>x&&typeof x==='object'&&x.path).map(item=>{if(typeof item.client_uuid==='string'&&item.client_uuid.trim())return item;changed=true;return{...item,client_uuid:uuid()}});return{normalized,changed}}
export async function enqueue(item={}) {
  if(!item?.path)throw new Error('مسیر عملیات آفلاین نامعتبر است.');
  return withStorageLock(async()=>{
    const queue=await pending();
    const clientUuid=typeof item.client_uuid==='string'&&item.client_uuid.trim()?item.client_uuid:uuid();
    if(queue.some(x=>String(x.client_uuid||'')===String(clientUuid)))return clientUuid;
    const owner=await readVerifiedUser().catch(()=>null);
    let stored;
    const created=[];
    try {
      stored=await preserveQueuedPhoto(item,clientUuid);
      stored={...stored,body:await persistEmbeddedAssets(stored.body,clientUuid,created)};
    } catch(error) {
      for(const uri of created)await FileSystem.deleteAsync(uri,{idempotent:true}).catch(()=>{});
      if(stored)await deleteQueuedPhoto(stored);
      throw error;
    }
    const record={...stored,client_uuid:clientUuid,owner_user_id:owner?.id||null,
      type:item.type||item.path||'unknown',queued_at:Number(item.queued_at||Date.now()),attempts:Number(item.attempts||0)};
    try{await AsyncStorage.setItem(KEY,JSON.stringify([...queue,record]));}
    catch(error){await deleteQueuedPhoto(stored);throw new Error('فضای ذخیره‌سازی صف آفلاین کافی نیست. ثبت انجام نشد.');}
    return clientUuid;
  });
}
export async function pending(){const raw=await AsyncStorage.getItem(KEY);if(!raw)return[];try{const parsed=JSON.parse(raw);const{normalized,changed}=normalizeQueue(parsed);if(changed)await AsyncStorage.setItem(KEY,JSON.stringify(normalized));return normalized}catch(error){throw new Error('خواندن صف آفلاین ممکن نیست؛ داده‌ها برای جلوگیری از حذف ناخواسته حفظ شده‌اند.')}}
export async function clearQueue(){
  return withStorageLock(async()=>{
    const queue=await pending();
    await AsyncStorage.removeItem(KEY);
    for(const item of queue)await deleteQueuedPhoto(item);
  });
}
export async function removeSynced(ids=[]){return withStorageLock(async()=>{const idSet=new Set((ids||[]).map(String));const queue=await pending();const remaining=queue.filter(item=>!idSet.has(String(item.client_uuid||'')));await AsyncStorage.setItem(KEY,JSON.stringify(remaining));
    for(const item of queue.filter(x=>idSet.has(String(x.client_uuid||''))))await deleteQueuedPhoto(item);
    return queue.length-remaining.length;});}
async function updateItem(item,patch){return withStorageLock(async()=>{const queue=await pending();const i=queue.findIndex(x=>String(x.client_uuid||'')===String(item.client_uuid||''));if(i<0)return;queue[i]={...queue[i],...patch};await AsyncStorage.setItem(KEY,JSON.stringify(queue));});}
export async function hasPendingPath(path){const queue=await pending();return queue.some(item=>String(item?.path||'')===String(path||''));}
export async function flush(send,{force=false}={}){if(flushPromise)return flushPromise;flushPromise=(async()=>{let net;try{net=await Network.getNetworkStateAsync()}catch(_){net={isInternetReachable:true}}if(!force&&net.isConnected===false)return 0;const queue=await pending();if(!queue.length)return 0;let synced=0;for(const item of queue){
      const owner=await readVerifiedUser().catch(()=>null);
      if(!owner?.id || (item.owner_user_id && String(item.owner_user_id)!==String(owner.id)))continue;
      const attempts=Number(item.attempts||0),last=Number(item.last_attempt_at||0);if(!force&&last&&Date.now()-last<Math.min(15*60*1000,Math.max(30*1000,attempts*30*1000)))continue;try{const res=await send(item);if(res?.queued)continue;await removeSynced([item.client_uuid]);synced++}catch(e){await updateItem(item,{attempts:attempts+1,last_attempt_at:Date.now(),last_error:String(e?.message||e).slice(0,500)});continue}}return synced})();try{return await flushPromise}finally{flushPromise=null}}

export async function retryOne(clientUuid,send){const queue=await pending();const item=queue.find(x=>String(x?.client_uuid||'')===String(clientUuid||''));if(!item)throw new Error('این مورد دیگر در صف ارسال نیست.');
  const owner=await readVerifiedUser().catch(()=>null);
  if(!owner?.id || (item.owner_user_id && String(item.owner_user_id)!==String(owner.id)))
    throw new Error('این مورد مربوط به حساب دیگری است یا ورود شما تأیید نشده است.');
  try{const res=await send(item);if(res?.queued)throw new Error('هنوز ارتباط با سرور برقرار نیست.');await removeSynced([item.client_uuid]);return res}catch(e){await updateItem(item,{attempts:Number(item.attempts||0)+1,last_attempt_at:Date.now(),last_error:String(e?.message||e).slice(0,500)});throw e}}
