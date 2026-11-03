package ir.mashhad.taxicontrol.smsotp;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import androidx.core.content.ContextCompat;
import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.google.android.gms.auth.api.phone.SmsRetriever;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;
import com.google.android.gms.common.api.CommonStatusCodes;
import com.google.android.gms.common.api.Status;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Receives only app-matched OTPs; never requests READ_SMS or RECEIVE_SMS. */
public final class KhatyarSmsOtpModule extends ReactContextBaseJavaModule {
  private static final int CONSENT_REQUEST = 48362;
  private static final Pattern LOGIN_CODE = Pattern.compile("کد\\s+ورود\\s+خطیار\\s*[:：]\\s*([0-9]{6})");
  private final ReactApplicationContext context;
  private BroadcastReceiver receiver;
  private boolean listening;

  public KhatyarSmsOtpModule(ReactApplicationContext context) {
    super(context);
    this.context = context;
    context.addActivityEventListener(activityListener);
  }
  @Override public String getName() { return "KhatyarSmsOtp"; }
  @ReactMethod public void addListener(String eventName) { /* React Native event emitter contract */ }
  @ReactMethod public void removeListeners(double count) { /* React Native event emitter contract */ }

  private final ActivityEventListener activityListener = new BaseActivityEventListener() {
    @Override public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
      if (requestCode != CONSENT_REQUEST || !listening) return;
      if (resultCode == Activity.RESULT_OK && data != null) {
        deliver(data.getStringExtra(SmsRetriever.EXTRA_SMS_MESSAGE));
      } else emit("KhatyarSmsOtpDeclined");
      stopListening();
    }
  };

  private void emit(String event) {
    if (context.hasActiveReactInstance())
      context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit(event, null);
  }
  private void deliver(String message) {
    if (!listening || message == null) return;
    Matcher matcher = LOGIN_CODE.matcher(message);
    if (matcher.find() && context.hasActiveReactInstance()) {
      com.facebook.react.bridge.WritableMap data = com.facebook.react.bridge.Arguments.createMap();
      data.putString("code", matcher.group(1));
      context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit("KhatyarSmsOtpCode", data);
    }
  }

  private void stopListening() {
    listening = false;
    if (receiver != null) {
      try { context.unregisterReceiver(receiver); } catch (Exception ignored) {}
      receiver = null;
    }
  }

  @ReactMethod public void start(String mode, Promise promise) {
    if (!"retriever".equals(mode) && !"consent".equals(mode)) {
      promise.reject("SMS_OTP_MODE", "Invalid SMS verification mode"); return;
    }
    if (GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(context) != ConnectionResult.SUCCESS) {
      promise.reject("SMS_OTP_NO_GMS", "Google Play services unavailable"); return;
    }
    stopListening();
    listening = true;
    final boolean consent = "consent".equals(mode);
    receiver = new BroadcastReceiver() {
      @Override public void onReceive(Context ignored, Intent intent) {
        if (!listening || !SmsRetriever.SMS_RETRIEVED_ACTION.equals(intent.getAction()) || intent.getExtras() == null) return;
        Status status = intent.getParcelableExtra(SmsRetriever.EXTRA_STATUS);
        if (status == null) return;
        if (status.getStatusCode() == CommonStatusCodes.TIMEOUT) {
          emit("KhatyarSmsOtpTimeout"); stopListening(); return;
        }
        if (status.getStatusCode() != CommonStatusCodes.SUCCESS) return;
        if (!consent) {
          deliver(intent.getStringExtra(SmsRetriever.EXTRA_SMS_MESSAGE));
          stopListening();
        } else {
          Intent approval = intent.getParcelableExtra(SmsRetriever.EXTRA_CONSENT_INTENT);
          Activity activity = getCurrentActivity();
          if (approval == null || activity == null) { emit("KhatyarSmsOtpDeclined"); stopListening(); return; }
          try { activity.startActivityForResult(approval, CONSENT_REQUEST); }
          catch (Exception e) { emit("KhatyarSmsOtpDeclined"); stopListening(); }
        }
      }
    };
    try {
      ContextCompat.registerReceiver(context, receiver, new IntentFilter(SmsRetriever.SMS_RETRIEVED_ACTION),
        SmsRetriever.SEND_PERMISSION, null, ContextCompat.RECEIVER_EXPORTED);
      com.google.android.gms.tasks.Task<Void> task = consent
        ? SmsRetriever.getClient(context).startSmsUserConsent(null)
        : SmsRetriever.getClient(context).startSmsRetriever();
      task.addOnSuccessListener(unused -> promise.resolve(true));
      task.addOnFailureListener(error -> { stopListening(); promise.reject("SMS_OTP_START", error); });
    } catch (Exception error) { stopListening(); promise.reject("SMS_OTP_START", error); }
  }

  @ReactMethod public void stop(Promise promise) { stopListening(); promise.resolve(true); }
  @Override public void invalidate() { stopListening(); super.invalidate(); }
}
