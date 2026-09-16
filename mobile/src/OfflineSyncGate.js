import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { flushQueuedRequests } from './api';

const FLUSH_INTERVAL_MS = 60 * 1000;

export default function OfflineSyncGate() {
  const runningRef = useRef(false);
  const flushNow = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    try { await flushQueuedRequests(); } catch (_) {}
    finally { runningRef.current = false; }
  };

  useEffect(() => {
    flushNow();
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state?.isConnected === true && state?.isInternetReachable !== false) flushNow();
    });
    const appSub = AppState.addEventListener('change', state => {
      if (state === 'active') flushNow();
    });
    const timer = setInterval(flushNow, FLUSH_INTERVAL_MS);
    return () => {
      try { unsubscribe(); } catch (_) {}
      try { appSub.remove(); } catch (_) {}
      clearInterval(timer);
    };
  }, []);

  return null;
}
