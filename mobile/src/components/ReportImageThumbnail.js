import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { imageSource } from '../api';
import { C, FONT } from '../theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ReportImageThumbnail({ item, onPress, style }) {
  const [useOriginal, setUseOriginal] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setUseOriginal(false); setFailed(false); }, [item.uri, item.thumbnailUri]);
  const active = useOriginal ? item.uri : (item.thumbnailUri || item.uri);
  const onError = () => {
    if (!useOriginal && active !== item.uri) setUseOriginal(true);
    else setFailed(true);
  };
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`نمایش کامل ${item.label || 'تصویر پیوست گزارش'}`}
    onPress={onPress} disabled={failed} style={[styles.touch, style]}>
    {!failed ? <Image source={imageSource(active)} onError={onError} resizeMode="cover" style={styles.image} />
      : <View style={styles.error}><MaterialCommunityIcons name="image-off-outline" size={26} color={C.muted}/><Text style={styles.errorText}>تصویر قابل نمایش نیست</Text></View>}
  </TouchableOpacity>;
}
const styles = StyleSheet.create({
  touch: { overflow:'hidden',borderRadius:12,backgroundColor:'#edf2f5',minHeight:104 },
  image: { width:'100%',height:'100%' },
  error: { flex:1,alignItems:'center',justifyContent:'center',padding:12,gap:5 },
  errorText: { fontFamily:FONT.regular,color:C.muted,fontSize:12,textAlign:'center' },
});
