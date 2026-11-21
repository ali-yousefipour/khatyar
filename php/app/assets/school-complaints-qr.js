/* Offline QR encoder for school complaint tracking codes.
 * QR Version 3, EC level L, ASCII payload up to 53 bytes.
 * Algorithm follows ISO/IEC 18004; tracking codes only (no personal data).
 */
(function(){
'use strict';
const N=29,DATA=55,ECC=15;
const EXP=new Uint8Array(512),LOG=new Uint8Array(256);
let v=1;for(let i=0;i<255;i++){EXP[i]=v;LOG[v]=i;v<<=1;if(v&256)v^=285;}
for(let i=255;i<512;i++)EXP[i]=EXP[i-255];
const mul=(a,b)=>a&&b?EXP[LOG[a]+LOG[b]]:0;
function blocks(text){
 if(!/^[\x20-\x7e]{1,53}$/.test(text))throw Error('کد رهگیری برای QR معتبر نیست');
 const bits=[];const add=(val,count)=>{for(let i=count-1;i>=0;i--)bits.push((val>>>i)&1);};
 add(4,4);add(text.length,8);for(let i=0;i<text.length;i++)add(text.charCodeAt(i),8);
 for(let i=0;i<Math.min(4,DATA*8-bits.length);i++)bits.push(0);
 while(bits.length%8)bits.push(0);
 const data=[];for(let i=0;i<bits.length;i+=8){let n=0;for(let j=0;j<8;j++)n=(n<<1)|bits[i+j];data.push(n);}
 for(let i=0;data.length<DATA;i++)data.push(i%2?0x11:0xec);
 let gen=[1];for(let i=0;i<ECC;i++){let next=new Array(gen.length+1).fill(0);for(let j=0;j<gen.length;j++){next[j]^=gen[j];next[j+1]^=mul(gen[j],EXP[i]);}gen=next;}
 const remainder=new Array(ECC).fill(0);
 for(const d of data){const lead=d^remainder.shift();remainder.push(0);for(let j=0;j<ECC;j++)remainder[j]^=mul(gen[j+1],lead);}
 return data.concat(remainder);
}
function matrix(text){
 const a=Array.from({length:N},()=>Array(N).fill(null));
 const put=(x,y,val)=>{if(x>=0&&x<N&&y>=0&&y<N)a[y][x]=!!val;};
 const finder=(cx,cy)=>{for(let y=-1;y<=7;y++)for(let x=-1;x<=7;x++){const xx=cx+x,yy=cy+y;if(xx<0||yy<0||xx>=N||yy>=N)continue;put(xx,yy,x>=0&&x<=6&&y>=0&&y<=6&&(x===0||x===6||y===0||y===6||(x>=2&&x<=4&&y>=2&&y<=4)));}};
 finder(0,0);finder(N-7,0);finder(0,N-7);
 for(let i=8;i<N-8;i++){if(a[6][i]===null)put(i,6,i%2===0);if(a[i][6]===null)put(6,i,i%2===0);}
 for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++)put(22+x,22+y,Math.max(Math.abs(x),Math.abs(y))!==1);
 const fmt=(()=>{let x=8<<10;for(let i=14;i>=10;i--)if((x>>>i)&1)x^=0x537<<(i-10);return ((8<<10)|x)^0x5412;})();
 for(let i=0;i<15;i++){const bit=(fmt>>>i)&1;
  put(8,i<6?i:i<8?i+1:N-15+i,bit);
  put(i<8?N-i-1:i<9?15-i:i>=9?14-i:0,8,bit);
 }
 put(8,N-8,true);
 const bytes=blocks(text),stream=[];
 for(const b of bytes)for(let i=7;i>=0;i--)stream.push((b>>>i)&1);
 let index=0,up=true;
 for(let right=N-1;right>=1;right-=2){if(right===6)right=5;
  for(let pos=0;pos<N;pos++){const y=up?N-1-pos:pos;
   for(let dx=0;dx<2;dx++){const x=right-dx;if(a[y][x]!==null)continue;
    const raw=index<stream.length?stream[index++]:0;
    put(x,y,raw^((x+y)%2===0));
   }
  }up=!up;
 }
 return a;
}
function svg(text,size=168){
 const a=matrix(String(text));const cells=[];
 for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(a[y][x])cells.push('M'+(x+4)+' '+(y+4)+'h1v1h-1z');
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 37 37" role="img" aria-label="کد QR رهگیری"><rect width="37" height="37" fill="#fff"/><path fill="#123629" d="'+cells.join('')+'"/></svg>';
}
window.KhatyarSchoolQR={svg};
})();