import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import Constants from 'expo-constants';
import { postOrQueue, request } from './api';
import { isVpnOn, vpnStatus } from './device';
import { getBatteryInfo } from './battery';
import { FEATURES } from './config';
import { isInShift } from './shiftCheck';
import { requestBackgroundLocationCompat } from './androidCompat';

export const BG_TASK='taxi-bg-location';

// موقعیت دقیقِ تازه؛ اگر دقت از حد مجاز بدتر باشد موقعیت برگردانده نمی‌شود.
export async function getAccuratePosition({samples=3,timeoutMs=8000,desiredAccuracy=20,maxAccuracy=25}={}){
 let best=null;
 for(let i=0;i<samples;i++){
  try{
   const p=await Promise.race([
    Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Highest,mayShowUserSettingsDialog:true}),
    new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),timeoutMs))
   ]);
   if(p?.coords){
    const acc=p.coords.accuracy??9999;
    if(!best||acc<(best.coords.accuracy??9999))best=p;
    if(acc<=desiredAccuracy)break;
   }
  }catch{}
 }
 const acc=best?.coords?.accuracy??9999;
 return best&&acc<=maxAccuracy?best:null;
}

// موقعیت سریع فقط از دادهٔ تازه و نسبتاً دقیق استفاده می‌کند؛ موقعیت قدیمی به‌عنوان fallback برگردانده نمی‌شود.
export async function getFastPosition({maxAgeMs=15000,timeoutMs=6000,maxAccuracy=80}={}){
 try{
  const last=await Location.getLastKnownPositionAsync({maxAge:maxAgeMs,requiredAccuracy:maxAccuracy});
  if(last?.coords){Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High,mayShowUserSettingsDialog:true}).catch(()=>{});return last;}
 }catch{}
 try{
  const p=await Promise.race([
   Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High,mayShowUserSettingsDialog:true}),
   new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),timeoutMs))
  ]);
  const acc=p?.coords?.accuracy??9999;
  if(p?.coords&&acc<=maxAccuracy)return p;
 }catch{}
 return null;
}

// موقعیت شبکه/GSM فقط وقتی برگردانده می‌شود که دقت قابل قبول داشته باشد؛ موقعیت کش‌شدهٔ قدیمی هرگز استفاده نمی‌شود.
export async function getGsmPosition({timeoutMs=7000,maxAccuracy=30}={}){
 try{
  const p=await Promise.race([
   Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Lowest}),
   new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),timeoutMs))
  ]);
  const acc=p?.coords?.accuracy??9999;
  if(p?.coords&&acc<=maxAccuracy)return{coords:p.coords,timestamp:p.timestamp,viaGsm:true};
 }catch{}
 return null;
}

export async function getTrackingPosition(){
 const gps=await getAccuratePosition({samples:3,timeoutMs:8000,desiredAccuracy:25,maxAccuracy:80});
 if(gps?.coords&&(gps.coords.accuracy==null||gps.coords.accuracy<=80))return{lat:gps.coords.latitude,lng:gps.coords.longitude,acc:gps.coords.accuracy,viaGsm:false,ts:gps.timestamp};
 const gsm=await getGsmPosition({timeoutMs:7000,maxAccuracy:150});
 if(gsm?.coords)return{lat:gsm.coords.latitude,lng:gsm.coords.longitude,acc:gsm.coords.accuracy,viaGsm:true,ts:gsm.timestamp};
 return null;
}

const IS_EXPO_GO=Constants.appOwnership==='expo'||Constants.executionEnvironment==='storeClient';
try{
 TaskManager.defineTask(BG_TASK,async({data,error})=>{
  if(error||!data)return;
  const{locations}=data;if(!locations?.length)return;
  const inShift=await isInShift().catch(()=>true);if(!inShift)return;
  const pings=locations.map(l=>({lat:l.coords.latitude,lng:l.coords.longitude,captured_at:new Date(l.timestamp).toISOString(),mocked:!!(l.mocked||l.coords.mocked)}));
  let vpn=false,vpnCountry=null;try{const v=await vpnStatus();vpn=v.on;vpnCountry=v.country}catch{}
  let battery=null;try{battery=await getBatteryInfo()}catch{}
  await postOrQueue('/locations',{vpn_on:vpn,vpn_country:vpnCountry,battery,pings}).catch(()=>{});
 });
}catch{}

