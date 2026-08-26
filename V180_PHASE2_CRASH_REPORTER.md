# V180 - Phase 2 Crash Reporter

Implemented:
- Global JavaScript error handler and unhandled Promise rejection capture.
- React ErrorBoundary persistence with copy/send actions.
- Local crash queue (maximum 20 reports) using AsyncStorage.
- Crash metadata: app/build version, Android version, model/manufacturer, active route and last API request.
- User screen for viewing, copying, sharing, deleting and sending reports.
- Automatic retry of unsent reports after app startup.
- Authenticated backend endpoint `POST /api/crash-reports`.
- PostgreSQL table `mobile_crash_reports` with useful indexes.

Limit:
- A pure native process crash that terminates Android before JavaScript runs cannot always be captured by a JavaScript-only reporter. Such cases still require Android Logcat or a native crash SDK.
