const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ui=fs.readFileSync(path.join(__dirname,'../app/assets/school-service-admin.js'),'utf8');
const routes=fs.readFileSync(path.join(__dirname,'../lib/routes.php'),'utf8');

assert.match(ui,/ssvVehicleSearchPlateHtml\('inspection'\)/,'Inspections need a realistic plate-search control');
assert.match(ui,/\.\.\.ssvPlateSearchParams\(inspectionParts\)/,'Each plate segment must be sent independently');
assert.match(ui,/ssv-inspections-scroll\{max-height:/,'Inspections must have a bounded scroll area');
assert.match(ui,/ssv-inspections-scroll \.ssv-inspections-table thead th\{position:sticky;top:0/,'Headers must remain sticky');
assert.match(ui,/ssvBindVehicleSort\(b\.querySelector\('#ssv-list'\),inspectionSort/,'Inspections must wire sorting controls');
assert.match(ui,/ssvShowInspectionPhotos\(r\.id\)/,'Photo indicator must open an image modal');
const endpoint=routes.split("route('GET','/api/school-service/inspections-page'")[1]?.split("route('GET','/api/school-service/config'")[0];
assert.ok(endpoint,'Inspections endpoint exists');
assert.match(endpoint,/i\.\$segment LIKE \?/,'Inspections filter each plate segment against the correct field');
assert.match(endpoint,/\$sortColumns=\[/,'Inspections sort only on whitelisted SQL expressions');
assert.match(endpoint,/ORDER BY \$sortExpr \$sortDir,i\.id DESC/,'Sorting applies before pagination and uses a stable tiebreaker');
console.log('PASS inspections: segmented search, server sorting, sticky scrolling, photos modal');
