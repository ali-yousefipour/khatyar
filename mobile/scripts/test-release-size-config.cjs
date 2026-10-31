const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobile = path.resolve(__dirname, '..');
const config = require('../app.config.js')({config:{}});
const build = config.plugins.find(x=>Array.isArray(x)&&x[0]==='expo-build-properties')[1].android;
assert.equal(build.enableProguardInReleaseBuilds, false, 'Production R8 must remain off until device tests');
assert.equal(build.enableShrinkResources, false, 'Resource shrink must not run without verified R8');
const abi = fs.readFileSync(path.join(mobile, 'plugins/withReactNativeArchitectures.js'), 'utf8');
assert.match(abi, /TARGET_ARCHITECTURES = 'arm64-v8a'/);
assert.match(abi, /ndk \{ abiFilters 'arm64-v8a' \}/);
const workflow = fs.readFileSync(path.join(mobile, '../.github/workflows/publish-android-release.yml'), 'utf8');
assert.match(workflow, /32-bit native libraries unexpectedly included/);
assert.match(workflow, /Missing arm64-v8a native libraries/);

let all='';
function scan(folder){for(const ent of fs.readdirSync(folder,{withFileTypes:true})){
  const full=path.join(folder,ent.name);
  if(ent.isDirectory()){if(ent.name!=='_legacy_unused')scan(full);}
  else if(/\.(js|jsx|ts|tsx)$/.test(ent.name))all+=fs.readFileSync(full,'utf8')+'\n';
}}
scan(path.join(mobile,'src'));
all+=fs.readFileSync(path.join(mobile,'App.js'),'utf8');
for(const [,folder,name] of all.matchAll(/(?:assets\/)(icons3d|fonts)\/([^'"`)]+)/g)){
  const target=path.join(mobile,'assets',folder,name);
  assert.ok(fs.existsSync(target),`Required local asset was removed: ${folder}/${name}`);
}
for(const name of ['Vazirmatn-Regular.ttf','Vazirmatn-Bold.ttf','B Homa.ttf','B NAZANIN.TTF']){
  assert.ok(fs.existsSync(path.join(mobile,'assets/fonts',name)),`Essential Persian font missing: ${name}`);
}
console.log('PASS arm64-only release contract, R8 safety gate and retained runtime assets');
