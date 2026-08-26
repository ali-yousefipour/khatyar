import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, RefreshControl } from 'react-native';
import { request } from '../api';
import { C, FONT } from '../theme';
import { faNum, enNum } from '../num';
import ActivityIndicator from '../components/PulseLoadingIndicator';

export default function TempDriversScreen() {
  const [tab, setTab] = useState('add'); // add | list
  const [nid, setNid] = useState('');
  const [vehicleQ, setVehicleQ] = useState('');
  const [vehicleFound, setVehicleFound] = useState(null);
  const [selectedDrivers, setSelectedDrivers] = useState({});
  const [found, setFound] = useState(null); // {driver, main_line, temp_lines}
  const [busy, setBusy] = useState(false);
  const [specialLines, setSpecialLines] = useState([]);
  const [lineId, setLineId] = useState(null);
  const [codeInLine, setCodeInLine] = useState('');
  const [note, setNote] = useState('');
  const [list, setList] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    request('/temp-drivers/special-lines').then((r) => setSpecialLines(r || [])).catch(() => {});
  }, []);

  const loadList = () => request('/temp-drivers').then(setList).catch(() => setList([]));
  useEffect(() => { if (tab === 'list') loadList(); }, [tab]);
  const onRefresh = async () => { setRefreshing(true); await loadList(); setRefreshing(false); };

  const lookup = async () => {
    const n = enNum(nid).replace(/\D/g, '');
    if (n.length < 8) return Alert.alert('توجه', 'کد ملی معتبر وارد کنید.');
    setBusy(true); setFound(null); setVehicleFound(null); setSelectedDrivers({});
    try {
      const r = await request('/temp-drivers/search?national_id=' + encodeURIComponent(n));
      setFound({ driver: r?.driver || null, main_line: r?.main_line || null, temp_lines: Array.isArray(r?.temp_lines) ? r.temp_lines : [] });
    } catch (e) { Alert.alert('یافت نشد', e.message || 'راننده‌ای با این کد ملی پیدا نشد.'); }
    finally { setBusy(false); }
  };

  const lookupVehicle = async () => {
    const q = String(vehicleQ || '').trim();
    if (q.length < 2) return Alert.alert('توجه', 'پلاک، کد خودرو یا بخشی از مشخصات خودرو را وارد کنید.');
    setBusy(true); setFound(null); setVehicleFound(null); setSelectedDrivers({});
    try {
      const r = await request('/temp-drivers/vehicle-search?q=' + encodeURIComponent(q));
      const drivers = Array.isArray(r?.drivers) ? r.drivers : [];
      const sel = {}; drivers.forEach((d) => { if (d?.id && (d.role === 'beneficiary' || d.role === 'helper')) sel[d.id] = true; });
      setVehicleFound({ vehicle: r?.vehicle || null, main_line: r?.main_line || null, drivers });
      setSelectedDrivers(sel);
    } catch (e) { Alert.alert('یافت نشد', e.message || 'خودرو یافت نشد.'); }
    finally { setBusy(false); }
  };

  const chosenDriverIds = () => vehicleFound?.drivers
    ? Object.keys(selectedDrivers).filter((k) => selectedDrivers[k]).map((k) => Number(k))
    : (found?.driver?.id ? [Number(found.driver.id)] : []);

  const add = async () => {
    const ids = chosenDriverIds();
    if (!ids.length) return Alert.alert('توجه', 'ابتدا راننده یا خودرو را جستجو و راننده‌های موردنظر را انتخاب کنید.');
    if (!lineId) return Alert.alert('توجه', 'خط ویژه را انتخاب کنید.');
    setBusy(true);
    try {
      await request('/temp-drivers', { method: 'POST', body: {
        driver_ids: ids, national_id: found?.driver?.national_id || null, line_id: lineId,
        line_code_in_line: codeInLine || null, note: note || null,
      }});
      Alert.alert('ثبت شد', 'تخصیص موقت ثبت شد.');
      setLineId(null); setCodeInLine(''); setNote('');
      if (found) lookup();
      if (vehicleFound) lookupVehicle();
    } catch (e) { Alert.alert('خطا', e.message || 'افزودن ناموفق بود.'); }
    finally { setBusy(false); }
  };

  const removeTemp = async (id) => {
    Alert.alert('پایان تخصیص', 'این تخصیص موقت پایان یابد؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'پایان', style: 'destructive', onPress: async () => {
        try { await request('/temp-drivers/' + id, { method: 'DELETE' }); if (found) lookup(); loadList(); }
        catch (e) { Alert.alert('خطا', e.message || 'ناموفق'); }
      }},
    ]);
  };

  const lineLabel = (l) => `خط ${faNum(l.code)}${l.origin ? ` (${l.origin}${l.destination ? ' → ' + l.destination : ''})` : ''}`;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.tabs}>
        {[['add', '➕ افزودن راننده موقت'], ['list', '📋 فهرست رانندگان موقت']].map(([k, t]) => (
          <TouchableOpacity key={k} style={[s.tab, tab === k && s.tabOn]} onPress={() => setTab(k)}>
            <Text style={[s.tabTxt, tab === k && s.tabTxtOn]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'add' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 56 }}>
          <Text style={s.note}>راننده را با کد ملی در «همهٔ خطوط» جستجو کنید و او را به‌صورت موقت به یکی از خطوط ویژه اضافه کنید. خط اصلی راننده حفظ می‌شود.</Text>
          <Text style={s.label}>کد ملی راننده</Text>
          <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
            <TextInput style={[s.input, { flex: 1 }]} value={nid} onChangeText={(v) => setNid(enNum(v).replace(/\D/g, '').slice(0, 10))} keyboardType="number-pad" maxLength={10}
              placeholder="کد ملی" placeholderTextColor="#9aa" textAlign="right" />
            <TouchableOpacity style={s.lookupBtn} onPress={lookup} disabled={busy}>
              <Text style={s.lookupTxt}>{busy ? '...' : '🔍 جستجو'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.label}>جستجوی خودرو / پلاک / کد بهره‌برداری</Text>
          <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
            <TextInput style={[s.input, { flex: 1 }]} value={vehicleQ} onChangeText={setVehicleQ}
              placeholder="پلاک یا کد خودرو" placeholderTextColor="#9aa" textAlign="right" />
            <TouchableOpacity style={s.lookupBtn} onPress={lookupVehicle} disabled={busy}>
              <Text style={s.lookupTxt}>{busy ? '...' : '🚕 جستجو'}</Text>
            </TouchableOpacity>
          </View>

          {vehicleFound?.vehicle && (
            <View style={s.driverCard}>
              <Text style={s.driverName}>خودرو: {vehicleFound.vehicle.plate || '—'}</Text>
              <Text style={s.driverMeta}>مدل: {vehicleFound.vehicle.model_name || '—'} · خط فعلی: {faNum(vehicleFound.main_line?.line_code || vehicleFound.vehicle.line_text || '—')}</Text>
              <Text style={[s.label, { marginTop: 10 }]}>انتخاب رانندگان برای ثبت همزمان</Text>
              {(vehicleFound.drivers || []).length === 0 ? <Text style={s.empty}>برای این خودرو بهره‌بردار یا کمکی ثبت نشده است.</Text> :
                (vehicleFound.drivers || []).map((d) => (
                  <TouchableOpacity key={d.id} style={s.tempRow} onPress={() => setSelectedDrivers({ ...selectedDrivers, [d.id]: !selectedDrivers[d.id] })}>
                    <Text style={s.tempTxt}>{selectedDrivers[d.id] ? '☑' : '☐'} {d.first_name || ''} {d.last_name || ''} · {d.role === 'beneficiary' ? 'بهره‌بردار' : d.role === 'helper' ? 'کمکی' : 'راننده'} · {faNum(d.national_id || '')}</Text>
                  </TouchableOpacity>
                ))}
            </View>
          )}

          {found?.driver && (
            <View style={s.driverCard}>
              <Text style={s.driverName}>{found.driver.first_name || ''} {found.driver.last_name || ''}</Text>
              <Text style={s.driverMeta}>کد ملی: {faNum(found.driver.national_id)}</Text>
              {found.main_line?.line_code ? <Text style={s.driverMeta}>خط اصلی: {faNum(found.main_line.line_code)}{found.main_line.line_code_in_line ? ` — کد در خط: ${faNum(found.main_line.line_code_in_line)}` : ''}</Text> : <Text style={s.driverMeta}>خط اصلی: نامشخص</Text>}

              {(found.temp_lines || []).length > 0 && (
                <View style={{ marginTop: 10 }}>
                  <Text style={[s.label, { marginTop: 0 }]}>خطوط موقت فعلی:</Text>
                  {(found.temp_lines || []).map((t) => (
                    <View key={t.id} style={s.tempRow}>
                      <Text style={s.tempTxt}>خط {faNum(t.line_code)}{t.line_code_in_line ? ` — کد ${faNum(t.line_code_in_line)}` : ''}</Text>
                      <TouchableOpacity onPress={() => removeTemp(t.id)}><Text style={s.endTxt}>پایان</Text></TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <Text style={[s.label, { marginTop: 14 }]}>افزودن به خط ویژه</Text>
              <View style={s.chipWrap}>
                {specialLines.map((l) => (
                  <TouchableOpacity key={l.id} style={[s.chip, lineId === l.id && s.chipOn]} onPress={() => setLineId(l.id)}>
                    <Text style={[s.chipTxt, lineId === l.id && s.chipTxtOn]}>خط {faNum(l.code)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.label}>کد راننده در خط (اختیاری)</Text>
              <TextInput style={s.input} value={codeInLine} onChangeText={setCodeInLine} placeholder="مثلاً ۱۲۳" placeholderTextColor="#9aa" textAlign="right" />
              <Text style={s.label}>توضیح (اختیاری)</Text>
              <TextInput style={s.input} value={note} onChangeText={setNote} placeholder="علت/توضیح تخصیص موقت" placeholderTextColor="#9aa" textAlign="right" />
              <TouchableOpacity style={s.addBtn} onPress={add} disabled={busy}>
                <Text style={s.addTxt}>{busy ? 'در حال ثبت…' : '➕ افزودن به خط ویژه'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {tab === 'list' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 56 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {list === null ? <ActivityIndicator color={C.brand} style={{ marginTop: 20 }} /> :
            list.length === 0 ? <Text style={s.empty}>راننده موقتی در خطوط شما ثبت نشده است.</Text> :
            list.map((t) => (
              <View key={t.id} style={s.listCard}>
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.driverName}>{t.first_name} {t.last_name}</Text>
                    <Text style={s.driverMeta}>کد ملی: {faNum(t.national_id)}</Text>
                    <Text style={s.driverMeta}>خط ویژه: {faNum(t.line_code)}{t.line_code_in_line ? ` — کد در خط: ${faNum(t.line_code_in_line)}` : ''}</Text>
                    {!!t.note && <Text style={s.driverMeta}>توضیح: {t.note}</Text>}
                    {!!t.added_by_name && <Text style={s.driverMetaSm}>افزوده‌شده توسط: {t.added_by_name}</Text>}
                  </View>
                  <TouchableOpacity style={s.endBtn} onPress={() => removeTemp(t.id)}><Text style={s.endTxt}>پایان</Text></TouchableOpacity>
                </View>
              </View>
            ))}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  tabs: { flexDirection: 'row-reverse', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: C.brand },
  tabTxt: { fontFamily: FONT.regular, color: '#888', fontSize: 13 },
  tabTxtOn: { color: C.brand, fontWeight: 'bold' },
  note: { fontFamily: FONT.regular, fontSize: 12.5, color: '#667', lineHeight: 22, marginBottom: 14, textAlign: 'right' },
  label: { fontFamily: FONT.regular, fontSize: 13, color: '#445', marginTop: 12, marginBottom: 6, textAlign: 'right' },
  input: { fontFamily: FONT.regular, borderWidth: 1, borderColor: '#dde', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#fff', color: '#223' },
  lookupBtn: { backgroundColor: C.brand, borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center' },
  lookupTxt: { fontFamily: FONT.regular, color: '#fff', fontWeight: 'bold', fontSize: 13 },
  driverCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginTop: 16, borderWidth: 1, borderColor: '#eee' },
  driverName: { fontFamily: FONT.regular, fontSize: 16, fontWeight: 'bold', color: '#223', textAlign: 'right' },
  driverMeta: { fontFamily: FONT.regular, fontSize: 12.5, color: '#667', marginTop: 4, textAlign: 'right' },
  driverMetaSm: { fontFamily: FONT.regular, fontSize: 11, color: '#99a', marginTop: 4, textAlign: 'right' },
  chipWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#dde', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#fff' },
  chipOn: { backgroundColor: C.brand, borderColor: C.brand },
  chipTxt: { fontFamily: FONT.regular, fontSize: 13, color: '#556' },
  chipTxtOn: { color: '#fff', fontWeight: 'bold' },
  addBtn: { backgroundColor: '#0f766e', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 16 },
  addTxt: { fontFamily: FONT.regular, color: '#fff', fontWeight: 'bold', fontSize: 14 },
  tempRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f6f8fa', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginTop: 6 },
  tempTxt: { fontFamily: FONT.regular, fontSize: 12.5, color: '#445' },
  listCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
  endBtn: { backgroundColor: '#fde7e9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  endTxt: { fontFamily: FONT.regular, color: '#d92d3a', fontSize: 12, fontWeight: 'bold' },
  empty: { fontFamily: FONT.regular, color: '#99a', textAlign: 'center', marginTop: 30, fontSize: 13 },
});