let fgWatcher=null;
let networkFallbackInterval=null;
let trackingStartPromise=null;

export async function startTracking(){
 if(trackingStartPromise)return trackingStartPromise;
 trackingStartPromise=(async()=>{
  let fg;try{fg=await Location.requestForegroundPermissionsAsync()}catch{return}
  if(!fg?.granted)return;
  let intervalMs=60000;
  try{const cfg=await request('/app/version',{auth:false});const sec=parseInt(cfg?.location_interval_sec,10);if(sec&&sec>=5)intervalMs=sec*1000}catch{}
  try{const batt=await getBatteryInfo();if(batt&&!batt.charging){if(batt.level<=10)intervalMs=Math.round(intervalMs*3);else if(batt.level<=20)intervalMs=Math.round(intervalMs*1.75)}}catch{}
  try{if(fgWatcher?.remove){fgWatcher.remove();fgWatcher=null}}catch{}
  try{
   fgWatcher=await Location.watchPositionAsync(
    {accuracy:Location.Accuracy.High,timeInterval:Math.max(8000,Math.floor(intervalMs/2)),distanceInterval:20,mayShowUserSettingsDialog:true},
    async pos=>{
     let vpn=false,vpnCountry=null;try{const v=await vpnStatus();vpn=v.on;vpnCountry=v.country}catch{}
     const viaGsm=pos.coords.accuracy!=null&&pos.coords.accuracy>80;
     await postOrQueue('/locations',{vpn_on:vpn,vpn_country:vpnCountry,pings:[{lat:pos.coords.latitude,lng:pos.coords.longitude,captured_at:new Date(pos.timestamp).toISOString(),mocked:!!(pos.mocked||pos.coords.mocked),via_gsm:viaGsm,accuracy:pos.coords.accuracy,provider:viaGsm?'network':'gps'}]}).catch(()=>{});
    }
   );
  }catch{}
  try{if(networkFallbackInterval){clearInterval(networkFallbackInterval);networkFallbackInterval=null}}catch{}
  networkFallbackInterval=setInterval(async()=>{
   try{
    const inShift=await isInShift().catch(()=>true);if(!inShift)return;
    const pos=await getTrackingPosition();if(!pos)return;
    let vpn=false;try{vpn=await isVpnOn()}catch{}
    postOrQueue('/locations',{vpn_on:vpn,pings:[{lat:pos.lat,lng:pos.lng,captured_at:new Date(pos.ts||Date.now()).toISOString(),via_gsm:pos.viaGsm,accuracy:pos.acc,provider:pos.viaGsm?'network':'gps'}]}).catch(()=>{});
   }catch{}
  },Math.max(120000,intervalMs));
  if(FEATURES.bgTracking&&!IS_EXPO_GO){
   try{
    const bg=await requestBackgroundLocationCompat(Location);
    if(bg.granted){
     const running=await Location.hasStartedLocationUpdatesAsync(BG_TASK).catch(()=>false);
     if(running)try{await Location.stopLocationUpdatesAsync(BG_TASK)}catch{}
     await Location.startLocationUpdatesAsync(BG_TASK,{
      accuracy:Location.Accuracy.High,timeInterval:intervalMs,distanceInterval:25,pausesUpdatesAutomatically:false,activityType:Location.ActivityType.AutomotiveNavigation,showsBackgroundLocationIndicator:true,
      foregroundService:{notificationTitle:'خطیار',notificationBody:'نرم افزار خطیار فعال و به سرور متصل است',notificationColor:'#0d7a5f',killServiceOnDestroy:false}
     });
    }
   }catch{}
  }
 })();
 try{return await trackingStartPromise}finally{trackingStartPromise=null}
}

export async function isTrackingActive(){
 if(IS_EXPO_GO)return!!fgWatcher;
 try{return await Location.hasStartedLocationUpdatesAsync(BG_TASK).catch(()=>false)}catch{return false}
}
export async function stopTracking(){
 try{if(fgWatcher){fgWatcher.remove();fgWatcher=null}}catch{}
 try{if(networkFallbackInterval){clearInterval(networkFallbackInterval);networkFallbackInterval=null}}catch{}
 if(IS_EXPO_GO)return;
 try{const running=await Location.hasStartedLocationUpdatesAsync(BG_TASK).catch(()=>false);if(running)await Location.stopLocationUpdatesAsync(BG_TASK)}catch{}
}
