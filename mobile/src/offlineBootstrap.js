import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';

let started = false;
let running = false;
const INTERVAL_MS = 60 * 1000;

export function startOfflineQueueSync() {
  if (started) return;
  started = true;
  const flush = async () => {
    if (running) return;
    running = true;
    try {
      const { flushQueuedRequests } = await import('./api');
      await flushQueuedRequests();
    } catch (_) {}
    finally { running = false; }
  };
  flush();
  const netSub = NetInfo.addEventListener(state => {
    if (state?.isConnected === true && state?.isInternetReachable !== false) flush();
  });
  const appSub = AppState.addEventListener('change', state => { if (state === 'active') flush(); });
  setInterval(flush, INTERVAL_MS);
  // Listenerها عمداً تا پایان عمر process فعال می‌مانند؛ این ماژول singleton است.
  void netSub; void appSub;
}
