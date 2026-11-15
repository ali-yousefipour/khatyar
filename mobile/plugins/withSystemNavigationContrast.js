// Keep Android Back, Home and Recents buttons legible against the light app surface.
// Android 15+ uses edge-to-edge. The root view provides a matching light safe area.
const { withAndroidStyles } = require('@expo/config-plugins');

module.exports = function withSystemNavigationContrast(config) {
  return withAndroidStyles(config, mod => {
    const themes = mod.modResults?.resources?.style || [];
    const theme = themes.find(item => item?.$?.name === 'AppTheme');
    if (!theme) throw new Error('Khatyar navigation contrast: AppTheme is missing');
    const items = theme.item || (theme.item = []);
    const setItem = (name, value) => {
      const existing = items.find(item => item?.$?.name === name);
      if (existing) existing._ = value;
      else items.push({ $: { name }, _: value });
    };
    // Dark navigation icons on our pale mint root and OS contrast scrim on 3-button mode.
    setItem('android:windowLightNavigationBar', 'true');
    setItem('android:navigationBarColor', '#edf8f5');
    setItem('android:enforceNavigationBarContrast', 'true');
    return mod;
  });
};
