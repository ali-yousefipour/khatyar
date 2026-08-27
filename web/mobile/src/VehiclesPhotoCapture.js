import React, { useState, useRef, useEffect } from 'react';
import { faNum } from './num';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { captureRef } from 'react-native-view-shot';
import { C, FONT } from './theme';
import { fjDateTime } from './jdate';
import ActivityIndicator from './components/PulseLoadingIndicator';
import { getImageConfig } from './img';

// گرفتن عکس از خودروهای خط با دوربین پشت + درج خودکار تاریخ شمسی، ساعت تهران و موقعیت GPS روی عکس
export default function VehiclesPhotoCapture({ onCapture, onCancel, station = null }) {
  const [perm, requestPerm] = useCameraPermissions();
  const camRef = useRef(null);
  const shotRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [shot, setShot] = useState(null); // uri عکس خام
  const [stamp, setStamp] = useState({ date: '', coords: '', street: '', dist: '' });
  const [coords, setCoords] = useState(null);
  const [finalUrl, setFinalUrl] = useState(null);

  useEffect(() => { if (perm && !perm.granted) requestPerm(); }, [perm]);

  if (!perm) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;
  if (!perm.granted) return (
    <View style={s.center}>
      <Text style={s.hint}>برای گرفتن عکس، اجازهٔ دوربین لازم است.</Text>
      <TouchableOpacity style={s.btn} onPress={requestPerm}><Text style={s.btnTxt}>اجازهٔ دوربین</Text></TouchableOpacity>
    </View>
  );

  // فاصلهٔ هاورساین بین دو نقطه (متر)
  function haversine(la1, lo1, la2, lo2) {
    const R = 6371000, t = Math.PI / 180;
    const dLa = (la2 - la1) * t, dLo = (lo2 - lo1) * t;
    const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * t) * Math.cos(la2 * t) * Math.sin(dLo / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  async function snap() {
    if (!camRef.current || busy) return;
    setBusy(true);
    try {
      // موقعیت GPS دقیق
      let lat = null, lng = null;
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
        lat = pos.coords.latitude; lng = pos.coords.longitude;
      } catch (e) {}
      const now = new Date();
      const dateStr = fjDateTime(now); // تاریخ شمسی + ساعت تهران
      setCoords({ lat, lng });

      // نام خیابان با reverse geocode
      let street = '';
      if (lat != null) {
        try {
          const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
          if (places && places[0]) {
            const pl = places[0];
            street = [pl.street, pl.name, pl.district].filter(Boolean).slice(0, 2).join('، ');
          }
        } catch (e) {}
      }

      // فاصله تا ایستگاه (در صورت تعریف محدودهٔ ایستگاه)
      let dist = '';
      if (lat != null && station) {
        try {
          if (station.center_lat != null && station.center_lng != null) {
            const d = haversine(lat, lng, +station.center_lat, +station.center_lng);
            const edge = station.radius_m ? Math.max(0, d - (+station.radius_m)) : d;
            dist = `فاصله تا ایستگاه: ${faNum(Math.round(edge))} متر`;
          }
        } catch (e) {}
      }

      setStamp({
        date: dateStr,
        coords: lat != null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : 'موقعیت نامشخص',
        street: street ? ('خیابان: ' + street) : '',
        dist,
      });
      const photo = await camRef.current.takePictureAsync({ quality: getImageConfig().quality / 100 });
      setShot(photo.uri);
    } catch (e) {
      // ignore
    } finally { setBusy(false); }
  }

  // پس از نمایش عکس + لایهٔ متن، با view-shot تصویر نهایی را می‌سازیم
  async function confirm() {
    setBusy(true);
    try {
      const uri = await captureRef(shotRef, { format: 'jpg', quality: getImageConfig().quality / 100, result: 'base64' });
      const dataUrl = 'data:image/jpeg;base64,' + uri;
      onCapture(dataUrl, coords);
    } catch (e) {
      // اگر view-shot کار نکرد، عکس خام را می‌فرستیم
      onCapture(shot, coords);
    } finally { setBusy(false); }
  }

  if (shot) {
    return (
      <View style={s.previewWrap}>
        <Text style={s.title}>تأیید عکس خودروهای خط</Text>
        <View ref={shotRef} collapsable={false} style={s.shotBox}>
          <Image source={{ uri: shot }} style={s.shotImg} resizeMode="cover" />
          <View style={s.stampBox}>
            <Text style={s.stampTxt}>{stamp.date}</Text>
            <Text style={s.stampTxt}>📍 {stamp.coords}</Text>
            {stamp.street ? <Text style={s.stampTxt}>{stamp.street}</Text> : null}
            {stamp.dist ? <Text style={s.stampTxt}>{stamp.dist}</Text> : null}
            <Text style={s.stampBrand}>سامانه خطیار</Text>
          </View>
        </View>
        <View style={s.rowBtns}>
          <TouchableOpacity style={[s.btn, s.outline]} onPress={() => setShot(null)}><Text style={[s.btnTxt, { color: C.brand }]}>دوباره</Text></TouchableOpacity>
          <TouchableOpacity style={s.btn} onPress={confirm} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>تأیید و ارسال</Text>}</TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.camWrap}>
      <CameraView ref={camRef} style={s.cam} facing="back" />
      <View style={s.bottom}>
        <Text style={s.hint}>با دوربین پشت، از خودروهای حاضر در خط عکس بگیرید. تاریخ، ساعت و موقعیت به‌صورت خودکار روی عکس درج می‌شود.</Text>
        <TouchableOpacity style={s.shutter} onPress={snap} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <View style={s.shutterInner} />}</TouchableOpacity>
        {onCancel ? <TouchableOpacity onPress={onCancel}><Text style={s.cancel}>انصراف</Text></TouchableOpacity> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#000' },
  camWrap: { flex: 1, backgroundColor: '#000' },
  cam: { flex: 1 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  hint: { color: '#fff', fontFamily: FONT.regular, fontSize: 13, marginBottom: 12, textAlign: 'center', lineHeight: 21 },
  shutter: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff' },
  cancel: { color: '#fff', marginTop: 12, fontFamily: FONT.regular, fontSize: 13 },
  previewWrap: { flex: 1, backgroundColor: C.paper, alignItems: 'center', padding: 16 },
  title: { fontFamily: FONT.bold, fontSize: 18, color: C.ink, marginVertical: 12 },
  shotBox: { width: '100%', aspectRatio: 3 / 4, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000' },
  shotImg: { width: '100%', height: '100%' },
  stampBox: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8 },
  stampTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 12, textAlign: 'right' },
  stampBrand: { color: C.taxi, fontFamily: FONT.bold, fontSize: 10, textAlign: 'right', marginTop: 2 },
  rowBtns: { flexDirection: 'row-reverse', gap: 12, marginTop: 16, width: '100%', justifyContent: 'center' },
  btn: { backgroundColor: C.brand, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 26, alignItems: 'center' },
  outline: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.brand },
  btnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 14 },
});
