#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
source ../release/myket/signing/signing.env
export MYKET_STORE_FILE="$(pwd)/credentials/taxi-myket-release.keystore"
npm install
node scripts/prepare-myket-release.js
npx expo prebuild --platform android --clean
cd android
./gradlew clean assembleRelease
APK=$(find app/build/outputs/apk -name '*release*.apk' | head -1)
cp "$APK" ../../release/myket/taxi-lines-management-1.2.0-myket.apk
