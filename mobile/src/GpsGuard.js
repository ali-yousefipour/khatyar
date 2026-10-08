/**
 * نگهبان GPS پس از ورود کاربر.
 * PermissionGuard مجوزها و روشن بودن GPS را قبل از ورود کنترل می‌کند.
 * این نگهبان فقط در نشست واردشده، قطع شدن GPS را پایش می‌کند.
 */
import React,{useEffect,useState,useCallback}from'react';
import{View,Text,TouchableOpacity,StyleSheet,AppState,Linking}from'react-native';
import*as IntentLauncher from'expo-intent-launcher';
import*as Location from'expo-location';
import{FONT}from'./theme';
import{useAuth}from'./auth';
import{getAppConfig}from'./appconfig';
import{postOrQueue,request}from'./api';

export default function GpsGuard({children}){
 const{user}=useAuth();
 const exempt=Number(user?.security_exempt||0)===1||user?.security_exempt===true;
 const[gpsOff,setGpsOff]=useState(false),[checking,setChecking]=useState(false),[intervalMs]=useState(30*60*1000),[attendanceOpen,setAttendanceOpen]=useState(false);
 const check=useCallback(async()=>{if(!user||exempt){setGpsOff(false);setAttendanceOpen(false);return}try{const timer=await request('/my/work-timer',{noStore:true,timeoutMs:7000});const required=!!timer?.gps_work_required;const open=!!timer?.open;setAttendanceOpen(required&&open);if(!required||!open){setGpsOff(false);return}const enabled=await Location.hasServicesEnabledAsync();const off=!enabled;setGpsOff(off);if(off)postOrQueue('/activity/telemetry',{kind:'gps_off',at:new Date().toISOString(),meta:{source:'foreground_watchdog',interval_minutes:30}}).catch(()=>{})}catch{setGpsOff(false)}},[user?.id,exempt]);
 // در الزام کارکرد با GPS، فاصلهٔ پایش دقیقاً ۳۰ دقیقه است؛ تنظیم پایش عمومی نباید آن را کوتاه یا بلند کند.
 useEffect(()=>{if(!user||exempt){setGpsOff(false);setAttendanceOpen(false);return undefined}check();const iv=setInterval(check,intervalMs);const sub=AppState.addEventListener('change',s=>{if(s==='active')check()});return()=>{clearInterval(iv);sub.remove()}},[check,user?.id,exempt,intervalMs]);
 const recheck=async()=>{setChecking(true);await check();setChecking(false)};
 if(!user||exempt||!attendanceOpen||!gpsOff)return children? <>{children}</>:null;
 const openLocationSettings=async()=>{try{await IntentLauncher.startActivityAsync('android.settings.LOCATION_SOURCE_SETTINGS')}catch{try{await Linking.openSettings()}catch{}}};
 return <View style={s.overlay}><Text style={s.icon}>📍</Text><Text style={s.title}>سرویس موقعیت‌یابی خاموش است</Text><Text style={s.sub}>برای ادامه فعالیت لازم است Location/GPS دستگاه روشن باشد. پس از روشن کردن، برنامه به‌صورت خودکار بررسی می‌کند.</Text><TouchableOpacity style={s.btn} onPress={openLocationSettings}><Text style={s.btnTxt}>روشن کردن موقعیت‌یابی</Text></TouchableOpacity><TouchableOpacity style={[s.btn,s.btn2]} onPress={recheck} disabled={checking}><Text style={s.btnTxt}>{checking?'در حال بررسی…':'بررسی مجدد'}</Text></TouchableOpacity></View>
}
const s=StyleSheet.create({overlay:{position:'absolute',inset:0,backgroundColor:'#0e141f',alignItems:'center',justifyContent:'center',padding:28,zIndex:9999},icon:{fontSize:56,marginBottom:14},title:{fontFamily:FONT.bold,color:'#fff',fontSize:18,textAlign:'center',marginBottom:10},sub:{fontFamily:FONT.regular,color:'#9aa6bd',fontSize:14,textAlign:'center',lineHeight:24,marginBottom:24},btn:{backgroundColor:'#0d7a5f',borderRadius:12,paddingVertical:14,paddingHorizontal:36,width:'100%',alignItems:'center',marginBottom:12},btn2:{backgroundColor:'#2a3445'},btnTxt:{fontFamily:FONT.bold,color:'#fff',fontSize:15}});
