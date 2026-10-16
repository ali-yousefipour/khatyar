const assert=require('node:assert/strict');
const childProcess=require('node:child_process');
const zlib=require('node:zlib');
const path=require('node:path');
function entries(bytes){
  const end=bytes.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]));
  assert.ok(end>=0,'Valid XLSX ZIP required');
  let offset=bytes.readUInt32LE(end+16);
  const files={};
  for(let index=0;index<bytes.readUInt16LE(end+10);index++){
    assert.equal(bytes.readUInt32LE(offset),0x02014b50);
    const length=bytes.readUInt16LE(offset+28),extra=bytes.readUInt16LE(offset+30),comment=bytes.readUInt16LE(offset+32);
    const name=bytes.subarray(offset+46,offset+46+length).toString();
    const local=bytes.readUInt32LE(offset+42),size=bytes.readUInt32LE(offset+20),method=bytes.readUInt16LE(offset+10);
    const dataStart=local+30+bytes.readUInt16LE(local+26)+bytes.readUInt16LE(local+28);
    const data=bytes.subarray(dataStart,dataStart+size);
    files[name]=(method===8?zlib.inflateRawSync(data):data).toString('utf8');
    offset+=46+length+extra+comment;
  }
  return files;
}
function generate(mode){
  return entries(childProcess.execFileSync(process.env.PHP_BINARY||'php',[...JSON.parse(process.env.PHP_TEST_ARGS||'[]'),path.join(__dirname,'seniority_export_fixture.php'),mode],{maxBuffer:4*1024*1024}));
}
const files=generate('report'),sheet=files['xl/worksheets/sheet1.xml'];
assert.ok(sheet.includes('rightToLeft="1"'));
assert.ok(sheet.includes('ySplit="4" topLeftCell="A5"'));
assert.ok(sheet.includes('<autoFilter ref="A4:O6"'));
assert.ok(sheet.includes('<mergeCells count="3">'));
assert.ok(sheet.includes('orientation="landscape" fitToWidth="1"'));
assert.ok(sheet.includes('جمع سنوات: 128 روز'));
assert.match(sheet,/<c r="C5"[^>]*t="inlineStr"[^>]*><is><t[^>]*>005005<\/t>/);
assert.match(sheet,/<c r="D5"[^>]*t="inlineStr"[^>]*><is><t[^>]*>0012345678<\/t>/);
assert.match(sheet,/<c r="N5" s="7"><v>128<\/v>/);
assert.ok(sheet.includes('ثبت نشده'));
assert.ok(sheet.includes('محاسبه نشده'));
assert.ok(!sheet.includes('<f>'));
assert.ok(files['xl/workbook.xml'].includes('_xlnm.Print_Titles'));
assert.ok(files['xl/styles.xml'].includes('readingOrder="2"'));
const legacy=generate('legacy')['xl/worksheets/sheet1.xml'];
assert.ok(legacy.includes('ySplit="1" topLeftCell="A2"'));
assert.ok(legacy.includes('<autoFilter ref="A1:B2"'));
assert.ok(!legacy.includes('<mergeCells'));
console.log('PASS actual XLSX ZIP: RTL, heading, summary, banded styles, numeric cells, text IDs, freeze/filter, landscape, print titles, no formulas and unchanged legacy layout');
