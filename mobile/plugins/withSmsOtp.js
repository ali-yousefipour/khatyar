const { withDangerousMod, withMainApplication, withAppBuildGradle } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PKG = 'ir.mashhad.taxicontrol.smsotp';
module.exports = config => {
  config = withDangerousMod(config, ['android', async cfg => {
    const dest = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'java', ...PKG.split('.'));
    const source = path.join(cfg.modRequest.projectRoot, 'plugins', 'sms-otp-native');
    fs.mkdirSync(dest, { recursive: true });
    for (const name of ['KhatyarSmsOtpPackage.java', 'KhatyarSmsOtpModule.java'])
      fs.copyFileSync(path.join(source, name), path.join(dest, name));
    return cfg;
  }]);
  config = withAppBuildGradle(config, cfg => {
    const dep = 'com.google.android.gms:play-services-auth-api-phone:18.3.1';
    if (!cfg.modResults.contents.includes(dep))
      cfg.modResults.contents = cfg.modResults.contents.replace(/dependencies\s*\{/, `dependencies {\n    implementation '${dep}'`);
    return cfg;
  });
  return withMainApplication(config, cfg => {
    let source = cfg.modResults.contents;
    if (!source.includes('import ir.mashhad.taxicontrol.smsotp.KhatyarSmsOtpPackage')) {
      source = source.replace(/^(package[^\n]+)/m, '$1\nimport ir.mashhad.taxicontrol.smsotp.KhatyarSmsOtpPackage' + (cfg.modResults.language === 'kt' ? '' : ';'));
    }
    if (cfg.modResults.language === 'kt' && !source.includes('add(KhatyarSmsOtpPackage())'))
      source = source.replace('PackageList(this).packages', 'PackageList(this).packages.apply { add(KhatyarSmsOtpPackage()) }');
    if (cfg.modResults.language !== 'kt' && !source.includes('new KhatyarSmsOtpPackage()'))
      source = source.replace('new PackageList(this).getPackages()', 'new PackageList(this).getPackages() {{ add(new KhatyarSmsOtpPackage()); }}');
    cfg.modResults.contents = source;
    return cfg;
  });
};
