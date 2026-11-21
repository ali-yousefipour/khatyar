'use strict';
/* node php/tools/test_school_complaint_qr.cjs
 * Regression test for offline QR: mode, payload, format bits and reserved patterns.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync(require('node:path').join(__dirname,'../app/assets/school-complaints-qr.js'),'utf8');
const ctx={window:{},Uint8Array};
vm.runInNewContext(code,ctx);
const qr=ctx.window.KhatyarSchoolQR;
function decode(text){
 const svg=qr.svg(text);
 const a=Array.from({length:29},()=>Array(29).fill(0));
 for(const m of svg.matchAll(/M(\d+) (\d+)h1v1h-1z/g)){
  const x=+m[1]-4,y=+m[2]-4;
  assert(x>=0&&x<29&&y>=0&&y<29);
  a[y][x]=1;
 }
 const reserved=Array.from({length:29},()=>Array(29).fill(false));
 const mark=(x,y)=>{if(x>=0&&x<29&&y>=0&&y<29)reserved[y][x]=true;};
 for(const [ox,oy] of [[0,0],[22,0],[0,22]])
  for(let y=-1;y<=7;y++)for(let x=-1;x<=7;x++)mark(ox+x,oy+y);
 for(let i=8;i<21;i++){mark(i,6);mark(6,i);}
 for(let y=20;y<=24;y++)for(let x=20;x<=24;x++)mark(x,y);
 for(let i=0;i<15;i++){mark(8,i<6?i:i<8?i+1:14+i);mark(i<8?28-i:i===8?7:14-i,8);}
 mark(8,21);
 let format=0;for(let i=0;i<15;i++)format|=a[i<6?i:i<8?i+1:14+i][8]<<i;
 assert.equal(format,0x77c4,'QR level L/mask 0 format');
 const bits=[];let up=true;
 for(let right=28;right>=1;right-=2){
  if(right===6)right=5;
  for(let pos=0;pos<29;pos++){
   const y=up?28-pos:pos;
   for(let dx=0;dx<2;dx++){
    const x=right-dx;
    if(!reserved[y][x])bits.push(a[y][x]^((x+y)%2===0?1:0));
   }
  }
  up=!up;
 }
 const num=(start,count)=>parseInt(bits.slice(start,start+count).join(''),2);
 assert.equal(num(0,4),4,'byte mode');
 const length=num(4,8);
 let output='';
 for(let i=0;i<length;i++)output+=String.fromCharCode(num(12+i*8,8));
 return output;
}
for(const code of ['SSC-1234567890ABCDEF','SSC-1234567890ABCDEF1234567890ABCDEF']){
 assert.equal(decode(code),code);
}
assert.throws(()=>qr.svg('A'.repeat(54)),/معتبر/);
assert.throws(()=>qr.svg('<script>'),/معتبر/);
console.log('School complaints QR smoke checks passed');
