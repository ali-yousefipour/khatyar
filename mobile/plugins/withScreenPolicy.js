const { withDangerousMod, withMainApplication, withMainActivity } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = config => {
  config = withDangerousMod(config, ['android', async cfg => {
    const dest = path.join(cfg.modRequest.platformProjectRoot,'app','src','main','java','ir','mashhad','taxicontrol','screenpolicy');
    const source = path.join(cfg.modRequest.projectRoot,'plugins','screenshot-policy');
    fs.mkdirSync(dest,{recursive:true});
    for (const name of ['KhatyarScreenPolicyModule.java','KhatyarScreenPolicyPackage.java'])
      fs.copyFileSync(path.join(source,name),path.join(dest,name));
    return cfg;
  }]);
  config = withMainApplication(config, cfg => {
    let source = cfg.modResults.contents;
    if (!source.includes('import ir.mashhad.taxicontrol.screenpolicy.KhatyarScreenPolicyPackage'))
      source = source.replace(/^(package[^\n]+)/m, '$1\nimport ir.mashhad.taxicontrol.screenpolicy.KhatyarScreenPolicyPackage' + (cfg.modResults.language === 'kt' ? '' : ';'));
    if (cfg.modResults.language === 'kt' && !source.includes('add(KhatyarScreenPolicyPackage())'))
      source = source.replace('PackageList(this).packages','PackageList(this).packages.apply { add(KhatyarScreenPolicyPackage()) }');
    else if (cfg.modResults.language !== 'kt' && !source.includes('new KhatyarScreenPolicyPackage()'))
      source = source.replace('new PackageList(this).getPackages()','new PackageList(this).getPackages() {{ add(new KhatyarScreenPolicyPackage()); }}');
    cfg.modResults.contents = source;
    return cfg;
  });
  return withMainActivity(config, cfg => {
    const source = cfg.modResults.contents;
    if (source.includes('khatyar_screen_policy')) return cfg;
    const guard = cfg.modResults.language === 'kt'
      ? 'if (getSharedPreferences("khatyar_screen_policy", android.content.Context.MODE_PRIVATE).getBoolean("blocked", false)) window.addFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE)'
      : 'if (getSharedPreferences("khatyar_screen_policy", android.content.Context.MODE_PRIVATE).getBoolean("blocked", false)) getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE);';
    const patched = source.replace(/(super\.onCreate\([^)]*\)\s*;?)/, `${guard}\n    $1`);
    if (patched === source) throw new Error('Screen policy: MainActivity onCreate was not found');
    cfg.modResults.contents = patched;
    return cfg;
  });
};
