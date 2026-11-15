import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {ensurePresenceChannel} from './notify';

export const PRESENCE_LOCAL_SCHEDULE_KEY = 'presence_local_schedule_v2';
const MODE_KEY = 'presence_daily_policy_v2';
const MAX_RANDOM_PER_SESSION = 6;
const BLOCK_MS = 4 * 60 * 60 * 1000;
const DEFAULT_WINDOW_MINUTES = 3;
const policyDay = () => new Date().toLocaleDateString('en-CA', {timeZone:'Asia/Tehran'});
export async function cachedPresencePolicy(userId) {
  try { const p=JSON.parse(await AsyncStorage.getItem(MODE_KEY)||'null'); return Number(p?.user_id)===Number(userId)?p:null; } catch { return null; }
}
export async function storePresencePolicy(userId,config) {
  const policy={user_id:Number(userId),day:policyDay(),saved_at:Date.now(),enabled:!!config.enabled,required:!!config.required,assigned:config.assigned===undefined?!!config.required:!!config.assigned,random_enabled:!!config.random_enabled,slots:Array.isArray(config.slots)?config.slots:[],window_minutes:Number(config.window_minutes||3),alarm:config.alarm!==false,immediate_requests:[]};
  await AsyncStorage.setItem(MODE_KEY,JSON.stringify(policy));
  return policy;
}
export async function currentPresencePolicy(userId,request) {
  const cached=await cachedPresencePolicy(userId);
  if(cached?.day===policyDay())return cached;
  try { return await storePresencePolicy(userId,await request('/my/presence-config',{auth:true,noStore:true,timeoutMs:8000})); }
  catch { return cached; }
}
function checkInTimestamp(value) {
  if(!value)return NaN;
  if(typeof value==='number')return value;
  const str=String(value);
  const parsed=Date.parse(str.includes('T')?str:str.replace(' ','T')+'+03:30');
  return parsed;
}
export async function localAttendanceSession(userId) {
  try {
    const open=JSON.parse(await AsyncStorage.getItem('attendance_local_open_v1')||'null');
    if(!open?.check_in||open?.check_out)return null;
    if(Number(open.owner_user_id||0)!==Number(userId))return null;
    const start=checkInTimestamp(open.check_in);
    return Number.isFinite(start)?{user_id:Number(userId),attendance_id:String(open.id||''),start}:null;
  }catch{return null;}
}
async function installLocalAlerts(schedule) {
  if(!schedule?.items?.length)return;
  await ensurePresenceChannel();
  const now=Date.now();
  for(const item of schedule.items) {
    if(item.ts*1000<=now+1000||item.ts*1000>now+24*60*60*1000)continue;
    try {
      const identifier=await Notifications.scheduleNotificationAsync({
        content:{title:'صحت‌سنجی حضور',body:'لطفاً عکس سلفی و تصویر ایستگاه را ثبت کنید.',sound:'presence_validation_alert.mp3',channelId:'presence_alarm',priority:Notifications.AndroidNotificationPriority.MAX,data:{type:'presence_check',random:true,local:true,slot:item.slot,request_id:item.request_id,ts:item.ts,window_minutes:item.window_minutes}},
        trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(item.ts*1000)}
      });
      item.notification_id=identifier;
      await AsyncStorage.setItem('presence_random_notified:'+item.request_id,'1');
    }catch{}
  }
}
export async function ensureLocalRandomSchedule(userId,open,windowMinutes=DEFAULT_WINDOW_MINUTES) {
  if(!open?.start||!Number.isFinite(open.start))return null;
  let existing=null;
  try{existing=JSON.parse(await AsyncStorage.getItem(PRESENCE_LOCAL_SCHEDULE_KEY)||'null')}catch{}
  const id=String(open.attendance_id||open.start);
  if(Number(existing?.user_id)===Number(userId)&&existing?.attendance_id===id&&existing?.items?.length)return existing;
  if(existing?.items?.length)for(const item of existing.items)if(item.notification_id)await Notifications.cancelScheduledNotificationAsync(item.notification_id).catch(()=>{});
  const items=[];
  for(let block=0;block<2;block++) {
    const start=open.start+block*BLOCK_MS;
    const margin=5*60*1000;
    const segment=(BLOCK_MS-2*margin)/3;
    for(let j=0;j<3;j++) {
      const at=Math.floor(start+margin+segment*(j+Math.random()*0.85));
      const ts=Math.floor(at/1000);
      items.push({ts,slot:new Date(at).toLocaleTimeString('en-GB',{timeZone:'Asia/Tehran',hour:'2-digit',minute:'2-digit'}),request_id:'local_'+id.replace(/[^a-zA-Z0-9_-]/g,'_')+'_'+ts,window_minutes:Math.min(10,Math.max(1,Number(windowMinutes)||DEFAULT_WINDOW_MINUTES))});
    }
  }
  const schedule={user_id:Number(userId),attendance_id:id,start:open.start,items:items.slice(0,MAX_RANDOM_PER_SESSION),created_at:Date.now()};
  await installLocalAlerts(schedule);
  await AsyncStorage.setItem(PRESENCE_LOCAL_SCHEDULE_KEY,JSON.stringify(schedule));
  return schedule;
}
export async function clearLocalRandomSchedule() {
  const raw=await AsyncStorage.getItem(PRESENCE_LOCAL_SCHEDULE_KEY);
  if(raw){try{for(const item of JSON.parse(raw)?.items||[])if(item.notification_id)await Notifications.cancelScheduledNotificationAsync(item.notification_id).catch(()=>{})}catch{}}
  await AsyncStorage.removeItem(PRESENCE_LOCAL_SCHEDULE_KEY);
}
export async function localPresenceCompletions() {
  try{return JSON.parse(await AsyncStorage.getItem('presence_local_completions_v1')||'{}')}catch{return {}}
}
export async function markLocalPresenceCompleted(requestId,state='done') {
  const all=await localPresenceCompletions();all[String(requestId)]={status:state,time:Date.now()};
  await AsyncStorage.setItem('presence_local_completions_v1',JSON.stringify(all));
}
