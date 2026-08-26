# Project Status — v1.0.15

## Version

- App: `1.0.15`
- Site: `103`
- Android versionCode: `10015`
- Phase: `7.12`

## Status

The bot subsystem is now generalized from a Bale-only workflow into a shared messenger workflow for Bale, Telegram and Eitaa.

## Completed

- Unified bot features across Bale, Telegram and Eitaa.
- Shared menu management.
- Shared custom replies.
- Shared registration/request forms.
- National-code account binding.
- Driver/user auto-prefill in forms.
- Platform-specific subscribers and logs.
- Platform-specific webhooks.
- Admin panel platform tabs.
- Cross-messenger notification hub.
- Queue retry support for Telegram and Eitaa.
- Upgrade consolidation in `php/public/upgrade.php`.

## Remaining

- Register Telegram webhook with real production token.
- Register Eitaa webhook with real production token/API gateway.
- Test real chat IDs and account binding on all three messengers.
- Test form submission and review notifications on all three messengers.
- Verify Eitaa API base/mode with the selected provider.
- Remove browser Babel before final production delivery.
