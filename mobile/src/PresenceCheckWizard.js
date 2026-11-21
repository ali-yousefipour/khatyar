import React,{useEffect,useRef,useState}from'react';
import{Alert,BackHandler,ScrollView,StyleSheet,Text,TouchableOpacity,View}from'react-native';
import{useNavigation,useRoute}from'@react-navigation/native';
import AsyncStorage from'@react-native-async-storage/async-storage';
import{request}from'./api';
import{C,FONT}from'./theme';
import{getAppConfig}from'./appconfig';
import PersonalPhotoCapture from'./PersonalPhotoCapture';
import VehiclesPhotoCapture from'./VehiclesPhotoCapture';
import{playSound}from'./soundFx';
import{stopPresenceAlarm}from'./presenceAlarm';
import{emitPresenceWizardState}from'./presenceWizardLifecycle';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {markLocalPresenceCompleted} from './presenceLocalSchedule';
import {useAuth} from './auth';

export default function PresenceCheckWizard(){
 const navigation=useNavigation();
 const {user}=useAuth();
 const route=useRoute();
 const p=route.params||{};
 const slot=String(p.slot||'');
 const windowMinutes=Math.max(1,Number(p.windowMinutes||1));
 const day=String(p.day||'');
 const doneKey=String(p.key||'');
 const expiredKey=String(p.expiredKey||'');
 const immediate=!!p.immediate;
 const requestId=String(p.requestId||'');
 const deadlineMs=Number(p.deadlineMs)||Date.now()+windowMinutes*60000;
 const[step,setStep]=useState('intro');
 const[selfie,setSelfie]=useState(null);
 const[secs,setSecs]=useState(Math.max(0,Math.ceil((deadlineMs-Date.now())/1000)));
 const[sending,setSending]=useState(false);
 const[error,setError]=useState('');
 const[expired,setExpired]=useState(false);
 const[queued,setQueued]=useState(false);
 const coordsRef=useRef(null);
 const finishedRef=useRef(false);
 const allowExitRef=useRef(false);
 const readyReported=useRef(false);
 const terminalRef=useRef(false);

 useEffect(()=>{
   getAppConfig().catch(()=>{});
   return()=>{if(!terminalRef.current)emitPresenceWizardState(requestId,'hidden');};
 },[requestId]);
 useEffect(()=>{
   if(step==='selfie')playSound('presenceSelfie').catch(()=>{});
   if(step==='vehicles')playSound('presenceStationPhoto').catch(()=>{});
   if(step==='done')playSound('presenceSuccess').catch(()=>{});
 },[step]);

 useEffect(()=>{
   const sub=navigation.addListener('beforeRemove',e=>{
     if(allowExitRef.current)return;
     e.preventDefault();
   });
   return sub;
 },[navigation]);

 useEffect(()=>{
   const sub=BackHandler.addEventListener('hardwareBackPress',()=>{
     if(step==='done'||step==='expired'){allowExitRef.current=true;navigation.goBack();return true;}
     return true;
   });
   return()=>sub.remove();
 },[navigation,step]);

 useEffect(()=>{
   if(['done','expired'].includes(step))return;
   const update=()=>{
     const remaining=Math.max(0,Math.ceil((deadlineMs-Date.now())/1000));
     setSecs(remaining);
     if(remaining===0&&!finishedRef.current&&!sending){
       setExpired(true);
       terminalRef.current=true;
       emitPresenceWizardState(requestId,'expired');
       setStep('expired');
       stopPresenceAlarm({dismissNotifications:true}).catch(()=>{});
     }
   };
   update();
   const timer=setInterval(update,1000);
   return()=>clearInterval(timer);
 },[step,sending,deadlineMs]);

 const closeWizard=()=>{
   allowExitRef.current=true;
   navigation.goBack();
 };

 async function submit(vehiclesUrl,coords){
   if(finishedRef.current||sending||Date.now()>=deadlineMs){
     setExpired(true);setStep('expired');return;
   }
   coordsRef.current=coords||coordsRef.current;
   setError('');
   setSending(true);
   try{
     const r=await request('/my/presence-check',{
       method:'POST',
       body:{
         slot,
         selfie,
         vehicles_photo:vehiclesUrl,
         lat:coords?.lat??coordsRef.current?.lat??null,
         lng:coords?.lng??coordsRef.current?.lng??null,
         request_id:requestId,
         random:!!p.random || requestId.startsWith('local_'),
         immediate,
         captured_at:new Date().toISOString(),
         client_uuid:'presence_'+String(user?.id||'')+'_'+requestId.replace(/[^a-zA-Z0-9_-]/g,'_')
       },
       timeoutMs:60000,
       noStore:true,
       queueIfOffline:true
     });
     if(!r?.ok||(!r?.queued&&(!Number.isSafeInteger(Number(r?.id))||Number(r.id)<=0)))throw new Error('ثبت یا ذخیره در صف تأیید نشد.');
     setQueued(!!r.queued);
     finishedRef.current=true;
     terminalRef.current=true;
     emitPresenceWizardState(requestId,'completed');
     if(doneKey)await AsyncStorage.setItem(doneKey,'1');
     await markLocalPresenceCompleted(requestId,r?.queued?'queued':'done',{slot,day,immediate,user_id:Number(user?.id||0)});
     await stopPresenceAlarm();
     setSending(false);
     setStep('done');
   }catch(e){
     finishedRef.current=false;
     setSending(false);
     setError(e?.message||'ارسال صحت‌سنجی ناموفق بود.');
     setStep('vehicles');
     Alert.alert('ارسال صحت‌سنجی ناموفق بود',e?.message||'ارتباط با سرور برقرار نشد. عکس‌ها حذف نشده‌اند؛ دوباره «تأیید و ارسال» را بزنید.');
     return false;
   }
 }

 const expire=async()=>{
   terminalRef.current=true;
   emitPresenceWizardState(requestId,'expired');
   if(expiredKey&&!immediate)try{await AsyncStorage.setItem(expiredKey,'1')}catch(_){}
   await stopPresenceAlarm();
   closeWizard();
 };

 const mm=String(Math.floor(secs/60)).padStart(2,'0');
 const ss=String(secs%60).padStart(2,'0');
 const timeFa=(mm+':'+ss).replace(/[0-9]/g,d=>'۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
 const acknowledgeVisible=()=>{
   if(readyReported.current)return;
   readyReported.current=true;
   emitPresenceWizardState(requestId,'ready');
 };

 if(step==='selfie')return <View style={s.stage}><PersonalPhotoCapture systemCameraFirst={false} onCapture={d=>{setSelfie(d);setError('');setStep('vehicles')}}/><View pointerEvents="none" style={s.cameraTimer}><Text style={s.cameraTimerText}>مهلت: {timeFa}</Text></View></View>;
 if(step==='vehicles')return <View style={s.stage}><VehiclesPhotoCapture systemCameraFirst={false} onCapture={(url,coords)=>{coordsRef.current=coords;return submit(url,coords)}}/><View pointerEvents="none" style={s.cameraTimer}><Text style={s.cameraTimerText}>مهلت: {timeFa}</Text></View></View>;

 return <View style={s.page} onLayout={acknowledgeVisible}>
   <View style={s.header}>
     <MaterialCommunityIcons name="shield-check-outline" size={29} color="#f5d89d" />
     <Text style={s.headerTitle}>صحت‌سنجی حضور</Text>
     <Text style={s.headerSub}>مرحله‌ای و تمام‌صفحه</Text>
   </View>
   <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
     {step==='intro'&&<>
       <MaterialCommunityIcons name="camera-account" size={54} color="#075f51" style={s.icon} />
       <Text style={s.title}>آماده انجام صحت‌سنجی هستید؟</Text>
       <Text style={s.timer} accessibilityRole="timer">{timeFa}</Text>
       <Text style={s.body}>برای تأیید حضور در محل کار، باید ظرف این مدت یک «عکس سلفی» و سپس یک «عکس از خودروهای حاضر در خط» ارسال کنید.</Text>
       <View style={s.stepsBox}>
         <Text style={s.stepLine}>۱  سلفی با دوربین جلو (با لباس فرم)</Text>
         <Text style={s.stepLine}>۲  عکس خودروها با دوربین پشت</Text>
         <Text style={s.stepLine}>۳  ثبت خودکار تاریخ، ساعت و موقعیت</Text>
       </View>
       {!!error&&<Text style={s.error}>{error}</Text>}
       <TouchableOpacity style={s.btn} activeOpacity={0.85} accessibilityRole="button" onPress={()=>setStep('selfie')}>
         <Text style={s.btnTxt}>مرحله ۱ — گرفتن سلفی</Text>
       </TouchableOpacity>
     </>}
     {step==='submitting'&&<>
       <MaterialCommunityIcons name="cloud-upload-outline" size={54} color="#075f51" style={s.icon} /><Text style={s.title}>در حال ارسال…</Text>
       <Text style={s.body}>لطفاً تا دریافت پاسخ سرور صبر کنید.</Text>
     </>}
     {step==='done'&&<>
       <MaterialCommunityIcons name="check-decagram-outline" size={54} color="#087c58" style={s.icon} /><Text style={s.title}>{queued?'صحت‌سنجی انجام شد — در صف ارسال':'صحت‌سنجی با موفقیت ثبت شد'}</Text>
       <Text style={s.body}>{queued?'تصاویر در گوشی ذخیره شده‌اند و پس از برقراری ارتباط ارسال می‌شوند.':'حضور شما با موفقیت ثبت شد.'}</Text>
       <TouchableOpacity style={s.btn} activeOpacity={0.85} onPress={closeWizard}><Text style={s.btnTxt}>بستن</Text></TouchableOpacity>
     </>}
     {step==='expired'&&<>
       <MaterialCommunityIcons name="timer-alert-outline" size={54} color={C.danger} style={s.icon} /><Text style={[s.title,{color:C.danger}]}>مهلت به پایان رسید</Text>
       <Text style={s.body}>صحت‌سنجی در مهلت مقرر ثبت نشد.</Text>
       <TouchableOpacity style={[s.btn,{backgroundColor:C.muted}]} activeOpacity={0.85} onPress={expire}><Text style={s.btnTxt}>بستن</Text></TouchableOpacity>
     </>}
   </ScrollView>
 </View>;
}

const s=StyleSheet.create({
 page:{flex:1,backgroundColor:'#f3f8f6'},
 header:{backgroundColor:'#075f51',paddingTop:22,paddingBottom:18,paddingHorizontal:20,alignItems:'flex-end',borderBottomLeftRadius:24,borderBottomRightRadius:24},
 headerTitle:{width:'100%',color:'#fff',fontFamily:FONT.bold,fontSize:20,textAlign:'right',writingDirection:'rtl'},
 headerSub:{width:'100%',color:'#dcefe9',fontFamily:FONT.regular,fontSize:12,textAlign:'right',writingDirection:'rtl',marginTop:4},
 stage:{flex:1,width:'100%',height:'100%',backgroundColor:'#000'},
 cameraTimer:{position:'absolute',top:12,alignSelf:'center',backgroundColor:'rgba(5,48,42,.94)',paddingHorizontal:16,paddingVertical:7,borderRadius:13,zIndex:8},
 cameraTimerText:{fontFamily:FONT.bold,fontSize:18,color:'#fff',textAlign:'center'},
 scroll:{flex:1,width:'100%'},
 content:{flexGrow:1,width:'100%',alignItems:'center',justifyContent:'center',paddingHorizontal:22,paddingVertical:28},
 icon:{fontSize:54,marginBottom:10,textAlign:'center'},
 title:{fontFamily:FONT.bold,fontSize:21,color:C.ink,marginBottom:10,textAlign:'center',writingDirection:'rtl',lineHeight:30},
 timer:{fontFamily:FONT.bold,fontSize:40,color:C.brand,marginVertical:8,textAlign:'center'},
 body:{fontFamily:FONT.regular,fontSize:14,color:C.muted,textAlign:'center',writingDirection:'rtl',lineHeight:24,marginBottom:14,width:'100%'},
 stepsBox:{alignSelf:'stretch',backgroundColor:'#fff',borderWidth:1,borderColor:'#dceae2',borderRadius:19,padding:17,marginBottom:18,elevation:1},
 stepLine:{fontFamily:FONT.regular,fontSize:13,color:C.ink,textAlign:'right',writingDirection:'rtl',lineHeight:27},
 error:{fontFamily:FONT.regular,fontSize:12,color:C.danger,textAlign:'center',writingDirection:'rtl',marginBottom:12,width:'100%'},
 btn:{backgroundColor:C.brand,borderRadius:13,paddingVertical:14,paddingHorizontal:30,alignItems:'center',justifyContent:'center',minWidth:220,minHeight:50,alignSelf:'center'},
 btnTxt:{color:'#fff',fontFamily:FONT.bold,fontSize:15,textAlign:'center',writingDirection:'rtl'}
});
