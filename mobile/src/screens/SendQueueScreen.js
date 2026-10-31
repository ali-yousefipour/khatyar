import React from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C, FONT } from '../theme';
import { pending } from '../offline';
import { retryQueuedRequest, flushQueuedRequests } from '../api';

function hidden(item){
  const p=String(item?.path||'').toLowerCase();
  return /location|background|gps|geolocation|tracking|position/.test(p) || /\/(location|tracking|geolocation)(\/|\?|$)/.test(p);
}
function queueType(item){
  const p=String(item?.path||'').toLowerCase();
  if(/school-service|school.*inspection|inspection.*school/.test(p)) return 'school';
  if(/checkin|checkout|attendance|presence/.test(p)) return /driver|driver.*attendance|attendance.*driver/.test(p)?'driverAttendance':'attendance';
  if(/checklist/.test(p)) return 'checklist';
  if(/report/.test(p)) return 'report';
  if(/notice|warning|tazkor|تذکر/.test(p)) return 'notice';
  return null;
}
function label(item){
  const p=String(item?.path||'').toLowerCase();
  if(/school-service|school.*inspection|inspection.*school/.test(p)) return 'بازدید / تذکر بازرسی سرویس مدارس';
  if(/checkin|checkout|attendance|presence/.test(p)) return /driver|driver.*attendance|attendance.*driver/.test(p)?'ثبت حضور رانندگان':'ثبت حضور کاربر';
  if(/checklist/.test(p)) return 'چک‌لیست';
  if(/report/.test(p)) return 'گزارشات';
  if(/notice|warning|tazkor|تذکر/.test(p)) return 'ثبت تذکر';
  return 'ارسال اطلاعات';
}
function detail(item){
  const b=item?.body||item?.fields||{};
  const p=String(item?.path||'');
  const id=b?.client_uuid||item?.client_uuid||'';
  return [label(item), id ? 'شناسه: '+String(id).slice(-8) : '', item?.last_error ? 'آخرین خطا: '+item.last_error : '', p].filter(Boolean).join(' • ');
}
export default function SendQueueScreen(){
 const [items,setItems]=React.useState([]),[busy,setBusy]=React.useState(false),[retrying,setRetrying]=React.useState({});
 const [loading,setLoading]=React.useState(true),[error,setError]=React.useState('');
 const load=React.useCallback(async({silent=false}={})=>{if(!silent)setLoading(true);try{const q=await pending();setItems(q.filter(x=>!hidden(x)&&queueType(x)));setError('')}catch(e){setError(e?.message||'خواندن صف ارسال ناموفق بود.')}finally{if(!silent)setLoading(false)}},[]);
 React.useEffect(()=>{load();const t=setInterval(()=>load({silent:true}),4000);return()=>clearInterval(t)},[load]);
 const retryOne=async id=>{setRetrying(x=>({...x,[id]:true}));try{await retryQueuedRequest(id);await load()}catch(e){Alert.alert('ارسال ناموفق',e?.message||'ارسال انجام نشد.')}finally{setRetrying(x=>({...x,[id]:false}))}};
 const retryAll=async()=>{if(busy)return;setBusy(true);try{await flushQueuedRequests({force:true});await load()}catch(e){setError(e?.message||'ارسال موارد صف ناموفق بود.')}finally{setBusy(false)}};
 return <View style={s.page}>
  <View style={s.head}><Text style={s.title}>صف ارسال</Text><Text style={s.sub}>{items.length?'موارد ارسال‌نشده منتظر ارسال هستند.':'صف ارسال خالی است.'}</Text></View>
  <View style={s.actions}><TouchableOpacity style={[s.primary,(busy||loading||!items.length)&&{opacity:.55}]} disabled={busy||loading||!items.length} onPress={retryAll}><Text style={s.primaryText}>{busy?'در حال ارسال…':'تلاش مجدد برای ارسال همه'}</Text></TouchableOpacity><TouchableOpacity style={s.refresh} disabled={loading} onPress={load}><Text style={s.refreshText}>{loading?'در حال دریافت…':'بروزرسانی'}</Text></TouchableOpacity></View>
  <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load}/>} contentContainerStyle={s.list}>
   {error?<View style={s.errorBox}><Text style={s.errorText}>{error}</Text><TouchableOpacity onPress={load} style={s.retry}><Text style={s.retryText}>تلاش مجدد</Text></TouchableOpacity></View>:null}
   {!loading&&!error&&!items.length?<View style={s.empty}><Text style={s.emptyIcon}>✓</Text><Text style={s.emptyTitle}>موردی برای ارسال وجود ندارد</Text><Text style={s.emptyText}>داده‌های موقعیتی که در پس‌زمینه ارسال می‌شوند در این فهرست نمایش داده نمی‌شوند.</Text></View>:items.map(item=><View key={String(item.client_uuid)} style={s.card}>
    <View style={s.row}><View style={s.badge}><Text style={s.badgeText}>در صف</Text></View><Text style={s.cardTitle}>{label(item)}</Text></View>
    <Text style={s.detail}>{detail(item)}</Text>
    <Text style={s.time}>تلاش قبلی: {Number(item.attempts||0)} بار</Text>
    <TouchableOpacity style={s.retry} disabled={!!retrying[item.client_uuid]} onPress={()=>retryOne(item.client_uuid)}><Text style={s.retryText}>{retrying[item.client_uuid]?'در حال ارسال…':'تلاش مجدد برای ارسال'}</Text></TouchableOpacity>
   </View>)}
  </ScrollView>
 </View>
}
const s=StyleSheet.create({
 page:{flex:1,backgroundColor:C.paper},head:{padding:20,backgroundColor:C.brand,alignItems:'flex-end'},title:{color:'#fff',fontFamily:FONT.bold,fontSize:23,textAlign:'right',writingDirection:'rtl'},sub:{color:'#dcefe9',fontFamily:FONT.regular,fontSize:12,marginTop:6,textAlign:'right',writingDirection:'rtl'},actions:{padding:12,flexDirection:'row-reverse',gap:8},primary:{flex:1,minHeight:46,borderRadius: 15, backgroundColor: C.brand,alignItems:'center',justifyContent:'center'},primaryText:{color:'#fff',fontFamily:FONT.bold,fontSize:12},refresh:{width:105,minHeight:46,borderRadius:12,borderWidth:1,borderColor:C.line,backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},refreshText:{color:C.ink,fontFamily:FONT.bold,fontSize:12},list:{padding:12,paddingBottom:30},card:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius: 18, padding: 16,marginBottom:10},row:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between'},cardTitle:{flex:1,color:C.ink,fontFamily:FONT.bold,fontSize:14,textAlign:'right',writingDirection:'rtl'},badge:{backgroundColor:'#fff4d6',borderRadius:8,paddingHorizontal:9,paddingVertical:5,marginLeft:8},badgeText:{color:'#8a6100',fontFamily:FONT.bold,fontSize:10},detail:{color:C.muted,fontFamily:FONT.regular,fontSize:11,lineHeight:19,textAlign:'right',writingDirection:'rtl',marginTop:8},time:{color:C.muted,fontFamily:FONT.regular,fontSize:10,textAlign:'right',writingDirection:'rtl',marginTop:5},retry:{marginTop:11,minHeight:40,borderRadius:10,backgroundColor:C.soft,alignItems:'center',justifyContent:'center'},retryText:{color:C.brand,fontFamily:FONT.bold,fontSize:12},empty:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:16,padding:28,alignItems:'center',marginTop:10},emptyIcon:{fontSize:34,color:'#159447',fontFamily:FONT.bold},emptyTitle:{fontFamily:FONT.bold,color:C.ink,fontSize:15,marginTop:8},emptyText:{fontFamily:FONT.regular,color:C.muted,fontSize:11,lineHeight:20,textAlign:'center',marginTop:7},errorBox:{backgroundColor:'#fff1f1',borderWidth:1,borderColor:'#f3b8c0',padding:14,borderRadius:14,marginBottom:12},errorText:{fontFamily:FONT.regular,color:'#982b3d',textAlign:'right',lineHeight:22}
});
