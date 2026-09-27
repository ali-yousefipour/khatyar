package ir.mashhad.taxicontrol.radio;

import android.content.Context;

import android.media.MediaRecorder;
import android.os.SystemClock;

import java.io.File;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/** Stable outgoing radio recorder using Android MediaRecorder AAC/MPEG-4. */
public final class OutgoingRadioRecorder {
  public interface Callback { void onStopped(String path, long durationMs, Throwable error); }

  private static final int SAMPLE_RATE = 8000;
  private static final int CHANNEL_COUNT = 1;
  private static final int BIT_RATE = 12000;

  private final Context context;
  private final File outputDir;
  private final Callback callback;
  private final Object lock = new Object();

  private volatile boolean running;
  private volatile boolean stopping;
  private volatile String callbackResultPath;
  private volatile Throwable callbackError;
  private volatile long callbackDurationMs;

  private MediaRecorder recorder;
  private android.media.AudioManager audioManager;
  private int previousAudioMode = android.media.AudioManager.MODE_NORMAL;
  private boolean audioModeChanged = false;
  private File outputFile;
  private long startedAt;

  public OutgoingRadioRecorder(Context context, File outputDir, Callback callback) {
    if (context == null) throw new IllegalArgumentException("Radio context unavailable");
    this.context = context.getApplicationContext();
    this.outputDir = outputDir;
    this.callback = callback;
  }

  public boolean start() throws Exception {
    synchronized (lock) {
      if (running) return false;
      if (outputDir == null) throw new IllegalStateException("Radio output directory unavailable");
      if (!outputDir.exists() && !outputDir.mkdirs()) {
        throw new IllegalStateException("Radio output directory could not be created");
      }

      outputFile = new File(outputDir, "radio-out-" + System.currentTimeMillis() + ".m4a");
      audioManager = (android.media.AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
      if (audioManager != null) {
        previousAudioMode = audioManager.getMode();
        if (previousAudioMode != android.media.AudioManager.MODE_IN_COMMUNICATION) {
          audioManager.setMode(android.media.AudioManager.MODE_IN_COMMUNICATION);
          audioModeChanged = true;
        }
      }
      recorder = new MediaRecorder();
      try {
        recorder.setAudioSource(MediaRecorder.AudioSource.VOICE_COMMUNICATION);
        recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
        recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
        if (android.os.Build.VERSION.SDK_INT >= 24) {
          recorder.setAudioSamplingRate(SAMPLE_RATE);
          recorder.setAudioEncodingBitRate(BIT_RATE);
          recorder.setAudioChannels(CHANNEL_COUNT);
        }
        recorder.setOutputFile(outputFile.getAbsolutePath());
        recorder.prepare();
        recorder.start();

        stopping = false;
        running = true;
        callbackResultPath = null;
        callbackError = null;
        callbackDurationMs = 0L;
        startedAt = SystemClock.elapsedRealtime();
        return true;
      } catch (Throwable e) {
        safeReleaseRecorder();
        try { if (outputFile.exists()) outputFile.delete(); } catch (Throwable ignored) {}
        outputFile = null;
        running = false;
        stopping = true;
        throw e;
      }
    }
  }

  /**
   * MediaRecorder.stop() is synchronous and finalizes the M4A container itself.
   * We keep this off the JS thread in the native module, so no encoder-EOS polling
   * or artificial 4-second MediaCodec deadline is needed.
   */
  public String stopBlocking(long timeoutMs) throws Exception {
    final CountDownLatch done = new CountDownLatch(1);
    final File file;
    synchronized (lock) {
      if (!running) return callbackResultPath;
      stopping = true;
      file = outputFile;
    }

    Throwable error = null;
    try {
      synchronized (lock) {
        if (recorder != null) {
          try { recorder.stop(); }
          finally { safeReleaseRecorder(); }
        }
        running = false;
      }

      if (file == null || !file.exists() || file.length() < 64L) {
        throw new IllegalStateException("فایل صوتی ساخته نشد.");
      }

      callbackResultPath = file.getAbsolutePath();
      callbackDurationMs = Math.max(0L, SystemClock.elapsedRealtime() - startedAt);
    } catch (Throwable e) {
      error = e;
      callbackError = e;
      try { if (file != null && file.exists()) file.delete(); } catch (Throwable ignored) {}
    } finally {
      running = false;
      stopping = false;
      done.countDown();
      if (callback != null) callback.onStopped(callbackResultPath, callbackDurationMs, error);
    }

    if (!done.await(Math.max(1000L, timeoutMs), TimeUnit.MILLISECONDS)) {
      throw new IllegalStateException("Audio recording finalization timed out");
    }
    if (callbackError != null) {
      if (callbackError instanceof Exception) throw (Exception) callbackError;
      throw new IllegalStateException(callbackError.getMessage() == null ? "خطای ضبط صدا" : callbackError.getMessage(), callbackError);
    }
    return callbackResultPath;
  }

  private void restoreAudioMode() {
    try {
      if (audioManager != null && audioModeChanged) audioManager.setMode(previousAudioMode);
    } catch (Throwable ignored) {}
    audioModeChanged = false;
    audioManager = null;
  }

  private void safeReleaseRecorder() {
    MediaRecorder r = recorder;
    recorder = null;
    if (r != null) {
      try { r.reset(); } catch (Throwable ignored) {}
      try { r.release(); } catch (Throwable ignored) {}
    }
    restoreAudioMode();
  }
}
