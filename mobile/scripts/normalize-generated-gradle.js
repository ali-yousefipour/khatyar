#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const root=process.argv[2];
if(!root) throw new Error('Android project path is required');
const files=['build.gradle','settings.gradle','app/build.gradle'];
let changed=0;
for(const rel of files){
 const f=path.join(root,rel); if(!fs.existsSync(f)) continue;
 let s=fs.readFileSync(f,'utf8'); const before=s;
 s=s.replace(/(^|\n)(\s*)url\s+(['\"])(https?:\/\/[^'\"]+)\3\s*(?=\n|\r?\n|$)/g,(m,a,indent,q,u)=>`${a}${indent}url = uri(${q}${u}${q})`);
 if(s!==before){fs.writeFileSync(f,s,'utf8');changed++;console.log(`[gradle-normalize] updated ${rel}`);}
}
console.log(`[gradle-normalize] changed-files=${changed}`);
