const { withAndroidManifest, withAppBuildGradle, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const pkg = 'ir.mashhad.taxicontrol';
const src = `package ${pkg}.background

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.work.*
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import java.util.concurrent.TimeUnit

class KhatyarHeadlessService : HeadlessJsTaskService() {
  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig =
    HeadlessJsTaskConfig("KhatyarHeadlessLocation", null, 60000, true)
}

class KhatyarLocationWorker(ctx: Context, params: WorkerParameters) : Worker(ctx, params) {
  override fun doWork(): Result {
    return try {
      val i = Intent(applicationContext, KhatyarHeadlessService::class.java)
      applicationContext.startService(i)
      HeadlessJsTaskService.acquireWakeLockNow(applicationContext)
      Result.success()
    } catch (_: Throwable) { Result.retry() }
  }

class KhatyarBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
      val req = PeriodicWorkRequestBuilder<KhatyarLocationWorker>(15, TimeUnit.MINUTES)
        .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
        .build()
      WorkManager.getInstance(context).enqueueUniquePeriodicWork(
        "khatyar-location-watchdog", ExistingPeriodicWorkPolicy.UPDATE, req)
    }
  }
}
`;

module.exports = function withPersistentBackground(config) {
  config = withAndroidManifest(config, c => {
    const m = c.modResults.manifest;
    m['uses-permission'] = m['uses-permission'] || [];
    const addPerm = name => { if (!m['uses-permission'].some(x => x.$?.['android:name'] === name)) m['uses-permission'].push({$: {'android:name': name}}); };
    ['android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS','android.permission.SCHEDULE_EXACT_ALARM','android.permission.POST_NOTIFICATIONS'].forEach(addPerm);
    const app = m.application?.[0];
    app.service = app.service || [];
    if (!app.service.some(x => x.$?.['android:name'] === '.background.KhatyarHeadlessService')) app.service.push({$: {'android:name': '.background.KhatyarHeadlessService','android:exported':'false','android:foregroundServiceType':'location'}});
    app.receiver = app.receiver || [];
    if (!app.receiver.some(x => x.$?.['android:name'] === '.background.KhatyarBootReceiver')) app.receiver.push({$: {'android:name': '.background.KhatyarBootReceiver','android:enabled':'true','android:exported':'true'}, 'intent-filter':[ { action:[{$:{'android:name':'android.intent.action.BOOT_COMPLETED'}},{$:{'android:name':'android.intent.action.MY_PACKAGE_REPLACED'}}] } ]});
    return c;
  });
  config = withAppBuildGradle(config, c => {
    if (!c.modResults.contents.includes('androidx.work:work-runtime-ktx')) c.modResults.contents = c.modResults.contents.replace(/dependencies\s*\{/, 'dependencies {\n    implementation "androidx.work:work-runtime-ktx:2.9.1"');
    return c;
  });
  config = withDangerousMod(config, ['android', async c => {
    const root = c.modRequest.platformProjectRoot;
    const out = path.join(root,'app','src','main','java',...pkg.split('.'),'background','KhatyarBackground.kt');
    fs.mkdirSync(path.dirname(out), {recursive:true}); fs.writeFileSync(out, src);
    return c;
  }]);
  return config;
};
