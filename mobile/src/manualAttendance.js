import AsyncStorage from '@react-native-async-storage/async-storage';
import {jToday,tehranGregorianParts,tehranTimeToEpochMs} from './jdate';

const KEY='manual_attendance_provisional_v1';
const p2=n=>String(n).padStart(2,'0');
export function currentTehranJdate(){const [y,m,d]=jToday();return [y,p2(m),p2(d)].join('-');}
export function manualTimeToEpoch(jdate,clock){
  if(String(jdate).replace(/\//g,'-')!==currentTehranJdate())return null;
  if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(clock)))return null;
  const t=tehranGregorianParts(new Date());
  if(!t)return null;
  const [hours,minutes]=clock.split(':').map(Number);
  return Date.UTC(t.year,t.month-1,t.day,hours,minutes)-210*60000;
}
export async function getProvisionalManual(userId){
  try{
    const row=JSON.parse(await AsyncStorage.getItem(KEY)||'null');
    return row&&Number(row.user_id)===Number(userId)?row:null;
  }catch{return null;}
}
export async function saveProvisionalManual(userId,data){
  const now=Date.now();
  if(!userId||!data?.request_uuid)throw new Error('اطلاعات ثبت موقت تردد ناقص است.');
  const row={...data,user_id:Number(userId),status:data.status||'pending',updated_at:now};
  await AsyncStorage.setItem(KEY,JSON.stringify(row));
  return row;
}
export async function clearProvisionalManual(userId){
  const row=await getProvisionalManual(userId);
  if(row)await AsyncStorage.removeItem(KEY);
}
export async function applyManualRequestLocally(userId,body,clientUuid,queued,serverId){
  const kind=String(body.manual_kind||'both');
  const jdate=String(body.the_date||'').replace(/\//g,'-');
  const current=await getProvisionalManual(userId);
  let start=current?.start_ms||null;
  let end=current?.end_ms||null;
  if(kind==='in'||kind==='both')start=manualTimeToEpoch(jdate,body.in_time);
  if(kind==='out'||kind==='both')end=manualTimeToEpoch(jdate,body.out_time);
  if(!start&&!end)return null;
  const saved=await saveProvisionalManual(userId,{
    request_uuid:String(clientUuid),request_id:serverId||null,
    start_ms:start,end_ms:end,kind,jdate,status:queued?'queued':'pending',
    ...(current?.start_ms&&!start?{start_ms:current.start_ms}:{})
  });
  return saved;
}
export function provisionalOpen(row){
  if(!row?.start_ms||row?.end_ms||row.status==='rejected'||row.status==='canceled')return null;
  const ms=Number(row.start_ms);
  if(!Number.isFinite(ms)||Date.now()-ms>14*3600000||ms>Date.now()+300000)return null;
  const date=new Date(ms+210*60000);
  const check_in=`${date.getUTCFullYear()}-${p2(date.getUTCMonth()+1)}-${p2(date.getUTCDate())} ${p2(date.getUTCHours())}:${p2(date.getUTCMinutes())}:00`;
  return{id:'manual_provisional_'+row.request_uuid,check_in,method:'manual_pending',provisional:true,owner_user_id:row.user_id};
}
export async function reconcileProvisionalManual(userId,rows){
  const row=await getProvisionalManual(userId);
  if(!row||!Array.isArray(rows))return row;
  const match=rows.find(item=>(row.request_id&&String(item.id)===String(row.request_id))||(row.request_uuid&&String(item.client_uuid||'')===row.request_uuid));
  if(!match)return row;
  if(['rejected','canceled'].includes(String(match.status))){
    await clearProvisionalManual(userId);return null;
  }
  const next={...row,status:match.status||'pending',request_id:match.id||row.request_id};
  await AsyncStorage.setItem(KEY,JSON.stringify(next));
  return next;
}
