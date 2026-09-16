import * as FileSystem from 'expo-file-system/legacy';

// سیاست کش محلی خطیار مستقل از تنظیمات سرور است و همیشه ۲۴ ساعت است.
export const APP_CACHE_RETENTION_MS = 24 * 60 * 60 * 1000;

const safeDelete = async (uri) => {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch (_) {}
};

const cleanDirectory = async (uri, cutoff) => {
  let entries = [];
  try {
    entries = await FileSystem.readDirectoryAsync(uri);
  } catch (_) {
    return;
  }

  for (const name of entries) {
    const child = `${uri.replace(/\/$/, '')}/${name}`;
    let info;
    try {
      info = await FileSystem.getInfoAsync(child);
    } catch (_) {
      continue;
    }
    if (!info?.exists) continue;

    if (info.isDirectory) {
      await cleanDirectory(child, cutoff);
      let children = [];
      try { children = await FileSystem.readDirectoryAsync(child); } catch (_) { children = ['_keep_']; }
      if (children.length === 0) await safeDelete(child);
      continue;
    }

    const modified = Number(info.modificationTime || info.modificationTimeMs || 0);
    if (modified > 0 && modified < cutoff) await safeDelete(child);
  }
};

export async function purgeExpiredAppCache() {
  const root = FileSystem.cacheDirectory;
  if (!root) return;
  const cutoff = Date.now() - APP_CACHE_RETENTION_MS;
  await cleanDirectory(root, cutoff);
}

export function startAppCacheRetention() {
  let stopped = false;
  const run = () => {
    if (stopped) return;
    purgeExpiredAppCache().catch(() => {});
  };
  run();
  const timer = setInterval(run, 6 * 60 * 60 * 1000);
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}
