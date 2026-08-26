module.exports = function (api) {
  api.cache(true);

  // Expo SDK 57 configures the Worklets/Reanimated Babel plugin through
  // babel-preset-expo. Keeping only the official preset avoids duplicate
  // plugin loading and makes Metro dependency resolution more reliable.
  return {
    presets: ['babel-preset-expo'],
  };
};
