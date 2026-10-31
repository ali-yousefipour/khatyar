const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const native=fs.readFileSync(path.join(root,'mobile/src/components/VehicleIdentityFields.js'),'utf8');
const web=fs.readFileSync(path.join(root,'php/app/assets/personnel-vehicle-web.js'),'utf8');
const css=fs.readFileSync(path.join(root,'php/app/assets/android-web-ux.css'),'utf8');
assert.match(native,/plateFrame:\{flexDirection:'row',direction:'ltr'/);
assert.match(native,/carFlag:\{width:29,height:19/);
for(const key of ['plate_part_left','plate_letter','plate_part_right','plate_iran']){
 assert.match(native,new RegExp('data\\.'+key));
 assert.match(web,new RegExp("'"+key+"'"));
}
assert.match(web,/id="pva-\$\{key\}"/);
assert.match(web,/else h\+=carPlateHtml\(d\)/);
assert.match(web,/select id="pva-plate_letter"/);
assert.match(web,/plateLetters\.map|letters\.map/);
assert.match(css,/#pva \.pva-carplate \{ direction:ltr;/);
assert.match(css,/#pva \.pva-car-region \{ border-left:3px/);
assert.match(css,/#pva \.pva-carplate :is\(input,select\):focus-visible/);
console.log('PASS inspector car plate: school-service layout, editable letter, stable storage keys');
