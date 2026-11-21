'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'../app/assets/khatyar-emerald-system.css'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../app/panel.html'),'utf8');
const marker=css.indexOf('WEB-UX-010');
assert.ok(marker>=0,'shared design improvements must exist in canonical emerald stylesheet');
const layer=css.slice(marker);
assert.match(html,/khatyar-emerald-system\.css\?v=20261121\.unified2/,'the new style version is cache busted');
assert.ok(html.indexOf('panel.bundle.css')<html.indexOf('khatyar-emerald-system.css'),'canonical design layer overrides base panel styles');
for(const key of ['--kh-type-body','--kh-type-caption','--kh-control-height','--kh-text','--kh-border','--kh-focus']){
 assert.ok(layer.includes(key),'design token missing: '+key);
}
for(const selector of ['.layout .page-content','.layout .modal','.sc-module','.layout .page-content table','.sc-module .sc-table']){
 assert.ok(layer.includes(selector),'visual consistency must cover '+selector);
}
assert.match(layer,/font-family: "Vazirmatn", Tahoma, sans-serif/,'Persian text uses existing bundled font');
assert.match(layer,/font-size: 0\.9375rem/,'inputs have readable size');
assert.match(layer,/min-height: var\(--kh-control-height\)/,'touch controls use shared height');
assert.match(layer,/:focus-visible/,'keyboard focus remains visible');
assert.match(layer,/@media screen and \(max-width: 768px\)/,'tablet/mobile layout covered');
assert.match(layer,/@media screen and \(max-width: 430px\)/,'small-screen layout covered');
assert.match(layer,/@media print/,'print exports are not forced into scrolling tables');
assert.match(css,/WEB-UX-011[\s\S]*?\.sc-module \.sc-header :is\(h2,h3,h4,p\)[\s\S]*?color: #fff;/,'complaints green header must retain white readable titles after shared type rules');
assert.doesNotMatch(layer,/\!important/,'shared style must not rely on force overrides');
const withoutComments=layer.replace(/\/\*[\s\S]*?\*\//g,'');
let depth=0;
for(const character of withoutComments){
 if(character==='{')depth++;
 if(character==='}')depth--;
 assert.ok(depth>=0,'CSS closing brace without opening brace');
}
assert.equal(depth,0,'all CSS blocks must be balanced');
console.log('PASS shared typography, controls, focus, tables, modal and responsive CSS contracts');
