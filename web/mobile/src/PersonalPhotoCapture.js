import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, useWindowDimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { C, FONT } from './theme';
import ActivityIndicator from './components/PulseLoadingIndicator';
import { getImageConfig } from './img';

let ImageManipulator = null;
try { ImageManipulator = require('expo-image-manipulator'); } catch (_error) { ImageManipulator = null; }

// دوربین سلفی مشترک برای تغییر عکس پروفایل و صحت‌سنجی حضور.
// هیچ کادر چهره، ماسک، برش اجباری یا انتخاب از گالری در این صفحه وجود ندارد.
export default function PersonalPhotoCapture({
  onCapture,
  onCancel,
  facing = 'front',
  title = 'تأیید تصویر سلفی',
  instruction = 'مستقیم به دوربین نگاه کنید و تصویر واضح بگیرید.',
  uniformNotice = true,
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const { width, height } = useWindowDimensions();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(instruction);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [permission?.granted]);

  async function takePhoto() {
    if (!cameraRef.current || !ready || busy) return;
    setBusy(true);
    setMessage('در حال ثبت تصویر…');
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: getImageConfig().quality / 100,
        base64: true,
        skipProcessing: false,
        exif: false,
        shutterSound: false,
      });
      if (!photo?.uri) throw new Error('camera_empty_result');

      let uri = photo.uri;
      let base64 = photo.base64 || null;
      if (ImageManipulator?.manipulateAsync) {
        const result = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ resize: { width: getImageConfig().maxWidth } }],
          {
            compress: getImageConfig().quality / 100,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true,
          },
        );
        uri = result?.uri || uri;
        base64 = result?.base64 || base64;
      }
      if (!base64) throw new Error('camera_base64_missing');

      setPreview({ uri, dataUrl: `data:image/jpeg;base64,${base64}` });
      setMessage('تصویر را بررسی و سپس تأیید کنید.');
    } catch (_error) {
      setMessage('ثبت تصویر انجام نشد. دوربین را ثابت نگه دارید و دوباره تلاش کنید.');
    } finally {
      setBusy(false);
    }
  }

  if (!permission) {
    return <View style={styles.center}><ActivityIndicator color={C.brand} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>برای گرفتن تصویر سلفی، دسترسی دوربین لازم است.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>فعال‌کردن دوربین</Text>
        </TouchableOpacity>
        {onCancel ? <TouchableOpacity onPress={onCancel}><Text style={styles.cancelText}>انصراف</Text></TouchableOpacity> : null}
      </View>
    );
  }

  if (preview) {
    const previewWidth = Math.min(width - 28, 460);
    return (
      <View style={styles.previewPage}>
        <Text style={styles.previewTitle}>{title}</Text>
        <View style={[styles.previewFrame, { width: previewWidth }]}>
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
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <CameraView
        key={`selfie-camera-${facing}`}
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
      />

      <View style={styles.topShade} pointerEvents="none">
        <Text style={styles.cameraTitle}>{title}</Text>
      </View>

      <View style={styles.controls}>
        {uniformNotice ? <Text style={styles.uniformNotice}>⚠ تصویر باید با لباس فرم سازمانی گرفته شود</Text> : null}
        <Text style={styles.instruction}>{ready ? message : 'در حال آماده‌سازی دوربین سلفی…'}</Text>
        <TouchableOpacity
          style={[styles.shutter, (!ready || busy) && styles.disabled]}
          onPress={takePhoto}
          disabled={!ready || busy}
          activeOpacity={0.75}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <View style={styles.shutterInner} />}
        </TouchableOpacity>
        {onCancel ? <TouchableOpacity onPress={onCancel}><Text style={styles.cancelText}>انصراف</Text></TouchableOpacity> : null}
        <Text style={styles.cameraOnly}>ثبت تصویر فقط با دوربین جلوی گوشی انجام می‌شود.</Text>
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
  previewPage: { flex: 1, backgroundColor: C.paper, alignItems: 'center', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 22 },
  previewTitle: { fontFamily: FONT.bold, fontSize: 18, color: C.ink, marginBottom: 10 },
  // با flex:1 کادر تأیید تصویر همهٔ فضای عمودی باقی‌مانده (بین عنوان و دکمه‌ها) را پر می‌کند
  // نه فقط بخشی از صفحه؛ در نتیجه دیگر «نصف صفحه» دیده نمی‌شود.
  previewFrame: { width: '100%', maxWidth: '100%', flex: 1, alignSelf: 'stretch', borderRadius: 16, overflow: 'hidden', backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: '100%', height: '100%' },
  previewNote: { fontFamily: FONT.regular, color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 21, marginTop: 10 },
  actions: { width: '100%', flexDirection: 'row-reverse', gap: 10, justifyContent: 'center', marginTop: 14, marginBottom: 4 },
  actionButton: { flex: 1, maxWidth: 220, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { backgroundColor: C.brand, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 22, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontFamily: FONT.bold, fontSize: 14 },
  secondaryButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.brand },
  secondaryButtonText: { color: C.brand, fontFamily: FONT.bold, fontSize: 14 },
});
