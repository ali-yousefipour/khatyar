import React, { createContext, useContext, useEffect, useState } from 'react';
import { Text, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'fontScale';
let FONT_SCALE = 1;
export const getFontScale = () => FONT_SCALE;

// روش امن: به‌جای دست‌کاری رندر داخلی RN (که در نسخهٔ 0.74 باعث کرش می‌شود)،
// از allowFontScaling سیستمی استفاده می‌کنیم و مقیاس انتخابی کاربر را ذخیره می‌کنیم.
try {
  Text.defaultProps = Text.defaultProps || {};
  Text.defaultProps.allowFontScaling = true;
  TextInput.defaultProps = TextInput.defaultProps || {};
  TextInput.defaultProps.allowFontScaling = true;
} catch (e) {}

const Ctx = createContext({ scale: 1, setScale: () => {} });
export const useFontScale = () => useContext(Ctx);

export function FontScaleProvider({ children }) {
  const [scale, setScaleState] = useState(1);
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => { const s = parseFloat(v) || 1; FONT_SCALE = s; setScaleState(s); }).catch(() => {});
  }, []);
  const setScale = (s) => {
    s = Math.min(1.5, Math.max(0.85, s));
    FONT_SCALE = s; setScaleState(s);
    AsyncStorage.setItem(KEY, String(s)).catch(() => {});
  };
  return <Ctx.Provider value={{ scale, setScale }}>{children}</Ctx.Provider>;
}

// کمک‌کننده برای صفحاتی که می‌خواهند اندازهٔ فونت را اعمال کنند
export const scaled = (size) => Math.round(size * FONT_SCALE);
