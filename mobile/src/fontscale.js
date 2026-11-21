import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'fontScale';
let FONT_SCALE = 1;
export const getFontScale = () => FONT_SCALE;

// Native Text and TextInput must inherit Android accessibility font scaling.
// Do not mutate React Native defaultProps: it silently disables user font settings.
// The coordinate-based A5 payslip renderer explicitly opts out on its print nodes.
const Ctx = createContext({ scale: 1, setScale: () => {} });
export const useFontScale = () => useContext(Ctx);

export function FontScaleProvider({ children }) {
  const [scale, setScaleState] = useState(1);
  const changes = useRef(0);
  useEffect(() => {
    let mounted = true;
    const currentChange = changes.current;
    AsyncStorage.getItem(KEY).then((v) => {
      if (!mounted || changes.current !== currentChange) return;
      const parsed = Number.parseFloat(v);
      const next = Number.isFinite(parsed) ? Math.min(1.5, Math.max(0.85, parsed)) : 1;
      FONT_SCALE = next;
      setScaleState(next);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);
  const setScale = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    const next = Math.min(1.5, Math.max(0.85, parsed));
    changes.current += 1;
    FONT_SCALE = next;
    setScaleState(next);
    AsyncStorage.setItem(KEY, String(next)).catch(() => {});
  };
  return <Ctx.Provider value={{ scale, setScale }}>{children}</Ctx.Provider>;
}

// کمک‌کننده برای صفحاتی که می‌خواهند اندازهٔ فونت را اعمال کنند
export const scaled = (size) => Math.round(size * FONT_SCALE);
