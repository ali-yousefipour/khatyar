import React, { useEffect, useState, useCallback } from 'react';
import { faNum } from '../num';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { request } from '../api';
import { C, FONT } from '../theme';
import { fj } from '../jdate';
import ActivityIndicator from '../components/PulseLoadingIndicator';

export default function NotificationsScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [opening, setOpening] = useState(false);
  const [allRead, setAllRead] = useState(false);

  const load = useCallback(() => {
    request('/my/notifications').then(d => { setData(d); setAllRead(false); }).catch(() => setData({ items: [], unread: 0 }));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markRead() {
    // ۱) mark در backend (شامل dismiss alerts)
    await request('/my/notifications/read', { method: 'POST' }).catch(() => {});
    // ۲) همهٔ آیتم‌ها را locally خوانده‌شده نشان بده
    setAllRead(true);
    setData(prev => prev ? {
      ...prev,
      unread: 0,
      items: (prev.items || []).map(n => ({ ...n, is_read: true })),
    } : prev);
    // ۳) بعد از ۱ ثانیه reload کامل (badge هدر هم به‌روز می‌شود)
    setTimeout(() => load(), 1000);
  }

  async function remove(n) {
    try { await request(`/my/notifications/${n.id}`, { method: 'DELETE' }); setData(prev => prev ? { ...prev, items: (prev.items || []).filter(x => x.id !== n.id) } : prev); } catch {}
  }

  async function open(n) {
    setOpening(true);
    try {
      if (n.id && !n.is_read) {
        await request(`/my/notifications/${String(n.id)}/read`, { method: 'POST' }).catch(() => {});
        setData(prev => prev ? {
          ...prev,
          unread: Math.max(0, (prev.unread || 1) - 1),
          items: (prev.items || []).map(x => x.id === n.id ? { ...x, is_read: true } : x),
        } : prev);
      }
      const nid = n.data?.national_id;
      if (nid) {
        const res = await request(`/search?national_id=${nid}`);
        navigation.navigate('Driver', { driver: res.driver, vehicle: res.vehicle, warnings: res.warnings });
      }
    } catch {}
    finally { setOpening(false); }
  }

  if (!data) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;

  const items = data.items || [];
  const unreadCount = allRead ? 0 : Math.min((data.unread != null ? data.unread : items.filter(n => !n.is_read).length), 99);

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      {opening && (
        <View style={s.overlay}>
          <ActivityIndicator color={C.brand} size="large" />
          <Text style={s.overlayTxt}>در حال باز کردن…</Text>
        </View>
      )}
      {items.length > 0 && (
        <TouchableOpacity style={[s.readAll, unreadCount === 0 && { opacity: 0.5 }]} onPress={markRead} disabled={unreadCount === 0}>
          <Text style={s.readAllTxt}>
            {unreadCount > 0
              ? `علامت‌گذاری همه به‌عنوان خوانده‌شده (${unreadCount > 99 ? '+۹۹' : faNum(unreadCount)})`
              : '✓ همهٔ اعلان‌ها خوانده شده‌اند'}
          </Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={items}
        keyExtractor={(i, idx) => String(i.id || 'a' + idx)}
        contentContainerStyle={{ padding: 16, paddingBottom: 56 }}
        ListEmptyComponent={<Text style={s.empty}>اعلانی وجود ندارد</Text>}
        renderItem={({ item }) => {
          const isRead = allRead || !!item.is_read;
          return (
            <TouchableOpacity style={[s.card, !isRead && s.unread, item.type === 'alert' && s.alert]} onPress={() => open(item)}>
              <View style={s.cardHead}>
                <Text style={s.title}>{item.type === 'alert' ? '⚠ ' : ''}{item.title}</Text>
                <View style={[s.badge, isRead ? s.badgeRead : s.badgeUnread]}>
                  <Text style={[s.badgeTxt, isRead ? s.badgeTxtRead : s.badgeTxtUnread]}>
                    {item.type === 'alert' ? 'هشدار' : (isRead ? 'خوانده‌شده' : 'خوانده‌نشده')}
                  </Text>
                </View>
              </View>
              <Text style={s.body}>{item.body}</Text>
              {item.created_at ? <Text style={s.time}>{fj(item.created_at)}</Text> : null}
              {item.data?.national_id ? <Text style={s.hint}>برای مشاهدهٔ راننده ضربه بزنید ›</Text> : null}
              {item.id && !String(item.id).startsWith('expiry:') ? <TouchableOpacity style={s.delBtn} onPress={(e) => { e.stopPropagation && e.stopPropagation(); remove(item); }}><Text style={s.delTxt}>حذف اعلان</Text></TouchableOpacity> : null}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  cardHead: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  badge: { borderRadius: 8, paddingVertical: 3, paddingHorizontal: 9 },
  badgeUnread: { backgroundColor: '#e8f5ef' },
  badgeRead: { backgroundColor: '#eef1f6' },
  badgeTxt: { fontFamily: FONT.bold, fontSize: 11 },
  badgeTxtUnread: { color: '#0d7a5f' },
  badgeTxtRead: { color: '#8a93a6' },
  hint: { fontFamily: FONT.regular, color: C.brand, fontSize: 12, marginTop: 6, textAlign: 'left' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,.7)', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  overlayTxt: { fontFamily: FONT.regular, color: C.ink, marginTop: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper },
  empty: { color: C.muted, fontFamily: FONT.regular, textAlign: 'center', marginTop: 40 },
  readAll: { backgroundColor: C.taxi, padding: 10, alignItems: 'center' },
  readAllTxt: { color: C.taxiInk, fontFamily: FONT.bold, fontSize: 12 },
  card: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 13, padding: 13, marginBottom: 10 },
  delBtn: { alignSelf: 'flex-start', marginTop: 8, backgroundColor: '#ffecec', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  delTxt: { fontFamily: FONT.bold, color: C.danger, fontSize: 11 },
  unread: { borderRightWidth: 4, borderRightColor: C.danger },
  alert: { borderRightWidth: 4, borderRightColor: C.taxi },
  title: { fontFamily: FONT.bold, color: C.ink, textAlign: 'right' },
  body: { fontFamily: FONT.regular, color: C.ink, textAlign: 'right', marginTop: 4, fontSize: 13 },
  time: { fontFamily: FONT.regular, color: C.muted, fontSize: 11, textAlign: 'right', marginTop: 6 },
});
