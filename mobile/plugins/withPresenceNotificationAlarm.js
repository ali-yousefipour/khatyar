const fs = require('fs');
const path = require('path');

function patchPresenceAlarm(source) {
  if (source.includes('// khatyar-presence-insistent')) return source;
  const anchor = 'return builder.build()';
  if (!source.includes(anchor)) throw new Error('Expo notification builder changed: presence alarm patch unavailable');
  return source.replace(anchor, `// khatyar-presence-insistent
    val builtNotification = builder.build()
    if (content.body?.optString("type") == "presence_check") {
      builtNotification.flags = builtNotification.flags or Notification.FLAG_AUTO_CANCEL
      try {
        val alarmIntent = android.content.Intent().setClassName(context.packageName, "ir.mashhad.taxicontrol.radio.PresenceAlarmService")
        alarmIntent.putExtra("presence_open", builtNotification.contentIntent)
        if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(alarmIntent) else context.startService(alarmIntent)
      } catch (error: Exception) {
        // OS may reject background service start; retain the channel-level fallback.
        builtNotification.flags = builtNotification.flags or Notification.FLAG_INSISTENT
        Log.w("PresenceAlarm", "Native playback start rejected", error)
      }
    }
    return builtNotification`);
}

module.exports = function withPresenceNotificationAlarm(config) {
  const { withDangerousMod } = require('@expo/config-plugins');
  return withDangerousMod(config, ['android', async mod => {
    const packageRoot = path.dirname(require.resolve('expo-notifications/package.json', { paths: [mod.modRequest.projectRoot] }));
    const target = path.join(packageRoot, 'android/src/main/java/expo/modules/notifications/notifications/presentation/builders/ExpoNotificationBuilder.kt');
    fs.writeFileSync(target, patchPresenceAlarm(fs.readFileSync(target, 'utf8')));
    return mod;
  }]);
};
module.exports.patchPresenceAlarm = patchPresenceAlarm;
