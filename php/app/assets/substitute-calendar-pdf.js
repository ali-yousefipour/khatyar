/* Standalone RTL PDF for the filtered substitute calendar.
 * Fully generated inside the authenticated browser: no server upload, no print dialog.
 * Uses canvas shaping for Persian/Vazirmatn and embeds JPEG pages in a valid PDF.
 */
(function(){
'use strict';
const WIDTH=1240,HEIGHT=1754,MARGIN=75,ROWS_PER_PAGE=6,MAX_PAGES=80;
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
function renderPage(rows,pageNumber,pagesCount,title,logo,summary,person){
 const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas PDF is unavailable');
 const right=WIDTH-MARGIN, contentWidth=WIDTH-2*MARGIN;
 const font=(size,bold=false)=>{ctx.font=(bold?'700 ':'400 ')+size+'px Vazirmatn, Tahoma, sans-serif';};
 const text=(value,x,y,size,color='#173b32',bold=false,max=contentWidth)=>{font(size,bold);ctx.fillStyle=color;ctx.fillText(fa(value),x,y,max);};
 const rect=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
 const wrap=(value,max,size)=>{font(size);const lines=[];let line='';for(const word of fa(value).split(/\s+/)){const candidate=line?line+' '+word:word;if(line&&ctx.measureText(candidate).width>max){lines.push(line);line=word;}else line=candidate;}if(line)lines.push(line);return lines;};
 ctx.direction='rtl';ctx.textAlign='right';ctx.textBaseline='middle';
 rect(0,0,WIDTH,HEIGHT,'#ffffff');rect(0,0,WIDTH,206,'#064e3b');rect(0,206,WIDTH,9,'#0d9488');
 if(logo){rect(MARGIN,37,130,130,'#ffffff');const ratio=Math.min(114/logo.naturalWidth,114/logo.naturalHeight);const w=logo.naturalWidth*ratio,h=logo.naturalHeight*ratio;ctx.drawImage(logo,MARGIN+65-w/2,102-h/2,w,h);}
 text('خطیار | مدیریت هوشمند خطوط و ناوگان تاکسیرانی',right,48,24,'#d1fae5',true,900);
 text('گزارش شیفت نیروهای جایگزین',right,106,43,'#ffffff',true,900);
 text('نیروی جایگزین: '+person+'  |  '+title,right,164,27,'#ffffff',true,900);
 const labels=[['روزهای ماه',summary.days],['روزهای بدون شیفت',summary.empty],['تعداد نوبت‌ها',summary.total],['نوبت‌های قطعی',summary.confirmed]];
 const gap=12,w=(contentWidth-3*gap)/4;
 labels.forEach(([label,value],i)=>{const x=right-(i+1)*w-i*gap;rect(x,244,w,100,'#eef7f3');text(label,x+w-14,269,20,'#365b50',false,w-28);text(value,x+w-14,310,32,'#065f46',true,w-28);});
 text('جزئیات نوبت‌های کاری • مطابق فیلترهای انتخاب‌شده',right,380,25,'#064e3b',true);
 rows.forEach((row,i)=>{
  const y=410+i*199, inner=contentWidth-32;
  const status=String(row['وضعیت']||'نامشخص'), heading=fa(row['تاریخ'])+'  |  '+(row['روز هفته']||'')+(row['تعطیلی']&&row['تعطیلی']!=='جمعه'?'  |  '+row['تعطیلی']:''), conflict=row['تداخل']==='دارای تداخل', color=conflict?'#b91c1c':status.includes('انتظار')||status.includes('موقت')?'#92400e':status.includes('لغو')||status.includes('آزاد')?'#b91c1c':status.includes('انجام')?'#475569':'#065f46';
  rect(MARGIN,y,contentWidth,190,i%2?'#f7faf9':'#eff8f4');rect(right-6,y,6,190,color);
  if(row['روز خالی']){rect(MARGIN,y,contentWidth,190,'#f5f7f7');text(heading,right-18,y+32,25,'#475569',true,inner);text(status,right-18,y+95,25,'#475569',false,inner);return;}
  text(heading,right-18,y+22,23,row['تعطیلی']?'#b91c1c':color,true,inner);
  text('به‌جای: '+(row['نیروی اصلی']||'ثبت نشده')+'  |  '+status+(conflict?'  |  دارای تداخل':''),right-18,y+50,23,'#173b32',true,inner);
  text((row['شیفت']||'شیفت ثبت نشده')+'  |  '+fa(row['شروع'])+' تا '+fa(row['پایان'])+'  |  مدت: '+fa(row['مدت برنامه‌ریزی‌شده (دقیقه)'])+' دقیقه',right-18,y+77,20,'#173b32',false,inner);
  const location=wrap('محل خدمت: '+(row['خط یا محل خدمت']||'ثبت نشده'),inner,20);
  const locationLines=location.length<=3?location:[...location.slice(0,2),location.slice(2).join(' ')];
  (locationLines.length?locationLines:['—']).forEach((line,j)=>text(line,right-18,y+102+j*22,20,'#365b50',false,inner));
  text('رزروکننده: '+(row['رزروکننده']||'ثبت نشده')+'  |  شماره درخواست: '+fa(row['شماره درخواست']),right-18,y+169,18,'#365b50',false,inner);
 });
 rect(MARGIN,1622,contentWidth,2,'#0d9488');
 text('تاریخ تولید: '+new Intl.DateTimeFormat('fa-IR-u-ca-persian',{dateStyle:'medium',timeZone:'Asia/Tehran'}).format(new Date()),right,1650,21,'#365b50');
 text('صفحه '+fa(pageNumber)+' از '+fa(pagesCount),right,1690,22,'#064e3b',true);
 return bytesOf(canvas.toDataURL('image/jpeg',0.94));
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
