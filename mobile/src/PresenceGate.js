import React,{useState,useEffect,useRef}from'react';
import{AppState,Modal,StyleSheet,View}from'react-native';
import AsyncStorage from'@react-native-async-storage/async-storage';
import{request}from'./api';
import{notify}from'./notify';
import{useAuth}from'./auth';
import PresenceCheckModal from'./PresenceCheckModal';
import{startPresenceAlarm,stopPresenceAlarm}from'./presenceAlarm';
import*as Notifications from'expo-notifications';
import{tehranGregorianParts}from'./jdate';

function tehranNow(){const p=tehranGregorianParts(new Date());if(!p){const d=new Date();return{day:d.toISOString().slice(0,10),minutes:d.getHours()*60+d.getMinutes()};}return{day:`${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`,minutes:p.hour*60+p.minute};}
function slotToMinutes(s){const m=/^(\d{2}):(\d{2})$/.exec(s);return m?(+m[1])*60+(+m[2]):-1;}
function notificationData(raw){if(!raw)return{};if(typeof raw==='string'){try{return JSON.parse(raw)}catch(e){return{}}}if(raw?.data&&typeof raw.data==='string'){try{return JSON.parse(raw.data)}catch(e){}}return raw?.data&&typeof raw.data==='object'?raw.data:raw;}

export default function PresenceGate(){
 const{user}=useAuth();
 const[due,setDue]=useState(null);
 const dueRef=useRef(null);
 const cfgRef=useRef(null);
 const mountedRef=useRef(false);

 const setDueStable=next=>{if(!mountedRef.current)return;dueRef.current=next;setDue(next);};

 useEffect(()=>{mountedRef.current=true;return()=>{mountedRef.current=false;dueRef.current=null}},[]);

 // زمان‌بندی عادی فقط وقتی ویزارد باز نیست polling می‌شود.
 // وجود یک ویزارد باز نباید با پاسخ موقت/ناقص تنظیمات باعث unmount شدن آن شود.
 useEffect(()=>{
  if(!user)return;
  let alive=true;
  const check=async()=>{
   if(!alive||dueRef.current)return;
   try{
    const cfg=await request('/my/presence-config',{auth:true,noStore:true});
    if(!alive)return;
    cfgRef.current=cfg||{};
    if(dueRef.current)return;
    if(!cfg?.enabled||!cfg?.required||!(cfg?.slots||[]).length){setDueStable(null);return;}
    const now=tehranNow(),win=Math.max(1,Number(cfg.window_minutes||1));
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
     if(!dueRef.current)setDueStable({slot:sl,windowMinutes:win,day:now.day,key,expiredKey,immediate:false});
     return;
    }
   }catch(e){}
  };
  check();
  const timer=setInterval(check,20000);
  return()=>{alive=false;clearInterval(timer);};
 },[user]);

 // اعلان عادی و «صحت‌سنجی فوری» هر دو از همین مسیر وارد Wizard می‌شوند.
 useEffect(()=>{
  if(!user)return;
  let alive=true;
  const openFromNotification=async(raw={})=>{
   const data=notificationData(raw);
   if(data?.type!=='presence_check'||!alive)return;
   const immediate=data.immediate===true||data.immediate==='true'||data.immediate===1||data.immediate==='1';
   if(dueRef.current)return;
   let cfg=cfgRef.current||{};
   if(!cfgRef.current){
    try{cfg=await request('/my/presence-config',{auth:true,noStore:true});cfgRef.current=cfg||{};}catch(e){cfg={};}
   }
   if(!alive||dueRef.current)return;
   const now=tehranNow();
   const sl=data.slot||((cfg.slots||[])[0])||`${String(Math.floor(now.minutes/60)).padStart(2,'0')}:${String(now.minutes%60).padStart(2,'0')}`;
   const requestId=String(data.request_id||`${now.day}_${sl}`);
   const key=immediate?`presence_immediate_done:${now.day}:${requestId}`:`presence_done:${now.day}:${sl}`;
   const expiredKey=`presence_expired:${now.day}:${sl}`;
   if(!immediate&&(await AsyncStorage.getItem(key)||await AsyncStorage.getItem(expiredKey)))return;
   if(!dueRef.current)setDueStable({slot:sl,windowMinutes:Math.max(1,Number(data.window_minutes||cfg.window_minutes||1)),day:now.day,key,expiredKey,immediate});
  };
  const handleResponse=r=>openFromNotification(r?.notification?.request?.content?.data||{}).catch(()=>{});
  const handleReceived=n=>openFromNotification(n?.request?.content?.data||{}).catch(()=>{});
  const r1=Notifications.addNotificationReceivedListener(handleReceived);
  const r2=Notifications.addNotificationResponseReceivedListener(handleResponse);
  let appSub=null;
  try{appSub=AppState.addEventListener('change',state=>{if(state==='active')Notifications.getLastNotificationResponseAsync().then(r=>{if(r)handleResponse(r)}).catch(()=>{})})}catch(e){}
  Notifications.getLastNotificationResponseAsync().then(r=>{if(r)handleResponse(r)}).catch(()=>{});
  return()=>{alive=false;try{r1.remove()}catch(e){}try{r2.remove()}catch(e){}try{appSub?.remove()}catch(e){}};
 },[user]);

 useEffect(()=>{
  const alarmOn=cfgRef.current?cfgRef.current.alarm!==false:true;
  if(due&&alarmOn)startPresenceAlarm().catch(()=>{});else stopPresenceAlarm().catch(()=>{});
  return()=>{stopPresenceAlarm().catch(()=>{})};
 },[due]);

 const finish=async(success=true)=>{
  const current=dueRef.current;
  if(!current)return;
  try{await stopPresenceAlarm()}catch(e){}
  if(success){try{await AsyncStorage.setItem(current.key,'1')}catch(e){}}
  else if(current.expiredKey&&!current.immediate){try{await AsyncStorage.setItem(current.expiredKey,'1')}catch(e){}}
  dueRef.current=null;
  if(mountedRef.current)setDue(null);
 };

 return <Modal
   visible={!!due}
   animationType="fade"
   transparent={false}
   statusBarTranslucent
   hardwareAccelerated
   presentationStyle="fullScreen"
   onRequestClose={()=>{}}
 >
   <View style={s.modalRoot}>
    {due?<PresenceCheckModal
      key={`${due.immediate?'immediate':'scheduled'}:${due.key}`}
      slot={due.slot}
      windowMinutes={due.windowMinutes}
      onDone={()=>finish(true)}
      onExpire={()=>finish(false)}
      onStart={()=>stopPresenceAlarm().catch(()=>{})}
    />:null}
   </View>
 </Modal>;
}
const s=StyleSheet.create({modalRoot:{flex:1,width:'100%',height:'100%',backgroundColor:'#fff'}});
