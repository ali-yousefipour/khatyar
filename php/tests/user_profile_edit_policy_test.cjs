'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const routes=fs.readFileSync(path.join(root,'lib/routes.php'),'utf8');
const panel=fs.readFileSync(path.join(root,'tools/panel_source.jsx'),'utf8');
const account=fs.readFileSync(path.join(root,'../mobile/src/screens/AccountScreens.js'),'utf8');
const custom=fs.readFileSync(path.join(root,'../mobile/src/screens/CustomFieldsScreen.js'),'utf8');
function routeBlock(method,path,next){
 const start=routes.indexOf("route('"+method+"', '"+path+"'");
 assert(start>=0,method+' '+path+' present');
 const end=next?routes.indexOf(next,start):routes.indexOf("\nroute(",start+10);
 return routes.slice(start,end<0?start+1800:end);
}
assert.match(panel,/allow_android_profile_edit/,'administrator policy visible in settings');
assert.match(routes,/is_bool\(\$b\['allow_android_profile_edit'\]\)/,'policy accepts only real booleans');
const profile=routeBlock('PUT','/api/me/profile');
const fields=routeBlock('POST','/api/my/custom-fields');
assert.match(profile,/allow_android_profile_edit/,'profile write checks live server policy');
assert.match(profile,/Http::error\([^;]+403\)/,'profile write denied as HTTP 403');
assert.match(fields,/allow_android_profile_edit/,'custom values write checks live server policy');
assert.match(fields,/Http::error\([^;]+403\)/,'custom values write denied as HTTP 403');
const full=routeBlock('GET','/api/me/full-profile');
assert.match(full,/profile_edit_allowed/,'profile GET carries view-only flag');
const customGet=routeBlock('GET','/api/my/custom-fields');
assert.match(customGet,/\$editAllowed/,'custom field GET applies live edit policy');
assert.match(account,/profileReadOnly/,'Android renders view-only profile');
assert.match(account,/editable=\{systemCanEdit\('/,'Android disables conditional and readonly inputs');
assert.match(account,/!profileReadOnly&&<TouchableOpacity[^\n]+onPress=\{save\}/,'Android hides save');
assert.match(custom,/editable = visible\.filter/,'custom fields only allow visible and permitted fields');
assert.match(custom,/request\('\/me\/complete-profile'/,'custom fields use versioned unified profile writes');
assert.match(custom,/form_version:formVersion/,'custom fields bind writes to published version');
assert.match(custom,/String\(vals\[f\.id\]\?\?''\)!==String\(originalVals\[f\.id\]\?\?''\)/,'unchanged values are never blindly resubmitted');
assert.match(account,/profile_definition:\{readonly:true/,'unbound legacy fields cannot bypass published schema');
assert.match(custom,/profile_definition:\{readonly:true/,'custom field editor keeps unbound records read-only');

for(const kind of ['time','mobile','phone','email','national_id','iban','account','card','radio','address']){
  assert.match(panel,new RegExp('\\["'+kind+'","'),'form designer exposes '+kind);
  assert.match(routes,new RegExp("'"+kind+"'"),'PHP admin endpoints accept '+kind);
}
assert.match(custom,/field\.ftype === 'time'/,'Android renders time inputs');
assert.match(custom,/field\.ftype === 'address'/,'Android renders multiline address inputs');
console.log('PASS profile edit policy: web settings, server authorization, Android read-only rendering');
