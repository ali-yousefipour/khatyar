package ir.mashhad.taxicontrol.alarm;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.hardware.*;
import android.media.*;
import android.os.*;
import androidx.core.app.NotificationCompat;

public final class KhatyarAlarmService extends Service implements SensorEventListener {
  public static final String PREFS="khatyar_theft_alarm";
  public static final String ARM="ir.mashhad.taxicontrol.alarm.ARM";
  private static final String CHANNEL="khatyar_theft_alarm_channel";
  private static final int NOTIFICATION_ID=9077;
  private static final long ARM_DELAY_MS=10000L;
  private final Handler handler=new Handler(Looper.getMainLooper());
  private SensorManager sensors;
  private Sensor accelerometer;
  private BroadcastReceiver powerReceiver;
  private PowerManager.WakeLock wakeLock;
  private MediaPlayer siren;
  private AudioManager audioManager;
  private AudioFocusRequest audioFocusRequest;
  private int previousMusicVolume=-1;
  private boolean armed=false, arming=false, triggered=false, pluggedAtArm=false;
  private long lastMotion=0;
  private int motionHits=0;
  private final float[] gravity=new float[3];
  private boolean calibrated=false;
  private final Runnable finishArming=() -> {
    if(!arming)return;
    arming=false;armed=true;triggered=false;calibrated=false;motionHits=0;
    Intent battery=registerReceiver(null,new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
    int plugged=battery==null?0:battery.getIntExtra(BatteryManager.EXTRA_PLUGGED,0);
    pluggedAtArm=plugged!=0;
    getSharedPreferences(PREFS,MODE_PRIVATE).edit().putBoolean("arming",false).putBoolean("armed",true).remove("armingEndsAt").apply();
    if(accelerometer!=null)sensors.registerListener(this,accelerometer,SensorManager.SENSOR_DELAY_NORMAL);
    ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).notify(NOTIFICATION_ID,notification(false));
  };

  @Override public void onCreate() {
    super.onCreate();
    NotificationManager manager=getSystemService(NotificationManager.class);
    manager.createNotificationChannel(new NotificationChannel(CHANNEL,"دزدگیر خطیار",NotificationManager.IMPORTANCE_HIGH));
    sensors=(SensorManager)getSystemService(SENSOR_SERVICE);
    accelerometer=sensors.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
    powerReceiver=new BroadcastReceiver(){@Override public void onReceive(Context c,Intent i){
      if(!armed||triggered)return;
      if(Intent.ACTION_POWER_DISCONNECTED.equals(i.getAction())&&pluggedAtArm)trigger("charger");
    }};
    registerReceiver(powerReceiver,new IntentFilter(Intent.ACTION_POWER_DISCONNECTED));
  }

  @Override public int onStartCommand(Intent intent,int flags,int startId) {
    if(!ARM.equals(intent==null?null:intent.getAction())) {
      android.content.SharedPreferences p=getSharedPreferences(PREFS,MODE_PRIVATE);
      if(!p.getBoolean("armed",false)&&!p.getBoolean("arming",false)){stopSelf();return START_NOT_STICKY;}
    }
    if(armed||arming)return START_STICKY;
    startForeground(NOTIFICATION_ID,notification(false),ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
    arming=true;armed=false;triggered=false;
    getSharedPreferences(PREFS,MODE_PRIVATE).edit().putBoolean("arming",true).putBoolean("armed",false)
      .putLong("armingEndsAt",System.currentTimeMillis()+ARM_DELAY_MS)
      .putBoolean("triggered",false).putString("reason","").apply();
    PowerManager pm=(PowerManager)getSystemService(POWER_SERVICE);
    wakeLock=pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"khatyar:theftAlarm");
    wakeLock.acquire(); // user-armed foreground service; released on disarm
    handler.postDelayed(finishArming,ARM_DELAY_MS);
    return START_STICKY;
  }

