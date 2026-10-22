const fs=require('fs'),assert=require('assert/strict'),cp=require('child_process'),zlib=require('zlib'),path=require('path');
const bytes=cp.execFileSync(process.env.PHP_BINARY||'php',[...JSON.parse(process.env.PHP_TEST_ARGS||'[]'),path.join(__dirname,'request_export_fixture.php')],{maxBuffer:4*1024*1024});
const end=bytes.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]));assert.ok(end>=0,'export must be a real XLSX ZIP');
let offset=bytes.readUInt32LE(end+16);const files={};
for(let i=0;i<bytes.readUInt16LE(end+10);i++){
 const length=bytes.readUInt16LE(offset+28),extra=bytes.readUInt16LE(offset+30),comment=bytes.readUInt16LE(offset+32),local=bytes.readUInt32LE(offset+42),size=bytes.readUInt32LE(offset+20),method=bytes.readUInt16LE(offset+10);
 const name=bytes.subarray(offset+46,offset+46+length).toString(),start=local+30+bytes.readUInt16LE(local+26)+bytes.readUInt16LE(local+28),data=bytes.subarray(start,start+size);
 files[name]=(method===8?zlib.inflateRawSync(data):data).toString();offset+=46+length+extra+comment;
}
const sheet=files['xl/worksheets/sheet1.xml'];assert.ok(sheet.includes('درخواست‌های پرسنل'));assert.ok(sheet.includes('rightToLeft="1"'));assert.ok(sheet.includes('state="frozen"'));assert.ok(sheet.includes('<autoFilter'));assert.ok(sheet.includes('<mergeCells'));assert.ok(sheet.includes('orientation="landscape"'));assert.ok(sheet.includes('پرسنل آزمون'));assert.ok(sheet.includes('ردشده'));assert.ok(sheet.includes('2 روز'));assert.ok(sheet.includes('=1+1'));assert.ok(!sheet.includes('<f>'),'user text cannot become an Excel formula');assert.ok(files['xl/styles.xml'].includes('readingOrder="2"'));
if(process.env.REQUEST_EXPORT_OUTPUT)fs.writeFileSync(process.env.REQUEST_EXPORT_OUTPUT,bytes);
console.log('PASS real request XLSX: ZIP, Persian heading, RTL, freeze, filters, landscape, professional styles and literal user text');
