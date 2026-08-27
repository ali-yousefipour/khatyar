import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, Image, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { scanImageCandidates, buildTaxiPlate12, digitsOnly } from '../ocr';
import { uploadFile } from '../api';
import { C, FONT } from '../theme';
import { faNum } from '../num';
import ActivityIndicator from '../components/PulseLoadingIndicator';

async function makeOcrCandidates(photo, kind) {
  const uri = photo?.uri;
  const w = Number(photo?.width || 0);
  const h = Number(photo?.height || 0);
  if (!uri || !w || !h) return [uri].filter(Boolean);

  const outputs = [];
  const add = async (crop, width = 1600, quality = 0.94) => {
    try {
      const actions = [];
      if (crop) actions.push({ crop });
      actions.push({ resize: { width } });
      const r = await ImageManipulator.manipulateAsync(uri, actions, {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      if (r?.uri) outputs.push(r.uri);
    } catch (_) {}
  };

  if (kind === 'plate') {
    // چند نوار نزدیک مرکز؛ اختلاف نسبت CameraView و عکس دوربین باعث می‌شود
    // یک crop ثابت همیشه دقیقاً روی کادر زرد قرار نگیرد.
    const cropW = Math.round(w * 0.94);
    const cropH = Math.round(h * 0.26);
    const originX = Math.max(0, Math.round((w - cropW) / 2));
    for (const ratio of [0.50, 0.43, 0.57]) {
      const originY = Math.max(0, Math.min(h - cropH, Math.round(h * ratio - cropH / 2)));
      await add({ originX, originY, width: cropW, height: cropH }, 1800, 0.96);
    }
    await add(null, 1600, 0.92);
  } else {
    // کد ملی معمولاً یک سطر باریک است؛ crop بزرگ‌شده خوانایی ارقام را بالا می‌برد.
    const configs = [
      { wr: 0.92, hr: 0.22, cy: 0.50, width: 1900 },
      { wr: 0.96, hr: 0.34, cy: 0.50, width: 1700 },
      { wr: 0.90, hr: 0.22, cy: 0.42, width: 1900 },
      { wr: 0.90, hr: 0.22, cy: 0.58, width: 1900 },
    ];
    for (const c of configs) {
      const cw = Math.round(w * c.wr), ch = Math.round(h * c.hr);
      const ox = Math.max(0, Math.round((w - cw) / 2));
      const oy = Math.max(0, Math.min(h - ch, Math.round(h * c.cy - ch / 2)));
      await add({ originX: ox, originY: oy, width: cw, height: ch }, c.width, 0.96);
    }
    await add(null, 1700, 0.94);
  }
  return [...new Set(outputs.length ? outputs : [uri])];
}

export default function ScannerScreen({ navigation, route }) {
  const mode = route.params?.mode || 'auto'; // 'plate' | 'national_id' | 'auto'
  const camRef = useRef(null);
  const [perm, requestPerm] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState(mode === 'plate' ? 'پلاک را دقیق داخل کادر زرد قرار دهید' : 'کادر را روی پلاک یا کارت ملی تنظیم کنید');
  const [confirm, setConfirm] = useState(null);
  const [p2, setP2] = useState('');
  const [p3, setP3] = useState('');

  useEffect(() => { if (!perm?.granted) requestPerm(); }, [perm]);

  async function capture() {
    if (!camRef.current || busy) return;
    setBusy(true);
    setHint('در حال پردازش تصویر…');
    try {
      const photo = await camRef.current.takePictureAsync({ quality: 0.86, skipProcessing: false });
      if (mode === 'plate') {
        const candidates = await makeOcrCandidates(photo, 'plate');
        const cropUri = candidates[0] || photo.uri;
        // ابتدا چند برش روی خود گوشی خوانده می‌شود؛ OCR ابری فقط در صورت شکست
        // و در صورت فعال بودن آن در پنل، به‌عنوان fallback استفاده می‌شود.
        const r = await scanImageCandidates(candidates, 'plate', true);
        const d2 = r.digits2 || digitsOnly(r.value || '').slice(0, 2);
        const d3 = r.digits3 || digitsOnly(r.value || '').slice(2, 5);
        setP2(d2 || '');
        setP3(d3 || '');
        setConfirm({ kind: 'plate', cropUri, originalUri: photo.uri, result: r, raw: r.raw || '', confidence: r.confidence || 0 });
        setHint('نتیجه را کنترل و تأیید کنید');
        return;
      }
      const kind = mode === 'national_id' ? 'national_id' : 'auto';
      const candidates = await makeOcrCandidates(photo, kind);
      const r = await scanImageCandidates(candidates, kind, true);
      if (r.kind === 'plate') {
        const d2 = r.digits2 || digitsOnly(r.value || '').slice(0, 2);
        const d3 = r.digits3 || digitsOnly(r.value || '').slice(2, 5);
        setP2(d2 || '');
        setP3(d3 || '');
        setConfirm({ kind: 'plate', cropUri: photo.uri, originalUri: photo.uri, result: r, raw: r.raw || '', confidence: r.confidence || 0 });
      } else if (r.value) {
        navigation.navigate({ name: 'Search', params: { scanned: r.value, scannedKind: r.kind }, merge: true });
      } else {
        setHint(r?.raw ? 'عدد معتبر تشخیص داده نشد؛ کارت را صاف، نزدیک و بدون بازتاب بگیرید' : 'چیزی تشخیص داده نشد — دوباره و واضح‌تر تلاش کنید');
      }
    } catch (e) {
      setHint(e?.message || 'خطا در پردازش — دوباره تلاش کنید');
    } finally { setBusy(false); }
  }

  async function confirmPlate(saveSample = true) {
    const plate = buildTaxiPlate12(p2, p3);
    if (!plate) return Alert.alert('توجه', 'دو رقم اول و سه رقم آخر پلاک را درست وارد کنید.');
    if (saveSample && confirm?.cropUri) {
      uploadFile('/plate-scan-samples', {
        detected_plate: confirm?.result?.value || '',
        corrected_plate: plate,
        detected_digits_2: confirm?.result?.digits2 || '',
        detected_digits_3: confirm?.result?.digits3 || '',
        corrected_digits_2: digitsOnly(p2).slice(0, 2),
        corrected_digits_3: digitsOnly(p3).slice(0, 3),
        confidence: confirm?.confidence || 0,
        ocr_source: confirm?.result?.source || '',
        raw_text: confirm?.raw || '',
        client_time: Date.now(),
      }, 'crop', confirm.cropUri, 'plate-crop.jpg', 'image/jpeg').catch(() => {});
    }
    setConfirm(null);
    navigation.navigate({ name: 'Search', params: { scanned: plate, scannedKind: 'plate' }, merge: true });
  }

  if (!perm) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;
  if (!perm.granted) return (
    <View style={s.center}>
      <Text style={s.msg}>برای اسکن، دسترسی به دوربین لازم است.</Text>
      <TouchableOpacity style={s.btn} onPress={requestPerm}><Text style={s.btnTxt}>اجازهٔ دوربین</Text></TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView ref={camRef} style={{ flex: 1 }} facing="back" />
      <View style={s.overlay} pointerEvents="none"><View style={[s.frame, mode === 'plate' && s.plateFrame]} /></View>
      <View style={s.bottom}>
        <Text style={s.hint}>{hint}</Text>
        {mode === 'plate' ? <Text style={s.subHint}>ساختار ثابت: دو رقم + ت + سه رقم - ۱۲</Text> : null}
        <TouchableOpacity style={s.shutter} onPress={capture} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.shutterTxt}>اسکن</Text>}
        </TouchableOpacity>
      </View>

      <Modal visible={!!confirm} transparent animationType="slide" onRequestClose={() => setConfirm(null)}>
        <View style={s.modalShade}>
          <View style={s.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={s.modalTitle}>تأیید پلاک خوانده‌شده</Text>
              {confirm?.cropUri ? <Image source={{ uri: confirm.cropUri }} style={s.cropPreview} resizeMode="contain" /> : null}
              <Text style={s.modalNote}>حرف «ت» و منطقه «۱۲» ثابت است. فقط اعداد را اصلاح کنید.</Text>
              <View style={s.plateWrap}>
                <View style={s.plateBody}>
                  <TextInput style={s.plateInput} value={p2} onChangeText={(v) => setP2(digitsOnly(v).slice(0, 2))} keyboardType="number-pad" maxLength={2} placeholder="۲ رقم" placeholderTextColor="#a78b2a" />
                  <Text style={s.plateLetter}>ت</Text>
                  <TextInput style={[s.plateInput, { width: 78 }]} value={p3} onChangeText={(v) => setP3(digitsOnly(v).slice(0, 3))} keyboardType="number-pad" maxLength={3} placeholder="۳ رقم" placeholderTextColor="#a78b2a" />
                  <View style={s.plateRegion}><Text style={s.plateRegionNum}>۱۲</Text><View style={s.plateRegionLine} /></View>
                </View>
                <View style={s.plateFlag}><Text style={s.plateFlagIR}>I.R.</Text><Text style={s.plateFlagIran}>ایران</Text></View>
              </View>
              <Text style={s.conf}>اطمینان OCR: {faNum(Math.round((confirm?.confidence || 0) * 100))}٪</Text>
              <TouchableOpacity style={s.confirmBtn} onPress={() => confirmPlate(true)}><Text style={s.confirmTxt}>ثبت نمونه و جستجو</Text></TouchableOpacity>
              <TouchableOpacity style={s.secondaryBtn} onPress={() => confirmPlate(false)}><Text style={s.secondaryTxt}>فقط جستجو</Text></TouchableOpacity>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setConfirm(null)}><Text style={s.cancelTxt}>اسکن مجدد</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper, padding: 24 },
  msg: { fontFamily: FONT.regular, color: C.ink, textAlign: 'center', marginBottom: 16 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: { width: '80%', height: 130, borderWidth: 3, borderColor: C.taxi, borderRadius: 14 },
  plateFrame: { width: '86%', height: 118, borderColor: '#f5c518' },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 22, alignItems: 'center' },
  hint: { color: '#fff', fontFamily: FONT.bold, marginBottom: 8, textAlign: 'center' },
  subHint: { color: '#ddd', fontFamily: FONT.regular, marginBottom: 12, textAlign: 'center', fontSize: 12 },
  shutter: { backgroundColor: C.brand, width: 110, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  shutterTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 16 },
  btn: { backgroundColor: C.brand, borderRadius: 14, padding: 13, paddingHorizontal: 24 },
  btnTxt: { color: '#fff', fontFamily: FONT.bold },
  modalShade: { flex: 1, backgroundColor: 'rgba(0,0,0,0.58)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, maxHeight: '88%' },
  modalTitle: { fontFamily: FONT.bold, color: C.ink, fontSize: 17, textAlign: 'right', marginBottom: 10 },
  modalNote: { fontFamily: FONT.regular, color: C.muted, textAlign: 'right', marginVertical: 10, fontSize: 12 },
  cropPreview: { width: '100%', height: 150, borderRadius: 14, backgroundColor: '#111' },
  plateWrap: { flexDirection: 'row', alignItems: 'stretch', alignSelf: 'center', height: 76, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: '#1a1a1a', marginTop: 4 },
  plateBody: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5c518', paddingHorizontal: 10, gap: 4 },
  plateInput: { width: 58, height: 60, textAlign: 'center', fontFamily: FONT.bold, color: '#1a1a1a', fontSize: 30, padding: 0, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 8 },
  plateLetter: { fontFamily: FONT.bold, color: '#1a1a1a', fontSize: 26, marginHorizontal: 2 },
  plateRegion: { alignItems: 'center', justifyContent: 'center', marginRight: 4, borderLeftWidth: 1.5, borderLeftColor: '#1a1a1a', paddingLeft: 8, height: 50 },
  plateRegionNum: { fontFamily: FONT.bold, color: '#1a1a1a', fontSize: 22 },
  plateRegionLine: { width: 28, height: 2, backgroundColor: '#1a1a1a', marginTop: 2 },
  plateFlag: { backgroundColor: '#0a3d91', width: 42, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  plateFlagIR: { color: '#fff', fontFamily: FONT.bold, fontSize: 11 },
  plateFlagIran: { color: '#fff', fontFamily: FONT.bold, fontSize: 12, marginTop: 4 },
  conf: { fontFamily: FONT.regular, color: C.muted, textAlign: 'center', marginTop: 10, marginBottom: 8 },
  confirmBtn: { backgroundColor: C.brand, borderRadius: 14, padding: 13, alignItems: 'center', marginTop: 6 },
  confirmTxt: { color: '#fff', fontFamily: FONT.bold },
  secondaryBtn: { backgroundColor: '#eef1f6', borderRadius: 14, padding: 12, alignItems: 'center', marginTop: 8 },
  secondaryTxt: { color: C.ink, fontFamily: FONT.bold },
  cancelBtn: { padding: 12, alignItems: 'center', marginTop: 4 },
  cancelTxt: { color: C.muted, fontFamily: FONT.bold },
});
