'use strict';
// Prevent UI fixes from disappearing when deployment reconciles a rolling commit window.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/deploy-php.yml'), 'utf8');
const html = fs.readFileSync(path.join(root, 'php/app/panel.html'), 'utf8');
const mustReconcile = [
  'app/panel.html',
  'app/assets/panel.bundle.js',
  'app/assets/khatyar-emerald-system.css',
  'app/assets/panel-long-operation-progress.js',
  'app/assets/dashboard-no-charts.js',
  'app/assets/work-report-default-placement-ui.js',
  'app/assets/school-complaints-admin.js',
  'app/assets/school-complaints-admin.css'
];
const start = workflow.indexOf('for rel in app/index.php');
const end = workflow.indexOf('; do', start);
assert.ok(start >= 0 && end > start, 'locate forced production reconciliation loop');
const forced = new Set(workflow.slice(start, end).trim().split(/\\s+/));
for (const file of mustReconcile) {
  assert.ok(forced.has(file), file + ' must be shipped even beyond the rolling 10-commit range');
  assert.ok(fs.existsSync(path.join(root, 'php', file)), file + ' must exist in the deploy source');
}
for (const asset of [
  'assets/khatyar-emerald-system.css',
  'assets/panel-long-operation-progress.js',
  'assets/dashboard-no-charts.js',
  'assets/work-report-default-placement-ui.js'
]) {
  assert.ok(html.includes(asset + '?v='), asset + ' must be referenced with a cache-busting version');
}
assert.ok(workflow.includes('node tests/panel_visual_design_system_test.cjs'),
  'deployment gate must check design system before upload');
assert.ok(workflow.includes('node tests/panel_shared_modal_focus_test.cjs'),
  'deployment gate must check modal keyboard behavior before upload');
console.log('PASS panel shared UI assets, versioned entrypoints and deploy reconciliation');
