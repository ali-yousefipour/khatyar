'use strict';
/* node php/tools/test_school_complaint_assets.cjs */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('app/panel.html');
const source=read('tools/panel_source.jsx');
const bundle=read('app/assets/panel.bundle.js');
const moduleCode=read('app/assets/school-complaints-admin.js');
for(const asset of ['school-complaints-qr.js','school-complaints-pdf.js']){
 assert(html.includes('assets/'+asset+'?v='),'Missing '+asset+' in deployed admin shell');
 assert(fs.statSync(path.join(root,'app/assets',asset)).size>0,'Empty '+asset);
}
assert(html.indexOf('school-complaints-qr.js')<html.indexOf('school-complaints-pdf.js'),'QR must load before PDF');
assert(source.includes('/assets/school-complaints-admin.js?v='),'Source does not load school complaint UI');
assert(bundle.includes('/assets/school-complaints-admin.js?v='),'Bundle does not load school complaint UI');
for(const extension of ['js','css']){
 const expression=new RegExp('school-complaints-admin\\.'+extension+'\\?v=([^"\\s]+)');
 const sourceKey=source.match(expression)?.[1],bundleKey=bundle.match(expression)?.[1];
 assert(sourceKey&&bundleKey&&sourceKey===bundleKey,'Source/bundle asset version differs for '+extension);
}
assert(moduleCode.includes('KhatyarSchoolPdf.download'),'PDF action is not connected');
assert(moduleCode.includes('KhatyarSchoolQR.svg'),'QR action is not connected');
console.log('School complaint asset and cache wiring checks passed');
