package ir.mashhad.taxicontrol.radio;

import android.app.*;
import android.content.*;
import android.media.*;
import android.os.*;

/** Repeats until wizard entry explicitly stops it, independently of JS/shade state. */
public final class PresenceAlarmService extends Service {
  private MediaPlayer player;
  public static void start(Context context) {
    Intent intent=new Intent(context,PresenceAlarmService.class);
    if(Build.VERSION.SDK_INT>=26)context.startForegroundService(intent);else context.startService(intent);
  }
  public static void stop(Context context){context.stopService(new Intent(context,PresenceAlarmService.class));}
  @Override public int onStartCommand(Intent intent,int flags,int id){
    if(player!=null)return START_NOT_STICKY;
    try{
      String channel="presence_playback";
      NotificationManager manager=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
      if(Build.VERSION.SDK_INT>=26){
        NotificationChannel nc=new NotificationChannel(channel,"هشدار فعال صحت‌سنجی",NotificationManager.IMPORTANCE_LOW);
        nc.setSound(null,null);manager.createNotificationChannel(nc);
      }
      Intent launch=getPackageManager().getLaunchIntentForPackage(getPackageName());
      PendingIntent open=launch==null?null:PendingIntent.getActivity(this,7191,launch,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
      Notification.Builder builder=Build.VERSION.SDK_INT>=26?new Notification.Builder(this,channel):new Notification.Builder(this);
      builder.setSmallIcon(getApplicationInfo().icon).setContentTitle("صحت‌سنجی حضور")
        .setContentText("برای انجام صحت‌سنجی برنامه را باز کنید").setOngoing(true).setContentIntent(open);
      startForeground(7191,builder.build());
      int resource=getResources().getIdentifier("presence_validation_alert","raw",getPackageName());
      if(resource==0)throw new IllegalStateException("Presence alarm resource unavailable");
      player=new MediaPlayer();
      player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
      player.setWakeMode(this,PowerManager.PARTIAL_WAKE_LOCK);
      android.content.res.AssetFileDescriptor audio=getResources().openRawResourceFd(resource);
      try{player.setDataSource(audio.getFileDescriptor(),audio.getStartOffset(),audio.getLength());}finally{audio.close();}
      player.setLooping(true);player.prepare();player.start();
    }catch(Exception error){android.util.Log.e("PresenceAlarm","Could not start alarm",error);stopSelf();}
    return START_NOT_STICKY;
  }
  @Override public void onDestroy(){
    if(player!=null){try{player.stop();}catch(Exception ignored){}player.release();player=null;}
    stopForeground(true);super.onDestroy();
  }
  @Override public IBinder onBind(Intent intent){return null;}
}
