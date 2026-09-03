package ir.mashhad.taxicontrol.updater;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.Settings;

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
import java.io.RandomAccessFile;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class KhatyarUpdaterModule extends ReactContextBaseJavaModule {
    private static final String NAME = "KhatyarUpdater";
    private static final String PREFS = "khatyar_updater";
    private static final String KEY_PENDING_URI = "pending_install_uri";
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    public KhatyarUpdaterModule(ReactApplicationContext context) { super(context); }
    @Override public String getName() { return NAME; }

    private SharedPreferences prefs() { return getReactApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE); }
    private void emit(String event, WritableMap data) { try { getReactApplicationContext().getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit(event, data); } catch (Exception ignored) {} }
    private void emitProgress(long done, long total) { WritableMap m=Arguments.createMap(); m.putDouble("downloaded",done); m.putDouble("total",total); m.putDouble("progress",total>0?Math.min(1d,Math.max(0d,(double)done/total)):0d); emit("khatyarUpdaterProgress",m); }
    private String safeName(String name) { String n=name==null?"":name.trim().replaceAll("[^A-Za-z0-9._-]","_"); if(n.length()<5)n="KhatYar-update.apk"; if(!n.toLowerCase(Locale.US).endsWith(".apk"))n+=".apk"; return n; }
    private File partFile(String name) { File dir=new File(getReactApplicationContext().getFilesDir(),"updates"); if(!dir.exists())dir.mkdirs(); return new File(dir,name+".part"); }

    @ReactMethod
    public void downloadApk(String urlString,String fileName,Promise promise) {
        if(urlString==null||urlString.trim().isEmpty()){promise.reject("UPDATE_URL","آدرس فایل به‌روزرسانی خالی است.");return;}
        final String urlText=urlString.trim(); final String name=safeName(fileName); final File part=partFile(name);
        executor.execute(()->{
            HttpURLConnection connection=null;
            try{
                long existing=part.exists()?part.length():0;
                URL url=new URL(urlText);
                connection=(HttpURLConnection)url.openConnection();
                connection.setConnectTimeout(30000); connection.setReadTimeout(120000); connection.setInstanceFollowRedirects(true);
                connection.setRequestProperty("Accept","application/vnd.android.package-archive,application/octet-stream,*/*");
                if(existing>0)connection.setRequestProperty("Range","bytes="+existing+"-");
                connection.connect();
                int code=connection.getResponseCode();
                boolean resumed=existing>0&&code==206;
                if(existing>0&&code==416){part.delete();existing=0;connection.disconnect();connection=null;connection=(HttpURLConnection)url.openConnection();connection.setConnectTimeout(30000);connection.setReadTimeout(120000);connection.setInstanceFollowRedirects(true);connection.connect();code=connection.getResponseCode();}
                if(code<200||code>=300)throw new Exception("دانلود فایل ناموفق بود (HTTP "+code+").");
                if(existing>0&&!resumed){existing=0;try{part.delete();}catch(Exception ignored){}}
                long contentLength=connection.getContentLengthLong();
                long total=contentLength>0?existing+contentLength:0;
                emitProgress(existing,total);
                try(InputStream in=connection.getInputStream();RandomAccessFile raf=new RandomAccessFile(part,"rw")){
                    if(existing==0)raf.setLength(0);else raf.seek(existing);
                    byte[] buffer=new byte[64*1024]; int read; long done=existing,lastEmit=0;
                    while((read=in.read(buffer))!=-1){raf.write(buffer,0,read);done+=read;long now=System.currentTimeMillis();if(now-lastEmit>=200){emitProgress(done,total);lastEmit=now;}}
                    raf.getFD().sync();
                    if(total>0&&done!=total)throw new Exception("اتصال قطع شد؛ دانلود ناقص است و با تلاش بعدی ادامه می‌یابد.");
                    emitProgress(done,total);
                }
                Uri finalUri=publishToDownloads(part,name);
                try{part.delete();}catch(Exception ignored){}
                prefs().edit().putString(KEY_PENDING_URI,finalUri.toString()).apply();
                WritableMap result=Arguments.createMap();result.putString("fileName",name);result.putString("uri",finalUri.toString());result.putString("location","Downloads/"+name);emit("khatyarUpdaterComplete",result);promise.resolve(result);
                installApk(finalUri);
            }catch(Exception e){WritableMap m=Arguments.createMap();m.putString("message",e.getMessage()==null?"دانلود ناموفق بود؛ با تلاش دوباره ادامه می‌یابد.":e.getMessage());emit("khatyarUpdaterError",m);promise.reject("UPDATE_DOWNLOAD",e.getMessage(),e);}finally{if(connection!=null)connection.disconnect();}
        });
    }

    private Uri publishToDownloads(File part,String name)throws Exception{
        if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.Q){
            ContentResolver resolver=getReactApplicationContext().getContentResolver();
            String[] projection={MediaStore.MediaColumns._ID};
            android.database.Cursor cursor=resolver.query(MediaStore.Downloads.EXTERNAL_CONTENT_URI,projection,MediaStore.MediaColumns.DISPLAY_NAME+"=? AND "+MediaStore.MediaColumns.RELATIVE_PATH+"=?",new String[]{name,Environment.DIRECTORY_DOWNLOADS+"/"},null);
            if(cursor!=null){try{if(cursor.moveToFirst()){long id=cursor.getLong(0);resolver.delete(Uri.withAppendedPath(MediaStore.Downloads.EXTERNAL_CONTENT_URI,String.valueOf(id)),null,null);}}finally{cursor.close();}}
            ContentValues values=new ContentValues();values.put(MediaStore.MediaColumns.DISPLAY_NAME,name);values.put(MediaStore.MediaColumns.MIME_TYPE,"application/vnd.android.package-archive");values.put(MediaStore.MediaColumns.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS);values.put(MediaStore.MediaColumns.IS_PENDING,1);
            Uri uri=resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,values);if(uri==null)throw new Exception("ایجاد فایل در Downloads ممکن نشد.");
            try(OutputStream out=resolver.openOutputStream(uri);InputStream in=new java.io.FileInputStream(part)){if(out==null)throw new Exception("دسترسی نوشتن در Downloads ممکن نشد.");byte[] b=new byte[64*1024];int n;while((n=in.read(b))!=-1)out.write(b,0,n);out.flush();}
            ContentValues done=new ContentValues();done.put(MediaStore.MediaColumns.IS_PENDING,0);resolver.update(uri,done,null,null);return uri;
        }
        if(ContextCompat.checkSelfPermission(getReactApplicationContext(),Manifest.permission.WRITE_EXTERNAL_STORAGE)!=PackageManager.PERMISSION_GRANTED)throw new Exception("برای ذخیره فایل در Downloads، دسترسی ذخیره‌سازی لازم است.");
        File dir=Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);if(!dir.exists()&&!dir.mkdirs())throw new Exception("پوشه Downloads قابل ایجاد نیست.");File target=new File(dir,name);try(InputStream in=new java.io.FileInputStream(part);OutputStream out=new FileOutputStream(target)){byte[] b=new byte[64*1024];int n;while((n=in.read(b))!=-1)out.write(b,0,n);out.flush();}return FileProvider.getUriForFile(getReactApplicationContext(),getReactApplicationContext().getPackageName()+".khatyar.fileprovider",target);
    }

    @ReactMethod public void installPending(Promise promise){try{String value=prefs().getString(KEY_PENDING_URI,null);if(value==null||value.isEmpty()){promise.resolve(false);return;}boolean started=installApk(Uri.parse(value));promise.resolve(started);}catch(Exception e){promise.reject("UPDATE_INSTALL",e.getMessage(),e);}}
    @ReactMethod public void installLastDownloaded(String uriString,Promise promise){try{boolean started=installApk(Uri.parse(uriString));promise.resolve(started);}catch(Exception e){promise.reject("UPDATE_INSTALL",e.getMessage(),e);}}

    private boolean installApk(Uri uri){
        ReactApplicationContext context=getReactApplicationContext();
        if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.O&&!context.getPackageManager().canRequestPackageInstalls()){
            prefs().edit().putString(KEY_PENDING_URI,uri.toString()).apply();
            try{Intent settings=new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+context.getPackageName()));settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);context.startActivity(settings);}catch(Exception ignored){}
            WritableMap m=Arguments.createMap();m.putString("message","اجازه نصب برنامه از این منبع فعال نیست. آن را فعال کنید؛ پس از بازگشت به برنامه نصب به‌صورت خودکار ادامه می‌یابد.");emit("khatyarUpdaterInstallPermission",m);return false;
        }
        Intent intent=new Intent(Intent.ACTION_VIEW);intent.setDataAndType(uri,"application/vnd.android.package-archive");intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_ACTIVITY_NEW_TASK);
        try{context.startActivity(intent);prefs().edit().remove(KEY_PENDING_URI).apply();WritableMap m=Arguments.createMap();m.putString("uri",uri.toString());emit("khatyarUpdaterInstallStarted",m);return true;}catch(Exception e){WritableMap m=Arguments.createMap();m.putString("message",e.getMessage()==null?"اجرای نصب‌کننده اندروید ممکن نشد.":e.getMessage());emit("khatyarUpdaterInstallError",m);return false;}
    }
}
