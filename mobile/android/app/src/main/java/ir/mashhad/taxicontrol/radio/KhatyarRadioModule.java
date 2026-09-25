package ir.mashhad.taxicontrol.radio;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import androidx.annotation.NonNull;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public final class KhatyarRadioModule extends ReactContextBaseJavaModule {
  public static final String EVENT_PTT="khatyarRadioPTT";
  public static final String ACTION_PTT="ir.mashhad.taxicontrol.radio.PTT";
  private final ReactApplicationContext context;
  private boolean foregroundRequested=false;
  private final BroadcastReceiver receiver=new BroadcastReceiver(){@Override public void onReceive(Context c,Intent i){if(!ACTION_PTT.equals(i.getAction()))return;WritableMap map=Arguments.createMap();map.putString("source",i.getStringExtra("source"));map.putBoolean("down",i.getBooleanExtra("down",false));emit(EVENT_PTT,map);}};
  public KhatyarRadioModule(ReactApplicationContext context){super(context);this.context=context;IntentFilter f=new IntentFilter(ACTION_PTT);if(Build.VERSION.SDK_INT>=33)context.registerReceiver(receiver,f,Context.RECEIVER_NOT_EXPORTED);else context.registerReceiver(receiver,f);}
  @NonNull @Override public String getName(){return "KhatyarRadio";}
  private void emit(String name,WritableMap data){if(context.hasActiveCatalystInstance())context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit(name,data);}
  @ReactMethod public void addListener(String eventName){}
  @ReactMethod public void removeListeners(double count){}
  @ReactMethod public void isPlaybackActive(Promise promise){try{promise.resolve(context.getSharedPreferences(KhatyarRadioService.PREFS,Context.MODE_PRIVATE).getBoolean("playbackActive",false));}catch(Throwable e){promise.resolve(false);}}
  /**
   * The radio service owns the MediaPlayer, so it also owns the authoritative audio-session ID.
   * Read that ID from shared preferences instead of using AudioPlaybackConfiguration's @SystemApi
   * methods (getClientUid/getSessionId), which are not part of the normal Android SDK surface and
   * cause javac compilation failures with current compileSdk versions.
   */
  private int findActiveAppAudioSessionId(){
    try{
      android.content.SharedPreferences prefs=context.getSharedPreferences(KhatyarRadioService.PREFS,Context.MODE_PRIVATE);
      if(!prefs.getBoolean("playbackActive",false))return 0;
      return Math.max(0,prefs.getInt("audioSessionId",0));
    }catch(Throwable ignored){return 0;}
  }

  @ReactMethod public void setListenAll(boolean listenAll,Promise promise){try{Context app=context.getApplicationContext();android.content.SharedPreferences p=app.getSharedPreferences(KhatyarRadioService.PREFS,Context.MODE_PRIVATE);boolean old=p.getBoolean("listenAll",false);p.edit().putBoolean("listenAll",listenAll).putBoolean("allInitialized",old==listenAll&&p.getBoolean("allInitialized",false)).apply();promise.resolve(true);}catch(Throwable e){promise.reject("RADIO_NATIVE",e);}}
  @ReactMethod public void setChannelInfo(double channelId,String channelName,Promise promise){try{context.getSharedPreferences(KhatyarRadioService.PREFS,Context.MODE_PRIVATE).edit().putLong("channelId",(long)channelId).putString("channelName",channelName==null?"":channelName.trim()).apply();promise.resolve(true);}catch(Throwable e){promise.reject("RADIO_NATIVE",e);}}
  @ReactMethod public void configure(String token,String baseUrl,double userId,double channelId,boolean enabled,double lastMessageId,Promise promise){try{Context app=context.getApplicationContext();android.content.SharedPreferences p=app.getSharedPreferences(KhatyarRadioService.PREFS,Context.MODE_PRIVATE);long oldChannel=p.getLong("channelId",0L);boolean channelChanged=oldChannel!=(long)channelId;p.edit().putString("token",token==null?"":token).putString("baseUrl",baseUrl==null?"":baseUrl).putLong("userId",(long)userId).putLong("channelId",(long)channelId).putBoolean("enabled",enabled).apply();if(channelChanged){p.edit().putLong("lastId",Math.max(0L,(long)lastMessageId)).putBoolean("initialized",false).putBoolean("allInitialized",false).apply();app.stopService(new Intent(app,KhatyarRadioService.class));}if(enabled&&channelId>0&&token!=null&&!token.isEmpty()){Intent in=new Intent(app,KhatyarRadioService.class);if(Build.VERSION.SDK_INT>=26)app.startForegroundService(in);else app.startService(in);}else app.stopService(new Intent(app,KhatyarRadioService.class));promise.resolve(true);}catch(Throwable e){promise.reject("RADIO_NATIVE",e);}}
  @ReactMethod public void stop(Promise promise){try{foregroundRequested=false;context.getApplicationContext().stopService(new Intent(context.getApplicationContext(),KhatyarRadioService.class));promise.resolve(true);}catch(Throwable e){promise.reject("RADIO_NATIVE",e);}}
  @ReactMethod public void setForegroundState(boolean foreground,Promise promise){try{context.getApplicationContext().getSharedPreferences(KhatyarRadioService.PREFS,Context.MODE_PRIVATE).edit().putBoolean("jsForeground",foreground).putLong("jsForegroundAt",System.currentTimeMillis()).apply();foregroundRequested=foreground;promise.resolve(true);}catch(Throwable e){promise.reject("RADIO_NATIVE",e);}}
  @Override public void invalidate(){foregroundRequested=false;handler.removeCallbacks(foregroundMonitor);releaseForegroundEnhancer();try{context.unregisterReceiver(receiver);}catch(Throwable ignored){}super.invalidate();}
}