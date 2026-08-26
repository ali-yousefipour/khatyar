# PROJECT STATUS V1.0.9

## Completed in this build
- Manual line selection removed from check-in UI.
- Auto line detection moved to server authority.
- Check-in accepts presence in any assigned line.
- App display still shows detected nearest line for information only.
- Server protects against stale or forged `line_id` from older clients.

## Remaining operational tasks
- Field test GPS detection on real devices.
- Validate geofence polygons/radius for all lines.
- Test check-in when two assigned line areas overlap.
- Build final production web bundle and remove browser Babel.
