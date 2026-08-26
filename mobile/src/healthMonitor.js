import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Battery from 'expo-battery';
import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system';
import * as Network from 'expo-network';
import { request } from './api';
import { apiBase } from './config';

const QUEUE_KEY = '@khatyar:health_queue:v1';
const STATE_KEY = '@khatyar:health_state:v1';
const MAX_QUEUE = 30;
let timer = null;
let appStateSub = null;
let running = false;
let lastSentAt = 0;

const clampInterval = seconds => Math.max(120, Math.min(1800, Number(seconds) || 300));
const safe = async (fn, fallback = null) => { try { return await fn(); } catch (_) { return fallback; } };

async function probeApiLatency() {
  const started = Date.now();
  try {
    const base = apiBase().replace(/\/api\/?$/, '');
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(`${base}/api/health`, { method: 'GET', cache: 'no-store', signal: ctrl.signal });
    clearTimeout(id);
    return { ok: !!r.ok, latency_ms: Date.now() - started, status: r.status };
  } catch (_) {
    return { ok: false, latency_ms: Date.now() - started, status: 0 };
  }
}

async function collectSnapshot(reason = 'periodic') {
  const [batteryLevel, batteryState, lowPower, network, ip, freeDisk, totalDisk, apiProbe] = await Promise.all([
    safe(() => Battery.getBatteryLevelAsync(), -1),
    safe(() => Battery.getBatteryStateAsync(), Battery.BatteryState.UNKNOWN),
    safe(() => Battery.isLowPowerModeEnabledAsync(), false),
    safe(() => Network.getNetworkStateAsync(), {}),
    safe(() => Network.getIpAddressAsync(), null),
    safe(() => FileSystem.getFreeDiskStorageAsync(), null),
    safe(() => FileSystem.getTotalDiskCapacityAsync(), null),
    probeApiLatency(),
  ]);
  const now = new Date().toISOString();
  return {
    reason,
    captured_at: now,
    app_state: AppState.currentState || 'unknown',
    app_version: Application.nativeApplicationVersion || null,
    build_version: Application.nativeBuildVersion || null,
    android_sdk: Platform.OS === 'android' ? Number(Platform.Version) : null,
    manufacturer: Device.manufacturer || null,
    model_name: Device.modelName || null,
    device_name: Device.deviceName || null,
    total_memory_bytes: Number(Device.totalMemory || 0) || null,
    battery_level: batteryLevel >= 0 ? Math.round(batteryLevel * 100) : null,
    battery_state: Number(batteryState || 0),
    low_power_mode: !!lowPower,
    network_connected: !!network?.isConnected,
    internet_reachable: network?.isInternetReachable !== false,
    network_type: String(network?.type || 'unknown'),
    local_ip: ip,
    free_disk_bytes: Number(freeDisk || 0) || null,
    total_disk_bytes: Number(totalDisk || 0) || null,
    api_ok: apiProbe.ok,
    api_latency_ms: apiProbe.latency_ms,
    api_status: apiProbe.status,
    monitor_uptime_seconds: Math.max(0, Math.round((Date.now() - (global.__KHATYAR_HEALTH_STARTED_AT || Date.now())) / 1000)),
  };
}

async function readQueue() {
  try { const raw = await AsyncStorage.getItem(QUEUE_KEY); return raw ? JSON.parse(raw) : []; } catch (_) { return []; }
}
async function writeQueue(items) { await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUE))); }
async function enqueue(payload) { const q = await readQueue(); q.push(payload); await writeQueue(q); }

export async function flushHealthQueue() {
  const q = await readQueue();
  if (!q.length) return { sent: 0 };
  const left = []; let sent = 0;
  for (const item of q) {
    try { await request('/activity/device-health', { method: 'POST', body: item, noStore: true }); sent++; }
    catch (_) { left.push(item); }
  }
  await writeQueue(left);
  return { sent, pending: left.length };
}

export async function sendHealthSnapshot(reason = 'periodic', force = false) {
  if (running) return null;
  if (!force && Date.now() - lastSentAt < 90000) return null;
  running = true;
  try {
    const payload = await collectSnapshot(reason);
    try {
      await flushHealthQueue();
      const response = await request('/activity/device-health', { method: 'POST', body: payload, noStore: true });
      lastSentAt = Date.now();
      await AsyncStorage.setItem(STATE_KEY, JSON.stringify({ last_sent_at: payload.captured_at, last_payload: payload }));
      return response;
    } catch (_) {
      await enqueue(payload);
      return null;
    }
  } finally { running = false; }
}

export function startHealthMonitor({ intervalSeconds = 300 } = {}) {
  if (timer) return;
  global.__KHATYAR_HEALTH_STARTED_AT = global.__KHATYAR_HEALTH_STARTED_AT || Date.now();
  const ms = clampInterval(intervalSeconds) * 1000;
  sendHealthSnapshot('monitor_start', true).catch(() => {});
  timer = setInterval(() => sendHealthSnapshot('periodic').catch(() => {}), ms);
  appStateSub = AppState.addEventListener('change', state => {
    if (state === 'active') sendHealthSnapshot('app_foreground', true).catch(() => {});
    else if (state === 'background') sendHealthSnapshot('app_background', true).catch(() => {});
  });
}

export function stopHealthMonitor() {
  if (timer) clearInterval(timer);
  timer = null;
  try { appStateSub?.remove?.(); } catch (_) {}
  appStateSub = null;
}

export async function getLocalHealthState() {
  try { const raw = await AsyncStorage.getItem(STATE_KEY); return raw ? JSON.parse(raw) : null; } catch (_) { return null; }
}
