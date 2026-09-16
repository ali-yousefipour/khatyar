import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { startAppCacheRetention } from './cacheRetention';
import { startOfflineQueueSync } from './offlineBootstrap';

const extra = Constants.expoConfig?.extra || {};
const BUILD_DEFAULT = extra.defaultApiBase || 'https://app.yousefipour.ir/api';
export const FEATURES = {
  ocr: extra.enableOcr !== false,
  bgTracking: extra.enableBgTracking !== false,
};

// کش محلی اپ مستقل از تنظیمات سرور است و همیشه پس از ۲۴ ساعت پاک می‌شود.
startAppCacheRetention();
// صف عملیات نوشتنی مستقل از UI است و با بازگشت اینترنت، ورود دوباره به اپ یا هر ۶۰ ثانیه تخلیه می‌شود.
startOfflineQueueSync();

let _base = BUILD_DEFAULT;
export async function loadApiBase() { const saved = await SecureStore.getItemAsync('api_base'); _base = saved || BUILD_DEFAULT; return _base; }
export async function setApiBase(url) { _base = url.replace(/\/$/, ''); await SecureStore.setItemAsync('api_base', _base); }
export async function isServerConfigured() { const saved = await SecureStore.getItemAsync('api_base'); return !!saved || !!BUILD_DEFAULT; }
export const apiBase = () => _base;
