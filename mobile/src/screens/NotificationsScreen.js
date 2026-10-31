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
  const [refreshing, setRefreshing] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const d = await request('/my/notifications', { queueIfOffline: false });
      setData(d);
      setAllRead(false);
      setError('');
    } catch (e) {
      setError(e?.message || 'دریافت اعلان‌ها ناموفق بود. اتصال اینترنت را بررسی کنید.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markRead() {
    setActionBusy(true);
    try {
      await request('/my/notifications/read', { method: 'POST', queueIfOffline: false });
      setAllRead(true);
      setData(prev => prev ? {
        ...prev,
        unread: 0,
        items: (prev.items || []).map(n => ({ ...n, is_read: true })),
      } : prev);
      setError('');
    } catch (e) {
      setError(e?.message || 'ثبت خوانده‌شدن اعلان‌ها ناموفق بود. دوباره تلاش کنید.');
    } finally {
      setActionBusy(false);
    }
  }

  async function remove(n) {
    setActionBusy(true);
    try {
      await request(`/my/notifications/${n.id}`, { method: 'DELETE', queueIfOffline: false });
      setData(prev => prev ? { ...prev, items: (prev.items || []).filter(x => x.id !== n.id), unread: Math.max(0, (prev.unread || 0) - (n.is_read ? 0 : 1)) } : prev);
      setError('');
    } catch (e) {
      setError(e?.message || 'حذف اعلان ناموفق بود.');
    } finally {
      setActionBusy(false);
    }
  }

  async function open(n) {
    setOpening(true);
    try {
      if (n.id && !n.is_read) {
        await request(`/my/notifications/${String(n.id)}/read`, { method: 'POST', queueIfOffline: false });
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
      setError('');
    } catch (e) { setError(e?.message || 'باز کردن اعلان ناموفق بود.'); }
    finally { setOpening(false); }
  }

  if (!data && refreshing) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;

  const items = data?.items || [];
  const unreadCount = allRead ? 0 : Math.min((data?.unread != null ? data.unread : items.filter(n => !n.is_read).length), 99);

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      {opening && (
        <View style={s.overlay}>
          <ActivityIndicator color={C.brand} size="large" />
          <Text style={s.overlayTxt}>در حال باز کردن…</Text>
        </View>
      )}
      {!!error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text><TouchableOpacity onPress={load} style={s.retry}><Text style={s.retryText}>تلاش مجدد</Text></TouchableOpacity></View>}
      {items.length > 0 && (
        <TouchableOpacity style={[s.readAll, (unreadCount === 0 || actionBusy) && { opacity: 0.5 }]} onPress={markRead} disabled={unreadCount === 0 || actionBusy} accessibilityRole="button">
          <Text style={s.readAllTxt}>
            {unreadCount > 0
              ? `علامت‌گذاری همه به‌عنوان خوانده‌شده (${unreadCount > 99 ? '+۹۹' : faNum(unreadCount)})`
              : '✓ همهٔ اعلان‌ها خوانده شده‌اند'}
          </Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={items}
        refreshing={refreshing}
        onRefresh={load}
        keyExtractor={(i, idx) => String(i.id || 'a' + idx)}
        contentContainerStyle={{ padding: 16, paddingBottom: 56 }}
        ListEmptyComponent={<Text style={s.empty}>{error ? 'اعلان‌ها در دسترس نیستند؛ دوباره تلاش کنید.' : 'اعلانی وجود ندارد'}</Text>}
        renderItem={({ item }) => {
          const isRead = allRead || !!item.is_read;
          return (
            <TouchableOpacity style={[s.card, !isRead && s.unread, item.type === 'alert' && s.alert]} onPress={() => open(item)} disabled={opening || actionBusy} accessibilityRole="button">
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
              {item.id && !String(item.id).startsWith('expiry:') ? <TouchableOpacity style={s.delBtn} disabled={opening || actionBusy} onPress={(e) => { e.stopPropagation && e.stopPropagation(); remove(item); }} accessibilityRole="button"><Text style={s.delTxt}>حذف اعلان</Text></TouchableOpacity> : null}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  errorBox: { margin: 12, padding: 14, borderRadius: 14, backgroundColor: '#fff1f1', borderColor: '#f3b8c0', borderWidth: 1 },
  errorText: { fontFamily: FONT.regular, color: '#982b3d', lineHeight: 22, textAlign: 'right' },
  retry: { alignSelf: 'flex-end', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  retryText: { fontFamily: FONT.bold, color: C.brand, fontSize: 12 },
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
  card: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 17, padding: 16, marginBottom: 10 },
  delBtn: { alignSelf: 'flex-start', marginTop: 8, backgroundColor: '#ffecec', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  delTxt: { fontFamily: FONT.bold, color: C.danger, fontSize: 11 },
  unread: { borderRightWidth: 4, borderRightColor: C.danger },
  alert: { borderRightWidth: 4, borderRightColor: C.taxi },
  title: { fontFamily: FONT.bold, color: C.ink, textAlign: 'right' },
  body: { fontFamily: FONT.regular, color: C.ink, textAlign: 'right', marginTop: 4, fontSize: 13 },
  time: { fontFamily: FONT.regular, color: C.muted, fontSize: 11, textAlign: 'right', marginTop: 6 },
});
