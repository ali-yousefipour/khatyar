import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ScrollView, PanResponder, Modal } from 'react-native';
import * as Application from 'expo-application';
import { request, imageSource } from '../api';
import { useAuth } from '../auth';
import { faNum } from '../num';
import ImageViewer from '../components/ImageViewer';
import PersonalPhotoCapture from '../PersonalPhotoCapture';
import JDatePicker from '../components/JDatePicker';
import { C as CC, FONT } from '../theme';
import { captureRef } from 'react-native-view-shot';

function parseJDate(value) {
  if (!value) return null;
  const parts = String(value).replace(/[\\/.]/g, '-').split('-').map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((x) => !Number.isFinite(x))) return null;
  return { jy: parts[0], jm: parts[1], jd: parts[2] };
}
function cleanJDateLabel(value) {
  if (!value) return '';
  return faNum(String(value).replace(/[\\.]/g, '/').replace(/-/g, '/'));
}

export function ChangePasswordScreen({ navigation }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!current && !next) { navigation.goBack(); return; }
    if (next.length < 6) return Alert.alert('توجه', 'رمز جدید حداقل ۶ کاراکتر باشد.');
    setBusy(true);
    try { await request('/admin/change-password', { method: 'POST', body: { current, next } }); Alert.alert('انجام شد', 'رمز عبور تغییر کرد.'); navigation.goBack(); }
    catch (e) { Alert.alert('خطا', e.message); } finally { setBusy(false); }
  }
  return (
    <View style={s.wrap}>
      <Text style={s.label}>رمز فعلی</Text><TextInput style={s.input} value={current} onChangeText={setCurrent} secureTextEntry />
      <Text style={s.label}>رمز جدید</Text><TextInput style={s.input} value={next} onChangeText={setNext} secureTextEntry />
      <TouchableOpacity style={s.btn} onPress={submit} disabled={busy}><Text style={s.btnTxt}>تغییر رمز</Text></TouchableOpacity>
    </View>
  );
}

