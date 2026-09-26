#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# توجه: Document Root هاست روی php/app است (نه php/public — که فقط bale-webhook.php را دارد)،
# و panel.html نیز از همان مسیر assets/panel.bundle.js را بارگذاری می‌کند. قبلاً این اسکریپت
# خروجی را در php/public/assets می‌نوشت که هرگز توسط مرورگر بارگذاری نمی‌شد.
APP="$ROOT/app"
SRC="$ROOT/tools/panel_source.jsx"
OUT="$APP/assets/panel.bundle.js"
mkdir -p "$APP/assets"
if ! command -v npx >/dev/null 2>&1; then
  echo "npx not found. Install Node.js and TypeScript to rebuild panel bundle." >&2
  exit 1
fi
npx tsc --allowJs --jsx react --jsxFactory React.createElement --jsxFragmentFactory React.Fragment --target ES2018 --module none --ignoreDeprecations 5.0 --outFile "$OUT" "$SRC"
if [ ! -s "$OUT" ]; then
  echo "ERROR: panel bundle was generated as an empty file." >&2
  exit 1
fi
if head -c 16 "$OUT" | grep -q '^import'; then
  echo "ERROR: panel bundle still contains an ES module import." >&2
  exit 1
fi
if ! grep -q "schoolservice" "$OUT"; then
  echo "ERROR: compiled panel bundle does not contain the school service view. Source/bundle are out of sync." >&2
  exit 1
fi
if grep -q "school-service.png" "$OUT"; then
  echo "ERROR: compiled panel bundle still references the removed school-service.png icon." >&2
  exit 1
fi
echo "Verified: panel bundle is non-empty, browser-compatible, contains schoolservice, and has no stale school-service.png reference."
echo "Built: $OUT"
