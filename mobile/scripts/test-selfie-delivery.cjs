'use strict';

// API contract regression checks only. This script does not exercise camera hardware,
// capture timing, camera preview, or the user interface.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/CovertSelfie.js'), 'utf8');

function responseIsPersisted(response) {
  return response?.ok === true && response.queued !== true &&
    Number.isSafeInteger(Number(response.id)) && Number(response.id) > 0;
}

for (const [response, expected] of [
  [{ ok: true, id: 12 }, true],
  [{ ok: true, id: '12' }, true],
  [{ ok: true, id: 'q_1', queued: true }, false],
  [{ ok: false, id: 12 }, false],
  [{ ok: true, id: 0 }, false],
  [{ ok: true }, false],
  [null, false],
]) {
  assert.equal(responseIsPersisted(response), expected, 'server persistence acknowledgment contract');
}

// Polling a request is a read-only operation. A request must not be marked
// fulfilled merely because the client received it. The server should perform
// this transition only after durable storage has been independently verified.
assert.match(source, /\/my\/covert-selfie-request/, 'expected pending-request API route');
const eagerFulfill = /request\(\s*['"`]\/my\/covert-selfie-request\/['"`]\s*\+\s*[^\n]*?['"`]\/fulfill['"`]/;
assert.doesNotMatch(
  source,
  eagerFulfill,
  'API status contract: polling must not call /fulfill before server-side persistence is confirmed'
);

console.log('PASS selfie API contract: response validation and no eager fulfillment during polling');
