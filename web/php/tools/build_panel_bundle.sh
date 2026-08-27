#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUBLIC="$ROOT/public"
SRC="$ROOT/tools/panel_source.jsx"
OUT="$PUBLIC/assets/panel.bundle.js"
mkdir -p "$PUBLIC/assets"
if ! command -v npx >/dev/null 2>&1; then
  echo "npx not found. Install Node.js and TypeScript to rebuild panel bundle." >&2
  exit 1
fi
npx tsc --allowJs --jsx react --target ES2018 --module none --ignoreDeprecations 6.0 --outFile "$OUT" "$SRC"
echo "Built: $OUT"
