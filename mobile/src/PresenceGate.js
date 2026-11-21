import {presenceDeadline} from './presencePresentation';
import {onPresenceWizardState} from './presenceWizardLifecycle';
import React,{useState,useEffect,useRef}from'react';
import{AppState}from'react-native';
import AsyncStorage from'@react-native-async-storage/async-storage';
import{request}from'./api';
import{notify}from'./notify';
import{useAuth}from'./auth';
import{startPresenceAlarm,stopPresenceAlarm}from'./presenceAlarm';
import*as Notifications from'expo-notifications';
import{tehranGregorianParts}from'./jdate';
import {currentPresencePolicy, localAttendanceSession, ensureLocalRandomSchedule, localPresenceCompletions} from './presenceLocalSchedule';

function tehranNow(){const p=tehranGregorianParts(new Date());if(!p){const d=new Date();return{day:d.toISOString().slice(0,10),minutes:d.getHours()*60+d.getMinutes()};}return{day:`${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`,minutes:p.hour*60+p.minute};}
function slotToMinutes(s){const m=/^(\d{2}):(\d{2})$/.exec(s);return m?(+m[1])*60+(+m[2]):-1;}
function fixedSlotDeadline(slotMinutes,windowMinutes,nowMinutes,epochMs=Date.now()){
 const remaining=(slotMinutes+windowMinutes-nowMinutes)*60000-(epochMs%60000);
 return epochMs+Math.max(0,remaining);
}
function notificationData(raw){if(!raw)return{};if(typeof raw==='string'){try{return JSON.parse(raw)}catch(e){return{}}}if(raw?.data&&typeof raw.data==='string'){try{return JSON.parse(raw.data)}catch(e){}}return raw?.data&&typeof raw.data==='object'?raw.data:raw;}

