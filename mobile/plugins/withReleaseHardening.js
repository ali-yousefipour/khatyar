const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withReleaseHardening(config) {
  config = withAndroidManifest(config, (cfg) => {
    const applications = cfg.modResults?.manifest?.application;
    const app = Array.isArray(applications) ? applications[0] : null;
    if (app) {
      app.$ = app.$ || {};
      app.$['android:allowBackup'] = 'false';
      delete app.$['android:fullBackupContent'];
      delete app.$['android:dataExtractionRules'];
      delete app.$['android:debuggable'];
      app.$['android:usesCleartextTraffic'] = 'false';
      app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    }
    return cfg;
  });

  return withDangerousMod(config, ['android', async (cfg) => {
    const xmlDir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
    fs.mkdirSync(xmlDir, { recursive: true });
    const target = path.join(xmlDir, 'network_security_config.xml');
    const content = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>
`;
    fs.writeFileSync(target, content, { encoding: 'utf8' });
    return cfg;
  }]);
};
