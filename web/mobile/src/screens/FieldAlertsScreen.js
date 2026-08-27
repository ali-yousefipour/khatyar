import React, { useEffect, useState, useCallback } from 'react';
import { faNum } from '../num';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { request } from '../api';
import { C, FONT } from '../theme';
import { fj } from '../jdate';
import ActivityIndicator from '../components/PulseLoadingIndicator';

const TYPE_ICON = { station_exit: '🚦', station_enter: '✅', vpn_on: '🛡️', gps_off: '📍', attendance_checkin: '🟢', attendance_checkout: '🔴' };
const TYPE_LABEL = { station_exit: 'خروج از خط', station_enter: 'ورود به خط', vpn_on: 'روشن‌شدن VPN', gps_off: 'خاموش‌شدن GPS', attendance_checkin: 'ثبت ورود حضور من', attendance_checkout: 'ثبت خروج حضور من' };

export default function FieldAlertsScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [allRead, setAllRead] = useState(false);

  const load = useCallback(() => {
    request('/my/field-alerts').then(d => { setData(d); setAllRead(false); }).catch(() => setData({ items: [], unread: 0 }));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markRead() {
    await request('/my/field-alerts/read', { method: 'POST' }).catch(() => {});
    setAllRead(true);
    setData(prev => prev ? { ...prev, unread: 0, items: (prev.items || []).map(n => ({ ...n, is_read: true })) } : prev);
    setTimeout(() => load(), 1000);
  }

  async function open(n) {
    if (n.id && !n.is_read) {
      await request(`/my/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {});
      setData(prev => prev ? {
        ...prev,
        unread: Math.max(0, (prev.unread || 1) - 1),
        items: (prev.items || []).map(x => x.id === n.id ? { ...x, is_read: true } : x),
      } : prev);
    }
  }

  if (!data) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;

  const items = data.items || [];
  const unreadCount = allRead ? 0 : Math.min((data.unread != null ? data.unread : items.filter(n => !n.is_read).length), 99);

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      {items.length > 0 && (
        <TouchableOpacity style={[s.readAll, unreadCount === 0 && { opacity: 0.5 }]} onPress={markRead} disabled={unreadCount === 0}>
          <Text style={s.readAllTxt}>
            {unreadCount > 0
              ? `علامت‌گذاری همه به‌عنوان خوانده‌شده (${unreadCount > 99 ? '+۹۹' : faNum(unreadCount)})`
              : '✓ همهٔ هشدارها خوانده شده‌اند'}
          </Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={items}
        keyExtractor={(i, idx) => String(i.id || 'a' + idx)}
        contentContainerStyle={{ padding: 16, paddingBottom: 56 }}
        ListEmptyComponent={<Text style={s.empty}>هشدار میدانی‌ای وجود ندارد</Text>}
        renderItem={({ item }) => {
          const isRead = allRead || !!item.is_read;
          const t = item.data?.type;
          return (
            <TouchableOpacity style={[s.card, !isRead && s.unread]} onPress={() => open(item)}>
              <View style={s.cardHead}>
                <Text style={s.title}>{TYPE_ICON[t] || '⚠️'} {item.title}</Text>
                <View style={[s.badge, isRead ? s.badgeRead : s.badgeUnread]}>
                  <Text style={[s.badgeTxt, isRead ? s.badgeTxtRead : s.badgeTxtUnread]}>{isRead ? 'خوانده‌شده' : 'خوانده‌نشده'}</Text>
                </View>
              </View>
              {t && TYPE_LABEL[t] ? <Text style={s.typeLabel}>{TYPE_LABEL[t]}</Text> : null}
              <Text style={s.body}>{item.body}</Text>
              {item.created_at ? <Text style={s.time}>{fj(item.created_at)}</Text> : null}
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
  badgeUnread: { backgroundColor: '#fdecea' },
  badgeRead: { backgroundColor: '#eef1f6' },
  badgeTxt: { fontFamily: FONT.bold, fontSize: 11 },
  badgeTxtUnread: { color: '#c0392b' },
  badgeTxtRead: { color: '#8a93a6' },
  typeLabel: { fontFamily: FONT.bold, color: C.taxiInk, backgroundColor: C.taxi, alignSelf: 'flex-start', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8, fontSize: 11, marginBottom: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper },
  empty: { color: C.muted, fontFamily: FONT.regular, textAlign: 'center', marginTop: 40 },
  readAll: { backgroundColor: C.taxi, padding: 10, alignItems: 'center' },
  readAllTxt: { color: C.taxiInk, fontFamily: FONT.bold, fontSize: 12 },
  card: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 13, padding: 13, marginBottom: 10 },
  unread: { borderRightWidth: 4, borderRightColor: C.danger },
  title: { fontFamily: FONT.bold, color: C.ink, textAlign: 'right' },
  body: { fontFamily: FONT.regular, color: C.ink, textAlign: 'right', marginTop: 4, fontSize: 13 },
  time: { fontFamily: FONT.regular, color: C.muted, fontSize: 11, textAlign: 'right', marginTop: 6 },
});
