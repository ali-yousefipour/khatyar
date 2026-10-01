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

export default function PresenceCheckWizard(){
 const navigation=useNavigation();
 const route=useRoute();
 const p=route.params||{};
 const slot=String(p.slot||'');
 const windowMinutes=Math.max(1,Number(p.windowMinutes||1));
 const day=String(p.day||'');
 const doneKey=String(p.key||'');
 const expiredKey=String(p.expiredKey||'');
 const immediate=!!p.immediate;
 const requestId=String(p.requestId||'');
 const[step,setStep]=useState('intro');
 const[selfie,setSelfie]=useState(null);
 const[secs,setSecs]=useState(windowMinutes*60);
 const[sending,setSending]=useState(false);
 const[error,setError]=useState('');
 const[expired,setExpired]=useState(false);
 const coordsRef=useRef(null);
 const finishedRef=useRef(false);
 const allowExitRef=useRef(false);

 useEffect(()=>{getAppConfig(true).catch(()=>{});stopPresenceAlarm().catch(()=>{});},[]);
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
   if(['submitting','done','expired'].includes(step))return;
   const timer=setInterval(()=>{
     setSecs(x=>{
       if(x<=1){
         clearInterval(timer);
         if(!finishedRef.current){
           setExpired(true);
           setStep('expired');
           stopPresenceAlarm().catch(()=>{});
         }
         return 0;
       }
       return x-1;
     });
   },1000);
   return()=>clearInterval(timer);
 },[step]);

 const closeWizard=()=>{
   allowExitRef.current=true;
   navigation.goBack();
 };

 async function submit(vehiclesUrl,coords){
   if(finishedRef.current||sending)return;
   coordsRef.current=coords||coordsRef.current;
   setError('');
   setSending(true);
   setStep('submitting');
   try{
     const r=await request('/my/presence-check',{
       method:'POST',
       body:{
         slot,
         selfie,
         vehicles_photo:vehiclesUrl,
         lat:coords?.lat??coordsRef.current?.lat??null,
         lng:coords?.lng??coordsRef.current?.lng??null
       },
       timeoutMs:60000,
       noStore:true
     });
     if(!r?.ok||!r?.id)throw new Error('سرور ثبت صحت‌سنجی را تأیید نکرد.');
     finishedRef.current=true;
     if(doneKey)await AsyncStorage.setItem(doneKey,'1');
     await stopPresenceAlarm();
     setSending(false);
     setStep('done');
   }catch(e){
     finishedRef.current=false;
     setSending(false);
     setError(e?.message||'ارسال صحت‌سنجی ناموفق بود.');
     setStep('vehicles');
     Alert.alert('ارسال صحت‌سنجی ناموفق بود',e?.message||'ارتباط با سرور برقرار نشد. عکس‌ها حذف نشده‌اند؛ دوباره «تأیید و ارسال» را بزنید.');
   }
 }

 const expire=async()=>{
   if(expiredKey&&!immediate)try{await AsyncStorage.setItem(expiredKey,'1')}catch(_){}
   await stopPresenceAlarm();
   closeWizard();
 };

 const mm=String(Math.floor(secs/60)).padStart(2,'0');
 const ss=String(secs%60).padStart(2,'0');

 if(step==='selfie')return <View style={s.stage}><PersonalPhotoCapture onCapture={d=>{setSelfie(d);setError('');setStep('vehicles')}}/></View>;
 if(step==='vehicles')return <View style={s.stage}><VehiclesPhotoCapture onCapture={(url,coords)=>{coordsRef.current=coords;submit(url,coords)}}/></View>;

 return <View style={s.page}>
   <View style={s.header}>
     <Text style={s.headerTitle}>صحت‌سنجی حضور</Text>
     <Text style={s.headerSub}>مرحله‌ای و تمام‌صفحه</Text>
   </View>
   <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
     {step==='intro'&&<>
       <Text style={s.icon}>📸</Text>
       <Text style={s.title}>آماده انجام صحت‌سنجی هستید؟</Text>
       <Text style={s.timer}>{mm}:{ss}</Text>
       <Text style={s.body}>برای تأیید حضور در محل کار، باید ظرف این مدت یک «عکس سلفی» و سپس یک «عکس از خودروهای حاضر در خط» ارسال کنید.</Text>
       <View style={s.stepsBox}>
         <Text style={s.stepLine}>۱  سلفی با دوربین جلو (با لباس فرم)</Text>
         <Text style={s.stepLine}>۲  عکس خودروها با دوربین پشت</Text>
         <Text style={s.stepLine}>۳  ثبت خودکار تاریخ، ساعت و موقعیت</Text>
       </View>
       {!!error&&<Text style={s.error}>{error}</Text>}
       <TouchableOpacity style={s.btn} activeOpacity={0.85} onPress={()=>{stopPresenceAlarm().catch(()=>{});setStep('selfie')}}>
         <Text style={s.btnTxt}>مرحله ۱ — گرفتن سلفی</Text>
       </TouchableOpacity>
     </>}
     {step==='submitting'&&<>
       <Text style={s.icon}>⏳</Text><Text style={s.title}>در حال ارسال…</Text>
       <Text style={s.body}>لطفاً تا دریافت پاسخ سرور صبر کنید.</Text>
     </>}
     {step==='done'&&<>
       <Text style={s.icon}>✅</Text><Text style={s.title}>صحت‌سنجی با موفقیت ثبت شد</Text>
       <Text style={s.body}>حضور شما با موفقیت ثبت شد.</Text>
       <TouchableOpacity style={s.btn} activeOpacity={0.85} onPress={closeWizard}><Text style={s.btnTxt}>بستن</Text></TouchableOpacity>
     </>}
     {step==='expired'&&<>
       <Text style={s.icon}>⛔</Text><Text style={[s.title,{color:C.danger}]}>مهلت به پایان رسید</Text>
       <Text style={s.body}>صحت‌سنجی در مهلت مقرر ثبت نشد.</Text>
       <TouchableOpacity style={[s.btn,{backgroundColor:C.muted}]} activeOpacity={0.85} onPress={expire}><Text style={s.btnTxt}>بستن</Text></TouchableOpacity>
     </>}
   </ScrollView>
 </View>;
}

