import React,{useEffect,useState} from 'react';
import {View,Text,ScrollView,StyleSheet,RefreshControl,TouchableOpacity,Alert} from 'react-native';
import {request} from '../api';
import {C,FONT} from '../theme';
import {faNum} from '../num';
import ActivityIndicator from '../components/PulseLoadingIndicator';

const PERIODS=[['daily','روزانه'],['weekly','هفتگی'],['monthly','ماهانه']];
const BADGE_META={gold:{ic:'🥇',t:'نفر اول'},silver:{ic:'🥈',t:'نفر دوم'},bronze:{ic:'🥉',t:'نفر سوم'},discipline:{ic:'🛡',t:'انضباط'},best_report:{ic:'📷',t:'بهترین گزارش'}};
const PERIOD_LABEL={daily:'روزانه',weekly:'هفتگی',monthly:'ماهانه'};

const RankRow=({r,mine})=>{
  const medal=r.rank===1?'🥇':r.rank===2?'🥈':r.rank===3?'🥉':null;
  return <View style={[s.row,mine&&s.rowMine]}>
    <View style={s.rankBox}>{medal?<Text style={s.medal}>{medal}</Text>:<Text style={s.rankN}>{faNum(r.rank)}</Text>}</View>
    <View style={{flex:1}}><Text style={s.name}>{r.user_name}</Text><Text style={s.role}>{r.role_title||''}</Text></View>
    <Text style={[s.pts,Number(r.total_points)<0&&{color:'#b04a42'}]}>{faNum(Math.round(Number(r.total_points||0)*10)/10)}</Text>
  </View>;
};

export default function LeaderboardScreen(){
 const [period,setPeriod]=useState('daily');
 const [data,setData]=useState(null);
 const [badges,setBadges]=useState(null);
 const [meId,setMeId]=useState(null);
 const [refreshing,setRefreshing]=useState(false);

 const load=async(p)=>{
  try{
   const [lb,my]=await Promise.all([request('/leaderboard?period='+p,{noStore:true}),request('/my/badges',{noStore:true})]);
   setData(lb); setBadges(my.items||[]);
  }catch(e){Alert.alert('خطا',e.message||'دریافت رتبه‌بندی ناموفق بود');}
 };
 useEffect(()=>{load(period);},[period]);
 const refresh=async()=>{setRefreshing(true);await load(period);setRefreshing(false);};

 return <ScrollView style={s.page} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh}/>}>
  <View style={s.head}><Text style={s.headTitle}>رتبه‌بندی و نشان‌ها</Text><Text style={s.headSub}>عملکرد وزن‌دار نیروهای میدانی بر اساس امتیاز</Text></View>

  <View style={s.tabs}>{PERIODS.map(([k,l])=>
   <TouchableOpacity key={k} style={[s.tab,period===k&&s.tabOn]} onPress={()=>setPeriod(k)}>
    <Text style={[s.tabT,period===k&&s.tabTOn]}>{l}</Text>
   </TouchableOpacity>)}</View>

  {!data?<View style={s.center}><ActivityIndicator color={C.brand}/></View>:<>
   {(data.items||[]).map(r=><RankRow key={r.user_id} r={r}/>)}
   {(!data.items||!data.items.length)&&<View style={s.empty}><Text style={s.emptyT}>برای این بازه هنوز امتیازی ثبت نشده است.</Text></View>}
  </>}

  {badges&&badges.length>0&&<View style={{marginTop:18}}>
   <Text style={s.secTitle}>نشان‌های من</Text>
   <View style={s.badgeWrap}>{badges.map((b,i)=>{
     const meta=BADGE_META[b.badge_key]||{ic:'🏅',t:b.badge_key};
     return <View key={i} style={s.badgeCard}>
       <Text style={s.badgeIc}>{meta.ic}</Text>
       <Text style={s.badgeT}>{meta.t}</Text>
       <Text style={s.badgeP}>{PERIOD_LABEL[b.period_type]||b.period_type} · {b.period_key}</Text>
     </View>;
   })}</View>
  </View>}
 </ScrollView>;
}

const s=StyleSheet.create({
 page:{flex:1,backgroundColor:C.paper},content:{padding:14,paddingBottom:40},center:{padding:30,alignItems:'center'},
 head:{backgroundColor:'#173d69',borderRadius:16,padding:16},headTitle:{fontFamily:FONT.bold,color:'#fff',fontSize:19,textAlign:'right'},
 headSub:{fontFamily:FONT.regular,color:'#dce8f4',textAlign:'right',marginTop:5},
 tabs:{flexDirection:'row-reverse',backgroundColor:'#fff',borderRadius:12,borderWidth:1,borderColor:C.line,padding:4,marginTop:14,marginBottom:10},
 tab:{flex:1,paddingVertical:8,borderRadius:9,alignItems:'center'},tabOn:{backgroundColor:C.brand},
 tabT:{fontFamily:FONT.regular,color:C.muted},tabTOn:{fontFamily:FONT.bold,color:'#fff'},
 row:{flexDirection:'row-reverse',alignItems:'center',backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:12,padding:11,marginBottom:7,gap:10},
 rowMine:{borderColor:C.brand,borderWidth:2},
 rankBox:{width:34,alignItems:'center'},medal:{fontSize:20},rankN:{fontFamily:FONT.bold,color:C.muted,fontSize:15},
 name:{fontFamily:FONT.bold,color:C.ink,textAlign:'right'},role:{fontFamily:FONT.regular,color:C.muted,fontSize:11,textAlign:'right',marginTop:2},
 pts:{fontFamily:FONT.bold,color:'#0f7c55',fontSize:15},
 empty:{backgroundColor:'#fff',padding:20,borderRadius:14},emptyT:{fontFamily:FONT.regular,color:C.muted,textAlign:'center'},
 secTitle:{fontFamily:FONT.bold,color:C.ink,fontSize:15,textAlign:'right',marginBottom:8},
 badgeWrap:{flexDirection:'row-reverse',flexWrap:'wrap',gap:8},
 badgeCard:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:12,padding:12,minWidth:'30%',alignItems:'center'},
 badgeIc:{fontSize:26},badgeT:{fontFamily:FONT.bold,color:C.ink,fontSize:12,marginTop:4},badgeP:{fontFamily:FONT.regular,color:C.muted,fontSize:10,marginTop:2},
});
