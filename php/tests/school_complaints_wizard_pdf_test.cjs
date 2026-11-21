'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'../app/assets');
const admin=fs.readFileSync(path.join(root,'school-complaints-admin.js'),'utf8');
const pdf=fs.readFileSync(path.join(root,'school-complaints-pdf.js'),'utf8');
assert.match(admin,/useEffect\(\(\)=>\{if\(tab!=='receive'\)return;document\.getElementById\('sc-wizard-heading'\)\?\.focus\(\{preventScroll:true\}\);\},\[step,tab\]\)/,'wizard focuses each newly selected step');
assert.match(admin,/h\('h4',\{id:'sc-wizard-heading',tabIndex:-1\}/,'wizard heading is programmatically focusable');
assert.match(admin,/h\('td',\{colSpan:9,role:'status',className:'sc-empty-results'\}/,'empty table has a full-width accessible status');
assert.match(admin,/onProgress:\(done,total\)=>/,'PDF caller receives real completed page counts');
const canvases=[];
let downloaded=0;
const createCanvas=()=>{
 const context={fillStyle:'',font:'',direction:'',textAlign:'',textBaseline:'',
  fillRect(){},fillText(){},drawImage(){},measureText(txt){return {width:String(txt).length*13};}
 };
 const canvas={width:0,height:0,getContext:()=>context,toDataURL:()=> 'data:image/jpeg;base64,/9j/2Q=='};
 canvases.push(canvas);return canvas;
};
const document={
 fonts:{ready:Promise.resolve()},
 body:{appendChild(){}},
 createElement(tag){if(tag==='canvas')return createCanvas();if(tag==='a')return {click(){downloaded++;},remove(){}};throw Error('unknown HTML element '+tag);}
};
class MissingImage{set src(_){this.onerror?.();}}
const mockWindow={};
const fakeURL={createObjectURL:()=> 'blob:mock-school-pdf',revokeObjectURL(){}};
vm.runInNewContext(pdf,{
 window:mockWindow,document,Image:MissingImage,Blob,Uint8Array,Intl,Date,
 atob,URL:fakeURL,setTimeout:(fn,ms)=>ms===10000?0:setTimeout(fn,ms),
});
assert.equal(typeof mockWindow.KhatyarSchoolPdf?.download,'function','canonical PDF export initialized');
(async()=>{
 const progress=[];
 const record={tracking_code:'SSC-12345678',first_name:'کاربر',last_name:'آزمایشی',status:'pending',
   body:Array(110).fill('شرح کامل شکایت برای بررسی گزارش چندصفحه‌ای').join('\n'),events:[]};
 const size=await mockWindow.KhatyarSchoolPdf.download(record,{onProgress:(done,total)=>progress.push([done,total])});
 assert.ok(size>0,'PDF is generated');
 assert.ok(canvases.length>1,'large content produces multiple pages');
 assert.equal(downloaded,1,'one download is initiated');
 assert.equal(progress[0][0],0,'first page starts at zero completed pages');
 assert.equal(progress.at(-1)[0],canvases.length,'last callback reports all pages completed');
 assert.ok(progress.every(([,total])=>total===canvases.length),'denominator is the actual page count');
 assert.equal(progress.length,canvases.length*2,'progress reports before and after each page');
 console.log('PASS school complaints wizard focus, empty table and real multi-page PDF progress');
})().catch(err=>{console.error(err);process.exitCode=1;});
