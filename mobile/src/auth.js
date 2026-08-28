import React,{createContext,useContext,useEffect,useState}from'react';
import{AppState}from'react-native';
import*as Notifications from'expo-notifications';
import*as Camera from'expo-camera';
import*as Location from'expo-location';
import*as Network from'expo-network';
import{afterUiReady}from'./androidCompat';
import*as SecureStore from'expo-secure-store';
import{request,loginRequest,requestLoginOtp,verifyLoginOtp,setTokens,loadTokens,clearTokens}from'./api';
import{getDeviceId,getDeviceModel,securitySignals,ensureGpsOn,isMockLocation}from'./device';
import{startTracking,stopTracking}from'./location';
import{startTelemetry,stopTelemetry,sendTelemetry}from'./telemetry';
import{startVpnMonitor,stopVpnMonitor}from'./vpnMonitor';
import{startHealthMonitor,stopHealthMonitor,flushHealthQueue}from'./healthMonitor';
import{getAppConfig}from'./appconfig';
import{startNotifyPolling,stopNotifyPolling}from'./notify';
import{registerPush}from'./push';

const AuthCtx=createContext(null);export const useAuth=()=>useContext(AuthCtx);
let activityStartPromise=null;
async function beginActivityNow(){
 if(activityStartPromise)return activityStartPromise;
 activityStartPromise=(async()=>{try{registerPush()}catch{}try{sendTelemetry('session_start')}catch{}
  let gpsCheckSeconds=60,vpnCheckSeconds=60,stationCheckSeconds=60;
  try{const cfg=await getAppConfig();if(cfg){gpsCheckSeconds=cfg.gps_check_seconds||60;vpnCheckSeconds=cfg.vpn_check_seconds||60;stationCheckSeconds=cfg.station_check_seconds||60}}catch{}
  try{startTelemetry({gpsCheckSeconds,vpnCheckSeconds,stationCheckSeconds})}catch{}
  try{startVpnMonitor({intervalSeconds:vpnCheckSeconds})}catch{}
  try{startHealthMonitor({intervalSeconds:300});flushHealthQueue().catch(()=>{})}catch{}
  try{await startTracking()}catch{}
  try{startNotifyPolling()}catch{}
 })();
 try{return await activityStartPromise}finally{activityStartPromise=null}
}
function beginActivity(){return afterUiReady(()=>beginActivityNow(),1200)}

async function ensureLoginRequirements(){
 const n=await Notifications.getPermissionsAsync().catch(()=>({status:'denied'}));
 if(n.status!=='granted')throw new Error('دسترسی اعلان‌ها فعال نیست. ابتدا اجازه اعلان‌ها را فعال کنید.');
 let vpn=false;
 try{const st=await Network.getNetworkStateAsync();vpn=st?.type===Network.NetworkStateType.VPN}catch{}
 try{const SecurityCheck=require('../modules/security-check').default||require('../modules/security-check');const info=await SecurityCheck?.getVpnNetworkInfoAsync?.();vpn=vpn||info?.transportVpn===true||!!(Array.isArray(info?.activeTunnelInterfaces)&&info.activeTunnelInterfaces.length)}catch{}
 if(vpn)throw new Error('برای ورود به برنامه باید VPN یا فیلترشکن خاموش باشد.');
 const cam=await Camera.getCameraPermissionsAsync().catch(()=>({granted:false,status:'denied'}));
 if(!cam.granted)throw new Error('دسترسی دوربین فعال نیست. این دسترسی برای صحت‌سنجی حضور لازم است.');
 const loc=await Location.getForegroundPermissionsAsync().catch(()=>({granted:false,status:'denied'}));
 if(!loc.granted)throw new Error('دسترسی موقعیت مکانی فعال نیست.');
 const gps=await Location.hasServicesEnabledAsync().catch(()=>false);
 if(!gps)throw new Error('برای ورود به برنامه باید GPS/Location روشن باشد.');
}

export function AuthProvider({children}){
 const[user,setUser]=useState(null),[loading,setLoading]=useState(true);
 useEffect(()=>{(async()=>{try{const token=await loadTokens();if(token){try{await ensureLoginRequirements();const me=await request('/auth/me');setUser(me.user);beginActivity()}catch{await clearTokens()}}}catch{}finally{setLoading(false)}})()},[]);
 useEffect(()=>{const sub=AppState.addEventListener('change',st=>{if(st==='active'){try{startNotifyPolling()}catch{}}else{try{stopNotifyPolling()}catch{}}});return()=>sub.remove()},[]);
 async function login(username,password,remember){
  await ensureLoginRequirements();
  const device_id=await getDeviceId();
  const sig=await securitySignals();
  const d=await loginRequest({username,password,device_id,device_type:'android',device_model:getDeviceModel(),...sig});
  await setTokens(d.access,d.refresh);await SecureStore.setItemAsync('remember','1');setUser(d.user);beginActivity();return d.user;
 }
 async function loginOtpRequest(mobile){await ensureLoginRequirements();await requestLoginOtp(mobile)}
 async function loginOtpVerify(mobile,code){
  await ensureLoginRequirements();
  const device_id=await getDeviceId();
  const d=await verifyLoginOtp({mobile,code,device_id,device_type:'android',device_model:getDeviceModel()});
  await setTokens(d.access,d.refresh);await SecureStore.setItemAsync('remember','1');setUser(d.user);beginActivity();return d.user;
 }
 async function logout(){try{await request('/auth/logout',{method:'POST'})}catch(e){throw new Error((e&&e.message)||'خروج ممکن نیست')}
  try{sendTelemetry('session_end');stopTelemetry();stopVpnMonitor();stopHealthMonitor();stopNotifyPolling()}catch{}try{await stopTracking()}catch{}
  await clearTokens();await SecureStore.setItemAsync('remember','0');setUser(null);
 }
 async function refreshUser(){try{const me=await request('/auth/me');setUser(me.user);return me.user}catch{return null}}
 return <AuthCtx.Provider value={{user,loading,login,loginOtpRequest,loginOtpVerify,logout,refreshUser}}>{children}</AuthCtx.Provider>;
}
