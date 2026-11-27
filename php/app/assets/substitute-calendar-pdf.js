/* Standalone RTL PDF for the filtered substitute calendar.
 * Fully generated inside the authenticated browser: no server upload, no print dialog.
 * Uses canvas shaping for Persian/Vazirmatn and embeds JPEG pages in a valid PDF.
 */
(function(){
'use strict';
const WIDTH=1240,HEIGHT=1754,MARGIN=75,ROWS_PER_PAGE=15,MAX_PAGES=80;
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
  const id=ids[i],stream='q 595.28 0 0 841.89 0 0 cm /Im0 Do Q\n';
  object(id,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 '+(id+1)+' 0 R >> >> /Contents '+(id+2)+' 0 R >>');
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
function renderPage(rows,pageNumber,pagesCount,title,logo){
 const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas PDF is unavailable');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,WIDTH,HEIGHT);
 ctx.direction='rtl';ctx.textAlign='right';ctx.textBaseline='middle';
 ctx.fillStyle='#064e3b';ctx.fillRect(0,0,WIDTH,220);
 if(logo)ctx.drawImage(logo,MARGIN,35,130,130);
 ctx.fillStyle='#fff';ctx.font='bold 44px Vazirmatn, Tahoma, sans-serif';
 ctx.fillText(title,WIDTH-MARGIN,76);
 ctx.font='26px Vazirmatn, Tahoma, sans-serif';
 ctx.fillText('سامانه هوشمند مدیریت و نظارت خطیار',WIDTH-MARGIN,145);
 let top=275;
 // A readable card per assignment/shift; long text wraps naturally in 3 rows.
 rows.forEach((row,i)=>{
  const y=top+i*88;
  ctx.fillStyle=i%2===0?'#f0fdf4':'#f7faf9';ctx.fillRect(MARGIN,y,WIDTH-MARGIN*2,80);
  ctx.fillStyle='#065f46';ctx.font='bold 25px Vazirmatn, Tahoma, sans-serif';
  ctx.fillText(fa(row['تاریخ'])+'  |  '+fa(row['نیروی اصلی']||'نامشخص')+'  |  '+fa(row['وضعیت']),WIDTH-MARGIN-16,y+18,WIDTH-MARGIN*2-35);
  ctx.fillStyle='#152d28';ctx.font='22px Vazirmatn, Tahoma, sans-serif';
  ctx.fillText('جایگزین: '+fa(row['نیروی جایگزین']||'—')+'  ·  '+fa(row['شیفت']||'—')+
   '  ·  '+fa(row['شروع']||'—')+' تا '+fa(row['پایان']||'—'),WIDTH-MARGIN-16,y+48,WIDTH-MARGIN*2-35);
  ctx.fillStyle='#516b63';ctx.font='19px Vazirmatn, Tahoma, sans-serif';
  ctx.fillText('خط/محل خدمت: '+fa(row['خط یا محل خدمت']||'محل خدمت تاریخی ثبت نشده'),WIDTH-MARGIN-16,y+69,WIDTH-MARGIN*2-35);
 });
 ctx.fillStyle='#33554c';ctx.font='23px Vazirmatn, Tahoma, sans-serif';
 ctx.fillText('صفحه '+fa(pageNumber)+' از '+fa(pagesCount),WIDTH-MARGIN,HEIGHT-75);
 ctx.fillText('تاریخ تولید: '+new Intl.DateTimeFormat('fa-IR-u-ca-persian',{dateStyle:'medium',timeZone:'Asia/Tehran'}).format(new Date()),WIDTH-MARGIN,HEIGHT-116);
 return bytesOf(canvas.toDataURL('image/jpeg',0.88));
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
 if(document.fonts&&document.fonts.ready)await document.fonts.ready;
 const logo=await loadLogo();
 const pagesCount=Math.ceil(rows.length/ROWS_PER_PAGE);
 const title=options.title||'گزارش شیفت نیروهای جایگزین';
 const pages=[];
 for(let i=0;i<pagesCount;i++)pages.push(renderPage(rows.slice(i*ROWS_PER_PAGE,(i+1)*ROWS_PER_PAGE),i+1,pagesCount,title,logo));
 const file=pdfDocument(pages);
 const url=URL.createObjectURL(file),link=document.createElement('a');
 link.href=url;link.download=options.filename||'substitute-calendar.pdf';
 document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1200);
 return {pages:pagesCount,rows:rows.length};
}
window.KhatyarSubstitutePdf={download,fields};
})();
