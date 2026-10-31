import React,{useEffect,useState} from 'react';
import {ScrollView,View,Text,TouchableOpacity,StyleSheet} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useAuth} from '../auth';
import {readAllowedLines,refreshAllowedLines} from '../allowedLinesCache';
import {faNum} from '../num';
import {C,FONT} from '../theme';

const lineStatus=value=>({active:'فعال',inactive:'غیرفعال',disabled:'غیرفعال',open:'فعال',closed:'بسته',1:'فعال',0:'غیرفعال'}[String(value??'').toLowerCase()]||null);

export default function MyAllowedLinesScreen(){
  const{user}=useAuth();
  const[lines,setLines]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(false);
  const refresh=async()=>{setLoading(true);try{const rows=await refreshAllowedLines(user?.id);setLines(rows);setError(false);}catch(_){setError(true);}finally{setLoading(false)}};
  useEffect(()=>{let active=true;(async()=>{const cached=await readAllowedLines(user?.id);if(!active)return;if(cached!==null){setLines(cached);setLoading(false);}try{const rows=await refreshAllowedLines(user?.id);if(active){setLines(rows);setError(false);}}catch(_){if(active)setError(true);}finally{if(active)setLoading(false);}})();return()=>{active=false}},[user?.id]);
  return <ScrollView style={s.page} contentContainerStyle={s.content}>
    <View style={s.head}><MaterialCommunityIcons name="routes" size={30} color={C.brand}/><View style={{flex:1}}><Text style={s.title}>خطوط مجاز شما</Text><Text style={s.hint}>خطوط اختصاص‌یافته به حساب کاربری شما و آمار هر خط</Text></View></View>
    {lines!==null&&<View style={s.countBar}><Text style={s.countBarTitle}>{faNum(lines.length)} خط مجاز</Text><Text style={s.hint}>{loading?'در حال به‌روزرسانی…':error?'اطلاعات ذخیره‌شده':'اطلاعات به‌روز'}</Text></View>}
    {error&&<View style={s.notice}><MaterialCommunityIcons name="wifi-off" size={22} color="#a65e00"/><View style={{flex:1}}><Text style={s.noticeText}>{lines!==null?'اتصال به سرور برقرار نشد؛ آخرین اطلاعات ذخیره‌شده نمایش داده می‌شود.':'دریافت خطوط مجاز ممکن نشد. اتصال اینترنت را بررسی کنید.'}</Text><TouchableOpacity accessibilityRole="button" onPress={refresh} disabled={loading} style={s.retry}><Text style={s.retryText}>{loading?'در حال دریافت…':'تلاش دوباره'}</Text></TouchableOpacity></View></View>}
    {lines===null&&!error?<Text style={s.hint}>در حال دریافت خطوط مجاز…</Text>:null}
    {lines?.length===0?<View style={s.card}><Text style={s.hint}>هنوز خطی به حساب شما اختصاص داده نشده است.</Text></View>:null}
    {lines?.map((line,index)=><View key={String(line.id||index)} style={s.card}><View style={s.lineHead}><View style={{flex:1}}><Text style={s.lineTitle}>خط {faNum(line.code??line.id)}</Text><Text style={s.route}>{line.origin||'مبدأ نامشخص'}{line.destination?' ← '+line.destination:''}</Text></View><MaterialCommunityIcons name="bus-multiple" size={28} color={C.brand}/></View>{lineStatus(line.status)&&<Text style={s.status}>{lineStatus(line.status)}</Text>}<View style={s.stats}>{[['ناوگان',line.fleet_count],['راننده اصلی',line.primary_driver_count],['راننده کمکی',line.helper_driver_count]].map(([label,value])=><View key={label} style={s.stat}><Text style={s.count}>{value==null?'—':faNum(value)}</Text><Text style={s.hint}>{label}</Text></View>)}</View></View>)}
  </ScrollView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:C.paper},content:{padding:16,paddingBottom:48},head:{backgroundColor:'#eaf6f0',borderRadius:18,padding:18,flexDirection:'row-reverse',alignItems:'center',gap:12,marginBottom:16},title:{fontFamily:FONT.bold,fontSize:19,color:C.brand,textAlign:'right'},hint:{fontFamily:FONT.regular,fontSize:12,color:C.muted,textAlign:'right',lineHeight:21},countBar:{flexDirection:'row-reverse',justifyContent:'space-between',alignItems:'center',marginBottom:12},countBarTitle:{fontFamily:FONT.bold,fontSize:14,color:C.ink},notice:{backgroundColor:'#fff8e8',borderRadius:14,padding:14,marginBottom:12,flexDirection:'row-reverse',gap:10},noticeText:{fontFamily:FONT.regular,color:C.ink,fontSize:12,textAlign:'right',lineHeight:21},retry:{alignSelf:'flex-end',minHeight:48,justifyContent:'center',paddingHorizontal:15},retryText:{fontFamily:FONT.bold,color:C.brand},card:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:17,padding:16,marginBottom:12},lineHead:{flexDirection:'row-reverse',alignItems:'center',gap:12},lineTitle:{fontFamily:FONT.bold,fontSize:17,color:C.brand,textAlign:'right'},route:{fontFamily:FONT.regular,fontSize:13,color:C.ink,textAlign:'right',marginTop:7},status:{fontFamily:FONT.bold,color:C.brand,backgroundColor:'#eaf6f0',borderRadius:99,alignSelf:'flex-start',overflow:'hidden',paddingHorizontal:12,paddingVertical:5,marginTop:10,fontSize:12},stats:{flexDirection:'row-reverse',gap:8,marginTop:14},stat:{flex:1,alignItems:'center',padding:8,borderRadius:12,backgroundColor:'#f1f7f4'},count:{fontFamily:FONT.bold,fontSize:17,color:C.ink}});
