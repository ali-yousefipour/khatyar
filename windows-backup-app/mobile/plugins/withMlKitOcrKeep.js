const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withMlKitOcrKeep(config) {
  return withDangerousMod(config, ['android', async (cfg) => {
    const file = path.join(cfg.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const marker = '# TAXI_MLKIT_OCR_KEEP';
    let content = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    if (!content.includes(marker)) {
      content += `\n${marker}\n-keep class com.google.mlkit.** { *; }\n-dontwarn com.google.mlkit.**\n-keep class com.google.android.gms.internal.mlkit_vision_text_common.** { *; }\n-dontwarn com.google.android.gms.internal.mlkit_vision_text_common.**\n-keep class com.reactnativemlkit.** { *; }\n-dontwarn com.reactnativemlkit.**\n`;
      fs.writeFileSync(file, content);
    }
    return cfg;
  }]);
};
