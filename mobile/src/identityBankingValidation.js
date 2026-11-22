/**
 * Offline validation of Iranian identifiers. No network, dependencies or bigint.
 * A valid checksum does NOT establish identity, account ownership or activity.
 */
export const normalizeIranianDigits = value => String(value ?? '').trim().replace(/[۰-۹٠-٩]/g, ch => {
  const cp = ch.charCodeAt(0);
  return String(cp >= 0x6F0 && cp <= 0x6F9 ? cp - 0x6F0 : cp - 0x660);
});
const BANKS = Object.freeze({ '061':'بانک شهر', '012':'بانک ملت', '017':'بانک ملی ایران', '015':'بانک سپه',
  '019':'بانک صادرات ایران', '018':'بانک تجارت', '013':'بانک رفاه کارگران','016':'بانک کشاورزی',
  '014':'بانک مسکن', '054':'بانک پارسیان', '055':'بانک اقتصاد نوین','056':'بانک سامان',
  '057':'بانک پاسارگاد', '058':'بانک سرمایه', '059':'بانک سینا','060':'بانک قرض‌الحسنه مهر ایران',
  '062':'بانک آینده','063':'بانک انصار','064':'بانک گردشگری','065':'بانک حکمت ایرانیان',
  '066':'بانک دی','069':'بانک ایران زمین','070':'بانک رسالت',
  '020':'بانک توسعه صادرات','021':'پست بانک ایران','022':'بانک توسعه تعاون' });
const result=(field,valid,status,errors=[],warnings=[],extra={})=>({
  field,valid,status,errors,warnings,verificationLevel:'offline_structural',...extra
});
export function validateNationalId(raw) {
  const s=normalizeIranianDigits(raw);
  if(!s)return result('national_code',false,'missing_information',['کد ملی وارد نشده است.']);
  if(!/^[0-9]{10}$/.test(s))return result('national_code',false,'invalid',['کد ملی باید ۱۰ رقم باشد.']);
  if(/^(\d)\1{9}$/.test(s))return result('national_code',false,'invalid',['کد ملی واردشده از نظر رقم کنترل معتبر نیست.']);
  let sum=0;for(let i=0;i<9;i++)sum+=Number(s[i])*(10-i);
  const rem=sum%11,control=rem<2?rem:11-rem;
  return control===Number(s[9])
    ?result('national_code',true,'structurally_valid',[],['ساختار کد ملی معتبر است؛ هویت صاحب آن به‌صورت آفلاین قابل تأیید نیست.'])
    :result('national_code',false,'invalid',['کد ملی واردشده از نظر رقم کنترل معتبر نیست.']);
}
export function validateIban(raw,{expectedBank=null,allowWithoutPrefix=false}={}) {
  let s=normalizeIranianDigits(raw).replace(/[\s\u200c\u00a0-]/g,'').toUpperCase();
  if(!s)return result('iban',false,'missing_information',['شماره شبا وارد نشده است.']);
  if(allowWithoutPrefix && /^[0-9]{24}$/.test(s))s='IR'+s;
  if(!/^IR[0-9]{24}$/.test(s))return result('iban',false,'invalid',['شماره شبا باید با IR شروع شده و ۲۶ کاراکتر داشته باشد.']);
  const number=s.slice(4)+'1827'+s.slice(2,4);
  let mod=0;for(const d of number)mod=(mod*10+Number(d))%97;
  if(mod!==1)return result('iban',false,'invalid',['رقم کنترل شماره شبا معتبر نیست.']);
  const bankCode=s.slice(4,7),bankName=BANKS[bankCode]||null;
  const extra={bankCode,bankName,normalized:s};
  if(expectedBank && bankCode!==expectedBank)return result('iban',false,'mismatch',['کد بانک داخل شبا با بانک انتخاب‌شده مطابقت ندارد.'],[],extra);
  return result('iban',true,bankName?'structurally_valid':'offline_unverifiable',[],[
    ...(!bankName?['شناسه بانک در فهرست محلی موجود نیست؛ نیازمند بررسی دستی است.']:[]),
    'ساختار شبا معتبر است؛ مالکیت و فعال‌بودن حساب به‌صورت آفلاین تأیید نمی‌شود.'
  ],extra);
}
export function validateAccount(raw) {
  const s=normalizeIranianDigits(raw);
  if(!s)return result('account',false,'missing_information',['شماره حساب ثبت نشده است.']);
  if(!/^[0-9][0-9 .-]*[0-9]$/.test(s)&&!/^[0-9]$/.test(s))
    return result('account',false,'invalid',['شماره حساب شامل نویسه غیرمجاز است.']);
  return result('account',true,'offline_unverifiable',[],[
    'تبدیل و تطبیق شماره حساب داخلی با شبا بدون الگوریتم رسمی بانک قابل تأیید نیست.'
  ],{normalized:s.replace(/[ .-]/g,'')});
}

/**
 * Mirrors the PHP new/edited user policy. No network calls or plaintext logging.
 * knownUsers may be empty offline; server must re-check duplicates on sync.
 */
export function validateUserInput(input = {}, {knownUsers = [], editingId = null} = {}) {
  const checks = {}, errors = [], warnings = [];
  if (Object.prototype.hasOwnProperty.call(input, 'national_code')) {
    const national = validateNationalId(input.national_code);
    checks.national_code = national;
    if (!national.valid && national.status !== 'missing_information') errors.push(...national.errors);
    if (national.valid) {
      const digits = normalizeIranianDigits(input.national_code);
      if (knownUsers.some(person => (editingId === null || Number(person.id) !== Number(editingId)) &&
          normalizeIranianDigits(person.national_code ?? '') === digits)) {
        errors.push('این کد ملی قبلاً برای کاربر دیگری ثبت شده است.');
      }
    }
  }
  const bankCode = input.bank_code ?? null;
  if (bankCode !== null && !/^[0-9]{3}$/.test(String(bankCode))) {
    errors.push('شناسه بانک انتخاب‌شده نامعتبر است.');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'iban') && String(input.iban ?? '').trim()) {
    const iban = validateIban(input.iban, {
      expectedBank: typeof bankCode === 'string' && /^[0-9]{3}$/.test(bankCode) ? bankCode : null,
      allowWithoutPrefix: true
    });
    checks.iban = iban;
    if (!iban.valid && iban.status !== 'offline_unverifiable') errors.push(...iban.errors);
    warnings.push(...iban.warnings);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'account') && String(input.account ?? '').trim()) {
    const account = validateAccount(input.account);
    checks.account = account;
    if (!account.valid) errors.push(...account.errors);
    warnings.push(...account.warnings);
  }
  return {valid: errors.length === 0, status: errors.length ? 'invalid' :
    (warnings.length ? 'offline_unverifiable' : 'structurally_valid'),
    checks, errors: [...new Set(errors)], warnings: [...new Set(warnings)],
    verificationLevel:'offline_structural'};
}
