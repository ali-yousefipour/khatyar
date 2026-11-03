import React from 'react';
import { AppState, BackHandler, StyleSheet, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Emergency-style paired pulses across the whole display; short dark gaps
// make both white and amber flashes perceptible even on bright screens.
export const FLASH_SEQUENCE = ['#FFFFFF','#FFFFFF','#121212','#FFCA22','#FFCA22','#121212','#FFFFFF','#121212','#FFCA22','#121212'];
export const FLASH_FRAME_MS = 110;

// Screen-only warning light: no camera/torch access and no background flashing.
export default function ScreenFlasher({ onClose }) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => setPhase(value => (value + 1) % FLASH_SEQUENCE.length), FLASH_FRAME_MS);
    const appState = AppState.addEventListener('change', state => {
      if (state !== 'active') onClose();
    });
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => {
      clearInterval(interval);
      appState.remove();
      back.remove();
    };
  }, [onClose]);

  return (
    <View style={styles.root} accessibilityLabel="فلاشر سفید و زرد فعال است">
      <StatusBar hidden />
      <View style={[styles.panel, { backgroundColor: FLASH_SEQUENCE[phase] }]} />
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
