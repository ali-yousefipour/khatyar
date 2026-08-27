import React,{useEffect,useState,useCallback}from'react';
import{View,Text,TouchableOpacity,StyleSheet,Linking,AppState,ScrollView}from'react-native';
import AsyncStorage from'@react-native-async-storage/async-storage';
import*as Location from'expo-location';import*as Notifications from'expo-notifications';import*as Network from'expo-network';
import{C,FONT}from'./theme';import{useAuth}from'./auth';

const WAIT_MS=5000;
const CHECK_INTERVAL_MS=60*60*1000;
const BATTERY_KEY='battery_opt_confirmed_v1';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function checkDeveloperOptions(){
  try{
    const{NativeModules}=require('react-native');
    if(NativeModules?.KhatyarSecurity?.isDeveloperOptionsEnabled){
      return!!(await NativeModules.KhatyarSecurity.isDeveloperOptionsEnabled());
    }
  }catch{}
  // Expo 57 does not expose Settings.Secure/ADB_ENABLED directly. Do not falsely block the user.
  return false;
}
async function checkVpn(){
  try{const state=await Network.getNetworkStateAsync();return String(state?.type||'').toUpperCase().includes('VPN')}catch{return false}
}
async function checkMockLocation(){
  try{const p=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Low,maximumAge:15000});return!!p?.mocked}catch{return false}
}
async function checkPermissions(){
  const issues=[];
  try{if((await Location.getForegroundPermissionsAsync()).status!=='granted')issues.push({key:'locationPermission',title:'اجازه موقعیت مکانی',action:()=>Location.requestForegroundPermissionsAsync()})}catch{}
  try{const Camera=require('expo-camera');if(!(await Camera.getCameraPermissionsAsync()).granted)issues.push({key:'camera',title:'اجازه دوربین',action:()=>Camera.requestCameraPermissionsAsync()})}catch{}
  try{if((await Notifications.getPermissionsAsync()).status!=='granted')issues.push({key:'notifications',title:'اجازه اعلان‌ها',action:()=>Notifications.requestPermissionsAsync()})}catch{}
  return issues;
}

