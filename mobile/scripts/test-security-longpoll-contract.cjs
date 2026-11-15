'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const auth=read('mobile/src/auth.js');
const guard=read('mobile/src/SecurityGuard.js');
const vpn=read('mobile/src/vpnMonitor.js');
const telemetry=read('mobile/src/telemetry.js');
const gps=read('mobile/src/gpsWorkWatchdog.js');
const internet=read('mobile/src/internetWorkWatchdog.js');
const perm=read('mobile/src/PermissionGuard.js');
const server=read('php/app/radio-api-v2.php');
const routes=read('php/lib/routes.php');
const radio=read('mobile/src/radio/RadioContext.js');
assert.match(guard,/SECURITY_START_DELAY_MS = 60000/);
assert.match(guard,/Date\.now\(\) < checkEnabledAt\.current/);
assert.match(guard,/AppState\.currentState!=='active'/);
assert.doesNotMatch(auth,/await securitySignals\(\)/);
assert.match(auth,/initialDelayMs:60000/);
assert.match(vpn,/Math\.max\(60000, Number\(initialDelayMs/);
assert.match(vpn,/clearTimeout\(startupTimer\)/);
assert.match(telemetry,/if\(!opts\.securityExempt\)/);
assert.match(gps,/if\(isSecurityExempt\(\)\)return/);
assert.match(internet,/if\(isSecurityExempt\(\)\)return/);
assert.match(routes,/function _field_alert_targets\(\$settingKey, \$userId\) \{[\s\S]{0,500}security_exempt/);
assert.match(perm,/CHECK_INTERVAL_MS=15000/);
assert.match(server,/function radio_wait_for_change/);
assert.match(server,/min\(3500/);
assert.match(server,/\$i<6;\$i\+\+/);
assert.match(server,/LOCK_EX\|LOCK_NB/);
assert.match(server,/usleep\(700000\)/);
assert.match(server,/'long_poll'=>\$held/);
assert.match(radio,/wait_ms=3500/);
for(const filename of [
  'mobile/plugins/khatyar-radio-native/KhatyarRadioService.java',
  'mobile/android/app/src/main/java/ir/mashhad/taxicontrol/radio/KhatyarRadioService.java'
]){
  const source=read(filename);
  assert.match(source,/if \(isAppInForeground\(\)\) return;/);
  assert.match(source,/endpoint\+="&wait_ms=3500"/);
  assert.match(source,/setReadTimeout\(12000\)/);
}
console.log('PASS delayed VPN/developer probes, exempt GPS protection, bounded radio long polling and lower CPU wakeups');
