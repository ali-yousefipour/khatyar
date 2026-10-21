const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '../..');
const mobile = fs.readFileSync(path.join(root, 'mobile/src/api.js'), 'utf8');
const configFunction = mobile.slice(mobile.indexOf('export async function getAppLoginConfig()'), mobile.indexOf('export async function requestAppLoginOtp')).replace('export ', '');
const html = fs.readFileSync(path.join(root, 'php/app/app.html'), 'utf8');
async function deviceIdentity() {
  const source=fs.readFileSync(path.join(root,'mobile/src/device.js'),'utf8');
  const fn=source.slice(source.indexOf('export async function getDeviceId()'),source.indexOf('export function getDeviceModel')).replace('export ','');
  const values=new Map([['device_id','existing-device']]);let nativeReads=0;
  const context=vm.createContext({
    SecureStore:{getItemAsync:async key=>values.get(key),setItemAsync:async(key,value)=>values.set(key,value)},
    Platform:{OS:'android'},Application:{getAndroidId:()=>{nativeReads++;return 'native-device';}},
  });
  vm.runInContext(fn,context);
  assert.equal(await context.getDeviceId(),'existing-device');
  assert.equal(nativeReads,0); // An update preserves SecureStore and never changes the stored binding.
  values.clear();
  assert.equal(await context.getDeviceId(),'native-device');
  assert.equal(await context.getDeviceId(),'native-device');
  assert.equal(nativeReads,1);
}
for (const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
  if (script[1].trim()) new vm.Script(script[1]);
}
async function mobilePolicy(status, body) {
  const context = vm.createContext({setLastApi(){}, apiBase:()=>'/api', fetchTimeout:async()=>({status,ok:status===200,text:async()=>JSON.stringify(body)})});
  vm.runInContext(configFunction, context);
  return context.getAppLoginConfig();
}
async function webPolicy(method) {
  const requests = [], values = new Map([['device_id','browser-device']]);
  const elements = {err:{},u:{value:'test-user'},'login-password':{value:'correct'},'login-code':{value:'123456'},'login-submit':{}};
  const context = vm.createContext({
    chrome(){}, BRAND:{}, GET:async()=>({method}), esc:String, toFa:String, gpsAvailable:async()=>true,
    document:{getElementById:id=>elements[id]}, navigator:{platform:'test'},
    store:{get:key=>values.get(key),set:(key,value)=>values.set(key,value)}, USER:null,
    POST:async(route,body)=>{requests.push({route,body});return {access:'access',refresh:'refresh',user:{id:1}};},
    render:async()=>{}, nav(){}, _clearApiCache(){}, window:{dispatchEvent(){}}, Event:class {},
  });
  vm.runInContext(html.slice(html.indexOf("let webLogin={"), html.indexOf("let _resetUser=")), context);
  const view=html.slice(html.indexOf('  login:async()=>'),html.indexOf('  dashboard:async()=>'));
  const form=await vm.runInContext(`({${view}}).login()`,context);
  if (!['password','sms_otp','bale_otp'].includes(method)) {
    assert.match(form,/تلاش مجدد/);
    await vm.runInContext('doLogin()',context);
    assert.equal(requests.length,0);
    return;
  }
  if (method==='password') assert.match(form,/id="login-password"/);
  else {assert.doesNotMatch(form,/id="login-password"/);assert.match(form,method==='bale_otp'?/ربات بله/:/پیامک/);}
  await vm.runInContext('doLogin()',context);
  assert.equal(requests[0].route,method==='password'?'/session/start':'/session/otp-request');
  if(method==='password') assert.equal(requests[0].body.password,'correct');
  else {
    await vm.runInContext('doLogin()',context);
    assert.equal(requests[1].route,'/session/otp-verify');
    assert.equal(requests[1].body.device_type,'web');
    assert.equal(requests[1].body.code,'123456');
  }
  assert.equal(values.get('token'),'access');
}
(async()=>{
  await deviceIdentity();
  for(const method of ['password','sms_otp','bale_otp']) {
    assert.equal((await mobilePolicy(200,{method})).method,method);
    await webPolicy(method);
  }
  await assert.rejects(mobilePolicy(404,{}),/API/);
  await assert.rejects(mobilePolicy(500,{error:'server failure'}),/server failure/);
  await assert.rejects(mobilePolicy(200,{method:'invalid'}),/نامعتبر/);
  await webPolicy('invalid');
  console.log('PASS mobile policy methods/errors and actual PWA password/SMS/Bale forms, requests and token persistence; inline JS syntax');
})().catch(error=>{console.error(error);process.exitCode=1;});
