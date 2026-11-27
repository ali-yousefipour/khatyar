/* Standalone RTL PDF for the filtered substitute calendar.
 * Fully generated inside the authenticated browser: no server upload, no print dialog.
 * Uses canvas shaping for Persian/Vazirmatn and embeds JPEG pages in a valid PDF.
 */
(function(){
'use strict';
const WIDTH=2480,HEIGHT=1754,MARGIN=65,ROWS_PER_PAGE=31,MAX_PAGES=80;
const fa=value=>String(value??'—').replace(/[0-9]/g,c=>'۰۱۲۳۴۵۶۷۸۹'[Number(c)]);
const fields=['تاریخ','نیروی جایگزین','نیروی اصلی','شیفت','شروع','پایان','خط یا محل خدمت','وضعیت','رزروکننده'];
function pdfDocument(pages){
 const result=[];let offset=0;const table=[0];
 const write=data=>{const bytes=typeof data==='string'?Uint8Array.from(data,c=>c.charCodeAt(0)&255):data;result.push(bytes);offset+=bytes.length;};
 function object(id,content){table[id]=offset;write(id+' 0 obj\n'+content+'\nendobj\n');}
 write('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');object(1,'<< /Type /Catalog /Pages 2 0 R >>');
 const ids=pages.map((_,i)=>3+i*3);
 object(2,'<< /Type /Pages /Count '+pages.length+' /Kids ['+ids.map(n=>n+' 0 R').join(' ')+'] >>');
 pages.forEach((bytes,i)=>{
  const id=ids[i],stream='q 841.89 0 0 595.28 0 0 cm /Im0 Do Q\n';
  object(id,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 841.89 595.28] /Resources << /XObject << /Im0 '+(id+1)+' 0 R >> >> /Contents '+(id+2)+' 0 R >>');
  table[id+1]=offset;
  write((id+1)+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+WIDTH+' /Height '+HEIGHT+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+bytes.length+' >>\nstream\n');
  write(bytes);write('\nendstream\nendobj\n');
  object(id+2,'<< /Length '+stream.length+' >>\nstream\n'+stream+'endstream');
 });
 const end=offset,total=3+pages.length*3;
 write('xref\n0 '+total+'\n0000000000 65535 f \n');
 for(let i=1;i<total;i++)write(String(table[i]).padStart(10,'0')+' 00000 n \n');
 write('trailer\n<< /Size '+total+' /Root 1 0 R >>\nstartxref\n'+end+'\n%%EOF\n');
 return new Blob(result,{type:'application/pdf'});
}
function bytesOf(jpeg){
 const encoded=jpeg.split(',')[1];
 const data=atob(encoded),bytes=new Uint8Array(data.length);
 for(let i=0;i<data.length;i++)bytes[i]=data.charCodeAt(i);
 return bytes;
}
function renderPage(rows,pageNumber,pagesCount,title,logo,summary,person){
 const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas PDF is unavailable');
 const right=WIDTH-MARGIN, cw=WIDTH-2*MARGIN;
 const rect=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
 const text=(value,x,y,size,color='#173b32',bold=false,max=cw)=>{ctx.font=(bold?'700 ':'400 ')+size+'px Vazirmatn, Tahoma, sans-serif';ctx.fillStyle=color;ctx.fillText(fa(value),x,y,max);};
 ctx.direction='rtl';ctx.textAlign='right';ctx.textBaseline='middle';
 rect(0,0,WIDTH,HEIGHT,'#fff');rect(0,0,WIDTH,125,'#064e3b');rect(0,125,WIDTH,6,'#0d9488');
 if(logo){const ratio=Math.min(92/logo.naturalWidth,92/logo.naturalHeight);ctx.drawImage(logo,MARGIN,16,logo.naturalWidth*ratio,logo.naturalHeight*ratio);}
 text('گزارش ماهانه شیفت نیروهای جایگزین',right,36,39,'#fff',true);
 text('نیروی جایگزین: '+person+' | '+title,right,88,31,'#fff',true);
 text('روزهای ماه: '+summary.days+'  |  روزهای بدون شیفت: '+summary.empty+'  |  نوبت‌ها: '+summary.total+'  |  قطعی: '+summary.confirmed,right,165,29,'#064e3b',true);
 const cols=[['تاریخ / روز',380],['نیروی اصلی',440],['شیفت',220],['ساعت شروع و پایان',390],['خط مجاز / محل خدمت',650],['وضعیت',260]];
 const widths=cols.map(c=>c[1]*cw/2340);let y=200;
 const draw=(values,background,color,bold=false)=>{rect(MARGIN,y,cw,45,background);let x=right;values.forEach((v,i)=>{text(v,x-12,y+22,26,color,bold,widths[i]-24);x-=widths[i];rect(x,y,1,45,'#dbe5e2');});y+=45;};
 draw(cols.map(c=>c[0]),'#087f5b','#fff',true);
 rows.forEach((row,i)=>{
  const status=String(row['وضعیت']||'نامشخص'), empty=row['روز خالی'], conflict=row['تداخل']==='دارای تداخل';
  const color=conflict||row['تعطیلی']?'#991b1b':empty?'#475569':'#173b32';
  draw([row['تاریخ']+' | '+(row['روز هفته']||''),empty?'—':row['نیروی اصلی']||'ثبت نشده',empty?'—':row['شیفت']||'ثبت نشده',empty?'—':'\u2066'+fa(row['شروع'])+'\u2069 تا \u2066'+fa(row['پایان'])+'\u2069',empty?'—':row['خط یا محل خدمت']||'ثبت نشده',status+(conflict?' / تداخل':'')],empty?'#f4f6f6':i%2?'#fff':'#edf7f3',color);
 });
 rect(MARGIN,1680,cw,2,'#0d9488');
 text('خط مجاز: تنظیم فعلی نیروی اصلی؛ نه سند حضور تاریخی.  |  تاریخ تولید: '+new Intl.DateTimeFormat('fa-IR-u-ca-persian',{dateStyle:'medium',timeZone:'Asia/Tehran'}).format(new Date())+'  |  صفحه '+pageNumber+' از '+pagesCount,right,1712,23,'#365b50');
 return bytesOf(canvas.toDataURL('image/jpeg',0.95));
}
function loadLogo(){
 return new Promise(resolve=>{
  const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);
  img.src='/brand-khatyar.png';
 });
}
async function download(rows,options={}){
 if(!Array.isArray(rows)||rows.length===0)throw Error('برای این فیلتر گزارشی وجود ندارد');
 if(rows.length>ROWS_PER_PAGE*MAX_PAGES)throw Error('گزارش بیش از حد بزرگ است؛ بازه یا فیلتر را محدود کنید');
 if(document.fonts&&document.fonts.ready){await document.fonts.ready;if(document.fonts.load)await Promise.all([document.fonts.load('400 24px Vazirmatn','گزارش شیفت'),document.fonts.load('700 24px Vazirmatn','گزارش شیفت')]);}
 const logo=await loadLogo();
 if(!logo)throw Error('لوگوی سازمانی خطیار بارگذاری نشد؛ برای دریافت گزارش رسمی دوباره تلاش کنید.');
 const pagesCount=Math.ceil(rows.length/ROWS_PER_PAGE);
 const title=options.title||'گزارش شیفت نیروهای جایگزین';
 const actual=rows.filter(r=>!r['روز خالی']);
 const summary={days:new Set(rows.map(r=>r['تاریخ'])).size,empty:rows.filter(r=>r['روز خالی']).length,total:actual.length,confirmed:actual.filter(r=>['تخصیص قطعی','انجام‌شده'].includes(r['وضعیت'])).length};
 const person=options.person||rows[0]['نیروی جایگزین']||'ثبت نشده';
 const pages=[];
 for(let i=0;i<pagesCount;i++)pages.push(renderPage(rows.slice(i*ROWS_PER_PAGE,(i+1)*ROWS_PER_PAGE),i+1,pagesCount,title,logo,summary,person));
 const file=pdfDocument(pages);
 const url=URL.createObjectURL(file),link=document.createElement('a');
 link.href=url;link.download=options.filename||'substitute-calendar.pdf';
 document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1200);
 return {pages:pagesCount,rows:rows.length};
}
window.KhatyarSubstitutePdf={download,fields};
})();
