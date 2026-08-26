import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
const LIGHT = { ink: '#0f1b2d', slate: '#1c2b40', paper: '#f4f6fb', card: '#fff', line: '#e4e9f2', muted: '#6b7890', brand: '#0d7a5f', brand2: '#0a5f4a', taxi: '#f6c324', danger: '#e23b54', ok: '#16a06a', taxiInk: '#5a4500', mode: 'light' };
const DARK = { ink: '#e7ecf5', slate: '#c3ccdb', paper: '#0e141f', card: '#18202e', line: '#2a3445', muted: '#8b97ad', brand: '#16a374', brand2: '#0d7a5f', taxi: '#f6c324', danger: '#f4566d', ok: '#2bbd84', taxiInk: '#3a2e00', mode: 'dark' };
const KEY = 'theme_mode';
const Ctx = createContext({ theme: LIGHT, mode: 'light', setMode: () => {}, toggle: () => {} });
export const useTheme = () => useContext(Ctx);
export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState('light');
  useEffect(() => { AsyncStorage.getItem(KEY).then((v) => { if (v === 'dark' || v === 'light') setModeState(v); }).catch(() => {}); }, []);
  const setMode = (m) => { setModeState(m); AsyncStorage.setItem(KEY, m).catch(() => {}); };
  const toggle = () => setMode(mode === 'dark' ? 'light' : 'dark');
  const theme = mode === 'dark' ? DARK : LIGHT;
  return <Ctx.Provider value={{ theme, mode, setMode, toggle }}>{children}</Ctx.Provider>;
}
export { LIGHT, DARK };
