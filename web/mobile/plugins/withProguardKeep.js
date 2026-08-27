const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// این قوانین فقط وقتی واقعاً اثر دارند که enableProguardInReleaseBuilds در
// app.config.js دوباره true شود. نگه‌داشتن‌شان این‌جا بی‌ضرر است و اگر روزی
// minification را فعال کردید، از تکرار همان کرش استارت‌آپ جلوگیری می‌کند.
module.exports = function withProguardKeep(config) {
  return withDangerousMod(config, ['android', async (cfg) => {
    const file = path.join(cfg.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const marker = '# TAXI_RN_CORE_KEEP';
    let content = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    if (!content.includes(marker)) {
      content += `
${marker}
# Reanimated / Worklets — reflection-heavy JNI bridge
-keep class com.swmansion.reanimated.** { *; }
-dontwarn com.swmansion.reanimated.**
-keep class com.swmansion.worklets.** { *; }
-dontwarn com.swmansion.worklets.**

# React Native New Architecture (TurboModules/Fabric) module registry
-keep class com.facebook.react.turbomodule.core.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}
-keepclassmembers class * {
    native <methods>;
}

# Expo Modules Core — modules are looked up by name via reflection
-keep class expo.modules.** { *; }
-dontwarn expo.modules.**

# Hermes
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }
`;
      fs.writeFileSync(file, content);
    }
    return cfg;
  }]);
};
