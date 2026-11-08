const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const bundle = fs.readFileSync(path.join(__dirname, '../app/assets/panel.bundle.js'), 'utf8');
const start = bundle.indexOf('function WorkReviewReport()');
const end = bundle.indexOf('function AttendanceReport(', start);
assert.ok(start >= 0 && end > start, 'Work review component must be present');
const report = bundle.slice(start, end);
for (const name of ['work-review-filters', 'work-review-scroller', 'work-review-table', 'work-review-person']) {
  assert.ok(report.includes(name), `${name} missing from report UI`);
}
assert.ok(report.includes('overflow-x:auto'), 'Wide report must have a horizontal scrolling surface');
assert.ok(report.includes('white-space:nowrap'), 'Numeric cells must not split vertically');
assert.ok(report.includes('position:sticky;right:0'), 'Personnel names must remain visible during horizontal scrolling');
assert.ok(report.includes('role: "region"'), 'Report must expose the scrollable region');
console.log('PASS work review UI: column sizing, scrolling, frozen names and RTL layout');
