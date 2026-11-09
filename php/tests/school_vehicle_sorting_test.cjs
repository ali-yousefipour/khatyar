const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ui=fs.readFileSync(path.join(__dirname,'../app/assets/school-service-admin.js'),'utf8');
const routes=fs.readFileSync(path.join(__dirname,'../lib/routes.php'),'utf8');

const regular=routes.split("route('GET','/api/school-service/vehicles'")[1]?.split("route('PUT','/api/school-service/vehicles'")[0];
const unauthorized=routes.split("route('GET','/api/school-service/unauthorized-vehicles'")[1]?.split("route('POST','/api/school-service/unauthorized-vehicles'")[0];
for(const [name,endpoint] of [['regular',regular],['unauthorized',unauthorized]]){
 assert.ok(endpoint,`${name} endpoint exists`);
 assert.match(endpoint,/\$sortColumns=\[/,`${name} uses a SQL expression allowlist`);
 assert.match(endpoint,/\$_GET\['sort_by'\]/,`${name} receives sort key`);
 assert.match(endpoint,/\$_GET\['sort_dir'\]/,`${name} receives direction`);
 assert.match(endpoint,/ORDER BY \$sortExpr \$sortDir,v\.id DESC LIMIT/,`${name} sorts before pagination, with stable tie-break`);
}
for(const key of ['plate','type','color','passengers','driver','certificate','inspection_count','last_inspection'])assert.ok(regular.includes(`'${key}'=>`),`regular ${key} sortable`);
for(const key of ['plate','type','color','company'])assert.ok(unauthorized.includes(`'${key}'=>`),`unauthorized ${key} sortable`);
assert.match(ui,/function ssvVehicleSortHeading\(/);
assert.match(ui,/function ssvBindVehicleSort\(/);
assert.match(ui,/aria-sort=/);
assert.match(ui,/sort_by:regularSort\.key,sort_dir:regularSort\.dir/);
assert.match(ui,/sort_by:unauthorizedSort\.key,sort_dir:unauthorizedSort\.dir/);
assert.match(ui,/state\.key===key&&state\.dir==='asc'\?'desc':'asc'/);
console.log('PASS school vehicle sorting: both tables, server allowlists, stable pagination');
