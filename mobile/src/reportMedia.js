// Normalize the legacy primary attachment and the newer report_attachments table.
// A primary attachment duplicated in the table must only be shown once.
const isImage = a => {
  const type = String(a.mime_type || '').toLowerCase();
  const name = String(a.file_name || a.attachment_name || '');
  return type.startsWith('image/') || (!type && /\.(jpe?g|png|webp|gif)$/i.test(name));
};

export function reportMedia(report) {
  const r = report || {};
  const extra = (Array.isArray(r.attachments) ? r.attachments : []).filter(a => a?.url);
  const primary = r.attachment_url || r.attachment_data;
  const primaryName = String(r.attachment_name || '');
  const duplicate = extra.some(a => primaryName && String(a.file_name || '').trim() === primaryName.trim());
  const items = [...extra];
  if (primary && !duplicate) items.unshift({ url: primary, thumbnail_url: primary, file_name: primaryName, mime_type: /\.pdf$/i.test(primaryName) || /^data:application\/pdf/i.test(primary) ? 'application/pdf' : 'image/jpeg' });
  return {
    images: items.filter(isImage).map(a => ({ uri: a.url, thumbnailUri: a.thumbnail_url || a.url, label: a.file_name || null })),
    files: items.filter(a => !isImage(a)).map(a => ({ uri: a.url, label: a.file_name || 'پیوست', mimeType: a.mime_type || '' })),
  };
}
