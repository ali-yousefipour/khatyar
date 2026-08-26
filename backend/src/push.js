import { q } from './db.js';

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';

function pushSoundAndChannel(data = {}) {
  const type = data?.type || '';
  if (type === 'presence_check') return { sound: 'presence_validation_alert.mp3', channelId: 'presence_alarm', priority: 'high' };
  if (type === 'message' || type === 'chat' || type === 'sms') return { sound: 'message_new.mp3', channelId: 'messages', priority: 'high' };
  if (type === 'report' || type === 'inbox_report') return { sound: 'report_received.mp3', channelId: 'reports', priority: 'high' };
  return { sound: 'notification_new.mp3', channelId: 'default', priority: 'high' };
}

// ارسال Push از طریق سرویس Expo
export async function sendExpoPush(tokens, title, body, data = {}) {
  const valid = tokens.filter(t => t && t.startsWith('ExponentPushToken'));
  if (!valid.length) return;
  const sx = pushSoundAndChannel(data);
  const messages = valid.map(to => ({ to, title, body, data, ...sx }));
  try {
    await fetch(EXPO_PUSH, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.error('Expo push error:', e.message);
  }
}

// ساخت نوتیفیکیشن درون‌برنامه‌ای + ارسال Push برای چند کاربر
export async function notifyUsers(userIds, title, body, data = {}) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return;
  for (const uid of ids)
    await q(`INSERT INTO notifications(user_id,title,body,data) VALUES ($1,$2,$3,$4)`,
      [uid, title, body, JSON.stringify(data)]);
  const { rows } = await q(`SELECT token FROM push_tokens WHERE user_id = ANY($1)`, [ids]);
  await sendExpoPush(rows.map(r => r.token), title, body, data);
}
