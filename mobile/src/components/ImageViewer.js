import React, { useEffect, useState } from 'react';
import { Modal, View, Image, TouchableOpacity, Text, StyleSheet, Dimensions, FlatList } from 'react-native';
import { imageSource } from '../api';

// پشتیبانی از دو حالت:
// ۱) تک‌تصویری قدیمی: <ImageViewer uri={...} visible={...} onClose={...} />
// ۲) گالری چندتصویری: <ImageViewer images={[{uri,label},...]} initialIndex={0} visible={...} onClose={...} />
export default function ImageViewer({ uri, images, initialIndex = 0, visible, onClose }) {
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
        <TouchableOpacity style={s.close} onPress={onClose}><Text style={s.closeTxt}>✕</Text></TouchableOpacity>
        {list.length > 1 && (
          <View style={s.counter}><Text style={s.counterTxt}>{safeIndex + 1} / {list.length}</Text></View>
        )}
        {!!current?.uri && <Image source={imageSource(current.uri)} style={s.img} resizeMode="contain" />}
        {!!current?.label && <Text style={s.label}>{current.label}</Text>}
        {list.length > 1 && (
          <>
            {safeIndex > 0 && (
              <TouchableOpacity style={[s.nav, s.navLeft]} onPress={() => setIndex(safeIndex - 1)}>
                <Text style={s.navTxt}>‹</Text>
              </TouchableOpacity>
            )}
            {safeIndex < list.length - 1 && (
              <TouchableOpacity style={[s.nav, s.navRight]} onPress={() => setIndex(safeIndex + 1)}>
                <Text style={s.navTxt}>›</Text>
              </TouchableOpacity>
            )}
            <FlatList
              horizontal
              inverted
              data={list}
              keyExtractor={(_, i) => String(i)}
              style={s.thumbRow}
              contentContainerStyle={{ paddingHorizontal: 10 }}
              renderItem={({ item, index: i }) => (
                <TouchableOpacity onPress={() => setIndex(i)} style={[s.thumbWrap, i === safeIndex && s.thumbActive]}>
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
const { width, height } = Dimensions.get('window');
const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  img: { width: width, height: height * 0.72 },
  label: { color: '#fff', fontSize: 13, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 },
  close: { position: 'absolute', top: 44, left: 20, zIndex: 5, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { color: '#fff', fontSize: 22, fontWeight: '700' },
  counter: { position: 'absolute', top: 44, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6, zIndex: 5 },
  counterTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  nav: { position: 'absolute', top: '42%', width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  navLeft: { left: 10 },
  navRight: { right: 10 },
  navTxt: { color: '#fff', fontSize: 28, fontWeight: '700', marginTop: -2 },
  thumbRow: { position: 'absolute', bottom: 26, width: '100%' },
  thumbWrap: { width: 54, height: 54, borderRadius: 10, marginHorizontal: 4, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  thumbActive: { borderColor: '#0d7a5f' },
  thumb: { width: '100%', height: '100%' },
});
