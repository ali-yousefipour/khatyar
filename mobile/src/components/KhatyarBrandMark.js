import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

// The brand artwork is sourced directly from the shipped Android app icon.
// This avoids divergent or AI-generated interpretations of the Khatyar logo.
export default function KhatyarBrandMark({ size = 40 }) {
  return (
    <View style={[styles.frame, { width: size, height: size, borderRadius: Math.round(size * 0.27) }]}>
      <Image source={require('../../assets/icon.png')} style={styles.image} resizeMode="cover" accessibilityLabel="نشان اصلی خطیار" />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  image: { width: '100%', height: '100%' },
});
