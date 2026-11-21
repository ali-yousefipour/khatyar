'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'app/assets/school-complaints-admin.js'),'utf8');
const css=fs.readFileSync(path.join(root,'app/assets/school-complaints-admin.css'),'utf8');
const panel=fs.readFileSync(path.join(root,'tools/panel_source.jsx'),'utf8');
const built=fs.readFileSync(path.join(root,'app/assets/panel.bundle.js'),'utf8');
const access=(js.match(/className:'sc-table',role:'region',tabIndex:0,'aria-label':/g)||[]).length;
assert.equal(access,2,'both complaints list and account table have keyboard-scrollable named regions');
for(const name of ['جدول حساب‌های اختصاصی شکایات','فهرست پرونده‌های شکایات'])
 assert.ok(js.includes(name),'missing table region name '+name);
for(const term of ['sc-responsive-table',"'data-label':'نام'", "'data-label':'کد رهگیری'"])
 assert.ok(js.includes(term),'mobile table cells must preserve visible text labels '+term);
assert.match(css, /\.sc-module \.sc-table\[role="region"\]:focus-visible/,'keyboard region requires a visible focus ring');
assert.match(css, /max-width:390px/,'report card labels must work on narrow 320/375 screens');
const portal=fs.readFileSync(path.join(root,'app/school-complaints-portal.html'),'utf8');
const versions=extension=>[panel,built,portal].map(text=>text.match(new RegExp('school-complaints-admin\\.'+extension+'\\?v=([\\w.-]+)'))?.[1]);
for(const extension of ['js','css']){
 const found=versions(extension);
 assert.ok(found.every(Boolean),'versioned complaints '+extension+' is present in panel, bundle and standalone portal');
 assert.equal(new Set(found).size,1,'complaints '+extension+' asset cache keys must match across all entrypoints');
}
assert.equal(versions('js')[0],versions('css')[0],'JS and CSS should share a release key');
console.log('PASS complaints tables responsive cards, keyboard scroll and versioned modules');
