/* Dedicated complaint operator portal. Only scoped bearer credentials are used. */
(function(){
'use strict';
const R=window.React,DOM=window.ReactDOM;
if(!R||!DOM||!window.KhatyarSchoolComplaints){document.getElementById('sc-portal-root').textContent='بارگذاری ماژول شکایات انجام نشد؛ صفحه را بازآوری کنید.';return;}
const h=R.createElement;
const KEY='khatyar_school_complaints_operator_token';
async function request(method,path,body,token){
 const headers={'Accept':'application/json'};
 if(body!==undefined)headers['Content-Type']='application/json';
 if(token)headers['Authorization']='Bearer '+token;
 const resp=await fetch('/api'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),credentials:'omit',cache:'no-store'});
 let data;try{data=await resp.json();}catch(_){throw Error('پاسخ معتبر از سرور دریافت نشد');}
 if(!resp.ok)throw Error(data.error||'خطا در دریافت اطلاعات');
 return data;
}
function DatePicker({value,onChange}){
 const ref=R.useRef(null);
 const format=v=>v?new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-arabext',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'UTC'}).format(new Date(v+'T12:00:00Z')):'';
 R.useEffect(()=>{
  const node=ref.current;if(!node)return;
  const handler=()=>{const iso=node.dataset.khIsoDate;node.value=format(iso);onChange(iso);};
  node.addEventListener('change',handler);
  window.KhatyarSafeJalaliDate?.install(node);
  return()=>{node.removeEventListener('change',handler);};
 },[onChange]);
 R.useEffect(()=>{if(ref.current){ref.current.dataset.khIsoDate=value||'';ref.current.value=format(value);}},[value]);
 return h('input',{ref,type:'text',defaultValue:format(value),'data-kh-iso-date':value||'',readOnly:true,onKeyDown:e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.currentTarget.click();}},placeholder:'انتخاب تاریخ',className:'input',name:'received_date'});
}
function Portal(){
 const [token,setToken]=R.useState(()=>{try{return sessionStorage.getItem(KEY)||'';}catch(_){return '';}});
 const [me,setMe]=R.useState(null),[user,setUser]=R.useState(''),[password,setPassword]=R.useState(''),[busy,setBusy]=R.useState(false),[error,setError]=R.useState('');
 const logout=()=>{try{sessionStorage.removeItem(KEY);}catch(_){}setToken('');setMe(null);setPassword('');};
 R.useEffect(()=>{if(!token){setMe(null);return;}let active=true;request('GET','/school-complaints/portal/me',undefined,token).then(x=>{if(active)setMe(x);}).catch(()=>{if(active){logout();setError('نشست شما منقضی شده است؛ دوباره وارد شوید.');}});return()=>{active=false;};},[token]);
 const login=async e=>{e.preventDefault();if(busy)return;setBusy(true);setError('');try{const x=await request('POST','/school-complaints/portal/login',{username:user.trim(),password});sessionStorage.setItem(KEY,x.access);setToken(x.access);setPassword('');}catch(e){setError(e.message);}finally{setBusy(false);}};
 const get=(path)=>request('GET',path,undefined,token);
 const send=(method,path,body)=>request(method,path,body,token);
 const header=h('header',{className:'sc-portal-top'},h('div',{className:'sc-portal-brand'},h('img',{src:'/brand-khatyar.png',alt:'نشان خطیار'}),h('div',null,'خطیار | سامانه اختصاصی شکایات سرویس مدارس')),me&&h('div',null,me.name,' ',h('button',{type:'button',onClick:logout},'خروج از حساب')));
 if(!token||!me)return h(R.Fragment,null,header,h('main',{className:'sc-portal-main'},token?h('p',{role:'status'},'در حال بررسی نشست اختصاصی…'):h('form',{className:'sc-portal-login',onSubmit:login},h('h1',null,'ورود کاربر اختصاصی شکایات'),h('p',null,'این بخش مستقل از حساب‌های پرسنلی، مناطق و سلسله‌مراتب سازمانی است.'),h('label',{className:'sc-field'},'نام کاربری',h('input',{className:'input',autoComplete:'username',value:user,onChange:e=>setUser(e.target.value),required:true})),h('label',{className:'sc-field'},'رمز عبور',h('input',{className:'input',type:'password',autoComplete:'current-password',value:password,onChange:e=>setPassword(e.target.value),required:true})),error&&h('p',{className:'sc-portal-warning',role:'alert'},error),h('button',{className:'btn p',type:'submit',disabled:busy},busy?'در حال بررسی…':'ورود به شکایات'))));
 return h(R.Fragment,null,header,h('main',{className:'sc-portal-main'},h(window.KhatyarSchoolComplaints,{get,send,DatePicker})));
}
DOM.createRoot(document.getElementById('sc-portal-root')).render(h(Portal));
})();
