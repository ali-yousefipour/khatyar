import { AppRegistry, Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Notifications from 'expo-notifications';
import { getTrackingPosition } from './location';
import { postOrQueue } from './api';
import { vpnStatus } from './device';

export async function headlessLocationRun() {
  try {
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
