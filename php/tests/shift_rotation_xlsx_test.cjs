const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),zlib=require('node:zlib');
const bytes=cp.execFileSync(process.env.PHP_BINARY||'php',[...JSON.parse(process.env.PHP_TEST_ARGS||'[]'),path.join(__dirname,'shift_rotation_test.php'),'--xlsx'],{maxBuffer:4*1024*1024});
const end=bytes.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]));assert(end>=0,'real XLSX archive');
const files={};let offset=bytes.readUInt32LE(end+16);
for(let n=0;n<bytes.readUInt16LE(end+10);n++){
  assert.equal(bytes.readUInt32LE(offset),0x02014b50);
  const nameLen=bytes.readUInt16LE(offset+28),extra=bytes.readUInt16LE(offset+30),comment=bytes.readUInt16LE(offset+32);
  const name=bytes.subarray(offset+46,offset+46+nameLen).toString(),local=bytes.readUInt32LE(offset+42);
  const start=local+30+bytes.readUInt16LE(local+26)+bytes.readUInt16LE(local+28),compressed=bytes.subarray(start,start+bytes.readUInt32LE(offset+20));
  files[name]=(bytes.readUInt16LE(offset+10)===8?zlib.inflateRawSync(compressed):compressed).toString('utf8');offset+=46+nameLen+extra+comment;
}
const sheet=files['xl/worksheets/sheet1.xml'];
assert(sheet.includes('rightToLeft="1"'));assert(sheet.includes('ySplit="5" topLeftCell="A6"'));
assert(sheet.includes('mergeCell ref="E4:G4"'));assert(sheet.includes('autoFilter ref="A5:J8"'));
assert(sheet.includes('چرخش شیفت (روز)'));assert(sheet.includes('orientation="landscape" fitToWidth="1"'));
assert.match(sheet,/<c r="C6"[^>]*t="inlineStr"[^>]*><is><t[^>]*>0012345678<\/t>/);
assert.match(sheet,/<c r="D6"[^>]*t="inlineStr"[^>]*><is><t[^>]*>0007<\/t>/);
assert.match(sheet,/<c r="E6" s="9"><v>0.5<\/v>/);assert.match(sheet,/<c r="F6" s="9"><v>0.5<\/v>/);
assert(files['xl/styles.xml'].includes('numFmtId="2"'));assert(files['xl/workbook.xml'].includes('$1:$5'));
assert(!sheet.includes('<f>'),'user text cannot become Excel formulas');assert(sheet.includes('=HYPERLINK'));
assert(files['xl/comments1.xml'].includes('مبنای محاسبه ساعت ورود'));
if(process.env.ROTATION_XLSX_OUTPUT)fs.writeFileSync(process.env.ROTATION_XLSX_OUTPUT,bytes);
console.log('PASS rotation XLSX: grouped headers, RTL, numeric half-days, zero-prefixed IDs, freeze/filter, print layout, notes and formula safety');
