import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { imageSource } from '../api';
import { C, FONT } from '../theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// A failed Image load alone cannot distinguish a removed file from an offline device.
export function isRemovedMediaStatus(status) {
  return status === 404 || status === 410;
}

async function checkRemovedMedia(uri) {
  const source = imageSource(uri);
  if (!source?.uri || !/^https?:\/\//i.test(source.uri)) return false;
  try {
    const response = await fetch(source.uri, {
      method: 'HEAD', headers: source.headers || {}, cache: 'no-store',
    });
    return isRemovedMediaStatus(response.status);
  } catch (_) {
    return false;
  }
}

export default function HistoricalMediaImage({ uri, style, resizeMode = 'cover', onPress, accessibilityLabel }) {
  const [failed, setFailed] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { setFailed(false); setRemoved(false); setAttempt(0); }, [uri]);
  useEffect(() => {
    if (!failed) return undefined;
    let active = true;
    checkRemovedMedia(uri).then(value => { if (active) setRemoved(value); });
    return () => { active = false; };
  }, [failed, uri, attempt]);

  const retry = () => { setFailed(false); setRemoved(false); setAttempt(x => x + 1); };
  return <View style={[styles.frame, style]}>
    {!failed ? <TouchableOpacity disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel} onPress={onPress} style={styles.fill}>
      <Image key={`${uri}-${attempt}`} source={imageSource(uri)} resizeMode={resizeMode}
        onError={() => setFailed(true)} style={styles.fill} />
    </TouchableOpacity> : <View style={styles.fallback}>
      <MaterialCommunityIcons name={removed ? 'image-remove-outline' : 'image-off-outline'} size={30} color={C.muted} />
      <Text style={styles.message}>{removed ? 'به دلیل قدیمی بودن، تصویر حذف شده است' : 'بارگذاری تصویر ممکن نشد'}</Text>
      {!removed && <TouchableOpacity accessibilityRole="button" accessibilityLabel="تلاش دوباره برای دریافت تصویر"
        onPress={retry} style={styles.retry}><Text style={styles.retryText}>تلاش دوباره</Text></TouchableOpacity>}
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  frame: { width: '100%', overflow: 'hidden', borderRadius: 12, backgroundColor: '#f3f6f7' },
  fill: { width: '100%', height: '100%' },
  fallback: { flex: 1, minHeight: 140, alignItems: 'center', justifyContent: 'center', padding: 16, gap: 8 },
  message: { color: C.muted, fontFamily: FONT.regular, fontSize: 13, lineHeight: 22, textAlign: 'center' },
  retry: { minHeight: 48, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: C.brand },
  retryText: { fontFamily: FONT.bold, color: C.brand, fontSize: 13 },
});
