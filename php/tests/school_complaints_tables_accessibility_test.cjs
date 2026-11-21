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
const html=fs.readFileSync(path.join(root,'app/panel.html'),'utf8');
const version=(text,ext)=>text.match(new RegExp('school-complaints-admin\\\\.'+ext+'\\\\?v=([\\\\w.-]+)'))?.[1];
for (const ext of ['js','css']) {
 const fallback=[panel,built].map(text=>version(text,ext));
 assert.ok(fallback.every(Boolean),'legacy lazy-loader remains versioned: '+ext);
 assert.equal(new Set(fallback).size,1,'source and compiled lazy loader match');
 const active=[html,portal].map(text=>version(text,ext));
 assert.ok(active.every(Boolean),'panel and portal load refreshed complaints asset: '+ext);
 assert.equal(new Set(active).size,1,'panel and portal use same refreshed asset key');
 assert.equal(active[0],'20261121.notify1','new complaints asset version must be cache-busted');
}
assert.ok(html.indexOf('school-complaints-admin.js?v=20261121.notify1')<html.indexOf('panel.bundle.js'),
 'refreshed module must load before the compiled panel launcher');
console.log('PASS complaints tables responsive cards, keyboard scroll and versioned modules');
