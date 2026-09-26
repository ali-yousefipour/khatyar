package ir.mashhad.taxicontrol.radio;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.audiofx.LoudnessEnhancer;
import android.media.session.MediaSession;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.view.KeyEvent;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.ParsePosition;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public final class KhatyarRadioService extends Service {
  public static final String PREFS = "khatyar_radio_native";
  private static final String CHANNEL = "khatyar_radio_service";
  private static final int NOTIFICATION_ID = 7841;
  private static final int REQUEST_PTT = 7842;
  private static final long POLL_MS = 1800L;
  private static final long NOTIFICATION_REFRESH_MS = 60000L;
  private static final int DEFAULT_GAIN_MB = 600;
  private static final int MAX_GAIN_MB = 1000;
  private static final String ACTION_NOTIFICATION_PTT = "ir.mashhad.taxicontrol.radio.NOTIFICATION_PTT";
  private final Handler handler = new Handler(Looper.getMainLooper());
  private final ExecutorService io = Executors.newSingleThreadExecutor();
  private final AtomicBoolean pollInFlight = new AtomicBoolean(false);
  private MediaSession mediaSession;
  private MediaPlayer player;
  private LoudnessEnhancer loudnessEnhancer;
  private long lastId = 0;
  private long serviceStartedAt = 0;
  private boolean destroyed = false;

  private boolean playbackActive() { return getPrefs().getBoolean("playbackActive", false); }
  private final java.util.ArrayDeque<String> pendingAudioUrls = new java.util.ArrayDeque<>();
  private String pendingAudioToken = "";
  private void setPlaybackActive(boolean active) {
    try {
      android.content.SharedPreferences.Editor editor = getPrefs().edit().putBoolean("playbackActive", active);
      if (!active) editor.remove("audioSessionId");
      editor.apply();
    } catch (Throwable ignored) {}
  }
  public static int clampGainMb(int gainMb) { return Math.max(0, Math.min(MAX_GAIN_MB, gainMb)); }
  private int amplificationGainMb() { return clampGainMb(getPrefs().getInt("amplificationGainMb", DEFAULT_GAIN_MB)); }

  private static final long FOREGROUND_HEARTBEAT_TIMEOUT_MS = 6000L;
  private boolean isAppInForeground() {
    try {
      android.content.SharedPreferences p = getPrefs();
      boolean jsForeground = p.getBoolean("jsForeground", false);
      long jsAt = p.getLong("jsForegroundAt", 0L);
      if (jsForeground && (System.currentTimeMillis() - jsAt) <= FOREGROUND_HEARTBEAT_TIMEOUT_MS) return true;
    } catch (Throwable ignored) {}
    return false;
  }

  private final Runnable poller = new Runnable() {
    @Override public void run() {
      if (destroyed) return;
      if (pollInFlight.compareAndSet(false, true)) {
        io.execute(() -> {
          try { pollOnce(); }
          finally { pollInFlight.set(false); }
        });
      }
      handler.postDelayed(this, POLL_MS);
    }
  };

  private final Runnable notificationRefresher = new Runnable() {
    @Override public void run() {
      if (destroyed) return;
      try { updateNotification(); } catch (Throwable ignored) {}
      handler.postDelayed(this, NOTIFICATION_REFRESH_MS);
    }
  };

  @Override public void onCreate() {
    super.onCreate();
    serviceStartedAt = System.currentTimeMillis();
    createNotificationChannel();
    setupMediaSession();
    startForegroundCompat();
    lastId = getPrefs().getLong("lastId", 0L);
    getPrefs().edit().putLong("sessionStartedAt", serviceStartedAt).putBoolean("initialized", false).putBoolean("playbackActive", false).putBoolean("notificationPttActive", false).remove("audioSessionId").apply();
    handler.post(poller);
    handler.postDelayed(notificationRefresher, NOTIFICATION_REFRESH_MS);
  }

  @Override public int onStartCommand(Intent intent, int flags, int startId) {
    if (intent != null && ACTION_NOTIFICATION_PTT.equals(intent.getAction())) {
      toggleNotificationPtt();
      return START_STICKY;
    }
    if (!getPrefs().getBoolean("enabled", false)) { stopSelf(); return START_NOT_STICKY; }
    return START_STICKY;
  }

  private android.content.SharedPreferences getPrefs() { return getSharedPreferences(PREFS, MODE_PRIVATE); }

  private void createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= 26) {
      NotificationChannel c = new NotificationChannel(CHANNEL, "بی‌سیم خطیار", NotificationManager.IMPORTANCE_LOW);
      c.setDescription("دریافت پیام و آماده‌به‌کاری بی‌سیم خطیار در پس‌زمینه");
      c.setSound(null, null);
      ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(c);
    }
  }

  private PendingIntent buildPttPendingIntent() {
    Intent i = new Intent(this, KhatyarRadioService.class);
    i.setAction(ACTION_NOTIFICATION_PTT);
    int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
    return PendingIntent.getService(this, REQUEST_PTT, i, flags);
  }

  private String toPersianDigits(String value) {
    if (value == null) return "";
    return value.replace('0','۰').replace('1','۱').replace('2','۲').replace('3','۳').replace('4','۴').replace('5','۵').replace('6','۶').replace('7','۷').replace('8','۸').replace('9','۹');
  }

  private String jalaliToday() {
    java.util.Calendar cal = java.util.Calendar.getInstance();
    int gy = cal.get(java.util.Calendar.YEAR);
    int gm = cal.get(java.util.Calendar.MONTH) + 1;
    int gd = cal.get(java.util.Calendar.DAY_OF_MONTH);
    int[] j = gregorianToJalali(gy, gm, gd);
    return toPersianDigits(String.format(Locale.US, "%04d/%02d/%02d", j[0], j[1], j[2]));
  }

  private int[] gregorianToJalali(int gy, int gm, int gd) {
    int[] gdm = {0,31,28,31,30,31,30,31,31,30,31,30,31};
    int gy2 = gy - 1600;
    int gm2 = gm - 1;
    int gd2 = gd - 1;
    int gDayNo = 365 * gy2 + (gy2 + 3) / 4 - (gy2 + 99) / 100 + (gy2 + 399) / 400;
    for (int i = 0; i < gm2; ++i) gDayNo += gdm[i + 1];
    if (gm2 > 1 && ((gy % 4 == 0 && gy % 100 != 0) || (gy % 400 == 0))) gDayNo++;
    gDayNo += gd2;
    int jDayNo = gDayNo - 79;
    int jNp = jDayNo / 12053;
    jDayNo %= 12053;
    int jy = 979 + 33 * jNp + 4 * (jDayNo / 1461);
    jDayNo %= 1461;
    if (jDayNo >= 366) {
      jy += (jDayNo - 1) / 365;
      jDayNo = (jDayNo - 1) % 365;
    }
    int jm = jDayNo < 186 ? 1 + jDayNo / 31 : 7 + (jDayNo - 186) / 30;
    int jd = 1 + (jDayNo < 186 ? jDayNo % 31 : (jDayNo - 186) % 30);
    return new int[]{jy, jm, jd};
  }

  private void startForegroundCompat() {
    Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
    PendingIntent pi = null;
    if (launch != null) {
      int f = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
      pi = PendingIntent.getActivity(this, 7841, launch, f);
    }
    boolean pttActive = getPrefs().getBoolean("notificationPttActive", false);
    NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL)
      .setSmallIcon(getApplicationInfo().icon)
      .setContentTitle("بی‌سیم خطیار")
      .setContentText("📅 امروز: " + jalaliToday() + "  •  📻 آماده‌به‌کاری")
      .setStyle(new NotificationCompat.BigTextStyle().bigText("📅 تاریخ امروز: " + jalaliToday() + "\n📻 بی‌سیم: آماده‌به‌کاری"))
      .addAction(new NotificationCompat.Action.Builder(0, pttActive ? "⏹ پایان PTT" : "🎙 PTT", buildPttPendingIntent()).build())
      .setOngoing(true).setOnlyAlertOnce(true)
      .setCategory(NotificationCompat.CATEGORY_SERVICE).setPriority(NotificationCompat.PRIORITY_LOW);
    if (pi != null) b.setContentIntent(pi);
    Notification n = b.build();
    if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIFICATION_ID, n, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
    else startForeground(NOTIFICATION_ID, n);
  }

  private void updateNotification() {
    boolean pttActive = getPrefs().getBoolean("notificationPttActive", false);
    Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
    PendingIntent pi = null;
    if (launch != null) {
      int f = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
      pi = PendingIntent.getActivity(this, 7841, launch, f);
    }
    NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL)
      .setSmallIcon(getApplicationInfo().icon)
      .setContentTitle("بی‌سیم خطیار")
      .setContentText("📅 امروز: " + jalaliToday() + "  •  📻 آماده‌به‌کاری")
      .setStyle(new NotificationCompat.BigTextStyle().bigText("📅 تاریخ امروز: " + jalaliToday() + "\n📻 بی‌سیم: آماده‌به‌کاری"))
      .addAction(new NotificationCompat.Action.Builder(0, pttActive ? "⏹ پایان PTT" : "🎙 PTT", buildPttPendingIntent()).build())
      .setOngoing(true).setOnlyAlertOnce(true)
      .setCategory(NotificationCompat.CATEGORY_SERVICE).setPriority(NotificationCompat.PRIORITY_LOW);
    if (pi != null) b.setContentIntent(pi);
    ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).notify(NOTIFICATION_ID, b.build());
  }

  private void toggleNotificationPtt() {
    if (!getPrefs().getBoolean("enabled", false) || getPrefs().getLong("channelId", 0L) <= 0 || playbackActive() || player != null) return;
    boolean active = getPrefs().getBoolean("notificationPttActive", false);
    if (active) {
      sendPtt(false, "notification");
      getPrefs().edit().putBoolean("notificationPttActive", false).apply();
    } else {
      sendPtt(true, "notification");
      getPrefs().edit().putBoolean("notificationPttActive", true).apply();
    }
    updateNotification();
  }

  private void setupMediaSession() {
    mediaSession = new MediaSession(this, "KhatyarRadioPTT");
    if (Build.VERSION.SDK_INT >= 21) mediaSession.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
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
  }

  private void sendPtt(boolean down, String source) {
    if (!getPrefs().getBoolean("enabled", false) || getPrefs().getLong("channelId", 0L) <= 0 || playbackActive() || player != null) return;
    Intent i = new Intent(KhatyarRadioModule.ACTION_PTT); i.setPackage(getPackageName());
    i.putExtra("down", down); i.putExtra("source", source); sendBroadcast(i);
  }

  private void pollOnce() {
    try {
      android.content.SharedPreferences p = getPrefs();
      String token = p.getString("token", ""), base = p.getString("baseUrl", "");
      long channel = p.getLong("channelId", 0L), userId = p.getLong("userId", 0L);
      boolean listenAll = p.getBoolean("listenAll", false);
      if (token == null || token.isEmpty() || base == null || base.isEmpty() || !p.getBoolean("enabled", false)) return;

      String endpoint;
      if (listenAll) {
        endpoint = base.replaceAll("/+$", "") + "/radio-api-v2.php?op=poll-all&after=" + lastId;
      } else {
        if (channel <= 0) return;
        endpoint = base.replaceAll("/+$", "") + "/radio-api-v2.php?op=poll&channel_id=" + channel + "&after=" + lastId;
      }

      String body = get(endpoint, token);
      if (body == null || body.isEmpty()) return;
      JSONObject root = new JSONObject(body);
      JSONArray messages = root.optJSONArray("messages");
      boolean initialized = p.getBoolean("initialized", false);

      if (!initialized) {
        long newest = lastId;
        if (messages != null) {
          for (int idx = 0; idx < messages.length(); idx++) {
            JSONObject m = messages.optJSONObject(idx);
            if (m == null) continue;
            newest = Math.max(newest, m.optLong("id", 0L));
            long createdAt = messageTimeMillis(m);
            if (createdAt > 0 && createdAt >= serviceStartedAt &&
                m.optLong("sender_id", 0L) != userId && !isAppInForeground()) {
              String audio = m.optString("audio_url", "");
              if (!audio.isEmpty()) enqueueRemote(audio, token);
            }
          }
        }
        lastId = newest;
        p.edit().putLong("lastId", lastId).putBoolean("initialized", true).apply();
        return;
      }

      for (int idx = 0; messages != null && idx < messages.length(); idx++) {
        JSONObject m = messages.optJSONObject(idx);
        if (m == null) continue;
        long id = m.optLong("id", 0L);
        lastId = Math.max(lastId, id);
        if (m.optLong("sender_id", 0L) == userId) continue;
        long createdAt = messageTimeMillis(m);
        if (createdAt <= 0L || createdAt < serviceStartedAt) continue;
        String audio = m.optString("audio_url", "");
        if (!audio.isEmpty() && !isAppInForeground()) enqueueRemote(audio, token);
      }
      p.edit().putLong("lastId", lastId).apply();
    } catch (Throwable ignored) {}
  }

  private long messageTimeMillis(JSONObject m) {
    String[] keys = {"created_at", "sent_at", "timestamp", "createdAt", "sentAt"};
    for (String key : keys) {
      try {
        Object raw = m.opt(key);
        if (raw == null) continue;
        if (raw instanceof Number) {
          long v = ((Number) raw).longValue();
          return v < 100000000000L ? v * 1000L : v;
        }
        String s = String.valueOf(raw).trim();
        if (s.isEmpty()) continue;
        try { long v = Long.parseLong(s); return v < 100000000000L ? v * 1000L : v; } catch (Throwable ignored) {}
        String[] formats = {"yyyy-MM-dd'T'HH:mm:ss.SSSXXX","yyyy-MM-dd'T'HH:mm:ssXXX","yyyy-MM-dd HH:mm:ss","yyyy-MM-dd'T'HH:mm:ss"};
        for (String f : formats) {
          try {
            SimpleDateFormat df = new SimpleDateFormat(f, Locale.US);
            Date d = df.parse(s, new ParsePosition(0));
            if (d != null) return d.getTime();
          } catch (Throwable ignored) {}
        }
      } catch (Throwable ignored) {}
    }
    return 0L;
  }

  private String get(String endpoint, String token) {
    HttpURLConnection c = null;
    try {
      c = (HttpURLConnection)new URL(endpoint).openConnection(); c.setConnectTimeout(7000); c.setReadTimeout(12000); c.setUseCaches(false);
      c.setRequestProperty("Accept", "application/json"); if (token != null && !token.isEmpty()) c.setRequestProperty("Authorization", "Bearer " + token);
      int code = c.getResponseCode(); if (code < 200 || code >= 300) return null;
      BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8")); StringBuilder out = new StringBuilder(); String line;
      while ((line = r.readLine()) != null) out.append(line); r.close(); return out.toString();
    } catch (Throwable e) { return null; } finally { if (c != null) c.disconnect(); }
  }

  private synchronized void enqueueRemote(String audioUrl, String token) {
    if (audioUrl == null || audioUrl.isEmpty()) return;
    if (pendingAudioUrls.size() >= 20) pendingAudioUrls.pollFirst();
    pendingAudioUrls.offerLast(audioUrl);
    pendingAudioToken = token == null ? "" : token;
    if (player == null && !playbackActive()) playNextRemote();
  }

  private synchronized void playNextRemote() {
    if (player != null || pendingAudioUrls.isEmpty()) return;
    String url = pendingAudioUrls.pollFirst();
    String token = pendingAudioToken;
    playRemote(url, token);
  }

  private void ensureMaxMediaVolume() {
    try {
      AudioManager am = (AudioManager)getSystemService(Context.AUDIO_SERVICE);
      if (am == null) return;
      int max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
      if (max > 0 && am.getStreamVolume(AudioManager.STREAM_MUSIC) < max) {
        am.setStreamVolume(AudioManager.STREAM_MUSIC, max, 0);
      }
    } catch (Throwable ignored) {}
  }

  private synchronized void releasePlayer() {
    LoudnessEnhancer effect = loudnessEnhancer;
    loudnessEnhancer = null;
    if (effect != null) { try { effect.setEnabled(false); } catch (Throwable ignored) {} try { effect.release(); } catch (Throwable ignored) {} }
    MediaPlayer old = player;
    player = null;
    if (old != null) { try { old.stop(); } catch (Throwable ignored) {} try { old.release(); } catch (Throwable ignored) {} }
    setPlaybackActive(false);
  }

  private void attachLoudnessEnhancer(MediaPlayer mp) {
    try {
      if (Build.VERSION.SDK_INT < 19) return;
      LoudnessEnhancer effect = new LoudnessEnhancer(mp.getAudioSessionId());
      effect.setTargetGain(amplificationGainMb());
      effect.setEnabled(amplificationGainMb() > 0);
      loudnessEnhancer = effect;
    } catch (Throwable ignored) {
      loudnessEnhancer = null;
    }
  }

  public synchronized void setAmplificationGain(int gainMb) {
    int safe = clampGainMb(gainMb);
    getPrefs().edit().putInt("amplificationGainMb", safe).apply();
    try {
      if (loudnessEnhancer != null) {
        loudnessEnhancer.setTargetGain(safe);
        loudnessEnhancer.setEnabled(safe > 0);
      }
    } catch (Throwable ignored) {}
  }

  private synchronized void playRemote(String audioUrl, String token) {
    try {
      if (audioUrl.startsWith("/")) {
        String base = getPrefs().getString("baseUrl", "").replaceAll("/+$", "");
        if (audioUrl.startsWith("/api/") && base.endsWith("/api")) base = base.substring(0, base.length() - 4);
        audioUrl = base + audioUrl;
      }
      releasePlayer();
      player = new MediaPlayer();
      player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
      try { player.setWakeMode(this, PowerManager.PARTIAL_WAKE_LOCK); } catch (Throwable ignored) {}
      Map<String,String> headers = new HashMap<>(); if (token != null && !token.isEmpty()) headers.put("Authorization", "Bearer " + token);
      player.setDataSource(this, android.net.Uri.parse(audioUrl), headers);
      player.setOnCompletionListener(mp -> { synchronized (KhatyarRadioService.this) { if (loudnessEnhancer != null) { try { loudnessEnhancer.release(); } catch (Throwable ignored) {} loudnessEnhancer = null; } try { mp.release(); } catch (Throwable ignored) {} if (player == mp) player = null; setPlaybackActive(false); playNextRemote(); } });
      player.setOnErrorListener((mp, what, extra) -> { synchronized (KhatyarRadioService.this) { if (loudnessEnhancer != null) { try { loudnessEnhancer.release(); } catch (Throwable ignored) {} loudnessEnhancer = null; } try { mp.release(); } catch (Throwable ignored) {} if (player == mp) player = null; setPlaybackActive(false); playNextRemote(); } return true; });
      player.setOnPreparedListener(mp -> {
        try {
          ensureMaxMediaVolume();
          int sessionId = mp.getAudioSessionId();
          getPrefs().edit().putInt("audioSessionId", Math.max(0, sessionId)).putBoolean("playbackActive", true).apply();
          attachLoudnessEnhancer(mp);
          mp.start();
        } catch (Throwable ignored) {
          setPlaybackActive(false);
        }
      });
      player.prepareAsync();
    } catch (Throwable ignored) { releasePlayer(); }
  }

  @Override public void onDestroy() {
    destroyed = true; handler.removeCallbacksAndMessages(null); io.shutdownNow();
    if (mediaSession != null) { try { mediaSession.setActive(false); mediaSession.release(); } catch (Throwable ignored) {} mediaSession = null; }
    releasePlayer();
    super.onDestroy();
  }
  @Nullable @Override public IBinder onBind(Intent intent) { return null; }
}