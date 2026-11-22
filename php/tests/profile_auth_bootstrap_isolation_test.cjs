'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const routes=fs.readFileSync(path.join(__dirname,'../lib/routes.php'),'utf8');
const section=routes.slice(routes.indexOf('// Keep the optional personnel-form subsystem'), routes.indexOf('// No destructive migration occurs'));
assert(section.includes("parse_url((string)($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH)"),'use request path');
assert(section.includes('if (preg_match('),'only load dependencies for profile paths');
assert(section.includes('my/(?:custom-fields|user-profile-form)|me/(?:profile|complete-profile)|admin/user-profile-form'), 'test path coverage must match PHP bootstrap');
for(const moduleName of ['UserProfileForms.php','UserProfileFormValues.php'])
  assert(section.includes("require_once __DIR__.'/"+moduleName+"'"),moduleName+' should be loaded in protected block');
const pathPattern=/^\/api\/(?:my\/(?:custom-fields|user-profile-form)|me\/(?:profile|complete-profile)|admin\/user-profile-form(?:\/.*)?)$/;
for(const route of ['/api/auth/me','/api/auth/login','/api/session/renew','/api/session/app-login-config','/api/health','/api/admin/dashboard','/api/admin/users'])
  assert(!pathPattern.test(route),'must not bootstrap form dependencies: '+route);
for(const route of ['/api/my/user-profile-form','/api/my/custom-fields','/api/me/profile','/api/me/complete-profile','/api/admin/user-profile-form','/api/admin/user-profile-form/versions'])
  assert(pathPattern.test(route),'personnel module must load for '+route);
const globalCode=routes.slice(0,routes.indexOf('// Keep the optional personnel-form subsystem'));
assert(!/require_once\s+__DIR__\s*\.\s*['"]\/UserProfileForm(?:s|Values)\.php/.test(globalCode),'no global personnel module includes');
console.log('PASS profile module isolation from login and session bootstrap');