import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Modal, RefreshControl } from 'react-native';
import { request, postOrQueue } from '../api';
import { C, FONT } from '../theme';
import { faNum } from '../num';
import { jToday } from '../jdate';
import JDatePicker, { jLabel } from '../components/JDatePicker';
import ActivityIndicator from '../components/PulseLoadingIndicator';

const todayObj = () => { const [jy, jm, jd] = jToday(); return { jy, jm, jd }; };
const jdateToString = (d) => `${d?.jy}/${String(d?.jm).padStart(2, '0')}/${String(d?.jd).padStart(2, '0')}`;

export default function WelfareScreen({ route }) {
  const presetDriver = route?.params?.driver || null;
  const lockedToDriver = !!presetDriver?.national_id;
  const [items, setItems] = useState([]);
  const [places, setPlaces] = useState([]);
  const [nid, setNid] = useState(presetDriver?.national_id || '');
  const [driver, setDriver] = useState(presetDriver);
  const [itemId, setItemId] = useState(null);
  const [itemOpen, setItemOpen] = useState(false);
  const [placeId, setPlaceId] = useState(null);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [gdate, setGdate] = useState(todayObj());
  const [pickDate, setPickDate] = useState(false);
  const [count, setCount] = useState('1');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState(null);
  const [driverList, setDriverList] = useState(null); // تاریخچهٔ همین راننده (در حالت ورود از پروفایل راننده)
  const [refreshing, setRefreshing] = useState(false);

  const loadList = () => request('/my/welfare-grants').then(setList).catch(() => setList([]));
  const loadDriverList = (natId) => {
    if (!natId) return;
    request('/my/driver-welfare?national_id=' + natId).then(setDriverList).catch(() => setDriverList([]));
  };
  useEffect(() => {
    request('/my/welfare-items').then((t) => setItems(t || [])).catch(() => {});
    request('/my/welfare-places').then((pl) => setPlaces(pl || [])).catch(() => {});
    loadList();
    if (presetDriver?.national_id) loadDriverList(presetDriver.national_id);
  }, []);

  const onRefresh = async () => { setRefreshing(true); await loadList(); if (driver?.national_id) loadDriverList(driver.national_id); setRefreshing(false); };

  const lookup = async () => {
    const n = (driver?.national_id || nid).replace(/\D/g, '');
    if (n.length < 8) return Alert.alert('توجه', 'کد ملی معتبر وارد کنید.');
    try {
      const r = await request('/search?national_id=' + n);
      if (r.type === 'driver') { setDriver(r.driver); loadDriverList(n); }
      else Alert.alert('یافت نشد', 'راننده‌ای با این کد ملی پیدا نشد.');
    } catch (e) { setDriver(null); Alert.alert('یافت نشد', 'راننده‌ای با این کد ملی پیدا نشد.'); }
  };

  const submit = async () => {
    const n = (driver?.national_id || nid).replace(/\D/g, '');
    if (n.length < 8) return Alert.alert('توجه', 'کد ملی معتبر وارد کنید.');
    if (!itemId) return Alert.alert('توجه', 'نوع رفاهیت را انتخاب کنید.');
    setBusy(true);
    try {
      const body = {
        item_id: itemId.id, driver_national_id: n,
        place_id: placeId?.id || null,
        granted_jdate: jdateToString(gdate),
        count: parseInt(count) || 1, note,
      };
      const r = await postOrQueue('/my/welfare-grants', body);
      Alert.alert(r.queued ? 'آفلاین' : 'ثبت شد', r.queued ? 'رفاهیت ذخیره شد و بعد از اتصال با تاریخ همین لحظه ارسال می‌شود.' : `رفاهیت برای ${r.driver_name || 'راننده'} ثبت شد.`);
      setItemId(null); setPlaceId(null); setCount('1'); setNote('');
      loadList();
      loadDriverList(n); // به‌روزرسانی تاریخچهٔ همین راننده
    } catch (e) { Alert.alert('خطا', e.message || 'ثبت ناموفق بود.'); }
    finally { setBusy(false); }
  };

  return (
    <ScrollView style={{ backgroundColor: C.paper }} contentContainerStyle={{ padding: 16, paddingBottom: 56 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.brand]} />}>
      <Text style={s.h}>ثبت تحویل رفاهیت به راننده</Text>

      {!lockedToDriver && (<>
        <Text style={s.label}>کد ملی راننده</Text>
        <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
          <TextInput style={[s.input, { flex: 1 }]} dir="ltr" keyboardType="number-pad" maxLength={10} value={nid} onChangeText={setNid} placeholder="کد ملی" placeholderTextColor={C.muted} />
          <TouchableOpacity style={s.lookupBtn} onPress={lookup}><Text style={s.lookupTxt}>🔍 فراخوان</Text></TouchableOpacity>
        </View>
      </>)}
      {driver && (
        <View style={s.driverBox}>
          <Text style={s.driverName}>{driver.first_name} {driver.last_name}</Text>
          <Text style={s.driverMeta}>موبایل: {faNum(driver.mobile || '—')} · نوع: {driver.driver_type || '—'}</Text>
        </View>
      )}

      <Text style={[s.label, { marginTop: 12 }]}>نوع رفاهیت</Text>
      <TouchableOpacity style={s.select} onPress={() => setItemOpen(true)}>
        <Text style={[s.selectTxt, !itemId && { color: C.muted }]}>{itemId ? itemId.title : 'انتخاب نوع رفاهیت'}</Text>
      </TouchableOpacity>

      {places.length > 0 && (
        <>
          <Text style={[s.label, { marginTop: 12 }]}>مکان ارائه (استخر/مرکز)</Text>
          <TouchableOpacity style={s.select} onPress={() => setPlaceOpen(true)}>
            <Text style={[s.selectTxt, !placeId && { color: C.muted }]}>{placeId ? placeId.title : 'انتخاب مکان (اختیاری)'}</Text>
          </TouchableOpacity>
        </>
      )}

      <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>تاریخ تحویل</Text>
          <TouchableOpacity style={s.select} onPress={() => setPickDate(true)}>
            <Text style={s.selectTxt}>{gdate ? jLabel(gdate.jy, gdate.jm, gdate.jd) : 'انتخاب'}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>تعداد</Text>
          <TextInput style={s.input} keyboardType="number-pad" value={count} onChangeText={setCount} />
        </View>
      </View>

      <Text style={[s.label, { marginTop: 12 }]}>توضیحات (اختیاری)</Text>
      <TextInput style={[s.input, { minHeight: 60, textAlignVertical: 'top' }]} value={note} onChangeText={setNote} multiline placeholder="توضیح…" placeholderTextColor={C.muted} />

      <TouchableOpacity style={[s.submit, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
        <Text style={s.submitTxt}>{busy ? 'در حال ثبت…' : 'ثبت تحویل رفاهیت'}</Text>
      </TouchableOpacity>

      {driver && (
        <>
          <Text style={[s.h, { marginTop: 24 }]}>رفاهیات دریافتی این راننده</Text>
          {driverList === null ? <ActivityIndicator color={C.brand} style={{ marginTop: 12 }} /> :
            driverList.length === 0 ? <Text style={s.empty}>این راننده تاکنون رفاهیتی دریافت نکرده است.</Text> :
            driverList.map((w) => (
              <View key={w.id} style={s.card}>
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
                  <Text style={s.cardTitle}>{w.item_title}{w.count > 1 ? ` × ${faNum(w.count)}` : ''}</Text>
                  <Text style={s.cardDate}>{faNum(w.granted_jdate)}</Text>
                </View>
                {!!w.place_title && <Text style={s.cardMeta}>{w.place_title}</Text>}
                {!!w.note && <Text style={s.cardNote}>{w.note}</Text>}
                {!!w.granted_by_name && <Text style={s.cardNote}>ثبت‌کننده: {w.granted_by_name}</Text>}
              </View>
            ))}
        </>
      )}

      <Text style={[s.h, { marginTop: 24 }]}>رفاهیات ثبت‌شدهٔ من</Text>
      {list === null ? <ActivityIndicator color={C.brand} style={{ marginTop: 16 }} /> :
        list.length === 0 ? <Text style={s.empty}>هنوز رفاهیتی ثبت نکرده‌اید.</Text> :
        list.map((w) => (
          <View key={w.id} style={s.card}>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
              <Text style={s.cardTitle}>{w.item_title}{w.count > 1 ? ` × ${faNum(w.count)}` : ''}</Text>
              <Text style={s.cardDate}>{faNum(w.granted_jdate)}</Text>
            </View>
            <Text style={s.cardMeta}>{w.driver_name || w.driver_national_id}{w.place_title ? ` · ${w.place_title}` : ''}</Text>
            {!!w.note && <Text style={s.cardNote}>{w.note}</Text>}
          </View>
        ))}

      <JDatePicker visible={pickDate} onClose={() => setPickDate(false)} initial={gdate}
        onSelect={(d) => setGdate({ jy: d.jy, jm: d.jm, jd: d.jd })} />

      <Modal visible={itemOpen} transparent animationType="slide" onRequestClose={() => setItemOpen(false)}>
        <View style={s.modalWrap}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>انتخاب نوع رفاهیت</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {items.length === 0 ? <Text style={s.empty}>نوع رفاهیتی تعریف نشده است.</Text> :
                items.map((t) => (
                  <TouchableOpacity key={t.id} style={s.typeRow} onPress={() => { setItemId(t); setItemOpen(false); }}>
                    <Text style={s.typeTxt}>{t.title}</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
            <TouchableOpacity style={s.modalClose} onPress={() => setItemOpen(false)}><Text style={s.modalCloseTxt}>بستن</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={placeOpen} transparent animationType="slide" onRequestClose={() => setPlaceOpen(false)}>
        <View style={s.modalWrap}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>انتخاب مکان ارائه</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              <TouchableOpacity style={s.typeRow} onPress={() => { setPlaceId(null); setPlaceOpen(false); }}>
                <Text style={s.typeTxt}>بدون مکان</Text>
              </TouchableOpacity>
              {places.map((pl) => (
                <TouchableOpacity key={pl.id} style={s.typeRow} onPress={() => { setPlaceId(pl); setPlaceOpen(false); }}>
                  <Text style={s.typeTxt}>{pl.title}</Text>
                  {!!pl.address && <Text style={{ fontFamily: FONT.regular, color: C.muted, fontSize: 11.5, textAlign: 'right', marginTop: 3 }}>{pl.address}</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={s.modalClose} onPress={() => setPlaceOpen(false)}><Text style={s.modalCloseTxt}>بستن</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  h: { fontFamily: FONT.bold, fontSize: 17, color: C.ink, textAlign: 'right', marginBottom: 10 },
  label: { fontFamily: FONT.bold, color: C.slate, fontSize: 12.5, textAlign: 'right', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 12, fontFamily: FONT.regular, fontSize: 13.5, textAlign: 'right', color: C.ink },
  lookupBtn: { backgroundColor: '#eef1f6', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  lookupTxt: { fontFamily: FONT.bold, color: C.slate, fontSize: 13 },
  driverBox: { backgroundColor: '#eef7f3', borderRadius: 10, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#cfe8df' },
  driverName: { fontFamily: FONT.bold, color: C.ink, fontSize: 14, textAlign: 'right' },
  driverMeta: { fontFamily: FONT.regular, color: C.muted, fontSize: 12, textAlign: 'right', marginTop: 4 },
  select: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 12 },
  selectTxt: { fontFamily: FONT.regular, color: C.ink, fontSize: 13.5, textAlign: 'right' },
  submit: { backgroundColor: C.brand, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 16 },
  submitTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 15 },
  empty: { fontFamily: FONT.regular, color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 14, marginBottom: 10 },
  cardTitle: { fontFamily: FONT.bold, color: C.ink, fontSize: 14 },
  cardDate: { fontFamily: FONT.regular, color: C.muted, fontSize: 12 },
  cardMeta: { fontFamily: FONT.regular, color: C.slate, fontSize: 12.5, textAlign: 'right', marginTop: 5 },
  cardNote: { fontFamily: FONT.regular, color: C.muted, fontSize: 12, textAlign: 'right', marginTop: 4 },
  typeRow: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 7 },
  typeTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 13.5, textAlign: 'right' },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '75%' },
  modalTitle: { fontFamily: FONT.bold, color: C.ink, fontSize: 15, textAlign: 'right', marginBottom: 10 },
  modalClose: { backgroundColor: C.ink, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 6 },
  modalCloseTxt: { color: '#fff', fontFamily: FONT.bold },
});
