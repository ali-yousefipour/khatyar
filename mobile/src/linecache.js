import AsyncStorage from '@react-native-async-storage/async-storage';
import { request } from './api';
import { digitsOnly, buildTaxiPlate12 } from './ocr';
const KEY = 'search_cache_v1';
function todayKey() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
export async function refreshSearchCache(force = false) {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const cached = raw ? JSON.parse(raw) : null;
    if (!force && cached && cached.day === todayKey()) return cached.data;
    const data = await request('/my/search-cache');
    await AsyncStorage.setItem(KEY, JSON.stringify({ day: todayKey(), data }));
    return data;
  } catch (e) {
    try { const raw = await AsyncStorage.getItem(KEY); if (raw) return JSON.parse(raw).data; } catch (e2) {}
    return { drivers: [], lines: [] };
  }
}
export async function offlineSearch(q) {
  q = String(q || '').trim(); if (!q) return [];
  const qDigits = digitsOnly(q);
  const qPlate = qDigits.length >= 5 ? buildTaxiPlate12(qDigits.slice(0, 2), qDigits.slice(2, 5)) : null;
  let data;
  try { const raw = await AsyncStorage.getItem(KEY); data = raw ? JSON.parse(raw).data : null; } catch (e) { data = null; }
  if (!data || (!data.drivers && !data.vehicles)) return [];
  const norm = (s) => String(s || '');
  const dig = (s) => digitsOnly(s);
  const drivers = Array.isArray(data.drivers) ? data.drivers : [];
  const vehicles = Array.isArray(data.vehicles) ? data.vehicles : [];
  const foundDrivers = drivers.filter((d) => {
    const hay = norm(d.first_name) + ' ' + norm(d.last_name) + ' ' + norm(d.plate) + ' ' + norm(d.plate_normalized);
    return norm(d.national_id).indexOf(q) >= 0
      || (qDigits && dig(d.national_id).indexOf(qDigits) >= 0)
      || hay.indexOf(q) >= 0
      || (qPlate && hay.indexOf(qPlate) >= 0)
      || (qPlate && norm(d.plate_normalized).indexOf(qPlate) >= 0)
      || (qDigits && dig(d.plate).indexOf(qDigits.slice(0,5)) >= 0)
      || (qDigits && dig(d.plate_normalized).indexOf(qDigits.slice(0,5)) >= 0)
      || (qDigits && dig(d.plate).indexOf(qDigits) >= 0);
  });
  const foundVehicles = vehicles.filter((v) => {
    const hay = norm(v.plate) + ' ' + norm(v.plate_normalized) + ' ' + norm(v.model_name);
    return hay.indexOf(q) >= 0
      || (qPlate && hay.indexOf(qPlate) >= 0)
      || (qDigits && dig(v.plate).indexOf(qDigits.slice(0,5)) >= 0)
      || (qDigits && dig(v.plate_normalized).indexOf(qDigits.slice(0,5)) >= 0);
  }).map((v) => ({ ...v, offline_type: 'vehicle' }));
  return foundDrivers.concat(foundVehicles).slice(0, 50);
}
