import React,{useEffect,useState,useRef} from 'react';
import {View,Text,ScrollView,StyleSheet,RefreshControl,TouchableOpacity} from 'react-native';
import {request} from '../api';
import {C,FONT} from '../theme';
import {faNum} from '../num';
import ActivityIndicator from '../components/PulseLoadingIndicator';
import {MaterialCommunityIcons} from '@expo/vector-icons';

const PERIODS=[['daily','روزانه'],['weekly','هفتگی'],['monthly','ماهانه']];
const BADGE_META={gold:{ic:'trophy',t:'نفر اول',color:'#a66c12'},silver:{ic:'medal',t:'نفر دوم',color:'#64748b'},bronze:{ic:'medal-outline',t:'نفر سوم',color:'#9a5a38'},discipline:{ic:'shield-check-outline',t:'انضباط',color:C.brand},best_report:{ic:'file-document-check-outline',t:'بهترین گزارش',color:C.brand}};
const PERIOD_LABEL={daily:'روزانه',weekly:'هفتگی',monthly:'ماهانه'};

const RankRow=({r,mine})=>{
  const medal=r.rank===1?'trophy':r.rank===2?'medal':r.rank===3?'medal-outline':null;
  return <View style={[s.row,mine&&s.rowMine]}>
    <View style={s.rankBox}>{medal?<MaterialCommunityIcons name={medal} size={26} color={r.rank===1?'#a66c12':r.rank===2?'#64748b':'#9a5a38'}/>:<Text style={s.rankN}>{faNum(r.rank)}</Text>}</View>
    <View style={{flex:1}}><Text style={s.name}>{r.user_name}</Text><Text style={s.role}>{r.role_title||''}</Text></View>
    <Text style={[s.pts,Number(r.total_points)<0&&{color:'#b04a42'}]}>{faNum(Math.round(Number(r.total_points||0)*10)/10)}</Text>
  </View>;
};

export default function LeaderboardScreen(){
 const [period,setPeriod]=useState('daily');
 const [data,setData]=useState(null);
 const [badges,setBadges]=useState(null);
 const [refreshing,setRefreshing]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const generation=useRef(0);

 const load=async(p)=>{
  const current=++generation.current;
  setLoading(true);setError('');
  try{
   const [lb,my]=await Promise.all([request('/leaderboard?period='+p,{noStore:true}),request('/my/badges',{noStore:true})]);
   if(current!==generation.current)return;
   setData(lb); setBadges(my.items||[]);
  }catch(e){if(current===generation.current){setError(e?.message||'دریافت رتبه‌بندی ناموفق بود.');setData(null);setBadges(null);}}
  finally{if(current===generation.current){setLoading(false);setRefreshing(false);}}
 };
 useEffect(()=>{load(period);return()=>{generation.current+=1;};},[period]);
 const refresh=()=>{if(refreshing)return;setRefreshing(true);load(period);};

 return <ScrollView persistentScrollbar={true} style={s.page} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh}/>}>
  <View style={s.head}><Text style={s.headTitle}>رتبه‌بندی و نشان‌ها</Text><Text style={s.headSub}>عملکرد وزن‌دار نیروهای میدانی بر اساس امتیاز</Text></View>

  <View style={s.tabs}>{PERIODS.map(([k,l])=>
   <TouchableOpacity key={k} accessibilityRole="tab" accessibilityLabel={`رتبه‌بندی ${l}`} accessibilityState={{selected:period===k}} style={[s.tab,period===k&&s.tabOn]} onPress={()=>setPeriod(k)}>
    <Text style={[s.tabT,period===k&&s.tabTOn]}>{l}</Text>
   </TouchableOpacity>)}</View>

  {error?<View accessibilityLiveRegion="polite" style={s.errorBox}><Text style={s.errorText}>{error}</Text><TouchableOpacity accessibilityRole="button" onPress={()=>load(period)} style={s.retry}><Text style={s.retryText}>تلاش دوباره</Text></TouchableOpacity></View>:null}
  {loading?<View style={s.center}><ActivityIndicator color={C.brand}/></View>:data?<>
   {(data.items||[]).map(r=><RankRow key={r.user_id} r={r}/>)}
   {(!data.items||!data.items.length)&&<View style={s.empty}><Text style={s.emptyT}>برای این بازه هنوز امتیازی ثبت نشده است.</Text></View>}
  </>:null}

  {badges&&badges.length>0&&<View style={{marginTop:18}}>
   <Text style={s.secTitle}>نشان‌های من</Text>
   <View style={s.badgeWrap}>{badges.map((b,i)=>{
     const meta=BADGE_META[b.badge_key]||{ic:'seal-variant',t:b.badge_key,color:C.brand};
     return <View key={i} style={s.badgeCard}>
       <MaterialCommunityIcons name={meta.ic} size={28} color={meta.color} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/>
       <Text style={s.badgeT}>{meta.t}</Text>
       <Text style={s.badgeP}>{PERIOD_LABEL[b.period_type]||b.period_type} · {b.period_key}</Text>
     </View>;
   })}</View>
  </View>}
 </ScrollView>;
}

