import { api } from './api';

export async function sendMobileErrorLog(error, extra = {}) {
  try {
    const body = {
      app_version: extra.app_version || '1.1.0',
      screen: extra.screen || '',
      message: String(error?.message || error || ''),
      stack: String(error?.stack || ''),
      extra
    };
    await api('/api/mobile/error-log', { method: 'POST', body: JSON.stringify(body) });
  } catch (_) {}
}

export function installGlobalDiagnostics() {
  if (global.__taxiDiagnosticsInstalled) return;
  global.__taxiDiagnosticsInstalled = true;
  const oldHandler = global.ErrorUtils && global.ErrorUtils.getGlobalHandler ? global.ErrorUtils.getGlobalHandler() : null;
  if (global.ErrorUtils && global.ErrorUtils.setGlobalHandler) {
    global.ErrorUtils.setGlobalHandler((error, isFatal) => {
      sendMobileErrorLog(error, { isFatal: !!isFatal, source: 'global-handler' });
      if (oldHandler) oldHandler(error, isFatal);
    });
  }
}