export default function PermissionGuard({children}){
  const{user}=useAuth();
  const exempt=Number(user?.security_exempt||0)===1||user?.security_exempt===true;
  const[stage,setStage]=useState('در حال آماده‌سازی');
  const[issues,setIssues]=useState([]);
  const[ready,setReady]=useState(false);
  const[batteryConfirmed,setBatteryConfirmed]=useState(true);

  const runCheck=useCallback(async()=>{
    if(exempt){setReady(true);return;}
    setReady(false);setIssues([]);
    setStage('بررسی خاموش بودن Developer Options');
    if(await checkDeveloperOptions())setIssues(x=>[...x,{key:'developer',title:'Developer Options فعال است',detail:'گزینه‌های توسعه‌دهنده را خاموش کنید.'}]);
    await delay(WAIT_MS);
    setStage('بررسی روشن بودن GPS');
    if(!(await Location.hasServicesEnabledAsync().catch(()=>true)))setIssues(x=>[...x,{key:'gps',title:'GPS / موقعیت‌یابی خاموش است',detail:'موقعیت‌یابی دستگاه را روشن کنید.'}]);
    await delay(WAIT_MS);
    setStage('بررسی خاموش بودن VPN');
    if(await checkVpn())setIssues(x=>[...x,{key:'vpn',title:'VPN فعال است',detail:'VPN را خاموش کنید و سپس بررسی مجدد را بزنید.'}]);
    await delay(WAIT_MS);
    setStage('بررسی غیرفعال بودن موقعیت جعلی');
    if(await checkMockLocation())setIssues(x=>[...x,{key:'mock',title:'موقعیت جعلی فعال است',detail:'Mock/Fake Location را غیرفعال کنید.'}]);
    const permissionIssues=await checkPermissions();
    if(permissionIssues.length)setIssues(x=>[...x,...permissionIssues]);
    setBatteryConfirmed(!!(await AsyncStorage.getItem(BATTERY_KEY).catch(()=>null)));
    setStage('بررسی کامل شد');setReady(true);
  },[exempt]);

  useEffect(()=>{
    runCheck();
    const interval=setInterval(runCheck,CHECK_INTERVAL_MS);
    const sub=AppState.addEventListener('change',state=>{if(state==='active')runCheck()});
    return()=>{clearInterval(interval);sub.remove()};
  },[runCheck]);

  if(!ready)return <View style={s.overlay}><Text style={s.title}>{stage}</Text><Text style={s.sub}>هر مرحله با فاصله ۵ ثانیه انجام می‌شود تا فشار پردازشی دستگاه کاهش یابد.</Text></View>;

  if(issues.length)return <View style={s.overlay}><ScrollView contentContainerStyle={s.box}><Text style={s.icon}>⚠</Text><Text style={s.title}>بررسی امنیتی نیاز به اقدام دارد</Text>{issues.map(item=><View key={item.key} style={s.row}><View style={{flex:1}}><Text style={s.rowTxt}>{item.title}</Text><Text style={s.detail}>{item.detail||''}</Text></View>{item.action?<TouchableOpacity style={s.btn} onPress={async()=>{try{await item.action()}catch{}runCheck()}}><Text style={s.btnTxt}>فعال‌سازی</Text></TouchableOpacity>:null}</View>)}<TouchableOpacity style={s.recheck} onPress={runCheck}><Text style={s.btnTxt}>بررسی مجدد</Text></TouchableOpacity></ScrollView></View>;

  if(!batteryConfirmed)return <View style={s.overlay}><ScrollView contentContainerStyle={s.box}><Text style={s.icon}>🔋</Text><Text style={s.title}>بهینه‌سازی باتری</Text><Text style={s.sub}>برای اجرای پایدار در پس‌زمینه، محدودیت باتری را برای برنامه بردارید.</Text><TouchableOpacity style={s.btn2} onPress={()=>Linking.openSettings()}><Text style={s.btnTxt}>رفتن به تنظیمات</Text></TouchableOpacity><TouchableOpacity style={[s.btn2,{backgroundColor:C.brand}]} onPress={async()=>{await AsyncStorage.setItem(BATTERY_KEY,'1');setBatteryConfirmed(true)}}><Text style={s.btnTxt}>تأیید و ادامه</Text></TouchableOpacity></ScrollView></View>;

  return<>{children}</>;
}

const s=StyleSheet.create({overlay:{flex:1,backgroundColor:'#0e141f'},box:{padding:22,paddingTop:56,alignItems:'center'},icon:{fontSize:50,marginBottom:10},title:{fontFamily:FONT.bold,color:'#fff',fontSize:17,textAlign:'center',marginBottom:8},sub:{fontFamily:FONT.regular,color:'#aab4c5',fontSize:13,textAlign:'center',lineHeight:23,marginBottom:18},row:{backgroundColor:'#18202e',borderRadius:14,padding:14,width:'100%',marginBottom:10,flexDirection:'row-reverse',alignItems:'center',gap:10},rowTxt:{fontFamily:FONT.bold,color:'#fff',fontSize:13},detail:{fontFamily:FONT.regular,color:'#aab4c5',fontSize:11,marginTop:4,textAlign:'right'},btn:{backgroundColor:C.brand,borderRadius:9,paddingVertical:8,paddingHorizontal:13},btn2:{backgroundColor:'#2a3445',borderRadius:10,paddingVertical:13,paddingHorizontal:24,width:'100%',alignItems:'center',marginTop:10},btnTxt:{fontFamily:FONT.bold,color:'#fff',fontSize:13},recheck:{marginTop:14,backgroundColor:'#2a3445',borderRadius:10,paddingVertical:11,paddingHorizontal:28}});
