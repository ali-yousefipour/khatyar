import React, { useState, useCallback, useMemo } from 'react';
import { faNum } from '../num';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl, TextInput, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { request } from '../api';
import { C, FONT } from '../theme';
import ActivityIndicator from '../components/PulseLoadingIndicator';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const normalizePresent = (r) => {
  if (Array.isArray(r)) return r;
  if (Array.isArray(r?.items)) return r.items;
  if (Array.isArray(r?.present)) return r.present;
  if (Array.isArray(r?.data)) return r.data;
  return [];
};

export default function PresentListScreen() {
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const { width } = useWindowDimensions();
  const filtered = useMemo(() => (data || []).filter(item => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [item.first_name, item.last_name, item.line_code, item.line_origin].filter(Boolean).join(' ').toLowerCase().includes(q);
  }), [data, query]);

  const load = useCallback(async () => {
    try {
      const result = await request('/attendance/present', { noStore: true, queueIfOffline: false });
      setData(normalizePresent(result));
      setLoadError('');
    } catch (e) {
      setLoadError(e?.message || 'دریافت فهرست حاضرین ممکن نشد.');
      setData((current) => current || []);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function confirmExit(item) {
    Alert.alert(
      'ثبت خروج',
      `خروج «${item.first_name} ${item.last_name}» از خط ثبت شود؟`,
      [
        { text: 'انصراف', style: 'cancel' },
        { text: 'ثبت خروج', style: 'destructive', onPress: () => doExit(item) },
      ]
    );
  }

  async function doExit(item) {
    setBusy(item.driver_id);
    try {
      await request('/attendance/exit', { method: 'POST', body: { driver_id: item.driver_id } });
      load();
    } catch (e) { Alert.alert('خطا', e.message); }
    finally { setBusy(null); }
  }

  if (!data) return <View style={s.center}><ActivityIndicator color={C.brand} /><Text style={s.empty}>در حال دریافت فهرست حاضرین…</Text></View>;

  return (
    <View style={s.screen}>
      <FlatList
        data={filtered}
        keyExtractor={(it, index) => String(it.id ?? it.driver_id ?? index)}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} colors={[C.brand]} />}
        contentContainerStyle={[s.listContent,{paddingHorizontal:width<360?11:16}]}
        ListHeaderComponent={<>
          {loadError ? <View style={s.errorBox}><MaterialCommunityIcons name="alert-circle-outline" size={22} color="#a82b24"/><Text style={s.errorText}>{loadError}{data.length ? ' اطلاعات قبلی نمایش داده می‌شود.' : ''}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="تلاش دوباره برای دریافت حاضرین" onPress={load} style={s.retryBtn}><Text style={s.retryText}>تلاش دوباره</Text></TouchableOpacity></View> : null}
          <View style={s.hero}><View style={s.heroIcon}><MaterialCommunityIcons name="account-group-outline" size={26} color={C.brand}/></View><View style={s.heroCopy}><Text style={s.headTxt}>تاکسیرانان حاضر در خط</Text><Text style={s.headSub}>وضعیت حضور رانندگان و ثبت خروج از خط</Text></View></View>
          <View style={s.stats}><View style={s.statIcon}><MaterialCommunityIcons name="check-circle-outline" size={24} color={C.brand}/></View><View style={s.statCopy}><Text style={s.statValue}>{faNum(data.length)}</Text><Text style={s.statLabel}>راننده حاضر در خط</Text></View><View style={s.livePill}><View style={s.liveDot}/><Text style={s.liveText}>حاضر</Text></View></View>
          <View style={s.searchBox}><MaterialCommunityIcons name="magnify" size={23} color={C.brand}/><TextInput style={s.searchInput} value={query} onChangeText={setQuery} placeholder="جستجوی نام راننده یا شماره خط" placeholderTextColor={C.muted} autoCorrect={false}/>{query.length>0&&<TouchableOpacity accessibilityRole="button" accessibilityLabel="پاک کردن جستجو" onPress={()=>setQuery('')}><MaterialCommunityIcons name="close-circle" size={21} color={C.muted}/></TouchableOpacity>}</View>
          <View style={s.listHeading}><MaterialCommunityIcons name="format-list-bulleted" size={20} color={C.brand}/><Text style={s.listTitle}>فهرست رانندگان</Text><Text style={s.resultCount}>{faNum(filtered.length)} مورد</Text></View>
        </>}
        ListEmptyComponent={loadError ? null : <View style={s.emptyBox}><MaterialCommunityIcons name={query?'account-search-outline':'account-off-outline'} size={34} color={C.muted}/><Text style={s.empty}>{query?'راننده‌ای با این مشخصات پیدا نشد.':'هیچ راننده‌ای در خط حاضر نیست.'}</Text></View>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardTop}>
              <View style={s.avatar}><MaterialCommunityIcons name="account-outline" size={23} color={C.brand}/></View>
              <View style={s.driverInfo}><Text style={s.name}>{item.first_name} {item.last_name}</Text><Text style={s.lineText}>{item.line_code ? `خط ${faNum(item.line_code)}` : 'بدون خط'}{item.line_origin ? ` · ${item.line_origin}` : ''}</Text></View>
              <View style={s.presentPill}><Text style={s.presentText}>حاضر</Text></View>
            </View>
            <View style={s.cardBottom}><View style={s.duration}><MaterialCommunityIcons name="clock-outline" size={17} color={C.brand}/><Text style={s.durationText}>{faNum(item.mins_in || 0)} دقیقه در خط</Text></View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`ثبت خروج ${item.first_name || ''} ${item.last_name || ''}`} style={[s.exitBtn,(busy!==null||!!loadError)&&s.disabled]} onPress={()=>confirmExit(item)} disabled={busy!==null||!!loadError}>{busy===item.driver_id?<ActivityIndicator color="#c53e3e"/>:<><MaterialCommunityIcons name="logout" size={17} color="#c53e3e"/><Text style={s.exitTxt}>ثبت خروج</Text></>}</TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const s=StyleSheet.create({
 center:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:C.paper},
 screen:{flex:1,backgroundColor:C.paper},
 listContent:{paddingTop:16,paddingBottom:36},
 hero:{flexDirection:'row-reverse',alignItems:'center',gap:11,marginBottom:15},
 heroIcon:{width:50,height:50,borderRadius:15,backgroundColor:'#e5f4ec',alignItems:'center',justifyContent:'center'},
 heroCopy:{flex:1,alignItems:'flex-end'},
 headTxt:{fontFamily:FONT.bold,color:C.ink,fontSize:17,textAlign:'right'},
 headSub:{fontFamily:FONT.regular,color:C.muted,fontSize:12,textAlign:'right',marginTop:5,lineHeight:19},
 stats:{flexDirection:'row-reverse',alignItems:'center',gap:12,backgroundColor:'#fff',borderRadius:17,borderWidth:1,borderColor:C.line,padding:15,marginBottom:12},
 statIcon:{width:47,height:47,borderRadius:14,backgroundColor:'#e7f5ed',alignItems:'center',justifyContent:'center'},
 statCopy:{flex:1,alignItems:'flex-end'},
 statValue:{fontFamily:FONT.bold,color:C.brand,fontSize:25},
 statLabel:{fontFamily:FONT.regular,color:C.muted,fontSize:12,marginTop:2},
 livePill:{flexDirection:'row-reverse',alignItems:'center',gap:6,backgroundColor:'#e8f6ee',borderRadius:10,paddingVertical:8,paddingHorizontal:10},
 liveDot:{width:7,height:7,borderRadius:4,backgroundColor:C.brand},
 liveText:{fontFamily:FONT.bold,color:C.brand,fontSize:11},
 searchBox:{flexDirection:'row-reverse',alignItems:'center',gap:9,backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:14,paddingHorizontal:12,minHeight:52,marginBottom:16},
 searchInput:{flex:1,minWidth:0,fontFamily:FONT.regular,color:C.ink,fontSize:13,textAlign:'right',paddingVertical:10},
 listHeading:{flexDirection:'row-reverse',alignItems:'center',gap:8,marginBottom:11},
 listTitle:{fontFamily:FONT.bold,color:C.ink,fontSize:14,flex:1,textAlign:'right'},
 resultCount:{fontFamily:FONT.bold,color:C.brand,fontSize:12,backgroundColor:'#e8f6ee',borderRadius:9,paddingVertical:6,paddingHorizontal:9},
 card:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:17,padding:13,marginBottom:10,elevation:1},
 cardTop:{flexDirection:'row-reverse',alignItems:'center',gap:10},
 avatar:{width:44,height:44,borderRadius:13,backgroundColor:'#e8f5ee',alignItems:'center',justifyContent:'center'},
 driverInfo:{flex:1,minWidth:0,alignItems:'flex-end'},
 name:{fontFamily:FONT.bold,color:C.ink,fontSize:15,textAlign:'right'},
 lineText:{fontFamily:FONT.regular,color:C.muted,fontSize:11.5,marginTop:5,textAlign:'right',lineHeight:19},
 presentPill:{backgroundColor:'#e8f6ee',borderRadius:9,paddingVertical:7,paddingHorizontal:9},
 presentText:{fontFamily:FONT.bold,color:C.brand,fontSize:11},
 cardBottom:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:9,borderTopWidth:1,borderTopColor:'#edf0f2',marginTop:12,paddingTop:11},
 duration:{flexDirection:'row-reverse',alignItems:'center',gap:6,flexShrink:1},
 durationText:{fontFamily:FONT.regular,color:C.slate,fontSize:12},
 exitBtn:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:7,backgroundColor:'#fceceb',borderRadius:11,paddingHorizontal:13,paddingVertical:10,minHeight:48},
 exitTxt:{fontFamily:FONT.bold,color:'#c53e3e',fontSize:12.5},
 disabled:{opacity:.55},
 emptyBox:{alignItems:'center',padding:28,marginTop:25,gap:10},
 empty:{fontFamily:FONT.regular,color:C.muted,fontSize:13,textAlign:'center'},
 errorBox:{backgroundColor:'#fff3f1',borderColor:'#f0c6bf',borderWidth:1,borderRadius:15,padding:12,gap:10,alignItems:'center',marginBottom:14},
 errorText:{fontFamily:FONT.regular,fontSize:13,color:'#89241e',textAlign:'center',lineHeight:21},
 retryBtn:{minHeight:48,paddingHorizontal:20,backgroundColor:C.brand,borderRadius:12,alignItems:'center',justifyContent:'center'},
 retryText:{fontFamily:FONT.bold,fontSize:13,color:'#fff'}
});
