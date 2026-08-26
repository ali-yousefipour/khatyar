import { Platform, InteractionManager } from 'react-native';

export const ANDROID_API = Platform.OS === 'android' ? Number(Platform.Version || 0) : 0;
export const IS_ANDROID_8_OR_9 = Platform.OS === 'android' && ANDROID_API >= 26 && ANDROID_API <= 28;
export const IS_ANDROID_10 = Platform.OS === 'android' && ANDROID_API === 29;
export const IS_LEGACY_ANDROID = Platform.OS === 'android' && ANDROID_API > 0 && ANDROID_API <= 29;

export function afterUiReady(task, delayMs = 1200) {
  let cancelled = false;
  const handle = InteractionManager.runAfterInteractions(() => {
    const timer = setTimeout(() => {
      if (!cancelled) Promise.resolve().then(task).catch(() => {});
    }, Math.max(0, Number(delayMs) || 0));
    handle.__timer = timer;
  });
  return () => {
    cancelled = true;
    try { handle.cancel?.(); } catch (_) {}
    try { if (handle.__timer) clearTimeout(handle.__timer); } catch (_) {}
  };
}

export async function requestBackgroundLocationCompat(Location) {
  if (Platform.OS !== 'android') return Location.requestBackgroundPermissionsAsync();
  // اندروید ۷ تا ۹ (API 24-28) مجوز جداگانهٔ ACCESS_BACKGROUND_LOCATION ندارند؛
  // این مجوز از اندروید ۱۰ (API 29) به بعد معرفی شده، پس پیش از آن مجوز foreground کافی است.
  if (ANDROID_API > 0 && ANDROID_API < 29) {
    const fg = await Location.getForegroundPermissionsAsync();
    return { ...fg, granted: !!fg?.granted, status: fg?.granted ? 'granted' : fg?.status };
  }
  return Location.requestBackgroundPermissionsAsync();
}
