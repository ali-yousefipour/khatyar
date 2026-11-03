import React from 'react';
import { Animated, AppState, BackHandler, StyleSheet, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Emergency-style paired pulses across the whole display; short dark gaps
// make both white and amber flashes perceptible even on bright screens.
export const FLASH_SEQUENCE = ['white','amber','white','amber'];
export const FLASH_FRAME_MS = 180;

// Screen-only warning light: no camera/torch access and no background flashing.
export default function ScreenFlasher({ onClose }) {
  const insets = useSafeAreaInsets();
  const amberOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Native-driver opacity pulses remain visible even while JS is busy.
    const pulse = toValue => Animated.timing(amberOpacity,{toValue,duration:FLASH_FRAME_MS,useNativeDriver:true});
    const animation = Animated.loop(Animated.sequence([
      pulse(1),Animated.delay(140),pulse(0),Animated.delay(110),
      pulse(1),Animated.delay(100),pulse(0),Animated.delay(250),
    ]));
    animation.start();
    const appState = AppState.addEventListener('change', state => {
      if (state !== 'active') onClose();
    });
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => {
      animation.stop();
      appState.remove();
      back.remove();
    };
  }, [amberOpacity,onClose]);

  return (
    <View style={styles.root} accessibilityLabel="فلاشر سفید و زرد فعال است">
      <StatusBar hidden />
      <View style={[styles.panel,{backgroundColor:'#FFFFFF'}]}/>
      <Animated.View pointerEvents="none" style={[styles.panel,{backgroundColor:'#FFCA22',opacity:amberOpacity}]}/>
      <TouchableOpacity
        style={[styles.close, { top: Math.max(insets.top, 12) + 8 }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="خاموش کردن فلاشر"
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="close" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', zIndex: 10000, elevation: 10000 },
  panel: { ...StyleSheet.absoluteFillObject },
  close: { position: 'absolute', right: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(19,27,35,0.92)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.75)' },
});