const s=StyleSheet.create({
 page:{flex:1,backgroundColor:C.paper},
 header:{backgroundColor:C.brand,paddingTop:22,paddingBottom:16,paddingHorizontal:20,alignItems:'flex-end'},
 headerTitle:{width:'100%',color:'#fff',fontFamily:FONT.bold,fontSize:20,textAlign:'right',writingDirection:'rtl'},
 headerSub:{width:'100%',color:'#dcefe9',fontFamily:FONT.regular,fontSize:12,textAlign:'right',writingDirection:'rtl',marginTop:4},
 stage:{flex:1,width:'100%',height:'100%',backgroundColor:'#000'},
 scroll:{flex:1,width:'100%'},
 content:{flexGrow:1,width:'100%',alignItems:'center',justifyContent:'center',paddingHorizontal:22,paddingVertical:28},
 icon:{fontSize:54,marginBottom:10,textAlign:'center'},
 title:{fontFamily:FONT.bold,fontSize:21,color:C.ink,marginBottom:10,textAlign:'center',writingDirection:'rtl',lineHeight:30},
 timer:{fontFamily:FONT.bold,fontSize:40,color:C.brand,marginVertical:8,textAlign:'center'},
 body:{fontFamily:FONT.regular,fontSize:14,color:C.muted,textAlign:'center',writingDirection:'rtl',lineHeight:24,marginBottom:14,width:'100%'},
 stepsBox:{alignSelf:'stretch',backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:14,padding:14,marginBottom:18},
 stepLine:{fontFamily:FONT.regular,fontSize:13,color:C.ink,textAlign:'right',writingDirection:'rtl',lineHeight:27},
 error:{fontFamily:FONT.regular,fontSize:12,color:C.danger,textAlign:'center',writingDirection:'rtl',marginBottom:12,width:'100%'},
 btn:{backgroundColor:C.brand,borderRadius:13,paddingVertical:14,paddingHorizontal:30,alignItems:'center',justifyContent:'center',minWidth:220,minHeight:50,alignSelf:'center'},
 btnTxt:{color:'#fff',fontFamily:FONT.bold,fontSize:15,textAlign:'center',writingDirection:'rtl'}
});
