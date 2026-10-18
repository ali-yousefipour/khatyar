import ActivityIndicator from './components/PulseLoadingIndicator';
import { getImageConfig, compressToDataUri } from './img';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Modal, StyleSheet, AppState, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import { request } from './api';
import { useAuth } from './auth';
import { FONT } from './theme';
import { isCameraInUse, useCameraSession } from './cameraSession';

let CameraView = null, useCameraPermissions = null;
try {
  const cam = require('expo-camera');
  CameraView = cam.CameraView;
  useCameraPermissions = cam.useCameraPermissions;
} catch {}

function CaptureSession({ onDone }) {
  const camRef = useRef(null);
  const tookRef = useRef(false);
  const finishedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const finish = photo => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onDone(photo);
  };
  const capture = async () => {
    if (tookRef.current || !camRef.current) return;
    tookRef.current = true;
    try {
      const photo = await camRef.current.takePictureAsync({ quality: getImageConfig().quality / 100, skipProcessing: false });
      if (finishedRef.current) {
        if (photo?.uri) require('expo-file-system/legacy').deleteAsync(photo.uri, { idempotent: true }).catch(() => {});
        return;
      }
      finish(photo);
    } catch { finish(null); }
  };
  useEffect(() => {
    const t = setTimeout(() => finish(null), 30000);
    return () => { clearTimeout(t); finishedRef.current = true; };
  }, []);
  if (!CameraView) return null;
  return (
    <View style={{ width: '100%' }}>
      <CameraView ref={camRef} style={{ width: '100%', height: 260 }} facing="front" onCameraReady={() => setReady(true)} onMountError={() => finish(null)} />
      <TouchableOpacity accessibilityRole="button" disabled={!ready || tookRef.current} onPress={capture} style={s.button}><Text style={s.buttonText}>گرفتن و ارسال سلفی</Text></TouchableOpacity>
    </View>
  );
}

