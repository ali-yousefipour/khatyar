const { withAndroidManifest, withMainApplication, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PKG = 'ir.mashhad.taxicontrol.updater';
const MODULE = `${PKG}.KhatyarUpdaterModule`;

function withSources(config) {
  return withDangerousMod(config, ['android', async cfg => {
    const root = cfg.modRequest.platformProjectRoot;
    const dir = path.join(root, 'app', 'src', 'main', 'java', ...PKG.split('.'));
    fs.mkdirSync(dir, { recursive: true });
    const srcRoot = path.join(cfg.modRequest.projectRoot, 'plugins', 'khatyar-updater-native');
    for (const name of ['KhatyarUpdaterPackage.java', 'KhatyarUpdaterModule.java']) {
      const source = path.join(srcRoot, name);
      const target = path.join(dir, name);
      if (!fs.existsSync(source)) throw new Error(`Missing KhatYar updater native source: ${source}`);
      fs.copyFileSync(source, target);
    }
    const valuesDir = path.join(root, 'app', 'src', 'main', 'res', 'xml');
    fs.mkdirSync(valuesDir, { recursive: true });
    fs.writeFileSync(path.join(valuesDir, 'khatyar_file_paths.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<paths xmlns:android="http://schemas.android.com/apk/res/android">\n    <external-path name="external_storage" path="." />\n</paths>\n`, 'utf8');
    return cfg;
  }]);
}

function withManifest(config) {
  return withAndroidManifest(config, cfg => {
    const manifest = cfg.modResults.manifest;
    manifest['uses-permission'] = manifest['uses-permission'] || [];
    const permissions = [
      'android.permission.INTERNET',
      'android.permission.REQUEST_INSTALL_PACKAGES',
      'android.permission.WRITE_EXTERNAL_STORAGE'
    ];
    for (const name of permissions) {
      if (!manifest['uses-permission'].some(x => x.$ && x.$['android:name'] === name)) manifest['uses-permission'].push({ $: { 'android:name': name } });
    }
    const app = manifest.application && manifest.application[0];
    if (app) {
      app.provider = app.provider || [];
      const authority = '${applicationId}.khatyar.fileprovider';
      const exists = app.provider.find(x => x.$ && x.$['android:authorities'] === authority);
      const item = { $: {
        'android:name': 'androidx.core.content.FileProvider',
        'android:authorities': authority,
        'android:exported': 'false',
        'android:grantUriPermissions': 'true'
      }, 'meta-data': [{ $: {
        'android:name': 'android.support.FILE_PROVIDER_PATHS',
        'android:resource': '@xml/khatyar_file_paths'
      }}]};
      if (exists) Object.assign(exists, item); else app.provider.push(item);
    }
    return cfg;
  });
}

function withMainApp(config) {
  return withMainApplication(config, cfg => {
    let src = cfg.modResults.contents;
    const imp = 'import ir.mashhad.taxicontrol.updater.KhatyarUpdaterPackage;';
    if (!src.includes(imp)) {
      const m = src.match(/^package[^\n]+/m);
      src = m ? src.replace(m[0], `${m[0]}\n\n${imp}`) : `${imp}\n${src}`;
    }
    if (cfg.modResults.language === 'kt') {
      if (!src.includes('add(KhatyarUpdaterPackage())') && src.includes('PackageList(this).packages')) {
        src = src.replace('PackageList(this).packages', 'PackageList(this).packages.apply { add(KhatyarUpdaterPackage()) }');
      }
    } else if (!src.includes('new KhatyarUpdaterPackage()') && src.includes('new PackageList(this).getPackages()')) {
      src = src.replace('new PackageList(this).getPackages()', 'new PackageList(this).getPackages() {{ add(new KhatyarUpdaterPackage()); }}');
    }
    cfg.modResults.contents = src;
    return cfg;
  });
}

module.exports = config => withMainApp(withManifest(withSources(config)));
