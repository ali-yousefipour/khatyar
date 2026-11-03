const { withAndroidManifest, withMainApplication, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');
const PACKAGE = 'ir.mashhad.taxicontrol.alarm';

module.exports = config => {
  config = withDangerousMod(config, ['android', async cfg => {
    const root = cfg.modRequest.platformProjectRoot;
    const source = path.join(cfg.modRequest.projectRoot, 'plugins', 'theft-alarm');
    const dest = path.join(root, 'app', 'src', 'main', 'java', ...PACKAGE.split('.'));
    fs.mkdirSync(dest, { recursive: true });
    for (const name of ['KhatyarAlarmPackage.java', 'KhatyarAlarmModule.java', 'KhatyarAlarmService.java']) {
      fs.copyFileSync(path.join(source,name),path.join(dest,name));
    }
    const raw=path.join(root,'app','src','main','res','raw');
    fs.mkdirSync(raw,{recursive:true});
    fs.copyFileSync(path.join(cfg.modRequest.projectRoot,'assets','alarm.mp3'),path.join(raw,'khatyar_theft_siren.mp3'));
    return cfg;
  }]);
  config = withAndroidManifest(config, cfg => {
    const m=cfg.modResults.manifest;
    m['uses-permission']=m['uses-permission']||[];
    for(const name of ['android.permission.FOREGROUND_SERVICE','android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK','android.permission.WAKE_LOCK']) {
      if(!m['uses-permission'].some(p=>p.$?.['android:name']===name))m['uses-permission'].push({$:{'android:name':name}});
    }
    const app=m.application[0];app.service=app.service||[];
    const service='ir.mashhad.taxicontrol.alarm.KhatyarAlarmService';
    if(!app.service.some(x=>x.$?.['android:name']===service))app.service.push({$:{'android:name':service,'android:exported':'false','android:foregroundServiceType':'mediaPlayback','android:stopWithTask':'false'}});
    return cfg;
  });
  return withMainApplication(config, cfg => {
    let code=cfg.modResults.contents;
    if(!code.includes('KhatyarAlarmPackage')) {
      const imp=cfg.modResults.language==='kt'?'import ir.mashhad.taxicontrol.alarm.KhatyarAlarmPackage':'import ir.mashhad.taxicontrol.alarm.KhatyarAlarmPackage;';
      code=code.replace(/^(package[^\n]+)/m,`$1\n${imp}`);
      if(cfg.modResults.language==='kt')code=code.replace('PackageList(this).packages','PackageList(this).packages.apply { add(KhatyarAlarmPackage()) }');
      else code=code.replace('new PackageList(this).getPackages()','new PackageList(this).getPackages() {{ add(new KhatyarAlarmPackage()); }}');
    }
    cfg.modResults.contents=code;
    return cfg;
  });
};
