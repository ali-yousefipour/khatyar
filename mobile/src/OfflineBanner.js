import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Network from 'expo-network';
import { pending } from './offline';
import { flushQueuedRequests } from './api';
import { C, FONT } from './theme';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [queued, setQueued] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const syncTimer = useRef(null);
  const lastAttempt = useRef(0);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      let net;
      try {
        net = await Network.getNetworkStateAsync();
      } catch (_) {
        // اگر تشخیص وضعیت شبکه خطا بدهد، این چرخه را نادیده می‌گیریم اما
        // وضعیت قبلی نوار را دست‌نخورده رها می‌کنیم تا در چرخهٔ بعدی دوباره
        // تلاش شود؛ به‌جای اینکه کل tick() بدون به‌روزرسانی state متوقف شود.
        return;
      }
      if (!alive) return;
      const on = net.isInternetReachable !== true;
      setOffline(on);
      if (!on) {
        const before = (await pending()).length;
        if (before > 0 && Date.now() - lastAttempt.current > 60000) {
          lastAttempt.current = Date.now();
          syncTimer.current = setTimeout(() => { if (alive) setSyncing(true); }, 1500);
          try { await flushQueuedRequests(); }
          catch (_) { /* تلاش بعدی حداقل یک دقیقه بعد انجام می‌شود */ }
          finally {
            if (syncTimer.current) clearTimeout(syncTimer.current);
            syncTimer.current = null;
            if (alive) setSyncing(false);
          }
        }
      }
      if (alive) setQueued((await pending()).length);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => { alive = false; clearInterval(id); if (syncTimer.current) clearTimeout(syncTimer.current); };
  }, []);

  // در حالت آنلاین، باقی‌ماندن رکورد خطادار در صف نباید نوار زرد دائمی بسازد.
  if (!offline && !syncing) return null;
  return (
    <View style={[s.bar, offline ? s.off : s.sync]}>
      <Text style={s.txt}>
        {offline ? `حالت آفلاین است${queued > 0 ? `؛ ${queued} مورد در صف ارسال است` : ''}` : 'در حال همگام‌سازی…'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { padding: 6, alignItems: 'center' },
  off: { backgroundColor: C.danger },
  sync: { backgroundColor: C.taxi },
  txt: { color: '#fff', fontFamily: FONT.bold, fontSize: 12 },
});
