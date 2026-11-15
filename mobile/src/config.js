import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { startAppCacheRetention } from './cacheRetention';
import { startOfflineQueueSync } from './offlineBootstrap';

const extra = Constants.expoConfig?.extra || {};
const BUILD_DEFAULT = 'https://khat-yar.ir/api';
export const FEATURES = {
  bgTracking: extra.enableBgTracking !== false,
};

// کش محلی اپ مستقل از تنظیمات سرور است و همیشه پس از ۲۴ ساعت پاک می‌شود.
startAppCacheRetention();
// صف عملیات نوشتنی مستقل از UI است و با بازگشت اینترنت، ورود دوباره به اپ یا هر ۶۰ ثانیه تخلیه می‌شود.
startOfflineQueueSync();

let _base = BUILD_DEFAULT;
export async function loadApiBase() { _base = BUILD_DEFAULT; await SecureStore.deleteItemAsync('api_base').catch(()=>{}); return _base; }
export async function setApiBase(url) { const candidate = String(url || '').replace(/\/$/, ''); if (candidate !== BUILD_DEFAULT) throw new Error('نشانی سرور در این نسخه ثابت است.'); _base = BUILD_DEFAULT; }
export async function isServerConfigured() { return true; }
export const apiBase = () => _base;
