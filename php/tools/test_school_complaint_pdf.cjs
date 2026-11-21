'use strict';
/* Run: node php/tools/test_school_complaint_pdf.cjs */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/assets/school-complaints-pdf.js'),'utf8');
let clicked=false,file=null,downloads=[];
const ctx={
 fillRect(){},fillText(){},drawImage(){},measureText(str){return {width:String(str).length*14}},
 set font(v){},set direction(v){},set textAlign(v){},set textBaseline(v){},set fillStyle(v){}
};
const doc={
 fonts:{ready:Promise.resolve()},body:{appendChild(){}},
 createElement(type){
  if(type==='canvas')return {width:0,height:0,getContext(){return ctx},toDataURL(){return 'data:image/jpeg;base64,/9j/2Q=='}};
  return {set download(name){downloads.push(name)},click(){clicked=true},remove(){}};
 }
};
class FakeImage{set src(x){this.onerror?.();}}
const web={};
const fakeUrl={createObjectURL(blob){file=blob;return 'blob:test'},revokeObjectURL(){}};
const sandbox={window:web,document:doc,Image:FakeImage,Blob,URL:fakeUrl,atob,Uint8Array,setTimeout(){}};
vm.runInNewContext(source,sandbox);
(async()=>{
 const record={tracking_code:'SSC-1234567890ABCDEF',first_name:'علی',last_name:'آزمایشی',phone:'09123456789',body:'متن شکایت',school_snapshot:{name:'مدرسه آزمایشی'},company_snapshot:{name:'شرکت آزمایشی'},events:[{action:'note',body:'رسیدگی'}]};
 assert.equal(typeof web.KhatyarSchoolPdf.download,'function');
 const result=await web.KhatyarSchoolPdf.download(record);
 assert(result>100);
 assert(clicked,'Download must be triggered');
 assert(downloads[0].endsWith('.pdf'));
 assert(file.type==='application/pdf');
 const data=Buffer.from(await file.arrayBuffer());
 assert(data.subarray(0,8).toString('latin1').startsWith('%PDF-1.4'));
 assert(data.toString('latin1').includes('xref'));
 assert(data.toString('latin1').includes('%%EOF'));
 const tail=data.toString('latin1'),at=Number(tail.match(/startxref\n(\d+)\n%%EOF/)?.[1]);
 assert(Number.isInteger(at)&&tail.slice(at,at+4)==='xref','xref byte offsets must be correct');
 clicked=false;
 await web.KhatyarSchoolPdf.download(record,{receipt:true});
 assert(clicked,'Receipt PDF must download');
 await assert.rejects(()=>web.KhatyarSchoolPdf.download({tracking_code:'invalid'}),/نامعتبر/);
 console.log('School complaint PDF smoke checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
