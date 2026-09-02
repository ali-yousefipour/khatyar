const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const pkg = 'ir.mashhad.taxicontrol';
const radioPkg = `${pkg}.radio`;

const bridge = `package ${radioPkg}

import android.content.Context
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
      payload.putString("action", action)
      payload.putString("source", source)
      payload.putDouble("timestamp", System.currentTimeMillis().toDouble())
      reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("KhatyarRadioPTT", payload)
    } catch (_: Throwable) {}
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
    const app = m.application?.[0];
    if (!app) return c;
    app.receiver = app.receiver || [];
    const exists = app.receiver.some(x => x.$?.['android:name'] === `${radioPkg}.KhatyarRadioMediaButtonReceiver`);
    if (!exists) {
      app.receiver.push({
        $: {
          'android:name': `${radioPkg}.KhatyarRadioMediaButtonReceiver`,
          'android:enabled': 'true',
          'android:exported': 'true'
        },
        'intent-filter': [{
          $: { 'android:priority': '900' },
          action: [{ $: { 'android:name': 'android.intent.action.MEDIA_BUTTON' } }]
        }]
      });
    }
    return c;
  });

  config = withDangerousMod(config, ['android', async c => {
    const root = c.modRequest.platformProjectRoot;
    const javaRoot = path.join(root, 'app', 'src', 'main', 'java', ...pkg.split('.'));
    const radioDir = path.join(javaRoot, 'radio');
    fs.mkdirSync(radioDir, { recursive: true });
    fs.writeFileSync(path.join(radioDir, 'KhatyarRadioPttBridge.kt'), bridge, 'utf8');
    fs.writeFileSync(path.join(radioDir, 'KhatyarRadioMediaButtonReceiver.kt'), receiver, 'utf8');

    // Volume-Up PTT is intentionally limited to the foreground Activity. Android does not
    // expose a normal application API for globally hijacking volume keys while backgrounded.
    const mainRoots = [
      path.join(root, 'app', 'src', 'main', 'java'),
      path.join(root, 'app', 'src', 'main', 'kotlin')
    ];
    const found = [];
    const walk = dir => {
      if (!fs.existsSync(dir)) return;
      for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        const st = fs.statSync(p);
        if (st.isDirectory()) walk(p);
        else if (/^MainActivity\\.(kt|java)$/.test(name)) found.push(p);
      }
    };
    mainRoots.forEach(walk);
    for (const file of found) {
      let s = fs.readFileSync(file, 'utf8');
      if (!s.includes('KhatyarRadioPttBridge.emit')) {
        const importLine = s.includes('import ') ? `import ${radioPkg}.KhatyarRadioPttBridge\\n` : '';
        if (importLine && !s.includes(importLine.trim())) {
          const packageMatch = s.match(/^package [^\\n]+\\n/);
          if (packageMatch) s = s.slice(0, packageMatch[0].length) + importLine + s.slice(packageMatch[0].length);
          else s = importLine + s;
        }
        const marker = /\\n}\\s*$/;
        const methods = `\\n\\n  override fun onKeyDown(keyCode: Int, event: android.view.KeyEvent): Boolean {\\n    if (keyCode == android.view.KeyEvent.KEYCODE_VOLUME_UP) {\\n      KhatyarRadioPttBridge.emit(this, "down", "volume_up")\\n      return true\\n    }\\n    return super.onKeyDown(keyCode, event)\\n  }\\n\\n  override fun onKeyUp(keyCode: Int, event: android.view.KeyEvent): Boolean {\\n    if (keyCode == android.view.KeyEvent.KEYCODE_VOLUME_UP) {\\n      KhatyarRadioPttBridge.emit(this, "up", "volume_up")\\n      return true\\n    }\\n    return super.onKeyUp(keyCode, event)\\n  }\\n}`;
        if (file.endsWith('.kt') && marker.test(s)) s = s.replace(marker, methods);
        else if (file.endsWith('.java')) {
          const javaMethods = `\\n\\n  @Override public boolean onKeyDown(int keyCode, android.view.KeyEvent event) { if (keyCode == android.view.KeyEvent.KEYCODE_VOLUME_UP) { ${radioPkg}.KhatyarRadioPttBridge.INSTANCE.emit(this, "down", "volume_up"); return true; } return super.onKeyDown(keyCode, event); }\\n  @Override public boolean onKeyUp(int keyCode, android.view.KeyEvent event) { if (keyCode == android.view.KeyEvent.KEYCODE_VOLUME_UP) { ${radioPkg}.KhatyarRadioPttBridge.INSTANCE.emit(this, "up", "volume_up"); return true; } return super.onKeyUp(keyCode, event); }\\n}`;
          s = s.replace(/\\n}\\s*$/, javaMethods);
        }
        fs.writeFileSync(file, s, 'utf8');
      }
    }
    return c;
  }]);
  return config;
}

module.exports = withRadioPtt;
