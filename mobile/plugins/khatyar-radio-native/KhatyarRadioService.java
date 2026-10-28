package ir.mashhad.taxicontrol.radio;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;
import android.media.MediaPlayer;
import android.media.audiofx.Equalizer;
import android.media.session.MediaSession;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.view.KeyEvent;
import android.widget.RemoteViews;
import ir.mashhad.taxicontrol.R;

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
  public static final String ACTION_REFRESH_NOTIFICATION = "ir.mashhad.taxicontrol.radio.REFRESH_NOTIFICATION";
  private final Handler handler = new Handler(Looper.getMainLooper());
  private final ExecutorService io = Executors.newSingleThreadExecutor();
  private final AtomicBoolean pollInFlight = new AtomicBoolean(false);
  private MediaSession mediaSession;
  private MediaPlayer player;
  private Equalizer radioEqualizer;
  private long lastId = 0;
  private long serviceStartedAt = 0;
  private boolean destroyed = false;
  // No PTT or playback until a successful, authenticated poll validates attendance.
  private volatile boolean accessDenied = true;
  private android.media.AudioFocusRequest audioFocusRequest;
  private boolean audioFocusHeld = false;
  private boolean radioAuthorized() {
    return !destroyed && !accessDenied && getPrefs().getBoolean("enabled", false);
  }
  private synchronized void revokeRadioAccess() {
    accessDenied = true;
    pendingAudioUrls.clear();
    pendingAudioToken = "";
    getPrefs().edit().putBoolean("notificationPttActive", false).apply();
    releasePlayer();
    Intent off = new Intent(KhatyarRadioModule.ACTION_PTT);
    off.setPackage(getPackageName());off.putExtra("down",false);
    off.putExtra("source","attendance_revoked");sendBroadcast(off);
    try { updateNotification(); } catch(Throwable ignored) {}
  }
  private void acquireAudioFocus() {
    try {
      AudioManager am=(AudioManager)getSystemService(Context.AUDIO_SERVICE);
      if(am==null)return;
      if(Build.VERSION.SDK_INT>=26) {
        audioFocusRequest=new android.media.AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
          .setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
          .setOnAudioFocusChangeListener(change -> { if(change==AudioManager.AUDIOFOCUS_LOSS) handler.post(this::releasePlayer); })
          .build();
        audioFocusHeld=am.requestAudioFocus(audioFocusRequest)==AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
      } else {
        audioFocusHeld=am.requestAudioFocus(change -> { if(change==AudioManager.AUDIOFOCUS_LOSS) handler.post(this::releasePlayer); },
          AudioManager.STREAM_MUSIC,AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)==AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
      }
    }catch(Throwable ignored){}
  }
  private void releaseAudioFocus() {
    if(!audioFocusHeld)return;
    try {AudioManager am=(AudioManager)getSystemService(Context.AUDIO_SERVICE);
      if(am!=null && Build.VERSION.SDK_INT>=26 && audioFocusRequest!=null)am.abandonAudioFocusRequest(audioFocusRequest);
    }catch(Throwable ignored){}
    audioFocusHeld=false;
    audioFocusRequest=null;
  }


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
    // Android requires a foreground service to publish its notification immediately
    // after startForegroundService(). Do not initialize MediaSession or other
    // components before this call; a failure there can trigger the platform's
    // ForegroundServiceDidNotStartInTimeException.
    createNotificationChannel();
    startForegroundCompat();
    setupMediaSession();
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
    if (intent != null && ACTION_REFRESH_NOTIFICATION.equals(intent.getAction())) {
      updateNotification();
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
    // تاریخ شمسی مستقیماً هنگام هر refresh محاسبه می‌شود؛ به کش یا مقدار قدیمی وابسته نیست.
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

  private Notification buildRadioNotification() {
    boolean pttActive = getPrefs().getBoolean("notificationPttActive", false);

    RemoteViews compact = new RemoteViews(getPackageName(), R.layout.khatyar_radio_notification);
    RemoteViews expanded = new RemoteViews(getPackageName(), R.layout.khatyar_radio_notification_big);
    PendingIntent ptt = buildPttPendingIntent();

    String status = accessDenied ? "منتظر تأیید حضور در شیفت" : (pttActive ? "فعال • PTT فعال" : "فعال • متصل به سرور");
    String channelName = getPrefs().getString("channelName", "").trim();
    String role = getPrefs().getString("userRole", "").trim();
    String info = (role.isEmpty() ? "سمت کاربر نامشخص" : "سمت: " + role)
      + "  •  " + (channelName.isEmpty() ? "کانال بی‌سیم" : "کانال: " + channelName)
      + "  •  تاریخ شمسی: " + jalaliToday();
    String pttLabel = pttActive ? "پایان PTT" : "شروع PTT";

    compact.setTextViewText(R.id.khatyar_notification_status, status);
    compact.setTextViewText(R.id.khatyar_notification_info, info);
    compact.setTextViewText(R.id.khatyar_notification_ptt_label, pttLabel);
    compact.setOnClickPendingIntent(R.id.khatyar_notification_ptt, ptt);

    expanded.setTextViewText(R.id.khatyar_notification_status, status);
    expanded.setTextViewText(R.id.khatyar_notification_info, info);
    expanded.setTextViewText(R.id.khatyar_notification_ptt_label, pttLabel);
    expanded.setOnClickPendingIntent(R.id.khatyar_notification_ptt, ptt);

    Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
    PendingIntent contentIntent = null;
    if (launch != null) {
      int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
      contentIntent = PendingIntent.getActivity(this, 7841, launch, flags);
    }

    NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL)
      .setSmallIcon(getApplicationInfo().icon)
      .setContentTitle("خطیار • " + status)
      .setContentText(info)
      .setSubText("خطیار فعال و آماده‌به‌کار")
      .setCustomContentView(compact)
      .setCustomBigContentView(expanded)
      .setStyle(new NotificationCompat.DecoratedCustomViewStyle())
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setPriority(NotificationCompat.PRIORITY_LOW);

    if (contentIntent != null) b.setContentIntent(contentIntent);
    return b.build();
  }

  private void startForegroundCompat() {
    Notification n;
    try {
      n = buildRadioNotification();
    } catch (Throwable notificationError) {
      // Keep the foreground-service contract alive even if a custom RemoteViews
      // resource fails on a particular Android build.
      n = new NotificationCompat.Builder(this, CHANNEL)
        .setSmallIcon(getApplicationInfo().icon)
        .setContentTitle("خطیار • بی‌سیم")
        .setContentText("بی‌سیم خطیار فعال است")
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setCategory(NotificationCompat.CATEGORY_SERVICE)
        .setPriority(NotificationCompat.PRIORITY_LOW)
        .build();
    }
    if (Build.VERSION.SDK_INT >= 29) {
      startForeground(NOTIFICATION_ID, n, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
    } else {
      startForeground(NOTIFICATION_ID, n);
    }
  }

  private void updateNotification() {
    ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).notify(NOTIFICATION_ID, buildRadioNotification());
  }

  private void toggleNotificationPtt() {
    if (!radioAuthorized() || getPrefs().getLong("channelId", 0L) <= 0 || playbackActive() || player != null) return;
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
    if (!radioAuthorized() || getPrefs().getLong("channelId", 0L) <= 0 || playbackActive() || player != null) return;
    Intent i = new Intent(KhatyarRadioModule.ACTION_PTT); i.setPackage(getPackageName());
    i.putExtra("down", down); i.putExtra("source", source); sendBroadcast(i);
  }

  private void pollOnce() {
    try {
      android.content.SharedPreferences p = getPrefs();
      String token = p.getString("token", ""), base = p.getString("baseUrl", "");
      long channel = p.getLong("channelId", 0L), userId = p.getLong("userId", 0L);
      boolean listenAll = p.getBoolean("listenAll", false);
      long sessionVersion=p.getLong("sessionVersion",0L);
      boolean initializing=!p.getBoolean("initialized",false);
      if (token == null || token.isEmpty() || base == null || base.isEmpty() || !p.getBoolean("enabled", false)) return;
      String endpoint;
      if (listenAll) endpoint = base.replaceAll("/+$", "") + "/radio-api-v2.php?op=poll-all&after=" + lastId;
      else {
        if (channel <= 0) return;
        endpoint = base.replaceAll("/+$", "") + "/radio-api-v2.php?op=poll&channel_id=" + channel + "&after=" + lastId;
      }
      if(initializing)endpoint+="&initialize=1";
      String body = get(endpoint, token);
      if ("__RADIO_FORBIDDEN__".equals(body)) {
        synchronized(this) { revokeRadioAccess(); }
        return;
      }
      if (body == null || body.isEmpty()) return;
      accessDenied = false;
      synchronized(KhatyarRadioService.class){
      if(destroyed||p.getLong("sessionVersion",0L)!=sessionVersion||p.getLong("channelId",0L)!=channel||p.getLong("userId",0L)!=userId||p.getBoolean("listenAll",false)!=listenAll||!p.getBoolean("enabled",false))return;
      JSONObject root = new JSONObject(body);
      JSONArray messages = root.optJSONArray("messages");
      boolean initialized = p.getBoolean("initialized", false);
      if (!initialized) {
        if(!root.has("last_message_id"))return;
        lastId=Math.max(0L,root.optLong("last_message_id",0L));
        p.edit().putLong("lastId",lastId).putBoolean("initialized",true).apply();
        return;
      }
      for (int idx = 0; messages != null && idx < messages.length(); idx++) {
        JSONObject m = messages.optJSONObject(idx); if (m == null) continue;
        if(!listenAll&&m.optLong("channel_id",channel)!=channel)continue;
        long id = m.optLong("id", 0L); if(id<=lastId)continue;lastId = id;
        if (m.optLong("sender_id", 0L) == userId) continue;
        String audio = m.optString("audio_url", "");
        if (!audio.isEmpty() && !isAppInForeground()) enqueueRemote(audio, token);
      }
      p.edit().putLong("lastId", lastId).apply();
      }
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
      int code = c.getResponseCode(); if (code == 403 || code == 401) return "__RADIO_FORBIDDEN__"; if (code < 200 || code >= 300) return null;
      BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8")); StringBuilder out = new StringBuilder(); String line;
      while ((line = r.readLine()) != null) out.append(line); r.close(); return out.toString();
    } catch (Throwable e) { return null; } finally { if (c != null) c.disconnect(); }
  }

  private synchronized void enqueueRemote(String audioUrl, String token) {
    if (!radioAuthorized() || audioUrl == null || audioUrl.isEmpty()) return;
    if (pendingAudioUrls.size() >= 20) pendingAudioUrls.pollFirst();
    pendingAudioUrls.offerLast(audioUrl);
    pendingAudioToken = token == null ? "" : token;
    if (player == null && !playbackActive()) playNextRemote();
  }
  private synchronized void playNextRemote() {
    if (!radioAuthorized() || player != null || pendingAudioUrls.isEmpty()) return;
    String url = pendingAudioUrls.pollFirst();
    playRemote(url, pendingAudioToken);
  }
  private void ensureMaxMediaVolume() {
    try {
      AudioManager am = (AudioManager)getSystemService(Context.AUDIO_SERVICE);
      if (am == null) return;
      int max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
      if (max > 0 && am.getStreamVolume(AudioManager.STREAM_MUSIC) < max) am.setStreamVolume(AudioManager.STREAM_MUSIC, max, 0);
    } catch (Throwable ignored) {}
  }

  private synchronized void releasePlayer() {
    Equalizer eq = radioEqualizer;
    radioEqualizer = null;
    if (eq != null) { try { eq.setEnabled(false); } catch (Throwable ignored) {} try { eq.release(); } catch (Throwable ignored) {} }
    MediaPlayer old = player;
    player = null;
    if (old != null) { try { old.stop(); } catch (Throwable ignored) {} try { old.release(); } catch (Throwable ignored) {} }
    setPlaybackActive(false);
    releaseAudioFocus();
  }

  /**
   * Gives received speech a narrow-band walkie-talkie character without requiring
   * a third-party DSP library. The recorder is already 8 kHz mono, so we keep the
   * processing focused on speech and avoid artificial reverb/bass.
   */
  private void attachRadioEqualizer(MediaPlayer mp) {
    try {
      if (Build.VERSION.SDK_INT < 19) return;
      Equalizer eq = new Equalizer(0, mp.getAudioSessionId());
      short bands = eq.getNumberOfBands();
      if (bands <= 0) { eq.release(); return; }

      for (short b = 0; b < bands; b++) {
        int centerHz = eq.getCenterFreq(b) / 1000;
        short level;
        if (centerHz < 300) {
          level = -1200;
        } else if (centerHz < 700) {
          level = -450;
        } else if (centerHz < 1800) {
          level = 650;
        } else if (centerHz < 3000) {
          level = 350;
        } else {
          level = -900;
        }
        try { eq.setBandLevel(b, level); } catch (Throwable ignored) {}
      }
      eq.setEnabled(true);
      radioEqualizer = eq;
    } catch (Throwable ignored) {
      radioEqualizer = null;
    }
  }

  /** Native radio SFX for background reception. Generated locally so no extra audio asset/dependency is required. */
  private void playRadioSfx(boolean opening, boolean closing) {
    if(!destroyed)RadioSfxPlayer.play(this,opening?"receive_leadin":"receive_tail");
  }

  private void playRadioKeyTone(boolean pressed) {
    if(!destroyed)RadioSfxPlayer.play(this,pressed?"ptt_press":"roger");
  }

  public synchronized void setAmplificationGain(int gainMb) {
    int safe = clampGainMb(gainMb);
    getPrefs().edit().putInt("amplificationGainMb", safe).apply();
  }

  private synchronized void playRemote(String audioUrl, String token) {
    try {
      if (!radioAuthorized()) return;
      acquireAudioFocus();
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
      final long playbackSession=getPrefs().getLong("sessionVersion",0L);
      player.setOnCompletionListener(mp -> { synchronized (KhatyarRadioService.this) { if(!radioAuthorized()||player!=mp||getPrefs().getLong("sessionVersion",0L)!=playbackSession)return;playRadioSfx(false,true); try { mp.release(); } catch (Throwable ignored) {} if (player == mp) player = null; setPlaybackActive(false); playNextRemote(); } });
      player.setOnErrorListener((mp, what, extra) -> { synchronized (KhatyarRadioService.this) { if(destroyed||player!=mp||getPrefs().getLong("sessionVersion",0L)!=playbackSession)return true; try { mp.release(); } catch (Throwable ignored) {} if (player == mp) player = null; setPlaybackActive(false); playNextRemote(); } return true; });
      player.setOnPreparedListener(mp -> {
        if(destroyed||player!=mp||getPrefs().getLong("sessionVersion",0L)!=playbackSession)return;
        try {
          ensureMaxMediaVolume();
          int sessionId = mp.getAudioSessionId();
          getPrefs().edit().putInt("audioSessionId", Math.max(0, sessionId)).putBoolean("playbackActive", true).apply();
          attachRadioEqualizer(mp);
          final long preparedSession=getPrefs().getLong("sessionVersion",0L);
          playRadioSfx(true,false);
          handler.postDelayed(()->{synchronized(KhatyarRadioService.this){if(!radioAuthorized()||player!=mp||getPrefs().getLong("sessionVersion",0L)!=preparedSession)return;try{mp.start();}catch(Throwable error){releasePlayer();}}},100L);
        } catch (Throwable ignored) {
          setPlaybackActive(false);
        }
      });
      player.prepareAsync();
    } catch (Throwable ignored) { releasePlayer(); }
  }

  @Override public void onDestroy() {
    destroyed = true; accessDenied = true; handler.removeCallbacksAndMessages(null); io.shutdownNow();
    if (mediaSession != null) { try { mediaSession.setActive(false); mediaSession.release(); } catch (Throwable ignored) {} mediaSession = null; }
    synchronized(this){pendingAudioUrls.clear();releasePlayer();}
    super.onDestroy();
  }
  @Nullable @Override public IBinder onBind(Intent intent) { return null; }
}
