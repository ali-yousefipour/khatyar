'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const parser = require('@babel/parser');

const root = path.resolve(__dirname, '..');
function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}
function assertAll(source, clauses, label) {
  for (const value of clauses) {
    assert.ok(source.includes(value), `${label}: missing ${value}`);
  }
}
for (const relative of [
  'src/screens/InboxScreen.js',
  'src/screens/ReportsScreen.js',
  'src/components/ReportPersonPickerModal.js',
]) {
  const source = read(relative);
  const parsed = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
  assert.ok(parsed.program.body.length > 0, relative + ': empty AST');
  console.log('PASS JSX parse:', relative);
}
const inbox = read('src/screens/InboxScreen.js');
const sent = read('src/screens/ReportsScreen.js');
assertAll(inbox, [
  "visibleIds.every",
  "runBulk('archive')",
  "runBulk('delete')",
  "openBulkForward",
  "restoreArchive",
  "actionOnly",
  "priorityFilter",
  "groupBy",
  "current_owner_name",
], 'Inbox');
assertAll(sent, [
  "khatyar:report-draft:v1:",
  "AsyncStorage.setItem",
  "AsyncStorage.removeItem",
  "draftReady",
  "sentPriorityFilter",
  "sentStatusFilter",
  "sentSort",
  "orderedSent.map",
  "current_owner_name",
], 'Sent/new report');
console.log('PASS report UX source contracts');
