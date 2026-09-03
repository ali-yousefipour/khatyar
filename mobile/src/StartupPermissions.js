import React,{useCallback,useEffect,useState}from'react';
import{Linking,Platform,ScrollView,StyleSheet,Text,TouchableOpacity,View}from'react-native';
import*as Notifications from'expo-notifications';
import*as ImagePicker from'expo-image-picker';
import*as Audio from'expo-audio';
import*as Location from'expo-location';
import{FONT,C}from'./theme';

const items=[
  ['notifications','اعلان‌ها','برای دریافت پیام‌ها و هشدارهای کاری'],
  ['camera','دوربین','برای صحت‌سنجی حضور و ثبت تصویر'],
  ['microphone','میکروفون','برای صحبت با بی‌سیم خطیار'],
  ['location','موقعیت مکانی','برای ثبت حضور و کنترل موقعیت کاری'],
  ['background','موقعیت مکانی در پس‌زمینه','برای ادامه سرویس‌های موقعیت و شیفت در پس‌زمینه']
];

export default function StartupPermissions({children}){
  const[ready,setReady]=useState(false),[state,setState]=useState({}),[busy,setBusy]=useState(false);
  const read=useCallback(async()=>{
    const next={};
    try{const r=await Notifications.getPermissionsAsync();next.notifications=r?.status==='granted'}catch{next.notifications=false}
    try{const r=await ImagePicker.getCameraPermissionsAsync();next.camera=!!r?.granted}catch{next.camera=false}
    try{const r=await Audio.getRecordingPermissionsAsync();next.microphone=!!r?.granted}catch{next.microphone=false}
    try{const r=await Location.getForegroundPermissionsAsync();next.location=!!r?.granted}catch{next.location=false}
    try{const r=await Location.getBackgroundPermissionsAsync();next.background=!!r?.granted}catch{next.background=false}
    setState(next);return next;
  },[]);
  const requestAll=useCallback(async()=>{
    setBusy(true);
    try{
      let r=await read();
      if(!r.notifications){try{const x=await Notifications.requestPermissionsAsync();r.notifications=x?.status==='granted'}catch{}}
      if(!r.camera){try{const x=await ImagePicker.requestCameraPermissionsAsync();r.camera=!!x?.granted}catch{}}
      if(!r.microphone){try{const x=await Audio.requestRecordingPermissionsAsync();r.microphone=!!x?.granted}catch{}}
      if(!r.location){try{const x=await Location.requestForegroundPermissionsAsync();r.location=!!x?.granted}catch{}}
      if(r.location&&!r.background){try{const x=await Location.requestBackgroundPermissionsAsync();r.background=!!x?.granted}catch{}}
      setState({...r});
      setReady(Object.values({...r}).every(Boolean));
    }finally{setBusy(false)}
  },[read]);
  useEffect(()=>{requestAll().catch(()=>{});},[requestAll]);
  const openSettings=()=>{Linking.openSettings().catch(()=>{})};
  if(ready)return children;
  return <View style={s.page}><ScrollView contentContainerStyle={s.content}><Text style={s.logo}>خطیار</Text><Text style={s.title}>فعال‌سازی دسترسی‌های لازم</Text><Text style={s.sub}>برای اینکه ثبت حضور، موقعیت مکانی، اعلان‌ها و بی‌سیم در پس‌زمینه بدون توقف کار کنند، دسترسی‌های زیر باید یک‌بار فعال شوند.</Text>{items.map(([k,t,d])=><View key={k} style={s.row}><View style={{flex:1}}><Text style={s.rowTitle}>{t}</Text><Text style={s.rowSub}>{d}</Text></View><Text style={[s.status,state[k]?s.ok:s.bad]}>{state[k]?'فعال':'نیازمند دسترسی'}</Text></View>)}<TouchableOpacity disabled={busy} style={s.btn} onPress={requestAll}><Text style={s.btnText}>{busy?'در حال درخواست دسترسی‌ها…':'درخواست / تکمیل همه دسترسی‌ها'}</Text></TouchableOpacity><TouchableOpacity style={s.secondary} onPress={openSettings}><Text style={s.secondaryText}>باز کردن تنظیمات برنامه</Text></TouchableOpacity><Text style={s.note}>پس از اعطای موقعیت مکانی در حالت «همیشه مجاز»، برنامه می‌تواند سرویس موقعیت را در پس‌زمینه ادامه دهد. برای بی‌سیم نیز یک اعلان دائمی در نوار وضعیت نمایش داده خواهد شد.</Text></ScrollView></View>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:C.paper,direction:'rtl'},content:{flexGrow:1,padding:22,paddingTop:64},logo:{fontFamily:FONT.bold,color:C.brand,fontSize:30,textAlign:'right'},title:{fontFamily:FONT.bold,color:C.ink,fontSize:20,textAlign:'right',marginTop:8},sub:{fontFamily:FONT.regular,color:C.muted,fontSize:13,textAlign:'right',lineHeight:24,marginTop:10,marginBottom:18},row:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:14,padding:13,marginBottom:9,flexDirection:'row-reverse',alignItems:'center'},rowTitle:{fontFamily:FONT.bold,color:C.ink,fontSize:13,textAlign:'right'},rowSub:{fontFamily:FONT.regular,color:C.muted,fontSize:10,textAlign:'right',marginTop:3},status:{fontFamily:FONT.bold,fontSize:10,marginStart:10},ok:{color:'#0d7a5f'},bad:{color:'#b42318'},btn:{marginTop:8,backgroundColor:C.brand,borderRadius:13,paddingVertical:15,alignItems:'center'},btnText:{fontFamily:FONT.bold,color:'#fff',fontSize:13},secondary:{marginTop:10,borderWidth:1,borderColor:C.line,borderRadius:13,paddingVertical:13,alignItems:'center'},secondaryText:{fontFamily:FONT.bold,color:C.brand,fontSize:12},note:{fontFamily:FONT.regular,color:C.muted,fontSize:10,lineHeight:19,textAlign:'right',marginTop:16}});