export default function PresenceGate({navigationRef}){
 const{user}=useAuth();
 const[due,setDue]=useState(null);
 const[appActive,setAppActive]=useState(AppState.currentState==='active');
 const dueRef=useRef(null);
 const cfgRef=useRef(null);
 const mountedRef=useRef(false);
 const openedRef=useRef(false);
 const wizardReadyRef=useRef(false);
 const wizardWasActiveRef=useRef(false);
 const RANDOM_CACHE_KEY='presence_local_schedule_v2';
 const checkingRef=useRef(false);
 const openNotificationRef=useRef(null);
 const userId=Number(user?.id||0);

 const setDueStable=next=>{if(!mountedRef.current)return;dueRef.current=next;setDue(next);};

 useEffect(()=>{mountedRef.current=true;return()=>{mountedRef.current=false;dueRef.current=null}},[]);
 useEffect(()=>{const sub=AppState.addEventListener('change',state=>setAppActive(state==='active'));return()=>sub?.remove?.()},[]);
 useEffect(()=>onPresenceWizardState(({requestId,state})=>{
   const active=dueRef.current;
   if(!active||String(active.requestId||'')!==requestId)return;
   if(state==='ready'){
     wizardReadyRef.current=true;
     stopPresenceAlarm({dismissNotifications:true}).catch(()=>{});
   } else if(state==='completed'||state==='expired'){
     wizardReadyRef.current=false;
     openedRef.current=false;
     setDueStable(null);
     stopPresenceAlarm({dismissNotifications:true}).catch(()=>{});
   } else if(state==='hidden'){
     wizardReadyRef.current=false;
     openedRef.current=false;
     if(Date.now()<Number(active.deadlineMs))
       startPresenceAlarm(active.deadlineMs).catch(()=>{});
   }
 }),[]);

 // زمان‌بندی عادی فقط وقتی ویزارد باز نیست polling می‌شود.
 // وجود یک ویزارد باز نباید با پاسخ موقت/ناقص تنظیمات باعث unmount شدن آن شود.
 useEffect(()=>{
  if(!userId)return;
  let alive=true;
  const check=async()=>{
   if(!alive||dueRef.current||checkingRef.current)return;
   checkingRef.current=true;
   try{
    const cfg=await currentPresencePolicy(userId,request);
    if(!alive)return;
    cfgRef.current=cfg||{};
    if(dueRef.current)return;
    for(const item of cfg?.immediate_requests||[]){
     await openNotificationRef.current?.(item);
     if(!alive||dueRef.current)return;
    }
    if(!cfg?.enabled||cfg?.assigned===false){setDueStable(null);return;}
    const now=tehranNow(),win=Math.max(1,Number(cfg.window_minutes||1));

    // حالت تصادفی: زمان‌بندی از ورود محلی ساخته و مستقل از اتصال شبکه ذخیره می‌شود.
    if(cfg.random_enabled){
      const open=await localAttendanceSession(userId);
      if(!open)return;
      const schedule=await ensureLocalRandomSchedule(userId,open,cfg.window_minutes);
      if(!schedule?.items?.length||!schedule.attendance_id)return;
      for(const item of schedule.items){
        const at=Number(item.ts||0)*1000;
        if(!at)continue;
        const itemWin=Math.max(1,Number(item.window_minutes||win));
        const nowMs=Date.now();
        if(nowMs<at||nowMs>=at+itemWin*60000)continue;
        const requestId=String(item.request_id||('rnd_'+schedule.attendance_id+'_'+item.ts));
        const key='presence_random_done:'+requestId;
        const expiredKey='presence_random_expired:'+requestId;
        if(await AsyncStorage.getItem(key)||await AsyncStorage.getItem(expiredKey)||(await localPresenceCompletions())[requestId])continue;
        const notifKey='presence_random_notified:'+requestId;
        if(!await AsyncStorage.getItem(notifKey)){
          await AsyncStorage.setItem(notifKey,'1');
          notify('صحت‌سنجی حضور','لطفاً ظرف '+itemWin+' دقیقه سلفی و عکس خودروهای خط را ارسال کنید.',{type:'presence_check',slot:item.slot||'',window_minutes:itemWin,random:true,request_id:requestId});
        }
        setDueStable({slot:String(item.slot||''),windowMinutes:itemWin,deadlineMs:at+itemWin*60000,day:now.day,key,expiredKey,immediate:false,random:true,requestId});
        return;
      }
      return;
    }
    if(!(cfg?.slots||[]).length){setDueStable(null);return;}
    if(!await localAttendanceSession(userId))return;
    for(const sl of cfg.slots){
     const sm=slotToMinutes(sl);
     if(sm<0||now.minutes<sm||now.minutes>=sm+win)continue;
     const key=`presence_done:${now.day}:${sl}`,expiredKey=`presence_expired:${now.day}:${sl}`;
     if(await AsyncStorage.getItem(key)||await AsyncStorage.getItem(expiredKey))continue;
     const notifKey=`presence_notified:${now.day}:${sl}`;
     if(!await AsyncStorage.getItem(notifKey)){
      await AsyncStorage.setItem(notifKey,'1');
      notify('صحت‌سنجی حضور',`لطفاً ظرف ${win} دقیقه سلفی و عکس خودروهای خط را ارسال کنید.`,{type:'presence_check',slot:sl,window_minutes:win});
     }
     if(!dueRef.current)setDueStable({slot:sl,windowMinutes:win,deadlineMs:fixedSlotDeadline(sm,win,now.minutes),day:now.day,key,expiredKey,immediate:false,requestId:`${now.day}_${sl}`});
     return;
    }
   }catch(e){console.warn('presence schedule refresh failed:',e?.message||String(e));}
   finally{checkingRef.current=false;}
  };
  check();
  const timer=setInterval(check,20000);
  const sub=AppState.addEventListener('change',state=>{if(state==='active')check();});
  return()=>{alive=false;clearInterval(timer);sub?.remove?.();};
 },[userId]);

 // اعلان عادی و «صحت‌سنجی فوری» هر دو از همین مسیر وارد Wizard می‌شوند.
 useEffect(()=>{
  if(!user)return;
  let alive=true;
  const openFromNotification=async(raw={})=>{
   const data=notificationData(raw);
   if(data?.type!=='presence_check'||!alive)return;
   if(navigationRef?.getCurrentRoute?.()?.name==='PresenceCheckWizard')return; // Route presence alone does not prove an interactive wizard.
   const immediate=data.immediate===true||data.immediate==='true'||data.immediate===1||data.immediate==='1';
   if(dueRef.current)return;
   let cfg=cfgRef.current||{};
   if(!immediate&&!cfgRef.current){
    try{cfg=await currentPresencePolicy(userId,request);cfgRef.current=cfg||{};}catch(e){cfg={};}
   }
   if(!alive||dueRef.current)return;
   const now=tehranNow();
   const sl=data.slot||((cfg.slots||[])[0])||`${String(Math.floor(now.minutes/60)).padStart(2,'0')}:${String(now.minutes%60).padStart(2,'0')}`;
   const requestId=String(data.request_id||`${now.day}_${sl}`);
   const random=!!(data.random===true||data.random==='true'||data.random===1||data.random==='1');
   const key=immediate?`presence_immediate_done:${now.day}:${requestId}`:random?`presence_random_done:${requestId}`:`presence_done:${now.day}:${sl}`;
   const expiredKey=random?`presence_random_expired:${requestId}`:`presence_expired:${now.day}:${sl}`;
   if(await AsyncStorage.getItem(key)||(await localPresenceCompletions())[requestId])return;
   if(!immediate&&await AsyncStorage.getItem(expiredKey))return;
   const notificationWindow=Math.max(1,Number(data.window_minutes||cfg.window_minutes||1));
   const randomTimestamp= random ? /^rnd_\d+_(\d{10})$/.exec(requestId)?.[1] : null;
   const requestTs=Number(data.ts||data.at_ts||randomTimestamp||0);
   const legacyImmediateMs=immediate&&data.immediate_at
     ? Date.parse(String(data.immediate_at).replace(' ','T')+'+03:30') : NaN;
   const requestedAtMs=requestTs>0?requestTs*1000:Number.isFinite(legacyImmediateMs)?legacyImmediateMs:Date.now();
   const deliveredAtMs=Number(data.delivered_at_ms)||requestedAtMs;
   const deadlineMs=deliveredAtMs+notificationWindow*60000;
   if(!alive||(!data.delivered_at_ms&&Date.now()>=deadlineMs))return;
   if(!dueRef.current)setDueStable({slot:sl,windowMinutes:notificationWindow,deadlineMs,day:now.day,key,expiredKey,immediate,random,requestId});
  };
  openNotificationRef.current=openFromNotification;
  const handleResponse=r=>openFromNotification({...r?.notification?.request?.content?.data,delivered_at_ms:r?.notification?.date}).catch(()=>{});
  const handleReceived=n=>openFromNotification({...n?.request?.content?.data,delivered_at_ms:n?.date||Date.now()}).catch(()=>{});
  const r1=Notifications.addNotificationReceivedListener(handleReceived);
  const r2=Notifications.addNotificationResponseReceivedListener(handleResponse);
  const recoverNotifications=async()=>{
   try{for(const n of await Notifications.getPresentedNotificationsAsync())await handleReceived(n);}catch(_){}
   try{const response=await Notifications.getLastNotificationResponseAsync();if(response)await handleResponse(response);}catch(_){}
  };
  let appSub=null;
  try{appSub=AppState.addEventListener('change',state=>{if(state==='active')recoverNotifications()})}catch(e){}
  recoverNotifications();
  return()=>{alive=false;openNotificationRef.current=null;try{r1.remove()}catch(e){}try{r2.remove()}catch(e){}try{appSub?.remove()}catch(e){}};
 },[userId]);

 // درخواست فعال به یک Route مستقل تبدیل می‌شود؛ دیگر Modal/Overlay مالک lifecycle دوربین نیست.
 useEffect(()=>{
  if(!navigationRef)return;
  const onState=()=>{
   if(!navigationRef.isReady())return;
   const route=navigationRef.getCurrentRoute?.();
   if(route?.name==='PresenceCheckWizard'){
    wizardWasActiveRef.current=true;
    return;
   }
   if(wizardWasActiveRef.current){
    wizardWasActiveRef.current=false;
    openedRef.current=false;
    wizardReadyRef.current=false;
    // A still-pending request must not lose its sound merely because navigation changed.
    if(dueRef.current&&Date.now()<dueRef.current.deadlineMs)
      startPresenceAlarm(dueRef.current.deadlineMs).catch(()=>{});
   }
  };
  const sub=navigationRef.addListener?.('state',onState);
  return()=>{try{sub?.remove?.()}catch(e){}};
 },[navigationRef]);

 useEffect(()=>{
  if(!due||!navigationRef?.isReady?.()||openedRef.current||!appActive)return;

  openedRef.current=true;
  wizardWasActiveRef.current=false;
  wizardReadyRef.current=false;
  let alive=true;
  (async()=>{try{
   const startKey='presence_wizard_started:'+userId+':'+due.requestId;
   const saved=Number(await AsyncStorage.getItem(startKey));
   const startedAt=saved||Date.now();
   if(!saved)await AsyncStorage.setItem(startKey,String(startedAt));
   if(!alive){openedRef.current=false;return;}
   navigationRef.navigate('PresenceCheckWizard',{
    slot:due.slot,
    windowMinutes:due.windowMinutes,
    deadlineMs:Number(due.deadlineMs)||presenceDeadline(startedAt,due.windowMinutes),
    day:due.day,
    key:due.key,
    expiredKey:due.expiredKey,
    immediate:!!due.immediate,
    requestId:due.requestId||'',
    random:!!due.random
   });
  }catch(e){
   openedRef.current=false;
   startPresenceAlarm(due.deadlineMs).catch(()=>{});
  }})();
  return()=>{alive=false;};
 },[due,navigationRef,appActive]);

 useEffect(()=>{
  const alarmOn=cfgRef.current?cfgRef.current.alarm!==false:true;
  if(due&&alarmOn&&!wizardReadyRef.current)
    startPresenceAlarm(due.deadlineMs).catch(()=>{});
  else if(!due)stopPresenceAlarm().catch(()=>{});
  // Do not stop a native foreground alarm on a navigation-effect cleanup.
  return()=>{};
 },[due]);

 return null;
}
