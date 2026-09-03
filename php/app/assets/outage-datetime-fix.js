(()=>{'use strict';
// اصلاح نمایش «تاریخ/ساعت ثبت» در گزارش قطعی سیستم نوبت‌دهی.
// داده اصلی قطعی شامل outage_date و start_time است؛ برای جلوگیری از نمایش 00:00
// تاریخ نمایش را به‌صورت YYYY-MM-DD HH:mm به formatter فعلی پنل تحویل می‌دهیم.
const originalFetch=window.fetch;
window.fetch=async function(input,init){
  const response=await originalFetch.call(this,input,init);
  try{
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(!/\/api\/admin\/outages(?:\?|$)/.test(url)) return response;
    const clone=response.clone();
    const data=await clone.json();
    if(data&&Array.isArray(data.rows)){
      data.rows=data.rows.map(r=>{
        const d=String(r.outage_date||'').trim();
        const t=String(r.start_time||'').trim();
        if(/^\d{4}-\d{1,2}-\d{1,2}$/.test(d)&&/^\d{1,2}:\d{2}$/.test(t)){
          return {...r,outage_date:`${d} ${t}`};
        }
        return r;
      });
    }
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers});
  }catch(_){return response;}
};
})();
