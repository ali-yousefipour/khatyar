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
    <View style={s.pointPill}><Text style={[s.pts,Number(r.total_points)<0&&{color:'#b04a42'}]}>{faNum(Math.round(Number(r.total_points||0)*10)/10)} امتیاز</Text></View>
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
  <View style={s.head}><View style={s.headRow}><MaterialCommunityIcons name="trophy-award" size={27} color="#f4d28a"/><Text style={s.headTitle}>رتبه‌بندی و نشان‌ها</Text></View><Text style={s.headSub}>عملکرد وزن‌دار نیروهای میدانی بر اساس امتیاز</Text></View>

  <View style={s.tabs}>{PERIODS.map(([k,l])=>
   <TouchableOpacity key={k} accessibilityRole="tab" accessibilityLabel={`رتبه‌بندی ${l}`} accessibilityState={{selected:period===k}} style={[s.tab,period===k&&s.tabOn]} onPress={()=>setPeriod(k)}>
    <Text style={[s.tabT,period===k&&s.tabTOn]}>{l}</Text>
   </TouchableOpacity>)}</View>

  {error?<View accessibilityLiveRegion="polite" style={s.errorBox}><Text style={s.errorText}>{error}</Text><TouchableOpacity accessibilityRole="button" onPress={()=>load(period)} style={s.retry}><Text style={s.retryText}>تلاش دوباره</Text></TouchableOpacity></View>:null}
  {loading?<View style={s.center}><ActivityIndicator color={C.brand}/></View>:data?<>
   {(data.items||[]).length>0&&<View style={s.podium}>
    <Text style={s.podiumTitle}>برترین‌های {PERIOD_LABEL[period]}</Text>
    <View style={s.podiumItems}>{[1,0,2].map(index=>{const person=(data.items||[])[index];if(!person)return <View key={index} style={s.podiumColumn}/>;const rank=Number(person.rank||index+1);return <View key={person.user_id||index} style={[s.podiumColumn,rank===1&&s.podiumFirst]}><View style={[s.podiumAvatar,{borderColor:rank===1?'#edc36b':rank===2?'#cbd5e1':'#d49a70'}]}><MaterialCommunityIcons name={rank===1?'trophy':'account-outline'} size={rank===1?30:26} color={rank===1?'#bf8420':'#0f6956'}/></View><View style={[s.podiumRank,{backgroundColor:rank===1?'#f9df9b':rank===2?'#e8edf1':'#f2dac8'}]}><Text style={s.podiumRankText}>{faNum(rank)}</Text></View><Text numberOfLines={2} style={s.podiumName}>{person.user_name}</Text><Text style={s.podiumScore}>{faNum(person.total_points||0)} امتیاز</Text></View>})}</View>
   </View>}
   <View style={s.listHead}><MaterialCommunityIcons name="format-list-numbered-rtl" size={19} color={C.brand}/><Text style={s.listTitle}>جدول امتیازات</Text></View>
   {(data.items||[]).map(r=><RankRow key={r.user_id} r={r}/>)}
   {(!data.items||!data.items.length)&&<View style={s.empty}><Text style={s.emptyT}>برای این بازه هنوز امتیازی ثبت نشده است.</Text></View>}
  </>:null}

  {badges&&badges.length>0&&<View style={{marginTop:18}}>
   <View style={s.badgeHead}><MaterialCommunityIcons name="medal-outline" size={22} color={C.brand}/><Text style={s.secTitle}>نشان‌های من</Text></View>
   <View style={s.badgeWrap}>{badges.map((b,i)=>{
     const meta=BADGE_META[b.badge_key]||{ic:'seal-variant',t:b.badge_key,color:C.brand};
     return <View key={i} style={s.badgeCard}>
       <View style={[s.badgeIcon,{borderColor:meta.color+'55'}]}><MaterialCommunityIcons name={meta.ic} size={30} color={meta.color} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/></View>
       <Text style={s.badgeT}>{meta.t}</Text>
       <Text style={s.badgeP}>{PERIOD_LABEL[b.period_type]||b.period_type} · {b.period_key}</Text>
     </View>;
   })}</View>
  </View>}
 </ScrollView>;
}

