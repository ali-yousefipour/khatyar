package ir.mashhad.taxicontrol.screenpolicy;

import android.app.Activity;
import android.content.Context;
import android.view.WindowManager;
import androidx.annotation.NonNull;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.LifecycleEventListener;

public final class KhatyarScreenPolicyModule extends ReactContextBaseJavaModule implements LifecycleEventListener {
  private final ReactApplicationContext reactContext;

  public KhatyarScreenPolicyModule(ReactApplicationContext context) {
    super(context);
    this.reactContext = context;
    context.addLifecycleEventListener(this);
  }

  @NonNull @Override public String getName() { return "KhatyarScreenPolicy"; }

  private void applyToCurrentActivity() {
    Activity activity = getCurrentActivity();
    if (activity == null) return;
    final boolean blocked = reactContext.getSharedPreferences("khatyar_screen_policy", Context.MODE_PRIVATE)
        .getBoolean("blocked", false);
    activity.runOnUiThread(() -> {
      if (activity.isFinishing() || activity.isDestroyed()) return;
      if (blocked) activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
      else activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
    });
  }

  @Override public void onHostResume() { applyToCurrentActivity(); }
  @Override public void onHostPause() { }
  @Override public void onHostDestroy() { }

  @ReactMethod public void setBlocked(boolean blocked, Promise promise) {
    try {
      reactContext.getSharedPreferences("khatyar_screen_policy", Context.MODE_PRIVATE)
          .edit().putBoolean("blocked", blocked).apply();
      Activity activity = getCurrentActivity();
      if (activity == null) { promise.resolve(true); return; }
      activity.runOnUiThread(() -> {
        try {
          if (!activity.isFinishing() && !activity.isDestroyed()) {
            if (blocked) activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
            else activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
          }
          promise.resolve(true);
        } catch (Exception error) { promise.reject("SCREEN_POLICY", error); }
      });
    } catch (Exception error) { promise.reject("SCREEN_POLICY", error); }
  }
}
