(()=>{'use strict';
// اصلاح نمایش تاریخ/ساعت و آمار ماهانهٔ قطعی سیستم نوبت‌دهی.
// دادهٔ ذخیره‌شده می‌تواند میلادی باشد؛ فقط لایهٔ نمایش پنل به تقویم شمسی تبدیل می‌شود.
const originalFetch=window.fetch;
const FA='۰۱۲۳۴۵۶۷۸۹';
function fa(v){return String(v==null?'':v).replace(/[0-9]/g,d=>FA.charAt(+d));}
function en(v){return String(v==null?'':v).replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));}
function stripThousands(v){return String(v==null?'':v).replace(/([0-9۰-۹٠-٩])[٬,](?=[0-9۰-۹٠-٩])/g,'$1');}
function jalaliParts(y,m,d){
  try{
    const parts=new Intl.DateTimeFormat('fa-IR-u-ca-persian',{year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(Date.UTC(y,m-1,d,12)));
    const out={};parts.forEach(p=>{if(p.type==='year'||p.type==='month'||p.type==='day')out[p.type]=en(p.value);});
    if(out.year&&out.month&&out.day)return out;
  }catch(_){ }
  return null;
}
function jalaliDate(y,m,d,withFa){
  const p=jalaliParts(y,m,d);if(!p)return null;
  const s=`${p.year.padStart(4,'0')}/${p.month.padStart(2,'0')}/${p.day.padStart(2,'0')}`;
  return withFa?fa(s):s;
}
function convertDateTime(v){
  const raw=stripThousands(en(v)).trim();
  const m=raw.match(/^(\d{4})[-\/]([0-9]{1,2})[-\/]([0-9]{1,2})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?$/);
  if(!m)return v;
  const j=jalaliDate(+m[1],+m[2],+m[3],true);return j?(j+(m[4]?' '+m[4]:'')):v;
}
function convertMonth(v){
  const raw=stripThousands(en(v)).trim();
  const m=raw.match(/^(\d{4})[-\/]([0-9]{1,2})$/);if(!m)return v;
  const j=jalaliParts(+m[1],+m[2],1);if(!j)return v;
  return fa(`${j.year.padStart(4,'0')}-${j.month.padStart(2,'0')}`);
}
function mapApiObject(obj,key){
  if(Array.isArray(obj))return obj.map(x=>mapApiObject(x,key));
  if(!obj||typeof obj!=='object'){
    if(/month|period/i.test(key||''))return convertMonth(obj);
    if(/date/i.test(key||''))return convertDateTime(obj);
    return obj;
  }
  const out={};Object.keys(obj).forEach(k=>{
    const v=obj[k];
    if(/month(_key)?|period(_key)?/i.test(k)&&typeof v==='string')out[k]=convertMonth(v);
    else if(/outage_date|start_date|end_date/i.test(k)&&typeof v==='string')out[k]=convertDateTime(v);
    else out[k]=mapApiObject(v,k);
  });return out;
}
function patchDom(){
  // در فیلدهای تاریخ فقط جداکنندهٔ هزارگان حذف می‌شود؛ مقدار خام میلادی برای API دست‌کاری نمی‌شود.
  document.querySelectorAll('input,textarea').forEach(el=>{
    const meta=(`${el.id||''} ${el.name||''} ${el.placeholder||''}`).toLowerCase();
    if(/تاریخ|date|from|to|start|end/.test(meta)&&typeof el.value==='string'){
      const v=stripThousands(el.value);if(v!==el.value)el.value=v;
    }
  });
  const candidates=[...document.querySelectorAll('table,.panel,section,article,main,div')];
  candidates.forEach(root=>{
    const title=String(root.textContent||'');
    if(!/آمار\s*ماهانه/.test(title)&&!(/تعداد\s*قطعی/.test(title)&&/مجموع\s*مدت/.test(title)))return;
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null,false),nodes=[];while(w.nextNode())nodes.push(w.currentNode);
    nodes.forEach(n=>{
      const p=n.parentElement;if(!p||/^(script|style|input|textarea|select|option)$/i.test(p.tagName))return;
      let s=stripThousands(n.nodeValue||'');
      s=s.replace(/\b(20\d{2})[-\/]([0-9]{1,2})[-\/]([0-9]{1,2})(\s+\d{1,2}:\d{2}(?::\d{2})?)?\b/g,(all,y,m,d,t)=>convertDateTime(`${y}-${m}-${d}${t||''}`));
      s=s.replace(/\b(20\d{2})[-\/]([0-9]{1,2})\b/g,(all,y,m)=>convertMonth(`${y}-${m}`));
      if(s!==n.nodeValue)n.nodeValue=s;
    });
  });
}
window.fetch=async function(input,init){
  const response=await originalFetch.call(this,input,init);
  try{
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(!/\/api\/admin\/outages(?:\?|$)/.test(url))return response;
    const clone=response.clone();const data=await clone.json();
    const patched=mapApiObject(data,'');
    const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');
    setTimeout(patchDom,0);
    return new Response(JSON.stringify(patched),{status:response.status,statusText:response.statusText,headers});
  }catch(_){return response;}
};
function start(){patchDom();[150,500,1200,2500,5000].forEach(t=>setTimeout(patchDom,t));if(document.body)new MutationObserver(()=>{setTimeout(patchDom,20);}).observe(document.body,{childList:true,subtree:true,characterData:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();