const s=StyleSheet.create({
 page:{flex:1,backgroundColor:'#f3f8f6'},content:{padding:14,paddingBottom:40},center:{padding:30,alignItems:'center'},
 head:{backgroundColor:'#075f51',borderRadius:24,padding:20,elevation:3},headRow:{flexDirection:'row-reverse',alignItems:'center',gap:10},headTitle:{flex:1,fontFamily:FONT.bold,color:'#fff',fontSize:20,textAlign:'right'},
 headSub:{fontFamily:FONT.regular,color:'#dceee6',textAlign:'right',marginTop:7,fontSize:12},
 tabs:{flexDirection:'row-reverse',backgroundColor:'#fff',borderRadius:15,borderWidth:1,borderColor:'#dfe9e4',padding:4,marginTop:14,marginBottom:12},
 tab:{flex:1,minHeight:48,justifyContent:'center',paddingVertical:8,borderRadius:11,alignItems:'center'},tabOn:{backgroundColor:'#075f51'},
 tabT:{fontFamily:FONT.regular,color:C.muted},tabTOn:{fontFamily:FONT.bold,color:'#fff'},
 row:{flexDirection:'row-reverse',alignItems:'center',backgroundColor:'#fff',borderWidth:1,borderColor:'#e0eae5',borderRadius:16,padding:12,marginBottom:8,gap:10,elevation:1},
 rowMine:{borderColor:C.brand,borderWidth:2},
 rankBox:{width:40,minHeight:40,alignItems:'center',justifyContent:'center'},rankN:{fontFamily:FONT.bold,color:C.muted,fontSize:15},
 name:{fontFamily:FONT.bold,color:C.ink,textAlign:'right'},role:{fontFamily:FONT.regular,color:C.muted,fontSize:11,textAlign:'right',marginTop:2},
 pts:{fontFamily:FONT.bold,color:'#0f7c55',fontSize:12},pointPill:{backgroundColor:'#e8f5ed',paddingHorizontal:10,paddingVertical:7,borderRadius:10},
 empty:{backgroundColor:'#fff',padding:20,borderRadius:14},emptyT:{fontFamily:FONT.regular,color:C.muted,textAlign:'center'},
 errorBox:{backgroundColor:'#fff7f7',borderColor:'#fecaca',borderWidth:1,borderRadius:14,padding:14,marginBottom:10},
 errorText:{fontFamily:FONT.regular,color:'#9f1d1d',textAlign:'center',lineHeight:22},
 retry:{alignSelf:'center',minHeight:48,justifyContent:'center',paddingHorizontal:20},
 retryText:{fontFamily:FONT.bold,color:C.brand},
 secTitle:{fontFamily:FONT.bold,color:C.ink,fontSize:16,textAlign:'right',flex:1},badgeHead:{flexDirection:'row-reverse',alignItems:'center',gap:9,backgroundColor:'#e2f3ec',borderRadius:13,padding:11,marginBottom:11},
 badgeWrap:{flexDirection:'row-reverse',flexWrap:'wrap',gap:8},
 badgeCard:{backgroundColor:'#fff',borderWidth:1,borderColor:'#e0eae5',borderRadius:17,padding:15,minWidth:144,flexGrow:1,flexBasis:'44%',alignItems:'center',elevation:1},badgeIcon:{width:64,height:64,borderRadius:32,borderWidth:2,backgroundColor:'#f8faf8',alignItems:'center',justifyContent:'center'},
 badgeT:{fontFamily:FONT.bold,color:C.ink,fontSize:13,marginTop:7,textAlign:'center'},badgeP:{fontFamily:FONT.regular,color:C.muted,fontSize:12,marginTop:4,textAlign:'center'},
 podium:{backgroundColor:'#eaf5ef',borderRadius:21,padding:14,marginBottom:16,borderWidth:1,borderColor:'#dbeae2'},podiumTitle:{fontFamily:FONT.bold,color:'#124438',fontSize:15,textAlign:'center',marginBottom:13},podiumItems:{flexDirection:'row-reverse',gap:8,alignItems:'flex-end',justifyContent:'center'},podiumColumn:{flex:1,alignItems:'center',minHeight:127,backgroundColor:'#fff',padding:8,borderRadius:14,justifyContent:'center'},podiumFirst:{minHeight:153,backgroundColor:'#fff3d7',borderWidth:1,borderColor:'#f0d694'},podiumAvatar:{width:51,height:51,borderRadius:26,backgroundColor:'#eaf5ee',borderWidth:2,alignItems:'center',justifyContent:'center'},podiumRank:{borderRadius:12,minWidth:28,alignItems:'center',paddingVertical:2,marginTop:-9},podiumRankText:{fontFamily:FONT.bold,color:'#423a24',fontSize:12},podiumName:{fontFamily:FONT.bold,color:C.ink,fontSize:12,textAlign:'center',marginTop:5},podiumScore:{fontFamily:FONT.regular,color:C.muted,fontSize:11,marginTop:3},listHead:{flexDirection:'row-reverse',alignItems:'center',gap:8,marginBottom:9},listTitle:{fontFamily:FONT.bold,color:C.ink,fontSize:15},
});
