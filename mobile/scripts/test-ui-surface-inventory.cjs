'use strict';
// Static audit only: parse all real screen/component sources and report candidates.
// This does NOT certify runtime permissions, keyboard behavior or device rendering.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const parser = require('@babel/parser');
const src = path.resolve(__dirname, '../src');
const folders = ['screens', 'components'];
const files = folders.flatMap(folder =>
  fs.readdirSync(path.join(src, folder)).filter(file => /\.jsx?$/.test(file) &&
    fs.statSync(path.join(src, folder, file)).isFile()).map(file => folder + '/' + file)
);
const counts = {screens:0, components:0, modals:0, textInputs:0, buttons:0, accessibleLabels:0,
  modalBackMissing:[], modalTextInputCandidates:[], files:[]};

const nameOf = element => {
  if (!element) return '';
  if (element.type === 'JSXIdentifier') return element.name;
  if (element.type === 'JSXMemberExpression') return nameOf(element.object) + '.' + nameOf(element.property);
  return '';
};
function traverse(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const child of node) traverse(child, visit); return; }
  if (node.type) visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc' || key === 'start' || key === 'end' || key === 'extra' ||
        key === 'leadingComments' || key === 'innerComments' || key === 'trailingComments') continue;
    if (value && typeof value === 'object') traverse(value, visit);
  }
}
function hasAttr(node, name) {
  return (node?.openingElement?.attributes || []).some(a => a.type === 'JSXAttribute' && a.name?.name === name);
}

for (const relative of files) {
  const source = fs.readFileSync(path.join(src, relative), 'utf8');
  const ast = parser.parse(source, {sourceType:'unambiguous', plugins:['jsx']});
  let modals = 0, inputs = 0, buttons = 0, labels = 0;
  traverse(ast, node => {
    if (node.type !== 'JSXElement') return;
    const tag = nameOf(node.openingElement.name);
    if (tag === 'TextInput') inputs++;
    if (tag === 'TouchableOpacity' || tag === 'Pressable') buttons++;
    if (hasAttr(node, 'accessibilityLabel')) labels++;
    if (tag !== 'Modal') return;
    modals++;
    const entry = relative + ':' + node.loc.start.line;
    if (!hasAttr(node,'onRequestClose')) counts.modalBackMissing.push(entry);
    let hasInput = false, hasKeyboard = false;
    for (const child of node.children) traverse(child, sub => {
      if (sub.type !== 'JSXElement') return;
      const inner = nameOf(sub.openingElement.name);
      if (inner === 'TextInput') hasInput = true;
      if (inner === 'KeyboardAvoidingView' || inner === 'ModalKeyboardView') hasKeyboard = true;
    });
    if (hasInput && !hasKeyboard) counts.modalTextInputCandidates.push(entry);
  });
  counts[relative.split('/')[0]]++;
  counts.modals += modals;
  counts.textInputs += inputs;
  counts.buttons += buttons;
  counts.accessibleLabels += labels;
  counts.files.push({path:relative, modals, textInputs:inputs, buttons, labels});
}
assert.ok(counts.screens >= 64, 'All active and hidden screen source files must be included');
assert.ok(counts.components >= 22, 'All shared component source files must be included');
assert.ok(counts.modals >= 50, 'Unexpected modal inventory reduction: review renamed or removed modals');
console.log('STATIC UI INVENTORY (not a runtime pass):', JSON.stringify({
  screens:counts.screens, components:counts.components, modalTags:counts.modals,
  textInputTags:counts.textInputs, touchableTags:counts.buttons, a11yLabelProps:counts.accessibleLabels,
  modalsMissingBack:counts.modalBackMissing, modalKeyboardReviewCandidates:counts.modalTextInputCandidates,
}));
console.log('PASS static JSX parsing and complete file inventory; unresolved candidates are not marked fixed.');
