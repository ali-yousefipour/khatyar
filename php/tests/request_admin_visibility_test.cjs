const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../lib/routes.php'),'utf8');

// Server-side scope must be applied before LIMIT, to both list and XLSX export.
assert.match(source,/function _req_report_filter\(array \$query,\?array \$viewer=null\)/);
assert.match(source,/r\.status IN \('approved','rejected'\) OR \(r\.status='pending' AND r\.pending_on=\?\)/);
assert.match(source,/\$args\[\]=\(int\)\(\$viewer\['id'\]\?\?0\)/);
assert.match(source,/\$where,\$args\]=_req_report_filter\(\$_GET,\$u\)/g);
assert.equal((source.match(/\$where,\$args\]=_req_report_filter\(\$_GET,\$u\)/g)||[]).length,2);
assert.match(source,/function _req_admin_can_view_request\(array \$viewer,array \$request\)/);
assert.match(source,/if\(!_req_admin_can_view_request\(\$u,\$row\)\)/);
assert.match(source,/if\(!_req_admin_can_view_request\(\$u,\$request\)\)/);
assert.match(source,/if\(!_req_is_root_admin\(\$u\)&&\(\$req\['status'\]!=='pending'/);
assert.match(source,/\(int\)\(\$r\['pending_on'\]\?\?0\)!==\(int\)\$u\['id'\]/);

console.log('PASS request visibility guard on pending items, detail, decisions and export');
