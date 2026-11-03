import React from 'react';
import { AppState, NativeModules } from 'react-native';
import { request } from './api';

const nativePolicy = NativeModules.KhatyarScreenPolicy;
const REFRESH_MS = 15_000;

// Kept outside the navigation/lock tree: policy applies to login, lock,
// modal, dashboard and all other Activity content, including while locked.
export default function ScreenCapturePolicy() {
  React.useEffect(() => {
    let active = true;
    let inFlight = false;
    const sync = async () => {
      if (inFlight) return;
      if (!nativePolicy?.setBlocked) {
        // Fail visibly during development instead of silently ignoring an
        // enabled server policy because the native package was not built in.
        if (__DEV__) console.warn('KhatyarScreenPolicy native module is missing: rebuild the Android APK');
        return;
      }
      inFlight = true;
      try {
        const config = await request('/app/screenshot-policy', {
          auth:false, noStore:true, queueIfOffline:false, timeoutMs:8000,
        });
        if (active && typeof config?.block_screenshots === 'boolean')
          await nativePolicy.setBlocked(config.block_screenshots);
      } catch (_) {
        // Keep the last native persisted policy when offline or unreachable.
      } finally { inFlight = false; }
    };
    sync();
    const timer = setInterval(sync,REFRESH_MS);
    const state = AppState.addEventListener('change',value=>{if(value==='active')sync()});
    return () => { active = false; clearInterval(timer); state.remove() };
  }, []);
  return null;
}
