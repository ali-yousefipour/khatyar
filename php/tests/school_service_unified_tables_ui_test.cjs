const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ui=fs.readFileSync(path.join(__dirname,'../app/assets/school-service-admin.js'),'utf8');
const routes=fs.readFileSync(path.join(__dirname,'../lib/routes.php'),'utf8');
const sepand=fs.readFileSync(path.join(__dirname,'../lib/school_service_sepand.php'),'utf8');

for(const label of ['فهرست شرکت‌های سرویس مدارس','فهرست مدارس سرویس مدارس','فهرست رانندگان سپند','جدول دسترسی سمت‌ها']){
 assert.ok(ui.includes(label),`${label} needs an accessible scrollable region`);
}
assert.match(ui,/\.ssv-managed-table\{max-height:clamp/,'Unified tables need bounded scrolling');
assert.match(ui,/\.ssv-managed-table thead th\{position:sticky;top:0/,'Table headers need sticky positioning');
assert.match(ui,/ssvBindVehicleSort\(b\.querySelector\('#ssv-list'\),entitySort/,'Companies and schools need sortable headers');
assert.match(ui,/ssvBindVehicleSort\(list,driverSort/,'Sepand drivers need sortable headers');
assert.match(ui,/ssv-entity-district/,'Schools need a district filter');
assert.match(ui,/ssv-entity-profile/,'Companies need a profile-completeness filter');
assert.match(ui,/sepand-driver-size/,'Drivers need configurable pagination');
for(const endpoint of ['companies-page','schools-page']){
 const section=routes.split(`route('GET','/api/school-service/${endpoint}'`)[1]?.split("route('GET','/api/school-service/")[0];
 assert.ok(section,`${endpoint} endpoint exists`);
 assert.match(section,/\$sortColumns=\[/,'Sorting must use a server-side whitelist');
 assert.match(section,/ORDER BY \$sortExpr \$dir/,'Sorting must apply before database pagination');
}
const driverRoute=sepand.split("route('GET','/api/school-service/sepand-drivers'")[1]?.split("route('GET','/api/school-service/sepand-drivers/")[0];
assert.match(driverRoute,/\$sortColumns=\[/,'Driver sorting must use a whitelist');
assert.match(driverRoute,/\$_GET\['page_size'\]/,'Driver page size must be adjustable');
console.log('PASS school service unified tables: filters, server sorting, sticky scroll and pagination');
