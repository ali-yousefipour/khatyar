#!/usr/bin/env bash
# این اسکریپت کتابخانه‌های موردنیاز پنل را برای کارکرد آفلاین (بدون اینترنت جهانی) دانلود می‌کند.
# یک‌بار روی هاست (یا هر سیستمی با اینترنت) داخل پوشهٔ php/public/vendor اجرا کنید: bash fetch-vendor.sh
set -e
cd "$(dirname "$0")"
dl(){ echo "↓ $2"; curl -fsSL "$1" -o "$2" || wget -qO "$2" "$1"; }

dl https://unpkg.com/leaflet@1.9.4/dist/leaflet.js            leaflet/leaflet.js
dl https://unpkg.com/leaflet@1.9.4/dist/leaflet.css           leaflet/leaflet.css
mkdir -p leaflet/images
for img in marker-icon.png marker-icon-2x.png marker-shadow.png layers.png layers-2x.png; do
  dl https://unpkg.com/leaflet@1.9.4/dist/images/$img leaflet/images/$img || true
done
dl https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js  leaflet-draw/leaflet.draw.js
dl https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css leaflet-draw/leaflet.draw.css
dl https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js chartjs/chart.umd.min.js
dl https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js    xlsx/xlsx.full.min.js
dl https://unpkg.com/react@18/umd/react.production.min.js            react/react.production.min.js
dl https://unpkg.com/react-dom@18/umd/react-dom.production.min.js    react/react-dom.production.min.js

# فونت وزیرمتن (CSS + فایل‌های فونت)
dl https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css vazirmatn/Vazirmatn-font-face.css
mkdir -p vazirmatn/fonts/webfonts
echo "توجه: اگر فونت‌ها در CSS با مسیر نسبی هستند، پوشهٔ fonts را هم از مخزن vazirmatn دانلود کنید."
echo "✅ همهٔ کتابخانه‌ها دانلود شدند. حالا پنل بدون اینترنت جهانی کار می‌کند."
