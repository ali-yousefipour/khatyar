const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(require('path').join(__dirname,'../src/screens/RequestsScreen.js'),'utf8');
const expression=source.match(/const needsSubstitute\s*=\s*([^;]+);/)[1];
for(const type of ['annual','sick','mission','overtime','manual'])for(const unit of ['daily','hourly'])assert.equal(vm.runInNewContext(expression,{type,unit}),type==='annual'&&unit==='daily',type+'/'+unit);
console.log('PASS mobile substitute selector gate: daily annual leave only');
