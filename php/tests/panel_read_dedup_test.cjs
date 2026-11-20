const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const bundle=fs.readFileSync(path.join(__dirname,'../app/assets/panel.bundle.js'),'utf8');
const start=bundle.indexOf('const _pendingReads'),end=bundle.indexOf('async function downloadProtectedFile',start);
assert.ok(start>0&&end>start);
let calls=0,release;
const ctx=vm.createContext({Map,Date,Promise,localStorage:{token:'A'},API_BASE:'/api',_cache:{},_cacheTtlFor:()=>60000,_fetchWithAuth:()=>{calls++;return new Promise(r=>release=r)},_readJsonResponse:r=>r.json(),setTimeout,clearTimeout,AbortController});
vm.runInContext(bundle.slice(start,end)+'\n'+bundle.match(/function _invalidateCache\(\)\s*\{[^}]*\}/)[0],ctx);
(async()=>{
 const a=ctx.GET('/admin/users'),b=ctx.GET('/admin/users');assert.equal(calls,1);release({ok:true,json:async()=>[1]});await Promise.all([a,b]);await ctx.GET('/admin/users');assert.equal(calls,1);
 ctx._invalidateCache();const c=ctx.GET('/admin/users');assert.equal(calls,2);ctx._invalidateCache();release({ok:true,json:async()=>[2]});await c;const d=ctx.GET('/admin/users');assert.equal(calls,3);release({ok:true,json:async()=>[3]});await d;
 ctx.localStorage.token='B';const e=ctx.GET('/admin/users');assert.equal(calls,4);release({ok:true,json:async()=>[4]});await e;
 console.log('PASS permission-scoped read deduplication and invalidation race');
})().catch(e=>{console.error(e);process.exitCode=1});
