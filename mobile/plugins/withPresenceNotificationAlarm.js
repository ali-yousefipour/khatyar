const fs = require('fs');
const path = require('path');

function patchPresenceAlarm(source) {
  if (source.includes('// khatyar-presence-insistent')) return source;
  const anchor = 'return builder.build()';
  if (!source.includes(anchor)) throw new Error('Expo notification builder changed: presence alarm patch unavailable');
  return source.replace(anchor, `// khatyar-presence-insistent
    val builtNotification = builder.build()
    if (content.body?.optString("type") == "presence_check") {
      // Android repeats the channel sound even when JS is suspended/phone locked.
      // Auto-cancel on tap and explicit dismissal on wizard entry stop the alarm.
      builtNotification.flags = builtNotification.flags or Notification.FLAG_INSISTENT or Notification.FLAG_AUTO_CANCEL
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
