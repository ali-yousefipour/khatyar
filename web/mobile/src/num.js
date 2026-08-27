const FA = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
export function faNum(input) {
  if (input === null || input === undefined) return '';
  return String(input).replace(/[0-9]/g, (d) => FA[+d]);
}
export function enNum(input) {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}
export default faNum;
