import React,{createContext,useContext,useEffect,useState}from'react';
import{AppState}from'react-native';
import{afterUiReady}from'./androidCompat';
import*as SecureStore from'expo-secure-store';
import{request,loginRequest,requestLoginOtp,verifyLoginOtp,setTokens,loadTokens,clearTokens}from'./api';
import{getDeviceId,getDeviceModel,securitySignals}from'./device';
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

export function AuthProvider({children}){
 const[user,setUser]=useState(null),[loading,setLoading]=useState(true);
 useEffect(()=>{(async()=>{try{const token=await loadTokens();if(token){try{const me=await request('/auth/me');setUser(me.user);beginActivity()}catch{await clearTokens()}}}catch{}finally{setLoading(false)}})()},[]);
 useEffect(()=>{const sub=AppState.addEventListener('change',st=>{if(st==='active'){try{startNotifyPolling()}catch{}}else{try{stopNotifyPolling()}catch{}}});return()=>sub.remove()},[]);
 async function login(username,password,remember){
  const device_id=await getDeviceId();
  const sig=await securitySignals();
  const d=await loginRequest({username,password,device_id,device_type:'android',device_model:getDeviceModel(),...sig});
  await setTokens(d.access,d.refresh);await SecureStore.setItemAsync('remember','1');setUser(d.user);beginActivity();return d.user;
 }
 async function loginOtpRequest(mobile){await requestLoginOtp(mobile)}
 async function loginOtpVerify(mobile,code){
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
