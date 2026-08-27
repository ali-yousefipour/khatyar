import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { request } from './api';

const QUEUE_KEY = 'vpn_monitor_queue_v2';
const STATE_KEY = 'vpn_monitor_state_v2';
const MAX_QUEUE = 100;
const REQUIRED_CONFIRMATIONS = 2;
let timer = null;
let running = false;
let inFlight = false;

function nativeModule() {
  try {
    const m = require('../modules/security-check').default || require('../modules/security-check');
    return m || null;
  } catch (_) { return null; }
}

async function fetchText(url, timeoutMs = 4500) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json,text/plain' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally { clearTimeout(t); }
}

let ipCache = { at: 0, value: { publicIp: null, country: null } };
async function publicIpInfo() {
  const now = Date.now();
  if (now - ipCache.at < 120000) return ipCache.value;
  const providers = [
    async () => { const x = JSON.parse(await fetchText('https://api.country.is/')); return { publicIp: x.ip || null, country: (x.country || '').toUpperCase() || null }; },
    async () => { const x = JSON.parse(await fetchText('https://ipwho.is/?fields=success,ip,country_code')); return x.success === false ? null : { publicIp: x.ip || null, country: (x.country_code || '').toUpperCase() || null }; },
    async () => ({ publicIp: (await fetchText('https://api.ipify.org')).trim() || null, country: null }),
  ];
  for (const provider of providers) {
    try {
      const v = await provider();
      if (v && v.publicIp) { ipCache = { at: now, value: v }; return v; }
    } catch (_) {}
  }
  return ipCache.value;
}

export async function collectVpnSnapshot() {
  let native = {};
  try {
    const m = nativeModule();
    if (m && typeof m.getVpnNetworkInfoAsync === 'function') native = await m.getVpnNetworkInfoAsync();
  } catch (_) {}

  let expoVpn = false;
  let expoType = 'unknown';
  try {
    const st = await Network.getNetworkStateAsync();
    expoType = String(st?.type || 'unknown').toLowerCase();
    expoVpn = st?.type === Network.NetworkStateType.VPN || expoType === 'vpn';
  } catch (_) {}

  const tunnelInterfaces = Array.isArray(native?.tunnelInterfaces) ? native.tunnelInterfaces : [];
  const activeTunnelInterfaces = Array.isArray(native?.activeTunnelInterfaces) ? native.activeTunnelInterfaces : [];
  const transportVpn = native?.transportVpn === true;
  const signalCount = [transportVpn, expoVpn, activeTunnelInterfaces.length > 0].filter(Boolean).length;
  // A stale/virtual interface alone is never enough. A candidate needs either
  // OS transport + another signal, or two consecutive confirmations.
  const rawCandidate = signalCount >= 2 || (transportVpn && activeTunnelInterfaces.length > 0);
  const ip = await publicIpInfo().catch(() => ({ publicIp: null, country: null }));

  return {
    vpn_candidate: rawCandidate,
    vpn_on: false,
    signal_count: signalCount,
    detected_by: [transportVpn ? 'android_transport' : null, expoVpn ? 'expo_network' : null, activeTunnelInterfaces.length ? 'active_tunnel_interface' : null].filter(Boolean),
    tunnel_interfaces: tunnelInterfaces,
    active_tunnel_interfaces: activeTunnelInterfaces,
    interfaces: Array.isArray(native?.interfaces) ? native.interfaces : [],
    dns_servers: Array.isArray(native?.dnsServers) ? native.dnsServers : [],
    network_type: native?.networkType || expoType || 'unknown',
    public_ip: ip.publicIp || null,
    ip_country: ip.country || null,
    sdk_int: native?.sdkInt || null,
    checked_at: new Date().toISOString(),
  };
}

async function enqueue(payload) {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const q = raw ? JSON.parse(raw) : [];
    q.push(payload);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-MAX_QUEUE)));
  } catch (_) {}
}

async function send(payload) {
  try {
    await request('/activity/vpn-status', { method: 'POST', body: payload });
    return true;
  } catch (_) { await enqueue(payload); return false; }
}

export async function flushVpnQueue() {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const q = raw ? JSON.parse(raw) : [];
    if (!q.length) return;
    const remain = [];
    for (const item of q) {
      try { await request('/activity/vpn-status', { method: 'POST', body: item }); }
      catch (_) { remain.push(item); }
    }
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remain));
  } catch (_) {}
}

export async function checkVpnNow({ force = false } = {}) {
  if (inFlight) return null;
  inFlight = true;
  try {
    const snapshot = await collectVpnSnapshot();
    let previous = null;
    try { const raw = await AsyncStorage.getItem(STATE_KEY); previous = raw ? JSON.parse(raw) : null; } catch (_) {}
    const positiveCount = snapshot.vpn_candidate ? Math.min(REQUIRED_CONFIRMATIONS, Number(previous?.positive_count || 0) + 1) : 0;
    const negativeCount = !snapshot.vpn_candidate ? Math.min(REQUIRED_CONFIRMATIONS, Number(previous?.negative_count || 0) + 1) : 0;
    const previousConfirmed = !!previous?.vpn_on;
    let confirmed = previousConfirmed;
    if (positiveCount >= REQUIRED_CONFIRMATIONS) confirmed = true;
    if (negativeCount >= REQUIRED_CONFIRMATIONS) confirmed = false;
    snapshot.vpn_on = confirmed;
    snapshot.confirmation_count = confirmed ? positiveCount : negativeCount;

    const changed = !previous || previousConfirmed !== confirmed;
    const lastSentAt = Number(previous?.last_sent_at || 0);
    const heartbeatDue = Date.now() - lastSentAt >= 5 * 60 * 1000;
    const state = { ...snapshot, positive_count: positiveCount, negative_count: negativeCount };
    if (force || changed || heartbeatDue) {
      const payload = { ...state, event: changed ? (confirmed ? 'vpn_on' : 'vpn_off') : 'vpn_heartbeat' };
      const ok = await send(payload);
      await AsyncStorage.setItem(STATE_KEY, JSON.stringify({ ...state, last_sent_at: ok ? Date.now() : lastSentAt }));
    } else {
      await AsyncStorage.setItem(STATE_KEY, JSON.stringify({ ...previous, ...state }));
    }
    return state;
  } finally { inFlight = false; }
}

export function startVpnMonitor({ intervalSeconds = 60 } = {}) {
  if (running) return;
  running = true;
  const ms = Math.max(30000, Number(intervalSeconds || 60) * 1000);
  setTimeout(() => { flushVpnQueue(); checkVpnNow({ force: true }); }, 2500);
  timer = setInterval(() => checkVpnNow(), ms);
}

export function stopVpnMonitor() {
  running = false;
  if (timer) { clearInterval(timer); timer = null; }
}
