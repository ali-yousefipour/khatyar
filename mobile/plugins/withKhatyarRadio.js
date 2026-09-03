const { withAndroidManifest, withMainApplication, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PKG = 'ir.mashhad.taxicontrol.radio';
const SERVICE = `${PKG}.KhatyarRadioService`;

function ensureSourceFiles(config) {
  return withDangerousMod(config, ['android', async cfg => {
    const root = cfg.modRequest.platformProjectRoot;
    const dir = path.join(root, 'app', 'src', 'main', 'java', ...PKG.split('.'));
    fs.mkdirSync(dir, { recursive: true });
    const srcRoot = path.join(cfg.modRequest.projectRoot, 'plugins', 'khatyar-radio-native');
    for (const name of ['KhatyarRadioPackage.java', 'KhatyarRadioModule.java', 'KhatyarRadioService.java']) {
      const source = path.join(srcRoot, name);
      const target = path.join(dir, name);
      if (!fs.existsSync(source)) throw new Error(`Missing KhatYar radio native source: ${source}`);
      fs.copyFileSync(source, target);
    }
    return cfg;
  }]);
}

function withManifest(config) {
  return withAndroidManifest(config, cfg => {
    const manifest = cfg.modResults.manifest;
    manifest['uses-permission'] = manifest['uses-permission'] || [];
    for (const name of ['android.permission.FOREGROUND_SERVICE','android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK','android.permission.FOREGROUND_SERVICE_MICROPHONE','android.permission.RECORD_AUDIO','android.permission.WAKE_LOCK','android.permission.POST_NOTIFICATIONS']) {
      if (!manifest['uses-permission'].some(x => x.$ && x.$['android:name'] === name)) manifest['uses-permission'].push({ $:{'android:name':name} });
    }
    const app = manifest.application && manifest.application[0];
    if (app) {
      app.$=app.$||{}; app.$['android:supportsRtl']='true'; app.service=app.service||[];
      const existing=app.service.find(x=>x.$&&x.$['android:name']===SERVICE);
      const item={$:{'android:name':SERVICE,'android:exported':'false','android:foregroundServiceType':'mediaPlayback|microphone','android:stopWithTask':'false','android:description':'دریافت و پخش بی‌سیم خطیار و کنترل PTT در پس‌زمینه'}};
      if(existing)existing.$=item.$;else app.service.push(item);
    }
    return cfg;
  });
}

function withMainApp(config) {
  return withMainApplication(config, cfg => {
    let src=cfg.modResults.contents;
    if(cfg.modResults.language==='kt'){
      if(!src.includes('ir.mashhad.taxicontrol.radio.KhatyarRadioPackage')){
        const m=src.match(/^package[^\n]+/m); src=m?src.replace(m[0],`${m[0]}\n\nimport ir.mashhad.taxicontrol.radio.KhatyarRadioPackage`):`import ir.mashhad.taxicontrol.radio.KhatyarRadioPackage\n${src}`;
        if(src.includes('PackageList(this).packages'))src=src.replace('PackageList(this).packages','PackageList(this).packages.apply { add(KhatyarRadioPackage()) }');
      }
      if(!src.includes('I18nUtil.getInstance().allowRTL(this, true)')){
        const imp='import com.facebook.react.modules.i18nmanager.I18nUtil';
        if(!src.includes(imp)){const m=src.match(/^package[^\n]+/m);src=m?src.replace(m[0],`${m[0]}\n${imp}`):`${imp}\n${src}`;}
        if(src.includes('override fun onCreate() {'))src=src.replace('override fun onCreate() {','override fun onCreate() {\n    // __khatyar_rtl__\n    I18nUtil.getInstance().allowRTL(this, true)\n    I18nUtil.getInstance().forceRTL(this, true)');
      }
    }else{
      if(!src.includes('ir.mashhad.taxicontrol.radio.KhatyarRadioPackage')){
        const m=src.match(/^package[^\n]+/m);src=m?src.replace(m[0],`${m[0]}\n\nimport ir.mashhad.taxicontrol.radio.KhatyarRadioPackage;`):`import ir.mashhad.taxicontrol.radio.KhatyarRadioPackage;\n${src}`;
        if(src.includes('new PackageList(this).getPackages()'))src=src.replace('new PackageList(this).getPackages()','new PackageList(this).getPackages() {{ add(new KhatyarRadioPackage()); }}');
      }
      if(!src.includes('I18nUtil.getInstance().allowRTL(this, true)')){
        const imp='import com.facebook.react.modules.i18nmanager.I18nUtil;';
        if(!src.includes(imp)){const m=src.match(/^package[^\n]+/m);src=m?src.replace(m[0],`${m[0]}\n${imp}`):`${imp}\n${src}`;}
        if(src.includes('public void onCreate() {'))src=src.replace('public void onCreate() {','public void onCreate() {\n    // __khatyar_rtl__\n    I18nUtil.getInstance().allowRTL(this, true);\n    I18nUtil.getInstance().forceRTL(this, true);');
      }
    }
    cfg.modResults.contents=src; return cfg;
  });
}

module.exports=config=>withMainApp(withManifest(ensureSourceFiles(config)));
