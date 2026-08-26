# Consumer ProGuard/R8 rules for the local SecurityCheck Expo module.
# Expo module classes are registered through generated autolinking metadata.
-keep class expo.modules.securitycheck.SecurityCheckModule { *; }
