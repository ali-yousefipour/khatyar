const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/screens/CheckInScreen.js'), 'utf8');
const start = source.indexOf('  const liveTimer = (() => {');
const end = source.indexOf('  })();', start) + '  })();'.length;
function calculate(timerInfo, elapsed = 3600) {
  const context = vm.createContext({ open: { id: 1 }, timerInfo, elapsed });
  vm.runInContext(source.slice(start, end) + '\nresult=liveTimer;', context);
  return context.result;
}
assert.equal(calculate(null), null, 'pending server policy cannot invent automatic duty');
const unassigned = calculate({ phase: 'unassigned', expected_min: 0, ot_cap_min: 0 }, 14 * 3600);
for (const field of ['expected', 'cap', 'remaining', 'overtime', 'surplus']) assert.equal(unassigned[field], 0, field + ' stays zero without assignment');
assert.equal(unassigned.elapsedMin, 840, 'actual presence remains visible');
assert.equal(unassigned.phase, 'unassigned');
const duty = calculate({ phase: 'duty', expected_min: 480, ot_cap_min: 20 });
assert.equal(duty.remaining, 420); assert.equal(duty.phase, 'duty');
const disabledOvertime = calculate({ phase: 'surplus', expected_min: 480, ot_cap_min: 0 }, 9 * 3600);
assert.equal(disabledOvertime.cap, 0, 'configured zero cap never defaults to 27');
assert.equal(disabledOvertime.overtime, 0);
assert.equal(disabledOvertime.surplus, 60);
assert.ok(source.includes("liveTimer.phase === 'unassigned'"));
assert.ok(source.includes('برای شما شیفت فعالی تخصیص داده نشده است'));
console.log('PASS Android work timer: server assignment, zero duty/cap, actual elapsed time and unassigned message');
