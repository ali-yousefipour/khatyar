import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// دکمه‌های ثابت پایین صفحه (مثل «ارسال»/«ثبت») را با فاصلهٔ ایمن از نوار ناوبری
// گوشی (چه دکمه‌ای، چه حرکتی/gesture) قرار می‌دهد تا زیر آن پنهان یا کنارش
// خیلی چسبیده نشوند. روی گوشی‌هایی که نوار ناوبری ندارند هم حداقل فاصلهٔ
// معقول (۱۲ واحد) حفظ می‌شود.
export default function SafeBottomBar({ children, style, minPadding = 12, background }) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, minPadding);
  return (
    <View style={[styles.wrap, background ? { backgroundColor: background } : null, { paddingBottom: bottom }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 10 },
});
