const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../tools/panel_source.jsx'),'utf8');
const start=source.indexOf('function substituteMonthDays(');
const end=source.indexOf('\nfunction ',start+10);
const ctx={Date,Intl};vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
let months=0;
for(let year=1390;year<=1420;year++){
 let total=0;
 for(let month=1;month<=12;month++){
  const days=ctx.substituteMonthDays(year,month);months++;
  assert(days.length>=(month===12?29:30)&&days.length<=31);
  if(month<=6)assert.equal(days.length,31);
  if(month>6&&month<12)assert.equal(days.length,30);
  days.forEach((d,i)=>{
   assert.equal(d.day,i+1);
   assert.equal(d.date,`${year}-${String(month).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`);
   if(i)assert.equal(d.weekday,(days[i-1].weekday+1)%7);
  });total+=days.length;
 }
 assert(total===365||total===366);
}
console.log(`PASS ${months} Jalali months: lengths, dates, weekdays and yearly totals`);
