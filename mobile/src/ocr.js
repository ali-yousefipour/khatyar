import * as FileSystem from 'expo-file-system/legacy';
import { request } from './api';
// بارگذاری امن ماژول OCR (بومی). اگر در بیلد موجود نباشد، اپ کرش نمی‌کند
// و فقط قابلیت اسکن دوربین غیرفعال می‌شود.
let TextRecognition = null;
function getOCR() {
  if (TextRecognition) return TextRecognition;
  try {
    const mod = require('@react-native-ml-kit/text-recognition');
    TextRecognition = mod.default || mod;
  } catch (e) { TextRecognition = null; }
  return TextRecognition;
}

// تبدیل ارقام فارسی/عربی به لاتین + یکدست‌سازی حروف عربی به فارسی
const FA = '۰۱۲۳۴۵۶۷۸۹', AR = '٠١٢٣٤٥٦٧٨٩';
export function normalizeDigits(s = '') {
  return String(s || '')
    .replace(/[۰-۹]/g, d => String(FA.indexOf(d)))
    .replace(/[٠-٩]/g, d => String(AR.indexOf(d)))
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک');
}

export function digitsOnly(s = '') {
  return normalizeDigits(s).replace(/[^0-9]/g, '');
}

// اعتبارسنجی کد ملی ایران (الگوریتم رسمی)
export function isValidNationalId(code) {
  if (!/^\d{10}$/.test(code)) return false;
  if (/^(\d)\1{9}$/.test(code)) return false;
  const check = +code[9];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += +code[i] * (10 - i);
  const r = sum % 11;
  return r < 2 ? check === r : check === 11 - r;
}

// استخراج کد ملی از متن: نخستین دنبالهٔ ۱۰ رقمی معتبر (با حذف فاصله/خط تیره میان ارقام)
export function extractNationalId(text) {
  const raw = normalizeDigits(text);
  const candidates = [];

  // رشته‌های ده‌رقمی مستقیم یا با فاصله/خط تیره میان ارقام
  const flexible = raw.match(/(?:\d[\s\-–_.]*){10}/g) || [];
  for (const part of flexible) {
    const d = digitsOnly(part);
    if (d.length === 10) candidates.push(d);
  }

  // توکن‌های عددی مجاور؛ OCR گاهی کد ملی را به ۲ یا ۳ قطعه می‌شکند.
  const tokens = (raw.match(/\d+/g) || []).filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    let joined = '';
    for (let j = i; j < Math.min(tokens.length, i + 5); j++) {
      joined += tokens[j];
      if (joined.length === 10) candidates.push(joined);
      if (joined.length > 10) break;
    }
  }

  // تمام دنباله‌های ده‌رقمی از متن فشرده، به‌عنوان آخرین راهکار.
  const compact = digitsOnly(raw);
  for (let i = 0; i <= compact.length - 10; i++) candidates.push(compact.slice(i, i + 10));

  const unique = [...new Set(candidates)];
  for (const c of unique) if (isValidNationalId(c)) return c;
  // فقط در صورتی که دقیقاً یک نامزد ده‌رقمی وجود دارد، همان را برگردان؛
  // از چسباندن تاریخ تولد، شماره سریال و سایر اعداد جلوگیری می‌شود.
  return unique.length === 1 ? unique[0] : null;
}

export function buildTaxiPlate12(twoDigits, threeDigits) {
  const a = digitsOnly(twoDigits).slice(0, 2);
  const c = digitsOnly(threeDigits).slice(0, 3);
  if (a.length !== 2 || c.length !== 3) return null;
  return `${a}ت${c}-12`;
}

function scorePlateCandidate(text, idx, len) {
  const around = normalizeDigits(text).slice(Math.max(0, idx - 16), idx + len + 16);
  let score = 0;
  if (/ت/.test(around)) score += 3;
  if (/12|۱۲|١٢/.test(around)) score += 2;
  if (/ایران|IR|I\.R/i.test(around)) score += 1;
  return score;
}

