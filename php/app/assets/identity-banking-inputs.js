/* Offline inline feedback for identity fields in React admin forms. No external requests. */
(() => {
  'use strict';
  const digits=value=>String(value??'').trim().replace(/[۰-۹٠-٩]/g,ch=>{
    const n=ch.charCodeAt(0);return String(n>=1776?n-1776:n-1632);
  });
  const idValid=value=>{
    const s=digits(value);if(!/^[0-9]{10}$/.test(s)||/^(\d)\1{9}$/.test(s))return false;
    let sum=0;for(let i=0;i<9;i++)sum+=Number(s[i])*(10-i);
    const r=sum%11;return Number(s[9])===(r<2?r:11-r);
  };
  const ibanValid=value=>{
    let s=digits(value).replace(/[\s\u200c\u00a0-]/g,'').toUpperCase();
    if(/^[0-9]{24}$/.test(s))s='IR'+s;
    if(!/^IR[0-9]{24}$/.test(s))return {valid:false};
    const raw=s.slice(4)+'1827'+s.slice(2,4);
    let m=0;for(const c of raw)m=(m*10+Number(c))%97;
    return {valid:m===1,bank:s.slice(4,7)};
  };
  const fieldKind=input=>{
    if(!(input instanceof HTMLInputElement)||input.type==='search'||input.type==='hidden')return null;
    const label=input.parentElement?.querySelector(':scope > label');
    const text=(label?.textContent||'').trim().replace(/\s+/g,' ');
    if(text==='کد ملی')return 'national';
    if(/شماره\s*شبا|^شبا$/.test(text))return 'iban';
    if(/شماره\s*حساب/.test(text))return 'account';
    return null;
  };
  document.addEventListener('focusout',event=>{
    const input=event.target,kind=fieldKind(input);if(!kind)return;
    const field=input.parentElement;
    field.querySelectorAll(':scope > .kh-offline-validation-note').forEach(n=>n.remove());
    const value=String(input.value||'').trim();
    if(!value)return;
    let valid=false,message='';
    if(kind==='national'){
      valid=idValid(value);
      message=valid?'✓ کد ملی از نظر رقم کنترل معتبر است؛ هویت تأیید نشده است.':'کد ملی باید ۱۰ رقم و دارای رقم کنترل معتبر باشد.';
    }else if(kind==='iban'){
      const result=ibanValid(value);valid=result.valid;
      message=valid?'✓ ساختار شبا معتبر است'+(result.bank==='061'?' (بانک شهر)':'')+'؛ مالکیت تأیید نشده است.':'شماره شبا یا رقم کنترل آن معتبر نیست.';
    }else{
      valid=/^[0-9][0-9 .-]*[0-9]$/.test(digits(value))||/^[0-9]$/.test(digits(value));
      message=valid?'شماره حساب از نظر نویسه‌ها قابل پذیرش است؛ صحت حساب نیازمند استعلام بانکی است.':'شماره حساب شامل نویسه غیرمجاز است.';
    }
    const note=document.createElement('div');
    note.className='kh-offline-validation-note';
    note.setAttribute('role','status');note.setAttribute('aria-live','polite');
    note.style.cssText='font:12px Vazirmatn,Tahoma,sans-serif;line-height:1.9;text-align:right;color:'+(valid?'#116b49':'#b42318')+';margin-top:4px';
    note.textContent=message;field.appendChild(note);
  },true);
})();
