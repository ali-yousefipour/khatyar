const fs = require('fs');
const assert = require('assert');
const path = require('path');

const root = path.resolve(__dirname, '..', 'src');
const details = fs.readFileSync(path.join(root, 'screens', 'CompanyPayrollHistory.js'), 'utf8');
const slip = fs.readFileSync(path.join(root, 'components', 'PayrollAccessSlip.js'), 'utf8');

const moneyFields = [
  'friday_amount', 'holiday_amount', 'overtime_amount', 'gross',
  'insurance', 'tax', 'net', 'bonus', 'severance', 'employer_insurance',
];
for (const field of moneyFields) {
  assert(details.includes("'"+field+"'"), 'Missing whole-money detail field: '+field);
}
assert.match(details, /hiddenDetailFields = new Set\(\[[^\]]*'employer_total'[^\]]*'row'[^\]]*\]\)/,
  'Employer-only totals and row identifiers must not appear as payroll fields');
assert.match(details, /hiddenDetailFields\.has\(String\(field\)\.toLowerCase\(\)\)/,
  'Detail rows must filter hidden fields regardless of casing');
assert.match(details, /integerMoneyFields\.has\(field\)[\s\S]*?moneyText\(detail\.row\.data\?\.\[field\]\)/,
  'Money fields must use integer formatting in detail cells');
assert(slip.includes("isIntegerMoney(control) || String(control.Format || '') !== '@'"));
const aliases = ['friday_amount','holiday_amount','overtime_amount','gross','insurance','tax','net','bonus','severance','employer_insurance'];
for (const field of aliases) assert(slip.includes("'"+field+"'"), 'Missing payslip alias: '+field);

const display = value => {
  const normalized = String(value).trim()
    .replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))
    .replace(/[٠-٩]/g, c => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)))
    .replace(/٫/g, '.').replace(/[٬,\s]/g, '');
  return Math.round(Number(normalized)).toLocaleString('fa-IR', {
    maximumFractionDigits: 0, minimumFractionDigits: 0
  });
};
assert.strictEqual(display('۱۲۳۴۵٫۷۸'), '۱۲٬۳۴۶');
assert.strictEqual(display('1,234,567.49'), '۱٬۲۳۴٬۵۶۷');
assert.strictEqual(display('1,234,567.50'), '۱٬۲۳۴٬۵۶۸');
console.log('PASS payroll integer rendering and employer total hiding');
