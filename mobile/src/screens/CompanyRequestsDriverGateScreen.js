import React,{useRef,useState}from'react';
import{Alert,ScrollView,StyleSheet,Text,TextInput,TouchableOpacity,View}from'react-native';
import CompanyRequestsScreen from'./CompanyRequestsScreen';
import{request}from'../api';
import{C,FONT}from'../theme';
import ActivityIndicator from'../components/PulseLoadingIndicator';
const fa=n=>String(n??'').replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
const en=v=>String(v??'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));

export default function CompanyRequestsDriverGateScreen(){
 const[driver,setDriver]=useState(null),[candidate,setCandidate]=useState(null),[nid,setNid]=useState(''),[busy,setBusy]=useState(false);
 const searchVersion=useRef(0);

 async function find(){
   const n=en(nid).replace(/\D/g,'');
   if(n.length!==10){Alert.alert('کد ملی','کد ملی راننده را ۱۰ رقم وارد کنید.');return;}
   const version=++searchVersion.current;
   setBusy(true);setCandidate(null);
   try{
     // مسیر اصلی: همان API احراز‌شدهٔ جستجوی راننده که در سایر بخش‌های اپ استفاده می‌شود.
     // این مسیر وابستگی به احراز هویت legacy در company-request-support.php را حذف می‌کند.
     let r=null;
     try{r=await request('/search?national_id='+encodeURIComponent(n),{noStore:true});}catch(_){r=null;}
     let found=r?.driver||null;
     if(!found){
       // fallback برای نصب‌هایی که endpoint جستجوی عمومی در دسترس نیست.
       const legacy=await request('/company-request-support.php?op=driver-search&national_id='+encodeURIComponent(n),{noStore:true});
       found=legacy?.driver||null;
     }
     if(!found)throw Error('راننده‌ای با این کد ملی یافت نشد');
     const normalized={
       ...found,
       name:found.name||[found.first_name,found.last_name].filter(Boolean).join(' ')||'—',
       national_id:found.national_id||found.national_code||n,
       mobile:found.mobile||found.phone||'',
       vehicles:Array.isArray(found.vehicles)?found.vehicles:[],
     };
     if(version===searchVersion.current)setCandidate(normalized);
   }catch(e){if(version===searchVersion.current)Alert.alert('جستجوی راننده ناموفق بود',e.message||'خطای سرور در جستجوی کد ملی رخ داد.');}
   finally{if(version===searchVersion.current)setBusy(false)}
 }

 if(driver)return <View style={{flex:1,backgroundColor:C.paper}}><View style={s.selectedBanner}><Text style={s.selectedName} numberOfLines={1}>راننده: {driver.name||'—'} · {fa(driver.national_id||'')}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="تغییر راننده انتخاب‌شده" style={s.changeDriver} onPress={()=>{setDriver(null);setCandidate(null);}}><Text style={s.changeDriverText}>تغییر راننده</Text></TouchableOpacity></View><CompanyRequestsScreen selectedDriver={driver}/></View>;
 return <ScrollView persistentScrollbar={true} style={s.page} contentContainerStyle={s.content}>
   <View style={s.card}><Text style={s.title}>ارسال مدارک برای شرکت</Text><Text style={s.step}>مرحله ۱ — انتخاب راننده</Text><Text style={s.muted}>کد ملی راننده را وارد کنید، مشخصات فرد را از بانک اطلاعاتی بررسی کنید و سپس همان راننده را انتخاب کنید. اطلاعات انتخاب‌شده به‌صورت خودکار همراه درخواست ارسال می‌شود.</Text></View>
   <View style={s.card}><Text style={s.label}>کد ملی راننده</Text><TextInput accessibilityLabel="کد ملی ده رقمی راننده" value={nid} onChangeText={v=>{searchVersion.current++;setBusy(false);setNid(v);setCandidate(null);}} keyboardType="number-pad" maxLength={10} placeholder="مثلاً ۰۰۱۲۳۴۵۶۷۸" placeholderTextColor={C.muted} style={s.input}/><TouchableOpacity accessibilityRole="button" style={s.btn} onPress={find} disabled={busy}>{busy?<ActivityIndicator size={32}/>:<Text style={s.btnTxt}>جستجوی راننده</Text>}</TouchableOpacity></View>
   {candidate&&<View style={s.card}><Text style={s.step}>راننده یافت شد</Text><Text style={s.driverName}>{candidate.name||'—'}</Text><Text style={s.info}>کد ملی: {fa(candidate.national_id||nid)}</Text>{candidate.mobile?<Text style={s.info}>موبایل: {fa(candidate.mobile)}</Text>:null}{candidate.vehicles?.length?<Text style={s.info}>خودرو: {candidate.vehicles.map(v=>v.plate).filter(Boolean).join('، ')}</Text>:null}<TouchableOpacity accessibilityRole="button" accessibilityLabel={`انتخاب راننده ${candidate.name||''} و ادامه`} style={s.selectBtn} onPress={()=>setDriver(candidate)}><Text style={s.btnTxt}>انتخاب این راننده و ادامه</Text></TouchableOpacity></View>}
 </ScrollView>;
}
const s=StyleSheet.create({selectedBanner:{flexDirection:'row-reverse',alignItems:'center',paddingHorizontal:12,paddingVertical:8,gap:8,backgroundColor:'#e8f5ee',borderBottomWidth:1,borderColor:C.line},selectedName:{flex:1,minWidth:0,fontFamily:FONT.bold,color:C.ink,textAlign:'right',fontSize:12},changeDriver:{minHeight:48,justifyContent:'center',paddingHorizontal:12,borderRadius:11,backgroundColor:C.brand},changeDriverText:{fontFamily:FONT.bold,color:'#fff',fontSize:12},page:{flex:1,backgroundColor:C.paper},content:{padding:16,paddingBottom:40},card:{backgroundColor:C.card||'#fff',borderRadius:20,padding:19,marginBottom:14,borderWidth:1,borderColor:C.line||'#e5e7eb'},title:{fontFamily:FONT.bold,fontSize:20,color:C.text,marginBottom:8,textAlign:'right'},step:{fontFamily:FONT.bold,fontSize:15,color:C.brand,marginBottom:10,textAlign:'right'},muted:{fontFamily:FONT.regular,fontSize:13,color:C.muted,lineHeight:22,textAlign:'right'},label:{fontFamily:FONT.bold,fontSize:13,color:C.text,marginBottom:7,textAlign:'right'},input:{fontFamily:FONT.regular,fontSize:17,color:C.text,borderWidth:1,borderColor:C.line||'#ddd',borderRadius:12,paddingHorizontal:14,paddingVertical:12,textAlign:'center',letterSpacing:2,marginBottom:12},btn:{backgroundColor:C.brand,borderRadius:12,minHeight:50,alignItems:'center',justifyContent:'center'},selectBtn:{backgroundColor:C.brand,borderRadius:12,minHeight:50,alignItems:'center',justifyContent:'center',marginTop:14},btnTxt:{fontFamily:FONT.bold,color:'#fff',fontSize:15},driverName:{fontFamily:FONT.bold,fontSize:21,color:C.text,textAlign:'right',marginBottom:8},info:{fontFamily:FONT.regular,fontSize:14,color:C.text,textAlign:'right',marginTop:5}});
