const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../app/assets/school-service-admin.js'), 'utf8');
const start = source.indexOf('const ssvPlateLetters=');
const end = source.indexOf('css.textContent +=', start);
assert.ok(start >= 0 && end > start, 'Plate editor source must exist');
const context = vm.createContext({esc: text => String(text ?? '')});
vm.runInContext(source.slice(start, end), context);
const unauthorized = vm.runInContext("ssvPlateEditorHtml('uv')", context);
const ordinary = vm.runInContext("ssvPlateEditorHtml('f')", context);
assert.ok(unauthorized.includes('<option value="ت"'), 'Unauthorized registration must offer ت');
assert.ok(!ordinary.includes('<option value="ت"'), 'Ordinary inspection options remain unchanged');
assert.ok(vm.runInContext("ssvPlateEditorHtml('uv',{plate_letter:'ت'})", context).includes('ssv-plate-yellow'), 'Selected ت needs yellow preview');
assert.ok(source.includes("letter.addEventListener('change',updateColor)"), 'Preview must update immediately when the letter changes');
assert.ok(source.includes("letter==='ت'?' ssv-plate-yellow'"), 'Saved yellow plates must render yellow in lists');
console.log('PASS school unauthorized plate: letter ت, yellow preview, existing plate styling');
