'use strict';
/* node php/tools/test_school_complaint_print.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../app/assets');
const qr=fs.readFileSync(path.join(root,'school-complaints-qr.js'),'utf8');
const moduleCode=fs.readFileSync(path.join(root,'school-complaints-admin.js'),'utf8');
assert(moduleCode.includes('window.KhatyarSchoolComplaints=Module;'));
let html='';
const w={
 React:{createElement(){},useState(){},useEffect(){},useRef(){}},
 open:()=>({document:{open(){},write(x){html=x;},close(){}},focus(){}}),
 print(){throw new Error('Unexpected fallback print');}
};
vm.runInNewContext(qr,{window:w,Uint8Array});
vm.runInNewContext(moduleCode.replace('window.KhatyarSchoolComplaints=Module;','window.testPrint=printOrganization;window.KhatyarSchoolComplaints=Module;'),{window:w,Intl,Date});
const code='SSC-1234567890ABCDEF';
w.testPrint({
 tracking_code:code,first_name:'<script>alert(1)</script>',last_name:'نمونه',
 school_snapshot:{name:'مدرسه نمونه'},company_snapshot:{name:'شرکت نمونه'},
 body:'شرح شکایت',status:'pending',events:[{action:'created',actor_name:'بازرس',body:'ثبت شد'}]
});
assert(html.startsWith('<!doctype html>'));
assert(html.includes('size:A4'));
assert(html.includes('brand-khatyar.png'));
assert(html.includes('کد QR رهگیری'));
assert(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
assert(!html.includes('<script>alert(1)</script>'));
assert(html.includes('مدرسه نمونه'));
assert(html.includes('شرکت نمونه'));
assert(html.includes('ثبت شد'));
w.testPrint({tracking_code:code},true);
assert(html.includes('رسید ثبت شکایت سرویس مدارس'));
assert(!html.includes('مشخصات شاکی'));
console.log('School complaint print smoke checks passed');
