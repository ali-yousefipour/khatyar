# Final requested changes audit

- Android Help screen exists and is routed from Dashboard.
- Web help page exists and is exposed from the Android-parity dashboard shell.
- Startup cache refresh remains before the staged PermissionGuard.
- PermissionGuard order is Developer Options → 5s → GPS → 5s → VPN → 5s → Mock Location → permissions.
- Android startup displays the native application version.
- Fullscreen signature action is present in Edit Profile.
- Dashboard uses `/my/dashboard`, `/my/stats`, `/my/leaderboard`, `/my/app-items`, and subscription status; station access is sourced from the unified app-items endpoint.
- PHP syntax and JavaScript route references are validated by CI.
- Live MySQL/Production E2E cannot be truthfully claimed by a GitHub source-only workflow; it is explicitly left as a deployment-time verification item.
