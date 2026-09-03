package ir.mashhad.taxicontrol.radio;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.session.MediaSession;
import android.media.VolumeProvider;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.view.KeyEvent;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class KhatyarRadioService extends Service {
  public static final String PREFS = "khatyar_radio_native";
  private static final String CHANNEL = "khatyar_radio_service";
  private static final int NOTIFICATION_ID = 7841;
  private static final long POLL_MS = 1800L;
  private final Handler handler = new Handler(Looper.getMainLooper());
  private final ExecutorService io = Executors.newSingleThreadExecutor();
  private MediaSession mediaSession;
  private MediaPlayer player;
  private boolean volumePttDown = false;
  private long lastId = 0;
  private boolean destroyed = false;

  private final Runnable poller = new Runnable() {
    @Override public void run() {
      if (destroyed) return;
      io.execute(() -> pollOnce());
      handler.postDelayed(this, POLL_MS);
    }
  };

  @Override public void onCreate() {
    super.onCreate();
    createNotificationChannel();
    setupMediaSession();
    startForegroundCompat();
    lastId = getPrefs().getLong("lastId", 0L);
    handler.post(poller);
  }

  @Override public int onStartCommand(Intent intent, int flags, int startId) {
    if (!getPrefs().getBoolean("enabled", false)) { stopSelf(); return START_NOT_STICKY; }
    return START_STICKY;
  }

  private android.content.SharedPreferences getPrefs() {
    return getSharedPreferences(PREFS, MODE_PRIVATE);
  }

  private void createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= 26) {
      NotificationChannel c = new NotificationChannel(CHANNEL, "بی‌سیم خطیار", NotificationManager.IMPORTANCE_LOW);
      c.setDescription("دریافت پیام و آماده‌به‌کاری بی‌سیم خطیار در پس‌زمینه");
      c.setSound(null, null);
      ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(c);
    }
  }

  private void startForegroundCompat() {
    Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
    PendingIntent pi = null;
    if (launch != null) {
      int f = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
      pi = PendingIntent.getActivity(this, 7841, launch, f);
    }
    NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL)
      .setSmallIcon(getApplicationInfo().icon)
      .setContentTitle("بی‌سیم خطیار")
      .setContentText("دریافت بی‌سیم در پس‌زمینه فعال است")
      .setOngoing(true).setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setPriority(NotificationCompat.PRIORITY_LOW);
    if (pi != null) b.setContentIntent(pi);
    Notification n = b.build();
    if (Build.VERSION.SDK_INT >= 29) {
      startForeground(NOTIFICATION_ID, n, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK | android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
    } else startForeground(NOTIFICATION_ID, n);
  }

  private void setupMediaSession() {
    mediaSession = new MediaSession(this, "KhatyarRadioPTT");
    mediaSession.setCallback(new MediaSession.Callback() {
      @Override public boolean onMediaButtonEvent(Intent intent) {
        KeyEvent e = intent == null ? null : intent.getParcelableExtra(Intent.EXTRA_KEY_EVENT);
        if (e == null) return false;
        int code = e.getKeyCode();
        boolean headset = code == KeyEvent.KEYCODE_HEADSETHOOK || code == KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE || code == KeyEvent.KEYCODE_MEDIA_PLAY || code == KeyEvent.KEYCODE_MEDIA_PAUSE;
        if (!headset) return super.onMediaButtonEvent(intent);
        if (e.getAction() == KeyEvent.ACTION_DOWN && e.getRepeatCount() == 0) sendPtt(true, "headset");
        else if (e.getAction() == KeyEvent.ACTION_UP) sendPtt(false, "headset");
        return true;
      }
    });
    mediaSession.setActive(true);
    if (Build.VERSION.SDK_INT >= 21) {
      mediaSession.setPlaybackToRemote(new VolumeProvider(VolumeProvider.VOLUME_CONTROL_RELATIVE, 1, 0) {
        @Override public void onAdjustVolume(int direction) {
          if (direction == AudioManager.ADJUST_RAISE) {
            volumePttDown = !volumePttDown;
            sendPtt(volumePttDown, "volume_up");
            return;
          }
          if (direction == AudioManager.ADJUST_LOWER) {
            AudioManager am = (AudioManager)getSystemService(AUDIO_SERVICE);
            if (am != null) am.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_LOWER, 0);
          }
        }
      });
    }
  }

  private void sendPtt(boolean down, String source) {
    if (!getPrefs().getBoolean("enabled", false) || getPrefs().getLong("channelId", 0L) <= 0) return;
    Intent i = new Intent(KhatyarRadioModule.ACTION_PTT);
    i.setPackage(getPackageName());
    i.putExtra("down", down);
    i.putExtra("source", source);
    sendBroadcast(i);
  }

  private void pollOnce() {
    try {
      android.content.SharedPreferences p = getPrefs();
      String token = p.getString("token", "");
      String base = p.getString("baseUrl", "");
      long channel = p.getLong("channelId", 0L);
      long userId = p.getLong("userId", 0L);
      if (token == null || token.isEmpty() || base == null || base.isEmpty() || channel <= 0 || !p.getBoolean("enabled", false)) return;
      String endpoint = base.replaceAll("/+$", "") + "/radio-api-v2.php?op=poll&channel_id=" + channel + "&after=" + lastId;
      String body = get(endpoint, token);
      if (body == null || body.isEmpty()) return;
      JSONObject root = new JSONObject(body);
      if (root.has("last_message_id")) lastId = Math.max(lastId, root.optLong("last_message_id", lastId));
      JSONArray messages = root.optJSONArray("messages");
      if (messages == null) { p.edit().putLong("lastId", lastId).apply(); return; }
      for (int idx = 0; idx < messages.length(); idx++) {
        JSONObject m = messages.optJSONObject(idx);
        if (m == null) continue;
        long id = m.optLong("id", 0L);
        lastId = Math.max(lastId, id);
        if (m.optLong("sender_id", 0L) == userId) continue;
        String audio = m.optString("audio_url", "");
        if (!audio.isEmpty()) playRemote(audio, token);
      }
      p.edit().putLong("lastId", lastId).apply();
    } catch (Throwable ignored) {}
  }

  private String get(String endpoint, String token) {
    HttpURLConnection c = null;
    try {
      c = (HttpURLConnection)new URL(endpoint).openConnection();
      c.setConnectTimeout(7000); c.setReadTimeout(12000); c.setUseCaches(false);
      c.setRequestProperty("Accept", "application/json");
      if (token != null && !token.isEmpty()) c.setRequestProperty("Authorization", "Bearer " + token);
      int code = c.getResponseCode();
      if (code < 200 || code >= 300) return null;
      BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"));
      StringBuilder out = new StringBuilder(); String line;
      while ((line = r.readLine()) != null) out.append(line);
      r.close(); return out.toString();
    } catch (Throwable e) { return null; }
    finally { if (c != null) c.disconnect(); }
  }

  private synchronized void playRemote(String audioUrl, String token) {
    try {
      if (audioUrl.startsWith("/")) {
        String base = getPrefs().getString("baseUrl", "").replaceAll("/+$", "");
        if (audioUrl.startsWith("/api/") && base.endsWith("/api")) {
          base = base.substring(0, base.length() - 4);
        }
        audioUrl = base + audioUrl;
      }
      if (player != null) { try { player.stop(); } catch (Throwable ignored) {} try { player.release(); } catch (Throwable ignored) {} }
      player = new MediaPlayer();
      player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
      Map<String,String> headers = new HashMap<>(); if (token != null && !token.isEmpty()) headers.put("Authorization", "Bearer " + token);
      player.setDataSource(this, android.net.Uri.parse(audioUrl), headers);
      player.setOnCompletionListener(mp -> { try { mp.release(); } catch (Throwable ignored) {} if (player == mp) player = null; });
      player.setOnErrorListener((mp, what, extra) -> { try { mp.release(); } catch (Throwable ignored) {} if (player == mp) player = null; return true; });
      player.prepareAsync();
      player.setOnPreparedListener(MediaPlayer::start);
    } catch (Throwable ignored) {}
  }

  @Override public void onDestroy() {
    destroyed = true; handler.removeCallbacksAndMessages(null); io.shutdownNow();
    if (mediaSession != null) { try { mediaSession.setActive(false); mediaSession.release(); } catch (Throwable ignored) {} mediaSession = null; }
    if (player != null) { try { player.release(); } catch (Throwable ignored) {} player = null; }
    super.onDestroy();
  }
  @Nullable @Override public IBinder onBind(Intent intent) { return null; }
}
