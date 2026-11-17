<?php
// Hot-path regression: deployment-only schema migrations.
$routes = file_get_contents(__DIR__.'/../lib/routes.php');
$http = file_get_contents(__DIR__.'/../lib/Http.php');
$db = file_get_contents(__DIR__.'/../lib/Db.php');
$index = file_get_contents(__DIR__.'/../app/index.php');
$start = strpos($routes, 'function _ensure_attendance_phase1_schema()');
$end = strpos($routes, 'function _attendance_auto_close_stale', $start);
if ($start === false || $end === false) throw new RuntimeException('Schema guard absent');
$guard = substr($routes, $start, $end-$start);
if (stripos($guard, 'CREATE TABLE') !== false || stripos($guard, 'ALTER TABLE') !== false || stripos($guard, 'SHOW COLUMNS') !== false) {
    throw new RuntimeException('Attendance schema DDL in hot path');
}
$checkin = substr($routes, strpos($routes, "route('POST', '/api/my/checkin'"), 13000);
if (strpos($checkin, 'SHOW COLUMNS FROM staff_attendance') !== false) throw new RuntimeException('Check-in column introspection remains');
$reject = substr($routes, strpos($routes, 'function _attendance_reject_log'), 1200);
if (strpos($reject, 'CREATE TABLE') !== false) throw new RuntimeException('Reject logging performs DDL');
$uuid = substr($http, strpos($http, 'private static function beginClientRequest'), 2800);
if (strpos($uuid, 'CREATE TABLE') !== false) throw new RuntimeException('Idempotency path performs DDL');
if (strpos($db, 'slow_sql operation=') === false) throw new RuntimeException('Slow SQL metrics absent');
if (strpos($index, 'slow_api method=') === false) throw new RuntimeException('Slow API metrics absent');
// Regression: the standalone attendance-punch router must check the signed
// browser device, not a random session for the same user/device type.
$punch = file_get_contents(__DIR__.'/../app/api/admin-attendance-punch.php');
if (strpos($punch, 'AND device_id=? LIMIT 1') === false ||
    strpos($punch, '$deviceId=(string)') === false) {
    throw new RuntimeException('Attendance punch endpoint does not bind the device session');
}
$panel = file_get_contents(__DIR__.'/../tools/panel_source.jsx');
if (strpos($panel, 'if(e.status!==401)throw e;') === false ||
    strpos($panel, 'let _browserRenewalInFlight=null;') === false ||
    strpos($panel, "if(authError&&!me)") === false) {
    throw new RuntimeException('Browser session may be cleared during transient API failures');
}
// Only the personnel attendance report requires a zero-argument click handler.
// Other report components legitimately use a direct onClick={run} callback.
$attendanceStart = strpos($panel, 'function AttendanceDailyReport(');
$attendanceEnd = strpos($panel, 'function ', $attendanceStart + 10);
if ($attendanceStart === false || $attendanceEnd === false || $attendanceEnd <= $attendanceStart) {
    throw new RuntimeException('AttendanceDailyReport component missing');
}
$attendancePanel = substr($panel, $attendanceStart, $attendanceEnd - $attendanceStart);
if (strpos($attendancePanel, 'onClick={()=>run()} disabled={busy||!uid}') === false ||
    strpos($attendancePanel, 'onClick={run} disabled={busy}') !== false) {
    throw new RuntimeException('Attendance report button passes event instead of selected user ID');
}
echo "PASS attendance hot-path DDL removal and metrics\n";
