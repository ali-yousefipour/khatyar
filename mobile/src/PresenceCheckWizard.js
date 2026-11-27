import React,{useEffect,useRef,useState}from'react';
import{Alert,AppState,BackHandler,ScrollView,StyleSheet,Text,TouchableOpacity,View}from'react-native';
import{useNavigation,useRoute,useIsFocused}from'@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AsyncStorage from'@react-native-async-storage/async-storage';
import{request}from'./api';
import{C,FONT}from'./theme';
import{getAppConfig}from'./appconfig';
import PersonalPhotoCapture from'./PersonalPhotoCapture';
import VehiclesPhotoCapture from'./VehiclesPhotoCapture';
import{playSound}from'./soundFx';
import{stopPresenceAlarm}from'./presenceAlarm';
import{emitPresenceWizardState}from'./presenceWizardLifecycle';
import {presenceRemainingMs} from './presenceDeadlineClock';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {markLocalPresenceCompleted} from './presenceLocalSchedule';
import {useAuth} from './auth';

export default function PresenceCheckWizard(){
 const navigation=useNavigation();
 const isFocused=useIsFocused();
 const insets=useSafeAreaInsets();
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
 const ownerUserId=Number(p.ownerUserId||0);
 const deadlineMs=Number(p.deadlineMs)||Date.now()+windowMinutes*60000;
 const[step,setStep]=useState('intro');
 const[selfie,setSelfie]=useState(null);
 const[secs,setSecs]=useState(Math.max(0,Math.ceil(presenceRemainingMs(requestId,deadlineMs)/1000)));
 const[sending,setSending]=useState(false);
 const[error,setError]=useState('');
 const[expired,setExpired]=useState(false);
 const[queued,setQueued]=useState(false);
 const coordsRef=useRef(null);
 const finishedRef=useRef(false);
 const submissionBusyRef=useRef(false);
 const captureTimeRef=useRef(null);
 const allowExitRef=useRef(false);
 const readyReported=useRef(false);
 const layoutReported=useRef(false);
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
     const remaining=Math.max(0,Math.ceil(presenceRemainingMs(requestId,deadlineMs)/1000));
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
   const appState=AppState.addEventListener('change',state=>{if(state==='active')update();});
   return()=>{clearInterval(timer);appState?.remove?.();};
 },[step,sending,deadlineMs]);

 const closeWizard=()=>{
   allowExitRef.current=true;
   navigation.goBack();
 };

 async function submit(vehiclesUrl,coords){
   if(ownerUserId>0&&ownerUserId!==Number(user?.id||0)){
     setError('این درخواست متعلق به حساب کاربری دیگری است.');
     return false;
   }
   if(finishedRef.current)return true;
   if(submissionBusyRef.current)return false;
   if(presenceRemainingMs(requestId,deadlineMs)<=0){
     setExpired(true);terminalRef.current=true;emitPresenceWizardState(requestId,'expired');setStep('expired');return;
   }
   submissionBusyRef.current=true;
   if(!captureTimeRef.current)captureTimeRef.current=new Date().toISOString();
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
         captured_at:captureTimeRef.current,
         client_uuid:'presence_'+String(user?.id||'')+'_'+String(requestId||deadlineMs).replace(/[^a-zA-Z0-9_-]/g,'_')
       },
       timeoutMs:25000,
       noStore:true,
       queueIfOffline:true
     });
     if(!r?.ok||(!r?.queued&&(!Number.isSafeInteger(Number(r?.id))||Number(r.id)<=0)))throw new Error('ثبت یا ذخیره در صف تأیید نشد.');
     setQueued(!!r.queued);
     // The server or durable offline queue already acknowledged this request.
     // A secondary local status write must not turn that acknowledgement into
     // an error or leave the user stuck on the photo preview.
     finishedRef.current=true;
     terminalRef.current=true;
     if(doneKey)await AsyncStorage.setItem(doneKey,'1').catch(()=>{});
     await markLocalPresenceCompleted(requestId,r?.queued?'queued':'done',{slot,day,immediate,user_id:Number(user?.id||0)}).catch(()=>{});
     emitPresenceWizardState(requestId,'completed');
     stopPresenceAlarm({dismissNotifications:true}).catch(()=>{});
     setSending(false);
     setStep('done');
     return true;
   }catch(e){
     finishedRef.current=false;
     setSending(false);
     setError(e?.message||'ارسال صحت‌سنجی ناموفق بود.');
     setStep('vehicles');
     Alert.alert('ارسال صحت‌سنجی ناموفق بود',e?.message||'ارتباط با سرور برقرار نشد. عکس‌ها حذف نشده‌اند؛ دوباره «تأیید و ارسال» را بزنید.');
     return false;
   }finally{
     submissionBusyRef.current=false;
   }
 }

 const expire=async()=>{
   terminalRef.current=true;
   emitPresenceWizardState(requestId,'expired');
   if(expiredKey&&!immediate)try{await AsyncStorage.setItem(expiredKey,'1')}catch(_){}
   await stopPresenceAlarm({dismissNotifications:true});
   closeWizard();
 };

 const mm=String(Math.floor(secs/60)).padStart(2,'0');
 const ss=String(secs%60).padStart(2,'0');
 const timeFa=(mm+':'+ss).replace(/[0-9]/g,d=>'۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
 const acknowledgeVisible=()=>{
   layoutReported.current=true;
   if(!isFocused||readyReported.current)return;
   readyReported.current=true;
   emitPresenceWizardState(requestId,'ready');
   // Also stop native playback if notification delivery preceded gate hydration.
   stopPresenceAlarm({dismissNotifications:true}).catch(()=>{});
 };
 useEffect(()=>{
   if(isFocused&&layoutReported.current&&!readyReported.current)acknowledgeVisible();
 },[isFocused]);

 if(ownerUserId>0&&ownerUserId!==Number(user?.id||0))
   return <View style={s.page}><Text style={[s.title,{marginTop:80}]}>حساب کاربری تغییر کرده است</Text>
     <Text style={s.body}>برای حفظ حریم خصوصی، درخواست صحت‌سنجی حساب قبلی قابل ارسال نیست.</Text>
     <TouchableOpacity style={s.btn} onPress={closeWizard}><Text style={s.btnTxt}>بازگشت</Text></TouchableOpacity></View>;
 if(step==='selfie')return <View style={s.stage}><PersonalPhotoCapture systemCameraFirst={false} onCapture={d=>{setSelfie(d);setError('');setStep('vehicles')}}/><View pointerEvents="none" style={[s.cameraTimer,{top:Math.max(60,insets.top+48)}]}><Text style={s.cameraTimerText}>مهلت: {timeFa}</Text></View></View>;
 if(step==='vehicles')return <View style={s.stage}><VehiclesPhotoCapture systemCameraFirst={false} onCapture={(url,coords)=>{coordsRef.current=coords;return submit(url,coords)}}/><View pointerEvents="none" style={[s.cameraTimer,{top:Math.max(60,insets.top+48)}]}><Text style={s.cameraTimerText}>مهلت: {timeFa}</Text></View></View>;

 return <View style={s.page} onLayout={acknowledgeVisible}>
   <View style={[s.header,{paddingTop:Math.max(16,insets.top+8)}]}>
     <MaterialCommunityIcons name="shield-check-outline" size={29} color="#f5d89d" />
     <Text style={s.headerTitle}>صحت‌سنجی حضور</Text>
     <Text style={s.headerSub}>مرحله‌ای و تمام‌صفحه</Text>
   </View>
   <ScrollView style={s.scroll} contentContainerStyle={[s.content,{paddingBottom:Math.max(28,insets.bottom+20)}]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
