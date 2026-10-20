const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// اطمینان از اینکه فایل‌های صوتی (آلارم صحت‌سنجی) در bundle قرار می‌گیرند
if (!config.resolver.assetExts.includes('mp3')) {
  config.resolver.assetExts.push('mp3');
}
if (!config.resolver.assetExts.includes('wav')) {
  config.resolver.assetExts.push('wav');
}

// Metro treats asset extensions case-sensitively. The bundled payroll font
// is tracked as B NAZANIN.TTF (uppercase extension).
if (!config.resolver.assetExts.includes('TTF')) {
  config.resolver.assetExts.push('TTF');
}

module.exports = config;