// استخراج پلاک تاکسی مشهد: تمام پلاک‌ها «ت» و منطقه «۱۲» هستند؛ فقط ۲ رقم اول و ۳ رقم وسط خوانده می‌شود.
// خروجی نمونه: 72ت575-12
export function extractTaxiPlate12(text) {
  const raw = String(text || '');
  let t = normalizeDigits(raw)
    .replace(/[۰-۹٠-٩]/g, '')
    .replace(/[|:؛،,.;_]/g, ' ')
    .replace(/ایران|IR|I\.R/gi, ' ')
    .replace(/ك/g, 'ک')
    .replace(/\s+/g, ' ');

  const compact = t.replace(/[^0-9ت]/g, '');

  // حالت دقیق: ۲ رقم + ت + ۳ رقم + ۱۲
  let m = compact.match(/(\d{2})ت(\d{3})12/);
  if (m) return { plate: buildTaxiPlate12(m[1], m[2]), digits2: m[1], digits3: m[2], confidence: 0.98, source: 'fixed_t_exact_region' };

  // حالت دقیق بدون منطقه یا با OCR ناقص منطقه
  m = compact.match(/(\d{2})ت(\d{3})/);
  if (m) return { plate: buildTaxiPlate12(m[1], m[2]), digits2: m[1], digits3: m[2], confidence: 0.94, source: 'fixed_t_exact' };

  // حالت معکوس OCR: ۱۲ + ۳ رقم + ت + ۲ رقم
  m = compact.match(/12(\d{3})ت(\d{2})/);
  if (m) return { plate: buildTaxiPlate12(m[2], m[1]), digits2: m[2], digits3: m[1], confidence: 0.90, source: 'rtl_region_first' };

  // حالت عددی: منطقه ۱۲ حذف می‌شود؛ میان ارقام باید ۵ رقم پلاک باقی بماند.
  const digits = digitsOnly(raw);
  const candidates = [];
  if (digits.length >= 7) {
    for (let i = 0; i <= digits.length - 7; i++) {
      const chunk = digits.slice(i, i + 7);
      if (chunk.slice(5) === '12') candidates.push({ d: chunk.slice(0, 5), score: 2, idx: i, len: 7 });
      if (chunk.slice(0, 2) === '12') candidates.push({ d: chunk.slice(2, 7), score: 1, idx: i, len: 7 });
    }
  }
  if (digits.length >= 5) {
    for (let i = 0; i <= digits.length - 5; i++) candidates.push({ d: digits.slice(i, i + 5), score: 0, idx: i, len: 5 });
  }
  if (candidates.length) {
    candidates.sort((a, b) => {
      const sa = a.score + scorePlateCandidate(raw, a.idx, a.len);
      const sb = b.score + scorePlateCandidate(raw, b.idx, b.len);
      return sb - sa;
    });
    const best = candidates[0].d;
    return {
      plate: buildTaxiPlate12(best.slice(0, 2), best.slice(2, 5)),
      digits2: best.slice(0, 2),
      digits3: best.slice(2, 5),
      confidence: candidates[0].score >= 2 ? 0.80 : 0.62,
      source: 'digits_only_candidate'
    };
  }
  return null;
}

// استخراج پلاک عمومی قبلی؛ برای سازگاری نگه داشته شده ولی اولویت با پلاک تاکسی ۱۲/ت است.
export function extractPlate(text) {
  const fixed = extractTaxiPlate12(text);
  if (fixed?.plate) return fixed.plate;
  let t = normalizeDigits(text).replace(/ایران/g, ' ').replace(/[|]/g, '');
  t = t.replace(/[^\dآ-یءئ\s\-–]/g, ' ').replace(/\s+/g, ' ');
  let m = t.match(/(\d{2})\s*([آ-یءئ])\s*(\d{3})\s*[-–]?\s*(\d{2})/);
  if (m) return `${m[1]}${m[2]}${m[3]}-${m[4]}`;
  m = t.match(/(\d{2})\s*[-–]?\s*(\d{3})\s*([آ-یءئ])\s*(\d{2})/);
  if (m) return `${m[4]}${m[3]}${m[2]}-${m[1]}`;
  m = t.replace(/\s+/g, '').match(/(\d{2})([آ-یءئ])(\d{3})(\d{2})/);
  if (m) return `${m[1]}${m[2]}${m[3]}-${m[4]}`;
  return null;
}

