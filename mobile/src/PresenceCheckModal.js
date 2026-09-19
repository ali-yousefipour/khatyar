import React,{useState,useEffect,useRef}from'react';
import{View,Text,TouchableOpacity,StyleSheet,Alert}from'react-native';
import{request}from'./api';
import{C,FONT}from'./theme';
import{getAppConfig}from'./appconfig';
import PersonalPhotoCapture from'./PersonalPhotoCapture';
import VehiclesPhotoCapture from'./VehiclesPhotoCapture';
import{playSound}from'./soundFx';

export default function PresenceCheckModal({slot,windowMinutes,onDone,onExpire,onStart}){
 const[step,setStep]=useState('intro'),[selfie,setSelfie]=useState(null),[secs,setSecs]=useState((windowMinutes||1)*60),[sending,setSending]=useState(false),[error,setError]=useState('');
 const coordsRef=useRef(null),timer=useRef(null),finishedRef=useRef(false),expireRef=useRef(onExpire);\n expireRef.current=onExpire;
 useEffect(()=>{getAppConfig(true).catch(()=>{});},[]);
 useEffect(()=>{if(['selfie','vehicles','submitting','done'].includes(step))onStart&&onStart();if(step==='selfie')playSound('presenceSelfie').catch(()=>{});if(step==='vehicles')playSound('presenceStationPhoto').catch(()=>{});if(step==='done')playSound('presenceSuccess').catch(()=>{})},[step]);
 useEffect(()=>{\n  if(['submitting','done','expired'].includes(step)){if(timer.current){clearInterval(timer.current);timer.current=null}return;}\n  if(timer.current)clearInterval(timer.current);\n  timer.current=setInterval(()=>{\n   setSecs(x=>{\n    if(x<=1){\n     if(timer.current){clearInterval(timer.current);timer.current=null}\n     setStep('expired');\n     expireRef.current&&expireRef.current();\n     return 0;\n    }\n    return x-1;\n   });\n  },1000);\n  return()=>{if(timer.current){clearInterval(timer.current);timer.current=null}};\n },[step]);
 async function submit(vehiclesUrl,coords){
  if(finishedRef.current||sending)return;
  coordsRef.current=coords||coordsRef.current;setError('');setSending(true);setStep('submitting');
  try{
   const r=await request('/my/presence-check',{method:'POST',body:{slot,selfie,vehicles_photo:vehiclesUrl,lat:coords?.lat??coordsRef.current?.lat??null,lng:coords?.lng??coordsRef.current?.lng??null},timeoutMs:60000,noStore:true});
   if(!r?.ok||!r?.id)throw new Error('سرور ثبت صحت‌سنجی را تأیید نکرد.');
   finishedRef.current=true;setSending(false);setStep('done');
  }catch(e){
   finishedRef.current=false;setSending(false);setError(e?.message||'ارسال صحت‌سنجی ناموفق بود.');setStep('vehicles');
   Alert.alert('ارسال صحت‌سنجی ناموفق بود',e?.message||'ارتباط با سرور برقرار نشد. عکس‌ها حذف نشده‌اند؛ دوباره «تأیید و ارسال» را بزنید.');
  }
 }
 const mm=String(Math.floor(secs/60)).padStart(2,'0'),ss=String(secs%60).padStart(2,'0');
 if(step==='selfie')return <View style={s.full}><PersonalPhotoCapture onCapture={d=>{setSelfie(d);setError('');setStep('vehicles')}}/></View>;
 if(step==='vehicles')return <View style={s.full}><VehiclesPhotoCapture onCapture={(url,coords)=>{coordsRef.current=coords;submit(url,coords)}}/></View>;
 return <View style={s.wrap}>
  {step==='intro'&&<><Text style={s.icon}>📸</Text><Text style={s.title}>صحت‌سنجی حضور</Text><Text style={s.timer}>{mm}:{ss}</Text><Text style={s.body}>برای تأیید حضور در محل کار، باید ظرف این مدت یک «عکس سلفی» و سپس یک «عکس از خودروهای حاضر در خط» ارسال کنید.</Text><Text style={s.note}>۱) سلفی با دوربین جلو (با لباس فرم){'\n'}۲) عکس خودروها با دوربین پشت (تاریخ، ساعت و موقعیت خودکار درج می‌شود)</Text><TouchableOpacity style={s.btn} onPress={()=>{onStart&&onStart();setStep('selfie')}}><Text style={s.btnTxt}>شروع — گرفتن سلفی</Text></TouchableOpacity></>}
  {step==='submitting'&&<><Text style={s.icon}>⏳</Text><Text style={s.title}>در حال ارسال…</Text><Text style={s.body}>لطفاً تا دریافت پاسخ سرور صبر کنید.</Text></>}
  {step==='done'&&<><Text style={s.icon}>✅</Text><Text style={s.title}>ثبت شد</Text><Text style={s.body}>حضور شما با موفقیت ثبت شد.</Text><TouchableOpacity style={s.btn} onPress={()=>onDone&&onDone()}><Text style={s.btnTxt}>بستن</Text></TouchableOpacity></>}
  {step==='expired'&&<><Text style={s.icon}>⛔</Text><Text style={[s.title,{color:C.danger}]}>مهلت به پایان رسید</Text><Text style={s.body}>صحت‌سنجی در مهلت مقرر ثبت نشد.</Text><TouchableOpacity style={[s.btn,{backgroundColor:C.muted}]} onPress={()=>onExpire&&onExpire()}><Text style={s.btnTxt}>بستن</Text></TouchableOpacity></>}
 </View>
}
const s=StyleSheet.create({full:{flex:1,width:'100%',height:'100%',minHeight:1,minWidth:1,backgroundColor:'#000'},wrap:{flex:1,width:'100%',height:'100%',minHeight:1,minWidth:1,backgroundColor:C.paper,alignItems:'center',justifyContent:'center',padding:26},icon:{fontSize:54,marginBottom:10},title:{fontFamily:FONT.bold,fontSize:21,color:C.ink,marginBottom:8,textAlign:'center',writingDirection:'rtl'},timer:{fontFamily:FONT.bold,fontSize:40,color:C.brand,marginVertical:8,textAlign:'center'},body:{fontFamily:FONT.regular,fontSize:14,color:C.muted,textAlign:'center',writingDirection:'rtl',lineHeight:24,marginBottom:12,width:'100%'},note:{fontFamily:FONT.regular,fontSize:13,color:C.ink,textAlign:'right',writingDirection:'rtl',lineHeight:24,backgroundColor:'#fff',padding:12,borderRadius:12,marginBottom:18,alignSelf:'stretch'},btn:{backgroundColor:C.brand,borderRadius:13,paddingVertical:14,paddingHorizontal:30,alignItems:'center',justifyContent:'center',minWidth:160},btnTxt:{color:'#fff',fontFamily:FONT.bold,fontSize:15,textAlign:'center',writingDirection:'rtl'}});
