KHATYAR REPOSITORY SELECTION
============================

The one-click build now scans every configured repository before npm install.

NPM priority groups:
1. Iranian: Runflare (https://npm.runflare.com/)
2. External fallback: npmmirror, npm official, Yarn registry

Android/Gradle mirror:
- Myket Maven (https://maven.myket.ir/) is tested separately because it is a
  Maven repository and cannot be used as an npm registry.

Selection flow:
1. npm ping is executed for ALL npm registries.
2. npm view expo-camera version is executed for every registry that passed ping.
3. Healthy Iranian registries rank before all external registries.
4. Inside the same group, lower measured ping time ranks first.
5. npm install automatically tries the full healthy queue in order.
6. Myket Gradle injection is enabled only when its probe succeeds.
7. If Myket is unavailable, Gradle uses google() and mavenCentral() fallbacks.

Diagnostics created in mobile:
- .registry-health.json
- .registry-health.txt

Run a full scan again:
  powershell -NoProfile -ExecutionPolicy Bypass -File .\BUILD-ONE-CLICK.ps1 -Fresh