function SignaturePad({ value, onChange }) {
  const [signatureFullscreen, setSignatureFullscreen] = useState(false);
  const [points, setPoints] = useState([]);
  const normalPadRef = useRef(null);
  const fullscreenPadRef = useRef(null);
  const lastPoint = useRef(null);
  const drawingRef = useRef(false);

  const createPanResponder = (fullscreen) => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (event) => {
      const { locationX, locationY } = event.nativeEvent;
      const point = { x: Math.max(0, locationX), y: Math.max(0, locationY) };
      drawingRef.current = true;
      lastPoint.current = point;
      setPoints((current) => [...current, point]);
    },
    onPanResponderMove: (event) => {
      if (!drawingRef.current) return;
      const { locationX, locationY } = event.nativeEvent;
      const next = { x: Math.max(0, locationX), y: Math.max(0, locationY) };
      const prev = lastPoint.current;
      if (!prev) { lastPoint.current = next; return; }
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 1.5) return;
      const steps = Math.max(1, Math.ceil(distance / (fullscreen ? 2.5 : 2.5)));
      const segment = [];
      for (let i = 1; i <= steps; i += 1) {
        const t = i / steps;
        segment.push({ x: prev.x + dx * t, y: prev.y + dy * t });
      }
      lastPoint.current = next;
      setPoints((current) => [...current, ...segment]);
    },
    onPanResponderRelease: () => {
      drawingRef.current = false;
      lastPoint.current = null;
    },
    onPanResponderTerminate: () => {
      drawingRef.current = false;
      lastPoint.current = null;
    },
  });

  const normalPan = useRef(createPanResponder(false)).current;
  const fullscreenPan = useRef(createPanResponder(true)).current;

  const clearSignature = () => {
    drawingRef.current = false;
    lastPoint.current = null;
    setPoints([]);
    onChange(null);
  };

  const openFullscreen = () => {
    lastPoint.current = null;
    drawingRef.current = false;
    setSignatureFullscreen(true);
  };

  const saveSignature = async () => {
    if (!points.length) {
      Alert.alert('امضا', 'ابتدا امضای خود را رسم کنید.');
      return;
    }
    const target = signatureFullscreen ? fullscreenPadRef.current : normalPadRef.current;
    if (!target) {
      Alert.alert('خطا', 'محل ثبت امضا آماده نیست. دوباره تلاش کنید.');
      return;
    }
    try {
      const uri = await captureRef(target, { format: 'png', quality: 1, result: 'data-uri' });
      onChange(uri);
      setSignatureFullscreen(false);
      Alert.alert('امضا', 'امضا آماده ذخیره است.');
    } catch (e) {
      Alert.alert('خطا', 'ذخیره تصویر امضا انجام نشد. دوباره تلاش کنید.');
    }
  };

  const renderPoints = (keyPrefix) => points.map((point, index) => (
    <View key={`${keyPrefix}-${index}`} pointerEvents="none" style={[s.signatureDot, { left: point.x - 2, top: point.y - 2 }]} />
  ));

  return (
    <View style={s.signatureBox}>
      <Text style={s.zoneTitle}>امضای پرسنلی</Text>
      <Text style={s.zoneHint}>امضای خود را با انگشت داخل کادر رسم کنید. این امضا در چاپ گزارش‌ها درج می‌شود.</Text>
      {value && !points.length ? <Image source={{ uri: value }} style={s.signaturePreview} resizeMode="contain" /> : null}

      <TouchableOpacity activeOpacity={0.8} style={s.signatureFullscreenBtn} onPress={openFullscreen}>
        <Text style={s.signatureFullscreenTxt}>✎ ثبت امضا در حالت تمام‌صفحه</Text>
      </TouchableOpacity>

      <View ref={normalPadRef} collapsable={false} style={s.signaturePad} {...normalPan.panHandlers}>
        {renderPoints('normal')}
      </View>

      <Modal
        visible={signatureFullscreen}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => setSignatureFullscreen(false)}
      >
        <View style={s.signatureModal}>
          <View style={s.signatureModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.signatureModalTitle}>ثبت امضا</Text>
              <Text style={s.signatureModalHint}>امضای خود را با انگشت روی صفحه رسم کنید.</Text>
            </View>
            <TouchableOpacity activeOpacity={0.8} style={s.signatureModalClose} onPress={() => setSignatureFullscreen(false)}>
              <Text style={s.signatureModalCloseTxt}>×</Text>
            </TouchableOpacity>
          </View>

          <View ref={fullscreenPadRef} collapsable={false} style={s.signaturePadFull} {...fullscreenPan.panHandlers}>
            {renderPoints('fullscreen')}
          </View>

          <View style={s.signatureModalActions}>
            <TouchableOpacity activeOpacity={0.82} style={[s.btn, s.signatureModalAction, s.signatureClearBtn]} onPress={clearSignature}>
              <Text style={s.btnTxt}>پاک کردن</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.82} style={[s.btn, s.signatureModalAction]} onPress={saveSignature}>
              <Text style={s.btnTxt}>ثبت امضا</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity activeOpacity={0.82} style={s.signatureBackBtn} onPress={() => setSignatureFullscreen(false)}>
            <Text style={s.signatureBackTxt}>بازگشت بدون ثبت</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <View style={s.signatureActions}>
        <TouchableOpacity activeOpacity={0.82} style={[s.btn, s.signatureAction]} onPress={saveSignature}>
          <Text style={s.btnTxt}>ثبت امضا</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.82} style={[s.btn, s.signatureAction, s.signatureClearBtn]} onPress={clearSignature}>
          <Text style={s.btnTxt}>پاک کردن</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function EditProfileScreen({ navigation }) {
  const [p, setP] = useState(null);
  const [busy, setBusy] = useState(false);
  const [zoneOpts, setZoneOpts] = useState(null);
  const [zoneId, setZoneId] = useState(null);
  const [zoneChief, setZoneChief] = useState(null);
  const [zoneInspectors, setZoneInspectors] = useState([]);
  const [isAdminStaff, setIsAdminStaff] = useState(false);
  const [loadingZ, setLoadingZ] = useState(false);
  const [inspectors, setInspectors] = useState([]);
  const [birthPickerOpen, setBirthPickerOpen] = useState(false);
  useEffect(() => {
    request('/me/full-profile').then(setP).catch(() => setP({}));
    request('/me/zone-options').then((z) => {
      setZoneOpts(z);
      if (z.current) { setZoneId(z.current.zone_id || null); setInspectors(z.current.inspector_ids || []); }
    }).catch(() => setZoneOpts({ enabled: false }));
  }, []);
  useEffect(() => {
    if (!zoneId) { setZoneChief(null); setZoneInspectors([]); return; }
    setLoadingZ(true);
    request('/me/zone-inspectors?zone_id=' + zoneId).then((r) => {
      setZoneChief(r.chief || null); setZoneInspectors(r.inspectors || []); setIsAdminStaff(!!r.is_admin_staff);
    }).catch(() => { setZoneChief(null); setZoneInspectors([]); }).finally(() => setLoadingZ(false));
  }, [zoneId]);
  if (!p) return <View style={s.center}><Text style={s.muted}>در حال بارگذاری…</Text></View>;
  const set = (k, v) => setP({ ...p, [k]: v });
  const toggleInspector = (id) => setInspectors((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  const notFoundMsg = () => Alert.alert('بازرس پیدا نشد', 'اگر بازرس شما در فهرست نیست، لطفاً با بازرس خود تماس بگیرید و با ایشان هماهنگ کنید که ابتدا منطقه و مسئول بالادستی خود را در برنامه انتخاب کند تا نامش به فهرست بازرسین این منطقه اضافه شود. سپس این صفحه را دوباره بررسی کنید.');
  async function save() {
    setBusy(true);
    try {
      await request('/me/profile', { method: 'PUT', body: {
        email: p.email, mobile: p.mobile, address: p.address,
        national_code: String(p.national_code || '').replace(/[^0-9]/g, '') || null,
        marital_status: p.marital_status, children_count: p.children_count,
        birth_date: p.birth_date || null, signature_data: p.signature_data || null,
      } });
      if (zoneOpts?.enabled) {
        await request('/me/zone-select', { method: 'POST', body: { zone_id: zoneId, inspector_ids: inspectors, chief_inspector_id: zoneChief?.id || null } }).catch(() => {});
      }
      Alert.alert('ذخیره شد', 'اطلاعات شما به‌روزرسانی شد.'); navigation.goBack();
    } catch (e) { Alert.alert('خطا', e.message); } finally { setBusy(false); }
  }
  return (
    <ScrollView persistentScrollbar={true} style={{ backgroundColor: CC.paper }} contentContainerStyle={{ padding: 16, paddingBottom: 56 }}>
      <Text style={s.label}>نام</Text>
      <TextInput style={[s.input, s.ro]} value={`${p.first_name || ''} ${p.last_name || ''}`} editable={false} />
      <Text style={s.label}>ایمیل</Text>
      <TextInput style={s.input} value={p.email || ''} onChangeText={(v) => set('email', v)} keyboardType="email-address" autoCapitalize="none" />
      <Text style={s.label}>موبایل</Text>
      <TextInput style={s.input} value={p.mobile || ''} onChangeText={(v) => set('mobile', v)} keyboardType="phone-pad" />
      <Text style={s.label}>کد ملی</Text>
      <TextInput style={[s.input, s.nationalInput]} value={p.national_code || ''} onChangeText={(v) => set('national_code', v.replace(/[^0-9]/g, '').slice(0, 10))} keyboardType="number-pad" maxLength={10} placeholder="کد ملی ۱۰ رقمی" placeholderTextColor={CC.muted} />
      <Text style={s.label}>تاریخ تولد</Text>
      <TouchableOpacity style={[s.input, s.dateInput]} onPress={() => setBirthPickerOpen(true)}>
        <Text style={p.birth_date ? s.dateTxt : s.datePlaceholder}>{p.birth_date ? cleanJDateLabel(p.birth_date) : 'انتخاب تاریخ تولد'}</Text>
      </TouchableOpacity>
      <JDatePicker visible={birthPickerOpen} initial={parseJDate(p.birth_date) || null} minYear={1300} maxYear={1410} onClose={() => setBirthPickerOpen(false)} onSelect={(d) => set('birth_date', `${d.jy}-${String(d.jm).padStart(2, '0')}-${String(d.jd).padStart(2, '0')}`)} />
      <Text style={s.label}>آدرس</Text>
      <TextInput style={[s.input, { height: 70, textAlignVertical: 'top' }]} multiline value={p.address || ''} onChangeText={(v) => set('address', v)} />
      <Text style={s.label}>وضعیت تأهل</Text>
      <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
        {['مجرد', 'متأهل'].map((m) => <TouchableOpacity key={m} style={[s.chip, p.marital_status === m && s.chipOn]} onPress={() => set('marital_status', m)}><Text style={[s.chipTxt, p.marital_status === m && { color: '#fff' }]}>{m}</Text></TouchableOpacity>)}
      </View>
      <Text style={s.label}>تعداد فرزند</Text>
      <TextInput style={s.input} value={String(p.children_count || '')} onChangeText={(v) => set('children_count', v.replace(/[^0-9]/g, ''))} keyboardType="numeric" />
      <TouchableOpacity style={s.supplementaryBtn} onPress={() => navigation.navigate('CustomFields')}>
        <View style={{ flex: 1 }}><Text style={s.supplementaryTitle}>اطلاعات تکمیلی من</Text><Text style={s.supplementaryHint}>مشاهده و تکمیل اطلاعات سازمانی و اختصاصی</Text></View><Text style={s.supplementaryArrow}>‹</Text>
      </TouchableOpacity>
      {zoneOpts?.enabled && (
        <View style={s.zoneBox}>
          <Text style={s.zoneTitle}>منطقه و بازرسان</Text>
          <Text style={s.label}>۱) ابتدا منطقهٔ خود را انتخاب کنید</Text>
          <View style={s.chipWrap}>
            {(zoneOpts.zones || []).map((z) => <TouchableOpacity key={z.id} style={[s.chip, zoneId === z.id && s.chipOn]} onPress={() => { setZoneId(z.id); setInspectors([]); }}><Text style={[s.chipTxt, zoneId === z.id && { color: '#fff' }]}>{z.name}</Text></TouchableOpacity>)}
            {(!zoneOpts.zones || !zoneOpts.zones.length) && <Text style={s.muted}>منطقه‌ای تعریف نشده است.</Text>}
          </View>
          {zoneId && (loadingZ ? <Text style={[s.muted, { marginTop: 12 }]}>در حال بارگذاری بازرسین منطقه…</Text> : (
            <>
              {zoneChief && <View style={s.chiefBox}><Text style={s.chiefLabel}>★ {isAdminStaff ? 'مسئول بالادست شما (پیش‌فرض)' : 'سربازرس این منطقه'}</Text><Text style={s.chiefName}>{zoneChief.name}{zoneChief.role_title ? ` (${zoneChief.role_title})` : ''}</Text><Text style={s.chiefHint}>{isAdminStaff ? 'به‌عنوان نیروی اداری، بالادست شما به‌صورت پیش‌فرض رییس اداره بازرسی است. در صورت تمایل می‌توانید یک نیروی اداری دیگر را به‌عنوان بالادست انتخاب کنید.' : 'سربازرس منطقه به‌صورت خودکار تعیین شده و به مسئولین بالادست شما اضافه می‌شود.'}</Text></View>}
              <Text style={[s.label, { marginTop: 14 }]}>{isAdminStaff ? '۲) در صورت تمایل، نیروی اداری دیگری را به‌عنوان بالادست انتخاب کنید (اختیاری)' : '۲) بازرس(های) خود را از فهرست بازرسین این منطقه انتخاب کنید'}</Text>
              <Text style={s.zoneHint}>{isAdminStaff ? 'اگر انتخاب نکنید، رییس اداره بازرسی بالادست شما خواهد بود.' : 'می‌توانید بیش از یک بازرس انتخاب کنید.'}</Text>
              <View style={s.chipWrap}>
                {zoneInspectors.filter((ins) => !zoneChief || ins.id !== zoneChief.id).map((ins) => <TouchableOpacity key={ins.id} style={[s.chip, inspectors.includes(ins.id) && s.chipOn]} onPress={() => toggleInspector(ins.id)}><Text style={[s.chipTxt, inspectors.includes(ins.id) && { color: '#fff' }]}>{ins.name}{ins.role_title ? ` (${ins.role_title})` : ''}</Text></TouchableOpacity>)}
                {!isAdminStaff && <TouchableOpacity style={[s.chip, s.chipNotFound]} onPress={notFoundMsg}><Text style={[s.chipTxt, { color: '#b91c1c' }]}>بازرس من در فهرست نیست…</Text></TouchableOpacity>}
              </View>
              {zoneInspectors.length === 0 && <Text style={[s.muted, { marginTop: 6 }]}>هنوز بازرسی برای این منطقه ثبت نشده است. اگر بازرس شما در فهرست نیست، گزینهٔ بالا را لمس کنید.</Text>}
            </>
          ))}
          <Text style={s.zoneHint}>این انتخاب‌ها به‌صورت خودکار در چارت سازمانی و منطقه‌بندی نیروها اعمال می‌شوند.</Text>
        </View>
      )}
      <SignaturePad value={p.signature_data || null} onChange={(v) => set('signature_data', v)} />
      <TouchableOpacity style={[s.btn, busy && { opacity: 0.6 }]} disabled={busy} onPress={save}><Text style={s.btnTxt}>{busy ? 'در حال ذخیره…' : 'ذخیرهٔ اطلاعات'}</Text></TouchableOpacity>
    </ScrollView>
  );
}

export function ProfileScreen({ navigation }) {
  const { user } = useAuth();
  const [photo, setPhoto] = useState(user?.photo || null);
  const [busy, setBusy] = useState(false);
  const [photoCaptureOpen, setPhotoCaptureOpen] = useState(false);
  const [lines, setLines] = useState([]);
  const [linesOpen, setLinesOpen] = useState(false);
  const [viewPhoto, setViewPhoto] = useState(false);

  useEffect(() => { request('/my/lines').then(setLines).catch(() => setLines([])); }, []);
  useEffect(() => { request('/me/full-profile').then((p) => { if (p?.photo) setPhoto(p.photo); }).catch(() => {}); }, []);

  async function saveProfilePhoto(dataUri) {
    if (!dataUri || typeof dataUri !== 'string' || !dataUri.startsWith('data:image/')) {
      Alert.alert('خطا', 'تصویر گرفته‌شده معتبر نیست. دوباره تلاش کنید.');
      return;
    }
    setPhotoCaptureOpen(false);
    setBusy(true);
    try {
      const up = await request('/me/photo', { method: 'POST', body: { photo: dataUri } });
      if (up?.path) setPhoto('/api/media?path=' + encodeURIComponent(up.path));
      const pr = await request('/me/full-profile', { noStore: true }).catch(() => null);
      if (pr?.photo) setPhoto(pr.photo);
      Alert.alert('ذخیره شد', 'عکس پرسنلی جدید ثبت شد.');
    } catch (e) {
      Alert.alert('خطا', e.message || 'ثبت عکس ناموفق بود.');
    } finally {
      setBusy(false);
    }
  }

  if (photoCaptureOpen) {
    return <PersonalPhotoCapture facing="front" showGuide={false} title="تغییر عکس پرسنلی" instruction="صورت خود را روبه‌روی دوربین قرار دهید" uniformNotice={true} onCapture={saveProfilePhoto} onCancel={() => setPhotoCaptureOpen(false)} />;
  }

  return (
    <ScrollView persistentScrollbar={true} style={s.profileScroll} contentContainerStyle={s.profileContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={s.card}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => photo && setViewPhoto(true)}>
            {photo ? <Image source={imageSource(photo)} style={s.avatar} /> : <View style={s.avatarPh}><Text style={s.avatarTxt}>{(user?.name || '؟')[0]}</Text></View>}
          </TouchableOpacity>
          <View><Text style={s.name}>{user?.name}</Text><Text style={s.role}>{user?.role}</Text></View>
        </View>
        <TouchableOpacity style={s.photoBtn} onPress={() => setPhotoCaptureOpen(true)} disabled={busy}>
          <Text style={s.photoBtnTxt}>گرفتن عکس پرسنلی (سلفی)</Text>
        </TouchableOpacity>
      </View>

      <Text style={[s.label, { fontFamily: FONT.bold, color: CC.ink }]}>خطوط زیر نظر شما</Text>
      {lines.length === 0 ? (
        <Text style={{ color: CC.muted, fontFamily: FONT.regular, textAlign: 'right', marginBottom: 6 }}>خطی به شما اختصاص نیافته است.</Text>
      ) : (
        <>
          <TouchableOpacity onPress={() => setLinesOpen(o => !o)} style={s.linesHead}>
            <Text style={{ fontFamily: FONT.bold, color: CC.ink, textAlign: 'right' }}>خطوط مجاز برای شما ({faNum(lines.length)})</Text>
            <Text style={{ color: CC.brand, fontFamily: FONT.bold }}>{linesOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {linesOpen && lines.map((l) => (
            <View key={l.id} style={s.lineCard}>
              <Text style={{ fontFamily: FONT.bold, color: CC.ink, textAlign: 'right' }}>{faNum(l.code)} — {l.origin}{l.destination ? ' → ' + l.destination : ''}</Text>
            </View>
          ))}
        </>
      )}

      <Text style={{ textAlign: 'center', color: CC.muted, fontFamily: FONT.regular, fontSize: 12, marginTop: 18 }}>نسخهٔ برنامه: {faNum(Application.nativeApplicationVersion || '—')}</Text>
      <Text style={{ textAlign: 'center', color: CC.muted, fontFamily: FONT.regular, fontSize: 11, marginTop: 4, marginBottom: 6 }}>شرکت مبین شات مشهد</Text>
      <ImageViewer visible={viewPhoto} uri={photo} onClose={() => setViewPhoto(false)} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: CC.paper, padding: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: CC.paper },
  muted: { color: CC.muted, fontFamily: FONT.regular },
  label: { fontFamily: FONT.regular, color: CC.muted, fontSize: 13, marginBottom: 6, marginTop: 8, textAlign: 'right' },
  input: { backgroundColor: '#fff', borderColor: CC.line, borderWidth: 1, borderRadius: 13, minHeight: 52, paddingHorizontal: 14, paddingVertical: 12, textAlign: 'right', fontFamily: FONT.regular, color: CC.ink, fontSize: 16 },
  nationalInput: { minHeight: 58, width: '100%', fontSize: 19, letterSpacing: 2, textAlign: 'center', writingDirection: 'ltr', paddingHorizontal: 18 },
  supplementaryBtn: { marginTop: 18, marginBottom: 8, minHeight: 68, borderRadius: 15, borderWidth: 1, borderColor: '#c7d8ee', backgroundColor: '#eef6ff', paddingHorizontal: 15, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  supplementaryTitle: { fontFamily: FONT.bold, color: CC.ink, textAlign: 'right', fontSize: 15 },
  supplementaryHint: { fontFamily: FONT.regular, color: CC.muted, textAlign: 'right', fontSize: 12, marginTop: 3 },
  supplementaryArrow: { fontFamily: FONT.bold, color: CC.brand, fontSize: 28 },
  ro: { backgroundColor: '#f0f2f7', color: CC.muted },
  dateInput: { justifyContent: 'center', minHeight: 48 },
  dateTxt: { fontFamily: FONT.bold, color: CC.ink, textAlign: 'right' },
  datePlaceholder: { fontFamily: FONT.regular, color: CC.muted, textAlign: 'right' },
  btn: { backgroundColor: CC.brand, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 18 },
  btnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 15 },
  card: { backgroundColor: CC.brand, borderRadius: 16, padding: 18, marginBottom: 16 },
  avatar: { width: 64, height: 64, borderRadius: 16 },
  avatarPh: { width: 64, height: 64, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 24 },
  name: { color: '#fff', fontFamily: FONT.bold, fontSize: 17, textAlign: 'right' },
  role: { color: '#fff', opacity: 0.85, fontFamily: FONT.regular, textAlign: 'right', marginTop: 2 },
  photoBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 9, alignItems: 'center', marginTop: 12 },
  photoBtnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 13 },
  settingsCard: { backgroundColor: '#fff', borderColor: CC.line, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14 },
  settingRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  settingTxt: { fontFamily: FONT.bold, color: CC.ink, fontSize: 14 },
  sizeBtn: { backgroundColor: '#eef1f7', borderRadius: 9, paddingVertical: 6, paddingHorizontal: 12 },
  sizeBtnTxt: { fontFamily: FONT.bold, color: CC.ink, fontSize: 12 },
  linesHead: { backgroundColor: '#fff', borderColor: CC.line, borderWidth: 1, borderRadius: 11, padding: 13, marginBottom: 8, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  lineCard: { backgroundColor: '#fff', borderColor: CC.line, borderWidth: 1, borderRadius: 11, padding: 11, marginBottom: 8, marginRight: 10 },
  chip: { backgroundColor: '#eef2f8', borderWidth: 1, borderColor: CC.line, borderRadius: 99, paddingVertical: 8, paddingHorizontal: 16 },
  chipOn: { backgroundColor: CC.brand, borderColor: CC.brand },
  chipTxt: { fontFamily: FONT.regular, color: CC.slate, fontSize: 13 },
  chipWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chipChief: { backgroundColor: '#c98a00', borderColor: '#c98a00' },
  chipNotFound: { backgroundColor: '#fef2f2', borderColor: '#fca5a5', borderStyle: 'dashed' },
  chiefBox: { marginTop: 14, padding: 12, backgroundColor: '#fff8e6', borderRadius: 10, borderWidth: 1, borderColor: '#f0d98a' },
  chiefLabel: { fontFamily: FONT.bold, color: '#9a6b00', fontSize: 13, textAlign: 'right' },
  chiefName: { fontFamily: FONT.bold, color: CC.ink, fontSize: 15, textAlign: 'right', marginTop: 4 },
  chiefHint: { fontFamily: FONT.regular, color: CC.muted, fontSize: 11, textAlign: 'right', marginTop: 4 },
  zoneBox: { marginTop: 18, padding: 14, backgroundColor: '#f7f9fc', borderRadius: 12, borderWidth: 1, borderColor: CC.line },
  zoneTitle: { fontFamily: FONT.bold, color: CC.ink, fontSize: 15, textAlign: 'right', marginBottom: 8 },
  zoneHint: { fontFamily: FONT.regular, color: CC.muted, fontSize: 11.5, textAlign: 'right', marginTop: 12 },
  signatureBox: { marginTop: 18, padding: 14, backgroundColor: '#f7f9fc', borderRadius: 12, borderWidth: 1, borderColor: CC.line },
  signaturePad: { height: 190, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: CC.line, marginTop: 10, overflow: 'hidden' },
  signatureDot: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: '#111827' },
  signaturePreview: { height: 100, width: '100%', backgroundColor: '#fff', borderRadius: 10, marginTop: 10 },
  signatureFullscreenBtn: { minHeight: 48, marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: CC.brand, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  signatureFullscreenTxt: { fontFamily: FONT.bold, color: CC.brand, fontSize: 14 },
  signatureModal: { flex: 1, backgroundColor: CC.paper, padding: 14, paddingTop: 18 },
  signatureModalHeader: { minHeight: 56, flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 10 },
  signatureModalTitle: { fontFamily: FONT.bold, color: CC.ink, fontSize: 19, textAlign: 'right' },
  signatureModalHint: { fontFamily: FONT.regular, color: CC.muted, fontSize: 12, textAlign: 'right', marginTop: 4 },
  signatureModalClose: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e8edf5', alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  signatureModalCloseTxt: { fontFamily: FONT.bold, color: CC.ink, fontSize: 30, lineHeight: 32 },
  signaturePadFull: { flex: 1, minHeight: 180, backgroundColor: '#fff', borderRadius: 16, borderWidth: 2, borderColor: CC.line, overflow: 'hidden' },
  signatureModalActions: { flexDirection: 'row-reverse', gap: 10 },
  signatureModalAction: { flex: 1, marginTop: 12, minHeight: 52, justifyContent: 'center' },
  signatureClearBtn: { backgroundColor: '#6b7280' },
  signatureBackBtn: { minHeight: 44, marginTop: 8, alignItems: 'center', justifyContent: 'center' },
  signatureBackTxt: { fontFamily: FONT.bold, color: CC.muted, fontSize: 13 },
  signatureActions: { flexDirection: 'row-reverse', gap: 8 },
  signatureAction: { flex: 1, marginTop: 10 },
  profileScroll: { flex: 1, backgroundColor: CC.paper },
  profileContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },
});
