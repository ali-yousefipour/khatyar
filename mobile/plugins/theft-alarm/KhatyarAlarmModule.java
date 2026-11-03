package ir.mashhad.taxicontrol.alarm;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;

public final class KhatyarAlarmModule extends ReactContextBaseJavaModule {
  private final ReactApplicationContext context;
  public KhatyarAlarmModule(ReactApplicationContext context) { super(context); this.context=context; }
  @Override public String getName() { return "KhatyarTheftAlarm"; }

  @ReactMethod public void arm(Promise promise) {
    try {
      android.hardware.SensorManager sensors=(android.hardware.SensorManager)context.getSystemService(Context.SENSOR_SERVICE);
      if(sensors==null||sensors.getDefaultSensor(android.hardware.Sensor.TYPE_ACCELEROMETER)==null){
        promise.reject("ALARM_SENSOR_UNAVAILABLE","حسگر حرکت گوشی در دسترس نیست.");return;
      }
      Intent intent=new Intent(context,KhatyarAlarmService.class).setAction(KhatyarAlarmService.ARM);
      if(Build.VERSION.SDK_INT>=26) context.startForegroundService(intent); else context.startService(intent);
      promise.resolve(true);
    } catch(Exception e) { promise.reject("ALARM_ARM_FAILED",e); }
  }
  @ReactMethod public void disarm(Promise promise) {
    try {
      context.getSharedPreferences(KhatyarAlarmService.PREFS,Context.MODE_PRIVATE).edit().putBoolean("armed",false).putBoolean("arming",false).remove("armingEndsAt").putBoolean("triggered",false).commit();
      context.stopService(new Intent(context,KhatyarAlarmService.class));
      promise.resolve(true);
    } catch(Exception e) { promise.reject("ALARM_DISARM_FAILED",e); }
  }
  @ReactMethod public void status(Promise promise) {
    android.content.SharedPreferences p=context.getSharedPreferences(KhatyarAlarmService.PREFS,Context.MODE_PRIVATE);
    WritableMap map=Arguments.createMap();
    map.putBoolean("armed",p.getBoolean("armed",false));
    map.putBoolean("arming",p.getBoolean("arming",false));
    map.putDouble("armingEndsAt",p.getLong("armingEndsAt",0));
    map.putBoolean("triggered",p.getBoolean("triggered",false));
    map.putString("reason",p.getString("reason",""));
    promise.resolve(map);
  }
}
