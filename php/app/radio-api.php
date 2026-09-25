<?php
// Legacy alias: all current walkie-talkie traffic must use the hardened Radio v2 API.
// Keeping one implementation prevents the legacy endpoint from bypassing channel
// membership, signed audio access, file validation and concurrency protections.
require __DIR__.'/radio-api-v2.php';
