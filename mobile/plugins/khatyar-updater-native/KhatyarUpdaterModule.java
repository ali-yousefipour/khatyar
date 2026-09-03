package ir.mashhad.taxicontrol.updater;

import android.Manifest;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.Settings;
import android.webkit.MimeTypeMap;

import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class KhatyarUpdaterModule extends ReactContextBaseJavaModule {
    private static final String NAME = "KhatyarUpdater";
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    public KhatyarUpdaterModule(ReactApplicationContext context) { super(context); }
    @Override public String getName() { return NAME; }

    private void emit(String event, WritableMap data) {
        try { getReactApplicationContext().getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit(event, data); } catch (Exception ignored) {}
    }
    private void emitProgress(long done, long total) {
        WritableMap m = Arguments.createMap();
        m.putDouble("downloaded", done);
        m.putDouble("total", total);
        m.putDouble("progress", total > 0 ? Math.min(1d, Math.max(0d, (double) done / total)) : 0d);
        emit("khatyarUpdaterProgress", m);
    }
    private String safeName(String name) {
        String n = name == null ? "" : name.trim().replaceAll("[^A-Za-z0-9._-]", "_");
        if (n.length() < 5) n = "KhatYar-update.apk";
        if (!n.toLowerCase(Locale.US).endsWith(".apk")) n += ".apk";
        return n;
    }

    @ReactMethod
    public void downloadApk(String urlString, String fileName, Promise promise) {
        if (urlString == null || urlString.trim().isEmpty()) { promise.reject("UPDATE_URL", "آدرس فایل به‌روزرسانی خالی است."); return; }
        final String name = safeName(fileName);
        executor.execute(() -> {
            HttpURLConnection connection = null;
            Uri pendingUri = null;
            File legacyFile = null;
            try {
                URL url = new URL(urlString);
                connection = (HttpURLConnection) url.openConnection();
                connection.setConnectTimeout(30000);
                connection.setReadTimeout(120000);
                connection.setInstanceFollowRedirects(true);
                connection.setRequestProperty("Accept", "application/vnd.android.package-archive,application/octet-stream,*/*");
                connection.connect();
                int code = connection.getResponseCode();
                if (code < 200 || code >= 300) throw new Exception("دانلود فایل ناموفق بود (HTTP " + code + ").");
                long total = connection.getContentLengthLong();
                emitProgress(0, total);

                OutputStream out;
                Uri finalUri;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentResolver resolver = getReactApplicationContext().getContentResolver();
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                    values.put(MediaStore.MediaColumns.MIME_TYPE, "application/vnd.android.package-archive");
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    values.put(MediaStore.MediaColumns.IS_PENDING, 1);
                    pendingUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (pendingUri == null) throw new Exception("ایجاد فایل در پوشه Downloads ممکن نشد.");
                    finalUri = pendingUri;
                    out = resolver.openOutputStream(pendingUri);
                    if (out == null) throw new Exception("دسترسی نوشتن فایل به Downloads ممکن نشد.");
                } else {
                    if (ContextCompat.checkSelfPermission(getReactApplicationContext(), Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                        throw new Exception("برای ذخیره فایل در پوشه دانلودها، دسترسی ذخیره‌سازی لازم است.");
                    }
                    File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    if (!dir.exists() && !dir.mkdirs()) throw new Exception("پوشه Downloads قابل ایجاد نیست.");
                    legacyFile = new File(dir, name);
                    out = new FileOutputStream(legacyFile);
                    finalUri = FileProvider.getUriForFile(getReactApplicationContext(), getReactApplicationContext().getPackageName() + ".khatyar.fileprovider", legacyFile);
                }

                try (InputStream in = connection.getInputStream(); OutputStream output = out) {
                    byte[] buffer = new byte[64 * 1024];
                    long done = 0;
                    int read;
                    long lastEmit = 0;
                    while ((read = in.read(buffer)) != -1) {
                        output.write(buffer, 0, read);
                        done += read;
                        long now = System.currentTimeMillis();
                        if (now - lastEmit >= 200 || (total > 0 && done >= total)) { emitProgress(done, total); lastEmit = now; }
                    }
                    output.flush();
                    if (total > 0 && done != total) throw new Exception("فایل دانلودشده ناقص است.");
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.MediaColumns.IS_PENDING, 0);
                    getReactApplicationContext().getContentResolver().update(finalUri, values, null, null);
                }
                emitProgress(total > 0 ? total : 1, total > 0 ? total : 1);
                WritableMap result = Arguments.createMap();
                result.putString("fileName", name);
                result.putString("uri", finalUri.toString());
                result.putString("location", "Downloads/" + name);
                emit("khatyarUpdaterComplete", result);
                promise.resolve(result);
                installApk(finalUri);
            } catch (Exception e) {
                try {
                    if (pendingUri != null) getReactApplicationContext().getContentResolver().delete(pendingUri, null, null);
                    if (legacyFile != null) legacyFile.delete();
                } catch (Exception ignored) {}
                WritableMap m = Arguments.createMap();
                m.putString("message", e.getMessage() == null ? "دانلود ناموفق بود." : e.getMessage());
                emit("khatyarUpdaterError", m);
                promise.reject("UPDATE_DOWNLOAD", e.getMessage(), e);
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
    }

    @ReactMethod
    public void installLastDownloaded(String uriString, Promise promise) {
        try {
            Uri uri = Uri.parse(uriString);
            installApk(uri);
            promise.resolve(true);
        } catch (Exception e) { promise.reject("UPDATE_INSTALL", e.getMessage(), e); }
    }

    private void installApk(Uri uri) {
        ReactApplicationContext context = getReactApplicationContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !context.getPackageManager().canRequestPackageInstalls()) {
            try {
                Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + context.getPackageName()));
                settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(settings);
                WritableMap m = Arguments.createMap();
                m.putString("message", "اجازه نصب برنامه از این منبع فعال نیست. پس از فعال‌سازی، فایل موجود در Downloads را اجرا کنید.");
                emit("khatyarUpdaterInstallPermission", m);
            } catch (Exception e) {
                WritableMap m = Arguments.createMap(); m.putString("message", e.getMessage() == null ? "مجوز نصب فعال نیست." : e.getMessage()); emit("khatyarUpdaterInstallPermission", m);
            }
            return;
        }
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            context.startActivity(intent);
            WritableMap m = Arguments.createMap(); m.putString("uri", uri.toString()); emit("khatyarUpdaterInstallStarted", m);
        } catch (Exception e) {
            WritableMap m = Arguments.createMap(); m.putString("message", e.getMessage() == null ? "اجرای نصب‌کننده اندروید ممکن نشد." : e.getMessage()); emit("khatyarUpdaterInstallError", m);
        }
    }
}
