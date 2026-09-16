import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { startAppCacheRetention } from './cacheRetention';

const extra = Constants.expoConfig?.extra || {};
const BUILD_DEFAULT = extra.defaultApiBase || 'https://app.yousefipour.ir/api';
export const FEATURES = {
  ocr: extra.enableOcr !== false,
  bgTracking: extra.enableBgTracking !== false,
};

// کش محلی اپ مستقل از تنظیمات سرور است و همیشه پس از ۲۴ ساعت پاک می‌شود.
startAppCacheRetention();

let _base = BUILD_DEFAULT;

// آدرس ذخیره‌شده (تنظیم‌شده توسط کاربر) اولویت دارد، سپس مقدار build
export async function loadApiBase() {
  const saved = await SecureStore.getItemAsync('api_base');
  _base = saved || BUILD_DEFAULT;
  return _base;
}
export async function setApiBase(url) {
  _base = url.replace(/\/$/, '');
  await SecureStore.setItemAsync('api_base', _base);
}
export async function isServerConfigured() {
  const saved = await SecureStore.getItemAsync('api_base');
  return !!saved || !!BUILD_DEFAULT;
}
export const apiBase = () => _base;
