'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../tools/panel_source.jsx'), 'utf8');
const progress = fs.readFileSync(path.join(__dirname, '../app/assets/panel-long-operation-progress.js'), 'utf8');
const shell = fs.readFileSync(path.join(__dirname, '../app/panel.html'), 'utf8');

assert.match(source, /function PanelStartupLoading\(/, 'post-login loading component exists');
assert.match(source, /className="kh-login-startup"/, 'post-login loading has unified class');
assert.match(source, /if\(!authReady\)return <PanelStartupLoading/, 'session restore displays progress');
assert.match(source, /settings: \(opts\)=> GET\('\/admin\/settings',opts\)/, 'settings accepts request timeout options');
assert.match(source, /db\.settings\(\{timeoutMs:15000\}\)/, 'post-login settings request is time bounded');
assert.match(source, /settingsLoadError\.current=e\?\.message/, 'settings failures are persisted without granting permissions');
assert.match(source, /if\(me\.is_admin&&settingsLoadError\.current\)return/, 'settings errors expose a retry view');
assert.match(source, /setAuthRetry\(n=>n\+1\)/, 'settings retry uses the existing session restore flow');

assert.match(source, /if\(!me\)return <Login/, 'failed or absent session still displays login');
assert.match(source, /if\(authError&&!me\)return/, 'network error state remains reachable');
assert.match(source, /if\(me\.is_admin&&!me\.must_change_pw&&\(settingsLoadedFor!==String\(me\.id\)/, 'admin route waits for matching settings');
assert.match(source, /if\(!live\)return;/, 'stale settings response is ignored');
assert.match(source, /setAllowed\(\[\]\);[\s\S]*console\.warn\('Panel settings temporarily unavailable:/, 'role permissions fail closed on initial settings error');
assert.match(source, /\.finally\(\(\)=>\{if\(live\)setSettingsLoadedFor\(identity\);\}\)/, 'loading clears on success or failure');
assert.match(source, /\[me\?\.id,me\?\.role_id,me\?\.is_admin,me\?\.must_change_pw\]/, 'settings reload is scoped to authenticated identity');
assert.match(progress, /\.kh-login-startup\{/, 'shared loading stylesheet includes post-login layout');
assert.match(progress, /\.kh-long-operation-spinner/, 'visual uses the same spinner');
assert.match(shell, /panel-long-operation-progress\.js/, 'progress stylesheet loads before React app');
assert.ok(shell.indexOf('panel-long-operation-progress.js') < shell.indexOf('panel.bundle.js?v='), 'progress script loads first');

assert.match(shell, /id="kh-initial-loader"/, 'first-paint loader remains mounted');
assert.match(shell, /\.kh-loader-stage\{[^}]*width:min\(420px,100%\)/, 'first-paint card uses unified width');
assert.match(shell, /class="kh-loader-spinner"/, 'first-paint loader has motion indicator');
assert.match(shell, /<progress aria-label="پیشرفت راه‌اندازی اولیه"><\\/progress>/, 'first-paint loader uses accessible indeterminate progress');
assert.match(shell, /@media\(prefers-reduced-motion:reduce\)/, 'animations honor reduced motion');
assert.match(shell, /#kh-initial-loader\.kh-loader-hide/, 'loader can dismiss after initial render');
console.log('post-login loading regression contracts passed');
