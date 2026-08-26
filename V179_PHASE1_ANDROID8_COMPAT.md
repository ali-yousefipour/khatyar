# V179 - Phase 1 Android 8+ stability

Implemented without changing Expo, React Native, Gradle, Kotlin or plugin versions:

- Deferred startup of camera/location/security adjunct components until after the first UI interactions.
- Isolated every deferred runtime service in its own ErrorBoundary.
- Added Android API compatibility helpers for Android 8/9 background location permission behavior.
- Prevented concurrent/repeated location tracking initialization.
- Deferred authenticated telemetry, push, polling and location startup to reduce cold-start pressure on Android 8–10 devices.
- Fixed PermissionGuard effect dependency so permission state follows the current user exemption state.
- Kept the safe ImagePicker wrapper and no-op legacy imagePickerGuard.

Validation in this environment is static/syntax-level. Device or emulator runtime testing is still required for definitive native crash verification.