// اجرای OCR روی تصویر گرفته‌شده و تشخیص نوع
export async function scanImage(uri, preferredKind = 'auto') {
  const OCR = getOCR();
  if (!OCR || typeof OCR.recognize !== 'function') {
    throw new Error('قابلیت اسکن در این نسخه از برنامه فعال نیست. لطفاً اطلاعات را دستی وارد کنید.');
  }
  const result = await OCR.recognize(uri);
  const text = result?.text || '';
  if (preferredKind === 'plate') {
    const fixed = extractTaxiPlate12(text);
    if (fixed?.plate) return { kind: 'plate', value: fixed.plate, digits2: fixed.digits2, digits3: fixed.digits3, confidence: fixed.confidence, source: fixed.source, raw: text };
    return { kind: 'none', value: null, raw: text };
  }
  if (preferredKind === 'national_id') {
    const nid = extractNationalId(text);
    if (nid) return { kind: 'national_id', value: nid, raw: text };
    return { kind: 'none', value: null, raw: text };
  }
  const fixed = extractTaxiPlate12(text);
  if (fixed?.plate) return { kind: 'plate', value: fixed.plate, digits2: fixed.digits2, digits3: fixed.digits3, confidence: fixed.confidence, source: fixed.source, raw: text };
  const nid = extractNationalId(text);
  if (nid) return { kind: 'national_id', value: nid, raw: text };
  return { kind: 'none', value: null, raw: text };
}

async function cloudRecognize(uri, preferredKind) {
  const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const r = await request('/plate-ocr/cloud', {
    method: 'POST',
    body: { kind: preferredKind, image_base64: b64 },
    noStore: true,
  });
  const text = String(r?.text || '');
  if (preferredKind === 'plate') {
    const fixed = extractTaxiPlate12(text);
    if (fixed?.plate) return { kind: 'plate', value: fixed.plate, digits2: fixed.digits2, digits3: fixed.digits3, confidence: Math.max(0.72, fixed.confidence || 0), source: `cloud_${r?.provider || 'ocr'}`, raw: text };
  } else if (preferredKind === 'national_id') {
    const nid = extractNationalId(text);
    if (nid) return { kind: 'national_id', value: nid, confidence: 0.82, source: `cloud_${r?.provider || 'ocr'}`, raw: text };
  }
  return { kind: 'none', value: null, confidence: 0, source: `cloud_${r?.provider || 'ocr'}`, raw: text };
}

// چند برش از همان عکس ابتدا روی خود گوشی خوانده می‌شوند. فقط اگر هیچ نتیجه‌ای
// پیدا نشود، OCR ابریِ فعال‌شده در پنل به‌عنوان fallback اجرا می‌شود.
export async function scanImageCandidates(uris, preferredKind = 'auto', allowCloudFallback = true) {
  const list = [...new Set((Array.isArray(uris) ? uris : [uris]).filter(Boolean))];
  let bestNone = null;
  let ocrUnavailable = false;
  for (const uri of list) {
    try {
      const r = await scanImage(uri, preferredKind);
      if (r?.value) return r;
      if (!bestNone || String(r?.raw || '').length > String(bestNone?.raw || '').length) bestNone = r;
    } catch (e) {
      if (/فعال نیست/.test(String(e?.message || ''))) ocrUnavailable = true;
      bestNone = bestNone || { kind: 'none', value: null, raw: e?.message || '', source: 'local_ocr_error', confidence: 0 };
    }
  }
  if (allowCloudFallback && list[0]) {
    try {
      const cloud = await cloudRecognize(list[0], preferredKind);
      if (cloud?.value) return cloud;
      if (String(cloud?.raw || '').length > String(bestNone?.raw || '').length) bestNone = cloud;
    } catch (e) {
      // غیرفعال‌بودن سرویس ابری مانع ورود دستی یا تلاش مجدد نمی‌شود.
      if (!bestNone) bestNone = { kind: 'none', value: null, raw: e?.message || '', source: 'cloud_ocr_error', confidence: 0 };
    }
  }
  if (ocrUnavailable && !bestNone?.raw) bestNone = { kind: 'none', value: null, raw: 'ماژول OCR بومی در APK نصب نشده است.', source: 'local_ocr_unavailable', confidence: 0 };
  return bestNone || { kind: 'none', value: null, raw: '', source: 'no_result', confidence: 0 };
}

