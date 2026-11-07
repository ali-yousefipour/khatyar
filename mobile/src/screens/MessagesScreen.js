import React, { useEffect, useLayoutEffect, useState, useCallback } from 'react';
import { faNum } from '../num';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { request } from '../api';
import { C, FONT } from '../theme';
import { refreshUnreadCounts } from '../unread';
import { fj } from '../jdate';
import ActivityIndicator from '../components/PulseLoadingIndicator';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DetailPageHeader from '../components/DetailPageHeader';

export default function MessagesScreen({navigation}) {
  useLayoutEffect(()=>{navigation.setOptions({headerShown:false});},[navigation]);
  const [data, setData] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const messages = await request('/my/messages', { noStore: true });
      if (!Array.isArray(messages)) throw new Error('پاسخ پیام‌ها معتبر نیست.');
      setData(messages);
      setError('');
    } catch (e) {
      setError(e?.message || 'دریافت پیام‌ها ناموفق بود.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function toggle(m) {
    const willOpen = openId !== m.id;
    setOpenId(willOpen ? m.id : null);
    // با باز کردن پیام، همان پیام خوانده‌شده می‌شود
    if (willOpen && !m.read_at) {
      try {
        await request(`/my/messages/${m.id}/read`, { method: 'POST', queueIfOffline: false });
        setData((cur) => (cur || []).map((x) => x.id === m.id ? { ...x, read_at: new Date().toISOString() } : x));
        refreshUnreadCounts();
      } catch (e) { setError(e?.message || 'ثبت خوانده‌شدن پیام ناموفق بود.'); }
    }
  }

  if (!data && loading) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;

  const unread = (data || []).filter((x) => !x.read_at).length;

  return (
    <View style={{ flex:1, backgroundColor:'#edf8f5' }}>
      <DetailPageHeader title="پیام‌ها" navigation={navigation}/>
      <View style={s.head}>
        <Text style={s.headTxt}>پیام‌ها</Text>
        {unread > 0 && <View style={s.badge}><Text style={s.badgeTxt}>{faNum(unread)} خوانده‌نشده</Text></View>}
      </View>
      {!!error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text><TouchableOpacity style={s.retry} onPress={load} accessibilityRole="button"><Text style={s.retryText}>تلاش مجدد</Text></TouchableOpacity></View>}
      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: 56 }}
        data={data || []}
        refreshing={loading}
        onRefresh={load}
        keyExtractor={(i) => String(i.id)}
        ListEmptyComponent={<Text style={s.empty}>{error ? 'دریافت پیام‌ها انجام نشد؛ دوباره تلاش کنید.' : 'پیامی ندارید.'}</Text>}
        renderItem={({ item }) => {
          const open = openId === item.id;
          return (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`پیام ${item.title || 'بدون عنوان'}`} activeOpacity={0.8} onPress={() => toggle(item)} style={[s.card, !item.read_at && s.unread]}>
              <View style={s.cardHead}>
                <View style={s.titleRow}><MaterialCommunityIcons name="message-text-outline" size={21} color={C.brand}/><Text style={s.title}>{item.title || 'پیام'}</Text></View>
                <View style={[s.dot, item.read_at ? s.dotRead : s.dotUnread]}>
                  <Text style={[s.dotTxt, item.read_at ? s.dotTxtRead : s.dotTxtUnread]}>{item.read_at ? 'خوانده‌شده' : 'جدید'}</Text>
                </View>
              </View>
              {open
                ? <View style={s.fullBox}><Text style={s.full}>{item.body}</Text></View>
                : <Text style={s.preview} numberOfLines={1}>{item.body}</Text>}
              <Text style={s.meta}>از {item.sender} · {fj(item.created_at)}{!open ? ' · برای متن کامل ضربه بزنید' : ''}</Text>
              <View style={s.expandIcon}><MaterialCommunityIcons name={open?'chevron-up':'chevron-down'} size={21} color={C.brand}/></View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  errorBox: { margin: 12, padding: 14, backgroundColor: '#fff1f1', borderColor: '#f3b8c0', borderWidth: 1, borderRadius: 14 },
  errorText: { color: '#982b3d', fontFamily: FONT.regular, lineHeight: 22, textAlign: 'right' },
  retry: { alignSelf: 'flex-end', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, backgroundColor: '#fff', marginTop: 8 },
  retryText: { color: C.brand, fontFamily: FONT.bold },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper },
  head: { flexDirection:'row-reverse', alignItems:'center', justifyContent:'space-between', padding:16, marginHorizontal:16, marginTop:16, borderRadius:19, backgroundColor:'#dbf5e9', borderColor:'#b9e4d0', borderWidth:1 },
  headTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 16 },
  badge: { backgroundColor: '#e8f5ef', borderRadius: 9, paddingVertical: 4, paddingHorizontal: 10 },
  badgeTxt: { fontFamily: FONT.bold, color: '#0d7a5f', fontSize: 12 },
  empty: { color: C.muted, fontFamily: FONT.regular, textAlign: 'center', marginTop: 40 },
  card: { backgroundColor:'#fff', borderColor:'#bfe3d6', borderWidth:1, borderRadius:19, padding:16, marginBottom:12, elevation:2, shadowColor:'#0b624b',shadowOpacity:.08,shadowRadius:9 },
  unread: { borderRightWidth: 4, borderRightColor: C.brand, backgroundColor: '#fbfffd' },
  cardHead: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  titleRow: { flexDirection:'row-reverse', alignItems:'center', gap:8, flex:1, minWidth:0 },
  expandIcon: { alignSelf:'flex-start', marginTop:6, backgroundColor:'#dff5eb', borderRadius:8, width:32, height:29, alignItems:'center', justifyContent:'center' },
  dot: { borderRadius: 8, paddingVertical: 3, paddingHorizontal: 9 },
  dotUnread: { backgroundColor: '#e8f5ef' }, dotRead: { backgroundColor: '#eef1f6' },
  dotTxt: { fontFamily: FONT.bold, fontSize: 11 },
  dotTxtUnread: { color: '#0d7a5f' }, dotTxtRead: { color: '#8a93a6' },
  title: { fontFamily: FONT.bold, color: C.ink, textAlign: 'right', fontSize: 14 },
  preview: { fontFamily: FONT.regular, color: C.muted, textAlign: 'right', fontSize: 13 },
  fullBox: { backgroundColor:'#eaf8f2', borderRadius:12, padding:14, marginVertical:6 },
  full: { fontFamily: FONT.regular, color: C.ink, textAlign: 'right', fontSize: 14, lineHeight: 24 },
  meta: { fontFamily: FONT.regular, color: C.muted, fontSize: 11, textAlign: 'right', marginTop: 6 },
});
