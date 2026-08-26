import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { apiBase } from './config';
import { request } from './api';

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const absolute = (u) => { if (!u) return ''; const s = String(u); if (/^(data:|https?:\/\/|file:)/i.test(s)) return s; return apiBase().replace(/\/$/, '') + (s.startsWith('/') ? s : '/' + s); };
const image = (u, cls = 'att') => u ? `<img class="${cls}" src="${esc(absolute(u))}" />` : '';
const actionFa = { forward: 'ارجاع', cc: 'رونوشت', send: 'ارسال', reply: 'پاسخ', note: 'یادداشت' };

export async function saveReportPdf(reportId) {
  const id = Number(reportId);
  if (!id) throw new Error('شناسه گزارش نامعتبر است.');
  const r = await request('/reports/' + id, { noStore: true, timeoutMs: 60000 });
  const flow = await request('/my/reports/' + id + '/flow', { noStore: true, timeoutMs: 60000 }).catch(() => []);
  const rows = Array.isArray(flow) ? flow : [];
  const atts = Array.isArray(r.attachments) ? r.attachments : [];
  const sender = `${r.first_name || ''} ${r.last_name || ''}`.trim();
  const org = r.org_title || r.org_name || r.site_title || 'سامانه خطیار';
  const senderSig = r.sender_signature ? image(r.sender_signature, 'sig') : '<div class="sigline">امضای ارسال‌کننده</div>';

  const flowHtml = rows.map((x) => {
    const actor = `${x.af_fn || ''} ${x.af_ln || ''}`.trim() || '—';
    const target = `${x.tu_fn || ''} ${x.tu_ln || ''}`.trim();
    return `<div class="flow"><b>${esc(actionFa[x.action] || x.action || 'اقدام')}</b><div>${esc(actor)}${target ? ` → ${esc(target)}` : ''}</div><small>${esc(x.created_at || '')}</small>${x.note ? `<p>${esc(x.note)}</p>` : ''}<div class="signature"><div class="sigline">امضای ارجاع‌کننده / اقدام‌کننده</div></div></div>`;
  }).join('');

  const attHtml = atts.map((a) => {
    const u = a.url || a.thumbnail_url || a.attachment_url;
    const mime = String(a.mime_type || '');
    return (mime.startsWith('image') || /^data:image/i.test(String(u || '')))
      ? `<div class="attachment"><div>${esc(a.file_name || 'تصویر پیوست')}</div>${image(u)}</div>`
      : `<div class="attachment">📎 ${esc(a.file_name || 'پیوست')}</div>`;
  }).join('');

  const defaultHtml = `<section class="header"><h1>${esc(org)}</h1><div>گزارش شماره ${esc(r.id)}</div></section><h2>${esc(r.subject || 'بدون موضوع')}</h2><div class="meta">فرستنده: ${esc(sender || '—')}${r.sender_role_title ? ` — ${esc(r.sender_role_title)}` : ''} | تاریخ: ${esc(r.created_at || '')}</div><div class="body">${String(r.body || '').replace(/\n/g, '<br>')}</div><div class="signature"><b>امضای ارسال‌کننده</b>${senderSig}</div>${attHtml ? `<h3>پیوست‌ها</h3>${attHtml}` : ''}${flowHtml ? `<h3>گردش و ارجاع‌ها</h3>${flowHtml}` : ''}`;
  const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><style>@font-face{font-family:Vazirmatn;src:url('https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/fonts/ttf/Vazirmatn-Regular.ttf')}@font-face{font-family:Vazirmatn;src:url('https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/fonts/ttf/Vazirmatn-Bold.ttf');font-weight:700}body{font-family:Vazirmatn,Tahoma,sans-serif;color:#142033;direction:rtl;font-size:12px;line-height:2;margin:24px}h1,h2,h3{margin:0 0 8px}.header{border-bottom:2px solid #0d7a5f;padding-bottom:10px;margin-bottom:18px}.meta{color:#68758a;margin-bottom:14px}.body{border:1px solid #e1e8f2;border-radius:10px;padding:14px}.att{max-width:100%;max-height:420px;display:block;margin:8px auto;border-radius:8px}.sig{max-width:220px;max-height:100px;display:block;margin-top:5px}.sigline{border-bottom:1px solid #8b95a5;width:220px;height:45px;margin-top:4px}.signature{margin-top:12px;padding:8px;border:1px dashed #cbd3df;border-radius:8px}.flow{border:1px solid #e1e8f2;border-radius:8px;padding:9px;margin:8px 0}.attachment{border:1px solid #e1e8f2;border-radius:8px;padding:8px;margin:7px 0}small{color:#748198}</style></head><body>${defaultHtml}</body></html>`;

  const out = await Print.printToFileAsync({ html, width: 595, height: 842, margins: { left: 28, right: 28, top: 28, bottom: 28 } });
  const safe = String(r.subject || 'report').replace(/[^\w\u0600-\u06FF-]+/g, '_').slice(0, 70) || 'report';
  const target = (FileSystem.documentDirectory || FileSystem.cacheDirectory) + `گزارش-${r.id}-${safe}.pdf`;
  try { await FileSystem.deleteAsync(target, { idempotent: true }); } catch (_) {}
  await FileSystem.copyAsync({ from: out.uri, to: target });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(target, { mimeType: 'application/pdf', dialogTitle: 'ذخیره و نمایش فایل PDF گزارش' });
  return target;
}
