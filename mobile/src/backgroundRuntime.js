import { AppRegistry, Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Notifications from 'expo-notifications';
import { getTrackingPosition } from './location';
import { postOrQueue, request } from './api';
import { vpnStatus } from './device';
import * as Location from 'expo-location';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const GPS_WORK_WATCHDOG_MINUTES = 30;

export async function headlessLocationRun() {
  try {
    // این task برای نگهبانی GPS کارکرد است و فقط وقتی حضور باز و تنظیم الزام GPS فعال باشد عمل می‌کند.
    let timer=null;
    try { timer=await request('/my/work-timer',{noStore:true,timeoutMs:7000}); } catch (_) {}
    const gpsRequired=!!timer?.gps_work_required;
    const open=!!timer?.open;
    if (gpsRequired && open) {
      let enabled=true;
      try { enabled=await Location.hasServicesEnabledAsync(); } catch (_) {}
      const at=new Date().toISOString();
      await postOrQueue('/activity/telemetry',{kind:enabled?'gps_on':'gps_off',at,meta:{source:'background_watchdog',interval_minutes:GPS_WORK_WATCHDOG_MINUTES}}).catch(()=>{});
      if (!enabled) {
        try {
          await setAudioModeAsync({shouldPlayInBackground:true,playsInSilentMode:true});
          const player=createAudioPlayer(require('../assets/gpsoff.mp3'));
          player.play();
          setTimeout(()=>{try{player.remove()}catch{}},15000);
        } catch (_) {}
      }
    }
    const p = await getTrackingPosition();
    if (!p) return;
    let vpn = { on: false, country: null };
    try { vpn = await vpnStatus(); } catch (_) {}
    await postOrQueue('/locations', { vpn_on: !!vpn.on, vpn_country: vpn.country || null, pings: [{ lat:p.lat, lng:p.lng, accuracy:p.acc, via_gsm:!!p.viaGsm, captured_at:new Date(p.ts || Date.now()).toISOString() }] });
  } catch (_) {}
}

AppRegistry.registerHeadlessTask('KhatyarHeadlessLocation', () => headlessLocationRun);

export async function prepareAndroidBackgroundRuntime() {
  if (Platform.OS !== 'android') return;
  try { await Notifications.requestPermissionsAsync(); } catch (_) {}
}

export async function openBatteryOptimizationSettings() {
  if (Platform.OS !== 'android') return false;
  try {
    await IntentLauncher.startActivityAsync('android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS', { data: 'package:ir.mashhad.taxicontrol' });
    return true;
  } catch (_) {
    try { await IntentLauncher.startActivityAsync('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS'); return true; } catch (_) { return false; }
  }
}
