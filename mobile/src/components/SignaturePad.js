import React, { useRef, useState } from 'react';
import { View, PanResponder, TouchableOpacity, Text, StyleSheet } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { C, FONT } from '../theme';

// بلوک امضا: با انگشت رسم می‌شود (با نقطه‌های نزدیک به هم برای شبیه‌سازی خط)، و هنگام
// تمام‌شدن (تغییر فوکوس یا ثبت فرم) به‌صورت تصویر PNG (data URI) گرفته و برگردانده می‌شود.
export default function SignaturePad({ value, onChange, height = 160 }) {
  const [strokes, setStrokes] = useState([]); // آرایه‌ای از آرایه‌های نقطه {x,y}
  const currentRef = useRef([]);
  const shotRef = useRef(null);
  const capturedOnce = useRef(!!value);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        currentRef.current = [{ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY }];
        setStrokes((s) => [...s, currentRef.current]);
      },
      onPanResponderMove: (e) => {
        currentRef.current.push({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
        setStrokes((s) => { const next = [...s]; next[next.length - 1] = [...currentRef.current]; return next; });
      },
      onPanResponderRelease: () => { capture(); },
    })
  ).current;

  async function capture() {
    try {
      const uri = await captureRef(shotRef, { format: 'png', quality: 0.8, result: 'base64' });
      onChange('data:image/png;base64,' + uri);
      capturedOnce.current = true;
    } catch (e) { /* گرفتن تصویر امضا ناموفق بود؛ کاربر می‌تواند دوباره امضا کند */ }
  }

  function clear() {
    setStrokes([]); currentRef.current = []; onChange('');
  }

  return (
    <View>
      <ViewShot ref={shotRef} style={[s.pad, { height }]} {...panResponder.panHandlers}>
        {strokes.map((stroke, si) => stroke.map((p, pi) => (
          <View key={si + '-' + pi} style={{ position: 'absolute', left: p.x - 1.5, top: p.y - 1.5, width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.ink }} />
        )))}
        {!strokes.length && !value && <Text style={s.hint}>با انگشت خود این‌جا امضا کنید</Text>}
      </ViewShot>
      <View style={s.bar}>
        <TouchableOpacity onPress={clear}><Text style={s.clearTxt}>پاک کردن</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  pad: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 13, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, overflow: 'hidden' },
  hint: { position: 'absolute', top: '45%', width: '100%', textAlign: 'center', color: C.muted, fontFamily: FONT.regular, fontSize: 12 },
  bar: { flexDirection: 'row-reverse', justifyContent: 'flex-start', backgroundColor: '#fafbfe', borderColor: C.line, borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: 13, borderBottomRightRadius: 13, padding: 8 },
  clearTxt: { color: C.brand, fontFamily: FONT.bold, fontSize: 12.5 },
});
