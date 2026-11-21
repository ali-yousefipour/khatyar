import React, { useEffect, useState } from 'react';
import { Modal, View, Image, TouchableOpacity, Text, StyleSheet, FlatList, useWindowDimensions } from 'react-native';
import { imageSource } from '../api';
import HistoricalMediaImage from './HistoricalMediaImage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// پشتیبانی از دو حالت:
// ۱) تک‌تصویری قدیمی: <ImageViewer uri={...} visible={...} onClose={...} />
// ۲) گالری چندتصویری: <ImageViewer images={[{uri,label},...]} initialIndex={0} visible={...} onClose={...} />
export default function ImageViewer({ uri, images, initialIndex = 0, visible, onClose }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const topSafe = Math.max(12, insets.top + 8);
  const bottomSafe = Math.max(12, insets.bottom + 8);
  const list = (Array.isArray(images) && images.length > 0)
    ? images
    : (uri ? [{ uri, label: null }] : []);
  const [index, setIndex] = useState(initialIndex || 0);
  useEffect(() => { if (visible) setIndex(initialIndex || 0); }, [visible, initialIndex]);
  if (!list.length) return null;
  const safeIndex = Math.min(Math.max(0, index), list.length - 1);
  const current = list[safeIndex];
  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.bg}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="بستن نمایشگر تصویر" style={[s.close,{top:topSafe}]} onPress={onClose}><Text style={s.closeTxt}>✕</Text></TouchableOpacity>
        {list.length > 1 && (
          <View style={[s.counter,{top:topSafe+7}]}><Text allowFontScaling style={s.counterTxt}>{safeIndex + 1} / {list.length}</Text></View>
        )}
        {!!current?.uri && <HistoricalMediaImage uri={current.uri} style={[s.img,{width,height:height*.72}]} resizeMode="contain" />}
        {!!current?.label && <Text allowFontScaling style={s.label}>{current.label}</Text>}
        {list.length > 1 && (
          <>
            {safeIndex > 0 && (
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="تصویر قبلی" style={[s.nav, s.navLeft]} onPress={() => setIndex(safeIndex - 1)}>
                <Text style={s.navTxt}>‹</Text>
              </TouchableOpacity>
            )}
            {safeIndex < list.length - 1 && (
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="تصویر بعدی" style={[s.nav, s.navRight]} onPress={() => setIndex(safeIndex + 1)}>
                <Text style={s.navTxt}>›</Text>
              </TouchableOpacity>
            )}
            <FlatList
              horizontal
              inverted
              data={list}
              keyExtractor={(_, i) => String(i)}
              style={[s.thumbRow,{bottom:bottomSafe}]}
              contentContainerStyle={{ paddingHorizontal: 10 }}
              renderItem={({ item, index: i }) => (
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={`نمایش تصویر ${i+1}`} accessibilityState={{selected:i===safeIndex}} onPress={() => setIndex(i)} style={[s.thumbWrap, i === safeIndex && s.thumbActive]}>
                  <Image source={imageSource(item.thumbnailUri || item.uri)} style={s.thumb} resizeMode="cover" />
                </TouchableOpacity>
              )}
            />
          </>
        )}
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  img: { maxWidth:'100%' },
  label: { color: '#fff', fontSize: 13, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 },
  close: { position: 'absolute', left: 20, zIndex: 5, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { color: '#fff', fontSize: 22, fontWeight: '700' },
  counter: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6, zIndex: 5 },
  counterTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  nav: { position: 'absolute', top: '42%', minWidth: 48, minHeight: 48, width: 48, height: 48, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  navLeft: { left: 10 },
  navRight: { right: 10 },
  navTxt: { color: '#fff', fontSize: 28, fontWeight: '700', marginTop: -2 },
  thumbRow: { position: 'absolute', width: '100%' },
  thumbWrap: { width: 54, height: 54, borderRadius: 10, marginHorizontal: 4, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  thumbActive: { borderColor: '#0d7a5f' },
  thumb: { width: '100%', height: '100%' },
});