const s=StyleSheet.create({
 page:{flex:1,backgroundColor:C.paper},content:{padding:14,paddingBottom:40},center:{padding:30,alignItems:'center'},
 head:{backgroundColor:C.brand,borderRadius:20,padding:20},headTitle:{fontFamily:FONT.bold,color:'#fff',fontSize:20,textAlign:'right'},
 headSub:{fontFamily:FONT.regular,color:'#dce8f4',textAlign:'right',marginTop:5},
 tabs:{flexDirection:'row-reverse',backgroundColor:'#fff',borderRadius:12,borderWidth:1,borderColor:C.line,padding:4,marginTop:14,marginBottom:10},
 tab:{flex:1,minHeight:48,justifyContent:'center',paddingVertical:8,borderRadius:9,alignItems:'center'},tabOn:{backgroundColor:C.brand},
 tabT:{fontFamily:FONT.regular,color:C.muted},tabTOn:{fontFamily:FONT.bold,color:'#fff'},
 row:{flexDirection:'row-reverse',alignItems:'center',backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:12,padding:11,marginBottom:7,gap:10},
 rowMine:{borderColor:C.brand,borderWidth:2},
 rankBox:{width:40,minHeight:40,alignItems:'center',justifyContent:'center'},rankN:{fontFamily:FONT.bold,color:C.muted,fontSize:15},
 name:{fontFamily:FONT.bold,color:C.ink,textAlign:'right'},role:{fontFamily:FONT.regular,color:C.muted,fontSize:11,textAlign:'right',marginTop:2},
 pts:{fontFamily:FONT.bold,color:'#0f7c55',fontSize:15},
 empty:{backgroundColor:'#fff',padding:20,borderRadius:14},emptyT:{fontFamily:FONT.regular,color:C.muted,textAlign:'center'},
 errorBox:{backgroundColor:'#fff7f7',borderColor:'#fecaca',borderWidth:1,borderRadius:14,padding:14,marginBottom:10},
 errorText:{fontFamily:FONT.regular,color:'#9f1d1d',textAlign:'center',lineHeight:22},
 retry:{alignSelf:'center',minHeight:48,justifyContent:'center',paddingHorizontal:20},
 retryText:{fontFamily:FONT.bold,color:C.brand},
 secTitle:{fontFamily:FONT.bold,color:C.ink,fontSize:15,textAlign:'right',marginBottom:8},
 badgeWrap:{flexDirection:'row-reverse',flexWrap:'wrap',gap:8},
 badgeCard:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:16,padding:15,minWidth:144,flexGrow:1,flexBasis:'44%',alignItems:'center'},
 badgeT:{fontFamily:FONT.bold,color:C.ink,fontSize:13,marginTop:4,textAlign:'center'},badgeP:{fontFamily:FONT.regular,color:C.muted,fontSize:12,marginTop:4,textAlign:'center'},
});