export default function CovertSelfie() {
  const { user } = useAuth();
  const [perm, requestPerm] = useCameraPermissions ? useCameraPermissions() : [null, async () => null];
  const [shooting, setShooting] = useState(false);
  const [pending, setPending] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const commandRef = useRef(null);
  const generationRef = useRef(0);
  const busyRef = useRef(false);
  const uploadingRef = useRef(false);
  const { cameraActive } = useCameraSession(shooting);

  const doCapture = useCallback(async (rsn) => {
    if (!CameraView) { setError('ماژول دوربین در این نصب در دسترس نیست.'); return false; }
    if (busyRef.current || AppState.currentState !== 'active') return false;
    if (isCameraInUse()) { setError('دوربین در بخش دیگری فعال است؛ آن بخش را ببندید.'); return false; }
    const generation = generationRef.current;
    busyRef.current = true;
    let hasPerm = perm?.granted;
    if (!hasPerm) { const r = await requestPerm().catch(() => null); hasPerm = r?.granted; }
    if (generation !== generationRef.current) return false;
    if (!hasPerm || isCameraInUse() || AppState.currentState !== 'active') {
      busyRef.current = false;
      setError(!hasPerm ? 'دسترسی دوربین لازم است.' : 'دوربین در بخش دیگری فعال است؛ دوباره تلاش کنید.');
      return false;
    }
    busyRef.current = true;
    setError('');
    setShooting(true);
    return true;
  }, [perm]);

  const handleDone = useCallback(async (photo) => {
    const generation = generationRef.current;
    const command = commandRef.current;
    setShooting(false);
    if (!photo?.uri) { busyRef.current = false; setError('دوربین عکس معتبری دریافت نکرد؛ دوباره تلاش کنید.'); return; }
    setSending(true);
    uploadingRef.current = true;
    try {
      const data = await compressToDataUri(photo.uri);
      if (!data) throw new Error('فشرده‌سازی تصویر ناموفق بود.');
      let lat = null, lng = null;
      try { const loc = await Location.getLastKnownPositionAsync({}); if (loc) { lat = loc.coords.latitude; lng = loc.coords.longitude; } } catch {}
      if (generation !== generationRef.current) return;
      const result = await request('/my/covert-selfie', {
        method: 'POST', queueIfOffline: false, noStore: true,
        body: { photo: data, lat, lng, reason: 'server_command', [command.kind + '_id']: command.id },
      });
      if (!result?.ok || !(Number(result.id) > 0) || result.queued) throw new Error('ثبت تصویر در سرور تأیید نشد.');
      if (generation === generationRef.current) { commandRef.current = null; setPending(null); }
    } catch (failure) {
      if (generation === generationRef.current) setError(failure.message || 'ارسال ناموفق بود؛ دوباره تلاش کنید.');
    } finally {
      require('expo-file-system/legacy').deleteAsync(photo.uri, { idempotent: true }).catch(() => {});
      if (generation === generationRef.current) { busyRef.current = false; uploadingRef.current = false; setSending(false); }
    }
  }, []);

  // طبق سیاست جدید، اپ دیگر هنگام ورود، ثبت حضور یا بازه‌های دوره‌ای سلفی نمی‌گیرد.
  // گرفتن سلفی فقط با دستور صریح سرور/مدیر انجام می‌شود.
  useEffect(() => {
    let mounted = true;
    let polling = false;
    generationRef.current += 1;
    commandRef.current = null;
    busyRef.current = false;
    uploadingRef.current = false;
    setPending(null); setShooting(false); setSending(false);
    const poll = async () => {
      if (!mounted || !user?.id || polling || commandRef.current || AppState.currentState !== 'active') return;
      polling = true;
      try {
        const r = await request('/my/covert-selfie-request', { noStore: true });
        let command = r?.id ? { kind: 'request', id: r.id } : null;
        if (!command) {
          const commands = await request('/my/selfie-commands', { noStore: true });
          if (commands?.[0]?.id) command = { kind: 'command', id: commands[0].id };
        }
        if (mounted && command && AppState.currentState === 'active') {
          commandRef.current = command; setPending(command); setError('');
        }
      } catch (failure) { console.warn('Selfie command polling failed:', failure.message); }
      finally { polling = false; }
    };
    poll();
    const pollIv = setInterval(poll, 30000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') poll();
      else { setShooting(false); if (!uploadingRef.current) busyRef.current = false; }
    });
    return () => { mounted = false; generationRef.current += 1; clearInterval(pollIv); subscription.remove(); };
  }, [user?.id]);

  if (!pending || !user?.id) return null;
  return (
    <>
      <Modal transparent animationType="fade" visible={true} statusBarTranslucent onRequestClose={() => { if (!sending) { generationRef.current += 1; setShooting(false); busyRef.current = false; setPending(null); commandRef.current = null; } }}>
        <View style={s.overlay}>
          <View style={s.box}>
            <Text style={s.txt}>درخواست سلفی از مدیر سامانه</Text>
            <Text style={s.txt}>پس از گرفتن عکس، تصویر شما برای سامانه ارسال می‌شود.</Text>
            {!!error && <Text accessibilityRole="alert" style={s.txt}>{error}</Text>}
            {shooting && cameraActive ? <CaptureSession onDone={handleDone} /> :
              <TouchableOpacity accessibilityRole="button" disabled={sending || shooting} style={s.button} onPress={() => doCapture('manual')}><Text style={s.buttonText}>{sending ? 'در حال ثبت تصویر…' : shooting ? 'اتصال به دوربین…' : 'باز کردن دوربین'}</Text></TouchableOpacity>}
            {sending && <ActivityIndicator color="#0d7a5f" />}
            <TouchableOpacity disabled={sending} onPress={() => { generationRef.current += 1; setShooting(false); busyRef.current = false; setPending(null); commandRef.current = null; }}><Text style={s.txt}>بعداً</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  box: { backgroundColor: '#fff', borderRadius: 14, padding: 20, alignItems: 'center', width: '92%', maxWidth: 380, elevation: 8 },
  txt: { fontFamily: FONT.regular, color: '#333', fontSize: 13, marginTop: 14 },
  button: { backgroundColor: '#0d7a5f', padding: 14, borderRadius: 10, marginTop: 16 },
  buttonText: { fontFamily: FONT.bold, color: '#fff', textAlign: 'center' },
});
