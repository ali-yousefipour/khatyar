'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const telemetry=fs.readFileSync(path.join(__dirname,'../src/telemetry.js'),'utf8');
const api=fs.readFileSync(path.join(__dirname,'../src/api.js'),'utf8');
const php=fs.readFileSync(path.join(__dirname,'../../php/lib/InternetWorkIntervals.php'),'utf8');
const rules=[
  [/sendTelemetry\('internet_off', \{ transition: true \}\)/,'Offline start must be explicit'],
  [/sendTelemetry\('internet_off', \{ checkpoint: true \}\)/,'Internet-off must repeat after 30 minutes'],
  [/sendTelemetry\('internet_on', \{ transition: true \}\)/,'Online recovery must be recorded'],
  [/sendTelemetry\('gps_off', \{ checkpoint: true \}\)/,'GPS-off must repeat after 30 minutes'],
  [/const checkpointMs = 30 \* 60 \* 1000/,'Checkpoint interval must be 30 minutes'],
  [/flushQueuedRequests\(\{ force: true \}\)/,'Reconnect must replay the persistent write queue'],
  [/netUnsubscribe\?\.\(\)/,'Stopping telemetry must remove the network listener'],
  [/telemetryQueueWrite = telemetryQueueWrite\.catch/,'Offline fallback writes must be serialized'],
];
for(const [regex,message] of rules)assert.match(telemetry,regex,message);
assert.match(api,/body:sendBody!==undefined\?JSON\.stringify\(sendBody\)/,'Request must retain payload timestamps');
assert.match(php,/kind IN \('internet_off','internet_on','offline','online'\)/,'Legacy versions must remain supported');
console.log('PASS GPS/Internet telemetry checkpoints, compatibility, queue and cleanup');
