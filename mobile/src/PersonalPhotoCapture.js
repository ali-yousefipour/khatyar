import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, useWindowDimensions, Linking } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { C, FONT } from './theme';
import ActivityIndicator from './components/PulseLoadingIndicator';
import { compressToDataUri } from './img';
import { getAppConfig } from './appconfig';
import { useCameraSession } from './cameraSession';
import { launchCamera, ImagePicker } from './cameraLock';

// دوربین سلفی مشترک برای تغییر عکس پروفایل و صحت‌سنجی حضور.
// انتخاب از گالری عمداً در این مسیر وجود ندارد؛ تصویر فقط از دوربین گرفته می‌شود.
// Keep this component syntactically self-contained so release Babel/Metro cannot consume a partial JSX edit.
export default function PersonalPhotoCapture({
  onCapture,
  onCancel,
  facing = 'front',
  title = 'تأیید تصویر سلفی',
  instruction = 'مستقیم به دوربین نگاه کنید و تصویر واضح بگیرید.',
  uniformNotice = true,
  systemCameraFirst = false,
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const { width, height } = useWindowDimensions();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(instruction);
  const [preview, setPreview] = useState(null);
  const [useInlineCamera, setUseInlineCamera] = useState(!systemCameraFirst);
  const [systemCameraOpen, setSystemCameraOpen] = useState(false);
  const captureGeneration = useRef(0);
  const { cameraActive, cameraKey, restartCamera } = useCameraSession(!!permission?.granted && !preview && useInlineCamera && !systemCameraOpen);
  useEffect(() => { if (!cameraActive) setReady(false); }, [cameraActive]);
  useEffect(() => () => { captureGeneration.current += 1; }, []);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) requestPermission().catch(() => setMessage('دسترسی دوربین برقرار نشد.'));
  }, [permission?.granted]);

  async function takePhoto() {
    if (!cameraRef.current || !cameraActive || !ready || busy) return;
    setBusy(true);
    setMessage('در حال ثبت تصویر…');
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        skipProcessing: false,
        exif: false,
        shutterSound: false,
      });
      if (!photo?.uri) throw new Error('camera_empty_result');

      await getAppConfig(true);
      const dataUrl = await compressToDataUri(photo.uri);
      if (!dataUrl) throw new Error('camera_base64_missing');
      setReady(false);
      setPreview({ uri: photo.uri, dataUrl });
      setMessage('تصویر را بررسی و سپس تأیید کنید.');
    } catch (_error) {
      setMessage('ثبت تصویر انجام نشد. دوربین را ثابت نگه دارید و دوباره تلاش کنید.');
    } finally {
      setBusy(false);
    }
  }

  async function openSystemCamera() {
    if (busy || systemCameraOpen || preview) return;
    const generation = ++captureGeneration.current;
    setSystemCameraOpen(true);
    setReady(false);
    setMessage('در حال بازکردن دوربین گوشی…');
    try {
      // Release any active CameraView before launching the phone camera app.
      if (useInlineCamera) await new Promise(resolve => setTimeout(resolve, 1200));
      const result = await launchCamera({
        mediaTypes: ['images'],
        cameraType: facing === 'back' ? (ImagePicker.CameraType?.back || 'back') : (ImagePicker.CameraType?.front || 'front'),
        quality: 1, allowsEditing: false, base64: false, exif: false,
      });
      if (generation !== captureGeneration.current) return;
      if (result?.canceled) { setMessage(instruction); return; }
      const uri = result?.assets?.[0]?.uri;
      if (!uri) throw new Error('system_camera_no_image');
      setBusy(true);
      const dataUrl = await compressToDataUri(uri);
      if (generation !== captureGeneration.current) return;
      if (!dataUrl) throw new Error('camera_base64_missing');
      setPreview({ uri, dataUrl });
      setMessage('تصویر را بررسی و سپس تأیید کنید.');
    } catch (_) {
      if (generation === captureGeneration.current) setMessage('ثبت عکس با دوربین گوشی انجام نشد. دوباره تلاش کنید یا از دوربین داخلی استفاده کنید.');
    } finally {
      if (generation === captureGeneration.current) { setBusy(false); setSystemCameraOpen(false); }
    }
  }

  if (!permission) {
    return <View style={styles.center}><ActivityIndicator color={C.brand} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>برای گرفتن تصویر سلفی، دسترسی دوربین لازم است.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => permission.canAskAgain ? requestPermission().catch(() => setMessage('دسترسی دوربین برقرار نشد.')) : Linking.openSettings()}>
          <Text style={styles.primaryButtonText}>فعال‌کردن دوربین</Text>
        </TouchableOpacity>
        {onCancel ? <TouchableOpacity onPress={onCancel}><Text style={styles.cancelText}>انصراف</Text></TouchableOpacity> : null}
      </View>
    );
  }

  if (preview) {
    const previewWidth = Math.min(width - 28, 460);
    const previewMaxHeight = Math.max(180, Math.min(height * 0.58, 520));
    return (
      <View style={styles.previewPage}>
        <ScrollView persistentScrollbar={true}           style={styles.previewScroll}
          contentContainerStyle={styles.previewContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Text style={styles.previewTitle}>{title}</Text>
          <View style={[styles.previewFrame, { width: previewWidth, maxHeight: previewMaxHeight }]}>
            <Image source={{ uri: preview.uri }} style={styles.previewImage} resizeMode="contain" />
          </View>
          <Text style={styles.previewNote}>از واضح‌بودن صورت و نور مناسب تصویر مطمئن شوید.</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => { setPreview(null); setReady(false); setMessage(instruction); }}
            >
              <Text style={styles.secondaryButtonText}>گرفتن دوباره</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={() => onCapture(preview.dataUrl)}>
              <Text style={styles.primaryButtonText}>تأیید تصویر</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      {cameraActive && useInlineCamera && <CameraView
        key={`selfie-camera-${facing}-${cameraKey}`}
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing === 'back' ? 'back' : 'front'}
        mode="picture"
        active
        onCameraReady={() => { setReady(true); setMessage(instruction); }}
        onMountError={(event) => {
          setReady(false);
          setMessage(event?.message || 'دوربین آماده نشد. یک‌بار از صفحه خارج و دوباره وارد شوید.');
        }}
      />}

      <View style={styles.topShade} pointerEvents="none">
        <Text style={styles.cameraTitle}>{title}</Text>
      </View>

      <View style={styles.controls}>
        {uniformNotice ? <Text style={styles.uniformNotice}>⚠ تصویر باید با لباس فرم سازمانی گرفته شود</Text> : null}
        <Text style={styles.instruction}>{message}</Text>
        <TouchableOpacity accessibilityRole="button" style={[styles.nativeButton, (busy || systemCameraOpen) && styles.disabled]} onPress={openSystemCamera} disabled={busy || systemCameraOpen}>
          <Text style={styles.primaryButtonText}>{systemCameraOpen ? 'در حال بازکردن دوربین گوشی…' : '📷 عکس‌برداری با دوربین گوشی'}</Text>
        </TouchableOpacity>
        {systemCameraFirst && !useInlineCamera ? <Text style={styles.cameraOnly}>برای عکس سلفی، دوربین جلو را انتخاب کنید. انتخاب تصویر از گالری مجاز نیست.</Text> : null}
        {useInlineCamera && !ready && <TouchableOpacity onPress={() => { setReady(false); restartCamera(); }}><Text style={styles.cancelText}>راه‌اندازی دوباره دوربین داخلی</Text></TouchableOpacity>}
        {useInlineCamera && <TouchableOpacity
          style={[styles.shutter, (!ready || busy) && styles.disabled]}
          onPress={takePhoto}
          disabled={!ready || busy || systemCameraOpen}
          activeOpacity={0.75}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <View style={styles.shutterInner} />}
        </TouchableOpacity>}
        {systemCameraFirst && <TouchableOpacity accessibilityRole="button" onPress={() => { setUseInlineCamera(value => !value); setReady(false); }} disabled={busy || systemCameraOpen}>
          <Text style={styles.cancelText}>{useInlineCamera ? 'بازگشت به دوربین گوشی' : 'استفاده از دوربین داخلی برنامه'}</Text>
        </TouchableOpacity>}
        {onCancel ? <TouchableOpacity onPress={onCancel}><Text style={styles.cancelText}>انصراف</Text></TouchableOpacity> : null}
        <Text style={styles.cameraOnly}>ثبت تصویر فقط با دوربین گوشی انجام می‌شود و انتخاب از گالری در این مرحله غیرفعال است.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 24 },
  permissionText: { color: '#fff', fontFamily: FONT.regular, textAlign: 'center', lineHeight: 24, marginBottom: 18 },
  topShade: { position: 'absolute', top: 0, right: 0, left: 0, paddingTop: 16, paddingBottom: 28, paddingHorizontal: 18, backgroundColor: 'rgba(0,0,0,0.38)' },
  cameraTitle: { color: '#fff', fontFamily: FONT.bold, fontSize: 17, textAlign: 'center' },
  controls: { position: 'absolute', right: 0, left: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 20, backgroundColor: 'rgba(0,0,0,0.58)' },
  uniformNotice: { color: C.taxi, fontFamily: FONT.bold, fontSize: 13, textAlign: 'center', marginBottom: 5 },
  instruction: { color: '#fff', fontFamily: FONT.regular, fontSize: 13, textAlign: 'center', lineHeight: 21, marginBottom: 12 },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  disabled: { opacity: 0.55 },
  cancelText: { color: '#fff', fontFamily: FONT.regular, fontSize: 13, marginTop: 12 },
  cameraOnly: { color: 'rgba(255,255,255,0.72)', fontFamily: FONT.regular, fontSize: 11, textAlign: 'center', marginTop: 8 },
  nativeButton: { backgroundColor: C.brand, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 24, width: '100%', alignItems: 'center', marginBottom: 10 },
  previewPage: { flex: 1, backgroundColor: C.paper },
  previewScroll: { flex: 1 },
  previewContent: { alignItems: 'center', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 24 },
  previewTitle: { fontFamily: FONT.bold, fontSize: 18, color: C.ink, marginBottom: 10, textAlign: 'center' },
  previewFrame: { width: '100%', alignSelf: 'stretch', minHeight: 180, borderRadius: 16, overflow: 'hidden', backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: '100%', height: '100%' },
  previewNote: { fontFamily: FONT.regular, color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 21, marginTop: 10 },
  actions: { width: '100%', flexDirection: 'row-reverse', gap: 10, justifyContent: 'center', marginTop: 14 },
  actionButton: { flex: 1, maxWidth: 220, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { backgroundColor: C.brand, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 22, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontFamily: FONT.bold, fontSize: 14 },
  secondaryButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.brand },
  secondaryButtonText: { color: C.brand, fontFamily: FONT.bold, fontSize: 14 },
});
