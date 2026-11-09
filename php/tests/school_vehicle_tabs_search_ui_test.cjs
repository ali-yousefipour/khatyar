const assert=require('node:assert/strict');
const fs=require('node:fs');
const ui=fs.readFileSync(require('node:path').join(__dirname,'../app/assets/school-service-admin.js'),'utf8');
const routes=fs.readFileSync(require('node:path').join(__dirname,'../lib/routes.php'),'utf8');

assert.match(ui,/ssvVehicleSearchPlateHtml\('unauthorized'\)/,'Unauthorized tab must have a segmented plate search');
assert.match(ui,/\.\.\.ssvPlateSearchParams\(unauthorizedParts\)/,'Unauthorized plate segments must be sent independently');
assert.match(ui,/\.\.\.ssvPlateSearchParams\(searchParts\)/,'Regular plate segments must be sent independently');
assert.match(ui,/ssv-unauthorized-clear/,'Unauthorized search must be clearable');
assert.match(ui,/ssv-unauthorized-table/,'Unauthorized list must use the scrollable vehicle table');
assert.match(ui,/ssv-vehicle-search-plate \.ssv-plate-editor\{width:min\(100%,330px\);height:50px/,'Plate search must be compact');
assert.match(ui,/ssv-vehicles-table thead th\{position:sticky;top:0/,'Table header must remain visible on scroll');
const endpoint=routes.split("route('GET','/api/school-service/unauthorized-vehicles'")[1]?.split("route('POST','/api/school-service/unauthorized-vehicles'")[0];
assert.ok(endpoint,'Unauthorized vehicles endpoint must exist');
assert.match(endpoint,/\$_GET\['search'\]/,'Endpoint must accept search');
assert.match(endpoint,/CONCAT\(v\.plate_two,v\.plate_letter,v\.plate_three,v\.plate_region_code\) LIKE \?/,'Endpoint must filter complete plate');
assert.match(endpoint,/v\.\$segment LIKE \?/,'Endpoint must filter each plate segment in its own column');
assert.match(endpoint,/WHERE \$where ORDER BY/,'Filtered rows and count must share the same predicate');
console.log('PASS school vehicle tabs: compact plate search, unauthorized filtering, scrollable sticky tables');
