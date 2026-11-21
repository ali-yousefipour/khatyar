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
  'src/components/ReportTextModal.js',
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
// Regression: all inbox, forwarded, CC and archived tabs share the collapsed-by-default filter.
assertAll(inbox, [
  "const [advancedOpen, setAdvancedOpen] = useState(false)",
  "accessibilityState={{expanded:advancedOpen}}",
  "advancedOpen && <View style={s.filterContent}>",
  "setAdvancedOpen(false)",
  "setSenderPickerOpen(false)",
  "پاک‌سازی فیلترها",
  "اعمال فیلترها",
  "senderFilterQuery",
], 'Inbox advanced filters');
assertAll(sent, [
  "const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false)",
  "const [subjectSearch, setSubjectSearch] = useState('')",
  "subjectDropdownOpen && <View style={s.subjectDropdown}>",
  "جستجوی لحظه‌ای موضوع",
  "subjectMode==='other'",
  "افزودن تصویر",
  "const [sentFiltersOpen, setSentFiltersOpen] = useState(false)",
], 'Send report and sent report UX');
assert.ok(!sent.includes('pickPdf'), 'PDF picker must be absent from new report form');
assert.ok(!sent.includes('افزودن PDF'), 'PDF attachment action must be absent');
assert.ok(!sent.includes("expo-document-picker"), 'PDF picker dependency import must be absent');
assert.ok(!sent.includes("application/pdf;base64"), 'No PDF attachment encoding in send report');
const reportTextModal = read('src/components/ReportTextModal.js');
assertAll(reportTextModal, [
  '<ModalKeyboardView style={s.backdrop}>',
  'maxHeight:\'90%\'',
  'keyboardShouldPersistTaps="handled"',
  'onRequestClose={busy ? () => {} : onClose}',
  'accessibilityState={{ disabled:busy, busy }}',
  'allowFontScaling',
], 'Report text modal: Android keyboard, scroll, loading, font scaling');
console.log('PASS report UX source contracts');
