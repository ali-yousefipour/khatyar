import React,{useCallback,useEffect,useRef,useState}from'react';
import{AppState,Linking,ScrollView,StyleSheet,Text,TouchableOpacity,View}from'react-native';
import*as Notifications from'expo-notifications';
import*as Location from'expo-location';
import*as Network from'expo-network';
import*as Camera from'expo-camera';
import*as IntentLauncher from'expo-intent-launcher';
import AsyncStorage from'@react-native-async-storage/async-storage';
import{C,FONT}from'./theme';
import{useAuth}from'./auth';

const CHECK_INTERVAL_MS=5000;
const CAMERA_EXPLANATION_KEY='khatyar_camera_permission_explained_v2';

async function callModuleAsync(module,name,fallback){
  try{
    const fn=module&&module[name];
    if(typeof fn!=='function')return fallback;
    return await fn.call(module);
  }catch{return fallback}
}

async function checkVpn(){
  const st=await callModuleAsync(Network,'getNetworkStateAsync',null);
  try{
    const vpnType=Network&&Network.NetworkStateType&&Network.NetworkStateType.VPN;
    if(st&&vpnType&&st.type===vpnType)return true;
  }catch{}
  try{
    const SecurityCheck=require('../modules/security-check').default||require('../modules/security-check');
    const fn=SecurityCheck&&SecurityCheck.getVpnNetworkInfoAsync;
    if(typeof fn==='function'){
      const info=await fn.call(SecurityCheck);
      return info?.transportVpn===true||!!(Array.isArray(info?.activeTunnelInterfaces)&&info.activeTunnelInterfaces.length);
    }
  }catch{}
  return false;
}
async function openLocationSettings(){try{const fn=IntentLauncher&&IntentLauncher.startActivityAsync;if(typeof fn==='function')await fn.call(IntentLauncher,'android.settings.LOCATION_SOURCE_SETTINGS');else await Linking.openSettings()}catch{try{await Linking.openSettings()}catch{}}}
async function openVpnSettings(){try{const fn=IntentLauncher&&IntentLauncher.startActivityAsync;if(typeof fn==='function')await fn.call(IntentLauncher,'android.settings.VPN_SETTINGS');else await Linking.openSettings()}catch{try{await Linking.openSettings()}catch{}}}