  @Override public void onSensorChanged(SensorEvent event) {
    if(!armed||triggered||event.sensor.getType()!=Sensor.TYPE_ACCELEROMETER)return;
    for(int i=0;i<3;i++)gravity[i]=calibrated?0.88f*gravity[i]+0.12f*event.values[i]:event.values[i];
    if(!calibrated){calibrated=true;return;}
    // The ten-second native countdown already provides the placement grace period.
    float x=event.values[0]-gravity[0],y=event.values[1]-gravity[1],z=event.values[2]-gravity[2];
    float movement=(float)Math.sqrt(x*x+y*y+z*z);
    long now=SystemClock.elapsedRealtime();
    if(movement>2.8f){motionHits=(now-lastMotion<900)?motionHits+1:1;lastMotion=now;if(motionHits>=3)trigger("movement");}
    else if(now-lastMotion>900)motionHits=0;
  }
  @Override public void onAccuracyChanged(Sensor sensor,int accuracy) {}

  private void trigger(String reason) {
    if(!armed||triggered)return;
    triggered=true;
    getSharedPreferences(PREFS,MODE_PRIVATE).edit().putBoolean("triggered",true).putString("reason",reason).apply();
    try {
      audioManager=(AudioManager)getSystemService(AUDIO_SERVICE);
      if(audioManager!=null){
        AudioAttributes attributes=new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build();
        if(Build.VERSION.SDK_INT>=26){
          audioFocusRequest=new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE).setAudioAttributes(attributes).build();
          audioManager.requestAudioFocus(audioFocusRequest);
        }
        previousMusicVolume=audioManager.getStreamVolume(AudioManager.STREAM_MUSIC);
        try{audioManager.setStreamVolume(AudioManager.STREAM_MUSIC,audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC),0);}catch(SecurityException ignored){}
      }
      siren=new MediaPlayer();
      siren.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
      try(android.content.res.AssetFileDescriptor sound=getResources().openRawResourceFd(ir.mashhad.taxicontrol.R.raw.khatyar_theft_siren)){
        siren.setDataSource(sound.getFileDescriptor(),sound.getStartOffset(),sound.getLength());
      }
      siren.setLooping(true);siren.setVolume(1.0f,1.0f);siren.prepare();siren.start();
    } catch(Exception ignored) {}
    ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).notify(NOTIFICATION_ID,notification(true));
  }

  private Notification notification(boolean alert) {
    Intent launch=getPackageManager().getLaunchIntentForPackage(getPackageName());
    PendingIntent pi=launch==null?null:PendingIntent.getActivity(this,0,launch,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    return new NotificationCompat.Builder(this,CHANNEL)
      .setSmallIcon(android.R.drawable.ic_lock_lock)
      .setContentTitle(alert?"هشدار دزدگیر خطیار":arming?"دزدگیر در حال آماده‌سازی":"دزدگیر خطیار فعال است")
      .setContentText(alert?"حرکت یا جداشدن شارژر تشخیص داده شد؛ برای توقف رمز برنامه را وارد کنید.":arming?"۱۰ ثانیه فرصت دارید گوشی را در جای مناسب قرار دهید.":"گوشی تحت مراقبت است؛ برای غیرفعال‌سازی رمز برنامه لازم است.")
      .setOngoing(true).setCategory(alert?NotificationCompat.CATEGORY_ALARM:NotificationCompat.CATEGORY_SERVICE)
      .setContentIntent(pi).build();
  }

  @Override public void onDestroy() {
    armed=false;arming=false;
    handler.removeCallbacks(finishArming);
    if(sensors!=null)sensors.unregisterListener(this);
    if(powerReceiver!=null)try{unregisterReceiver(powerReceiver);}catch(Exception ignored){}
    if(siren!=null){try{siren.stop();}catch(Exception ignored){}siren.release();siren=null;}
    if(audioManager!=null&&previousMusicVolume>=0){try{audioManager.setStreamVolume(AudioManager.STREAM_MUSIC,previousMusicVolume,0);}catch(Exception ignored){}previousMusicVolume=-1;}
    if(audioManager!=null&&audioFocusRequest!=null&&Build.VERSION.SDK_INT>=26){audioManager.abandonAudioFocusRequest(audioFocusRequest);audioFocusRequest=null;}
    if(wakeLock!=null&&wakeLock.isHeld())wakeLock.release();
    getSharedPreferences(PREFS,MODE_PRIVATE).edit().putBoolean("armed",false).putBoolean("arming",false).remove("armingEndsAt").putBoolean("triggered",false).apply();
    super.onDestroy();
  }
  @Override public android.os.IBinder onBind(Intent intent){return null;}
}
