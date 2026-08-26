<?php
// Compatibility entrypoint for the Android API base (/api).
// The canonical implementation lives one level above so the web app can keep
// using /line-location-api.php while Android can call /api/line-location-api.php.
require __DIR__ . '/../line-location-api.php';
