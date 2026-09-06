import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { request } from './api';
import { notify } from './notify';
import { useAuth } from './auth';
import PresenceCheckModal from './PresenceCheckModal';
import { startPresenceAlarm, stopPresenceAlarm } from './presenceAlarm';
import * as Notifications from 'expo-notifications';
import { tehranGregorianParts } from './jdate';

const PRESENCE_TYPE = 'presence_check';
const SCHEDULE_PREFIX = 'presence_scheduled_v2:';

function tehranNow() {
  const p = tehranGregorianParts(new Date());
  if (!p) {
    const d = new Date();
    return { day: d.toISOString().slice(0, 10), minutes: d.getHours() * 60 + d.getMinutes(), seconds: d.getSeconds() };
  }
  return { day: `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`, minutes: p.hour * 60 + p.minute, seconds: p.second || 0 };
}
function normalizeDigits(value) { return String(value ?? '').replace(/[۰-۹٠-٩]/g, ch => { const fa='۰۱۲۳۴۵۶۷۸۹', ar='٠١٢٣٤٥٦٧٨٩'; const i=fa.indexOf(ch); if(i>=0)return String(i); const j=ar.indexOf(ch); return j>=0?String(j):ch; }); }
function slotToMinutes(value) { const s=normalizeDigits(value).trim(); const m=/^(\d{1,2}):(\d{2})$/.exec(s); if(!m)return -1; const h=Number(m[1]), min=Number(m[2]); return h>=0&&h<=23&&min>=0&&min<=59?h*60+min:-1; }
function normalizePresenceConfig(raw) {
  const cfg=raw&&typeof raw==='object'?raw:{};
  const slots=Array.from(new Set((Array.isArray(cfg.slots)?cfg.slots:[]).map(v=>normalizeDigits(v).trim()).filter(v=>slotToMinutes(v)>=0).map(v=>{const [h,m]=v.split(':');return `${String(Number(h)).padStart(2,'0')}:${String(Number(m)).padStart(2,'0')}`;}))).sort();
  return { enabled:cfg.enabled===true||cfg.enabled===1||cfg.enabled==='1', required:cfg.required===true||cfg.required===1||cfg.required==='1', slots, window_minutes:Math.max(1,Math.min(60,Number(cfg.window_minutes||1))), grace_minutes:Math.max(1,Math.min(240,Number(cfg.grace_minutes||15))), alarm:cfg.alarm!==false, audience:cfg.audience==='shift_only'?'shift_only':'all_required', server_push:cfg.server_push!==false };
}
function configSignature(cfg) { return JSON.stringify({enabled:cfg.enabled,required:cfg.required,slots:cfg.slots,window_minutes:cfg.window_minutes,grace_minutes:cfg.grace_minutes,alarm:cfg.alarm,audience:cfg.audience,server_push:cfg.server_push}); }
function tehranTargetDate(slotMinutes) { const current=tehranNow(); let delta=slotMinutes-current.minutes; if(delta<=0)delta+=1440; return new Date(Date.now()+Math.max(1000,delta*60000-current.seconds*1000)); }
async function ensurePresenceChannel() { try { await Notifications.setNotificationChannelAsync('presence_alarm',{name:'هشدار صحت‌سنجی حضور',description:'هشدارهای صحت‌سنجی حضور طبق تنظیمات سایت',importance:Notifications.AndroidImportance.MAX,sound:'presence_validation_alert.mp3',vibrationPattern:[0,700,300,700,300,1000],lockscreenVisibility:Notifications.AndroidNotificationVisibility.PUBLIC,bypassDnd:true,enableVibrate:true,enableLights:true}); } catch(_){} }
async function cancelPresenceSchedules() { try { const scheduled=await Notifications.getAllScheduledNotificationsAsync(); for(const item of scheduled||[]){const data=item?.content?.data||{}; if(data.type===PRESENCE_TYPE&&data.scheduled===true){try{await Notifications.cancelScheduledNotificationAsync(item.identifier);}catch(_){}}} }catch(_){} try{const keys=await AsyncStorage.getAllKeys();const old=keys.filter(k=>k.startsWith(SCHEDULE_PREFIX)||k.startsWith('presence_scheduled:'));if(old.length)await AsyncStorage.multiRemove(old);}catch(_){} }
async function scheduleConfiguredPresenceSlots(cfg) {
  if(!cfg.enabled||!cfg.required||!cfg.slots.length)return;
  await ensurePresenceChannel(); const now=tehranNow();
  for(const slot of cfg.slots){ const sm=slotToMinutes(slot); if(sm<0)continue; if(await AsyncStorage.getItem(`presence_done:${now.day}:${slot}`))continue; if(now.minutes>=sm&&now.minutes<sm+cfg.window_minutes)continue; const storageKey=`${SCHEDULE_PREFIX}${now.day}:${slot}`; if(await AsyncStorage.getItem(storageKey))continue;
    try{const id=await Notifications.scheduleNotificationAsync({content:{title:'صحت‌سنجی حضور',body:`لطفاً ظرف ${cfg.window_minutes} دقیقه سلفی و عکس خودروهای خط را ارسال کنید.`,sound:'presence_validation_alert.mp3',priority:Notifications.AndroidNotificationPriority.MAX,channelId:'presence_alarm',data:{type:PRESENCE_TYPE,slot,window_minutes:cfg.window_minutes,scheduled:true,source:'site_settings'}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:tehranTargetDate(sm),channelId:'presence_alarm'}});await AsyncStorage.setItem(storageKey,id||'1');}catch(_){}
  }
}

