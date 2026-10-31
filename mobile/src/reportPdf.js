import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { request, imageSource } from './api';
import { fj } from './jdate';
import { reportMedia } from './reportMedia';
import { apiBase } from './config';

const esc = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const actionFa = { forward:'ارجاع', cc:'رونوشت', send:'ارسال', reply:'پاسخ', note:'یادداشت', seen:'مشاهده', reject:'رد' };
const statusFa = { sent:'ارسال‌شده', seen:'دیده‌شده', answered:'پاسخ‌داده‌شده', forwarded:'ارجاع‌شده', rejected:'ردشده' };

// expo-print WebView cannot authenticate /api/media requests. Embed bytes locally.
async function inlineImage(uri, index) {
  if (!uri) return '';
  if (String(uri).startsWith('data:image/')) return uri;
  const source = imageSource(uri);
  let url = source?.uri;
  if (url && url.startsWith('/')) url = apiBase().replace(/\/api\/?$/,'') + url;
  if (!url || !/^https?:\/\//i.test(url)) return '';
  const file = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}report-pdf-${Date.now()}-${index}.img`;
  try {
    const result = await FileSystem.downloadAsync(url,file,{headers:source.headers||{}});
    if (result.status !== 200) return '';
    const bytes = await FileSystem.readAsStringAsync(file,{encoding:FileSystem.EncodingType.Base64});
    const mime = /\.png(?:\?|$)/i.test(url)?'image/png':/\.webp(?:\?|$)/i.test(url)?'image/webp':'image/jpeg';
    return `data:${mime};base64,${bytes}`;
  } catch (_) { return ''; }
  finally { await FileSystem.deleteAsync(file,{idempotent:true}).catch(()=>{}); }
}

export function reportPrintHtml(r, config, embedded = {}) {
  const t = config?.template || {};
  const org = config?.org_title || 'سامانه خطیار';
  const order = Array.isArray(t.order) && t.order.length ? t.order : ['subject','sender','date','status','body','trail'];
  const visible = key => !t.fields || t.fields[key] !== false;
  const img = (uri, className) => embedded[uri] ? `<img class="${className}" src="${esc(embedded[uri])}" alt="امضا یا تصویر پیوست"/>` : '';
  const trail = Array.isArray(r.trail) ? r.trail : [];
  const pieces = {
    subject: () => `<h1>${esc(r.subject||'گزارش')}</h1>`,
    sender: () => `<div class="meta">فرستنده: ${esc([r.first_name,r.last_name].filter(Boolean).join(' ')||'—')} — سمت: ${esc(r.sender_role_title||'—')}</div>${r.sender_signature?`<div class="sig"><b>امضای ارسال‌کننده</b>${img(r.sender_signature,'sigimg')}</div>`:''}`,
    date: () => `<div class="meta">تاریخ: ${esc(fj(r.created_at))}</div>`,
    status: () => `<div class="meta">وضعیت: ${esc(statusFa[r.status]||r.status||'—')}</div>`,
    body: () => `<div class="body">${esc(r.body||'')}</div>`,
    trail: () => r.history_hidden_for_sender
      ? '<p class="meta">سوابق محرمانه پس از ارجاع برای ارسال‌کننده قابل نمایش نیست.</p>'
      : `<h3>روند گردش و یادداشت‌ها</h3><table><thead><tr><th>اقدام</th><th>توسط</th><th>سمت</th><th>تاریخ</th><th>یادداشت</th><th>امضا</th></tr></thead><tbody>${trail.map(x=>`<tr><td>${esc(actionFa[x.action]||x.action||'—')}</td><td>${esc([x.a_first,x.a_last].filter(Boolean).join(' ')||'—')}</td><td>${esc(x.a_role_title||'—')}</td><td>${esc(fj(x.created_at))}</td><td>${esc(x.note||'')}</td><td>${img(x.a_signature,'sigimg')||'—'}</td></tr>`).join('')}</tbody></table>`,
  };
  const media = reportMedia(r);
  const attachments = media.images.map(a=>`<section class="attachment"><b>${esc(a.label||'تصویر پیوست')}</b>${img(a.uri,'attached')||'<p>تصویر پیوست در دسترس نیست.</p>'}</section>`).join('')
    + media.files.map(a=>`<section class="attachment">پیوست فایل: ${esc(a.label)}</section>`).join('');
  const header = t.header === '' ? '' : `<div class="header">${esc(t.header||'سامانه مدیریت و نظارت بر خطوط و نیروهای اجرایی تاکسیرانی')}</div>`;
  const footer = t.footer ? `<footer>${esc(t.footer)}</footer>` : '';
  const fontSize = Math.max(10,Math.min(20,Number(t.fontPx)||13));
  const align = ['right','center','left'].includes(t.align)?t.align:'right';
  return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/><style>
  @page{size:A4;margin:13mm 11mm}*{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;color:#142033;font-size:${fontSize}px;line-height:1.85;text-align:${align};direction:rtl}
  .org{display:flex;align-items:center;justify-content:center;gap:12px;border-bottom:2px solid #0d7a5f;padding:8px 0 14px;margin-bottom:13px;text-align:center}.org img{max-width:56px;max-height:56px}.org b{font-size:17px}
  .header{text-align:center;color:#0d7a5f;font-weight:700;font-size:16px;margin:12px 0}h1{font-size:18px;margin:12px 0}h3{font-size:15px;margin:18px 0 8px}.meta{color:#526071;margin:6px 0}.body{white-space:pre-wrap;overflow-wrap:anywhere;padding:12px;border:1px solid #cbd5e1;border-radius:8px}
  table{border-collapse:collapse;width:100%;table-layout:fixed;direction:rtl}th,td{border:1px solid #ccd4df;padding:6px 4px;font-size:11px;vertical-align:top;overflow-wrap:anywhere}th{background:#edf6f2}tr{break-inside:avoid}
  .sig{display:flex;gap:12px;align-items:center;margin:10px 0}.sigimg{max-width:145px;max-height:65px;object-fit:contain}.attachment{padding:10px;border:1px solid #dce3ea;margin:12px 0;break-inside:avoid}.attached{display:block;max-width:100%;max-height:300px;object-fit:contain;margin:8px auto}footer{text-align:center;color:#64748b;border-top:1px solid #dce3ea;padding-top:10px;margin-top:24px}
  </style></head><body><div class="org">${img(config?.org_logo,'orglogo')}<b>${esc(org)}</b></div>${header}${order.filter(k=>visible(k)&&pieces[k]).map(k=>pieces[k]()).join('')}${attachments?`<h3>پیوست‌ها</h3>${attachments}`:''}${footer}</body></html>`;
}

