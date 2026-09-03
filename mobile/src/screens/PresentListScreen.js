import React, { useState, useCallback } from 'react';
import { faNum } from '../num';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { request } from '../api';
import { C, FONT } from '../theme';
import ActivityIndicator from '../components/PulseLoadingIndicator';

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

  const load = useCallback(async () => {
    try {
      const result = await request('/attendance/present');
      setData(normalizePresent(result));
    } catch (e) {
      setData([]);
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

  if (!data) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <View style={s.head}>
        <Text style={s.headTxt}>تاکسیرانان حاضر در خط: {faNum(data.length)}</Text>
        <Text style={s.headSub}>برای ثبت خروج، روی نام راننده بزنید.</Text>
      </View>
      <FlatList
        data={data}
        keyExtractor={(it, index) => String(it.id ?? it.driver_id ?? index)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} colors={[C.brand]} />}
        ListEmptyComponent={<Text style={s.empty}>هیچ راننده‌ای در خط حاضر نیست.</Text>}
        contentContainerStyle={{ padding: 14 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => confirmExit(item)} disabled={busy === item.driver_id}>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.first_name} {item.last_name}</Text>
              <Text style={s.meta}>
                {item.line_code ? `خط ${item.line_code}` : 'بدون خط'}
                {item.line_origin ? ` — ${item.line_origin}` : ''}
                {`  ·  ${faNum((item.mins_in || 0))} دقیقه در خط`}
              </Text>
            </View>
            {busy === item.driver_id
              ? <ActivityIndicator color={C.taxi} />
              : <View style={s.exitBtn}><Text style={s.exitTxt}>ثبت خروج</Text></View>}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper },
  head: { padding: 16, backgroundColor: '#fff', borderBottomColor: C.line, borderBottomWidth: 1 },
  headTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 16, textAlign: 'right' },
  headSub: { fontFamily: FONT.regular, color: C.muted, fontSize: 12, textAlign: 'right', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 13, borderColor: C.line, borderWidth: 1, padding: 14, marginBottom: 10, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  name: { fontFamily: FONT.bold, color: C.ink, fontSize: 15, textAlign: 'right' },
  meta: { fontFamily: FONT.regular, color: C.muted, fontSize: 12, textAlign: 'right', marginTop: 4 },
  exitBtn: { backgroundColor: '#fdecec', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  exitTxt: { fontFamily: FONT.bold, color: '#e3403e', fontSize: 13 },
  empty: { fontFamily: FONT.regular, color: C.muted, textAlign: 'center', marginTop: 40 },
});
