const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// اطمینان از اینکه فایل‌های صوتی (آلارم صحت‌سنجی) در bundle قرار می‌گیرند
if (!config.resolver.assetExts.includes('mp3')) {
  config.resolver.assetExts.push('mp3');
}
if (!config.resolver.assetExts.includes('wav')) {
  config.resolver.assetExts.push('wav');
}

module.exports = config;
