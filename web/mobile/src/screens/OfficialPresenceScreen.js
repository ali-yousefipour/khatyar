import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, Modal, FlatList } from 'react-native';
import * as Location from 'expo-location';
import { getFastPosition } from '../location';
import { ImagePicker, launchCamera, launchLibrary } from '../cameraLock';
import { compressToDataUri } from '../img';
import { request, postOrQueue } from '../api';
import { useAuth } from '../auth';
import { C, FONT } from '../theme';
import { fj } from '../jdate';
import ModalKeyboardView from '../components/ModalKeyboardView';
import { playSound } from '../soundFx';
import ActivityIndicator from '../components/PulseLoadingIndicator';

export default function OfficialPresenceScreen() {
  const { user } = useAuth();
  const [officials, setOfficials] = useState([]);
  const [lines, setLines] = useState([]);
  const [picked, setPicked] = useState(null);
  const [roleSel, setRoleSel] = useState('');
  const [nameQ, setNameQ] = useState('');
  const [lineId, setLineId] = useState(null);
  const [lineQ, setLineQ] = useState('');
  const [lineOpen, setLineOpen] = useState(false);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState(null);
  const [dropOpen, setDropOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reqPhoto, setReqPhoto] = useState(false);

  const load = () => {
    Promise.all([
      request('/officials').catch(() => []),
      request('/my/lines').catch(() => []),
      request('/my/official-visits').catch(() => []),
      request('/officials/config').catch(() => ({ require_photo: false })),
    ]).then(([o, l, h, cfg]) => {
      setOfficials(o); setLines(l); setHistory(h); setReqPhoto(!!cfg.require_photo); setLoading(false);
    });
  };
  useEffect(load, []);

  const roles = [...new Set(officials.map((o) => o.role_title).filter(Boolean))];

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('توجه', 'دسترسی دوربین لازم است'); return; }
    const r = await launchCamera({ quality: 1 });
    if (r.canceled) return;
    const c = await compressToDataUri(r.assets[0].uri);
    setPhoto(c);
  };

  async function submit() {
    if (!picked) return Alert.alert('توجه', 'یک مسئول را انتخاب کنید.');
    if (!lineId) return Alert.alert('توجه', 'انتخاب خط الزامی است.');
    if (!note.trim()) return Alert.alert('توجه', 'درج توضیحات الزامی است.');
    if (reqPhoto && !photo) return Alert.alert('عکس الزامی است', 'پیوست عکس حضور مسئول الزامی است.');
    setBusy(true);
    try {
      let lat, lng;
      try { const p = await getFastPosition({ maxAgeMs: 15000, timeoutMs: 8000 }); if (p) { lat = p.coords.latitude; lng = p.coords.longitude; } } catch {}
      const r = await postOrQueue('/official-visits', { official_id: picked.id, line_id: lineId, note, lat, lng, photo_data: photo });
      if (!r.queued) playSound('officialPresenceRegistered').catch(() => {});
      Alert.alert(r.queued ? 'آفلاین' : 'ثبت شد',
        r.queued ? 'حضور مسئول ذخیره شد و بعداً ارسال می‌شود.' : 'حضور مسئول در خط ثبت شد.');
      setPicked(null); setNote(''); setLineId(null); setPhoto(null); setNameQ(''); setRoleSel(''); load();
    } catch (e) { Alert.alert('خطا', e.message || 'ثبت ناموفق'); }
    finally { setBusy(false); }
  }

  if (loading) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;

  const filtered = officials.filter((o) =>
    (!roleSel || o.role_title === roleSel) &&
    (!nameQ || ((o.first_name || '') + ' ' + (o.last_name || '')).indexOf(nameQ) >= 0));

  return (
    <>
    <ScrollView style={{ backgroundColor: C.paper }} contentContainerStyle={{ padding: 16, paddingBottom: 56 }}>
      <Text style={s.label}>۱) سمت مسئول را انتخاب کنید</Text>
      <View style={s.chips}>
        {roles.map((r) => (
          <TouchableOpacity key={r} onPress={() => { setRoleSel(roleSel === r ? '' : r); setPicked(null); }}
            style={[s.chip, roleSel === r && { backgroundColor: C.ink, borderColor: C.ink }]}>
            <Text style={[s.chipTxt, roleSel === r && { color: '#fff' }]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>۲) مسئول مورد نظر را انتخاب کنید</Text>
      <TouchableOpacity style={s.select} onPress={() => { if (!roleSel) { Alert.alert('توجه', 'ابتدا سمت مسئول را انتخاب کنید.'); return; } setDropOpen(true); }}>
        <Text style={[s.selectTxt, !picked && { color: C.muted }]}>{picked ? `${picked.first_name} ${picked.last_name}` : (roleSel ? 'برای انتخاب/جستجو ضربه بزنید' : 'ابتدا سمت را انتخاب کنید')}</Text>
        <Text style={{ color: C.muted }}>▾</Text>
      </TouchableOpacity>

      <Modal visible={dropOpen} animationType="slide" transparent onRequestClose={() => setDropOpen(false)}>
        <ModalKeyboardView style={s.modalWrap}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>انتخاب مسئول ({roleSel || 'همه'})</Text>
            <TextInput style={s.input} value={nameQ} onChangeText={setNameQ} placeholder="جستجوی نام/نام خانوادگی" placeholderTextColor={C.muted} autoFocus />
            <FlatList data={filtered} keyExtractor={(it) => String(it.id)} style={{ maxHeight: 320, marginTop: 8 }}
              ListEmptyComponent={<Text style={s.empty}>موردی یافت نشد.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.optRow} onPress={() => { setPicked(item); setDropOpen(false); }}>
                  <Text style={s.optName}>{item.first_name} {item.last_name}</Text>
                  <Text style={s.optRole}>{item.role_title}</Text>
                </TouchableOpacity>
              )} />
            <TouchableOpacity style={s.modalClose} onPress={() => setDropOpen(false)}><Text style={s.modalCloseTxt}>بستن</Text></TouchableOpacity>
          </View>
        </ModalKeyboardView>
      </Modal>

      <Text style={s.label}>۳) خط (الزامی)</Text>
      {lines.length === 0 ? <Text style={s.empty}>خطی به شما اختصاص نیافته است.</Text> : (
        <TouchableOpacity style={s.select} onPress={() => setLineOpen(true)}>
          <Text style={[s.selectTxt, !lineId && { color: C.muted }]}>{(() => { const pl = lines.find((l) => l.id === lineId); return pl ? `خط ${pl.code}${pl.origin ? ` (${pl.origin} - ${pl.destination || ''})` : ''}` : 'انتخاب/جستجوی خط'; })()}</Text>
          <Text style={{ color: C.muted }}>▾</Text>
        </TouchableOpacity>
      )}

      <Modal visible={lineOpen} animationType="slide" transparent onRequestClose={() => setLineOpen(false)}>
        <ModalKeyboardView style={s.modalWrap}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>انتخاب خط</Text>
            <TextInput style={s.input} value={lineQ} onChangeText={setLineQ} placeholder="جستجو بر اساس شماره یا نام خط" placeholderTextColor={C.muted} autoFocus />
            <FlatList data={lines.filter((l) => !lineQ || String(l.code).indexOf(lineQ) >= 0 || ((l.origin || '') + (l.destination || '')).indexOf(lineQ) >= 0)} keyExtractor={(it) => String(it.id)} style={{ maxHeight: 320, marginTop: 8 }}
              ListEmptyComponent={<Text style={s.empty}>خطی یافت نشد.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.optRow} onPress={() => { setLineId(item.id); setLineOpen(false); }}>
                  <Text style={s.optName}>خط {item.code}</Text>
                  {!!item.origin && <Text style={s.optRole}>{item.origin} - {item.destination || ''}</Text>}
                </TouchableOpacity>
              )} />
            <TouchableOpacity style={s.modalClose} onPress={() => setLineOpen(false)}><Text style={s.modalCloseTxt}>بستن</Text></TouchableOpacity>
          </View>
        </ModalKeyboardView>
      </Modal>

      <Text style={s.label}>۴) عکس حضور مسئول در خط {reqPhoto ? '(الزامی)' : '(اختیاری)'}</Text>
      <TouchableOpacity style={s.photoBtn} onPress={takePhoto}>
        <Text style={s.photoBtnTxt}>{photo ? '✓ عکس گرفته شد (تعویض)' : '📷 گرفتن عکس'}</Text>
      </TouchableOpacity>
      {photo ? <Image source={{ uri: photo }} style={{ width: '100%', height: 170, borderRadius: 12, marginTop: 8 }} resizeMode="cover" /> : null}

      <Text style={s.label}>توضیحات (الزامی)</Text>
      <TextInput style={s.input} value={note} onChangeText={setNote} placeholder="مثلاً بازدید میدانی از خط ۵۰۰" placeholderTextColor={C.muted} />

      <TouchableOpacity style={[s.btn, busy && { opacity: 0.6 }]} disabled={busy} onPress={submit}><Text style={s.btnTxt}>{busy ? 'در حال ثبت…' : 'ثبت حضور مسئول'}</Text></TouchableOpacity>

      <Text style={[s.label, { marginTop: 22 }]}>آخرین ثبت‌های شما</Text>
      {history.map((h) => (
        <View key={h.id} style={s.histCard}>
          <Text style={s.histTitle}>{h.official}{h.line ? ` — خط ${h.line}` : ''}</Text>
          {!!h.note && <Text style={s.histNote}>{h.note}</Text>}
          <Text style={s.histTime}>{fj(h.created_at)}</Text>
        </View>
      ))}
    </ScrollView>
    <Modal visible={busy} transparent animationType="fade">
      <View style={s.overlay}>
        <View style={s.overlayBox}>
          <ActivityIndicator size="large" color={C.brand} />
          <Text style={s.overlayTxt}>در حال ثبت حضور…</Text>
          <Text style={s.overlaySub}>دریافت موقعیت و ارسال اطلاعات. لطفاً صبر کنید.</Text>
        </View>
      </View>
    </Modal>
    </>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper },
  label: { fontFamily: FONT.bold, color: C.ink, fontSize: 13.5, marginBottom: 8, marginTop: 12, textAlign: 'right' },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { borderColor: C.line, borderWidth: 1, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
  chipTxt: { fontFamily: FONT.bold, fontSize: 12.5, color: C.ink, textAlign: 'right' },
  chipRole: { fontFamily: FONT.regular, fontSize: 10.5, color: C.muted, textAlign: 'right' },
  lchip: { borderColor: C.line, borderWidth: 1, backgroundColor: '#fff', borderRadius: 99, paddingVertical: 7, paddingHorizontal: 14 },
  input: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 13, padding: 12, textAlign: 'right', fontFamily: FONT.regular, color: C.ink },
  select: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 13, padding: 13, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  selectTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 13.5, textAlign: 'right', flex: 1 },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '80%' },
  modalTitle: { fontFamily: FONT.bold, color: C.ink, fontSize: 15, textAlign: 'right', marginBottom: 10 },
  optRow: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  optName: { fontFamily: FONT.bold, color: C.ink, fontSize: 14, textAlign: 'right' },
  optRole: { fontFamily: FONT.regular, color: C.muted, fontSize: 11.5, textAlign: 'right', marginTop: 2 },
  modalClose: { backgroundColor: C.ink, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 6 },
  modalCloseTxt: { color: '#fff', fontFamily: FONT.bold },
  photoBtn: { borderWidth: 1, borderColor: C.brand, borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: '#e7f3ee' },
  photoBtnTxt: { color: C.brand, fontFamily: FONT.bold, fontSize: 14 },
  btn: { backgroundColor: C.brand, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 16 },
  btnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  overlayBox: { backgroundColor: '#fff', borderRadius: 16, padding: 26, alignItems: 'center', width: 260 },
  overlayTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 15, marginTop: 14 },
  overlaySub: { fontFamily: FONT.regular, color: C.muted, fontSize: 12, marginTop: 6, textAlign: 'center' },
  empty: { color: C.muted, fontFamily: FONT.regular, textAlign: 'center', paddingVertical: 12 },
  histCard: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 9 },
  histTitle: { fontFamily: FONT.bold, color: C.ink, textAlign: 'right' },
  histNote: { fontFamily: FONT.regular, color: C.ink, fontSize: 12.5, textAlign: 'right', marginTop: 2 },
  histTime: { fontFamily: FONT.regular, color: C.muted, fontSize: 11, textAlign: 'right', marginTop: 4 },
});
