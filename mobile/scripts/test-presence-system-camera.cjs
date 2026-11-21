const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', 'src');
const wizard = fs.readFileSync(path.join(root, 'PresenceCheckWizard.js'), 'utf8');
const selfie = fs.readFileSync(path.join(root, 'PersonalPhotoCapture.js'), 'utf8');
const station = fs.readFileSync(path.join(root, 'VehiclesPhotoCapture.js'), 'utf8');

assert.match(wizard, /<PersonalPhotoCapture systemCameraFirst=\{false\}/, 'wizard mounts the inline selfie CameraView directly');
assert.match(wizard, /<VehiclesPhotoCapture systemCameraFirst=\{false\}/, 'wizard mounts the inline rear CameraView directly');
for (const [name, component, permission] of [
  ['selfie', selfie, 'permission'],
  ['station', station, 'perm'],
]) {
  assert.match(component, /autoCameraStarted\.current = true;\s*openSystemCamera\(\)/, `${name} retains optional camera-only Intent fallback`);
  assert.match(component,/!systemCameraFirst \|\| manualSystemCamera/, `${name} skips external camera on inline-first wizard`);
  assert.match(component,/useState\(!systemCameraFirst\)/, `${name} starts CameraView immediately when requested`);
  assert.ok(component.includes(`!${permission}?.granted`), `${name} checks camera permission`);
  assert.match(component, /useState\(false\)/, `${name} starts without an embedded camera`);
  assert.match(component, /waitForCameraRelease\(\)/, `${name} waits for shared lens ownership before starting Android camera app`);
  assert.match(component, /launchCamera\(\{/, `${name} uses the camera-only launcher`);
  assert.match(component, /result\?\.canceled/, `${name} handles cancellation`);
}
assert.match(station, /captureRef\(shotRef, \{ format: 'jpg'/);
assert.match(selfie, /if \(autoConfirm\) \{ await onCapture\(dataUrl\); return; \}/, 'selfie skips in-app confirmation');
assert.match(station, /autoSubmissionStarted\.current = true;\s*confirm\(\)/, 'rear photo submits automatically after watermark is ready');
assert.match(station, /processingOverlay/, 'rear photo is hidden behind a processing state');
assert.doesNotMatch(station, /compressToDataUri\(shot,/, 'Station metadata may not be dropped on capture failure');
assert.match(station, /موقعیت جغرافیایی:/);
assert.match(station, /سامانه خطیار|خطیار \| صحت‌سنجی حضور/);
console.log('PASS: presence wizard directly mounts native CameraView, keeps external fallback and preserves watermark');