export default function PresenceGate() {
  const {user}=useAuth(); const [due,setDue]=useState(null); const cfgRef=useRef(null); const cfgSignatureRef=useRef(''); const pollRef=useRef(null); const dueRef=useRef(null); useEffect(()=>{dueRef.current=due;},[due]);
  const loadAndApplyConfig=useCallback(async({allowImmediate=true}={})=>{
    const raw=await request('/my/presence-config',{auth:true,noStore:true}); const cfg=normalizePresenceConfig(raw); cfgRef.current=cfg; const sig=configSignature(cfg);
    if(sig!==cfgSignatureRef.current){cfgSignatureRef.current=sig;await cancelPresenceSchedules();} await scheduleConfiguredPresenceSlots(cfg);
    if(!cfg.enabled||!cfg.required||!cfg.slots.length){if(!dueRef.current)setDue(null);return cfg;} if(!allowImmediate||dueRef.current)return cfg;
    const now=tehranNow(); for(const sl of cfg.slots){const sm=slotToMinutes(sl);if(sm<0||now.minutes<sm||now.minutes>=sm+cfg.window_minutes)continue;const key=`presence_done:${now.day}:${sl}`;if(await AsyncStorage.getItem(key))continue;const nk=`presence_notified:${now.day}:${sl}`;if(!(await AsyncStorage.getItem(nk))){await AsyncStorage.setItem(nk,'1');await notify('صحت‌سنجی حضور',`لطفاً ظرف ${cfg.window_minutes} دقیقه سلفی و عکس خودروهای خط را ارسال کنید.`,{type:PRESENCE_TYPE,slot:sl,window_minutes:cfg.window_minutes,immediate:true,source:'site_settings'});}setDue({slot:sl,windowMinutes:cfg.window_minutes,day:now.day,key});break;} return cfg;
  },[]);
  useEffect(()=>{if(!user)return;let alive=true;const check=async()=>{try{if(alive)await loadAndApplyConfig({allowImmediate:true});}catch(_){}};check();pollRef.current=setInterval(check,20000);return()=>{alive=false;if(pollRef.current)clearInterval(pollRef.current);};},[user,loadAndApplyConfig]);
  useEffect(()=>{if(!user)return;const openFromNotification=async(data={})=>{if(!data||data.type!==PRESENCE_TYPE)return;const immediate=data.immediate===true||data.immediate==='true'||data.immediate===1||data.immediate==='1';const cfg=cfgRef.current||normalizePresenceConfig({});const now=tehranNow();const sl=normalizeDigits(data.slot||'').trim();if(!immediate&&(!cfg.enabled||!cfg.required||!cfg.slots.includes(sl)))return;const key=immediate?`presence_immediate_done:${now.day}:${data.request_id||Date.now()}`:`presence_done:${now.day}:${sl}`;if(!immediate&&await AsyncStorage.getItem(key))return;setDue({slot:sl||cfg.slots[0],windowMinutes:Number(data.window_minutes||cfg.window_minutes||1),day:now.day,key,immediate});};const r1=Notifications.addNotificationReceivedListener(n=>openFromNotification(n?.request?.content?.data||{}).catch(()=>{}));const r2=Notifications.addNotificationResponseReceivedListener(r=>openFromNotification(r?.notification?.request?.content?.data||{}).catch(()=>{}));Notifications.getLastNotificationResponseAsync().then(r=>openFromNotification(r?.notification?.request?.content?.data||{})).catch(()=>{});const r3=AppState.addEventListener('change',st=>{if(st==='active'&&!dueRef.current)loadAndApplyConfig({allowImmediate:true}).catch(()=>{});});return()=>{try{r1.remove();}catch(_){}try{r2.remove();}catch(_){}try{r3.remove();}catch(_){} };},[user,loadAndApplyConfig]);
  useEffect(()=>{const alarmOn=cfgRef.current?cfgRef.current.alarm!==false:true;if(due&&alarmOn)startPresenceAlarm().catch(()=>{});else stopPresenceAlarm().catch(()=>{});return()=>{stopPresenceAlarm().catch(()=>{});};},[due]);
  if(!due)return null;
  const finish=async()=>{try{await stopPresenceAlarm();}catch(_){}try{await AsyncStorage.setItem(due.key,'1');}catch(_){}try{const scheduled=await Notifications.getAllScheduledNotificationsAsync();for(const item of scheduled||[]){const data=item?.content?.data||{};if(data.type===PRESENCE_TYPE&&data.scheduled===true&&data.slot===due.slot){try{await Notifications.cancelScheduledNotificationAsync(item.identifier);}catch(_){}}}}catch(_){}setDue(null);};
  return <View style={styles.fullscreenOverlay} pointerEvents="box-none"><View style={styles.fullscreenContent}><PresenceCheckModal slot={due.slot} windowMinutes={due.windowMinutes} onDone={finish} onExpire={finish} onStart={()=>stopPresenceAlarm().catch(()=>{})}/></View></View>;
}
const styles={fullscreenOverlay:{position:'absolute',top:0,right:0,bottom:0,left:0,zIndex:100000,elevation:100000,backgroundColor:'#000'},fullscreenContent:{flex:1,width:'100%',height:'100%',backgroundColor:'#000'}};
