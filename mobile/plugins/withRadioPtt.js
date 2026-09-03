const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const pkg = 'ir.mashhad.taxicontrol';
const radioPkg = `${pkg}.radio`;

const bridge = `package ${radioPkg}

import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import android.view.KeyEvent
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

object KhatyarRadioPttBridge {
  fun emit(context: Context, action: String, source: String) {
    try {
      val app = context.applicationContext as? ReactApplication ?: return
      val reactContext = app.reactNativeHost.reactInstanceManager.currentReactContext ?: return
      val payload = Arguments.createMap()
      payload.putBoolean("down", action == "down")
      payload.putString("source", source)
      payload.putDouble("timestamp", System.currentTimeMillis().toDouble())
      reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("khatyarRadioPTT", payload)
    } catch (_: Throwable) {}
  }

  fun volumePttAllowed(context: Context): Boolean {
    return try {
      val prefs = context.getSharedPreferences("khatyar_radio_native", Context.MODE_PRIVATE)
      if (!prefs.getBoolean("enabled", false) || prefs.getLong("channelId", 0L) <= 0L) return false
      val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      audio.getDevices(AudioManager.GET_DEVICES_OUTPUTS).none { d ->
        d.type == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
        d.type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES ||
        d.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP ||
        d.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
        (Build.VERSION.SDK_INT >= 31 && d.type == AudioDeviceInfo.TYPE_BLE_HEADSET)
      }
    } catch (_: Throwable) { true }
  }

  fun handleMediaIntent(context: Context, intent: android.content.Intent) {
    val event = intent.getParcelableExtra<KeyEvent>(android.content.Intent.EXTRA_KEY_EVENT) ?: return
    val key = event.keyCode
    if (key != KeyEvent.KEYCODE_HEADSETHOOK &&
        key != KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE &&
        key != KeyEvent.KEYCODE_MEDIA_PLAY) return
    val action = if (event.action == KeyEvent.ACTION_DOWN) "down" else "up"
    emit(context, action, "headset")
  }
}
`;

const receiver = `package ${radioPkg}

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class KhatyarRadioMediaButtonReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == Intent.ACTION_MEDIA_BUTTON) {
      KhatyarRadioPttBridge.handleMediaIntent(context, intent)
    }
  }
}
`;

function withRadioPtt(config) {
  config = withAndroidManifest(config, c => {
    const m = c.modResults.manifest;
    m['uses-permission'] = m['uses-permission'] || [];
    const addPermission = name => {
      if (!m['uses-permission'].some(x => x.$?.['android:name'] === name)) m['uses-permission'].push({$: {'android:name': name}});
    };
    addPermission('android.permission.FOREGROUND_SERVICE');
    addPermission('android.permission.FOREGROUND_SERVICE_MICROPHONE');
    addPermission('android.permission.POST_NOTIFICATIONS');
    const app = m.application?.[0];
    if (!app) return c;
    app.service = app.service || [];
    if (!app.service.some(x => x.$?.['android:name'] === 'expo.modules.audio.service.AudioRecordingService')) app.service.push({$: {'android:name':'expo.modules.audio.service.AudioRecordingService','android:exported':'false','android:foregroundServiceType':'microphone'}});
    app.receiver = app.receiver || [];
    if (!app.receiver.some(x => x.$?.['android:name'] === `${radioPkg}.KhatyarRadioMediaButtonReceiver`)) app.receiver.push({$:{'android:name':`${radioPkg}.KhatyarRadioMediaButtonReceiver`,'android:enabled':'true','android:exported':'true'},'intent-filter':[{$:{'android:priority':'900'},action:[{$:{'android:name':'android.intent.action.MEDIA_BUTTON'}}]}]});
    return c;
  });

  config = withDangerousMod(config, ['android', async c => {
    const root = c.modRequest.platformProjectRoot;
    const javaRoot = path.join(root, 'app', 'src', 'main', 'java', ...pkg.split('.'));
    const radioDir = path.join(javaRoot, 'radio');
    fs.mkdirSync(radioDir, { recursive: true });
    fs.writeFileSync(path.join(radioDir, 'KhatyarRadioPttBridge.kt'), bridge, 'utf8');
    fs.writeFileSync(path.join(radioDir, 'KhatyarRadioMediaButtonReceiver.kt'), receiver, 'utf8');
    const mainRoots=[path.join(root,'app','src','main','java'),path.join(root,'app','src','main','kotlin')],found=[];
    const walk=dir=>{if(!fs.existsSync(dir))return;for(const name of fs.readdirSync(dir)){const p=path.join(dir,name),st=fs.statSync(p);if(st.isDirectory())walk(p);else if(/^MainActivity\.(kt|java)$/.test(name))found.push(p)}};
    mainRoots.forEach(walk);
    for(const file of found){let s=fs.readFileSync(file,'utf8');if(!s.includes('KhatyarRadioPttBridge.emit')){const importLine=`import ${radioPkg}.KhatyarRadioPttBridge\n`;if(!s.includes(importLine.trim())){const packageMatch=s.match(/^package [^\n]+\n/);if(packageMatch)s=s.slice(0,packageMatch[0].length)+importLine+s.slice(packageMatch[0].length);else s=importLine+s}if(file.endsWith('.kt')){const methods=`\n\n  override fun onKeyDown(keyCode: Int, event: android.view.KeyEvent): Boolean {\n    if (keyCode == android.view.KeyEvent.KEYCODE_VOLUME_UP && event.repeatCount == 0 && KhatyarRadioPttBridge.volumePttAllowed(this)) {\n      KhatyarRadioPttBridge.emit(this, "down", "volume_up")\n      return true\n    }\n    return super.onKeyDown(keyCode, event)\n  }\n\n  override fun onKeyUp(keyCode: Int, event: android.view.KeyEvent): Boolean {\n    if (keyCode == android.view.KeyEvent.KEYCODE_VOLUME_UP && KhatyarRadioPttBridge.volumePttAllowed(this)) {\n      KhatyarRadioPttBridge.emit(this, "up", "volume_up")\n      return true\n    }\n    return super.onKeyUp(keyCode, event)\n  }\n}`;s=s.replace(/\n}\s*$/,methods)}else{const javaMethods=`\n\n  @Override public boolean onKeyDown(int keyCode, android.view.KeyEvent event) { if (keyCode == android.view.KeyEvent.KEYCODE_VOLUME_UP && event.getRepeatCount() == 0 && ${radioPkg}.KhatyarRadioPttBridge.INSTANCE.volumePttAllowed(this)) { ${radioPkg}.KhatyarRadioPttBridge.INSTANCE.emit(this, "down", "volume_up"); return true; } return super.onKeyDown(keyCode, event); }\n  @Override public boolean onKeyUp(int keyCode, android.view.KeyEvent event) { if (keyCode == android.view.KeyEvent.KEYCODE_VOLUME_UP && ${radioPkg}.KhatyarRadioPttBridge.INSTANCE.volumePttAllowed(this)) { ${radioPkg}.KhatyarRadioPttBridge.INSTANCE.emit(this, "up", "volume_up"); return true; } return super.onKeyUp(keyCode, event); }\n}`;s=s.replace(/\n}\s*$/,javaMethods)}fs.writeFileSync(file,s,'utf8')}}
    return c;
  }]);
  return config;
}
module.exports = withRadioPtt;