export async function saveReportPdf(reportId) {
  const id = Number(reportId);
  if (!Number.isSafeInteger(id) || id<=0) throw new Error('شناسه گزارش نامعتبر است.');
  const [report, config] = await Promise.all([
    request('/reports/'+id,{noStore:true,timeoutMs:60000}),
    request('/reports/print-config',{noStore:true,timeoutMs:30000}),
  ]);
  const media = reportMedia(report);
  const urls = [config?.org_logo,report.sender_signature,...(report.trail||[]).map(x=>x.a_signature),...media.images.map(x=>x.uri)].filter(Boolean);
  const embedded = {};
  await Promise.all([...new Set(urls)].map(async (u,i)=>{embedded[u]=await inlineImage(u,i);}));
  const html = reportPrintHtml(report,config,embedded);
  const out = await Print.printToFileAsync({html,width:595,height:842,margins:{left:28,right:28,top:28,bottom:28}});
  const safe = String(report.subject||'report').replace(/[^\w\u0600-\u06FF-]+/g,'_').slice(0,70)||'report';
  const target = (FileSystem.documentDirectory || FileSystem.cacheDirectory)+`گزارش-${id}-${safe}.pdf`;
  await FileSystem.deleteAsync(target,{idempotent:true}).catch(()=>{});
  await FileSystem.copyAsync({from:out.uri,to:target});
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(target,{mimeType:'application/pdf',dialogTitle:'ذخیره فایل PDF گزارش'});
  return target;
}
