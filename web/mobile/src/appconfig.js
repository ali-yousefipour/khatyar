import AsyncStorage from '@react-native-async-storage/async-storage';
import { request } from './api';
import { setImageConfig } from './img';
const KEY = 'app_config_v1';
let mem = null;
export async function getAppConfig(force = false) {
  if (mem && !force) return mem;
  try {
    const c = await request('/my/app-config');
    if (c && typeof c === 'object') { mem = c; setImageConfig(c); AsyncStorage.setItem(KEY, JSON.stringify(c)).catch(() => {}); return c; }
  } catch (e) {}
  try { const s = await AsyncStorage.getItem(KEY); if (s) { mem = JSON.parse(s); setImageConfig(mem); return mem; } } catch (e) {}
  return mem || {};
}
export function clearAppConfigCache() { mem = null; }
