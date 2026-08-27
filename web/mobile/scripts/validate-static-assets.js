#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const allowed = new Set(['.js','.jsx','.ts','.tsx']);
const missing = [];
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(['node_modules','android','.git','.expo','.build-logs'].includes(ent.name)) continue;
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(p);
    else if(allowed.has(path.extname(ent.name).toLowerCase())){
      const txt=fs.readFileSync(p,'utf8');
      const re=/require\(\s*['"]([^'"]+\.(?:png|jpe?g|webp|gif|ttf|otf|mp3|wav))['"]\s*\)/gi;
      let m;
      while((m=re.exec(txt))){
        const target=path.resolve(path.dirname(p),m[1]);
        if(!fs.existsSync(target)) missing.push(`${path.relative(root,p)} -> ${m[1]}`);
      }
    }
  }
}
walk(root);
if(missing.length){
  console.error('[asset-validation] Missing static assets:');
  for(const x of missing) console.error(' - '+x);
  process.exit(1);
}
console.log('[asset-validation] All statically required assets exist.');
