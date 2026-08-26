import React,{useEffect,useState} from 'react';
import {View,Text,ScrollView,StyleSheet,RefreshControl,Alert} from 'react-native';
import {request} from '../api';
import {C,FONT} from '../theme';
import {faNum} from '../num';
import ActivityIndicator from '../components/PulseLoadingIndicator';

const roleTitle={line_supervisor:'ناظر خط',motor_patrol:'گشت موتوری',vehicle_patrol:'بازرس گشت خودرویی',resident_inspector:'بازرس مقیم',chief_inspector:'سربازرس',administrative_visit:'نیروی اداری'};
export default function MyDailyMissionScreen(){
 const [data,setData]=useState(null),[refreshing,setRefreshing]=useState(false),[loadError,setLoadError]=useState('');
 const load=async()=>{
  setLoadError('');
  let firstError=null;
  try{
   const primary=await request('/operations/my-mission',{noStore:true});
   if(primary?.mission || ((primary?.targets||[]).length>0 && !primary?.warning)){
    setData(primary); return;
   }
   firstError=new Error(primary?.warning||'پاسخ مأموریت ناقص است');
  }catch(e){ firstError=e; }
  try{
   const fallback=await request('/my/missions/today',{noStore:true});
   setData(fallback);
   if(fallback?.warning) setLoadError(fallback.warning);
  }catch(e2){
   const msg=e2?.message||firstError?.message||'دریافت مأموریت ناموفق بود';
   setLoadError(msg);
   setData({source:'none',role_key:'other',mission:null,targets:[],summary:{},warning:msg});
   Alert.alert('خطا در مأموریت روزانه',msg);
  }
 };
 useEffect(()=>{load()},[]);
 const refresh=async()=>{setRefreshing(true);await load();setRefreshing(false)};
 if(!data)return <View style={s.center}><ActivityIndicator color={C.brand}/></View>;
 const sum=data.summary||{};
 return <ScrollView style={s.page} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh}/> }>
   <View style={s.head}><Text style={s.headTitle}>مأموریت روزانه من</Text><Text style={s.headSub}>{roleTitle[data.role_key]||'نیروی اجرایی'} · {data.source==='user_override'?'مأموریت اختصاصی':'الگوی سمت'}</Text><Text style={s.big}>{faNum(Math.round(Number(sum.weighted_achievement||0)))}٪</Text><Text style={s.headSub}>تحقق وزنی مأموریت امروز</Text></View>
   {!data.mission?<View style={s.empty}><Text style={s.emptyT}>{data.warning||loadError||'برای سمت شما هنوز الگوی مأموریت فعالی تعریف نشده است.'}</Text></View>:<>
    <View style={s.summary}><Mini n={data.assigned_lines||0} t="خط تخصیصی"/><Mini n={sum.visited_lines||0} t="بازدید"/><Mini n={sum.validated_lines||0} t="پوشش معتبر"/><Mini n={sum.present_total||0} t="راننده حاضر"/></View>
    <View style={s.mission}><Text style={s.mTitle}>{data.mission.title}</Text><Text style={s.mSub}>اهداف به‌صورت خودکار با عملکرد ثبت‌شده امروز محاسبه می‌شوند.</Text></View>
    {(data.targets||[]).map(t=>{const ach=Number(t.achievement_percent||0),actual=Number(t.actual_count||0),den=Number(t.denominator_count||0);return <View key={t.metric_key} style={s.card}>
      <View style={s.row}><Text style={s.title}>{t.title}</Text><Text style={ach>=100?s.ok:s.target}>{faNum(Math.round(ach))}٪ تحقق</Text></View>
      <Text style={s.desc}>{t.description||''}</Text>
      <View style={s.track}><View style={[s.fill,{width:`${Math.min(100,ach)}%`}]}/></View>
      <View style={s.row2}><Text style={s.actual}>عملکرد: {faNum(actual)} از {faNum(den)}</Text><Text style={s.weight}>هدف: {faNum(Number(t.target_percent||0))}٪</Text></View>
      {Number(t.remaining_count||0)>0&&<Text style={s.minimum}>باقی‌مانده تا هدف: {faNum(Number(t.remaining_count))}</Text>}
    </View>})}
   </>}
 </ScrollView>;
}
const Mini=({n,t})=><View style={s.mini}><Text style={s.miniN}>{faNum(Number(n||0))}</Text><Text style={s.miniT}>{t}</Text></View>;
const s=StyleSheet.create({page:{flex:1,backgroundColor:C.paper},content:{padding:14,paddingBottom:40},center:{flex:1,alignItems:'center',justifyContent:'center'},head:{backgroundColor:'#173d69',borderRadius:16,padding:16},headTitle:{fontFamily:FONT.bold,color:'#fff',fontSize:19,textAlign:'right'},headSub:{fontFamily:FONT.regular,color:'#dce8f4',textAlign:'right',marginTop:5},big:{fontFamily:FONT.bold,color:'#fff',fontSize:34,textAlign:'center',marginTop:10},summary:{flexDirection:'row-reverse',flexWrap:'wrap',gap:8,marginTop:10},mini:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:12,padding:10,minWidth:'47%',alignItems:'center'},miniN:{fontFamily:FONT.bold,color:C.ink,fontSize:18},miniT:{fontFamily:FONT.regular,color:C.muted,fontSize:11},mission:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:14,padding:14,marginTop:12},mTitle:{fontFamily:FONT.bold,color:C.ink,fontSize:16,textAlign:'right'},mSub:{fontFamily:FONT.regular,color:C.muted,textAlign:'right',marginTop:5},card:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:14,padding:13,marginTop:10},row:{flexDirection:'row-reverse',justifyContent:'space-between',alignItems:'center',gap:8},title:{fontFamily:FONT.bold,color:C.ink,flex:1,textAlign:'right'},target:{fontFamily:FONT.bold,color:'#9a5c00',backgroundColor:'#fff4d7',paddingHorizontal:9,paddingVertical:5,borderRadius:10},ok:{fontFamily:FONT.bold,color:'#0f7c55',backgroundColor:'#e8f7f0',paddingHorizontal:9,paddingVertical:5,borderRadius:10},desc:{fontFamily:FONT.regular,color:C.muted,textAlign:'right',marginTop:7,lineHeight:20},track:{height:9,backgroundColor:'#e8edf2',borderRadius:8,overflow:'hidden',marginTop:10},fill:{height:'100%',backgroundColor:C.brand,borderRadius:8},row2:{flexDirection:'row-reverse',justifyContent:'space-between',marginTop:10},actual:{fontFamily:FONT.bold,color:'#315f8c'},weight:{fontFamily:FONT.regular,color:C.muted},minimum:{fontFamily:FONT.regular,color:'#b04a42',textAlign:'right',marginTop:7},empty:{backgroundColor:'#fff',padding:20,borderRadius:14,marginTop:12},emptyT:{fontFamily:FONT.regular,color:C.muted,textAlign:'center'}});
