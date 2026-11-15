import AsyncStorage from '@react-native-async-storage/async-storage';
import {g2j,tehranGregorianParts} from './jdate';

const ROOT='manual_attendance_provisional_v2:';
const LEGACY='manual_attendance_provisional_v1';
const p2=n=>String(n).padStart(2,'0');
const key=id=>ROOT+String(Number(id)||0);
const active=e=>!['rejected','canceled'].includes(String(e?.status||''));
export function currentTehranJdate(){
  const t=tehranGregorianParts(new Date());
  if(!t)return '';
  const [y,m,d]=g2j(t.year,t.month,t.day);
  return [y,p2(m),p2(d)].join('-');
}
export function manualTimeToEpoch(jdate,clock){
  if(String(jdate).replace(/\//g,'-')!==currentTehranJdate())return null;
  if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(clock)))return null;
  const t=tehranGregorianParts(new Date());
  if(!t)return null;
  const [hours,minutes]=clock.split(':').map(Number);
  return Date.UTC(t.year,t.month-1,t.day,hours,minutes)-210*60000;
}
async function readEntries(userId){
  if(!Number(userId))return [];
  try{
    const saved=JSON.parse(await AsyncStorage.getItem(key(userId))||'null');
    if(Array.isArray(saved?.entries))return saved.entries;
    // One-time upgrade of records created immediately before this version.
    const old=JSON.parse(await AsyncStorage.getItem(LEGACY)||'null');
    if(Number(old?.user_id)===Number(userId)&&old?.request_uuid){
      await AsyncStorage.setItem(key(userId),JSON.stringify({entries:[old]}));
      await AsyncStorage.removeItem(LEGACY);
      return [old];
    }
  }catch{}
  return [];
}
async function persistEntries(userId,entries){
  await AsyncStorage.setItem(key(userId),JSON.stringify({entries}));
}
function derived(userId,entries){
  const valid=entries.filter(active).sort((a,b)=>Number(a.updated_at||0)-Number(b.updated_at||0));
  if(!valid.length)return null;
  let start=null,end=null;
  const recent=valid[valid.length-1];
  for(const item of valid){
    if(Number.isFinite(Number(item.start_ms))&&Number(item.start_ms)>0){
      start=Number(item.start_ms);end=item.end_ms?Number(item.end_ms):null;
    } else if(Number.isFinite(Number(item.end_ms))&&Number(item.end_ms)>0){
      end=Number(item.end_ms);
    }
  }
  const outstanding=valid.some(row=>['queued','pending'].includes(row.status));
  return {...recent,user_id:Number(userId),start_ms:start,end_ms:end,
    status:outstanding?'pending':recent.status};
}
export async function getProvisionalManual(userId){
  return derived(userId,await readEntries(userId));
}
export async function saveProvisionalManual(userId,data){
  if(!Number(userId)||!data?.request_uuid)throw new Error('اطلاعات ثبت موقت تردد ناقص است.');
  const entries=await readEntries(userId);
  const entry={...data,user_id:Number(userId),status:data.status||'pending',updated_at:Date.now()};
  const existing=entries.findIndex(e=>e.request_uuid===entry.request_uuid);
  if(existing>=0)entries[existing]={...entries[existing],...entry};
  else entries.push(entry);
  await persistEntries(userId,entries.slice(-80));
  return derived(userId,entries);
}
export async function clearProvisionalManual(userId){
  await AsyncStorage.removeItem(key(userId));
}
export async function applyManualRequestLocally(userId,body,clientUuid,queued,serverId){
  const kind=String(body.manual_kind||'both');
  const jdate=String(body.the_date||'').replace(/\//g,'-');
  const start=(kind==='in'||kind==='both')?manualTimeToEpoch(jdate,body.in_time):null;
  const end=(kind==='out'||kind==='both')?manualTimeToEpoch(jdate,body.out_time):null;
  if(!start&&!end)return null; // Historical requests are saved, but do not impersonate current live attendance.
  return saveProvisionalManual(userId,{
    request_uuid:String(clientUuid),request_id:serverId||null,
    start_ms:start,end_ms:end,kind,jdate,status:queued?'queued':'pending'
  });
}
export async function markManualRequestSynced(userId,clientUuid,requestId){
  const entries=await readEntries(userId);
  const i=entries.findIndex(item=>String(item.request_uuid)===String(clientUuid));
  if(i<0)return;
  entries[i]={...entries[i],status:'pending',request_id:Number(requestId),updated_at:Date.now()};
  await persistEntries(userId,entries);
}
export async function markManualOrdinaryCheckout(userId,endTime=Date.now()){
  const current=await getProvisionalManual(userId);
  if(!current?.start_ms||current.end_ms)return;
  await saveProvisionalManual(userId,{
    request_uuid:'ordinary_checkout_'+String(endTime),kind:'checkout',jdate:currentTehranJdate(),
    end_ms:Number(endTime),start_ms:null,status:'approved'
  });
}
export function provisionalOpen(row){
  if(!row?.start_ms||row?.end_ms||['rejected','canceled'].includes(row.status))return null;
  const ms=Number(row.start_ms);
  if(!Number.isFinite(ms)||Date.now()-ms>14*3600000||ms>Date.now()+300000)return null;
  const d=new Date(ms+210*60000);
  const check_in=`${d.getUTCFullYear()}-${p2(d.getUTCMonth()+1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:00`;
  return {id:'manual_provisional_'+row.request_uuid,check_in,method:'manual_pending',provisional:row.status!=='approved',owner_user_id:row.user_id};
}
export async function reconcileProvisionalManual(userId,rows){
  const entries=await readEntries(userId);
  if(!Array.isArray(rows)||!entries.length)return derived(userId,entries);
  let changed=false;
  for(const item of entries){
    if(item.kind==='checkout')continue;
    const match=rows.find(remote=>(item.request_id&&String(remote.id)===String(item.request_id))||
      (item.request_uuid&&String(remote.client_uuid||'')===String(item.request_uuid)));
    if(match&&(item.status!==match.status||Number(item.request_id)!==Number(match.id))){
      item.status=match.status||'pending';item.request_id=match.id||item.request_id;changed=true;
    }
  }
  if(changed)await persistEntries(userId,entries);
  return derived(userId,entries);
}
