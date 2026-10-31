const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../lib/routes.php'),'utf8');

// Server-side scope must be applied before LIMIT, to both list and XLSX export.
assert.match(source,/function _req_report_filter\(array \$query,\?array \$viewer=null\)/);
assert.match(source,/\$viewer\['role_title'\]/);
assert.doesNotMatch(source,/strtolower\(trim\(\(string\)\(\$viewer\['username'\]/);
assert.match(source,/r\.pending_on=\? OR r\.approver_id=\?/);
assert.match(source,/EXISTS \(SELECT 1 FROM request_approval_steps ras WHERE ras\.request_id=r\.id AND ras\.actor_id=\?\)/);
assert.doesNotMatch(source,/r\.status IN \('approved','rejected'\) OR/);
assert.match(source,/\$where,\$args\]=_req_report_filter\(\$_GET,\$u\)/g);
assert.equal((source.match(/\$where,\$args\]=_req_report_filter\(\$_GET,\$u\)/g)||[]).length,2);
assert.match(source,/function _req_admin_can_view_request\(array \$viewer,array \$request\)/);
assert.match(source,/if\(!_req_admin_can_view_request\(\$u,\$row\)\)/);
assert.match(source,/if\(!_req_admin_can_view_request\(\$u,\$request\)\)/);
assert.match(source,/if\(!_req_is_root_admin\(\$u\)&&\(\$req\['status'\]!=='pending'/);
assert.match(source,/\(int\)\(\$r\['pending_on'\]\?\?0\)!==\(int\)\$u\['id'\]/);

console.log('PASS request visibility guard by assigned recipient and approver history, general director scope, details, decisions and export');
