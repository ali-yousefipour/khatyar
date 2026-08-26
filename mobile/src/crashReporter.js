import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

const STORAGE_KEY = 'khatyar:crash-reports:v1';
const MAX_REPORTS = 20;
let installed = false;
let currentRoute = 'startup';
let lastApi = null;

function makeId() {
  const d = new Date();
  const stamp = d.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `CR-${stamp}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
}
function asText(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v); } catch (_) { return String(v); }
}
async function readAll() {
  try { return JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) || '[]'); } catch (_) { return []; }
}
async function writeAll(items) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_REPORTS)));
}
export function setCurrentRoute(name) { currentRoute = name || currentRoute; }
export function setLastApi(info) { lastApi = info || null; }

export async function captureCrash(error, extra = {}) {
  try {
    const report = {
      id: makeId(),
      created_at: new Date().toISOString(),
      type: extra.type || 'javascript',
      fatal: Boolean(extra.fatal),
      message: error?.message || asText(error) || 'Unknown error',
      name: error?.name || 'Error',
      stack: error?.stack || '',
      component_stack: extra.componentStack || '',
      route: extra.route || currentRoute,
      last_api: extra.lastApi || lastApi,
      app_version: Application.nativeApplicationVersion || null,
      build_version: Application.nativeBuildVersion || null,
      android_version: String(Platform.Version),
      platform: Platform.OS,
      device_name: Device.deviceName || null,
      device_model: Device.modelName || null,
      manufacturer: Device.manufacturer || null,
      is_device: Device.isDevice,
      sent_at: null,
      send_error: null,
    };
    const items = await readAll();
    await writeAll([report, ...items.filter(x => x.id !== report.id)]);
    return report;
  } catch (_) { return null; }
}

export async function getCrashReports() { return readAll(); }
export async function getPendingCrashReport() {
  const items = await readAll();
  return items.find(x => !x.sent_at) || items[0] || null;
}
export async function deleteCrashReport(id) {
  const items = await readAll();
  await writeAll(items.filter(x => x.id !== id));
}
export function formatCrashReport(r) {
  if (!r) return '';
  return [
    `شناسه خطا: ${r.id}`,
    `زمان: ${r.created_at}`,
    `نوع: ${r.type}${r.fatal ? ' (Fatal)' : ''}`,
    `نسخه برنامه: ${r.app_version || '-'} (${r.build_version || '-'})`,
    `اندروید: ${r.android_version || '-'}`,
    `دستگاه: ${[r.manufacturer, r.device_model].filter(Boolean).join(' ') || '-'}`,
    `صفحه: ${r.route || '-'}`,
    `آخرین API: ${r.last_api ? asText(r.last_api) : '-'}`,
    `پیام: ${r.message || '-'}`,
    '',
    r.stack || '',
    r.component_stack || '',
  ].join('\n');
}
export async function copyCrashReport(r) { await Clipboard.setStringAsync(formatCrashReport(r)); }
export async function shareCrashReport(r) {
  if (!(await Sharing.isAvailableAsync())) return false;
  const FileSystem = require('expo-file-system');
  const dir = FileSystem.cacheDirectory || FileSystem.Paths?.cache?.uri;
  if (!dir) return false;
  const uri = `${dir}${r.id}.txt`;
  await FileSystem.writeAsStringAsync(uri, formatCrashReport(r));
  await Sharing.shareAsync(uri, { mimeType: 'text/plain', dialogTitle: 'ارسال گزارش خطا' });
  return true;
}
export async function sendCrashReport(r) {
  try {
    const { request } = require('./api');
    const out = await request('/crash-reports', { method: 'POST', body: r });
    const items = await readAll();
    await writeAll(items.map(x => x.id === r.id ? { ...x, sent_at: new Date().toISOString(), send_error: null } : x));
    return out;
  } catch (e) {
    const items = await readAll();
    await writeAll(items.map(x => x.id === r.id ? { ...x, send_error: e?.message || String(e) } : x));
    throw e;
  }
}
export async function flushCrashReports() {
  const items = await readAll();
  for (const r of items.filter(x => !x.sent_at).slice(0, 5)) {
    try { await sendCrashReport(r); } catch (_) { break; }
  }
}
export function installGlobalCrashHandlers() {
  if (installed) return;
  installed = true;
  try {
    const previous = global.ErrorUtils?.getGlobalHandler?.();
    global.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
      captureCrash(error, { type: 'global-js', fatal: isFatal }).finally(() => {
        try { previous?.(error, isFatal); } catch (_) {}
      });
    });
  } catch (_) {}
  try {
    const previousUnhandled = global.onunhandledrejection;
    global.onunhandledrejection = (event) => {
      const reason = event?.reason || event;
      captureCrash(reason instanceof Error ? reason : new Error(asText(reason)), { type: 'unhandled-promise' });
      try { previousUnhandled?.(event); } catch (_) {}
    };
  } catch (_) {}
}