export default function PermissionGuard({children}){
  const{user}=useAuth();
  const exempt=!!user&&(Number(user.security_exempt||0)===1||user.security_exempt===true);
  const[runtimeIssue,setRuntimeIssue]=useState(null);
  const[cameraExplanation,setCameraExplanation]=useState(false);
  const[checking,setChecking]=useState(false);
  const inFlight=useRef(false);
  const mounted=useRef(true);

  const check=useCallback(async()=>{
    if(inFlight.current||!mounted.current)return;
    inFlight.current=true;setChecking(true);
    try{
      if(exempt){setRuntimeIssue(null);setCameraExplanation(false);return;}

      // 1) اعلان‌ها؛ در پس‌زمینه و بدون متن مرحله‌ای بررسی می‌شوند.
      const notification=await callModuleAsync(Notifications,'getPermissionsAsync',{status:'denied'});
      if(notification?.status!=='granted'){
        if(notification?.status==='undetermined'){
          const requested=await callModuleAsync(Notifications,'requestPermissionsAsync',null);
          if(requested?.status==='granted'){setRuntimeIssue(null);return;}
        }
        setRuntimeIssue({type:'notifications'});setCameraExplanation(false);return;
      }

      // 2) VPN؛ تا زمان خاموش شدن ورود مسدود است.
      if(await checkVpn()){setCameraExplanation(false);setRuntimeIssue({type:'vpn'});return;}
      setRuntimeIssue(null);

      // 3) دوربین؛ قبل از درخواست، یک‌بار توضیح داده می‌شود.
      const cam=await callModuleAsync(Camera,'getCameraPermissionsAsync',{granted:false,status:'denied'});
      if(!cam?.granted){
        const explained=await AsyncStorage.getItem(CAMERA_EXPLANATION_KEY).catch(()=>null);
        if(!explained){setCameraExplanation(true);return;}
        if(cam?.status==='undetermined'){
          const requested=await callModuleAsync(Camera,'requestCameraPermissionsAsync',null);
          if(requested?.granted){setCameraExplanation(false);setRuntimeIssue(null);return;}
        }
        setRuntimeIssue({type:'camera'});setCameraExplanation(false);return;
      }
      setCameraExplanation(false);

      // 4) مجوز موقعیت و سپس روشن بودن سرویس GPS.
      const locationPerm=await callModuleAsync(Location,'getForegroundPermissionsAsync',{granted:false,status:'denied'});
      if(!locationPerm?.granted){
        if(locationPerm?.status==='undetermined'){
          const requested=await callModuleAsync(Location,'requestForegroundPermissionsAsync',null);
          if(requested?.granted){setRuntimeIssue(null);return;}
        }
        setRuntimeIssue({type:'locationPermission'});return;
      }
      const services=await callModuleAsync(Location,'hasServicesEnabledAsync',false);
      if(!services){setRuntimeIssue({type:'gps'});return;}
      setRuntimeIssue(null);
    }finally{inFlight.current=false;if(mounted.current)setChecking(false)}
  },[exempt]);

  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);
  useEffect(()=>{check();if(exempt)return undefined;const iv=setInterval(check,CHECK_INTERVAL_MS);const sub=AppState.addEventListener('change',state=>{if(state==='active')check()});return()=>{clearInterval(iv);sub.remove()};},[check,exempt]);

  const handleCameraExplanation=async()=>{
    await AsyncStorage.setItem(CAMERA_EXPLANATION_KEY,'1').catch(()=>{});
    setCameraExplanation(false);
    const requested=await callModuleAsync(Camera,'requestCameraPermissionsAsync',null);
    if(requested?.granted)check();else setRuntimeIssue({type:'camera'});
  };

  const issueContent={
    notifications:{icon:'🔔',title:'دسترسی اعلان‌ها لازم است',text:'برای دریافت اعلان‌های کاری و هشدارهای سامانه، دسترسی اعلان‌ها را فعال کنید.',button:'فعال‌سازی اعلان‌ها'},
    vpn:{icon:'🛡️',title:'VPN روشن است',text:'برای ورود به برنامه باید VPN یا فیلترشکن خاموش باشد. پس از خاموش کردن، برنامه به‌صورت خودکار وضعیت را بررسی می‌کند.',button:'باز کردن تنظیمات VPN'},
    camera:{icon:'📷',title:'دسترسی دوربین لازم است',text:'دوربین فقط در هنگام صحت‌سنجی حضور و پس از شروع همان فرایند استفاده می‌شود و خارج از آن فرایند، برنامه از دوربین استفاده نمی‌کند.',button:'رفتن به تنظیمات دوربین'},
    locationPermission:{icon:'📍',title:'دسترسی موقعیت مکانی لازم است',text:'برای ثبت حضور و کنترل موقعیت کاری، اجازه دسترسی به موقعیت مکانی لازم است.',button:'فعال‌سازی موقعیت مکانی'},
    gps:{icon:'📍',title:'موقعیت‌یابی دستگاه خاموش است',text:'برای ادامه ورود، Location/GPS دستگاه را روشن کنید. پس از برگشت، برنامه به‌صورت خودکار دوباره بررسی می‌کند.',button:'روشن کردن موقعیت‌یابی'}
  };
  const blocking=runtimeIssue?issueContent[runtimeIssue.type]:null;

  return <View style={{flex:1}}>{children}
    {cameraExplanation&&<View style={s.overlay}><ScrollView contentContainerStyle={s.box}><Text style={s.icon}>📷</Text><Text style={s.title}>مجوز استفاده از دوربین</Text><Text style={s.sub}>دوربین فقط برای صحت‌سنجی حضور و فقط پس از شروع فرایند صحت‌سنجی استفاده می‌شود. خارج از آن فرایند، برنامه از دوربین استفاده نمی‌کند.</Text><TouchableOpacity style={s.btn} onPress={handleCameraExplanation}><Text style={s.btnTxt}>تأیید و درخواست دسترسی</Text></TouchableOpacity></ScrollView></View>}
    {blocking&&<View style={s.overlay}><ScrollView contentContainerStyle={s.box}><Text style={s.icon}>{blocking.icon}</Text><Text style={s.title}>{blocking.title}</Text><Text style={s.sub}>{blocking.text}</Text><TouchableOpacity style={s.btn} disabled={checking} onPress={async()=>{if(runtimeIssue.type==='notifications'){const r=await callModuleAsync(Notifications,'requestPermissionsAsync',null);if(r?.status==='granted'){check();return}}else if(runtimeIssue.type==='vpn'){await openVpnSettings()}else if(runtimeIssue.type==='gps'){await openLocationSettings()}else{try{await Linking.openSettings()}catch{}}check()}}><Text style={s.btnTxt}>{blocking.button}</Text></TouchableOpacity></ScrollView></View>}
  </View>;
}

const s=StyleSheet.create({overlay:{position:'absolute',inset:0,backgroundColor:'#0e141f',zIndex:99999},box:{flexGrow:1,padding:24,paddingTop:70,alignItems:'center',justifyContent:'center'},icon:{fontSize:52,marginBottom:14},title:{fontFamily:FONT.bold,color:'#fff',fontSize:19,textAlign:'center',marginBottom:12},sub:{fontFamily:FONT.regular,color:'#aab4c5',fontSize:14,textAlign:'center',lineHeight:25,marginBottom:22},btn:{backgroundColor:C.brand,borderRadius:12,paddingVertical:14,paddingHorizontal:24,minWidth:'82%',alignItems:'center'},btnTxt:{fontFamily:FONT.bold,color:'#fff',fontSize:14}});
