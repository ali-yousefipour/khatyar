// مدیریت متمرکز صداهای برنامه با expo-audio سازگار با Expo SDK 57.
// این ماژول به‌صورت Fail-safe طراحی شده است؛ خطای صوتی هرگز عملکرد اصلی برنامه را متوقف نمی‌کند.
let AudioApi = null;
try {
  AudioApi = require('expo-audio');
} catch (_error) {
  AudioApi = null;
}

const SOUND_FILES = {
  presenceAlert: require('../assets/sounds/presence_validation_alert.mp3'),
  presenceSelfie: require('../assets/sounds/presence_selfie.mp3'),
  presenceStationPhoto: require('../assets/sounds/presence_station_photo.mp3'),
  presenceSuccess: require('../assets/sounds/presence_success.mp3'),
  notificationNew: require('../assets/sounds/notification_new.mp3'),
  messageNew: require('../assets/sounds/message_new.mp3'),
  reportReceived: require('../assets/sounds/report_received.mp3'),
  reportSentSuccess: require('../assets/sounds/report_sent_success.mp3'),
  officialPresenceRegistered: require('../assets/sounds/official_presence_registered.mp3'),
};

let currentOneShot = null;
let audioPrepared = false;
let cleanupTimer = null;

async function prepareAudio() {
  if (!AudioApi) return false;
  if (audioPrepared) return true;
  try {
    await AudioApi.setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers',
    });
    audioPrepared = true;
    return true;
  } catch (_error) {
    return false;
  }
}

function releasePlayer(player) {
  if (!player) return;
  try { player.pause(); } catch (_error) {}
  try { player.remove(); } catch (_error) {
    try { player.release(); } catch (_ignore) {}
  }
}

function clearCleanupTimer() {
  if (cleanupTimer) {
    clearTimeout(cleanupTimer);
    cleanupTimer = null;
  }
}

export async function playSound(name, opts = {}) {
  const source = SOUND_FILES[name];
  if (!AudioApi || !source || typeof AudioApi.createAudioPlayer !== 'function') return null;

  try {
    if (!(await prepareAudio())) return null;

    const looping = Boolean(opts.loop);
    const volume = typeof opts.volume === 'number'
      ? Math.max(0, Math.min(1, opts.volume))
      : 1;

    if (!looping && currentOneShot) {
      releasePlayer(currentOneShot);
      currentOneShot = null;
    }
    clearCleanupTimer();

    const player = AudioApi.createAudioPlayer(source, {
      updateInterval: 250,
      downloadFirst: true,
    });

    player.loop = looping;
    player.volume = volume;

    let subscription = null;
    if (!looping && typeof player.addListener === 'function') {
      subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (!status?.didJustFinish) return;
        try { subscription?.remove?.(); } catch (_error) {}
        releasePlayer(player);
        if (currentOneShot === player) currentOneShot = null;
        clearCleanupTimer();
      });
      currentOneShot = player;

      // پاک‌سازی ایمن در صورت صادر نشدن رویداد پایان پخش در بعضی دستگاه‌ها.
      cleanupTimer = setTimeout(() => {
        try { subscription?.remove?.(); } catch (_error) {}
        releasePlayer(player);
        if (currentOneShot === player) currentOneShot = null;
        cleanupTimer = null;
      }, 30000);
    }

    player.play();
    return player;
  } catch (_error) {
    // صدا یک قابلیت جانبی است؛ خطای آن نباید ارسال گزارش یا حضور را مختل کند.
    return null;
  }
}

export async function stopSound(player) {
  if (!player) return;
  clearCleanupTimer();
  releasePlayer(player);
  if (currentOneShot === player) currentOneShot = null;
}

export function normalizeNotificationData(data) {
  if (!data) return {};
  if (typeof data === 'object') return data;
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_error) {}
  }
  return {};
}

export function notificationSoundNameByType(type) {
  if (type === 'presence_check') return 'presence_validation_alert.mp3';
  if (type === 'message' || type === 'chat' || type === 'sms') return 'message_new.mp3';
  if (type === 'report' || type === 'inbox_report') return 'report_received.mp3';
  return 'notification_new.mp3';
}

export function soundKeyByNotification(title = '', body = '', data = {}) {
  const normalizedData = normalizeNotificationData(data);
  const type = normalizedData?.type || '';
  const text = `${String(title || '')} ${String(body || '')}`;
  if (type === 'presence_check') return 'presenceAlert';
  if (type === 'message' || type === 'chat' || type === 'sms' || /پیام/.test(text)) return 'messageNew';
  if (type === 'report' || type === 'inbox_report' || /گزارش/.test(text)) return 'reportReceived';
  return 'notificationNew';
}
