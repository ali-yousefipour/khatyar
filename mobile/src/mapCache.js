/**
 * کش تایل‌های نقشهٔ مشهد با expo-file-system.
 * تایل‌ها به‌صورت فایل در پوشهٔ دائمی ذخیره می‌شوند.
 * در WebView با یک ServiceWorker-like injection بارگذاری می‌شوند.
 */
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TILE_DIR = FileSystem.documentDirectory + 'map_tiles/';
const CACHE_META_KEY = 'map_tiles_cached_v3';
const MASHHAD = { minLat: 36.20, maxLat: 36.40, minLng: 59.48, maxLng: 59.78 };

function latToY(lat, z) {
  const r = Math.PI / 180;
  return Math.floor((1 - Math.log(Math.tan(lat * r) + 1 / Math.cos(lat * r)) / Math.PI) / 2 * Math.pow(2, z));
}
function lngToX(lng, z) {
  return Math.floor((lng + 180) / 360 * Math.pow(2, z));
}

function tileUrlFor(provider, s, z, x, y, neshanKey) {
  switch (provider) {
    case 'google': return `https://mt1.google.com/vt/lyrs=m&x=${x}&y=${y}&z=${z}`;
    case 'neshan': return neshanKey ? `https://static.neshan.org/sdk/leaflet/1.4.0/standard-day/${z}/${x}/${y}.png` : `https://${s}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
    default: return `https://${s}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
  }
}

function getTileUrls(provider = 'osm', neshanKey = '') {
  const urls = []; const subs = ['a', 'b', 'c'];
  for (let z = 12; z <= 15; z++) {
    const x0 = lngToX(MASHHAD.minLng, z), x1 = lngToX(MASHHAD.maxLng, z);
    const y0 = latToY(MASHHAD.maxLat, z), y1 = latToY(MASHHAD.minLat, z);
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++) {
        const s = subs[(x + y) % 3];
        urls.push({ url: tileUrlFor(provider, s, z, x, y, neshanKey), z, x, y });
      }
  }
  return urls;
}

function tileFile(z, x, y) { return TILE_DIR + `${z}_${x}_${y}.png`; }

export async function getTileCacheMeta() {
  try { const d=await AsyncStorage.getItem(CACHE_META_KEY); return d?JSON.parse(d):null; } catch { return null; }
}

export async function isTileCached(provider = null) {
  try {
    const d = await AsyncStorage.getItem(CACHE_META_KEY);
    if (!d) return false;
    const meta = JSON.parse(d);
    return meta.at && (Date.now() - meta.at) < 14 * 24 * 3600 * 1000 && meta.count > 50 && (!provider || meta.provider === provider);
  } catch { return false; }
}

export async function cacheMashhadTiles(onProgress, provider = 'osm', neshanKey = '') {
  // ساخت پوشه
  const info = await FileSystem.getInfoAsync(TILE_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(TILE_DIR, { intermediates: true });
  const tiles = getTileUrls(provider, neshanKey);
  const total = tiles.length;
  let done = 0, saved = 0;
  for (const t of tiles) {
    const path = tileFile(t.z, t.x, t.y);
    // اگر قبلاً ذخیره شده، رد کن
    const fi = await FileSystem.getInfoAsync(path).catch(() => ({ exists: false }));
    if (!fi.exists) {
      try {
        await FileSystem.downloadAsync(t.url, path);
        saved++;
      } catch {}
    } else { saved++; }
    done++;
    onProgress && onProgress(done, total, saved);
    // هر ۲۰ تایل کوتاه صبر کن تا UI block نشود
    if (done % 20 === 0) await new Promise(r => setTimeout(r, 10));
  }
  await AsyncStorage.setItem(CACHE_META_KEY, JSON.stringify({ at: Date.now(), count: saved, provider }));
  return { total, saved };
}

// بازگرداندن base64 یک تایل از فایل محلی (برای inject در WebView)
export async function getLocalTileBase64(z, x, y) {
  try {
    const path = tileFile(z, x, y);
    const fi = await FileSystem.getInfoAsync(path).catch(() => ({ exists: false }));
    if (!fi.exists) return null;
    return await FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.Base64 });
  } catch { return null; }
}

// آدرس فایل محلی یک تایل (برای استفاده در WebView با allowFileAccess)
export function localTileUri(z, x, y) { return tileFile(z, x, y); }

export function tilesDirUri() { return TILE_DIR; }


export async function loadLocalTilesAround(lat, lng, zoom = 15, radius = 2) {
  const cx=lngToX(lng,zoom), cy=latToY(lat,zoom), out={};
  for(let dx=-radius;dx<=radius;dx++) for(let dy=-radius;dy<=radius;dy++){
    const x=cx+dx,y=cy+dy,key=`${zoom}_${x}_${y}`;
    const b64=await getLocalTileBase64(zoom,x,y);
    if(b64) out[key]=`data:image/png;base64,${b64}`;
  }
  return out;
}
