const KH_COMPLAINTS_BUILD = "2026-10-06-v257";
// PANEL BUILD TARGET: 2026-10-14-v1
// Build sync: keep generated panel bundle aligned with panel_source changes.
const { useState, useEffect, useRef, useMemo } = React;
const I8 = (name) => name && name !== "undefined" ? React.createElement("img", { src: `/assets/icons3d/${name}.png`, alt: "", width: "30", height: "30", loading: "eager", decoding: "async", style: { objectFit: 'contain' }, onError: e => { e.currentTarget.style.display = 'none'; } }) : React.createElement("span", { "aria-hidden": "true", style: { display: "inline-flex", fontSize: 20, alignItems: "center", justifyContent: "center", width: 30, height: 30 } }, "\u25A6");
// Ú†Ø§Ù¾ Ø­Ø±ÙÙ‡â€ŒØ§ÛŒ Ø¨Ø§ Ø³Ø±Ø¨Ø±Ú¯ (Ù„ÙˆÚ¯Ùˆ + Ø¹Ù†ÙˆØ§Ù† Ø³Ø§Ø²Ù…Ø§Ù† + ØªØ§Ø±ÛŒØ® ØªÙˆÙ„ÛŒØ¯) â€” Ø¨Ø±Ø§ÛŒ Ø§Ø³ØªÙØ§Ø¯Ù‡Ù” Ù…Ø´ØªØ±Ú© Ø¯Ø± Ù‡Ù…Ù‡Ù” Ú¯Ø²Ø§Ø±Ø´â€ŒÙ‡Ø§
function printLetterhead(reportTitle, bodyHtml, opts) {
    const a = document.getElementById("print-area");
    if (!a)
        return;
    const orgTitle = document.title || "Ø³Ø§Ù…Ø§Ù†Ù‡ Ù…Ø¯ÛŒØ±ÛŒØª Ùˆ Ù†Ø¸Ø§Ø±Øª Ø¨Ø± Ø®Ø·ÙˆØ· Ùˆ Ù†ÛŒØ±ÙˆÙ‡Ø§ÛŒ Ø§Ø¬Ø±Ø§ÛŒÛŒ ØªØ§Ú©Ø³ÛŒØ±Ø§Ù†ÛŒ";
    const logo = (window.__brandLogo) || "";
    const now = new Date();
    const dateStr = now.toLocaleDateString("fa-IR") + " â€” " + now.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
    a.innerHTML = `<div style="padding:26px;font-family:Vazirmatn,sans-serif;color:#1c2530">
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #0e8a6a;padding-bottom:14px;margin-bottom:18px">
      <div style="display:flex;align-items:center;gap:12px">
        ${logo ? `<img src="${logo}" style="width:52px;height:52px;object-fit:contain;border-radius:10px"/>` : ""}
        <div><div style="font-weight:800;font-size:16px">${orgTitle}</div>
          <div style="font-size:11px;color:#667085;margin-top:2px">Ú¯Ø²Ø§Ø±Ø´ Ø±Ø³Ù…ÛŒ Ø³Ø§Ù…Ø§Ù†Ù‡ â€” Ù‚Ø§Ø¨Ù„ Ø§Ø³ØªÙ†Ø§Ø¯ Ø§Ø¯Ø§Ø±ÛŒ</div></div>
      </div>
      <div style="text-align:left;font-size:11px;color:#667085">ØªØ§Ø±ÛŒØ® ØªÙˆÙ„ÛŒØ¯ Ú¯Ø²Ø§Ø±Ø´<br/><b style="color:#1c2530;font-size:12px">${dateStr}</b></div>
    </div>
    <h2 style="text-align:center;font-size:17px;margin:0 0 4px">${reportTitle}</h2>
    ${opts && opts.subtitle ? `<p style="text-align:center;color:#667085;font-size:12px;margin:0 0 16px">${opts.subtitle}</p>` : '<div style="margin-bottom:16px"></div>'}
    ${bodyHtml}
    <div style="margin-top:28px;padding-top:10px;border-top:1px solid #e4e7ec;font-size:10px;color:#98a2b3;text-align:center">Ø§ÛŒÙ† Ú¯Ø²Ø§Ø±Ø´ Ø¨Ù‡â€ŒØµÙˆØ±Øª Ø®ÙˆØ¯Ú©Ø§Ø± Ø§Ø² Ø³Ø§Ù…Ø§Ù†Ù‡Ù” Ù…Ø¯ÛŒØ±ÛŒØª Ø®Ø·ÙˆØ· Ùˆ Ù†ÛŒØ±ÙˆÙ‡Ø§ÛŒ Ø§Ø¬Ø±Ø§ÛŒÛŒ ØªØ§Ú©Ø³ÛŒØ±Ø§Ù†ÛŒ ØªÙˆÙ„ÛŒØ¯ Ø´Ø¯Ù‡ Ø§Ø³Øª.</div>
  </div>`;
    window.print();
}
/* ============================================================
   Ù„Ø§ÛŒÙ‡Ù” API â€” Ø­Ø§Ù„Øª ÙˆØ§Ù‚Ø¹ÛŒ Ø¨Ù‡â€ŒØµÙˆØ±Øª Ø®ÙˆØ¯Ú©Ø§Ø± ØªØ´Ø®ÛŒØµ Ø¯Ø§Ø¯Ù‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯:
   Ø§Ú¯Ø± Ù¾Ù†Ù„ Ù¾Ø´Øª Ø³Ø±ÙˆØ± Ø³Ø±Ùˆ Ø´ÙˆØ¯ (/api/health Ù¾Ø§Ø³Ø® Ø¯Ù‡Ø¯) Ù‡Ù…Ù‡â€ŒÚ†ÛŒØ² ÙˆØ§Ù‚Ø¹ÛŒ Ø§Ø³ØªØŒ
   Ùˆ Ø§Ú¯Ø± ÙØ§ÛŒÙ„ Ø¨Ù‡â€ŒØªÙ†Ù‡Ø§ÛŒÛŒ Ø¨Ø§Ø² Ø´ÙˆØ¯ØŒ Ø¨Ù‡ Ø­Ø§Ù„Øª Ø¯Ù…ÙˆÛŒ Ù†Ù…ÙˆÙ†Ù‡ Ø¨Ø±Ù…ÛŒâ€ŒÚ¯Ø±Ø¯Ø¯.
   ============================================================ */
const API_BASE = '/api';
const tok = () => { const token = localStorage.token || ''; return { Authorization: 'Bearer ' + token, 'X-Access-Token': token }; };
// Ú©Ø´ Ú©ÙˆØªØ§Ù‡â€ŒÙ…Ø¯Øª Ø¨Ø±Ø§ÛŒ Ú©Ø§Ù‡Ø´ Ø¯Ø±Ø®ÙˆØ§Ø³Øªâ€ŒÙ‡Ø§ÛŒ ØªÚ©Ø±Ø§Ø±ÛŒ (Ù„ÛŒØ³Øª Ú©Ø§Ø±Ø¨Ø±Ø§Ù†/Ø®Ø·ÙˆØ· Ùˆ â€¦) â†’ Ø³Ø±Ø¹Øª Ø¨ÛŒØ´ØªØ±
const _cache = {};
const _cacheTTL = {
    '/admin/users': 60000, '/admin/roles': 300000, '/admin/lines': 180000,
    '/lines': 180000, '/geofences': 300000, '/admin/zones': 300000, '/zones': 300000,
    '/notice-reasons': 300000, '/checklist/template': 300000, '/admin/settings': 60000,
    '/settings/public': 300000, '/admin/shifts': 120000, '/admin/user-shifts': 120000,
    '/admin/holidays': 300000, '/admin/app-config': 60000
};
function _cacheTtlFor(p) {
    for (const [prefix, ttl] of Object.entries(_cacheTTL))
        if (p === prefix || p.startsWith(prefix + '?'))
            return ttl;
    return 0;
}
function _invalidateCache() { for (const k in _cache)
    delete _cache[k]; }
async function _readJsonResponse(r) {
    const text = await r.text();
    try {
        return text ? JSON.parse(text) : {};
    }
    catch (e) {
        const clean = String(text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 260);
        throw new Error('Ù¾Ø§Ø³Ø® JSON Ù…Ø¹ØªØ¨Ø± Ø§Ø² Ø³Ø±ÙˆØ± Ø¯Ø±ÛŒØ§ÙØª Ù†Ø´Ø¯' + (clean ? ' â€” ' + clean : ''));
    }
}
async function _renewBrowserSession() {
    const legacyRefresh = localStorage.getItem('refresh_token') || '';
    const rawFetch = window.__KHATYAR_NATIVE_FETCH__ || fetch;
    const rr = await rawFetch(API_BASE + '/session/renew', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'content-type': 'application/json', 'accept': 'application/json', 'cache-control': 'no-store', 'X-Khatyar-Cookie-Session': '1' },
        body: JSON.stringify(legacyRefresh ? { refresh: legacyRefresh } : {}),
    });
    const d = await _readJsonResponse(rr);
    if (!rr.ok || !d.access)
        throw new Error(d.error || 'ØªÙ…Ø¯ÛŒØ¯ Ù†Ø´Ø³Øª Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯');
    localStorage.token = d.access;
    localStorage.removeItem('refresh_token');
    return d;
}
async function _clearWebSession() {
    const result = await (window.__KHATYAR_NATIVE_FETCH__ || fetch)(API_BASE + '/session/web-signout', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'content-type': 'application/json', ...tok() }, body: '{}',
    });
    if (!result.ok)
        throw new Error('Ø®Ø±ÙˆØ¬ Ø§Ù…Ù† Ø§Ù†Ø¬Ø§Ù… Ù†Ø´Ø¯Ø› Ø§ØªØµØ§Ù„ Ø¨Ù‡ Ø³Ø±ÙˆØ± Ø±Ø§ Ø¨Ø±Ø±Ø³ÛŒ Ú©Ù†ÛŒØ¯.');
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    _invalidateCache();
}
async function _fetchWithAuth(url, options) {
    const rawFetch = window.__KHATYAR_NATIVE_FETCH__ || fetch;
    const init = { ...options, headers: { ...(options && options.headers || {}), ...tok() } };
    let r = await rawFetch(url, init);
    if (r.status !== 401 || String(url).includes('/session/'))
        return r;
    try {
        await _renewBrowserSession();
        return await rawFetch(url, { ...options, headers: { ...(options && options.headers || {}), ...tok() } });
    }
    catch (_) {
        return r;
    }
}
async function GET(p, opts) {
    const ttl = (opts && opts.ttl) || _cacheTtlFor(p);
    const key = p;
    if (ttl && _cache[key] && (Date.now() - _cache[key].t) < ttl)
        return _cache[key].v;
    const controller = opts && opts.timeoutMs ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), opts.timeoutMs) : null;
    try {
        const r = await _fetchWithAuth(API_BASE + p, { cache: 'no-store', ...(controller ? { signal: controller.signal } : {}) });
        const v = await _readJsonResponse(r);
        if (!r.ok)
            throw new Error(v.error || v.message || 'Ø®Ø·Ø§ÛŒ Ø³Ø±ÙˆØ±');
        if (ttl)
            _cache[key] = { t: Date.now(), v };
        return v;
    }
    catch (error) {
        if (controller && controller.signal.aborted)
            throw new Error('Ø²Ù…Ø§Ù† Ø¯Ø±ÛŒØ§ÙØª Ù…ÙˆÙ‚Ø¹ÛŒØªâ€ŒÙ‡Ø§ Ù¾Ø§ÛŒØ§Ù† ÛŒØ§ÙØªØ› Ø¯ÙˆØ¨Ø§Ø±Ù‡ ØªÙ„Ø§Ø´ Ú©Ù†ÛŒØ¯.');
        throw error;
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
}
async function downloadProtectedFile(path, filename) {
    const r = await fetch(API_BASE + path, { headers: tok(), cache: 'no-store' });
    if (!r.ok) {
        let m = 'Ø®Ø·Ø§ Ø¯Ø± Ø¯Ø±ÛŒØ§ÙØª Ø®Ø±ÙˆØ¬ÛŒ';
        try {
            const j = await r.json();
            m = j.error || j.message || m;
        }
        catch (_) { }
        throw new Error(m);
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'report.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
}
function exportXlsx(rows, sheetName, filename) {
    if (typeof XLSX === 'undefined')
        throw new Error('Ú©ØªØ§Ø¨Ø®Ø§Ù†Ù‡ Ø®Ø±ÙˆØ¬ÛŒ Excel Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª');
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, String(sheetName || 'Ú¯Ø²Ø§Ø±Ø´').slice(0, 31));
    XLSX.writeFile(wb, filename);
}
async function SEND(method, p, body) {
    const r = await _fetchWithAuth(API_BASE + p, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const v = await _readJsonResponse(r);
    if (!r.ok)
        throw new Error(v.error || v.message || 'Ø®Ø·Ø§ÛŒ Ø³Ø±ÙˆØ±');
    _invalidateCache(); // Ø¨Ø¹Ø¯ Ø§Ø² Ù‡Ø± ØªØºÛŒÛŒØ±ØŒ Ú©Ø´ Ù¾Ø§Ú© Ø´ÙˆØ¯ ØªØ§ Ø¯Ø§Ø¯Ù‡â€ŒÙ‡Ø§ ØªØ§Ø²Ù‡ Ø¨Ù…Ø§Ù†Ø¯
    return v;
}
// Ø¨Ø§Ø² Ú©Ø±Ø¯Ù† ØªØµÙˆÛŒØ±Ø› Ø§Ú¯Ø± Ù…Ø³ÛŒØ± ÙØ§ÛŒÙ„ ÙÛŒØ²ÛŒÚ©ÛŒ (/api/media) Ø¨Ø§Ø´Ø¯ Ø¨Ø§ ØªÙˆÚ©Ù† Ø¯Ø±ÛŒØ§ÙØª Ùˆ Ø¯Ø± ØªØ¨ Ø¬Ø¯ÛŒØ¯ Ø¨Ø§Ø² Ù…ÛŒâ€ŒØ´ÙˆØ¯Ø›
// Ø§Ú¯Ø± data URI (base64 Ù‚Ø¯ÛŒÙ…ÛŒ) Ø¨Ø§Ø´Ø¯ Ù…Ø³ØªÙ‚ÛŒÙ…Ø§Ù‹ Ø¨Ø§Ø² Ù…ÛŒâ€ŒØ´ÙˆØ¯.
async function openMediaUrl(url) {
    if (!url)
        return;
    if (url.indexOf('data:') === 0) {
        const w = window.open();
        if (w)
            w.document.write('<img src="' + url + '" style="max-width:100%"/>');
        return;
    }
    try {
        const full = url.indexOf('/api/') === 0 ? (API_BASE.replace(/\/api$/, '') + url) : url;
        const r = await fetch(full, { headers: tok() });
        if (!r.ok)
            throw new Error('Ø®Ø·Ø§ Ø¯Ø± Ø¯Ø±ÛŒØ§ÙØª ØªØµÙˆÛŒØ±');
        const blob = await r.blob();
        const obj = URL.createObjectURL(blob);
        window.open(obj, '_blank');
        setTimeout(() => URL.revokeObjectURL(obj), 60000);
    }
    catch (e) {
        alert(e.message || 'Ø®Ø·Ø§ Ø¯Ø± Ù†Ù…Ø§ÛŒØ´ ØªØµÙˆÛŒØ±');
    }
}
// Ø¨Ø±Ø±Ø³ÛŒ Ø§ØªØµØ§Ù„ Ø¨Ù‡ Ø³Ø±ÙˆØ± (Ø¨Ø¯ÙˆÙ† Ø­Ø§Ù„Øª Ø¯Ù…ÙˆØ› Ø¯Ø± ØµÙˆØ±Øª Ù‚Ø·Ø¹ Ø§ØªØµØ§Ù„ Ø®Ø·Ø§ Ù†Ù…Ø§ÛŒØ´ Ø¯Ø§Ø¯Ù‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯)
async function checkConnection() {
    for (const url of [API_BASE + '/health', '/health']) {
        try {
            const r = await fetch(url, { cache: 'no-store' });
            if (r.ok) {
                window.__health = await r.json().catch(() => ({}));
                return true;
            }
        }
        catch (e) { }
    }
    return false;
}
const db = {
    // Ù†Ú©ØªÙ‡: Ø¨Ø¯Ù†Ù‡Ù” ÙˆØ±ÙˆØ¯ Ø¨Ù‡â€ŒØ¬Ø§ÛŒ JSON Ø¨Ø§ ÙØ±Ù… urlencoded Ø§Ø±Ø³Ø§Ù„ Ù…ÛŒâ€ŒØ´ÙˆØ¯ØŒ Ú†ÙˆÙ† WAF Ù‡Ø§Ø³Øª Ø¯Ø±Ø®ÙˆØ§Ø³Øªâ€ŒÙ‡Ø§ÛŒ
    // POST Ø¨Ø§ Content-Type: application/json Ø±Ø§ (Ø¨Ù‡â€ŒØ®ØµÙˆØµ Ø¨Ø±Ø§ÛŒ ÙÛŒÙ„Ø¯Ù‡Ø§ÛŒ Ø´Ø¨ÛŒÙ‡ Ø¨Ù‡ ÙØ±Ù… ÙˆØ±ÙˆØ¯) Ù…Ø³Ø¯ÙˆØ¯
    // Ù…ÛŒâ€ŒÚ©Ù†Ø¯Ø› Ø¨Ø§ ØªØ³Øª Ù…Ø³ØªÙ‚ÛŒÙ… Ø±ÙˆÛŒ Ø³Ø±ÙˆØ± ÙˆØ§Ù‚Ø¹ÛŒ ØªØ£ÛŒÛŒØ¯ Ø´Ø¯ Ú©Ù‡ ÙØ±Ù… urlencoded Ø¨Ø¯ÙˆÙ† Ù…Ø´Ú©Ù„ Ø¹Ø¨ÙˆØ± Ù…ÛŒâ€ŒÚ©Ù†Ø¯.
    webLoginConfig: () => GET('/session/web-login-config'),
    loginPassword: async (username, password) => {
        const u = String(username || '').trim(), p = String(password || '');
        if (!u)
            throw new Error('Ù†Ø§Ù… Ú©Ø§Ø±Ø¨Ø±ÛŒ Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯');
        if (!p)
            throw new Error('Ú©Ù„Ù…Ù‡ Ø¹Ø¨ÙˆØ± Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯');
        let deviceId = localStorage.getItem('kh_web_device_id');
        if (!deviceId) {
            deviceId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('web-' + Date.now() + '-' + Math.random().toString(36).slice(2));
            localStorage.setItem('kh_web_device_id', deviceId);
        }
        const r = await (window.__KHATYAR_NATIVE_FETCH__ || fetch)(API_BASE + '/session/start', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'accept': 'application/json', 'cache-control': 'no-store', 'X-Khatyar-Cookie-Session': '1' }, body: JSON.stringify({ username: u, password: p, device_id: deviceId, device_type: 'web' }), cache: 'no-store' });
        const d = await _readJsonResponse(r);
        if (!r.ok)
            throw new Error(d.error || d.message || ('ÙˆØ±ÙˆØ¯ Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯ (HTTP ' + r.status + ')'));
        if (!d.access)
            throw new Error('Ù¾Ø§Ø³Ø® ÙˆØ±ÙˆØ¯ Ù†Ø§Ù‚Øµ Ø§Ø³Øª: ØªÙˆÚ©Ù† Ø¯Ø±ÛŒØ§ÙØª Ù†Ø´Ø¯.');
        localStorage.token = d.access;
        localStorage.removeItem('refresh_token');
        _invalidateCache();
        return d;
    },
    webLoginOtpRequest: async (username) => {
        const u = String(username || '').trim();
        if (!u)
            throw new Error('Ù†Ø§Ù… Ú©Ø§Ø±Ø¨Ø±ÛŒ Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯');
        const r = await (window.__KHATYAR_NATIVE_FETCH__ || fetch)(API_BASE + '/session/otp-request', { method: 'POST', headers: { 'content-type': 'application/json', 'accept': 'application/json', 'cache-control': 'no-store' }, body: JSON.stringify({ username: u }), cache: 'no-store' });
        const d = await _readJsonResponse(r);
        if (!r.ok)
            throw new Error(d.error || d.message || ('Ø§Ø±Ø³Ø§Ù„ Ú©Ø¯ Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯ (HTTP ' + r.status + ')'));
        return d;
    },
    webLoginOtpVerify: async (username, code) => {
        const u = String(username || '').trim(), c = String(code || '').trim();
        const latin = c.replace(/[Û°-Û¹]/g, d => '0123456789'['Û°Û±Û²Û³Û´ÛµÛ¶Û·Û¸Û¹'.indexOf(d)]);
        if (!u)
            throw new Error('Ù†Ø§Ù… Ú©Ø§Ø±Ø¨Ø±ÛŒ Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯');
        if (!/^\d{6}$/.test(latin))
            throw new Error('Ú©Ø¯ Ø´Ø´â€ŒØ±Ù‚Ù…ÛŒ Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯');
        let deviceId = localStorage.getItem('kh_web_device_id');
        if (!deviceId) {
            deviceId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('web-' + Date.now() + '-' + Math.random().toString(36).slice(2));
            localStorage.setItem('kh_web_device_id', deviceId);
        }
        const r = await (window.__KHATYAR_NATIVE_FETCH__ || fetch)(API_BASE + '/session/otp-verify', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'accept': 'application/json', 'cache-control': 'no-store', 'X-Khatyar-Cookie-Session': '1' }, body: JSON.stringify({ username: u, code: latin, device_id: deviceId }), cache: 'no-store' });
        const d = await _readJsonResponse(r);
        if (!r.ok)
            throw new Error(d.error || d.message || ('ØªØ£ÛŒÛŒØ¯ Ú©Ø¯ Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯ (HTTP ' + r.status + ')'));
        if (!d.access)
            throw new Error('Ù¾Ø§Ø³Ø® ÙˆØ±ÙˆØ¯ Ù†Ø§Ù‚Øµ Ø§Ø³Øª: ØªÙˆÚ©Ù† Ø¯Ø±ÛŒØ§ÙØª Ù†Ø´Ø¯.');
        localStorage.token = d.access;
        localStorage.removeItem('refresh_token');
        _invalidateCache();
        return d;
    },
    restoreSession: async () => {
        const access = localStorage.token || '';
        const me = async () => {
            const r = await (window.__KHATYAR_NATIVE_FETCH__ || fetch)(API_BASE + '/auth/me', { headers: tok(), cache: 'no-store' });
            const d = await _readJsonResponse(r);
            if (!r.ok)
                throw Object.assign(new Error(d.error || d.message || 'Ù†Ø´Ø³Øª Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª'), { status: r.status });
            return d.user || null;
        };
        try {
            if (access)
                return await me();
        }
        catch (e) {
            if (e.status !== 401) {
                localStorage.removeItem('token');
                return null;
            }
        }
        try {
            await _renewBrowserSession();
            return await me();
        }
        catch (_) {
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
            return null;
        }
    },
    stats: () => GET('/admin/stats'),
    systemHealthDashboard: () => GET('/admin/system-health-dashboard'),
    systemHealthRunChecks: () => SEND('POST', '/admin/system-health-dashboard/run', {}),
    systemHealthIncidents: () => GET('/admin/system-health-incidents'),
    deviceHealth: (q = '') => GET('/admin/device-health?q=' + encodeURIComponent(q)),
    users: (params) => GET('/admin/users?' + new URLSearchParams(params || {}).toString()),
    userCommitments: (id) => GET('/admin/user-commitments?user_id=' + encodeURIComponent(id)),
    orgChart: () => GET('/admin/org-chart'),
    salarySlipUsers: (q = '') => GET('/admin/salary-slips/users?q=' + encodeURIComponent(q)),
    salarySlipsForUser: (id) => GET('/admin/users/' + id + '/salary-slips'),
    salarySlipDelete: (id) => SEND('DELETE', '/admin/salary-slips/' + id, {}),
    salarySlipUpload: async (id, fields, file) => {
        const fd = new FormData();
        Object.entries(fields || {}).forEach(([k, v]) => fd.append(k, String(v !== null && v !== void 0 ? v : '')));
        fd.append('file', file, file.name || 'salary-slip');
        const r = await fetch(API_BASE + '/admin/users/' + id + '/salary-slips', { method: 'POST', headers: tok(), body: fd });
        const v = await _readJsonResponse(r);
        if (!r.ok)
            throw new Error(v.error || v.message || 'Ø®Ø·Ø§ Ø¯Ø± Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ ÙÛŒØ´');
        _invalidateCache();
        return v;
    },
    roles: () => GET('/admin/roles'),
    smsCredit: () => GET('/admin/sms/credit'),
    smsTest: (mobile, message) => SEND('POST', '/admin/sms/test', { mobile, message }),
    smsTemplates: () => GET('/sms/templates'),
    smsDrivers: () => GET('/my/sms-drivers'),
    smsSend: (driver_ids, message) => SEND('POST', '/sms/send', { driver_ids, message }),
    smsLog: (from, to, kind, sentBy) => GET(`/admin/sms-log?from=${from}&to=${to}${kind ? `&kind=${kind}` : ""}${sentBy ? `&sent_by=${sentBy}` : ""}`),
    smsRefreshStatus: (from, to) => SEND('POST', `/admin/sms-log/refresh-status?from=${from}&to=${to}`, {}),
    smsDriversByLine: (lineId) => GET('/sms/drivers-by-line?line_id=' + lineId),
    smsSendMixed: (driver_ids, mobiles, message) => SEND('POST', '/sms/send', { driver_ids, mobiles, message }),
    lines: () => GET('/admin/lines'),
    expiryPreview: (type, mode, days, lines) => GET(`/admin/sms-expiry/preview?type=${type}&mode=${mode}&days=${days}${lines ? `&lines=${lines}` : ""}`),
    expirySample: (type, mode, mobile) => SEND('POST', '/admin/sms-expiry/sample', { type, mode, mobile }),
    expirySend: (type, mode, days, lines) => SEND('POST', '/admin/sms-expiry/send', { type, mode, days, lines }),
    presenceChecks: (from, to, uid) => GET(`/admin/presence-checks?from=${from}&to=${to}${uid ? `&user_id=${uid}` : ""}`),
    presenceCheck: (id) => GET('/admin/presence-checks/' + id),
    presenceExportUrl: (from, to, uid) => `${API_BASE}/admin/presence-checks/export?from=${from}&to=${to}${uid ? `&user_id=${uid}` : ""}`,
    presenceViolations: (from, to) => GET(`/admin/presence-violations?from=${from}&to=${to}`),
    addRole: (obj) => SEND('POST', '/admin/roles', obj),
    updateRole: (id, obj) => SEND('PUT', '/admin/roles/' + id, obj),
    deleteRole: (id) => SEND('DELETE', '/admin/roles/' + id),
    zones: () => GET('/admin/zones'),
    lines: () => GET('/admin/lines'),
    drivers: (params) => GET('/admin/drivers?' + new URLSearchParams(params).toString()),
    driverFull: (id) => GET('/admin/drivers/' + id + '/full'),
    driverPerformance: (nid, year) => GET('/admin/driver-performance?national_id=' + encodeURIComponent(nid) + '&year=' + year),
    driverNotices: (nid) => GET('/admin/driver-notices?national_id=' + encodeURIComponent(nid)),
    deleteDriverNotice: (id) => SEND('DELETE', '/admin/driver-notices/' + id, {}),
    driverNoticesExportUrl: (nid) => API_BASE + '/admin/driver-notices/export?national_id=' + encodeURIComponent(nid),
    driverSms: (id) => GET('/drivers/' + id + '/sms'),
    customFields: () => GET('/admin/custom-fields'),
    addCustomField: (b) => SEND('POST', '/admin/custom-fields', b),
    updCustomField: (id, b) => SEND('PUT', '/admin/custom-fields/' + id, b),
    delCustomField: (id) => SEND('DELETE', '/admin/custom-fields/' + id),
    userCustomValues: (id) => GET('/admin/users/' + id + '/custom-values'),
    saveUserCustomValues: (id, values) => SEND('POST', '/admin/users/' + id + '/custom-values', { values }),
    roleAppItems: () => GET('/admin/role-app-items'),
    saveRoleAppItems: (config) => SEND('POST', '/admin/role-app-items', { config }),
    maintenanceStatus: () => GET('/admin/maintenance'),
    saveMaintenance: (cfg) => SEND('POST', '/admin/maintenance', cfg),
    adminOutages: (qs) => GET('/admin/outages' + (qs || "")),
    usersExportUrl: () => `${API_BASE}/admin/users/export`,
    outagesExportUrl: (qs) => `${API_BASE}/admin/outages/export` + (qs || ""),
    formsAll: () => GET('/admin/forms?all=1'),
    updForm: (id, b) => SEND('PUT', '/admin/forms/' + id, b),
    delForm: (id) => SEND('DELETE', '/admin/forms/' + id, {}),
    formSubs: (id) => GET('/admin/forms/' + id + '/submissions'),
    formExportUrl: (id) => `${API_BASE}/admin/forms/${id}/export`,
    updateDriver: (id, b) => SEND('PUT', '/admin/drivers/' + id, b),
    deleteDriver: (id) => SEND('DELETE', '/admin/drivers/' + id),
    adminSetPhoto: (id, photo) => SEND('POST', '/admin/users/' + id + '/photo', { photo }),
    adminSetSignature: (id, signature_data) => SEND('POST', '/admin/users/' + id + '/signature', { signature_data }),
    invItemTypes: () => GET('/admin/inventory/item-types'),
    invAddItemType: (b) => SEND('POST', '/admin/inventory/item-types', b),
    invUpdItemType: (id, b) => SEND('PUT', '/admin/inventory/item-types/' + id, b),
    invAssign: (b) => SEND('POST', '/admin/inventory/assign', b),
    invLedger: (qs) => GET('/admin/inventory/ledger' + (qs || "")),
    invExportUrl: (qs) => `${API_BASE}/admin/inventory/export` + (qs || ""),
    userSessions: (id) => GET('/admin/users/' + id + '/sessions'),
    bills: () => GET('/admin/bills'),
    reports: () => GET('/reports?per=20').then(d => Array.isArray(d) ? d : (d.items || [])),
    logs: () => GET('/admin/logs'),
    live: (shiftOnly) => GET('/locations/live' + (shiftOnly ? '?shift_only=1' : ''), { timeoutMs: 20000 }),
    track: (uid, from, to) => GET(`/locations/track?user_id=${uid}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
    appVersion: () => GET('/app/version'),
    presentStats: () => GET('/admin/present-stats'),
    stationExits: (since) => GET('/admin/station-exits' + (since ? ('?since=' + encodeURIComponent(since)) : '')),
    noticeReasons: () => GET('/notice-reasons'),
    checklist: () => GET('/checklist/template'),
    settings: () => GET('/admin/settings'),
    publicSettings: () => GET('/settings/public'),
    report: (type, from, to, q) => GET(`/admin/report?type=${type}&from=${from || ''}&to=${to || ''}&q=${encodeURIComponent(q || '')}`),
    userLines: (id) => GET('/admin/users/' + id + '/lines'),
    createUser: (u) => SEND('POST', '/admin/users', u),
    updateUser: (id, b) => SEND('PUT', '/admin/users/' + id, b),
    lineIdents: (lineId) => GET('/admin/lines/' + lineId + '/idents'),
    setLineMethods: (lineId, methods) => SEND('PUT', '/admin/lines/' + lineId + '/checkin-methods', { methods }),
    addLineIdent: (lineId, b) => SEND('POST', '/admin/lines/' + lineId + '/idents', b),
    delLineIdent: (id) => SEND('DELETE', '/admin/line-idents/' + id, {}),
    userManagers: (id) => GET('/admin/users/' + id + '/managers'),
    setUserManagers: (id, manager_ids) => SEND('PUT', '/admin/users/' + id + '/managers', { manager_ids }),
    shifts: () => GET('/admin/shifts'),
    shift: (id) => GET('/admin/shifts/' + id),
    saveShift: (b) => SEND('POST', '/admin/shifts', b),
    updateShift: (id, b) => SEND('PUT', '/admin/shifts/' + id, b),
    delShift: (id) => SEND('DELETE', '/admin/shifts/' + id, {}),
    saveShiftDays: (id, days) => SEND('POST', '/admin/shifts/' + id + '/days', { days }),
    userShifts: () => GET('/admin/user-shifts'),
    setUserShift: (b) => SEND('POST', '/admin/user-shifts', b),
    delUserShift: (uid) => SEND('DELETE', '/admin/user-shifts/' + uid, {}),
    holidays: () => GET('/admin/holidays'),
    addHolidays: (items) => SEND('POST', '/admin/holidays', { items }),
    delHoliday: (jdate) => SEND('DELETE', '/admin/holidays/' + jdate, {}),
    fetchHolidays: (year, month) => SEND('POST', '/admin/holidays/fetch', { year, month }),
    shiftReport: (year, month) => GET('/admin/shift-report?year=' + year + '&month=' + month),
    attendanceReport: (userId, from, to) => {
        const rawId = userId && typeof userId === 'object' ? userId.id : userId;
        const numericId = Number(rawId);
        if (!Number.isSafeInteger(numericId) || numericId <= 0)
            return Promise.reject(new Error('Ø´Ù†Ø§Ø³Ù‡ Ù¾Ø±Ø³Ù†Ù„ Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³ØªØ› Ù„Ø·ÙØ§Ù‹ Ø´Ø®Øµ Ø±Ø§ Ø¯ÙˆØ¨Ø§Ø±Ù‡ Ø§Ù†ØªØ®Ø§Ø¨ Ú©Ù†ÛŒØ¯.'));
        return GET('/admin/attendance-report?user_id=' + encodeURIComponent(String(numericId)) + '&from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to));
    },
    attendanceSurplusConvert: (body) => SEND('POST', '/admin/attendance-surplus/convert', body),
    attendanceSurplusReset: (body) => SEND('POST', '/admin/attendance-surplus/reset', body),
    ruleEngineRoles: () => GET('/admin/rule-engine/roles'),
    saveRuleEngineRole: (roleKey, body) => SEND('PUT', '/admin/rule-engine/roles/' + encodeURIComponent(roleKey), body),
    attendanceRejectLogs: (qs) => GET('/admin/attendance-reject-logs' + (qs || '')),
    shiftPlanningDiagnostics: () => GET('/admin/shift-planning/diagnostics'),
    attendanceRecalculate: (body) => SEND('POST', '/admin/attendance/recalculate', body),
    autoCloseOpenSessions: (body) => SEND('POST', '/admin/attendance/auto-close-open-sessions', body),
    userRuleOverrides: (userId) => GET('/admin/rule-engine/user-overrides' + (userId ? ('?user_id=' + encodeURIComponent(userId)) : '')),
    saveUserRuleOverride: (userId, body) => SEND('PUT', '/admin/rule-engine/user-overrides/' + encodeURIComponent(userId), body),
    deleteUserRuleOverride: (userId) => SEND('DELETE', '/admin/rule-engine/user-overrides/' + encodeURIComponent(userId), {}),
    shiftAssignmentAudit: (userId) => GET('/admin/shift-assignment-audit' + (userId ? ('?user_id=' + encodeURIComponent(userId)) : '')),
    attendancePunchEdit: (id, body) => SEND('PUT', '/admin/attendance-punch/' + id, body),
    attendancePunchDelete: (id) => SEND('DELETE', '/admin/attendance-punch/' + id),
    attendancePunchAdd: (body) => SEND('POST', '/admin/attendance-punch', body),
    adminRequestCreate: (body) => SEND('POST', '/admin/requests', body),
    adminRequests: (qs) => GET('/admin/requests' + (qs || '')),
    plateTrainingStatus: () => GET('/admin/plate-training/status'),
    plateTrainingSamples: (qs) => GET('/admin/plate-training/samples' + (qs || '')),
    plateTrainingReview: (id, body) => SEND('POST', '/admin/plate-training/samples/' + id + '/review', body),
    adminRequests: (qs) => GET('/admin/requests' + (qs || "")),
    adminRequestDecision: (id, body) => SEND('POST', '/admin/requests/' + id + '/decision', body),
    adminRequestEdit: (id, body) => SEND('PUT', '/admin/requests/' + id, body),
    adminRequestDelete: (id) => SEND('DELETE', '/admin/requests/' + id, {}),
    userLeaveBalance: (id) => GET('/admin/users/' + id + '/leave-balance'),
    leaveBalanceInitList: () => GET('/admin/leave-balance-init'),
    leaveBalanceInitSave: (items) => SEND('POST', '/admin/leave-balance-init', { items }),
    workDashboard: (year, month) => GET('/admin/work-dashboard' + (year ? ('?year=' + year + '&month=' + month) : "")),
    userPayroll: (id) => GET('/admin/users/' + id + '/payroll'),
    saveUserPayroll: (id, b) => SEND('POST', '/admin/users/' + id + '/payroll', b),
    userPayslip: (id, year, month) => GET('/admin/users/' + id + '/payslip?year=' + year + '&month=' + month),
    payrollExportUrl: (year, month) => `${API_BASE}/admin/payroll/export?year=${year}&month=${month}`,
    seedHolidays1404: () => SEND('POST', '/admin/holidays/seed-1404', {}),
    seedHolidays1405: () => SEND('POST', '/admin/holidays/seed-1405', {}),
    birthdayTest: (user_id) => SEND('POST', '/admin/birthday/test', { user_id }),
    baleSubscribers: () => GET('/admin/bale/subscribers'),
    baleLog: () => GET('/admin/bale/log'),
    baleTest: (mobile, message) => SEND('POST', '/admin/bale/test', { mobile, message }),
    baleMenuItems: () => GET('/admin/bale/menu-items'),
    baleMenuSave: (item) => item.id ? SEND('PUT', '/admin/bale/menu-items/' + item.id, item) : SEND('POST', '/admin/bale/menu-items', item),
    baleMenuDelete: (id) => SEND('DELETE', '/admin/bale/menu-items/' + id, {}),
    baleReplies: () => GET('/admin/bale/custom-replies'),
    baleReplySave: (item) => item.id ? SEND('PUT', '/admin/bale/custom-replies/' + item.id, item) : SEND('POST', '/admin/bale/custom-replies', item),
    baleReplyDelete: (id) => SEND('DELETE', '/admin/bale/custom-replies/' + id, {}),
    baleForms: () => GET('/admin/bale/forms'),
    baleFormSave: (item) => item.id ? SEND('PUT', '/admin/bale/forms/' + item.id, item) : SEND('POST', '/admin/bale/forms', item),
    baleFormDelete: (id) => SEND('DELETE', '/admin/bale/forms/' + id, {}),
    baleSubmissions: (status) => GET('/admin/bale/form-submissions' + (status ? ('?status=' + encodeURIComponent(status)) : '')),
    baleSubmissionReview: (id, body) => SEND('POST', '/admin/bale/form-submissions/' + id + '/review', body),
    baleEvents: () => GET('/admin/bale/events'),
    messengerSubscribers: (platform) => GET('/admin/messengers/' + platform + '/subscribers'),
    messengerLog: (platform) => GET('/admin/messengers/' + platform + '/log'),
    messengerTest: (platform, mobile, text) => SEND('POST', '/admin/messengers/' + platform + '/test', { mobile, text }),
    messengerMenuItems: (platform) => GET('/admin/messengers/' + platform + '/menu-items'),
    messengerMenuSave: (platform, item) => item.id ? SEND('PUT', '/admin/messengers/' + platform + '/menu-items/' + item.id, item) : SEND('POST', '/admin/messengers/' + platform + '/menu-items', item),
    messengerMenuDelete: (platform, id) => SEND('DELETE', '/admin/messengers/' + platform + '/menu-items/' + id, {}),
    messengerReplies: (platform) => GET('/admin/messengers/' + platform + '/custom-replies'),
    messengerReplySave: (platform, item) => item.id ? SEND('PUT', '/admin/messengers/' + platform + '/custom-replies/' + item.id, item) : SEND('POST', '/admin/messengers/' + platform + '/custom-replies', item),
    messengerReplyDelete: (platform, id) => SEND('DELETE', '/admin/messengers/' + platform + '/custom-replies/' + id, {}),
    messengerForms: (platform) => GET('/admin/messengers/' + platform + '/forms'),
    messengerFormSave: (platform, item) => item.id ? SEND('PUT', '/admin/messengers/' + platform + '/forms/' + item.id, item) : SEND('POST', '/admin/messengers/' + platform + '/forms', item),
    messengerFormDelete: (platform, id) => SEND('DELETE', '/admin/messengers/' + platform + '/forms/' + id, {}),
    messengerSubmissions: (platform, status) => GET('/admin/messengers/' + platform + '/form-submissions' + (status ? ('?status=' + encodeURIComponent(status)) : '')),
    messengerSubmissionReview: (platform, id, body) => SEND('POST', '/admin/messengers/' + platform + '/form-submissions/' + id + '/review', body),
    messengerEvents: (platform) => GET('/admin/messengers/' + platform + '/events'),
    messengerRegisterWebhook: (platform) => SEND('POST', '/admin/messengers/' + platform + '/register-webhook', {}),
    messengerSendBulk: (platform, target, text) => SEND('POST', '/admin/messengers/' + platform + '/send', { target, text }),
    messengerSendManual: (mobiles, message) => SEND('POST', '/messengers/send-group', { mobiles, message }),
    messengerInvite: (mobiles, text) => SEND('POST', '/admin/messengers/invite', { mobiles, text }),
    staffAttendance: (from, to) => GET('/admin/staff-attendance?from=' + from + '&to=' + to),
    setOrg: (id, b) => SEND('PUT', '/admin/users/' + id + '/org', b),
    assignLines: (id, ids) => SEND('PUT', '/admin/users/' + id + '/lines', { line_ids: ids }),
    assignCheckinLines: (id, ids) => SEND('PUT', '/admin/users/' + id + '/checkin-lines', { line_ids: ids }),
    revokeDevice: (id, type) => SEND('POST', '/admin/users/' + id + '/revoke-device', type ? { device_type: type } : {}),
    deleteUser: (id) => SEND('DELETE', '/admin/users/' + id),
    resetPassword: (id, password) => SEND('POST', '/admin/users/' + id + '/reset-password', { password }),
    createZone: (name, parentId = null, requiresSubstitute = false) => SEND('POST', '/admin/zones', { name, parent_id: parentId, leave_requires_substitute: requiresSubstitute }),
    updateZone: (id, name, parentId, requiresSubstitute) => SEND('PUT', '/admin/zones/' + id, { name, ...(parentId === undefined ? {} : { parent_id: parentId }), ...(requiresSubstitute === undefined ? {} : { leave_requires_substitute: requiresSubstitute }) }),
    zoneLeaders: (id, fields) => SEND('PUT', '/admin/zones/' + id + '/leaders', fields),
    deleteZone: (id) => SEND('DELETE', '/admin/zones/' + id, {}),
    addReason: (title) => SEND('POST', '/admin/notice-reasons', { title }),
    delReason: (id) => SEND('DELETE', '/admin/notice-reasons/' + id),
    saveChecklist: (title, items) => SEND('POST', '/admin/checklist-templates', { title, items }),
    reportSubjects: () => GET('/admin/report-subjects'),
    addReportSubject: (title) => SEND('POST', '/admin/report-subjects', { title }),
    delReportSubject: (id) => SEND('DELETE', '/admin/report-subjects/' + id, {}),
    saveSettings: (obj) => SEND('PUT', '/admin/settings', obj),
    reportAction: (id, b) => SEND('POST', '/reports/' + id + '/action', b),
    reportDetail: (id) => GET('/reports/' + id),
    officialVisits: (official, from, to) => GET(`/admin/official-visits?official=${official || ''}&from=${from || ''}&to=${to || ''}`),
    officialChart: () => GET('/admin/official-visits/chart'),
    geofences: () => GET('/geofences'),
    createGeofence: (g) => SEND('POST', '/admin/geofences', g),
    createLine: (l) => SEND('POST', '/admin/lines', l),
    userLeaderboard: () => GET('/admin/user-leaderboard'),
    topWorkers: () => GET('/admin/top-workers'),
    usersLite: (attendanceSearch = false) => GET('/admin/users-lite' + (attendanceSearch ? '?attendance_search=1' : '')),
    userActivity: (uid, date) => GET('/admin/user-activity?user_id=' + uid + '&date=' + date),
    presence: () => GET('/admin/presence'),
    driversSearch: (q) => GET('/admin/drivers-search?q=' + encodeURIComponent(q)),
    deleteGeofence: (id) => SEND('DELETE', '/admin/geofences/' + id),
    messages: () => GET('/admin/messages'),
    sendMessage: (m) => SEND('POST', '/admin/messages', m),
    rolePerms: () => GET('/admin/settings').then(s => s.role_perms || {}),
    cleanupAttachments: () => SEND('POST', '/admin/cleanup-attachments', {}),
    receipts: (id) => GET('/admin/messages/' + id + '/receipts'),
    importExcel: async (kind, file) => {
        const fd = new FormData();
        fd.append('file', file);
        const r = await fetch(API_BASE + '/admin/import/' + kind, { method: 'POST', headers: tok(), body: fd });
        if (!r.ok)
            throw new Error('Ø®Ø·Ø§ Ø¯Ø± Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ ÙØ§ÛŒÙ„');
        return r.json();
    },
};
// ØªØ¨Ø¯ÛŒÙ„ ØªØ§Ø±ÛŒØ® Ù…ÛŒÙ„Ø§Ø¯ÛŒ Ø°Ø®ÛŒØ±Ù‡â€ŒØ´Ø¯Ù‡ Ø¨Ù‡ Ù†Ù…Ø§ÛŒØ´ Ø´Ù…Ø³ÛŒ
// ÙØ´Ø±Ø¯Ù‡â€ŒØ³Ø§Ø²ÛŒ Ø®ÙˆØ¯Ú©Ø§Ø± Ø¹Ú©Ø³ Ù‚Ø¨Ù„ Ø§Ø² Ø¢Ù¾Ù„ÙˆØ¯ (Ú©Ø§Ù‡Ø´ Ø§Ø¨Ø¹Ø§Ø¯ Ùˆ Ú©ÛŒÙÛŒØª)
async function compressImage(file, maxDim = 1280, quality = 0.6) {
    if (!file || !file.type || file.type.indexOf('image/') !== 0)
        return await fileToDataUrl(file);
    const dataUrl = await fileToDataUrl(file);
    return await new Promise(res => {
        const img = new Image();
        img.onload = () => {
            let { width: w, height: h } = img;
            if (w > h && w > maxDim) {
                h = Math.round(h * maxDim / w);
                w = maxDim;
            }
            else if (h > maxDim) {
                w = Math.round(w * maxDim / h);
                h = maxDim;
            }
            const cv = document.createElement('canvas');
            cv.width = w;
            cv.height = h;
            cv.getContext('2d').drawImage(img, 0, 0, w, h);
            res(cv.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => res(dataUrl);
        img.src = dataUrl;
    });
}
function fileToDataUrl(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); }); }
// ---- Ø§Ø¨Ø²Ø§Ø± ØªØ§Ø±ÛŒØ® Ø´Ù…Ø³ÛŒ (ØªØ¨Ø¯ÛŒÙ„ + Ø§Ù†ØªØ®Ø§Ø¨Ú¯Ø±) ----
function gregToJalali(gy, gm, gd) {
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let jy = (gy <= 1600) ? 0 : 979;
    gy -= (gy <= 1600) ? 621 : 1600;
    let gy2 = (gm > 2) ? (gy + 1) : gy;
    let days = (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
    jy += 33 * Math.floor(days / 12053);
    days %= 12053;
    jy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) {
        jy += Math.floor((days - 1) / 365);
        days = (days - 1) % 365;
    }
    const jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
    const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
    return [jy, jm, jd];
}
function jalaliToGreg(jy, jm, jd) {
    jy = +jy;
    jm = +jm;
    jd = +jd;
    let gy = (jy <= 979) ? 621 : 1600;
    jy -= (jy <= 979) ? 0 : 979;
    let days = (365 * jy) + (Math.floor(jy / 33) * 8) + Math.floor(((jy % 33) + 3) / 4) + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
    gy += 400 * Math.floor(days / 146097);
    days %= 146097;
    if (days > 36524) {
        gy += 100 * Math.floor(--days / 36524);
        days %= 36524;
        if (days >= 365)
            days++;
    }
    gy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) {
        gy += Math.floor((days - 1) / 365);
        days = (days - 1) % 365;
    }
    let gd = days + 1;
    const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let gm = 0;
    for (gm = 1; gm <= 12; gm++) {
        if (gd <= sal_a[gm])
            break;
        gd -= sal_a[gm];
    }
    return [gy, gm, gd];
}
const J_MONTHS = ["ÙØ±ÙˆØ±Ø¯ÛŒÙ†", "Ø§Ø±Ø¯ÛŒØ¨Ù‡Ø´Øª", "Ø®Ø±Ø¯Ø§Ø¯", "ØªÛŒØ±", "Ù…Ø±Ø¯Ø§Ø¯", "Ø´Ù‡Ø±ÛŒÙˆØ±", "Ù…Ù‡Ø±", "Ø¢Ø¨Ø§Ù†", "Ø¢Ø°Ø±", "Ø¯ÛŒ", "Ø¨Ù‡Ù…Ù†", "Ø§Ø³ÙÙ†Ø¯"];
function todayJ() { const n = new Date(); return gregToJalali(n.getFullYear(), n.getMonth() + 1, n.getDate()); }
function todayJStr() { const [y, m, d] = todayJ(); return `${y}/${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}`; }
function isoFromJ(jy, jm, jd) { const [gy, gm, gd] = jalaliToGreg(jy, jm, jd); return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`; }
function jLabel(iso) { if (!iso)
    return ""; const [y, m, d] = iso.split("-").map(Number); const [jy, jm, jd] = gregToJalali(y, m, d); return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`; }
function seniorityLabel(iso) { if (!iso)
    return ""; const d = new Date(String(iso).replace(' ', 'T')); if (isNaN(d))
    return ""; const now = new Date(); let mo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()); if (now.getDate() < d.getDate())
    mo--; if (mo < 0)
    return "ØªØ§Ø±ÛŒØ® Ù†Ø§Ù…Ø¹ØªØ¨Ø±"; const y = Math.floor(mo / 12), m = mo % 12; return `Ø³Ù†ÙˆØ§Øª: ${fa(y)} Ø³Ø§Ù„ Ùˆ ${fa(m)} Ù…Ø§Ù‡`; }
/* KHATYAR_REACT_JDATE_V2 */
function JDate({ value, onChange, placeholder, jalali, yearFrom, yearTo, portal = false }) {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef(null);
    const [popupStyle, setPopupStyle] = useState(null);
    useEffect(() => {
        if (!open || !portal)
            return;
        const position = () => {
            var _a;
            const rect = (_a = triggerRef.current) === null || _a === void 0 ? void 0 : _a.getBoundingClientRect();
            if (!rect)
                return;
            const width = Math.min(330, window.innerWidth - 24);
            const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
            const below = window.innerHeight - rect.bottom - 12;
            const above = rect.top - 12;
            const placeAbove = below < 380 && above > below;
            // The inline calendar defaults to right:0. Clear that anchor when portaled;
            // otherwise RTL layout ignores `left` and pins the popup to the viewport edge.
            setPopupStyle({ position: 'fixed', right: 'auto', left, top: placeAbove ? 'auto' : rect.bottom + 7, bottom: placeAbove ? window.innerHeight - rect.top + 7 : 'auto', width, maxHeight: Math.max(180, (placeAbove ? above : below) - 9), overflowY: 'auto', zIndex: 2147483000 });
        };
        position();
        window.addEventListener('resize', position);
        window.addEventListener('scroll', position, true);
        return () => { window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true); };
    }, [open, portal]);
    const parse = () => {
        const raw = String(value || '').trim();
        if (!raw)
            return null;
        const sep = raw.includes('/') ? '/' : '-';
        const p = raw.split(sep).map(Number);
        if (p.length < 3 || p.some(v => !Number.isFinite(v) || v <= 0))
            return null;
        return jalali ? p : gregToJalali(p[0], p[1], p[2]);
    };
    const selected = parse();
    const initial = selected ? { y: selected[0], m: selected[1] } : (() => { const t = todayJ(); return { y: t[0], m: t[1] }; })();
    const [view, setView] = useState(initial);
    useEffect(() => { const p = parse(); if (p)
        setView({ y: p[0], m: p[1] }); }, [value, jalali]);
    const daysIn = (y, m) => {
        const a = jalaliToGreg(y, m, 1), b = jalaliToGreg(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1);
        return a && b ? Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86400000) : (m <= 6 ? 31 : (m <= 11 ? 30 : 29));
    };
    const firstWeekday = (y, m) => {
        const g = jalaliToGreg(y, m, 1);
        return g ? ((new Date(Date.UTC(g[0], g[1] - 1, g[2], 12)).getUTCDay() + 1) % 7) : 0;
    };
    const [ty, tm, td] = todayJ();
    const yf = yearFrom || Math.max(1200, ty - 80), yt = yearTo || ty + 20;
    const years = [];
    for (let y = yt; y >= yf; y--)
        years.push(y);
    const monthLen = daysIn(view.y, view.m), first = firstWeekday(view.y, view.m), cells = [];
    for (let i = 0; i < first; i++)
        cells.push(React.createElement("span", { key: 'e' + i, style: { height: 36 } }));
    const emit = (y, m, d) => onChange(jalali ? `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}` : isoFromJ(y, m, d));
    for (let d = 1; d <= monthLen; d++) {
        const sel = !!selected && selected[0] === view.y && selected[1] === view.m && selected[2] === d;
        const tod = ty === view.y && tm === view.m && td === d;
        cells.push(React.createElement("button", { key: d, type: "button", className: sel ? "btn p" : "btn g", style: { height: 36, padding: 0, fontSize: 11, fontWeight: sel || tod ? 800 : 500, boxShadow: tod ? 'inset 0 0 0 1.5px var(--brand)' : 'none' }, onClick: () => { emit(view.y, view.m, d); setOpen(false); } }, fa(d)));
    }
    const shift = (delta) => { let y = view.y, m = view.m + delta; if (m < 1) {
        m = 12;
        y--;
    } if (m > 12) {
        m = 1;
        y++;
    } if (y >= yf && y <= yt)
        setView({ y, m }); };
    const label = () => selected ? `${fa(selected[0])}/${fa(String(selected[1]).padStart(2, '0'))}/${fa(String(selected[2]).padStart(2, '0'))}` : '';
    const calendar = open && React.createElement("div", { style: { position: 'absolute', zIndex: 2147483000, background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 12, boxShadow: '0 18px 50px rgba(0,0,0,.18)', top: 'calc(100% + 7px)', right: 0, width: 330, direction: 'rtl', ...(portal ? popupStyle || { visibility: 'hidden' } : {}) } },
        React.createElement("div", { style: { display: 'grid', gridTemplateColumns: '36px 1fr 36px', gap: 6, alignItems: 'center', marginBottom: 8 } },
            React.createElement("button", { type: "button", className: "btn g", onClick: () => shift(-1) }, "\u2039"),
            React.createElement("div", { style: { display: 'flex', gap: 6, justifyContent: 'center' } },
                React.createElement("select", { className: "input", value: view.m, onChange: e => setView(v => ({ ...v, m: +e.target.value })), style: { padding: '6px 8px', fontSize: 11, maxWidth: 120 } }, J_MONTHS.map((m, i) => React.createElement("option", { key: i + 1, value: i + 1 }, m))),
                React.createElement("select", { className: "input", value: view.y, onChange: e => setView(v => ({ ...v, y: +e.target.value })), style: { padding: '6px 8px', fontSize: 11, maxWidth: 90 } }, years.map(y => React.createElement("option", { key: y, value: y }, fa(y))))),
            React.createElement("button", { type: "button", className: "btn g", onClick: () => shift(1) }, "\u203A")),
        React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 5 } }, ['Ø´', 'ÛŒ', 'Ø¯', 'Ø³', 'Ú†', 'Ù¾', 'Ø¬'].map(x => React.createElement("span", { key: x, style: { textAlign: 'center', fontSize: 10, fontWeight: 800, color: 'var(--muted)' } }, x))),
        React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 } }, cells),
        React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', marginTop: 9, paddingTop: 9, borderTop: '1px solid var(--line)' } },
            React.createElement("button", { type: "button", className: "btn g", onClick: () => { emit(ty, tm, td); setView({ y: ty, m: tm }); setOpen(false); } }, "\u0627\u0645\u0631\u0648\u0632"),
            React.createElement("button", { type: "button", className: "btn t", onClick: () => setOpen(false) }, "\u0628\u0633\u062A\u0646")));
    return React.createElement("span", { ref: triggerRef, style: { position: 'relative', display: 'inline-block', width: '100%', minWidth: 0 } },
        React.createElement("input", { className: "input", readOnly: true, value: label(), placeholder: placeholder || 'ØªØ§Ø±ÛŒØ®', onClick: () => setOpen(v => !v), style: { cursor: 'pointer', maxWidth: 150, width: '100%' } }),
        value && React.createElement("button", { type: "button", onClick: () => onChange(''), style: { position: 'absolute', left: 6, top: 8, background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)', zIndex: 2 } }, "\u2715"),
        portal && typeof document !== 'undefined' && (ReactDOM === null || ReactDOM === void 0 ? void 0 : ReactDOM.createPortal) ? ReactDOM.createPortal(calendar, document.body) : calendar);
}
function _g2j(gy, gm, gd) {
    const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334], gy2 = gm > 2 ? gy + 1 : gy;
    let days = 355666 + 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + gdm[gm - 1];
    let jy = -1595 + 33 * Math.floor(days / 12053);
    days %= 12053;
    jy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) {
        jy += Math.floor((days - 1) / 365);
        days = (days - 1) % 365;
    }
    let jm, jd;
    if (days < 186) {
        jm = 1 + Math.floor(days / 31);
        jd = 1 + days % 31;
    }
    else {
        jm = 7 + Math.floor((days - 186) / 30);
        jd = 1 + (days - 186) % 30;
    }
    return [jy, jm, jd];
}
function _p2(n) { return String(n).padStart(2, '0'); }
function fj(s) {
    if (!s)
        return '';
    try {
        const raw = String(s).trim(), m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2}))?/);
        let Y, M, D, h = 0, mi = 0;
        const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw);
        if (m && !hasZone) {
            Y = +m[1];
            M = +m[2];
            D = +m[3];
            h = +(m[4] || 0);
            mi = +(m[5] || 0);
        }
        else {
            const d = new Date(raw.replace(' ', 'T'));
            if (isNaN(d))
                return raw;
            const t = new Date(d.getTime() + 210 * 60000);
            Y = t.getUTCFullYear();
            M = t.getUTCMonth() + 1;
            D = t.getUTCDate();
            h = t.getUTCHours();
            mi = t.getUTCMinutes();
        }
        const j = _g2j(Y, M, D);
        return faPlain(`${j[0]}/${_p2(j[1])}/${_p2(j[2])} ${_p2(h)}:${_p2(mi)}`);
    }
    catch (e) {
        return String(s);
    }
}
function faDate(value) {
    if (value === null || value === undefined || value === '')
        return 'â€”';
    try {
        return fj(value) || 'â€”';
    }
    catch (e) {
        return String(value || 'â€”');
    }
}
function faTime(value) {
    if (value === null || value === undefined || value === '')
        return "â€”";
    try {
        const raw = String(value).trim();
        const timeOnly = raw.match(/(?:^|\s|T)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
        if (timeOnly)
            return faPlain(String(timeOnly[1]).padStart(2, '0') + ':' + timeOnly[2]);
        const d = new Date(raw.replace(' ', 'T'));
        if (!isNaN(d.getTime()))
            return faPlain(d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', hour12: false }));
        return faPlain(raw);
    }
    catch (e) {
        return "â€”";
    }
}
const STATUS_FA = { sent: "Ø§Ø±Ø³Ø§Ù„â€ŒØ´Ø¯Ù‡", seen: "Ø¯ÛŒØ¯Ù‡â€ŒØ´Ø¯Ù‡", answered: "Ù¾Ø§Ø³Ø®â€ŒØ¯Ø§Ø¯Ù‡â€ŒØ´Ø¯Ù‡", forwarded: "Ø§Ø±Ø¬Ø§Ø¹â€ŒØ´Ø¯Ù‡", closed: "Ø¨Ø³ØªÙ‡â€ŒØ´Ø¯Ù‡" };
const badgeCls = s => s === "answered" ? "b-ok" : s === "forwarded" ? "b-no" : "b-w";
const fa = n => { const x = Number(n); return Number.isFinite(x) ? x.toLocaleString("fa") : "â€”"; };
const faPlain = n => (n === null || n === undefined) ? "" : String(n).replace(/[0-9]/g, d => "Û°Û±Û²Û³Û´ÛµÛ¶Û·Û¸Û¹"[+d]);
const onlyDigits = v => String(v || "").replace(/[Û°-Û¹]/g, d => String("Û°Û±Û²Û³Û´ÛµÛ¶Û·Û¸Û¹".indexOf(d))).replace(/[Ù -Ù©]/g, d => String("Ù Ù¡Ù¢Ù£Ù¤Ù¥Ù¦Ù§Ù¨Ù©".indexOf(d))).replace(/\D/g, "");
// Ù‡ÙˆÚ© ØµÙØ­Ù‡â€ŒØ¨Ù†Ø¯ÛŒ Ø³Ù…Øªâ€ŒÚ©Ù„Ø§ÛŒÙ†Øª: Ù¾ÛŒØ´â€ŒÙØ±Ø¶ Û±Û° Ø¢ÛŒØªÙ…ØŒ Ù‚Ø§Ø¨Ù„ ØªÙ†Ø¸ÛŒÙ…ØŒ Ø¨Ø§ Ù‚Ø¨Ù„ÛŒ/Ø¨Ø¹Ø¯ÛŒ
function usePager(items, initial) {
    const [page, setPage] = useState(1);
    const [per, setPer] = useState(initial || 10);
    const arr = Array.isArray(items) ? items : [];
    const total = arr.length;
    const pages = Math.max(1, Math.ceil(total / per));
    const cur = Math.min(page, pages);
    const slice = arr.slice((cur - 1) * per, cur * per);
    const Pager = () => total === 0 ? null : (React.createElement("div", { className: "row", style: { gap: 8, justifyContent: "center", alignItems: "center", marginTop: 12, flexWrap: "wrap" } },
        React.createElement("button", { className: "btn g", disabled: cur <= 1, onClick: () => setPage(cur - 1) }, "\u0642\u0628\u0644\u06CC"),
        React.createElement("span", { style: { alignSelf: "center" } },
            "\u0635\u0641\u062D\u0647\u0654 ",
            fa(cur),
            " \u0627\u0632 ",
            fa(pages),
            " \u00B7 \u0645\u062C\u0645\u0648\u0639 ",
            fa(total)),
        React.createElement("button", { className: "btn g", disabled: cur >= pages, onClick: () => setPage(cur + 1) }, "\u0628\u0639\u062F\u06CC"),
        React.createElement("span", { style: { color: "var(--muted)", fontSize: 12 } }, "\u062A\u0639\u062F\u0627\u062F \u062F\u0631 \u0635\u0641\u062D\u0647:"),
        React.createElement("select", { className: "input", style: { maxWidth: 80 }, value: per, onChange: e => { setPer(+e.target.value); setPage(1); } },
            React.createElement("option", { value: 10 }, "\u06F1\u06F0"),
            React.createElement("option", { value: 25 }, "\u06F2\u06F5"),
            React.createElement("option", { value: 50 }, "\u06F5\u06F0"),
            React.createElement("option", { value: 100 }, "\u06F1\u06F0\u06F0"))));
    return { slice, Pager, setPage };
}
function LiveStaffDashboard() {
    const tj = todayJ();
    const [live, setLive] = useState(null);
    const [tab, setTab] = useState("present");
    const [loadError, setLoadError] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState(null);
    const [modalSearch, setModalSearch] = useState("");
    const [refreshCountdown, setRefreshCountdown] = useState(60);
    const countdownRef = useRef(60);
    const load = () => {
        setRefreshing(true);
        return db.workDashboard(tj[0], tj[1]).then(x => {
            if (!x || !x.live)
                throw new Error("Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ø­Ø¶ÙˆØ± Ø¯Ø± Ù¾Ø§Ø³Ø® Ø³Ø±ÙˆØ± Ù…ÙˆØ¬ÙˆØ¯ Ù†ÛŒØ³Øª.");
            setLive(x.live);
            setLoadError("");
        }).catch(e => setLoadError((e === null || e === void 0 ? void 0 : e.message) || "Ø¯Ø±ÛŒØ§ÙØª ÙˆØ¶Ø¹ÛŒØª Ø­Ø¶ÙˆØ± Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯")).finally(() => setRefreshing(false));
    };
    const refreshNow = () => { countdownRef.current = 60; setRefreshCountdown(60); load(); };
    useEffect(() => {
        load();
        const iv = setInterval(() => {
            countdownRef.current -= 1;
            if (countdownRef.current <= 0) {
                countdownRef.current = 60;
                load();
            }
            setRefreshCountdown(countdownRef.current);
        }, 1000);
        return () => clearInterval(iv);
    }, []);
    const methodFa = { gps: "GPS", wifi: "Wiâ€‘Fi", manual: "Ø¯Ø³ØªÛŒ", gsm: "GSM" };
    const [sortConfig, setSortConfig] = useState({ key: "check_in", direction: "asc" });
    if (!live)
        return React.createElement("div", { className: "panel dashboard-live dashboard-live-placeholder", role: "status" },
            React.createElement("h3", null, "\u0648\u0636\u0639\u06CC\u062A \u0644\u062D\u0638\u0647\u200C\u0627\u06CC \u062D\u0636\u0648\u0631 \u067E\u0631\u0633\u0646\u0644"),
            React.createElement("p", { className: "muted" }, loadError || "Ø¯Ø± Ø­Ø§Ù„ Ø¯Ø±ÛŒØ§ÙØª ÙˆØ¶Ø¹ÛŒØª Ø­Ø¶ÙˆØ± Ù¾Ø±Ø³Ù†Ù„â€¦"),
            loadError && React.createElement("button", { type: "button", className: "btn p", onClick: refreshNow }, "\u062A\u0644\u0627\u0634 \u0645\u062C\u062F\u062F"));
    const isOpenSession = (r) => { var _a; return r.is_open === true || r.is_open === 1 || ["1", "true", "open"].includes(String((_a = r.is_open) !== null && _a !== void 0 ? _a : "").trim().toLowerCase()); };
    const baseRows = tab === "present" ? [...(live.present_list || [])].filter(isOpenSession) : tab === "leave" ? (live.leave_list || []) : (live.absent_list || []);
    const absenceReason = (r) => String(r.absence_reason || r.reason || r.absent_reason || r.status_reason || r.reason_text || r.leave_reason || r.request_reason || r.note || "Ø«Ø¨Øª Ù†Ø´Ø¯Ù‡").trim();
    const statusLists = { present: live.present_list || [], absent: live.absent_list || [], leave: live.leave_list || [] };
    const allStaff = [...statusLists.present, ...statusLists.absent, ...statusLists.leave];
    const statusCards = [["total", "Ú©Ù„ Ù¾Ø±Ø³Ù†Ù„", live.total], ["present", "Ø­Ø§Ø¶Ø± Ø¯Ø± Ø´ÛŒÙØª", live.present], ["absent", "ØºØ§ÛŒØ¨", live.absent], ["leave", "Ù…Ø±Ø®ØµÛŒ/Ù…Ø§Ù…ÙˆØ±ÛŒØª", live.leave]];
    const selectedRows = selectedStatus === "total" ? allStaff : (statusLists[selectedStatus] || []);
    const searchText = modalSearch.trim().toLocaleLowerCase("fa");
    const modalRows = selectedRows.filter(r => !searchText || [r.name, r.role_title, r.line_code, absenceReason(r)].some(x => String(x !== null && x !== void 0 ? x : "").toLocaleLowerCase("fa").includes(searchText)));
    const statusLabel = key => { var _a; return ((_a = statusCards.find(([k]) => k === key)) === null || _a === void 0 ? void 0 : _a[1]) || ""; };
    const statusForRow = r => statusLists.present.includes(r) ? "Ø­Ø§Ø¶Ø±" : statusLists.leave.includes(r) ? "Ù…Ø±Ø®ØµÛŒ/Ù…Ø£Ù…ÙˆØ±ÛŒØª" : "ØºØ§ÛŒØ¨";
    const sortValue = (r, key) => {
        var _a, _b;
        if (key === "check_in") {
            const raw = String(r.check_in || "").trim();
            const m = raw.match(/(?:^|T|\s)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
            if (m)
                return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] || 0);
            const stamp = Date.parse(raw);
            return Number.isFinite(stamp) ? stamp : Number.MAX_SAFE_INTEGER;
        }
        if (key === "line_code") {
            const raw = String((_a = r.line_code) !== null && _a !== void 0 ? _a : "").trim(), n = Number(raw);
            return raw !== "" && Number.isFinite(n) ? n : raw;
        }
        if (key === "is_open")
            return isOpenSession(r) ? 1 : 0;
        if (key === "method")
            return String(methodFa[r.method] || r.method || "");
        return String((_b = r[key]) !== null && _b !== void 0 ? _b : "");
    };
    const rows = tab === "present" ? [...baseRows].sort((a, b) => {
        const av = sortValue(a, sortConfig.key), bv = sortValue(b, sortConfig.key);
        let cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), "fa", { numeric: true, sensitivity: "base" });
        if (sortConfig.key === "check_in" && av === Number.MAX_SAFE_INTEGER && bv !== Number.MAX_SAFE_INTEGER)
            cmp = 1;
        else if (sortConfig.key === "check_in" && bv === Number.MAX_SAFE_INTEGER && av !== Number.MAX_SAFE_INTEGER)
            cmp = -1;
        return sortConfig.direction === "asc" ? cmp : -cmp;
    }) : baseRows;
    const sortButton = (key, label) => React.createElement("button", { type: "button", className: "btn g", onClick: () => setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc" })), "aria-label": "Ù…Ø±ØªØ¨â€ŒØ³Ø§Ø²ÛŒ " + label, title: "Ù…Ø±ØªØ¨â€ŒØ³Ø§Ø²ÛŒ " + label, style: { padding: "2px 6px", marginInlineStart: 5, fontSize: 11, lineHeight: 1.4, whiteSpace: "nowrap" } }, sortConfig.key === key ? (sortConfig.direction === "asc" ? "â†‘" : "â†“") : "â†•");
    return React.createElement("section", { className: "panel dashboard-live", "aria-label": "\u0648\u0636\u0639\u06CC\u062A \u0644\u062D\u0638\u0647\u200C\u0627\u06CC \u062D\u0636\u0648\u0631 \u067E\u0631\u0633\u0646\u0644" },
        React.createElement("div", { className: "dashboard-live-head" },
            React.createElement("div", null,
                React.createElement("span", { className: "dashboard-section-kicker" }, "\u067E\u0627\u06CC\u0634 \u0628\u0631\u062E\u0637 \u0646\u06CC\u0631\u0648\u0647\u0627"),
                React.createElement("h3", null, "\u0648\u0636\u0639\u06CC\u062A \u0644\u062D\u0638\u0647\u200C\u0627\u06CC \u062D\u0636\u0648\u0631 \u067E\u0631\u0633\u0646\u0644"),
                React.createElement("div", { className: "dashboard-live-meta" },
                    React.createElement("span", null,
                        "\u0627\u0645\u0631\u0648\u0632 ",
                        faPlain(live.jdate || "")),
                    React.createElement("span", { "aria-hidden": "true" }, "\u00B7"),
                    React.createElement("span", null,
                        "\u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0628\u0639\u062F\u06CC: ",
                        fa(refreshCountdown),
                        " \u062B\u0627\u0646\u06CC\u0647"))),
            React.createElement("button", { type: "button", className: "btn g dashboard-live-refresh", disabled: refreshing, onClick: refreshNow }, refreshing ? "Ø¯Ø± Ø­Ø§Ù„ Ø¯Ø±ÛŒØ§ÙØªâ€¦" : "â†» Ø¨Ø±ÙˆØ²Ø±Ø³Ø§Ù†ÛŒ")),
        loadError && React.createElement("div", { className: "dashboard-live-warning", role: "status" },
            "\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0642\u0628\u0644\u06CC \u0646\u0645\u0627\u06CC\u0634 \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F\u061B \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F: ",
            loadError),
        React.createElement("div", { className: "kpis dashboard-live-stats" }, statusCards.map(([key, label, count]) => React.createElement("button", { type: "button", key: key, onClick: () => { setModalSearch(""); setSelectedStatus(key); }, title: "Ù…Ø´Ø§Ù‡Ø¯Ù‡ ÙÙ‡Ø±Ø³Øª " + label, "aria-label": "Ù…Ø´Ø§Ù‡Ø¯Ù‡ " + fa(count || 0) + " Ù†ÙØ±: " + label, className: "kpi dashboard-live-stat dashboard-live-stat-" + key },
            React.createElement("div", { className: "n" }, fa(count || 0)),
            React.createElement("div", { className: "l" }, label),
            React.createElement("span", { className: "dashboard-live-stat-action" },
                "\u0645\u0634\u0627\u0647\u062F\u0647 \u0641\u0647\u0631\u0633\u062A ",
                React.createElement("span", { "aria-hidden": "true" }, "\u2039"))))),
        React.createElement("div", { className: "dashboard-live-list-head" },
            React.createElement("h4", null, "\u0641\u0647\u0631\u0633\u062A \u0648\u0636\u0639\u06CC\u062A \u0646\u06CC\u0631\u0648\u0647\u0627"),
            React.createElement("span", { className: "muted" },
                fa(rows.length),
                " \u0645\u0648\u0631\u062F")),
        React.createElement("div", { className: "tabbar dashboard-live-tabs", role: "tablist", "aria-label": "\u0641\u06CC\u0644\u062A\u0631 \u0648\u0636\u0639\u06CC\u062A \u062D\u0636\u0648\u0631" }, [["present", "Ø­Ø§Ø¶Ø±ÛŒÙ†"], ["absent", "ØºØ§ÛŒØ¨ÛŒÙ†"], ["leave", "Ù…Ø±Ø®ØµÛŒ Ùˆ Ù…Ø£Ù…ÙˆØ±ÛŒØª"]].map(([k, l]) => React.createElement("button", { type: "button", role: "tab", "aria-selected": tab === k, key: k, onClick: () => setTab(k), className: tab === k ? "dashboard-live-tab-active" : "" }, l))),
        rows.length === 0 ? React.createElement("p", { className: "dashboard-live-empty" }, "\u0645\u0648\u0631\u062F\u06CC \u0628\u0631\u0627\u06CC \u0646\u0645\u0627\u06CC\u0634 \u062F\u0631 \u0627\u06CC\u0646 \u0648\u0636\u0639\u06CC\u062A \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0631\u062F.") : React.createElement("div", { className: "table-wrap dashboard-live-table", tabIndex: 0, role: "region", "aria-label": "\u062C\u062F\u0648\u0644 \u062D\u0636\u0648\u0631 \u067E\u0631\u0633\u0646\u0644\u061B \u0642\u0627\u0628\u0644 \u067E\u06CC\u0645\u0627\u06CC\u0634 \u0627\u0641\u0642\u06CC" },
            React.createElement("table", null,
                React.createElement("thead", null,
                    React.createElement("tr", null,
                        React.createElement("th", null,
                            "\u0646\u0627\u0645 ",
                            tab === "present" && sortButton("name", "Ù†Ø§Ù…")),
                        React.createElement("th", null,
                            "\u0633\u0645\u062A ",
                            tab === "present" && sortButton("role_title", "Ø³Ù…Øª")),
                        tab === "absent" && React.createElement("th", null, "\u0639\u0644\u062A \u063A\u06CC\u0628\u062A"),
                        tab === "present" && React.createElement(React.Fragment, null,
                            React.createElement("th", null,
                                "\u0633\u0627\u0639\u062A \u0648\u0631\u0648\u062F ",
                                sortButton("check_in", "Ø³Ø§Ø¹Øª ÙˆØ±ÙˆØ¯")),
                            React.createElement("th", null,
                                "\u062E\u0637 ",
                                sortButton("line_code", "Ø®Ø·")),
                            React.createElement("th", null,
                                "\u0631\u0648\u0634 ",
                                sortButton("method", "Ø±ÙˆØ´")),
                            React.createElement("th", null,
                                "\u0648\u0636\u0639\u06CC\u062A ",
                                sortButton("is_open", "ÙˆØ¶Ø¹ÛŒØª"))))),
                React.createElement("tbody", null, rows.map((r, i) => React.createElement("tr", { key: r.user_id || i },
                    React.createElement("td", null, r.name || "â€”"),
                    React.createElement("td", null, r.role_title || "â€”"),
                    tab === "absent" && React.createElement("td", null, absenceReason(r)),
                    tab === "present" && React.createElement(React.Fragment, null,
                        React.createElement("td", null, r.check_in ? faTime(r.check_in) : "â€”"),
                        React.createElement("td", null, r.line_code ? ("Ø®Ø· " + fa(r.line_code) + (r.line_description ? " â€” " + r.line_description : "")) : "â€”"),
                        React.createElement("td", null, methodFa[r.method] || r.method || "â€”"),
                        React.createElement("td", null,
                            React.createElement("span", { className: "badge " + (isOpenSession(r) ? "ok" : "muted") }, isOpenSession(r) ? "Ø¯Ø§Ø®Ù„ Ø´ÛŒÙØª" : "Ø®Ø±ÙˆØ¬ Ø«Ø¨Øª Ø´Ø¯Ù‡")))))))),
        selectedStatus && React.createElement(Modal, { title: "ÙÙ‡Ø±Ø³Øª " + statusLabel(selectedStatus) + " â€” " + fa(selectedRows.length) + " Ù†ÙØ±", onClose: () => setSelectedStatus(null), style: { width: "min(850px,95vw)", maxWidth: "95vw", maxHeight: "85vh", overflowY: "auto", direction: "rtl" } },
            React.createElement("div", { style: { display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", marginBottom: 12 } },
                React.createElement("span", { className: "muted" },
                    "\u062A\u0627\u0631\u06CC\u062E: ",
                    faPlain(live.jdate || ""),
                    " \u00B7 \u062A\u0639\u062F\u0627\u062F: ",
                    fa(selectedRows.length)),
                React.createElement("input", { className: "input", "aria-label": "\u062C\u0633\u062A\u200C\u0648\u062C\u0648\u06CC \u0646\u06CC\u0631\u0648\u0647\u0627\u06CC \u062D\u0627\u0636\u0631\u060C \u063A\u0627\u06CC\u0628 \u06CC\u0627 \u0645\u0631\u062E\u0635\u06CC", placeholder: "\u062C\u0633\u062A\u200C\u0648\u062C\u0648\u06CC \u0646\u0627\u0645\u060C \u0633\u0645\u062A \u06CC\u0627 \u062E\u0637\u2026", value: modalSearch, onChange: e => setModalSearch(e.target.value), style: { width: "100%", maxWidth: 320 } })),
            React.createElement("div", { style: { maxHeight: "55vh", overflow: "auto" } },
                React.createElement("table", { style: { width: "100%" } },
                    React.createElement("thead", null,
                        React.createElement("tr", null,
                            React.createElement("th", null, "\u0631\u062F\u06CC\u0641"),
                            React.createElement("th", null, "\u0646\u0627\u0645 \u0648 \u0646\u0627\u0645 \u062E\u0627\u0646\u0648\u0627\u062F\u06AF\u06CC"),
                            React.createElement("th", null, "\u0633\u0645\u062A"),
                            React.createElement("th", null, "\u0648\u0636\u0639\u06CC\u062A"),
                            React.createElement("th", null, "\u0648\u0631\u0648\u062F"),
                            React.createElement("th", null, "\u062E\u0637"),
                            React.createElement("th", null, "\u062A\u0648\u0636\u06CC\u062D\u0627\u062A"))),
                    React.createElement("tbody", null, modalRows.map((r, i) => {
                        var _a;
                        return React.createElement("tr", { key: ((_a = r.user_id) !== null && _a !== void 0 ? _a : "row") + "-" + i },
                            React.createElement("td", null, fa(i + 1)),
                            React.createElement("td", null, r.name || "â€”"),
                            React.createElement("td", null, r.role_title || "â€”"),
                            React.createElement("td", null, statusForRow(r)),
                            React.createElement("td", null, r.check_in ? faTime(r.check_in) : "â€”"),
                            React.createElement("td", null, r.line_code ? ("Ø®Ø· " + fa(r.line_code)) : "â€”"),
                            React.createElement("td", null, statusLists.absent.includes(r) ? absenceReason(r) : statusLists.present.includes(r) ? (isOpenSession(r) ? "Ø¯Ø§Ø®Ù„ Ø´ÛŒÙØª" : "Ø®Ø±ÙˆØ¬ Ø«Ø¨Øª Ø´Ø¯Ù‡") : (r.reason || r.leave_reason || "â€”")));
                    }))),
                modalRows.length === 0 && React.createElement("p", { className: "muted", style: { padding: 14, textAlign: "center" } }, "\u0634\u062E\u0635\u06CC \u0628\u0627 \u0645\u0634\u062E\u0635\u0627\u062A \u0648\u0627\u0631\u062F\u0634\u062F\u0647 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F.")),
            React.createElement("div", { style: { marginTop: 14, textAlign: "left" } },
                React.createElement("button", { type: "button", className: "btn g", onClick: () => setSelectedStatus(null) }, "\u0628\u0633\u062A\u0646"))));
}
function PersonnelDistributionDashboard() {
    var _a;
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [selected, setSelected] = useState(null);
    const [search, setSearch] = useState("");
    useEffect(() => {
        let active = true;
        Promise.all([db.users(), db.roles(), db.zones()]).then(([users, roles, zones]) => {
            if (active)
                setData({ users: Array.isArray(users) ? users.filter(user => Number(user.is_active) === 1) : [], roles: Array.isArray(roles) ? roles : [], zones: Array.isArray(zones) ? zones : [] });
        }).catch(e => { if (active)
            setError((e === null || e === void 0 ? void 0 : e.message) || "Ø¯Ø±ÛŒØ§ÙØª Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ù¾Ø±Ø³Ù†Ù„ Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯"); });
        return () => { active = false; };
    }, []);
    if (error)
        return React.createElement("div", { className: "panel personnel-stats" },
            React.createElement("span", { className: "muted" },
                "\u0622\u0645\u0627\u0631 \u0646\u06CC\u0631\u0648\u0647\u0627 \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A: ",
                error));
    if (!data)
        return React.createElement("div", { className: "panel personnel-stats" },
            React.createElement("span", { className: "muted" }, "\u062F\u0631 \u062D\u0627\u0644 \u062F\u0631\u06CC\u0627\u0641\u062A \u0622\u0645\u0627\u0631 \u0646\u06CC\u0631\u0648\u0647\u0627\u2026"));
    const { users, roles, zones } = data;
    const roleName = new Map(roles.map(r => [String(r.id), r.title || r.name]));
    const zoneName = new Map(zones.map(z => [String(z.id), z.name || z.title]));
    // The modal and its counter must use exactly the same grouping expression.
    const getRole = u => String(roleName.get(String(u.role_id)) || u.role_title || u.role_name || "").trim();
    const getZone = u => { var _a; return String(zoneName.get(String((_a = u.zone_id) !== null && _a !== void 0 ? _a : u.region_id)) || u.zone_name || u.region_name || "").trim(); };
    const groupBy = getName => {
        const grouped = new Map();
        for (const u of users) {
            const name = getName(u);
            if (name && name !== "â€”") {
                if (!grouped.has(name))
                    grouped.set(name, []);
                grouped.get(name).push(u);
            }
        }
        return [...grouped.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "fa"));
    };
    const roleGroups = groupBy(getRole);
    const zoneGroups = groupBy(getZone);
    const cards = (items, kind) => React.createElement("div", { className: "kpis personnel-stat-grid" }, items.map(([name, people]) => React.createElement("button", { type: "button", className: "kpi personnel-stat-card", key: name, title: "Ù…Ø´Ø§Ù‡Ø¯Ù‡ ÙÙ‡Ø±Ø³Øª " + name, "aria-label": "Ù…Ø´Ø§Ù‡Ø¯Ù‡ " + fa(people.length) + " Ù†ÙØ± Ø¯Ø± " + name, onClick: () => { setSearch(""); setSelected({ kind, name }); }, style: { fontFamily: "inherit", color: "inherit", cursor: "pointer", textAlign: "inherit", width: "100%", border: "1px solid var(--line,#d9e3e0)", transition: "border-color .15s" } },
        React.createElement("div", { className: "personnel-stat-number" },
            fa(people.length),
            " ",
            React.createElement("span", null, "\u0646\u0641\u0631")),
        React.createElement("div", { className: "l" }, name),
        React.createElement("span", { className: "personnel-stat-view" }, "\u0645\u0634\u0627\u0647\u062F\u0647 \u0627\u0641\u0631\u0627\u062F \u2039"))));
    const activeGroups = (selected === null || selected === void 0 ? void 0 : selected.kind) === "role" ? roleGroups : zoneGroups;
    const matching = selected ? (((_a = activeGroups.find(([name]) => name === selected.name)) === null || _a === void 0 ? void 0 : _a[1]) || []) : [];
    const q = search.trim().toLocaleLowerCase("fa");
    const shown = matching.filter(u => !q || [
        u.first_name, u.last_name, u.username, u.personnel_code, getRole(u), getZone(u)
    ].some(v => String(v !== null && v !== void 0 ? v : "").toLocaleLowerCase("fa").includes(q)));
    const fullName = u => [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.name || u.full_name || u.username || "â€”";
    return React.createElement("section", { className: "panel personnel-stats dashboard-personnel", "aria-label": "\u0622\u0645\u0627\u0631 \u0646\u06CC\u0631\u0648\u0647\u0627" },
        React.createElement("div", { className: "dashboard-section-head" },
            React.createElement("div", null,
                React.createElement("span", { className: "dashboard-section-kicker" }, "\u062A\u0631\u06A9\u06CC\u0628 \u0633\u0627\u0632\u0645\u0627\u0646\u06CC"),
                React.createElement("h2", null, "\u0622\u0645\u0627\u0631 \u0648 \u062A\u0648\u0632\u06CC\u0639 \u0646\u06CC\u0631\u0648\u0647\u0627")),
            React.createElement("span", { className: "dashboard-section-caption" }, "\u0628\u0631 \u0627\u0633\u0627\u0633 \u0641\u0647\u0631\u0633\u062A \u067E\u0631\u0633\u0646\u0644\u060C \u0645\u0633\u062A\u0642\u0644 \u0627\u0632 \u062D\u0636\u0648\u0631 \u0648 \u063A\u06CC\u0627\u0628")),
        React.createElement("div", { className: "personnel-stat-section-head" },
            React.createElement("h4", null, "\u062A\u0639\u062F\u0627\u062F \u0646\u06CC\u0631\u0648\u0647\u0627 \u0628\u0647 \u062A\u0641\u06A9\u06CC\u06A9 \u0633\u0645\u062A"),
            React.createElement("span", null,
                fa(roleGroups.length),
                " \u0633\u0645\u062A")),
        cards(roleGroups, "role"),
        React.createElement("div", { className: "personnel-stat-section-head" },
            React.createElement("h4", null, "\u062A\u0639\u062F\u0627\u062F \u0646\u06CC\u0631\u0648\u0647\u0627 \u0628\u0647 \u062A\u0641\u06A9\u06CC\u06A9 \u0645\u0646\u0637\u0642\u0647"),
            React.createElement("span", null,
                fa(zoneGroups.length),
                " \u0645\u0646\u0637\u0642\u0647")),
        cards(zoneGroups, "zone"),
        selected && React.createElement(Modal, { title: (selected.kind === "role" ? "Ù†ÛŒØ±ÙˆÙ‡Ø§ÛŒ Ø³Ù…Øª: " : "Ù†ÛŒØ±ÙˆÙ‡Ø§ÛŒ Ù…Ù†Ø·Ù‚Ù‡: ") + selected.name, onClose: () => setSelected(null), style: { width: "min(760px,94vw)", maxWidth: "94vw", maxHeight: "85vh", overflowY: "auto", direction: "rtl" } },
            React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" } },
                React.createElement("span", { className: "muted" },
                    "\u062A\u0639\u062F\u0627\u062F: ",
                    React.createElement("b", null, fa(matching.length)),
                    " \u0646\u0641\u0631"),
                React.createElement("input", { className: "input", "aria-label": "\u062C\u0633\u062A\u200C\u0648\u062C\u0648\u06CC \u0627\u0641\u0631\u0627\u062F", placeholder: "\u062C\u0633\u062A\u200C\u0648\u062C\u0648\u06CC \u0646\u0627\u0645 \u06CC\u0627 \u06A9\u062F \u067E\u0631\u0633\u0646\u0644\u06CC\u2026", value: search, onChange: e => setSearch(e.target.value), style: { maxWidth: 320, width: "100%" } })),
            React.createElement("div", { style: { overflowX: "auto", maxHeight: "54vh", overflowY: "auto" } },
                React.createElement("table", { style: { width: "100%" } },
                    React.createElement("thead", null,
                        React.createElement("tr", null,
                            React.createElement("th", null, "\u0631\u062F\u06CC\u0641"),
                            React.createElement("th", null, "\u0646\u0627\u0645 \u0648 \u0646\u0627\u0645 \u062E\u0627\u0646\u0648\u0627\u062F\u06AF\u06CC"),
                            React.createElement("th", null, "\u06A9\u062F \u067E\u0631\u0633\u0646\u0644\u06CC"),
                            React.createElement("th", null, "\u0633\u0645\u062A"),
                            React.createElement("th", null, "\u0645\u0646\u0637\u0642\u0647"),
                            React.createElement("th", null, "\u0648\u0636\u0639\u06CC\u062A"))),
                    React.createElement("tbody", null, shown.map((u, i) => React.createElement("tr", { key: u.id || u.username || i },
                        React.createElement("td", null, fa(i + 1)),
                        React.createElement("td", null, fullName(u)),
                        React.createElement("td", null, u.personnel_code ? fa(u.personnel_code) : "â€”"),
                        React.createElement("td", null, getRole(u) || "â€”"),
                        React.createElement("td", null, getZone(u) || "â€”"),
                        React.createElement("td", null, u.is_active == 1 || u.is_active === true ? "ÙØ¹Ø§Ù„" : "ØºÛŒØ±ÙØ¹Ø§Ù„"))))),
                shown.length === 0 && React.createElement("div", { className: "muted", style: { padding: 16, textAlign: "center" } }, "\u0634\u062E\u0635\u06CC \u0628\u0627 \u0627\u06CC\u0646 \u0645\u0634\u062E\u0635\u0627\u062A \u06CC\u0627\u0641\u062A \u0646\u0634\u062F.")),
            React.createElement("div", { style: { marginTop: 14, textAlign: "left" } },
                React.createElement("button", { type: "button", className: "btn g", onClick: () => setSelected(null) }, "\u0628\u0633\u062A\u0646"))));
}
function ResponsiveTable({ children, ...props }) {
    return React.createElement("div", { className: "table-wrap", tabIndex: 0, role: "region", "aria-label": "\u062C\u062F\u0648\u0644 \u0627\u0637\u0644\u0627\u0639\u0627\u062A\u061B \u0628\u0631\u0627\u06CC \u0645\u0634\u0627\u0647\u062F\u0647 \u0633\u062A\u0648\u0646\u200C\u0647\u0627\u06CC \u0628\u06CC\u0634\u062A\u0631 \u067E\u06CC\u0645\u0627\u06CC\u0634 \u06A9\u0646\u06CC\u062F" },
        React.createElement("table", { ...props }, children));
}
function BirthdayCelebration({ bdays }) {
    if (!bdays || !Array.isArray(bdays.people))
        return null;
    const people = bdays.people.filter(p => p.is_today || Number(p.days_left) > 0);
    if (!people.length)
        return null;
    const ordered = [...people].sort((a, b) => (a.is_today ? 0 : 1) - (b.is_today ? 0 : 1) || Number(a.days_left) - Number(b.days_left));
    return React.createElement("section", { className: "birthday-celebration", "aria-label": "\u0633\u0627\u0644\u06AF\u0631\u062F \u062A\u0648\u0644\u062F \u0647\u0645\u06A9\u0627\u0631\u0627\u0646" },
        React.createElement("div", { className: "birthday-celebration-head" },
            React.createElement("div", { className: "birthday-celebration-icon", "aria-hidden": "true" }, "\uD83C\uDF82"),
            React.createElement("div", { className: "birthday-celebration-heading" },
                React.createElement("span", { className: "birthday-celebration-eyebrow" }, "\u0645\u0646\u0627\u0633\u0628\u062A\u200C\u0647\u0627\u06CC \u0627\u06CC\u0646 \u0645\u0627\u0647"),
                React.createElement("h2", null,
                    "\u0633\u0627\u0644\u06AF\u0631\u062F \u062A\u0648\u0644\u062F \u0647\u0645\u06A9\u0627\u0631\u0627\u0646 ",
                    React.createElement("span", null,
                        "\u062F\u0631 \u0645\u0627\u0647 ",
                        bdays.month_name)),
                React.createElement("p", null, "\u0628\u0647 \u0647\u0645\u06A9\u0627\u0631\u0627\u0646 \u0639\u0632\u06CC\u0632\u0645\u0627\u0646 \u062A\u0628\u0631\u06CC\u06A9 \u0645\u06CC\u200C\u06AF\u0648\u06CC\u06CC\u0645 \u0648 \u0628\u0631\u0627\u06CC\u0634\u0627\u0646 \u0631\u0648\u0632\u0647\u0627\u06CC\u06CC \u067E\u0631 \u0627\u0632 \u0634\u0627\u062F\u06CC \u0622\u0631\u0632\u0648 \u062F\u0627\u0631\u06CC\u0645.")),
            React.createElement("span", { className: "birthday-celebration-count" },
                fa(people.length),
                " \u0646\u0641\u0631")),
        React.createElement("div", { className: "birthday-celebration-grid" }, ordered.map((p, i) => {
            const status = p.is_today ? "today" : "upcoming";
            const statusText = p.is_today ? "Ø§Ù…Ø±ÙˆØ²ØŒ ØªÙˆÙ„Ø¯Øª Ù…Ø¨Ø§Ø±Ú©!" : fa(p.days_left) + " Ø±ÙˆØ² Ù…Ø§Ù†Ø¯Ù‡";
            return React.createElement("article", { className: "birthday-person birthday-person-" + status, key: p.id || p.birth_date + "-" + i },
                React.createElement("div", { className: "birthday-person-avatar", "aria-hidden": "true" }, p.is_today ? "ğŸ‰" : p.days_left > 0 ? "ğŸ" : "ğŸˆ"),
                React.createElement("div", { className: "birthday-person-details" },
                    React.createElement("h3", null, p.name),
                    React.createElement("div", { className: "birthday-person-role" }, p.role_title || "Ù‡Ù…Ú©Ø§Ø± Ø®Ø·ÛŒØ§Ø±"),
                    React.createElement("div", { className: "birthday-person-date" },
                        React.createElement("span", null, "\u0633\u0627\u0644\u06AF\u0631\u062F \u062A\u0648\u0644\u062F"),
                        React.createElement("b", null,
                            fa(p.day),
                            " ",
                            bdays.month_name),
                        React.createElement("span", { className: "birthday-person-year" }, faPlain(p.birth_date || "")))),
                React.createElement("span", { className: "birthday-person-status" }, statusText));
        })));
}
function Dashboard() {
    const [s, setS] = useState(null);
    const [tw, setTw] = useState({ top: [], bottom: [] });
    const [bdays, setBdays] = useState(null);
    const [loadErr, setLoadErr] = useState("");
    const [loading, setLoading] = useState(true);
    const loadStats = () => {
        setLoading(true);
        setLoadErr("");
        db.stats().then(setS).catch(e => setLoadErr(e && e.message ? e.message : "Ø®Ø·Ø§ Ø¯Ø± Ø¯Ø±ÛŒØ§ÙØª Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ø¯Ø§Ø´Ø¨ÙˆØ±Ø¯")).finally(() => setLoading(false));
    };
    useEffect(() => { loadStats(); GET("/admin/birthdays-month").then(setBdays).catch(() => { }); db.topWorkers().then(setTw).catch(() => { }); }, []);
    if (loading && !s)
        return React.createElement("div", { className: "panel", style: { margin: "14px 0" } },
            React.createElement("div", { className: "row", style: { justifyContent: "space-between", alignItems: "center", gap: 10 } },
                React.createElement("span", null, "\u062F\u0631 \u062D\u0627\u0644 \u062F\u0631\u06CC\u0627\u0641\u062A \u0627\u0637\u0644\u0627\u0639\u0627\u062A \u062F\u0627\u0634\u0628\u0648\u0631\u062F\u2026"),
                React.createElement("span", { className: "muted", style: { fontSize: 12 } }, "\u0644\u0637\u0641\u0627\u064B \u0686\u0646\u062F \u0644\u062D\u0638\u0647 \u0635\u0628\u0631 \u06A9\u0646\u06CC\u062F")));
    if (loadErr && !s)
        return React.createElement("div", { className: "panel", style: { margin: "14px 0", border: "1px solid #f0caca" } },
            React.createElement("h3", { style: { marginTop: 0 } }, "\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u062F\u0627\u0634\u0628\u0648\u0631\u062F \u062F\u0631\u06CC\u0627\u0641\u062A \u0646\u0634\u062F"),
            React.createElement("p", { style: { color: "var(--danger)", fontSize: 13, lineHeight: 1.9 } }, loadErr),
            React.createElement("button", { className: "btn p", onClick: loadStats }, "\u062A\u0644\u0627\u0634 \u0645\u062C\u062F\u062F"));
    if (!s)
        return React.createElement("div", { className: "panel", style: { margin: "14px 0" } }, "\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u062F\u0627\u0634\u0628\u0648\u0631\u062F \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A.");
    const K = [["Ø±Ø§Ù†Ù†Ø¯Ù‡ ÙØ¹Ø§Ù„", s.drivers, "Ú©Ø§Ø±Ø¨Ø±Ø§Ù† ÙØ¹Ø§Ù„ Ù†Ø§ÙˆÚ¯Ø§Ù†"], ["Ø®Ø· ÙØ¹Ø§Ù„", s.lines, "Ø®Ø·ÙˆØ· Ø¯Ø± Ø­Ø§Ù„ Ø¨Ù‡Ø±Ù‡â€ŒØ¨Ø±Ø¯Ø§Ø±ÛŒ"], ["Ø­Ø¶ÙˆØ± Ø§Ù…Ø±ÙˆØ²", s.today_attendance, "ØªØ±Ø¯Ø¯ Ø«Ø¨Øªâ€ŒØ´Ø¯Ù‡ Ø§Ù…Ø±ÙˆØ²"], ["ÙÛŒØ´ Ù¾Ø±Ø¯Ø§Ø®Øªâ€ŒÙ†Ø´Ø¯Ù‡", s.unpaid_bills, "Ù†ÛŒØ§Ø²Ù…Ù†Ø¯ Ù¾ÛŒÚ¯ÛŒØ±ÛŒ"], ["ØªØ°Ú©Ø± Ø§ÛŒÙ† Ù…Ø§Ù‡", s.notices_month, "Ù…ÙˆØ§Ø±Ø¯ Ø«Ø¨Øªâ€ŒØ´Ø¯Ù‡ Ù…Ø§Ù‡ Ø¬Ø§Ø±ÛŒ"]];
    return (React.createElement("div", { className: "dashboard-page" },
        React.createElement(BirthdayCelebration, { bdays: bdays }),
        React.createElement("section", { className: "dashboard-overview", "aria-label": "\u0622\u0645\u0627\u0631 \u06A9\u0644\u06CC \u0633\u0627\u0645\u0627\u0646\u0647" },
            React.createElement("div", { className: "dashboard-section-head" },
                React.createElement("div", null,
                    React.createElement("span", { className: "dashboard-section-kicker" }, "\u0646\u0645\u0627\u06CC \u06A9\u0644\u06CC \u0633\u0627\u0645\u0627\u0646\u0647"),
                    React.createElement("h2", null, "\u0622\u0645\u0627\u0631 \u0648 \u0634\u0627\u062E\u0635\u200C\u0647\u0627\u06CC \u0627\u0635\u0644\u06CC")),
                React.createElement("span", { className: "dashboard-section-caption" }, "\u062E\u0644\u0627\u0635\u0647 \u0648\u0636\u0639\u06CC\u062A \u062C\u0627\u0631\u06CC \u062E\u0637\u06CC\u0627\u0631")),
            React.createElement("div", { className: "kpis dashboard-overview-grid" }, K.map(([l, n, desc], i) => React.createElement("div", { className: "kpi", key: l },
                React.createElement("span", { className: "dashboard-kpi-index", "aria-hidden": "true" }, fa(i + 1).padStart(2, "Û°")),
                React.createElement("div", { className: "n" }, n == null ? "â€”" : fa(n)),
                React.createElement("div", { className: "l" }, l),
                React.createElement("div", { className: "dashboard-kpi-desc" }, desc))))),
        React.createElement(PersonnelDistributionDashboard, null),
        React.createElement(LiveStaffDashboard, null),
        tw && tw.groups && tw.groups.length > 0 ? React.createElement("section", { className: "dashboard-workers", "aria-label": "\u06A9\u0627\u0631\u0627\u06CC\u06CC \u0646\u06CC\u0631\u0648\u0647\u0627" },
            React.createElement("div", { className: "dashboard-section-head" },
                React.createElement("div", null,
                    React.createElement("span", { className: "dashboard-section-kicker" }, "\u0627\u0631\u0632\u06CC\u0627\u0628\u06CC \u0639\u0645\u0644\u06A9\u0631\u062F"),
                    React.createElement("h2", null, "\u06A9\u0627\u0631\u0627\u06CC\u06CC \u0646\u06CC\u0631\u0648\u0647\u0627 \u0628\u0647 \u062A\u0641\u06A9\u06CC\u06A9 \u0633\u0645\u062A")),
                React.createElement("span", { className: "dashboard-section-caption" }, tw.zone_scope === "own" ? "Ù…Ø­Ø¯ÙˆØ¯Ù‡ Ù…Ù†Ø·Ù‚Ù‡ Ø´Ù…Ø§" : "Ù¾Ø±Ú©Ø§Ø±ØªØ±ÛŒÙ† Ùˆ Ú©Ù…â€ŒÚ©Ø§Ø±ØªØ±ÛŒÙ† Ù‡Ù…Ú©Ø§Ø±Ø§Ù†")),
            React.createElement("div", { className: "grid2 dashboard-worker-grid" },
                tw.groups.map((g, i) => React.createElement(WorkerGroup, { key: g.key, title: g.title, data: g, color: GROUP_COLORS[g.key] || "#0d7a5f" })),
                tw.groups.length % 2 === 1 ? React.createElement("div", null) : null)) : React.createElement("p", { className: "muted", style: { padding: 16 } }, "\u062F\u0627\u062F\u0647\u200C\u0627\u06CC \u0628\u0631\u0627\u06CC \u0646\u0645\u0627\u06CC\u0634 \u06A9\u0627\u0631\u0627\u06CC\u06CC \u0646\u06CC\u0631\u0648\u0647\u0627 \u0646\u06CC\u0633\u062A.")));
}
const GROUP_COLORS = { supervisor: "#0d7a5f", operator: "#0891b2", admin_staff: "#2563eb", chief_inspector: "#7c3aed", inspector: "#d97706" };
// Ù†Ù…Ø§ÛŒØ´ Ù¾Ø±Ú©Ø§Ø±ØªØ±ÛŒÙ†/Ú©Ù…â€ŒÚ©Ø§Ø±ØªØ±ÛŒÙ† ÛŒÚ© Ú¯Ø±ÙˆÙ‡ Ù†Ù‚Ø´ + Ù¾Ù†Ø¬Ø±Ù‡Ù” Ø¨Ø§Ù„Ù†ÛŒ Ø¬Ø²Ø¦ÛŒØ§Øª Ø¨Ø§ Ú©Ù„ÛŒÚ© Ø±ÙˆÛŒ Ù†Ø§Ù…
function WorkerGroup({ title, data, color }) {
    const [pop, setPop] = useState(null);
    const d = data || { top: [], bottom: [] };
    const Row = (x, i, rank) => React.createElement("li", { key: (rank ? 't' : 'b') + (x.id || i) },
        React.createElement("button", { type: "button", className: "dashboard-worker-person", onClick: () => setPop({ x }), "aria-label": "Ù…Ø´Ø§Ù‡Ø¯Ù‡ Ø¬Ø²Ø¦ÛŒØ§Øª Ø¹Ù…Ù„Ú©Ø±Ø¯ " + x.name },
            React.createElement("span", { className: "dashboard-worker-rank" }, fa(i + 1)),
            React.createElement("span", { className: "dashboard-worker-name" }, x.name),
            React.createElement("strong", null, fa(x.total || 0)),
            React.createElement("span", { className: "dashboard-worker-arrow", "aria-hidden": "true" }, "\u2039")));
    return (React.createElement("div", { className: "panel dashboard-worker-card", style: { "--worker-accent": color } },
        React.createElement("div", { className: "dashboard-worker-card-head" },
            React.createElement("span", { className: "dashboard-worker-indicator", "aria-hidden": "true" }),
            React.createElement("h3", null, title)),
        (!d.top || d.top.length === 0) && (!d.bottom || d.bottom.length === 0) ? React.createElement("p", { className: "muted" }, "\u062F\u0627\u062F\u0647\u200C\u0627\u06CC \u0628\u0631\u0627\u06CC \u0627\u06CC\u0646 \u0633\u0645\u062A \u0645\u0648\u062C\u0648\u062F \u0646\u06CC\u0633\u062A.") : React.createElement(React.Fragment, null,
            React.createElement("div", { className: "dashboard-worker-subhead" },
                React.createElement("span", null, "\u067E\u0631\u06A9\u0627\u0631\u062A\u0631\u06CC\u0646"),
                React.createElement("span", null, "\u0645\u062C\u0645\u0648\u0639 \u0641\u0639\u0627\u0644\u06CC\u062A")),
            React.createElement("ol", { className: "dashboard-worker-list" }, (d.top || []).map((x, i) => Row(x, i, true))),
            React.createElement("div", { className: "dashboard-worker-subhead dashboard-worker-subhead-bottom" },
                React.createElement("span", null, "\u06A9\u0645\u200C\u06A9\u0627\u0631\u062A\u0631\u06CC\u0646"),
                React.createElement("span", null, "\u0645\u062C\u0645\u0648\u0639 \u0641\u0639\u0627\u0644\u06CC\u062A")),
            React.createElement("ol", { className: "dashboard-worker-list" }, (d.bottom || []).map((x, i) => Row(x, i, false)))),
        React.createElement("p", { className: "dashboard-worker-hint" }, "\u0628\u0631\u0627\u06CC \u0645\u0634\u0627\u0647\u062F\u0647 \u0631\u06CC\u0632 \u0641\u0639\u0627\u0644\u06CC\u062A\u200C\u0647\u0627\u060C \u0646\u0627\u0645 \u0647\u0631 \u0647\u0645\u06A9\u0627\u0631 \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F."),
        pop && React.createElement(WorkerPop, { x: pop.x, onClose: () => setPop(null) })));
}
function WorkerPop({ x, onClose }) {
    const items = [["Ø«Ø¨Øª Ø­Ø¶ÙˆØ± Ø±Ø§Ù†Ù†Ø¯Ú¯Ø§Ù†", x.attendances], ["Ú†Ú©â€ŒÙ„ÛŒØ³Øª Ø§Ù†Ø¬Ø§Ù…â€ŒØ´Ø¯Ù‡", x.checklists], ["ØªØ°Ú©Ø± Ø¯Ø§Ø¯Ù‡â€ŒØ´Ø¯Ù‡", x.notices], ["ØªÚ©Ù…ÛŒÙ„ ÙØ±Ù…", x.forms], ["Ø­Ø¶ÙˆØ± Ù…Ø³Ø¦ÙˆÙ„ÛŒÙ†", x.visits], ["Ú¯Ø²Ø§Ø±Ø´ Ø§Ø±Ø³Ø§Ù„ÛŒ", x.reports]];
    return (React.createElement("div", { className: "modal-bg", onClick: onClose },
        React.createElement("div", { className: "modal", style: { maxWidth: 360 }, onClick: e => e.stopPropagation() },
            React.createElement("h3", { style: { display: "flex", justifyContent: "space-between" } },
                React.createElement("span", null, x.name),
                React.createElement("b", { style: { color: "var(--brand)" } },
                    "\u0645\u062C\u0645\u0648\u0639: ",
                    fa(x.total))),
            React.createElement("div", { style: { fontSize: 12, color: "var(--muted)", marginBottom: 10 } }, x.role),
            React.createElement("table", null,
                React.createElement("tbody", null, items.map(([l, n], i) => React.createElement("tr", { key: i },
                    React.createElement("td", null, l),
                    React.createElement("td", { style: { textAlign: "left" } },
                        React.createElement("b", null, fa(n || 0))))))),
            React.createElement("button", { className: "btn g", style: { marginTop: 14, width: "100%" }, onClick: onClose }, "\u0628\u0633\u062A\u0646"))));
}
function StationExits() {
    const [rows, setRows] = useState([]);
    const load = () => db.stationExits().then(r => setRows(r || [])).catch(() => { });
    useEffect(() => { load(); const iv = setInterval(load, 15000); return () => clearInterval(iv); }, []);
    return (React.createElement("div", { className: "panel", style: { marginTop: 14 } },
        React.createElement("h3", { style: { display: "flex", justifyContent: "space-between" } },
            React.createElement("span", null, "\uD83D\uDEB6 \u062E\u0631\u0648\u062C \u0646\u06CC\u0631\u0648 \u0627\u0632 \u0645\u062D\u062F\u0648\u062F\u0647\u0654 \u0627\u06CC\u0633\u062A\u06AF\u0627\u0647 (\u0627\u0645\u0631\u0648\u0632)"),
            React.createElement("span", { className: "badge b-no" }, fa(rows.length))),
        React.createElement("div", { style: { maxHeight: 240, overflow: "auto" } },
            React.createElement("table", null,
                React.createElement("thead", null,
                    React.createElement("tr", null,
                        React.createElement("th", null, "\u0646\u06CC\u0631\u0648"),
                        React.createElement("th", null, "\u0633\u0645\u062A"),
                        React.createElement("th", null, "\u0627\u06CC\u0633\u062A\u06AF\u0627\u0647/\u062E\u0637"),
                        React.createElement("th", null, "\u0632\u0645\u0627\u0646 \u062E\u0631\u0648\u062C"),
                        React.createElement("th", null, "\u0646\u0634\u0627\u0646"))),
                React.createElement("tbody", null, rows.length ? rows.map(x => React.createElement("tr", { key: x.id },
                    React.createElement("td", null,
                        React.createElement("b", null, x.name)),
                    React.createElement("td", null, x.role || "â€”"),
                    React.createElement("td", null,
                        x.station_name || "â€”",
                        x.line_code ? ` (Ø®Ø· ${x.line_code})` : ""),
                    React.createElement("td", null, fj(x.exited_at)),
                    React.createElement("td", null, x.lat ? React.createElement("a", { className: "btn g", style: { textDecoration: "none" }, target: "_blank", rel: "noopener", href: `https://maps.google.com/?q=${x.lat},${x.lng}` }, "\u0646\u0634\u0627\u0646") : "â€”")))
                    : React.createElement("tr", null,
                        React.createElement("td", { colSpan: 5, className: "muted", style: { textAlign: "center" } }, "\u0627\u0645\u0631\u0648\u0632 \u062E\u0631\u0648\u062C\u06CC \u0627\u0632 \u0645\u062D\u062F\u0648\u062F\u0647\u0654 \u0627\u06CC\u0633\u062A\u06AF\u0627\u0647 \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A.")))))));
}
function PresenceLists() {
    const [d, setD] = useState({ online: [], offline: [], inactive: [] });
    const load = () => db.presence().then(setD).catch(() => { });
    useEffect(() => { load(); const iv = setInterval(load, 15000); return () => clearInterval(iv); }, []);
    const Col = ({ title, items, color }) => (React.createElement("div", { className: "panel", style: { margin: 0 } },
        React.createElement("h3", { style: { display: "flex", justifyContent: "space-between" } },
            React.createElement("span", null,
                React.createElement("span", { style: { color } }, "\u25CF"),
                " ",
                title),
            React.createElement("span", { className: "badge b-ok" }, fa(items.length))),
        React.createElement("div", { style: { maxHeight: 220, overflow: "auto" } }, items.length ? items.map(x => React.createElement("div", { key: x.id, className: "card-p", style: { display: "block", padding: "7px 9px" } },
            React.createElement("b", { style: { fontSize: 13 } }, x.name),
            React.createElement("div", { className: "muted", style: { fontSize: 11 } },
                x.role,
                x.captured_at ? (" Â· " + fj(x.captured_at)) : ""))) : React.createElement("p", { className: "muted", style: { fontSize: 12 } }, "\u2014"))));
    return (React.createElement("div", null,
        React.createElement("div", { className: "grid3", style: { marginTop: 14, gap: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" } },
            React.createElement(Col, { title: "\u0622\u0646\u0644\u0627\u06CC\u0646", items: d.online, color: "#16a06a" }),
            React.createElement(Col, { title: "\u063A\u06CC\u0631\u0641\u0639\u0627\u0644 (\u0628\u062F\u0648\u0646 \u0645\u0648\u0642\u0639\u06CC\u062A)", items: d.inactive, color: "#f6c324" }),
            React.createElement(Col, { title: "\u0622\u0641\u0644\u0627\u06CC\u0646", items: d.offline, color: "#8a93a6" }))));
}
// Ø§Ù†ØªØ®Ø§Ø¨Ú¯Ø± Ú©Ø§Ø±Ø¨Ø± Ø¨Ø§ Ø¬Ø³ØªØ¬Ùˆ (ØªØ§ÛŒÙ¾ Ø¨Ø®Ø´ÛŒ Ø§Ø² Ù†Ø§Ù…/Ù†Ø§Ù…â€ŒØ®Ø§Ù†ÙˆØ§Ø¯Ú¯ÛŒ)
function UserPicker({ users, value, onChange, placeholder }) {
    const [q, setQ] = useState("");
    const [open, setOpen] = useState(false);
    const list = users || [];
    const sel = list.find(u => String(u.id) === String(value));
    const selName = sel ? ((sel.first_name || "") + " " + (sel.last_name || "")) : "";
    const f = q.trim();
    const filtered = f ? list.filter(u => ((u.first_name || "") + " " + (u.last_name || "")).includes(f)).slice(0, 30) : list.slice(0, 30);
    return (React.createElement("div", { style: { position: "relative", minWidth: 240 } },
        React.createElement("input", { className: "input", placeholder: placeholder || "Ø¬Ø³ØªØ¬ÙˆÛŒ Ú©Ø§Ø±Ø¨Ø±â€¦", value: open ? q : (selName || q), onFocus: () => { setOpen(true); setQ(""); }, onChange: e => { setQ(e.target.value); setOpen(true); } }),
        open && React.createElement("div", { style: { position: "absolute", top: "100%", right: 0, left: 0, background: "#fff", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "var(--shadow)", zIndex: 50, maxHeight: 240, overflow: "auto", marginTop: 4 } }, filtered.length ? filtered.map(u => React.createElement("div", { key: u.id, className: "card-p", style: { margin: 6, cursor: "pointer" }, onClick: () => { onChange(String(u.id)); setOpen(false); setQ(""); } },
            React.createElement("b", { style: { fontSize: 13 } },
                u.first_name,
                " ",
                u.last_name),
            " ",
            React.createElement("small", { className: "muted" }, u.role_title || "")))
            : React.createElement("p", { className: "muted", style: { padding: 10, fontSize: 12 } }, "\u0645\u0648\u0631\u062F\u06CC \u06CC\u0627\u0641\u062A \u0646\u0634\u062F."))));
}
const mapEscapeHtml = value => String(value !== null && value !== void 0 ? value : "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
// ÙÛŒÙ„ØªØ± Ù†Ù…Ø§ÛŒØ´ Ù†Ù‚Ø´Ù‡Ù” Ø²Ù†Ø¯Ù‡: Ø¨Ø± Ø§Ø³Ø§Ø³ Ø³Ù…Øª ÛŒØ§ Ø§Ø´Ø®Ø§Øµ Ø®Ø§Øµ (Ø¨Ø±Ø§ÛŒ Ø§ÙØ²Ø§ÛŒØ´ Ø³Ø±Ø¹Øª Ù†Ù…Ø§ÛŒØ´)
function MapFilters({ allUsers, roleFilter, setRoleFilter, personFilter, setPersonFilter, onApply }) {
    const [roles, setRoles] = React.useState([]);
    const [q, setQ] = React.useState("");
    React.useEffect(() => { db.roles().then(rs => setRoles(rs || [])).catch(() => { }); }, []);
    const toggleRole = (id) => { const cur = roleFilter ? [...roleFilter] : []; const i = cur.indexOf(String(id)); i >= 0 ? cur.splice(i, 1) : cur.push(String(id)); setRoleFilter(cur.length ? cur : null); };
    const togglePerson = (id) => { const cur = personFilter ? [...personFilter] : []; const i = cur.indexOf(String(id)); i >= 0 ? cur.splice(i, 1) : cur.push(String(id)); setPersonFilter(cur.length ? cur : null); };
    const filtered = q.trim() ? allUsers.filter(u => ((u.first_name || "") + " " + (u.last_name || "")).includes(q.trim())) : allUsers;
    return (React.createElement("section", { className: "live-map-filters", "aria-label": "\u0641\u06CC\u0644\u062A\u0631 \u0646\u06CC\u0631\u0648\u0647\u0627\u06CC \u0631\u0648\u06CC \u0646\u0642\u0634\u0647" },
        React.createElement("p", null, "\u0628\u0631\u0627\u06CC \u0646\u0645\u0627\u06CC\u0634 \u0633\u0631\u06CC\u0639\u200C\u062A\u0631 \u0646\u0642\u0634\u0647\u060C \u0633\u0645\u062A\u200C\u0647\u0627 \u06CC\u0627 \u0627\u0634\u062E\u0627\u0635 \u0645\u0648\u0631\u062F\u0646\u0638\u0631 \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F. \u0628\u062F\u0648\u0646 \u0627\u0646\u062A\u062E\u0627\u0628\u060C \u0647\u0645\u0647 \u0646\u0645\u0627\u06CC\u0634 \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F."),
        React.createElement("div", { style: { marginBottom: 10 } },
            React.createElement("b", { style: { fontSize: 13 } }, "\u0646\u0645\u0627\u06CC\u0634 \u0628\u0631 \u0627\u0633\u0627\u0633 \u0633\u0645\u062A:"),
            React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 } }, roles.map(r => {
                const on = roleFilter && roleFilter.includes(String(r.id));
                return (React.createElement("label", { key: r.id, style: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, background: on ? "var(--brand)" : "#fff", color: on ? "#fff" : "var(--ink)", borderRadius: 8, padding: "4px 10px", cursor: "pointer", border: "1px solid var(--line)" } },
                    React.createElement("input", { type: "checkbox", checked: !!on, onChange: () => toggleRole(r.id), style: { margin: 0 } }),
                    r.title));
            }))),
        React.createElement("div", null,
            React.createElement("b", { style: { fontSize: 13 } }, "\u06CC\u0627 \u0646\u0645\u0627\u06CC\u0634 \u0627\u0634\u062E\u0627\u0635 \u0645\u0634\u062E\u0635:"),
            React.createElement("input", { className: "input", "aria-label": "\u062C\u0633\u062A\u200C\u0648\u062C\u0648\u06CC \u0646\u0627\u0645 \u0634\u062E\u0635 \u0628\u0631\u0627\u06CC \u0641\u06CC\u0644\u062A\u0631 \u0646\u0642\u0634\u0647", style: { marginTop: 6, marginBottom: 6 }, placeholder: "\u062C\u0633\u062A\u062C\u0648\u06CC \u0646\u0627\u0645 \u0634\u062E\u0635\u2026", value: q, onChange: e => setQ(e.target.value) }),
            React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 160, overflowY: "auto" } }, filtered.slice(0, 100).map(u => {
                const on = personFilter && personFilter.includes(String(u.id));
                return (React.createElement("label", { key: u.id, style: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, background: on ? "var(--brand)" : "#fff", color: on ? "#fff" : "var(--ink)", borderRadius: 8, padding: "4px 10px", cursor: "pointer", border: "1px solid var(--line)" } },
                    React.createElement("input", { type: "checkbox", checked: !!on, onChange: () => togglePerson(u.id), style: { margin: 0 } }),
                    u.first_name,
                    " ",
                    u.last_name));
            }))),
        React.createElement("div", { className: "row", style: { gap: 8, marginTop: 10 } },
            React.createElement("button", { className: "btn p", onClick: onApply }, "\u0627\u0639\u0645\u0627\u0644 \u0641\u06CC\u0644\u062A\u0631"),
            React.createElement("button", { className: "btn g", onClick: () => { setRoleFilter(null); setPersonFilter(null); onApply({ roles: null, people: null }); } }, "\u0646\u0645\u0627\u06CC\u0634 \u0647\u0645\u0647"))));
}
// Ú©Ù†ØªØ±Ù„ Ù¾Ø®Ø´ Ù…Ø³ÛŒØ± Ø·ÛŒâ€ŒØ´Ø¯Ù‡ Ø±ÙˆÛŒ Ù†Ù‚Ø´Ù‡ Ø¨Ø§ Ù†Ø´Ø§Ù†Ú¯Ø± Ù…ØªØ­Ø±Ú©ØŒ ØªÙ†Ø¸ÛŒÙ… Ø³Ø±Ø¹Øª Ùˆ Ù…ÛŒØ§Ù†Ú¯ÛŒÙ† Ø³Ø±Ø¹Øª Ø¨ÛŒÙ† Ù†Ù‚Ø§Ø·
function PlaybackControls({ trkPts, pbIdx, setPbIdx, pbPlaying, setPbPlaying, pbSpeed, setPbSpeed, mapRef, pbMarkerRef, pbIvRef }) {
    const pts = (trkPts || []).filter(p => p.lat && p.lng);
    // ÙØ§ØµÙ„Ù‡Ù” Ù‡Ø§ÙˆØ±Ø³Ø§ÛŒÙ† Ø¨ÛŒÙ† Ø¯Ùˆ Ù†Ù‚Ø·Ù‡ (Ù…ØªØ±)
    const dist = (a, b) => {
        const R = 6371000, toR = x => x * Math.PI / 180;
        const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
        const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(s));
    };
    // Ù…ÛŒØ§Ù†Ú¯ÛŒÙ† Ø³Ø±Ø¹Øª Ø¨ÛŒÙ† Ù†Ù‚Ø·Ù‡Ù” ÙØ¹Ù„ÛŒ Ùˆ Ù‚Ø¨Ù„ÛŒ (km/h)
    const speedAt = (i) => {
        if (i <= 0 || i >= pts.length)
            return 0;
        const a = pts[i - 1], b = pts[i];
        const d = dist({ lat: +a.lat, lng: +a.lng }, { lat: +b.lat, lng: +b.lng }); // Ù…ØªØ±
        const dt = (new Date(b.captured_at) - new Date(a.captured_at)) / 1000; // Ø«Ø§Ù†ÛŒÙ‡
        if (dt <= 0)
            return 0;
        return (d / dt) * 3.6;
    };
    // Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯Ù† Ù†Ø´Ø§Ù†Ú¯Ø± Ø±ÙˆÛŒ Ù†Ù‚Ø·Ù‡Ù” ÙØ¹Ù„ÛŒ
    const placeMarker = (i) => {
        const map = mapRef.current;
        if (!map || !pts[i])
            return;
        const ll = [+pts[i].lat, +pts[i].lng];
        if (!pbMarkerRef.current) {
            pbMarkerRef.current = L.circleMarker(ll, { radius: 9, color: "#fff", weight: 3, fillColor: "#e3342f", fillOpacity: 1 }).addTo(map);
        }
        else
            pbMarkerRef.current.setLatLng(ll);
        map.panTo(ll, { animate: true, duration: 0.3 });
    };
    React.useEffect(() => { if (pts.length)
        placeMarker(pbIdx); }, [pbIdx]);
    React.useEffect(() => {
        if (pbPlaying) {
            pbIvRef.current = setInterval(() => {
                setPbIdx(prev => { if (prev >= pts.length - 1) {
                    setPbPlaying(false);
                    return prev;
                } return prev + 1; });
            }, Math.max(120, 1000 / pbSpeed));
        }
        else if (pbIvRef.current) {
            clearInterval(pbIvRef.current);
            pbIvRef.current = null;
        }
        return () => { if (pbIvRef.current) {
            clearInterval(pbIvRef.current);
            pbIvRef.current = null;
        } };
    }, [pbPlaying, pbSpeed]);
    React.useEffect(() => () => { const map = mapRef.current; if (pbMarkerRef.current && map) {
        map.removeLayer(pbMarkerRef.current);
        pbMarkerRef.current = null;
    } }, []);
    if (!pts.length)
        return null;
    const cur = pts[pbIdx] || {};
    const spd = speedAt(pbIdx);
    return (React.createElement("div", { style: { background: "var(--brand-soft,#eef7f3)", borderRadius: 10, padding: 12, marginBottom: 12, border: "1px solid var(--line)" } },
        React.createElement("div", { className: "row", style: { gap: 10, alignItems: "center", flexWrap: "wrap" } },
            React.createElement("button", { className: "btn p", onClick: () => setPbPlaying(!pbPlaying), style: { minWidth: 90 } }, pbPlaying ? "â¸ ØªÙˆÙ‚Ù" : "â–¶ Ù¾Ø®Ø´ Ù…Ø³ÛŒØ±"),
            React.createElement("button", { className: "btn g", onClick: () => { setPbPlaying(false); setPbIdx(0); } }, "\u23EE \u0627\u0628\u062A\u062F\u0627"),
            React.createElement("span", { className: "label" }, "\u0633\u0631\u0639\u062A \u067E\u062E\u0634:"),
            React.createElement("select", { className: "input", style: { maxWidth: 90, padding: "5px 8px" }, value: pbSpeed, onChange: e => setPbSpeed(+e.target.value) },
                React.createElement("option", { value: "0.5" }, "\u06F0\u066B\u06F5\u00D7"),
                React.createElement("option", { value: "1" }, "\u06F1\u00D7"),
                React.createElement("option", { value: "2" }, "\u06F2\u00D7"),
                React.createElement("option", { value: "4" }, "\u06F4\u00D7"),
                React.createElement("option", { value: "8" }, "\u06F8\u00D7"))),
        React.createElement("input", { type: "range", min: "0", max: pts.length - 1, value: pbIdx, onChange: e => { setPbPlaying(false); setPbIdx(+e.target.value); }, style: { width: "100%", marginTop: 12, accentColor: "#0d7a5f" } }),
        React.createElement("div", { className: "row", style: { justifyContent: "space-between", fontSize: 12.5, marginTop: 6, flexWrap: "wrap", gap: 6 } },
            React.createElement("span", null,
                "\u0646\u0642\u0637\u0647 ",
                fa(pbIdx + 1),
                " \u0627\u0632 ",
                fa(pts.length)),
            React.createElement("span", null, cur.captured_at ? fj(cur.captured_at) : ""),
            React.createElement("span", { style: { fontWeight: 700, color: spd > 0 ? "#0d7a5f" : "var(--muted)" } },
                "\u0645\u06CC\u0627\u0646\u06AF\u06CC\u0646 \u0633\u0631\u0639\u062A: ",
                fa(Math.round(spd)),
                " km/h"))));
}
function LiveMap() {
    const ref = useRef();
    const mapRef = useRef();
    const lineRef = useRef();
    const layerRef = useRef();
    const [mode, setMode] = useState("live");
    const [people, setPeople] = useState([]);
    const [trkUser, setTrkUser] = useState("");
    const trkIv = useRef(null);
    const [fromD, setFromD] = useState("");
    const [toD, setToD] = useState("");
    const [trkInfo, setTrkInfo] = useState(null);
    const [trkPts, setTrkPts] = useState(null);
    const [fences, setFences] = useState([]);
    const [trkExits, setTrkExits] = useState([]);
    const [fromT, setFromT] = useState("00:00");
    const [toT, setToT] = useState("23:59");
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    useEffect(() => { db.usersLite().then(l => setAllUsers((l || []).slice().sort((a, b) => ((a.first_name || '') + ' ' + (a.last_name || '')).localeCompare((b.first_name || '') + ' ' + (b.last_name || ''), 'fa')))).catch(() => { }); }, []);
    const [mapProvider, setMapProvider] = useState(localStorage.mapProvider || "osm");
    const [shiftFilter, setShiftFilter] = useState(() => localStorage.liveShiftFilter === "1");
    const [onlyOnline, setOnlyOnline] = useState(() => localStorage.liveOnlyOnline === "1");
    const onlyOnlineRef = useRef(onlyOnline);
    const shiftFilterRef = useRef(shiftFilter);
    const liveRequestRef = useRef(false);
    const liveMountedRef = useRef(false);
    const refreshPendingRef = useRef(false);
    const [liveLoading, setLiveLoading] = useState(true);
    const [liveError, setLiveError] = useState('');
    const [liveUpdated, setLiveUpdated] = useState(null);
    const [mapDiagnostic, setMapDiagnostic] = useState(null);
    const [diagnosticBusy, setDiagnosticBusy] = useState(false);
    const diagnoseMap = async () => { if (diagnosticBusy)
        return; setDiagnosticBusy(true); try {
        setMapDiagnostic(await GET('/locations/live-diagnostics' + (shiftFilterRef.current ? '?shift_only=1' : ''), { timeoutMs: 20000 }));
    }
    catch (error) {
        setMapDiagnostic({ error: error.message });
    }
    finally {
        setDiagnosticBusy(false);
    } };
    useEffect(() => { onlyOnlineRef.current = onlyOnline; localStorage.liveOnlyOnline = onlyOnline ? "1" : ""; }, [onlyOnline]);
    const [roleFilter, setRoleFilter] = useState(() => { try {
        return JSON.parse(localStorage.liveRoleFilter || "null");
    }
    catch (e) {
        return null;
    } }); // null = Ù‡Ù…Ù‡
    const [personFilter, setPersonFilter] = useState(() => { try {
        return JSON.parse(localStorage.livePersonFilter || "null");
    }
    catch (e) {
        return null;
    } }); // null = Ù‡Ù…Ù‡
    const [showFilters, setShowFilters] = useState(false);
    // ÙˆØ¶Ø¹ÛŒØª Ù¾Ø®Ø´ Ù…Ø³ÛŒØ± (playback)
    const [pbIdx, setPbIdx] = useState(0);
    const [pbPlaying, setPbPlaying] = useState(false);
    const [pbSpeed, setPbSpeed] = useState(1);
    const pbMarkerRef = useRef(null);
    const pbIvRef = useRef(null);
    const [viewTab, setViewTab] = useState("main"); // main | live | report | exits
    const roleFilterRef = useRef(roleFilter);
    const personFilterRef = useRef(personFilter);
    useEffect(() => { roleFilterRef.current = roleFilter; localStorage.liveRoleFilter = JSON.stringify(roleFilter); }, [roleFilter]);
    useEffect(() => { personFilterRef.current = personFilter; localStorage.livePersonFilter = JSON.stringify(personFilter); }, [personFilter]);
    const [mapKeys, setMapKeys] = useState({});
    useEffect(() => { db.settings().then(s => setMapKeys({ neshan: s.neshan_api_key || "", balad: s.balad_api_key || "" })).catch(() => { }); }, []);
    const baseRef = useRef(null);
    const tileFor = (prov) => {
        const k = mapKeys || {};
        switch (prov) {
            case "google": return { url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", opts: { attribution: "Â© Google", maxZoom: 20 } };
            case "google_sat": return { url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", opts: { attribution: "Â© Google", maxZoom: 20 } };
            case "balad": return { url: "https://tile-{s}.balad.ir/v1/main/{z}/{x}/{y}.png", opts: { attribution: "Â© Ø¨Ù„Ø¯", subdomains: ["a", "b", "c"], maxZoom: 18 } };
            case "neshan":
                // ØªØ§ÛŒÙ„ Ù†Ø´Ø§Ù† Ø§Ø² Ø·Ø±ÛŒÙ‚ Ø³Ø±ÙˆØ± SDK Ù†Ø´Ø§Ù† (Ø¨Ø§ Ú©Ù„ÛŒØ¯ ÙˆØ¨). Ø§Ù„Ú¯ÙˆÛŒ Ø±Ø³Ù…ÛŒ SDK Ù†Ø´Ø§Ù†.
                if (k.neshan)
                    return { url: "https://static.neshan.org/sdk/leaflet/1.4.0/standard-day/{z}/{x}/{y}.png", opts: { attribution: "Â© Ù†Ø´Ø§Ù†", maxZoom: 19 }, note: false };
                return { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", opts: { attribution: "Â© OSM (Ú©Ù„ÛŒØ¯ Ù†Ø´Ø§Ù† ØªÙ†Ø¸ÛŒÙ… Ù†Ø´Ø¯Ù‡)", maxZoom: 19 }, note: true };
            default: return { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", opts: { attribution: "Â© OpenStreetMap", maxZoom: 19 } };
        }
    };
    const applyBase = (prov) => {
        const map = mapRef.current;
        if (!map)
            return;
        if (baseRef.current) {
            map.removeLayer(baseRef.current);
            baseRef.current = null;
        }
        const t = tileFor(prov);
        const opts = { ...t.opts, crossOrigin: true };
        const layer = L.tileLayer(t.url, opts);
        // Ø§Ú¯Ø± ØªØ§ÛŒÙ„ Ù†Ø´Ø§Ù† Ù„ÙˆØ¯ Ù†Ø´Ø¯ (Ù…Ø«Ù„Ø§Ù‹ Ø¯Ø§Ù…Ù†Ù‡ whitelist Ù†Ø´Ø¯Ù‡)ØŒ Ø®ÙˆØ¯Ú©Ø§Ø± Ø¨Ù‡ OpenStreetMap Ø¨Ø±Ú¯Ø±Ø¯
        if (prov === "neshan") {
            let errCount = 0;
            layer.on("tileerror", () => {
                errCount++;
                if (errCount >= 3 && baseRef.current === layer) {
                    map.removeLayer(layer);
                    baseRef.current = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "Â© OSM (Ù†Ø´Ø§Ù† Ø¯Ø± Ø¯Ø³ØªØ±Ø³ Ù†Ø¨ÙˆØ¯)", maxZoom: 19, crossOrigin: true }).addTo(map);
                    if (baseRef.current.bringToBack)
                        baseRef.current.bringToBack();
                }
            });
        }
        baseRef.current = layer.addTo(map);
        if (baseRef.current.bringToBack)
            baseRef.current.bringToBack();
    };
    useEffect(() => { if (mapRef.current && mapProvider === "neshan")
        applyBase(mapProvider); }, [mapKeys.neshan]);
    const changeProvider = (prov) => { setMapProvider(prov); localStorage.mapProvider = prov; applyBase(prov); };
    // Ø±Ù†Ú¯ Ø®Ø· Ø¯ÙˆØ± ØªØµÙˆÛŒØ± Ø¨Ø± Ø§Ø³Ø§Ø³ Ø³Ø·Ø­/Ù†Ù‚Ø´ Ú©Ø§Ø±Ø¨Ø±
    const roleColor = (u) => {
        const r = (u.role_title || "");
        const lv = +u.level || 0;
        if (r.includes("Ù…Ø¯ÛŒØ± Ú©Ù„"))
            return "#7c3aed";
        if (r.includes("Ø¨Ø§Ø²Ø±Ø³ÛŒ") || r.includes("Ø³Ø±Ø¨Ø§Ø²Ø±Ø³"))
            return "#d97706";
        if (r.includes("Ø¨Ø§Ø²Ø±Ø³"))
            return "#dc2626";
        if (r.includes("Ø§Ù¾Ø±Ø§ØªÙˆØ±"))
            return "#0891b2";
        if (r.includes("Ù†Ø§Ø¸Ø±"))
            return "#0d7a5f";
        if (lv >= 8)
            return "#7c3aed";
        if (lv >= 6)
            return "#d97706";
        return "#0d7a5f";
    };
    const markersRef = useRef({});
    const liveDataRef = useRef([]);
    const focusRef = useRef(""); // Ú©Ø§Ø±Ø¨Ø± Ù…Ù†ØªØ®Ø¨ Ø¨Ø±Ø§ÛŒ Ù†Ù…Ø§ÛŒØ´ Ø§Ù†Ø­ØµØ§Ø±ÛŒ Ø±ÙˆÛŒ Ù†Ù‚Ø´Ù‡
    const centerRef = useRef(false);
    const markerHtml = (u) => {
        const online = !!(+u.online);
        const ring = roleColor(u);
        const initials = ((u.first_name || "ØŸ")[0] || "") + ((u.last_name || "")[0] || "");
        const safePhoto = typeof u.photo === "string" && (/^(https?:\/\/|\/)/i).test(u.photo) ? u.photo : "";
        const dim = online ? 1 : 0.5;
        return `<div style="position:relative;width:42px;height:52px;opacity:${dim}">
      <div style="width:40px;height:40px;border-radius:50%;border:3px solid ${ring};box-shadow:0 2px 6px rgba(0,0,0,.4);background:${ring};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px;overflow:hidden">${safePhoto ? `<img src="${mapEscapeHtml(safePhoto)}" alt="" style="width:100%;height:100%;object-fit:cover"/>` : mapEscapeHtml(initials)}</div>
      <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:10px solid ${ring}"></div>
      <div style="position:absolute;top:-2px;right:-2px;width:11px;height:11px;border-radius:50%;border:2px solid #fff;background:${online ? "#16a06a" : "#9aa6b6"}"></div>
      ${(+u.vpn_on) ? '<div style="position:absolute;top:-4px;left:-4px;background:#dc2626;color:#fff;font-size:8px;font-weight:700;border-radius:4px;padding:0 3px">VPN</div>' : ''}
      ${(+u.via_gsm) ? '<div style="position:absolute;bottom:8px;left:-6px;background:#d97706;color:#fff;font-size:9px;font-weight:700;border-radius:8px;padding:1px 4px;box-shadow:0 1px 3px rgba(0,0,0,.4)">ğŸ“¶</div>' : ''}
    </div>`;
    };
    const popupHtml = (u) => {
        const online = !!(+u.online);
        const mins = Math.max(0, Math.floor((+u.secs_ago || 0) / 60));
        const name = mapEscapeHtml((u.first_name || "") + " " + (u.last_name || "")), role = mapEscapeHtml(u.role_title || ""), country = mapEscapeHtml(u.ip_country || "");
        return `<b>${name}</b><br>${role}<br>${online ? '<span style="color:#16a06a">â— Ø¢Ù†Ù„Ø§ÛŒÙ† (Ø¯Ø± Ø­Ø§Ù„ Ø§Ø±Ø³Ø§Ù„ Ù…ÙˆÙ‚Ø¹ÛŒØª)</span>' : '<span style="color:#8a93a6">â— Ø¢ÙÙ„Ø§ÛŒÙ† â€” ' + (mins > 0 ? ('Ø¢Ø®Ø±ÛŒÙ† Ø§Ø±Ø³Ø§Ù„ ' + fa(mins) + ' Ø¯Ù‚ÛŒÙ‚Ù‡ Ù¾ÛŒØ´') : 'Ù„Ø­Ø¸Ø§ØªÛŒ Ù¾ÛŒØ´') + '</span>'}${(+u.vpn_on) ? '<br><span style="color:#dc2626">âš  ÙÛŒÙ„ØªØ±Ø´Ú©Ù† Ø±ÙˆØ´Ù†' + (country && country !== 'IR' ? (' (Ú©Ø´ÙˆØ± IP: ' + country + ')') : '') + '</span>' : ''}${(country && country !== 'IR' && !(+u.vpn_on)) ? '<br><span style="color:#d97706">ğŸŒ Ú©Ø´ÙˆØ± IP: ' + country + '</span>' : ''}${(+u.via_gsm) ? '<br><span style="color:#d97706">ğŸ“¶ Ù…ÙˆÙ‚Ø¹ÛŒØª Ø­Ø¯ÙˆØ¯ÛŒ (Ø¢Ù†ØªÙ† GSM â€” GPS Ø®Ø§Ù…ÙˆØ´)</span>' : ''}${(u.battery_level != null && u.battery_level !== '') ? '<br><span style="color:' + (u.battery_level < 20 ? '#dc2626' : '#16a06a') + '">ğŸ”‹ Ø¨Ø§ØªØ±ÛŒ: ' + fa(u.battery_level) + 'Ùª' + (+u.battery_charging ? ' (Ø¯Ø± Ø­Ø§Ù„ Ø´Ø§Ø±Ú˜)' : '') + '</span>' : ''}<br>${mapEscapeHtml(fj(u.captured_at))}`;
    };
    const drawUsers = () => {
        const map = mapRef.current;
        if (!map)
            return;
        if (!layerRef.current) {
            layerRef.current = L.layerGroup().addTo(map);
        }
        const grp = layerRef.current;
        const mk = markersRef.current;
        const seen = {};
        if (liveRequestRef.current) {
            refreshPendingRef.current = true;
            return;
        }
        liveRequestRef.current = true;
        setLiveLoading(true);
        const requestedShift = shiftFilterRef.current;
        db.live(requestedShift).then(list => {
            if (!liveMountedRef.current || requestedShift !== shiftFilterRef.current)
                return;
            setLiveError('');
            setLiveUpdated(new Date());
            (list || []).forEach(u => {
                if (!u.lat || !u.lng)
                    return;
                const id = u.user_id;
                if (focusRef.current && String(id) !== String(focusRef.current))
                    return; // ÙÙ‚Ø· Ú©Ø§Ø±Ø¨Ø± Ù…Ù†ØªØ®Ø¨
                // ÙÛŒÙ„ØªØ± Ø³Ù…Øª: Ø§Ú¯Ø± ÙÙ‡Ø±Ø³Øª Ø³Ù…Øªâ€ŒÙ‡Ø§ ØªØ¹ÛŒÛŒÙ† Ø´Ø¯Ù‡ Ø¨Ø§Ø´Ø¯ØŒ ÙÙ‚Ø· Ù‡Ù…Ø§Ù† Ø³Ù…Øªâ€ŒÙ‡Ø§ Ù†Ù…Ø§ÛŒØ´ Ø¯Ø§Ø¯Ù‡ Ø´ÙˆÙ†Ø¯
                const rf = roleFilterRef.current;
                if (rf && rf.length && !rf.includes(String(u.role_id || u.role_title || "")))
                    return;
                // ÙÛŒÙ„ØªØ± Ø§Ø´Ø®Ø§Øµ: Ø§Ú¯Ø± ÙÙ‡Ø±Ø³Øª Ø§Ø´Ø®Ø§Øµ ØªØ¹ÛŒÛŒÙ† Ø´Ø¯Ù‡ Ø¨Ø§Ø´Ø¯ØŒ ÙÙ‚Ø· Ù‡Ù…Ø§Ù† Ø§ÙØ±Ø§Ø¯ Ù†Ù…Ø§ÛŒØ´ Ø¯Ø§Ø¯Ù‡ Ø´ÙˆÙ†Ø¯
                const pf = personFilterRef.current;
                if (pf && pf.length && !pf.includes(String(id)))
                    return;
                // ÙÛŒÙ„ØªØ± ÙÙ‚Ø· Ø¢Ù†Ù„Ø§ÛŒÙ†: Ø§Ú¯Ø± ÙØ¹Ø§Ù„ Ø¨Ø§Ø´Ø¯ØŒ Ø§ÙØ±Ø§Ø¯ Ø¢ÙÙ„Ø§ÛŒÙ† Ù†Ù…Ø§ÛŒØ´ Ø¯Ø§Ø¯Ù‡ Ù†Ø´ÙˆÙ†Ø¯
                if (onlyOnlineRef.current && !Number(u.online))
                    return;
                seen[id] = 1;
                const pos = [+u.lat, +u.lng];
                const icon = L.divIcon({ html: markerHtml(u), className: "", iconSize: [42, 52], iconAnchor: [21, 52], popupAnchor: [0, -50] });
                if (mk[id]) { // ÙÙ‚Ø· Ù…ÙˆÙ‚Ø¹ÛŒØª/Ø¢ÛŒÚ©Ù†/Ù¾Ø§Ù¾â€ŒØ¢Ù¾ Ø±Ø§ Ø¨Ù‡â€ŒØ±ÙˆØ²Ø±Ø³Ø§Ù†ÛŒ Ú©Ù† (Ø¨Ø¯ÙˆÙ† Ø­Ø°Ù Ùˆ Ø±Ø³Ù… Ù…Ø¬Ø¯Ø¯ â†’ Ø¨Ø¯ÙˆÙ† Ú†Ø´Ù…Ú©â€ŒØ²Ø¯Ù†)
                    mk[id].setLatLng(pos);
                    mk[id].setIcon(icon);
                    mk[id].getPopup() ? mk[id].setPopupContent(popupHtml(u)) : mk[id].bindPopup(popupHtml(u));
                }
                else {
                    mk[id] = L.marker(pos, { icon }).addTo(grp).bindPopup(popupHtml(u));
                }
                if (focusRef.current && String(id) === String(focusRef.current) && centerRef.current) {
                    map.setView(pos, Math.max(map.getZoom() || 12, 15));
                    centerRef.current = false;
                    mk[id].openPopup();
                }
            });
            // Ø­Ø°Ù Ù…Ø§Ø±Ú©Ø± Ú©Ø³Ø§Ù†ÛŒ Ú©Ù‡ Ø¯ÛŒÚ¯Ø± Ø¯Ø± ÙÙ‡Ø±Ø³Øª Ù†ÛŒØ³ØªÙ†Ø¯
            Object.keys(mk).forEach(id => { if (!seen[id]) {
                grp.removeLayer(mk[id]);
                delete mk[id];
            } });
            // Ø°Ø®ÛŒØ±Ù‡Ù” Ø¯Ø§Ø¯Ù‡â€ŒÙ‡Ø§ÛŒ ÙØ¹Ù„ÛŒ Ø¨Ø±Ø§ÛŒ Ø§Ø³ØªÙØ§Ø¯Ù‡ Ø¯Ø± Ø°Ø®ÛŒØ±Ù‡Ù” ØªØµÙˆÛŒØ± Ù†Ù‚Ø´Ù‡
            liveDataRef.current = (list || []).filter(u => {
                if (!u.lat || !u.lng)
                    return false;
                const rf = roleFilterRef.current;
                if (rf && rf.length && !rf.includes(String(u.role_id || u.role_title || "")))
                    return false;
                const pf = personFilterRef.current;
                if (pf && pf.length && !pf.includes(String(u.user_id)))
                    return false;
                return true;
            });
            setOnlineUsers((list || []).filter(u => +u.online).map(u => ({ id: u.user_id, name: (u.first_name || '') + ' ' + (u.last_name || '') })).sort((a, b) => a.name.localeCompare(b.name, 'fa')));
        }).catch(error => { if (liveMountedRef.current)
            setLiveError(error.message || 'Ø¯Ø±ÛŒØ§ÙØª Ù…ÙˆÙ‚Ø¹ÛŒØªâ€ŒÙ‡Ø§ Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯.'); }).finally(() => { liveRequestRef.current = false; if (liveMountedRef.current) {
            setLiveLoading(false);
            if (requestedShift !== shiftFilterRef.current || refreshPendingRef.current) {
                refreshPendingRef.current = false;
                drawUsers();
            }
        } });
    };
    useEffect(() => {
        liveMountedRef.current = true;
        const map = L.map(ref.current).setView([36.297, 59.606], 12);
        mapRef.current = map;
        applyBase(mapProvider);
        db.geofences().then(gs => {
            setFences(gs || []);
            return (gs || []).forEach(g => {
                if (g.type === "circle" && g.center_lat)
                    L.circle([g.center_lat, g.center_lng], { radius: g.radius_m || 200, color: g.color, fillColor: g.color, fillOpacity: .18 }).addTo(map).bindPopup(`Ø§ÛŒØ³ØªÚ¯Ø§Ù‡: ${g.name}${g.line_code ? " â€” Ø®Ø· " + g.line_code : ""}`);
                else if (g.type === "polygon" && g.polygon)
                    L.polygon(g.polygon, { color: g.color, fillColor: g.color, fillOpacity: .18 }).addTo(map).bindPopup(`Ù…Ø­Ø¯ÙˆØ¯Ù‡: ${g.name}${g.line_code ? " â€” Ø®Ø· " + g.line_code : ""}`);
            });
        }).catch(() => { });
        drawUsers();
        setTimeout(() => map.invalidateSize(), 200);
        const iv = setInterval(drawUsers, 15000);
        return () => { liveMountedRef.current = false; clearInterval(iv); if (trkIv.current) {
            clearInterval(trkIv.current);
            trkIv.current = null;
        } if (pbIvRef.current) {
            clearInterval(pbIvRef.current);
            pbIvRef.current = null;
        } map.remove(); mapRef.current = null; };
    }, []);
    // Ø¨Ø§ Ø§Ù†ØªØ®Ø§Ø¨ ÛŒÚ© Ù†ÙØ± Ø§Ø² Ú©Ø´ÙˆÛŒ Ø±Ù‡Ú¯ÛŒØ±ÛŒØŒ Ø¯Ø± Ø­Ø§Ù„Øª Ø²Ù†Ø¯Ù‡ ÙÙ‚Ø· Ù‡Ù…Ø§Ù† Ù†ÙØ± Ø±ÙˆÛŒ Ù†Ù‚Ø´Ù‡ Ù†Ù…Ø§ÛŒØ´ Ø¯Ø§Ø¯Ù‡ Ø´ÙˆØ¯
    useEffect(() => {
        focusRef.current = trkUser;
        centerRef.current = !!trkUser;
        if (mode === "live" && mapRef.current) {
            const mk = markersRef.current, grp = layerRef.current;
            // Ø­Ø°Ù ÙÙˆØ±ÛŒ Ù…Ø§Ø±Ú©Ø±Ù‡Ø§ÛŒ ØºÛŒØ±Ù…Ù†ØªØ®Ø¨ ØªØ§ Ù…Ø­Ùˆ Ø´Ø¯Ù† Ø¢Ù†ÛŒ Ø¯ÛŒØ¯Ù‡ Ø´ÙˆØ¯
            if (trkUser && grp) {
                Object.keys(mk).forEach(id => { if (String(id) !== String(trkUser)) {
                    grp.removeLayer(mk[id]);
                    delete mk[id];
                } });
            }
            drawUsers();
        }
    }, [trkUser]);
    const drawTrack = (pts) => {
        const map = mapRef.current;
        if (!map)
            return;
        if (lineRef.current)
            map.removeLayer(lineRef.current);
        const all = (pts || []).filter(p => p.lat && p.lng);
        const latlng = all.map(p => [+p.lat, +p.lng]);
        if (!latlng.length) {
            setTrkInfo({ count: 0 });
            return;
        }
        const grp = L.layerGroup().addTo(map);
        lineRef.current = grp;
        L.polyline(latlng, { color: "#0d7a5f", weight: 4 }).addTo(grp);
        const dist = (a, b, c, d) => {
            const R = 6371000, t = Math.PI / 180, dLa = (c - a) * t, dLo = (d - b) * t;
            const x = Math.sin(dLa / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin(dLo / 2) ** 2;
            return 2 * R * Math.asin(Math.sqrt(x));
        };
        // Ù†Ù‚Ø§Ø· Ù…ÛŒØ§Ù†ÛŒ: Ù‡Ø± Ø¬Ø§ Ù…ÙˆÙ‚Ø¹ÛŒØª Ø¨ÛŒØ´ Ø§Ø² Û²Û° Ù…ØªØ± ØªØºÛŒÛŒØ± Ú©Ø±Ø¯Ù‡ØŒ ÛŒÚ© Ù†Ù‚Ø·Ù‡Ù” Ù‚Ø§Ø¨Ù„â€ŒÚ©Ù„ÛŒÚ© Ø¨Ø§ Ù…Ø´Ø®ØµØ§Øª
        let last = null;
        all.forEach((p, i) => {
            const la = +p.lat, lo = +p.lng;
            const isEnd = (i === 0 || i === all.length - 1);
            if (!isEnd) {
                if (last && dist(last[0], last[1], la, lo) < 20)
                    return;
                last = [la, lo];
                const isGsm = (+p.via_gsm);
                const ptColor = isGsm ? "#d97706" : "#0d7a5f";
                L.circleMarker([la, lo], { radius: 4, color: ptColor, weight: 1.5, fillColor: isGsm ? "#fde68a" : "#fff", fillOpacity: 1 }).addTo(grp)
                    .bindPopup(`<b>Ù†Ù‚Ø·Ù‡Ù” ØªØ±Ø¯Ø¯</b><br>${fj(p.captured_at)}<br>${isGsm ? '<span style="color:#d97706">ğŸ“¶ Ù…ÙˆÙ‚Ø¹ÛŒØª Ø­Ø¯ÙˆØ¯ÛŒ (Ø¢Ù†ØªÙ† GSM â€” GPS Ø®Ø§Ù…ÙˆØ´)</span><br>' : ''}${p.mocked ? '<span style="color:#e3403e">Ù…ÙˆÙ‚Ø¹ÛŒØª Ø¬Ø¹Ù„ÛŒ</span><br>' : ''}<a href="https://maps.google.com/?q=${la},${lo}" target="_blank">Ù†Ù…Ø§ÛŒØ´ Ø±ÙˆÛŒ Ù†Ù‚Ø´Ù‡Ù” Ú¯ÙˆÚ¯Ù„</a>`);
            }
            else {
                last = [la, lo];
            }
        });
        // Ù†Ù‚Ø·Ù‡Ù” Ø´Ø±ÙˆØ¹ Ùˆ Ù¾Ø§ÛŒØ§Ù† (Ø¨Ø§ Ù…Ø´Ø®ØµØ§Øª)
        L.circleMarker(latlng[0], { radius: 7, color: "#fff", weight: 2, fillColor: "#16a06a", fillOpacity: 1 }).addTo(grp)
            .bindPopup(`<b>Ø´Ø±ÙˆØ¹ Ù…Ø³ÛŒØ±</b><br>${fj(all[0].captured_at)}`);
        L.circleMarker(latlng[latlng.length - 1], { radius: 7, color: "#fff", weight: 2, fillColor: "#e3403e", fillOpacity: 1 }).addTo(grp)
            .bindPopup(`<b>Ù¾Ø§ÛŒØ§Ù† Ù…Ø³ÛŒØ±</b><br>${fj(all[all.length - 1].captured_at)}`);
        map.fitBounds(L.polyline(latlng).getBounds(), { padding: [30, 30] });
    };
    // Ø±Ù‡Ú¯ÛŒØ±ÛŒ Ø²Ù†Ø¯Ù‡: Ù…Ø³ÛŒØ± Ø§Ù…Ø±ÙˆØ²Ù Ú©Ø§Ø±Ø¨Ø± Ø§Ù†ØªØ®Ø§Ø¨ÛŒ Ù‡Ø± Û±Ûµ Ø«Ø§Ù†ÛŒÙ‡ Ø¨Ù‡â€ŒØ±ÙˆØ² Ù…ÛŒâ€ŒØ´ÙˆØ¯
    const startLive = () => {
        if (!trkUser) {
            alert("ÛŒÚ© Ú©Ø§Ø±Ø¨Ø± Ø±Ø§ Ø§Ù†ØªØ®Ø§Ø¨ Ú©Ù†ÛŒØ¯");
            return;
        }
        setMode("track");
        if (trkIv.current)
            clearInterval(trkIv.current);
        const today = localIsoDate(new Date());
        const run = () => db.track(trkUser, today + " 00:00:00", today + " 23:59:59").then(r => { drawTrack(r.points); setTrkInfo({ name: r.name, count: r.count }); }).catch(() => { });
        run();
        trkIv.current = setInterval(run, 15000);
    };
    // Ú¯Ø²Ø§Ø±Ø´ Ø±Ù‡Ú¯ÛŒØ±ÛŒ: Ù…Ø³ÛŒØ± Ú©Ø§Ø±Ø¨Ø± Ø¯Ø± Ø¨Ø§Ø²Ù‡Ù” ØªØ§Ø±ÛŒØ®ÛŒ Ø§Ù†ØªØ®Ø§Ø¨â€ŒØ´Ø¯Ù‡
    const showReport = () => {
        if (!trkUser) {
            alert("ÛŒÚ© Ú©Ø§Ø±Ø¨Ø± Ø±Ø§ Ø§Ù†ØªØ®Ø§Ø¨ Ú©Ù†ÛŒØ¯");
            return;
        }
        if (!fromD || !toD) {
            alert("Ø¨Ø§Ø²Ù‡Ù” ØªØ§Ø±ÛŒØ® Ø±Ø§ Ø§Ù†ØªØ®Ø§Ø¨ Ú©Ù†ÛŒØ¯");
            return;
        }
        if (trkIv.current) {
            clearInterval(trkIv.current);
            trkIv.current = null;
        }
        setMode("report");
        const from = fromD + " " + (fromT || "00:00") + ":00", to = toD + " " + (toT || "23:59") + ":59";
        db.track(trkUser, from, to).then(r => { drawTrack(r.points); setTrkInfo({ name: r.name, count: r.count }); setTrkPts(r.points || []); }).catch(e => alert(e.message || "Ø®Ø·Ø§"));
        db.stationExits(from).then(ex => setTrkExits((ex || []).filter(e => String(e.user_id) === String(trkUser)))).catch(() => setTrkExits([]));
    };
    const exitNearTime = (cap) => { const t = new Date(String(cap).replace(' ', 'T')).getTime(); for (const e of trkExits) {
        const et = new Date(String(e.exited_at).replace(' ', 'T')).getTime();
        if (Math.abs(et - t) <= 90000)
            return fj(e.exited_at);
    } return ""; };
    // Ù…Ø­Ø§Ø³Ø¨Ù‡Ù” Ù†Ø§Ù… Ø§ÛŒØ³ØªÚ¯Ø§Ù‡ ÛŒØ§ ÙØ§ØµÙ„Ù‡ ØªØ§ Ù†Ø²Ø¯ÛŒÚ©â€ŒØªØ±ÛŒÙ† Ø§ÛŒØ³ØªÚ¯Ø§Ù‡/Ø®Ø· (Ù…ØªØ±)
    const stationOf = (la, lo) => {
        const st = (fences || []).filter(g => g.center_lat && g.center_lng && g.radius_m);
        if (!st.length)
            return "â€”";
        const D = (a, b, c, d) => { const R = 6371000, t = Math.PI / 180, dLa = (c - a) * t, dLo = (d - b) * t; const x = Math.sin(dLa / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
        let best = null, bd = Infinity;
        st.forEach(s => { const dd = D(la, lo, +s.center_lat, +s.center_lng); if (dd < bd) {
            bd = dd;
            best = s;
        } });
        if (best && bd <= (+best.radius_m))
            return "Ø¯Ø§Ø®Ù„: " + best.name + (best.line_code ? ` (Ø®Ø· ${best.line_code})` : "");
        return `${Math.round(bd)} Ù…ØªØ± ØªØ§ Â«${best ? best.name : '?'}Â»` + (best && best.line_code ? ` (Ø®Ø· ${best.line_code})` : "");
    };
    // preset Ø¨Ø§Ø²Ù‡â€ŒÙ‡Ø§ÛŒ Ø²Ù…Ø§Ù†ÛŒ Ø¢Ù…Ø§Ø¯Ù‡
    const localIsoDate = x => [x.getFullYear(), String(x.getMonth() + 1).padStart(2, "0"), String(x.getDate()).padStart(2, "0")].join("-");
    const setPreset = (p) => {
        const d = new Date();
        const iso = localIsoDate;
        if (p === "today") {
            setFromD(iso(d));
            setToD(iso(d));
            setFromT("00:00");
            setToT("23:59");
        }
        else if (p === "yesterday") {
            const y = new Date(d.getTime() - 86400000);
            setFromD(iso(y));
            setToD(iso(y));
            setFromT("00:00");
            setToT("23:59");
        }
        else if (p === "7d") {
            const a = new Date(d.getTime() - 6 * 86400000);
            setFromD(iso(a));
            setToD(iso(d));
            setFromT("00:00");
            setToT("23:59");
        }
        else if (p === "30d") {
            const a = new Date(d.getTime() - 29 * 86400000);
            setFromD(iso(a));
            setToD(iso(d));
            setFromT("00:00");
            setToT("23:59");
        }
    };
    // Ø®Ø±ÙˆØ¬ÛŒ Ø§Ú©Ø³Ù„ Ø±ÛŒØ² ØªØ±Ø¯Ø¯ Ù¾Ø±Ø³Ù†Ù„ (Ù†Ù‚Ø§Ø· Ù…Ø³ÛŒØ± Ø¨Ø§ Ø²Ù…Ø§Ù† Ø´Ù…Ø³ÛŒ + Ù„ÛŒÙ†Ú© Ù†Ù‚Ø´Ù‡ + Ø§ÛŒØ³ØªÚ¯Ø§Ù‡/ÙØ§ØµÙ„Ù‡)
    const exportTrack = async () => {
        if (!trkUser) {
            alert("ÛŒÚ© Ú©Ø§Ø±Ø¨Ø± Ø±Ø§ Ø§Ù†ØªØ®Ø§Ø¨ Ú©Ù†ÛŒØ¯");
            return;
        }
        if (!fromD || !toD) {
            alert("Ø¨Ø§Ø²Ù‡Ù” ØªØ§Ø±ÛŒØ® Ø±Ø§ Ø§Ù†ØªØ®Ø§Ø¨ Ú©Ù†ÛŒØ¯");
            return;
        }
        const from = fromD + " " + (fromT || "00:00") + ":00", to = toD + " " + (toT || "23:59") + ":59";
        try {
            const [r, fences, exits] = await Promise.all([db.track(trkUser, from, to), db.geofences().catch(() => []), db.stationExits(from).catch(() => [])]);
            const pts = r.points || [];
            if (!pts.length) {
                alert("Ù†Ù‚Ø·Ù‡â€ŒØ§ÛŒ Ø¯Ø± Ø§ÛŒÙ† Ø¨Ø§Ø²Ù‡ Ø«Ø¨Øª Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª");
                return;
            }
            const stations = (fences || []).filter(g => g.center_lat && g.center_lng && g.radius_m);
            const dist = (la1, lo1, la2, lo2) => {
                const R = 6371000, t = Math.PI / 180, dLa = (la2 - la1) * t, dLo = (lo2 - lo1) * t;
                const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * t) * Math.cos(la2 * t) * Math.sin(dLo / 2) ** 2;
                return 2 * R * Math.asin(Math.sqrt(a));
            };
            const stationCol = (la, lo) => {
                if (!stations.length)
                    return "â€”";
                let best = null, bestD = Infinity;
                stations.forEach(s => { const d = dist(la, lo, +s.center_lat, +s.center_lng); if (d < bestD) {
                    bestD = d;
                    best = s;
                } });
                if (best && bestD <= (+best.radius_m))
                    return "Ø¯Ø§Ø®Ù„ Ø§ÛŒØ³ØªÚ¯Ø§Ù‡: " + best.name;
                return `${Math.round(bestD)} Ù…ØªØ± ØªØ§ Â«${best ? best.name : '?'}Â»`;
            };
            // Ø²Ù…Ø§Ù†â€ŒÙ‡Ø§ÛŒ Ø®Ø±ÙˆØ¬ Ø§Ø² Ø§ÛŒØ³ØªÚ¯Ø§Ù‡ Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ú©Ø§Ø±Ø¨Ø± (Ø¨Ø±Ø§ÛŒ Ø³ØªÙˆÙ† Â«Ø®Ø±ÙˆØ¬ Ø§Ø² Ø§ÛŒØ³ØªÚ¯Ø§Ù‡Â»)
            const exitTimes = (exits || []).filter(e => String(e.user_id) === String(trkUser)).map(e => new Date(String(e.exited_at).replace(' ', 'T')).getTime());
            const exitNear = (cap) => { const t = new Date(String(cap).replace(' ', 'T')).getTime(); for (const et of exitTimes) {
                if (Math.abs(et - t) <= 90000)
                    return fj(cap);
            } return ""; };
            // Ø³Ø§Ø®Øª Ú©Ø§Ø±Ø¨Ø±Ú¯ Ø¨Ø§ Ù‡Ø§ÛŒÙ¾Ø±Ù„ÛŒÙ†Ú© ÙˆØ§Ù‚Ø¹ÛŒ
            const head = ["Ø±Ø¯ÛŒÙ", "Ù†Ø§Ù… Ú©Ø§Ø±Ø¨Ø±", "ØªØ§Ø±ÛŒØ®/Ø³Ø§Ø¹Øª (Ø´Ù…Ø³ÛŒ)", "Ø¹Ø±Ø¶ Ø¬ØºØ±Ø§ÙÛŒØ§ÛŒÛŒ", "Ø·ÙˆÙ„ Ø¬ØºØ±Ø§ÙÛŒØ§ÛŒÛŒ", "Ù…ÙˆÙ‚Ø¹ÛŒØª Ø¬Ø¹Ù„ÛŒ", "Ø§ÛŒØ³ØªÚ¯Ø§Ù‡/ÙØ§ØµÙ„Ù‡", "Ø®Ø±ÙˆØ¬ Ø§Ø² Ø§ÛŒØ³ØªÚ¯Ø§Ù‡", "Ù†Ø´Ø§Ù† Ø±ÙˆÛŒ Ù†Ù‚Ø´Ù‡"];
            const aoa = [head];
            pts.forEach((p, i) => {
                const la = +p.lat, lo = +p.lng;
                aoa.push([i + 1, r.name || "", fj(p.captured_at), la, lo, p.mocked ? "Ø¨Ù„Ù‡" : "Ø®ÛŒØ±", stationCol(la, lo), exitNear(p.captured_at), "Ù†Ù…Ø§ÛŒØ´ Ø±ÙˆÛŒ Ù†Ù‚Ø´Ù‡"]);
            });
            const ws = XLSX.utils.aoa_to_sheet(aoa);
            // Ø§ÙØ²ÙˆØ¯Ù† Ù‡Ø§ÛŒÙ¾Ø±Ù„ÛŒÙ†Ú© Ø¨Ù‡ Ø³ØªÙˆÙ† Ø¢Ø®Ø± (Ù†Ø´Ø§Ù† Ø±ÙˆÛŒ Ù†Ù‚Ø´Ù‡)
            pts.forEach((p, i) => { const cell = XLSX.utils.encode_cell({ r: i + 1, c: 8 }); if (ws[cell])
                ws[cell].l = { Target: `https://maps.google.com/?q=${p.lat},${p.lng}`, Tooltip: "Ù†Ù…Ø§ÛŒØ´ Ø±ÙˆÛŒ Ù†Ù‚Ø´Ù‡" }; });
            ws['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 28 }, { wch: 18 }, { wch: 16 }];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Ø±ÛŒØ² ØªØ±Ø¯Ø¯");
            XLSX.writeFile(wb, `tracking_${trkUser}_${fromD}_${toD}.xlsx`);
        }
        catch (e) {
            alert(e.message || "Ø®Ø·Ø§");
        }
    };
    // Ø°Ø®ÛŒØ±Ù‡Ù” ØªØµÙˆÛŒØ± Ø¨Ø§Ú©ÛŒÙÛŒØª Ù†Ù‚Ø´Ù‡ Ø¨Ø§ Ù…ÙˆÙ‚Ø¹ÛŒØª Ù†ÛŒØ±ÙˆÙ‡Ø§
    const [savingImg, setSavingImg] = useState(false);
    const saveMapImage = async () => {
        const map = mapRef.current;
        if (!map) {
            alert("Ù†Ù‚Ø´Ù‡ Ø¢Ù…Ø§Ø¯Ù‡ Ù†ÛŒØ³Øª");
            return;
        }
        setSavingImg(true);
        try {
            const mapEl = map.getContainer();
            const W = mapEl.clientWidth, H = mapEl.clientHeight;
            const scale = 2;
            const cv = document.createElement("canvas");
            cv.width = W * scale;
            cv.height = H * scale;
            const ctx = cv.getContext("2d");
            ctx.scale(scale, scale);
            // Ù¾Ø³â€ŒØ²Ù…ÛŒÙ†Ù‡
            ctx.fillStyle = "#e8eef2";
            ctx.fillRect(0, 0, W, H);
            const mapRect = mapEl.getBoundingClientRect();
            // Ú©Ø´ÛŒØ¯Ù† Ú©Ø§Ø´ÛŒâ€ŒÙ‡Ø§ÛŒ Ù†Ù‚Ø´Ù‡ (ØªØµØ§ÙˆÛŒØ±ÛŒ Ú©Ù‡ leaflet Ø¯Ø± DOM Ø¯Ø§Ø±Ø¯)
            const imgs = mapEl.querySelectorAll("img.leaflet-tile, .leaflet-tile-loaded");
            let drawn = 0, failed = 0;
            for (const img of imgs) {
                try {
                    if (!img.src || !img.complete || img.naturalWidth === 0)
                        continue;
                    const r = img.getBoundingClientRect();
                    const x = r.left - mapRect.left, y = r.top - mapRect.top;
                    // ÙÙ‚Ø· Ø§Ú¯Ø± CORS Ø§Ø¬Ø§Ø²Ù‡ Ø¯Ù‡Ø¯ØŒ Ø¯Ø± ØºÛŒØ± Ø§ÛŒÙ† ØµÙˆØ±Øª Ø¯Ø± catch Ù…ÛŒâ€ŒØ§ÙØªØ¯
                    ctx.drawImage(img, x, y, r.width, r.height);
                    drawn++;
                }
                catch (e) {
                    failed++;
                }
            }
            // Ú©Ø´ÛŒØ¯Ù† Ù…Ø§Ø±Ú©Ø±Ù‡Ø§ Ø¨Ø§ Ø¹Ú©Ø³ Ù¾Ø±ÙˆÙØ§ÛŒÙ„ + Ù†Ø§Ù… + Ø³Ù…Øª Ù‡Ø± Ù†ÛŒØ±Ùˆ
            const users = liveDataRef.current || [];
            // Ø§Ø¨ØªØ¯Ø§ Ø¹Ú©Ø³â€ŒÙ‡Ø§ Ø±Ø§ Ø¨Ù‡â€ŒØµÙˆØ±Øª Ù…ÙˆØ§Ø²ÛŒ Ù„ÙˆØ¯ Ú©Ù† (Ø¨Ø§ ØªÙˆÚ©Ù†)
            const loadImg = (url) => new Promise((res) => {
                if (!url) {
                    res(null);
                    return;
                }
                const full = url.indexOf("/api/") === 0 ? (API_BASE.replace(/\/api$/, "") + url) : url;
                fetch(full, { headers: tok() }).then(r => r.ok ? r.blob() : null).then(bl => {
                    if (!bl) {
                        res(null);
                        return;
                    }
                    const im = new Image();
                    im.onload = () => res(im);
                    im.onerror = () => res(null);
                    im.src = URL.createObjectURL(bl);
                }).catch(() => res(null));
            });
            const mapRect2 = mapEl.getBoundingClientRect();
            const mkEls = mapEl.querySelectorAll(".leaflet-marker-icon");
            // ØªØ·Ø¨ÛŒÙ‚ Ù…Ø§Ø±Ú©Ø±Ù‡Ø§ Ø¨Ø§ Ú©Ø§Ø±Ø¨Ø±Ø§Ù† Ø¨Ø± Ø§Ø³Ø§Ø³ Ù…ÙˆÙ‚Ø¹ÛŒØª Ù¾ÛŒÚ©Ø³Ù„ÛŒ
            for (let mi = 0; mi < mkEls.length; mi++) {
                const mkEl = mkEls[mi];
                const r = mkEl.getBoundingClientRect();
                const x = r.left - mapRect2.left + r.width / 2, y = r.top - mapRect2.top + r.height / 2;
                // Ù¾ÛŒØ¯Ø§ Ú©Ø±Ø¯Ù† Ú©Ø§Ø±Ø¨Ø± Ù…ØªÙ†Ø§Ø¸Ø± (Ù†Ø²Ø¯ÛŒÚ©â€ŒØªØ±ÛŒÙ† Ø¨Ù‡ Ø§ÛŒÙ† Ù¾ÛŒÚ©Ø³Ù„ Ø¨Ø§ ØªØ¨Ø¯ÛŒÙ„ latLngâ†’pixel)
                let u = null;
                try {
                    const map = mapRef.current;
                    let best = 1e9;
                    for (const cand of users) {
                        const pt = map.latLngToContainerPoint([+cand.lat, +cand.lng]);
                        const d = Math.hypot(pt.x - x, pt.y - y);
                        if (d < best) {
                            best = d;
                            u = cand;
                        }
                    }
                    if (best > 40)
                        u = null;
                }
                catch (e) { }
                const photo = u ? (u.photo || null) : null;
                const img = await loadImg(photo);
                // Ø¯Ø§ÛŒØ±Ù‡Ù” Ø¹Ú©Ø³
                const R = 16;
                ctx.save();
                ctx.beginPath();
                ctx.arc(x, y, R, 0, Math.PI * 2);
                ctx.closePath();
                ctx.lineWidth = 3;
                ctx.strokeStyle = u && +u.online ? "#16a06a" : "#8a93a6";
                if (img) {
                    ctx.clip();
                    ctx.drawImage(img, x - R, y - R, R * 2, R * 2);
                    ctx.restore();
                    ctx.beginPath();
                    ctx.arc(x, y, R, 0, Math.PI * 2);
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = u && +u.online ? "#16a06a" : "#8a93a6";
                    ctx.stroke();
                }
                else {
                    ctx.fillStyle = "#0d7a5f";
                    ctx.fill();
                    ctx.stroke();
                    ctx.restore();
                    if (u) {
                        ctx.fillStyle = "#fff";
                        ctx.font = "bold 12px Tahoma";
                        ctx.textAlign = "center";
                        ctx.fillText(((u.first_name || "ØŸ")[0] || "ØŸ"), x, y + 4);
                    }
                }
                // Ù†Ø§Ù… Ùˆ Ø³Ù…Øª Ø²ÛŒØ± Ø¹Ú©Ø³
                if (u) {
                    const nm = ((u.first_name || "") + " " + (u.last_name || "")).trim();
                    ctx.font = "bold 11px Tahoma";
                    ctx.textAlign = "center";
                    ctx.direction = "rtl";
                    // Ù¾Ø³â€ŒØ²Ù…ÛŒÙ†Ù‡Ù” Ù†ÛŒÙ…â€ŒØ´ÙØ§Ù Ø¨Ø±Ø§ÛŒ Ø®ÙˆØ§Ù†Ø§ÛŒÛŒ
                    const tw = Math.max(ctx.measureText(nm).width, ctx.measureText(u.role_title || "").width) + 10;
                    ctx.fillStyle = "rgba(255,255,255,0.85)";
                    ctx.fillRect(x - tw / 2, y + R + 2, tw, (u.role_title ? 28 : 16));
                    ctx.fillStyle = "#0f1b2d";
                    ctx.fillText(nm, x, y + R + 13);
                    if (u.role_title) {
                        ctx.font = "10px Tahoma";
                        ctx.fillStyle = "#5a6678";
                        ctx.fillText(u.role_title, x, y + R + 25);
                    }
                }
            }
            // Ø³Ø±Ø¨Ø±Ú¯
            ctx.fillStyle = "rgba(13,122,95,0.92)";
            ctx.fillRect(0, 0, W, 32);
            ctx.fillStyle = "#fff";
            ctx.font = "bold 14px Tahoma,sans-serif";
            ctx.textAlign = "right";
            ctx.direction = "rtl";
            ctx.fillText("Ù…ÙˆÙ‚Ø¹ÛŒØª Ù„Ø­Ø¸Ù‡â€ŒØ§ÛŒ Ù†ÛŒØ±ÙˆÙ‡Ø§ â€” " + new Date().toLocaleString("fa-IR"), W - 12, 21);
            if (failed > 0 && drawn === 0) {
                // Ù‡Ù…Ù‡Ù” Ú©Ø§Ø´ÛŒâ€ŒÙ‡Ø§ CORS Ø¯Ø§Ø´ØªÙ†Ø¯ â†’ Ù†Ù‚Ø´Ù‡ Ù‚Ø§Ø¨Ù„â€ŒØ±Ø³Ù… Ù†ÛŒØ³ØªØŒ ÙÙ‚Ø· Ù…Ø§Ø±Ú©Ø±Ù‡Ø§
                alert("Ú©Ø§Ø´ÛŒâ€ŒÙ‡Ø§ÛŒ Ù†Ù‚Ø´Ù‡Ù” Ø¢Ù†Ù„Ø§ÛŒÙ† Ø¨Ù‡â€ŒØ¯Ù„ÛŒÙ„ Ù…Ø­Ø¯ÙˆØ¯ÛŒØª Ø§Ù…Ù†ÛŒØªÛŒ (CORS) Ù‚Ø§Ø¨Ù„ Ø°Ø®ÛŒØ±Ù‡ Ù†ÛŒØ³ØªÙ†Ø¯. ØªØµÙˆÛŒØ± ÙÙ‚Ø· Ø´Ø§Ù…Ù„ Ù…ÙˆÙ‚Ø¹ÛŒØª Ù†ÛŒØ±ÙˆÙ‡Ø§Ø³Øª. Ø¨Ø±Ø§ÛŒ ØªØµÙˆÛŒØ± Ú©Ø§Ù…Ù„â€ŒØªØ±ØŒ Ù†ÙˆØ¹ Ù†Ù‚Ø´Ù‡ Ø±Ø§ Ø¨Ù‡ OpenStreetMap ØªØºÛŒÛŒØ± Ø¯Ù‡ÛŒØ¯.");
            }
            const url = cv.toDataURL("image/png");
            const a = document.createElement("a");
            a.href = url;
            a.download = "map_positions_" + Date.now() + ".png";
            a.click();
        }
        catch (e) {
            alert("Ø°Ø®ÛŒØ±Ù‡Ù” ØªØµÙˆÛŒØ± Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯: " + (e.message || e) + "\nÙ…ÛŒâ€ŒØªÙˆØ§Ù†ÛŒØ¯ Ø§Ø² Ú©Ù„ÛŒØ¯ Print Screen ÙˆÛŒÙ†Ø¯ÙˆØ² Ø§Ø³ØªÙØ§Ø¯Ù‡ Ú©Ù†ÛŒØ¯.");
        }
        finally {
            setSavingImg(false);
        }
    };
    const stopTrack = () => { if (trkIv.current) {
        clearInterval(trkIv.current);
        trkIv.current = null;
    } const map = mapRef.current; if (lineRef.current && map)
        map.removeLayer(lineRef.current); setTrkInfo(null); setTrkPts(null); setMode("live"); drawUsers(); };
    return (React.createElement("div", { className: "panel admin-workspace-page live-map-page" },
        React.createElement("div", { className: "live-map-heading" },
            React.createElement("div", null,
                React.createElement("span", { className: "dashboard-section-kicker" }, "\u067E\u0627\u06CC\u0634 \u0645\u06CC\u062F\u0627\u0646\u06CC"),
                React.createElement("h3", null, "\u0646\u0642\u0634\u0647\u0654 \u0632\u0646\u062F\u0647\u0654 \u0646\u06CC\u0631\u0648\u0647\u0627 \u0648 \u0631\u0647\u06AF\u06CC\u0631\u06CC"),
                React.createElement("p", null, "\u0645\u0648\u0642\u0639\u06CC\u062A \u0646\u06CC\u0631\u0648\u0647\u0627\u060C \u0631\u0647\u06AF\u06CC\u0631\u06CC \u0645\u0633\u06CC\u0631 \u0648 \u06AF\u0632\u0627\u0631\u0634\u200C\u0647\u0627\u06CC \u062A\u0631\u062F\u062F")),
            React.createElement("div", { className: "live-map-toolbar" },
                React.createElement("select", { className: "input", "aria-label": "\u0627\u0646\u062A\u062E\u0627\u0628 \u0633\u0631\u0648\u06CC\u0633 \u0646\u0642\u0634\u0647", value: mapProvider, onChange: e => changeProvider(e.target.value) },
                    React.createElement("option", { value: "osm" }, "\u0646\u0642\u0634\u0647\u0654 OpenStreetMap"),
                    React.createElement("option", { value: "google" }, "\u0646\u0642\u0634\u0647\u0654 \u06AF\u0648\u06AF\u0644"),
                    React.createElement("option", { value: "google_sat" }, "\u0645\u0627\u0647\u0648\u0627\u0631\u0647\u200C\u0627\u06CC \u06AF\u0648\u06AF\u0644"),
                    React.createElement("option", { value: "neshan" }, "\u0646\u0634\u0627\u0646 (Neshan)"),
                    React.createElement("option", { value: "balad" }, "\u0628\u0644\u062F (Balad)")),
                React.createElement("button", { className: "btn g", onClick: () => { stopTrack(); } }, mode === "live" ? "â— Ø²Ù†Ø¯Ù‡" : "Ø²Ù†Ø¯Ù‡"),
                React.createElement("button", { className: "btn g", onClick: () => setShowFilters(s => !s) }, (roleFilter && roleFilter.length) || (personFilter && personFilter.length) ? "âš™ ÙÛŒÙ„ØªØ± ÙØ¹Ø§Ù„" : "âš™ ÙÛŒÙ„ØªØ± Ù†Ù…Ø§ÛŒØ´"),
                React.createElement("button", { className: shiftFilter ? "btn p" : "btn g", onClick: () => { const n = !shiftFilter; shiftFilterRef.current = n; setShiftFilter(n); localStorage.liveShiftFilter = n ? "1" : ""; const mk = markersRef.current, grp = layerRef.current; if (grp) {
                        Object.keys(mk).forEach(id => { grp.removeLayer(mk[id]); delete mk[id]; });
                    } drawUsers(); }, title: shiftFilter ? "Ù†Ù…Ø§ÛŒØ´ Ù‡Ù…Ù‡" : "ÙÙ‚Ø· Ø¯Ø± Ø´ÛŒÙØª" }, shiftFilter ? "ğŸ‘¥ ÙÙ‚Ø· Ø¯Ø± Ø´ÛŒÙØª" : "ğŸ‘¥ Ù‡Ù…Ù‡"),
                React.createElement("button", { className: onlyOnline ? "btn p" : "btn g", onClick: () => { const n = !onlyOnline; onlyOnlineRef.current = n; setOnlyOnline(n); const mk = markersRef.current, grp = layerRef.current; if (grp) {
                        Object.keys(mk).forEach(id => { grp.removeLayer(mk[id]); delete mk[id]; });
                    } drawUsers(); }, title: onlyOnline ? "Ù†Ù…Ø§ÛŒØ´ Ù‡Ù…Ù‡" : "ÙÙ‚Ø· Ø¢Ù†Ù„Ø§ÛŒÙ†â€ŒÙ‡Ø§" }, onlyOnline ? "ğŸŸ¢ ÙÙ‚Ø· Ø¢Ù†Ù„Ø§ÛŒÙ†" : "ğŸŸ¢ Ø¢Ù†Ù„Ø§ÛŒÙ†/Ø¢ÙÙ„Ø§ÛŒÙ†"),
                React.createElement("button", { className: "btn g", disabled: savingImg, onClick: saveMapImage }, savingImg ? "Ø¯Ø± Ø­Ø§Ù„ Ø°Ø®ÛŒØ±Ù‡â€¦" : "ğŸ“· Ø°Ø®ÛŒØ±Ù‡Ù” ØªØµÙˆÛŒØ± Ù†Ù‚Ø´Ù‡"))),
        React.createElement("div", { className: "live-map-status", role: "status", "aria-live": "polite" },
            liveLoading ? 'Ø¯Ø± Ø­Ø§Ù„ Ø¯Ø±ÛŒØ§ÙØª Ù…ÙˆÙ‚Ø¹ÛŒØªâ€ŒÙ‡Ø§â€¦' : liveUpdated ? 'Ø¢Ø®Ø±ÛŒÙ† Ø¯Ø±ÛŒØ§ÙØª: ' + liveUpdated.toLocaleTimeString('fa-IR') : 'Ù…ÙˆÙ‚Ø¹ÛŒØªÛŒ Ø¯Ø±ÛŒØ§ÙØª Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª',
            React.createElement("button", { className: "btn g", disabled: liveLoading, onClick: drawUsers }, "\u062A\u0627\u0632\u0647\u200C\u0633\u0627\u0632\u06CC \u0645\u0648\u0642\u0639\u06CC\u062A\u200C\u0647\u0627")),
        liveError && React.createElement("p", { role: "alert" },
            liveError,
            " \u2014 \u0645\u0648\u0642\u0639\u06CC\u062A\u200C\u0647\u0627\u06CC \u0642\u0628\u0644\u06CC \u062D\u0641\u0638 \u0634\u062F\u0647\u200C\u0627\u0646\u062F."),
        React.createElement("button", { className: "btn g", disabled: diagnosticBusy, onClick: diagnoseMap }, diagnosticBusy ? 'Ø¯Ø± Ø­Ø§Ù„ Ø¨Ø±Ø±Ø³ÛŒâ€¦' : 'Ø¨Ø±Ø±Ø³ÛŒ Ø§ØªØµØ§Ù„ Ùˆ Ø³Ø±Ø¹Øª Ù†Ù‚Ø´Ù‡'),
        mapDiagnostic && React.createElement(Modal, { title: "\u0628\u0631\u0631\u0633\u06CC \u0633\u0631\u0639\u062A \u0646\u0642\u0634\u0647", onClose: () => setMapDiagnostic(null) }, mapDiagnostic.error ? React.createElement("p", { role: "alert" }, mapDiagnostic.error) : React.createElement(React.Fragment, null,
            React.createElement("p", null,
                "\u0632\u0645\u0627\u0646 \u0628\u0631\u0631\u0633\u06CC \u067E\u0627\u06CC\u06AF\u0627\u0647 \u062F\u0627\u062F\u0647: ",
                fa(mapDiagnostic.elapsed_ms),
                " \u0645\u06CC\u0644\u06CC\u200C\u062B\u0627\u0646\u06CC\u0647"),
            React.createElement("p", null,
                "\u062A\u0639\u062F\u0627\u062F \u0633\u062A\u0648\u0646\u200C\u0647\u0627\u06CC \u0627\u06CC\u0646\u062F\u06A9\u0633: ",
                fa(mapDiagnostic.indexes.length)),
            React.createElement("p", null,
                "\u062D\u062C\u0645 \u062A\u0635\u0627\u0648\u06CC\u0631 \u0642\u062F\u06CC\u0645\u06CC\u0650 \u062F\u0631\u0648\u0646 \u067E\u0627\u0633\u062E: ",
                fa(Math.round((mapDiagnostic.inline_photo_bytes || 0) / 1024)),
                " \u06A9\u06CC\u0644\u0648\u0628\u0627\u06CC\u062A"),
            React.createElement("div", { className: "table-wrap" },
                React.createElement("table", null,
                    React.createElement("thead", null,
                        React.createElement("tr", null,
                            React.createElement("th", null, "\u0628\u062E\u0634"),
                            React.createElement("th", null, "\u0646\u0648\u0639 \u062F\u0633\u062A\u0631\u0633\u06CC"),
                            React.createElement("th", null, "\u0627\u06CC\u0646\u062F\u06A9\u0633"),
                            React.createElement("th", null, "\u0628\u0631\u0622\u0648\u0631\u062F \u0631\u062F\u06CC\u0641"),
                            React.createElement("th", null, "\u0631\u0648\u0634 \u0627\u062C\u0631\u0627"))),
                    React.createElement("tbody", null, mapDiagnostic.plan.map((row, index) => React.createElement("tr", { key: index },
                        React.createElement("td", null, row.table),
                        React.createElement("td", null, row.type),
                        React.createElement("td", null, row.key || 'â€”'),
                        React.createElement("td", null, fa(row.rows || 0)),
                        React.createElement("td", null, row.Extra || "â€”")))))),
            React.createElement("h4", null, "\u0627\u06CC\u0646\u062F\u06A9\u0633\u200C\u0647\u0627\u06CC \u0645\u0648\u0642\u0639\u06CC\u062A"),
            React.createElement("ul", null, mapDiagnostic.indexes.map((item, index) => React.createElement("li", { key: index },
                item.Key_name,
                ": ",
                item.Seq_in_index,
                " \u2014 ",
                item.Column_name))))),
        React.createElement("div", { className: "tabbar live-map-tabs", role: "tablist", "aria-label": "\u0628\u062E\u0634\u200C\u0647\u0627\u06CC \u0646\u0642\u0634\u0647 \u0632\u0646\u062F\u0647" }, [["main", "ğŸ—º Ù†Ù‚Ø´Ù‡Ù” Ø§ØµÙ„ÛŒ Ù†ÛŒØ±ÙˆÙ‡Ø§"], ["live", "ğŸ›° Ø±Ù‡Ú¯ÛŒØ±ÛŒ Ø²Ù†Ø¯Ù‡"], ["report", "ğŸ“Š Ú¯Ø²Ø§Ø±Ø´ Ù…Ø³ÛŒØ± Ùˆ Ù¾Ø®Ø´"], ["exits", "â›” Ø®Ø±ÙˆØ¬ Ø§Ø² Ù…Ø­Ø¯ÙˆØ¯Ù‡ Ø§Ù…Ø±ÙˆØ²"]].map(([k, lbl]) => React.createElement("button", { type: "button", role: "tab", "aria-selected": viewTab === k, className: viewTab === k ? "live-map-tab-active" : "", key: k, onClick: () => { setViewTab(k); if (k === "main")
                stopTrack(); } }, lbl))),
        showFilters && React.createElement(MapFilters, { allUsers: allUsers, roleFilter: roleFilter, setRoleFilter: setRoleFilter, personFilter: personFilter, setPersonFilter: setPersonFilter, onApply: overrides => { if (overrides) {
                roleFilterRef.current = overrides.roles;
                personFilterRef.current = overrides.people;
            } const mk = markersRef.current, grp = layerRef.current; if (grp) {
                Object.keys(mk).forEach(id => { grp.removeLayer(mk[id]); delete mk[id]; });
            } drawUsers(); } }),
        viewTab === "live" && React.createElement("div", { className: "row", style: { gap: 8, flexWrap: "wrap", marginBottom: 8, alignItems: "center" } },
            React.createElement("span", { style: { fontSize: 12, color: "var(--muted)", fontWeight: 700 } }, "\u0631\u0647\u06AF\u06CC\u0631\u06CC \u0632\u0646\u062F\u0647:"),
            React.createElement("select", { className: "input", style: { maxWidth: 220 }, value: trkUser, onChange: e => setTrkUser(e.target.value) },
                React.createElement("option", { value: "" }, "\u2014 \u0627\u0646\u062A\u062E\u0627\u0628 \u0627\u0632 \u06A9\u0627\u0631\u0628\u0631\u0627\u0646 \u0622\u0646\u0644\u0627\u06CC\u0646 \u2014"),
                onlineUsers.map(p => React.createElement("option", { key: p.id, value: p.id }, p.name))),
            React.createElement("button", { className: "btn g", onClick: startLive }, "\u0634\u0631\u0648\u0639 \u0631\u0647\u06AF\u06CC\u0631\u06CC \u0632\u0646\u062F\u0647"),
            mode !== "live" && React.createElement("button", { className: "btn", onClick: stopTrack }, "\u062A\u0648\u0642\u0641/\u0628\u0627\u0632\u06AF\u0634\u062A")),
        viewTab === "report" && React.createElement(React.Fragment, null,
            React.createElement("div", { className: "row", style: { gap: 8, flexWrap: "wrap", marginBottom: 8, alignItems: "center" } },
                React.createElement("span", { style: { fontSize: 12, color: "var(--muted)", fontWeight: 700 } }, "\u06AF\u0632\u0627\u0631\u0634 \u0645\u0633\u06CC\u0631 \u0628\u0631\u0627\u06CC:"),
                React.createElement(UserPicker, { users: allUsers, value: trkUser, onChange: setTrkUser, placeholder: "\u062C\u0633\u062A\u062C\u0648\u06CC \u0646\u0627\u0645/\u0646\u0627\u0645\u200C\u062E\u0627\u0646\u0648\u0627\u062F\u06AF\u06CC\u2026" })),
            React.createElement("div", { className: "row", style: { gap: 6, flexWrap: "wrap", marginBottom: 8, alignItems: "center" } },
                React.createElement("span", { style: { fontSize: 12, color: "var(--muted)" } }, "\u0628\u0627\u0632\u0647\u0654 \u0622\u0645\u0627\u062F\u0647:"),
                React.createElement("button", { className: "btn g", onClick: () => setPreset("today") }, "\u0627\u0645\u0631\u0648\u0632"),
                React.createElement("button", { className: "btn g", onClick: () => setPreset("yesterday") }, "\u062F\u06CC\u0631\u0648\u0632"),
                React.createElement("button", { className: "btn g", onClick: () => setPreset("7d") }, "\u06F7 \u0631\u0648\u0632 \u0627\u062E\u06CC\u0631"),
                React.createElement("button", { className: "btn g", onClick: () => setPreset("30d") }, "\u06F3\u06F0 \u0631\u0648\u0632 \u0627\u062E\u06CC\u0631"))),
        viewTab === "report" && React.createElement("div", { className: "row", style: { gap: 6, flexWrap: "wrap", marginBottom: 10, alignItems: "center" } },
            React.createElement("span", { style: { fontSize: 12, color: "var(--muted)" } }, "\u0627\u0632"),
            React.createElement(JDate, { value: fromD, onChange: setFromD, placeholder: "\u0627\u0632 \u062A\u0627\u0631\u06CC\u062E" }),
            React.createElement("input", { className: "input", type: "time", value: fromT, onChange: e => setFromT(e.target.value), style: { maxWidth: 110 } }),
            React.createElement("span", { style: { fontSize: 12, color: "var(--muted)" } }, "\u062A\u0627"),
            React.createElement(JDate, { value: toD, onChange: setToD, placeholder: "\u062A\u0627 \u062A\u0627\u0631\u06CC\u062E" }),
            React.createElement("input", { className: "input", type: "time", value: toT, onChange: e => setToT(e.target.value), style: { maxWidth: 110 } }),
            React.createElement("button", { className: "btn t", onClick: showReport }, "\u0646\u0645\u0627\u06CC\u0634 \u0645\u0633\u06CC\u0631"),
            React.createElement("button", { className: "btn p", onClick: exportTrack }, "\u062E\u0631\u0648\u062C\u06CC \u0627\u06A9\u0633\u0644 \u0631\u06CC\u0632 \u062A\u0631\u062F\u062F")),
        trkInfo && React.createElement("p", { style: { fontSize: 13, color: "var(--ink)", margin: "4px 0" } },
            trkInfo.name ? `Ú©Ø§Ø±Ø¨Ø±: ${trkInfo.name} â€” ` : "",
            "\u062A\u0639\u062F\u0627\u062F \u0646\u0642\u0627\u0637 \u0645\u0633\u06CC\u0631: ",
            fa(trkInfo.count || 0),
            mode === "track" ? " (Ø¨Ù‡â€ŒØ±ÙˆØ²Ø±Ø³Ø§Ù†ÛŒ Ø²Ù†Ø¯Ù‡)" : ""),
        React.createElement("div", { id: "map", className: "live-map-canvas", ref: ref, role: "region", "aria-label": "\u0646\u0642\u0634\u0647 \u062A\u0639\u0627\u0645\u0644\u06CC \u0645\u0648\u0642\u0639\u06CC\u062A \u0646\u06CC\u0631\u0648\u0647\u0627" }),
        (viewTab === "main" || viewTab === "live") && React.createElement("div", { style: { display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11.5, color: "var(--muted)", padding: "8px 4px 0" } },
            React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 4 } },
                React.createElement("span", { style: { width: 10, height: 10, borderRadius: "50%", background: "#16a06a", display: "inline-block" } }),
                " \u0622\u0646\u0644\u0627\u06CC\u0646 (GPS)"),
            React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 4 } },
                React.createElement("span", { style: { background: "#d97706", color: "#fff", borderRadius: 6, padding: "0 4px", fontWeight: 700 } }, "\uD83D\uDCF6"),
                " \u0645\u0648\u0642\u0639\u06CC\u062A \u062D\u062F\u0648\u062F\u06CC \u0627\u0632 \u0622\u0646\u062A\u0646 GSM (GPS \u062E\u0627\u0645\u0648\u0634)"),
            React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 4 } },
                React.createElement("span", { style: { background: "#dc2626", color: "#fff", borderRadius: 4, padding: "0 4px", fontWeight: 700, fontSize: 9 } }, "VPN"),
                " \u0641\u06CC\u0644\u062A\u0631\u0634\u06A9\u0646 \u0631\u0648\u0634\u0646")),
        mode === "report" && trkPts && React.createElement("div", { style: { marginTop: 12 } },
            React.createElement(PlaybackControls, { trkPts: trkPts, pbIdx: pbIdx, setPbIdx: setPbIdx, pbPlaying: pbPlaying, setPbPlaying: setPbPlaying, pbSpeed: pbSpeed, setPbSpeed: setPbSpeed, mapRef: mapRef, pbMarkerRef: pbMarkerRef, pbIvRef: pbIvRef }),
            React.createElement("h4", { style: { margin: "6px 0" } },
                "\u0631\u06CC\u0632 \u0646\u0642\u0627\u0637 \u062A\u0631\u062F\u062F (",
                fa((trkPts || []).length),
                " \u0646\u0642\u0637\u0647)"),
            trkPts.length ? React.createElement("div", { style: { maxHeight: "40vh", overflow: "auto" } },
                React.createElement("table", null,
                    React.createElement("thead", null,
                        React.createElement("tr", null,
                            React.createElement("th", null, "\u0631\u062F\u06CC\u0641"),
                            React.createElement("th", null, "\u062A\u0627\u0631\u06CC\u062E/\u0633\u0627\u0639\u062A"),
                            React.createElement("th", null, "\u0627\u06CC\u0633\u062A\u06AF\u0627\u0647 / \u0641\u0627\u0635\u0644\u0647 \u062A\u0627 \u0646\u0632\u062F\u06CC\u06A9\u200C\u062A\u0631\u06CC\u0646 \u062E\u0637"),
                            React.createElement("th", null, "\u062E\u0631\u0648\u062C \u0627\u0632 \u0627\u06CC\u0633\u062A\u06AF\u0627\u0647"),
                            React.createElement("th", null, "\u0645\u0648\u0642\u0639\u06CC\u062A \u062C\u0639\u0644\u06CC"),
                            React.createElement("th", null, "\u0646\u0634\u0627\u0646"))),
                    React.createElement("tbody", null, trkPts.map((p, i) => {
                        const ex = exitNearTime(p.captured_at);
                        return (React.createElement("tr", { key: i, style: ex ? { background: "#fff5f5" } : null },
                            React.createElement("td", null, fa(i + 1)),
                            React.createElement("td", null, fj(p.captured_at)),
                            React.createElement("td", null, stationOf(+p.lat, +p.lng)),
                            React.createElement("td", null, ex ? React.createElement("span", { className: "badge b-no" }, ex) : "â€”"),
                            React.createElement("td", null, p.mocked ? React.createElement("span", { className: "badge b-no" }, "\u0628\u0644\u0647") : React.createElement("span", { className: "badge b-ok" }, "\u062E\u06CC\u0631")),
                            React.createElement("td", null,
                                React.createElement("a", { href: `https://maps.google.com/?q=${p.lat},${p.lng}`, target: "_blank", rel: "noopener", className: "btn g", style: { textDecoration: "none" } }, "\u0646\u0634\u0627\u0646 \u0631\u0648\u06CC \u0646\u0642\u0634\u0647"))));
                    }))))
                : React.createElement("p", { className: "muted" }, "\u062F\u0631 \u0627\u06CC\u0646 \u0628\u0627\u0632\u0647 \u0646\u0642\u0637\u0647\u200C\u0627\u06CC \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A.")),
        React.createElement("p", { style: { fontSize: 12, color: "var(--muted)", marginTop: 10 } },
            React.createElement("span", { style: { color: "#16a06a" } }, "\u25CF"),
            " \u0622\u0646\u0644\u0627\u06CC\u0646 \u00B7",
            React.createElement("span", { style: { color: "#8a93a6" } }, " \u25CF"),
            " \u0622\u0641\u0644\u0627\u06CC\u0646 (\u0622\u062E\u0631\u06CC\u0646 \u0645\u0648\u0642\u0639\u06CC\u062A) \u00B7 \u062E\u0637 \u0633\u0628\u0632 = \u0645\u0633\u06CC\u0631 \u0637\u06CC\u200C\u0634\u062F\u0647. \u0641\u0647\u0631\u0633\u062A \u0647\u0631 \u06F1\u06F5 \u062B\u0627\u0646\u06CC\u0647 \u0628\u0647\u200C\u0631\u0648\u0632 \u0645\u06CC\u200C\u0634\u0648\u062F."),
        viewTab === "main" && React.createElement(PresenceLists, null),
        viewTab === "exits" && React.createElement(StationExits, null)));
}
function Modal({ title, onClose, children, style }) {
    const dialogRef = useRef(null);
    const titleId = useRef("modal-title-" + Math.random().toString(36).slice(2));
    const closeRef = useRef(onClose);
    closeRef.current = onClose;
    useEffect(() => {
        const previous = document.activeElement;
        const dialog = dialogRef.current;
        dialog === null || dialog === void 0 ? void 0 : dialog.focus();
        const onKeyDown = e => {
            if (e.key === "Escape") {
                e.preventDefault();
                closeRef.current();
                return;
            }
            if (e.key !== "Tab" || !dialog)
                return;
            const focusable = [...dialog.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el => el.getClientRects().length);
            if (!focusable.length) {
                e.preventDefault();
                dialog.focus();
                return;
            }
            const first = focusable[0], last = focusable[focusable.length - 1];
            if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
                e.preventDefault();
                last.focus();
            }
            else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => { document.removeEventListener("keydown", onKeyDown); if (previous === null || previous === void 0 ? void 0 : previous.isConnected)
            previous.focus(); };
    }, []);
    return React.createElement("div", { className: "modal-bg", onMouseDown: e => { if (e.target === e.currentTarget)
            onClose(); } },
        React.createElement("div", { className: "modal dashboard-dialog", style: style, ref: dialogRef, role: "dialog", "aria-modal": "true", "aria-labelledby": titleId.current, tabIndex: -1 },
            React.createElement("div", { className: "dashboard-dialog-head" },
                React.createElement("h3", { id: titleId.current }, title),
                React.createElement("button", { className: "dashboard-dialog-close", type: "button", "aria-label": "\u0628\u0633\u062A\u0646 \u067E\u0646\u062C\u0631\u0647", onClick: onClose }, "\u00D7")),
            children));
}
function seniorityEn(value) { return String(value !== null && value !== void 0 ? value : '').replace(/[Û°-Û¹]/g, digit => 'Û°Û±Û²Û³Û´ÛµÛ¶Û·Û¸Û¹'.indexOf(digit)).replace(/[Ù -Ù©]/g, digit => 'Ù Ù¡Ù¢Ù£Ù¤Ù¥Ù¦Ù§Ù¨Ù©'.indexOf(digit)); }
function seniorityEscapeHtml(value) { return String(value !== null && value !== void 0 ? value : '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character])); }
function seniorityPrintBody(rows) {
    const escape = seniorityEscapeHtml;
    const headers = ['Ù†Ø§Ù… Ùˆ Ù†Ø§Ù… Ø®Ø§Ù†ÙˆØ§Ø¯Ú¯ÛŒ', 'Ø´Ù…Ø§Ø±Ù‡ Ù¾Ø±Ø³Ù†Ù„ÛŒ', 'Ø³Ù…Øª', 'Ù…Ù†Ø·Ù‚Ù‡', 'Ù…Ø¨Ù†Ø§ÛŒ Ø³Ù†ÙˆØ§Øª', 'Ø§ØµÙ„Ø§Ø­ Ø¯Ø³ØªÛŒ', 'Ø¬Ù…Ø¹ Ù…Ø§Ù‡â€ŒÙ‡Ø§', 'Ø³Ù†ÙˆØ§Øª Ú©Ù„ (Ø±ÙˆØ²)'];
    const total = rows.reduce((sum, row) => sum + Number(row.seniority_days || 0), 0);
    return '<style>@media print{@page{size:A4 landscape;margin:12mm}#root{display:none!important}#print-area{display:block!important;direction:rtl}.seniority-print thead{display:table-header-group}.seniority-print tr{break-inside:avoid}.seniority-print th{position:static!important;background:#e8f3ef!important;color:#163a2d!important}.seniority-print td,.seniority-print th{border:1px solid #cdded5;padding:8px;font-size:11px;white-space:normal!important}.seniority-print tbody tr:nth-child(even){background:#f3f8f5!important}}</style><div dir="rtl"><p>ØªØ¹Ø¯Ø§Ø¯ Ù†ÛŒØ±ÙˆÙ‡Ø§: ' + escape(fa(rows.length)) + ' Â· Ø¬Ù…Ø¹ Ø³Ù†ÙˆØ§Øª: ' + escape(fa(total)) + ' Ø±ÙˆØ²</p><table class="seniority-print" style="width:100%;border-collapse:collapse;text-align:right"><thead><tr>' + headers.map(title => '<th>' + escape(title) + '</th>').join('') + '</tr></thead><tbody>' + rows.map(row => { var _a, _b, _c; return '<tr>' + [[row.first_name, row.last_name].join(' '), row.personnel_code, row.role_title, row.zone_name, (_a = row.base_days) !== null && _a !== void 0 ? _a : 'â€”', (_b = row.adjustment_days) !== null && _b !== void 0 ? _b : 'â€”', row.monthly_days, (_c = row.seniority_days) !== null && _c !== void 0 ? _c : 'Ø«Ø¨Øª Ù†Ø´Ø¯Ù‡'].map(value => '<td>' + escape(value) + '</td>').join('') + '</tr>'; }).join('') + '</tbody></table></div>';
}
async function downloadSeniorityReport(rows, period) {
    const response = await _fetchWithAuth(API_BASE + '/admin/seniority/export', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ user_ids: rows.map(row => row.id), period }) });
    if (!response.ok) {
        let message = 'Ø³Ø§Ø®Øª ÙØ§ÛŒÙ„ Ø§Ú©Ø³Ù„ Ø§Ù†Ø¬Ø§Ù… Ù†Ø´Ø¯.';
        try {
            const detail = await response.json();
            message = detail.error || detail.message || message;
        }
        catch (_) { }
        throw new Error(message);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url;
    link.download = 'seniority-' + period + '.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
}
function seniorityFilter(rows, filters) {
    const normalize = value => seniorityEn(value).replace(/[ÙŠÙ‰]/g, 'ÛŒ').replace(/Ùƒ/g, 'Ú©').replace(/\s+/g, ' ').trim().toLowerCase();
    const query = normalize(filters.q);
    return rows.filter(row => (!query || normalize([row.first_name, row.last_name, row.username, row.national_code, row.personnel_code].join(' ')).includes(query)) && (!filters.role || String(row.role_id) === filters.role) && (!filters.zone || String(row.zone_id) === filters.zone) && (filters.active === '' || Number(row.is_active) === Number(filters.active)) && (!filters.initialized || String(Number(row.initialized)) === filters.initialized));
}
function seniorityExportRows(rows, period) {
    const safe = value => /^[=+\-@\t\r]/.test(String(value !== null && value !== void 0 ? value : '')) ? "'" + String(value) : value !== null && value !== void 0 ? value : '';
    return rows.map(row => { var _a, _b, _c, _e; return ({ "Ù†Ø§Ù…": safe(row.first_name), "Ù†Ø§Ù… Ø®Ø§Ù†ÙˆØ§Ø¯Ú¯ÛŒ": safe(row.last_name), "Ø´Ù…Ø§Ø±Ù‡ Ù¾Ø±Ø³Ù†Ù„ÛŒ": safe(row.personnel_code), "Ú©Ø¯ Ù…Ù„ÛŒ": safe(row.national_code || row.username), "Ø³Ù…Øª": safe(row.role_title), "Ù…Ù†Ø·Ù‚Ù‡": safe(row.zone_name), "ÙØ¹Ø§Ù„": Number(row.is_active) ? 'Ø¨Ù„Ù‡' : 'Ø®ÛŒØ±', "Ù…Ø¨Ù†Ø§ÛŒ Ø³Ù†ÙˆØ§Øª (Ø±ÙˆØ²)": (_a = row.base_days) !== null && _a !== void 0 ? _a : '', "ØªØ§Ø±ÛŒØ® Ù…Ø¨Ù†Ø§": row.base_through_jdate || '', "Ø§ØµÙ„Ø§Ø­ Ø¯Ø³ØªÛŒ": (_b = row.adjustment_days) !== null && _b !== void 0 ? _b : '', "Ø¬Ù…Ø¹ Ù…Ø§Ù‡â€ŒÙ‡Ø§": row.monthly_days, "Ù…Ø§Ù‡ Ú¯Ø²Ø§Ø±Ø´": period, "Ø³Ù‡Ù… Ù…Ø§Ù‡ Ø¬Ø§Ø±ÛŒ": row.current_month_days, "ØºÛŒØ¨Øª Ù…Ø§Ù‡ Ø¬Ø§Ø±ÛŒ": (_c = row.current_month_absent) !== null && _c !== void 0 ? _c : '', "Ù…ÛŒØ²Ø§Ù† Ø³Ù†ÙˆØ§Øª Ø´Ø®Øµ (Ø±ÙˆØ²)": (_e = row.seniority_days) !== null && _e !== void 0 ? _e : '', "ÙˆØ¶Ø¹ÛŒØª": row.initialized ? 'Ø«Ø¨Øªâ€ŒØ´Ø¯Ù‡' : 'Ù†ÛŒØ§Ø²Ù…Ù†Ø¯ Ø«Ø¨Øª Ù…Ø¨Ù†Ø§' }); });
}
async function seniorityBatchUpdate(rows, period, update, onProgress) {
    const results = [];
    for (const row of rows) {
        try {
            results.push({ id: row.id, name: [row.first_name, row.last_name].join(' '), ok: true, ...await update(row.id, period) });
        }
        catch (error) {
            results.push({ id: row.id, name: [row.first_name, row.last_name].join(' '), ok: false, error: error.message || 'Ø¨Ù‡â€ŒØ±ÙˆØ²Ø±Ø³Ø§Ù†ÛŒ Ø§Ù†Ø¬Ø§Ù… Ù†Ø´Ø¯' });
        }
        onProgress(results.length, rows.length);
    }
    return results;
}
function PersonnelSeniority() {
    const [data, setData] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({ q: '', role: '', zone: '', active: '1', initialized: '' });
    const [editing, setEditing] = useState(null), [days, setDays] = useState(''), [reason, setReason] = useState(''), [baseline, setBaseline] = useState('1405-06-31');
    const [busy, setBusy] = useState(false), [progress, setProgress] = useState(''), [results, setResults] = useState(null), [history, setHistory] = useState(null);
    const mutation = useRef(false), generation = useRef(0);
    const load = async () => {
        const current = ++generation.current;
        setLoading(true);
        setError('');
        try {
            const next = await GET('/admin/seniority');
            if (!Array.isArray(next === null || next === void 0 ? void 0 : next.rows))
                throw new Error('ÙÙ‡Ø±Ø³Øª Ø³Ù†ÙˆØ§Øª Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª.');
            if (generation.current === current)
                setData(next);
        }
        catch (failure) {
            if (generation.current === current)
                setError(failure.message || 'Ø¯Ø±ÛŒØ§ÙØª Ø³Ù†ÙˆØ§Øª Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯.');
        }
        finally {
            if (generation.current === current)
                setLoading(false);
        }
    };
    useEffect(() => { load(); return () => { generation.current++; }; }, []);
    const rows = useMemo(() => seniorityFilter((data === null || data === void 0 ? void 0 : data.rows) || [], filters), [data, filters]);
    const pager = usePager(rows, 25);
    const roles = Array.from(new Map(((data === null || data === void 0 ? void 0 : data.rows) || []).filter(row => row.role_id).map(row => [String(row.role_id), row.role_title])).entries());
    const zones = Array.from(new Map(((data === null || data === void 0 ? void 0 : data.rows) || []).filter(row => row.zone_id).map(row => [String(row.zone_id), row.zone_name])).entries());
    const totals = rows.reduce((sum, row) => ({ days: sum.days + (Number(row.seniority_days) || 0), initialized: sum.initialized + (row.initialized ? 1 : 0) }), { days: 0, initialized: 0 });
    const openEdit = row => { setEditing(row); setDays(row.seniority_days == null ? '' : String(row.seniority_days)); setReason(''); setBaseline(row.base_through_jdate || (data === null || data === void 0 ? void 0 : data.baseline) || '1405-06-31'); };
    const save = async () => {
        if (mutation.current)
            return;
        const value = seniorityEn(days).trim();
        if (!/^\d+$/.test(value) || Number(value) > 1000000 || !reason.trim())
            return alert('ØªØ¹Ø¯Ø§Ø¯ Ø±ÙˆØ² ØµØ­ÛŒØ­ Ùˆ ØºÛŒØ±Ù…Ù†ÙÛŒ Ùˆ Ø¯Ù„ÛŒÙ„ ØªØºÛŒÛŒØ± Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª.');
        mutation.current = true;
        setBusy(true);
        try {
            await SEND('PUT', '/admin/seniority/' + editing.id, { seniority_days: Number(value), revision: editing.revision, reason: reason.trim(), base_through_jdate: seniorityEn(baseline).replace(/\//g, '-') });
            setEditing(null);
            await load();
        }
        catch (failure) {
            alert(failure.message || 'Ø°Ø®ÛŒØ±Ù‡ Ø³Ù†ÙˆØ§Øª Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯.');
        }
        finally {
            mutation.current = false;
            setBusy(false);
        }
    };
    const recalculate = async () => {
        if (mutation.current || !data)
            return;
        const targets = rows.filter(row => row.initialized && Number(row.is_active) === 1);
        if (!targets.length)
            return alert('Ø¯Ø± ÙÙ‡Ø±Ø³Øª ÙØ¹Ù„ÛŒ Ù†ÛŒØ±ÙˆÛŒ ÙØ¹Ø§Ù„Ù Ø¯Ø§Ø±Ø§ÛŒ Ø³Ù†ÙˆØ§Øª Ù…Ø¨Ù†Ø§ ÙˆØ¬ÙˆØ¯ Ù†Ø¯Ø§Ø±Ø¯.');
        if (!confirm('Ø³Ù†ÙˆØ§Øª ' + fa(targets.length) + ' Ù†ÙØ± Ø§Ø² Ù†ÛŒØ±ÙˆÙ‡Ø§ÛŒ ÙØ¹Ø§Ù„Ù Ù†Ù…Ø§ÛŒØ´â€ŒØ¯Ø§Ø¯Ù‡â€ŒØ´Ø¯Ù‡ ØªØ§ Ù¾Ø§ÛŒØ§Ù† ' + faPlain(data.period) + ' Ù…Ø­Ø§Ø³Ø¨Ù‡ Ø´ÙˆØ¯ØŸ Ø³Ù‡Ù… Ù‚Ø¨Ù„ÛŒ Ù‡Ù…ÛŒÙ† Ù…Ø§Ù‡ Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† Ù…ÛŒâ€ŒØ´ÙˆØ¯ØŒ Ù†Ù‡ Ø§ÛŒÙ†Ú©Ù‡ Ø¯ÙˆØ¨Ø§Ø±Ù‡ Ø¬Ù…Ø¹ Ø´ÙˆØ¯.'))
            return;
        mutation.current = true;
        setBusy(true);
        setResults(null);
        try {
            setResults(await seniorityBatchUpdate(targets, data.period, (id, period) => SEND('POST', '/admin/seniority/' + id + '/recalculate', { period }), (done, total) => setProgress('Ø¨Ø±Ø±Ø³ÛŒ ' + fa(done) + ' Ø§Ø² ' + fa(total))));
            await load();
        }
        finally {
            setProgress('');
            mutation.current = false;
            setBusy(false);
        }
    };
    const showHistory = async (row) => {
        if (mutation.current)
            return;
        mutation.current = true;
        setBusy(true);
        try {
            const response = await GET('/admin/seniority/' + row.id + '/history');
            setHistory({ person: row, rows: response.rows || [] });
        }
        catch (failure) {
            alert(failure.message || 'Ø¯Ø±ÛŒØ§ÙØª ØªØ§Ø±ÛŒØ®Ú†Ù‡ Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯.');
        }
        finally {
            mutation.current = false;
            setBusy(false);
        }
    };
    const exportReport = async () => { if (mutation.current || !data)
        return; mutation.current = true; setBusy(true); try {
        await downloadSeniorityReport(rows, data.period);
    }
    catch (failure) {
        alert(failure.message);
    }
    finally {
        mutation.current = false;
        setBusy(false);
    } };
    const printReport = () => {
        const body = seniorityPrintBody(rows);
        printLetterhead('Ø³Ù†ÙˆØ§Øª Ù†ÛŒØ±ÙˆÙ‡Ø§ â€” ' + faPlain(data.period), body, { subtitle: 'ÙˆØ§Ø­Ø¯: Ø±ÙˆØ²Ø› Ø³Ù‡Ù… Ù…Ø§Ù‡ Ø¬Ø§Ø±ÛŒ ØªØ§ Ù¾Ø§ÛŒØ§Ù† Ù…Ø§Ù‡ Ùˆ Ø¨Ù‡â€ŒØµÙˆØ±Øª Ø¹Ù„ÛŒâ€ŒØ§Ù„Ø­Ø³Ø§Ø¨ Ø§Ø³Øª.' });
    };
    return React.createElement("div", { className: "panel admin-workspace-page", "data-testid": "personnel-seniority" },
        React.createElement("div", { className: "row", style: { justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' } },
            React.createElement("div", null,
                React.createElement("h3", null, "\u0633\u0646\u0648\u0627\u062A \u0646\u06CC\u0631\u0648\u0647\u0627"),
                React.createElement("p", { style: { color: 'var(--muted)', lineHeight: 2 } }, "\u0645\u06CC\u0632\u0627\u0646 \u0633\u0646\u0648\u0627\u062A \u0634\u062E\u0635 \u0628\u0631 \u0627\u0633\u0627\u0633 \u062A\u0639\u062F\u0627\u062F \u0631\u0648\u0632\u061B \u0645\u0628\u0646\u0627\u06CC \u0627\u06A9\u0633\u0644 \u062A\u0627 \u067E\u0627\u06CC\u0627\u0646 \u0634\u0647\u0631\u06CC\u0648\u0631 \u06F1\u06F4\u06F0\u06F5.")),
            React.createElement("div", { className: "row", style: { gap: 8, flexWrap: 'wrap' } },
                React.createElement("button", { className: "btn g", disabled: loading || busy, onClick: load }, "\u0628\u0627\u0632\u062E\u0648\u0627\u0646\u06CC"),
                React.createElement("button", { className: "btn g", disabled: !rows.length || busy, onClick: exportReport }, "\u062E\u0631\u0648\u062C\u06CC \u0627\u06A9\u0633\u0644"),
                React.createElement("button", { className: "btn g", disabled: !rows.length || busy, onClick: printReport }, "\u0686\u0627\u067E \u06AF\u0632\u0627\u0631\u0634"),
                React.createElement("button", { className: "btn p", disabled: !data || busy || loading, onClick: recalculate }, busy && progress ? progress : 'Ø¨Ù‡â€ŒØ±ÙˆØ²Ø±Ø³Ø§Ù†ÛŒ ØªØ§ Ø§Ù†ØªÙ‡Ø§ÛŒ Ù…Ø§Ù‡'))),
        React.createElement("div", { role: "note", style: { background: '#edf8f4', border: '1px solid var(--line)', borderRadius: 14, padding: 14, lineHeight: 2, margin: '16px 0' } },
            "\u0645\u0627\u0647 \u062C\u0627\u0631\u06CC: ",
            React.createElement("b", null, faPlain((data === null || data === void 0 ? void 0 : data.period) || 'â€”')),
            " \u00B7 \u062A\u0639\u062F\u0627\u062F \u0631\u0648\u0632\u0647\u0627\u06CC \u0645\u0627\u0647: ",
            fa((data === null || data === void 0 ? void 0 : data.month_days) || 'â€”'),
            React.createElement("br", null),
            "\u0645\u062D\u0627\u0633\u0628\u0647: \u062A\u0645\u0627\u0645 \u0631\u0648\u0632\u0647\u0627\u06CC \u0645\u0627\u0647 \u0645\u0646\u0647\u0627\u06CC \u063A\u06CC\u0628\u062A\u0650 \u0631\u0648\u0632\u0647\u0627\u06CC \u067E\u0627\u06CC\u0627\u0646\u200C\u06CC\u0627\u0641\u062A\u0647\u060C \u0645\u0637\u0627\u0628\u0642 \u06AF\u0632\u0627\u0631\u0634 \u062A\u0631\u062F\u062F. \u062C\u0645\u0639\u0647\u060C \u062A\u0639\u0637\u06CC\u0644\u06CC \u0648 \u0645\u0631\u062E\u0635\u06CC\u0650 \u062A\u0623\u06CC\u06CC\u062F\u0634\u062F\u0647 \u063A\u06CC\u0628\u062A \u0645\u062D\u0633\u0648\u0628 \u0646\u0645\u06CC\u200C\u0634\u0648\u0646\u062F. \u0631\u0648\u0632\u0647\u0627\u06CC \u0622\u06CC\u0646\u062F\u0647 \u0639\u0644\u06CC\u200C\u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u0646\u0638\u0648\u0631 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F \u0648 \u0628\u0627 \u0627\u0635\u0644\u0627\u062D \u062A\u0631\u062F\u062F\u060C \u0633\u0647\u0645 \u0647\u0645\u06CC\u0646 \u0645\u0627\u0647 \u0627\u0635\u0644\u0627\u062D \u062E\u0648\u0627\u0647\u062F \u0634\u062F\u061B \u0645\u0627\u0647\u200C\u0647\u0627\u06CC \u0642\u0628\u0644 \u062F\u0648\u0628\u0627\u0631\u0647 \u0627\u0641\u0632\u0648\u062F\u0647 \u0646\u0645\u06CC\u200C\u0634\u0648\u0646\u062F. \u0646\u06CC\u0631\u0648\u0647\u0627\u06CC \u0628\u062F\u0648\u0646 \u0645\u0628\u0646\u0627 \u0648 \u063A\u06CC\u0631\u0641\u0639\u0627\u0644 \u062E\u0648\u062F\u06A9\u0627\u0631 \u0645\u062D\u0627\u0633\u0628\u0647 \u0646\u0645\u06CC\u200C\u0634\u0648\u0646\u062F."),
        error && React.createElement("div", { role: "alert", style: { color: 'var(--danger)', padding: 12 } },
            error,
            " ",
            React.createElement("button", { className: "btn g", disabled: loading || busy, onClick: load }, "\u062A\u0644\u0627\u0634 \u0645\u062C\u062F\u062F")),
        React.createElement("div", { className: "row", style: { gap: 10, flexWrap: 'wrap', marginBottom: 16 } },
            React.createElement("input", { className: "input", style: { maxWidth: 320 }, "aria-label": "\u062C\u0633\u062A\u062C\u0648\u06CC \u067E\u0631\u0633\u0646\u0644", placeholder: "\u0646\u0627\u0645\u060C \u06A9\u062F \u0645\u0644\u06CC \u06CC\u0627 \u0634\u0645\u0627\u0631\u0647 \u067E\u0631\u0633\u0646\u0644\u06CC", value: filters.q, onChange: event => setFilters({ ...filters, q: event.target.value }) }),
            React.createElement("select", { className: "input", style: { maxWidth: 180 }, "aria-label": "\u0641\u06CC\u0644\u062A\u0631 \u0633\u0645\u062A", value: filters.role, onChange: event => setFilters({ ...filters, role: event.target.value }) },
                React.createElement("option", { value: "" }, "\u0647\u0645\u0647 \u0633\u0645\u062A\u200C\u0647\u0627"),
                roles.map(([id, title]) => React.createElement("option", { key: id, value: id }, title))),
            React.createElement("select", { className: "input", style: { maxWidth: 180 }, "aria-label": "\u0641\u06CC\u0644\u062A\u0631 \u0645\u0646\u0637\u0642\u0647", value: filters.zone, onChange: event => setFilters({ ...filters, zone: event.target.value }) },
                React.createElement("option", { value: "" }, "\u0647\u0645\u0647 \u0645\u0646\u0627\u0637\u0642"),
                zones.map(([id, title]) => React.createElement("option", { key: id, value: id }, title))),
            React.createElement("select", { className: "input", style: { maxWidth: 180 }, "aria-label": "\u0648\u0636\u0639\u06CC\u062A \u0646\u06CC\u0631\u0648", value: filters.active, onChange: event => setFilters({ ...filters, active: event.target.value }) },
                React.createElement("option", { value: "" }, "\u0641\u0639\u0627\u0644 \u0648 \u063A\u06CC\u0631\u0641\u0639\u0627\u0644"),
                React.createElement("option", { value: "1" }, "\u0641\u0639\u0627\u0644"),
                React.createElement("option", { value: "0" }, "\u063A\u06CC\u0631\u0641\u0639\u0627\u0644")),
            React.createElement("select", { className: "input", style: { maxWidth: 180 }, "aria-label": "\u0648\u0636\u0639\u06CC\u062A \u0633\u0646\u0648\u0627\u062A", value: filters.initialized, onChange: event => setFilters({ ...filters, initialized: event.target.value }) },
                React.createElement("option", { value: "" }, "\u0647\u0645\u0647 \u0648\u0636\u0639\u06CC\u062A\u200C\u0647\u0627"),
                React.createElement("option", { value: "1" }, "\u0645\u0628\u0646\u0627\u06CC \u062B\u0628\u062A\u200C\u0634\u062F\u0647"),
                React.createElement("option", { value: "0" }, "\u0646\u06CC\u0627\u0632\u0645\u0646\u062F \u062B\u0628\u062A \u0645\u0628\u0646\u0627"))),
        React.createElement("div", { className: "row", style: { gap: 16, flexWrap: 'wrap', marginBottom: 14 } },
            React.createElement("b", null,
                fa(rows.length),
                " \u0646\u0641\u0631"),
            React.createElement("span", null,
                fa(totals.initialized),
                " \u0646\u0641\u0631 \u062F\u0627\u0631\u0627\u06CC \u0645\u0628\u0646\u0627"),
            React.createElement("span", null,
                "\u062C\u0645\u0639 \u0633\u0646\u0648\u0627\u062A \u0641\u0647\u0631\u0633\u062A: ",
                React.createElement("b", null,
                    fa(totals.days),
                    " \u0631\u0648\u0632")),
            React.createElement("span", { style: { color: 'var(--danger)' } },
                fa(rows.length - totals.initialized),
                " \u0646\u0641\u0631 \u0646\u06CC\u0627\u0632\u0645\u0646\u062F \u062A\u0637\u0628\u06CC\u0642 \u06CC\u0627 \u062B\u0628\u062A \u0645\u0628\u0646\u0627")),
        loading && React.createElement("p", { role: "status" }, "\u062F\u0631 \u062D\u0627\u0644 \u062F\u0631\u06CC\u0627\u0641\u062A \u0627\u0637\u0644\u0627\u0639\u0627\u062A\u2026"),
        React.createElement("div", { style: { overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 14 } },
            React.createElement("table", { className: "tbl", style: { minWidth: 1100, width: '100%' } },
                React.createElement("thead", null,
                    React.createElement("tr", null, ['Ù†Ø§Ù… Ùˆ Ù†Ø§Ù… Ø®Ø§Ù†ÙˆØ§Ø¯Ú¯ÛŒ', 'Ø´Ù…Ø§Ø±Ù‡ Ù¾Ø±Ø³Ù†Ù„ÛŒ', 'Ø³Ù…Øª / Ù…Ù†Ø·Ù‚Ù‡', 'Ù…Ø¨Ù†Ø§ (Ø±ÙˆØ²)', 'ØªØ§ ØªØ§Ø±ÛŒØ®', 'Ø§ØµÙ„Ø§Ø­ Ø¯Ø³ØªÛŒ', 'Ø¬Ù…Ø¹ Ù…Ø§Ù‡â€ŒÙ‡Ø§', 'Ø³Ù‡Ù… Ù…Ø§Ù‡ Ø¬Ø§Ø±ÛŒ', 'ØºÛŒØ¨Øª Ù…Ø§Ù‡ Ø¬Ø§Ø±ÛŒ', 'Ù…ÛŒØ²Ø§Ù† Ø³Ù†ÙˆØ§Øª Ø´Ø®Øµ (Ø±ÙˆØ²)', 'Ø¹Ù…Ù„ÛŒØ§Øª'].map(title => React.createElement("th", { key: title }, title)))),
                React.createElement("tbody", null,
                    pager.slice.map(row => { var _a, _b, _c; return React.createElement("tr", { key: row.id },
                        React.createElement("td", null,
                            row.first_name,
                            " ",
                            row.last_name,
                            React.createElement("small", { style: { display: 'block', color: 'var(--muted)' } }, row.national_code || row.username)),
                        React.createElement("td", null, faPlain(row.personnel_code || 'â€”')),
                        React.createElement("td", null,
                            row.role_title || 'â€”',
                            React.createElement("small", { style: { display: 'block' } }, row.zone_name || 'â€”')),
                        React.createElement("td", null, fa((_a = row.base_days) !== null && _a !== void 0 ? _a : 'â€”')),
                        React.createElement("td", null, faPlain(row.base_through_jdate || 'â€”')),
                        React.createElement("td", null, fa((_b = row.adjustment_days) !== null && _b !== void 0 ? _b : 'â€”')),
                        React.createElement("td", null, fa(row.monthly_days)),
                        React.createElement("td", { title: 'Ø¨Ø±Ø±Ø³ÛŒ ØªØ§ ' + (row.checked_through_jdate || 'â€”') }, row.current_month_updated_at ? fa(row.current_month_days) : 'Ù…Ø­Ø§Ø³Ø¨Ù‡ Ù†Ø´Ø¯Ù‡'),
                        React.createElement("td", { title: (row.absence_dates || []).join('ØŒ ') }, fa((_c = row.current_month_absent) !== null && _c !== void 0 ? _c : 'â€”')),
                        React.createElement("td", null,
                            React.createElement("b", { style: { color: row.initialized ? 'var(--brand)' : 'var(--danger)' } }, row.initialized ? fa(row.seniority_days) : 'Ù†ÛŒØ§Ø²Ù…Ù†Ø¯ Ù…Ø¨Ù†Ø§')),
                        React.createElement("td", null,
                            React.createElement("div", { className: "row", style: { gap: 6, flexWrap: 'wrap' } },
                                React.createElement("button", { className: "btn g", disabled: busy, onClick: () => openEdit(row) }, row.initialized ? 'ÙˆÛŒØ±Ø§ÛŒØ´' : 'Ø«Ø¨Øª Ù…Ø¨Ù†Ø§'),
                                React.createElement("button", { className: "btn g", disabled: busy || !row.initialized, onClick: () => showHistory(row) }, "\u062A\u0627\u0631\u06CC\u062E\u0686\u0647")))); }),
                    !loading && !rows.length && React.createElement("tr", null,
                        React.createElement("td", { colSpan: 11, style: { padding: 28, textAlign: 'center' } }, "\u067E\u0631\u0633\u0646\u0644\u06CC \u0628\u0627 \u0627\u06CC\u0646 \u0641\u06CC\u0644\u062A\u0631 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F."))))),
        pager.Pager(),
        results && React.createElement("div", { role: "status", style: { padding: 14, lineHeight: 2 } },
            React.createElement("b", null,
                "\u0646\u062A\u06CC\u062C\u0647 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC: ",
                fa(results.filter(result => result.ok).length),
                " \u0645\u0648\u0641\u0642\u060C ",
                fa(results.filter(result => !result.ok).length),
                " \u0646\u0627\u0645\u0648\u0641\u0642\u061B \u062A\u063A\u06CC\u06CC\u0631 \u062E\u0627\u0644\u0635 ",
                fa(results.filter(result => result.ok).reduce((sum, result) => sum + Number(result.delta_days || 0), 0)),
                " \u0631\u0648\u0632."),
            results.filter(result => !result.ok).map(result => React.createElement("div", { key: result.id, style: { color: 'var(--danger)' } },
                result.name,
                ": ",
                result.error))),
        editing && React.createElement(Modal, { title: 'Ø³Ù†ÙˆØ§Øª ' + editing.first_name + ' ' + editing.last_name, onClose: () => !busy && setEditing(null) },
            React.createElement("form", { onSubmit: event => { event.preventDefault(); save(); } },
                React.createElement("label", { className: "label", style: { display: 'block', marginTop: 14 } },
                    "\u0645\u06CC\u0632\u0627\u0646 \u0633\u0646\u0648\u0627\u062A \u0634\u062E\u0635 (\u0631\u0648\u0632)",
                    React.createElement("input", { className: "input", style: { display: 'block', marginTop: 6 }, "aria-label": "\u0645\u06CC\u0632\u0627\u0646 \u0633\u0646\u0648\u0627\u062A \u0634\u062E\u0635 \u0628\u0631 \u0627\u0633\u0627\u0633 \u062A\u0639\u062F\u0627\u062F \u0631\u0648\u0632", inputMode: "numeric", value: days, onChange: event => setDays(event.target.value), required: true, disabled: busy })),
                !editing.initialized ? React.createElement("label", { className: "label", style: { display: 'block', marginTop: 14 } },
                    "\u0633\u0646\u0648\u0627\u062A \u062A\u0627 \u067E\u0627\u06CC\u0627\u0646 \u0627\u06CC\u0646 \u062A\u0627\u0631\u06CC\u062E (\u0634\u0645\u0633\u06CC)",
                    React.createElement("input", { className: "input", style: { display: 'block', marginTop: 6 }, "aria-label": "\u062A\u0627\u0631\u06CC\u062E \u0645\u0628\u0646\u0627\u06CC \u0633\u0646\u0648\u0627\u062A", dir: "ltr", placeholder: "1405-06-31", value: baseline, onChange: event => setBaseline(event.target.value), required: true, disabled: busy })) : React.createElement("p", { style: { lineHeight: 2 } }, "\u0645\u0628\u0646\u0627\u06CC \u0627\u06A9\u0633\u0644 \u0648 \u0633\u0647\u0645 \u0645\u0627\u0647\u200C\u0647\u0627 \u062D\u0641\u0638 \u0645\u06CC\u200C\u0634\u0648\u062F\u061B \u0627\u062E\u062A\u0644\u0627\u0641 \u0639\u062F\u062F \u0648\u0627\u0631\u062F\u0634\u062F\u0647 \u0628\u0647\u200C\u0639\u0646\u0648\u0627\u0646 \u0627\u0635\u0644\u0627\u062D \u062F\u0633\u062A\u06CC \u062B\u0628\u062A \u062E\u0648\u0627\u0647\u062F \u0634\u062F."),
                React.createElement("label", { className: "label", style: { display: 'block', marginTop: 14 } },
                    "\u062F\u0644\u06CC\u0644 \u062B\u0628\u062A \u06CC\u0627 \u0627\u0635\u0644\u0627\u062D",
                    React.createElement("textarea", { className: "input", rows: 3, style: { display: 'block', marginTop: 6, resize: 'vertical' }, "aria-label": "\u062F\u0644\u06CC\u0644 \u0627\u0635\u0644\u0627\u062D \u0633\u0646\u0648\u0627\u062A", value: reason, onChange: event => setReason(event.target.value), maxLength: 500, required: true, disabled: busy })),
                React.createElement("div", { className: "row", style: { gap: 8, marginTop: 14 } },
                    React.createElement("button", { type: "submit", className: "btn p", disabled: busy }, busy ? 'Ø¯Ø± Ø­Ø§Ù„ Ø°Ø®ÛŒØ±Ù‡â€¦' : 'Ø°Ø®ÛŒØ±Ù‡ Ø³Ù†ÙˆØ§Øª'),
                    React.createElement("button", { type: "button", className: "btn g", disabled: busy, onClick: () => setEditing(null) }, "\u0627\u0646\u0635\u0631\u0627\u0641")))),
        history && React.createElement(Modal, { title: 'ØªØ§Ø±ÛŒØ®Ú†Ù‡ Ø³Ù†ÙˆØ§Øª ' + history.person.first_name + ' ' + history.person.last_name, onClose: () => setHistory(null) },
            React.createElement("div", { style: { maxHeight: '65vh', overflow: 'auto' } }, history.rows.length ? history.rows.map(event => React.createElement("div", { key: event.id, style: { padding: 12, borderBottom: '1px solid var(--line)', lineHeight: 2 } },
                React.createElement("b", null,
                    event.kind === 'recalculate' ? 'Ù…Ø­Ø§Ø³Ø¨Ù‡ Ù…Ø§Ù‡Ø§Ù†Ù‡' : event.kind === 'import' ? 'ÙˆØ±ÙˆØ¯ Ø§Ú©Ø³Ù„' : event.kind === 'initialize' ? 'Ø«Ø¨Øª Ù…Ø¨Ù†Ø§' : 'Ø§ØµÙ„Ø§Ø­ Ø¯Ø³ØªÛŒ',
                    " ",
                    faPlain(event.period || '')),
                React.createElement("div", null,
                    fa(event.total_before),
                    " \u2190 ",
                    fa(event.total_after),
                    " \u0631\u0648\u0632 \u00B7 \u0627\u062E\u062A\u0644\u0627\u0641 ",
                    fa(event.delta_days)),
                React.createElement("div", null, event.reason),
                React.createElement("small", null,
                    event.actor_name || 'ÙˆØ±ÙˆØ¯ Ø§Ø² SQL',
                    " \u00B7 ",
                    event.created_at))) : React.createElement("p", null, "\u062A\u0627\u0631\u06CC\u062E\u0686\u0647\u200C\u0627\u06CC \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A."))));
}
function Users() {
    var _a, _b;
    const [usersTab, setUsersTab] = useState("users");
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [zones, setZones] = useState([]);
    const [edit, setEdit] = useState(null);
    const [lineModal, setLineModal] = useState(null);
    const [adding, setAdding] = useState(false);
    const [commitmentsModal, setCommitmentsModal] = useState(null);
    const [f, setF] = useState({ q: "", role_id: "", zone_id: "", active: "" });
    const [pw, setPw] = useState("");
    const [usersLoading, setUsersLoading] = useState(false);
    const [usersError, setUsersError] = useState("");
    const [savingUser, setSavingUser] = useState(false);
    const [exportingUsers, setExportingUsers] = useState(false);
    const requestSeq = useRef(0);
    const clean = o => { const x = { ...o }; Object.keys(x).forEach(k => (x[k] === "" || x[k] == null) && delete x[k]); return x; };
    const reload = async (filters = f) => { const request = ++requestSeq.current; setUsersLoading(true); setUsersError(""); try {
        const us = await db.users(clean(filters));
        if (request !== requestSeq.current)
            return;
        setUsers((Array.isArray(us) ? us : []).map(u => ({ ...u, is_active: (u.is_active == 1 || u.is_active === true) })));
        pg.setPage(1);
    }
    catch (error) {
        if (request === requestSeq.current)
            setUsersError(error.message || "Ø¯Ø±ÛŒØ§ÙØª ÙÙ‡Ø±Ø³Øª Ú©Ø§Ø±Ø¨Ø±Ø§Ù† Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯.");
    }
    finally {
        if (request === requestSeq.current)
            setUsersLoading(false);
    } };
    const pg = usePager(users, 10);
    useEffect(() => { reload(); db.roles().then(setRoles).catch(() => { }); db.zones().then(setZones).catch(() => { }); }, []);
    const rt = id => { var _a; return ((_a = roles.find(r => r.id === id)) === null || _a === void 0 ? void 0 : _a.title) || ""; };
    const zn = id => { var _a; return ((_a = zones.find(z => z.id === id)) === null || _a === void 0 ? void 0 : _a.name) || "â€”"; };
    const defaultStars = (role) => { const r = String(role || ""); if (r.includes("Ø³Ø±Ø¨Ø§Ø²Ø±Ø³"))
        return 4; if (r.includes("Ø¨Ø§Ø²Ø±Ø³"))
        return 2; if (r.includes("Ù†Ø§Ø¸Ø± Ø®Ø·") || r.includes("Ø§Ù¾Ø±Ø§ØªÙˆØ±"))
        return 1; return 0; };
    const starsForUser = (u) => { const n = (u.rank_stars !== null && u.rank_stars !== undefined && u.rank_stars !== "") ? Math.max(0, Math.min(5, +u.rank_stars || 0)) : defaultStars(u.role_title || rt(u.role_id)); return n ? "â˜…".repeat(n) : "â€”"; };
    const save = async (u) => {
        if (savingUser)
            return;
        if (u.employment_start_date && u.employment_end_date && String(u.employment_end_date).replaceAll('/', '-') < String(u.employment_start_date).replaceAll('/', '-')) {
            alert('ØªØ§Ø±ÛŒØ® Ø§ØªÙ…Ø§Ù… Ù‡Ù…Ú©Ø§Ø±ÛŒ Ù†Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ø¯ Ù‚Ø¨Ù„ Ø§Ø² ØªØ§Ø±ÛŒØ® Ø´Ø±ÙˆØ¹ Ø¨Ø§Ø´Ø¯.');
            return;
        }
        setSavingUser(true);
        try {
            await db.updateUser(u.id, { employment_start_date: u.employment_start_date || null, employment_end_date: u.employment_end_date || null, first_name: u.first_name, last_name: u.last_name, email: u.email, role_id: u.role_id, zone_id: u.zone_id, is_active: u.is_active, allow_android: u.allow_android ? 1 : 0, allow_web: u.allow_web ? 1 : 0, security_exempt: u.security_exempt ? 1 : 0, phone: u.phone, national_code: u.national_code, marital_status: u.marital_status, address: u.address, children_count: u.children_count, presence_required: u.presence_required ? 1 : 0, seniority_start: u.seniority_start || null, can_send_sms: u.can_send_sms ? 1 : 0, can_be_substitute: u.can_be_substitute ? 1 : 0, can_welfare: u.can_welfare ? 1 : 0, can_cultural: u.can_cultural ? 1 : 0, can_manage_temp_drivers: u.can_manage_temp_drivers ? 1 : 0, personnel_code: u.personnel_code || null, birth_date: u.birth_date || null, rank_stars: (u.rank_stars === '' || u.rank_stars == null) ? null : Math.max(0, Math.min(5, +u.rank_stars || 0)) });
            // The API must return the committed values, not just acknowledge the PUT.
            const persisted = await GET('/admin/users/' + u.id + '/employment-period');
            const normalizeDate = v => String(v || '').trim().replaceAll('/', '-');
            if (normalizeDate(persisted.employment_start_date) !== normalizeDate(u.employment_start_date) || normalizeDate(persisted.employment_end_date) !== normalizeDate(u.employment_end_date)) {
                alert('ØªØ§Ø±ÛŒØ® Ù‡Ù…Ú©Ø§Ø±ÛŒ Ø¯Ø± Ù¾Ø§ÛŒÚ¯Ø§Ù‡ Ø¯Ø§Ø¯Ù‡ Ù…Ø·Ø§Ø¨Ù‚ Ù…Ù‚Ø¯Ø§Ø± ÙˆØ§Ø±Ø¯Ø´Ø¯Ù‡ Ø°Ø®ÛŒØ±Ù‡ Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª. Ø§Ø·Ù„Ø§Ø¹Ø§Øª ÙˆØ§Ù‚Ø¹ÛŒ Ø³Ø±ÙˆØ± Ù†Ù…Ø§ÛŒØ´ Ø¯Ø§Ø¯Ù‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯.');
                setEdit(current => current && Number(current.id) === Number(u.id) ? { ...current, employment_start_date: persisted.employment_start_date || '', employment_end_date: persisted.employment_end_date || '' } : current);
                return;
            }
            if (pw) {
                await db.resetPassword(u.id, pw);
            }
            setEdit(null);
            setPw("");
            await reload();
        }
        catch (error) {
            alert('Ø°Ø®ÛŒØ±Ù‡Ù” Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ú©Ø§Ø±Ø¨Ø± Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯: ' + (error.message || error));
        }
        finally {
            setSavingUser(false);
        }
    };
    const add = async (u) => { const r = await db.createUser(u); setAdding(false); reload(); if (r && r.sms_sent)
        alert("Ú©Ø§Ø±Ø¨Ø± Ø³Ø§Ø®ØªÙ‡ Ø´Ø¯ Ùˆ Ù†Ø§Ù… Ú©Ø§Ø±Ø¨Ø±ÛŒ/Ø±Ù…Ø² Ø¹Ø¨ÙˆØ± Ø¨Ø±Ø§ÛŒ Ø§Ùˆ Ù¾ÛŒØ§Ù…Ú© Ø´Ø¯."); };
    const revoke = async (id, type) => { if (confirm("Ø´Ù†Ø§Ø³Ù‡Ù” Ø¯Ø³ØªÚ¯Ø§Ù‡ (" + (type === 'android' ? 'Ø§Ù†Ø¯Ø±ÙˆÛŒØ¯' : 'ÙˆØ¨') + ") Ø­Ø°Ù Ø´ÙˆØ¯ØŸ")) {
        await db.revokeDevice(id, type);
        reload();
    } };
    const delUser = async (u) => { if (confirm('Ø­Ø°Ù Ú©Ø§Ù…Ù„ Ú©Ø§Ø±Ø¨Ø± Â«' + u.first_name + ' ' + u.last_name + 'Â»ØŸ Ø¨Ø±Ú¯Ø´Øªâ€ŒÙ†Ø§Ù¾Ø°ÛŒØ± Ø§Ø³Øª.')) {
        try {
            await db.deleteUser(u.id);
            await reload();
        }
        catch (error) {
            alert('Ø­Ø°Ù Ú©Ø§Ø±Ø¨Ø± Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯: ' + (error.message || error));
        }
    } };
    const pickPhoto = async (u, file) => { if (!file)
        return; const data = await compressImage(file, 512, 0.6); await db.adminSetPhoto(u.id, data); setEdit(e => e ? { ...e, photo: data } : e); reload(); };
    const pickSignature = async (u, file) => { if (!file)
        return; const data = await compressImage(file, 500, 0.7); await db.adminSetSignature(u.id, data); setEdit(e => e ? { ...e, signature_data: data } : e); reload(); };
    const clearSignature = async (u) => { if (!confirm("Ø§Ù…Ø¶Ø§ÛŒ Ø§ÛŒÙ† Ú©Ø§Ø±Ø¨Ø± Ø­Ø°Ù Ø´ÙˆØ¯ØŸ"))
        return; await db.adminSetSignature(u.id, ""); setEdit(e => e ? { ...e, signature_data: null } : e); reload(); };
    if (usersTab !== "users")
        return (React.createElement("div", { className: "panel" },
            React.createElement("h3", null, "\u0645\u062F\u06CC\u0631\u06CC\u062A \u06A9\u0627\u0631\u0628\u0631\u0627\u0646"),
            React.createElement("div", { className: "row", style: { gap: 8, marginBottom: 14, flexWrap: "wrap" } },
                React.createElement("button", { className: "btn " + (usersTab === "users" ? "p" : "g"), onClick: () => setUsersTab("users") }, "\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u06A9\u0627\u0631\u0628\u0631\u0627\u0646"),
                React.createElement("button", { className: "btn " + (usersTab === "vehicles" ? "p" : "g"), onClick: () => setUsersTab("vehicles") }, "\u062E\u0648\u062F\u0631\u0648 \u0648 \u0645\u0648\u062A\u0648\u0631\u0633\u06CC\u06A9\u0644\u062A"),
                React.createElement("button", { className: "btn " + (usersTab === "checklist" ? "p" : "g"), onClick: () => setUsersTab("checklist") }, "\u0686\u06A9\u200C\u0644\u06CC\u0633\u062A \u062E\u0648\u062F\u0631\u0648 \u0648 \u0645\u0648\u062A\u0648\u0631\u0633\u06CC\u06A9\u0644\u062A")),
            usersTab === "vehicles" ? React.createElement(PersonnelVehicleAssets, null) : React.createElement(PersonnelVehicleChecklistV2, null)));
    return (React.createElement("div", { className: "panel admin-workspace-page admin-list-page users-management-page" },
        React.createElement("div", { className: "users-hero" },
            React.createElement("div", { className: "users-hero-copy" },
                React.createElement("span", { className: "users-eyebrow" }, "\u0645\u062F\u06CC\u0631\u06CC\u062A \u0645\u0646\u0627\u0628\u0639 \u0627\u0646\u0633\u0627\u0646\u06CC / \u062F\u0633\u062A\u0631\u0633\u06CC\u200C\u0647\u0627"),
                React.createElement("h3", null, "\u0645\u062F\u06CC\u0631\u06CC\u062A \u06A9\u0627\u0631\u0628\u0631\u0627\u0646"),
                React.createElement("p", null, "\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u067E\u0631\u0633\u0646\u0644\u060C \u0633\u0637\u062D \u062F\u0633\u062A\u0631\u0633\u06CC \u0648 \u062F\u0633\u062A\u06AF\u0627\u0647\u200C\u0647\u0627\u06CC \u0645\u062A\u0635\u0644 \u0631\u0627 \u0627\u0632 \u06CC\u06A9 \u0646\u0645\u0627\u06CC \u06CC\u06A9\u067E\u0627\u0631\u0686\u0647 \u0645\u062F\u06CC\u0631\u06CC\u062A \u06A9\u0646\u06CC\u062F.")),
            React.createElement("div", { className: "users-hero-actions" },
                React.createElement("button", { className: "btn p", onClick: () => setAdding(true) }, "+ \u0627\u0641\u0632\u0648\u062F\u0646 \u06A9\u0627\u0631\u0628\u0631"),
                React.createElement("button", { className: "btn g", disabled: exportingUsers, onClick: async () => { setExportingUsers(true); try {
                        const res = await fetch(db.usersExportUrl(), { headers: tok() });
                        if (!res.ok)
                            throw new Error("Ø¯Ø±ÛŒØ§ÙØª ÙØ§ÛŒÙ„ Ø§Ø² Ø³Ø±ÙˆØ± Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯");
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "Ø§Ø·Ù„Ø§Ø¹Ø§Øª_Ú©Ø§Ù…Ù„_Ú©Ø§Ø±Ø¨Ø±Ø§Ù†.xlsx";
                        a.click();
                        setTimeout(() => URL.revokeObjectURL(url), 60000);
                    }
                    catch (e) {
                        alert(e.message || "Ø®Ø·Ø§ Ø¯Ø± Ø¯Ø±ÛŒØ§ÙØª Ø®Ø±ÙˆØ¬ÛŒ Ú©Ø§Ø±Ø¨Ø±Ø§Ù†");
                    }
                    finally {
                        setExportingUsers(false);
                    } } }, exportingUsers ? "Ø¯Ø± Ø­Ø§Ù„ Ø¢Ù…Ø§Ø¯Ù‡â€ŒØ³Ø§Ø²ÛŒ Ø®Ø±ÙˆØ¬ÛŒâ€¦" : "â¤“ Ø®Ø±ÙˆØ¬ÛŒ Ú©Ø§Ù…Ù„ Ú©Ø§Ø±Ø¨Ø±Ø§Ù† (Excel)"))),
        React.createElement("div", { className: "users-overview", "aria-label": "\u062E\u0644\u0627\u0635\u0647 \u0646\u062A\u0627\u06CC\u062C \u0641\u0639\u0644\u06CC" },
            React.createElement("div", { className: "users-overview-card" },
                React.createElement("span", null, "\u06A9\u0627\u0631\u0628\u0631\u0627\u0646 \u062F\u0631 \u0646\u062A\u0627\u06CC\u062C \u0641\u0639\u0644\u06CC"),
                React.createElement("strong", null, fa(users.length)),
                React.createElement("small", null, "\u0645\u0637\u0627\u0628\u0642 \u0622\u062E\u0631\u06CC\u0646 \u0641\u06CC\u0644\u062A\u0631 \u0627\u0639\u0645\u0627\u0644\u200C\u0634\u062F\u0647")),
            React.createElement("div", { className: "users-overview-card" },
                React.createElement("span", null, "\u06A9\u0627\u0631\u0628\u0631\u0627\u0646 \u0641\u0639\u0627\u0644"),
                React.createElement("strong", null, fa(users.filter(u => u.is_active).length)),
                React.createElement("small", null, "\u062F\u0631 \u0646\u062A\u0627\u06CC\u062C \u0641\u0639\u0644\u06CC")),
            React.createElement("div", { className: "users-overview-card" },
                React.createElement("span", null, "\u06A9\u0627\u0631\u0628\u0631\u0627\u0646 \u063A\u06CC\u0631\u0641\u0639\u0627\u0644"),
                React.createElement("strong", null, fa(users.filter(u => !u.is_active).length)),
                React.createElement("small", null, "\u062F\u0631 \u0646\u062A\u0627\u06CC\u062C \u0641\u0639\u0644\u06CC"))),
        React.createElement("div", { className: "row page-switcher", style: { gap: 8, marginBottom: 14, flexWrap: "wrap" } },
            React.createElement("button", { className: "btn p" }, "\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u06A9\u0627\u0631\u0628\u0631\u0627\u0646"),
            React.createElement("button", { className: "btn g", onClick: () => setUsersTab("vehicles") }, "\u062E\u0648\u062F\u0631\u0648 \u0648 \u0645\u0648\u062A\u0648\u0631\u0633\u06CC\u06A9\u0644\u062A"),
            React.createElement("button", { className: "btn g", onClick: () => setUsersTab("checklist") }, "\u0686\u06A9\u200C\u0644\u06CC\u0633\u062A \u062E\u0648\u062F\u0631\u0648 \u0648 \u0645\u0648\u062A\u0648\u0631\u0633\u06CC\u06A9\u0644\u062A")),
        React.createElement("form", { className: "users-filter-panel", onSubmit: e => { e.preventDefault(); reload(); } },
            React.createElement("div", { className: "users-filter-heading" },
                React.createElement("div", null,
                    React.createElement("strong", null, "\u062C\u0633\u062A\u200C\u0648\u062C\u0648 \u0648 \u067E\u0627\u0644\u0627\u06CC\u0634"),
                    React.createElement("span", null, "\u0628\u0631\u0627\u06CC \u06CC\u0627\u0641\u062A\u0646 \u0633\u0631\u06CC\u0639\u200C\u062A\u0631 \u0646\u06CC\u0631\u0648\u0647\u0627\u060C \u0641\u06CC\u0644\u062A\u0631\u0647\u0627\u06CC \u0645\u0648\u0631\u062F\u0646\u0638\u0631 \u0631\u0627 \u062A\u0646\u0638\u06CC\u0645 \u06A9\u0646\u06CC\u062F.")),
                React.createElement("span", { className: "users-filter-count", "aria-live": "polite" }, usersLoading ? "Ø¯Ø± Ø­Ø§Ù„ Ø¯Ø±ÛŒØ§ÙØªâ€¦" : fa(users.length) + " Ù†ØªÛŒØ¬Ù‡")),
            React.createElement("div", { className: "users-filter-grid" },
                React.createElement("label", { className: "users-filter-field" },
                    "\u0646\u0627\u0645 \u06CC\u0627 \u06A9\u062F \u0645\u0644\u06CC",
                    React.createElement("input", { className: "input", type: "search", placeholder: "\u062C\u0633\u062A\u200C\u0648\u062C\u0648\u06CC \u0646\u0627\u0645 \u06CC\u0627 \u06A9\u062F \u0645\u0644\u06CC\u2026", value: f.q, onChange: e => setF({ ...f, q: e.target.value }) })),
                React.createElement("label", { className: "users-filter-field" },
                    "\u0633\u0645\u062A",
                    React.createElement("select", { className: "input", value: f.role_id, onChange: e => setF({ ...f, role_id: e.target.value }) },
                        React.createElement("option", { value: "" }, "\u0647\u0645\u0647\u0654 \u0633\u0645\u062A\u200C\u0647\u0627"),
                        roles.map(r => React.createElement("option", { key: r.id, value: r.id }, r.title)))),
                React.createElement("label", { className: "users-filter-field" },
                    "\u0645\u0646\u0637\u0642\u0647",
                    React.createElement("select", { className: "input", value: f.zone_id, onChange: e => setF({ ...f, zone_id: e.target.value }) },
                        React.createElement("option", { value: "" }, "\u0647\u0645\u0647\u0654 \u0645\u0646\u0627\u0637\u0642"),
                        zones.map(z => React.createElement("option", { key: z.id, value: z.id }, z.name)))),
                React.createElement("label", { className: "users-filter-field" },
                    "\u0648\u0636\u0639\u06CC\u062A",
                    React.createElement("select", { className: "input", value: f.active, onChange: e => setF({ ...f, active: e.target.value }) },
                        React.createElement("option", { value: "" }, "\u0647\u0645\u0647\u0654 \u0648\u0636\u0639\u06CC\u062A\u200C\u0647\u0627"),
                        React.createElement("option", { value: "1" }, "\u0641\u0639\u0627\u0644"),
                        React.createElement("option", { value: "0" }, "\u063A\u06CC\u0631\u0641\u0639\u0627\u0644"))),
                React.createElement("button", { className: "btn p users-filter-submit", type: "submit", disabled: usersLoading }, usersLoading ? "Ø¯Ø± Ø­Ø§Ù„ Ø¬Ø³Øªâ€ŒÙˆØ¬Ùˆâ€¦" : "Ø§Ø¹Ù…Ø§Ù„ ÙÛŒÙ„ØªØ±"))),
        usersError && React.createElement("div", { className: "workspace-inline-error users-load-error", role: "alert" },
            React.createElement("span", null,
                "\u062F\u0631\u06CC\u0627\u0641\u062A \u0641\u0647\u0631\u0633\u062A \u06A9\u0627\u0631\u0628\u0631\u0627\u0646 \u0627\u0646\u062C\u0627\u0645 \u0646\u0634\u062F: ",
                usersError),
            React.createElement("button", { type: "button", className: "btn g", onClick: () => reload() }, "\u062A\u0644\u0627\u0634 \u062F\u0648\u0628\u0627\u0631\u0647")),
        React.createElement("div", { className: "users-table-heading" },
            React.createElement("div", null,
                React.createElement("h4", null, "\u0641\u0647\u0631\u0633\u062A \u06A9\u0627\u0631\u0628\u0631\u0627\u0646"),
                React.createElement("span", null, "\u0645\u0634\u0627\u0647\u062F\u0647 \u0648 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0627\u0637\u0644\u0627\u0639\u0627\u062A \u06A9\u0627\u0631\u0628\u0631\u0627\u0646 \u062F\u0631 \u0646\u062A\u0627\u06CC\u062C \u0641\u0639\u0644\u06CC")),
            React.createElement("span", { className: "users-table-count" },
                fa(users.length),
                " \u06A9\u0627\u0631\u0628\u0631")),
        React.createElement(ResponsiveTable, null,
            React.createElement("thead", null,
                React.createElement("tr", null,
                    React.createElement("th", null),
                    React.createElement("th", null, "\u0646\u0627\u0645"),
                    React.createElement("th", null, "\u06A9\u062F \u0645\u0644\u06CC"),
                    React.createElement("th", null, "\u0633\u0645\u062A"),
                    React.createElement("th", null, "\u062F\u0631\u062C\u0647"),
                    React.createElement("th", null, "\u0627\u06CC\u0645\u06CC\u0644"),
                    React.createElement("th", null, "\u062A\u0639\u0647\u062F\u0627\u062A"),
                    React.createElement("th", null, "\u062F\u0633\u062A\u06AF\u0627\u0647\u200C\u0647\u0627"),
                    React.createElement("th", null, "\u0648\u0636\u0639\u06CC\u062A"),
                    React.createElement("th", null, "\u0627\u0642\u062F\u0627\u0645\u0627\u062A"))),
            React.createElement("tbody", null, pg.slice.map(u => React.createElement("tr", { key: u.id },
                React.createElement("td", null, u.photo ? React.createElement("img", { className: "users-avatar", src: u.photo, alt: "ØªØµÙˆÛŒØ± " + (u.first_name || "") + " " + (u.last_name || "") }) : React.createElement("span", { className: "pf2 users-avatar-fallback" }, (u.first_name || "ØŸ")[0])),
                React.createElement("td", null,
                    React.createElement("strong", { className: "users-person-name" },
                        u.first_name,
                        " ",
                        u.last_name)),
                React.createElement("td", { style: { direction: "ltr", textAlign: "right" } }, u.username || "â€”"),
                React.createElement("td", null, u.role_title || rt(u.role_id)),
                React.createElement("td", { style: { whiteSpace: "nowrap", color: "#b7791f", fontWeight: 800 } }, starsForUser(u)),
                React.createElement("td", { style: { direction: "ltr", textAlign: "right", fontSize: 12 } }, u.email || "â€”"),
                React.createElement("td", { style: { textAlign: "center" } }, (u.commitments_count > 0) ? React.createElement("button", { type: "button", className: "badge", style: { background: "#fde7c9", color: "#b45309", border: "1px solid #f3d39f", cursor: "pointer", fontFamily: "inherit", fontWeight: 800 }, onClick: async () => { try {
                        const rows = await db.userCommitments(u.id);
                        setCommitmentsModal({ user: u, rows: Array.isArray(rows) ? rows : [] });
                    }
                    catch (e) {
                        alert(e.message || "Ø®Ø·Ø§ Ø¯Ø± Ø¯Ø±ÛŒØ§ÙØª ØªØ¹Ù‡Ø¯Ø§Øª");
                    } } }, fa(u.commitments_count)) : React.createElement("span", { style: { color: "var(--muted)" } }, "\u06F0")),
                React.createElement("td", null,
                    React.createElement("div", { className: "users-device-tags" },
                        u.android_bound && React.createElement("span", { title: "\u062F\u0633\u062A\u06AF\u0627\u0647 \u0627\u0646\u062F\u0631\u0648\u06CC\u062F \u0645\u062A\u0635\u0644" }, "\uD83D\uDCF1 \u0627\u0646\u062F\u0631\u0648\u06CC\u062F"),
                        u.web_bound && React.createElement("span", { title: "\u0645\u0631\u0648\u0631\u06AF\u0631 \u0648\u0628 \u0645\u062A\u0635\u0644" }, "\uD83D\uDDA5 \u0648\u0628"),
                        !u.android_bound && !u.web_bound && React.createElement("span", { className: "users-device-empty" }, "\u2014"))),
                React.createElement("td", null,
                    React.createElement("span", { className: "badge " + (u.is_active ? "b-ok" : "b-no") }, u.is_active ? "ÙØ¹Ø§Ù„" : "ØºÛŒØ±ÙØ¹Ø§Ù„")),
                React.createElement("td", null,
                    React.createElement("div", { className: "row users-row-actions", style: { gap: 6, flexWrap: "wrap" } },
                        React.createElement("button", { className: "btn g", onClick: () => { setEdit({ ...u, seniority_loading: true, allow_android: u.allow_android == 1, allow_web: u.allow_web == 1, security_exempt: u.security_exempt == 1, presence_required: u.presence_required == 1, can_send_sms: u.can_send_sms == 1, can_be_substitute: u.can_be_substitute == 1, can_welfare: u.can_welfare == 1, can_cultural: u.can_cultural == 1, can_manage_temp_drivers: u.can_manage_temp_drivers == 1, birth_iso: u.birth_date ? isoFromJ(...String(u.birth_date).replace(/[\/.]/g, "-").split("-").map(Number)) : "" }); setPw(""); GET('/admin/users/' + u.id + '/employment-period').then(period => { setEdit(current => current && Number(current.id) === Number(u.id) ? { ...current, employment_start_date: period.employment_start_date || '', employment_end_date: period.employment_end_date || '' } : current); }).catch(error => { alert('Ø¯Ø±ÛŒØ§ÙØª ØªØ§Ø±ÛŒØ® Ù‡Ù…Ú©Ø§Ø±ÛŒ Ø§Ø² Ø³Ø±ÙˆØ± Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯: ' + (error.message || error)); }); GET('/admin/seniority').then(result => { const record = (result.rows || []).find(row => Number(row.id) === Number(u.id)); setEdit(current => current && Number(current.id) === Number(u.id) ? { ...current, seniority_loading: false, seniority_days: (record === null || record === void 0 ? void 0 : record.initialized) ? record.seniority_days : null } : current); }).catch(() => setEdit(current => current && Number(current.id) === Number(u.id) ? { ...current, seniority_loading: false, seniority_days: null } : current)); } }, "\u0648\u06CC\u0631\u0627\u06CC\u0634"),
                        React.createElement("button", { className: "btn g", onClick: () => setLineModal(u) }, "\u062E\u0637\u0648\u0637"),
                        React.createElement("button", { className: "btn g users-danger-action", onClick: () => delUser(u) }, "\u062D\u0630\u0641"))))))),
        !users.length && !usersLoading && !usersError && React.createElement("div", { className: "users-empty-state", role: "status" },
            React.createElement("strong", null, "\u06A9\u0627\u0631\u0628\u0631\u06CC \u0628\u0627 \u0627\u06CC\u0646 \u0641\u06CC\u0644\u062A\u0631\u0647\u0627 \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F"),
            React.createElement("span", null, "\u0639\u0628\u0627\u0631\u062A \u062C\u0633\u062A\u200C\u0648\u062C\u0648 \u06CC\u0627 \u0648\u0636\u0639\u06CC\u062A \u0648 \u0633\u0645\u062A \u0627\u0646\u062A\u062E\u0627\u0628\u06CC \u0631\u0627 \u062A\u063A\u06CC\u06CC\u0631 \u062F\u0647\u06CC\u062F \u0648 \u062F\u0648\u0628\u0627\u0631\u0647 \u0641\u06CC\u0644\u062A\u0631 \u06A9\u0646\u06CC\u062F."),
            React.createElement("button", { className: "btn g", onClick: () => { const cleared = { q: "", role_id: "", zone_id: "", active: "" }; setF(cleared); reload(cleared); } }, "\u067E\u0627\u06A9\u200C\u06A9\u0631\u062F\u0646 \u0641\u06CC\u0644\u062A\u0631\u0647\u0627")),
        pg.Pager(),
        commitmentsModal && React.createElement(Modal, { title: "ØªØ¹Ù‡Ø¯Ø§Øª " + (commitmentsModal.user.first_name || "") + " " + (commitmentsModal.user.last_name || ""), onClose: () => setCommitmentsModal(null) },
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 } },
                React.createElement("div", { style: { fontSize: 12, color: "var(--muted)" } },
                    "\u062A\u0639\u062F\u0627\u062F \u062A\u0639\u0647\u062F\u0627\u062A: ",
                    React.createElement("b", { style: { color: "#b45309" } }, fa(commitmentsModal.rows.length))),
                React.createElement("span", { className: "badge", style: { background: "#fde7c9", color: "#b45309" } }, "\u062A\u0639\u0647\u062F\u0627\u062A \u0627\u0646\u0636\u0628\u0627\u0637\u06CC")),
            commitmentsModal.rows.length ? React.createElement("div", { style: { display: "grid", gap: 10, maxHeight: "65vh", overflowY: "auto" } }, commitmentsModal.rows.map((c, i) => React.createElement("div", { key: c.id || i, style: { border: "1px solid var(--line)", borderRadius: 12, padding: 12, background: "var(--card,#fff)" } },
                React.createElement("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" } },
                    React.createElement("b", null, c.title || "ØªØ¹Ù‡Ø¯ Ø¨Ø¯ÙˆÙ† Ø¹Ù†ÙˆØ§Ù†"),
                    React.createElement("span", { style: { fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" } }, c.commit_jdate || "â€”")),
                c.reason_title && React.createElement("div", { style: { fontSize: 11, color: "var(--muted)", marginTop: 5 } },
                    "\u062F\u0644\u06CC\u0644: ",
                    c.reason_title),
                c.description && React.createElement("div", { style: { fontSize: 12, lineHeight: 1.8, marginTop: 8, whiteSpace: "pre-wrap" } }, c.description),
                React.createElement("div", { className: "row", style: { gap: 8, marginTop: 9, flexWrap: "wrap" } },
                    c.created_by_name && React.createElement("span", { style: { fontSize: 10, color: "var(--muted)" } },
                        "\u062B\u0628\u062A\u200C\u06A9\u0646\u0646\u062F\u0647: ",
                        c.created_by_name),
                    c.has_attachment ? React.createElement("button", { type: "button", className: "btn g", onClick: async () => { try {
                            const a = await GET('/admin/user-commitments/' + c.id + '/attachment');
                            if (a && a.attachment_data) {
                                const w = window.open();
                                if (w)
                                    w.document.write('<iframe src="' + a.attachment_data.replace(/"/g, '&quot;') + '" style="border:0;width:100vw;height:100vh"></iframe>');
                            }
                        }
                        catch (e) {
                            alert(e.message || "Ø®Ø·Ø§ Ø¯Ø± Ø¯Ø±ÛŒØ§ÙØª Ù¾ÛŒÙˆØ³Øª");
                        } } }, "\u0645\u0634\u0627\u0647\u062F\u0647 \u067E\u06CC\u0648\u0633\u062A") : null)))) : React.createElement("p", { className: "muted", style: { textAlign: "center", padding: 12 } }, "\u0628\u0631\u0627\u06CC \u0627\u06CC\u0646 \u0646\u06CC\u0631\u0648 \u062A\u0639\u0647\u062F\u06CC \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A."),
            React.createElement("button", { className: "btn g", style: { marginTop: 14, width: "100%" }, onClick: () => setCommitmentsModal(null) }, "\u0628\u0633\u062A\u0646")),
        edit && React.createElement(Modal, { title: "\u0648\u06CC\u0631\u0627\u06CC\u0634 \u06A9\u0627\u0631\u0628\u0631", onClose: () => { setEdit(null); setPw(""); } },
            React.createElement("div", { className: "row", style: { gap: 10, alignItems: "center" } },
                edit.photo ? React.createElement("img", { src: edit.photo, style: { width: 60, height: 60, borderRadius: 12, objectFit: "cover" } }) : React.createElement("span", { className: "pf2", style: { width: 60, height: 60, fontSize: 24 } }, (edit.first_name || "ØŸ")[0]),
                React.createElement("label", { className: "btn g", style: { cursor: "pointer" } },
                    "\u062A\u063A\u06CC\u06CC\u0631 \u0639\u06A9\u0633",
                    React.createElement("input", { type: "file", accept: "image/*", hidden: true, onChange: e => pickPhoto(edit, e.target.files[0]) }))),
            React.createElement("div", { style: { marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line)" } },
                React.createElement("label", { className: "label" }, "\u0627\u0645\u0636\u0627\u06CC \u067E\u0631\u0633\u0646\u0644\u06CC"),
                React.createElement("div", { className: "row", style: { gap: 10, alignItems: "center", marginTop: 4 } },
                    edit.signature_data ? React.createElement("img", { src: edit.signature_data, style: { width: 120, height: 60, borderRadius: 8, objectFit: "contain", background: "#fff", border: "1px solid var(--line)" } }) : React.createElement("span", { className: "muted", style: { fontSize: 12 } }, "\u06A9\u0627\u0631\u0628\u0631 \u0647\u0646\u0648\u0632 \u0627\u0645\u0636\u0627\u06CC\u06CC \u062F\u0631 \u0628\u0631\u0646\u0627\u0645\u0647 \u062B\u0628\u062A \u0646\u06A9\u0631\u062F\u0647 \u0627\u0633\u062A."),
                    React.createElement("label", { className: "btn g", style: { cursor: "pointer" } },
                        edit.signature_data ? "ØªØºÛŒÛŒØ± Ø§Ù…Ø¶Ø§" : "Ø§ÙØ²ÙˆØ¯Ù† Ø§Ù…Ø¶Ø§",
                        React.createElement("input", { type: "file", accept: "image/*", hidden: true, onChange: e => pickSignature(edit, e.target.files[0]) })),
                    edit.signature_data && React.createElement("button", { type: "button", className: "btn g", style: { color: "var(--danger)" }, onClick: () => clearSignature(edit) }, "\u062D\u0630\u0641 \u0627\u0645\u0636\u0627")),
                React.createElement("p", { className: "muted", style: { fontSize: 11, marginTop: 4 } }, "\u0627\u06CC\u0646 \u0627\u0645\u0636\u0627 \u0647\u0645\u0627\u0646 \u062A\u0635\u0648\u06CC\u0631\u06CC \u0627\u0633\u062A \u06A9\u0647 \u06A9\u0627\u0631\u0628\u0631 \u062F\u0627\u062E\u0644 \u0628\u0631\u0646\u0627\u0645\u0647 (\u0628\u062E\u0634 \u062D\u0633\u0627\u0628 \u06A9\u0627\u0631\u0628\u0631\u06CC) \u0631\u0633\u0645 \u0648 \u0630\u062E\u06CC\u0631\u0647 \u0645\u06CC\u200C\u06A9\u0646\u062F \u0648 \u062F\u0631 \u0686\u0627\u067E \u06AF\u0632\u0627\u0631\u0634\u200C\u0647\u0627 \u062F\u0631\u062C \u0645\u06CC\u200C\u0634\u0648\u062F\u061B \u0645\u062F\u06CC\u0631 \u0646\u06CC\u0632 \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u062F \u062F\u0631 \u0635\u0648\u0631\u062A \u0646\u06CC\u0627\u0632 \u0622\u0646 \u0631\u0627 \u0627\u0632 \u0647\u0645\u06CC\u0646\u200C\u062C\u0627 \u062A\u063A\u06CC\u06CC\u0631 \u06CC\u0627 \u062D\u0630\u0641 \u06A9\u0646\u062F.")),
            React.createElement("div", { className: "row", style: { marginTop: 10 } },
                React.createElement("div", null,
                    React.createElement("label", null, "\u0646\u0627\u0645"),
                    React.createElement("input", { className: "input", value: edit.first_name || "", onChange: e => setEdit({ ...edit, first_name: e.target.value }) })),
                React.createElement("div", null,
                    React.createElement("label", null, "\u0646\u0627\u0645 \u062E\u0627\u0646\u0648\u0627\u062F\u06AF\u06CC"),
                    React.createElement("input", { className: "input", value: edit.last_name || "", onChange: e => setEdit({ ...edit, last_name: e.target.value }) }))),
            React.createElement("label", null, "\u0627\u06CC\u0645\u06CC\u0644"),
            React.createElement("input", { className: "input", dir: "ltr", value: edit.email || "", onChange: e => setEdit({ ...edit, email: e.target.value }) }),
            React.createElement("label", null, "\u0633\u0645\u062A"),
            React.createElement("select", { className: "input", value: edit.role_id || "", onChange: e => setEdit({ ...edit, role_id: +e.target.value }) }, roles.map(r => React.createElement("option", { key: r.id, value: r.id }, r.title))),
            React.createElement("label", null, "\u0645\u0646\u0637\u0642\u0647"),
            React.createElement("select", { className: "input", value: edit.zone_id || "", onChange: e => setEdit({ ...edit, zone_id: e.target.value ? +e.target.value : null }) },
                React.createElement("option", { value: "" }, "\u0628\u062F\u0648\u0646 \u0645\u0646\u0637\u0642\u0647"),
                zones.map(z => React.createElement("option", { key: z.id, value: z.id }, z.name))),
            React.createElement("div", { className: "row", style: { marginTop: 10, flexWrap: "wrap", gap: 10 } },
                React.createElement("div", { style: { flex: 1, minWidth: 140 } },
                    React.createElement("label", null, "\u062A\u0644\u0641\u0646 \u0647\u0645\u0631\u0627\u0647"),
                    React.createElement("input", { className: "input", dir: "ltr", value: edit.phone || "", onChange: e => setEdit({ ...edit, phone: e.target.value }) })),
                React.createElement("div", { style: { flex: 1, minWidth: 140 } },
                    React.createElement("label", null, "\u06A9\u062F \u0645\u0644\u06CC"),
                    React.createElement("input", { className: "input", dir: "ltr", maxLength: "10", value: edit.national_code || "", onChange: e => setEdit({ ...edit, national_code: e.target.value }) })),
                React.createElement("div", { style: { flex: 1, minWidth: 140 } },
                    React.createElement("label", null, "\u06A9\u062F \u067E\u0631\u0633\u0646\u0644\u06CC"),
                    React.createElement("input", { className: "input", dir: "ltr", value: edit.personnel_code || "", onChange: e => setEdit({ ...edit, personnel_code: e.target.value }) }))),
            React.createElement("div", { className: "row", style: { marginTop: 6, flexWrap: "wrap", gap: 10 } },
                React.createElement("div", { style: { flex: 1, minWidth: 140 } },
                    React.createElement("label", null, "\u0648\u0636\u0639\u06CC\u062A \u062A\u0623\u0647\u0644"),
                    React.createElement("select", { className: "input", value: edit.marital_status || "", onChange: e => setEdit({ ...edit, marital_status: e.target.value }) },
                        React.createElement("option", { value: "" }, "\u2014"),
                        React.createElement("option", { value: "\u0645\u062C\u0631\u062F" }, "\u0645\u062C\u0631\u062F"),
                        React.createElement("option", { value: "\u0645\u062A\u0627\u0647\u0644" }, "\u0645\u062A\u0627\u0647\u0644"))),
                React.createElement("div", { style: { flex: 1, minWidth: 140 } },
                    React.createElement("label", null, "\u062A\u0639\u062F\u0627\u062F \u0641\u0631\u0632\u0646\u062F"),
                    React.createElement("input", { className: "input", type: "number", min: "0", value: (_a = edit.children_count) !== null && _a !== void 0 ? _a : "", onChange: e => setEdit({ ...edit, children_count: e.target.value === "" ? null : +e.target.value }) })),
                React.createElement("div", { style: { flex: 1, minWidth: 180 } },
                    React.createElement("label", null, "\u062A\u0627\u0631\u06CC\u062E \u0634\u0631\u0648\u0639 \u0628\u0647 \u06A9\u0627\u0631"),
                    React.createElement(JDate, { jalali: true, yearFrom: 1350, yearTo: todayJ()[0] + 2, value: edit.employment_start_date || "", onChange: v => setEdit({ ...edit, employment_start_date: v }) })),
                React.createElement("div", { style: { flex: 1, minWidth: 180 } },
                    React.createElement("label", null, "\u062A\u0627\u0631\u06CC\u062E \u0627\u062A\u0645\u0627\u0645 \u0647\u0645\u06A9\u0627\u0631\u06CC (\u0627\u062E\u062A\u06CC\u0627\u0631\u06CC)"),
                    React.createElement(JDate, { jalali: true, yearFrom: 1350, yearTo: todayJ()[0] + 5, value: edit.employment_end_date || "", onChange: v => setEdit({ ...edit, employment_end_date: v }) }),
                    React.createElement("button", { type: "button", className: "btn g", onClick: () => setEdit({ ...edit, employment_end_date: "" }) }, "\u062D\u0630\u0641 \u062A\u0627\u0631\u06CC\u062E \u0627\u062A\u0645\u0627\u0645")),
                React.createElement("div", { style: { flex: 1, minWidth: 170 } },
                    React.createElement("label", null, "\u062A\u0639\u062F\u0627\u062F \u0631\u0648\u0632 \u0633\u0646\u0648\u0627\u062A"),
                    React.createElement("input", { className: "input", type: "text", readOnly: true, "aria-label": "\u062A\u0639\u062F\u0627\u062F \u0631\u0648\u0632 \u0633\u0646\u0648\u0627\u062A (\u0641\u0642\u0637 \u0646\u0645\u0627\u06CC\u0634)", value: edit.seniority_loading ? "Ø¯Ø± Ø­Ø§Ù„ Ø¯Ø±ÛŒØ§ÙØªâ€¦" : edit.seniority_days == null ? "Ø«Ø¨Øª Ù†Ø´Ø¯Ù‡" : fa(edit.seniority_days), style: { background: "var(--surface,#f2f5f7)", cursor: "default", fontWeight: 700 } }),
                    React.createElement("small", { className: "muted" }, "\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0627\u0632 \u0622\u062E\u0631\u06CC\u0646 \u0648\u0636\u0639\u06CC\u062A \u062B\u0628\u062A\u200C\u0634\u062F\u0647 \u062F\u0631 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0633\u0646\u0648\u0627\u062A \u062F\u0631\u06CC\u0627\u0641\u062A \u0645\u06CC\u200C\u0634\u0648\u062F \u0648 \u062F\u0631 \u0627\u06CC\u0646 \u0628\u062E\u0634 \u0642\u0627\u0628\u0644 \u0648\u06CC\u0631\u0627\u06CC\u0634 \u0646\u06CC\u0633\u062A.")),
                React.createElement("div", { style: { flex: 1, minWidth: 170 } },
                    React.createElement("label", null, "\u062A\u0627\u0631\u06CC\u062E \u062A\u0648\u0644\u062F"),
                    React.createElement(JDate, { yearFrom: 1320, yearTo: todayJ()[0], value: edit.birth_iso || (edit.birth_date ? isoFromJ(...String(edit.birth_date).replace(/[\/.]/g, "-").split("-").map(Number)) : ""), onChange: v => { let bd = ""; if (v) {
                            const [y, m, d] = v.split("-").map(Number);
                            const [jy, jm, jd] = gregToJalali(y, m, d);
                            bd = `${jy}-${String(jm).padStart(2, "0")}-${String(jd).padStart(2, "0")}`;
                        } setEdit({ ...edit, birth_iso: v, birth_date: bd }); } }),
                    edit.birth_date && React.createElement("span", { className: "muted", style: { fontSize: 11 } }, String(edit.birth_date).replace(/-/g, "/")))),
            React.createElement("div", { style: { flex: 1, minWidth: 170 } },
                React.createElement("label", null, "\u062A\u0639\u062F\u0627\u062F \u0633\u062A\u0627\u0631\u0647 \u062F\u0631\u062C\u0647"),
                React.createElement("input", { className: "input", type: "number", min: "0", max: "5", value: (_b = edit.rank_stars) !== null && _b !== void 0 ? _b : "", placeholder: "\u062E\u0627\u0644\u06CC = \u067E\u06CC\u0634\u200C\u0641\u0631\u0636 \u0633\u0645\u062A", onChange: e => setEdit({ ...edit, rank_stars: e.target.value === "" ? null : Math.max(0, Math.min(5, +e.target.value || 0)) }) }),
                React.createElement("span", { className: "muted", style: { fontSize: 11 } }, "\u067E\u06CC\u0634\u200C\u0641\u0631\u0636: \u0646\u0627\u0638\u0631/\u0627\u067E\u0631\u0627\u062A\u0648\u0631 \u06F1\u060C \u0628\u0627\u0632\u0631\u0633 \u06F2\u060C \u0633\u0631\u0628\u0627\u0632\u0631\u0633 \u06F4")),
            React.createElement(LeaveBalance, { userId: edit.id }),
            (edit.device_model || edit.android_version) && React.createElement("div", { className: "muted", style: { fontSize: 11.5, marginTop: 8 } },
                "\u062F\u0633\u062A\u06AF\u0627\u0647: ",
                edit.device_model || "â€”",
                " \u00B7 ",
                edit.android_version || "",
                " \u00B7 \u0646\u0633\u062E\u0647\u0654 \u0628\u0631\u0646\u0627\u0645\u0647: ",
                edit.app_version || "â€”"),
            React.createElement(PayrollEditor, { userId: edit.id, userName: `${edit.first_name || ""} ${edit.last_name || ""}`.trim() }),
            React.createElement(UserCustomValues, { userId: edit.id }),
            React.createElement("label", null, "\u0622\u062F\u0631\u0633 \u0645\u062D\u0644 \u0633\u06A9\u0648\u0646\u062A"),
            React.createElement("textarea", { className: "input", rows: "2", value: edit.address || "", onChange: e => setEdit({ ...edit, address: e.target.value }) }),
            React.createElement("label", null, "\u062A\u063A\u06CC\u06CC\u0631 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631 (\u062E\u0627\u0644\u06CC = \u0628\u062F\u0648\u0646 \u062A\u063A\u06CC\u06CC\u0631)"),
            React.createElement("input", { className: "input", type: "password", autoComplete: "new-password", value: pw, placeholder: "\u0631\u0645\u0632 \u062C\u062F\u06CC\u062F", onChange: e => setPw(e.target.value) }),
            React.createElement("div", { className: "row", style: { gap: 16, marginTop: 12, flexWrap: "wrap" } },
                React.createElement("label", { className: "row", style: { gap: 6 } },
                    React.createElement("input", { type: "checkbox", checked: edit.is_active, onChange: e => setEdit({ ...edit, is_active: e.target.checked }) }),
                    "\u0641\u0639\u0627\u0644"),
                React.createElement("label", { className: "row", style: { gap: 6 } },
                    React.createElement("input", { type: "checkbox", checked: edit.allow_android, onChange: e => setEdit({ ...edit, allow_android: e.target.checked }) }),
                    "\u0648\u0631\u0648\u062F \u0628\u0627 \u0627\u0646\u062F\u0631\u0648\u06CC\u062F"),
                React.createElement("label", { className: "row", style: { gap: 6 } },
                    React.createElement("input", { type: "checkbox", checked: edit.allow_web, onChange: e => setEdit({ ...edit, allow_web: e.target.checked }) }),
                    "\u0648\u0631\u0648\u062F \u0628\u0627 \u0648\u0628"),
                React.createElement("label", { className: "row", style: { gap: 6 } },
                    React.createElement("input", { type: "checkbox", checked: !!edit.can_send_sms, onChange: e => setEdit({ ...edit, can_send_sms: e.target.checked }) }),
                    "\u0627\u062C\u0627\u0632\u0647\u0654 \u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645\u06A9"),
                React.createElement("label", { className: "row", style: { gap: 6 } },
                    React.createElement("input", { type: "checkbox", checked: !!edit.presence_required, onChange: e => setEdit({ ...edit, presence_required: e.target.checked }) }),
                    "\u0645\u0634\u0645\u0648\u0644 \u0635\u062D\u062A\u200C\u0633\u0646\u062C\u06CC \u062D\u0636\u0648\u0631"),
                React.createElement("label", { className: "row", style: { gap: 6 } },
                    React.createElement("input", { type: "checkbox", checked: !!edit.can_be_substitute, onChange: e => setEdit({ ...edit, can_be_substitute: e.target.checked }) }),
                    "\u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u062F \u0646\u06CC\u0631\u0648\u06CC \u062C\u0627\u06CC\u06AF\u0632\u06CC\u0646 \u0645\u0631\u062E\u0635\u06CC \u0628\u0627\u0634\u062F"),
                React.createElement("label", { className: "row", style: { gap: 6 } },
                    React.createElement("input", { type: "checkbox", checked: !!edit.can_welfare, onChange: e => setEdit({ ...edit, can_welfare: e.target.checked }) }),
                    "\u062F\u0633\u062A\u0631\u0633\u06CC \u062B\u0628\u062A \u0631\u0641\u0627\u0647\u06CC\u0627\u062A"),
                React.createElement("label", { className: "row", style: { gap: 6 } },
                    React.createElement("input", { type: "checkbox", checked: !!edit.can_cultural, onChange: e => setEdit({ ...edit, can_cultural: e.target.checked }) }),
                    "\u062F\u0633\u062A\u0631\u0633\u06CC \u062B\u0628\u062A \u0641\u0639\u0627\u0644\u06CC\u062A \u0641\u0631\u0647\u0646\u06AF\u06CC"),
                React.createElement("label", { className: "row", style: { gap: 6 } },
                    React.createElement("input", { type: "checkbox", checked: !!edit.can_manage_temp_drivers, onChange: e => setEdit({ ...edit, can_manage_temp_drivers: e.target.checked }) }),
                    "\u0627\u062C\u0627\u0632\u0647\u0654 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0631\u0627\u0646\u0646\u062F\u06AF\u0627\u0646 \u0645\u0648\u0642\u062A \u062E\u0637\u0648\u0637 \u0648\u06CC\u0698\u0647")),
            React.createElement("div", { style: { marginTop: 12, padding: "10px 12px", background: "var(--warn-soft)", borderRadius: 10, border: "1px solid #f0e2b8" } },
                React.createElement("label", { className: "row", style: { gap: 8, alignItems: "flex-start" } },
                    React.createElement("input", { type: "checkbox", checked: !!edit.security_exempt, onChange: e => setEdit({ ...edit, security_exempt: e.target.checked }) }),
                    React.createElement("span", null,
                        React.createElement("b", null, "\u0645\u0639\u0627\u0641\u06CC\u062A \u0627\u0645\u0646\u06CC\u062A\u06CC \u0627\u06CC\u0646 \u06A9\u0627\u0631\u0628\u0631"),
                        React.createElement("br", null),
                        React.createElement("small", { style: { color: "var(--muted)" } }, "\u062F\u0631 \u0635\u0648\u0631\u062A \u0641\u0639\u0627\u0644\u200C\u0628\u0648\u062F\u0646\u060C \u0627\u06CC\u0646 \u06A9\u0627\u0631\u0628\u0631 \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u062F \u0628\u0627 \u0648\u062C\u0648\u062F \u0631\u0648\u0634\u0646\u200C\u0628\u0648\u062F\u0646 \u00AB\u062D\u0627\u0644\u062A \u062A\u0648\u0633\u0639\u0647\u200C\u062F\u0647\u0646\u062F\u0647\u00BB\u060C \u00AB\u0645\u0648\u0642\u0639\u06CC\u062A \u062C\u0639\u0644\u06CC\u00BB \u0648 \u00ABVPN\u00BB \u0648\u0627\u0631\u062F \u0648 \u0627\u0632 \u0628\u0631\u0646\u0627\u0645\u0647 \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u06A9\u0646\u062F (\u0645\u062D\u062F\u0648\u062F\u06CC\u062A\u200C\u0647\u0627\u06CC \u0627\u0645\u0646\u06CC\u062A\u06CC \u0628\u0631\u0627\u06CC \u0627\u0648 \u0627\u0639\u0645\u0627\u0644 \u0646\u0645\u06CC\u200C\u0634\u0648\u062F).")))),
            React.createElement("div", { className: "row", style: { gap: 8, marginTop: 12 } },
                React.createElement("button", { className: "btn g", onClick: () => revoke(edit.id, 'android') }, "\u062D\u0630\u0641 \u062F\u0633\u062A\u06AF\u0627\u0647 \u0627\u0646\u062F\u0631\u0648\u06CC\u062F"),
                React.createElement("button", { className: "btn g", onClick: () => revoke(edit.id, 'web') }, "\u062D\u0630\u0641 \u0646\u0634\u0633\u062A \u0648\u0628")),
            React.createElement("button", { className: "btn p", style: { marginTop: 14 }, disabled: savingUser, onClick: () => save(edit) }, savingUser ? "Ø¯Ø± Ø­Ø§Ù„ Ø°Ø®ÛŒØ±Ù‡â€¦" : "Ø°Ø®ÛŒØ±Ù‡ ØªØºÛŒÛŒØ±Ø§Øª")),
        adding && React.createElement(AddUser, { roles: roles, zones: zones, onClose: () => setAdding(false), onSave: add }),
        lineModal && React.createElement(LineAssign, { user: lineModal, onClose: () => setLineModal(null) })));
}
function AddUser({ roles, zones, onClose, onSave }) {
    const [f, setF] = useState(() => { var _a; return ({ first_name: "", last_name: "", username: "", email: "", role_id: ((_a = roles[0]) === null || _a === void 0 ? void 0 : _a.id) || 9, zone_id: null, password: crypto.randomUUID().replace(/-/g, "").slice(0, 16), allow_android: 1, allow_web: 1, birth_date: "", birth_iso: "" }); });
    return (React.createElement(Modal, { title: "\u0627\u0641\u0632\u0648\u062F\u0646 \u06A9\u0627\u0631\u0628\u0631 \u062C\u062F\u06CC\u062F", onClose: onClose },
        React.createElement("div", { className: "row" },
            React.createElement("div", null,
                React.createElement("label", null, "\u0646\u0627\u0645"),
                React.createElement("input", { className: "input", onChange: e => setF({ ...f, first_name: e.target.value }) })),
            React.createElement("div", null,
                React.createElement("label", null, "\u0646\u0627\u0645 \u062E\u0627\u0646\u0648\u0627\u062F\u06AF\u06CC"),
                React.createElement("input", { className: "input", onChange: e => setF({ ...f, last_name: e.target.value }) }))),
        React.createElement("label", null, "\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC (\u06A9\u062F \u0645\u0644\u06CC)"),
        React.createElement("input", { className: "input", dir: "ltr", onChange: e => setF({ ...f, username: e.target.value }) }),
        React.createElement("label", null, "\u0627\u06CC\u0645\u06CC\u0644 (\u0627\u062E\u062A\u06CC\u0627\u0631\u06CC)"),
        React.createElement("input", { className: "input", dir: "ltr", onChange: e => setF({ ...f, email: e.target.value }) }),
        React.createElement("div", { className: "row", style: { gap: 10, flexWrap: "wrap" } },
            React.createElement("div", { style: { flex: 1, minWidth: 170 } },
                React.createElement("label", null, "\u062A\u0627\u0631\u06CC\u062E \u062A\u0648\u0644\u062F"),
                React.createElement(JDate, { yearFrom: 1320, yearTo: todayJ()[0], value: f.birth_iso || "", onChange: v => { let bd = ""; if (v) {
                        const [y, m, d] = v.split("-").map(Number);
                        const [jy, jm, jd] = gregToJalali(y, m, d);
                        bd = `${jy}-${String(jm).padStart(2, "0")}-${String(jd).padStart(2, "0")}`;
                    } setF({ ...f, birth_iso: v, birth_date: bd }); } }),
                f.birth_date && React.createElement("span", { className: "muted", style: { fontSize: 11 } }, String(f.birth_date).replace(/-/g, "/")))),
        React.createElement("label", null, "\u0633\u0645\u062A"),
        React.createElement("select", { className: "input", value: f.role_id, onChange: e => setF({ ...f, role_id: +e.target.value }) }, roles.map(r => React.createElement("option", { key: r.id, value: r.id }, r.title))),
        React.createElement("label", null, "\u0645\u0646\u0637\u0642\u0647"),
        React.createElement("select", { className: "input", onChange: e => setF({ ...f, zone_id: e.target.value ? +e.target.value : null }) },
            React.createElement("option", { value: "" }, "\u0628\u062F\u0648\u0646 \u0645\u0646\u0637\u0642\u0647"),
            zones.map(z => React.createElement("option", { key: z.id, value: z.id }, z.name))),
        React.createElement("label", null, "\u0631\u0645\u0632 \u0627\u0648\u0644\u06CC\u0647\u0654 \u062A\u0635\u0627\u062F\u0641\u06CC (\u062D\u062F\u0627\u0642\u0644 \u06F1\u06F2 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631)"),
        React.createElement("div", { className: "row", style: { gap: 8 } },
            React.createElement("input", { className: "input", dir: "ltr", value: f.password, onChange: e => setF({ ...f, password: e.target.value }) }),
            React.createElement("button", { type: "button", className: "btn g", onClick: () => setF({ ...f, password: crypto.randomUUID().replace(/-/g, "").slice(0, 16) }) }, "\u0631\u0645\u0632 \u062C\u062F\u06CC\u062F")),
        React.createElement("div", { className: "row", style: { gap: 16, marginTop: 10 } },
            React.createElement("label", { className: "row", style: { gap: 6 } },
                React.createElement("input", { type: "checkbox", checked: f.allow_android, onChange: e => setF({ ...f, allow_android: e.target.checked ? 1 : 0 }) }),
                "\u0627\u0646\u062F\u0631\u0648\u06CC\u062F"),
            React.createElement("label", { className: "row", style: { gap: 6 } },
                React.createElement("input", { type: "checkbox", checked: f.allow_web, onChange: e => setF({ ...f, allow_web: e.target.checked ? 1 : 0 }) }),
                "\u0648\u0628")),
        React.createElement("button", { className: "btn p", style: { marginTop: 12 }, onClick: () => onSave(f) }, "\u0633\u0627\u062E\u062A \u06A9\u0627\u0631\u0628\u0631")));
}
function LineAssign({ user, onClose }) {
    const [lines, setLines] = useState([]);
    const [sel, setSel] = useState([]);
    const [checkinSel, setCheckinSel] = useState([]);
    const [q, setQ] = useState("");
    useEffect(() => {
        let alive = true;
        Promise.all([db.lines(), db.userLines(user.id)]).then(([all, assigned]) => {
            if (!alive)
                return;
            setLines(all);
            setSel(assigned.map(l => Number(l.id)));
            setCheckinSel(assigned.filter(l => Number(l.checkin_allowed) === 1).map(l => Number(l.id)));
        }).catch(() => { });
        return () => { alive = false; };
    }, [user.id]);
    const toggle = id => {
        id = Number(id);
        const wasSelected = sel.includes(id);
        setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
        if (wasSelected)
            setCheckinSel(s => s.filter(x => x !== id));
    };
    const toggleCheckin = id => { id = Number(id); setCheckinSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]); };
    const save = async () => {
        const visibleIds = sel.map(Number);
        await db.assignLines(user.id, visibleIds);
        await db.assignCheckinLines(user.id, checkinSel.filter(id => visibleIds.includes(Number(id))));
        onClose();
    };
    const flt = lines.filter(l => { const s = (l.code + " " + (l.origin || "") + " " + (l.destination || "")); return !q || s.indexOf(q) >= 0; })
        .sort((a, b) => Number(sel.includes(Number(b.id))) - Number(sel.includes(Number(a.id))) || lines.indexOf(a) - lines.indexOf(b));
    return (React.createElement(Modal, { title: `Ø®Ø·ÙˆØ· Ù…Ø¬Ø§Ø² â€” ${user.first_name} ${user.last_name}`, onClose: onClose },
        React.createElement("p", { style: { fontSize: 12, color: "var(--muted)", marginBottom: 10 } }, "\u062E\u0637\u0648\u0637\u06CC \u06A9\u0647 \u0627\u06CC\u0646 \u0646\u06CC\u0631\u0648 \u0645\u062C\u0627\u0632 \u0628\u0647 \u0645\u0634\u0627\u0647\u062F\u0647\u0654 \u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0622\u0646\u0647\u0627\u0633\u062A \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F. \u0645\u062C\u0648\u0632 \u062B\u0628\u062A \u062D\u0636\u0648\u0631 \u062F\u0631 \u0633\u062A\u0648\u0646 \u062C\u062F\u0627\u06AF\u0627\u0646\u0647 \u062A\u0639\u06CC\u06CC\u0646 \u0645\u06CC\u200C\u0634\u0648\u062F."),
        React.createElement("input", { className: "input", placeholder: "\u062C\u0633\u062A\u062C\u0648\u06CC \u062E\u0637 (\u06A9\u062F \u06CC\u0627 \u0645\u0628\u062F\u0623/\u0645\u0642\u0635\u062F)\u2026", value: q, onChange: e => setQ(e.target.value), style: { marginBottom: 8 } }),
        React.createElement("div", { className: "row", style: { justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap" } },
            React.createElement("button", { className: "btn g", onClick: () => setSel(s => Array.from(new Set([...s, ...flt.map(l => Number(l.id))]))) }, "\u0627\u0646\u062A\u062E\u0627\u0628 \u0647\u0645\u0647\u0654 \u0646\u062A\u0627\u06CC\u062C"),
            React.createElement("button", { className: "btn g", onClick: () => { setSel([]); setCheckinSel([]); } }, "\u067E\u0627\u06A9\u200C\u06A9\u0631\u062F\u0646 \u0627\u0646\u062A\u062E\u0627\u0628\u200C\u0647\u0627"),
            React.createElement("span", { className: "muted", style: { fontSize: 12 } },
                fa(sel.length),
                " \u062E\u0637 \u062F\u0627\u0631\u0627\u06CC \u062F\u0633\u062A\u0631\u0633\u06CC \u0627\u0637\u0644\u0627\u0639\u0627\u062A \u00B7 ",
                fa(checkinSel.filter(id => sel.includes(Number(id))).length),
                " \u062E\u0637 \u0645\u062C\u0627\u0632 \u062B\u0628\u062A \u062D\u0636\u0648\u0631")),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "minmax(0,1fr) 94px 94px", gap: 8, padding: "8px 10px", fontSize: 11, fontWeight: 800, color: "var(--muted)", borderBottom: "1px solid var(--line)" } },
            React.createElement("span", null, "\u062E\u0637"),
            React.createElement("span", { style: { textAlign: "center" } }, "\u062F\u0633\u062A\u0631\u0633\u06CC \u0627\u0637\u0644\u0627\u0639\u0627\u062A"),
            React.createElement("span", { style: { textAlign: "center" } }, "\u062B\u0628\u062A \u062D\u0636\u0648\u0631 \u0645\u0646")),
        React.createElement("div", { style: { maxHeight: 340, overflow: "auto" } }, flt.map(l => {
            const id = Number(l.id), selected = sel.includes(id), checkin = checkinSel.includes(id);
            return React.createElement("div", { key: l.id, style: { display: "grid", gridTemplateColumns: "minmax(0,1fr) 94px 94px", gap: 8, alignItems: "center", padding: "9px 10px", border: "1px solid var(--line)", borderRadius: 10, marginBottom: 6 } },
                React.createElement("span", { style: { fontSize: 13 } },
                    "\u062E\u0637 ",
                    l.code,
                    " \u2014 ",
                    l.origin,
                    " \u0628\u0647 ",
                    l.destination),
                React.createElement("label", { style: { display: "flex", justifyContent: "center", alignItems: "center", gap: 5, fontSize: 11, cursor: "pointer" } },
                    React.createElement("input", { type: "checkbox", checked: selected, onChange: () => toggle(id) }),
                    React.createElement("span", null, "\u0645\u062C\u0627\u0632")),
                React.createElement("label", { style: { display: "flex", justifyContent: "center", alignItems: "center", gap: 5, fontSize: 11, cursor: selected ? "pointer" : "not-allowed", opacity: selected ? 1 : .45 } },
                    React.createElement("input", { type: "checkbox", checked: selected && checkin, disabled: !selected, onChange: () => toggleCheckin(id) }),
                    React.createElement("span", null, "\u0645\u062C\u0627\u0632")));
        })),
        React.createElement("button", { className: "btn p", style: { marginTop: 12, width: "100%" }, onClick: save },
            "\u0630\u062E\u06CC\u0631\u0647\u0654 \u0645\u062C\u0648\u0632\u0647\u0627 (",
            fa(sel.length),
            " \u062E\u0637 \u0627\u0637\u0644\u0627\u0639\u0627\u062A \u00B7 ",
            fa(checkinSel.filter(id => sel.includes(Number(id))).length),
            " \u062E\u0637 \u062B\u0628\u062A \u062D\u0636\u0648\u0631)")));
}
function Zones() {
    const [users, setUsers] = useState([]);
    const [zones, setZones] = useState([]);
    const [over, setOver] = useState(null);
    const [nz, setNz] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [editing, setEditing] = useState(null);
    const [editName, setEditName] = useState("");
    const mutation = useRef(false);
    const [newParent, setNewParent] = useState(''), [editParent, setEditParent] = useState(''), [child, setChild] = useState(null), [childName, setChildName] = useState('');
    const [leadership, setLeadership] = useState(null), [senior, setSenior] = useState(''), [inspectors, setInspectors] = useState([]);
    const roleOf = user => String(user.role_title || '').replace(/[ÙŠÙƒØ¦]/g, character => character === 'Ùƒ' ? 'Ú©' : 'ÛŒ').replace(/[\s\u200c\u200dÙ€]/g, '');
    const leaderKind = user => { const role = roleOf(user); if (role.includes('ØµØ¯ÙˆØ±Ù¾Ø±ÙˆØ§Ù†Ù‡') || role.includes('Ù…Ø¯ÛŒØ±Ø§Ø¬Ø±Ø§ÛŒÛŒ') || (role.includes('Ù…Ø¹Ø§ÙˆÙ†') && role.includes('Ø¨Ø§Ø²Ø±Ø³ÛŒ')) || (role.includes('Ø±ÛŒÛŒØ³Ø§Ø¯Ø§Ø±Ù‡') && role.includes('Ø¨Ø§Ø²Ø±Ø³ÛŒ')) || role.includes('Ø³Ø±Ø¨Ø§Ø²Ø±Ø³Ø§Ø±Ø´Ø¯'))
        return ''; if (role.includes('Ø³Ø±Ø¨Ø§Ø²Ø±Ø³'))
        return 'senior'; if (role.includes('Ú¯Ø´Øª') && role.includes('Ù…ÙˆØªÙˆØ±'))
        return role.includes('Ø¨Ø§Ø²Ø±Ø³') ? 'inspector' : ''; if (role.includes('Ø§Ø¯Ø§Ø±ÛŒ'))
        return ''; return role.includes('Ø¨Ø§Ø²Ø±Ø³') ? 'inspector' : ''; };
    const seniorUsers = users.filter(user => Number(user.is_active) !== 0 && leaderKind(user) === 'senior');
    const inspectorUsers = users.filter(user => Number(user.is_active) !== 0 && leaderKind(user) === 'inspector');
    const userName = id => { const user = users.find(item => +item.id === +id); return user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : '#' + id; };
    const openLeaders = zone => { setLeadership(zone); setSenior(zone.senior_user_id ? String(zone.senior_user_id) : ''); setInspectors((zone.inspector_ids || []).map(Number)); setError(''); };
    const saveLeaders = () => mutate(async () => { const result = await db.zoneLeaders(leadership.id, { senior_user_id: senior ? +senior : null, inspector_ids: inspectors }); setZones(current => current.map(zone => +zone.id === +leadership.id ? { ...zone, senior_user_id: result.senior_user_id, inspector_ids: result.inspector_ids } : zone)); setLeadership(null); });
    const pathFor = zone => { const parts = [], seen = new Set(); let current = zone; while (current && !seen.has(+current.id)) {
        seen.add(+current.id);
        parts.unshift(current.name);
        current = zones.find(item => +item.id === +current.parent_id);
    } return parts.join(' / '); };
    const isDescendant = (candidate, ancestor) => { const seen = new Set(); let current = candidate; while (current && !seen.has(+current.id)) {
        if (+current.id === +ancestor)
            return true;
        seen.add(+current.id);
        current = zones.find(item => +item.id === +current.parent_id);
    } return false; };
    const ordered = zones.slice().sort((left, right) => pathFor(left).localeCompare(pathFor(right), 'fa'));
    const reload = async () => { const [nextUsers, nextZones] = await Promise.all([db.users(), db.zones()]); setUsers(nextUsers.filter(u => Number(u.is_active) === 1)); setZones(nextZones); };
    useEffect(() => { reload().catch(failure => setError(failure.message || 'Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ù…Ù†Ø§Ø·Ù‚ Ø§Ù†Ø¬Ø§Ù… Ù†Ø´Ø¯.')); }, []);
    const mutate = async (action) => { if (mutation.current)
        return; mutation.current = true; setBusy(true); setError(""); try {
        await action();
    }
    catch (failure) {
        setError(failure.message || 'Ø°Ø®ÛŒØ±Ù‡ ØªØºÛŒÛŒØ±Ø§Øª Ø§Ù†Ø¬Ø§Ù… Ù†Ø´Ø¯.');
    }
    finally {
        mutation.current = false;
        setBusy(false);
    } };
    const setLeaveRequirement = (zone, required) => mutate(async () => { await db.updateZone(zone.id, zone.name, undefined, required); setZones(current => current.map(item => +item.id === +zone.id ? { ...item, leave_requires_substitute: required ? 1 : 0 } : item)); });
    const assign = (uid, zid) => { if (!users.some(user => +user.id === +uid))
        return; return mutate(async () => { await db.setOrg(uid, { zone_id: zid }); setUsers(current => current.map(user => +user.id === +uid ? { ...user, zone_id: zid } : user)); }); };
    const addZone = () => { const name = nz.trim(); if (!name)
        return; return mutate(async () => { const parent_id = newParent ? +newParent : null; const zone = await db.createZone(name, parent_id); setZones(current => [...current, { ...zone, parent_id }]); setNz(""); }); };
    const addChild = () => { const name = childName.trim(); if (!name || !child)
        return; return mutate(async () => { const zone = await db.createZone(name, +child.id); setZones(current => [...current, { ...zone, parent_id: +child.id }]); setChild(null); setChildName(''); }); };
    const saveZone = () => { const name = editName.trim(); if (!name || !editing)
        return; return mutate(async () => { const parent_id = editParent ? +editParent : null; await db.updateZone(editing.id, name, parent_id); setZones(current => current.map(zone => +zone.id === +editing.id ? { ...zone, name, parent_id } : zone)); setEditing(null); }); };
    const removeZone = zone => { if (busy || !confirm(`Ù…Ù†Ø·Ù‚Ù‡Ù” Â«${zone.name}Â» Ø­Ø°Ù Ø´ÙˆØ¯ØŸ Ù†ÛŒØ±ÙˆÙ‡Ø§ÛŒ Ø¢Ù† Ø­Ø°Ù Ù†Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯ Ùˆ Ø¨Ù‡ Â«Ø¨Ø¯ÙˆÙ† Ù…Ù†Ø·Ù‚Ù‡Â» Ù…Ù†ØªÙ‚Ù„ Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯.`))
        return; return mutate(async () => { await db.deleteZone(zone.id); setZones(current => current.filter(item => +item.id !== +zone.id).map(item => +item.parent_id === +zone.id ? { ...item, parent_id: null } : item)); setUsers(current => current.map(user => +user.zone_id === +zone.id ? { ...user, zone_id: null } : user)); }); };
    const Card = u => React.createElement("div", { className: "card-p", key: u.id, draggable: !busy, onDragStart: e => e.dataTransfer.setData("uid", u.id) },
        React.createElement("span", null,
            u.first_name,
            " ",
            u.last_name),
        React.createElement("small", null, u.role_title));
    const Col = (title, zid) => React.createElement("div", { className: "col" + (over === zid ? " over" : ""), key: zid || "none", onDragOver: e => { e.preventDefault(); setOver(zid); }, onDragLeave: () => setOver(null), onDrop: e => { assign(+e.dataTransfer.getData("uid"), zid); setOver(null); } },
        zid != null && (() => { const zone = zones.find(item => +item.id === +zid); return React.createElement("label", { className: "row", style: { gap: 6, marginBottom: 8, fontSize: 13 } },
            React.createElement("input", { type: "checkbox", disabled: busy, checked: !!Number(zone.leave_requires_substitute), onChange: event => setLeaveRequirement(zone, event.target.checked) }),
            " \u0646\u06CC\u0627\u0632 \u0628\u0647 \u0646\u06CC\u0631\u0648\u06CC \u062C\u0627\u06CC\u06AF\u0632\u06CC\u0646 \u0645\u0631\u062E\u0635\u06CC"); })(),
        React.createElement("h4", { className: "row", style: { justifyContent: "space-between", gap: 8, flexWrap: 'wrap' } },
            React.createElement("span", null, title),
            zid != null && React.createElement("span", { className: "row", style: { gap: 5, flexWrap: 'wrap' } },
                React.createElement("button", { className: "btn g", disabled: busy, onClick: () => openLeaders(zones.find(item => +item.id === +zid)) }, "\u062A\u0639\u06CC\u06CC\u0646 \u0645\u0633\u0626\u0648\u0644\u0627\u0646"),
                React.createElement("button", { className: "btn g", disabled: busy, onClick: () => { const zone = zones.find(item => +item.id === +zid); setChild(zone); setChildName(''); } }, "+ \u0632\u06CC\u0631\u0645\u0646\u0637\u0642\u0647"),
                React.createElement("button", { className: "btn g", disabled: busy, onClick: () => { const zone = zones.find(item => +item.id === +zid); setEditing(zone); setEditName(zone.name); setEditParent(zone.parent_id ? String(zone.parent_id) : ''); } }, "\u0648\u06CC\u0631\u0627\u06CC\u0634"),
                React.createElement("button", { className: "btn d", disabled: busy, onClick: () => removeZone(zones.find(item => +item.id === +zid)) }, "\u062D\u0630\u0641"))),
        zid != null && (() => { const zone = zones.find(item => +item.id === +zid); return React.createElement("div", { style: { fontSize: 12, lineHeight: 2, marginBottom: 10 } },
            React.createElement("div", { className: "muted" }, pathFor(zone)),
            React.createElement("div", null,
                "\u0633\u0631\u0628\u0627\u0632\u0631\u0633: ",
                zone.senior_user_id ? userName(zone.senior_user_id) : 'Ù¾ÛŒØ´â€ŒÙØ±Ø¶ Ù…Ù†Ø·Ù‚Ù‡ / Ù…Ù†Ø·Ù‚Ù‡Ù” ÙˆØ§Ù„Ø¯'),
            React.createElement("div", null,
                "\u0628\u0627\u0632\u0631\u0633\u200C\u0647\u0627: ",
                (zone.inspector_ids || []).length ? zone.inspector_ids.map(userName).join('ØŒ ') : 'Ù¾ÛŒØ´â€ŒÙØ±Ø¶ Ù…Ù†Ø·Ù‚Ù‡ / Ù…Ù†Ø·Ù‚Ù‡Ù” ÙˆØ§Ù„Ø¯')); })(),
        users.filter(u => Number(u.is_active) === 1 && (zid == null ? !u.zone_id : +u.zone_id === +zid)).map(Card));
    const zoneTree = (() => {
        const seen = new Set();
        const renderBranch = (parentId, depth = 0) => zones.filter(z => String(z.parent_id || '') === String(parentId || '') && !seen.has(+z.id)).sort((a, b) => a.name.localeCompare(b.name, 'fa')).map(z => {
            seen.add(+z.id);
            return React.createElement("div", { key: z.id, style: { marginRight: depth ? 20 : 0, borderRight: depth ? '2px solid var(--line)' : 'none', paddingRight: depth ? 10 : 0, marginTop: 10 } },
                Col(z.name, z.id),
                renderBranch(z.id, depth + 1));
        });
        const roots = renderBranch(null);
        return React.createElement(React.Fragment, null,
            roots,
            zones.filter(z => !seen.has(+z.id)).map(z => React.createElement("div", { key: z.id }, Col(z.name, z.id))));
    })();
    return (React.createElement("div", { className: "panel admin-workspace-page" },
        React.createElement("h3", null,
            "\u0645\u0646\u0637\u0642\u0647\u200C\u0628\u0646\u062F\u06CC \u0646\u06CC\u0631\u0648\u0647\u0627 \u2014 \u06A9\u0627\u0631\u062A\u200C\u0647\u0627 \u0631\u0627 \u062F\u0631 \u0645\u0646\u0637\u0642\u0647\u0654 \u0645\u0648\u0631\u062F\u0646\u0638\u0631 \u0631\u0647\u0627 \u06A9\u0646\u06CC\u062F",
            React.createElement("span", { className: "row", style: { gap: 8 } },
                React.createElement("input", { className: "input", maxLength: 150, style: { padding: "6px 10px", width: 160 }, placeholder: "\u0646\u0627\u0645 \u0645\u0646\u0637\u0642\u0647\u0654 \u062C\u062F\u06CC\u062F", value: nz, onChange: e => setNz(e.target.value) }),
                React.createElement("select", { "aria-label": "\u0645\u0646\u0637\u0642\u0647 \u0648\u0627\u0644\u062F \u0628\u0631\u0627\u06CC \u0645\u0646\u0637\u0642\u0647 \u062C\u062F\u06CC\u062F", className: "input", style: { maxWidth: 230 }, value: newParent, onChange: event => setNewParent(event.target.value) },
                    React.createElement("option", { value: "" }, "\u0645\u0646\u0637\u0642\u0647 \u0645\u0633\u062A\u0642\u0644 (\u0628\u062F\u0648\u0646 \u0648\u0627\u0644\u062F)"),
                    ordered.map(zone => React.createElement("option", { key: zone.id, value: zone.id }, pathFor(zone)))),
                React.createElement("button", { className: "btn p", disabled: busy || !nz.trim(), onClick: addZone }, "+ \u0645\u0646\u0637\u0642\u0647"))),
        error && React.createElement("p", { role: "alert", style: { color: "var(--danger)" } }, error),
        React.createElement("div", { className: "org" },
            Col("Ø¨Ø¯ÙˆÙ† Ù…Ù†Ø·Ù‚Ù‡", null),
            zoneTree),
        leadership && React.createElement(Modal, { title: 'Ù…Ø³Ø¦ÙˆÙ„Ø§Ù† ' + pathFor(leadership), onClose: () => { if (!busy)
                setLeadership(null); } },
            React.createElement("p", { className: "muted" }, "\u0627\u0646\u062A\u062E\u0627\u0628 \u0645\u0633\u0626\u0648\u0644\u060C \u0645\u0646\u0637\u0642\u0647\u0654 \u0639\u0636\u0648\u06CC\u062A \u0646\u06CC\u0631\u0648 \u0631\u0627 \u062A\u063A\u06CC\u06CC\u0631 \u0646\u0645\u06CC\u200C\u062F\u0647\u062F. \u0627\u0646\u062A\u062E\u0627\u0628 \u062E\u0627\u0644\u06CC\u060C \u0686\u0627\u0631\u062A \u067E\u06CC\u0634\u200C\u0641\u0631\u0636 \u0645\u0646\u0637\u0642\u0647 \u0648 \u0646\u0632\u062F\u06CC\u06A9\u200C\u062A\u0631\u06CC\u0646 \u0648\u0627\u0644\u062F \u0631\u0627 \u062D\u0641\u0638 \u0645\u06CC\u200C\u06A9\u0646\u062F."),
            React.createElement("label", null, "\u0633\u0631\u0628\u0627\u0632\u0631\u0633 \u0645\u0646\u0637\u0642\u0647"),
            React.createElement("select", { "aria-label": "\u0633\u0631\u0628\u0627\u0632\u0631\u0633 \u0645\u0646\u0637\u0642\u0647", className: "input", value: senior, disabled: busy, onChange: event => setSenior(event.target.value) },
                React.createElement("option", { value: "" }, "\u067E\u06CC\u0634\u200C\u0641\u0631\u0636 \u0645\u0646\u0637\u0642\u0647 / \u0648\u0627\u0644\u062F"),
                senior && !seniorUsers.some(user => String(user.id) === senior) && React.createElement("option", { value: senior },
                    "\u0627\u0646\u062A\u062E\u0627\u0628 \u0642\u0628\u0644\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631: ",
                    userName(senior)),
                seniorUsers.map(user => React.createElement("option", { key: user.id, value: user.id },
                    userName(user.id),
                    " \u2014 ",
                    user.role_title))),
            React.createElement("h4", { style: { marginTop: 14 } }, "\u0628\u0627\u0632\u0631\u0633\u200C\u0647\u0627\u06CC \u0645\u0646\u0637\u0642\u0647 / \u0632\u06CC\u0631\u0645\u0646\u0637\u0642\u0647"),
            React.createElement("div", { style: { maxHeight: 260, overflow: 'auto' } }, [...inspectorUsers, ...inspectors.filter(id => !inspectorUsers.some(user => +user.id === id)).map(id => ({ id, role_title: 'Ø§Ù†ØªØ®Ø§Ø¨ Ù‚Ø¨Ù„ÛŒ Ù†Ø§Ù…Ø¹ØªØ¨Ø±Ø› Ø¨Ø±Ø§ÛŒ Ø­Ø°Ù ØªÛŒÚ© Ø±Ø§ Ø¨Ø±Ø¯Ø§Ø±ÛŒØ¯' }))].map(user => React.createElement("label", { key: user.id, style: { display: 'block', padding: 8 } },
                React.createElement("input", { type: "checkbox", disabled: busy, checked: inspectors.includes(+user.id), onChange: event => setInspectors(current => event.target.checked ? [...current, +user.id] : current.filter(id => id !== +user.id)) }),
                " ",
                userName(user.id),
                " \u2014 ",
                user.role_title))),
            error && React.createElement("p", { role: "alert", style: { color: 'var(--danger)' } }, error),
            React.createElement("button", { className: "btn p", disabled: busy, onClick: saveLeaders }, "\u0630\u062E\u06CC\u0631\u0647 \u0645\u0633\u0626\u0648\u0644\u0627\u0646")),
        child && React.createElement(Modal, { title: 'ØªØ¹Ø±ÛŒÙ Ø²ÛŒØ±Ù…Ù†Ø·Ù‚Ù‡ Ø¨Ø±Ø§ÛŒ ' + child.name, onClose: () => { if (!busy)
                setChild(null); } },
            React.createElement("p", { style: { lineHeight: 2 } },
                "\u0645\u0646\u0637\u0642\u0647 \u0648\u0627\u0644\u062F: ",
                pathFor(child)),
            React.createElement("label", null, "\u0646\u0627\u0645 \u0632\u06CC\u0631\u0645\u0646\u0637\u0642\u0647"),
            React.createElement("input", { "aria-label": "\u0646\u0627\u0645 \u0632\u06CC\u0631\u0645\u0646\u0637\u0642\u0647", className: "input", maxLength: 150, value: childName, onChange: event => setChildName(event.target.value) }),
            error && React.createElement("p", { role: "alert", style: { color: 'var(--danger)' } }, error),
            React.createElement("div", { className: "row", style: { gap: 8, marginTop: 12 } },
                React.createElement("button", { className: "btn p", disabled: busy || !childName.trim(), onClick: addChild }, "\u0630\u062E\u06CC\u0631\u0647 \u0632\u06CC\u0631\u0645\u0646\u0637\u0642\u0647"),
                React.createElement("button", { className: "btn g", disabled: busy, onClick: () => setChild(null) }, "\u0627\u0646\u0635\u0631\u0627\u0641"))),
        editing && React.createElement(Modal, { title: "\u0648\u06CC\u0631\u0627\u06CC\u0634 \u0645\u0646\u0637\u0642\u0647", onClose: () => { if (!busy)
                setEditing(null); } },
            React.createElement("label", null, "\u0646\u0627\u0645 \u0645\u0646\u0637\u0642\u0647"),
            React.createElement("input", { className: "input", maxLength: 150, value: editName, onChange: event => setEditName(event.target.value) }),
            React.createElement("label", null, "\u0645\u0646\u0637\u0642\u0647 \u0648\u0627\u0644\u062F"),
            React.createElement("select", { "aria-label": "\u0645\u0646\u0637\u0642\u0647 \u0648\u0627\u0644\u062F", className: "input", value: editParent, onChange: event => setEditParent(event.target.value) },
                React.createElement("option", { value: "" }, "\u0645\u0646\u0637\u0642\u0647 \u0645\u0633\u062A\u0642\u0644 (\u0628\u062F\u0648\u0646 \u0648\u0627\u0644\u062F)"),
                ordered.filter(zone => !isDescendant(zone, editing.id)).map(zone => React.createElement("option", { key: zone.id, value: zone.id }, pathFor(zone)))),
            error && React.createElement("p", { role: "alert", style: { color: "var(--danger)" } }, error),
            React.createElement("button", { className: "btn p", disabled: busy || !editName.trim(), onClick: saveZone }, "\u0630\u062E\u06CC\u0631\u0647\u0654 \u0645\u0646\u0637\u0642\u0647"))));
}
function OrgChart() {
    const [data, setData] = useState({ users: [], edges: [], default_edges: [], zones: [] });
    const [mode, setMode] = useState("regional");
    const [zoneFilter, setZoneFilter] = useState("");
    const [error, setError] = useState("");
    const [expanded, setExpanded] = useState(() => new Set());
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 30, y: 25 });
    const [dragPan, setDragPan] = useState(null);
    const [dragUser, setDragUser] = useState(null);
    const [over, setOver] = useState(null);
    const [multiUser, setMultiUser] = useState(null);
    const [query, setQuery] = useState("");
    const [fitKey, setFitKey] = useState(0);
    const viewport = useRef(null);
    const lastCanvas = useRef({ w: 0, h: 0 });
    const reload = () => db.orgChart().then(next => { setError(""); setData({ users: (next.users || []).filter(u => Number(u.is_active) === 1), edges: next.edges || [], default_edges: next.default_edges || [], zones: next.zones || [] }); }).catch(failure => setError(failure.message || 'Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ú†Ø§Ø±Øª Ø§Ù†Ø¬Ø§Ù… Ù†Ø´Ø¯.'));
    useEffect(() => { reload(); }, []);
    const users = data.users, edges = mode === "regional" ? data.default_edges : data.edges;
    const byId = Object.fromEntries(users.map(u => [+u.id, u]));
    const parentMap = {}, childMap = {};
    edges.forEach(edge => { const user = +edge.user_id, manager = +edge.manager_id; if (user === manager || !byId[user] || !byId[manager])
        return; (parentMap[user] || (parentMap[user] = new Set())).add(manager); (childMap[manager] || (childMap[manager] = new Set())).add(user); });
    const parents = id => [...(parentMap[+id] || [])];
    const children = id => [...(childMap[+id] || [])];
    const naturalRoots = users.filter(u => parents(u.id).length === 0).map(u => +u.id);
    // Ú¯Ø±Ø§Ù Ø³Ø§Ø²Ù…Ø§Ù†ÛŒ Ù…Ù…Ú©Ù† Ø§Ø³Øª Ú†Ù†Ø¯ÙˆØ§Ù„Ø¯ÛŒØŒ Ø¯Ø§Ø±Ø§ÛŒ Ú†Ø±Ø®Ù‡Ù” Ø¯Ø§Ø¯Ù‡â€ŒØ§ÛŒ ÛŒØ§ Ø¨Ø®Ø´â€ŒÙ‡Ø§ÛŒ Ø¬Ø¯Ø§Ø§ÙØªØ§Ø¯Ù‡ Ø¨Ø§Ø´Ø¯.
    // Ø¨Ø±Ø§ÛŒ Ø¬Ù„ÙˆÚ¯ÛŒØ±ÛŒ Ø§Ø² Ø®Ø§Ù„ÛŒâ€ŒØ´Ø¯Ù† Ú†Ø§Ø±ØªØŒ Ù‡Ù…Ù‡Ù” Ù…Ø¤Ù„ÙÙ‡â€ŒÙ‡Ø§ ÛŒÚ© Ø±ÛŒØ´Ù‡Ù” Ù†Ù…Ø§ÛŒØ´ÛŒ Ø§Ù…Ù† Ø¯Ø±ÛŒØ§ÙØª Ù…ÛŒâ€ŒÚ©Ù†Ù†Ø¯.
    const roots = (() => {
        const out = [...naturalRoots], seen = new Set(), q = [...naturalRoots];
        while (q.length) {
            const id = q.shift();
            if (seen.has(id))
                continue;
            seen.add(id);
            children(id).forEach(c => { if (!seen.has(c))
                q.push(c); });
        }
        users.forEach(u => { const id = +u.id; if (!seen.has(id)) {
            out.push(id);
            q.push(id);
            while (q.length) {
                const x = q.shift();
                if (seen.has(x))
                    continue;
                seen.add(x);
                children(x).forEach(c => { if (!seen.has(c))
                    q.push(c); });
            }
        } });
        return [...new Set(out)];
    })();
    const visible = (() => { const out = new Set(roots), q = [...roots]; while (q.length) {
        const id = q.shift();
        if (!expanded.has(id))
            continue;
        children(id).forEach(c => { if (!out.has(c)) {
            out.add(c);
            q.push(c);
        } });
    } return out; })();
    const filtered = query.trim() || zoneFilter !== "" ? new Set(users.filter(user => (!query.trim() || ((user.first_name || '') + ' ' + (user.last_name || '') + ' ' + (user.role_title || '') + ' ' + (user.zone_name || '')).includes(query.trim())) && (zoneFilter === "" || (zoneFilter === "none" ? !user.zone_id : +user.zone_id === +zoneFilter))).map(user => +user.id)) : null;
    if (filtered) {
        [...filtered].forEach(id => { let q = [id], seen = new Set(); while (q.length) {
            let x = q.shift();
            parents(x).forEach(p => { if (!seen.has(p)) {
                seen.add(p);
                filtered.add(p);
                q.push(p);
            } });
        } });
    }
    const shown = filtered ? [...filtered].filter(id => byId[id]) : [...visible];
    const shownSet = new Set(shown);
    const level = {};
    if (mode === "regional") {
        const incoming = Object.fromEntries(shown.map(id => [id, parents(id).filter(parent => shownSet.has(parent)).length]));
        const pending = shown.filter(id => incoming[id] === 0);
        shown.forEach(id => level[id] = 0);
        while (pending.length) {
            const manager = pending.shift();
            children(manager).filter(child => shownSet.has(child)).forEach(child => { level[child] = Math.max(level[child], level[manager] + 1); incoming[child] -= 1; if (incoming[child] === 0)
                pending.push(child); });
        }
    }
    else {
        const pending = roots.filter(id => shownSet.has(id));
        pending.forEach(id => level[id] = 0);
        while (pending.length) {
            const manager = pending.shift();
            children(manager).filter(child => shownSet.has(child)).forEach(child => { if (level[child] === undefined) {
                level[child] = level[manager] + 1;
                pending.push(child);
            } });
        }
        shown.forEach(id => { if (level[id] === undefined)
            level[id] = 0; });
    }
    const groups = {};
    shown.forEach(id => (groups[level[id]] || (groups[level[id]] = [])).push(id));
    Object.values(groups).forEach(a => a.sort((a, b) => ((byId[a].zone_name || '') + (byId[a].role_title || '') + (byId[a].last_name || '')).localeCompare((byId[b].zone_name || '') + (byId[b].role_title || '') + (byId[b].last_name || ''), 'fa')));
    const cardW = 205, cardH = 124, gapX = 30, gapY = 62, pad = 45, maxPerRow = 8;
    const pos = {};
    const levels = Object.keys(groups).map(Number).sort((a, b) => a - b);
    const canvasW = Math.max(900, pad * 2 + maxPerRow * cardW + (maxPerRow - 1) * gapX);
    let cursorY = pad;
    levels.forEach(l => {
        const items = groups[l], rows = [];
        for (let i = 0; i < items.length; i += maxPerRow)
            rows.push(items.slice(i, i + maxPerRow));
        rows.forEach(row => { const w = row.length * cardW + (row.length - 1) * gapX; row.forEach((id, i) => pos[id] = { x: (canvasW - w) / 2 + i * (cardW + gapX), y: cursorY }); cursorY += cardH + gapY; });
        cursorY += 18;
    });
    const canvasH = Math.max(420, cursorY + pad);
    const setMgr = async (uid, mid) => { try {
        await db.setOrg(uid, { manager_id: mid || null });
        reload();
    }
    catch (failure) {
        setError(failure.message || 'Ø°Ø®ÛŒØ±Ù‡ Ø§Ø±ØªØ¨Ø§Ø· Ø§Ù†Ø¬Ø§Ù… Ù†Ø´Ø¯.');
    } };
    const onUserDrop = async (target) => { if (mode !== "saved")
        return; const d = dragUser; setDragUser(null); setOver(null); if (!d || d.id === target.id)
        return; if (parents(target.id).includes(+d.id)) {
        alert('Ø§ÛŒÙ† Ø§Ø±ØªØ¨Ø§Ø· Ø¨Ø§Ø¹Ø« Ø§ÛŒØ¬Ø§Ø¯ Ú†Ø±Ø®Ù‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯.');
        return;
    } await setMgr(d.id, target.id); };
    const centerAt = (z = zoom) => { const el = viewport.current; if (!el)
        return; setPan({ x: (el.clientWidth - canvasW * z) / 2, y: Math.max(18, (el.clientHeight - canvasH * z) / 2) }); };
    const fit = () => { const el = viewport.current; if (!el)
        return; const z = Math.min((el.clientWidth - 36) / canvasW, (el.clientHeight - 36) / canvasH, 1.25); const nz = Math.max(.06, z); setZoom(nz); setPan({ x: (el.clientWidth - canvasW * nz) / 2, y: Math.max(18, (el.clientHeight - canvasH * nz) / 2) }); };
    const reset = () => { setZoom(1); requestAnimationFrame(() => centerAt(1)); };
    const toggle = id => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
    useEffect(() => { const el = viewport.current; if (!el)
        return; const prev = lastCanvas.current; if (prev.w && prev.h && (prev.w !== canvasW || prev.h !== canvasH)) {
        setPan(p => ({ x: p.x - (canvasW - prev.w) * zoom / 2, y: p.y - (canvasH - prev.h) * zoom / 2 }));
    } lastCanvas.current = { w: canvasW, h: canvasH }; }, [canvasW, canvasH]);
    const printChart = () => { const node = document.querySelector('.org-canvas'); if (!node)
        return; const w = window.open('', '_org_print', 'width=1200,height=900'); if (!w) {
        alert('Ø§Ø¬Ø§Ø²Ù‡Ù” Ø¨Ø§Ø² Ø´Ø¯Ù† Ù¾Ù†Ø¬Ø±Ù‡ Ú†Ø§Ù¾ Ø±Ø§ ÙØ¹Ø§Ù„ Ú©Ù†ÛŒØ¯.');
        return;
    } const styles = [...document.querySelectorAll('link[rel="stylesheet"],style')].map(x => x.outerHTML).join(''); const html = node.outerHTML; w.document.write(`<html dir="rtl"><head><meta charset="utf-8"><title>Ú†Ø§Ù¾ Ú†Ø§Ø±Øª Ø³Ø§Ø²Ù…Ø§Ù†ÛŒ</title>${styles}<style>@page{size:A4 landscape;margin:5mm}html,body{width:287mm;height:200mm;margin:0;padding:0;overflow:hidden;background:#fff!important}.print-page{width:277mm;height:190mm;display:flex;flex-direction:column;align-items:center;justify-content:flex-start}.title{text-align:center;font-size:15px;font-weight:bold;height:10mm;line-height:10mm}.chart-fit{width:277mm;height:180mm;position:relative;overflow:hidden;display:flex;align-items:flex-start;justify-content:center}.org-canvas{position:relative!important;margin:0!important;transform-origin:top center!important}.org-canvas button{display:none!important}</style></head><body><div class="print-page"><div class="title">Ú†Ø§Ø±Øª Ø³Ø§Ø²Ù…Ø§Ù†ÛŒ Ù†ÛŒØ±ÙˆÙ‡Ø§</div><div class="chart-fit">${html}</div></div><script>window.onload=()=>setTimeout(()=>{const n=document.querySelector('.org-canvas'),box=document.querySelector('.chart-fit');if(n&&box){n.style.transform='none';const sw=Math.max(n.scrollWidth,n.offsetWidth,1),sh=Math.max(n.scrollHeight,n.offsetHeight,1);const sc=Math.min(box.clientWidth/sw,box.clientHeight/sh,1);n.style.transform='scale('+sc+')';n.style.transformOrigin='top center';n.style.flex='0 0 '+sw+'px';}setTimeout(()=>window.print(),250)},350)<\/script></body></html>`); w.document.close(); };
    const expandAll = () => { setExpanded(new Set(users.map(u => +u.id))); setFitKey(k => k + 1); };
    const collapseAll = () => { setExpanded(new Set()); setFitKey(k => k + 1); };
    useEffect(() => { if (fitKey) {
        const t = setTimeout(fit, 40);
        return () => clearTimeout(t);
    } }, [fitKey, canvasW, canvasH]);
    useEffect(() => {
        const el = viewport.current;
        if (!el)
            return;
        const wheel = e => {
            e.preventDefault();
            const rect = el.getBoundingClientRect(), mx = e.clientX - rect.left, my = e.clientY - rect.top;
            setZoom(current => {
                const nz = Math.max(.06, Math.min(2.2, current * (e.deltaY < 0 ? 1.1 : .9)));
                setPan(p => ({ x: mx - (mx - p.x) * (nz / current), y: my - (my - p.y) * (nz / current) }));
                return nz;
            });
        };
        el.addEventListener('wheel', wheel, { passive: false });
        return () => el.removeEventListener('wheel', wheel);
    }, []);
    return (React.createElement("div", { className: "panel admin-workspace-page", style: { padding: 0, overflow: "hidden" } },
        React.createElement("div", { style: { padding: "16px 18px 12px", borderBottom: "1px solid var(--line)", background: "linear-gradient(180deg,var(--card),rgba(13,122,95,.035))" } },
            React.createElement("div", { className: "row", style: { justifyContent: "space-between", gap: 10, flexWrap: "wrap" } },
                React.createElement("div", null,
                    React.createElement("h3", { style: { margin: 0 } }, "\u0686\u0627\u0631\u062A \u0633\u0627\u0632\u0645\u0627\u0646\u06CC \u0646\u06CC\u0631\u0648\u0647\u0627"),
                    React.createElement("p", { className: "muted", style: { margin: "5px 0 0", fontSize: 12 } }, "\u0686\u0627\u0631\u062A \u067E\u06CC\u0634\u200C\u0641\u0631\u0636 \u0627\u0632 \u0645\u0646\u0637\u0642\u0647 \u0648 \u0633\u0645\u062A \u0646\u06CC\u0631\u0648\u0647\u0627 \u0633\u0627\u062E\u062A\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F. \u06AF\u0634\u062A\u200C\u0647\u0627\u06CC \u0645\u0648\u062A\u0648\u0631\u06CC \u0645\u0633\u062A\u0642\u06CC\u0645\u0627\u064B \u0632\u06CC\u0631 \u0646\u0638\u0631 \u0633\u0631\u0628\u0627\u0632\u0631\u0633 \u0627\u0631\u0634\u062F \u0647\u0633\u062A\u0646\u062F. \u0628\u0631\u0627\u06CC \u0648\u06CC\u0631\u0627\u06CC\u0634 \u0627\u0631\u062A\u0628\u0627\u0637\u200C\u0647\u0627\u06CC \u062F\u0633\u062A\u06CC\u060C \u0646\u0645\u0627\u06CC \u00AB\u0631\u0648\u0627\u0628\u0637 \u062B\u0628\u062A\u200C\u0634\u062F\u0647\u00BB \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F. \u0628\u0627 + \u0647\u0631 \u0634\u0627\u062E\u0647 \u0631\u0627 \u0628\u0627\u0632 \u06A9\u0646\u06CC\u062F.")),
                React.createElement("div", { className: "row", style: { gap: 6, flexWrap: "wrap" } },
                    React.createElement("button", { className: "btn g", disabled: !!filtered, onClick: collapseAll }, "\u0628\u0633\u062A\u0646 \u0647\u0645\u0647"),
                    React.createElement("button", { className: "btn g", disabled: !!filtered, onClick: expandAll }, "\u0628\u0627\u0632\u06A9\u0631\u062F\u0646 \u0647\u0645\u0647"),
                    React.createElement("button", { className: "btn g", onClick: fit }, "\u062C\u0627 \u062F\u0627\u062F\u0646 \u062F\u0631 \u0635\u0641\u062D\u0647"),
                    React.createElement("button", { className: "btn g", onClick: () => centerAt() }, "\u0645\u0631\u06A9\u0632 \u06A9\u0631\u062F\u0646"),
                    React.createElement("button", { className: "btn p", onClick: printChart }, "\uD83D\uDDA8 \u0686\u0627\u067E \u0686\u0627\u0631\u062A"))),
            React.createElement("div", { className: "row", style: { gap: 8, marginTop: 12, flexWrap: "wrap" } },
                React.createElement("select", { className: "input", style: { maxWidth: 220 }, "aria-label": "\u0646\u0648\u0639 \u0686\u0627\u0631\u062A", value: mode, onChange: event => { setMode(event.target.value); setExpanded(new Set()); } },
                    React.createElement("option", { value: "regional" }, "\u067E\u06CC\u0634\u200C\u0641\u0631\u0636 \u0645\u0646\u0637\u0642\u0647\u200C\u0628\u0646\u062F\u06CC"),
                    React.createElement("option", { value: "saved" }, "\u0631\u0648\u0627\u0628\u0637 \u062B\u0628\u062A\u200C\u0634\u062F\u0647")),
                React.createElement("select", { className: "input", style: { maxWidth: 220 }, "aria-label": "\u0645\u0646\u0637\u0642\u0647 \u0686\u0627\u0631\u062A", value: zoneFilter, onChange: event => setZoneFilter(event.target.value) },
                    React.createElement("option", { value: "" }, "\u0647\u0645\u0647\u0654 \u0645\u0646\u0627\u0637\u0642"),
                    React.createElement("option", { value: "none" }, "\u0628\u062F\u0648\u0646 \u0645\u0646\u0637\u0642\u0647"),
                    data.zones.map(zone => React.createElement("option", { key: zone.id, value: zone.id }, zone.name))),
                React.createElement("input", { className: "input", style: { maxWidth: 280 }, placeholder: "\u062C\u0633\u062A\u062C\u0648\u06CC \u0646\u0627\u0645 \u06CC\u0627 \u0633\u0645\u062A\u2026", value: query, onChange: e => setQuery(e.target.value) }),
                React.createElement("button", { className: "btn g", onClick: reload }, "\u062A\u0627\u0632\u0647\u200C\u0633\u0627\u0632\u06CC"),
                React.createElement("button", { className: "btn g", title: "\u0628\u0632\u0631\u06AF\u200C\u0646\u0645\u0627\u06CC\u06CC", onClick: () => setZoom(z => Math.min(2.2, z + .15)) }, "\uFF0B"),
                React.createElement("button", { className: "btn g", title: "\u06A9\u0648\u0686\u06A9\u200C\u0646\u0645\u0627\u06CC\u06CC", onClick: () => setZoom(z => Math.max(.06, z - .15)) }, "\u2212"),
                React.createElement("button", { className: "btn g", onClick: reset }, "\u06F1\u06F0\u06F0\u066A"),
                React.createElement("span", { className: "muted", style: { fontSize: 12 } },
                    "\u0628\u0632\u0631\u06AF\u200C\u0646\u0645\u0627\u06CC\u06CC: ",
                    fa(Math.round(zoom * 100)),
                    "\u066A \u00B7 ",
                    fa(shown.length),
                    " \u0646\u0641\u0631"),
                filtered && React.createElement("span", { className: "muted", style: { fontSize: 11 } }, "\u062F\u0631 \u062D\u0627\u0644\u062A \u0641\u06CC\u0644\u062A\u0631\u060C \u0646\u062A\u0627\u06CC\u062C \u0648 \u0628\u0627\u0644\u0627\u062F\u0633\u062A\u200C\u0647\u0627 \u0628\u0647\u200C\u0635\u0648\u0631\u062A \u06A9\u0627\u0645\u0644 \u0646\u0645\u0627\u06CC\u0634 \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F.")),
            error && React.createElement("p", { role: "alert", style: { color: "var(--danger)" } }, error)),
        React.createElement("div", { ref: viewport, onMouseDown: e => { if (e.target === e.currentTarget || e.target.closest('.org-canvas'))
                setDragPan({ x: e.clientX - pan.x, y: e.clientY - pan.y }); }, onMouseMove: e => { if (dragPan)
                setPan({ x: e.clientX - dragPan.x, y: e.clientY - dragPan.y }); }, onMouseUp: () => setDragPan(null), onMouseLeave: () => setDragPan(null), style: { height: "calc(100vh - 245px)", minHeight: 520, overflow: "hidden", position: "relative", cursor: dragPan ? "grabbing" : "grab", backgroundImage: "radial-gradient(var(--line) 1px, transparent 1px)", backgroundSize: "22px 22px", userSelect: "none" } },
            React.createElement("div", { className: "org-canvas", style: { position: "absolute", width: canvasW, height: canvasH, transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" } },
                React.createElement("svg", { width: canvasW, height: canvasH, style: { position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" } },
                    React.createElement("defs", null,
                        React.createElement("marker", { id: "orgArrow", viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "5", markerHeight: "5", orient: "auto-start-reverse" },
                            React.createElement("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "var(--brand)" }))),
                    edges.filter(e => pos[+e.manager_id] && pos[+e.user_id]).map((e, i) => { const a = pos[+e.manager_id], b = pos[+e.user_id], x1 = a.x + cardW / 2, y1 = a.y + cardH, x2 = b.x + cardW / 2, y2 = b.y, mid = (y1 + y2) / 2; return React.createElement("path", { key: i, d: `M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`, fill: "none", stroke: e.primary ? "var(--brand)" : "var(--muted)", strokeWidth: e.primary ? 2.4 : 1.7, strokeDasharray: e.primary ? "" : "6 5", opacity: .8, markerEnd: "url(#orgArrow)" }); })),
                shown.map(id => {
                    const u = byId[id], p = pos[id], kids = children(id), isOpen = expanded.has(id), parentCount = parents(id).length;
                    return React.createElement("div", { key: id, draggable: mode === "saved", onDragStart: e => { e.stopPropagation(); setDragUser(u); }, onDragOver: e => { if (mode !== "saved")
                            return; e.preventDefault(); e.stopPropagation(); setOver(id); }, onDragLeave: () => setOver(null), onDrop: e => { e.preventDefault(); e.stopPropagation(); onUserDrop(u); }, style: { position: "absolute", left: p.x, top: p.y, width: cardW, height: cardH, border: `${over === id ? 2 : 1}px solid ${over === id ? 'var(--brand)' : 'var(--line)'}`, borderRadius: 16, background: "var(--card)", boxShadow: "0 6px 18px rgba(15,27,45,.10)", padding: "11px 12px", cursor: "grab", display: "flex", flexDirection: "column", justifyContent: "space-between" } },
                        React.createElement("div", { className: "row", style: { gap: 8, alignItems: "flex-start" } },
                            React.createElement("div", { style: { width: 38, height: 38, borderRadius: 12, background: "var(--brand-soft)", display: "grid", placeItems: "center", fontWeight: 800, color: "var(--brand)" } }, (u.first_name || '?').charAt(0)),
                            React.createElement("div", { style: { minWidth: 0, flex: 1 } },
                                React.createElement("b", { style: { display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } },
                                    u.first_name,
                                    " ",
                                    u.last_name),
                                React.createElement("small", { className: "muted", style: { display: "block", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, u.role_title || 'Ø¨Ø¯ÙˆÙ† Ø³Ù…Øª')),
                            kids.length > 0 && !filtered && React.createElement("button", { className: "btn g", onClick: e => { e.stopPropagation(); toggle(id); }, style: { padding: 0, width: 28, height: 28, borderRadius: 9, fontSize: 18, lineHeight: 1 }, title: isOpen ? 'Ø¨Ø³ØªÙ† Ø²ÛŒØ±Ù…Ø¬Ù…ÙˆØ¹Ù‡â€ŒÙ‡Ø§' : 'Ù†Ù…Ø§ÛŒØ´ Ø²ÛŒØ±Ù…Ø¬Ù…ÙˆØ¹Ù‡â€ŒÙ‡Ø§' }, isOpen ? 'âˆ’' : '+')),
                        React.createElement("small", { className: "muted", style: { fontSize: 11 } }, u.zone_name || 'Ø¨Ø¯ÙˆÙ† Ù…Ù†Ø·Ù‚Ù‡'),
                        React.createElement("div", { className: "row", style: { justifyContent: "space-between", gap: 5 } },
                            React.createElement("span", { className: "muted", style: { fontSize: 10.5 } },
                                kids.length ? fa(kids.length) + ' Ø²ÛŒØ±Ù…Ø¬Ù…ÙˆØ¹Ù‡' : 'Ø¨Ø¯ÙˆÙ† Ø²ÛŒØ±Ù…Ø¬Ù…ÙˆØ¹Ù‡',
                                parentCount > 1 ? ' Â· ' + fa(parentCount) + ' Ù…Ø³Ø¦ÙˆÙ„' : ''),
                            mode === "saved" && React.createElement("button", { className: "btn g", style: { padding: "3px 7px", fontSize: 10.5 }, onClick: e => { e.stopPropagation(); setMultiUser(u); } }, "\u062A\u0646\u0638\u06CC\u0645 \u0627\u0631\u062A\u0628\u0627\u0637\u200C\u0647\u0627")));
                })),
            !shown.length && React.createElement("div", { style: { position: "absolute", inset: 0, display: "grid", placeItems: "center" } },
                React.createElement("div", { className: "muted" }, "\u0646\u062A\u06CC\u062C\u0647\u200C\u0627\u06CC \u0628\u0631\u0627\u06CC \u0646\u0645\u0627\u06CC\u0634 \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0631\u062F."))),
        multiUser && React.createElement(ManagersEditor, { user: multiUser, users: users, onClose: () => { setMultiUser(null); reload(); } })));
}
// ÙˆÛŒØ±Ø§ÛŒØ´ Ú†Ù†Ø¯ Ù…Ù‚Ø§Ù… Ø¨Ø§Ù„Ø§Ø³Ø±ÛŒ Ø¨Ø±Ø§ÛŒ ÛŒÚ© Ù†ÛŒØ±Ùˆ
function ManagersEditor({ user, users, onClose }) {
    const [sel, setSel] = useState([]);
    const [q, setQ] = useState("");
    useEffect(() => { db.userManagers(user.id).then(ids => setSel(ids || [])).catch(() => { }); }, []);
    const toggle = (id) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
    const save = async () => { await db.setUserManagers(user.id, sel); alert("Ù…Ù‚Ø§Ù…â€ŒÙ‡Ø§ÛŒ Ø¨Ø§Ù„Ø§Ø³Ø±ÛŒ Ø°Ø®ÛŒØ±Ù‡ Ø´Ø¯."); onClose(); };
    const cand = users.filter(m => m.id !== user.id && (!q.trim() || (m.first_name + " " + m.last_name).includes(q.trim()) || (m.role_title || "").includes(q.trim())));
    return (React.createElement(Modal, { title: `Ù…Ù‚Ø§Ù…â€ŒÙ‡Ø§ÛŒ Ø¨Ø§Ù„Ø§Ø³Ø±ÛŒ â€” ${user.first_name} ${user.last_name}`, onClose: onClose },
        React.createElement("p", { style: { fontSize: 12, color: "var(--muted)", marginBottom: 8 } }, "\u06CC\u06A9 \u0646\u06CC\u0631\u0648 \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u062F \u0686\u0646\u062F \u0645\u0642\u0627\u0645 \u0628\u0627\u0644\u0627\u0633\u0631\u06CC \u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F (\u0645\u062B\u0644\u0627\u064B \u06CC\u06A9 \u0646\u0627\u0638\u0631 \u062E\u0637 \u0632\u06CC\u0631 \u0646\u0638\u0631 \u062F\u0648 \u06CC\u0627 \u0633\u0647 \u0628\u0627\u0632\u0631\u0633). \u06AF\u0632\u0627\u0631\u0634\u200C\u0647\u0627\u06CC \u0627\u06CC\u0646 \u0641\u0631\u062F \u0628\u0631\u0627\u06CC \u0647\u0645\u0647\u0654 \u0645\u0642\u0627\u0645\u200C\u0647\u0627\u06CC \u0627\u0646\u062A\u062E\u0627\u0628\u200C\u0634\u062F\u0647 \u0627\u0631\u0633\u0627\u0644/\u0627\u0631\u062C\u0627\u0639 \u0645\u06CC\u200C\u0634\u0648\u062F."),
        React.createElement("input", { className: "input", placeholder: "\u062C\u0633\u062A\u062C\u0648\u06CC \u0646\u0627\u0645 \u06CC\u0627 \u0633\u0645\u062A\u2026", value: q, onChange: e => setQ(e.target.value), style: { marginBottom: 8 } }),
        React.createElement("div", { style: { maxHeight: 300, overflow: "auto", border: "1px solid var(--line)", borderRadius: 10 } }, cand.map(m => React.createElement("label", { key: m.id, className: "row", style: { gap: 8, padding: "8px 12px", borderBottom: "1px solid var(--line)", cursor: "pointer" } },
            React.createElement("input", { type: "checkbox", checked: sel.includes(m.id), onChange: () => toggle(m.id) }),
            React.createElement("span", { style: { flex: 1 } },
                m.first_name,
                " ",
                m.last_name),
            React.createElement("span", { className: "muted", style: { fontSize: 11 } }, m.role_title)))),
        React.createElement("button", { className: "btn p", style: { marginTop: 12, width: "100%" }, onClick: save },
            "\u0630\u062E\u06CC\u0631\u0647\u0654 \u0645\u0642\u0627\u0645\u200C\u0647\u0627\u06CC \u0628\u0627\u0644\u0627\u0633\u0631\u06CC (",
            fa(sel.length),
            ")")));
}
// ØªØ§Ø±ÛŒØ®Ú†Ù‡Ù” Ù¾ÛŒØ§Ù…Ú©â€ŒÙ‡Ø§ÛŒ ÛŒÚ© Ø±Ø§Ù†Ù†Ø¯Ù‡ (Ø¯Ø± Ø¬Ø²Ø¦ÛŒØ§Øª Ø±Ø§Ù†Ù†Ø¯Ù‡)
function DriverCultural({ nid }) {
    const [list, setList] = useState(null);
    useEffect(() => { if (nid)
        GET("/admin/driver-cultural?national_id=" + nid).then(setList).catch(() => setList([])); }, [nid]);
    if (list === null)
        return React.createElement("p", { className: "muted" }, "\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC\u2026");
    if (!list.length)
        return React.createElement("p", { className: "muted" }, "\u0641\u0639\u0627\u0644\u06CC\u062A \u0641\u0631\u0647\u0646\u06AF\u06CC \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A.");
    return React.createElement("div", null, list.map((c, i) => React.createElement("div", { key: i, className: "card-p", style: { display: "flex", justifyContent: "space-between", gap: 8 } },
        React.createElement("span", null,
            React.createElement("b", null, c.type_title),
            c.place_title ? (" â€” " + c.place_title) : (c.location ? (" â€” " + c.location) : ""),
            c.hours ? (" Â· " + fa(c.hours) + " Ø³Ø§Ø¹Øª") : "",
            c.note ? (" â€” " + c.note) : ""),
        React.createElement("span", { style: { fontSize: 11.5, color: "var(--muted)", whiteSpace: "nowrap" } },
            fa(c.activity_jdate),
            c.recorded_by_name ? (" Â· " + c.recorded_by_name) : ""))));
}
function DriverWelfare({ nid }) {
    const [list, setList] = useState(null);
    useEffect(() => { if (nid)
        GET("/admin/driver-welfare?national_id=" + nid).then(setList).catch(() => setList([])); }, [nid]);
    if (list === null)
        return React.createElement("p", { className: "muted" }, "\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC\u2026");
    if (!list.length)
        return React.createElement("p", { className: "muted" }, "\u0631\u0641\u0627\u0647\u06CC\u062A\u06CC \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A.");
    return React.createElement("div", null, list.map((w, i) => React.createElement("div", { key: i, className: "card-p", style: { display: "flex", justifyContent: "space-between", gap: 8 } },
        React.createElement("span", null,
            React.createElement("b", null, w.item_title),
            w.count > 1 ? (" Ã— " + fa(w.count)) : "",
            w.place_title ? (" â€” " + w.place_title) : "",
            w.note ? (" â€” " + w.note) : ""),
        React.createElement("span", { style: { fontSize: 11.5, color: "var(--muted)", whiteSpace: "nowrap" } },
            fa(w.granted_jdate),
            w.granted_by_name ? (" Â· " + w.granted_by_name) : ""))));
}
function DriverSmsHistory({ driverId }) {
    const [rows, setRows] = useState(null);
    useEffect(() => { if (driverId)
        db.driverSms(driverId).then(setRows).catch(() => setRows([])); }, [driverId]);
    if (rows === null)
        return React.createElement("p", { className: "muted" }, "\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC\u2026");
    if (!rows.length)
        return React.createElement("p", { className: "muted" }, "\u067E\u06CC\u0627\u0645\u06A9\u06CC \u0628\u0631\u0627\u06CC \u0627\u06CC\u0646 \u0631\u0627\u0646\u0646\u062F\u0647 \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A.");
    const dlv = (c) => c == 1 ? ["ØªØ­ÙˆÛŒÙ„ Ø´Ø¯", "b-ok"] : c == 2 ? ["ØªØ­ÙˆÛŒÙ„ Ù†Ø´Ø¯", "b-no"] : c == null ? ["â€”", "b-pending"] : ["Ø¯Ø± ØµÙ", "b-pending"];
    return React.createElement("div", null, rows.map(s => {
        const d = dlv(s.delivery_code);
        return (React.createElement("div", { key: s.id, className: "card-p", style: { marginBottom: 6 } },
            React.createElement("div", { className: "row", style: { justifyContent: "space-between", flexWrap: "wrap", gap: 6 } },
                React.createElement("span", { style: { fontSize: 11, color: "var(--muted)" } },
                    fj(s.created_at),
                    " ",
                    s.sender ? ("Â· " + s.sender) : ""),
                React.createElement("span", { className: "badge " + d[1], style: { fontSize: 10 } }, d[0])),
            React.createElement("div", { style: { fontSize: 12.5, marginTop: 4 } }, s.body)));
    }));
}
function DriverPortraitThumbnail({ url, name }) {
    const holder = useRef(null);
    const [visible, setVisible] = useState(false);
    const [src, setSrc] = useState('');
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        const node = holder.current;
        if (!node)
            return;
        if (!('IntersectionObserver' in window)) {
            setVisible(true);
            return;
        }
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) {
                setVisible(true);
                observer.disconnect();
            }
        }, { rootMargin: '160px' });
        observer.observe(node);
        return () => observer.disconnect();
    }, []);
    useEffect(() => {
        if (!visible || !url)
            return;
        let active = true, objectUrl = '';
        setSrc('');
        setFailed(false);
        fetch(url, { headers: tok(), cache: 'no-store' })
            .then(response => { if (!response.ok)
            throw Error('photo'); return response.blob(); })
            .then(blob => { objectUrl = URL.createObjectURL(blob); if (active)
            setSrc(objectUrl);
        else
            URL.revokeObjectURL(objectUrl); })
            .catch(() => { if (active)
            setFailed(true); });
        return () => { active = false; if (objectUrl)
            URL.revokeObjectURL(objectUrl); };
    }, [url, visible]);
    return React.createElement("div", { ref: holder, style: { width: 64, height: 82, border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', background: 'var(--surface,#f3f6f5)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 'auto' } }, src ? React.createElement("img", { src: src, alt: 'ØªØµÙˆÛŒØ± Ù¾Ø±Ø³Ù†Ù„ÛŒ ' + name, style: { width: '100%', height: '100%', objectFit: 'cover' } }) : React.createElement("span", { className: "muted", style: { fontSize: 10, textAlign: 'center', padding: 4 } }, failed ? 'ØªØµÙˆÛŒØ± Ø¯Ø± Ø¯Ø³ØªØ±Ø³ Ù†ÛŒØ³Øª' : 'Ø¯Ø± Ø­Ø§Ù„ Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒâ€¦'));
}
function Drivers() {
    const [data, setData] = useState({ rows: [], total: 0, page: 1, pages: 1 });
    const [f, setF] = useState({ q: "", line: "", model: "", gender: "", driver_type: "", with_photo: "" });
    const [page, setPage] = useState(1);
    const [per, setPer] = useState(10);
    const [full, setFull] = useState(null);
    const [edit, setEdit] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [photoBusy, setPhotoBusy] = useState(false);
    useEffect(() => {
        if (!(full === null || full === void 0 ? void 0 : full.photo)) {
            setPhotoPreview(null);
            return;
        }
        let alive = true;
        let url = null;
        fetch(full.photo, { headers: tok(), cache: 'no-store' }).then(r => { if (!r.ok)
            throw Error('photo'); return r.blob(); }).then(blob => { url = URL.createObjectURL(blob); if (alive)
            setPhotoPreview(url);
        else
            URL.revokeObjectURL(url); }).catch(() => { if (alive)
            setPhotoPreview(null); });
        return () => { alive = false; if (url)
            URL.revokeObjectURL(url); };
    }, [full === null || full === void 0 ? void 0 : full.photo]);
    const uploadPortrait = async (id, file) => {
        if (!file)
            return;
        setPhotoBusy(true);
        try {
            const image = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(Error('Ø®ÙˆØ§Ù†Ø¯Ù† ØªØµÙˆÛŒØ± Ù…Ù…Ú©Ù† Ù†Ø´Ø¯.')); reader.onload = () => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(Error('ØªØµÙˆÛŒØ± Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª.')); img.src = reader.result; }; reader.readAsDataURL(file); });
            const ratio = Math.min(1, 480 / image.width, 640 / image.height);
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(image.width * ratio);
            canvas.height = Math.round(image.height * ratio);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            let data = '';
            for (const q of [.35, .26, .18]) {
                data = canvas.toDataURL('image/jpeg', q);
                if ((data.length - data.indexOf(',') - 1) * .75 <= 120 * 1024)
                    break;
            }
            if ((data.length - data.indexOf(',') - 1) * .75 > 120 * 1024)
                throw Error('Ø­Ø¬Ù… Ø¹Ú©Ø³ Ù‡Ù†ÙˆØ² Ø¨ÛŒØ´ Ø§Ø² Û±Û²Û° Ú©ÛŒÙ„ÙˆØ¨Ø§ÛŒØª Ø§Ø³Øª.');
            await SEND('PUT', '/admin/drivers/' + id + '/photo', { photo_data: data, confirmed: true });
            await showFull(id);
            load(page);
            alert('ØªØµÙˆÛŒØ± Ù¾Ø±Ø³Ù†Ù„ÛŒ Ø±Ø§Ù†Ù†Ø¯Ù‡ Ø¨Ø§ Ù…ÙˆÙÙ‚ÛŒØª Ø«Ø¨Øª Ø´Ø¯.');
        }
        catch (error) {
            alert(error.message || 'Ø«Ø¨Øª ØªØµÙˆÛŒØ± Ø§Ù†Ø¬Ø§Ù… Ù†Ø´Ø¯.');
        }
        finally {
            setPhotoBusy(false);
        }
    };
    const clean = o => { const x = { ...o }; Object.keys(x).forEach(k => !x[k] && delete x[k]); return x; };
    const norm = d => Array.isArray(d) ? { rows: d, total: d.length, page: 1, pages: 1 } : (d && Array.isArray(d.rows) ? d : { rows: [], total: 0, page: 1, pages: 1 });
    const load = (pg = 1, filters = f) => { db.drivers({ ...clean(filters), page: pg, per }).then(d => { const n = norm(d); setData(n); setPage(n.page); }).catch(() => setData({ rows: [], total: 0, page: 1, pages: 1 })); };
    useEffect(() => { load(1); }, []);
    const exportXlsx = async () => {
        const d = await db.drivers({ ...clean(f), per: 10000, page: 1 });
        const rows = norm(d).rows;
        const ws = XLSX.utils.json_to_sheet(rows.map(r => ({ 'Ú©Ø¯ Ù…Ù„ÛŒ': r.national_id, 'Ù†Ø§Ù…': r.first_name, 'Ù†Ø§Ù… Ø®Ø§Ù†ÙˆØ§Ø¯Ú¯ÛŒ': r.last_name, 'Ù…ÙˆØ¨Ø§ÛŒÙ„': r.mobile, 'Ø¬Ù†Ø³ÛŒØª': r.gender, 'Ù†ÙˆØ¹ Ø±Ø§Ù†Ù†Ø¯Ù‡': r.driver_type, 'Ù¾Ø±ÙˆØ§Ù†Ù‡ ØªØ§Ú©Ø³ÛŒØ±Ø§Ù†ÛŒ': r.taxi_lic_status, 'Ù¾Ø±ÙˆØ§Ù†Ù‡ Ø¨Ù‡Ø±Ù‡â€ŒØ¨Ø±Ø¯Ø§Ø±ÛŒ': r.op_lic_status })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Ø±Ø§Ù†Ù†Ø¯Ú¯Ø§Ù†');
        XLSX.writeFile(wb, 'drivers.xlsx');
    };
    const showFull = async (id) => { setFull({ loading: true }); try {
        setFull(await db.driverFull(id));
    }
    catch (e) {
        setFull(null);
        alert(e.message);
    } };
    const del = async (x) => { if (confirm('Ø­Ø°Ù Ø±Ø§Ù†Ù†Ø¯Ù‡ Â«' + x.first_name + ' ' + x.last_name + 'Â»ØŸ')) {
        await db.deleteDriver(x.id);
        load(page);
    } };
    const saveEdit = async () => { await db.updateDriver(edit.id, edit); setEdit(null); load(page); };
    return (React.createElement("div", { className: "panel admin-workspace-page admin-list-page" },
        React.createElement("h3", null,
            "\u0631\u0627\u0646\u0646\u062F\u06AF\u0627\u0646 \u0648 \u062E\u0648\u062F\u0631\u0648\u0647\u0627 ",
            React.createElement("button", { className: "btn p", onClick: exportXlsx }, "\u2B07 \u062E\u0631\u0648\u062C\u06CC \u0627\u06A9\u0633\u0644")),
        React.createElement("div", { className: "row page-toolbar", style: { gap: 8, flexWrap: "wrap", marginBottom: 12 } },
            React.createElement("input", { className: "input", style: { maxWidth: 170 }, placeholder: "\u06A9\u062F \u0645\u0644\u06CC \u06CC\u0627 \u0646\u0627\u0645", value: f.q, onChange: e => setF({ ...f, q: e.target.value }) }),
            React.createElement("input", { className: "input", style: { maxWidth: 110 }, placeholder: "\u06A9\u062F \u062E\u0637", value: f.line, onChange: e => setF({ ...f, line: e.target.value }) }),
            React.createElement("input", { className: "input", style: { maxWidth: 140 }, placeholder: "\u0645\u062F\u0644 \u062E\u0648\u062F\u0631\u0648", value: f.model, onChange: e => setF({ ...f, model: e.target.value }) }),
            React.createElement("select", { className: "input", style: { maxWidth: 110 }, value: f.gender, onChange: e => setF({ ...f, gender: e.target.value }) },
                React.createElement("option", { value: "" }, "\u062C\u0646\u0633\u06CC\u062A"),
                React.createElement("option", null, "\u0645\u0631\u062F"),
                React.createElement("option", null, "\u0632\u0646")),
            React.createElement("input", { className: "input", style: { maxWidth: 130 }, placeholder: "\u0646\u0648\u0639 \u0631\u0627\u0646\u0646\u062F\u0647", value: f.driver_type, onChange: e => setF({ ...f, driver_type: e.target.value }) }),
            React.createElement("label", { style: { display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '7px 12px', border: '1px solid var(--line)', borderRadius: 12, background: f.with_photo ? '#e7f4ee' : '#fff', color: 'var(--ink)', cursor: 'pointer', fontSize: 13, fontWeight: 600 } },
                React.createElement("input", { type: "checkbox", checked: f.with_photo === '1', onChange: e => { const next = { ...f, with_photo: e.target.checked ? '1' : '' }; setF(next); load(1, next); }, style: { width: 18, height: 18, accentColor: 'var(--brand)', cursor: 'pointer' } }),
                "\u0641\u0642\u0637 \u062F\u0627\u0631\u0627\u06CC \u0639\u06A9\u0633 \u067E\u0631\u0633\u0646\u0644\u06CC"),
            React.createElement("button", { className: "btn p", onClick: () => load(1) }, "\u0627\u0639\u0645\u0627\u0644 \u0641\u06CC\u0644\u062A\u0631")),
        React.createElement("p", { className: "muted", style: { marginBottom: 8 } },
            "\u0645\u062C\u0645\u0648\u0639: ",
            fa(data.total),
            " \u0631\u0627\u0646\u0646\u062F\u0647"),
        React.createElement(ResponsiveTable, null,
            React.createElement("thead", null,
                React.createElement("tr", null,
                    React.createElement("th", null, "\u062A\u0635\u0648\u06CC\u0631"),
                    React.createElement("th", null, "\u062B\u0628\u062A\u200C\u06A9\u0646\u0646\u062F\u0647 \u0648 \u0632\u0645\u0627\u0646 \u062A\u0635\u0648\u06CC\u0631"),
                    React.createElement("th", null, "\u06A9\u062F \u0645\u0644\u06CC"),
                    React.createElement("th", null, "\u0646\u0627\u0645"),
                    React.createElement("th", null, "\u0645\u0648\u0628\u0627\u06CC\u0644"),
                    React.createElement("th", null, "\u062C\u0646\u0633\u06CC\u062A"),
                    React.createElement("th", null, "\u067E\u0631\u0648\u0627\u0646\u0647 \u0628\u0647\u0631\u0647\u200C\u0628\u0631\u062F\u0627\u0631\u06CC"),
                    React.createElement("th", null, "\u0627\u0642\u062F\u0627\u0645\u0627\u062A"))),
            React.createElement("tbody", null, data.rows.map(x => React.createElement("tr", { key: x.id },
                React.createElement("td", null, x.photo ? React.createElement(DriverPortraitThumbnail, { url: x.photo, name: x.first_name + ' ' + x.last_name }) : React.createElement("span", { className: "badge b-pending" }, "\u0628\u062F\u0648\u0646 \u0639\u06A9\u0633")),
                React.createElement("td", null, x.photo ? React.createElement("div", { style: { display: 'grid', gap: 4, minWidth: 130 } },
                    React.createElement("strong", { style: { fontSize: 12 } }, x.photo_uploaded_by || (x.photo_uploaded_by_id ? 'Ú©Ø§Ø±Ø¨Ø± #' + fa(x.photo_uploaded_by_id) : 'Ù†Ø§Ù…Ø´Ø®Øµ')),
                    React.createElement("time", { style: { fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' } }, x.photo_uploaded_at ? fj(x.photo_uploaded_at) : 'Ø²Ù…Ø§Ù† Ø«Ø¨Øª Ù†Ø§Ù…Ø´Ø®Øµ')) : React.createElement("span", { className: "muted" }, "\u2014")),
                React.createElement("td", { style: { direction: "ltr", textAlign: "right" } }, x.national_id),
                React.createElement("td", null,
                    x.first_name,
                    " ",
                    x.last_name),
                React.createElement("td", { style: { direction: "ltr", textAlign: "right" } }, x.mobile),
                React.createElement("td", null, x.gender),
                React.createElement("td", null,
                    React.createElement("span", { className: "badge " + (x.op_lic_status === "ÙØ¹Ø§Ù„" ? "b-ok" : "b-no") }, x.op_lic_status || "â€”")),
                React.createElement("td", null,
                    React.createElement("div", { className: "row", style: { gap: 6, flexWrap: "wrap" } },
                        React.createElement("button", { className: "btn g", onClick: () => showFull(x.id) }, "\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u06A9\u0627\u0645\u0644"),
                        React.createElement("button", { className: "btn g", onClick: () => setEdit({ ...x }) }, "\u0648\u06CC\u0631\u0627\u06CC\u0634"),
                        React.createElement("button", { className: "btn g", style: { color: 'var(--danger)' }, onClick: () => del(x) }, "\u062D\u0630\u0641"))))))),
        React.createElement("div", { className: "row page-toolbar", style: { gap: 8, justifyContent: "center", alignItems: "center", marginTop: 12 } },
            React.createElement("button", { className: "btn g", disabled: page <= 1, onClick: () => load(page - 1) }, "\u0642\u0628\u0644\u06CC"),
            React.createElement("span", { style: { alignSelf: "center" } },
                "\u0635\u0641\u062D\u0647\u0654 ",
                fa(data.page),
                " \u0627\u0632 ",
                fa(data.pages || 1)),
            React.createElement("button", { className: "btn g", disabled: page >= data.pages, onClick: () => load(page + 1) }, "\u0628\u0639\u062F\u06CC"),
            React.createElement("span", { style: { color: "var(--muted)", fontSize: 12 } }, "\u062A\u0639\u062F\u0627\u062F \u062F\u0631 \u0635\u0641\u062D\u0647:"),
            React.createElement("select", { className: "input", style: { maxWidth: 80 }, value: per, onChange: e => { setPer(+e.target.value); setTimeout(() => load(1), 0); } },
                React.createElement("option", { value: 10 }, "\u06F1\u06F0"),
                React.createElement("option", { value: 25 }, "\u06F2\u06F5"),
                React.createElement("option", { value: 50 }, "\u06F5\u06F0"),
                React.createElement("option", { value: 100 }, "\u06F1\u06F0\u06F0"))),
        full && React.createElement(Modal, { title: "\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u06A9\u0627\u0645\u0644 \u0631\u0627\u0646\u0646\u062F\u0647", onClose: () => setFull(null) }, full.loading ? React.createElement("p", { className: "muted" }, "\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC\u2026") : React.createElement("div", null,
            React.createElement("p", null,
                React.createElement("b", null,
                    full.first_name,
                    " ",
                    full.last_name),
                " \u2014 \u06A9\u062F \u0645\u0644\u06CC ",
                full.national_id),
            React.createElement("div", { className: "card-p", style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 12 } },
                React.createElement("b", null, "\u062A\u0635\u0648\u06CC\u0631 \u067E\u0631\u0633\u0646\u0644\u06CC \u062A\u0627\u06A9\u0633\u06CC\u0631\u0627\u0646"),
                photoPreview ? React.createElement("img", { src: photoPreview, alt: "\u0639\u06A9\u0633 \u067E\u0631\u0633\u0646\u0644\u06CC \u062A\u0627\u06A9\u0633\u06CC\u0631\u0627\u0646", style: { width: 120, height: 156, objectFit: 'cover', borderRadius: 12 } }) : React.createElement("span", { className: "muted" }, full.photo ? 'Ø¯Ø± Ø­Ø§Ù„ Ø¯Ø±ÛŒØ§ÙØª ØªØµÙˆÛŒØ±â€¦' : 'ØªØµÙˆÛŒØ±ÛŒ Ø«Ø¨Øª Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª'),
                full.photo && React.createElement("div", { style: { width: '100%', display: 'grid', gap: 5, padding: 10, background: '#f3f8f6', borderRadius: 11, fontSize: 12, textAlign: 'right' } },
                    React.createElement("span", null,
                        "\u062B\u0628\u062A \u0627\u0648\u0644\u06CC\u0647: ",
                        React.createElement("b", null, full.photo_captured_by || 'Ù†Ø§Ù…Ø´Ø®Øµ'),
                        " \u00B7 ",
                        full.photo_confirmed_at ? fj(full.photo_confirmed_at) : 'Ø²Ù…Ø§Ù† Ù†Ø§Ù…Ø´Ø®Øµ'),
                    full.photo_updated_at && React.createElement("span", null,
                        "\u0622\u062E\u0631\u06CC\u0646 \u062A\u063A\u06CC\u06CC\u0631: ",
                        React.createElement("b", null, full.photo_uploaded_by || 'Ù†Ø§Ù…Ø´Ø®Øµ'),
                        " \u00B7 ",
                        fj(full.photo_updated_at))),
                React.createElement("label", { className: "btn g", style: { cursor: photoBusy ? 'wait' : 'pointer' } },
                    " ",
                    full.photo ? 'ÙˆÛŒØ±Ø§ÛŒØ´ ØªØµÙˆÛŒØ± ØªÙˆØ³Ø· Ù…Ø¯ÛŒØ±' : 'Ø¯Ø±Ø¬ ØªØµÙˆÛŒØ± ØªÙˆØ³Ø· Ù…Ø¯ÛŒØ±',
                    " ",
                    React.createElement("input", { type: "file", accept: "image/jpeg,image/png,image/webp", disabled: photoBusy, style: { display: 'none' }, onChange: e => { var _a; return uploadPortrait(full.id, (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0]); } })),
                React.createElement("small", { className: "muted" }, "\u062A\u0635\u0648\u06CC\u0631 \u0628\u0647\u200C\u0635\u0648\u0631\u062A \u06A9\u0645\u200C\u062D\u062C\u0645 \u0630\u062E\u06CC\u0631\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F\u061B \u062A\u0639\u0648\u06CC\u0636 \u0639\u06A9\u0633 \u0641\u0642\u0637 \u0628\u0631\u0627\u06CC \u0645\u062F\u06CC\u0631 \u0645\u062C\u0627\u0632 \u0627\u0633\u062A.")),
            React.createElement("p", { className: "muted" },
                "\u0645\u0648\u0628\u0627\u06CC\u0644: ",
                full.mobile || "â€”",
                " \u00B7 \u062C\u0646\u0633\u06CC\u062A: ",
                full.gender || "â€”",
                " \u00B7 \u0646\u0648\u0639: ",
                full.driver_type || "â€”"),
            React.createElement("h4", { style: { marginTop: 12 } }, "\u062E\u0648\u062F\u0631\u0648\u0647\u0627"),
            (full.vehicles || []).map((v, i) => React.createElement("div", { key: i, className: "card-p" },
                v.plate,
                " \u2014 ",
                v.model_name || "",
                " ",
                v.model_year || "",
                " ",
                v.line_code ? ("/ Ø®Ø· " + v.line_code) : "")),
            React.createElement("h4", { style: { marginTop: 12 } }, "\u062A\u0630\u06A9\u0631\u0627\u062A"),
            (full.notices || []).length ? full.notices.map((n, i) => React.createElement("div", { key: i, className: "card-p" },
                fj(n.created_at),
                " \u2014 ",
                n.reason || "",
                " (",
                n.priority,
                ")")) : React.createElement("p", { className: "muted" }, "\u2014"),
            React.createElement("h4", { style: { marginTop: 12 } }, "\u0628\u062F\u0647\u06CC\u200C\u0647\u0627"),
            (full.bills || []).length ? full.bills.map((bb, i) => React.createElement("div", { key: i, className: "card-p" },
                fa(Number(bb.amount || 0).toLocaleString('en-US')),
                " \u0631\u06CC\u0627\u0644 \u2014 ",
                bb.status)) : React.createElement("p", { className: "muted" }, "\u2014"),
            React.createElement("h4", { style: { marginTop: 12 } }, "\u0686\u06A9\u200C\u0644\u06CC\u0633\u062A\u200C\u0647\u0627"),
            (full.checklists || []).length ? full.checklists.map((c, i) => React.createElement("div", { key: i, className: "card-p" },
                fj(c.created_at),
                c.photo ? React.createElement("a", { href: "#", onClick: (e) => { e.preventDefault(); openMediaUrl(c.photo); }, style: { marginInlineStart: 8 } }, "\u0645\u0634\u0627\u0647\u062F\u0647\u0654 \u0639\u06A9\u0633") : "")) : React.createElement("p", { className: "muted" }, "\u2014"),
            React.createElement("h4", { style: { marginTop: 12 } }, "\u062A\u0627\u0631\u06CC\u062E\u0686\u0647\u0654 \u067E\u06CC\u0627\u0645\u06A9\u200C\u0647\u0627"),
            React.createElement(DriverSmsHistory, { driverId: full.id }),
            React.createElement("h4", { style: { marginTop: 12 } }, "\uD83C\uDF81 \u0631\u0641\u0627\u0647\u06CC\u0627\u062A \u062F\u0631\u06CC\u0627\u0641\u062A\u200C\u0634\u062F\u0647"),
            React.createElement(DriverWelfare, { nid: full.national_id }),
            React.createElement("h4", { style: { marginTop: 12 } }, "\uD83C\uDFAD \u0641\u0639\u0627\u0644\u06CC\u062A\u200C\u0647\u0627\u06CC \u0641\u0631\u0647\u0646\u06AF\u06CC"),
            React.createElement(DriverCultural, { nid: full.national_id }))),
        edit && React.createElement(Modal, { title: "\u0648\u06CC\u0631\u0627\u06CC\u0634 \u0631\u0627\u0646\u0646\u062F\u0647", onClose: () => setEdit(null) },
            React.createElement("div", { className: "row" },
                React.createElement("div", null,
                    React.createElement("label", null, "\u0646\u0627\u0645"),
                    React.createElement("input", { className: "input", value: edit.first_name || "", onChange: e => setEdit({ ...edit, first_name: e.target.value }) })),
                React.createElement("div", null,
                    React.createElement("label", null, "\u0646\u0627\u0645 \u062E\u0627\u0646\u0648\u0627\u062F\u06AF\u06CC"),
                    React.createElement("input", { className: "input", value: edit.last_name || "", onChange: e => setEdit({ ...edit, last_name: e.target.value }) }))),
            React.createElement("label", null, "\u0645\u0648\u0628\u0627\u06CC\u0644"),
            React.createElement("input", { className: "input", value: edit.mobile || "", onChange: e => setEdit({ ...edit, mobile: e.target.value }) }),
            React.createElement("label", null, "\u062C\u0646\u0633\u06CC\u062A"),
            React.createElement("select", { className: "input", value: edit.gender || "", onChange: e => setEdit({ ...edit, gender: e.target.value }) },
                React.createElement("option", { value: "" }, "\u2014"),
                React.createElement("option", null, "\u0645\u0631\u062F"),
                React.createElement("option", null, "\u0632\u0646")),
            React.createElement("button", { className: "btn p", style: { marginTop: 12 }, onClick: saveEdit }, "\u0630\u062E\u06CC\u0631\u0647"))));
}
function Bills() {
    const [data, setData] = useState({ rows: [], total: 0, page: 1, per: 25, pages: 1 });
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(true);
    const load = (search, page) => {
        setLoading(true);
        const params = new URLSearchParams();
        if (search)
            params.set('q', search);
        params.set('page', page || 1);
        params.set('per', 25);
        GET('/admin/bills?' + params.toString())
            .then(r => { setData(r && r.rows ? r : { rows: [], total: 0, page: 1, per: 25, pages: 1 }); setLoading(false); })
            .catch(() => { setData({ rows: [], total: 0, page: 1, per: 25, pages: 1 }); setLoading(false); });
    };
    useEffect(() => { load("", 1); }, []);
    const b = data.rows || [];
    return (React.createElement("div", { className: "panel admin-workspace-page" },
        React.createElement("h3", null, "\u0622\u0628\u0648\u0646\u0645\u0627\u0646 \u0648 \u0641\u06CC\u0634\u200C\u0647\u0627"),
        React.createElement("div", { className: "row", style: { gap: 8, marginBottom: 10, flexWrap: "wrap" } },
            React.createElement("input", { className: "input", style: { maxWidth: 260 }, placeholder: "\u062C\u0633\u062A\u062C\u0648: \u0646\u0627\u0645\u060C \u06A9\u062F \u0645\u0644\u06CC\u060C \u067E\u0644\u0627\u06A9 \u06CC\u0627 \u0634\u0646\u0627\u0633\u0647 \u0642\u0628\u0636", value: q, onChange: e => setQ(e.target.value), onKeyDown: e => e.key === 'Enter' && load(q, 1) }),
            React.createElement("button", { className: "btn p", onClick: () => load(q, 1) }, "\u062C\u0633\u062A\u062C\u0648"),
            React.createElement("button", { className: "btn g", onClick: () => { setQ(""); load("", 1); } }, "\u0647\u0645\u0647"),
            React.createElement("button", { className: "btn g", style: { background: "#fff0e6", color: "#c2410c" }, onClick: async () => { if (!confirm("Ø±Ø¯ÛŒÙâ€ŒÙ‡Ø§ÛŒ Ø®Ø§Ù„ÛŒ Ùˆ Ø®Ø±Ø§Ø¨ ÙÛŒØ´â€ŒÙ‡Ø§ Ø­Ø°Ù Ø´ÙˆÙ†Ø¯ØŸ"))
                    return; try {
                    const r = await SEND("POST", "/admin/bills-cleanup", {});
                    alert("\u2713 " + fa(r.deleted) + " \u0631\u062f\u06cc\u0641 \u062e\u0627\u0644\u06cc \u062d\u0630\u0641 \u0634\u062f.");
                    load(q, 1);
                }
                catch (e) {
                    alert(e.message || "\u062e\u0637\u0627");
                } } }, "\uD83E\uDDF9 \u067E\u0627\u06A9\u0633\u0627\u0632\u06CC \u0631\u062F\u06CC\u0641\u200C\u0647\u0627\u06CC \u062E\u0627\u0644\u06CC")),
        loading ? React.createElement("p", { className: "muted" }, "\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC\u2026") : b.length === 0 ? React.createElement("p", { className: "muted" }, "\u0646\u062A\u06CC\u062C\u0647\u200C\u0627\u06CC \u06CC\u0627\u0641\u062A \u0646\u0634\u062F.") : React.createElement(React.Fragment, null,
            React.createElement("p", { className: "muted", style: { marginBottom: 8 } },
                "\u0645\u062C\u0645\u0648\u0639 ",
                React.createElement("b", null, fa(data.total)),
                " \u0641\u06CC\u0634 \u00B7 \u0635\u0641\u062D\u0647\u0654 ",
                fa(data.page),
                " \u0627\u0632 ",
                fa(data.pages)),
            React.createElement(ResponsiveTable, null,
                React.createElement("thead", null,
                    React.createElement("tr", null,
                        React.createElement("th", null, "\u0634\u062E\u0635 / \u0631\u0627\u0646\u0646\u062F\u0647"),
                        React.createElement("th", null, "\u06A9\u062F \u0645\u0644\u06CC"),
                        React.createElement("th", null, "\u067E\u0644\u0627\u06A9"),
                        React.createElement("th", null, "\u062E\u0637"),
                        React.createElement("th", null, "\u0645\u0628\u0644\u063A (\u0631\u06CC\u0627\u0644)"),
                        React.createElement("th", null, "\u0648\u0636\u0639\u06CC\u062A"),
                        React.createElement("th", null, "\u062A\u0627\u0631\u06CC\u062E"),
                        React.createElement("th", null, "\u062F\u0644\u06CC\u0644"))),
                React.createElement("tbody", null, b.map(x => React.createElement("tr", { key: x.id },
                    React.createElement("td", null,
                        React.createElement("div", null, x.person_title),
                        x.driver_name && x.driver_name.trim() && React.createElement("div", { className: "muted", style: { fontSize: 11 } }, x.driver_name)),
                    React.createElement("td", { style: { direction: "ltr", textAlign: "right" } }, x.national_id),
                    React.createElement("td", null, x.plate),
                    React.createElement("td", { style: { fontSize: 11 } }, x.line_text || "\u2014"),
                    React.createElement("td", null, fa(x.amount)),
                    React.createElement("td", null,
                        React.createElement("span", { className: "badge " + (x.status === "Ù¾Ø±Ø¯Ø§Ø®Øª Ø´Ø¯Ù‡" ? "b-ok" : "b-no") }, x.status)),
                    React.createElement("td", { style: { fontSize: 11 } }, x.pay_date || "\u2014"),
                    React.createElement("td", { style: { fontSize: 11 } }, x.reason || "\u2014"))))),
            React.createElement("div", { className: "row", style: { gap: 8, justifyContent: "center", alignItems: "center", marginTop: 12, flexWrap: "wrap" } },
                React.createElement("button", { className: "btn g", disabled: data.page <= 1, onClick: () => load(q, data.page - 1) }, "\u0642\u0628\u0644\u06CC"),
                React.createElement("span", null,
                    "\u0635\u0641\u062D\u0647\u0654 ",
                    fa(data.page),
                    " \u0627\u0632 ",
                    fa(data.pages),
                    " \u00B7 \u0645\u062C\u0645\u0648\u0639 ",
                    fa(data.total)),
                React.createElement("button", { className: "btn g", disabled: data.page >= data.pages, onClick: () => load(q, data.page + 1) }, "\u0628\u0639\u062F\u06CC")))));
}
function Config() {
    const [tab, setTab] = useState("define");
    const TABS = [["define", "ØªØ¹Ø±ÛŒÙ Ù…ÙˆØ¶ÙˆØ¹Ø§Øª Ùˆ Ú†Ú©â€ŒÙ„ÛŒØ³Øª"], ["reportsubjects", "Ù…ÙˆØ¶ÙˆØ¹Ø§Øª Ú¯Ø²Ø§Ø±Ø´â€ŒÙ‡Ø§"], ["notices", "ØªØ°Ú©Ø±Ø§Øª Ø¯Ø§Ø¯Ù‡â€ŒØ´Ø¯Ù‡"], ["checklists", "Ú†Ú©â€ŒÙ„ÛŒØ³Øªâ€ŒÙ‡Ø§ÛŒ Ø¯Ø§Ø¯Ù‡â€ŒØ´Ø¯Ù‡"]];
    return (React.createElement("div", { className: "admin-workspace-page" },
        React.createElement("div", { className: "tabbar", role: "tablist", "aria-label": "\u0628\u062E\u0634\u200C\u0647\u0627\u06CC \u062A\u0630\u06A9\u0631 \u0648 \u0686\u06A9\u200C\u0644\u06CC\u0633\u062A", style: { display: "flex", gap: 8, marginBottom: 14, borderBottom: "2px solid var(--line)", flexWrap: "wrap" } }, TABS.map(([k, lbl]) => React.createElement("button", { key: k, type: "button", role: "tab", "aria-selected": tab === k, onClick: () => setTab(k), style: { background: "none", border: "none", borderBottom: tab === k ? "3px solid var(--brand)" : "3px solid transparent", padding: "8px 14px", cursor: "pointer", fontWeight: tab === k ? 800 : 500, color: tab === k ? "var(--brand)" : "var(--muted)", fontFamily: "inherit", fontSize: 14 } }, lbl))),
        tab === "define" && React.createElement(ConfigDefine, null),
        tab === "reportsubjects" && React.createElement(ReportSubjectsAdmin, null),
        tab === "notices" && React.createElement(GivenNotices, null),
        tab === "checklists" && React.createElement(GivenChecklists, null)));
}
function ReportSubjectsAdmin() {
    const [rows, setRows] = useState([]);
    const [title, setTitle] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const load = () => { setLoading(true); return db.reportSubjects().then(r => { setRows(r); setError(""); }).catch(e => setError(e.message || "Ø¯Ø±ÛŒØ§ÙØª Ù…ÙˆØ¶ÙˆØ¹Ø§Øª Ú¯Ø²Ø§Ø±Ø´ Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯.")).finally(() => setLoading(false)); };
    useEffect(load, []);
    const add = async () => { const t = title.trim(); if (!t) {
        setError("Ø¹Ù†ÙˆØ§Ù† Ù…ÙˆØ¶ÙˆØ¹ Ø¬Ø¯ÛŒØ¯ Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯.");
        return;
    } setBusy(true); setError(""); try {
        await db.addReportSubject(t);
        setTitle("");
        await load();
    }
    catch (e) {
        setError(e.message || "Ø«Ø¨Øª Ù…ÙˆØ¶ÙˆØ¹ Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯.");
    }
    finally {
        setBusy(false);
    } };
    const del = async (id) => { if (!confirm("Ø§ÛŒÙ† Ù…ÙˆØ¶ÙˆØ¹ ØºÛŒØ±ÙØ¹Ø§Ù„ Ø´ÙˆØ¯ØŸ"))
        return; setBusy(true); setError(""); try {
        await db.delReportSubject(id);
        await load();
    }
    catch (e) {
        setError(e.message || "ØºÛŒØ±ÙØ¹Ø§Ù„â€ŒÚ©Ø±Ø¯Ù† Ù…ÙˆØ¶ÙˆØ¹ Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯.");
    }
    finally {
        setBusy(false);
    } };
    return React.createElement("div", { className: "panel report-subjects-page" },
        React.createElement("h3", null, "\u062A\u0639\u0631\u06CC\u0641 \u0645\u0648\u0636\u0648\u0639\u0627\u062A \u06AF\u0632\u0627\u0631\u0634\u200C\u0647\u0627"),
        React.createElement("p", { className: "muted" }, "\u0627\u06CC\u0646 \u0645\u0648\u0636\u0648\u0639\u0627\u062A \u062F\u0631 \u0641\u0631\u0645 \u0627\u0631\u0633\u0627\u0644 \u06AF\u0632\u0627\u0631\u0634 \u0646\u0631\u0645\u200C\u0627\u0641\u0632\u0627\u0631 \u0646\u0645\u0627\u06CC\u0634 \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F. \u06AF\u0632\u06CC\u0646\u0647 \u00AB\u0633\u0627\u06CC\u0631\u00BB \u0647\u0645\u06CC\u0634\u0647 \u0628\u0631\u0627\u06CC \u062F\u0631\u062C \u0645\u0648\u0636\u0648\u0639 \u062F\u0644\u062E\u0648\u0627\u0647 \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0627\u0633\u062A."),
        error && React.createElement("p", { role: "alert", className: "workspace-inline-error" }, error),
        React.createElement("form", { className: "row report-subjects-form", style: { gap: 8 }, onSubmit: e => { e.preventDefault(); add(); } },
            React.createElement("label", { className: "report-subjects-field" },
                "\u0639\u0646\u0648\u0627\u0646 \u0645\u0648\u0636\u0648\u0639 \u062C\u062F\u06CC\u062F",
                React.createElement("input", { className: "input", value: title, onChange: e => setTitle(e.target.value), placeholder: "\u0645\u062B\u0644\u0627\u064B \u062A\u062E\u0644\u0641 \u0631\u0627\u0646\u0646\u062F\u0647", maxLength: 190 })),
            React.createElement("button", { type: "submit", className: "btn p", disabled: busy }, busy ? "Ø¯Ø± Ø­Ø§Ù„ Ø«Ø¨Øªâ€¦" : "Ø§ÙØ²ÙˆØ¯Ù† Ù…ÙˆØ¶ÙˆØ¹")),
        React.createElement("div", { className: "chiprow report-subjects-list", style: { marginTop: 12 } }, rows.filter(x => Number(x.is_active) !== 0).map(r => React.createElement("span", { className: "chip", key: r.id },
            r.title,
            React.createElement("button", { type: "button", className: "report-subject-remove", "aria-label": `ØºÛŒØ±ÙØ¹Ø§Ù„ Ú©Ø±Ø¯Ù† Ù…ÙˆØ¶ÙˆØ¹ ${r.title}`, disabled: busy, onClick: () => del(r.id) }, "\u00D7")))),
        !loading && !rows.filter(x => Number(x.is_active) !== 0).length && React.createElement("p", { className: "muted" }, "\u0645\u0648\u0636\u0648\u0639\u06CC \u062A\u0639\u0631\u06CC\u0641 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A."),
        loading && React.createElement("p", { role: "status", className: "muted" }, "\u062F\u0631 \u062D\u0627\u0644 \u062F\u0631\u06CC\u0627\u0641\u062A \u0645\u0648\u0636\u0648\u0639\u0627\u062A\u2026"));
}
function GivenFilters({ f, setF, recorders, onApply, onClear }) {
    const roles = [...new Set(recorders.map(r => r.role_title).filter(Boolean))];
    const people = f.recorder_role ? recorders.filter(r => r.role_title === f.recorder_role) : recorders;
    return (React.createElement("div", { className: "filters", style: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12, alignItems: "center" } },
        React.createElement("select", { className: "input", style: { maxWidth: 150, padding: "6px 10px" }, value: f.recorder_role || "", onChange: e => setF({ ...f, recorder_role: e.target.value, recorder_id: "" }) },
            React.createElement("option", { value: "" }, "\u0647\u0645\u0647\u0654 \u0633\u0645\u062A\u200C\u0647\u0627"),
            roles.map(r => React.createElement("option", { key: r, value: r }, r))),
        React.createElement("select", { className: "input", style: { maxWidth: 160, padding: "6px 10px" }, value: f.recorder_id || "", onChange: e => setF({ ...f, recorder_id: e.target.value }) },
            React.createElement("option", { value: "" }, "\u0647\u0645\u0647\u0654 \u0627\u0641\u0631\u0627\u062F"),
            people.map(p => React.createElement("option", { key: p.id, value: p.id }, p.name))),
        React.createElement("input", { className: "input", style: { maxWidth: 130, padding: "6px 10px" }, placeholder: "\u06A9\u062F \u0645\u0644\u06CC \u0631\u0627\u0646\u0646\u062F\u0647", value: f.national_id || "", onChange: e => setF({ ...f, national_id: e.target.value }) }),
        React.createElement("input", { className: "input", style: { maxWidth: 110, padding: "6px 10px" }, placeholder: "\u062E\u0637", value: f.line || "", onChange: e => setF({ ...f, line: e.target.value }) }),
        React.createElement("span", { className: "label" }, "\u0627\u0632"),
        React.createElement(JDate, { value: f.from || "", onChange: v => setF({ ...f, from: v }) }),
        React.createElement("span", { className: "label" }, "\u062A\u0627"),
        React.createElement(JDate, { value: f.to || "", onChange: v => setF({ ...f, to: v }) }),
        React.createElement("button", { className: "btn p", onClick: onApply }, "\u0641\u06CC\u0644\u062A\u0631"),
        React.createElement("button", { className: "btn g", onClick: onClear }, "\u067E\u0627\u06A9 \u06A9\u0631\u062F\u0646")));
}
function GivenNotices() {
    const [rows, setRows] = useState([]);
    const [recorders, setRecorders] = useState([]);
    const [f, setF] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const requestSeq = useRef(0);
    const qs = filters => { const p = []; ["recorder_role", "recorder_id", "national_id", "line", "from", "to"].forEach(k => { if (filters[k])
        p.push(k + "=" + encodeURIComponent(filters[k])); }); return p.length ? ("?" + p.join("&")) : ""; };
    const load = (filters = f) => { const seq = ++requestSeq.current; setLoading(true); setError(""); GET("/admin/given-notices" + qs(filters)).then(data => { if (seq === requestSeq.current)
        setRows(data); }).catch(e => { if (seq === requestSeq.current)
        setError(e.message || "Ø¯Ø±ÛŒØ§ÙØª ØªØ°Ú©Ø±Ø§Øª Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯."); }).finally(() => { if (seq === requestSeq.current)
        setLoading(false); }); };
    useEffect(() => { load(); GET("/admin/recorders").then(setRecorders).catch(() => { }); }, []);
    const PR = { low: "Ú©Ù…", medium: "Ù…ØªÙˆØ³Ø·", high: "Ø²ÛŒØ§Ø¯" };
    const exportExcel = () => {
        const aoa = [["ØªØ§Ø±ÛŒØ®", "Ø±Ø§Ù†Ù†Ø¯Ù‡", "Ú©Ø¯ Ù…Ù„ÛŒ", "Ø®Ø·", "Ù…ÙˆØ¶ÙˆØ¹", "Ø§ÙˆÙ„ÙˆÛŒØª", "Ù…ØªÙ†", "Ø«Ø¨Øªâ€ŒÚ©Ù†Ù†Ø¯Ù‡", "Ø³Ù…Øª Ø«Ø¨Øªâ€ŒÚ©Ù†Ù†Ø¯Ù‡"],
            ...rows.map(r => [fj(r.created_at), r.driver_name || "", r.national_id || "", r.line || "", r.reason || "", PR[r.priority] || r.priority, r.body || "", r.recorder_name || "", r.recorder_role || ""])];
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "ØªØ°Ú©Ø±Ø§Øª");
        XLSX.writeFile(wb, "ØªØ°Ú©Ø±Ø§Øª_Ø¯Ø§Ø¯Ù‡_Ø´Ø¯Ù‡.xlsx");
    };
    return (React.createElement("div", { className: "panel" },
        React.createElement("h3", null, "\u062A\u0630\u06A9\u0631\u0627\u062A \u062F\u0627\u062F\u0647\u200C\u0634\u062F\u0647"),
        React.createElement(GivenFilters, { f: f, setF: setF, recorders: recorders, onApply: () => load(f), onClear: () => { setF({}); load({}); } }),
        error && React.createElement("p", { role: "alert", className: "workspace-inline-error" },
            error,
            " ",
            React.createElement("button", { type: "button", className: "btn g", onClick: () => load(f) }, "\u062A\u0644\u0627\u0634 \u0645\u062C\u062F\u062F")),
        React.createElement("div", { className: "row", style: { justifyContent: "space-between", marginBottom: 8 } },
            React.createElement("span", { className: "muted", style: { fontSize: 12 } }, loading ? "Ø¯Ø± Ø­Ø§Ù„ Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒâ€¦" : fa(rows.length) + " ØªØ°Ú©Ø±"),
            React.createElement("button", { className: "btn g", onClick: exportExcel, disabled: !rows.length }, "\u2913 \u062E\u0631\u0648\u062C\u06CC \u0627\u06A9\u0633\u0644")),
        React.createElement("div", { style: { overflowX: "auto" } },
            React.createElement("table", { style: { fontSize: 12, minWidth: 820 } },
                React.createElement("thead", null,
                    React.createElement("tr", null,
                        React.createElement("th", null, "\u062A\u0627\u0631\u06CC\u062E"),
                        React.createElement("th", null, "\u0631\u0627\u0646\u0646\u062F\u0647"),
                        React.createElement("th", null, "\u06A9\u062F \u0645\u0644\u06CC"),
                        React.createElement("th", null, "\u062E\u0637"),
                        React.createElement("th", null, "\u0645\u0648\u0636\u0648\u0639"),
                        React.createElement("th", null, "\u0627\u0648\u0644\u0648\u06CC\u062A"),
                        React.createElement("th", null, "\u0645\u062A\u0646"),
                        React.createElement("th", null, "\u062B\u0628\u062A\u200C\u06A9\u0646\u0646\u062F\u0647"),
                        React.createElement("th", null, "\u0633\u0645\u062A"))),
                React.createElement("tbody", null,
                    rows.map(r => React.createElement("tr", { key: r.id },
                        React.createElement("td", null, fj(r.created_at)),
                        React.createElement("td", null, r.driver_name || "â€”"),
                        React.createElement("td", null, r.national_id || "â€”"),
                        React.createElement("td", null, r.line || "â€”"),
                        React.createElement("td", null, r.reason || "â€”"),
                        React.createElement("td", null, PR[r.priority] || r.priority),
                        React.createElement("td", { style: { maxWidth: 200, fontSize: 11 } },
                            r.body || "â€”",
                            r.has_attachment ? " ğŸ“" : ""),
                        React.createElement("td", null, r.recorder_name || "â€”"),
                        React.createElement("td", { style: { fontSize: 11 } }, r.recorder_role || "â€”"))),
                    !rows.length && !loading && React.createElement("tr", null,
                        React.createElement("td", { colSpan: "9", className: "muted", style: { textAlign: "center" } }, "\u062A\u0630\u06A9\u0631\u06CC \u06CC\u0627\u0641\u062A \u0646\u0634\u062F")))))));
}
function GivenChecklists() {
    const [rows, setRows] = useState([]);
    const [recorders, setRecorders] = useState([]);
    const [f, setF] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const requestSeq = useRef(0);
    const qs = filters => { const p = []; ["recorder_role", "recorder_id", "national_id", "line", "from", "to"].forEach(k => { if (filters[k])
        p.push(k + "=" + encodeURIComponent(filters[k])); }); return p.length ? ("?" + p.join("&")) : ""; };
    const load = (filters = f) => { const seq = ++requestSeq.current; setLoading(true); setError(""); GET("/admin/given-checklists" + qs(filters)).then(data => { if (seq === requestSeq.current)
        setRows(data); }).catch(e => { if (seq === requestSeq.current)
        setError(e.message || "Ø¯Ø±ÛŒØ§ÙØª Ú†Ú©â€ŒÙ„ÛŒØ³Øªâ€ŒÙ‡Ø§ Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯."); }).finally(() => { if (seq === requestSeq.current)
        setLoading(false); }); };
    useEffect(() => { load(); GET("/admin/recorders").then(setRecorders).catch(() => { }); }, []);
    const exportExcel = () => {
        const aoa = [["ØªØ§Ø±ÛŒØ®", "Ø±Ø§Ù†Ù†Ø¯Ù‡", "Ú©Ø¯ Ù…Ù„ÛŒ", "Ø®Ø·", "Ú†Ú©â€ŒÙ„ÛŒØ³Øª", "Ù¾Ø§Ø³Ø®â€ŒÙ‡Ø§", "Ø«Ø¨Øªâ€ŒÚ©Ù†Ù†Ø¯Ù‡", "Ø³Ù…Øª Ø«Ø¨Øªâ€ŒÚ©Ù†Ù†Ø¯Ù‡"],
            ...rows.map(r => [fj(r.created_at), r.driver_name || "", r.national_id || "", r.line || "", r.template_title || "", (r.answers_pretty || []).map(a => a.label + ": " + a.value).join(" | "), r.recorder_name || "", r.recorder_role || ""])];
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Ú†Ú©â€ŒÙ„ÛŒØ³Øªâ€ŒÙ‡Ø§");
        XLSX.writeFile(wb, "Ú†Ú©_Ù„ÛŒØ³Øª_Ù‡Ø§ÛŒ_Ø¯Ø§Ø¯Ù‡_Ø´Ø¯Ù‡.xlsx");
    };
    return (React.createElement("div", { className: "panel" },
        React.createElement("h3", null, "\u0686\u06A9\u200C\u0644\u06CC\u0633\u062A\u200C\u0647\u0627\u06CC \u062F\u0627\u062F\u0647\u200C\u0634\u062F\u0647"),
        React.createElement(GivenFilters, { f: f, setF: setF, recorders: recorders, onApply: () => load(f), onClear: () => { setF({}); load({}); } }),
        error && React.createElement("p", { role: "alert", className: "workspace-inline-error" },
            error,
            " ",
            React.createElement("button", { type: "button", className: "btn g", onClick: () => load(f) }, "\u062A\u0644\u0627\u0634 \u0645\u062C\u062F\u062F")),
        React.createElement("div", { className: "row", style: { justifyContent: "space-between", marginBottom: 8 } },
            React.createElement("span", { className: "muted", style: { fontSize: 12 } }, loading ? "Ø¯Ø± Ø­Ø§Ù„ Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒâ€¦" : fa(rows.length) + " Ú†Ú©â€ŒÙ„ÛŒØ³Øª"),
            React.createElement("button", { className: "btn g", onClick: exportExcel, disabled: !rows.length }, "\u2913 \u062E\u0631\u0648\u062C\u06CC \u0627\u06A9\u0633\u0644")),
        React.createElement("div", { style: { overflowX: "auto" } },
            React.createElement("table", { style: { fontSize: 12, minWidth: 820 } },
                React.createElement("thead", null,
                    React.createElement("tr", null,
                        React.createElement("th", null, "\u062A\u0627\u0631\u06CC\u062E"),
                        React.createElement("th", null, "\u0631\u0627\u0646\u0646\u062F\u0647"),
                        React.createElement("th", null, "\u06A9\u062F \u0645\u0644\u06CC"),
                        React.createElement("th", null, "\u062E\u0637"),
                        React.createElement("th", null, "\u0686\u06A9\u200C\u0644\u06CC\u0633\u062A"),
                        React.createElement("th", null, "\u067E\u0627\u0633\u062E\u200C\u0647\u0627"),
                        React.createElement("th", null, "\u062B\u0628\u062A\u200C\u06A9\u0646\u0646\u062F\u0647"),
                        React.createElement("th", null, "\u0633\u0645\u062A"))),
                React.createElement("tbody", null,
                    rows.map(r => React.createElement("tr", { key: r.id },
                        React.createElement("td", null, fj(r.created_at)),
                        React.createElement("td", null, r.driver_name || "â€”"),
                        React.createElement("td", null, r.national_id || "â€”"),
                        React.createElement("td", null, r.line || "â€”"),
                        React.createElement("td", null, r.template_title || "â€”"),
                        React.createElement("td", { style: { maxWidth: 260, fontSize: 11 } }, (r.answers_pretty || []).map((a, i) => React.createElement("div", { key: i },
                            React.createElement("b", null,
                                a.label,
                                ":"),
                            " ",
                            a.value))),
                        React.createElement("td", null, r.recorder_name || "â€”"),
                        React.createElement("td", { style: { fontSize: 11 } }, r.recorder_role || "â€”"))),
                    !rows.length && !loading && React.createElement("tr", null,
                        React.createElement("td", { colSpan: "9", className: "muted", style: { textAlign: "center" } }, "\u0686\u06A9\u200C\u0644\u06CC\u0633\u062A\u06CC \u06CC\u0627\u0641\u062A \u0646\u0634\u062F")))))));
}
function ConfigDefine() {
    const [reasons, setReasons] = useState([]);
    const [items, setItems] = useState([]);
    const [nr, setNr] = useState("");
    const [ni, setNi] = useState("");
    useEffect(() => { db.noticeReasons().then(setReasons).catch(() => { }); db.checklist().then(c => setItems(((c === null || c === void 0 ? void 0 : c.items) || []).map(i => ({ ...i, optStr: (i.options || []).join("ØŒ "), answer_type: i.answer_type || "single" })))).catch(() => { }); }, []);
    const addR = async () => { if (!nr)
        return; const r = await db.addReason(nr); setReasons([...reasons, r]); setNr(""); };
    const delR = async (id) => { await db.delReason(id); setReasons(reasons.filter(r => r.id !== id)); };
    const saveCl = async () => {
        const payload = items.map(i => ({ label: String(i.label || "").trim(), answer_type: i.answer_type || "single", options: (i.optStr || "").split(/[ØŒ,]/).map(s => s.trim()).filter(Boolean) })).filter(i => i.label);
        if (!payload.length) {
            alert("Ø­Ø¯Ø§Ù‚Ù„ ÛŒÚ© Ø¢ÛŒØªÙ… Ú†Ú©â€ŒÙ„ÛŒØ³Øª ØªØ¹Ø±ÛŒÙ Ú©Ù†ÛŒØ¯.");
            return;
        }
        try {
            await db.saveChecklist("Ú†Ú©â€ŒÙ„ÛŒØ³Øª Ø¨Ø§Ø²Ø¯ÛŒØ¯ Ø®ÙˆØ¯Ø±Ùˆ", payload);
            alert("Ú†Ú©â€ŒÙ„ÛŒØ³Øª Ø°Ø®ÛŒØ±Ù‡ Ø´Ø¯.");
        }
        catch (e) {
            alert(e.message || "Ø°Ø®ÛŒØ±Ù‡ Ú†Ú©â€ŒÙ„ÛŒØ³Øª Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯.");
        }
    };
    return (React.createElement("div", { className: "grid2" },
        React.createElement("div", { className: "panel" },
            React.createElement("h3", null, "\u0645\u0648\u0636\u0648\u0639\u0627\u062A \u062A\u0630\u06A9\u0631"),
            React.createElement("div", { className: "row" },
                React.createElement("input", { className: "input", value: nr, onChange: e => setNr(e.target.value), placeholder: "\u0645\u0648\u0636\u0648\u0639 \u062C\u062F\u06CC\u062F\u2026" }),
                React.createElement("button", { className: "btn p", onClick: addR }, "\u0627\u0641\u0632\u0648\u062F\u0646")),
            React.createElement("div", { className: "chiprow" }, reasons.map(r => React.createElement("span", { className: "chip", key: r.id },
                r.title,
                React.createElement("b", { onClick: () => delR(r.id) }, "\u2715"))))),
        React.createElement("div", { className: "panel" },
            React.createElement("h3", null, "\u0622\u06CC\u062A\u0645\u200C\u0647\u0627\u06CC \u0686\u06A9\u200C\u0644\u06CC\u0633\u062A \u062E\u0648\u062F\u0631\u0648"),
            React.createElement("p", { className: "muted", style: { marginBottom: 8 } }, "\u0628\u0631\u0627\u06CC \u0647\u0631 \u0622\u06CC\u062A\u0645 \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u06CC\u062F \u067E\u0627\u0633\u062E\u200C\u0647\u0627\u06CC \u062F\u0644\u062E\u0648\u0627\u0647 \u062A\u0639\u0631\u06CC\u0641 \u06A9\u0646\u06CC\u062F (\u0628\u0627 \u06A9\u0627\u0645\u0627 \u062C\u062F\u0627 \u06A9\u0646\u06CC\u062F). \u0627\u06AF\u0631 \u062E\u0627\u0644\u06CC \u0628\u0645\u0627\u0646\u062F\u060C \u067E\u06CC\u0634\u200C\u0641\u0631\u0636 \u00AB\u0633\u0627\u0644\u0645/\u0627\u06CC\u0631\u0627\u062F/\u0646\u062F\u0627\u0631\u062F\u00BB \u0627\u0633\u062A."),
            React.createElement("div", { className: "row" },
                React.createElement("input", { className: "input", value: ni, onChange: e => setNi(e.target.value), placeholder: "\u0639\u0646\u0648\u0627\u0646 \u0622\u06CC\u062A\u0645 \u062C\u062F\u06CC\u062F\u2026" }),
                React.createElement("button", { className: "btn p", onClick: () => { if (ni) {
                        setItems([...items, { id: Date.now(), label: ni, optStr: "" }]);
                        setNi("");
                    } } }, "\u0627\u0641\u0632\u0648\u062F\u0646")),
            React.createElement("div", { style: { marginTop: 10 } }, items.map((it, i) => React.createElement("div", { key: i, className: "card-p", style: { display: "block" } },
                React.createElement("div", { className: "between" },
                    React.createElement("b", null, it.label),
                    React.createElement("b", { style: { cursor: "pointer", color: "var(--danger)" }, onClick: () => setItems(items.filter((_, j) => j !== i)) }, "\u2715")),
                React.createElement("div", { className: "row", style: { gap: 8, marginTop: 6, flexWrap: "wrap" } },
                    React.createElement("select", { className: "input", style: { maxWidth: 170, fontSize: 12 }, value: it.answer_type || "single", onChange: e => setItems(items.map((x, j) => j === i ? { ...x, answer_type: e.target.value } : x)) },
                        React.createElement("option", { value: "single" }, "\u062A\u06A9\u200C\u06AF\u0632\u06CC\u0646\u0647\u200C\u0627\u06CC"),
                        React.createElement("option", { value: "multi" }, "\u0686\u0646\u062F\u06AF\u0632\u06CC\u0646\u0647\u200C\u0627\u06CC"),
                        React.createElement("option", { value: "text" }, "\u067E\u0627\u0633\u062E \u0645\u062A\u0646\u06CC")),
                    it.answer_type !== "text" && React.createElement("input", { className: "input", style: { flex: 1, minWidth: 160, fontSize: 12 }, placeholder: "\u06AF\u0632\u06CC\u0646\u0647\u200C\u0647\u0627 \u0628\u0627 \u06A9\u0627\u0645\u0627: \u0639\u0627\u0644\u06CC\u060C \u062E\u0648\u0628\u060C \u0636\u0639\u06CC\u0641", value: it.optStr, onChange: e => setItems(items.map((x, j) => j === i ? { ...x, optStr: e.target.value } : x)) }))))),
            React.createElement("button", { className: "btn p", style: { marginTop: 12 }, onClick: saveCl }, "\u0630\u062E\u06CC\u0631\u0647\u0654 \u0686\u06A9\u200C\u0644\u06CC\u0633\u062A"))));
}
function FormBuilder() {
    const DRIVER_ATTRS = [["", "â€”"], ["first_name", "Ù†Ø§Ù…"], ["last_name", "Ù†Ø§Ù… Ø®Ø§Ù†ÙˆØ§Ø¯Ú¯ÛŒ"], ["father_name", "Ù†Ø§Ù… Ù¾Ø¯Ø±"], ["national_id", "Ú©Ø¯ Ù…Ù„ÛŒ"], ["mobile", "Ù…ÙˆØ¨Ø§ÛŒÙ„"], ["gender", "Ø¬Ù†Ø³ÛŒØª"], ["birth_date", "ØªØ§Ø±ÛŒØ® ØªÙˆÙ„Ø¯"], ["address", "Ø¢Ø¯Ø±Ø³"], ["smart_no", "Ø´Ù…Ø§Ø±Ù‡ Ù‡ÙˆØ´Ù…Ù†Ø¯"], ["operating_code", "Ú©Ø¯ Ø¨Ù‡Ø±Ù‡â€ŒØ¨Ø±Ø¯Ø§Ø±ÛŒ"], ["op_lic_status", "ÙˆØ¶Ø¹ÛŒØª Ù¾Ø±ÙˆØ§Ù†Ù‡ Ø¨Ù‡Ø±Ù‡â€ŒØ¨Ø±Ø¯Ø§Ø±ÛŒ"], ["op_lic_issue", "ØµØ¯ÙˆØ± Ø¨Ù‡Ø±Ù‡â€ŒØ¨Ø±Ø¯Ø§Ø±ÛŒ"], ["op_lic_expire", "Ø§Ù†Ù‚Ø¶Ø§ÛŒ Ø¨Ù‡Ø±Ù‡â€ŒØ¨Ø±Ø¯Ø§Ø±ÛŒ"], ["taxi_lic_status", "ÙˆØ¶Ø¹ÛŒØª Ù¾Ø±ÙˆØ§Ù†Ù‡ ØªØ§Ú©Ø³ÛŒØ±Ø§Ù†ÛŒ"], ["taxi_lic_issue", "ØµØ¯ÙˆØ± ØªØ§Ú©Ø³ÛŒØ±Ø§Ù†ÛŒ"], ["taxi_lic_expire", "Ø§Ù†Ù‚Ø¶Ø§ÛŒ ØªØ§Ú©Ø³ÛŒØ±Ø§Ù†ÛŒ"], ["driver_type", "Ù†ÙˆØ¹ Ø±Ø§Ù†Ù†Ø¯Ù‡"], ["plate", "Ù¾Ù„Ø§Ú© Ø®ÙˆØ¯Ø±Ùˆ"], ["model_name", "Ù…Ø¯Ù„ Ø®ÙˆØ¯Ø±Ùˆ"], ["model_year", "Ø³Ø§Ù„ Ø®ÙˆØ¯Ø±Ùˆ"], ["line_code", "Ú©Ø¯ Ø®Ø·"], ["insurance_expire", "Ø§Ù†Ù‚Ø¶Ø§ÛŒ Ø¨ÛŒÙ…Ù‡"], ["tech_inspection_expire", "Ø§Ù†Ù‚Ø¶Ø§ÛŒ Ù…Ø¹Ø§ÛŒÙ†Ù‡ ÙÙ†ÛŒ"]];
    const TYPES = [["text", "Ù…ØªÙ†"], ["number", "Ø¹Ø¯Ø¯"], ["textarea", "Ù…ØªÙ† Ø¨Ù„Ù†Ø¯"], ["select", "Ù„ÛŒØ³Øª Ú©Ø´ÙˆÛŒÛŒ"], ["combobox", "Ú©Ù…Ø¨ÙˆØ¨Ø§Ú©Ø³"], ["checkbox", "Ø¨Ù„Ù‡/Ø®ÛŒØ±"], ["signature", "Ø§Ù…Ø¶Ø§"], ["national_id", "Ú©Ø¯ Ù…Ù„ÛŒ (ÙØ±Ø§Ø®ÙˆØ§Ù† Ø±Ø§Ù†Ù†Ø¯Ù‡)"], ["date", "ØªØ§Ø±ÛŒØ® (ØªÙ‚ÙˆÛŒÙ… Ø´Ù…Ø³ÛŒ)"], ["file", "Ù¾ÛŒÙˆØ³Øª ÙØ§ÛŒÙ„"], ["sheba", "Ø´Ù…Ø§Ø±Ù‡Ù” Ø´Ø¨Ø§"]];
    const [fields, setFields] = useState([{ key: "nid", label: "Ú©Ø¯ Ù…Ù„ÛŒ Ø±Ø§Ù†Ù†Ø¯Ù‡", type: "national_id", options: [], required: true, prefill: "", showIfKey: "", showIfVal: "" }]);
    const [title, setTitle] = useState("ÙØ±Ù… Ø¨Ø§Ø²Ø¯ÛŒØ¯ Ù…ÛŒØ¯Ø§Ù†ÛŒ");
    const [editId, setEditId] = useState(null);
    const [isPublic, setIsPublic] = useState(false);
    const [publicSlug, setPublicSlug] = useState(null);
    const [list, setList] = useState([]);
    const [subsFor, setSubsFor] = useState(null);
    const loadList = () => db.formsAll().then(r => setList(r || [])).catch(() => { });
    useEffect(() => { loadList(); }, []);
    const add = () => setFields([...fields, { key: "f" + Date.now(), label: "ÙÛŒÙ„Ø¯ Ø¬Ø¯ÛŒØ¯", type: "text", options: [], required: false, prefill: "", showIfKey: "", showIfVal: "", allowedTypes: "", maxSizeKB: 2048 }]);
    const upd = (i, k, val) => setFields(fields.map((f, j) => j === i ? { ...f, [k]: val } : f));
    const resetForm = () => { setEditId(null); setTitle("ÙØ±Ù… Ø¬Ø¯ÛŒØ¯"); setIsPublic(false); setPublicSlug(null); setFields([{ key: "nid", label: "Ú©Ø¯ Ù…Ù„ÛŒ Ø±Ø§Ù†Ù†Ø¯Ù‡", type: "national_id", options: [], required: true, prefill: "", showIfKey: "", showIfVal: "" }]); };
    const editForm = (f) => { setEditId(f.id); setTitle(f.title); setIsPublic(!!f.public_enabled); setPublicSlug(f.public_slug || null); setFields(Array.isArray(f.schema) && f.schema.length ? f.schema : []); window.scrollTo(0, 0); };
    const delForm = async (f) => { if (!confirm("Ø­Ø°Ù ÙØ±Ù… Â«" + f.title + "Â» Ùˆ Ù‡Ù…Ù‡Ù” Ù¾Ø§Ø³Ø®â€ŒÙ‡Ø§ÛŒ Ø¢Ù†ØŸ"))
        return; try {
        await db.delForm(f.id);
        loadList();
        if (editId === f.id)
            resetForm();
    }
    catch (e) {
        alert(e.message);
    } };
    const exportForm = async (f) => { try {
        const res = await fetch(db.formExportUrl(f.id), { headers: tok() });
        if (!res.ok)
            throw new Error("Ø®Ø·Ø§");
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "ÙØ±Ù…_" + f.title + ".csv";
        a.click();
    }
    catch (e) {
        alert(e.message);
    } };
    const viewSubs = async (f) => { try {
        const d = await db.formSubs(f.id);
        setSubsFor(d);
    }
    catch (e) {
        alert(e.message);
    } };
    const publicUrl = (slug) => slug ? (location.origin + "/f/" + slug) : "";
    const copyLink = (slug) => { var _a; (_a = navigator.clipboard) === null || _a === void 0 ? void 0 : _a.writeText(publicUrl(slug)); alert("Ù„ÛŒÙ†Ú© ÙØ±Ù… Ú©Ù¾ÛŒ Ø´Ø¯:\n" + publicUrl(slug)); };
    const save = async () => { try {
        if (editId) {
            const r = await db.updForm(editId, { title, schema: fields, public_enabled: isPublic });
            if (r === null || r === void 0 ? void 0 : r.public_slug)
                setPublicSlug(r.public_slug);
            alert("ÙØ±Ù… ÙˆÛŒØ±Ø§ÛŒØ´ Ø´Ø¯.");
        }
        else {
            const r = await SEND('POST', '/admin/forms', { title, schema: fields, public_enabled: isPublic });
            if (r === null || r === void 0 ? void 0 : r.public_slug)
                setPublicSlug(r.public_slug);
            alert("ÙØ±Ù… Ø°Ø®ÛŒØ±Ù‡ Ø´Ø¯.");
        }
        loadList();
    }
    catch (e) {
        alert(e.message);
    } };
    return (React.createElement("div", { className: "panel admin-workspace-page" },
        React.createElement("h3", null,
            "\u0641\u0631\u0645\u200C\u0633\u0627\u0632 \u062D\u0631\u0641\u0647\u200C\u0627\u06CC ",
            editId ? React.createElement("span", { style: { fontSize: 13, color: "var(--brand)" } },
                "(\u0648\u06CC\u0631\u0627\u06CC\u0634 \u0641\u0631\u0645 #",
                fa(editId),
                ")") : "",
            " ",
            React.createElement("button", { className: "btn p", onClick: add }, "+ \u0627\u0641\u0632\u0648\u062F\u0646 \u0641\u06CC\u0644\u062F"),
            " ",
            editId && React.createElement("button", { className: "btn g", onClick: resetForm }, "\u0641\u0631\u0645 \u062C\u062F\u06CC\u062F")),
        React.createElement("label", { className: "label" }, "\u0639\u0646\u0648\u0627\u0646 \u0641\u0631\u0645"),
        React.createElement("input", { className: "input", value: title, onChange: e => setTitle(e.target.value), style: { marginBottom: 14 } }),
        fields.map((f, i) => {
            var _a;
            return React.createElement("div", { key: i, className: "card-p", style: { display: "block" } },
                React.createElement("div", { className: "row", style: { gap: 8, flexWrap: "wrap" } },
                    React.createElement("input", { className: "input", style: { maxWidth: 200 }, value: f.label, onChange: e => upd(i, "label", e.target.value), placeholder: "\u0639\u0646\u0648\u0627\u0646 \u0641\u06CC\u0644\u062F" }),
                    React.createElement("select", { className: "input", style: { maxWidth: 190 }, value: f.type, onChange: e => upd(i, "type", e.target.value) }, TYPES.map(([v, tt]) => React.createElement("option", { key: v, value: v }, tt))),
                    React.createElement("label", { className: "row", style: { gap: 4, fontSize: 12 } },
                        React.createElement("input", { type: "checkbox", checked: f.required, onChange: e => upd(i, "required", e.target.checked) }),
                        "\u0627\u062C\u0628\u0627\u0631\u06CC"),
                    React.createElement("button", { className: "btn g", onClick: () => setFields(fields.filter((_, j) => j !== i)) }, "\u062D\u0630\u0641")),
                (f.type === "select" || f.type === "combobox") && React.createElement("input", { className: "input", style: { marginTop: 6, fontSize: 12 }, placeholder: "\u06AF\u0632\u06CC\u0646\u0647\u200C\u0647\u0627 \u0628\u0627 \u06A9\u0627\u0645\u0627: \u062A\u0627\u06CC\u06CC\u062F\u060C \u0631\u062F", value: (f.options || []).join("ØŒ "), onChange: e => upd(i, "options", e.target.value.split(/[ØŒ,]/).map(s => s.trim()).filter(Boolean)) }),
                f.type === "file" && React.createElement("div", { className: "row", style: { gap: 8, marginTop: 6, flexWrap: "wrap" } },
                    React.createElement("span", { style: { fontSize: 12, color: "var(--muted)" } }, "\u0646\u0648\u0639\u200C\u0647\u0627\u06CC \u0645\u062C\u0627\u0632 (\u0645\u062B\u0627\u0644: image/jpeg,image/png,application/pdf):"),
                    React.createElement("input", { className: "input", style: { maxWidth: 280, fontSize: 12 }, placeholder: "\u062E\u0627\u0644\u06CC = \u0647\u0631 \u0646\u0648\u0639\u06CC \u0645\u062C\u0627\u0632", value: f.allowedTypes || "", onChange: e => upd(i, "allowedTypes", e.target.value) }),
                    React.createElement("span", { style: { fontSize: 12, color: "var(--muted)" } }, "\u062D\u062F\u0627\u06A9\u062B\u0631 \u062D\u062C\u0645 (\u06A9\u06CC\u0644\u0648\u0628\u0627\u06CC\u062A):"),
                    React.createElement("input", { className: "input", type: "number", style: { maxWidth: 100, fontSize: 12 }, value: (_a = f.maxSizeKB) !== null && _a !== void 0 ? _a : 2048, onChange: e => upd(i, "maxSizeKB", Number(e.target.value) || 2048) })),
                f.type !== "national_id" && f.type !== "signature" && React.createElement("div", { className: "row", style: { gap: 8, marginTop: 6, flexWrap: "wrap" } },
                    React.createElement("span", { style: { fontSize: 12, color: "var(--muted)" } }, "\u0641\u0631\u0627\u062E\u0648\u0627\u0646 \u062E\u0648\u062F\u06A9\u0627\u0631 \u0627\u0632 \u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0631\u0627\u0646\u0646\u062F\u0647:"),
                    React.createElement("select", { className: "input", style: { maxWidth: 200, fontSize: 12 }, value: f.prefill || "", onChange: e => upd(i, "prefill", e.target.value) }, DRIVER_ATTRS.map(([v, tt]) => React.createElement("option", { key: v, value: v }, tt)))),
                React.createElement("div", { className: "row", style: { gap: 8, marginTop: 6, flexWrap: "wrap" } },
                    React.createElement("span", { style: { fontSize: 12, color: "var(--muted)" } }, "\u0646\u0645\u0627\u06CC\u0634 \u0645\u0634\u0631\u0648\u0637: \u0627\u06AF\u0631 \u0641\u06CC\u0644\u062F"),
                    React.createElement("select", { className: "input", style: { maxWidth: 150, fontSize: 12 }, value: f.showIfKey || "", onChange: e => upd(i, "showIfKey", e.target.value) },
                        React.createElement("option", { value: "" }, "(\u0647\u0645\u06CC\u0634\u0647 \u0646\u0645\u0627\u06CC\u0634)"),
                        fields.filter(x => x.key !== f.key).map(x => React.createElement("option", { key: x.key, value: x.key }, x.label))),
                    React.createElement("span", { style: { fontSize: 12 } }, "="),
                    React.createElement("input", { className: "input", style: { maxWidth: 110, fontSize: 12 }, value: f.showIfVal || "", onChange: e => upd(i, "showIfVal", e.target.value), placeholder: "\u0645\u0642\u062F\u0627\u0631" })));
        }),
        React.createElement("button", { className: "btn p", style: { marginTop: 10 }, onClick: save }, editId ? "Ø°Ø®ÛŒØ±Ù‡Ù” ÙˆÛŒØ±Ø§ÛŒØ´" : "Ø°Ø®ÛŒØ±Ù‡ ÙØ±Ù…"),
        React.createElement("div", { className: "card-p", style: { marginTop: 14 } },
            React.createElement("label", { className: "row", style: { gap: 8, alignItems: "center", cursor: "pointer" } },
                React.createElement("input", { type: "checkbox", checked: isPublic, onChange: e => setIsPublic(e.target.checked) }),
                React.createElement("b", null, "\u0627\u06CC\u0646 \u0641\u0631\u0645 \u0639\u0645\u0648\u0645\u06CC \u0648 \u0642\u0627\u0628\u0644 \u0627\u0634\u062A\u0631\u0627\u06A9\u200C\u06AF\u0630\u0627\u0631\u06CC \u0628\u0627\u0634\u062F")),
            React.createElement("p", { style: { fontSize: 12, color: "var(--muted)", marginTop: 6 } }, "\u0628\u0627 \u0641\u0639\u0627\u0644\u200C\u0628\u0648\u062F\u0646 \u0627\u06CC\u0646 \u06AF\u0632\u06CC\u0646\u0647\u060C \u0647\u0631 \u0641\u0631\u062F\u06CC (\u062D\u062A\u06CC \u0628\u062F\u0648\u0646 \u0648\u0631\u0648\u062F \u0628\u0647 \u0633\u0627\u0645\u0627\u0646\u0647) \u0628\u0627 \u0628\u0627\u0632 \u06A9\u0631\u062F\u0646 \u0644\u06CC\u0646\u06A9 \u0627\u062E\u062A\u0635\u0627\u0635\u06CC \u0632\u06CC\u0631 \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u062F \u0627\u06CC\u0646 \u0641\u0631\u0645 \u0631\u0627 \u0645\u0634\u0627\u0647\u062F\u0647 \u0648 \u062A\u06A9\u0645\u06CC\u0644 \u06A9\u0646\u062F."),
            isPublic && publicSlug && React.createElement("div", { className: "row", style: { gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" } },
                React.createElement("input", { className: "input", readOnly: true, value: publicUrl(publicSlug), style: { flex: 1, minWidth: 220, fontSize: 12 }, onClick: e => e.target.select() }),
                React.createElement("button", { className: "btn g", type: "button", onClick: () => copyLink(publicSlug) }, "\u06A9\u067E\u06CC \u0644\u06CC\u0646\u06A9")),
            isPublic && !publicSlug && React.createElement("p", { style: { fontSize: 12, color: "var(--brand)", marginTop: 6 } }, "\u0644\u06CC\u0646\u06A9 \u067E\u0633 \u0627\u0632 \u0630\u062E\u06CC\u0631\u0647\u0654 \u0641\u0631\u0645 \u0633\u0627\u062E\u062A\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F.")),
        React.createElement("p", { style: { fontSize: 12, color: "var(--muted)", marginTop: 10 } }, "\u0641\u06CC\u0644\u062F \u00AB\u06A9\u062F \u0645\u0644\u06CC\u00BB \u062F\u0631 \u0627\u067E \u06CC\u06A9 \u062F\u06A9\u0645\u0647\u0654 \u00AB\u0641\u0631\u0627\u062E\u0648\u0627\u0646\u00BB \u0645\u06CC\u200C\u0633\u0627\u0632\u062F \u06A9\u0647 \u0628\u0627 \u06A9\u062F \u0645\u0644\u06CC\u060C \u0641\u06CC\u0644\u062F\u0647\u0627\u06CC \u062F\u0627\u0631\u0627\u06CC \u00AB\u0641\u0631\u0627\u062E\u0648\u0627\u0646 \u062E\u0648\u062F\u06A9\u0627\u0631\u00BB \u0631\u0627 \u0627\u0632 \u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0631\u0627\u0646\u0646\u062F\u0647 \u067E\u0631 \u0645\u06CC\u200C\u06A9\u0646\u062F."),
        React.createElement("div", { style: { marginTop: 20, paddingTop: 16, borderTop: "2px solid var(--line)" } },
            React.createElement("h3", { style: { marginTop: 0 } }, "\u0641\u0631\u0645\u200C\u0647\u0627\u06CC \u0633\u0627\u062E\u062A\u0647\u200C\u0634\u062F\u0647"),
            list.length === 0 ? React.createElement("p", { className: "muted" }, "\u0641\u0631\u0645\u06CC \u0633\u0627\u062E\u062A\u0647 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A.") :
                React.createElement("div", { style: { overflowX: "auto" } },
                    React.createElement("table", { style: { fontSize: 12.5, minWidth: 560 } },
                        React.createElement("thead", null,
                            React.createElement("tr", null,
                                React.createElement("th", null, "\u0639\u0646\u0648\u0627\u0646"),
                                React.createElement("th", null, "\u0641\u06CC\u0644\u062F\u0647\u0627"),
                                React.createElement("th", null, "\u0648\u0636\u0639\u06CC\u062A"),
                                React.createElement("th", null, "\u0639\u0645\u0648\u0645\u06CC"),
                                React.createElement("th", null, "\u0639\u0645\u0644\u06CC\u0627\u062A"))),
                        React.createElement("tbody", null, list.map(f => React.createElement("tr", { key: f.id },
                            React.createElement("td", null,
                                React.createElement("b", null, f.title)),
                            React.createElement("td", null, fa((f.schema || []).length)),
                            React.createElement("td", null, f.is_active ? React.createElement("span", { className: "badge b-ok" }, "\u0641\u0639\u0627\u0644") : React.createElement("span", { className: "badge b-no" }, "\u063A\u06CC\u0631\u0641\u0639\u0627\u0644")),
                            React.createElement("td", null, f.public_enabled && f.public_slug ? React.createElement("button", { className: "btn g", onClick: () => copyLink(f.public_slug) }, "\u06A9\u067E\u06CC \u0644\u06CC\u0646\u06A9") : React.createElement("span", { className: "muted" }, "\u2014")),
                            React.createElement("td", { style: { whiteSpace: "nowrap" } },
                                React.createElement("button", { className: "btn g", onClick: () => editForm(f) }, "\u0648\u06CC\u0631\u0627\u06CC\u0634"),
                                " ",
                                React.createElement("button", { className: "btn g", onClick: () => viewSubs(f) }, "\u067E\u0627\u0633\u062E\u200C\u0647\u0627"),
                                " ",
                                React.createElement("button", { className: "btn g", onClick: () => exportForm(f) }, "\u2913 \u0627\u06A9\u0633\u0644"),
                                " ",
                                React.createElement("button", { className: "btn g", onClick: () => db.updForm(f.id, { is_active: f.is_active ? 0 : 1 }).then(loadList) }, f.is_active ? "ØºÛŒØ±ÙØ¹Ø§Ù„" : "ÙØ¹Ø§Ù„"),
                                " ",
                                React.createElement("button", { className: "btn d", onClick: () => delForm(f) }, "\u062D\u0630\u0641")))))))),
        subsFor && React.createElement(Modal, { title: "Ù¾Ø§Ø³Ø®â€ŒÙ‡Ø§ÛŒ ÙØ±Ù…: " + subsFor.form.title, onClose: () => setSubsFor(null) },
            subsFor.submissions.length === 0 ? React.createElement("p", { className: "muted" }, "\u067E\u0627\u0633\u062E\u06CC \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A.") :
                React.createElement("div", { style: { overflowX: "auto" } },
                    React.createElement("table", { style: { fontSize: 11.5, minWidth: 600 } },
                        React.createElement("thead", null,
                            React.createElement("tr", null,
                                React.createElement("th", null, "\u062A\u0627\u0631\u06CC\u062E"),
                                React.createElement("th", null, "\u062B\u0628\u062A\u200C\u06A9\u0646\u0646\u062F\u0647"),
                                React.createElement("th", null, "\u0631\u0627\u0646\u0646\u062F\u0647"),
                                (subsFor.form.schema || []).map((c, i) => React.createElement("th", { key: i }, c.label)))),
                        React.createElement("tbody", null, subsFor.submissions.map(sb => React.createElement("tr", { key: sb.id },
                            React.createElement("td", { style: { whiteSpace: "nowrap" } }, fj(sb.created_at)),
                            React.createElement("td", null, sb.by_name),
                            React.createElement("td", null, (sb.driver_name || "").trim() || "â€”"),
                            (subsFor.form.schema || []).map((c, i) => { var _a, _b; let val = sb.answers ? ((_b = (_a = sb.answers[c.key]) !== null && _a !== void 0 ? _a : sb.answers[c.label]) !== null && _b !== void 0 ? _b : "") : ""; if (!val && c.prefill) {
                                const mp = { first_name: "driver_first_name", last_name: "driver_last_name", mobile: "driver_mobile", gender: "driver_gender", line_code_in_line: "driver_line_code" };
                                val = sb[mp[c.prefill] || ""] || "";
                            } if (Array.isArray(val))
                                val = val.join("ØŒ "); if (typeof val === "string" && val.startsWith("data:image"))
                                val = "[ØªØµÙˆÛŒØ±]"; return React.createElement("td", { key: i }, val || "â€”"); })))))),
            React.createElement("button", { className: "btn p", style: { marginTop: 10 }, onClick: () => exportForm(subsFor.form) }, "\u2913 \u062E\u0631\u0648\u062C\u06CC \u0627\u06A9\u0633\u0644"))));
}
function Cultural() {
    const [tab, setTab] = useState("add");
    const [types, setTypes] = useState([]);
    const [places, setPlaces] = useState([]);
    const [newType, setNewType] = useState({ title: "", description: "" });
    const [newPlace, setNewPlace] = useState({ title: "", address: "", phone: "" });
    // ÙØ±Ù… Ø«Ø¨Øª
    const [nid, setNid] = useState("");
    const [driver, setDriver] = useState(null);
    const [typeId, setTypeId] = useState("");
    const [placeId, setPlaceId] = useState("");
    const [adate, setAdate] = useState(todayJStr());
    const [hours, setHours] = useState("");
    const [note, setNote] = useState("");
    const [msg, setMsg] = useState("");
    // Ú¯Ø²Ø§Ø±Ø´
    const [rep, setRep] = useState(null);
    const [repType, setRepType] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const loadTypes = () => GET("/admin/cultural-types").then(setTypes).catch(() => { });
    const loadPlaces = () => GET("/admin/cultural-places").then(setPlaces).catch(() => { });
    useEffect(() => { loadTypes(); loadPlaces(); }, []);
    const saveType = async () => { if (!newType.title.trim())
        return; await SEND("POST", "/admin/cultural-types", newType); setNewType({ title: "", description: "" }); loadTypes(); };
    const toggleType = async (it) => { await SEND("POST", "/admin/cultural-types", { ...it, is_active: it.is_active ? 0 : 1 }); loadTypes(); };
    const delType = async (id) => { if (!confirm("Ø­Ø°Ù Ø§ÛŒÙ† Ù†ÙˆØ¹ ÙØ¹Ø§Ù„ÛŒØªØŸ"))
        return; await SEND("DELETE", "/admin/cultural-types/" + id); loadTypes(); };
    const savePlace = async () => { if (!newPlace.title.trim())
        return; await SEND("POST", "/admin/cultural-places", newPlace); setNewPlace({ title: "", address: "", phone: "" }); loadPlaces(); };
    const togglePlace = async (pl) => { await SEND("POST", "/admin/cultural-places", { ...pl, is_active: pl.is_active ? 0 : 1 }); loadPlaces(); };
    const delPlace = async (id) => { if (!confirm("Ø­Ø°Ù Ø§ÛŒÙ† Ù…Ú©Ø§Ù†ØŸ"))
        return; await SEND("DELETE", "/admin/cultural-places/" + id); loadPlaces(); };
    const lookup = async () => {
        const n = nid.replace(/\D/g, "");
        if (n.length < 8) {
            setMsg("Ú©Ø¯ Ù…Ù„ÛŒ Ù…Ø¹ØªØ¨Ø± ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯");
            return;
        }
        try {
            const r = await GET("/search?national_id=" + n);
            if (r.type === "driver") {
                setDriver(r.driver);
                setMsg("");
            }
            else
                setMsg("Ø±Ø§Ù†Ù†Ø¯Ù‡ ÛŒØ§ÙØª Ù†Ø´Ø¯");
        }
        catch (e) {
            setDriver(null);
            setMsg("Ø±Ø§Ù†Ù†Ø¯Ù‡â€ŒØ§ÛŒ Ø¨Ø§ Ø§ÛŒÙ† Ú©Ø¯ Ù…Ù„ÛŒ ÛŒØ§ÙØª Ù†Ø´Ø¯");
        }
    };
    const addActivity = async () => {
        const n = nid.replace(/\D/g, "");
        if (n.length < 8) {
            setMsg("Ú©Ø¯ Ù…Ù„ÛŒ Ù…Ø¹ØªØ¨Ø± ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯");
            return;
        }
        if (!typeId) {
            setMsg("Ù†ÙˆØ¹ ÙØ¹Ø§Ù„ÛŒØª Ø±Ø§ Ø§Ù†ØªØ®Ø§Ø¨ Ú©Ù†ÛŒØ¯");
            return;
        }
        if (!adate) {
            setMsg("ØªØ§Ø±ÛŒØ® ÙØ¹Ø§Ù„ÛŒØª Ø±Ø§ Ø§Ù†ØªØ®Ø§Ø¨ Ú©Ù†ÛŒØ¯");
            return;
        }
        try {
            const r = await SEND("POST", "/admin/cultural-activities", { type_id: +typeId, place_id: placeId ? +placeId : null, driver_national_id: n, activity_jdate: adate, hours: hours || null, note });
            setMsg("âœ“ ÙØ¹Ø§Ù„ÛŒØª ÙØ±Ù‡Ù†Ú¯ÛŒ Ø¨Ø±Ø§ÛŒ " + (r.driver_name || "Ø±Ø§Ù†Ù†Ø¯Ù‡") + " Ø«Ø¨Øª Ø´Ø¯");
            setNid("");
            setDriver(null);
            setTypeId("");
            setPlaceId("");
            setHours("");
            setNote("");
        }
        catch (e) {
            setMsg(e.message || "Ø®Ø·Ø§ Ø¯Ø± Ø«Ø¨Øª");
        }
    };
    const loadReport = () => {
        const p = [];
        if (repType)
            p.push("type_id=" + repType);
        if (from)
            p.push("from=" + from);
        if (to)
            p.push("to=" + to);
        GET("/admin/cultural-activities" + (p.length ? "?" + p.join("&") : "")).then(setRep).catch(() => { });
    };
    useEffect(() => { if (tab === "report")
        loadReport(); }, [tab]);
    const delActivity = async (id) => { if (!confirm("Ø­Ø°Ù Ø§ÛŒÙ† ÙØ¹Ø§Ù„ÛŒØªØŸ"))
        return; await SEND("DELETE", "/admin/cultural-activities/" + id); loadReport(); };
    const exportRep = () => {
        if (!rep || !rep.rows.length)
            return;
        const ws = XLSX.utils.json_to_sheet(rep.rows.map(r => ({ "ÙØ¹Ø§Ù„ÛŒØª": r.type_title, "Ù…Ú©Ø§Ù†": r.place_title, "Ú©Ø¯ Ù…Ù„ÛŒ": r.driver_national_id, "Ù†Ø§Ù… Ø±Ø§Ù†Ù†Ø¯Ù‡": r.driver_name, "ØªØ§Ø±ÛŒØ®": r.activity_jdate, "Ø³Ø§Ø¹Øª": r.hours, "Ø«Ø¨Øªâ€ŒÚ©Ù†Ù†Ø¯Ù‡": r.recorded_by_name, "ØªÙˆØ¶ÛŒØ­": r.note })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "ÙØ¹Ø§Ù„ÛŒØª ÙØ±Ù‡Ù†Ú¯ÛŒ");
        XLSX.writeFile(wb, "Ú¯Ø²Ø§Ø±Ø´_ÙØ¹Ø§Ù„ÛŒØª_ÙØ±Ù‡Ù†Ú¯ÛŒ.xlsx");
    };
    return (React.createElement("div", { className: "admin-workspace-page" },
        React.createElement("div", { className: "row", style: { gap: 8, marginBottom: 14, flexWrap: "wrap" } }, [["add", "â• Ø«Ø¨Øª ÙØ¹Ø§Ù„ÛŒØª"], ["types", "ğŸ­ Ø§Ù†ÙˆØ§Ø¹ ÙØ¹Ø§Ù„ÛŒØª"], ["places", "ğŸ“ Ù…Ú©Ø§Ù†â€ŒÙ‡Ø§"], ["report", "ğŸ“Š Ú¯Ø²Ø§Ø±Ø´â€ŒÚ¯ÛŒØ±ÛŒ"]].map(([k, l]) => React.createElement("button", { key: k, className: "btn " + (tab === k ? "p" : "g"), onClick: () => setTab(k) }, l))),
        tab === "types" && React.createElement("div", { className: "panel" },
            React.createElement("h3", null, "\u062A\u0639\u0631\u06CC\u0641 \u0627\u0646\u0648\u0627\u0639 \u0641\u0639\u0627\u0644\u06CC\u062A \u0641\u0631\u0647\u0646\u06AF\u06CC"),
            React.createElement("p", { style: { fontSize: 13, color: "var(--muted)", marginBottom: 10 } }, "\u0645\u062B\u0644: \u0633\u0631\u0648\u06CC\u0633\u200C\u062F\u0647\u06CC \u0635\u0644\u0648\u0627\u062A\u06CC\u060C \u062E\u062F\u0645\u062A\u200C\u0631\u0633\u0627\u0646\u06CC \u062F\u0631 \u0686\u0631\u0627\u063A\u200C\u0628\u0631\u0627\u062A\u060C \u062D\u0645\u0644\u200C\u0648\u0646\u0642\u0644 \u0631\u0627\u06CC\u06AF\u0627\u0646 \u0632\u0627\u0626\u0631 \u0648 \u2026"),
            React.createElement("div", { className: "row", style: { gap: 8, flexWrap: "wrap", marginBottom: 12 } },
                React.createElement("input", { className: "input", style: { maxWidth: 220 }, placeholder: "\u0639\u0646\u0648\u0627\u0646 \u0641\u0639\u0627\u0644\u06CC\u062A", value: newType.title, onChange: e => setNewType({ ...newType, title: e.target.value }) }),
                React.createElement("input", { className: "input", style: { maxWidth: 300, flex: 1 }, placeholder: "\u062A\u0648\u0636\u06CC\u062D (\u0627\u062E\u062A\u06CC\u0627\u0631\u06CC)", value: newType.description, onChange: e => setNewType({ ...newType, description: e.target.value }) }),
                React.createElement("button", { className: "btn p", onClick: saveType }, "\u0627\u0641\u0632\u0648\u062F\u0646")),
            React.createElement("div", { style: { overflowX: "auto" } },
                React.createElement("table", { style: { fontSize: 13, minWidth: 480 } },
                    React.createElement("thead", null,
                        React.createElement("tr", null,
                            React.createElement("th", null, "\u0639\u0646\u0648\u0627\u0646"),
                            React.createElement("th", null, "\u062A\u0648\u0636\u06CC\u062D"),
                            React.createElement("th", null, "\u0648\u0636\u0639\u06CC\u062A"),
                            React.createElement("th", null, "\u0639\u0645\u0644\u06CC\u0627\u062A"))),
                    React.createElement("tbody", null, types.map(it => React.createElement("tr", { key: it.id },
                        React.createElement("td", { style: { fontWeight: 700 } }, it.title),
                        React.createElement("td", { style: { fontSize: 12, color: "var(--muted)" } }, it.description || "â€”"),
                        React.createElement("td", null,
                            React.createElement("span", { style: { color: it.is_active ? "var(--ok)" : "var(--muted)" } }, it.is_active ? "ÙØ¹Ø§Ù„" : "ØºÛŒØ±ÙØ¹Ø§Ù„")),
                        React.createElement("td", null,
                            React.createElement("button", { className: "btn g", style: { fontSize: 11, padding: "3px 8px" }, onClick: () => toggleType(it) }, it.is_active ? "ØºÛŒØ±ÙØ¹Ø§Ù„" : "ÙØ¹Ø§Ù„"),
                            " ",
                            React.createElement("button", { className: "btn g", style: { fontSize: 11, padding: "3px 8px", color: "var(--danger)" }, onClick: () => delType(it.id) }, "\u062D\u0630\u0641")))))),
                types.length === 0 && React.createElement("p", { style: { color: "var(--muted)", textAlign: "center", padding: 16 } }, "\u0647\u0646\u0648\u0632 \u0641\u0639\u0627\u0644\u06CC\u062A\u06CC \u062A\u0639\u0631\u06CC\u0641 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A."))),
        tab === "places" && React.createElement("div", { className: "panel" },
            React.createElement("h3", null, "\u0645\u062F\u06CC\u0631\u06CC\u062A \u0645\u06A9\u0627\u0646\u200C\u0647\u0627\u06CC \u062E\u062F\u0645\u0627\u062A \u0641\u0631\u0647\u0646\u06AF\u06CC"),
            React.createElement("p", { style: { fontSize: 13, color: "var(--muted)", marginBottom: 10 } }, "\u0645\u06A9\u0627\u0646\u200C\u0647\u0627\u06CC\u06CC \u06A9\u0647 \u062E\u062F\u0645\u0627\u062A \u0641\u0631\u0647\u0646\u06AF\u06CC \u062F\u0631 \u0622\u0646\u200C\u0647\u0627 \u0627\u0631\u0627\u0626\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F (\u062D\u0631\u0645\u060C \u0645\u06CC\u0627\u062F\u06CC\u0646\u060C \u0645\u0633\u06CC\u0631\u0647\u0627\u06CC \u0632\u06CC\u0627\u0631\u062A\u06CC \u0648 \u2026)."),
            React.createElement("div", { className: "row", style: { gap: 8, flexWrap: "wrap", marginBottom: 12 } },
                React.createElement("input", { className: "input", style: { maxWidth: 200 }, placeholder: "\u0646\u0627\u0645 \u0645\u06A9\u0627\u0646", value: newPlace.title, onChange: e => setNewPlace({ ...newPlace, title: e.target.value }) }),
                React.createElement("input", { className: "input", style: { maxWidth: 280, flex: 1 }, placeholder: "\u0622\u062F\u0631\u0633", value: newPlace.address, onChange: e => setNewPlace({ ...newPlace, address: e.target.value }) }),
                React.createElement("input", { className: "input", style: { maxWidth: 140 }, placeholder: "\u062A\u0644\u0641\u0646", value: newPlace.phone, onChange: e => setNewPlace({ ...newPlace, phone: e.target.value }) }),
                React.createElement("button", { className: "btn p", onClick: savePlace }, "\u0627\u0641\u0632\u0648\u062F\u0646")),
            React.createElement("div", { style: { overflowX: "auto" } },
                React.createElement("table", { style: { fontSize: 13, minWidth: 520 } },
                    React.createElement("thead", null,
                        React.createElement("tr", null,
                            React.createElement("th", null, "\u0646\u0627\u0645 \u0645\u06A9\u0627\u0646"),
                            React.createElement("th", null, "\u0622\u062F\u0631\u0633"),
                            React.createElement("th", null, "\u062A\u0644\u0641\u0646"),
                            React.createElement("th", null, "\u0648\u0636\u0639\u06CC\u062A"),
                            React.createElement("th", null, "\u0639\u0645\u0644\u06CC\u0627\u062A"))),
                    React.createElement("tbody", null, places.map(pl => React.createElement("tr", { key: pl.id },
                        React.createElement("td", { style: { fontWeight: 700 } }, pl.title),
                        React.createElement("td", { style: { fontSize: 12, color: "var(--muted)" } }, pl.address || "â€”"),
                        React.createElement("td", { dir: "ltr" }, fa(pl.phone || "â€”")),
                        React.createElement("td", null,
                            React.createElement("span", { style: { color: pl.is_active ? "var(--ok)" : "var(--muted)" } }, pl.is_active ? "ÙØ¹Ø§Ù„" : "ØºÛŒØ±ÙØ¹Ø§Ù„")),
                        React.createElement("td", null,
                            React.createElement("button", { className: "btn g", style: { fontSize: 11, padding: "3px 8px" }, onClick: () => togglePlace(pl) }, pl.is_active ? "ØºÛŒØ±ÙØ¹Ø§Ù„" : "ÙØ¹Ø§Ù„"),
                            " ",
                            React.createElement("button", { className: "btn g", style: { fontSize: 11, padding: "3px 8px", color: "var(--danger)" }, onClick: () => delPlace(pl.id) }, "\u062D\u0630\u0641")))))),
                places.length === 0 && React.createElement("p", { style: { color: "var(--muted)", textAlign: "center", padding: 16 } }, "\u0647\u0646\u0648\u0632 \u0645\u06A9\u0627\u0646\u06CC \u062A\u0639\u0631\u06CC\u0641 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A."))),
        tab === "add" && React.createElement("div", { className: "panel" },
            React.createElement("h3", null, "\u062B\u0628\u062A \u0641\u0639\u0627\u0644\u06CC\u062A \u0641\u0631\u0647\u0646\u06AF\u06CC \u0631\u0627\u0646\u0646\u062F\u0647"),
            React.createElement("label", { className: "label" }, "\u06A9\u062F \u0645\u0644\u06CC \u0631\u0627\u0646\u0646\u062F\u0647"),
            React.createElement("div", { className: "row", style: { gap: 8 } },
                React.createElement("input", { className: "input", dir: "ltr", maxLength: "10", style: { maxWidth: 200 }, placeholder: "\u06A9\u062F \u0645\u0644\u06CC", value: nid, onChange: e => setNid(e.target.value) }),
                React.createElement("button", { className: "btn g", onClick: lookup }, "\uD83D\uDD0D \u0641\u0631\u0627\u062E\u0648\u0627\u0646 \u0631\u0627\u0646\u0646\u062F\u0647")),
            driver && React.createElement("div", { style: { background: "#eef7f3", borderRadius: 10, padding: 12, margin: "10px 0", border: "1px solid #cfe8df" } },
                React.createElement("b", null,
                    driver.first_name,
                    " ",
                    driver.last_name),
                React.createElement("div", { style: { fontSize: 12.5, color: "var(--muted)", marginTop: 4 } },
                    "\u0645\u0648\u0628\u0627\u06CC\u0644: ",
                    fa(driver.mobile || "â€”"),
                    " \u00B7 \u0646\u0648\u0639: ",
                    driver.driver_type || "â€”",
                    " \u00B7 \u06A9\u062F \u0628\u0647\u0631\u0647\u200C\u0628\u0631\u062F\u0627\u0631\u06CC: ",
                    fa(driver.operating_code || "â€”"))),
            React.createElement("label", { className: "label", style: { marginTop: 10 } }, "\u0646\u0648\u0639 \u0641\u0639\u0627\u0644\u06CC\u062A \u0641\u0631\u0647\u0646\u06AF\u06CC"),
            React.createElement("select", { className: "input", value: typeId, onChange: e => setTypeId(e.target.value) },
                React.createElement("option", { value: "" }, "\u2014 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F \u2014"),
                types.filter(it => it.is_active).map(it => React.createElement("option", { key: it.id, value: it.id }, it.title))),
            React.createElement("label", { className: "label", style: { marginTop: 10 } }, "\u0645\u06A9\u0627\u0646 \u062E\u062F\u0645\u0627\u062A"),
            React.createElement("select", { className: "input", value: placeId, onChange: e => setPlaceId(e.target.value) },
                React.createElement("option", { value: "" }, "\u2014 \u0628\u062F\u0648\u0646 \u0645\u06A9\u0627\u0646 \u2014"),
                places.filter(pl => pl.is_active).map(pl => React.createElement("option", { key: pl.id, value: pl.id },
                    pl.title,
                    pl.address ? (" â€” " + pl.address) : ""))),
            React.createElement("div", { className: "row", style: { gap: 10, marginTop: 10, flexWrap: "wrap" } },
                React.createElement("div", { style: { flex: 1, minWidth: 150 } },
                    React.createElement("label", { className: "label" }, "\u062A\u0627\u0631\u06CC\u062E \u0641\u0639\u0627\u0644\u06CC\u062A"),
                    React.createElement(JDate, { value: adate, onChange: setAdate, jalali: true })),
                React.createElement("div", { style: { flex: 1, minWidth: 120 } },
                    React.createElement("label", { className: "label" }, "\u0645\u062F\u062A (\u0633\u0627\u0639\u062A)"),
                    React.createElement("input", { className: "input", type: "number", min: "0", step: "0.5", placeholder: "\u0627\u062E\u062A\u06CC\u0627\u0631\u06CC", value: hours, onChange: e => setHours(e.target.value) }))),
            React.createElement("label", { className: "label", style: { marginTop: 10 } }, "\u062A\u0648\u0636\u06CC\u062D\u0627\u062A (\u0627\u062E\u062A\u06CC\u0627\u0631\u06CC)"),
            React.createElement("input", { className: "input", value: note, onChange: e => setNote(e.target.value) }),
            React.createElement("button", { className: "btn p", style: { marginTop: 14 }, onClick: addActivity }, "\u062B\u0628\u062A \u0641\u0639\u0627\u0644\u06CC\u062A \u0641\u0631\u0647\u0646\u06AF\u06CC"),
            msg && React.createElement("p", { style: { marginTop: 10, color: msg.startsWith("âœ“") ? "var(--ok)" : "var(--danger)", fontSize: 13, fontWeight: 700 } }, msg)),
        tab === "report" && React.createElement("div", { className: "panel" },
            React.createElement("h3", null, "\u06AF\u0632\u0627\u0631\u0634 \u0641\u0639\u0627\u0644\u06CC\u062A\u200C\u0647\u0627\u06CC \u0641\u0631\u0647\u0646\u06AF\u06CC"),
            React.createElement("div", { className: "filters", style: { flexWrap: "wrap", gap: 8 } },
                React.createElement("select", { className: "input", style: { maxWidth: 180 }, value: repType, onChange: e => setRepType(e.target.value) },
                    React.createElement("option", { value: "" }, "\u0647\u0645\u0647\u0654 \u0641\u0639\u0627\u0644\u06CC\u062A\u200C\u0647\u0627"),
                    types.map(it => React.createElement("option", { key: it.id, value: it.id }, it.title))),
                React.createElement("span", { className: "label" }, "\u0627\u0632"),
                React.createElement(JDate, { value: from, onChange: setFrom, jalali: true }),
                React.createElement("span", { className: "label" }, "\u062A\u0627"),
                React.createElement(JDate, { value: to, onChange: setTo, jalali: true }),
                React.createElement("button", { className: "btn p", onClick: loadReport }, "\u0627\u0639\u0645\u0627\u0644"),
                React.createElement("button", { className: "btn g", onClick: () => { setFrom(""); setTo(""); setRepType(""); setTimeout(loadReport, 0); } }, "\u067E\u0627\u06A9"),
                React.createElement("button", { className: "btn g", onClick: exportRep, disabled: !rep || !rep.rows.length }, "\u2913 \u0627\u06A9\u0633\u0644")),
            rep && React.createElement(React.Fragment, null,
                rep.summary && rep.summary.length > 0 && React.createElement("div", { className: "kpis", style: { marginTop: 12 } }, rep.summary.map((s, i) => React.createElement("div", { className: "kpi", key: i },
                    React.createElement("div", { className: "n" }, fa(s.activity_count)),
                    React.createElement("div", { className: "l" },
                        s.title,
                        s.total_hours > 0 ? (" Â· " + fa(s.total_hours) + " Ø³Ø§Ø¹Øª") : "")))),
                React.createElement("div", { style: { overflowX: "auto", marginTop: 14 } },
                    React.createElem×®5ã}›Ê×¬¢h­µçH™XXİ˜Ü™X]Q[[Y[
›ÙH‹[›İÜË›X\
ˆOˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹ÈÙ^Nˆ‹šYKˆ™XXİ˜Ü™X]Q[[Y[
‹[˜J‹šY
JKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ‹˜Ü›ÜÚ[XYÙHÈ™XXİ˜Ü™X]Q[[Y[
š[YÈ‹ÈÜ˜Îˆ‹˜Ü›ÜÚ[XYÙKÛÛXÚÎˆ

HOˆÜ[“YYXU\›
‹˜Ü›ÜÚ[XYÙJKİ[NˆÈÚYˆMKZYÚˆMØš™Xİš]ˆ	ØÛİ™\‰Ë›Ü™\”˜Y]\Îˆ›Ü™\ˆ	Ì\ÛÛY˜\ŠK[[™JIËİ\œÛÜˆ	ÜÚ[\‰ÈHJHˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]YˆK—LŒLŒ‘—LLˆLŒLŒÌWLŒÍŠKˆ‹›ÜšYÚ[˜[Ú[XYÙH	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹İ[NˆÈ›ÛÚ^™NˆLY[™Îˆ	ÌÜÜ	ËX\™Ú[•ÜˆKÛÛXÚÎˆ

HOˆÜ[“YYXU\›
‹›ÜšYÚ[˜[Ú[XYÙJHK—LŒWLŒÍWLLĞ×LŒÌHLŒ×LŒÍWLLĞÈŠJJKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[‹˜ÛÜœ™XİYÜ]H	ø %	ÊKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹\ˆ›ˆ‹İ[NˆÈ›ÛÚ^™NˆLHKˆ‹˜ÛÜœ™XİYÙYÚ]×Ìˆ	ËKIËˆˆ
È‹ˆ‹˜ÛÜœ™XİYÙYÚ]×ÌÈ	ËKKIËˆˆÈLŒHÈLˆŠJKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ‹™]XİYÜ]H	ø %	Ëˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ›ÛÚ^™NˆLHKˆ—LŒ×LŒÍ×LWLĞ×L—LŒ×Lˆ‹ˆ‹˜ÛÛ™šY[˜ÙHOH[È˜JX]œ›İ[™
[X™\Š‹˜ÛÛ™šY[˜ÙJH
ˆL
JH
È	öj‰Èˆ	ø %	ËˆˆLÈ‹ˆ‹›ØÜ—ÜÛİ\˜ÙH	ø %	ÊKˆ‹œ˜]×İ^	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]Z[È‹[ˆ™XXİ˜Ü™X]Q[[Y[
œİ[[X\H‹Èİ[NˆÈİ\œÛÜˆ	ÜÚ[\‰ËÛÛÜˆ	İ˜\ŠKXœ˜[™
IÈHK—LWLŒWLˆLŒ‘WLŒ×LHŠKˆ™XXİ˜Ü™X]Q[[Y[
œ™H‹Èİ[NˆÈÚ]TÜXÙNˆ	Ü™K]Ü˜\	ËX^ÚYˆŒ\™Xİ[Ûˆ	Û‰Ë^[YÛˆ	ÛY	ÈHK‹œ˜]×İ^
JJKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[‹\Ù\—Û˜[YH	ø %	ÊKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ›ÛÚ^™NˆLHKˆ‹™ZXÛWÜ]H	ø %	Ëˆˆ‹ˆ‹›[™WØÛÙHÈ
	ÈÈ6+¶-È	È
È‹›[™WØÛÙJHˆ	ÉÊJKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆ˜˜YÙHˆKÈ™\šYšYYˆ	ö*¶(öã6ã6+ö-6+öaÉË[™[™Îˆ	ö+ö,H6)öa¶*¶.6)ö,IË™Z™XİYˆ	ö,v+ö-6+öaÉÈVÜ‹œİ]\×H‹œİ]\ÊKˆ‹œ™]šY]Ù\—Û˜[YH	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ›ÛÚ^™NˆLHKˆ—LŒLŒÌWLŒÌWLŒÌ×LĞÎˆ‹ˆ‹œ™]šY]Ù\—Û˜[YJJKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆšŠ‹˜Ü™X]YØ]
Kˆ‹˜ÛY[İ[YH	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ›ÛÚ^™NˆLHKˆ—LŒ—LŒLŒHLLŒ×L—LŒÎWLĞÎˆ‹ˆšŠ‹˜ÛY[İ[YJJJKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆ›^Ü˜\ˆ	İÜ˜\	ÈHKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹ÛÛXÚÎˆ

HOˆ™]šY]Ê‹	İ™\šYšYY	ÊHK—LŒ×LŒÍWLLŒ×LŒ‘×LŒWLŒŒ×LĞ×LĞ×LŒ‘ˆŠKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹ÛÛXÚÎˆ

HOˆ]ZXÚÊ‹	Ü[™[™ÉÊHK—LŒ‘—LŒÌHLŒ×L—LŒWLŒÎLŒ×LŒÌHŠKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹İ[NˆÈÛÛÜˆ	İ˜\ŠKY[™Ù\ŠIÈKÛÛXÚÎˆ

HOˆ]ZXÚÊ‹	Ü™Z™XİY	ÊHK—LŒÌWLŒ‘ˆŠJJJJJJKˆ\›İÜË›[™İ	‰ˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ^[YÛˆ	ØÙ[\‰ËY[™ÎˆNHK—L—LWLL—L×LŒ×LŒ×LĞÈLŒLŒÌWLŒ×LĞÈL—LWLŒ×LĞ×LŒÍLLŒ×LLŒ‘ˆL—LŒ‘—LŒ×LŒÌWLŒ‘‹ˆŠJJJNÂŸB™[˜İ[ÛˆY\ÜÙ[™Ù\Ù[\”[™[

HÂˆ˜\ˆØNÂˆÛÛœİ]›Ü›\ÈHÂˆÈYˆ	Ø˜[IË]Nˆ	ö*6a6aÉËXÛÛˆ	ü'çè‰ÈKˆÈYˆ	İ[YÜ˜[IË]Nˆ	ö*¶a6«ö,v)öaIËXÛÛˆ	ü'å-IÈKˆÈYˆ	ÙZ]XIË]Nˆ	ö)öã6*¶)ÉËXÛÛˆ	ü'çè	ÈBˆNÂˆÛÛœİØXİ]™KÙ]Xİ]™WHH\ÙTİ]J	Ø˜[IÊNÂˆÛÛœİÜİXœËÙ]İXœ×HH\ÙTİ]JÈ˜[Nˆ×K[YÜ˜[Nˆ×KZ]XNˆ×HJNÂˆÛÛœİÛØY[™ËÙ]ØY[™×HH\ÙTİ]J˜[ÙJNÂˆÛÛœİÜÙ[™[™ËÙ]Ù[™[™×HH\ÙTİ]J˜[ÙJNÂˆÛÛœİÛ\ÙËÙ]\Ù×HH\ÙTİ]J	ÉÊNÂˆÛÛœİÜKÙ]WHH\ÙTİ]J	ÉÊNÂˆÛÛœİİ\™Ù]Ù]\™Ù]HH\ÙTİ]J	Ø[Ùš]™\œÉÊNÂˆÛÛœİİ^Ù]^HH\ÙTİ]J	ÉÊNÂˆÛÛœİÛX[X[Ù]X[X[HH\ÙTİ]J	ÉÊNÂˆÛÛœİÚ[š]S[Øš[\ËÙ][š]S[Øš[\×HH\ÙTİ]J	ÉÊNÂˆÛÛœİÚ[š]U^Ù][š]U^HH\ÙTİ]J	ÉÊNÂˆÛÛœİ›Ü›X[^™S\İH
˜[YJHOˆİš[™Ê˜[YH	ÉÊKœÜ]
Öö#×——JËÊK›X\
Oˆš[J
JK™š[\Š›ÛÛX[ŠNÂˆÛÛœİØY]›Ü›HH\Ş[˜È
]›Ü›JHOˆÂˆÙ]ØY[™ÊYJNÂˆÙ]\ÙÊ	ÉÊNÂˆHÂˆÛÛœİ›İÜÈH]ØZ]‹›Y\ÜÙ[™Ù\”İXœØÜšX™\œÊ]›Ü›JNÂˆÙ]İXœÊ™]ˆOˆ
È‹‹œ™]‹Ü]›Ü›WNˆ\œ˜^Kš\Ğ\œ˜^J›İÜÊHÈ›İÜÈˆ×HJJNÂˆBˆØ]Ú
JHÂˆÙ]\ÙÊK›Y\ÜØYÙH	ö+¶-ö)È6+ö,H6+ö,vã6)ö`v*ˆ6av-6*¶,vªvã6a‰ÊNÂˆBˆš[˜[HÂˆÙ]ØY[™Ê˜[ÙJNÂˆBˆNÂˆÛÛœİØY[H\Ş[˜È

HOˆÂˆÙ]ØY[™ÊYJNÂˆÙ]\ÙÊ	ÉÊNÂˆHÂˆÛÛœİİ]H]ØZ]›ÛZ\ÙK˜[
]›Ü›\Ë›X\
Oˆ‹›Y\ÜÙ[™Ù\”İXœØÜšX™\œÊšY
JJNÂˆÙ]İXœÊÈ˜[Nˆİ]ÌH×K[YÜ˜[Nˆİ]ÌWH×KZ]XNˆİ]Ì—H×HJNÂˆBˆØ]Ú
JHÂˆÙ]\ÙÊK›Y\ÜØYÙH	ö+¶-ö)È6+ö,H6+ö,vã6)ö`v*ˆ6av-6*¶,vªvã6a‰ÊNÂˆBˆš[˜[HÂˆÙ]ØY[™Ê˜[ÙJNÂˆBˆNÂˆ\ÙQY™™Xİ


HOˆÈØY[

NÈK×JNÂˆÛÛœİÙ[™H\Ş[˜È

HOˆÂˆYˆ
]^š[J
JBˆ™]\›ˆÙ]\ÙÊ	öav*¶aˆ6o¶ã6)öaH6,v)È6b6)ö,v+È6ªva¶ã6+Ë‰ÊNÂˆÙ]Ù[™[™ÊYJNÂˆÙ]\ÙÊ	ÉÊNÂˆHÂˆÛÛœİÙ[XİYH]›Ü›\Ë›X\
OˆšY
NÂˆÛÛœİ™\İ[ÈH×NÂˆ›Üˆ
ÛÛœİ]›Ü›HÙˆÙ[XİY
HÂˆÛÛœİˆH]ØZ]‹›Y\ÜÙ[™Ù\”Ù[™[Ê]›Ü›K\™Ù]^š[J
JNÂˆ™\İ[Ëœ\Ú
È]›Ü›K‹‹œˆJNÂˆBˆÛÛœİ[Øš[\ÈH›Ü›X[^™S\İ
X[X[
NÂˆ]X[X[™\İ[H[ÂˆYˆ
[Øš[\Ë›[™İ
BˆX[X[™\İ[H]ØZ]‹›Y\ÜÙ[™Ù\”Ù[™X[X[
[Øš[\Ë^š[J
JNÂˆÛÛœİİ[[X\HH™\İ[Ë›X\
ˆOˆÈ˜\ˆØNÈ™]\›ˆ	Ê
ØHH]›Ü›\Ë™š[™
OˆšYOOH‹œ]›Ü›JJHOOH[ØHOOH›ÚYÈ›ÚYˆØK]JH‹œ]›Ü›_Nˆ	Ù˜J‹œÙ[
_H6avb6`v`¶#	Ù˜J‹››İØÛÛ›™XİY
_H6.v-¶b6a¶-6+öaö#	Ù˜J‹™˜Z[Y
_H6a¶)öavb6`v`˜ÈJKš›Ú[Š	È	ÊNÂˆÙ]\ÙÊ	ø§$È	È
Èİ[[X\H
È
X[X[™\İ[È6-6av)ö,vaø #6aö)öã6+ö,ö*¶ãˆ	Ù˜JX[X[™\İ[œÙ[
_H6avb6`v`˜ˆ	ÉÊJNÂˆBˆØ]Ú
JHÂˆÙ]\ÙÊK›Y\ÜØYÙH	ö)ö,v,ö)öa6o¶ã6)öaH6a¶)öavb6`v`ˆ6*6b6+ÉÊNÂˆBˆš[˜[HÂˆÙ]Ù[™[™Ê˜[ÙJNÂˆBˆNÂˆÛÛœİ[š]HH\Ş[˜È

HOˆÂˆÛÛœİ[Øš[\ÈH›Ü›X[^™S\İ
[š]S[Øš[\ÊNÂˆYˆ
[[Øš[\Ë›[™İ
Bˆ™]\›ˆÙ]\ÙÊ	ö+v+ö)ö`¶a6ã6ªH6-6av)ö,vaÈ6*6,v)öã6+ö.vb6*ˆ6b6)ö,v+È6ªva¶ã6+Ë‰ÊNÂˆÙ]Ù[™[™ÊYJNÂˆÙ]\ÙÊ	ÉÊNÂˆHÂˆÛÛœİˆH]ØZ]‹›Y\ÜÙ[™Ù\’[š]J[Øš[\Ë[š]U^š[J
JNÂˆÙ]\ÙÊ8§$È6+ö.vb6*ˆ6*6,v)öã	Ù˜J‹œÙ[‹˜Ûİ[[Øš[\Ë›[™İ
_H6-6av)ö,vaÈ6)ö,v,ö)öa6-6+Ë˜
NÂˆBˆØ]Ú
JHÂˆÙ]\ÙÊK›Y\ÜØYÙH	ö)ö,v,ö)öa6+ö.vb6*ˆ6a¶)öavb6`v`ˆ6*6b6+ÉÊNÂˆBˆš[˜[HÂˆÙ]Ù[™[™Ê˜[ÙJNÂˆBˆNÂˆÛÛœİ›İÜÈH
İXœÖØXİ]™WH×JK™š[\ŠˆOˆÂˆÛÛœİˆH
İš[™Ê‹›[Øš[H	ÉÊH
È	È	È
Èİš[™Ê‹™\Ü^WÛ˜[YH	ÉÊH
È	È	È
Èİš[™Ê‹\Ù\—Û˜[YH	ÉÊH
È	È	È
Èİš[™Ê‹™š]™\—Û˜[YH	ÉÊH
È	È	È
Èİš[™Ê‹˜Ú]ÚY	ÉÊJKÓİÙ\Ø\ÙJ
NÂˆ™]\›ˆ\Kš[J
H‹š[˜ÛY\ÊKš[J
KÓİÙ\Ø\ÙJ
JNÂˆJNÂˆÛÛœİÛİ[ÈHßNÂˆ]›Ü›\Ë™›Ü‘XXÚ
OˆÈÛÛœİHHİXœÖÜšYH×NÈÛİ[ÖÜšYHHÈ[ˆK›[™İXİ]™NˆK™š[\ŠOˆÈ˜\ˆØNÈ™]\›ˆ[X™\Š
ØHHš\×ØXİ]™JHOOH[	‰ˆØHOOH›ÚYÈØHˆ
œİ]\ÈOOH	ØXİ]™IÈÈHˆ
JHOOHNÈJK›[™İNÈJNÂˆ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ[™[Y\ÜÙ[™Ù\‹XÙ[\‹[˜]]™HYZ[‹]ÛÜšÜÜXÙK\YÙHˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈ\İYPÛÛ[ˆ	ÜÜXÙKX™]ÙY[‰Ë[YÛ’][\Îˆ	ØÙ[\‰ËØ\ˆL‹›^Ü˜\ˆ	İÜ˜\	ÈHKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
šÈ‹[—LWLŒÌWLNWLŒÌˆLŒ×LŒÌWLŒÌ×LŒ×LLŒÌWLŒLŒ×LŒWLŒ×L×LŒÈŠKˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈX\™Ú[•ÜˆHHK—LŒ×LŒÌWLŒÌ×LŒ×LLQ—LŒÌWLL×LĞ×LŒÈLŒ‘—LŒÎWLLŒHLWLŒÍLŒWLŒÌWLNWLĞ×LˆLLWLŒ‘—LĞ×LŒÌWLĞ×LŒHLŒ×LŒWLŒÍWLŒ×LLNWLŒ×LŒÌWLŒLŒÌWLŒ×LˆLŒLÈLŒÌWLŒLŒ×LŒWLŒ×L×LŒ×LĞÈLŒÌWLŒÌ×LWLĞÈLŒÌ×LŒ×LWLŒ×L—LÈŠJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹ÛÛXÚÎˆØY[\ØX›YˆØY[™ÈKØY[™ÈÈ	ö+ö,H6+v)öa6*6,vb6,¶,v,ö)öa¶ã	Èˆ	ö*6,vb6,¶,v,ö)öa¶ã6aöavaÉÊJKˆ\ÙÈ	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈX\™Ú[•ÜˆL‹Y[™Îˆ	ÌL\LÜ	Ë›Ü™\”˜Y]\ÎˆL‹˜XÚÙÜ›İ[™ˆ\ÙËœİ\ÕÚ]
	ø§$ÉÊHÈ	ÈÙXYŒIÈˆ	ÈÙ™™ŒYŒ‰ËÛÛÜˆ\ÙËœİ\ÕÚ]
	ø§$ÉÊHÈ	İ˜\ŠK[ÚÊIÈˆ	İ˜\ŠKY[™Ù\ŠIË›ÛÙZYÚˆÌ[™RZYÚˆKHHK\ÙÊKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ™ÜšYˆ‹İ[NˆÈX\™Ú[•ÜˆM‹[YÛ’][\Îˆ	Üİ\	ÈHKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ˜Ø\™\ˆKˆ™XXİ˜Ü™X]Q[[Y[
š‹[—LŒ×LŒÌWLŒÌ×LŒ×LLQ—LŒÌWLL×LĞÈLŒ‘—LŒÌHL×LWLÈLŒÌWLŒLŒ×LŒWLŒ×L×LŒÈŠKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›]]YˆK—LQ—LŒÌWLLÈLQ—LĞ×LŒÌWL—LŒ‘—LQ—LŒ×LˆŠKˆ™XXİ˜Ü™X]Q[[Y[
œÙ[Xİ‹ÈÛ\ÜÓ˜[YNˆš[œ]‹˜[YNˆ\™Ù]ÛÚ[™ÙNˆHOˆÙ]\™Ù]
K\™Ù]˜[YJKİ[NˆÈÚYˆ	ÌL	IËX\™Ú[•ÜˆHHKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆ˜[Ùš]™\œÈˆK—L×LWLÈLŒÌWLŒ×L—L—LŒ‘—LQ—LŒ×LˆLŒ‘—LŒ×LŒÌWLŒ×LĞÈLŒÍLWLŒ×LŒÌWLÈŠKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆ˜[İ\Ù\œÈˆK—L×LWLÈLNWLŒ×LŒÌWLŒLŒÌWLŒ×LˆLWLŒÎWLŒ×LŠJKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ\Ü^Nˆ	Ø›ØÚÉËX\™Ú[•ÜˆLˆHK—LWLŒWLˆLÑWLĞ×LŒ×LHŠKˆ™XXİ˜Ü™X]Q[[Y[
^\™XH‹ÈÛ\ÜÓ˜[YNˆš[œ]‹˜[YNˆ^ÛÚ[™ÙNˆHOˆÙ]^
K\™Ù]˜[YJKXÙZÛ\ˆ—LWLŒWLˆLÑWLĞ×LŒ×LHLQ—LŒÌWLL×LĞ×LŒˆ‹İ[NˆÈÚYˆ	ÌL	IËZ[’ZYÚˆLÌX\™Ú[•ÜˆHHJKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ\Ü^Nˆ	Ø›ØÚÉËX\™Ú[•ÜˆLˆHK—LŒÍLWLŒ×LŒÌWL×LŒ×L×LŒ×LĞÈLŒ‘—LŒÌ×LŒWLĞÈLŒ×LŒ‘WLŒWLĞ×LŒ×LŒÌWLĞÈŠKˆ™XXİ˜Ü™X]Q[[Y[
^\™XH‹ÈÛ\ÜÓ˜[YNˆš[œ]‹˜[YNˆX[X[ÛÚ[™ÙNˆHOˆÙ]X[X[
K\™Ù]˜[YJKXÙZÛ\ˆ—LŒÍLWLŒ×LŒÌWL×LŒ×L×LŒÈLŒÌWLŒÈLŒLŒÈLLĞ×LŒÌWLQ—LLLĞ×LŒÈLŒ‘WLŒÍÈLŒ×LŒ‘—LĞ×LŒ‘ˆLŒ×LŒ‘—LŒÈLNWL—LĞ×LŒ‘ˆ‹İ[NˆÈÚYˆ	ÌL	IËZ[’ZYÚˆÎX\™Ú[•ÜˆHHJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹ÛÛXÚÎˆÙ[™\ØX›YˆÙ[™[™Ëİ[NˆÈÚYˆ	ÌL	IËX\™Ú[•ÜˆLˆHKÙ[™[™ÈÈ	ö+ö,H6+v)öa6)ö,v,ö)öa	Èˆ	ö)ö,v,ö)öa6+ö,H6*6a6aö#6*¶a6«ö,v)öaH6b6)öã6*¶)ÉÊJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ˜Ø\™\ˆKˆ™XXİ˜Ü™X]Q[[Y[
š‹[—LŒ‘—LŒÎWLLŒHLŒLÈLŒÌWLŒLŒ×LŒWLŒ×L×LŒÈŠKˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ[™RZYÚˆKHHK—LNWLŒ×LŒÌWLŒLŒÌWLŒ×L—LĞÈLNWLÈL×L—LLŒÌˆLŒÌWLŒLŒ×LŒHLŒÌWLŒÈLWLŒÎWLŒ×LL—LNWLŒÌWLŒ‘—L×LŒ×LŒ×L—LŒ‘ˆLŒ×LŒÌˆLŒÍ×LŒÌWLĞ×LˆLÑWLĞ×LŒ×LWLNWLŒÈLLĞ×L—LNHLLŒÌWLLŒ‘ˆLŒLÈLŒÌWLŒLŒ×LŒWLŒ×L×LŒ×LĞÈLŒÌWLŒÌ×LWLĞÈLŒÌWLŒÈLŒ‘—LŒÌWLĞ×LŒ×LWLŒHLWLĞ×LŒ×LNWL—L—LŒ‘‹ˆŠKˆ™XXİ˜Ü™X]Q[[Y[
^\™XH‹ÈÛ\ÜÓ˜[YNˆš[œ]‹˜[YNˆ[š]S[Øš[\ËÛÚ[™ÙNˆHOˆÙ][š]S[Øš[\ÊK\™Ù]˜[YJKXÙZÛ\ˆ—LŒÍLWLŒ×LŒÌWL×LŒ×L×LŒÈLŒÌWLŒÈLŒLŒÈLLĞ×LŒÌWLQ—LLLĞ×LŒÈLŒ‘WLŒÍÈLŒ×LŒ‘—LĞ×LŒ‘ˆLŒ×LŒ‘—LŒÈLNWL—LĞ×LŒ‘ˆ‹İ[NˆÈÚYˆ	ÌL	IËZ[’ZYÚˆLLX\™Ú[•ÜˆHJKˆ™XXİ˜Ü™X]Q[[Y[
^\™XH‹ÈÛ\ÜÓ˜[YNˆš[œ]‹˜[YNˆ[š]U^ÛÚ[™ÙNˆHOˆÙ][š]U^
K\™Ù]˜[YJKXÙZÛ\ˆ—LWLŒWLˆLŒ‘—LŒÎWLLŒHLŒ×LŒ‘WLŒWLĞ×LŒ×LŒÌWLĞÈ‹İ[NˆÈÚYˆ	ÌL	IËZ[’ZYÚˆLX\™Ú[•ÜˆHJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹ÛÛXÚÎˆ[š]K\ØX›YˆÙ[™[™Ëİ[NˆÈÚYˆ	ÌL	IËX\™Ú[•ÜˆLˆHK—LŒ×LŒÌWLŒÌ×LŒ×LLŒ‘—LŒÎWLLŒHLÑWLĞ×LŒ×LWLNWLĞÈŠJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ˜Ø\™\‹İ[NˆÈX\™Ú[•ÜˆMˆHKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈ\İYPÛÛ[ˆ	ÜÜXÙKX™]ÙY[‰Ë[YÛ’][\Îˆ	ØÙ[\‰ËØ\ˆL›^Ü˜\ˆ	İÜ˜\	ÈHKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
š‹Èİ[NˆÈX\™Ú[›İÛNˆHK—LWLŒÍLŒWLŒÌWLNWLĞ×LˆLŒÌWLŒLŒ×LŒWLŒ×L×LŒÈŠKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]YˆK—L×LŒÌHLÑWLĞ×LŒ×LWLŒ×LŒÌWLŒÌ×LŒ×LˆLWL×LŒÌWLŒÌ×LŒHLWLŒÌ×LŒWL—LLŒ‘WLLŒ‘ˆLŒÌWLŒÈLŒ‘—LŒ×LŒÌWLŒ‘‹ˆŠJKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹˜[YNˆKÛÚ[™ÙNˆHOˆÙ]JK\™Ù]˜[YJKXÙZÛ\ˆ—LŒ×LŒÌ×LŒWLŒ×LLŒ‘—LŒÌHLWLŒÍLŒWLŒÌWLNWLĞ×Lˆ‹İ[NˆÈX^ÚYˆHJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆX\™Ú[•ÜˆM›^Ü˜\ˆ	İÜ˜\	ÈHK]›Ü›\Ë›X\
Oˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÙ^NˆšYÛ\ÜÓ˜[YNˆXİ]™HOOHšYÈ	Øˆ	Èˆ	ØˆÉËÛÛXÚÎˆ

HOˆÈÙ]Xİ]™JšY
NÈYˆ
JİXœÖÜšYH×JK›[™İ
BˆØY]›Ü›JšY
NÈHKˆšXÛÛ‹ˆˆ‹ˆ]KˆˆLÈ‹ˆ˜JÛİ[ÖÜšYK˜Xİ]™JKˆˆLWLŒÎWLŒ×LLŒ×LŒÌˆ‹ˆ˜JÛİ[ÖÜšYK˜[
JJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈİ™\™›İÖˆ	Ø]]ÉËX\™Ú[•ÜˆMHKˆ™XXİ˜Ü™X]Q[[Y[
X›H‹Èİ[NˆÈZ[•ÚYˆLHKˆ™XXİ˜Ü™X]Q[[Y[
XY‹[ˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆÈŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—L—LŒ×LHLWLŒÍLŒWLŒÌWLNHŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒÍLWLŒ×LŒÌWLÈL×LWLŒÌWLŒ×LÈŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒ×LŒÌWLŒWLŒLŒ×LŒÍÈLŒLŒÈLŒÌ×LŒ×LWLŒ×L—LÈŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒÍL—LŒ×LŒÌ×LÈLQ—LWLŒWLQ—LŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LLŒÍ—LŒÎWLĞ×LŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒŒ—LŒ‘WLŒÌWLĞ×LˆLWLŒÍLŒ×L×LŒ‘—LÈŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒWLŒ×LŒÌWLĞ×LŒ‘HLŒ×LŒWLŒÍWLŒ×LŠJJKˆ™XXİ˜Ü™X]Q[[Y[
›ÙH‹[›İÜË›X\

‹JHOˆÈ˜\ˆØKØÈ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹ÈÙ^Nˆ‹šYHKˆ™XXİ˜Ü™X]Q[[Y[
‹[˜JH
ÈJJKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[‹™\Ü^WÛ˜[YH‹\Ù\—Û˜[YH‹™š]™\—Û˜[YH	ø %	ÊJKˆ™XXİ˜Ü™X]Q[[Y[
‹È\ˆ›ˆˆK‹›[Øš[H	ø %	ÊKˆ™XXİ˜Ü™X]Q[[Y[
‹[‹™š]™\—Û˜[YHÈ6,v)öa¶a¶+öaÎˆ	Ü‹™š]™\—Û˜[Y_Xˆ
‹\Ù\—Û˜[YHÈ6ªv)ö,v*6,Nˆ	Ü‹\Ù\—Û˜[Y_Xˆ	ø %	ÊJKˆ™XXİ˜Ü™X]Q[[Y[
‹È\ˆ›ˆˆK‹˜Ú]ÚY	ø %	ÊKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆ˜˜YÙH‹İ[NˆÈÛÛÜˆ[X™\Š
ØHH‹š\×ØXİ]™JHOOH[	‰ˆØHOOH›ÚYÈØHˆ
‹œİ]\ÈOOH	ØXİ]™IÈÈHˆ
JHOOHHÈ	İ˜\ŠK[ÚÊIÈˆ	İ˜\ŠKY[™Ù\ŠIÈHK[X™\Š
ØˆH‹š\×ØXİ]™JHOOH[	‰ˆØˆOOH›ÚYÈØˆˆ
‹œİ]\ÈOOH	ØXİ]™IÈÈHˆ
JHOOHHÈ	ö`v.v)öa	Èˆ	ö.¶ã6,v`v.v)öa	ÊJKˆ™XXİ˜Ü™X]Q[[Y[
‹[šŠ‹›\İÜÙY[—Ø]
H	ø %	ÊKˆ™XXİ˜Ü™X]Q[[Y[
‹[šŠ‹˜Ü™X]YØ]
H	ø %	ÊJNÈJJJKˆ\›İÜË›[™İ	‰ˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈY[™Îˆ^[YÛˆ	ØÙ[\‰ÈHKˆ—LŒLŒÌWLŒ×LĞÈLŒÌWLŒLŒ×LŒH‹
ØHH]›Ü›\Ë™š[™
OˆšYOOHXİ]™JJHOOH[ØHOOH›ÚYÈ›ÚY‚ˆØK]KˆˆLWLŒÍLŒWLŒÌWLNWLĞÈLŒ—LŒLŒHL—LŒÍLŒ‘—LÈLŒ×LŒÌ×LŒKˆŠJJJNÂŸB™[˜İ[Ûˆ^\›Û\ØØ\J˜[YJHÈ™]\›ˆİš[™Ê˜[YHOOH[	‰ˆ˜[YHOOH›ÚYÈ˜[YHˆ	ÉÊKœ™\XÙJÖÉˆ‰×KÙËÚ\˜Xİ\ˆOˆ
È	É‰Îˆ	É˜[\ÉË	Ï	Îˆ	É›ÉË	Ï‰Îˆ	É™İÉË	È‰Îˆ	Éœ][İÉË‰Èˆ	ÉˆÌÎNÉÈVØÚ\˜Xİ\—JJNÈB™[˜İ[Ûˆ^\›Û[X™\Š˜[YKXÚ[X[ÈH
HÈ™]\›ˆ˜[YHOOH[˜[YHOOH[™Yš[™Y˜[YHOOH	ÉÈÈ	ø %	Èˆ[X™\Š˜[YJKÓØØ[Tİš[™Ê	Ù˜KRT‰ËÈX^[][Qœ˜Xİ[Û‘YÚ]ÎˆXÚ[X[ÈJNÈB™[˜İ[Ûˆ^\›ÛÛ\[
›İË^[İ]
HÂˆÛÛœİ[ÛÈHÉö`v,vb6,v+öã6a‰Ë	ö)ö,v+öã6*6aö-6*‰Ë	ö+¶,v+ö)ö+ÉË	ö*¶ã6,IË	öav,v+ö)ö+ÉË	ö-6aö,vã6b6,IË	öavaö,IË	ö(¶*6)öa‰Ë	ö(¶,6,IË	ö+öã	Ë	ö*6aöava‰Ë	ö)ö,ö`va¶+É×NÂˆÛÛœİš[™[™ÜÈHÈ	öa¶)öaIÎˆ	Ùš\œİÛ˜[YIË	öa¶)öaH6+¶)öa¶b6)ö+ö«öã	Îˆ	Û\İÛ˜[YIË	öªv+È6ava6ã	Îˆ	Û˜][Û˜[ØÛÙIË	ö,öav*‰Îˆ	Ü›ÛIË	ö-v`v,H6av+6,v+ÈH6ã6ªH6av*¶)öaöa	Îˆ	ÛX\œšYY	Ë	ö*¶.v+ö)ö+È6`v,v,¶a¶+ÉÎˆ	ØÚ[™[‰Ë	ö,vb6,ˆ6ªv)ö,vªv,v+È6ªva	Îˆ	Ù^\ÉË	öav,v+¶-vã	Îˆ	ÛX]™WÙ^\ÉË	ö.¶ã6*6*‰Îˆ	ØXœÙ[˜ÙWÙ^\ÉË	ö)ö,ö*¶.va6)ö+6ã	Îˆ	ÜÚXÚ×Ù^\ÉË	ö,vb6,ˆ6ªv)ö,vªv,v+È6avb6*ö,IÎˆ	ÙY™™Xİ]™WÙ^\ÉË	ö+ö,ö*¶av,¶+È6,vb6,¶)öa¶aÉÎˆ	ÙZ[WİØYÙIË	öav,¶+È6,öa¶b6)ö*‰Îˆ	ÜÙ[š[Üš]WİØYÙIË	öav,¶+È6-6.¶a	Îˆ	Ú›Ø—İØYÙIË	ö+v`¶b6`ˆ6av)öaöã6)öa¶aÉÎˆ	Û[ÛWİØYÙIË	ö+v`ˆ6*¶)öaöa	Îˆ	ÛX\œšXYÙIË	ö+v`ˆ6)öb6a6)ö+ÉÎˆ	ØÚ[Ø[İØ[˜ÙIË	ö,ö)ö.v*ˆ6+6av.vaÈ6ªv)ö,vã	Îˆ	ÙœšY^WÚİ\œÉË	ö+6av.vaÈ6ªv)ö,vã	Îˆ	ÙœšY^WØ[[İ[	Ë	ö,ö)ö.v*ˆ6*¶.v-öã6a6ªv)ö,vã	Îˆ	ÚÛY^WÚİ\œÉË	ö*¶.v-öã6a6ªv)ö,vã	Îˆ	ÚÛY^WØ[[İ[	Ë	ö,ö)ö.v*ˆ6-6*6ªv)ö,vã	Îˆ	ÛšYÚÚİ\œÉË	ö-6*6ªv)ö,vã	Îˆ	ÛšYÚØ[[İ[	Ë	ö+ö,v-v+È6a¶b6*6*ˆ6ªv)ö,vã	Îˆ	ÜÚYÜ\˜Ù[	Ë	öav*6a6.ˆ6a¶b6*6*ˆ6ªv)ö,vã	Îˆ	ÜÚYØ[[İ[	Ë	ö,ö)ö.v*ˆ6)ö-¶)ö`vaÈ6ªv)ö,IÎˆ	Ûİ™\[YWÚİ\œÉË	ö)ö-¶)ö`vaÈ6ªv)ö,IÎˆ	Ûİ™\[YWØ[[İ[	Ë	ö+v`ˆ6av,öªva‰Îˆ	Úİ\Ú[™ÉË	ö+v`ˆ6*6a‰Îˆ	Ù›ÛÙ	Ë	öav*¶`v,v`¶aÉÎˆ	Ûİ\‰Ë	ö+6av.H6+v`¶b6`ˆ6b6av,¶)öã6)ÉÎˆ	ÙÜ›ÜÜÉË	öav,ö)ö.v+öaËö,ö)öã6,H6ªv,öb6,v)ö*‰Îˆ	ØY˜[˜ÙIË	ö*6ã6avaÈ6*¶)öavã6aˆ6)ö+6*¶av)ö.vã	Îˆ	Ú[œİ\˜[˜ÙIË	öav)öa6ã6)ö*‰Îˆ	İ^	Ë	ö+¶)öa6-H6o¶,v+ö)ö+¶*¶ã	Îˆ	Û™]	ÈNÂˆÛÛœİÙ[ÈH^[İ]˜ÛÛ›ÛË›X\
ÛÛ›ÛOˆÂˆÛÛœİÜÚ][ÛˆHY‰Ó[X™\ŠÛÛ›Û“Y
HÈ^[İ]ÚY
ˆLINİÜ‰Ó[X™\ŠÛÛ›Û•Ü
HÈ^[İ]šZYÚ
ˆLINİÚY‰Ó[X™\ŠÛÛ›Û•ÚY
HÈ^[İ]ÚY
ˆLINÚZYÚ‰Ó[X™\ŠÛÛ›Û’ZYÚ
HÈ^[İ]šZYÚ
ˆLINØÂˆYˆ
ÛÛ›ÛšÚ[™OOH	Ô™Xİ[™ÛIÈÛÛ›ÛšÚ[™OOH	Ó[™IÊBˆ™]\›ˆ]ˆÛ\ÜÏH‰ØÛÛ›ÛšÚ[™OOH	Ó[™IÈÈ	Ù]šY\‰Èˆ	Ùœ˜[YIßHˆİ[OH‰ÜÜÚ][ÛŸHÙ]˜ÂˆYˆ
ÛÛ›ÛšÚ[™OOH	Ò[XYÙIÊBˆ™]\›ˆ[YÈ[H¶a¶-6)öaˆ6-6,vªv*ˆˆÜ˜ÏH‰Ü^\›Û\ØØ\J^[İ]›ÙÛÊ_Hˆİ[OH‰ÜÜÚ][ÛŸ[Øš™XİYš]˜ÛÛZ[ˆ˜ÂˆÛÛœİšY[Hš[™[™ÜÖØÛÛ›ÛÛÛ›ÛÛİ\˜ÙWNÂˆÛÛœİ˜[YHHÛÛ›ÛšÚ[™OOH	Õ^›Ş	ÈÈ
šY[È›İË™]VÙšY[Hˆ[
Hˆ
ÛÛ›Û“˜[YHOOH	ÓX™[‰ÈÈ	Û[ÛÖÓ[X™\Š›İËœ\š[ÙÚ›JHHW_vav)öaÈ	Ó[X™\Š›İËœ\š[ÙÚJKÓØØ[Tİš[™Ê	Ù˜KRT‰ËÈ\ÙQÜ›İ\[™Îˆ˜[ÙHJ_XˆÛÛ›ÛØ\[ÛŠNÂˆÛÛœİ^HÛÛ›ÛšÚ[™OOH	Õ^›Ş	È	‰ˆVÉÙš\œİÛ˜[YIË	Û\İÛ˜[YIË	Û˜][Û˜[ØÛÙIË	Ü›ÛI×Kš[˜ÛY\ÊšY[
HÈ
˜[YHOOH[˜[YHOOH[™Yš[™YÈ	ÉÈˆ^\›Û[X™\Š˜[YKÛÛ›Û‘›Ü›X]OOH	ÑÙ[™\˜[[X™\‰ÈÈˆˆ
JHˆ˜[YNÂˆÛÛœİ›ŞYHÛÛ›ÛšÚ[™OOH	Õ^›Ş	ÈÉÓX™[ÉË	ÓX™[	Ë	ÓX™[I×Kš[˜ÛY\ÊÛÛ›Û“˜[YJNÂˆ™]\›ˆ]ˆÛ\ÜÏH˜Ù[	Ø›ŞYÈ	Ø›ŞY	Èˆ	ÉßHˆİ[OH‰ÜÜÚ][ÛŸY›Û\Ú^™N‰Ó[X™\ŠÛÛ›Û‘›ÛÚ^™HL
_\Ù›Û]ÙZYÚ‰Ó[X™\ŠÛÛ›Û‘›ÛÙZYÚ
_H‰Ü^\›Û\ØØ\J^
_OÙ]˜ÂˆJKš›Ú[Š	ÉÊNÂˆ™]\›ˆYØİ\H[[[™ÏH™˜Hˆ\HœXYY]HÚ\œÙ]H]‹N]O¶`vã6-6+v`¶b6`¶ã	Ü^\›Û\ØØ\J›İËœ\š[ÙÚH
È	ËÉÈ
È›İËœ\š[ÙÚ›J_Oİ]O[šÈ™[Hœİ[\ÚY]ˆ™YH‹İ™[™Ü‹İ˜^š\›X]‹Õ˜^š\›X]‹Y›ÛY˜XÙK˜ÜÜÈİ[OYÙ^ÜÚ^™NMH[™ØØ\NÛX\™Ú[[[_JØ›Ş\Ú^š[™Î˜›Ü™\‹X›ŞX›Ù^ÛX\™Ú[ŒØ˜XÚÙÜ›İ[™Ú]NØÛÛÜ˜›XÚÎÙ›ÛY˜[Z[N‰ĞˆÛXIË˜^š\›X]‹ZÛXKØ[œË\Ù\šYŸKœÛ\ÜÜÚ][Ûœ™[]]™NÙ\™Xİ[Û›İÚYŒŒ[NÚZYÚ‰ÌŒ
ˆ^[İ]šZYÚÈ^[İ]ÚY[[_KœÛ\ŠÜÜÚ][Û˜XœÛÛ]_K˜Ù[Ù\™Xİ[ÛœÙ\Ü^N™›^Ø[YÛ‹Z][\Î˜Ù[\Ú\İYKXÛÛ[˜Ù[\İÚ]K\ÜXÙN››İÜ˜\Û[™KZZYÚŒKŒ_K˜›ŞYØ›Ü™\‹Œ›[HÛÛY›XÚÎØ˜XÚÙÜ›İ[™Ú]_K™œ˜[Y^Ø›Ü™\‹Œ›[HÛÛYÎNNNÜÚ[\‹Y]™[Î››Û™_K™]šY\Ø›Ü™\‹[Y‹Œ›[HÛÛYØXXNÜÚ[\‹Y]™[Î››Û™_K˜Xİ[ÛœŞÜY[™ÎŒLœİ^X[YÛ˜Ù[\ŸPYYXHš[Ë˜Xİ[ÛœŞÙ\Ü^N››Û™_X›Ù^İÚYŒŒ[__OÜİ[OÚXY›ÙO]ˆÛ\ÜÏH˜Xİ[ÛœÈ]ÛˆÛ˜ÛXÚÏHÚ[™İËœš[

H¶¡¶)öoˆ6`vã6-MOØ]Ûˆ8 %6av`¶ã6)ö,È6ìvì6ì6j¶#6*6+öb6aˆ6,ö,v*6,v«È6av,vb6,v«ö,OÙ]XZ[ˆÛ\ÜÏHœÛ\‰ØÙ[ßOÛXZ[Ø›ÙOÚ[˜ÂŸB˜\Ş[˜È[˜İ[Ûˆ^\›Ûš[
Y
HÂˆÛÛœİÜ\HÚ[™İË›Ü[Š	ÉË	×Ø›[šÉÊNÂˆYˆ
\Ü\
HÂˆ[\
	ö*6,v)öã6¡¶)öo¶#6)ö+6)ö,¶aöe6*6)ö,ˆ6-6+öaˆ6o¶a¶+6,vaÈ6,v)È6*6+öaöã6+Ë‰ÊNÂˆ™]\›ÂˆBˆÜ\™Øİ[Y[Üš]J	Ï\Hœ¶+ö,H6+v)öa6(¶av)ö+öaø #6,ö)ö,¶ã6`vã6-8 )Ü‰ÊNÂˆHÂˆÛÛœİÙ]Z[™\ÜÛœÙWHH]ØZ]›ÛZ\ÙK˜[
ÑÑU
	ËØYZ[‹Ü^\›ÛÉÈ
ÈY
K™]Ú
	ËØ\ÜÙ]ËÜ^\›ÛXXØÙ\ÜË[^[İ]šœÛÛ‰ÊWJNÂˆYˆ
\™\ÜÛœÙK›ÚÊBˆ›İÈ™]È\œ›ÜŠ	ö`¶)öa6*6¡¶)öoˆ6*6)ö,v«ö,6)ö,vã6a¶-6+ÉÊNÂˆÛÛœİ^[İ]H]ØZ]™\ÜÛœÙKšœÛÛŠ
NÂˆÜ\™Øİ[Y[›Ü[Š
NÂˆÜ\™Øİ[Y[Üš]J^\›ÛÛ\[
]Z[œ›İË^[İ]
JNÂˆÜ\™Øİ[Y[˜ÛÜÙJ
NÂˆ]ØZ]Ü\™Øİ[Y[™›ÛËœ™XYNÂˆÜ\™Øİ[Y[œ]Y\TÙ[XİÜ[
	Ë˜Ù[	ÊK™›Ü‘XXÚ
Ù[OˆÈYˆ
Ù[œØÜ›ÛÚYˆÙ[˜ÛY[ÚY
HÂˆÛÛœİÚ^™HH\œÙQ›Ø]
Ü\™Ù]ÛÛ\]Yİ[JÙ[
K™›ÛÚ^™JNÂˆÙ[œİ[K™›ÛÚ^™HHX]›X^
Ú^™H
ˆÙ[˜ÛY[ÚYÈÙ[œØÜ›ÛÚY
H
È	Ü	ÎÂˆHJNÂˆ]ØZ]›ÛZ\ÙK˜[
\œ˜^K™œ›ÛJÜ\™Øİ[Y[š[XYÙ\ÊK›X\
[XYÙHOˆ[XYÙK˜ÛÛ\]HÈ›ÛZ\ÙKœ™\ÛÛ™J
Hˆ™]È›ÛZ\ÙJ™\ÛÛ™HOˆÈ[XYÙK›Û›ØYH™\ÛÛ™NÈ[XYÙK›Û™\œ›ÜˆH™\ÛÛ™NÈJJJNÂˆYˆ
\Ü\˜ÛÜÙY
HÂˆÜ\™›Øİ\Ê
NÂˆÜ\œš[

NÂˆBˆBˆØ]Ú
\œ›ÜŠHÂˆYˆ
\Ü\˜ÛÜÙY
BˆÜ\˜ÛÜÙJ
NÂˆ[\
\œ›Ü‹›Y\ÜØYÙH	ö(¶av)ö+öaø #6,ö)ö,¶ã6¡¶)öoˆ6a¶)öavb6`v`ˆ6*6b6+ÉÊNÂˆBŸB™[˜İ[ÛˆÛÛ\[T^\›Û\ØY

HÂˆÛÛœİÚK›WHHÙ^RŠ
NÂˆÛÛœİÙ›Ü›KÙ]›Ü›WHH\ÙTİ]JÈ\š[ÙÚNˆK\š[ÙÚ›Nˆ›HJNÂˆÛÛœİÙš[KÙ]š[WHH\ÙTİ]J[
NÂˆÛÛœİÜ™]šY]ËÙ]™]šY]×HH\ÙTİ]J[
NÂˆÛÛœİÜ™\XÙKÙ]™\XÙWHH\ÙTİ]J˜[ÙJNÂˆÛÛœİØ\ŞKÙ]\ŞWHH\ÙTİ]J˜[ÙJNÂˆÛÛœİÛY\ÜØYÙKÙ]Y\ÜØYÙWHH\ÙTİ]J	ÉÊNÂˆÛÛœİØÚÈH\ÙT™YŠ˜[ÙJNÂˆÛÛœİ™\Ù]H

HOˆÈÙ]™]šY]Ê[
NÈÙ]™\XÙJ˜[ÙJNÈÙ]Y\ÜØYÙJ	ÉÊNÈNÂˆÛÛœİİX›Z]H\Ş[˜È
ÛÛ[Z]
HOˆÂˆYˆ
ØÚË˜İ\œ™[
Bˆ™]\›ÂˆYˆ
Yš[JHÂˆÙ]Y\ÜØYÙJ	ö`v)öã6aÖ6-6,vªv*ˆ6,v)È6)öa¶*¶+¶)ö*6ªva¶ã6+Ë‰ÊNÂˆ™]\›ÂˆBˆYˆ
ÛÛ[Z]	‰ˆ
\™]šY]È
™]šY]Ëœ™]š\Ú[Ûˆ	‰ˆ\™\XÙJJJHÂˆÙ]Y\ÜØYÙJ	öo¶ã6-8 #6a¶av)öã6-6b6*¶(öã6ã6+È6+6)öã6«ö,¶ã6a¶ã6a6)ö,¶aH6)ö,ö*‹‰ÊNÂˆ™]\›ÂˆBˆØÚË˜İ\œ™[HYNÂˆÙ]\ŞJYJNÂˆÙ]Y\ÜØYÙJ	ÉÊNÂˆHÂˆÛÛœİ›ÙHH™]È›Ü›Q]J
NÂˆ›ÙK˜\[™
	Ùš[IËš[JNÂˆØš™Xİ™[šY\Ê›Ü›JK™›Ü‘XXÚ

ÚÙ^K˜[YWJHOˆ›ÙK˜\[™
Ù^Kİš[™Ê˜[YJJJNÂˆ›ÙK˜\[™
	Û[ÙIËÛÛ[Z]È	ØÛÛ[Z]	Èˆ	Ü™]šY]ÉÊNÂˆYˆ
ÛÛ[Z]
HÂˆ›ÙK˜\[™
	İÚÙ[‰Ë™]šY]ËÚÙ[ŠNÂˆ›ÙK˜\[™
	Ü™\XÙIË™\XÙHÈ	ÌIÈˆ	Ì	ÊNÂˆBˆÛÛœİ™\ÜÛœÙHH]ØZ]Ù™]ÚÚ]]]
TWĞTÑH
È	ËØYZ[‹Ü^\›ÛÚ[\Ü	ËÈY]Ùˆ	ÔÔÕ	Ë›ÙHJNÂˆÛÛœİ™\İ[H]ØZ]Ü™XYœÛÛ”™\ÜÛœÙJ™\ÜÛœÙJNÂˆYˆ
\™\ÜÛœÙK›ÚÊBˆ›İÈ™]È\œ›ÜŠ™\İ[™\œ›Üˆ	ö*6)ö,v«ö,6)ö,vã6a¶)öavb6`v`ˆ6*6b6+ÉÊNÂˆYˆ
ÛÛ[Z]
HÂˆÚ[˜[Y]PØXÚJ
NÂˆÙ]™]šY]Ê[
NÂˆÙ]™\XÙJ˜[ÙJNÂˆÙ]Y\ÜØYÙJ	ø§$È	È
È™\İ[˜Ûİ[
È	È6,v+öã6`H6*ö*6*ˆ6-6+ö&È6`vã6-8 #6aö)öã6*¶-ö*6ã6`¸ #6ã6)ö`v*¶aÈ6+ö,H6)öa¶+ö,vb6ã6+È6`¶)ö*6a6av-6)öaö+öaø #6)öa¶+Ë‰ÊNÂˆBˆ[ÙBˆÙ]™]šY]Ê™\İ[
NÂˆBˆØ]Ú
\œ›ÜŠHÂˆÙ]Y\ÜØYÙJ\œ›Ü‹›Y\ÜØYÙJNÂˆYˆ
ÛÛ[Z]
HÂˆÙ]™]šY]Ê[
NÂˆÙ]™\XÙJ˜[ÙJNÂˆBˆBˆš[˜[HÂˆØÚË˜İ\œ™[H˜[ÙNÂˆÙ]\ŞJ˜[ÙJNÂˆBˆNÂˆ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ˜Ø\™\ˆKˆ™XXİ˜Ü™X]Q[[Y[
šÈ‹[—LŒLŒ×LŒÌWLQ—LŒÌLŒ×LŒÌWLĞÈLWLŒ×LĞ×LLŒ‘L—LLˆLŒÍLŒÌWLNWLŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]YˆK—LWL—LŒÍÈÖLWLŒÍ×LŒ×LŒLˆL—LWLL—L×LMLŒÍLŒÌWLNWLŒWLŒPˆLLŒ×LŒ‘LŒ‘ˆLWLŒLŒ×LLŒĞHLŒÌWLĞ×LŒ×LLŒ×LŒÌ×LŒKˆLŒ×LŒLŒWLŒ‘—LŒÈLÑWLĞ×LŒÍLŒ×L—LWLŒ×LĞ×LŒÍLŒÌWLŒÈLŒLŒÌWLŒÌWLŒÌ×LĞÈLLŒÌ×LÑWLŒÌÈLŒ—LŒLŒHL—L×LŒ×LĞ×LĞÈLNWL—LĞ×LŒ‘‹ˆLŒ×LŒÍ×LLŒ×LŒÎWLŒ×LŒHLŒ×LĞ×LˆLWLŒ×LĞ×LLŒÈLŒWLŒŒ×LĞ×LĞ×LŒ‘ˆLŒLŒ×L—LNWLĞÈLLŒ×LŒÌWLĞ×LŒÌˆL—LĞ×LŒÌ×LŒKˆŠKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆL›^Ü˜\ˆ	İÜ˜\	ËX\™Ú[•ÜˆMHKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹[ˆ—LŒÌ×LŒ×L‹ˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹È˜\šXK[X™[ˆ—LŒÌ×LŒ×LLŒ‘L—LLˆ‹Û\ÜÓ˜[YNˆš[œ]‹\Nˆ›[X™\ˆ‹Z[ˆŒLÌ‹X^ˆŒML‹\ØX›Yˆ\ŞK˜[YNˆ›Ü›Kœ\š[ÙÚKÛÚ[™ÙNˆ]™[OˆÈ™\Ù]

NÈÙ]›Ü›JÈ‹‹™›Ü›K\š[ÙÚNˆ]™[\™Ù]˜[YHJNÈHJJKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹[ˆ—LWLŒ×LÈ‹ˆ™XXİ˜Ü™X]Q[[Y[
œÙ[Xİ‹È˜\šXK[X™[ˆ—LWLŒ×LÈLŒ‘L—LLˆ‹Û\ÜÓ˜[YNˆš[œ]‹\ØX›Yˆ\ŞK˜[YNˆ›Ü›Kœ\š[ÙÚ›KÛÚ[™ÙNˆ]™[OˆÈ™\Ù]

NÈÙ]›Ü›JÈ‹‹™›Ü›K\š[ÙÚ›Nˆ]™[\™Ù]˜[YHJNÈHK\œ˜^K™œ›ÛJÈ[™İˆLˆK
Ë[™^
HOˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹ÈÙ^Nˆ[™^
ÈK˜[YNˆ[™^
ÈHK[™^
ÈJJJJKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹È˜\šXK[X™[ˆ—LWLŒ×LĞ×LLŒ‘L—LLˆLŒÍLŒÌWLNWLŒH‹\Nˆ™š[H‹XØÙ\ˆ‹Ş‹\ØX›Yˆ\ŞKÛÚ[™ÙNˆ]™[OˆÈ˜\ˆØNÈ™\Ù]

NÈÙ]š[J

ØHH]™[\™Ù]™š[\ÊHOOH[ØHOOH›ÚYÈ›ÚYˆØVÌJH[
NÈHJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹\ØX›Yˆ\ŞHYš[KÛÛXÚÎˆ

HOˆİX›Z]
˜[ÙJHK\ŞHÈ	ö+ö,H6+v)öa6o¶,v+ö)ö,¶-8 )‰Èˆ	ö*6,v,v,öã6b6o¶ã6-8 #6a¶av)öã6-	ÊJKˆY\ÜØYÙH	‰ˆ™XXİ˜Ü™X]Q[[Y[
œ‹È›ÛNˆœİ]\ÈˆKY\ÜØYÙJKˆ™]šY]È	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈX\™Ú[•ÜˆMˆHKˆ™XXİ˜Ü™X]Q[[Y[
œ‹[ˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[ˆ™]šY]Ë˜Ûİ[ˆˆLŒÌWLŒ‘—LĞ×LWLŒPˆ‹ˆ™]šY]Ë›X]ÚYˆˆLŒWLŒÍ×LŒLĞ×LˆLĞ×LNWLŒWLŒ×LŒPˆ‹ˆ™]šY]Ë˜Ûİ[H™]šY]Ë›X]ÚYˆˆL—LĞ×LŒ×LŒÌ—LWL—LŒ‘ˆLŒWLŒÍ×LŒLĞ×LˆLŒ‘—LŒÌ×LŒWLĞÈŠJKˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]YˆK—LŒÌWLŒ‘—LĞ×LWLŒ×L×LŒ×LĞÈL—LŒ×LWL—LŒÍ×LŒLˆLŒLŒÌWLŒ×LĞÈLWLŒ‘—LĞ×LŒÌHLŒ‘LWLŒÎLWLĞ×LŒ×LŒÍLL—LŒ‘ˆLLŒLÈL×LĞ×LˆLNWLŒ×LŒÌWLŒLŒÌWLĞÈL—LWLŒ×LĞ×LŒÍLŒ‘—LŒ×LŒ‘—LÈL—LWLĞ×LŒ×LŒÍLL—LŒ‘‹ˆL—LŒ×LHLL—LŒ×LHLŒ‘WLŒ×L—LLŒ×LŒ‘—LQ—LĞÈLŒLŒÌWLŒ×LĞÈLŒWLŒÍ×LŒLĞ×LˆLŒ‘WLLŒ‘—LNWLŒ×LŒÌHLŒ×LŒÌ×LŒWLWLŒ×LŒ‘—LÈL—LWLĞ×LŒ×LŒÍLLŒ‘‹ˆŠKˆ™]šY]Ëœ™]š\Ú[Ûˆˆ	‰ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹[ˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹È\Nˆ˜ÚXÚØ›Ş‹ÚXÚÙYˆ™\XÙKÛÚ[™ÙNˆ]™[OˆÙ]™\XÙJ]™[\™Ù]˜ÚXÚÙY
K\ØX›Yˆ\ŞHJKˆˆLŒWLŒŒ×LĞ×LĞ×LŒ‘ˆLŒ×LŒ×LĞ×LQ—LŒÌ—LĞ×L—LĞÈL—LŒÌ×LŒ‘WL×LMLWLŒÎWLŒ×LLŒ×LĞ×LˆLWLŒ×L×LŒPˆL—LŒÌ×LŒ‘WL×LML—LŒLLĞÈLŒ‘—LŒÌHLŒÌ×LŒ×LŒL—L×LMLŒÌ×LŒÌWLLŒÌHLŒ‘LWLŒÎLWLĞ×LŒ×LŒÍLLŒ‘‹ˆŠKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈİ™\™›İÎˆ	Ø]]ÉËX^ZYÚˆŒHKˆ™XXİ˜Ü™X]Q[[Y[
X›H‹ÈÛ\ÜÓ˜[YNˆ›ˆKˆ™XXİ˜Ü™X]Q[[Y[
XY‹[ˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒÌWLŒ‘—LĞ×LHLŒ×LNWLŒÌ×LŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LÑWLŒÌWLŒÌ×L—LŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LNWLŒ‘ˆLWLLĞÈŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒ‘WLŒ×LLŒÍHLÑWLŒÌWLŒ‘—LŒ×LŒ‘WLŒWLĞÈ
LŒÌWLĞ×LŒ×L
HŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒWLŒÍ×LŒLĞ×LˆŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—L×LŒÍLŒ‘—LŒ×LŒÌHŠJJKˆ™XXİ˜Ü™X]Q[[Y[
›ÙH‹[™]šY]Ëœ›İÜË›X\
›İÈOˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹ÈÙ^Nˆ›İËœÛİ\˜ÙWÜ›İÈKˆ™XXİ˜Ü™X]Q[[Y[
‹[›İËœÛİ\˜ÙWÜ›İÊKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ›İË™]K™š\œİÛ˜[YKˆˆ‹ˆ›İË™]K›\İÛ˜[YJKˆ™XXİ˜Ü™X]Q[[Y[
‹[›İË™]K›˜][Û˜[ØÛÙJKˆ™XXİ˜Ü™X]Q[[Y[
‹[^\›Û[X™\Š›İË™]K›™]
JKˆ™XXİ˜Ü™X]Q[[Y[
‹[›İË\Ù\—ÚYÈ	öªv)ö,v*6,HÉÈ
È›İË\Ù\—ÚYˆ›İË›X]ÚÜİ]\ÈOOH	ØÛÛ™›Xİ	ÈÈ	ö*¶.v)ö,v-ˆ6-6a¶)ö,öaÉÈˆ	öa¶ã6)ö,¶ava¶+È6*¶-ö*6ã6`‰ÊKˆ™XXİ˜Ü™X]Q[[Y[
‹[›İËØ\›š[™ÜËš›Ú[Š	È	ÊJJJJJJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹İ[NˆÈX\™Ú[•ÜˆMK\ØX›Yˆ\ŞH
™]šY]Ëœ™]š\Ú[Ûˆˆ	‰ˆ\™\XÙJKÛÛXÚÎˆ

HOˆİX›Z]
YJHK—LŒ—LŒLŒHL—L×LŒ×LĞ×LĞÈLŒ×LŒÍ×LLŒ×LŒÎWLŒ×LŒHLŒ‘L—LLˆŠJJNÂŸB™[˜İ[ÛˆÛÛ\[T^\›Û\İ

HÂˆÛÛœİÙš[\œËÙ]š[\œ×HH\ÙTİ]JÈYX\ˆ	ÉË[Ûˆ	ÉËNˆ	ÉËİ]\Îˆ	ÉËYÙNˆHJNÂˆÛÛœİÜ™\İ[Ù]™\İ[HH\ÙTİ]J[
NÂˆÛÛœİÙ\œ›Ü‹Ù]\œ›Ü—HH\ÙTİ]J	ÉÊNÂˆÛÛœİØ\ŞKÙ]\ŞWHH\ÙTİ]J˜[ÙJNÂˆÛÛœİÜ™Yœ™\ÚÙ]™Yœ™\ÚHH\ÙTİ]J
NÂˆÛÛœİÙ]Z[Ù]]Z[HH\ÙTİ]J[
NÂˆÛÛœİÛX\[™ËÙ]X\[™×HH\ÙTİ]J[
NÂˆÛÛœİÜ]Y\KÙ]]Y\WHH\ÙTİ]J	ÉÊNÂˆÛÛœİİ\Ù\œËÙ]\Ù\œ×HH\ÙTİ]J×JNÂˆÛÛœİİ\Ù\’YÙ]\Ù\’YHH\ÙTİ]J	ÉÊNÂˆÛÛœİÙ[™\˜][ÛˆH\ÙT™YŠ
NÂˆÛÛœİXİ[ÛˆH\ÙT™YŠ˜[ÙJNÂˆ\ÙQY™™Xİ


HOˆÈÛÛœİ™\œÚ[ÛˆH
ÊÙÙ[™\˜][Û‹˜İ\œ™[ÈÙ]\ŞJYJNÈÙ]\œ›ÜŠ	ÉÊNÈÛÛœİ[Y\ˆHÙ][Y[İ]


HOˆÈÑU
	ËØYZ[‹Ü^\›ÛÉÈ
È™]ÈT“ÙX\˜Ú\˜[\Êš[\œÊJK[Š˜[YHOˆÈYˆ
™\œÚ[ÛˆOOHÙ[™\˜][Û‹˜İ\œ™[
BˆÙ]™\İ[
˜[YJNÈJK˜Ø]Ú
˜Z[\™HOˆÈYˆ
™\œÚ[ÛˆOOHÙ[™\˜][Û‹˜İ\œ™[
HÂˆÙ]™\İ[
[
NÂˆÙ]\œ›ÜŠ˜Z[\™K›Y\ÜØYÙJNÂˆHJK™š[˜[J

HOˆÈYˆ
™\œÚ[ÛˆOOHÙ[™\˜][Û‹˜İ\œ™[
BˆÙ]\ŞJ˜[ÙJNÈJNÈKL
NÈ™]\›ˆ

HOˆÈÛX\•[Y[İ]
[Y\ŠNÈÙ[™\˜][Û‹˜İ\œ™[
ÊÎÈNÈKÙš[\œË™Yœ™\ÚJNÂˆÛÛœİš[\ˆH
Ù^K˜[YJHOˆÙ]š[\œÊ™]š[İ\ÈOˆ
È‹‹œ™]š[İ\ËÚÙ^WNˆ˜[YKYÙNˆHJJNÂˆÛÛœİÚİÑ]Z[H\Ş[˜È
Y
HOˆÈYˆ
Xİ[Û‹˜İ\œ™[
Bˆ™]\›ÈXİ[Û‹˜İ\œ™[HYNÈHÂˆÙ]]Z[
]ØZ]ÑU
	ËØYZ[‹Ü^\›ÛÉÈ
ÈY
JNÂˆBˆØ]Ú
˜Z[\™JHÂˆÙ]\œ›ÜŠ˜Z[\™K›Y\ÜØYÙJNÂˆBˆš[˜[HÂˆXİ[Û‹˜İ\œ™[H˜[ÙNÂˆHNÂˆÛÛœİÙX\˜Ú\Ù\œÈH\Ş[˜È

HOˆÈYˆ
Xİ[Û‹˜İ\œ™[
Bˆ™]\›ÈXİ[Û‹˜İ\œ™[HYNÈHÂˆÛÛœİ˜[YHH]ØZ]‹œØ[\TÛ\\Ù\œÊ]Y\JNÂˆÙ]\Ù\œÊ˜[YKœ›İÜÈ×JNÂˆBˆØ]Ú
˜Z[\™JHÂˆÙ]\œ›ÜŠ˜Z[\™K›Y\ÜØYÙJNÂˆBˆš[˜[HÂˆXİ[Û‹˜İ\œ™[H˜[ÙNÂˆHNÂˆÛÛœİX]ÚH\Ş[˜È

HOˆÈÛÛœİÙ[XİYH\Ù\œË™š[™
\Ù\ˆOˆİš[™Ê\Ù\‹šY
HOOHİš[™Ê\Ù\’Y
JNÈYˆ
\Ù[XİY[X\[™ÈXİ[Û‹˜İ\œ™[
Bˆ™]\›ÈYˆ
XÛÛ™š\›J6*¶-ö*6ã6`ˆ6+ö,ö*¶ã0ªÉÛX\[™Ë™[\ŞYYWÛ˜[Y_p®È6*6)È0ªÉÜÙ[XİY›˜[YHÙ[XİY\Ù\›˜[Y_p®ö'È6)öã6aˆ6`vã6-6*6aÈ6)öã6aˆ6+v,ö)ö*6a¶av)öã6-6+ö)ö+öaÈ6+¶b6)öaö+È6-6+Ë˜
JBˆ™]\›ÈXİ[Û‹˜İ\œ™[HYNÈHÂˆ]ØZ]ÑS‘
	ÔU	Ë	ËØYZ[‹Ü^\›ÛÉÈ
ÈX\[™ËšY
È	ËÛX]Ú	ËÈ\Ù\—ÚYˆ[X™\Š\Ù\’Y
HJNÂˆÙ]X\[™Ê[
NÂˆÙ]™Yœ™\Ú
˜[YHOˆ˜[YH
ÈJNÂˆBˆØ]Ú
˜Z[\™JHÂˆÙ]\œ›ÜŠ˜Z[\™K›Y\ÜØYÙJNÂˆBˆš[˜[HÂˆXİ[Û‹˜İ\œ™[H˜[ÙNÂˆHNÂˆ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ˜Ø\™\ˆKˆ™XXİ˜Ü™X]Q[[Y[
šÈ‹[—LWLĞ×LŒÍLŒ×L×LŒ×LĞÈLŒ‘L—LL—LĞÈLÑWLŒÌWLŒÌ×L—LŠKˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]YˆK—LWLŒLŒ×LLŒĞHLŒÍ×LŒLˆLWLŒ×LĞ×LLŒÍLŒÌWLNWLŒH
LŒÌWLĞ×LŒ×L
WLŒPˆLŒ×LĞ×LˆLŒ×LŒÍ×LLŒ×LŒÎWLŒ×LŒHLŒL×LŒ×LŒWL—L×LŒ×LĞ×LĞÈLŒÌWLŒÌ×LĞ×LŒ‘ˆLŒLŒ×L—LNWLĞÈLLŒ×LŒÌWLĞ×LŒÌˆLWLŒ‘LŒÌ×LLŒL—LWLĞ×LŒ×LŒÍLLŒ‘‹ˆŠKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ˜Ø\™\‹İ[NˆÈ˜XÚÙÜ›İ[™ˆ˜\ŠK\İ\™˜XÙKÙ˜Y˜ÊH‹›Ü™\”˜Y]\ÎˆMY[™ÎˆMX\™Ú[›İÛNˆMHKˆ™XXİ˜Ü™X]Q[[Y[
š‹Èİ[NˆÈX\™Ú[ˆŒLœˆHK—LŒ×LŒÌ×LŒWLŒ×LLLWLĞ×LLŒWLŒÌHLWLĞ×LŒÍLŒ×L×LŒ×LĞÈLÑWLŒÌWLŒÌ×L—LŠKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆ›^Ü˜\ˆ	İÜ˜\	Ë[YÛ’][\Îˆ™[™ˆHKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹˜\šXK[X™[ˆ—LWLĞ×LLŒWLŒÌHLŒÌ×LŒ×L‹\Nˆ›[X™\ˆ‹XÙZÛ\ˆ—L×LWL×LMLŒÌ×LŒ×LLŒ×L×LŒÈ‹˜[YNˆš[\œËYX\‹ÛÚ[™ÙNˆ]™[Oˆš[\Š	ŞYX\‰Ë]™[\™Ù]˜[YJHJKˆ™XXİ˜Ü™X]Q[[Y[
œÙ[Xİ‹ÈÛ\ÜÓ˜[YNˆš[œ]‹˜\šXK[X™[ˆ—LWLĞ×LLŒWLŒÌHLWLŒ×LÈ‹˜[YNˆš[\œË›[ÛÛÚ[™ÙNˆ]™[Oˆš[\Š	Û[Û	Ë]™[\™Ù]˜[YJHKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆˆˆK—L×LWL×LMLWLŒ×L×LŒ×L×LŒÈŠKˆ\œ˜^K™œ›ÛJÈ[™İˆLˆK
Ë[™^
HOˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹ÈÙ^Nˆ[™^˜[YNˆ[™^
ÈHK[™^
ÈJJJKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹XÙZÛ\ˆ—L—LŒ×LWLŒÈLNWLŒ‘ˆLWLLĞ×LŒÈLŒÍLWLŒ×LŒÌWLÈLÑWLŒÌWLŒÌ×L—LLĞÈLĞ×LŒÈLŒÌ×LWLŒH‹˜[YNˆš[\œËœKÛÚ[™ÙNˆ]™[Oˆš[\Š	ÜIË]™[\™Ù]˜[YJHJKˆ™XXİ˜Ü™X]Q[[Y[
œÙ[Xİ‹ÈÛ\ÜÓ˜[YNˆš[œ]‹˜\šXK[X™[ˆ—LLŒÍ—LŒÎWLĞ×LŒHLŒWLŒÍ×LŒLĞ×Lˆ‹˜[YNˆš[\œËœİ]\ËÛÚ[™ÙNˆ]™[Oˆš[\Š	Üİ]\ÉË]™[\™Ù]˜[YJHKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆˆˆK—L×LWL×LMLŒÌWLŒ‘—LĞ×LWLŒ×L×LŒÈŠKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆœ[™[™ÈˆK—L—LĞ×LŒ×LŒÌ—LWL—LŒ‘ˆLŒWLŒÍ×LŒLĞ×LˆLŒ‘—LŒÌ×LŒWLĞÈŠJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹ÛÛXÚÎˆ

HOˆÙ]™Yœ™\Ú
˜[YHOˆ˜[YH
ÈJHK—LŒWLŒ×LŒÌ—L×LŒ×LŒÌ×LŒ×LŒÌ—LĞÈŠKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹ÛÛXÚÎˆ

HOˆÙ]š[\œÊÈYX\ˆˆ‹[Ûˆˆ‹Nˆˆ‹İ]\Îˆˆ‹YÙNˆHJHK—LÑWLŒ×LNWLŒ×LNWLŒÌWLŒ‘—LˆLWLĞ×LLŒWLŒÌWL×LŒÈŠJJKˆ\œ›Üˆ	‰ˆ™XXİ˜Ü™X]Q[[Y[
œ‹È›ÛNˆ˜[\ˆK\œ›ÜŠKˆ\ŞHÈ™XXİ˜Ü™X]Q[[Y[
œ‹È›ÛNˆœİ]\ÈˆK—LŒ‘—LŒÌHLŒ‘LŒ×LLŒ‘—LŒÌWLĞ×LŒ×LWLŒWLŒˆŠHˆ™\İ[	‰ˆ™XXİ˜Ü™X]Q[[Y[
™XXİ‘œ˜YÛY[[ˆ™XXİ˜Ü™X]Q[[Y[
œ‹[ˆ™\İ[œİ[[X\K˜Ûİ[ˆˆLWLĞ×LŒÍLÈLŒ×LWLŒÎHLŒ‘WLŒ×LLŒÍNˆ‹ˆ^\›Û[X™\Š™\İ[œİ[[X\Kİ[Û™]
KˆˆLŒÌWLĞ×LŒ×LLÈL—LŒ×LWL—LŒÍ×LŒLˆ‹ˆ™\İ[œİ[[X\Kœ[™[™È
Kˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈİ™\™›İÎˆ	Ø]]ÉÈHKˆ™XXİ˜Ü™X]Q[[Y[
X›H‹ÈÛ\ÜÓ˜[YNˆ›ˆKˆ™XXİ˜Ü™X]Q[[Y[
XY‹[ˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
‹[—LWLŒ×LÈŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LÑWLŒÌWLŒÌ×L—LŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒÍLWLŒ×LŒÌWLÈLÑWLŒÌWLŒÌ×L—LLĞÈŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒÌ×LWLŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒ‘WLŒ×LLŒÍH
LŒÌWLĞ×LŒ×L
HŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒÎWLWLLĞ×LŒ×LŒHŠJJKˆ™XXİ˜Ü™X]Q[[Y[
›ÙH‹[™\İ[œ›İÜË›X\
›İÈOˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹ÈÙ^Nˆ›İËšYKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ›İËœ\š[ÙÚKˆ‹È‹ˆİš[™Ê›İËœ\š[ÙÚ›JKœYİ\
‹	Ì	ÊJKˆ™XXİ˜Ü™X]Q[[Y[
‹[›İË™[\ŞYYWÛ˜[YJKˆ™XXİ˜Ü™X]Q[[Y[
‹[›İËœ\œÛÛ›™[ØÛÙH	ø %	ÊKˆ™XXİ˜Ü™X]Q[[Y[
‹[›İËœ›ÛWİ]JKˆ™XXİ˜Ü™X]Q[[Y[
‹[^\›Û[X™\Š›İË›™]
JKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹ÛÛXÚÎˆ

HOˆÚİÑ]Z[
›İËšY
HK—LŒ×LŒÌ—LŒ—LĞ×LŒ×LŒHŠKˆˆ‹ˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹ÛÛXÚÎˆ

HOˆ^\›Ûš[
›İËšY
HK—L—LŒ×LÑHLWLĞ×LŒÍLŒ‘L—LLˆŠKˆ\›İË\Ù\—ÚY	‰ˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹ÛÛXÚÎˆ

HOˆÈÙ]X\[™Ê›İÊNÈÙ]\Ù\œÊ×JNÈÙ]]Y\J	ÉÊNÈÙ]\Ù\’Y
	ÉÊNÈHK—LŒWLŒÍ×LŒLĞ×LˆLŒ‘—LŒÌ×LŒWLĞÈŠJJJJJKˆ\™\İ[œ›İÜË›[™İ	‰ˆ™XXİ˜Ü™X]Q[[Y[
œ‹[—LWLĞ×LŒÍLĞÈLŒLŒÌWLŒ×LĞÈLŒ×LĞ×LˆLWLĞ×LLŒWLŒÌHLĞ×LŒ×LWLŒHL—LŒÍLŒ‘‹ˆŠJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆL‹X\™Ú[•ÜˆLˆHKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹\ØX›Yˆš[\œËœYÙHHKÛÛXÚÎˆ

HOˆÙ]š[\œÊ™]š[İ\ÈOˆ
È‹‹œ™]š[İ\ËYÙNˆ™]š[İ\ËœYÙHHHJJHK—L—LŒLLĞÈŠKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹[ˆ—LŒÍWLWLŒ‘L×LM‹ˆš[\œËœYÙJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹\ØX›Yˆš[\œËœYÙH
ˆ™\İ[œYÙWÜÚ^™HH[X™\Š™\İ[œİ[[X\K˜Ûİ[
KÛÛXÚÎˆ

HOˆÙ]š[\œÊ™]š[İ\ÈOˆ
È‹‹œ™]š[İ\ËYÙNˆ™]š[İ\ËœYÙH
ÈHJJHK—LŒLŒÎWLŒ‘—LĞÈŠJJKˆ]Z[	‰ˆ™XXİ˜Ü™X]Q[[Y[
[Ù[È]Nˆ—LŒ×LŒÌ—LŒ—LĞ×LŒ×LŒHLŒ‘L—LLˆLŒ×LŒÎWLLŒ×LWLĞÈLŒÍLŒÌWLNWLŒHLŒMLŒÌWLĞ×LŒ×L‹ÛÛÜÙNˆ

HOˆÙ]]Z[
[
HKˆ™XXİ˜Ü™X]Q[[Y[
œ‹[ˆ]Z[œ›İË™[\ŞYYWÛ˜[YKˆˆLŒM‹ˆ]Z[œ›İËœ\š[ÙÚKˆ‹È‹ˆ]Z[œ›İËœ\š[ÙÚ›JKˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]YˆKˆ—L—LŒÌ×LŒ‘WL×LM‹ˆ]Z[œ›İËœ™]š\Ú[Û‹ˆˆLÈLŒLŒ×LŒÌWLQ—LŒÌLŒ×LŒÌWLĞÎˆ‹ˆ]Z[œ›İË˜Ü™X]YØ]
Kˆ]Z[œ›İËØ\›š[™ÜË›X\

Ø\›š[™Ë[™^
HOˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÙ^Nˆ[™^KØ\›š[™ÊJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈX^ZYÚˆ	ÍŒš	Ëİ™\™›İÎˆ	Ø]]ÉÈHK]Z[™šY[Ë›X\

šY[[™^
HOˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹Ù^NˆšY[İ[NˆÈ\İYPÛÛ[ˆ	ÜÜXÙKX™]ÙY[‰Ë›Ü™\›İÛNˆ	Ì\ÛÛYÙYYIËY[™ÎˆHKˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[]Z[›X™[ÖÚ[™^JKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹[[™^ÈÈ]Z[œ›İË™]VÙšY[H	ø %	Èˆ]Z[œ›İË™]VÙšY[HOOH[È	ø %	Èˆ^\›Û[X™\Š]Z[œ›İË™]VÙšY[KŠJJJJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹ÛÛXÚÎˆ

HOˆ^\›Ûš[
]Z[œ›İËšY
HK—L—LŒ×LÑHLWLĞ×LŒÍLŒ‘L—LLˆMHŠJKˆX\[™È	‰ˆ™XXİ˜Ü™X]Q[[Y[
[Ù[È]Nˆ	ö*¶-ö*6ã6`ˆ6+ö,ö*¶ã	È
ÈX\[™Ë™[\ŞYYWÛ˜[YKÛÛÜÙNˆ

HOˆÙ]X\[™Ê[
HKˆ™XXİ˜Ü™X]Q[[Y[
œ‹[ˆ—LNWLŒ‘ˆLWLLĞÈLWLŒ×LĞ×Lˆ‹ˆX\[™Ë›˜][Û˜[ØÛÙKˆˆLÈLŒÍLWLŒ×LŒÌWLÈLÑWLŒÌWLŒÌ×L—LLĞÎˆ‹ˆX\[™Ëœ\œÛÛ›™[ØÛÙJKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹˜[YNˆ]Y\KÛÚ[™ÙNˆ]™[OˆÙ]]Y\J]™[\™Ù]˜[YJKXÙZÛ\ˆ—LŒ×LŒÌ×LŒWLŒ×LLĞÈL—LŒ×LHLĞ×LŒÈLNWLŒ‘ˆLWLLĞÈLNWLŒ×LŒÌWLŒLŒÌHˆJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹ÛÛXÚÎˆÙX\˜Ú\Ù\œÈK—LŒ×LŒÌ×LŒWLŒ×LLĞÈLNWLŒ×LŒÌWLŒLŒÌHŠKˆ™XXİ˜Ü™X]Q[[Y[
œÙ[Xİ‹ÈÛ\ÜÓ˜[YNˆš[œ]‹˜[YNˆ\Ù\’YÛÚ[™ÙNˆ]™[OˆÙ]\Ù\’Y
]™[\™Ù]˜[YJHKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆˆˆK—LŒ×L—LŒWLŒ‘WLŒ×LŒLNWLŒ×LŒÌWLŒLŒÌHŠKˆ\Ù\œË›X\
\Ù\ˆOˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹ÈÙ^Nˆ\Ù\‹šY˜[YNˆ\Ù\‹šYKˆ\Ù\‹›˜[YH\Ù\‹\Ù\›˜[YKˆˆLŒM‹ˆ\Ù\‹›˜][Û˜[ØÛÙKˆˆLŒMÈ‹ˆ\Ù\‹šY
JJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹\ØX›Yˆ]\Ù\’YÛÛXÚÎˆX]ÚK—LŒWLŒŒ×LĞ×LĞ×LŒ‘ˆLŒWLŒÍ×LŒLĞ×LˆLŒ‘—LŒÌ×LŒWLĞÈŠJJNÂŸB™[˜İ[ÛˆØ[\TÛ\ĞYZ[Š
HÂˆÛÛœİİX‹Ù]X—HH\ÙTİ]J	Ø]XÚY[ÉÊNÂˆ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ[™[YZ[‹]ÛÜšÜÜXÙK\YÙH^\›ÛXYZ[ˆˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹È›ÛNˆX›\İ‹˜\šXK[X™[ˆ—LWLŒ‘—LĞ×LŒÌWLĞ×LŒHLWLĞ×LŒÍLŒ‘L—LL—LĞÈ‹Û\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆ›^Ü˜\ˆ	İÜ˜\	ËX\™Ú[›İÛNˆMˆHKÖÉØ]XÚY[ÉË	ö`vã6-8 #6aö)öã6o¶ã6b6,ö*¶ã	×KÉİ\ØY	Ë	ö*6)ö,v«ö,6)ö,vã6`v)öã6a6+v`¶b6`ˆ6-6,vªv*‰×KÉÜ^\›Û	Ë	ö`vã6-8 #6aö)öã6+v`¶b6`¶ã6o¶,v,öa¶a	×WK›X\

ÚÙ^K]WJHOˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹È›ÛNˆXˆ‹˜\šXK\Ù[XİYˆXˆOOHÙ^KÛ\ÜÓ˜[YNˆ	Øˆ	È
È
XˆOOHÙ^HÈ	Ü	Èˆ	ÉÊKÙ^NˆÙ^KÛÛXÚÎˆ

HOˆÙ]XŠÙ^JHK]JJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹È›ÛNˆXœ[™[‹Ù^NˆXˆKXˆOOH	İ\ØY	ÈÈ™XXİ˜Ü™X]Q[[Y[
ÛÛ\[T^\›Û\ØY[
HˆXˆOOH	Ü^\›Û	ÈÈ™XXİ˜Ü™X]Q[[Y[
ÛÛ\[T^\›Û\İ[
Hˆ™XXİ˜Ü™X]Q[[Y[
Ø[\TÛ\]XÚY[ĞYZ[‹[
JJNÂŸB™[˜İ[ÛˆØ[\TÛ\]XÚY[ĞYZ[Š
HÂˆÛÛœİ[ÛÈHÉö`v,vb6,v+öã6a‰Ë	ö)ö,v+öã6*6aö-6*‰Ë	ö+¶,v+ö)ö+ÉË	ö*¶ã6,IË	öav,v+ö)ö+ÉË	ö-6aö,vã6b6,IË	öavaö,IË	ö(¶*6)öa‰Ë	ö(¶,6,IË	ö+öã	Ë	ö*6aöava‰Ë	ö)ö,ö`va¶+É×NÂˆÛÛœİÜKÙ]WHH\ÙTİ]J	ÉÊNÂˆÛÛœİİ\Ù\œËÙ]\Ù\œ×HH\ÙTİ]J×JNÂˆÛÛœİÜÙ[XİYÙ]Ù[XİYHH\ÙTİ]J[
NÂˆÛÛœİÜ›İÜËÙ]›İÜ×HH\ÙTİ]J×JNÂˆÛÛœİØ\ŞKÙ]\ŞWHH\ÙTİ]J˜[ÙJNÂˆÛÛœİÛØY[™ËÙ]ØY[™×HH\ÙTİ]J˜[ÙJNÂˆÛÛœİÛ\ÙËÙ]\Ù×HH\ÙTİ]J	ÉÊNÂˆÛÛœİÙš[KÙ]š[WHH\ÙTİ]J[
NÂˆÛÛœİÙ˜YËÙ]˜Y×HH\ÙTİ]J˜[ÙJNÂˆÛÛœİÛ›İÒK›İÒ›WHHÙ^RŠ
NÂˆÛÛœİÙ›Ü›KÙ]›Ü›WHH\ÙTİ]JÈ\š[ÙÚNˆ›İÒK\š[ÙÚ›Nˆ›İÒ›K]Nˆ	ÉÈJNÂˆÛÛœİÙX\˜ÚH\Ş[˜È

HOˆÈÙ]ØY[™ÊYJNÈÙ]\ÙÊ	ÉÊNÈHÂˆÛÛœİˆH]ØZ]‹œØ[\TÛ\\Ù\œÊKš[J
JNÂˆÙ]\Ù\œÊ‹œ›İÜÈ×JNÂˆBˆØ]Ú
JHÂˆÙ]\ÙÊK›Y\ÜØYÙH	ö+¶-ö)È6+ö,H6+6,ö*¶+6b	ÊNÂˆBˆš[˜[HÂˆÙ]ØY[™Ê˜[ÙJNÂˆHNÂˆÛÛœİÙ[Xİ\Ù\ˆH\Ş[˜È
JHOˆÈÙ]Ù[XİY
JNÈÙ]›İÜÊ×JNÈÙ]\ÙÊ	ÉÊNÈHÂˆÛÛœİˆH]ØZ]‹œØ[\TÛ\Ñ›Ü•\Ù\ŠKšY
NÂˆÙ]›İÜÊ‹œ›İÜÈ×JNÂˆBˆØ]Ú
JHÂˆÙ]\ÙÊK›Y\ÜØYÙH	ö+¶-ö)È6+ö,H6+ö,vã6)ö`v*ˆ6`vã6-8 #6aö)ÉÊNÂˆHNÂˆ\ÙQY™™Xİ


HOˆÈÙX\˜Ú

NÈK×JNÂˆÛÛœİÚÛÜÙQš[HH
ŠHOˆÈYˆ
YŠBˆ™]\›ÈÛÛœİˆHİš[™Ê‹›˜[YH	ÉÊKÓİÙ\Ø\ÙJ
NÈÛÛœİÚÈHÉØ\XØ][Û‹Ü‰Ë	Ú[XYÙKÚœYÉË	Ú[XYÙKÜ™É×Kš[˜ÛY\Ê‹\JH×ŠŸœOÙß™ÊIË\İ
ŠNÈYˆ
[ÚÊHÂˆÙ]\ÙÊ	ö`v`¶-È6`v)öã6aˆ6ã6)È6*¶-vb6ã6,H”ö#”QÈ6b‘È6`¶)ö*6a6)öa¶*¶+¶)ö*6)ö,ö*‹‰ÊNÂˆ™]\›ÂˆHYˆ
‹œÚ^™HˆL
ˆL
ˆL
HÂˆÙ]\ÙÊ	ö+v+6aH6`v)öã6a6a¶*6)öã6+È6*6ã6-6*¶,H6)ö,ˆ6ìvì6av«ö)ö*6)öã6*ˆ6*6)ö-6+Ë‰ÊNÂˆ™]\›ÂˆHÙ]š[JŠNÈÙ]\ÙÊ	ÉÊNÈNÂˆÛÛœİ\ØYH\Ş[˜È

HOˆÈYˆ
\Ù[XİY
Bˆ™]\›ˆÙ]\ÙÊ	ö)ö*6*¶+ö)È6ã6ªH6ªv)ö,v*6,H6,v)È6)öa¶*¶+¶)ö*6ªva¶ã6+Ë‰ÊNÈYˆ
Yš[JBˆ™]\›ˆÙ]\ÙÊ	ö`v)öã6aˆ6ã6)È6*¶-vb6ã6,H6`vã6-6,v)È6)öa¶*¶+¶)ö*6ªva¶ã6+Ë‰ÊNÈÙ]\ŞJYJNÈÙ]\ÙÊ	ÉÊNÈHÂˆ]ØZ]‹œØ[\TÛ\\ØY
Ù[XİYšY›Ü›Kš[JNÂˆÙ]\ÙÊ	ø§$È6`vã6-6+v`¶b6`¶ã6*6)È6avb6`v`¶ã6*ˆ6*6)ö,v«ö,6)ö,vã6b6*6,v)öã6ªv)ö,v*6,H6`¶)ö*6a6+ö,vã6)ö`v*ˆ6-6+Ë‰ÊNÂˆÙ]š[J[
NÂˆÙ]›Ü›JOˆ
È‹‹]Nˆ	ÉÈJJNÂˆÛÛœİˆH]ØZ]‹œØ[\TÛ\Ñ›Ü•\Ù\ŠÙ[XİYšY
NÂˆÙ]›İÜÊ‹œ›İÜÈ×JNÂˆBˆØ]Ú
JHÂˆÙ]\ÙÊK›Y\ÜØYÙH	ö*6)ö,v«ö,6)ö,vã6a¶)öavb6`v`ˆ6*6b6+ÉÊNÂˆBˆš[˜[HÂˆÙ]\ŞJ˜[ÙJNÂˆHNÂˆÛÛœİ[H\Ş[˜È
Y
HOˆÈYˆ
XÛÛ™š\›J	ö)öã6aˆ6`vã6-6+v`¶b6`¶ã6+v,6`H6-6b6+ö'ÉÊJBˆ™]\›ÈHÂˆ]ØZ]‹œØ[\TÛ\[]JY
NÂˆÙ]›İÜÊOˆ™š[\ŠˆOˆ‹šYOOHY
JNÂˆÙ]\ÙÊ	ø§$È6`vã6-6+v,6`H6-6+Ë‰ÊNÂˆBˆØ]Ú
JHÂˆÙ]\ÙÊK›Y\ÜØYÙH	ö+v,6`H6a¶)öavb6`v`ˆ6*6b6+ÉÊNÂˆHNÂˆ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ[™[Ø[\KXYZ[ˆYZ[‹]ÛÜšÜÜXÙK\YÙHYZ[‹Y›Ü›K\YÙHˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈYÙK]ÛÛ˜\ˆ‹İ[NˆÈ\İYPÛÛ[ˆ	ÜÜXÙKX™]ÙY[‰Ë[YÛ’][\Îˆ	ØÙ[\‰ËØ\ˆL‹›^Ü˜\ˆ	İÜ˜\	ÈHKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
šÈ‹[—LWLŒ‘—LĞ×LŒÌWLĞ×LŒHLLŒLŒ×LŒÌWLQ—LŒÌLŒ×LŒÌWLĞÈLWLĞ×LŒÍLŒ‘L—LL—LĞÈŠKˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ›ÛÚ^™NˆLËX\™Ú[•ÜˆHHK—LWLĞ×LŒÍLŒ‘L—LL—LĞÈLŒÌWLŒÈLŒL×LŒ×LŒÍWLLŒÌWLŒHˆLĞ×LŒÈLŒWLŒÍWLLĞ×LŒÌH”ËÔ‘ÈLŒLŒÌWLŒ×LĞÈL×LŒÌHLNWLŒ×LŒÌWLŒLŒÌWLŒÈLŒLŒÌHLŒ×LŒÌ×LŒ×LŒÌÈLŒÌ×LŒ×LLLWLŒ×LÈLŒÍLWLŒÌ×LĞÈLŒ—LŒLŒHLLŒÌ×LLŒ×LŒLˆL—LŒLLĞÈLŒÌWLŒÈLWLŒ‘—LĞ×LŒÌWLĞ×LŒHLNWL—LĞ×LŒ‘‹ˆŠJKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆ˜˜YÙH‹İ[NˆÈÛÛÜˆ	İ˜\ŠKXœ˜[™
IË›Ü™\ÛÛÜˆ	İ˜\ŠKXœ˜[™
IÈHK”ˆÈ”ÈÈ‘ÈLÈLŒ‘LŒ‘—LŒ×LNWLŒ—LŒÌHL‘ŒWL‘ŒLWLQ—LŒ×LŒLŒ×LĞ×LŒHŠJKˆ\ÙÈ	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈX\™Ú[•ÜˆL‹Y[™Îˆ	ÌLLœ	Ë›Ü™\”˜Y]\ÎˆL˜XÚÙÜ›İ[™ˆ\ÙËœİ\ÕÚ]
	ø§$ÉÊHÈ	ÈÙXYŒIÈˆ	ÈÙ™™ŒYŒ‰ËÛÛÜˆ\ÙËœİ\ÕÚ]
	ø§$ÉÊHÈ	İ˜\ŠK[ÚÊIÈˆ	İ˜\ŠKY[™Ù\ŠIË›ÛÙZYÚˆÌHK\ÙÊKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ™ÜšYˆ‹İ[NˆÈX\™Ú[•ÜˆM‹[YÛ’][\Îˆ	Üİ\	ÈHKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ˜Ø\™\ˆKˆ™XXİ˜Ü™X]Q[[Y[
š‹[—L‘ŒKˆLŒ×L—LŒWLŒ‘WLŒ×LŒLNWLŒ×LŒÌWLŒLŒÌHŠKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆHKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹˜[YNˆKÛÚ[™ÙNˆHOˆÙ]JK\™Ù]˜[YJKÛ’Ù^QİÛˆHOˆKšÙ^HOOH	Ñ[\‰È	‰ˆÙX\˜Ú

KXÙZÛ\ˆ—L—LŒ×LWLŒÈL—LŒ×LHLNWLŒ×LŒÌWLŒLŒÌWLĞ×LŒÈLWLLŒLŒ×LĞ×LLĞ×LŒÈLNWLŒ‘ˆLWLLĞÈˆJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹ÛÛXÚÎˆÙX\˜Ú\ØX›YˆØY[™ÈKØY[™ÈÈ	ö+ö,H6+v)öa6+6,ö*¶+6b	Èˆ	ö+6,ö*¶+6b	ÊJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈX\™Ú[•ÜˆLX^ZYÚˆÌİ™\™›İÎˆ	Ø]]ÉÈHK\Ù\œË›[™İÈ\Ù\œË›X\
HOˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÙ^NˆKšY\Nˆ˜]Ûˆ‹ÛÛXÚÎˆ

HOˆÙ[Xİ\Ù\ŠJKİ[NˆÈÚYˆ	ÌL	IË^[YÛˆ	ÜšYÚ	Ë\Ü^Nˆ	Ù›^	Ë\İYPÛÛ[ˆ	ÜÜXÙKX™]ÙY[‰Ë[YÛ’][\Îˆ	ØÙ[\‰ËØ\ˆLY[™ÎˆL‹X\™Ú[›İÛNˆË›Ü™\”˜Y]\ÎˆL‹›Ü™\ˆ
Ù[XİYOOH[Ù[XİYOOH›ÚYÈ›ÚYˆÙ[XİYšY
HOOHKšYÈ	ÌœÛÛY˜\ŠKXœ˜[™
IÈˆ	Ì\ÛÛY˜\ŠK[[™JIË˜XÚÙÜ›İ[™ˆ
Ù[XİYOOH[Ù[XİYOOH›ÚYÈ›ÚYˆÙ[XİYšY
HOOHKšYÈ	ÈÙY	Èˆ	ÈÙ™™‰Ëİ\œÛÜˆ	ÜÚ[\‰Ë›Û˜[Z[Nˆ	Ú[š\š]	ÈHKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[K›˜[YHK\Ù\›˜[YH	ö*6+öb6aˆ6a¶)öaIÊKˆ™XXİ˜Ü™X]Q[[Y[
œÛX[‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ\Ü^Nˆ	Ø›ØÚÉËX\™Ú[•ÜˆÈHKˆK\Ù\›˜[YH	ÉËˆˆ‹ˆK›[Øš[HÈ	È0­È	È
ÈK›[Øš[Hˆ	ÉËˆˆ‹ˆK›˜][Û˜[ØÛÙHÈ	È0­È	È
ÈK›˜][Û˜[ØÛÙHˆ	ÉÊJKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹Èİ[NˆÈÛÛÜˆ	İ˜\ŠKXœ˜[™
IË›ÛÙZYÚˆHK—LŒ×L—LŒWLŒ‘WLŒ×LŒŠJJHˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈY[™ÎˆN^[YÛˆ	ØÙ[\‰ÈHK—LNWLŒ×LŒÌWLŒLŒÌWLĞÈLĞ×LŒ×LWLŒHL—LŒÍLŒ‘‹ˆŠJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ˜Ø\™\ˆKˆ™XXİ˜Ü™X]Q[[Y[
š‹[—L‘Œ‹ˆLWLŒÍLŒ‘WLŒÍWLŒ×LŒHLLWLŒ×LĞ×LLWLĞ×LŒÍŠKˆ\Ù[XİYÈ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈY[™ÎˆŒ‹^[YÛˆ	ØÙ[\‰ÈHK—LŒLŒÌWLŒ×LĞÈLŒÍLŒÌWLLŒÎWLŒÈLĞ×LNHLNWLŒ×LŒÌWLŒLŒÌHLŒÌWLŒÈLŒ×LŒÌˆLŒÌ×LŒWLLˆLWL—LŒ×LŒLLŒ×L—LŒWLŒ‘WLŒ×LŒLNWL—LĞ×LŒ‘‹ˆŠHˆ™XXİ˜Ü™X]Q[[Y[
™XXİ‘œ˜YÛY[[ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈY[™ÎˆLK›Ü™\”˜Y]\ÎˆL‹˜XÚÙÜ›İ[™ˆ	ÈÙ™Y˜ÉËX\™Ú[›İÛNˆLˆHKˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[Ù[XİY›˜[YHÙ[XİY\Ù\›˜[YJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ›ÛÚ^™NˆL‹X\™Ú[•ÜˆÈHKˆÙ[XİY›[Øš[H	ö*6+öb6aˆ6-6av)ö,vaÉËˆˆLÈ‹ˆÙ[XİY›˜][Û˜[ØÛÙH	ö*6+öb6aˆ6ªv+È6ava6ã	ÊJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈ\Ü^Nˆ	ÙÜšY	ËÜšY[\]PÛÛ[[œÎˆ	ÌYœˆYœ‰ËØ\ˆL‹X\™Ú[›İÛNˆLHKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹[ˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—LŒÌ×LŒ×LLŒÍLWLŒÌ×LĞÈŠKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹İ[NˆÈÚYˆ	ÌL	IÈK\Nˆ›[X™\ˆ‹Z[ˆŒLÌ‹X^ˆŒML‹˜[YNˆ›Ü›Kœ\š[ÙÚKÛÚ[™ÙNˆHOˆÙ]›Ü›JÈ‹‹™›Ü›K\š[ÙÚNˆK\™Ù]˜[YHJHJJKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹[ˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—LWLŒ×LÈŠKˆ™XXİ˜Ü™X]Q[[Y[
œÙ[Xİ‹ÈÛ\ÜÓ˜[YNˆš[œ]‹İ[NˆÈÚYˆ	ÌL	IÈK˜[YNˆ›Ü›Kœ\š[ÙÚ›KÛÚ[™ÙNˆHOˆÙ]›Ü›JÈ‹‹™›Ü›K\š[ÙÚ›NˆK\™Ù]˜[YHJHK[ÛË›X\

KJHOˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹ÈÙ^NˆK˜[YNˆH
ÈHKJJJJJKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹Èİ[NˆÈ\Ü^Nˆ	Ø›ØÚÉËX\™Ú[›İÛNˆLHKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—LŒÎWL—LLŒ×LˆLWLĞ×LŒÍŠKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹İ[NˆÈÚYˆ	ÌL	IÈK˜[YNˆ›Ü›K]KÛÚ[™ÙNˆHOˆÙ]›Ü›JÈ‹‹™›Ü›K]NˆK\™Ù]˜[YHJKXÙZÛ\ˆ	ö`vã6-6+v`¶b6`¶ã	È
È[ÛÖÊ
Ù›Ü›Kœ\š[ÙÚ›HJHHWH
È	È	È
È›Ü›Kœ\š[ÙÚHJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ‘˜YÓİ™\ˆHOˆÈKœ™]™[Y˜][

NÈÙ]˜YÊYJNÈKÛ‘˜YÓX]™Nˆ

HOˆÙ]˜YÊ˜[ÙJKÛ‘›ÜˆHOˆÈ˜\ˆØNÈKœ™]™[Y˜][

NÈÙ]˜YÊ˜[ÙJNÈÚÛÜÙQš[J
ØHHK™]U˜[œÙ™\‹™š[\ÊHOOH[ØHOOH›ÚYÈ›ÚYˆØVÌJNÈKİ[NˆÈ›Ü™\ˆ	Ìœ\ÚY	È
È
˜YÈÈ	İ˜\ŠKXœ˜[™
IÈˆ	İ˜\ŠK[[™JIÊK›Ü™\”˜Y]\ÎˆM‹Y[™ÎˆŒ‹^[YÛˆ	ØÙ[\‰Ë˜XÚÙÜ›İ[™ˆ˜YÈÈ	ÈÙY	Èˆ	ÈÙ˜Y˜™™	ËX\™Ú[•ÜˆLHKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈ›ÛÚ^™NˆÍHK—QÑQĞÍŠKˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[š[HÈš[K›˜[YHˆ	ö`v)öã6aˆ6,v)È6)öã6a¶+6)È6,vaö)È6ªva¶ã6+ÉÊKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ›ÛÚ^™NˆL‹X\™Ú[ˆ	Í\L	ÈHKš[HÈ˜JX]˜ÙZ[
š[KœÚ^™HÈL
JH
È	È6ªvã6a6b6*6)öã6*‰Èˆ	öã6)È6)ö,ˆ6+öªvavaÈ6,¶ã6,H6)öa¶*¶+¶)ö*6ªva¶ã6+ÉÊKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹İ[NˆÈ\Ü^Nˆ	Ú[›[™KX›ØÚÉËİ\œÛÜˆ	ÜÚ[\‰ÈHKˆ—LŒ×L—LŒWLŒ‘WLŒ×LŒLWLŒ×LĞ×L‹ˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹È\Nˆ™š[H‹XØÙ\ˆ˜\XØ][Û‹Ü‹[XYÙKÚœYË[XYÙKÜ™Ëœ‹šœËšœYËœ™È‹İ[NˆÈ\Ü^Nˆ	Û›Û™IÈKÛÚ[™ÙNˆHOˆÈ˜\ˆØNÈ™]\›ˆÚÛÜÙQš[J
ØHHK\™Ù]™š[\ÊHOOH[ØHOOH›ÚYÈ›ÚYˆØVÌJNÈHJJJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹İ[NˆÈÚYˆ	ÌL	IËX\™Ú[•ÜˆL‹Y[™ÎˆLÈKÛÛXÚÎˆ\ØY\ØX›Yˆ\ŞHK\ŞHÈ	ö+ö,H6+v)öa6*6)ö,v«ö,6)ö,vã‹‹‰Èˆ	ö*6)ö,v«ö,6)ö,vã6b6*ö*6*ˆ6`vã6-6+v`¶b6`¶ã	ÊJJKˆÙ[XİY	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ˜Ø\™\‹İ[NˆÈX\™Ú[•ÜˆMHKˆ™XXİ˜Ü™X]Q[[Y[
š‹[—LWLĞ×LŒÍLŒ×L×LŒ×LĞÈLŒ—LŒLŒWLŒ×LŒÍLŒ‘—LÈŠKˆ›İÜË›[™İÈ›İÜË›X\
ˆOˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÙ^Nˆ‹šYÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈ\İYPÛÛ[ˆ	ÜÜXÙKX™]ÙY[‰ËY[™Îˆ	ÌL\	Ë›Ü™\›İÛNˆ	Ì\ÛÛY˜\ŠK[[™JIÈHKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[‹]H	ö`vã6-6+v`¶b6`¶ã	ÊKˆ™XXİ˜Ü™X]Q[[Y[
œÛX[‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ\Ü^Nˆ	Ø›ØÚÉÈHKˆ‹œ\š[ÙÛX™[ˆˆLÈ‹ˆ
‹›Z[YWİ\H	ÉÊKœİ\ÕÚ]
	Ú[XYÙKÉÊHÈ	ö*¶-vb6ã6,H6`vã6-	Èˆ	Ô‰ËˆˆLÈ‹ˆ‹™š[WÛ˜[YH	ÜØ[\K\Û\	ËˆˆLÈ‹ˆšŠ‹˜Ü™X]YØ]
JJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹ÛÛXÚÎˆ

HOˆ[
‹šY
HK—LŒ‘LŒÌLHŠJJHˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈY[™ÎˆM‹^[YÛˆ	ØÙ[\‰ÈHK—LŒLŒÌWLŒ×LĞÈLŒ×LĞ×LˆLNWLŒ×LŒÌWLŒLŒÌHLWLĞ×LŒÍLĞÈLŒ—LŒLŒHL—LŒÍLŒ‘—LÈLŒ×LŒÌ×LŒKˆŠJJJJNÂŸB™[˜İ[ÛˆŞ\İ[RX[\Ú›Ø\™

HÂˆ˜\ˆØKØ‹ØËÙKÙ‹ÙËÚÚ‹ÚËÛÂˆÛÛœİÙÙ]HH\ÙTİ]J[
NÂˆÛÛœİØ\ŞKÙ]\ŞWHH\ÙTİ]J˜[ÙJNÂˆÛÛœİÛ\ÙËÙ]\Ù×HH\ÙTİ]J	ÉÊNÂˆÛÛœİØ]]ËÙ]]]×HH\ÙTİ]J˜[ÙJNÂˆÛÛœİÙ]šXÙ\ËÙ]]šXÙ\×HH\ÙTİ]J×JNÂˆÛÛœİÙ]šXÙTİ]ËÙ]]šXÙTİ]×HH\ÙTİ]JßJNÂˆÛÛœİÙKÙ]WHH\ÙTİ]J	ÉÊNÂˆÛÛœİØÛÛ\Û™[İ]\ËÙ]ÛÛ\Û™[İ]\×HH\ÙTİ]J	Ø[	ÊNÂˆÛÛœİÙ]šXÙQ\œ›Ü‹Ù]]šXÙQ\œ›Ü—HH\ÙTİ]J	ÉÊNÂˆÛÛœİÙ]šXÙ\ÓØY[™ËÙ]]šXÙ\ÓØY[™×HH\ÙTİ]J˜[ÙJNÂˆÛÛœİ\ŞT™YˆH\ÙT™YŠ˜[ÙJNÂˆÛÛœİ]šXÙT™\]Y\İ™YˆH\ÙT™YŠ
NÂˆÛÛœİØY]šXÙ\ÈH\Ş[˜È
HHJHOˆÈÛÛœİ™\]Y\İH
ÊÙ]šXÙT™\]Y\İ™Y‹˜İ\œ™[ÈÙ]]šXÙ\ÓØY[™ÊYJNÈÙ]]šXÙQ\œ›ÜŠ	ÉÊNÈHÂˆÛÛœİH]ØZ]‹™]šXÙRX[
JNÂˆYˆ
™\]Y\İOOH]šXÙT™\]Y\İ™Y‹˜İ\œ™[
HÂˆÙ]]šXÙ\Êš][\È×JNÂˆÙ]]šXÙTİ]Êœİ]ÈßJNÂˆBˆBˆØ]Ú
JHÂˆYˆ
™\]Y\İOOH]šXÙT™\]Y\İ™Y‹˜İ\œ™[
BˆÙ]]šXÙQ\œ›ÜŠK›Y\ÜØYÙH	ö+ö,vã6)ö`v*ˆ6b6-¶.vã6*ˆ6+ö,ö*¶«ö)öaø #6aö)È6a¶)öavb6`v`ˆ6*6b6+ÉÊNÂˆBˆš[˜[HÂˆYˆ
™\]Y\İOOH]šXÙT™\]Y\İ™Y‹˜İ\œ™[
BˆÙ]]šXÙ\ÓØY[™Ê˜[ÙJNÂˆHNÂˆÛÛœİØYH\Ş[˜È
[ŠHOˆÈYˆ
\ŞT™Y‹˜İ\œ™[
Bˆ™]\›È\ŞT™Y‹˜İ\œ™[HYNÈÙ]\ŞJYJNÈÙ]\ÙÊ	ÉÊNÈHÂˆÛÛœİˆH[ˆÈ]ØZ]‹œŞ\İ[RX[[ÚXÚÜÊ
Hˆ]ØZ]‹œŞ\İ[RX[\Ú›Ø\™

NÂˆÙ]
ŠNÂˆ]ØZ]ØY]šXÙ\Ê
NÂˆYˆ
[ŠBˆÙ]\ÙÊ	ø§$È6¡¶ªH6,öa6)öav*ˆ6)ö+6,v)È6b6*ö*6*ˆ6-6+ÉÊNÂˆBˆØ]Ú
JHÂˆÙ]\ÙÊK›Y\ÜØYÙH	ö+¶-ö)È6+ö,H6+ö,vã6)ö`v*ˆ6,öa6)öav*ˆ6,ö)öav)öa¶aÉÊNÂˆBˆš[˜[HÂˆ\ŞT™Y‹˜İ\œ™[H˜[ÙNÂˆÙ]\ŞJ˜[ÙJNÂˆHNÂˆ\ÙQY™™Xİ


HOˆÈØY
˜[ÙJNÈK×JNÂˆ\ÙQY™™Xİ


HOˆÈYˆ
X]]ÊBˆ™]\›ÈÛÛœİHÙ][\˜[


HOˆØY
˜[ÙJKÌ
NÈ™]\›ˆ

HOˆÛX\’[\˜[

NÈKØ]]×JNÂˆÛÛœİ˜YÙHH
İ
HOˆÈÛÛœİÈHİOOH	ÛÚÉÈÈ	İ˜\ŠK[ÚÊIÈˆ
İOOH	İØ\›š[™ÉÈÈ	ÈÙNŒ	Èˆ	İ˜\ŠKY[™Ù\ŠIÊNÈÛÛœİHİOOH	ÛÚÉÈÈ	ö,ö)öa6aIÈˆ
İOOH	İØ\›š[™ÉÈÈ	öaö-6+ö)ö,IÈˆ	ö+¶-ö)ÉÊNÈ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆ˜˜YÙH‹İ[NˆÈÛÛÜˆË›Ü™\ÛÛÜˆÈHK
NÈNÂˆÛÛœİY]HH
ŠHOˆÈHÂˆ™]\›ˆ”ÓÓ‹œİš[™ÚYJˆßK[ŠNÂˆBˆØ]Ú
JHÂˆ™]\›ˆ	ÉÎÂˆHNÂˆÛÛœİİ]Ø\™ÈHÈÖÉöb6-¶.vã6*ˆ6ªva6ã	Ëœİ]\ÈOOH	ÛÚÉÈÈ	ö,ö)öa6aIÈˆ
œİ]\ÈOOH	İØ\›š[™ÉÈÈ	öaö-6+ö)ö,IÈˆ	ö+¶-ö)ÉÊWKÉöa¶,ö+¶aÈ6,ö)öã6*‰ËœÚ]Wİ™\œÚ[Û—KÉöa¶,ö+¶aÈ6)öo‰Ë˜\İ™\œÚ[Û—KÉöªv)ö,v*6,v)öaˆ6`v.v)öa	Ë
ØHHœİ]ÊHOOH[ØHOOH›ÚYÈ›ÚYˆØK\Ù\œ×ØXİ]™WKÉö,v)öa¶a¶+ö«ö)öa‰Ë
ØˆHœİ]ÊHOOH[ØˆOOH›ÚYÈ›ÚYˆØ‹™š]™\œ×İİ[KÉö+¶-öb6-ÉË
ØÈHœİ]ÊHOOH[ØÈOOH›ÚYÈ›ÚYˆØË›[™\×İİ[KÉö+6a6,ö)ö*ˆ6*6)ö,‰Ë
ÙHHœİ]ÊHOOH[ÙHOOH›ÚYÈ›ÚYˆÙK›Ü[—ÜİY™—ÜÙ\ÜÚ[Ûœ×KÉö+¶-ö)öã6)öoˆ6ì¶í6,ö)ö.v*‰Ë
ÙˆHœİ]ÊHOOH[ÙˆOOH›ÚYÈ›ÚYˆÙ‹›[Øš[WÙ\œ›Üœ×ÌKÉö,v+È6+v-¶b6,H6ì¶í6,ö)ö.v*‰Ë
ÙÈHœİ]ÊHOOH[ÙÈOOH›ÚYÈ›ÚYˆÙË˜][™[˜ÙWÜ™Z™Xİ×ÌKÉö-v`H6(¶`va6)öã6aˆ6a¶)öavb6`v`‰Ë
ÚHœİ]ÊHOOH[ÚOOH›ÚYÈ›ÚYˆÚ›Ù™›[™WÙ˜Z[YKÉÑXY[]\‰Ë
ÚˆHœİ]ÊHOOH[ÚˆOOH›ÚYÈ›ÚYˆÚ‹™[]™\WÙXYÛ]\œ×KÉöa¶avb6a¶aÈ6o¶a6)öªH6+ö,H6)öa¶*¶.6)ö,IË
ÚÈHœİ]ÊHOOH[ÚÈOOH›ÚYÈ›ÚYˆÚËœ]WÜ[™[™×WHˆ×NÂˆÛÛœİÛÛ\Û™[ÈH

OOH[OOH›ÚYÈ›ÚYˆ˜ÛÛ\Û™[ÊH×JK™š[\ŠÈOˆÛÛ\Û™[İ]\ÈOOH	Ø[	È
ÛÛ\Û™[İ]\ÈOOH	Ü›Ø›[IÈÈËœİ]\ÈOOH	ÛÚÉÈˆËœİ]\ÈOOHÛÛ\Û™[İ]\ÊJNÂˆÛÛœİ›Ø›[PÛİ[H

OOH[OOH›ÚYÈ›ÚYˆ˜ÛÛ\Û™[ÊH×JK™š[\ŠÈOˆËœİ]\ÈOOH	ÛÚÉÊK›[™İÂˆ™]\›ˆ
™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ[™[YZ[‹]ÛÜšÜÜXÙK\YÙHŞ\İ[KZX[\YÙHˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈ\İYPÛÛ[ˆ	ÜÜXÙKX™]ÙY[‰Ë[YÛ’][\Îˆ	ØÙ[\‰ËØ\ˆL›^Ü˜\ˆ	İÜ˜\	ÈHKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
šÈ‹[—LŒ‘—LŒ×LŒÍLŒLLŒÌWLŒ‘ˆLŒÌ×LLŒ×LWLŒHLŒÌ×LŒ×LWLŒ×L—LÈŠKˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ›ÛÚ^™NˆLËX\™Ú[•ÜˆHK—LÑWLŒ×LĞ×LŒÍLŒ‘—LĞ×LŒWLŒ×LŒLĞ×LŒÌ×LŒÈLWLŒÍ—LŒ×LĞÈLŒÌLŒ‘WLĞ×LŒÌWL×LŒ×LŒÌ×LŒ×LŒÌ—LĞ×LŒÈLŒÍWLHLÑWLĞ×LŒ×LWLŒ×L×LŒ×LŒÈLŒŒ—LWLLŒ×LĞ×L—LŒÈLŒ‘WLŒÍ×LŒ×L×LŒ×LĞÈLWLLŒLŒ×LĞ×LLŒÈĞÔˆLÑWLLŒ×LNWLŒÈLŒÌWLŒLŒ×LŒWLŒ×L×LŒÈLLNWLŒÌWLL—LŒ×LŒ×LŒ×LŒLŒ×L×LŒËˆŠJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆ›^Ü˜\ˆ	İÜ˜\	ÈHKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹ÛÛXÚÎˆ

HOˆØY
˜[ÙJK\ØX›Yˆ\ŞHK\ŞHÈ	ö+ö,H6+v)öa6+ö,vã6)ö`v*¸ )‰Èˆ	ö*6,vb6,¶,v,ö)öa¶ã	ÊKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹ÛÛXÚÎˆ

HOˆØY
YJK\ØX›Yˆ\ŞHK\ŞHÈ	öa6-ö`v)öbÈ6-v*6,H6ªva¶ã6+ø )‰Èˆ	ö)ö+6,v)öã6¡¶ªH6b6*ö*6*‰ÊKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ]]ÈÈ	Øˆ	Èˆ	ØˆÉË˜\šXK\™\ÜÙYˆ]]ËÛÛXÚÎˆ

HOˆÙ]]]ÊHOˆXJHK]]ÈÈ	ö*6,vb6,¶,v,ö)öa¶ã6+¶b6+öªv)ö,Nˆ6,vb6-6a‰Èˆ	ö*6,vb6,¶,v,ö)öa¶ã6+¶b6+öªv)ö,Nˆ6+¶)öavb6-	ÊJJKˆ\ÙÈ	‰ˆ™XXİ˜Ü™X]Q[[Y[
œ‹È›ÛNˆ\ÙËœİ\ÕÚ]
	ø§$ÉÊHÈ	Üİ]\ÉÈˆ	Ø[\	Ëİ[NˆÈ›ÛÙZYÚˆÌÛÛÜˆ\ÙËœİ\ÕÚ]
	ø§$ÉÊHÈ	İ˜\ŠK[ÚÊIÈˆ	İ˜\ŠKY[™Ù\ŠIËX\™Ú[•ÜˆLHK\ÙÊKˆYÈ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆÛÜšÜÜXÙKY[\K\İ]H‹›ÛNˆœİ]\ÈˆK\ŞHÈ	ö+ö,H6+v)öa6+ö,vã6)ö`v*ˆ6b6-¶.vã6*ˆ6,ö)öav)öa¶aø )‰Èˆ	ö+ö)ö+öaø #6)öã6+ö,vã6)ö`v*ˆ6a¶-6+öaÈ6)ö,ö*‹ˆ6*6,v)öã6+ö,vã6)ö`v*ˆ6+öb6*6)ö,vaö#6+öªvavaöe6*6,vb6,¶,v,ö)öa¶ã6,v)È6*6,¶a¶ã6+Ë‰ÊHˆ™XXİ˜Ü™X]Q[[Y[
™XXİ‘œ˜YÛY[[ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ™ÜšY‹İ[NˆÈX\™Ú[•ÜˆLˆHKİ]Ø\™Ë›X\

ÚË—JHOˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆšÜH‹Ù^NˆÈKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹[ÊKˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[\[ÙˆˆOOH	Û[X™\‰ÈÈ˜JŠHˆ
ˆ	ø %	ÊJJJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈX\™Ú[ˆ	ÌMœ	ÈHKˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[—LLŒÍ—LŒÎWLĞ×LŒHLNWLLĞÎˆŠKˆˆ‹ˆ˜YÙJœİ]\ÊKˆˆ‹ˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ›ÛÚ^™NˆL‹X\™Ú[”šYÚˆHKˆ—LŒŒ—LŒ‘WLŒÌWLĞ×LˆLŒ‘—LŒÌWLĞ×LŒ×LWLŒNˆ‹ˆšŠ[YJJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœŞ\İ[KZX[\ÙXİ[Û‹ZXY[™ÈˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
š‹[—LŒÌ×LLŒ×LWLŒHLŒ×LŒ×LŒÌ—LŒ×LĞÈLŒÌ×LŒ×LWLŒ×L—LÈŠKˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]YˆKˆ˜J

ÛH˜ÛÛ\Û™[ÊHOOH[ÛOOH›ÚYÈ›ÚYˆÛ›[™İ
H
KˆˆLŒLŒ‘WLŒÍLŒLŒÌWLŒÌWLŒÌ×LĞ×LŒ×LŒÍLŒ‘—LÈLÈ‹ˆ˜J›Ø›[PÛİ[
KˆˆLWLLŒÌWLŒ‘ˆL—LĞ×LŒ×LŒÌ—LWL—LŒ‘ˆLÑWLĞ×LQ—LĞ×LŒÌWLĞÈŠJKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹[ˆ—L—LWLŒ×LĞ×LŒÍLLŒÍ—LŒÎWLĞ×LŒH‹ˆ™XXİ˜Ü™X]Q[[Y[
œÙ[Xİ‹ÈÛ\ÜÓ˜[YNˆš[œ]‹˜[YNˆÛÛ\Û™[İ]\ËÛÚ[™ÙNˆHOˆÙ]ÛÛ\Û™[İ]\ÊK\™Ù]˜[YJHKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆ˜[ˆK—L×LWL×LMLŒLŒ‘WLŒÍLŒ×L×LŒÈŠKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆœ›Ø›[HˆK—LWL—LŒÍÈL×LŒÍLŒ‘—LŒ×LŒÌWL×LŒÈLLŒ‘WLŒÍ×LŒ×L×LŒÈŠKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆØ\›š[™ÈˆK—LWL—LŒÍÈL×LŒÍLŒ‘—LŒ×LŒÌWL×LŒÈŠKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆ™\œ›ÜˆˆK—LWL—LŒÍÈLŒ‘WLŒÍ×LŒ×L×LŒÈŠKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆ›ÚÈˆK—LWL—LŒÍÈLŒÌ×LŒ×LLWLŒ×L×LŒÈŠJJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœŞ\İ[KZX[]X›K]Ü˜\ˆKˆ™XXİ˜Ü™X]Q[[Y[
X›H‹Èİ[NˆÈZ[•ÚYˆÍŒ›ÛÚ^™NˆLˆHKˆ™XXİ˜Ü™X]Q[[Y[
XY‹[ˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒLŒ‘WLŒÍŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LLŒÍ—LŒÎWLĞ×LŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LÑWLĞ×LŒ×LHŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒ×LŒÌ—LŒ—LĞ×LŒ×LŒHŠJJKˆ™XXİ˜Ü™X]Q[[Y[
›ÙH‹[ˆÛÛ\Û™[Ë›X\
ÈOˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹ÈÙ^NˆËšÙ^HKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[Ë]JKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹\ˆ›ˆ‹İ[NˆÈ›ÛÚ^™NˆLHKËšÙ^JJKˆ™XXİ˜Ü™X]Q[[Y[
‹[˜YÙJËœİ]\ÊJKˆ™XXİ˜Ü™X]Q[[Y[
‹[Ë›Y\ÜØYÙJKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ™XXİ˜Ü™X]Q[[Y[
™]Z[È‹[ˆ™XXİ˜Ü™X]Q[[Y[
œİ[[X\H‹Èİ[NˆÈİ\œÛÜˆ	ÜÚ[\‰ËÛÛÜˆ	İ˜\ŠKXœ˜[™
IÈHK—L—LWLŒ×LĞ×LŒÍŠKˆ™XXİ˜Ü™X]Q[[Y[
œ™H‹È\ˆ›ˆ‹İ[NˆÈÚ]TÜXÙNˆ	Ü™K]Ü˜\	Ë^[YÛˆ	ÛY	ËX^ÚYˆLŒX^ZYÚˆŒŒİ™\™›İÎˆ	Ø]]ÉÈHKY]JË›Y]JJJJJJKˆXÛÛ\Û™[Ë›[™İ	‰ˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
‹ÈÛÛÜ[ˆ‹Û\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ^[YÛˆ	ØÙ[\‰ËY[™ÎˆŒˆHK—LWLLŒÌWLŒ‘—LĞÈLŒLŒÈLLŒÍ—LŒÎWLĞ×LŒHLŒ×L—LŒWLŒ‘WLŒ×LŒLŒ×LŒÍLŒ‘—LÈLLŒ×LLŒ‘ˆL—LŒ‘—LŒ×LŒÌWLŒ‘‹ˆŠJJJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ™ÜšYˆ‹İ[NˆÈX\™Ú[•ÜˆMHKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ˜Ø\™\ˆKˆ™XXİ˜Ü™X]Q[[Y[
š‹[—LŒ‘WLŒÍ×LŒ×L×LŒÈLL×LŒÍLŒ‘—LŒ×LŒÌWL×LŒ×LĞÈLŒ×LŒ‘WLĞ×LŒÌHLŒÌ×LŒ×LWLŒ×L—LÈŠKˆ
œ™XÙ[Ù\œ›ÜœÈ×JK›[™İÈ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈX^ZYÚˆŒİ™\™›İÎˆ	Ø]]ÉÈHKœ™XÙ[Ù\œ›ÜœË›X\
ˆOˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÙ^Nˆ‹šYİ[NˆÈ›Ü™\›İÛNˆ	Ì\ÛÛY˜\ŠK[[™JIËY[™Îˆ	ÍÜ	ÈHKˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹Èİ[NˆÈÛÛÜˆ‹›]™[OOH	Ù\œ›Ü‰ÈÈ	İ˜\ŠKY[™Ù\ŠIÈˆ	ÈÙNŒ	ÈHK‹›]™[
KˆˆLÈ‹ˆ‹œÛİ\˜ÙKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈ›ÛÚ^™NˆLˆHK‹›Y\ÜØYÙJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ›ÛÚ^™NˆLHKšŠ‹˜Ü™X]YØ]
JJJJHˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]YˆK—LWLLŒÌWLŒ‘—LĞÈLŒ—LŒLŒHL—LŒÍLŒ‘—LÈLŒ×LŒÌ×LŒKˆŠJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ˜Ø\™\ˆKˆ™XXİ˜Ü™X]Q[[Y[
š‹[—LŒ‘WLŒÍ×LŒ×L×LŒ×LĞÈLŒ×LŒ‘WLĞ×LŒÌHLŒ×LÑHLWLLŒLŒ×LĞ×LŠKˆ
œ™XÙ[Û[Øš[WÙ\œ›ÜœÈ×JK›[™İÈ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈX^ZYÚˆŒİ™\™›İÎˆ	Ø]]ÉÈHKœ™XÙ[Û[Øš[WÙ\œ›ÜœË›X\
ˆOˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÙ^Nˆ‹šYİ[NˆÈ›Ü™\›İÛNˆ	Ì\ÛÛY˜\ŠK[[™JIËY[™Îˆ	ÍÜ	ÈHKˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[‹œØÜ™Y[ˆ	Ø\	ÊKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈ›ÛÚ^™NˆLˆHK‹›Y\ÜØYÙJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ›ÛÚ^™NˆLHKˆšŠ‹˜Ü™X]YØ]
KˆˆLÈL—LŒÌ×LŒ‘WLÈ‹ˆ‹˜\İ™\œÚ[Ûˆ	ø %	ÊJJJHˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]YˆK—LWLLŒÌWLŒ‘—LĞÈLŒ—LŒLŒHL—LŒÍLŒ‘—LÈLŒ×LŒÌ×LŒKˆŠJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ˜Ø\™\ˆKˆ™XXİ˜Ü™X]Q[[Y[
š‹[—LŒÍLNWLŒÌ×LŒWLŒ×L×LŒ×LĞÈLŒŒ—LWLLŒ×LĞ×LˆŠKˆ
œ™XÙ[ÛÙ™›[™WÙ˜Z[\™\È×JK›[™İÈ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈX^ZYÚˆŒİ™\™›İÎˆ	Ø]]ÉÈHKœ™XÙ[ÛÙ™›[™WÙ˜Z[\™\Ë›X\
ˆOˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÙ^Nˆ‹šYİ[NˆÈ›Ü™\›İÛNˆ	Ì\ÛÛY˜\ŠK[[™JIËY[™Îˆ	ÍÜ	ÈHKˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[‹œİ]\ÊKˆˆLÈ‹ˆ‹š][Wİ\H‹œÛİ\˜ÙWÜ]	ø %	Ëˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈ›ÛÚ^™NˆL‹ÛÛÜˆ	İ˜\ŠKY[™Ù\ŠIÈHK‹™\œ›Üˆ‹˜ÛÛ™›XİÜ™X\ÛÛˆ	ÉÊKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ›ÛÚ^™NˆLHKšŠ‹˜Ü™X]YØ]
JJJJHˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]YˆK—LWLLŒÌWLŒ‘—LĞÈLŒ—LŒLŒHL—LŒÍLŒ‘—LÈLŒ×LŒÌ×LŒKˆŠJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ˜Ø\™\ˆKˆ™XXİ˜Ü™X]Q[[Y[
š‹[—LŒWLŒ×LŒÌWLĞ×LŒ‘WL—LÈL—LNWLŒ×L×LŒÈŠKˆ
˜ÚXÚÜ×Ú\İÜH×JK›[™İÈ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈX^ZYÚˆŒİ™\™›İÎˆ	Ø]]ÉÈHK˜ÚXÚÜ×Ú\İÜK›X\

‹JHOˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÙ^NˆKİ[NˆÈ›Ü™\›İÛNˆ	Ì\ÛÛY˜\ŠK[[™JIËY[™Îˆ	ÍÜ	ÈHKˆ˜YÙJ‹œİ]\ÊKˆˆ‹ˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹È\ˆ›ˆˆK‹˜ÚXÚ×ÚÙ^JKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈ›ÛÚ^™NˆLˆHK‹›Y\ÜØYÙJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ›ÛÚ^™NˆLHKšŠ‹˜ÚXÚÙYØ]
JJJJHˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]YˆK—L×L—LLŒÌˆL—LNHLŒ—LŒLŒHL—LŒÍLŒ‘—LÈLŒ×LŒÌ×LŒKˆŠJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ˜Ø\™\‹İ[NˆÈX\™Ú[•ÜˆMˆHKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈ\İYPÛÛ[ˆ	ÜÜXÙKX™]ÙY[‰Ë[YÛ’][\Îˆ	ØÙ[\‰ËØ\ˆ›^Ü˜\ˆ	İÜ˜\	ÈHKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
š‹[—LŒÌ×LLŒ×LWLŒHLŒ‘—LŒÌ×LŒWLQ—LŒ×L×LŒ×L×LŒ×LĞÈLWLLŒLŒ×LĞ×LŠKˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ›ÛÚ^™NˆLˆHK—LŒŒ—LŒ‘WLŒÌWLĞ×LˆLLŒÍ—LŒÎWLĞ×LŒHLŒLŒ×LŒWLŒÌWLĞ×LŒÈLŒ‘LŒ×LWLŒÎL×LŒÈLŒÍLŒLNWL×LŒÈLÑWLŒ×LŒÌ×LŒ‘HTHLL—LŒÌ×LŒ‘WLÈLŒ×L—LŒ‘—LŒÌWLLĞ×LŒ‘ˆLNWLŒ×LŒÌWLŒLŒÌWLŒ×L‹ˆŠJKˆ™XXİ˜Ü™X]Q[[Y[
™›Ü›H‹ÈÛ\ÜÓ˜[YNˆœŞ\İ[KZX[Y]šXÙK\ÙX\˜Ú‹Û”İX›Z]ˆHOˆÈKœ™]™[Y˜][

NÈØY]šXÙ\ÊJNÈHKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹È[›Üˆ™]šXÙKZX[\ÙX\˜ÚˆK—LŒ×LŒÌ×LŒWLŒ×LLŒ×LLĞÈLŒ‘—LŒÌ×LŒWLQ—LŒ×LÈŠKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈYˆ™]šXÙKZX[\ÙX\˜Ú‹Û\ÜÓ˜[YNˆš[œ]‹\NˆœÙX\˜Ú‹˜[YNˆKÛÚ[™ÙNˆHOˆÙ]JK\™Ù]˜[YJKXÙZÛ\ˆ—L—LŒ×LHLNWLŒ×LŒÌWLŒLŒÌWLŒÈLWLŒ‘—LLĞ×LŒÈL—LŒÌ×LŒ‘WLÈˆJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹\NˆœİX›Z]‹\ØX›Yˆ]šXÙ\ÓØY[™ÈK]šXÙ\ÓØY[™ÈÈ	ö+ö,H6+v)öa6+6,ö*¸ #6b6+6b8 )‰Èˆ	ö+6,ö*¸ #6b6+6b	ÊKˆH	‰ˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹È\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜ˆÈ‹\ØX›Yˆ]šXÙ\ÓØY[™ËÛÛXÚÎˆ

HOˆÈÙ]J	ÉÊNÈØY]šXÙ\Ê	ÉÊNÈHK—LÑWLŒ×LNWLŒ×LNWLŒÌWLŒ‘—LˆŠJJKˆ]šXÙQ\œ›Üˆ	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆÛÜšÜÜXÙKZ[›[™KY\œ›Üˆ‹›ÛNˆ˜[\ˆKˆ]šXÙQ\œ›Ü‹ˆˆ‹ˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹\Nˆ˜]Ûˆ‹ÛÛXÚÎˆ

HOˆØY]šXÙ\ÊJHK—LŒWLLŒ×LŒÍLŒ‘—LLŒLŒ×LŒÌWLÈŠJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ™ÜšY‹İ[NˆÈX\™Ú[ˆ	ÌL	ÈHKÂˆÉö+ö,ö*¶«ö)öaø #6aö)ÉË]šXÙTİ]Ëİ[Ù]šXÙ\×KÉö*6+öb6aˆ6«ö,¶)ö,v-6*¶)ö,¶aÉË]šXÙTİ]Ëœİ[WÙ]šXÙ\×KÉö+¶-ö)öãTIË]šXÙTİ]Ë˜\WÙ˜Z[YKÉö(¶`va6)öã6a‰Ë]šXÙTİ]Ë›Ù™›[™WÙ]šXÙ\×KÉö*6)ö*¶,vã6ªvaIË]šXÙTİ]Ë›İ×Ø˜]\WKÉö+v)ö`v.6aÈ6ªvaIË]šXÙTİ]Ë›İ×ÜİÜ˜YÙWKÉöavã6)öa¶«öã6aˆ6o¶)ö,ö+ˆTIË]šXÙTİ]Ë˜]™×Û][˜ŞWÛ\ÈÈ˜J]šXÙTİ]Ë˜]™×Û][˜ŞWÛ\ÊH
È	È\ÉÈˆ	ø %	×BˆK›X\

ÚË—JHOˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆšÜH‹Ù^NˆÈKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹[ÊKˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[\[ÙˆˆOOH	Û[X™\‰ÈÈ˜JŠHˆ
ˆ	öì	ÊJJJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈİ™\™›İÖˆ	Ø]]ÉÈHKˆ™XXİ˜Ü™X]Q[[Y[
X›H‹Èİ[NˆÈZ[•ÚYˆLML›ÛÚ^™NˆLˆHKˆ™XXİ˜Ü™X]Q[[Y[
XY‹[ˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
‹[—LNWLŒ×LŒÌWLŒLŒÌHŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒ‘—LŒÌ×LŒWLQ—LŒ×LÈŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—L—LŒÌ×LŒ‘WLÈŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒ×L—LŒ‘—LŒÌWLLĞ×LŒ‘ˆŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒLŒ×LŒWLŒÌWLĞÈŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LWLŒÍ—LŒ×LĞÈLŒŒ—LŒÌ—LŒ×LŒ‘ˆŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒÍLŒLNWLÈŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[THŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒŒ—LŒ‘WLŒÌWLĞ×LˆLQ—LŒÌ—LŒ×LŒÌWLŒÍŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LLŒÍ—LŒÎWLĞ×LŒHŠJJKˆ™XXİ˜Ü™X]Q[[Y[
›ÙH‹[]šXÙ\Ë›[™İÈ]šXÙ\Ë›X\
Oˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹ÈÙ^Nˆ\Ù\—ÚY
È	ËIÈ
È™]šXÙWÚÙ^HKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[\Ù\—Û˜[YH	ø %	ÊKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]YˆKœ›ÛWİ]H	ÉÊJKˆ™XXİ˜Ü™X]Q[[Y[
‹[Ş›X[Y˜Xİ\™\‹›[Ù[Û˜[YWK™š[\Š›ÛÛX[ŠKš›Ú[Š	È	ÊH	ø %	ÊKˆ™XXİ˜Ü™X]Q[[Y[
‹È\ˆ›ˆˆK˜\İ™\œÚ[Ûˆ	ø %	ÊKˆ™XXİ˜Ü™X]Q[[Y[
‹[˜[™›ÚYÜÙÈÈ˜J˜[™›ÚYÜÙÊHˆ	ø %	ÊKˆ™XXİ˜Ü™X]Q[[Y[
‹[˜˜]\WÛ]™[OH[È˜J˜˜]\WÛ]™[
H
È	öj‰Èˆ	ø %	ÊKˆ™XXİ˜Ü™X]Q[[Y[
‹[™œ™YWÙ\Ú×Ø]\ÈOH[È˜JX]œ›İ[™
[X™\Š™œ™YWÙ\Ú×Ø]\ÊHÈLÌÍÍN
JH
È	ÈĞ‰Èˆ	ø %	ÊKˆ™XXİ˜Ü™X]Q[[Y[
‹[[X™\Š›™]ÛÜš×ØÛÛ›™XİY
HÈ	öav*¶-va	Èˆ	ö`¶-ö.IÊKˆ™XXİ˜Ü™X]Q[[Y[
‹[[X™\Š˜\WÛÚÊHÈ˜J˜\WÛ][˜ŞWÛ\È
H
È	È\ÉÈˆ	öa¶)öavb6`v`‰ÊKˆ™XXİ˜Ü™X]Q[[Y[
‹[šŠ˜Ø\\™YØ]
JKˆ™XXİ˜Ü™X]Q[[Y[
‹[˜YÙJšX[Üİ]\ÈOOH	Üİ[IÈÈ	İØ\›š[™ÉÈˆšX[Üİ]\ÊJJJHˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
‹ÈÛÛÜ[ˆŒL‹Û\ÜÓ˜[YNˆ›]]YˆK]šXÙ\ÓØY[™ÈÈ	ö+ö,H6+v)öa6+ö,vã6)ö`v*ˆ6)ö-öa6)ö.v)ö*ˆ6+ö,ö*¶«ö)öaø #6aö)ø )‰Èˆ]šXÙQ\œ›ÜˆÈ	ö)ö-öa6)ö.v)ö*ˆ6+ö,ö*¶«ö)öaø #6aö)È6+ö,H6+ö,ö*¶,v,È6a¶ã6,ö*‹‰Èˆ	öaöã6¡ˆ6«ö,¶)ö,v-6+ö,ö*¶«ö)öaöã6*6,v)öã6)öã6aˆ6+6,ö*¸ #6b6+6b6ã6)ö`v*ˆ6a¶-6+Ë‰ÊJJJJJKˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ›ÛÚ^™NˆL‹X\™Ú[•ÜˆLˆHKˆ—LŒLŒÌWLŒ×LĞÈLŒ—LŒLŒHLŒ‘—LLŒÌWL×LŒ×LŒ×LĞÈLŒÌ×LLŒ×LWLŒWLŒÈLNWLŒÌWLL—LŒ×LŒ×LŒ×LŒLŒÌWLŒÈLŒÌWLLĞÈ‹ˆ™XXİ˜Ü™X]Q[[Y[
˜ÛÙH‹È\ˆ›ˆˆK‹Ø\KØÜ›Û‹ÜŞ\İ[KZX[\›Ø™OÚÙ^OPÔ“Ó—ÒÑVHŠKˆˆLŒWL—LŒÎLĞ×LHLNWL—LĞ×LŒ‘‹ˆŠJJJNÂŸB™[˜İ[ÛˆÛÛ\[T™\]Y\İĞYZ[Š
HÂˆÛÛœİÕUTÈHÈ˜Yˆ¶o¶ã6-8 #6a¶b6ã6,È‹Øİ[Y[×Ü[™[™Îˆ¶+ö,H6)öa¶*¶.6)ö,H6av+ö)ö,vªH‹^[Y[Ü[™[™Îˆ¶+ö,H6)öa¶*¶.6)ö,H6o¶,v+ö)ö+¶*ˆ‹[™[™×Ü™]šY]Îˆ¶+ö,H6)öa¶*¶.6)ö,H6*6,v,v,öã‹™YY×ØÛÜœ™Xİ[Ûˆ¶a¶ã6)ö,¶ava¶+È6)ö-va6)ö+H‹\›İ™Yˆ¶*¶(öã6ã6+ö-6+öaÈ‹™Z™XİYˆ¶,v+ö-6+öaÈ‹ÛÛ\]Yˆ¶*¶ªvavã6a8 #6-6+öaÈ‹Ø[˜Ù[Yˆ¶a6.¶b6-6+öaÈˆNÂˆÛÛœİVHHÈ[œZYˆ¶o¶,v+ö)ö+¶*¸ #6a¶-6+öaÈ‹[™[™Îˆ¶+ö,H6)öa¶*¶.6)ö,H6*6,v,v,öã‹ZYˆ¶o¶,v+ö)ö+¶*¸ #6-6+öaÈ‹™Z™XİYˆ¶,v+ö-6+öaÈ‹˜Z[Yˆ¶a¶)öavb6`v`ˆˆNÂˆÛÛœİĞÈHÈXÚšXØ[Ú[œÜXİ[Ûˆ¶av.v)öã6a¶aÈ6`va¶ã‹[œİ\˜[˜ÙWÜÛXŞNˆ¶*6ã6avaø #6a¶)öavaÈ‹˜][Û˜[ØØ\™ˆ¶ªv)ö,v*ˆ6ava6ã‹š\ØÙ\YšXØ]WÜYÙLNˆ¶-6a¶)ö,öa¶)öavaÈ6-v`v+vaÈ6)öb6a‹š\ØÙ\YšXØ]WÜYÙLˆ¶-6a¶)ö,öa¶)öavaÈ6-v`v+vaÈ6+öb6aH‹™\ÚY[˜ÙWÙØİ[Y[ˆ¶av+ö,vªH6,öªvb6a¶*ˆ‹XÙ[œÙWÙœ›Ûˆ¶«öb6)öaöã6a¶)öavaÈ6,vb‹XÙ[œÙWØ˜XÚÎˆ¶«öb6)öaöã6a¶)öavaÈ6o¶-6*ˆ‹\œÛÛ˜[ÜİÎˆ¶.vªv,È6o¶,v,öa¶a6ã‹™ZXÛWØØ\™Ùœ›Ûˆ¶ªv)ö,v*ˆ6+¶b6+ö,vb6,vb‹™ZXÛWØØ\™Ø˜XÚÎˆ¶ªv)ö,v*ˆ6+¶b6+ö,vb6o¶-6*ˆ‹^[Y[Ü™XÙZ\ˆ¶,v,öã6+È6o¶,v+ö)ö+¶*ˆˆNÂˆÛÛœİİX‹Ù]X—HH\ÙTİ]Jœ™\]Y\İÈŠKÚ][\ËÙ]][\×HH\ÙTİ]J×JKÜKÙ]WHH\ÙTİ]JˆŠKÜİ]\ËÙ]İ]\×HH\ÙTİ]JˆŠKÜ^[Y[İ]\ËÙ]^[Y[İ]\×HH\ÙTİ]JˆŠKÛİ™\™YSÛ›KÙ]İ™\™YSÛ›WHH\ÙTİ]J˜[ÙJKÜİ]ËÙ]İ]×HH\ÙTİ]JßJKÛØY[™ËÙ]ØY[™×HH\ÙTİ]J˜[ÙJKÜXÚËÙ]XÚ×HH\ÙTİ]J[
KÙ]Z[Ù]]Z[HH\ÙTİ]J[
KÛ›İKÙ]›İWHH\ÙTİ]JˆŠKÜÙ][™ÜËÙ]Ù][™Ü×HH\ÙTİ]JßJKİ\\ËÙ]\\×HH\ÙTİ]J×JKÜØ]™YÙ]Ø]™YHH\ÙTİ]J˜[ÙJKÙ\œ‹Ù]\œ—HH\ÙTİ]JˆŠNÂˆÛÛœİØYİ]ÈH\Ş[˜È

HOˆÈHÂˆÛÛœİH]ØZ]ÑS‘
	ÑÑU	Ë	ËØYZ[‹ØÛÛ\[K\™\]Y\İËÜİ]ÉÊNÂˆÙ]İ]Êœİ]ÈßJNÂˆBˆØ]Ú
JHÂˆÙ]\œŠK›Y\ÜØYÙJNÂˆHNÂˆÛÛœİØYH\Ş[˜È

HOˆÈÙ]ØY[™ÊYJNÈÙ]\œŠˆŠNÈHÂˆÛÛœİH]ØZ]ÑS‘
	ÑÑU	Ë	ËØYZ[‹ØÛÛ\[K\™\]Y\İÏÉÈ
È™]ÈT“ÙX\˜Ú\˜[\ÊÈKİ]\Ë^[Y[Üİ]\Îˆ^[Y[İ]\Ëİ™\™YNˆİ™\™YSÛ›HÈ	ÌIÈˆ	Ì	ÈJJNÂˆÙ]][\Êš][\È×JNÂˆBˆØ]Ú
JHÂˆÙ]\œŠK›Y\ÜØYÙJNÂˆBˆš[˜[HÂˆÙ]ØY[™Ê˜[ÙJNÂˆHNÂˆÛÛœİØYÙ][™ÜÈH\Ş[˜È

HOˆÈHÂˆÛÛœİH]ØZ]ÑS‘
	ÑÑU	Ë	ËØYZ[‹ØÛÛ\[K\™\]Y\İ\Ù][™ÜÉÊNÂˆÙ]Ù][™ÜÊœÙ][™ÜÈßJNÂˆÙ]\\Ê\\È×JNÂˆBˆØ]Ú
JHÂˆÙ]\œŠK›Y\ÜØYÙJNÂˆHNÂˆ\ÙQY™™Xİ


HOˆÈØY

NÈØYİ]Ê
NÈØYÙ][™ÜÊ
NÈK×JNÂˆÛÛœİÜ[ˆH\Ş[˜È
Y
HOˆÈÙ]XÚÊY
NÈÙ]]Z[
[
NÈÙ]›İJˆŠNÈHÂˆÛÛœİH]ØZ]ÑS‘
	ÑÑU	Ë	ËØYZ[‹ØÛÛ\[K\™\]Y\İËÉÈ
ÈY
NÂˆÙ]]Z[
š][JNÂˆBˆØ]Ú
JHÂˆÙ]\œŠK›Y\ÜØYÙJNÂˆHNÂˆÛÛœİXİH\Ş[˜È
]›ÙJHOˆÈÙ]\œŠˆŠNÈHÂˆ]ØZ]ÑS‘
	ÔÔÕ	Ë]›ÙJNÂˆ]ØZ]Ü[ŠXÚÊNÂˆ]ØZ]ØY

NÂˆ]ØZ]ØYİ]Ê
NÂˆBˆØ]Ú
JHÂˆÙ]\œŠK›Y\ÜØYÙJNÂˆHNÂˆÛÛœİÚ[™ÙTİ]\ÈH\Ş[˜È
İ
HOˆÂˆÛÛœİÛX[“›İHHİš[™Ê›İH	ÉÊKš[J
NÂˆYˆ

İOOH	Ü™Z™XİY	ÈİOOH	ØØ[˜Ù[Y	ÊH	‰ˆXÛX[“›İJHÂˆÙ]\œŠ	ö*6,v)öã6,v+È6ã6)È6a6.¶b6+ö,v+¶b6)ö,ö*¶#6*ö*6*ˆ6*¶b6-¶ã6+H6)öa6,¶)öavã6)ö,ö*‹‰ÊNÂˆ™]\›ÂˆBˆ]ØZ]Xİ
	ËØYZ[‹ØÛÛ\[K\™\]Y\İËÉÈ
ÈXÚÈ
È	ËÜİ]\ÉËÈİ]\Îˆİš[™Êİ	ÉÊKš[J
K›İNˆÛX[“›İHJNÂˆNÂˆÛÛœİ[]T™\]Y\İH\Ş[˜È

HOˆÂˆYˆ
\XÚÊBˆ™]\›ÂˆÛÛœİÛÙHH
]Z[OOH[]Z[OOH›ÚYÈ›ÚYˆ]Z[˜XÚÚ[™×ØÛÙJHÈ
	È6*6)È6ªv+È6,vaö«öã6,vã	È
È]Z[˜XÚÚ[™×ØÛÙJHˆ	ÉÎÂˆYˆ
]Ú[™İË˜ÛÛ™š\›J	ö+ö,v+¶b6)ö,ö*‰È
ÈÛÙH
È	È6b6*¶av)öaH6av+ö)ö,vªH6b6o¶,v+ö)ö+¶*¸ #6aö)öã6b6)ö*6,ö*¶aÈ6+v,6`H6-6b6+ö'È6)öã6aˆ6.vava6ã6)ö*ˆ6`¶)ö*6a6*6)ö,¶«ö-6*ˆ6a¶ã6,ö*‹‰ÊJBˆ™]\›ÂˆÙ]\œŠ	ÉÊNÂˆHÂˆ]ØZ]ÑS‘
	ÑSUIË	ËØYZ[‹ØÛÛ\[K\™\]Y\İËÉÈ
ÈXÚËßJNÂˆÙ]XÚÊ[
NÂˆÙ]]Z[
[
NÂˆÙ]›İJ	ÉÊNÂˆ]ØZ]ØY

NÂˆ]ØZ]ØYİ]Ê
NÂˆBˆØ]Ú
JHÂˆÙ]\œŠK›Y\ÜØYÙH	ö+v,6`H6+ö,v+¶b6)ö,ö*ˆ6a¶)öavb6`v`ˆ6*6b6+ÉÊNÂˆBˆNÂˆÛÛœİÛÜœ™Xİ[ÛˆH

HOˆÈYˆ
[›İKš[J
JBˆ™]\›ˆÙ]\œŠ	ö*¶b6-¶ã6+H6)ö-va6)ö+v)ö*ˆ6,v)È6b6)ö,v+È6ªva¶ã6+Ë‰ÊNÈXİ
	ËØYZ[‹ØÛÛ\[K\™\]Y\İËÉÈ
ÈXÚÈ
È	ËÜ™\]Y\İXÛÜœ™Xİ[Û‰ËÈ›İHJNÈNÂˆÛÛœİ™]šY]Ô^HH
^KXÚ\Ú[ÛŠHOˆÈ]™X\ÛÛˆH	ÉÎÈYˆ
XÚ\Ú[ÛˆOOH	Ü™Z™Xİ	ÊHÂˆ™X\ÛÛˆH›Û\
	ö.va6*ˆ6,v+È6o¶,v+ö)ö+¶*ˆ6,v)È6b6)ö,v+È6ªva¶ã6+Î‰ÊH	ÉÎÂˆYˆ
\™X\ÛÛŠBˆ™]\›ÂˆHÛÛœİÜ›İHH›Û\
	öã6)ö+ö+ö)ö-6*ˆ6)öo¶,v)ö*¶b6,H
6)ö+¶*¶ã6)ö,vã
N‰ÊH	ÉÎÈXİ
	ËØYZ[‹ØÛÛ\[K\™\]Y\İËÉÈ
ÈXÚÈ
È	ËÜ^[Y[\™]šY]ÉËÈ^[Y[ÚYˆ^KšYXÚ\Ú[Û‹™X\ÛÛ‹›İNˆÜ›İHJNÈNÂˆÛÛœİØ]™TÙ][™ÜÈH\Ş[˜È

HOˆÈÙ]Ø]™Y
˜[ÙJNÈÙ]\œŠˆŠNÈHÂˆ]ØZ]ÑS‘
	ÔÔÕ	Ë	ËØYZ[‹ØÛÛ\[K\™\]Y\İ\Ù][™ÜÉËÈÙ][™ÜË\\ÈJNÂˆÙ]Ø]™Y
YJNÂˆ]ØZ]ØYÙ][™ÜÊ
NÂˆBˆØ]Ú
JHÂˆÙ]\œŠK›Y\ÜØYÙJNÂˆHNÂˆÛÛœİØØ[”ÛHH\Ş[˜È

HOˆÈÙ]\œŠˆŠNÈHÂˆÛÛœİH]ØZ]ÑS‘
	ÔÔÕ	Ë	ËØYZ[‹ØÛÛ\[K\™\]Y\İËÜÛK\ØØ[‰ËßJNÂˆ[\
	Ù˜J˜Ûİ[
_H6aö-6+ö)ö,H6avaöa6*ˆ6*6,v,v,öã6b6)ö,v,ö)öa6-6+Ë˜
NÂˆ]ØZ]ØYİ]Ê
NÂˆ]ØZ]ØY

NÂˆBˆØ]Ú
JHÂˆÙ]\œŠK›Y\ÜØYÙJNÂˆHNÂˆÛÛœİ[Û™^HHˆOˆ˜J[X™\Šˆ
KÓØØ[Tİš[™Ê	Ù[‹UTÉÊJH
È	È6,vã6)öa	ÎÂˆÛÛœİÙXİ\™PÛÛ\[SYYXU\›H]OˆÈÛÛœİÛX[ˆHİš[™Ê]	ÉÊKœ™\XÙJ×—ÊËË	ÉÊNÈYˆ
XÛX[ŠBˆ™]\›ˆ	ÉÎÈÛÛœİHH	ËØ\KÛYYXOÜ]IÈ
È[˜ÛÙUT’PÛÛ\Û™[
ÛX[ŠNÈÛÛœİÚÙ[ˆHØØ[İÜ˜YÙKÚÙ[ˆ	ÉÎÈ™]\›ˆÚÙ[ˆÈH
È	ÉÚÙ[IÈ
È[˜ÛÙUT’PÛÛ\Û™[
ÚÙ[ŠHˆNÈNÂˆÛÛœİš[U\›HˆOˆÙXİ\™PÛÛ\[SYYXU\›
‹œ›ØÙ\ÜÙYÜ]‹™š[WÜ]	ÉÊNÂˆÛÛœİ[X•\›HˆOˆÙXİ\™PÛÛ\[SYYXU\›
‹[X›˜Z[Ü]‹œ›ØÙ\ÜÙYÜ]‹™š[WÜ]	ÉÊNÂˆ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ˜YZ[‹]ÛÜšÜÜXÙK\YÙHˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆX\™Ú[›İÛNˆM›^Ü˜\ˆ	İÜ˜\	ÈHKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ	Øˆ	È
È
XˆOOH	Ü™\]Y\İÉÈÈ	Ü	Èˆ	ÉÊKÛÛXÚÎˆ

HOˆÙ]XŠ	Ü™\]Y\İÉÊHK—LŒ‘—LŒÌWLŒ‘WLLŒ×LŒÌ×LŒWLŒ×L×LŒÈŠKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ	Øˆ	È
È
XˆOOH	ÜÙ][™ÜÉÈÈ	Ü	Èˆ	ÉÊKÛÛXÚÎˆ

HOˆÙ]XŠ	ÜÙ][™ÜÉÊHK—LŒWLŒÎWLŒÌWLWLÈLLÑWLŒÌWLŒ‘—LŒ×LŒ‘WLŒHŠJKˆ\œˆ	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ[™[‹İ[NˆÈ›Ü™\ÛÛÜˆ	İ˜\ŠKY[™Ù\ŠIËÛÛÜˆ	İ˜\ŠKY[™Ù\ŠIËX\™Ú[›İÛNˆLˆHK\œŠKˆXˆOOH	Ü™\]Y\İÉÈ	‰ˆ™XXİ˜Ü™X]Q[[Y[
™XXİ‘œ˜YÛY[[ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈ\Ü^Nˆ	ÙÜšY	ËÜšY[\]PÛÛ[[œÎˆ	Ü™\X]
]]ËYš]Z[›X^
M\YœŠJIËØ\ˆLX\™Ú[›İÛNˆLˆHKÖÉöªva6+ö,v+¶b6)ö,ö*¸ #6aö)ÉËİ]Ëİ[	ü'äê	×KÉö)öav,vb6,‰Ëİ]ËÙ^WØÛİ[	ü'åäÉ×KÉö+ö,H6)öa¶*¶.6)ö,H6*6,v,v,öã	Ëİ]Ëœ[™[™×Ü™]šY]Ë	ü'å#‰×KÉöa¶ã6)ö,¶ava¶+È6)ö-va6)ö+IËİ]Ë›™YY×ØÛÜœ™Xİ[Û‹	ü'æè	×KÉöo¶,v+ö)ö+¶*¸ #6aö)öã6av.va6`‰Ëİ]Ëœ^[Y[Ü[™[™Ë	ü'ä¬É×KÉö+¶)ö,v+6)ö,ˆ6avaöa6*‰Ëİ]Ë›İ™\™YK	ø£ì	×KÉö*¶ªvavã6a8 #6-6+öaÉËİ]Ë˜ÛÛ\]Y	ø§!I×WK›X\

JHOˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÙ^NˆKÛ\ÜÓ˜[YNˆœ[™[‹İ[NˆÈY[™ÎˆL‹›Ü™\ÛÛÜˆHOOHH	‰ˆ[X™\ŠÌWJHˆÈ	İ˜\ŠKY[™Ù\ŠIÈˆ[™Yš[™YHKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈ›ÛÚ^™NˆŒˆHKÌ—JKˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹Èİ[NˆÈ›ÛÚ^™NˆŒˆHK˜JÌWH
JKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]YˆKÌJJJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ[™[ˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆ›^Ü˜\ˆ	İÜ˜\	ÈHKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹XÙZÛ\ˆ—LŒ×LŒÌ×LŒWLŒ×LLĞÈLNWLŒ‘ˆLŒÌWL×LQ—LĞ×LŒÌWLĞ×LŒÈLNWLŒ×LŒÌWLŒLŒÌHLĞ×LŒÈLŒ‘WLŒ‘—LWLŒH‹˜[YNˆKÛÚ[™ÙNˆHOˆÙ]JK\™Ù]˜[YJKİ[NˆÈX^ÚYˆÌÌHJKˆ™XXİ˜Ü™X]Q[[Y[
œÙ[Xİ‹ÈÛ\ÜÓ˜[YNˆš[œ]‹˜[YNˆİ]\ËÛÚ[™ÙNˆHOˆÙ]İ]\ÊK\™Ù]˜[YJKİ[NˆÈX^ÚYˆŒLHKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆˆˆK—L×LWLÈLLŒÍ—LŒÎWLĞ×LŒWLŒ×L×LŒÈŠKˆØš™Xİ™[šY\ÊÕUTÊK›X\

ÚË—JHOˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹ÈÙ^NˆË˜[YNˆÈKŠJJKˆ™XXİ˜Ü™X]Q[[Y[
œÙ[Xİ‹ÈÛ\ÜÓ˜[YNˆš[œ]‹˜[YNˆ^[Y[İ]\ËÛÚ[™ÙNˆHOˆÙ]^[Y[İ]\ÊK\™Ù]˜[YJKİ[NˆÈX^ÚYˆNLHKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆˆˆK—L×LWLÈLÑWLŒÌWLŒ‘—LŒ×LŒ‘WLŒWLŒ×L×LŒÈŠKˆØš™Xİ™[šY\ÊVJK›X\

ÚË—JHOˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹ÈÙ^NˆË˜[YNˆÈKŠJJKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆˆHKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹È\Nˆ˜ÚXÚØ›Ş‹ÚXÚÙYˆİ™\™YSÛ›KÛÚ[™ÙNˆHOˆÙ]İ™\™YSÛ›JK\™Ù]˜ÚXÚÙY
HJKˆ—LWL—LŒÍÈLŒ‘WLŒ×LŒÌWLŒÈLŒ×LŒÌˆLWL×LLŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹ÛÛXÚÎˆ

HOˆÈØY

NÈØYİ]Ê
NÈHK—LŒ×LŒÌ×LŒWLŒ×LŠKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹ÛÛXÚÎˆØØ[”ÛHK—LŒLŒÌWLŒÌWLŒÌ×LĞÈLLŒ×LŒÎWLLŒ×LˆLWL×LLŒWLŒ×L×LŒÈŠJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ[™[‹İ[NˆÈİ™\™›İÖˆ	Ø]]ÉÈHKØY[™ÈÈ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈY[™Îˆ^[YÛˆ	ØÙ[\‰ÈHK—LŒ‘—LŒÌHLŒ‘LŒ×LLŒ‘—LŒÌWLĞ×LŒ×LWLŒWLŒˆŠHˆ™XXİ˜Ü™X]Q[[Y[
X›H‹[ˆ™XXİ˜Ü™X]Q[[Y[
XY‹[ˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
‹[—LNWLŒ‘ˆLŒÌWL×LQ—LĞ×LŒÌWLĞÈŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LWLŒWL—LŒ×LŒÍ—LĞÈŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒ‘WLŒ‘—LWLŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LWLŒLLŒĞHŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LÑWLŒÌWLŒ‘—LŒ×LŒ‘WLŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LLŒÍ—LŒÎWLĞ×LŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒWLŒ×LŒÌWLĞ×LŒ‘HŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[
JJKˆ™XXİ˜Ü™X]Q[[Y[
›ÙH‹[ˆ][\Ë›X\
Oˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹ÈÙ^NˆšYKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[˜XÚÚ[™×ØÛÙJJKˆ™XXİ˜Ü™X]Q[[Y[
‹[\Ù\—Û˜[YH	ø %	ÊKˆ™XXİ˜Ü™X]Q[[Y[
‹[œ™\]Y\İİ\Wİ]JKˆ™XXİ˜Ü™X]Q[[Y[
‹[[Û™^J˜[[İ[
JKˆ™XXİ˜Ü™X]Q[[Y[
‹[VVŞœ^[Y[Üİ]\×Hœ^[Y[Üİ]\ÊKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆÕUTÖŞœİ]\×Hœİ]\Ëˆ[X™\Šš\×Ûİ™\™YJHOOHH	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈÛÛÜˆ	İ˜\ŠKY[™Ù\ŠIË›ÛÚ^™NˆLHHK—LŒ‘WLŒ×LŒÌWLŒÈLŒ×LŒÌˆLWL×LLŒHŠJKˆ™XXİ˜Ü™X]Q[[Y[
‹[˜Q]J˜Ü™X]YØ]
JKˆ™XXİ˜Ü™X]Q[[Y[
‹Èİ[NˆÈÛÛÜˆ[X™\Šš\×Ûİ™\™YJHOOHHÈ	İ˜\ŠKY[™Ù\ŠIÈˆ[™Yš[™YHK™YWØ]È˜Q]J™YWØ]
Hˆ	ø %	ÊKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹ÛÛXÚÎˆ

HOˆÜ[ŠšY
HK—LŒLŒÌWLŒÌWLŒÌ×LĞÈŠJJJKˆZ][\Ë›[™İ	‰ˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
‹ÈÛÛÜ[ˆ‹İ[NˆÈ^[YÛˆ	ØÙ[\‰ËÛÛÜˆ	İ˜\ŠK[]]Y
IÈHK—LŒ‘—LŒÌWLŒ‘WLLŒ×LŒÌ×LŒWLĞÈLĞ×LŒ×LWLŒHL—LŒÍLŒ‘‹ˆŠJJJJJKˆXˆOOH	ÜÙ][™ÜÉÈ	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ[™[ˆKˆ™XXİ˜Ü™X]Q[[Y[
šÈ‹[—LŒWLŒÎWLŒÌWLWLÈLŒ‘WLŒ‘—LWLŒ×LŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈİ™\™›İÖˆ	Ø]]ÉÈHKˆ™XXİ˜Ü™X]Q[[Y[
X›H‹[ˆ™XXİ˜Ü™X]Q[[Y[
XY‹[ˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒ‘WLŒ‘—LWLŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LWLŒLLŒĞH
LŒÌWLĞ×LŒ×L
HŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LWL×LLŒH
LŒÌWLLŒÌŠHŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LWLŒÎWLŒ×LŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒWLLŒÍ—LĞ×LŒ‘LŒ×LŒHŠJJKˆ™XXİ˜Ü™X]Q[[Y[
›ÙH‹[\\Ë›X\

JHOˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹ÈÙ^NˆšYKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹˜[YNˆ]H	ÉËÛÚ[™ÙNˆHOˆÙ]\\Ê\\Ë›X\

‹ŠHOˆˆOOHHÈÈ‹‹‹]NˆK\™Ù]˜[YHHˆŠJHJJKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹\Nˆ›[X™\ˆ‹Z[ˆŒ‹˜[YNˆœšXÙHÛÚ[™ÙNˆHOˆÙ]\\Ê\\Ë›X\

‹ŠHOˆˆOOHHÈÈ‹‹‹šXÙNˆ
ÙK\™Ù]˜[YHHˆŠJHJJKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹\Nˆ›[X™\ˆ‹Z[ˆŒH‹˜[YNˆ™XY[™WÙ^\ÈKÛÚ[™ÙNˆHOˆÙ]\\Ê\\Ë›X\

‹ŠHOˆˆOOHHÈÈ‹‹‹XY[™WÙ^\Îˆ
ÙK\™Ù]˜[YHHHˆŠJHJJKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹È\Nˆ˜ÚXÚØ›Ş‹ÚXÚÙYˆHS[X™\Š™[˜X›Y
KÛÚ[™ÙNˆHOˆÙ]\\Ê\\Ë›X\

‹ŠHOˆˆOOHHÈÈ‹‹‹[˜X›YˆK\™Ù]˜ÚXÚÙYÈHˆHˆŠJHJJKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹˜[YNˆ™\ØÜš\[Ûˆ	ÉËÛÚ[™ÙNˆHOˆÙ]\\Ê\\Ë›X\

‹ŠHOˆˆOOHHÈÈ‹‹‹\ØÜš\[ÛˆK\™Ù]˜[YHHˆŠJHJJJJJJJKˆ™XXİ˜Ü™X]Q[[Y[
šÈ‹Èİ[NˆÈX\™Ú[•ÜˆŒHK—LŒÌWLLŒÍLŒ×L×LŒ×LĞÈLÑWLŒÌWLŒ‘—LŒ×LŒ‘WLŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ™ÜšYˆˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—LŒÌWLLŒÍLWLŒÎWLŒ×LŠKˆ™XXİ˜Ü™X]Q[[Y[
œÙ[Xİ‹ÈÛ\ÜÓ˜[YNˆš[œ]‹˜[YNˆÙ][™ÜËœ^[Y[Û[ÙH	Ø›İ	ËÛÚ[™ÙNˆHOˆÙ]Ù][™ÜÊÈ‹‹œÙ][™ÜË^[Y[Û[ÙNˆK\™Ù]˜[YHJHKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆ˜›İˆK—LNWLĞ×LHLÑWLLLŒLLÈLLNWLŒ×LŒÌWLŒWLŒ×LŒL×LŒ×LNWLŒ×LŒÌWLŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆ˜˜[WİØ[]ˆK—LWL—LŒÍÈLNWLĞ×LHLÑWLLLŒLLÈŠKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆ˜Ø\™İ×ØØ\™ˆK—LWL—LŒÍÈLNWLŒ×LŒÌWLŒWLŒ×LŒL×LŒ×LNWLŒ×LŒÌWLŒHŠJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—LWLŒÎWLŒ×LLŒ×LŒLLŒ‘—LˆLÑWLŒÌWLŒ‘—LŒ×LŒ‘WLŒHLŒLLÈŠKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆHKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹È\Nˆ˜ÚXÚØ›Ş‹ÚXÚÙYˆH\Ù][™ÜË˜˜[WÜ^[Y[Ù[˜X›YÛÚ[™ÙNˆHOˆÙ]Ù][™ÜÊÈ‹‹œÙ][™ÜË˜[WÜ^[Y[Ù[˜X›YˆK\™Ù]˜ÚXÚÙYJHJKˆ—LWLŒÎWLŒ×LŠJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—LŒWLLNWLˆ›İšY\ˆLŒLLÈŠKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹\Nˆœ\ÜİÛÜ™‹˜[YNˆÙ][™ÜË˜˜[WÜ›İšY\—İÚÙ[ˆ	ÉËÛÚ[™ÙNˆHOˆÙ]Ù][™ÜÊÈ‹‹œÙ][™ÜË˜[WÜ›İšY\—İÚÙ[ˆK\™Ù]˜[YHJHJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—LŒWLŒÍWLLĞ×LŒÌHLŒÍWLLŒÌWLŒWLŒ‘LŒÌ×LŒ×LŒLŒLLÈ
T“
HŠKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹\ˆ›ˆ‹˜[YNˆÙ][™ÜË˜˜[WÚ[›ÚXÙWÜİ×İ\›	ÉËÛÚ[™ÙNˆHOˆÙ]Ù][™ÜÊÈ‹‹œÙ][™ÜË˜[WÚ[›ÚXÙWÜİ×İ\›ˆK\™Ù]˜[YHJHJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—LWLŒÎWLŒ×LLŒ×LŒLLŒ‘—LˆLNWLŒ×LŒÌWLŒWLŒ×LŒL×LŒ×LNWLŒ×LŒÌWLŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆHKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹È\Nˆ˜ÚXÚØ›Ş‹ÚXÚÙYˆÙ][™ÜË˜Ø\™Ü^[Y[Ù[˜X›YOOH˜[ÙKÛÚ[™ÙNˆHOˆÙ]Ù][™ÜÊÈ‹‹œÙ][™ÜËØ\™Ü^[Y[Ù[˜X›YˆK\™Ù]˜ÚXÚÙYJHJKˆ—LWLŒÎWLŒ×LŠJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—L—LŒ×LHLŒLŒ×L—LNHŠKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹˜[YNˆÙ][™ÜË˜Ø\™Ø˜[šÈ	ÉËÛÚ[™ÙNˆHOˆÙ]Ù][™ÜÊÈ‹‹œÙ][™ÜËØ\™Ø˜[šÎˆK\™Ù]˜[YHJHJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—L—LŒ×LHLŒÍWLŒ×LŒ‘LŒLŒ‘LŒÌ×LŒ×LŒŠKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹˜[YNˆÙ][™ÜË˜Ø\™ÛİÛ™\ˆ	ÉËÛÚ[™ÙNˆHOˆÙ]Ù][™ÜÊÈ‹‹œÙ][™ÜËØ\™ÛİÛ™\ˆK\™Ù]˜[YHJHJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—LŒÍLWLŒ×LŒÌWLÈLNWLŒ×LŒÌWLŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹\ˆ›ˆ‹˜[YNˆÙ][™ÜË˜Ø\™Û[X™\ˆ	ÉËÛÚ[™ÙNˆHOˆÙ]Ù][™ÜÊÈ‹‹œÙ][™ÜËØ\™Û[X™\ˆK\™Ù]˜[YHJHJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—LŒÍLWLŒ×LŒÌWLÈLŒÍLŒLŒÈŠKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹\ˆ›ˆ‹˜[YNˆÙ][™ÜË˜Ø\™ÜÚX˜H	ÉËÛÚ[™ÙNˆHOˆÙ]Ù][™ÜÊÈ‹‹œÙ][™ÜËØ\™ÜÚX˜NˆK\™Ù]˜[YHJHJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—LWL×LLŒHLŒ×LŒÌWLŒÌ×LŒ×LLŒÌWLŒÌ×LĞ×LŒ‘ˆ
LŒÌ×LŒ×LŒÎWLŒJHŠKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹\Nˆ›[X™\ˆ‹Z[ˆŒH‹˜[YNˆÙ][™ÜË˜Ø\™Ü™XÙZ\ÙXY[™WÚİ\œÈÛÚ[™ÙNˆHOˆÙ]Ù][™ÜÊÈ‹‹œÙ][™ÜËØ\™Ü™XÙZ\ÙXY[™WÚİ\œÎˆ
ÙK\™Ù]˜[YHJHJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—LŒ×LLŒÌ—LŒ×LHLŒÍLWLŒ×LŒÌWLÈLÑWLĞ×LQ—LĞ×LŒÌWLĞÈŠKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹È\Nˆ˜ÚXÚØ›Ş‹ÚXÚÙYˆÙ][™ÜË˜Ø\™Ü™\]Z\™Wİ˜XÚÚ[™ÈOOH˜[ÙKÛÚ[™ÙNˆHOˆÙ]Ù][™ÜÊÈ‹‹œÙ][™ÜËØ\™Ü™\]Z\™Wİ˜XÚÚ[™ÎˆK\™Ù]˜ÚXÚÙYJHJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—LŒ×LLŒÌ—LŒ×LHLWLŒLLŒĞHŠKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹È\Nˆ˜ÚXÚØ›Ş‹ÚXÚÙYˆÙ][™ÜË˜Ø\™Ü™\]Z\™WØ[[İ[OOH˜[ÙKÛÚ[™ÙNˆHOˆÙ]Ù][™ÜÊÈ‹‹œÙ][™ÜËØ\™Ü™\]Z\™WØ[[İ[ˆK\™Ù]˜ÚXÚÙYJHJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—LŒ×LLŒÌ—LŒ×LHLŒWLŒ×LŒÌWLĞ×LŒ‘HLÑWLŒÌWLŒ‘—LŒ×LŒ‘WLŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹È\Nˆ˜ÚXÚØ›Ş‹ÚXÚÙYˆÙ][™ÜË˜Ø\™Ü™\]Z\™WÜZYØ]OOH˜[ÙKÛÚ[™ÙNˆHOˆÙ]Ù][™ÜÊÈ‹‹œÙ][™ÜËØ\™Ü™\]Z\™WÜZYØ]ˆK\™Ù]˜ÚXÚÙYJHJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—LŒ‘LŒ‘—LŒ×LNWLŒ—LŒÌHLŒ‘LŒ×LHL×LŒÌHLWLŒ×LĞ×L
PŠHŠKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹\Nˆ›[X™\ˆ‹Z[ˆŒH‹˜[YNˆÙ][™ÜË›X^İ\ØYÛXˆL‹ÛÚ[™ÙNˆHOˆÙ]Ù][™ÜÊÈ‹‹œÙ][™ÜËX^İ\ØYÛXˆ
ÙK\™Ù]˜[YHLˆJHJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—LŒ‘LŒ‘—LŒ×L—LLŒ×LWLŒWLĞ×LŒ×LŒÌˆLÑWLŒÌLĞ×LŒÌWLŒÍŠKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹\Nˆ›[X™\ˆ‹Z[ˆŒŒ‹X^ˆMH‹˜[YNˆÙ][™ÜËœ]X[]WÛZ[—ÜØÛÜ™HMKÛÚ[™ÙNˆHOˆÙ]Ù][™ÜÊÈ‹‹œÙ][™ÜË]X[]WÛZ[—ÜØÛÜ™Nˆ
ÙK\™Ù]˜[YHMHJHJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—LŒ×LWLŒWLĞ×LŒ×LŒÌˆLNWLĞ×LWLĞ×LŒHLWL—LŒ×LŒÌ×LŒŠKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹\Nˆ›[X™\ˆ‹Z[ˆL‹X^ˆMH‹˜[YNˆÙ][™ÜËœ]X[]WÙÛÛÙÜØÛÜ™HÌÛÚ[™ÙNˆHOˆÙ]Ù][™ÜÊÈ‹‹œÙ][™ÜË]X[]WÙÛÛÙÜØÛÜ™Nˆ
ÙK\™Ù]˜[YHÌJHJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—LŒ‘LŒ‘—LŒ×L—LLŒÎWLŒÌWLŒÍˆLŒWLŒÍWLLĞ×LŒÌHŠKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹\Nˆ›[X™\ˆ‹Z[ˆÌ‹˜[YNˆÙ][™ÜËœ]X[]WÛZ[—İÚYLŒÛÚ[™ÙNˆHOˆÙ]Ù][™ÜÊÈ‹‹œÙ][™ÜË]X[]WÛZ[—İÚYˆ
ÙK\™Ù]˜[YHLŒJHJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—LŒ‘LŒ‘—LŒ×L—LLŒ×LŒÌWLŒWLWLŒ×LŒÎHLŒWLŒÍWLLĞ×LŒÌHŠKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹\Nˆ›[X™\ˆ‹Z[ˆL‹˜[YNˆÙ][™ÜËœ]X[]WÛZ[—ÚZYÚÛÚ[™ÙNˆHOˆÙ]Ù][™ÜÊÈ‹‹œÙ][™ÜË]X[]WÛZ[—ÚZYÚˆ
ÙK\™Ù]˜[YHJHJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—LŒÎWLŒÌWLŒÍˆL—LŒÌ×LŒ‘WLÈLÑWLŒÌWLŒ‘—LŒ×LŒÌ—LŒÍLŒ×LŒÍLŒ‘—LÈŠKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹\Nˆ›[X™\ˆ‹Z[ˆŒLŒ‹X^ˆŒÌŒ‹˜[YNˆÙ][™ÜËœ›ØÙ\ÜÙYÛX^İÚYŒŒÛÚ[™ÙNˆHOˆÙ]Ù][™ÜÊÈ‹‹œÙ][™ÜË›ØÙ\ÜÙYÛX^İÚYˆ
ÙK\™Ù]˜[YHŒŒJHJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—LNWLĞ×LWLĞ×LŒH”QÈLÑWLŒÌWLŒ‘—LŒ×LŒÌ—LŒÍLŒ×LŒÍLŒ‘—LÈŠKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹\Nˆ›[X™\ˆ‹Z[ˆŒ‹X^ˆMH‹˜[YNˆÙ][™ÜËœ›ØÙ\ÜÙYÚœY×Ü]X[]HÛÚ[™ÙNˆHOˆÙ]Ù][™ÜÊÈ‹‹œÙ][™ÜË›ØÙ\ÜÙYÚœY×Ü]X[]Nˆ
ÙK\™Ù]˜[YHJHJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—LNWL—LŒWLŒÌWLLŒ×LŒ×LŒLŒ×LŒÌWLĞÈLNWLĞ×LWLĞ×LŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆHKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹È\Nˆ˜ÚXÚØ›Ş‹ÚXÚÙYˆH\Ù][™ÜËœ]X[]WÙ[™›Ü˜ÙKÛÚ[™ÙNˆHOˆÙ]Ù][™ÜÊÈ‹‹œÙ][™ÜË]X[]WÙ[™›Ü˜ÙNˆK\™Ù]˜ÚXÚÙYJHJKˆ—LŒÌWLŒ‘ˆLŒ‘WLLŒ‘—LNWLŒ×LŒÌHLŒWLŒÍWLŒ×LLĞ×LŒÌHLŒÍ—LŒÎWLĞ×LWLŒÈLŒWLŒ×LŒÌWLŒÈLNWLWLŒ×L—LLŒÌHLĞ×LŒÈLŒ‘—LŒ×LŒÌWLŒ×LĞÈLŒLŒ×LŒÌ—LŒWLŒ×LŒLŒÍLŒ‘—LĞ×LŒ‘ˆŠJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—LŒ×LŒÌWLŒÌ×LŒ×LLŒ×LŒÎWLLŒ×LˆLŒ‘—LŒÌWLŒ‘WLLŒ×LŒÌ×LŒHLŒ×LŒ‘—LĞ×LŒ‘ˆLŒLŒÌWLŒ×LĞÈLWLŒ‘—LĞ×LŒÌWLŒ×LˆŠKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆHKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹È\Nˆ˜ÚXÚØ›Ş‹ÚXÚÙYˆÙ][™ÜË››İYWØYZ[œÈOOH˜[ÙKÛÚ[™ÙNˆHOˆÙ]Ù][™ÜÊÈ‹‹œÙ][™ÜË›İYWØYZ[œÎˆK\™Ù]˜ÚXÚÙYJHJKˆ—LWLŒÎWLŒ×LŠJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—L×LŒÍLŒ‘—LŒ×LŒÌHLÑWLĞ×LŒÍLŒ×LŒÌˆLÑWLŒ×LĞ×LŒ×LˆLWL×LLŒH
LŒÌ×LŒ×LŒÎWLŒJHŠKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹\Nˆ›[X™\ˆ‹Z[ˆŒH‹X^ˆŒM‹˜[YNˆÙ][™ÜËœÛWİØ\›š[™×Úİ\œÈÛÚ[™ÙNˆHOˆÙ]Ù][™ÜÊÈ‹‹œÙ][™ÜËÛWİØ\›š[™×Úİ\œÎˆ
ÙK\™Ù]˜[YHJHJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—LŒÍL—LŒ×LŒÌ×LÈLNWLŒ×LŒÌWLŒLŒÌWLŒ×LˆLWLŒ‘—LĞ×LŒÌHLŒ‘—LŒÌWLĞ×LŒ×LWLŒWLŒ×LNWL—L—LŒ‘—LÈLŒ×LŒÎWLLŒ×LˆŠKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹\ˆ›ˆ‹XÙZÛ\ˆ—LWLŒ—LŒ×LˆKKLŒMLŒ‘WLŒ×LLĞÈLĞ×LŒÎWL—LĞÈL×LWLÈLWLŒ‘—LĞ×LŒÌWLŒ×Lˆ‹˜[YNˆ
Ù][™ÜË››İYšXØ][Û—ØYZ[—İ\Ù\—ÚYÈ×JKš›Ú[Š	Ë	ÊKÛÚ[™ÙNˆHOˆÙ]Ù][™ÜÊÈ‹‹œÙ][™ÜË›İYšXØ][Û—ØYZ[—İ\Ù\—ÚYÎˆK\™Ù]˜[YKœÜ]
	Ë	ÊK›X\
Oˆ
Şš[J
JK™š[\Š›ÛÛX[ŠHJHJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—LŒWLLŒÍ—LĞ×LŒ‘LŒ×LŒHLNWLŒ×LŒÌWLŒWLŒ×LŒL×LŒ×LNWLŒ×LŒÌWLŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
^\™XH‹ÈÛ\ÜÓ˜[YNˆš[œ]‹˜[YNˆÙ][™ÜË˜Ø\™Ù\ØÜš\[Ûˆ	ÉËÛÚ[™ÙNˆHOˆÙ]Ù][™ÜÊÈ‹‹œÙ][™ÜËØ\™Ù\ØÜš\[ÛˆK\™Ù]˜[YHJHJJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆLX\™Ú[•ÜˆMˆHKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹ÛÛXÚÎˆØ]™TÙ][™ÜÈK—LŒÌLŒ‘WLĞ×LŒÌWLÈLŒWL—LŒÎLĞ×LWLŒ×LŒHŠKˆØ]™Y	‰ˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹Èİ[NˆÈÛÛÜˆ	İ˜\ŠK[ÚÊIÈHK—LÌLÈLŒÌLŒ‘WLĞ×LŒÌWLÈLŒÍLŒ‘ˆŠJJKˆXÚÈ	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›[Ù[X™È‹ÛÛXÚÎˆ

HOˆÈÙ]XÚÊ[
NÈÙ]]Z[
[
NÈHKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›[Ù[‹İ[NˆÈX^ÚYˆLX^ZYÚˆ	ÎLš	Ëİ™\™›İÖNˆ	Ø]]ÉÈKÛÛXÚÎˆHOˆKœİÜ›ÜYØ][ÛŠ
HKY]Z[È™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈY[™ÎˆÌ^[YÛˆ	ØÙ[\‰ÈHK—LŒ‘—LŒÌHLŒ‘LŒ×LLŒ‘—LŒÌWLĞ×LŒ×LWLŒHLŒ×LŒÌ—LŒ—LĞ×LŒ×LŒWLŒˆŠHˆ™XXİ˜Ü™X]Q[[Y[
™XXİ‘œ˜YÛY[[ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈ\İYPÛÛ[ˆ	ÜÜXÙKX™]ÙY[‰ËØ\ˆLHKˆ™XXİ˜Ü™X]Q[[Y[
šÈ‹[ˆ]Z[œ™\]Y\İİ\Wİ]KˆˆLŒM‹ˆ]Z[˜XÚÚ[™×ØÛÙJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹ÛÛXÚÎˆ

HOˆÈÙ]XÚÊ[
NÈÙ]]Z[
[
NÈHK—LŒLŒÌ×LŒWLˆŠJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ™ÜšYˆˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ[™[ˆKˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[—LLŒÍ—LŒÎWLĞ×LŒHLŒ‘—LŒÌWLŒ‘WLLŒ×LŒÌ×LŒNˆŠKˆˆ‹ˆÕUTÖÙ]Z[œİ]\×H]Z[œİ]\Ëˆ™XXİ˜Ü™X]Q[[Y[
˜œˆ‹[
Kˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[—LLŒÍ—LŒÎWLĞ×LŒHLÑWLŒÌWLŒ‘—LŒ×LŒ‘WLŒNˆŠKˆˆ‹ˆVVÙ]Z[œ^[Y[Üİ]\×H]Z[œ^[Y[Üİ]\Ëˆ™XXİ˜Ü™X]Q[[Y[
˜œˆ‹[
Kˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[—LWLŒLLŒĞNˆŠKˆˆ‹ˆ[Û™^J]Z[˜[[İ[
Kˆ™XXİ˜Ü™X]Q[[Y[
˜œˆ‹[
Kˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[—LŒWLŒ×LŒÌWLĞ×LŒ‘NˆŠKˆˆ‹ˆ˜Q]J]Z[˜Ü™X]YØ]
Kˆ™XXİ˜Ü™X]Q[[Y[
˜œˆ‹[
Kˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[—LWL×LLŒNˆŠKˆˆ‹ˆ]Z[™YWØ]È˜Q]J]Z[™YWØ]
Hˆ	ø %	Ëˆ]Z[˜YZ[—Û›İH	‰ˆ™XXİ˜Ü™X]Q[[Y[
™XXİ‘œ˜YÛY[[ˆ™XXİ˜Ü™X]Q[[Y[
˜œˆ‹[
Kˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[—LŒŒ—LŒ‘WLŒÌWLĞ×LˆLĞ×LŒ×LŒ‘—LŒ‘—LŒ×LŒÍLŒHLWLŒ‘—LĞ×LŒÌNˆŠKˆˆ‹ˆ]Z[˜YZ[—Û›İJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ[™[ˆKˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[—LŒ×LŒÍ×LLŒ×LŒÎWLŒ×LŒHLWLŒÌWLHŠKˆ™XXİ˜Ü™X]Q[[Y[
œ™H‹Èİ[NˆÈÚ]TÜXÙNˆ	Ü™K]Ü˜\	Ë\™Xİ[Ûˆ	Û‰Ë^[YÛˆ	ÛY	Ë›ÛÚ^™NˆLˆHK”ÓÓ‹œİš[™ÚYJ]Z[™›Ü›WÙ]HßK[ŠJJJKˆ™XXİ˜Ü™X]Q[[Y[
šÈ‹[—LWLŒ‘—LŒ×LŒÌWLNHLŒ×LŒÌWLŒÌ×LŒ×LLĞÈŠKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈ\Ü^Nˆ	ÙÜšY	ËÜšY[\]PÛÛ[[œÎˆ	Ü™\X]
]]ËYš]Z[›X^
NYœŠJIËØ\ˆLHK
]Z[™š[\È×JK›X\
ˆOˆ™XXİ˜Ü™X]Q[[Y[
˜H‹ÈÙ^Nˆ‹šY™Yˆš[U\›
ŠK\™Ù]ˆ—Ø›[šÈ‹Û\ÜÓ˜[YNˆœ[™[‹İ[NˆÈ\Ü^Nˆ	Ø›ØÚÉË^XÛÜ˜][Ûˆ	Û›Û™IËÛÛÜˆ	Ú[š\š]	ÈHKˆİš[™Ê‹›Z[YWİ\H	ÉÊKœİ\ÕÚ]
	Ú[XYÙKÉÊHÈ™XXİ˜Ü™X]Q[[Y[
š[YÈ‹ÈÜ˜Îˆ[X•\›
ŠKİ[NˆÈÚYˆ	ÌL	IËZYÚˆMLØš™Xİš]ˆ	ØÛÛZ[‰Ë›Ü™\”˜Y]\Îˆ˜XÚÙÜ›İ[™ˆ	ÈÙYYIÈHJHˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈZYÚˆML\Ü^Nˆ	ÙÜšY	ËXÙR][\Îˆ	ØÙ[\‰Ë›ÛÚ^™NˆHK—QÑQĞÍŠKˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[ĞÖÙ‹™Øİ[Y[İ\WH‹™Øİ[Y[İ\JKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ›ÛÚ^™NˆLHHKˆ˜JX]œ›İ[™

‹™š[WÜÚ^™H
HÈL
JKˆˆĞˆŠKˆ‹œ]X[]WÜØÛÜ™HOH[	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈ›ÛÚ^™NˆLKÛÛÜˆ[X™\Š‹œ]X[]WÜØÛÜ™JHHÌÈ	İ˜\ŠK[ÚÊIÈˆ[X™\Š‹œ]X[]WÜØÛÜ™JHHHÈ	ÈØM˜Œ	Èˆ	İ˜\ŠKY[™Ù\ŠIÈHKˆ—LNWLĞ×LWLĞ×LŒNˆ‹ˆ˜J‹œ]X[]WÜØÛÜ™JKˆˆLŒ×LŒÌˆL‘ŒWL‘ŒL‘ŒŠKˆ‹œ]X[]WÛY]H	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]Z[È‹Èİ[NˆÈ›ÛÚ^™NˆLKX\™Ú[•ÜˆHHKˆ™XXİ˜Ü™X]Q[[Y[
œİ[[X\H‹[—LŒ×LŒÌ—LŒ—LĞ×LŒ×LŒHLNWL—LŒWLŒÌWLLNWLĞ×LWLĞ×LŒHŠKˆ


HOˆÈ˜\ˆØKØ‹ØËÙKÙÈ]HHßNÈHÂˆHH\[Ùˆ‹œ]X[]WÛY]HOOH	Üİš[™ÉÈÈ”ÓÓ‹œ\œÙJ‹œ]X[]WÛY]JHˆ‹œ]X[]WÛY]HßNÂˆBˆØ]Ú
ÊHÂˆHHßNÂˆH™]\›ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈ[™RZYÚˆKK\™Xİ[Ûˆ	Ü	Ë^[YÛˆ	ÜšYÚ	ÈHKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ—LŒ×LŒLŒÎWLŒ×LŒ‘ˆ‹ˆ˜JKÚY
KˆˆLÈ‹ˆ˜JKšZYÚ
JKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ—LŒÌWLLŒÍL—LŒ×LĞ×LĞÎˆ‹ˆ˜J
ØHHK˜œšYÚ™\ÜÊHOOH[	‰ˆØHOOH›ÚYÈØHˆ	ø %	ÊJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ—LNWL—LŒWLŒÌWLŒ×LŒÌ×LŒNˆ‹ˆ˜J
ØˆHK˜ÛÛ˜\İ
HOOH[	‰ˆØˆOOH›ÚYÈØˆˆ	ø %	ÊJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ—LLŒÍ—LLŒ‘ˆ‹ˆ˜J
ØÈHKœÚ\œ™\ÜÊHOOH[	‰ˆØÈOOH›ÚYÈØÈˆ	ø %	ÊJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ—LŒLŒ×LŒÌ—LŒWLŒ×LŒL—LLŒÌNˆ‹ˆ˜J
ÙHHK™Û\™WÜ\˜Ù[
HOOH[	‰ˆÙHOOH›ÚYÈÙHˆ
Kˆ—LHŠKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ—LŒÌ×LŒ×LĞ×LÈLŒÍLŒ‘—LĞ×LŒ‘ˆ‹ˆ˜J
ÙˆHK™\š×Ü\˜Ù[
HOOH[	‰ˆÙˆOOH›ÚYÈÙˆˆ
Kˆ—LHŠKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ—LWL—LŒLŒÎNˆ‹ˆ‹œÛİ\˜ÙWİ\HOOH	ØØ[Y\˜IÈÈ	ö+öb6,v*6ã6a‰Èˆ‹œÛİ\˜ÙWİ\HOOH	ÛXœ˜\IÈÈ	ö«ö)öa6,vã	Èˆ	öa¶)öav-6+¶-IÊKˆK›ZÙ[WÜØÜ™Y[œÚİ	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈÛÛÜˆ	İ˜\ŠKY[™Ù\ŠIÈHK—LŒ×LŒ‘LŒWLWLŒ×LLŒ×LŒÌ×LNWLŒÌWLĞ×L—LŒ×LŒÍLŒ×LŒHŠKˆ
KØ\›š[™ÜÈ×JK›X\

ËJHOˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÙ^NˆKİ[NˆÈÛÛÜˆ	ÈØM˜Œ	ÈHKˆ—LŒŒˆ‹ˆÊJJNÈJJ
JKˆ‹›ÜšYÚ[˜[Ü]	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈ\Ü^Nˆ	Ù›^	ËØ\ˆ‹X\™Ú[•ÜˆˆHKˆ™XXİ˜Ü™X]Q[[Y[
˜H‹È™Yˆ	ËÉÈ
Èİš[™Ê‹›ÜšYÚ[˜[Ü]
Kœ™\XÙJ×—ÊËË	ÉÊK\™Ù]ˆ—Ø›[šÈ‹Û\ÜÓ˜[YNˆ˜ˆˆK—L—LŒÌ×LŒ‘WLÈLŒ×LŒÍWLLĞÈŠKˆ™XXİ˜Ü™X]Q[[Y[
˜H‹È™Yˆš[U\›
ŠK\™Ù]ˆ—Ø›[šÈ‹Û\ÜÓ˜[YNˆ˜ˆˆK—L—LŒÌ×LŒ‘WLÈLÑWLŒÌWLŒ‘—LŒ×LŒÌ—LŒÍLŒ×LŒÍLŒ‘—LÈŠJJJJKˆ™XXİ˜Ü™X]Q[[Y[
šÈ‹Èİ[NˆÈX\™Ú[•ÜˆNHK—LÑWLŒÌWLŒ‘—LŒ×LŒ‘WLŒWLŒ×L×LŒÈŠKˆ
]Z[œ^[Y[È×JK›X\
Oˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÙ^NˆšYÛ\ÜÓ˜[YNˆœ[™[ˆKˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[›Y]ÙOOH	Ø˜[WİØ[]	ÈÈ	öªvã6`H6o¶b6a6*6a6aÉÈˆ	öªv)ö,v*¸ #6*6aø #6ªv)ö,v*‰ÊKˆˆLŒM‹ˆ[Û™^J˜[[İ[
KˆˆLŒM‹ˆVVÜœİ]\×Hœİ]\Ëˆ˜XÚÚ[™×ØÛÙH	‰ˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹[ˆˆLÈLÑWLĞ×LQ—LĞ×LŒÌWLĞÎˆ‹ˆ˜XÚÚ[™×ØÛÙJKˆ™XÛ\™YØ[[İ[OH[	‰ˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹[ˆˆLÈLWLŒLLŒĞHLŒ×LŒÎWLLŒ×LWLĞÎˆ‹ˆ[Û™^J™XÛ\™YØ[[İ[
JKˆœZYØ]	‰ˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹[ˆˆLÈLŒÌ—LWLŒ×LˆLÑWLŒÌWLŒ‘—LŒ×LŒ‘WLŒNˆ‹ˆ˜Q]JœZYØ]
JKˆ˜˜[š×Û˜[YH	‰ˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹[ˆˆLÈLŒLŒ×L—LNHLWLŒLŒ‘—LŒŒÎˆ‹ˆ˜˜[š×Û˜[YJKˆœ™XÙZ\Ùš[WÜ]	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
˜H‹È™Yˆ	ËÉÈ
Èœ™XÙZ\Ùš[WÜ]œ™\XÙJ×—ÊËË	ÉÊK\™Ù]ˆ—Ø›[šÈˆK—LWLŒÍLŒ×L×LŒ‘—LÈLŒÌWLŒÌ×LĞ×LŒ‘ˆŠJKˆ›Y]ÙOOH	ØØ\™İ×ØØ\™	È	‰ˆœİ]\ÈOOH	Ü[™[™ÉÈ	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆX\™Ú[•ÜˆHKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹ÛÛXÚÎˆ

HOˆ™]šY]Ô^J	Ø\›İ™IÊHK—LŒWLŒŒ×LĞ×LĞ×LŒ‘ˆLÑWLŒÌWLŒ‘—LŒ×LŒ‘WLŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹ÛÛXÚÎˆ

HOˆ™]šY]Ô^J	Ü™Z™Xİ	ÊHK—LŒÌWLŒ‘ˆLÑWLŒÌWLŒ‘—LŒ×LŒ‘WLŒHŠJJJKˆ™XXİ˜Ü™X]Q[[Y[
šÈ‹Èİ[NˆÈX\™Ú[•ÜˆNHK—LŒ×L—LŒ‘—LŒ×LHLWLŒ‘—LĞ×LŒÌWLĞ×LŒWLĞÈŠKˆ™XXİ˜Ü™X]Q[[Y[
^\™XH‹ÈÛ\ÜÓ˜[YNˆš[œ]‹XÙZÛ\ˆ—LĞ×LŒ×LŒ‘—LŒ‘—LŒ×LŒÍLŒHLĞ×LŒÈLŒWLLŒÍ—LĞ×LŒ‘LŒ×LŒÍWLLŒ×LŒ‘LŒ×LŒH‹˜[YNˆ›İKÛÚ[™ÙNˆHOˆÙ]›İJK\™Ù]˜[YJKİ[NˆÈZ[’ZYÚˆHJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆË›^Ü˜\ˆ	İÜ˜\	ËX\™Ú[•ÜˆLHKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹ÛÛXÚÎˆÛÜœ™Xİ[ÛˆK—LŒ‘—LŒÌWLŒ‘WLLŒ×LŒÌ×LŒHLŒ×LŒÍWLLŒ×LŒ‘ŠKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹ÛÛXÚÎˆ

HOˆÚ[™ÙTİ]\Ê	Ø\›İ™Y	ÊHK—LŒWLŒŒ×LĞ×LĞ×LŒ‘ˆLŒ‘—LŒÌWLŒ‘WLLŒ×LŒÌ×LŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹ÛÛXÚÎˆ

HOˆÚ[™ÙTİ]\Ê	Ü™Z™XİY	ÊHK—LŒÌWLŒ‘ˆLŒ‘—LŒÌWLŒ‘WLLŒ×LŒÌ×LŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹ÛÛXÚÎˆ

HOˆÚ[™ÙTİ]\Ê	ØÛÛ\]Y	ÊHK—LŒ—LŒLŒHLŒWLNWLWLĞ×LŠKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹İ[NˆÈX\™Ú[’[›[™Tİ\ˆ	Ø]]ÉÈKÛÛXÚÎˆ[]T™\]Y\İK—LŒ‘LŒÌLHLŒ‘—LŒÌWLŒ‘WLLŒ×LŒÌ×LŒHŠJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ›ÛÚ^™NˆLKX\™Ú[•ÜˆÈHK—LŒLŒÌWLŒ×LĞÈLŒÌWLŒ‘ˆLŒ‘—LŒÌWLŒ‘WLLŒ×LŒÌ×LŒWLŒÈL—LLŒÍLŒWLˆLŒÎWLLŒHLŒ‘—LŒÌHLNWLŒ×LŒ‘—LŒÌHLŒLŒ×LLŒÈLŒ×LLŒÌ—LŒ×LWLĞÈLŒ×LŒÌ×LŒKˆŠKˆ™XXİ˜Ü™X]Q[[Y[
šÈ‹Èİ[NˆÈX\™Ú[•ÜˆNHK—LŒWLŒ×LŒÌWLĞ×LŒ‘WL—LÈŠKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[
]Z[›ÙÜÈ×JK›X\

JHOˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÙ^NˆKİ[NˆÈY[™Îˆ	Î	Ë›Ü™\›İÛNˆ	Ì\ÛÛY˜\ŠK[[™JIÈHKˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[ˆ\Ù\—Û˜[YH	ö,ö)öav)öa¶aÉËˆˆŠKˆˆ‹ˆ™\ØÜš\[Ûˆ˜Xİ[Û‹ˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈX\™Ú[’[›[™Tİ\ˆ›ÛÚ^™NˆLHHK˜Q]J˜Ü™X]YØ]
JJJJJJJJNÂŸB˜ÛÛœİ“SÓ•ÈHÉÉË	ö`v,vb6,v+öã6a‰Ë	ö)ö,v+öã6*6aö-6*‰Ë	ö+¶,v+ö)ö+ÉË	ö*¶ã6,IË	öav,v+ö)ö+ÉË	ö-6aö,vã6b6,IË	öavaö,IË	ö(¶*6)öa‰Ë	ö(¶,6,IË	ö+öã	Ë	ö*6aöava‰Ë	ö)ö,ö`va¶+É×NÂ™[˜İ[Ûˆš]™\”Ù\šXÙT™\Ü

HÂˆÛÛœİÛšYÙ]šYHH\ÙTİ]J	ÉÊNÂˆÛÛœİŞYX\‹Ù]YX\—HH\ÙTİ]JMJNÂˆÛÛœİÙ]KÙ]]WHH\ÙTİ]J[
NÂˆÛÛœİÛ[ÛÙ][ÛHH\ÙTİ]J
NÂˆÛÛœİÛ›İXÙ\ËÙ]›İXÙ\×HH\ÙTİ]J[
NÂˆÛÛœİÛ\ÙËÙ]\Ù×HH\ÙTİ]J	ÉÊNÂˆÛÛœİÙX\˜ÚH\Ş[˜È

HOˆÈÙ]\ÙÊ	ÉÊNÈÙ][Û

NÈHÂˆÛÛœİØK—HH]ØZ]›ÛZ\ÙK˜[
Ù‹™š]™\”\™›Ü›X[˜ÙJšYYX\ŠK‹™š]™\“›İXÙ\ÊšY
WJNÂˆÙ]]JJNÂˆÙ]›İXÙ\ÊŠNÂˆBˆØ]Ú
JHÂˆÙ]\ÙÊK›Y\ÜØYÙJNÂˆHNÂˆÛÛœİ[H\Ş[˜È
Y
HOˆÈYˆ
XÛÛ™š\›J	ö)öã6aˆ6*¶,6ªv,H6*6aø #6-vb6,v*ˆ6`vã6,¶ã6ªvã6b6.¶ã6,v`¶)ö*6a8 #6*6)ö,¶«ö-6*ˆ6+v,6`H6-6b6+ö'ÉÊJBˆ™]\›ÈHÂˆ]ØZ]‹™[]Qš]™\“›İXÙJY
NÂˆÙ]›İXÙ\Ê]ØZ]‹™š]™\“›İXÙ\ÊšY
JNÂˆÙ]\ÙÊ	ö*¶,6ªv,H6+v,6`H6-6+Ë‰ÊNÂˆBˆØ]Ú
JHÂˆÙ]\ÙÊK›Y\ÜØYÙJNÂˆHNÂˆÛÛœİš[™\ÜH

HOˆÚ[™İËœš[

NÂˆÛÛœİ^Ü›İXÙ\ÈH

HOˆÈHÂˆÛÛœİ›İÜÈH

›İXÙ\ÈOOH[›İXÙ\ÈOOH›ÚYÈ›ÚYˆ›İXÙ\Ëœ›İÜÊH×JK›X\
Oˆ
È	ö*¶)ö,vã6+‰Îˆ˜Ü™X]YØ]	ÉË	öa¶b6.IÎˆœ™X\ÛÛˆ	ø %	Ë	ö)öb6a6b6ã6*‰Îˆœš[Üš]H	ø %	Ë	ö-6,v+IÎˆ˜›ÙH	ø %	Ë	ö*ö*6*¸ #6ªva¶a¶+öaÉÎˆœ™XÛÜ™\—Û˜[YH	ø %	ÈJJNÂˆ^ÜŞ
›İÜË	ö*¶,6ªv,v)ö*‰Ëš]™\‹[›İXÙ\ËIÛšYKŞ
NÂˆBˆØ]Ú
JHÂˆÙ]\ÙÊK›Y\ÜØYÙJNÂˆHNÂˆÛÛœİ^Ü[›X[H

HOˆÈHÂˆÛÛœİ›İÜÈH“SÓ•ËœÛXÙJJK›X\

˜[YKJHOˆÈ˜\ˆØNÈ™]\›ˆ
È	öav)öaÉÎˆ˜[YK	ö*¶.v+ö)ö+È6,ö,vb6ã6,ÈÈ6*ö*6*ˆ6+v-¶b6,IÎˆ[X™\Š

ØHH]HOOH[]HOOH›ÚYÈ›ÚYˆ]K›[ÛÊHOOH[ØHOOH›ÚYÈ›ÚYˆØVÚH
ÈWJH
HJNÈJNÂˆ›İÜËœ\Ú
È	öav)öaÉÎˆ	ö+6av.H6ªva	Ë	ö*¶.v+ö)ö+È6,ö,vb6ã6,ÈÈ6*ö*6*ˆ6+v-¶b6,IÎˆ[X™\Š
]HOOH[]HOOH›ÚYÈ›ÚYˆ]Kİ[
H
HJNÂˆ^ÜŞ
›İÜË	ö.vava6ªv,v+È6,ö)öa6ã6)öa¶aÉËš]™\‹\\™›Ü›X[˜ÙKIÛšYKIŞYX\ŸKŞ
NÂˆBˆØ]Ú
JHÂˆÙ]\ÙÊK›Y\ÜØYÙJNÂˆHNÂˆÛÛœİ^Ü[ÛH

HOˆÈ˜\ˆØNÈHÂˆYˆ
[[Û
Bˆ›İÈ™]È\œ›ÜŠ	ö)ö*6*¶+ö)È6ã6ªH6av)öaÈ6,v)È6)öa¶*¶+¶)ö*6ªva¶ã6+ÉÊNÂˆÛÛœİ›İÜÈH


ØHH]HOOH[]HOOH›ÚYÈ›ÚYˆ]K™]Z[ÊHOOH[ØHOOH›ÚYÈ›ÚYˆØVÛ[ÛJH×JK›X\
Oˆ
È	ö*¶)ö,vã6+ˆ6-6av,öã	Îˆš™]H	ÉË	ö,¶av)öaˆ6b6,vb6+ÉÎˆ˜Ü™X]YØ]	ÉË	ö,¶av)öaˆ6+¶,vb6+	Îˆ™^]Ø]	ö*6)ö,‰Ë	öav+ö*ˆ
6+ö`¶ã6`¶aÊIÎˆ[X™\Š™\˜][Û—ÛZ[]\È
K	öªv+È6+¶-ÉÎˆ›[™WØÛÙH	ø %	Ë	öav*6+ö(ÉÎˆ›ÜšYÚ[ˆ	ø %	Ë	öav`¶-v+ÉÎˆ™\İ[˜][Ûˆ	ø %	Ë	ö*ö*6*¸ #6ªva¶a¶+öaÉÎˆœ™XÛÜ™\—Û˜[YH	ø %	ÈJJNÂˆ^ÜŞ
›İÜË6,vã6,ˆ	Ò“SÓ•ÖÛ[Û_Xš]™\‹[[ÛIÛšYKIŞYX\ŸKIÔİš[™Ê[Û
KœYİ\
‹	Ì	Ê_KŞ
NÂˆBˆØ]Ú
JHÂˆÙ]\ÙÊK›Y\ÜØYÙJNÂˆHNÂˆ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ[™[YZ[‹]ÛÜšÜÜXÙK\YÙHˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆ›^Ü˜\ˆ	İÜ˜\	Ë[YÛ’][\Îˆ	Ù[™	ÈHKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—LNWLŒ‘ˆLWLLĞÈLŒWLŒ×LNWLŒÌ×LĞ×LŒÌWLŒ×LˆŠKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹X^[™İˆŒL‹˜[YNˆšYÛÚ[™ÙNˆHOˆÙ]šY
K\™Ù]˜[YKœ™\XÙJ×ÙË	ÉÊKœÛXÙJL
JHJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›X™[ˆK—LŒÌ×LŒ×LLŒÍLWLŒÌ×LĞÈŠKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹İ[NˆÈÚYˆLLK˜[YNˆYX\‹ÛÚ[™ÙNˆHOˆÙ]YX\Š
ÙK\™Ù]˜[YHMJHJJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹ÛÛXÚÎˆÙX\˜ÚK—LŒ×LŒÌ×LŒWLŒ×LLLŒWL×LĞ×LÈLQ—LŒÌ—LŒ×LŒÌWLŒÍŠKˆ]H	‰ˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹ÛÛXÚÎˆš[™\ÜK—L—LŒ×LÑHÈˆŠKˆ]H	‰ˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹ÛÛXÚÎˆ^Ü[›X[K—LŒ‘WLŒÌWLLŒ×LĞÈ^Ù[LŒÎWLWLLNWLŒÌWLŒ‘ˆLŒÌ×LŒ×LLĞ×LŒ×L—LÈŠKˆ›İXÙ\È	‰ˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹ÛÛXÚÎˆ^Ü›İXÙ\ÈK—LŒ‘WLŒÌWLLŒ×LĞÈ^Ù[LŒWLŒÌLNWLŒÌWLŒ×LŒHŠJKˆ\ÙÈ	‰ˆ™XXİ˜Ü™X]Q[[Y[
œ‹Èİ[NˆÈÛÛÜˆ\ÙËš[˜ÛY\Ê	ö+v,6`H6-6+ÉÊHÈ	İ˜\ŠK[ÚÊIÈˆ	İ˜\ŠKY[™Ù\ŠIÈHK\ÙÊKˆ]H	‰ˆ™XXİ˜Ü™X]Q[[Y[
™XXİ‘œ˜YÛY[[ˆ™XXİ˜Ü™X]Q[[Y[
šÈ‹Èİ[NˆÈX\™Ú[•ÜˆNHKˆ—LQ—LŒÌ—LŒ×LŒÌWLŒÍLŒÎWLWLLNWLŒÌWLŒ‘ˆ‹ˆ]K™š]™\‹™š\œİÛ˜[YKˆˆ‹ˆ]K™š]™\‹›\İÛ˜[YJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ™ÜšYØ\™ÈˆK“SÓ•ËœÛXÙJJK›X\

˜[YKJHOˆÈÛÛœİHHH
ÈKˆH[X™\Š]K›[ÛÖÛWH
NÈ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÙ^NˆKÛ\ÜÓ˜[YNˆ˜Ø\™‹İ[NˆÈİ\œÛÜˆ	ÜÚ[\‰Ë^[YÛˆ	ØÙ[\‰Ëİ][™Nˆ[ÛOOHHÈ	ÌœÛÛY˜\ŠKXœ˜[™
IÈˆ	Û›Û™IÈKÛÛXÚÎˆ

HOˆÙ][Û
JHKˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[˜[YJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈ›ÛÚ^™Nˆ‹ÛÛÜˆ	İ˜\ŠKXœ˜[™
IËX\™Ú[•ÜˆHK˜JŠJKˆ™XXİ˜Ü™X]Q[[Y[
œÛX[‹[—LŒÌ×LŒÌWLLĞ×LŒÌÈÈLŒ—LŒLŒHLŒ‘LŒÍ—LLŒÌHŠJNÈJJKˆ[Ûˆ	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈX\™Ú[•ÜˆNHKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈ\İYPÛÛ[ˆ	ÜÜXÙKX™]ÙY[‰ËØ\ˆ›^Ü˜\ˆ	İÜ˜\	ÈHKˆ™XXİ˜Ü™X]Q[[Y[
šÈ‹[ˆ—LŒÌWLĞ×LŒÌˆLQ—LŒÌ—LŒ×LŒÌWLŒÍ‹ˆ“SÓ•ÖÛ[ÛJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹ÛÛXÚÎˆ^Ü[ÛK—LŒ‘WLŒÌWLLŒ×LĞÈ^Ù[LŒÌWLĞ×LŒÌˆLLŒÌWLLŒ‘ˆLLŒ‘WLŒÌWLLŒÈLWLŒ×LÈŠJKˆ™XXİ˜Ü™X]Q[[Y[
X›H‹[ˆ™XXİ˜Ü™X]Q[[Y[
XY‹[ˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒWLŒ×LŒÌWLĞ×LŒ‘HŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LLŒÌWLLŒ‘ˆŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒ‘WLŒÌWLLŒÈŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LWLŒ‘—LŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒ‘WLŒÍÈŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒ—LŒLŒWLŒ×LNWL—L—LŒ‘—LÈŠJJKˆ™XXİ˜Ü™X]Q[[Y[
›ÙH‹[
]K™]Z[ÖÛ[ÛH×JK›X\
Oˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹ÈÙ^NˆšYKˆ™XXİ˜Ü™X]Q[[Y[
‹[˜Jš™]JJKˆ™XXİ˜Ü™X]Q[[Y[
‹[˜Q]J˜Ü™X]YØ]
JKˆ™XXİ˜Ü™X]Q[[Y[
‹[™^]Ø]È˜Q]J™^]Ø]
Hˆ	ö*6)ö,‰ÊKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ˜J™\˜][Û—ÛZ[]\È
KˆˆLŒ‘—L—LĞ×L—LÈŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ›[™WØÛÙH	ø %	Ëˆˆ‹ˆ›ÜšYÚ[ˆ	‰ˆ™\İ[˜][ÛˆÈ
	Ş›ÜšYÚ[Ÿx $ÉŞ™\İ[˜][ÛŸJXˆ	ÉÊKˆ™XXİ˜Ü™X]Q[[Y[
‹[œ™XÛÜ™\—Û˜[YH	ø %	ÊJJJJJJKˆ›İXÙ\È	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈX\™Ú[•ÜˆHKˆ™XXİ˜Ü™X]Q[[Y[
šÈ‹[ˆ—LŒWLŒÌLNWLŒÌWLŒ×LŒHLŒ—LŒLŒWLŒ×LŒÍLŒ‘—LÈ
‹ˆ˜J›İXÙ\Ëİ[
KˆŠHŠKˆ™XXİ˜Ü™X]Q[[Y[
X›H‹[ˆ™XXİ˜Ü™X]Q[[Y[
XY‹[ˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒWLŒ×LŒÌWLĞ×LŒ‘HŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—L—LLŒÎHŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒ×LLLLĞ×LŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒÍLŒÌWLŒ‘ŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒ—LŒLŒWLŒ×LNWL—L—LŒ‘—LÈŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒÎWLWLLĞ×LŒ×LŒHŠJJKˆ™XXİ˜Ü™X]Q[[Y[
›ÙH‹[›İXÙ\Ëœ›İÜË›X\
Oˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹ÈÙ^NˆšYKˆ™XXİ˜Ü™X]Q[[Y[
‹[˜Q]J˜Ü™X]YØ]
JKˆ™XXİ˜Ü™X]Q[[Y[
‹[œ™X\ÛÛˆ	ø %	ÊKˆ™XXİ˜Ü™X]Q[[Y[
‹[œš[Üš]H	ø %	ÊKˆ™XXİ˜Ü™X]Q[[Y[
‹[˜›ÙH	ø %	ÊKˆ™XXİ˜Ü™X]Q[[Y[
‹[œ™XÛÜ™\—Û˜[YH	ø %	ÊKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹ÛÛXÚÎˆ

HOˆ[
šY
HK—LŒ‘LŒÌLHLŒ‘—LŒ×LŒ—LWLĞÈŠJJJJJJJNÂŸB™[˜İ[Ûˆ˜Q˜JŠHÈ™]\›ˆİš[™ÊˆOOH[	‰ˆˆOOH›ÚYÈˆˆ	ÉÊKœ™\XÙJÖÌNWKÙËOˆ	öì6ìvì¶ìöí6íví¶íöî6îIÖÙJNÈB™[˜İ[Ûˆ˜Q\ØÊŠHÈ™]\›ˆİš[™ÊˆOOH[	‰ˆˆOOH›ÚYÈˆˆ	ÉÊKœ™\XÙJÖÉˆ‰×KÙËHOˆ
È	É‰Îˆ	É˜[\ÉË	Ï	Îˆ	É›ÉË	Ï‰Îˆ	É™İÉË	È‰Îˆ	Éœ][İÉË‰Èˆ	ÉˆÌÎNÉÈVÛWJJNÈB˜ÛÛœİWĞĞT—ÔÕÔÈHÖÉØØ\—Ùœ›Û	Ë	ö+6a6b6ã6+¶b6+ö,vb	×KÉØØ\—Ø˜XÚÉË	öo¶-6*ˆ6+¶b6+ö,vb	×KÉØØ\—ÜšYÚ	Ë	ö,öav*ˆ6,v)ö,ö*ˆ6+¶b6+ö,vb	×KÉØØ\—ÛY	Ë	ö,öav*ˆ6¡¶oˆ6+¶b6+ö,vb	×KÉÛXÙ[œÙWÙœ›Û	Ë	ö,vb6ã6«öb6)öaöã6a¶)öavaÉ×KÉÛXÙ[œÙWØ˜XÚÉË	öo¶-6*ˆ6«öb6)öaöã6a¶)öavaÉ×KÉİ™ZXÛWØØ\™Ùœ›Û	Ë	ö,vb6ã6ªv)ö,v*ˆ6+¶b6+ö,vb	×KÉİ™ZXÛWØØ\™Ø˜XÚÉË	öo¶-6*ˆ6ªv)ö,v*ˆ6+¶b6+ö,vb	×KÉİXÚšXØ[Ú[œÜXİ[Û‰Ë	öav.v)öã6a¶aÈ6`va¶ã	×KÉÚ[œİ\˜[˜ÙIË	ö*6ã6avaø #6a¶)öavaÉ×KÉÙÜ™Y[—ØØ\™	Ë	ö*6,v«È6,ö*6,‰×WNÂ˜ÛÛœİWÓSÕÔ—ÔÕÔÈHÖÉÛ[İÜ—Ùœ›Û	Ë	ö+6a6b6ã6avb6*¶b6,v,öã6ªva6*‰×KÉÛ[İÜ—Ø˜XÚÉË	öo¶-6*ˆ6avb6*¶b6,v,öã6ªva6*‰×KÉÛ[İÜ—ÜšYÚ	Ë	ö,öav*ˆ6,v)ö,ö*ˆ6avb6*¶b6,v,öã6ªva6*‰×KÉÛ[İÜ—ÛY	Ë	ö,öav*ˆ6¡¶oˆ6avb6*¶b6,v,öã6ªva6*‰×KÉÛ[İÜ—ØØ\™Ùœ›Û	Ë	öªv)ö,v*ˆ6avb6*¶b6,v,öã6ªva6*‰×KÉÛ[İÜ—ØØ\™Ø˜XÚÉË	öo¶-6*ˆ6ªv)ö,v*ˆ6avb6*¶b6,v,öã6ªva6*‰×KÉÙÜ™Y[—ØØ\™	Ë	ö*6,v«È6,ö*6,‰×KÉÚ[œİ\˜[˜ÙIË	ö*6ã6avaø #6a¶)öavaÉ×KÉÛXÙ[œÙWÙœ›Û	Ë	ö,vb6ã6«öb6)öaöã6a¶)öavaÉ×KÉÛXÙ[œÙWØ˜XÚÉË	öo¶-6*ˆ6«öb6)öaöã6a¶)öavaÉ×WNÂ˜ÛÛœİWĞĞT—ĞÒPÒÔÈHÖÉÚY[]IË	ö*¶-ö*6ã6`ˆ6av-6+¶-v)ö*ˆ6+¶b6+ö,vb6*6)È6av+ö)ö,vªI×KÉÜ]IË	ö-v+v*ˆ6o¶a6)öªH6+¶b6+ö,vb	×KÉÛXÙ[œÙIË	ö-v+v*ˆ6«öb6)öaöã6a¶)öavaÈ6b6*¶)ö,vã6+ˆ6)ö.v*¶*6)ö,I×KÉÚ[œİ\˜[˜ÙIË	ö-v+v*ˆ6*6ã6avaÈ6-6+¶-H6*ö)öa6*È6b6*¶)ö,vã6+ˆ6)ö.v*¶*6)ö,I×KÉİXÚšXØ[	Ë	ö-v+v*ˆ6av.v)öã6a¶aÈ6`va¶ã6b6*¶)ö,vã6+ˆ6)ö.v*¶*6)ö,I×KÉÜİÜÉË	ö-v+v*ˆ6¡¶aö)ö,H6-ö,v`H6+¶b6+ö,vb6b6*¶-v)öb6ã6,H6av+ö)ö,vªI×KÉÙ\]Z\Y[	Ë	ö¡¶,v)ö.¸ #6«ö,v+ö)öa¶#6«ö,vav)öã6-6#6,ö,vav)öã6-6b6(¶avo¶a6ã8 #6`v)öã6,I×KÉÛ[X™\œÉË	ö-v+v*ˆ6-6av)ö,vaÈ6-6)ö,öã6#6avb6*¶b6,H6b’S‰×WNÂ˜ÛÛœİWÓSÕÔ—ĞÒPÒÔÈHÖÉÚY[]IË	ö*¶-ö*6ã6`ˆ6av-6+¶-v)ö*ˆ6avb6*¶b6,v,öã6ªva6*ˆ6*6)È6av+ö)ö,vªI×KÉÜ]IË	ö-v+v*ˆ6o¶a6)öªH6avb6*¶b6,v,öã6ªva6*‰×KÉÛXÙ[œÙIË	ö-v+v*ˆ6«öb6)öaöã6a¶)öavaÈ6b6*¶)ö,vã6+ˆ6)ö.v*¶*6)ö,I×KÉÚ[œİ\˜[˜ÙIË	ö-v+v*ˆ6*6ã6avaÈ6-6+¶-H6*ö)öa6*È6b6*¶)ö,vã6+ˆ6)ö.v*¶*6)ö,I×KÉÜİÜÉË	ö-v+v*ˆ6¡¶aö)ö,H6-ö,v`H6avb6*¶b6,v,öã6ªva6*ˆ6b6*¶-v)öb6ã6,H6av+ö)ö,vªI×KÉÛ[X™\œÉË	ö-v+v*ˆ6-6av)ö,vaÈ6avb6*¶b6,v#6*¶a¶aËö-6)ö,öã6b6,öã6,ö*¶aH6avb6*¶b6,I×WNÂ™[˜İ[Ûˆ˜T]JŠHÈ™]\›ˆ
ˆOOH[ˆOOH›ÚYÈ›ÚYˆ‹˜\ÜÙ]İ\JHOOH	Û[İÜ˜ŞXÛIÈÈ	Ü‹›[İÜ˜ŞXÛWÜ]WİÜ	ÉßHÈ	Ü‹›[İÜ˜ŞXÛWÜ]WØ›İÛH	ÉßXš[J
Hˆ	ÊˆOOH[ˆOOH›ÚYÈ›ÚYˆ‹œ]WÜ\ÜšYÚ
H	ÉßH	ÊˆOOH[ˆOOH›ÚYÈ›ÚYˆ‹œ]WÛ]\ŠH	ÉßH	ÊˆOOH[ˆOOH›ÚYÈ›ÚYˆ‹œ]WÜ\ÛY
H	ÉßH6)öã6,v)öaˆ	ÊˆOOH[ˆOOH›ÚYÈ›ÚYˆ‹œ]WÚ\˜[ŠH	ÉßXœ™\XÙJ×ÊËÙË	È	ÊKš[J
NÈB™[˜İ[ÛˆT]JÈ\ÜÙ]JHÂˆYˆ
X\ÜÙ]
Bˆ™]\›ˆ[ÂˆÛÛœİ[İÜˆH\ÜÙ]˜\ÜÙ]İ\HOOH	Û[İÜ˜ŞXÛIÎÂˆÛÛœİYÚ]HˆOˆ˜Q˜Jˆ	ø %	ÊNÂˆ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹È\ˆ›ˆ‹Û\ÜÓ˜[YNˆ	Ü˜K[XÙ[œÙK\]H	È
È
[İÜˆÈ	Ü˜K[XÙ[œÙK\]K[[İÜ‰Èˆ	Ü˜K[XÙ[œÙK\]KXØ\‰ÊK˜\šXK[X™[ˆ	öo¶a6)öªH	È
È
[İÜˆÈ	öavb6*¶b6,v,öã6ªva6*‰Èˆ	ö+¶b6+ö,vb	ÊH
È	È	È
È˜T]J\ÜÙ]
HKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜K[XÙ[œÙK\]KX˜[™ˆKˆ’Tˆ‹ˆ™XXİ˜Ü™X]Q[[Y[
œÛX[‹[’K”‹ˆŠJKˆ[İÜˆÈ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜K[XÙ[œÙK\]K[[İÜ‹[[X™\ˆˆKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹[YÚ]
\ÜÙ]›[İÜ˜ŞXÛWÜ]WİÜ
JKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹[YÚ]
\ÜÙ]›[İÜ˜ŞXÛWÜ]WØ›İÛJJJHˆ™XXİ˜Ü™X]Q[[Y[
™XXİ‘œ˜YÛY[[ˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜K[XÙ[œÙK\]KYYÚ]ˆKYÚ]
\ÜÙ]œ]WÜ\ÜšYÚ
JKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜K[XÙ[œÙK\]K[]\ˆˆK\ÜÙ]œ]WÛ]\ˆ	ø %	ÊKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜K[XÙ[œÙK\]KYYÚ]ˆKYÚ]
\ÜÙ]œ]WÜ\ÛY
JKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜K[XÙ[œÙK\]KZ\˜[ˆˆKˆ™XXİ˜Ü™X]Q[[Y[
œÛX[‹[—LŒ×LĞ×LŒÌWLŒ×LˆŠKˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[YÚ]
\ÜÙ]œ]WÚ\˜[ŠJJJJNÂŸB™[˜İ[Ûˆ˜Tİ]\ÊÊHÈ™]\›ˆ
È[™[™Îˆ	ö+ö,H6)öa¶*¶.6)ö,H6*6,v,v,öã	Ë™\šYšYYˆ	ö*¶(öã6ã6+È6-6+öaÉË™YY×ØÛÜœ™Xİ[Ûˆ	öa¶ã6)ö,¶ava¶+È6)ö-va6)ö+IË˜Yˆ	öo¶ã6-8 #6a¶b6ã6,ÉÈVÜ×HÈ	ø %	ÊNÈB™[˜İ[ÛˆQšY[ÊÈHJHÈÛÛœİ[İÜˆHK˜\ÜÙ]İ\HOOH	Û[İÜ˜ŞXÛIÎÈÛÛœİ›İÜÈH[İÜˆÈÖÉöa¶b6.H6b6,öã6a6aÉË	öavb6*¶b6,v,öã6ªva6*‰×KÉöo¶a6)öªIË˜T]JJWKÉöªv)ö,v*6,vã6avb6*¶b6,IËK›[İÜ˜ŞXÛWİ\ØYÙWKÉö,öã6,ö*¶aH6avb6*¶b6,IËK›[İÜ˜ŞXÛWÜŞ\İ[WKÉö*¶ã6oˆ6avb6*¶b6,IËK›[İÜ˜ŞXÛWİ\WKÉö,öb6+¶*‰ËK™Y[İ\WKÉö,ö)öa6,ö)ö+¶*‰Ë˜Q˜JK›[Ù[ŞYX\ŠWKÉö,va¶«ÉËK˜ÛÛÜ—KÉö,öã6a6a¶+ö,IË˜Q˜JK˜Ş[[™\œÊWKÉö-6av)ö,vaÈ6avb6*¶b6,IËK™[™Ú[™WÛ[X™\—KÉö-6av)ö,vaÈ6*¶a¶aËö-6)ö,öã	ËK˜Ú\ÜÚ\×Û[X™\—KÉö«öb6)öaöã6a¶)öavaÉËK›XÙ[œÙWÛ[X™\—KÉö-v+öb6,H6«öb6)öaöã6a¶)öavaÉËK›XÙ[œÙWÚ\ÜİYWÙ]WKÉö)öa¶`¶-¶)öã6«öb6)öaöã6a¶)öavaÉËK›XÙ[œÙWÙ^\WÙ]WKÉö*6ã6avaÉËKš[œİ\˜[˜ÙWÛ[X™\—KÉö-6,vb6.H6*6ã6avaÉËKš[œİ\˜[˜ÙWÚ\ÜİYWÙ]WKÉöo¶)öã6)öaˆ6*6ã6avaÉËKš[œİ\˜[˜ÙWÙ^\WÙ]WWHˆÖÉöa¶b6.H6b6,öã6a6aÉË	ö+¶b6+ö,vb	×KÉöo¶a6)öªIË˜T]JJWKÉöa¶b6.H6+¶b6+ö,vb	ËK™ZXÛWİ\WKÉö,öb6+¶*‰ËK™Y[İ\WKÉö,ö)öa6,ö)ö+¶*‰Ë˜Q˜JK›[Ù[ŞYX\ŠWKÉö,va¶«ÉËK˜ÛÛÜ—KÉö-6av)ö,vaÈ6-6)ö,öã	ËK˜Ú\ÜÚ\×Û[X™\—KÉö-6av)ö,vaÈ6avb6*¶b6,IËK™[™Ú[™WÛ[X™\—KÉÕ’S‰ËKš[—KÉö«öb6)öaöã6a¶)öavaÉËK›XÙ[œÙWÛ[X™\—KÉö-v+öb6,H6«öb6)öaöã6a¶)öavaÉËK›XÙ[œÙWÚ\ÜİYWÙ]WKÉö)öa¶`¶-¶)öã6«öb6)öaöã6a¶)öavaÉËK›XÙ[œÙWÙ^\WÙ]WKÉö*6ã6avaÉËKš[œİ\˜[˜ÙWÛ[X™\—KÉö-6,vªv*ˆ6*6ã6avaÉËKš[œİ\˜[˜ÙWØÛÛ\[WKÉö-v+öb6,H6*6ã6avaÉËKš[œİ\˜[˜ÙWÚ\ÜİYWÙ]WKÉö)öa¶`¶-¶)öã6*6ã6avaÉËKš[œİ\˜[˜ÙWÙ^\WÙ]WKÉöav.v)öã6a¶aÈ6`va¶ã	ËKXÚšXØ[Ú[œÜXİ[Û—Û[X™\—KÉö-v+öb6,H6av.v)öã6a¶aÉËKXÚšXØ[Ú[œÜXİ[Û—Ú\ÜİYWÙ]WKÉö)öa¶`¶-¶)öã6av.v)öã6a¶aÉËKXÚšXØ[Ú[œÜXİ[Û—Ù^\WÙ]WKÉö¡¶,v)ö.¶«ö,v+ö)öaˆ6*ö)ö*6*‰Ë[X™\ŠK™š^YØ™XXÛÛŠHÈ	ö*6a6aÉÈˆ	ö+¶ã6,I×KÉö¡¶,v)ö.¶«ö,v+ö)öaˆ6av*¶+v,vªIË[X™\ŠK›[Øš[WØ™XXÛÛŠHÈ	ö*6a6aÉÈˆ	ö+¶ã6,I×KÉö«ö,vav)öã6-	Ë[X™\ŠKšX][™×ÛÚÊHÈ	ö,ö)öa6aIÈˆ	öa¶)ö,ö)öa6aI×KÉö,ö,vav)öã6-	Ë[X™\ŠK˜ÛÛÛ[™×ÛÚÊHÈ	ö,ö)öa6aIÈˆ	öa¶)ö,ö)öa6aI×KÉö(¶avo¶a6ã8 #6`v)öã6,IË[X™\ŠK˜[\YšY\ŠHÈ	ö+ö)ö,v+ÉÈˆ	öa¶+ö)ö,v+É×WNÈ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈ\Ü^Nˆ	ÙÜšY	ËÜšY[\]PÛÛ[[œÎˆ	Ü™\X]
]]ËYš]Z[›X^
NYœŠJIËØ\ˆHK›İÜË›X\

ÚË—JHOˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÙ^NˆËİ[NˆÈ›Ü™\ˆ	Ì\ÛÛY˜\ŠK[[™JIË›Ü™\”˜Y]\ÎˆLY[™ÎˆK˜XÚÙÜ›İ[™ˆ	ÈÙ™™‰ÈHKˆ™XXİ˜Ü™X]Q[[Y[
œÛX[‹ÈÛ\ÜÓ˜[YNˆ›]]YˆKÊKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈ›ÛÙZYÚˆÌX\™Ú[•ÜˆÈHKˆ	ø %	ÊJJJNÈB™[˜İ[ÛˆR\İÜJÈ\İÜHH×HJHÈ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[\İÜK›[™İÈ\İÜK›X\
Oˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÙ^NˆšYİ[NˆÈ›Ü™\›İÛNˆ	Ì\ÛÛY˜\ŠK[[™JIËY[™Îˆ	Î\	ÈHKˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[œ™\İ[OOH	İ™\šYšYY	ÈÈ	ö*¶(öã6ã6+È6a¶aö)öã6ã	Èˆ	öa¶ã6)ö,¶ava¶+È6)ö-va6)ö+IÊKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ›ÛÚ^™NˆLHHKˆ˜ÚXÚÙYØ]	ø %	Ëˆˆ‹ˆ˜ÚXÚÙ\—Û˜[YHÈ8 %	Ú˜ÚXÚÙ\—Û˜[Y_Xˆ	ÉÊKˆ››İH	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈ›ÛÚ^™NˆL‹X\™Ú[•ÜˆÈHK››İJJJHˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]YˆK—L×L—LLŒÌˆLŒÌ×LŒ×LŒL—L×LŒ×LŒ×LĞÈLŒ—LŒLŒHL—LŒÍLŒ‘—LÈLŒ×LŒÌ×LŒKˆŠJNÈB˜ÛÛœİWÔÕ×ÓP‘SÈHØš™Xİ™œ›ÛQ[šY\ÊË‹‹”WĞĞT—ÔÕÔË‹‹”WÓSÕÔ—ÔÕÔ×JNÂ™[˜İ[ÛˆRY[YšY\ŠÈ˜[YKX™[JHÈÛÛœİˆHİš[™Ê˜[YHOOH[	‰ˆ˜[YHOOH›ÚYÈ˜[YHˆ	ÉÊKš[J
NÈ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹È\ˆ›ˆ‹]Nˆˆ	ÛX™[H6*ö*6*ˆ6a¶-6+öaÈ6)ö,ö*˜İ[NˆÈ\Ü^Nˆ	Ú[›[™KX›ØÚÉË\™Xİ[Ûˆ	Û‰Ë[šXÛÙPšYNˆ	Ú\ÛÛ]IË›Û˜\šX[[Y\šXÎˆ	İX[\‹[[\ÉË›Û˜[Z[Nˆ	İZK[[Û›ÜÜXÙKÛÛœÛÛ\Ë[Û›ÜÜXÙIË›ÛÙZYÚˆÌ]\”ÜXÚ[™Îˆ	ËŒÍY[IËİ™\™›İÕÜ˜\ˆ	Ø[]Ú\™IËX^ÚYˆ	ÌL	IË›ÛÚ^™NˆLÈHKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹Èİ[NˆÈ›Û˜[Z[Nˆ	Õ˜^š\›X]‹ZÛXIË›ÛÙZYÚˆÛÛÜˆ	İ˜\ŠK[]]Y
IÈHK—LŒ—LŒLŒHL—LŒÍLŒ‘—LÈŠJNÈB™[˜İ[Ûˆ\œÛÛ›™[™ZXÛP\ÜÚYÛŠ
HÂˆÛÛœİİ\Ù\œËÙ]\Ù\œ×HH\ÙTİ]J[
KÜKÙ]WHH\ÙTİ]J	ÉÊKØ\ŞKÙ]\ŞWHH\ÙTİ]J
KÙ\œ›Ü‹Ù]\œ›Ü—HH\ÙTİ]J	ÉÊKÛØY[™ËÙ]ØY[™×HH\ÙTİ]JYJNÂˆÛÛœİØYH\Ş[˜È

HOˆÈÙ]ØY[™ÊYJNÈÙ]\œ›ÜŠ	ÉÊNÈHÂˆÛÛœİH]ØZ]ÑU
	ËÜ\œÛÛ›™[]™ZXÛKX\ÜÙ]ËœÛÜX\ÜÚYÛ‹[\İ	ËÈˆJNÂˆÙ]\Ù\œÊ\Ù\œÈ×JNÂˆBˆØ]Ú
JHÂˆÙ]\œ›ÜŠK›Y\ÜØYÙH	ö+ö,vã6)ö`v*ˆ6`vaö,v,ö*ˆ6o¶,v,öa¶a6a¶)öavb6`v`ˆ6*6b6+Ë‰ÊNÂˆBˆš[˜[HÂˆÙ]ØY[™Ê˜[ÙJNÂˆHNÂˆ\ÙQY™™Xİ


HOˆÈØY

NÈK×JNÂˆÛÛœİÙ]\HH\Ş[˜È
ZY\JHOˆÈÙ]\ŞJZY
NÈÙ]\œ›ÜŠ	ÉÊNÈHÂˆ]ØZ]ÑS‘
	ÔÔÕ	Ë	ËÜ\œÛÛ›™[]™ZXÛKX\ÜÙ]ËœÛÜX\ÜÚYÛ‹\Ù]	ËÈ\Ù\—ÚYˆZY\ÜÙ]İ\Nˆ\HJNÂˆÙ]\Ù\œÊ\İOˆ\İ›X\
Oˆ[X™\ŠšY
HOOH[X™\ŠZY
HÈÈ‹‹\ÜÙ]İ\Nˆ\H[Hˆ
JNÂˆBˆØ]Ú
JHÂˆÙ]\œ›ÜŠK›Y\ÜØYÙH	ö,6+¶ã6,vaöe6*¶+¶-vã6-H6a¶)öavb6`v`ˆ6*6b6+Ë‰ÊNÂˆBˆš[˜[HÂˆÙ]\ŞJ
NÂˆHNÂˆYˆ
\Ù\œÈOOH[	‰ˆØY[™ÊBˆ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹›ÛNˆœİ]\ÈˆK—LŒ‘—LŒÌHLŒ‘LŒ×LLŒ‘—LŒÌWLĞ×LŒ×LWLŒHLWL×LŒÌWLŒÌ×LŒHLÑWLŒÌWLŒÌ×L—LLŒˆŠNÂˆYˆ
\Ù\œÈOOH[
Bˆ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆÛÜšÜÜXÙKZ[›[™KY\œ›Üˆ‹›ÛNˆ˜[\ˆKˆ\œ›Ü‹ˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹ÛÛXÚÎˆØYK—LŒWLLŒ×LŒÍLŒ‘—LLŒLŒ×LŒÌWLÈŠJNÂˆÛÛœİš[\™YH\Ù\œË™š[\ŠHOˆÈÛÛœİÈH
K™š\œİÛ˜[YH
È	È	È
ÈK›\İÛ˜[YH
È	È	È
È
Kœ›ÛWİ]H	ÉÊJKÓİÙ\Ø\ÙJ
NÈ™]\›ˆ\HËš[˜ÛY\ÊKÓİÙ\Ø\ÙJ
JNÈJNÂˆ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KX\ÜÚYÛ‹\YÙHˆKˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈX\™Ú[›İÛNˆLHK—LWLŒÍLŒ‘WLŒÍHLNWL—LĞ×LŒ‘ˆLNWLŒ‘—LŒ×LHLÑWLŒÌWLŒÌ×L—LLWLŒÌ×LŒ—LLLĞ×LNHLŒ‘—LŒÌ×LŒWLQ—LŒ×LÈLŒ‘WLLŒ‘—LŒÌWLLĞ×LŒÈLWLLŒWLLŒÌWLŒÌ×LĞ×LNWLLŒHLWLŒŒ×LWLLŒÌWLĞ×LŒWLĞÈLŒ×LŒÌ×LŒKˆLWL—LŒÍÈLŒ×LWLŒÌWLŒ×LŒ‘—LĞÈLNWLÈLŒ×LĞ×L—LŒ×LŒ×LŒÈLŒLŒÌWLŒ×LĞ×LŒÍLŒ×LˆLŒ‘WLLŒ‘—LŒÌWLLĞ×LŒÈLWLLŒWLLŒÌWLŒÌ×LĞ×LNWLLŒHLŒWLŒ‘WLŒÍWLĞ×LŒÍHLŒ‘—LŒ×LŒ‘—LÈLŒÍLLŒ‘—LŒÈLŒ‘—LŒÌHLŒLŒÌWL—LŒ×LWL×LMLŒ×L—LŒ‘—LŒÌWLLĞ×LŒ‘ˆLŒLÈLŒLŒ‘WLŒÍLP—LŒ—LŒLŒHLWLŒÍLŒ‘WLŒÍWLŒ×LŒHLŒ‘WLLŒ‘—LŒÌWL×LWLLŒWLLŒÌWLŒÌ×LĞ×LNWLLŒWLˆLŒ‘—LŒÌ×LŒWLŒÌWLŒÌ×LĞÈLŒ‘WLLŒ×L×L—LŒ‘ˆLŒ‘—LŒ×LŒÍLŒKˆŠKˆ\œ›Üˆ	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆÛÜšÜÜXÙKZ[›[™KY\œ›Üˆ‹›ÛNˆ˜[\ˆKˆ\œ›Ü‹ˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹ÛÛXÚÎˆØYK—LŒWLLŒ×LŒÍLŒ‘—LLŒLŒ×LŒÌWLÈŠJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KX\ÜÚYÛ‹]ÛÛ˜\ˆˆKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹[ˆ—LŒ×LŒÌ×LŒWLŒ×LLŒ×LLĞÈLÑWLŒÌWLŒÌ×L—L‹ˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹\NˆœÙX\˜Ú‹XÙZÛ\ˆ—L—LŒ×LHLĞ×LŒÈLŒÌ×LWLŒH‹˜[YNˆKÛÚ[™ÙNˆHOˆÙ]JK\™Ù]˜[YJHJJKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹[ˆ˜Jš[\™Y›[™İ
KˆˆL—LWLŒÌHLŒ×LŒÌˆ‹ˆ˜J\Ù\œË›[™İ
KˆˆL—LWLŒÌHŠKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹ÛÛXÚÎˆØY\ØX›YˆØY[™ÈKØY[™ÈÈ	ö+ö,H6+v)öa6+ö,vã6)ö`v*¸ )‰Èˆ	ö*6,vb6,¶,v,ö)öa¶ã	ÊJKˆ™XXİ˜Ü™X]Q[[Y[
™\ÜÛœÚ]™UX›K[ˆ™XXİ˜Ü™X]Q[[Y[
XY‹[ˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
‹[—L—LŒ×LHŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒÌ×LWLŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒWLŒ‘WLŒÍWLĞ×LŒÍHLWLŒÎWLLĞÈŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—L—LLŒÎHLLŒÌ×LĞ×LLÈŠJJKˆ™XXİ˜Ü™X]Q[[Y[
›ÙH‹[ˆš[\™Y›X\
HOˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹ÈÙ^NˆKšYKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[ˆK™š\œİÛ˜[YKˆˆ‹ˆK›\İÛ˜[YJJKˆ™XXİ˜Ü™X]Q[[Y[
‹[Kœ›ÛWİ]H	ø %	ÊKˆ™XXİ˜Ü™X]Q[[Y[
‹[K˜\ÜÙ]İ\HOOH	ØØ\‰ÈÈ	ö+¶b6+ö,vb	ÈˆK˜\ÜÙ]İ\HOOH	Û[İÜ˜ŞXÛIÈÈ	öavb6*¶b6,v,öã6ªva6*‰Èˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]YˆK—LŒWLŒ‘WLŒÍWLĞ×LŒÍHL—LŒÍLŒ‘—LÈŠJKˆ™XXİ˜Ü™X]Q[[Y[
‹Èİ[NˆÈÚ]TÜXÙNˆ	Û›İÜ˜\	ÈHKˆ™XXİ˜Ü™X]Q[[Y[
œÙ[Xİ‹ÈÛ\ÜÓ˜[YNˆš[œ]‹˜\šXK[X™[ˆ	ö*¶+¶-vã6-H6b6,öã6a6aÈ6*6aÈ	È
ÈK™š\œİÛ˜[YH
È	È	È
ÈK›\İÛ˜[YKİ[NˆÈ\Ü^Nˆ	Ú[›[™KX›ØÚÉËÚYˆMLK\ØX›Yˆ\ŞHOOHKšY˜[YNˆK˜\ÜÙ]İ\H	ÉËÛÚ[™ÙNˆHOˆÙ]\JKšYK\™Ù]˜[YJHKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆˆˆK—LŒMLŒLŒ‘—LLˆLŒWLŒ‘WLŒÍWLĞ×LŒÍHLŒMŠKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆ˜Ø\ˆˆK—LŒ‘WLLŒ‘—LŒÌWLŠKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆ›[İÜ˜ŞXÛHˆK—LWLLŒWLLŒÌWLŒÌ×LĞ×LNWLLŒHŠJJJJKˆYš[\™Y›[™İ	‰ˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
‹ÈÛÛÜ[ˆ‹Û\ÜÓ˜[YNˆ›]]YˆK—LWLŒÌWLŒ‘—LĞÈLĞ×LŒ×LWLŒHL—LŒÍLŒ‘‹ˆŠJJJJNÂŸB™[˜İ[Ûˆ\œÛÛ›™[™ZXÛP\ÜÙ]Ê
HÂˆÛÛœİİX‹Ù]X—HH\ÙTİ]J	Ø\ÜÚYÛ‰ÊNÂˆÛÛœİÚ][\ËÙ]][\×HH\ÙTİ]J×JKÜÙ[XİYÙ]Ù[XİYHH\ÙTİ]J[
KÛØY[™ËÙ]ØY[™×HH\ÙTİ]J˜[ÙJKÙ]Z[ØY[™ËÙ]]Z[ØY[™×HH\ÙTİ]J˜[ÙJKÜKÙ]WHH\ÙTİ]J	ÉÊKİ\KÙ]\WHH\ÙTİ]J	Ø[	ÊKÙ\œ›Ü‹Ù]\œ›Ü—HH\ÙTİ]J	ÉÊNÂˆÛÛœİ]Z[™\]Y\İH\ÙT™YŠ
NÂˆÛÛœİØYH\Ş[˜È

HOˆÈÙ]ØY[™ÊYJNÈÙ]\œ›ÜŠ	ÉÊNÈHÂˆÛÛœİ™\İ[H]ØZ]ÑU
	ËÜ\œÛÛ›™[]™ZXÛKX\ÜÙ]ËœÛÜ[\İ	ËÈˆJNÂˆÙ]][\Ê™\İ[š][\È×JNÂˆBˆØ]Ú
JHÂˆÙ]\œ›ÜŠK›Y\ÜØYÙH	ö+ö,vã6)ö`v*ˆ6o¶,vb6a¶+öaø #6aö)È6a¶)öavb6`v`ˆ6*6b6+Ë‰ÊNÂˆBˆš[˜[HÂˆÙ]ØY[™Ê˜[ÙJNÂˆHNÂˆ\ÙQY™™Xİ


HOˆÈYˆ
XˆOOH	Ùš[\ÉÊBˆØY

NÈKİX—JNÂˆÛÛœİš[\™YH][\Ë™š[\ŠHOˆÈÛÛœİ˜[YHHØK™š\œİÛ˜[YKK›\İÛ˜[YK˜T]JJKK›˜][Û˜[ØÛÙWK™š[\Š›ÛÛX[ŠKš›Ú[Š	È	ÊKÓİÙ\Ø\ÙJ
NÈ™]\›ˆ˜[YKš[˜ÛY\ÊKš[J
KÓİÙ\Ø\ÙJ
JH	‰ˆ
\HOOH	Ø[	ÈK˜\ÜÙ]İ\HOOH\JNÈJNÂˆÛÛœİÜ[ˆH\Ş[˜È
\ÜÙ]
HOˆÈÛÛœİ™\]Y\İH
ÊÙ]Z[™\]Y\İ˜İ\œ™[ÈÙ]]Z[ØY[™ÊYJNÈÙ]Ù[XİY
[
NÈÙ]\œ›ÜŠ	ÉÊNÈHÂˆÛÛœİ™\İ[H]ØZ]ÑU
	ËÜ\œÛÛ›™[]™ZXÛKX\ÜÙ]ËœÛÜY]Z[	šYIÈ
È[˜ÛÙUT’PÛÛ\Û™[
\ÜÙ]šY
KÈˆJNÂˆYˆ
™\]Y\İOOH]Z[™\]Y\İ˜İ\œ™[
BˆÙ]Ù[XİY
™\İ[˜\ÜÙ]\ÜÙ]
NÂˆBˆØ]Ú
JHÂˆYˆ
™\]Y\İOOH]Z[™\]Y\İ˜İ\œ™[
BˆÙ]\œ›ÜŠK›Y\ÜØYÙH	ö+ö,vã6)ö`v*ˆ6+6,¶)¶ã6)ö*ˆ6o¶,vb6a¶+öaÈ6a¶)öavb6`v`ˆ6*6b6+Ë‰ÊNÂˆBˆš[˜[HÂˆYˆ
™\]Y\İOOH]Z[™\]Y\İ˜İ\œ™[
BˆÙ]]Z[ØY[™Ê˜[ÙJNÂˆHNÂˆ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ[™[YZ[‹]ÛÜšÜÜXÙK\YÙH˜KX\ÜÙ]Ë\YÙHˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KX\ÜÙ]ËZ\›ÈˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
šÈ‹[—LWLŒ×LŒÍLĞ×L—LŒ×LŒŒ—LLŒ×LŒHLLLŒÌ×LŒ×LĞ×LLWLŒŒ×LWLLŒÌWLĞ×LŒWLĞÈŠKˆ™XXİ˜Ü™X]Q[[Y[
œ‹[—LŒWLŒ‘WLŒÍWLĞ×LŒÍHLLŒÌ×LŒ×LĞ×LLŒLÈLÑWLŒÌWLŒÌ×L—LLLWLŒÍLŒ×L×LŒ‘—L×LMLÑWLŒÌWLL—LŒ‘—L×LŒ×L×LŒ×LĞÈLŒ—LŒLŒWLŒ×LŒÍLŒ‘—LÈŠJKˆXˆOOH	Ùš[\ÉÈ	‰ˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹ÛÛXÚÎˆ

HOˆİÛ›ØY›İXİYš[J	ËÜ\œÛÛ›™[]™ZXÛKX\ÜÙ]ËœÛÜY^Ü	Ë	Ü\œÛÛ›™[İ™ZXÛWØ\ÜÙ]ËŞ	ÊHK—LŒ‘WLŒÌWLLŒ×LĞÈ^Ù[LLŒWLŒÍWLŒ×LLĞ×LŒÌHŠJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KX\ÜÙ]Ë]XœÈ‹›ÛNˆ™Ü›İ\‹˜\šXK[X™[ˆ—LŒLŒ‘WLŒÍLLŒÌ×LŒ×LĞ×LL—L—LLĞ×LÈˆKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ	Øˆ	È
È
XˆOOH	Ø\ÜÚYÛ‰ÈÈ	Ü	Èˆ	ÙÉÊK˜\šXK\™\ÜÙYˆXˆOOH	Ø\ÜÚYÛ‰ËÛÛXÚÎˆ

HOˆÙ]XŠ	Ø\ÜÚYÛ‰ÊHK—LŒWLŒ‘WLŒÍWLĞ×LŒÍHLŒ‘WLLŒ‘—LŒÌWLLLWLLŒWLLŒÌWLŒÌ×LĞ×LNWLLŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ	Øˆ	È
È
XˆOOH	Ùš[\ÉÈÈ	Ü	Èˆ	ÙÉÊK˜\šXK\™\ÜÙYˆXˆOOH	Ùš[\ÉËÛÛXÚÎˆ

HOˆÙ]XŠ	Ùš[\ÉÊHK—LÑWLŒÌWLL—LŒ‘—L×LŒ×L×LŒ×LĞÈLŒ—LŒLŒWLŒ×LŒÍLŒ‘—LÈŠJKˆXˆOOH	Ø\ÜÚYÛ‰ÈÈ™XXİ˜Ü™X]Q[[Y[
\œÛÛ›™[™ZXÛP\ÜÚYÛ‹[
Hˆ™XXİ˜Ü™X]Q[[Y[
™XXİ‘œ˜YÛY[[ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KX\ÜÙ]Ë]ÛÛ˜\ˆˆKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹[ˆ—LŒ×LŒÌ×LŒWLŒ×LLŒ×LLĞÈLÑWLŒÌWLL—LŒ‘—LÈ‹ˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹\NˆœÙX\˜Ú‹XÙZÛ\ˆ—L—LŒ×LWLŒÈLÑWLLŒ×LNHLĞ×LŒÈLNWLŒ‘ˆLWLLĞÈ‹˜[YNˆKÛÚ[™ÙNˆHOˆÙ]JK\™Ù]˜[YJHJJKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹[ˆ—L—LLŒÎHLLŒÌ×LĞ×LLÈ‹ˆ™XXİ˜Ü™X]Q[[Y[
œÙ[Xİ‹ÈÛ\ÜÓ˜[YNˆš[œ]‹˜[YNˆ\KÛÚ[™ÙNˆHOˆÙ]\JK\™Ù]˜[YJHKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆ˜[ˆK—L×LWL×LMLLŒÌ×LŒ×LĞ×LŠKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆ˜Ø\ˆˆK—LŒ‘WLLŒ‘—LŒÌWLŠKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆ›[İÜ˜ŞXÛHˆK—LWLLŒWLLŒÌWLŒÌ×LĞ×LNWLLŒHŠJJKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹[ˆ˜Jš[\™Y›[™İ
KˆˆLÑWLŒÌWLL—LŒ‘—LÈŠKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹ÛÛXÚÎˆØY\ØX›YˆØY[™ÈKØY[™ÈÈ	ö+ö,H6+v)öa6+ö,vã6)ö`v*¸ )‰Èˆ	ö*6,vb6,¶,v,ö)öa¶ã	ÊJKˆ\œ›Üˆ	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆÛÜšÜÜXÙKZ[›[™KY\œ›Üˆ‹›ÛNˆ˜[\ˆKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹[\œ›ÜŠKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹ÛÛXÚÎˆÙ[XİYÈ

HOˆÙ]\œ›ÜŠ	ÉÊHˆØYK—LŒWLLŒ×LŒÍLŒ‘—LLŒLŒ×LŒÌWLÈŠJKˆØY[™ÈÈ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KX\ÜÙ]ËY[\H‹›ÛNˆœİ]\ÈˆK—LŒ‘—LŒÌHLŒ‘LŒ×LLŒ‘—LŒÌWLĞ×LŒ×LWLŒHLÑWLŒÌWLL—LŒ‘—L×LŒ×L×LŒ×LŒˆŠHˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KX\ÜÙ]Ë]ÛÜšÜÜXÙHˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KX\ÜÙ]Ë[\İ‹˜\šXK[X™[ˆ—LWL×LŒÌWLŒÌ×LŒHLÑWLŒÌWLL—LŒ‘—L×LŒ×L×LŒÈˆKˆš[\™Y›X\
\ÜÙ]Oˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÙ^Nˆ\ÜÙ]šY\Nˆ˜]Ûˆ‹˜\šXK\™\ÜÙYˆ
Ù[XİYOOH[Ù[XİYOOH›ÚYÈ›ÚYˆÙ[XİYšY
HOOH\ÜÙ]šYÛ\ÜÓ˜[YNˆ	Ü˜KX\ÜÙ]ËZ][IÈ
È

Ù[XİYOOH[Ù[XİYOOH›ÚYÈ›ÚYˆÙ[XİYšY
HOOH\ÜÙ]šYÈ	ÈÛ‰Èˆ	ÉÊKÛÛXÚÎˆ

HOˆÜ[Š\ÜÙ]
Kİ[NˆÈ\Ü^Nˆ	ÙÜšY	ËØ\ˆ^[YÛˆ	ÜšYÚ	ËZ[’ZYÚˆLHKˆ™XXİ˜Ü™X]Q[[Y[
T]KÈ\ÜÙ]ˆ\ÜÙ]JKˆ™XXİ˜Ü™X]Q[[Y[
œİ›Û™È‹[ˆ\ÜÙ]™š\œİÛ˜[YKˆˆ‹ˆ\ÜÙ]›\İÛ˜[YJKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹[ˆ\ÜÙ]˜\ÜÙ]İ\HOOH	ØØ\‰ÈÈ	ö+¶b6+ö,vb	Èˆ	öavb6*¶b6,v,öã6ªva6*‰ËˆˆLÈ‹ˆ˜Tİ]\Ê\ÜÙ]œİ]\ÊJKˆ™XXİ˜Ü™X]Q[[Y[
œÛX[‹[ˆ—LŒŒ—LŒ‘WLŒÌWLĞ×LˆL—LNWLŒ×LLĞ×LŒÌ×LŒNˆ‹ˆ\ÜÙ]˜ÚXÚÛ\İÛ\İØ]	ö*6+öb6aˆ6,ö)ö*6`¶aÉÊJJKˆYš[\™Y›[™İ	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KX\ÜÙ]ËY[\HˆK][\Ë›[™İÈ	öo¶,vb6a¶+öaø #6)öã6*6)È6)öã6aˆ6av-6+¶-v)ö*ˆ6ã6)ö`v*ˆ6a¶-6+Ë‰Èˆ	öaöa¶b6,ˆ6o¶,vb6a¶+öaø #6)öã6*ö*6*ˆ6a¶-6+öaÈ6)ö,ö*‹‰ÊJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KX\ÜÙ]ËY]Z[ˆK]Z[ØY[™ÈÈ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KX\ÜÙ]ËY[\H‹›ÛNˆœİ]\ÈˆK—LŒ‘—LŒÌHLŒ‘LŒ×LLŒ‘—LŒÌWLĞ×LŒ×LWLŒHLWLŒÍLŒ‘WLŒÍWLŒ×LŒHLLWLŒ‘—LŒ×LŒÌWLNWLŒˆŠHˆÙ[XİYÈ™XXİ˜Ü™X]Q[[Y[
P\ÜÙ]]Z[È\ÜÙ]ˆÙ[XİYJHˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KX\ÜÙ]ËY[\HˆK—LŒLŒÌWLŒ×LĞÈLWLŒÍLŒ×L×LŒ‘—L×LMLWLŒÍLŒ‘WLŒÍWLŒ×LŒHLLWLŒ‘—LŒ×LŒÌWLNWLŒÈLĞ×LNHLÑWLŒÌWLL—LŒ‘—LÈLŒÌWLŒÈLŒ×L—LŒWLŒ‘WLŒ×LŒLNWL—LĞ×LŒ‘‹ˆŠJJJJNÂŸB™[˜İ[ÛˆP\ÜÙ]]Z[
È\ÜÙ]ˆHJHÂˆ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈ\Ü^Nˆ	ÙÜšY	ËØ\ˆLˆHKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KX\ÜÙ]\İ[[X\H‹İ[NˆÈ\Ü^Nˆ	Ù›^	Ë\İYPÛÛ[ˆ	ÜÜXÙKX™]ÙY[‰Ë[YÛ’][\Îˆ	ØÙ[\‰ËØ\ˆL‹›^Ü˜\ˆ	İÜ˜\	ËY[™ÎˆM›Ü™\”˜Y]\ÎˆM˜XÚÙÜ›İ[™ˆ	İ˜\ŠKXœ˜[™\ÛÙÙYÙŒÊIË›Ü™\ˆ	Ì\ÛÛY˜\ŠK[[™JIÈHKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈ\Ü^Nˆ	ÙÜšY	ËØ\ˆHKˆ™XXİ˜Ü™X]Q[[Y[
T]KÈ\ÜÙ]ˆHJKˆ™XXİ˜Ü™X]Q[[Y[
œİ›Û™È‹[ˆK™š\œİÛ˜[YKˆˆ‹ˆK›\İÛ˜[YJKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]YˆKˆKœ›ÛWİ]H	ø %	ËˆˆLÈ‹ˆK˜\ÜÙ]İ\HOOH	ØØ\‰ÈÈ	ö+¶b6+ö,vb	Èˆ	öavb6*¶b6,v,öã6ªva6*‰ÊJKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KXÚXÚÛ\İXÚ\ˆK˜Tİ]\ÊKœİ]\ÊJJKˆ™XXİ˜Ü™X]Q[[Y[
œÙXİ[Ûˆ‹ÈÛ\ÜÓ˜[YNˆœ[™[‹İ[NˆÈX\™Ú[ˆHKˆ™XXİ˜Ü™X]Q[[Y[
š‹[—LŒÍL—LŒ×LŒÌ×L×LŒ×L×LŒ×LĞÈLWL—LĞÈLLŒÌ×LĞ×LLÈŠKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈ\Ü^Nˆ	ÙÜšY	ËÜšY[\]PÛÛ[[œÎˆ	Ü™\X]
]]ËYš]Z[›X^
NLYœŠJIËØ\ˆLHK
K˜\ÜÙ]İ\HOOH	ØØ\‰ÈÈÖÉö-6av)ö,vaÈ’S‰ËKš[—KÉö-6av)ö,vaÈ6avb6*¶b6,IËK™[™Ú[™WÛ[X™\—KÉö-6av)ö,vaÈ6-6)ö,öã	ËK˜Ú\ÜÚ\×Û[X™\—WHˆÖÉö-6av)ö,vaÈ6avb6*¶b6,H6avb6*¶b6,v,öã6ªva6*‰ËK™[™Ú[™WÛ[X™\—KÉö-6av)ö,vaÈ6*¶a¶aÉËK˜Ú\ÜÚ\×Û[X™\—WJK›X\

ÛX™[˜[YWJHOˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÙ^NˆX™[İ[NˆÈ›Ü™\ˆ	Ì\ÛÛY˜\ŠK[[™JIË˜XÚÙÜ›İ[™ˆ	İ˜\ŠKXØ\™Ù™™ŠIËY[™ÎˆL‹›Ü™\”˜Y]\ÎˆL‹Z[•ÚYˆHKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ›ÛÚ^™NˆL‹X\™Ú[›İÛNˆÈHKX™[
Kˆ™XXİ˜Ü™X]Q[[Y[
RY[YšY\‹È˜[YNˆ˜[YKX™[ˆX™[JJJJKˆ
K˜\ÜÙ]İ\HOOH	ØØ\‰ÈÈXKš[ˆˆXK™[™Ú[™WÛ[X™\ŠH	‰ˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ›ÛÚ^™NˆL‹X\™Ú[•ÜˆHHK—LWLĞ×LLŒ‘ˆLŒ‘WLŒ×LLĞÈLŒLŒ×LĞ×LŒ‘ˆLŒWLLŒÌ×LŒÍÈLWLŒÌ×LŒ—LLLLŒÌ×LĞ×LLÈLŒ‘—LŒÌHLWLŒÌWLHLŒ×L—LŒ‘—LŒÌWLLĞ×LŒ‘ˆLŒ—LŒLŒHLLŒ‘—LLŒLŒ×LŒÌWLÈLŒ×LŒÌWLŒÌ×LŒ×LLŒÍLLŒ‘—LŒPˆLWL—LŒ‘—LŒ×LŒÌHLŒ‘WLŒ×LLĞÈLŒLÈLWLŒÎWL—LĞÈLŒ‘WLŒÍ×LŒ×LĞÈL—LWLŒ×LĞ×LŒÍL—LĞ×LŒÌ×LŒKˆŠJKˆ™XXİ˜Ü™X]Q[[Y[
œÙXİ[Ûˆ‹ÈÛ\ÜÓ˜[YNˆœ[™[‹İ[NˆÈX\™Ú[ˆHKˆ™XXİ˜Ü™X]Q[[Y[
š‹[—LWLŒÍLŒ‘WLŒÍWLŒ×LŒHLNWLŒ×LWLŠKˆ™XXİ˜Ü™X]Q[[Y[
QšY[ËÈNˆHJJKˆ™XXİ˜Ü™X]Q[[Y[
œÙXİ[Ûˆ‹ÈÛ\ÜÓ˜[YNˆœ[™[‹İ[NˆÈX\™Ú[ˆHKˆ™XXİ˜Ü™X]Q[[Y[
š‹[ˆ—LŒWLŒÍWLŒ×LLĞ×LŒÌHLLWLŒ‘—LŒ×LŒÌWLNH
‹ˆ˜Q˜J
KœİÜÈ×JK›[™İ
KˆŠHŠKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈ\Ü^Nˆ	ÙÜšY	ËÜšY[\]PÛÛ[[œÎˆ	Ü™\X]
]]ËYš]Z[›X^
M\YœŠJIËØ\ˆLHKˆ
KœİÜÈ×JK›X\
Oˆ™XXİ˜Ü™X]Q[[Y[
™šYİ\™H‹ÈÙ^Nˆœİ×ÚÙ^Kİ[NˆÈX\™Ú[ˆ›Ü™\ˆ	Ì\ÛÛY˜\ŠK[[™JIË›Ü™\”˜Y]\ÎˆLKY[™ÎˆË˜XÚÙÜ›İ[™ˆ	İ˜\ŠKXØ\™Ù™™ŠIËZ[•ÚYˆHKˆ™XXİ˜Ü™X]Q[[Y[
š[YÈ‹ÈÜ˜Îˆ™]Wİ\šK[ˆWÔÕ×ÓP‘SÖÜœİ×ÚÙ^WHœİ×ÚÙ^KØY[™Îˆ›^H‹İ[NˆÈÚYˆ	ÌL	IËZYÚˆLÍKØš™Xİš]ˆ	ØÛÛZ[‰Ë˜XÚÙÜ›İ[™ˆ	İ˜\ŠK\ÛÙÙY™
IË›Ü™\”˜Y]\ÎˆÈHJKˆ™XXİ˜Ü™X]Q[[Y[
™šYØØ\[Ûˆ‹Èİ[NˆÈ›ÛÚ^™NˆLK^[YÛˆ	ØÙ[\‰ËX\™Ú[•ÜˆˆHKWÔÕ×ÓP‘SÖÜœİ×ÚÙ^WHœİ×ÚÙ^JJJKˆJKœİÜÈ×JK›[™İ	‰ˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]YˆK—LŒWLŒÍWLLĞ×LŒÌWLĞÈLŒ—LŒLŒHL—LŒÍLŒ‘—LÈLŒ×LŒÌ×LŒKˆŠJJKˆ™XXİ˜Ü™X]Q[[Y[
œÙXİ[Ûˆ‹ÈÛ\ÜÓ˜[YNˆœ[™[‹İ[NˆÈX\™Ú[ˆHKˆ™XXİ˜Ü™X]Q[[Y[
š‹[—LŒWLŒ×LŒÌWLĞ×LŒ‘WL—LÈL—LNWLŒ×LLĞ×LŒÌ×LŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
R\İÜKÈ\İÜNˆK˜ÚXÚÛ\İÚ\İÜH×HJJJNÂŸB™[˜İ[Ûˆ\œÛÛ›™[™ZXÛPÚXÚÛ\İŒŠ
HÂˆÛÛœİÚ][\ËÙ]][\×HH\ÙTİ]J×JKÙ]Z[Ù]]Z[HH\ÙTİ]J[
KØÚXÚÜËÙ]ÚXÚÜ×HH\ÙTİ]JßJKÛ›İKÙ]›İWHH\ÙTİ]J	ÉÊNÂˆÛÛœİÜÙ[XİYYËÙ]Ù[XİYY×HH\ÙTİ]J×JNÂˆÛÛœİÜKÙ]WHH\ÙTİ]J	ÉÊKÜİ]\ËÙ]İ]\×HH\ÙTİ]J	Ø[	ÊKÛØY[™ËÙ]ØY[™×HH\ÙTİ]JYJKÙ]Z[ØY[™ËÙ]]Z[ØY[™×HH\ÙTİ]J˜[ÙJKÜØ]š[™ËÙ]Ø]š[™×HH\ÙTİ]J˜[ÙJKÙ\œ›Ü‹Ù]\œ›Ü—HH\ÙTİ]J	ÉÊKÛ›İXÙKÙ]›İXÙWHH\ÙTİ]J	ÉÊNÂˆÛÛœİ]Z[™\]Y\İH\ÙT™YŠ
NÂˆÛÛœİØYH\Ş[˜È

HOˆÈÙ]ØY[™ÊYJNÈÙ]\œ›ÜŠ	ÉÊNÈHÂˆÛÛœİ™\İ[H]ØZ]ÑU
	ËÜ\œÛÛ›™[]™ZXÛKX\ÜÙ]ËœÛÜXÚXÚÛ\İ[\İ	ËÈˆJNÂˆÙ]][\Ê™\İ[š][\È×JNÂˆBˆØ]Ú
JHÂˆÙ]\œ›ÜŠK›Y\ÜØYÙH	ö+ö,vã6)ö`v*ˆ6`vaö,v,ö*ˆ6b6,ö)öã6a6a¶)öavb6`v`ˆ6*6b6+Ë‰ÊNÂˆBˆš[˜[HÂˆÙ]ØY[™Ê˜[ÙJNÂˆHNÂˆ\ÙQY™™Xİ


HOˆÈØY

NÈK×JNÂˆÛÛœİÜ[ˆH\Ş[˜È
\ÜÙ]
HOˆÈÛÛœİ™\]Y\İH
ÊÙ]Z[™\]Y\İ˜İ\œ™[ÈÙ]]Z[
[
NÈÙ]]Z[ØY[™ÊYJNÈÙ]\œ›ÜŠ	ÉÊNÈÙ]›İXÙJ	ÉÊNÈHÂˆÛÛœİ™\İ[H]ØZ]ÑU
	ËÜ\œÛÛ›™[]™ZXÛKX\ÜÙ]ËœÛÜY]Z[	šYIÈ
È[˜ÛÙUT’PÛÛ\Û™[
\ÜÙ]šY
KÈˆJNÂˆYˆ
™\]Y\İOOH]Z[™\]Y\İ˜İ\œ™[
Bˆ™]\›ÂˆÛÛœİ™XÛÜ™H™\İ[˜\ÜÙ]\ÜÙ]ÂˆÙ]]Z[
™XÛÜ™
NÂˆÛÛœİ˜[Y\ÈHßNÂˆ
™XÛÜ™˜ÚXÚÜÈ×JK™›Ü‘XXÚ
ÚXÚÈOˆÈ˜[Y\ÖØÚXÚË˜ÚXÚ×ÚÙ^WHH[X™\ŠÚXÚË˜ÚXÚ×İ˜[YJHOOHNÈJNÂˆÙ]ÚXÚÜÊ˜[Y\ÊNÂˆÙ]›İJ™XÛÜ™˜ÚXÚÛ\İÛ›İH	ÉÊNÂˆBˆØ]Ú
JHÂˆYˆ
™\]Y\İOOH]Z[™\]Y\İ˜İ\œ™[
BˆÙ]\œ›ÜŠK›Y\ÜØYÙH	ö+ö,vã6)ö`v*ˆ6+6,¶)¶ã6)ö*ˆ6b6,öã6a6aÈ6a¶)öavb6`v`ˆ6*6b6+Ë‰ÊNÂˆBˆš[˜[HÂˆYˆ
™\]Y\İOOH]Z[™\]Y\İ˜İ\œ™[
BˆÙ]]Z[ØY[™Ê˜[ÙJNÂˆHNÂˆÛÛœİÛÜÙQ]Z[H

HOˆÈ]Z[™\]Y\İ˜İ\œ™[
ÊÎÈÙ]]Z[
[
NÈÙ]]Z[ØY[™Ê˜[ÙJNÈÙ]\œ›ÜŠ	ÉÊNÈNÂˆÛÛœİ\İH
]Z[OOH[]Z[OOH›ÚYÈ›ÚYˆ]Z[˜\ÜÙ]İ\JHOOH	Û[İÜ˜ŞXÛIÈÈWÓSÕÔ—ĞÒPÒÔÈˆWĞĞT—ĞÒPÒÔÎÂˆÛÛœİÚXÚÙYÛİ[H\İ™š[\Š
ÚÙ^WJHOˆÚXÚÜÖÚÙ^WHOOH[™Yš[™Y
K›[™İÂˆÛÛœİ™Z™XİYÛİ[H\İ™š[\Š
ÚÙ^WJHOˆÚXÚÜÖÚÙ^WHOOH˜[ÙJK›[™İÂˆÛÛœİš[\™YH][\Ë™š[\ŠHOˆÈÛÛœİ˜[YHHØK™š\œİÛ˜[YKK›\İÛ˜[YK˜T]JJKK›˜][Û˜[ØÛÙWK™š[\Š›ÛÛX[ŠKš›Ú[Š	È	ÊKÓİÙ\Ø\ÙJ
NÈ™]\›ˆ˜[YKš[˜ÛY\ÊKš[J
KÓİÙ\Ø\ÙJ
JH	‰ˆ
İ]\ÈOOH	Ø[	È
İ]\ÈOOH	ØØ\‰ÈÈK˜\ÜÙ]İ\HOOH	ØØ\‰ÈˆK˜\ÜÙ]İ\HOOH	Û[İÜ˜ŞXÛIÊJNÈJNÂˆÛÛœİ^Ü™ZXÛ\ÈH\ÜÙ]ÈOˆÂˆHÂˆYˆ
X\ÜÙ]Ë›[™İ
Bˆ›İÈ™]È\œ›ÜŠ	ö)ö*6*¶+ö)È6+v+ö)ö`¶a6ã6ªH6b6,öã6a6aÈ6,v)È6)öa¶*¶+¶)ö*6ªva¶ã6+Ë‰ÊNÂˆYˆ
\[ÙˆÖOOH	İ[™Yš[™Y	ÊBˆ›İÈ™]È\œ›ÜŠ	öªv*¶)ö*6+¶)öa¶aÈ6+¶,vb6+6ã6)öªv,öa6*6)ö,v«ö,6)ö,vã6a¶-6+öaÈ6)ö,ö*‹‰ÊNÂˆÛÛœİÛÛ[[œÈHÖÉö,v+öã6`IË
ËJHOˆH
ÈWKÉöa¶b6.H6b6,öã6a6aÉËHOˆK˜\ÜÙ]İ\HOOH	ØØ\‰ÈÈ	ö+¶b6+ö,vb	Èˆ	öavb6*¶b6,v,öã6ªva6*‰×KÉöo¶a6)öªIË˜T]WKÉöa¶)öaH6o¶,v,öa¶a	ËHOˆ	ØK™š\œİÛ˜[YH	ÉßH	ØK›\İÛ˜[YH	ÉßXš[J
WKÉöªv+È6ava6ã	ËHOˆİš[™ÊK›˜][Û˜[ØÛÙH	ÉÊWKÉö,öav*‰ËHOˆKœ›ÛWİ]H	É×KÉöb6-¶.vã6*ˆ6o¶,vb6a¶+öaÉËHOˆ˜Tİ]\ÊKœİ]\ÊWKÉö,ö)öa6,ö)ö+¶*‰ËHOˆK›[Ù[ŞYX\ˆ	É×KÉö,va¶«ÉËHOˆK˜ÛÛÜˆ	É×KÉöa¶b6.H6+¶b6+ö,vb	ËHOˆK™ZXÛWİ\H	É×KÉö,öã6,ö*¶aH6avb6*¶b6,v,öã6ªva6*‰ËHOˆK›[İÜ˜ŞXÛWÜŞ\İ[H	É×KÉöªv)ö,v*6,vã6avb6*¶b6,v,öã6ªva6*‰ËHOˆK›[İÜ˜ŞXÛWİ\ØYÙH	É×KÉöa¶b6.H6,öb6+¶*‰ËHOˆK™Y[İ\H	É×KÉö-6av)ö,vaÈ6avb6*¶b6,IËHOˆK™[™Ú[™WÛ[X™\ˆ	É×KÉö-6av)ö,vaÈ6-6)ö,öã	ËHOˆK˜Ú\ÜÚ\×Û[X™\ˆ	É×KÉÕ’S‰ËHOˆKš[ˆ	É×KÉö-6av)ö,vaÈ6«öb6)öaöã6a¶)öavaÉËHOˆK›XÙ[œÙWÛ[X™\ˆ	É×KÉö)öa¶`¶-¶)öã6«öb6)öaöã6a¶)öavaÉËHOˆK›XÙ[œÙWÙ^\WÙ]H	É×KÉö-6av)ö,vaÈ6*6ã6avaÉËHOˆKš[œİ\˜[˜ÙWÛ[X™\ˆ	É×KÉö-6,vªv*ˆ6*6ã6avaÉËHOˆKš[œİ\˜[˜ÙWØÛÛ\[H	É×KÉö)öa¶`¶-¶)öã6*6ã6avaÉËHOˆKš[œİ\˜[˜ÙWÙ^\WÙ]H	É×KÉö-6av)ö,vaÈ6av.v)öã6a¶aÈ6`va¶ã	ËHOˆKXÚšXØ[Ú[œÜXİ[Û—Û[X™\ˆ	É×KÉö)öa¶`¶-¶)öã6av.v)öã6a¶aÈ6`va¶ã	ËHOˆKXÚšXØ[Ú[œÜXİ[Û—Ù^\WÙ]H	É×KÉö*¶.v+ö)ö+È6*6,v,v,öã	ËHOˆ[X™\ŠK˜ÚXÚÛ\İØÛİ[
WKÉö(¶+¶,vã6aˆ6a¶*¶ã6+6aÉËHOˆ˜Tİ]\ÊK›\İÜ™\İ[
WKÉö(¶+¶,vã6aˆ6*6,v,v,öã8 #6ªva¶a¶+öaÉËHOˆK›\İØÚXÚÙ\—Û˜[YH	É×KÉö*¶)ö,vã6+ˆ6(¶+¶,vã6aˆ6*6,v,v,öã	ËHOˆK˜ÚXÚÛ\İÛ\İØ]	É×KÉö*¶b6-¶ã6+v)ö*‰ËHOˆK˜ÚXÚÛ\İÛ›İH	É×WNÂˆÛÛœİXY\œÈHÛÛ[[œË›X\

Û˜[YWJHOˆ˜[YJNÂˆÛÛœİÜÈHÖ][Ë˜[ØWİ×ÜÚY]
ÖÉö,ö)öav)öa¶aÈ6+¶-öã6)ö,H6)ö-öa6)ö.v)ö*ˆ6+¶b6+ö,vb6b6avb6*¶b6,v,öã6ªva6*‰×KØ6*¶.v+ö)ö+È6o¶,vb6a¶+öaÎˆ	Ü˜Q˜J\ÜÙ]Ë›[™İ
_H6*¶)ö,vã6+ˆ6*¶aöã6aÈ6«ö,¶)ö,v-ˆ	Û™]È]J
KÓØØ[Q]Tİš[™Ê	Ù˜KRT‰Ê_XK×KXY\œË‹‹˜\ÜÙ]Ë›X\

KJHOˆÛÛ[[œË›X\

ËÙ]JHOˆÙ]
KJJJWJNÂˆÛÛœİ\İHÖ][Ë™[˜ÛÙWØÛÛ
ÛÛ[[œË›[™İHJNÂˆÜÖÉÈ[Y\™Ù\É×HHŞÈÎˆÈˆÎˆKNˆÈˆÎˆÛÛ[[œË›[™İHHHKÈÎˆÈˆKÎˆKNˆÈˆKÎˆÛÛ[[œË›[™İHHHWNÂˆÜÖÉÈXÛÛÉ×HHÛÛ[[œË›X\

Û˜[YWJHOˆ
ÈØÚˆ˜[YHOOH	öo¶a6)öªIÈÈHˆ˜[YHOOH	öa¶)öaH6o¶,v,öa¶a	È˜[YHOOH	ö*¶b6-¶ã6+v)ö*‰ÈÈÌˆX]›X^
MK˜[YK›[™İ
ÈJHJJNÂˆÜÖÉÈ\›İÜÉ×HHŞÈˆÍÈKÈˆKÈˆLKÈˆÌWNÂˆÜÖÉÈX]]Ùš[\‰×HHÈ™YˆM‰Û\İIØ\ÜÙ]Ë›[™İ
ÈXNÂˆÜÖÉÈ]šY]ÜÉ×HHŞÈšYÚÓYˆYHWNÂˆ›Üˆ
]›İÈHÈ›İÈ\ÜÙ]Ë›[™İ
ÈÈ›İÊÊÊBˆ›Üˆ
]ÛÛHÈÛÛÛÛ[[œË›[™İÈÛÛ
ÊÊHÂˆÛÛœİÙ[HÜÖÖÖ][Ë™[˜ÛÙWØÙ[
Èˆ›İËÎˆÛÛJWNÂˆYˆ
XÙ[
BˆÛÛ[YNÂˆÙ[œÈHÈ›ÛˆÈ˜[YNˆ	Õ˜^š\›X]‰ËŞˆ›İÈOOHÈMÈˆLK›Ûˆ›İÈOOH›İÈOOHËÛÛÜˆÈ™Øˆ›İÈOOH›İÈOOHÈÈ	Ñ‘‘‘‘‘‰Èˆ	ÌŒÌÍ	ÈHKš[ˆÈ™ĞÛÛÜˆÈ™Øˆ›İÈOOHÈ	ÌÍPÍIÈˆ›İÈOOHÈÈ	ÌĞNIÈˆ›İÈ	HˆÈ	ÑŒIÈˆ	Ñ‘‘‘‘‘‰ÈHK[YÛ›Y[ˆÈÜš^›Û[ˆ›İÈÈ	ØÙ[\‰Èˆ	ÜšYÚ	Ë™\XØ[ˆ	ØÙ[\‰ÈHNÂˆBˆÛÛœİØˆHÖ][Ë˜›ÛÚ×Û™]Ê
NÂˆÖ][Ë˜›ÛÚ×Ø\[™ÜÚY]
Ø‹ÜË	öb6,ö)öã6a6a¶`¶a6ã6aÉÊNÂˆØ‹•ÛÜšØ›ÛÚÈHÈšY]ÜÎˆŞÈ•ˆYHWHNÂˆÖÜš]Qš[JØ‹6+¶-öã6)ö,Wöb6,ö)öã6aöa¶`¶a6ã6a×ÉØ\ÜÙ]Ë›[™İKŞ
NÂˆÙ]›İXÙJ6+¶,vb6+6ã6)öªv,öa	Ü˜Q˜J\ÜÙ]Ë›[™İ
_H6o¶,vb6a¶+öaÈ6(¶av)ö+öaÈ6-6+Ë˜
NÂˆBˆØ]Ú
JHÂˆÙ]\œ›ÜŠK›Y\ÜØYÙH	ö,ö)ö+¶*ˆ6+¶,vb6+6ã6)öªv,öa6a¶)öavb6`v`ˆ6*6b6+Ë‰ÊNÂˆBˆNÂˆÛÛœİÙÙÛTÙ[XİYHYOˆÙ]Ù[XİYYÊ™]ˆOˆ™]‹š[˜ÛY\ÊY
HÈ™]‹™š[\ŠOˆOOHY
HˆË‹‹œ™]‹YJNÂˆÛÛœİš[\™YYÈHš[\™Y›X\
HOˆKšY
K[š\ÚX›TÙ[XİYHš[\™YYË›[™İˆ	‰ˆš[\™YYË™]™\JYOˆÙ[XİYYËš[˜ÛY\ÊY
JNÂˆÛÛœİİX›Z]H\Ş[˜È
\›İ™Y
HOˆÈYˆ
Y]Z[Ø]š[™ÊBˆ™]\›ÈÛÛœİZ\ÜÚ[™ÈH\İ™š[\Š
ÚÙ^WJHOˆÚXÚÜÖÚÙ^WHOOH[™Yš[™Y
NÈYˆ
Z\ÜÚ[™Ë›[™İ
HÂˆÙ]\œ›ÜŠ	ö)ö*6*¶+ö)È6b6-¶.vã6*ˆ6*¶av)öaH6avb6)ö,v+È6¡¶ªx #6a6ã6,ö*ˆ6,v)È6*¶.vã6ã6aˆ6ªva¶ã6+Ë‰ÊNÂˆ™]\›ÂˆHYˆ
\›İ™Y	‰ˆ™Z™XİYÛİ[
HÂˆÙ]\œ›ÜŠ	ö*6,v)öã6*¶(öã6ã6+È6a¶aö)öã6ã6#6*¶av)öaH6avb6)ö,v+È6*6)öã6+È6*¶(öã6ã6+È6-6+öaÈ6*6)ö-6a¶+Ë‰ÊNÂˆ™]\›ÂˆHÙ]Ø]š[™ÊYJNÈÙ]\œ›ÜŠ	ÉÊNÈHÂˆ]ØZ]ÑS‘
	ÔÔÕ	Ë	ËÜ\œÛÛ›™[]™ZXÛKX\ÜÙ]ËœÛÜXÚXÚÛ\İ]™\šYIËÈ\ÜÙ]ÚYˆ]Z[šY\›İ™YÚXÚÜÎˆØš™Xİ™œ›ÛQ[šY\Ê\İ›X\

ÚÙ^WJHOˆÚÙ^KÈ˜[YNˆÚXÚÜÖÚÙ^WK›İNˆ	ÉÈWJJK›İHJNÂˆÙ]›İXÙJ\›İ™YÈ	öb6,öã6a6aÈ6*6)È6avb6`v`¶ã6*ˆ6*¶(öã6ã6+È6-6+Ë‰Èˆ	öo¶,vb6a¶+öaÈ6*6,v)öã6)ö-va6)ö+H6*6,v«ö-6*ˆ6+ö)ö+öaÈ6-6+Ë‰ÊNÂˆÛÜÙQ]Z[

NÂˆ]ØZ]ØY

NÂˆBˆØ]Ú
JHÂˆÙ]\œ›ÜŠK›Y\ÜØYÙH	ö*ö*6*ˆ6a¶*¶ã6+6aöe6¡¶ªx #6a6ã6,ö*ˆ6a¶)öavb6`v`ˆ6*6b6+Ë‰ÊNÂˆBˆš[˜[HÂˆÙ]Ø]š[™Ê˜[ÙJNÂˆHNÂˆ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ[™[YZ[‹]ÛÜšÜÜXÙK\YÙH˜KXÚXÚÛ\İ\YÙHˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KXÚXÚÛ\İZ\›ÈˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
šÈ‹[—LŒLŒÌWLŒÌWLŒÌ×LĞÈL—LNWLŒ×LLĞ×LŒÌ×LŒHLŒ‘WLLŒ‘—LŒÌWLLLWLLŒWLLŒÌWLŒÌ×LĞ×LNWLLŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
œ‹[—LWLŒÍLŒ‘WLŒÍWLŒ×LŒWLŒÈLWLŒ‘—LŒ×LŒÌWLNHLLŒÌ×LLŒ×LŒLˆLLŒÌ×LĞ×LLÈLŒÌWLŒÈLŒLŒLĞ×L—LĞ×LŒ‘ˆLL—LŒWLĞ×LŒ×L×LML×LŒÌHLWLLŒÌWLŒ‘ˆLŒÌWLŒÈLŒ—LŒLŒHLNWL—LĞ×LŒ‘‹ˆŠJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KXÚXÚÛ\İXÛİ[ˆKˆ˜J][\Ë›[™İ
Kˆˆ‹ˆ™XXİ˜Ü™X]Q[[Y[
œÛX[‹[—LÑWLŒÌWLL—LŒ‘—LÈŠJJKˆ›İXÙH	‰ˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆœ˜KXÚXÚÛ\İ[›İXÙH‹›ÛNˆœİ]\ÈˆK›İXÙJKˆ\œ›Üˆ	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆÛÜšÜÜXÙKZ[›[™KY\œ›Üˆ‹›ÛNˆ˜[\ˆKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹[\œ›ÜŠKˆY]Z[	‰ˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹È\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜ˆÈ‹ÛÛXÚÎˆØYK—LŒWLLŒ×LŒÍLŒ‘—LLŒLŒ×LŒÌWLÈŠJKˆY]Z[	‰ˆY]Z[ØY[™ÈÈ™XXİ˜Ü™X]Q[[Y[
™XXİ‘œ˜YÛY[[ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KXÚXÚÛ\İYš[\œÈˆKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹[ˆ—LŒ×LŒÌ×LŒWLŒ×LLŒ×LLĞÈLÑWLŒÌWLL—LŒ‘—LÈ‹ˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹\NˆœÙX\˜Ú‹XÙZÛ\ˆ—L—LŒ×LWLŒÈLÑWLLŒ×LNHLĞ×LŒÈLNWLŒ‘ˆLWLLĞÈ‹˜[YNˆKÛÚ[™ÙNˆHOˆÙ]JK\™Ù]˜[YJHJJKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹[ˆ—L—LLŒÎHLLŒÌ×LĞ×LLÈ‹ˆ™XXİ˜Ü™X]Q[[Y[
œÙ[Xİ‹ÈÛ\ÜÓ˜[YNˆš[œ]‹˜[YNˆİ]\ËÛÚ[™ÙNˆHOˆÙ]İ]\ÊK\™Ù]˜[YJHKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆ˜[ˆK—L×LWL×LMLLŒÌ×LŒ×LĞ×LŠKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆ˜Ø\ˆˆK—LŒ‘WLLŒ‘—LŒÌWLL×LŒÈŠKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆ›[İÜ˜ŞXÛHˆK—LWLLŒWLLŒÌWLŒÌ×LĞ×LNWLLŒWLŒ×L×LŒÈŠJJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹\Nˆ˜]Ûˆ‹\ØX›YˆØY[™ËÛÛXÚÎˆØYK—LŒLŒÌWLLŒÌ—LŒÌWLŒÌ×LŒ×L—LĞÈLWL×LŒÌWLŒÌ×LŒHŠJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KXÚXÚÛ\İYš[\œÈ‹İ[NˆÈX\™Ú[•Üˆ[YÛ’][\Îˆ	ØÙ[\‰ÈHKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹Èİ[NˆÈ\Ü^Nˆ	Ù›^	Ë[YÛ’][\Îˆ	ØÙ[\‰ËØ\ˆHKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹È\Nˆ˜ÚXÚØ›Ş‹ÚXÚÙYˆ[š\ÚX›TÙ[XİY\ØX›YˆYš[\™YYË›[™İÛÚ[™ÙNˆHOˆÙ]Ù[XİYYÊ™]ˆOˆK\™Ù]˜ÚXÚÙYÈ\œ˜^K™œ›ÛJ™]ÈÙ]
Ë‹‹œ™]‹‹‹™š[\™YY×JJHˆ™]‹™š[\ŠYOˆYš[\™YYËš[˜ÛY\ÊY
JJHJKˆ—LŒ×L—LŒWLŒ‘WLŒ×LŒL×LWLÈL—LŒWLŒ×LĞ×LŒÈLWLĞ×LLŒWLŒÌH
‹ˆ˜Jš[\™Y›[™İ
KˆŠHŠKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹\Nˆ˜]Ûˆ‹\ØX›YˆYš[\™Y›[™İØY[™ËÛÛXÚÎˆ

HOˆ^Ü™ZXÛ\Êš[\™Y
HKˆ—LŒ‘WLŒÌWLLŒ×LĞÈLŒ×LNWLŒÌ×LL—LŒWLŒ×LĞ×LŒÈ
‹ˆ˜Jš[\™Y›[™İ
KˆŠHŠKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹\Nˆ˜]Ûˆ‹\ØX›Yˆ\Ù[XİYYË›[™İÛÛXÚÎˆ

HOˆ^Ü™ZXÛ\Ê][\Ë™š[\ŠHOˆÙ[XİYYËš[˜ÛY\ÊKšY
JJHKˆ—LŒ‘WLŒÌWLLŒ×LĞÈLŒ×L—LŒWLŒ‘WLŒ×LŒLŒ×LŒÍLŒ‘—L×LŒ×L×LŒÈ
‹ˆ˜JÙ[XİYYË›[™İ
KˆŠHŠKˆÙ[XİYYË›[™İˆ	‰ˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹\Nˆ˜]Ûˆ‹ÛÛXÚÎˆ

HOˆÙ]Ù[XİYYÊ×JHK—LLŒĞWLLŒ×L—LŒWLŒ‘WLŒ×LŒŠJKˆØY[™ÈÈ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆœ˜KXÚXÚÛ\İY[\H‹›ÛNˆœİ]\ÈˆK—LŒ‘—LŒÌHLŒ‘LŒ×LLŒ‘—LŒÌWLĞ×LŒ×LWLŒHLÑWLŒÌWLL—LŒ‘—L×LŒ×L×LŒ×LŒˆŠHˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KXÚXÚÛ\İ[\İˆKˆš[\™Y›X\
\ÜÙ]Oˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÙ^Nˆ\ÜÙ]šYÛ\ÜÓ˜[YNˆœ˜KXÚXÚÛ\İZ][H‹İ[NˆÈ\Ü^Nˆ	Ù›^	Ë[YÛ’][\Îˆ	ØÙ[\‰ËØ\ˆL‹›^Ü˜\ˆ	İÜ˜\	ÈHKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹È\Nˆ˜ÚXÚØ›Ş‹˜\šXK[X™[ˆ	ö)öa¶*¶+¶)ö*	È
È˜T]J\ÜÙ]
KÚXÚÙYˆÙ[XİYYËš[˜ÛY\Ê\ÜÙ]šY
KÛÚ[™ÙNˆ

HOˆÙÙÛTÙ[XİY
\ÜÙ]šY
HJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹È\Nˆ˜]Ûˆ‹ÛÛXÚÎˆ

HOˆÜ[Š\ÜÙ]
Kİ[NˆÈ›^ˆKZ[•ÚYˆNL\Ü^Nˆ	Ù›^	Ë[YÛ’][\Îˆ	ØÙ[\‰ËØ\ˆL‹\İYPÛÛ[ˆ	ÜÜXÙKX™]ÙY[‰Ë›^Ü˜\ˆ	İÜ˜\	Ë›Ü™\ˆ˜XÚÙÜ›İ[™ˆ	İ˜[œÜ\™[	Ë^[YÛˆ	ÜšYÚ	Ëİ\œÛÜˆ	ÜÚ[\‰ËÛÛÜˆ	Ú[š\š]	ÈHKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈ\Ü^Nˆ	ÙÜšY	ËØ\ˆˆHKˆ™XXİ˜Ü™X]Q[[Y[
T]KÈ\ÜÙ]ˆ\ÜÙ]JKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹[ˆ\ÜÙ]™š\œİÛ˜[YKˆˆ‹ˆ\ÜÙ]›\İÛ˜[YJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈ\Ü^Nˆ	ÙÜšY	ËØ\ˆHHKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KXÚXÚÛ\İXÚ\ˆK\ÜÙ]˜\ÜÙ]İ\HOOH	ØØ\‰ÈÈ	ö+¶b6+ö,vb	Èˆ	öavb6*¶b6,v,öã6ªva6*‰ÊKˆ™XXİ˜Ü™X]Q[[Y[
œÛX[‹[ˆ˜Tİ]\Ê\ÜÙ]œİ]\ÊKˆˆLÈ‹ˆ\ÜÙ]˜ÚXÚÛ\İØÛİ[È˜J\ÜÙ]˜ÚXÚÛ\İØÛİ[
H
È	È6*6,v,v,öã	Èˆ	ö*6+öb6aˆ6,ö)ö*6`¶aÉÊJJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹È\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜ˆÈ‹ÛÛXÚÎˆ

HOˆ^Ü™ZXÛ\ÊØ\ÜÙ]JK˜\šXK[X™[ˆ	ö+¶,vb6+6ã6)öªv,öa	È
È˜T]J\ÜÙ]
HK—LŒ×LNWLŒÌ×LŠJJKˆYš[\™Y›[™İ	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KXÚXÚÛ\İY[\HˆK][\Ë›[™İÈ	öo¶,vb6a¶+öaø #6)öã6av-ö)ö*6`ˆ6+6,ö*¸ #6b6+6b6ã6-6av)È6ã6)ö`v*ˆ6a¶-6+Ë‰Èˆ	öaöa¶b6,ˆ6b6,öã6a6aø #6)öã6*6,v)öã6*6,v,v,öã6*ö*6*ˆ6a¶-6+öaÈ6)ö,ö*‹‰ÊJJHˆ]Z[ØY[™ÈÈ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KXÚXÚÛ\İY[\H‹›ÛNˆœİ]\ÈˆK—LŒ‘—LŒÌHLŒ‘LŒ×LLŒ‘—LŒÌWLĞ×LŒ×LWLŒHLŒ×LŒÌ—LŒ—LĞ×LŒ×LŒHLLWLŒ‘—LŒ×LŒÌWLNHLLŒÌ×LĞ×LL×LŒˆŠHˆ™XXİ˜Ü™X]Q[[Y[
™XXİ‘œ˜YÛY[[ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KXÚXÚÛ\İY]Z[ZXYˆKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹ÛÛXÚÎˆÛÜÙQ]Z[K—LŒLŒ×LŒÌ—LQ—LŒÍLŒHLŒLÈLWL×LŒÌWLŒÌ×LŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈ\Ü^Nˆ	ÙÜšY	ËØ\ˆHKˆ™XXİ˜Ü™X]Q[[Y[
T]KÈ\ÜÙ]ˆ]Z[JKˆ™XXİ˜Ü™X]Q[[Y[
œ‹[ˆ]Z[™š\œİÛ˜[YKˆˆ‹ˆ]Z[›\İÛ˜[YKˆˆLÈ‹ˆ˜Tİ]\Ê]Z[œİ]\ÊJJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹\Nˆ˜]Ûˆ‹ÛÛXÚÎˆ

HOˆ^Ü™ZXÛ\ÊÙ]Z[JHK—LŒ‘WLŒÌWLLŒ×LĞÈLŒ×LNWLŒÌ×LLŒ×LĞ×LˆLLŒÌ×LĞ×LLÈŠJKˆ™XXİ˜Ü™X]Q[[Y[
œÙXİ[Ûˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KXÚXÚÛ\İ\ÙXİ[ÛˆˆKˆ™XXİ˜Ü™X]Q[[Y[
š‹[—LWLŒÍLŒ‘WLŒÍWLŒ×LŒHLLWLŒ×LLNHLLŒÌ×LĞ×LLÈŠKˆ™XXİ˜Ü™X]Q[[Y[
QšY[ËÈNˆ]Z[JJKˆ™XXİ˜Ü™X]Q[[Y[
œÙXİ[Ûˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KXÚXÚÛ\İ\ÙXİ[ÛˆˆKˆ™XXİ˜Ü™X]Q[[Y[
š‹[—LŒWLŒÍWLŒ×LLĞ×LŒÌHLLWLŒ‘—LŒ×LŒÌWLNHŠKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KXÚXÚÛ\İ\İÜÈˆKˆ
]Z[œİÜÈ×JK›X\
İÈOˆ™XXİ˜Ü™X]Q[[Y[
™šYİ\™H‹ÈÙ^NˆİËœİ×ÚÙ^HKˆ™XXİ˜Ü™X]Q[[Y[
š[YÈ‹ÈÜ˜ÎˆİË™]Wİ\šK[ˆ	öav+ö,vªH	È
ÈİËœİ×ÚÙ^KØY[™Îˆ›^HˆJKˆ™XXİ˜Ü™X]Q[[Y[
™šYØØ\[Ûˆ‹[İËœİ×ÚÙ^JJJKˆJ]Z[œİÜÈ×JK›[™İ	‰ˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]YˆK—LWLŒ‘—LŒÌWLNWLĞÈLŒ—LŒLŒHL—LŒÍLŒ‘—LÈLŒ×LŒÌ×LŒKˆŠJJKˆ™XXİ˜Ü™X]Q[[Y[
œÙXİ[Ûˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KXÚXÚÛ\İ\ÙXİ[ÛˆˆKˆ™XXİ˜Ü™X]Q[[Y[
š‹[—LŒÌ×LLŒ×LŒLˆLŒLŒÌWLŒÌWLŒÌ×LĞÈŠKˆ™XXİ˜Ü™X]Q[[Y[
R\İÜKÈ\İÜNˆ]Z[˜ÚXÚÛ\İÚ\İÜH×HJJKˆ™XXİ˜Ü™X]Q[[Y[
œÙXİ[Ûˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KXÚXÚÛ\İ\ÙXİ[ÛˆˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KXÚXÚÛ\İ\›ÙÜ™\ÜÈˆKˆ™XXİ˜Ü™X]Q[[Y[
š‹[—LŒ×LŒÌWLŒÌ—LĞ×LŒ×LŒLĞÈL—LNWLŒ×LLĞ×LŒÌ×LŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹[ˆ˜JÚXÚÙYÛİ[
KˆˆLŒ×LŒÌˆ‹ˆ˜J\İ›[™İ
KˆˆLWLLŒÌWLŒ‘ˆLŒWLŒÎWLĞ×LĞ×LˆLŒWLNWLLĞ×LHLŒÍLŒ‘—LÈŠJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KXÚXÚÛ\İ\›İÜÈˆK\İ›X\

ÚÙ^K]WJHOˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KXÚXÚÛ\İ\›İÈ‹Ù^NˆÙ^HKˆ™XXİ˜Ü™X]Q[[Y[
œİ›Û™È‹[]JKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹È›ÛNˆ™Ü›İ\‹˜\šXK[X™[ˆ]HKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹È\Nˆ˜]Ûˆ‹˜\šXK\™\ÜÙYˆÚXÚÜÖÚÙ^WHOOHYKÛ\ÜÓ˜[YNˆ	Øˆ	È
È
ÚXÚÜÖÚÙ^WHOOHYHÈ	Ü	Èˆ	ÙÉÊK\ØX›YˆØ]š[™ËÛÛXÚÎˆ

HOˆÙ]ÚXÚÜÊİ\œ™[Oˆ
È‹‹˜İ\œ™[ÚÙ^WNˆYHJJHK—LŒWLŒŒ×LĞ×LĞ×LŒ‘ˆŠKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹È\Nˆ˜]Ûˆ‹˜\šXK\™\ÜÙYˆÚXÚÜÖÚÙ^WHOOH˜[ÙKÛ\ÜÓ˜[YNˆ	Øˆ	È
È
ÚXÚÜÖÚÙ^WHOOH˜[ÙHÈ	Ù	Èˆ	ÙÉÊK\ØX›YˆØ]š[™ËÛÛXÚÎˆ

HOˆÙ]ÚXÚÜÊİ\œ™[Oˆ
È‹‹˜İ\œ™[ÚÙ^WNˆ˜[ÙHJJHK—LŒÌWLŒ‘ˆŠJJJJKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆœ˜KXÚXÚÛ\İ[›İHˆKˆ—LŒWLLŒÍ—LĞ×LŒ‘LŒ×LŒHLŒLŒÌWLŒÌWLŒÌ×LĞÈ‹ˆ™XXİ˜Ü™X]Q[[Y[
^\™XH‹ÈÛ\ÜÓ˜[YNˆš[œ]‹›İÜÎˆŒÈ‹˜[YNˆ›İKÛÚ[™ÙNˆHOˆÙ]›İJK\™Ù]˜[YJKXÙZÛ\ˆ—LŒ‘—LŒÌHLŒÍWLLŒÌWLŒHL—LĞ×LŒ×LŒÌ—LŒÈLŒÎWLLŒHLŒÌWLŒ‘ˆLĞ×LŒÈLŒWLLŒÍ—LĞ×LŒ‘LŒ×LŒHLŒWLNWLWLĞ×LLĞÈLŒÌWLŒÈLŒL—LLĞ×LŒÌ×LĞ×LŒ‘—LŒˆˆJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ˜KXÚXÚÛ\İXXİ[ÛœÈˆKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹\ØX›YˆØ]š[™ÈÚXÚÙYÛİ[OOH\İ›[™İÛÛXÚÎˆ

HOˆİX›Z]
˜[ÙJHKØ]š[™ÈÈ	ö+ö,H6+v)öa6*ö*6*¸ )‰Èˆ	ö*6)ö,¶«ö-6*ˆ6*6,v)öã6)ö-va6)ö+IÊKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹\ØX›YˆØ]š[™ÈÚXÚÙYÛİ[OOH\İ›[™İ™Z™XİYÛİ[ˆÛÛXÚÎˆ

HOˆİX›Z]
YJHKØ]š[™ÈÈ	ö+ö,H6+v)öa6*ö*6*¸ )‰Èˆ	ö*¶(öã6ã6+È6a¶aö)öã6ã6b6,öã6a6aÉÊJJJJNÂŸB‹ÊˆĞÒÓÓÑT•’PÑHS“S‘HSÑSNˆ[™Y[ÈHØ[›ÛšXØ[[™[ÈTH[™Ú[È[˜Ú[™ÙYˆ
‹Â˜ÛÛœÛÛK›ÙÊ	ÔĞÒÓÓÑT•’PÑHQRSˆ•RSˆŒ‹LLLK]ŒIÊNÂŠ

HOˆÂˆÛÛœİÈHÈÚÙ[ˆ[›Ûİˆ[™XYNˆ˜[ÙKXØÙ\ÜÎˆ[NÂˆÛÛœİÜÜÈHØİ[Y[˜Ü™X]Q[[Y[
	Üİ[IÊNÂˆÜÜË^ÛÛ[H	ËœÜİ‹XÙ\Ü^N™›^Ø[YÛ‹Z][\Î˜Ù[\ÙØ\İÚYŒL	NÜY[™ÎŒLLœÛX\™Ú[Ø›Ü™\ŒØ›Ü™\‹\˜Y]\ÎŒLØ˜XÚÙÜ›İ[™˜[œÜ\™[ØÛÛÜš[š\š]Ù›ÛŒLÜ˜^š\›X]‹ZÛXNØİ\œÛÜœÚ[\İ^X[YÛœšYÚÙ\™Xİ[ÛœKœÜİ‹Xšİ™\Ø˜XÚÙÜ›İ[™ˆÙYYYŒŸKœÜİ‹\YÙKZÜİİÚYŒL	NØ›Ş\Ú^š[™Î˜›Ü™\‹X›ŞØ˜XÚÙÜ›İ[™ˆÙ™˜Ûİ™\™›İÎš\ÚX›NÜY[™ÎŒMœÙ\™Xİ[ÛœKœÜİ‹Z[›[™K\YÙ^İÚYŒL	NÛZ[‹ZZYÚŒL	NØ›Ş\Ú^š[™Î˜›Ü™\‹X›ŞKœÜİ‹Z[›[™K\YÙHœÜİ‹X›ŞİÚYŒL	NÛX^]ÚY››Û™NÚZYÚ˜]]ÎÛZ[‹ZZYÚ˜Ø[ÊLšHL
NØ›Ü™\‹\˜Y]\ÎŒMØ›Ş\ÚYİÎ››Û™_KœÜİ‹Z[›[™K\YÙHœÜİ‹X›Ù^Ûİ™\™›İÎš\ÚX›_KœÜİ‹[X\]Ü˜\Ù\Ü^N™ÜšYÙÜšY][\]KXÛÛ[[œÎ›Z[›X^
KŒÍYœŠHZ[›X^
ÍŒYœŠNÙØ\ŒLœØ[YÛ‹Z][\Îœİ™]ÚÛX\™Ú[‹X›İÛNŒLœKœÜİ‹[X\ÚZYÚLŒÛZ[‹ZZYÚŒØ›Ü™\‹\˜Y]\ÎŒMœÛİ™\™›İÎšY[Ø›Ü™\Œ\ÛÛYÙ™MYXØ˜XÚÙÜ›İ[™ˆÙYYŒÙŸKœÜİ‹[X\Z[™›ŞØ›Ü™\Œ\ÛÛYÙMNYNØ›Ü™\‹\˜Y]\ÎŒMØ˜XÚÙÜ›İ[™ˆÙ™™ÜY[™ÎŒLœÛİ™\™›İÎ˜]]ÎÛX^ZZYÚLŒKœÜİ‹\ØÚÛÛ\XÚŞÙ\Ü^N˜›ØÚÎİÚYŒL	NÜY[™Î\Ø›Ü™\Œ\ÛÛYÙMNYNØ›Ü™\‹\˜Y]\ÎŒLØ˜XÚÙÜ›İ[™ˆÙ™™ÛX\™Ú[‹X›İÛNÜØİ\œÛÜœÚ[\İ^X[YÛœšYÚÙ\™Xİ[ÛœÙ›ÛY˜[Z[N•˜^š\›X]‹ZÛX_KœÜİ‹\ØÚÛÛ\XÚÎšİ™\Ø›Ü™\‹XÛÛÜˆÌØMYØ˜XÚÙÜ›İ[™ˆÙŒY˜YŸKœÜİ‹[X\[YÙ[™Ù\Ü^N™›^ÙØ\ŒLÙ›^]Ü˜\Ü˜\ÛX\™Ú[‹X›İÛNŒLÙ›Û\Ú^™NŒL\KœÜİ‹[X\\İ]ÜY[™ÎLØ›Ü™\Œ\ÛÛYÙMNYNØ›Ü™\‹\˜Y]\ÎŒLØ˜XÚÙÜ›İ[™ˆÙ˜Y˜ŸKœÜİ‹[X\Y[\^Ù\Ü^N™›^Ø[YÛ‹Z][\Î˜Ù[\Ú\İYKXÛÛ[˜Ù[\ÚZYÚŒL	NØÛÛÜˆÍØNMÙ›ÛY˜[Z[N•˜^š\›X]‹ZÛX_KœÜİ‹X›ŞİÚY›Z[ŠLNMÊNÚZYÚ›Z[ŠŒLš
NØ˜XÚÙÜ›İ[™ˆÙ™™Ø›Ü™\‹\˜Y]\ÎŒNØ›Ş\ÚYİÎŒŒÌ™Ø˜JŒJNÙ\Ü^N™›^Ù›^Y\™Xİ[Û˜ÛÛ[[Ûİ™\™›İÎšY[Ù›ÛY˜[Z[N•˜^š\›X]‹ZÛX_KœÜİ‹ZXYÜY[™ÎŒMNØ˜XÚÙÜ›İ[™ˆÌØMYØÛÛÜˆÙ™™Ù\Ü^N™›^Ø[YÛ‹Z][\Î˜Ù[\Ú\İYKXÛÛ[œÜXÙKX™]ÙY[ŸKœÜİ‹]XœŞÙ\Ü^N™›^ÙØ\œÜY[™ÎŒLØ˜XÚÙÜ›İ[™ˆÙ™Ù›^]Ü˜\Ü˜\KœÜİ‹]XœÈ]ÛØ›Ü™\Œ\ÛÛYÙÙL™NØ˜XÚÙÜ›İ[™ˆÙ™™Ø›Ü™\‹\˜Y]\ÎŒLÜY[™ÎLœÙ›ÛY˜[Z[Nš[š\š]Øİ\œÛÜœÚ[\ŸKœÜİ‹]XœÈ]Û‹›ÛØ˜XÚÙÜ›İ[™ˆÌØMYØÛÛÜˆÙ™™ŸKœÜİ‹X›Ù^ÜY[™ÎŒMÛİ™\™›İÎ˜]]ßKœÜİ‹YÜšYÙ\Ü^N™ÜšYÙÜšY][\]KXÛÛ[[œÎœ™\X]
‹Z[›X^
YœŠJNÙØ\ŒLKœÜİ‹XØ\™Ø›Ü™\Œ\ÛÛYÙMNYNØ›Ü™\‹\˜Y]\ÎŒMÜY[™ÎŒLœØ˜XÚÙÜ›İ[™ˆÙ™™ŸKœÜİ‹Z[œ]İÚYŒL	NØ›Ş\Ú^š[™Î˜›Ü™\‹X›ŞØ›Ü™\Œ\ÛÛYÙYLMÎØ›Ü™\‹\˜Y]\ÎŒLÜY[™Î\Ù›ÛY˜[Z[Nš[š\š]KœÜİ‹]X›^İÚYŒL	NØ›Ü™\‹XÛÛ\ÙN˜ÛÛ\ÙNÙ›Û\Ú^™NŒLœKœÜİ‹]X›HœÜİ‹]X›HØ›Ü™\‹X›İÛNŒ\ÛÛYÙYŒŒÎÜY[™Îİ^X[YÛœšYÚİ™\XØ[X[YÛÜKœÜİ‹]X›HØ˜XÚÙÜ›İ[™ˆÙ˜Y˜ŸKœÜİ‹Y›Ü›K[[Ù[ÜÜÚ][Û™š^YÚ[œÙ]ŒØ˜XÚÙÜ›İ[™œ™Ø˜JMKŒË‹
NŞ‹Z[™^ŒLÙ\Ü^N™›^Ø[YÛ‹Z][\Î˜Ù[\Ú\İYKXÛÛ[˜Ù[\ÜY[™ÎŒŒKœÜİ‹Y›Ü›KX›ŞİÚY›Z[ŠÌŒMÊNÛX^ZZYÚLšØ˜XÚÙÜ›İ[™ˆÙ™™Ø›Ü™\‹\˜Y]\ÎŒNØ›Ş\ÚYİÎŒŒŒ™Ø˜JŒŠNÛİ™\™›İÎšY[ŸKœÜİ‹Y›Ü›KZXYÙ\Ü^N™›^Ø[YÛ‹Z][\Î˜Ù[\Ú\İYKXÛÛ[œÜXÙKX™]ÙY[Ø˜XÚÙÜ›İ[™ˆÌØMYØÛÛÜˆÙ™™ÜY[™ÎŒLÜMœKœÜİ‹Y›Ü›KX›Ù^ÜY[™ÎŒMœÛİ™\™›İÎ˜]]ßKœÜİ‹Y›Ü›KY›ÛİÙ\Ü^N™›^ÙØ\Ú\İYKXÛÛ[™›^\İ\ÜY[™ÎŒLœMœØ›Ü™\‹]ÜŒ\ÛÛYÙYŒŒßKœÜİ‹Y›Ü›KYÜšYÙ\Ü^N™ÜšYÙÜšY][\]KXÛÛ[[œÎœ™\X]
‹Z[›X^
YœŠJNÙØ\ŒLœKœÜİ‹Y›Ü›KYÜšYX™[Ù\Ü^N™›^Ù›^Y\™Xİ[Û˜ÛÛ[[ÙØ\\Ù›Û\Ú^™NŒLœKœÜİ‹Y›Ü›KY›Ûİ]ÛØ›Ü™\ŒØ›Ü™\‹\˜Y]\ÎŒLÜY[™Î\MœØ˜XÚÙÜ›İ[™ˆÌØMYØÛÛÜˆÙ™™Ù›ÛY˜[Z[Nš[š\š]Øİ\œÛÜœÚ[\ŸKœÜİ‹Y›Ü›KY›Ûİ]Û‹˜[Ø˜XÚÙÜ›İ[™ˆÙYYŒ™NØÛÛÜˆÌŒÌŒÎKœÜİ‹XÛÜÙ^Ø›Ü™\ŒØ˜XÚÙÜ›İ[™œ™Ø˜JMKMKMKŒMJNØÛÛÜˆÙ™™Ø›Ü™\‹\˜Y]\ÎÜY[™ÎÜL\Øİ\œÛÜœÚ[\ŸKœÜİ‹XXİ[ÛœŞÙ\Ü^N™›^ÙØ\Ù›^]Ü˜\Ü˜\ÛX\™Ú[ŒLKœÜİ‹XXİ[ÛœÈ]ÛØ›Ü™\ŒØ›Ü™\‹\˜Y]\ÎŒLÜY[™Î\LÜØ˜XÚÙÜ›İ[™ˆÌØMYØÛÛÜˆÙ™™Ù›ÛY˜[Z[Nš[š\š]Øİ\œÛÜœÚ[\ŸKœÜİ‹XXİ[ÛœÈ]Û‹˜[Ø˜XÚÙÜ›İ[™ˆÙYYŒ™NØÛÛÜˆÌŒÌŒÎKœÜİ‹\YÙ\Ù\Ü^N™›^Ø[YÛ‹Z][\Î˜Ù[\Ú\İYKXÛÛ[˜Ù[\ÙØ\ŒLœÜY[™ÎŒLœKœÜİ‹\YÙ\ˆ]ÛØ›Ü™\ŒØ›Ü™\‹\˜Y]\Î\ÜY[™ÎÜLÜØ˜XÚÙÜ›İ[™ˆÙYYŒ™NØÛÛÜˆÌŒÌŒÎØİ\œÛÜœÚ[\ŸKœÜİ‹\YÙ\ˆ]Û™\ØX›YÛÜXÚ]N‹NØİ\œÛÜ››İX[İÙYKœÜİ‹XÚ\Ù\Ü^Nš[›[™KY›^Ø[YÛ‹Z][\Î˜Ù[\ÙØ\ÜY[™ÎÜLØ›Ü™\Œ\ÛÛYÙL™MÙXÎØ›Ü™\‹\˜Y]\ÎŒNÛX\™Ú[Ø˜XÚÙÜ›İ[™ˆÙ˜Y˜ŸKœÜİ‹XÚ\]ÛØ›Ü™\ŒØ˜XÚÙÜ›İ[™˜[œÜ\™[ØÛÛÜˆÎXLØŒØØİ\œÛÜœÚ[\ŸKœÜİ‹[\ÙŞÜY[™ÎŒLØ›Ü™\‹\˜Y]\ÎŒLØ˜XÚÙÜ›İ[™ˆÙÙ˜YÛX\™Ú[KœÜİ‹Yš[^Ù\Ü^N››Û™_KœÜİ‹\›İËXXİ[ÛœŞÙ\Ü^N™›^Ø[YÛ‹Z][\Î˜Ù[\ÙØ\œÙ›^]Ü˜\Ü˜\KœÜİ‹\›İËXØ›Ü™\Œ\ÛÛYÙÙL™NØ˜XÚÙÜ›İ[™ˆÙ™™ØÛÛÜˆÌÍMØ›Ü™\‹\˜Y]\ÎÜY[™ÎœLÙ›ÛŒL\˜^š\›X]‹ZÛXNØİ\œÛÜœÚ[\Û[™KZZYÚŒKKœÜİ‹\›İËXšİ™\Ø˜XÚÙÜ›İ[™ˆÙØ›Ü™\‹XÛÛÜˆÌØMYØÛÛÜˆÌØMYŸKœÜİ‹\›İËX‹œš[X\^Ø˜XÚÙÜ›İ[™ˆÌØMYØ›Ü™\‹XÛÛÜˆÌØMYØÛÛÜˆÙ™™ŸKœÜİ‹\›İËX‹™[™Ù\ØÛÛÜˆØŒÌNØ›Ü™\‹XÛÛÜˆÙŒÎXÍ_KœÜİ‹\›İËX‹™[™Ù\šİ™\Ø˜XÚÙÜ›İ[™ˆÙ™™ŒØ›Ü™\‹XÛÛÜˆÙL™ŒØÛÛÜˆØŒÌNKœÜİ‹Y]Z[YÜšYÙ\Ü^N™ÜšYÙÜšY][\]KXÛÛ[[œÎœ™\X]
‹Z[›X^
YœŠJNÙØ\ŒLKœÜİ‹Y]Z[Z][^ÜY[™ÎŒLØ›Ü™\Œ\ÛÛYÙYŒŒÎØ›Ü™\‹\˜Y]\ÎŒLØ˜XÚÙÜ›İ[™ˆÙ˜Y˜™˜ßKœÜİ‹Y]Z[Z][HÛX[Ù\Ü^N˜›ØÚÎØÛÛÜˆÍÌNÙ›Û\Ú^™NŒLÛX\™Ú[‹X›İÛNKœÜİ‹Y]Z[Z][HÙ›Û\Ú^™NŒLœPYYXJX^]ÚYÌ
^ËœÜİ‹Y]Z[YÜšYÙÜšY][\]KXÛÛ[[œÎŒYœŸ_PYYXJX^]ÚY
^ËœÜİ‹YÜšYÙÜšY][\]KXÛÛ[[œÎŒYœŸKœÜİ‹X›ŞÚZYÚMš_IÎÂˆØİ[Y[šXY˜\[™Ú[
ÜÜÊNÂˆÜÜË^ÛÛ[
ÏHœÜİ‹Y\ÚÙ\Ü^N™›^Ù›^Y\™Xİ[Û˜ÛÛ[[ÙØ\ŒMKœÜİ‹Y\ÚZXYÙ\Ü^N™›^Ú\İYKXÛÛ[œÜXÙKX™]ÙY[Ø[YÛ‹Z][\Î˜Ù[\ÙØ\ŒLœÜY[™ÎŒMœNØ›Ü™\Œ\ÛÛYÙLÙNYNØ›Ü™\‹\˜Y]\ÎŒMœØ˜XÚÙÜ›İ[™›[™X\‹YÜ˜YY[
LÍYYËÌØMY‹ÌL™NŠNØÛÛÜˆÙ™™ŸKœÜİ‹Y\ÚZXYÛX\™Ú[ŒÙ›Û\Ú^™NŒN\KœÜİ‹Y\ÚZXYÛX\™Ú[\ÛÜXÚ]N‹NÙ›Û\Ú^™NŒL\KœÜİ‹Y\Ú\™Yœ™\ÚØ›Ü™\Œ\ÛÛY™Ø˜JMKMKMKŒÊNØ˜XÚÙÜ›İ[™œ™Ø˜JMKMKMKŒLŠNØÛÛÜˆÙ™™Ø›Ü™\‹\˜Y]\ÎŒLÜY[™Î\LÜÙ›ÛY˜[Z[Nš[š\š]Øİ\œÛÜœÚ[\ŸKœÜİ‹ZÜ\ŞÙ\Ü^N™ÜšYÙÜšY][\]KXÛÛ[[œÎœ™\X]
KZ[›X^
YœŠJNÙØ\ŒLKœÜİ‹ZÜ^Ø›Ü™\Œ\ÛÛYÙMNYNØ›Ü™\‹\˜Y]\ÎŒMØ˜XÚÙÜ›İ[™ˆÙ™™ÜY[™ÎŒMØ›Ş\ÚYİÎŒœ™Ø˜JMKŒË‹Œ
_KœÜİ‹ZÜHÛX[Ù\Ü^N˜›ØÚÎØÛÛÜˆÍÍÎÎMNÙ›Û\Ú^™NŒL\KœÜİ‹ZÜHİ›Û™ŞÙ\Ü^N˜›ØÚÎÙ›Û\Ú^™NŒ\ÛX\™Ú[‹]ÜœKœÜİ‹ZÜHÜ[Ù\Ü^N˜›ØÚÎØÛÛÜˆÌØMYÙ›Û\Ú^™NŒLÛX\™Ú[‹]ÜKœÜİ‹XÚ\YÜšYÙ\Ü^N™ÜšYÙÜšY][\]KXÛÛ[[œÎœ™\X]
‹Z[›X^
YœŠJNÙØ\ŒLœKœÜİ‹XÚ\XØ\™Ø›Ü™\Œ\ÛÛYÙMNYNØ›Ü™\‹\˜Y]\ÎŒMØ˜XÚÙÜ›İ[™ˆÙ™™ÜY[™ÎŒMÛZ[‹]ÚYŒKœÜİ‹XÚ\XØ\™ŞÛX\™Ú[ŒLœÙ›Û\Ú^™NŒLÜKœÜİ‹X˜\œŞÙ\Ü^N™›^Ù›^Y\™Xİ[Û˜ÛÛ[[ÙØ\KœÜİ‹X˜\‹\›İŞÙ\Ü^N™ÜšYÙÜšY][\]KXÛÛ[[œÎ›Z[›X^
LYœŠH™œˆœØ[YÛ‹Z][\Î˜Ù[\ÙØ\Ù›Û\Ú^™NŒL\KœÜİ‹X˜\‹[X™[Ûİ™\™›İÎšY[İ^[İ™\™›İÎ™[\Ú\ÎİÚ]K\ÜXÙN››İÜ˜\KœÜİ‹X˜\‹]˜XÚŞÚZYÚ\Ø˜XÚÙÜ›İ[™ˆÙYŒYØ›Ü™\‹\˜Y]\ÎN\Ûİ™\™›İÎšY[ŸKœÜİ‹X˜\‹Yš[ÚZYÚŒL	NØ˜XÚÙÜ›İ[™ˆÌØMYØ›Ü™\‹\˜Y]\ÎN\KœÜİ‹X˜\‹]˜[Y^İ^X[YÛ›YÙ›Û]ÙZYÚÌKœÜİ‹]™[™Ù\Ü^N™›^Ø[YÛ‹Z][\Î™›^Y[™ÙØ\œÚZYÚŒNÜY[™ÎŒLØ›Ü™\‹X›İÛNŒ\ÛÛYÙYŒŒÎÛİ™\™›İË^˜]]ÎÛZ[‹]ÚYŒKœÜİ‹]™[™XÛÛÙ›^ŒÙ\Ü^N™›^Ù›^Y\™Xİ[Û˜ÛÛ[[Ø[YÛ‹Z][\Î˜Ù[\Ú\İYKXÛÛ[™›^Y[™ÚZYÚŒL	NÙØ\œKœÜİ‹]™[™X˜\İÚY›Z[ŠœÌ	JNÛZ[‹ZZYÚŒÜØ˜XÚÙÜ›İ[™ˆÌL™NØ›Ü™\‹\˜Y]\ÎÜÜœœKœÜİ‹]™[™XÛÛÛX[Ù›Û\Ú^™N\ØÛÛÜˆÍØÎMKœÜİ‹]™[™XÛÛÙ›Û\Ú^™NŒLKœÜİ‹YÛ]]Ü˜\Ù\Ü^N™›^Ø[YÛ‹Z][\Î˜Ù[\Ú\İYKXÛÛ[˜Ù[\ÙØ\ŒŒÛZ[‹ZZYÚŒNKœÜİ‹YÛ]İÚYŒMœÚZYÚŒMœØ›Ü™\‹\˜Y]\ÎL	NÜÜÚ][Ûœ™[]]™_KœÜİ‹YÛ]˜Y\ØÛÛ[ˆˆÜÜÚ][Û˜XœÛÛ]NÚ[œÙ]ŒØ›Ü™\‹\˜Y]\ÎL	NØ˜XÚÙÜ›İ[™ˆÙ™™ŸKœÜİ‹[YÙ[™Ù\Ü^N™›^Ù›^Y\™Xİ[Û˜ÛÛ[[ÙØ\Ù›Û\Ú^™NŒL\KœÜİ‹[YÙ[™^Ù\Ü^Nš[›[™KX›ØÚÎİÚY\ÚZYÚ\Ø›Ü™\‹\˜Y]\ÎŒÜÛX\™Ú[‹[YœKœÜİ‹Y[\KXÚ\ÜY[™ÎLİ^X[YÛ˜Ù[\ØÛÛÜˆÎNMXLÎÙ›Û\Ú^™NŒLœPYYXJX^]ÚYŒLL
^ËœÜİ‹ZÜ\ŞÙÜšY][\]KXÛÛ[[œÎœ™\X]
ËZ[›X^
YœŠJ__PYYXJX^]ÚY
^ËœÜİ‹XÚ\YÜšYÙÜšY][\]KXÛÛ[[œÎŒYœŸKœÜİ‹ZÜ\ŞÙÜšY][\]KXÛÛ[[œÎœ™\X]
‹Z[›X^
YœŠJ_KœÜİ‹Y\ÚZXYØ[YÛ‹Z][\Î™›^\İ\Ù›^Y\™Xİ[Û˜ÛÛ[[Ÿ_XÂˆ[˜İ[ÛˆØ\\™J
HÈÛÛœİÛHÚ[™İË™™]ÚÈYˆ
Ú[™İË—×ÜÜİ‘™]Ú
Bˆ™]\›ÈÚ[™İË—×ÜÜİ‘™]ÚHYNÈÚ[™İË™™]ÚH[˜İ[Ûˆ
[œ][š]
HÈHÂˆÛÛœİH[š]	‰ˆ[š]šXY\œÎÂˆYˆ

HÂˆYˆ
[œİ[˜Ù[ÙˆXY\œÊBˆËÚÙ[ˆH™Ù]
	Ğ]]Üš^˜][Û‰ÊHËÚÙ[Âˆ[ÙBˆËÚÙ[ˆH]]Üš^˜][Ûˆ˜]]Üš^˜][ÛˆËÚÙ[ÂˆBˆBˆØ]Ú
ÊHÈH™]\›ˆÛ˜\J\Ë\™İ[Y[ÊNÈNÈBˆØ\\™J
NÂˆ[˜İ[Ûˆ›Ûİİ˜\]]ÚÙ[Š
HÈ˜\ˆØKØÈHÂˆYˆ
ËÚÙ[ŠBˆ™]\›ÂˆÛÛœİÙ^\ÈH×NÂˆ›Üˆ
]HHÈHØØ[İÜ˜YÙK›[™İÈJÊÊHÂˆÛÛœİÈHØØ[İÜ˜YÙKšÙ^JJH	ÉÎÂˆYˆ
İÚÙ[ŸXØÙ\Üß]]ÚK\İ
ÊJBˆÙ^\Ëœ\Ú
ÊNÂˆBˆ›Üˆ
ÛÛœİÈÙˆÙ^\ÊHÂˆÛÛœİˆHØØ[İÜ˜YÙK™Ù]][JÊNÂˆYˆ
]ŠBˆÛÛ[YNÂˆHÂˆÛÛœİˆH”ÓÓ‹œ\œÙJŠNÂˆÛÛœİH
ˆOOH[ˆOOH›ÚYÈ›ÚYˆ‹˜XØÙ\ÜÊH
ˆOOH[ˆOOH›ÚYÈ›ÚYˆ‹˜XØÙ\Ü×İÚÙ[ŠH
ˆOOH[ˆOOH›ÚYÈ›ÚYˆ‹ÚÙ[ŠH

ØHHˆOOH[ˆOOH›ÚYÈ›ÚYˆ‹™]JHOOH[ØHOOH›ÚYÈ›ÚYˆØK˜XØÙ\ÜÊH

ØˆHˆOOH[ˆOOH›ÚYÈ›ÚYˆ‹™]JHOOH[ØˆOOH›ÚYÈ›ÚYˆØ‹ÚÙ[ŠNÂˆYˆ

HÂˆËÚÙ[ˆHİš[™Ê
Kœİ\ÕÚ]
	Ğ™X\™\ˆ	ÊHÈİš[™Ê
Hˆ	Ğ™X\™\ˆ	È
ÈÂˆ™]\›ÂˆBˆBˆØ]Ú
ÊHÈBˆYˆ
×™X\™\—ÊËÚK\İ
ŠH‹›[™İˆŒ
HÂˆËÚÙ[ˆH×™X\™\—ÊËÚK\İ
ŠHÈˆˆ	Ğ™X\™\ˆ	È
ÈÂˆ™]\›ÂˆBˆBˆBˆØ]Ú
ÊHÈHBˆ\Ş[˜È[˜İ[Ûˆ\J]ÜHßJHÈ›Ûİİ˜\]]ÚÙ[Š
NÈÛÛœİHØš™Xİ˜\ÜÚYÛŠßKÜšXY\œÈßJNÈYˆ
ËÚÙ[ŠBˆ]]Üš^˜][ÛˆHËÚÙ[ÈÛÛœİ™\HHØš™Xİ˜\ÜÚYÛŠßKÜÈXY\œÎˆØXÚNˆ	Û›Ë\İÜ™IËÜ™Y[X[Îˆ	Ú[˜ÛYIÈJNÈYˆ
™\K˜›ÙH	‰ˆ\[Ùˆ™\K˜›ÙHOOH	ÛØš™Xİ	È	‰ˆJ™\K˜›ÙH[œİ[˜Ù[Ùˆ›Ü›Q]JH	‰ˆJ™\K˜›ÙH[œİ[˜Ù[Ùˆ›ØŠH	‰ˆJ™\K˜›ÙH[œİ[˜Ù[ÙˆT“ÙX\˜Ú\˜[\ÊH	‰ˆJ™\K˜›ÙH[œİ[˜Ù[Ùˆ\œ˜^PY™™\ŠJHÂˆ™\K˜›ÙHH”ÓÓ‹œİš[™ÚYJ™\K˜›ÙJNÂˆYˆ
SØš™XİšÙ^\Ê
KœÛÛYJÈOˆËÓİÙ\Ø\ÙJ
HOOH	ØÛÛ[]\IÊJBˆÉĞÛÛ[U\I×HH	Ø\XØ][Û‹ÚœÛÛ‰ÎÂˆHÛÛœİˆH]ØZ]™]Ú
]™\JNÈÛÛœİH]ØZ]‹^

NÈ]HßNÈHÂˆHÈ”ÓÓ‹œ\œÙJ
HˆßNÂˆBˆØ]Ú
ÊHÂˆ›İÈ\œ›ÜŠ	öo¶)ö,ö+ˆ6a¶)öav.v*¶*6,H6)ö,ˆ6,ö,vb6,IÊNÂˆHÈYˆ
\‹›ÚÊBˆ›İÈ\œ›ÜŠ™\œ›Üˆ	ö+¶-ö)öã6,ö,vb6,IÊNÈ™]\›ˆÈBˆ[˜İ[Ûˆ\ØÊŠHÈ™]\›ˆİš[™ÊˆOOH[	‰ˆˆOOH›ÚYÈˆˆ	ÉÊKœ™\XÙJÖÉˆ‰×KÙËHOˆ
È	É‰Îˆ	É˜[\ÉË	Ï	Îˆ	É›ÉË	Ï‰Îˆ	É™İÉË	È‰Îˆ	Éœ][İÉË‰Èˆ	ÉˆÌÎNÉÈVÛWJJNÈBˆ[˜İ[ÛˆÜİ”ÚİÒ[œÜXİ[ÛŠY
HÂˆ\J	ËØ\KÜØÚÛÛ\Ù\šXÙKÚ[œÜXİ[ÛœËÉÈ
ÈY
K[ŠˆOˆÂˆÛÛœİš[Û][ÛœÈH
‹š[Û][ÛœÈ×JK™š[\ŠˆOˆZ\ĞÙ\YšXØ]Uš[Û][ÛŠ‹]HŠJK›X\
ˆOˆ\[ÙˆˆOOH	Üİš[™ÉÈÈˆˆ‹]JK™š[\Š›ÛÛX[ŠNÂˆÛÛœİİÜÈH
‹œİÜÈ×JK™š[\ŠOˆ	‰ˆ™š[WÜ]
NÂˆÛÛœİ[H	Ï]ˆÛ\ÜÏHœÜİ‹Y]Z[YÜšY‰È
Âˆ	Ï]ˆÛ\ÜÏHœÜİ‹Y]Z[Z][HÛX[¶*6)ö,¶,v,È6*ö*6*¸ #6ªva¶a¶+öaÏÜÛX[‰È
È\ØÊ‹š[œÜXİÜ—Û˜[YH	öa¶)öav-6+¶-IÊH
È	ÏØ]ˆİ[OH™›Û\Ú^™NŒLØÛÛÜˆÍÌNÛX\™Ú[‹]ÜŒÜ‰È
È\ØÊ‹š[œÜXİÜ—Ü›ÛH	ÉÊH
È	ÏÙ]Ù]‰È
Âˆ	Ï]ˆÛ\ÜÏHœÜİ‹Y]Z[Z][HÛX[¶*¶)ö,vã6+ˆ6b6,ö)ö.v*ˆ6*6)ö,¶+öã6+ÏÜÛX[‰È
ÈÜİ’˜[[Q]J‹š[Û][Û—Ù]JH
È	È	È
È\ØÊ‹š[Û][Û—İ[YH	ÉÊH
È	ÏØÙ]‰È
Âˆ	Ï]ˆÛ\ÜÏHœÜİ‹Y]Z[Z][HÛX[¶a¶)ö+vã6aÈ6(¶avb6,¶-6ãÜÛX[‰È
È\ØÊ‹™YXØ][Û˜[Ù\İšXİ	öa¶)öav-6+¶-IÊH
È	ÏØÙ]‰È
Âˆ	Ï]ˆÛ\ÜÏHœÜİ‹Y]Z[Z][HÛX[¶av+ö,v,öaÏÜÛX[‰È
È\ØÊ‹œØÚÛÛÛ˜[YH	öa¶)öav-6+¶-IÊH
È	ÏØÙ]‰È
Âˆ	Ï]ˆÛ\ÜÏHœÜİ‹Y]Z[Z][HÛX[¶-6,vªv*ˆ6av+6,vãÜÛX[‰È
È\ØÊ‹˜ÛÛ\[WÛ˜[YH	öa¶)öav-6+¶-IÊH
È	ÏØÙ]‰È
Âˆ	Ï]ˆÛ\ÜÏHœÜİ‹Y]Z[Z][HÛX[¶o¶a6)öªOÜÛX[‰È
ÈÜİ’\˜[”]JŠH
È	ÏØÙ]‰È
Âˆ	Ï]ˆÛ\ÜÏHœÜİ‹Y]Z[Z][HÛX[¶a¶b6.H6b6,va¶«È6+¶b6+ö,vbÜÛX[‰È
È\ØÊ
‹™ZXÛWİ\H	ø %	ÊH
È	ÈÈ	È
È
‹™ZXÛWØÛÛÜˆ	ø %	ÊJH
È	ÏØÙ]‰È
Âˆ	Ï]ˆÛ\ÜÏHœÜİ‹Y]Z[Z][HÛX[¶,v)öa¶a¶+öaÈÈ6«öb6)öaöãÜÛX[‰È
È\ØÊ
‹™š]™\—ÙÙ[™\ˆ	ø %	ÊH
È	ÈÈ	È
È
‹˜Ù\YšXØ]WÜİ]\È	ø %	ÊJH
È	ÏØÙ]‰È
Âˆ	Ï]ˆÛ\ÜÏHœÜİ‹Y]Z[Z][HÛX[¶,ö,va¶-6ã6aˆ6+6a6bÈ6.v`¶*È6av+6avb6.OÜÛX[‰È
ÈÜİ‘˜J‹œ\ÜÙ[™Ù\—Ùœ›ÛØÛİ[
H
È	ÈÈ	È
ÈÜİ‘˜J‹œ\ÜÙ[™Ù\—Ü™X\—ØÛİ[
H
È	ÈÈ	È
ÈÜİ‘˜J‹œ\ÜÙ[™Ù\—ØÛİ[
H
È	ÏØÙ]‰È
Âˆ	Ï]ˆÛ\ÜÏHœÜİ‹Y]Z[Z][HÛX[¶*¶+¶a6`v)ö*ˆ6*ö*6*¸ #6-6+öaÏÜÛX[‰È
È\ØÊš[Û][ÛœËš›Ú[Š	ö#	ÊH	ö*6+öb6aˆ6avb6,v+È6*ö*6*¸ #6-6+öaÉÊH
È	ÏØÙ]‰È
Âˆ	Ï]ˆÛ\ÜÏHœÜİ‹Y]Z[Z][Hˆİ[OH™ÜšYXÛÛ[[ŒKËLHÛX[¶av+va6*6)ö,¶+öã6+ÏÜÛX[‰È
È\ØÊ‹›ØØ][Û—İ^	öa¶)öav-6+¶-IÊH
È	ÏØÙ]‰È
Âˆ	Ï]ˆÛ\ÜÏHœÜİ‹Y]Z[Z][Hˆİ[OH™ÜšYXÛÛ[[ŒKËLHÛX[¶*¶b6-¶ã6+v)ö*ÜÛX[‰È
È\ØÊ‹™\ØÜš\[Ûˆ	ø %	ÊH
È	ÏØÙ]‰È
Âˆ	ÏÙ]‰È
Âˆ
İÜË›[™İÈ	Ï]ˆİ[OH›X\™Ú[‹]ÜŒMİ[OH›X\™Ú[Œ¶*¶-v)öb6ã6,H6*6)ö,¶+öã6+È6b6*6)ö,¶,v,öãÚ]ˆİ[OH™\Ü^N™ÜšYÙÜšY][\]KXÛÛ[[œÎœ™\X]
]]ËYš]Z[›X^
ŒŒYœŠJNÙØ\ŒL‰È
ÈİÜË›X\

JHOˆ	ÏšYİ\™Hİ[OH›X\™Ú[ŒØ›Ü™\Œ\ÛÛYÙMNYNØ›Ü™\‹\˜Y]\ÎŒLœÛİ™\™›İÎšY[Ø˜XÚÙÜ›İ[™ˆÙ˜Y˜ˆ[YÈÜ˜ÏH‰È
È\ØÊ™š[WÜ]
H
È	Èˆ[H¶*¶-vb6ã6,H6*6)ö,¶+öã6+È	È
È
H
ÈJH
È	Èˆİ[OH™\Ü^N˜›ØÚÎİÚYŒL	NÛX^ZZYÚŒÍŒÛØš™XİYš]˜ÛÛZ[Ø˜XÚÙÜ›İ[™ˆÙŒ™ÈˆÛ™\œ›ÜH\Ëœİ[K™\Ü^OW	Û›Û™W	Îİ\Ë›™^[[Y[ÚX›[™Ëœİ[K™\Ü^OW	Ø›ØÚ×	ÈšYØØ\[Ûˆİ[OH™\Ü^N››Û™NÜY[™ÎŒLœØÛÛÜˆØŒÌNÙ›Û\Ú^™NŒL\¶*¶-vb6ã6,H6)ö,ˆ6av,öã6,H6,6+¶ã6,vaø #6-6+öaÈ6`¶)ö*6a6*6)ö,v«ö,6)ö,vã6a¶ã6,ö*‹ÙšYØØ\[ÛÙšYİ\™O‰ÊKš›Ú[Š	ÉÊH
È	ÏÙ]Ù]‰Èˆ	Ï]ˆÛ\ÜÏHœÜİ‹[\ÙÈˆİ[OH›X\™Ú[‹]ÜŒM¶*6,v)öã6)öã6aˆ6*6)ö,¶+öã6+È6*¶-vb6ã6,vã6*ö*6*ˆ6a¶-6+öaÈ6)ö,ö*‹Ù]‰ÊNÂˆÜİ“[Ù[
	ö+6,¶)¶ã6)ö*ˆ6ªv)öava6*6)ö,¶+öã6+È6b6*6)ö,¶,v,öã	Ë[\Ş[˜È

HOˆYJNÂˆÛÛœİ[Ù[HØİ[Y[œ]Y\TÙ[XİÜŠ	ËœÜİ‹Y›Ü›K[[Ù[	ÊNÂˆYˆ
[Ù[
HÂˆ[Ù[œ]Y\TÙ[XİÜŠ	ËœÜİ‹\İX›Z]	ÊK^ÛÛ[H	ö*6,ö*¶a‰ÎÂˆ[Ù[œ]Y\TÙ[XİÜŠ	ËœÜİ‹XØ[˜Ù[	ÊKœİ[K™\Ü^HH	Û›Û™IÎÂˆBˆJK˜Ø]Ú
HOˆ[\
K›Y\ÜØYÙH	ö+6,¶)¶ã6)ö*ˆ6*6)ö,¶+öã6+È6+ö,vã6)ö`v*ˆ6a¶-6+Ë‰ÊJNÂˆBˆ[˜İ[Ûˆ\ĞÙ\YšXØ]Uš[Û][ÛŠŠHÂˆÛÛœİÈHİš[™ÊˆOOH[	‰ˆˆOOH›ÚYÈˆˆ	ÉÊKœ™\XÙJÖ×LŒ×LŒ—KÙË	È	ÊKœ™\XÙJ×ÊËÙË	È	ÊKš[J
NÂˆ™]\›ˆö«öb6)öaöãÊ¶-va6)ö+vã6*Ÿ6-va6)ö+vã6*—Ê¶av.v*¶*6,_6+ö)ö-6*¶a—Ê¶ã6)×Ê¶a¶+ö)ö-6*¶a‹Ë\İ
ÊNÂˆBˆ[˜İ[ÛˆÜİ“[Ù[
]K[Û”Ø]™JHÈÛÛœİHHØİ[Y[˜Ü™X]Q[[Y[
	Ù]‰ÊNÈK˜Û\ÜÓ˜[YHH	ÜÜİ‹Y›Ü›K[[Ù[	ÎÈKš[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹Y›Ü›KX›Ş]ˆÛ\ÜÏHœÜİ‹Y›Ü›KZXY‰È
È\ØÊ]JH
È	ÏØ]Ûˆ\OH˜]ÛˆˆÛ\ÜÏHœÜİ‹XÛÜÙH¶*6,ö*¶aØ]ÛÙ]]ˆÛ\ÜÏHœÜİ‹Y›Ü›KX›ÙH‰È
È[
È	ÏÙ]]ˆÛ\ÜÏHœÜİ‹Y›Ü›KY›Ûİ]Ûˆ\OH˜]ÛˆˆÛ\ÜÏHœÜİ‹XØ[˜Ù[[¶)öa¶-v,v)ö`OØ]Û]Ûˆ\OH˜]ÛˆˆÛ\ÜÏHœÜİ‹\İX›Z]¶,6+¶ã6,vaÏØ]ÛÙ]Ù]‰ÎÈØİ[Y[˜›ÙK˜\[™Ú[
JNÈÛÛœİÛÜÙHH

HOˆKœ™[[İ™J
NÈKœ]Y\TÙ[XİÜŠ	ËœÜİ‹XÛÜÙIÊK›Û˜ÛXÚÈHÛÜÙNÈKœ]Y\TÙ[XİÜŠ	ËœÜİ‹XØ[˜Ù[	ÊK›Û˜ÛXÚÈHÛÜÙNÈKœ]Y\TÙ[XİÜŠ	ËœÜİ‹\İX›Z]	ÊK›Û˜ÛXÚÈH\Ş[˜È

HOˆÈÛÛœİÚÈH]ØZ]Û”Ø]™JJNÈYˆ
ÚÈOOH˜[ÙJBˆÛÜÙJ
NÈNÈ™]\›ˆNÈBˆ[˜İ[ÛˆÜİÛÛ™š\›J]K›ÙKÛ–Y\ÊHÈÛÛœİHHØİ[Y[˜Ü™X]Q[[Y[
	Ù]‰ÊNÈK˜Û\ÜÓ˜[YHH	ÜÜİ‹Y›Ü›K[[Ù[	ÎÈKš[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹Y›Ü›KX›Ş]ˆÛ\ÜÏHœÜİ‹Y›Ü›KZXY‰È
È\ØÊ]JH
È	ÏØ]Ûˆ\OH˜]ÛˆˆÛ\ÜÏHœÜİ‹XÛÜÙH¶*6,ö*¶aØ]ÛÙ]]ˆÛ\ÜÏHœÜİ‹Y›Ü›KX›ÙH]ˆÛ\ÜÏHœÜİ‹[\ÙÈ‰È
È›ÙH
È	ÏÙ]Ù]]ˆÛ\ÜÏHœÜİ‹Y›Ü›KY›Ûİ]Ûˆ\OH˜]ÛˆˆÛ\ÜÏHœÜİ‹XØ[˜Ù[[¶*6)ö,¶«ö-6*Ø]Û]Ûˆ\OH˜]ÛˆˆÛ\ÜÏHœÜİ‹\İX›Z]¶*¶(öã6ã6+ÏØ]ÛÙ]Ù]‰ÎÈØİ[Y[˜›ÙK˜\[™Ú[
JNÈÛÛœİÛÜÙHH

HOˆKœ™[[İ™J
NÈKœ]Y\TÙ[XİÜŠ	ËœÜİ‹XÛÜÙIÊK›Û˜ÛXÚÈHÛÜÙNÈKœ]Y\TÙ[XİÜŠ	ËœÜİ‹XØ[˜Ù[	ÊK›Û˜ÛXÚÈHÛÜÙNÈKœ]Y\TÙ[XİÜŠ	ËœÜİ‹\İX›Z]	ÊK›Û˜ÛXÚÈH\Ş[˜È

HOˆÈKœ]Y\TÙ[XİÜŠ	ËœÜİ‹\İX›Z]	ÊK™\ØX›YHYNÈHÂˆ]ØZ]Û–Y\Ê
NÂˆÛÜÙJ
NÂˆBˆØ]Ú
JHÂˆ[\
K›Y\ÜØYÙJNÂˆKœ]Y\TÙ[XİÜŠ	ËœÜİ‹\İX›Z]	ÊK™\ØX›YH˜[ÙNÂˆHNÈ™]\›ˆNÈBˆ[˜İ[Ûˆ\İšXİÙ^JŠHÂˆÛÛœİÈHİš[™ÊˆOOH[	‰ˆˆOOH›ÚYÈˆˆ	ÉÊKš[J
Bˆœ™\XÙJÖöhvjWKÙËÚOˆ	ÌLŒÍMÎIÖÉöh6hvh¶höi6ivi¶iöj6jIËš[™^ÙŠÚ
WJBˆœ™\XÙJÖöìvîWKÙËÚOˆ	ÌLŒÍMÎIÖÉöì6ìvì¶ìöí6íví¶íöî6îIËš[™^ÙŠÚ
WJBˆœ™\XÙJ×Š6a¶)ö+vã6aß6ava¶-ö`¶aÊV××LŒ×LŒ—J‹Ë	ÉÊBˆœ™\XÙJÖ××LŒ×LŒ—JËÙË	ÉÊNÂˆ™]\›ˆÎÂˆBˆ\Ş[˜È[˜İ[ÛˆÜİ‘[]Q›Ü›JÚ[™›İËØY
HÂˆ˜\ˆØKØ‹ØËÙNÂˆÛÛœİˆH›İÈßK\ĞÛÛ\[HHÚ[™OOH	ØÛÛ\[šY\ÉÎÂˆ]ÛÛ\[šY\ÈH×K\İšXİÈH×NÂˆYˆ
Z\ĞÛÛ\[JHÂˆHÂˆÛÛœİØÜ‹\—HH]ØZ]›ÛZ\ÙK˜[
Ø\J	ËØ\KÜØÚÛÛ\Ù\šXÙKØÛÛ\[šY\ÏÛ[Z]LŒ	ÊK\J	ËØ\KÜØÚÛÛ\Ù\šXÙKÛY]IÊWJNÂˆÛÛ\[šY\ÈHÜ‹š][\È×NÂˆ\İšXİÈH\‹™\İšXİÈ×NÂˆBˆØ]Ú
JHÂˆ[\
	ö`vaö,v,ö*ˆ6-6,vªv*¸ #6aö)È6ã6)È6a¶b6)ö+vã6+ö,vã6)ö`v*ˆ6a¶-6+Îˆ	È
ÈK›Y\ÜØYÙJNÂˆ™]\›ÂˆBˆBˆÛÛœİÙ[XİYÛÛ\[HH[X™\Š‹˜ÛÛ\[WÚY
NÂˆÛÛœİÙ[XİY\İšXİH\İšXİË™š[™
Oˆ\İšXİÙ^J
HOOH\İšXİÙ^J‹™YXØ][Û˜[Ù\İšXİ
JNÂˆÛÛœİ\İšXİ˜[YHHÙ[XİY\İšXİOOH[™Yš[™YÈİš[™ÊÙ[XİY\İšXİ
Hˆ	ÉÎÂˆÛÛœİ[H\ĞÛÛ\[BˆÈ	Ï]ˆÛ\ÜÏHœÜİ‹Y›Ü›KYÜšYX™[¶a¶)öaH6-6,vªv*[œ]YH™Y‹[˜[YHˆÛ\ÜÏHœÜİ‹Z[œ]ˆ˜[YOH‰È
È\ØÊ‹›˜[YH	ÉÊH
È	ÈÛX™[X™[¶a¶)öaH6av+öã6,v.v)öava[œ]YH™Y‹[X[˜YÙ\ˆˆÛ\ÜÏHœÜİ‹Z[œ]ˆ˜[YOH‰È
È\ØÊ‹›X[˜YÙ\—Û˜[YH	ÉÊH
È	ÈÛX™[X™[¶avb6*6)öã6a6av+öã6,v.v)öava[œ]YH™Y‹[X[˜YÙ\‹[[Øš[HˆÛ\ÜÏHœÜİ‹Z[œ]ˆ[œ][ÙOH[ˆ˜[YOH‰È
È\ØÊ‹›X[˜YÙ\—Û[Øš[H	ÉÊH
È	ÈÛX™[X™[¶*¶a6`vaˆ6*ö)ö*6*[œ]YH™Y‹[[™[™HˆÛ\ÜÏHœÜİ‹Z[œ]ˆ[œ][ÙOH[ˆ˜[YOH‰È
È\ØÊ‹›[™[™WÜÛ™H‹œÛ™H	ÉÊH
È	ÈÛX™[X™[¶(¶+ö,v,Ï[œ]YH™Y‹XY™\ÜÈˆÛ\ÜÏHœÜİ‹Z[œ]ˆ˜[YOH‰È
È\ØÊ‹˜Y™\ÜÈ	ÉÊH
È	ÈÛX™[X™[¶.v,v-ˆ6+6.¶,v)ö`vã6)öã6ã[œ]YH™Y‹[]ˆÛ\ÜÏHœÜİ‹Z[œ]ˆ[œ][ÙOH™XÚ[X[ˆ˜[YOH‰È
È\ØÊ
ØHH‹›]]YJHOOH[	‰ˆØHOOH›ÚYÈØHˆ	ÉÊH
È	ÈÛX™[X™[¶-öb6a6+6.¶,v)ö`vã6)öã6ã[œ]YH™Y‹[™ÈˆÛ\ÜÏHœÜİ‹Z[œ]ˆ[œ][ÙOH™XÚ[X[ˆ˜[YOH‰È
È\ØÊ
ØˆH‹›Û™Ú]YJHOOH[	‰ˆØˆOOH›ÚYÈØˆˆ	ÉÊH
È	ÈÛX™[X™[¶av+ö)ö,v,È6*ö*6*¸ #6-6+öaÏ[œ]YH™Y‹\™YÚ\İ\™Y\ØÚÛÛÈˆÛ\ÜÏHœÜİ‹Z[œ]ˆ\OH›[X™\ˆˆZ[HŒˆ˜[YOH‰È
È\ØÊ
ØÈH‹œ™YÚ\İ\™YÜØÚÛÛØÛİ[
HOOH[	‰ˆØÈOOH›ÚYÈØÈˆ
H
È	ÈÛX™[X™[¶*¶.v+ö)ö+È6a¶av)öã6a¶+ö«ö)öa[œ]YH™Y‹\™\™\Ù[]]™\ÈˆÛ\ÜÏHœÜİ‹Z[œ]ˆ\OH›[X™\ˆˆZ[HŒˆ˜[YOH‰È
È\ØÊ
ÙHH‹œ™\™\Ù[]]™WØÛİ[
HOOH[	‰ˆÙHOOH›ÚYÈÙHˆ
H
È	ÈÛX™[X™[¶b6-¶.vã6*Ù[XİYH™Y‹\İ]\ÈˆÛ\ÜÏHœÜİ‹Z[œ]Ü[Ûˆ	È
È

‹œİ]\È	ö`v.v)öa	ÊHOOH	ö`v.v)öa	ÈÈ	ÜÙ[XİY	Èˆ	ÉÊH
È	Ï¶`v.v)öaÛÜ[ÛÜ[Ûˆ	È
È

‹œİ]\È	ö`v.v)öa	ÊHOOH	ö*¶.va6ã6`‰ÈÈ	ÜÙ[XİY	Èˆ	ÉÊH
È	Ï¶*¶.va6ã6`ÛÜ[ÛÜ[Ûˆ	È
È

‹œİ]\È	ö`v.v)öa	ÊHOOH	ö.¶ã6,v`v.v)öa	ÈÈ	ÜÙ[XİY	Èˆ	ÉÊH
È	Ï¶.¶ã6,v`v.v)öaÛÜ[ÛÜÙ[XİÛX™[X™[¶*¶ªvavã6a6o¶,vb6`v)öã6aÙ[XİYH™Y‹\›Ùš[HˆÛ\ÜÏHœÜİ‹Z[œ]Ü[Ûˆ˜[YOHŒHˆ	È
È
[X™\Š‹œ›Ùš[WØÛÛ\]JHÈ	ÜÙ[XİY	Èˆ	ÉÊH
È	Ï¶*¶ªvavã6aÛÜ[ÛÜ[Ûˆ˜[YOHŒˆ	È
È
S[X™\Š‹œ›Ùš[WØÛÛ\]JHÈ	ÜÙ[XİY	Èˆ	ÉÊH
È	Ï¶a¶)ö`¶-OÛÜ[ÛÜÙ[XİÛX™[Ù]‰Âˆˆ	Ï]ˆÛ\ÜÏHœÜİ‹Y›Ü›KYÜšYX™[¶a¶)öaH6av+ö,v,öaÏ[œ]YH™Y‹[˜[YHˆÛ\ÜÏHœÜİ‹Z[œ]ˆ˜[YOH‰È
È\ØÊ‹›˜[YH	ÉÊH
È	ÈÛX™[X™[¶ªv+È6av+ö,v,öaÏ[œ]YH™Y‹XÛÙHˆÛ\ÜÏHœÜİ‹Z[œ]ˆ˜[YOH‰È
È\ØÊ‹˜ÛÙH	ÉÊH
È	ÈÛX™[X™[¶a¶)ö+vã6aÈ6(¶avb6,¶-6ãÙ[XİYH™Y‹Y\İšXİˆÛ\ÜÏHœÜİ‹Z[œ]Ü[Ûˆ˜[YOHˆ¶)öa¶*¶+¶)ö*6ªva¶ã6+ÏÛÜ[Û‰È
È\İšXİË›X\
Oˆ	ÏÜ[Ûˆ˜[YOH‰È
È\ØÊ
H
È	Èˆ	È
È
İš[™Ê
HOOH\İšXİ˜[YHÈ	ÜÙ[XİY	Èˆ	ÉÊH
È	Ï‰È
È\ØÊ
H
È	ÏÛÜ[Û‰ÊKš›Ú[Š	ÉÊH
È	ÏÜÙ[XİÛX™[X™[¶a¶b6.H6av+ö,v,öaÏÙ[XİYH™Y‹YÙ[™\ˆˆÛ\ÜÏHœÜİ‹Z[œ]Ü[Ûˆ	È
È

‹™Ù[™\ˆ	öa¶)öav-6+¶-IÊHOOH	ö+ö+¶*¶,v)öa¶aÉÈÈ	ÜÙ[XİY	Èˆ	ÉÊH
È	Ï¶+ö+¶*¶,v)öa¶aÏÛÜ[ÛÜ[Ûˆ	È
È

‹™Ù[™\ˆ	öa¶)öav-6+¶-IÊHOOH	öo¶,ö,v)öa¶aÉÈÈ	ÜÙ[XİY	Èˆ	ÉÊH
È	Ï¶o¶,ö,v)öa¶aÏÛÜ[ÛÜ[Ûˆ	È
È

‹™Ù[™\ˆ	öa¶)öav-6+¶-IÊHOOH	öa¶)öav-6+¶-IÈÈ	ÜÙ[XİY	Èˆ	ÉÊH
È	Ï¶a¶)öav-6+¶-OÛÜ[ÛÜÙ[XİÛX™[X™[¶-6,vªv*ˆ6av+6,vã6,ö,vb6ã6,ÏÙ[XİYH™Y‹XÛÛ\[HˆÛ\ÜÏHœÜİ‹Z[œ]Ü[Ûˆ˜[YOHŒ¶a¶)öav-6+¶-OÛÜ[Û‰È
ÈÛÛ\[šY\Ë›X\
Oˆ	ÏÜ[Ûˆ˜[YOH‰È
ÈšY
È	Èˆ	È
È
Ù[XİYÛÛ\[HOOH[X™\ŠšY
HÈ	ÜÙ[XİY	Èˆ	ÉÊH
È	Ï‰È
È\ØÊ›˜[YJH
È	ÏÛÜ[Û‰ÊKš›Ú[Š	ÉÊH
È	ÏÜÙ[XİÛX™[X™[¶(¶+ö,v,Ï[œ]YH™Y‹XY™\ÜÈˆÛ\ÜÏHœÜİ‹Z[œ]ˆ˜[YOH‰È
È\ØÊ‹˜Y™\ÜÈ	ÉÊH
È	ÈÛX™[Ù]‰ÎÂˆ™]\›ˆÜİ“[Ù[
\ĞÛÛ\[HÈ
‹šYÈ	öb6ã6,v)öã6-6-6,vªv*‰Èˆ	ö)ö`v,¶b6+öaˆ6-6,vªv*‰ÊHˆ
‹šYÈ	öb6ã6,v)öã6-6av+ö,v,öaÉÈˆ	ö)ö`v,¶b6+öaˆ6av+ö,v,öaÉÊK[\Ş[˜È
JHOˆÂˆ˜\ˆØKØÂˆÛÛœİ›ÙHH\ĞÛÛ\[BˆÈÈ˜[YNˆKœ]Y\TÙ[XİÜŠ	ÈÙY‹[˜[YIÊK˜[YKX[˜YÙ\—Û˜[YNˆKœ]Y\TÙ[XİÜŠ	ÈÙY‹[X[˜YÙ\‰ÊK˜[YKX[˜YÙ\—Û[Øš[NˆKœ]Y\TÙ[XİÜŠ	ÈÙY‹[X[˜YÙ\‹[[Øš[IÊK˜[YK[™[™WÜÛ™NˆKœ]Y\TÙ[XİÜŠ	ÈÙY‹[[™[™IÊK˜[YKÛ™NˆKœ]Y\TÙ[XİÜŠ	ÈÙY‹[[™[™IÊK˜[YKY™\ÜÎˆKœ]Y\TÙ[XİÜŠ	ÈÙY‹XY™\ÜÉÊK˜[YK]]YNˆKœ]Y\TÙ[XİÜŠ	ÈÙY‹[]	ÊK˜[YKÛ™Ú]YNˆKœ]Y\TÙ[XİÜŠ	ÈÙY‹[™ÉÊK˜[YK™YÚ\İ\™YÜØÚÛÛØÛİ[ˆKœ]Y\TÙ[XİÜŠ	ÈÙY‹\™YÚ\İ\™Y\ØÚÛÛÉÊK˜[YK™\™\Ù[]]™WØÛİ[ˆKœ]Y\TÙ[XİÜŠ	ÈÙY‹\™\™\Ù[]]™\ÉÊK˜[YKİ]\ÎˆKœ]Y\TÙ[XİÜŠ	ÈÙY‹\İ]\ÉÊK˜[YK›Ùš[WØÛÛ\]NˆKœ]Y\TÙ[XİÜŠ	ÈÙY‹\›Ùš[IÊK˜[YHOOH	ÌIÈBˆˆÈ˜[YNˆKœ]Y\TÙ[XİÜŠ	ÈÙY‹[˜[YIÊK˜[YKÛÙNˆKœ]Y\TÙ[XİÜŠ	ÈÙY‹XÛÙIÊK˜[YKYXØ][Û˜[Ù\İšXİˆKœ]Y\TÙ[XİÜŠ	ÈÙY‹Y\İšXİ	ÊK˜[YKÙ[™\ˆKœ]Y\TÙ[XİÜŠ	ÈÙY‹YÙ[™\‰ÊK˜[YKÛÛ\[WÚYˆKœ]Y\TÙ[XİÜŠ	ÈÙY‹XÛÛ\[IÊK˜[YH[Y™\ÜÎˆKœ]Y\TÙ[XİÜŠ	ÈÙY‹XY™\ÜÉÊK˜[YK]]YNˆ

ØHHKœ]Y\TÙ[XİÜŠ	ÈÙY‹[]	ÊJHOOH[ØHOOH›ÚYÈ›ÚYˆØK˜[YJH[Û™Ú]YNˆ

ØˆHKœ]Y\TÙ[XİÜŠ	ÈÙY‹[™ÉÊJHOOH[ØˆOOH›ÚYÈ›ÚYˆØ‹˜[YJH[NÂˆHÂˆ]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKÉÈ
ÈÚ[™
È
‹šYÈ	ËÉÈ
È‹šYˆ	ÉÊKÈY]Ùˆ‹šYÈ	ÔU	Èˆ	ÔÔÕ	Ë›ÙHJNÂˆ]ØZ]ØY

NÂˆ™]\›ˆYNÂˆBˆØ]Ú
JHÂˆ[\
K›Y\ÜØYÙJNÂˆ™]\›ˆ˜[ÙNÂˆBˆJNÂˆBˆ[˜İ[Ûˆ™\ÛÛ™TØÚÛÛYÙRÜİ
\™Ù]
HÂˆYˆ
\™Ù]	‰ˆ\™Ù]››ÙU\HOOHJBˆ™]\›ˆÈÜİˆ\™Ù]İÛ™Yˆ˜[ÙHNÂˆÛÛœİÙ[ÈHÉÛXZ[‰Ë	Ë›XZ[‹XÛÛ[	Ë	Ë˜ÛÛ[	Ë	ËœYÙKXÛÛ[	Ë	ÖÜ›ÛOH›XZ[ˆ—I×NÂˆ›Üˆ
ÛÛœİÙ[ÙˆÙ[ÊHÂˆÛÛœİ[HØİ[Y[œ]Y\TÙ[XİÜŠÙ[
NÂˆYˆ
[	‰ˆ[™Ù]›İ[™[™ĞÛY[™Xİ

KÚYˆL
Bˆ™]\›ˆÈÜİˆ[İÛ™Yˆ˜[ÙHNÂˆBˆÛÛœİÜİHØİ[Y[˜Ü™X]Q[[Y[
	Ù]‰ÊNÂˆÜİ˜Û\ÜÓ˜[YHH	ÜÜİ‹\YÙKZÜİ	ÎÂˆÛÛœİ›ÛİHØİ[Y[œ]Y\TÙ[XİÜŠ	ÈÜ›Ûİ	ÊHØİ[Y[˜›ÙNÂˆ›Ûİ˜\[™Ú[
Üİ
NÂˆ™]\›ˆÈÜİİÛ™YˆYHNÂˆBˆ[˜İ[Ûˆ[İ[ØÚÛÛX\
ÛÛZ[™\‹›İÜÊHÂˆYˆ
ËœØÚÛÛX\	‰ˆËœØÚÛÛX\œ™[[İ™JHÂˆHÂˆËœØÚÛÛX\œ™[[İ™J
NÂˆBˆØ]Ú
ÊHÈBˆBˆÛÛZ[™\‹š[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹[X\]Ü˜\]ˆYHœÜİ‹\ØÚÛÛ[X\ˆÛ\ÜÏHœÜİ‹[X\Ù]]ˆÛ\ÜÏHœÜİ‹[X\Z[™›È¶avb6`¶.vã6*ˆ6av+ö)ö,v,ÏØ]ˆYHœÜİ‹\ØÚÛÛ\Ú[Èˆİ[OH›X\™Ú[‹]ÜŒLÙ]Ù]Ù]‰ÎÂˆÛÛœİX\[HÛÛZ[™\‹œ]Y\TÙ[XİÜŠ	ÈÜÜİ‹\ØÚÛÛ[X\	ÊNÂˆYˆ
]Ú[™İË“
HÂˆX\[š[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹[X\Y[\H¶ªv*¶)ö*6+¶)öa¶aÈ6a¶`¶-6aÈ6+ö,H6+ö,ö*¶,v,È6a¶ã6,ö*‹Ù]‰ÎÂˆ™]\›ÂˆBˆÛÛœİX\H›X\
X\[È›ÛÛPÛÛ›ÛˆYK]šX][ÛÛÛ›ÛˆYHJKœÙ]šY]ÊÌÍ‹ŒMÌ‹NKŒ×KLJNÂˆ[S^Y\Š	ÚÎ‹ËŞÜßK[K›Ü[œİ™Y]X\›Ü™ËŞŞŸKŞŞKŞŞ_Kœ™ÉËÈX^›ÛÛNˆNK]šX][Ûˆ	ğªHÜ[”İ™Y]X\	ÈJK˜YÊX\
NÂˆËœØÚÛÛX\HX\ÂˆÛÛœİ\İHÛÛZ[™\‹œ]Y\TÙ[XİÜŠ	ÈÜÜİ‹\ØÚÛÛ\Ú[ÉÊK›İ[™ÈH×NÂˆ]Ûİ[HÂˆ
›İÜÈ×JK™›Ü‘XXÚ
ˆOˆÈÛÛœİ]H[X™\Š‹›]]YJK™ÈH[X™\Š‹›Û™Ú]YJNÈYˆ
S[X™\‹š\Ñš[š]J]
HS[X™\‹š\Ñš[š]J™ÊJBˆ™]\›ÈÛİ[
ÊÎÈ›İ[™Ëœ\Ú
Û]™×JNÈÛÛœİX\šÙ\ˆH›X\šÙ\ŠÛ]™×JK˜YÊX\
NÈÛÛœİÛÛ\[HH\ØÊ‹˜ÛÛ\[WÛ˜[Y\È	öa¶)öav-6+¶-IÊNÈX\šÙ\‹˜š[™Ü\
	Ï]ˆ\Hœˆİ[OH™›ÛY˜[Z[N•˜^š\›X]‹ZÛXNÛZ[‹]ÚYŒŒŒ‰È
È\ØÊ‹›˜[YH	öav+ö,v,öaÉÊH
È	ÏØ]¶a¶)ö+vã6aÎˆ	È
È\ØÊ‹™YXØ][Û˜[Ù\İšXİ	öa¶)öav-6+¶-IÊH
È	ÏÙ]]¶a¶b6.Nˆ	È
È\ØÊ‹™Ù[™\ˆ	öa¶)öav-6+¶-IÊH
È	ÏÙ]]¶-6,vªv*ˆ6av+6,vãˆ	È
ÈÛÛ\[H
È	ÏÙ]]¶(¶+ö,v,Îˆ	È
È\ØÊ‹˜Y™\ÜÈ	ö*ö*6*ˆ6a¶-6+öaÉÊH
È	ÏÙ]Ù]‰ÊNÈÛÛœİˆHØİ[Y[˜Ü™X]Q[[Y[
	Ø]Û‰ÊNÈ‹\HH	Ø]Û‰ÎÈ‹˜Û\ÜÓ˜[YHH	ÜÜİ‹\ØÚÛÛ\XÚÉÎÈ‹š[›™\’SH	Ï‰È
È\ØÊ‹›˜[YH	öav+ö,v,öaÉÊH
È	ÏØ]ˆİ[OH™›Û\Ú^™NŒL\ØÛÛÜˆÍÌNÛX\™Ú[‹]ÜŒÜ‰È
È\ØÊ‹™YXØ][Û˜[Ù\İšXİ	ÉÊH
È	È8 (ˆ	È
ÈÛÛ\[H
È	ÏÙ]‰ÎÈ‹›Û˜ÛXÚÈH

HOˆÈX\œÙ]šY]ÊÛ]™×KMÊNÈX\šÙ\‹›Ü[”Ü\

NÈNÈ\İ˜\[™Ú[
ŠNÈJNÂˆYˆ
XÛİ[
Bˆ\İš[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹[\ÙÈ¶*6,v)öã6av+ö)ö,v,È6`v.va6ã6av+¶*¶-v)ö*ˆ6+6.¶,v)ö`vã6)öã6ã6*ö*6*ˆ6a¶-6+öaÈ6)ö,ö*‹Ù]‰ÎÂˆ[ÙHYˆ
›İ[™Ë›[™İOOHJBˆX\œÙ]šY]Ê›İ[™ÖÌKMŠNÂˆ[ÙBˆX\™š]›İ[™Ê›İ[™ËÈY[™ÎˆÌKWKX^›ÛÛNˆMˆJNÂˆÙ][Y[İ]


HOˆX\š[˜[Y]TÚ^™J
KL
NÂˆBˆ[˜İ[ÛˆÜİ”ÚİÔØÚÛÛ\İÜJØÚÛÛYšYÙÙ\ŠHÂˆÛÛœİYH[X™\ŠØÚÛÛY
NÂˆYˆ
ZY
Bˆ™]\›ÂˆYˆ
šYÙÙ\ŠBˆšYÙÙ\‹™\ØX›YHYNÂˆ\J	ËØ\KÜØÚÛÛ\Ù\šXÙKÜØÚÛÛËÉÈ
ÈY
È	ËÚ[œÜXİ[ÛœÉÊK[Š]HOˆÂˆ˜\ˆØNÂˆÛÛœİ][\ÈH]Kš][\È×NÂˆÛÛœİ[H][\Ë›[™İÈ	Ï]ˆİ[OH™\Ü^N™ÜšYÙØ\‰È
È][\Ë›X\
ˆOˆ	Ï]ˆİ[OH™\Ü^N™ÜšYÙÜšY][\]KXÛÛ[[œÎ›Z[›X^
YœŠH]]ÎÙØ\ŒLØ[YÛ‹Z][\Î˜Ù[\ÜY[™ÎŒLØ›Ü™\Œ\ÛÛYÙMNYNØ›Ü™\‹\˜Y]\ÎŒL]‰È
È\ØÊ
‹š[Û][Û—Ù]H	ö*6+öb6aˆ6*¶)ö,vã6+‰ÊH
È	È	È
È
‹š[Û][Û—İ[YH	ÉÊJH
È	ÏØ]ˆİ[OH™›Û\Ú^™NŒL\ØÛÛÜˆÍÌNÛX\™Ú[‹]Ü¶o¶a6)öªNˆ	È
È\ØÊ‹œ]H	öa¶)öav-6+¶-IÊH
È	È0­È6*6)ö,¶,v,Îˆ	È
È\ØÊ‹š[œÜXİÜ—Û˜[YH	öa¶)öav-6+¶-IÊH
È	ÏÙ]]ˆİ[OH™›Û\Ú^™NŒL\ØÛÛÜˆÍÌNÛX\™Ú[‹]ÜŒÜ¶*¶+¶a6`v)ö*ˆ	È
È\ØÊ
‹š[Û][ÛœÈ×JKš›Ú[Š	ö#	ÊH	ö*6+öb6aˆ6*¶+¶a6`H6*ö*6*¸ #6-6+öaÉÊH
È	ÏÙ]Ù]]Ûˆ\OH˜]ÛˆˆÛ\ÜÏHœÜİ‹\›İËXˆš[X\Hˆ]K[X\Z\İÜKY]Z[H‰È
È‹šY
È	È¶+6,¶)¶ã6)ö*Ø]ÛÙ]‰ÊKš›Ú[Š	ÉÊH
È	ÏÙ]‰Èˆ	Ï]ˆÛ\ÜÏHœÜİ‹[\ÙÈ¶*6,v)öã6)öã6aˆ6av+ö,v,öaÈ6,ö)ö*6`¶aöe6*6)ö,¶+öã6+öã6*ö*6*ˆ6a¶-6+öaÈ6)ö,ö*‹Ù]‰ÎÂˆÛÛœİ[Ù[HÜİ“[Ù[
	ö,öb6)ö*6`ˆ6*6)ö,¶+öã6+È6av+ö,v,öaÈ8 %	È
È


ØHH]KœØÚÛÛ
HOOH[ØHOOH›ÚYÈ›ÚYˆØK›˜[YJH	ÉÊK[\Ş[˜È

HOˆYJNÂˆ[Ù[œ]Y\TÙ[XİÜŠ	ËœÜİ‹\İX›Z]	ÊK^ÛÛ[H	ö*6,ö*¶a‰ÎÂˆ[Ù[œ]Y\TÙ[XİÜŠ	ËœÜİ‹XØ[˜Ù[	ÊKœİ[K™\Ü^HH	Û›Û™IÎÂˆ[Ù[œ]Y\TÙ[XİÜ[
	ÖÙ]K[X\Z\İÜKY]Z[IÊK™›Ü‘XXÚ
ˆOˆ‹›Û˜ÛXÚÈH

HOˆÈÛÛœİ[œÜXİ[Û’YH‹™]\Ù]›X\\İÜQ]Z[È[Ù[œ™[[İ™J
NÈÜİ”ÚİÒ[œÜXİ[ÛŠ[œÜXİ[Û’Y
NÈJNÂˆJK˜Ø]Ú
\œˆOˆ[\
\œ‹›Y\ÜØYÙH	ö+ö,vã6)ö`v*ˆ6,öb6)ö*6`ˆ6*6)ö,¶+öã6+È6av+ö,v,öaÈ6a¶)öavb6`v`ˆ6*6b6+Ë‰ÊJK™š[˜[J

HOˆÈYˆ
šYÙÙ\ˆ	‰ˆšYÙÙ\‹š\ĞÛÛ›™XİY
BˆšYÙÙ\‹™\ØX›YH˜[ÙNÈJNÂˆBˆ[˜İ[Ûˆ[İ[[œÜXİ[Û“X\
ÛÛZ[™\‹›İÜË\İšXİ›İ[™\šY\ÊHÂˆYˆ
XÛÛZ[™\ˆXÛÛZ[™\‹š\ĞÛÛ›™XİY
Bˆ™]\›ÂˆYˆ
ËœØÚÛÛ[œÜXİ[Û“X\	‰ˆËœØÚÛÛ[œÜXİ[Û“X\œ™[[İ™JHÂˆHÂˆËœØÚÛÛ[œÜXİ[Û“X\œ™[[İ™J
NÂˆBˆØ]Ú
ÊHÈBˆBˆÛÛZ[™\‹š[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹[X\]Ü˜\]]ˆÛ\ÜÏHœÜİ‹[X\[YÙ[™Ü[ˆÛ\ÜÏHœÜİ‹[X\\İ]¶av+ö)ö,v,È6+ö)ö,v)öã6*6)ö,¶+öã6+Îˆ	È
ÈÜİ‘˜J
›İÜÈ×JK›[™İ
H
È	ÏÜÜ[Ü[ˆÛ\ÜÏHœÜİ‹[X\\İ]¶av,v,ˆ6î6a¶)ö+vã6aÈ6(¶avb6,¶-8 #6b6o¶,vb6,v-ÜÜ[Ù]]ˆYHœÜİ‹Z[œÜXİ[Û‹[X\ˆÛ\ÜÏHœÜİ‹[X\Ù]Ù]]ˆÛ\ÜÏHœÜİ‹[X\Z[™›È¶av+ö)ö,v,È6*6)ö,¶+öã6+ö-6+öaÏØ]ˆYHœÜİ‹Z[œÜXİ[Û‹\Ú[Èˆİ[OH›X\™Ú[‹]ÜŒLÙ]Ù]Ù]‰ÎÂˆÛÛœİX\[HÛÛZ[™\‹œ]Y\TÙ[XİÜŠ	ÈÜÜİ‹Z[œÜXİ[Û‹[X\	ÊNÂˆYˆ
[X\[
Bˆ™]\›ÂˆYˆ
]Ú[™İË“
HÂˆX\[š[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹[X\Y[\H¶ªv*¶)ö*6+¶)öa¶aÈ6a¶`¶-6aÈ6+ö,H6+ö,ö*¶,v,È6a¶ã6,ö*‹Ù]‰ÎÂˆ™]\›ÂˆBˆÛÛœİX\H›X\
X\[È›ÛÛPÛÛ›ÛˆYK]šX][ÛÛÛ›ÛˆYHJKœÙ]šY]ÊÌÍ‹ŒMÌ‹NKŒ×KLJNÂˆ[S^Y\Š	ÚÎ‹ËŞÜßK[K›Ü[œİ™Y]X\›Ü™ËŞŞŸKŞŞKŞŞ_Kœ™ÉËÈX^›ÛÛNˆNK]šX][Ûˆ	ğªHÜ[”İ™Y]X\	ÈJK˜YÊX\
NÂˆËœØÚÛÛ[œÜXİ[Û“X\HX\ÂˆÛÛœİ\İHÛÛZ[™\‹œ]Y\TÙ[XİÜŠ	ÈÜÜİ‹Z[œÜXİ[Û‹\Ú[ÉÊNÂˆYˆ
[\İ
HÂˆHÂˆX\œ™[[İ™J
NÂˆBˆØ]Ú
ÊHÈBˆYˆ
ËœØÚÛÛ[œÜXİ[Û“X\OOHX\
BˆËœØÚÛÛ[œÜXİ[Û“X\H[Âˆ™]\›ÂˆBˆÛÛœİ›İ[™ÈH×NÂˆ
\İšXİ›İ[™\šY\È×JK™›Ü‘XXÚ
OˆÂˆÛÛœİÈH
œÚ[È×JK›X\
OˆÓ[X™\ŠOOH[OOH›ÚYÈ›ÚYˆÌJK[X™\ŠOOH[OOH›ÚYÈ›ÚYˆÌWJWJK™š[\ŠOˆ[X™\‹š\Ñš[š]JÌJH	‰ˆ[X™\‹š\Ñš[š]JÌWJJNÂˆYˆ
Ë›[™İÊBˆ™]\›ÂˆÛÛœİÛHHœÛYÛÛŠËÈÛÛÜˆ	ÈÌL™N‰ËÙZYÚˆ‹š[ÛÛÜˆ	ÈÌL™N‰Ëš[ÜXÚ]NˆŒÈJNÂˆÛK˜YÊX\
K˜š[™ÛÛ\
İš[™Ê]H	öa¶)ö+vã6aÉÊKÈ\›X[™[ˆYK\™Xİ[Ûˆ	ØÙ[\‰ËÛ\ÜÓ˜[YNˆ	ÜÜİ‹Y\İšXİ[X™[	ËÜXÚ]NˆHJNÂˆË™›Ü‘XXÚ
Oˆ›İ[™Ëœ\Ú

JNÂˆJNÂˆ
›İÜÈ×JK™›Ü‘XXÚ
ˆOˆÂˆÛÛœİ]H[X™\Š‹›]]YJK™ÈH[X™\Š‹›Û™Ú]YJNÂˆYˆ
S[X™\‹š\Ñš[š]J]
HS[X™\‹š\Ñš[š]J™ÊJBˆ™]\›Âˆ›İ[™Ëœ\Ú
Û]™×JNÂˆÛÛœİX\šÙ\ˆH›X\šÙ\ŠÛ]™×JK˜YÊX\
NÂˆÛÛœİÜ\H	Ï]ˆ\Hœˆİ[OH™›ÛY˜[Z[N•˜^š\›X]‹ZÛXNÛZ[‹]ÚYŒŒÌ‰È
È\ØÊ‹›˜[YH	öav+ö,v,öaÉÊH
È	ÏØ]¶a¶)ö+vã6aÎˆ	È
È\ØÊ‹™YXØ][Û˜[Ù\İšXİ	öa¶)öav-6+¶-IÊH
È	ÏÙ]]¶*¶.v+ö)ö+È6*6)ö,¶+öã6+Îˆ	È
ÈÜİ‘˜J‹š[œÜXİ[Û—ØÛİ[
H
È	ÏÙ]]¶(¶+¶,vã6aˆ6*6)ö,¶,v,Îˆ	È
È\ØÊ‹›\İÚ[œÜXİÜˆ	öa¶)öav-6+¶-IÊH
È	ÏÙ]]¶(¶+¶,vã6aˆ6*6)ö,¶+öã6+Îˆ	È
È\ØÊ‹›\İÚ[œÜXİ[Û—Ø]	öa¶)öav-6+¶-IÊH
È	ÏÙ]]Ûˆ\OH˜]ÛˆˆÛ\ÜÏHœÜİ‹\›İËXˆš[X\Hˆİ[OH›X\™Ú[‹]Üˆ]K[X\Z[œÜXİ[Û‹\ØÚÛÛH‰È
È‹šY
È	È¶,öb6)ö*6`ˆ6*6)ö,¶+öã6+ÏØ]ÛÙ]‰ÎÂˆX\šÙ\‹˜š[™Ü\
Ü\ÈÛÜÙP]ÛˆYK]]ĞÛÜÙNˆ˜[ÙKÛÜÙSÛÛXÚÎˆ˜[ÙHJNÂˆX\šÙ\‹›ÛŠ	ÜÜ\Ü[‰Ë]ˆOˆÈÛÛœİÜ\[H]‹œÜ\™Ù][[Y[

NÈÛÛœİ\İÜPˆHÜ\[OOH[Ü\[OOH›ÚYÈ›ÚYˆÜ\[œ]Y\TÙ[XİÜŠ	ÖÙ]K[X\Z[œÜXİ[Û‹\ØÚÛÛIÊNÈYˆ
Z\İÜPˆ\İÜP‹™]\Ù]š\İÜP›İ[™OOH	ÌIÊBˆ™]\›È\İÜP‹™]\Ù]š\İÜP›İ[™H	ÌIÎÈ\İÜP‹˜Y]™[\İ[™\Š	ØÛXÚÉË]™[OˆÈ]™[œ™]™[Y˜][

NÈ]™[œİÜ›ÜYØ][ÛŠ
NÈYˆ
Ú[™İË“	‰ˆ‘ÛQ]™[
HÂˆ‘ÛQ]™[œ™]™[Y˜][
]™[
NÂˆ‘ÛQ]™[œİÜ›ÜYØ][ÛŠ]™[
NÂˆHÜİ”ÚİÔØÚÛÛ\İÜJ\İÜP‹™Ù]]šX]J	Ù]K[X\Z[œÜXİ[Û‹\ØÚÛÛ	ÊK\İÜPŠNÈJNÈJNÂˆÛÛœİˆHØİ[Y[˜Ü™X]Q[[Y[
	Ø]Û‰ÊNÂˆ‹\HH	Ø]Û‰ÎÂˆ‹˜Û\ÜÓ˜[YHH	ÜÜİ‹\ØÚÛÛ\XÚÉÎÂˆ‹š[›™\’SH	Ï‰È
È\ØÊ‹›˜[YH	öav+ö,v,öaÉÊH
È	ÏØ]ˆİ[OH™›Û\Ú^™NŒL\ØÛÛÜˆÍÌNÛX\™Ú[‹]ÜŒÜ‰È
È\ØÊ‹™YXØ][Û˜[Ù\İšXİ	ÉÊH
È	È8 (ˆ	È
ÈÜİ‘˜J‹š[œÜXİ[Û—ØÛİ[
H
È	È6*6)ö,¶+öã6+ÏÙ]‰ÎÂˆ‹›Û˜ÛXÚÈH

HOˆÈX\œÙ]šY]ÊÛ]™×KMÊNÈX\šÙ\‹›Ü[”Ü\

NÈNÂˆ\İ˜\[™Ú[
ŠNÂˆJNÂˆYˆ
X›İ[™Ë›[™İ
BˆX\œÙ]šY]ÊÌÍ‹ŒMÌ‹NKŒ×KLJNÂˆ[ÙBˆX\™š]›İ[™Ê›İ[™ËÈY[™ÎˆÌKWKX^›ÛÛNˆLˆJNÂˆYˆ
J›İÜÈ×JKœÛÛYJˆOˆ[X™\‹š\Ñš[š]J[X™\Š‹›]]YJJH	‰ˆ[X™\‹š\Ñš[š]J[X™\Š‹›Û™Ú]YJJJJBˆ\İš[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹[\ÙÈ¶av,v,ˆ6a¶b6)ö+vã6a¶av)öã6-6+ö)ö+öaÈ6-6+ö&È6aöa¶b6,ˆ6av+ö,v,öaÈ6*6)ö,¶+öã6+ö-6+öaø #6)öã6*6)È6av+¶*¶-v)ö*ˆ6+6.¶,v)ö`vã6)öã6ã6*ö*6*¸ #6-6+öaÈ6b6+6b6+È6a¶+ö)ö,v+ËÙ]‰ÎÂˆÙ][Y[İ]


HOˆX\š[˜[Y]TÚ^™J
KL
NÂˆBˆ[˜İ[ÛˆÜİ‘˜JŠHÈ™]\›ˆ™]È[“[X™\‘›Ü›X]
	Ù˜KRT‰ÊK™›Ü›X]
[X™\ŠŠH
NÈBˆ[˜İ[ÛˆÜİ’˜[[Q]J˜[YJHÂˆYˆ
]˜[YJBˆ™]\›ˆ	ø %	ÎÂˆÛÛœİ˜]ÈHİš[™Ê˜[YJKš[J
NÂˆYˆ
×ŒVÌÍWËËWWÌKŸVËËWWÌKŸKË\İ
˜]ÊJBˆ™]\›ˆ˜]ËœÛXÙJL
Kœ™\XÙJËKÙË	ËÉÊKœ™\XÙJ×ÙËOˆ	öì6ìvì¶ìöí6íví¶íöî6îIÖÓ[X™\Š
WJNÂˆÛÛœİ[Y\İ[\H×—ÍKWÌŸKWÌŸHÌŸN—ÌŸKË\İ
˜]ÊHÈ˜]Ëœ™\XÙJ	È	Ë	Õ	ÊH
È	ÊÌÎŒÌ	Èˆ˜]ÎÂˆÛÛœİ]HH™]È]J[Y\İ[\
NÂˆ™]\›ˆ[X™\‹š\Ó˜SŠ]K™Ù][YJ
JHÈ	ø %	Èˆ™]È[‘]U[YQ›Ü›X]
	Ù˜KRT‹]KXØK\\œÚX[‰ËÈ[YV›Û™Nˆ	Ğ\ÚXKÕZ˜[‰ËYX\ˆ	Û[Y\šXÉË[Ûˆ	Ì‹YYÚ]	Ë^Nˆ	Ì‹YYÚ]	ÈJK™›Ü›X]
]JNÂˆBˆ[˜İ[ÛˆÜİ’\˜[”]J›İÊHÂˆÛÛœİYÚ]ÈHˆOˆ\ØÊİš[™ÊˆOOH[	‰ˆˆOOH›ÚYÈˆˆ	ÉÊKœ™\XÙJ×ÙËOˆ	öì6ìvì¶ìöí6íví¶íöî6îIÖÓ[X™\Š
WJJNÂˆÛÛœİÛÈHYÚ]Ê›İËœ]WİÛÊK™YHHYÚ]Ê›İËœ]Wİ™YJK™YÚ[ÛˆHYÚ]Ê›İËœ]WÜ™YÚ[Û—ØÛÙJK]\ˆH\ØÊ›İËœ]WÛ]\ˆ	ÉÊNÂˆYˆ
]ÛÈ]™YH\™YÚ[ÛŠBˆ™]\›ˆ	ÏÜ[ˆÛ\ÜÏHœÜİ‹[]]Y¶o¶a6)öªH6a¶)öav-6+¶-OÜÜ[‰ÎÂˆ™]\›ˆ	ÏÜ[ˆÛ\ÜÏHœÜİ‹Z\˜[‹\]Hˆ›ÛOHš[YÈˆ\šXK[X™[H¶o¶a6)öªH	È
ÈÛÈ
È	È	È
È]\ˆ
È	È	È
È™YH
È	È6)öã6,v)öaˆ	È
È™YÚ[Ûˆ
È	ÈÜ[ˆÛ\ÜÏHœÜİ‹Z\˜[‹X˜[™Ü[ˆÛ\ÜÏHœÜİ‹Y›YËXÛÛÜœÈÜÜ[ÛX[’K”‹ÜÛX[ÜÜ[Ü[ˆÛ\ÜÏHœÜİ‹Z\˜[‹]ÛÈ‰È
ÈÛÈ
È	ÏÜÜ[Ü[ˆÛ\ÜÏHœÜİ‹Z\˜[‹[]\ˆ‰È
È]\ˆ
È	ÏÜÜ[Ü[ˆÛ\ÜÏHœÜİ‹Z\˜[‹]™YH‰È
È™YH
È	ÏÜÜ[Ü[ˆÛ\ÜÏHœÜİ‹Z\˜[‹XÛÙHÛX[¶)öã6,v)öaÜÛX[‰È
È™YÚ[Ûˆ
È	ÏØÜÜ[ÜÜ[‰ÎÂˆBˆÜÜË^ÛÛ[
ÏH	ËœÜİ‹Z\˜[‹\]^Ù\Ü^Nš[›[™KY›^Ù\™Xİ[Û›Ø[YÛ‹Z][\Îœİ™]ÚÛZ[‹]ÚYŒNLÚZYÚ\Ø˜XÚÙÜ›İ[™ˆÙ™™ØÛÛÜˆÌMÌYØ›Ü™\ŒœÛÛYÌŒÌ˜ŒÌÎØ›Ü™\‹\˜Y]\Î\Ûİ™\™›İÎšY[İÚ]K\ÜXÙN››İÜ˜\Ù›ÛY˜[Z[N•˜^š\›X]‹ZÛXKØ[œË\Ù\šYØ›Ş\ÚYİÎŒœ\ÌM˜LÍÌMÎİ™\XØ[X[YÛ›ZY_KœÜİ‹Z\˜[‹X˜[™Ù\Ü^N™›^Ù›^Y\™Xİ[Û˜ÛÛ[[Ø[YÛ‹Z][\Î˜Ù[\Ú\İYKXÛÛ[œÜXÙKX\›İ[™İÚYŒŒÜØ˜XÚÙÜ›İ[™ˆÌMMLNØÛÛÜˆÙ™™Ù›Û\Ú^™NŒLÜKœÜİ‹Z\˜[‹X˜[™ÛX[Ù›Û\Ú^™NÜKœÜİ‹Z\˜[‹]ÛËœÜİ‹Z\˜[‹]™YKœÜİ‹Z\˜[‹[]\Ù\Ü^N™›^Ø[YÛ‹Z][\Î˜Ù[\Ú\İYKXÛÛ[˜Ù[\Ù›Û\Ú^™NŒMÜÙ›Û]ÙZYÚÜY[™ÎŒ\KœÜİ‹Z\˜[‹[]\ÛZ[‹]ÚYŒÜKœÜİ‹Z\˜[‹XÛÙ^Ø›Ü™\‹[YŒœÛÛYÌŒÌ˜ŒÌÎÙ\Ü^N™›^Ù›^Y\™Xİ[Û˜ÛÛ[[Ø[YÛ‹Z][\Î˜Ù[\Ú\İYKXÛÛ[˜Ù[\ÜY[™ÎŒ\ÜÛ[™KZZYÚŒKŒŸKœÜİ‹Z\˜[‹XÛÙHÛX[Ù›Û\Ú^™N\KœÜİ‹Z\˜[‹XÛÙHÙ›Û\Ú^™NŒMÜKœÜİ‹Yš[\‹\[™[Ø˜XÚÙÜ›İ[™›[™X\‹YÜ˜YY[
LŒYËÙŒ˜Y‹Ù™™ŠNØ›Ü™\Œ\ÛÛYÙYX™LØ›Ü™\‹\˜Y]\ÎŒMœÜY[™ÎŒM\ÛX\™Ú[‹X›İÛNŒMKœÜİ‹Yš[\‹YÜšYÙ\Ü^N™ÜšYÙÜšY][\]KXÛÛ[[œÎœ™\X]
]]ËYš]Z[›X^
MŒYœŠJNÙØ\ŒLœØ[YÛ‹Z][\Î™[™KœÜİ‹Yš[\‹YÜšYX™[Ù\Ü^N™ÜšYÙØ\\Ù›Û\Ú^™NŒLœÙ›Û]ÙZYÚÌØÛÛÜˆÌÌM_KœÜİ‹Yš[\‹YÜšYœÜİ‹Z[œ]İÚYŒL	NÛZ[‹ZZYÚœKœÜİ‹Yš[\‹\[™[ŞÛX\™Ú[ŒLØÛÛÜˆÌLÌØ_KœÜİ‹]X›K]Ü˜\Ûİ™\™›İË^˜]]ÎÛX^]ÚYŒL	_KœÜİ‹]X›H›ÙHšİ™\Ø˜XÚÙÜ›İ[™ˆÙŒY_KœÜİ‹]X›HİÚ]K\ÜXÙN››İÜ˜\KœÜİ‹]X›Hİ™\XØ[X[YÛ›ZY_KœÜİ‹Y[\K\İ]^İ^X[YÛ˜Ù[\ÜY[™ÎŒØÛÛÜˆÍŒÍÍM™_KœÜİ‹]XœÈ]ÛÛZ[‹ZZYÚœKœÜİ‹\›İËXÛZ[‹ZZYÚŒÎPYYXJX^]ÚY
^ËœÜİ‹\YÙKZÜİÜY[™ÎKœÜİ‹Yš[\‹YÜšYÙÜšY][\]KXÛÛ[[œÎŒYœˆYœŸKœÜİ‹Z\˜[‹\]^ÛZ[‹]ÚYŒMÍ\KœÜİ‹Yš[\‹\[™[ÜY[™ÎŒL_IÎÂˆÜÜË^ÛÛ[
ÏH	ËœÜİ‹Y›YËXÛÛÜœŞİÚYŒM\ÚZYÚŒL\Ø›Ü™\Œ\ÛÛYÙØ˜XÚÙÜ›İ[™›[™X\‹YÜ˜YY[
È›İÛKÌŒÎYÌÉKÙ™™ˆÌÉH‰KÙL‰HL	J_IÎÂˆÜÜË^ÛÛ[
ÏH	ËœÜİ‹Z[›[™K\YÙHœÜİ‹ZXYØ˜XÚÙÜ›İ[™›[™X\‹YÜ˜YY[
LLYËÌNMÌLÎÊNÜY[™ÎŒNŒœKœÜİ‹Z[›[™K\YÙHœÜİ‹]XœŞÙØ\ÜY[™ÎŒLœMœØ˜XÚÙÜ›İ[™ˆÙYŒNØ›Ü™\‹X›İÛNŒ\ÛÛYÙ™MÙLŸKœÜİ‹Z[›[™K\YÙHœÜİ‹]XœÈ]ÛØ›Ü™\‹\˜Y]\ÎŒL\Ù›Û]ÙZYÚÌİ˜[œÚ][Û˜˜XÚÙÜ›İ[™ŒM\Ë›Ü™\‹XÛÛÜˆŒM\Ë›Ş\ÚYİÈŒM\ßKœÜİ‹Z[›[™K\YÙHœÜİ‹]XœÈ]Û‹›ÛØ›Ş\ÚYİÎŒÜL\ÌÌMŒKœÜİ‹Z[›[™K\YÙHœÜİ‹XØ\™Ø›Ü™\‹\˜Y]\ÎŒMœØ›Ü™\Œ\ÛÛYÙLX™MØ›Ş\ÚYİÎŒÜMÌXÍÌØŒŸKœÜİ‹Z[›[™K\YÙHœÜİ‹XXİ[ÛœŞÙØ\ŒLÙ›^]Ü˜\Ü˜\KœÜİ‹Z[›[™K\YÙHœÜİ‹Z[œ]™›Øİ\ŞÛİ][™NŒœÛÛYÎXÍ˜XÎÛİ][™K[Ù™œÙ]Œ\KœÜİ‹Z[›[™K\YÙH]Û™›Øİ\Ë]š\ÚX›^Ûİ][™NŒÜÛÛYÍXYÛİ][™K[Ù™œÙ]ŒœKœÜİ‹Z[›[™K\YÙHœÜİ‹\YÙ\Ù\Ü^N™›^Ú\İYKXÛÛ[˜Ù[\Ø[YÛ‹Z][\Î˜Ù[\Ù›^]Ü˜\Ü˜\ÙØ\ŒLœÜY[™ÎŒMœØ›Ü™\‹]ÜŒ\ÛÛYÙMYYN_KœÜİ‹Z[›[™K\YÙHœÜİ‹]X›^İÚYŒL	NØ›Ü™\‹XÛÛ\ÙNœÙ\\˜]NØ›Ü™\‹\ÜXÚ[™ÎŒKœÜİ‹Z[›[™K\YÙHœÜİ‹]X›HØ˜XÚÙÜ›İ[™ˆÙXÙYŒØÛÛÜˆÌYNMßKœÜİ‹Z[›[™K\YÙHœÜİ‹]X›HØ›Ü™\‹X›İÛNŒ\ÛÛYÙXYŒYPYYXJ™Y™\œË\™YXÙY[[İ[Ûœ™YXÙJ^ËœÜİ‹Z[›[™K\YÙHœÜİ‹]XœÈ]Ûİ˜[œÚ][Û››Û™__IÎÂˆ[˜İ[ÛˆÜİ˜\œÊ][\Ë[Z]H
HÈÛÛœİHH
][\È×JKœÛXÙJ[Z]
NÈYˆ
XK›[™İ
Bˆ™]\›ˆ	Ï]ˆÛ\ÜÏHœÜİ‹Y[\KXÚ\¶+ö)ö+öaø #6)öã6*6,v)öã6a¶av)öã6-6b6+6b6+È6a¶+ö)ö,v+ËÙ]‰ÎÈÛÛœİ^HX]›X^
K‹‹˜K›X\
Oˆ[X™\Š›ŠH
JNÈ™]\›ˆ	Ï]ˆÛ\ÜÏHœÜİ‹X˜\œÈ‰È
ÈK›X\
Oˆ	Ï]ˆÛ\ÜÏHœÜİ‹X˜\‹\›İÈ]ˆÛ\ÜÏHœÜİ‹X˜\‹[X™[ˆ]OH‰È
È\ØÊ›X™[	öa¶)öav-6+¶-IÊH
È	È‰È
È\ØÊ›X™[	öa¶)öav-6+¶-IÊH
È	ÏÙ]]ˆÛ\ÜÏHœÜİ‹X˜\‹]˜XÚÈ]ˆÛ\ÜÏHœÜİ‹X˜\‹Yš[ˆİ[OHÚY‰È
ÈX]›X^
‹X]œ›İ[™

[X™\Š›ŠH
HÈ^
ˆL
JH
È	ÉHÙ]Ù]]ˆÛ\ÜÏHœÜİ‹X˜\‹]˜[YH‰È
ÈÜİ‘˜J›ŠH
È	ÏÙ]Ù]‰ÊKš›Ú[Š	ÉÊH
È	ÏÙ]‰ÎÈBˆ[˜İ[ÛˆÜİ•™[™
][\ÊHÈÛÛœİHH][\È×NÈYˆ
XK›[™İ
Bˆ™]\›ˆ	Ï]ˆÛ\ÜÏHœÜİ‹Y[\KXÚ\¶aöa¶b6,ˆ6,ö)ö*6`¶aø #6)öã6*ö*6*ˆ6a¶-6+öaÈ6)ö,ö*‹Ù]‰ÎÈÛÛœİ^HX]›X^
K‹‹˜K›X\
Oˆ[X™\Š›ŠH
JNÈ™]\›ˆ	Ï]ˆÛ\ÜÏHœÜİ‹]™[™‰È
ÈK›X\
Oˆ	Ï]ˆÛ\ÜÏHœÜİ‹]™[™XÛÛ‰È
ÈÜİ‘˜J›ŠH
È	ÏØ]ˆÛ\ÜÏHœÜİ‹]™[™X˜\ˆˆİ[OHšZYÚ‰È
ÈX]›X^
ËX]œ›İ[™

[X™\Š›ŠH
HÈ^
ˆLÍJJH
È	ÜÙ]ÛX[‰È
È\ØÊİš[™Ê[H	ÉÊKœ™\XÙJ×ŠÍJKKË	ÉKÉÊJH
È	ÏÜÛX[Ù]‰ÊKš›Ú[Š	ÉÊH
È	ÏÙ]‰ÎÈBˆ[˜İ[ÛˆÜİ‘Û]
][\ÊHÈÛÛœİHH
][\È×JKœÛXÙJŠNÈYˆ
XK›[™İ
Bˆ™]\›ˆ	Ï]ˆÛ\ÜÏHœÜİ‹Y[\KXÚ\¶+ö)ö+öaø #6)öã6*6,v)öã6a¶av)öã6-6b6+6b6+È6a¶+ö)ö,v+ËÙ]‰ÎÈÛÛœİİ[HX]›X^
KKœ™YXÙJ
Ë
HOˆÈ
È
[X™\Š›ŠH
K
JNÈÛÛœİÛÛÜœÈHÉÈÌØMY‰Ë	ÈÌL™N‰Ë	ÈÙNXLM‰Ë	ÈØM	Ë	ÈÍ™M˜N	Ë	ÈÍÌNM‰×NÈ]İ\HÈÛÛœİİÜÈHK›X\

JHOˆÈÛÛœİ[™Hİ\
È
[X™\Š›ŠH
HÈİ[
ˆÍŒÈÛÛœİˆHÛÛÜœÖÚH	HÛÛÜœË›[™İH
È	È	È
Èİ\
È	ÙYÈ	È
È[™
È	ÙYÉÎÈİ\H[™È™]\›ˆÈJKš›Ú[Š	Ë	ÊNÈ™]\›ˆ	Ï]ˆÛ\ÜÏHœÜİ‹YÛ]]Ü˜\]ˆÛ\ÜÏHœÜİ‹YÛ]ˆİ[OH˜˜XÚÙÜ›İ[™˜ÛÛšXËYÜ˜YY[
	È
ÈİÜÈ
È	ÊHÙ]]ˆÛ\ÜÏHœÜİ‹[YÙ[™‰È
ÈK›X\

JHOˆ	Ï]Hİ[OH˜˜XÚÙÜ›İ[™‰È
ÈÛÛÜœÖÚH	HÛÛÜœË›[™İH
È	ÈÚO‰È
È\ØÊ›X™[	öa¶)öav-6+¶-IÊH
È	È‰È
ÈÜİ‘˜J›ŠH
È	ÏØÙ]‰ÊKš›Ú[Š	ÉÊH
È	ÏÙ]Ù]‰ÎÈBˆ\Ş[˜È[˜İ[ÛˆÜ[Š\™Ù]ÛÛÜÙJHÈYˆ
Ëœ›Ûİ
Bˆ™]\›ÈÛÛœİHH]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKØXØÙ\ÜÉÊNÈYˆ
XK˜[İÙY
Bˆ›İÈ\œ›ÜŠ	ö+ö,ö*¶,v,öã6*6aÈ6,ö,vb6ã6,È6av+ö)ö,v,È6*6,v)öã6+v,ö)ö*6-6av)È6`v.v)öa6a¶ã6,ö*‹‰ÊNÈË˜XØÙ\ÜÈHNÈÛÛœİ™\ÛÛ™YH™\ÛÛ™TØÚÛÛYÙRÜİ
\™Ù]
NÈÛÛœİÜİH™\ÛÛ™YšÜİÈÛÛœİHHØİ[Y[˜Ü™X]Q[[Y[
	Ù]‰ÊNÈK˜Û\ÜÓ˜[YHH	ÜÜİ‹Z[›[™K\YÙIÎÈKš[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹X›Ş]ˆÛ\ÜÏHœÜİ‹ZXY¶,ö,vb6ã6,È6av+ö)ö,v,ÏØ]ÛˆÛ\ÜÏHœÜİ‹XÛÜÙH¶*6,ö*¶aØ]ÛÙ]]ˆÛ\ÜÏHœÜİ‹]XœÈ]Ûˆ]K]H™\Ú›Ø\™ˆÛ\ÜÏH›Ûˆ¶+ö)ö-6*6b6,v+ÏØ]Û]Ûˆ]K]H˜Ü™X]H¶*ö*6*ˆ6*6)ö,¶+öã6+ÏØ]Û]Ûˆ]K]Hš[œÜXİ[ÛœÈ¶*6)ö,¶+öã6+öaö)È6b6*¶+¶a6`v)ö*Ø]Û]Ûˆ]K]H›X\¶a¶`¶-6aÈ6*6)ö,¶+öã6+öaö)ÏØ]Û]Ûˆ]K]H™ZXÛ\È¶+¶b6+ö,vb6aö)ÏØ]Û]Ûˆ]K]HœØÚÛÛÈ¶av+ö)ö,v,ÏØ]Û]Ûˆ]K]H˜ÛÛ\[šY\È¶-6,vªv*¸ #6aö)ÏØ]Û]Ûˆ]K]Hš[\Ü¶b6,vb6+È^Ù[Ø]Û]Ûˆ]K]Hœ™\ÜÈ¶«ö,¶)ö,v-8 #6aö)ÏØ]Û]Ûˆ]K]H˜ÛÛ™šYÈ¶*¶a¶.6ã6av)ö*Ø]Û]Ûˆ]K]Hœ\›Z\ÜÚ[ÛœÈ¶+ö,ö*¶,v,öã8 #6aö)ÏØ]ÛÙ]]ˆÛ\ÜÏHœÜİ‹X›ÙHÙ]Ù]‰ÎÈÜİ˜\[™Ú[
JNÈËœ›ÛİHNÈÛÛœİÛÜÙHH

HOˆÈHÂˆKœ™[[İ™J
NÂˆBˆØ]Ú
ÊHÈHYˆ
™\ÛÛ™Y›İÛ™Y
HÂˆHÂˆÜİœ™[[İ™J
NÂˆBˆØ]Ú
ÊHÈBˆHËœ›ÛİH[ÈHÂˆÛÛÜÙH	‰ˆÛÛÜÙJ
NÂˆBˆØ]Ú
ÊHÈHNÈKœ]Y\TÙ[XİÜ[
	ÖÙ]K]IÊK™›Ü‘XXÚ
OˆÈÛÛœİÈH™]\Ù]ÈYˆ
ÈOOH	ØÛÛ™šYÉÈ	‰ˆXK˜Ø[—ÙY]
Bˆœİ[K™\Ü^HH	Û›Û™IÎÈYˆ
ÈOOH	ØÜ™X]IÈ	‰ˆXK˜Ø[—ØÜ™X]JBˆœİ[K™\Ü^HH	Û›Û™IÎÈYˆ
ÈOOH	Ú[\Ü	È	‰ˆXK˜Ø[—Ú[\Ü
Bˆœİ[K™\Ü^HH	Û›Û™IÎÈYˆ
ÈOOH	Ü™\ÜÉÈ	‰ˆXK˜Ø[—Ü™\Ü
Bˆœİ[K™\Ü^HH	Û›Û™IÎÈJNÈKœ]Y\TÙ[XİÜŠ	ËœÜİ‹XÛÜÙIÊK›Û˜ÛXÚÈHÛÜÙNÈK˜Y]™[\İ[™\Š	ØÛXÚÉËHOˆÈÛÛœİˆHK\™Ù]˜ÛÜÙ\İ
	ÖÙ]K]IÊNÈYˆ
ŠHÂˆKœ]Y\TÙ[XİÜ[
	ÖÙ]K]IÊK™›Ü‘XXÚ
Oˆ˜Û\ÜÓ\İœ™[[İ™J	ÛÛ‰ÊJNÂˆ‹˜Û\ÜÓ\İ˜Y
	ÛÛ‰ÊNÂˆ™[™\Š‹™]\Ù]
NÂˆHJNÈ]ØZ]™[™\Š	Ù\Ú›Ø\™	ÊNÈBˆ[˜İ[ÛˆÛÜÙJ
HÈ˜\ˆØNÈ
ØHHËœ›Ûİ
HOOH[ØHOOH›ÚYÈ›ÚYˆØKœ™[[İ™J
NÈËœ›ÛİH[ÈBˆ\Ş[˜È[˜İ[Ûˆ™[™\Š
HÂˆ˜\ˆØKØ‹ØËÙKÙ‹ÙÎÂˆÛÛœİ›ÛİHËœ›ÛİÂˆYˆ
\›Ûİ\›Ûİš\ĞÛÛ›™XİY
Bˆ™]\›ÂˆÛÛœİˆH›Ûİœ]Y\TÙ[XİÜŠ	ËœÜİ‹X›ÙIÊNÂˆYˆ
XŠBˆ™]\›Âˆ‹š[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹[\ÙÈ¶+ö,H6+v)öa6+ö,vã6)ö`v*ˆ6)ö-öa6)ö.v)ö*¸ )Ù]‰ÎÂˆHÂˆYˆ
OOH	Ú[\Ü	ÊHÂˆYˆ
J]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKØXØÙ\ÜÉÊJK˜Ø[—Ú[\Ü
HÂˆ‹š[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹[\ÙÈ¶av+6b6,ˆ6b6,vb6+È^Ù[6*6,v)öã6-6av)È6`v.v)öa6a¶ã6,ö*‹Ù]‰ÎÂˆ™]\›ÂˆBˆ‹š[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹XØ\™Ï¶b6,vb6+È6-6,vªv*¸ #6aö)È6b6av+ö)ö,v,ÏÚÏ¶`v)öã6aŞ6avã8 #6*¶b6)öa¶+È6ã6ªH6-6ã6*ˆ6ã6)È6¡¶a¶+È6-6ã6*ˆ6+ö)ö-6*¶aÈ6*6)ö-6+Ëˆ6aö,H6av+ö,v,öaÈ6`v`¶-È6ã6ªH0ªö-6,vªv*ˆ6av+6,vã6,ö,vb6ã6,È6+ö)öa¶-8 #6(¶avb6,¶ã0®È6+ö)ö,v+È6b6aö,H6-6,vªv*ˆ6avã8 #6*¶b6)öa¶+È6¡¶a¶+È6av+ö,v,öaÈ6+ö)ö-6*¶aÈ6*6)ö-6+ËÜ[œ]YHœÜİ‹Yš[HˆÛ\ÜÏHœÜİ‹Yš[Hˆ\OH™š[HˆXØÙ\H‹Ş]ˆÛ\ÜÏHœÜİ‹XXİ[ÛœÈ]ÛˆYHœÜİ‹\XÚÈ¶)öa¶*¶+¶)ö*6`v)öã6a^Ù[Ø]Û]ÛˆÛ\ÜÏH˜[ˆYHœÜİ‹][\]H¶+ö)öa¶a6b6+È6`¶)öa6*6o¶ã6-6a¶aö)ö+öãØ]ÛÙ]]ˆYHœÜİ‹\™\İ[Ù]Ù]‰ÎÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÜÜİ‹\XÚÉÊK›Û˜ÛXÚÈH

HOˆ‹œ]Y\TÙ[XİÜŠ	ÈÜÜİ‹Yš[IÊK˜ÛXÚÊ
NÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÜÜİ‹Yš[IÊK›Û˜Ú[™ÙHH\Ş[˜È
JHOˆÈÛÛœİˆHK\™Ù]™š[\ÖÌNÈYˆ
YŠBˆ™]\›ÈÛÛœİ™H™]È›Ü›Q]J
NÈ™˜\[™
	Ùš[IËŠNÈHÂˆÛÛœİˆH]ØZ]™]Ú
	ËØ\KÜØÚÛÛ\Ù\šXÙKÚ[\Ü\™]šY]ÉËÈY]Ùˆ	ÔÔÕ	ËXY\œÎˆËÚÙ[ˆÈÈ]]Üš^˜][ÛˆËÚÙ[ˆHˆßK›ÙNˆ™JNÂˆÛÛœİH]ØZ]‹šœÛÛŠ
NÂˆYˆ
\‹›ÚÊBˆ›İÈ\œ›ÜŠ™\œ›Üˆ	ö+¶-ö)ÉÊNÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÜÜİ‹\™\İ[	ÊKš[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹[\ÙÈ¶o¶ã6-8 #6a¶av)öã6-ˆ	È
Èœ›İÜÈ
È	È6,v+öã6`H6-6,vªv*ˆ6+6+öã6+Îˆ	È
È›™]×ØÛÛ\[šY\È
È	È6-6,vªv*ˆ6avb6+6b6+Îˆ	È
È™^\İ[™×ØÛÛ\[šY\È
È	È6av+ö,v,öaÈ6+6+öã6+Îˆ	È
È›™]×ÜØÚÛÛÈ
È	È6av+ö,v,öaÈ6avb6+6b6+Îˆ	È
È™^\İ[™×ÜØÚÛÛÈ
È	È6,v)ö*6-öaÈ6+6+öã6+Îˆ	È
È›™]×ÛX\[™ÜÈ
È	È6,v)ö*6-öaÈ6avb6+6b6+Îˆ	È
È™^\İ[™×ÛX\[™ÜÈ
È	È6,v+öã6`H6*¶ªv,v)ö,vãˆ	È
È™\XØ]WÜ›İÜÈ
È	È6+¶-ö)Îˆ	È
È™\œ›ÜœË›[™İ
È	ÏÙ]‰È
È
™\œ›ÜœË›[™İÈ	Ï™O‰È
È\ØÊ™\œ›ÜœËš›Ú[Š	×‰ÊJH
È	ÏÜ™O‰Èˆ	ÉÊH
È	Ï]ÛˆYHœÜİ‹XÛÛ™š\›KZ[\Ü¶*¶(öã6ã6+È6b6b6,vb6+È6a¶aö)öã6ãØ]Û‰ÎÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÜÜİ‹XÛÛ™š\›KZ[\Ü	ÊK›Û˜ÛXÚÈH\Ş[˜È

HOˆÈÛÛœİ™ˆH™]È›Ü›Q]J
NÈ™‹˜\[™
	Ùš[IËŠNÈHÂˆÛÛœİœˆH]ØZ]™]Ú
	ËØ\KÜØÚÛÛ\Ù\šXÙKÚ[\Ü	ËÈY]Ùˆ	ÔÔÕ	ËXY\œÎˆËÚÙ[ˆÈÈ]]Üš^˜][ÛˆËÚÙ[ˆHˆßK›ÙNˆ™ˆJNÂˆÛÛœİH]ØZ]œ‹šœÛÛŠ
NÂˆYˆ
\œ‹›ÚÊBˆ›İÈ\œ›ÜŠ™\œ›Üˆ	ö+¶-ö)ÉÊNÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÜÜİ‹\™\İ[	ÊKš[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹[\ÙÈ¶b6,vb6+È6a¶aö)öã6ã6-6+ö&È6-6,vªv*ˆ6+6+öã6+Îˆ	È
È˜ÛÛ\[šY\×ØÛİ[
È	ö#6av+ö,v,öaÈ6+6+öã6+Îˆ	È
ÈœØÚÛÛ×ØÛİ[
È	ö#6,v)ö*6-öaÎˆ	È
È›X\[™Ü×ØÛİ[
È	ö#6+¶-ö)Îˆ	È
È™\œ›ÜœË›[™İ
È	ÏÙ]‰È
È
™\œ›ÜœË›[™İÈ	Ï™O‰È
È\ØÊ™\œ›ÜœËš›Ú[Š	×‰ÊJH
È	ÏÜ™O‰Èˆ	ÉÊNÂˆBˆØ]Ú

HÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÜÜİ‹\™\İ[	ÊKš[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹[\ÙÈ‰È
È\ØÊ›Y\ÜØYÙJH
È	ÏÙ]‰ÎÂˆHNÂˆBˆØ]Ú

HÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÜÜİ‹\™\İ[	ÊKš[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹[\ÙÈ‰È
È\ØÊ›Y\ÜØYÙJH
È	ÏÙ]‰ÎÂˆHNÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÜÜİ‹][\]IÊK›Û˜ÛXÚÈH

HOˆÈÛÛœİ›İÜÈHÖÉöªv+È6av+ö,v,öaÉË	öa¶)öaH6av+ö,v,öaÉË	öa¶)ö+vã6aÈ6(¶avb6,¶-6ã	Ë	öa¶b6.H6av+ö,v,öaÉË	ö-6,vªv*ˆ6av+6,vã6,ö,vb6ã6,È6+ö)öa¶-8 #6(¶avb6,¶ã	Ë	öav+öã6,v.v)öava	Ë	ö*¶a6`vaˆ6aöav,v)öaÈ6av+öã6,v.v)öava	Ë	ö*¶a6`vaˆ6*ö)ö*6*‰Ë	ö(¶+ö,v,ÉË	ö.v,v-ˆ6+6.¶,v)ö`vã6)öã6ã	Ë	ö-öb6a6+6.¶,v)ö`vã6)öã6ã	Ë	öav+ö)ö,v,È6*ö*6*¸ #6-6+öaÉË	ö*¶.v+ö)ö+È6a¶av)öã6a¶+ö«ö)öa‰Ë	öb6-¶.vã6*ˆ6-6,vªv*‰Ë	ö*¶ªvavã6a6o¶,vb6`v)öã6a	×KÉÌLIË	ö)öav)öaH6.va6ã	Ë	öìIË	öo¶,ö,v)öa¶aÉË	ö-6,vªv*ˆ6a¶avb6a¶aÉË	öav+öã6,H6a¶avb6a¶aÉË	ÌLML	Ë	ÌLKL	Ë	ö(¶+ö,v,ÉË	ÉË	ÉË	Ì	Ë	Ì	Ë	ö`v.v)öa	Ë	öa¶)ö`¶-I×WNÈÛÛœİÜÈHÖ][Ë˜[ØWİ×ÜÚY]
›İÜÊKØˆHÖ][Ë˜›ÛÚ×Û™]Ê
NÈÖ][Ë˜›ÛÚ×Ø\[™ÜÚY]
Ø‹ÜË	öav+ö)ö,v,Ëv-6,vªv*¸ #6aö)ÉÊNÈÖÜš]Qš[JØ‹	ö`¶)öa6*öb6,vb6+×ö,ö,vb6ã6,×öav+ö)ö,v,ËŞ	ÊNÈNÂˆ™]\›ÂˆBˆYˆ
OOH	Ù\Ú›Ø\™	ÊHÂˆÛÛœİH]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKÙ\Ú›Ø\™	ÊNÂˆÛÛœİÈH˜Ø\™ÈßNÂˆ‹š[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹Y\Ú]ˆÛ\ÜÏHœÜİ‹Y\ÚZXY]¶+ö)ö-6*6b6,v+È6av+öã6,vã6*¶ã6,ö,vb6ã6,È6av+ö)ö,v,ÏÚ¶*¶-vb6ã6,H6a6+v.6aø #6)öã6)ö,ˆ6o¶b6-6-6av+ö)ö,v,ö#6*6)ö,¶,v,öã6#6*¶+¶a6`v)ö*ˆ6b6b6-¶.vã6*ˆ6a¶)öb6«ö)öaÜÙ]]ÛˆYHœÜİ‹Y\Ú\™Yœ™\ÚˆÛ\ÜÏHœÜİ‹Y\Ú\™Yœ™\Ú¸¡®È6*6,vb6,¶,v,ö)öa¶ãØ]ÛÙ]]ˆÛ\ÜÏHœÜİ‹ZÜ\È]ˆÛ\ÜÏHœÜİ‹ZÜHÛX[¶av+ö)ö,v,È6`v.v)öaÜÛX[İ›Û™Ï‰È
ÈÜİ‘˜JË˜Xİ]™WÜØÚÛÛÊH
È	ÏÜİ›Û™ÏÜ[¶o¶b6-6-6`v.v)öaÜÜ[Ù]]ˆÛ\ÜÏHœÜİ‹ZÜHÛX[¶+ö)öa¶-8 #6(¶avb6,¶)öaˆ6,ö,vb6ã6,ø #6-6+öaÏÜÛX[İ›Û™Ï‰È
ÈÜİ‘˜JËœİY[ÊH
È	ÏÜİ›Û™ÏÜ[¶av+6avb6.H6*ö*6*¸ #6-6+öaÏÜÜ[Ù]]ˆÛ\ÜÏHœÜİ‹ZÜHÛX[¶-6,vªv*¸ #6aö)öã6`v.v)öaÜÛX[İ›Û™Ï‰È
ÈÜİ‘˜JË˜Xİ]™WØÛÛ\[šY\ÊH
È	ÏÜİ›Û™ÏÜ[¶av+6,vã6)öaˆ6,ö,vb6ã6,ÏÜÜ[Ù]]ˆÛ\ÜÏHœÜİ‹ZÜHÛX[¶+¶b6+ö,vb6aö)öã6`v.v)öaÜÛX[İ›Û™Ï‰È
ÈÜİ‘˜JË˜Xİ]™Wİ™ZXÛ\ÊH
È	ÏÜİ›Û™ÏÜ[¶a¶)öb6«ö)öaˆ6*6)ö,¶,v,öã8 #6-6+öaÏÜÜ[Ù]]ˆÛ\ÜÏHœÜİ‹ZÜHÛX[¶*6)ö,¶+öã6+È6ìöì6,vb6,ˆ6)ö+¶ã6,OÜÛX[İ›Û™Ï‰È
ÈÜİ‘˜JËš[œÜXİ[Ûœ×ÌÌ
H
È	ÏÜİ›Û™ÏÜ[¶)ö,ˆ	È
ÈÜİ‘˜JËš[œÜXİ[ÛœÊH
È	È6*6)ö,¶+öã6+È6ªvaÜÜ[Ù]]ˆÛ\ÜÏHœÜİ‹ZÜHÛX[¶*6)ö,¶,v,ö)öaˆ6`v.v)öaÜÛX[İ›Û™Ï‰È
ÈÜİ‘˜JË˜Xİ]™WÚ[œÜXİÜœÈ
H
È	ÏÜİ›Û™ÏÜ[¶*6)ö,¶,v,È6+ö)ö,v)öã6b6-¶.vã6*ˆ6`v.v)öaÜÜ[Ù]Ù]]ˆÛ\ÜÏHœÜİ‹XÚ\YÜšY]ˆÛ\ÜÏHœÜİ‹XÚ\XØ\™Ï¶,vb6a¶+È6*6)ö,¶+öã6+öaö)öã6av)öaö)öa¶aÏÚÏ‰È
ÈÜİ•™[™
™[™
H
È	ÏÙ]]ˆÛ\ÜÏHœÜİ‹XÚ\XØ\™Ï¶b6-¶.vã6*ˆ6«öb6)öaöã6+¶b6+ö,vb6aö)ÏÚÏ‰È
ÈÜİ‘Û]
˜Ù\YšXØ]\ÊH
È	ÏÙ]]ˆÛ\ÜÏHœÜİ‹XÚ\XØ\™Ï¶*6)ö,¶+öã6+È6*6aÈ6*¶`vªvã6ªH6a¶)ö+vã6aÏÚÏ‰È
ÈÜİ˜\œÊ˜WÙ\İšXİ
H
È	ÏÙ]]ˆÛ\ÜÏHœÜİ‹XÚ\XØ\™Ï¶*¶.v+ö)ö+È6av+ö)ö,v,È6b6+ö)öa¶-8 #6(¶avb6,¶)öaˆ6*6aÈ6*¶`vªvã6ªH6a¶)ö+vã6aÏÚÏ‰È
ÈÜİ˜\œÊ
™\İšXİÜØÚÛÛÈ×JK›X\
Oˆ
ÈX™[ˆ›X™[ˆœİY[ÈJJK
H
È	ÏÙ]]ˆÛ\ÜÏHœÜİ‹XÚ\XØ\™Ï¶-6,vªv*¸ #6aö)öã6+ö)ö,v)öã6*6ã6-6*¶,vã6aˆ6*6)ö,¶+öã6+ÏÚÏ‰È
ÈÜİ˜\œÊ˜WØÛÛ\[K
H
È	ÏÙ]]ˆÛ\ÜÏHœÜİ‹XÚ\XØ\™Ï¶o¶,v*¶ªv,v)ö,v*¶,vã6aˆ6*¶+¶a6`v)ö*ÚÏ‰È
ÈÜİ˜\œÊ
˜Wİš[Û][Ûˆ×JK™š[\ŠOˆZ\ĞÙ\YšXØ]Uš[Û][ÛŠ›X™[
JK
H
È	ÏÙ]]ˆÛ\ÜÏHœÜİ‹XÚ\XØ\™Ï¶)öa¶b6)ö.H6+¶b6+ö,vb6aö)öã6`v.v)öaÚÏ‰È
ÈÜİ˜\œÊ™ZXÛWİ\\Ë
H
È	ÏÙ]]ˆÛ\ÜÏHœÜİ‹XÚ\XØ\™Ï¶av+ö)ö,v,È6*6)È6*6ã6-6*¶,vã6aˆ6*6)ö,¶+öã6+ÏÚÏ‰È
ÈÜİ˜\œÊ˜WÜØÚÛÛ
H
È	ÏÙ]Ù]]ˆÛ\ÜÏHœÜİ‹XØ\™ˆİ[OH›X\™Ú[‹]ÜŒœÈİ[OH›X\™Ú[Œ¶`vaö,v,ö*ˆ6*6)ö,¶,v,ö)öaˆ6b6*¶.v+ö)ö+È6*6)ö,¶+öã6+ÏÚÏ]ˆÛ\ÜÏHœÜİ‹Z[œÜXİÜ‹[\İ‰È
È

˜Xİ]™WÚ[œÜXİÜœÈ×JK›[™İÈ
˜Xİ]™WÚ[œÜXİÜœÈ×JK›X\
Oˆ	Ï]ˆİ[OH™\Ü^N™›^Ú\İYKXÛÛ[œÜXÙKX™]ÙY[Ø[YÛ‹Z][\Î˜Ù[\ÙØ\ŒLœÜY[™ÎŒLØ›Ü™\‹X›İÛNŒ\ÛÛYÙYŒYŒ]ˆİ[OH™\Ü^N™›^Ù›^Y\™Xİ[Û˜ÛÛ[[ÙØ\ÛZ[‹]ÚYŒ‰È
È\ØÊ›˜[YH	öa¶)öav-6+¶-IÊH
È	ÏØÛX[İ[OH˜ÛÛÜˆÍ˜Ì‰È
È\ØÊœ›ÛWİ]H	ÉÊH
È	ÏÜÛX[Ù]]ˆİ[OH™\Ü^N™›^Ù›^Y\™Xİ[Û˜ÛÛ[[Ø[YÛ‹Z][\Î™›^\İ\ÙØ\İÚ]K\ÜXÙN››İÜ˜\‰È
ÈÜİ‘˜Jš[œÜXİ[Û—ØÛİ[
H
È	ÈÜ[ˆİ[OH™›Û\Ú^™NŒLÙ›Û]ÙZYÚØÛÛÜˆÍÌH¶*6)ö,¶+öã6+È6ªvaÜÜ[ØÛX[İ[OH˜ÛÛÜˆÍÌH¶ìöì6,vb6,ˆ6)ö+¶ã6,Nˆ	È
ÈÜİ‘˜Jš[œÜXİ[Û—ØÛİ[ÌÌ
H
È	ÏÜÛX[Ù]Ù]‰ÊKš›Ú[Š	ÉÊHˆ	Ï]ˆÛ\ÜÏHœÜİ‹Y[\KXÚ\¶+ö,H6ìöì6,vb6,ˆ6)ö+¶ã6,H6*6)ö,¶+öã6+öã6*6)È6-6a¶)ö,öaöe6*6)ö,¶,v,È6*ö*6*¸ #6-6+öaÈ6*6,v)öã6a¶av)öã6-6b6+6b6+È6a¶+ö)ö,v+ËÙ]‰ÊH
È	ÏÙ]Ù]]ˆÛ\ÜÏHœÜİ‹XØ\™¶-6)ö+¶-H6*¶+¶a6`NØˆ6avã6)öa¶«öã6aˆ	È
ÈÜİ‘˜JË˜]™×İš[Û][Ûœ×Ü\—Ú[œÜXİ[ÛŠH
È	È6avb6,v+È6*¶+¶a6`H6*6aÈ6)ö,¶)öã6aö,H6*6)ö,¶+öã6+È0­È¶avb6)ö,v+È6+ö)ö,v)öã6«öb6)öaöã6a¶)öav.v*¶*6,Kö)ö,v)ö)¶aø #6a¶-6+öaÎØˆ	È
ÈÜİ‘˜JËš[˜[YØÙ\YšXØ]\ÊH
È	È0­È¶ªva6*¶+¶a6`v)ö*Øˆ	È
ÈÜİ‘˜JËš[Û][ÛœÊH
È	ÏÙ]Ù]‰ÎÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÜÜİ‹Y\Ú\™Yœ™\Ú	ÊK›Û˜ÛXÚÈH

HOˆ™[™\Š	Ù\Ú›Ø\™	ÊNÂˆ™]\›ÂˆBˆYˆ
OOH	ØÜ™X]IÊHÂˆÛÛœİ[š]X[HË™Y][™ÈßNÂˆÛÛœİY]HH]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKÛY]IÊNÂˆÛÛœİÜÈH]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKØÛÛ\[šY\ÏÛ[Z]ML	ÊNÂˆÛÛœİÜÈH]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKÜØÚÛÛÏÛ[Z]ML	ÊNÂˆÛÛœİœÈHY]Kš[Û][ÛœÈ×NÂˆÛÛœİÙ^RˆH™]È[‘]U[YQ›Ü›X]
	Ù˜KRT‹]KXØK\\œÚX[‰ËÈYX\ˆ	Û[Y\šXÉË[Ûˆ	Ì‹YYÚ]	Ë^Nˆ	Ì‹YYÚ]	ÈJK™›Ü›X]
™]È]J
JNÂˆÛÛœİ]SÜÈH\œ˜^K™œ›ÛJÈ[™İˆÌŒHK
ËJHOˆÈÛÛœİH™]È]J
NÈœÙ]İ\œÊL‹
NÈœÙ]]J™Ù]]J
H
ÈHHÍŒ
NÈ™]\›ˆ™]È[‘]U[YQ›Ü›X]
	Ù˜KRT‹]KXØK\\œÚX[‰ËÈYX\ˆ	Û[Y\šXÉË[Ûˆ	Ì‹YYÚ]	Ë^Nˆ	Ì‹YYÚ]	ÈJK™›Ü›X]

NÈJNÂˆÛÛœİ[YSÜÈH\œ˜^K™œ›ÛJÈ[™İˆK
ËJHOˆİš[™ÊX]™›ÛÜŠHÈLŠJKœYİ\
‹	Ì	ÊH
È	Î‰È
Èİš[™Ê
H	HLŠH
ˆJKœYİ\
‹	Ì	ÊJNÂˆÛÛœİØÚÛÛ\ÓØÈH[X™\‹š\Ñš[š]J[X™\Š[š]X[œØÚÛÛÛ]]YJJH	‰ˆ[X™\‹š\Ñš[š]J[X™\Š[š]X[œØÚÛÛÛÛ™Ú]YJJNÂˆÛÛœİØÚÛÛØÓ]HØÚÛÛ\ÓØÈÈ[X™\Š[š]X[œØÚÛÛÛ]]YJHˆ[X™\Š[š]X[›]]YJNÂˆÛÛœİØÚÛÛØÓ™ÈHØÚÛÛ\ÓØÈÈ[X™\Š[š]X[œØÚÛÛÛÛ™Ú]YJHˆ[X™\Š[š]X[›Û™Ú]YJNÂˆÛÛœİ\ÙTØÚÛÛØÈHØÚÛÛ\ÓØÈ	‰ˆ[X™\‹š\Ñš[š]J[X™\Š[š]X[›]]YJJH	‰ˆ[X™\‹š\Ñš[š]J[X™\Š[š]X[›Û™Ú]YJJH	‰ˆX]˜XœÊ[X™\Š[š]X[›]]YJHH[X™\Š[š]X[œØÚÛÛÛ]]YJJHŒˆ	‰ˆX]˜XœÊ[X™\Š[š]X[›Û™Ú]YJHH[X™\Š[š]X[œØÚÛÛÛÛ™Ú]YJJHŒÂˆ‹š[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹XØ\™]ˆİ[OH™\Ü^N™›^Ú\İYKXÛÛ[œÜXÙKX™]ÙY[Ø[YÛ‹Z][\Î˜Ù[\ÙØ\Èİ[OH›X\™Ú[Œ‰È
È
[š]X[šYÈ	öb6ã6,v)öã6-6*6)ö,¶+öã6+ÉÈˆ	ö*ö*6*ˆ6*6)ö,¶+öã6+È6+6+öã6+ÉÊH
È	ÏÚÏ]ÛˆYH™‹XØ[˜Ù[ˆÛ\ÜÏH˜[¶*6)ö,¶«ö-6*ˆ6*6aÈ6a6ã6,ö*Ø]ÛÙ]]ˆÛ\ÜÏHœÜİ‹[\ÙÈ¶)ö-öa6)ö.v)ö*ˆ6*6)ö,¶+öã6+È6,v)È6ªv)öava6ªva¶ã6+Ëˆ6avb6`¶.vã6*ˆ6av+ö,v,öaÈ6+ö,H6-vb6,v*ˆ6b6+6b6+È6a¶av)öã6-6+ö)ö+öaÈ6avã8 #6-6b6+È6b6avã8 #6*¶b6)öa¶ã6+È6(¶aˆ6,v)È6)ö-va6)ö+H6b6,6+¶ã6,vaÈ6ªva¶ã6+ËÙ]]ˆÛ\ÜÏHœÜİ‹YÜšYX™[¶a¶)ö+vã6aÈ6(¶avb6,¶-6ãÙ[XİYH™‹Y\İšXİˆÛ\ÜÏHœÜİ‹Z[œ]Ü[Ûˆ˜[YOHˆ¶)öa¶*¶+¶)ö*6ªva¶ã6+ÏÛÜ[Û‰È
È

Y]K™\İšXİÈ×JK›X\
Oˆ	ÏÜ[Ûˆ	È
È
İš[™Ê
HOOHİš[™Ê[š]X[™YXØ][Û˜[Ù\İšXİ	ÉÊHÈ	ÜÙ[XİY	Èˆ	ÉÊH
È	Ï‰È
È\ØÊ
H
È	ÏÛÜ[Û‰ÊKš›Ú[Š	ÉÊJH
È	ÏÜÙ[XİÛX™[X™[¶-6,vªv*ˆ6av+6,vãÙ[XİYH™‹XÛÛ\[HˆÛ\ÜÏHœÜİ‹Z[œ]Ü[Ûˆ˜[YOHˆ¶a¶)öav-6+¶-OÛÜ[Û‰È
ÈÜËš][\Ë›X\
Oˆ	ÏÜ[Ûˆ˜[YOH‰È
ÈšY
È	Èˆ	È
È
[X™\Š[š]X[˜ÛÛ\[WÚY
HOOH[X™\ŠšY
HÈ	ÜÙ[XİY	Èˆ	ÉÊH
È	Ï‰È
È\ØÊ›˜[YJH
È	ÏÛÜ[Û‰ÊKš›Ú[Š	ÉÊH
È	ÏÜÙ[XİÛX™[X™[İ[OH™ÜšYXÛÛ[[ŒKËLH¶+6,ö*¶+6b6ã6av+ö,v,öaÏ[œ]YH™‹\ØÚÛÛ\ÙX\˜ÚˆÛ\ÜÏHœÜİ‹Z[œ]ˆXÙZÛ\H¶a¶)öaH6ã6)È6ªv+È6av+ö,v,öaÈ]ˆYH™‹\ØÚÛÛ\™\İ[Èˆİ[OH›X\™Ú[‹]ÜÜÙ]ÛX™[X™[¶av+ö,v,öaÈ6)öa¶*¶+¶)ö*8 #6-6+öaÏ[œ]YH™‹\ØÚÛÛ[˜[YHˆÛ\ÜÏHœÜİ‹Z[œ]ˆ™XYÛ›H˜[YOH‰È
È\ØÊ[š]X[œØÚÛÛÛ˜[YH	ÉÊH
È	È[œ]YH™‹\ØÚÛÛˆ\OHšY[ˆˆ˜[YOH‰È
È\ØÊ[š]X[œØÚÛÛÚY	ÉÊH
È	ÈÛX™[X™[¶a¶b6.H6av+ö,v,öaÏÙ[XİYH™‹YÙ[™\ˆˆÛ\ÜÏHœÜİ‹Z[œ]‰È
È
Y]K™Ù[™\œÈ×JK›X\
Oˆ	ÏÜ[Ûˆ	È
È
OOH
[š]X[œØÚÛÛÙÙ[™\ˆ	öa¶)öav-6+¶-IÊHÈ	ÜÙ[XİY	Èˆ	ÉÊH
È	Ï‰È
È\ØÊ
H
È	ÏÛÜ[Û‰ÊKš›Ú[Š	ÉÊH
È	ÏÜÙ[XİÛX™[Ù]]ˆYH™‹\ØÚÛÛ[X\ˆÛ\ÜÏHœÜİ‹[X\ˆİ[OHšZYÚŒÍŒÛX\™Ú[Ù\Ü^N‰È
È
[š]X[œØÚÛÛÚYÈ	Ø›ØÚÉÈˆ	Û›Û™IÊH
È	ÈÙ]]ˆYH™‹[X\[›İHˆÛ\ÜÏHœÜİ‹[\ÙÈˆİ[OH™\Ü^N‰È
È
[š]X[œØÚÛÛÚYÈ	Ø›ØÚÉÈˆ	Û›Û™IÊH
È	È¶a¶-6)öa¶«ö,H6av+ö,v,öaÈ6,v)È6avã8 #6*¶b6)öa¶ã6+È6+6)ö*6aø #6+6)È6ªva¶ã6+È6ã6)È6,vb6ã6a¶`¶-öaÈ6+6+öã6+È6a¶`¶-6aÈ6*6,¶a¶ã6+ö&È6,öo¶,È0ªö,6+¶ã6,vaÈ6avb6`¶.vã6*ˆ6av+ö,v,öağ®È6,v)È6*6,¶a¶ã6+ËÙ]]ˆÛ\ÜÏHœÜİ‹XXİ[ÛœÈ]Ûˆ\OH˜]ÛˆˆYH™‹]\ÙKYÜÈˆÛ\ÜÏH˜[¶)ö,ö*¶`v)ö+öaÈ6)ö,ˆ6avb6`¶.vã6*ˆ6`v.va6ã6av+ö,v,öaÏØ]Û]Ûˆ\OH˜]ÛˆˆYH™‹\Ø]™K\ØÚÛÛ[ØÈ¶,6+¶ã6,vaÈ6avb6`¶.vã6*ˆ6av+ö,v,öaÏØ]ÛÙ]]ˆÛ\ÜÏHœÜİ‹XØ\™Ï¶av-6+¶-v)ö*ˆ6+¶b6+ö,vbÚÏ]ˆÛ\ÜÏHœÜİ‹YÜšY]X™[¶o¶a6)öªH6+¶b6+ö,vbÛX™[]ˆİ[OHšZYÚØ›Ü™\ŒœÛÛYÌŒÌŒÎØ›Ü™\‹\˜Y]\Î\Ø˜XÚÙÜ›İ[™ˆÙ™™Ù\Ü^N™›^Ù\™Xİ[Û›Ûİ™\™›İÎšY[ˆ]ˆİ[OHÚYŒÎØ˜XÚÙÜ›İ[™ˆÌLØNNØÛÛÜˆÙ™™Ù\Ü^N™›^Ù›^Y\™Xİ[Û˜ÛÛ[[Ø[YÛ‹Z][\Î˜Ù[\Ú\İYKXÛÛ[˜Ù[\Ù›Û\Ú^™N\Ù›Û]ÙZYÚ’TÜ[ˆİ[OH™›Û\Ú^™NÛX\™Ú[‹]ÜŒÜ¶)öã6,v)öaÜÜ[Ù][œ]YH™‹\ˆˆX^[™İHŒˆˆ[œ][ÙOH›[Y\šXÈˆÛ\ÜÏHœÜİ‹Z[œ]ˆİ[OHšZYÚŒL	NØ›Ü™\ŒØ›Ü™\‹[YŒ\ÛÛYØXXNØ›Ü™\‹\˜Y]\ÎŒİ^X[YÛ˜Ù[\Ù›Û\Ú^™NŒŒœÙ›Û]ÙZYÚˆ˜[YOH‰È
È\ØÊ[š]X[œ]WİÛÈ	ÉÊH
È	È[œ]YH™‹\ˆX^[™İHŒHˆÛ\ÜÏHœÜİ‹Z[œ]ˆİ[OHšZYÚŒL	NØ›Ü™\ŒØ›Ü™\‹[YŒ\ÛÛYØXXNØ›Ü™\‹\˜Y]\ÎŒİ^X[YÛ˜Ù[\Ù›Û\Ú^™NŒŒœÙ›Û]ÙZYÚˆ˜[YOH‰È
È\ØÊ[š]X[œ]WÛ]\ˆ	ÉÊH
È	È[œ]YH™‹\ÈˆX^[™İHŒÈˆ[œ][ÙOH›[Y\šXÈˆÛ\ÜÏHœÜİ‹Z[œ]ˆİ[OHšZYÚŒL	NØ›Ü™\ŒØ›Ü™\‹[YŒ\ÛÛYØXXNØ›Ü™\‹\˜Y]\ÎŒİ^X[YÛ˜Ù[\Ù›Û\Ú^™NŒŒœÙ›Û]ÙZYÚˆ˜[YOH‰È
È\ØÊ[š]X[œ]Wİ™YH	ÉÊH
È	È]ˆİ[OHÚYÌœÙ\Ü^N™›^Ù›^Y\™Xİ[Û˜ÛÛ[[Ø[YÛ‹Z][\Î˜Ù[\Ú\İYKXÛÛ[˜Ù[\Ù›Û]ÙZYÚ¶)öã6,v)öaÜ[ˆİ[OH™›Û\Ú^™NØÛÛÜˆÍÌH¶o¶a6)öªH6ava6ãÜÜ[Ù]Ù]Ù]X™[¶a¶b6.H6+¶b6+ö,vbÙ[XİYH™‹]ˆÛ\ÜÏHœÜİ‹Z[œ]Ü[Ûˆ˜[YOHˆ¶)öa¶*¶+¶)ö*6ªva¶ã6+ÏÛÜ[Û‰È
È\œ˜^K™œ›ÛJ™]ÈÙ]
Éö,ö)öã6,IË‹‹ŠY]K™ZXÛWİ\\È×JWJJK›X\
Oˆ	ÏÜ[Ûˆ	È
È
OOH
[š]X[™ZXÛWİ\HÈ	ÉÈˆ	ÉÊHÈ	ÜÙ[XİY	Èˆ	ÉÊH
È	Ï‰È
È\ØÊ
H
È	ÏÛÜ[Û‰ÊKš›Ú[Š	ÉÊH
È	ÏÜÙ[XİÛX™[X™[¶,va¶«È6+¶b6+ö,vbÙ[XİYH™‹]˜ÈˆÛ\ÜÏHœÜİ‹Z[œ]Ü[Ûˆ˜[YOHˆ¶)öa¶*¶+¶)ö*6ªva¶ã6+ÏÛÜ[Û‰È
È\œ˜^K™œ›ÛJ™]ÈÙ]
Éö,ö)öã6,IË‹‹ŠY]K™ZXÛWØÛÛÜœÈ×JWJJK›X\
Oˆ	ÏÜ[Ûˆ	È
È
OOH
[š]X[™ZXÛWØÛÛÜˆÈ	ÉÈˆ	ÉÊHÈ	ÜÙ[XİY	Èˆ	ÉÊH
È	Ï‰È
È\ØÊ
H
È	ÏÛÜ[Û‰ÊKš›Ú[Š	ÉÊH
È	ÏÜÙ[XİÛX™[]ˆYH™‹]Xİ\İÛK]Ü˜\ˆİ[OH™\Ü^N››Û™HX™[¶a¶b6.H6+¶b6+ö,vb8 %6,ö)öã6,O[œ]YH™‹]Xİ\İÛHˆÛ\ÜÏHœÜİ‹Z[œ]ˆ˜[YOHˆÛX™[Ù]]ˆYH™‹]˜ËXİ\İÛK]Ü˜\ˆİ[OH™\Ü^N››Û™HX™[¶,va¶«È6+¶b6+ö,vb8 %6,ö)öã6,O[œ]YH™‹]˜ËXİ\İÛHˆÛ\ÜÏHœÜİ‹Z[œ]ˆ˜[YOHˆÛX™[Ù]X™[¶,ö,va¶-6ã6aˆ6+6a6b]ˆİ[OH™\Ü^N™›^Ø[YÛ‹Z][\Î˜Ù[\ÙØ\œ]Ûˆ\OH˜]ÛˆˆYH™œ›Û[Z[\ÈˆÛ\ÜÏH˜[¸¢$Ø]Û[œ]YH™‹Yœ›ÛˆÛ\ÜÏHœÜİ‹Z[œ]ˆİ[OH^X[YÛ˜Ù[\ˆˆ˜[YOH‰È
È\ØÊ
ØHH[š]X[œ\ÜÙ[™Ù\—Ùœ›ÛØÛİ[
HOOH[	‰ˆØHOOH›ÚYÈØHˆ
H
È	Èˆ™XYÛ›O]Ûˆ\OH˜]ÛˆˆYH™œ›Û\\ÈŠÏØ]ÛÙ]ÛX™[X™[¶,ö,va¶-6ã6aˆ6.v`¶*]ˆİ[OH™\Ü^N™›^Ø[YÛ‹Z][\Î˜Ù[\ÙØ\œ]Ûˆ\OH˜]ÛˆˆYHœ™X\‹[Z[\ÈˆÛ\ÜÏH˜[¸¢$Ø]Û[œ]YH™‹\™X\ˆˆÛ\ÜÏHœÜİ‹Z[œ]ˆİ[OH^X[YÛ˜Ù[\ˆˆ˜[YOH‰È
È\ØÊ
ØˆH[š]X[œ\ÜÙ[™Ù\—Ü™X\—ØÛİ[
HOOH[	‰ˆØˆOOH›ÚYÈØˆˆ
H
È	Èˆ™XYÛ›O]Ûˆ\OH˜]ÛˆˆYHœ™X\‹\\ÈŠÏØ]ÛÙ]ÛX™[Ù]Ù]]ˆÛ\ÜÏHœÜİ‹XØ\™Ï¶,v)öa¶a¶+öaö#6*¶+¶a6`H6b6,¶av)öaˆ6*6)ö,¶+öã6+ÏÚÏ]ˆÛ\ÜÏHœÜİ‹YÜšYX™[¶a¶b6.H6,v)öa¶a¶+öaÏÙ[XİYH™‹YÈˆÛ\ÜÏHœÜİ‹Z[œ]‰È
È
Y]K™š]™\—ÙÙ[™\œÈ×JK›X\
Oˆ	ÏÜ[Ûˆ	È
È
OOH
[š]X[™š]™\—ÙÙ[™\ˆ	öa¶)öav-6+¶-IÊHÈ	ÜÙ[XİY	Èˆ	ÉÊH
È	Ï‰È
È\ØÊ
H
È	ÏÛÜ[Û‰ÊKš›Ú[Š	ÉÊH
È	ÏÜÙ[XİÛX™[X™[¶«öb6)öaöã6-va6)ö+vã6*Ù[XİYH™‹XÙ\ˆÛ\ÜÏHœÜİ‹Z[œ]‰È
ÈÉöav.v*¶*6,IË	öa¶)öav.v*¶*6,IË	ö)ö,v)ö)¶aÈ6a¶-6+É×K›X\
Oˆ	ÏÜ[Ûˆ	È
È
OOH
[š]X[˜Ù\YšXØ]WÜİ]\È	ö)ö,v)ö)¶aÈ6a¶-6+ÉÊHÈ	ÜÙ[XİY	Èˆ	ÉÊH
È	Ï‰È
È\ØÊ
H
È	ÏÛÜ[Û‰ÊKš›Ú[Š	ÉÊH
È	ÏÜÙ[XİÛX™[X™[¶*¶)ö,vã6+ˆ6*6)ö,¶+öã6+ÏÙ[XİYH™‹Y]HˆÛ\ÜÏHœÜİ‹Z[œ]‰È
È]SÜË›X\
Oˆ	ÏÜ[Ûˆ	È
È
OOH
[š]X[š[Û][Û—Ù]HÙ^RŠHÈ	ÜÙ[XİY	Èˆ	ÉÊH
È	Ï‰È
È\ØÊ
H
È	ÏÛÜ[Û‰ÊKš›Ú[Š	ÉÊH
È	ÏÜÙ[XİÛX™[X™[¶,ö)ö.v*ˆ6*6)ö,¶+öã6+ÏÙ[XİYH™‹][YHˆÛ\ÜÏHœÜİ‹Z[œ]‰È
È[YSÜË›X\
Oˆ	ÏÜ[Ûˆ	È
È
OOH
[š]X[š[Û][Û—İ[YH[YSÜÖÓX]›X^
X]œ›İ[™

™]È]J
K™Ù]İ\œÊ
H
ˆŒ
È™]È]J
K™Ù]Z[]\Ê
JHÈJH
ˆJWH	ÉÊHÈ	ÜÙ[XİY	Èˆ	ÉÊH
È	Ï‰È
È
È	ÏÛÜ[Û‰ÊKš›Ú[Š	ÉÊH
È	ÏÜÙ[XİÛX™[Ù]]ˆİ[OH›X\™Ú[‹]ÜŒL¶*¶+¶a6`v)ö*Ø]ˆÛ\ÜÏHœÜİ‹XXİ[ÛœÈ‰È
ÈœË›X\
ˆOˆ	ÏX™[[œ]\OH˜ÚXÚØ›Şˆ]K]H‰È
È‹šY
È	Èˆ	È
È

[š]X[š[Û][ÛœÈ×JKœÛÛYJOˆ[X™\ŠšY
HOOH[X™\Š‹šY
JHÈ	ØÚXÚÙY	Èˆ	ÉÊH
È	Ïˆ	È
È\ØÊ‹]JH
È	ÏÛX™[‰ÊKš›Ú[Š	ÉÊH
È	ÏÙ]Ù]Ù]]ˆÛ\ÜÏHœÜİ‹XØ\™Ï¶av+va6*6)ö,¶+öã6+È6b6*¶-vb6ã6,OÚÏX™[İ[OH™\Ü^N™›^Ø[YÛ‹Z][\Î˜Ù[\ÙØ\ÜY[™ÎŒL\Ø›Ü™\Œ\ÛÛYÙL™NYNØ›Ü™\‹\˜Y]\ÎŒLœ[œ]YH™‹\Ø[YK\ØÚÛÛˆ\OH˜ÚXÚØ›Şˆ	È
È
\ÙTØÚÛÛØÈÈ	ØÚXÚÙY	Èˆ	ÉÊH
È	ÏˆÜ[¶av+va6*6)ö,¶+öã6+È6aöav)öaˆ6avªv)öaˆ6av+ö,v,öaÈ6)ö,ö*ØœÛX[¶*6)È6`v.v)öa8 #6ªv,v+öa¶#6av+¶*¶-v)ö*ˆ6,6+¶ã6,vaø #6-6+öaÈ6av+ö,v,öaÈ6*6,v)öã6*6)ö,¶+öã6+È6)ö,ö*¶`v)ö+öaÈ6avã8 #6-6b6+ËÜÛX[ÜÜ[ÛX™[]ˆÛ\ÜÏHœÜİ‹YÜšYˆİ[OH›X\™Ú[‹]ÜŒLX™[¶(¶+ö,v,Ëöav+va6*6)ö,¶+öã6+Ï[œ]YH™‹[ØÈˆÛ\ÜÏHœÜİ‹Z[œ]ˆ˜[YOH‰È
È\ØÊ[š]X[›ØØ][Û—İ^	ÉÊH
È	ÈÛX™[X™[¶.v,v-ˆ6+6.¶,v)ö`vã6)öã6ã[œ]YH™‹[]ˆÛ\ÜÏHœÜİ‹Z[œ]ˆ˜[YOH‰È
È\ØÊ
ØÈH[š]X[›]]YJHOOH[	‰ˆØÈOOH›ÚYÈØÈˆ	ÉÊH
È	ÈÛX™[X™[¶-öb6a6+6.¶,v)ö`vã6)öã6ã[œ]YH™‹[™ÈˆÛ\ÜÏHœÜİ‹Z[œ]ˆ˜[YOH‰È
È\ØÊ
ÙHH[š]X[›Û™Ú]YJHOOH[	‰ˆÙHOOH›ÚYÈÙHˆ	ÉÊH
È	ÈÛX™[Ù]]ˆÛ\ÜÏHœÜİ‹XXİ[ÛœÈ]Ûˆ\OH˜]ÛˆˆYH™‹YÙ]YÜÈ¶+ö,vã6)ö`v*ˆ6avb6`¶.vã6*ˆ6*6)ö,¶+öã6+È6)ö,ˆÔÏØ]ÛÙ]X™[¶*¶-vb6ã6,H6+¶b6+ö,vb[œ]YH™‹\İÈˆÛ\ÜÏHœÜİ‹Z[œ]ˆ\OH™š[HˆXØÙ\Hš[XYÙKÊˆÛX™[X™[¶*¶b6-¶ã6+v)ö*^\™XHYH™‹Y\ØÈˆÛ\ÜÏHœÜİ‹Z[œ]ˆ›İÜÏH‰È
È\ØÊ[š]X[™\ØÜš\[Ûˆ	ÉÊH
È	Ïİ^\™XOÛX™[Ù]]ˆÛ\ÜÏHœÜİ‹XXİ[ÛœÈ]ÛˆYH™‹\Ø]™H‰È
È
[š]X[šYÈ	ö,6+¶ã6,vaÈ6*¶.¶ã6ã6,v)ö*‰Èˆ	ö*ö*6*ˆ6*6)ö,¶+öã6+ÉÊH
È	ÏØ]Û]ÛˆYH™‹XØ[˜Ù[LˆˆÛ\ÜÏH˜[¶)öa¶-v,v)ö`OØ]ÛÙ]Ù]‰ÎÂˆÛÛœİØ[˜Ù[H

HOˆÈË™Y][™ÈH[È™[™\Š	Ú[œÜXİ[ÛœÉÊNÈNÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹XØ[˜Ù[	ÊK›Û˜ÛXÚÈHØ[˜Ù[Âˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹XØ[˜Ù[L‰ÊK›Û˜ÛXÚÈHØ[˜Ù[Âˆ]ØÚÛÛX\H[ØÚÛÛX\šÙ\ˆH[Ù[XİYØÚÛÛH[ØÚÛÛX\]HØÚÛÛØÓ]ØÚÛÛX\™ÈHØÚÛÛØÓ™ÎÂˆÛÛœİ\İ›ŞTØÚÛÛX\H

HOˆÈHÂˆYˆ
ØÚÛÛX\
BˆØÚÛÛX\œ™[[İ™J
NÂˆBˆØ]Ú
ÊHÈHØÚÛÛX\H[ÈØÚÛÛX\šÙ\ˆH[ÈNÂˆÛÛœİ™[™\”ØÚÛÛX\H

HOˆÈÛÛœİ›ŞH‹œ]Y\TÙ[XİÜŠ	ÈÙ‹\ØÚÛÛ[X\	ÊNÈYˆ
X›Ş
Bˆ™]\›ÈYˆ
\Ù[XİYØÚÛÛ	‰ˆJ[X™\‹š\Ñš[š]J[X™\ŠØÚÛÛX\]
JH	‰ˆ[X™\‹š\Ñš[š]J[X™\ŠØÚÛÛX\™ÊJJJHÂˆ›Şœİ[K™\Ü^HH	Û›Û™IÎÂˆ™]\›ÂˆH›Şœİ[K™\Ü^HH	Ø›ØÚÉÎÈYˆ
]Ú[™İË“
HÂˆ›Şš[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹[X\Y[\H¶ªv*¶)ö*6+¶)öa¶aÈ6a¶`¶-6aÈ6+ö,H6+ö,ö*¶,v,È6a¶ã6,ö*‹Ù]‰ÎÂˆ™]\›ÂˆH\İ›ŞTØÚÛÛX\

NÈØÚÛÛX\H›X\
›Ş
KœÙ]šY]ÊÓ[X™\ŠØÚÛÛX\]
HÍ‹ŒMÌ‹[X™\ŠØÚÛÛX\™ÊHNKŒ×K[X™\‹š\Ñš[š]J[X™\ŠØÚÛÛX\]
JHÈMˆˆLJNÈ[S^Y\Š	ÚÎ‹ËŞÜßK[K›Ü[œİ™Y]X\›Ü™ËŞŞŸKŞŞKŞŞ_Kœ™ÉËÈX^›ÛÛNˆNK]šX][Ûˆ	ğªHÜ[”İ™Y]X\	ÈJK˜YÊØÚÛÛX\
NÈYˆ
[X™\‹š\Ñš[š]J[X™\ŠØÚÛÛX\]
JH	‰ˆ[X™\‹š\Ñš[š]J[X™\ŠØÚÛÛX\™ÊJJHÂˆØÚÛÛX\šÙ\ˆH›X\šÙ\ŠÓ[X™\ŠØÚÛÛX\]
K[X™\ŠØÚÛÛX\™ÊWKÈ˜YÙØX›NˆYHJK˜YÊØÚÛÛX\
NÂˆØÚÛÛX\šÙ\‹›ÛŠ	Ù˜YÙ[™	Ë

HOˆÈÛÛœİHØÚÛÛX\šÙ\‹™Ù]]™Ê
NÈØÚÛÛX\]H›]ÈØÚÛÛX\™ÈH›™ÎÈ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹[]	ÊK˜[YHH›]È‹œ]Y\TÙ[XİÜŠ	ÈÙ‹[™ÉÊK˜[YHH›™ÎÈJNÂˆHØÚÛÛX\›ÛŠ	ØÛXÚÉËHOˆÈØÚÛÛX\]HK›]™Ë›]ÈØÚÛÛX\™ÈHK›]™Ë›™ÎÈYˆ
ØÚÛÛX\šÙ\ŠBˆØÚÛÛX\šÙ\‹œÙ]]™ÊK›]™ÊNÂˆ[ÙBˆØÚÛÛX\šÙ\ˆH›X\šÙ\ŠK›]™ËÈ˜YÙØX›NˆYHJK˜YÊØÚÛÛX\
NÈ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹[]	ÊK˜[YHHK›]™Ë›]È‹œ]Y\TÙ[XİÜŠ	ÈÙ‹[™ÉÊK˜[YHHK›]™Ë›™ÎÈJNÈÙ][Y[İ]


HOˆØÚÛÛX\š[˜[Y]TÚ^™J
KLŒ
NÈNÂˆÛÛœİÙ[XİØÚÛÛHˆOˆÈ˜\ˆØKØÈÙ[XİYØÚÛÛHÈ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹\ØÚÛÛ	ÊK˜[YHH‹šYÈ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹\ØÚÛÛ[˜[YIÊK˜[YHH‹›˜[YNÈ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹[]	ÊK˜[YHH
ØHH‹›]]YJHOOH[	‰ˆØHOOH›ÚYÈØHˆ	ÉÎÈ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹[™ÉÊK˜[YHH
ØˆH‹›Û™Ú]YJHOOH[	‰ˆØˆOOH›ÚYÈØˆˆ	ÉÎÈØÚÛÛX\]H‹›]]YNÈØÚÛÛX\™ÈH‹›Û™Ú]YNÈÛÛœİ\ÈH[X™\‹š\Ñš[š]J[X™\Š‹›]]YJJH	‰ˆ[X™\‹š\Ñš[š]J[X™\Š‹›Û™Ú]YJJNÈ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹\ØÚÛÛ[X\	ÊKœİ[K™\Ü^HH\ÈÈ	Ø›ØÚÉÈˆ	Ø›ØÚÉÎÈ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹[X\[›İIÊKœİ[K™\Ü^HH	Ø›ØÚÉÎÈ™[™\”ØÚÛÛX\

NÈNÂˆÛÛœİØYØÚÛÛ™\İ[ÈH\Ş[˜È

HOˆÈÛÛœİHHİš[™Ê‹œ]Y\TÙ[XİÜŠ	ÈÙ‹\ØÚÛÛ\ÙX\˜Ú	ÊK˜[YH	ÉÊKš[J
KH‹œ]Y\TÙ[XİÜŠ	ÈÙ‹Y\İšXİ	ÊK˜[YNÈÛÛœİœˆH
]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKÜØÚÛÛÏÙ\İšXİIÈ
È[˜ÛÙUT’PÛÛ\Û™[

H
È
HÈ	ÉœÙX\˜ÚIÈ
È[˜ÛÙUT’PÛÛ\Û™[
JHˆ	ÉÊH
È	É›[Z]ML	ÊJKš][\È×NÈÛÛœİ›ŞH‹œ]Y\TÙ[XİÜŠ	ÈÙ‹\ØÚÛÛ\™\İ[ÉÊNÈ›Şš[›™\’SHœ‹œÛXÙJ
K›X\
ˆOˆ	Ï]Ûˆ\OH˜]Ûˆˆ]K\ØÚÛÛZYH‰È
È‹šY
È	ÈˆÛ\ÜÏHœÜİ‹\ØÚÛÛ\XÚÈ‰È
È\ØÊ‹›˜[YJH
È	ÏØ]‰È
È\ØÊ‹˜ÛÙH	ÉÊH
È	È8 (ˆ6a¶)ö+vã6aÈ	È
È\ØÊ‹™YXØ][Û˜[Ù\İšXİ	ÉÊH
È	È8 (ˆ	È
È\ØÊ‹˜ÛÛ\[WÛ˜[Y\È	öa¶)öav-6+¶-IÊH
È	ÏÙ]Ø]Û‰ÊKš›Ú[Š	ÉÊH	Ï]ˆÛ\ÜÏHœÜİ‹[\ÙÈ¶av+ö,v,öaø #6)öã6o¶ã6+ö)È6a¶-6+ËÙ]‰ÎÈ›Şœ]Y\TÙ[XİÜ[
	ÖÙ]K\ØÚÛÛZYIÊK™›Ü‘XXÚ
ˆOˆ‹›Û˜ÛXÚÈH

HOˆÈÛÛœİˆHœ‹™š[™
Oˆ[X™\ŠšY
HOOH[X™\Š‹™]\Ù]œØÚÛÛY
JNÈYˆ
ŠBˆÙ[XİØÚÛÛ
ŠNÈJNÈNÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹Y\İšXİ	ÊK›Û˜Ú[™ÙHHØYØÚÛÛ™\İ[ÎÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹\ØÚÛÛ\ÙX\˜Ú	ÊK›Ûš[œ]H

HOˆÈÛX\•[Y[İ]
‹œ]Y\TÙ[XİÜŠ	ÈÙ‹\ØÚÛÛ\ÙX\˜Ú	ÊK—İ
NÈ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹\ØÚÛÛ\ÙX\˜Ú	ÊK—İHÙ][Y[İ]
ØYØÚÛÛ™\İ[ËŒŒ
NÈNÂˆYˆ
[š]X[œØÚÛÛÚY
HÂˆÛÛœİˆHÜËš][\Ë™š[™
Oˆ[X™\ŠšY
HOOH[X™\Š[š]X[œØÚÛÛÚY
JNÂˆYˆ
ŠBˆÙ[XİØÚÛÛ
ŠNÂˆ[ÙHÂˆÙ[XİYØÚÛÛHÈYˆ[š]X[œØÚÛÛÚY˜[YNˆ[š]X[œØÚÛÛÛ˜[YH	ÉË]]YNˆØÚÛÛØÓ]Û™Ú]YNˆØÚÛÛØÓ™ËY™\ÜÎˆ[š]X[›ØØ][Û—İ^	ÉÈNÂˆ™[™\”ØÚÛÛX\

NÂˆBˆBˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹]\ÙKYÜÉÊK›Û˜ÛXÚÈH

HOˆÈ˜\ˆØNÈ
ØHH˜]šYØ]Ü‹™Ù[ÛØØ][ÛŠHOOH[ØHOOH›ÚYÈ›ÚYˆØK™Ù]İ\œ™[ÜÚ][ÛŠOˆÈØÚÛÛX\]H˜ÛÛÜ™Ë›]]YNÈØÚÛÛX\™ÈH˜ÛÛÜ™Ë›Û™Ú]YNÈ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹[]	ÊK˜[YHH˜ÛÛÜ™Ë›]]YNÈ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹[™ÉÊK˜[YHH˜ÛÛÜ™Ë›Û™Ú]YNÈ™[™\”ØÚÛÛX\

NÈK

HOˆ[\
	ö+ö,vã6)ö`v*ˆ6avb6`¶.vã6*ˆ6`v.va6ã6a¶)öavb6`v`ˆ6*6b6+ÉÊKÈ[˜X›RYÚXØİ\˜XŞNˆYHJNÈNÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹\Ø]™K\ØÚÛÛ[ØÉÊK›Û˜ÛXÚÈH\Ş[˜È

HOˆÈÛÛœİYH[X™\Š‹œ]Y\TÙ[XİÜŠ	ÈÙ‹\ØÚÛÛ	ÊK˜[YH
K]H[X™\Š‹œ]Y\TÙ[XİÜŠ	ÈÙ‹[]	ÊK˜[YJK™ÈH[X™\Š‹œ]Y\TÙ[XİÜŠ	ÈÙ‹[™ÉÊK˜[YJNÈYˆ
ZYS[X™\‹š\Ñš[š]J]
HS[X™\‹š\Ñš[š]J™ÊJBˆ™]\›ˆ[\
	ö)ö*6*¶+ö)È6av+ö,v,öaÈ6b6av+¶*¶-v)ö*ˆ6av.v*¶*6,H6,v)È6av-6+¶-H6ªva¶ã6+Ë‰ÊNÈHÂˆ]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKÜØÚÛÛËÉÈ
ÈY
È	ËÛØØ][Û‰ËÈY]Ùˆ	ÔÔÕ	Ë›ÙNˆÈ]]YNˆ]Û™Ú]YNˆ™ÈHJNÂˆØÚÛÛX\]H]ÂˆØÚÛÛX\™ÈH™ÎÂˆ[\
	öavb6`¶.vã6*ˆ6av+ö,v,öaÈ6,6+¶ã6,vaÈ6-6+Ë‰ÊNÂˆ™[™\”ØÚÛÛX\

NÂˆBˆØ]Ú
JHÂˆ[\
K›Y\ÜØYÙJNÂˆHNÂˆÛÛœİİ\İÛU\HH‹œ]Y\TÙ[XİÜŠ	ÈÙ‹]	ÊKİ\İÛPÛÛÜˆH‹œ]Y\TÙ[XİÜŠ	ÈÙ‹]˜ÉÊNÂˆÛÛœİÙ]İ\ˆH

HOˆÈÛÛœİHİ\İÛU\K˜[YHOOH	ö,ö)öã6,IË˜ÈHİ\İÛPÛÛÜ‹˜[YHOOH	ö,ö)öã6,IÎÈ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹]Xİ\İÛK]Ü˜\	ÊKœİ[K™\Ü^HHÈ	Ø›ØÚÉÈˆ	Û›Û™IÎÈ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹]˜ËXİ\İÛK]Ü˜\	ÊKœİ[K™\Ü^HH˜ÈÈ	Ø›ØÚÉÈˆ	Û›Û™IÎÈNÂˆİ\İÛU\K›Û˜Ú[™ÙHHÙ]İ\Âˆİ\İÛPÛÛÜ‹›Û˜Ú[™ÙHHÙ]İ\ÂˆÛÛœİ[š]X[•Hİ\İÛU\Kœ]Y\TÙ[XİÜŠ	ÛÜ[Û›XÚ[
ŠIÊNÂˆYˆ
[š]X[™ZXÛWİ\H	‰ˆVË‹‹ŠY]K™ZXÛWİ\\È×JWKš[˜ÛY\Êİš[™Ê[š]X[™ZXÛWİ\JJJHÂˆİ\İÛU\K˜[YHH	ö,ö)öã6,IÎÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹]Xİ\İÛIÊK˜[YHH[š]X[™ZXÛWİ\NÂˆBˆ[ÙBˆİ\İÛU\K˜[YHH[š]X[™ZXÛWİ\H	ÉÎÂˆYˆ
[š]X[™ZXÛWØÛÛÜˆ	‰ˆVË‹‹ŠY]K™ZXÛWØÛÛÜœÈ×JWKš[˜ÛY\Êİš[™Ê[š]X[™ZXÛWØÛÛÜŠJJHÂˆİ\İÛPÛÛÜ‹˜[YHH	ö,ö)öã6,IÎÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹]˜ËXİ\İÛIÊK˜[YHH[š]X[™ZXÛWØÛÛÜÂˆBˆ[ÙBˆİ\İÛPÛÛÜ‹˜[YHH[š]X[™ZXÛWØÛÛÜˆ	ÉÎÂˆÙ]İ\Š
NÂˆÛÛœİÛİ[\ˆH
Y[JHOˆÈÛÛœİH‹œ]Y\TÙ[XİÜŠY
KˆHX]›X^

\œÙR[
˜[YKL
H
H
È[JNÈ˜[YHHÈNÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÙœ›Û\\ÉÊK›Û˜ÛXÚÈH

HOˆÛİ[\Š	ÈÙ‹Yœ›Û	ËJNÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÙœ›Û[Z[\ÉÊK›Û˜ÛXÚÈH

HOˆÛİ[\Š	ÈÙ‹Yœ›Û	ËLJNÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÜ™X\‹\\ÉÊK›Û˜ÛXÚÈH

HOˆÛİ[\Š	ÈÙ‹\™X\‰ËJNÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÜ™X\‹[Z[\ÉÊK›Û˜ÛXÚÈH

HOˆÛİ[\Š	ÈÙ‹\™X\‰ËLJNÂˆÛÛœİŞ[˜ÔØ[YHH

HOˆÈÛÛœİÚXÚÙYH‹œ]Y\TÙ[XİÜŠ	ÈÙ‹\Ø[YK\ØÚÛÛ	ÊK˜ÚXÚÙYÈYˆ
ÚXÚÙY
HÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹[]	ÊK˜[YHHØÚÛÛX\]OOH[	‰ˆØÚÛÛX\]OOH›ÚYÈØÚÛÛX\]ˆ	ÉÎÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹[™ÉÊK˜[YHHØÚÛÛX\™ÈOOH[	‰ˆØÚÛÛX\™ÈOOH›ÚYÈØÚÛÛX\™Èˆ	ÉÎÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹[ØÉÊK˜[YHH
Ù[XİYØÚÛÛ	‰ˆÙ[XİYØÚÛÛ˜Y™\ÜÊH	öavªv)öaˆ6av+ö,v,öaÉÎÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹[]	ÊKœ™XYÛ›HHYNÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹[™ÉÊKœ™XYÛ›HHYNÂˆBˆ[ÙHÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹[]	ÊKœ™XYÛ›HH˜[ÙNÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹[™ÉÊKœ™XYÛ›HH˜[ÙNÂˆHNÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹\Ø[YK\ØÚÛÛ	ÊK›Û˜Ú[™ÙHHŞ[˜ÔØ[YNÂˆŞ[˜ÔØ[YJ
NÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹YÙ]YÜÉÊK›Û˜ÛXÚÈH

HOˆÈ˜\ˆØNÈ™]\›ˆ
ØHH˜]šYØ]Ü‹™Ù[ÛØØ][ÛŠHOOH[ØHOOH›ÚYÈ›ÚYˆØK™Ù]İ\œ™[ÜÚ][ÛŠOˆÈ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹[]	ÊK˜[YHH˜ÛÛÜ™Ë›]]YNÈ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹[™ÉÊK˜[YHH˜ÛÛÜ™Ë›Û™Ú]YNÈ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹\Ø[YK\ØÚÛÛ	ÊK˜ÚXÚÙYH˜[ÙNÈŞ[˜ÔØ[YJ
NÈK

HOˆ[\
	ö+ö,vã6)ö`v*ˆÔÈ6a¶)öavb6`v`ˆ6*6b6+ÉÊKÈ[˜X›RYÚXØİ\˜XŞNˆYHJNÈNÂˆÛÛœİ\ØYİÈH\Ş[˜È
Yš[JHOˆÈYˆ
Yš[JBˆ™]\›ÈÛÛœİ™H™]È›Ü›Q]J
NÈ™˜\[™
	Ùš[IËš[Kš[K›˜[YH	Ú[œÜXİ[Û‹šœÉÊNÈÛÛœİHßNÈYˆ
ËÚÙ[ŠBˆ]]Üš^˜][ÛˆHËÚÙ[ÈÛÛœİœˆH]ØZ]™]Ú
	ËØ\KÜØÚÛÛ\Ù\šXÙKÚ[œÜXİ[ÛœËÉÈ
ÈY
È	ËÜİÜÉËÈY]Ùˆ	ÔÔÕ	ËXY\œÎˆ›ÙNˆ™Ü™Y[X[Îˆ	Ú[˜ÛYIÈJNÈÛÛœİH]ØZ]œ‹šœÛÛŠ
NÈYˆ
\œ‹›ÚÊBˆ›İÈ\œ›ÜŠ™\œ›Üˆ	ö(¶o¶a6b6+È6*¶-vb6ã6,H6a¶)öavb6`v`ˆ6*6b6+Ë‰ÊNÈNÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹\Ø]™IÊK›Û˜ÛXÚÈH\Ş[˜È
]ŠHOˆÈ˜\ˆØNÈ]‹œ™]™[Y˜][

NÈÛÛœİ›ÙHHÈYXØ][Û˜[Ù\İšXİˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹Y\İšXİ	ÊK˜[YKÛÛ\[WÚYˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹XÛÛ\[IÊK˜[YH[ØÚÛÛÚYˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹\ØÚÛÛ	ÊK˜[YH[ØÚÛÛÙÙ[™\ˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹YÙ[™\‰ÊK˜[YK]Wİ™YNˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹\ÉÊK˜[YK]WÛ]\ˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹\	ÊK˜[YK]WİÛÎˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹\‰ÊK˜[YK™ZXÛWİ\Nˆİ\İÛU\K˜[YHOOH	ö,ö)öã6,IÈÈ
‹œ]Y\TÙ[XİÜŠ	ÈÙ‹]Xİ\İÛIÊK˜[YH	ÉÊHˆİ\İÛU\K˜[YK™ZXÛWİ\WØİ\İÛNˆİ\İÛU\K˜[YHOOH	ö,ö)öã6,IÈÈ
‹œ]Y\TÙ[XİÜŠ	ÈÙ‹]Xİ\İÛIÊK˜[YH	ÉÊHˆ	ÉË™ZXÛWØÛÛÜˆİ\İÛPÛÛÜ‹˜[YHOOH	ö,ö)öã6,IÈÈ
‹œ]Y\TÙ[XİÜŠ	ÈÙ‹]˜ËXİ\İÛIÊK˜[YH	ÉÊHˆİ\İÛPÛÛÜ‹˜[YK™ZXÛWØÛÛÜ—Øİ\İÛNˆİ\İÛPÛÛÜ‹˜[YHOOH	ö,ö)öã6,IÈÈ
‹œ]Y\TÙ[XİÜŠ	ÈÙ‹]˜ËXİ\İÛIÊK˜[YH	ÉÊHˆ	ÉË\ÜÙ[™Ù\—Ùœ›ÛØÛİ[ˆ\œÙR[
‹œ]Y\TÙ[XİÜŠ	ÈÙ‹Yœ›Û	ÊK˜[YKL
H\ÜÙ[™Ù\—Ü™X\—ØÛİ[ˆ\œÙR[
‹œ]Y\TÙ[XİÜŠ	ÈÙ‹\™X\‰ÊK˜[YKL
Hš]™\—ÙÙ[™\ˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹YÉÊK˜[YKÙ\YšXØ]WÜİ]\Îˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹XÙ\	ÊK˜[YKš[Û][Û—Ù]Nˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹Y]IÊK˜[YKš[Û][Û—İ[YNˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹][YIÊK˜[YKØØ][Û—İ^ˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹\Ø[YK\ØÚÛÛ	ÊK˜ÚXÚÙYÈ	öavªv)öaˆ6av+ö,v,öaÉÈˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹[ØÉÊK˜[YK]]YNˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹[]	ÊK˜[YH[Û™Ú]YNˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹[™ÉÊK˜[YH[\ÙWÜØÚÛÛÛØØ][Ûˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹\Ø[YK\ØÚÛÛ	ÊK˜ÚXÚÙYÈHˆ\ØÜš\[Ûˆ‹œ]Y\TÙ[XİÜŠ	ÈÙ‹Y\ØÉÊK˜[YKš[Û][Û—ÚYÎˆË‹‹˜‹œ]Y\TÙ[XİÜ[
	ÖÙ]K]—N˜ÚXÚÙY	ÊWK›X\
Oˆ™]\Ù]ŠHNÈHÂˆÛÛœİˆH]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKÚ[œÜXİ[ÛœÉÈ
È
[š]X[šYÈ	ËÉÈ
È[š]X[šYˆ	ÉÊKÈY]Ùˆ[š]X[šYÈ	ÔU	Èˆ	ÔÔÕ	Ë›ÙHJNÂˆÛÛœİYH[X™\Š‹šY[š]X[šY
NÂˆÛÛœİİÈH
ØHH‹œ]Y\TÙ[XİÜŠ	ÈÙ‹\İÉÊK™š[\ÊHOOH[ØHOOH›ÚYÈ›ÚYˆØVÌNÂˆYˆ
İÈ	‰ˆY
Bˆ]ØZ]\ØYİÊYİÊNÂˆ[\
[š]X[šYÈ	öb6ã6,v)öã6-6*6)ö,¶+öã6+È6,6+¶ã6,vaÈ6-6+Ë‰Èˆ	ö*6)ö,¶+öã6+È6*6)È6avb6`v`¶ã6*ˆ6*ö*6*ˆ6-6+Ë‰ÊNÂˆË™Y][™ÈH[Âˆ]ØZ]™[™\Š	Ú[œÜXİ[ÛœÉÊNÂˆBˆØ]Ú
JHÂˆ[\
K›Y\ÜØYÙJNÂˆHNÂˆ™]\›ÂˆBˆYˆ
OOH	Ü™\ÜÉÊHÂˆ‹š[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹XØ\™Ï¶«ö,¶)ö,v-8 #6aö)È6b6+¶,vb6+6ã^Ù[ÚÏ]ˆÛ\ÜÏHœÜİ‹XXİ[ÛœÈ[œ]YHœ™\\ÙX\˜ÚˆÛ\ÜÏHœÜİ‹Z[œ]ˆXÙZÛ\H¶+6,ö*¶+6b[œ]YHœ™\Y\İšXİˆÛ\ÜÏHœÜİ‹Z[œ]ˆXÙZÛ\H¶a¶)ö+vã6aÈ]ÛˆYHœÜİ‹Y^¶+¶,vb6+6ã6*6)ö,¶+öã6+öaö)ÏØ]Û]ÛˆYHœÜİ‹Y^\È¶+¶,vb6+6ã6av+ö)ö,v,ÏØ]Û]ÛˆYHœÜİ‹Y^XÈ¶+¶,vb6+6ã6-6,vªv*¸ #6aö)ÏØ]ÛÙ]Ù]‰ÎÂˆÖÉÜÜİ‹Y^	Ë	Ú[œÜXİ[ÛœÉ×KÉÜÜİ‹Y^\ÉË	ÜØÚÛÛÉ×KÉÜÜİ‹Y^XÉË	ØÛÛ\[šY\É×WK™›Ü‘XXÚ

ÚYJHOˆ‹œ]Y\TÙ[XİÜŠ	ÈÉÈ
ÈY
K›Û˜ÛXÚÈH\Ş[˜È

HOˆÈ˜\ˆØKØÈHÂˆÛÛœİ˜\ÙHHOOH	Ú[œÜXİ[ÛœÉÈÈ	ËØ\KÜØÚÛÛ\Ù\šXÙKÙ^ÜYš[\™Yİ\OZ[œÜXİ[ÛœÉœÙX\˜ÚIÈ
È[˜ÛÙUT’PÛÛ\Û™[


ØHH‹œ]Y\TÙ[XİÜŠ	ÈÜ™\\ÙX\˜Ú	ÊJHOOH[ØHOOH›ÚYÈ›ÚYˆØK˜[YJH	ÉÊH
È	É™\İšXİIÈ
È[˜ÛÙUT’PÛÛ\Û™[


ØˆH‹œ]Y\TÙ[XİÜŠ	ÈÜ™\Y\İšXİ	ÊJHOOH[ØˆOOH›ÚYÈ›ÚYˆØ‹˜[YJH	ÉÊHˆ	ËØ\KÜØÚÛÛ\Ù\šXÙKÙ^Üİ\OIÈ
ÈÂˆÛÛœİˆH]ØZ]™]Ú
˜\ÙKÈXY\œÎˆËÚÙ[ˆÈÈ]]Üš^˜][ÛˆËÚÙ[ˆHˆßHJNÂˆYˆ
\‹›ÚÊBˆ›İÈ\œ›ÜŠ	ö+¶,vb6+6ã6`¶)ö*6a6+ö,vã6)ö`v*ˆ6a¶ã6,ö*‰ÊNÂˆÛÛœİ›ØˆH]ØZ]‹˜›ØŠ
NÂˆÛÛœİHHT“˜Ü™X]SØš™XİT“
›ØŠKHHØİ[Y[˜Ü™X]Q[[Y[
	ØIÊNÂˆKš™YˆHNÂˆK™İÛ›ØYH	ö,ö,vb6ã6,×öav+ö)ö,v,×ÉÈ
È
È	ËŞ	ÎÂˆK˜ÛXÚÊ
NÂˆÙ][Y[İ]


HOˆT“œ™]›ÚÙSØš™XİT“
JKL
NÂˆBˆØ]Ú
JHÂˆ[\
K›Y\ÜØYÙJNÂˆHJNÂˆ™]\›ÂˆBˆYˆ
OOH	ØÛÛ™šYÉÊHÂˆYˆ
J]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKØXØÙ\ÜÉÊJK˜Ø[—ÙY]
HÂˆ‹š[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹[\ÙÈ¶+ö,ö*¶,v,öã6av+öã6,vã6*ˆ6*¶a¶.6ã6av)ö*ˆ6a¶+ö)ö,vã6+ËÙ]‰ÎÂˆ™]\›ÂˆBˆÛÛœİH]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKØÛÛ™šYÉÊNÂˆÛÛœİÜ›İ\ÈHÖÉÙ\İšXİÉË	öa¶)ö+vã6aø #6aö)öã6(¶avb6,¶-6ã	Ë	Ù\İšXİ	×KÉİ™ZXÛWİ\\ÉË	ö)öa¶b6)ö.H6+¶b6+ö,vb	Ë	İ™ZXÛWİ\I×KÉİ™ZXÛWØÛÛÜœÉË	ö,va¶«È6+¶b6+ö,vb	Ë	İ™ZXÛWØÛÛÜ‰×WNÂˆ‹š[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹YÜšY‰È
ÈÜ›İ\Ë›X\
ÈOˆ	Ï]ˆÛ\ÜÏHœÜİ‹XØ\™Ï‰È
ÈÖÌWH
È	ÏÚÏ]ˆÛ\ÜÏHœÜİ‹XXİ[ÛœÈ[œ]Û\ÜÏHœÜİ‹Z[œ]ˆ]KXÙ™ËZ[œ]H‰È
ÈÖÌ—H
È	ÈˆXÙZÛ\H¶.va¶b6)öaˆ6+6+öã6+È]Ûˆ]KXÙ™ËXYH‰È
ÈÖÌ—H
È	È¶)ö`v,¶b6+öaØ]ÛÙ]]‰È
ÈÙÖÌWK™š[\ŠOˆ[X™\Šš\×ØXİ]™JJK›X\
Oˆ	ÏÜ[ˆÛ\ÜÏHœÜİ‹XÚ\‰È
È\ØÊ]JH
È	È]Ûˆ]KXÙ™ËY[H‰È
ÈÖÌ—H
È	Èˆ]KZYH‰È
ÈšY
È	È°åÏØ]ÛÜÜ[‰ÊKš›Ú[Š	ÉÊH
È	ÏÙ]Ù]‰ÊKš›Ú[Š	ÉÊNÂˆ‹œ]Y\TÙ[XİÜ[
	ÖÙ]KXÙ™ËXYIÊK™›Ü‘XXÚ
ˆOˆ‹›Û˜ÛXÚÈH\Ş[˜È

HOˆÈÛÛœİ[œH‹œ]Y\TÙ[XİÜŠ	ÖÙ]KXÙ™ËZ[œ]H‰È
È‹™]\Ù]˜Ù™ĞY
È	È—IÊNÈYˆ
Z[œ˜[YKš[J
JBˆ™]\›È]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKØÛÛ™šYÉËÈY]Ùˆ	ÔÔÕ	Ë›ÙNˆÈ\Nˆ‹™]\Ù]˜Ù™ĞY]Nˆ[œ˜[YKš[J
HHJNÈ™[™\Š	ØÛÛ™šYÉÊNÈJNÂˆ‹œ]Y\TÙ[XİÜ[
	ÖÙ]KXÙ™ËY[IÊK™›Ü‘XXÚ
ˆOˆ‹›Û˜ÛXÚÈH

HOˆÜİÛÛ™š\›J	ö.¶ã6,v`v.v)öa8 #6,ö)ö,¶ã6«ö,¶ã6a¶aÉË	ö)öã6aˆ6«ö,¶ã6a¶aÈ6+ö,H6*ö*6*¸ #6aö)öã6+6+öã6+È6a¶av)öã6-6+ö)ö+öaÈ6a¶+¶b6)öaö+È6-6+Ë‰Ë\Ş[˜È

HOˆÈ]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKØÛÛ™šYÏİ\OIÈ
È[˜ÛÙUT’PÛÛ\Û™[
‹™]\Ù]˜Ù™Ñ[
H
È	ÉšYIÈ
È‹™]\Ù]šYÈY]Ùˆ	ÑSUIÈJNÈ™[™\Š	ØÛÛ™šYÉÊNÈJJNÂˆ™]\›ÂˆBˆYˆ
OOH	Ü\›Z\ÜÚ[ÛœÉÊHÂˆÛÛœİH]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKÜ\›Z\ÜÚ[ÛœÉÊNÂˆ‹š[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹XØ\™Ï¶+ö,ö*¶,v,öã6,öav*¸ #6aö)ÏÚÏX›HÛ\ÜÏHœÜİ‹]X›HXY¶,öav*İ¶av-6)öaö+öaÏİ¶*ö*6*İ¶b6ã6,v)öã6-İ¶+v,6`Oİ‘^Ù[İ¶«ö,¶)ö,v-İİİİXY›ÙO‰È
Èš][\Ë›X\
ˆOˆ	Ïˆ]K\›ÛOH‰È
È‹šY
È	È‰È
È\ØÊ‹]JH
È	Ïİ‰È
ÈÉİšY]ÉË	ØÜ™X]IË	ÙY]	Ë	Ù[]IË	Ú[\Ü	Ë	Ü™\Ü	×K›X\
ÈOˆ	Ï[œ]\OH˜ÚXÚØ›Şˆ]KZÏH‰È
ÈÈ
È	Èˆ	È
È
–ÉØØ[—ÉÈ
È×HÈ	ØÚXÚÙY	Èˆ	ÉÊH
È	Ïİ‰ÊKš›Ú[Š	ÉÊH
È	Ï]ÛˆÛ\ÜÏHœÜİ‹\Ø]™K\\›H¶,6+¶ã6,vaÏØ]Ûİİ‰ÊKš›Ú[Š	ÉÊH
È	Ïİ›ÙOİX›OÙ]‰ÎÂˆ‹œ]Y\TÙ[XİÜ[
	ËœÜİ‹\Ø]™K\\›IÊK™›Ü‘XXÚ
ˆOˆ‹›Û˜ÛXÚÈH\Ş[˜È

HOˆÈÛÛœİˆH‹˜ÛÜÙ\İ
	İ‰ÊK›ÙHHßNÈ‹œ]Y\TÙ[XİÜ[
	ÖÙ]KZ×IÊK™›Ü‘XXÚ
Oˆ›ÙVÉØØ[—ÉÈ
È™]\Ù]š×HH˜ÚXÚÙYÈHˆ
NÈ]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKÜ\›Z\ÜÚ[ÛœËÉÈ
È‹™]\Ù]œ›ÛKÈY]Ùˆ	ÔÔÕ	Ë›ÙHJNÈ‹^ÛÛ[H	ö,6+¶ã6,vaÈ6-6+ÉÎÈÙ][Y[İ]


HOˆ‹^ÛÛ[H	ö,6+¶ã6,vaÉËLŒ
NÈJNÂˆ™]\›ÂˆBˆYˆ
OOH	ÛX\	ÊHÂˆÛÛœİH]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKÚ[œÜXİ[Û‹[X\	ÊNÂˆYˆ
TËœ›ÛİTËœ›Ûİš\ĞÛÛ›™XİYËœ›Ûİœ]Y\TÙ[XİÜŠ	ËœÜİ‹X›ÙIÊHOOHˆJ
ÙˆHËœ›Ûİœ]Y\TÙ[XİÜŠ	ÖÙ]K]H›X\—IÊJHOOH[ÙˆOOH›ÚYÈ›ÚYˆÙ‹˜Û\ÜÓ\İ˜ÛÛZ[œÊ	ÛÛ‰ÊJJBˆ™]\›ÂˆÛÛœİ›ÛİH]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKØ›Ûİİ˜\	ÊNÂˆYˆ
TËœ›ÛİTËœ›Ûİš\ĞÛÛ›™XİYËœ›Ûİœ]Y\TÙ[XİÜŠ	ËœÜİ‹X›ÙIÊHOOHˆJ
ÙÈHËœ›Ûİœ]Y\TÙ[XİÜŠ	ÖÙ]K]H›X\—IÊJHOOH[ÙÈOOH›ÚYÈ›ÚYˆÙË˜Û\ÜÓ\İ˜ÛÛZ[œÊ	ÛÛ‰ÊJJBˆ™]\›Âˆ™\İšXİØ›İ[™\šY\ÈH›Ûİ™\İšXİØ›İ[™\šY\È×NÂˆ‹š[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹XØ\™Ï¶a¶`¶-6aÈ6av+ö)ö,v,È6*6)ö,¶+öã6+ö-6+öaÈ6b6*6)ö,¶,v,öã8 #6-6+öaÏÚÏİ[OH™›Û\Ú^™NŒL\ØÛÛÜˆÍÌH¶+ö,H6)öã6aˆ6a¶`¶-6aÈ6`v`¶-È6av+ö)ö,v,öã6a¶av)öã6-6+ö)ö+öaÈ6avã8 #6-6b6a¶+È6ªvaÈ6+v+ö)ö`¶a6ã6ªH6*6)ö,¶+öã6+Ëö*6)ö,¶,v,öã6,ö,vb6ã6,È6av+ö)ö,v,È6*6,v)öã6(¶a¸ #6aö)È6*ö*6*ˆ6-6+öaÈ6b6av+¶*¶-v)ö*ˆ6+6.¶,v)ö`vã6)öã6ã6av.v*¶*6,H6+ö)ö,va¶+ËÜ]ˆYHœÜİ‹Z[œÜXİ[Û‹[X\X›ØÚÈÙ]Ù]‰ÎÂˆ[İ[[œÜXİ[Û“X\
‹œ]Y\TÙ[XİÜŠ	ÈÜÜİ‹Z[œÜXİ[Û‹[X\X›ØÚÉÊKš][\È×K™\İšXİØ›İ[™\šY\È×JNÂˆ™]\›ÂˆBˆÛÛœİ\Ò[œÈHOOH	Ú[œÜXİ[ÛœÉÎÂˆÛÛœİHH	Ï]ˆÛ\ÜÏHœÜİ‹XXİ[ÛœÈ‰È
È
Z\Ò[œÈÈ	Ï]ÛˆYHœÜİ‹XY‰È
È
OOH	ØÛÛ\[šY\ÉÈÈ	ö)ö`v,¶b6+öaˆ6-6,vªv*‰Èˆ	ö)ö`v,¶b6+öaˆ6av+ö,v,öaÉÊH
È	ÏØ]Û‰Èˆ	Ï]ÛˆYHœÜİ‹[™]È¶*ö*6*ˆ6*6)ö,¶+öã6+È6+6+öã6+ÏØ]Û‰ÊH
È	Ï[œ]YHœÜİ‹\ÙX\˜ÚˆÛ\ÜÏHœÜİ‹Z[œ]ˆXÙZÛ\H‰È
È
\Ò[œÈÈ	ö+6,ö*¶+6b6ã6av+ö,v,öaö#6-6,vªv*¶#6o¶a6)öªH6ã6)È6av+va	ÈˆOOH	ØÛÛ\[šY\ÉÈÈ	ö+6,ö*¶+6b6ã6-6,vªv*‰Èˆ	ö+6,ö*¶+6b6ã6av+ö,v,öaÉÊH
È	ÈÙ]]ˆYHœÜİ‹[\İˆÛ\ÜÏHœÜİ‹XØ\™¶+ö,H6+v)öa6+ö,vã6)ö`v*¸ )Ù]‰ÎÂˆ‹š[›™\’SHNÂˆÛÛœİ[œ]H‹œ]Y\TÙ[XİÜŠ	ÈÜÜİ‹\ÙX\˜Ú	ÊNÂˆYˆ
‹œ]Y\TÙ[XİÜŠ	ÈÜÜİ‹[™]ÉÊJBˆ‹œ]Y\TÙ[XİÜŠ	ÈÜÜİ‹[™]ÉÊK›Û˜ÛXÚÈH

HOˆÈË™Y][™ÈH[È™[™\Š	ØÜ™X]IÊNÈNÂˆYˆ
‹œ]Y\TÙ[XİÜŠ	ÈÜÜİ‹XY	ÊJBˆ‹œ]Y\TÙ[XİÜŠ	ÈÜÜİ‹XY	ÊK›Û˜ÛXÚÈH

HOˆÜİ‘[]Q›Ü›J[ØY
NÂˆ]YÙHHNÂˆÛÛœİØYH\Ş[˜È

HOˆÂˆÛÛœİ\HOOH	ØÛÛ\[šY\ÉÈÈ	ØÛÛ\[šY\Ë\YÙIÈˆOOH	ÜØÚÛÛÉÈÈ	ÜØÚÛÛË\YÙIÈˆ	Ú[œÜXİ[ÛœË\YÙIÎÂˆ]HOOH	İ™ZXÛ\ÉÈÈÈ][\Îˆ×Kİ[ˆYÙNˆKYÙ\ÎˆHHˆ]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKÉÈ
È\
È	ÏÜÙX\˜ÚIÈ
È[˜ÛÙUT’PÛÛ\Û™[
[œ]˜[YJH
È	ÉœYÙOIÈ
ÈYÙH
È	ÉœYÙWÜÚ^™OLIÊNÂˆ]›İÜÈHš][\È×KX\›İÜÈH›İÜÎÂˆYˆ
OOH	ÜØÚÛÛÉÊHÂˆHÂˆÛÛœİİ[HX]›Z[ŠL[X™\Šİ[›İÜË›[™İ
JNÂˆÛÛœİYÙ\ÈHX]›X^
KX]˜ÙZ[
İ[ÈL
JNÂˆX\›İÜÈH×NÂˆ›Üˆ
]ÈHNÈÈHYÙ\ÎÈÊÊÊHÂˆÛÛœİ[HH]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKÜØÚÛÛË\YÙOÜÙX\˜ÚIÈ
È[˜ÛÙUT’PÛÛ\Û™[
[œ]˜[YJH
È	ÉœYÙOIÈ
ÈÈ
È	ÉœYÙWÜÚ^™OLL	ÊNÂˆÛÛœİ\H[Kš][\È×NÂˆX\›İÜÈHX\›İÜË˜ÛÛ˜Ø]
\
NÂˆYˆ
\›[™İL
Bˆœ™XZÎÂˆBˆBˆØ]Ú
ÊHÂˆX\›İÜÈH›İÜÎÂˆBˆYˆ
›İÜË›[™İOOH	‰ˆ[X™\Šİ[
HOOH	‰ˆX\›İÜË›[™İ
HÂˆ›İÜÈHX\›İÜËœÛXÙJJNÂˆHÈ][\Îˆ›İÜËYÙNˆKYÙWÜÚ^™NˆKİ[ˆX\›İÜË›[™İYÙ\ÎˆX]›X^
KX]˜ÙZ[
X\›İÜË›[™İÈJJHNÂˆBˆBˆYˆ
OOH	İ™ZXÛ\ÉÊHÂˆ]YÙHHNÂˆ‹š[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹XØ\™]ˆÛ\ÜÏHœÜİ‹Yš[\‹\[™[Ï¶+6,ö*¸ #6b6+6b6b6`vã6a6*¶,H6+¶b6+ö,vb6aö)öã6,ö,vb6ã6,È6av+ö)ö,v,ÏÚÏ]ˆÛ\ÜÏHœÜİ‹Yš[\‹YÜšYX™[¶+6,ö*¸ #6b6+6b6ã6o¶a6)öªv#6a¶b6.H6b6,va¶«Ï[œ]YH™ZXÛK\ÙX\˜ÚˆÛ\ÜÏHœÜİ‹Z[œ]ˆ\OHœÙX\˜ÚˆXÙZÛ\H¶av*öa6)öbÈ6ìvìˆ6*6ìöí6íH6ã6)È6b6aˆÛX™[X™[¶a¶b6.H6+¶b6+ö,vbÙ[XİYH™ZXÛK]\HˆÛ\ÜÏHœÜİ‹Z[œ]Ü[Ûˆ˜[YOHˆ¶aöavaÈ6)öa¶b6)ö.OÛÜ[ÛÜÙ[XİÛX™[X™[¶,va¶«È6+¶b6+ö,vbÙ[XİYH™ZXÛKXÛÛÜˆˆÛ\ÜÏHœÜİ‹Z[œ]Ü[Ûˆ˜[YOHˆ¶aöavaÈ6,va¶«ø #6aö)ÏÛÜ[ÛÜÙ[XİÛX™[X™[¶a¶b6.H6,v)öa¶a¶+öaÏÙ[XİYH™ZXÛKYÙ[™\ˆˆÛ\ÜÏHœÜİ‹Z[œ]Ü[Ûˆ˜[YOHˆ¶aöavaÏÛÜ[ÛÜ[Û¶+¶)öa¶aOÛÜ[ÛÜ[Û¶(¶`¶)ÏÛÜ[ÛÜ[Û¶a¶)öav-6+¶-OÛÜ[ÛÜÙ[XİÛX™[X™[¶b6-¶.vã6*ˆ6«öb6)öaöãÙ[XİYH™ZXÛKXÙ\ˆÛ\ÜÏHœÜİ‹Z[œ]Ü[Ûˆ˜[YOHˆ¶aöavaÈ6b6-¶.vã6*¸ #6aö)ÏÛÜ[ÛÜ[Û¶av.v*¶*6,OÛÜ[ÛÜ[Û¶a¶)öav.v*¶*6,OÛÜ[ÛÜ[Û¶)ö,v)ö)¶aÈ6a¶-6+ÏÛÜ[ÛÜÙ[XİÛX™[]ÛˆYH™ZXÛKXÛX\ˆˆÛ\ÜÏHœÜİ‹\›İËXˆˆ\OH˜]Ûˆ¶o¶)öªx #6ªv,v+öaˆ6`vã6a6*¶,vaö)ÏØ]ÛÙ]Ù]]ˆÛ\ÜÏHœÜİ‹XXİ[ÛœÈˆİ[OHš\İYKXÛÛ[œÜXÙKX™]ÙY[ˆİ›Û™Ï¶`vaö,v,ö*ˆ6+¶b6+ö,vb6aö)ÏÜİ›Û™Ï]ÛˆYH™ZXÛK[™]È¶+¶b6+ö,vb6ã6+6+öã6+ÏØ]ÛÙ]]ˆYH™ZXÛK[\İˆİ[OH›X\™Ú[‹]ÜŒLœÙ]Ù]‰ÎÂˆÛÛœİ[œ]H‹œ]Y\TÙ[XİÜŠ	Èİ™ZXÛK\ÙX\˜Ú	ÊK\İH‹œ]Y\TÙ[XİÜŠ	Èİ™ZXÛK[\İ	ÊNÂˆÛÛœİØYH\Ş[˜È

HOˆÂˆHÂˆÛÛœİ\˜[\ÈH™]ÈT“ÙX\˜Ú\˜[\ÊÈÙX\˜Úˆ[œ]˜[YKš[J
KYÙNˆİš[™ÊYÙJK[Z]ˆ	ÌIË™ZXÛWİ\Nˆ‹œ]Y\TÙ[XİÜŠ	Èİ™ZXÛK]\IÊK˜[YK™ZXÛWØÛÛÜˆ‹œ]Y\TÙ[XİÜŠ	Èİ™ZXÛKXÛÛÜ‰ÊK˜[YKš]™\—ÙÙ[™\ˆ‹œ]Y\TÙ[XİÜŠ	Èİ™ZXÛKYÙ[™\‰ÊK˜[YKÙ\YšXØ]WÜİ]\Îˆ‹œ]Y\TÙ[XİÜŠ	Èİ™ZXÛKXÙ\	ÊK˜[YHJNÂˆÛÛœİH]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKİ™ZXÛ\ÏÉÈ
È\˜[\ËÔİš[™Ê
JNÂˆ\İš[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹]X›K]Ü˜\X›HÛ\ÜÏHœÜİ‹]X›HXY¶,v+öã6`Oİ¶o¶a6)öªOİ¶a¶b6.H6+¶b6+ö,vbİ¶,va¶«Ïİ¶,ö,va¶-6ã6aİ¶,v)öa¶a¶+öaÏİ¶«öb6)öaöãİ¶*¶.v+ö)ö+È6*6)ö,¶+öã6+Ïİ¶(¶+¶,vã6aˆ6*6)ö,¶+öã6+Ïİ¶.vava6ã6)ö*İİİXY›ÙO‰È
Âˆ
š][\È×JK›X\

‹ŠHOˆ	Ï‰È
ÈÜİ‘˜J
YÙHHJH
ˆH
Èˆ
ÈJH
È	Ïİ‰È
ÈÜİ’\˜[”]JŠH
È	Ïİ‰È
È\ØÊ‹™ZXÛWİ\H	ø %	ÊH
È	Ïİ‰È
È\ØÊ‹™ZXÛWØÛÛÜˆ	ø %	ÊH
È	Ïİ‰È
ÈÜİ‘˜J‹œ\ÜÙ[™Ù\—Ùœ›ÛØÛİ[
H
È	È6+6a6bÈ	È
ÈÜİ‘˜J‹œ\ÜÙ[™Ù\—Ü™X\—ØÛİ[
H
È	È6.v`¶*İİ›Û™Ï‰È
È\ØÊ‹œÙ\[™Ùš]™\—Û˜[YH	ö,v)öa¶a¶+öaÈ6a¶)öav-6+¶-IÊH
È	ÏÜİ›Û™Ï]ˆÛ\ÜÏHœÜİ‹[]]Y‰È
È\ØÊ‹œÙ\[™Ùš]™\—Û˜][Û˜[ØÛÙH	ÉÊH
È	ÏÙ]İÜ[ˆÛ\ÜÏHœÜİ‹XÚ\‰È
È\ØÊ‹˜Ù\YšXØ]WÜİ]\È	öa¶)öav-6+¶-IÊH
È	ÏÜÜ[İ‰È
ÈÜİ‘˜J‹š[œÜXİ[Û—ØÛİ[
H
È	Ïİ[YO‰È
ÈÜİ’˜[[Q]J‹›\İÚ[œÜXİ[Û—Ø]
H
È	Ïİ[YOİ]ˆÛ\ÜÏHœÜİ‹\›İËXXİ[ÛœÈ]ÛˆÛ\ÜÏHœÜİ‹\›İËXˆš[X\Hˆ]KYY]]H‰È
È‹šY
È	È¶b6ã6,v)öã6-Ø]Û]ÛˆÛ\ÜÏHœÜİ‹\›İËXˆ[™Ù\ˆˆ]KY[]H‰È
È‹šY
È	È¶.¶ã6,v`v.v)öaØ]ÛÙ]İİ‰ÊKš›Ú[Š	ÉÊH
Âˆ

š][\È×JK›[™İÈ	ÉÈˆ	ÏÛÛÜ[HŒL]ˆÛ\ÜÏHœÜİ‹Y[\K\İ]H¶+¶b6+ö,vb6ã6ã6av-ö)ö*6`ˆ6`vã6a6*¶,vaö)öã6)öa¶*¶+¶)ö*6ã6o¶ã6+ö)È6a¶-6+ËÙ]İİ‰ÊH
Âˆ	Ïİ›ÙOİX›OÙ]]ˆÛ\ÜÏHœÜİ‹\YÙ\ˆ]ÛˆYH™ZXÛK\™]ˆˆ	È
È
YÙHHHÈ	Ù\ØX›Y	Èˆ	ÉÊH
È	Ï¶`¶*6a6ãØ]ÛÜ[¶-v`v+vaÈ	È
ÈÜİ‘˜JœYÙJH
È	È6)ö,ˆ	È
ÈÜİ‘˜JœYÙ\ÊH
È	È8 %	È
ÈÜİ‘˜Jİ[
H
È	È6+¶b6+ö,vbÜÜ[]ÛˆYH™ZXÛK[™^ˆ	È
È
YÙHHœYÙ\ÈÈ	Ù\ØX›Y	Èˆ	ÉÊH
È	Ï¶*6.v+öãØ]ÛÙ]‰ÎÂˆYˆ
Ë˜XØÙ\ÜÈ	‰ˆTË˜XØÙ\ÜË˜Ø[—ÙY]
Bˆ\İœ]Y\TÙ[XİÜ[
	ÖÙ]KYY]]—IÊK™›Ü‘XXÚ
Oˆœİ[K™\Ü^HH	Û›Û™IÊNÂˆYˆ
Ë˜XØÙ\ÜÈ	‰ˆTË˜XØÙ\ÜË˜Ø[—Ù[]JBˆ\İœ]Y\TÙ[XİÜ[
	ÖÙ]KY[]—IÊK™›Ü‘XXÚ
Oˆœİ[K™\Ü^HH	Û›Û™IÊNÂˆ\İœ]Y\TÙ[XİÜŠ	Èİ™ZXÛK\™]‰ÊK›Û˜ÛXÚÈH

HOˆÈYˆ
YÙHˆJHÂˆYÙKKNÂˆØY

NÂˆHNÂˆ\İœ]Y\TÙ[XİÜŠ	Èİ™ZXÛK[™^	ÊK›Û˜ÛXÚÈH

HOˆÈYˆ
YÙHœYÙ\ÊHÂˆYÙJÊÎÂˆØY

NÂˆHNÂˆ\İœ]Y\TÙ[XİÜ[
	ÖÙ]KYY]]—IÊK™›Ü‘XXÚ
ˆOˆ‹›Û˜ÛXÚÈH\Ş[˜È

HOˆÂˆÛÛœİ›İÈH
š][\È×JK™š[™
ˆOˆ[X™\Š‹šY
HOOH[X™\Š‹™]\Ù]™Y]ŠJNÂˆYˆ
\›İÊBˆ™]\›ÂˆÛÛœİ[H	Ï]ˆÛ\ÜÏHœÜİ‹Y›Ü›KYÜšYX™[¶o¶a6)öªO[œ]Û\ÜÏHœÜİ‹Z[œ]ˆ˜[YOH‰È
È\ØÊ›İËœ]H	ÉÊH
È	Èˆ™XYÛ›OÛX™[X™[¶a¶b6.H6+¶b6+ö,vb[œ]YH™‹]\HˆÛ\ÜÏHœÜİ‹Z[œ]ˆ˜[YOH‰È
È\ØÊ›İË™ZXÛWİ\H	ÉÊH
È	ÈÛX™[X™[¶,va¶«È6+¶b6+ö,vb[œ]YH™‹XÛÛÜˆˆÛ\ÜÏHœÜİ‹Z[œ]ˆ˜[YOH‰È
È\ØÊ›İË™ZXÛWØÛÛÜˆ	ÉÊH
È	ÈÛX™[X™[¶,ö,va¶-6ã6aˆ6+6a6b[œ]YH™‹Yœ›ÛˆÛ\ÜÏHœÜİ‹Z[œ]ˆ\OH›[X™\ˆˆZ[HŒˆ˜[YOH‰È
È[X™\Š›İËœ\ÜÙ[™Ù\—Ùœ›ÛØÛİ[
H
È	ÈÛX™[X™[¶,ö,va¶-6ã6aˆ6.v`¶*[œ]YH™‹\™X\ˆˆÛ\ÜÏHœÜİ‹Z[œ]ˆ\OH›[X™\ˆˆZ[HŒˆ˜[YOH‰È
È[X™\Š›İËœ\ÜÙ[™Ù\—Ü™X\—ØÛİ[
H
È	ÈÛX™[X™[¶+6a¶,öã6*ˆ6,v)öa¶a¶+öaÏÙ[XİYH™‹YÈˆÛ\ÜÏHœÜİ‹Z[œ]Ü[Û¶a¶)öav-6+¶-OÛÜ[ÛÜ[Û¶+¶)öa¶aOÛÜ[ÛÜ[Û¶(¶`¶)ÏÛÜ[ÛÜÙ[XİÛX™[X™[¶b6-¶.vã6*ˆ6«öb6)öaöãÙ[XİYH™‹XÙ\ˆÛ\ÜÏHœÜİ‹Z[œ]Ü[Û¶)ö,v)ö)¶aÈ6a¶-6+ÏÛÜ[ÛÜ[Û¶av.v*¶*6,OÛÜ[ÛÜ[Û¶a¶)öav.v*¶*6,OÛÜ[ÛÜÙ[XİÛX™[Ù]‰ÎÂˆÜİ“[Ù[
	öb6ã6,v)öã6-6+¶b6+ö,vb	Ë[\Ş[˜È
JHOˆÂˆHÂˆ]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKİ™ZXÛ\ËÉÈ
È›İËšYÈY]Ùˆ	ÔU	Ë›ÙNˆÈ™ZXÛWİ\NˆKœ]Y\TÙ[XİÜŠ	Èİ™‹]\IÊK˜[YKš[J
K™ZXÛWØÛÛÜˆKœ]Y\TÙ[XİÜŠ	Èİ™‹XÛÛÜ‰ÊK˜[YKš[J
K\ÜÙ[™Ù\—Ùœ›ÛØÛİ[ˆKœ]Y\TÙ[XİÜŠ	Èİ™‹Yœ›Û	ÊK˜[YK\ÜÙ[™Ù\—Ü™X\—ØÛİ[ˆKœ]Y\TÙ[XİÜŠ	Èİ™‹\™X\‰ÊK˜[YKš]™\—ÙÙ[™\ˆKœ]Y\TÙ[XİÜŠ	Èİ™‹YÉÊK˜[YKÙ\YšXØ]WÜİ]\ÎˆKœ]Y\TÙ[XİÜŠ	Èİ™‹XÙ\	ÊK˜[YHHJNÂˆ]ØZ]ØY

NÂˆ™]\›ˆYNÂˆBˆØ]Ú
JHÂˆ[\
K›Y\ÜØYÙJNÂˆ™]\›ˆ˜[ÙNÂˆBˆJNÂˆØİ[Y[œ]Y\TÙ[XİÜŠ	ËœÜİ‹Y›Ü›K[[Ù[İ™‹YÉÊK˜[YHH›İË™š]™\—ÙÙ[™\ˆ	öa¶)öav-6+¶-IÎÂˆØİ[Y[œ]Y\TÙ[XİÜŠ	ËœÜİ‹Y›Ü›K[[Ù[İ™‹XÙ\	ÊK˜[YHH›İË˜Ù\YšXØ]WÜİ]\È	ö)ö,v)ö)¶aÈ6a¶-6+ÉÎÂˆJNÂˆ\İœ]Y\TÙ[XİÜ[
	ÖÙ]KY[]—IÊK™›Ü‘XXÚ
ˆOˆ‹›Û˜ÛXÚÈH

HOˆÜİÛÛ™š\›J	ö.¶ã6,v`v.v)öa8 #6,ö)ö,¶ã6+¶b6+ö,vb	Ë	ö+¶b6+ö,vb6)ö,ˆ6`vaö,v,ö*ˆ6+¶b6+ö,vb6aö)öã6`v.v)öa6+¶)ö,v+6avã8 #6-6b6+È6b6,öb6)ö*6`ˆ6*6)ö,¶,v,öã6(¶aˆ6+v`v.6+¶b6)öaö+È6-6+Ë‰Ë\Ş[˜È

HOˆÈ]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKİ™ZXÛ\ËÉÈ
È‹™]\Ù]™[‹ÈY]Ùˆ	ÑSUIÈJNÈØY

NÈJJNÂˆBˆØ]Ú
JHÂˆ\İš[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹[\ÙÈ‰È
È\ØÊK›Y\ÜØYÙH	ö+¶-ö)È6+ö,H6+ö,vã6)ö`v*ˆ6+¶b6+ö,vb6aö)ÉÊH
È	ÏÙ]‰ÎÂˆBˆNÂˆ‹œ]Y\TÙ[XİÜŠ	Èİ™ZXÛK[™]ÉÊKœİ[K™\Ü^HH	Û›Û™IÎÂˆYˆ
Ë˜XØÙ\ÜÈ	‰ˆTË˜XØÙ\ÜË˜Ø[—ÙY]
Bˆ‹œ]Y\TÙ[XİÜŠ	Èİ™ZXÛK[™]ÉÊKœİ[K™\Ü^HH	Û›Û™IÎÂˆ[œ]›Ûš[œ]H

HOˆÈÛX\•[Y[İ]
[œ]—İ
NÈ[œ]—İHÙ][Y[İ]


HOˆÈYÙHHNÈØY

NÈKL
NÈNÂˆÉİ™ZXÛK]\IË	İ™ZXÛKXÛÛÜ‰Ë	İ™ZXÛKYÙ[™\‰Ë	İ™ZXÛKXÙ\	×K™›Ü‘XXÚ
YOˆ‹œ]Y\TÙ[XİÜŠ	ÈÉÈ
ÈY
K›Û˜Ú[™ÙHH

HOˆÈYÙHHNÈØY

NÈJNÂˆ‹œ]Y\TÙ[XİÜŠ	Èİ™ZXÛKXÛX\‰ÊK›Û˜ÛXÚÈH

HOˆÈ[œ]˜[YHH	ÉÎÈÉİ™ZXÛK]\IË	İ™ZXÛKXÛÛÜ‰Ë	İ™ZXÛKYÙ[™\‰Ë	İ™ZXÛKXÙ\	×K™›Ü‘XXÚ
YOˆ‹œ]Y\TÙ[XİÜŠ	ÈÉÈ
ÈY
K˜[YHH	ÉÊNÈYÙHHNÈØY

NÈNÂˆHÂˆÛÛœİY]HH
]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKØ›Ûİİ˜\	ÊJK›Y]HßNÂˆÖÉİ™ZXÛK]\IËY]K™ZXÛWİ\\×KÉİ™ZXÛKXÛÛÜ‰ËY]K™ZXÛWØÛÛÜœ×WK™›Ü‘XXÚ

ÚY˜[Y\×JHOˆÂˆÛÛœİÙ[XİH‹œ]Y\TÙ[XİÜŠ	ÈÉÈ
ÈY
NÂˆ
˜[Y\È×JK™›Ü‘XXÚ
˜[YHOˆÈÛÛœİÜ[ÛˆHØİ[Y[˜Ü™X]Q[[Y[
	ÛÜ[Û‰ÊNÈÜ[Û‹˜[YHH˜[YNÈÜ[Û‹^ÛÛ[H˜[YNÈÙ[Xİ˜\[™Ú[
Ü[ÛŠNÈJNÂˆJNÂˆBˆØ]Ú
ÊHÈÊˆH™ZXÛH\İ™[XZ[œÈ\ØX›HYˆÜ[Û˜[š[\ˆY]Y]H\È[˜]˜Z[X›Kˆ
‹ÈBˆ]ØZ]ØY

NÂˆ™]\›ÂˆBˆYˆ
OOH	ØÛÛ\[šY\ÉÊBˆ‹œ]Y\TÙ[XİÜŠ	ÈÜÜİ‹[\İ	ÊKš[›™\’SH	ÏX›HÛ\ÜÏHœÜİ‹]X›HXY¶,v+öã6`Oİ¶-6,vªv*İ¶av+öã6,v.v)öavaİ¶avb6*6)öã6a6av+öã6,v.v)öavaİ¶*¶a6`vaˆ6*ö)ö*6*İ¶*¶.v+ö)ö+È6av+ö)ö,v,Ïİ¶av+ö)ö,v,È6*ö*6*¸ #6-6+öaÏİ¶a¶av)öã6a¶+ö«ö)öaİ¶b6-¶.vã6*İ¶o¶,vb6`v)öã6aİ¶.vava6ã6)ö*İİİXY›ÙO‰È
È›İÜË›X\

‹JHOˆ	Ï‰È
È

YÙHHJH
ˆH
ÈH
ÈJH
È	Ïİ‰È
È\ØÊ‹›˜[YJH
È	Ïİ‰È
È\ØÊ‹›X[˜YÙ\—Û˜[YJH
È	Ïİ‰È
È\ØÊ‹›X[˜YÙ\—Û[Øš[H	ÉÊH
È	Ïİ‰È
È\ØÊ‹›[™[™WÜÛ™H‹œÛ™H	ÉÊH
È	Ïİ‰È
È‹œØÚÛÛØÛİ[
È	Ïİ‰È
È[X™\Š‹œ™YÚ\İ\™YÜØÚÛÛØÛİ[
H
È	Ïİ‰È
È[X™\Š‹œ™\™\Ù[]]™WØÛİ[
H
È	Ïİ‰È
È\ØÊ‹œİ]\È	ö`v.v)öa	ÊH
È	Ïİ‰È
È
[X™\Š‹œ›Ùš[WØÛÛ\]JHÈ	ö*¶ªvavã6a	Èˆ	öa¶)ö`¶-IÊH
È	Ïİ]ˆÛ\ÜÏHœÜİ‹\›İËXXİ[ÛœÈ]ÛˆÛ\ÜÏHœÜİ‹\›İËXˆš[X\Hˆ]KYY]XÏH‰È
È‹šY
È	È¶b6ã6,v)öã6-Ø]Û]ÛˆÛ\ÜÏHœÜİ‹\›İËXˆ[™Ù\ˆˆ]KY[XÏH‰È
È‹šY
È	È¶+v,6`OØ]ÛÙ]İİ‰ÊKš›Ú[Š	ÉÊH
È	Ïİ›ÙOİX›O‰ÎÂˆ[ÙHYˆ
OOH	ÜØÚÛÛÉÊBˆ‹œ]Y\TÙ[XİÜŠ	ÈÜÜİ‹[\İ	ÊKš[›™\’SH	Ï]ˆYHœÜİ‹\ØÚÛÛË[X\X›ØÚÈÙ]X›HÛ\ÜÏHœÜİ‹]X›HXY¶,v+öã6`Oİ¶av+ö,v,öaÏİ¶ªv+Ïİ¶a¶)ö+vã6aÏİ¶a¶b6.Oİ¶-6,vªv*İ¶avb6`¶.vã6*İ¶.vava6ã6)ö*İİİXY›ÙO‰È
È›İÜË›X\

‹JHOˆ	Ï‰È
È

YÙHHJH
ˆH
ÈH
ÈJH
È	Ïİ‰È
È\ØÊ‹›˜[YJH
È	Ïİ‰È
È\ØÊ‹˜ÛÙH	ÉÊH
È	Ïİ‰È
È\ØÊ‹™YXØ][Û˜[Ù\İšXİ
H
È	Ïİ‰È
È\ØÊ‹™Ù[™\ŠH
È	Ïİ‰È
È\ØÊ‹˜ÛÛ\[WÛ˜[Y\È	öa¶)öav-6+¶-IÊH
È	Ïİ‰È
È

[X™\‹š\Ñš[š]J[X™\Š‹›]]YJJH	‰ˆ[X™\‹š\Ñš[š]J[X™\Š‹›Û™Ú]YJJJHÈ	ö*ö*6*ˆ6-6+öaÉÈˆ	ö*ö*6*ˆ6a¶-6+öaÉÊH
È	Ïİ]ˆÛ\ÜÏHœÜİ‹\›İËXXİ[ÛœÈ]ÛˆÛ\ÜÏHœÜİ‹\›İËXˆš[X\Hˆ]KYY]\ÏH‰È
È‹šY
È	È¶b6ã6,v)öã6-Ø]Û]ÛˆÛ\ÜÏHœÜİ‹\›İËXˆ[™Ù\ˆˆ]KY[\ÏH‰È
È‹šY
È	È¶+v,6`OØ]ÛÙ]İİ‰ÊKš›Ú[Š	ÉÊH
È	Ïİ›ÙOİX›O‰ÎÂˆ[ÙBˆ‹œ]Y\TÙ[XİÜŠ	ÈÜÜİ‹[\İ	ÊKš[›™\’SH	ÏX›HÛ\ÜÏHœÜİ‹]X›HXY¶,v+öã6`Oİ¶a¶)ö+vã6aÏİ¶-6,vªv*İ¶av+ö,v,öaÏİ¶o¶a6)öªOİ¶*6)ö,¶,v,È6*ö*6*¸ #6ªva¶a¶+öaÏİ¶*¶+¶a6`v)ö*İ¶*¶)ö,vã6+İ¶.vava6ã6)ö*İİİXY›ÙO‰È
È›İÜË›X\

‹JHOˆ	Ï‰È
È

YÙHHJH
ˆH
ÈH
ÈJH
È	Ïİ‰È
È\ØÊ‹™YXØ][Û˜[Ù\İšXİ
H
È	Ïİ‰È
È\ØÊ‹˜ÛÛ\[WÛ˜[YH	öa¶)öav-6+¶-IÊH
È	Ïİ‰È
È\ØÊ‹œØÚÛÛÛ˜[YH	öa¶)öav-6+¶-IÊH
È	Ïİ‰È
ÈÜ‹œ]Wİ™YK‹œ]WÛ]\‹‹œ]WİÛË	ö)öã6,v)öa‰Ë‹œ]WÜ™YÚ[Û—ØÛÙWK™š[\Š›ÛÛX[ŠKš›Ú[Š	È	ÊH
È	Ïİ‰È
È\ØÊ‹š[œÜXİÜ—Û˜[YH	öa¶)öav-6+¶-IÊH
È	Ïİ‰È
È\ØÊ
‹š[Û][ÛœÈ×JK™š[\ŠˆOˆZ\ĞÙ\YšXØ]Uš[Û][ÛŠŠJKš›Ú[Š	ö#	ÊJH
È	Ïİ‰È
È\ØÊ‹š[Û][Û—Ù]JH
È	È	È
È\ØÊ‹š[Û][Û—İ[YJH
È	Ïİ]ˆÛ\ÜÏHœÜİ‹\›İËXXİ[ÛœÈ]ÛˆÛ\ÜÏHœÜİ‹\›İËXˆˆ]K]šY]ÏH‰È
È‹šY
È	È¶+6,¶)¶ã6)ö*Ø]Û]ÛˆÛ\ÜÏHœÜİ‹\›İËXˆš[X\Hˆ]KYY]H‰È
È‹šY
È	È¶b6ã6,v)öã6-Ø]Û]ÛˆÛ\ÜÏHœÜİ‹\›İËXˆ[™Ù\ˆˆ]KY[H‰È
È‹šY
È	È¶+v,6`OØ]ÛÙ]İİ‰ÊKš›Ú[Š	ÉÊH
È	Ïİ›ÙOİX›O‰ÎÂˆYˆ
OOH	ÜØÚÛÛÉÊHÂˆÛÛœİX\›ØÚÈH‹œ]Y\TÙ[XİÜŠ	ÈÜÜİ‹\ØÚÛÛË[X\X›ØÚÉÊNÂˆYˆ
X\›ØÚÊBˆ[İ[ØÚÛÛX\
X\›ØÚËX\›İÜÊNÂˆBˆÂˆYˆ
Ë˜XØÙ\ÜÊHÂˆYˆ
TË˜XØÙ\ÜË˜Ø[—ØÜ™X]JBˆ‹œ]Y\TÙ[XİÜ[
	ÈÜÜİ‹[™]ËÜÜİ‹XY	ÊK™›Ü‘XXÚ
Oˆœİ[K™\Ü^HH	Û›Û™IÊNÂˆYˆ
TË˜XØÙ\ÜË˜Ø[—ÙY]
Bˆ‹œ]Y\TÙ[XİÜ[
	ÖÙ]KYY]KÙ]KYY]X×KÙ]KYY]\×IÊK™›Ü‘XXÚ
Oˆœİ[K™\Ü^HH	Û›Û™IÊNÂˆYˆ
TË˜XØÙ\ÜË˜Ø[—Ù[]JBˆ‹œ]Y\TÙ[XİÜ[
	ÖÙ]KY[KÙ]KY[X×KÙ]KY[\×IÊK™›Ü‘XXÚ
Oˆœİ[K™\Ü^HH	Û›Û™IÊNÂˆBˆ‹œ]Y\TÙ[XİÜŠ	ÈÜÜİ‹[\İ	ÊKš[œÙ\Y˜XÙ[S
	Ø™Y›Ü™Y[™	Ë	Ï]ˆÛ\ÜÏHœÜİ‹\YÙ\ˆ]ÛˆYHœÜİ‹\™]ˆˆ	È
È
YÙHHHÈ	Ù\ØX›Y	Èˆ	ÉÊH
È	Ï¶`¶*6a6ãØ]ÛÜ[¶-v`v+vaÈ	È
ÈœYÙH
È	È6)ö,ˆ	È
ÈœYÙ\È
È	È8 %	È
Èİ[
È	È6avb6,v+ÏÜÜ[]ÛˆYHœÜİ‹[™^ˆ	È
È
YÙHHœYÙ\ÈÈ	Ù\ØX›Y	Èˆ	ÉÊH
È	Ï¶*6.v+öãØ]ÛÙ]‰ÊNÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÜÜİ‹\™]‰ÊK›Û˜ÛXÚÈH

HOˆÈYˆ
YÙHˆJHÂˆYÙKKNÂˆØY

NÂˆHNÂˆ‹œ]Y\TÙ[XİÜŠ	ÈÜÜİ‹[™^	ÊK›Û˜ÛXÚÈH

HOˆÈYˆ
YÙHœYÙ\ÊHÂˆYÙJÊÎÂˆØY

NÂˆHNÂˆ‹œ]Y\TÙ[XİÜ[
	ÖÙ]K]šY]×IÊK™›Ü‘XXÚ
Oˆ›Û˜ÛXÚÈH\Ş[˜È

HOˆÈÛÛœİˆH]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKÚ[œÜXİ[ÛœËÉÈ
È™]\Ù]šY]ÊNÈÛÛœİÛHØİ[Y[™Ù][[Y[RY
	ÜÜİ‹Y]Z[[[Ù[	ÊNÈYˆ
Û
BˆÛœ™[[İ™J
NÈÛÛœİİÈH
‹œİÜÈ×JVÌKÜ˜ÈHİÈÈ
İË™š[WÜ]	ÉÊHˆ	ÉÎÈÛÛœİHHØİ[Y[˜Ü™X]Q[[Y[
	Ù]‰ÊNÈKšYH	ÜÜİ‹Y]Z[[[Ù[	ÎÈKœİ[K˜ÜÜÕ^H	ÜÜÚ][Û™š^YÚ[œÙ]ŒŞ‹Z[™^NNNNNNØ˜XÚÙÜ›İ[™œ™Ø˜JMJNÙ\Ü^N™›^Ø[YÛ‹Z][\Î˜Ù[\Ú\İYKXÛÛ[˜Ù[\ÜY[™ÎŒŒ	ÎÈKš[›™\’SH	Ï]ˆİ[OH˜˜XÚÙÜ›İ[™ˆÙ™™Ø›Ü™\‹\˜Y]\ÎŒMœÛX^]ÚYÌŒİÚYŒL	NÛX^ZZYÚLšÛİ™\™›İÎ˜]]ÎÜY[™ÎŒNÙ\™Xİ[Ûœ]ˆİ[OH™\Ü^N™›^Ú\İYKXÛÛ[œÜXÙKX™]ÙY[Ø[YÛ‹Z][\Î˜Ù[\ˆÈİ[OH›X\™Ú[Œ¶+6,¶)¶ã6)ö*ˆ6*6)ö,¶+öã6+ÏÚÏ]ÛˆYHœÜİ‹Y]Z[XÛÜÙH¶*6,ö*¶aØ]ÛÙ]¶*6)ö,¶,v,È6*ö*6*¸ #6ªva¶a¶+öaÎˆ	È
È\ØÊ‹š[œÜXİÜ—Û˜[YH	öa¶)öav-6+¶-IÊH
È	Ïœ¶a¶)ö+vã6aÎˆ	È
È\ØÊ‹™YXØ][Û˜[Ù\İšXİ	öa¶)öav-6+¶-IÊH
È	Ïœ¶av+ö,v,öaÎˆ	È
È\ØÊ‹œØÚÛÛÛ˜[YH	öa¶)öav-6+¶-IÊH
È	Ïœ¶-6,vªv*ˆ	È
È\ØÊ‹˜ÛÛ\[WÛ˜[YH	öa¶)öav-6+¶-IÊH
È	Ïœ¶o¶a6)öªNˆ	È
È\ØÊ‹œ]H	ÉÊH
È	Ïœ¶*¶+¶a6`v)ö*ˆ	È
È\ØÊ
‹š[Û][ÛœÈ×JK›X\
ˆOˆ‹]JKš›Ú[Š	ö#	ÊH	ÉÊH
È	Ïœ¶av+vaˆ	È
È\ØÊ‹›ØØ][Û—İ^	ÉÊH
È	Ïœ¶*¶b6-¶ã6+v)ö*ˆ	È
È\ØÊ‹™\ØÜš\[Ûˆ	ÉÊH
È	ÏÜ‰È
È
Ü˜ÈÈ	Ï[YÈÜ˜ÏH‰È
È\ØÊÜ˜ÊH
È	Èˆİ[OH™\Ü^N˜›ØÚÎİÚYŒL	NÛX^ZZYÚŒÛØš™XİYš]˜ÛÛZ[Ø›Ü™\‹\˜Y]\ÎŒLœØ˜XÚÙÜ›İ[™ˆÙŒ™Èˆ[H¶*¶-vb6ã6,H6+¶b6+ö,vb6ã6*6)ö,¶+öã6+ö-6+öaÈ‰Èˆ	Ï]ˆÛ\ÜÏHœÜİ‹[\ÙÈ¶*¶-vb6ã6,H6+¶b6+ö,vb6*ö*6*ˆ6a¶-6+öaÈ6)ö,ö*‹Ù]‰ÊH
È	ÏÙ]‰ÎÈØİ[Y[˜›ÙK˜\[™Ú[
JNÈKœ]Y\TÙ[XİÜŠ	ÈÜÜİ‹Y]Z[XÛÜÙIÊK›Û˜ÛXÚÈH

HOˆKœ™[[İ™J
NÈK›Û˜ÛXÚÈHHOˆÈYˆ
K\™Ù]OOHJBˆKœ™[[İ™J
NÈNÈJNÂˆ‹œ]Y\TÙ[XİÜ[
	ÖÙ]K]šY]×IÊK™›Ü‘XXÚ
Oˆ›Û˜ÛXÚÈH

HOˆÜİ”ÚİÒ[œÜXİ[ÛŠ™]\Ù]šY]ÊJNÂˆ‹œ]Y\TÙ[XİÜ[
	ÖÙ]KYY]IÊK™›Ü‘XXÚ
Oˆ›Û˜ÛXÚÈH\Ş[˜È

HOˆÈË™Y][™ÈH]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKÚ[œÜXİ[ÛœËÉÈ
È™]\Ù]™Y]
NÈ™[™\Š	ØÜ™X]IÊNÈJNÂˆ‹œ]Y\TÙ[XİÜ[
	ÖÙ]KY[IÊK™›Ü‘XXÚ
Oˆ›Û˜ÛXÚÈH

HOˆÜİÛÛ™š\›J	ö+v,6`H6*6)ö,¶+öã6+ÉË	ö)öã6aˆ6*6)ö,¶+öã6+È6b6*¶+¶a6`v)ö*ˆ6b6)ö*6,ö*¶aÈ6*6aÈ6(¶aˆ6+v,6`H6avã8 #6-6b6+Ë‰Ë\Ş[˜È

HOˆÈ]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKÚ[œÜXİ[ÛœËÉÈ
È™]\Ù]™[ÈY]Ùˆ	ÑSUIÈJNÈØY

NÈJJNÂˆ‹œ]Y\TÙ[XİÜ[
	ÖÙ]KY[X×IÊK™›Ü‘XXÚ
Oˆ›Û˜ÛXÚÈH

HOˆÜİÛÛ™š\›J	ö.¶ã6,v`v.v)öa8 #6,ö)ö,¶ã6-6,vªv*‰Ë	ö-6,vªv*ˆ6)ö,ˆ6`vaö,v,ö*ˆ6`v.v)öa6+¶)ö,v+6avã8 #6-6b6+È6b6,öb6)ö*6`ˆ6`¶*6a6ã6+v`v.6+¶b6)öaö+È6-6+Ë‰Ë\Ş[˜È

HOˆÈ]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKØÛÛ\[šY\ËÉÈ
È™]\Ù]™[ËÈY]Ùˆ	ÑSUIÈJNÈØY

NÈJJNÂˆ‹œ]Y\TÙ[XİÜ[
	ÖÙ]KY[\×IÊK™›Ü‘XXÚ
Oˆ›Û˜ÛXÚÈH

HOˆÜİÛÛ™š\›J	ö.¶ã6,v`v.v)öa8 #6,ö)ö,¶ã6av+ö,v,öaÉË	öav+ö,v,öaÈ6)ö,ˆ6`vaö,v,ö*ˆ6`v.v)öa6+¶)ö,v+6avã8 #6-6b6+È6b6,öb6)ö*6`ˆ6`¶*6a6ã6+v`v.6+¶b6)öaö+È6-6+Ë‰Ë\Ş[˜È

HOˆÈ]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKÜØÚÛÛËÉÈ
È™]\Ù]™[ËÈY]Ùˆ	ÑSUIÈJNÈØY

NÈJJNÂˆ‹œ]Y\TÙ[XİÜ[
	ÖÙ]KYY]X×IÊK™›Ü‘XXÚ
Oˆ›Û˜ÛXÚÈH\Ş[˜È

HOˆÈÛÛœİ›İÜÌˆH
]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKØÛÛ\[šY\ÏÜÙX\˜ÚIÊJKš][\È×NÈÛÛœİˆH›İÜÌ‹™š[™
ˆOˆ[X™\Š‹šY
HOOH[X™\Š™]\Ù]™Y]ÊJNÈYˆ
ŠBˆÜİ‘[]Q›Ü›J	ØÛÛ\[šY\ÉË‹ØY
NÈJNÂˆ‹œ]Y\TÙ[XİÜ[
	ÖÙ]KYY]\×IÊK™›Ü‘XXÚ
Oˆ›Û˜ÛXÚÈH\Ş[˜È

HOˆÈÛÛœİ›İÜÌˆH
]ØZ]\J	ËØ\KÜØÚÛÛ\Ù\šXÙKÜØÚÛÛÏÜÙX\˜ÚIÊJKš][\È×NÈÛÛœİˆH›İÜÌ‹™š[™
ˆOˆ[X™\Š‹šY
HOOH[X™\Š™]\Ù]™Y]ÊJNÈYˆ
ŠBˆÜİ‘[]Q›Ü›J	ÜØÚÛÛÉË‹ØY
NÈJNÂˆNÂˆ[œ]›Ûš[œ]H

HOˆÈÛX\•[Y[İ]
[œ]—İ
NÈ[œ]—İHÙ][Y[İ]


HOˆÈYÙHHNÈØY

NÈKL
NÈNÂˆ]ØZ]ØY

NÂˆBˆØ]Ú
JHÂˆ‹š[›™\’SH	Ï]ˆÛ\ÜÏHœÜİ‹[\ÙÈ‰È
È\ØÊK›Y\ÜØYÙH	ö+¶-ö)È6+ö,H6+ö,vã6)ö`v*ˆ6)ö-öa6)ö.v)ö*‰ÊH
È	ÏÙ]‰ÎÂˆBˆBˆÚ[™İË›Ü[”ØÚÛÛÙ\šXÙHHÜ[ÂˆÚ[™İË˜ÛÜÙTØÚÛÛÙ\šXÙHHÛÜÙNÂˆÊˆ6ava¶b6ã6,ö,vb6ã6,È6av+ö)ö,v,È6*¶b6,ö-È6o¶a¶a™XXİ6b6+ö,H6,ö)ö+¶*¶)ö,H6)ö-va6ã6,ö)öã6+ö*6)ö,H6,ö)ö+¶*¶aÈ6avã8 #6-6b6+Ë‚ˆ][˜Ú\ˆ6*6)öã6+È6+ö,H6+¶b6+È[™H6)ö-va6ã6*¶.v,vã6`H6-6b6+ö&È6+ö,H6.¶ã6,H6)öã6aˆ6-vb6,v*ˆ’QUÔÈ6aöa¶«ö)öaH6,ö)ö+¶*ˆ6o¶a¶aˆ6*6aÈØÚÛÛÙ\šXÙS][˜Ú\ˆ6)ö,v+6)ö.H6avã8 #6+öaö+È6b6a6ã6`v)öã6aØÚÛÛ\Ù\šXÙKXYZ[‹šœÈ6aöa¶b6,ˆ6)ö+6,v)È6a¶-6+öaÈ6)ö,ö*‹ˆ
‹ÂŸJJ
NÂ™[˜İ[ÛˆØÚÛÛÙ\šXÙS][˜Ú\Š
HÂˆÛÛœİÜİ™YˆH\ÙT™YŠ[
NÂˆÛÛœİÙ\œ›Ü‹Ù]\œ›Ü—HH\ÙTİ]JˆŠNÂˆ\ÙQY™™Xİ


HOˆÂˆ][]™HHYNÂˆÛÛœİÜİHÜİ™Y‹˜İ\œ™[ÂˆYˆ
ZÜİ
Bˆ™]\›Âˆ›ÛZ\ÙKœ™\ÛÛ™J
Bˆ[Š

HOˆÚ[™İË›Ü[”ØÚÛÛÙ\šXÙJÜİ
JBˆ˜Ø]Ú
HOˆÈYˆ
[]™JBˆÙ]\œ›ÜŠH	‰ˆK›Y\ÜØYÙHÈK›Y\ÜØYÙHˆ¶+¶-ö)È6+ö,H6*6)ö,v«ö,6)ö,vã6,ö,vb6ã6,È6av+ö)ö,v,ÈŠNÈJNÂˆ™]\›ˆ

HOˆÈ[]™HH˜[ÙNÈHÂˆÚ[™İË˜ÛÜÙTØÚÛÛÙ\šXÙH	‰ˆÚ[™İË˜ÛÜÙTØÚÛÛÙ\šXÙJ
NÂˆBˆØ]Ú
ÊHÈHNÂˆK×JNÂˆ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹È™YˆÜİ™Y‹Û\ÜÓ˜[YNˆœÜİ‹\YÙKZÜİYZ[‹]ÛÜšÜÜXÙK\YÙH‹İ[NˆÈZ[’ZYÚˆ˜Ø[ÊLšHL
HˆHK\œ›ÜˆÈ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœÜİ‹[\ÙÈˆK\œ›ÜŠHˆ[
NÂŸB™[˜İ[ÛˆÛÛ\Z[Ó][˜Ú\Š
HÂˆÛÛœİÜİ™YˆH\ÙT™YŠ[
NÂˆÛÛœİÙ\œ›Ü‹Ù]\œ›Ü—HH\ÙTİ]JˆŠNÂˆ\ÙQY™™Xİ


HOˆÂˆ][]™HHYNÂˆÛÛœİÜİHÜİ™Y‹˜İ\œ™[ÂˆYˆ
ZÜİ
Bˆ™]\›ÂˆÛÛœİØY[Ù[HH

HOˆ™]È›ÛZ\ÙJ
™\ÛÛ™K™Z™Xİ
HOˆÂˆYˆ
\[ÙˆÚ[™İË›Ü[ÛÛ\Z[ÈOOH™[˜İ[ÛˆŠBˆ™]\›ˆ™\ÛÛ™J
NÂˆÛÛœİÜ˜ÈH‹Ø\ÜÙ]ËØÛÛ\Z[Ë\[™[šœÏİLŒŒLL‹˜ÛÛ\Z[XM\™XÙZ]™\ŒÈÂˆÛÛœİ^\İ[™ÈHË‹‹™Øİ[Y[œØÜš\×K™š[™
ÈOˆİš[™ÊËœÜ˜ÈˆŠKš[˜ÛY\Ê‹Ø\ÜÙ]ËØÛÛ\Z[Ë\[™[šœÈŠJNÂˆYˆ
^\İ[™ÊHÂˆÛÛœİİ\YH]K››İÊ
NÂˆÛÛœİØZ]H

HOˆÂˆYˆ
\[ÙˆÚ[™İË›Ü[ÛÛ\Z[ÈOOH™[˜İ[ÛˆŠBˆ™]\›ˆ™\ÛÛ™J
NÂˆYˆ
]K››İÊ
HHİ\Yˆ
Bˆ™]\›ˆ™Z™Xİ
™]È\œ›ÜŠ¶av)ö¦6b6a6-6ªv)öã6)ö*ˆ6*6)ö,v«ö,6)ö,vã6a¶-6+ËˆŠJNÂˆÙ][Y[İ]
ØZ]L
NÂˆNÂˆØZ]

NÂˆ™]\›ÂˆBˆÛÛœİÈHØİ[Y[˜Ü™X]Q[[Y[
œØÜš\ŠNÂˆËœÜ˜ÈHÜ˜ÎÂˆË˜\Ş[˜ÈHYNÂˆË›Û›ØYH

HOˆÂˆYˆ
\[ÙˆÚ[™İË›Ü[ÛÛ\Z[ÈOOH™[˜İ[ÛˆŠBˆ™\ÛÛ™J
NÂˆ[ÙBˆ™Z™Xİ
™]È\œ›ÜŠ¶av)ö¦6b6a6-6ªv)öã6)ö*ˆ6*6)ö,v«ö,6)ö,vã6-6+È6)öav)È6,v)ö*6-È6(¶aˆ6(¶av)ö+öaÈ6a¶-6+ËˆŠJNÂˆNÂˆË›Û™\œ›ÜˆH

HOˆ™Z™Xİ
™]È\œ›ÜŠ¶`v)öã6a6av)ö¦6b6a6-6ªv)öã6)ö*ˆ6)ö,ˆ6,ö,vb6,H6+ö,vã6)ö`v*ˆ6a¶-6+ËˆŠJNÂˆØİ[Y[šXY˜\[™Ú[
ÊNÂˆJNÂˆØY[Ù[J
Bˆ[Š

HOˆÚ[™İË›Ü[ÛÛ\Z[ÊÜİ
JBˆ˜Ø]Ú
HOˆÈYˆ
[]™JBˆÙ]\œ›ÜŠH	‰ˆK›Y\ÜØYÙHÈK›Y\ÜØYÙHˆ¶+¶-ö)È6+ö,H6*6)ö,v«ö,6)ö,vã6-6ªv)öã6)ö*ˆ6*¶)öªv,öã6,v)öa¶)öaˆŠNÈJNÂˆ™]\›ˆ

HOˆÈ[]™HH˜[ÙNÈHÂˆÚ[™İË˜ÛÜÙPÛÛ\Z[È	‰ˆÚ[™İË˜ÛÜÙPÛÛ\Z[Ê
NÂˆBˆØ]Ú
ÊHÈHNÂˆK×JNÂˆ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹È™YˆÜİ™Y‹Û\ÜÓ˜[YNˆšÚË\YÙKZÜİYZ[‹]ÛÜšÜÜXÙK\YÙH‹İ[NˆÈZ[’ZYÚˆ˜Ø[ÊLšHL
HˆHK\œ›ÜˆÈ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœÜİ‹[\ÙÈˆK\œ›ÜŠHˆ[
NÂŸB™[˜İ[Ûˆ\œÛÛ›™[X]™T™\Ü

HÂˆ˜\ˆØNÂˆÛÛœİÙ]KÙ]]WHH\ÙTİ]JÈ›İÜÎˆ×K\š[ÙÎˆ×K™\]Y\İÎˆ×HJNÂˆÛÛœİÜ\š[ÙÙ]\š[ÙHH\ÙTİ]JˆŠNÂˆÛÛœİİX‹Ù]X—HH\ÙTİ]J˜[ŠNÂˆÛÛœİÜÙ[XİYYÙ]Ù[XİYYHH\ÙTİ]J
NÂˆÛÛœİÜ]Y\KÙ]]Y\WHH\ÙTİ]JˆŠNÂˆÛÛœİØ\ŞKÙ]\ŞWHH\ÙTİ]J˜[ÙJNÂˆÛÛœİÙ\œ›Ü‹Ù]\œ›Ü—HH\ÙTİ]JˆŠNÂˆÛÛœİØYH\Ş[˜È
™^\š[Ù
HOˆÂˆÙ]\ŞJYJNÂˆÙ]\œ›ÜŠˆŠNÂˆHÂˆÛÛœİ\ÈH™^\š[ÙÈÈˆ
È™^\š[ÙˆˆÂˆÛÛœİH]ØZ]ÑU
‹ØYZ[‹Ü\œÛÛ›™[[X]™K\™\Üˆ
È\ËÈˆJNÂˆÙ]]J
NÂˆÛÛœİÚÜÙ[ˆH™^\š[Ù
YX\ˆ	‰ˆ›[ÛÈYX\IÙYX\ŸI›[ÛIÙ›[ÛXˆˆŠNÂˆÙ]\š[Ù
ÚÜÙ[ŠNÂˆYˆ
Ù[XİYY	‰ˆJœ›İÜÈ×JKœÛÛYJOˆ
ŞœÛ˜\ÚİÚYOOH
ÜÙ[XİYY
JBˆÙ]Ù[XİYY

NÂˆBˆØ]Ú
JHÂˆÙ]\œ›ÜŠK›Y\ÜØYÙH¶+ö,vã6)ö`v*ˆ6«ö,¶)ö,v-6av,v+¶-vã6a¶)öavb6`v`ˆ6*6b6+ÈŠNÂˆBˆš[˜[HÂˆÙ]\ŞJ˜[ÙJNÂˆBˆNÂˆ\ÙQY™™Xİ


HOˆÈØY
ˆŠNÈK×JNÂˆÛÛœİÙ[Xİ\š[ÙH
ŠHOˆÈÙ]Ù[XİYY

NÈÙ]XŠ˜[ŠNÈØY
ŠNÈNÂˆÛÛœİÙ[Xİ\œÛÛˆH\Ş[˜È
›İÊHOˆÂˆÙ]Ù[XİYY

Ü›İËœÛ˜\ÚİÚY
NÂˆÙ]XŠ™]Z[ŠNÂˆÙ]\ŞJYJNÂˆÙ]\œ›ÜŠˆŠNÂˆHÂˆÛÛœİHHŞYX\IÙ[˜ÛÙUT’PÛÛ\Û™[
›İËœ\š[ÙŞYX\Š_I›[ÛIÙ[˜ÛÙUT’PÛÛ\Û™[
›İËœ\š[ÙÛ[Û
_IœÛ˜\ÚİÚYIÙ[˜ÛÙUT’PÛÛ\Û™[
›İËœÛ˜\ÚİÚY
_XÂˆÙ]]J]ØZ]ÑU
‹ØYZ[‹Ü\œÛÛ›™[[X]™K\™\Üˆ
ÈKÈˆJJNÂˆBˆØ]Ú
JHÂˆÙ]\œ›ÜŠK›Y\ÜØYÙH¶+ö,vã6)ö`v*ˆ6+6,¶)¶ã6)ö*ˆ6a¶)öavb6`v`ˆ6*6b6+ÈŠNÂˆBˆš[˜[HÂˆÙ]\ŞJ˜[ÙJNÂˆBˆNÂˆÛÛœİ›İÜÈH]Kœ›İÜÈ×NÂˆÛÛœİÙ[XİYH]KœÙ[XİY›İÜË™š[™
Oˆ
ŞœÛ˜\ÚİÚYOOHÙ[XİYY
H[ÂˆÛÛœİš[\™YH›İÜË™š[\ŠˆOˆ	Ü‹›˜[YH‹œ\œÛÛ›™[Û˜[Y_H	Ü‹œ\œÛÛ›™[ØÛÙ_H	Ü‹œ›ÛWİ]HˆŸXÓØØ[SİÙ\Ø\ÙJ
Kš[˜ÛY\Ê]Y\Kš[J
KÓØØ[SİÙ\Ø\ÙJ
JJNÂˆÛÛœİZ[œÈHˆOˆÈÛÛœİˆH[X™\Šˆ
KÚYÛˆHˆÈ¸¢$ˆˆˆˆ‹HHX]˜XœÊŠNÈ™]\›ˆÚYÛˆ
Èİš[™ÊX]™›ÛÜŠHÈŒ
JKœYİ\
‹ŒŠH
Èˆˆ
Èİš[™ÊH	HŒ
KœYİ\
‹ŒŠNÈNÂˆÛÛœİÛİ[HˆOˆ˜J[X™\Šˆ
JNÂˆÛÛœİ^Ü[H

HOˆÈHÂˆ^ÜŞ
š[\™Y›X\
ˆOˆ
È¶a¶)öaH6b6a¶)öaH6+¶)öa¶b6)ö+ö«öãˆ‹›˜[YH‹œ\œÛÛ›™[Û˜[YK¶ªv+È6o¶,v,öa¶a6ãˆ‹œ\œÛÛ›™[ØÛÙK¶,öav*ˆˆ‹œ›ÛWİ]Hˆ‹¶av+6)ö,ˆ6av)öaö)öa¶aÈ
6,ö)ö.v*¶+ö`¶ã6`¶aÊHˆZ[œÊ‹›[ÛWØ[İÙYÛZ[ŠK¶av-v,v`H6av)öaö)öa¶aÈ
6,ö)ö.v*¶+ö`¶ã6`¶aÊHˆZ[œÊ‹›[ÛWİ\ÙYÛZ[ŠK¶*¶.v+ö)ö+È6av,v+¶-vã6av)öaö)öa¶aÈˆ[X™\Š‹›[ÛWİ\ÙYØÛİ[
K¶av)öa¶+öaÈ6av)öaö)öa¶aÈ
6,ö)ö.v*¶+ö`¶ã6`¶aÊHˆZ[œÊ‹›[ÛWØ˜[[˜ÙWÛZ[ŠK¶av+6)ö,ˆ6,ö)öa6)öa¶aÈ
6,ö)ö.v*¶+ö`¶ã6`¶aÊHˆZ[œÊ‹YX\›WØ[İÙYÛZ[ŠK¶av-v,v`H6,ö)öa6)öa¶aÈ
6,ö)ö.v*¶+ö`¶ã6`¶aÊHˆZ[œÊ‹YX\›Wİ\ÙYÛZ[ŠK¶*¶.v+ö)ö+È6av,v+¶-vã6,ö)öa6)öa¶aÈˆ[X™\Š‹YX\›Wİ\ÙYØÛİ[
K¶av)öa¶+öaÈ6,ö)öa6)öa¶aÈ
6,ö)ö.v*¶+ö`¶ã6`¶aÊHˆZ[œÊ‹YX\›WØ˜[[˜ÙWÛZ[ŠHJJK¶«ö,¶)ö,v-6ªva6ã‹6«ö,¶)ö,v-öav,v+¶-vãÉÙ]KYX\ŸWÉÙ]K›[ÛKŞ
NÂˆBˆØ]Ú
JHÂˆÙ]\œ›ÜŠK›Y\ÜØYÙJNÂˆHNÂˆÛÛœİ^Ü]Z[H

HOˆÂˆYˆ
\Ù[XİY
Bˆ™]\›ÂˆHÂˆÛÛœİİ™\šY]ÈHÈ¶a¶)öaH6b6a¶)öaH6+¶)öa¶b6)ö+ö«öãˆÙ[XİY›˜[YHÙ[XİYœ\œÛÛ›™[Û˜[YK¶ªv+È6o¶,v,öa¶a6ãˆÙ[XİYœ\œÛÛ›™[ØÛÙK¶av+6)ö,ˆ6av)öaö)öa¶aÈˆZ[œÊÙ[XİY›[ÛWØ[İÙYÛZ[ŠK¶av-v,v`H6av)öaö)öa¶aÈˆZ[œÊÙ[XİY›[ÛWİ\ÙYÛZ[ŠK¶*¶.v+ö)ö+È6av,v+¶-vã6av)öaö)öa¶aÈˆ[X™\ŠÙ[XİY›[ÛWİ\ÙYØÛİ[
K¶av)öa¶+öaÈ6av)öaö)öa¶aÈˆZ[œÊÙ[XİY›[ÛWØ˜[[˜ÙWÛZ[ŠK¶av+6)ö,ˆ6,ö)öa6)öa¶aÈˆZ[œÊÙ[XİYYX\›WØ[İÙYÛZ[ŠK¶av-v,v`H6,ö)öa6)öa¶aÈˆZ[œÊÙ[XİYYX\›Wİ\ÙYÛZ[ŠK¶*¶.v+ö)ö+È6av,v+¶-vã6,ö)öa6)öa¶aÈˆ[X™\ŠÙ[XİYYX\›Wİ\ÙYØÛİ[
K¶av)öa¶+öaÈ6,ö)öa6)öa¶aÈˆZ[œÊÙ[XİYYX\›WØ˜[[˜ÙWÛZ[ŠHNÂˆÛÛœİ™\HH
]Kœ™\]Y\İÈ×JK›X\
Oˆ
È¶a¶b6.Hˆ
È[›X[ˆ¶)ö,ö*¶+v`¶)ö`¶ã‹ÚXÚÎˆ¶)ö,ö*¶.va6)ö+6ã‹[œZYˆ¶*6+öb6aˆ6+v`¶b6`ˆˆJVŞ\WH\K¶)ö,ˆ6*¶)ö,vã6+ˆˆ™œ›ÛWÚ™]HWÙ]Hˆ‹¶*¶)È6*¶)ö,vã6+ˆˆ×Ú™]HWÙ]Hˆ‹¶)ö,ˆ6,ö)ö.v*ˆˆ™œ›ÛWİ[YHˆ‹¶*¶)È6,ö)ö.v*ˆˆ×İ[YHˆ‹¶av+ö*ˆ
6+ö`¶ã6`¶aÊHˆ[X™\Š›Z[]\È
K¶b6-¶.vã6*ˆˆœİ]\Èˆ‹¶+öa6ã6aˆœ™X\ÛÛˆˆ‹¶ã6)ö+ö+ö)ö-6*ˆ6*¶(öã6ã6+Èˆ˜\›İ™\—Û›İHˆ‹¶*ö*6*ˆˆ˜Ü™X]YØ]ˆˆJJNÂˆÛÛœİØˆHÖ][Ë˜›ÛÚ×Û™]Ê
NÂˆÖ][Ë˜›ÛÚ×Ø\[™ÜÚY]
Ø‹Ö][ËšœÛÛ—İ×ÜÚY]
Ûİ™\šY]×JK¶+¶a6)ö-vaÈŠNÂˆÖ][Ë˜›ÛÚ×Ø\[™ÜÚY]
Ø‹Ö][ËšœÛÛ—İ×ÜÚY]
™\JK¶+ö,v+¶b6)ö,ö*¸ #6aö)ÈŠNÂˆÖÜš]Qš[JØ‹6+6,¶)¶ã6)ö*—öav,v+¶-vãÉÜÙ[XİYœ\œÛÛ›™[ØÛÙ_WÉÙ]KYX\ŸWÉÙ]K›[ÛKŞ
NÂˆBˆØ]Ú
JHÂˆÙ]\œ›ÜŠK›Y\ÜØYÙJNÂˆBˆNÂˆÛÛœİHÈY[™Îˆ\‹›Ü™\›İÛNˆŒœÛÛY˜\ŠK[[™JH‹Ú]TÜXÙNˆ››İÜ˜\‹›ÛÚ^™NˆL‹^[YÛˆœšYÚˆNÂˆÛÛœİHÈY[™Îˆ‹›Ü™\›İÛNˆŒ\ÛÛY˜\ŠK[[™JH‹›ÛÚ^™NˆL‹Ú]TÜXÙNˆ››İÜ˜\ˆNÂˆÛÛœİXY\œÈHÈ¶a¶)öaH6b6a¶)öaH6+¶)öa¶b6)ö+ö«öã‹¶ªv+È6o¶,v,öa¶a6ã‹¶,öav*ˆ‹¶av+6)ö,ˆ6av)öaö)öa¶aÈ‹¶av-v,v`H6av)öaö)öa¶aÈ‹¶*¶.v+ö)ö+È6av)öaö)öa¶aÈ‹¶av)öa¶+öaÈ6av)öaö)öa¶aÈ‹¶av+6)ö,ˆ6,ö)öa6)öa¶aÈ‹¶av-v,v`H6,ö)öa6)öa¶aÈ‹¶*¶.v+ö)ö+È6,ö)öa6)öa¶aÈ‹¶av)öa¶+öaÈ6,ö)öa6)öa¶aÈ—NÂˆÛÛœİ˜[YT›İÈHˆOˆÜ‹›˜[YH‹œ\œÛÛ›™[Û˜[YK‹œ\œÛÛ›™[ØÛÙK‹œ›ÛWİ]H¸ %‹Z[œÊ‹›[ÛWØ[İÙYÛZ[ŠKZ[œÊ‹›[ÛWİ\ÙYÛZ[ŠKÛİ[
‹›[ÛWİ\ÙYØÛİ[
KZ[œÊ‹›[ÛWØ˜[[˜ÙWÛZ[ŠKZ[œÊ‹YX\›WØ[İÙYÛZ[ŠKZ[œÊ‹YX\›Wİ\ÙYÛZ[ŠKÛİ[
‹YX\›Wİ\ÙYØÛİ[
KZ[œÊ‹YX\›WØ˜[[˜ÙWÛZ[ŠWNÂˆ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ[™[YZ[‹]ÛÜšÜÜXÙK\YÙH\œÛÛ›™[[X]™K\YÙHˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆÛÜšÜÜXÙK\ÙXİ[Û‹ZXY[™ÈˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹[—LWL—LŒ×LŒLŒÎHLŒ×L—LŒÌ×LŒ×L—LĞÈŠKˆ™XXİ˜Ü™X]Q[[Y[
šÈ‹[—LQ—LŒÌ—LŒ×LŒÌWLŒÍLWLŒÌWLŒ‘WLŒÍWLĞÈLÑWLŒÌWLŒÌ×L—LŠKˆ™XXİ˜Ü™X]Q[[Y[
œ‹[ˆ—LŒŒ—LWLŒ×LŒÌHLŒWLŒÈ‹ˆ]K›İYÚÚ™]H¸ %‹ˆ—LŒPˆL×LWLÈLWLŒ‘—LŒWLŒ×L×LŒÈLŒL×LŒ×LŒÍWLLŒÌWLŒHLŒÌ×LŒ×LŒÎWLŒN—LŒ‘—L—LĞ×L—LÈŠJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆ›^Ü˜\ˆÜ˜\ˆHKˆ™XXİ˜Ü™X]Q[[Y[
œÙ[Xİ‹ÈÛ\ÜÓ˜[YNˆš[œ]‹˜\šXK[X™[ˆ—LŒ×L—LŒWLŒ‘WLŒ×LŒLŒ‘—LLŒÌWLÈLQ—LŒÌ—LŒ×LŒÌWLŒÍLWLŒÌWLŒ‘WLŒÍWLĞÈ‹˜[YNˆ\š[ÙÛÚ[™ÙNˆHOˆÙ[Xİ\š[Ù
K\™Ù]˜[YJKİ[NˆÈZ[•ÚYˆNLHK]Kœ\š[ÙË›X\
OˆÈÛÛœİˆHYX\IÜYX\ŸI›[ÛIÜ›[ÛXÈ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹ÈÙ^Nˆ‹˜[YNˆˆKˆ˜JYX\ŠKˆ‹È‹ˆ˜Jİš[™Ê›[Û
KœYİ\
‹ŒŠJKˆˆLÈLŒWLŒÈ‹ˆ›İYÚÚ™]JNÈJJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹\ØX›Yˆ\ŞKÛÛXÚÎˆ

HOˆØY
\š[Ù
HK—LŒLŒ×LŒÌ—LŒ‘WLLŒ×L—LĞÈŠJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆX\™Ú[•ÜˆM›^Ü˜\ˆÜ˜\ˆHKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆˆ	İXˆOOH˜[ˆÈœˆˆˆŸXÛÛXÚÎˆ

HOˆÙ]XŠ˜[ŠHKˆ—LQ—LŒÌ—LŒ×LŒÌWLŒÍLNWLLĞÈL×LWL×LML—LĞ×LŒÌWLL×LŒÈ
‹ˆÛİ[
›İÜË›[™İ
KˆŠHŠKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆˆ	İXˆOOH™]Z[ˆÈœˆˆˆŸXÛÛXÚÎˆ

HOˆÙ]XŠ™]Z[ŠK\ØX›Yˆ\Ù[XİYK—LŒ×LŒÌ—LŒ—LĞ×LŒ×LŒHLWLŒÌWLŒ‘WLŒÍWLĞÈLĞ×LNHLÑWLŒÌWLŒÌ×L—LŠKˆXˆOOH˜[ˆÈ™XXİ˜Ü™X]Q[[Y[
™XXİ‘œ˜YÛY[[ˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹XÙZÛ\ˆ—LŒ×LŒÌ×LŒWLŒ×LLĞÈL—LŒ×LHLĞ×LŒÈLNWLŒ‘ˆLÑWLŒÌWLŒÌ×L—LLĞÈ‹˜[YNˆ]Y\KÛÚ[™ÙNˆHOˆÙ]]Y\JK\™Ù]˜[YJKİ[NˆÈX^ÚYˆŒHJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹ÛÛXÚÎˆ^Ü[\ØX›YˆYš[\™Y›[™İK—LŒ‘—LŒ×L—LLLŒ‘ˆ^Ù[LNWLLĞÈŠJHˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹ÛÛXÚÎˆ^Ü]Z[\ØX›Yˆ\Ù[XİYK—LŒ‘—LŒ×L—LLLŒ‘ˆ^Ù[LŒ×LŒÌ—LŒ—LĞ×LŒ×LŒHŠJKˆ\œ›Üˆ	‰ˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆÛÜšÜÜXÙKZ[›[™KY\œ›Üˆ‹›ÛNˆ˜[\ˆK\œ›ÜŠKˆ\ŞH	‰ˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆÛÜšÜÜXÙKY[\K\İ]H‹›ÛNˆœİ]\ÈˆK—LŒ‘—LŒÌHLŒ‘LŒ×LLŒ‘—LŒÌWLĞ×LŒ×LWLŒHLQ—LŒÌ—LŒ×LŒÌWLŒÍLŒˆŠKˆXˆOOH˜[ˆ	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆX›K]Ü˜\ÛÜšÜÜXÙK]ÚYK]X›H\œÛÛ›™[[X]™K]X›H‹›ÛNˆœ™YÚ[Ûˆ‹˜\šXK[X™[ˆ—LQ—LŒÌ—LŒ×LŒÌWLŒÍLNWLLĞÈLWLŒÌWLŒ‘WLŒÍWLĞ×LŒPˆL—LŒ×LŒLLÑWLĞ×LWLŒ×LĞ×LŒÍLŒ×LWL—LĞÈ‹X’[™^ˆKˆ™XXİ˜Ü™X]Q[[Y[
X›H‹Èİ[NˆÈ›Ü™\ÛÛ\ÙNˆ˜ÛÛ\ÙH‹ÚYˆŒL	H‹Z[•ÚYˆLLŒHKˆ™XXİ˜Ü™X]Q[[Y[
XY‹Èİ[NˆÈÜÚ][ÛˆœİXÚŞH‹Üˆ˜XÚÙÜ›İ[™ˆ˜\ŠK\\\ŠH‹’[™^ˆHHKˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹[XY\œË›X\
Oˆ™XXİ˜Ü™X]Q[[Y[
‹ÈÙ^Nˆİ[NˆK
JJJKˆ™XXİ˜Ü™X]Q[[Y[
›ÙH‹[š[\™Y›X\
ˆOˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹ÈÙ^Nˆ‹œÛ˜\ÚİÚYİ[NˆÈ˜XÚÙÜ›İ[™ˆ
Ü‹œÛ˜\ÚİÚYOOHÙ[XİYYÈ˜\ŠKXœ˜[™\ÛÙ
HˆˆˆˆHK˜[YT›İÊŠK›X\

‹JHOˆ™XXİ˜Ü™X]Q[[Y[
‹ÈÙ^NˆKİ[NˆKHOOHÈ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹È\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆœ\œÛÛ›™[[X]™KY]Z[[[šÈ‹ÛÛXÚÎˆ

HOˆÙ[Xİ\œÛÛŠŠK˜\šXK[X™[ˆ¶av-6)öaö+öaÈ6+6,¶)¶ã6)ö*ˆ6av,v+¶-vãˆ
ÈˆKŠHˆŠJJJJJKˆYš[\™Y›[™İ	‰ˆX\ŞH	‰ˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆÛÜšÜÜXÙKY[\K\İ]HˆK—LŒLŒÌWLŒ×LĞÈLŒ×LĞ×LˆLŒ‘—LLŒÌWLÈLŒ‘—LŒ×LŒ‘—L×LŒ×LŒ×LĞÈLŒ—LŒLŒHL—LŒÍLŒ‘—LÈLŒ×LŒÌ×LŒKˆŠJKˆXˆOOH™]Z[ˆ	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈX\™Ú[•ÜˆMHK\Ù[XİYÈ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]YˆK—LŒLŒÌWLŒ×LĞÈLWLŒÍLŒ×L×LŒ‘—L×LMLŒ×LŒÌ—LŒ—LĞ×LŒ×LŒWLŒÈLĞ×LNHL—LWLŒÌHLŒÌWLŒÈLŒ×LŒÌˆLŒWLŒLQ—LŒÌ—LŒ×LŒÌWLŒÍLNWLLĞÈLŒ×L—LŒWLŒ‘WLŒ×LŒLNWL—LĞ×LŒ‘‹ˆŠHˆ™XXİ˜Ü™X]Q[[Y[
™XXİ‘œ˜YÛY[[ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈ\İYPÛÛ[ˆœÜXÙKX™]ÙY[ˆ‹›^Ü˜\ˆÜ˜\‹Ø\ˆLHKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[Ù[XİY›˜[YHÙ[XİYœ\œÛÛ›™[Û˜[YJKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈX\™Ú[”šYÚˆLHKˆ—LNWLŒ‘ˆ‹ˆÙ[XİYœ\œÛÛ›™[ØÛÙKˆˆLÈ‹ˆÙ[XİYœ›ÛWİ]H¶,öav*ˆ6a¶)öav-6+¶-HŠJKˆY]Kœ™\]Y\İ×Ø]˜Z[X›H	‰ˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ›ÛÚ^™NˆLˆHK—LŒ×LĞ×LˆLŒÌWLŒ‘—LĞ×LHL×L—LLŒÌˆLŒLÈLŒ‘LŒÌ×LŒ×LŒLNWLŒ×LŒÌWLŒLŒÌWLĞÈLĞ×LNWLŒWLŒÈLWLŒWLŒÍWLL—LĞ×LŒÌ×LŒWLŒPˆLŒÌ×LLŒ×LŒLˆLŒ‘—LŒÌWLŒ‘WLLŒ×LŒÌ×LŒHLŒÌ×LŒ×LWLŒ×L—LÈLŒ‘—LŒÌHLŒ‘—LŒÌ×LŒWLŒÌWLŒÌÈL—LĞ×LŒÌ×LŒKˆŠJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈİ™\™›İÎˆ˜]]È‹X\™Ú[•ÜˆLHKˆ™XXİ˜Ü™X]Q[[Y[
X›H‹Èİ[NˆÈ›Ü™\ÛÛ\ÙNˆ˜ÛÛ\ÙH‹ÚYˆŒL	HˆHKˆ™XXİ˜Ü™X]Q[[Y[
XY‹[ˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹[XY\œËœÛXÙJÊK›X\
Oˆ™XXİ˜Ü™X]Q[[Y[
‹ÈÙ^Nˆİ[NˆK
JJJKˆ™XXİ˜Ü™X]Q[[Y[
›ÙH‹[ˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹[˜[YT›İÊÙ[XİY
KœÛXÙJÊK›X\

‹JHOˆ™XXİ˜Ü™X]Q[[Y[
‹ÈÙ^NˆKİ[NˆKŠJJJJJKˆ™XXİ˜Ü™X]Q[[Y[
š‹Èİ[NˆÈX\™Ú[•ÜˆNHK—LŒ‘—LŒÌWLŒ‘WLLŒ×LŒÌ×LŒWLŒ×L×LŒ×LĞÈLŒ—LŒLŒWLŒ×LŒÍLŒ‘—LÈLŒ‘—LŒÌHLŒÌ×LŒ×LWLŒ×L—LÈLŒWLŒÈLŒWLŒ×LŒÌWLĞ×LŒ‘HLWLŒL—LŒÈŠKˆY]Kœ™\]Y\İ×Ø]˜Z[X›HÈ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ›ÛÚ^™NˆLˆHK—LŒLŒÌWLŒ×LĞÈLWLŒÍLŒ×L×LŒ‘—L×LMLŒÌ×LLŒ×LŒLˆLŒ‘—LŒÌWLŒ‘WLLŒ×LŒÌ×LŒWLŒÈLŒ×LĞ×LˆLÑWLŒÌWLŒÌ×L—LLŒLŒ×LĞ×LŒ‘ˆLŒ‘—LŒÌHLWLŒ×LĞ×LÔSLŒLÈLŒ‘LŒÌ×LŒ×LŒLNWLŒ×LŒÌWLŒLŒÌWLĞÈLĞ×LNWLŒWLŒÈLWLŒWLŒÍWLLŒÍLLŒ‘‹ˆŠHˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈİ™\™›İÎˆ˜]]È‹X^ZYÚˆÍŒX\™Ú[•ÜˆHKˆ™XXİ˜Ü™X]Q[[Y[
X›H‹Èİ[NˆÈ›Ü™\ÛÛ\ÙNˆ˜ÛÛ\ÙH‹ÚYˆŒL	H‹Z[•ÚYˆLHKˆ™XXİ˜Ü™X]Q[[Y[
XY‹Èİ[NˆÈÜÚ][ÛˆœİXÚŞH‹Üˆ˜XÚÙÜ›İ[™ˆ˜\ŠK\\\ŠHˆHKˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹[È¶a¶b6.H‹¶)ö,ˆ6*¶)ö,vã6+ˆ‹¶*¶)È6*¶)ö,vã6+ˆ‹¶,ö)ö.v*ˆ‹¶av+ö*ˆ
6+ö`¶ã6`¶aÊH‹¶b6-¶.vã6*ˆ‹¶+öa6ã6a—K›X\
Oˆ™XXİ˜Ü™X]Q[[Y[
‹ÈÙ^Nˆİ[NˆK
JJJKˆ™XXİ˜Ü™X]Q[[Y[
›ÙH‹[
]Kœ™\]Y\İÈ×JK›X\
Oˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹ÈÙ^NˆšYKÊÈ[›X[ˆ¶)ö,ö*¶+v`¶)ö`¶ã‹ÚXÚÎˆ¶)ö,ö*¶.va6)ö+6ã‹[œZYˆ¶*6+öb6aˆ6+v`¶b6`ˆˆJVŞ\WH\K™œ›ÛWÚ™]HWÙ]H¸ %‹×Ú™]HWÙ]H¸ %‹Ş™œ›ÛWİ[YK×İ[YWK™š[\Š›ÛÛX[ŠKš›Ú[Šˆ6*¶)ÈŠH¸ %‹Ûİ[
›Z[]\ÊKœİ]\È¸ %‹œ™X\ÛÛˆ¸ %—K›X\

‹JHOˆ™XXİ˜Ü™X]Q[[Y[
‹ÈÙ^NˆKİ[NˆKŠJJJJJKˆJ
ØHH]Kœ™\]Y\İÊHOOH[ØHOOH›ÚYÈ›ÚYˆØK›[™İ
H	‰ˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈY[™ÎˆLˆHK—LŒ‘—LŒÌWLŒ‘WLLŒ×LŒÌ×LŒHLWLŒÌWLŒ‘WLŒÍWLĞÈLŒ—LŒLŒWLŒ×LŒÍLŒ‘—L×LŒ×LŒ×LĞÈLŒ‘—LŒÌHLŒÌ×LŒ×LWLŒ×L—LÈLŒLŒÌWLŒ×LĞÈLŒ×LĞ×LˆLŒLŒ×LŒÌ—LÈLĞ×LŒ×LWLŒHL—LŒÍLŒ‘‹ˆŠJJJKˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ›ÛÚ^™NˆLKX\™Ú[•ÜˆLˆHK—LP—LWLŒ×LŒ×LŒÌ—LˆLŒ×LŒÌˆLŒ×LWLŒÎHLWLŒÍWLŒÌWLHLLWLŒ×L—LŒ‘—LÈLŒ‘—LŒÌHLWLŒ×LĞ×LLWLŒL—LŒÈLWLŒ‘LŒ×LŒÌ×LŒLÈLWLĞ×LŒ×LŒÍLLŒ‘—LŒPˆLŒÌ×LLŒ×LŒLˆLŒ‘—LŒÌWLŒ‘WLLŒ×LŒÌ×LŒHLWL—LŒÍÈLŒ×LŒÌˆLŒ‘—LŒÌWLŒ‘WLLŒ×LŒÌ×LŒWLŒ×L×LŒ×LĞÈLŒ—LŒLŒWLŒ×LŒÍLŒ‘—LÈLLWLŒÌWLŒWLŒLŒÍÈLŒ‘—LŒÌHLŒÌ×LŒ×LWLŒ×L—LÈLWLĞ×LŒ×LŒŒ—LĞ×LŒ‘‹ˆLWL—LŒ×LŒ‘—LĞ×LŒÌHLWL—LWLĞÈLŒÎWLĞ×L—LŒ×LˆLŒ‘LWLŒÎLŒÍLŒ‘—L×LŒ×LŒ×L—LŒ‘‹ˆŠJNÂŸB‹ËÈš[[Û›HM[™ØØ\H^[İ]˜\ÙYÛˆHİ\YYš[È[›ÚXÙHØ[\K‚‹ËÈ\È\ÈHØØ[Ø[\È[›ÚXÙNÈ]Ù\È›İ™\XÙHH^X]]Üš]H[›ÚXÙK‚™[˜İ[ÛˆZ[š[Ò[›ÚXÙR[
[›ÚXÙKÙ[\ŠHÂˆÛÛœİ\ØÈHˆOˆİš[™ÊˆOOH[	‰ˆˆOOH›ÚYÈˆˆˆŠKœ™\XÙJÖÉˆ‰×KÙËÈOˆ
È‰ˆˆ‰˜[\È‹ˆ‰›È‹ˆˆ‰™İÈ‹	È‰Îˆ‰œ][İÈ‹‰Èˆ‰ˆÌÎNÈˆVØ×JJNÂˆÛÛœİYÚ]ÈHˆOˆİš[™ÊˆOOH[	‰ˆˆOOH›ÚYÈˆˆˆŠKœ™\XÙJÖÌNWKÙËOˆ¶ì6ìvì¶ìöí6íví¶íöî6îH–Ó[X™\Š
WJNÂˆÛÛœİ[X™\ˆHˆOˆ[X™\Šˆ
KÓØØ[Tİš[™Ê™˜KRTˆŠNÂˆÛÛœİ^Y\ˆH\[Ùˆ[›ÚXÙK˜ÛÛ\[WÜÛ˜\ÚİOOHœİš[™ÈˆÈ”ÓÓ‹œ\œÙJ[›ÚXÙK˜ÛÛ\[WÜÛ˜\ÚİßHŠHˆ[›ÚXÙK˜ÛÛ\[WÜÛ˜\ÚİßNÂˆÛÛœİÚYÛ™\ˆH
\[Ùˆ[›ÚXÙKœÚYÛ™\—ÜÛ˜\ÚİOOHœİš[™ÈˆÈ”ÓÓ‹œ\œÙJ[›ÚXÙKœÚYÛ™\—ÜÛ˜\Úİ›[ŠHˆ[›ÚXÙKœÚYÛ™\—ÜÛ˜\Úİ
H^Y\‹—Ú[›ÚXÙWÜÚYÛ™\ˆ[ÂˆÛÛœİÚYÛ˜]\™TÜ˜ÈH^Y\‹—Ú[˜ÛYWÜÚYÛ˜]\™WÚ[XYÙHOOH˜[ÙHÈˆˆˆ

ÚYÛ™\ˆOOH[ÚYÛ™\ˆOOH›ÚYÈ›ÚYˆÚYÛ™\‹œÚYÛ˜]\™WÙ]JH‹Ø\ÜÙ]ËÚ[›ÚXÙ\ËÜØ[\K\ÚYÛ˜]\™KšœÈŠNÂˆÛÛœİ][\ÈH\[Ùˆ[›ÚXÙK›[™WÚ][\ÈOOHœİš[™ÈˆÈ”ÓÓ‹œ\œÙJ[›ÚXÙK›[™WÚ][\È–×HŠHˆ[›ÚXÙK›[™WÚ][\È×NÂˆÛÛœİX™[H
]K˜[YJHOˆÜ[‰İ]_NØˆ	Ù\ØÊYÚ]Ê˜[YHˆŠJ_OÜÜ[˜ÂˆÛÛœİ\HH
]K[]K\ÔÙ[\ŠHOˆÙXİ[ÛˆÛ\ÜÏHœ\H‰İ]_OÚ]ˆÛ\ÜÏHœ\KYÜšY‚ˆ	ÛX™[
¶a¶)öaH6-6+¶-H6+v`¶ã6`¶ãö+v`¶b6`¶ã‹\ÔÙ[\ˆÈ[]K›˜[YHˆ[]K˜ÛÛ\[WÛ˜[YJ_IÛX™[
¶-6av)ö,vaÈ6)ö`¶*¶-v)ö+öã‹[]K™XÛÛ›ÛZX×ØÛÙJ_IÛX™[
¶-6av)ö,vaÈ6*ö*6*ˆ‹[]Kœ™YÚ\İ˜][Û—Û[X™\Š_Bˆ	ÛX™[
¶a¶-6)öa¶ã6ªv)öava‹[]K˜Y™\ÜÊ_IÛX™[
¶)ö,ö*¶)öaˆ‹[]Kœ›İš[˜ÙJ_IÛX™[
¶-6aö,H‹[]K˜Ú]J_Bˆ	ÛX™[
¶-6a¶)ö,öaÈ6ava6ã‹[]K›˜][Û˜[ÚY
_IÛX™[
¶ªv+öo¶,ö*¶ã6ìvì6,v`¶avã‹[]KœÜİ[ØÛÙJ_IÛX™[
¶-6av)ö,vaÈ6*¶a6`vaˆ‹[]KœÛ™J_BˆÙ]ÜÙXİ[Û˜ÂˆÛÛœİİXİ[H[X™\Š[›ÚXÙKœİXİ[ÜšX[
K\ØÛİ[H[X™\Š[›ÚXÙK™\ØÛİ[ÜšX[
K^H[X™\Š[›ÚXÙK^ÜšX[
NÂˆ]\ÜÚYÛ™Y\ØÛİ[H\ÜÚYÛ™Y^HÂˆÛÛœİ›İÜÈH
\œ˜^Kš\Ğ\œ˜^J][\ÊHÈ][\Èˆ×JK›X\

][K[™^\œŠHOˆÂˆ˜\ˆØNÂˆÛÛœİ[[İ[H[X™\Š
ØHH][Kİ[ÜšX[
HOOH[	‰ˆØHOOH›ÚYÈØHˆ[X™\Š][Kœ]X[]H
H
ˆ[X™\Š][K[š]ÜšXÙWÜšX[
JNÂˆÛÛœİÚ\™HHİXİ[ˆÈ[[İ[ÈİXİ[ˆÂˆÛÛœİ›İÑ\ØÛİ[H[™^OOH\œ‹›[™İHHÈ\ØÛİ[H\ÜÚYÛ™Y\ØÛİ[ˆX]œ›İ[™
\ØÛİ[
ˆÚ\™JNÂˆÛÛœİ›İÕ^H[™^OOH\œ‹›[™İHHÈ^H\ÜÚYÛ™Y^ˆX]œ›İ[™
^
ˆÚ\™JNÂˆ\ÜÚYÛ™Y\ØÛİ[
ÏH›İÑ\ØÛİ[Âˆ\ÜÚYÛ™Y^
ÏH›İÕ^Âˆ™]\›ˆ‰Û[X™\Š[™^
ÈJ_OİİÛ\ÜÏH™\ØÜš\[Ûˆ‰Ù\ØÊYÚ]Ê][K]JJ_Oİ‰Û[X™\Š][Kœ]X[]J_Oİ¶.v+ö+Ïİ‰Û[X™\Š][K[š]ÜšXÙWÜšX[
_Oİ‰Û[X™\Š[[İ[
_Oİ‰Û[X™\Š›İÑ\ØÛİ[
_Oİ‰Û[X™\Š[[İ[H›İÑ\ØÛİ[
_Oİ‰Û[X™\Š›İÕ^
_Oİ‰Û[X™\Š[[İ[H›İÑ\ØÛİ[
È›İÕ^
_Oİİ˜ÂˆJKš›Ú[ŠˆŠNÂˆÛÛœİ]HHİš[™Ê[›ÚXÙKš\ÜİYYÙ]HˆŠKœ™\XÙJËKÙË‹ÈŠNÂˆ™]\›ˆYØİ\H[[[™ÏH™˜Hˆ\HœXYY]HÚ\œÙ]H•U‹N]O¶-vb6,v*¶+v,ö)ö*	Ù\ØÊ[›ÚXÙKš[›ÚXÙWÛ[X™\Š_Oİ]Oİ[O‚ˆYÙ^ÜÚ^™NM[™ØØ\NÛX\™Ú[ŒL[[HL[_JØ›Ş\Ú^š[™Î˜›Ü™\‹X›ŞX›Ù^ÛX\™Ú[ŒØÛÛÜˆÌLLNÙ›ÛY˜[Z[N•ZÛXK\šX[Ø[œË\Ù\šYÙ›Û\Ú^™NŒLÙ\™Xİ[ÛœØ˜XÚÙÜ›İ[™ˆÙ™™ŸZK‹ÛX\™Ú[ŒZXY\ÚZYÚŒÜÙ\Ü^N™ÜšYÙÜšY][\]KXÛÛ[[œÎŒYœˆYœˆYœØ[YÛ‹Z][\Îœİ\ZXY\ˆ^İ^X[YÛ˜Ù[\Ù›Û\Ú^™NŒM\ÛX\™Ú[‹]ÜZXY\ˆœYÙ^İ^X[YÛœšYÚÙ›Û\Ú^™NŒL\ZXY\ˆ›Y]^Ù\Ü^N™ÜšYÙÜšY][\]KXÛÛ[[œÎLLLÙØ\ŒÜœØ[YÛ‹Z][\Î˜Ù[\Ú\İYKXÛÛ[™[™İ^X[YÛœšYÚZXY\ˆ›Y]Hİ›Û™ŞØ›Ü™\Œ\ÛÛYÌÌÌÎİ^X[YÛ˜Ù[\ÜY[™ÎŒÜÙ›Û\Ú^™NŒL\Ù›Û]ÙZYÚÙ\™Xİ[Û›ŸKœ\^Ø›Ü™\Œ\ÛÛYÌŒŒÛX\™Ú[‹X›İÛNŒœKœ\H‹œÙXİ[Û‹ZXY[™ŞÙ›Û\Ú^™NŒLœİ^X[YÛ˜Ù[\Ø›Ü™\‹X›İÛNŒœÛÛYÌŒŒÜY[™Î\Ù›Û]ÙZYÚÌKœ\KYÜšYÙ\Ü^N™ÜšYÙÜšY][\]KXÛÛ[[œÎœ™\X]
ËZ[›X^
YœŠJNÙØ\œMœÜY[™Î\ÜÛZ[‹ZZYÚ\Kœ\KYÜšYÜ[İÚ]K\ÜXÙN››Ü›X[Ûİ™\™›İË]Ü˜\˜[]Ú\™_Kœ\KYÜšYÙ›Û]ÙZYÚLKœÙXİ[Û‹ZXY[™ŞØ›Ü™\Œ\ÛÛYÌŒŒÛX\™Ú[‹]ÜŒœ]X›^İÚYŒL	NØ›Ü™\‹XÛÛ\ÙN˜ÛÛ\ÙNİX›K[^[İ]™š^YÙ\™Xİ[ÛœÙ›Û\Ú^™N\]Ø›Ü™\Œ\ÛÛYÌLLNİ^X[YÛ˜Ù[\ÜY[™ÎœÜİ™\XØ[X[YÛ›ZY_]ÚZYÚLœÙ›Û]ÙZYÚÌ]ÚZYÚÜ]™\ØÜš\[Ûİ^X[YÛœšYÚÛ[™KZZYÚŒKÎÛİ™\™›İË]Ü˜\˜[]Ú\™_]X›H›XÚ[
J^İÚYŒÉ_]X›H›XÚ[
Š^İÚYI_]X›H›XÚ[
Ê^İÚYŒŒI_]X›H›XÚ[

^İÚYÉ_]X›H›XÚ[
J^İÚYÉ_]X›H›XÚ[
Š^İÚYI_]X›H›XÚ[
Ê^İÚYI_]X›H›XÚ[

^İÚYÉ_]X›H›XÚ[
J^İÚYŒLI_]X›H›XÚ[
L
^İÚYŒL	_]X›H›XÚ[
LJ^İÚYŒLI_]›ÛİÚZYÚŒÌÙ›Û]ÙZYÚÌ]›ÛİÛÜ™Şİ^X[YÛœšYÚÙ›Û]ÙZYÚK˜ÛÛ™][ÛœŞİÚYL	NÛX\™Ú[‹\šYÚŒÛX\™Ú[‹[Y˜]]ÎØ›Ü™\Œ\ÛÛYÌŒŒÙ›Û\Ú^™NŒL\K˜ÛÛ™][ÛœÏ™]ÜY[™ÎœØ›Ü™\‹X›İÛNŒ\ÛÛYÌŒŒŸK˜ÛÛ™][ÛœÏ™]›\İXÚ[Ø›Ü™\‹X›İÛNŒÛZ[‹ZZYÚŒÌÜKœÚYÛ˜]\™\ŞÙ\Ü^N™›^Ú\İYKXÛÛ[œÜXÙKX™]ÙY[ÛZ[‹ZZYÚŒLÍ\Ø[YÛ‹Z][\Î™›^Y[™ÜY[™ÎŒM\KœÚYÛ˜]\™\ÈÜ[İÚYŒÎ	Nİ^X[YÛ˜Ù[\Ù›Û\Ú^™NŒLœK™\ØÛZ[Y\Ù›Û\Ú^™Nİ^X[YÛ˜Ù[\ØÛÛÜˆÍMMNÛX\™Ú[‹]Ü\K˜Xİ[ÛœŞÜY[™ÎŒLİ^X[YÛ˜Ù[\ŸPYYXHš[Ë˜Xİ[ÛœŞÙ\Ü^N››Û™_]XYÙ\Ü^NX›KZXY\‹YÜ›İ\]Øœ™XZËZ[œÚYN˜]›ÚY_PYYXHØÜ™Y[Ø›Ù^ÛX^]ÚYŒLNÛX\™Ú[ŒM\]]ÎÜY[™ÎŒMK˜Xİ[ÛœÈ]ÛÜY[™ÎN_Bˆ›ÛY˜XÙ^Ù›ÛY˜[Z[N’[›ÚXÙU˜^š\ÜÜ˜Î\›
	ËØ\ÜÙ]ËÙ›ÛËÕ˜^š\›X]‹T™Yİ[\‹‰ÊH›Ü›X]
	İY]\IÊNÙ›Û]ÙZYÚÙ›ÛY\Ü^NœİØ\P›ÛY˜XÙ^Ù›ÛY˜[Z[N’[›ÚXÙU˜^š\ÜÜ˜Î\›
	ËØ\ÜÙ]ËÙ›ÛËÕ˜^š\›X]‹P›Û‰ÊH›Ü›X]
	İY]\IÊNÙ›Û]ÙZYÚÌÙ›ÛY\Ü^NœİØ\X›Ù^Ù›ÛY˜[Z[N’[›ÚXÙU˜^š\‹ZÛXKØ[œË\Ù\šYŸKœÚYÛ˜]\™\ŞØ[YÛ‹Z][\Î™›^\İ\ÜY[™Ë]ÜŒLœÛZ[‹ZZYÚŒM\KœÚYÛ˜]\™K\\œÛÛÙ\Ü^N˜›ØÚÎÛX\™Ú[‹]ÜœÙ›Û]ÙZYÚÌKœÚYÛ˜]\™K\›Û^Ù\Ü^N˜›ØÚÎÛX\™Ú[‹]ÜŒÜÙ›Û\Ú^™NŒLKœÚYÛ˜]\™K\Ø[\^Ù\Ü^N˜›ØÚÎİÚYŒLM\ÚZYÚœÛØš™XİYš]˜ÛÛZ[ÛX\™Ú[]]ÈÛZ^X›[™[[ÙN›][\_KœÚYÛ˜]\™KXØ\[ÛÙ\Ü^N˜›ØÚÎÙ›Û\Ú^™NØÛÛÜˆÍŸBˆÜİ[OÚXY›ÙOXY\]ˆÛ\ÜÏHœYÙH¶-v`v+vaÈ6ìH6)ö,ˆ6ìOÙ]O¶-vb6,v*¶+v,ö)ö*6`v,vb6-6ªv)öa6)È6b6+¶+öav)ö*ÚO]ˆÛ\ÜÏH›Y]HÜ[¶-6av)ö,vaÈ6,ö,vã6)öaÜÜ[İ›Û™Ï‰Ù\ØÊYÚ]Ê[›ÚXÙKš[›ÚXÙWÛ[X™\ŠJ_OÜİ›Û™ÏÜ[¶*¶)ö,vã6+ÜÜ[İ›Û™Ï‰Ù\ØÊYÚ]Ê]JJ_OÜİ›Û™ÏÙ]ÚXY\‚ˆ	Ü\J¶av-6+¶-v)ö*ˆ6`v,vb6-6a¶+öaÈ‹Ù[\‹YJ_IÜ\J¶av-6+¶-v)ö*ˆ6+¶,vã6+ö)ö,H‹^Y\‹˜[ÙJ_OˆÛ\ÜÏHœÙXİ[Û‹ZXY[™È¶av-6+¶-v)ö*ˆ6ªv)öa6)È6ã6)È6+¶+öav)ö*ˆ6avb6,v+È6av.v)öava6aÏÚ‚ˆX›OXY¶,v+öã6`Oİ¶ªv+È6ªv)öa6)Ïİ¶-6,v+H6ªv)öa6)È6ã6)È6+¶+öav)ö*İ¶*¶.v+ö)ö+Ëöav`¶+ö)ö,Oİ¶b6)ö+v+È6)öa¶+ö)ö,¶aø #6«öã6,vãİ¶av*6a6.ˆ6b6)ö+v+È
6,vã6)öa
Oİ¶av*6a6.ˆ6ªva
6,vã6)öa
Oİ¶av*6a6.ˆ6*¶+¶`vã6`Oİ¶av*6a6.ˆ6ªva6o¶,È6)ö,ˆ6*¶+¶`vã6`H
6,vã6)öa
Oİ¶+6av.H6.vb6)ö,v-ˆ6b6av)öa6ã6)ö*ˆ
6,vã6)öa
Oİ¶av*6a6.ˆ6ªva6*6.va6)öb6aÈ6av)öa6ã6)ö*ˆ6b6.vb6)ö,v-ˆ
6,vã6)öa
OİİİXY›ÙO‰Ü›İÜßOİ›ÙO›ÛİÛÛÜ[HˆˆÛ\ÜÏHÛÜ™È¶+6av.H6ªva6*6aÈ6+v,vb6`Nˆ8 %İ‰Û[X™\ŠİXİ[
_Oİ‰Û[X™\Š\ØÛİ[
_Oİ‰Û[X™\ŠİXİ[H\ØÛİ[
_Oİ‰Û[X™\Š^
_Oİ‰Û[X™\Š[›ÚXÙKİ[ÜšX[
_Oİİİ›ÛİİX›O‚ˆ]ˆÛ\ÜÏH˜ÛÛ™][ÛœÈ]¶-6,v)öã6-È6b6a¶+vb6aÈ6`v,vb6-ˆ6a¶`¶+öã8¦$8à 6.¶ã6,va¶`¶+öã8¦$Ù]]¶*¶b6-¶ã6+v)ö*ˆ	Ù\ØÊ[›ÚXÙK™\ØÜš\[ÛˆˆŠ_OÙ]Ù]‚ˆ]ˆÛ\ÜÏHœÚYÛ˜]\™\ÈÜ[¶avaö,H6b6)öav-¶)öã6`v,vb6-6a¶+öaÎ‰ÜÚYÛ™\ˆÈˆÛ\ÜÏHœÚYÛ˜]\™K\\œÛÛˆ‰Ù\ØÊÚYÛ™\‹™[Û˜[YJ_OØÛX[Û\ÜÏHœÚYÛ˜]\™K\›ÛH‰Ù\ØÊÚYÛ™\‹š›Ø—İ]HˆŠ_OÜÛX[˜ˆˆŸIÜÚYÛ˜]\™TÜ˜ÈÈ[YÈÛ\ÜÏHœÚYÛ˜]\™K\Ø[\HˆÜ˜ÏH‰Ù\ØÊÚYÛ˜]\™TÜ˜Ê_Hˆ[H¶)öav-¶)È˜ˆˆŸOÜÜ[Ü[¶avaö,H6b6)öav-¶)öã6+¶,vã6+ö)ö,NÜÜ[Ù]]ˆÛ\ÜÏH™\ØÛZ[Y\ˆ¶)öã6aˆ6`v)öªv*¶b6,H6+ö)ö+¶a6ã6)ö,ö*ˆ6b6+6)öã6«ö,¶ã6aˆ6-vb6,v*¶+v,ö)ö*6)öa6ªv*¶,vb6a¶ã6ªvã6,ö)öav)öa¶aÈ6av)6+öã6)öaˆ6a¶ã6,ö*‹Ù]]ˆÛ\ÜÏH˜Xİ[ÛœÈ]ÛˆÛ˜ÛXÚÏHÚ[™İËœš[

H¶¡¶)öoˆÈ6,6+¶ã6,vaÈØ]ÛÙ]Ø›ÙOÚ[˜ÂŸB™[˜İ[ÛˆİXœØÜš\[Û’[›ÚXÙ\ĞYZ[Š
HÂˆ˜\ˆØNÂˆÛÛœİÚ[›ÚXÙUX‹Ù][›ÚXÙUX—HH\ÙTİ]J™š[ÈŠNÂˆÛÛœİØÛÛ\[S›İXÙKÙ]ÛÛ\[S›İXÙWHH\ÙTİ]JˆŠNÂˆÛÛœİÜÙ[\‹Ù]Ù[\—HH\ÙTİ]J

HOˆÈHÂˆ™]\›ˆ”ÓÓ‹œ\œÙJØØ[İÜ˜YÙK™Ù]][JšÚ]X\‹™š[Ëš[›ÚXÙKœÙ[\‹ŒHŠHßHŠHßNÂˆBˆØ]Ú
ÊHÂˆ™]\›ˆßNÂˆHJNÂˆÛÛœİ\]TÙ[\ˆH
Ù^K˜[YJHOˆÙ]Ù[\Š™]ˆOˆÈÛÛœİ™^HÈ‹‹œ™]‹ÚÙ^WNˆ˜[YHNÈHÂˆØØ[İÜ˜YÙKœÙ]][JšÚ]X\‹™š[Ëš[›ÚXÙKœÙ[\‹ŒH‹”ÓÓ‹œİš[™ÚYJ™^
JNÂˆBˆØ]Ú
ÊHÈH™]\›ˆ™^ÈJNÂˆÛÛœİØÛÛ\[šY\ËÙ]ÛÛ\[šY\×HH\ÙTİ]J×JNÂˆÛÛœİÜÚYÛ™\œËÙ]ÚYÛ™\œ×HH\ÙTİ]J×JNÂˆÛÛœİÜÚYÛ™\‘›Ü›KÙ]ÚYÛ™\‘›Ü›WHH\ÙTİ]JÈYˆˆ‹[Û˜[YNˆˆ‹›Ø—İ]Nˆˆ‹ÚYÛ˜]\™WÙ]NˆˆˆJNÂˆÛÛœİÚ[›ÚXÙ\ËÙ][›ÚXÙ\×HH\ÙTİ]J×JNÂˆÛÛœİÙ\œ›Ü‹Ù]\œ›Ü—HH\ÙTİ]JˆŠNÂˆÛÛœİØ\ŞKÙ]\ŞWHH\ÙTİ]J˜[ÙJNÂˆÛÛœİÙš[\‹Ù]š[\—HH\ÙTİ]JˆŠNÂˆÛÛœİØXİ]™R[›ÚXÙKÙ]Xİ]™R[›ÚXÙWHH\ÙTİ]J[
NÂˆÛÛœİØÛÛ\[Q›Ü›KÙ]ÛÛ\[Q›Ü›WHH\ÙTİ]JÈÛÛ\[WÛ˜[YNˆˆ‹˜][Û˜[ÚYˆˆ‹XÛÛ›ÛZX×ØÛÙNˆˆ‹Û™Nˆˆ‹Y™\ÜÎˆˆˆJNÂˆÛÛœİÙ˜YÙ]˜YHH\ÙTİ]JÈÛÛ\[WÚYˆˆ‹ÚYÛ™\—ÚYˆˆ‹[˜ÛYWÜÚYÛ˜]\™WÚ[XYÙNˆYK\ÜİYYÙ]Nˆ


HOˆÈÛÛœİHÙ^RŠ
NÈ™]\›ˆİš[™ÊÌJH
È‹Hˆ
Èİš[™ÊÌWJKœYİ\
‹ŒŠH
È‹Hˆ
Èİš[™ÊÌ—JKœYİ\
‹ŒŠNÈJJ
KYWÙ]Nˆˆ‹\ØÜš\[Ûˆˆ‹\ØÛİ[ÜšX[ˆŒ‹^Ü\˜Ù[ˆŒ‹][\ÎˆŞÈ]Nˆ¶+v`ˆ6)ö-6*¶,v)öªH6,ö)öav)öa¶aÈ6+¶-öã6)ö,H
6av)öaö)öa¶aÊH‹]X[]NˆK[š]ÜšXÙWÜšX[ˆŒˆWHJNÂˆÛÛœİ[Û™^HHˆOˆ˜J[X™\Šˆ
KÓØØ[Tİš[™Ê™[‹UTÈŠJH
Èˆ6,vã6)öaÂˆÛÛœİ™Yœ™\ÚH\Ş[˜È

HOˆÂˆHÂˆÛÛœİØËK×HH]ØZ]›ÛZ\ÙK˜[
ÑÑU
‹ØYZ[‹ÜİXœØÜš\[Û‹Xİ\İÛY\œÈŠKÑU
‹ØYZ[‹ÜİXœØÜš\[Û‹Z[›ÚXÙ\ÈŠKÑU
‹ØYZ[‹Ú[›ÚXÙK\ÚYÛ™\œÈŠWJNÂˆÙ]ÛÛ\[šY\Ê\œ˜^Kš\Ğ\œ˜^JÊHÈÈˆ×JNÂˆÙ][›ÚXÙ\Ê\œ˜^Kš\Ğ\œ˜^JJHÈHˆ×JNÂˆÙ]ÚYÛ™\œÊ\œ˜^Kš\Ğ\œ˜^JÊHÈÈˆ×JNÂˆÙ]\œ›ÜŠˆŠNÂˆBˆØ]Ú
JHÂˆÙ]\œ›ÜŠK›Y\ÜØYÙH¶*6)ö,¶ã6)ö*6ã6`v)öªv*¶b6,vaö)È6a¶)öavb6`v`ˆ6*6b6+ÈŠNÂˆBˆNÂˆ\ÙQY™™Xİ


HOˆÈ™Yœ™\Ú

NÈK×JNÂˆÛÛœİØ]™TÚYÛ™\ˆH\Ş[˜È

HOˆÂˆYˆ
ÚYÛ™\‘›Ü›K™[Û˜[YKš[J
K›[™İŠHÂˆÙ]\œ›ÜŠ¶a¶)öaH6)öav-¶)öªva¶a¶+öaÈ6,v)È6b6)ö,v+È6ªva¶ã6+ËˆŠNÂˆ™]\›ÂˆBˆÙ]\ŞJYJNÂˆHÂˆÛÛœİ]HÚYÛ™\‘›Ü›KšYÈ‹ØYZ[‹Ú[›ÚXÙK\ÚYÛ™\œËÈˆ
ÈÚYÛ™\‘›Ü›KšYˆ‹ØYZ[‹Ú[›ÚXÙK\ÚYÛ™\œÈÂˆÛÛœİ™\İ[H]ØZ]ÑS‘
”ÔÕ‹]È[Û˜[YNˆÚYÛ™\‘›Ü›K™[Û˜[YK›Ø—İ]NˆÚYÛ™\‘›Ü›Kš›Ø—İ]KÚYÛ˜]\™WÙ]NˆÚYÛ™\‘›Ü›KœÚYÛ˜]\™WÙ]HJNÂˆÛÛœİYHÚYÛ™\‘›Ü›KšY™\İ[šYÂˆÙ]ÚYÛ™\œÊ]ØZ]ÑU
‹ØYZ[‹Ú[›ÚXÙK\ÚYÛ™\œÈŠJNÂˆÙ]˜Y
™]ˆOˆ
È‹‹œ™]‹ÚYÛ™\—ÚYˆİš[™ÊY
HJJNÂˆÙ]ÚYÛ™\‘›Ü›JÈYˆˆ‹[Û˜[YNˆˆ‹›Ø—İ]Nˆˆ‹ÚYÛ˜]\™WÙ]NˆˆˆJNÂˆÙ]\œ›ÜŠˆŠNÂˆBˆØ]Ú
JHÂˆÙ]\œ›ÜŠK›Y\ÜØYÙH¶,6+¶ã6,vaÈ6)öav-¶)öªva¶a¶+öaÈ6)öa¶+6)öaH6a¶-6+ÈŠNÂˆBˆš[˜[HÂˆÙ]\ŞJ˜[ÙJNÂˆBˆNÂˆÛÛœİ\ØYÚYÛ™\”ÚYÛ˜]\™HHš[HOˆÂˆYˆ
Yš[JBˆ™]\›ÂˆYˆ
VÈš[XYÙKÜ™È‹š[XYÙKÚœYÈ‹š[XYÙKİÙXœ—Kš[˜ÛY\Êš[K\JHš[KœÚ^™HˆML
HÂˆÙ]\œ›ÜŠ¶*¶-vb6ã6,H6)öav-¶)È6*6)öã6+È”ö#‘È6ã6)ÈÙX”6b6+v+ö)öªv*ö,H6ìvívì6ªvã6a6b6*6)öã6*ˆ6*6)ö-6+ËˆŠNÂˆ™]\›ÂˆBˆÛÛœİ™XY\ˆH™]Èš[T™XY\Š
NÂˆ™XY\‹›Û›ØYH

HOˆÈYˆ
\[Ùˆ™XY\‹œ™\İ[OOHœİš[™ÈŠBˆÙ]ÚYÛ™\‘›Ü›J™]ˆOˆ
È‹‹œ™]‹ÚYÛ˜]\™WÙ]Nˆ™XY\‹œ™\İ[JJNÈÙ]\œ›ÜŠˆŠNÈNÂˆ™XY\‹›Û™\œ›ÜˆH

HOˆÙ]\œ›ÜŠ¶+¶b6)öa¶+öaˆ6*¶-vb6ã6,H6)öav-¶)È6)öa¶+6)öaH6a¶-6+ËˆŠNÂˆ™XY\‹œ™XY\Ñ]UT“
š[JNÂˆNÂˆÛÛœİ\]R][HH
KÙ^K˜[YJHOˆÙ]˜Y
™]ˆOˆ
È‹‹œ™]‹][\Îˆ™]‹š][\Ë›X\

‹ŠHOˆˆOOHHÈÈ‹‹‹ÚÙ^WNˆ˜[YHHˆŠHJJNÂˆÛÛœİšXÙR][\ÈH˜Yš][\Ë›X\
Oˆ[X™\Šœ]X[]H
H
ˆ[X™\Š[š]ÜšXÙWÜšX[
JNÂˆÛÛœİİXİ[HšXÙR][\Ëœ™YXÙJ
İ[K
HOˆİ[H
È
NÂˆÛÛœİ\ØÛİ[H[X™\Š˜Y™\ØÛİ[ÜšX[
NÂˆÛÛœİ^˜[YHHX]œ›İ[™
X]›X^
İXİ[H\ØÛİ[
H
ˆ[X™\Š˜Y^Ü\˜Ù[
HÈL
NÂˆÛÛœİš[˜[İ[HİXİ[H\ØÛİ[
È^˜[YNÂˆÛÛœİYÛÛ\[HH\Ş[˜È

HOˆÂˆYˆ
XÛÛ\[Q›Ü›K˜ÛÛ\[WÛ˜[YKš[J
JHÂˆÙ]\œ›ÜŠ¶a¶)öaH6-6,vªv*ˆ6)öa6,¶)öavã6)ö,ö*ˆŠNÂˆ™]\›ÂˆBˆÙ]\ŞJYJNÂˆÙ]ÛÛ\[S›İXÙJˆŠNÂˆHÂˆÛÛœİ™\İ[H]ØZ]ÑS‘
”ÔÕ‹‹ØYZ[‹ÜİXœØÜš\[Û‹Xİ\İÛY\œÈ‹ÛÛ\[Q›Ü›JNÂˆÛÛœİÛÛ\[šY\Ó™^H]ØZ]ÑU
‹ØYZ[‹ÜİXœØÜš\[Û‹Xİ\İÛY\œÈŠNÂˆÙ]ÛÛ\[šY\ÊÛÛ\[šY\Ó™^×JNÂˆÙ]˜Y
™]ˆOˆ
È‹‹œ™]‹ÛÛ\[WÚYˆİš[™Ê™\İ[šY
HJJNÂˆÙ]ÛÛ\[Q›Ü›JÈÛÛ\[WÛ˜[YNˆˆ‹˜][Û˜[ÚYˆˆ‹XÛÛ›ÛZX×ØÛÙNˆˆ‹Û™Nˆˆ‹Y™\ÜÎˆˆˆJNÂˆÙ]\œ›ÜŠˆŠNÂˆÙ]ÛÛ\[S›İXÙJ™\İ[™^\İ[™ÈÈ¶)öã6aˆ6-6,vªv*ˆ6`¶*6a6)öbÈ6*ö*6*ˆ6-6+öaÈ6*6b6+È6b6)ö,ˆ6`vaö,v,ö*ˆ6avb6+6b6+È6)öa¶*¶+¶)ö*6-6+Ëˆˆˆ¶-6,vªv*ˆ6+6+öã6+È6*ö*6*ˆ6b6*6,v)öã6-v+öb6,H6`v)öªv*¶b6,H6)öa¶*¶+¶)ö*6-6+ËˆŠNÂˆBˆØ]Ú
JHÂˆÙ]\œ›ÜŠK›Y\ÜØYÙH¶*ö*6*ˆ6-6,vªv*ˆ6a¶)öavb6`v`ˆ6*6b6+ÈŠNÂˆBˆš[˜[HÂˆÙ]\ŞJ˜[ÙJNÂˆBˆNÂˆÛÛœİÜ™X]R[›ÚXÙHH\Ş[˜È

HOˆÂˆÙ]\ŞJYJNÂˆHÂˆÛÛœİ^[ØYHÈ‹‹™˜YÛÛ\[WÚYˆ[X™\Š˜Y˜ÛÛ\[WÚY
KÚYÛ™\—ÚYˆ˜YœÚYÛ™\—ÚYÈ[X™\Š˜YœÚYÛ™\—ÚY
Hˆ[][\Îˆ˜Yš][\Ë›X\
Oˆ
Âˆ]Nˆİš[™Ê]JKš[J
K]X[]Nˆ[X™\Šœ]X[]JK[š]ÜšXÙWÜšX[ˆ[X™\Š[š]ÜšXÙWÜšX[
BˆJJHNÂˆYˆ
\^[ØY˜ÛÛ\[WÚY\^[ØYš][\Ë™]™\JOˆ]H	‰ˆœ]X[]Hˆ	‰ˆ[š]ÜšXÙWÜšX[H
JBˆ›İÈ™]È\œ›ÜŠ¶-6,vªv*ˆ6b6)ö`¶a6)öaH6`v)öªv*¶b6,H6,v)È6*¶ªvavã6a6ªva¶ã6+ËˆŠNÂˆÛÛœİÜ™X]YH]ØZ]ÑS‘
”ÔÕ‹‹ØYZ[‹ÜİXœØÜš\[Û‹Z[›ÚXÙ\È‹^[ØY
NÂˆ]ØZ]™Yœ™\Ú

NÂˆÙ]Xİ]™R[›ÚXÙJ[
NÂˆÙ]\œ›ÜŠˆŠNÂˆ[\
¶`v)öªv*¶b6,Hˆ
ÈÜ™X]Yš[›ÚXÙWÛ[X™\ˆ
Èˆ6-v)ö+ö,H6-6+ËˆŠNÂˆBˆØ]Ú
JHÂˆÙ]\œ›ÜŠK›Y\ÜØYÙH¶-v+öb6,H6`v)öªv*¶b6,H6a¶)öavb6`v`ˆ6*6b6+ÈŠNÂˆBˆš[˜[HÂˆÙ]\ŞJ˜[ÙJNÂˆBˆNÂˆÛÛœİÙ]İ]\ÈH\Ş[˜È
[›ÚXÙKİ]\ÊHOˆÂˆYˆ
XÛÛ™š\›J¶*¶.¶ã6ã6,H6b6-¶.vã6*ˆ6`v)öªv*¶b6,Hˆ
È[›ÚXÙKš[›ÚXÙWÛ[X™\ˆ
Èˆ6*6aÈˆ
È
İ]\ÈOOHœZYˆÈ¶o¶,v+ö)ö+¶*¸ #6-6+öaÈˆˆ¶*6)ö-öa8 #6-6+öaÈŠH
Èˆ6)öa¶+6)öaH6-6b6+ö'ÈŠJBˆ™]\›Âˆ]^[Y[Ü™Y™\™[˜ÙHHˆÂˆYˆ
İ]\ÈOOHœZYŠHÂˆÛÛœİ™Y™\™[˜ÙHH›Û\
¶-6av)ö,vaÈ6o¶ã6«öã6,vã6o¶,v+ö)ö+¶*ˆ
6)ö+¶*¶ã6)ö,vã
Nˆ‹ˆŠNÂˆYˆ
™Y™\™[˜ÙHOOH[
Bˆ™]\›Âˆ^[Y[Ü™Y™\™[˜ÙHH™Y™\™[˜ÙNÂˆBˆÙ]\ŞJYJNÂˆHÂˆ]ØZ]ÑS‘
”ÔÕ‹‹ØYZ[‹ÜİXœØÜš\[Û‹Z[›ÚXÙ\ËÈˆ
È[›ÚXÙKšY
È‹Üİ]\È‹Èİ]\Ë^[Y[Ü™Y™\™[˜ÙHJNÂˆ]ØZ]™Yœ™\Ú

NÂˆÙ]\œ›ÜŠˆŠNÂˆBˆØ]Ú
JHÂˆÙ]\œ›ÜŠK›Y\ÜØYÙH¶*¶.¶ã6ã6,H6b6-¶.vã6*ˆ6a¶)öavb6`v`ˆ6*6b6+ÈŠNÂˆBˆš[˜[HÂˆÙ]\ŞJ˜[ÙJNÂˆBˆNÂˆÛÛœİÛX[”š[HÈOˆİš[™ÊÈOOH[	‰ˆÈOOH›ÚYÈÈˆˆŠKœ™\XÙJÖÌNWKÙËOˆ¶ì6ìvì¶ìöí6íví¶íöî6îH–Ó[X™\Š
WJKœ™\XÙJÖÉˆ‰×KÙËÈOˆ
È‰ˆˆ‰˜[\È‹ˆ‰›È‹ˆˆ‰™İÈ‹	È‰Îˆ‰œ][İÈ‹‰Èˆ‰ˆÌÎNÈˆVØ×JJNÂˆÛÛœİš[[›ÚXÙHH[›ÚXÙHOˆÂˆYˆ
[›ÚXÙUXˆOOH™š[ÈŠHÂˆ][ÂˆHÂˆ[HZ[š[Ò[›ÚXÙR[
[›ÚXÙKÙ[\ŠNÂˆBˆØ]Ú
ÊHÂˆÙ]\œ›ÜŠ¶)ö-öa6)ö.v)ö*ˆ6)öã6aˆ6`v)öªv*¶b6,H6*6,v)öã6¡¶)öoˆ6av.v*¶*6,H6a¶ã6,ö*‹ˆŠNÂˆ™]\›ÂˆBˆÛÛœİÜ\HÚ[™İË›Ü[Šˆ‹—Ø›[šÈŠNÂˆYˆ
\Ü\
HÂˆÙ]\œ›ÜŠ¶av,vb6,v«ö,H6o¶a¶+6,vaÈ6¡¶)öoˆ6,v)È6av,ö+öb6+È6ªv,v+öaÈ6)ö,ö*‹ˆŠNÂˆ™]\›ÂˆBˆÜ\™Øİ[Y[›Ü[Š
NÂˆÜ\™Øİ[Y[Üš]J[
NÂˆÜ\™Øİ[Y[˜ÛÜÙJ
NÂˆÜ\™›Øİ\Ê
NÂˆ™]\›ÂˆBˆÛÛœİÛÛ\[HH\[Ùˆ[›ÚXÙK˜ÛÛ\[WÜÛ˜\ÚİOOHœİš[™ÈˆÈ”ÓÓ‹œ\œÙJ[›ÚXÙK˜ÛÛ\[WÜÛ˜\Úİ
Hˆ[›ÚXÙK˜ÛÛ\[WÜÛ˜\ÚİÂˆÛÛœİ][\ÈH\[Ùˆ[›ÚXÙK›[™WÚ][\ÈOOHœİš[™ÈˆÈ”ÓÓ‹œ\œÙJ[›ÚXÙK›[™WÚ][\ÊHˆ[›ÚXÙK›[™WÚ][\ÎÂˆÛÛœİ›İÜÈH
\œ˜^Kš\Ğ\œ˜^J][\ÊHÈ][\Èˆ×JK›X\

JHOˆ	Ï‰È
È
H
ÈJH
È	Ïİ‰È
ÈÛX[”š[
]JH
È	Ïİ‰È
ÈÛX[”š[
œ]X[]JH
È	Ïİ‰È
ÈÛX[”š[
[X™\Š[š]ÜšXÙWÜšX[
KÓØØ[Tİš[™Ê™˜KRTˆŠJH
È	Ïİ‰È
ÈÛX[”š[
[X™\Šİ[ÜšX[
KÓØØ[Tİš[™Ê™˜KRTˆŠJH
È	Ïİİ‰ÊKš›Ú[ŠˆŠNÂˆÛÛœİ[H	ÏYØİ\H[[[™ÏH™˜Hˆ\HœXYY]HÚ\œÙ]H•U‹N]O¶`v)öªv*¶b6,H	È
ÈÛX[”š[
[›ÚXÙKš[›ÚXÙWÛ[X™\ŠH
È	Ïİ]Oİ[O˜›Ù^Ù›ÛY˜[Z[N•ZÛXK\šX[Ø[œË\Ù\šYÛX\™Ú[ŒÍ\ØÛÛÜˆÌMÌÙŒÌÙ\™Xİ[ÛœZ^Ø›Ü™\‹X›İÛNŒÜÛÛYÌØMYÜY[™ËX›İÛNŒM]X›^Ø›Ü™\‹XÛÛ\ÙN˜ÛÛ\ÙNİÚYŒL	NÛX\™Ú[ŒŒœ]Ø›Ü™\Œ\ÛÛYØ˜ØØXÍÜY[™ÎŒLİ^X[YÛœšYÚ]Ø˜XÚÙÜ›İ[™ˆÙMŒ™XßKİ[Şİ^X[YÛ›YÛ[™KZZYÚŒŸK››İ^ØÛÛÜˆÍMM_HYYXHš[Ø]ÛÙ\Ü^N››Û™__OÜİ[OÚXY›ÙOO¶`v)öªv*¶b6,H6`v,vb6-6)ö-6*¶,v)öªH6,ö)öav)öa¶aÈ6+¶-öã6)ö,OÚO¶-6av)ö,vaÎØˆ	È
ÈÛX[”š[
[›ÚXÙKš[›ÚXÙWÛ[X™\ŠH
È	øà ¶*¶)ö,vã6+ˆ6-v+öb6,NØˆ	È
ÈÛX[”š[
[›ÚXÙKš\ÜİYYÙ]JH
È	øà ¶,ö,v,v,öã6+ÎØˆ	È
ÈÛX[”š[
[›ÚXÙK™YWÙ]H¸ %ŠH
È	ÏÜ¶+¶,vã6+ö)ö,NØˆ	È
ÈÛX[”š[
ÛÛ\[K˜ÛÛ\[WÛ˜[YJH
È	øà ¶-6a¶)ö,öaÈ6ava6ãØˆ	È
ÈÛX[”š[
ÛÛ\[K›˜][Û˜[ÚY¸ %ŠH
È	øà ¶ªv+È6)ö`¶*¶-v)ö+öãØˆ	È
ÈÛX[”š[
ÛÛ\[K™XÛÛ›ÛZX×ØÛÙH¸ %ŠH
È	ÏÜ¶*¶a6`vaØˆ	È
ÈÛX[”š[
ÛÛ\[KœÛ™H¸ %ŠH
È	øà ¶a¶-6)öa¶ãØˆ	È
ÈÛX[”š[
ÛÛ\[K˜Y™\ÜÈ¸ %ŠH
È	ÏÜX›OXY¶,v+öã6`Oİ¶-6,v+H6+¶+öav)ö*ˆ6)ö-6*¶,v)öªOİ¶*¶.v+ö)ö+Ïİ¶av*6a6.ˆ6b6)ö+v+È
6,vã6)öa
Oİ¶+6av.H
6,vã6)öa
OİİİXY›ÙO‰È
È›İÜÈ
È	Ïİ›ÙOİX›O]ˆÛ\ÜÏHİ[È¶+6av.Nˆ	È
È[X™\Š[›ÚXÙKœİXİ[ÜšX[
KÓØØ[Tİš[™Ê™˜KRTˆŠH
È	È6,vã6)öaœ¶*¶+¶`vã6`Nˆ	È
È[X™\Š[›ÚXÙK™\ØÛİ[ÜšX[
KÓØØ[Tİš[™Ê™˜KRTˆŠH
È	È6,vã6)öaœ¶av)öa6ã6)ö*ˆ
	È
ÈÛX[”š[
[›ÚXÙK^Ü\˜Ù[
H
È	öjŠNˆ	È
È[X™\Š[›ÚXÙK^ÜšX[
KÓØØ[Tİš[™Ê™˜KRTˆŠH
È	È6,vã6)öa¶av*6a6.ˆ6`¶)ö*6a6o¶,v+ö)ö+¶*ˆ	È
È[X™\Š[›ÚXÙKİ[ÜšX[
KÓØØ[Tİš[™Ê™˜KRTˆŠH
È	È6,vã6)öaÚÙ]Û\ÜÏH››İH‰È
ÈÛX[”š[
[›ÚXÙK™\ØÜš\[ÛˆˆŠH
È	ÏÜÛ\ÜÏH››İH¶)öã6aˆ6,öa¶+È6`v)öªv*¶b6,H6`v,vb6-6+ö)ö+¶a6ã6)ö,ö*ˆ6b6*6aø #6av.va¶)öã6*ö*6*ˆ6+ö,H6,ö)öav)öa¶aÈ6av)6+öã6)öaˆ6ã6)È6-v+öb6,H6-vb6,v*¶+v,ö)ö*6)öa6ªv*¶,vb6a¶ã6ªvã6av)öa6ã6)ö*¶ã6a¶ã6,ö*‹Ü]ÛˆÛ˜ÛXÚÏHÚ[™İËœš[

H¶¡¶)öoˆ6`v)öªv*¶b6,OØ]ÛØ›ÙOÚ[‰ÎÂˆÛÛœİÜ\HÚ[™İË›Ü[Šˆ‹—Ø›[šÈŠNÂˆYˆ
\Ü\
HÂˆ[\
¶av,vb6,v«ö,H6o¶a¶+6,vaÈ6¡¶)öoˆ6,v)È6av,ö+öb6+È6ªv,v+öaÈ6)ö,ö*‹ˆŠNÂˆ™]\›ÂˆBˆÜ\™Øİ[Y[›Ü[Š
NÂˆÜ\™Øİ[Y[Üš]J[
NÂˆÜ\™Øİ[Y[˜ÛÜÙJ
NÂˆÜ\™›Øİ\Ê
NÂˆNÂˆÛÛœİ[œH
X™[˜[YKÛÚ[™ÙK\HH^ŠHOˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹Èİ[NˆÈ\Ü^Nˆ™ÜšY‹Ø\ˆZ[•ÚYˆMŒ›^ˆŒHHMÌˆHKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ›ÛÚ^™NˆLˆHKX™[
Kˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹\Nˆ\K˜[YNˆ˜[YHOOH[	‰ˆ˜[YHOOH›ÚYÈ˜[YHˆˆ‹ÛÚ[™ÙNˆHOˆÛÚ[™ÙJK\™Ù]˜[YJHJJNÂˆÛÛœİİ]\Ñ˜HHÈ[œZYˆ¶o¶,v+ö)ö+¶*¸ #6a¶-6+öaÈ‹ZYˆ¶o¶,v+ö)ö+¶*¸ #6-6+öaÈ‹Ø[˜Ù[Yˆ¶*6)ö-öa8 #6-6+öaÈˆNÂˆ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ˜YZ[‹]ÛÜšÜÜXÙK\YÙHİXœØÜš\[Û‹Z[›ÚXÙK\YÙH‹İ[NˆÈ\™Xİ[ÛˆœˆHKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ[™[ˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹È›ÛNˆ™Ü›İ\‹˜\šXK[X™[ˆ—L—LŒ×LLŒLŒÍWLŒ‘—LLŒÌHLWLŒ×LNWLŒWLLŒÌH‹Û\ÜÓ˜[YNˆœ›İÈ[›ÚXÙKY›Ü›X]\İÚ]Ú‹İ[NˆÈØ\ˆL›^Ü˜\ˆÜ˜\ˆHKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹È\Nˆ˜]Ûˆ‹˜\šXK\™\ÜÙYˆ[›ÚXÙUXˆOOHœİ[™\™‹Û\ÜÓ˜[YNˆ[›ÚXÙUXˆOOHœİ[™\™ˆÈ˜ˆˆˆ˜ˆÈ‹ÛÛXÚÎˆ

HOˆÙ][›ÚXÙUXŠœİ[™\™ŠHK—LWLŒ×LNWLŒWLLŒÌHLWLŒÎWLWLLLĞÈŠKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹È\Nˆ˜]Ûˆ‹˜\šXK\™\ÜÙYˆ[›ÚXÙUXˆOOH™š[È‹Û\ÜÓ˜[YNˆ[›ÚXÙUXˆOOH™š[ÈˆÈ˜ˆˆˆ˜ˆÈ‹ÛÛXÚÎˆ

HOˆÙ][›ÚXÙUXŠ™š[ÈŠHK—LWLŒ×LNWLŒWLLŒÌHLŒLŒÈL—LŒ×LLŒLWLĞ×L—LŒWLŠJKˆ[›ÚXÙUXˆOOH™š[Èˆ	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈX\™Ú[•ÜˆMHKˆ™XXİ˜Ü™X]Q[[Y[
š‹[—LWLŒÍLŒ‘WLŒÍWLŒ×LŒHLWLŒÌWLLŒÍL—LŒ‘—LÈLŒ‘—LŒÌHL—LŒ×LLŒLWLĞ×L—LŒWLŠKˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]YˆK—LWLŒÍLŒ‘WLŒÍWLŒ×LŒHLWLŒÌWLLŒÍL—LŒ‘—LÈLWL—LŒÍÈLŒ‘—LŒÌHLŒ×LĞ×LˆLWLŒÌWLLŒÌWLQ—LŒÌHLŒÌLŒ‘WLĞ×LŒÌWLÈLWLĞ×LŒ×LŒÍLL—LŒ‘‹ˆLŒ×LŒÍ×LLŒ×LŒÎWLŒ×LŒHLŒ‘L—LĞ×L—LĞÈLĞ×LŒÈLŒ‘L—LL—LĞÈLŒÌWLŒÈLWLŒÍ×LŒ×LŒLˆLWLŒ‘—LŒ×LŒÌWLNHLŒ‘WLLŒ‘ˆLLŒ×LŒÌWLŒ‘ˆLNWL—LĞ×LŒ‘—LŒPˆLŒ‘WLŒ×L—L×LŒ×L×LŒ×LĞÈLŒ‘WLŒ×LLĞÈLŒ‘—LŒÌHL—LŒ×LÑHLŒ‘WLŒ×LLĞÈLWLĞ×LŒ×LWLŒ×L—L—LŒ‘‹ˆŠKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆK›^Ü˜\ˆÜ˜\ˆHKÖÈ›˜[YH‹¶a¶)öaH6-6+¶-H6+v`¶ã6`¶ãö+v`¶b6`¶ã—KÈ™XÛÛ›ÛZX×ØÛÙH‹¶-6av)ö,vaÈ6)ö`¶*¶-v)ö+öã—KÈœ™YÚ\İ˜][Û—Û[X™\ˆ‹¶-6av)ö,vaÈ6*ö*6*ˆ—KÈ›˜][Û˜[ÚY‹¶-6a¶)ö,öaÈ6ava6ã—KÈœÜİ[ØÛÙH‹¶ªv+öo¶,ö*¶ã—KÈœ›İš[˜ÙH‹¶)ö,ö*¶)öaˆ—KÈ˜Ú]H‹¶-6aö,H—KÈœÛ™H‹¶-6av)ö,vaÈ6*¶a6`vaˆ—KÈ˜Y™\ÜÈ‹¶a¶-6)öa¶ã6ªv)öava—WK›X\

ÚÙ^K]WJHOˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÙ^NˆÙ^Kİ[NˆÈ\Ü^Nˆ™ÜšY‹Ø\ˆ›^ˆŒHHNLˆHKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]YˆK]JKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹˜[YNˆÙ[\–ÚÙ^WHˆ‹ÛÚ[™ÙNˆHOˆ\]TÙ[\ŠÙ^KK\™Ù]˜[YJHJJJJKˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈX\™Ú[•ÜˆLHK—LŒLŒÌWLŒ×LĞÈL—LŒ×LÑWLŒÈLŒ×LŒÌˆLŒ‘—LNWLWLÈLP—L—LWLŒ×LĞ×LŒÍLL—LŒ×LÑWLˆLNWL—LŒ×LŒÌHL×LŒÌHLWLŒ×LNWLŒWLLŒÌHLŒ‘—LŒÌHLÑWLŒ×LĞ×LĞ×LˆLŒÍWLWLŒ‘LÈLŒ×LŒÌ×LŒWLWLŒ×LŒ‘—LÈLNWL—LĞ×LŒ‘—LŒPˆLŒ×L—LŒ‘—LŒ×LŒÌ—L×LMLNWLŒ×LŒĞWLŒÌMLLŒ×L×LŒHLŒ×LWL—LĞÈLŒ×LŒÌ×LŒKˆŠJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ[™[ˆKˆ™XXİ˜Ü™X]Q[[Y[
šÈ‹[—LŒÍWLŒ‘—LLŒÌHLWLŒ×LNWLŒWLLŒÌHLWLŒÌWLLŒÍLŒ×LŒÍLŒWLŒÌWLŒ×LNHLŒ‘WLŒÍ×LĞ×LŒ×LŒÌHŠKˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]YˆK—LWLŒLŒ×LLŒĞHLŒLŒÌHLŒ‘LŒÌ×LŒLŒÌWLĞ×LŒ×LLŒ×LŒÌ×LŒKˆLWLŒ×LLĞ×LŒ×LŒHLLŒWLŒ‘WLWLĞ×LHLŒWL—L×LŒÈLWLŒÍ×LŒ×LŒLˆLWL—LŒ×LŒ‘—LĞ×LŒÌWLĞÈLWLŒ‘LŒ×LŒÌ×LŒLÈLWLĞ×LŒ×LŒÍLLŒ‘ˆLNWLÈLŒ‘—LŒÌHLWLŒ×LNWLŒWLLŒÌHLLŒ×LŒÌWLŒ‘ˆLNWLŒÌWLŒ‘—L×LŒ×LŒ×LĞ×LŒ‘‹ˆŠKˆ\œ›Üˆ	‰ˆ™XXİ˜Ü™X]Q[[Y[
œ‹È›ÛNˆ˜[\‹İ[NˆÈÛÛÜˆ˜\ŠKY[™Ù\ŠHˆHK\œ›ÜŠKˆÛÛ\[S›İXÙH	‰ˆ™XXİ˜Ü™X]Q[[Y[
œ‹È›ÛNˆœİ]\È‹İ[NˆÈÛÛÜˆ˜\ŠK[ÚËÌMÙLŠHˆHKÛÛ\[S›İXÙJKˆ™XXİ˜Ü™X]Q[[Y[
š‹[—LŒ—LŒLŒHLŒÍLŒÌWLNWLŒHLŒÍ×LŒÌWLHL—LŒÌWLŒ×LŒÌWLŒ‘—LŒ×LŒ‘ˆŠKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆK›^Ü˜\ˆÜ˜\ˆHKˆ[œ
¶a¶)öaH6-6,vªv*ˆ‹ÛÛ\[Q›Ü›K˜ÛÛ\[WÛ˜[YKˆOˆÙ]ÛÛ\[Q›Ü›JÈ‹‹˜ÛÛ\[Q›Ü›KÛÛ\[WÛ˜[YNˆˆJJKˆ[œ
¶-6a¶)ö,öaÈ6ava6ã‹ÛÛ\[Q›Ü›K›˜][Û˜[ÚYˆOˆÙ]ÛÛ\[Q›Ü›JÈ‹‹˜ÛÛ\[Q›Ü›K˜][Û˜[ÚYˆˆJJKˆ[œ
¶ªv+È6)ö`¶*¶-v)ö+öã‹ÛÛ\[Q›Ü›K™XÛÛ›ÛZX×ØÛÙKˆOˆÙ]ÛÛ\[Q›Ü›JÈ‹‹˜ÛÛ\[Q›Ü›KXÛÛ›ÛZX×ØÛÙNˆˆJJKˆ[œ
¶*¶a6`vaˆ‹ÛÛ\[Q›Ü›KœÛ™KˆOˆÙ]ÛÛ\[Q›Ü›JÈ‹‹˜ÛÛ\[Q›Ü›KÛ™NˆˆJJKˆ[œ
¶a¶-6)öa¶ã‹ÛÛ\[Q›Ü›K˜Y™\ÜËˆOˆÙ]ÛÛ\[Q›Ü›JÈ‹‹˜ÛÛ\[Q›Ü›KY™\ÜÎˆˆJJJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹İ[NˆÈX\™Ú[•ÜˆLK\ØX›Yˆ\ŞKÛÛXÚÎˆYÛÛ\[HK—LŒ—LŒLŒHLŒÍLŒÌWLNWLŒHLŒ×LŒ‘—LĞ×LŒ‘ˆŠJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ[™[ˆKˆ™XXİ˜Ü™X]Q[[Y[
š‹[—LWLŒ×LNWLŒWLLŒÌHLŒ×LŒ‘—LĞ×LŒ‘ˆŠKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆK›^Ü˜\ˆÜ˜\ˆHKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹Èİ[NˆÈZ[•ÚYˆŒŒ›^ˆHHKˆ—LŒÍLŒÌWLNWLŒHLŒ‘WLŒÌWLĞ×LŒ‘—LŒ×LŒÌH‹ˆ™XXİ˜Ü™X]Q[[Y[
œÙ[Xİ‹ÈÛ\ÜÓ˜[YNˆš[œ]‹İ[NˆÈÚYˆŒL	HˆK˜[YNˆ˜Y˜ÛÛ\[WÚYÛÚ[™ÙNˆHOˆÙ]˜Y
È‹‹™˜YÛÛ\[WÚYˆK\™Ù]˜[YHJHKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆˆˆK—LŒ×L—LŒWLŒ‘WLŒ×LŒLŒÍLŒÌWLNWLŒHŠKˆÛÛ\[šY\Ë™š[\ŠÈOˆËš\×ØXİ]™HOHJK›X\
ÈOˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹ÈÙ^NˆËšY˜[YNˆËšYKË˜ÛÛ\[WÛ˜[YJJJJKˆ[œ
¶*¶)ö,vã6+ˆ6-v+öb6,H
6ìví6ì6íKvì6îvì6íJH‹˜Yš\ÜİYYÙ]KˆOˆÙ]˜Y
È‹‹™˜Y\ÜİYYÙ]NˆˆJJKˆ[œ
¶,ö,v,v,öã6+È
6)ö+¶*¶ã6)ö,vã
H‹˜Y™YWÙ]KˆOˆÙ]˜Y
È‹‹™˜YYWÙ]NˆˆJJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈX\™Ú[•ÜˆMY[™ÎˆL‹›Ü™\ˆŒ\ÛÛY˜\ŠK[[™JH‹›Ü™\”˜Y]\ÎˆLˆHKˆ™XXİ˜Ü™X]Q[[Y[
š‹[—LWL×LŒÌHLLŒ×LWLŒÍ—LŒ×LĞÈLWLŒÌWLLŒÍL—LŒ‘—LÈŠKˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]YˆK—LŒÍLŒ‘WLŒÍHLŒ×L—LŒWLŒ‘WLŒ×LŒLŒ×LŒÍLŒ‘—LÈL×LWLŒÌWLŒ×LÈLŒLŒÈLŒÌ×LWLŒHLŒ×LLŒ‘—LŒÌHLWLŒ×LNWLŒWLLŒÌHLŒÌLŒ‘WLĞ×LŒÌWLÈLWLĞ×LŒ×LŒÍLLŒ‘—LŒPˆLLĞ×LŒÌWLŒ×LĞ×LŒÍLŒLŒÎWLŒ‘—LĞÈLWLŒÍLŒ‘WLŒÍWLŒ×LŒWLŒÈLWLŒ×LNWLŒWLLŒÌWL×LŒ×LĞÈL—LŒLLĞÈLŒÌWLŒÈLŒWLŒĞWLĞ×LĞ×LŒÌHL—LWLĞ×LŒ×LŒ‘—L×LŒ‘‹ˆŠKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆK›^Ü˜\ˆÜ˜\‹[YÛ’][\Îˆ™[™ˆHKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹Èİ[NˆÈ›^ˆŒHHŒŒˆHKˆ—LŒ×L—LŒWLŒ‘WLŒ×LŒLŒ×LWLŒÍ—LŒ×LNWL—L—LŒ‘—LÈ‹ˆ™XXİ˜Ü™X]Q[[Y[
œÙ[Xİ‹ÈÛ\ÜÓ˜[YNˆš[œ]‹İ[NˆÈÚYˆŒL	HˆK˜[YNˆ˜YœÚYÛ™\—ÚYÛÚ[™ÙNˆHOˆÙ]˜Y
È‹‹™˜YÚYÛ™\—ÚYˆK\™Ù]˜[YHJHKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆˆˆK—LŒLŒ‘—LLˆL—LŒ×LHLŒ×LWLŒÍ—LŒ×LNWL—L—LŒ‘—LÈŠKˆÚYÛ™\œË›X\
ÈOˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹ÈÙ^NˆËšY˜[YNˆËšYKˆË™[Û˜[YKˆËš›Ø—İ]HÈˆ0­Èˆ
ÈËš›Ø—İ]HˆˆŠJJJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹È\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜ˆÈ‹\ØX›YˆY˜YœÚYÛ™\—ÚYÛÛXÚÎˆ

HOˆÈÛÛœİÈHÚYÛ™\œË™š[™
ÈOˆİš[™ÊËšY
HOOHİš[™Ê˜YœÚYÛ™\—ÚY
JNÈYˆ
ÊBˆÙ]ÚYÛ™\‘›Ü›JÈYˆİš[™ÊËšY
K[Û˜[YNˆË™[Û˜[YK›Ø—İ]NˆËš›Ø—İ]Hˆ‹ÚYÛ˜]\™WÙ]NˆËœÚYÛ˜]\™WÙ]HˆˆJNÈHK—LLĞ×LŒÌWLŒ×LĞ×LŒÍLŒÍLŒ‘WLŒÍHLŒ×L—LŒWLŒ‘WLŒ×LŒLŒ×LŒÍLŒ‘—LÈŠJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆKX\™Ú[•ÜˆL›^Ü˜\ˆÜ˜\‹[YÛ’][\Îˆ™[™ˆHKˆ[œ
¶a¶)öaH6b6a¶)öaH6+¶)öa¶b6)ö+ö«öã6)öav-¶)öªva¶a¶+öaÈ‹ÚYÛ™\‘›Ü›K™[Û˜[YKˆOˆÙ]ÚYÛ™\‘›Ü›JÈ‹‹œÚYÛ™\‘›Ü›K[Û˜[YNˆˆJJKˆ[œ
¶,öav*ˆÈ6.va¶b6)öaˆ6,ö)ö,¶av)öa¶ã‹ÚYÛ™\‘›Ü›Kš›Ø—İ]KˆOˆÙ]ÚYÛ™\‘›Ü›JÈ‹‹œÚYÛ™\‘›Ü›K›Ø—İ]NˆˆJJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹È\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜ˆ‹\ØX›Yˆ\ŞKÛÛXÚÎˆØ]™TÚYÛ™\ˆKÚYÛ™\‘›Ü›KšYÈ¶,6+¶ã6,vaÈ6b6ã6,v)öã6-ˆˆ¶)ö`v,¶b6+öaˆ6)öav-¶)öªva¶a¶+öaÈŠKˆÚYÛ™\‘›Ü›KšY	‰ˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹È\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜ˆÈ‹ÛÛXÚÎˆ

HOˆÙ]ÚYÛ™\‘›Ü›JÈYˆˆ‹[Û˜[YNˆˆ‹›Ø—İ]Nˆˆ‹ÚYÛ˜]\™WÙ]NˆˆˆJHK—LŒ×L—LŒÍWLŒÌWLŒ×LHŠJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆMX\™Ú[•ÜˆM›^Ü˜\ˆÜ˜\‹[YÛ’][\Îˆ˜Ù[\ˆˆHKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈÚYˆMÌZ[’ZYÚˆLK˜XÚÙÜ›İ[™ˆˆÙ™™ˆ‹›Ü™\ˆŒ\ÛÛY˜\ŠK[[™JH‹›Ü™\”˜Y]\ÎˆLY[™Îˆ^[YÛˆ˜Ù[\ˆˆHKˆ™XXİ˜Ü™X]Q[[Y[
š[YÈ‹ÈÜ˜ÎˆÚYÛ™\‘›Ü›KœÚYÛ˜]\™WÙ]H

ØHHÚYÛ™\œË™š[™
ÈOˆİš[™ÊËšY
HOOHİš[™Ê˜YœÚYÛ™\—ÚY
JJHOOH[ØHOOH›ÚYÈ›ÚYˆØKœÚYÛ˜]\™WÙ]JH‹Ø\ÜÙ]ËÚ[›ÚXÙ\ËÜØ[\K\ÚYÛ˜]\™KšœÈ‹[ˆ—LÑWLĞ×LŒÍLŒ×L—LWLŒ×LĞ×LŒÍLŒWLŒÍWLLĞ×LŒÌHLŒ×LWLŒÍ—LŒ×LĞÈLWLŒÌWLLŒÍL—LŒ‘—LÈ‹İ[NˆÈX^ÚYˆŒL	H‹ZYÚˆKØš™Xİš]ˆ˜ÛÛZ[ˆˆHJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ›ÛÚ^™NˆLHHK—LÑWLĞ×LŒÍLŒ×L—LWLŒ×LĞ×LŒÍLŒ×LWLŒÍ—LŒÈŠJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈ\Ü^Nˆ™ÜšY‹Ø\ˆ›^ˆŒHHŒˆHKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹Èİ[NˆÈ\Ü^Nˆ™ÜšY‹Ø\ˆHHKˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[—LŒLŒ×LŒÌWLQ—LŒÌLŒ×LŒÌWLĞÈLŒWLŒÍWLLĞ×LŒÌHLŒ×LWLŒÍ—LŒ×LĞÈLŒÍLŒ‘WLŒÍHŠKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹\Nˆ™š[H‹XØÙ\ˆš[XYÙKÜ™Ë[XYÙKÚœYË[XYÙKİÙXœ‹˜\šXK[X™[ˆ—LŒ×L—LŒWLŒ‘WLŒ×LŒLŒWLŒÍWLLĞ×LŒÌHLŒ×LWLŒÍ—LŒÈ‹ÛÚ[™ÙNˆHOˆÈ˜\ˆØNÈ™]\›ˆ\ØYÚYÛ™\”ÚYÛ˜]\™J
ØHHK\™Ù]™š[\ÊHOOH[ØHOOH›ÚYÈ›ÚYˆØVÌJNÈHJJKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈ›ÛÚ^™NˆLˆHK—LŒWLŒÍWLLĞ×LŒÌHLŒ×LŒ‘WLŒWLŒÍWLŒ×LŒÍWLĞÈLÑWLŒÌÈLŒ×LŒÌˆLP—LŒ×LWLŒÌ—LLŒ‘—LˆLŒ×LWLŒÍ—LŒ×LNWL—L—LŒ‘—L×LˆLĞ×LŒÈLP—LŒÌLŒ‘WLĞ×LŒÌWLÈLLĞ×LŒÌWLŒ×LĞ×LŒÍLˆLŒ—LŒLŒHLWLĞ×LŒ×LŒÍLLŒ‘‹ˆLŒ‘—LŒÌHLŒÍWLLŒÌWLŒHL—LŒ‘—LŒ×LŒÍLŒWLˆLŒWLŒÍWLLĞ×LŒÌHLŒ×LŒ‘WLŒWLŒÍWLŒ×LŒÍWLĞ×LŒÈL—LWLL—LÈLŒ×LŒÌWLŒÌ×LŒ×LLĞÈLŒ×LŒÌ×LŒWLWLŒ×LŒ‘—LÈLWLĞ×LŒ×LŒÍLLŒ‘‹ˆŠKˆÚYÛ™\‘›Ü›KœÚYÛ˜]\™WÙ]H	‰ˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹È\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜ˆÈ‹İ[NˆÈ\İYTÙ[ˆœİ\ˆKÛÛXÚÎˆ

HOˆÙ]ÚYÛ™\‘›Ü›J™]ˆOˆ
È‹‹œ™]‹ÚYÛ˜]\™WÙ]NˆˆˆJJHK—LŒ‘LŒÌLHLŒWLŒÍWLLĞ×LŒÌHLŒ×LŒ‘WLŒWLŒÍWLŒ×LŒÍWLĞÈŠKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹Èİ[NˆÈ\Ü^Nˆ™›^‹Ø\ˆ[YÛ’][\Îˆ˜Ù[\ˆˆHKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹È\Nˆ˜ÚXÚØ›Ş‹ÚXÚÙYˆ˜Yš[˜ÛYWÜÚYÛ˜]\™WÚ[XYÙKÛÚ[™ÙNˆHOˆÙ]˜Y
™]ˆOˆ
È‹‹œ™]‹[˜ÛYWÜÚYÛ˜]\™WÚ[XYÙNˆK\™Ù]˜ÚXÚÙYJJHJKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹[—LŒ‘—LŒÌWLŒÈLŒWLŒÍWLLĞ×LŒÌHLŒ×LWLŒÍ—LŒÈLŒ‘—LŒÌHL—LŒ×LLŒL—LŒ×LÑWLĞÈLWLĞ×L—LŒWLŠJJJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈİ™\™›İÖˆ˜]]È‹X\™Ú[•ÜˆLˆHKˆ™XXİ˜Ü™X]Q[[Y[
X›H‹Èİ[NˆÈÚYˆŒL	HˆHKˆ™XXİ˜Ü™X]Q[[Y[
XY‹[ˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒÍLŒÌWLŒ‘LŒ‘WLŒ‘—LWLŒ×LŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒWLŒÎWLŒ‘—LŒ×LŒ‘ˆŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LWLŒLLŒĞHLLŒ×LŒ‘LŒ‘ˆ
LŒÌWLĞ×LŒ×L
HŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒ×LWLŒÎHLŒÌWLŒ‘—LĞ×LHŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒÎWLWLLĞ×LŒ×LŒHŠJJKˆ™XXİ˜Ü™X]Q[[Y[
›ÙH‹[˜Yš][\Ë›X\

JHOˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹ÈÙ^NˆHKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹È˜\šXK[X™[ˆ6-6,v+H6+¶+öav)ö*ˆ6,v+öã6`H	ÚH
È_XÛ\ÜÓ˜[YNˆš[œ]‹İ[NˆÈZ[•ÚYˆŒLK˜[YNˆ]KÛÚ[™ÙNˆHOˆ\]R][JK]H‹K\™Ù]˜[YJHJJKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹È˜\šXK[X™[ˆ6*¶.v+ö)ö+È6,v+öã6`H	ÚH
È_XÛ\ÜÓ˜[YNˆš[œ]‹İ[NˆÈÚYˆHK\Nˆ›[X™\ˆ‹Z[ˆŒH‹X^ˆŒL‹˜[YNˆœ]X[]KÛÚ[™ÙNˆHOˆ\]R][JKœ]X[]H‹K\™Ù]˜[YJHJJKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹È˜\šXK[X™[ˆ6av*6a6.ˆ6b6)ö+v+È6,v+öã6`H	ÚH
È_H6*6aÈ6,vã6)öaÛ\ÜÓ˜[YNˆš[œ]‹İ[NˆÈZ[•ÚYˆMK\Nˆ›[X™\ˆ‹Z[ˆŒ‹İ\ˆŒH‹˜[YNˆ[š]ÜšXÙWÜšX[ÛÚ[™ÙNˆHOˆ\]R][JK[š]ÜšXÙWÜšX[‹K\™Ù]˜[YJHJJKˆ™XXİ˜Ü™X]Q[[Y[
‹[[Û™^JšXÙR][\ÖÚWJJKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹È\Nˆ˜]Ûˆ‹˜\šXK[X™[ˆ6+v,6`H6,v+öã6`H	ÚH
È_XÛ\ÜÓ˜[YNˆ˜ˆÈ‹\ØX›Yˆ˜Yš][\Ë›[™İOOHKÛÛXÚÎˆ

HOˆÙ]˜Y
È‹‹™˜Y][\Îˆ˜Yš][\Ë™š[\Š
ËŠHOˆˆOOHJHJHK—LŒ‘LŒÌLHŠJJJJJJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹È\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜ˆÈ‹\ØX›Yˆ˜Yš][\Ë›[™İHÌÛÛXÚÎˆ

HOˆÙ]˜Y
È‹‹™˜Y][\ÎˆË‹‹™˜Yš][\ËÈ]Nˆˆ‹]X[]NˆK[š]ÜšXÙWÜšX[ˆŒˆWHJHK—LŒ×LWLŒÌ—LLŒ‘—LˆLŒÌWLŒ‘—LĞ×LHŠKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈX\™Ú[•ÜˆMØ\ˆK›^Ü˜\ˆÜ˜\ˆHKˆ[œ
¶*¶+¶`vã6`H
6,vã6)öa
H‹˜Y™\ØÛİ[ÜšX[ˆOˆÙ]˜Y
È‹‹™˜Y\ØÛİ[ÜšX[ˆˆJK›[X™\ˆŠKˆ[œ
¶+ö,v-v+È6av)öa6ã6)ö*ˆ
6+ö,H6-vb6,v*ˆ6-6avb6a
H‹˜Y^Ü\˜Ù[ˆOˆÙ]˜Y
È‹‹™˜Y^Ü\˜Ù[ˆˆJK›[X™\ˆŠKˆ[œ
¶-6,v+H6ã6)È6ã6)ö+ö+ö)ö-6*ˆ‹˜Y™\ØÜš\[Û‹ˆOˆÙ]˜Y
È‹‹™˜Y\ØÜš\[ÛˆˆJJJKˆ™XXİ˜Ü™X]Q[[Y[
œ‹Èİ[NˆÈ[™RZYÚˆˆHKˆ—LŒ×LWLŒÎHLŒ×L—LLŒ×LNˆ‹ˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[[Û™^JİXİ[
JKˆ—LÌLWLŒ×LLĞ×LŒ×LŒNˆ‹ˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[[Û™^J^˜[YJJKˆ—LÌLWLŒLLŒĞHL—L×LŒ×LĞ×LĞÎˆ‹ˆ™XXİ˜Ü™X]Q[[Y[
˜ˆ‹[[Û™^Jš[˜[İ[
JJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹\ØX›Yˆ\ŞHY˜Y˜ÛÛ\[WÚYš[˜[İ[ÛÛXÚÎˆÜ™X]R[›ÚXÙHK—LŒÍWLŒ‘—LLŒÌHLLŒ—LŒLŒHLWLŒ×LNWLŒWLLŒÌHŠJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ[™[ˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈ\İYPÛÛ[ˆœÜXÙKX™]ÙY[ˆ‹Ø\ˆL›^Ü˜\ˆÜ˜\ˆHKˆ™XXİ˜Ü™X]Q[[Y[
š‹[—LŒÌ×LLŒ×LŒLˆLWLŒ×LNWLŒWLLŒÌWL×LŒÈŠKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹ÛÛXÚÎˆ™Yœ™\ÚK—LŒPˆLŒLŒÌWLLŒÌ—LŒÌWLŒÌ×LŒ×L—LĞÈŠJKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹[ˆ—LWLĞ×LLŒWLŒÌHLŒÍLŒÌWLNWLŒWLÌ‹ˆ™XXİ˜Ü™X]Q[[Y[
œÙ[Xİ‹ÈÛ\ÜÓ˜[YNˆš[œ]‹˜[YNˆš[\‹ÛÚ[™ÙNˆHOˆÙ]š[\ŠK\™Ù]˜[YJHKˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆˆˆK—L×LWLÈLŒÍLŒÌWLNWLŒWLŒ×L×LŒÈŠKˆÛÛ\[šY\Ë›X\
ÈOˆ™XXİ˜Ü™X]Q[[Y[
›Ü[Ûˆ‹È˜[YNˆËšYÙ^NˆËšYKË˜ÛÛ\[WÛ˜[YJJJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈİ™\™›İÖˆ˜]]ÈˆHKˆ™XXİ˜Ü™X]Q[[Y[
X›H‹Èİ[NˆÈÚYˆŒL	HˆHKˆ™XXİ˜Ü™X]Q[[Y[
XY‹[ˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒÍLWLŒ×LŒÌWLÈLWLŒ×LNWLŒWLLŒÌHŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒÍLŒÌWLNWLŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒWLŒ×LŒÌWLĞ×LŒ‘HŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LWLŒLLŒĞH
LŒÌWLĞ×LŒ×L
HŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LLŒÍ—LŒÎWLĞ×LŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[—LŒÎWLWLLĞ×LŒ×LŒHŠJJKˆ™XXİ˜Ü™X]Q[[Y[
›ÙH‹[[›ÚXÙ\Ë™š[\ŠHOˆYš[\ˆİš[™ÊK˜ÛÛ\[WÚY
HOOHš[\ŠK›X\
HOˆ™XXİ˜Ü™X]Q[[Y[
ˆ‹ÈÙ^NˆKšYKˆ™XXİ˜Ü™X]Q[[Y[
‹[Kš[›ÚXÙWÛ[X™\ŠKˆ™XXİ˜Ü™X]Q[[Y[
‹[K˜ÛÛ\[WÛ˜[YJKˆ™XXİ˜Ü™X]Q[[Y[
‹[Kš\ÜİYYÙ]JKˆ™XXİ˜Ü™X]Q[[Y[
‹[[Û™^JKİ[ÜšX[
JKˆ™XXİ˜Ü™X]Q[[Y[
‹[İ]\Ñ˜VÚKœİ]\×HKœİ]\ÊKˆ™XXİ˜Ü™X]Q[[Y[
‹[ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈØ\ˆK›^Ü˜\ˆÜ˜\ˆHKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹ÛÛXÚÎˆ

HOˆš[[›ÚXÙJJHK—L—LWLŒ×LĞ×LŒÍLL—LŒ×LÑHŠKˆKœİ]\ÈOOH[œZYˆ	‰ˆ™XXİ˜Ü™X]Q[[Y[
™XXİ‘œ˜YÛY[[ˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹\ØX›Yˆ\ŞKÛÛXÚÎˆ

HOˆÙ]İ]\ÊKœZYŠHK—LŒ—LŒLŒHLÑWLŒÌWLŒ‘—LŒ×LŒ‘WLŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆÈ‹\ØX›Yˆ\ŞKÛÛXÚÎˆ

HOˆÙ]İ]\ÊK˜Ø[˜Ù[YŠHK—LŒ×LŒLŒÍ×LŒ×LŠJJJJJJJKˆ[›ÚXÙ\Ë›[™İOOH	‰ˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]YˆK—L×L—LLŒÌˆLWLŒ×LNWLŒWLLŒÌWLĞÈLŒ—LŒLŒHL—LŒÍLŒ‘—LÈLŒ×LŒÌ×LŒKˆŠJJJNÂŸB™[˜İ[ÛˆÛÜšĞÛÛ˜XİÔYÙJ
HÂˆÛÛœİÜ™XYKÙ]™XYWHH\ÙTİ]J˜[ÙJNÂˆ\ÙQY™™Xİ


HOˆÂˆ]Xİ]™HHYK][\ÈHÂˆÛÛœİ]XÚH

HOˆÂˆ˜\ˆØNÂˆYˆ
XXİ]™JBˆ™]\›ÂˆYˆ

ØHHÚ[™İË’Ú]X\•ÛÜšĞÛÛ˜XİÊHOOH[ØHOOH›ÚYÈ›ÚYˆØK›[İ[
HÂˆÚ[™İË’Ú]X\•ÛÜšĞÛÛ˜XİË›[İ[

NÂˆÙ]™XYJYJNÂˆBˆ[ÙHYˆ
][\ÊÊÈLŠBˆÙ][Y[İ]
]XÚŒ
NÂˆNÂˆ]XÚ

NÂˆ™]\›ˆ

HOˆÈ˜\ˆØKØÈXİ]™HH˜[ÙNÈ
ØˆH
ØHHÚ[™İË’Ú]X\•ÛÜšĞÛÛ˜XİÊHOOH[ØHOOH›ÚYÈ›ÚYˆØK[›[İ[
HOOH[ØˆOOH›ÚYÈ›ÚYˆØ‹˜Ø[
ØJNÈNÂˆK×JNÂˆ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
œÙXİ[Ûˆ‹ÈÛ\ÜÓ˜[YNˆœ[™[YZ[‹]ÛÜšÜÜXÙK\YÙHˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈYˆšÚ]X\‹XÛÛ˜Xİ\YÙHˆJKˆ\™XYH	‰ˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›]]YˆK—LŒ‘—LŒÌHLŒ‘LŒ×LLŒLŒ×LŒÌWLQ—LŒÌLŒ×LŒÌWLĞÈLŒ×LĞ×LŒ×LŒ×LŒ‘ˆLLÑWLŒÌWLĞ×L—LŒHL—LŒÌWLŒ×LŒÌWLŒ‘—LŒ×LŒ‘ˆLNWLŒ×LŒÌWLĞ×LŒˆŠJNÂŸB˜ÛÛœİ’QUÔÈHÂˆÙ[š[Üš]NˆÈˆ¶,öa¶b6)ö*ˆ6a¶ã6,vb6aö)È‹XÎˆ¼'äáˆ‹Îˆ\œÛÛ›™[Ù[š[Üš]HKˆÛİ™\Ù[šY\ÎˆÈˆ¶a¶.6)ö,v*ˆ‹XÎˆ¼'äî‹ÎˆÛİ™\Ù[šY\ÈKˆ\Ú›Ø\™ˆÈˆ¶+ö)ö-6*6b6,v+È6av+öã6,vã6*ˆ‹XÎˆ¸¥©ˆ‹Îˆ\Ú›Ø\™Kˆ™\ÜØÙ[\ˆÈˆ¶av,vªv,ˆ6«ö,¶)ö,v-8 #6aö)È‹XÎˆ¼'åàˆ‹Îˆ™\ÜĞÙ[\ˆKˆX[ˆÈˆ¶+ö)ö-6*6b6,v+È6,öa6)öav*ˆ6,ö)öav)öa¶aÈ‹XÎˆ¸¥âH‹ÎˆŞ\İ[RX[\Ú›Ø\™KˆX\ˆÈˆ¶a¶`¶-6aöe6,¶a¶+öaöe6a¶ã6,vb6aö)È‹XÎˆ¸¥ãˆ‹Îˆ]™SX\Kˆ™\Ù[ˆÈˆ¶(¶av)ö,H6a6+v.6aø #6)öã6+v)ö-¶,vã6aˆ6+ö,H6+¶-öb6-È‹XÎˆ¼'éãH‹Îˆ™\Ù[İ]ÈKˆ™\Ù[Ú\ˆÈˆ¶a¶avb6+ö)ö,H6,¶a¶+öaöe6,v)öa¶a¶+ö«ö)öaˆ6+v)ö-¶,H‹XÎˆ¼'äâˆ‹Îˆ™\Ù[Ú\KˆÙ™šXÚX[ÎˆÈˆ¶+v-¶b6,H6av,ö)¶b6a6ã6aˆ6+ö,H6+¶-È‹XÎˆ¼'äi‹ÎˆÙ™šXÚX[ÈKˆY\ÜØYÙ\ÎˆÈˆ¶o¶ã6)öax #6,v,ö)öa¶ã6*6aÈ6a¶ã6,vb6aö)È‹XÎˆ¸§"H‹ÎˆY\ÜØYÙ\ÈKˆØ[\\Û\ÎˆÈˆ¶*6)ö,v«ö,6)ö,vã6`vã6-6+v`¶b6`¶ã‹XÎˆ¼'ä¬È‹ÎˆØ[\TÛ\ĞYZ[ˆKˆİXœØÜš\[Ûš[›ÚXÙ\ÎˆÈˆ¶-v+öb6,H6`v)öªv*¶b6,H‹XÎˆ¼'éïˆ‹ÎˆİXœØÜš\[Û’[›ÚXÙ\ĞYZ[ˆKˆY\ÜÙ[™Ù\˜Ù[\ˆÈˆ¶av,vªv,ˆ6)ö,v,ö)öa6,v*6)ö*¸ #6aö)È‹XÎˆ¼'é%ˆ‹ÎˆY\ÜÙ[™Ù\Ù[\”[™[KˆÛÛ\[\™\]Y\İÎˆÈˆ¶av+ö)ö,vªH6)ö,v,ö)öa6ã6-6,vªv*ˆ‹XÎˆ¼'äê‹ÎˆÛÛ\[T™\]Y\İĞYZ[ˆKˆ\Ù\œÎˆÈˆ¶av+öã6,vã6*ˆ6ªv)ö,v*6,v)öaˆ‹XÎˆ¸¦-È‹Îˆ\Ù\œÈKˆ›Û™\ÎˆÈˆ¶ava¶-ö`¶aø #6*6a¶+öã6a¶ã6,vb6aö)È‹XÎˆ¸«(H‹Îˆ›Û™\ÈKˆÜ™ÎˆÈˆ¶¡¶)ö,v*ˆ6,ö)ö,¶av)öa¶ã‹XÎˆ¸©(ˆ‹ÎˆÜ™ĞÚ\Kˆš]™\œÎˆÈˆ¶,v)öa¶a¶+ö«ö)öaˆ6b6+¶b6+ö,vb6aö)È‹XÎˆ[YÏˆ‹Îˆš]™\œÈKˆš]™\œÙ\šXÙ\™\ÜˆÈˆ¶.vava6ªv,v+È6b6*¶,6ªv,v)ö*ˆ6*¶)öªv,öã6,v)öaˆ‹XÎˆ¼'äâ‹Îˆš]™\”Ù\šXÙT™\ÜKˆ[™\ÎˆÈˆ¶+¶-öb6-È6*¶)öªv,öã6,v)öa¶ã‹XÎˆ¸¡á‹Îˆ[™\ÈKˆš[ÎˆÈˆ¶(¶*6b6a¶av)öaˆ6b6`vã6-8 #6aö)È‹XÎˆ¸ ªˆ‹Îˆš[ÈKˆÛÛ™šYÎˆÈˆ¶*¶,6ªv,v)ö*ˆ6b6¡¶ªx #6a6ã6,ö*ˆ‹XÎˆ¸§#ˆ‹ÎˆÛÛ™šYÈKˆ›Ü›\ÎˆÈˆ¶`v,vax #6,ö)ö,ˆ‹XÎˆ¸¥©‹Îˆ›Ü›PZ[\ˆKˆÛÜšØÛÛ˜XİÎˆÈˆ¶)öã6+6)ö+È6b6o¶,vã6a¶*ˆ6`¶,v)ö,v+ö)ö+È6ªv)ö,vã‹XÎˆ¼'äá‹ÎˆÛÜšĞÛÛ˜XİÔYÙHKˆ™\ÜÎˆÈˆ¶«ö,v+ö-6«ö,¶)ö,v-8 #6aö)È‹XÎˆ¸§"H‹Îˆ™\ÜÈKˆ™\ÜˆÈˆ¶«ö,¶)ö,v-8 #6«öã6,vã6o¶ã6-6,v`v*¶aÈ‹XÎˆ¼'äâˆ‹Îˆ™\Ü[™ÈKˆ\™œ™\ÜˆÈˆ¶«ö,¶)ö,v-6.vava6ªv,v+È6o¶,v,öa¶a‹XÎˆ¼'ãáˆ‹Îˆ\œÛÛ›™[\™›Ü›X[˜ÙHKˆÙ[˜\™NˆÈˆ¶,v`v)öaöã6)ö*ˆ6,vb6)ö*6-È6.vavb6avã‹XÎˆ¼'ã H‹ÎˆÙ[˜\™HKˆİ[\˜[ˆÈˆ¶`v.v)öa6ã6*¸ #6aö)öã6`v,vaöa¶«öã‹XÎˆ¼'ã«H‹Îˆİ[\˜[Kˆ^Ù[ˆÈˆ¶b6,vb6+È6)ö-öa6)ö.v)ö*ˆ
6)öªv,öa
H‹XÎˆ¸©$È‹Îˆ^Ù[[\ÜKˆÙÜÎˆÈˆ¶a6)ö«È6`v.v)öa6ã6*¸ #6aö)È‹XÎˆ¸£¦‹ÎˆÙÜÈKˆ\Ù\˜XİˆÈˆ¶`v.v)öa6ã6*ˆ6ªv)ö,v*6,v)öaˆ‹XÎˆ¸£ìH‹Îˆ\Ù\Xİ]š]HKˆÛÛ[Z]Y[ÎˆÈˆ¶*¶.vaö+ö)ö*ˆ6)öa¶-¶*6)ö-öã‹XÎˆ¼'äâÈ‹ÎˆÛÛ[Z]Y[ÈKˆ[\š]™\œÎˆÈˆ¶,v)öa¶a¶+ö«ö)öaˆ6avb6`¶*ˆ‹XÎˆ¼'æ¥H‹Îˆ[\š]™\œÔ[™[Kˆ™\Ù[˜ÙNˆÈˆ¶-v+v*¸ #6,öa¶+6ã6+v-¶b6,H‹XÎˆ¼'äî‹Îˆ™\Ù[˜ÙPÚXÚÜÈKˆÛ\ÎˆÈˆ¶)ö,v,ö)öa6o¶ã6)öavªH‹XÎˆ¸§"H‹ÎˆÛ\ÔÙ[™KˆÛ\ÛÙÎˆÈˆ¶*¶)ö,vã6+¶¡¶aöe6o¶ã6)öavªH‹XÎˆ¼'äç‹ÎˆÛ\ÓÙÈKˆ][™[˜ÙNˆÈˆ¶+v-¶b6,H6a¶ã6,vb6aö)È‹XÎˆ¼'ådˆ‹ÎˆİY™][™[˜ÙHKˆÚYÎˆÈˆ¶*¶a¶.6ã6av)ö*ˆ6-6ã6`v*ˆ6ªv)ö,vã‹XÎˆ¼'åäÈ‹ÎˆÚYX[˜YÙ\ˆKˆ[Û]ÛÜšÜ™\ÜˆÈˆ¶«ö,¶)ö,v-6ªv)ö,vªv,v+È6av)öaö)öa¶aÈ‹XÎˆ¼'äáH‹ÎˆÚY™\ÜKˆ]™\ÜˆÈˆ¶«ö,¶)ö,v-6*¶,v+ö+È6o¶,v,öa¶a‹XÎˆ¼'ådˆ‹Îˆ][™[˜ÙT™\ÜKˆX]™\™\ÜˆÈˆ¶«ö,¶)ö,v-6av,v+¶-vã6o¶,v,öa¶a‹XÎˆ¼'ã-‹Îˆ\œÛÛ›™[X]™T™\ÜKˆÛÜšÜÛXŞNˆÈˆ¶,öã6)ö,ö*ˆ6ªv)ö,vã‹XÎˆ¼'ää‹ÎˆÛÜšÔÛXŞHKˆ™\]Y\İÎˆÈˆ¶+ö,v+¶b6)ö,ö*¸ #6aö)öã6o¶,v,öa¶a‹XÎˆ¼'äâÈ‹ÎˆYZ[”™\]Y\İÈKˆİ]YÙ\ÎˆÈˆ¶`¶-ö.vã6,öã6,ö*¶aH6a¶b6*6*¸ #6+öaöã‹XÎˆ¸¦å‹Îˆİ]YÙT™\ÜKˆZ\ÜÚ[Û™\Ú›Ø\™ˆÈˆ¶+ö)ö-6*6b6,v+È6.vava6ã6)ö*ˆ6avã6+ö)öa¶ã‹XÎˆ¼'éëH‹ÎˆZ\ÜÚ[Û“Ü\˜][ÛœÑ\Ú›Ø\™KˆÚ]Y\Ú›Ø\™ˆÈˆ¶+ö)ö-6*6b6,v+È6av+öã6,vã6*¶ã6ªva8 #6-6aö,H‹XÎˆ¼'ãæH‹ÎˆÚ]SÜ\˜][ÛœÑ\Ú›Ø\™KˆZ\ÜÚ[Û[\]\ÎˆÈˆ¶avb6*¶b6,H6av(öavb6,vã6*ˆ8 %6)öa6«öb6aö)È6b6*¶a¶.6ã6av)ö*ˆ‹XÎˆ¼'ã«È‹ÎˆZ\ÜÚ[Û•[\]\ĞYZ[ˆKˆØÛÜ™Y[™Ú[™NˆÈˆ¶avb6*¶b6,H6)öav*¶ã6)ö,¶+öaöã‹XÎˆ¼'ãáˆ‹ÎˆØÛÜ™Q[™Ú[™PYZ[ˆKˆİ\İÛYšY[ÎˆÈˆ¶`vã6a6+öaö)öã6,ö`v)ö,v-6ã‹XÎˆ¼'éêH‹Îˆİ\İÛQšY[ÓX[˜YÙ\ˆKˆ[™[ÜNˆÈˆ¶)ö`¶a6)öaH6*¶+vb6ã6a6ã‹XÎˆ¼'äéˆ‹Îˆ[™[ÜPYZ[ˆKˆ\][\ÎˆÈˆ¶(¶ã6*¶ax #6aö)öã6)öoˆ6aö,H6,öav*ˆ‹XÎˆ¼'äìH‹Îˆ›ÛP\][\ÕšY]ÈKˆÜ›Ûœİ]\ÎˆÈˆ¶o¶)öã6-6,öa6)öav*ˆ6ªv,vb6a¸ #6aö)È‹XÎˆ¸£ìH‹ÎˆÜ›Û”İ]\ÕšY]ÈKˆXİ]™\Ù\ÜÚ[ÛœÎˆÈˆ¶+6a6,ö)ö*ˆ6`v.v)öa6ªv)ö,v*6,v)öaˆ‹XÎˆ¼'å$‹ÎˆXİ]™TÙ\ÜÚ[ÛœÕšY]ÈKˆ˜Y[ØÙ[\ˆÈˆ¶av,vªv,ˆ6*6ã8 #6,öã6aH‹XÎˆ¼'äîÈ‹Îˆ˜Y[ĞÙ[\ˆKˆ™ZXÛX\ÜÙ]ÎˆÈˆ¶av)ö-6ã6a¸ #6(¶a6)ö*ˆ6b6b6,ö)öã6a6av(öavb6,vã6*¶ã‹XÎˆ¼'æ¦H‹Îˆ\œÛÛ›™[™ZXÛP\ÜÙ]ÈKˆ™ZXÛXÚXÚÛ\İˆÈˆ¶¡¶ªx #6a6ã6,ö*ˆ6+¶b6+ö,vb6ã6ã6b6avb6*¶b6,vã‹XÎˆ¸¦$H‹Îˆ\œÛÛ›™[™ZXÛPÚXÚÛ\İŒˆKˆÙ][™ÜÎˆÈˆ¶*¶a¶.6ã6av)ö*ˆ6,ö)öav)öa¶aÈ‹XÎˆ¸¦¦H‹ÎˆÙ][™ÜÈKˆØÚÛÛÙ\šXÙNˆÈˆ¶,ö,vb6ã6,È6av+ö)ö,v,È‹XÎˆœ›İ]H‹ÎˆØÚÛÛÙ\šXÙS][˜Ú\ˆKˆÛÛ\Z[ÎˆÈˆ¶-6ªv)öã6)ö*ˆ6*¶)öªv,öã6,v)öa¶)öaˆ‹XÎˆ˜Ú][Y\ÜØYÙH‹ÎˆÛÛ\Z[Ó][˜Ú\ˆKŸNÂ˜ÛÛœİS‘SÓQS•WÔÑPÕSÓ”ÈHÂˆÈ¶+ö)ö-6*6b6,v+È6b6a¶`¶-6aÈ‹È™\Ú›Ø\™‹›Z\ÜÚ[Û™\Ú›Ø\™‹˜Ú]Y\Ú›Ø\™‹›X\‹œ™\Ù[‹œ™\Ù[Ú\—WKˆÈ¶*6)ö,¶,v,öã6b6+¶+öav)ö*ˆ‹È›Ù™šXÚX[È‹œ™\Ù[˜ÙH‹˜Ûİ™\Ù[šY\È‹›İ]YÙ\È‹œØÚÛÛÙ\šXÙH‹˜ÛÛ\Z[È‹˜ÛÛ\[\™\]Y\İÈ—WKˆÈ¶*¶)öªv,öã6b6+¶-öb6-È‹È™š]™\œÈ‹[\š]™\œÈ‹›[™\È‹˜š[È—WKˆÈ¶)öavb6,H6av)öa6ã6b6)ö-6*¶,v)öªH‹ÈœİXœØÜš\[Ûš[›ÚXÙ\È—WKˆÈ¶«ö,¶)ö,v-8 #6aö)È6b6(¶av)ö,H‹Èœ™\ÜØÙ[\ˆ‹›[Û]ÛÜšÜ™\Ü‹˜]™\Ü‹›X]™\™\Ü‹œ\™œ™\Ü‹™š]™\œÙ\šXÙ\™\Ü‹œ™\ÜÈ‹œ™\Ü‹\Ù\˜Xİ—WKˆÈ¶o¶,v,öa¶a6b6ava¶)ö*6.H6)öa¶,ö)öa¶ã‹È\Ù\œÈ‹›Ü™È‹›Û™\È‹˜][™[˜ÙH‹œÚYÈ‹ÛÜšÜÛXŞH‹œÙ[š[Üš]H‹œ™\]Y\İÈ‹˜ÛÛ[Z]Y[È‹œØ[\\Û\È‹ÛÜšØÛÛ˜XİÈ—WKˆÈ¶*¶+6aöã6,¶)ö*ˆ6b6,v`v)öaÈ‹È™ZXÛX\ÜÙ]È‹™ZXÛXÚXÚÛ\İ‹š[™[ÜH‹Ù[˜\™H‹˜İ[\˜[—WKˆÈ¶o¶ã6)öax #6aö)È6b6)ö,v*¶*6)ö-ö)ö*ˆ‹È›Y\ÜØYÙ\È‹œÛ\È‹œÛ\ÛÙÈ‹›Y\ÜÙ[™Ù\˜Ù[\ˆ‹œ˜Y[ØÙ[\ˆ—WKˆÈ¶*¶a¶.6ã6av)ö*ˆ6b6)ö*6,¶)ö,vaö)È‹È›Z\ÜÚ[Û[\]\È‹œØÛÜ™Y[™Ú[™H‹™›Ü›\È‹˜ÛÛ™šYÈ‹˜İ\İÛYšY[È‹™^Ù[‹˜\][\È‹œÙ][™ÜÈ—WKˆÈ¶,öa6)öav*ˆ6b6)öava¶ã6*ˆ‹ÈšX[‹˜Ü›Ûœİ]\È‹˜Xİ]™\Ù\ÜÚ[ÛœÈ‹›ÙÜÈ—WK—NÂ˜ÛÛœİS‘SÓQS•WÒÑVUÓÔ‘ÈHÂˆÛ\Îˆ¶)ö,È6)öaH6)ö,ÈÛ\È6o¶ã6)öaH6ªvb6*¶)öaÈ‹Û\ÛÙÎˆ¶o¶ã6)öavªH6)ö,v,ö)öa6*¶)ö,vã6+¶¡¶aÈ‹Y\ÜØYÙ\Îˆ¶o¶ã6)öaH6-va¶+öb6`ˆ6avªv)ö*¶*6aÈ‹ˆ\Ù\œÎˆ¶ªv)ö,v*6,H6o¶,v,öa¶a6a¶ã6,vb6)ö.v-¶)È‹İXœØÜš\[Ûš[›ÚXÙ\Îˆ¶-v+öb6,H6`v)öªv*¶b6,H6`v,vb6-6)ö-6*¶,v)öªH6+¶-öã6)ö,H6-6,vªv*¶aö)È6av)öa6ã‹Ø[\\Û\Îˆ¶+v`¶b6`ˆ6`vã6-6av)öa6ã‹ÛÜšØÛÛ˜XİÎˆ¶`¶,v)ö,v+ö)ö+È6ªv)ö,vã6)ö,ö*¶+¶+ö)öaH6o¶,v,öa¶a6¡¶)öoˆ6o¶,vã6a¶*ˆ6b6,v+È‹Ù[š[Üš]Nˆ¶,öa¶b6)ö*ˆ6+¶+öav*ˆ6,ö)ö*6`¶aÈ‹ˆ]™\Üˆ¶*¶,v+ö+È6b6,vb6+È6+¶,vb6+6+v-¶b6,H‹[Û]ÛÜšÜ™\Üˆ¶ªv)ö,vªv,v+È6av)öaöã6)öa¶aÈ6avb6.6`vã6-6ã6`v*ˆ6,ö)ö,¶av)öaˆ‹ˆ™\]Y\İÎˆ¶+ö,v+¶b6)ö,ö*ˆ6av,v+¶-vã6av)öavb6,vã6*ˆ‹[™[ÜNˆ¶)öa¶*6)ö,H6*¶+6aöã6,¶)ö*ˆ6b6)ö«ö,6)ö,vã6*¶+vb6ã6a‹ˆÙÜÎˆ¶,vb6ã6+ö)ö+È6,v+¶+ö)ö+È6)öava¶ã6*ˆ6+¶-ö)È6`v.v)öa6ã6*ˆ‹Xİ]™\Ù\ÜÚ[ÛœÎˆ¶a¶-6,ö*ˆ6+ö,ö*¶«ö)öaÈ6b6,vb6+È6)öava¶ã6*ˆ‹ˆØÚÛÛÙ\šXÙNˆ¶av+ö,v,öaÈ6av+ö)ö,v,È6,ö,vb6ã6,È6+ö)öa¶-6(¶avb6,ˆ‹ÛÛ\Z[Îˆ¶-6ªv)öã6*ˆ6-6ªv)öã6)ö*ˆ6)ö.v*¶,v)ö-ˆ‹ˆ›Û™\Îˆ¶ava¶-ö`¶aÈ6,¶ã6,vava¶-ö`¶aÈ6ava¶-ö`¶aÈ6*6a¶+öã‹\][\Îˆ¶ava¶b6(¶ã6*¶aH6+ö,ö*¶,v,öã6,öav*ˆ‹ˆÛİ™\Ù[šY\Îˆ¶a¶.6)ö,v*ˆ6*¶-vb6ã6,H6.vªv,È6,öa6`vã6a¶)öav+v,öb6,È‹ÛÜšÜÛXŞNˆ¶`¶b6)öa¶ã6aˆ6`¶)öa¶b6aˆ6ªv)ö,H6,öã6)ö,ö*ˆ‹ˆÛÛ™šYÎˆ¶*¶,6ªv,H6¡¶ªH6a6ã6,ö*ˆ6¡¶ªva6ã6,ö*ˆ‹™ZXÛXÚXÚÛ\İˆ¶¡¶ªH6a6ã6,ö*ˆ6¡¶ªva6ã6,ö*ˆ6+¶b6+ö,vb6avb6*¶b6,H‹ˆZ\ÜÚ[Û[\]\Îˆ¶av)öavb6,vã6*ˆ6)öa6«öb6*6)ö,¶+öã6+È6*6,va¶)öavaÈ‹ØÛÜ™Y[™Ú[™Nˆ¶)öav*¶ã6)ö,ˆ6,v*¶*6aÈ6)ö,v,¶ã6)ö*6ã‹ŸNÂ™[˜İ[Ûˆ›Ü›X[^™T[™[Y[U^
^
HÂˆ™]\›ˆİš[™Ê^ˆŠK››Ü›X[^™J“‘’ĞÈŠKœ™\XÙJÖöb¶bv)—KÙË¶ãŠKœ™\XÙJö`ËÙË¶ªHŠKœ™\XÙJÖö(ö)vlv(—KÙË¶)ÈŠKœ™\XÙJö)ÙË¶bŠKœ™\XÙJÖ×L‹WLY—LÌKÙËˆŠKœ™\XÙJÖ×LŒ×LŒKÙËˆŠKœ™\XÙJ×ÊËÙËˆŠKš[J
KÓİÙ\Ø\ÙJ
NÂŸB™[˜İ[Ûˆ[™[Y[SX]Ú\ÊÙ^KÙXİ[Û‹]Y\JHÂˆ˜\ˆØNÂˆÛÛœİÚÙ[œÈH›Ü›X[^™T[™[Y[U^
]Y\JKœÜ]
ˆŠK™š[\Š›ÛÛX[ŠNÂˆÛÛœİ^\İXÚÈH›Ü›X[^™T[™[Y[U^



ØHH’QUÔÖÚÙ^WJHOOH[ØHOOH›ÚYÈ›ÚYˆØK
HˆŠH
Èˆˆ
ÈÙXİ[Ûˆ
Èˆˆ
È
S‘SÓQS•WÒÑVUÓÔ‘ÖÚÙ^WHˆŠJNÂˆ™]\›ˆÚÙ[œË™]™\JÚÙ[ˆOˆ^\İXÚËš[˜ÛY\ÊÚÙ[ŠJNÂŸB™[˜İ[ÛˆÙÚ[ŠÈÛ“ÙÚ[‹œ˜[™JHÂˆÛÛœİİ\Ù\›˜[YKÙ]\Ù\›˜[YWHH\ÙTİ]JˆŠNÂˆÛÛœİÜ\ÜİÛÜ™Ù]\ÜİÛÜ™HH\ÙTİ]JˆŠNÂˆÛÛœİØÛÙKÙ]ÛÙWHH\ÙTİ]JˆŠNÂˆÛÛœİÜÚİÔ\ÜİÛÜ™Ù]ÚİÔ\ÜİÛÜ™HH\ÙTİ]J˜[ÙJNÂˆÛÛœİÛÙÚ[“Y]ÙÙ]ÙÚ[“Y]ÙHH\ÙTİ]J[
NÂˆÛÛœİÛ[ÙKÙ][ÙWHH\ÙTİ]Jœ™\]Y\İŠNÂˆÛÛœİØÛÛ™šYÔ™]KÙ]ÛÛ™šYÔ™]WHH\ÙTİ]J
NÂˆÛÛœİÙ\œ‹Ù]\œ—HH\ÙTİ]JˆŠNÂˆÛÛœİÚ[™›ËÙ][™›×HH\ÙTİ]JˆŠNÂˆÛÛœİØ\ŞKÙ]\ŞWHH\ÙTİ]J˜[ÙJNÂˆÛÛœİØÛÛÛİÛ‹Ù]ÛÛÛİÛ—HH\ÙTİ]J
NÂˆ\ÙQY™™Xİ


HOˆÈ]Xİ]™HHYNÈÙ]ÙÚ[“Y]Ù
[
NÈÙ]\œŠˆŠNÈ‹ÙX“ÙÚ[ÛÛ™šYÊ
K[ŠOˆÈYˆ
VÉÜ\ÜİÛÜ™	Ë	ÜÛ\×Ûİ	Ë	Ø˜[WÛİ	×Kš[˜ÛY\ÊOOH[OOH›ÚYÈ›ÚYˆ›Y]Ù
JBˆ›İÈ™]È\œ›ÜŠ	ö,vb6-6b6,vb6+È6)ö.va6)öax #6-6+öaÈ6av.v*¶*6,H6a¶ã6,ö*‹‰ÊNÈYˆ
Xİ]™JBˆÙ]ÙÚ[“Y]Ù
›Y]Ù
NÈJK˜Ø]Ú
HOˆÈYˆ
Xİ]™JBˆÙ]\œŠK›Y\ÜØYÙH	ö+ö,vã6)ö`v*ˆ6,vb6-6b6,vb6+È6a¶)öavb6`v`ˆ6*6b6+Ë‰ÊNÈJNÈ™]\›ˆ

HOˆÈXİ]™HH˜[ÙNÈNÈKØÛÛ™šYÔ™]WJNÂˆ\ÙQY™™Xİ


HOˆÈYˆ
ÛÛÛİÛˆH
Bˆ™]\›ÈÛÛœİHÙ][\˜[


HOˆÙ]ÛÛÛİÛŠˆOˆX]›X^
ˆHJJKL
NÈ™]\›ˆ

HOˆÛX\’[\˜[

NÈKØÛÛÛİÛ—JNÂˆÛÛœİY]ÙX™[HÙÚ[“Y]ÙOOHœÛ\×ÛİˆÈ¶o¶ã6)öavªHˆˆÙÚ[“Y]ÙOOH˜˜[WÛİˆÈ¶,v*6)ö*ˆ6*6a6aÈˆˆ¶a¶)öaH6ªv)ö,v*6,vã6b6ªva6avaÈ6.v*6b6,HÂˆÛÛœİ›Ü›X[^™Y\Ù\›˜[YHH\Ù\›˜[YKš[J
NÂˆÛÛœİ›Ü›X[^™QYÚ]ÈH˜[YHOˆİš[™Ê˜[YJKœ™\XÙJÖöìvîWKÙËÈOˆİš[™Ê¶ì6ìvì¶ìöí6íví¶íöî6îH‹š[™^ÙŠÊJJKœ™\XÙJÖöhvjWKÙËÈOˆİš[™Ê¶h6hvh¶höi6ivi¶iöj6jH‹š[™^ÙŠÊJJNÂˆÛÛœİ™\]Y\İÛÙHH\Ş[˜È

HOˆÂˆYˆ
\ŞHÛÛÛİÛˆˆ
Bˆ™]\›ÂˆYˆ
[›Ü›X[^™Y\Ù\›˜[YJHÂˆÙ]\œŠ¶a¶)öaH6ªv)ö,v*6,vã6,v)È6b6)ö,v+È6ªva¶ã6+ËˆŠNÂˆ™]\›ÂˆBˆÙ]\ŞJYJNÂˆÙ]\œŠˆŠNÂˆÙ][™›ÊˆŠNÂˆHÂˆÛÛœİH]ØZ]‹ÙX“ÙÚ[“İ™\]Y\İ
›Ü›X[^™Y\Ù\›˜[YJNÂˆÙ][ÙJ™\šYHŠNÂˆÙ]ÛÙJˆŠNÂˆÙ]ÛÛÛİÛŠŒ
NÂˆÙ][™›Ê˜Ú[›™[OOH˜˜[HˆÈ¶ªv+È6ã6ªx #6*6)ö,vav-v,v`H6)ö,ˆ6-ö,vã6`ˆ6,v*6)ö*ˆ6*6a6aÈ6)ö,v,ö)öa6-6+Ëˆˆˆ¶ªv+È6ã6ªx #6*6)ö,vav-v,v`H6*6aÈ6-6av)ö,vaÈ6aöav,v)öaÈ6*ö*6*¸ #6-6+öaÈ6+v,ö)ö*6ªv)ö,v*6,vã6)ö,v,ö)öa6-6+ËˆŠNÂˆBˆØ]Ú
JHÂˆÙ]\œŠH	‰ˆK›Y\ÜØYÙHÈK›Y\ÜØYÙHˆ¶)ö,v,ö)öa6ªv+È6a¶)öavb6`v`ˆ6*6b6+ÈŠNÂˆBˆš[˜[HÂˆÙ]\ŞJ˜[ÙJNÂˆBˆNÂˆÛÛœİ\ÜİÛÜ™ÙÚ[ˆH\Ş[˜È

HOˆÂˆYˆ
\ŞJBˆ™]\›ÂˆYˆ
[›Ü›X[^™Y\Ù\›˜[YH\\ÜİÛÜ™
HÂˆÙ]\œŠ¶a¶)öaH6ªv)ö,v*6,vã6b6ªva6avaÈ6.v*6b6,H6,v)È6ªv)öava6b6)ö,v+È6ªva¶ã6+ËˆŠNÂˆ™]\›ÂˆBˆÙ]\ŞJYJNÂˆÙ]\œŠˆŠNÂˆÙ][™›ÊˆŠNÂˆHÂˆÛÛœİH]ØZ]‹›ÙÚ[”\ÜİÛÜ™
›Ü›X[^™Y\Ù\›˜[YK\ÜİÛÜ™
NÂˆÛ“ÙÚ[Š\Ù\ŠNÂˆBˆØ]Ú
JHÂˆÙ]\œŠH	‰ˆK›Y\ÜØYÙHÈK›Y\ÜØYÙHˆ¶b6,vb6+È6a¶)öavb6`v`ˆ6*6b6+ÈŠNÂˆBˆš[˜[HÂˆÙ]\ŞJ˜[ÙJNÂˆBˆNÂˆÛÛœİ™\šYHH\Ş[˜È

HOˆÂˆYˆ
\ŞJBˆ™]\›ÂˆYˆ
ÛÙK›[™İOOHŠHÂˆÙ]\œŠ¶ªv+È6b6,vb6+È6*6)öã6+È6-6-6,v`¶aH6*6)ö-6+ËˆŠNÂˆ™]\›ÂˆBˆÙ]\ŞJYJNÂˆÙ]\œŠˆŠNÂˆÙ][™›ÊˆŠNÂˆHÂˆÛÛœİH]ØZ]‹ÙX“ÙÚ[“İ™\šYJ›Ü›X[^™Y\Ù\›˜[YKÛÙJNÂˆÛ“ÙÚ[Š\Ù\ŠNÂˆBˆØ]Ú
JHÂˆÙ]\œŠH	‰ˆK›Y\ÜØYÙHÈK›Y\ÜØYÙHˆ¶ªv+È6b6)ö,v+ö-6+öaÈ6-v+vã6+H6a¶ã6,ö*ˆŠNÂˆBˆš[˜[HÂˆÙ]\ŞJ˜[ÙJNÂˆBˆNÂˆÛÛœİİHÙÚ[“Y]ÙOOHœ\ÜİÛÜ™ÂˆYˆ
[ÙÚ[“Y]Ù
Bˆ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›ÙÚ[‹\YÙHˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ[™[ÙÚ[‹XØ\™‹›ÛNˆœİ]\ÈˆKˆ™XXİ˜Ü™X]Q[[Y[
œ‹[\œˆ	ö+ö,H6+v)öa6+ö,vã6)ö`v*ˆ6,vb6-6b6,vb6+ø )‰ÊKˆ\œˆ	‰ˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹ÛÛXÚÎˆ

HOˆÙ]ÛÛ™šYÔ™]JˆOˆˆ
ÈJHK—LŒWLLŒ×LŒÍLWLŒ×LŒ‘—LŒ‘ˆŠJJNÂˆ™]\›ˆ
™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›ÙÚ[‹\YÙHˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ[™[ÙÚ[‹XØ\™ˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›ÙÚ[‹Xœ˜[™ˆKˆ
œ˜[™OOH[œ˜[™OOH›ÚYÈ›ÚYˆœ˜[™›ÙÛÊHÈ™XXİ˜Ü™X]Q[[Y[
š[YÈ‹ÈÜ˜Îˆœ˜[™›ÙÛË[ˆ—L—LŒÍLŒ×LˆLŒÌ×LŒ×LWLŒ×L—LÈˆJHˆ™XXİ˜Ü™X]Q[[Y[
š[YÈ‹ÈÜ˜Îˆ‹Øœ˜[™ZÚ]X\‹œ™È‹[ˆ—L—LŒÍLŒ×LˆLŒ‘WLŒÍ×LĞ×LŒ×LŒÌHˆJKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆ›ÙÚ[‹Y^YXœ›İÈˆK—LÑWL—LLWLŒ‘—LĞ×LŒÌWLĞ×LŒHLL—LŒÎLŒ×LŒÌWLŒHŠKˆ™XXİ˜Ü™X]Q[[Y[
šH‹[ˆ—LLŒÌWLLŒ‘ˆLŒLÈ‹ˆ
œ˜[™OOH[œ˜[™OOH›ÚYÈ›ÚYˆœ˜[™]JH¶+¶-öã6)ö,HŠKˆ™XXİ˜Ü™X]Q[[Y[
œ‹[—LŒLŒÌWLŒ×LĞÈLŒ×LŒ‘—LŒ×LWL×LŒÈLŒ×LŒÍ×LLŒ×LŒÎWLŒ×LŒHLŒ‘LŒÌ×LŒ×LŒLŒÌ×LŒ×LŒÌ—LWLŒ×L—LĞÈLŒ‘WLLŒ‘ˆLŒÌWLŒÈLLŒ×LŒÌWLŒ‘ˆLNWL—LĞ×LŒ‘‹ˆŠJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›ÙÚ[‹[Y]ÙˆKˆ—LŒÌWLLŒÍLLŒÌWLLŒ‘ˆLWLŒÎWLŒ×L‹ˆ™XXİ˜Ü™X]Q[[Y[
œİ›Û™È‹[Y]ÙX™[
JKˆİ	‰ˆ[ÙHOOHœ™\]Y\İˆ	‰ˆ™XXİ˜Ü™X]Q[[Y[
™XXİ‘œ˜YÛY[[ˆ™XXİ˜Ü™X]Q[[Y[
œ‹Èİ[NˆÈ›ÛÚ^™NˆL‹ÛÛÜˆ˜\ŠK[]]Y
H‹[™RZYÚˆKKX\™Ú[›İÛNˆLHK—L—LŒ×LHLNWLŒ×LŒÌWLŒLŒÌWLĞÈLŒ‘WLLŒ‘ˆLŒÌWLŒÈLLŒ×LŒÌWLŒ‘ˆLNWL—LĞ×LŒ‘ˆLŒWLŒÈLNWLŒ‘ˆLĞ×LNWLŒ×LŒLŒ×LŒÌWLWLŒÍWLŒÌWLHLŒLŒÌWLŒ×LĞÈLŒÍLWLŒÈLŒ×LŒÌWLŒÌ×LŒ×LLŒÍLLŒ‘‹ˆŠKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›ÙÚ[‹YšY[ˆKˆ—L—LŒ×LHLNWLŒ×LŒÌWLŒLŒÌWLĞÈ‹ˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹]]ĞÛÛ\]Nˆ\Ù\›˜[YH‹\ˆ›ˆ‹XÙZÛ\ˆ—L—LŒ×LHLNWLŒ×LŒÌWLŒLŒÌWLĞÈLŒÌ×LŒ×LŒÌ—LWLŒ×L—LĞÈ‹˜[YNˆ\Ù\›˜[YKÛÚ[™ÙNˆHOˆÙ]\Ù\›˜[YJK\™Ù]˜[YJKÛ’Ù^QİÛˆHOˆKšÙ^HOOH	Ñ[\‰È	‰ˆ™\]Y\İÛÙJ
K]]Ñ›Øİ\ÎˆYHJJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹İ[NˆÈÚYˆŒL	H‹X\™Ú[•ÜˆMKÛÛXÚÎˆ™\]Y\İÛÙK\ØX›Yˆ\ŞHÛÛÛİÛˆˆK\ŞHÈ	ö+ö,H6+v)öa6)ö,v,ö)öa8 )‰ÈˆÛÛÛİÛˆˆÈ	ö)ö,v,ö)öa6av+6+ö+È
	È
ÈÛÛÛİÛˆ
È	ÊIÈˆ	ö+ö,vã6)ö`v*ˆ6ªv+È6b6,vb6+ÉÊJKˆİ	‰ˆ[ÙHOOH™\šYHˆ	‰ˆ™XXİ˜Ü™X]Q[[Y[
™XXİ‘œ˜YÛY[[ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈ›ÛÚ^™NˆL‹ÛÛÜˆ˜\ŠK[]]Y
H‹[™RZYÚˆKKX\™Ú[›İÛNˆLHKÙÚ[“Y]ÙOOH˜˜[WÛİˆÈ¶ªv+È6-6-8 #6,v`¶avã6)ö,v,ö)öa8 #6-6+öaÈ6*¶b6,ö-È6,v*6)ö*ˆ6*6a6aÈ6,v)È6b6)ö,v+È6ªva¶ã6+Ëˆˆˆ¶ªv+È6-6-8 #6,v`¶avã6)ö,v,ö)öa8 #6-6+öaÈ6*6aÈ6-6av)ö,vaÈ6aöav,v)öaÈ6*ö*6*¸ #6-6+öaÈ6+v,ö)ö*6ªv)ö,v*6,vã6,v)È6b6)ö,v+È6ªva¶ã6+ËˆŠKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›ÙÚ[‹YšY[ˆKˆ—LNWLŒ‘ˆLŒÍLŒÍLŒ×LŒÌWL—LWLĞÈLLŒÌWLLŒ‘ˆ‹ˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]ÙÚ[‹[İ‹[œ][ÙNˆ›[Y\šXÈ‹]]ĞÛÛ\]Nˆ›Û™K][YKXÛÙH‹\ˆ›ˆ‹X^[™İˆ‹XÙZÛ\ˆ‹KKKKKH‹˜[YNˆÛÙKÛÚ[™ÙNˆHOˆÙ]ÛÙJ›Ü›X[^™QYÚ]ÊK\™Ù]˜[YJKœ™\XÙJÖ×ŒNWKÙË	ÉÊKœÛXÙJŠJKÛ’Ù^QİÛˆHOˆKšÙ^HOOH	Ñ[\‰È	‰ˆ™\šYJ
K]]Ñ›Øİ\ÎˆYHJJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹İ[NˆÈÚYˆŒL	H‹X\™Ú[•ÜˆMKÛÛXÚÎˆ™\šYK\ØX›Yˆ\ŞHÛÙK›[™İOOHˆK\ŞHÈ	ö+ö,H6+v)öa6*6,v,v,öã8 )‰Èˆ	ö*¶(öã6ã6+È6b6b6,vb6+ÉÊKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœ›İÈ‹İ[NˆÈ\İYPÛÛ[ˆœÜXÙKX™]ÙY[ˆ‹X\™Ú[•ÜˆLHKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹È\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ›ÙÚ[‹]^X]Ûˆ‹\ØX›Yˆ\ŞHÛÛÛİÛˆˆÛÛXÚÎˆ™\]Y\İÛÙHKÛÛÛİÛˆˆÈ6)ö,v,ö)öa6av+6+ö+È6*¶)È	ØÛÛÛİÛŸH6*ö)öa¶ã6aØˆ¶)ö,v,ö)öa6av+6+ö+È6ªv+ÈŠKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹È\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ›ÙÚ[‹]^X]Ûˆ‹\ØX›Yˆ\ŞKÛÛXÚÎˆ

HOˆÈÙ][ÙJœ™\]Y\İŠNÈÙ]ÛÙJˆŠNÈÙ]\œŠˆŠNÈÙ][™›ÊˆŠNÈHK—LŒWLŒĞWLĞ×LĞ×LŒÌHL—LŒ×LHLNWLŒ×LŒÌWLŒLŒÌWLĞÈŠJJKˆ[İ	‰ˆ™XXİ˜Ü™X]Q[[Y[
™XXİ‘œ˜YÛY[[ˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›ÙÚ[‹YšY[ˆKˆ—L—LŒ×LHLNWLŒ×LŒÌWLŒLŒÌWLĞÈ‹ˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹]]ĞÛÛ\]Nˆ\Ù\›˜[YH‹\ˆ›ˆ‹XÙZÛ\ˆ—L—LŒ×LHLNWLŒ×LŒÌWLŒLŒÌWLĞÈLŒÌ×LŒ×LŒÌ—LWLŒ×L—LĞÈ‹˜[YNˆ\Ù\›˜[YKÛÚ[™ÙNˆHOˆÙ]\Ù\›˜[YJK\™Ù]˜[YJKÛ’Ù^QİÛˆHOˆKšÙ^HOOH	Ñ[\‰È	‰ˆ\ÜİÛÜ™ÙÚ[Š
K]]Ñ›Øİ\ÎˆYHJJKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹ÈÛ\ÜÓ˜[YNˆ›ÙÚ[‹YšY[ˆKˆ—LNWLLWLÈLŒÎWLŒLLŒÌH‹ˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆ›ÙÚ[‹\\ÜİÛÜ™]Ü˜\ˆKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹ÈÛ\ÜÓ˜[YNˆš[œ]‹\NˆÚİÔ\ÜİÛÜ™È^ˆˆœ\ÜİÛÜ™‹]]ĞÛÛ\]Nˆ˜İ\œ™[\\ÜİÛÜ™‹\ˆ›ˆ‹XÙZÛ\ˆ—LNWLLWLÈLŒÎWLŒLLŒÌH‹˜[YNˆ\ÜİÛÜ™ÛÚ[™ÙNˆHOˆÙ]\ÜİÛÜ™
K\™Ù]˜[YJKÛ’Ù^QİÛˆHOˆKšÙ^HOOH	Ñ[\‰È	‰ˆ\ÜİÛÜ™ÙÚ[Š
HJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹È\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ›ÙÚ[‹\\ÜİÛÜ™]ÙÙÛH‹ÛÛXÚÎˆ

HOˆÙ]ÚİÔ\ÜİÛÜ™
ˆOˆ]ŠK˜\šXK[X™[ˆÚİÔ\ÜİÛÜ™È¶o¶a¶aö)öaˆ6ªv,v+öaˆ6ªva6avaÈ6.v*6b6,Hˆˆ¶a¶av)öã6-6ªva6avaÈ6.v*6b6,H‹˜\šXK\™\ÜÙYˆÚİÔ\ÜİÛÜ™KÚİÔ\ÜİÛÜ™È¶o¶a¶aö)öaˆˆˆ¶a¶av)öã6-ŠJJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹İ[NˆÈÚYˆŒL	H‹X\™Ú[•ÜˆMKÛÛXÚÎˆ\ÜİÛÜ™ÙÚ[‹\ØX›Yˆ\ŞHK\ŞHÈ¶+ö,H6+v)öa6b6,vb6+ø )ˆˆˆ¶b6,vb6+ÈŠJKˆ[™›È	‰ˆ™XXİ˜Ü™X]Q[[Y[
œ‹È›ÛNˆœİ]\È‹Û\ÜÓ˜[YNˆ›ÙÚ[‹Y™YY˜XÚÈÙÚ[‹Y™YY˜XÚË[ÚÈˆK[™›ÊKˆ\œˆ	‰ˆ™XXİ˜Ü™X]Q[[Y[
œ‹È›ÛNˆ˜[\‹Û\ÜÓ˜[YNˆ›ÙÚ[‹Y™YY˜XÚÈÙÚ[‹Y™YY˜XÚËY\œ›ÜˆˆK\œŠJJJNÂŸB™[˜İ[Ûˆš\œİÙÚ[”\ÜİÛÜ™
È˜[YKÛ‘Û™KÛ“ÙÛİ]JHÂˆÛÛœİØİ\œ™[Ù]İ\œ™[HH\ÙTİ]J	ÉÊKÛ™^Ù]™^HH\ÙTİ]J	ÉÊKØÛÛ™š\›KÙ]ÛÛ™š\›WHH\ÙTİ]J	ÉÊNÂˆÛÛœİØ\ŞKÙ]\ŞWHH\ÙTİ]J˜[ÙJKÙ\œ›Ü‹Ù]\œ›Ü—HH\ÙTİ]J	ÉÊKİš\ÚX›KÙ]š\ÚX›WHH\ÙTİ]J˜[ÙJNÂˆÛÛœİİX›Z]H\Ş[˜È
JHOˆÂˆKœ™]™[Y˜][

NÂˆÙ]\œ›ÜŠ	ÉÊNÂˆYˆ
™^›[™İLˆ™^›[™İˆL
HÂˆÙ]\œ›ÜŠ	ö,vav,ˆ6+6+öã6+È6*6)öã6+È6*6ã6aˆ6ìvìˆ6*¶)È6ìvì¶î6ªv)ö,v)öªv*¶,H6*6)ö-6+Ë‰ÊNÂˆ™]\›ÂˆBˆYˆ
™^OOHÛÛ™š\›JHÂˆÙ]\œ›ÜŠ	ö*¶ªv,v)ö,H6,vav,ˆ6+6+öã6+È6av-ö)ö*6`¶*ˆ6a¶+ö)ö,v+Ë‰ÊNÂˆ™]\›ÂˆBˆYˆ
İ\œ™[OOH™^
HÂˆÙ]\œ›ÜŠ	ö,vav,ˆ6+6+öã6+È6*6)öã6+È6*6)È6,vav,ˆ6`v.va6ã6av*¶`v)öb6*ˆ6*6)ö-6+Ë‰ÊNÂˆ™]\›ÂˆBˆÙ]\ŞJYJNÂˆHÂˆ]ØZ]ÑS‘
	ÔÔÕ	Ë	ËÛ^KÙš\œİ[ÙÚ[‹\\ÜİÛÜ™	ËÈİ\œ™[™^JNÂˆ]ØZ]Û‘Û™J
NÂˆBˆØ]Ú
JHÂˆÙ]\œ›ÜŠK›Y\ÜØYÙH	ö*¶.¶ã6ã6,H6,vav,ˆ6)öa¶+6)öaH6a¶-6+Ë‰ÊNÂˆBˆš[˜[HÂˆÙ]\ŞJ˜[ÙJNÂˆBˆNÂˆ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
›XZ[ˆ‹È\ˆœ‹İ[NˆÈZ[’ZYÚˆ	ÌLš	Ë\Ü^Nˆ	ÙÜšY	ËXÙR][\Îˆ	ØÙ[\‰ËY[™Îˆ	ÌMœ	Ë˜XÚÙÜ›İ[™ˆ	Û[™X\‹YÜ˜YY[
MYYËÙXYŒÙ™‹Ù˜Y˜ÈŒ	KÙYY
IÈHKˆ™XXİ˜Ü™X]Q[[Y[
œÙXİ[Ûˆ‹È˜\šXK[X™[YHˆ™š\œİ[ÙÚ[‹]]H‹İ[NˆÈÚYˆ	ÌL	IËX^ÚYˆŒ˜XÚÙÜ›İ[™ˆ	ÈÙ™™‰Ë›Ü™\ˆ	Ì\ÛÛYÙ™MYY‰Ë›Ü™\”˜Y]\ÎˆŒ‹Y[™Îˆ	ØÛ[\
Œœ]ËÍœ
IË›ŞÚYİÎˆ	ÌNŒÌNØŒXIË›Û˜[Z[Nˆ	Õ˜^š\›X]‹ZÛXKØ[œË\Ù\šY‰ÈHKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹È˜\šXKZY[ˆˆYH‹İ[NˆÈÚYˆMZYÚˆM\Ü^Nˆ	ÙÜšY	ËXÙR][\Îˆ	ØÙ[\‰Ë›Ü™\”˜Y]\ÎˆM‹˜XÚÙÜ›İ[™ˆ	ÈÙNYŒ™™‰ËÛÛÜˆ	ÈÌMÍL	Ë›ÛÚ^™NˆËX\™Ú[›İÛNˆNHK—QÑQLŠKˆ™XXİ˜Ü™X]Q[[Y[
šH‹ÈYˆ™š\œİ[ÙÚ[‹]]H‹İ[NˆÈ›ÛÚ^™NˆŒ‹ÛÛÜˆ	ÈÌMLÍMIËX\™Ú[ˆ	ÌL	ÈHK—LŒWLŒĞWLĞ×LĞ×LŒÌHLŒÌWLWLŒÌˆLŒ‘—LŒÌHLŒ×LLLĞ×LˆLLŒÌWLLŒ‘ˆŠKˆ™XXİ˜Ü™X]Q[[Y[
œ‹Èİ[NˆÈÛÛÜˆ	ÈÍLÍMÎIË[™RZYÚˆ‹X\™Ú[ˆ	Ì	ÈHKˆ—LŒÌ×LLŒ×LH‹ˆ˜[YH	öaöavªv)ö,H6«ö,v)öavã	Ëˆ—LŒÈLŒLŒÌWLŒ×LĞÈLŒ‘LWLŒ×LŒÎLŒHLŒ×LŒÌˆLŒ‘LŒÌ×LŒ×LŒLŒÍLWLŒÈLLŒ×LŒÌ—LHLŒ×LŒÌ×LŒHLŒÌWLWLŒÌˆLŒ×LLLĞ×LÈLŒÌWLŒÈLŒWLŒĞWLĞ×LĞ×LŒÌHLŒ‘—L×LĞ×LŒ‘‹ˆLÑWLŒÌÈLŒ×LŒÌˆLŒ—LŒLŒHLŒÌWLWLŒÌˆLŒ×LŒ‘—LĞ×LŒ‘—LŒÈLÑWL—LLWLŒ‘—LĞ×LŒÌWLĞ×LŒHLŒLŒ×LŒÌˆLWLĞ×LŒ×LŒÍLLŒ‘‹ˆŠKˆ™XXİ˜Ü™X]Q[[Y[
™›Ü›H‹ÈÛ”İX›Z]ˆİX›Z]İ[NˆÈ\Ü^Nˆ	ÙÜšY	ËØ\ˆMˆHKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹Èİ[NˆÈ\Ü^Nˆ	ÙÜšY	ËØ\ˆËÛÛÜˆ	ÈÌŒÙMMÉË›ÛÙZYÚˆŒHKˆ—LŒÌWLWLŒÌˆLWLŒÎWLLĞÈ‹ˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹È]]ĞÛÛ\]Nˆ˜İ\œ™[\\ÜİÛÜ™‹\Nˆš\ÚX›HÈ	İ^	Èˆ	Ü\ÜİÛÜ™	Ë™\]Z\™YˆYK˜[YNˆİ\œ™[ÛÚ[™ÙNˆHOˆÙ]İ\œ™[
K\™Ù]˜[YJKİ[NˆÈY[™ÎˆLË›Ü™\ˆ	Ì\ÛÛYØ™Ø™IË›Ü™\”˜Y]\ÎˆL›Ûˆ	Ú[š\š]	ËÚYˆ	ÌL	IË›ŞÚ^š[™Îˆ	Ø›Ü™\‹X›Ş	ÈHJJKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹Èİ[NˆÈ\Ü^Nˆ	ÙÜšY	ËØ\ˆËÛÛÜˆ	ÈÌŒÙMMÉË›ÛÙZYÚˆŒHKˆ—LŒÌWLWLŒÌˆLŒ×LŒ‘—LĞ×LŒ‘ˆ
LŒ‘LŒ‘—LŒ×L—LL‘ŒWL‘ŒˆLNWLŒ×LŒÌWLŒ×LNWLŒWLŒÌJH‹ˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹È]]ĞÛÛ\]Nˆ›™]Ë\\ÜİÛÜ™‹Z[“[™İˆL‹X^[™İˆL\Nˆš\ÚX›HÈ	İ^	Èˆ	Ü\ÜİÛÜ™	Ë™\]Z\™YˆYK˜[YNˆ™^ÛÚ[™ÙNˆHOˆÙ]™^
K\™Ù]˜[YJKİ[NˆÈY[™ÎˆLË›Ü™\ˆ	Ì\ÛÛYØ™Ø™IË›Ü™\”˜Y]\ÎˆL›Ûˆ	Ú[š\š]	ËÚYˆ	ÌL	IË›ŞÚ^š[™Îˆ	Ø›Ü™\‹X›Ş	ÈHJJKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹Èİ[NˆÈ\Ü^Nˆ	ÙÜšY	ËØ\ˆËÛÛÜˆ	ÈÌŒÙMMÉË›ÛÙZYÚˆŒHKˆ—LŒWLNWLŒÌWLŒ×LŒÌHLŒÌWLWLŒÌˆLŒ×LŒ‘—LĞ×LŒ‘ˆ‹ˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹È]]ĞÛÛ\]Nˆ›™]Ë\\ÜİÛÜ™‹\Nˆš\ÚX›HÈ	İ^	Èˆ	Ü\ÜİÛÜ™	Ë™\]Z\™YˆYK˜[YNˆÛÛ™š\›KÛÚ[™ÙNˆHOˆÙ]ÛÛ™š\›JK\™Ù]˜[YJKİ[NˆÈY[™ÎˆLË›Ü™\ˆ	Ì\ÛÛYØ™Ø™IË›Ü™\”˜Y]\ÎˆL›Ûˆ	Ú[š\š]	ËÚYˆ	ÌL	IË›ŞÚ^š[™Îˆ	Ø›Ü™\‹X›Ş	ÈHJJKˆ™XXİ˜Ü™X]Q[[Y[
›X™[‹Èİ[NˆÈ\Ü^Nˆ	Ù›^	Ë[YÛ’][\Îˆ	ØÙ[\‰ËØ\ˆKÛÛÜˆ	ÈÍLÍMÎIËİ\œÛÜˆ	ÜÚ[\‰ÈHKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹È\Nˆ˜ÚXÚØ›Ş‹ÚXÚÙYˆš\ÚX›KÛÚ[™ÙNˆHOˆÙ]š\ÚX›JK\™Ù]˜ÚXÚÙY
HJKˆˆL—LWLŒ×LĞ×LŒÍLŒÌWLWLŒÌ—L×LŒÈŠKˆ\œ›Üˆ	‰ˆ™XXİ˜Ü™X]Q[[Y[
œ‹È›ÛNˆ˜[\‹İ[NˆÈÛÛÜˆ	ÈØŒÌN	Ë˜XÚÙÜ›İ[™ˆ	ÈÙ™™ŒYIËY[™ÎˆL‹›Ü™\”˜Y]\ÎˆLX\™Ú[ˆ[™RZYÚˆKHK\œ›ÜŠKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹È\ØX›Yˆ\ŞK\NˆœİX›Z]‹İ[NˆÈY[™ÎˆM˜XÚÙÜ›İ[™ˆ	ÈÌMÍX	ËÛÛÜˆ	ÈÙ™™‰Ë›Ü™\ˆ›Ü™\”˜Y]\ÎˆLK›Ûˆ	ÍÌM\˜^š\›X]‹ZÛXIËİ\œÛÜˆ\ŞHÈ	İØZ]	Èˆ	ÜÚ[\‰ËÜXÚ]Nˆ\ŞHÈHˆHHK\ŞHÈ	ö+ö,H6+v)öa6,6+¶ã6,vaø )‰Èˆ	ö*¶.¶ã6ã6,H6,vav,ˆ6b6b6,vb6+È6*6aÈ6o¶a¶a	ÊKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹È\Nˆ˜]Ûˆ‹ÛÛXÚÎˆÛ“ÙÛİ]İ[NˆÈY[™ÎˆL˜XÚÙÜ›İ[™ˆ	İ˜[œÜ\™[	Ë›Ü™\ˆ	Ì\ÛÛYÙÙYXIË›Ü™\”˜Y]\ÎˆLÛÛÜˆ	ÈÍLÍMÎIË›Ûˆ	Ú[š\š]	Ëİ\œÛÜˆ	ÜÚ[\‰ÈHK—LŒ‘WLŒÌWLLŒÈLŒ×LŒÌˆLŒ‘LŒÌ×LŒ×LŒŠJKˆ™XXİ˜Ü™X]Q[[Y[
œ‹Èİ[NˆÈ›ÛÚ^™NˆL‹ÛÛÜˆ	ÈÍÎN‰Ë[™RZYÚˆKKX\™Ú[ˆ	ÌN	ÈHK—LŒ×LQ—LŒÌHLŒLŒÈLNWLŒ‘ˆLĞ×LNWLŒ×LŒLŒ×LŒÌWLWLŒÍWLŒÌWLHLLŒ×LŒÌWLŒ‘ˆLŒÍLŒ‘—L×LŒ×LŒ×LĞ×LŒ‘ˆLLŒÌWLWLŒÌˆLWLŒÎWLLĞÈLŒÌWLŒÈL—LWLĞ×LŒ×LŒ‘—LŒ×L—LĞ×LŒ‘—LŒÈLŒLŒÈLWLŒ‘—LĞ×LŒÌHLŒÌ×LŒ×LWLŒ×L—LÈLŒLŒÌWLŒ×LĞÈLŒLŒ×LŒÌ—LĞ×LŒ×LŒLĞÈLŒÌWLWLŒÌˆL×LWLŒ×L×L—LQˆLNWL—LĞ×LŒ‘‹ˆŠJJNÂŸB™[˜İ[Ûˆ\

HÂˆÛÛœİÛYKÙ]YWHH\ÙTİ]J[
NÂˆÛÛœİØ]]™XYKÙ]]]™XYWHH\ÙTİ]J˜[ÙJNÂˆÛÛœİİ‹Ù]—HH\ÙTİ]J™\Ú›Ø\™ŠNÂˆÛÛœİØ[İÙYÙ][İÙYHH\ÙTİ]J×JNÂˆÛÛœİÙ˜]Ù\‹Ù]˜]Ù\—HH\ÙTİ]J˜[ÙJNÂˆÛÛœİØœ˜[™Ù]œ˜[™HH\ÙTİ]JßJNÂˆÛÛœİÛ˜]šYØ][Û”™\İÜ™YÙ]˜]šYØ][Û”™\İÜ™YHH\ÙTİ]J˜[ÙJNÂˆ\ÙQY™™Xİ


HOˆÂˆYˆ
JYHOOH[YHOOH›ÚYÈ›ÚYˆYKš\×ØYZ[ŠJHÂˆÙ]˜]šYØ][Û”™\İÜ™Y
˜[ÙJNÂˆÙ]Š	Ù\Ú›Ø\™	ÊNÂˆ™]\›ÂˆBˆHÂˆÛÛœİØ]™YHÙ\ÜÚ[Û”İÜ˜YÙK™Ù]][J	ÚÚ]X\—ØYZ[—İšY]×ÉÈ
ÈYKšY
NÂˆÙ]ŠØ]™Y	‰ˆØš™Xİœ›İİ\Kš\ÓİÛ”›Ü\K˜Ø[
’QUÔËØ]™Y
HÈØ]™Yˆ	Ù\Ú›Ø\™	ÊNÂˆBˆØ]Ú
ÊHÂˆÙ]Š	Ù\Ú›Ø\™	ÊNÂˆBˆÙ]˜]šYØ][Û”™\İÜ™Y
YJNÂˆKÛYHOOH[YHOOH›ÚYÈ›ÚYˆYKšYYHOOH[YHOOH›ÚYÈ›ÚYˆYKš\×ØYZ[—JNÂˆ\ÙQY™™Xİ


HOˆÂˆYˆ
[˜]šYØ][Û”™\İÜ™YJYHOOH[YHOOH›ÚYÈ›ÚYˆYKš\×ØYZ[ŠJBˆ™]\›ÂˆHÂˆÙ\ÜÚ[Û”İÜ˜YÙKœÙ]][J	ÚÚ]X\—ØYZ[—İšY]×ÉÈ
ÈYKšYŠNÂˆBˆØ]Ú
ÊHÈBˆKÛ˜]šYØ][Û”™\İÜ™YYHOOH[YHOOH›ÚYÈ›ÚYˆYKšYYHOOH[YHOOH›ÚYÈ›ÚYˆYKš\×ØYZ[‹—JNÂˆÛÛœİÛY[TÙX\˜ÚÙ]Y[TÙX\˜ÚHH\ÙTİ]JˆŠNÂˆÛÛœİY[T]Y\HH›Ü›X[^™T[™[Y[U^
Y[TÙX\˜Ú
NÂˆÛÛœİY[P]Û”™YˆH\ÙT™YŠ[
NÂˆÛÛœİY[TÙX\˜Ú™YˆH\ÙT™YŠ[
NÂˆÛÛœİY[S˜]”™YˆH\ÙT™YŠ[
NÂˆ\ÙQY™™Xİ


HOˆÂˆYˆ
Y˜]Ù\ŠBˆ™]\›ÂˆÛÛœİÛ’Ù^HHHOˆÈ˜\ˆØNÈYˆ
KšÙ^HOOH‘\ØØ\HŠHÂˆÙ]˜]Ù\Š˜[ÙJNÂˆ
ØHHY[P]Û”™Y‹˜İ\œ™[
HOOH[ØHOOH›ÚYÈ›ÚYˆØK™›Øİ\Ê
NÂˆHNÂˆØİ[Y[˜Y]™[\İ[™\ŠšÙ^YİÛˆ‹Û’Ù^JNÂˆ™]\›ˆ

HOˆØİ[Y[œ™[[İ™Q]™[\İ[™\ŠšÙ^YİÛˆ‹Û’Ù^JNÂˆKÙ˜]Ù\—JNÂˆÛÛœİÜÚYX˜\ÛÛ\ÙYÙ]ÚYX˜\ÛÛ\ÙYHH\ÙTİ]J

HOˆÈHÂˆ™]\›ˆØØ[İÜ˜YÙK™Ù]][J˜YZ[—ÜÚYX˜\—ØÛÛ\ÙYŠHOOHŒHÂˆBˆØ]Ú
JHÂˆ™]\›ˆ˜[ÙNÂˆHJNÂˆÛÛœİÙÙÛTÚYX˜\ÛÛ\ÙYH

HOˆÙ]ÚYX˜\ÛÛ\ÙY
™]ˆOˆÈÛÛœİ™^H\™]ÈHÂˆØØ[İÜ˜YÙKœÙ]][J˜YZ[—ÜÚYX˜\—ØÛÛ\ÙY‹™^ÈŒHˆˆŒŠNÂˆBˆØ]Ú
JHÈH™]\›ˆ™^ÈJNÂˆËÈ6ava¶b6aö)öã6)ö-va6ã6+ö,H6a6b6+È6)öb6a6ã6aÈ6*6,ö*¶aÈ6*6)ö-6a¶+ö&È6ªv)ö,v*6,H6`v`¶-È6*6+¶-6avb6,v+öa¶ã6)ö,ˆ6,v)È6*6)ö,ˆ6avã8 #6ªva¶+Ë‚ˆÛÛœİÛÜ[”ÙXİ[ÛœËÙ]Ü[”ÙXİ[Ûœ×HH\ÙTİ]JßJNÂˆ\ÙQY™™Xİ


HOˆÈ‹œX›XÔÙ][™ÜÊ
K[ŠÈOˆÈÛÛœİˆHÈ]NˆËœÚ]Wİ]HË›Ü™×İ]H¶+¶-öã6)ö,H‹ÙÛÎˆËœÚ]WÛÙÛÈË›Ü™×ÛÙÛÈˆˆNÈÙ]œ˜[™
ŠNÈØİ[Y[]HH‹]NÈÚ[™İË—×Øœ˜[™ÙÛÈH‹›ÙÛÎÈJK˜Ø]Ú


HOˆÈJNÈK×JNÂˆ\ÙQY™™Xİ


HOˆÈ]Xİ]™HHYNÈ‹œ™\İÜ™TÙ\ÜÚ[ÛŠ
K[ŠHOˆÈYˆ
Xİ]™JBˆÙ]YJJNÈJK˜Ø]Ú


HOˆÈJK™š[˜[J

HOˆÈYˆ
Xİ]™JBˆÙ]]]™XYJYJNÈJNÈ™]\›ˆ

HOˆÈXİ]™HH˜[ÙNÈNÈK×JNÂˆ\ÙQY™™Xİ


HOˆÈYˆ
YH	‰ˆYKš\×ØYZ[ˆ	‰ˆ[YK›]\İØÚ[™ÙWÜÊHÂˆÙ][İÙY
×JNÂˆ‹œÙ][™ÜÊ
K[ŠÈOˆÈÛÛœİ[HËœ›ÛWÜ\›\ÈßNÈÛÛœİ\ÈHØš™Xİœ›İİ\Kš\ÓİÛ”›Ü\K˜Ø[
[İš[™ÊYKœ›ÛWÚY
JHØš™Xİœ›İİ\Kš\ÓİÛ”›Ü\K˜Ø[
[YKœ›ÛWÚY
NÈÛÛœİœH[ÛYKœ›ÛWÚYNÈÙ][İÙY
\È	‰ˆ\œ˜^Kš\Ğ\œ˜^Jœ
HÈœˆ[
NÈÛÛœİˆHÈ]NˆËœÚ]Wİ]HË›Ü™×İ]H¶+¶-öã6)ö,H‹ÙÛÎˆËœÚ]WÛÙÛÈË›Ü™×ÛÙÛÈˆˆNÈÙ]œ˜[™
ŠNÈØİ[Y[]HH‹]NÈÚ[™İË—×Øœ˜[™ÙÛÈH‹›ÙÛÎÈJK˜Ø]Ú


HOˆÙ][İÙY
×JJNÂˆHKÛYWJNÂˆYˆ
X]]™XYJBˆ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈZ[’ZYÚˆŒLš‹\Ü^Nˆ™ÜšY‹XÙR][\Îˆ˜Ù[\ˆ‹˜XÚÙÜ›İ[™ˆ˜\ŠK\\\ŠH‹ÛÛÜˆ˜\ŠK[]]Y
HˆHK—LŒ‘—LŒÌHLŒ‘LŒ×LLŒLŒÌWLŒÌWLŒÌ×LĞÈL—LŒÍLŒÌ×LŒWLŒˆŠNÂˆYˆ
[YJBˆ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
ÙÚ[‹ÈÛ“ÙÚ[ˆÙ]YKœ˜[™ˆœ˜[™JNÂˆYˆ
YK›]\İØÚ[™ÙWÜÊBˆ™]\›ˆ™XXİ˜Ü™X]Q[[Y[
š\œİÙÚ[”\ÜİÛÜ™È˜[YNˆYK›˜[YKÛ‘Û™Nˆ\Ş[˜È

HOˆÈÛÛœİHH]ØZ]‹œ™\İÜ™TÙ\ÜÚ[ÛŠ
NÈYˆ
]JBˆ›İÈ™]È\œ›ÜŠ	öa¶-6,ö*ˆ6-6av)È6ava¶`¶-¶ã6-6+öaÈ6)ö,ö*¶&È6+öb6*6)ö,vaÈ6b6)ö,v+È6-6b6ã6+Ë‰ÊNÈÙ]YJJNÈKÛ“ÙÛİ]ˆ\Ş[˜È

HOˆÈHÂˆ]ØZ]ØÛX\•ÙX”Ù\ÜÚ[ÛŠ
NÂˆÙ]YJ[
NÂˆBˆØ]Ú
JHÂˆ[\
K›Y\ÜØYÙJNÂˆHHJNÂˆYˆ
[YKš\×ØYZ[ŠBˆ™]\›ˆ
™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈZ[’ZYÚˆŒLš‹\Ü^Nˆ™ÜšY‹XÙR][\Îˆ˜Ù[\ˆ‹^[YÛˆ˜Ù[\ˆ‹Y[™ÎˆHKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[ˆ™XXİ˜Ü™X]Q[[Y[
šˆ‹Èİ[NˆÈÛÛÜˆ˜\ŠKY[™Ù\ŠHˆHK—LŒ‘—LŒÌ×LŒWLŒÌWLŒÌ×LĞÈLWLŒ‘—LĞ×LŒÌWLĞ×LŒWLĞÈL—LŒ‘—LŒ×LŒÌWLĞ×LŒ‘ˆŠKˆ™XXİ˜Ü™X]Q[[Y[
œ‹Èİ[NˆÈÛÛÜˆ˜\ŠK[]]Y
H‹X^ÚYˆÌ[™RZYÚˆ‹X\™Ú[•ÜˆHK—LLŒÌWLLŒ‘ˆLŒLÈLŒÌ×LŒ×LWLŒ×L—LÈLWLŒ‘—LĞ×LŒÌWLĞ×LŒHLL—LŒÎLŒ×LŒÌWLŒHLŒLŒÌHLŒ‘WLŒÍ×LLŒÍÈLL—LĞ×LŒÌWLL×LŒ×LĞÈLŒ×LŒ×LŒÌWLŒ×LĞ×LĞÈLŒWLŒ×LNWLŒÌ×LĞ×LŒÌWLŒ×L—LĞÈLŒWL—L×LŒÈLŒLŒÌWLŒ×LĞÈL—LĞ×LŒÌWLLĞÈLŒ×LŒ‘—LŒ×LŒÌWLĞ×LŒÈL—LĞ×LŒÌWLLĞÈLŒ×LŒ‘—LŒ×LŒÌWLĞÈLŒ×LŒÌWLŒÍLŒ‘—LŒÈLŒÌWLĞ×LĞ×LŒÌÈLŒ×LŒ‘—LŒ×LŒÌWLÈLŒLŒ×LŒÌ—LŒÌWLŒÌ×LĞÈLLWLŒ‘—LĞ×LŒÌHLNWLLWLŒ×LŒ×LŒÌˆLŒ×LŒÌ×LŒKˆLŒLŒÌWLŒ×LĞÈLNWLŒ×LŒÌWL×LŒ×LĞÈLWLĞ×LŒ‘—LŒ×L—LĞÈLŒ×LŒÌˆLŒ×LÑHLWLLŒLŒ×LĞ×L×LLŒLŒ×LŒ×LÑHLŒ×LŒÌ×LŒWLWLŒ×LŒ‘—LÈLNWL—LĞ×LŒ‘‹ˆŠKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ˜ˆ‹İ[NˆÈX\™Ú[•ÜˆMˆKÛÛXÚÎˆ\Ş[˜È

HOˆÈHÂˆ]ØZ]ØÛX\•ÙX”Ù\ÜÚ[ÛŠ
NÂˆÙ]YJ[
NÂˆBˆØ]Ú
JHÂˆ[\
K›Y\ÜØYÙJNÂˆHHK—LŒ‘WLŒÌWLLŒÈŠJJJNÂˆÛÛœİÑPÕSÓ”ÈHS‘SÓQS•WÔÑPÕSÓ”ÎÂˆÛÛœİØ[ˆH
ÊHOˆX[İÙY[İÙYš[˜ÛY\ÊÊNÂˆÛÛœİš\œİ[İÙYHÑPÕSÓ”Ë™›]X\

ËÙ^\×JHOˆÙ^\ÊK™š[™
ÈOˆ’QUÔÖÚ×H	‰ˆØ[ŠÊJNÂˆÛÛœİšÈHØ[ŠŠHÈˆˆ
š\œİ[İÙY™\Ú›Ø\™ŠNÂˆÛÛœİšY]ÈHš\œİ[İÙYX[İÙYÈ’QUÔÖİš×K˜Èˆ

HOˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹È›ÛNˆœİ]\È‹Û\ÜÓ˜[YNˆ›]]Y‹İ[NˆÈY[™Îˆ^[YÛˆ˜Ù[\ˆˆHK—LŒLŒÌWLŒ×LĞÈLŒÌ×LWLŒHLŒÍLWLŒÈLŒ‘—LŒÌ×LŒWLŒÌWLŒÌ×LĞÈLŒLÈL×LĞ×LˆLŒÍWLWLŒ‘L×LŒ×LŒ×LĞÈLŒWLŒÎWLŒÌWLĞ×LHL—LŒÍLŒ‘—LÈLŒ×LŒÌ×LŒKˆLŒLŒÈLWLŒ‘—LĞ×LŒÌHLŒÌ×LŒ×LWLŒ×L—LÈLŒWLWLŒ×LŒÌÈLŒLQ—LĞ×LŒÌWLĞ×LŒ‘‹ˆŠNÂˆÛÛœİQS•WÒPÓÓ”ÈHÂˆ\Ú›Ø\™ˆ	Ù\Ú›Ø\™ZÛYIË™\ÜØÙ[\ˆ	Ü™\ÜËY›Û\‰ËX[ˆ	ÜŞ\İ[KZX[	ËX\ˆ	ÛX\[X\šÙ\‰Ë™\Ù[ˆ	Ü™\Ù[YÜ›İ\	Ë™\Ù[Ú\ˆ	Ü™\Ù[˜ÙKXÚ\	ËˆZ\ÜÚ[Û™\Ú›Ø\™ˆ	Ü\™›Ü›X[˜ÙKYØ]YÙIËÚ]Y\Ú›Ø\™ˆ	ØÚ]K[X\	ËZ\ÜÚ[Û[\]\Îˆ	Ù\Ú›Ø\™[^[İ]	ËØÛÜ™Y[™Ú[™Nˆ	Û]™KXÚ\	ËˆÙ™šXÚX[Îˆ	ÛÙ™šXÚX[X˜YÙIË™\Ù[˜ÙNˆ	ÜÙ[‹XÚXÚÚ[‰Ë][™[˜ÙNˆ	Ø][™[˜ÙK\™YÚ\İ\‰ËÛÛ\[\™\]Y\İÎˆ	ØÛÛ\[KY[™[ÜIËİ]YÙ\Îˆ	ÜÙ\šXÙK[İ]YÙIËÛİ™\Ù[šY\Îˆ	ØÛİ™\XØ[Y\˜IËˆš]™\œÎˆ	Ùš]™\‹ZY	Ëš]™\œÙ\šXÙ\™\Üˆ	Ùš]™\‹\Ù\šXÙKXÚ\	Ë[\š]™\œÎˆ	İ[\Ü˜\KYš]™\‹XÛØÚÉË[™\Îˆ	Ü›İ]K[[™IË›Û™\Îˆ	Ş›Û™KYÜšY	Ëš[Îˆ	Øš[[™Ë\™XÙZ\	Ë]]˜Z[š[™Îˆ	ÜÙX\˜Ú]^IËˆ™\ÜÎˆ	Ü™\ÜXØ\™	Ë™\Üˆ	Ü™\Ü\Ù[™	Ë\™œ™\Üˆ	ØÚXÚÙY]\Ù\‹[X[IË]™\Üˆ	Ø][™[˜ÙKXØ[[™\‰ËX]™\™\Üˆ	Ø][™[˜ÙKXØ[[™\‰Ë\Ù\˜Xİˆ	İ\Ù\‹XXİ]š]IËˆÙ[š[Üš]Nˆ	Ø][™[˜ÙKXØ[[™\‰ËÚYÎˆ	ÜÚYXŞXÛIË[Û]ÛÜšÜ™\Üˆ	Ø][™[˜ÙKXØ[[™\‰ËÛÜšÜÛXŞNˆ	İÛÜšË\ÛXŞIË™\]Y\İÎˆ	Ü™\]Y\İY›Ü›IËØ[\\Û\Îˆ	ÜØ[\K\Û\	ËÛÛ[Z]Y[Îˆ	ØÛÛ[Z]Y[\ÚYÛ‰ËÙ[˜\™Nˆ	İÙ[˜\™KYÚY	Ëİ[\˜[ˆ	Øİ[\˜[X›ÛÚÉËˆY\ÜØYÙ\Îˆ	ÛY\ÜØYÙ\Ë[XZ[	ËÛ\Îˆ	ÜÛ\Ë\Û™IËÛ\ÛÙÎˆ	ÜÛ\ËZ\İÜIËY\ÜÙ[™Ù\˜Ù[\ˆ	ÛY\ÜÙ[™Ù\‹X›İ	Ë˜Y[ØÙ[\ˆ	Ü˜Y[Ë]İÙ\‰Ë\Ù\œÎˆ	İ\Ù\œËXYZ[‰ËÜ™Îˆ	ÛÜ™Ø[š^˜][Û‹]™YIË›Ü›\Îˆ	Ù›Ü›\Ë\[‰ËÛÜšØÛÛ˜XİÎˆ	Ù›Ü›KYØİ[Y[	ËˆÛÛ™šYÎˆ	ÜŞ\İ[KXÛÛ™šYÉËİ\İÛYšY[Îˆ	Øİ\İÛKYšY[ÉË[™[ÜNˆ	Ü™\]Y\İX›Ş	Ë^Ù[ˆ	Ù^Ù[]\ØY	Ë\][\Îˆ	Ø\[Y[IËÜ›Ûœİ]\Îˆ	ØXİ]š]K]Ø]™IËXİ]™\Ù\ÜÚ[ÛœÎˆ	ÜÙXİ\š]K[ØÚÉËÙÜÎˆ	Ø]Y][ÙÜÉËÙ][™ÜÎˆ	ÜÙ][™ÜËYÙX\œÉËˆ™ZXÛX\ÜÙ]Îˆ	ÛÜ\˜][Û‹]ÛÛÉË™ZXÛXÚXÚÛ\İˆ	ØÚXÚÛ\İ	ËØÚÛÛÙ\šXÙNˆ	ØÚXÚÛ\İ	ËÛÛ\Z[Îˆ	ØÚ][Y\ÜØYÙIÂˆNÂˆÛÛœİİ\œ™[ÙXİ[ÛˆHÑPÕSÓ”Ë™š[™

ËÙ^\×JHOˆÙ^\Ëš[˜ÛY\ÊšÊJNÂˆÛÛœİÛÜÙSÛ”XÚÈH
ÊHOˆÈYˆ
U’QUÔÖÚ×HXØ[ŠÊJBˆ™]\›ÈÙ]ŠÊNÈÙ]˜]Ù\Š˜[ÙJNÈÙ]Y[TÙX\˜Ú
ˆŠNÈÛÛœİÙXİ[ÛˆHÑPÕSÓ”Ë™š[™

ËÙ^\×JHOˆÙ^\Ëš[˜ÛY\ÊÊJNÈYˆ
ÙXİ[ÛŠBˆÙ]Ü[”ÙXİ[ÛœÊÈÜÙXİ[Û–ÌWNˆYHJNÈNÂˆÚ[™İË—×Û˜]šYØ]UÈHÛÜÙSÛ”XÚÎÂˆÛÛœİY[TÙXİ[ÛœÈHÑPÕSÓ”Ë›X\

İ]KÙ^\×JHOˆİ]KÙ^\Ë™š[\ŠÈOˆ’QUÔÖÚ×H	‰ˆØ[ŠÊH	‰ˆ[™[Y[SX]Ú\ÊË]KY[T]Y\JJWJK™š[\Š
ËÙ^\×JHOˆÙ^\Ë›[™İ
NÂˆÛÛœİX]Ú[™ÓY[RÙ^\ÈHY[TÙXİ[ÛœË™›]X\

ËÙ^\×JHOˆÙ^\ÊNÂˆÛÛœİX]Ú[™ÓY[PÛİ[HX]Ú[™ÓY[RÙ^\Ë›[™İÂˆÛÛœİÛ“Y[TÙX\˜ÚÙ^HHHOˆÂˆ˜\ˆØKØÂˆYˆ
KšÙ^HOOH‘\ØØ\Hˆ	‰ˆY[TÙX\˜Ú
HÂˆKœİÜ›ÜYØ][ÛŠ
NÂˆÙ]Y[TÙX\˜Ú
ˆŠNÂˆBˆYˆ
KšÙ^HOOH‘[\ˆˆ	‰ˆY[T]Y\H	‰ˆX]Ú[™ÓY[RÙ^\Ë›[™İ
HÂˆKœ™]™[Y˜][

NÂˆÛÜÙSÛ”XÚÊX]Ú[™ÓY[RÙ^\ÖÌJNÂˆBˆYˆ
KšÙ^HOOH\œ›İÑİÛˆˆ	‰ˆY[T]Y\JHÂˆKœ™]™[Y˜][

NÂˆ
ØˆH
ØHHY[S˜]”™Y‹˜İ\œ™[
HOOH[ØHOOH›ÚYÈ›ÚYˆØKœ]Y\TÙ[XİÜŠ	Ë›˜]š][N››İ
›ÙÛİ]Z][JIÊJHOOH[ØˆOOH›ÚYÈ›ÚYˆØ‹™›Øİ\Ê
NÂˆBˆNÂˆ™]\›ˆ
™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›^[İ]ˆ
È
˜]Ù\ˆÈˆ˜]Ù\‹[Ü[ˆˆˆˆŠH
È
ÚYX˜\ÛÛ\ÙYÈˆÚYX˜\‹XÛÛ\ÙYˆˆˆŠHKˆ™XXİ˜Ü™X]Q[[Y[
˜H‹ÈÛ\ÜÓ˜[YNˆœÚÚ\[[šÈ‹™YˆˆÜ[™[XÛÛ[ˆK—LŒÌWLWLŒWLˆLŒLÈLWLŒ‘LŒWLLŒ×LĞÈLŒÍWLWLŒ‘LÈŠKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœØÜš[H‹ÛÛXÚÎˆ

HOˆÙ]˜]Ù\Š˜[ÙJHJKˆ™XXİ˜Ü™X]Q[[Y[
˜\ÚYH‹ÈÛ\ÜÓ˜[YNˆœÚYHˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ˜œ˜[™ˆKˆœ˜[™›ÙÛÈÈ™XXİ˜Ü™X]Q[[Y[
š[YÈ‹ÈÜ˜Îˆœ˜[™›ÙÛËİ[NˆÈÚYˆÎZYÚˆÎ›Ü™\”˜Y]\ÎˆLØš™Xİš]ˆ˜ÛÛZ[ˆ‹˜XÚÙÜ›İ[™ˆˆÙ™™ˆ‹Y[™ÎˆÈHJHˆ™XXİ˜Ü™X]Q[[Y[
š[YÈ‹ÈÜ˜Îˆ‹Øœ˜[™ZÚ]X\‹œ™È‹İ[NˆÈÚYˆÎZYÚˆÎ›Ü™\”˜Y]\ÎˆNKØš™Xİš]ˆ˜Ûİ™\ˆˆHJKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹[œ˜[™]H¶+¶-öã6)ö,HŠJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›Y[K\ÙX\˜ÚˆKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆ›Y[K\ÙX\˜ÚZXÛÛˆ‹˜\šXKZY[ˆˆYHˆK—LŒÌMHŠKˆ™XXİ˜Ü™X]Q[[Y[
š[œ]‹È™YˆY[TÙX\˜Ú™Y‹\NˆœÙX\˜Ú‹X^[™İˆL˜[YNˆY[TÙX\˜ÚÛÚ[™ÙNˆHOˆÙ]Y[TÙX\˜Ú
K\™Ù]˜[YJKÛ’Ù^QİÛˆÛ“Y[TÙX\˜ÚÙ^KXÙZÛ\ˆ—LŒ×LŒÌ×LŒWLŒ×LLĞÈLŒÌ×LŒÌWLĞ×LŒÎHLŒÍWLWLŒ‘LŒ×LŒWLŒˆ‹˜\šXK[X™[ˆ—LŒ×LŒÌ×LŒWLŒ×LLŒ‘—LŒÌHLŒÍWLWLŒ‘LŒ×LŒHLÑWL—L‹˜\šXKXÛÛ›ÛÈˆœ[™[[˜]šYØ][ÛˆˆJKˆY[TÙX\˜Ú	‰ˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹È\Nˆ˜]Ûˆ‹ÛÛXÚÎˆ

HOˆÈ˜\ˆØNÈÙ]Y[TÙX\˜Ú
ˆŠNÈ
ØHHY[TÙX\˜Ú™Y‹˜İ\œ™[
HOOH[ØHOOH›ÚYÈ›ÚYˆØK™›Øİ\Ê
NÈK˜\šXK[X™[ˆ—LÑWLŒ×LNHLNWLŒÌWLŒ‘—LˆLŒ×LŒÌ×LŒWLŒ×LLĞÈLWL—LˆK—LÈŠJKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹È\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ›Y[K\ÙX\˜Ú]šYÙÙ\ˆ‹˜\šXK[X™[ˆ—LŒLŒ×LŒÌˆLNWLŒÌWLŒ‘—LˆLŒ×LŒÌ×LŒWLŒ×LLĞÈLWL—L‹ÛÛXÚÎˆ

HOˆÈÙ]ÚYX˜\ÛÛ\ÙY
˜[ÙJNÈÙ][Y[İ]


HOˆÈ˜\ˆØNÈ™]\›ˆ
ØHHY[TÙX\˜Ú™Y‹˜İ\œ™[
HOOH[ØHOOH›ÚYÈ›ÚYˆØK™›Øİ\Ê
NÈK
NÈHK—LŒÌMHŠKˆY[T]Y\H	‰ˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›Y[K\™\İ[XÛİ[‹›ÛNˆœİ]\ÈˆKˆ˜JX]Ú[™ÓY[PÛİ[
KˆˆLŒÍWLWLŒ‘LÈLÑWLĞ×LŒ‘—LŒÈLŒÍLŒ‘ˆŠKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹È\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆœÚYX˜\‹]ÙÙÛH‹]NˆÚYX˜\ÛÛ\ÙYÈ¶*6)ö,¶«ö,v+ö)öa¶+öaˆ6ava¶b6ã6ªv)öavaˆˆ¶avã6a¶ã6av)öã6,ˆ6ªv,v+öaˆ6ava¶b‹˜\šXK[X™[ˆÚYX˜\ÛÛ\ÙYÈ¶*6)ö,¶«ö,v+ö)öa¶+öaˆ6ava¶b6ã6ªv)öavaˆˆ¶avã6a¶ã6av)öã6,ˆ6ªv,v+öaˆ6ava¶b‹ÛÛXÚÎˆÙÙÛTÚYX˜\ÛÛ\ÙYKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹È˜\šXKZY[ˆˆYHˆKÚYX˜\ÛÛ\ÙYÈ¸¡éHˆˆ¸¡åŠKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆœÚYX˜\‹]ÙÙÛK[X™[ˆKÚYX˜\ÛÛ\ÙYÈ¶*6)ö,¶«ö-6*ˆ6ava¶bˆˆ¶avã6a¶ã6av)öã6,ˆ6ava¶bŠJKˆ™XXİ˜Ü™X]Q[[Y[
›˜]ˆ‹È™YˆY[S˜]”™Y‹Yˆœ[™[[˜]šYØ][Ûˆ‹Û\ÜÓ˜[YNˆ›˜]ˆ‹˜\šXK[X™[ˆ—LŒÍWLWLŒ‘LŒ×LŒHLWLŒ‘—LĞ×LŒÌWLĞ×LŒH‹İ[NˆÈ›^ˆHHKˆY[TÙXİ[ÛœË›X\

İ]KÜ×JHOˆÂˆÛÛœİÜ[ˆHH[Y[T]Y\HH[Ü[”ÙXİ[ÛœÖİ]WNÂˆ™]\›ˆ
™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÙ^Nˆ]KÛ\ÜÓ˜[YNˆ›˜]œÙXÈˆ
È
Ü[ˆÈˆÜ[ˆˆˆˆŠHKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ›˜]œÙXËZXY‹ÛÛXÚÎˆ

HOˆÙ]Ü[”ÙXİ[ÛœÊİ\ˆOˆİ\–İ]WHÈßHˆÈİ]WNˆYHJK˜\šXKY^[™YˆÜ[ˆKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹[]JKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆ›˜]œÙXË[Y]HˆKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆ›˜]œÙXËXÛİ[ˆK˜JÜË›[™İ
JKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆ›˜]‹XÚ]œ›ÛˆˆK—LŒÎHŠJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ›˜]œÙXËX›ÙH‹˜\šXKZY[ˆˆ[Ü[‹İ[NˆÈX^ZYÚˆÜ[ˆÈ	ÚÜË›[™İ
ˆŒ\ˆ	Ì	ËÜXÚ]NˆÜ[ˆÈHˆHKÜË›X\
ÈOˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÙ^NˆËX’[™^ˆÜ[ˆÈˆLK]Nˆ’QUÔÖÚ×K˜\šXKXİ\œ™[ˆšÈOOHÈÈœYÙHˆˆ[™Yš[™YÛ\ÜÓ˜[YNˆ›˜]š][Hˆ
È
šÈOOHÈÈ›ÛˆˆˆˆŠKÛÛXÚÎˆ

HOˆÛÜÙSÛ”XÚÊÊHKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆšXÈˆKN
QS•WÒPÓÓ”ÖÚ×JJKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆ›˜]›X™[ˆK’QUÔÖÚ×K
JJJJJNÂˆJKˆY[T]Y\H	‰ˆX]Ú[™ÓY[PÛİ[OOH	‰ˆ™XXİ˜Ü™X]Q[[Y[
œ‹ÈÛ\ÜÓ˜[YNˆ›Y[KY[\H‹›ÛNˆœİ]\ÈˆK—LŒÍWLWLŒ‘L×LŒ×LŒ×LĞÈLÑWLĞ×LŒ‘—LŒÈL—LŒÍLŒ‘‹ˆLŒÎWLŒLŒ×LŒÌWLŒHLŒ‘—LĞ×LQ—LŒÌWLĞÈLŒ×LŒÌ×LŒWLŒ×LLNWL—LĞ×LŒ‘‹ˆŠKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹ÈÛ\ÜÓ˜[YNˆ›˜]š][HÙÛİ]Z][H‹ÛÛXÚÎˆ\Ş[˜È

HOˆÈHÂˆ]ØZ]ØÛX\•ÙX”Ù\ÜÚ[ÛŠ
NÂˆÙ]YJ[
NÂˆBˆØ]Ú
JHÂˆ[\
K›Y\ÜØYÙJNÂˆHHKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆšXÈˆKN
	ÛÙÛİ]YÛÜ‰ÊJKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹ÈÛ\ÜÓ˜[YNˆ›˜]›X™[ˆK—LŒ‘WLŒÌWLLŒÈŠJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ˜\X˜\ˆˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹[—LŒLŒÌWL—LŒ×LWL×LŒ×L—LLĞ×LŒÌ×LĞÈLLŒÌWLŒ×L×LŒ×LŒ×L—LŒ‘—LŒ×LŒÌ—LĞÈLŒÍLŒ‘—LÈLŒWLLŒÌ×LŒÍÈLŒÍLŒÌWLNWLŒHLWLŒLĞ×LˆLŒÍLŒ×LŒHLWLŒÍL×LŒ‘ˆ
LŒ‘WLŒÌWLŒ‘—LŒ×LŒ‘ˆL‘ŒWL‘L‘ŒL‘JHŠKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹Èİ[NˆÈX\™Ú[•ÜˆÜXÚ]NˆHHKˆ—L—LŒÌ×LŒ‘WL×LMLŒÌ×LŒ×LĞ×LŒH‹ˆ
Ú[™İË—×ÚX[	‰ˆÚ[™İË—×ÚX[œÚ]Wİ™\œÚ[ÛŠHÈ˜JÚ[™İË—×ÚX[œÚ]Wİ™\œÚ[ÛŠHˆ¸ %‹ˆˆLÈ‹ˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹Èİ[NˆÈÛÛÜˆ
Ú[™İË—×ÚX[ÈˆÌM˜L˜HˆˆˆÙLÍÙHŠHHKÚ[™İË—×ÚX[È¶av*¶-va6*6aÈ6,ö,vb6,Hˆˆ¶`¶-ö.HŠJJJKˆ™XXİ˜Ü™X]Q[[Y[
›XZ[ˆ‹ÈÛ\ÜÓ˜[YNˆ›XZ[ˆˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆÜˆKˆ™XXİ˜Ü™X]Q[[Y[
˜]Ûˆ‹È™YˆY[P]Û”™Y‹Û\ÜÓ˜[YNˆ˜\™Ù\ˆ‹˜\šXK[X™[ˆ˜]Ù\ˆÈ¶*6,ö*¶aˆ6ava¶b6ã6-v`v+v)ö*ˆˆˆ¶*6)ö,ˆ6ªv,v+öaˆ6ava¶b6ã6-v`v+v)ö*ˆ‹˜\šXKY^[™Yˆ˜]Ù\‹ÛÛXÚÎˆ

HOˆÈÙ]ÚYX˜\ÛÛ\ÙY
˜[ÙJNÈÙ]˜]Ù\ŠOˆY
NÈHK—LŒÌŠKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœYÙKZXY[™ÈˆKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆœYÙKXœ™XYÜ[XˆˆKˆ—LÑWL—LLWLŒ‘—LĞ×LŒÌWLĞ×LŒH‹ˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹È˜\šXKZY[ˆˆYHˆK‹ÈŠKˆˆ‹ˆ
İ\œ™[ÙXİ[ÛˆOOH[İ\œ™[ÙXİ[ÛˆOOH›ÚYÈ›ÚYˆİ\œ™[ÙXİ[Û–ÌJH¶+¶-öã6)ö,HŠKˆ™XXİ˜Ü™X]Q[[Y[
šˆ‹[’QUÔÖİš×K
JKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆÚÈˆKˆ™XXİ˜Ü™X]Q[[Y[
œÜ[ˆ‹[ˆYK›˜[YKˆˆLŒM‹ˆYKœ›ÛKˆYKœ˜[š×Üİ\œÈÈˆ0­Èˆ
È¸¦!H‹œ™\X]
X]›X^
X]›Z[ŠK
ÛYKœ˜[š×Üİ\œÊJJHˆˆŠKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈÛ\ÜÓ˜[YNˆ˜]ˆˆKˆ™XXİ˜Ü™X]Q[[Y[
]][XØ]Y]˜]\‹È\›ˆYKœİË˜[YNˆYK›˜[YHJJJJKˆ™XXİ˜Ü™X]Q[[Y[
™]ˆ‹ÈYˆœ[™[XÛÛ[‹Û\ÜÓ˜[YNˆœYÙKXÛÛ[‹™]K\YÙHˆšËX’[™^ˆLHKˆ™XXİ˜Ü™X]Q[[Y[
šY]ËÈØ[“˜]šYØ]NˆØ[ˆJJJJJNÂŸB˜ÛÛœİS‘SĞ•RSÕ‘T”ÒSÓˆHŒKKŒŒHÂ‹Êˆ6+¶-öã6)ö,Nˆ6*¶-¶avã6aˆ6avã8 #6ªva¶+È6*6.v+È6)ö,ˆ6aö,H6*6)ö,H6)öa¶*¶-6)ö,H6a¶,ö+¶aöe6+6+öã6+ö#6ªv)ö,v*6,H6*6)È6)öb6a6ã6aˆ6*6)ö,H6*6)ö,ˆ6ªv,v+öa‹öb6,vb6+È6*6aÈ6o¶a¶a6#ˆ6a¶,ö+¶aöe6*¶)ö,¶aöe6`v)öã6a8 #6aö)È
6a¶aÈ6a¶,ö+¶aöe6ªv-8 #6-6+öaöe6`¶+öã6avã6av,vb6,v«ö,JH6,v)È6*6*6ã6a¶+È8 %6*6+öb6aˆ6)öã6a¸ #6ªvaÈ6av+6*6b6,H6-6b6+È6+öb6*6)ö,vaÈ6b6)ö,v+È6-6b6+ö#ˆ6¡¶b6aˆ6)öã6aˆ6*6,v,v,öã6aöavã6-6aÈ6o¶ã6-6)ö,ˆ6a¶av)öã6-6-v`v+vaöe6b6,vb6+È6)öa¶+6)öaH6avã8 #6-6b6+Ëˆ
‹Â˜\Ş[˜È[˜İ[ÛˆÚ[œİ\™Qœ™\ÚZ[

HÂˆHÂˆYˆ
JÚ[™İË—×ÚX[	‰ˆÚ[™İË—×ÚX[œÚ]Wİ™\œÚ[ÛŠJBˆ™]\›ÂˆÛÛœİÙ\™\•ˆHİš[™ÊÚ[™İË—×ÚX[œÚ]Wİ™\œÚ[ÛŠNÂˆYˆ
Ù\™\•ˆOOHS‘SĞ•RSÕ‘T”ÒSÓŠBˆ™]\›ÂˆYˆ
Ù\ÜÚ[Û”İÜ˜YÙK™Ù]][J	ÚÚÜ™[ØYYÙ›Ü—ÉÈ
ÈÙ\™\•ŠHOOH	ÌIÊBˆ™]\›ÈËÈ6)ö,ˆ6+va6`¶aöe6,v`v,v-6*6ã8 #6o¶)öã6)öaˆ6+6a6b6«öã6,vã6avã8 #6ªva¶+ÂˆÙ\ÜÚ[Û”İÜ˜YÙKœÙ]][J	ÚÚÜ™[ØYYÙ›Ü—ÉÈ
ÈÙ\™\•‹	ÌIÊNÂˆYˆ
Ú[™İË˜ØXÚ\ÊHÂˆHÂˆÛÛœİ˜[Y\ÈH]ØZ]ØXÚ\ËšÙ^\Ê
NÂˆ]ØZ]›ÛZ\ÙK˜[
˜[Y\Ë›X\
ˆOˆØXÚ\Ë™[]JŠJJNÂˆBˆØ]Ú
JHÈBˆBˆØØ][Û‹š™YˆHØØ][Û‹œ]˜[YH
È	Ï×İIÈ
È[˜ÛÙUT’PÛÛ\Û™[
Ù\™\•ŠH
È	É—İIÈ
È]K››İÊ
NÂˆBˆØ]Ú
JHÈBŸB˜\Ş[˜È[˜İ[ÛˆÚ›Ü˜ÙQœ™\Ú™[ØYY\“ÙÚ[Š
HÂˆHÂˆYˆ
Ú[™İË˜ØXÚ\ÊHÂˆÛÛœİ˜[Y\ÈH]ØZ]ØXÚ\ËšÙ^\Ê
NÂˆ]ØZ]›ÛZ\ÙK˜[
˜[Y\Ë›X\
ˆOˆØXÚ\Ë™[]JŠJJNÂˆBˆBˆØ]Ú
JHÈBŸBŠ\Ş[˜È

HOˆÂˆÛÛœİÚÈH]ØZ]ÚXÚĞÛÛ›™Xİ[ÛŠ
NÂˆÛÛœİ›ÛİHØİ[Y[™Ù][[Y[RY
œ›ÛİŠNÂˆYˆ
[ÚÊHÂˆÛÛœİØY\ˆHØİ[Y[™Ù][[Y[RY
šÚZ[š]X[[ØY\ˆŠNÂˆYˆ
ØY\ŠBˆØY\‹˜Û\ÜÓ\İ˜Y
šÚ[ØY\‹ZYHŠNÂˆ›Ûİš[›™\’SH	Ï]ˆİ[OH›Z[‹ZZYÚŒLšÙ\Ü^N™ÜšYÜXÙKZ][\Î˜Ù[\İ^X[YÛ˜Ù[\ÜY[™ÎŒÙ›ÛY˜[Z[N•˜^š\›X]ˆ]ˆİ[OH˜ÛÛÜˆÙLŒØM¶)ö*¶-v)öa6*6aÈ6,ö,vb6,H6*6,v`¶,v)ö,H6a¶-6+ÏÚİ[OH˜ÛÛÜˆÍ˜ÎLÛX^]ÚYŒÛ[™KZZYÚŒˆ¶)öã6aˆ6o¶a¶a6*6)öã6+È6)ö,ˆ6(¶+ö,v,È6,ö,vb6,H6*6)ö,ˆ6-6b6+È
6av*öaÎ‹ËØ\[İ\ÙYš\İ\‹š\‹ÊKˆ6a6-ö`v)öbÈ6(¶+ö,v,È‹Ø\KÚX[Øˆ6,v)È6*6,v,v,öã6ªva¶ã6+È6b6av-öav)¶aˆ6-6b6ã6+È6a¶-v*6ªv)öava6-6+öaÈ6)ö,ö*‹ÜÙ]Ù]‰ÎÂˆ™]\›ÂˆBˆ]ØZ]Ú[œİ\™Qœ™\ÚZ[

NÂˆÛÛœÛÛK›ÙÊ”S‘S•RSˆKKŒMÈ
ZK\™[XZ[š[™Ë\YÙ\Ë\Û\Ú
HŠNÂˆ™XXİÓK˜Ü™X]T›Ûİ
›Ûİ
Kœ™[™\Š™XXİ˜Ü™X]Q[[Y[
\[
JNÂˆ™\]Y\İ[š[X][Û‘œ˜[YJ

HOˆ™\]Y\İ[š[X][Û‘œ˜[YJ

HOˆÈÛÛœİØY\ˆHØİ[Y[™Ù][[Y[RY
šÚZ[š]X[[ØY\ˆŠNÈYˆ
ØY\ŠBˆØY\‹˜Û\ÜÓ\İ˜Y
šÚ[ØY\‹ZYHŠNÈJJNÂŸJJ
NÂ‹ËÈTÖKTÖSÎˆÛÛ\Z[ÈØ[›ÛšXØ[[Ù[HŒB