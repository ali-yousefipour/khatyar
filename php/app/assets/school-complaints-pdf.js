/* Standalone Persian A4 PDF download; no print dialog or third-party service.
 * Each page is rendered using browser text shaping, then embedded as a JPEG PDF page.
 * Sensitive complaint data never leaves the browser.
 */
(function(){
'use strict';
const W=1240,H=1754,M=90,BOTTOM=145,MAX_PAGES=80;
const clean=x=>String(x??'—');
const fa=x=>clean(x).replace(/[0-9]/g,n=>'۰۱۲۳۴۵۶۷۸۹'[+n]);
const labelStatus={pending:'در انتظار بررسی',in_progress:'در حال بررسی',answered:'پاسخ داده‌شده',escalated:'ارجاع به مسئول واحد',returned:'بررسی تکمیلی',closed:'مختومه'};
const actionTitle={created:'ثبت شکایت',start:'شروع بررسی',note:'یادداشت',reply:'پاسخ',escalate:'ارجاع',return:'بازگشت برای تکمیل',close:'مختومه'};
function tehran(value){
 if(!value)return '—';
 try{
  const d=value instanceof Date?value:new Date(String(value).replace(' ','T')+'+03:30');
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Tehran'}).format(d);
 }catch(_){return fa(value);}
}
function image(src){
 return new Promise(resolve=>{
  const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=src;
 });
}
function pdfBytes(pages){
 const parts=[];let offset=0;const loc=[0];
 const write=x=>{const b=typeof x==='string'?Uint8Array.from(x,c=>c.charCodeAt(0)&255):x;parts.push(b);offset+=b.length;};
 const obj=(id,body)=>{loc[id]=offset;write(id+' 0 obj\n');write(body);write('\nendobj\n');};
 write('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
 obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
 const ids=pages.map((_,i)=>3+i*3);
 obj(2,'<< /Type /Pages /Count '+pages.length+' /Kids ['+ids.map(id=>id+' 0 R').join(' ')+'] >>');
 for(let i=0;i<pages.length;i++){
  const id=ids[i],bytes=pages[i];
  obj(id,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 '+(id+1)+' 0 R >> >> /Contents '+(id+2)+' 0 R >>');
  loc[id+1]=offset;write((id+1)+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+W+' /Height '+H+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+bytes.length+' >>\nstream\n');
  write(bytes);write('\nendstream\nendobj\n');
  const stream='q 595.28 0 0 841.89 0 0 cm /Im0 Do Q\n';
  obj(id+2,'<< /Length '+stream.length+' >>\nstream\n'+stream+'endstream');
 }
 const start=offset, count=3+pages.length*3;
 write('xref\n0 '+count+'\n0000000000 65535 f \n');
 for(let i=1;i<count;i++)write(String(loc[i]).padStart(10,'0')+' 00000 n \n');
 write('trailer\n<< /Size '+count+' /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF\n');
 return new Blob(parts,{type:'application/pdf'});
}
async function download(record,options={}){
 const receipt=!!options.receipt,code=clean(record.tracking_code);
 if(!/^SSC-[A-Fa-f0-9-]{8,64}$/.test(code))throw Error('شناسه پرونده برای PDF نامعتبر است');
 if(document.fonts&&document.fonts.ready)await document.fonts.ready;
 const logo=await image('/brand-khatyar.png');
 const canvases=[];let canvas,ctx,y;
 const font=(size=26,bold=false)=>{ctx.font=(bold?'700 ':'400 ')+size+'px Vazirmatn,Tahoma,sans-serif';ctx.direction='rtl';ctx.textAlign='right';ctx.textBaseline='alphabetic';};
 const newPage=()=>{
  if(canvases.length>=MAX_PAGES)throw Error('گزارش بیش از حد طولانی است؛ بازه اطلاعات را محدود کنید');
  canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;ctx=canvas.getContext('2d');
  if(!ctx)throw Error('امکان ساخت فایل PDF در این مرورگر وجود ندارد');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#087f67';ctx.fillRect(0,0,W,17);
  if(logo)ctx.drawImage(logo,M,55,85,85);
  ctx.fillStyle='#103e30';font(36,true);ctx.fillText('خطیار | شکایات سرویس مدارس',W-M,100);
  ctx.fillStyle='#527466';font(23);ctx.fillText(receipt?'رسید ثبت شکایت':'گزارش سازمانی پرونده شکایت',W-M,136);
  ctx.fillStyle='#d9e6de';ctx.fillRect(M,160,W-2*M,2);
  y=205;canvases.push(canvas);
 };
 const next=height=>{if(y+height>H-BOTTOM)newPage();};
 const write=(value,size=26,bold=false,color='#203a30')=>{
  font(size,bold);ctx.fillStyle=color;
  const max=W-2*M;
  const paragraphs=clean(value).split(/\r?\n/);
  for(const paragraph of paragraphs){
   const words=paragraph.split(/\s+/).filter(Boolean);
   let line='';
   const put=()=>{
    next(size*1.65);font(size,bold);ctx.fillStyle=color;
    ctx.fillText(line||' ',W-M,y);y+=size*1.65;line='';
   };
   if(!words.length){put();continue;}
   for(const word of words){
    const candidate=line?line+' '+word:word;
    if(ctx.measureText(candidate).width<=max){line=candidate;continue;}
    if(line)put();
    // Break exceptionally long unspaced input without clipping.
    for(const char of word){
     if(ctx.measureText(line+char).width>max&&line)put();
     line+=char;
    }
   }
   if(line)put();
  }
 };
 const section=title=>{
  next(110);y+=18;ctx.fillStyle='#eaf5ee';ctx.fillRect(M,y-31,W-2*M,66);
  write(title,28,true,'#087358');y+=14;
 };
 const field=(key,value)=>write(key+' : '+clean(value),24,false);
 newPage();
 section('مشخصات رهگیری');
 field('کد رهگیری',code);field('تاریخ تهیه گزارش',tehran(new Date()));
 if(window.KhatyarSchoolQR&&window.KhatyarSchoolQR.svg){
  const svg=window.KhatyarSchoolQR.svg(code);
  const points=Array.from(svg.matchAll(/M(\d+) (\d+)h1v1h-1z/g));
  if(points.length){
   next(245);
   const s=5,x=M,y0=y;
   ctx.fillStyle='#fff';ctx.fillRect(x,y0,37*s,37*s);
   ctx.fillStyle='#153d2d';for(const p of points)ctx.fillRect(x+Number(p[1])*s,y0+Number(p[2])*s,s,s);
   y+=215;
  }
 }
 if(!receipt){
  section('مشخصات شاکی');
  field('نوع دریافت',record.reception_type==='phone'?'تلفنی':record.reception_type==='in_person'?'حضوری':'نامشخص');
   field('نوع شاکی',record.complainant_type==='driver'?'راننده':'ولی دانش‌آموز');
  field('نام و نام خانوادگی',[record.first_name,record.last_name].filter(Boolean).join(' '));
  field('تلفن',fa(record.phone));field('نشانی',record.address);
  section('مدرسه و شرکت سرویس‌دهنده');
  field('مدرسه',record.school_snapshot?.name);
  field('ناحیه',record.school_snapshot?.educational_district);
  field('نشانی مدرسه',record.school_snapshot?.address);
  field('شرکت',record.company_snapshot?.name);
  field('مدیرعامل',record.company_snapshot?.manager_name);
  field('موبایل مدیرعامل',fa(record.company_snapshot?.manager_mobile));
  section('شرح شکایت و رسیدگی');
  field('موضوع',record.subject);
  write(record.body||'—');
  field('تاریخ دریافت',tehran(record.received_at));
  field('وضعیت',labelStatus[record.status]||record.status);
  field('مسئول',record.assigned_name);
  field('مهلت',tehran(record.due_at));
  field('تاریخ مختومه',tehran(record.closed_at));
  section('مستندات پیوست');
  if(Array.isArray(record.attachments)&&record.attachments.length){
   for(const att of record.attachments)field('فایل پیوست',clean(att.filename)+' — '+fa(Math.ceil(Number(att.byte_size||0)/1024))+' کیلوبایت');
  }else write('مستندی برای این پرونده ثبت نشده است.',22);
  section('تاریخچه اقدامات');
  for(const ev of record.events||[]){
   next(105);write((actionTitle[ev.action]||ev.action||'ثبت اولیه')+' | '+(ev.actor_name||'—')+' | '+tehran(ev.created_at),22,true);
   if(ev.body)write(ev.body,22);
   y+=9;
  }
 }else{section('راهنمای پیگیری');write('برای پیگیری شکایت، کد رهگیری فوق را نزد خود نگه دارید.');}
 // Convert one page at a time: yielding between pages keeps the progress UI responsive.
 // The callback reports completed pages, not a fabricated time percentage.
 const jpg=[];
 for(let i=0;i<canvases.length;i++){
  if(typeof options.onProgress==='function')options.onProgress(i,canvases.length);
  await new Promise(resolve=>setTimeout(resolve,0));
  const c=canvases[i],context=c.getContext('2d');
  context.fillStyle='#607c69';context.font='20px Vazirmatn,Tahoma,sans-serif';
  context.direction='rtl';context.textAlign='right';
  context.fillText('خطیار — صفحه '+fa(i+1)+' از '+fa(canvases.length),W-M,H-62);
  const url=c.toDataURL('image/jpeg',0.89);
  if(!url.startsWith('data:image/jpeg;base64,'))throw Error('تولید تصویر صفحه PDF ناموفق بود');
  const raw=atob(url.split(',')[1]);
  if(raw.length<4||raw.charCodeAt(0)!==255||raw.charCodeAt(1)!==216||raw.charCodeAt(raw.length-2)!==255||raw.charCodeAt(raw.length-1)!==217)throw Error('داده تصویری PDF معتبر نیست');
  jpg.push(Uint8Array.from(raw,char=>char.charCodeAt(0)));
  if(typeof options.onProgress==='function')options.onProgress(i+1,canvases.length);
 }
 const file=pdfBytes(jpg);const url=URL.createObjectURL(file);
 const a=document.createElement('a');a.href=url;a.download='khatyar-school-complaint-'+code+'.pdf';document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),10000);
 return file.size;
}
window.KhatyarSchoolPdf={download};
})();