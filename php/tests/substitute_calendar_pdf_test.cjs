'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../app/assets/substitute-calendar-pdf.js'),'utf8');
let file=null,anchor=null,released=null;const rendered=[];
const context={
 Blob,Uint8Array,Date,Intl,Promise,Error,Number,String,Array,Math,
 atob:globalThis.atob,
 setTimeout(fn){fn();return 1;},
 URL:{createObjectURL(value){file=value;return 'blob:local-pdf';},revokeObjectURL(value){released=value;}},
 Image:class{naturalWidth=130;naturalHeight=130;set src(v){this.onload?.();}},
 document:{
  fonts:{ready:Promise.resolve()},
  createElement(tag){
   if(tag==='canvas')return {width:0,height:0,getContext(){return {
    fillRect(){},drawImage(){},fillText(value){rendered.push(String(value));},measureText(value){return {width:String(value).length*10};},direction:'rtl',
    set fillStyle(value){},set font(value){},set textAlign(value){},set textBaseline(value){}
   };},toDataURL(){return 'data:image/jpeg;base64,'+Buffer.from([255,216,255,217]).toString('base64');}};
   if(tag==='a')return {href:'',download:'',click(){anchor={href:this.href,download:this.download};},remove(){}};
   throw Error('Unexpected DOM element '+tag);
  },
  body:{appendChild(){}}
 },
 window:{}
};
vm.createContext(context);vm.runInContext(source,context);
(async()=>{
 const rows=Array.from({length:17},(_,i)=>({'تاریخ':'1405-09-02','نیروی اصلی':'نیروی '+i,'وضعیت':'تخصیص قطعی','شروع':'06:00','پایان':'14:00','خط یا محل خدمت':'ایستگاه ۱'}));
 rows.push({'تاریخ':'1405-09-03','روز هفته':'سه‌شنبه','روز خالی':true,'وضعیت':'بدون شیفت جایگزینی'});
 const result=await context.window.KhatyarSubstitutePdf.download(rows,{filename:'checked.pdf',person:'نیروی آزمون'});
 assert(rendered.some(v=>v.includes('نیروی آزمون')));assert(rendered.some(v=>v.includes('سه‌شنبه')&&v.includes('۱۴۰۵-۰۹-۰۳')));assert(rendered.includes('بدون شیفت جایگزینی'));
 assert.equal(result.pages,3);assert.equal(result.rows,18);
 assert.equal(file.type,'application/pdf');assert.equal(anchor.download,'checked.pdf');
 assert.equal(released,'blob:local-pdf');
 const data=Buffer.from(await file.arrayBuffer()).toString('latin1');
 assert.ok(data.startsWith('%PDF-1.4'),'PDF header is present');
 assert.ok(data.includes('/Type /Pages /Count 3'),'every page recorded');
 assert.ok(data.includes('xref\n'),'xref exists');
 assert.ok(data.includes('startxref\n'),'xref offset exists');
 assert.ok(data.endsWith('%%EOF\n'),'PDF trailer exists');
 await assert.rejects(context.window.KhatyarSubstitutePdf.download([]),/گزارشی وجود ندارد/);
 console.log('PASS standalone PDF: RTL canvas generation, pagination, valid PDF structure, file download and empty input guard');
})().catch(e=>{console.error(e);process.exitCode=1;});
