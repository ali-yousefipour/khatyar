import React, { useEffect, useState, useCallback } from 'react';
import { faNum } from '../num';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { request } from '../api';
import { C, FONT } from '../theme';
import { refreshUnreadCounts } from '../unread';
import { fj } from '../jdate';
import ActivityIndicator from '../components/PulseLoadingIndicator';

export default function MessagesScreen() {
  const [data, setData] = useState(null);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(() => {
    request('/my/messages').then(setData).catch(() => setData([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function toggle(m) {
    const willOpen = openId !== m.id;
    setOpenId(willOpen ? m.id : null);
    // با باز کردن پیام، همان پیام خوانده‌شده می‌شود
    if (willOpen && !m.read_at) {
      try {
        await request(`/my/messages/${m.id}/read`, { method: 'POST' });
        setData((cur) => (cur || []).map((x) => x.id === m.id ? { ...x, read_at: new Date().toISOString() } : x));
        refreshUnreadCounts();
      } catch (e) {}
    }
  }

  if (!data) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;

  const unread = data.filter((x) => !x.read_at).length;

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <View style={s.head}>
        <Text style={s.headTxt}>پیام‌ها</Text>
        {unread > 0 && <View style={s.badge}><Text style={s.badgeTxt}>{faNum(unread)} خوانده‌نشده</Text></View>}
      </View>
      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: 56 }}
        data={data}
        keyExtractor={(i) => String(i.id)}
        ListEmptyComponent={<Text style={s.empty}>پیامی ندارید.</Text>}
        renderItem={({ item }) => {
          const open = openId === item.id;
          return (
            <TouchableOpacity activeOpacity={0.8} onPress={() => toggle(item)} style={[s.card, !item.read_at && s.unread]}>
              <View style={s.cardHead}>
                <Text style={s.title}>✉ {item.title || 'پیام'}</Text>
                <View style={[s.dot, item.read_at ? s.dotRead : s.dotUnread]}>
                  <Text style={[s.dotTxt, item.read_at ? s.dotTxtRead : s.dotTxtUnread]}>{item.read_at ? 'خوانده‌شده' : 'جدید'}</Text>
                </View>
              </View>
              {open
                ? <View style={s.fullBox}><Text style={s.full}>{item.body}</Text></View>
                : <Text style={s.preview} numberOfLines={1}>{item.body}</Text>}
              <Text style={s.meta}>از {item.sender} · {fj(item.created_at)}{!open ? ' · برای متن کامل ضربه بزنید' : ''}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper },
  head: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: '#fff', borderBottomColor: C.line, borderBottomWidth: 1 },
  headTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 16 },
  badge: { backgroundColor: '#e8f5ef', borderRadius: 9, paddingVertical: 4, paddingHorizontal: 10 },
  badgeTxt: { fontFamily: FONT.bold, color: '#0d7a5f', fontSize: 12 },
  empty: { color: C.muted, fontFamily: FONT.regular, textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 13, padding: 13, marginBottom: 10 },
  unread: { borderRightWidth: 4, borderRightColor: C.brand, backgroundColor: '#fbfffd' },
  cardHead: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  dot: { borderRadius: 8, paddingVertical: 3, paddingHorizontal: 9 },
  dotUnread: { backgroundColor: '#e8f5ef' }, dotRead: { backgroundColor: '#eef1f6' },
  dotTxt: { fontFamily: FONT.bold, fontSize: 11 },
  dotTxtUnread: { color: '#0d7a5f' }, dotTxtRead: { color: '#8a93a6' },
  title: { fontFamily: FONT.bold, color: C.ink, textAlign: 'right', fontSize: 14 },
  preview: { fontFamily: FONT.regular, color: C.muted, textAlign: 'right', fontSize: 13 },
  fullBox: { backgroundColor: '#f4f6fb', borderRadius: 10, padding: 12, marginVertical: 4 },
  full: { fontFamily: FONT.regular, color: C.ink, textAlign: 'right', fontSize: 14, lineHeight: 24 },
  meta: { fontFamily: FONT.regular, color: C.muted, fontSize: 11, textAlign: 'right', marginTop: 6 },
});
