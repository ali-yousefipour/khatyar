import React, { useState, useRef, useEffect } from 'react';
import { faNum } from './num';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, useWindowDimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { captureRef } from 'react-native-view-shot';
import { C, FONT } from './theme';
import { fjDateTime } from './jdate';
import ActivityIndicator from './components/PulseLoadingIndicator';
import { getImageConfig, compressToDataUri } from './img';
import { getAppConfig } from './appconfig';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VehiclesPhotoCapture({ onCapture, onCancel, station = null }) {
  const [perm, requestPerm] = useCameraPermissions();
  const camRef = useRef(null);
  const shotRef = useRef(null);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [shot, setShot] = useState(null);
  const [metaBusy, setMetaBusy] = useState(false);
  const [stamp, setStamp] = useState({ date: '', coords: 'در حال دریافت موقعیت…', street: '', dist: '' });
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getAppConfig(true).catch(() => {});
    if (perm && !perm.granted && perm.canAskAgain) requestPerm().catch(() => {});
  }, [perm?.granted]);

  function haversine(a, b, c, d) {
    const R = 6371000, t = Math.PI / 180, dl = (c - a) * t, do_ = (d - b) * t;
    const x = Math.sin(dl / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin(do_ / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
  }

  async function readLocation() {
    try {
      const p = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        maximumAge: 15000,
      });
      const lat = p?.coords?.latitude ?? null;
      const lng = p?.coords?.longitude ?? null;
      if (lat == null || lng == null) return { lat: null, lng: null, street: '', dist: '' };

      let street = '';
      try {
        const address = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (address?.[0]) {
          street = [address[0].street, address[0].name, address[0].district]
            .filter(Boolean).slice(0, 2).join('، ');
        }
      } catch (_) {}

      let dist = '';
      if (station?.center_lat != null && station?.center_lng != null) {
        try {
          const d = haversine(lat, lng, +station.center_lat, +station.center_lng);
          const edge = station.radius_m ? Math.max(0, d - (+station.radius_m)) : d;
          dist = `فاصله تا ایستگاه: ${faNum(Math.round(edge))} متر`;
        } catch (_) {}
      }
      return { lat, lng, street, dist };
    } catch (_) {
      return { lat: null, lng: null, street: '', dist: '' };
    }
  }

  async function snap() {
    if (!camRef.current || !cameraReady || busy) return;
    setBusy(true);
    setError('');
    try {
      // عکس باید بلافاصله بعد از لمس شاتر گرفته شود؛ GPS و Reverse Geocode نباید
      // کاربر را قبل از ثبت عکس منتظر نگه دارند.
      const photoPromise = camRef.current.takePictureAsync({
        quality: getImageConfig().quality / 100,
        exif: false,
        skipProcessing: false,
      });
      const locationPromise = readLocation();
      const photo = await photoPromise;
      if (!photo?.uri) throw new Error('camera_empty_result');

      setShot(photo.uri);
      setStamp({
        date: fjDateTime(new Date()),
        coords: 'در حال دریافت موقعیت…',
        street: '',
        dist: '',
      });
      setMetaBusy(true);

      // متادیتای موقعیت بعد از نمایش عکس تکمیل می‌شود؛ بنابراین دوربین سریعاً
      // وارد مرحله تأیید می‌شود و reverse geocoding مسیر UI را قفل نمی‌کند.
      locationPromise.then((loc) => {
        setCoords({ lat: loc.lat, lng: loc.lng });
        setStamp((prev) => ({
          ...prev,
          coords: loc.lat != null && loc.lng != null
            ? `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`
            : 'موقعیت نامشخص',
          street: loc.street || '',
          dist: loc.dist || '',
        }));
      }).catch(() => {
        setCoords(null);
        setStamp((prev) => ({ ...prev, coords: 'موقعیت نامشخص' }));
      }).finally(() => setMetaBusy(false));
    } catch (_) {
      setError('ثبت تصویر انجام نشد. دوربین را ثابت نگه دارید و دوباره تلاش کنید.');
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!shot || busy) return;
    setBusy(true);
    setError('');
    try {
      const stamped = await captureRef(shotRef, { format: 'jpg', quality: 0.92 });
      const data = await compressToDataUri(stamped, {
        maxW: getImageConfig().maxWidth,
        quality: getImageConfig().quality,
      });
      if (!data) throw new Error('image_compression_failed');
      onCapture(data, coords);
    } catch (_) {
      try {
        const data = await compressToDataUri(shot, {
          maxW: getImageConfig().maxWidth,
          quality: getImageConfig().quality,
        });
        if (!data) throw new Error('image_compression_failed');
        onCapture(data, coords);
      } catch (_) {
        setError('آماده‌سازی تصویر انجام نشد. دوباره تلاش کنید.');
      }
    } finally {
      setBusy(false);
    }
  }

  if (!perm) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;

  if (!perm.granted) {
    return (
      <View style={s.center}>
        <Text style={s.hint}>برای گرفتن عکس، اجازهٔ دوربین لازم است.</Text>
        <TouchableOpacity style={s.btn} onPress={requestPerm}>
          <Text style={s.btnTxt}>اجازهٔ دوربین</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (shot) {
    const shotHeight = Math.max(190, Math.min(Math.round(height * 0.38), 390));
    return (
      <View style={s.previewWrap}>
        <ScrollView
          style={s.previewScroll}
          contentContainerStyle={[s.previewContent, { paddingBottom: Math.max(28, insets.bottom + 28) }]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Text style={s.title}>تأیید عکس خودروهای خط</Text>
          <View
            ref={shotRef}
            collapsable={false}
            style={[s.shotBox, { height: shotHeight }]}
          >
            <Image source={{ uri: shot }} style={s.shotImg} resizeMode="contain" />
            <View style={s.stampBox}>
              <Text style={s.stampTxt}>{stamp.date}</Text>
              <Text style={s.stampTxt}>📍 {stamp.coords}</Text>
              {stamp.street ? <Text style={s.stampTxt}>{stamp.street}</Text> : null}
              {stamp.dist ? <Text style={s.stampTxt}>{stamp.dist}</Text> : null}
              <Text style={s.stampBrand}>سامانه خطیار</Text>
            </View>
          </View>

          {metaBusy ? <Text style={s.metaLoading}>در حال تکمیل اطلاعات موقعیت…</Text> : null}
          <Text style={s.previewNote}>تصویر و اطلاعات موقعیت را بررسی کنید و سپس تأیید و ارسال را بزنید.</Text>
          {error ? <Text style={s.error}>{error}</Text> : null}

          <View style={s.rowBtns}>
            <TouchableOpacity style={[s.btn, s.outline]} onPress={() => { setShot(null); setError(''); setMetaBusy(false); }}>
              <Text style={[s.btnTxt, { color: C.brand }]}>دوباره</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btn} onPress={confirm} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>تأیید و ارسال</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.camWrap}>
      <CameraView
        ref={camRef}
        style={s.cam}
        facing="back"
        mode="picture"
        active
        onCameraReady={() => setCameraReady(true)}
        onMountError={(event) => {
          setCameraReady(false);
          setError(event?.message || 'دوربین آماده نشد.');
        }}
      />
      <View style={[s.bottom, { paddingBottom: Math.max(20, insets.bottom + 12) }]}>
        <Text style={s.hint}>با دوربین پشت، از خودروهای حاضر در خط عکس بگیرید. تاریخ، ساعت و موقعیت به‌صورت خودکار روی عکس درج می‌شود.</Text>
        {error ? <Text style={s.error}>{error}</Text> : null}
        <TouchableOpacity style={[s.shutter, (!cameraReady || busy) && s.disabled]} onPress={snap} disabled={!cameraReady || busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <View style={s.shutterInner} />}
        </TouchableOpacity>
        {onCancel ? <TouchableOpacity onPress={onCancel}><Text style={s.cancel}>انصراف</Text></TouchableOpacity> : null}
        <Text style={s.cameraOnly}>ثبت تصویر فقط با دوربین پشت گوشی انجام می‌شود و انتخاب از گالری در این مرحله وجود ندارد.</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#000' },
  camWrap: { flex: 1, minHeight: 0, backgroundColor: '#000', overflow: 'hidden' },
  cam: { ...StyleSheet.absoluteFillObject },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 18, paddingTop: 18, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.60)' },
  hint: { color: '#fff', fontFamily: FONT.regular, fontSize: 13, marginBottom: 10, textAlign: 'center', lineHeight: 21 },
  shutter: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff' },
  disabled: { opacity: 0.55 },
  cancel: { color: '#fff', marginTop: 10, fontFamily: FONT.regular, fontSize: 13 },
  cameraOnly: { color: 'rgba(255,255,255,0.72)', fontFamily: FONT.regular, fontSize: 11, textAlign: 'center', marginTop: 8 },
  previewWrap: { flex: 1, minHeight: 0, width: '100%', backgroundColor: C.paper },
  previewScroll: { flex: 1, width: '100%' },
  previewContent: { width: '100%', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12 },
  title: { fontFamily: FONT.bold, fontSize: 18, color: C.ink, marginVertical: 8, textAlign: 'center' },
  shotBox: { width: '100%', borderRadius: 14, overflow: 'hidden', backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  shotImg: { width: '100%', height: '100%' },
  stampBox: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.58)', padding: 8 },
  stampTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 12, textAlign: 'right' },
  stampBrand: { color: C.taxi, fontFamily: FONT.bold, fontSize: 10, textAlign: 'right', marginTop: 2 },
  metaLoading: { fontFamily: FONT.regular, color: C.brand, fontSize: 12, textAlign: 'center', marginTop: 8 },
  previewNote: { fontFamily: FONT.regular, color: C.muted, fontSize: 12, textAlign: 'center', lineHeight: 20, marginTop: 8 },
  error: { fontFamily: FONT.regular, color: C.danger, fontSize: 12, textAlign: 'center', lineHeight: 20, marginTop: 6 },
  rowBtns: { flexDirection: 'row-reverse', gap: 12, marginTop: 12, width: '100%', justifyContent: 'center' },
  btn: { flex: 1, minHeight: 48, backgroundColor: C.brand, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  outline: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.brand },
  btnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 14, textAlign: 'center' },
});
