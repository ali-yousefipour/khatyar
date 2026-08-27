# V181 – Phase 3: Multi-signal VPN monitoring

Implemented on top of V180.

- Android 8+ native detection using ConnectivityManager/NetworkCapabilities.TRANSPORT_VPN.
- Tunnel-interface scan (tun/tap/ppp/wg/ipsec/pptp).
- DNS and network-type diagnostics.
- Public IP/country diagnostics; foreign country alone never marks VPN active.
- Periodic monitor with transition-only reporting plus five-minute heartbeat.
- Offline queue and retry.
- Server-authoritative IP, event history, start time and duration.
- New endpoint: POST /api/activity/vpn-status.
- New table: vpn_status_reports and extended user_net_state fields.

Run php/public/upgrade.php once before deploying the updated app.
